import { expect, type FrameLocator, type Locator } from '@playwright/test';

// ที่อยู่แบบแยกช่องตาม 43 แฟ้มของฟอร์มเวชระเบียน (สร้าง / แก้ไขผู้ป่วย) — การ์ด SBH-1290
// เปิดด้วย feature flag `registration.structured-patient-address` (dev-x เปิดอยู่ 14 ต.ค. 2026 — `GET /cortex-api/feature-flags?key=…`)
// ทุกส่วนมีช่องชุดเดียวกัน: บ้านเลขที่ · อาคาร/คอนโด · ห้อง · ซอยแยก · ซอย · ถนน · ชื่อหมู่บ้าน · หมู่ · จังหวัด → อำเภอ → ตำบล (searchbox ของ Radix) · รหัสไปรษณีย์ (disabled เติมเองจากตำบล)
// ช่องบังคับไม่ฝังในโค้ด: อ่านจาก `GET /generated-emr-api/identity-verification-modes` (`requiredField`) ตามประเภทการยืนยันตัวตน

/** ช่องข้อความของที่อยู่ 1 ชุด + ชื่อใน 43 แฟ้ม (ตารางในการ์ด SBH-1290) */
export const ADDRESS_TEXT_FIELDS = [
  { key: 'houseNo', label: 'บ้านเลขที่', f43: 'HOUSE' },
  { key: 'condo', label: 'อาคาร/คอนโด', f43: 'CONDO' },
  { key: 'roomNo', label: 'ห้อง', f43: 'ROOMNO' },
  { key: 'soiSub', label: 'ซอยแยก', f43: 'SOISUB' },
  { key: 'soiMain', label: 'ซอย', f43: 'SOIMAIN' },
  { key: 'road', label: 'ถนน', f43: 'ROAD' },
  { key: 'villageName', label: 'ชื่อหมู่บ้าน', f43: 'VILLANAME' },
  { key: 'villageNo', label: 'หมู่', f43: 'VILLAGE' },
] as const;
export type AddressTextKey = (typeof ADDRESS_TEXT_FIELDS)[number]['key'];

/** จังหวัด / อำเภอ / ตำบล (Master Data) — ชื่อช่องในฟอร์ม `<ส่วน>-stateCode` … */
export const ADDRESS_LOCATION_FIELDS = [
  { key: 'stateCode', label: 'จังหวัด', f43: 'CHANGWAT' },
  { key: 'districtCode', label: 'อำเภอ', f43: 'AMPUR' },
  { key: 'cityCode', label: 'ตำบล', f43: 'TAMBON' },
] as const;
export type AddressLocationKey = (typeof ADDRESS_LOCATION_FIELDS)[number]['key'];

/**
 * ส่วนที่มีที่อยู่ในฟอร์ม — `text(key)` = data-testid ของช่องข้อความ · `location` = ส่วนหน้าของ searchbox / รหัสไปรษณีย์
 * ที่อยู่หลัก (ทะเบียนบ้าน / ปัจจุบัน / ที่ทำงาน) ใช้ชื่อ `address.official<Key>` · ส่วนอื่นใช้ `<ส่วน>.<key>`
 */
export interface AddressBlock {
  id: string;
  title: string;
  container: string;
  text: (key: AddressTextKey) => string;
  location: string;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const main = (id: string, title: string, container: string, prefix: string): AddressBlock => ({
  id,
  title,
  container,
  text: (key) => `address.${prefix}${cap(key)}`,
  location: `address.${prefix}Address`,
});
const nested = (id: string, title: string, container: string, prefix: string): AddressBlock => ({
  id,
  title,
  container,
  text: (key) => `${prefix}.${key}`,
  location: `${prefix}.address`,
});

export const ADDRESS_BLOCKS = {
  official: main('official', 'ที่อยู่ (ทะเบียนบ้าน)', 'address-form-official', 'official'),
  current: main('current', 'ที่อยู่ปัจจุบัน', 'address-form-current', 'current'),
  work: main('work', 'ที่อยู่ที่ทำงาน', 'address-form-work', 'work'),
  emergency: nested('emergency', 'ผู้ติดต่อกรณีฉุกเฉิน (1)', 'form-emergency-contact', 'emergencyContacts[0]'),
  father: nested('father', 'ครอบครัว — บิดา', 'father-parent-form', 'family.father'),
  mother: nested('mother', 'ครอบครัว — มารดา', 'mother-parent-form', 'family.mother'),
  spouse: nested('spouse', 'ครอบครัว — คู่สมรส', 'spouse-parent-form', 'family.spouse'),
  birth: nested('birth', 'ข้อมูลการเกิด', 'birth-form', 'birth'),
} satisfies Record<string, AddressBlock>;
export type AddressBlockId = keyof typeof ADDRESS_BLOCKS;

export const textField = (f: FrameLocator, block: AddressBlock, key: AddressTextKey) => f.getByTestId(block.text(key));
export const locationTrigger = (f: FrameLocator, block: AddressBlock, key: AddressLocationKey) => f.getByTestId(`searchbox-trigger-${block.location}-${key}-searchbox`);
export const postalField = (f: FrameLocator, block: AddressBlock) => f.getByTestId(`${block.location}-postalCode`);
export const blockContainer = (f: FrameLocator, block: AddressBlock) => f.getByTestId(block.container);
/** ข้อความ "โปรดระบุ" ใต้ช่องข้อความ */
export const textError = (f: FrameLocator, block: AddressBlock, key: AddressTextKey) => f.getByTestId(`error-message-${block.text(key)}`);

/** ป้ายของช่อง (label ชั้นในสุดที่อยู่ก่อนช่องนั้น) — ใช้ดูดอกจันบังคับ `*` */
export function fieldLabel(field: Locator): Locator {
  return field.locator('xpath=ancestor::*[.//label][1]').locator('label').first();
}

/** กล่องของช่อง searchbox (ป้าย + ช่อง + ข้อความ error) — div ชั้นในสุดที่มีทั้งป้ายและช่อง */
export function locationBox(f: FrameLocator, block: AddressBlock, key: AddressLocationKey): Locator {
  return locationTrigger(f, block, key).locator('xpath=ancestor::*[.//label][1]');
}

export interface AddressLocation {
  state: string;
  district: string;
  city: string;
  /** รหัสไปรษณีย์ที่คาดว่าระบบเติมให้ (Master Data) */
  postal: string;
}

/** สระบุรี → เมืองสระบุรี → ปากเพรียว (18000) — ตรวจกับ Master Data ของ dev-x 14 ต.ค. 2026 */
export const SARABURI_PAKPHRIAO: AddressLocation = { state: 'สระบุรี', district: 'เมืองสระบุรี', city: 'ปากเพรียว', postal: '18000' };
/** เมืองสระบุรี → ตะกุด (18000) — ใช้เป็นค่าที่แก้ใน TC-16 */
export const SARABURI_TAKUT: AddressLocation = { state: 'สระบุรี', district: 'เมืองสระบุรี', city: 'ตะกุด', postal: '18000' };

/** รายการตัวเลือกที่เปิดอยู่ (cmdk) — ฟอร์มมีรายการซ่อนของช่องอื่นอีกหลายชุด จึงจับเฉพาะ listbox ที่มองเห็น */
export const openListbox = (f: FrameLocator) => f.locator('[cmdk-list][role="listbox"]').filter({ visible: true }).last();

/**
 * เลือกจังหวัด → อำเภอ → ตำบล ของ 1 ส่วน แล้วรอรหัสไปรษณีย์ขึ้น (`until: 'districtCode'` = หยุดที่อำเภอ ไม่เลือกตำบล)
 * ตัวเลือกเป็น role option ในรายการที่เปิดจาก trigger (พิมพ์ค้นแล้วรายการไม่กรอง — คลิกตัวเลือกตามชื่อได้เลย ตรวจ 14 ต.ค. 2026)
 */
export async function chooseLocation(f: FrameLocator, block: AddressBlock, loc: AddressLocation, { until = 'cityCode' }: { until?: AddressLocationKey } = {}) {
  await pickLocation(f, block, 'stateCode', loc.state);
  await pickLocation(f, block, 'districtCode', loc.district);
  if (until === 'districtCode') return;
  await pickLocation(f, block, 'cityCode', loc.city);
  await expect(postalField(f, block), `${block.title}: รหัสไปรษณีย์ต้องขึ้นเองจากตำบล`).toHaveValue(loc.postal);
}

/** เลือกค่าในช่องจังหวัด / อำเภอ / ตำบล ช่องเดียว (ช่องชั้นบนต้องเลือกไว้แล้ว) */
export async function pickLocation(f: FrameLocator, block: AddressBlock, key: AddressLocationKey, name: string) {
  const trigger = locationTrigger(f, block, key);
  await expect(async () => {
    await trigger.click();
    await openListbox(f).getByRole('option', { name, exact: true }).first().click({ timeout: 5_000 });
    await expect(trigger).toContainText(name, { timeout: 3_000 });
  }, `${block.title}: เลือก${ADDRESS_LOCATION_FIELDS.find((x) => x.key === key)!.label} "${name}"`).toPass({ timeout: 40_000 });
}

/**
 * เปิดรายการของจังหวัด / อำเภอ / ตำบล แล้วอ่านตัวเลือกทั้งหมด (ไม่เลือก) — รหัสอยู่ใน testid `searchbox-result-<code>` (อำเภอ 1901 · ตำบล 190101)
 * รายการเปิดค้างไว้ให้ถ่ายภาพ — ปิดเองด้วย Escape
 */
export async function readLocationOptions(f: FrameLocator, block: AddressBlock, key: AddressLocationKey) {
  await locationTrigger(f, block, key).click();
  const list = openListbox(f);
  await expect(list.getByRole('option').first(), `${block.title}: รายการ${ADDRESS_LOCATION_FIELDS.find((x) => x.key === key)!.label}ต้องเปิด`).toBeVisible({ timeout: 20_000 });
  return list.locator('[data-testid^="searchbox-result-"]').evaluateAll((els) =>
    els.map((e) => ({ code: e.getAttribute('data-testid')!.replace('searchbox-result-', ''), name: (e.querySelector('span')?.textContent ?? '').trim() })),
  );
}

export type AddressValues = Record<AddressTextKey, string>;
/** ค่าที่กรอกของ 1 ส่วน — ช่องที่ไม่ใส่ = เว้นว่าง · `location` ไม่ใส่ = ไม่เลือกจังหวัด / อำเภอ / ตำบล */
export type AddressInput = Partial<AddressValues> & { location?: AddressLocation };

/** กรอกเฉพาะช่องที่ให้มา + เลือกจังหวัด → อำเภอ → ตำบล */
export async function fillAddress(f: FrameLocator, block: AddressBlock, input: AddressInput) {
  for (const { key } of ADDRESS_TEXT_FIELDS) {
    const value = input[key];
    if (value === undefined) continue;
    await textField(f, block, key).fill(value);
    await expect(textField(f, block, key)).toHaveValue(value);
  }
  if (input.location) await chooseLocation(f, block, input.location);
}

/** ค่าที่หน้าฟอร์มควรแสดงของ 1 ส่วน (รูปแบบเดียวกับ `readAddress`) — ช่องที่ไม่ได้กรอก = '' */
export function expectedAddress(input: AddressInput): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key } of ADDRESS_TEXT_FIELDS) out[key] = input[key] ?? '';
  out.stateCode = input.location?.state ?? '';
  out.districtCode = input.location?.district ?? '';
  out.cityCode = input.location?.city ?? '';
  out.postalCode = input.location?.postal ?? '';
  return out;
}

/**
 * ค่าที่ไม่ซ้ำกันทุกช่องทุกส่วน (หาใน API ได้ตรงตัวว่าลงช่องไหน) — `index` = ลำดับส่วน 1–8 · `stamp` = เลขท้ายของรอบ (4 หลัก)
 * เช่น ส่วนที่ 3 รอบ 2155: บ้านเลขที่ "32155/3" · ห้อง "3-2155" · หมู่ "13"
 */
export function uniqueAddressValues(tag: string, index: number, stamp: string): AddressValues {
  return {
    houseNo: `${index}${stamp}/${index}`,
    condo: `อาคาร${tag}${stamp}`,
    roomNo: `${index}-${stamp}`,
    soiSub: `ซอยแยก${tag}${stamp}`,
    soiMain: `ซอย${tag}${stamp}`,
    road: `ถนน${tag}${stamp}`,
    villageName: `หมู่บ้าน${tag}${stamp}`,
    villageNo: `${10 + index}`,
  };
}

/** กรอกช่องข้อความของที่อยู่ 1 ส่วน */
export async function fillAddressText(f: FrameLocator, block: AddressBlock, values: AddressValues) {
  for (const { key } of ADDRESS_TEXT_FIELDS) {
    const field = textField(f, block, key);
    await field.fill(values[key]);
    await expect(field).toHaveValue(values[key]);
  }
}

/** ค่าที่ฟอร์มแสดงอยู่ของ 1 ส่วน (ช่องข้อความ + จังหวัด / อำเภอ / ตำบล + รหัสไปรษณีย์) */
export async function readAddress(f: FrameLocator, block: AddressBlock): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const { key } of ADDRESS_TEXT_FIELDS) out[key] = await textField(f, block, key).inputValue();
  // ยังไม่เลือก = ข้อความ placeholder "เลือกจังหวัด" ฯลฯ → นับเป็นค่าว่าง
  for (const { key } of ADDRESS_LOCATION_FIELDS) out[key] = (await locationTrigger(f, block, key).innerText()).trim().replace(/^เลือก(จังหวัด|อำเภอ|ตำบล)$/, '');
  out.postalCode = await postalField(f, block).inputValue();
  return out;
}

/**
 * แปลง JSON เป็นรายการ `path = ค่า` (ค่าที่เป็นข้อความ / ตัวเลข) ไว้ค้นว่าค่าที่กรอกถูกเก็บลง field ไหน
 * object แบบ FHIR extension (`{ url, valueString }`) ใช้ท้าย url เป็นชื่อ เช่น `address[0].address-house-no`
 */
export function flattenJson(value: unknown, prefix = ''): { path: string; value: string }[] {
  if (value === null || value === undefined) return [];
  if (typeof value !== 'object') return [{ path: prefix, value: String(value) }];
  if (Array.isArray(value)) return value.flatMap((item, i) => flattenJson(item, `${prefix}[${i}]`));
  const obj = value as Record<string, unknown>;
  if (typeof obj.url === 'string') {
    const name = obj.url.split(/[/#]/).filter(Boolean).pop()!;
    const valueKey = Object.keys(obj).find((k) => k.startsWith('value'));
    if (valueKey) return flattenJson(obj[valueKey], prefix ? `${prefix}.${name}` : name);
    if (Array.isArray(obj.extension)) return flattenJson(obj.extension, prefix ? `${prefix}.${name}` : name);
  }
  return Object.entries(obj).flatMap(([k, v]) => flattenJson(v, prefix ? `${prefix}.${k}` : k));
}
