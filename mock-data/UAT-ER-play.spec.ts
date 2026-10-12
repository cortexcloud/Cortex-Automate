import type { Browser, Page, Request } from '@playwright/test';
import {
  confirmOpenErVisit,
  expectOk,
  expectTriageFormOpen,
  expectVisitHeader,
  gotoErDashboard,
  openErDashboardFromMenu,
  openErMenu,
  openTriagePage,
  openVisitDialog,
  selectExistingPatient,
  type ErVisit,
} from '../helpers/functions/er';
import { openDisposition } from '../helpers/functions/er-disposition';
import { trackAuthorization } from '../helpers/functions/er-report';
import { ESI_BUTTON, labelledBox, triageForm } from '../helpers/functions/er-triage';
import { expect, test } from './fixtures';
import { COVERAGE_UC, SETTINGS, SYSTEM, fetchNurseTasks, nextUatPatient, openErVisitForHn, recordDrugAllergy, recordMockPatient, savePhysicianNote, submitOrders } from './uat-er';
import {
  DISCHARGE_AGAINST_ADVICE,
  Play,
  VITALS_NORMAL,
  addMedicineToCart,
  createMedicalCertificate,
  replyConsult,
  requestConsult,
  savePatient,
  loadPatients,
  signDischarge,
  boardEncounter,
  careMenu,
  draftDischarge,
  fillTriage,
  gotoVisit,
  mockPatient,
  nextMutation,
  openPatientAs,
  pick,
  watchMutations,
  recordMenu,
  options,
  registerWithoutVisit,
  saveTriageForm,
  type Played,
} from './uat-play';

// เล่นตามชีต "Scenario- ER" ของ "New file Test case OPD #2.xlsx" (UAT-ER-01 – 13 · ข้อ 14 MOPH Refer ไม่เล่น)
// ใช้ผู้ป่วย Mock รายล่าสุดจาก created-patients.md (รัน UAT-ER-mock-data ก่อน) · ขั้นที่ระบบทำไม่ได้ถูกจดแล้วเล่นขั้นถัดไปต่อ
// รันทีละข้อ: npx playwright test -c playwright.mock.config.ts UAT-ER-play --headed --grep "UAT-ER-10"
// ลำดับที่ต้องรัน: 10 → 01 (ใช้ราย C ต่อหลังยกเลิก Visit) · 09 → 04 (ราย A) · 05 → 06 (ผู้ป่วยกรณี 5.2)

/** ยาที่ใช้สั่งตอนเล่น — dev-x ใช้เฉพาะ med0000005–med0000008 (R25) · SBH Prod ใช้รหัสจากชีต "Mock-Data ER" */
const MED_CODE = SYSTEM === 'dev-x' ? 'med0000005' : 'MED0000260';

function statusSelect(page: Page) {
  // หน้าจอมีช่องสถานะซ่อนอยู่อีกตัว → ใช้ตัวที่มองเห็น
  return page.getByRole('main').locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
}

const CONSULT_PROBLEM = 'ขอปรึกษาอาการปวดท้องจากแพทย์ ER (UAT-ER-01)';
/** แพทย์ที่ถูกขอปรึกษา = แพทย์ของบัญชีหลักที่ใช้เล่น (ค้นด้วยนามสกุล — ค้น "ทดสอบ" ได้แพทย์ชื่อคล้ายกันเกินหน้าแรกของรายการ) */
const CONSULT_DOCTOR = SYSTEM === 'dev-x' ? { search: 'มานะ', name: /ทดสอบ มานะ/ } : { search: 'เอื้อเฟื้อ', name: /วิชัย.*เอื้อเฟื้อ/ };
const CONSULT_ANSWER = 'แนะนำให้ยาลดกรดและนัดติดตามอาการ (คำตอบ Consult UAT-ER-01)';

/** UAT-ER-01: ขอ Consult → ตอบ → ดูคำตอบ (อยู่หน้าผู้ป่วยของ Visit ER) */
async function consultSteps(play: Play, page: Page, browser: Browser, visit: ErVisit) {
  // ผู้ใช้สั่ง 3 ต.ค. 2026: "ให้ใช้แพทย์คนอื่น Consult ทดสอบ มานะ" → แพทย์อีกบัญชี (role Doctor) เป็นผู้ขอ ถึงแพทย์ของบัญชีหลัก (CONSULT_DOCTOR)
  // แล้วบัญชีหลัก (หน้า `page`) เป็นผู้ตอบ — ผู้ขอเปิดคำขอของตัวเอง / คำขอที่ส่งถึงคลินิกอย่างเดียว ไม่มีช่อง "คำตอบ" ให้กรอก
  const main = page.getByRole('main');
  let doctorPage: Page | undefined;
  try {
    await play.step('ขอ Consult แพทย์เฉพาะทาง — แพทย์ ER อีกท่าน (role Doctor) ขอปรึกษาถึงแพทย์ของบัญชีหลัก · คำขอถูกส่งและแสดงในรายการ Consult ว่ามาจาก ER', async () => {
      doctorPage = await openPatientAs(browser, 'Doctor', visit.hn, visit);
      console.log(`    ผู้ขอ Consult: ${(await doctorPage.getByRole('banner').getByRole('button', { name: /^user / }).innerText()).replace(/\s+/g, ' ')}`);
      try {
        const target = await requestConsult(doctorPage, CONSULT_PROBLEM, { doctor: CONSULT_DOCTOR });
        await recordMenu(doctorPage, 'ประวัติ Consult');
        const pending = doctorPage.getByRole('main').getByRole('row').filter({ hasText: CONSULT_PROBLEM }).filter({ hasText: 'รอตอบกลับ' }).first();
        await expect(pending, 'ประวัติ Consult ต้องมีคำขอจาก ER สถานะ "รอตอบกลับ"').toContainText(CONSULT_DOCTOR.name);
        console.log(`    Consult → ${target}: ${(await pending.innerText()).replace(/\s+/g, ' ')}`);
      } catch (error) {
        await play.dump('consult-request', doctorPage);
        throw error;
      }
    });
    await play.step('ตอบ Consult — แพทย์ที่ถูกขอปรึกษา (บัญชีหลัก) เปิดคำขอที่มาจาก ER แล้วตอบในช่อง "คำตอบ" บันทึกได้', () => replyConsult(page, CONSULT_PROBLEM, CONSULT_ANSWER));
    await play.step('ดูคำตอบ Consult ที่หน้าผู้ป่วย ER — แพทย์ผู้ขอเห็นคำตอบจากแพทย์เฉพาะทาง', async () => {
      if (!doctorPage) throw new Error('ไม่มีหน้าของแพทย์ผู้ขอ (ขั้นขอ Consult ไม่สำเร็จ)');
      try {
        await doctorPage.reload();
        await expect(doctorPage.getByRole('main').getByText(`HN ${visit.hn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await recordMenu(doctorPage, 'ประวัติ Consult');
        // คำขอที่ตอบล่าสุด (แถวเรียงใหม่ → เก่า)
        const answered = doctorPage.getByRole('main').getByRole('row').filter({ hasText: CONSULT_PROBLEM }).filter({ hasText: 'ตอบแล้ว' }).first();
        await expect(answered).toBeVisible();
        console.log(`    แถวหลังตอบ: ${(await answered.innerText()).replace(/\s+/g, ' ')}`);
        await answered.getByRole('button').last().click();
        await expect(doctorPage.getByRole('dialog', { name: /Consult/ })).toContainText(CONSULT_ANSWER);
      } catch (error) {
        await play.dump('consult-answer-view', doctorPage);
        throw error;
      }
    });
  } finally {
    await doctorPage?.context().close();
    await main.page().keyboard.press('Escape').catch(() => undefined);
  }
}

/** UAT-ER-01 กรณี 1.1: Disposition แบบ With Approval → ลงนาม (อยู่หน้าผู้ป่วยของ Visit ER ที่ตรวจแล้ว) */
async function approvalDischargeSteps(play: Play, page: Page) {
  const main = page.getByRole('main');
  await play.step('กรณี 1.1 เริ่ม Disposition เลือก With Approval กรอกช่องบังคับ — สถานะ DRAFT', async () => {
    await openDisposition(page);
    expect(await draftDischarge(page, 'With Approval')).toBe('DRAFT');
  });

  await play.step('กรณี 1.1 ลงนามเอกสาร Disposition — เอกสารแสดงสถานะลงนามแล้ว', async () => {
    await signDischarge(page);
    await expect(main.getByRole('button', { name: 'เปิดแก้ไข' })).toBeVisible();
  });
}

/** UAT-ER-01 กรณี 1.1: ออกใบรับรองแพทย์ — แบบตั้งต้นสร้างไม่ได้ให้ลองแบบลาป่วยต่อ (ER01_CERT=<ชื่อเอกสาร> เลือกแบบเอง) */
async function certificateSteps(play: Play, page: Page, visit: ErVisit) {
  const certificate = await play.step('กรณี 1.1 ออกใบรับรองแพทย์', async () => {
    const name = await createMedicalCertificate(page, process.env.ER01_CERT ? new RegExp(process.env.ER01_CERT) : undefined);
    console.log(`    ใบรับรองแพทย์ที่สร้าง: ${name}`);
    return name;
  });
  // แบบตั้งต้นสร้างไม่ได้ (SBH Prod: แบบ "ใบรับรองแพทย์" ตอบ 404 NoReportData) → ลองแบบลาป่วยให้เห็นว่าออกเอกสารแบบอื่นได้
  if (!certificate && !process.env.ER01_CERT) {
    await play.step('กรณี 1.1 ออกใบรับรองแพทย์ (แบบ "ใบรับรองแพทย์ลาป่วย" — แบบตั้งต้นสร้างไม่ได้)', async () => {
      // เปิดหน้าผู้ป่วยใหม่ ทิ้งแบบฟอร์มที่บันทึกไม่ผ่านซึ่งยังค้างอยู่ในแผงเอกสาร
      await gotoVisit(page, visit);
      console.log(`    ใบรับรองแพทย์ที่สร้าง: ${await createMedicalCertificate(page, /ใบรับรองแพทย์ลาป่วย/)}`);
    });
  }
}

/** UAT-ER-01 กรณี 1.3: Reopen Disposition ที่ลงนามแล้ว → แก้ → ลงนามใหม่ → ตรวจผู้ทำและเวลา */
async function reopenSteps(play: Play, page: Page) {
  const main = page.getByRole('main');
  await play.step('กรณี 1.3 Reopen Disposition ที่ลงนามแล้ว (ปุ่ม "เปิดแก้ไข") — แก้ไขข้อมูลได้', async () => {
    await openDisposition(page);
    await main.getByRole('button', { name: 'เปิดแก้ไข' }).click();
    await expect(page.getByText('เปิดแก้ไขการจำหน่ายผู้ป่วย ER แล้ว')).toBeVisible();
    await expect(main.getByRole('textbox', { name: 'ระบุข้อมูลทางคลินิกและการดำเนินโรค' })).toBeEnabled();
  });

  await play.step('กรณี 1.3 แก้ข้อมูลและลงนามใหม่ — ลงนามสำเร็จ ข้อมูลเป็นค่าที่แก้แล้ว', async () => {
    const clinical = main.getByRole('textbox', { name: 'ระบุข้อมูลทางคลินิกและการดำเนินโรค' });
    await clinical.fill('แก้ไขหลัง Reopen (UAT-ER-01 กรณี 1.3)');
    const saved = nextMutation(page, /mutation SaveErDischargeDraft/);
    await main.getByRole('button', { name: 'บันทึกฉบับร่าง' }).click();
    await expectOk(await saved, 'บันทึกฉบับร่างหลังแก้');
    await signDischarge(page);
    await expect(clinical).toHaveValue('แก้ไขหลัง Reopen (UAT-ER-01 กรณี 1.3)');
  });

  await play.step('กรณี 1.3 ตรวจผู้ทำและเวลาการ Disposition — ระบบเก็บชื่อผู้ทำและเวลา', async () => {
    const stamp = (await main.getByText(/แก้ไขล่าสุดโดย/).allInnerTexts()).at(-1) ?? '';
    console.log(`    Disposition: ${stamp.replace(/\s+/g, ' ')}`);
    expect(stamp, 'ต้องแสดงผู้ทำและเวลา').toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(stamp, 'ชื่อผู้ทำต้องเป็นชื่อคน ไม่ใช่รหัส (UUID)').not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
}

/** UAT-ER-01 กรณี 1.2: Disposition แบบปฏิเสธการรักษา → ลงนาม (อยู่หน้าผู้ป่วยของ Visit ER ที่ตรวจแล้ว) */
async function refuseTreatmentSteps(play: Play, page: Page) {
  const main = page.getByRole('main');
  const detail = main.getByRole('textbox', { name: 'ระบุรายละเอียดเพิ่มเติม' });
  const reason = 'ผู้ป่วยขอกลับบ้านเอง (UAT-ER-01 กรณี 1.2)';
  await play.step(`กรณี 1.2 เริ่ม Disposition แบบปฏิเสธการรักษา ("${DISCHARGE_AGAINST_ADVICE}") กรอกช่องบังคับ — สถานะ DRAFT`, async () => {
    await openDisposition(page);
    expect(await draftDischarge(page, DISCHARGE_AGAINST_ADVICE, reason)).toBe('DRAFT');
    if (await detail.isVisible()) await expect(detail, 'ค่า "รายละเอียดเพิ่มเติม" ต้องยังอยู่หลังบันทึกฉบับร่าง').toHaveValue(/ผู้ป่วยขอกลับบ้านเอง/, { timeout: 6_000 });
    await expect(page.getByTestId('er-disposition-finalize'), 'ปุ่มลงนามต้องกดได้หลังบันทึกฉบับร่าง').toBeEnabled({ timeout: 6_000 });
  });
  await play.step('กรณี 1.2 ลงนามเอกสาร Disposition — เอกสารแสดงสถานะลงนามแล้ว', async () => {
    if ((await detail.isVisible()) && !(await detail.inputValue())) await detail.fill(reason);
    await signDischarge(page);
    await expect(main.getByRole('button', { name: 'เปิดแก้ไข' })).toBeVisible();
  });
}

/** UAT-ER-01: One Day Order — ยา + Lab + Imaging → ส่งคำสั่ง */
async function orderStep(play: Play, page: Page) {
  const main = page.getByRole('main');
  await careMenu(page, 'One Day Order', main.getByRole('heading', { name: 'Order', exact: true }));
  // ยา: สคริปต์ยังเลือก Route ไม่ได้ทุกครั้ง — พังแล้วจดไว้ แล้วสั่ง Lab / Imaging ต่อ
  const medicine = await addMedicineToCart(page, MED_CODE).then(
    () => true,
    async (error: Error) => {
      await play.dump('medicine-form');
      play.note(`สั่งยา ${MED_CODE} ไม่สำเร็จ (สคริปต์): ${error.message.split('\n')[0]} — กด "เพิ่มลงตะกร้า" ตอนยังไม่ระบุ Route ระบบเงียบ ไม่แจ้งว่าขาดช่องไหน`);
      return false;
    },
  );
  // ER01_MED_ONLY=1: Lab / Imaging ของผู้ป่วยรายนี้ส่งไปแล้ว → ส่งเฉพาะยาที่อยู่ในตะกร้า
  // ER01_ORDER_CODES=<รหัส,รหัส>: เพิ่มเฉพาะรหัสที่ระบุ (เล่นซ้ำกับตะกร้าที่มีบางรายการอยู่แล้ว)
  const codes = process.env.ER01_ORDER_CODES !== undefined ? process.env.ER01_ORDER_CODES.split(',').filter(Boolean) : [SETTINGS.labCode, SETTINGS.imagingCode];
  // กดส่งคำสั่งแล้วค้าง: จดคำขอที่หน้าเว็บส่งไปแล้วยังไม่ได้คำตอบ ไว้บอกว่าค้างที่ API ตัวไหน
  const pending = new Map<string, number>();
  const key = (req: Request) => `${req.method()} ${new URL(req.url()).pathname} ${(req.postData() ?? '').match(/(mutation|query)\s+\w+/)?.[0] ?? ''}`.trim();
  const started = (req: Request) => void pending.set(key(req), Date.now());
  const ended = (req: Request) => void pending.delete(key(req));
  page.on('request', started);
  page.on('requestfinished', ended);
  page.on('requestfailed', ended);
  try {
    await submitOrders(page, process.env.ER01_MED_ONLY ? [] : codes);
  } catch (error) {
    console.log(`    คำขอที่ยังไม่ได้คำตอบตอนส่งคำสั่งไม่ผ่าน: ${[...pending].map(([name, at]) => `${name} (${Math.round((Date.now() - at) / 1000)} วิ)`).join(' ‖ ') || '(ไม่มี)'}`);
    throw error;
  } finally {
    page.off('request', started);
    page.off('requestfinished', ended);
    page.off('requestfailed', ended);
  }
  // สถานะของแถวเป็น alt ของรูป (ไม่อยู่ในข้อความ) → ดูจากชื่อแถว
  if (medicine) await expect(main.getByRole('row', { name: new RegExp(`^(ส่งแล้ว|กำลังดำเนินการ) \\[${MED_CODE}\\]`) }).first(), 'ยาต้องถูกส่งคำสั่งแล้ว').toBeVisible();
  expect(medicine, 'ต้องสั่งยาได้ด้วย (Lab / Imaging ส่งคำสั่งแล้ว)').toBe(true);
  play.note(
    SYSTEM === 'dev-x'
      ? 'Order ประเภท Activity (หัตถการ) ไม่ได้สั่งบน dev-x — รหัส SBHACT62 ส่งคำสั่งแล้ว "activity category 11 is inactive" และทำให้รายการอื่นในตะกร้าไม่ถูกส่ง (เจอ 3 ต.ค. 2026)'
      : 'Order ประเภท Activity (หัตถการ) ยังไม่ได้สั่งในสคริปต์นี้',
  );
}

/** ผู้ป่วย "UAT ER01-xx" ลำดับล่าสุดที่ลงทะเบียนแล้วแต่ยังไม่เคยมี Encounter (ค้างจากรอบที่พังหลังลงทะเบียน) — ไม่มีคืน undefined */
async function registeredWithoutEncounter(page: Page, authorization: string): Promise<{ hn: string; name: string } | undefined> {
  const headers = { authorization };
  const found = await page.request.get(`/new-demographic-api/patients?filter[name][startsWith]=${encodeURIComponent('ER01-')}&perPage=1000`, { headers });
  if (!found.ok()) return undefined;
  const { data } = (await found.json()) as { data: { hn: string; firstName: string; familyName?: string | null }[] };
  const latest = data.filter((p) => p.firstName === 'UAT' && /^ER01-\d+$/.test(p.familyName ?? '')).sort((a, b) => (a.familyName! < b.familyName! ? 1 : -1))[0];
  if (!latest) return undefined;
  const encounters = await page.request.get(`/generated-emr-api/encounters?filter[hn][equals]=${latest.hn}&perPage=5`, { headers });
  if (!encounters.ok() || ((await encounters.json()) as { data: unknown[] }).data.length) return undefined;
  return { hn: latest.hn, name: `${latest.firstName} ${latest.familyName}` };
}

test.describe(`เล่น Scenario UAT ER (${SYSTEM})`, () => {
  test.setTimeout(900_000);

  test('UAT-ER-10 ลงทะเบียนผิดคน แล้วยกเลิก Encounter (Mock ราย C)', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-10');
    const authorization = trackAuthorization(page);
    const c = mockPatient('C');
    play.patient('Mock ราย C', c);
    await gotoErDashboard(page);

    await play.step('เปิด Visit ผิดคน — ได้ EN ของผู้ป่วยผิดราย (Mock ราย C เปิด Visit ไว้แล้ว)', async () => {
      const encounter = await boardEncounter(page, authorization(), c.en);
      expect(encounter?.latestStatusCode, `Encounter ${c.en} บนบอร์ด`).toBe('in-progress');
      await expect(page.getByText(`HN: ${c.hn}`, { exact: true })).toBeVisible();
    });

    await play.step('ยกเลิก Visit (Cancel Encounter) จากช่องสถานะขวาบนของหน้าผู้ป่วย', async () => {
      await page.getByText(`HN: ${c.hn}`, { exact: true }).click();
      await expectVisitHeader(page, c);
      await statusSelect(page).click();
      await options(page).filter({ hasText: /^ยกเลิก$/ }).click();
      const dialog = page.getByRole('dialog', { name: /ต้องการยกเลิก/ });
      await expect(dialog).toContainText(c.en);
      await dialog.getByRole('textbox', { name: 'ระบุเหตุผลการยกเลิก' }).fill('ลงทะเบียนผิดคน UAT-ER-10');
      const cancelled = nextMutation(page, /cancel/i);
      await dialog.getByRole('button', { name: 'ยืนยัน' }).click();
      await expectOk(await cancelled, `ยกเลิก Encounter ${c.en}`);
      await expect(async () => expect((await boardEncounter(page, authorization(), c.en))?.latestStatusCode).toBe('cancelled')).toPass({ timeout: 20_000 });
    });

    await play.step('มุมมอง "รายการ": ผู้ป่วยผิดรายไม่อยู่ในผู้ป่วยปัจจุบัน และไปอยู่แท็บ "ยกเลิก"', async () => {
      await page.goto('/cortex/er/dashboard?view=list');
      const main = page.getByRole('main');
      await expect(main.getByRole('tab', { name: /ผู้ป่วยปัจจุบันใน ER/ })).toBeVisible({ timeout: 60_000 });
      await main.getByPlaceholder('ค้นหา HN').fill(c.hn);
      const row = main.getByRole('row').filter({ hasText: c.hn });
      await expect(row, 'แท็บผู้ป่วยปัจจุบันต้องไม่มีผู้ป่วยรายนี้').toHaveCount(0);
      await main.getByRole('tab', { name: /^ยกเลิก/ }).click();
      await expect(row.first(), 'แท็บ "ยกเลิก" ต้องมีผู้ป่วยรายนี้').toBeVisible();
    });
    play.finish();
  });

  test('UAT-ER-09 พยาบาลรับเวรและจัดการงาน (Mock ราย A)', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-09');
    const authorization = trackAuthorization(page);
    const a = mockPatient('A');
    play.patient('Mock ราย A', a);
    await gotoVisit(page, a);
    const main = page.getByRole('main');

    await play.step('Assign พยาบาล: หน้า Overview ระบุพยาบาลผู้ดูแลในช่อง "พยาบาล"', async () => {
      await main.getByRole('combobox', { name: 'พยาบาล' }).click();
      const saved = nextMutation(page, /cortex-api/);
      await expect(options(page).first()).toBeVisible();
      const nurse = (await options(page).first().innerText()).trim();
      await options(page).first().click();
      const res = await saved;
      console.log(`    assign nurse "${nurse}": ${res.request().method()} ${new URL(res.url()).pathname} ${(res.request().postData() ?? '').slice(0, 200)} → ${res.status()}`);
      await expectOk(res, 'บันทึกพยาบาลผู้ดูแล');
      await expect(main.getByText(nurse).first()).toBeVisible();
    });

    const tasks = await fetchNurseTasks(page, authorization(), a.en);
    console.log(`    งานพยาบาลของราย A: ${tasks.map((t) => `${t.id} ${t.name} ${t.status}`).join(' | ')}`);
    const patientButton = main.getByRole('button', { name: new RegExp(`HN ${a.hn} `) });

    await play.step('เปิด "รายการงานพยาบาล" — แสดงรายการผู้ป่วยทั้งหมดที่มีรายการงานพยาบาล', async () => {
      await openErMenu(page, 'รายการงานพยาบาล');
      await expect(page).toHaveURL(/\/er\/nurse-task-list/);
      await expect(patientButton).toBeVisible({ timeout: 30_000 });
    });

    const acceptButton = main.getByRole('button', { name: 'รับงาน', exact: true });
    /** กดรับงาน 1 งาน (รอรับงาน → กำลังทำ) */
    const accept = async () => {
      const accepted = nextMutation(page, /nurse-tasks\/[^/]+\/accept/);
      await acceptButton.first().click({ timeout: 8_000 });
      await expectOk(await accepted, 'รับงานพยาบาล');
    };

    // ER09_SKIP_FINISH=1: ข้ามขั้นปิดงาน (หน้าต่าง "บันทึกการทำงาน" ค้างแล้วบังขั้นยกเลิก) เพื่อเล่นขั้นยกเลิกอย่างเดียว
    if (process.env.ER09_SKIP_FINISH) await patientButton.first().click({ timeout: 8_000 });
    else await play.step('อัปเดตสถานะงานจาก "รอรับงาน" → "กำลังทำ" → "เสร็จสิ้น" (งานที่เสร็จแล้วแก้ไขไม่ได้)', async () => {
      await patientButton.first().click({ timeout: 8_000 });
      const finish = main.getByRole('button', { name: /เสร็จ/ });
      // เล่นซ้ำกับผู้ป่วยรายเดิมที่มีงาน "กำลังทำ" ค้างอยู่ ไม่ต้องรับงานเพิ่ม
      if (!(await finish.count())) await accept();
      await finish.first().click({ timeout: 8_000 });
      // SBH Prod: กดเสร็จแล้วมีหน้าต่าง "บันทึกการทำงาน" (ทำโดย* · ทำเมื่อ*) → บันทึก
      const dialog = page.getByRole('dialog', { name: 'บันทึกการทำงาน' });
      await expect(dialog).toBeVisible();
      const doneBy = dialog.getByRole('combobox', { name: '* ทำโดย' });
      await doneBy.click();
      await pick(options(page).first());
      await play.dump('task-done-dialog');
      const calls = await watchMutations(page, async () => {
        // ปุ่มบันทึกหมุน (loading) ค้างตั้งแต่เลือก "ทำโดย" — กดตอนหมุนอยู่ไม่มีผล → รอให้หยุดหมุนก่อนกด
        const save = dialog.getByRole('button', { name: 'บันทึก', exact: true });
        await expect(save, 'ปุ่มบันทึกต้องหยุดหมุนก่อนกด').toBeVisible({ timeout: 60_000 });
        await save.click();
        // กดบันทึกแล้วอาจมีหน้าต่างยืนยันซ้อน → กดยืนยันถ้ามี
        const confirm = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ }).getByRole('button', { name: /^ยืนยัน/ }).last();
        if (await confirm.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) await confirm.click();
        await expect(dialog).toBeHidden({ timeout: 30_000 });
      }).catch(async (error: Error) => {
        await play.dump('task-done-stuck');
        throw error;
      });
      console.log(`    ปิดงานพยาบาล: ${calls.map((call) => call.slice(0, 260)).join(' ‖ ') || '(ไม่มีคำสั่งถูกส่ง)'}`);
      await play.dump('task-done');
      expect((await fetchNurseTasks(page, authorization(), a.en)).filter((t) => /DONE|COMPLET|FINISH/i.test(t.status)).length, 'ต้องมีงานที่สถานะเสร็จสิ้น').toBeGreaterThan(0);
    });

    // ER09_SKIP_CANCEL=1: ข้ามขั้นยกเลิก (ผู้ป่วยมีงานเดียวและใช้กับขั้นปิดงานไปแล้ว)
    if (!process.env.ER09_SKIP_CANCEL) await play.step('ยกเลิกงานพยาบาล: จาก "กำลังทำ" → "ยกเลิก" (งานที่ยกเลิกแล้วแก้ไขไม่ได้)', async () => {
      if (await acceptButton.count()) await accept();
      const cancel = main.getByRole('button', { name: /^ยกเลิก/ });
      await cancel.first().click({ timeout: 8_000 });
      await play.dump('task-cancel');
      const dialog = page.locator('.ant-modal-content:visible, .ant-popover:visible, .ant-popconfirm:visible').last();
      const calls = await watchMutations(page, async () => {
        if (await dialog.isVisible().catch(() => false)) {
          const reason = dialog.getByRole('textbox').first();
          if (await reason.isVisible().catch(() => false)) await reason.fill('ยกเลิกงาน (UAT-ER-09)');
          await dialog.getByRole('button', { name: /ยืนยัน|บันทึก|ตกลง|ยกเลิกงาน/ }).last().click();
        }
      });
      console.log(`    ยกเลิกงานพยาบาล: ${calls.map((call) => call.slice(0, 260)).join(' ‖ ') || '(ไม่มีคำสั่งถูกส่ง)'}`);
      expect((await fetchNurseTasks(page, authorization(), a.en)).filter((t) => /CANCEL/i.test(t.status)).length, 'ต้องมีงานที่สถานะยกเลิก').toBeGreaterThan(0);
    });

    const after = await fetchNurseTasks(page, authorization(), a.en).catch(() => []);
    play.note(`งานพยาบาลของราย A หลังเล่น: ${after.map((t) => `${t.name} = ${t.status}`).join(' · ') || '(อ่านไม่ได้)'}`);
    play.finish();
  });

  test('UAT-ER-01 ผู้ป่วยมี HN เดิม ตรวจแล้วจำหน่าย แยกตามประเภท Disposition', async ({ page, browser }) => {
    const play = new Play(page, 'UAT-ER-01');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    // ER01_RESUME=1: รอบก่อนเปิด Visit ของรายที่ 1 ได้แล้วแต่พังก่อนคัดกรอง → เล่นต่อจากขั้นกรอกฟอร์มคัดกรองกับ Visit เดิม (จดไว้ใน patients.json)
    const resumed = process.env.ER01_RESUME ? loadPatients()['er01-1'] : undefined;
    /** ขั้น 1–3: หาผู้ป่วยรายที่ 1 → ค้นหา → ตรวจข้อมูล → เปิด Visit ER */
    const openFirstVisit = async (): Promise<{ visit: ErVisit; reuseC: boolean }> => {
      await gotoErDashboard(page);

      // รายที่ 1 (กรณี 1.1 + 1.3): Mock ราย C ถ้า Visit ที่เปิดผิดคนถูกยกเลิกแล้ว (เล่น UAT-ER-10 ก่อน) → มี HN + ประวัติแพ้ยา ไม่มี Visit ค้าง
      // ถ้ายังไม่ถูกยกเลิก: ลงทะเบียนใหม่แล้วไม่เปิด Visit (R24)
      const c = mockPatient('C');
      // ER01_FRESH=1: ไม่ใช้ราย C (เช่น ราย C มี Visit ER ของรอบก่อนค้างอยู่) → ลงทะเบียนผู้ป่วยใหม่ให้มี HN ก่อน
      const reuseC = !process.env.ER01_FRESH && (await boardEncounter(page, authorization(), c.en))?.latestStatusCode === 'cancelled';
      let p1: { hn: string; name: string; citizenId?: string };
      if (reuseC) {
        p1 = c;
      } else {
        // รอบก่อนพังหลังลงทะเบียน (ผู้ป่วย "UAT ER01-xx" มี HN แล้วแต่ยังไม่เคยมี Encounter) → ใช้รายนั้นต่อ ไม่ลงทะเบียนเพิ่ม
        const orphan = await registeredWithoutEncounter(page, authorization());
        if (orphan) {
          p1 = orphan;
        } else {
          const fresh = await nextUatPatient(page, authorization(), 1);
          p1 = { hn: await registerWithoutVisit(page, fresh), name: `${fresh.firstName} ${fresh.familyName}`, citizenId: fresh.citizenId };
          // SBH Prod: API บอร์ดตอบช้าเป็นพักๆ → กลับ Dashboard ทางเมนูไม่ทัน ให้เปิดหน้า Dashboard ตรงๆ (รอได้นานกว่า)
          await openErDashboardFromMenu(page).catch(() => gotoErDashboard(page));
        }
      }
      console.log(`    รายที่ 1: ${reuseC ? 'Mock ราย C' : 'เปิดใหม่'} ${p1.name} HN ${p1.hn}`);

      await play.step('ค้นหาผู้ป่วยด้วย HN / ชื่อ-สกุล / เลขบัตรประชาชน — ทุกวิธีพบผู้ป่วยรายเดียวกัน', async () => {
        await openTriagePage(page);
        await page.locator('label').filter({ hasText: 'ผู้ป่วยมี HN' }).click();
        const search = page.getByRole('combobox', { name: 'ค้นหาผู้ป่วยด้วย HN หรือชื่อ' });
        for (const [how, text] of [
          ['HN', p1.hn],
          ['ชื่อ-สกุล', p1.name],
          ['เลขบัตรประชาชน', p1.citizenId ?? ''],
        ]) {
          if (!text) continue;
          await search.fill(text);
          await expect(page.locator(`.ant-select-item-option[title^="${p1.hn} - "]`), `ค้นด้วย${how} "${text}" ต้องพบ HN ${p1.hn}`).toBeVisible({ timeout: 12_000 });
          await search.fill('');
        }
      });

      let dialog = openVisitDialog(page);
      await play.step('ตรวจข้อมูลผู้ป่วยก่อนเปิด Visit — เห็นชื่อ-สกุล รูปถ่าย', async () => {
        dialog = await selectExistingPatient(page, p1.hn);
        await expect(dialog).toContainText(p1.name);
        if (!(await dialog.locator('img[src], .ant-avatar, .ant-image').count())) play.note('modal เปิด Visit ไม่มีรูปถ่ายผู้ป่วย (ผู้ป่วย Mock ไม่ได้อัปโหลดรูป — R31 ข้อ 5.3)');
        if (!(await dialog.getByText(/แพ้/).count())) play.note('modal เปิด Visit ไม่มีส่วนแสดงประวัติแพ้ยา');
      });

      const visit = await play.step('เปิด Visit ER สิทธิ UC — ขึ้น "สร้าง Visit สำเร็จ" และหัวจอแสดงเลข EN', async () => {
        // แถว "รายการเข้ารับบริการ" ขึ้น "ไม่พบเวลาที่สามารถลงได้" (SBH Prod 3 ต.ค. 2026 หลัง 21:00) → ปุ่มยืนยันกดแล้วไม่ส่งคำสั่ง
        // ลองเลือกแพทย์ในแถวดูก่อน ถ้ายังไม่มีเวลาให้ลงก็หยุดพร้อมข้อความของระบบ
        const noSlot = dialog.getByText('ไม่พบเวลาที่สามารถลงได้');
        if (await noSlot.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) {
          const doctor = dialog.getByRole('row').filter({ hasText: 'ไม่พบเวลาที่สามารถลงได้' }).getByRole('combobox').first();
          await doctor.click({ timeout: 5_000 }).catch(() => undefined);
          if (!(await options(page).first().isVisible())) {
            await doctor.focus();
            await page.keyboard.press('ArrowDown');
          }
          const doctors = await options(page).first().waitFor({ state: 'visible', timeout: 5_000 }).then(() => options(page).allInnerTexts(), () => [] as string[]);
          console.log(`    แถวเข้ารับบริการ: ${(await dialog.getByRole('row').filter({ hasText: 'Walk-in' }).first().innerText()).replace(/\s+/g, ' ')} | แพทย์ที่เลือกได้: ${doctors.map((text) => text.trim()).join(' | ') || '(ไม่มี)'}`);
          if (doctors.length) await pick(options(page).first());
          else await dialog.getByText('เปิด Visit ER', { exact: true }).click();
          await expect(noSlot, 'ระบบแจ้ง "ไม่พบเวลาที่สามารถลงได้" ที่ห้องตรวจแผนกฉุกเฉิน — เปิด Visit ER ไม่ได้').toBeHidden({ timeout: 10_000 });
        }
        const opened = await confirmOpenErVisit(page, dialog, COVERAGE_UC);
        await expectVisitHeader(page, opened);
        return opened;
      });
      if (!visit) {
        play.note('เปิด Visit ไม่ได้ จึงเล่นขั้นที่เหลือของรายที่ 1 ไม่ได้');
        play.finish();
        throw new Error('UAT-ER-01: เปิด Visit ER ไม่สำเร็จ');
      }
      play.patient(reuseC ? 'Mock ราย C (หลังยกเลิก Visit ใน UAT-ER-10)' : 'เปิดใหม่ (กรณี 1.1 / 1.3)', { ...visit, name: p1.name });
      savePatient('er01-1', { ...visit, name: p1.name, citizenId: p1.citizenId });
      return { visit, reuseC };
    };
    const { visit, reuseC } = resumed ? { visit: resumed, reuseC: false } : await openFirstVisit();
    if (resumed) {
      console.log(`    รายที่ 1 (เล่นต่อจาก Visit เดิม): ${resumed.name} HN ${resumed.hn} ${resumed.en}`);
      play.patient('เล่นต่อจาก Visit เดิม (กรณี 1.1 / 1.3)', resumed);
      await gotoVisit(page, resumed);
    }
    const form = triageForm(page);

    await play.step('กรอกฟอร์มคัดกรองให้ครบ (วิธีการมาถึง · สัญญาณชีพ · Pain Score · อาการนำ · แพ้ยา · GCS) — MEWS คำนวณเอง', async () => {
      // SBH Prod: API ของหน้าผู้ป่วยตอบ 500 เป็นพักๆ แล้วฟอร์มคัดกรองไม่ขึ้น → เปิดหน้าผู้ป่วยใหม่แล้วลองอีกครั้ง
      await expectTriageFormOpen(page, visit).catch(async () => {
        await gotoVisit(page, visit);
        await expectTriageFormOpen(page, visit);
      });
      await expect(page.getByRole('region', { name: 'วิธีการมาถึง' }).getByRole('radio', { name: 'Walk-in' })).toBeChecked();
      await fillTriage(page, visit, { vitals: VITALS_NORMAL });
      await expect(labelledBox(form, 'Total MEWS')).toHaveText(/Total MEWS\s*\d+/);
      if (reuseC && !(await form.getByRole('row').filter({ hasText: /paracetamol/i }).count())) {
        play.note('ฟอร์มคัดกรองหัวข้อ "ประวัติแพ้" ไม่ดึงประวัติแพ้ยาเดิมของผู้ป่วย (paracetamol) มาแสดง');
      }
    });

    await play.step('เลือกระดับความเร่งด่วน (ESI) — ระบบแสดงระดับที่แนะนำ และเลือกโซนที่แนะนำตามระดับให้', async () => {
      if (!(await form.getByRole('button', { name: /^[1-5] .*แนะนำ/ }).count())) play.note('ฟอร์มคัดกรองไม่มีระดับ ESI ที่ "ระบบแนะนำ" (มีเฉพาะโซนที่แนะนำหลังเลือกระดับ)');
      await form.getByRole('button', { name: ESI_BUTTON[4] }).click();
      await expect(form.getByRole('button', { name: /โซนเหลือง ER.*แนะนำ/ })).toBeVisible();
    });

    await play.step('บันทึกคัดกรอง — หน้าเป็น Overview แสดงระดับและโซน · ผู้ป่วยขึ้นคอลัมน์โซนบน ER Dashboard', async () => {
      await saveTriageForm(page, visit);
      await expect(main.getByText(/Triage Zone\s*โซนเหลือง ER/).first()).toBeVisible();
      // SBH Prod ตัดการเชื่อมต่อ / ตอบ 500 เป็นพักๆ → อ่านข้อมูลบอร์ดซ้ำได้
      await expect(async () => expect((await boardEncounter(page, authorization(), visit.en))?.triageLevel, 'ระดับคัดกรองบนบอร์ด').toBeTruthy()).toPass({ timeout: 30_000 });
    });

    await play.step('เปิดผู้ป่วยจาก ER Dashboard — คลิกการ์ดแล้วเข้าหน้าผู้ป่วย', async () => {
      await openErDashboardFromMenu(page);
      await page.getByText(`HN: ${visit.hn}`, { exact: true }).click();
      await expectVisitHeader(page, visit);
    });

    await play.step('บันทึก ER Physician Note — บันทึกสำเร็จ เปิดดูซ้ำแล้วข้อมูลยังอยู่', async () => {
      await savePhysicianNote(page);
      await expect(main.getByText(/แก้ไขล่าสุดโดย/).first()).toBeVisible();
    });

    await play.step('บันทึกประวัติแพ้ยา (บันทึกการแพ้) — Banner ผู้ป่วยแสดงรายการแพ้ยา', async () => {
      await recordDrugAllergy(page, reuseC ? 'ibuprofen' : 'paracetamol');
    });

    await consultSteps(play, page, browser, visit);

    await play.step('สั่ง Order (ยา / Lab / Imaging) → เพิ่มลงตะกร้า → ส่งคำสั่ง — รายการแสดงที่ Order Summary', () => orderStep(play, page));

    await approvalDischargeSteps(play, page);
    await certificateSteps(play, page, visit);
    await reopenSteps(play, page);

    // ───── รายที่ 2 (กรณี 1.2 ปฏิเสธการรักษา): ลงทะเบียนใหม่ให้มี HN ก่อน (R24) · ขั้นร่วมทำครบแบบย่อ (R27)
    const second = await play.step('กรณี 1.2 รายที่ 2: ผู้ป่วยมี HN → เปิด Visit ER สิทธิ UC → คัดกรอง ESI 4 → ER Physician Note', async () => {
      await openErDashboardFromMenu(page);
      const fresh = await nextUatPatient(page, authorization(), 1);
      const hn = await registerWithoutVisit(page, fresh);
      await openErDashboardFromMenu(page);
      const opened = await openErVisitForHn(page, hn);
      const played: Played = { ...opened, name: `${fresh.firstName} ${fresh.familyName}`, citizenId: fresh.citizenId };
      play.patient('เปิดใหม่ (กรณี 1.2)', played);
      savePatient('er01-2', played);
      recordMockPatient('เล่น 01 (1.2)', fresh, opened, 'UAT-ER-01 กรณี 1.2 ปฏิเสธการรักษา');
      await expectTriageFormOpen(page, opened);
      await fillTriage(page, opened, { level: 4, vitals: VITALS_NORMAL });
      await saveTriageForm(page, opened);
      await savePhysicianNote(page);
      return played;
    });

    if (second) await refuseTreatmentSteps(play, page);
    play.finish();
  });

  // ขั้นของ UAT-ER-01 ที่รอบแรกสคริปต์ทำไม่ผ่าน — เล่นซ้ำกับผู้ป่วยชุดเดิม (จดไว้ใน patients.json)
  test('UAT-ER-01-ต่อ เล่นซ้ำขั้นที่ค้างกับผู้ป่วยชุดเดิม', async ({ page, browser }) => {
    const play = new Play(page, 'UAT-ER-01-ต่อ');
    // เลือกขั้นที่จะเล่นซ้ำด้วย ER01_STEPS (คั่นด้วย ,): consult · order · dispose · cert · reopen (รายที่ 1) · refuse (รายที่ 2) — ไม่ใส่ = cert,refuse
    const steps = (process.env.ER01_STEPS ?? 'cert,refuse').split(',');
    const { 'er01-1': first, 'er01-2': second } = loadPatients();
    if (steps.some((step) => step !== 'refuse')) await gotoVisit(page, first);
    if (steps.includes('consult')) await consultSteps(play, page, browser, first);
    if (steps.includes('order')) await play.step('สั่ง Order (ยา / Lab / Imaging) → เพิ่มลงตะกร้า → ส่งคำสั่ง — รายการแสดงที่ Order Summary', () => orderStep(play, page));
    if (steps.includes('dispose')) await approvalDischargeSteps(play, page);
    if (steps.includes('cert')) await certificateSteps(play, page, first);
    if (steps.includes('reopen')) await reopenSteps(play, page);
    if (steps.includes('refuse')) {
      await gotoVisit(page, second);
      await refuseTreatmentSteps(play, page);
    }
    play.finish();
  });

  // ขั้น Consult ของ UAT-ER-01 — เล่นซ้ำกับผู้ป่วยรายที่ 1 คนเดิม (จดไว้ใน patients.json)
  test('UAT-ER-01-Consult แพทย์อีกท่านขอ Consult ถึงแพทย์ของบัญชีหลัก → ตอบ → ดูคำตอบ', async ({ page, browser }) => {
    const play = new Play(page, 'UAT-ER-01-Consult');
    const first = loadPatients()['er01-1'];
    play.patient('ผู้ป่วยรายที่ 1 ของ UAT-ER-01', first);
    await gotoVisit(page, first);
    await consultSteps(play, page, browser, first);
    play.finish();
  });
});
