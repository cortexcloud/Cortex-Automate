import type { Browser, Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { physicianNotePanel, physicianNoteSaveButton } from '../../../helpers/functions/er-physician-note';
import { erTriagePanel, erTriageSaveButton, fillErTriageForm, saveErTriageForm, type VitalSigns } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clearEvidenceMarks, clicked, expected, filled, makeRunner, markEvidence, snapEvidence } from '../../../helpers/functions/evidence';
import { finishVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { recordNotices } from '../../../helpers/functions/notices';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { gotoVisit } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// SBH-3839 (การ์ดบั๊กของ SBH-2058 Trauma Exam Form) — Reproduce อาการที่ผู้ใช้เจอ 3 พ.ย. 2026:
//   คัดกรองซ้ำแล้วเปลี่ยน Suspect Fast Track Type → หน้า ER Physician Note มีช่อง Suspect Fast Track Type เกินขึ้นมา → บันทึกฟอร์มแพทย์ไม่ได้
// เทส 1 (@SBH-3839-dup): ผู้ป่วย AUTO ใหม่ · คัดกรอง Trauma + Stroke Fast Track (user1 แทนพยาบาล) → แพทย์เปิดฟอร์ม พิมพ์ Chief Complaint →
//   คัดกรองซ้ำ เปลี่ยนเป็น STEMI / ACS Fast Track → แพทย์เปิดใหม่ นับช่อง Suspect Fast Track Type + ลองบันทึก (เลือก Diagnosis ก่อน — R21)
// เทส 2 (@SBH-3839-422): ภาพหลักฐานบั๊กข้อ 2 — เลือก Trauma Fast Track แล้วบันทึกคัดกรอง → 422
// หลังเทส: ปิด Visit ที่การเงิน · SBH3839_KEEP=1 = ไม่ปิด
// รัน (dev-x): npx playwright test --headed --grep @SBH-3839-dup

const NEW_FT = process.env.SBH3839_FT ?? 'STEMI / ACS Fast Track';
const VITALS: VitalSigns = { systolic: '120', diastolic: '80', pr: '80', rr: '20', temp: '37', spo2: '98', painScore: '3' };
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

async function openDoctor(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: authFile('Doctor'), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await cacheAppAssets(context);
  await context.addInitScript(recordNotices);
  const page = await context.newPage();
  await page.goto('/cortex/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await trackVideo(page, 'Doctor');
  return page;
}

// dev-x 7 พ.ย. 2026: ส่วน Chief Complaint เป็นรุ่น General (ไม่มี placeholder เดิม) → textarea แรกของแผงที่ไม่ใช่ช่องความคิดเห็น Fast Track (การรับทราบของแพทย์ — อยู่ก่อนใน DOM)ฟอร์มแพทย์
const ccOf = (p: Page) => physicianNotePanel(p).locator('textarea[placeholder="สรุปอาการและอื่น ๆ"]').or(physicianNotePanel(p).locator('textarea:not([placeholder*="ความคิดเห็น"])').first()).first();
const ftSelects = (page: Page) => physicianNotePanel(page).getByRole('combobox', { name: 'Suspect Fast Track Type' });
const selectedText = (select: Locator) => select.evaluate((el) => (el as HTMLSelectElement).options[(el as HTMLSelectElement).selectedIndex]?.text ?? '');

/** แพทย์: ER Dashboard → กด Patient Card → รอฟอร์มแพทย์ */
async function doctorOpens(doc: Page, hn: string) {
  await gotoErDashboard(doc);
  const card = doc.getByRole('main').locator('div').filter({ has: doc.getByText(`HN: ${hn}`, { exact: true }) }).filter({ hasText: /รอ|นาที/ }).last();
  await expect(card, `ต้องเห็นการ์ด HN ${hn} บนบอร์ด`).toBeVisible({ timeout: 60_000 });
  await card.scrollIntoViewIfNeeded();
  await card.getByText(`HN: ${hn}`, { exact: true }).click();
  await expect(doc.getByRole('main').getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
  const pn = physicianNotePanel(doc);
  await expect(pn.getByRole('heading', { name: 'ER Physician Note', exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(ccOf(doc), 'ฟอร์มแพทย์ต้องโหลดเสร็จ').toBeVisible({ timeout: 120_000 });
  await doc.waitForTimeout(4_000);
}

/** อ่านช่อง Suspect Fast Track Type ทั้งหมดในฟอร์มแพทย์ */
async function readFt(doc: Page) {
  const all = ftSelects(doc);
  const count = await all.count();
  const values: string[] = [];
  for (let i = 0; i < count; i++) values.push(norm(await selectedText(all.nth(i)).catch(() => '?')));
  return { all, count, values };
}

/** เลือก Diagnosis แถวแรกของฟอร์มแพทย์ */
async function chooseDx(doc: Page, code: string) {
  const row = physicianNotePanel(doc).locator('[data-dx-index="0"]').filter({ visible: true }).first();
  if (!(await row.count())) return '(ไม่เจอส่วน Diagnosis)';
  const search = row.getByRole('combobox').first();
  await search.scrollIntoViewIfNeeded();
  await search.click();
  await doc.keyboard.type(code.replace('.', ''), { delay: 60 });
  const option = doc.getByRole('option').filter({ visible: true }).filter({ hasText: new RegExp(`^${code.replace('.', '\\.?')}\\b`) }).first();
  await expect(option, `ค้น Diagnosis ${code} ต้องเจอ`).toBeVisible({ timeout: 20_000 });
  const text = norm(await option.innerText());
  await option.click();
  await doc.waitForTimeout(800);
  return text;
}

/** กดบันทึกฟอร์มแพทย์ → คืน status ของ POST saves ('(ไม่ได้ส่ง)' = ปุ่ม disabled / ไม่ส่งคำขอ) + ถ่ายภาพก่อน / หลัง */
async function trySaveNote(p: Page, label: string, say: (t: string, d: string) => void): Promise<string> {
  await clearEvidenceMarks(p);
  const pn = physicianNotePanel(p);
  const save = physicianNoteSaveButton(p);
  await save.scrollIntoViewIfNeeded();
  await p.waitForTimeout(1_500);
  const enabled = await save.isEnabled();
  const alerts = (await pn.getByRole('alert').allInnerTexts()).map(norm).filter(Boolean);
  say(`${label}: ก่อนกดบันทึก`, `ปุ่มบันทึก ${enabled ? 'กดได้' : 'กดไม่ได้ (disabled)'}${alerts.length ? ` · แจ้ง: ${alerts.join(' / ')}` : ''}`);
  await markEvidence(clicked(save, enabled ? 'บันทึก' : 'ปุ่มบันทึก disabled'), ...(alerts.length ? [alerted(pn.getByRole('alert').first(), alerts[0])] : []));
  await snapEvidence(p, `ก่อนกด — บันทึกฟอร์มแพทย์ (${label})`);
  await clearEvidenceMarks(p);
  let status = '(ไม่ได้ส่ง)';
  let body = '';
  if (enabled) {
    const res = p.waitForResponse((r) => r.request().method() === 'POST' && /clinical-form-groups\/[^/]+\/saves$/.test(r.url()), { timeout: 20_000 }).catch(() => undefined);
    await save.click();
    const r = await res;
    if (r) {
      status = String(r.status());
      body = r.status() >= 300 ? (await r.text().catch(() => '')).slice(0, 500) : '';
    }
  }
  await p.waitForTimeout(1_200);
  const toast = p.locator('.ant-message-notice, .ant-notification-notice').filter({ visible: true }).first();
  const toastText = (await toast.isVisible().catch(() => false)) ? norm(await toast.innerText()) : '';
  const alertsAfter = (await pn.getByRole('alert').allInnerTexts()).map(norm).filter(Boolean);
  say(`${label}: หลังกดบันทึก`, `POST saves = ${status}${body ? ` · ${body}` : ''} · toast: ${toastText || '(ไม่มี)'} · alert: ${alertsAfter.join(' / ') || '(ไม่มี)'}`);
  const marks = [];
  if (toastText) marks.push(alerted(toast, toastText));
  if (alertsAfter.length) marks.push(alerted(pn.getByRole('alert').first(), alertsAfter[0]));
  marks.push(expected(save, `ผล: ${status}`));
  await markEvidence(...marks);
  await snapEvidence(p, `หลังกด — บันทึกฟอร์มแพทย์ (${label}) ${status}`);
  return status;
}

test.describe('SBH-3839 คัดกรองซ้ำ + เปลี่ยน Suspect Fast Track (dev-x)', () => {
  test.describe.configure({ timeout: 1_800_000 });
  let opened: Map<string, ErVisit>;
  let doc: Page | undefined;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
    doc = undefined;
  });

  test.afterEach(async ({ page }) => {
    if (doc) {
      await finishVideo(doc).catch(() => undefined);
      await doc.context().close().catch(() => undefined);
    }
    if (process.env.SBH3839_KEEP) return;
    for (const v of opened.values()) {
      const r = await closeVisitAtCashier(page, v.hn, v.vn).then(
        (c) => (c.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (e: Error) => `ปิด Visit ไม่สำเร็จ — ${e.message.split('\n')[0]}`,
      );
      console.log(`    หลังเทส: HN ${v.hn} · ${v.vn} · ${v.en}: ${r}`);
    }
  });

  /** ผู้ป่วย AUTO ใหม่ → Visit ER → ฟอร์มคัดกรองพร้อมกรอก */
  async function newPatient(page: Page, key: string, say: (t: string, d: string) => void) {
    const visit = await checkStep(page, `เตรียมข้อมูล: ผู้ป่วย ${key} AUTO ใหม่ + เปิด Visit ER`, async () => {
      await gotoErDashboard(page);
      const p = newTestPatient(`Ft${key}`);
      const v = await registerAndOpenErVisit(page, p);
      say(`ผู้ป่วย ${key}`, `${p.firstName} ${p.familyName} · HN ${v.hn} · ${v.vn} · ${v.en}`);
      return v;
    });
    await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
    const panel = erTriagePanel(page);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ok = await expect(panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first()).toBeEnabled({ timeout: 90_000 }).then(() => true, () => false);
      if (ok) break;
      await gotoVisit(page, visit);
    }
    return visit;
  }

  async function fillFirstTriage(page: Page, ft: string) {
    const panel = erTriagePanel(page);
    await panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first().selectOption({ label: ft });
    await panel.getByRole('radiogroup', { name: 'ประเภทฉุกเฉิน' }).first().getByText('Trauma', { exact: true }).click();
    await fillErTriageForm(page, { level: 3, vitals: VITALS });
  }

  // ================================================================================================
  test('คัดกรองซ้ำเปลี่ยน Suspect Fast Track → ฟอร์มแพทย์มีช่อง Fast Track เกิน + บันทึกไม่ได้', { tag: ['@SBH-3839', '@SBH-3839-dup'] }, async ({ page, browser }) => {
    const { note: say, soft, finish } = makeRunner(page);
    const visit = await newPatient(page, 'A', say);

    await checkStep(page, 'คัดกรองครั้งแรก: Trauma · Stroke Fast Track · ESI 3', async () => {
      await fillFirstTriage(page, 'Stroke Fast Track');
      const ft = erTriagePanel(page).getByRole('combobox', { name: 'Suspect Fast Track Type' }).first();
      await markEvidence(filled(ft, 'Stroke Fast Track'), clicked(erTriageSaveButton(page), 'บันทึก'));
      await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรองครั้งแรก');
      await saveErTriageForm(page, 'บันทึกคัดกรองครั้งแรก');
      await expect(page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    });

    doc = await openDoctor(browser);

    await soft('แพทย์เปิดผู้ป่วยหลังคัดกรองครั้งแรก + พิมพ์ Chief Complaint', async () => {
      await doctorOpens(doc!, visit.hn);
      const ft = await readFt(doc!);
      say('ก่อนคัดกรองซ้ำ', `ช่อง Suspect Fast Track Type ในฟอร์มแพทย์ ${ft.count} ช่อง: ${ft.values.join(' | ')}`);
      const cc = ccOf(doc!);
      await cc.click();
      await cc.pressSequentially('ปวดศีรษะหลังอุบัติเหตุ', { delay: 30 });
      await doc!.waitForTimeout(2_000);
      if (ft.count) await ft.all.first().scrollIntoViewIfNeeded();
      await markEvidence(...Array.from({ length: ft.count }, (_, i) => expected(ft.all.nth(i), `Suspect Fast Track Type ${i + 1}: ${ft.values[i]}`)), filled(cc, 'Chief Complaint'));
      await snapEvidence(doc!, `ก่อนคัดกรองซ้ำ — Fast Track ${ft.count} ช่อง`);
    });

    await checkStep(page, `คัดกรองซ้ำ: เปลี่ยน Suspect Fast Track เป็น ${NEW_FT}`, async () => {
      await gotoVisit(page, visit);
      const redo = page.getByRole('main').getByRole('button', { name: 'redo คัดกรองซ้ำ' });
      await expect(redo).toBeVisible({ timeout: 90_000 });
      await redo.scrollIntoViewIfNeeded();
      await redo.click();
      await expect(page.getByRole('main').getByText('การคัดกรองครั้งใหม่').first()).toBeVisible({ timeout: 60_000 });
      const panel = erTriagePanel(page);
      const ft = panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first();
      await expect(ft).toBeEnabled({ timeout: 60_000 });
      say('ฟอร์มคัดกรองซ้ำ', `Fast Track ตั้งต้น = ${norm(await selectedText(ft))}`);
      await ft.selectOption({ label: NEW_FT });
      await fillErTriageForm(page, { level: 3, vitals: VITALS, chiefComplaint: false });
      await ft.scrollIntoViewIfNeeded();
      await markEvidence(filled(ft, NEW_FT), clicked(erTriageSaveButton(page), 'บันทึก'));
      await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรองซ้ำ');
      await saveErTriageForm(page, 'บันทึกคัดกรองซ้ำ');
      await expect(page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(3_000);
    });

    await startClip(doc, 'retriage-fast-track');
    let ftAfter = { count: 0, values: [] as string[] };
    await soft('แพทย์เปิดผู้ป่วยหลังคัดกรองซ้ำ: ช่อง Suspect Fast Track Type', async () => {
      await clearEvidenceMarks(doc!);
      await doctorOpens(doc!, visit.hn);
      const ft = await readFt(doc!);
      ftAfter = ft;
      say('หลังคัดกรองซ้ำ', `ช่อง Suspect Fast Track Type ในฟอร์มแพทย์ ${ft.count} ช่อง: ${ft.values.join(' | ')}`);
      if (ft.count) await ft.all.first().scrollIntoViewIfNeeded();
      await markEvidence(...Array.from({ length: ft.count }, (_, i) => expected(ft.all.nth(i), `Suspect Fast Track Type ${i + 1}: ${ft.values[i]}`)));
      await snapEvidence(doc!, `หลังคัดกรองซ้ำ — Fast Track ${ft.count} ช่อง`);
      if (ft.count > 1) {
        await ft.all.nth(ft.count - 1).scrollIntoViewIfNeeded();
        await snapEvidence(doc!, `หลังคัดกรองซ้ำ — ช่อง Fast Track ช่องสุดท้าย`);
      }
      expect(ft.count, 'ฟอร์มแพทย์ควรมีช่อง Suspect Fast Track Type 1 ช่อง').toBe(1);
    });

    await soft('แพทย์กรอก Diagnosis แล้วกดบันทึกฟอร์ม', async () => {
      await clearEvidenceMarks(doc!);
      const pn = physicianNotePanel(doc!);
      const dx = await chooseDx(doc!, 'S06.0').catch((e: Error) => `(เลือกไม่ได้: ${e.message.split('\n')[0]})`);
      say('Diagnosis', dx);
      const save = physicianNoteSaveButton(doc!);
      await save.scrollIntoViewIfNeeded();
      await doc!.waitForTimeout(1_500);
      const enabled = await save.isEnabled();
      const alertsBefore = (await pn.getByRole('alert').allInnerTexts()).map(norm).filter(Boolean);
      say('ก่อนกดบันทึก', `ปุ่มบันทึก ${enabled ? 'กดได้' : 'กดไม่ได้ (disabled)'}${alertsBefore.length ? ` · แจ้ง: ${alertsBefore.join(' / ')}` : ''}`);
      await markEvidence(clicked(save, enabled ? 'บันทึก' : 'ปุ่มบันทึก disabled'), ...(alertsBefore.length ? [alerted(pn.getByRole('alert').first(), alertsBefore[0])] : []));
      await snapEvidence(doc!, 'ก่อนกด — บันทึกฟอร์มแพทย์');
      let status = '(ไม่ได้ส่ง)';
      let body = '';
      if (enabled) {
        const res = doc!.waitForResponse((r) => r.request().method() === 'POST' && /clinical-form-groups\/[^/]+\/saves$/.test(r.url()), { timeout: 30_000 }).catch(() => undefined);
        await save.click();
        const r = await res;
        if (r) {
          status = String(r.status());
          body = (await r.text().catch(() => '')).slice(0, 400);
        }
      }
      await doc!.waitForTimeout(1_500);
      const notices = await doc!.locator('.ant-message-notice, .ant-notification-notice, [role="alert"]').filter({ visible: true }).allInnerTexts().catch(() => [] as string[]);
      say('หลังกดบันทึก', `POST saves = ${status}${body ? ` · ${body}` : ''} · แจ้งเตือน: ${notices.map(norm).filter(Boolean).join(' / ') || '(ไม่มี)'}`);
      const toast = doc!.locator('.ant-message-notice, .ant-notification-notice').filter({ visible: true }).first();
      const saved = pn.getByText(/บันทึกจากแบบฟอร์มนี้/).first();
      const marks = [];
      if (await toast.isVisible().catch(() => false)) marks.push(alerted(toast, norm(await toast.innerText())));
      if (await saved.isVisible().catch(() => false)) marks.push(expected(saved, 'บันทึกแล้ว'));
      else marks.push(expected(save, `ผล: ${status}`));
      await markEvidence(...marks);
      await snapEvidence(doc!, 'หลังกด — บันทึกฟอร์มแพทย์');
      expect(Number(status), 'บันทึกฟอร์มแพทย์ต้องสำเร็จ').toBeLessThan(300);
    });

    say('สรุป', `ช่อง Fast Track หลังคัดกรองซ้ำ ${ftAfter.count} ช่อง (${ftAfter.values.join(' | ')})`);
    finish();
  });

  // ================================================================================================
  // รอบ 2: แพทย์บันทึกฟอร์มก่อน → คัดกรองซ้ำในหน้าเดียวกับที่เปิด ER Physician Note อยู่ (ไม่โหลดหน้า) → ดูแผงขวาทันที ·
  // หน้าต่างแพทย์ที่เปิดค้าง: ดูก่อนโหลด / หลังโหลด แล้วลองบันทึก
  test('รอบ 2: บันทึกฟอร์มแพทย์ก่อน แล้วคัดกรองซ้ำในหน้าเดียวกัน (ไม่โหลดหน้า)', { tag: ['@SBH-3839', '@SBH-3839-dup2'] }, async ({ page, browser }) => {
    const { note: say, soft, finish } = makeRunner(page);
    const visit = await newPatient(page, 'C', say);
    await checkStep(page, 'คัดกรองครั้งแรก: Trauma · Stroke Fast Track · ESI 3', async () => {
      await fillFirstTriage(page, 'Stroke Fast Track');
      await saveErTriageForm(page, 'บันทึกคัดกรองครั้งแรก');
      await expect(page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    });

    doc = await openDoctor(browser);
    await soft('แพทย์เปิดผู้ป่วย กรอก Chief Complaint + Diagnosis แล้วบันทึกฟอร์ม (ก่อนคัดกรองซ้ำ)', async () => {
      await doctorOpens(doc!, visit.hn);
      const cc = ccOf(doc!);
      await cc.click();
      await cc.pressSequentially('ปวดศีรษะหลังอุบัติเหตุ', { delay: 30 });
      say('Diagnosis', await chooseDx(doc!, 'S06.0'));
      const status = await trySaveNote(doc!, 'ก่อนคัดกรองซ้ำ', say);
      expect(Number(status), 'บันทึกฟอร์มแพทย์ก่อนคัดกรองซ้ำต้องสำเร็จ').toBeLessThan(300);
    });

    let mainFt!: Awaited<ReturnType<typeof readFt>>;
    await soft(`คัดกรองซ้ำในหน้าเดียวกับ ER Physician Note: เปลี่ยนเป็น ${NEW_FT} (ไม่โหลดหน้า)`, async () => {
      await gotoVisit(page, visit);
      await expect(physicianNotePanel(page).getByRole('heading', { name: 'ER Physician Note', exact: true })).toBeVisible({ timeout: 90_000 });
      await expect(ccOf(page)).toBeVisible({ timeout: 120_000 });
      await page.waitForTimeout(3_000);
      const before = await readFt(page);
      say('หน้าหลัก ก่อนคัดกรองซ้ำ', `ฟอร์มแพทย์แผงขวามี Suspect Fast Track Type ${before.count} ช่อง: ${before.values.join(' | ')}`);
      const redo = page.getByRole('main').getByRole('button', { name: 'redo คัดกรองซ้ำ' });
      await redo.scrollIntoViewIfNeeded();
      await redo.click();
      await expect(page.getByRole('main').getByText('การคัดกรองครั้งใหม่').first()).toBeVisible({ timeout: 60_000 });
      const ft = erTriagePanel(page).getByRole('combobox', { name: 'Suspect Fast Track Type' }).first();
      await expect(ft).toBeEnabled({ timeout: 60_000 });
      await ft.selectOption({ label: NEW_FT });
      await fillErTriageForm(page, { level: 3, vitals: VITALS, chiefComplaint: false });
      const mid = await readFt(page);
      say('หน้าหลัก ระหว่างคัดกรองซ้ำ (ยังไม่บันทึก)', `ฟอร์มแพทย์แผงขวามี ${mid.count} ช่อง: ${mid.values.join(' | ')}`);
      await ft.scrollIntoViewIfNeeded();
      await markEvidence(filled(ft, NEW_FT), clicked(erTriageSaveButton(page), 'บันทึก'), ...Array.from({ length: mid.count }, (_, i) => expected(mid.all.nth(i), `แผงขวา Fast Track ${i + 1}: ${mid.values[i]}`)));
      await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรองซ้ำ (หน้าเดียวกับฟอร์มแพทย์)');
      await saveErTriageForm(page, 'บันทึกคัดกรองซ้ำ');
      await expect(page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(5_000);
      await clearEvidenceMarks(page);
      mainFt = await readFt(page);
      say('หน้าหลัก หลังคัดกรองซ้ำ (ไม่โหลดหน้า)', `ฟอร์มแพทย์แผงขวามี ${mainFt.count} ช่อง: ${mainFt.values.join(' | ')}`);
      if (mainFt.count) await mainFt.all.first().scrollIntoViewIfNeeded();
      await markEvidence(...Array.from({ length: mainFt.count }, (_, i) => expected(mainFt.all.nth(i), `Suspect Fast Track Type ${i + 1}: ${mainFt.values[i]}`)));
      await snapEvidence(page, `หลังคัดกรองซ้ำ (หน้าเดียวกัน) — Fast Track ${mainFt.count} ช่อง`);
      expect(mainFt.count, 'ฟอร์มแพทย์ควรมีช่อง Suspect Fast Track Type 1 ช่อง').toBe(1);
    });

    await soft('หน้าหลัก: ลองบันทึกฟอร์มแพทย์หลังคัดกรองซ้ำ (ไม่โหลดหน้า)', async () => {
      const status = await trySaveNote(page, 'หน้าหลักหลังคัดกรองซ้ำ', say);
      expect(Number(status), 'บันทึกฟอร์มแพทย์ต้องสำเร็จ').toBeLessThan(300);
    });

    await startClip(doc, 'retriage-open-window');
    await soft('หน้าต่างแพทย์ที่เปิดค้าง (ยังไม่โหลด): ช่อง Fast Track + บันทึก', async () => {
      await clearEvidenceMarks(doc!);
      await doc!.waitForTimeout(3_000);
      const ft = await readFt(doc!);
      say('แพทย์ เปิดค้าง', `ฟอร์มแพทย์มี ${ft.count} ช่อง: ${ft.values.join(' | ')}`);
      if (ft.count) await ft.all.first().scrollIntoViewIfNeeded();
      await markEvidence(...Array.from({ length: ft.count }, (_, i) => expected(ft.all.nth(i), `Suspect Fast Track Type ${i + 1}: ${ft.values[i]}`)));
      await snapEvidence(doc!, `แพทย์เปิดค้าง — Fast Track ${ft.count} ช่อง`);
      const cc = ccOf(doc!);
      await cc.click();
      await cc.pressSequentially(' เพิ่มเติม', { delay: 30 });
      const status = await trySaveNote(doc!, 'แพทย์เปิดค้าง', say);
      expect(ft.count, 'ฟอร์มแพทย์ควรมีช่อง Suspect Fast Track Type 1 ช่อง').toBe(1);
      expect(Number(status), 'บันทึกฟอร์มแพทย์ต้องสำเร็จ').toBeLessThan(300);
    });

    await soft('หน้าต่างแพทย์ โหลดใหม่: ช่อง Fast Track + บันทึก', async () => {
      await clearEvidenceMarks(doc!);
      await doctorOpens(doc!, visit.hn);
      const ft = await readFt(doc!);
      say('แพทย์ โหลดใหม่', `ฟอร์มแพทย์มี ${ft.count} ช่อง: ${ft.values.join(' | ')}`);
      if (ft.count) await ft.all.first().scrollIntoViewIfNeeded();
      await markEvidence(...Array.from({ length: ft.count }, (_, i) => expected(ft.all.nth(i), `Suspect Fast Track Type ${i + 1}: ${ft.values[i]}`)));
      await snapEvidence(doc!, `แพทย์โหลดใหม่ — Fast Track ${ft.count} ช่อง`);
      const cc = ccOf(doc!);
      await cc.click();
      await cc.pressSequentially(' ครั้งที่สอง', { delay: 30 });
      const status = await trySaveNote(doc!, 'แพทย์โหลดใหม่', say);
      expect(ft.count, 'ฟอร์มแพทย์ควรมีช่อง Suspect Fast Track Type 1 ช่อง').toBe(1);
      expect(Number(status), 'บันทึกฟอร์มแพทย์ต้องสำเร็จ').toBeLessThan(300);
    });
    finish();
  });

  // ================================================================================================
  // ภาพข้อ 9 (409): แพทย์บันทึกฟอร์มก่อน → คัดกรองซ้ำเปลี่ยน Fast Track → หน้าแพทย์ที่เปิดค้าง + โหลดใหม่แล้วบันทึก
  // ปุ่มบันทึก = ปุ่มบนหัวแผง ER Physician Note (ไม่ใช่ปุ่มของ Verified Underlying Disease) · ถ่าย toast ทันทีที่ขึ้น
  test('ภาพ 409: บันทึกฟอร์มแพทย์ไม่ได้หลังคัดกรองซ้ำเปลี่ยน Fast Track', { tag: ['@SBH-3839', '@SBH-3839-409'] }, async ({ page, browser }) => {
    const { note: say, soft, finish } = makeRunner(page);
    const headerSave = (p: Page) => p.getByRole('heading', { name: 'ER Physician Note', exact: true }).locator('xpath=ancestor::*[.//button[contains(normalize-space(),"บันทึก")]][1]').getByRole('button', { name: /บันทึก/ }).first();
    const toTop = (p: Page) => p.getByRole('heading', { name: 'ER Physician Note', exact: true }).evaluate((el) => {
      let n: HTMLElement | null = el as HTMLElement;
      while (n && !(n.scrollHeight > n.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(n).overflowY))) n = n.parentElement;
      n?.scrollTo(0, 0);
    });
    const visit = await newPatient(page, 'D', say);
    await checkStep(page, 'คัดกรองครั้งแรก: Trauma · Stroke Fast Track · ESI 3', async () => {
      await fillFirstTriage(page, 'Stroke Fast Track');
      await saveErTriageForm(page, 'บันทึกคัดกรองครั้งแรก');
      await expect(page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    });

    doc = await openDoctor(browser);
    await checkStep(doc, 'แพทย์กรอก Chief Complaint + Diagnosis แล้วบันทึกฟอร์ม (ก่อนคัดกรองซ้ำ)', async () => {
      await doctorOpens(doc!, visit.hn);
      const cc = ccOf(doc!);
      await cc.click();
      await cc.pressSequentially('ปวดศีรษะหลังอุบัติเหตุ', { delay: 30 });
      say('Diagnosis', await chooseDx(doc!, 'S06.0'));
      await toTop(doc!);
      const res = doc!.waitForResponse((r) => r.request().method() === 'POST' && /clinical-form-groups\/[^/]+\/saves$/.test(r.url()), { timeout: 30_000 });
      await headerSave(doc!).click();
      expect((await res).status(), 'บันทึกครั้งแรกต้องสำเร็จ').toBeLessThan(300);
      await expect(physicianNotePanel(doc!).getByText(/บันทึกจากแบบฟอร์มนี้/).first()).toBeVisible({ timeout: 30_000 });
      await markEvidence(expected(physicianNotePanel(doc!).getByText(/บันทึกจากแบบฟอร์มนี้/).first(), 'บันทึกฟอร์มแพทย์แล้ว'), expected(ftSelects(doc!).first(), 'Fast Track: Stroke'));
      await snapEvidence(doc!, '1 แพทย์บันทึกฟอร์มแล้ว (Stroke)');
    });

    await checkStep(page, `คัดกรองซ้ำ: เปลี่ยน Suspect Fast Track เป็น ${NEW_FT}`, async () => {
      await gotoVisit(page, visit);
      const redo = page.getByRole('main').getByRole('button', { name: 'redo คัดกรองซ้ำ' });
      await expect(redo).toBeVisible({ timeout: 90_000 });
      await redo.scrollIntoViewIfNeeded();
      await redo.click();
      await expect(page.getByRole('main').getByText('การคัดกรองครั้งใหม่').first()).toBeVisible({ timeout: 60_000 });
      const ft = erTriagePanel(page).getByRole('combobox', { name: 'Suspect Fast Track Type' }).first();
      await expect(ft).toBeEnabled({ timeout: 60_000 });
      await ft.selectOption({ label: NEW_FT });
      await fillErTriageForm(page, { level: 3, vitals: VITALS, chiefComplaint: false });
      await ft.scrollIntoViewIfNeeded();
      await markEvidence(filled(ft, NEW_FT), clicked(erTriageSaveButton(page), 'บันทึก'));
      await snapEvidence(page, '2 ก่อนกด — บันทึกคัดกรองซ้ำ');
      await saveErTriageForm(page, 'บันทึกคัดกรองซ้ำ');
      await page.waitForTimeout(8_000);
    });

    await startClip(doc, 'retriage-409');
    await soft('หน้าแพทย์ที่เปิดค้าง: แจ้งเตือน + ปุ่มบันทึก', async () => {
      await clearEvidenceMarks(doc!);
      await doc!.waitForTimeout(5_000);
      await toTop(doc!);
      const pn = physicianNotePanel(doc!);
      const banner = pn.getByText(/โหลดกลุ่มแบบฟอร์มหรือร่างไม่สำเร็จ|ร่างล่าสุดยังไม่ถูกเก็บถาวร|ไม่ได้บันทึกข้อมูลทางคลินิก/).first();
      const hasBanner = await banner.isVisible().catch(() => false);
      const save = headerSave(doc!);
      const enabled = await save.isEnabled().catch(() => false);
      say('แพทย์เปิดค้าง', `แจ้งเตือน: ${hasBanner ? norm(await banner.innerText()) : '(ไม่มี)'} · ปุ่มบันทึก ${enabled ? 'กดได้' : 'กดไม่ได้'}`);
      await markEvidence(...(hasBanner ? [alerted(banner, norm(await banner.innerText()).slice(0, 40))] : []), clicked(save, enabled ? 'บันทึก' : 'บันทึก (กดไม่ได้)'));
      await snapEvidence(doc!, '3 แพทย์เปิดค้างหลังคัดกรองซ้ำ');
    });

    await soft('แพทย์โหลดหน้าใหม่ แก้ Chief Complaint แล้วกดบันทึก → 409', async () => {
      await clearEvidenceMarks(doc!);
      await doctorOpens(doc!, visit.hn);
      const cc = ccOf(doc!);
      await cc.click();
      await cc.pressSequentially(' เพิ่มเติม', { delay: 30 });
      await doc!.waitForTimeout(2_000);
      await toTop(doc!);
      const save = headerSave(doc!);
      await markEvidence(filled(cc, 'แก้ Chief Complaint'), clicked(save, 'บันทึก'));
      await snapEvidence(doc!, '4 ก่อนกด — บันทึกฟอร์มแพทย์หลังโหลดใหม่');
      await clearEvidenceMarks(doc!);
      const res = doc!.waitForResponse((r) => r.request().method() === 'POST' && /clinical-form-groups\/[^/]+\/saves$/.test(r.url()), { timeout: 30_000 });
      await save.click();
      const toast = doc!.locator('.ant-message-notice, .ant-notification-notice').filter({ visible: true }).first();
      await toast.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
      const r = await res;
      const toastText = (await toast.isVisible().catch(() => false)) ? norm(await toast.innerText()) : '';
      const banner = physicianNotePanel(doc!).getByText(/ไม่ได้บันทึกข้อมูลทางคลินิก|โหลดกลุ่มแบบฟอร์มหรือร่างไม่สำเร็จ/).first();
      const marks = [];
      if (toastText) marks.push(alerted(toast, 'บันทึกไม่สำเร็จ'));
      if (await banner.isVisible().catch(() => false)) marks.push(alerted(banner, 'ไม่ได้บันทึก'));
      await markEvidence(...marks);
      await snapEvidence(doc!, `5 หลังกด — บันทึกฟอร์มแพทย์ ${r.status()}`);
      say('แพทย์โหลดใหม่ กดบันทึก', `POST saves ${r.status()} · ${(await r.text().catch(() => '')).slice(0, 200)} · toast: ${toastText || '(ไม่มี)'}`);
      expect(r.status(), 'บันทึกฟอร์มแพทย์ต้องสำเร็จ').toBeLessThan(300);
    });
    finish();
  });

  // ================================================================================================
  // ภาพหลักฐาน (อ่านอย่างเดียว): ผู้ป่วยจากเทส 1 ที่ปิด Visit แล้ว — ER Physician Note แสดง ER fast track screening 2 ชุด
  // SBH3839_VIEW=HN,VN,EN (ค่าเริ่มต้น = ผู้ป่วย A รอบ 3 พ.ย. 16:01)
  test('ภาพ: ER Physician Note มี Suspect Fast Track 2 ชุดหลังคัดกรองซ้ำ', { tag: ['@SBH-3839', '@SBH-3839-view'] }, async ({ browser }) => {
    const [hn, vn, en] = (process.env.SBH3839_VIEW ?? '6932587,V69110328251,E69110333248').split(',');
    doc = await openDoctor(browser);
    await checkStep(doc, 'ER Physician Note: การจำแนกผู้ป่วย มี ER fast track screening 2 ชุด', async () => {
      await gotoVisit(doc!, { hn, vn, en });
      const pn = physicianNotePanel(doc!);
      await expect(pn.getByText('ER fast track screening', { exact: true }).nth(1), 'ฟอร์มแพทย์ต้องแสดง Fast Track ครบตามที่บันทึก').toBeVisible({ timeout: 120_000 });
      await doc!.waitForTimeout(3_000);
      const blocks = pn.getByText('ER fast track screening', { exact: true });
      const values = pn.getByText(/^\s*(stroke|stemi|sepsis|acs|trauma_fast_track|not_suspect)\s*$/i);
      await blocks.first().scrollIntoViewIfNeeded();
      const n = await blocks.count();
      const texts: string[] = [];
      for (let i = 0; i < Math.min(await values.count(), 4); i++) texts.push(norm(await values.nth(i).innerText()));
      console.log(`    ER fast track screening ในฟอร์มแพทย์ ${n} ชุด · ค่า: ${texts.join(' | ')}`);
      // วงหัว "ER fast track screening" ของแต่ละชุด (ป้ายอยู่เหนือหัว ไม่บังค่า) + ค่าในฟอร์มคัดกรองแผงซ้ายไว้เทียบ
      const leftFt = doc!.getByRole('main').getByText('ER fast track screening', { exact: true }).first().locator('xpath=following::*[normalize-space()="stemi" or normalize-space()="stroke"][1]');
      await markEvidence(
        expected(blocks.first(), `ฟอร์มแพทย์ ชุดที่ 1: ${texts[0]} (คัดกรองครั้งแรก)`),
        expected(blocks.nth(1), `ชุดที่ 2: ${texts[1]} (คัดกรองซ้ำ)`),
        ...((await leftFt.isVisible().catch(() => false)) ? [expected(leftFt, `ฟอร์มคัดกรอง: ${norm(await leftFt.innerText())} ชุดเดียว`)] : []),
      );
      await snapEvidence(doc!, `ER Physician Note มี Fast Track ${n} ชุด`);
    });
  });

  // ================================================================================================
  test('Trauma Fast Track บันทึกคัดกรองไม่ได้ (422)', { tag: ['@SBH-3839', '@SBH-3839-422'] }, async ({ page }) => {
    const { note: say } = makeRunner(page);
    await newPatient(page, 'B', say);
    await checkStep(page, 'เลือก Trauma Fast Track + กรอกครบ → บันทึกคัดกรอง', async () => {
      await fillFirstTriage(page, 'Trauma Fast Track');
      const panel = erTriagePanel(page);
      const ft = panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first();
      await expect(panel.getByText(/กำลังโหลดข้อมูลต้นทาง|Loading sources/)).toHaveCount(0, { timeout: 45_000 });
      await page.waitForTimeout(1_500);
      await ft.scrollIntoViewIfNeeded();
      await markEvidence(filled(ft, 'Trauma Fast Track'), clicked(erTriageSaveButton(page), 'บันทึก'));
      await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรอง Trauma Fast Track');
      await clearEvidenceMarks(page);
      const res = page.waitForResponse((r) => r.request().method() === 'POST' && /clinical-form-groups\/[^/]+\/saves$/.test(r.url()), { timeout: 60_000 });
      await erTriageSaveButton(page).click();
      const r = await res;
      const body = (await r.text().catch(() => '')).slice(0, 600);
      say('POST saves', `${r.status()} · ${body}`);
      const toast = page.locator('.ant-message-notice, .ant-notification-notice').filter({ visible: true }).first();
      await expect(toast, 'ต้องมีแจ้งเตือนหลังบันทึก').toBeVisible({ timeout: 10_000 });
      say('แจ้งเตือน', norm(await toast.innerText()));
      await markEvidence(alerted(toast, norm(await toast.innerText())), expected(ft, 'Trauma Fast Track'));
      await snapEvidence(page, `หลังกด — บันทึกคัดกรอง ${r.status()}`);
      expect(r.status(), 'บันทึกคัดกรองต้องสำเร็จ').toBeLessThan(300);
    });
  });
});
