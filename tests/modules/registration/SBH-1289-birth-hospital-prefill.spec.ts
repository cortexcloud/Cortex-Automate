import type { FrameLocator, Locator, Page } from '@playwright/test';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { restartVideo } from '../../../helpers/functions/fixtures';
import { fillNewPatientForm, gotoReception, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { envName } from '../../../utils/env';

// SBH-1289 [Registration] Prefill ที่อยู่ของโรงพยาบาลสระบุรี กรณีระบุสถานที่เกิดที่โรงพยาบาลสระบุรี — EXE SBH-1502 · TC01–TC04 = SBH-1506–1509
// AC 1 โรงพยาบาลสระบุรีอยู่บนสุดของรายการ · AC 2 เลือกแล้วระบบเติมที่อยู่ของ รพ. ให้ · AC 3 แก้ไข / กรอกเพิ่ม (Free Text) ได้
// TC ไม่มี Test Step — ขั้นกำหนดตามหน้าจอจริง (dev-x 14 ต.ค. 2026): เวชระเบียน → สร้างผู้ป่วยใหม่ → ส่วน "ข้อมูลการเกิด" (data-testid birth-form)
// ผู้ใช้ขอเพิ่ม (14 ต.ค. 2026): บันทึกผู้ป่วย → ตรวจหน้าข้อมูลผู้ป่วย → แก้ไขข้อมูลผู้ป่วย (ตรวจค่าเดิม + แก้แล้วบันทึกซ้ำ)
// ข้อมูล: ผู้ป่วย AUTO ใหม่ 1 ราย (R10 — ไม่มี Visit) · TC ที่ไม่ผ่านไม่หยุดเทส (soft) เทสจบไม่ผ่านพร้อมรายการขั้น
// รัน (dev-x): npx playwright test --headed --grep @SBH-1289

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC1 = 'TC01 (SBH-1506)';
const TC2 = 'TC02 (SBH-1507)';
const TC3 = 'TC03 (SBH-1508)';
const TC4 = 'TC04 (SBH-1509)';
const MORE = 'เพิ่มเติม';

const HOSPITAL = '10661 - โรงพยาบาลสระบุรี';

type Field = 'houseNo' | 'condo' | 'roomNo' | 'soiSub' | 'soiMain' | 'road' | 'villageName' | 'villageNo' | 'state' | 'district' | 'city' | 'postal';
type Address = Partial<Record<Field, string>>;

/** ช่องที่อยู่ของส่วนข้อมูลการเกิด: ป้ายบนจอ + data-testid (จังหวัด / อำเภอ / ตำบล เป็น searchbox · รหัสไปรษณีย์เติมเองและแก้ไม่ได้) */
const FIELDS: { key: Field; label: string; testid: string; select?: boolean }[] = [
  { key: 'houseNo', label: 'บ้านเลขที่', testid: 'birth.houseNo' },
  { key: 'condo', label: 'อาคาร/คอนโด', testid: 'birth.condo' },
  { key: 'roomNo', label: 'ห้อง', testid: 'birth.roomNo' },
  { key: 'soiSub', label: 'ซอยแยก', testid: 'birth.soiSub' },
  { key: 'soiMain', label: 'ซอย', testid: 'birth.soiMain' },
  { key: 'road', label: 'ถนน', testid: 'birth.road' },
  { key: 'villageName', label: 'ชื่อหมู่บ้าน', testid: 'birth.villageName' },
  { key: 'villageNo', label: 'หมู่', testid: 'birth.villageNo' },
  { key: 'state', label: 'จังหวัด', testid: 'searchbox-trigger-birth.address-stateCode-searchbox', select: true },
  { key: 'district', label: 'อำเภอ', testid: 'searchbox-trigger-birth.address-districtCode-searchbox', select: true },
  { key: 'city', label: 'ตำบล', testid: 'searchbox-trigger-birth.address-cityCode-searchbox', select: true },
  { key: 'postal', label: 'รหัสไปรษณีย์', testid: 'birth.address-postalCode' },
];

/** ที่อยู่จริงของโรงพยาบาลสระบุรี (Note bug ของผู้ใช้ในการ์ด 14 ต.ค. 2026: "เลขที่ 18 ถนนเทศบาล 4 ตำบลปากเพรียว อำเภอเมืองสระบุรี จังหวัดสระบุรี") */
const SBH_ADDRESS: Address = { houseNo: '18', road: 'เทศบาล 4', city: 'ปากเพรียว', district: 'เมืองสระบุรี', state: 'สระบุรี', postal: '18000' };
/** TC03 — แก้ทุกช่องที่ระบบเติม: บ้านเลขที่ / ถนน (ช่องข้อความ) + จังหวัด / อำเภอ / ตำบล (ช่องเลือก) · รหัสไปรษณีย์เปลี่ยนตามตำบล (แก้เองไม่ได้) */
const TC3_EDIT: Address = { houseNo: '18/1', road: 'เทศบาล 4 (แก้)', state: 'สระบุรี', district: 'เมืองสระบุรี', city: 'ปากเพรียว' };
/** TC04 — พิมพ์ข้อความเองในทุกช่องที่ยังว่าง */
const TC4_FREE: Address = { condo: 'อาคารทดสอบ AUTO', roomNo: '101', soiSub: 'ซอยแยกทดสอบ 1', soiMain: 'ซอยทดสอบ 1', villageName: 'หมู่บ้านทดสอบ', villageNo: '7' };
/** แก้ไขข้อมูลผู้ป่วยหลังบันทึก — แก้ทุกช่อง รวมจังหวัด / อำเภอ (ย้ายไปจังหวัดอื่น) · ตำบลเลือกตัวแรกของอำเภอ */
const EDIT_ALL: Address = {
  houseNo: '99/9',
  condo: 'อาคารแก้ไข AUTO',
  roomNo: '202',
  soiSub: 'ซอยแยกแก้ไข 2',
  soiMain: 'ซอยแก้ไข 2',
  road: 'ถนนแก้ไข AUTO',
  villageName: 'หมู่บ้านแก้ไข AUTO',
  villageNo: '9',
  state: 'ลพบุรี',
  district: 'เมืองลพบุรี',
};
const TEXT_KEYS: Field[] = ['houseNo', 'condo', 'roomNo', 'soiSub', 'soiMain', 'road', 'villageName', 'villageNo'];

const firstLine = (error: unknown) => String(error instanceof Error ? error.message : error).split('\n').find((line) => line.trim()) ?? '';

function birthForm(f: FrameLocator) {
  return f.getByTestId('birth-form');
}
/** หัวส่วน "ข้อมูลการเกิด" (อยู่นอก birth-form) */
function birthTitle(f: FrameLocator) {
  return f.getByText('ข้อมูลการเกิด', { exact: true }).first();
}
function field(f: FrameLocator, key: Field): Locator {
  return f.getByTestId(FIELDS.find((x) => x.key === key)!.testid);
}
function hospitalBox(f: FrameLocator) {
  return f.getByTestId('searchbox-trigger-birth.hospital-searchbox');
}

/** ค่าปัจจุบันของทุกช่องที่อยู่สถานที่เกิด (ช่องเลือกที่ยังว่างคืน "" แทนข้อความ placeholder เช่น "เลือกจังหวัด") */
async function readBirthAddress(f: FrameLocator): Promise<Address> {
  const out: Address = {};
  for (const x of FIELDS) {
    const box = field(f, x.key);
    const value = x.select ? (await box.innerText()).trim() : await box.inputValue();
    out[x.key] = x.select && /^เลือก/.test(value) ? '' : value;
  }
  return out;
}

/** เทียบค่าบนจอกับที่คาด → ตารางเทียบซ้อนครึ่งขวา + กรอบ Expected ที่ช่อง (ช่องที่ไม่ตรงก่อน) → throw ถ้าไม่ตรง */
async function compareAddress(page: Page, f: FrameLocator, title: string, want: Address, expectedColumn = 'ที่คาด', also: Locator[] = []) {
  const got = await readBirthAddress(f);
  const keys = FIELDS.filter((x) => x.key in want);
  const rows: CompareRow[] = keys.map((x) => ({ label: x.label, values: [want[x.key] || '(ว่าง)', got[x.key] || '(ว่าง)'], same: (want[x.key] ?? '') === (got[x.key] ?? '') }));
  await showCompareTable(page, title, [expectedColumn, 'บนจอ'], rows);
  const wrong = keys.filter((_, i) => !rows[i].same);
  // เลื่อนหัวส่วนข้อมูลการเกิดขึ้นบนสุด ให้ทุกช่องตั้งแต่โรงพยาบาลถึงรหัสไปรษณีย์อยู่ในจอเดียว (ไม่งั้นแถวตำบล / รหัสไปรษณีย์ตกขอบล่าง)
  await birthTitle(f).evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await markEvidence(...also.map((target) => expected(target)), ...(wrong.length ? wrong : keys).map((x) => expected(field(f, x.key))));
  await holdForClip(page, 2_500);
  if (wrong.length) throw new Error(`ที่อยู่ไม่ตรง ${wrong.length} ช่อง: ${wrong.map((x) => `${x.label} คาด "${want[x.key]}" ได้ "${got[x.key] || '(ว่าง)'}"`).join(' · ')}`);
}

/** เลือกค่าในช่องเลือก (จังหวัด / อำเภอ / ตำบล) — popup มีช่องค้นหา พิมพ์แล้วเลือกตัวเลือกที่ชื่อตรงตัว · ไม่ระบุค่า = ตัวเลือกแรก · คืนค่าที่เลือก */
async function chooseAddress(page: Page, f: FrameLocator, key: Field, value?: string): Promise<string> {
  await field(f, key).click();
  const popup = f.locator('[data-radix-popper-content-wrapper]').filter({ visible: true });
  const search = popup.locator('input').first();
  await expect(search, `ช่องค้นหาของ ${key} ต้องเปิด`).toBeVisible();
  if (value) await search.pressSequentially(value, { delay: 30 });
  const option = value ? popup.getByRole('option', { name: value, exact: true }).first() : popup.getByRole('option').first();
  await expect(option).toBeVisible();
  const chosen = (await option.innerText()).trim();
  await option.click();
  await expect(field(f, key)).toHaveText(chosen);
  return chosen;
}

/** ข้อความของบรรทัด "<ป้าย> :" ในหน้าข้อมูลผู้ป่วย (label-title คู่กับ label-description) */
function infoValue(f: FrameLocator, label: string): Locator {
  return f.getByTestId('label-title').filter({ hasText: new RegExp(`^${label} :$`) }).locator('xpath=following-sibling::*[@data-testid="label-description"][1]');
}

test.describe('SBH-1289 Prefill ที่อยู่โรงพยาบาลสระบุรี เมื่อเลือกเป็นสถานที่เกิด (เวชระเบียน)', () => {
  test.describe.configure({ timeout: 600_000 });

  test(
    'ผู้ป่วยใหม่: รพ.สระบุรีบนสุด → เลือกแล้วเติมที่อยู่ → แก้ / กรอกเพิ่ม → บันทึก → หน้าผู้ป่วย → แก้ไขข้อมูล (Super_User)',
    { tag: ['@SBH-1289', '@SBH-1502', '@SBH-1506', '@SBH-1507', '@SBH-1508', '@SBH-1509'], annotation: [linear('SBH-1289'), linear('SBH-1502')] },
    async ({ page }) => {
      test.skip(!!envName(), 'การ์ดนี้ผู้ใช้สั่งรันบน dev-x — ระบบอื่นยังไม่ได้รับอนุญาต');
      const f = receptionFrame(page);
      const failures: string[] = [];
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      const soft = (title: string, body: () => Promise<void>) =>
        checkStep(page, title, body).then(
          () => true,
          (error: unknown) => {
            failures.push(`${title} — ${firstLine(error)}`);
            console.log(`    ✗ ${title} — ${firstLine(error)}`);
            return false;
          },
        );
      const patient = newTestPatient('Birth1289');
      note('ผู้ป่วย', `${patient.firstName} ${patient.familyName}`);

      await checkStep(page, 'Pre-condition เปิดเวชระเบียน → สร้างผู้ป่วยใหม่ กรอกช่องบังคับ แล้วเลื่อนถึงส่วนข้อมูลการเกิด', async () => {
        await gotoReception(page);
        // คลิปเริ่มที่หน้าค้นหาผู้ป่วยของเวชระเบียน — ตัดช่วงจอว่างตอนแอปเวชระเบียน (iframe) โหลด
        await restartVideo(page);
        await fillNewPatientForm(page, patient);
        await expect(birthTitle(f)).toBeVisible();
        await expect(hospitalBox(f)).toHaveText(/เลือกโรงพยาบาล/);
        await markEvidence(expected(birthTitle(f)), filled(f.getByTestId('firstName')));
      });

      // TC01 — เปิดรายการ
      const popup = f.locator('[data-radix-popper-content-wrapper]').filter({ visible: true });
      await soft(`${TC1} ขั้น 1 เปิดรายการโรงพยาบาลที่เกิด → โรงพยาบาลสระบุรีอยู่บนสุด`, async () => {
        await hospitalBox(f).click();
        const first = popup.getByRole('option').first();
        await expect(first).toBeVisible();
        const options = (await popup.getByRole('option').allInnerTexts()).map((text) => text.trim());
        note('ตัวเลือกโรงพยาบาล 3 ตัวแรก', options.slice(0, 3).join(' · '));
        await markEvidence(clicked(hospitalBox(f)), expected(first));
        await holdForClip(page);
        await expect(first, 'ตัวเลือกบนสุดต้องเป็นโรงพยาบาลสระบุรี').toHaveText(HOSPITAL);
      });

      // TC02 — เลือก รพ.สระบุรี → ระบบเติมที่อยู่
      const picked = await soft(`${TC2} ขั้น 1 เลือกสถานที่เกิด = โรงพยาบาลสระบุรี`, async () => {
        if (!(await popup.count())) await hospitalBox(f).click();
        const option = popup.getByRole('option', { name: HOSPITAL, exact: true }).first();
        await markEvidence(clicked(option));
        await snapEvidence(page, 'ก่อนกด — เลือกโรงพยาบาลสระบุรี');
        await option.click();
        await expect(hospitalBox(f)).toHaveText(HOSPITAL);
        await expect(field(f, 'houseNo'), 'เลือกแล้วระบบต้องเริ่มเติมที่อยู่').not.toHaveValue('');
        await markEvidence(expected(hospitalBox(f)), expected(field(f, 'houseNo')));
      });
      if (picked) {
        await soft(`${TC2} ขั้น 2 ระบบเติมที่อยู่ของโรงพยาบาลสระบุรีให้อัตโนมัติ`, async () => {
          const got = await readBirthAddress(f);
          note('ที่อยู่ที่ระบบเติมให้', FIELDS.filter((x) => got[x.key]).map((x) => `${x.label} ${got[x.key]}`).join(' · '));
          await compareAddress(page, f, `${TC2} ที่อยู่ที่ระบบเติม เทียบกับที่อยู่ของโรงพยาบาลสระบุรี`, SBH_ADDRESS, 'ที่อยู่ รพ.สระบุรี', [hospitalBox(f)]);
        });
        await hideCompareTable(page);
      }

      // TC03 — แก้ค่าที่ระบบเติม
      await soft(`${TC3} ขั้น 1 แก้ทุกช่องที่ระบบเติม (บ้านเลขที่ / ถนน / จังหวัด / อำเภอ / ตำบล)`, async () => {
        const before = await readBirthAddress(f);
        note('ค่าก่อนแก้ (ที่ระบบเติม)', FIELDS.filter((x) => before[x.key]).map((x) => `${x.label} ${before[x.key]}`).join(' · '));
        await field(f, 'houseNo').fill(TC3_EDIT.houseNo!);
        await field(f, 'road').fill(TC3_EDIT.road!);
        await chooseAddress(page, f, 'state', TC3_EDIT.state!);
        await chooseAddress(page, f, 'district', TC3_EDIT.district!);
        await chooseAddress(page, f, 'city', TC3_EDIT.city!);
        await expect(field(f, 'postal'), 'เลือกตำบลแล้วรหัสไปรษณีย์ต้องเปลี่ยนตาม').toHaveValue('18000');
        await birthTitle(f).evaluate((element) => element.scrollIntoView({ block: 'start' }));
        await markEvidence(...(['houseNo', 'road', 'state', 'district', 'city'] as Field[]).map((key) => filled(field(f, key))), expected(field(f, 'postal')));
        await holdForClip(page);
      });
      await soft(`${TC3} ขั้น 2 ช่องที่แก้แสดงค่าใหม่ครบทุกช่อง`, async () => {
        await compareAddress(page, f, `${TC3} ค่าหลังแก้ทุกช่องที่ระบบเติม`, { ...TC3_EDIT, postal: '18000' }, 'ที่แก้');
      });
      await hideCompareTable(page);

      // TC04 — พิมพ์ Free Text ในทุกช่องที่ว่าง
      await soft(`${TC4} ขั้น 1 พิมพ์ข้อความเองในทุกช่องที่ยังว่าง (อาคาร / ห้อง / ซอยแยก / ซอย / หมู่บ้าน / หมู่)`, async () => {
        for (const [key, value] of Object.entries(TC4_FREE) as [Field, string][]) await field(f, key).fill(value);
        await birthTitle(f).evaluate((element) => element.scrollIntoView({ block: 'start' }));
        await markEvidence(...Object.keys(TC4_FREE).map((key) => filled(field(f, key as Field))));
        await holdForClip(page);
      });
      await soft(`${TC4} ขั้น 2 ข้อความที่พิมพ์อยู่ครบ ไม่ถูกระบบเปลี่ยน`, async () => {
        await compareAddress(page, f, `${TC4} ข้อความที่พิมพ์เพิ่ม`, { ...TC4_FREE, ...TC3_EDIT, postal: '18000' }, 'ที่พิมพ์ / แก้');
      });
      await hideCompareTable(page);

      // เพิ่มเติม — บันทึก → หน้าผู้ป่วย → แก้ไขข้อมูล (ทำต่อเฉพาะเมื่อฟอร์มมีโรงพยาบาลที่เลือก)
      const saved: Address = await readBirthAddress(f);
      let hn = '';
      const savedOk = await soft(`${MORE} ขั้น 1 กดบันทึกผู้ป่วยใหม่ → ได้ HN`, async () => {
        await saveNewPatientButton(page).scrollIntoViewIfNeeded();
        await markEvidence(clicked(saveNewPatientButton(page)));
        await snapEvidence(page, 'ก่อนกด — บันทึกผู้ป่วยใหม่');
        hn = await saveNewPatient(page);
        note('HN', hn);
        await markEvidence(expected(page.getByRole('main').getByText(`HN ${hn}`, { exact: true }).first()));
      });
      if (!savedOk) throw new Error(`บันทึกผู้ป่วยไม่สำเร็จ — ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`);

      const wantLine = (a: Address) => [a.houseNo, a.condo, a.roomNo, a.soiSub, a.soiMain, a.road, a.villageName, a.villageNo, a.state, a.district, a.city, a.postal].filter(Boolean) as string[];
      const checkInfo = async (title: string, address: Address) => {
        const line = infoValue(f, 'สถานที่เกิด \\(ที่อยู่\\)');
        const hospital = infoValue(f, 'สถานที่เกิด \\(โรงพยาบาล\\)');
        await expect(line).toBeVisible({ timeout: 60_000 });
        await line.scrollIntoViewIfNeeded();
        const text = (await line.innerText()).trim();
        note(`${title} — สถานที่เกิด (ที่อยู่)`, text);
        const parts = wantLine(address);
        const rows: CompareRow[] = [
          { label: 'สถานที่เกิด (โรงพยาบาล)', values: [HOSPITAL, (await hospital.innerText()).trim()], same: (await hospital.innerText()).trim() === HOSPITAL },
          ...parts.map((part) => ({ label: FIELDS.find((x) => address[x.key] === part)?.label ?? '', values: [part, text.includes(part) ? 'มีในบรรทัด' : 'ไม่มี'], same: text.includes(part) })),
        ];
        await showCompareTable(page, `${title} — หน้าข้อมูลผู้ป่วย`, ['ค่าที่บันทึก', 'บนจอ'], rows);
        await markEvidence(expected(line), expected(hospital));
        await holdForClip(page, 2_500);
        const wrong = rows.filter((row) => !row.same);
        if (wrong.length) throw new Error(`หน้าข้อมูลผู้ป่วยไม่ตรง: ${wrong.map((row) => `${row.label} ${row.values.join(' → ')}`).join(' · ')}`);
      };

      await soft(`${MORE} ขั้น 2 หน้าข้อมูลผู้ป่วย: ส่วนข้อมูลการเกิดแสดงโรงพยาบาล + ที่อยู่ที่บันทึก`, () => checkInfo('หลังสร้างผู้ป่วย', saved));
      await hideCompareTable(page);

      const editButton = f.getByRole('button', { name: 'แก้ไขข้อมูลผู้ป่วย' });
      const editOpened = await soft(`${MORE} ขั้น 3 กดแก้ไขข้อมูลผู้ป่วย → ส่วนข้อมูลการเกิดแสดงค่าที่บันทึกไว้`, async () => {
        await editButton.scrollIntoViewIfNeeded();
        await markEvidence(clicked(editButton));
        await snapEvidence(page, 'ก่อนกด — แก้ไขข้อมูลผู้ป่วย');
        await editButton.click();
        await page.waitForURL(/actions=patientEdit/, { timeout: 60_000 });
        await expect(field(f, 'houseNo')).toBeVisible({ timeout: 60_000 });
        await expect(field(f, 'houseNo')).not.toHaveValue('', { timeout: 30_000 });
        await birthTitle(f).scrollIntoViewIfNeeded();
        const hospitalText = (await hospitalBox(f).innerText()).trim();
        note('ช่องโรงพยาบาลในหน้าแก้ไข', hospitalText);
        await expect(hospitalBox(f), 'ช่องโรงพยาบาลต้องเป็นโรงพยาบาลสระบุรี').toHaveText(/โรงพยาบาลสระบุรี/);
        await compareAddress(page, f, 'หน้าแก้ไขข้อมูลผู้ป่วย — ค่าที่บันทึกไว้', saved, 'ค่าที่บันทึก', [hospitalBox(f)]);
      });
      await hideCompareTable(page);

      if (editOpened) {
        await soft(`${MORE} ขั้น 4 หน้าแก้ไข: เปิดรายการโรงพยาบาลที่เกิด → โรงพยาบาลสระบุรีอยู่บนสุด (ไม่เปลี่ยนค่า)`, async () => {
          await hospitalBox(f).click();
          const first = popup.getByRole('option').first();
          await expect(first).toBeVisible();
          await markEvidence(clicked(hospitalBox(f)), expected(first));
          await holdForClip(page);
          // ภาพท้าย step ถ่ายหลังปิดรายการ → ถ่ายรายการที่เปิดอยู่ไว้ก่อน
          await snapEvidence(page, 'หน้าแก้ไข — รายการโรงพยาบาลที่เกิด');
          await expect(first).toHaveText(HOSPITAL);
          await page.keyboard.press('Escape');
          await expect(popup).toHaveCount(0);
          await expect(field(f, 'houseNo'), 'ปิดรายการแล้วที่อยู่ต้องไม่เปลี่ยน').toHaveValue(saved.houseNo!);
          await expect(hospitalBox(f)).toHaveText(/โรงพยาบาลสระบุรี/);
          await markEvidence(expected(hospitalBox(f)), expected(field(f, 'houseNo')), expected(field(f, 'city')));
        });

        // แก้ทุกช่อง (ข้อความ 8 ช่อง + จังหวัด / อำเภอ / ตำบล) → รหัสไปรษณีย์ต้องเปลี่ยนตาม
        const edited: Address = { ...saved, ...EDIT_ALL };
        const editedAll = await soft(`${MORE} ขั้น 5 หน้าแก้ไข: แก้ทุกช่องของที่อยู่สถานที่เกิด รวมจังหวัด / อำเภอ / ตำบล`, async () => {
          for (const key of TEXT_KEYS) await field(f, key).fill(EDIT_ALL[key]!);
          await chooseAddress(page, f, 'state', EDIT_ALL.state!);
          await chooseAddress(page, f, 'district', EDIT_ALL.district!);
          edited.city = await chooseAddress(page, f, 'city');
          await expect(field(f, 'postal'), 'เปลี่ยนตำบลแล้วรหัสไปรษณีย์ต้องเปลี่ยนตาม').not.toHaveValue(saved.postal!);
          await expect(field(f, 'postal')).toHaveValue(/^\d{5}$/);
          edited.postal = await field(f, 'postal').inputValue();
          note('ค่าหลังแก้ทุกช่อง', FIELDS.map((x) => `${x.label} ${edited[x.key]}`).join(' · '));
          await compareAddress(page, f, 'หน้าแก้ไข — ค่าหลังแก้ทุกช่อง (รหัสไปรษณีย์ = ที่ระบบเติมตามตำบล)', edited, 'ที่แก้');
        });
        await hideCompareTable(page);

        const editSaved = editedAll && await soft(`${MORE} ขั้น 6 กดบันทึกการแก้ไข`, async () => {
          const submit = f.getByTestId('submit-button');
          await submit.scrollIntoViewIfNeeded();
          await markEvidence(clicked(submit));
          await snapEvidence(page, 'ก่อนกด — บันทึกการแก้ไข');
          const written = page.waitForResponse((res) => res.request().method() !== 'GET' && /new-demographic-api\/patients/.test(res.url()), { timeout: 60_000 });
          await submit.click();
          const res = await written;
          note('คำสั่งบันทึกการแก้ไข', `${res.request().method()} ${new URL(res.url()).pathname} → ${res.status()}`);
          expect(res.ok(), `บันทึกการแก้ไขต้องสำเร็จ (${res.status()} ${(await res.text()).slice(0, 200)})`).toBeTruthy();
          await expect(page).not.toHaveURL(/actions=patientEdit/, { timeout: 60_000 });
        });
        if (editSaved) {
          await soft(`${MORE} ขั้น 7 หน้าข้อมูลผู้ป่วยแสดงที่อยู่สถานที่เกิดหลังแก้ไขครบทุกช่อง`, () => checkInfo('หลังแก้ไขข้อมูล', edited));
          await hideCompareTable(page);
        }
      }

      if (failures.length) throw new Error(`ขั้นที่ไม่ผ่าน ${failures.length} ขั้น:\n${failures.join('\n')}`);
    },
  );
});
