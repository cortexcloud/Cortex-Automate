import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';
import { ADDRESS_BLOCKS, fillAddress, SARABURI_PAKPHRIAO, textField } from './reception-address';
import { checkStep, clicked, filled, markEvidence, snapEvidence } from './evidence';
import { newTestPatient, type NewPatient } from './test-data';

// เวชระเบียน (Reception) — เนื้อหาเป็น iframe `/reception/embedded/<route>` ใต้หน้า /cortex/reception/<route> · ฟอร์มเป็น Radix UI จับด้วย data-testid
// iframe ถูกสร้างใหม่ทุกครั้งที่เปลี่ยนหน้า → ใช้ frameLocator (elementHandle().contentFrame() ได้ null บน SBH Prod 14 ต.ค. 2026)
// ช่องบังคับ: dev-x = เลขบัตร / เพศ / คำนำหน้า / ชื่อ / นามสกุล / วันเกิด · SBH Prod บังคับที่อยู่ตามทะเบียน + ที่อยู่ปัจจุบันเพิ่ม (ตรวจกับหน้าจอจริง 14 ต.ค. 2026 การ์ด SBH-2085)

/** เนื้อหาของหน้าเวชระเบียน (iframe) */
export function receptionFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe[title="iframe"]');
}

/** ที่อยู่ของผู้ป่วยทดสอบ — `search` = คำค้นในช่อง "ค้นหาที่อยู่" (ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์) ของ SBH Prod */
export const TEST_ADDRESS = { line: '99/1 หมู่ 1', search: 'ปากเพรียว', match: /^ปากเพรียว เมืองสระบุรี สระบุรี 18000$/ };

/**
 * รอเนื้อหาใน iframe ขึ้น (`ready`) — ไม่ขึ้นใน 40 วินาทีให้โหลดหน้าใหม่
 * SBH Prod (14 ต.ค. 2026): `/reception/embedded/<route>` ตอบ 503 เป็นพักๆ และบางครั้งโหลดไฟล์ครบ (200) แต่หน้าว่างค้าง
 */
async function waitReception(page: Page, ready: Locator, what: string) {
  let round = 0;
  await expect(async () => {
    if (round++) await page.reload();
    await expect(ready).toBeVisible({ timeout: 40_000 });
  }, `${what} (เวชระเบียน) ต้องโหลดขึ้น`).toPass({ timeout: 180_000 });
}

/** เปิดเวชระเบียนจากเมนูแอป (หน้าค้นหาผู้ป่วย) */
export async function gotoReception(page: Page) {
  await page.goto('/cortex/apps');
  await page.getByLabel('เวชระเบียน').click();
  await page.waitForURL(/\/reception\/search-patient/, { timeout: 90_000 });
  await waitReception(page, newPatientButton(page), 'หน้าค้นหาผู้ป่วย');
}

/** ปุ่ม "สร้างผู้ป่วยใหม่" ของหน้าค้นหาผู้ป่วย */
export function newPatientButton(page: Page) {
  return receptionFrame(page).getByRole('button', { name: 'สร้างผู้ป่วยใหม่' }).first();
}

/** กด "สร้างผู้ป่วยใหม่" แล้วกรอกช่องบังคับของฟอร์ม (ยังไม่กดบันทึก) */
export async function fillNewPatientForm(page: Page, patient: NewPatient, options: { skipAddress?: boolean } = {}) {
  const f = receptionFrame(page);
  await newPatientButton(page).click();
  await page.waitForURL(/\/reception\/create-patient/, { timeout: 60_000 });
  await waitReception(page, f.getByTestId('firstName'), 'ฟอร์มสร้างผู้ป่วยใหม่');

  // ประเภทการยืนยันตัวตนตั้งต้นเป็น "เลขบัตรประชาชน"
  await f.getByTestId('identifyVerification.identify').fill(patient.citizenId);
  await f.getByTestId('select-trigger-gender').click();
  await f.getByRole('option', { name: patient.gender === 'ชาย' ? 'male - เพศชาย' : 'female - เพศหญิง' }).click();
  // ตัวเลือกคำนำหน้าเป็น "<รหัส> - <คำนำหน้า>" เช่น "003 - นาย"
  await f.getByTestId('searchbox-trigger-prefixName-searchbox').click();
  await f.getByRole('option', { name: new RegExp(`^\\d+ - ${patient.gender === 'ชาย' ? 'นาย' : 'นางสาว'}$`) }).first().click();
  await f.getByTestId('firstName').fill(patient.firstName);
  await f.getByTestId('familyName').fill(patient.familyName);
  // วันเกิดเป็น DD/MM/พ.ศ. — ออกจากช่องแล้วระบบเติมอายุให้
  const [d, m, y] = patient.birthDate.split('/');
  await f.getByTestId('birthDate').fill(`${d}/${m}/${Number(y) + 543}`);
  await f.getByTestId('birthDate').press('Tab');
  await expect(f.getByTestId('age'), 'กรอกวันเกิดแล้วระบบต้องเติมอายุ').not.toHaveValue('');
  // เทสที่ตรวจช่องบังคับของที่อยู่เอง (SBH-1290 UHP) กรอกที่อยู่เอง
  if (options.skipAddress) return;

  // SBH Prod: ที่อยู่ตามทะเบียน = บ้านเลขที่ + ค้นหาตำบล · ที่อยู่ปัจจุบัน = "บ้านเดียวกัน" (dev-x เป็นฟอร์มที่อยู่แบบแยกช่องและไม่บังคับ → ข้าม)
  const addressLine = f.getByTestId('address.officialAddressLine');
  if (await addressLine.count()) {
    await addressLine.fill(TEST_ADDRESS.line);
    // ปุ่ม "ค้นหาที่อยู่" คลิกครั้งแรกบางครั้ง dialog ไม่เปิด (SBH Prod 14 ต.ค. 2026 — คลิกครั้งที่ 2 เปิด) → คลิกซ้ำจนเห็น dialog
    const dialog = f.getByRole('dialog');
    await expect(async () => {
      await f.getByTestId('address-form-official').getByRole('button', { name: 'ค้นหาที่อยู่' }).click();
      await expect(dialog.getByRole('combobox')).toBeVisible({ timeout: 3_000 });
    }, 'ช่องค้นหาที่อยู่ต้องเปิด').toPass({ timeout: 30_000 });
    await dialog.getByRole('combobox').pressSequentially(TEST_ADDRESS.search, { delay: 50 });
    await dialog.getByRole('option', { name: TEST_ADDRESS.match }).first().click();
    await f.getByTestId('address-form-current').getByTestId('copy-address-form-button').click();
    await expect(f.getByTestId('address.currentAddressLine')).toHaveValue(TEST_ADDRESS.line);
    return;
  }
  // ที่อยู่แบบแยกช่อง (dev-x): ช่องบังคับขึ้นกับ config ของประเภทการยืนยันตัวตน — 16 ต.ค. 2026 เลขบัตรประชาชนบังคับบ้านเลขที่ + หมู่ + จ/อ/ต ทั้งทะเบียนบ้านและปัจจุบัน → กรอกทุกครั้ง
  const houseNo = textField(f, ADDRESS_BLOCKS.official, 'houseNo');
  if (await houseNo.count()) {
    const address = { houseNo: '99/1', villageNo: '1', location: SARABURI_PAKPHRIAO };
    await fillAddress(f, ADDRESS_BLOCKS.official, address);
    await f.getByTestId('address-form-current').getByTestId('copy-address-form-button').click().catch(() => undefined);
    const copied = await expect(textField(f, ADDRESS_BLOCKS.current, 'houseNo')).toHaveValue(address.houseNo, { timeout: 3_000 }).then(() => true, () => false);
    if (!copied) await fillAddress(f, ADDRESS_BLOCKS.current, address);
  }
}

/** ปุ่ม "บันทึก" ของฟอร์มสร้างผู้ป่วยใหม่ */
export function saveNewPatientButton(page: Page) {
  return receptionFrame(page).getByTestId('submit-button');
}

/** กดบันทึกผู้ป่วยใหม่ → ระบบพาไปหน้าผู้ป่วย (/cortex/next/patients/<HN>) → คืน HN */
export async function saveNewPatient(page: Page): Promise<string> {
  const created = page.waitForResponse((res) => res.request().method() === 'POST' && /\/new-demographic-api\/patients$/.test(new URL(res.url()).pathname), { timeout: 60_000 });
  await saveNewPatientButton(page).click();
  const res = await created.catch(() => undefined);
  if (!res || !res.ok()) {
    const alerts = await receptionFrame(page).getByRole('alert').filter({ visible: true }).allInnerTexts().catch(() => []);
    throw new Error(`บันทึกผู้ป่วยใหม่ไม่สำเร็จ (${res ? `${res.status()} ${(await res.text()).slice(0, 300)}` : 'ไม่มีคำสั่งสร้างผู้ป่วย'})${alerts.length ? ` · ฟอร์มแจ้ง: ${alerts.join(' · ')}` : ''}`);
  }
  await page.waitForURL(/\/next\/patients\/\d+/, { timeout: 60_000 });
  const hn = page.url().match(/\/next\/patients\/(\d+)/)![1];
  await expect(page.getByRole('main').getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 60_000 });
  return hn;
}

/** ปุ่ม "Visit ใหม่" ของหน้าข้อมูลผู้ป่วย (เวชระเบียน) — ช่วงหน้ากำลังโหลดปุ่มเป็น disabled */
export function newVisitButton(page: Page) {
  return receptionFrame(page).getByRole('button', { name: 'Visit ใหม่' });
}

/** ข้อความแดงข้างหัว "ข้อมูลผู้ป่วย" เมื่อ `GET /cortex-api/patient/<HN>/lock-status` ล้ม — ปุ่ม "Visit ใหม่" จะ disabled */
export function lockStatusError(page: Page) {
  return receptionFrame(page).getByText('ไม่สามารถตรวจสอบสถานะล็อกผู้ป่วยได้');
}

/**
 * รอหน้าข้อมูลผู้ป่วยของเวชระเบียนโหลดเสร็จ → คืน true ถ้าปุ่ม "Visit ใหม่" กดได้
 * SBH Prod (14 ต.ค. 2026): lock-status ตอบ 500 → แดง "ไม่สามารถตรวจสอบสถานะล็อกผู้ป่วยได้" + ปุ่ม disabled (โหลดหน้าใหม่ 1 รอบก่อนยอมแพ้)
 */
export async function expectPatientInfo(page: Page): Promise<boolean> {
  await waitReception(page, receptionFrame(page).getByRole('heading', { name: 'ข้อมูลผู้ป่วย' }), 'หน้าข้อมูลผู้ป่วย');
  for (let round = 0; round < 2; round++) {
    if (round) {
      await page.reload();
      await waitReception(page, receptionFrame(page).getByRole('heading', { name: 'ข้อมูลผู้ป่วย' }), 'หน้าข้อมูลผู้ป่วย');
    }
    const enabled = await expect(newVisitButton(page)).toBeEnabled({ timeout: 30_000 }).then(() => true, () => false);
    if (enabled) return true;
  }
  return false;
}

/** กด "Visit ใหม่" → แผงจัดการ Visit ของหน้าผู้ป่วย (?actions=createVisit) — เลือกคลินิก / สร้าง Visit ต่อด้วย openOpdVisit() */
export async function openNewVisitPanel(page: Page) {
  await newVisitButton(page).click();
  await page.waitForURL(/actions=createVisit/, { timeout: 60_000 });
  await expect(page.getByRole('main').getByText(/^รายการเข้ารับบริการ/)).toBeVisible({ timeout: 60_000 });
}

/**
 * ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน → อยู่หน้าข้อมูลผู้ป่วย → คืน HN + ชื่อ + ปุ่ม Visit ใหม่กดได้ไหม
 * tag = ส่วนต่อท้ายนามสกุล (newTestPatient) · snapName = ชื่อภาพ "ก่อนกด" ก่อนบันทึก (ค่าเริ่มต้นไม่ใส่ tag)
 */
export async function registerPatient(page: Page, tag: string, options: { snapName?: string } = {}): Promise<{ hn: string; name: string; newVisitEnabled: boolean }> {
  const patient = newTestPatient(tag);
  await gotoReception(page);
  await markEvidence(clicked(newPatientButton(page)));
  await fillNewPatientForm(page, patient);
  const f = receptionFrame(page);
  const save = saveNewPatientButton(page);
  await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await markEvidence(filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), clicked(save));
  await snapEvidence(page, options.snapName ?? 'ก่อนกด — บันทึกผู้ป่วยใหม่');
  const hn = await saveNewPatient(page);
  const newVisitEnabled = await expectPatientInfo(page);
  return { hn, name: `${patient.firstName} ${patient.familyName}`, newVisitEnabled };
}

/** เปิดหน้าข้อมูลผู้ป่วยเดิมตาม HN (`/cortex/next/patients/<HN>?views=patientInfo`) เป็น checkStep — รอหัวข้อ "ข้อมูลผู้ป่วย" */
export async function openPatientInfo(page: Page, hn: string) {
  await checkStep(page, `ผู้ป่วยเดิม HN ${hn} → หน้าข้อมูลผู้ป่วย`, async () => {
    await page.goto(`/cortex/next/patients/${hn}?views=patientInfo`);
    await expect(receptionFrame(page).getByRole('heading', { name: 'ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 90_000 });
  });
}
