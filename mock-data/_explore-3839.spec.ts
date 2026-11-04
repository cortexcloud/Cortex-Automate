import type { Page } from '@playwright/test';
import { gotoErDashboard } from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { physicianNotePanel, physicianNoteSaveButton } from '../helpers/functions/er-physician-note';
import { cacheAppAssets, expect, test } from './fixtures';
import { gotoVisit } from './uat-play';
import { authFile } from '../utils/env';

// สำรวจ (อ่านอย่างเดียว — ไม่กดบันทึก / ไม่แก้) ผู้ป่วยที่ผู้ใช้เจอบั๊กข้อ 9 ของ SBH-3839: ช่อง Suspect Fast Track Type เกินที่ ER Physician Note
// รัน: EXPLORE_HN=6931175 npx playwright test -c playwright.mock.config.ts mock-data/_explore-3839.spec.ts --headed
const HN = process.env.EXPLORE_HN ?? '6931175';
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

async function readNote(p: Page, who: string) {
  const pn = physicianNotePanel(p);
  await expect(pn.getByRole('heading', { name: 'ER Physician Note', exact: true })).toBeVisible({ timeout: 90_000 });
  await p.waitForTimeout(15_000);
  const ft = pn.getByRole('combobox', { name: /Suspect Fast Track/ });
  const n = await ft.count();
  const vals: string[] = [];
  for (let i = 0; i < n; i++) vals.push(norm(await ft.nth(i).evaluate((el) => `${(el as HTMLSelectElement).options[(el as HTMLSelectElement).selectedIndex]?.text ?? ''}${(el as HTMLSelectElement).disabled ? ' (disabled)' : ''}`)));
  const labels = await pn.getByText(/Suspect Fast Track/).allInnerTexts();
  const alerts = (await pn.getByRole('alert').allInnerTexts()).map(norm).filter(Boolean);
  const saveEnabled = await physicianNoteSaveButton(p).isEnabled().catch(() => false);
  const sections = (await pn.locator('h1,h2,h3,h4,h5,[class*="title"]').allInnerTexts()).map(norm).filter(Boolean).slice(0, 60);
  console.log(`    [${who}] combobox Suspect Fast Track ${n} ช่อง: ${vals.join(' | ')}`);
  console.log(`    [${who}] ข้อความ "Suspect Fast Track" ในแผงแพทย์ ${labels.length} จุด: ${labels.map(norm).join(' | ')}`);
  console.log(`    [${who}] ปุ่มบันทึก ${saveEnabled ? 'กดได้' : 'กดไม่ได้'} · alert: ${alerts.join(' / ') || '(ไม่มี)'}`);
  console.log(`    [${who}] หัวข้อในแผง: ${sections.join(' › ')}`);
  for (let i = 0; i < n; i++) {
    await ft.nth(i).scrollIntoViewIfNeeded();
    await p.screenshot({ path: test.info().outputPath(`${who}-ft-${i + 1}.png`) });
  }
  if (!n) await p.screenshot({ path: test.info().outputPath(`${who}-note.png`) });
}

test(`สำรวจ HN ${HN} (อ่านอย่างเดียว)`, async ({ page, browser }) => {
  test.setTimeout(600_000);
  const authorization = trackAuthorization(page);
  await gotoErDashboard(page);
  const res = await page.request.get(`/generated-emr-api/encounters?filter[hn][equals]=${HN}&perPage=20`, { headers: { authorization: authorization() } });
  const { data } = (await res.json()) as { data: Record<string, unknown>[] };
  console.log(`    keys: ${Object.keys(data[0] ?? {}).join(',')}`);
  for (const e of data) console.log(`    ${e.en} vn=${e.vn} clinic=${e.clinicId} status=${e.latestStatusCode} start=${e.startedAt ?? e.createdAt ?? ''}`);
  const er = data.find((e) => String(e.en).startsWith('E') && e.vn) ?? data[0];
  const visit = { hn: HN, en: String(er.en), vn: String(er.vn) };
  console.log(`    ใช้ ${visit.en} · ${visit.vn}`);

  const forms: string[] = [];
  page.on('response', async (r) => {
    if (r.request().method() !== 'GET' || !/clinical-form-groups|clinical-forms|form-groups/.test(r.url())) return;
    const t = await r.text().catch(() => '');
    forms.push(`${r.url().replace(/^https?:\/\/[^/]+/, '')} ${r.status()} ${(t.match(/fast.?track[^,}]{0,120}/gi) ?? []).slice(0, 8).join(' ;; ')}`);
  });
  await gotoVisit(page, visit);
  const name = norm(await page.getByRole('main').getByText(`HN ${HN}`, { exact: true }).first().locator('xpath=following::*[1]').innerText().catch(() => ''));
  console.log(`    ชื่อ: ${name}`);
  const hist = page.getByRole('main').locator('[class*="_triage-history-item_"]');
  await page.waitForTimeout(5_000);
  console.log(`    ประวัติการคัดกรอง: ${(await hist.allInnerTexts()).map(norm).join(' || ') || '(อ่านไม่ได้)'}`);
  await readNote(page, 'Super_User');
  for (const f of forms) console.log(`    API: ${f.slice(0, 600)}`);

  const context = await browser.newContext({ storageState: authFile('Doctor'), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await cacheAppAssets(context);
  const doc = await context.newPage();
  await gotoVisit(doc, visit);
  await readNote(doc, 'Doctor');
  // ทุกจุดที่มีข้อความ Suspect Fast Track (ทะลุ shadow DOM) · x > 960 = แผงขวา (ฟอร์มแพทย์)
  const hits = doc.getByRole('main').getByText(/Suspect Fast Track/);
  const total = await hits.count();
  for (let i = 0; i < total; i++) {
    const h = hits.nth(i);
    await h.scrollIntoViewIfNeeded().catch(() => undefined);
    const box = await h.boundingBox();
    const near = norm(await h.evaluate((el) => (el.closest('section,fieldset,[class*="card"],[class*="section"]') ?? el.parentElement?.parentElement ?? el).textContent ?? '').catch(() => '')).slice(0, 200);
    console.log(`    [Doctor] จุดที่ ${i + 1}: x=${Math.round(box?.x ?? -1)} y=${Math.round(box?.y ?? -1)} · ${near}`);
    if ((box?.x ?? 0) > 960) await doc.screenshot({ path: test.info().outputPath(`Doctor-hit-${i + 1}.png`) });
  }
  // สแกนแผงขวาทั้งแผง
  const scroller = await doc.getByRole('heading', { name: 'ER Physician Note', exact: true }).evaluateHandle((el) => {
    let n: HTMLElement | null = el as HTMLElement;
    while (n && !(n.scrollHeight > n.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(n).overflowY))) n = n.parentElement;
    return n;
  });
  const height = await scroller.evaluate((n) => (n ? (n as HTMLElement).scrollHeight : 0));
  console.log(`    [Doctor] ความสูงแผงขวา ${height}`);
  for (let y = 0, k = 1; y < height && k <= 14; y += 750, k++) {
    await scroller.evaluate((n, top) => n && (n as HTMLElement).scrollTo(0, top), y);
    await doc.waitForTimeout(800);
    await doc.screenshot({ path: test.info().outputPath(`Doctor-scan-${String(k).padStart(2, '0')}.png`) });
  }
  await context.close();
});
