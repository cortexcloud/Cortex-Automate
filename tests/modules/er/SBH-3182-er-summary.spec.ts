import { type Browser, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { dismissToast, expectOk, gotoErDashboard, type ErVisit } from '../../../helpers/functions/er';
import { createAdmitRequest } from '../../../helpers/functions/er-admit';
import { graphqlMutation, openDisposition, signDisposition, startDisposition, dispositionTextBoxes } from '../../../helpers/functions/er-disposition';
import { erDischargeButton, erDischargeConfirm, erListRow, filterErListByHn, gotoErPatientList, openErListTab } from '../../../helpers/functions/er-list';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import {
  ER_SUMMARY_SECTION_TITLE,
  erLos,
  erSummaryOrder,
  erSummaryPanel,
  erSummaryPill,
  erSummarySection,
  fetchErSummaryApi,
  fieldOf,
  interactiveInside,
  openErSummary,
  readFields,
  readOrders,
  readTable,
  thaiDateTime,
} from '../../../helpers/functions/er-summary';
import { erTriagePanel, saveErTriageForm, fillErTriageForm, type VitalSigns } from '../../../helpers/functions/er-triage';
import { clearEvidenceMarks, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, recordDrugAllergy, registerAndOpenErVisit, submitOrders } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, addMedicineToCart, careMenu, gotoVisit, openPatientAs, recordMenu, replyConsult, requestConsult } from '../../../mock-data/uat-play';

// SBH-3182 [ER][ER Summary] Created ER Summary Trauma/Non-Trauma — ประวัติการรักษา > แท็บ ER Summary
// ชุด Manual: EXE SBH-3456 → HPY SBH-3459 (TC 001–039) · UHP SBH-3461 (TC 040) · EDG SBH-3464 (TC 041–059) — เลข Issue ใน ISSUE ด้านล่าง
// 1 เทส = 1 ผู้ป่วย (R9) · ผู้ป่วย AUTO ใหม่ (R10) · บัญชีหลัก Super_User (user1 = แพทย์ "ทดสอบ มานะ") · ผู้ขอ Consult = บัญชี Doctor (หน้าต่างแยก)
// คลิป 1 ไฟล์ต่อ 1 TC (R61) · TC ที่ไม่ผ่านไม่หยุดเทส (soft) · ภาพเทียบค่าแสดงตารางของสคริปต์ครึ่งล่าง
// คำตอบผู้ใช้ (decisions R88): A / T1 Admit เลือกเตียงได้ · ส่วนการนำส่งเล่น 2 แบบ (Triage + PHER+) · ลงผล + สถานะ ·
//   2 พ.ย. 2026: TC-043 / 044 ใช้ผู้ป่วย E เดิม (มาถึง 31 ต.ค.) ตรวจรูปแบบ "x วัน y ชม." อย่างเดียว
// หน้าจอ (dev-x 2 พ.ย. 2026 · index-Ddss3Q8D.js): ดู helpers/functions/er-summary.ts + cortex-automate screens/er.md "ER Summary รุ่น SBH-3182"
//   ER ไม่มีเมนู Continue Order (มีแต่ One Day Order) · ยกเลิกยา = ปุ่ม ยกเลิก ท้ายแถวในรายการ One Day Order (CancelOpdMedicationRequestById)
//   Reconcile Med = เมนูขวา ปุ่ม ยืนยัน (UpsertOpdMedicationReconcile) · U/D = ส่วน Underlying Disease ในฟอร์มคัดกรอง (ระดับผู้ป่วย — UpsertUnderlyingDisease)
//   Diagnosis ของฟอร์มแพทย์เป็นแบบ onset (diagnosis_onset_general_v1) — แถว 1 = Principal · แถวถัดไป = Comorbid อัตโนมัติ
// ใช้ผู้ป่วยเดิม (ข้ามขั้นเตรียม — ตรวจซ้ำอ่านอย่างเดียว): SBH3182_<KEY>=HN,VN,EN (KEY = A B C D F G T1 T2 T3 H I) · รายที่เตรียมแล้วจดใน .cache/SBH-3182/state.json
// รัน (dev-x): npx playwright test --headed --grep "@SBH-3182-A" (ทีละผู้ป่วย) · ผู้ป่วย D: @SBH-3182-D แล้ว @SBH-3182-D-time (รอจนครบ 59 / 60 นาที)

const ISSUE: Record<number, string> = {
  1: 'SBH-3468', 2: 'SBH-3470', 3: 'SBH-3472', 4: 'SBH-3474', 5: 'SBH-3476', 6: 'SBH-3479', 7: 'SBH-3480', 8: 'SBH-3481', 9: 'SBH-3482', 10: 'SBH-3483',
  11: 'SBH-3484', 12: 'SBH-3485', 13: 'SBH-3486', 14: 'SBH-3487', 15: 'SBH-3488', 16: 'SBH-3489', 17: 'SBH-3490', 18: 'SBH-3491', 19: 'SBH-3492', 20: 'SBH-3493',
  21: 'SBH-3494', 22: 'SBH-3495', 23: 'SBH-3496', 24: 'SBH-3497', 25: 'SBH-3498', 26: 'SBH-3499', 27: 'SBH-3500', 28: 'SBH-3501', 29: 'SBH-3502', 30: 'SBH-3503',
  31: 'SBH-3504', 32: 'SBH-3505', 33: 'SBH-3507', 34: 'SBH-3509', 35: 'SBH-3511', 36: 'SBH-3512', 37: 'SBH-3515', 38: 'SBH-3517', 39: 'SBH-3519', 40: 'SBH-3521',
  41: 'SBH-3524', 42: 'SBH-3526', 43: 'SBH-3528', 44: 'SBH-3531', 45: 'SBH-3533', 46: 'SBH-3535', 47: 'SBH-3537', 48: 'SBH-3539', 49: 'SBH-3541', 50: 'SBH-3543',
  51: 'SBH-3546', 52: 'SBH-3549', 53: 'SBH-3550', 54: 'SBH-3551', 55: 'SBH-3552', 56: 'SBH-3554', 57: 'SBH-3555', 58: 'SBH-3557', 59: 'SBH-3559',
};
const tcId = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const TC = (n: number) => `${tcId(n)} (${ISSUE[n]})`;
const meta = (key: string, ...tcs: number[]) => ({
  tag: ['@SBH-3182', `@SBH-3182-${key}`, ...tcs.map((n) => `@${ISSUE[n]}`)],
  annotation: [{ type: 'issue', description: 'https://linear.app/cortexcloud/issue/SBH-3182' }],
});

const CACHE = path.join(__dirname, '..', '..', '..', '.cache', 'SBH-3182');
const STATE_FILE = path.join(CACHE, 'state.json');
type Saved = ErVisit & { name: string; arrivedAt?: string; preparedAt: string; info?: Record<string, string> };
const readState = (): Record<string, Saved> => (fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {});
function saveState(key: string, value: Saved) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...readState(), [key]: value }, null, 2));
}
const bangkokText = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const bad = (rows: CompareRow[]) => rows.filter((r) => !r.same).map((r) => `${r.label}: Expected ${r.values[0]} · จริง ${r.values[1]}`);
const row = (label: string, want: string, got: string, same = want === got): CompareRow => ({ label, values: [want, got || '(ว่าง)'], same });

const LAB = 'SBHLAB399';
const IMAGING = 'SBHIMG1';
const PROCEDURE = '89.52';
const MEDS = ['med0000006', 'med0000007', 'med0000008'];
const CANCEL_MED = 'med0000008';
const CONSULT_DOCTOR = { search: 'มานะ', name: /ทดสอบ มานะ/ };
const VITALS_RETRIAGE: VitalSigns[] = [
  { systolic: '130', diastolic: '85', pr: '92', rr: '20', temp: '37.8', spo2: '97', painScore: '4' },
  { systolic: '118', diastolic: '76', pr: '84', rr: '18', temp: '37.2', spo2: '99', painScore: '2' },
];

// ------------------------------------------------------------------------------------------------
// ฟอร์มคัดกรอง ER
function triageForm(page: Page) {
  const panel = erTriagePanel(page);
  const arrival = panel.getByRole('region', { name: 'ER Arrival' });
  return {
    panel,
    arrival,
    arrivalRadio: (name: string) => arrival.getByRole('radio', { name, exact: true }),
    transporter: arrival.getByRole('textbox', { name: 'ระบุชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ' }),
    preHospital: arrival.getByRole('textbox', { name: /รายละเอียด EMS/ }),
    emergency: panel.getByRole('radiogroup', { name: 'ประเภทฉุกเฉิน' }).first(),
    fastTrack: panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first(),
    levels: panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }).first(),
  };
}

interface TriageInput {
  level: 1 | 2 | 3 | 4 | 5;
  vitals: Partial<VitalSigns>;
  arrival?: { method: 'Walk-in' | 'EMS'; ems?: 'ALS' | 'BLS' | 'ILS' | 'FR'; transporter?: string; preHospital?: string };
  ud?: string;
  trauma?: boolean;
  fastTrack?: string;
  chiefComplaint?: boolean;
}

/** ผู้ป่วย AUTO ใหม่ → เปิด Visit ER → รอฟอร์มคัดกรองพร้อม */
async function newErVisit(page: Page, key: string): Promise<ErVisit & { name: string }> {
  // dev-x ช้า / กำลัง deploy (2 พ.ย. 12:27) หน้า Dashboard ไม่ขึ้นใน 20 วิ → ลองใหม่
  await expect(async () => {
    await gotoErDashboard(page);
  }, 'เปิด ER Dashboard').toPass({ timeout: 180_000 });
  const patient = newTestPatient(`X3182${key}`);
  const visit = await registerAndOpenErVisit(page, patient);
  await expect(page.getByRole('main').getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(erTriagePanel(page).getByRole('combobox', { name: 'Eye Opening (E)' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 120_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
  return { ...visit, name: `${patient.firstName} ${patient.familyName}` };
}

/** U/D ระดับผู้ป่วย (ส่วน Underlying Disease ในหน้าที่เปิดอยู่ — ฟอร์มคัดกรอง / ประวัติทางการแพทย์) → ปุ่มบันทึกของส่วน */
async function saveUnderlying(page: Page, code: string): Promise<string> {
  const section = page.getByRole('main').getByRole('heading', { name: /Underlying Disease/ }).filter({ visible: true }).first().locator('xpath=ancestor::div[.//table][1]');
  await section.scrollIntoViewIfNeeded();
  await section.getByRole('combobox').first().click();
  await page.keyboard.type(code.replace('.', ''), { delay: 60 });
  // รหัสในรายการไม่มีจุด (E119 - …) · ฟอร์มคัดกรองแสดง I10 - …
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${code.replace('.', '\\.?')} - `) }).first();
  await expect(option, `ค้นโรค ${code} ต้องเจอ`).toBeVisible({ timeout: 20_000 });
  const display = norm(await option.innerText()).replace(/^\S+ - /, '').replace(/ \(.*\)$/, '');
  const saved = graphqlMutation(page, 'UpsertUnderlyingDisease', 30_000);
  await option.click();
  // ส่วนในฟอร์มคัดกรองมีปุ่มบันทึกของตัวเอง · หน้าประวัติทางการแพทย์ไม่มีปุ่ม (บันทึกตอนเลือก)
  const button = section.getByRole('button', { name: /บันทึก/ });
  if (await button.count()) await button.first().click();
  await expectOk(await saved, `บันทึกโรคประจำตัว ${code}`);
  await expect(section.locator('table')).toContainText(display);
  return display;
}

/** กรอกฟอร์มคัดกรองครั้งแรก (ER Arrival · U/D · สัญญาณชีพ · GCS · CC · ประเภทฉุกเฉิน · Fast Track · ระดับ) → บันทึก */
async function triage(page: Page, visit: ErVisit, input: TriageInput): Promise<Record<string, string>> {
  const f = triageForm(page);
  const info: Record<string, string> = {};
  // U/D ก่อน แล้วโหลดหน้าใหม่ — บันทึก U/D ระหว่างกรอกคัดกรอง ร่างฟอร์มชนกัน ("ร่างถูกแก้ไขจากที่อื่น …" ฟอร์มล็อก ไม่ส่งคำสั่งบันทึก — dev-x 2 พ.ย.)
  if (input.ud) {
    info.ud = await saveUnderlying(page, input.ud);
    await gotoVisit(page, visit);
    await expect(f.panel.getByRole('combobox', { name: 'Eye Opening (E)' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 120_000 });
    await page.waitForTimeout(2_000);
  }
  if (input.arrival) {
    const a = input.arrival;
    if (a.method === 'EMS') {
      await f.arrival.getByText('EMS', { exact: true }).click();
      await expect(f.arrivalRadio('EMS')).toBeChecked();
      if (a.ems) {
        await f.arrival.getByText(a.ems, { exact: true }).click();
        await expect(f.arrivalRadio(a.ems)).toBeChecked();
      }
      if (a.transporter) {
        await f.transporter.fill(a.transporter);
        await f.transporter.press('Tab');
      }
      if (a.preHospital) {
        await f.preHospital.fill(a.preHospital);
        await f.preHospital.press('Tab');
      }
      await page.waitForTimeout(1_500);
      info.arrival = `EMS${a.ems ? ` (${a.ems})` : ''} · ผู้นำส่ง ${norm(await f.arrival.locator('.ant-select').first().innerText())}${a.transporter ? ` · ${a.transporter}` : ''}${a.preHospital ? ` · ก่อนถึง รพ.: ${a.preHospital}` : ' · ไม่กรอกข้อมูลก่อนถึงโรงพยาบาล'}`;
    } else info.arrival = 'Walk-in';
  }
  const v = input.vitals;
  for (const [name, value] of [['Systolic', v.systolic], ['Diastolic', v.diastolic], ['PR', v.pr], ['RR', v.rr], ['Temp', v.temp], ['SpO2', v.spo2]] as const) {
    if (value !== undefined) await f.panel.getByRole('spinbutton', { name }).first().fill(value);
  }
  if (v.painScore !== undefined) await f.panel.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Pain score' }) }).first().selectOption(v.painScore);
  if (input.chiefComplaint !== false) await f.panel.getByRole('group', { name: 'Common chief complaints' }).getByRole('button').first().click();
  for (const [name, score] of [['Eye Opening (E)', '4'], ['Verbal Response (V)', '5'], ['Motor Response (M)', '6']]) {
    const select = f.panel.getByRole('combobox', { name }).first();
    const label = (await select.locator('option').allTextContents()).find((t) => t.startsWith(`${score} `));
    if (label) await select.selectOption({ label });
  }
  if (input.trauma) {
    await f.emergency.getByText('Trauma', { exact: true }).click();
    await expect(f.emergency.getByRole('radio', { name: 'Trauma', exact: true })).toBeChecked();
  }
  if (input.fastTrack) await f.fastTrack.selectOption({ label: input.fastTrack });
  info.emergency = input.trauma ? 'Trauma' : 'Non-Trauma';
  info.fastTrack = input.fastTrack ?? '-';
  await f.levels.scrollIntoViewIfNeeded();
  await f.levels.getByText(String(input.level), { exact: true }).click();
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await expect(page.getByRole('main').getByText('Clinical Summary', { exact: true }), 'บันทึกคัดกรองแล้วต้องอยู่หน้า Overview').toBeVisible({ timeout: 60_000 });
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ').catch(() => undefined);
  return info;
}

/** รอให้นาทีของนาฬิกาเปลี่ยน (แถว Vital signs แสดง HH:mm — บันทึกแต่ละครั้งต่างนาทีกัน) */
async function waitNextMinute(page: Page) {
  const minute = new Date().getMinutes();
  while (new Date().getMinutes() === minute) await page.waitForTimeout(2_000);
  await page.waitForTimeout(2_000);
}

/** คัดกรองซ้ำบนหน้า Overview (ปุ่ม redo คัดกรองซ้ำ) */
async function reTriage(page: Page, visit: ErVisit, level: 1 | 2 | 3 | 4 | 5, vitals: VitalSigns) {
  await gotoVisit(page, visit);
  const redo = page.getByRole('main').getByRole('button', { name: 'redo คัดกรองซ้ำ' });
  await expect(redo).toBeVisible({ timeout: 90_000 });
  await redo.scrollIntoViewIfNeeded();
  await redo.click();
  await fillErTriageForm(page, { level, vitals, chiefComplaint: false });
  await saveErTriageForm(page, `บันทึกคัดกรองซ้ำของ ${visit.en}`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ').catch(() => undefined);
}

/** แก้การคัดกรองครั้งแรก (ปุ่ม แก้ไข ในประวัติการคัดกรองบน Overview) → เปลี่ยนประเภทฉุกเฉิน → บันทึก */
async function editTriageEmergency(page: Page, visit: ErVisit, to: 'Trauma' | 'Non-Trauma') {
  // ปุ่ม แก้ไข ในประวัติการคัดกรองเปิด "แก้ไขการประเมิน" ที่แก้ได้เฉพาะประเภท / เวลาที่ประเมิน → เปลี่ยนประเภทฉุกเฉินด้วย คัดกรองซ้ำ
  await gotoVisit(page, visit);
  const redo = page.getByRole('main').getByRole('button', { name: 'redo คัดกรองซ้ำ' });
  await expect(redo).toBeVisible({ timeout: 90_000 });
  await redo.scrollIntoViewIfNeeded();
  await redo.click();
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL, chiefComplaint: false });
  const f = triageForm(page);
  await f.emergency.scrollIntoViewIfNeeded();
  await f.emergency.getByText(to, { exact: true }).click();
  await expect(f.emergency.getByRole('radio', { name: to, exact: true })).toBeChecked();
  await markEvidence(filled(f.emergency, `คัดกรองซ้ำ: ${to}`));
  await snapEvidence(page, `กรอก — คัดกรองซ้ำ เปลี่ยนเป็น ${to}`);
  await clearEvidenceMarks(page);
  await saveErTriageForm(page, `คัดกรองซ้ำ → ${to} ของ ${visit.en}`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ').catch(() => undefined);
}

// ------------------------------------------------------------------------------------------------
// ข้อมูลเสริมของผู้ป่วย
/** Reconcile Med: ยาที่ได้รับก่อนเข้ารักษา = มี → ยา PARATEMP + วิธีใช้ + จำนวน + หน่วย → ยืนยัน → คืนชื่อยา */
async function reconcileMed(page: Page): Promise<string> {
  const main = page.getByRole('main');
  await careMenu(page, 'Reconcile Med', main.getByText('ยาที่ได้รับก่อนเข้ารักษาในโรงพยาบาล').first());
  await main.getByText('ยาที่ได้รับก่อนเข้ารักษาในโรงพยาบาล').first().locator('xpath=following::label[1]').click();
  await main.getByText('ค้นหายา', { exact: true }).first().click({ force: true });
  await page.keyboard.type('paratemp', { delay: 60 });
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^PARATEMP/ }).first();
  await expect(option, 'ค้นยา PARATEMP ต้องเจอ').toBeVisible({ timeout: 20_000 });
  const drug = norm(await option.innerText());
  await option.click();
  await main.locator('input[name="usedMedications.0.instruction"]').fill('1 เม็ด เมื่อปวด ทุก 6 ชม.');
  await main.locator('input[name="usedMedications.0.remainingAmount"]').fill('10');
  const unit = main.locator('tr').filter({ has: page.locator('input[name="usedMedications.0.instruction"]') }).locator('.ant-select').nth(1);
  await unit.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  const saved = graphqlMutation(page, 'UpsertOpdMedicationReconcile', 30_000);
  await main.getByRole('button', { name: /ยืนยัน/ }).first().click();
  const res = await saved;
  await expectOk(res, 'ยืนยัน Reconcile Med');
  expect(((await res.json()) as { data?: { upsertOpdMedicationReconcileByVN?: { accepted?: boolean } } }).data?.upsertOpdMedicationReconcileByVN?.accepted).toBe(true);
  return drug;
}

/** เปิด One Day Order (แผง Overview โหลดตามหลังแล้วทับ — รอช่องค้นหายานิ่ง 3 วินาที) */
async function openOneDayOrder(page: Page) {
  const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  await expect(async () => {
    if (!(await search.isVisible())) await careMenu(page, 'One Day Order', page.getByRole('main').getByRole('heading', { name: 'Order', exact: true }));
    await expect(search).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(3_000);
    await expect(search).toBeVisible({ timeout: 1_000 });
  }, 'เปิด One Day Order').toPass({ timeout: 180_000 });
  await page.mouse.move(700, 700);
}

/** ยกเลิกยาที่ส่งแล้วจากรายการ One Day Order (ปุ่ม ยกเลิก ท้ายแถว → ยืนยัน) */
async function cancelMedication(page: Page, code: string) {
  await openOneDayOrder(page);
  const line = page.getByRole('main').getByRole('row').filter({ hasText: `[${code}]` }).first();
  await expect(line).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1_500);
  await line.getByRole('button', { name: 'ยกเลิก' }).dispatchEvent('click');
  const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').filter({ hasText: 'ยกเลิกรายการนี้?' }).last();
  await expect(pop).toBeVisible();
  const cancelled = graphqlMutation(page, 'CancelOpdMedicationRequestById', 30_000);
  await pop.getByRole('button', { name: 'ยืนยัน' }).click();
  await expectOk(await cancelled, `ยกเลิกยา ${code}`);
}

/** แพทย์อีกบัญชี (Doctor) ขอ Consult ถึง "ทดสอบ มานะ" → (reply) บัญชีหลักตอบ */
async function consult(page: Page, browser: Browser, visit: ErVisit, problem: string, reply: boolean): Promise<string> {
  const doctor = await openPatientAs(browser, 'Doctor', visit.hn, visit);
  try {
    const target = await requestConsult(doctor, problem, { doctor: CONSULT_DOCTOR });
    if (reply) {
      await gotoVisit(page, visit);
      await replyConsult(page, problem, `ตอบ Consult (SBH-3182 ${visit.en})`);
    }
    return target;
  } finally {
    await doctor.context().close().catch(() => undefined);
  }
}

/** Admit Request → ศูนย์จัดการเตียง "สร้าง AN" เลือกเตียงตัวแรก (ผู้ใช้อนุญาต — R88) → คืน AN + หอผู้ป่วย */
async function admitWithBed(page: Page, visit: ErVisit, auth: () => string): Promise<{ an: string; ward: string }> {
  const main = page.getByRole('main');
  const req = await createAdmitRequest(page, 'ทดสอบ SBH-3182');
  await page.goto('/cortex/admission-center/admission-management?tab=admit-request-list');
  const rowEl = main.getByRole('row').filter({ hasText: visit.hn }).first();
  await rowEl.waitFor({ timeout: 90_000 });
  await rowEl.getByRole('button', { name: 'สร้าง AN' }).click();
  await page.waitForURL(/admitRequestId=/, { timeout: 60_000 });
  await main.getByText('รายละเอียด Admit').first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(3_000);
  const sticker = main.getByRole('checkbox', { name: 'พิมพ์สติ๊กเกอร์ AN เมื่อบันทึก' });
  if (await sticker.isChecked().catch(() => false)) await sticker.uncheck();
  for (const label of [/^เลขเตียง :/, /^ประเภทการรับ Admit :/, /^รับ Admit จาก :/]) {
    const sel = main.getByText(label).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
    const current = norm(await sel.innerText());
    if (current && current !== 'เลือก') continue;
    await sel.click();
    const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
    await page.waitForTimeout(800);
  }
  const submit = main.getByRole('button', { name: 'check ส่งข้อมูล' });
  await expect(submit).toBeEnabled();
  await submit.click();
  const dialog = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
  if (await dialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false)) await dialog.getByRole('button', { name: /ยืนยัน/ }).first().click();
  const saved = page.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: /AN \d{5,}/ }).first();
  await expect(saved, 'สร้าง AN แล้วต้องมีแจ้งเตือนเลข AN').toBeVisible({ timeout: 30_000 });
  const an = norm(await saved.innerText()).match(/AN (\d{5,})/)![1];
  const res = await page.request.get(`/cortex-api/er/encounters/${visit.en}`, { headers: { authorization: auth() } });
  expect(((await res.json()) as { an: string | null }).an, 'Encounter ER ต้องผูกกับ AN ที่สร้าง').toBe(an);
  return { an, ward: req.ward };
}

/** ช่อง โรงพยาบาลปลายทาง (By Transfer) → เลือกตัวเลือกแรก → คืนชื่อ */
async function chooseReferHospital(page: Page): Promise<string> {
  const label = page.getByRole('main').getByText('โรงพยาบาลปลายทาง', { exact: true }).first();
  await expect(label, 'เลือก By Transfer แล้วต้องมีช่อง โรงพยาบาลปลายทาง').toBeVisible();
  const select = label.locator('xpath=following::input[1]').locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
  for (const keyword of ['สระบุรี', 'โรงพยาบาล', '']) {
    await select.click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    if (keyword) await page.keyboard.type(keyword, { delay: 60 });
    if (await option.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false)) break;
  }
  const value = norm((await option.getAttribute('title')) ?? (await option.innerText()));
  await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
  return value;
}

/** Disposition: เริ่ม → Improved + วิธีจำหน่าย (+ โรงพยาบาลปลายทาง) → ช่องบังคับ → ลงนาม */
async function dispose(page: Page, visit: ErVisit, method: 'รับไว้รักษาต่อIPD' | 'By Transfer' | 'With Approval'): Promise<{ hospital?: string; signedAt: string; signedBy: string }> {
  await gotoVisit(page, visit);
  // แผง Overview โหลดตามหลังแล้วทับแท็บ Disposition → careMenu กดซ้ำจนหัว สรุปการจำหน่าย ขึ้น
  await careMenu(page, 'Disposition', page.getByRole('main').getByText('สรุปการจำหน่าย', { exact: true }));
  await page.waitForTimeout(3_000);
  if (!(await page.getByRole('main').getByText('สรุปการจำหน่าย', { exact: true }).isVisible())) await openDisposition(page);
  await page.mouse.move(600, 600);
  if (await page.getByTestId('er-disposition-start').isVisible().catch(() => false)) await startDisposition(page);
  const main = page.getByRole('main');
  await main.getByRole('radio', { name: 'Improved', exact: true }).check();
  await main.getByRole('radio', { name: method, exact: true }).check();
  const hospital = method === 'By Transfer' ? await chooseReferHospital(page) : undefined;
  const suggested = main.getByRole('button', { name: 'ใช้รหัสโรคที่แนะนำ' });
  if (await suggested.isVisible().catch(() => false)) await suggested.click();
  const { clinical, finding } = dispositionTextBoxes(page);
  await clinical.fill(`ทดสอบ SBH-3182 ${method}`);
  await finding.fill(`ทดสอบ SBH-3182 ${method}`);
  await markEvidence(filled(main.getByRole('radio', { name: method, exact: true }).locator('xpath=ancestor::label[1]'), method), clicked(page.getByTestId('er-disposition-finalize'), 'ลงนาม'));
  await snapEvidence(page, `ก่อนกด — ลงนาม Disposition ${method}`);
  const summary = await signDisposition(page);
  return { hospital, signedAt: summary.completedAt ?? '', signedBy: summary.completedBy?.display ?? '' };
}

/** หน้ารายการผู้ป่วย ER แท็บ รอจำหน่าย → ปุ่ม จำหน่าย → ยืนยัน (ได้เวลาออกจาก ER) */
async function dischargeFromEr(page: Page, visit: ErVisit) {
  await gotoErPatientList(page);
  await filterErListByHn(page, visit.hn);
  await openErListTab(page, 'waiting-for-discharge');
  const line = erListRow(page, visit.en);
  await expect(line, 'ผู้ป่วยต้องอยู่แท็บ รอจำหน่าย').toBeVisible({ timeout: 30_000 });
  await erDischargeButton(line).click();
  const confirm = erDischargeConfirm(page);
  const discharged = graphqlMutation(page, 'DischargeEncounterStatus', 40_000);
  await confirm.getByRole('button', { name: 'จำหน่าย', exact: true }).click();
  await expectOk(await discharged, 'จำหน่ายผู้ป่วยออกจาก ER');
}

/** เมนูขวา สร้างนัดหมาย → ประเภทบริการตัวแรก → ช่วงเวลาแรกที่ว่าง → Submit → คืนวันเวลานัด */
async function createAppointment(page: Page): Promise<string> {
  const main = page.getByRole('main');
  await careMenu(page, 'สร้างนัดหมาย', main.getByRole('heading', { name: 'สร้างนัดหมาย' }));
  await page.mouse.move(600, 600);
  const service = main.getByText(/ประเภทบริการ\s*:/).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
  await expect(service).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2_000);
  if (/เลือก|^$/.test(norm(await service.innerText()))) {
    await service.click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  }
  const slot = main.locator('.ant-radio-wrapper').filter({ hasText: /\d\d:\d\d - \d\d:\d\d/ }).filter({ visible: true });
  await expect(slot.first(), 'ต้องมีช่วงเวลานัดให้เลือก').toBeVisible({ timeout: 30_000 });
  if (!(await slot.filter({ has: page.locator('.ant-radio-checked') }).count())) await slot.filter({ hasNot: page.locator('.ant-radio-disabled') }).first().click();
  const picked = norm(await slot.filter({ has: page.locator('.ant-radio-checked') }).first().innerText());
  const day = (await main.locator('.ant-picker-calendar td.ant-picker-cell-selected').filter({ visible: true }).first().getAttribute('title')) ?? '';
  const created = graphqlMutation(page, 'CreatePhysicianAppointment', 60_000);
  await main.getByRole('button', { name: /Submit/ }).filter({ visible: true }).first().click();
  const duplicate = page.getByRole('button', { name: 'ยืนยันทำนัดหมายซ้ำ' });
  if (await duplicate.waitFor({ timeout: 8_000 }).then(() => true, () => false)) await duplicate.click();
  const body = (await (await created).json()) as { data?: { createPhysicianAppointment?: { id: string } }; errors?: { message: string }[] };
  if (!body.data?.createPhysicianAppointment) throw new Error(`สร้างนัดหมายไม่สำเร็จ: ${JSON.stringify(body).slice(0, 300)}`);
  return `${day} ${picked}`;
}

// ------------------------------------------------------------------------------------------------
// ER Physician Note / ER Trauma Exam
interface NoteInput {
  dx: string[];
  illness?: string;
  trauma?: boolean;
}

function noteScope(page: Page) {
  const main = page.getByRole('main');
  const radios = (group: string) => main.getByRole('radiogroup', { name: group, exact: true }).first();
  return {
    main,
    radios,
    illness: main.locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').filter({ visible: true }).last(),
    dxRow: (i: number) => main.locator(`[data-dx-index="${i}"]`).filter({ visible: true }).first(),
    dxAdd: main.locator('[data-dx-index="0"]').locator('xpath=ancestor::*[.//button[normalize-space()="+ เพิ่มรายการ"]][1]').getByRole('button', { name: '+ เพิ่มรายการ' }).last(),
    pe: main.locator('div').filter({ has: page.getByRole('combobox', { name: 'System 1' }) }).filter({ has: page.getByRole('button', { name: 'ปกติทั้งหมด' }) }).last(),
    compression: main.locator('div').filter({ has: page.getByRole('radiogroup', { name: 'Chest compression test' }) }).filter({ has: page.getByRole('radiogroup', { name: 'Pelvic compression test' }) }).last(),
    save: main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).first(),
  };
}

/** เปิดฟอร์มแพทย์ (แท็บ ER Physician Note) แล้วรอโหลดครบ */
async function openNote(page: Page) {
  const n = noteScope(page);
  await careMenu(page, 'ER Physician Note', n.main.getByRole('heading', { name: 'ER Physician Note' }).first());
  await expect(n.dxRow(0), 'ฟอร์มแพทย์ต้องโหลดส่วน Diagnosis').toBeVisible({ timeout: 180_000 });
  await expect(n.main.getByText('ไม่สามารถแสดงฟอร์มได้'), 'ฟอร์มแพทย์ต้องไม่มีส่วนที่แสดงไม่ได้').toHaveCount(0);
  await page.waitForTimeout(3_000);
  return n;
}

/** Diagnosis แถว i: ค้น ICD → เลือก (แถวแรก = Principal · ถัดไป = Comorbid อัตโนมัติ) */
async function chooseDx(page: Page, i: number, code: string): Promise<string> {
  const n = noteScope(page);
  if (i > 0 && !(await n.dxRow(i).count())) await n.dxAdd.click();
  const search = n.dxRow(i).getByRole('combobox').first();
  await search.scrollIntoViewIfNeeded();
  await search.click();
  // รหัสในรายการไม่มีจุด (S060 - …) → พิมพ์ไม่มีจุด และยอมรับทั้ง 2 แบบ
  await page.keyboard.type(code.replace('.', ''), { delay: 60 });
  const option = page.getByRole('option').filter({ visible: true }).filter({ hasText: new RegExp(`^${code.replace('.', '\\.?')} - `) }).first();
  await expect(option, `ค้น Diagnosis ${code} ต้องเจอ`).toBeVisible({ timeout: 20_000 });
  const text = norm(await option.innerText());
  await option.click();
  await page.waitForTimeout(800);
  return text;
}

/** กดบันทึกฟอร์มแพทย์ → POST …/saves */
async function saveNote(page: Page, what: string) {
  const n = noteScope(page);
  await n.save.scrollIntoViewIfNeeded();
  await expect(n.save, `${what}: ปุ่มบันทึกต้องกดได้`).toBeEnabled();
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/clinical-form-groups\/[^/]+\/saves$/.test(r.url()), { timeout: 120_000 });
  await n.save.click();
  await expectOk(await saved, what);
}

/** ER Physician Note (Non-Trauma) — Present illness + Diagnosis → บันทึก · คืน Diagnosis ที่เลือก */
async function physicianNote(page: Page, input: NoteInput): Promise<string[]> {
  const n = await openNote(page);
  if (input.illness && (await n.illness.count())) await n.illness.fill(input.illness);
  const chosen: string[] = [];
  for (const [i, code] of input.dx.entries()) chosen.push(await chooseDx(page, i, code));
  await saveNote(page, 'บันทึก ER Physician Note');
  return chosen;
}

interface TraumaExamResult {
  dx: string[];
  primarySurvey: Record<string, string>;
  peSummary: string;
  peAbnormal: string;
  compression: { chest: string; pelvis: string };
}

/** ER Trauma Exam (ฟอร์มแพทย์โหมด Trauma): Primary Survey A–E · PE by system + สรุปผลการตรวจ · Compression Chest / Pelvis · Diagnosis → บันทึก */
async function traumaExam(page: Page, input: NoteInput): Promise<TraumaExamResult> {
  const n = await openNote(page);
  if (input.illness && (await n.illness.count())) await n.illness.fill(input.illness);
  // Primary Survey (หุบไว้ตั้งต้น)
  const airway = n.radios('ทางเดินหายใจ');
  if (!(await airway.isVisible().catch(() => false))) {
    // dev-x 2 พ.ย. (index-D_SSxb-t.js): หัวส่วนเป็นปุ่มที่มี img collapsed + heading "Trauma Primary Survey"
    const toggle = n.main.getByRole('button').filter({ has: page.getByRole('heading', { name: 'Trauma Primary Survey' }) }).first();
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    await expect(airway).toBeVisible({ timeout: 15_000 });
  }
  const primarySurvey: Record<string, string> = {};
  const pickRadio = async (group: string, choice?: string) => {
    const g = n.radios(group);
    if (!(await g.count())) return;
    const label = choice ? g.getByText(choice, { exact: true }).first() : g.locator('label').first();
    if (!(await label.count())) return;
    await label.scrollIntoViewIfNeeded();
    await label.click();
    primarySurvey[group] = norm(await label.innerText());
  };
  await pickRadio('ทางเดินหายใจ', 'Patent');
  await pickRadio('C-spine');
  await pickRadio('การหายใจ', 'Normal');
  await pickRadio('Pulse at ER', 'Palpable');
  await pickRadio('Capillary refill');
  // กลุ่ม D (dev-x 2 พ.ย.): รูม่านตาข้างขวา / ซ้าย ขนาด (mm) + การตอบสนองต่อแสง + DTX (mg/dL) — ชื่อช่องภาษาไทย
  for (const side of ['ขวา', 'ซ้าย']) {
    const size = n.main.getByRole('spinbutton', { name: `รูม่านตาข้าง${side} ขนาด (mm)` }).first();
    if (!(await size.count())) continue;
    await size.scrollIntoViewIfNeeded();
    await size.fill('3');
    await pickRadio(`รูม่านตาข้าง${side} การตอบสนองต่อแสง`, 'RTL');
    delete primarySurvey[`รูม่านตาข้าง${side} การตอบสนองต่อแสง`]; // กลุ่ม D ตรวจแยกในแถว "D · รูม่านตา / DTX" ของ TC-033
  }
  const dtx = n.main.getByRole('spinbutton', { name: 'DTX (mg/dL)' }).first();
  if (await dtx.count()) await dtx.fill('110');
  await pickRadio('Log Roll', 'Normal');
  // PE by system: Lung ไม่ปกติ + Detail · สรุปผลการตรวจ (rich text ของการ์ด Physical examination)
  const systems = await n.pe.getByRole('combobox', { name: /^System \d+$/ }).evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).options[(e as HTMLSelectElement).selectedIndex]?.text ?? ''));
  const li = Math.max(1, systems.indexOf('Lung') + 1);
  await n.pe.getByRole('radiogroup', { name: `Clinical Interpretation ${li}` }).getByText('ไม่ปกติ', { exact: true }).click();
  const peAbnormal = 'decreased breath sound Rt.';
  await n.pe.getByLabel(`Detail ${li}`, { exact: true }).fill(peAbnormal);
  const peSummary = 'สรุป: บาดเจ็บทรวงอกขวา ปอดขวาเสียงหายใจลดลง (SBH-3182)';
  const richText = n.main.locator('div').filter({ has: page.getByRole('combobox', { name: 'System 1' }) }).filter({ has: page.locator('[contenteditable="true"]') }).last().locator('[contenteditable="true"]').first();
  if (await richText.count()) await richText.fill(peSummary);
  // Compression
  await n.compression.scrollIntoViewIfNeeded();
  await n.compression.getByRole('radiogroup', { name: 'Chest compression test' }).getByText('ปกติ', { exact: true }).click();
  await n.compression.getByRole('radiogroup', { name: 'Pelvic compression test' }).getByText('ไม่ปกติ', { exact: true }).click();
  const dx: string[] = [];
  for (const [i, code] of input.dx.entries()) dx.push(await chooseDx(page, i, code));
  await saveNote(page, 'บันทึก ER Trauma Exam');
  return { dx, primarySurvey, peSummary: (await richText.count()) ? peSummary : '(ไม่พบช่องสรุปผลการตรวจ)', peAbnormal: `${systems[li - 1] || 'Lung'}: ไม่ปกติ · ${peAbnormal}`, compression: { chest: 'ปกติ', pelvis: 'ไม่ปกติ' } };
}

/** Body chart: วาดเส้นบนภาพ 2 ตำแหน่ง (หน้าอก · ต้นขาซ้าย) แล้วบันทึกฟอร์มแพทย์ */
async function drawBodyChart(page: Page) {
  await openNote(page);
  const main = page.getByRole('main');
  const canvas = main.locator('canvas').filter({ visible: true }).first();
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  for (const [x, y] of [[0.12, 0.3], [0.1, 0.62]]) {
    const sx = box.x + box.width * x;
    const sy = box.y + box.height * y;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 25, sy + 10, { steps: 8 });
    await page.mouse.move(sx + 5, sy + 25, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  await markEvidence(filled(canvas, 'วาด Body chart 2 ตำแหน่ง'));
  await snapEvidence(page, 'กรอก — Body chart 2 ตำแหน่ง');
  await clearEvidenceMarks(page);
  await saveNote(page, 'บันทึก Body chart');
}

// ------------------------------------------------------------------------------------------------
// ฟอร์ม PHER+ (Trauma Detail For Pher Plus) — ส่วนการดูแลระหว่างนำส่ง
const PHER_FORM = 'Trauma Detail For Pher Plus';
const CARE: [string, string, string][] = [
  ['ดูแลการหายใจ', '0 - ', 'ไม่มี'],
  ['ห้ามเลือด', '1 - ', 'มี-เหมาะสม'],
  ['Splint/Slap C-Spine', '2 - ', 'มี-ไม่เหมาะสม'],
  ['Splint/Slap อื่นๆ', '3 - ', 'ไม่จำเป็น'],
  ['IV Fluid', 'N - ', 'ไม่ระบุ'],
];
async function pherCare(page: Page) {
  const main = page.getByRole('main');
  const formSelect = main.getByText('เลือกฟอร์ม', { exact: true }).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
  const holder = page.locator('.ant-select-dropdown:visible .rc-virtual-list-holder').first();
  // แผง Overview โหลดตามหลังแล้วทับแผงสร้างฟอร์ม → กดเมนู + เปิดช่อง เลือกฟอร์ม ซ้ำจนรายการขึ้น
  await expect(async () => {
    await page.keyboard.press('Escape');
    if (!(await formSelect.isVisible())) await careMenu(page, 'สร้างฟอร์ม', main.getByText('เลือกฟอร์ม', { exact: true }).first());
    await formSelect.click();
    await expect(holder).toBeVisible({ timeout: 8_000 });
  }, 'เปิดรายการ เลือกฟอร์ม').toPass({ timeout: 120_000 });
  await expect.poll(() => holder.evaluate((el) => el.scrollHeight - el.clientHeight), { message: 'รายการฟอร์มต้องโหลดครบ', timeout: 45_000 }).toBeGreaterThan(400);
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${PHER_FORM}$`) });
  for (let i = 0; i < 80 && !(await option.first().isVisible().catch(() => false)); i++) {
    await holder.evaluate((el) => (el.scrollTop += Math.max(60, el.clientHeight / 2)));
    await page.waitForTimeout(300);
  }
  await option.first().click();
  const root = page.locator('er-trauma-detail-pher-plus-v1').first();
  const combo = (name: string) => root.getByRole('combobox', { name, exact: true });
  await expect(combo('ดูแลการหายใจ'), 'ฟอร์ม PHER+ ต้องโหลดขึ้น').toBeVisible({ timeout: 60_000 });
  for (const [name, prefix] of CARE) {
    const c = combo(name);
    await c.scrollIntoViewIfNeeded();
    await c.click();
    const id = await c.getAttribute('aria-controls');
    const opt = root.locator(`[id="${id}"] [role=option]`).filter({ hasText: new RegExp(`^\\s*${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first();
    await expect(opt).toBeVisible({ timeout: 20_000 });
    await opt.click();
    await page.waitForTimeout(400);
  }
  await root.locator('details[data-card="transport"] > summary').scrollIntoViewIfNeeded();
  await markEvidence(...CARE.map(([name]) => filled(combo(name))));
  await snapEvidence(page, 'กรอก — PHER+ การดูแลระหว่างนำส่ง');
  await clearEvidenceMarks(page);
  const save = main.getByRole('button', { name: /^(save )?บันทึก$/ }).filter({ visible: true }).first();
  const response = page.waitForResponse((r) => r.request().method() === 'POST' && /\/clinical-form-groups\/[^/]+\/saves$/.test(r.url()), { timeout: 60_000 });
  await save.click();
  await expectOk(await response, 'บันทึกฟอร์ม PHER+');
}

// ------------------------------------------------------------------------------------------------
// ตัวช่วยตรวจ ER Summary
async function compare(page: Page, n: number, rows: CompareRow[], cols = ['Expected', 'จริง (ER Summary)']) {
  await showCompareTable(page, `${tcId(n)} เทียบค่า`, cols, rows, { side: 'bottom' });
}

/**
 * เปิด ER Summary ให้เต็มจอ: แท็บ Overview / Order Summary ที่โหลดตามหลังเบียดครึ่งขวา → ปิดแท็บฝั่งนั้น ·
 * เติมที่ว่างท้ายแผง (ไม่ใช่เนื้อหาของระบบ) ให้เลื่อนส่วนท้าย (Consult / การจำหน่าย) ขึ้นพ้นตารางเทียบครึ่งล่างได้
 */
async function openSummaryView(page: Page, visit: ErVisit) {
  await openErSummary(page, visit);
  // ปิดแท็บฝั่งขวา (ปุ่มปิดโผล่ตอน hover → force) — แท็บใดปิดไม่ได้ข้ามไปตัวถัดไป ไม่วนค้างที่ตัวแรก
  // (2 พ.ย. รอบ 3: วนค้างที่ Overview แล้ว Order Summary แบ่งจอ ภาพ TC-016–040 แคบ)
  const names = /^\s*(Order Summary|ER Physician Note|One Day Order|Disposition|Reconcile Med|คัดกรอง ER|Overview)\s*$/;
  for (let i = 0, skip = 0; i < 8; i++) {
    const tabs = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: names });
    const n = await tabs.count();
    if (skip >= n) break;
    const before = n;
    await tabs.nth(skip).hover().catch(() => undefined);
    await tabs.nth(skip).locator('.dv-default-tab-action').click({ force: true, timeout: 5_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    if ((await tabs.count()) >= before) skip++;
  }
  const w = (await erSummaryPanel(page).boundingBox())?.width ?? 0;
  if (w < 1200) console.warn(`    ⚠ ER Summary กว้าง ${Math.round(w)}px — ยังมีแท็บอื่นแบ่งจอ`);
  await page.mouse.move(960, 700);
  await erSummaryPanel(page).evaluate((el) => {
    if (el.querySelector('[data-test-spacer]')) return;
    const spacer = document.createElement('div');
    spacer.setAttribute('data-test-spacer', '');
    spacer.style.height = '55vh';
    el.appendChild(spacer);
  });
  await page.waitForTimeout(800);
}

/** เลื่อนส่วนชิดบน (panel เลื่อนในตัว) */
async function toSection(section: Locator) {
  await section.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await section.page().waitForTimeout(400);
}

/** ค่า "x วัน y ชม." / "h ชม. m นาที" / "m นาที" (ตัด "(ถึงตอนนี้)") */
const losText = (s: string) => norm(s).replace(/\s*\(ถึงตอนนี้\)$/, '');

type Runner = ReturnType<typeof makeRunner>;

/** อ่านหัว / ช่อง ข้อมูลการรักษาที่ ER เทียบ API — ใช้ใน TC-002 / 003 / 004 / 027 */
async function treatmentRows(page: Page, auth: () => string, visit: ErVisit, want: { arrival: string; emergency: string }): Promise<CompareRow[]> {
  const api = await fetchErSummaryApi(page, auth(), visit.en);
  const f = await readFields(erSummarySection(page, 'treatment'));
  const firstTriage = api.firstTriage as { level: number } | null;
  const zone = (api.currentZone as { nameTh: string } | null)?.nameTh ?? '';
  const departedAt = api.departedAt as string | null;
  return [
    row('EN', visit.en, f['EN'] ?? ''),
    row('วิธีการมาถึง', want.arrival, f['วิธีการมาถึง'] ?? ''),
    row('ระดับคัดกรองแรกรับ / โซน', `ESI ${firstTriage?.level} · ${zone}`, f['ระดับคัดกรองแรกรับ / โซนปัจจุบัน'] ?? ''),
    row('ประเภทฉุกเฉิน', want.emergency, f['ประเภทฉุกเฉิน'] ?? ''),
    row('มาถึง', thaiDateTime(String(api.arrivedAt)), f['มาถึง'] ?? ''),
    row('ออกจาก ER', departedAt ? thaiDateTime(departedAt) : 'ยังอยู่ใน ER', f['ออกจาก ER'] ?? ''),
    row('เวลาใน ER', 'แสดงค่า', f['เวลาใน ER'] ?? '', /\d+ (นาที|ชม\.|วัน)/.test(f['เวลาใน ER'] ?? '')),
    row('แพทย์ผู้รับผิดชอบ', (api.practitioner as { display: string } | null)?.display ?? '', f['แพทย์ผู้รับผิดชอบ'] ?? ''),
  ];
}

// ------------------------------------------------------------------------------------------------
test.describe(`SBH-3182 ER Summary Trauma / Non-Trauma (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 3_600_000 });
  test.skip(SYSTEM !== 'dev-x', 'การ์ดนี้รันบน dev-x เท่านั้น (SBH Prod ยังไม่ได้รับอนุญาต — R40)');

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page).catch(() => undefined);
  });

  /** ใช้ผู้ป่วยเดิม (SBH3182_<KEY>) หรือเตรียมใหม่ด้วย `prepare` */
  async function patient(page: Page, key: string, r: Runner, prepare: () => Promise<Saved>): Promise<Saved> {
    const reuse = process.env[`SBH3182_${key}`]?.split(',');
    if (reuse?.length === 3) {
      const old = readState()[key];
      const visit: Saved = { ...(old ?? { name: '', preparedAt: '' }), hn: reuse[0], vn: reuse[1], en: reuse[2] };
      r.note(`ผู้ป่วย ${key} (รายเดิม)`, `${visit.name} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      return visit;
    }
    const visit = await prepare();
    saveState(key, visit);
    r.note(`ผู้ป่วย ${key}`, `${visit.name} · HN ${visit.hn} · ${visit.vn} · ${visit.en} · ใช้ซ้ำ: SBH3182_${key}=${visit.hn},${visit.vn},${visit.en}`);
    for (const [k, v] of Object.entries(visit.info ?? {})) r.note(`ข้อมูล ${key} · ${k}`, v);
    return visit;
  }

  /** เปิด ER Summary (โหลดหน้า Visit ใหม่) — ก่อนเริ่มคลิปของ TC แรก */
  async function summaryOf(page: Page, visit: ErVisit) {
    await gotoVisit(page, visit);
    await openSummaryView(page, visit);
  }

  // ==============================================================================================
  test('ผู้ป่วย A (Non-Trauma · EMS · Admit): TC-001–021 · 026 · 040 (Super_User)', meta('A', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 26, 40), async ({ page, browser }) => {
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    const consultProblem = 'ขอปรึกษาอายุรกรรม ปวดท้องเรื้อรัง (SBH-3182 ผู้ป่วย A)';
    const visit = await patient(page, 'A', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย A', async () => {
        const v = await newErVisit(page, 'A');
        const info: Record<string, string> = {};
        Object.assign(info, await triage(page, v, { level: 3, vitals: VITALS_NORMAL, arrival: { method: 'EMS', ems: 'ALS', transporter: 'หน่วยกู้ภัยทดสอบ SBH-3182', preHospital: 'BP 120/80 ระหว่างนำส่ง' }, ud: 'I10' }));
        info.allergy = await recordDrugAllergy(page);
        info.reconcile = await reconcileMed(page);
        const vitals = [VITALS_NORMAL];
        for (const vs of VITALS_RETRIAGE) {
          await waitNextMinute(page);
          await reTriage(page, v, 3, vs);
          vitals.push(vs);
        }
        info.vitals = vitals.map((x) => `${x.systolic}/${x.diastolic} PR ${x.pr} RR ${x.rr} BT ${x.temp} SpO₂ ${x.spo2}`).join(' → ');
        await gotoVisit(page, v);
        info.dx = (await physicianNote(page, { dx: ['K30', 'J00'], illness: 'ปวดท้องใต้ลิ้นปี่ 1 วัน (SBH-3182)' })).join(' · ');
        await openOneDayOrder(page);
        for (const med of MEDS) {
          await openOneDayOrder(page);
          await addMedicineToCart(page, med);
        }
        await submitOrders(page, [LAB, IMAGING, PROCEDURE]);
        await cancelMedication(page, CANCEL_MED);
        info.orders = `ยา ${MEDS.join(' / ')} (ยกเลิก ${CANCEL_MED}) · Lab ${LAB} · Imaging ${IMAGING} · หัตถการ ${PROCEDURE}`;
        info.consult = await consult(page, browser, v, consultProblem, true);
        await gotoVisit(page, v);
        const admit = await admitWithBed(page, v, auth);
        info.admit = `AN ${admit.an} · หอ ${admit.ward}`;
        const d = await dispose(page, v, 'รับไว้รักษาต่อIPD');
        info.disposition = `รับไว้รักษาต่อIPD · ลงนาม ${d.signedAt} โดย ${d.signedBy}`;
        return { ...v, preparedAt: bangkokText(), info };
      }),
    );
    const info = visit.info ?? {};
    await summaryOf(page, visit);
    const panel = erSummaryPanel(page);

    // TC-001 ลำดับส่วน
    await startClip(page, tcId(1));
    await r.soft(`${TC(1)} ลำดับส่วนบนหน้า ER Summary (Non-Trauma)`, async () => {
      const order = await erSummaryOrder(page);
      const ids = order.map((o) => o.id);
      const want = ['treatment', 'slots-complaint', 'history', 'slots-diagnosis', 'vitals', 'slots-gcs', 'slots-mews', 'slots-fast-track', 'slots-physical-examination', 'orders', 'consults', 'disposition'];
      const pill = norm(await erSummaryPill(page).innerText().catch(() => ''));
      const rows: CompareRow[] = [row('ป้ายหัว', 'ER Physician Note', pill)];
      let last = -1;
      for (const id of want) {
        const at = ids.indexOf(id);
        rows.push(row(ER_SUMMARY_SECTION_TITLE[id] ?? id, 'มี · ต่อจากส่วนก่อนหน้า', at < 0 ? 'ไม่มีส่วนนี้' : at > last ? `ลำดับที่ ${at + 1}` : `ลำดับที่ ${at + 1} (ผิดลำดับ)`, at > last));
        if (at >= 0) last = at;
      }
      r.note(`${tcId(1)} ลำดับจริง`, order.map((o) => o.title || o.id).join(' → '));
      await compare(page, 1, rows);
      await markEvidence(expected(erSummaryPill(page), 'ER Physician Note'), expected(erSummarySection(page, 'treatment').locator('[class*="_title_"]').first(), 'ส่วนแรก'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-002 ข้อมูลการรักษาที่ ER 8 ช่อง
    await startClip(page, tcId(2));
    await r.soft(`${TC(2)} ข้อมูลการรักษาที่ ER 8 ช่องตรงกับ visit`, async () => {
      await hideCompareTable(page);
      const s = erSummarySection(page, 'treatment');
      await toSection(s);
      const rows = await treatmentRows(page, auth, visit, { arrival: 'EMS (ALS)', emergency: 'Non-Trauma' });
      await compare(page, 2, rows, ['Expected (visit / API)', 'จริง (ER Summary)']);
      await markEvidence(expected(s, '8 ช่อง'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-003 รูปแบบเวลา
    await startClip(page, tcId(3));
    await r.soft(`${TC(3)} เวลามาถึง / ออกจาก ER รูปแบบ dd/MM/yyyy HH:mm ปี พ.ศ. เวลาไทย`, async () => {
      await hideCompareTable(page);
      const s = erSummarySection(page, 'treatment');
      await toSection(s);
      const api = await fetchErSummaryApi(page, auth(), visit.en);
      const f = await readFields(s);
      const fmt = /^\d{2}\/\d{2}\/25\d{2} \d{2}:\d{2}$/;
      const dep = api.departedAt as string | null;
      const rows = [
        row('มาถึง', thaiDateTime(String(api.arrivedAt)), f['มาถึง'] ?? '', f['มาถึง'] === thaiDateTime(String(api.arrivedAt)) && fmt.test(f['มาถึง'] ?? '')),
        row('ออกจาก ER', dep ? thaiDateTime(dep) : 'ยังอยู่ใน ER (ยังไม่จำหน่ายออกจาก ER)', f['ออกจาก ER'] ?? '', dep ? f['ออกจาก ER'] === thaiDateTime(dep) && fmt.test(f['ออกจาก ER'] ?? '') : f['ออกจาก ER'] === 'ยังอยู่ใน ER'),
      ];
      await compare(page, 3, rows, ['Expected (API แปลงเป็นเวลาไทย พ.ศ.)', 'จริง (ER Summary)']);
      await markEvidence(expected(fieldOf(s, 'มาถึง'), 'dd/MM/พ.ศ. HH:mm'), expected(fieldOf(s, 'ออกจาก ER')));
      expect(bad(rows)).toEqual([]);
    });

    // TC-004 แพทย์ผู้รับผิดชอบ
    await startClip(page, tcId(4));
    await r.soft(`${TC(4)} แพทย์ผู้รับผิดชอบ = แพทย์ของ ER encounter`, async () => {
      await hideCompareTable(page);
      const s = erSummarySection(page, 'treatment');
      await toSection(s);
      // แพทย์ของ ER encounter = ช่อง แพทย์ บน Overview / การ์ดบนบอร์ด (GET /er/dashboard/encounters?date= → practitioner) — /er/encounters/{EN} ไม่มีช่องนี้
      const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date(Date.parse(String((await fetchErSummaryApi(page, auth(), visit.en)).arrivedAt))));
      const res = await page.request.get(`/cortex-api/er/dashboard/encounters?date=${day}`, { headers: { authorization: auth() } });
      const enc = ((await res.json()) as { en: string; practitioner?: { display?: string } }[]).find((e) => e.en === visit.en);
      const f = await readFields(s);
      const rows = [row('แพทย์ผู้รับผิดชอบ', enc?.practitioner?.display ?? '(API ไม่มี)', f['แพทย์ผู้รับผิดชอบ'] ?? '')];
      r.note(`${tcId(4)} care team`, `ใช้แพทย์ของ ER encounter (dev note 9: care team มีแต่พยาบาล) — GET /er/dashboard/encounters?date=${day} practitioner = ${enc?.practitioner?.display}`);
      await compare(page, 4, rows, ['Expected (แพทย์ของ ER encounter)', 'จริง (ER Summary)']);
      await markEvidence(expected(fieldOf(s, 'แพทย์ผู้รับผิดชอบ'), enc?.practitioner?.display ?? ''));
      expect(bad(rows)).toEqual([]);
    });

    // TC-005 / 006 / 007 โรคประจำตัวและการแพ้
    const history = erSummarySection(page, 'history');
    for (const [n, label, want] of [
      [5, 'โรคประจำตัว (U/D)', info.ud ?? 'Essential (primary) hypertension'],
      [6, 'ประวัติแพ้ยา', info.allergy ?? 'paracetamol'],
      [7, 'ยาที่ใช้ประจำ', info.reconcile ?? 'PARATEMP'],
    ] as const) {
      await startClip(page, tcId(n));
      await r.soft(`${TC(n)} ${label} ตรงกับที่บันทึก`, async () => {
        await hideCompareTable(page);
        await toSection(history);
        const f = await readFields(history);
        const got = f[label] ?? '';
        const key = norm(want).split(' (')[0].toLowerCase();
        // แพ้ยา: ชนิดในวงเล็บ (VTM / SUBS) ขึ้นกับรายการยาที่เลือก — เทียบชื่อยาอย่างเดียว
        const rows = [row(label, n === 6 ? key : want, got, got.toLowerCase().includes(key))];
        if (n === 6) rows.push(row('อาการแพ้', 'ผื่นคันหลังกินยา / อาการคัน', got, /คัน|ผื่น/.test(got)));
        await compare(page, n, rows, ['Expected (ที่บันทึก)', 'จริง (ER Summary)']);
        await markEvidence(expected(fieldOf(history, label), label));
        expect(bad(rows)).toEqual([]);
      });
    }

    // TC-008 / 009 / 010 Vital signs
    const vs = erSummarySection(page, 'vitals');
    await startClip(page, tcId(8));
    await r.soft(`${TC(8)} คอลัมน์ตาราง Vital signs`, async () => {
      await hideCompareTable(page);
      await toSection(vs);
      const t = await readTable(vs.locator('table').first());
      const want = ['เวลา', 'BP', 'PR', 'RR', 'BT', 'SpO₂', 'Pain'];
      const rows = want.map((h) => row(`คอลัมน์ ${h}`, 'มี', t.head.includes(h) ? 'มี' : 'ไม่มี'));
      rows.push(row('ชื่อพยาบาล / ผู้บันทึก', 'ไม่มี', t.head.some((h) => /พยาบาล|ผู้บันทึก/.test(h)) ? 'มี' : 'ไม่มี'));
      r.note(`${tcId(8)} หัวตาราง`, t.head.join(' · '));
      await compare(page, 8, rows);
      await markEvidence(expected(vs.locator('thead').first(), t.head.join(' · ')));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(9));
    await r.soft(`${TC(9)} Vital signs ครบทุกครั้ง (คัดกรอง + คัดกรองซ้ำ 2 ครั้ง) เรียงตามเวลา`, async () => {
      await hideCompareTable(page);
      await toSection(vs);
      const t = await readTable(vs.locator('table').first());
      const all = [VITALS_NORMAL, ...VITALS_RETRIAGE];
      const rows: CompareRow[] = [row('จำนวนแถว', String(all.length), String(t.rows.length))];
      all.forEach((v, i) => {
        const got = t.rows[i] ? t.rows[i].slice(1, 6).join(' · ') : '(ไม่มีแถว)';
        rows.push(row(`แถว ${i + 1}`, [`${v.systolic}/${v.diastolic}`, v.pr, v.rr, v.temp, v.spo2].join(' · '), got));
      });
      const times = t.rows.map((x) => x[0].replace(/\s*(แรกรับ|ล่าสุด)$/, ''));
      rows.push(row('เรียงตามเวลา', 'เก่า → ใหม่', times.join(' → '), times.every((x, i) => i === 0 || x >= times[i - 1])));
      await compare(page, 9, rows);
      await markEvidence(expected(vs.locator('tbody').first(), `${all.length} แถว · จริง: ${t.rows.length} แถว`));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(10));
    await r.soft(`${TC(10)} แถวแรกต่อท้าย แรกรับ · แถวสุดท้ายต่อท้าย ล่าสุด`, async () => {
      await hideCompareTable(page);
      await toSection(vs);
      const t = await readTable(vs.locator('table').first());
      const first = t.rows[0]?.[0] ?? '';
      const last = t.rows.at(-1)?.[0] ?? '';
      const rows = [row('แถวแรก', 'HH:mm แรกรับ', first, /แรกรับ$/.test(first)), row('แถวสุดท้าย', 'HH:mm ล่าสุด', last, /ล่าสุด$/.test(last) && t.rows.length > 1)];
      await compare(page, 10, rows);
      // แถวเดียว = แถวแรกกับแถวสุดท้ายเป็นแถวเดียวกัน → ป้ายเดียว (2 ป้ายบน element เดียวกัน ป้ายที่ 2 ไปลอยนอกแผง)
      if (t.rows.length <= 1) await markEvidence(expected(vs.locator('tbody tr').first(), `แรกรับ … ล่าสุด · จริง: ${first} (แถวเดียว)`));
      else await markEvidence(expected(vs.locator('tbody tr').first(), first), expected(vs.locator('tbody tr').last(), last));
      expect(bad(rows)).toEqual([]);
    });

    // TC-011–016 Order
    const ordersSec = erSummarySection(page, 'orders');
    const orders = await readOrders(page).catch(() => ({ groups: [] as string[], rows: [] as Awaited<ReturnType<typeof readOrders>>['rows'] }));
    r.note('Order ใน ER Summary', `${orders.groups.join(' · ')} | ${orders.rows.map((o) => `${o.type} ${o.item.slice(0, 40)} ${o.status}${o.struck ? ' (ขีดฆ่า)' : ''}`).join(' ‖ ')}`);
    await startClip(page, tcId(11));
    await r.soft(`${TC(11)} Order ครบทุกรายการ ทั้ง One day และ Continue`, async () => {
      await hideCompareTable(page);
      await toSection(ordersSec);
      const rows = [
        row('จำนวนรายการ', `${MEDS.length + 3} (ยา ${MEDS.length} · Lab · Imaging · หัตถการ)`, String(orders.rows.length), orders.rows.length === MEDS.length + 3),
        row('ประเภท One day', 'มี', orders.rows.filter((o) => o.type === 'One day').length ? `${orders.rows.filter((o) => o.type === 'One day').length} รายการ` : 'ไม่มี', orders.rows.some((o) => o.type === 'One day')),
        row('ประเภท Continue', 'มี ≥ 1 รายการ', orders.rows.filter((o) => o.type === 'Continue').length ? 'มี' : 'ไม่มี (ER ไม่มีเมนู Continue Order · ยาแสดงประเภท "-")', orders.rows.some((o) => o.type === 'Continue')),
        row('ประเภทของรายการยา', 'One day / Continue', [...new Set(orders.rows.filter((o) => /ยา/.test(o.group)).map((o) => o.type))].join(' / '), orders.rows.filter((o) => /ยา/.test(o.group)).every((o) => /One day|Continue/.test(o.type))),
      ];
      await compare(page, 11, rows);
      await markEvidence(expected(ordersSec.locator('tbody').first(), `${orders.rows.length} รายการ`));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(12));
    await r.soft(`${TC(12)} Order แบ่งกลุ่ม + จำนวนรายการที่หัวกลุ่ม`, async () => {
      await hideCompareTable(page);
      await toSection(ordersSec);
      // ผู้ใช้ตัดสิน 2 พ.ย.: หัวกลุ่มนับเฉพาะรายการที่ไม่ยกเลิก = ถูก (ผ่าน + ข้อสังเกต)
      const count = (g: RegExp) => orders.rows.filter((o) => g.test(o.group) && o.status !== 'ยกเลิก').length;
      const head = (name: string) => orders.groups.find((g) => g.startsWith(name)) ?? '(ไม่มีกลุ่ม)';
      const rows = [
        row('ยาและสารน้ำ', `ยาและสารน้ำ (${count(/^ยาและสารน้ำ/)})`, head('ยาและสารน้ำ')),
        row('Lab', `Lab (${count(/^Lab/)})`, head('Lab')),
        row('Imaging และหัตถการ', `Imaging และหัตถการ (${count(/^Imaging/)})`, head('Imaging และหัตถการ')),
      ];
      await compare(page, 12, rows, ['Expected (นับรายการในกลุ่มที่ไม่ยกเลิก)', 'จริง (หัวกลุ่ม)']);
      await markEvidence(...(await ordersSec.locator('tr[class*="_group-row_"]').all()).map((g) => expected(g)));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(13));
    await r.soft(`${TC(13)} คอลัมน์ตาราง Order`, async () => {
      await hideCompareTable(page);
      await toSection(ordersSec);
      const t = await readTable(ordersSec.locator('table').first());
      const rows = ['ประเภท Order', 'รายการ', 'เวลาสั่ง', 'สถานะ'].map((h) => row(`คอลัมน์ ${h}`, 'มี', t.head.includes(h) ? 'มี' : 'ไม่มี'));
      await compare(page, 13, rows);
      await markEvidence(expected(ordersSec.locator('thead').first(), t.head.join(' · ')));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(14));
    await r.soft(`${TC(14)} รายการยาแสดงชื่อยา ขนาด วิธีให้`, async () => {
      await hideCompareTable(page);
      await toSection(ordersSec);
      const meds = orders.rows.filter((o) => /^ยาและสารน้ำ/.test(o.group));
      const rows = meds.map((m, i) => row(`ยา ${i + 1}`, 'ชื่อยา · ขนาด · วิธีให้', m.item.slice(0, 90), / · .*(ครั้งละ|รับประทาน|ฉีด|วันละ)/.test(m.item)));
      if (!rows.length) rows.push(row('รายการยา', 'มี', 'ไม่มี', false));
      await compare(page, 14, rows);
      // กรอบเฉพาะช่อง "รายการ" — ป้ายไปอยู่ขวาบนของช่อง (ที่ว่างท้ายข้อความ) ไม่ทับคอลัมน์สถานะของแถวก่อนหน้า
      await markEvidence(...meds.slice(0, 3).map((m) => expected(ordersSec.locator('tbody tr').filter({ hasText: m.item.slice(0, 30) }).first().locator('td').nth(1), m.item.split(' · ')[0].slice(0, 30))));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(15));
    await r.soft(`${TC(15)} Order ที่ยกเลิกยังแสดง ขีดฆ่า + สถานะ ยกเลิก`, async () => {
      await hideCompareTable(page);
      await toSection(ordersSec);
      const c = orders.rows.find((o) => o.status === 'ยกเลิก');
      const rows = [row('รายการยกเลิกยังแสดง', 'แสดง', c ? 'แสดง' : 'ไม่แสดง'), row('ขีดฆ่า', 'ขีดฆ่า', c?.struck ? 'ขีดฆ่า' : 'ไม่ขีดฆ่า'), row('สถานะ', 'ยกเลิก', c?.status ?? '-')];
      await compare(page, 15, rows);
      if (c) await markEvidence(expected(ordersSec.locator('tbody tr').filter({ hasText: 'ยกเลิก' }).first(), 'ขีดฆ่า · ยกเลิก'));
      expect(bad(rows)).toEqual([]);
    });
    // คลิป TC-016 เริ่มหลังหน้า Order Summary โหลดเสร็จ (ช่วงโหลดหน้าใหม่ ~2 นาที จอขาว / ภาพนิ่ง) —
    // ปิดคลิป TC-015 ก่อนออกจากหน้า (ช่วงโหลดไปอยู่คลิป prep ที่ไม่แนบ)
    await startClip(page, 'prep-016');
    await r.soft(`${TC(16)} รายการ / จำนวน Order ตรงกับหน้า Order Summary`, async () => {
      await hideCompareTable(page);
      // Order Summary (แท็บใหม่ของหน้า Visit) — อ่านข้อความรายการทั้งหมด
      await gotoVisit(page, visit);
      // แผง Overview โหลดตามหลังแล้วทับ Order Summary → ต้องเห็นหัว Progress Note (แพทย์) ต่อเนื่อง 3 วิ (วิธีเดียวกับ SBH-2593)
      const item = page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: /Order Summary$/ }).first();
      const header = page.getByRole('main').getByRole('button').filter({ hasText: 'Progress Note (แพทย์)' }).filter({ hasNotText: 'เพิ่ม' }).first();
      await expect(async () => {
        if (!(await header.isVisible())) await item.click({ force: true });
        await expect(header).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(3_000);
        await expect(header).toBeVisible({ timeout: 1_000 });
      }, 'เปิด Order Summary').toPass({ timeout: 120_000 });
      await page.mouse.click(1100, 166);
      await page.mouse.move(960, 1050);
      await page.waitForTimeout(2_000);
      // ผู้ป่วยที่ Admit แล้ว: Order ของ ER อยู่ใต้หัว "ORDER FOR ONE DAY (ก่อน admit) n รายการ" ที่หุบไว้ → กาง (นับเฉพาะรายการที่ไม่ยกเลิก)
      const preAdmit = page.getByRole('main').getByText(/ORDER FOR ONE DAY \(ก่อน admit\)/).first();
      let preAdmitCount = '';
      if (await preAdmit.count()) {
        preAdmitCount = norm(await preAdmit.locator('xpath=..').innerText()).match(/(\d+)\s*รายการ/)?.[1] ?? '';
        await preAdmit.click();
      }
      const active = orders.rows.filter((o) => o.status !== 'ยกเลิก');
      const names = active.map((o) => o.item.split(' · ')[0]);
      // กางแล้วแผงโหลดใหม่ (หมุน) — รอชื่อรายการแรกขึ้นก่อนอ่าน
      if (names[0]) await page.getByRole('main').getByText(names[0].slice(0, 25)).first().waitFor({ timeout: 60_000 }).catch(() => undefined);
      await page.waitForTimeout(1_500);
      await startClip(page, tcId(16));
      const text = norm(await page.getByRole('main').innerText());
      const found = (nm: string) => text.includes(nm.slice(0, 25));
      const rows = names.map((nm) => row(nm.slice(0, 50), 'มีใน Order Summary', found(nm) ? 'มี' : 'ไม่มี', found(nm)));
      if (preAdmitCount) rows.unshift(row('จำนวน (ไม่นับรายการยกเลิก)', `${active.length} รายการ (ER Summary)`, `${preAdmitCount} รายการ (ORDER FOR ONE DAY ก่อน admit)`, Number(preAdmitCount) === active.length));
      await compare(page, 16, rows, ['Expected (รายการใน ER Summary)', 'จริง (หน้า Order Summary)']);
      // แถวอยู่ในกล่องที่เลื่อนได้ข้างใน — ตัวที่เลื่อนพ้นกล่องแล้ววาดกรอบไปลอยบนสุดของจอ → ตีกรอบเฉพาะตัวที่มองเห็นจริง
      // (elementFromPoint ที่กลางแถวต้องเป็นตัวมันเอง) แล้วเลื่อนไปชุดถัดไป ถ่ายทีละภาพ
      const onScreen = (loc: Locator) => loc.evaluate((el) => {
        const b = el.getBoundingClientRect();
        if (!b.height || b.top < 150 || b.bottom > innerHeight - 240) return false;
        const hit = document.elementFromPoint(b.left + Math.min(b.width / 2, 30), b.top + b.height / 2);
        return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
      }).catch(() => false);
      let left = names.filter(found).map((nm) => ({ nm, loc: page.getByRole('main').getByText(nm.slice(0, 25)).filter({ visible: true }).first() }));
      for (let shot = 1; left.length && shot <= 5; shot++) {
        await left[0].loc.evaluate((el) => el.scrollIntoView({ block: 'start' })).catch(() => undefined);
        await page.waitForTimeout(800);
        const vis: typeof left = [];
        for (const x of left) if (await onScreen(x.loc)) vis.push(x);
        if (!vis.length) break;
        await markEvidence(...vis.map((x) => expected(x.loc, x.nm.slice(0, 20))));
        await page.waitForTimeout(1_500);
        await snapEvidence(page, `Order Summary ของ visit เดียวกัน (${shot})`);
        left = left.filter((x) => !vis.includes(x));
      }
      await hideCompareTable(page);
      await openSummaryView(page, visit);
      await toSection(ordersSec);
      await compare(page, 16, rows, ['Expected (รายการใน ER Summary)', 'จริง (หน้า Order Summary)']);
      await markEvidence(expected(ordersSec, `${active.length} รายการ (ไม่นับที่ยกเลิก)`));
      await page.waitForTimeout(1_500);
      expect(bad(rows)).toEqual([]);
    });

    // TC-017 / 018 Consult
    const consultSec = erSummarySection(page, 'consults');
    await startClip(page, tcId(17));
    await r.soft(`${TC(17)} Consult แสดง แผนก · แพทย์ · สถานะ · เวลาขอ · เวลาตอบรับ`, async () => {
      await hideCompareTable(page);
      await toSection(consultSec);
      const t = await readTable(consultSec.locator('table').first());
      const c = t.rows[0] ?? [];
      r.note(`${tcId(17)} Consult`, `${t.head.join(' · ')} | ${c.join(' · ')}`);
      const rows = [
        row('คอลัมน์', 'แผนก · แพทย์ที่ถูก Consult · สถานะ · เวลาขอ · เวลาตอบรับ', t.head.join(' · ')),
        row('แพทย์ที่ถูก Consult', 'นาย ทดสอบ มานะ', c[1] ?? '', /ทดสอบ มานะ/.test(c[1] ?? '')),
        row('สถานะ', 'ตอบรับแล้ว', c[2] ?? ''),
        row('เวลาขอ', 'มีค่า', c[3] ?? '', /\d{2}:\d{2}/.test(c[3] ?? '')),
        row('เวลาตอบรับ', 'มีค่า', c[4] ?? '', /\d{2}:\d{2}/.test(c[4] ?? '')),
      ];
      await compare(page, 17, rows);
      await markEvidence(expected(consultSec.locator('tbody tr').first(), `ตอบรับแล้ว · จริง: ${c[2] ?? '-'}`));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(18));
    await r.soft(`${TC(18)} เวลาขอ / ตอบรับ Consult ตรงกับแท็บ Timeline`, async () => {
      await hideCompareTable(page);
      await toSection(consultSec);
      const c = (await readTable(consultSec.locator('table').first())).rows[0] ?? [];
      const cRow = consultSec.locator('tbody tr').first();
      await markEvidence(expected(cRow.locator('td').nth(3), `ER Summary ขอ ${c[3] ?? '-'}`), expected(cRow.locator('td').nth(4), `ตอบรับ ${c[4] ?? '-'}`));
      await snapEvidence(page, 'ER Summary — Consult');
      // อ่านจากแผง Timeline เท่านั้น (แผง ER Summary ก็มีเวลา Consult — รอบก่อนอ่านผิดแผง) · รอรายการ "ขอ Consult" ขึ้น
      const tl = page.getByRole('main').getByRole('tab', { name: 'Timeline', exact: true });
      const tlPanel = page.getByRole('main').getByRole('tabpanel', { name: 'Timeline' });
      await expect(async () => {
        if (!(await tlPanel.isVisible())) await tl.click();
        await expect(tlPanel.getByText(/ขอ Consult/).first()).toBeVisible({ timeout: 15_000 });
      }, 'แท็บ Timeline ต้องแสดงรายการ ขอ Consult').toPass({ timeout: 90_000 });
      await page.waitForTimeout(1_500);
      const text = norm(await tlPanel.innerText());
      const time = (s: string) => (s.match(/\d{2}:\d{2}/) ?? [''])[0];
      const consultLines = text.split(/(?=\d{2}:\d{2})/).filter((l) => /Consult|ปรึกษา/i.test(l)).slice(0, 6);
      r.note(`${tcId(18)} Timeline`, consultLines.join(' ‖ ') || '(ไม่พบรายการ Consult)');
      const rows = [
        row('เวลาขอ', time(c[3] ?? ''), consultLines.some((l) => l.startsWith(time(c[3] ?? ''))) ? time(c[3] ?? '') : '(ไม่พบบน Timeline)', !!time(c[3] ?? '') && consultLines.some((l) => l.startsWith(time(c[3] ?? '')))),
        row('เวลาตอบรับ', time(c[4] ?? ''), consultLines.some((l) => l.startsWith(time(c[4] ?? ''))) ? time(c[4] ?? '') : '(ไม่พบบน Timeline)', !!time(c[4] ?? '') && consultLines.some((l) => l.startsWith(time(c[4] ?? '')))),
      ];
      await compare(page, 18, rows, ['Expected (ER Summary)', 'จริง (Timeline)']);
      const asked = tlPanel.getByText(/ขอ Consult/).first();
      const answered = tlPanel.getByText(/Consult ตอบกลับ|ตอบ Consult|ตอบกลับ/).first();
      await asked.scrollIntoViewIfNeeded();
      await markEvidence(expected(asked, `ขอ Consult ${time(c[3] ?? '')}`), ...((await answered.count()) ? [expected(answered, `ตอบรับ ${time(c[4] ?? '')}`)] : []));
      await page.waitForTimeout(1_500);
      expect(bad(rows)).toEqual([]);
    });
    // กลับแท็บ ER Summary หลังจบขั้น (ภาพ "ผ่าน" ของ checkStep ถ่ายตอนจบ body — สลับแท็บใน body แล้วกรอบไปวงผิดที่)
    await hideCompareTable(page);
    await page.getByRole('main').getByRole('tab', { name: 'ER Summary', exact: true }).click();
    await page.waitForTimeout(1_500);

    // TC-019 / 020 / 021 การจำหน่าย
    const dispo = erSummarySection(page, 'disposition');
    await startClip(page, tcId(19));
    await r.soft(`${TC(19)} การจำหน่ายตาม Disposition ที่ลงนาม`, async () => {
      await hideCompareTable(page);
      await toSection(dispo);
      const f = await readFields(dispo);
      r.note(`${tcId(19)} การจำหน่าย`, Object.entries(f).map(([k, v]) => `${k}: ${v}`).join(' · '));
      const rows = [
        row('ผลการจำหน่าย', 'Admit', f['ผลการจำหน่าย'] ?? ''),
        row('สถานะการจำหน่าย', 'Improved', f['สถานะการจำหน่าย'] ?? ''),
        row('วิธีการจำหน่าย', 'รับไว้รักษาต่อIPD', f['วิธีการจำหน่าย'] ?? ''),
        row('เวลาลงนาม', 'มีค่า', f['เวลาลงนาม'] ?? '', /\d{2}:\d{2}/.test(f['เวลาลงนาม'] ?? '')),
        row('แพทย์ผู้ลงนาม', 'มีค่า', f['แพทย์ผู้ลงนาม'] ?? '', !!f['แพทย์ผู้ลงนาม'] && f['แพทย์ผู้ลงนาม'] !== '-'),
        row('คำแนะนำ / นัดหมาย', 'มีช่อง', 'คำแนะนำ / นัดหมาย' in f ? f['คำแนะนำ / นัดหมาย'] : 'ไม่มีช่อง', 'คำแนะนำ / นัดหมาย' in f),
      ];
      await compare(page, 19, rows, ['Expected (Disposition ที่ลงนาม)', 'จริง (ER Summary)']);
      await markEvidence(expected(dispo, f['ผลการจำหน่าย'] ?? ''));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(20));
    await r.soft(`${TC(20)} ปลายทางของ Admit = หอผู้ป่วย + AN`, async () => {
      await hideCompareTable(page);
      await toSection(dispo);
      const f = await readFields(dispo);
      const an = (info.admit ?? '').match(/AN (\d+)/)?.[1] ?? '';
      const ward = (info.admit ?? '').match(/หอ (.+)$/)?.[1] ?? '';
      const rows = [row('ปลายทาง', `${ward} · AN ${an}`, f['ปลายทาง'] ?? '(ไม่มีช่องปลายทาง)', (f['ปลายทาง'] ?? '').includes(an) && !!an)];
      await compare(page, 20, rows, ['Expected (Admit ที่สร้าง)', 'จริง (ER Summary)']);
      await markEvidence(expected('ปลายทาง' in f ? fieldOf(dispo, 'ปลายทาง') : dispo, f['ปลายทาง'] ?? 'ไม่มีปลายทาง'));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(21));
    await r.soft(`${TC(21)} AN ในการจำหน่าย = AN ของ "รับไว้ในโรงพยาบาล" ด้านซ้าย`, async () => {
      await hideCompareTable(page);
      await toSection(dispo);
      const f = await readFields(dispo);
      const left = page.getByRole('main').getByText(/รับไว้ในโรงพยาบาล/).filter({ visible: true }).first();
      // ด้านซ้ายแสดง "รับไว้ในโรงพยาบาล: 6903038" (ไม่มีคำว่า AN)
      const leftText = (await left.count()) ? norm(await left.innerText()) : '';
      const leftAn = leftText.match(/รับไว้ในโรงพยาบาล\s*:?\s*(?:AN\s*)?(\d+)/)?.[1] ?? '';
      const dispoAn = (f['ปลายทาง'] ?? '').match(/AN (\d+)/)?.[1] ?? '';
      const rows = [row('AN', leftAn || '(ไม่พบด้านซ้าย)', dispoAn || '(ไม่มีในการจำหน่าย)', !!leftAn && leftAn === dispoAn)];
      await compare(page, 21, rows, ['Expected (รายการ visit ด้านซ้าย)', 'จริง (การจำหน่าย)']);
      await markEvidence(...((await left.count()) ? [expected(left, `AN ${leftAn}`)] : []), expected(fieldOf(dispo, 'ปลายทาง'), dispoAn ? `AN ${dispoAn}` : 'ไม่มี AN'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-026 Non-Trauma ไม่แสดงส่วน Trauma
    await startClip(page, tcId(26));
    await r.soft(`${TC(26)} Non-Trauma ไม่แสดงส่วน Trauma · PE ใช้ของ ER Physician Note`, async () => {
      await hideCompareTable(page);
      const ids = (await erSummaryOrder(page)).map((o) => o.id);
      const rows = ['transport', 'injury', 'rts', 'physical-exam-trauma'].map((id) => row(ER_SUMMARY_SECTION_TITLE[id], 'ไม่แสดง', ids.includes(id) ? 'แสดง' : 'ไม่แสดง'));
      rows.push(row('ป้ายหัว', 'ER Physician Note', norm(await erSummaryPill(page).innerText())));
      rows.push(row('Physical Examination', 'ของ ER Physician Note', ids.includes('slots-physical-examination') ? 'Physical Examination (PE)' : 'ไม่มีส่วน PE', ids.includes('slots-physical-examination')));
      await panel.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await compare(page, 26, rows);
      await markEvidence(expected(erSummaryPill(page), 'ER Physician Note'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-040 อ่านอย่างเดียว
    await startClip(page, tcId(40));
    await r.soft(`${TC(40)} ER Summary ไม่มีช่องกรอก / ปุ่มบันทึก / ปุ่มแก้ไข`, async () => {
      await hideCompareTable(page);
      const found = await interactiveInside(panel);
      const writable = found.filter((x) => !/ดูภาพ|ดูทั้งหมด|ลองใหม่/.test(x));
      r.note(`${tcId(40)} ตัวควบคุมในแท็บ`, found.join(' · ') || 'ไม่มี');
      const rows = [row('ช่องกรอก / ปุ่มบันทึก / ปุ่มแก้ไข (ทะลุ shadow DOM)', 'ไม่มี', writable.length ? writable.join(' · ').slice(0, 200) : 'ไม่มี')];
      await panel.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await compare(page, 40, rows);
      await markEvidence(expected(erSummarySection(page, 'treatment'), 'อ่านอย่างเดียว'));
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย D (Non-Trauma · ยังอยู่ใน ER · Consult รอตอบ): TC-045 · 049 · 051 (Super_User)', meta('D', 45, 49, 51), async ({ page, browser }) => {
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    const visit = await patient(page, 'D', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย D', async () => {
        const v = await newErVisit(page, 'D');
        const info = await triage(page, v, { level: 3, vitals: VITALS_NORMAL });
        const api = await fetchErSummaryApi(page, auth(), v.en);
        info.consult = await consult(page, browser, v, 'ขอปรึกษาอายุรกรรม (SBH-3182 ผู้ป่วย D · ยังไม่ตอบ)', false);
        return { ...v, arrivedAt: String(api.arrivedAt), preparedAt: bangkokText(), info };
      }),
    );
    await summaryOf(page, visit);
    const treatment = erSummarySection(page, 'treatment');

    await startClip(page, tcId(45));
    await r.soft(`${TC(45)} เวลาออกจาก ER = ยังอยู่ใน ER (visit ยังไม่จำหน่าย)`, async () => {
      await toSection(treatment);
      const f = await readFields(treatment);
      const rows = [row('ออกจาก ER', 'ยังอยู่ใน ER', f['ออกจาก ER'] ?? '')];
      await compare(page, 45, rows);
      await markEvidence(expected(fieldOf(treatment, 'ออกจาก ER'), 'ยังอยู่ใน ER'));
      expect(bad(rows)).toEqual([]);
    });
    const consultSec = erSummarySection(page, 'consults');
    await startClip(page, tcId(49));
    await r.soft(`${TC(49)} Consult ที่ยังไม่ตอบรับ = รอตอบรับ · เวลาตอบรับ "-"`, async () => {
      await hideCompareTable(page);
      await toSection(consultSec);
      const c = (await readTable(consultSec.locator('table').first())).rows[0] ?? [];
      const rows = [row('สถานะ', 'รอตอบรับ', c[2] ?? '(ไม่มีแถว)'), row('เวลาตอบรับ', '-', c[4] ?? '(ไม่มีแถว)')];
      await compare(page, 49, rows);
      await markEvidence(expected(consultSec.locator('tbody tr').first(), 'รอตอบรับ · -'));
      expect(bad(rows)).toEqual([]);
    });
    const dispo = erSummarySection(page, 'disposition');
    await startClip(page, tcId(51));
    await r.soft(`${TC(51)} การจำหน่าย = ยังไม่จำหน่าย`, async () => {
      await hideCompareTable(page);
      await toSection(dispo);
      const text = norm(await dispo.innerText());
      const rows = [row('ส่วนการจำหน่าย', 'ยังไม่จำหน่าย', text.replace(/^การจำหน่าย\s*/, ''), /ยังไม่จำหน่าย/.test(text))];
      await compare(page, 51, rows);
      await markEvidence(expected(dispo, 'ยังไม่จำหน่าย'));
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย D ตรวจเวลาใน ER ตอนครบ 59 / 60 นาที: TC-041 · 042 (Super_User)', meta('D-time', 41, 42), async ({ page }) => {
    test.setTimeout(5_400_000);
    const r = makeRunner(page);
    const auth = trackAuthorization(page);
    // SBH3182_DT=<HN>,<VN>,<EN> = ใช้ visit ER อื่นที่ยังไม่จำหน่าย (เวลามาถึงอ่านจาก API) — 2 พ.ย. ใช้ผู้ป่วย G เพราะรอบแรกของ D จับเวลาผิด (สคริปต์)
    const env = process.env.SBH3182_DT?.split(',');
    const saved = readState().D;
    const visit = env?.length === 3 ? { ...saved, hn: env[0], vn: env[1], en: env[2], arrivedAt: undefined as string | undefined } : saved;
    await gotoVisit(page, visit);
    if (!visit.arrivedAt) visit.arrivedAt = String((await fetchErSummaryApi(page, auth(), visit.en)).arrivedAt);
    expect(visit?.arrivedAt, 'ต้องเตรียมผู้ป่วย D ก่อน (@SBH-3182-D)').toBeTruthy();
    const arrived = Date.parse(visit.arrivedAt!);
    r.note('ผู้ป่วยที่ใช้', `HN ${visit.hn} · ${visit.en} · มาถึง ${thaiDateTime(visit.arrivedAt!)} (ยังไม่จำหน่าย)`);
    for (const [n, minutes, want] of [[41, 59, '59 นาที'], [42, 60, '1 ชม. 0 นาที']] as const) {
      // หน้า ER Summary คำนวณ "เวลาใน ER (ถึงตอนนี้)" ครั้งเดียวตอนเปิด — เปิดเมนูประวัติการรักษาตอนเข้านาทีที่ต้องการแล้วเท่านั้น
      const at = arrived + minutes * 60_000 + 10_000; // นับจากเวลามาถึงแบบละเอียดวินาที (ระบบนับแบบนี้ — รอบ 12:49 ปัดเป็นนาทีแล้วเปิดเร็วไป)
      // เปิดหน้า Visit ล่วงหน้า 4 นาที (dev-x 13:14 หน้าค้างโหลด 150 วิ) — พังแล้วลองใหม่ได้ถ้ายังไม่ถึงเวลา
      const wait = at - Date.now() - 240_000;
      if (wait > 0) {
        r.note(`${tcId(n)} รอเวลา`, `รอถึง ${thaiDateTime(new Date(at).toISOString())} (อีก ${Math.round(wait / 60_000) + 4} นาที)`);
        await page.waitForTimeout(wait);
      }
      for (let attempt = 1; ; attempt++) {
        const ok = await gotoVisit(page, visit).then(() => true, () => false);
        if (ok || Date.now() > at - 30_000 || attempt >= 3) break;
      }
      while (Date.now() < at) await page.waitForTimeout(1_000);
      await startClip(page, tcId(n));
      await r.soft(`${TC(n)} อยู่ใน ER ${minutes} นาที → เวลาใน ER "${want}"`, async () => {
        await openSummaryView(page, visit);
        const s = erSummarySection(page, 'treatment');
        await toSection(s);
        const f = await readFields(s);
        const elapsed = Math.floor((Date.now() - arrived) / 60_000);
        const rows = [row('เวลาใน ER', `${want} (ถึงตอนนี้)`, f['เวลาใน ER'] ?? '', losText(f['เวลาใน ER'] ?? '') === want), row('เวลาที่ผ่านไปจริง (นาฬิกาเครื่องทดสอบ)', `${minutes} นาที`, `${elapsed} นาที`, elapsed === minutes)];
        await compare(page, n, rows, ['Expected', 'จริง']);
        await markEvidence(expected(fieldOf(s, 'มาถึง'), f['มาถึง'] ?? ''), expected(fieldOf(s, 'เวลาใน ER'), f['เวลาใน ER'] ?? ''));
        expect(bad(rows)).toEqual([]);
      });
      await hideCompareTable(page);
    }
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย E (เปิด visit 31 ต.ค. ยังอยู่ใน ER): TC-044 รูปแบบ "x วัน y ชม." (Super_User · อ่านอย่างเดียว)', meta('E', 44), async ({ page }) => {
    const r = makeRunner(page);
    const env = process.env.SBH3182_E?.split(',');
    const saved = readState().E;
    const visit = env?.length === 3 ? { ...saved, hn: env[0], vn: env[1], en: env[2] } : saved;
    expect(visit?.en, 'ต้องมีผู้ป่วย E ใน state.json หรือ SBH3182_E').toBeTruthy();
    await gotoVisit(page, visit);
    await openSummaryView(page, visit);
    await startClip(page, tcId(44));
    await r.soft(`${TC(44)} อยู่ใน ER เกิน 24 ชม. → เวลาใน ER รูปแบบ "x วัน y ชม."`, async () => {
      const s = erSummarySection(page, 'treatment');
      await toSection(s);
      const f = await readFields(s);
      const arrived = Date.parse(String(visit.arrivedAt));
      const minutes = Math.floor((Date.now() - (arrived - (arrived % 60_000))) / 60_000);
      r.note(`${tcId(44)} ผู้ป่วย E`, `HN ${visit.hn} · ${visit.en} · มาถึง ${thaiDateTime(String(visit.arrivedAt))} · ผ่านไป ${minutes} นาที (ไม่ได้ตรวจตอนครบ 24:00 พอดี — ผู้ใช้ตอบ 2 พ.ย. ให้ตรวจรูปแบบอย่างเดียว)`);
      const got = losText(f['เวลาใน ER'] ?? '');
      const rows = [row('รูปแบบ', 'x วัน y ชม.', got, /^\d+ วัน \d+ ชม\.$/.test(got)), row('ค่า (คำนวณจากเวลามาถึง)', erLos(minutes), got, got === erLos(minutes) || got === erLos(minutes - 1))];
      await compare(page, 44, rows, ['Expected', 'จริง (ER Summary)']);
      await markEvidence(expected(fieldOf(s, 'มาถึง'), f['มาถึง'] ?? ''), expected(fieldOf(s, 'เวลาใน ER'), got));
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย B (Non-Trauma · Refer): TC-022 (Super_User)', meta('B', 22), async ({ page }) => {
    const r = makeRunner(page);
    const visit = await patient(page, 'B', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย B', async () => {
        const v = await newErVisit(page, 'B');
        const info = await triage(page, v, { level: 3, vitals: VITALS_NORMAL });
        await gotoVisit(page, v);
        info.dx = (await physicianNote(page, { dx: ['K30'] })).join(' · ');
        const d = await dispose(page, v, 'By Transfer');
        info.hospital = d.hospital ?? '';
        info.disposition = `By Transfer → ${d.hospital} · ลงนาม ${d.signedAt}`;
        return { ...v, preparedAt: bangkokText(), info };
      }),
    );
    await summaryOf(page, visit);
    const dispo = erSummarySection(page, 'disposition');
    await startClip(page, tcId(22));
    await r.soft(`${TC(22)} ปลายทางของ Refer = โรงพยาบาลปลายทาง`, async () => {
      await toSection(dispo);
      const f = await readFields(dispo);
      r.note(`${tcId(22)} การจำหน่าย`, Object.entries(f).map(([k, v]) => `${k}: ${v}`).join(' · '));
      const hospital = visit.info?.hospital ?? '';
      const rows = [row('ผลการจำหน่าย', 'Refer', f['ผลการจำหน่าย'] ?? ''), row('ปลายทาง', hospital, f['ปลายทาง'] ?? '(ไม่มีช่องปลายทาง)', !!hospital && (f['ปลายทาง'] ?? '').includes(hospital.slice(0, 12)))];
      await compare(page, 22, rows, ['Expected (Disposition)', 'จริง (ER Summary)']);
      await markEvidence(expected('ปลายทาง' in f ? fieldOf(dispo, 'ปลายทาง') : dispo, f['ปลายทาง'] ?? 'ไม่มีปลายทาง'), expected(fieldOf(dispo, 'ผลการจำหน่าย'), f['ผลการจำหน่าย'] ?? ''));
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย C (Non-Trauma · กลับบ้าน + นัดหมาย): TC-023 (Super_User)', meta('C', 23), async ({ page }) => {
    const r = makeRunner(page);
    const visit = await patient(page, 'C', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย C', async () => {
        const v = await newErVisit(page, 'C');
        const info = await triage(page, v, { level: 4, vitals: VITALS_NORMAL });
        await gotoVisit(page, v);
        info.dx = (await physicianNote(page, { dx: ['K30'] })).join(' · ');
        await gotoVisit(page, v);
        info.appointment = await createAppointment(page).catch((e: Error) => `สร้างนัดหมายไม่สำเร็จ — ${e.message.split('\n')[0]}`);
        const d = await dispose(page, v, 'With Approval');
        info.disposition = `With Approval (กลับบ้าน) · ลงนาม ${d.signedAt}`;
        return { ...v, preparedAt: bangkokText(), info };
      }),
    );
    await summaryOf(page, visit);
    const dispo = erSummarySection(page, 'disposition');
    await startClip(page, tcId(23));
    await r.soft(`${TC(23)} ปลายทางของกลับบ้าน แสดงนัดหมาย`, async () => {
      await toSection(dispo);
      const f = await readFields(dispo);
      const appt = visit.info?.appointment ?? '';
      r.note(`${tcId(23)} การจำหน่าย`, `${Object.entries(f).map(([k, v]) => `${k}: ${v}`).join(' · ')} | นัดที่สร้าง: ${appt}`);
      const day = appt.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const thaiDay = day ? `${day[3]}/${day[2]}/${Number(day[1]) + 543}` : appt;
      const shown = `${f['ปลายทาง'] ?? ''} ${f['คำแนะนำ / นัดหมาย'] ?? ''}`;
      const rows = [row('ผลการจำหน่าย', 'กลับบ้าน', f['ผลการจำหน่าย'] ?? ''), row('นัดหมาย', `นัด ${appt}`, f['คำแนะนำ / นัดหมาย'] ?? '(ไม่มีช่อง)', !!day && (shown.includes(thaiDay) || shown.includes(appt.slice(0, 10))))];
      await compare(page, 23, rows, ['Expected (นัดหมายที่สร้าง)', 'จริง (ER Summary)']);
      await markEvidence(expected('คำแนะนำ / นัดหมาย' in f ? fieldOf(dispo, 'คำแนะนำ / นัดหมาย') : dispo, `นัด ${thaiDay} · จริง: ${f['คำแนะนำ / นัดหมาย'] ?? 'ไม่มีช่อง'}`));
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย F (U/D จากประวัติทางการแพทย์ · Triage ไม่บันทึก U/D): TC-046 (Super_User)', meta('F', 46), async ({ page }) => {
    const r = makeRunner(page);
    const visit = await patient(page, 'F', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย F', async () => {
        const v = await newErVisit(page, 'F');
        const info: Record<string, string> = {};
        // ประวัติทางการแพทย์ (เมนูซ้าย) → ส่วน Underlying Disease — ไม่มีปุ่มบันทึกของส่วนนี้ ให้ใช้ส่วนเดียวกันในฟอร์มคัดกรอง (เก็บระดับผู้ป่วยเหมือนกัน)
        await recordMenu(page, 'ประวัติทางการแพทย์');
        await page.waitForTimeout(3_000);
        await snapEvidence(page, 'ประวัติทางการแพทย์ ก่อนบันทึก U/D');
        info.ud = await saveUnderlying(page, 'E11.9');
        info.udSource = 'ส่วน Underlying Disease (ระดับผู้ป่วย) ก่อนกรอกคัดกรอง — ฟอร์มคัดกรองของ visit นี้ไม่แตะ U/D';
        await gotoVisit(page, v);
        await expect(erTriagePanel(page).getByRole('combobox', { name: 'Eye Opening (E)' }).first()).toBeVisible({ timeout: 120_000 });
        Object.assign(info, await triage(page, v, { level: 3, vitals: VITALS_NORMAL }));
        return { ...v, preparedAt: bangkokText(), info };
      }),
    );
    await summaryOf(page, visit);
    const history = erSummarySection(page, 'history');
    await startClip(page, tcId(46));
    await r.soft(`${TC(46)} U/D ใช้ประวัติทางการแพทย์เมื่อ Triage ไม่บันทึก`, async () => {
      await toSection(history);
      const f = await readFields(history);
      const want = visit.info?.ud ?? 'Type 2 diabetes mellitus';
      const rows = [row('โรคประจำตัว (U/D)', want, f['โรคประจำตัว (U/D)'] ?? '', (f['โรคประจำตัว (U/D)'] ?? '').toLowerCase().includes(want.toLowerCase().slice(0, 15)))];
      await compare(page, 46, rows, ['Expected (ประวัติทางการแพทย์)', 'จริง (ER Summary)']);
      await markEvidence(expected(fieldOf(history, 'โรคประจำตัว (U/D)'), want));
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย G (ไม่มีข้อมูลเสริม): TC-047 · 048 · 050 (Super_User)', meta('G', 47, 48, 50), async ({ page }) => {
    const r = makeRunner(page);
    const visit = await patient(page, 'G', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย G', async () => {
        const v = await newErVisit(page, 'G');
        const info = await triage(page, v, { level: 4, vitals: VITALS_NORMAL });
        return { ...v, preparedAt: bangkokText(), info };
      }),
    );
    await summaryOf(page, visit);
    const history = erSummarySection(page, 'history');
    await startClip(page, tcId(47));
    await r.soft(`${TC(47)} U/D · แพ้ยา · ยาที่ใช้ประจำ = ไม่มีข้อมูล (ไม่ซ่อนช่อง)`, async () => {
      await toSection(history);
      const f = await readFields(history);
      const rows = ['โรคประจำตัว (U/D)', 'ประวัติแพ้ยา', 'ยาที่ใช้ประจำ'].map((l) => row(l, 'ไม่มีข้อมูล', l in f ? f[l] : '(ไม่แสดงช่อง)'));
      await compare(page, 47, rows);
      await markEvidence(...['โรคประจำตัว (U/D)', 'ประวัติแพ้ยา', 'ยาที่ใช้ประจำ'].map((l) => expected(fieldOf(history, l), 'ไม่มีข้อมูล')));
      expect(bad(rows)).toEqual([]);
    });
    for (const [n, id, want] of [[48, 'orders', 'ไม่มี Order ใน visit นี้'], [50, 'consults', 'ไม่มี Consult ใน visit นี้']] as const) {
      const s = erSummarySection(page, id);
      await startClip(page, tcId(n));
      await r.soft(`${TC(n)} ${ER_SUMMARY_SECTION_TITLE[id]} แสดง "${want}"`, async () => {
        await hideCompareTable(page);
        await toSection(s);
        const text = norm(await s.innerText());
        const rows = [row(ER_SUMMARY_SECTION_TITLE[id], want, text.replace(ER_SUMMARY_SECTION_TITLE[id], '').trim(), text.includes(want))];
        await compare(page, n, rows);
        await markEvidence(expected(s.getByText(want).first().or(s).first(), want));
        expect(bad(rows)).toEqual([]);
      });
    }
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย T1 (Trauma · EMS · ข้อมูลครบ · Admit): TC-024 · 025 · 027–039 (Super_User)', meta('T1', 24, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39), async ({ page }) => {
    const auth = trackAuthorization(page);
    const r = makeRunner(page);
    const transporter = 'หน่วยกู้ภัยทดสอบ SBH-3182';
    const preHospital = 'ถูกรถชน รู้สึกตัวดี BP 110/70 ระหว่างนำส่ง';
    const visit = await patient(page, 'T1', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย T1', async () => {
        // SBH3182_T1_FROM=<HN>,<VN>,<EN> = ทำต่อกับผู้ป่วยที่คัดกรองแล้ว (ข้ามสร้างผู้ป่วย + คัดกรอง + ภาพการนำส่งแบบ 1)
        const from = process.env.SBH3182_T1_FROM?.split(',');
        let v: ErVisit & { name: string };
        let info: Record<string, string>;
        if (from?.length === 3) {
          v = { hn: from[0], vn: from[1], en: from[2], name: '' };
          info = { emergency: 'Trauma', arrival: `EMS (ALS) · ${transporter} · ก่อนถึง รพ.: ${preHospital}`, transportTriageOnly: '(ภาพแบบ 1 เก็บในรอบก่อน — T1-transport-triage-only.png)' };
        } else {
          v = await newErVisit(page, 'T1');
          info = await triage(page, v, { level: 2, vitals: VITALS_NORMAL, arrival: { method: 'EMS', ems: 'ALS', transporter, preHospital }, trauma: true });
          // การนำส่ง แบบ 1: หลังบันทึกคัดกรอง (ยังไม่บันทึกฟอร์ม PHER+)
          await openSummaryView(page, v);
          const t1 = erSummarySection(page, 'transport');
          await toSection(t1);
          info.transportTriageOnly = norm(await t1.innerText());
          await markEvidence(expected(t1, 'แบบ 1: หลังคัดกรองอย่างเดียว'));
          await snapEvidence(page, 'การนำส่ง แบบ 1 หลังคัดกรอง ก่อนฟอร์ม PHER+');
          await clearEvidenceMarks(page);
        }
        info.fastTrack = 'ไม่เลือก — เลือก Trauma Fast Track แล้วบันทึกคัดกรองไม่ได้ (422 VALIDATION_FAILED · dev-x 2 พ.ย. 15:05 ทั้งที่สัญญาณชีพครบ)';
        // แบบ 2: ฟอร์ม PHER+ การดูแลระหว่างนำส่ง
        await gotoVisit(page, v);
        if (!process.env.SBH3182_T1_SKIP_PHER) await pherCare(page); // PHER+ บันทึกได้ฉบับเดียวต่อ Encounter — ทำต่อรายเดิมที่บันทึกแล้วให้ข้าม
        info.pher = CARE.map(([n, p, w]) => `${n} ${p.trim()} ${w}`).join(' · ');
        await gotoVisit(page, v);
        const exam = await traumaExam(page, { dx: ['S06.0', 'S22.3'], illness: 'อุบัติเหตุรถจักรยานยนต์ ล้มกระแทกอกขวา (SBH-3182)' });
        info.dx = exam.dx.join(' · ');
        info.primarySurvey = Object.entries(exam.primarySurvey).map(([k, x]) => `${k}=${x}`).join(' · ');
        info.peSummary = exam.peSummary;
        info.peAbnormal = exam.peAbnormal;
        info.compression = `Chest: ${exam.compression.chest} · Pelvis: ${exam.compression.pelvis}`;
        await gotoVisit(page, v);
        info.bodyChart = await drawBodyChart(page).then(() => 'วาด 2 ตำแหน่ง · บันทึกสำเร็จ', (e: Error) => `บันทึก Body chart ไม่สำเร็จ — ${e.message.split('\n')[0]}`);
        await gotoVisit(page, v);
        const admit = await admitWithBed(page, v, auth);
        info.admit = `AN ${admit.an} · หอ ${admit.ward}`;
        const d = await dispose(page, v, 'รับไว้รักษาต่อIPD');
        info.disposition = `รับไว้รักษาต่อIPD · ลงนาม ${d.signedAt}`;
        return { ...v, preparedAt: bangkokText(), info };
      }),
    );
    const info = visit.info ?? {};
    await summaryOf(page, visit);

    await startClip(page, tcId(24));
    await r.soft(`${TC(24)} ลำดับส่วนบนหน้า ER Summary (Trauma)`, async () => {
      const order = await erSummaryOrder(page);
      const ids = order.map((o) => o.id);
      const want = ['treatment', 'slots-complaint', 'history', 'transport', 'injury', 'slots-diagnosis', 'vitals', 'rts', 'slots-gcs', 'slots-mews', 'slots-fast-track', 'physical-exam-trauma', 'orders', 'consults', 'disposition'];
      const rows: CompareRow[] = [row('ป้ายหัว', 'ER Trauma Exam', norm(await erSummaryPill(page).innerText().catch(() => '')))];
      let last = -1;
      for (const id of want) {
        const at = ids.indexOf(id);
        rows.push(row(ER_SUMMARY_SECTION_TITLE[id] ?? id, 'มี · ต่อจากส่วนก่อนหน้า', at < 0 ? 'ไม่มีส่วนนี้' : at > last ? `ลำดับที่ ${at + 1}` : `ลำดับที่ ${at + 1} (ผิดลำดับ)`, at > last));
        if (at >= 0) last = at;
      }
      rows.push(row('PE ของ ER Physician Note (ใช้ PE Trauma แทน)', 'ไม่แสดง', ids.includes('slots-physical-examination') ? 'แสดง' : 'ไม่แสดง'));
      r.note(`${tcId(24)} ลำดับจริง`, order.map((o) => o.title || o.id).join(' → '));
      await compare(page, 24, rows);
      await markEvidence(expected(erSummaryPill(page), 'ER Trauma Exam'));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(25));
    await r.soft(`${TC(25)} ประเภทฉุกเฉิน Trauma → หัวฟอร์ม ER Trauma Exam`, async () => {
      await hideCompareTable(page);
      await erSummaryPanel(page).evaluate((el) => el.scrollIntoView({ block: 'start' }));
      const rows = [row('หัวฟอร์ม', 'ER Trauma Exam', norm(await erSummaryPill(page).innerText()))];
      await compare(page, 25, rows);
      await markEvidence(expected(erSummaryPill(page), 'ER Trauma Exam'));
      expect(bad(rows)).toEqual([]);
    });
    const treatment = erSummarySection(page, 'treatment');
    await startClip(page, tcId(27));
    await r.soft(`${TC(27)} ประเภทฉุกเฉิน Trauma + Suspect Fast Track Type`, async () => {
      await hideCompareTable(page);
      await toSection(treatment);
      const f = await readFields(treatment);
      const got = f['ประเภทฉุกเฉิน'] ?? '';
      // ค่า Fast Track จริงบนจอ = ส่วน Suspect Fast Track (คัดกรองบันทึก Trauma Fast Track ไม่ได้ — 422 · คัดกรองโดยไม่เลือก)
      const ftSec = erSummarySection(page, 'slots-fast-track');
      const ft = (await ftSec.count()) ? await readFields(ftSec) : {};
      const ftShown = `${ft['Suspect Fast Track'] ?? '-'} · Type ${ft['Fast Track Type'] ?? '-'}`;
      const rows = [
        row('ประเภทฉุกเฉิน', 'Trauma', got, /^Trauma/.test(got)),
        row('Fast Track Type (ข้อมูลการรักษา / ส่วน Suspect Fast Track)', 'Trauma Fast Track', `${got} / ${ftShown}`, /Trauma Fast Track/i.test(`${got} ${ftShown}`)),
      ];
      await compare(page, 27, rows);
      await markEvidence(expected(fieldOf(treatment, 'ประเภทฉุกเฉิน'), `Trauma · Trauma Fast Track · จริง: ${got}`));
      expect(bad(rows)).toEqual([]);
    });
    if (await erSummarySection(page, 'slots-fast-track').count()) {
      await r.soft(`${TC(27)} ส่วน Suspect Fast Track`, async () => {
        const ftSec = erSummarySection(page, 'slots-fast-track');
        await toSection(ftSec);
        const ft = await readFields(ftSec);
        await markEvidence(expected(ftSec, `Trauma Fast Track · จริง: ${ft['Suspect Fast Track'] ?? '-'} / ${ft['Fast Track Type'] ?? '-'}`));
        expect(ft['Fast Track Type'] ?? '', 'Fast Track Type ต้องเป็น Trauma Fast Track').toMatch(/Trauma Fast Track/i);
      });
      await hideCompareTable(page);
    }
    const transport = erSummarySection(page, 'transport');
    await startClip(page, tcId(28));
    await r.soft(`${TC(28)} การนำส่ง: ข้อมูล ER Arrival ตรงกับที่บันทึกในคัดกรอง`, async () => {
      await hideCompareTable(page);
      await toSection(transport);
      const f = await readFields(transport);
      const rows = [
        row('วิธีการมาถึง', 'EMS', f['วิธีการมาถึง'] ?? '', /^EMS/.test(f['วิธีการมาถึง'] ?? '')),
        row('ระดับความเร่งด่วน EMS', 'ALS', f['ระดับความเร่งด่วน EMS'] ?? ''),
        row('ผู้นำส่ง', 'EMS ขึ้นทะเบียน', f['ผู้นำส่ง'] ?? '', /EMS ขึ้นทะเบียน/.test(f['ผู้นำส่ง'] ?? '')),
        row('ชื่อผู้นำส่ง / หน่วยงาน', transporter, f['ชื่อผู้นำส่ง / หน่วยงาน'] ?? ''),
        row('ข้อมูลก่อนถึงโรงพยาบาล', preHospital, f['ข้อมูลก่อนถึงโรงพยาบาล'] ?? ''),
      ];
      await compare(page, 28, rows, ['Expected (คัดกรอง ER Arrival)', 'จริง (ER Summary)']);
      await markEvidence(expected(transport, 'ER Arrival'));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(29));
    await r.soft(`${TC(29)} ตารางการดูแลระหว่างนำส่ง ครบ 5 ข้อ`, async () => {
      await hideCompareTable(page);
      await toSection(transport);
      const t = await readTable(transport.locator('table').first()).catch(() => ({ head: [] as string[], rows: [] as string[][] }));
      const want = ['ดูแลการหายใจ', 'ห้ามเลือด', 'Splint/Slab C-Spine', 'Splint/Slab อื่นๆ', 'IV Fluid'];
      const rows = want.map((h) => row(h, 'มีคอลัมน์', t.head.includes(h) ? 'มี' : 'ไม่มี', t.head.includes(h)));
      r.note(`${tcId(29)} แบบ 1 (หลังคัดกรองอย่างเดียว)`, info.transportTriageOnly ?? '(ไม่ได้เก็บ — รันกับผู้ป่วยเดิม)');
      await compare(page, 29, rows);
      if (await transport.locator('table').count()) await markEvidence(expected(transport.locator('table').first(), '5 ข้อ'));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(30));
    await r.soft(`${TC(30)} ค่าการดูแลระหว่างนำส่งแสดงเป็นคำ ไม่แสดงรหัส`, async () => {
      await hideCompareTable(page);
      await toSection(transport);
      const t = await readTable(transport.locator('table').first()).catch(() => ({ head: [] as string[], rows: [] as string[][] }));
      const values = t.rows[0]?.slice(1) ?? [];
      const heads = t.head.slice(1);
      const map: Record<string, string> = { 'Splint/Slap C-Spine': 'Splint/Slab C-Spine', 'Splint/Slap อื่นๆ': 'Splint/Slab อื่นๆ' };
      const rows = CARE.map(([name, prefix, word]) => {
        const i = heads.indexOf(map[name] ?? name);
        const got = i >= 0 ? values[i] ?? '' : '(ไม่มีคอลัมน์)';
        return row(`${map[name] ?? name} (PHER+ ${prefix.trim()})`, word, got, got === word);
      });
      rows.push(row('ไม่มีรหัสตัวเลข', 'ไม่มี', values.filter((x) => /^\s*[0-3N]\s*(-|$)/.test(x)).join(' · ') || 'ไม่มี'));
      await compare(page, 30, rows, ['Expected (เลือกในฟอร์ม PHER+)', 'จริง (ER Summary)']);
      if (await transport.locator('table').count()) await markEvidence(expected(transport.locator('table').first(), 'คำ ไม่ใช่รหัส'));
      expect(bad(rows)).toEqual([]);
    });
    const rts = erSummarySection(page, 'rts');
    await startClip(page, tcId(31));
    await r.soft(`${TC(31)} RTS ค่าจริง · คะแนนย่อย · คะแนนรวม · สถานะ`, async () => {
      await hideCompareTable(page);
      await toSection(rts);
      const t = await readTable(rts.locator('table').first());
      const v = t.rows[0] ?? [];
      const cell = (h: string) => v[t.head.indexOf(h)] ?? '';
      r.note(`${tcId(31)} RTS`, `${t.head.join(' · ')} | ${v.join(' · ')}`);
      const rows = [
        row('GCS', '15 → 4', cell('GCS'), /15\s*→\s*4/.test(cell('GCS'))),
        row('SBP', `${VITALS_NORMAL.systolic} → 4`, cell('SBP'), new RegExp(`${VITALS_NORMAL.systolic}\\s*→\\s*4`).test(cell('SBP'))),
        row('RR', `${VITALS_NORMAL.rr} → 4`, cell('RR'), new RegExp(`${VITALS_NORMAL.rr}\\s*→\\s*4`).test(cell('RR'))),
        row('คะแนนรวม', 'ทศนิยม', cell('คะแนนรวม'), /^\d+\.\d+$/.test(cell('คะแนนรวม'))),
        row('สถานะ', 'Complete', cell('สถานะ')),
      ];
      await compare(page, 31, rows);
      await markEvidence(expected(rts.locator('table').first().locator('tbody tr').first(), v.slice(-2).join(' · ')));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(32));
    await r.soft(`${TC(32)} คะแนนรวม RTS = 0.9368×GCS + 0.7326×SBP + 0.2908×RR (คะแนนย่อย)`, async () => {
      await hideCompareTable(page);
      await toSection(rts);
      const t = await readTable(rts.locator('table').first());
      const v = t.rows[0] ?? [];
      const sub = (h: string) => Number((v[t.head.indexOf(h)] ?? '').match(/→\s*(\d+)/)?.[1] ?? NaN);
      const want = (0.9368 * sub('GCS') + 0.7326 * sub('SBP') + 0.2908 * sub('RR')).toFixed(4);
      const got = v[t.head.indexOf('คะแนนรวม')] ?? '';
      const rows = [row('คะแนนรวม', `0.9368×${sub('GCS')} + 0.7326×${sub('SBP')} + 0.2908×${sub('RR')} = ${want}`, got, Number(got) === Number(want))];
      await compare(page, 32, rows, ['Expected (คำนวณตามสูตร SBH-1678)', 'จริง (ER Summary)']);
      await markEvidence(expected(rts.locator('table').first().locator('tbody tr').first(), `คะแนนรวม ${got}`));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(33));
    await r.soft(`${TC(33)} Primary Survey A–E ตรงกับ ER Trauma Exam`, async () => {
      await hideCompareTable(page);
      const ps = erSummarySection(page, 'primary-survey').or(rts).first();
      await toSection(ps);
      const text = norm(await rts.innerText());
      const picked = (info.primarySurvey ?? '').split(' · ').filter(Boolean).map((x) => x.split('='));
      const rows = ['A · Airway', 'B · Breathing', 'C · Circulation', 'D · Disability', 'E · Exposure'].map((g) => row(`กลุ่ม ${g}`, 'แสดง', text.includes(g) ? 'แสดง' : 'ไม่แสดง'));
      // ฟอร์มเลือกเป็นภาษาไทย / ตัวพิมพ์เล็ก ER Summary แสดงคำอังกฤษ (เช่น "น้อยกว่าหรือเท่ากับ 2 วินาที" → "2 seconds or less") — เทียบตามความหมาย
      const en: Record<string, string> = { 'น้อยกว่าหรือเท่ากับ 2 วินาที': '2 seconds or less', 'มากกว่า 2 วินาที': 'more than 2 seconds' };
      const lower = text.toLowerCase();
      for (const [k, v] of picked) {
        const want = (en[v] ?? v).toLowerCase();
        rows.push(row(`${k}`, v, lower.includes(want) ? `${en[v] ?? v}` : '(ไม่พบ)', lower.includes(want)));
      }
      rows.push(row('D · รูม่านตา / DTX (บันทึกเพิ่ม 2 พ.ย. 15:4x)', 'รูม่านตา 3 mm RTL ทั้ง 2 ข้าง · DTX 110', /3\s*mm/i.test(text) && /RTL/i.test(text) && /110/.test(text) ? 'แสดงครบ' : '(ไม่พบ)', /3\s*mm/i.test(text) && /RTL/i.test(text) && /110/.test(text)));
      rows.push(row('ข้อความว่าง', 'ไม่แสดง "ยังไม่บันทึก Primary Survey"', text.includes('ยังไม่บันทึก Primary Survey') ? 'แสดง' : 'ไม่แสดง', !text.includes('ยังไม่บันทึก Primary Survey')));
      await compare(page, 33, rows, ['Expected (ER Trauma Exam)', 'จริง (ER Summary)']);
      await markEvidence(expected(ps, 'Primary Survey'));
      expect(bad(rows)).toEqual([]);
    });
    const pe = erSummarySection(page, 'physical-exam-trauma');
    await startClip(page, tcId(34));
    await r.soft(`${TC(34)} Physical Examination (Trauma) ใช้ PE by system ของ ER Trauma Exam`, async () => {
      await hideCompareTable(page);
      await toSection(pe);
      const text = norm(await pe.innerText());
      r.note(`${tcId(34)} PE`, text.slice(0, 400));
      const rows = [row('PE by system', info.peAbnormal ?? 'Lung: ไม่ปกติ', text.includes('decreased breath sound') ? 'Lung ไม่ปกติ · decreased breath sound Rt.' : '(ไม่พบ)', text.includes('decreased breath sound'))];
      await compare(page, 34, rows, ['Expected (ER Trauma Exam)', 'จริง (ER Summary)']);
      await markEvidence(expected(pe, 'PE by system'));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(35));
    await r.soft(`${TC(35)} สรุปผลการตรวจอยู่แถวบนสุดของตาราง PE Trauma`, async () => {
      await hideCompareTable(page);
      await toSection(pe);
      // ข้อความในส่วนเรียงจากบน: หัว → บันทึกเมื่อ … → สรุปผลการตรวจ <ข้อความ> → ระบบ (HEENT …)
      const text = norm(await pe.innerText());
      const summary = 'สรุป: บาดเจ็บทรวงอกขวา ปอดขวาเสียงหายใจลดลง (SBH-3182)';
      const at = text.indexOf('สรุปผลการตรวจ');
      const firstSystem = Math.min(...['HEENT', 'Lung', 'Abdomen', 'Neuro'].map((s) => text.indexOf(s)).filter((i) => i >= 0));
      const ok = at >= 0 && text.includes(summary) && at < firstSystem;
      const rows = [row('แถวบนสุด', `สรุปผลการตรวจ: ${summary}`, at >= 0 ? text.slice(at, at + 80) : '(ไม่พบ สรุปผลการตรวจ)', ok), row('ลำดับ', 'สรุปผลการตรวจ อยู่ก่อนแถวระบบ (HEENT …)', ok ? 'อยู่ก่อน' : 'ไม่ใช่แถวบนสุด', ok)];
      await compare(page, 35, rows);
      // กรอบเฉพาะแถว "สรุปผลการตรวจ" (แถวแม่ของป้าย) — ไม่ใช่ทั้งส่วน PE
      const sumLabel = pe.getByText('สรุปผลการตรวจ', { exact: true }).first();
      await markEvidence(expected((await sumLabel.count()) ? sumLabel.locator('xpath=..') : pe, 'สรุปผลการตรวจ = แถวบนสุด'));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(36));
    await r.soft(`${TC(36)} Compression test แสดง Chest และ Pelvis`, async () => {
      await hideCompareTable(page);
      await toSection(pe);
      const f = await readFields(pe);
      const got = f['Compression test'] ?? '';
      // ฟอร์มเลือก ปกติ / ไม่ปกติ · ER Summary แสดง Negative / Positive (ความหมายเดียวกัน — ถามผู้ใช้ว่าถือว่าผ่านไหม)
      const rows = [
        // ผู้ใช้ตัดสิน 2 พ.ย.: คำต้องตรงกับที่เลือกในฟอร์ม (Negative / Positive ≠ ปกติ / ไม่ปกติ) → Fail
        row('Chest', 'ปกติ (ที่เลือกในฟอร์ม)', got.match(/Chest:\s*([^·]+)/)?.[1]?.trim() ?? '(ไม่พบ)', /Chest:\s*ปกติ/.test(got)),
        row('Pelvis', 'ไม่ปกติ (ที่เลือกในฟอร์ม)', got.match(/Pelvis:\s*([^·]+)/)?.[1]?.trim() ?? '(ไม่พบ)', /Pelvis:\s*ไม่ปกติ/.test(got)),
      ];
      await compare(page, 36, rows, ['Expected (ER Trauma Exam)', 'จริง (ER Summary)']);
      await markEvidence(expected(fieldOf(pe, 'Compression test'), `ปกติ / ไม่ปกติ · จริง: ${rows[0].values[1]} / ${rows[1].values[1]}`));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(37));
    await r.soft(`${TC(37)} Body chart แสดงจำนวนตำแหน่งและชื่อตำแหน่ง`, async () => {
      await hideCompareTable(page);
      await toSection(pe);
      const f = await readFields(pe);
      const got = f['Body chart'] ?? '';
      r.note(`${tcId(37)} การบันทึก Body chart`, info.bodyChart ?? '-');
      const rows = [row('จำนวนตำแหน่ง', '2 ตำแหน่ง', got, /2/.test(got)), row('ชื่อตำแหน่ง', 'หน้าอก / ต้นขา', got, /อก|ขา|chest|thigh/i.test(got))];
      await compare(page, 37, rows, ['Expected (วาด 2 ตำแหน่ง)', 'จริง (ER Summary)']);
      await markEvidence(expected(fieldOf(pe, 'Body chart'), `2 ตำแหน่ง + ชื่อตำแหน่ง · จริง: ${got}`));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(38));
    await r.soft(`${TC(38)} กด ดูภาพ → ภาพ Body chart อ่านอย่างเดียว`, async () => {
      await hideCompareTable(page);
      await toSection(pe);
      const view = pe.getByRole('button', { name: 'ดูภาพ' }).or(pe.getByText('ดูภาพ', { exact: true })).first();
      expect(await view.count(), 'ต้องมีปุ่ม ดูภาพ (มี Body chart ที่บันทึก)').toBeGreaterThan(0);
      await markEvidence(clicked(view, 'ดูภาพ'));
      await snapEvidence(page, 'ก่อนกด — ดูภาพ');
      await view.click();
      const modal = page.getByRole('dialog', { name: 'Body chart' });
      await expect(modal).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(2_000);
      const tools = await interactiveInside(modal);
      const writable = tools.filter((x) => !/close|ปิด|×/i.test(x));
      const rows = [row('ภาพ Body chart', 'เปิด', (await modal.locator('img, canvas, svg').count()) ? 'เปิด' : 'ไม่มีภาพ'), row('เครื่องมือวาด / แก้ไข / บันทึก', 'ไม่มี', writable.join(' · ') || 'ไม่มี')];
      await compare(page, 38, rows);
      await markEvidence(expected(modal, 'อ่านอย่างเดียว'));
      await snapEvidence(page, 'หลังกด — ภาพ Body chart');
      await page.keyboard.press('Escape');
      expect(bad(rows)).toEqual([]);
    });
    await startClip(page, tcId(39));
    await r.soft(`${TC(39)} Diagnosis แสดง Primary + Secondary พร้อม ICD-10`, async () => {
      await hideCompareTable(page);
      const dxSec = erSummarySection(page, 'slots-diagnosis');
      const has = (await dxSec.count()) > 0;
      const unplaced = erSummarySection(page, 'unplaced');
      const target = has ? dxSec : (await unplaced.count()) ? unplaced : erSummarySection(page, 'treatment');
      await toSection(target);
      const text = norm(await target.innerText());
      const codes = (info.dx ?? 'S06.0 · S22.3').split(' · ').map((x) => x.split(' - ')[0]);
      const rows = [
        row('ส่วน Diagnosis', 'แสดง', has ? 'แสดง' : `ไม่มีส่วน Diagnosis${(await unplaced.count()) ? ' (ข้อมูลไปอยู่ "บันทึกอื่นจากแพทย์")' : ''}`, has),
        // อ่านข้อความจริงบนจอ เช่น "Primary Concussion [S06.0]" (รหัสใน info เก็บแบบไม่มีจุด S060)
        row('Primary + รหัส ICD-10', `Primary ${codes[0]}`, (text.match(/Primary.{0,60}?\[[A-Z]\d{2}[.\d]*\]/) ?? ['ไม่มี'])[0], has && /Primary.{0,60}?\[[A-Z]\d{2}[.\d]*\]/.test(text)),
        row('Secondary + รหัส ICD-10', `Secondary ${codes[1] ?? ''}`, (text.match(/(Secondary|Comorbid).{0,60}?\[[A-Z]\d{2}[.\d]*\]/) ?? ['ไม่มี'])[0], has && /(Secondary|Comorbid).{0,60}?\[[A-Z]\d{2}[.\d]*\]/.test(text)),
      ];
      await compare(page, 39, rows, ['Expected (ER Trauma Exam)', 'จริง (ER Summary)']);
      await markEvidence(expected(target, has ? 'Diagnosis' : 'ข้อมูล Diagnosis อยู่ที่นี่แทน'));
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย T2 (Trauma · Walk-in · ข้อมูลน้อย): TC-054 · 056 · 057 · 058 · 059 (Super_User)', meta('T2', 54, 56, 57, 58, 59), async ({ page }) => {
    const r = makeRunner(page);
    const visit = await patient(page, 'T2', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย T2', async () => {
        const v = await newErVisit(page, 'T2');
        const { rr: _rr, ...noRr } = VITALS_NORMAL;
        const info = await triage(page, v, { level: 3, vitals: noRr, trauma: true });
        info.vitals = 'ไม่บันทึก RR (ไม่เลือก Suspect Fast Track Type — รอบที่เลือก Trauma Fast Track + สัญญาณชีพไม่ครบ บันทึกไม่ได้ 422)';
        await gotoVisit(page, v);
        info.dx = (await physicianNote(page, { dx: ['S06.0'] })).join(' · ');
        info.exam = 'ER Trauma Exam บันทึกเฉพาะ Diagnosis — ไม่บันทึก Primary Survey / Body chart · ไม่บันทึก Trauma Detail Form (PHER+)';
        return { ...v, preparedAt: bangkokText(), info };
      }),
    );
    await summaryOf(page, visit);
    const transport = erSummarySection(page, 'transport');
    await startClip(page, tcId(54));
    await r.soft(`${TC(54)} Walk-in แสดงเฉพาะวิธีการมาถึง + ผู้นำส่ง`, async () => {
      await toSection(transport);
      const f = await readFields(transport);
      const rows = [
        row('วิธีการมาถึง', 'Walk-in', f['วิธีการมาถึง'] ?? ''),
        row('ผู้นำส่ง', 'แสดงช่อง', 'ผู้นำส่ง' in f ? f['ผู้นำส่ง'] : '(ไม่มีช่อง)', 'ผู้นำส่ง' in f),
        row('ตารางการดูแลระหว่างนำส่ง', 'ไม่แสดง', (await transport.locator('table').count()) ? 'แสดง' : 'ไม่แสดง'),
        row('ช่องอื่น (ระดับ EMS / ชื่อผู้นำส่ง / ข้อมูลก่อนถึง รพ.)', 'ไม่แสดง', Object.keys(f).filter((k) => !['วิธีการมาถึง', 'ผู้นำส่ง'].includes(k)).join(' · ') || 'ไม่แสดง'),
      ];
      await compare(page, 54, rows);
      await markEvidence(expected(transport, 'เฉพาะวิธีการมาถึง + ผู้นำส่ง (ไม่มีตาราง)'));
      expect(bad(rows)).toEqual([]);
    });
    for (const [n, id, want] of [[56, 'injury', 'ยังไม่บันทึกข้อมูลการบาดเจ็บ'], [58, 'rts', 'ยังไม่บันทึก Primary Survey'], [59, 'physical-exam-trauma', 'ไม่มีการบันทึก Body chart']] as const) {
      const s = erSummarySection(page, id);
      await startClip(page, tcId(n));
      await r.soft(`${TC(n)} ${ER_SUMMARY_SECTION_TITLE[id]} แสดง "${want}"`, async () => {
        await hideCompareTable(page);
        await toSection(s);
        const text = norm(await s.innerText());
        const rows = [row(ER_SUMMARY_SECTION_TITLE[id], want, text.includes(want) ? want : text.slice(0, 120), text.includes(want))];
        await compare(page, n, rows);
        await markEvidence(expected(s.getByText(want).first().or(s).first(), want));
        expect(bad(rows)).toEqual([]);
      });
    }
    const rts = erSummarySection(page, 'rts');
    await startClip(page, tcId(57));
    await r.soft(`${TC(57)} RTS Incomplete เมื่อค่าไม่ครบ (ไม่บันทึก RR)`, async () => {
      await hideCompareTable(page);
      await toSection(rts);
      const t = await readTable(rts.locator('table').first());
      const status = t.rows[0]?.[t.head.indexOf('สถานะ')] ?? norm(await rts.innerText());
      const rows = [row('สถานะ RTS', 'Incomplete', status, /^Incomplete/.test(status))];
      await compare(page, 57, rows);
      await markEvidence(expected(rts.locator('table').first().locator('tbody tr').first(), status));
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย T3 (Trauma · EMS · ไม่กรอกข้อมูลก่อนถึงโรงพยาบาล): TC-055 (Super_User)', meta('T3', 55), async ({ page }) => {
    const r = makeRunner(page);
    const visit = await patient(page, 'T3', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย T3', async () => {
        const v = await newErVisit(page, 'T3');
        const info = await triage(page, v, { level: 3, vitals: VITALS_NORMAL, arrival: { method: 'EMS', ems: 'BLS', transporter: 'มูลนิธิทดสอบ SBH-3182' }, trauma: true });
        return { ...v, preparedAt: bangkokText(), info };
      }),
    );
    await summaryOf(page, visit);
    const transport = erSummarySection(page, 'transport');
    await startClip(page, tcId(55));
    await r.soft(`${TC(55)} ช่องที่ไม่ได้บันทึก (ข้อมูลก่อนถึงโรงพยาบาล) แสดง "ไม่มีข้อมูล"`, async () => {
      await toSection(transport);
      const f = await readFields(transport);
      const rows = [row('ข้อมูลก่อนถึงโรงพยาบาล', 'ไม่มีข้อมูล', 'ข้อมูลก่อนถึงโรงพยาบาล' in f ? f['ข้อมูลก่อนถึงโรงพยาบาล'] : '(ไม่มีช่อง)'), row('วิธีการมาถึง', 'EMS', f['วิธีการมาถึง'] ?? '', /^EMS/.test(f['วิธีการมาถึง'] ?? ''))];
      await compare(page, 55, rows);
      await markEvidence(expected('ข้อมูลก่อนถึงโรงพยาบาล' in f ? fieldOf(transport, 'ข้อมูลก่อนถึงโรงพยาบาล') : transport, 'ไม่มีข้อมูล'));
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  for (const [key, n, from, to] of [['H', 52, 'Non-Trauma', 'Trauma'], ['I', 53, 'Trauma', 'Non-Trauma']] as const) {
    test(`ผู้ป่วย ${key} (แก้ประเภทฉุกเฉิน ${from} → ${to}): ${tcId(n)} (Super_User)`, meta(key, n), async ({ page }) => {
      const r = makeRunner(page);
      const visit = await patient(page, key, r, () =>
        test.step(`เตรียมข้อมูล ผู้ป่วย ${key}`, async () => {
          const v = await newErVisit(page, key);
          const info = await triage(page, v, { level: 3, vitals: VITALS_NORMAL, trauma: from === 'Trauma' });
          await editTriageEmergency(page, v, to);
          info.emergency = `${from} → แก้เป็น ${to}`;
          await gotoVisit(page, v);
          info.dx = (await physicianNote(page, { dx: [to === 'Trauma' ? 'S06.0' : 'K30'] })).join(' · ');
          return { ...v, preparedAt: bangkokText(), info };
        }),
      );
      await summaryOf(page, visit);
      await startClip(page, tcId(n));
      await r.soft(`${TC(n)} แก้ประเภทฉุกเฉิน ${from} → ${to} ใช้ค่าล่าสุด`, async () => {
        const ids = (await erSummaryOrder(page)).map((o) => o.id);
        const f = await readFields(erSummarySection(page, 'treatment'));
        const trauma = to === 'Trauma';
        const rows = [
          row('ประเภทฉุกเฉิน', to, f['ประเภทฉุกเฉิน'] ?? '', (f['ประเภทฉุกเฉิน'] ?? '').startsWith(to)),
          row('หัวฟอร์ม', trauma ? 'ER Trauma Exam' : 'ER Physician Note', norm(await erSummaryPill(page).innerText())),
          ...['transport', 'injury', 'rts', 'physical-exam-trauma'].map((id) => row(ER_SUMMARY_SECTION_TITLE[id], trauma ? 'แสดง' : 'ไม่แสดง', ids.includes(id) ? 'แสดง' : 'ไม่แสดง')),
        ];
        await compare(page, n, rows);
        const traumaTitle = erSummarySection(page, 'transport').locator('[class*="_title_"]').first();
        await markEvidence(
          expected(erSummaryPill(page), trauma ? 'ER Trauma Exam' : 'ER Physician Note'),
          expected(fieldOf(erSummarySection(page, 'treatment'), 'ประเภทฉุกเฉิน'), f['ประเภทฉุกเฉิน'] ?? ''),
          ...(trauma && (await traumaTitle.count()) ? [expected(traumaTitle, 'แสดงส่วน Trauma')] : []),
        );
        expect(bad(rows)).toEqual([]);
      });
      r.finish();
    });
  }
});
