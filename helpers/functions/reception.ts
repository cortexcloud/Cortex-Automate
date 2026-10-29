import { expect, type FrameLocator, type Locator, type Page, type Response } from '@playwright/test';
import { randomHouseNumber, randomMoo, toBuddhistDate, toIsoDate, type NewPatient } from '../data/test-data';
import { expectOk } from './er';

// ขั้นตอนหน้าจอโมดูลเวชระเบียน (Reception) — ตรวจกับ dev-x 20–22 ต.ค. 2026 · ฟอร์มที่อยู่แบบใหม่ 29 ต.ค. 2026
// ทั้งหน้าอยู่ใน iframe (`/reception/embedded/...`) → ทุก locator ต้องผ่าน receptionFrame()
// ฟอร์ม "สร้างผู้ป่วยใหม่" กับ "แก้ไขข้อมูลผู้ป่วย" ใช้ช่องชุดเดียวกัน · บันทึกได้ต้องมีที่อยู่ครบ 2 ชุด
// ฟอร์มที่อยู่มี 2 แบบ (ยืนยันบน dev-x 22 ต.ค. และ 29 ต.ค. 2026):
// - แบบแยกช่อง = ฟอร์มที่บันทึกได้จริง: ช่อง "บ้านเลขที่" / "หมู่" + ปุ่ม "เลือกจังหวัด" / "เลือกอำเภอ" / "เลือกตำบล"
// - แบบช่องเดียว "บ้านเลขที่ / หมู่ / ซอย / ถนน" + ปุ่ม "ค้นหาที่อยู่" = ฟอร์มชั่วคราว ขึ้นก่อนแบบแยกช่อง และค้างอยู่แบบนี้เมื่อ
//   session ใกล้หมดอายุ / dev-x ตอบ 502–503 — กรอกครบแล้วกด "บันทึก" ไม่ส่ง request ไม่มีข้อความเตือน (29 ต.ค. 2026 ลอง 6 รอบ)
// → openReceptionCreatePatient โหลดหน้าใหม่จนได้แบบแยกช่อง · ลองครบแล้วยังเป็นช่องเดียวค่อยกรอกแบบช่องเดียว (เผื่อระบบเปลี่ยนเป็นแบบนี้ถาวร)

/** ค่าในช่องเพศของฟอร์มเวชระเบียน */
const GENDER_OPTION: Record<NewPatient['gender'], string> = { ชาย: 'male - เพศชาย', หญิง: 'female - เพศหญิง' };
/** ช่องที่อยู่แบบใหม่ (placeholder) */
const ADDRESS_LINE = 'บ้านเลขที่ / หมู่ / ซอย / ถนน';

export function receptionFrame(page: Page): FrameLocator {
  return page.frameLocator('main iframe');
}

/** หน้าค้นหาผู้ป่วยของเวชระเบียน → ปุ่ม "สร้างผู้ป่วยใหม่" → ฟอร์มว่าง */
export async function openReceptionCreatePatient(page: Page) {
  const f = receptionFrame(page);
  // dev-x ช้าเป็นพัก ๆ (29 ต.ค. 2026): iframe เวชระเบียนโหลดไม่เสร็จ ปุ่มไม่ขึ้น / ได้ฟอร์มที่อยู่ช่องเดียว (บันทึกไม่ได้) → โหลดหน้าใหม่แล้วลองซ้ำ
  for (let attempt = 1; ; attempt++) {
    await expect(async () => {
      await page.goto('/cortex/reception/search-patient');
      await f.getByRole('button', { name: 'สร้างผู้ป่วยใหม่' }).first().click({ timeout: 45_000 });
      await expect(f.getByRole('heading', { name: 'สร้างผู้ป่วยใหม่' })).toBeVisible({ timeout: 30_000 });
    }, 'เปิดฟอร์ม "สร้างผู้ป่วยใหม่" ของเวชระเบียน').toPass({ timeout: 240_000 });
    if (await waitForSplitAddressForm(page, 45_000)) return;
    if (attempt >= 3) {
      console.log('    เวชระเบียน: ได้ฟอร์มที่อยู่ช่องเดียว 3 รอบ — กรอกแบบช่องเดียว (ถ้าบันทึกไม่ส่ง request ให้ล็อกอินใหม่แล้วลองอีกครั้ง)');
      await waitForReceptionFormSettled(page);
      return;
    }
  }
}

/**
 * ฟอร์มสร้าง/แก้ไขเพิ่งโหลดอาจแสดงที่อยู่แบบช่องเดียวชั่วครู่แล้วเปลี่ยนเป็นแบบแยกช่อง (ฟอร์มที่ใช้จริง — ผู้ใช้ยืนยัน 22 ต.ค. 2026)
 * กรอกระหว่างนั้นค่าหาย และกดบันทึกแล้วไม่ส่ง request → รอช่อง "บ้านเลขที่" แบบแยกช่องก่อนเริ่มกรอก
 */
async function waitForReceptionFormSettled(page: Page) {
  const f = receptionFrame(page);
  const newForm = f.getByPlaceholder(ADDRESS_LINE, { exact: true }).first();
  const oldForm = f.getByRole('textbox', { name: 'บ้านเลขที่', exact: true }).first();
  await expect(newForm.or(oldForm)).toBeVisible({ timeout: 30_000 });
}

/** รอฟอร์มที่อยู่แบบแยกช่อง (ฟอร์มที่บันทึกได้) — คืน false ถ้าหมดเวลาแล้วยังเป็นแบบช่องเดียว */
async function waitForSplitAddressForm(page: Page, timeout: number): Promise<boolean> {
  return receptionFrame(page).getByRole('textbox', { name: 'บ้านเลขที่', exact: true }).first().waitFor({ timeout }).then(() => true, () => false);
}

/** ฟอร์มที่เปิดอยู่ใช้ที่อยู่แบบช่องเดียว (ช่องเดียว + "ค้นหาที่อยู่") หรือไม่ */
async function isNewAddressForm(page: Page): Promise<boolean> {
  return (await receptionFrame(page).getByPlaceholder(ADDRESS_LINE, { exact: true }).count()) > 0;
}

/** หน้าค้นหาผู้ป่วยของเวชระเบียน → ค้นด้วยชื่อ → คืนเลข HN ในตารางผล (ต้องเจอ) */
export async function expectReceptionSearchResult(page: Page, name: string, hn: string): Promise<Locator> {
  await page.goto('/cortex/reception/search-patient');
  const f = receptionFrame(page);
  await f.getByPlaceholder('ชื่อ - นามสกุล', { exact: true }).fill(name);
  await f.getByRole('button', { name: /ค้นหา/ }).click();
  const cell = f.getByText(hn, { exact: true }).first();
  await expect(cell).toBeVisible();
  return cell;
}

/** หน้าข้อมูลผู้ป่วย → ปุ่ม "แก้ไขข้อมูลผู้ป่วย" → ฟอร์มแก้ไข */
export async function openReceptionEditPatient(page: Page, hn: string) {
  await page.goto(`/cortex/next/patients/${hn}?views=patientInfo`);
  const f = receptionFrame(page);
  await f.getByRole('button', { name: 'แก้ไขข้อมูลผู้ป่วย' }).click();
  await expect(f.getByRole('heading', { name: 'แก้ไขข้อมูลผู้ป่วยใหม่' })).toBeVisible();
  await waitForReceptionFormSettled(page);
  // ฟอร์มเปิดมาว่างก่อน แล้วค่อยเติมข้อมูลเดิม — กรอกก่อนเติมเสร็จจะโดนเขียนทับ (เจอ 22 ต.ค. 2026)
  await expect(f.getByRole('textbox', { name: 'ระบุชื่อผู้ป่วย' })).not.toHaveValue('');
}

/** ช่องคำนำหน้า: ปุ่ม "เลือก" (หรือค่าปัจจุบัน) เปิด dialog ตัวเลือก "<รหัส> - <คำนำหน้า>" เช่น "003 - นาย" */
export async function selectReceptionNamePrefix(page: Page, prefix: string) {
  const f = receptionFrame(page);
  // ปุ่มแรกที่ชื่อ "เลือก" (ยังว่าง) หรือ "<รหัส 3 หลัก> - …" (มีค่าแล้ว) — ช่องเพศเป็น combobox ไม่ชนกัน
  await f.getByRole('button', { name: /^(เลือก|\d{3} - .+)$/ }).first().click();
  await f.getByRole('option', { name: new RegExp(`^\\d+ - ${prefix.replace(/\./g, '\\.')}$`) }).first().click();
}

/** วันเกิด (ช่อง "วัน/เดือน/ปีพ.ศ. เกิด") — รับ ค.ศ. แล้วพิมพ์เป็น พ.ศ. */
export async function fillReceptionBirthDate(page: Page, birthDate: string) {
  const box = receptionFrame(page).getByRole('textbox', { name: 'DD / MM / YYYY' });
  await box.fill(toBuddhistDate(birthDate));
  await box.press('Tab');
}

/** ข้อมูลส่วนตัวในฟอร์มสร้างผู้ป่วย: เลขบัตร · เพศ · คำนำหน้า · ชื่อ · นามสกุล · วันเกิด */
export async function fillReceptionPatient(page: Page, patient: NewPatient) {
  const f = receptionFrame(page);
  await f.getByRole('textbox', { name: 'ระบุหมายเลขบัตร' }).fill(patient.citizenId);
  await f.getByRole('combobox').filter({ hasText: 'เลือก' }).first().click();
  await f.getByRole('option', { name: GENDER_OPTION[patient.gender], exact: true }).click();
  if (patient.namePrefix) await selectReceptionNamePrefix(page, patient.namePrefix);
  await f.getByRole('textbox', { name: 'ระบุชื่อผู้ป่วย' }).fill(patient.firstName);
  await f.getByRole('textbox', { name: 'ระบุนามสกุลผู้ป่วย' }).fill(patient.familyName);
  await fillReceptionBirthDate(page, patient.birthDate);
}

/**
 * ที่อยู่ทะเบียนบ้านแบบสุ่ม (ผู้ใช้สั่ง "สุ่มไปเลย" 20 ต.ค. 2026): บ้านเลขที่ · หมู่ · จังหวัด/อำเภอ/ตำบลสุ่มจากรายการในระบบ
 * แล้วกด "บ้านเดียวกัน" ให้ที่อยู่ปัจจุบัน → คืนข้อความที่อยู่ไว้เก็บลง mock data
 * ใช้ฟอร์มที่อยู่แบบแยกช่อง (ดู waitForReceptionFormSettled)
 */
export async function fillRandomReceptionAddress(page: Page): Promise<string> {
  const f = receptionFrame(page);
  const houseNo = randomHouseNumber();
  const moo = randomMoo();
  await waitForReceptionFormSettled(page);
  const split = await f.getByRole('textbox', { name: 'บ้านเลขที่', exact: true }).count();
  if (!split && (await isNewAddressForm(page))) {
    // ช่องแรกของแต่ละชนิด = ที่อยู่ตามทะเบียนบ้าน (ส่วนที่อยู่ปัจจุบันได้จาก "บ้านเดียวกัน")
    await f.getByPlaceholder(ADDRESS_LINE, { exact: true }).first().fill(`${houseNo} หมู่ ${moo}`);
    const area = await pickRandomAddressItem(page, 'ค้นหาที่อยู่');
    await f.getByRole('button', { name: 'บ้านเดียวกัน' }).first().click();
    return `${houseNo} หมู่ ${moo} ${area} (ทะเบียนบ้าน = ปัจจุบัน)`;
  }
  await f.getByRole('textbox', { name: 'บ้านเลขที่', exact: true }).first().fill(houseNo);
  // exact: ไม่งั้นจับช่อง "ชื่อหมู่บ้าน"
  await f.getByRole('textbox', { name: 'หมู่', exact: true }).first().fill(moo);
  const province = await pickRandomAddressItem(page, 'เลือกจังหวัด');
  const district = await pickRandomAddressItem(page, 'เลือกอำเภอ');
  const subdistrict = await pickRandomAddressItem(page, 'เลือกตำบล');
  await f.getByRole('button', { name: 'บ้านเดียวกัน' }).first().click();
  return `${houseNo} หมู่ ${moo} ต.${subdistrict} อ.${district} จ.${province} (ทะเบียนบ้าน = ปัจจุบัน)`;
}

/** dropdown ที่อยู่ (แบบใหม่ "ค้นหาที่อยู่" · แบบเดิม จังหวัด/อำเภอ/ตำบล) = popover cmdk — บางครั้งเปิดแล้วไม่ขึ้นรายการ ต้องคลิกซ้ำ */
async function pickRandomAddressItem(page: Page, trigger: string): Promise<string> {
  const f = receptionFrame(page);
  const items = f.locator('[data-radix-popper-content-wrapper] [cmdk-item]');
  for (let attempt = 0; attempt < 2; attempt++) {
    await f.getByRole('button', { name: trigger }).first().click();
    if (await items.first().waitFor({ timeout: 15_000 }).then(() => true, () => false)) break;
    await page.keyboard.press('Escape');
  }
  const count = await items.count();
  expect(count, `ตัวเลือกใน "${trigger}"`).toBeGreaterThan(0);
  const item = items.nth(Math.floor(Math.random() * count));
  const text = (await item.innerText()).trim();
  await item.click();
  return text;
}

/** ข้อมูลผู้ป่วยใน response ของ new-demographic-api หลังบันทึก */
export interface ReceptionSavedPatient {
  hn: string;
  birthDate?: string;
  namePrefix?: { display?: string };
}

/** กด "บันทึก" → รอ POST (สร้าง) / PATCH (แก้ไข) ของ new-demographic-api → คืนข้อมูลผู้ป่วยที่บันทึก */
export async function saveReceptionPatient(page: Page, what: string): Promise<ReceptionSavedPatient> {
  const saved = page.waitForResponse(
    (res) => ['POST', 'PATCH'].includes(res.request().method()) && /^\/new-demographic-api\/patients(\/[^/]+)?$/.test(new URL(res.url()).pathname),
  );
  const singleLine = !(await receptionFrame(page).getByRole('textbox', { name: 'บ้านเลขที่', exact: true }).count()) && (await isNewAddressForm(page));
  await receptionFrame(page).getByRole('button', { name: 'บันทึก' }).click();
  const res = await saved.catch((e: Error) => {
    throw new Error(
      `${what}: กด "บันทึก" แล้วไม่มี request บันทึกผู้ป่วย` +
        (singleLine ? ' — ฟอร์มที่อยู่เป็นแบบช่องเดียว (ฟอร์มชั่วคราวที่บันทึกไม่ได้) ลองล็อกอินใหม่ (rm .auth/Super_User.json) แล้วรันอีกครั้ง' : '') +
        ` (${e.message.split('\n')[0]})`,
    );
  });
  await expectOk(res, what);
  return readSavedPatient(res);
}

async function readSavedPatient(res: Response): Promise<ReceptionSavedPatient> {
  const body = (await res.json()) as ReceptionSavedPatient & { data?: ReceptionSavedPatient };
  const patient = body.data ?? body;
  if (!patient.hn) throw new Error(`ไม่เจอ hn ใน response บันทึกผู้ป่วย: ${JSON.stringify(body).slice(0, 300)}`);
  return patient;
}

/** วันเกิดที่ระบบบันทึกต้องตรงกับที่ตั้งใจ (ค.ศ. DD/MM/YYYY) */
export function expectSavedBirthDate(saved: ReceptionSavedPatient, birthDate: string) {
  expect(saved.birthDate, `วันเกิดที่ระบบบันทึกของ HN ${saved.hn}`).toBe(toIsoDate(birthDate));
}
