import type { Browser, Locator, Page } from '@playwright/test';
import { closeCoverageWithEndpoint, closeVisitAtCashier, gotoCashierAccount, payAllInCash } from '../helpers/functions/cashier';
import { expectOk, waitForApi } from '../helpers/functions/er';
import { graphqlMutation } from '../helpers/functions/er-disposition';
import { trackAuthorization } from '../helpers/functions/er-report';
import { checkStep } from '../helpers/functions/evidence';
import { opdListRow, selectOpdUnit } from '../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, openNewVisitPanel, saveNewPatient } from '../helpers/functions/reception';
import { getCredentials } from '../utils/env';
import { cacheAppAssets, expect, test } from './fixtures';
import { SYSTEM, addCoverageFirst, checkInOpdVisit, createPrescription, nextPrefixedPatient, openOpdVisit, recordMockPatient, scheduleWalkInRequest } from './uat-er';
import { addMedicineToCart } from './uat-play';

// Mock Data: ผู้ป่วย OPD 1 ราย สิทธิ UC → สั่งยา → Discharge โดยพยาบาลแบบส่ง Refer (By Transfer) + เอกสาร Refer out → ชำระเงิน → ปิด Visit → รับยา
// ผู้ใช้ขอ 19 ต.ค. 2026 · ชื่อ "UAT" นามสกุล REFER-<ลำดับ> · ทำครั้งแรกผ่านเทสสำรวจ (UAT REFER-01) — สคริปต์นี้ยังไม่เคยรันทั้งเส้น
// SBH Prod: npx playwright test -c playwright.sbh-prod.config.ts UAT-OPD-refer --headed --output=.cache/run-referout
// ต้องมีบัญชี Nurse ใน .env ของระบบ (บัญชีแพทย์กดจำหน่ายไม่ได้ — "ผู้ใช้งานบทบาทแพทย์ไม่สามารถจำหน่ายผู้ป่วยได้")
// ปิดสิทธิ UC ด้วย End Point เลขสุ่ม (บัตร 60) ก่อนชำระเงินสด · MOCK_ENDPOINT=<เลข> ใช้เลขนี้แทน

const LABEL = 'REFER';
const COVERAGE = process.env.MOCK_COVERAGE || 'H03 - สิทธิ UC';
const MED_CODE = SYSTEM === 'dev-x' ? 'med0000005' : 'MED0000260';
/** ช่องสถานพยาบาลปลายทางค้นไม่ได้ (GET /generated-emr-api/hospitals ตอบ 422 — 19 ต.ค. 2026) → พิมพ์ชื่อเอง (ผู้ใช้อนุญาต) */
const DEST_HOSPITAL = process.env.MOCK_REFER_HOSPITAL || 'โรงพยาบาลพระพุทธบาท';
const REFER = { type: 'รับไว้รักษาต่อ', dx: 'K30', dxName: 'Functional dyspepsia', reason: 'ส่งต่อเพื่อรับการรักษาต่อ (Mock UAT)' };
const PHARMACY = { name: 'ห้องยาชั้น 1', counter: '1' };

const options = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');
const progress = (message: string) => console.log(`    ผู้ป่วย Refer · ${message}`);

/** ช่องสถานะบนแถบหัวของ Visit OPD (เช็คอิน → พร้อมตรวจ → ตรวจเสร็จ) — graphql TransitionEncounterStatus ไม่มีหน้าต่างยืนยัน */
async function setVisitStatus(page: Page, name: string) {
  const status = page.getByRole('main').locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
  await expect(status).toBeVisible({ timeout: 180_000 });
  if ((await status.textContent()) === name) return;
  const option = options(page).filter({ hasText: new RegExp(`^${name}$`) });
  await expect(async () => {
    await page.keyboard.press('Escape');
    await status.click();
    await expect(option).toBeVisible({ timeout: 5_000 });
  }, `เปิดตัวเลือกสถานะเพื่อเลือก ${name}`).toPass({ timeout: 60_000 });
  const moved = graphqlMutation(page, 'TransitionEncounterStatus', 60_000);
  await option.click();
  const body = (await (await moved).json()) as { data?: { transitionEncounterStatus?: { accepted?: boolean } }; errors?: { message: string }[] };
  expect(body.data?.transitionEncounterStatus?.accepted, `เปลี่ยนสถานะเป็น ${name} ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
  await expect(status).toHaveText(name);
}

/** หน้าต่างแยกของบัญชีพยาบาล — ล็อกอินเอง (ไม่มี session ติดมา: browser.newContext() ของ Playwright Test ใส่ storageState ของ project ให้ถ้าไม่ระบุ) */
async function openAsNurse(browser: Browser): Promise<Page> {
  const { username, password } = getCredentials('Nurse');
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1920, height: 1080 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    recordVideo: { dir: test.info().outputPath('video-Nurse'), size: { width: 1920, height: 1080 } },
  });
  await cacheAppAssets(context);
  const page = await context.newPage();
  await page.goto('/cortex/apps', { timeout: 180_000 });
  const welcome = page.getByRole('button', { name: 'ลงชื่อเข้าใช้' });
  const user = page.locator('#username');
  await welcome.or(user).first().waitFor({ timeout: 180_000 });
  if (await welcome.isVisible()) await welcome.click();
  await user.fill(username);
  await page.locator('#password').evaluate((el, value) => {
    (el as HTMLInputElement).value = value;
  }, password);
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => url.host === new URL(test.info().project.use.baseURL!).host, { timeout: 60_000 });
  return page;
}

/** แผงสร้างเอกสาร "แบบสำหรับส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อ" (เปิดเองเมื่อบันทึก Discharge แบบ By Transfer โดยยังไม่มีเอกสาร) */
async function createReferOutDocument(page: Page) {
  const title = page.getByText('แบบสำหรับส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อ', { exact: true }).first();
  await expect(title).toBeVisible({ timeout: 60_000 });
  let panel: Locator = title;
  for (let i = 0; i < 12; i++) {
    panel = panel.locator('xpath=..');
    if ((await panel.getByRole('button', { name: /บันทึก/ }).count()) && (await panel.getByRole('combobox', { name: 'แพทย์ผู้ลงนาม' }).count())) break;
  }
  const dest = panel.getByRole('combobox', { name: 'สถานพยาบาลปลายทาง' });
  await dest.fill('');
  await dest.pressSequentially(DEST_HOSPITAL, { delay: 40 });
  await page.keyboard.press('Tab');
  await panel.getByRole('radio', { name: REFER.type }).check();
  const dx = panel.getByRole('combobox', { name: 'การวินิจฉัยโรคขั้นต้น' });
  await dx.click();
  await dx.pressSequentially(REFER.dx, { delay: 80 });
  await page.locator('[role="option"]:visible, .ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: REFER.dxName }).first().click();
  await panel.getByRole('textbox', { name: 'สาเหตุการส่งต่อ' }).fill(REFER.reason);
  await expect(dest, 'ชื่อสถานพยาบาลปลายทางที่พิมพ์ต้องค้างอยู่').toHaveValue(DEST_HOSPITAL);
  await panel.getByRole('button', { name: 'save บันทึก' }).click();
  await expect(page.getByText('สร้างแบบสำหรับส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อสำเร็จ')).toBeVisible({ timeout: 60_000 });
  await expect(panel.getByRole('button', { name: /เอกสารที่สร้างแล้ว/ })).not.toContainText(/แล้ว\s*0$/);
}

/** แบบฟอร์ม Discharge: จำหน่ายรูปแบบอื่น = By Transfer → บันทึก (ครั้งแรกระบบบังคับสร้างเอกสาร Refer out) → บันทึกซ้ำได้ COMPLETE */
async function saveReferDischarge(page: Page) {
  const heading = page.getByRole('heading', { name: 'Discharge', level: 3 });
  await expect(heading).toBeVisible({ timeout: 90_000 });
  const type = page.getByRole('combobox', { name: /จำหน่ายรูปแบบอื่น/ });
  await type.scrollIntoViewIfNeeded();
  await type.click();
  await options(page).filter({ hasText: /^By Transfer/ }).click();
  const save = heading.locator('xpath=following::button[normalize-space()="บันทึก"][1]');
  await save.click();
  await createReferOutDocument(page);
  const saved = graphqlMutation(page, 'UpsertOpdDischargeSummary', 60_000);
  await save.click();
  const body = (await (await saved).json()) as { data?: { upsertOpdDischargeSummary?: { statusCode?: string; dischargeTypeCode?: string } }; errors?: { message: string }[] };
  // บันทึกแล้วระบบยิง DischargeEncounterStatus ซ้ำได้ ErrNotAllowDischargeEncounter (Visit จำหน่ายไปแล้วตอนกดปุ่มจำหน่าย) — ไม่กระทบ
  expect(body.data?.upsertOpdDischargeSummary?.statusCode, `บันทึก Discharge ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe('COMPLETE');
  return body.data!.upsertOpdDischargeSummary!.dischargeTypeCode;
}

/** ห้องยา: เปิดใบยาจากแท็บ → กดปุ่มขั้นถัดไป (จัดยาแล้ว → ยืนยันรอจ่าย → ติ๊กยา + จ่ายยา + ยืนยันการทบทวน) */
async function dispensePrescription(page: Page, hn: string, prescription: string) {
  const main = page.getByRole('main');
  await page.goto('/cortex/pharmacy/select-location');
  await main.getByRole('combobox').first().click();
  await options(page).filter({ hasText: PHARMACY.name }).first().click();
  await main.getByRole('combobox').nth(1).click();
  await options(page).filter({ hasText: new RegExp(`^${PHARMACY.counter}$`) }).last().click({ force: true });
  await page.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 120_000 });
  const steps: [string, string, string][] = [
    ['ใบยารอจัด', 'จัดยาแล้ว', 'pack'],
    ['ใบยาจัดแล้ว', 'ยืนยันรอจ่าย', 'verify'],
    ['ใบรอจ่าย', 'จ่ายยา', 'dispense'],
  ];
  for (const [tab, button, action] of steps) {
    await main.getByRole('tab', { name: new RegExp(tab) }).click();
    // แถวแสดงเลขใบยาแบบย่อ (เช่น 01095) → อ้างด้วย HN · คลิกช่องคลินิกเปิดหน้าใบยา
    const row = main.getByRole('row').filter({ hasText: `HN ${hn}` }).first();
    await expect(row, `ใบยา ${prescription} ต้องอยู่แท็บ ${tab}`).toBeVisible({ timeout: 60_000 });
    await row.locator('td').filter({ hasText: /^\d{5} - / }).first().click();
    await page.waitForURL(new RegExp(`prescriptionId=${prescription}`), { timeout: 90_000 });
    const btn = page.getByRole('button', { name: button, exact: true }).filter({ visible: true }).first();
    await expect(btn).toBeVisible({ timeout: 60_000 });
    if (action === 'dispense') await page.getByRole('main').getByRole('checkbox', { name: 'เลือกยาทั้งหมด' }).check();
    const done = waitForApi(page, 'POST', `/cortex-api/prescriptions/${prescription}/${action}`, 60_000);
    await btn.click();
    if (action === 'dispense') {
      const review = page.getByRole('dialog', { name: /ยืนยันการทบทวนก่อนจ่ายยา/ });
      await expect(review).toBeVisible({ timeout: 20_000 });
      await review.getByRole('button', { name: /^ยืนยัน/ }).click();
    }
    await expectOk(await done, `${button} (${action})`);
    progress(`✓ ห้องยา: ${button}`);
  }
  await main.getByRole('tab', { name: /จ่ายยาแล้ว/ }).click();
  await expect(main.getByRole('row').filter({ hasText: `HN ${hn}` }).first(), 'ใบยาต้องอยู่แท็บ จ่ายยาแล้ว').toBeVisible({ timeout: 60_000 });
}

test(`Mock Data ผู้ป่วย OPD สิทธิ UC → สั่งยา → Discharge ส่ง Refer → ชำระเงิน → ปิด Visit → รับยา (${SYSTEM})`, async ({ page, browser }) => {
  test.setTimeout(1_800_000);
  const authorization = trackAuthorization(page);
  const done: string[] = [];

  await page.goto('/cortex/apps');
  await expect(page.getByLabel('เวชระเบียน')).toBeVisible({ timeout: 180_000 });
  const patient = await nextPrefixedPatient(page, authorization(), `${LABEL}-`);
  let hn = '';
  await checkStep(page, `ลงทะเบียน ${patient.firstName} ${patient.familyName} ที่เวชระเบียน`, async () => {
    await gotoReception(page);
    await fillNewPatientForm(page, patient);
    hn = await saveNewPatient(page);
  });
  progress(`✓ ลงทะเบียน HN ${hn}`);
  const visit = { hn, vn: '', en: '' };
  try {
    await checkStep(page, `เปิด Visit OPD อายุรกรรม สิทธิ ${COVERAGE} + ลงตารางแพทย์ (เช็คอิน)`, async () => {
      if (await expectPatientInfo(page)) await openNewVisitPanel(page);
      await addCoverageFirst(page, COVERAGE);
      const opd = await openOpdVisit(page);
      Object.assign(visit, { vn: opd.vn, en: opd.en });
      if (!opd.doctor) await scheduleWalkInRequest(page, hn);
      await checkInOpdVisit(page, visit);
      done.push(`Visit OPD ${opd.clinic} สิทธิ ${COVERAGE}`);
    });
    progress(`✓ Visit ${visit.vn} / ${visit.en} เช็คอินแล้ว`);

    await checkStep(page, `สั่งยา ${MED_CODE} แล้วส่งคำสั่ง`, async () => {
      await page.getByRole('main').getByPlaceholder(/ค้นหา ยา, เวชภัณฑ์/).waitFor({ timeout: 120_000 });
      await addMedicineToCart(page, MED_CODE);
      const signed = graphqlMutation(page, 'SignOPDOrders', 60_000);
      await page.getByRole('main').getByRole('button', { name: /ส่งคำสั่ง/ }).first().click();
      const body = (await (await signed).json()) as { data?: { signOPDOrders?: { accepted?: boolean } } };
      expect(body.data?.signOPDOrders?.accepted, 'ส่งคำสั่งยาไม่สำเร็จ').toBe(true);
      done.push(`สั่งยา ${MED_CODE}`);
    });

    await checkStep(page, 'สถานะ Visit: พร้อมตรวจ → ตรวจเสร็จ', async () => {
      await setVisitStatus(page, 'พร้อมตรวจ');
      await setVisitStatus(page, 'ตรวจเสร็จ');
      done.push('ตรวจเสร็จ');
    });

    const nurse = await openAsNurse(browser);
    let dischargeType = '';
    await checkStep(nurse, 'พยาบาล: จำหน่าย → Discharge By Transfer + เอกสาร Refer out', async () => {
      await selectOpdUnit(nurse, 'แผนกอายุรกรรม', 'หลังตรวจ');
      const row = await opdListRow(nurse, hn);
      const discharged = graphqlMutation(nurse, 'DischargeEncounterStatus', 60_000);
      await row.getByRole('button', { name: 'จำหน่าย' }).click();
      const body = (await (await discharged).json()) as { data?: { dischargeEncounterStatus?: { accepted?: boolean } }; errors?: { message: string }[] };
      expect(body.data?.dischargeEncounterStatus?.accepted, `จำหน่ายไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
      await nurse.waitForURL(/actions=dischargeForm/, { timeout: 90_000 });
      dischargeType = (await saveReferDischarge(nurse)) ?? '';
      done.push(`จำหน่าย (พยาบาล) By Transfer + เอกสาร Refer out ปลายทาง ${DEST_HOSPITAL}`);
    });
    progress(`✓ Discharge COMPLETE (dischargeTypeCode ${dischargeType})`);
    await nurse.context().close();

    let prescription = '';
    await checkStep(page, `ห้องยา: สร้างใบยา (${PHARMACY.name})`, async () => {
      prescription = await createPrescription(page, hn, PHARMACY);
      done.push(`ใบยา ${prescription}`);
    });

    await checkStep(page, 'การเงิน: ปิดสิทธิ UC ด้วย End Point (เลขสุ่ม) → ชำระเงินสด → ปิด Visit', async () => {
      await gotoCashierAccount(page, hn, visit.vn);
      // เลขสุ่มทุกรอบ (ผู้ใช้ 19 ต.ค. 2026) · บัตร 60 ตาม R57 · MOCK_ENDPOINT=<เลข> = ใช้เลขนี้ทั้ง 3 ช่องแทน
      const fixed = process.env.MOCK_ENDPOINT;
      const ep = await closeCoverageWithEndpoint(page, { cardType: '60', ...(fixed ? { endPoint: fixed, terminalId: fixed, trace: fixed } : {}) });
      done.push(`ปิดสิทธิ End Point ${ep.endPoint} (Terminal ID ${ep.terminalId} · Trace ${ep.trace})`);
      const paid = await payAllInCash(page);
      done.push(`ชำระเงินสด ${paid.amount.toFixed(2)} (${paid.invoiceId} · ${paid.receiptId})`);
      await closeVisitAtCashier(page, hn, visit.vn);
      done.push('ปิด Visit แล้ว');
    });

    await checkStep(page, `ห้องยา: จัดยา → ยืนยันรอจ่าย → จ่ายยา (${prescription})`, async () => {
      await dispensePrescription(page, hn, prescription);
      done.push('จ่ายยาแล้ว');
    });
  } finally {
    recordMockPatient(LABEL, patient, visit, done.join(' · ') || 'ลงทะเบียนแล้ว');
  }
});
