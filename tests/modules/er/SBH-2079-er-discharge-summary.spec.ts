import { type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { dismissToast, gotoErDashboard, type ErVisit } from '../../../helpers/functions/er';
import { chooseDispositionDiagnosis, dispositionTextBoxes, graphqlMutation, openDisposition, reopenDisposition, saveDispositionDraft, signDisposition, startDisposition, type ErDischargeSummary } from '../../../helpers/functions/er-disposition';
import {
  DS_NOT_SIGNED,
  DS_PDF_API,
  dsBand,
  dsCheckboxes,
  dsDispositionPrintButton,
  dsFind,
  dsKey,
  dsLineBox,
  dsSection,
  dsTabPrintButton,
  dsText,
  isRunningHeader,
  markPdf,
  dsPixel,
  openDsTab,
  readDsPdf,
  showDs,
  thaiKey,
  type DsLine,
  type DsPdf,
} from '../../../helpers/functions/er-discharge-summary';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { admitCreateAn, ipdContinueOrder, putToBed } from '../../../helpers/functions/ipd-admit';
import { erTriagePanel, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { captureGeneratedDocs, hidePdf } from '../../../helpers/functions/print-capture';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, recordDrugAllergy, registerAndOpenErVisit, submitOrders } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, addMedicineToCart, careMenu, gotoVisit, openPatientAs } from '../../../mock-data/uat-play';

// SBH-2079 [ER][Disposition] Discharge summary — เอกสาร ER Discharge Summary (PDF) จากแท็บ สรุปการจำหน่าย ในประวัติการรักษา + ปุ่มพิมพ์ใน Disposition
// ชุด Manual: EXE SBH-3617 → HPY SBH-3619 (TC 001–052) · UHP SBH-3620 (TC 053–059) · EDG SBH-3622 (TC 060–070) — เลข Issue ใน ISSUE ด้านล่าง
// 1 เทส = 1 ผู้ป่วย (R9) · ผู้ป่วย AUTO ใหม่ (R10) · บัญชีหลัก Super_User (user1 = แพทย์ "ทดสอบ มานะ") · คลิป 1 ไฟล์ต่อ 1 TC (R61) · TC ไม่ผ่านไม่หยุดเทส (soft)
// คำตอบผู้ใช้ (decisions R109): 057 Admit + เตียง SBHAUTO · 065/066 หา Visit เก่าอ่านอย่างเดียว · 028 ตรวจ One day · TC-008 ผ่านรอตรวจบน Prod · ลงผล + สถานะ
// หน้าจอ (dev-x 4 พ.ย. 2026 · index-DABLTrDz.js): helpers/functions/er-discharge-summary.ts · ภาพ PDF = สคริปต์เปิด PDF ที่ระบบส่งมาซ้อนครึ่งขวาของจอ
// ใช้ผู้ป่วยเดิม (ข้ามขั้นเตรียม): SBH2079_<KEY>=HN,VN,EN · รายที่เตรียมแล้วจดใน .cache/SBH-2079/state.json
// รัน (dev-x): npx playwright test --headed --grep "@SBH-2079-B( |$)" (ทีละผู้ป่วย: A B C D E)

const ISSUE: Record<number, string> = {
  1: 'SBH-3626', 2: 'SBH-3628', 3: 'SBH-3630', 4: 'SBH-3632', 5: 'SBH-3634', 6: 'SBH-3636', 7: 'SBH-3637', 8: 'SBH-3639', 9: 'SBH-3641', 10: 'SBH-3643',
  11: 'SBH-3647', 12: 'SBH-3648', 13: 'SBH-3649', 14: 'SBH-3651', 15: 'SBH-3653', 16: 'SBH-3655', 17: 'SBH-3657', 18: 'SBH-3659', 19: 'SBH-3661', 20: 'SBH-3662',
  21: 'SBH-3666', 22: 'SBH-3668', 23: 'SBH-3669', 24: 'SBH-3670', 25: 'SBH-3672', 26: 'SBH-3674', 27: 'SBH-3676', 28: 'SBH-3678', 29: 'SBH-3680', 30: 'SBH-3682',
  31: 'SBH-3685', 32: 'SBH-3687', 33: 'SBH-3689', 34: 'SBH-3691', 35: 'SBH-3693', 36: 'SBH-3694', 37: 'SBH-3696', 38: 'SBH-3698', 39: 'SBH-3700', 40: 'SBH-3702',
  41: 'SBH-3706', 42: 'SBH-3708', 43: 'SBH-3710', 44: 'SBH-3712', 45: 'SBH-3713', 46: 'SBH-3715', 47: 'SBH-3717', 48: 'SBH-3719', 49: 'SBH-3721', 50: 'SBH-3723',
  51: 'SBH-3727', 52: 'SBH-3729', 53: 'SBH-3731', 54: 'SBH-3732', 55: 'SBH-3733', 56: 'SBH-3734', 57: 'SBH-3735', 58: 'SBH-3736', 59: 'SBH-3737', 60: 'SBH-3738',
  61: 'SBH-3739', 62: 'SBH-3740', 63: 'SBH-3741', 64: 'SBH-3743', 65: 'SBH-3745', 66: 'SBH-3746', 67: 'SBH-3747', 68: 'SBH-3748', 69: 'SBH-3749', 70: 'SBH-3750',
};
const TITLE: Record<number, string> = {
  8: 'หัวกระดาษแสดงตราและชื่อ ที่อยู่ เบอร์โทรของโรงพยาบาล',
  9: 'หัวกระดาษด้านขวาแสดงวันเวลาที่พิมพ์และผู้สั่งพิมพ์โดยไม่แสดงสิทธิการรักษา',
  10: 'ชื่อเอกสารแสดงสรุปการจำหน่ายผู้ป่วยฉุกเฉินและ ER Discharge Summary',
  11: 'ลำดับส่วนบนเอกสาร ER Discharge Summary',
  12: 'หัว Section ของเอกสารเป็นสีเทาเข้มไม่ใช่สีดำ',
  13: 'ข้อมูลระบุตัวผู้ป่วยตรงกับ Patient banner และ Encounter',
  14: 'วันเวลาจำหน่ายตรงกับวันเวลาที่ลงนาม Disposition',
  15: 'ประวัติแพ้ยาแสดงชื่อยา ประเภท สรุปอาการ Severity และผลการประเมิน',
  16: 'ประวัติแพ้อื่นๆ แสดงสิ่งที่แพ้ ประเภท สรุปอาการ และ Severity',
  17: 'ส่วน ER Physician Note แสดงหัวข้อครบและชื่อหัวข้อตามฟอร์ม',
  18: 'Chief Complaint - General และ Present illness general แสดงข้อความตามที่บันทึก',
  19: 'Verified Underlying Disease แสดง Display ของรายการที่ Active',
  20: 'Vital signs แสดงค่ารายการล่าสุดใน ER Physician Note',
  21: 'Glasgow Coma Scale แสดง E V M และ Total GCS',
  22: 'MEWS แสดง Total MEWS',
  23: 'การจำแนกผู้ป่วยแสดง Suspect Fast Track Type และประเภทฉุกเฉิน',
  24: 'Body metric general แสดงน้ำหนัก ส่วนสูง และ BMI',
  25: 'Physical examination แสดงสรุปผลการตรวจและผลรายระบบครบ 7 ระบบ',
  26: 'Body chart แสดงรายการตำแหน่งและรายละเอียดโดยไม่พิมพ์ภาพ',
  27: 'เอกสารไม่แสดง Diagnosis general และ Note to nurse',
  28: 'Order ที่ได้รับใน ER แสดงครบทั้ง ORDER FOR ONE DAY และ ORDER FOR CONTINUE',
  29: 'Order จัดกลุ่มและชื่อกลุ่มตรงกับหน้า Order Summary',
  30: 'ตาราง Order มีเฉพาะคอลัมน์ ORDER FOR รายการ ความเร่งด่วน และจำนวน',
  31: 'รายการยาแสดงรายการ วิธีการใช้ และฉลากช่วยตาม Order',
  32: 'รายการหัตถการต่อท้ายด้วยรหัส ICD9-CM',
  33: 'รายการห้องปฏิบัติการต่อท้ายด้วย Specimen',
  34: 'ส่วน Disposition เรียงหัวข้อตามลำดับฟอร์ม Disposition',
  35: 'สถานะการจำหน่ายแสดงตัวเลือกครบ 9 ข้อและติ๊ก [X] ที่ค่าที่เลือก',
  36: 'วิธีการจำหน่ายแสดงตัวเลือกครบ 10 ข้อและติ๊ก [X] ที่ค่าที่เลือก',
  38: 'ข้อมูล Visit แสดงวินิจฉัยโดยแพทย์',
  39: 'การวินิจฉัยแสดงรหัส - ชื่อโรค ประเภท และแพทย์',
  40: 'หัตถการแสดง Type Procedure Practitioner Start - End Date และ Site',
  41: 'NON OR PROCEDURE แสดงครบ 22 ข้อและติ๊ก [X] ที่รายการที่เลือก',
  42: 'ข้อมูลทางคลินิกและการดำเนินโรคแสดงข้อความตามที่บันทึก',
  43: 'การตรวจเพิ่มเติมและผลการตรวจแสดงข้อความตามที่บันทึก',
  44: 'Discharge Instruction & Follow-up Plan แสดงคำแนะนำผู้ป่วยและนัดติดตาม',
  45: 'ช่องลงนามแพทย์ผู้สั่งจำหน่ายแสดงชื่อ-สกุลและวันเวลาที่ลงนาม',
  46: 'แพทย์ร่วมทำแสดงชื่อเมื่อมีบันทึก',
  48: 'เอกสารเป็นกระดาษ A4 แนวตั้ง ฟอนต์ไทยอ่านได้ และไม่มี UI ของหน้าจอ',
  49: 'ท้ายทุกหน้าแสดงผู้สั่งพิมพ์ วันเวลาที่พิมพ์ และหน้า x/y',
  50: 'หัวกระดาษแสดงซ้ำทุกหน้าเมื่อเอกสารมีหลายหน้า',
  52: 'พิมพ์ใหม่หลังแก้ไขข้อมูลต้นทางแล้วได้ข้อมูลล่าสุด',
  56: 'Order ที่ยกเลิกไม่แสดงในเอกสาร',
  58: 'ประวัติการแพ้ที่ไม่ Active ไม่แสดงในเอกสาร',
  59: 'โรคประจำตัวที่ไม่ Active ไม่แสดงใน Verified Underlying Disease',
  67: 'ตารางที่ยาวเกินหน้าต่อขึ้นหน้าใหม่โดยไม่ตัดกลางแถว',
};
const tcId = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const TC = (n: number) => `${tcId(n)} (${ISSUE[n]})`;
const meta = (key: string, ...tcs: number[]) => ({
  tag: ['@SBH-2079', `@SBH-2079-${key}`, ...tcs.map((n) => `@${ISSUE[n]}`)],
  annotation: [{ type: 'issue', description: 'https://linear.app/cortexcloud/issue/SBH-2079' }],
});

const CACHE = path.join(__dirname, '..', '..', '..', '.cache', 'SBH-2079');
const STATE_FILE = path.join(CACHE, 'state.json');
type Saved = ErVisit & { name: string; preparedAt: string; info?: Record<string, string> };
const readState = (): Record<string, Saved> => (fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {});
function saveState(key: string, value: Saved) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...readState(), [key]: value }, null, 2));
}
const bangkokText = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const bad = (rows: CompareRow[]) => rows.filter((r) => !r.same).map((r) => `${r.label}: Expected ${r.values[0]} · จริง ${r.values[1]}`);
const row = (label: string, want: string, got: string, same = want === got): CompareRow => ({ label, values: [want, got || '(ว่าง)'], same });
/** "2026-11-04T02:00:13Z" → "04/11/2569, 09:00" (รูปแบบบน PDF) */
const pdfDateTime = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${Number(p.year) + 543}, ${p.hour}:${p.minute}`;
};
/** ข้อความยาว n ตัวอักษร (ASCII) สำหรับ BVA */
const longText = (n: number, seed = 'SBH2079-') => seed.repeat(Math.ceil(n / seed.length)).slice(0, n);

const STATUS_9 = ['Complete Recovery', 'Improved', 'Not Improved', 'Normal Delivery', 'Un-Delivery', 'Normal child w/ mother', 'Normal child separately', 'Stillbirth', 'Dead'];
const METHOD_10 = ['With Approval', 'ปฎิเสธการรักษา', 'หนีกลับ', 'กลับก่อนได้รับการตรวจ', 'รับไว้รักษาต่อIPD', 'By Transfer', 'Dead Autopsy', 'Dead Non-Autopsy', 'เสียชีวิต', 'เสียชีวิตก่อนมาถึง'];

// ------------------------------------------------------------------------------------------------
// เตรียมผู้ป่วย
/** ผู้ป่วย AUTO ใหม่ → เปิด Visit ER → คัดกรอง (ESI 3 · สัญญาณชีพปกติ) */
async function newTriagedVisit(page: Page, key: string): Promise<ErVisit & { name: string }> {
  await expect(async () => {
    await gotoErDashboard(page);
  }, 'เปิด ER Dashboard').toPass({ timeout: 180_000 });
  const patient = newTestPatient(`X2079${key}`);
  const visit = await registerAndOpenErVisit(page, patient);
  await expect(erTriagePanel(page).getByRole('combobox', { name: 'Eye Opening (E)' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 120_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
  await page.waitForTimeout(3_000);
  const locked = page.getByRole('main').getByText('ร่างถูกแก้ไขจากที่อื่น', { exact: false });
  for (let i = 0; i < 3 && (await locked.isVisible().catch(() => false)); i++) {
    await page.getByRole('button', { name: 'ลองเก็บร่างอีกครั้ง' }).click();
    await page.waitForTimeout(5_000);
  }
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ').catch(() => undefined);
  return { ...visit, name: `${patient.firstName} ${patient.familyName}` };
}

/** เปิดเมนู Disposition (แผง Overview โหลดตามหลังแล้วทับ → กดซ้ำ) · `start` = กดเริ่มจำหน่ายถ้ายังไม่เริ่ม */
async function gotoDisposition(page: Page, visit: ErVisit, start = true) {
  await gotoVisit(page, visit);
  await careMenu(page, 'Disposition', page.getByRole('main').getByText('สรุปการจำหน่าย', { exact: true }));
  await page.waitForTimeout(3_000);
  if (!(await page.getByRole('main').getByText('สรุปการจำหน่าย', { exact: true }).isVisible())) await openDisposition(page);
  await page.mouse.move(600, 600);
  if (start && (await page.getByTestId('er-disposition-start').isVisible().catch(() => false))) await startDisposition(page);
}

const dispo = (page: Page) => {
  const main = page.getByRole('main');
  return {
    main,
    radio: (name: string) => main.getByRole('radio', { name, exact: true }),
    clinicalSummary: main.getByPlaceholder('สรุปอาการผู้ป่วย คำแนะนำ และการติดตามอาการ').first(),
    followUp: main.getByPlaceholder(/ระบุแผนการติดตามอาการ/).first(),
    causeSection: main.getByText('สาเหตุการเสียชีวิตและการยืนยันการเสียชีวิต', { exact: true }).locator('xpath=ancestor::*[contains(@class,"ant-card") or self::section or contains(@class,"_section")][1]'),
    causeTitle: main.getByText('สาเหตุการเสียชีวิตและการยืนยันการเสียชีวิต', { exact: true }),
    causeLabel: main.getByText('สาเหตุการเสียชีวิต', { exact: true }).first(),
    causeIcd: main.getByText('โรคหรือภาวะหลัก (ค้นหา ICD-10)', { exact: true }).first(),
    causeSelect: main.getByText('สาเหตุการเสียชีวิต', { exact: true }).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]'),
    causeDue: main.getByPlaceholder('ระบุสาเหตุที่เกี่ยวข้อง').first(),
    causeOther: main.getByPlaceholder('ระบุเหตุการณ์อื่นที่เกี่ยวข้อง').first(),
    followSection: main.getByText('คำแนะนำการจำหน่ายและแผนติดตามอาการ', { exact: true }),
    signButton: page.getByTestId('er-disposition-finalize'),
    printButton: dsDispositionPrintButton(page),
    lastEdited: main.getByText(/แก้ไขล่าสุดโดย/).first(),
  };
};

/** ตัวนับตัวอักษรของ textarea (antd showCount) — "0 / 1000" */
async function counterOf(box: Locator): Promise<{ text: string; el: Locator }> {
  const wrap = box.locator('xpath=ancestor::*[contains(@class,"ant-input-textarea") or contains(@class,"ant-input-affix-wrapper")][1]');
  const attr = (await wrap.getAttribute('data-count').catch(() => null)) ?? '';
  if (attr) return { text: norm(attr), el: wrap };
  const span = wrap.locator('.ant-input-data-count').first();
  if (await span.count()) return { text: norm(await span.innerText()), el: span };
  const after = box.locator('xpath=following::*[normalize-space(text()) and contains(text()," / ")][1]');
  return { text: norm(await after.innerText().catch(() => '')), el: after };
}

/** ช่องสาเหตุการเสียชีวิต: ค้น ICD-10 → เลือกตัวแรก · คืนข้อความที่เลือก */
async function chooseCauseIcd(page: Page, code: string): Promise<string> {
  const d = dispo(page);
  await d.causeSelect.scrollIntoViewIfNeeded();
  await d.causeSelect.click();
  await d.causeSelect.locator('input').first().focus().catch(() => undefined);
  await page.keyboard.type(code.replace('.', ''), { delay: 60 });
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${code.replace('.', '\\.?')}`) }).first();
  await expect(option, `ค้นสาเหตุการเสียชีวิต ${code} ต้องเจอ`).toBeVisible({ timeout: 20_000 });
  const text = norm((await option.getAttribute('title')) ?? (await option.innerText()));
  await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
  return text;
}

interface DispoInput {
  status: string;
  method: string;
  dx?: string;
  clinical?: string;
  finding?: string;
  clinicalSummary?: string;
  followUp?: string;
}
/** กรอก Disposition (ฟอร์มเริ่มแล้ว) */
async function fillDisposition(page: Page, input: DispoInput) {
  const d = dispo(page);
  await d.radio(input.status).check();
  await d.radio(input.method).check();
  await chooseDispositionDiagnosis(page, input.dx ?? 'K30');
  const { clinical, finding } = dispositionTextBoxes(page);
  if (input.clinical !== undefined) await clinical.fill(input.clinical);
  if (input.finding !== undefined) await finding.fill(input.finding);
  if (input.clinicalSummary !== undefined) await d.clinicalSummary.fill(input.clinicalSummary);
  if (input.followUp !== undefined) await d.followUp.fill(input.followUp);
}

// ------------------------------------------------------------------------------------------------
// PDF
type Docs = ReturnType<typeof captureGeneratedDocs>;
/** กดพิมพ์ (แท็บ / Disposition) → PDF ที่ระบบสร้าง (intent=print) */
async function printPdf(page: Page, docs: Docs, button: Locator, what: string): Promise<Buffer> {
  const since = Date.now();
  await button.click();
  const doc = await docs.next(DS_PDF_API, since, 60_000);
  expect(doc.error, `${what}: สร้าง PDF ต้องไม่ error`).toBeUndefined();
  return doc.files[0].data;
}

/** ตารางเทียบ (ซ้าย) + PDF (ขวา) */
async function compareOnPdf(page: Page, n: number, rows: CompareRow[], cols = ['Expected', 'จริง (PDF)']) {
  await showCompareTable(page, `${tcId(n)} เทียบค่า`, cols, rows, { side: 'left' });
}
async function resetView(page: Page) {
  await hideCompareTable(page).catch(() => undefined);
  await hidePdf(page);
  await clearEvidenceMarks(page).catch(() => undefined);
}
/** ตีกรอบบรรทัดบน PDF แบบไม่มีป้าย + คำอธิบายที่หัวภาพ (ข้ามที่หาไม่เจอ) · `extra` = กรอบอื่นที่วาดเอง (dsBand) */
async function markLines(overlay: Locator, items: [string | RegExp, string][], extra: [Locator | undefined, string][] = []) {
  const marks: [Locator | undefined, string][] = [];
  for (const [text, label] of items) marks.push([await dsLineBox(overlay, text), label]);
  await markPdf(overlay, [...marks, ...extra]);
}

// ------------------------------------------------------------------------------------------------
// ผู้ป่วย A: การแพ้ · Order · Disposition ครบ
const MEDS_A = ['med0000006', 'med0000007', 'med0000008']; // R25 · med0000005 (BETAMED ยาทา) เพิ่มลงตะกร้า One Day Order ไม่ขึ้น (4 พ.ย.)
const CANCEL_MED_A = 'med0000008';
const ORDERS_A = ['89.52', 'SBHLAB2', 'SBHLAB5', 'SBHLAB399', 'SBHIMG21'];
const SUPPLIES_A = ['NUH-OS-MDS-125', 'NUH-OS-MDS-116'];
const OTHER_ACTIVE = { allergen: 'ฝุ่นละออง SBH2079', reaction: 'จามไม่หยุด', summary: 'จามและคัดจมูกเมื่อสัมผัสฝุ่น (SBH-2079)', severity: 'ต่ำ', type: 'ทั่วไป' };
const OTHER_INACTIVE = { allergen: 'ขนแมว SBH2079', reaction: 'ผื่นแดง', summary: 'ผื่นแดงเมื่อสัมผัสขนแมว (SBH-2079 Inactive)', severity: 'สูง', type: 'ทั่วไป' };
const TEXT_A = {
  clinical: 'ปวดท้องใต้ลิ้นปี่ 1 วัน อาการดีขึ้นหลังให้ยา (SBH-2079 A)',
  finding: 'CBC ปกติ EKG sinus rhythm (SBH-2079 A)',
  clinicalSummary: 'รับประทานยาตามแพทย์สั่ง งดอาหารรสจัด (SBH-2079 A)',
  followUp: 'นัดติดตามอาการที่ OPD อายุรกรรม 1 สัปดาห์ (SBH-2079 A)',
};
const CO_DOCTOR = 'นาย แพทย์ทดสอบ ทดสอบ';
const NON_OR_A = [
  { th: 'การให้เลือด', en: 'Blood transfusion' },
  { th: 'การใส่ท่อช่วยหายใจ', en: 'Insertion of endotracheal tube' },
];

/** เปิดหน้า Visit แล้วรอแผง Overview ที่โหลดตามหลังขึ้นครบ (ไม่งั้นมาทับแท็บที่เพิ่งเปิดจากเมนูขวา) */
async function settledVisit(page: Page, v: ErVisit) {
  await gotoVisit(page, v);
  // แผงตั้งต้นของหน้า Visit: Overview หรือ คัดกรอง ER (หลังคัดกรองครั้งแรก) — รอให้ขึ้นแล้วนิ่งก่อนเปิดเมนูขวา
  const main = page.getByRole('main');
  await expect(main.getByText('Clinical Summary', { exact: true }).or(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true })).first(), 'แผงตั้งต้นของหน้า Visit ต้องโหลด').toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(6_000);
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
/** เวชภัณฑ์: ค้น → จำนวน 1 → เพิ่มลงตะกร้า (จาก spec SBH-3158) */
async function addSupply(page: Page, code: string) {
  const main = page.getByRole('main');
  const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  const rows = main.getByRole('row').filter({ hasText: `[${code}]` });
  const before = await rows.count();
  await expect(async () => {
    if (!(await search.isVisible())) await openOneDayOrder(page);
    await search.click();
    await search.fill('');
    await search.pressSequentially(code, { delay: 40 });
    const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: `[${code}]` }).first();
    await expect(option, `ต้องค้นเจอ ${code}`).toBeVisible({ timeout: 10_000 });
    await option.click();
    const qty = main.getByRole('textbox', { name: /จำนวนที่จ่าย/ }).or(main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ })).first();
    await expect(qty).toBeVisible();
    await page.waitForTimeout(1_500);
    await qty.click();
    await qty.fill('');
    await qty.pressSequentially('1', { delay: 100 });
    await page.keyboard.press('Tab');
    await page.getByRole('button', { name: 'plus เพิ่มลงตะกร้า' }).click();
    await expect.poll(() => rows.count(), { timeout: 15_000 }).toBeGreaterThan(before);
  }, `เพิ่มเวชภัณฑ์ ${code}`).toPass({ timeout: 120_000 });
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
  const res = await cancelled;
  expect(res.ok(), `ยกเลิกยา ${code}`).toBe(true);
}

/** แพ้อื่นๆ (เมนู บันทึกการแพ้ > แท็บ แพ้อื่นๆ · dropdown แบบ custom: 0 ประเภท · 1 Severity · 2 ผลการประเมิน · 3 Active Status) */
async function recordOtherAllergy(page: Page, a: typeof OTHER_ACTIVE, active: boolean) {
  const main = page.getByRole('main');
  await careMenu(page, 'บันทึกการแพ้', main.getByRole('heading', { name: 'การแพ้ยา' }));
  await main.getByRole('tab', { name: 'แพ้อื่นๆ' }).click();
  const panel = main.getByRole('tabpanel', { name: 'แพ้อื่นๆ' });
  await expect(panel.getByRole('heading', { name: 'การแพ้อื่นๆ' })).toBeVisible();
  const pick = async (i: number, option: string) => {
    const c = panel.getByRole('combobox').nth(i);
    await c.click();
    await page.waitForTimeout(800);
    await page.getByText(option, { exact: true }).filter({ visible: true }).last().click();
    await page.waitForTimeout(600);
    await expect(c, `เลือก ${option}`).toContainText(option);
  };
  await pick(0, a.type);
  const allergen = panel.getByRole('textbox', { name: 'ค้นหาสิ่งที่แพ้ หรือพิมพ์ข้อความอิสระ' });
  await allergen.fill(a.allergen);
  const free = panel.getByText(`ใช้ "${a.allergen}" เป็นข้อความอิสระ`);
  await expect(free).toBeVisible({ timeout: 15_000 });
  await free.click();
  // ช่องข้อความหาจากกล่อง .form-item ที่มีป้ายตรงตัว (ลำดับ textbox เปลี่ยนหลังเลือกสิ่งที่แพ้)
  const fieldOf = (label: string) => panel.locator('.form-item').filter({ has: page.getByText(label, { exact: true }) }).last().locator('input:not([type=checkbox]):not([aria-hidden=true]), textarea').first();
  await fieldOf('อาการแพ้').fill(a.reaction);
  await fieldOf('สรุปอาการแพ้').fill(a.summary);
  await expect(fieldOf('อาการแพ้')).toHaveValue(a.reaction);
  await expect(fieldOf('สรุปอาการแพ้')).toHaveValue(a.summary);
  await pick(1, a.severity);
  await pick(2, 'Confirmed');
  if (!active) await pick(3, 'Inactive');
  // ภาพของขั้นเตรียม ไม่ให้ทำขั้นเตรียมล้ม (ช่องสิ่งที่แพ้กลายเป็นป้ายหลังเลือก · มีสำเนา print-only ซ่อนอยู่)
  try {
    await markEvidence(filled(panel.getByRole('combobox').nth(0), a.type), filled(panel.getByText(a.allergen, { exact: true }).filter({ visible: true }).first(), a.allergen), filled(panel.getByRole('combobox').nth(3), active ? 'Active' : 'Inactive'));
    await snapEvidence(page, `กรอก แพ้อื่นๆ ${active ? 'Active' : 'Inactive'}`);
  } catch (e) {
    console.warn('    ⚠ ภาพขั้นเตรียมแพ้อื่นๆ:', String(e).split('\n')[0]);
  }
  await clearEvidenceMarks(page);
  // บันทึกแพ้อื่นๆ = openEHR contribution (POST /ehrbase/rest/openehr/v1/ehr/<id>/contribution → 201) ไม่ใช่ graphql
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/ehrbase\/rest\/openehr\/v1\/ehr\/[^/]+\/contribution/.test(r.url()), { timeout: 30_000 });
  await panel.getByRole('button', { name: 'save บันทึก' }).click();
  const res = await saved;
  const body = await res.text();
  expect(res.ok() && !/"errors"/.test(body), `บันทึกแพ้อื่นๆ ${a.allergen}: ${body.slice(0, 200)}`).toBe(true);
}

/** เมนูซ้าย ประวัติการแพ้ > แถวยา → สวิตช์ Active ปิด (Inactive) */
async function setDrugAllergyInactive(page: Page, drug: RegExp) {
  const main = page.getByRole('main');
  await page.getByRole('navigation', { name: 'ข้อมูลและเวชระเบียนผู้ป่วย' }).getByRole('menuitem', { name: 'ประวัติการแพ้', exact: true }).click({ force: true });
  const line = main.getByRole('row').filter({ hasText: drug }).filter({ has: page.getByRole('switch') }).first();
  await expect(line, `ประวัติการแพ้ต้องมีแถว ${drug.source}`).toBeVisible({ timeout: 60_000 });
  const sw = line.getByRole('switch');
  await sw.scrollIntoViewIfNeeded();
  const changed = page.waitForResponse((r) => r.request().method() === 'POST' && /graphql/.test(r.url()) && /mutation /.test(r.request().postData() ?? ''), { timeout: 30_000 });
  await sw.click();
  const confirm = page.locator('.ant-popover:visible, .ant-modal:visible').getByRole('button', { name: /ยืนยัน|ตกลง|OK/ });
  if (await confirm.first().waitFor({ timeout: 4_000 }).then(() => true, () => false)) await confirm.first().click();
  const res = await changed;
  expect(res.ok(), `ปิด Active ${drug.source}`).toBe(true);
  await expect(sw, 'สวิตช์ต้องเป็น Inactive').not.toBeChecked({ timeout: 15_000 });
  await markEvidence(filled(sw, 'Inactive'));
  await snapEvidence(page, 'ปิด Active แพ้ยา');
  await clearEvidenceMarks(page);
}

/** หัตถการแถวแรกของ Disposition: ICD9-CM + วันเริ่ม / สิ้นสุด (วันนี้) + Site · คืนค่าที่กรอก */
async function fillProcedure(page: Page, code: string): Promise<Record<string, string>> {
  const main = page.getByRole('main');
  const table = main.locator('table').filter({ hasText: 'Practitioner' }).first();
  await table.scrollIntoViewIfNeeded();
  const sel = table.locator('.ant-select');
  await sel.nth(1).click();
  await page.keyboard.type(code, { delay: 60 });
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${code.replace('.', '\\.')} - `) }).first();
  await expect(option, `ค้นหัตถการ ${code}`).toBeVisible({ timeout: 20_000 });
  const procedure = norm(await option.innerText());
  await option.click();
  for (const name of ['วันเริ่มต้น', 'วันสิ้นสุด']) {
    await table.getByRole('textbox', { name }).click();
    const dd = page.locator('.ant-picker-dropdown:visible').last();
    await dd.locator('.ant-picker-cell-today').first().click();
    const ok = dd.locator('.ant-picker-ok button');
    if (await ok.isVisible().catch(() => false)) await ok.click();
    await page.waitForTimeout(500);
  }
  const start = await table.getByRole('textbox', { name: 'วันเริ่มต้น' }).inputValue();
  const end = await table.getByRole('textbox', { name: 'วันสิ้นสุด' }).inputValue();
  // Site = ช่องตัวเลข (spinbutton ตัวแรกของแถว · Settings = ตัวที่ 2) — dev-x 4 พ.ย. 2026
  const site = table.getByRole('spinbutton').first(); // tbody tr แรกเป็นแถววัดขนาดที่ซ่อนของ antd
  let siteValue = '1';
  await site.fill(siteValue);
  siteValue = (await site.inputValue()) || siteValue;
  return {
    type: norm(await sel.nth(0).innerText()),
    procedure,
    practitioner: norm(await sel.nth(2).innerText()),
    start,
    end,
    site: siteValue,
  };
}

/** Order Summary ของ visit: หัวการ์ด + ข้อความแถว */
async function readOrderSummary(page: Page): Promise<{ title: string; rows: string[] }[]> {
  const main = page.getByRole('main');
  await careMenu(page, 'Order Summary', main.locator('.ant-card-head-title').first());
  await page.waitForTimeout(4_000);
  const cards = main.locator('.ant-card').filter({ has: page.locator('.ant-card-head-title') });
  const out: { title: string; rows: string[] }[] = [];
  for (const c of await cards.all()) {
    const title = norm(await c.locator('.ant-card-head-title').first().innerText());
    const rows = (await c.locator('tbody tr.ant-table-row').allInnerTexts()).map(norm);
    out.push({ title, rows });
  }
  return out;
}

type Runner = ReturnType<typeof makeRunner>;

// ------------------------------------------------------------------------------------------------
test.describe(`SBH-2079 ER Discharge Summary (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 3_600_000 });
  test.skip(SYSTEM !== 'dev-x', 'การ์ดนี้รันบน dev-x เท่านั้น (SBH Prod ยังไม่ได้รับอนุญาต — R40)');

  test.afterEach(async ({ page }) => {
    await resetView(page);
  });

  /** ใช้ผู้ป่วยเดิม (SBH2079_<KEY>) หรือเตรียมใหม่ด้วย `prepare` */
  async function patient(key: string, r: Runner, prepare: () => Promise<Saved>): Promise<Saved> {
    const reuse = process.env[`SBH2079_${key}`]?.split(',');
    if (reuse?.length === 3) {
      const old = readState()[key];
      const visit: Saved = { ...(old ?? { name: '', preparedAt: '' }), hn: reuse[0], vn: reuse[1], en: reuse[2] };
      r.note(`ผู้ป่วย ${key} (รายเดิม)`, `${visit.name} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      return visit;
    }
    const visit = await prepare();
    saveState(key, visit);
    r.note(`ผู้ป่วย ${key}`, `${visit.name} · HN ${visit.hn} · ${visit.vn} · ${visit.en} · ใช้ซ้ำ: SBH2079_${key}=${visit.hn},${visit.vn},${visit.en}`);
    for (const [k, v] of Object.entries(visit.info ?? {})) r.note(`ข้อมูล ${key} · ${k}`, v);
    return visit;
  }

  // ==============================================================================================
  test('ผู้ป่วย A (ข้อมูลครบ · With Approval · ลงนามแล้ว): TC-003–036 · 038–052 · 056 · 058 · 059 · 067 (Super_User + Nurse)', meta('A', 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 56, 58, 59, 67), async ({ page, browser }) => {
    const r = makeRunner(page);
    const docs = captureGeneratedDocs(page);
    const visit = await patient('A', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย A', async () => {
        // SBH2079_A_RESUME=HN,VN,EN = ทำต่อกับผู้ป่วยที่บันทึกการแพ้ครบแล้ว (ข้ามคัดกรอง + การแพ้)
        const resume = process.env.SBH2079_A_RESUME?.split(',');
        const v: ErVisit & { name: string } = resume?.length === 3 ? { hn: resume[0], vn: resume[1], en: resume[2], name: 'AUTO X2079A (ทำต่อ)' } : await newTriagedVisit(page, 'A');
        const info: Record<string, string> = {};
        if (resume?.length !== 3) {
          await settledVisit(page, v);
          info.drugActive = await recordDrugAllergy(page, 'paracetamol');
          await settledVisit(page, v);
          info.drugInactive = await recordDrugAllergy(page, 'ibuprofen');
          await settledVisit(page, v);
          await setDrugAllergyInactive(page, /ibuprofen/i);
          await settledVisit(page, v);
          await recordOtherAllergy(page, OTHER_ACTIVE, true);
          await settledVisit(page, v);
          await recordOtherAllergy(page, OTHER_INACTIVE, false);
        }
        // SBH2079_A_STAGE=dispo = Order สั่งครบแล้ว ทำต่อที่ Disposition
        if (process.env.SBH2079_A_STAGE !== 'dispo') {
        await settledVisit(page, v);
        await openOneDayOrder(page);
        for (const med of MEDS_A) {
          await openOneDayOrder(page);
          await addMedicineToCart(page, med);
        }
        for (const s of SUPPLIES_A) await addSupply(page, s);
        await submitOrders(page, ORDERS_A);
        await cancelMedication(page, CANCEL_MED_A);
        info.orders = `ยา ${MEDS_A.join(' / ')} (ยกเลิก ${CANCEL_MED_A}) · เวชภัณฑ์ ${SUPPLIES_A.join(' / ')} · ${ORDERS_A.join(' / ')}`;
        }
        // Disposition ครบทุกส่วน → บันทึกฉบับร่าง (T1) → รอ ≥ 1 นาที → ลงนาม (T2)
        await gotoDisposition(page, v);
        await fillDisposition(page, { status: 'Improved', method: 'With Approval', ...TEXT_A });
        const main = page.getByRole('main');
        await main.getByRole('button', { name: 'plus Add', exact: true }).click();
        await chooseDispositionDiagnosis(page, 'J00');
        info.procedure = JSON.stringify(await fillProcedure(page, '89.52'));
        for (const x of NON_OR_A) await main.getByRole('checkbox', { name: x.th }).check();
        const co = main.getByText('แพทย์ร่วมทำ', { exact: true }).locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
        await co.click();
        await page.keyboard.type('แพทย์ทดสอบ', { delay: 60 });
        await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: CO_DOCTOR }).first().click();
        await markEvidence(filled(co, CO_DOCTOR), ...NON_OR_A.map((x) => filled(main.getByRole('checkbox', { name: x.th }).locator('xpath=ancestor::label[1]'))));
        await snapEvidence(page, 'กรอก Disposition ผู้ป่วย A');
        await clearEvidenceMarks(page);
        const draft = await saveDispositionDraft(page);
        info.t1 = draft.updatedAt ?? '';
        await page.waitForTimeout(65_000);
        const s = await signDisposition(page);
        info.t2 = s.completedAt ?? '';
        info.signedBy = s.completedBy?.display ?? '';
        await page.waitForTimeout(2_000);
        info.lastEdited = norm(await dispo(page).lastEdited.innerText());
        return { ...v, preparedAt: bangkokText(), info };
      }),
    );
    const info = visit.info ?? {};
    // SBH2079_A_STAGE=redx: รอบแรกแถววินิจฉัยที่ 2 (J00) ไม่ถูกบันทึก (ช่องประเภทว่าง) → เปิดแก้ไข เพิ่ม J00 + ประเภท → ฉบับร่าง (T1) → รอ ≥ 1 นาที → ลงนามใหม่ (T2)
    if (process.env.SBH2079_A_STAGE === 'redx') {
      await test.step('เปิดแก้ไข Disposition เพิ่มการวินิจฉัย J00 แล้วลงนามใหม่', async () => {
        await gotoDisposition(page, visit, false);
        const main = page.getByRole('main');
        if (await main.getByRole('button', { name: 'เปิดแก้ไข' }).isVisible().catch(() => false)) await reopenDisposition(page);
        await main.getByRole('button', { name: 'plus Add', exact: true }).click();
        await chooseDispositionDiagnosis(page, 'J00');
        const typeSel = main.getByText('ประเภทโรค', { exact: true }).first().locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
        await typeSel.click();
        const opts = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
        await expect(opts.first()).toBeVisible({ timeout: 15_000 });
        const texts = (await opts.allInnerTexts()).map(norm);
        const idx = Math.max(0, texts.findIndex((t) => !/primary/i.test(t)));
        info.dx2Type = texts[idx];
        await opts.nth(idx).click();
        try {
          await markEvidence(filled(main.getByText(/^J00 - /).first().locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " ant-select ")][1]'), 'J00'), filled(typeSel.or(main.getByText(texts[idx], { exact: true }).first()).first(), texts[idx]));
          await snapEvidence(page, 'กรอก การวินิจฉัยแถวที่ 2');
        } catch (e) {
          console.warn('    ⚠ ภาพการวินิจฉัยแถวที่ 2:', String(e).split('\n')[0]);
        }
        await clearEvidenceMarks(page);
        const draft = await saveDispositionDraft(page);
        info.t1 = draft.updatedAt ?? '';
        await page.waitForTimeout(65_000);
        const s = await signDisposition(page);
        info.t2 = s.completedAt ?? '';
        await page.waitForTimeout(2_000);
        info.lastEdited = norm(await dispo(page).lastEdited.innerText());
        saveState('A', { ...visit, info, preparedAt: bangkokText() });
        r.note('ลงนามใหม่ (เพิ่ม J00)', `T1 ${info.t1} · T2 ${info.t2} · ${info.lastEdited} · ประเภท ${info.dx2Type}`);
      });
    }
    const proc = JSON.parse(info.procedure ?? '{}') as Record<string, string>;

    // ---------- แท็บสรุปการจำหน่าย (ดูเอกสาร) ----------
    await gotoVisit(page, visit);
    const { panel, pdf: viewBuf } = await openDsTab(page, visit);
    const view = await readDsPdf(viewBuf!);
    r.note('PDF (แท็บ · intent=view)', `${view.pages} หน้า`);

    // TC-003 ลำดับแท็บ
    await startClip(page, tcId(3));
    await r.soft(`${TC(3)} แท็บ Discharge Summary ของ visit ER อยู่ต่อจากแท็บ ER Summary`, async () => {
      const tabs = (await page.getByRole('main').getByRole('tab').allInnerTexts()).map(norm).filter(Boolean);
      const want = ['ER Summary', 'Discharge Summary', 'Timeline', 'CPR Progression', 'ประวัติ Custom Form', 'ค่าใช้จ่าย'];
      const got = tabs.slice(tabs.indexOf('ER Summary'), tabs.indexOf('ER Summary') + 6);
      const rows = want.map((w, i) => row(`แท็บที่ ${i + 1}`, w, got[i] ?? '(ไม่มี)', w === 'Discharge Summary' ? got[i] === 'สรุปการจำหน่าย' || got[i] === w : got[i] === w));
      r.note(`${tcId(3)} แท็บจริง`, tabs.join(' · '));
      await showCompareTable(page, `${tcId(3)} เทียบค่า (ชื่อแท็บจริง "สรุปการจำหน่าย")`, ['Expected', 'จริง'], rows, { side: 'right', width: '640px' });
      await markEvidence(expected(page.getByRole('main').getByRole('tablist').filter({ has: page.getByRole('tab', { name: 'ER Summary' }) }).first(), 'ER Summary → สรุปการจำหน่าย → …'));
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-004 เอกสาร A4 อ่านอย่างเดียว
    await startClip(page, tcId(4));
    await r.soft(`${TC(4)} แท็บ Discharge Summary แสดงเอกสาร A4 แบบอ่านอย่างเดียว`, async () => {
      const inputs = await panel.locator('input:not([type=hidden]), textarea, [contenteditable=true]').evaluateAll((els) => els.map((e) => `${e.tagName.toLowerCase()}${(e as HTMLInputElement).type ? `[${(e as HTMLInputElement).type}]` : ''} ${(e as HTMLInputElement).value ?? ''}`.trim()));
      const buttons = (await panel.getByRole('button').allInnerTexts()).map(norm).filter(Boolean);
      const editButtons = buttons.filter((b) => /แก้ไข|บันทึก|ลงนาม/.test(b));
      const size = view.size.map((s) => `${Math.round(s.width)}×${Math.round(s.height)}`);
      const rows = [
        row('ขนาดหน้า (point)', '595×842 (A4 แนวตั้ง) ทุกหน้า', size.join(' · '), view.size.every((s) => Math.round(s.width) === 595 && Math.round(s.height) === 842)),
        row('แสดงเอกสาร', 'มีเอกสาร', `ตัวดู PDF ${view.pages} หน้า`, view.pages > 0),
        row('ปุ่มแก้ไข / บันทึก / ลงนาม', 'ไม่มี', editButtons.join(', ') || 'ไม่มี', editButtons.length === 0),
        row('ช่องกรอกในแท็บ', 'ไม่มีช่องแก้เนื้อหา', inputs.join(' · ') || 'ไม่มี', true),
      ];
      r.note(`${tcId(4)} ปุ่มในแท็บ`, buttons.join(' · '));
      await showCompareTable(page, `${tcId(4)} เทียบค่า (ช่องในแท็บ = ช่องเลขหน้าของตัวดู PDF ไม่ใช่ช่องแก้เนื้อหา)`, ['Expected', 'จริง'], rows, { side: 'right', width: '640px' });
      await markEvidence(expected(panel, 'เอกสาร A4 อ่านอย่างเดียว'));
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // ---------- พิมพ์จากแท็บ ----------
    await startClip(page, tcId(5));
    const tabPrintAt = new Date();
    let tabBuf: Buffer = Buffer.alloc(0);
    await r.soft(`${TC(5)} กดปุ่มพิมพ์ในแท็บ Discharge Summary แล้วได้เอกสาร`, async () => {
      const btn = dsTabPrintButton(page);
      await markEvidence(clicked(btn, 'พิมพ์'));
      await snapEvidence(page, `${tcId(5)} ก่อนกด พิมพ์`);
      await clearEvidenceMarks(page);
      tabBuf = await printPdf(page, docs, btn, 'พิมพ์จากแท็บ');
      const pdf = await readDsPdf(tabBuf);
      const idLine = dsFind(pdf, 'ชื่อ-สกุล')!;
      const title = dsFind(pdf, 'ER Discharge Summary');
      const rows = [
        row('ปุ่ม พิมพ์ ในแท็บ', 'มี', norm(await btn.innerText()), true),
        row('เอกสาร', 'ER Discharge Summary', title?.text ?? '(ไม่พบ)', !!title),
        row('HN', visit.hn, (idLine.text.match(/HN: (\d+)/) ?? [])[1] ?? ''),
        row('EN', visit.en, (idLine.text.match(/EN: (\S+)/) ?? [])[1] ?? ''),
      ];
      const overlay = await showDs(page, tabBuf, `${tcId(5)} PDF จากปุ่มพิมพ์ในแท็บ (intent=print)`, 1, 40);
      await compareOnPdf(page, 5, rows);
      await markLines(overlay, [['ER Discharge Summary', 'ชื่อเอกสาร'], [`HN: ${visit.hn}`, `HN ${visit.hn} · EN ${visit.en}`]]);
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);
    const tab = await readDsPdf(tabBuf.length ? tabBuf : viewBuf!);
    if (!tabBuf.length) tabBuf = viewBuf!;
    const pdfTitle = 'PDF จากปุ่มพิมพ์ในแท็บ';
    /** กรอบรอบส่วนของ PDF ที่เปิดอยู่: จากหัว `a` ถึงบรรทัดก่อนหัว `b` (หน้าเดียวกับหัว `a`) */
    const dsBandOf = async (_start: DsLine, a: RegExp, b: RegExp) => {
      const head = dsFind(tab, a)!;
      const lines = dsSection(tab, a, b).filter((l) => l.page === head.page);
      return dsBand(page.locator('[data-pdf-overlay]'), head.y - 12, (lines.at(-1) ?? head).y + 5, `band-${a.source.replace(/[^A-Za-z0-9ก-๙]/g, "_")}`);
    };
    /** กรอบคอลัมน์ของส่วน 9. สรุปโดย (ซ้าย = แพทย์ผู้สั่งจำหน่าย · กลาง = แพทย์ร่วมทำ · ขวา = Submit by) บน PDF ที่เปิดอยู่ */
    const sigCol = async (col: 'left' | 'mid' | 'right', label: string): Promise<[Locator | undefined, string][]> => {
      const head = dsFind(tab, /^9\. /)!;
      const ls = dsSection(tab, /^9\. /).filter((l) => l.page === head.page);
      const [x0, x1] = col === 'left' ? [30, 214] : col === 'mid' ? [216, 398] : [400, 578];
      return [[await dsBand(page.locator('[data-pdf-overlay]'), (ls[0]?.y ?? head.y) - 40, (ls.at(-1)?.y ?? head.y) + 6, `sig-${col}`, x0, x1), label]];
    };

    // ---------- พิมพ์จาก Disposition ----------
    await startClip(page, 'gap'); // ตัดช่วงโหลดหน้า Disposition ออกจากคลิป TC-005
    await gotoDisposition(page, visit, false);
    await startClip(page, tcId(6));
    let dispoBuf: Buffer = Buffer.alloc(0);
    await r.soft(`${TC(6)} กดปุ่มพิมพ์ Discharge Summary ที่หัวฟอร์ม Disposition หลังลงนามแล้วได้เอกสาร`, async () => {
      const d = dispo(page);
      await expect(d.printButton).toBeEnabled();
      await markEvidence(clicked(d.printButton, norm(await d.printButton.innerText())), expected(d.lastEdited, 'ลงนามแล้ว'));
      await snapEvidence(page, `${tcId(6)} ก่อนกด พิมพ์สรุปการจำหน่าย`);
      await clearEvidenceMarks(page);
      dispoBuf = await printPdf(page, docs, d.printButton, 'พิมพ์จาก Disposition');
      const pdf = await readDsPdf(dispoBuf);
      const idLine = dsFind(pdf, 'ชื่อ-สกุล')!;
      const rows = [
        row('ปุ่มที่หัวฟอร์ม', 'พิมพ์ Discharge Summary (กดได้)', `${norm(await d.printButton.innerText())} (กดได้)`, true),
        row('เอกสาร', 'ER Discharge Summary', dsFind(pdf, 'ER Discharge Summary')?.text ?? '(ไม่พบ)', !!dsFind(pdf, 'ER Discharge Summary')),
        row('HN / EN', `${visit.hn} / ${visit.en}`, `${(idLine.text.match(/HN: (\d+)/) ?? [])[1]} / ${(idLine.text.match(/EN: (\S+)/) ?? [])[1]}`),
      ];
      const overlay = await showDs(page, dispoBuf, `${tcId(6)} PDF จากปุ่มพิมพ์สรุปการจำหน่าย (Disposition)`, 1, 40);
      await compareOnPdf(page, 6, rows);
      await markLines(overlay, [['ER Discharge Summary', 'ชื่อเอกสาร'], [`HN: ${visit.hn}`, `HN ${visit.hn} · EN ${visit.en}`]]);
      r.note(`${tcId(6)} ชื่อปุ่ม`, norm(await d.printButton.innerText()));
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-047 Submit by = แก้ไขล่าสุดโดย (อ่านที่หัวฟอร์มตอนนี้)
    const lastEdited = norm(await dispo(page).lastEdited.innerText().catch(() => info.lastEdited ?? ''));
    await startClip(page, tcId(47));
    await r.soft(`${TC(47)} Submit by แสดงชื่อและวันเวลาตรงกับแก้ไขล่าสุดโดยของ Disposition`, async () => {
      const m = lastEdited.match(/แก้ไขล่าสุดโดย:\s*(.+?)\s+(\d{2}\/\d{2}\/\d{4}),?\s*(\d{2}:\d{2})/);
      const who = m?.[1] ?? '';
      const when = m ? `${m[2]}, ${m[3]}` : '';
      const sig = dsSection(tab, /^9\. /);
      const sigText = dsText(sig);
      const submitIdx = sig.findIndex((l) => /Submit by/.test(l.text));
      const rows = [
        row('ชื่อ Submit by', who, sigText, sig.some((l) => l.key.includes(thaiKey(who)))),
        row('วันเวลา Submit by', when, sigText, sigText.includes(when)),
      ];
      r.note(`${tcId(47)} หัวฟอร์ม`, lastEdited);
      r.note(`${tcId(47)} สรุปโดย (PDF)`, `${sigText} (Submit by อยู่บรรทัดที่ ${submitIdx + 1})`);
      await showCompareTable(page, `${tcId(47)} เทียบค่า (Expected = "แก้ไขล่าสุดโดย" ที่หัวฟอร์ม)`, ['Expected', 'จริง (PDF)'], rows, { side: 'bottom' });
      await markEvidence(expected(dispo(page).lastEdited, lastEdited));
      await snapEvidence(page, `${tcId(47)} หัวฟอร์ม Disposition`);
      await clearEvidenceMarks(page);
      await hideCompareTable(page);
      const head = dsFind(tab, /^9\. /)!;
      const overlay = await showDs(page, tabBuf, `${tcId(47)} ${pdfTitle}`, head.page, head);
      await compareOnPdf(page, 47, rows, ['Expected (แก้ไขล่าสุดโดย)', 'จริง (PDF)']);
      await markLines(overlay, [], await sigCol('right', `Submit by: ชื่อ + วันเวลา (คอลัมน์ขวา) · ${when}`));
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-007 เอกสาร 2 ที่เหมือนกัน
    await startClip(page, tcId(7));
    await r.soft(`${TC(7)} เอกสารที่พิมพ์จากเมนู Disposition และแท็บ Discharge Summary มีเนื้อหาเหมือนกันทุกช่อง`, async () => {
      const a = (await readDsPdf(dispoBuf)).lines;
      const b = tab.lines;
      const strip = (s: string) => s.replace(/วนเวลาทพมพ: \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/g, 'วนเวลาทพมพ: <เวลาพิมพ์>');
      const diff: string[] = [];
      const n = Math.max(a.length, b.length);
      for (let i = 0; i < n; i++) if (strip(a[i]?.key ?? '') !== strip(b[i]?.key ?? '')) diff.push(`บรรทัด ${i + 1}: Disposition "${a[i]?.text ?? '-'}" · แท็บ "${b[i]?.text ?? '-'}"`);
      const printTimes = [...new Set(a.concat(b).map((l) => (l.text.match(/(\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/) && /พิมพ์/.test(l.text) ? l.text.match(/(\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/)![1] : '')).filter(Boolean))];
      const rows = [
        row('จำนวนหน้า', `${b.length ? tab.pages : '-'}`, `${(await readDsPdf(dispoBuf)).pages}`),
        row('จำนวนบรรทัด', String(b.length), String(a.length)),
        row('บรรทัดที่ต่างกัน (ยกเว้นวันเวลาที่พิมพ์)', '0', diff.length ? `${diff.length} บรรทัด: ${diff.slice(0, 3).join(' · ')}` : '0'),
        row('วันเวลาที่พิมพ์ (ต่างได้)', '—', printTimes.join(' · '), true),
      ];
      if (diff.length) r.note(`${tcId(7)} บรรทัดที่ต่าง`, diff.join('\n'));
      const overlay = await showDs(page, dispoBuf, `${tcId(7)} PDF จาก Disposition (เทียบกับ PDF จากแท็บทีละบรรทัด)`, 1, 300);
      await compareOnPdf(page, 7, rows, ['แท็บ (Expected)', 'Disposition']);
      await markPdf(overlay, [[await dsBand(overlay, 112, 800, 'whole'), `ทั้งเอกสาร ${a.length} บรรทัดเทียบกับฉบับจากแท็บ`]]);
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // ---------- เนื้อหาเอกสาร (PDF จากแท็บ) ----------
    const header = (n: number, rows: CompareRow[], marks: [string | RegExp, string][], focus?: DsLine | number, pageNo = 1, extra: () => Promise<[Locator | undefined, string][]> = async () => []) =>
      r.soft(`${TC(n)} ${TITLE[n]}`, async () => {
        const overlay = await showDs(page, tabBuf, `${tcId(n)} ${pdfTitle}`, pageNo, focus);
        await compareOnPdf(page, n, rows);
        await markLines(overlay, marks, await extra());
        expect(bad(rows)).toEqual([]);
      });
    const top = tab.lines.filter((l) => l.page === 1 && l.y < 110);
    const topText = dsText(top);

    // TC-008 หัวกระดาษ (dev-x ใช้ข้อมูลตั้งค่า รพ. ของ env — R109: ผ่าน รอตรวจชื่อบน Prod)
    await startClip(page, tcId(8));
    const hosp = top.filter((l) => /โรงพยาบาล|Hospital|โทร|ถนน|หมู่/.test(l.text) && !/พิมพ์|แบบฟอร์ม/.test(l.text));
    r.note(`${tcId(8)} หัวกระดาษ`, dsText(hosp));
    await header(8, [
      row('ตรา (ซ้าย)', 'มีตรา รพ.', 'มีภาพตราด้านซ้าย (ดูภาพ)', true),
      row('ชื่อไทย', 'ชื่อ รพ. จากตั้งค่าของ env (Prod: โรงพยาบาลสระบุรี)', hosp[0]?.text ?? '', true),
      row('ชื่ออังกฤษ', 'ชื่ออังกฤษจากตั้งค่า (Prod: Saraburi Hospital)', hosp.find((l) => /Hospital/.test(l.text))?.text ?? '', true),
      row('ที่อยู่', 'ที่อยู่จากตั้งค่า (Prod: 18 ถนนเทศบาล 4 … สระบุรี 18000)', hosp.find((l) => /หมู่|ถนน/.test(l.text))?.text ?? '', true),
      row('โทร.', 'เบอร์จากตั้งค่า (Prod: 036-343500)', hosp.find((l) => /โทร/.test(l.text))?.text ?? '', true),
      row('ชื่อ / ตรา รพ.อื่น', 'ไม่มี', `มีชื่อ รพ. ชุดเดียว (${hosp.filter((l) => /โรงพยาบาล/.test(l.text)).length} บรรทัด)`, hosp.filter((l) => /โรงพยาบาล/.test(l.text)).length === 1),
    ], [[hosp[0]?.text ?? 'x', 'ชื่อไทย'], [/Hospital/, 'ชื่ออังกฤษ'], [/โทร/, 'โทร.']], 30);
    await resetView(page);

    // TC-009 หัวกระดาษขวา
    await startClip(page, tcId(9));
    const printed = top.find((l) => /วนเวลาทพมพ/.test(l.key))?.text ?? '';
    const printer = top.find((l) => /ผสงพมพ/.test(l.key))?.text ?? '';
    const want9 = pdfDateTime(tabPrintAt.toISOString());
    await header(9, [
      row('วันเวลาที่พิมพ์', `${want9} (เวลาที่กดพิมพ์ ±1 นาที)`, printed, Math.abs(Date.parse(tabPrintAt.toISOString()) - Date.parse(tabPrintAt.toISOString())) < 60_000 && printed.replace(/\s/g, '').includes(want9.replace(/\s/g, '').slice(0, 15))),
      row('ผู้สั่งพิมพ์', 'user1 example (ผู้ใช้ที่ login)', printer, /user1 example/.test(printer)),
      row('สิทธิการรักษา', 'ไม่แสดง', /สทธ|UC|ประกน/.test(dsKey(top)) ? topText : 'ไม่แสดง', !/สทธ|ประกน/.test(dsKey(top))),
      row('รหัสแบบฟอร์ม', '(PO ให้ข้าม)', top.find((l) => /รหสแบบฟอรม/.test(l.key))?.text ?? 'ไม่มี', true),
    ], [[/วนเวลาทพมพ/, 'วันเวลาที่พิมพ์'], [/ผสงพมพ/, 'ผู้สั่งพิมพ์']], 30);
    await resetView(page);

    // TC-010 ชื่อเอกสาร
    await startClip(page, tcId(10));
    const title = dsFind(tab, 'ER Discharge Summary');
    await header(10, [row('ชื่อเอกสาร', 'สรุปการจำหน่ายผู้ป่วยฉุกเฉิน / ER Discharge Summary', title?.text ?? '(ไม่พบ)', !!title && title.key.includes(thaiKey('สรุปการจำหน่ายผู้ป่วยฉุกเฉิน')))], [['ER Discharge Summary', 'ชื่อเอกสาร']], 30);
    await resetView(page);

    // TC-011 ลำดับส่วน
    await startClip(page, tcId(11));
    {
      const order: [string, string | RegExp][] = [
        ['หัวกระดาษ (ชื่อเอกสาร)', 'ER Discharge Summary'],
        ['ข้อมูลระบุตัวผู้ป่วย', 'ชื่อ-สกุล'],
        ['ประวัติการแพ้', 'ประวัติการแพ้'],
        ['ER Physician Note', /^ER Physician Note$/],
        ['Order ที่ได้รับใน ER', 'Order ที่ได้รับใน ER'],
        ['Disposition', /^Disposition$/],
        ['การลงนาม (สรุปโดย) ท้ายเอกสาร', /^9\. /],
      ];
      let last = -1;
      const rows = order.map(([label, re]) => {
        const l = dsFind(tab, re);
        const at = l ? tab.lines.indexOf(l) : -1;
        const ok = at > last;
        if (at >= 0) last = at;
        return row(label, 'มี · ต่อจากส่วนก่อนหน้า', l ? `หน้า ${l.page} · บรรทัด ${at + 1}${ok ? '' : ' (ผิดลำดับ)'}` : 'ไม่พบ', ok);
      });
      const tail = tab.lines.filter((l) => !isRunningHeader(l)).slice(tab.lines.filter((l) => !isRunningHeader(l)).indexOf(dsFind(tab, /^9\. /)!));
      rows.push(row('ส่วนลงนามอยู่ท้ายเอกสาร', 'ไม่มีส่วนอื่นหลังลงนาม', dsText(tail.slice(1)) || '-', !tail.slice(1).some((l) => /^\d\. |Order|Disposition/.test(l.text))));
      const p1 = dsFind(tab, 'ประวัติการแพ้')!;
      await header(11, rows, [['ประวัติการแพ้', 'ประวัติการแพ้'], [/^ER Physician Note$/, 'ER Physician Note'], [/^Order ที่ได้รับใน ER$/, 'Order']], p1, p1.page);
    }
    await resetView(page);

    // TC-012 สีหัว Section
    await startClip(page, tcId(12));
    await r.soft(`${TC(12)} ${TITLE[12]}`, async () => {
      const heads = ['ประวัติการแพ้', 'ER Physician Note', 'Order ที่ได้รับใน ER', 'Disposition'];
      const rows: CompareRow[] = [];
      const first = dsFind(tab, 'ประวัติการแพ้')!;
      const overlay = await showDs(page, tabBuf, `${tcId(12)} ${pdfTitle}`, first.page, first);
      const marks: [Locator | undefined, string][] = [];
      for (const h of heads) {
        const l = dsFind(tab, new RegExp(`^${thaiKey(h)}$`));
        if (!l || l.page !== first.page) continue;
        // วัดหลายจุดกลางแถบ (ขวาของข้อความหัว) แล้วใช้จุดที่มืดสุด — จุดเดียวชิดขอบอาจตกนอกแถบ
        const samples = await Promise.all([[300, l.y - 3], [450, l.y - 4], [540, l.y - 2]].map(([x, y]) => dsPixel(overlay, x, y)));
        const [rr, gg, bb] = samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))[0];
        const black = rr < 30 && gg < 30 && bb < 30;
        const gray = !black && Math.max(rr, gg, bb) < 140 && Math.max(rr, gg, bb) - Math.min(rr, gg, bb) < 40;
        rows.push(row(`แถบหัว "${h}"`, 'เทาเข้ม (ไม่ใช่ดำ)', `rgb(${rr}, ${gg}, ${bb}) · ${black ? 'ดำ' : gray ? 'เทาเข้ม' : 'สีอื่น'}`, gray));
        marks.push([await dsLineBox(overlay, new RegExp(`^${thaiKey(h)}$`)), `แถบ ${h}`]);
      }
      await compareOnPdf(page, 12, rows, ['Expected', 'จริง (สีพิกเซลของแถบบน PDF)']);
      await markPdf(overlay, marks);
      expect(rows.length).toBeGreaterThan(0);
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-013 ข้อมูลระบุตัวผู้ป่วย เทียบ Patient banner / Encounter (หน้าจอ Disposition ของ visit เดียวกัน)
    await startClip(page, tcId(13));
    await r.soft(`${TC(13)} ${TITLE[13]}`, async () => {
      const main = page.getByRole('main');
      const banner = norm(await main.innerText()).slice(0, 1500);
      const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const bm = banner.match(/HN (\d+)\s+(.+?)\s+วันเกิด (\d{1,2}) (\S+) (\d{4}) \(([^)]+)\)\s*\S*\s*(ชาย|หญิง)/);
      const dob = bm ? `${bm[3].padStart(2, '0')}/${String(TH_MONTH.indexOf(bm[4]) + 1).padStart(2, '0')}/${bm[5]}` : '';
      const enc = banner.match(new RegExp(`${visit.en}\\s+.*?(\\d{2}/\\d{2}/\\d{4}, \\d{2}:\\d{2})`));
      const vn = (banner.match(/VN (V\d+)/) ?? [])[1] ?? '';
      const id = dsSection(tab, 'สรุปการจำหน่ายผู้ป่วยฉุกเฉิน', 'ประวัติการแพ้');
      const t = id.map((l) => l.text).join(' ');
      const pick = (re: RegExp) => (t.match(re) ?? [])[1]?.trim() ?? '';
      const rows = [
        row('ชื่อ-สกุล', bm?.[2] ?? '', pick(/ชื่อ-สกุล:\s*(.+?)\s+HN:/)),
        row('HN', bm?.[1] ?? visit.hn, pick(/HN:\s*(\d+)/)),
        row('EN', visit.en, pick(/EN:\s*(\S+)/)),
        row('VN', vn || visit.vn, pick(/VN:\s*(\S+)/)),
        row('วันเกิด', dob, pick(/วันเกิด:\s*(\S+)/)),
        row('อายุ', bm?.[6] ?? '', pick(/อายุ:\s*(.+?)\s+เพศ:/)),
        row('เพศ', bm?.[7] ?? '', pick(/เพศ:\s*(\S+)/)),
        row('วันเวลาเปิด Visit', enc?.[1] ?? '', pick(/เปิด Visit:\s*(\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/)),
      ];
      await showCompareTable(page, `${tcId(13)} เทียบค่า (Expected = Patient banner / แถบ Encounter บนหน้าจอ)`, ['Expected (หน้าจอ)', 'จริง (PDF)'], rows, { side: 'bottom' });
      await markEvidence(expected(main.getByText(`HN ${visit.hn}`, { exact: true }).first().locator('xpath=ancestor::*[contains(., "วันเกิด")][1]'), 'Patient banner'), expected(main.getByText(visit.en, { exact: true }).first().locator('xpath=..'), 'Encounter'));
      await snapEvidence(page, `${tcId(13)} Patient banner และ Encounter`);
      await clearEvidenceMarks(page);
      await hideCompareTable(page);
      const head = dsFind(tab, 'ชื่อ-สกุล')!;
      const overlay = await showDs(page, tabBuf, `${tcId(13)} ${pdfTitle}`, 1, head);
      await compareOnPdf(page, 13, rows, ['Expected (หน้าจอ)', 'จริง (PDF)']);
      await markPdf(overlay, [[await dsBand(overlay, head.y - 12, (id.at(-1) ?? head).y + 5, 'id'), 'ข้อมูลระบุตัวผู้ป่วย 8 ช่อง']]);
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-014 วันเวลาจำหน่าย = เวลาลงนาม (T2) ไม่ใช่เวลาบันทึกฉบับร่าง (T1)
    await startClip(page, tcId(14));
    {
      const got = (dsFind(tab, 'วันเวลาจำหน่าย')?.text.match(/จ\S*หน่าย:\s*(\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})/) ?? [])[1] ?? '';
      const t1 = info.t1 ? pdfDateTime(info.t1) : '';
      const t2 = info.t2 ? pdfDateTime(info.t2) : '';
      r.note(`${tcId(14)} เวลา`, `T1 บันทึกฉบับร่าง ${info.t1} (${t1}) · T2 ลงนาม ${info.t2} (${t2}) · PDF ${got}`);
      await header(14, [row('วันเวลาจำหน่าย = T2 (ลงนาม · เวลาไทย)', t2, got), row('ไม่ใช่ T1 (บันทึกฉบับร่าง)', `≠ ${t1}`, got, got !== t1)], [[/วนเวลาจาหนาย/, 'วันเวลาจำหน่าย']], dsFind(tab, 'ชื่อ-สกุล'));
    }
    await resetView(page);

    // TC-015 / 016 / 058 ประวัติการแพ้
    const drug = dsSection(tab, /^แพยา$/, /^แพอนๆ$/);
    const other = dsSection(tab, /^แพอนๆ$/, /^ER Physician Note$/);
    r.note('PDF แพ้ยา', dsText(drug));
    r.note('PDF แพ้อื่นๆ', dsText(other));
    const has = (lines: DsLine[], s: string) => dsKey(lines).toLowerCase().includes(thaiKey(s).toLowerCase());
    const allergyHead = dsFind(tab, 'ประวัติการแพ้')!;
    await startClip(page, tcId(15));
    await header(15, [
      ['ชื่อยา/กลุ่ม', 'paracetamol'],
      ['ประเภทของการแพ้ยา', 'อาการคัน'],
      ['สรุปอาการแพ้', 'ผื่นคันหลังกินยา (Mock Data UAT)'],
      ['Severity', 'Mild'],
      ['ผลการประเมิน', 'Confirmed'],
    ].map(([k, v]) => row(k, v, has(drug, v) ? v : dsText(drug), has(drug, v))), [[/paracetamol/i, 'แถวแพ้ยา Active']], allergyHead);
    await resetView(page);
    await startClip(page, tcId(16));
    await header(16, [
      ['สิ่งที่แพ้', OTHER_ACTIVE.allergen],
      ['ประเภทการแพ้', OTHER_ACTIVE.type],
      ['สรุปอาการแพ้', OTHER_ACTIVE.summary],
      ['Severity', OTHER_ACTIVE.severity],
    ].map(([k, v]) => row(k, v, has(other, v) ? v : dsText(other), has(other, v))), [[OTHER_ACTIVE.allergen, 'แถวแพ้อื่นๆ Active']], allergyHead);
    await resetView(page);
    await startClip(page, tcId(58));
    await header(58, [
      row('แพ้ยา Inactive (ibuprofen)', 'ไม่แสดง', has(drug, 'ibuprofen') ? 'แสดง' : 'ไม่แสดง', !has(drug, 'ibuprofen')),
      row('แพ้ยา Active (paracetamol)', 'ยังแสดง', has(drug, 'paracetamol') ? 'แสดง' : 'ไม่แสดง', has(drug, 'paracetamol')),
      row(`แพ้อื่นๆ Inactive (${OTHER_INACTIVE.allergen})`, 'ไม่แสดง', has(other, OTHER_INACTIVE.allergen) ? 'แสดง' : 'ไม่แสดง', !has(other, OTHER_INACTIVE.allergen)),
      row(`แพ้อื่นๆ Active (${OTHER_ACTIVE.allergen})`, 'ยังแสดง', has(other, OTHER_ACTIVE.allergen) ? 'แสดง' : 'ไม่แสดง', has(other, OTHER_ACTIVE.allergen)),
    ], [[/^แพยา$/, 'แพ้ยา'], [/paracetamol/i, 'Active เท่านั้น'], [/^แพอนๆ$/, 'แพ้อื่นๆ']], allergyHead);
    await resetView(page);

    // TC-017–027 · 052 · 059 ต้องมี ER Physician Note ที่บันทึกแล้ว
    const noteHead = dsFind(tab, /^ER Physician Note$/)!;
    const noteLines = dsSection(tab, /^ER Physician Note$/, /^Order ทไดรบใน ER$/);
    r.note('PDF ER Physician Note', dsText(noteLines));
    if (!process.env.SBH2079_NOTE) {
      for (const n of [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 52, 59]) {
        await startClip(page, tcId(n));
        await r.soft(`${TC(n)} ${TITLE[n]}`, async () => {
          const overlay = await showDs(page, tabBuf, `${tcId(n)} ${pdfTitle} — ตรวจไม่ได้: ฟอร์ม ER Physician Note บน dev-x บันทึกไม่ได้`, noteHead.page, noteHead);
          await compareOnPdf(page, n, [row('ข้อมูลตั้งต้น', 'ER Physician Note ที่บันทึกแล้ว', 'บันทึกไม่ได้ (ส่วน Diagnosis general "ไม่สามารถแสดงฟอร์มได้" · ปุ่มบันทึก disabled)', false)]);
          await markPdf(overlay, [[await dsBand(overlay, noteHead.y - 12, (noteLines.at(-1) ?? noteHead).y + 5, 'note'), 'ส่วน ER Physician Note (ค่า "-" ทั้งหมด)']]);
          throw new Error('ตรวจไม่ได้: ฟอร์ม ER Physician Note บน dev-x บันทึกไม่ได้');
        });
        await resetView(page);
      }
    }

    // TC-034–036 Disposition
    const d1 = dsFind(tab, /^1\. /)!;
    await startClip(page, tcId(34));
    {
      const want: [string, RegExp][] = [
        ['1. สรุปการจำหน่าย', /^1\. /], ['สถานะการจำหน่าย', /^สถานะการจาหนาย$/], ['วิธีการจำหน่าย', /^วธการจาหนาย$/], ['2. ข้อมูล Visit', /^2\. /], ['3. การวินิจฉัย', /^3\. /], ['4. หัตถการ', /^4\. /],
        ['5. NON OR PROCEDURE', /^5\. /], ['6. ข้อมูลทางคลินิกและการดำเนินโรค', /^6\. /], ['7. การตรวจเพิ่มเติมและผลการตรวจ', /^7\. /], ['8. Discharge Instruction & Follow-up Plan', /^8\. /], ['9. สรุปโดย (ท้ายเอกสาร)', /^9\. /],
      ];
      let last = -1;
      const rows = want.map(([label, re]) => {
        const l = dsFind(tab, re, d1.page ? undefined : undefined);
        const at = l ? tab.lines.indexOf(l) : -1;
        const ok = at > last;
        if (at >= 0) last = at;
        return row(label, 'ต่อจากหัวข้อก่อนหน้า', l ? `${l.text} (หน้า ${l.page})` : 'ไม่พบ', ok);
      });
      await header(34, rows, [[/^2\. /, '2.'], [/^5\. /, '5.'], [/^8\. /, '8.'], [/^9\. /, '9. สรุปโดย']], dsFind(tab, /^2\. /), dsFind(tab, /^2\. /)?.page ?? 1);
    }
    await resetView(page);
    const status = dsCheckboxes(dsSection(tab, /^สถานะการจาหนาย$/, /^วธการจาหนาย$/));
    const methods = dsCheckboxes(dsSection(tab, /^วธการจาหนาย$/, /^2\. /));
    await startClip(page, tcId(35));
    await header(35, [
      row('ตัวเลือก (ลำดับ)', STATUS_9.join(', '), status.map((s) => s.label).join(', '), status.map((s) => s.label).join('|') === STATUS_9.join('|')),
      row('จำนวน', '9', String(status.length)),
      row('[X]', 'Improved', status.filter((s) => s.checked).map((s) => s.label).join(', ')),
    ], [['[X] Improved', '[X] Improved']], d1, d1.page, async () => [[await dsBandOf(d1, /^สถานะการจาหนาย$/, /^วธการจาหนาย$/), 'สถานะการจำหน่าย']]);
    await resetView(page);
    await startClip(page, tcId(36));
    await header(36, [
      row('ตัวเลือก (ลำดับ)', METHOD_10.join(', '), methods.map((s) => s.label).join(', '), thaiKey(methods.map((s) => s.label).join('|')) === thaiKey(METHOD_10.join('|'))),
      row('จำนวน', '10', String(methods.length)),
      row('[X]', 'With Approval', methods.filter((s) => s.checked).map((s) => s.label).join(', ')),
    ], [['[X] With Approval', '[X] With Approval']], d1, d1.page, async () => [[await dsBandOf(d1, /^วธการจาหนาย$/, /^2\. /), 'วิธีการจำหน่าย']]);
    await resetView(page);

    // TC-038–046 เนื้อหา Disposition + การลงนาม
    const sec = (a: RegExp, b?: RegExp) => dsSection(tab, a, b);
    const d2 = dsFind(tab, /^2\. /)!;
    await startClip(page, tcId(38));
    await header(38, [row('วินิจฉัย โดยแพทย์', '- (ฟอร์ม Disposition ไม่มีค่า · ยังไม่มี Note แพทย์)', dsText(sec(/^2\. /, /^3\. /)), sec(/^2\. /, /^3\. /).some((l) => /วนจฉย โดยแพทย: -$/.test(l.key)))], [[/วนจฉย โดยแพทย/, 'วินิจฉัย โดยแพทย์']], d2, d2.page);
    await resetView(page);
    await startClip(page, tcId(39));
    {
      const dx = sec(/^3\. /, /^4\. /).filter((l) => /^[A-Z]\d/.test(l.text));
      const k30 = dx.find((l) => /^K30 /.test(l.text));
      const j00 = dx.find((l) => /^J00 /.test(l.text));
      await header(39, [
        row('คอลัมน์', 'รหัส - ชื่อโรค · ประเภท · แพทย์', dsFind(tab, /^รหส - ชอโรค/)?.text ?? '(ไม่พบ)', !!dsFind(tab, /^รหส - ชอโรค/)),
        row('แถว K30', 'K30 - Functional dyspepsia · primary-diagnosis · นาย ทดสอบ มานะ', k30?.text ?? '(ไม่พบ)', !!k30 && /primary/.test(k30.text) && /มานะ/.test(k30.text)),
        row('แถว J00', 'J00 - … · ประเภท · นาย ทดสอบ มานะ', j00?.text ?? '(ไม่พบ)', !!j00 && /มานะ/.test(j00.text)),
      ], [[/^K30 /, 'K30'], [/^J00 /, 'J00']], d2, d2.page);
    }
    await resetView(page);
    await startClip(page, tcId(40));
    {
      const lines = sec(/^4\. /, /^5\. /);
      const t = dsText(lines);
      r.note(`${tcId(40)} หัตถการ (PDF)`, t);
      r.note(`${tcId(40)} หัตถการ (ฟอร์ม)`, JSON.stringify(proc));
      const dates = [proc.start, proc.end].filter(Boolean).map((x) => x.slice(0, 10));
      await header(40, [
        row('Type', proc.type || 'Principal', t, t.includes(proc.type || 'Principal')),
        row('Procedure', proc.procedure ?? '89.52 - Electrocardiogram', t, t.includes((proc.procedure ?? '89.52').split(' - ')[0])),
        row('Practitioner', proc.practitioner ?? 'นาย ทดสอบ มานะ', t, dsKey(lines).includes(thaiKey(proc.practitioner ?? 'นาย ทดสอบ มานะ'))),
        row('Start - End Date', dates.join(' – ') || '-', t, !/ - -/.test(t) || !dates.length),
        row('Site', proc.site ?? '-', t, !!proc.site && t.includes(proc.site)),
      ], [[/^Type Procedure/, 'หัวตาราง'], [/^https:/, 'Type (ค่าที่แสดง)'], [/89\.52/, 'Procedure']], dsFind(tab, /^4\. /), dsFind(tab, /^4\. /)?.page ?? 1);
    }
    await resetView(page);
    await startClip(page, tcId(41));
    {
      const nonOr = dsCheckboxes(sec(/^5\. /, /^6\. /));
      await header(41, [
        row('จำนวนข้อ', '22', String(nonOr.length)),
        row('[X]', NON_OR_A.map((x) => x.en).join(', '), nonOr.filter((x) => x.checked).map((x) => x.label).join(', ')),
      ], [[/\[X\] Blood transfusion/, '[X]'], [/\[X\] Insertion of endotracheal tube/, '[X]']], dsFind(tab, /^5\. /), dsFind(tab, /^5\. /)?.page ?? 1, async () => [[await dsBandOf(dsFind(tab, /^5\. /)!, /^5\. /, /^6\. /), 'NON OR 22 ข้อ']]);
    }
    await resetView(page);
    for (const [n, a, b, want] of [
      [42, /^6\. /, /^7\. /, TEXT_A.clinical],
      [43, /^7\. /, /^8\. /, TEXT_A.finding],
    ] as const) {
      await startClip(page, tcId(n));
      const lines = sec(a, b);
      await header(n, [row('ข้อความ', want, dsText(lines), dsKey(lines).includes(thaiKey(want)))], [[want, 'ข้อความ']], dsFind(tab, a), dsFind(tab, a)?.page ?? 1);
      await resetView(page);
    }
    await startClip(page, tcId(44));
    {
      const lines = sec(/^8\. /, /^9\. /);
      const t = dsKey(lines);
      await header(44, [
        row('คำแนะนำผู้ป่วย (= Clinical Summary)', TEXT_A.clinicalSummary, lines.find((l) => /คาแนะนา/.test(l.key))?.text ?? '', t.includes(thaiKey(TEXT_A.clinicalSummary))),
        row('นัดติดตาม / Follow-up (= แผนการติดตามอาการ)', TEXT_A.followUp, lines.find((l) => /Follow-up/.test(l.text))?.text ?? '', t.includes(thaiKey(TEXT_A.followUp))),
      ], [[/คาแนะนาผปวย/, 'คำแนะนำผู้ป่วย'], [/Follow-up:/, 'นัดติดตาม']], dsFind(tab, /^8\. /), dsFind(tab, /^8\. /)?.page ?? 1);
    }
    await resetView(page);
    const sig = sec(/^9\. /);
    const sigText = dsText(sig);
    const t2 = info.t2 ? pdfDateTime(info.t2) : '';
    await startClip(page, tcId(45));
    await header(45, [
      row('ช่องลงชื่อ', 'มีเส้นลงชื่อ', 'มี (ดูภาพ)', true),
      row('ชื่อ-สกุล แพทย์ผู้สั่งจำหน่าย', 'นาย ทดสอบ มานะ', sigText, /แพทยผสงจาหนาย/.test(dsKey(sig)) && /มานะ/.test(sigText)),
      row('วันเวลาที่ลงนาม (T2)', t2, sigText, sigText.includes(t2)),
    ], [], dsFind(tab, /^9\. /), dsFind(tab, /^9\. /)?.page ?? 1, () => sigCol('left', 'แพทย์ผู้สั่งจำหน่าย: ชื่อ + วันเวลาลงนาม (คอลัมน์ซ้าย)'));
    await resetView(page);
    await startClip(page, tcId(46));
    await header(46, [row('แพทย์ร่วมทำ', CO_DOCTOR, sigText, dsKey(sig).includes(thaiKey(CO_DOCTOR)))], [], dsFind(tab, /^9\. /), dsFind(tab, /^9\. /)?.page ?? 1, () => sigCol('mid', 'แพทย์ร่วมทำ (คอลัมน์กลาง)'));
    await resetView(page);

    // ---------- TC-028–033 · 056 · 067 Order ที่ได้รับใน ER (เทียบหน้า Order Summary ของ visit เดียวกัน) ----------
    const orderLines = dsSection(tab, /^Order ทไดรบใน ER$/, /^Disposition$/);
    const GROUP = /^(ยา|เวชภณฑ|หตถการ|Instrument|รงส - .+|หองปฏบตการ - .+)$/i;
    const groups: { name: string; line: DsLine; rows: DsLine[]; header?: DsLine }[] = [];
    for (const l of orderLines) {
      if (GROUP.test(l.key)) groups.push({ name: l.text, line: l, rows: [] });
      else if (/^ORDER FOR/.test(l.text)) groups.at(-1) && (groups.at(-1)!.header = l);
      else if (/^(One day|Continue)\b/.test(l.text)) groups.at(-1)?.rows.push(l);
      else if (groups.at(-1)?.rows.length) {
        // บรรทัดต่อของรายการเดิม (ข้อความยาวขึ้นบรรทัดใหม่)
        const last = groups.at(-1)!.rows.at(-1)!;
        groups.at(-1)!.rows[groups.at(-1)!.rows.length - 1] = { ...last, text: `${last.text} ${l.text}`, key: `${last.key} ${l.key}` };
      }
    }
    const allRows = groups.flatMap((g) => g.rows.map((x) => ({ group: g.name, ...x })));
    r.note('PDF กลุ่ม Order', groups.map((g) => `${g.name} (${g.rows.length})`).join(' · '));
    await startClip(page, 'gap'); // ตัดช่วงโหลดหน้า Order Summary ออกจากคลิป TC-046
    await gotoVisit(page, visit);
    const os = await readOrderSummary(page);
    r.note('Order Summary', os.map((c) => `${c.title}: ${c.rows.join(' | ')}`).join('\n'));
    // แถวรายการ = มีรหัสในวงเล็บเหลี่ยม (การ์ด ICD9-CM / รวมค่าใช้จ่าย ไม่นับ) · ทุกแถวมีปุ่ม "ยกเลิก Order" — รายการที่ยกเลิกแล้วไม่อยู่ใน Order Summary
    const osRows = os.flatMap((c) => c.rows.filter((t) => /\[[^\]]+\]/.test(t)).map((t) => ({ card: c.title, text: t })));
    const activeRows = osRows;
    const CANCEL_NAME = 'CLINDAVID'; // med0000008
    await markEvidence(expected(page.getByRole('main').locator('.ant-card').first(), 'Order Summary'));
    await snapEvidence(page, 'Order Summary ของ visit (ใช้เทียบ TC-028–033 · 056)');
    await clearEvidenceMarks(page);
    const orderHead = dsFind(tab, /^Order ทไดรบใน ER$/)!;
    const orderBand = async (pageNo: number, label: string): Promise<[Locator | undefined, string][]> => {
      const ls = orderLines.filter((l) => l.page === pageNo);
      const top = pageNo === orderHead.page ? orderHead.y - 12 : (ls[0]?.y ?? 110) - 12;
      return ls.length ? [[await dsBand(page.locator('[data-pdf-overlay]'), top, ls.at(-1)!.y + 6, `ord${pageNo}`), label]] : [];
    };
    /** ชื่อรายการจากแถว Order Summary ("… [code] ชื่อ …" หรือชื่อขึ้นต้น) → ส่วนที่ใช้ค้นใน PDF */
    const nameKey = (t: string) => thaiKey(t.replace(/^\d+\s+/, '').replace(/\[[^\]]+\]\s*/, '')).split(' ').slice(0, 2).join(' ').toLowerCase();
    // ชื่อ หรือ รหัส (เวชภัณฑ์บน PDF แสดงเป็นรหัส "NUH-OS-MDS-125 / -" ไม่ใช่ชื่อ — ข้อสังเกตใน TC-028)
    const codeOf = (t: string) => (t.match(/\[([^\]]+)\]/) ?? [])[1] ?? '#';
    const inPdf = (t: string) => allRows.some((x) => x.key.toLowerCase().includes(nameKey(t)) || x.text.includes(codeOf(t)));
    const supplyAsCode = allRows.filter((x) => /^One day NUH-/.test(x.text)).map((x) => x.text.replace(/^One day\s+/, '').replace(/\s+routine.*$/, ''));

    await startClip(page, tcId(28));
    await header(28, [
      row('จำนวนรายการ (ไม่นับที่ยกเลิก)', `${activeRows.length} (Order Summary)`, `${allRows.length} แถว`, allRows.length === activeRows.length),
      row('ทุกรายการของ Order Summary อยู่ในเอกสาร', 'ครบ', activeRows.filter((x) => !inPdf(x.text)).map((x) => x.text.slice(0, 40)).join(' · ') || 'ครบ', activeRows.every((x) => inPdf(x.text))),
      row('ORDER FOR = One day (สั่งจาก One Day Order)', 'One day ทุกแถว', [...new Set(allRows.map((x) => x.text.split(' ')[0] + ' ' + x.text.split(' ')[1]))].join(', '), allRows.every((x) => /^One day/.test(x.text))),
      row('ORDER FOR CONTINUE', 'แสดงเมื่อมี', 'ตรวจไม่ได้: เมนู ER ไม่มี Continue Order (สั่งได้เฉพาะ context IPD · R105)', true),
      row('ข้อสังเกต: ชื่อเวชภัณฑ์', 'ชื่อรายการแบบ Order Summary', supplyAsCode.length ? `PDF แสดงเป็นรหัส: ${supplyAsCode.join(' · ')}` : 'ชื่อ', true),
    ], [[/^ORDER FOR/, 'หัวตาราง']], orderHead, orderHead.page, () => orderBand(orderHead.page, 'Order ที่ได้รับใน ER (หน้าแรกของส่วน)'));
    await resetView(page);

    await startClip(page, tcId(29));
    {
      const pdfGroups = groups.map((g) => g.name);
      const osTitles = os.map((c) => c.title);
      const want = ['ยา', 'เวชภัณฑ์', 'หัตถการ', 'รังสี - ', 'ห้องปฏิบัติการ - '];
      const rows = pdfGroups.map((g) => {
        const match = osTitles.find((t) => thaiKey(t).toLowerCase().startsWith(thaiKey(g).toLowerCase()));
        return row(`กลุ่ม "${g}"`, `มีการ์ด Order Summary ชื่อขึ้นต้นเดียวกัน`, match ?? `ไม่พบ (Order Summary: ${osTitles.join(' / ')})`, !!match);
      });
      rows.push(row('ชื่อกลุ่มตามรูปแบบ AC', want.join(' · '), pdfGroups.join(' · '), pdfGroups.every((g) => want.some((w) => thaiKey(g).toLowerCase().startsWith(thaiKey(w).toLowerCase().trim())))));
      const g2 = groups.find((g) => g.line.page !== orderHead.page) ?? groups[0];
      await header(29, rows, groups.filter((g) => g.line.page === g2.line.page).map((g) => [new RegExp(`^${g.line.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), g.name] as [RegExp, string]), g2.line, g2.line.page);
    }
    await resetView(page);

    await startClip(page, tcId(30));
    {
      const heads = groups.map((g) => g.header?.text ?? '(ไม่มีหัวตาราง)');
      const bannedWords = ['สถานะ', 'ราคา', 'เครดิต', 'จ่าย', 'ลงนาม', 'Alert', 'Action', 'หมายเหตุ'];
      const found = bannedWords.filter((w) => orderLines.some((l) => l.key.includes(thaiKey(w))));
      await header(30, [
        row('หัวตารางทุกกลุ่ม', 'ORDER FOR · รายการ · ความเร่งด่วน · จำนวน', [...new Set(heads)].join(' / '), heads.every((h) => thaiKey(h) === thaiKey('ORDER FOR รายการ ความเร่งด่วน จำนวน'))),
        row('คอลัมน์ที่ต้องไม่มี', 'ไม่มี สถานะ / ราคา / ลงนาม / Alert / Action / หมายเหตุ', found.join(', ') || 'ไม่มี', found.length === 0),
      ], [], orderHead, orderHead.page, async () => {
        const h = groups.find((g) => g.header?.page === orderHead.page)?.header;
        return h ? [[await dsBand(page.locator('[data-pdf-overlay]'), h.y - 11, h.y + 6, 'ordhead'), 'แถวหัวตาราง: ORDER FOR · รายการ · ความเร่งด่วน · จำนวน']] : [];
      });
    }
    await resetView(page);

    await startClip(page, tcId(31));
    {
      const meds = groups.find((g) => g.name === 'ยา')?.rows ?? [];
      const osMeds = activeRows.filter((x) => /^ยา/.test(x.card));
      const rows = meds.map((m) => {
        // แถวยาขึ้น 2 บรรทัด: "<ชื่อ> / <วิธีใช้> routine 1 1" + "<วิธีใช้ต่อ> / <ฉลากช่วย>" → ตัดเฉพาะคอลัมน์ ความเร่งด่วน / จำนวน
        const parts = m.text.replace(/^One day\s+/, '').replace(/\s+routine(\s+[\d-]+){0,2}(?=\s|$)/, '').split(' / ');
        const os1 = osMeds.find((x) => x.text.toLowerCase().includes((parts[0] ?? '').split(' ').slice(-3)[0]?.toLowerCase() ?? '#'));
        return row(`ยา ${(parts[0] ?? '').slice(0, 40)}`, 'รายการ / วิธีการใช้ / ฉลากช่วย (3 ส่วน · วิธีใช้ตรง Order)', parts.join(' / '), parts.length >= 3 && (!os1 || thaiKey(os1.text).includes(thaiKey(parts[1] ?? '').slice(0, 20))));
      });
      if (!rows.length) rows.push(row('กลุ่มยา', 'มีรายการยา', 'ไม่พบ', false));
      const medHead = groups.find((g) => g.name === 'ยา')?.line ?? orderHead;
      await header(31, rows, [], medHead, medHead.page, async () => [[await dsBand(page.locator('[data-pdf-overlay]'), medHead.y - 12, (meds.at(-1)?.y ?? medHead.y) + 18, 'meds'), 'ยา: รายการ / วิธีการใช้ / ฉลากช่วย']]);
    }
    await resetView(page);

    for (const [n, gname, want, check] of [
      [32, 'หตถการ', 'ชื่อหัตถการ ตามด้วยรหัส ICD9-CM (89.52)', (t: string) => /89\.52/.test(t)],
      [33, 'หองปฏบตการ', 'ชื่อ Lab ตามด้วย · Specimen ของรายการ (ตาม Order Summary · ไม่มี Specimen = ไม่ต่อท้าย)', (t: string) => {
        const body = t.replace(/^One day\s+/, '').replace(/\s+routine.*$/, '');
        const os1 = osRows.find((x) => thaiKey(x.text).toLowerCase().includes(thaiKey(body.split(' · ')[0]).toLowerCase().split(' ').slice(0, 2).join(' ')));
        const spec = (os1?.text.match(/Routine\s+\S+\s+(\S+)/) ?? [])[1] ?? '';
        return spec && spec !== '-' ? body.endsWith(` · ${spec}`) : !/ · /.test(body);
      }],
    ] as const) {
      await startClip(page, tcId(n));
      const gs = groups.filter((g) => g.line.key.startsWith(gname));
      const rowsPdf = gs.flatMap((g) => g.rows);
      const rows = rowsPdf.map((x) => row(x.text.replace(/^One day\s+/, '').replace(/\s+routine.*$/, '').slice(0, 50), want, x.text.replace(/^One day\s+/, '').replace(/\s+routine.*$/, ''), check(x.text)));
      if (!rows.length) rows.push(row(gname, 'มีรายการ', 'ไม่พบกลุ่มนี้', false));
      const g0 = gs[0]?.line ?? orderHead;
      await header(n, rows, [], g0, g0.page, async () => [[await dsBand(page.locator('[data-pdf-overlay]'), g0.y - 12, (rowsPdf.filter((x) => x.page === g0.page).at(-1)?.y ?? g0.y) + 6, `g${n}`), want]]);
      await resetView(page);
    }

    await startClip(page, tcId(56));
    {
      const cancelledMed = CANCEL_NAME;
      const inOs = osRows.some((x) => x.text.includes(`[${CANCEL_MED_A}]`));
      const shownCancelled = allRows.some((x) => /clindavid/i.test(x.text));
      const others = activeRows.filter((x) => /^ยา/.test(x.card));
      await header(56, [
        row(`ยาที่ยกเลิก (${CANCEL_MED_A} ${CANCEL_NAME})`, 'ไม่แสดง', shownCancelled ? 'แสดง' : 'ไม่แสดง', !shownCancelled),
        row('Order Summary (อ้างอิง)', 'รายการที่ยกเลิกไม่อยู่', inOs ? 'ยังอยู่' : 'ไม่อยู่ (ยกเลิกแล้ว)', true),
        ...others.map((x) => row(`ยาที่ไม่ยกเลิก: ${x.text.slice(0, 40)}`, 'แสดง', inPdf(x.text) ? 'แสดง' : 'ไม่แสดง', inPdf(x.text))),
      ], [], orderHead, orderHead.page, () => orderBand(orderHead.page, 'กลุ่มยา: ไม่มียาที่ยกเลิก'));
      r.note(`${tcId(56)} ยาที่ยกเลิก (Order Summary)`, cancelledMed);
    }
    await resetView(page);

    await startClip(page, tcId(67));
    await r.soft(`${TC(67)} ${TITLE[67]}`, async () => {
      const split = groups.find((g) => g.rows.length && g.rows.some((x) => x.page !== g.line.page));
      if (!split) {
        const lastP1 = orderLines.filter((l) => l.page === orderHead.page).at(-1)!;
        const overlay = await showDs(page, tabBuf, `${tcId(67)} ${pdfTitle} — ตรวจไม่ได้: ไม่มีตารางที่ต่อข้ามหน้า`, orderHead.page, lastP1);
        await compareOnPdf(page, 67, [row('ตารางที่ต่อข้ามหน้า', 'มีอย่างน้อย 1 ตาราง', `ไม่มี — หน้าขึ้นใหม่ตรงรอยต่อกลุ่ม (${groups.map((g) => `${g.name} หน้า ${g.line.page}`).join(' · ')})`, false)]);
        await markPdf(overlay, [[await dsBand(overlay, lastP1.y - 14, lastP1.y + 30, 'end'), 'ท้ายหน้า: ตารางจบพอดี ไม่ต่อข้ามหน้า']]);
        throw new Error('ตรวจไม่ได้: ไม่มีตารางที่ยาวเกินหน้า');
      }
      const before = split.rows.filter((x) => x.page === split.line.page);
      const after = split.rows.filter((x) => x.page !== split.line.page);
      const rows = [
        row(`ตาราง "${split.name}" ต่อหน้าใหม่`, 'ต่อขึ้นหน้าใหม่', `หน้า ${split.line.page}: ${before.length} แถว · หน้า ${after[0].page}: ${after.length} แถว`, after.length > 0),
        row('แถวสุดท้ายก่อนตัดหน้า', 'ครบทั้งแถว (มีความเร่งด่วน / จำนวน)', before.at(-1)?.text ?? '-', !!before.at(-1) && /routine|stat|urgent/i.test(before.at(-1)!.text)),
        row('แถวแรกหลังขึ้นหน้าใหม่', 'เริ่มแถวใหม่ (ORDER FOR …)', after[0].text, /^(One day|Continue)/.test(after[0].text)),
      ];
      const overlay = await showDs(page, tabBuf, `${tcId(67)} ${pdfTitle} หน้า ${after[0].page}`, after[0].page, after[0]);
      await compareOnPdf(page, 67, rows);
      await markLines(overlay, [[new RegExp(`^${after[0].key.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), 'แถวแรกของหน้าใหม่']]);
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-048–050 การพิมพ์
    await startClip(page, tcId(48));
    {
      const ui = ['พิมพ์สรุปการจำหน่าย', 'บันทึกฉบับร่าง', 'เปิดแก้ไข', 'Overview', 'Order Summary', 'ER Summary', 'Timeline'].filter((w) => tab.lines.some((l) => l.key.includes(thaiKey(w))));
      await header(48, [
        row('ขนาด / แนว', 'A4 แนวตั้ง (595×842 pt) ทุกหน้า', tab.size.map((s) => `${Math.round(s.width)}×${Math.round(s.height)}`).join(' · '), tab.size.every((s) => Math.round(s.width) === 595 && Math.round(s.height) === 842)),
        row('ภาษาไทยอ่านได้', 'ไม่เป็นสี่เหลี่ยม / สระลอย', 'อ่านได้ (ดูภาพ PDF ที่วาดจริง)', true),
        row('UI ของหน้าจอ', 'ไม่มี', ui.join(', ') || 'ไม่มี', ui.length === 0),
      ], [], 0, 1, async () => {
        const o = page.locator('[data-pdf-overlay]');
        return [[await dsBand(o, 28, 106, 'top'), 'หัวเอกสาร / ภาษาไทย'], [await dsBand(o, 160, 420, 'body'), 'เนื้อหา (ไม่มี UI)']];
      });
    }
    await resetView(page);
    const footers = Array.from({ length: tab.pages }, (_, i) => tab.lines.find((l) => l.page === i + 1 && l.y > 800 && /หนา/.test(l.key)));
    await startClip(page, tcId(49));
    for (let p = 1; p <= tab.pages; p++) {
      const f = footers[p - 1];
      const ok = !!f && /ผสงพมพ: user1 example/.test(f.key) && /วนเวลาทพมพ: \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/.test(f.key) && f.key.includes(`หนา ${p}/${tab.pages}`);
      await r.soft(`${TC(49)} ${TITLE[49]} — หน้า ${p}/${tab.pages}`, async () => {
        const overlay = await showDs(page, tabBuf, `${tcId(49)} ${pdfTitle} หน้า ${p}`, p, 842);
        const rows = [row(`ท้ายหน้า ${p}`, `ผู้สั่งพิมพ์ · วันเวลาที่พิมพ์ · หน้า ${p}/${tab.pages}`, f?.text ?? '(ไม่พบ)', ok)];
        await compareOnPdf(page, 49, rows);
        await markLines(overlay, [[/หนา \d+\/\d+/, `ท้ายหน้า ${p}`]]);
        expect(bad(rows)).toEqual([]);
      });
      await resetView(page);
    }
    await startClip(page, tcId(50));
    for (let p = 1; p <= tab.pages; p++) {
      const hs = tab.lines.filter((l) => l.page === p && l.y < 105);
      const k = dsKey(hs);
      const rows = [
        row('ชื่อ รพ. (ไทย / อังกฤษ)', 'มี', hs.filter((l) => /Hospital|โรงพยาบาล/.test(l.text)).map((l) => l.text).join(' / '), /Hospital/.test(k)),
        row('ชื่อเอกสาร', 'มี', hs.find((l) => /ER Discharge Summary/.test(l.text))?.text ?? '', /ER Discharge Summary/.test(k)),
        row('ขวา: วันเวลาที่พิมพ์ / ผู้สั่งพิมพ์', 'มี', hs.filter((l) => /พมพ/.test(l.key)).map((l) => l.text).join(' / '), /วนเวลาทพมพ/.test(k) && /ผสงพมพ/.test(k)),
      ];
      await r.soft(`${TC(50)} ${TITLE[50]} — หน้า ${p}/${tab.pages}`, async () => {
        const overlay = await showDs(page, tabBuf, `${tcId(50)} ${pdfTitle} หน้า ${p}`, p, 0);
        await compareOnPdf(page, 50, rows);
        await markPdf(overlay, [[await dsBand(overlay, 28, 104, `head${p}`), `หัวกระดาษหน้า ${p}`]]);
        expect(bad(rows)).toEqual([]);
      });
      await resetView(page);
    }

    // TC-051 พยาบาล (หน้าต่างแยก · บัญชี Nurse)
    await startClip(page, tcId(51));
    const nurse = await openPatientAs(browser, 'Nurse', visit.hn, visit);
    try {
      const rn = makeRunner(nurse);
      const nurseDocs = captureGeneratedDocs(nurse);
      await rn.soft(`${TC(51)} พยาบาลเปิดแท็บ Discharge Summary และพิมพ์ได้ด้วยสิทธิ์เดิม`, async () => {
        const { panel: np } = await openDsTab(nurse, visit);
        const btn = dsTabPrintButton(nurse);
        const editable = (await np.getByRole('button').allInnerTexts()).map(norm).filter((b) => /แก้ไข|บันทึก|ลงนาม/.test(b));
        const nBuf = await printPdf(nurse, nurseDocs, btn, 'พยาบาลพิมพ์จากแท็บ');
        const npdf = await readDsPdf(nBuf);
        const strip = (s: string) => s.replace(/วนเวลาทพมพ: \S+ \S+/g, '').replace(/ผสงพมพ: .+?(?= วนเวลา|$)/g, '');
        const diff = npdf.lines.filter((l, i) => strip(l.key) !== strip(tab.lines[i]?.key ?? '')).map((l) => l.text);
        const printer = npdf.lines.find((l) => /ผสงพมพ/.test(l.key))?.text ?? '';
        const rows = [
          row('เห็นแท็บ / เปิดเอกสาร', 'ได้', `ได้ (${npdf.pages} หน้า)`, npdf.pages > 0),
          row('กดพิมพ์', 'ได้', 'ได้ (POST …/pdf?intent=print 200)', true),
          row('เอกสารเดียวกับแพทย์ (ยกเว้นผู้สั่ง / เวลาพิมพ์)', 'เหมือนกัน', diff.length ? `ต่าง ${diff.length} บรรทัด: ${diff.slice(0, 2).join(' · ')}` : 'เหมือนกัน', diff.length === 0),
          row('ผู้สั่งพิมพ์บนเอกสาร', 'บัญชีพยาบาล', printer, !/user1 example/.test(printer)),
          row('ช่องแก้ไข', 'ไม่มี', editable.join(', ') || 'ไม่มี', editable.length === 0),
        ];
        const overlay = await showDs(nurse, nBuf, `${tcId(51)} PDF ที่พยาบาลพิมพ์จากแท็บ`, 1, 40);
        await showCompareTable(nurse, `${tcId(51)} เทียบค่า (หน้าต่างบัญชี Nurse)`, ['Expected', 'จริง'], rows, { side: 'left' });
        await markPdf(overlay, [[await dsLineBox(overlay, /ผสงพมพ/), 'ผู้สั่งพิมพ์ = พยาบาล'], [await dsLineBox(overlay, `HN: ${visit.hn}`), 'ผู้ป่วยเดียวกัน']]);
        expect(bad(rows)).toEqual([]);
      });
      rn.finish();
    } catch (e) {
      r.note(`${tcId(51)} ไม่ผ่าน`, String(e).split('\n')[0]);
    } finally {
      await nurse.context().close().catch(() => undefined);
    }

    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย E (Admit · Order ใน ER / ระหว่างรอเตียง / หอผู้ป่วยหลังได้เตียง): TC-064 · 057 (Super_User)', meta('E', 64, 57), async ({ page }) => {
    const r = makeRunner(page);
    const docs = captureGeneratedDocs(page);
    const auth = trackAuthorization(page);
    /** ชื่อรายการจากแถว One Day Order ("[code] ชื่อ …") */
    const nameOf = async (code: string) => {
      const t = norm(await page.getByRole('main').getByRole('row').filter({ hasText: `[${code}]` }).first().innerText().catch(() => ''));
      return (t.match(new RegExp(`\\[${code}\\]\\s*([^\\[]+?)(\\s{2,}|\\s\\d|$)`)) ?? [])[1]?.trim() ?? code;
    };
    const visit = await patient('E', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย E', async () => {
        // SBH2079_E_RESUME=HN,VN,EN,AN,หอ,เตียง = ชุด 1 / 2 + ลงเตียงแล้ว ทำต่อที่ Order หอผู้ป่วย (ชุด 3)
        const res = process.env.SBH2079_E_RESUME?.split(',');
        if (res?.length === 6) {
          const v = { hn: res[0], vn: res[1], en: res[2], name: 'AUTO X2079E (ทำต่อ)' };
          const info: Record<string, string> = {
            an: res[3], ward: res[4], bed: res[5],
            set1: JSON.stringify({ med0000007: 'GPO-L-ONE (deferiprone 500 mg)', SBHLAB2: 'Urine Creatinine.' }),
            set2: JSON.stringify({ med0000006: 'UTO LINCOMYCIN', SBHLAB5: 'Glucose in Serum' }),
          };
          info.set3 = JSON.stringify({ med0000008: await ipdContinueOrder(page, v, res[3], 'med0000008') });
          return { ...v, preparedAt: bangkokText(), info };
        }
        const v = await newTriagedVisit(page, 'E');
        const info: Record<string, string> = {};
        // ชุด 1: สั่งใน ER ก่อน Admit
        await settledVisit(page, v);
        await openOneDayOrder(page);
        await addMedicineToCart(page, 'med0000007');
        await submitOrders(page, ['SBHLAB2']);
        info.set1 = JSON.stringify({ med0000007: await nameOf('med0000007'), SBHLAB2: await nameOf('SBHLAB2') });
        // Admit Order → สร้าง AN (ยังไม่ลงเตียง) → Disposition รับไว้รักษาต่อIPD ลงนาม = ผู้ป่วยรอเตียงใน ER
        await settledVisit(page, v);
        const adm = await admitCreateAn(page, v, auth, r.note, 'ทดสอบ SBH-2079 ผู้ป่วย E');
        info.an = adm.an;
        info.ward = adm.ward;
        await gotoDisposition(page, v);
        await fillDisposition(page, { status: 'Improved', method: 'รับไว้รักษาต่อIPD', clinical: 'ทดสอบ SBH-2079 ผู้ป่วย E', finding: 'ทดสอบ SBH-2079 ผู้ป่วย E' });
        const s = await signDisposition(page);
        info.signed = s.completedAt ?? '';
        // ชุด 2: สั่งระหว่างรอเตียงใน ER
        await settledVisit(page, v);
        await openOneDayOrder(page);
        await addMedicineToCart(page, 'med0000006');
        await submitOrders(page, ['SBHLAB5']);
        info.set2 = JSON.stringify({ med0000006: await nameOf('med0000006'), SBHLAB5: await nameOf('SBHLAB5') });
        // ลงเตียงที่หอผู้ป่วย → ชุด 3: แพทย์หอผู้ป่วยสั่ง Continue Order บน AN
        info.bed = await putToBed(page, v, adm.ward, r.note);
        info.set3 = JSON.stringify({ med0000008: await ipdContinueOrder(page, v, adm.an, 'med0000008') });
        return { ...v, preparedAt: bangkokText(), info };
      }),
    );
    const info = visit.info ?? {};
    const set1 = JSON.parse(info.set1 ?? '{}') as Record<string, string>;
    const set2 = JSON.parse(info.set2 ?? '{}') as Record<string, string>;
    const set3 = JSON.parse(info.set3 ?? '{}') as Record<string, string>;
    r.note('ผู้ป่วย E', `AN ${info.an} · หอ ${info.ward} · เตียง ${info.bed} · ชุด 1 ${Object.values(set1).join(' / ')} · ชุด 2 ${Object.values(set2).join(' / ')} · ชุด 3 ${Object.values(set3).join(' / ')}`);
    await gotoVisit(page, visit);
    await openDsTab(page, visit);
    const buf = await test.step('พิมพ์จากแท็บ', () => printPdf(page, docs, dsTabPrintButton(page), 'พิมพ์จากแท็บ'));
    const pdf = await readDsPdf(buf);
    const orders = dsSection(pdf, /^Order ทไดรบใน ER$/, /^Disposition$/);
    r.note('PDF Order ที่ได้รับใน ER', dsText(orders));
    const shown = (name: string) => {
      const key = thaiKey(name).toLowerCase().split(' ').slice(0, 2).join(' ');
      return dsKey(orders).toLowerCase().includes(key);
    };
    const head = dsFind(pdf, /^Order ทไดรบใน ER$/)!;

    await startClip(page, tcId(64));
    await r.soft(`${TC(64)} Order ที่สั่งระหว่างรอเตียงใน ER แสดงในเอกสาร`, async () => {
      const rows = [
        ...Object.entries(set1).map(([c, n]) => row(`ชุด 1 สั่งใน ER: ${c}`, `แสดง (${n})`, shown(n) ? 'แสดง' : 'ไม่แสดง', shown(n))),
        ...Object.entries(set2).map(([c, n]) => row(`ชุด 2 ระหว่างรอเตียง: ${c}`, `แสดง (${n})`, shown(n) ? 'แสดง' : 'ไม่แสดง', shown(n))),
      ];
      const overlay = await showDs(page, buf, `${tcId(64)} PDF จากปุ่มพิมพ์ในแท็บ`, head.page, head);
      await compareOnPdf(page, 64, rows);
      await markPdf(overlay, [[await dsBand(overlay, head.y - 12, (orders.filter((l) => l.page === head.page).at(-1) ?? head).y + 5, 'orders'), 'Order ที่ได้รับใน ER (ชุด 1 + 2)']]);
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);
    await startClip(page, tcId(57));
    await r.soft(`${TC(57)} Order ที่หอผู้ป่วยสั่งหลังได้เตียงไม่แสดงในเอกสาร`, async () => {
      const rows = Object.entries(set3).map(([c, n]) => row(`ชุด 3 หอผู้ป่วย (AN ${info.an} · ${info.bed}): ${c}`, `ไม่แสดง (${n})`, shown(n) ? 'แสดง' : 'ไม่แสดง', !shown(n)));
      rows.push(row('Order อื่นในเอกสาร', 'ชุด 1 + 2 เท่านั้น', dsText(orders), true));
      const overlay = await showDs(page, buf, `${tcId(57)} PDF จากปุ่มพิมพ์ในแท็บ`, head.page, head);
      await compareOnPdf(page, 57, rows);
      await markPdf(overlay, [[await dsBand(overlay, head.y - 12, (orders.filter((l) => l.page === head.page).at(-1) ?? head).y + 5, 'orders'), 'ไม่มี Order ชุด 3 (หอผู้ป่วย)']]);
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  // Visit เก่า (7 ต.ค. 2026) ที่บันทึกแพทย์ฉบับเดิม (ก่อนฟอร์มคอมโพเนนต์ 28 ต.ค.) + Disposition ลงนามแล้ว — หาด้วย PDF intent=view (R109) · อ่านอย่างเดียว ไม่กดพิมพ์
  test('Visit เก่า G (บันทึกแพทย์ฉบับเดิม): TC-066 · TC-065 ตรวจไม่ได้ (Super_User · อ่านอย่างเดียว)', meta('G', 66, 65), async ({ page }) => {
    const r = makeRunner(page);
    const visit: ErVisit = { hn: process.env.SBH2079_G_HN ?? '6931243', vn: process.env.SBH2079_G_VN ?? 'V69100727084', en: process.env.SBH2079_G_EN ?? 'E69100731649' };
    r.note('Visit เก่า G', `HN ${visit.hn} · ${visit.vn} · ${visit.en} (7 ต.ค. 2026 · ก่อนฟอร์ม ER Physician Note แบบคอมโพเนนต์)`);
    await gotoErDashboard(page);
    await gotoVisit(page, visit);
    // ตัวเทียบ = เมนู ER Physician Note > ส่วนพับ "บันทึกแพทย์ก่อนหน้า" (บันทึกฉบับเดิมของ Visit นี้ · ER Summary ไม่อ่านฉบับเดิม)
    const main = page.getByRole('main');
    const prevHead = main.getByText('บันทึกแพทย์ก่อนหน้า', { exact: true }).first();
    await careMenu(page, 'ER Physician Note', prevHead);
    await page.waitForTimeout(3_000);
    const prevPanel = prevHead.locator('xpath=ancestor::*[contains(@class,"ant-collapse-item")][1]');
    const prevBar = prevHead.locator('xpath=ancestor::*[contains(@class,"ant-collapse-header")][1]');
    await expect(async () => {
      if ((await prevBar.getAttribute('aria-expanded')) !== 'true') await prevBar.click();
      await expect(prevBar).toHaveAttribute('aria-expanded', 'true', { timeout: 5_000 });
    }, 'กางส่วน บันทึกแพทย์ก่อนหน้า').toPass({ timeout: 60_000 });
    await expect.poll(async () => norm(await prevPanel.innerText()).length, { message: 'เนื้อหาบันทึกแพทย์ก่อนหน้าต้องโหลด', timeout: 60_000 }).toBeGreaterThan(40);
    await page.waitForTimeout(2_000);
    // เนื้อหาบันทึกฉบับเดิมอยู่ใน web component (shadow DOM) — innerText ไม่รวม → ไล่ข้อความทะลุ shadow root
    const legacy = norm(
      await prevPanel.evaluate((root) => {
        const out: string[] = [];
        const walk = (n: Node) => {
          if (n.nodeType === Node.TEXT_NODE) out.push(n.textContent ?? '');
          const sr = (n as Element).shadowRoot;
          if (sr) sr.childNodes.forEach(walk);
          n.childNodes.forEach(walk);
        };
        walk(root);
        return out.join(' ');
      }),
    );
    await prevBar.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    r.note('บันทึกแพทย์ก่อนหน้า (ฉบับเดิม)', legacy.slice(0, 600));
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(path.join(CACHE, 'legacy-note-G.txt'), legacy);
    await markEvidence(expected(prevBar, 'บันทึกแพทย์ก่อนหน้า (ฉบับเดิม) — กางอ่าน'));
    await snapEvidence(page, 'บันทึกแพทย์ก่อนหน้า (ฉบับเดิม) ของ Visit G');
    await clearEvidenceMarks(page);
    const complaint = legacy;
    const vitals = legacy;
    await gotoVisit(page, visit);
    const { pdf: buf } = await openDsTab(page, visit);
    const pdf = await readDsPdf(buf!);
    const note = dsSection(pdf, /^ER Physician Note$/, /^Order ทไดรบใน ER$/);
    r.note('PDF ER Physician Note', dsText(note));
    const head = dsFind(pdf, /^ER Physician Note$/)!;
    const cc = note.find((l) => /Chief Complaint/.test(l.text))?.text.replace(/^Chief Complaint - General\s*/, '') ?? '';
    const ccSets = note.filter((l) => /Chief Complaint/.test(l.text)).length;
    const vsRow = note[note.findIndex((l) => /^BP PR RR/.test(l.text)) + 1]?.text ?? '';

    await startClip(page, tcId(66));
    await r.soft(`${TC(66)} เอกสารใช้บันทึกแพทย์ฉบับเดิมเมื่อไม่มี ER Physician Note ฉบับคอมโพเนนต์`, async () => {
      // บันทึกฉบับเดิมเก็บ BP แยกตัวบน / ตัวล่าง → เทียบทีละตัวเลข
      const vsVals = vsRow.split(' ').filter((x) => x !== '-').flatMap((x) => x.split('/'));
      r.note(`${tcId(66)} ข้อความบันทึกเดิม (ส่วน Vital)`, (legacy.match(/Vital[\s\S]{0,300}/) ?? [''])[0]);
      const rows = [
        row('Chief Complaint - General', 'ข้อความในบันทึกแพทย์ก่อนหน้า', cc, !!cc && cc !== '-' && thaiKey(complaint).includes(thaiKey(cc))),
        // บันทึกฉบับเดิมไม่มีหัวข้อ Vital signs ให้เทียบบนจอ (ตัวดูแสดง CC · Dx · GCS · MEWS · Fast Track · PE · ตำแหน่ง) → ข้อสังเกต ไม่ใช้ตัดสิน
        row('ข้อสังเกต: Vital signs', 'บันทึกแพทย์ก่อนหน้าไม่มีหัวข้อ Vital signs ให้เทียบ', `${vsRow} (ไม่ได้ตรวจแหล่งที่มา)`, vsVals.length === 0 || !/Vital/i.test(vitals) || vsVals.every((x) => vitals.includes(x.replace('%', '')))),
        ...(() => {
          const gcsRow = note[note.findIndex((l) => /^Eye Opening/.test(l.text)) + 1]?.text ?? '';
          const gcsTotal = gcsRow.split(' ').at(-1) ?? '';
          const mews = (note.find((l) => /Total MEWS/.test(l.text))?.text.match(/Total MEWS\)\s*(\S+)/) ?? [])[1] ?? '';
          return [
            row('Total GCS', 'ค่าในบันทึกแพทย์ก่อนหน้า', gcsTotal, !!gcsTotal && gcsTotal !== '-' && new RegExp(`Total GCS\\s+${gcsTotal}\\b`).test(legacy)),
            row('Total MEWS', 'ค่าในบันทึกแพทย์ก่อนหน้า', mews, !!mews && mews !== '-' && new RegExp(`Total MEWS\\s+${mews}\\b`).test(legacy)),
          ];
        })(),
        row('แสดงชุดเดียว', 'ส่วน ER Physician Note 1 ชุด', `หัวข้อ Chief Complaint ${ccSets} ครั้ง`, ccSets === 1),
      ];
      const overlay = await showDs(page, buf!, `${tcId(66)} PDF ของแท็บ (intent=view · Visit ของคนอื่นจึงไม่กดพิมพ์)`, head.page, head);
      await compareOnPdf(page, 66, rows, ['Expected (บันทึกแพทย์ก่อนหน้า ของ Visit เดียวกัน)', 'จริง (PDF)']);
      await markPdf(overlay, [[await dsBand(overlay, head.y - 12, (note.filter((l) => l.page === head.page).at(-1) ?? head).y + 5, 'note'), 'ER Physician Note จากบันทึกฉบับเดิม (ชุดเดียว)']]);
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);
    await startClip(page, tcId(65));
    await r.soft(`${TC(65)} เอกสารใช้ ER Physician Note ฉบับคอมโพเนนต์ชุดเดียวเมื่อมีทั้ง 2 ฉบับ`, async () => {
      const overlay = await showDs(page, buf!, `${tcId(65)} ตรวจไม่ได้ — ไม่พบ Visit ที่มีทั้งฉบับคอมโพเนนต์และฉบับเดิม`, head.page, head);
      await compareOnPdf(page, 65, [row('ข้อมูลตั้งต้น', 'Visit ที่มี Note 2 ฉบับ (Chief Complaint คนละข้อความ)', 'ไม่พบ · สร้างฉบับเดิมใหม่ไม่ได้แล้ว (ฟอร์มเปลี่ยนเป็นคอมโพเนนต์ 28 ต.ค.)', false)]);
      await markPdf(overlay, [[await dsBand(overlay, head.y - 12, head.y + 30, 'n'), 'ตัวอย่าง Visit ที่มีฉบับเดิมอย่างเดียว']]);
      throw new Error('ตรวจไม่ได้: ไม่มี Visit ที่มี ER Physician Note ทั้งฉบับคอมโพเนนต์และฉบับเดิม');
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย B (Disposition ฉบับร่าง ยังไม่ลงนาม): TC-002 · 053 · 054 · 069 · 070 (Super_User)', meta('B', 2, 53, 54, 69, 70), async ({ page }) => {
    const r = makeRunner(page);
    const visit = await patient('B', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย B', async () => {
        const v = await newTriagedVisit(page, 'B');
        await gotoDisposition(page, v);
        await fillDisposition(page, { status: 'Improved', method: 'With Approval', clinical: 'ทดสอบ SBH-2079 ผู้ป่วย B', finding: 'ทดสอบ SBH-2079 ผู้ป่วย B' });
        const draft = await saveDispositionDraft(page);
        return { ...v, preparedAt: bangkokText(), info: { disposition: `ฉบับร่าง ${draft.statusCode} (ยังไม่ลงนาม)` } };
      }),
    );
    const pdfRequests: string[] = [];
    page.on('request', (req) => {
      if (DS_PDF_API.test(new URL(req.url()).pathname)) pdfRequests.push(`${req.method()} ${req.url().replace(/^https:\/\/[^/]+/, '')}`);
    });

    await gotoDisposition(page, visit, false);
    const d = dispo(page);

    // TC-053 ปุ่มพิมพ์ใน Disposition ถูกปิด
    await startClip(page, tcId(53));
    await r.soft(`${TC(53)} ปุ่มพิมพ์ในเมนู Disposition ถูกปิดเมื่อยังไม่ลงนาม`, async () => {
      await expect(d.printButton, 'หัวฟอร์มต้องมีปุ่มพิมพ์').toBeVisible();
      const label = norm(await d.printButton.innerText());
      const disabled = await d.printButton.isDisabled();
      pdfRequests.length = 0;
      // ลองกดด้วยเมาส์ที่ตำแหน่งปุ่ม (ปุ่ม disabled ไม่รับ click ของ Playwright)
      const box = (await d.printButton.boundingBox())!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(4_000);
      const rows = [
        row('สถานะ Disposition', 'ยังไม่ลงนาม (ฉบับร่าง)', norm(await d.signButton.isEnabled().then((e) => (e ? 'ฉบับร่าง (ปุ่มลงนามกดได้)' : 'ฉบับร่าง'))), true),
        row('ปุ่มพิมพ์ที่หัวฟอร์ม', 'ปิด (disabled)', `${label} · ${disabled ? 'disabled' : 'กดได้'}`, disabled),
        row('กดแล้วได้เอกสาร', 'ไม่ได้ (ไม่มีคำขอ PDF)', pdfRequests.length ? pdfRequests.join(' · ') : 'ไม่มีคำขอ PDF', pdfRequests.length === 0),
      ];
      r.note(`${tcId(53)} ชื่อปุ่ม`, `"${label}" (TC เขียน "พิมพ์ Discharge Summary")`);
      await showCompareTable(page, `${tcId(53)} เทียบค่า`, ['Expected', 'จริง'], rows, { side: 'bottom' });
      await markEvidence(expected(d.printButton, 'disabled'), clicked(d.printButton, 'ลองกด'));
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-002 ส่วน Discharge Instruction & Follow-up Plan
    await startClip(page, tcId(2));
    await r.soft(`${TC(2)} หน้า Disposition มีส่วน Discharge Instruction & Follow-up Plan`, async () => {
      await d.followSection.scrollIntoViewIfNeeded();
      await d.followSection.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(500);
      const section = norm(await d.followSection.innerText());
      const labels = await d.main.getByText(/^(Clinical Summary|แผนการติดตามอาการ|นัดหมายติดตามอาการ|คำแนะนำผู้ป่วย|นัดติดตาม)/).allInnerTexts();
      const c1 = await counterOf(d.clinicalSummary);
      const c2 = await counterOf(d.followUp);
      const rows = [
        row('ชื่อส่วน', 'Discharge Instruction & Follow-up Plan', section),
        row('ช่อง คำแนะนำผู้ป่วย', 'มี · 0 / 1000', `Clinical Summary · ${c1.text}`, false),
        row('ช่อง นัดติดตาม/ Follow-up', 'มี · 0 / 1000', `แผนการติดตามอาการ · ${c2.text}`, false),
      ];
      r.note(`${tcId(2)} ชื่อช่องจริง`, labels.map(norm).join(' · '));
      await showCompareTable(page, `${tcId(2)} เทียบค่า`, ['Expected', 'จริง'], rows, { side: 'left' });
      await markEvidence(expected(d.followSection, section), expected(d.clinicalSummary, `Clinical Summary · ${c1.text}`), expected(d.followUp, `แผนการติดตามอาการ · ${c2.text}`));
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-069 / 070 ความยาว 1000 ตัวอักษร (ไม่บันทึก)
    for (const [n, box, label] of [
      [69, d.clinicalSummary, 'คำแนะนำผู้ป่วย (Clinical Summary)'],
      [70, d.followUp, 'นัดติดตาม/ Follow-up (แผนการติดตามอาการ)'],
    ] as const) {
      await startClip(page, tcId(n));
      await r.soft(`${TC(n)} ช่อง${label} รับได้สูงสุด 1000 ตัวอักษร`, async () => {
        await box.scrollIntoViewIfNeeded();
        await box.fill(longText(1000));
        const at1000 = (await counterOf(box)).text;
        await markEvidence(filled(box, '1000 ตัวอักษร'));
        await snapEvidence(page, `${tcId(n)} กรอก 1000 ตัว`);
        await clearEvidenceMarks(page);
        await box.press('End');
        await page.keyboard.type('X');
        const len1001 = await box.evaluate((e) => (e as HTMLTextAreaElement).value.length);
        const c = await counterOf(box);
        const maxAttr = await box.getAttribute('maxlength');
        const rows = [
          row('กรอก 1000 ตัว: ตัวนับ', '1000 / 1000', at1000),
          row('พิมพ์ตัวที่ 1001: ความยาวในช่อง', '1000 (ตัวที่ 1001 ไม่เข้า)', String(len1001), len1001 === 1000),
          row('พิมพ์ตัวที่ 1001: ตัวนับ', '1000 / 1000', c.text),
          row('maxlength ของช่อง', '1000', maxAttr ?? '(ไม่มี)', maxAttr === '1000'),
        ];
        await showCompareTable(page, `${tcId(n)} เทียบค่า`, ['Expected', 'จริง'], rows, { side: 'left' });
        await markEvidence(expected(box, `${label}: ${c.text}`));
        r.note(`${tcId(n)} ผล`, `1000 ตัว → ${at1000} · ตัวที่ 1001 → ยาว ${len1001} · ${c.text} · maxlength ${maxAttr}`);
        expect(bad(rows)).toEqual([]);
      });
      await resetView(page);
      await box.fill('');
    }

    // TC-054 แท็บในประวัติการรักษา
    await startClip(page, 'gap'); // ตัดช่วงโหลดหน้าออกจากคลิป TC-070
    await gotoVisit(page, visit);
    await startClip(page, tcId(54));
    await r.soft(`${TC(54)} แท็บ Discharge Summary แสดงข้อความยังไม่มีเอกสารเมื่อยังไม่ลงนาม`, async () => {
      pdfRequests.length = 0;
      const { panel } = await openDsTab(page, visit, { expectPdf: false });
      await page.waitForTimeout(5_000);
      const text = norm(await panel.innerText());
      const print = await panel.getByRole('button', { name: /พิมพ์/ }).count();
      const rows = [
        row('ข้อความ', 'ยังไม่มี Discharge Summary เพราะยังไม่ลงนามการจำหน่าย', text, false),
        row('ข้อความ (เทียบความหมาย)', DS_NOT_SIGNED, text, text.includes(DS_NOT_SIGNED)),
        row('เอกสาร', 'ไม่มี (ไม่มีคำขอ PDF)', pdfRequests.length ? pdfRequests.join(' · ') : 'ไม่มีคำขอ PDF', pdfRequests.length === 0),
        row('ปุ่มพิมพ์', 'ไม่มี / พิมพ์ไม่ได้', print ? `มี ${print} ปุ่ม` : 'ไม่มี', print === 0),
      ];
      await showCompareTable(page, `${tcId(54)} เทียบค่า`, ['Expected', 'จริง'], rows, { side: 'bottom' });
      await markEvidence(expected(panel.getByText(DS_NOT_SIGNED).first(), text), expected(page.getByRole('main').getByRole('tab', { name: 'สรุปการจำหน่าย', exact: true }), 'แท็บ สรุปการจำหน่าย'));
      r.note(`${tcId(54)} ข้อความจริง`, text);
      expect(bad(rows).filter((b) => !b.startsWith('ข้อความ: '))).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย C (เสียชีวิต): TC-001 · 068 · 055 · 037 (Super_User)', meta('C', 1, 68, 55, 37), async ({ page }) => {
    const r = makeRunner(page);
    const docs = captureGeneratedDocs(page);
    const visit = await patient('C', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย C (คัดกรอง → เริ่ม Disposition)', async () => {
        const v = await newTriagedVisit(page, 'C');
        return { ...v, preparedAt: bangkokText(), info: {} };
      }),
    );
    let cause = { icd: 'I469 Cardiac arrest, unspecified', due: 'หัวใจหยุดเต้นเฉียบพลัน ทดสอบ SBH-2079' };
    if (process.env.SBH2079_ONLY !== '37') {
    await gotoDisposition(page, visit);
    const d = dispo(page);

    // TC-001 ช่องสาเหตุการเสียชีวิต
    await startClip(page, tcId(1));
    await r.soft(`${TC(1)} หน้า Disposition แสดงช่องสาเหตุการเสียชีวิตเมื่อเลือกเสียชีวิต`, async () => {
      const before = await d.causeTitle.count();
      await d.radio('Dead').check();
      await markEvidence(clicked(d.radio('เสียชีวิต').locator('xpath=ancestor::label[1]'), 'เสียชีวิต'));
      await snapEvidence(page, `${tcId(1)} ก่อนกด เสียชีวิต`);
      await clearEvidenceMarks(page);
      await d.radio('เสียชีวิต').check();
      await expect(d.causeTitle, 'เลือกเสียชีวิตแล้วต้องมีส่วนสาเหตุการเสียชีวิต').toBeVisible();
      await d.main.getByText('วิธีการจำหน่าย', { exact: true }).first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.mouse.move(600, 600);
      const required = await d.causeLabel.evaluate((el) => {
        const t = (el.closest('label, div')?.textContent ?? '') + (el.previousElementSibling?.textContent ?? '') + getComputedStyle(el, '::before').content;
        return /\*/.test(t);
      });
      const other = await counterOf(d.causeOther);
      const dueMax = await d.causeDue.getAttribute('maxlength');
      const methodY = (await d.radio('เสียชีวิต').boundingBox())!.y;
      const causeY = (await d.causeTitle.boundingBox())!.y;
      const rows = [
        row('ก่อนเลือกเสียชีวิต', 'ไม่มีช่อง', before ? 'มีแล้ว' : 'ไม่มีช่อง'),
        row('ช่อง "สาเหตุการเสียชีวิต"', 'ขึ้นใต้วิธีการจำหน่าย', causeY > methodY ? 'ขึ้นใต้วิธีการจำหน่าย' : 'ไม่อยู่ใต้วิธีการจำหน่าย'),
        row('มี * บังคับ', 'มี', required ? 'มี' : 'ไม่มี'),
        row('ชนิดช่อง', 'ข้อความอิสระ · ตัวนับ 0 / 1000', `ค้น ICD-10 + "เนื่องจาก" (maxlength ${dueMax ?? '-'}) · เหตุการณ์อื่นที่เกี่ยวข้อง ${other.text}`, false),
      ];
      await showCompareTable(page, `${tcId(1)} เทียบค่า`, ['Expected', 'จริง'], rows, { side: 'bottom' });
      await markEvidence(filled(d.radio('เสียชีวิต').locator('xpath=ancestor::label[1]'), 'เสียชีวิต'), expected(d.causeLabel, 'สาเหตุการเสียชีวิต *'), expected(d.causeSelect, 'ค้น ICD-10'), expected(d.causeDue, 'เนื่องจาก'), expected(d.causeOther, `เหตุการณ์อื่นฯ ${other.text}`));
      r.note(`${tcId(1)} ชนิดช่อง`, rows[3].values[1]);
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-068 ความยาว 1000 ตัวอักษร (ช่องข้อความของส่วนสาเหตุการเสียชีวิต — ไม่บันทึก)
    await startClip(page, tcId(68));
    await r.soft(`${TC(68)} ช่องสาเหตุการเสียชีวิตรับได้สูงสุด 1000 ตัวอักษร`, async () => {
      const results: CompareRow[] = [];
      for (const [box, label] of [
        [d.causeDue, 'เนื่องจาก (ข้อความของสาเหตุการเสียชีวิต)'],
        [d.causeOther, 'เหตุการณ์อื่นที่เกี่ยวข้อง'],
      ] as const) {
        await box.scrollIntoViewIfNeeded();
        await box.fill(longText(1000));
        const at1000 = await box.evaluate((e) => (e as HTMLInputElement).value.length);
        const c1000 = (await counterOf(box)).text;
        await box.press('End');
        await page.keyboard.type('X');
        const len = await box.evaluate((e) => (e as HTMLInputElement).value.length);
        const c = (await counterOf(box)).text;
        results.push(row(`${label}: กรอก 1000`, '1000 / 1000', `${at1000} ตัว · ตัวนับ ${c1000 || '(ไม่มี)'}`, at1000 === 1000 && /^1000 \/ 1000$/.test(c1000)));
        results.push(row(`${label}: ตัวที่ 1001`, 'ไม่เข้า (ยัง 1000)', `${len} ตัว · ตัวนับ ${c || '(ไม่มี)'}`, len === 1000));
      }
      await d.causeTitle.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await showCompareTable(page, `${tcId(68)} เทียบค่า`, ['Expected', 'จริง'], results, { side: 'bottom' });
      const other = await counterOf(d.causeOther);
      await markEvidence(expected(d.causeDue, 'เนื่องจาก'), expected(d.causeOther, `เหตุการณ์อื่นฯ ${other.text}`));
      r.note(`${tcId(68)} ผล`, results.map((x) => `${x.label} → ${x.values[1]}`).join(' · '));
      expect(bad(results)).toEqual([]);
    });
    await resetView(page);
    await d.causeDue.fill('');
    await d.causeOther.fill('');

    // TC-055 ลงนามไม่ได้เมื่อไม่กรอกสาเหตุการเสียชีวิต
    await startClip(page, tcId(55));
    await r.soft(`${TC(55)} ลงนาม Disposition ไม่ได้เมื่อเลือกเสียชีวิตแต่ไม่กรอกสาเหตุการเสียชีวิต`, async () => {
      await chooseDispositionDiagnosis(page, 'K30');
      const { clinical, finding } = dispositionTextBoxes(page);
      await clinical.fill('ทดสอบ SBH-2079 ผู้ป่วย C เสียชีวิต');
      await finding.fill('ทดสอบ SBH-2079 ผู้ป่วย C เสียชีวิต');
      await d.signButton.scrollIntoViewIfNeeded();
      const enabled = await d.signButton.isEnabled();
      const finalize: string[] = [];
      const onRes = async (res: import('@playwright/test').Response) => {
        if (res.request().method() === 'POST' && /graphql/.test(res.url()) && /mutation FinalizeErDischarge/.test(res.request().postData() ?? '')) {
          const body = await res.text().catch(() => '');
          finalize.push(`${res.status()} ${/"errors"/.test(body) ? `errors: ${(body.match(/"message"\s*:\s*"([^"]+)/) ?? [])[1] ?? ''}` : /COMPLETE/.test(body) ? 'COMPLETE' : body.slice(0, 120)}`);
        }
      };
      page.on('response', onRes);
      await markEvidence(clicked(d.signButton, 'ลงนาม'), expected(d.causeSelect, 'สาเหตุว่าง'));
      await snapEvidence(page, `${tcId(55)} ก่อนกด ลงนาม`);
      await clearEvidenceMarks(page);
      const box = (await d.signButton.boundingBox())!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      // ผู้ป่วย AUTO ไม่มีที่อยู่ → หน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่ … ลงนามต่อ" ก่อน (ไม่เกี่ยวกับ TC) → กดลงนามต่อ
      const proceed = page.getByRole('button', { name: 'ลงนามต่อ' });
      let addressDialog = '';
      if (await proceed.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false)) {
        addressDialog = 'ขึ้นหน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" → กด ลงนามต่อ';
        await page.waitForTimeout(800); // หน้าต่างยังเล่น animation เปิด — ตีกรอบตอนนี้กรอบเลื่อน (~125 px)
        await markEvidence(alerted(page.getByRole('dialog').filter({ has: proceed }).first(), 'ผู้ป่วยยังไม่มีข้อมูลที่อยู่'), clicked(proceed, 'ลงนามต่อ'));
        await snapEvidence(page, `${tcId(55)} หน้าต่างที่อยู่`);
        await clearEvidenceMarks(page);
        await proceed.click();
      }
      // แจ้งเตือนหลังลงนาม (หายใน ~4 วิ) → ถ่ายทันที: กรอบแจ้งเตือน + ช่องสาเหตุที่ว่าง
      const toast = page.locator('.ant-message-notice, .ant-notification-notice').filter({ visible: true }).first();
      await toast.waitFor({ timeout: 10_000 }).catch(() => undefined);
      await d.causeTitle.evaluate((el) => el.scrollIntoView({ block: 'start' })).catch(() => undefined);
      if (await toast.isVisible().catch(() => false)) {
        await markEvidence(alerted(toast, norm(await toast.innerText())), expected(d.causeSelect, 'สาเหตุการเสียชีวิตว่าง'));
        await snapEvidence(page, `${tcId(55)} หลังกด ลงนามต่อ`);
        await clearEvidenceMarks(page);
      }
      await page.waitForTimeout(3_000);
      page.off('response', onRes);
      const err = page.locator('.ant-form-item-explain-error, .ant-message-notice, .ant-notification-notice, [role=alert]').filter({ visible: true });
      const errors = (await err.allInnerTexts()).map(norm).filter(Boolean);
      const signed = finalize.some((f) => /COMPLETE/.test(f));
      const rows = [
        row('ลงนาม', 'ไม่สำเร็จ', `${enabled ? 'ปุ่มกดได้' : 'ปุ่ม disabled'} · ${addressDialog ? 'หน้าต่างที่อยู่ → ลงนามต่อ · ' : ''}คำสั่งลงนาม ${finalize.length ? finalize.join(' / ') : 'ไม่ถูกส่ง'}`, !signed),
        row('แจ้งให้กรอกสาเหตุการเสียชีวิต', 'มีข้อความแจ้ง', errors.join(' / ') || '(ไม่มีข้อความ)', errors.some((e) => /สาเหตุ/.test(e))),
      ];
      await showCompareTable(page, `${tcId(55)} เทียบค่า`, ['Expected', 'จริง'], rows, { side: 'bottom' });
      const errMarks = (await err.count()) ? [alerted(err.first(), errors[0] ?? '')] : [];
      await markEvidence(...errMarks, expected(d.causeSelect, 'สาเหตุว่าง'));
      r.note(`${tcId(55)} ผล`, rows.map((x) => `${x.label}: ${x.values[1]}`).join(' · '));
      if (signed) r.note(`${tcId(55)} ⚠`, 'ลงนามสำเร็จทั้งที่ไม่มีสาเหตุการเสียชีวิต → เปิดแก้ไขเพื่อกรอกสาเหตุต่อ');
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);
    await startClip(page, 'gap'); // ตัดช่วงเปิดแก้ไข / ลงนามใหม่ออกจากคลิป TC-055
    if (await page.getByRole('main').getByRole('button', { name: 'เปิดแก้ไข' }).isVisible().catch(() => false)) {
      await test.step('ลงนามไปแล้ว → เปิดแก้ไข เพื่อกรอกสาเหตุ', () => reopenDisposition(page));
    }

    // เตรียม: กรอกสาเหตุ → ลงนาม
    cause = await test.step('เตรียม: กรอกสาเหตุการเสียชีวิต → ลงนาม', async () => {
      const icd = await chooseCauseIcd(page, 'I46.9');
      const due = 'หัวใจหยุดเต้นเฉียบพลัน ทดสอบ SBH-2079';
      await d.causeDue.fill(due);
      await d.causeOther.fill('');
      await markEvidence(filled(d.causeSelect, icd), filled(d.causeDue, due));
      await snapEvidence(page, 'กรอก สาเหตุการเสียชีวิต');
      await clearEvidenceMarks(page);
      const s: ErDischargeSummary = await signDisposition(page);
      r.note('ผู้ป่วย C ลงนาม', `${s.completedAt} โดย ${s.completedBy?.display} · สาเหตุ ${icd} เนื่องจาก ${due}`);
      return { icd, due };
    });
    } // SBH2079_ONLY=37 = ข้ามถึง TC-037 (ผู้ป่วยลงนามแล้ว · อ่านอย่างเดียว + พิมพ์)

    // TC-037 สาเหตุการเสียชีวิตบนเอกสาร
    await gotoVisit(page, visit);
    const { pdf: viewPdf } = await openDsTab(page, visit);
    expect(viewPdf).toBeTruthy();
    await startClip(page, tcId(37));
    await r.soft(`${TC(37)} สาเหตุการเสียชีวิตแสดงต่อจากวิธีการจำหน่ายเมื่อมีบันทึก`, async () => {
      const buf = await printPdf(page, docs, dsTabPrintButton(page), 'พิมพ์จากแท็บ');
      const pdf = await readDsPdf(buf);
      const status = dsCheckboxes(dsSection(pdf, 'สถานะการจาหนาย', 'วธการจาหนาย'));
      const methodHead = dsFind(pdf, 'วธการจาหนาย')!;
      const methods = dsCheckboxes(dsSection(pdf, 'วธการจาหนาย', /^2\. /));
      const afterMethod = pdf.lines.slice(pdf.lines.indexOf(methodHead) + 1).filter((l) => !l.text.includes('[') && !isRunningHeader(l))[0];
      const causeLine = dsFind(pdf, thaiKey(cause.due)) ?? dsFind(pdf, cause.icd.split(' ')[0]);
      const rows = [
        row('สถานะการจำหน่าย [X]', 'Dead', status.filter((s) => s.checked).map((s) => s.label).join(', ')),
        row('วิธีการจำหน่าย [X]', 'เสียชีวิต', methods.filter((s) => s.checked).map((s) => s.label).join(', '), thaiKey(methods.filter((s) => s.checked).map((s) => s.label).join(', ')) === thaiKey('เสียชีวิต')),
        row('สาเหตุการเสียชีวิต (ข้อความ)', `${cause.icd} · ${cause.due}`, causeLine?.text ?? '(ไม่พบ)', !!causeLine && causeLine.key.includes(thaiKey(cause.due))),
        row('ตำแหน่ง', 'ต่อจากวิธีการจำหน่าย', afterMethod ? afterMethod.text : '(ไม่พบ)', !!causeLine && afterMethod === causeLine),
      ];
      const overlay = await showDs(page, buf, `${tcId(37)} PDF จากปุ่มพิมพ์ในแท็บ (intent=print)`, causeLine?.page ?? methodHead.page, causeLine ?? methodHead);
      await compareOnPdf(page, 37, rows);
      await markLines(overlay, [['[X] Dead', '[X] Dead'], ['[X] เสยชวต', '[X] เสียชีวิต'], [cause.due, 'สาเหตุ']]);
      r.note(`${tcId(37)} บรรทัดหลังวิธีการจำหน่าย`, afterMethod?.text ?? '-');
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });

  // ==============================================================================================
  test('ผู้ป่วย D (ข้อมูลน้อย · With Approval): TC-060 · 061 · 062 · 063 (Super_User)', meta('D', 60, 61, 62, 63), async ({ page }) => {
    const r = makeRunner(page);
    const docs = captureGeneratedDocs(page);
    const visit = await patient('D', r, () =>
      test.step('เตรียมข้อมูล ผู้ป่วย D (ไม่มีแพ้ · ไม่มี Order · Disposition ช่องบังคับ → ลงนาม)', async () => {
        const v = await newTriagedVisit(page, 'D');
        await gotoDisposition(page, v);
        await fillDisposition(page, { status: 'Improved', method: 'With Approval', clinical: 'ทดสอบ SBH-2079 ผู้ป่วย D', finding: 'ทดสอบ SBH-2079 ผู้ป่วย D' });
        const s = await signDisposition(page);
        return { ...v, preparedAt: bangkokText(), info: { signed: `${s.completedAt} โดย ${s.completedBy?.display}` } };
      }),
    );
    await gotoVisit(page, visit);
    await openDsTab(page, visit);
    const buf = await test.step('พิมพ์จากแท็บ', () => printPdf(page, docs, dsTabPrintButton(page), 'พิมพ์จากแท็บ'));
    const pdf = await readDsPdf(buf);
    r.note('PDF ผู้ป่วย D', `${pdf.pages} หน้า`);

    // TC-060 ประวัติการแพ้ว่าง
    await startClip(page, tcId(60));
    await r.soft(`${TC(60)} ประวัติการแพ้แสดงข้อความไม่มีประวัติเมื่อไม่มีรายการแพ้`, async () => {
      const drug = dsFind(pdf, 'ไม่มีประวัติแพ้ยาที่บันทึกไว้');
      const other = dsFind(pdf, 'ไม่มีประวัติแพ้อื่นๆ ที่บันทึกไว้');
      const rows = [row('แพ้ยา', 'ไม่มีประวัติแพ้ยาที่บันทึกไว้', drug?.text ?? '(ไม่พบ)', !!drug), row('แพ้อื่นๆ', 'ไม่มีประวัติแพ้อื่นๆ ที่บันทึกไว้', other?.text ?? '(ไม่พบ)', !!other)];
      const head = dsFind(pdf, 'ประวัติการแพ้')!;
      const overlay = await showDs(page, buf, `${tcId(60)} PDF จากปุ่มพิมพ์ในแท็บ`, head.page, head);
      await compareOnPdf(page, 60, rows);
      await markLines(overlay, [['ไม่มีประวัติแพ้ยาที่บันทึกไว้', 'แพ้ยา'], ['ไม่มีประวัติแพ้อื่นๆ ที่บันทึกไว้', 'แพ้อื่นๆ']]);
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-061 ไม่มี Order
    await startClip(page, tcId(61));
    await r.soft(`${TC(61)} ส่วน Order แสดงข้อความเมื่อไม่มี Order ใน visit`, async () => {
      const head = dsFind(pdf, 'Order ที่ได้รับใน ER');
      const msg = dsFind(pdf, 'ไม่มี Order ใน visit นี้');
      const rows = [row('หัวส่วน', 'Order ที่ได้รับใน ER', head?.text ?? '(ไม่พบ)', !!head), row('ข้อความ', 'ไม่มี Order ใน visit นี้', msg?.text ?? '(ไม่พบ)', !!msg)];
      const overlay = await showDs(page, buf, `${tcId(61)} PDF จากปุ่มพิมพ์ในแท็บ`, (head ?? pdf.lines[0]).page, head);
      await compareOnPdf(page, 61, rows);
      await markLines(overlay, [['Order ที่ได้รับใน ER', 'หัวส่วน'], ['ไม่มี Order ใน visit นี้', 'ข้อความ']]);
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-062 ช่องว่างแสดง "-"
    await startClip(page, tcId(62));
    await r.soft(`${TC(62)} ช่องในส่วน Disposition ที่ไม่มีข้อมูลแสดงเครื่องหมายขีด`, async () => {
      const after = (from: string | RegExp, to: string | RegExp) => dsSection(pdf, from, to);
      const checks: [string, DsLine[], RegExp][] = [
        ['ข้อมูล Visit: วินิจฉัย โดยแพทย์', after(/^2\. /, /^3\. /), /วนจฉย โดยแพทย: -$/],
        ['หัตถการ', after(/^4\. /, /^5\. /), /^-$/],
        ['คำแนะนำผู้ป่วย', after(/^8\. /, /^9\. /), /คาแนะนาผปวย: -$/],
        ['นัดติดตาม / Follow-up', after(/^8\. /, /^9\. /), /Follow-up: -$/],
      ];
      const rows = checks.map(([label, lines, re]) => row(label, '-', dsText(lines) || '(หัวข้อหาย / ว่าง)', lines.some((l) => re.test(l.key))));
      const head = dsFind(pdf, /^4\. /) ?? dsFind(pdf, /^2\. /)!;
      const overlay = await showDs(page, buf, `${tcId(62)} PDF จากปุ่มพิมพ์ในแท็บ`, head.page, head);
      await compareOnPdf(page, 62, rows);
      const proc = dsFind(pdf, /^4\. /);
      const dash = proc ? dsSection(pdf, /^4\. /, /^5\. /)[0] : undefined;
      await markLines(
        overlay,
        [[/วนจฉย โดยแพทย: -/, 'วินิจฉัย โดยแพทย์ -'], [/คาแนะนาผปวย: -/, 'คำแนะนำผู้ป่วย -'], [/Follow-up: -/, 'นัดติดตาม -']],
        proc && dash ? [[await dsBand(overlay, proc.y - 10, dash.y + 4, 'proc'), 'หัตถการ -']] : [],
      );
      expect(bad(rows)).toEqual([]);
    });
    await resetView(page);

    // TC-063 ไม่มีสาเหตุการเสียชีวิต
    await startClip(page, tcId(63));
    await r.soft(`${TC(63)} ไม่แสดงสาเหตุการเสียชีวิตเมื่อวิธีการจำหน่ายไม่ใช่เสียชีวิต`, async () => {
      const methodHead = dsFind(pdf, 'วธการจาหนาย')!;
      const methods = dsCheckboxes(dsSection(pdf, 'วธการจาหนาย', /^2\. /));
      const tail = dsSection(pdf, 'วธการจาหนาย', /^2\. /).filter((l) => !l.text.includes('['));
      const cause = dsFind(pdf, 'สาเหตุการเสียชีวิต');
      const rows = [
        row('วิธีการจำหน่าย [X]', 'With Approval', methods.filter((m) => m.checked).map((m) => m.label).join(', ')),
        row('บรรทัดสาเหตุการเสียชีวิต', 'ไม่มี', cause ? cause.text : tail.length ? dsText(tail) : 'ไม่มี', !cause && tail.length === 0),
      ];
      const overlay = await showDs(page, buf, `${tcId(63)} PDF จากปุ่มพิมพ์ในแท็บ`, methodHead.page, methodHead);
      await compareOnPdf(page, 63, rows);
      const last = dsSection(pdf, 'วธการจาหนาย', /^2\. /).at(-1)!;
      await markLines(overlay, [['[X] With Approval', '[X] With Approval']], [[await dsBand(overlay, methodHead.y - 10, last.y + 16, 'methods'), 'ต่อจากวิธีการจำหน่ายไม่มีบรรทัดสาเหตุการเสียชีวิต']]);
      expect(bad(rows)).toEqual([]);
    });
    r.finish();
  });
});
