import fs from 'node:fs';
import type { FrameLocator, Locator, Page, Route } from '@playwright/test';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { expect, restartVideo, startClip, test } from '../../../helpers/functions/fixtures';
import { fillNewPatientForm, gotoReception, newPatientButton, receptionFrame, saveNewPatientButton } from '../../../helpers/functions/reception';
import {
  ADDRESS_BLOCKS,
  ADDRESS_LOCATION_FIELDS,
  ADDRESS_TEXT_FIELDS,
  SARABURI_PAKPHRIAO,
  SARABURI_TAKUT,
  blockContainer,
  chooseLocation,
  expectedAddress,
  fieldLabel,
  fillAddress,
  flattenJson,
  locationBox,
  locationTrigger,
  openListbox,
  postalField,
  readAddress,
  readLocationOptions,
  textError,
  textField,
  type AddressBlock,
  type AddressBlockId,
  type AddressInput,
  type AddressTextKey,
} from '../../../helpers/functions/reception-address';
import { newTestPatient } from '../../../helpers/functions/test-data';

// SBH-1290 [Registration] ที่อยู่ผู้ป่วยแยก field ตาม 43 แฟ้ม — EXE SBH-2598 (CT 2.9.0)
//   TS-SBH-1290-HPY SBH-2599: TC-SBH-1290-001–014 = SBH-2601–2614 · TS-SBH-1290-UHP SBH-2600: TC-SBH-1290-015–017 = SBH-2615–2617
// 4 section ตาม TC: ที่อยู่ และการติดต่อ (ทะเบียนบ้าน · ปัจจุบัน · ผู้ติดต่อฉุกเฉิน) · ที่อยู่ที่ทำงาน · ครอบครัว (บิดา · มารดา · คู่สมรส) · ข้อมูลการเกิด
// ที่อยู่หลัก = ที่อยู่ (ทะเบียนบ้าน) + ที่อยู่ปัจจุบัน (การ์ด: Required apply กับที่อยู่หลักเท่านั้น)
// ช่องบังคับเป็น config ต่อประเภทการยืนยันตัวตน (`GET /generated-emr-api/identity-verification-modes`): dev-x 16 ต.ค. 2026 เลขบัตรประชาชนไม่บังคับที่อยู่
//   หนังสือเดินทางบังคับ บ้านเลขที่ + จังหวัด / อำเภอ / ตำบล ของทะเบียนบ้าน + ปัจจุบัน · หมู่ไม่บังคับทุกประเภท
//   → ตรวจทั้ง 2 ประเภท (ผู้ใช้เลือก 14 ต.ค. 2026) · **ต้องผ่านทั้ง 2 ประเภท** (ผู้ใช้กำหนด 16 ต.ค. 2026 รอบ Retest) ทั้งเครื่องหมาย * (TC-001) และ UHP (TC-015–017)
//   16 ต.ค. 2026 บ่าย: ผู้ใช้ปรับ config ของเลขบัตรประชาชนให้บังคับ บ้านเลขที่ + หมู่ + จ/อ/ต + รหัสไปรษณีย์ (ทะเบียนบ้าน + ปัจจุบัน) · หนังสือเดินทางยังไม่บังคับหมู่
// ข้อมูล (dev-x · R10 / R11 · ไม่เปิด Visit): ผู้ป่วย A ที่อยู่ครบ · B เฉพาะ field บังคับ · C ที่อยู่ที่ทำงาน (บันทึกไม่ได้ = ไม่มีผู้ป่วย — SBH-2586)
//   เทสหน้าสร้าง + UHP ไม่สร้างข้อมูล (UHP ดักคำสั่งสร้างผู้ป่วยแล้วยกเลิก — ยืนยันว่าดักได้ก่อนกดบันทึก)
// รัน (dev-x): npx playwright test --headed --grep @SBH-1290 --output=.cache/run-1290 · เฉพาะเทส: --grep "@SBH-2607" (A) / @SBH-2611 (B) / @SBH-2608 (C) / @SBH-2615 (UHP)
//   ตรวจซ้ำกับผู้ป่วยเดิม (ไม่สร้างรายใหม่): SBH1290_A=<HN> · SBH1290_B=<HN> · SBH1290_C=<HN> (TC-012 แก้ถนนซ้ำได้ — ค่าเดิมของถนนอ่านจากหน้าแก้ไข)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC = (n: number) => `TC-${String(n).padStart(3, '0')} (SBH-${2600 + n})`;
const tags = (...n: number[]) => ['@SBH-1290', ...n.map((x) => `@SBH-${2600 + x}`)];
const ANNOTATION = [linear('SBH-1290'), linear('SBH-2598')];
// คำสั่งสร้าง / แก้ผู้ป่วยของเวชระเบียนยิงจาก service worker → ต้องเปิดตัวเลือกนี้ก่อน browser เริ่ม ไม่งั้น context.route / context.on('request') ไม่เห็น
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ??= '1';

const B = ADDRESS_BLOCKS;
const ALL_BLOCKS = Object.values(B) as AddressBlock[];
const CONTACT_BLOCKS = [B.official, B.current, B.emergency];
const FAMILY_BLOCKS = [B.father, B.mother, B.spouse];
const MAIN_BLOCKS = [B.official, B.current];
const firstLine = (error: unknown) => String(error instanceof Error ? error.message : error).split('\n')[0];
const PATIENT_URL = /\/next\/patients\/(\d+)/;
const CREATE_PATIENT = /\/new-demographic-api\/patients$/;

// ค่าที่กรอก — ที่อยู่หลักตามตัวอย่างใน TC-007 · ส่วนอื่นค่าไม่ซ้ำกัน (บ้านเลขที่ไม่ซ้ำทุกส่วน ใช้หาแถวบนหน้าข้อมูลผู้ป่วย / ใน API)
const A_ADDRESS: Partial<Record<AddressBlockId, AddressInput>> = {
  official: { houseNo: '99/1', condo: 'ลุมพินี', roomNo: '1203', soiSub: 'แยก 2', soiMain: 'สุขใจ', road: 'พหลโยธิน', villageName: 'ร่มเย็น', villageNo: '4', location: SARABURI_PAKPHRIAO },
  current: { houseNo: '88/2', condo: 'ศุภาลัย', roomNo: '507', soiSub: 'แยก 5', soiMain: 'ร่วมใจ', road: 'สุดบรรทัด', villageName: 'สุขสันต์', villageNo: '7', location: SARABURI_TAKUT },
  emergency: { houseNo: '21/4', condo: 'บ้านสวน', roomNo: '12', soiSub: 'แยก 1', soiMain: 'เทศบาล 3', road: 'เทศบาล', villageName: 'ชมพู', villageNo: '2', location: SARABURI_PAKPHRIAO },
  // TC-009: บ้านเลขที่ + หมู่ + ซอย + จ/อ/ต · TC-010: บ้านเลขที่ + หมู่ + จ/อ/ต (ค่าต่างจากที่อยู่หลัก)
  father: { houseNo: '12/3', villageNo: '5', soiMain: 'ร่มไม้', location: SARABURI_TAKUT },
  mother: { houseNo: '45/6', villageNo: '6', soiMain: 'ทองดี', location: SARABURI_TAKUT },
  spouse: { houseNo: '78/9', villageNo: '8', soiMain: 'สายบัว', location: SARABURI_TAKUT },
  birth: { houseNo: '101/5', villageNo: '9', location: SARABURI_TAKUT },
};
/** TC-011 / TC-014: ที่อยู่หลักเฉพาะ field บังคับตามการ์ด (บ้านเลขที่ + หมู่ + จ/อ/ต) */
const B_OFFICIAL: AddressInput = { houseNo: '7/7', villageNo: '3', location: SARABURI_PAKPHRIAO };
/** TC-008: ที่อยู่หลัก (field บังคับ) + ที่อยู่ที่ทำงาน บ้านเลขที่ + ถนน + จ/อ/ต */
const C_OFFICIAL: AddressInput = { houseNo: '5/5', villageNo: '1', location: SARABURI_PAKPHRIAO };
const C_WORK: AddressInput = { houseNo: '55/5', road: 'สุดบรรทัด', location: SARABURI_TAKUT };
const NEW_ROAD = 'มิตรภาพ';

/** checkStep ที่จับ error แล้วจดไว้ — TC ที่ไม่ผ่านไม่หยุด TC ที่เหลือ · จบเทสด้วย finish() */
function softSteps(page: Page) {
  const failures: string[] = [];
  const soft = (title: string, body: () => Promise<void>) =>
    checkStep(page, title, body).then(
      () => true,
      (error: unknown) => {
        failures.push(`${title} — ${firstLine(error)}`);
        console.log(`    ✗ ${title} — ${firstLine(error)}`);
        return false;
      },
    );
  const finish = () => expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
  return { soft, finish };
}

/** เลื่อนหัวของส่วนขึ้นบนจอ (ส่วนหนึ่งสูงเกือบเต็มจอ — ช่องท้ายส่วนต้องอยู่ในภาพด้วย) */
async function showBlock(f: FrameLocator, block: AddressBlock) {
  await blockContainer(f, block).evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
}

/** 12 ช่องของส่วน (ข้อความ 8 + จังหวัด / อำเภอ / ตำบล + รหัสไปรษณีย์) */
function blockFields(f: FrameLocator, block: AddressBlock) {
  return [...ADDRESS_TEXT_FIELDS.map(({ key }) => textField(f, block, key)), ...ADDRESS_LOCATION_FIELDS.map(({ key }) => locationTrigger(f, block, key)), postalField(f, block)];
}

/** ส่วนนี้แสดงช่องแยกครบ 12 ช่อง พร้อมป้ายตามการ์ด */
async function expectTwelveFields(f: FrameLocator, block: AddressBlock) {
  for (const { key, label } of ADDRESS_TEXT_FIELDS) {
    const field = textField(f, block, key);
    await expect(field, `${block.title}: ช่อง ${label}`).toBeVisible();
    await expect(field, `${block.title}: ช่อง ${label} ต้องกรอกได้`).toBeEditable();
    await expect(fieldLabel(field), `${block.title}: ป้ายของช่อง ${label}`).toContainText(label);
  }
  for (const { key, label } of ADDRESS_LOCATION_FIELDS) {
    await expect(locationTrigger(f, block, key), `${block.title}: ช่อง ${label} (Master Data)`).toBeVisible();
    await expect(locationBox(f, block, key), `${block.title}: ป้ายของช่อง ${label}`).toContainText(label);
  }
  await expect(postalField(f, block), `${block.title}: ช่องรหัสไปรษณีย์แยก`).toBeVisible();
}

/** ช่องที่การ์ดกำหนดเป็น Required (ตาราง Data Fields) */
type RequiredKey = 'houseNo' | 'villageNo' | 'cityCode' | 'districtCode' | 'stateCode';
const REQUIRED_KEYS: { key: RequiredKey; label: string }[] = [
  { key: 'houseNo', label: 'บ้านเลขที่' },
  { key: 'villageNo', label: 'หมู่' },
  { key: 'cityCode', label: 'ตำบล' },
  { key: 'districtCode', label: 'อำเภอ' },
  { key: 'stateCode', label: 'จังหวัด' },
];
const requiredBox = (f: FrameLocator, block: AddressBlock, key: RequiredKey) => (key === 'houseNo' || key === 'villageNo' ? fieldLabel(textField(f, block, key)) : locationBox(f, block, key));

/** ดอกจันบังคับกรอกที่ป้ายของ 5 ช่อง */
async function readStars(f: FrameLocator, block: AddressBlock): Promise<Record<RequiredKey, boolean>> {
  const out = {} as Record<RequiredKey, boolean>;
  for (const { key } of REQUIRED_KEYS) out[key] = (await requiredBox(f, block, key).innerText()).includes('*');
  return out;
}
type Stars = Map<AddressBlock, Record<RequiredKey, boolean>>;
const starText = (on: boolean) => (on ? 'มี *' : 'ไม่มี *');

/** เปลี่ยนประเภทการยืนยันตัวตนของฟอร์มสร้างผู้ป่วย */
async function chooseIdentityMode(f: FrameLocator, name: string) {
  const trigger = f.getByTestId('select-trigger-identifyVerification.verificationMode');
  await trigger.click();
  await f.getByRole('option', { name, exact: true }).click();
  await expect(trigger).toContainText(name);
  return trigger;
}

/** บิดา / มารดา / คู่สมรส / ผู้ติดต่อฉุกเฉิน: กรอกชื่อด้วย — กรอกชื่อแล้วบังคับคำนำหน้า · ผู้ติดต่อฉุกเฉินบังคับ "เกี่ยวข้องเป็น" + เบอร์มือถือ (dev-x 14 ต.ค. 2026) */
const PERSON: Partial<Record<AddressBlockId, string>> = { emergency: 'emergencyContacts[0]', father: 'family.father', mother: 'family.mother', spouse: 'family.spouse' };
async function fillPerson(f: FrameLocator, block: AddressBlock, familyName: string) {
  const person = PERSON[block.id as AddressBlockId];
  if (!person) return;
  await f.getByTestId(`${person}.firstName`).fill(`ญาติ${block.id}`);
  await f.getByTestId(`${person}.familyName`).fill(familyName);
  const prefix = f.getByTestId(`searchbox-trigger-${person}.prefixName-searchbox`);
  const prefixName = block.id === 'mother' ? 'นาง' : 'นาย';
  await expect(async () => {
    await prefix.click();
    await f.getByRole('option', { name: new RegExp(`^\\d+ - ${prefixName}$`) }).first().click({ timeout: 5_000 });
    await expect(prefix).toContainText(prefixName, { timeout: 3_000 });
  }, `${block.title}: เลือกคำนำหน้า`).toPass({ timeout: 30_000 });
  if (block.id === 'emergency') {
    await f.getByTestId(`${person}.relationship`).fill('ญาติ');
    await f.locator(`input[name="${person}.mobilePhoneNumber"]`).fill('0812345678');
  }
}

/** กรอกที่อยู่ 1 ส่วน (+ ชื่อเจ้าของที่อยู่) แล้วตีกรอบช่องที่กรอก */
async function fillBlock(page: Page, block: AddressBlock, input: AddressInput, familyName: string) {
  const f = receptionFrame(page);
  await showBlock(f, block);
  await fillPerson(f, block, familyName);
  await fillAddress(f, block, input);
  await showBlock(f, block);
  const marks = [
    ...ADDRESS_TEXT_FIELDS.filter(({ key }) => input[key] !== undefined).map(({ key }) => filled(textField(f, block, key))),
    ...(input.location ? [...ADDRESS_LOCATION_FIELDS.map(({ key }) => filled(locationTrigger(f, block, key))), expected(postalField(f, block))] : []),
  ];
  await markEvidence(...marks);
  await holdForClip(page);
}

/** กดบันทึกผู้ป่วยใหม่ → หน้าข้อมูลผู้ป่วย → HN (บันทึกไม่ได้ = throw พร้อมข้อความบนฟอร์ม + คำสั่งสร้างผู้ป่วยถูกส่งไหม) */
async function savePatient(page: Page, label: string): Promise<string> {
  const f = receptionFrame(page);
  await saveNewPatientButton(page).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await markEvidence(clicked(saveNewPatientButton(page)));
  await snapEvidence(page, `ก่อนกด บันทึก (${label})`);
  let posts = 0;
  const count = (route: Route) => {
    if (route.request().method() === 'POST') posts++;
    return route.fallback();
  };
  await page.context().route(CREATE_PATIENT, count);
  await saveNewPatientButton(page).click();
  const ok = await page.waitForURL(PATIENT_URL, { timeout: 60_000 }).then(() => true, () => false);
  await page.context().unroute(CREATE_PATIENT, count);
  if (!ok) {
    const alerts = await f
      .getByText('โปรดระบุ', { exact: true })
      .filter({ visible: true })
      .evaluateAll((els) => els.map((e) => (e.closest('div:has(label)')?.querySelector('label')?.textContent ?? '?').trim()));
    fs.writeFileSync(test.info().outputPath('form-after-save.html'), await f.locator('body').evaluate((b) => b.outerHTML));
    throw new Error(`บันทึกผู้ป่วยใหม่ไม่สำเร็จ (ยังอยู่หน้าฟอร์มหลัง 60 วินาที · คำสั่งสร้างผู้ป่วย${posts ? `ถูกส่ง ${posts} ครั้ง` : 'ไม่ถูกส่ง'} · ข้อความบนฟอร์ม: ${alerts.join(' · ') || 'ไม่มี'})`);
  }
  const hn = page.url().match(PATIENT_URL)![1];
  await expect(f.getByRole('heading', { name: 'ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 60_000 });
  await markEvidence(expected(page.getByRole('main').getByText(`HN ${hn}`, { exact: true }).first()));
  console.log(`    ผู้ป่วย AUTO (${label}) HN ${hn}`);
  test.info().annotations.push({ type: 'ผู้ป่วย', description: `${label} · HN ${hn}` });
  return hn;
}

/** อ่าน API ด้วย token ของแอปเอง (จับจาก request ที่แอปยิง) — GET อย่างเดียว */
function apiReader(page: Page) {
  let authorization = '';
  page.context().on('request', (req) => {
    const auth = req.headers()['authorization'];
    if (auth && /\/(new-demographic-api|generated-emr-api)\//.test(req.url())) authorization = auth;
  });
  return async (path: string) => {
    await expect.poll(() => authorization, { message: 'ต้องมี token จาก request ของแอป' }).not.toBe('');
    const res = await page.request.get(path, { headers: { authorization } });
    expect(res.ok(), `GET ${path} → ${res.status()}`).toBeTruthy();
    return res.json();
  };
}

/** หน้าข้อมูลผู้ป่วย → กด แก้ไขข้อมูลผู้ป่วย → ฟอร์มแก้ไข */
async function openEdit(page: Page, title: string) {
  const f = receptionFrame(page);
  await checkStep(page, title, async () => {
    const edit = f.getByRole('button', { name: 'แก้ไขข้อมูลผู้ป่วย' });
    await expect(edit).toBeVisible({ timeout: 90_000 });
    await markEvidence(clicked(edit));
    await snapEvidence(page, 'ก่อนกด แก้ไขข้อมูลผู้ป่วย');
    await edit.click();
    await page.waitForURL(/actions=patientEdit/, { timeout: 60_000 });
    await expect(textField(f, B.official, 'houseNo')).toHaveValue(/.+/, { timeout: 60_000 });
    await markEvidence(expected(f.getByRole('heading', { name: /แก้ไขข้อมูลผู้ป่วย/ }).first()));
  });
}

async function openPatient(page: Page, hn: string) {
  await checkStep(page, `ผู้ป่วยเดิม HN ${hn} → หน้าข้อมูลผู้ป่วย`, async () => {
    await page.goto(`/cortex/next/patients/${hn}?views=patientInfo`);
    await expect(receptionFrame(page).getByRole('heading', { name: 'ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 90_000 });
  });
}

const FIELD_ROWS: { key: string; label: string; api: string }[] = [
  ...ADDRESS_TEXT_FIELDS.map(({ key, label, f43 }) => ({ key, label: `${label} (${f43})`, api: key })),
  { key: 'stateCode', label: 'จังหวัด (CHANGWAT)', api: 'state.display' },
  { key: 'districtCode', label: 'อำเภอ (AMPUR)', api: 'district.display' },
  { key: 'cityCode', label: 'ตำบล (TAMBON)', api: 'city.display' },
  { key: 'postalCode', label: 'รหัสไปรษณีย์', api: 'postalCode' },
];
type Flat = { path: string; value: string }[];
const lastSegment = (path: string) => path.split('.').pop()!.replace(/\[\d+\]$/, '');
/** ส่วนของที่อยู่ใน API = path ที่เก็บบ้านเลขที่ของส่วนนั้น ตัดชื่อ field ท้ายออก (เช่น data.officialAddress · include.fatherContact.currentAddress) */
const apiPrefixOf = (flat: Flat, houseNo: string) => {
  const p = flat.find((x) => x.value === houseNo && lastSegment(x.path) === 'houseNo')?.path;
  return p ? p.slice(0, p.lastIndexOf('.')) : undefined;
};

/** เทียบค่าที่กรอก ↔ หน้าแก้ไข ↔ API ของ 1 ส่วน (12 ช่อง) */
async function compareBlock(f: FrameLocator, block: AddressBlock, input: AddressInput, flat: Flat): Promise<CompareRow[]> {
  const shown = await readAddress(f, block);
  const want = expectedAddress(input);
  const prefix = input.houseNo ? apiPrefixOf(flat, input.houseNo) : undefined;
  return FIELD_ROWS.map(({ key, label, api }) => {
    const apiValue = prefix ? (flat.find((x) => x.path === `${prefix}.${api}`)?.value ?? '') : '(ไม่พบส่วนนี้ใน API)';
    return { label, values: [want[key] || '(ว่าง)', shown[key] || '(ว่าง)', `${apiValue || '(ว่าง)'}${prefix && key === 'houseNo' ? ` — ${prefix}` : ''}`], same: shown[key] === want[key] && apiValue === want[key] };
  });
}

/** ตาราง 12 ช่องของส่วน บนหน้าแก้ไข (กรอบแดงทุกช่อง) — ตัดสินว่าทุกช่องตรงกับที่กรอก */
async function prefillStep(page: Page, soft: ReturnType<typeof softSteps>['soft'], title: string, block: AddressBlock, input: AddressInput, flat: Flat) {
  const f = receptionFrame(page);
  await soft(title, async () => {
    await showBlock(f, block);
    const rows = await compareBlock(f, block, input, flat);
    await markEvidence(...blockFields(f, block).map(expected));
    await showCompareTable(page, `${title.split(' ')[0]} ${block.title} — ที่กรอก / หน้าแก้ไข / API`, ['ที่กรอก', 'หน้าแก้ไข', 'API'], rows, { width: '860px' });
    await holdForClip(page, 1_800);
    expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' | ')}`), `${block.title}: ทุกช่องต้องแสดงค่าที่กรอก ไม่สลับช่อง`).toEqual([]);
  }).finally(() => hideCompareTable(page));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** รูปแบบค้นค่าในข้อความที่อยู่ — ตัวเลขล้วน (หมู่ / ห้อง) ต้องเป็นคำแยก */
const valueRe = (value: string) => (/^\d+$/.test(value) ? new RegExp(`(?:^|[\\s,])${escapeRe(value)}(?=[\\s,]|$)`, 'g') : new RegExp(escapeRe(value), 'g'));
/** คำนำหน้าที่ไม่ควรโผล่เมื่อช่องนั้นว่าง (TC-014) */
const EMPTY_PREFIX: Partial<Record<AddressTextKey, RegExp>> = { condo: /อาคาร|คอนโด/, roomNo: /ห้อง/, soiSub: /ซอยแยก/, soiMain: /ซอย/, road: /ถนน/, villageName: /หมู่บ้าน/, villageNo: /หมู่(?!บ้าน)/ };
/** ปัญหาของข้อความที่อยู่: ขาด / ซ้ำ / ตัวคั่นหรือคำนำหน้าของช่องว่าง */
function textProblems(text: string, input: AddressInput) {
  const problems: string[] = [];
  if (!text) return ['ไม่พบบรรทัดที่อยู่'];
  const loc = input.location;
  const parts = [...ADDRESS_TEXT_FIELDS.filter(({ key }) => input[key]).map(({ key }) => input[key]!), ...(loc ? [loc.city, loc.district, loc.state, loc.postal] : [])];
  // นับค่าที่ยาวก่อนแล้วตัดออก — ค่าสั้นที่อยู่ในค่ายาว (สระบุรี ใน เมืองสระบุรี) ไม่ถูกนับซ้ำ
  let rest = text;
  for (const value of [...parts].sort((a, b) => b.length - a.length)) {
    const n = (rest.match(valueRe(value)) ?? []).length;
    if (n === 0) problems.push(`ขาด "${value}"`);
    if (n > 1) problems.push(`ซ้ำ "${value}" ${n} ครั้ง`);
    rest = rest.replace(valueRe(value), ' ');
  }
  for (const { key, label } of ADDRESS_TEXT_FIELDS) {
    const re = EMPTY_PREFIX[key];
    if (!input[key] && re && re.test(text)) problems.push(`มีคำของช่องที่ว่าง (${label})`);
  }
  if (/,\s*,|^\s*[,-]|[,-]\s*$|\s-\s|\s-,/.test(text)) problems.push('มีตัวคั่นของช่องที่ว่าง');
  return problems;
}

/** ลำดับ ตำบล / อำเภอ / จังหวัด ในข้อความ (ข้อสังเกต — Expected ไม่ได้กำหนดลำดับ) */
function locationOrder(text: string, input: AddressInput) {
  const loc = input.location;
  if (!loc) return '';
  const at = (v: string) => text.search(new RegExp(`(^|[\\s,])${escapeRe(v)}(?=[\\s,]|$)`));
  return [
    { label: 'ตำบล', i: at(loc.city) },
    { label: 'อำเภอ', i: at(loc.district) },
    { label: 'จังหวัด', i: at(loc.state) },
  ]
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.label)
    .join(' → ');
}

/** ข้อความที่อยู่บนหน้าข้อมูลผู้ป่วย = บรรทัดที่มีบ้านเลขที่ของส่วนนั้น */
async function infoText(f: FrameLocator, houseNo: string) {
  const line = f.getByText(houseNo, { exact: false }).last();
  return { line, text: (await line.count()) ? (await line.innerText()).replace(/\s+/g, ' ').trim() : '' };
}

test.describe('SBH-1290 ที่อยู่ผู้ป่วยแยก field ตาม 43 แฟ้ม (dev-x · CT 2.9.0)', () => {
  test.describe.configure({ timeout: 900_000 });

  test(
    'หน้าสร้างผู้ป่วยใหม่: field ที่อยู่แยก 12 ช่องทุก section + ช่องบังคับ + จังหวัด / อำเภอ / ตำบล จาก Master Data (ไม่บันทึก · Super_User)',
    { tag: tags(1, 2, 3, 4, 6), annotation: ANNOTATION },
    async ({ page }) => {
      const f = receptionFrame(page);
      const { soft, finish } = softSteps(page);
      const api = apiReader(page);

      await checkStep(page, 'เวชระเบียน → กด สร้างผู้ป่วยใหม่ → ฟอร์มสร้างผู้ป่วยใหม่', async () => {
        await gotoReception(page);
        await newPatientButton(page).click({ timeout: 120_000 });
        await page.waitForURL(/\/reception\/create-patient/, { timeout: 60_000 });
        // iframe เวชระเบียนบน dev-x บางช่วงโหลดเกิน 60 วินาที (16 ต.ค. 2026 บ่าย)
        await expect(textField(f, B.official, 'houseNo')).toBeVisible({ timeout: 150_000 });
        // คลิปเริ่มที่ฟอร์มสร้างผู้ป่วยใหม่ — ตัดช่วงจอว่างตอนแอปเวชระเบียน (iframe) โหลด (dev-x 16 ต.ค. 2026 ~60 วินาที)
        await restartVideo(page);
        await markEvidence(expected(f.getByTestId('select-trigger-identifyVerification.verificationMode')));
      });

      const cidStars: Stars = new Map();
      const passportStars: Stars = new Map();
      const sections: { tc: number; name: string; blocks: AddressBlock[] }[] = [
        { tc: 1, name: 'ที่อยู่ และการติดต่อ', blocks: CONTACT_BLOCKS },
        { tc: 2, name: 'ที่อยู่ที่ทำงาน', blocks: [B.work] },
        { tc: 3, name: 'ครอบครัว', blocks: FAMILY_BLOCKS },
        { tc: 4, name: 'ข้อมูลการเกิด', blocks: [B.birth] },
      ];
      // 1 คลิปต่อ 1 TC (R61): แต่ละ TC ตรวจ 12 ช่อง + ดอกจันทั้ง 2 ประเภทให้จบในช่วงของตัวเอง — สลับประเภทการยืนยันตัวตนไปมา (ฟอร์มยังไม่กรอกอะไร)
      const MODES = { cid: 'เลขบัตรประชาชน', passport: 'หนังสือเดินทาง' } as const;
      let mode: keyof typeof MODES = 'cid';
      const switchMode = async (tc: number) => {
        const next = mode === 'cid' ? 'passport' : 'cid';
        await checkStep(page, `${TC(tc)} เปลี่ยนประเภทการยืนยันตัวตนเป็น ${MODES[next]}`, async () => {
          await f.getByTestId('identify-form').evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          const trigger = await chooseIdentityMode(f, MODES[next]);
          await markEvidence(filled(trigger));
        });
        mode = next;
      };
      const readModeStars = async (blocks: AddressBlock[]) => {
        for (const block of blocks) (mode === 'cid' ? cidStars : passportStars).set(block, await readStars(f, block));
      };

      for (const { tc, name, blocks } of sections) {
        await startClip(page, `TC-${String(tc).padStart(3, '0')}`);
        for (const block of blocks) {
          await soft(`${TC(tc)} ${block.title}: แสดง field ที่อยู่แยก 12 ช่อง`, async () => {
            await showBlock(f, block);
            await expectTwelveFields(f, block);
            if (block.id === 'birth') {
              // ช่องเดิมแบบรวม ต้องไม่เหลือ
              await expect(blockContainer(f, block).getByText(/บ้านเลขที่\s*\/\s*หมู่\s*\/\s*ซอย\s*\/\s*ถนน/), 'ข้อมูลการเกิด: ต้องไม่มีช่องเดิม "บ้านเลขที่ / หมู่ / ซอย / ถนน"').toHaveCount(0);
              await expect(blockContainer(f, block).getByText(/ตำบล\s*\/\s*อำเภอ\s*\/\s*จังหวัด/), 'ข้อมูลการเกิด: ต้องไม่มีช่องเดิม "ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์"').toHaveCount(0);
              await expect(f.getByTestId('birth.addressLine'), 'ข้อมูลการเกิด: ต้องไม่มีช่อง addressLine เดิม').toHaveCount(0);
            }
            await markEvidence(...blockFields(f, block).map(expected));
            await holdForClip(page);
          });
        }
        await readModeStars(blocks);
        await switchMode(tc);
        await readModeStars(blocks);

        const main = tc === 1;
        await soft(`${TC(tc)} ${name}: เครื่องหมายบังคับกรอก${main ? 'ที่บ้านเลขที่ / หมู่ / ตำบล / อำเภอ / จังหวัด ของที่อยู่หลัก' : ' — ต้องไม่มี'}`, async () => {
          const rows: CompareRow[] = [];
          for (const block of blocks) {
            for (const { key, label } of REQUIRED_KEYS) {
              const cid = cidStars.get(block)![key];
              const passport = passportStars.get(block)![key];
              const isMain = MAIN_BLOCKS.includes(block);
              // ที่อยู่หลัก: ต้องมี * ทั้ง 2 ประเภท (ผู้ใช้กำหนด 16 ต.ค. 2026 รอบ Retest) · ส่วนอื่น (รวมผู้ติดต่อฉุกเฉิน): ต้องไม่มี * ทั้ง 2 ประเภท
              rows.push({ label: `${block.title} — ${label}`, values: [starText(cid), starText(passport)], same: isMain ? cid && passport : !cid && !passport });
            }
          }
          const block = blocks[0];
          await showBlock(f, block);
          await markEvidence(...REQUIRED_KEYS.map(({ key }) => expected(requiredBox(f, block, key))));
          await showCompareTable(page, `${TC(tc)} เครื่องหมายบังคับกรอก (*) ที่ป้ายของช่อง`, ['เลขบัตรประชาชน', 'หนังสือเดินทาง'], rows, { width: '640px' });
          await holdForClip(page, 2_000);
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' / ')}`), main ? 'ที่อยู่หลัก: 5 ช่องต้องมี * · ส่วนอื่นต้องไม่มี' : 'ต้องไม่มีเครื่องหมายบังคับกรอก').toEqual([]);
        }).finally(() => hideCompareTable(page));
      }
      test.info().annotations.push({ type: 'ดอกจันบังคับ', description: JSON.stringify({ cid: Object.fromEntries([...cidStars].map(([b, s]) => [b.id, s])), passport: Object.fromEntries([...passportStars].map(([b, s]) => [b.id, s])) }) });

      await startClip(page, 'TC-006');
      // TC-006: จังหวัด → อำเภอ → ตำบล ของที่อยู่ (ทะเบียนบ้าน) · รายการเทียบกับ Master Data `thai_address_with_address_details` (API เดียวกับที่หน้าใช้ — ตรวจรหัสขึ้นต้นด้วยรหัสของชั้นบนด้วย)
      const off = B.official;
      await soft(`${TC(6)} ก่อนเลือกจังหวัด: ช่องอำเภอ / ตำบล (ข้อมูลประกอบ)`, async () => {
        await showBlock(f, off);
        const info: string[] = [];
        for (const key of ['districtCode', 'cityCode'] as const) {
          const trigger = locationTrigger(f, off, key);
          if (await trigger.isDisabled()) {
            info.push(`${key}: กดไม่ได้`);
            continue;
          }
          await trigger.click();
          await page.waitForTimeout(1_500);
          info.push(`${key}: เปิดได้ · ตัวเลือก ${await openListbox(f).getByRole('option').count()} รายการ`);
          await page.keyboard.press('Escape');
        }
        test.info().annotations.push({ type: 'TC-006 ก่อนเลือกจังหวัด', description: info.join(' · ') });
        await markEvidence(expected(locationTrigger(f, off, 'districtCode')), expected(locationTrigger(f, off, 'cityCode')));
      });

      const pick = async (key: 'stateCode' | 'districtCode' | 'cityCode', name: string) => {
        const option = openListbox(f).getByRole('option', { name, exact: true }).first();
        await option.scrollIntoViewIfNeeded();
        await option.click();
        await expect(locationTrigger(f, off, key)).toContainText(name);
      };
      let provinceCode = '';
      await checkStep(page, `${TC(6)} ขั้น 3 เลือกจังหวัด สระบุรี`, async () => {
        await showBlock(f, off);
        const states = await readLocationOptions(f, off, 'stateCode');
        provinceCode = states.find((s) => s.name === SARABURI_PAKPHRIAO.state)?.code ?? '';
        expect(provinceCode, 'รายการจังหวัดต้องมี สระบุรี').not.toBe('');
        await markEvidence(clicked(openListbox(f).getByRole('option', { name: SARABURI_PAKPHRIAO.state, exact: true }).first()));
        await pick('stateCode', SARABURI_PAKPHRIAO.state);
        await markEvidence(filled(locationTrigger(f, off, 'stateCode')));
      });

      /** รายการที่เปิดอยู่ ↔ Master Data (ชั้นล่างของรหัส parent) */
      const masterStep = async (title: string, key: 'districtCode' | 'cityCode', filter: string, parent: string, codeOf: (row: Record<string, unknown>) => string, nameOf: (row: Record<string, unknown>) => string) => {
        let shown: { code: string; name: string }[] = [];
        await soft(title, async () => {
          await showBlock(f, off);
          shown = await readLocationOptions(f, off, key);
          const body = (await api(`/generated-emr-api/thai_address_with_address_details?select=*&sort=rank.asc&page=1&perPage=1000&filter[${filter}][equals]=${parent}`)) as { data: Record<string, unknown>[] };
          const master = new Map(body.data.map((row) => [codeOf(row), nameOf(row)]));
          const shownCodes = new Set(shown.map((s) => s.code));
          const extra = shown.filter((s) => !master.has(s.code) || !s.code.startsWith(parent));
          const missing = [...master].filter(([code]) => !shownCodes.has(code));
          const nameDiff = shown.filter((s) => master.has(s.code) && master.get(s.code) !== s.name);
          const rows: CompareRow[] = [
            { label: 'จำนวนรายการ', values: [String(shown.length), String(master.size)], same: shown.length === master.size },
            { label: `รหัสขึ้นต้นด้วย ${parent} ทุกรายการ`, values: [shown.every((s) => s.code.startsWith(parent)) ? 'ใช่' : 'ไม่ใช่', '-'], same: shown.every((s) => s.code.startsWith(parent)) },
            { label: 'แสดงแต่ไม่อยู่ใน Master Data', values: [extra.map((s) => `${s.code} ${s.name}`).join(', ') || '-', '-'], same: !extra.length },
            { label: 'อยู่ใน Master Data แต่ไม่แสดง', values: ['-', missing.map(([c, n]) => `${c} ${n}`).join(', ') || '-'], same: !missing.length },
            { label: 'ชื่อไม่ตรง Master Data', values: [nameDiff.map((s) => `${s.code} ${s.name}`).join(', ') || '-', nameDiff.map((s) => master.get(s.code)).join(', ') || '-'], same: !nameDiff.length },
            { label: 'รายการ (รหัส ชื่อ)', values: [shown.map((s) => `${s.code} ${s.name}`).join(', '), [...master].map(([c, n]) => `${c} ${n}`).join(', ')], same: true },
          ];
          await markEvidence(expected(openListbox(f)));
          await showCompareTable(page, `${title.split(' ')[0]} รายการบนจอ ↔ Master Data (${filter} = ${parent})`, ['บนจอ', 'Master Data'], rows, { width: '880px' });
          await holdForClip(page, 2_000);
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' | ')}`), 'รายการต้องตรงกับ Master Data ของชั้นที่เลือก').toEqual([]);
        }).finally(() => hideCompareTable(page));
        return shown;
      };

      const districts = await masterStep(`${TC(6)} ขั้น 4 รายการอำเภอ = อำเภอของจังหวัดสระบุรี`, 'districtCode', 'province_code', provinceCode, (r) => String(r.districtCode), (r) => String((r.districtInfo as { th: { name: string } }).th.name));
      await checkStep(page, `${TC(6)} ขั้น 4 เลือกอำเภอ เมืองสระบุรี`, async () => {
        if (!(await openListbox(f).isVisible())) await locationTrigger(f, off, 'districtCode').click();
        await pick('districtCode', SARABURI_PAKPHRIAO.district);
        await markEvidence(filled(locationTrigger(f, off, 'districtCode')));
      });
      const districtCode = districts.find((d) => d.name === SARABURI_PAKPHRIAO.district)?.code ?? '';
      await masterStep(`${TC(6)} ขั้น 5 รายการตำบล = ตำบลของอำเภอเมืองสระบุรี`, 'cityCode', 'district_code', districtCode, (r) => String(r.subDistrictCode), (r) => String((r.subDistrictInfo as { th: { name: string } }).th.name));
      await soft(`${TC(6)} ขั้น 5 เลือกตำบล ปากเพรียว → จังหวัด อำเภอ ตำบล เป็น 3 field แยกกัน`, async () => {
        if (!(await openListbox(f).isVisible())) await locationTrigger(f, off, 'cityCode').click();
        await pick('cityCode', SARABURI_PAKPHRIAO.city);
        await expect(postalField(f, off), 'รหัสไปรษณีย์ขึ้นเองจากตำบล').toHaveValue(SARABURI_PAKPHRIAO.postal);
        await showBlock(f, off);
        await markEvidence(...ADDRESS_LOCATION_FIELDS.map(({ key }) => expected(locationTrigger(f, off, key))), expected(postalField(f, off)));
        await holdForClip(page);
      });

      finish();
    },
  );

  test(
    'ผู้ป่วย A: ที่อยู่ครบทุก field ทุก section → บันทึก → หน้าแก้ไขแสดงค่าตรง field → แก้ถนน → ที่อยู่แบบข้อความ (Super_User)',
    { tag: tags(5, 7, 9, 10, 12, 13), annotation: ANNOTATION },
    async ({ page }) => {
      const f = receptionFrame(page);
      const { soft, finish } = softSteps(page);
      const api = apiReader(page);
      const patient = newTestPatient('Addr1290A');
      let hn = process.env.SBH1290_A ?? '';

      // 1 คลิปต่อ 1 TC (R61 · ผู้ใช้เลือก "ผู้ป่วยร่วม แยกคลิปต่อ TC" 18 ต.ค. 2026): คลิป TC-007 = สร้างผู้ป่วย A (กรอกทุก section — ครอบครัว / ข้อมูลการเกิด เป็นข้อมูลของ TC-009 / 010)
      //   แล้วตรวจที่อยู่ และการติดต่อ บนหน้าแก้ไข · TC อื่นเปิดหน้าข้อมูลผู้ป่วย A ใหม่แล้วเริ่มคลิปของตัวเอง (ลำดับ 007 → 013 → 005 → 009 → 010 → 012 · TC-012 แก้ข้อมูลจึงไว้ท้าย)
      const clipOf = (tc: number) => `TC-${String(tc).padStart(3, '0')}`;
      const reopen = async (tc: number, edit = true) => {
        await openPatient(page, hn);
        await startClip(page, clipOf(tc));
        if (edit) await openEdit(page, `${TC(tc)} กด แก้ไขข้อมูลผู้ป่วย → ฟอร์มแก้ไข`);
      };
      const readApi = async (label: string) => {
        const body = await api(`/new-demographic-api/patients/${hn}?include=RelatedPerson`);
        await test.info().attach(`GET patients/${hn} (${label})`, { body: JSON.stringify(body, null, 2), contentType: 'application/json' });
        return flattenJson(body);
      };

      if (!hn) {
        await checkStep(page, `${TC(7)} ขั้น 2 เวชระเบียน → สร้างผู้ป่วยใหม่ → กรอกข้อมูลส่วนตัวที่บังคับ (เลขบัตรประชาชน)`, async () => {
          await gotoReception(page);
          await startClip(page, clipOf(7));
          await fillNewPatientForm(page, patient);
          await markEvidence(filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), filled(f.getByTestId('identifyVerification.identify')));
        });
        const fills: { tc: number; block: AddressBlock }[] = [
          { tc: 7, block: B.official },
          { tc: 7, block: B.current },
          { tc: 7, block: B.emergency },
          { tc: 9, block: B.father },
          { tc: 9, block: B.mother },
          { tc: 9, block: B.spouse },
          { tc: 10, block: B.birth },
        ];
        for (const { tc, block } of fills) {
          const input = A_ADDRESS[block.id as AddressBlockId]!;
          const what = tc === 7 ? 'ครบทุก field' : `${tc === 9 ? 'บ้านเลขที่ + หมู่ + ซอย + จ/อ/ต' : 'บ้านเลขที่ + หมู่ + จ/อ/ต'} (ข้อมูลของ ${TC(tc)})`;
          await checkStep(page, `${TC(7)} ขั้น 3 กรอก ${block.title}: ${what}`, () => fillBlock(page, block, input, patient.familyName));
        }
        hn = await checkStep(page, `${TC(7)} ขั้น 4 กดบันทึก → ได้ HN ใหม่`, () => savePatient(page, `ผู้ป่วย A ${patient.familyName}`));
      } else {
        await openPatient(page, hn);
        await startClip(page, clipOf(7));
      }

      // TC-007 ขั้น 5: หน้าแก้ไข — ที่อยู่ และการติดต่อ (ทะเบียนบ้าน · ปัจจุบัน · ผู้ติดต่อฉุกเฉิน) แต่ละ field แสดงค่าที่กรอก + API
      await openEdit(page, `${TC(7)} ขั้น 5 กด แก้ไขข้อมูลผู้ป่วย → ฟอร์มแก้ไข`);
      // รันซ้ำกับผู้ป่วยเดิมหลัง TC-012: ถนนของทะเบียนบ้านเป็นค่าใหม่แล้ว
      const officialRoad = async () => ({ ...A_ADDRESS.official!, road: (await textField(f, B.official, 'road').inputValue()) || A_ADDRESS.official!.road });
      const flat7 = await readApi('TC-007 หลังสร้าง');
      const officialAt7 = await officialRoad();
      for (const block of CONTACT_BLOCKS) {
        await prefillStep(page, soft, `${TC(7)} หน้าแก้ไข ${block.title}: แต่ละ field แสดงค่าที่กรอก`, block, block.id === 'official' ? officialAt7 : A_ADDRESS[block.id as AddressBlockId]!, flat7);
      }

      await reopen(13, false);

      // TC-013: ข้อความที่อยู่บนหน้าข้อมูลผู้ป่วย (ตัดสินที่อยู่หลัก · ส่วนอื่นเป็นข้อมูลประกอบ)
      await soft(`${TC(13)} หน้าข้อมูลผู้ป่วย: ที่อยู่แบบข้อความครบทุกองค์ประกอบ ไม่ตกหล่น ไม่ซ้ำ`, async () => {
        await expect(f.getByRole('heading', { name: 'ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 60_000 });
        const rows: CompareRow[] = [];
        for (const [id, input] of Object.entries(A_ADDRESS) as [AddressBlockId, AddressInput][]) {
          const block = B[id];
          const { text } = await infoText(f, input.houseNo!);
          const problems = textProblems(text, input);
          const judged = MAIN_BLOCKS.includes(block);
          rows.push({ label: judged ? block.title : `${block.title} (ข้อมูลประกอบ)`, values: [text || '(ไม่พบ)', problems.join(' · ') || 'ครบ ไม่ซ้ำ', locationOrder(text, input)], same: !problems.length });
        }
        const { line } = await infoText(f, A_ADDRESS.official!.houseNo!);
        await line.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        // ทะเบียนบ้าน / ปัจจุบัน อยู่บรรทัดติดกัน — ตีกรอบกล่องของ 2 บรรทัดรวมกัน (ป้ายของกรอบไม่บังข้อความ)
        const lines = f.locator('div').filter({ has: f.getByText(A_ADDRESS.official!.houseNo!, { exact: false }) }).filter({ has: f.getByText(A_ADDRESS.current!.houseNo!, { exact: false }) }).last();
        await markEvidence(expected((await lines.count()) ? lines : line));
        await showCompareTable(page, `${TC(13)} ที่อยู่แบบข้อความบนหน้าข้อมูลผู้ป่วย`, ['ข้อความที่แสดง', 'ผลตรวจ', 'ลำดับ (ข้อสังเกต)'], rows, { side: 'left', width: '1080px' });
        await holdForClip(page, 2_500);
        const main = rows.filter((r) => !r.label.includes('ข้อมูลประกอบ') && !r.same);
        expect(main.map((r) => `${r.label}: ${r.values[1]}`), 'ที่อยู่หลักต้องครบทุกองค์ประกอบ ไม่ซ้ำ').toEqual([]);
      }).finally(() => hideCompareTable(page));

      await reopen(5);
      for (const block of ALL_BLOCKS) {
        await soft(`${TC(5)} หน้าแก้ไข ${block.title}: แสดง field แยก 12 ช่อง`, async () => {
          await showBlock(f, block);
          await expectTwelveFields(f, block);
          await markEvidence(...blockFields(f, block).map(expected));
          await holdForClip(page, 800);
        });
      }

      for (const { tc, blocks } of [
        { tc: 9, blocks: FAMILY_BLOCKS },
        { tc: 10, blocks: [B.birth] },
      ]) {
        await reopen(tc);
        const flatTc = await readApi(clipOf(tc));
        for (const block of blocks) {
          await prefillStep(page, soft, `${TC(tc)} หน้าแก้ไข ${block.title}: แต่ละ field แสดงค่าที่กรอก`, block, A_ADDRESS[block.id as AddressBlockId]!, flatTc);
        }
      }

      // TC-012: แก้เฉพาะถนนของที่อยู่ (ทะเบียนบ้าน) → บันทึก → เปิดหน้าแก้ไขอีกครั้ง
      await reopen(12);
      const checks = ALL_BLOCKS.filter((block) => A_ADDRESS[block.id as AddressBlockId]);
      const flat = await readApi('TC-012 ก่อนแก้ไข');
      const officialNow = await officialRoad();
      const editedOfficial = { ...A_ADDRESS.official!, road: NEW_ROAD };
      const roadBefore = officialNow.road;
      await checkStep(page, `${TC(12)} ขั้น 3 แก้ถนนเป็น "${NEW_ROAD}" แล้วกดบันทึก`, async () => {
        await showBlock(f, B.official);
        // รันซ้ำกับผู้ป่วยเดิม: ถนนเป็น "มิตรภาพ" อยู่แล้ว → สลับกลับเป็นค่าตาม TC-007 ก่อน ให้มีการแก้จริง
        await textField(f, B.official, 'road').fill(roadBefore === NEW_ROAD ? A_ADDRESS.official!.road! : NEW_ROAD);
        if (roadBefore === NEW_ROAD) editedOfficial.road = A_ADDRESS.official!.road!;
        await markEvidence(filled(textField(f, B.official, 'road')));
        await snapEvidence(page, 'แก้ถนน');
        const submit = f.getByTestId('submit-button');
        await submit.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await markEvidence(clicked(submit));
        await snapEvidence(page, 'ก่อนกด บันทึก (แก้ไข)');
        const updated = page.waitForResponse((res) => res.request().method() !== 'GET' && /\/new-demographic-api\/patients\/[^/?]+$/.test(new URL(res.url()).pathname), { timeout: 60_000 });
        await submit.click();
        const res = await updated;
        expect(res.ok(), `บันทึกการแก้ไข → ${res.status()} ${(await res.text().catch(() => '')).slice(0, 300)}`).toBeTruthy();
        await expect(f.getByRole('heading', { name: 'ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 60_000 });
      });
      await openEdit(page, `${TC(12)} ขั้น 4 เปิดหน้าแก้ไขข้อมูลผู้ป่วยอีกครั้ง`);
      const after = await api(`/new-demographic-api/patients/${hn}?include=RelatedPerson`);
      await test.info().attach(`GET patients/${hn} (หลังแก้ไข)`, { body: JSON.stringify(after, null, 2), contentType: 'application/json' });
      const flatAfter = flattenJson(after);
      for (const block of checks) {
        const input = block.id === 'official' ? editedOfficial : A_ADDRESS[block.id as AddressBlockId]!;
        await prefillStep(page, soft, `${TC(12)} หลังแก้ ${block.title}: ${block.id === 'official' ? `ถนน = "${editedOfficial.road}" ช่องอื่นคงเดิม` : 'คงเดิมทุกช่อง'}`, block, input, flatAfter);
      }
      await soft(`${TC(12)} API: ค่าที่เปลี่ยนหลังแก้ไข = ถนนของทะเบียนบ้านเท่านั้น`, async () => {
        const before = new Map(flat.map((x) => [x.path, x.value]));
        const now = new Map(flatAfter.map((x) => [x.path, x.value]));
        const ignore = /updated|lastUpdated|version|meta|createdAt|modified|audit/i;
        const offPrefix = apiPrefixOf(flatAfter, A_ADDRESS.official!.houseNo!);
        const changed = [...new Set([...before.keys(), ...now.keys()])].filter((p) => before.get(p) !== now.get(p) && !ignore.test(p));
        // ยอมให้เปลี่ยน: ถนน + ข้อความที่อยู่รวม (line / text) ของทะเบียนบ้าน
        const allowed = (p: string) => !!offPrefix && p.startsWith(`${offPrefix}.`) && /^(road|line|text)$/i.test(lastSegment(p));
        const rows: CompareRow[] = changed.map((p) => ({ label: p, values: [before.get(p) ?? '(ไม่มี)', now.get(p) ?? '(ไม่มี)'], same: allowed(p) }));
        if (!rows.length) rows.push({ label: '(ไม่มีค่าที่เปลี่ยน)', values: ['', ''], same: false });
        await showCompareTable(page, `${TC(12)} ค่าที่เปลี่ยนใน API หลังแก้ไข (ไม่นับเวลาแก้ไข)`, ['ก่อน', 'หลัง'], rows, { side: 'left', width: '1000px' });
        await markEvidence(expected(page.locator('[data-compare-overlay]')));
        await holdForClip(page, 2_000);
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' → ')}`), 'ต้องเปลี่ยนเฉพาะถนนของทะเบียนบ้าน').toEqual([]);
      }).finally(() => hideCompareTable(page));

      test.info().annotations.push({ type: 'ผู้ป่วย A', description: `HN ${hn} · ตรวจซ้ำ: SBH1290_A=${hn}` });
      finish();
    },
  );

  test(
    'ผู้ป่วย B: ที่อยู่หลักเฉพาะ field บังคับ เว้นที่อยู่ section อื่นว่าง → บันทึกได้ → ที่อยู่แบบข้อความไม่มีตัวคั่นของช่องว่าง (Super_User)',
    { tag: tags(11, 14), annotation: ANNOTATION },
    async ({ page }) => {
      const f = receptionFrame(page);
      const { soft, finish } = softSteps(page);
      const patient = newTestPatient('Req1290B');
      let hn = process.env.SBH1290_B ?? '';

      if (!hn) {
        await checkStep(page, `${TC(11)} ขั้น 2 สร้างผู้ป่วยใหม่ → กรอกข้อมูลส่วนตัวที่บังคับ (เลขบัตรประชาชน)`, async () => {
          await gotoReception(page);
          await startClip(page, 'TC-011');
          await fillNewPatientForm(page, patient);
          await markEvidence(filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), filled(f.getByTestId('identifyVerification.identify')));
        });
        await checkStep(page, `${TC(11)} ขั้น 3 ที่อยู่ (ทะเบียนบ้าน): บ้านเลขที่ + หมู่ + จ/อ/ต เท่านั้น`, () => fillBlock(page, B.official, B_OFFICIAL, patient.familyName));
        // ที่อยู่หลัก = ทะเบียนบ้าน + ปัจจุบัน (config เลขบัตรประชาชนบังคับทั้ง 2 ส่วนตั้งแต่ 16 ต.ค. 2026 บ่าย)
        await checkStep(page, `${TC(11)} ขั้น 3 ที่อยู่ปัจจุบัน: บ้านเลขที่ + หมู่ + จ/อ/ต เท่านั้น`, () => fillBlock(page, B.current, B_OFFICIAL, patient.familyName));
        await soft(`${TC(11)} ขั้น 4 ที่อยู่ที่ทำงาน / ครอบครัว / ข้อมูลการเกิด ว่างทั้งหมด`, async () => {
          for (const block of [B.work, ...FAMILY_BLOCKS, B.birth]) {
            const shown = await readAddress(f, block);
            expect(Object.values(shown).filter(Boolean), `${block.title}: ต้องว่าง`).toEqual([]);
          }
          await showBlock(f, B.work);
          await markEvidence(...blockFields(f, B.work).map(expected));
        });
        hn = await checkStep(page, `${TC(11)} ขั้น 5 กดบันทึก → บันทึกสำเร็จ ไม่มีแจ้งเตือนของ section อื่น`, () => savePatient(page, `ผู้ป่วย B ${patient.familyName}`));
        await holdForClip(page);
      } else {
        await openPatient(page, hn);
      }
      // คลิป TC-014 เริ่มที่หน้าข้อมูลผู้ป่วย B (หลังบันทึกของ TC-011)
      await startClip(page, 'TC-014');

      await soft(`${TC(14)} หน้าข้อมูลผู้ป่วย: แสดงเฉพาะองค์ประกอบที่กรอก ไม่มีคำนำหน้า / ตัวคั่นของ field ที่ว่าง`, async () => {
        await expect(f.getByRole('heading', { name: 'ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 60_000 });
        // ทะเบียนบ้าน / ปัจจุบัน กรอกค่าเดียวกัน → หาจากป้ายของบรรทัด ไม่ใช่บ้านเลขที่ (เดิมได้บรรทัดปัจจุบัน — กรอบผิดบรรทัด 18 ต.ค. 2026)
        const official = f.getByTestId('label-title').filter({ hasText: /^ที่อยู่ตามทะเบียนบ้าน\s*:$/ }).locator('xpath=following-sibling::*[@data-testid="label-description"][1]');
        const found = (await official.count()) > 0;
        const fallback = await infoText(f, B_OFFICIAL.houseNo!);
        const line = found ? official : fallback.line;
        const text = found ? (await official.innerText()).replace(/\s+/g, ' ').trim() : fallback.text;
        const problems = textProblems(text, B_OFFICIAL);
        const rows: CompareRow[] = [{ label: B.official.title, values: [text || '(ไม่พบ)', problems.join(' · ') || 'ไม่มีคำ / ตัวคั่นของช่องที่ว่าง'], same: !problems.length }];
        if (await line.count()) {
          await line.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await markEvidence(expected(line));
        }
        await showCompareTable(page, `${TC(14)} ที่อยู่แบบข้อความ (กรอก: บ้านเลขที่ 7/7 · หมู่ 3 · ปากเพรียว / เมืองสระบุรี / สระบุรี)`, ['ข้อความที่แสดง', 'ผลตรวจ'], rows, { side: 'left', width: '900px' });
        await holdForClip(page, 2_500);
        expect(problems, 'ข้อความที่อยู่ต้องไม่มีคำนำหน้า / ตัวคั่นของช่องที่ว่าง').toEqual([]);
      }).finally(() => hideCompareTable(page));

      test.info().annotations.push({ type: 'ผู้ป่วย B', description: `HN ${hn} · ตรวจซ้ำ: SBH1290_B=${hn}` });
      finish();
    },
  );

  test(
    'ผู้ป่วย C: ที่อยู่ที่ทำงาน บ้านเลขที่ + ถนน + จ/อ/ต → บันทึก → หน้าแก้ไขแสดงค่าตรง field (Super_User)',
    { tag: tags(8), annotation: ANNOTATION },
    async ({ page }) => {
      const f = receptionFrame(page);
      const { soft, finish } = softSteps(page);
      const api = apiReader(page);
      const patient = newTestPatient('Work1290C');
      let hn = process.env.SBH1290_C ?? '';

      if (!hn) {
        await checkStep(page, `${TC(8)} ขั้น 2 สร้างผู้ป่วยใหม่ → ข้อมูลส่วนตัว + ที่อยู่หลัก (field บังคับ)`, async () => {
          await gotoReception(page);
          await startClip(page, 'TC-008');
          await fillNewPatientForm(page, patient);
          // ที่อยู่หลัก = ทะเบียนบ้าน + ปัจจุบัน (เลขบัตรประชาชนบังคับทั้ง 2 ส่วนตั้งแต่ 16 ต.ค. 2026 บ่าย)
          await fillBlock(page, B.official, C_OFFICIAL, patient.familyName);
          await fillBlock(page, B.current, C_OFFICIAL, patient.familyName);
        });
        await checkStep(page, `${TC(8)} ขั้น 3 ที่อยู่ที่ทำงาน: บ้านเลขที่ + ถนน + จ/อ/ต`, () => fillBlock(page, B.work, C_WORK, patient.familyName));
        const saved = await soft(`${TC(8)} ขั้น 4 กดบันทึก → บันทึกสำเร็จ`, async () => {
          hn = await savePatient(page, `ผู้ป่วย C ${patient.familyName}`);
        });
        if (!saved) {
          await checkStep(page, `${TC(8)} บันทึกไม่ได้ → ฟอร์มหลังกดบันทึก (ขั้น 5 ตรวจไม่ได้)`, async () => {
            await showBlock(f, B.work);
            await markEvidence(...ADDRESS_TEXT_FIELDS.filter(({ key }) => C_WORK[key]).map(({ key }) => expected(textField(f, B.work, key))), expected(locationTrigger(f, B.work, 'cityCode')));
            await holdForClip(page, 2_000);
          });
          finish();
          return;
        }
      } else {
        await openPatient(page, hn);
      }

      await openEdit(page, `${TC(8)} ขั้น 5 กด แก้ไขข้อมูลผู้ป่วย → ฟอร์มแก้ไข`);
      const flat = flattenJson(await api(`/new-demographic-api/patients/${hn}?include=RelatedPerson`));
      await prefillStep(page, soft, `${TC(8)} หน้าแก้ไข ${B.work.title}: แต่ละ field แสดงค่าที่กรอก`, B.work, C_WORK, flat);
      test.info().annotations.push({ type: 'ผู้ป่วย C', description: `HN ${hn} · ตรวจซ้ำ: SBH1290_C=${hn}` });
      finish();
    },
  );

  test(
    'UHP: ไม่กรอก บ้านเลขที่ / หมู่ / ตำบล ของที่อยู่หลัก → บันทึกไม่ได้ + แจ้งให้กรอก (ดักคำสั่งสร้างผู้ป่วย · ไม่สร้างข้อมูล · Super_User)',
    { tag: tags(15, 16, 17), annotation: ANNOTATION },
    async ({ page }) => {
      const f = receptionFrame(page);
      const { soft, finish } = softSteps(page);

      // ดักคำสั่งสร้างผู้ป่วยแล้วยกเลิกทุกครั้ง — เช็คก่อนว่าดักได้จริง ถ้าดักไม่ได้หยุดก่อนกดบันทึก (cortex-card-test กับดัก SBH-1290)
      let posts = 0;
      await page.context().route(CREATE_PATIENT, (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        posts++;
        return route.abort();
      });
      await checkStep(page, 'ยืนยันว่าดักคำสั่งสร้างผู้ป่วยได้ (ไม่สร้างข้อมูลจริง)', async () => {
        await gotoReception(page);
        await f.locator('body').evaluate(() => fetch('/new-demographic-api/patients', { method: 'POST', body: '{}' }).catch(() => undefined));
        await expect.poll(() => posts, { message: 'ต้องดักคำสั่งสร้างผู้ป่วยได้ก่อนกดบันทึก' }).toBeGreaterThan(0);
      });

      type Case = { tc: number; label: string; field: (b: AddressBlock) => Locator; box: (b: AddressBlock) => Locator; error: (b: AddressBlock) => Promise<boolean> };
      const CASES: Record<15 | 16 | 17, Case> = {
        15: { tc: 15, label: 'บ้านเลขที่', field: (b) => textField(f, b, 'houseNo'), box: (b) => textField(f, b, 'houseNo'), error: (b) => textError(f, b, 'houseNo').isVisible() },
        16: { tc: 16, label: 'หมู่', field: (b) => textField(f, b, 'villageNo'), box: (b) => textField(f, b, 'villageNo'), error: (b) => textError(f, b, 'villageNo').isVisible() },
        17: { tc: 17, label: 'ตำบล', field: (b) => locationTrigger(f, b, 'cityCode'), box: (b) => locationBox(f, b, 'cityCode'), error: async (b) => (await locationBox(f, b, 'cityCode').innerText()).includes('โปรดระบุ') },
      };
      type Result = { mode: string; sent: boolean; official: boolean; current: boolean; others: string[] };
      const results = new Map<number, Result[]>([15, 16, 17].map((n) => [n, []]));
      const modes = [
        { name: 'เลขบัตรประชาชน', code: 'cid', passport: false },
        { name: 'หนังสือเดินทาง', code: 'passport', passport: true },
      ];

      /** กดบันทึก (คำสั่งสร้างผู้ป่วยถูกดัก) แล้วอ่านผล: คำสั่งถูกส่งไหม + "โปรดระบุ" ที่ช่องของ TC */
      const attempt = async (c: Case, mode: (typeof modes)[number], marks: Locator[]) => {
        await showBlock(f, B.official);
        await markEvidence(...marks.map(filled), expected(c.field(B.official)));
        await snapEvidence(page, `${String(c.tc).padStart(3, '0')} ${mode.code} ก่อนบันทึก`);
        await page.waitForTimeout(2_000); // แอปลองส่งซ้ำหลังคำสั่งก่อนหน้าถูกยกเลิก — รอให้จบก่อนนับใหม่
        posts = 0;
        await saveNewPatientButton(page).evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await saveNewPatientButton(page).click();
        await page.waitForTimeout(5_000);
        expect(PATIENT_URL.test(page.url()), 'ต้องไม่มีผู้ป่วยถูกสร้าง (คำสั่งถูกดัก)').toBe(false);
        const others = await f
          .getByText('โปรดระบุ', { exact: true })
          .filter({ visible: true })
          .evaluateAll((els) => els.map((e) => (e.closest('div:has(label)')?.querySelector('label')?.textContent ?? '?').replace(/\s*\*\s*/, '').trim()));
        results.get(c.tc)!.push({ mode: mode.name, sent: posts > 0, official: await c.error(B.official), current: await c.error(B.current), others });
        await showBlock(f, B.official);
        await markEvidence(expected(c.box(B.official)));
        await snapEvidence(page, `${String(c.tc).padStart(3, '0')} ${mode.code} หลังกดบันทึก`);
        await holdForClip(page, 1_500);
      };

      // 1 คลิปต่อ 1 TC (R61): ฟอร์มใหม่ 1 ฟอร์มต่อ TC — กรอกที่อยู่หลัก (ทะเบียนบ้าน + ปัจจุบัน) เว้นช่องของ TC → บันทึกด้วยเลขบัตรประชาชน
      //   → เปลี่ยนเป็นหนังสือเดินทาง (ที่อยู่คงเดิม) → บันทึกอีกครั้ง → ตารางผลของ TC นั้น
      const o = B.official;
      const FILL: Record<15 | 16 | 17, { what: string; input: AddressInput; until?: 'districtCode'; marks: Locator[] }> = {
        17: { what: 'บ้านเลขที่ + หมู่ + จังหวัด / อำเภอ ไม่เลือกตำบล', input: { houseNo: '7/7', villageNo: '3' }, until: 'districtCode', marks: [textField(f, o, 'houseNo'), textField(f, o, 'villageNo'), locationTrigger(f, o, 'stateCode'), locationTrigger(f, o, 'districtCode')] },
        16: { what: 'บ้านเลขที่ + จังหวัด / อำเภอ / ตำบล เว้นหมู่', input: { houseNo: '7/7' }, marks: [textField(f, o, 'houseNo'), locationTrigger(f, o, 'stateCode'), locationTrigger(f, o, 'districtCode'), locationTrigger(f, o, 'cityCode')] },
        15: { what: 'หมู่ + จังหวัด / อำเภอ / ตำบล เว้นบ้านเลขที่', input: { villageNo: '3' }, marks: [textField(f, o, 'villageNo'), locationTrigger(f, o, 'stateCode'), locationTrigger(f, o, 'districtCode'), locationTrigger(f, o, 'cityCode')] },
      };
      for (const tc of [15, 16, 17] as const) {
        const c = CASES[tc];
        const fill = FILL[tc];
        await checkStep(page, `${TC(tc)} ขั้น 2 สร้างผู้ป่วยใหม่ → กรอกข้อมูลส่วนตัวที่บังคับ (เลขบัตรประชาชน)`, async () => {
          await page.waitForTimeout(3_000); // แอปลองส่งคำสั่งที่ถูกยกเลิกซ้ำ — รอให้จบก่อนเปลี่ยนหน้า
          await gotoReception(page);
          await startClip(page, `TC-${String(tc).padStart(3, '0')}`);
          await fillNewPatientForm(page, newTestPatient('Uhp1290'), { skipAddress: true });
          await markEvidence(filled(f.getByTestId('select-trigger-identifyVerification.verificationMode')), filled(f.getByTestId('identifyVerification.identify')));
        });
        await checkStep(page, `${TC(tc)} ขั้น 3 ที่อยู่หลัก (ทะเบียนบ้าน + ปัจจุบัน): ${fill.what}`, async () => {
          for (const block of MAIN_BLOCKS) {
            await showBlock(f, block);
            await fillAddress(f, block, fill.input);
            await chooseLocation(f, block, SARABURI_PAKPHRIAO, fill.until ? { until: fill.until } : undefined);
            if (!fill.until) await expect(postalField(f, block)).toHaveValue(SARABURI_PAKPHRIAO.postal);
          }
        });
        await soft(`${TC(tc)} ขั้น 4 เลขบัตรประชาชน: กดบันทึก`, () => attempt(c, modes[0], fill.marks));
        await soft(`${TC(tc)} ขั้น 4 หนังสือเดินทาง: เปลี่ยนประเภท (ที่อยู่คงเดิม) → กดบันทึก`, async () => {
          await f.getByTestId('identify-form').evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await chooseIdentityMode(f, 'หนังสือเดินทาง');
          await f.getByTestId('identifyVerification.identify').fill(`AA${String(Date.now()).slice(-7)}`);
          await f.getByTestId('identifyVerification.expire').fill('31/12/2030');
          await f.getByTestId('identifyVerification.expire').press('Tab');
          await markEvidence(filled(f.getByTestId('select-trigger-identifyVerification.verificationMode')), filled(f.getByTestId('identifyVerification.identify')), filled(f.getByTestId('identifyVerification.expire')));
          await snapEvidence(page, `${String(tc).padStart(3, '0')} passport เปลี่ยนประเภท`);
          await attempt(c, modes[1], fill.marks);
        });

        await soft(`${TC(c.tc)} ผล: บันทึกไม่ได้ และแจ้งให้กรอก${c.label} (ทั้ง 2 ประเภท)`, async () => {
          const list = results.get(c.tc)!;
          const rows: CompareRow[] = list.map((r) => ({
            label: r.mode,
            values: [r.sent ? 'ถูกส่ง (บันทึกได้)' : 'ไม่ถูกส่ง (บันทึกไม่ได้)', `${r.official ? 'ขึ้น' : 'ไม่ขึ้น'} / ${r.current ? 'ขึ้น' : 'ไม่ขึ้น'}`, [...new Set(r.others)].join(', ') || '-'],
            same: !r.sent && r.official,
          }));
          await showBlock(f, B.official);
          await showCompareTable(page, `${TC(c.tc)} ไม่กรอก${c.label}ของที่อยู่หลัก → กดบันทึก`, ['คำสั่งสร้างผู้ป่วย', `"โปรดระบุ" ที่${c.label} (ทะเบียนบ้าน / ปัจจุบัน)`, 'ช่องที่ขึ้น "โปรดระบุ" ทั้งฟอร์ม'], rows, { width: '1000px' });
          await holdForClip(page, 2_500);
          test.info().annotations.push({ type: `${TC(c.tc)} ผล`, description: JSON.stringify(list) });
          expect(list.length, 'ต้องได้ผลครบ 2 ประเภท').toBe(2);
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' | ')}`), `ต้องบันทึกไม่ได้และแจ้งให้กรอก${c.label}`).toEqual([]);
        }).finally(() => hideCompareTable(page));
      }

      await page.context().unrouteAll({ behavior: 'ignoreErrors' });
      finish();
    },
  );
});
