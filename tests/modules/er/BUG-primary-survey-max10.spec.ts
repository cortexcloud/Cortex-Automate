import type { Browser, Locator, Page, Response } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { physicianNotePanel } from '../../../helpers/functions/er-physician-note';
import { erTriagePanel, fillErTriageForm, saveErTriageForm, type VitalSigns } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clearEvidenceMarks, clicked, expected, filled, makeRunner, markEvidence, snapEvidence } from '../../../helpers/functions/evidence';
import { finishVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { recordNotices } from '../../../helpers/functions/notices';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { gotoVisit } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// การ์ดบั๊ก SBH-3893 — Reproduce บั๊กที่ผู้ใช้เจอ 5 พ.ย. 2026 (ภาพ VN V6911054307 dev-x): ER Physician Note โหมด Trauma (ฟอร์มของ SBH-2058) →
//   กรอก Trauma Primary Survey (Active bleeding 12 · Pelvic hematoma at 34 · รูม่านตาขวา 23 / ซ้าย 45 mm) → กดบันทึก →
//   toast "บันทึกไม่สำเร็จ: ER trauma primary survey — ต้องไม่เกิน 10; ต้องไม่เกิน 10; ต้องไม่เกิน 10; ต้องไม่เกิน 10" (ไม่บอกว่าช่องไหน)
// ผู้ป่วย AUTO ใหม่ (R10) · คัดกรอง Trauma + Not Suspect Fast Track (user1 แทนพยาบาล) · ฟอร์มแพทย์ทำในหน้าต่าง Doctor
// แต่ละรอบ = กรอกค่าชุดหนึ่ง → กดบันทึก → เก็บ status / body ของ POST …/saves + toast + ภาพก่อน / หลังกด + คลิปแยกรอบ
// หลังเทส: ปิด Visit ที่การเงิน · BUGPS10_KEEP=1 = ไม่ปิด
// BUGPS10_USE=HN,VN,EN = ใช้ผู้ป่วยที่คัดกรองแล้ว (ข้ามสร้าง + คัดกรอง · ไม่ปิด Visit) — Prod 5 พ.ย. 2026 บันทึกคัดกรองไม่ส่งคำขอ → ผู้ใช้เลือกใช้ HN 6903956 ในภาพ
// รัน (dev-x): npx playwright test --headed --grep @BUG-PS10
// รัน (SBH Prod — ผู้ใช้สั่ง 5 พ.ย. 2026 เพราะ dev-x พัง): npm run card:prod -- --headed --grep @BUG-PS10

const VITALS: VitalSigns = { systolic: '120', diastolic: '80', pr: '80', rr: '20', temp: '37', spo2: '98', painScore: '3' };
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const SAVES = /clinical-form-groups\/[^/]+\/saves$/;

const F = {
  bleeding: 'Active bleeding',
  pelvic: 'Pelvic hematoma at',
  pneumo: 'Open pneumothorax at',
  pupilRt: 'รูม่านตาข้างขวา ขนาด (mm)',
  pupilLt: 'รูม่านตาข้างซ้าย ขนาด (mm)',
} as const;
type Key = keyof typeof F;

async function openDoctor(browser: Browser, role: 'Doctor' | 'Super_User' = 'Doctor'): Promise<Page> {
  const context = await browser.newContext({ storageState: authFile(role), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await cacheAppAssets(context);
  await context.addInitScript(recordNotices);
  const page = await context.newPage();
  await page.goto('/cortex/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await trackVideo(page, role);
  return page;
}

/** SBH Prod: หน้าบอร์ดโหลดครั้งแรกบางรอบเกิน 20 วิ (5 พ.ย. 2026) → ลองใหม่สูงสุด 3 รอบ */
async function openBoard(p: Page) {
  for (let i = 1; ; i++) {
    try {
      return await gotoErDashboard(p);
    } catch (e) {
      if (i >= 3) throw e;
      console.log(`    บอร์ด ER โหลดไม่ทัน (รอบ ${i}) — โหลดใหม่`);
    }
  }
}

async function doctorOpens(doc: Page, hn: string) {
  await openBoard(doc);
  const card = doc.getByRole('main').locator('div').filter({ has: doc.getByText(`HN: ${hn}`, { exact: true }) }).filter({ hasText: /รอ|นาที/ }).last();
  await expect(card, `ต้องเห็นการ์ด HN ${hn} บนบอร์ด`).toBeVisible({ timeout: 60_000 });
  await card.scrollIntoViewIfNeeded();
  await card.getByText(`HN: ${hn}`, { exact: true }).click();
  await expect(doc.getByRole('main').getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
  const pn = physicianNotePanel(doc);
  await expect(pn.getByRole('heading', { name: 'ER Physician Note', exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(pn.getByRole('button', { name: /Trauma Primary Survey/ }).first(), 'ฟอร์มแพทย์ต้องเป็นโหมด Trauma').toBeVisible({ timeout: 120_000 });
  await doc.waitForTimeout(4_000);
}

const field = (doc: Page, k: Key) => physicianNotePanel(doc).getByLabel(F[k], { exact: true }).first();
const headerSave = (p: Page) => p.getByRole('heading', { name: 'ER Physician Note', exact: true }).locator('xpath=ancestor::*[.//button[contains(normalize-space(),"บันทึก")]][1]').getByRole('button', { name: /บันทึก/ }).first();
const toTop = (p: Page) => p.getByRole('heading', { name: 'ER Physician Note', exact: true }).evaluate((el) => {
  let n: HTMLElement | null = el as HTMLElement;
  while (n && !(n.scrollHeight > n.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(n).overflowY))) n = n.parentElement;
  n?.scrollTo(0, 0);
});

async function expandPrimarySurvey(doc: Page) {
  const pn = physicianNotePanel(doc);
  if (await field(doc, 'bleeding').isVisible().catch(() => false)) return;
  await pn.getByRole('button', { name: /Trauma Primary Survey/ }).first().click();
  await expect(field(doc, 'bleeding'), 'ต้องกางส่วน Primary Survey ได้').toBeVisible({ timeout: 20_000 });
}

/** ชนิดช่อง + ข้อจำกัดใน DOM (type / max / maxlength / inputmode) */
async function describeField(doc: Page, k: Key) {
  return field(doc, k).evaluate((el) => {
    const i = el as HTMLInputElement;
    return `${i.tagName.toLowerCase()} type=${i.type || '-'} max=${i.getAttribute('max') ?? '-'} maxlength=${i.getAttribute('maxlength') ?? '-'} inputmode=${i.getAttribute('inputmode') ?? '-'}`;
  }).catch((e: Error) => `(อ่านไม่ได้: ${e.message.split('\n')[0]})`);
}

/** กรอกค่า (ว่าง = ล้างช่อง) — ช่อง type=number พิมพ์ตัวอักษรไม่ได้ ให้คืนข้อความแทน throw */
async function setField(doc: Page, k: Key, value: string) {
  const f = field(doc, k);
  if (await f.isDisabled().catch(() => true)) return `${F[k]} disabled`;
  await f.scrollIntoViewIfNeeded();
  await f.click();
  await f.fill('');
  if (value) await f.pressSequentially(value, { delay: 40 });
  await f.blur().catch(() => undefined);
  const shown = await f.inputValue().catch(() => '?');
  return `${F[k]} = "${shown}"${shown !== value ? ` (พิมพ์ "${value}")` : ''}`;
}

/** ข้อความแดง / validation ใต้ช่อง (ถ้ามี) */
async function inlineErrors(doc: Page) {
  const pn = physicianNotePanel(doc);
  const texts = await pn.getByText(/ต้องไม่เกิน|ไม่เกิน|must be|invalid|ไม่ถูกต้อง/i).filter({ visible: true }).allInnerTexts().catch(() => [] as string[]);
  return texts.map(norm).filter(Boolean);
}

type Result = { status: string; toast: string; req: string; body: string };

async function saveAndRead(doc: Page, label: string, values: Partial<Record<Key, string>>, say: (t: string, d: string) => void): Promise<Result> {
  await clearEvidenceMarks(doc);
  for (const k of Object.keys(values) as Key[]) await field(doc, k).scrollIntoViewIfNeeded().catch(() => undefined);
  const firstKey = (Object.keys(values) as Key[]).find((k) => values[k]) ?? 'bleeding';
  await field(doc, firstKey).scrollIntoViewIfNeeded();
  await doc.waitForTimeout(800);
  const filledMarks = (Object.keys(values) as Key[]).filter((k) => values[k]).map((k) => filled(field(doc, k), `${F[k]} ${values[k]}`));
  await markEvidence(...filledMarks);
  await snapEvidence(doc, `${label} — ค่าที่กรอก`);
  await clearEvidenceMarks(doc);

  await toTop(doc);
  const save = headerSave(doc);
  await markEvidence(clicked(save, 'บันทึก'));
  await snapEvidence(doc, `${label} — ก่อนกดบันทึก`);
  await clearEvidenceMarks(doc);

  const resP = doc.waitForResponse((r) => r.request().method() === 'POST' && SAVES.test(r.url()), { timeout: 30_000 }).catch(() => undefined as Response | undefined);
  await save.click();
  const toast = doc.locator('.ant-message-notice, .ant-notification-notice').filter({ visible: true }).first();
  await toast.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
  const r = await resP;
  const toastText = (await toast.isVisible().catch(() => false)) ? norm(await toast.innerText()) : '';
  const saved = physicianNotePanel(doc).getByText(/บันทึกจากแบบฟอร์มนี้/).first();
  const marks = [];
  if (toastText) marks.push(alerted(toast, toastText.slice(0, 80)));
  else if (await saved.isVisible().catch(() => false)) marks.push(expected(saved, 'บันทึกแล้ว'));
  await markEvidence(...marks);
  await snapEvidence(doc, `${label} — หลังกดบันทึก ${r ? r.status() : '(ไม่ได้ส่ง)'}`);
  await clearEvidenceMarks(doc);

  // คำขอ: ตัดเฉพาะส่วน primary survey ที่มีค่าที่กรอก
  const reqRaw = r?.request().postData() ?? '';
  const hits = Object.values(values).filter(Boolean).flatMap((v) => {
    const out: string[] = [];
    let i = reqRaw.indexOf(v!);
    while (i >= 0 && out.length < 3) {
      out.push(reqRaw.slice(Math.max(0, i - 80), i + 20));
      i = reqRaw.indexOf(v!, i + 1);
    }
    return out;
  });
  const res: Result = {
    status: r ? String(r.status()) : '(ไม่ได้ส่ง)',
    toast: toastText,
    req: hits.join(' ‖ ').slice(0, 1500),
    body: r && r.status() >= 300 ? (await r.text().catch(() => '')).slice(0, 2500) : '',
  };
  const inline = await inlineErrors(doc);
  say(`${label}: ผล`, `POST saves ${res.status} · toast: ${res.toast || '(ไม่มี)'} · ข้อความใต้ช่อง: ${inline.join(' / ') || '(ไม่มี)'}`);
  if (res.body) say(`${label}: response`, res.body);
  if (res.req) say(`${label}: request (ส่วนที่มีค่าที่กรอก)`, res.req);
  return res;
}

test.describe('BUG ER Physician Note — Trauma Primary Survey บันทึกไม่ได้ "ต้องไม่เกิน 10" (dev-x)', () => {
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
    if (process.env.BUGPS10_KEEP) return;
    for (const v of opened.values()) {
      const r = await closeVisitAtCashier(page, v.hn, v.vn).then(
        (c) => (c.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (e: Error) => `ปิด Visit ไม่สำเร็จ — ${e.message.split('\n')[0]}`,
      );
      console.log(`    หลังเทส: HN ${v.hn} · ${v.vn} · ${v.en}: ${r}`);
    }
  });

  test('Reproduce + แยกช่องที่ติด limit 10', { tag: ['@BUG-PS10'] }, async ({ page, browser }) => {
    const { note: say, soft, finish } = makeRunner(page);
    const use = process.env.BUGPS10_USE?.split(',');
    const visit: ErVisit = use ? { hn: use[0], vn: use[1], en: use[2] } as ErVisit : await prepareAuto();

    async function prepareAuto(): Promise<ErVisit> {
    const visit = await checkStep(page, 'เตรียมข้อมูล: ผู้ป่วย AUTO ใหม่ + เปิด Visit ER', async () => {
      await openBoard(page);
      const p = newTestPatient('Ps');
      const v = await registerAndOpenErVisit(page, p);
      say('ผู้ป่วย', `${p.firstName} ${p.familyName} · HN ${v.hn} · ${v.vn} · ${v.en}`);
      return v;
    });
    await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
    const panel = erTriagePanel(page);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const ok = await expect(panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first()).toBeEnabled({ timeout: 90_000 }).then(() => true, () => false);
      if (ok) break;
      await gotoVisit(page, visit);
    }

    await checkStep(page, 'คัดกรอง: Trauma · Not Suspect Fast Track · ESI 3', async () => {
      await panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first().selectOption({ label: 'Not Suspect Fast Track' });
      await panel.getByRole('radiogroup', { name: 'ประเภทฉุกเฉิน' }).first().getByText('Trauma', { exact: true }).click();
      await fillErTriageForm(page, { level: 3, vitals: VITALS });
      await saveErTriageForm(page, 'บันทึกคัดกรอง');
      await expect(page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    });
    return visit;
    }

    // ผู้ป่วยเดิม (ภาพของผู้ใช้) = บัญชี user1 (Super_User) แบบในภาพ · ผู้ป่วย AUTO = บัญชี Doctor
    doc = await openDoctor(browser, use ? 'Super_User' : 'Doctor');
    let toggledTrauma = false;
    const emergencyType = () => erTriagePanel(doc!).getByRole('radiogroup', { name: 'ประเภทฉุกเฉิน' }).first();
    await checkStep(doc, `เปิดผู้ป่วย HN ${visit.hn} + กาง Trauma Primary Survey`, async () => {
      if (use) {
        await gotoVisit(doc!, visit);
        const pn = physicianNotePanel(doc!);
        await expect(pn.getByRole('heading', { name: 'ER Physician Note', exact: true })).toBeVisible({ timeout: 120_000 });
        await doc!.waitForTimeout(8_000);
        const psBtn = pn.getByRole('button', { name: /Trauma Primary Survey/ }).first();
        if (!(await psBtn.isVisible().catch(() => false))) {
          // ฟอร์มแพทย์ยังเป็น Non-Trauma → กด Trauma ในฟอร์มคัดกรองฝั่งซ้าย (ไม่กดบันทึกคัดกรอง · คืนเป็น Non-Trauma ตอนจบ)
          const g = emergencyType();
          await expect(g, 'ฟอร์มคัดกรองฝั่งซ้ายต้องแก้ประเภทฉุกเฉินได้').toBeVisible({ timeout: 30_000 });
          await g.scrollIntoViewIfNeeded();
          await g.getByText('Trauma', { exact: true }).click();
          toggledTrauma = true;
          await markEvidence(clicked(g.getByText('Trauma', { exact: true }), 'Trauma (ไม่บันทึกคัดกรอง)'));
          await snapEvidence(doc!, 'กด Trauma ในฟอร์มคัดกรองฝั่งซ้าย');
          await clearEvidenceMarks(doc!);
          say('ประเภทฉุกเฉิน', 'แผงขวาเป็น Non-Trauma → กด Trauma ในฟอร์มคัดกรองฝั่งซ้าย (ไม่บันทึก)');
        }
        await expect(psBtn, 'ฟอร์มแพทย์ต้องเป็นโหมด Trauma').toBeVisible({ timeout: 60_000 });
        await doc!.waitForTimeout(3_000);
      } else await doctorOpens(doc!, visit.hn);
      await expandPrimarySurvey(doc!);
      for (const k of Object.keys(F) as Key[]) say(`ชนิดช่อง ${F[k]}`, await describeField(doc!, k));
    });

    const results: Record<string, Result> = {};
    const round = async (id: string, label: string, values: Partial<Record<Key, string>>) => {
      await startClip(doc!, id);
      await soft(label, async () => {
        await expandPrimarySurvey(doc!);
        const set: string[] = [];
        for (const k of Object.keys(F) as Key[]) set.push(await setField(doc!, k, values[k] ?? ''));
        say(`${label}: กรอก`, set.join(' · '));
        results[id] = await saveAndRead(doc!, label, values, say);
      });
    };

    // ผู้ใช้ชี้ (5 พ.ย. 2026): จุดที่ติดคือ "ขนาดรูม่านตาขวา / ซ้ายเกิน 10 mm"
    // รอบ 1: ตามภาพของผู้ใช้
    await round('r1-as-reported', 'รอบ 1 ตามภาพ: Active bleeding 12 · Pelvic hematoma 34 · Open pneumothorax test · รูม่านตา 23 / 45',
      { bleeding: '12', pelvic: '34', pneumo: 'test', pupilRt: '23', pupilLt: '45' });
    // รอบ 2: รูม่านตาอย่างเดียว
    await round('r2-pupil-only', 'รอบ 2 รูม่านตาขวา 23 / ซ้าย 45 mm อย่างเดียว', { pupilRt: '23', pupilLt: '45' });
    // รอบ 3: ช่อง Active bleeding / Pelvic hematoma อย่างเดียว (ติด limit ด้วยไหม)
    await round('r3-bleeding-pelvic', 'รอบ 3 Active bleeding 12 · Pelvic hematoma 34 อย่างเดียว', { bleeding: '12', pelvic: '34' });
    // รอบ 4: รูม่านตาไม่เกิน 10
    await round('r4-pupil-10', 'รอบ 4 รูม่านตาขวา 10 / ซ้าย 10 mm', { pupilRt: '10', pupilLt: '10' });

    if (toggledTrauma) {
      await soft('คืนประเภทฉุกเฉินในฟอร์มคัดกรองฝั่งซ้ายเป็น Non-Trauma', async () => {
        const g = emergencyType();
        await g.scrollIntoViewIfNeeded();
        await g.getByText('Non-Trauma', { exact: true }).click();
        await doc!.waitForTimeout(3_000);
      });
    }

    say('สรุป', Object.entries(results).map(([k, v]) => `${k}: ${v.status}${v.toast ? ` (${v.toast})` : ''}`).join(' | '));
    expect(results['r1-as-reported']?.status, 'บันทึกตามภาพต้องสำเร็จหรือแจ้งชื่อช่องที่ผิด').toMatch(/^2/);
    finish();
  });
});
