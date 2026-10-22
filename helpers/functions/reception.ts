import { expect, type FrameLocator, type Locator, type Page, type Response } from '@playwright/test';
import { randomHouseNumber, randomMoo, toBuddhistDate, toIsoDate, type NewPatient } from '../data/test-data';
import { expectOk } from './er';

// ขั้นตอนหน้าจอโมดูลเวชระเบียน (Reception) — ตรวจกับ dev-x 20–22 ต.ค. 2026
// ทั้งหน้าอยู่ใน iframe (`/reception/embedded/...`) → ทุก locator ต้องผ่าน receptionFrame()
// ฟอร์ม "สร้างผู้ป่วยใหม่" กับ "แก้ไขข้อมูลผู้ป่วย" ใช้ช่องชุดเดียวกัน · บันทึกได้ต้องมีที่อยู่ครบ 2 ชุด

/** ค่าในช่องเพศของฟอร์มเวชระเบียน */
const GENDER_OPTION: Record<NewPatient['gender'], string> = { ชาย: 'male - เพศชาย', หญิง: 'female - เพศหญิง' };

export function receptionFrame(page: Page): FrameLocator {
  return page.frameLocator('main iframe');
}

/** หน้าค้นหาผู้ป่วยของเวชระเบียน → ปุ่ม "สร้างผู้ป่วยใหม่" → ฟอร์มว่าง */
export async function openReceptionCreatePatient(page: Page) {
  await page.goto('/cortex/reception/search-patient');
  const f = receptionFrame(page);
  await f.getByRole('button', { name: 'สร้างผู้ป่วยใหม่' }).first().click();
  await expect(f.getByRole('heading', { name: 'สร้างผู้ป่วยใหม่' })).toBeVisible();
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
 */
export async function fillRandomReceptionAddress(page: Page): Promise<string> {
  const f = receptionFrame(page);
  const houseNo = randomHouseNumber();
  const moo = randomMoo();
  await f.getByRole('textbox', { name: 'บ้านเลขที่', exact: true }).first().fill(houseNo);
  // exact: ไม่งั้นจับช่อง "ชื่อหมู่บ้าน"
  await f.getByRole('textbox', { name: 'หมู่', exact: true }).first().fill(moo);
  const province = await pickRandomAddressItem(page, 'เลือกจังหวัด');
  const district = await pickRandomAddressItem(page, 'เลือกอำเภอ');
  const subdistrict = await pickRandomAddressItem(page, 'เลือกตำบล');
  await f.getByRole('button', { name: 'บ้านเดียวกัน' }).first().click();
  return `${houseNo} หมู่ ${moo} ต.${subdistrict} อ.${district} จ.${province} (ทะเบียนบ้าน = ปัจจุบัน)`;
}

/** dropdown จังหวัด/อำเภอ/ตำบล = popover cmdk — บางครั้งเปิดแล้วไม่ขึ้นรายการ ต้องคลิกซ้ำ */
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
  await receptionFrame(page).getByRole('button', { name: 'บันทึก' }).click();
  const res = await saved;
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
