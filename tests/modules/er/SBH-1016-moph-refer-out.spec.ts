import type { Browser, Locator, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { ErVisit } from '../../../helpers/functions/er';
import { chooseDispositionDiagnosis, reopenDisposition, signDisposition } from '../../../helpers/functions/er-disposition';
import { cancelMedication, chooseReferHospital, disposeByTransfer } from '../../../helpers/functions/refer-out-prep';
import { triageForm } from '../../../helpers/functions/er-triage';
import { dismissToast, expectTriageFormOpen, gotoErDashboard } from '../../../helpers/functions/er';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, recordDrugAllergy, recordMockPatient, registerAndOpenErVisit, savePhysicianNote, submitOrders } from '../../../mock-data/uat-er';
import { addMedicineToCart, careMenu, fillTriage, gotoVisit, openPatientAs, saveTriageForm } from '../../../mock-data/uat-play';
import { gotoDisposition } from '../../../helpers/functions/refer-out-prep';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { clearEvidenceMarks, clicked, expected, filled, alerted, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { authFile } from '../../../utils/env';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import {
  STATUS_TEXT,
  erReferOutPanel,
  fetchDetail,
  fetchListItem,
  fieldValue,
  formCard,
  formItem,
  gotoRequest,
  gotoWorklist,
  headerItem,
  headerValue,
  modal,
  norm,
  referOutAction,
  reviewButton,
  reviewCard,
  worklistHeader,
  worklistRow,
} from '../../../helpers/functions/refer-out';

// SBH-1016 [ER][OPD] Integrate MOPH Refer - Refer Out — ศูนย์ Refer (แอป Refer > Refer Out) พิจารณา / อนุมัติ / ส่ง MoPH
// ชุด Manual: EXE SBH-3392 → HPY SBH-3393 (TC 001–031) · UHP SBH-3394 (TC 032–048) · EDG SBH-3395 (TC 049–053) · TC-001 = SBH-3396 … TC-053 = SBH-3448
// ระบบ: SBH Prod (ผู้ใช้สั่ง 3 พ.ย. 2026 — decisions R106): ผู้ป่วย AUTO ไม่เกิน 5 ราย (ER 4 + OPD 1) แล้วปิด Visit ·
//   กด ส่ง / ยกเลิกใบส่งต่อ ได้เพราะ Prod ต่อ MoPH Refer UAT (credential เดียวกับ Refer IN — Refer IN ทั้ง 62 รายการเป็น UAT…) — ใบแรกต้องได้ Refer ID ขึ้นต้น UAT ก่อนส่งใบอื่น ·
//   TC-041 / 046 / 047 ไม่มี user ตาม Pre-condition → คง Not Run
// ขั้นเตรียม (ทำต่อรายเดิมได้): SBH1016_A=HN,VN,EN + SBH1016_FROM=<ขั้น> (triage | note | retriage | allergy | order | cancel | dispose)
// รัน: npm run card:prod -- --headed --grep "@SBH-1016-PREP-A( |$)"

const CACHE = path.join(__dirname, '..', '..', '..', '.cache', 'SBH-1016');
const STATE_FILE = path.join(CACHE, `state-${SYSTEM}.json`);
type Saved = ErVisit & { name: string; done: string[]; info: Record<string, string> };
export const readState = (): Record<string, Saved> => (fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {});
function saveState(key: string, value: Saved) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...readState(), [key]: value }, null, 2));
}

/** ยา: dev-x ใช้ med0000005–8 (R25) · Prod ใช้รหัสที่เคยสั่งสำเร็จ (ไม่ใช้ Paracetamol เพราะบันทึกเป็นยาที่แพ้) */
const MEDS = SYSTEM === 'dev-x' ? ['med0000006', 'med0000007', 'med0000008'] : ['MED0000260', 'MED0000318', 'MED0000756'];
const CANCEL_MED = MEDS[2];
const HOSPITAL = SYSTEM === 'dev-x' ? ['สระบุรี', 'โรงพยาบาล'] : ['พระพุทธบาท', 'โรงพยาบาล'];
/** ปลายทางจริงของผู้ป่วย C / D (ER-A ค้น "พระพุทธบาท" ได้ตัวแรกเป็นวิทยาลัยพยาบาล 13723) */
const HOSPITAL_FULL = SYSTEM === 'dev-x' ? HOSPITAL : ['โรงพยาบาลพระพุทธบาท', 'พระพุทธบาท'];
const VITALS_1 = { systolic: '138', diastolic: '88', pr: '96', rr: '22', temp: '38.1', spo2: '96', painScore: '5' };

// SBH Prod (3 พ.ย. 2026 · v2.8.1) ยังเป็นฟอร์มคัดกรอง / Physician Note รุ่นเดิม (ปุ่ม GCS "เลือกคะแนน" · ปุ่ม ESI) → ใช้ helper ของสคริปต์ Mock ที่ผ่านบน Prod
// สัญญาณชีพชุดที่ 2 = ช่องสัญญาณชีพในฟอร์ม ER Physician Note ของ Prod (120/80 · PR 80 · RR 18 · T 37 · SpO2 98 — บันทึกหลังคัดกรอง = ชุดล่าสุด)
const STEPS = ['visit', 'triage', 'note', 'allergy', 'order', 'cancel', 'dispose'] as const;

/** ผู้ป่วย AUTO ใหม่ → Visit ER (จด created-patients.md) */
async function newVisit(page: Page, label: string, prefix: string): Promise<Saved> {
  await expect(async () => {
    await gotoErDashboard(page);
  }, 'เปิด ER Dashboard').toPass({ timeout: 180_000 });
  const patient = newTestPatient(prefix);
  const visit = await registerAndOpenErVisit(page, patient);
  recordMockPatient(`SBH-1016 ${label}`, patient, visit, 'เปิด Visit ER (ขั้นเตรียม Refer Out)');
  await expect(page.getByRole('main').getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 90_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
  return { ...visit, name: `${patient.firstName} ${patient.familyName}`, done: ['visit'], info: { citizenId: patient.citizenId } };
}

function resumeFrom(key: string): Saved | undefined {
  const raw = process.env[`SBH1016_${key}`];
  if (!raw) return undefined;
  const [hn, vn, en] = raw.split(',');
  const saved = readState()[key];
  const from = process.env.SBH1016_FROM;
  const base: Saved = saved && saved.hn === hn ? saved : { hn, vn, en, name: '', done: [], info: {} };
  if (from) base.done = STEPS.slice(0, STEPS.indexOf(from as (typeof STEPS)[number])) as unknown as string[];
  return base;
}

// ---------- ตัวช่วยของเทส TC ----------
/** TC-001 = SBH-3396 … TC-053 = SBH-3448 (เลขต่อเนื่อง — ตรวจกับ Linear 3 พ.ย. 2026) */
const issueOf = (n: number) => `SBH-${3395 + n}`;
const tcId = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const TC = (n: number) => `${tcId(n)} (${issueOf(n)})`;
const meta = (key: string, ...tcs: number[]) => ({
  tag: ['@SBH-1016', `@SBH-1016-${key}`, ...tcs.map((n) => `@${issueOf(n)}`)],
  annotation: [{ type: 'issue', description: 'https://linear.app/cortexcloud/issue/SBH-1016' }],
});

/** ผู้ป่วยที่เตรียมแล้ว (ขั้นเตรียมต้องถึง `step`) */
function requireState(key: string, step: string): Saved {
  const s = readState()[key];
  if (!s || !s.done.includes(step)) throw new Error(`ผู้ป่วย ${key} ยังเตรียมไม่ถึงขั้น ${step} — รัน @SBH-1016-PREP-${key} ก่อน`);
  return s;
}

const cmp = (label: string, want: string, got: string, same = norm(want) === norm(got)): CompareRow => ({ label, values: [want, got || '(ว่าง)'], same });
const bad = (rows: CompareRow[]) => rows.filter((x) => !x.same).map((x) => `${x.label}: Expected ${x.values[0]} · จริง ${x.values[1]}`);
async function compare(page: Page, title: string, columns: string[], rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'right') {
  await showCompareTable(page, title, columns, rows, { side });
}

/** เวลา ISO → "dd/MM/2569 HH:mm" เวลาไทย (รูปแบบของ Worklist) */
function thaiDateTime(iso: string): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${Number(p.year) + 543} ${p.hour}:${p.minute}`;
}
/** เวลา ISO → "yyyy-MM-dd HH:mm" เวลาไทย ปี พ.ศ. (รูปแบบช่อง วัดเมื่อ / วันที่ในฟอร์ม) */
function beIsoMinute(iso: string): string {
  const t = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace('T', ' ');
  return `${Number(t.slice(0, 4)) + 543}${t.slice(4)}`;
}
/** วันเกิดในทะเบียน (yyyy-MM-dd ค.ศ.) → ช่องในฟอร์มแสดงปี พ.ศ. */
const beDate = (d: string) => (d ? `${Number(d.slice(0, 4)) + 543}${d.slice(4, 10)}` : '');

async function rowCells(row: import('@playwright/test').Locator): Promise<string[]> {
  return (await row.locator('td').allInnerTexts()).map(norm);
}

/** ทะเบียนผู้ป่วย (new-demographic-api) — ค่าที่ใช้เทียบกับฟอร์ม */
async function registryOf(page: Page, authorization: string, hn: string) {
  const res = await page.request.get(`/new-demographic-api/patients?filter[hn][in]=${hn}&perPage=1`, { headers: { authorization } });
  expect(res.status(), 'อ่านทะเบียนผู้ป่วย').toBe(200);
  const p = ((await res.json()) as { data: Record<string, unknown>[] }).data[0] ?? {};
  const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v));
  const addr = (Array.isArray(p.addresses) ? (p.addresses as Record<string, unknown>[])[0] : (p.address as Record<string, unknown>)) ?? {};
  const address = ['houseNumber', 'no', 'villageNumber', 'moo', 'street', 'road', 'subDistrict', 'subdistrict', 'district', 'province']
    .map((k) => str((addr as Record<string, unknown>)[k]))
    .filter(Boolean)
    .join(' ');
  return {
    citizenId: str(p.idCardNo ?? p.citizenId),
    prefix: str((p.namePrefix as Record<string, unknown>)?.display ?? p.prefix),
    firstName: str(p.firstName),
    familyName: str(p.familyName),
    gender: str(p.gender),
    birthDate: str(p.birthDate),
    mobile: str(p.mobilePhone ?? p.mobileNumber ?? p.phoneNumber),
    address,
  };
}

/** หน้าต่างบัญชีอื่น (อัดวิดีโอแยก video-<role>/) แล้วไปที่ path */
async function openAs(browser: Browser, role: string, url: string): Promise<Page> {
  const context = await browser.newContext({
    storageState: authFile(role),
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1920, height: 1080 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    recordVideo: { dir: test.info().outputPath(`video-${role}`), size: { width: 1920, height: 1080 } },
  });
  const p = await context.newPage();
  await p.goto(url);
  return p;
}

/** ปุ่มพิจารณาบางปุ่มเปิดหน้าต่างยืนยัน — กดยืนยันถ้ามี */
async function confirmIfAsked(page: Page) {
  const dialog = page.locator('.ant-modal-wrap:visible, .ant-popover:visible').last();
  if (await dialog.waitFor({ state: 'visible', timeout: 2_500 }).then(() => true, () => false)) {
    const ok = dialog.getByRole('button', { name: /ยืนยัน|ตกลง|OK/ }).last();
    if (await ok.isVisible().catch(() => false)) await ok.click();
  }
}

// ---------- ฟอร์ม Refer Out ----------
const REASON = 'ส่งต่อเพื่อรับการรักษาต่อ (ทดสอบ SBH-1016 TC-015)';
const REQUEST_TYPE = 'เพื่อการวินิจฉัยและรักษา';
const ALLERGY_LEVEL = 'ไม่ร้ายแรง'; // ตัวเลือกแสดงชื่อไทย (nameTh ของ lookups)
const ALLERGY_SYMPTOM = /\S/; // ตัวเลือกแรก
/** แพทย์ผู้ส่งต่อที่เลขบัตรผ่านบน Prod (practitioner 2 — ตรวจด้วย validate 3 พ.ย. 2026 · user1 = practitioner 1 เลขบัตรไม่ผ่าน) */
const REFERRING_DOCTOR = 'นาย พิมพ์ ทิพย์ ร่วมใจ';

const cidOf = (s: Saved) => s.info.citizenId || '8440431874419';
/** วันนี้ ± n วัน เป็น yyyy-MM-dd ปี พ.ศ. */
function beDay(offset: number): string {
  const d = new Date(Date.now() + offset * 86_400_000);
  const t = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(d);
  return `${Number(t.slice(0, 4)) + 543}${t.slice(4)}`;
}
const checkButton = (page: Page) => page.getByRole('main').getByRole('button', { name: /^(check-circle )?ตรวจสอบ$/ }).last();
const validationList = (page: Page) => page.getByRole('main').locator('.ant-alert').filter({ hasText: /ยังมี \d+ รายการที่ต้องแก้ไข/ }).first();

/** กด ตรวจสอบ (= PUT draft + POST validate) */
async function runCheck(page: Page, vn: string) {
  const validated = referOutAction(page, vn, 'validate');
  await checkButton(page).scrollIntoViewIfNeeded();
  await checkButton(page).click();
  expect((await validated).status(), 'POST validate').toBe(200);
  await page.waitForTimeout(1_500);
}
async function pickSelect(page: Page, item: Locator, option: string | RegExp) {
  await item.scrollIntoViewIfNeeded();
  await item.locator('.ant-select').first().click();
  const opt = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: option }).first();
  await opt.click();
  await page.waitForTimeout(500);
}
async function clearSelect(page: Page, item: Locator) {
  const select = item.locator('.ant-select').first();
  await select.hover();
  const clear = select.locator('.ant-select-clear');
  if (await clear.isVisible().catch(() => false)) await clear.click();
  else {
    await select.click();
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(500);
}
async function typeDate(page: Page, item: Locator, value: string) {
  const input = item.locator('input').first();
  await input.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(value, { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
}
/** กรอกช่องบังคับที่ระบบไม่เติมให้ + เปลี่ยนแพทย์ผู้ส่งต่อเป็นคนที่เลขบัตรถูกต้อง (ผู้ใช้อนุญาต R106) */
async function completeForm(page: Page, options: { urgency?: string } = {}) {
  const doctor = formItem(page, 'แพทย์ผู้ส่งต่อ');
  if ((await fieldValue(doctor)) !== REFERRING_DOCTOR) await pickSelect(page, doctor, REFERRING_DOCTOR);
  if (!(await fieldValue(formItem(page, 'เหตุผลในการส่งต่อ')))) await formItem(page, 'เหตุผลในการส่งต่อ').locator('textarea').fill(REASON);
  if (/^(|เลือกประเภทการส่งต่อ)$/.test(await fieldValue(formItem(page, 'ประเภทการส่งต่อ')))) await pickSelect(page, formItem(page, 'ประเภทการส่งต่อ'), REQUEST_TYPE);
  if (options.urgency && !(await fieldValue(formItem(page, 'ความเร่งด่วน')))) await pickSelect(page, formItem(page, 'ความเร่งด่วน'), options.urgency);
  const levels = page.getByRole('main').locator('.ant-form-item').filter({ has: page.locator('label[title="ระดับความรุนแรง"]') });
  for (let i = 0; i < (await levels.count()); i++) {
    if (!/^(|เลือก)$/.test(await fieldValue(levels.nth(i)))) continue;
    await pickSelect(page, levels.nth(i), ALLERGY_LEVEL);
  }
  const symptoms = page.getByRole('main').locator('.ant-form-item').filter({ has: page.locator('label[title="อาการ"]') });
  for (let i = 0; i < (await symptoms.count()); i++) {
    if (!/^(|เลือก)$/.test(await fieldValue(symptoms.nth(i)))) continue;
    await pickSelect(page, symptoms.nth(i), ALLERGY_SYMPTOM);
  }
}

test.describe('SBH-1016 MoPH Refer Out', () => {
  test.describe.configure({ mode: 'serial' });

  test('เตรียมผู้ป่วย ER-A (คัดกรอง 2 ชุด · Dx 2 รหัส · แพ้ยา · ยา 3 ยกเลิก 1 · By Transfer + ปลายทาง · ลงนาม)', { tag: ['@SBH-1016', '@SBH-1016-PREP-A'] }, async ({ page }) => {
    test.setTimeout(40 * 60_000);
    const key = 'A';
    let s = resumeFrom(key) ?? (await newVisit(page, 'ER-A', 'R1016A'));
    saveState(key, s);
    console.log(`ผู้ป่วย ER-A: ${s.name} HN ${s.hn} VN ${s.vn} EN ${s.en} · ทำแล้ว: ${s.done.join(', ')}`);
    const step = async (name: (typeof STEPS)[number], body: () => Promise<void | Record<string, string>>) => {
      if (s.done.includes(name)) return;
      await test.step(`เตรียม ER-A: ${name}`, async () => {
        const info = await body();
        s = { ...s, done: [...s.done, name], info: { ...s.info, ...(info ?? {}) } };
        saveState(key, s);
        console.log(`  ✓ ${name}${info ? ' ' + JSON.stringify(info) : ''}`);
      });
    };
    await step('triage', async () => {
      // Prod ข้อมูล Encounter โหลดไม่สำเร็จเป็นพักๆ ปุ่ม GCS กดไม่ได้ค้าง → เปิดหน้า Visit ใหม่ (แบบ UAT-ER-orders)
      const gcs = triageForm(page).getByRole('button', { name: 'เลือกคะแนน' }).first();
      let rounds = 0;
      await expect(async () => {
        if (rounds++ || !(await gcs.isVisible().catch(() => false))) await gotoVisit(page, s);
        await expectTriageFormOpen(page, s);
        if (await gcs.count()) await expect(gcs).toBeEnabled({ timeout: 10_000 });
      }, 'ฟอร์มคัดกรองต้องพร้อมให้กรอก').toPass({ timeout: 180_000 });
      await fillTriage(page, s, { level: 2, vitals: VITALS_1 });
      await saveTriageForm(page, s);
      return { vitals1: JSON.stringify(VITALS_1), vitals1At: new Date().toISOString() };
    });
    await step('note', async () => {
      await gotoVisit(page, s);
      return { dx: await savePhysicianNote(page, 'K30'), vitals2At: new Date().toISOString() };
    });
    await step('allergy', async () => {
      await gotoVisit(page, s);
      return { allergy: await recordDrugAllergy(page) };
    });
    await step('order', async () => {
      await gotoVisit(page, s);
      await careMenu(page, 'One Day Order', page.getByRole('main').getByRole('heading', { name: 'Order', exact: true }));
      for (const code of MEDS) await addMedicineToCart(page, code);
      await submitOrders(page, [], { resume: true });
      return { meds: MEDS.join(',') };
    });
    await step('cancel', async () => {
      await gotoVisit(page, s);
      await cancelMedication(page, CANCEL_MED);
      return { cancelled: CANCEL_MED };
    });
    await step('dispose', async () => {
      const d = await disposeByTransfer(page, s, { hospital: HOSPITAL });
      return { hospital: d.hospital ?? '', signedAt: String(d.summary.completedAt ?? ''), signer: d.summary.completedBy?.display ?? '' };
    });
    console.log(`เสร็จ ER-A: ${JSON.stringify(s)}`);
  });
// ---------- ผู้ป่วย ER-A: ก่อนอนุมัติ ----------
  test('ER-A ก่อนอนุมัติ: Worklist · หัวคำขอ · ข้อมูลที่เติม · บันทึกร่าง · รอผู้อำนวยการลงนาม (TC-001 003–006 008–015 017 018 045 048)', meta('A1', 1, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 45, 48), async ({ page, browser }) => {
    test.setTimeout(30 * 60_000);
    const a = requireState('A', 'dispose');
    const info = a.info;
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    await gotoWorklist(page);
    const listItem = await fetchListItem(page, auth(), a.vn);
    expect(listItem, 'Worklist ต้องมีคำขอของผู้ป่วย A').toBeTruthy();
    const signedAtText = thaiDateTime(listItem!.signedAt);

    // TC-001 แถว ER ใน Worklist
    const row = worklistRow(page, a.hn);
    await startClip(page, tcId(1));
    await r.soft(`${TC(1)} แถวผู้ป่วย A แหล่ง ER สถานะรอตรวจสอบ ปลายทางตาม Disposition`, async () => {
      await expect(row).toBeVisible({ timeout: 60_000 });
      const cells = await rowCells(row);
      const rows = [
        cmp('HN / VN', `${a.hn} ${a.vn}`, cells[1] ?? ''),
        cmp('ต้นทาง (แหล่ง)', 'ER', cells[2] ?? ''),
        cmp('สถานะ', STATUS_TEXT.pending_review, cells[6] ?? '', (cells[6] ?? '') === STATUS_TEXT.pending_review),
        cmp('โรงพยาบาลปลายทาง', info.hospital, cells[4] ?? '', (cells[4] ?? '').includes(info.hospital)),
      ];
      await compare(page, 'TC-001 แถวใน Worklist', ['Expected (Disposition)', 'จริง (Worklist)'], rows);
      await markEvidence(expected(row, 'ER · รอตรวจสอบ · ปลายทางตาม Disposition'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-003 คอลัมน์
    await startClip(page, tcId(3));
    await r.soft(`${TC(3)} คอลัมน์ Worklist + ค่าในแถวผู้ป่วย A`, async () => {
      await hideCompareTable(page);
      const headers = (await worklistHeader(page).locator('th').allInnerTexts()).map(norm).filter(Boolean);
      const want = ['ผู้ป่วย', 'HN / VN', 'ต้นทาง', 'เวลาลงนาม', 'โรงพยาบาลปลายทาง', 'แพทย์ผู้ลงนาม', 'สถานะ'];
      const cells = await rowCells(row);
      const rows = [
        ...want.map((h) => cmp(`คอลัมน์ ${h}`, 'มี', headers.includes(h) ? 'มี' : 'ไม่มี')),
        cmp('ค่า ผู้ป่วย', a.name || listItem!.patientName, cells[0] ?? '', (cells[0] ?? '').includes(listItem!.patientName)),
        cmp('ค่า HN / VN', `${a.hn} ${a.vn}`, cells[1] ?? ''),
        cmp('ค่า เวลาลงนาม', signedAtText, cells[3] ?? ''),
        cmp('ค่า แพทย์ผู้ลงนาม', listItem!.summarizedByName, cells[5] ?? ''),
      ];
      r.note('TC-003 หัวคอลัมน์จริง', headers.join(' | '));
      await compare(page, 'TC-003 คอลัมน์ / ค่าในแถว', ['Expected', 'จริง'], rows, 'bottom');
      await markEvidence(expected(worklistHeader(page), 'คอลัมน์ครบ'), expected(row, 'ค่าตรงกับ Visit / Disposition'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-045 (ก่อนเปิดคำขอ / สถานะรอตรวจสอบ) — ไม่มีปุ่มส่ง
    await hideCompareTable(page);
    await gotoRequest(page, a.vn, { open: true });
    await startClip(page, tcId(45));
    await r.soft(`${TC(45)} สถานะรอตรวจสอบ ไม่มีปุ่ม ส่งไปยัง MoPH`, async () => {
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.pending_review);
      const names = (await reviewCard(page).getByRole('button').allInnerTexts()).map(norm).filter(Boolean);
      r.note('TC-045 ปุ่มในการตรวจสอบ', names.join(' | '));
      await expect(page.getByRole('main').getByRole('button', { name: 'ส่งไปยัง MoPH' })).toHaveCount(0);
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'รอตรวจสอบ'), expected(reviewCard(page), `ปุ่ม: ${names.join(' / ')} · ไม่มี ส่งไปยัง MoPH`));
    });

    // TC-004 หัวคำขอ
    await startClip(page, tcId(4));
    await r.soft(`${TC(4)} หัวคำขอ HN / VN · ต้นทาง · ปลายทาง แก้ไขไม่ได้`, async () => {
      const rows = [
        cmp('HN / VN', `${a.hn} / ${a.vn}`, await headerValue(page, 'HN / VN')),
        cmp('โรงพยาบาลต้นทาง', 'โรงพยาบาลสระบุรี (10661)', await headerValue(page, 'โรงพยาบาลต้นทาง')),
        cmp('โรงพยาบาลปลายทาง', `${info.hospital} (${listItem!.destinationHcode})`, await headerValue(page, 'โรงพยาบาลปลายทาง')),
      ];
      const editable = await page.getByRole('main').locator('.ant-descriptions').first().locator('input, textarea, [role="combobox"]').count();
      rows.push(cmp('ช่องให้แก้ในส่วนหัว', '0', String(editable)));
      await compare(page, 'TC-004 ส่วนหัวคำขอ', ['Expected (Visit / Disposition)', 'จริง'], rows);
      await markEvidence(expected(headerItem(page, 'HN / VN'), 'ตรง Visit'), expected(headerItem(page, 'โรงพยาบาลต้นทาง'), 'รพ.ตัวเอง'), expected(headerItem(page, 'โรงพยาบาลปลายทาง'), 'ตาม Disposition'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-005 ข้อมูลผู้ป่วย
    await startClip(page, tcId(5));
    await r.soft(`${TC(5)} ข้อมูลผู้ป่วยเติมจากทะเบียนผู้ป่วย`, async () => {
      await hideCompareTable(page);
      const reg = await registryOf(page, auth(), a.hn);
      const card = formCard(page, 'ผู้ป่วย');
      await card.scrollIntoViewIfNeeded();
      const v = async (label: string) => fieldValue(formItem(card, label));
      const birth = await v('วันเกิด');
      const rows = [
        cmp('เลขประจำตัวประชาชน', reg.citizenId, await v('เลขประจำตัวประชาชน')),
        cmp('คำนำหน้าชื่อ', reg.prefix || 'นาย', await v('คำนำหน้าชื่อ')),
        cmp('ชื่อ', reg.firstName, await v('ชื่อ')),
        cmp('นามสกุล', reg.familyName, await v('นามสกุล')),
        cmp('เพศ', reg.gender === 'male' ? 'ชาย' : reg.gender, await v('เพศ')),
        cmp('วันเกิด (ปี พ.ศ.)', beDate(reg.birthDate), birth),
        cmp('เบอร์โทรศัพท์มือถือ', reg.mobile || '(ว่าง)', (await v('เบอร์โทรศัพท์มือถือ')) || '(ว่าง)'),
        cmp('ที่อยู่ (บ้านเลขที่ … จังหวัด)', reg.address || '(ว่าง)', (await Promise.all(['บ้านเลขที่', 'หมู่ที่', 'ถนน', 'ตำบล/แขวง', 'อำเภอ/เขต', 'จังหวัด'].map(v))).filter(Boolean).join(' ') || '(ว่าง)'),
      ];
      r.note('TC-005 ทะเบียนผู้ป่วย (API)', JSON.stringify(reg));
      await compare(page, 'TC-005 ผู้ป่วย: ทะเบียน vs ฟอร์ม', ['ทะเบียนผู้ป่วย (API)', 'ฟอร์ม Refer Out'], rows, 'right');
      await markEvidence(expected(card, 'ตรงกับทะเบียนผู้ป่วย'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-008 การวินิจฉัยเบื้องต้น
    await startClip(page, tcId(8));
    await r.soft(`${TC(8)} การวินิจฉัยเบื้องต้น = รหัส ชื่อโรค ของ PP และแก้ไขได้`, async () => {
      await hideCompareTable(page);
      const item = formItem(page, 'การวินิจฉัยเบื้องต้น');
      await item.scrollIntoViewIfNeeded();
      const value = await fieldValue(item);
      const want = info.dx.replace(' - ', ' ');
      expect(value, 'การวินิจฉัยเบื้องต้น').toBe(want);
      await expect(item.locator('textarea')).toBeEditable();
      await markEvidence(expected(item, `${want} · แก้ไขได้`), expected(formCard(page, 'การวินิจฉัย'), 'PP = K30'));
    });

    // TC-009 สัญญาณชีพชุดล่าสุด
    await startClip(page, tcId(9));
    await r.soft(`${TC(9)} สัญญาณชีพ = ชุดที่ 2 (ล่าสุด) · ชีพจร = อัตราการเต้นของหัวใจ`, async () => {
      const card = formCard(page, 'สัญญาณชีพ');
      await card.scrollIntoViewIfNeeded();
      const v = (label: string) => fieldValue(formItem(card, label));
      const measured = beIsoMinute(info.vitals2At);
      const rows = [
        cmp('ความดันตัวบน', '120', await v('ความดันตัวบน')),
        cmp('ความดันตัวล่าง', '80', await v('ความดันตัวล่าง')),
        cmp('อัตราการเต้นของหัวใจ', '80', await v('อัตราการเต้นของหัวใจ')),
        cmp('ชีพจร (= อัตราการเต้นของหัวใจ)', '80', await v('ชีพจร')),
        cmp('อัตราการหายใจ', '18', await v('อัตราการหายใจ')),
        cmp('อุณหภูมิ', '37', await v('อุณหภูมิ')),
        cmp('ค่าออกซิเจนในเลือด', '98', await v('ค่าออกซิเจนในเลือด')),
        cmp('วัดเมื่อ (ชุดที่ 2)', measured, await v('วัดเมื่อ')),
      ];
      await compare(page, 'TC-009 ชุดที่ 1 (คัดกรอง 138/88 PR 96) · ชุดที่ 2 (Physician Note)', ['Expected ชุดที่ 2', 'ฟอร์ม Refer Out'], rows, 'right');
      await markEvidence(expected(card, 'ค่าชุดที่ 2 (ล่าสุด)'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-010 ความเร่งด่วนตาม ESI
    await startClip(page, tcId(10));
    await r.soft(`${TC(10)} ความเร่งด่วน = ระดับ ESI 2 (Emergency)`, async () => {
      await hideCompareTable(page);
      const item = formItem(page, 'ความเร่งด่วน');
      await item.scrollIntoViewIfNeeded();
      expect(await fieldValue(item)).toBe('Emergency');
      await markEvidence(expected(item, 'ESI 2 → 2 Emergency'));
    });

    // TC-011 ประวัติแพ้ยา
    await startClip(page, tcId(11));
    await r.soft(`${TC(11)} สิ่งที่แพ้ตามประวัติ · ระดับความรุนแรง / อาการว่างรอเลือก`, async () => {
      const card = formCard(page, 'การแพ้');
      await card.scrollIntoViewIfNeeded();
      const name = await fieldValue(formItem(card, 'สิ่งที่แพ้'));
      const level = await fieldValue(formItem(card, 'ระดับความรุนแรง'));
      const symptom = await fieldValue(formItem(card, 'อาการ'));
      const rows = [
        cmp('สิ่งที่แพ้', 'paracetamol (ชื่อสิ่งที่แพ้)', name, /paracetamol/i.test(name) && !name.trim().startsWith('{')),
        cmp('ระดับความรุนแรง', '(ว่าง รอเลือก)', level || '(ว่าง รอเลือก)'),
        cmp('อาการ', '(ว่าง รอเลือก)', symptom || '(ว่าง รอเลือก)'),
      ];
      await compare(page, 'TC-011 การแพ้: ประวัติ (paracetamol) vs ฟอร์ม', ['Expected', 'จริง'], rows, 'bottom');
      await markEvidence(expected(formItem(card, 'สิ่งที่แพ้'), rows[0].same ? 'paracetamol' : 'ชื่อสิ่งที่แพ้ · จริง: ข้อความ JSON'), expected(formItem(card, 'ระดับความรุนแรง'), 'ว่าง'), expected(formItem(card, 'อาการ'), 'ว่าง'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-012 ยา
    await startClip(page, tcId(12));
    await r.soft(`${TC(12)} ยาที่สั่ง 2 รายการ ไม่มีรายการที่ยกเลิก`, async () => {
      await hideCompareTable(page);
      const card = formCard(page, 'ยา');
      await card.scrollIntoViewIfNeeded();
      const names: string[] = [];
      const items = card.locator('.ant-form-item').filter({ has: page.locator('label[title="ชื่อยา"]') });
      for (let i = 0; i < (await items.count()); i++) names.push(await fieldValue(items.nth(i)));
      const label = card.getByText('ยาที่สั่งในการมารับบริการครั้งนี้', { exact: true });
      const rows = [
        cmp('จำนวนรายการ', '2', String(names.length)),
        cmp('MED0000260 (สั่งอยู่)', 'มี', names.some((n) => /NEVIRAPINE/i.test(n)) ? 'มี' : 'ไม่มี'),
        cmp('MED0000318 (สั่งอยู่)', 'มี', names.some((n) => /MERCAPTOPURINE/i.test(n)) ? 'มี' : 'ไม่มี'),
        cmp('MED0000756 (ยกเลิกแล้ว)', 'ไม่มี', names.some((n) => /DEXAMETHASONE/i.test(n)) ? 'มี' : 'ไม่มี'),
        cmp('ป้ายยาที่สั่งใน Visit นี้', 'มี', (await label.count()) ? 'มี' : 'ไม่มี'),
      ];
      await compare(page, 'TC-012 ยา: สั่ง 3 ยกเลิก DEXAMETHASONE (MED0000756)', ['Expected', 'ฟอร์ม'], rows, 'right');
      await markEvidence(expected(card, '2 รายการ · ไม่มีรายการที่ยกเลิก'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-013 สิทธิแสดงอย่างเดียว
    await startClip(page, tcId(13));
    await r.soft(`${TC(13)} สิทธิการรักษาแก้ไขไม่ได้ + ข้อความให้แก้ที่ Visit`, async () => {
      await hideCompareTable(page);
      const card = formCard(page, 'สิทธิการรักษา');
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator('input, textarea, [role="combobox"]')).toHaveCount(0);
      const hint = card.getByText(/แก้ไขที่ Visit/);
      await expect(hint).toBeVisible();
      await markEvidence(expected(card.getByTestId('refer-out-coverage'), 'แสดงอย่างเดียว'), expected(hint, 'ให้แก้ที่ Visit'));
    });

    // TC-014 วันหมดอายุ
    await startClip(page, tcId(14));
    await r.soft(`${TC(14)} ระยะเวลาใช้ได้ = ระบุวันหมดอายุ · วันหมดอายุ 31 ธ.ค. ปีปัจจุบัน`, async () => {
      const kind = formItem(page, 'ระยะเวลาใช้ได้');
      const date = formItem(page, 'วันหมดอายุ');
      await kind.scrollIntoViewIfNeeded();
      const be = new Date().getFullYear() + 543;
      expect(await fieldValue(kind)).toBe('ระบุวันหมดอายุ');
      expect(await fieldValue(date)).toBe(`${be}-12-31`);
      await markEvidence(expected(kind, 'ระบุวันหมดอายุ'), expected(date, `31 ธ.ค. ${be}`));
    });

    // TC-006 แพทย์ผู้ส่งต่อ (เปิดด้วยบัญชี Nurse ที่ไม่ใช่แพทย์ผู้ลงนาม)
    await r.soft(`${TC(6)} แพทย์ผู้ส่งต่อ = แพทย์ผู้ลงนาม ไม่ใช่ user ที่ login (หน้าต่าง Nurse)`, async () => {
      const nurse = await openAs(browser, 'Nurse', `/cortex/refer/refer-out/${a.vn}`);
      const rn = makeRunner(nurse);
      try {
        await rn.soft(`${TC(6)} หน้าต่าง Nurse`, async () => {
          await expect(nurse.getByRole('main').getByText('คำขอส่งต่อผู้ป่วยออก', { exact: true })).toBeVisible({ timeout: 90_000 });
          const doctor = formItem(nurse, 'แพทย์ผู้ส่งต่อ');
          await doctor.scrollIntoViewIfNeeded();
          const value = await fieldValue(doctor);
          const user = norm(await nurse.locator('header, [class*="header"]').getByText(/example|พยาบาล|nurse/i).first().innerText().catch(() => ''));
          r.note('TC-006 user ที่ login (หน้าต่าง Nurse)', user || '(อ่านไม่ได้)');
          expect(value).toBe(listItem!.summarizedByName);
          await markEvidence(expected(doctor, `${value} = แพทย์ผู้ลงนาม Disposition`), ...(user ? [expected(nurse.getByText(user).first(), 'user ที่ login (Nurse)')] : []));
        });
        rn.finish();
      } finally {
        await nurse.context().close();
      }
    });

    // TC-015 บันทึกร่าง
    await startClip(page, tcId(15));
    const reason = 'ส่งต่อเพื่อรับการรักษาต่อ (ทดสอบ SBH-1016 TC-015)';
    await r.soft(`${TC(15)} บันทึกร่าง แล้วเปิดใหม่ เหตุผล / ประเภทการส่งต่อยังอยู่`, async () => {
      const reasonBox = formItem(page, 'เหตุผลในการส่งต่อ');
      await reasonBox.scrollIntoViewIfNeeded();
      await reasonBox.locator('textarea').fill(reason);
      const type = formItem(page, 'ประเภทการส่งต่อ');
      await type.locator('.ant-select').click();
      await page.locator('.ant-select-dropdown:visible .ant-select-item-option', { hasText: 'เพื่อการวินิจฉัยและรักษา' }).first().click();
      const saveDraft = page.getByRole('main').getByRole('button', { name: /บันทึกร่าง/ });
      await markEvidence(filled(reasonBox, 'เหตุผล'), filled(type, 'ประเภท'), clicked(saveDraft));
      await snapEvidence(page, 'TC-015 ก่อนกด บันทึกร่าง');
      const saved = page.waitForResponse((res) => res.request().method() === 'PUT' && res.url().includes(`/by-vn/${a.vn}/draft`));
      await saveDraft.click();
      expect((await saved).status(), 'PUT draft').toBe(200);
      const toast = page.locator('.ant-message-notice').filter({ hasText: 'บันทึกร่างแล้ว' }).first();
      await toast.waitFor({ timeout: 10_000 }).catch(() => undefined);
      if (await toast.isVisible()) {
        await markEvidence(alerted(toast));
        await snapEvidence(page, 'TC-015 หลังกด บันทึกร่าง');
      }
      await gotoWorklist(page);
      await worklistRow(page, a.hn).click();
      await expect(page.getByRole('main').getByText('คำขอส่งต่อผู้ป่วยออก', { exact: true })).toBeVisible({ timeout: 60_000 });
      await expect(formItem(page, 'เหตุผลในการส่งต่อ')).toBeVisible({ timeout: 60_000 });
      await formItem(page, 'เหตุผลในการส่งต่อ').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1_500);
      expect(await fieldValue(formItem(page, 'เหตุผลในการส่งต่อ'))).toBe(reason);
      expect(await fieldValue(formItem(page, 'ประเภทการส่งต่อ'))).toBe('เพื่อการวินิจฉัยและรักษา');
      await markEvidence(expected(formItem(page, 'เหตุผลในการส่งต่อ'), 'ค่าที่บันทึกไว้'), expected(formItem(page, 'ประเภทการส่งต่อ'), 'ค่าที่บันทึกไว้'));
    });

    // TC-017 รอผู้อำนวยการลงนาม
    await startClip(page, tcId(17));
    await r.soft(`${TC(17)} กด รอผู้อำนวยการลงนาม → สถานะเปลี่ยนทั้งคำขอและ Worklist`, async () => {
      await page.mouse.wheel(0, -5000);
      const button = reviewButton(page, 'รอผู้อำนวยการลงนาม');
      await markEvidence(clicked(button), expected(headerItem(page, 'สถานะ'), 'ก่อนกด: รอตรวจสอบ'));
      await snapEvidence(page, 'TC-017 ก่อนกด');
      const done = referOutAction(page, a.vn, 'director-signature');
      await button.click();
      await confirmIfAsked(page);
      expect((await done).status(), 'POST director-signature').toBe(200);
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.awaiting_director_signature, { timeout: 30_000 });
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'รอผู้อำนวยการลงนาม'));
      await snapEvidence(page, 'TC-017 คำขอ');
      await gotoWorklist(page);
      await expect(worklistRow(page, a.hn)).toContainText(STATUS_TEXT.awaiting_director_signature);
      await markEvidence(expected(worklistRow(page, a.hn), 'Worklist: รอผู้อำนวยการลงนาม'));
    });

    // TC-018 ส่งกลับไปตรวจสอบ
    await startClip(page, tcId(18));
    await r.soft(`${TC(18)} กด ส่งกลับไปตรวจสอบ → สถานะกลับเป็นรอตรวจสอบ`, async () => {
      await gotoRequest(page, a.vn);
      const button = reviewButton(page, 'ส่งกลับไปตรวจสอบ');
      await markEvidence(clicked(button), expected(headerItem(page, 'สถานะ'), 'ก่อนกด: รอผู้อำนวยการลงนาม'));
      await snapEvidence(page, 'TC-018 ก่อนกด');
      const done = referOutAction(page, a.vn, 'return-to-review');
      await button.click();
      await confirmIfAsked(page);
      expect((await done).status(), 'POST return-to-review').toBe(200);
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.pending_review, { timeout: 30_000 });
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'รอตรวจสอบ'));
    });

    // TC-048 แผงฝั่ง ER (บัญชี Nurse)
    await r.soft(`${TC(48)} หน้า Disposition ของ ER แสดงสถานะอย่างเดียว ไม่มีปุ่มส่ง / ยกเลิก (หน้าต่าง Nurse)`, async () => {
      const nurse = await openPatientAs(browser, 'Nurse', a.hn, a);
      const rn = makeRunner(nurse);
      try {
        await gotoDisposition(nurse, a);
        await rn.soft(`${TC(48)} หน้าต่าง Nurse`, async () => {
          const panel = erReferOutPanel(nurse);
          await expect(panel).toBeVisible({ timeout: 60_000 });
          await panel.scrollIntoViewIfNeeded();
          const buttons = (await panel.getByRole('button').allInnerTexts()).map(norm).filter(Boolean);
          r.note('TC-048 ปุ่มในแผง การส่งตัว MoPH', buttons.join(' | ') || '(ไม่มี)');
          expect(buttons.filter((b) => /ส่ง|ยกเลิก/.test(b))).toEqual([]);
          await expect(panel.locator('input, textarea')).toHaveCount(0);
          await markEvidence(expected(panel, 'สถานะอย่างเดียว · ไม่มีปุ่มส่ง / ยกเลิก'));
        });
        rn.finish();
      } finally {
        await nurse.context().close();
      }
    });

    await startClip(page, 'after');
    r.finish();
  });
// ---------- ผู้ป่วย ER-A: อนุมัติ ----------
  test('ER-A อนุมัติ: สถานะอนุมัติแล้ว + เลขที่ใบส่งตัว (TC-019 020)', meta('A2', 19, 20), async ({ page }) => {
    test.setTimeout(15 * 60_000);
    const a = requireState('A', 'dispose');
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    await gotoRequest(page, a.vn, { open: true });
    const before = await fetchDetail(page, auth(), a.vn);
    // อนุมัติไปแล้ว (รอบก่อน) → ไม่กดซ้ำ ตรวจ TC-020 อย่างเดียว (อ่านอย่างเดียว)
    const fresh = before.status === 'pending_review';
    let number = fresh ? '' : (a.info.number1 ?? '');
    if (fresh) await startClip(page, tcId(19));
    if (fresh) await r.soft(`${TC(19)} กด อนุมัติ → สถานะ อนุมัติแล้ว`, async () => {
      const approve = reviewButton(page, 'อนุมัติ');
      await markEvidence(clicked(approve), expected(headerItem(page, 'สถานะ'), 'ก่อนกด: รอตรวจสอบ'));
      await snapEvidence(page, 'TC-019 ก่อนกด อนุมัติ');
      const done = referOutAction(page, a.vn, 'approve');
      await approve.click();
      await confirmIfAsked(page);
      const res = await done;
      expect(res.status(), 'POST approve').toBe(200);
      const box = modal(page, 'อนุมัติแล้ว');
      await expect(box).toBeVisible({ timeout: 30_000 });
      number = norm(await box.innerText()).match(/\d{4}\/\d{2}/)?.[0] ?? '';
      saveState('A', { ...a, info: { ...a.info, number1: number, approvedAt: new Date().toISOString() } });
      r.note('TC-019 เลขที่ใบส่งตัว', number);
      await markEvidence(alerted(box, `อนุมัติแล้ว · เลขที่ ${number}`));
      await snapEvidence(page, 'TC-019 หน้าต่าง อนุมัติแล้ว');
      await box.getByRole('button', { name: 'เสร็จสิ้น' }).click();
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.approved, { timeout: 30_000 });
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'อนุมัติแล้ว'));
    });

    await startClip(page, tcId(20));
    await r.soft(`${TC(20)} เลขที่ส่งต่อแสดงทันทีหลังอนุมัติ รูปแบบ 0000/69 (ยังไม่ส่ง)`, async () => {
      const be2 = String(new Date().getFullYear() + 543).slice(2);
      expect(number, 'เลขในหน้าต่างอนุมัติ').toMatch(new RegExp(`^\\d{4}/${be2}$`));
      await expect(headerItem(page, 'เลขที่ส่งต่อ')).toContainText(number);
      const d = await fetchDetail(page, auth(), a.vn);
      r.note('TC-020 API หลังอนุมัติ', JSON.stringify({ status: d.status, referOutNo: d.referOutNo, number: d.number, submission: d.submission }));
      expect(d.submission ?? null, 'ยังไม่ส่ง MoPH').toBeNull();
      await markEvidence(expected(headerItem(page, 'เลขที่ส่งต่อ'), `${number} (ลำดับ 4 หลัก / ปี ${be2})`), expected(headerItem(page, 'สถานะ'), 'อนุมัติแล้ว · ยังไม่ส่ง'));
      await page.mouse.wheel(0, 300);
      await gotoWorklist(page);
      await expect(worklistRow(page, a.hn)).toContainText(number);
      await markEvidence(expected(worklistRow(page, a.hn), `Worklist: ${number}`));
    });
    await startClip(page, 'after');
    r.finish();
  });
// ---------- ผู้ป่วย ER-A: ช่องบังคับก่อนส่ง (อนุมัติแล้ว ยังไม่ส่ง) ----------
  test('ER-A ช่องบังคับก่อนส่ง: ว่าง / ผิดรูปแบบ → ส่งไม่ได้ (TC-032 033 035–040)', meta('A3', 32, 33, 35, 36, 37, 38, 39, 40), async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const a = requireState('A', 'dispose');
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    await gotoRequest(page, a.vn, { open: true });
    expect((await fetchDetail(page, auth(), a.vn)).status, 'ต้องอนุมัติแล้ว (TC-019)').toBe('approved');
    const sendButton = () => page.getByTestId('refer-out-submission-panel').getByRole('button', { name: 'ส่งไปยัง MoPH' });

    // ทำฟอร์มให้ครบก่อน (แพทย์ที่เลขบัตรถูกต้อง · เหตุผล · ประเภท · ระดับ / อาการแพ้)
    await test.step('เตรียม: กรอกช่องบังคับให้ครบ + แพทย์ผู้ส่งต่อที่มีเลขบัตรถูกต้อง', async () => {
      await completeForm(page);
      await runCheck(page, a.vn);
      await expect(sendButton(), 'ฟอร์มครบ = ปุ่มส่งกดได้').toBeEnabled({ timeout: 30_000 });
      await expect(sendButton()).toBeEnabled();
    });

    const cidInput = () => formItem(page, 'เลขประจำตัวประชาชน').locator('input');
    const cases: { n: number; title: string; label: string; message: string; spoil: () => Promise<string>; restore: () => Promise<void> }[] = [
      {
        n: 32, title: 'ไม่กรอกเหตุผลในการส่งต่อ', label: 'เหตุผลในการส่งต่อ', message: 'กรอกเหตุผลในการส่งต่อ',
        spoil: async () => { await formItem(page, 'เหตุผลในการส่งต่อ').locator('textarea').fill(''); return '(ว่าง)'; },
        restore: async () => { await formItem(page, 'เหตุผลในการส่งต่อ').locator('textarea').fill(REASON); },
      },
      {
        n: 33, title: 'ไม่เลือกประเภทการส่งต่อ', label: 'ประเภทการส่งต่อ', message: 'เลือกประเภทการส่งต่อ',
        spoil: async () => { await clearSelect(page, formItem(page, 'ประเภทการส่งต่อ')); return '(ไม่เลือก)'; },
        restore: async () => { await pickSelect(page, formItem(page, 'ประเภทการส่งต่อ'), REQUEST_TYPE); },
      },
      {
        n: 35, title: 'ลบการวินิจฉัยเบื้องต้นออก', label: 'การวินิจฉัยเบื้องต้น', message: 'กรอกการวินิจฉัยเบื้องต้น',
        spoil: async () => { await formItem(page, 'การวินิจฉัยเบื้องต้น').locator('textarea').fill(''); return '(ลบออก)'; },
        restore: async () => { await formItem(page, 'การวินิจฉัยเบื้องต้น').locator('textarea').fill(a.info.dx.replace(' - ', ' ')); },
      },
      {
        n: 36, title: 'ไม่เลือกระดับความรุนแรงของรายการแพ้ยา (เลือกอาการแล้ว)', label: 'ระดับความรุนแรง', message: 'เลือกระดับความรุนแรง',
        spoil: async () => { await clearSelect(page, formItem(page, 'ระดับความรุนแรง')); return '(ไม่เลือก · อาการเลือกแล้ว)'; },
        restore: async () => { await pickSelect(page, formItem(page, 'ระดับความรุนแรง'), ALLERGY_LEVEL); },
      },
      {
        n: 37, title: 'ไม่เลือกอาการของรายการแพ้ยา (เลือกระดับแล้ว)', label: 'อาการ', message: 'เลือกอาการ',
        spoil: async () => { await clearSelect(page, formItem(page, 'อาการ')); return '(ไม่เลือก · ระดับเลือกแล้ว)'; },
        restore: async () => { await pickSelect(page, formItem(page, 'อาการ'), ALLERGY_SYMPTOM); },
      },
      {
        n: 38, title: 'เลขบัตรประชาชนผู้ป่วย 12 หลัก', label: 'เลขประจำตัวประชาชน', message: 'เลขประจำตัวประชาชนต้องมี 13 หลักและถูกต้อง',
        spoil: async () => { const v = cidOf(a).slice(0, 12); await cidInput().fill(v); return v; },
        restore: async () => { await cidInput().fill(cidOf(a)); },
      },
      {
        n: 39, title: 'เลขบัตรประชาชน 13 หลักแต่หลักตรวจสอบผิด', label: 'เลขประจำตัวประชาชน', message: 'เลขประจำตัวประชาชนต้องมี 13 หลักและถูกต้อง',
        spoil: async () => { const c = cidOf(a); const v = c.slice(0, 12) + String((Number(c[12]) + 1) % 10); await cidInput().fill(v); return v; },
        restore: async () => { await cidInput().fill(cidOf(a)); },
      },
      {
        n: 40, title: 'วันหมดอายุเป็นเมื่อวาน', label: 'วันหมดอายุ', message: 'วันหมดอายุผ่านมาแล้ว',
        spoil: async () => { const v = beDay(-1); await typeDate(page, formItem(page, 'วันหมดอายุ'), v); return v; },
        restore: async () => { await typeDate(page, formItem(page, 'วันหมดอายุ'), `${new Date().getFullYear() + 543}-12-31`); },
      },
    ];

    for (const c of cases) {
      await startClip(page, tcId(c.n));
      await r.soft(`${TC(c.n)} ${c.title} → ส่งไม่ได้ ช่องแจ้ง ${c.message}`, async () => {
        const item = formItem(page, c.label);
        await item.scrollIntoViewIfNeeded();
        const value = await c.spoil();
        await markEvidence(filled(item, value), clicked(checkButton(page)));
        await snapEvidence(page, `${tcId(c.n)} ก่อนกด ตรวจสอบ`);
        await runCheck(page, a.vn);
        const explain = item.locator('.ant-form-item-explain');
        await item.scrollIntoViewIfNeeded();
        await expect(explain, `ช่อง ${c.label} ต้องแจ้ง ${c.message}`).toContainText(c.message, { timeout: 20_000 });
        await markEvidence(alerted(explain, c.message));
        await snapEvidence(page, `${tcId(c.n)} ช่องแจ้งเตือน`);
        await page.mouse.wheel(0, -20_000);
        await expect(sendButton(), 'ปุ่ม ส่งไปยัง MoPH ต้องกดไม่ได้').toBeDisabled();
        await expect(validationList(page)).toContainText(c.message);
        await markEvidence(expected(sendButton(), 'ส่งไม่ได้ (ปุ่มปิด)'), expected(validationList(page), c.message));
      });
      await test.step(`คืนค่า ${c.label}`, async () => {
        await formItem(page, c.label).scrollIntoViewIfNeeded();
        await c.restore();
        await runCheck(page, a.vn);
        await expect(sendButton(), 'ฟอร์มครบ = ปุ่มส่งกดได้').toBeEnabled({ timeout: 30_000 });
      });
    }
    await startClip(page, 'after');
    r.finish();
  });
// ---------- ผู้ป่วย ER-A: ส่ง MoPH → รีเฟรช → แผง ER → ยกเลิกใบส่งตัว → อนุมัติใหม่ ----------
  test('ER-A ส่ง MoPH แล้วยกเลิก: ส่งแล้ว · รีเฟรชสถานะ · แผง ER · ยกเลิกต้องมีเหตุผล · อนุมัติใหม่ได้เลขใหม่ (TC-021 023 026 044 030 031)', meta('A4', 21, 23, 26, 44, 30, 31), async ({ page, browser }) => {
    test.setTimeout(30 * 60_000);
    let a = requireState('A', 'dispose');
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    const panel = () => page.getByTestId('refer-out-submission-panel');
    await gotoRequest(page, a.vn, { open: true });
    const start = await fetchDetail(page, auth(), a.vn);
    const number1 = a.info.number1;

    // TC-021 รอบ 2: ส่งครั้งแรก (รอบก่อน 21:48) MoPH ตอบ 400 เลข 0001/69 ซ้ำ (UAT มีเลข 0001–0023/69 ของ 10661 อยู่แล้ว) → ระบบ void แล้วออกเลขใหม่ · กด แก้ไขและส่งซ้ำ
    if (!a.info.referId1 && start.submissionState === 'failed') {
      await startClip(page, tcId(21));
      await r.soft(`${TC(21)} ส่ง MoPH สำเร็จ (ส่งซ้ำหลังเลขซ้ำใน MoPH UAT) → ส่งแล้ว · Refer ID`, async () => {
        const failedTitle = panel().getByText('MoPH ไม่รับใบส่งตัว');
        await expect(failedTitle).toBeVisible();
        const resend = panel().getByRole('button', { name: 'แก้ไขและส่งซ้ำ' });
        await markEvidence(alerted(panel(), `ครั้งแรก: ${start.lastAttempt ? 'เลข 0001/69 ซ้ำใน MoPH' : 'ส่งไม่สำเร็จ'}`), expected(headerItem(page, 'เลขที่ส่งต่อ'), `เลขใหม่ ${start.referOutNo}`), clicked(resend));
        await snapEvidence(page, 'TC-021 ส่งครั้งแรก เลขซ้ำใน MoPH');
        const sent = page.waitForResponse((x) => x.request().method() === 'POST' && /\/by-vn\/[^/]+\/(resend|send)$/.test(x.url()), { timeout: 120_000 });
        await resend.click();
        const confirm = modal(page, /ส่งใบส่งตัวเลขที่|ส่งไปยัง MoPH/);
        if (await confirm.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) {
          await markEvidence(alerted(confirm, 'ยืนยันการส่งซ้ำ'), clicked(confirm.locator('.ant-btn-primary')));
          await snapEvidence(page, 'TC-021 หน้าต่างยืนยันส่งซ้ำ');
          await confirm.locator('.ant-btn-primary').click();
        }
        const res = await sent;
        r.note('TC-021 POST resend', `${res.status()} ${(await res.text()).slice(0, 300)}`);
        expect(res.status(), 'POST resend').toBe(200);
        await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.sent, { timeout: 90_000 });
        const d = await fetchDetail(page, auth(), a.vn);
        const referId = d.submission?.referId ?? '';
        r.note('TC-021 หลังส่ง', JSON.stringify({ status: d.status, referOutNo: d.referOutNo, submission: d.submission, liveStatus: d.liveStatus }));
        a = { ...a, info: { ...a.info, referId1: referId, sentNumber1: d.referOutNo ?? '', sentAt: new Date().toISOString() } };
        saveState('A', a);
        expect(referId, 'Refer ID ต้องขึ้นต้น UAT (MoPH UAT)').toMatch(/^UAT/);
        expect(d.referOutNo, 'เลขที่ส่งต่อ = เลขที่แสดงตอนอนุมัติ (หลังระบบออกเลขใหม่)').toBe(start.referOutNo);
        await markEvidence(expected(headerItem(page, 'สถานะ'), 'ส่งแล้ว'), expected(panel().getByText(referId).first(), `Refer ID ${referId}`), expected(headerItem(page, 'เลขที่ส่งต่อ'), `${d.referOutNo}`));
      });
      if (!a.info.referId1?.startsWith('UAT')) throw new Error(`หยุด: Refer ID "${a.info.referId1}" ไม่ใช่ของ MoPH UAT — ไม่ส่งใบอื่นต่อ ถามผู้ใช้ก่อน`);
    }
    const sentNumber = () => a.info.sentNumber1 || number1;

    // TC-021 ส่ง (ทำเฉพาะเมื่อยังไม่ส่ง)
    if (!a.info.referId1) {
      expect(start.status, 'ต้องอนุมัติแล้ว').toBe('approved');
      await startClip(page, tcId(21));
      await r.soft(`${TC(21)} ส่ง MoPH สำเร็จ → ส่งแล้ว · Refer ID · เลขเดิมจากตอนอนุมัติ`, async () => {
        await completeForm(page);
        await runCheck(page, a.vn);
        await page.mouse.wheel(0, -20_000);
        const send = panel().getByRole('button', { name: 'ส่งไปยัง MoPH' });
        await expect(send).toBeEnabled({ timeout: 30_000 });
        await markEvidence(clicked(send), expected(headerItem(page, 'เลขที่ส่งต่อ'), `เลขตอนอนุมัติ ${number1}`));
        await snapEvidence(page, 'TC-021 ก่อนกด ส่ง');
        await send.click();
        const confirm = modal(page, 'ส่งใบส่งตัวเลขที่');
        await expect(confirm).toBeVisible();
        await markEvidence(alerted(confirm, 'ยืนยันการส่ง'), clicked(confirm.locator('.ant-btn-primary')));
        await snapEvidence(page, 'TC-021 หน้าต่างยืนยัน');
        const sent = referOutAction(page, a.vn, 'send', 120_000);
        await confirm.locator('.ant-btn-primary').click();
        const res = await sent;
        r.note('TC-021 POST send', `${res.status()} ${(await res.text()).slice(0, 400)}`);
        expect(res.status(), 'POST send').toBe(200);
        await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.sent, { timeout: 60_000 });
        const d = await fetchDetail(page, auth(), a.vn);
        const referId = d.submission?.referId ?? '';
        r.note('TC-021 หลังส่ง', JSON.stringify({ status: d.status, referOutNo: d.referOutNo, submission: d.submission, liveStatus: d.liveStatus }));
        a = { ...a, info: { ...a.info, referId1: referId, sentAt: new Date().toISOString() } };
        saveState('A', a);
        // Refer ID ต้องเป็นของ MoPH UAT (ผู้ใช้อนุญาตให้ส่งเฉพาะ UAT — R106)
        expect(referId, 'Refer ID ต้องขึ้นต้น UAT (MoPH UAT)').toMatch(/^UAT/);
        expect(d.referOutNo, 'เลขที่ส่งต่อต้องเป็นเลขเดิมตอนอนุมัติ').toBe(number1);
        await markEvidence(expected(headerItem(page, 'สถานะ'), 'ส่งแล้ว'), expected(panel().getByText(referId).first(), `Refer ID ${referId}`), expected(headerItem(page, 'เลขที่ส่งต่อ'), `${number1} (เลขเดิม)`));
      });
      if (!a.info.referId1?.startsWith('UAT')) throw new Error(`หยุด: Refer ID "${a.info.referId1}" ไม่ใช่ของ MoPH UAT — ไม่ส่งใบอื่นต่อ ถามผู้ใช้ก่อน`);
    }

    // TC-023 รีเฟรชสถานะ
    await startClip(page, tcId(23));
    await r.soft(`${TC(23)} กด รีเฟรช → แสดงสถานะล่าสุดจาก MoPH`, async () => {
      await gotoRequest(page, a.vn);
      const refresh = panel().getByRole('button', { name: /รีเฟรช/ });
      const live = panel().getByText(/สถานะใน MoPH/).first();
      await markEvidence(clicked(refresh));
      await snapEvidence(page, 'TC-023 ก่อนกด รีเฟรช');
      const reread = page.waitForResponse((x) => x.request().method() === 'GET' && x.url().includes(`/by-vn/${a.vn}`), { timeout: 60_000 });
      await refresh.click();
      expect((await reread).status()).toBe(200);
      await page.waitForTimeout(2_000);
      const d = await fetchDetail(page, auth(), a.vn);
      r.note('TC-023 liveStatus', JSON.stringify(d.liveStatus));
      await expect(live).toBeVisible();
      const readAt = panel().getByText(/เวลาที่อ่านสถานะ/).first();
      await markEvidence(expected(panel(), `สถานะใน MoPH: ${JSON.stringify(d.liveStatus?.statusText ?? d.liveStatus?.status ?? '')}`), ...((await readAt.count()) ? [expected(readAt, 'เวลาที่อ่าน')] : []));
    });

    // TC-026 แผงฝั่ง ER หลังส่ง (บัญชี Nurse)
    await r.soft(`${TC(26)} หน้า Disposition ของ ER แสดง ส่งแล้ว · Refer ID · เลขที่ส่งต่อ (หน้าต่าง Nurse)`, async () => {
      const nurse = await openPatientAs(browser, 'Nurse', a.hn, a);
      const rn = makeRunner(nurse);
      try {
        await gotoDisposition(nurse, a);
        await rn.soft(`${TC(26)} หน้าต่าง Nurse`, async () => {
          const p = erReferOutPanel(nurse);
          await expect(p).toBeVisible({ timeout: 60_000 });
          await p.scrollIntoViewIfNeeded();
          await expect(p).toContainText(STATUS_TEXT.sent);
          await expect(p).toContainText(a.info.referId1);
          await expect(p).toContainText(sentNumber());
          await markEvidence(expected(p, `ส่งแล้ว · ${a.info.referId1} · ${sentNumber()} ตรงกับศูนย์ Refer`));
        });
        rn.finish();
      } finally {
        await nurse.context().close();
      }
    });

    // TC-044 ยกเลิกไม่ได้เมื่อไม่ระบุเหตุผล
    await startClip(page, tcId(44));
    await r.soft(`${TC(44)} ยกเลิกใบส่งตัวโดยไม่ใส่เหตุผล → ยกเลิกไม่ได้ สถานะยังส่งแล้ว`, async () => {
      const cancel = panel().getByRole('button', { name: 'ยกเลิกใบส่งตัว' });
      await markEvidence(clicked(cancel));
      await snapEvidence(page, 'TC-044 ก่อนกด ยกเลิกใบส่งตัว');
      await cancel.click();
      const box = modal(page, 'ยกเลิกใบส่งตัวใน MoPH');
      await expect(box).toBeVisible();
      const ok = box.locator('.ant-modal-footer .ant-btn-dangerous, .ant-modal-footer .ant-btn-primary').last();
      const reason = box.getByRole('textbox');
      await expect(ok, 'ปุ่มยืนยันต้องกดไม่ได้เมื่อเหตุผลว่าง').toBeDisabled();
      await expect(reason).toHaveClass(/status-error/);
      await markEvidence(expected(reason, 'เหตุผลว่าง = ช่องแดง'), expected(ok, 'ยืนยันไม่ได้'));
      await snapEvidence(page, 'TC-044 หน้าต่างยกเลิก เหตุผลว่าง');
      await box.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.sent);
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'ยังเป็น ส่งแล้ว'));
    });

    // TC-030 ยกเลิกใบส่งตัวพร้อมเหตุผล
    await startClip(page, tcId(30));
    await r.soft(`${TC(30)} ยกเลิกใบส่งตัวพร้อมเหตุผล → ยกเลิกแล้ว`, async () => {
      await panel().getByRole('button', { name: 'ยกเลิกใบส่งตัว' }).click();
      const box = modal(page, 'ยกเลิกใบส่งตัวใน MoPH');
      const reason = box.getByRole('textbox');
      await reason.fill('ทดสอบระบบ SBH-1016 TC-030 ยกเลิกใบส่งตัว');
      const ok = box.locator('.ant-modal-footer .ant-btn-dangerous, .ant-modal-footer .ant-btn-primary').last();
      await markEvidence(filled(reason), clicked(ok));
      await snapEvidence(page, 'TC-030 ก่อนกด ยืนยันยกเลิก');
      const cancelled = referOutAction(page, a.vn, 'cancel', 120_000);
      await ok.click();
      const res = await cancelled;
      r.note('TC-030 POST cancel', `${res.status()} ${(await res.text()).slice(0, 400)}`);
      expect(res.status()).toBe(200);
      await page.waitForTimeout(3_000);
      const d = await fetchDetail(page, auth(), a.vn);
      r.note('TC-030 หลังยกเลิก', JSON.stringify({ status: d.status, number: d.number, submission: d.submission, liveStatus: d.liveStatus }));
      const cancelledTitle = page.getByRole('main').getByText(/ยกเลิกใน MoPH แล้ว|ยกเลิกแล้ว/).first();
      await expect(cancelledTitle).toBeVisible({ timeout: 30_000 });
      await markEvidence(expected(cancelledTitle, 'ยกเลิกแล้ว'), expected(headerItem(page, 'สถานะ'), `กลับไป ${STATUS_TEXT[d.status] ?? d.status}`));
    });

    // TC-031 อนุมัติใหม่ได้เลขใหม่
    await startClip(page, tcId(31));
    await r.soft(`${TC(31)} อนุมัติใหม่หลังยกเลิก → เลขที่ส่งต่อใหม่ ไม่ซ้ำ ${sentNumber()}`, async () => {
      await gotoRequest(page, a.vn);
      const approve = reviewButton(page, 'อนุมัติ');
      await markEvidence(clicked(approve), expected(headerItem(page, 'สถานะ'), 'รอตรวจสอบ (หลังยกเลิก)'));
      await snapEvidence(page, 'TC-031 ก่อนกด อนุมัติ');
      const done = referOutAction(page, a.vn, 'approve');
      await approve.click();
      await confirmIfAsked(page);
      expect((await done).status()).toBe(200);
      const box = modal(page, 'อนุมัติแล้ว');
      await expect(box).toBeVisible({ timeout: 30_000 });
      const number2 = norm(await box.innerText()).match(/\d{4}\/\d{2}/)?.[0] ?? '';
      a = { ...a, info: { ...a.info, number2 } };
      saveState('A', a);
      await markEvidence(alerted(box, `เลขใหม่ ${number2} (เดิม ${sentNumber()})`));
      await snapEvidence(page, 'TC-031 หน้าต่าง อนุมัติแล้ว');
      await box.getByRole('button', { name: 'เสร็จสิ้น' }).click();
      expect(number2).not.toBe(sentNumber());
      expect(number2).toMatch(/^\d{4}\/\d{2}$/);
      await expect(headerItem(page, 'เลขที่ส่งต่อ')).toContainText(number2);
      await markEvidence(expected(headerItem(page, 'เลขที่ส่งต่อ'), `${number2} ≠ ${sentNumber()}`));
    });
    await startClip(page, 'after');
    r.finish();
  });
// ---------- ขั้นเตรียมผู้ป่วย ER-C / D / E (คัดกรอง · Physician Note · Disposition By Transfer ลงนาม) ----------
  for (const p of [
    { key: 'C', prefix: 'R1016C', hospital: HOSPITAL_FULL as string[] | null, secondDx: 'I10', why: 'Dx 2 รหัส · ไม่อนุมัติ · ลงนามใหม่ (TC-007 024 025 028 042 052)' },
    { key: 'D', prefix: 'R1016D', hospital: HOSPITAL_FULL as string[] | null, secondDx: '', why: 'ยกเลิกอนุมัติ · แก้ Disposition หลังอนุมัติ (TC-029 050 051)' },
    { key: 'E', prefix: 'R1016E', hospital: null as string[] | null, secondDx: '', why: 'By Transfer ไม่ระบุปลายทาง (TC-049)' },
  ]) {
    test(`เตรียมผู้ป่วย ER-${p.key} — ${p.why}`, { tag: ['@SBH-1016', `@SBH-1016-PREP-${p.key}`] }, async ({ page }) => {
      test.setTimeout(30 * 60_000);
      let s = resumeFrom(p.key) ?? (await newVisit(page, `ER-${p.key}`, p.prefix));
      saveState(p.key, s);
      console.log(`ผู้ป่วย ER-${p.key}: ${s.name} HN ${s.hn} VN ${s.vn} EN ${s.en} · ทำแล้ว: ${s.done.join(', ')}`);
      const step = async (name: (typeof STEPS)[number], body: () => Promise<void | Record<string, string>>) => {
        if (s.done.includes(name)) return;
        await test.step(`เตรียม ER-${p.key}: ${name}`, async () => {
          const info = await body();
          s = { ...s, done: [...s.done, name], info: { ...s.info, ...(info ?? {}) } };
          saveState(p.key, s);
          console.log(`  ✓ ${name}${info ? ' ' + JSON.stringify(info) : ''}`);
        });
      };
      await step('triage', async () => {
        const gcs = triageForm(page).getByRole('button', { name: 'เลือกคะแนน' }).first();
        let rounds = 0;
        await expect(async () => {
          if (rounds++ || !(await gcs.isVisible().catch(() => false))) await gotoVisit(page, s);
          await expectTriageFormOpen(page, s);
          if (await gcs.count()) await expect(gcs).toBeEnabled({ timeout: 10_000 });
        }, 'ฟอร์มคัดกรองต้องพร้อมให้กรอก').toPass({ timeout: 180_000 });
        await fillTriage(page, s, { level: 3, vitals: VITALS_1 });
        await saveTriageForm(page, s);
      });
      await step('note', async () => {
        await gotoVisit(page, s);
        return { dx: await savePhysicianNote(page, 'K30') };
      });
      await step('dispose', async () => {
        let dx2 = '';
        const d = await disposeByTransfer(page, s, {
          hospital: p.hospital,
          beforeSign: async () => {
            if (!p.secondDx) return;
            // Dx รหัสที่ 2 ในหัวข้อ การวินิจฉัย ของ Disposition (Visit coding) — ทำไม่ได้ไม่ล้มขั้นเตรียม
            try {
              const main = page.getByRole('main');
              const add = main.getByRole('button', { name: /เพิ่ม/ }).filter({ hasText: /วินิจฉัย|รายการ|^\+/ }).first();
              if (!(await main.getByText('ค้นหา ICD10', { exact: true }).first().isVisible().catch(() => false)) && (await add.isVisible().catch(() => false))) await add.click();
              await chooseDispositionDiagnosis(page, p.secondDx);
              dx2 = p.secondDx;
            } catch (error) {
              console.log(`  ⚠ เพิ่ม Dx ${p.secondDx} ใน Disposition ไม่ได้: ${String(error).split('\n')[0]}`);
            }
          },
        });
        return { hospital: d.hospital ?? '', signedAt: String(d.summary.completedAt ?? ''), dx2 };
      });
      console.log(`เสร็จ ER-${p.key}: ${JSON.stringify(s)}`);
    });
  }
// ---------- ผู้ป่วย ER-C: การวินิจฉัย · ไม่อนุมัติ · แผง ER · ลงนามใหม่ ----------
  test('ER-C ไม่อนุมัติ: การวินิจฉัย · ไม่อนุมัติต้องมีเหตุผล · ไม่ได้เลข · แผง ER · ลงนามใหม่กลับเข้า Worklist (TC-007 042 024 025 028 052)', meta('C1', 7, 42, 24, 25, 28, 52), async ({ page, browser }) => {
    test.setTimeout(30 * 60_000);
    const c = requireState('C', 'dispose');
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    const reason = 'ข้อมูลไม่ครบ ให้แพทย์ทบทวนการส่งต่อ (ทดสอบ SBH-1016 TC-024)';
    await gotoWorklist(page);
    await gotoRequest(page, c.vn, { open: true });

    // TC-007 การวินิจฉัย (Visit มีรหัสเดียว K30 — Prod เพิ่มรหัสที่ 2 ใน Disposition ไม่ได้)
    await startClip(page, tcId(7));
    await r.soft(`${TC(7)} การวินิจฉัยเติมจากรหัส ICD-10 ของ Visit (PP)`, async () => {
      const card = formCard(page, 'การวินิจฉัย');
      await card.scrollIntoViewIfNeeded();
      const codes = card.locator('.ant-form-item').filter({ has: page.locator('label[title="การวินิจฉัย"]') });
      const types = card.locator('.ant-form-item').filter({ has: page.locator('label[title="ประเภทการวินิจฉัย"]') });
      const rows: CompareRow[] = [];
      const n = await codes.count();
      for (let i = 0; i < n; i++) rows.push(cmp(`แถว ${i + 1}`, i === 0 ? `${c.info.dx} · Principal diagnosis` : '-', `${await fieldValue(codes.nth(i))} · ${await fieldValue(types.nth(i))}`));
      rows.push(cmp('จำนวนรหัส (Visit มี 1 รหัส)', '1', String(n)));
      r.note('TC-007 รหัสใน Visit', `${c.info.dx} (Physician Note) · Disposition เพิ่มรหัสที่ 2 ไม่ได้บน Prod`);
      await compare(page, 'TC-007 การวินิจฉัย: Visit (K30) vs ฟอร์ม', ['Expected (Visit)', 'ฟอร์ม Refer Out'], rows, 'bottom');
      await markEvidence(expected(card, 'K30 · Principal diagnosis (PP)'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-042 ไม่อนุมัติโดยไม่ใส่เหตุผล
    await startClip(page, tcId(42));
    await r.soft(`${TC(42)} ไม่อนุมัติโดยไม่ใส่เหตุผล → บันทึกไม่ได้ สถานะยังรอตรวจสอบ`, async () => {
      await hideCompareTable(page);
      await page.mouse.wheel(0, -20_000);
      const reject = reviewButton(page, 'ไม่อนุมัติ');
      await markEvidence(clicked(reject));
      await snapEvidence(page, 'TC-042 ก่อนกด ไม่อนุมัติ');
      await reject.click();
      const box = modal(page, 'ไม่อนุมัติใบส่งตัวนี้');
      await expect(box).toBeVisible();
      const ok = box.locator('.ant-modal-footer .ant-btn-primary, .ant-modal-footer .ant-btn-dangerous').last();
      const text = box.getByRole('textbox');
      await expect(ok).toBeDisabled();
      await expect(text).toHaveClass(/status-error/);
      await markEvidence(expected(text, 'เหตุผลว่าง = ช่องแดง'), expected(ok, 'ยืนยันไม่ได้'));
      await snapEvidence(page, 'TC-042 หน้าต่าง เหตุผลว่าง');
      await box.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.pending_review);
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'ยังเป็น รอตรวจสอบ'));
    });

    // TC-024 ไม่อนุมัติพร้อมเหตุผล
    await startClip(page, tcId(24));
    await r.soft(`${TC(24)} ไม่อนุมัติพร้อมเหตุผล → สถานะไม่อนุมัติ แสดงเหตุผล`, async () => {
      await reviewButton(page, 'ไม่อนุมัติ').click();
      const box = modal(page, 'ไม่อนุมัติใบส่งตัวนี้');
      await box.getByRole('textbox').fill(reason);
      const ok = box.locator('.ant-modal-footer .ant-btn-primary, .ant-modal-footer .ant-btn-dangerous').last();
      await markEvidence(filled(box.getByRole('textbox')), clicked(ok));
      await snapEvidence(page, 'TC-024 ก่อนกด ยืนยันไม่อนุมัติ');
      const done = referOutAction(page, c.vn, 'reject');
      await ok.click();
      expect((await done).status()).toBe(200);
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.rejected, { timeout: 30_000 });
      const shown = reviewCard(page).getByText(reason).first();
      await expect(shown).toBeVisible();
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'ไม่อนุมัติ'), expected(shown, 'เหตุผลที่กรอก'));
    });

    // TC-025 ไม่ได้เลข
    await startClip(page, tcId(25));
    await r.soft(`${TC(25)} คำขอที่ไม่อนุมัติไม่มีเลขที่ส่งต่อ`, async () => {
      const d = await fetchDetail(page, auth(), c.vn);
      r.note('TC-025 API', JSON.stringify({ status: d.status, referOutNo: d.referOutNo, number: d.number ?? null }));
      expect(d.referOutNo ?? null).toBeNull();
      expect(await headerValue(page, 'เลขที่ส่งต่อ')).toBe('-');
      await markEvidence(expected(headerItem(page, 'เลขที่ส่งต่อ'), 'ไม่มีเลข (-)'), expected(headerItem(page, 'สถานะ'), 'ไม่อนุมัติ'));
    });

    // TC-028 แผงฝั่ง ER (บัญชี Nurse)
    await r.soft(`${TC(28)} หน้า Disposition ของ ER แสดงไม่อนุมัติ · เหตุผล · ให้เปลี่ยนเป็น Discharge with approval (หน้าต่าง Nurse)`, async () => {
      const nurse = await openPatientAs(browser, 'Nurse', c.hn, c);
      const rn = makeRunner(nurse);
      try {
        await gotoDisposition(nurse, c);
        await rn.soft(`${TC(28)} หน้าต่าง Nurse`, async () => {
          const p = erReferOutPanel(nurse);
          await expect(p).toBeVisible({ timeout: 60_000 });
          await p.scrollIntoViewIfNeeded();
          await expect(p).toContainText(STATUS_TEXT.rejected);
          await expect(p).toContainText(reason);
          const hint = p.getByText(/จำหน่ายโดยแพทย์อนุมัติ|Discharge with approval|With Approval/).first();
          await expect(hint).toBeVisible();
          await markEvidence(expected(p, 'ไม่อนุมัติ + เหตุผล'), expected(hint, 'ให้เปลี่ยนการจำหน่าย'));
        });
        rn.finish();
      } finally {
        await nurse.context().close();
      }
    });

    // TC-052 ลงนาม Disposition ส่งต่อใหม่ → กลับเข้า Worklist เป็นรอตรวจสอบ
    await startClip(page, tcId(52));
    await r.soft(`${TC(52)} ลงนาม Disposition ส่งต่อใหม่หลังไม่อนุมัติ → คำขอใหม่ รอตรวจสอบ`, async () => {
      await gotoDisposition(page, c);
      await reopenDisposition(page);
      const main = page.getByRole('main');
      await expect(main.getByRole('radio', { name: 'By Transfer', exact: true })).toBeChecked();
      const signed = await signDisposition(page);
      r.note('TC-052 ลงนามใหม่', String(signed.completedAt));
      await gotoWorklist(page);
      const row = worklistRow(page, c.hn);
      await expect(row).toContainText(STATUS_TEXT.pending_review, { timeout: 30_000 });
      const item = await fetchListItem(page, auth(), c.vn);
      r.note('TC-052 แถวใหม่ (API)', JSON.stringify({ requestId: item?.requestId, status: item?.status, signedAt: item?.signedAt }));
      await markEvidence(expected(row, `รอตรวจสอบ · ลงนามใหม่ ${thaiDateTime(item!.signedAt)}`));
    });
    await startClip(page, 'after');
    r.finish();
  });

  // ---------- ผู้ป่วย ER-D: ยกเลิกอนุมัติ · แก้ Disposition หลังอนุมัติ ----------
  test('ER-D ยกเลิกอนุมัติ · Disposition เปลี่ยนหลังอนุมัติ → ส่งไม่ได้ (TC-029 050 051)', meta('D1', 29, 50, 51), async ({ page }) => {
    test.setTimeout(30 * 60_000);
    let d = requireState('D', 'dispose');
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    await gotoRequest(page, d.vn, { open: true });

    const approve = async (tag: string) => {
      const done = referOutAction(page, d.vn, 'approve');
      await reviewButton(page, 'อนุมัติ').click();
      await confirmIfAsked(page);
      expect((await done).status()).toBe(200);
      const box = modal(page, 'อนุมัติแล้ว');
      await expect(box).toBeVisible({ timeout: 30_000 });
      const no = norm(await box.innerText()).match(/\d{4}\/\d{2}/)?.[0] ?? '';
      d = { ...d, info: { ...d.info, [tag]: no } };
      saveState('D', d);
      await box.getByRole('button', { name: 'เสร็จสิ้น' }).click();
      return no;
    };

    // TC-029 ยกเลิกการอนุมัติก่อนส่ง
    await startClip(page, tcId(29));
    await r.soft(`${TC(29)} ยกเลิกการอนุมัติ → เตือนว่าเลขจะถูกยกเลิก → กลับเป็นรอตรวจสอบ`, async () => {
      const no = d.info.numberD1 || (await approve('numberD1'));
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.approved);
      const undo = reviewButton(page, 'ยกเลิกการอนุมัติ');
      await markEvidence(expected(headerItem(page, 'เลขที่ส่งต่อ'), `อนุมัติแล้ว ${no}`), clicked(undo));
      await snapEvidence(page, 'TC-029 ก่อนกด ยกเลิกการอนุมัติ');
      await undo.click();
      const box = modal(page, 'ยกเลิกการอนุมัติ');
      const warn = box.getByText(/จะถูกยกเลิกและใช้ซ้ำไม่ได้/);
      await expect(warn).toBeVisible();
      await box.getByRole('textbox').fill('ทดสอบ SBH-1016 TC-029 ยกเลิกการอนุมัติ');
      const ok = box.locator('.ant-modal-footer .ant-btn-primary, .ant-modal-footer .ant-btn-dangerous').last();
      await markEvidence(alerted(warn, `เลข ${no} จะถูกยกเลิก`), filled(box.getByRole('textbox')), clicked(ok));
      await snapEvidence(page, 'TC-029 หน้าต่างยืนยัน');
      const done = referOutAction(page, d.vn, 'undo-approval');
      await ok.click();
      expect((await done).status()).toBe(200);
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.pending_review, { timeout: 30_000 });
      const api = await fetchDetail(page, auth(), d.vn);
      r.note('TC-029 หลังยกเลิกอนุมัติ', JSON.stringify({ status: api.status, referOutNo: api.referOutNo, number: api.number ?? null }));
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'กลับเป็น รอตรวจสอบ'), expected(headerItem(page, 'เลขที่ส่งต่อ'), 'ไม่มีเลข'));
    });

    // TC-050 อนุมัติแล้วแพทย์เปิดแก้ Disposition เปลี่ยนปลายทาง → ผลการจำหน่ายเปลี่ยน
    let newHospital = '';
    await startClip(page, tcId(50));
    await r.soft(`${TC(50)} อนุมัติ → แพทย์เปิดแก้ Disposition เปลี่ยนปลายทาง ลงนามใหม่ → คำขอแสดง ผลการจำหน่ายเปลี่ยน`, async () => {
      await gotoRequest(page, d.vn);
      if ((await fetchDetail(page, auth(), d.vn)).status === 'pending_review') await approve('numberD2');
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.approved);
      await markEvidence(expected(headerItem(page, 'สถานะ'), `อนุมัติแล้ว ${d.info.numberD2}`));
      await snapEvidence(page, 'TC-050 อนุมัติแล้ว');
      await gotoDisposition(page, d);
      await reopenDisposition(page);
      newHospital = await chooseReferHospital(page, ['โรงพยาบาลเสาไห้', 'เสาไห้', 'โรงพยาบาลแก่งคอย']);
      await markEvidence(filled(page.getByRole('main').getByText('โรงพยาบาลปลายทาง', { exact: true }).first().locator('xpath=following::*[contains(@class,"ant-select")][1]'), newHospital));
      await snapEvidence(page, 'TC-050 เปลี่ยนปลายทางก่อนลงนามใหม่');
      await signDisposition(page);
      d = { ...d, info: { ...d.info, hospital2: newHospital } };
      saveState('D', d);
      await gotoRequest(page, d.vn);
      const status = headerItem(page, 'สถานะ');
      await expect(page.getByRole('main').getByText(/ผลการจำหน่ายเปลี่ยน|ข้อมูลต้นทางเปลี่ยนไป/).first()).toBeVisible({ timeout: 30_000 });
      const api = await fetchDetail(page, auth(), d.vn);
      r.note('TC-050 API', JSON.stringify({ status: api.status, sourceChanged: api.sourceChanged, reasons: (api as unknown as { sourceChangeReasons?: string[] }).sourceChangeReasons }));
      expect(api.sourceChanged).toBe(true);
      const changed = page.getByRole('main').getByText(/ผลการจำหน่ายเปลี่ยน|ข้อมูลต้นทางเปลี่ยนไป/).first();
      await markEvidence(expected(changed, 'ผลการจำหน่ายเปลี่ยน'), expected(status, 'สถานะคำขอ'));
    });

    // TC-051 ส่งไม่ได้
    await startClip(page, tcId(51));
    await r.soft(`${TC(51)} Disposition เปลี่ยนหลังอนุมัติ → ส่งไม่ได้จนกว่าจะพิจารณาใหม่`, async () => {
      const send = page.getByTestId('refer-out-submission-panel').getByRole('button', { name: 'ส่งไปยัง MoPH' });
      const n = await send.count();
      const enabled = n ? await send.isEnabled() : false;
      r.note('TC-051 ปุ่มส่ง', n ? (enabled ? 'มี · กดได้' : 'มี · กดไม่ได้') : 'ไม่มี');
      expect(enabled, 'ต้องกดส่งไม่ได้').toBe(false);
      const hint = page.getByRole('main').getByText(/ยกเลิกการอนุมัติก่อน|รับทราบการเปลี่ยนแปลง|การจำหน่ายเปลี่ยนไปหลังอนุมัติ/).first();
      await markEvidence(...(n ? [expected(send, 'ส่งไม่ได้')] : [expected(reviewCard(page), 'ไม่มีปุ่มส่ง')]), ...((await hint.count()) ? [expected(hint, 'ต้องพิจารณาใหม่')] : []));
    });
    await startClip(page, 'after');
    r.finish();
  });

  // ---------- ผู้ป่วย ER-E: ไม่ระบุปลายทาง ----------
  test('ER-E ไม่ระบุปลายทาง → ไม่อยู่ใน Worklist (TC-049)', meta('E1', 49), async ({ page }) => {
    test.setTimeout(10 * 60_000);
    const e = requireState('E', 'dispose');
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    await gotoWorklist(page);
    await startClip(page, tcId(49));
    await r.soft(`${TC(49)} ER By Transfer ไม่ระบุปลายทาง (ลงนามแล้ว) ไม่มีแถวใน Worklist`, async () => {
      await expect(page.getByRole('main').getByRole('row').filter({ hasText: e.hn })).toHaveCount(0);
      const item = await fetchListItem(page, auth(), e.vn);
      r.note('TC-049 API list', item ? JSON.stringify(item) : 'ไม่มี VN นี้ในรายการ');
      expect(item).toBeUndefined();
      await markEvidence(expected(page.getByRole('main').locator('.ant-table').first(), `ไม่มีแถว HN ${e.hn} (ลงนาม ${thaiDateTime(e.info.signedAt)})`));
    });
    await startClip(page, 'after');
    r.finish();
  });

  // ---------- ผู้ป่วย ER-A: กดส่ง 2 ครั้งติดกัน ----------
  test('ER-A กดส่ง 2 ครั้งติดกัน → Refer ID เดียว (TC-053)', meta('A5', 53), async ({ page }) => {
    test.setTimeout(15 * 60_000);
    let a = requireState('A', 'dispose');
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    const sends: string[] = [];
    page.on('response', async (x) => {
      if (x.request().method() === 'POST' && /\/by-vn\/[^/]+\/(send|resend)$/.test(x.url())) sends.push(`${x.status()}`);
    });
    await gotoRequest(page, a.vn, { open: true });
    expect((await fetchDetail(page, auth(), a.vn)).status, 'ต้องอนุมัติใหม่แล้ว (TC-031)').toBe('approved');
    await startClip(page, tcId(53));
    await r.soft(`${TC(53)} ดับเบิลคลิกส่ง → POST ส่งจริง 1 ครั้ง · Refer ID เดียว`, async () => {
      await completeForm(page);
      await runCheck(page, a.vn);
      await page.mouse.wheel(0, -20_000);
      const send = page.getByTestId('refer-out-submission-panel').getByRole('button', { name: 'ส่งไปยัง MoPH' });
      await expect(send).toBeEnabled({ timeout: 30_000 });
      await markEvidence(clicked(send));
      await snapEvidence(page, 'TC-053 ก่อนกด ส่ง');
      // รอบแรก (22:20): ดับเบิลคลิกที่ปุ่มส่ง = คลิกแรกเปิดหน้าต่างยืนยัน คลิกที่ 2 โดนพื้นหลังหน้าต่างปิด ไม่มีคำสั่งส่ง → คำสั่งส่งจริงยิงจากปุ่มยืนยัน จึงดับเบิลคลิกที่ปุ่มยืนยัน
      r.note('TC-053 วิธีกด', 'ปุ่ม ส่งไปยัง MoPH เปิดหน้าต่างยืนยันก่อน · ดับเบิลคลิกที่ปุ่มส่ง = หน้าต่างเปิดแล้วปิด (ไม่ส่ง) · รอบนี้คลิกปุ่มส่ง 1 ครั้ง แล้วดับเบิลคลิกปุ่มยืนยัน');
      await send.click();
      const confirm = modal(page, 'ส่งใบส่งตัวเลขที่');
      await expect(confirm).toBeVisible();
      await markEvidence(clicked(confirm.locator('.ant-btn-primary'), 'ดับเบิลคลิก'));
      await snapEvidence(page, 'TC-053 หน้าต่างยืนยัน');
      await confirm.locator('.ant-btn-primary').dblclick();
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.sent, { timeout: 90_000 });
      await page.waitForTimeout(3_000);
      const api = await fetchDetail(page, auth(), a.vn);
      r.note('TC-053 POST ส่ง', `${sends.length} ครั้ง (${sends.join(', ')})`);
      r.note('TC-053 หลังส่ง', JSON.stringify({ status: api.status, referOutNo: api.referOutNo, submission: api.submission }));
      a = { ...a, info: { ...a.info, referId2: api.submission?.referId ?? '', sentNumber2: api.referOutNo ?? '' } };
      saveState('A', a);
      expect(api.submission?.referId ?? '').toMatch(/^UAT/);
      expect(sends.filter((s) => s === '200').length, 'POST ส่งที่สำเร็จต้องมีครั้งเดียว').toBe(1);
      const sentEvents = (api.events ?? []).filter((e) => e.action === 'send' && (e.createdAt ?? '') > (a.info.number2At ?? '2026-11-03T15:00'));
      r.note('TC-053 event send หลังอนุมัติใหม่', String(sentEvents.length));
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'ส่งแล้ว'), expected(page.getByTestId('refer-out-submission-panel').getByText(api.submission!.referId!).first(), `Refer ID เดียว ${api.submission!.referId}`));
    });
    await startClip(page, 'after');
    r.finish();
  });
// ---------- ผู้ป่วย OPD-B: Worklist · อนุมัติไม่ได้ถ้ายังไม่มีปลายทาง · เลือกปลายทาง · ความเร่งด่วน · ส่ง ----------
  test('OPD-B: Worklist · อนุมัติไม่ได้ก่อนเลือกปลายทาง · เลือกปลายทาง · ความเร่งด่วนบังคับ · ส่ง MoPH (TC-002 043 016 034 022)', meta('B1', 2, 43, 16, 34, 22), async ({ page }) => {
    test.setTimeout(30 * 60_000);
    let b = requireState('B', 'dispose');
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    const panel = () => page.getByTestId('refer-out-submission-panel');
    await gotoWorklist(page);
    const row = worklistRow(page, b.hn);

    // TC-002 แถว OPD
    await startClip(page, tcId(2));
    await r.soft(`${TC(2)} แถวผู้ป่วย B แหล่ง OPD สถานะรอตรวจสอบ ปลายทางรอเลือก`, async () => {
      await expect(row).toBeVisible({ timeout: 60_000 });
      const cells = await rowCells(row);
      const rows = [
        cmp('HN / VN', `${b.hn} ${b.vn}`, cells[1] ?? ''),
        cmp('ต้นทาง (แหล่ง)', 'OPD', cells[2] ?? ''),
        cmp('สถานะ', STATUS_TEXT.pending_review, cells[6] ?? ''),
        cmp('โรงพยาบาลปลายทาง', 'รอเลือกปลายทาง', cells[4] ?? ''),
      ];
      await compare(page, 'TC-002 แถว OPD ใน Worklist', ['Expected', 'จริง (Worklist)'], rows);
      await markEvidence(expected(row, 'OPD · รอตรวจสอบ · รอเลือกปลายทาง'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-043 อนุมัติไม่ได้เมื่อยังไม่เลือกปลายทาง
    await hideCompareTable(page);
    await gotoRequest(page, b.vn, { open: true });
    await startClip(page, tcId(43));
    await r.soft(`${TC(43)} ยังไม่เลือกปลายทาง → อนุมัติไม่ได้ แจ้งให้เลือกปลายทางก่อน`, async () => {
      const approve = reviewButton(page, 'อนุมัติ');
      const hint = reviewCard(page).getByText('เลือกโรงพยาบาลปลายทางก่อนอนุมัติ');
      await expect(hint).toBeVisible({ timeout: 30_000 });
      const disabled = await approve.isDisabled().catch(() => true);
      r.note('TC-043 ปุ่มอนุมัติ', disabled ? 'กดไม่ได้' : 'กดได้');
      if (!disabled) {
        const res = page.waitForResponse((x) => x.request().method() === 'POST' && x.url().includes(`/by-vn/${b.vn}/approve`), { timeout: 15_000 }).catch(() => null);
        await approve.click();
        const done = await res;
        r.note('TC-043 POST approve', done ? String(done.status()) : 'ไม่มีคำสั่งส่งออก');
        expect(done?.status() ?? 400, 'ระบบต้องไม่อนุมัติ').not.toBe(200);
      }
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.pending_review);
      await markEvidence(expected(approve, disabled ? 'อนุมัติไม่ได้ (ปุ่มปิด)' : 'อนุมัติไม่ได้'), alerted(hint, 'ให้เลือกปลายทางก่อน'));
    });

    // TC-016 เลือกปลายทาง
    await startClip(page, tcId(16));
    let destination = '';
    await r.soft(`${TC(16)} เลือกโรงพยาบาลปลายทาง → แสดงทั้งในคำขอและ Worklist`, async () => {
      const search = reviewCard(page).getByPlaceholder('ค้นหาชื่อหรือรหัสโรงพยาบาล');
      await search.click();
      await search.fill('โรงพยาบาลพระพุทธบาท');
      const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'โรงพยาบาลพระพุทธบาท' }).first();
      await expect(option).toBeVisible({ timeout: 20_000 });
      destination = norm(await option.innerText());
      await option.click();
      const set = reviewCard(page).getByRole('button', { name: 'กำหนดปลายทาง' });
      await markEvidence(filled(search, destination), clicked(set));
      await snapEvidence(page, 'TC-016 ก่อนกด กำหนดปลายทาง');
      const done = referOutAction(page, b.vn, 'destination');
      await set.click();
      expect((await done).status()).toBe(200);
      await expect(headerItem(page, 'โรงพยาบาลปลายทาง')).toContainText('พระพุทธบาท', { timeout: 30_000 });
      b = { ...b, info: { ...b.info, destination } };
      saveState('B', b);
      await markEvidence(expected(headerItem(page, 'โรงพยาบาลปลายทาง'), 'ปลายทางที่เลือก'));
      await snapEvidence(page, 'TC-016 คำขอ');
      await gotoWorklist(page);
      await expect(worklistRow(page, b.hn)).toContainText('พระพุทธบาท');
      await markEvidence(expected(worklistRow(page, b.hn), 'Worklist: ปลายทางที่เลือก'));
    });

    // อนุมัติ (ขั้นของ TC-022)
    await test.step('อนุมัติคำขอ OPD (ขั้น 2 ของ TC-022)', async () => {
      await gotoRequest(page, b.vn);
      if ((await fetchDetail(page, auth(), b.vn)).status !== 'pending_review') return;
      const done = referOutAction(page, b.vn, 'approve');
      await reviewButton(page, 'อนุมัติ').click();
      await confirmIfAsked(page);
      expect((await done).status()).toBe(200);
      const box = modal(page, 'อนุมัติแล้ว');
      await expect(box).toBeVisible({ timeout: 30_000 });
      b = { ...b, info: { ...b.info, numberB: norm(await box.innerText()).match(/\d{4}\/\d{2}/)?.[0] ?? '' } };
      saveState('B', b);
      await box.getByRole('button', { name: 'เสร็จสิ้น' }).click();
    });

    // TC-034 ความเร่งด่วนของ OPD ต้องเลือก
    await startClip(page, tcId(34));
    await r.soft(`${TC(34)} OPD ไม่เลือกความเร่งด่วน → ส่งไม่ได้ ช่องแจ้งให้เลือก`, async () => {
      await completeForm(page);
      const urgency = formItem(page, 'ความเร่งด่วน');
      await urgency.scrollIntoViewIfNeeded();
      const before = await fieldValue(urgency);
      r.note('TC-034 ความเร่งด่วนที่เติมให้ (OPD)', before || '(ว่าง)');
      if (before) await clearSelect(page, urgency);
      await markEvidence(filled(urgency, '(ไม่เลือก)'), clicked(checkButton(page)));
      await snapEvidence(page, 'TC-034 ก่อนกด ตรวจสอบ');
      await runCheck(page, b.vn);
      const explain = urgency.locator('.ant-form-item-explain');
      await urgency.scrollIntoViewIfNeeded();
      await expect(explain).toContainText('เลือกความเร่งด่วน', { timeout: 20_000 });
      await markEvidence(alerted(explain, 'เลือกความเร่งด่วน'));
      await snapEvidence(page, 'TC-034 ช่องแจ้งเตือน');
      await page.mouse.wheel(0, -20_000);
      await expect(panel().getByRole('button', { name: 'ส่งไปยัง MoPH' })).toBeDisabled();
      await markEvidence(expected(panel().getByRole('button', { name: 'ส่งไปยัง MoPH' }), 'ส่งไม่ได้ (ปุ่มปิด)'), expected(validationList(page), 'เลือกความเร่งด่วน'));
    });

    // TC-022 ส่ง OPD
    await startClip(page, tcId(22));
    await r.soft(`${TC(22)} ส่ง MoPH ของ OPD สำเร็จ → ส่งแล้ว · Refer ID · ปลายทางที่ศูนย์ Refer เลือก`, async () => {
      await completeForm(page, { urgency: 'Urgent' });
      await runCheck(page, b.vn);
      await page.mouse.wheel(0, -20_000);
      const send = panel().getByRole('button', { name: 'ส่งไปยัง MoPH' });
      await expect(send).toBeEnabled({ timeout: 30_000 });
      await markEvidence(clicked(send), expected(headerItem(page, 'โรงพยาบาลปลายทาง'), 'ปลายทางที่เลือก'));
      await snapEvidence(page, 'TC-022 ก่อนกด ส่ง');
      await send.click();
      const confirm = modal(page, 'ส่งใบส่งตัวเลขที่');
      await expect(confirm).toBeVisible();
      await markEvidence(alerted(confirm, 'ยืนยันการส่ง'), clicked(confirm.locator('.ant-btn-primary')));
      await snapEvidence(page, 'TC-022 หน้าต่างยืนยัน');
      const sent = referOutAction(page, b.vn, 'send', 120_000);
      await confirm.locator('.ant-btn-primary').click();
      const res = await sent;
      expect(res.status()).toBe(200);
      await page.waitForTimeout(3_000);
      let d = await fetchDetail(page, auth(), b.vn);
      if (d.submissionState === 'failed') {
        // เลขซ้ำใน MoPH UAT (แบบ ER-A) → ระบบออกเลขใหม่ · ส่งซ้ำ 1 ครั้ง
        r.note('TC-022 ส่งครั้งแรก', JSON.stringify(d.lastAttempt));
        await snapEvidence(page, 'TC-022 ส่งครั้งแรก ไม่สำเร็จ');
        const resend = panel().getByRole('button', { name: 'แก้ไขและส่งซ้ำ' });
        await resend.click();
        const again = modal(page, /ส่งใบส่งตัวเลขที่|ส่งไปยัง MoPH/);
        if (await again.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await again.locator('.ant-btn-primary').click();
        await page.waitForTimeout(5_000);
        d = await fetchDetail(page, auth(), b.vn);
      }
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.sent, { timeout: 90_000 });
      r.note('TC-022 หลังส่ง', JSON.stringify({ status: d.status, referOutNo: d.referOutNo, destination: d.destinationName, submission: d.submission }));
      const referId = d.submission?.referId ?? '';
      b = { ...b, info: { ...b.info, referIdB: referId, sentNumberB: d.referOutNo ?? '' } };
      saveState('B', b);
      expect(referId).toMatch(/^UAT/);
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'ส่งแล้ว'), expected(panel().getByText(referId).first(), `Refer ID ${referId}`), expected(headerItem(page, 'โรงพยาบาลปลายทาง'), 'ปลายทางที่ศูนย์ Refer เลือก'));
    });
    await startClip(page, 'after');
    r.finish();
  });
// ---------- ผู้ป่วย OPD-B: ส่ง MoPH (รอบ 2 — รอบแรกฟอร์มขาดการวินิจฉัยเบื้องต้น) ----------
  test('OPD-B ส่ง MoPH (TC-022)', meta('B2', 22), async ({ page }) => {
    test.setTimeout(20 * 60_000);
    let b = requireState('B', 'dispose');
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    const panel = () => page.getByTestId('refer-out-submission-panel');
    await gotoRequest(page, b.vn, { open: true });
    expect((await fetchDetail(page, auth(), b.vn)).status, 'ต้องอนุมัติแล้ว').toBe('approved');
    // TC-022 ส่ง OPD
    await startClip(page, tcId(22));
    await r.soft(`${TC(22)} ส่ง MoPH ของ OPD สำเร็จ → ส่งแล้ว · Refer ID · ปลายทางที่ศูนย์ Refer เลือก`, async () => {
      await completeForm(page, { urgency: 'Urgent' });
      // Visit OPD ของ B ไม่มีรหัสวินิจฉัย → ศูนย์ Refer กรอกการวินิจฉัยเบื้องต้นเอง (ช่องบังคับ)
      const initial = formItem(page, 'การวินิจฉัยเบื้องต้น');
      if (!(await fieldValue(initial))) {
        await initial.scrollIntoViewIfNeeded();
        await initial.locator('textarea').fill('K30 Functional dyspepsia (ศูนย์ Refer กรอก — Visit OPD ไม่มีรหัสวินิจฉัย)');
        await markEvidence(filled(initial, 'การวินิจฉัยเบื้องต้น'));
        await snapEvidence(page, 'TC-022 กรอกการวินิจฉัยเบื้องต้น');
      }
      await runCheck(page, b.vn);
      await page.mouse.wheel(0, -20_000);
      const send = panel().getByRole('button', { name: 'ส่งไปยัง MoPH' });
      await expect(send).toBeEnabled({ timeout: 30_000 });
      await markEvidence(clicked(send), expected(headerItem(page, 'โรงพยาบาลปลายทาง'), 'ปลายทางที่เลือก'));
      await snapEvidence(page, 'TC-022 ก่อนกด ส่ง');
      await send.click();
      const confirm = modal(page, 'ส่งใบส่งตัวเลขที่');
      await expect(confirm).toBeVisible();
      await markEvidence(alerted(confirm, 'ยืนยันการส่ง'), clicked(confirm.locator('.ant-btn-primary')));
      await snapEvidence(page, 'TC-022 หน้าต่างยืนยัน');
      const sent = referOutAction(page, b.vn, 'send', 120_000);
      await confirm.locator('.ant-btn-primary').click();
      const res = await sent;
      expect(res.status()).toBe(200);
      await page.waitForTimeout(3_000);
      let d = await fetchDetail(page, auth(), b.vn);
      if (d.submissionState === 'failed') {
        // เลขซ้ำใน MoPH UAT (แบบ ER-A) → ระบบออกเลขใหม่ · ส่งซ้ำ 1 ครั้ง
        r.note('TC-022 ส่งครั้งแรก', JSON.stringify(d.lastAttempt));
        await snapEvidence(page, 'TC-022 ส่งครั้งแรก ไม่สำเร็จ');
        const resend = panel().getByRole('button', { name: 'แก้ไขและส่งซ้ำ' });
        await resend.click();
        const again = modal(page, /ส่งใบส่งตัวเลขที่|ส่งไปยัง MoPH/);
        if (await again.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await again.locator('.ant-btn-primary').click();
        await page.waitForTimeout(5_000);
        d = await fetchDetail(page, auth(), b.vn);
      }
      await expect(headerItem(page, 'สถานะ')).toContainText(STATUS_TEXT.sent, { timeout: 90_000 });
      r.note('TC-022 หลังส่ง', JSON.stringify({ status: d.status, referOutNo: d.referOutNo, destination: d.destinationName, submission: d.submission }));
      const referId = d.submission?.referId ?? '';
      b = { ...b, info: { ...b.info, referIdB: referId, sentNumberB: d.referOutNo ?? '' } };
      saveState('B', b);
      expect(referId).toMatch(/^UAT/);
      await markEvidence(expected(headerItem(page, 'สถานะ'), 'ส่งแล้ว'), expected(panel().getByText(referId).first(), `Refer ID ${referId}`), expected(headerItem(page, 'โรงพยาบาลปลายทาง'), 'ปลายทางที่ศูนย์ Refer เลือก'));
    });
    await startClip(page, 'after');
    r.finish();
  });
// ---------- ผู้ป่วย OPD-B: แผงสถานะฝั่ง OPD (ฟอร์มจำหน่ายของ Visit — ไม่ใช่เมนูด้านข้าง) ----------
  test('OPD-B แผงสถานะ Refer Out ฝั่ง OPD หลังส่ง (TC-027)', meta('B3', 27), async ({ page, browser }) => {
    test.setTimeout(15 * 60_000);
    const b = requireState('B', 'dispose');
    const r = makeRunner(page);
    await r.soft(`${TC(27)} ฝั่ง OPD แสดง ส่งแล้ว · Refer ID · เลขที่ส่งต่อ ตรงกับศูนย์ Refer (หน้าต่าง Nurse)`, async () => {
      const nurse = await openAs(browser, 'Nurse', `/cortex/next/patients/${b.hn}?en=${b.en}&vn=${b.vn}&actions=dischargeForm`);
      const rn = makeRunner(nurse);
      try {
        await rn.soft(`${TC(27)} หน้าต่าง Nurse`, async () => {
          const p = nurse.getByTestId('refer-out-status-panel');
          await expect(p).toBeVisible({ timeout: 120_000 });
          await p.scrollIntoViewIfNeeded();
          await expect(p).toContainText(STATUS_TEXT.sent);
          await expect(p).toContainText(b.info.referIdB);
          await expect(p).toContainText(b.info.sentNumberB);
          r.note('TC-027 ตำแหน่งแผง', 'ฟอร์มจำหน่ายของ Visit OPD (actions=dischargeForm) — ไม่มีรายการ Refer Out ในเมนูด้านข้างผู้ป่วย');
          await markEvidence(expected(p, `ส่งแล้ว · ${b.info.referIdB} · ${b.info.sentNumberB} ตรงกับศูนย์ Refer`));
        });
        rn.finish();
      } finally {
        await nurse.context().close();
      }
    });
    r.finish();
  });
// ---------- ปิด Visit ผู้ป่วยทั้ง 5 รายที่การเงิน (ผู้ใช้สั่ง "สร้าง 5 ราย แล้วปิด Visit" — R106) ----------
  test('ปิด Visit ผู้ป่วย A B C D E ที่การเงิน', { tag: ['@SBH-1016', '@SBH-1016-CLOSE'] }, async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const state = readState();
    const results: string[] = [];
    for (const key of ['A', 'B', 'C', 'D', 'E']) {
      const s = state[key];
      if (!s?.vn) continue;
      await test.step(`ปิด Visit ${key} HN ${s.hn} ${s.vn}`, async () => {
        const closed = await closeVisitAtCashier(page, s.hn, s.vn);
        results.push(`${key} HN ${s.hn} ${s.vn}: ${JSON.stringify(closed)}`);
        console.log(`  ✓ ปิด Visit ${key} HN ${s.hn} ${s.vn} ${JSON.stringify(closed)}`);
      });
    }
    test.info().annotations.push({ type: 'ปิด Visit', description: results.join(' ‖ ') });
  });
// ---------- ถ่ายใหม่แบบอ่านอย่างเดียว (หลัง Sub Agent ตรวจหลักฐาน 3 พ.ย. 2026): TC-003 ป้ายทับหัวคอลัมน์ · TC-023 ป้ายค่าว่าง ----------
  test('ถ่ายใหม่ TC-003 (คอลัมน์ Worklist) + TC-023 (รีเฟรชสถานะ MoPH) — อ่านอย่างเดียว', meta('RE1', 3, 23), async ({ page }) => {
    test.setTimeout(15 * 60_000);
    const a = requireState('A', 'dispose');
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    await gotoWorklist(page);
    const item = await fetchListItem(page, auth(), a.vn);
    const row = worklistRow(page, a.hn);
    await expect(row).toBeVisible({ timeout: 60_000 });

    await startClip(page, tcId(3));
    await r.soft(`${TC(3)} คอลัมน์ Worklist + ค่าในแถวผู้ป่วย A (ถ่ายใหม่)`, async () => {
      const headers = (await worklistHeader(page).locator('th').allInnerTexts()).map(norm).filter(Boolean);
      const want = ['ผู้ป่วย', 'HN / VN', 'ต้นทาง', 'เวลาลงนาม', 'โรงพยาบาลปลายทาง', 'แพทย์ผู้ลงนาม', 'สถานะ'];
      const cells = await rowCells(row);
      const rows = [
        ...want.map((h) => cmp(`คอลัมน์ ${h}`, 'มี', headers.includes(h) ? 'มี' : 'ไม่มี')),
        cmp('ค่า ผู้ป่วย', item!.patientName, cells[0] ?? '', (cells[0] ?? '').includes(item!.patientName)),
        cmp('ค่า HN / VN', `${a.hn} ${a.vn}`, cells[1] ?? ''),
        cmp('ค่า ต้นทาง', 'ER', cells[2] ?? ''),
        cmp('ค่า เวลาลงนาม', thaiDateTime(item!.signedAt), cells[3] ?? ''),
        cmp('ค่า โรงพยาบาลปลายทาง', `${item!.destinationName} ${item!.destinationHcode}`, cells[4] ?? ''),
        cmp('ค่า แพทย์ผู้ลงนาม', item!.summarizedByName, cells[5] ?? ''),
      ];
      await compare(page, 'TC-003 คอลัมน์ / ค่าในแถว (Expected จาก Visit / Disposition)', ['Expected', 'จริง'], rows, 'bottom');
      // ป้ายอยู่ที่หัวตาราง · แถวผู้ป่วยตีกรอบอย่างเดียว (ป้ายเดิมทับหัวคอลัมน์ สถานะ / เลขที่ส่งต่อ)
      await markEvidence(expected(worklistHeader(page), 'คอลัมน์ครบ'), { target: row });
      expect(bad(rows)).toEqual([]);
    });

    await hideCompareTable(page);
    await gotoRequest(page, a.vn);
    const panel = page.getByTestId('refer-out-submission-panel');
    const value = (label: string) =>
      panel.locator('tr').filter({ has: page.locator('.ant-descriptions-item-label', { hasText: new RegExp(`^${label}$`) }) }).locator('.ant-descriptions-item-content').first();
    await startClip(page, tcId(23));
    await r.soft(`${TC(23)} กด รีเฟรช → แสดงสถานะล่าสุดจาก MoPH (ถ่ายใหม่)`, async () => {
      await expect(value('สถานะใน MoPH')).toBeVisible({ timeout: 30_000 });
      const before = norm(await value('เวลาที่อ่านสถานะ').innerText());
      const refresh = panel.getByRole('button', { name: /รีเฟรช/ });
      await markEvidence(clicked(refresh), expected(value('เวลาที่อ่านสถานะ'), `ก่อนกด ${before}`));
      await snapEvidence(page, 'TC-023 ก่อนกด รีเฟรช');
      await page.waitForTimeout(61_000 - (Date.now() % 60_000)); // ให้นาทีเปลี่ยน เวลาที่อ่านจะต่างจากก่อนกด
      await refresh.click();
      await expect.poll(async () => norm(await value('เวลาที่อ่านสถานะ').innerText()), { timeout: 60_000 }).not.toBe(before);
      const live = norm(await value('สถานะใน MoPH').innerText());
      const after = norm(await value('เวลาที่อ่านสถานะ').innerText());
      const d = await fetchDetail(page, auth(), a.vn);
      r.note('TC-023 liveStatus', JSON.stringify(d.liveStatus));
      expect(live).toMatch(/deliver|receive|ส่ง|รับ/i);
      await markEvidence(expected(value('สถานะใน MoPH'), `สถานะล่าสุดจาก MoPH: ${live}`), expected(value('เวลาที่อ่านสถานะ'), `อ่านใหม่ ${after}`));
    });
    await startClip(page, 'after');
    r.finish();
  });
});
