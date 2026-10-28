import { type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectVisitHeader, gotoErDashboard, openCarePanel, trackOpenedErVisits, visitHeaderMarks, type ErVisit } from '../../../helpers/functions/er';
import {
  chooseDispositionDiagnosis,
  closeDispositionHistory,
  closeDispositionHistoryForm,
  describeDispositionHistoryRow,
  dispositionHistoryButton,
  dispositionHistoryEntries,
  dispositionHistoryFormLink,
  dispositionHistoryTime,
  dispositionTextBoxes,
  expectedDispositionHistoryRow,
  fetchDispositionHistory,
  openDispositionHistory,
  openDispositionHistoryForm,
  readDispositionHistory,
  readDispositionHistoryForm,
  reopenDisposition,
  saveDispositionDraft,
  signDisposition,
  startDisposition,
  type DispositionHistoryRecord,
  type DispositionHistoryRow,
  type ErDischargeSummary,
} from '../../../helpers/functions/er-disposition';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, openPatientAs } from '../../../mock-data/uat-play';

// SBH-2528 [Bug][ER][Disposition] ดูประวัติ Disposition — หน้าต่าง "ฟอร์ม Disposition ย้อนหลัง (อ่านอย่างเดียว)" (ลิงก์ ดูฟอร์ม ใต้แต่ละรายการในประวัติ — ฟีเจอร์ของ SBH-2462)
//   บั๊ก 1: แถว "ฉบับที่" ข้ามเลข (เดิมใช้ snapshot.version — กดลงนาม = บันทึกร่างอัตโนมัติ + ลงนาม แล้วประวัติรวมเป็นรายการเดียว เลขจึงข้าม 1 ตัว)
//   บั๊ก 2: แถว "ผู้ลงนาม" / "วันที่" ว่าง (เดิมเป็นของการยืนยันการเสียชีวิต) — ตัวแก้ cortex-ui PR #2341 เพิ่มแถว ผู้ลงนาม / วันที่ลงนาม ของการลงนาม + เปลี่ยนชื่อแถวการเสียชีวิต
// แปลงจากชุด Manual: EXE SBH-3031 → TS-SBH-2528-HPY (SBH-3034) → TC-001–006 = SBH-3036 · 3039 · 3041 · 3044 · 3047 · 3050 · 3 เทสตามผู้ป่วย (R9):
//   1) ผู้ป่วยรายที่ 1: TC-001 (ร่าง → รอ > 30 วิ → ลงนาม · ฉบับที่ 1 2 3) → TC-004 (ผู้ลงนาม) → TC-005 (วันที่ลงนาม) → TC-002 (เปิดแก้ไข → ร่าง → ลงนาม · ฉบับที่ 4 5 6)
//   2) ผู้ป่วยรายที่ 2: TC-003 (เริ่มบันทึก → ลงนามทันที · ฉบับที่ 1 2)
//   3) ผู้ป่วยรายที่ 3: TC-006 (Super_User บันทึกฉบับร่าง → Doctor ลงนาม · ผู้ลงนาม = Doctor) — Doctor เปิดในหน้าต่างแยก (session ของตัวเอง) แทน Logout / Login · คลิป video-Doctor.webm
// ข้อควรรู้ (EXE): ผู้ใช้เดียวกันกด บันทึกฉบับร่าง แล้ว ลงนาม ภายใน 30 วินาที ระบบรวมเป็นรายการ ลงนาม เดียว → รอเกิน 30 วินาที (WAIT_BEFORE_SIGN)
// คลิป 1 ไฟล์ต่อ 1 TC (R61): startClip(page, 'TC-00x') ต้นช่วงของแต่ละ TC
// ข้อมูล: ผู้ป่วย AUTO ใหม่ทุกรอบ (R10) → เปิด Visit ER + Triage ESI 3 → ปิด Visit ที่การเงินท้ายเทส (afterEach — แบบเดียวกับ SBH-2462)
// ระบบ: dev-x เท่านั้น (SBH Prod ยังไม่ได้รับอนุญาตสำหรับการ์ดนี้ — R40): npx playwright test --headed --grep @SBH-2528

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC = { 1: 'TC-001 (SBH-3036)', 2: 'TC-002 (SBH-3039)', 3: 'TC-003 (SBH-3041)', 4: 'TC-004 (SBH-3044)', 5: 'TC-005 (SBH-3047)', 6: 'TC-006 (SBH-3050)' } as const;

/** วินาทีที่รอหลังบันทึกฉบับร่างก่อนกดลงนาม (Test Step: รอเกิน 30 วินาที · เผื่อนาฬิกาเครื่องกับระบบต่างกัน) */
const WAIT_BEFORE_SIGN = 35;
const DISPOSITION_PANEL = 'สรุปการจำหน่าย';
const NOT_RECORDED = 'ไม่ได้บันทึก';
/** รูปแบบวันเวลาในหน้าต่าง "DD/MM/พ.ศ., HH:mm" */
const THAI_DATE_TIME = /^\d{2}\/\d{2}\/25\d{2}, \d{2}:\d{2}$/;

/** ชื่อบัญชีที่ล็อกอิน (claim `name` / `preferred_username` ของ token ที่แอปใช้) — ไม่พิมพ์ token */
function account(authorization: string): { name: string; username: string } {
  const payload = JSON.parse(Buffer.from(authorization.split('.')[1] ?? '', 'base64url').toString('utf8') || '{}') as { name?: string; preferred_username?: string };
  return { name: payload.name ?? '', username: payload.preferred_username ?? '' };
}

/** ชื่อบัญชีที่มุมขวาบนของแอป (ไว้ตีกรอบ) — หาไม่เจอก็ไม่ตีกรอบ */
async function accountMarks(page: Page, name: string) {
  const label = page.getByText(name, { exact: true }).filter({ visible: true }).first();
  const box = await label.boundingBox().catch(() => null);
  return box && box.y < 40 ? [expected(label, `บัญชี ${name}`)] : [];
}

/** ค้างหน้าจอจนครบ `seconds` วินาทีนับจาก `since` พร้อมแถบนับถอยหลัง (ให้คนดูคลิปรู้ว่ากำลังรอตาม Test Step ไม่ใช่ระบบค้าง) */
async function waitSince(page: Page, since: number, seconds: number, reason: string) {
  const until = since + seconds * 1000;
  await page.evaluate(
    ({ until, reason }) => {
      const banner = document.createElement('div');
      banner.setAttribute('data-wait-banner', '');
      Object.assign(banner.style, { position: 'fixed', left: '50%', bottom: '28px', transform: 'translateX(-50%)', padding: '10px 18px', background: '#1f6f43', color: '#fff', font: '600 16px sans-serif', borderRadius: '6px', zIndex: '2147483000', pointerEvents: 'none' });
      const tick = () => (banner.textContent = `${reason} — เหลือ ${Math.max(0, Math.ceil((until - Date.now()) / 1000))} วินาที (แถบนี้สคริปต์ทดสอบสร้างขึ้น)`);
      tick();
      setInterval(tick, 500);
      document.body.appendChild(banner);
    },
    { until, reason },
  );
  await page.waitForFunction((at) => Date.now() >= at, until, { timeout: seconds * 1000 + 30_000, polling: 500 });
  await page.evaluate(() => document.querySelector('[data-wait-banner]')?.remove());
}

/** กรอกช่องบังคับของฟอร์ม Disposition (เริ่มบันทึกแล้ว): Improved + With Approval + ICD10 K30 + ช่องข้อความบังคับ 2 ช่อง — ยังไม่บันทึก */
async function fillDispositionForm(page: Page, text: string) {
  const main = page.getByRole('main');
  const status = main.getByRole('radio', { name: 'Improved', exact: true });
  const method = main.getByRole('radio', { name: 'With Approval', exact: true });
  await status.check();
  await method.check();
  const diagnosis = await chooseDispositionDiagnosis(page, 'K30');
  const { clinical, finding } = dispositionTextBoxes(page);
  await clinical.fill(text);
  await finding.fill(text);
  return { status: status.locator('xpath=ancestor::label[1]'), method: method.locator('xpath=ancestor::label[1]'), diagnosis, clinical, finding };
}

/** แถวของหน้าต่างฟอร์มย้อนหลังที่ชื่อช่องตรง `label` (ไว้ตีกรอบ) */
function formRow(dialog: Locator, label: string): Locator {
  const name = new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
  return dialog.locator('tr.ant-descriptions-row').filter({ has: dialog.page().locator('th').filter({ hasText: name }) }).first();
}

interface HistoryView {
  popover: Locator;
  rows: DispositionHistoryRow[];
  /** จาก API — ใหม่สุดก่อน (ลำดับเดียวกับ popover) */
  records: DispositionHistoryRecord[];
}

/** เปิด popover ประวัติ → อ่านรายการบนจอ + จาก API → ตารางเทียบทีละรายการ (ครึ่งซ้ายของจอ — popover อยู่ขวา) */
async function viewHistory(page: Page, authorization: () => string, visit: ErVisit, title: string, ordinals: string[]): Promise<HistoryView> {
  const popover = await openDispositionHistory(page);
  await expect(dispositionHistoryEntries(popover).first(), 'ประวัติต้องมีรายการ').toBeVisible();
  const rows = await readDispositionHistory(popover);
  const records = await fetchDispositionHistory(page, authorization, visit.en);
  await test.info().attach(`ประวัติ Disposition จาก API — ${visit.en}`, { body: JSON.stringify(records, null, 2), contentType: 'application/json' });
  const want = records.map(expectedDispositionHistoryRow);
  const table: CompareRow[] = Array.from({ length: Math.max(rows.length, want.length) }, (_, i) => {
    const values = [rows[i] ? describeDispositionHistoryRow(rows[i]) : '(ไม่มี)', want[i] ? `${describeDispositionHistoryRow(want[i])} · version ใน API ${records[i]?.snapshot?.version ?? '-'}` : '(ไม่มี)'];
    return { label: `รายการที่ ${i + 1} (ฉบับที่ควรเป็น ${ordinals[i] ?? '-'})`, values, same: !!rows[i] && !!want[i] && describeDispositionHistoryRow(rows[i]) === describeDispositionHistoryRow(want[i]) };
  });
  await showCompareTable(page, title, ['บนหน้าจอ (popover ประวัติ Disposition — ใหม่สุดอยู่บน)', 'API erDischargeSummaryHistory'], table, { side: 'left' });
  return { popover, rows, records };
}

/** รายการในประวัติของการกระทำ `action` ที่ใกล้เวลา `at` ที่สุด (คลาดได้ไม่เกิน 15 วินาที) · ไม่ให้ `at` = รายการเก่าสุดของ action นั้น */
function findEntry(view: HistoryView, action: string, at?: string | null) {
  let index = -1;
  if (at) {
    let best = 15_000;
    view.records.forEach((record, i) => {
      const gap = Math.abs(Date.parse(record.occurredAt) - Date.parse(at));
      if (record.action === action && gap < best) [best, index] = [gap, i];
    });
  } else {
    index = view.records.map((record) => record.action).lastIndexOf(action);
  }
  return { index, record: view.records[index], row: view.rows[index], entry: dispositionHistoryEntries(view.popover).nth(Math.max(index, 0)) };
}
type Found = ReturnType<typeof findEntry>;

/** รายการ เปิดแก้ไข ของการกดในขั้นนี้ (เวลาที่จดได้อาจเป็นเวลาเครื่อง ไม่ใช่ของระบบ — หาตามเวลาไม่เจอใช้รายการ เปิดแก้ไข ที่มีอยู่) */
function reopenedEntry(view: HistoryView, at: string): Found {
  const found = findEntry(view, 'REOPENED', at);
  return found.index >= 0 ? found : findEntry(view, 'REOPENED');
}

interface FormCheck {
  label: string;
  want: string;
  /** ตรงตาม Expected ไหม (ตั้งต้น = ค่าที่หน้าต่างแสดงเท่ากับ want) */
  pass?: (shown: string | undefined) => boolean;
  /** แสดงในตารางเทียบเป็นข้อมูลประกอบเท่านั้น (ไม่ตัดสินผ่าน / ไม่ผ่าน · ไม่ตีกรอบ) */
  infoOnly?: boolean;
}

/**
 * กด `ดูฟอร์ม` ของรายการ → หน้าต่างฟอร์มย้อนหลัง → ตารางเทียบ (ซ้ายมือ ไม่ทับหน้าต่างกลางจอ) → กรอบ Expected ที่แถวของ checks[0] (แถวหลัก) + แถวอื่นที่อยู่ในจอ → expect
 * ค้างหน้าต่างไว้ให้ภาพ "ผ่าน" ของ step · ปิดตอนเรียกครั้งถัดไป
 */
async function viewForm(page: Page, found: Found, title: string, checks: FormCheck[], info: CompareRow[] = []) {
  await hideCompareTable(page);
  await closeDispositionHistoryForm(page);
  expect(found.index, `${title}: ประวัติต้องมีรายการนี้ (ไม่พบรายการที่ตรงกับสิ่งที่ทำ)`).toBeGreaterThanOrEqual(0);
  await openDispositionHistory(page);
  await markEvidence(clicked(dispositionHistoryFormLink(found.entry), `ดูฟอร์ม ของรายการ ${found.row?.action ?? ''}`));
  await holdForClip(page);
  await snapEvidence(page, `ก่อนกด — ดูฟอร์ม ${found.row?.action ?? ''}`);
  const dialog = await openDispositionHistoryForm(page, found.entry);
  const shown = await readDispositionHistoryForm(dialog);
  const html = await dialog.evaluate((el) => el.outerHTML);
  fs.mkdirSync('.cache', { recursive: true });
  fs.writeFileSync('.cache/sbh-2528-history-form.html', html);
  await test.info().attach(`${title} — ค่าที่หน้าต่างแสดง`, { body: JSON.stringify(shown, null, 2), contentType: 'application/json' });
  const rows: CompareRow[] = checks.map((check) => {
    const value = shown[check.label];
    return { label: check.label, values: [value ?? '(ไม่มีแถวนี้)', check.want], same: check.infoOnly ? true : check.pass ? check.pass(value) : value === check.want };
  });
  await showCompareTable(page, title, ['ในหน้าต่างฟอร์มย้อนหลัง', 'Expected'], [...rows, ...info], { side: 'left', width: '530px' });
  // ตีกรอบเฉพาะแถวที่มีจริง (แถวที่ไม่มีให้ตารางเทียบบอก "(ไม่มีแถวนี้)" แทน — markEvidence กับ locator ที่ไม่มีจะค้างจนหมดเวลา)
  await markEvidence(...checks.filter((check) => !check.infoOnly && check.label in shown).map((check) => expected(formRow(dialog, check.label), `${check.label} = ${shown[check.label]}`)));
  await holdForClip(page, 2_500);
  for (const row of rows) expect(row.same, `${title} — แถว "${row.label}": หน้าต่างแสดง "${row.values[0]}" · Expected "${row.values[1]}"`).toBe(true);
  return { dialog, shown };
}

/** แถวฉบับที่ของรายการ — ใช้กับ viewForm */
const ordinalCheck = (want: number, action: string): FormCheck[] => [
  { label: 'ฉบับที่', want: String(want) },
  { label: 'ประวัติ Disposition', want: action },
];
const ordinalInfo = (found: Found): CompareRow[] => [{ label: 'version ใน API (ข้อมูล)', values: [String(found.record?.snapshot?.version ?? '-'), '—'], same: true }];

test.describe(`SBH-2528 ประวัติ Disposition — เลขฉบับที่ / ผู้ลงนาม / วันที่ลงนาม ในฟอร์มย้อนหลัง (${SYSTEM})`, () => {
  // เปิด Visit + Triage + Disposition + รอ 35 วิ 2 รอบ + ดูฟอร์มหลายรายการ + ปิด Visit ที่การเงิน
  test.describe.configure({ timeout: 900_000 });

  let opened: Map<string, ErVisit>;
  /** หน้าต่างของบัญชีอื่นที่เทสเปิด (ปิด + เก็บคลิปท้ายเทส) */
  let others: { role: string; page: Page }[];

  test.beforeEach(({ page }) => {
    test.skip(SYSTEM === 'sbh-prod', 'SBH Prod ยังไม่ได้รับอนุญาตสำหรับการ์ด SBH-2528 (R40)');
    opened = trackOpenedErVisits(page);
    others = [];
  });

  test.afterEach(async ({ page }) => {
    for (const other of others) {
      const video = other.page.video();
      await other.page.context().close().catch(() => undefined);
      const file = await video?.path().catch(() => undefined);
      if (!file || !fs.existsSync(file)) continue;
      const target = test.info().outputPath(`video-${other.role}.webm`);
      fs.copyFileSync(file, target);
      await test.info().attach(`video-${other.role}`, { path: target, contentType: 'video/webm' });
    }
    await hideCompareTable(page).catch(() => undefined);
    for (const visit of opened?.values() ?? []) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  /** Pre-condition: ผู้ป่วย AUTO ใหม่ → เปิด Visit ER → Triage ESI 3 → หน้า Overview ของ Visit (ยังไม่เริ่ม Disposition) */
  async function openTriagedVisit(page: Page, key: string, label: string): Promise<ErVisit> {
    const patient = newTestPatient(`Ord${key}`);
    const visit = await registerAndOpenErVisit(page, patient);
    console.log(`    ${label}: ${patient.firstName} ${patient.familyName} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
    test.info().annotations.push({ type: label, description: `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });
    // หน้าคัดกรองแบบใหม่ (dev-x 28 ต.ค. 2026 · ไฟล์แอป index-BaNu9Hqq.js) ไม่มีแท็บ Triage → ใช้ helper ฟอร์มใหม่ของ er-triage.ts (แบบเดียวกับ SBH-2355)
    const main = page.getByRole('main');
    await expectVisitHeader(page, visit);
    await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true }), 'หลังเปิด Visit ต้องอยู่หน้าคัดกรอง ER').toBeVisible({ timeout: 60_000 });
    await dismissToast(page, 'สร้าง Visit สำเร็จ');
    await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
    await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
    await expect(main.getByText('Clinical Summary', { exact: true }), 'บันทึกคัดกรองแล้วหน้าต้องเปลี่ยนเป็น Overview ของ Visit').toBeVisible({ timeout: 60_000 });
    await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
    return visit;
  }

  /** เปิดแท็บ Disposition → กด เริ่มบันทึก (ปุ่มเริ่มจำหน่าย) */
  async function start(page: Page): Promise<ErDischargeSummary> {
    const main = page.getByRole('main');
    await openCarePanel(page, 'Disposition', main.getByText(DISPOSITION_PANEL, { exact: true }));
    const startButton = page.getByTestId('er-disposition-start');
    await expect(startButton, 'ผู้ป่วยต้องยังไม่เคยทำ Disposition (มีปุ่มเริ่มจำหน่าย)').toBeVisible();
    await markEvidence(clicked(startButton, 'เริ่มบันทึก'));
    await holdForClip(page);
    await snapEvidence(page, 'ก่อนกด — เริ่มบันทึก');
    const started = await startDisposition(page);
    await expect(dispositionHistoryButton(page), 'เริ่มบันทึกแล้วต้องมีปุ่มไอคอนเปิดประวัติบนหัวฟอร์ม').toBeVisible();
    await markEvidence(expected(dispositionHistoryButton(page), 'ปุ่ม ดูประวัติ Disposition'), expected(page.getByTestId('er-disposition-save-draft'), 'ฟอร์มพร้อมกรอก'));
    return started;
  }

  /** กรอกช่องบังคับ + ภาพ "กรอก" (ช่องข้อความอยู่ล่างฟอร์ม แยกภาพ — R23) · คืนตัวเลือกด้านบนไว้ตีกรอบคู่ปุ่มที่จะกด */
  async function fill(page: Page, text: string) {
    const form = await fillDispositionForm(page, text);
    await markEvidence(filled(form.clinical), filled(form.finding));
    await holdForClip(page);
    await snapEvidence(page, 'กรอก — ช่องข้อความของฟอร์ม Disposition');
    return form;
  }

  /** กดลงนาม → แจ้งเตือน + ปุ่มเปิดแก้ไข */
  async function sign(page: Page, label: string): Promise<ErDischargeSummary> {
    await markEvidence(clicked(page.getByTestId('er-disposition-finalize'), 'ลงนาม'));
    await holdForClip(page);
    await snapEvidence(page, `ก่อนกด — ปุ่ม ลงนาม (${label})`);
    const signed = await signDisposition(page);
    await markEvidence(alerted(page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว')), expected(page.getByTestId('er-disposition-reopen'), 'ลงนามแล้ว (ปุ่มเปิดแก้ไข)'));
    await holdForClip(page);
    return signed;
  }

  /** กดปุ่มไอคอน ดูประวัติ Disposition → ภาพก่อนกด → popover + ตารางเทียบกับ API */
  async function openHistory(page: Page, authorization: () => string, visit: ErVisit, title: string, ordinals: string[]) {
    await hideCompareTable(page);
    await closeDispositionHistoryForm(page);
    await closeDispositionHistory(page);
    await markEvidence(clicked(dispositionHistoryButton(page), 'ดูประวัติ Disposition'));
    await holdForClip(page);
    await snapEvidence(page, 'ก่อนกด — ปุ่มไอคอน ดูประวัติ Disposition');
    return viewHistory(page, authorization, visit, title, ordinals);
  }

  /** ลำดับการกระทำจากเก่าไปใหม่ (API) ต้องตรงกับที่ TC ทำ */
  function expectSequence(view: HistoryView, want: string[], what: string) {
    const actual = [...view.records].reverse().map((record) => record.action);
    expect(actual, `${what}: รายการในประวัติจากเก่าไปใหม่ — บนจอ: ${view.rows.map(describeDispositionHistoryRow).join(' | ')}`).toEqual(want);
    expect(view.rows.map(describeDispositionHistoryRow), `${what}: รายการบนหน้าจอต้องตรงกับ API`).toEqual(view.records.map((record) => describeDispositionHistoryRow(expectedDispositionHistoryRow(record))));
  }

  // ---------------------------------------------------------------------------------------------
  test(
    'ผู้ป่วยรายที่ 1: บันทึกฉบับร่าง → ลงนาม → เปิดแก้ไข → ลงนามซ้ำ — ฉบับที่เรียง 1–6 · ผู้ลงนาม / วันที่ลงนาม แสดงค่าจริง (Super_User)',
    { tag: ['@SBH-2528', '@SBH-3036', '@SBH-3044', '@SBH-3047', '@SBH-3039'], annotation: [linear('SBH-2528'), linear('SBH-3031')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const { note, soft, finish } = makeRunner(page);
      const TEXT = 'ทดสอบ automate SBH-2528 TC-001';
      const TEXT_EDIT = 'ทดสอบ automate SBH-2528 TC-002 (แก้หลังเปิดแก้ไข)';
      let visit!: ErVisit;
      let user!: { name: string; username: string };
      let started!: ErDischargeSummary;
      let draft!: ErDischargeSummary;
      let draftSavedAt = 0;
      let signed!: ErDischargeSummary;

      await checkStep(page, `${TC[1]} ขั้น 1 Login user1 เปิด Visit ER ผู้ป่วยรายใหม่ แล้วบันทึกคัดกรอง`, async () => {
        await gotoErDashboard(page);
        await startClip(page, 'TC-001');
        visit = await openTriagedVisit(page, 'P1', 'ผู้ป่วยรายที่ 1');
        await expectVisitHeader(page, visit);
        user = account(authorization());
        note('บัญชี', `${user.username} — ${user.name}`);
        await markEvidence(...visitHeaderMarks(page, visit), ...(await accountMarks(page, user.name)));
        await holdForClip(page);
      });

      await checkStep(page, `${TC[1]} ขั้น 2 เปิดแท็บ Disposition กด เริ่มบันทึก`, async () => {
        started = await start(page);
      });

      await checkStep(page, `${TC[1]} ขั้น 3 กรอกช่องบังคับ แล้วกด บันทึกฉบับร่าง`, async () => {
        const form = await fill(page, TEXT);
        const save = page.getByTestId('er-disposition-save-draft');
        await markEvidence(filled(form.status), filled(form.method), filled(form.diagnosis), clicked(save, 'บันทึกฉบับร่าง'));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — ปุ่ม บันทึกฉบับร่าง');
        draft = await saveDispositionDraft(page);
        draftSavedAt = Date.now();
        await markEvidence(alerted(page.getByText('บันทึกการจำหน่ายผู้ป่วย ER แล้ว').last()), expected(page.getByRole('main').getByText(/แก้ไขล่าสุดโดย/).first(), 'บันทึกฉบับร่างแล้ว'));
        await holdForClip(page);
      });

      await checkStep(page, `${TC[1]} ขั้น 4 รอเกิน 30 วินาที แล้วกด ลงนาม`, async () => {
        await waitSince(page, draftSavedAt, WAIT_BEFORE_SIGN, 'TC-001 ขั้น 4: รอเกิน 30 วินาทีหลังบันทึกฉบับร่าง ก่อนกดลงนาม');
        signed = await sign(page, 'TC-001');
        const gap = (Date.parse(signed.completedAt!) - Date.parse(draft.updatedAt!)) / 1000;
        note('เวลาที่ทำจริง (TC-001)', `เริ่มบันทึก ${started.updatedAt ?? '-'} · บันทึกฉบับร่าง ${draft.updatedAt} · ลงนาม ${signed.completedAt} (ห่างจากฉบับร่าง ${gap} วินาที)`);
        expect(gap, 'ลงนามต้องห่างจากบันทึกฉบับร่างเกิน 30 วินาที').toBeGreaterThan(30);
      });

      // ---------- TC-001 ขั้น 5: ดูประวัติ → ดูฟอร์มทีละรายการ ----------
      let view!: HistoryView;
      await soft(`${TC[1]} ขั้น 5 กดปุ่ม ดูประวัติ Disposition — มี 3 รายการ เริ่มบันทึก · บันทึกฉบับร่าง · ลงนาม`, async () => {
        view = await openHistory(page, authorization, visit, `ประวัติ Disposition ผู้ป่วยรายที่ 1 — HN ${visit.hn} · ${visit.en}`, ['3', '2', '1']);
        await markEvidence(expected(view.popover, '3 รายการ'));
        await holdForClip(page, 2_500);
        expectSequence(view, ['STARTED', 'SAVED_DRAFT', 'SIGNED'], 'TC-001');
      });
      if (!view) view = await viewHistory(page, authorization, visit, 'ประวัติ Disposition', []);
      const t1 = {
        started: findEntry(view, 'STARTED'),
        draft: findEntry(view, 'SAVED_DRAFT', draft.updatedAt),
        signed: findEntry(view, 'SIGNED', signed.completedAt),
      };
      await soft(`${TC[1]} Expected ดูฟอร์ม รายการ เริ่มบันทึก — ฉบับที่ 1`, async () => {
        await viewForm(page, t1.started, 'TC-001 ดูฟอร์ม เริ่มบันทึก — ฉบับที่ต้องเป็น 1', ordinalCheck(1, 'เริ่มบันทึก'), ordinalInfo(t1.started));
      });
      await soft(`${TC[1]} Expected ดูฟอร์ม รายการ บันทึกฉบับร่าง — ฉบับที่ 2`, async () => {
        await viewForm(page, t1.draft, 'TC-001 ดูฟอร์ม บันทึกฉบับร่าง — ฉบับที่ต้องเป็น 2', ordinalCheck(2, 'บันทึกฉบับร่าง'), ordinalInfo(t1.draft));
      });
      await soft(`${TC[1]} Expected ดูฟอร์ม รายการ ลงนาม — ฉบับที่ 3 (ไม่ข้าม ไม่ซ้ำ)`, async () => {
        await viewForm(page, t1.signed, 'TC-001 ดูฟอร์ม ลงนาม — ฉบับที่ต้องเป็น 3', ordinalCheck(3, 'ลงนาม'), ordinalInfo(t1.signed));
      });

      // ---------- TC-004: ผู้ลงนาม ของรายการลงนาม ----------
      await startClip(page, 'TC-004');
      // หน้าต่างของรายการ ลงนาม (dev-x 28 ต.ค. 2026) แสดงแถว ผู้ลงนาม / วันที่ลงนาม แทน ผู้บันทึก / เวลาบันทึก (รายการนี้ไม่มี 2 แถวหลัง)
      // → เทียบกับผู้ทำ / เวลาของรายการ ลงนาม ใน popover ประวัติ (ค่าเดียวกับที่แถว ผู้บันทึก / เวลาบันทึก เคยแสดง) + บัญชีที่กดลงนาม
      await soft(`${TC[4]} ขั้น 2–3 ดูฟอร์ม รายการ ลงนาม เลื่อนลงท้ายหน้าต่าง — แถว ผู้ลงนาม = ผู้กดลงนาม (user1)`, async () => {
        const signer = t1.signed.row?.actor || t1.signed.record?.actor?.display || user.name;
        const { shown } = await viewForm(
          page,
          t1.signed,
          'TC-004 ผู้ลงนาม ของรายการลงนาม',
          [
            { label: 'ผู้ลงนาม', want: `${signer} (ผู้ทำของรายการ ลงนาม · ไม่ใช่ "${NOT_RECORDED}")`, pass: (value) => !!value && value === signer && value !== NOT_RECORDED },
            { label: 'ผู้บันทึก', want: '(ข้อมูล — Expected อ้างถึงแถวนี้)', infoOnly: true },
          ],
          [
            { label: 'ผู้ทำ ของรายการ ลงนาม (popover)', values: [t1.signed.row?.actor ?? '-', '—'], same: true },
            { label: 'บัญชีที่กดลงนาม (token)', values: [`${user.name} (${user.username})`, '—'], same: true },
          ],
        );
        note('TC-004 ผู้ลงนาม', `หน้าต่างแสดง ผู้ลงนาม "${shown['ผู้ลงนาม'] ?? '(ไม่มีแถว)'}" · ผู้บันทึก "${shown['ผู้บันทึก'] ?? '-'}" · แถวการเสียชีวิต: ${Object.keys(shown).filter((key) => /เสียชีวิต/.test(key)).map((key) => `${key} = ${shown[key]}`).join(' · ') || '(ไม่มี)'}`);
      });

      // ---------- TC-005: วันที่ลงนาม ของรายการลงนาม ----------
      await startClip(page, 'TC-005');
      await soft(`${TC[5]} ขั้น 2–3 ดูฟอร์ม รายการ ลงนาม เลื่อนลงท้ายหน้าต่าง — แถว วันที่ลงนาม = เวลาที่กดลงนาม`, async () => {
        // เวลาของรายการ ลงนาม (popover / API occurredAt) — ค่าเดียวกับที่แถว เวลาบันทึก เคยแสดง (รายการลงนามรุ่นนี้ไม่มีแถว เวลาบันทึก)
        const signedTime = t1.signed.row?.time || (t1.signed.record ? dispositionHistoryTime(t1.signed.record.occurredAt) : dispositionHistoryTime(signed.completedAt!));
        const { shown } = await viewForm(
          page,
          t1.signed,
          'TC-005 วันที่ลงนาม ของรายการลงนาม',
          [
            { label: 'วันที่ลงนาม', want: `${signedTime} (DD/MM/พ.ศ., HH:mm · เวลาของรายการ ลงนาม · ไม่ใช่ "-")`, pass: (value) => !!value && THAI_DATE_TIME.test(value) && value === signedTime },
            { label: 'เวลาบันทึก', want: '(ข้อมูล — Expected อ้างถึงแถวนี้)', infoOnly: true },
          ],
          [
            { label: 'เวลา ของรายการ ลงนาม (popover)', values: [t1.signed.row?.time ?? '-', '—'], same: true },
            { label: 'เวลาที่กดลงนาม (completedAt)', values: [`${dispositionHistoryTime(signed.completedAt!)} (${signed.completedAt})`, '—'], same: true },
          ],
        );
        note('TC-005 วันที่ลงนาม', `หน้าต่างแสดง วันที่ลงนาม "${shown['วันที่ลงนาม'] ?? '(ไม่มีแถว)'}" · เวลาบันทึก "${shown['เวลาบันทึก'] ?? '-'}" · กดลงนาม ${signed.completedAt}`);
      });

      // ---------- TC-002: เปิดแก้ไข → บันทึกฉบับร่าง → ลงนาม ----------
      await hideCompareTable(page);
      await closeDispositionHistoryForm(page);
      await closeDispositionHistory(page);
      await startClip(page, 'TC-002');
      let reopenedAt = '';
      let draft2!: ErDischargeSummary;
      let draft2SavedAt = 0;
      let signed2!: ErDischargeSummary;
      await checkStep(page, `${TC[2]} ขั้น 2 กด เปิดแก้ไข แก้ช่อง ข้อมูลทางคลินิกฯ แล้วกด บันทึกฉบับร่าง`, async () => {
        const reopen = page.getByTestId('er-disposition-reopen');
        await markEvidence(clicked(reopen, 'เปิดแก้ไข'));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — ปุ่ม เปิดแก้ไข');
        reopenedAt = (await reopenDisposition(page)).at;
        await markEvidence(alerted(page.getByText('เปิดแก้ไขการจำหน่ายผู้ป่วย ER แล้ว')));
        await snapEvidence(page, 'หลังกด — เปิดแก้ไข');
        const { clinical } = dispositionTextBoxes(page);
        await clinical.fill(TEXT_EDIT);
        const save = page.getByTestId('er-disposition-save-draft');
        await markEvidence(filled(clinical), clicked(save, 'บันทึกฉบับร่าง'));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — บันทึกฉบับร่าง หลังเปิดแก้ไข');
        draft2 = await saveDispositionDraft(page);
        draft2SavedAt = Date.now();
        await markEvidence(alerted(page.getByText('บันทึกการจำหน่ายผู้ป่วย ER แล้ว').last()));
        await holdForClip(page);
      });

      await checkStep(page, `${TC[2]} ขั้น 3 รอเกิน 30 วินาที แล้วกด ลงนาม`, async () => {
        await waitSince(page, draft2SavedAt, WAIT_BEFORE_SIGN, 'TC-002 ขั้น 3: รอเกิน 30 วินาทีหลังบันทึกฉบับร่าง ก่อนกดลงนาม');
        signed2 = await sign(page, 'TC-002');
        note('เวลาที่ทำจริง (TC-002)', `เปิดแก้ไข ${reopenedAt} · บันทึกฉบับร่าง ${draft2.updatedAt} · ลงนาม ${signed2.completedAt}`);
      });

      let view2!: HistoryView;
      await soft(`${TC[2]} ขั้น 4 กดปุ่ม ดูประวัติ Disposition — มี 6 รายการ (เพิ่ม เปิดแก้ไข · บันทึกฉบับร่าง · ลงนาม)`, async () => {
        view2 = await openHistory(page, authorization, visit, `ประวัติ Disposition ผู้ป่วยรายที่ 1 หลังเปิดแก้ไข — HN ${visit.hn} · ${visit.en}`, ['6', '5', '4', '3', '2', '1']);
        await markEvidence(expected(view2.popover, '6 รายการ'));
        await holdForClip(page, 2_500);
        expectSequence(view2, ['STARTED', 'SAVED_DRAFT', 'SIGNED', 'REOPENED', 'SAVED_DRAFT', 'SIGNED'], 'TC-002');
      });
      if (!view2) view2 = await viewHistory(page, authorization, visit, 'ประวัติ Disposition', []);
      const t2 = {
        reopened: reopenedEntry(view2, reopenedAt),
        draft: findEntry(view2, 'SAVED_DRAFT', draft2.updatedAt),
        signed: findEntry(view2, 'SIGNED', signed2.completedAt),
      };
      await soft(`${TC[2]} Expected ดูฟอร์ม รายการ เปิดแก้ไข — ฉบับที่ 4`, async () => {
        await viewForm(page, t2.reopened, 'TC-002 ดูฟอร์ม เปิดแก้ไข — ฉบับที่ต้องเป็น 4', ordinalCheck(4, 'เปิดแก้ไข'), ordinalInfo(t2.reopened));
      });
      await soft(`${TC[2]} Expected ดูฟอร์ม รายการ บันทึกฉบับร่าง (หลังเปิดแก้ไข) — ฉบับที่ 5`, async () => {
        await viewForm(page, t2.draft, 'TC-002 ดูฟอร์ม บันทึกฉบับร่าง — ฉบับที่ต้องเป็น 5', ordinalCheck(5, 'บันทึกฉบับร่าง'), ordinalInfo(t2.draft));
      });
      await soft(`${TC[2]} Expected ดูฟอร์ม รายการ ลงนาม (หลังเปิดแก้ไข) — ฉบับที่ 6`, async () => {
        await viewForm(page, t2.signed, 'TC-002 ดูฟอร์ม ลงนาม — ฉบับที่ต้องเป็น 6', ordinalCheck(6, 'ลงนาม'), ordinalInfo(t2.signed));
      });
      await hideCompareTable(page);
      await closeDispositionHistoryForm(page);
      await closeDispositionHistory(page);
      finish();
    },
  );

  // ---------------------------------------------------------------------------------------------
  test(
    'ผู้ป่วยรายที่ 2: เริ่มบันทึก แล้วกด ลงนาม ทันที (ไม่บันทึกฉบับร่าง) — ฉบับที่ 1 · 2 ไม่ข้ามเป็น 3 (Super_User)',
    { tag: ['@SBH-2528', '@SBH-3041'], annotation: [linear('SBH-2528'), linear('SBH-3031')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const { note, soft, finish } = makeRunner(page);
      let visit!: ErVisit;
      let started!: ErDischargeSummary;
      let signed!: ErDischargeSummary;

      await checkStep(page, `${TC[3]} ขั้น 1 Login user1 เปิด Visit ER ผู้ป่วยรายใหม่อีกราย แล้วบันทึกคัดกรอง`, async () => {
        await gotoErDashboard(page);
        await startClip(page, 'TC-003');
        visit = await openTriagedVisit(page, 'P2', 'ผู้ป่วยรายที่ 2');
        await expectVisitHeader(page, visit);
        const user = account(authorization());
        note('บัญชี', `${user.username} — ${user.name}`);
        await markEvidence(...visitHeaderMarks(page, visit), ...(await accountMarks(page, user.name)));
        await holdForClip(page);
      });

      await checkStep(page, `${TC[3]} ขั้น 2 เปิดแท็บ Disposition กด เริ่มบันทึก`, async () => {
        started = await start(page);
      });

      await checkStep(page, `${TC[3]} ขั้น 3 กรอกช่องบังคับ แล้วกด ลงนาม ทันที (ไม่กด บันทึกฉบับร่าง)`, async () => {
        const form = await fill(page, 'ทดสอบ automate SBH-2528 TC-003');
        await markEvidence(filled(form.status), filled(form.method), filled(form.diagnosis));
        await holdForClip(page);
        await snapEvidence(page, 'กรอก — ตัวเลือกของฟอร์ม Disposition');
        signed = await sign(page, 'TC-003');
        note('เวลาที่ทำจริง (TC-003)', `เริ่มบันทึก ${started.updatedAt ?? '-'} · ลงนาม ${signed.completedAt}`);
      });

      let view!: HistoryView;
      await soft(`${TC[3]} ขั้น 4 กดปุ่ม ดูประวัติ Disposition — มี 2 รายการ เริ่มบันทึก · ลงนาม`, async () => {
        view = await openHistory(page, authorization, visit, `ประวัติ Disposition ผู้ป่วยรายที่ 2 — HN ${visit.hn} · ${visit.en}`, ['2', '1']);
        await markEvidence(expected(view.popover, '2 รายการ'));
        await holdForClip(page, 2_500);
        expectSequence(view, ['STARTED', 'SIGNED'], 'TC-003');
      });
      if (!view) view = await viewHistory(page, authorization, visit, 'ประวัติ Disposition', []);
      const startedEntry = findEntry(view, 'STARTED');
      const signedEntry = findEntry(view, 'SIGNED', signed.completedAt);
      await soft(`${TC[3]} Expected ดูฟอร์ม รายการ เริ่มบันทึก — ฉบับที่ 1`, async () => {
        await viewForm(page, startedEntry, 'TC-003 ดูฟอร์ม เริ่มบันทึก — ฉบับที่ต้องเป็น 1', ordinalCheck(1, 'เริ่มบันทึก'), ordinalInfo(startedEntry));
      });
      await soft(`${TC[3]} Expected ดูฟอร์ม รายการ ลงนาม — ฉบับที่ 2 (ไม่ข้ามเป็น 3)`, async () => {
        await viewForm(page, signedEntry, 'TC-003 ดูฟอร์ม ลงนาม — ฉบับที่ต้องเป็น 2', ordinalCheck(2, 'ลงนาม'), ordinalInfo(signedEntry));
      });
      await hideCompareTable(page);
      await closeDispositionHistoryForm(page);
      await closeDispositionHistory(page);
      finish();
    },
  );

  // ---------------------------------------------------------------------------------------------
  test(
    'ผู้ป่วยรายที่ 3: Super_User บันทึกฉบับร่าง แล้ว Doctor ลงนาม — ผู้ลงนาม = Doctor ไม่ใช่ผู้บันทึกฉบับร่าง (Super_User + Doctor)',
    { tag: ['@SBH-2528', '@SBH-3050'], annotation: [linear('SBH-2528'), linear('SBH-3031')] },
    async ({ page, browser }) => {
      const authorization = trackAuthorization(page);
      const { note } = makeRunner(page);
      let visit!: ErVisit;
      let userA!: { name: string; username: string };
      let userB!: { name: string; username: string };
      let draft!: ErDischargeSummary;
      let signed!: ErDischargeSummary;
      let pageB!: Page;
      let authorizationB!: () => string;

      await checkStep(page, `${TC[6]} ขั้น 1 บัญชี A (Super_User) เปิด Visit ER ผู้ป่วยรายใหม่ คัดกรอง เริ่มบันทึก กรอก แล้วกด บันทึกฉบับร่าง`, async () => {
        await gotoErDashboard(page);
        await startClip(page, 'TC-006');
        visit = await openTriagedVisit(page, 'P3', 'ผู้ป่วยรายที่ 3');
        await expectVisitHeader(page, visit);
        userA = account(authorization());
        note('บัญชี A', `${userA.username} — ${userA.name}`);
        await markEvidence(...visitHeaderMarks(page, visit), ...(await accountMarks(page, userA.name)));
        await holdForClip(page);
        await snapEvidence(page, 'บัญชี A เปิดผู้ป่วยรายที่ 3');
        await start(page);
        await snapEvidence(page, 'หลังกด — เริ่มบันทึก (บัญชี A)');
        const form = await fill(page, 'ทดสอบ automate SBH-2528 TC-006 (บัญชี A)');
        const save = page.getByTestId('er-disposition-save-draft');
        await markEvidence(filled(form.status), filled(form.method), filled(form.diagnosis), clicked(save, 'บันทึกฉบับร่าง'));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — ปุ่ม บันทึกฉบับร่าง (บัญชี A)');
        draft = await saveDispositionDraft(page);
        await markEvidence(alerted(page.getByText('บันทึกการจำหน่ายผู้ป่วย ER แล้ว').last()), expected(page.getByRole('main').getByText(/แก้ไขล่าสุดโดย/).first(), `บันทึกฉบับร่างโดย ${draft.updatedBy?.display ?? userA.name}`));
        await holdForClip(page);
      });

      // หน้าต่างแยกที่ใช้ session ของบัญชี B (แทน Logout / Login — session ของบัญชี A ยังใช้ปิด Visit ท้ายเทส) · คลิปแยกไฟล์ video-Doctor.webm
      await test.step('เปิดหน้าต่างของบัญชี B (Doctor) ที่หน้าผู้ป่วยรายที่ 3', async () => {
        pageB = await openPatientAs(browser, 'Doctor', visit.hn, visit);
        others.push({ role: 'Doctor', page: pageB });
        authorizationB = trackAuthorization(pageB);
      });
      const runnerB = makeRunner(pageB);

      await checkStep(pageB, `${TC[6]} ขั้น 2 บัญชี B (Doctor) เปิด Disposition ของผู้ป่วยรายเดียวกัน แล้วกด ลงนาม`, async () => {
        await openCarePanel(pageB, 'Disposition', pageB.getByRole('main').getByText(DISPOSITION_PANEL, { exact: true }));
        userB = account(authorizationB());
        note('บัญชี B', `${userB.username} — ${userB.name} (หน้าต่างแยก — คลิป video-Doctor.webm)`);
        expect(userB.username, 'บัญชี B ต้องเป็นคนละบัญชีกับบัญชี A').not.toBe(userA.username);
        await expect(pageB.getByTestId('er-disposition-finalize')).toBeEnabled();
        await markEvidence(...visitHeaderMarks(pageB, visit), ...(await accountMarks(pageB, userB.name)), expected(pageB.getByRole('main').getByText(/แก้ไขล่าสุดโดย/).first(), 'ฉบับร่างของบัญชี A'));
        await holdForClip(pageB, 2_000);
        await snapEvidence(pageB, 'บัญชี B เปิด Disposition — เห็นฉบับร่างของบัญชี A');
        signed = await sign(pageB, 'บัญชี B');
        note('เวลาที่ทำจริง (TC-006)', `บัญชี A บันทึกฉบับร่าง ${draft.updatedAt} (${draft.updatedBy?.display}) · บัญชี B ลงนาม ${signed.completedAt} (${signed.completedBy?.display})`);
      });

      let view!: HistoryView;
      await runnerB.soft(`${TC[6]} ขั้น 3 กดปุ่ม ดูประวัติ Disposition — รายการ ลงนาม เป็นของบัญชี B`, async () => {
        view = await openHistory(pageB, authorizationB, visit, `ประวัติ Disposition ผู้ป่วยรายที่ 3 — HN ${visit.hn} · ${visit.en}`, []);
        const found = findEntry(view, 'SIGNED', signed.completedAt);
        await markEvidence(expected(found.entry, `ลงนาม · ${found.row?.actor ?? '-'}`));
        await holdForClip(pageB, 2_500);
        expect(found.index, 'ประวัติต้องมีรายการ ลงนาม').toBeGreaterThanOrEqual(0);
      });
      if (!view) view = await viewHistory(pageB, authorizationB, visit, 'ประวัติ Disposition', []);
      const signedEntry = findEntry(view, 'SIGNED', signed.completedAt);
      const draftEntry = findEntry(view, 'SAVED_DRAFT', draft.updatedAt);
      await runnerB.soft(`${TC[6]} Expected ดูฟอร์ม รายการ ลงนาม — แถว ผู้ลงนาม เป็นบัญชี B ไม่ใช่บัญชี A`, async () => {
        const nameB = signedEntry.record?.actor?.display ?? signed.completedBy?.display ?? userB.name;
        const nameA = draftEntry.record?.actor?.display ?? draft.updatedBy?.display ?? userA.name;
        const { shown } = await viewForm(
          pageB,
          signedEntry,
          'TC-006 ผู้ลงนาม เมื่อผู้ลงนามต่างจากผู้บันทึกฉบับร่าง',
          [{ label: 'ผู้ลงนาม', want: `${nameB} (บัญชี B — ไม่ใช่ ${nameA})`, pass: (value) => !!value && value === nameB && value !== nameA }],
          [
            { label: 'ผู้บันทึกฉบับร่าง (บัญชี A)', values: [nameA, '—'], same: true },
            { label: 'บัญชีที่กดลงนาม (token บัญชี B)', values: [`${userB.name} (${userB.username})`, '—'], same: true },
          ],
        );
        note('TC-006 ผู้ลงนาม', `หน้าต่างแสดง ผู้ลงนาม "${shown['ผู้ลงนาม'] ?? '(ไม่มีแถว)'}" · ผู้บันทึก "${shown['ผู้บันทึก'] ?? '-'}" · บัญชี A "${nameA}" · บัญชี B "${nameB}"`);
      });
      await hideCompareTable(pageB);
      await closeDispositionHistoryForm(pageB);
      await closeDispositionHistory(pageB);
      runnerB.finish();
    },
  );
});
