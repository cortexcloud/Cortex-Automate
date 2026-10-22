import { type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectTriageFormOpen, expectVisitHeader, gotoErDashboard, openCarePanel, openVisitDialog, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
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
  saveDispositionDraft,
  signDisposition,
  startDisposition,
  type DispositionHistoryRecord,
  type DispositionHistoryRow,
  type ErDischargeSummary,
} from '../../../helpers/functions/er-disposition';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { triageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/support/evidence';
import { newTestPatient } from '../../../helpers/data/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, recordMockPatient, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, fillTriage, gotoVisit, openPatientAs, saveTriageForm } from '../../../mock-data/uat-play';

// SBH-2462 [ER][Disposition] แสดง Disposition Form ย้อนหลัง — ปุ่มไอคอน `ดูประวัติ Disposition` บนหัวฟอร์ม → popover `ประวัติ Disposition`
// (รายการ เริ่มบันทึก / บันทึกฉบับร่าง / ลงนาม / เปิดแก้ไข พร้อมผู้ทำ + วันเวลา · ใหม่สุดอยู่บน) — งานของ dev: SBH-2465 (API) · SBH-2466 (หน้าจอ)
// แต่ละรายการมีลิงก์ `ดูฟอร์ม` → หน้าต่าง `ฟอร์ม Disposition ย้อนหลัง (อ่านอย่างเดียว)` แสดงค่าของฟอร์มที่บันทึกไว้ในฉบับนั้น (ขึ้น SBH Prod เช้า 8 ต.ค. 2026)
// แปลงจากชุด Manual: EXE SBH-2486 → SC-001 (SBH-2488) TC-001–002 (SBH-2490–2491) · SC-002 (SBH-2489) TC-003 (SBH-2492) · 2 เทสตาม flow (R9):
//   1) ผู้ป่วยรายที่ 1: User A บันทึกฉบับร่าง → รอเกิน 1 นาที → ลงนาม → ประวัติมีทั้ง Save Draft และ Save Final
//   2) ผู้ป่วยรายที่ 2: User A บันทึกฉบับร่าง → User B แก้แล้วลงนาม → ประวัติแยกรายการ แสดงชื่อของแต่ละคน
// TC-003 (Modal รายละเอียดการแก้ไข — v1.1) ยังไม่มีบนระบบ (8 ต.ค. 2026 ไม่มีบรรทัด แก้ไข N รายการ / ลิงก์ ดูรายละเอียด) → ไม่ได้ทดสอบ ตามหมายเหตุของ TC
// ข้อควรรู้จากชุด EXE: Save Draft = ปุ่ม บันทึกฉบับร่าง · Save Final = ปุ่ม ลงนาม (R20) · ชื่อปุ่มใน TC มาจาก mockup (ประวัติการบันทึกและลงนาม) ของจริงคือ ดูประวัติ Disposition
//   · dev รวม บันทึกฉบับร่าง + ลงนาม ของผู้ใช้เดียวกันที่ห่างกันไม่เกิน 30 วินาทีเป็นรายการ ลงนาม เดียว → TC-001 ต้องรอ
// User A = Super_User (R6) · User B = Doctor เปิดในหน้าต่างแยก (session ของตัวเอง) แทนการ Logout / Login — คลิปของ User B แยกไฟล์ video-Doctor.webm
// ข้อมูล: ผู้ป่วย AUTO ใหม่ทุกรอบ → เปิด Visit ER สิทธิ UC + Triage ESI 3 → ปิด Visit ที่การเงินท้ายเทส (afterEach — ผู้ใช้เลือก 8 ต.ค. 2026)
// ระบบ: SBH Prod (ผู้ใช้อนุญาตสร้างผู้ป่วย 2 ราย 8 ต.ค. 2026): npm run card:prod -- --headed --grep @SBH-2490   (แล้วค่อย @SBH-2491)
//        dev-x มีปุ่มแล้วแต่ API ยังไม่มี query erDischargeSummaryHistory (8 ต.ค. 2026) — เทสจะไม่ผ่านที่ขั้นเปิดประวัติ จนกว่า API จะขึ้น

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const note = (description: string) => test.info().annotations.push({ type: 'ข้อสังเกต', description });

/** วินาทีที่รอหลังบันทึกฉบับร่างก่อนกดลงนาม (TC-001 ขั้น 3 — อย่างน้อย 1 นาที · เผื่อนาฬิกาเครื่องกับระบบต่างกัน) */
const WAIT_BEFORE_SIGN = 70;
const DISPOSITION_PANEL = 'สรุปการจำหน่าย';

/** ชื่อบัญชีที่ล็อกอิน (claim `name` / `preferred_username` ของ token ที่แอปใช้) — ไม่พิมพ์ token */
function account(authorization: string): { name: string; username: string } {
  const payload = JSON.parse(Buffer.from(authorization.split('.')[1] ?? '', 'base64url').toString('utf8') || '{}') as { name?: string; preferred_username?: string };
  return { name: payload.name ?? '', username: payload.preferred_username ?? '' };
}

/** ชื่อบัญชีที่มุมขวาบนของแอป (ไว้ตีกรอบ) — หาไม่เจอก็ไม่ตีกรอบ */
async function accountMarks(page: Page, name: string) {
  const label = page.getByText(name, { exact: true }).filter({ visible: true }).first();
  const box = await label.boundingBox().catch(() => null);
  return box && box.y < 40 ? [expected(label)] : [];
}

/** แถบหัวของหน้าผู้ป่วย: HN / VN / EN ของ Visit (ไว้ตีกรอบ) */
function visitHeaderMarks(page: Page, visit: ErVisit) {
  const main = page.getByRole('main');
  return [`HN ${visit.hn}`, `VN ${visit.vn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first()));
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

interface FilledForm {
  status: Locator;
  method: Locator;
  diagnosis: Locator;
  clinical: Locator;
  finding: Locator;
}

/** กรอกฟอร์ม Disposition (เริ่มจำหน่ายแล้ว): Improved + With Approval + ICD10 K30 + ช่องข้อความบังคับ 2 ช่อง — ยังไม่บันทึก */
async function fillDispositionForm(page: Page, text: string): Promise<FilledForm> {
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

interface HistoryView {
  popover: Locator;
  rows: DispositionHistoryRow[];
  records: DispositionHistoryRecord[];
}

/** เปิด popover ประวัติ (ถ้ายังไม่เปิด) → อ่านรายการบนจอ + จาก API → แสดงตารางเทียบทีละรายการ (ครึ่งซ้ายของจอ — popover อยู่ขวา) */
async function viewHistory(page: Page, authorization: () => string, visit: ErVisit, title: string): Promise<HistoryView> {
  const popover = await openDispositionHistory(page);
  await expect(dispositionHistoryEntries(popover).first(), 'ประวัติต้องมีรายการ (ถ้าขึ้น "ไม่สามารถโหลดประวัติ Disposition ได้" = API ของระบบนี้ยังไม่มี query ประวัติ)').toBeVisible();
  const rows = await readDispositionHistory(popover);
  const records = await fetchDispositionHistory(page, authorization, visit.en);
  await test.info().attach(`ประวัติ Disposition จาก API — ${visit.en}`, { body: JSON.stringify(records, null, 2), contentType: 'application/json' });
  const want = records.map(expectedDispositionHistoryRow);
  const table: CompareRow[] = Array.from({ length: Math.max(rows.length, want.length) }, (_, i) => {
    const values = [rows[i] ? describeDispositionHistoryRow(rows[i]) : '(ไม่มี)', want[i] ? describeDispositionHistoryRow(want[i]) : '(ไม่มี)'];
    return { label: `รายการที่ ${i + 1}`, values, same: values[0] === values[1] };
  });
  await showCompareTable(page, title, ['บนหน้าจอ (popover ประวัติ Disposition)', 'API erDischargeSummaryHistory'], table, { side: 'left' });
  return { popover, rows, records };
}

/** รายการในประวัติของการกระทำ `action` ที่เกิด ณ เวลา `at` (เวลาที่ระบบตอบตอนกด — คลาดได้ไม่เกิน 10 วินาที) */
function findEntry(view: HistoryView, action: string, at: string | null | undefined) {
  const index = view.records.findIndex((record) => record.action === action && !!at && Math.abs(Date.parse(record.occurredAt) - Date.parse(at)) < 10_000);
  return { index, record: view.records[index], row: view.rows[index], entry: dispositionHistoryEntries(view.popover).nth(Math.max(index, 0)) };
}

/** ตารางเทียบ 1 รายการในประวัติ กับสิ่งที่ทำจริงในขั้นก่อนหน้า */
function entryTable(found: ReturnType<typeof findEntry>, want: { action: string; actor: string; at: string }): CompareRow[] {
  const { row, record } = found;
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', timeStyle: 'medium' }).format(new Date(want.at));
  return [
    { label: 'ป้ายการกระทำ', values: [row?.action ?? '(ไม่พบรายการ)', want.action], same: row?.action === want.action },
    { label: 'ผู้ทำ', values: [row?.actor ?? '-', want.actor], same: row?.actor === want.actor },
    { label: 'วันเวลา', values: [row?.time ?? '-', `${dispositionHistoryTime(record?.occurredAt ?? want.at)} (ระบบบันทึกเมื่อ ${clock})`], same: !!record && row?.time === dispositionHistoryTime(record.occurredAt) },
  ];
}

/** ค่าที่หน้าต่างฟอร์มย้อนหลังของรายการนี้ต้องแสดง: หัวรายการ (ป้าย / ผู้บันทึก / เวลา / ฉบับที่ / HN) + ค่าที่กรอกไว้ตอนบันทึกฉบับนั้น */
function formFields(found: ReturnType<typeof findEntry>, visit: ErVisit, want: { action: string; actor: string; clinical: string; finding: string }): Record<string, string> {
  return {
    'ประวัติ Disposition': want.action,
    ผู้บันทึก: want.actor,
    เวลาบันทึก: found.record ? dispositionHistoryTime(found.record.occurredAt) : '(ไม่พบรายการ)',
    ฉบับที่: String(found.record?.snapshot?.version ?? '(API ไม่มีข้อมูลฟอร์มของฉบับนี้)'),
    HN: visit.hn,
    วิธีการจำหน่าย: 'With Approval',
    สถานะการจำหน่าย: 'Improved',
    ข้อมูลทางคลินิกและการดำเนินโรค: want.clinical,
    การตรวจเพิ่มเติมและผลการตรวจ: want.finding,
  };
}

/**
 * กด `ดูฟอร์ม` ของรายการในประวัติ → หน้าต่าง "ฟอร์ม Disposition ย้อนหลัง (อ่านอย่างเดียว)" → เทียบทุกช่องใน `want` → ปิดหน้าต่าง
 * (กด ดูฟอร์ม แล้ว popover ปิดเอง — เปิดใหม่ก่อนทุกครั้ง · ตารางเทียบแคบไว้ซ้ายมือ ไม่ทับหน้าต่างกลางจอ)
 */
async function checkHistoryForm(page: Page, found: ReturnType<typeof findEntry>, want: Record<string, string>, title: string) {
  await hideCompareTable(page);
  await closeDispositionHistoryForm(page); // หน้าต่างของรายการก่อนหน้า (ค้างไว้ให้ภาพหลักฐานของ step ก่อน)
  await openDispositionHistory(page);
  await markEvidence(clicked(dispositionHistoryFormLink(found.entry)));
  await holdForClip(page);
  await snapEvidence(page, `ก่อนกด — ${title}`);
  const dialog = await openDispositionHistoryForm(page, found.entry);
  const shown = await readDispositionHistoryForm(dialog);
  await test.info().attach(`${title} — ค่าที่หน้าต่างแสดง`, { body: JSON.stringify(shown, null, 2), contentType: 'application/json' });
  const rows: CompareRow[] = Object.entries(want).map(([label, value]) => ({ label, values: [shown[label] ?? '(ไม่มีช่องนี้)', value], same: shown[label] === value }));
  await showCompareTable(page, title, ['ในหน้าต่างฟอร์มย้อนหลัง', 'ที่บันทึกจริง'], rows, { side: 'left', width: '530px' });
  await markEvidence(expected(dialog.locator('.ant-descriptions')));
  await holdForClip(page, 3_500);
  for (const row of rows) expect(row.values[0], `${title} — ช่อง ${row.label}`).toBe(row.values[1]);
  // ค่าในหน้าต่างต้องมาจากฉบับที่บันทึกไว้ (API snapshot) ไม่ใช่ค่าปัจจุบันของฟอร์ม
  expect(found.record?.snapshot?.clinicInformation, `${title} — ข้อมูลทางคลินิกของฉบับนี้จาก API`).toBe(want['ข้อมูลทางคลินิกและการดำเนินโรค']);
  return shown;
}

test.describe(`SBH-2462 ประวัติ Disposition ของ ER — Save Draft / Save Final / แยกตาม User (${SYSTEM})`, () => {
  // เปิด Visit + Triage + Disposition + รอ 1 นาที + เปิดอีกหน้าต่าง + ปิด Visit ที่การเงิน และค้างหน้าจอให้คลิปอ่านทัน · SBH Prod ช้าเป็นพักๆ
  test.describe.configure({ timeout: 780_000 });

  let opened: Map<string, ErVisit>;
  /** หน้าต่างของบัญชีอื่นที่เทสเปิด (ปิด + เก็บคลิปท้ายเทส) */
  let others: { role: string; page: Page }[];

  test.beforeEach(({ page }) => {
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
    await hideCompareTable(page);
    // ผู้ใช้เลือกให้ปิด Visit ของผู้ป่วยที่เทสเปิด หลังเก็บหลักฐาน (8 ต.ค. 2026) — ทำทั้งตอนผ่านและตอนพังกลางทาง
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  /** Pre-condition: ผู้ป่วย AUTO ใหม่ → เปิด Visit ER สิทธิ UC → Triage ESI 3 พร้อมสัญญาณชีพ → หน้า Overview ของ Visit (ยังไม่เคยทำ Disposition) */
  async function openTriagedVisit(page: Page, key: string, label: string): Promise<ErVisit> {
    const patient = newTestPatient(`Hist${key}`);
    const visit = await registerAndOpenErVisit(page, patient).catch(async (error: Error) => {
      // SBH Prod: ช่วงเวลาออกตรวจของแพทย์ ER วันนั้นถูกใช้หมด → แพทย์ขึ้น "(Full)" กดยืนยันแล้วระบบไม่ส่งคำสั่ง — ไม่แก้ตารางแพทย์ หยุดพร้อมบอกสาเหตุ
      const dialog = openVisitDialog(page);
      const full = await dialog.getByText(/\(Full\)|ไม่พบเวลาที่สามารถลงได้/).first().isVisible().catch(() => false);
      if (!full) throw error;
      throw new Error(`เปิด Visit ER ให้${label} (${patient.firstName} ${patient.familyName}) ไม่ได้ — ช่วงเวลาออกตรวจของแพทย์วันนี้เต็ม · ผู้ป่วยถูกลงทะเบียนแล้วแต่ไม่มี Visit`);
    });
    const state = `SBH-2462 ${label} · เปิด Visit ER สิทธิ UC + Triage ESI 3 + Disposition (เทสการ์ด ปิด Visit ท้ายเทส)`;
    if (SYSTEM === 'sbh-prod') recordMockPatient(`SBH-2462 ${key}`, patient, visit, state);
    else console.log(`    ${label}: ${patient.firstName} ${patient.familyName} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
    test.info().annotations.push({ type: label, description: `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });

    await expectTriageFormOpen(page, visit);
    await dismissToast(page, 'สร้าง Visit สำเร็จ');
    // SBH Prod: ข้อมูล Encounter โหลดไม่สำเร็จเป็นพักๆ ปุ่ม GCS จะกดไม่ได้ค้างอยู่ → เปิดหน้า Visit ใหม่ (แบบเดียวกับสคริปต์ Mock)
    const gcs = triageForm(page).getByRole('button', { name: 'เลือกคะแนน' }).first();
    let rounds = 0;
    await expect(async () => {
      if (rounds++) {
        await gotoVisit(page, visit);
        await expectTriageFormOpen(page, visit);
      }
      if (await gcs.count()) await expect(gcs).toBeEnabled({ timeout: 10_000 });
    }, 'ฟอร์มคัดกรองต้องพร้อมให้กรอก').toPass({ timeout: 150_000 });
    await fillTriage(page, visit, { level: 3, vitals: VITALS_NORMAL });
    await saveTriageForm(page, visit);
    await expect(page.getByRole('main').getByText('Clinical Summary', { exact: true })).toBeVisible({ timeout: 60_000 });
    await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ'); // บังชื่อบัญชีมุมขวาบนในภาพหลักฐาน
    return visit;
  }

  /** เปิด Disposition ของผู้ป่วยที่ยังไม่เคยทำ → เริ่มจำหน่าย → กรอกฟอร์ม → ภาพ "ก่อนกด" → บันทึกฉบับร่าง → แจ้งเตือน + ปุ่มประวัติขึ้น */
  async function draftAsUserA(page: Page, who: string, text: string): Promise<ErDischargeSummary> {
    const main = page.getByRole('main');
    await openCarePanel(page, 'Disposition', main.getByText(DISPOSITION_PANEL, { exact: true }));
    await expect(page.getByTestId('er-disposition-start'), `${who}ต้องยังไม่เคยทำ Disposition (มีปุ่มเริ่มจำหน่าย)`).toBeVisible();
    test.info().annotations.push({ type: 'ก่อนเริ่มจำหน่าย', description: `ปุ่ม ดูประวัติ Disposition: ${(await dispositionHistoryButton(page).count()) ? 'มี' : 'ยังไม่มี (ขึ้นหลังกดเริ่มจำหน่าย)'}` });
    await startDisposition(page);
    const form = await fillDispositionForm(page, text);
    // ช่องข้อความอยู่ล่างสุดของฟอร์ม ห่างจากตัวเลือกด้านบนเกินจอ → แยกภาพ (R23)
    await markEvidence(filled(form.clinical), filled(form.finding));
    await holdForClip(page);
    await snapEvidence(page, `กรอก — ช่องข้อความของฟอร์ม Disposition (${who})`);
    const save = page.getByTestId('er-disposition-save-draft');
    await markEvidence(filled(form.status), filled(form.method), filled(form.diagnosis), clicked(save));
    await holdForClip(page);
    await snapEvidence(page, `ก่อนกด — ปุ่ม บันทึกฉบับร่าง (${who})`);
    const draft = await saveDispositionDraft(page);
    const toast = page.getByText('บันทึกการจำหน่ายผู้ป่วย ER แล้ว');
    await expect(toast).toBeVisible();
    await expect(dispositionHistoryButton(page), 'เริ่มบันทึกแล้วต้องมีปุ่มไอคอนเปิดประวัติบนหัวฟอร์ม').toBeVisible();
    await markEvidence(alerted(toast), expected(main.getByText(/แก้ไขล่าสุดโดย/).first()));
    await holdForClip(page);
    return draft;
  }

  // ---------------------------------------------------------------------------------------------
  test(
    'ผู้ป่วยรายที่ 1: User A บันทึกฉบับร่าง รอเกิน 1 นาที แล้วลงนาม — ประวัติ Disposition มีทั้งรายการ Save Draft และ Save Final (Super_User)',
    { tag: ['@SBH-2462', '@SBH-2490'], annotation: [linear('SBH-2462'), linear('SBH-2486')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      let visit!: ErVisit;
      let userA!: { name: string; username: string };
      let draft!: ErDischargeSummary;
      let draftSavedAt = 0;
      let signed!: ErDischargeSummary;
      const TEXT = 'ทดสอบ automate SBH-2462 TC-001';
      // SBH2462_VERIFY_P1=<HN>,<VN>,<EN>,<เวลาบันทึกฉบับร่าง ISO>,<เวลาลงนาม ISO> = ตรวจขั้น 4 ซ้ำกับผู้ป่วยที่ทำขั้น 1–3 ไว้แล้วในรอบก่อน (อ่านอย่างเดียว ไม่สร้างข้อมูล)
      const verifyOnly = (process.env.SBH2462_VERIFY_P1 ?? '').split(',').filter(Boolean);

      if (verifyOnly.length) {
        await checkStep(page, 'TC-001 (SBH-2490) เปิด Disposition ของผู้ป่วยรายที่ 1 ที่ทำขั้น 1–3 ไว้แล้ว', async () => {
          const [hn, vn, en, draftedAt, signedAt] = verifyOnly;
          expect(signedAt, 'SBH2462_VERIFY_P1 ต้องมี HN,VN,EN,เวลาบันทึกฉบับร่าง,เวลาลงนาม').toBeTruthy();
          visit = { hn, vn, en };
          await gotoVisit(page, visit);
          await openCarePanel(page, 'Disposition', page.getByRole('main').getByText(DISPOSITION_PANEL, { exact: true }));
          userA = account(authorization());
          draft = { en, statusCode: 'DRAFT', dischargeTypeCode: null, completedAt: null, updatedAt: draftedAt };
          signed = { en, statusCode: 'COMPLETE', dischargeTypeCode: null, completedAt: signedAt };
          test.info().annotations.push({ type: 'ตรวจซ้ำ (อ่านอย่างเดียว)', description: `HN ${hn} · ${vn} · ${en} — บันทึกฉบับร่าง ${draftedAt} · ลงนาม ${signedAt} (ทำไว้ในรอบก่อน)` });
          await expect(page.getByTestId('er-disposition-reopen'), 'ฟอร์มของผู้ป่วยรายนี้ต้องลงนามแล้ว').toBeVisible();
          await markEvidence(...visitHeaderMarks(page, visit), ...(await accountMarks(page, userA.name)));
          await holdForClip(page);
        });
      } else {
        await checkStep(page, 'TC-001 (SBH-2490) ขั้น 1 Login ด้วย User A แล้วเปิดผู้ป่วยรายที่ 1', async () => {
          await gotoErDashboard(page);
          visit = await openTriagedVisit(page, 'P1', 'ผู้ป่วยรายที่ 1');
          await expectVisitHeader(page, visit);
          userA = account(authorization());
          test.info().annotations.push({ type: 'User A', description: `${userA.username} — ${userA.name}` });
          await markEvidence(...visitHeaderMarks(page, visit), ...(await accountMarks(page, userA.name)));
          await holdForClip(page);
        });

        await checkStep(page, 'TC-001 (SBH-2490) ขั้น 2 เปิด Disposition กรอกฟอร์ม แล้วกด บันทึกฉบับร่าง', async () => {
          draft = await draftAsUserA(page, 'ผู้ป่วยรายที่ 1', TEXT);
          draftSavedAt = Date.now();
        });

        await checkStep(page, 'TC-001 (SBH-2490) ขั้น 3 รออย่างน้อย 1 นาที แล้วกด ลงนาม', async () => {
          await waitSince(page, draftSavedAt, WAIT_BEFORE_SIGN, 'TC-001 ขั้น 3: รออย่างน้อย 1 นาทีหลังบันทึกฉบับร่าง ก่อนกดลงนาม');
          await markEvidence(clicked(page.getByTestId('er-disposition-finalize')));
          await holdForClip(page);
          await snapEvidence(page, 'ก่อนกด — ปุ่ม ลงนาม (ผู้ป่วยรายที่ 1)');
          signed = await signDisposition(page);
          const gap = (Date.parse(signed.completedAt!) - Date.parse(draft.updatedAt!)) / 1000;
          test.info().annotations.push({ type: 'เวลาที่ทำจริง', description: `บันทึกฉบับร่าง ${draft.updatedAt} · ลงนาม ${signed.completedAt} · ห่างกัน ${gap} วินาที` });
          expect(gap, 'ลงนามต้องห่างจากบันทึกฉบับร่างอย่างน้อย 1 นาที (ไม่งั้น dev รวมเป็นรายการเดียว)').toBeGreaterThanOrEqual(60);
          await markEvidence(alerted(page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว')), expected(page.getByTestId('er-disposition-reopen')));
          await holdForClip(page);
        });
      }

      await checkStep(page, 'TC-001 (SBH-2490) ขั้น 4 กดปุ่มไอคอนประวัติ บนหัวฟอร์ม Disposition', async () => {
        const button = dispositionHistoryButton(page);
        await button.hover();
        const tooltip = page.getByRole('tooltip', { name: 'ดูประวัติ Disposition' });
        await expect(tooltip).toBeVisible();
        note('ปุ่มไอคอนเปิดประวัติชื่อ "ดูประวัติ Disposition" และหัว popover "ประวัติ Disposition" — Test Step เขียนตาม mockup ว่า "ประวัติการบันทึกและลงนาม"');
        await markEvidence(clicked(button), tooltip);
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — ปุ่มไอคอน ดูประวัติ Disposition');
        const view = await viewHistory(page, authorization, visit, `ประวัติ Disposition ของผู้ป่วยรายที่ 1 — HN ${visit.hn} · ${visit.en}`);

        await checkStep(page, 'Expected 1 แสดงประวัติ Disposition ของผู้ป่วยรายนี้', async () => {
          await markEvidence(expected(view.popover), ...visitHeaderMarks(page, visit).slice(0, 1));
          await holdForClip(page, 3_000);
          expect(view.rows.map(describeDispositionHistoryRow), 'รายการบนหน้าจอต้องตรงกับประวัติของ Encounter นี้จาก API ทุกรายการ').toEqual(view.records.map((record) => describeDispositionHistoryRow(expectedDispositionHistoryRow(record))));
          await expect(dispositionHistoryFormLink(dispositionHistoryEntries(view.popover)), 'ทุกรายการต้องมีลิงก์ ดูฟอร์ม').toHaveCount(view.rows.length);
          note('ประวัติเป็นรายการ (ป้ายการกระทำ · ผู้ทำ · วันเวลา) แต่ละรายการมีลิงก์ "ดูฟอร์ม" เปิดหน้าต่าง "ฟอร์ม Disposition ย้อนหลัง (อ่านอย่างเดียว)" ของฉบับนั้น — หมายเหตุของ TC (เขียนตอน dev ยังทำแค่รายการ) ไม่ตรงกับของจริงแล้ว');
        });

        await checkStep(page, 'Expected 2 มีรายการ Save Draft ของการบันทึกในขั้นที่ 2', async () => {
          const found = findEntry(view, 'SAVED_DRAFT', draft.updatedAt);
          const table = entryTable(found, { action: 'บันทึกฉบับร่าง', actor: draft.updatedBy?.display ?? userA.name, at: draft.updatedAt! });
          await showCompareTable(page, 'รายการ Save Draft (ปุ่ม บันทึกฉบับร่าง) ในขั้นที่ 2', ['รายการในประวัติ (บนหน้าจอ)', 'ที่ทำจริงในขั้นที่ 2'], table, { side: 'left' });
          if (found.index >= 0) await markEvidence(expected(found.entry));
          await holdForClip(page, 3_000);
          expect(found.index, `ประวัติต้องมีรายการ บันทึกฉบับร่าง ของเวลา ${draft.updatedAt} — ที่มี: ${view.rows.map(describeDispositionHistoryRow).join(' | ')}`).toBeGreaterThanOrEqual(0);
          for (const row of table) expect(row.values[0], `รายการ Save Draft — ${row.label}`).toBe(row.same ? row.values[0] : row.values[1]);
        });

        await checkStep(page, 'Expected 3 มีรายการ Save Final ของการลงนามในขั้นที่ 3', async () => {
          const found = findEntry(view, 'SIGNED', signed.completedAt);
          const table = entryTable(found, { action: 'ลงนาม', actor: signed.completedBy?.display ?? userA.name, at: signed.completedAt! });
          await showCompareTable(page, 'รายการ Save Final (ปุ่ม ลงนาม) ในขั้นที่ 3', ['รายการในประวัติ (บนหน้าจอ)', 'ที่ทำจริงในขั้นที่ 3'], table, { side: 'left' });
          if (found.index >= 0) await markEvidence(expected(found.entry));
          await holdForClip(page, 3_000);
          expect(found.index, `ประวัติต้องมีรายการ ลงนาม ของเวลา ${signed.completedAt} — ที่มี: ${view.rows.map(describeDispositionHistoryRow).join(' | ')}`).toBeGreaterThanOrEqual(0);
          for (const row of table) expect(row.values[0], `รายการ Save Final — ${row.label}`).toBe(row.same ? row.values[0] : row.values[1]);
          expect(findEntry(view, 'SAVED_DRAFT', draft.updatedAt).index, 'Save Draft และ Save Final ต้องเป็นคนละรายการ').not.toBe(found.index);
        });

        // AC: แสดง Disposition Form ที่ Save Draft / Save Final — ลิงก์ ดูฟอร์ม ของแต่ละรายการ
        const drafted = findEntry(view, 'SAVED_DRAFT', draft.updatedAt);
        const finalized = findEntry(view, 'SIGNED', signed.completedAt);
        await checkStep(page, 'Expected 1 · 2 ดูฟอร์ม ของรายการ Save Draft — แสดงฟอร์มที่บันทึกในขั้นที่ 2', async () => {
          const want = formFields(drafted, visit, { action: 'บันทึกฉบับร่าง', actor: draft.updatedBy?.display ?? userA.name, clinical: TEXT, finding: TEXT });
          await checkHistoryForm(page, drafted, want, 'ดูฟอร์ม ของรายการ Save Draft (ผู้ป่วยรายที่ 1)');
        });
        await checkStep(page, 'Expected 1 · 3 ดูฟอร์ม ของรายการ Save Final — แสดงฟอร์มที่ลงนามในขั้นที่ 3', async () => {
          const want = formFields(finalized, visit, { action: 'ลงนาม', actor: signed.completedBy?.display ?? userA.name, clinical: TEXT, finding: TEXT });
          await checkHistoryForm(page, finalized, want, 'ดูฟอร์ม ของรายการ Save Final (ผู้ป่วยรายที่ 1)');
          expect(finalized.record.snapshot!.version, 'ฉบับที่ลงนามต้องใหม่กว่าฉบับร่าง').toBeGreaterThan(drafted.record.snapshot!.version);
        });
        await hideCompareTable(page);
        await closeDispositionHistoryForm(page);
        await openDispositionHistory(page);

        // TC-003 (SBH-2492) — v1.1: บรรทัด "แก้ไข N รายการ" + ลิงก์ "ดูรายละเอียด" ใต้แต่ละรายการ · ยังไม่มี = ไม่ทดสอบ (หมายเหตุของ TC)
        await test.step('TC-003 (SBH-2492) ดูว่ารายการในประวัติมีบรรทัด แก้ไข N รายการ / ลิงก์ ดูรายละเอียด หรือยัง', async () => {
          const detail = await view.popover.getByText(/แก้ไข\s*\d+\s*รายการ|ดูรายละเอียด|ไม่มีการเปลี่ยนแปลงข้อมูล/).count();
          test.info().annotations.push({
            type: 'TC-003 (SBH-2492)',
            description: detail
              ? `popover มีบรรทัดรายละเอียดการแก้ไขแล้ว (${detail} จุด) — ส่วน v1.1 ขึ้นระบบแล้ว ต้องเขียนเทสของ TC-003 เพิ่ม`
              : 'ไม่ได้ทดสอบ — รายการในประวัติยังไม่มีบรรทัด แก้ไข N รายการ และลิงก์ ดูรายละเอียด (ส่วน v1.1 ยังไม่ขึ้นระบบ)',
          });
        });
        await closeDispositionHistory(page);
      });
    },
  );

  // ---------------------------------------------------------------------------------------------
  test(
    'ผู้ป่วยรายที่ 2: User A บันทึกฉบับร่าง แล้ว User B แก้และลงนาม — ประวัติ Disposition แยกรายการตาม User พร้อมชื่อผู้ทำ (Super_User + Doctor)',
    { tag: ['@SBH-2462', '@SBH-2491'], annotation: [linear('SBH-2462'), linear('SBH-2486')] },
    async ({ page, browser }) => {
      const authorization = trackAuthorization(page);
      const TEXT_A = 'ทดสอบ automate SBH-2462 TC-002 (User A)';
      const TEXT_B = 'ทดสอบ automate SBH-2462 TC-002 (User B แก้ไขก่อนลงนาม)';
      let visit!: ErVisit;
      let userA!: { name: string; username: string };
      let userB!: { name: string; username: string };
      let draft!: ErDischargeSummary;
      let signed!: ErDischargeSummary;
      let pageB!: Page;
      let authorizationB!: () => string;

      await checkStep(page, 'TC-002 (SBH-2491) ขั้น 1 User A เปิดผู้ป่วยรายที่ 2 ทำ Disposition แล้วกด บันทึกฉบับร่าง', async () => {
        await gotoErDashboard(page);
        visit = await openTriagedVisit(page, 'P2', 'ผู้ป่วยรายที่ 2');
        await expectVisitHeader(page, visit);
        userA = account(authorization());
        test.info().annotations.push({ type: 'User A', description: `${userA.username} — ${userA.name}` });
        await markEvidence(...visitHeaderMarks(page, visit), ...(await accountMarks(page, userA.name)));
        await holdForClip(page);
        await snapEvidence(page, 'User A เปิดผู้ป่วยรายที่ 2');
        draft = await draftAsUserA(page, 'ผู้ป่วยรายที่ 2', TEXT_A);
      });

      // หน้าต่างแยกที่ใช้ session ของ User B (ไม่ Logout บัญชีหลัก — session ของ User A ยังใช้ปิด Visit ท้ายเทส) · คลิปแยกไฟล์
      await test.step('เปิดหน้าต่างของ User B (Doctor) ที่หน้าผู้ป่วยรายที่ 2', async () => {
        pageB = await openPatientAs(browser, 'Doctor', visit.hn, visit);
        others.push({ role: 'Doctor', page: pageB });
        authorizationB = trackAuthorization(pageB);
      });

      await checkStep(pageB, 'TC-002 (SBH-2491) ขั้น 2 Login ด้วย User B เปิด Disposition ของผู้ป่วยรายเดียวกัน', async () => {
        const mainB = pageB.getByRole('main');
        await openCarePanel(pageB, 'Disposition', mainB.getByText(DISPOSITION_PANEL, { exact: true }));
        userB = account(authorizationB());
        test.info().annotations.push({ type: 'User B', description: `${userB.username} — ${userB.name} (หน้าต่างแยก — คลิป video-Doctor.webm)` });
        expect(userB.username, 'User B ต้องเป็นคนละบัญชีกับ User A').not.toBe(userA.username);
        await expect(dispositionTextBoxes(pageB).clinical, 'User B ต้องเห็นฉบับร่างที่ User A บันทึกไว้').toHaveValue(TEXT_A);
        await expect(pageB.getByTestId('er-disposition-finalize')).toBeEnabled();
        const lastEdited = mainB.getByText(/แก้ไขล่าสุดโดย/).first();
        await markEvidence(...visitHeaderMarks(pageB, visit), ...(await accountMarks(pageB, userB.name)), expected(lastEdited));
        await holdForClip(pageB, 2_000);
      });

      await checkStep(pageB, 'TC-002 (SBH-2491) ขั้น 3 User B แก้ข้อมูลในฟอร์ม แล้วกด ลงนาม', async () => {
        const { clinical } = dispositionTextBoxes(pageB);
        await clinical.fill(TEXT_B);
        await markEvidence(filled(clinical));
        await holdForClip(pageB);
        await snapEvidence(pageB, 'กรอก — User B แก้ช่อง ข้อมูลทางคลินิกและการดำเนินโรค');
        await markEvidence(clicked(pageB.getByTestId('er-disposition-finalize')));
        await holdForClip(pageB);
        await snapEvidence(pageB, 'ก่อนกด — ปุ่ม ลงนาม (User B)');
        signed = await signDisposition(pageB);
        expect(signed.completedBy?.id, 'ผู้ลงนามต้องเป็นคนละคนกับผู้บันทึกฉบับร่าง').not.toBe(draft.updatedBy?.id);
        test.info().annotations.push({ type: 'เวลาที่ทำจริง', description: `User A บันทึกฉบับร่าง ${draft.updatedAt} (${draft.updatedBy?.display}) · User B ลงนาม ${signed.completedAt} (${signed.completedBy?.display})` });
        await markEvidence(alerted(pageB.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว')), expected(pageB.getByTestId('er-disposition-reopen')));
        await holdForClip(pageB);
      });

      await checkStep(pageB, 'TC-002 (SBH-2491) ขั้น 4 User B กดปุ่มไอคอนประวัติ บนหัวฟอร์ม Disposition', async () => {
        const button = dispositionHistoryButton(pageB);
        await button.hover();
        const tooltip = pageB.getByRole('tooltip', { name: 'ดูประวัติ Disposition' });
        await expect(tooltip).toBeVisible();
        await markEvidence(clicked(button), tooltip);
        await holdForClip(pageB);
        await snapEvidence(pageB, 'ก่อนกด — ปุ่มไอคอน ดูประวัติ Disposition (User B)');
        const view = await viewHistory(pageB, authorizationB, visit, `ประวัติ Disposition ของผู้ป่วยรายที่ 2 — HN ${visit.hn} · ${visit.en}`);
        const drafted = findEntry(view, 'SAVED_DRAFT', draft.updatedAt);
        const finalized = findEntry(view, 'SIGNED', signed.completedAt);
        const names = { a: draft.updatedBy?.display ?? userA.name, b: signed.completedBy?.display ?? userB.name };

        await checkStep(pageB, 'Expected 1 รายการของ User A และ User B แสดงแยกกันคนละรายการ', async () => {
          if (drafted.index >= 0 && finalized.index >= 0) await markEvidence(expected(drafted.entry), expected(finalized.entry));
          else await markEvidence(expected(view.popover));
          await holdForClip(pageB, 3_000);
          expect(view.rows.map(describeDispositionHistoryRow), 'รายการบนหน้าจอต้องตรงกับประวัติของ Encounter นี้จาก API ทุกรายการ').toEqual(view.records.map((record) => describeDispositionHistoryRow(expectedDispositionHistoryRow(record))));
          expect(drafted.index, `ต้องมีรายการ บันทึกฉบับร่าง ของ User A — ที่มี: ${view.rows.map(describeDispositionHistoryRow).join(' | ')}`).toBeGreaterThanOrEqual(0);
          expect(finalized.index, `ต้องมีรายการ ลงนาม ของ User B — ที่มี: ${view.rows.map(describeDispositionHistoryRow).join(' | ')}`).toBeGreaterThanOrEqual(0);
          expect(drafted.index, 'รายการของ User A และ User B ต้องเป็นคนละรายการ').not.toBe(finalized.index);
          expect(drafted.row.actor, 'ผู้ทำของ 2 รายการต้องเป็นคนละชื่อ').not.toBe(finalized.row.actor);
        });

        /** ชื่อผู้ทำต้องเป็นชื่อ ไม่ใช่รหัส (user id / username) — หมายเหตุของ TC */
        const expectDisplayName = (row: DispositionHistoryRow, record: DispositionHistoryRecord, user: { name: string; username: string }, who: string) => {
          expect(row.actor, `${who}: ชื่อผู้ทำต้องไม่ใช่รหัส user id`).not.toBe(record.actor?.id);
          expect(row.actor, `${who}: ชื่อผู้ทำต้องไม่ใช่รหัสรูปแบบ UUID`).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
          expect(row.actor, `${who}: ชื่อผู้ทำต้องไม่ใช่ username`).not.toBe(user.username);
          if (!row.actor.includes(user.name) && !user.name.includes(row.actor)) note(`${who}: ชื่อผู้ทำในประวัติ "${row.actor}" เขียนต่างจากชื่อบัญชีที่ล็อกอิน "${user.name}"`);
        };

        await checkStep(pageB, 'Expected 2 รายการ Save Draft แสดงชื่อ User A', async () => {
          const table = [...entryTable(drafted, { action: 'บันทึกฉบับร่าง', actor: names.a, at: draft.updatedAt! }), { label: 'บัญชีของ User A', values: [drafted.row?.actor ?? '-', `${userA.name} (${userA.username})`], same: drafted.row?.actor === userA.name }];
          await showCompareTable(pageB, 'รายการ Save Draft — ผู้ทำต้องเป็น User A', ['รายการในประวัติ (บนหน้าจอ)', 'ที่ทำจริงในขั้นที่ 1'], table, { side: 'left' });
          await markEvidence(expected(drafted.entry));
          await holdForClip(pageB, 3_000);
          expect(drafted.row.action).toBe('บันทึกฉบับร่าง');
          expect(drafted.row.actor, 'รายการ Save Draft ต้องแสดงชื่อ User A').toBe(names.a);
          expectDisplayName(drafted.row, drafted.record, userA, 'Save Draft');
        });

        await checkStep(pageB, 'Expected 3 รายการ Save Final แสดงชื่อ User B', async () => {
          const table = [...entryTable(finalized, { action: 'ลงนาม', actor: names.b, at: signed.completedAt! }), { label: 'บัญชีของ User B', values: [finalized.row?.actor ?? '-', `${userB.name} (${userB.username})`], same: finalized.row?.actor === userB.name }];
          await showCompareTable(pageB, 'รายการ Save Final — ผู้ทำต้องเป็น User B', ['รายการในประวัติ (บนหน้าจอ)', 'ที่ทำจริงในขั้นที่ 3'], table, { side: 'left' });
          await markEvidence(expected(finalized.entry), ...(await accountMarks(pageB, userB.name)));
          await holdForClip(pageB, 3_000);
          expect(finalized.row.action).toBe('ลงนาม');
          expect(finalized.row.actor, 'รายการ Save Final ต้องแสดงชื่อ User B').toBe(names.b);
          expectDisplayName(finalized.row, finalized.record, userB, 'Save Final');
        });

        // AC: แสดง Disposition Form แยกตาม User — ฟอร์มของแต่ละรายการต้องเป็นค่าที่คนนั้นบันทึก (User B แก้ช่อง ข้อมูลทางคลินิก ก่อนลงนาม)
        await checkStep(pageB, 'Expected 2 ดูฟอร์ม ของรายการ Save Draft — ฟอร์มที่ User A บันทึก', async () => {
          const want = formFields(drafted, visit, { action: 'บันทึกฉบับร่าง', actor: names.a, clinical: TEXT_A, finding: TEXT_A });
          await checkHistoryForm(pageB, drafted, want, 'ดูฟอร์ม ของรายการ Save Draft (User A บันทึก)');
        });
        await checkStep(pageB, 'Expected 3 ดูฟอร์ม ของรายการ Save Final — ฟอร์มที่ User B แก้แล้วลงนาม', async () => {
          const want = formFields(finalized, visit, { action: 'ลงนาม', actor: names.b, clinical: TEXT_B, finding: TEXT_A });
          await checkHistoryForm(pageB, finalized, want, 'ดูฟอร์ม ของรายการ Save Final (User B ลงนาม)');
        });
        await hideCompareTable(pageB);
        await closeDispositionHistoryForm(pageB);
        await closeDispositionHistory(pageB);
      });

      // นอก Test Step: ให้คลิปหลัก (หน้าต่างของ User A) เห็นผลเดียวกัน
      await checkStep(page, 'เพิ่มเติม User A เปิดประวัติของผู้ป่วยรายเดียวกัน — เห็นรายการแยกตาม User เหมือนกัน', async () => {
        await gotoVisit(page, visit);
        await openCarePanel(page, 'Disposition', page.getByRole('main').getByText(DISPOSITION_PANEL, { exact: true }));
        await expect(page.getByTestId('er-disposition-reopen'), 'User A ต้องเห็นว่าฟอร์มถูกลงนามแล้ว').toBeVisible();
        const view = await viewHistory(page, authorization, visit, `ประวัติ Disposition ของผู้ป่วยรายที่ 2 (User A เปิดดู) — HN ${visit.hn} · ${visit.en}`);
        const drafted = findEntry(view, 'SAVED_DRAFT', draft.updatedAt);
        const finalized = findEntry(view, 'SIGNED', signed.completedAt);
        await markEvidence(expected(drafted.entry), expected(finalized.entry), ...(await accountMarks(page, userA.name)));
        await holdForClip(page, 3_500);
        expect(view.rows.map(describeDispositionHistoryRow)).toEqual(view.records.map((record) => describeDispositionHistoryRow(expectedDispositionHistoryRow(record))));
        expect(drafted.row?.actor, 'User A เปิดดู: รายการ Save Draft ต้องเป็นชื่อ User A').toBe(draft.updatedBy?.display);
        expect(finalized.row?.actor, 'User A เปิดดู: รายการ Save Final ต้องเป็นชื่อ User B').toBe(signed.completedBy?.display);
      });
      // ปิดหลังจบ step — ภาพหลักฐานของ step ถ่ายตอนจบ ต้องยังเห็น popover + ตารางเทียบ
      await hideCompareTable(page);
      await closeDispositionHistory(page);
    },
  );
});
