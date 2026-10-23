import type { Browser, Locator, Page, Response } from '@playwright/test';
import { closeCoverageWithEndpoint, closeVisitAtCashier, gotoCashierAccount, payAllInCash } from '../helpers/functions/cashier';
import { expectOk, waitForApi } from '../helpers/functions/er';
import { graphqlMutation } from '../helpers/functions/er-disposition';
import { expected, markEvidence, snapEvidence } from '../helpers/functions/evidence';
import { opdListRow, selectOpdUnit } from '../helpers/functions/opd-activity';
import { capturePrintJobs, openRoleWindow, pdfPages, type PrintJob } from '../helpers/functions/print-capture';
import { expectPatientInfo, fillNewPatientForm, gotoReception, openNewVisitPanel, receptionFrame, saveNewPatient } from '../helpers/functions/reception';
import type { NewPatient } from '../helpers/functions/test-data';
import type { BugDef } from './bizsim';
import { expect } from './fixtures';
import { addCoverageFirst, nextPrefixedPatient, orderAlert } from './uat-er';
import { addMedicineToCart } from './uat-play';

// ขั้นตอนหน้าจอ OPD ของ Scenario BizSim (สำรวจบน SBH Prod 22 ต.ค. 2026 · ไฟล์แอป index-Cl1ec1pi.js · ผู้ป่วยสำรวจ UAT BIZSIM-01 HN 6904452)
// บัญชี: Super_User (user1 = แพทย์ ดร. วิชัย รัตน์ เอื้อเฟื้อ practitioner 1) ทำขั้นเวชระเบียน / คัดกรอง / แพทย์ / ห้องยา / การเงิน
// · Nurse (หน้าต่างแยก) ทำขั้นจำหน่าย — บัญชีแพทย์กดจำหน่ายไม่ได้ ("ผู้ใช้งานบทบาทแพทย์ไม่สามารถจำหน่ายผู้ป่วยได้")

/** คลินิกที่ ดร. วิชัย มีตารางออกตรวจทุกวัน (physician routine 14 · clinic 412 · 07:00–23:00) — คลินิกอายุรกรรมอื่นไม่มีตารางของแพทย์คนนี้ */
export const OPD = {
  clinic: 'คลินิกอายุรกรรมโรคทั่วไป',
  unit: 'แผนกอายุรกรรม',
  service: 'ติดตามอาการ',
  coverage: 'H03 - สิทธิ UC',
  homeMed: { code: 'MED0000619', name: 'PARACETAMOL 500 MG TABLET', qty: '10' },
  dx: { code: 'M545', name: 'Low back pain' },
  pharmacy: { name: 'ห้องยาชั้น 1', counter: '1' },
  /** หน่วยบริการคิวของหน้าคิวการเงิน (บัญชี user1 = การเงินชั้น 1) */
  cashierQueueUnit: 6,
  /** Order ล่วงหน้า (Order สำหรับนัดหมาย) ของ APM-OPD-002 — ผู้ใช้เลือก 22 ต.ค. 2026 */
  futureLab: { code: 'LAB0000001', name: 'Glucose in XXX specimen (32203)' },
  futureImg: { code: 'IMG0000194', name: 'LEFT ANKLE (AP, LATERAL, MORTISE) (41003) {3 Exp.}' },
  /** ห้อง Lab (แอป ห้องปฏิบัติการ) — นัด Lab ของ Order ล่วงหน้าไปที่จุดตรวจ "Lab Room" ซึ่งขึ้นในแท็บนัดหมายของห้องนี้ */
  lab: { room: 'ห้องปฏิบัติการ ชั้น 6', counter: '1' },
  imaging: { room: 'ห้องรังสีและฟลูออโรสโคปี (mock)' },
  // APM-OPD-006 (ผู้ใช้เลือก 22 ต.ค. 2026 · สำรวจ HN 6904477): ยานอกบัญชี = ตัวที่ formularySource เป็น NED จริงบน Prod (NAPROXEN ที่เลือกตอนแรกไม่ติดป้าย NED)
  ned: { code: 'MED0000524', name: 'ATORVASTATIN 20 MG TABLET', qty: '10' },
  /** ยาที่ตั้ง DUE ไว้แล้ว (นโยบาย DUE 9) — ผู้ใช้เลือก "ใช้ยาที่ตั้งไว้แล้ว" ไม่แก้ตั้งค่า Prod */
  due: { code: 'MED0002009', name: 'CELECOXIB 200 MG CAPSULE', qty: '10' },
  /** CDSS: แพ้ยา (บันทึกแพ้ ibuprofen ก่อน) · ยาซ้ำ (homeMed 2 ครั้ง) · ยาตีกัน WARFARIN + ASPIRIN */
  allergy: { code: 'MED0001017', name: 'IBUPROFEN 400 MG TABLET', search: 'ibuprofen', qty: '5' },
  interaction: [
    { code: 'MED0000484', name: 'WARFARIN SODIUM 5 MG TABLET', qty: '10' },
    { code: 'MED0000489', name: 'ASPIRIN 81 MG GASTRO-RESISTANT TABLET', qty: '10' },
  ],
  // APM-OPD-007–010 (สำรวจ SBH Prod 23 ต.ค. 2026 · HN 6904482) — Claude เลือกรายการเอง (ผู้ใช้สั่ง "เริ่ม Flow ข้อ 7-10 ต่อเลย")
  /** ยาฉีด Stat (ติ๊ก STAT → วิธีใช้มี "ทันที" · ประเภทการใช้ In hospital · ห้องยาได้คิว S) */
  stat: { code: 'MED0000756', name: 'DEXAMETHASONE 5 MG/ML, 1 ML INJECTION', qty: '1' },
  /** หัตถการวันนี้ ส่งไป "ห้องทำแผล (mock)" — ไม่เลือกสถานที่ตอนสั่ง = บันทึกหัตถการไม่ได้ (ErrActivityTaskLocationRequired เงียบ) และกำหนดภายหลังไม่ได้ (ErrActivityTaskChargeRehomeLocked) */
  procToday: { code: 'ACT0004950', name: 'การทำแผลแห้ง / แผลเย็บ', location: /ห้องทำแผล/ },
  /** หัตถการล่วงหน้า (วันอื่น = 7 วันจากวันนี้) */
  procFuture: { code: 'ACT0005224', name: 'ECG (Electrocardiography)' },
  /** Refill: ยอด 30 → จ่ายครั้งนี้ 10 + เติม 2 รอบ × 10 ทุก 10 วัน */
  refill: { code: 'MED0000619', name: 'PARACETAMOL 500 MG TABLET', total: '30', everyDays: '10', rounds: ['10', '10'] },
  /** ใบรับรองแพทย์: เมนูขวา = ลาป่วย · เมนูเอกสาร = ใบขับขี่ */
  certPanel: 'ใบรับรองแพทย์ลาป่วย',
  certDocument: 'ใบรับรองแพทย์ใบขับขี่',
};

/** บั๊กที่ Scenario OPD ตรวจ — เลข known = คอลัมน์ No. ของชีต Bug list (OPDBIzSim) */
export const BUGS = {
  opdNoteSlow: { known: 2, title: '(OPD Note) บันทึกแล้วไม่ Save ให้ หรือ ช้า', module: 'OPD Note', type: 'Bug', priority: 'High' },
  apptSlipProcedure: { known: 3, title: 'สั่งยา แต่ขึ้นเป็นหมวด Procedure ในเอกสารนัดหมาย', module: 'Appointment/เอกสารนัดหมาย', type: 'Bug', priority: 'High' },
  queueTemplate: { known: 4, title: 'ไม่สามารถปริ้นบัตรคิวห้องยาได้', module: 'Section Discharge/ OPD Note', type: 'Config', priority: 'Low' },
  cashierQueue: { known: 7, title: 'ไม่สามารถชำระได้เนื่องจากไม่มี Queue การเงิน', module: 'Discharge, รายการคิว', type: 'Bug', priority: 'Low' },
  visitSlip: { known: 9, title: 'ยังไม่มีใบนำทาง', module: 'Register / จัดการ Visit', type: 'Improvement', priority: 'High' },
  drugLabel: { known: 21, title: 'ยังไม่สามารถพิมพ์ฉลากยาได้', module: 'ห้องยา / Prescription', type: 'Data Config', priority: 'Low' },
  labApptStuck: { known: 10, title: 'Lab มีรายการนัดหมายแต่ไม่สามารถทำอะไรต่อได้', module: 'Lab / นัดหมาย', type: 'Bug', priority: 'High' },
  xrayFromAppt: { known: 11, title: 'X-Ray ไม่มีรายการขึ้นที่ห้องปฏิบัติการ ในกรณีที่เพิ่ม Order ผ่าน Appointment', module: 'รังสี / นัดหมาย', type: 'Bug', priority: 'High' },
  labResult: { known: 12, title: 'Lab ไม่สามารถส่งผลกลับมาได้ (Save Result แล้วขึ้น Error)', module: 'Lab / รายละเอียด Lab Task', type: 'Bug', priority: 'High' },
  specimenSticker: { known: 14, title: 'ไม่สามารถปริ้นป้ายติด Speciment ได้', module: 'Lab / รอเก็บ', type: 'Config', priority: 'High' },
  imgApptCheckin: { known: 34, title: 'Imaging ที่มาจากนัดหมายไม่ไปแสดงที่รอเช็คอิน', module: 'รังสี / นัดหมาย', type: 'Bug', priority: 'High' },
  // บั๊กใหม่ (22 ต.ค. 2026) — ชื่อคงที่ ตัว Log ใช้ชื่อกันแถวซ้ำ
  apptSlip404: {
    title: 'พิมพ์บัตรนัด / ใบนัด (TH/EN) ไม่ได้ — POST /cortex-api/documents/generate 404 ReportNotFound',
    module: 'Appointment / สร้างนัดหมาย, ประวัติการนัดหมาย',
    type: 'Config',
    priority: 'High',
  },
  dischargeFalseError: {
    title: 'บันทึก Discharge สำเร็จ (COMPLETE) แต่ขึ้นแจ้งเตือน "บันทึกข้อมูลจำหน่ายไม่สำเร็จ: เกิดข้อผิดพลาดในระบบ" (dischargeEncounterStatus ซ้ำได้ ErrNotAllowDischargeEncounter)',
    module: 'Section Discharge',
    type: 'Bug',
    priority: 'Medium',
  },
  rxCreate500: {
    title: 'ห้องยากดสร้างใบยาไม่ได้ — POST /cortex-api/opd/prescriptions 500 composition validation failed (english_directions / overall_directions_description_en)',
    module: 'ห้องยา / สร้างใบยา',
    type: 'Bug',
    priority: 'Urgent',
  },
  labImgOrderFail: {
    title: 'แพทย์สั่ง Lab / IMG (ประเภทวันนี้) จาก CPOE ไม่ได้ — กดเพิ่มลงตะกร้าแล้ว UpsertOpdOrder error composition validation failed (document_metadata/location) หน้าจอขึ้นแค่ "เกิดข้อผิดพลาดในระบบ"',
    module: 'CPOE / Order (Lab, Imaging)',
    type: 'Bug',
    priority: 'Urgent',
  },
  pharmacyQueueNoRx: {
    title: 'Discharge ผู้ป่วยที่ไม่มีการสั่งยา ยังมีบัตรคิวห้องยาให้พิมพ์ (การจัดการหลังตรวจ)',
    module: 'Section Discharge',
    type: 'Bug',
    priority: 'Medium',
  },
  dueOrderBlocked: {
    title: 'สั่งยาที่ติด DUE ไม่ได้ — คำขอ DUE ค้างสถานะ DRAFT (ไม่มีฟอร์ม DUE ให้กรอก · ห้องยาไม่เห็นคำขอ) ส่งคำสั่งแล้ว signOPDOrders "medication due form is incomplete" หน้าจอขึ้นแค่ "เกิดข้อผิดพลาดในระบบ"',
    module: 'CPOE / ยาที่ต้องมีเอกสารประกอบ (DUE)',
    type: 'Config',
    priority: 'High',
  },
  dupAlertRawKeys: {
    title: 'หน้าต่าง Drug Alert (Drug Duplication) แสดงคีย์ดิบ matchBasis / timeBasis / copyReasonToAll',
    module: 'CPOE / Drug Alert',
    type: 'Bug',
    priority: 'Low',
  },
  createFormLoad: {
    title: 'เมนู สร้างฟอร์ม ขึ้นแถบแดง "โหลดกลุ่มแบบฟอร์มหรือร่างไม่สำเร็จ กรุณาลองโหลดใหม่"',
    module: 'EMR / สร้างฟอร์ม',
    type: 'Bug',
    priority: 'Medium',
  },
  imgResult500: {
    title: 'ห้องรังสีบันทึกรายงานผลตรวจไม่ได้ — POST /cortex-api/imaging-results 500 composition validation failed (reported_by)',
    module: 'รังสี / รายละเอียดรังสี (รายงานผลตรวจทางรังสี)',
    type: 'Bug',
    priority: 'Urgent',
  },
  // บั๊กใหม่ (23 ต.ค. 2026 · APM-OPD-007–010)
  rxWarehouse: {
    title: 'ห้องยาชั้น 1 สร้างใบยาไม่ได้ — POST /cortex-api/opd/prescriptions 400 "warehouse is not allowed for pharmacy room" (คลังยาสำหรับหักสต็อกมีให้เลือกแค่ คลังยา A)',
    module: 'ห้องยา / สร้างใบยา (คลังยา)',
    type: 'Config',
    priority: 'Urgent',
  },
  procNoIcd9: {
    title: 'รายการหัตถการที่สั่ง (CPOE) ไม่แสดงรหัส ICD9 — แสดงแค่รหัสสินค้า ACT / ชื่อ / จำนวน / ราคา',
    module: 'CPOE / Order หัตถการ',
    type: 'Improvement',
    priority: 'Low',
  },
  certFee: {
    title: 'สร้างใบรับรองแพทย์แล้วไม่มีค่าธรรมเนียมใบรับรองแพทย์ในรายการค่าใช้จ่าย (Chart item) ที่การเงิน',
    module: 'การเงิน / ใบรับรองแพทย์',
    type: 'Config',
    priority: 'Medium',
  },
} satisfies Record<string, BugDef>;

export type PrintCapture = Awaited<ReturnType<typeof capturePrintJobs>>;

const options = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });

/** ลงทะเบียนผู้ป่วยใหม่ที่เวชระเบียน ชื่อ "UAT BIZSIM-<case>-<ลำดับ>" → HN (ค้างอยู่หน้าข้อมูลผู้ป่วย) */
export async function registerBizSimPatient(page: Page, authorization: string, caseId: string): Promise<{ patient: NewPatient; hn: string }> {
  const patient = await nextPrefixedPatient(page, authorization, `BIZSIM-${caseId.replace(/-OPD-/, '')}-`);
  await gotoReception(page);
  await fillNewPatientForm(page, patient);
  const hn = await saveNewPatient(page);
  return { patient, hn };
}

/** ช่องในฟอร์มสร้างนัดหมาย (ตามป้าย) */
function apptItem(page: Page, label: string): Locator {
  return page.getByRole('main').locator('.ant-form-item').filter({ has: page.locator(`label:text-is("${label}")`) }).filter({ visible: true }).first();
}

export interface Appointment {
  id: string;
  start: string;
  /** error ของการพิมพ์บัตรนัดอัตโนมัติหลังสร้าง (ไม่มี = พิมพ์ได้ / ไม่ได้สั่งพิมพ์) */
  slipError?: string;
}

/**
 * เมนูขวา "สร้างนัดหมาย": คลินิก (ตั้งต้นคลินิกของ Visit) · แพทย์ = ผู้ที่ล็อกอิน · ประเภทบริการ → ปฏิทิน (title = YYYY-MM-DD ค.ศ.)
 * → รายการช่วงเวลา (radio · ช่วงแรกที่ว่างถูกเลือกให้) → `Submit` → graphql CreatePhysicianAppointment
 * → แอปสั่งพิมพ์บัตรนัดเอง `POST /cortex-api/documents/generate` (SBH Prod 22 ต.ค. 2026: 404 ReportNotFound)
 * `date` = 'today' เลือกวันนี้ · ไม่ใส่ = วันที่ระบบเลือกให้ตาม "ระยะเวลา 2 สัปดาห์"
 */
export async function createAppointment(page: Page, opts: { date?: 'today' } = {}): Promise<Appointment> {
  const main = page.getByRole('main');
  await page.getByRole('menuitem', { name: /สร้างนัดหมาย$/ }).click({ force: true });
  const service = main.locator('.ant-select[name="serviceType"]').filter({ visible: true }).first();
  await expect(service).toBeVisible({ timeout: 60_000 });
  // แท็บทะเบียนผู้ป่วยเบียดแผง + เมนูขวากางค้างบังช่อง → ปิดแท็บ / ย้ายเมาส์ / คลิกหัวแผง
  const registry = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: 'ทะเบียนผู้ป่วย' });
  if (await registry.count()) await registry.locator('.dv-default-tab-action').click();
  await page.mouse.move(600, 600);
  await main.getByText('สร้างนัดหมาย', { exact: true }).filter({ visible: true }).first().click();

  const clinic = apptItem(page, 'คลินิก/หน่วยบริการ:');
  if (!(await clinic.innerText()).includes(OPD.clinic)) {
    await clinic.locator('.ant-select').click();
    await page.keyboard.type(OPD.clinic.replace('คลินิก', ''), { delay: 30 });
    await options(page).filter({ hasText: new RegExp(`^${OPD.clinic}$`) }).first().click();
  }
  await expect(apptItem(page, 'แพทย์:')).toContainText('วิชัย');
  if (!(await service.innerText()).includes(OPD.service)) {
    await service.click();
    await options(page).filter({ hasText: new RegExp(`^${OPD.service}$`) }).first().click();
  }
  const calendar = main.locator('.ant-picker-calendar').filter({ visible: true }).first();
  if (opts.date === 'today') await pickCalendarDay(page, calendar, today());
  // ช่วงเวลา: radio ตัวแรกที่กดได้ (ช่วงที่ผ่านมาแล้วถูกซ่อน)
  const slot = main.locator('.ant-radio-wrapper').filter({ hasText: /\d\d:\d\d - \d\d:\d\d/ }).filter({ visible: true });
  await expect(slot.first(), 'ต้องมีช่วงเวลานัดของแพทย์ให้เลือก').toBeVisible({ timeout: 30_000 });
  const chosen = slot.filter({ has: page.locator('.ant-radio-checked') });
  if (!(await chosen.count())) await slot.filter({ hasNot: page.locator('.ant-radio-disabled') }).first().click();
  const picked = slot.filter({ has: page.locator('.ant-radio-checked') }).first();
  const pickedDate = (await calendar.locator('td.ant-picker-cell-selected').getAttribute('title')) ?? today();
  const pickedTime = ((await picked.innerText()).match(/(\d\d:\d\d) - /) ?? [])[1] ?? '00:00';
  await markEvidence(expected(calendar), expected(picked));
  await snapEvidence(page, 'ก่อนกด — สร้างนัดหมาย');

  const created = graphqlMutation(page, 'CreatePhysicianAppointment', 60_000);
  const slip = waitForApi(page, 'POST', '/cortex-api/documents/generate', 15_000).catch(() => undefined);
  await main.getByRole('button', { name: /Submit/ }).filter({ visible: true }).first().click();
  // มีนัดอื่นในวันเดียวกัน → "พบการนัดหมายซ้ำ" → ยืนยันทำนัดหมายซ้ำ
  const duplicate = page.getByRole('button', { name: 'ยืนยันทำนัดหมายซ้ำ' });
  if (await duplicate.waitFor({ timeout: 8_000 }).then(() => true, () => false)) await duplicate.click();
  const body = (await (await created).json()) as { data?: { createPhysicianAppointment?: { id: string; start?: string } }; errors?: { message: string }[] };
  const appt = body.data?.createPhysicianAppointment;
  if (!appt) throw new Error(`สร้างนัดหมายไม่สำเร็จ:${body.errors?.map((e) => e.message).join(' · ') ?? JSON.stringify(body).slice(0, 300)}`);
  const slipRes = await slip;
  const slipError = slipRes && !slipRes.ok() ? `${slipRes.status()} ${(await slipRes.text().catch(() => '')).slice(0, 160)}` : undefined;
  return { id: appt.id, start: appt.start || `${pickedDate}T${pickedTime}:00+07:00`, slipError };
}

const todayDay = () => String(Number(today().split('-')[2]));

/** ปฏิทินของแผงสร้างนัดหมาย (td[title=YYYY-MM-DD] ค.ศ.) → เลือกวัน · ปฏิทินเปิดคนละเดือนให้เปลี่ยนเดือนก่อน (select ตัวที่ 2) */
async function pickCalendarDay(page: Page, calendar: Locator, ymd: string) {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const want = months[Number(ymd.split('-')[1]) - 1];
  const month = calendar.locator('.ant-select').nth(1);
  if ((await month.innerText()).trim() !== want) {
    await month.click();
    await options(page).filter({ hasText: new RegExp(`^${want.replace(/\./g, '\\.')}$`) }).click();
  }
  await calendar.locator(`td[title="${ymd}"]`).click();
}

/** ช่อง Order Search ในหน้าต่าง → พิมพ์รหัส → เลือกตัวเลือก [รหัส] (ฟอร์มของรายการเปิดต่อ) */
async function searchOrder(page: Page, scope: Locator, code: string) {
  const box = scope.getByPlaceholder(/ค้นหา ยา, เวชภัณฑ์/);
  await box.click();
  // ช่องค้างข้อความรายการก่อนหน้า (เช่น สั่งไม่สำเร็จแล้วฟอร์มค้าง) → ล้างก่อนพิมพ์
  await box.fill('');
  await page.keyboard.type(code, { delay: 30 });
  const option = options(page).filter({ hasText: `[${code}]` }).first();
  await expect(option, `ค้นหา ${code} ต้องเจอรายการ`).toBeVisible({ timeout: 30_000 });
  await option.click();
}

/**
 * แพทย์ทำนัดวันนี้ (ช่วงถัดไป) พร้อม Order ล่วงหน้า LAB + IMG จากหัวแผงคำสั่งการรักษา (สำรวจ SBH Prod 22 ต.ค. 2026 · ผู้ป่วยสำรวจ HN 6904461):
 * "กำหนดระยะคำนวณจ่าย หรือทำนัดหมายแพทย์" → ระยะเวลา 1 (ปุ่มค้นหาของข้อมูลนัดหมายกดได้เมื่อมีระยะเวลา) → `ค้นหา` = แผงสร้างนัดหมาย → วันนี้ + ช่วงเวลาถัดไป
 * → `+ เพิ่ม Order` → หน้าต่าง "Order สำหรับนัดหมาย" ("รายการจะถูกกำหนดเป็น Scheduled ตามวันนัด และบันทึกเมื่อกดสร้างนัดหมายเท่านั้น")
 *   · Lab: ช่อง "วันที่ต้องการผล" (เลือกวันเวลา) = หน้าต่าง "นัดหมาย LAB" (จุดตรวจ Lab Room · วัน + ช่วงเวลา → ยืนยัน)
 *   · IMG: ปุ่มปฏิทินของช่อง "ห้องตรวจ" = หน้าต่าง "เลือกห้อง Imaging" (ต้องคลิกวันก่อน → เลือก) ไม่งั้น "กรุณาเลือกนัดหมายรังสี"
 * → ยืนยัน → `Submit` → (มีนัดวันเดียวกันอยู่แล้ว) "พบการนัดหมายซ้ำ" → `ยืนยันทำนัดหมายซ้ำ` → graphql CreatePhysicianAppointment
 */
export async function createAppointmentWithFutureOrders(page: Page): Promise<Appointment> {
  const main = page.getByRole('main');
  const head = page.getByText('กำหนดระยะคำนวณจ่าย หรือทำนัดหมายแพทย์').first().locator('xpath=ancestor::*[contains(normalize-space(.),"แพทย์ผู้สั่ง")][1]');
  await expect(head).toBeVisible({ timeout: 120_000 });
  const period = head.locator('input#periodValue');
  if (!(await period.inputValue())) await period.fill('1');
  // ประเภทเริ่มต้น "วันอื่น" (ตอนสำรวจกดก่อนเปิดแผงนัด) · ปุ่มค้นหากดได้เมื่อมีระยะเวลา แต่คลิกแรกหลังกรอกบางครั้งไม่เปิดแผง → กดซ้ำจนปฏิทินขึ้น
  await head.getByText('วันอื่น', { exact: true }).click();
  const search = head.getByRole('button', { name: /ค้นหา/ });
  await expect(search).toBeEnabled();
  const calendar = main.locator('.ant-picker-calendar').filter({ visible: true }).first();
  await expect(async () => {
    await search.click();
    await expect(calendar).toBeVisible({ timeout: 10_000 });
  }, 'แผงสร้างนัดหมายต้องเปิดหลังกดค้นหาของข้อมูลนัดหมาย').toPass({ timeout: 60_000 });
  await pickCalendarDay(page, calendar, today());
  // ช่วงแรกที่เห็น = ช่วงเวลาปัจจุบัน (นัดของ Visit ครั้งก่อน) → ใช้ช่วงถัดไป
  const slot = main.locator('.ant-radio-wrapper').filter({ hasText: /\d\d:\d\d - \d\d:\d\d/ }).filter({ visible: true }).filter({ hasNot: page.locator('.ant-radio-disabled') });
  await expect(slot.first(), 'ต้องมีช่วงเวลานัดของแพทย์วันนี้ให้เลือก').toBeVisible({ timeout: 30_000 });
  const picked = (await slot.count()) > 1 ? slot.nth(1) : slot.first();
  const pickedTime = ((await picked.innerText()).match(/(\d\d:\d\d) - /) ?? [])[1] ?? '00:00';
  await picked.click();

  await main.getByRole('button', { name: /เพิ่ม Order/ }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Order สำหรับนัดหมาย' });
  await expect(dialog).toBeVisible();
  // LAB + นัดหมาย LAB
  await searchOrder(page, dialog, OPD.futureLab.code);
  await dialog.getByText('เลือกวันเวลา').click();
  const labAppt = page.getByRole('dialog').filter({ hasText: 'นัดหมาย LAB' });
  await expect(labAppt).toBeVisible();
  await labAppt.getByText(todayDay(), { exact: true }).first().click();
  const labSlot = labAppt.getByText(/^\d\d:\d\d - \d\d:\d\d$/).first();
  await expect(labSlot, 'นัด Lab ต้องมีช่วงเวลาวันนี้').toBeVisible({ timeout: 20_000 });
  await labSlot.click();
  await labAppt.getByRole('button', { name: /^ยืนยัน$/ }).click();
  await expect(labAppt).toBeHidden();
  await dialog.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).click();
  await expect(dialog.getByRole('row').filter({ hasText: OPD.futureLab.name }), 'Lab ต้องเข้าตะกร้าของนัด').toBeVisible({ timeout: 20_000 });
  // IMG + ห้องตรวจ (นัดรังสี)
  await searchOrder(page, dialog, OPD.futureImg.code);
  const room = dialog.locator('.ant-form-item').filter({ hasText: 'ห้องตรวจ' }).first();
  await room.getByRole('button').first().click();
  const imgAppt = page.getByRole('dialog').filter({ hasText: 'เลือกห้อง Imaging' });
  await expect(imgAppt).toBeVisible();
  await imgAppt.getByText(todayDay(), { exact: true }).first().click();
  await imgAppt.getByRole('button', { name: /^เลือก$/ }).click();
  await expect(room, 'ช่องห้องตรวจต้องได้วันนัดรังสี').toContainText(/\d\d\/\d\d\/\d{4}/);
  await dialog.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).click();
  const imgRow = dialog.getByRole('row').filter({ hasText: OPD.futureImg.name.slice(0, 20) });
  await expect(imgRow, 'IMG ต้องเข้าตะกร้าของนัด').toBeVisible({ timeout: 20_000 });
  await markEvidence(expected(dialog.getByRole('row').filter({ hasText: OPD.futureLab.name })), expected(imgRow));
  await snapEvidence(page, 'Order สำหรับนัดหมาย');
  await dialog.getByRole('button', { name: /^ยืนยัน$/ }).click();
  await expect(main.getByRole('button', { name: /เพิ่ม Order \(2\)/ })).toBeVisible();

  const created = graphqlMutation(page, 'CreatePhysicianAppointment', 90_000);
  const slip = waitForApi(page, 'POST', '/cortex-api/documents/generate', 30_000).catch(() => undefined);
  await main.getByRole('button', { name: /Submit/ }).filter({ visible: true }).first().click();
  const duplicate = page.getByRole('button', { name: 'ยืนยันทำนัดหมายซ้ำ' });
  if (await duplicate.waitFor({ timeout: 15_000 }).then(() => true, () => false)) await duplicate.click();
  const body = (await (await created).json()) as { data?: { createPhysicianAppointment?: { id: string; start?: string } }; errors?: { message: string }[] };
  const appt = body.data?.createPhysicianAppointment;
  if (!appt) throw new Error(`สร้างนัดหมายพร้อม Order ล่วงหน้าไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ') ?? JSON.stringify(body).slice(0, 300)}`);
  const slipRes = await slip;
  const slipError = slipRes && !slipRes.ok() ? `${slipRes.status()} ${(await slipRes.text().catch(() => '')).slice(0, 160)}` : undefined;
  return { id: appt.id, start: appt.start || `${today()}T${pickedTime}:00+07:00`, slipError };
}

/**
 * CPOE ของ Visit: สั่ง Lab / IMG ประเภท "วันนี้" (ตั้งต้น · ช่อง "วันที่ต้องการผล" ถูกปิด) → `เพิ่มลงตะกร้า` (UpsertOpdOrder) → `ส่งคำสั่ง` (SignOPDOrders)
 * SBH Prod 22 ต.ค. 2026 บ่าย (สำรวจ HN 6904461): UpsertOpdOrder ตอบ errors "lab|imaging order creation: db records: composition validation failed … document_metadata/location" หน้าจอขึ้นแค่ "เกิดข้อผิดพลาดในระบบ" ฟอร์มค้าง ตะกร้าว่าง
 */
export async function orderTodayInvestigation(page: Page, code: string): Promise<{ error?: string; dueDisabled: boolean; target: Locator }> {
  const main = page.getByRole('main');
  await searchOrder(page, main, code);
  const form = main.locator('form').filter({ hasText: /เพิ่มลงตะกร้า/ }).filter({ visible: true }).last();
  await expect(form).toBeVisible({ timeout: 30_000 });
  const type = form.locator('.ant-form-item').filter({ hasText: 'ประเภท' }).first();
  const today = type.locator('input[type=radio][value="today"]');
  if (!(await today.isChecked())) await type.getByText('วันนี้', { exact: true }).click();
  const due = form.locator('.ant-form-item').filter({ hasText: 'วันที่ต้องการผล' }).first();
  const dueInput = due.locator('input').first();
  const dueDisabled = (await dueInput.count()) ? await dueInput.isDisabled() : true;
  await markEvidence(expected(type), expected(due));
  await snapEvidence(page, `ก่อนกด — เพิ่ม ${code}`);
  const upserted = graphqlMutation(page, 'UpsertOpdOrder', 30_000);
  await form.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).click();
  const body = (await (await upserted).json()) as { errors?: { message: string }[] };
  if (body.errors?.length) return { error: body.errors.map((e) => e.message).join(' · ').slice(0, 320), dueDisabled, target: form };
  const row = main.getByRole('row').filter({ hasText: `[${code}]` }).first();
  await expect(row, `${code} ต้องขึ้นในตะกร้า`).toBeVisible({ timeout: 60_000 });
  const signed = graphqlMutation(page, 'SignOPDOrders', 60_000);
  await main.getByRole('button', { name: /ส่งคำสั่ง/ }).first().click();
  const sign = (await (await signed).json()) as { data?: { signOPDOrders?: { accepted?: boolean } }; errors?: { message: string }[] };
  if (!sign.data?.signOPDOrders?.accepted) return { error: `ส่งคำสั่งไม่สำเร็จ: ${sign.errors?.map((e) => e.message).join(' · ') ?? JSON.stringify(sign).slice(0, 200)}`, dueDisabled, target: row };
  await markEvidence(expected(row));
  return { dueDisabled, target: row };
}

/**
 * เมนูขวา "ค่าตรวจแพทย์" → แผง "ค่าแพทย์" (การเรียกเก็บ ต้องการเก็บ · จำนวนเงิน 200 ตั้งต้น · ราคาที่กำหนด 0–800) → `บันทึก`
 * → graphql UpsertDoctorFee accepted → หัวแผงเป็น "บันทึกแล้ว" · การเงินได้รายการ "MED058 - ค่าตรวจแพทย์" (UC เบิกไม่ได้ · SBH Prod 22 ต.ค. 2026)
 */
export async function saveDoctorFee(page: Page): Promise<string> {
  const main = page.getByRole('main');
  const head = main.getByText('ค่าแพทย์', { exact: true }).filter({ visible: true }).first();
  // แผงเปิดเองอยู่ท้ายแผงคำสั่งการรักษาได้ (APM-OPD-005) — กดเมนูซ้ำตอนเปิดอยู่อาจปิดแผง
  if (!(await head.isVisible())) {
    await page.getByRole('menuitem', { name: /ค่าตรวจแพทย์$/ }).dispatchEvent('click');
    await page.mouse.move(900, 600);
  }
  await expect(head).toBeVisible({ timeout: 60_000 });
  await head.scrollIntoViewIfNeeded();
  const panel = head.locator('xpath=ancestor::*[.//button][2]');
  const amount = await panel.getByRole('spinbutton').first().inputValue();
  if (!(await panel.getByText('บันทึกแล้ว').count())) {
    const saved = graphqlMutation(page, 'UpsertDoctorFee', 60_000);
    // ชื่อปุ่มมีไอคอนนำหน้า ("save บันทึก")
    await panel.getByRole('button', { name: /บันทึก$/ }).first().click();
    const body = (await (await saved).json()) as { data?: { upsertDoctorFee?: { accepted?: boolean } }; errors?: { message: string }[] };
    expect(body.data?.upsertDoctorFee?.accepted, `บันทึกค่าแพทย์ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
  }
  await expect(panel.getByText('บันทึกแล้ว')).toBeVisible({ timeout: 30_000 });
  await markEvidence(expected(panel));
  return amount;
}

/** ห้องยา (ห้องยาชั้น 1): ไล่แท็บ Order รอยืนยัน → จ่ายยาแล้ว ว่ามีแถวของ HN นี้ไหม (ช่องค้นหาบนแถบหัวไม่กรองรายการ) → คืนชื่อแท็บที่เจอ */
export async function pharmacyTabsWithPatient(page: Page, hn: string): Promise<{ found: string[]; target: Locator }> {
  await gotoPharmacy(page);
  const main = page.getByRole('main');
  const found: string[] = [];
  let target: Locator = main.getByRole('tab').first();
  for (const name of ['Order รอยืนยัน', 'ใบยารอจัด', 'ใบยาจัดแล้ว', 'ใบรอจ่าย', 'จ่ายยาแล้ว']) {
    // ชื่อแท็บมีไอคอนนำหน้า → ไม่ยึดต้นข้อความ
    const tab = main.getByRole('tab', { name: new RegExp(name) });
    await tab.click();
    // รอตารางโหลด (มีแถว หรือ ข้อความว่าง)
    await expect(main.locator('tr.ant-table-row, .ant-table-placeholder').filter({ visible: true }).first()).toBeVisible({ timeout: 60_000 });
    const rows = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `HN ${hn}` });
    if (await rows.count()) {
      found.push(name);
      target = rows.first();
    }
    if (name === 'Order รอยืนยัน' && !found.length) {
      await markEvidence(expected(tab));
      await snapEvidence(page, 'ห้องยา — Order รอยืนยัน');
    }
  }
  if (found.length) await markEvidence(expected(target));
  return { found, target };
}

/** แพทย์ที่รับ Consult บน SBH Prod = บัญชี Doctor ของ .env.sbh-prod (นาย กันตวิทย์ สวนทวี) */
export const CONSULT_DOCTOR = { search: 'สวนทวี', name: /กันตวิทย์/ };

/** เปิด EMR ของ Visit ตรงด้วย URL (preset=opdV2) */
export async function gotoEmr(page: Page, hn: string, vn: string, en: string) {
  await page.goto(`/cortex/next/patients/${hn}?en=${en}&vn=${vn}&fromApp=opd&preset=opdV2`);
  await expect(page.getByRole('main').getByRole('tab', { name: 'OPD Note' })).toBeVisible({ timeout: 120_000 });
}

/**
 * ผู้ป่วยนอก › รายการปรึกษาแพทย์ (`/cortex/opd/consult-request-list?tab=receive|send`) ค้น HN → แถวของคำขอ (มีข้อความ `problem`)
 * แถว: ความเร่งด่วน · HN · ชื่อ · ขอปรึกษา · Consult Problem · ผู้ส่ง · คลินิก · วันส่ง · สถานะ (รอตอบกลับ / ตอบแล้ว) · ปุ่ม `ตอบกลับ consult` (ทั้ง 2 แท็บ)
 */
export async function consultListRow(page: Page, hn: string, tab: 'receive' | 'send', problem: string): Promise<Locator> {
  await page.goto(`/cortex/opd/consult-request-list?tab=${tab}`);
  const main = page.getByRole('main');
  const search = main.getByPlaceholder('ค้นหา HN');
  await search.waitFor({ timeout: 120_000 });
  const row = main.locator('tr.ant-table-row').filter({ hasText: hn }).filter({ hasText: problem }).first();
  await expect(async () => {
    await search.fill(hn);
    await search.press('Enter');
    await expect(row).toBeVisible({ timeout: 15_000 });
  }, `รายการปรึกษาแพทย์ (${tab}) ต้องมีคำขอของ HN ${hn}`).toPass({ timeout: 90_000 });
  return row;
}

/**
 * แพทย์ที่ถูกขอปรึกษา: แถวในแท็บรับ Consult → `ตอบกลับ consult` → หน้าต่าง "Consult" (รายละเอียดคำขอ + ปุ่ม ดูข้อมูลการรักษา · การตอบ Consult: ตอบ / ปฏิเสธ · คำตอบ (editor แรก) · ข้อแนะนำ)
 * → `บันทึก` → "ยืนยันการบันทึกข้อมูล…" `ยืนยัน` → graphql CompleteConsultRequest (latestStatusCode completed) → แถวเป็น "ตอบแล้ว" (SBH Prod 22 ต.ค. 2026)
 */
export async function answerConsultFromList(page: Page, hn: string, problem: string, answer: string): Promise<{ status: string; row: Locator }> {
  const row = await consultListRow(page, hn, 'receive', problem);
  await expect(row).toContainText('รอตอบกลับ');
  await markEvidence(expected(row));
  await snapEvidence(page, 'รับ Consult — รอตอบกลับ');
  await row.getByRole('button', { name: 'ตอบกลับ consult' }).click();
  const dialog = page.getByRole('dialog', { name: /Consult/ }).first();
  await expect(dialog.getByText('การตอบ Consult')).toBeVisible({ timeout: 30_000 });
  await dialog.locator('[contenteditable="true"]').first().fill(answer);
  await dialog.getByRole('checkbox', { name: 'Print ใบนัดอัตโนมัติ' }).uncheck().catch(() => undefined);
  await markEvidence(expected(dialog.locator('[contenteditable="true"]').first()));
  await snapEvidence(page, 'ก่อนกด — ตอบ Consult');
  const completed = graphqlMutation(page, 'CompleteConsultRequest', 60_000);
  await dialog.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await page.getByRole('dialog', { name: /ยืนยันการบันทึกข้อมูล/ }).getByRole('button', { name: 'ยืนยัน' }).click();
  const body = (await (await completed).json()) as { data?: { completeConsultRequest?: { latestStatusCode?: string } }; errors?: { message: string }[] };
  const status = body.data?.completeConsultRequest?.latestStatusCode ?? `error: ${body.errors?.map((e) => e.message).join(' · ')}`;
  await expect(row, 'ตอบแล้วแถวต้องเป็น "ตอบแล้ว"').toContainText('ตอบแล้ว', { timeout: 30_000 });
  await markEvidence(expected(row));
  return { status, row };
}

/** แพทย์เจ้าของไข้: แท็บส่ง Consult → แถว "ตอบแล้ว" → `ตอบกลับ consult` = หน้าต่างรายละเอียด (ส่วน "คำตอบ" + ผู้ตอบ) → คืนข้อความหน้าต่าง แล้วปิด */
export async function readConsultAnswer(page: Page, hn: string, problem: string, answerText: string): Promise<string> {
  const row = await consultListRow(page, hn, 'send', problem);
  await expect(row, 'แท็บส่ง Consult ต้องเป็นสถานะ ตอบแล้ว').toContainText('ตอบแล้ว', { timeout: 30_000 });
  await row.getByRole('button', { name: 'ตอบกลับ consult' }).click();
  const dialog = page.getByRole('dialog', { name: /Consult/ }).first();
  // ส่วนคำตอบอยู่ท้ายหน้าต่าง (ต้องเลื่อน) — ตีกรอบหัว "คำตอบ" + ข้อความคำตอบ (กรอบที่ parent ของป้ายหลุดเป็นกล่องว่าง)
  const answer = dialog.getByText(answerText).first();
  await expect(answer, 'หน้าต่างต้องแสดงคำตอบของแพทย์ผู้รับ Consult').toBeVisible({ timeout: 30_000 });
  await answer.scrollIntoViewIfNeeded();
  const text = (await dialog.innerText()).replace(/\s+/g, ' ');
  await markEvidence(expected(dialog.getByText('คำตอบ', { exact: true }).first()), expected(answer));
  await snapEvidence(page, 'คำตอบ Consult (ผู้ขอ)');
  await dialog.getByRole('button', { name: 'ปิด' }).last().click();
  return text;
}

/** เมนูซ้าย "รายการ Order ล่วงหน้า" → แถวของ LAB / IMG (ข้อความแถว) */
export async function futureOrderRows(page: Page): Promise<string[]> {
  await page.getByRole('menuitem', { name: /รายการ Order ล่วงหน้า$/ }).dispatchEvent('click');
  await page.mouse.move(900, 600);
  const table = page.getByRole('main').getByRole('table').filter({ hasText: 'รายการ Order' }).filter({ visible: true }).first();
  const rows = table.locator('tr').filter({ hasText: new RegExp(`${OPD.futureLab.code}|${OPD.futureImg.code}`) });
  await expect(rows, 'รายการ Order ล่วงหน้าต้องมี LAB + IMG').toHaveCount(2, { timeout: 60_000 });
  await markEvidence(expected(rows.nth(0)), expected(rows.nth(1)));
  return (await rows.allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
}

/** ช่อง select ของ Ant Design: ค่าปัจจุบันตรงแล้วไม่ต้องเลือก · ไม่ตรง = คลิกแล้วเลือกตัวเลือกที่ตรง */
async function chooseOption(page: Page, select: Locator, want: string | RegExp) {
  const current = ((await select.locator('.ant-select-selection-item').first().textContent({ timeout: 2_000 }).catch(() => '')) ?? '').trim();
  if (current && (typeof want === 'string' ? current === want : want.test(current))) return;
  await select.click();
  await options(page).filter({ hasText: want }).first().click();
}

/** แอปห้องปฏิบัติการ → เลือกห้อง + ช่องบริการ → รายการงานแล็บ (วันนี้) */
export async function gotoLabWorklist(page: Page) {
  const main = page.getByRole('main');
  await page.goto('/cortex/lab/select-location');
  const selects = main.locator('.ant-select');
  await expect(selects.first()).toBeVisible({ timeout: 120_000 });
  await chooseOption(page, selects.nth(0), OPD.lab.room);
  await expect(selects.nth(1)).toBeVisible();
  await chooseOption(page, selects.nth(1), new RegExp(`^${OPD.lab.counter}$`));
  await page.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/\/lab\/task-list/, { timeout: 90_000 });
  await expect(main.getByRole('tab').first()).toBeVisible({ timeout: 90_000 });
}

/**
 * ห้อง Lab: แท็บ "นัดหมาย" (นัด Lab ของ Order ล่วงหน้า — แถวไม่มีปุ่มใด ๆ) และแท็บ "รอเช็คอิน" (งานที่เช็คอินได้)
 * SBH Prod 22 ต.ค. 2026: นัด "ยืนยันแล้ว" แต่ไม่เกิดงาน Lab (รอเช็คอิน 0 · labTasks ของ HN = 0 · แผงเปิด Visit ไม่แสดง Lab ให้เลือก) = บั๊กเดิม No.10
 */
export async function labWorklistStatus(page: Page, hn: string): Promise<{ appointment?: string; task: boolean; table: Locator }> {
  await gotoLabWorklist(page);
  const main = page.getByRole('main');
  const apptTab = main.getByRole('tab', { name: /^นัดหมาย/ });
  await apptTab.click();
  const apptRow = main.locator('tr').filter({ hasText: hn }).first();
  const appointment = await apptRow.waitFor({ timeout: 30_000 }).then(
    async () => (await apptRow.innerText()).replace(/\s+/g, ' ').trim(),
    () => undefined,
  );
  if (appointment) {
    await markEvidence(expected(apptTab), expected(apptRow));
    await snapEvidence(page, 'ห้อง Lab — แท็บนัดหมาย');
  }
  const waitTab = main.getByRole('tab', { name: /^รอเช็คอิน/ });
  await waitTab.click();
  const taskRow = main.locator('tr').filter({ hasText: hn }).first();
  const task = await taskRow.waitFor({ timeout: 20_000 }).then(() => true, () => false);
  // แท็บว่าง = ข้อความ "ไม่พบรายการงานแล็บ" (ไม่ใช่ role table)
  const empty = main.getByText('ไม่พบรายการงานแล็บ').filter({ visible: true }).first();
  const target = task ? taskRow : empty;
  await markEvidence(expected(waitTab), expected(target));
  return { appointment, task, table: target };
}

/** แอปห้องรังสี → รายการงาน แท็บ `tab` กรอง HN (ล้างตัวกรองแพทย์ผู้อ่าน) · เปิดครั้งแรกต้องเลือกห้องรังสี */
async function gotoImagingWorklist(page: Page, hn: string, tab: string) {
  const main = page.getByRole('main');
  const url = `/cortex/imaging/task-list?tab=${tab}&hn=${hn}&radiologistPractitionerId=`;
  await page.goto(url);
  await expect(main.getByRole('tab').first().or(main.getByText('เลือกห้องรังสี').first())).toBeVisible({ timeout: 120_000 });
  if (/select-location/.test(page.url())) {
    const selects = main.locator('.ant-select');
    await chooseOption(page, selects.nth(0), OPD.imaging.room);
    if ((await selects.count()) > 1) await chooseOption(page, selects.nth(1), /./);
    await page.getByRole('button', { name: 'ส่ง' }).click();
    await page.waitForURL(/\/imaging\/task-list/, { timeout: 90_000 });
    await page.goto(url);
  }
  await expect(main.getByRole('tab').first()).toBeVisible({ timeout: 90_000 });
}

const imagingRow = (page: Page, hn: string) => page.getByRole('main').locator('tr').filter({ hasText: hn }).first();

/**
 * ห้องรังสี แท็บ "คำขอนัดหมาย": IMG ที่สั่งผ่านนัดหมายขึ้นเป็น "คำขอ (ยังไม่ยืนยัน)" + ปุ่ม `นัดหมายห้องตรวจ`
 * → หน้าต่าง "ยืนยันนัดหมาย" (วัน → ช่วงเวลา → ตกลง) → graphql confirmImagingAppointment (BOOKED) → งานไปแท็บ "รอ Check-in" ทันที
 */
export async function confirmImagingAppointment(page: Page, hn: string): Promise<{ requested: boolean; row: Locator }> {
  await gotoImagingWorklist(page, hn, 'appointment-request');
  const row = imagingRow(page, hn);
  if (!(await row.waitFor({ timeout: 30_000 }).then(() => true, () => false))) return { requested: false, row: page.getByRole('main').getByRole('table').last() };
  await markEvidence(expected(row));
  await snapEvidence(page, 'ห้องรังสี — คำขอนัดหมาย');
  await row.getByRole('button', { name: 'นัดหมายห้องตรวจ' }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'ยืนยันนัดหมาย' });
  await expect(dialog).toBeVisible();
  await dialog.getByText(todayDay(), { exact: true }).first().click();
  const slot = dialog.getByText(/^\d\d:\d\d - \d\d:\d\d$/).first();
  await expect(slot, 'ห้องรังสีต้องมีช่วงเวลานัดวันนี้').toBeVisible({ timeout: 20_000 });
  await slot.click();
  const confirmed = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /confirmImagingAppointment/i.test(r.request().postData() ?? ''), { timeout: 60_000 });
  await dialog.getByRole('button', { name: /^ตกลง$/ }).click();
  const body = (await (await confirmed).json()) as { data?: { confirmImagingAppointment?: { currentStatus?: string } }; errors?: { message: string }[] };
  expect(body.data?.confirmImagingAppointment?.currentStatus, `ยืนยันนัดรังสีไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe('BOOKED');
  return { requested: true, row };
}

/** ห้องรังสี แท็บ "รอ Check-in" → `เช็คอิน` → หน้าต่างเลือกประเภทคิว (รังสี) → ยืนยัน → imaging-tasks/status IN_PROGRESS + เลขคิว (I…) */
export async function checkInImaging(page: Page, hn: string): Promise<{ queue: string; row: Locator }> {
  await gotoImagingWorklist(page, hn, 'INITIATED');
  const row = imagingRow(page, hn);
  await expect(row, 'งานรังสีต้องอยู่แท็บ รอ Check-in').toBeVisible({ timeout: 60_000 });
  await markEvidence(expected(row));
  await snapEvidence(page, 'ห้องรังสี — รอ Check-in');
  await row.getByRole('button', { name: 'เช็คอิน' }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'เช็คอิน' }).last();
  await expect(dialog).toBeVisible();
  const queueType = dialog.locator('[class*="queue-option"]').first();
  if (await queueType.count()) await queueType.click({ force: true });
  const done = waitForApi(page, 'POST', '/cortex-api/imaging-tasks/status', 60_000);
  await dialog.getByRole('button', { name: /^ยืนยัน$/ }).click();
  const res = await done;
  await expectOk(res, 'เช็คอินห้องรังสี');
  const body = (await res.json()) as { latestStatusCode?: string; queue?: { qDisplay?: string } };
  expect(body.latestStatusCode).toBe('IN_PROGRESS');
  // รายการเข้า Worklist แท็บ รอถ่ายภาพ
  await gotoImagingWorklist(page, hn, 'IN_PROGRESS');
  await expect(row, 'หลังเช็คอิน งานรังสีต้องอยู่แท็บ รอถ่ายภาพ').toBeVisible({ timeout: 60_000 });
  await markEvidence(expected(row), expected(page.getByRole('main').getByRole('tab', { name: /^รอถ่ายภาพ/ })));
  return { queue: body.queue?.qDisplay ?? '', row };
}

/** ห้องรังสี: ปุ่มในแถวของแท็บ `tab` (เริ่มถ่ายภาพ / ถ่ายภาพแล้ว) → imaging-tasks/status → คืนสถานะใหม่ */
export async function imagingTaskAction(page: Page, hn: string, tab: string, button: string): Promise<string> {
  await gotoImagingWorklist(page, hn, tab);
  const row = imagingRow(page, hn);
  await expect(row, `งานรังสีต้องอยู่แท็บ ${tab}`).toBeVisible({ timeout: 60_000 });
  const done = waitForApi(page, 'POST', '/cortex-api/imaging-tasks/status', 60_000);
  await markEvidence(expected(row.getByRole('button', { name: button })));
  await row.getByRole('button', { name: button }).click();
  const res = await done;
  await expectOk(res, `ห้องรังสี ${button}`);
  return ((await res.json()) as { latestStatusCode?: string }).latestStatusCode ?? '';
}

/**
 * ห้องรังสี แท็บ "รออ่านผล" → คลิกชื่อรายการ → หน้า "รายละเอียดรังสี" (views=imagingDetail) ส่วน "รายงานผลตรวจทางรังสี":
 * Findings (editor) + Impression → `บันทึก` → POST /cortex-api/imaging-results
 * SBH Prod 22 ต.ค. 2026: 500 "composition validation failed … Could not consume Parts [imaging_result/…/reported_by/…]" + แจ้งเตือน "เกิดข้อผิดพลาดในระบบ"
 */
export async function saveImagingResult(page: Page, hn: string): Promise<{ error?: string; notice: Locator; status?: string }> {
  await gotoImagingWorklist(page, hn, 'PERFORMED');
  const row = imagingRow(page, hn);
  await expect(row, 'งานรังสีต้องอยู่แท็บ รออ่านผล').toBeVisible({ timeout: 60_000 });
  await row.getByText(OPD.futureImg.name.slice(0, 10)).first().click();
  await page.waitForURL(/views=imagingDetail/, { timeout: 90_000 });
  const main = page.getByRole('main');
  const report = main.getByText('รายงานผลตรวจทางรังสี', { exact: true }).first().locator('xpath=ancestor::div[3]');
  await expect(report.locator('[contenteditable=true]').first()).toBeVisible({ timeout: 60_000 });
  await report.locator('[contenteditable=true]').first().click();
  await page.keyboard.type('No fracture or dislocation. Soft tissue unremarkable. (BizSim automate)');
  await report.locator('textarea[id$="overallImpression"]').fill('Normal left ankle radiograph');
  await markEvidence(expected(report));
  await snapEvidence(page, 'ก่อนกด — บันทึกผลรังสี');
  const saved = waitForApi(page, 'POST', '/cortex-api/imaging-results', 60_000);
  await report.getByRole('button', { name: 'บันทึก' }).last().click();
  const res = await saved;
  const notice = page.locator('.ant-notification-notice, .ant-message-notice').first();
  if (!res.ok()) return { error: `${res.status()} ${(await res.text().catch(() => '')).slice(0, 320)}`, notice };
  // บันทึกได้ → ดูสถานะงานในรายการ
  await gotoImagingWorklist(page, hn, 'REPORTED');
  const reported = await imagingRow(page, hn).waitFor({ timeout: 30_000 }).then(() => 'เสร็จสิ้น', () => 'ยังไม่อยู่แท็บเสร็จสิ้น');
  return { notice, status: reported };
}

/** เมนูซ้าย "Lab result" / "Imaging result" ของ EMR → แผงผล (ว่าง = "No data") */
export async function viewResult(page: Page, menu: 'Lab result' | 'Imaging result'): Promise<{ empty: boolean }> {
  await page.getByRole('menuitem', { name: new RegExp(`${menu}$`) }).dispatchEvent('click');
  await page.mouse.move(900, 600);
  const tab = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: menu });
  await expect(tab).toBeVisible({ timeout: 60_000 });
  const main = page.getByRole('main');
  const noData = main.getByText('No data', { exact: true }).filter({ visible: true }).first();
  const detail = main.getByText(menu === 'Lab result' ? /^สั่งโดย/ : /^Accession no\./).filter({ visible: true }).first();
  await expect(noData.or(detail).first()).toBeVisible({ timeout: 60_000 });
  const empty = await noData.isVisible();
  await markEvidence(expected(tab), expected(empty ? noData : detail.locator('xpath=ancestor::div[2]')));
  await snapEvidence(page, `เมนู ${menu}`);
  return { empty };
}

/** ปิดแท็บ Lab result / Imaging result (เปิดอยู่กลุ่มเดียวกับแผง OPD — ทับแท็บ OPD Note / ฟอร์มคัดกรอง) */
export async function closeResultTabs(page: Page) {
  for (const menu of ['Lab result', 'Imaging result']) {
    const tab = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: menu });
    // ปุ่มปิดแท็บโผล่เฉพาะตอน hover → hover แล้วกดแบบ force
    if (await tab.count()) {
      await tab.first().hover();
      await tab.first().locator('.dv-default-tab-action').click({ force: true });
    }
    await expect(tab).toHaveCount(0);
  }
  const opd = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: /^OPD$/ });
  if (await opd.count()) await opd.first().click();
}

/** ค้นผู้ป่วยด้วย HN ที่เวชระเบียน (กรอก HN แล้ว Enter → หน้าข้อมูลผู้ป่วย) */
export async function searchPatientByHn(page: Page, hn: string) {
  await gotoReception(page);
  const box = receptionFrame(page).getByPlaceholder('HN', { exact: true });
  await box.fill(hn);
  await box.press('Enter');
  if (!(await expectPatientInfo(page))) throw new Error('ปุ่ม "Visit ใหม่" กดไม่ได้ (ตรวจสถานะล็อกผู้ป่วยไม่ผ่าน)');
}

export interface OpdVisit {
  vn: string;
  en: string;
  queue: string;
  appointmentId?: string;
  visitSlipEnabled?: boolean;
  /** กดปุ่ม "พิมพ์ใบนำทาง" แล้วแอปยิง API ไหน: visit-slip = ใบนำทางจุดบริการ (แบบ Dev-X) · queues = บัตรคิว · none = ไม่มีปุ่ม / ไม่ยิง */
  slipApi: 'visit-slip' | 'queues' | 'none';
  /** ข้อความบนเอกสารที่พิมพ์ (ดักจาก print agent) */
  slipText: string;
  slipButton: Locator;
}

/**
 * + Visit ใหม่ → แถว "ข้อมูลนัดหมาย" ของวันนี้ขึ้นเอง → สิทธิ UC ลำดับ 1 → `สร้าง`
 * → CreateVisit: attendanceResult.attendances[0] {en, appointmentId, queue.qDisplay} · Encounter เช็คอินให้ทันที (in-progress)
 * → แผงเปลี่ยนเป็น "แก้ไข Visit" มีปุ่ม `พิมพ์ใบนำทาง` → กดแล้วดูว่าแอปพิมพ์อะไร
 *   SBH Prod 22 ต.ค. 2026: flag `reception.visit-slip.print` = ปิด → ปุ่มพิมพ์ "บัตรคิวพบแพทย์ MED…" (`POST /cortex-api/queues/print`) ไม่ใช่ใบนำทางจุดบริการ (`…/visit-slip/print`)
 * `print` = ดักงานพิมพ์ของหน้านี้ (capturePrintJobs) — ไม่ดัก แอปส่งไป localhost:8081 ไม่ได้แล้วขึ้น "พิมพ์คิวไม่สำเร็จ" (เครื่องเทสไม่มี print agent — ไม่ใช่บั๊ก)
 */
export async function openVisitFromAppointment(page: Page, hn: string, print: PrintCapture): Promise<OpdVisit> {
  await searchPatientByHn(page, hn);
  await openNewVisitPanel(page);
  const main = page.getByRole('main');
  const apptRow = main.getByRole('row').filter({ hasText: 'ข้อมูลนัดหมาย' }).filter({ hasText: OPD.clinic }).first();
  await expect(apptRow, 'แผงเปิด Visit ต้องแสดงนัดหมายของวันนี้').toBeVisible({ timeout: 60_000 });
  await markEvidence(expected(apptRow));
  await snapEvidence(page, 'นัดหมายของวันนี้ในแผงเปิด Visit');
  await addCoverageFirst(page, OPD.coverage);
  const created = graphqlMutation(page, 'CreateVisit', 60_000);
  const flag = page.waitForResponse((res) => res.url().includes('feature-flags?key=reception.visit-slip.print'), { timeout: 20_000 }).catch(() => undefined);
  await main.getByRole('button', { name: 'สร้าง', exact: true }).click();
  const res = await created;
  await expectOk(res, 'เปิด Visit ตามนัด');
  const body = (await res.json()) as {
    data?: { createVisit?: { attendanceResult?: { vn: string; attendances: { en: string; appointmentId?: string; queue?: { qDisplay?: string } }[] } } };
    errors?: { message: string }[];
  };
  const att = body.data?.createVisit?.attendanceResult;
  if (!att?.attendances?.length) throw new Error(`เปิด Visit ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ') ?? JSON.stringify(body).slice(0, 300)}`);
  const flagRes = await flag;
  const visitSlipEnabled = flagRes ? Boolean(((await flagRes.json().catch(() => ({}))) as { enabled?: boolean }).enabled) : undefined;
  const first = att.attendances[0];
  const row = main.getByRole('row').filter({ hasText: 'นัดหมาย' }).filter({ hasText: first.queue?.qDisplay ?? OPD.clinic }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });

  // ปุ่ม "พิมพ์ใบนำทาง" (ปุ่มเป็น disabled ชั่วครู่ระหว่างโหลด)
  const slipButton = main.getByRole('button', { name: /พิมพ์ใบนำทาง/ });
  let slipApi: OpdVisit['slipApi'] = 'none';
  let slipText = '';
  if (await slipButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await expect(slipButton).toBeEnabled({ timeout: 30_000 });
    const api = page.waitForRequest((req) => req.method() === 'POST' && /\/visit-slip\/print|\/queues\/print/.test(req.url()), { timeout: 20_000 }).catch(() => undefined);
    const before = print.jobs.length;
    await slipButton.click();
    const req = await api;
    slipApi = !req ? 'none' : /visit-slip/.test(req.url()) ? 'visit-slip' : 'queues';
    const job = await print.next(before, 20_000);
    slipText = job ? (await pdfPages(job.pdf)).join(' ').replace(/\s+/g, ' ').slice(0, 200) : '';
  }
  await markEvidence(expected(row), expected(slipButton));
  return { vn: att.vn, en: first.en, queue: first.queue?.qDisplay ?? '', appointmentId: first.appointmentId, visitSlipEnabled, slipApi, slipText, slipButton };
}

/** รายการผู้ป่วยนอก → คลิกชื่อผู้ป่วย → หน้า EMR (preset=opdV2: แผง OPD Note / ฟอร์มคัดกรอง + คำสั่งการรักษา) */
export async function openEmrFromOpdList(page: Page, hn: string, familyName: string, counter = 'ก่อนตรวจ') {
  await selectOpdUnit(page, OPD.unit, counter);
  const row = await opdListRow(page, hn);
  await row.getByText(familyName).first().click();
  await page.waitForURL(/preset=opdV2/, { timeout: 90_000 });
  await expect(page.getByRole('main').getByRole('tab', { name: 'ฟอร์มคัดกรอง' })).toBeVisible({ timeout: 90_000 });
}

/** ช่องสถานะบนแถบหัวของ Visit (เช็คอิน → พร้อมตรวจ → ตรวจเสร็จ) — graphql TransitionEncounterStatus ไม่มีหน้าต่างยืนยัน */
export async function setVisitStatus(page: Page, name: string) {
  const status = page.getByRole('main').locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
  await expect(status).toBeVisible({ timeout: 120_000 });
  if ((await status.textContent())?.trim() === name) return;
  const option = options(page).filter({ hasText: new RegExp(`^${name}$`) });
  await expect(async () => {
    await page.keyboard.press('Escape');
    // แจ้งเตือนมุมขวาบน (บัตรนัด 404 / ส่งคำสั่งสำเร็จ) บังช่องสถานะ → ปิดก่อน
    const closers = page.locator('.ant-notification-notice-close').filter({ visible: true });
    for (let i = await closers.count(); i > 0; i--) await closers.first().click().catch(() => undefined);
    await status.click({ timeout: 5_000 });
    await expect(option).toBeVisible({ timeout: 5_000 });
  }, `เปิดตัวเลือกสถานะเพื่อเลือก ${name}`).toPass({ timeout: 60_000 });
  const moved = graphqlMutation(page, 'TransitionEncounterStatus', 60_000);
  await option.click();
  const body = (await (await moved).json()) as { data?: { transitionEncounterStatus?: { accepted?: boolean } }; errors?: { message: string }[] };
  expect(body.data?.transitionEncounterStatus?.accepted, `เปลี่ยนสถานะเป็น ${name} ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
  await expect(status).toHaveText(name);
  await markEvidence(expected(status));
}

/** contribution ของฟอร์ม cortex-form (template) ที่บันทึก */
function contribution(page: Page, template: string, timeout = 30_000): Promise<Response> {
  return page.waitForResponse(
    (res) => res.request().method() === 'POST' && /\/contribution$/.test(new URL(res.url()).pathname) && (res.request().postData() ?? '').includes(template),
    { timeout },
  );
}

export const VITALS = { Systolic: '120', Diastolic: '80', PR: '78', RR: '18', Temp: '36.8', SpO2: '98', Weight: '65', Height: '170' };

/**
 * แท็บ "ฟอร์มคัดกรอง" (custom element sbh-general-opd-pre-assessment-v2 · shadow DOM)
 * บังคับ: การมาถึงและความต้องการช่วยเหลือ · Chief Complaint · Present Illness → ปุ่ม `save สร้าง` → contribution 201
 * select เป็น Web component (sl-select): คลิกช่อง → คลิกข้อความตัวเลือก (mb-option label)
 */
export async function savePreAssessment(page: Page) {
  const main = page.getByRole('main');
  await main.getByRole('tab', { name: 'ฟอร์มคัดกรอง' }).click();
  const form = page.locator('sbh-general-opd-pre-assessment-v2');
  await fillPreAssessment(form);
  const saved = contribution(page, 'sbh_general_opd_pre_assessment_v2');
  await main.getByRole('button', { name: 'save สร้าง' }).filter({ visible: true }).first().click();
  const res = await saved;
  await expectOk(res, 'บันทึกฟอร์มคัดกรอง');
  // ค่าสัญญาณชีพขึ้นแถบหัวผู้ป่วย (Patient Banner)
  const bp = page.getByText(`${VITALS.Systolic}/${VITALS.Diastolic}`, { exact: true }).first();
  await expect(bp, 'ค่า BP ต้องแสดงบน Patient Banner').toBeVisible({ timeout: 30_000 });
  await markEvidence(expected(bp), expected(page.getByText(/^\s*BMI\s*$/).first().locator('xpath=..')));
}

/**
 * ผู้ป่วย Walk-in: พยาบาลคัดกรองตอนผู้ป่วยยังอยู่แท็บ "คำขอ Walk-in" (ผู้ใช้สอน 22 ต.ค. 2026) — ก่อนลงตารางแพทย์
 * คอลัมน์ "คัดกรอง" ปุ่ม `แบบคัดกรอง` (มีเฉพาะแท็บนี้) → Drawer "แบบคัดกรอง" = ฟอร์มเดียวกับแท็บฟอร์มคัดกรองของ EMR → ปุ่ม `บันทึก`
 * → contribution 201 + แจ้งเตือน "กรอกข้อมูลฟอร์มคัดกรองสำเร็จ" · ลงตารางแล้วแท็บเช็คอินคอลัมน์ TRI เป็นวงสีเขียว
 */
export async function preAssessmentFromWalkIn(page: Page, hn: string) {
  await selectOpdUnit(page, OPD.unit, 'ก่อนตรวจ');
  const main = page.getByRole('main');
  await main.getByPlaceholder('ค้นหา HN').waitFor({ timeout: 120_000 });
  const tab = main.getByRole('tab', { name: /^คำขอ Walk-in/ });
  const row = main.locator('tr.ant-table-row').filter({ hasText: hn }).first();
  await expect(async () => {
    await tab.click();
    await expect(row).toBeVisible({ timeout: 10_000 });
  }, `HN ${hn} ต้องอยู่แท็บคำขอ Walk-in`).toPass({ timeout: 90_000 });
  const button = row.getByRole('button', { name: 'แบบคัดกรอง' });
  await markEvidence(expected(button));
  await snapEvidence(page, 'ก่อนกด — ปุ่มแบบคัดกรอง (คำขอ Walk-in)');
  await button.click();
  const drawer = page.getByRole('dialog').filter({ hasText: 'แบบคัดกรอง' }).first();
  const form = drawer.locator('sbh-general-opd-pre-assessment-v2');
  await fillPreAssessment(form);
  const saved = contribution(page, 'sbh_general_opd_pre_assessment_v2');
  await drawer.getByRole('button', { name: /บันทึก/ }).first().click();
  await expectOk(await saved, 'บันทึกฟอร์มคัดกรอง (คำขอ Walk-in)');
  const notice = page.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: 'กรอกข้อมูลฟอร์มคัดกรองสำเร็จ' }).first();
  await expect(notice).toBeVisible({ timeout: 15_000 });
  await markEvidence(expected(notice));
}

/** กรอกฟอร์มคัดกรอง (sbh-general-opd-pre-assessment-v2) ให้ครบช่องบังคับ — ไม่กดบันทึก */
async function fillPreAssessment(form: Locator) {
  await expect(form.getByPlaceholder('Systolic', { exact: true }).first()).toBeVisible({ timeout: 60_000 });
  const combos = form.locator('[role=combobox].select__control');
  for (const [i, value] of (['walk', 'no-assistance-needed', 'alone'] as const).entries()) {
    const label = (await form.locator(`mb-option[value="${value}"]`).first().getAttribute('label')) ?? '';
    if ((await combos.nth(i).innerText()).includes(label)) continue;
    if ((await combos.nth(i).getAttribute('aria-expanded')) !== 'true') await combos.nth(i).click({ force: true });
    await form.getByText(label, { exact: true }).filter({ visible: true }).first().click();
    await expect(combos.nth(i)).toContainText(label);
  }
  for (const [placeholder, value] of Object.entries(VITALS)) await form.getByPlaceholder(placeholder, { exact: true }).first().fill(value);
  await form.locator('select').filter({ hasText: 'Pain score' }).first().selectOption('2');
  await form.getByText('(5) ไม่เร่งด่วน', { exact: true }).click();
  const cc = form.getByRole('button', { name: 'ปวดหลัง', exact: true });
  if (!(await form.locator('textarea').filter({ hasText: 'ปวดหลัง' }).count())) await cc.click();
  await form.locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').fill('ปวดหลังส่วนล่าง 3 วัน (BizSim automate)');
}

/**
 * แท็บ "OPD Note" (sbh-general-opd-note-v2): อาการนำ + Diagnosis (ค้นหา ICD10 → "<รหัส> - <ชื่อ>") → `save สร้าง`
 * คืนเวลาที่ใช้บันทึก (วินาที) — บั๊กเดิม No.2 "บันทึกแล้วไม่ Save ให้ หรือ ช้า"
 */
export async function saveOpdNote(page: Page): Promise<{ seconds: number; dx: string }> {
  const main = page.getByRole('main');
  await main.getByRole('tab', { name: 'OPD Note' }).click();
  const form = page.locator('sbh-general-opd-note-v2');
  const search = form.getByPlaceholder('ค้นหา', { exact: true }).first();
  const dxBox = form.getByPlaceholder(OPD.dx.code, { exact: true });
  // Note ที่บันทึกแล้วเปิดเป็นโหมดอ่าน (ปุ่ม "แก้ไข" ข้างหัว OPD Note · APM-OPD-003 บันทึกครั้งที่ 2) → กดแก้ไขก่อน · Dx เดิมอยู่ในช่องที่ placeholder = รหัส
  const edit = main.getByRole('button', { name: /แก้ไข$/ }).filter({ visible: true }).first();
  await expect(search.or(dxBox).first().or(edit)).toBeVisible({ timeout: 60_000 });
  if (!(await search.or(dxBox).first().isVisible())) await edit.click();
  await expect(search.or(dxBox).first()).toBeVisible({ timeout: 60_000 });
  const complaint = form.getByPlaceholder('อาการนำ').first();
  if (await complaint.isVisible()) await complaint.fill('ปวดหลังส่วนล่าง 3 วัน');
  let dx = '';
  if (!(await form.getByPlaceholder(OPD.dx.code, { exact: true }).count())) {
    await search.fill(OPD.dx.code);
    const option = page.getByText(new RegExp(`^${OPD.dx.code} - `)).first();
    await option.waitFor({ timeout: 20_000 });
    dx = ((await option.textContent()) ?? '').trim();
    await option.click();
    await expect(form.getByPlaceholder(OPD.dx.code, { exact: true })).toBeVisible();
  }
  const saved = contribution(page, 'sbh_general_opd_note_v2', 60_000);
  const started = Date.now();
  // โหมดสร้าง = "save สร้าง" · โหมดแก้ไขของ Note เดิม = ปุ่มบันทึก (ชื่อยังไม่เคยเห็น — รับทั้ง 2 แบบ)
  await main.getByRole('button', { name: /^save (สร้าง|บันทึก)$/ }).filter({ visible: true }).first().click();
  await expectOk(await saved, 'บันทึก OPD Note');
  const seconds = (Date.now() - started) / 1000;
  const header = main.getByText(/^แก้ไขล่าสุดโดย/).filter({ visible: true }).first();
  await expect(header).toBeVisible({ timeout: 30_000 });
  await markEvidence(expected(header), expected(main.getByText(new RegExp(OPD.dx.name)).filter({ visible: true }).first()));
  return { seconds, dx: dx || `${OPD.dx.code} - ${OPD.dx.name}` };
}

/** สั่งยากลับบ้าน (ประเภทการใช้ = Home med) แล้ว `ส่งคำสั่ง` (Sign) */
export async function orderHomeMed(page: Page) {
  const main = page.getByRole('main');
  await main.getByPlaceholder(/ค้นหา ยา, เวชภัณฑ์/).waitFor({ timeout: 120_000 });
  await addMedicineToCart(page, OPD.homeMed.code, async () => {
    const home = main.locator('.ant-radio-wrapper, .ant-radio-button-wrapper').filter({ hasText: /^Home med$/ }).filter({ visible: true }).first();
    if (!(await home.locator('input').isChecked())) await home.click();
    await main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ }).fill(OPD.homeMed.qty);
  });
  const row = main.getByRole('row').filter({ hasText: `[${OPD.homeMed.code}]` }).first();
  await expect(row).toContainText('Home med');
  const signed = graphqlMutation(page, 'SignOPDOrders', 60_000);
  await main.getByRole('button', { name: /ส่งคำสั่ง/ }).first().click();
  const body = (await (await signed).json()) as { data?: { signOPDOrders?: { accepted?: boolean } }; errors?: { message: string }[] };
  expect(body.data?.signOPDOrders?.accepted, `ส่งคำสั่งยาไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
  await markEvidence(expected(row));
}

/** เมนูซ้าย "ประวัติการนัดหมาย" → แถวของวันนัด (DD/MM/พ.ศ.) */
export async function appointmentHistoryRow(page: Page, start: string): Promise<Locator> {
  await page.getByRole('menuitem', { name: /ประวัติการนัดหมาย$/ }).dispatchEvent('click');
  await page.mouse.move(900, 600);
  const date = new Date(start).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric' });
  const row = page.getByRole('main').getByRole('row').filter({ hasText: date }).first();
  await expect(row, `ประวัติการนัดหมายต้องมีนัดวันที่ ${date}`).toBeVisible({ timeout: 60_000 });
  return row;
}

/** ปุ่มเครื่องพิมพ์ในแถวประวัติการนัดหมาย → "พิมพ์ใบนัด (TH|EN)" → คืน error ของ documents/generate (ไม่มี = ได้งานพิมพ์) */
export async function printAppointmentSlip(page: Page, row: Locator, lang: 'TH' | 'EN', print: { jobs: PrintJob[]; next: (before: number, timeout?: number) => Promise<PrintJob | undefined> }): Promise<{ error?: string; text?: string }> {
  const item = page.getByText(`พิมพ์ใบนัด (${lang})`, { exact: true }).filter({ visible: true });
  if (!(await item.count())) await row.getByRole('button').filter({ has: page.locator('[aria-label="printer"]') }).click();
  const generated = waitForApi(page, 'POST', '/cortex-api/documents/generate', 30_000).catch(() => undefined);
  const before = print.jobs.length;
  await item.click();
  const res = await generated;
  if (res && !res.ok()) return { error: `${res.status()} ${(await res.text().catch(() => '')).slice(0, 160)}` };
  const job = await print.next(before, 15_000);
  return job ? { text: (await pdfPages(job.pdf)).join(' ') } : { error: 'กดแล้วไม่มีงานพิมพ์' };
}

/** หน้าต่างแยกของบัญชี Nurse (ล็อกอินเอง + อัดคลิป video-Nurse.webm) + ดักงานพิมพ์ของหน้าต่างนี้ */
export async function openNurseWindow(browser: Browser): Promise<{ nurse: Page; print: PrintCapture }> {
  const nurse = await openRoleWindow(browser, 'Nurse');
  return { nurse, print: await capturePrintJobs(nurse) };
}

/**
 * พยาบาล: รายการผู้ป่วยนอก ช่อง "หลังตรวจ" → ปุ่ม `จำหน่าย` (DischargeEncounterStatus) → แบบฟอร์ม Discharge
 * การจัดการหลังตรวจ = ตารางคิว ([class*=discharge-display-queue-grid] — แถว ยากลาง / NUH + ปุ่มพิมพ์ต่อแถว → queues/print → print agent thermal)
 * คืนข้อความแถว + ข้อความบนบัตรคิวที่พิมพ์ของแต่ละแถว + ตารางคิว (ไว้ตีกรอบตอน Fail)
 */
export async function dischargeAndPrintQueues(nurse: Page, print: PrintCapture, hn: string): Promise<{ queues: { row: string; ticket: string }[]; grid: Locator }> {
  await selectOpdUnit(nurse, OPD.unit, 'หลังตรวจ');
  await opdListRow(nurse, hn);
  // HN เดียวกันมีได้หลายแถว (เช่น Visit ครั้งก่อนที่เสร็จสิ้นแล้ว — APM-OPD-002) → ใช้แถวที่มีปุ่มจำหน่าย
  const button = nurse.getByRole('main').locator('tr').filter({ hasText: hn }).getByRole('button', { name: 'จำหน่าย' }).first();
  await expect(button, `แถวของ HN ${hn} ต้องมีปุ่มจำหน่าย`).toBeVisible({ timeout: 30_000 });
  const discharged = graphqlMutation(nurse, 'DischargeEncounterStatus', 60_000);
  await button.click();
  const body = (await (await discharged).json()) as { data?: { dischargeEncounterStatus?: { accepted?: boolean } }; errors?: { message: string }[] };
  expect(body.data?.dischargeEncounterStatus?.accepted, `จำหน่ายไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
  await nurse.waitForURL(/actions=dischargeForm/, { timeout: 90_000 });
  const grid = nurse.getByRole('main').locator('[class*="discharge-display-queue-grid"]').first();
  await expect(grid).toBeVisible({ timeout: 90_000 });
  const queues: { row: string; ticket: string }[] = [];
  const buttons = grid.getByRole('button');
  const labels = (await grid.innerText()).split('\n').map((t) => t.trim()).filter((t) => t && !/^(ประเภท|คิว|Actions)$/.test(t));
  for (let i = 0; i < (await buttons.count()); i++) {
    const before = print.jobs.length;
    await buttons.nth(i).click();
    const job = await print.next(before, 20_000);
    queues.push({ row: labels.slice(i * 2, i * 2 + 2).join(' '), ticket: job ? (await pdfPages(job.pdf)).join(' ').replace(/\s+/g, ' ').slice(0, 200) : '' });
  }
  await markEvidence(expected(grid));
  await snapEvidence(nurse, 'การจัดการหลังตรวจ — พิมพ์บัตรคิว');
  return { queues, grid };
}

/**
 * จำหน่ายรูปแบบอื่น ตั้งต้น With Approval (= กลับบ้าน) → `บันทึก` → UpsertOpdDischargeSummary COMPLETE
 * SBH Prod 22 ต.ค. 2026: บันทึกแล้วแอปยิง dischargeEncounterStatus ซ้ำ → ErrNotAllowDischargeEncounter → แจ้งเตือนแดงหลอก → คืน notice ไว้ตีกรอบตอน Fail
 */
export async function saveDischarge(nurse: Page): Promise<{ dischargeTypeCode: string; falseError?: string; notice: Locator }> {
  const main = nurse.getByRole('main');
  const heading = main.getByRole('heading', { name: 'Discharge', level: 3 });
  await expect(main.getByRole('combobox', { name: /จำหน่ายรูปแบบอื่น/ })).toBeVisible();
  const saved = graphqlMutation(nurse, 'UpsertOpdDischargeSummary', 60_000);
  await heading.locator('xpath=following::button[normalize-space()="บันทึก"][1]').click();
  const savedBody = (await (await saved).json()) as { data?: { upsertOpdDischargeSummary?: { statusCode?: string; dischargeTypeCode?: string } }; errors?: { message: string }[] };
  expect(savedBody.data?.upsertOpdDischargeSummary?.statusCode, `บันทึก Discharge ไม่สำเร็จ: ${savedBody.errors?.map((e) => e.message).join(' · ')}`).toBe('COMPLETE');
  const notice = nurse.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: /ไม่สำเร็จ|ผิดพลาด/ }).first();
  const falseError = (await notice.waitFor({ timeout: 6_000 }).then(() => true, () => false)) ? (await notice.innerText()).replace(/\s+/g, ' ') : undefined;
  return { dischargeTypeCode: savedBody.data?.upsertOpdDischargeSummary?.dischargeTypeCode ?? '', falseError, notice };
}

/** ห้องยา: เลือกห้อง + ช่องบริการ → แท็บรายการตามชื่อ (ตั้งต้น Order รอยืนยัน) */
export async function gotoPharmacy(page: Page) {
  const main = page.getByRole('main');
  await page.goto('/cortex/pharmacy/select-location');
  await main.getByRole('combobox').first().click();
  await options(page).filter({ hasText: OPD.pharmacy.name }).first().click();
  // dropdown ห้องยาบางครั้งค้างทับช่องเคาน์เตอร์ (APM-OPD-006 22 ต.ค. 2026) → รอให้ปิดก่อน · ตัวเลือกเคาน์เตอร์อยู่นอกจอได้ → กดผ่าน DOM
  await expect(options(page)).toHaveCount(0, { timeout: 5_000 }).catch(() => page.locator('h1, h2, h3').first().click({ force: true }).catch(() => undefined));
  const counter = options(page).filter({ hasText: new RegExp(`^${OPD.pharmacy.counter}$`) }).last();
  await expect(async () => {
    await main.getByRole('combobox').nth(1).click({ force: true });
    await expect(counter).toBeAttached({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await counter.evaluate((el) => (el as HTMLElement).click());
  await expect(page.getByRole('button', { name: 'ส่ง' })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 90_000 });
}

/**
 * แท็บ Order รอยืนยัน → แถว HN → หน้ารับออเดอร์ → `สร้างใบยา` (ไม่ใช้ "ตัดสต็อกติดลบ") → POST /cortex-api/opd/prescriptions
 * คืน { prescriptionId } หรือ { error } (SBH Prod 22 ต.ค. 2026: 500 composition validation failed)
 */
export async function createPrescriptionAt(page: Page, hn: string, code = OPD.homeMed.code): Promise<{ prescriptionId?: string; error?: string; notice?: Locator; allergyAck?: string }> {
  const main = page.getByRole('main');
  await gotoPharmacy(page);
  const row = main.getByRole('row').filter({ hasText: `HN ${hn}` }).first();
  await expect(row, `ผู้ป่วย HN ${hn} ต้องอยู่แท็บ "Order รอยืนยัน" ของ${OPD.pharmacy.name}`).toBeVisible({ timeout: 90_000 });
  await row.locator('td').nth(4).click();
  const create = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
  await expect(create).toBeVisible({ timeout: 90_000 });
  // Print ฉลากยาอัตโนมัติ ติ๊กไว้ — คงไว้ตาม flow จริง (งานพิมพ์ไปที่ print agent ที่ไม่มีในเครื่องเทส)
  await markEvidence(expected(main.getByRole('row').filter({ hasText: `[${code}]` }).first()));
  await snapEvidence(page, 'ก่อนกด — สร้างใบยา');
  const created = waitForApi(page, 'POST', '/cortex-api/opd/prescriptions', 60_000);
  await create.click();
  // ยาในใบยาตรงกับประวัติแพ้ยา (APM-OPD-006 แพ้ ibuprofen) → หน้าต่างให้รับทราบก่อนสร้างใบยา
  const allergy = page.getByRole('dialog').filter({ hasText: 'ตรงกับประวัติแพ้ยา' }).last();
  let allergyAck: string | undefined;
  if (await allergy.waitFor({ state: 'visible', timeout: 6_000 }).then(() => true, () => false)) {
    allergyAck = (await allergy.innerText()).replace(/\s+/g, ' ').trim();
    await markEvidence(expected(allergy.getByRole('row').nth(1)));
    await snapEvidence(page, 'ห้องยา — ยาตรงกับประวัติแพ้ยา');
    await allergy.getByRole('button', { name: 'รับทราบและสร้างใบยา' }).click();
  }
  const res = await created;
  if (!res.ok()) {
    const notice = page.locator('.ant-message-notice, .ant-notification-notice').first();
    return { error: `${res.status()} ${(await res.text().catch(() => '')).slice(0, 260)}`, notice, allergyAck };
  }
  const body = (await res.json()) as { prescriptionId?: string };
  return { prescriptionId: body.prescriptionId, allergyAck };
}

/** หน้าคิวการเงิน (บัญชี user1 = การเงินชั้น 1) แท็บ รอรับบริการ — มีแถวของ HN นี้ไหม */
export async function cashierQueueHas(page: Page, hn: string): Promise<boolean> {
  await page.goto('/cortex/cashier/queue-list');
  const main = page.getByRole('main');
  await expect(main.getByRole('tab', { name: 'รอรับบริการ' })).toBeVisible({ timeout: 90_000 });
  const row = main.getByRole('row').filter({ hasText: hn });
  const found = await row.first().waitFor({ timeout: 20_000 }).then(() => true, () => false);
  await markEvidence(expected(found ? row.first() : main.getByRole('table').first()));
  return found;
}

/** หน้าบัญชีการเงินของ Visit → รายการค่าใช้จ่าย (แถวในตารางล่าง) */
export async function chargeItems(page: Page, hn: string, vn: string): Promise<string[]> {
  await gotoCashierAccount(page, hn, vn);
  const main = page.getByRole('main');
  const table = main.getByRole('table').filter({ hasText: 'รหัส - ชื่อ' }).last();
  await expect(table).toBeVisible({ timeout: 60_000 });
  const rows = (await table.locator('tbody tr').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s && s !== 'ไม่พบรายการค่าใช้จ่าย' && !s.startsWith('รหัส - ชื่อ')); // แถวหัวตาราง (sticky) อยู่ใน tbody ด้วย
  await markEvidence(expected(table));
  return rows;
}

export { closeCoverageWithEndpoint, payAllInCash };

/** หน้าบัญชีการเงิน: ยอด "ที่ต้องชำระ" ของสรุปบัญชี */
export async function amountDue(page: Page): Promise<number> {
  const text = await page.getByRole('main').innerText();
  return Number((text.match(/ที่ต้องชำระ\s*([\d,.]+)/)?.[1] ?? '0').replace(/,/g, ''));
}

/**
 * ยอดต้องชำระ 0 (สิทธิ UC ครอบคลุมทั้งหมด — APM-OPD-002 ค่า IMG 750 เครดิต UC): `สร้างใบแจ้งหนี้ทั้งหมด` → ยืนยัน → POST /patient-invoices
 * ระบบไม่เปิดหน้าต่างชำระเงิน (ไม่มียอดให้รับ) — SBH Prod 22 ต.ค. 2026
 */
export async function createInvoicesOnly(page: Page): Promise<string> {
  const invoiced = waitForApi(page, 'POST', '/cortex-api/patient-invoices', 60_000);
  await page.getByRole('button', { name: /สร้างใบแจ้งหนี้ทั้งหมด/ }).click();
  const confirm = page.getByRole('dialog', { name: /ยืนยันการสร้างใบแจ้งหนี้/ });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'ยืนยัน' }).click();
  const res = await invoiced;
  await expectOk(res, 'สร้างใบแจ้งหนี้');
  return ((await res.json()) as { id: string }).id;
}

/**
 * ปิด Visit ที่การเงิน — สิทธิที่ยังเปิด (ไม่มี approval code) ทำให้ปิดไม่ได้ (400 ErrCoverageMustBeClosed · SBH Prod 22 ต.ค. 2026)
 * Visit ที่ยอดเป็น 0 ปิดสิทธิ UC ด้วยหน้าต่าง End Point ไม่ได้ (ปุ่มยืนยัน disabled) → กดปุ่ม `ปิดสิทธิ` ในแถวสิทธิ (ไม่มีหน้าต่าง) ทุกแถวก่อน
 */
export async function closeVisitWithCoverages(page: Page, hn: string, vn: string): Promise<string[]> {
  await gotoCashierAccount(page, hn, vn);
  const closed: string[] = [];
  const rows = page.getByRole('main').getByRole('row').filter({ hasText: /H\d\d - / });
  // ตารางสิทธิโหลดตามหลังเลข VN — นับก่อนโหลดได้ 0 แล้วข้ามไปปิด Visit เลย
  await expect(rows.first()).toBeVisible({ timeout: 60_000 });
  for (let i = 0; i < (await rows.count()); i++) {
    const button = rows.nth(i).getByRole('button').filter({ hasText: /^ปิดสิทธิ$/ });
    if (!(await button.count())) continue;
    closed.push((await rows.nth(i).innerText()).match(/H\d\d - [^\t\n]+/)?.[0]?.trim() ?? `แถว ${i + 1}`);
    await button.click();
    await expect(rows.nth(i).getByRole('button').filter({ hasText: /^เปิดสิทธิ$/ })).toBeVisible({ timeout: 20_000 });
  }
  await closeVisitAtCashier(page, hn, vn);
  return closed;
}

/**
 * ห้องยา: ใบยารอจัด → `จัดยาแล้ว` (pack) → ใบยาจัดแล้ว → `ยืนยันรอจ่าย` (verify) → ใบรอจ่าย → (เรียกคิว ถ้ามีปุ่ม) → ติ๊กยา + `จ่ายยา` → ยืนยันการทบทวน (dispense)
 * ปุ่มจ่ายยาต้องรอใบแจ้งหนี้ "ชำระแล้ว"
 */
export async function dispensePrescription(page: Page, hn: string, prescription: string): Promise<string[]> {
  const main = page.getByRole('main');
  const notes: string[] = [];
  await gotoPharmacy(page);
  const steps: [string, string, string][] = [
    ['ใบยารอจัด', 'จัดยาแล้ว', 'pack'],
    ['ใบยาจัดแล้ว', 'ยืนยันรอจ่าย', 'verify'],
    ['ใบรอจ่าย', 'จ่ายยา', 'dispense'],
  ];
  for (const [tab, button, action] of steps) {
    await main.getByRole('tab', { name: new RegExp(tab) }).click();
    const row = main.getByRole('row').filter({ hasText: `HN ${hn}` }).first();
    await expect(row, `ใบยา ${prescription} ต้องอยู่แท็บ ${tab}`).toBeVisible({ timeout: 60_000 });
    if (action === 'dispense') {
      const call = row.getByRole('button', { name: /เรียกคิว/ });
      if (await call.count()) {
        await call.first().click();
        notes.push('เรียกคิวที่ห้องยาแล้ว');
      } else notes.push('ไม่พบปุ่มเรียกคิวในแถวใบรอจ่าย');
    }
    await row.locator('td').filter({ hasText: /^\d{5} - / }).first().click();
    await page.waitForURL(new RegExp(`prescriptionId=${prescription}`), { timeout: 90_000 });
    const btn = page.getByRole('button', { name: button, exact: true }).filter({ visible: true }).first();
    await expect(btn).toBeVisible({ timeout: 60_000 });
    if (action === 'dispense') await main.getByRole('checkbox', { name: 'เลือกยาทั้งหมด' }).check();
    const done = waitForApi(page, 'POST', `/cortex-api/prescriptions/${prescription}/${action}`, 60_000);
    await btn.click();
    if (action === 'dispense') {
      const review = page.getByRole('dialog', { name: /ยืนยันการทบทวนก่อนจ่ายยา/ });
      await expect(review).toBeVisible({ timeout: 20_000 });
      await review.getByRole('button', { name: /^ยืนยัน/ }).click();
    }
    await expectOk(await done, `${button} (${action})`);
  }
  await main.getByRole('tab', { name: /จ่ายยาแล้ว/ }).click();
  const row = main.getByRole('row').filter({ hasText: `HN ${hn}` }).first();
  await expect(row, 'ใบยาต้องอยู่แท็บ จ่ายยาแล้ว').toBeVisible({ timeout: 60_000 });
  await markEvidence(expected(row));
  return notes;
}

// ---------- APM-OPD-006 · ยานอกบัญชี / DUE / CDSS / เอกสารยานอกบัญชี (สำรวจ SBH Prod 22 ต.ค. 2026 · HN 6904477) ----------

const careNav = (page: Page) => page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' });

/** เมนูขวา "การดำเนินการดูแลผู้ป่วย" → กดจนแผงที่ต้องการขึ้น (หน้าเพิ่งโหลดเปิดแผงตั้งต้นทับ) แล้วย้ายเมาส์ออกให้แถบหุบ */
async function openCare(page: Page, name: string, ready: Locator) {
  const item = careNav(page).getByRole('menuitem', { name: new RegExp(`${name}$`) }).first();
  await expect(async () => {
    await item.click({ force: true });
    await expect(ready).toBeVisible({ timeout: 8_000 });
  }).toPass({ timeout: 60_000 });
  await page.mouse.move(600, 600);
}

/**
 * บันทึกการแพ้ (OPD · ชื่อสามัญ) — ต่างจากของ ER (`recordDrugAllergy`): ผลการประเมินล็อกเป็น Unconfirmed (มีปุ่ม Naranjo)
 * คืนชื่อยาที่เลือก + ป้ายยาที่แพ้บนแถบหัวผู้ป่วย
 */
export async function recordAllergyOpd(page: Page, search: string): Promise<{ drug: string; banner: Locator }> {
  const panel = page.getByRole('main').getByRole('tabpanel', { name: 'แพ้ยา' });
  const drug = panel.getByRole('combobox', { name: '* ชื่อยา' });
  await openCare(page, 'บันทึกการแพ้', drug);
  await drug.click();
  await drug.fill(search);
  const option = options(page).filter({ hasText: new RegExp(`^${search} \\(`, 'i') }).first();
  await expect(option).toBeVisible({ timeout: 20_000 });
  const name = (await option.innerText()).trim();
  await option.click();
  await panel.getByRole('combobox', { name: '* ประเภทของการแพ้ยา' }).click();
  await expect(options(page).first()).toBeVisible();
  const itch = options(page).filter({ hasText: /คัน|ผื่น|rash|urticaria/i }).first();
  await ((await itch.count()) ? itch : options(page).first()).click();
  await panel.getByText('บันทึกประวัติการแพ้', { exact: true }).click(); // ปิด dropdown แบบเลือกได้หลายค่า
  await panel.getByRole('textbox', { name: '* สรุปอาการแพ้' }).fill('ผื่นคันหลังกินยา (BizSim APM-OPD-006)');
  await panel.getByRole('combobox', { name: '* Severity' }).click();
  await options(page).filter({ hasText: /^Mild$/ }).first().click();
  await panel.getByRole('combobox', { name: '* การแจ้งข้อมูลการแพ้ยาคนไข้' }).click();
  await options(page).filter({ hasText: /ให้ประวัติเอง/ }).first().click();
  const created = graphqlMutation(page, 'CreateMedicationAllergy');
  await panel.getByRole('button', { name: /บันทึก/ }).click();
  const body = (await (await created).json()) as { data?: { createMedicationAllergy?: { compositionUid?: string } }; errors?: { message: string }[] };
  expect(body.data?.createMedicationAllergy?.compositionUid, `บันทึกแพ้ยาไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBeTruthy();
  const banner = page.getByText(new RegExp(`${search} \\(SUBS\\)`, 'i')).first();
  await expect(banner, 'แถบหัวผู้ป่วยต้องแสดงยาที่แพ้').toBeVisible({ timeout: 20_000 });
  return { drug: name, banner };
}

/** แผงคำสั่งการรักษา (CPOE) */
export async function openCpoe(page: Page) {
  await openCare(page, 'คำสั่งการรักษา', page.getByRole('combobox', { name: /ค้นหา ยา/ }));
}

/** ค้นยาด้วยรหัสแล้วเลือก → ฟอร์มรายละเอียดการสั่งยาเปิด (ปิดรายการวิธีใช้ที่เด้งขึ้นมาด้วยการคลิกข้อความ — ห้ามกด Escape: ฟอร์มยาปิดทั้งฟอร์ม) */
export async function selectDrug(page: Page, code: string) {
  const main = page.getByRole('main');
  const box = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  await box.scrollIntoViewIfNeeded();
  await box.click();
  await box.fill(code);
  await options(page).filter({ hasText: `[${code}]` }).filter({ hasNotText: 'แพ็กเกจ' }).first().click();
  await main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2_000); // ป้าย NED / DUE + ข้อเสนอวิธีใช้ขึ้นตามหลัง
  await main.getByText('ประเภทการใช้', { exact: true }).click();
}

/** ป้ายของฟอร์มรายละเอียดการสั่งยา (เช่น "NED" · "ไม่มี DUE" · "DUE รอตรวจสอบ") */
export function drugBadge(page: Page, text: string | RegExp): Locator {
  return page.getByRole('main').getByText(text, { exact: typeof text === 'string' }).filter({ visible: true }).first();
}

/**
 * กรอกส่วนที่ยังว่างของฟอร์มยาที่เลือกไว้ แล้วกด `เพิ่มลงตะกร้า` → รอให้แถวใหม่ขึ้น หรือหน้าต่าง Drug Alert เด้ง (ไม่ตอบหน้าต่าง — ผู้เรียกตอบเอง)
 * ยาที่ระบบสร้างวิธีใช้ไม่ได้ (CELECOXIB: "ไม่พบหน่วยยาที่ระบุ") → ขนาดยา 1 + Route กิน + ความถี่ 1 แล้วพิมพ์วิธีใช้ภาษาไทยเอง + "ตรวจสอบแล้ว"
 */
export async function addSelectedDrug(page: Page, code: string, qty: string): Promise<{ alert?: Locator; row: Locator }> {
  const main = page.getByRole('main');
  const usage = main.getByRole('textbox', { name: /^\* วิธีใช้/ });
  if (!(await usage.inputValue())) {
    await main.getByRole('spinbutton', { name: 'ขนาดยา' }).fill('1');
    const routeInput = main.getByRole('spinbutton', { name: 'ขนาดยา' }).locator('xpath=following::input[@role="combobox"][2]');
    if (await routeInput.isEnabled().catch(() => false)) {
      await routeInput.focus();
      await page.keyboard.press('ArrowDown');
      if (await options(page).first().waitFor({ state: 'visible', timeout: 4_000 }).then(() => true, () => false)) {
        const oral = options(page).filter({ hasText: /รับประทาน|Oral/i }).first();
        await ((await oral.count()) ? oral : options(page).first()).click();
      }
    }
    const frequency = main.getByText('ความถี่', { exact: true }).locator('xpath=following::input[@role="spinbutton"][1]');
    if (await frequency.isEnabled().catch(() => false)) await frequency.fill('1');
    await page.waitForTimeout(800);
    if (!(await usage.inputValue())) await usage.fill('รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง หลังอาหาร');
  }
  const checked = main.getByRole('button', { name: 'ตรวจสอบแล้ว' });
  if (await checked.isVisible().catch(() => false)) await checked.click();
  await main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ }).fill(qty);
  await page.waitForTimeout(600);
  const rows = main.getByRole('row').filter({ hasText: `[${code}]` });
  const before = await rows.count();
  await main.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).click();
  const alert = orderAlert(page);
  await expect
    .poll(async () => (await alert.isVisible()) || (await rows.count()) > before, { timeout: 30_000, message: `เพิ่ม ${code} ลงตะกร้าแล้วต้องมีแถวใหม่หรือหน้าต่างเตือน` })
    .toBe(true);
  return { alert: (await alert.isVisible()) ? alert : undefined, row: rows.last() };
}

/**
 * หน้าต่าง Drug Alert: กด `ยืนยันการสั่งออเดอร์` โดยยังไม่กรอกเหตุผลก่อน (ต้องขึ้น "กรุณาระบุเหตุผล") → กรอกเหตุผลทุกแถว → ยืนยัน
 * `beforeConfirm` = ถ่ายภาพ / ตรวจหน้าต่างตอนขึ้น "กรุณาระบุเหตุผล" ก่อนกรอก
 */
export async function answerOrderAlert(page: Page, reason: string, beforeConfirm?: (alert: Locator, required: Locator) => Promise<void>): Promise<{ text: string; blockedWithoutReason: boolean }> {
  const alert = orderAlert(page);
  const text = (await alert.innerText()).replace(/\s+/g, ' ').trim();
  const confirm = alert.getByRole('button', { name: 'ยืนยันการสั่งออเดอร์' });
  await confirm.click();
  const required = alert.getByText('กรุณาระบุเหตุผล').first();
  const blockedWithoutReason = await required.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false);
  if (blockedWithoutReason) await beforeConfirm?.(alert, required);
  if (await alert.isVisible()) {
    for (const box of await alert.getByRole('textbox').all()) await box.fill(reason);
    await confirm.click();
  }
  await expect(alert).toBeHidden({ timeout: 20_000 });
  return { text, blockedWithoutReason };
}

/** ปุ่ม `ขอ DUE` ของฟอร์มยา → หน้าต่างขอ DUE (ข้อมูลผู้ป่วย / ยา / นโยบาย DUE + เหตุผลที่ขอ) → ส่ง → POST /cortex-api/medication-due-requests/request */
export async function requestDue(page: Page, reason: string): Promise<{ dialogText: string; id?: number; status?: string; httpStatus: number; badge: Locator }> {
  const main = page.getByRole('main');
  await main.getByRole('button', { name: 'ขอ DUE' }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'ขอ DUE' }).last();
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  const dialogText = (await dialog.innerText()).replace(/\s+/g, ' ').trim();
  await dialog.getByRole('textbox').fill(reason);
  await markEvidence(expected(dialog.getByText(/นโยบาย DUE/).first()));
  await snapEvidence(page, 'หน้าต่างขอ DUE');
  const sent = waitForApi(page, 'POST', '/cortex-api/medication-due-requests/request', 30_000);
  await dialog.getByRole('button', { name: 'ส่ง' }).click();
  const res = await sent;
  const body = (await res.json().catch(() => ({}))) as { id?: number; latestStatusCode?: string };
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  return { dialogText, id: body.id, status: body.latestStatusCode, httpStatus: res.status(), badge: drugBadge(page, /^DUE /) };
}

/** `ส่งคำสั่ง` (signOPDOrders) — หน้าต่างเตือนที่เด้งตอนส่ง (ถ้ามี) กรอกเหตุผลให้ */
export async function signOrders(page: Page, reason: string): Promise<{ accepted: boolean; error?: string; notice: Locator }> {
  const main = page.getByRole('main');
  const notice = page.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: /ผิดพลาด/ });
  let last: { accepted: boolean; error?: string } = { accepted: false };
  // ตะกร้าบันทึกอัตโนมัติ (เหตุผลของหน้าต่างเตือน) ตามหลังการกด — กดส่งตอน "กำลังบันทึก..." ได้ "medication duplication review is required" (APM-OPD-006 รอบ 2)
  // → รอ "บันทึกแล้ว" ก่อนส่ง · ได้ error ประเภท review ลองใหม่อีกครั้ง
  for (let attempt = 0; attempt < 2; attempt++) {
    await expect(main.getByText('บันทึกแล้ว', { exact: true }).first()).toBeVisible({ timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(1_000);
    const signed = graphqlMutation(page, 'SignOPDOrders', 90_000);
    await page.mouse.move(400, 600);
    await main.getByRole('button', { name: /ส่งคำสั่ง/ }).first().click();
    const alert = orderAlert(page);
    if (await alert.waitFor({ state: 'visible', timeout: 4_000 }).then(() => true, () => false)) {
      for (const box of await alert.getByRole('textbox').all()) await box.fill(reason);
      await alert.getByRole('button', { name: 'ยืนยันการสั่งออเดอร์' }).click();
    }
    const body = (await (await signed).json()) as { data?: { signOPDOrders?: { accepted?: boolean } }; errors?: { message: string }[] };
    last = { accepted: !!body.data?.signOPDOrders?.accepted, error: body.errors?.map((e) => e.message).join(' · ') };
    if (last.accepted || !/review is required/.test(last.error ?? '')) break;
    console.log(`    ส่งคำสั่งได้ "${last.error}" — รอตะกร้าบันทึกแล้วลองใหม่`);
    await page.waitForTimeout(5_000);
  }
  return { ...last, notice };
}

/** ลบแถวที่ยังไม่ส่งของยารหัสนี้ออกจากตะกร้า (ไอคอนถังขยะ — แถบเมนูขวาที่กางอยู่บังปุ่ม จึงกดผ่าน DOM) */
export async function deleteCartRows(page: Page, code: string) {
  const main = page.getByRole('main');
  const row = () => main.getByRole('row').filter({ hasText: `[${code}]` }).filter({ has: page.locator('.anticon-delete') }).first();
  for (let i = 0; i < 5 && (await row().count()); i++) {
    await page.mouse.move(400, 600);
    await row().locator('.anticon-delete').first().evaluate((el) => ((el.closest('button') ?? el) as HTMLElement).click());
    const ok = page.locator('.ant-popconfirm:visible, .ant-modal-confirm:visible').getByRole('button', { name: /ตกลง|ยืนยัน|ลบ|OK|Yes/ }).first();
    if (await ok.waitFor({ state: 'visible', timeout: 1_500 }).then(() => true, () => false)) await ok.click();
    await page.waitForTimeout(1_500);
  }
  await expect(row(), `ลบ ${code} ออกจากตะกร้า`).toHaveCount(0);
}

/** หน้าตั้งค่า "ฟอร์ม DUE/PA" (อ่านอย่างเดียว · หน้าต่างใหม่ใน context เดิม) → จำนวนแถว (ผู้เรียกปิดหน้าต่างเอง) */
export async function duePaForms(page: Page): Promise<{ rows: number; other: Page }> {
  const other = await page.context().newPage();
  await other.goto('/cortex/setting/pharmacy/medication-authorization-forms');
  const table = other.getByRole('main').getByRole('table').first();
  await expect(table).toBeVisible({ timeout: 90_000 });
  await other.waitForTimeout(3_000);
  const empty = await table.getByText('ไม่มีข้อมูล').isVisible().catch(() => false);
  const rows = empty ? 0 : await table.locator('tbody tr').count();
  await markEvidence(expected(table));
  return { rows, other };
}

/** เมนู "สร้างฟอร์ม" → ตัวเลือกในช่องเลือกฟอร์ม + แถบแดงโหลดกลุ่มแบบฟอร์มไม่สำเร็จ (ถ้ามี) */
export async function createFormMenu(page: Page): Promise<{ forms: string[]; error?: Locator }> {
  const main = page.getByRole('main');
  const label = main.getByText('เลือกฟอร์ม', { exact: true }).last();
  await openCare(page, 'สร้างฟอร์ม', label);
  const select = label.locator('xpath=following::div[contains(@class,"ant-select")][1]');
  await page.waitForTimeout(2_000);
  const error = main.getByText(/โหลดกลุ่มแบบฟอร์มหรือร่างไม่สำเร็จ/).first();
  const hasError = await error.isVisible().catch(() => false);
  await select.click();
  const items = page.locator('.ant-select-dropdown:visible .ant-select-item');
  await expect(items.first()).toBeVisible({ timeout: 20_000 });
  const forms = (await items.allInnerTexts()).map((t) => t.trim());
  await label.click(); // ปิด dropdown
  return { forms, error: hasError ? error : undefined };
}

/**
 * เมนู "สร้างเอกสาร" → "แบบฟอร์มอนุมัติใช้ยานอกบัญชียาหลักแห่งชาติ" (สิทธิ UC · ชื่อยา · ข้อบ่งใช้ อย. · จำนวน / ราคา · การเบิกจ่ายค่ายา) → บันทึก (พิมพ์อัตโนมัติ)
 * ระบบไม่ดึงข้อมูลยาจาก Order มาให้ — กรอกเอง
 */
export async function createNedDocument(
  page: Page,
  print: PrintCapture,
  drug: { name: string; qty: string; unitPrice: number },
  payment: RegExp,
): Promise<{ notice: Locator; printed?: PrintJob; types: string[] }> {
  const main = page.getByRole('main');
  const search = page.getByText('ค้นหาเอกสารที่ต้องการสร้าง');
  await openCare(page, 'สร้างเอกสาร', search);
  const docs = page.locator('.ant-select-dropdown:visible .ant-select-item');
  // คลิกครั้งแรกบางรอบ dropdown ไม่เปิด (APM-OPD-006 รอบ 2) → กดซ้ำจนรายการขึ้น
  await expect(async () => {
    await search.click({ force: true });
    await expect(docs.first()).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 40_000 });
  const types = (await docs.allInnerTexts()).map((t) => t.trim());
  await docs.filter({ hasText: 'แบบฟอร์มอนุมัติใช้ยานอกบัญชียาหลักแห่งชาติ' }).first().click();
  const ph = (text: string) => main.getByPlaceholder(text, { exact: true });
  await expect(ph('ชื่อยา')).toBeVisible({ timeout: 30_000 });
  await main.getByText('สิทธิ UC', { exact: true }).last().click();
  await ph('ชื่อยา').fill(drug.name);
  await main.getByText(/ใช้ในข้อบ่งใช้ตามที่ได้รับการขึ้นทะเบียน/).click();
  await ph('วิธีการบริหารยา').fill('รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง หลังอาหาร');
  await ph('จำนวนที่ต้องการใช้').fill(drug.qty);
  await ph('หน่วย').fill('tablet');
  await ph('ราคาต่อหน่วย').fill(drug.unitPrice.toFixed(2));
  await ph('รวมมูลค่า').fill((drug.unitPrice * Number(drug.qty)).toFixed(2));
  await main.getByText(payment).first().click();
  await main.getByText('แบบฟอร์มอนุมัติใช้ยานอกบัญชียาหลักแห่งชาติ').last().click();
  await markEvidence(expected(main.getByText(payment).first()), expected(ph('ชื่อยา')));
  await snapEvidence(page, 'แบบฟอร์มอนุมัติใช้ยานอกบัญชี — ก่อนบันทึก');
  const before = print.jobs.length;
  // ปุ่มบันทึกของแผงเอกสาร (ปุ่มไอคอนบนแถบหัวที่ชื่อมีคำว่า "บันทึก" = Patient Note — ห้ามกด)
  await page.getByRole('button', { name: /บันทึก/ }).filter({ hasText: 'บันทึก' }).last().click();
  const notice = page.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: /แบบฟอร์มอนุมัติใช้ยานอกบัญชี/ });
  await expect(notice.first(), 'ต้องขึ้น "สร้างแบบฟอร์มอนุมัติใช้ยานอกบัญชียาหลักแห่งชาติสำเร็จ"').toBeVisible({ timeout: 60_000 });
  const printed = await print.next(before, 30_000);
  return { notice, printed, types };
}

// ---------- APM-OPD-007–010 · ยา Stat / หัตถการ / Refill / ใบรับรองแพทย์ (สำรวจ SBH Prod 23 ต.ค. 2026 · HN 6904482) ----------

/** วันที่ (พ.ศ.) ของวันนี้ + n วัน รูปแบบ td[title] ของปฏิทิน: "2569-10-30" */
function beDate(daysFromToday: number): string {
  const d = new Date(Date.now() + daysFromToday * 86_400_000);
  const [y, m, day] = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).split('-');
  return `${Number(y) + 543}-${m}-${day}`;
}

/** ค้นรายการในช่อง Order Search แล้วเลือก (ใช้ได้ทั้งยา / หัตถการ) → ฟอร์มรายละเอียดของรายการเปิด */
async function pickOrderItem(page: Page, code: string) {
  const box = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  await box.scrollIntoViewIfNeeded();
  await box.click();
  await box.fill(code);
  await options(page).filter({ hasText: `[${code}]` }).filter({ hasNotText: 'แพ็กเกจ' }).first().click();
  await expect(page.getByRole('main').getByRole('button', { name: /เพิ่มลงตะกร้า/ })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2_000); // ฟอร์มเติมค่าตั้งต้นตามหลัง
}

/** ฟอร์มรายละเอียดของรายการที่เลือก (ฟอร์มที่มีปุ่มเพิ่มลงตะกร้า) */
const orderForm = (page: Page) => page.getByRole('main').getByRole('button', { name: /เพิ่มลงตะกร้า/ }).locator('xpath=ancestor::form[1]');

/**
 * สั่งยา Stat: เลือกยา → ติ๊ก `STAT` (input id ลงท้าย isStat — วิธีใช้เติมคำว่า "ทันที") → จำนวน → เพิ่มลงตะกร้า
 * แถวในตะกร้าแสดง "stat" + ประเภทการใช้ "In hospital" (ระบบตั้งให้เอง) — ยังไม่ส่งคำสั่ง
 */
export async function addStatDrug(page: Page): Promise<{ row: Locator; usage: string; text: string }> {
  const main = page.getByRole('main');
  await selectDrug(page, OPD.stat.code);
  const stat = page.locator('input[type=checkbox][id$="isStat"]').first();
  await stat.check({ force: true });
  await expect(stat).toBeChecked();
  await page.waitForTimeout(1_500);
  const usageBox = main.getByRole('textbox', { name: /^\* วิธีใช้/ });
  const usage = await usageBox.inputValue();
  await markEvidence(expected(main.getByText('STAT', { exact: true }).first()), expected(usageBox));
  await snapEvidence(page, `${OPD.stat.code} — ติ๊ก STAT`);
  const added = await addSelectedDrug(page, OPD.stat.code, OPD.stat.qty);
  if (added.alert) await answerOrderAlert(page, 'BizSim ยา Stat');
  const text = (await added.row.innerText()).replace(/\s+/g, ' ').trim();
  return { row: added.row, usage, text };
}

/**
 * สั่งหัตถการจาก Order Search: ความเร่งด่วน (ตั้งต้น Routine) · ประเภท วันนี้ / วันอื่น (+ วันที่ทำ จากปฏิทิน) · ส่งไป (สถานที่) · จำนวน → เพิ่มลงตะกร้า
 * คืนข้อความฟอร์มก่อนเพิ่ม + แถวในตะกร้า (ยังไม่ส่งคำสั่ง)
 */
export async function addProcedure(page: Page, code: string, opts: { daysAhead?: number; location?: RegExp } = {}): Promise<{ form: string; row: Locator; date: string }> {
  const main = page.getByRole('main');
  await pickOrderItem(page, code);
  const form = orderForm(page);
  let date = beDate(0);
  if (opts.daysAhead) {
    await form.getByText('วันอื่น', { exact: true }).click();
    date = beDate(opts.daysAhead);
    const input = form.getByText('วันที่ทำ', { exact: true }).locator('xpath=following::input[1]');
    await expect(input).toBeEnabled();
    await input.click();
    const picker = page.locator('.ant-picker-dropdown:visible').last();
    for (let i = 0; i < 3 && !(await picker.locator(`td[title="${date}"]`).count()); i++) await picker.locator('.ant-picker-header-next-btn').first().click();
    await picker.locator(`td[title="${date}"]`).click();
    await expect(input).not.toHaveValue('');
  }
  if (opts.location) {
    await form.getByText('ส่งไป', { exact: true }).locator('xpath=following::*[contains(@class,"ant-select")][1]').click();
    await options(page).filter({ hasText: opts.location }).first().click();
  }
  await page.waitForTimeout(800);
  const formText = (await form.innerText()).replace(/\s+/g, ' ').trim();
  await markEvidence(expected(form));
  await snapEvidence(page, `${code} — ฟอร์มสั่งหัตถการ`);
  const rows = main.getByRole('row').filter({ hasText: `[${code}]` });
  const before = await rows.count();
  // กดเพิ่มแล้ว UpsertOpdOrder ตอบ error ได้โดยหน้าจอไม่มีแจ้งเตือน (สำรวจ 23 ต.ค.) → อ่านผลเองแล้วรายงานตามจริง
  const upsert = graphqlMutation(page, 'UpsertOpdOrder', 30_000);
  await main.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).click();
  const body = (await (await upsert).json()) as { data?: unknown; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(`กดเพิ่ม ${code} ลงตะกร้าแล้ว UpsertOpdOrder error "${body.errors.map((e) => e.message).join(' · ')}" — หน้าจอไม่มีแจ้งเตือน ฟอร์มค้าง`);
  await expect.poll(() => rows.count(), { timeout: 30_000, message: `เพิ่ม ${code} ลงตะกร้า` }).toBeGreaterThan(before);
  return { form: formText, row: rows.last(), date };
}

/** เมนูซ้าย "หัตถการ" → แผงรายการหัตถการของผู้ป่วย (เปิดหน้า EMR ใหม่ก่อน — แผงไม่รีเฟรชเองหลังส่งคำสั่ง) */
export async function openProcedurePanel(page: Page, hn: string, vn: string, en: string): Promise<Locator> {
  await gotoEmr(page, hn, vn, en);
  const left = page.getByRole('navigation', { name: 'ข้อมูลและเวชระเบียนผู้ป่วย' });
  // ชื่อเมนูมีชื่อไอคอนนำหน้า ("medicine-box หัตถการ") → จับด้วย data-menu-id · [data-panel-id] เป็นแท็บ ไม่ใช่เนื้อหา → รอปุ่ม Treatment Note ของแผง
  const panel = page.getByRole('button', { name: /Treatment Note/ }).first();
  await expect(async () => {
    if (!(await panel.isVisible())) await left.locator('[data-menu-id$="-activityTask"]').first().click({ force: true, timeout: 10_000 });
    await expect(panel).toBeVisible({ timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
  await page.mouse.move(900, 900);
  return panel;
}

/** ปุ่ม "บันทึกหัตถการ" ที่อยู่แถวเดียวกับชื่อหัตถการ (ตารางของแผงไม่ใช่ role row) */
export async function procedureButton(page: Page, name: string): Promise<Locator> {
  const label = page.getByText(name, { exact: true }).filter({ visible: true }).first();
  await expect(label).toBeVisible({ timeout: 30_000 });
  const y = (await label.boundingBox())!.y;
  const buttons = page.getByRole('button', { name: 'บันทึกหัตถการ' });
  for (const b of await buttons.all()) {
    const box = await b.boundingBox();
    if (box && Math.abs(box.y - y) < 45) return b;
  }
  throw new Error(`ไม่พบปุ่ม "บันทึกหัตถการ" ของ ${name}`);
}

/**
 * แผงหัตถการ → ปุ่ม `บันทึกหัตถการ` ของแถว → popover "บันทึกการทำหัตถการ": วันที่ (วันนี้ในปฏิทิน) · เวลา (ชั่วโมง / นาทีปัจจุบัน + ตกลง) · ผู้ทำหัตถการ (ตัวแรก) · Treatment note → บันทึก
 * → graphql CompleteActivity (สำเร็จ = แจ้งเตือน "บันทึกแล้ว" · งานเป็น PERFORMED) — คืน error ของ graphql ถ้าไม่สำเร็จ
 */
export async function recordProcedure(page: Page, name: string): Promise<{ error?: string; performer: string; popover: Locator }> {
  const button = await procedureButton(page, name);
  await expect(button).toBeEnabled();
  await button.click();
  const pop = page.locator('.ant-popover:visible').filter({ hasText: 'บันทึกการทำหัตถการ' }).first();
  await expect(pop).toBeVisible({ timeout: 15_000 });
  const performer = pop.locator('.ant-select').last();
  if (!(await performer.innerText()).trim()) {
    await performer.click();
    await options(page).first().click();
  }
  const [hh, mm] = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).split(':');
  const time = pop.getByPlaceholder('เลือกเวลา');
  await time.click();
  const timePanel = page.locator('.ant-picker-dropdown:visible').last();
  const cols = timePanel.locator('.ant-picker-time-panel-column');
  await cols.nth(0).locator('li').filter({ hasText: new RegExp(`^${hh}$`) }).click();
  await cols.nth(1).locator('li').filter({ hasText: new RegExp(`^${String(Math.floor(Number(mm) / 5) * 5).padStart(2, '0')}$`) }).click();
  await timePanel.getByRole('button', { name: 'ตกลง' }).click();
  await expect(time).not.toHaveValue('');
  // วันที่เลือกเป็นช่องสุดท้าย — สำรวจ 23 ต.ค. เลือกเวลาแล้วค่าวันที่หาย
  const date = pop.getByPlaceholder('เลือกวันที่');
  await date.click();
  await page.locator('.ant-picker-dropdown:visible').last().locator('td.ant-picker-cell-today').click();
  await expect(date).not.toHaveValue('');
  await pop.getByPlaceholder(/Treatment note/).fill('BizSim ทำหัตถการเรียบร้อย');
  await markEvidence(expected(pop));
  await snapEvidence(page, `บันทึกการทำหัตถการ — ${name.slice(0, 20)}`);
  const performerName = (await performer.innerText()).trim();
  const done = graphqlMutation(page, 'CompleteActivity', 30_000);
  await pop.getByRole('button', { name: 'บันทึก', exact: true }).click();
  const body = (await (await done).json()) as { data?: { completeActivity?: { id?: number } }; errors?: { message: string }[] };
  if (!body.data?.completeActivity) return { error: body.errors?.map((e) => e.message).join(' · ') ?? 'ไม่มีผลตอบกลับ', performer: performerName, popover: pop };
  return { performer: performerName, popover: pop };
}

/** เมนูขวา "e-MAR" → แผง e-MAR ของ Visit → มีรายการยาไหม (ไม่มี = "ไม่พบรายการ e-MAR") */
export async function openEmar(page: Page): Promise<{ empty: boolean; panel: Locator; text: string }> {
  // [data-panel-id="patientEmar"] = แท็บของแผง ไม่ใช่เนื้อหา → อ่านจากตาราง e-MAR (หัวคอลัมน์ "รายการยา / รอบยา") หลังหยุดหมุนโหลด (APM-OPD-007 รอบแรก 23 ต.ค. อ่านตอนยังโหลด)
  const header = page.getByRole('main').getByText('รายการยา / รอบยา').first();
  await openCare(page, 'e-MAR', header);
  const panel = header.locator('xpath=ancestor::*[contains(@class,"ant-spin-nested-loading")][1]');
  await expect(panel.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(1_000);
  const empty = await panel.getByText('ไม่พบรายการ e-MAR').isVisible().catch(() => false);
  return { empty, panel, text: (await panel.innerText()).replace(/\s+/g, ' ').trim() };
}

/**
 * แผน Refill ของยาที่อยู่ในตะกร้า: ปุ่ม `refill (n)` → "จัดการการเติมยา (Refill)" → ระยะเวลาต่อรอบ (วัน) → `เพิ่มครั้ง` ตามจำนวนรอบ → จำนวนแต่ละรอบ → ยืนยัน (CreateMedicationRefills)
 * คืน tooltip ของไอคอน Refill ในตะกร้า ("10 / 30 · Refill 0 of 2") + ข้อความปุ่ม refill (n)
 */
export async function planRefill(page: Page, drug: { code: string; name: string; everyDays: string; rounds: string[] }): Promise<{ tooltip: string; button: string; dialogText: string }> {
  const main = page.getByRole('main');
  await main.getByRole('button', { name: /^refill \(\d+\)$/ }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' }).last();
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await dialog.getByRole('spinbutton', { name: 'ระบุ' }).fill(drug.everyDays);
  const add = dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
  for (let i = 0; i < drug.rounds.length; i++) {
    await add.click();
    await page.waitForTimeout(700);
  }
  const row = dialog.locator('tbody tr').filter({ hasText: drug.name }).first();
  const inputs = row.locator('input:not([disabled])');
  await expect(inputs).toHaveCount(drug.rounds.length);
  for (const [i, qty] of drug.rounds.entries()) {
    await inputs.nth(i).fill(qty);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(400);
  }
  const dialogText = (await dialog.innerText()).replace(/\s+/g, ' ');
  await markEvidence(expected(row));
  await snapEvidence(page, 'จัดการการเติมยา (Refill) — ก่อนยืนยัน');
  const created = graphqlMutation(page, 'CreateMedicationRefills', 30_000);
  await dialog.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  const body = (await (await created).json()) as { data?: { createMedicationRefills?: { accepted?: boolean } }; errors?: { message: string }[] };
  expect(body.data?.createMedicationRefills?.accepted, `บันทึกแผน Refill ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  const cartRow = main.getByRole('row').filter({ hasText: `[${drug.code}]` }).last();
  const icon = cartRow.locator('[aria-label="Remed"]').first();
  await icon.hover();
  const tip = page.locator('.ant-tooltip:visible').last();
  await expect(tip).toBeVisible({ timeout: 10_000 });
  const tooltip = (await tip.innerText()).trim();
  await markEvidence(expected(cartRow), expected(tip));
  return { tooltip, button: (await main.getByRole('button', { name: /^refill \(\d+\)$/ }).innerText()).trim(), dialogText };
}

/** ปุ่ม "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา" ในแบบฟอร์ม Discharge (หน้าต่างพยาบาลมีอีกปุ่มในแผงคำสั่งการรักษา) → งานพิมพ์ */
export async function printRefillAtDischarge(nurse: Page, print: PrintCapture): Promise<{ text?: string; error?: string; target: Locator }> {
  const main = nurse.getByRole('main');
  const heading = main.getByRole('heading', { name: 'Discharge', level: 3 });
  const hx = (await heading.boundingBox())?.x ?? 0;
  const buttons = main.getByRole('button', { name: 'พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา' }).filter({ visible: true });
  let target: Locator | undefined;
  // ปุ่มของแบบฟอร์ม Discharge = ปุ่มที่อยู่ฝั่งเดียวกับหัว Discharge (แผงคำสั่งการรักษาอยู่อีกฝั่งของจอ)
  let best = Infinity;
  for (const b of await buttons.all()) {
    const box = await b.boundingBox();
    if (box && Math.abs(box.x - hx) < best && (await b.isEnabled())) {
      best = Math.abs(box.x - hx);
      target = b;
    }
  }
  if (!target) return { error: 'แบบฟอร์ม Discharge ไม่มีปุ่ม "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา" ที่กดได้', target: heading };
  const before = print.jobs.length;
  await target.click();
  const job = await print.next(before, 30_000);
  if (!job) return { error: 'กดปุ่มพิมพ์ใบ Refill แล้วไม่มีงานพิมพ์', target };
  return { text: (await pdfPages(job.pdf)).join(' ').replace(/\s+/g, ' '), target };
}

/** ปุ่มบันทึกของแผงเอกสาร (ปุ่มก่อนหัวชื่อเอกสาร) → reports/generate + แจ้งเตือน "สร้าง<ชื่อ>สำเร็จ" + งานพิมพ์อัตโนมัติ */
async function saveDocumentPanel(page: Page, print: PrintCapture, docName: string): Promise<{ notice: Locator; documentId?: string; printed?: string }> {
  const main = page.getByRole('main');
  const before = print.jobs.length;
  const generated = waitForApi(page, 'POST', '/cortex-api/reports/generate', 60_000);
  await main.getByText(docName, { exact: true }).last().locator('xpath=preceding::button[contains(normalize-space(.),"บันทึก")][1]').click();
  const res = await generated;
  await expectOk(res, `บันทึก${docName}`);
  const notice = page.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: `สร้าง${docName}สำเร็จ` }).first();
  await expect(notice, `ต้องขึ้น "สร้าง${docName}สำเร็จ"`).toBeVisible({ timeout: 30_000 });
  const job = await print.next(before, 30_000);
  return { notice, documentId: res.headers()['x-document-id'], printed: job ? (await pdfPages(job.pdf)).join(' ').replace(/\s+/g, ' ') : undefined };
}

/**
 * เมนูขวา "ใบรับรองแพทย์" → ช่องค้นหาเอกสาร (คนต่างด้าว / ใบขับขี่ / ลาป่วย / Fit to Fly) → ลาป่วย: บังคับ Diagnosis (วันหยุดพัก / จำนวนวันเติมมาแล้ว)
 * → บันทึก ("พิมพ์อัตโนมัติเมื่อบันทึก" ติ๊กไว้ → POST /cortex-api/reports/generate + งานพิมพ์ laser)
 */
export async function createCertificateFromPanel(page: Page, print: PrintCapture): Promise<{ notice: Locator; documentId?: string; printed?: string }> {
  const main = page.getByRole('main');
  const search = main.locator('.ant-select').filter({ hasText: 'ค้นหาเอกสารที่ต้องการสร้าง' }).last();
  await openCare(page, 'ใบรับรองแพทย์', search);
  const docs = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
  await expect(async () => {
    await search.click({ force: true });
    await expect(docs.first()).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 40_000 });
  await docs.filter({ hasText: OPD.certPanel }).first().click();
  const dx = main.getByPlaceholder('Diagnosis');
  await expect(dx).toBeVisible({ timeout: 30_000 });
  await dx.fill(`${OPD.dx.name} (${OPD.dx.code}) ควรพักผ่อน (BizSim)`);
  await markEvidence(expected(dx), expected(main.getByText('พิมพ์อัตโนมัติเมื่อบันทึก').last()));
  await snapEvidence(page, `${OPD.certPanel} — ก่อนบันทึก`);
  return saveDocumentPanel(page, print, OPD.certPanel);
}

/** เมนูซ้าย "เอกสาร" → แท็บรายการเอกสารของผู้ป่วย (ปุ่ม ตรวจสอบเอกสาร ORS / สร้างเอกสาร / อัปโหลด) → คืนปุ่มสร้างเอกสาร */
export async function openDocumentsMenu(page: Page): Promise<Locator> {
  const left = page.getByRole('navigation', { name: 'ข้อมูลและเวชระเบียนผู้ป่วย' });
  const create = page.getByRole('main').getByRole('button', { name: /สร้างเอกสาร$/ }).filter({ visible: true }).first();
  await expect(async () => {
    if (!(await create.isVisible())) await left.locator('[data-menu-id$="-document"]').first().click({ force: true, timeout: 10_000 });
    await expect(create).toBeVisible({ timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
  await page.mouse.move(900, 900);
  return create;
}

/**
 * เมนูเอกสาร → `สร้างเอกสาร` → แผง "สร้างเอกสาร": ประเภท = ใบรับรองแพทย์ (รายการเลื่อน พิมพ์ค้นไม่ได้ — กดลูกศรลงจนถึง) → เอกสาร = ใบขับขี่
 * → สรุปความเห็นของแพทย์ (ตัวเลือกแรก) → บันทึก (พิมพ์อัตโนมัติ)
 */
export async function createCertificateFromDocuments(page: Page, print: PrintCapture): Promise<{ notice: Locator; documentId?: string; printed?: string }> {
  const main = page.getByRole('main');
  const create = await openDocumentsMenu(page);
  await create.click();
  const type = main.getByText('ประเภท:', { exact: true }).last().locator('xpath=following::*[contains(@class,"ant-select")][1]');
  await expect(type).toBeVisible({ timeout: 30_000 });
  await type.click();
  const active = page.locator('.ant-select-dropdown:visible .ant-select-item-option-active');
  for (let i = 0; i < 80; i++) {
    if ((await active.innerText().catch(() => '')).trim() === 'ใบรับรองแพทย์') {
      await page.keyboard.press('Enter');
      break;
    }
    await page.keyboard.press('ArrowDown');
  }
  await expect(type).toHaveText('ใบรับรองแพทย์');
  const search = main.locator('.ant-select').filter({ visible: true }).filter({ hasText: 'ค้นหาเอกสารที่ต้องการสร้าง' }).last();
  await search.click();
  await options(page).filter({ hasText: OPD.certDocument }).first().click();
  const opinion = main.getByText('ไม่เป็นอุปสรรคต่อการขับขี่ยานยนต์', { exact: true }).last();
  await expect(opinion).toBeVisible({ timeout: 30_000 });
  await opinion.click();
  await markEvidence(expected(type), expected(opinion));
  await snapEvidence(page, `${OPD.certDocument} — ก่อนบันทึก`);
  return saveDocumentPanel(page, print, OPD.certDocument);
}

/** เมนูเอกสาร → แถวเอกสารประเภทใบรับรองแพทย์ */
export async function certificateRows(page: Page): Promise<{ rows: string[]; table: Locator }> {
  await openDocumentsMenu(page);
  const table = page.getByRole('main').locator('tr.ant-table-row').filter({ hasText: 'ใบรับรองแพทย์' });
  await expect(table.first()).toBeVisible({ timeout: 30_000 });
  return { rows: (await table.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()), table };
}

/** แถวเอกสาร → ปุ่ม View → ตัวแสดง PDF (มีปุ่ม Print ของตัวแสดง) → ข้อความในเอกสารจาก GET /documents/<id>/file · ปิดตัวแสดง */
export async function viewDocument(page: Page, row: Locator): Promise<{ text: string; hasPrint: boolean }> {
  const file = page.waitForResponse((res) => /\/cortex-api\/documents\/\d+\/file/.test(res.url()), { timeout: 60_000 });
  await row.getByRole('button', { name: 'View' }).click();
  const res = await file;
  await expectOk(res, 'เปิดเอกสาร');
  const text = (await pdfPages(await res.body())).join(' ').replace(/\s+/g, ' ');
  const viewer = page.locator('.ant-modal-container, [role=dialog]').filter({ visible: true }).last();
  const printButton = viewer.getByRole('button', { name: 'Print' });
  const hasPrint = await printButton.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false);
  await markEvidence(expected(hasPrint ? printButton : viewer));
  await snapEvidence(page, 'ตัวแสดงเอกสาร PDF');
  await viewer.getByRole('button', { name: 'Close' }).first().click().catch(() => page.keyboard.press('Escape'));
  return { text, hasPrint };
}

/** หน้าข้อมูลผู้ป่วยโดยไม่ระบุ Visit (/cortex/next/patients/<HN>) — ใช้ดูเอกสารย้อนหลัง */
export async function gotoPatientNoVisit(page: Page, hn: string) {
  await page.goto(`/cortex/next/patients/${hn}`);
  await expect(page.getByRole('navigation', { name: 'ข้อมูลและเวชระเบียนผู้ป่วย' })).toBeVisible({ timeout: 120_000 });
}

/**
 * เปิด Visit แบบ Walk-in (ไม่มีนัด) ที่ OPD.clinic: เวชระเบียน ค้น HN → + Visit ใหม่ → ช่องคลินิก → สิทธิ UC ลำดับ 1 → สร้าง
 * SBH Prod: แถวได้ประเภท "คำขอ Walk-in" (ยังไม่มีแพทย์) → ลงตารางแพทย์ต่อด้วย scheduleWalkInRequest (= เช็คอิน)
 */
export async function openWalkInVisit(page: Page, hn: string): Promise<{ vn: string; en: string; row: string }> {
  await searchPatientByHn(page, hn);
  await openNewVisitPanel(page);
  const main = page.getByRole('main');
  const clinic = main.locator('.ant-select').filter({ hasText: /^คลินิก$/ }).getByRole('combobox');
  await clinic.fill('อายุรกรรมโรคทั่วไป');
  await options(page).filter({ hasText: OPD.clinic }).first().click();
  const row = main.getByRole('row').filter({ hasText: /Walk-in/ }).filter({ hasText: OPD.clinic }).first();
  await expect(row, `แผงเปิด Visit ต้องมีแถว Walk-in ของ ${OPD.clinic}`).toBeVisible({ timeout: 30_000 });
  await addCoverageFirst(page, OPD.coverage);
  await markEvidence(expected(row), expected(main.getByRole('row').filter({ hasText: OPD.coverage }).first()));
  await snapEvidence(page, 'ก่อนกด — สร้าง Visit Walk-in');
  const created = graphqlMutation(page, 'CreateVisit', 60_000);
  await main.getByRole('button', { name: 'สร้าง', exact: true }).click();
  const res = await created;
  await expectOk(res, 'เปิด Visit Walk-in');
  const body = (await res.json()) as {
    data?: { createVisit?: { visit?: { vn: string; encounters: { en: string }[] }; attendanceResult?: { vn: string; attendances: { en: string }[] } } };
    errors?: { message: string }[];
  };
  const v = body.data?.createVisit;
  const vn = v?.visit?.vn ?? v?.attendanceResult?.vn;
  const en = v?.visit?.encounters?.[0]?.en ?? v?.attendanceResult?.attendances?.[0]?.en;
  if (!vn || !en) throw new Error(`เปิด Visit ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ') ?? JSON.stringify(body).slice(0, 300)}`);
  const after = main.getByRole('row').filter({ hasText: OPD.clinic }).first();
  await expect(after).toBeVisible({ timeout: 30_000 });
  await markEvidence(expected(after));
  return { vn, en, row: (await after.innerText()).replace(/\s+/g, ' ').trim() };
}
