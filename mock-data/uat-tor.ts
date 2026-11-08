import { expect, test, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { confirmOpenErVisit, expectOk, openTriagePage, openVisitDialog, selectExistingPatient, waitForApi, type ErVisit } from '../helpers/functions/er';
import { physicianNoteDiagnosis, physicianNoteIllness, physicianNotePanel, physicianNoteSaveButton, waitPhysicianNoteForm } from '../helpers/functions/er-physician-note';
import { erTriageLevel, erTriagePanel, saveErTriageForm, type VitalSigns } from '../helpers/functions/er-triage';
import type { NewPatient } from '../helpers/functions/test-data';
import { COVERAGE_UC, SETTINGS, SYSTEM, registerMockPatient } from './uat-er';
import { Play, careMenu, guard, nextMutation, options, pick } from './uat-play';

// ส่วนใช้ร่วมของสเปกเล่น Scenario UAT ER "ชีตส่งมอบ" (SharePoint "New file Test case OPD #2.xlsx" ชีต Scenario- ER ส่งมอบ — สกิล cortex-er-tor-uat)
// ผู้ใช้สั่ง 8 พ.ย. 2026: รันบน SBH Prod · "กรอกข้อมูลของคนไข้ทั้งหมดเท่าที่จะเป็นไปได้ เพื่อตรวจสอบ"
// → ทุกส่วนที่ผ่าน (ลงทะเบียน · คัดกรอง · Physician Note · Progress Note) กรอกช่องที่ไม่บังคับด้วย · ช่องที่กรอกไม่ได้จดเป็นข้อสังเกต ไม่ทำให้ขั้นพัง
// ใช้ฟอร์มคัดกรอง / Physician Note รุ่นใหม่ (clinical form — ขึ้น Prod 5 พ.ย. 2026) · ชื่อโซนชุดใหม่ (Resuscitation / Urgency / Isolation 1 / Isolation 2 / Observation)

// ---------- ข้อมูลตั้งต้น ----------

/** รหัสรายการ Order: SBH Prod ใช้ชีต "Mock-Data ER" · dev-x ใช้ยา med0000005–8 (R25) และ Lab / IMG ตาม SETTINGS */
export const TOR_ORDER_CODES = SYSTEM === 'dev-x'
  ? { med: 'med0000005', lab: SETTINGS.labCode, img: [SETTINGS.imagingCode, ...SETTINGS.extraCodes], act: [] as string[] }
  : { med: 'MED0000260', lab: 'LAB0000001', img: ['IMG0000194', 'IMG0000420'], act: ['ACT0005224'] };

/** ข้อมูลไม่บังคับตอนลงทะเบียน (ค่าทดสอบ — ไม่ใช่ข้อมูลคนจริง) */
export const TOR_CONTACT = {
  houseNo: '99/9',
  /** ตำบลที่พิมพ์ค้น แล้วเลือกตัวเลือกที่ขึ้นต้นด้วยคำนี้ (ระบบเติมอำเภอ / จังหวัด / ไปรษณีย์ให้) */
  subDistrict: 'ปากเพรียว',
  /** ช่องที่อยู่อื่นที่ไม่บังคับ — จับตาม id ที่มีคำนี้ */
  extra: [
    [/moo|villageNo/i, '1'],
    [/village(Name)?$|building/i, 'หมู่บ้านทดสอบ UAT'],
    [/soi|alley|lane/i, 'ซอยทดสอบ'],
    [/road|street/i, 'ถนนพหลโยธิน'],
  ] as [RegExp, string][],
};

/** DD/MM/YYYY ค.ศ. → DD/MM/(YYYY+543) · ค่าที่เป็น พ.ศ. อยู่แล้ว (ปี ≥ 2400) คืนเดิม */
export function toBuddhistDate(date: string): string {
  const [d, m, y] = date.split('/');
  const year = Number(y);
  return year && year < 2400 ? `${d}/${m}/${year + 543}` : date;
}

/** เบอร์มือถือทดสอบ (08 + 8 หลักสุ่ม) */
export function testMobile(): string {
  return `08${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
}

// ---------- ตัวเล่น + หลักฐาน ----------

/**
 * ตัวเล่น 1 Scenario ของชีตส่งมอบ = `Play` เดิม (ขั้นพังแล้วจดไว้ เล่นต่อ) + แนบภาพหน้าจอทุกขั้น ("ผ่าน — …" / "Error — …")
 * ชื่อขั้นใส่เลขแถวของชีตนำหน้า เช่น "[15–16] ค้นหาผู้ป่วย…" ให้เทียบชีตได้ตรง
 */
export class TorPlay extends Play {
  /** โฟลเดอร์ภาพของรอบนี้ `clips/UAT-ER-tor/<ข้อ>-<YYYYMMDD-HHmm>/` — HTML report ของ Prod ใช้ร่วมกับ session อื่น ถูกเขียนทับได้ (8 พ.ย. 2026) */
  readonly evidenceDir: string;
  private shot = 0;

  constructor(
    private readonly torPage: Page,
    scenario: string,
  ) {
    super(torPage, scenario);
    const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 16).replace(/[-: ]/g, '').replace(/^(\d{8})/, '$1-');
    this.evidenceDir = path.join(__dirname, '..', 'clips', 'UAT-ER-tor', `${scenario}-${stamp}`);
    console.log(`  ภาพทุกขั้น: ${this.evidenceDir}`);
  }

  override async step<T>(title: string, body: () => Promise<T>): Promise<T | undefined> {
    return super.step(title, async () => {
      try {
        const value = await body();
        await this.keep(`ผ่าน — ${title}`);
        return value;
      } catch (error) {
        await this.keep(`Error — ${title}`);
        throw error;
      }
    });
  }

  /** แนบภาพลงรายงาน + เก็บลงโฟลเดอร์ของรอบ (ชื่อไฟล์ = ลำดับ · ผล · เลขแถวชีต) และจดชื่อขั้นใน index.txt */
  private async keep(name: string) {
    const body = await snap(this.torPage, name);
    if (!body) return;
    const no = String(++this.shot).padStart(2, '0');
    const rows = name.match(/\[([^\]]+)\]/)?.[1]?.replace(/[^\d–-]/g, '') ?? '';
    const file = `${no}-${name.startsWith('ผ่าน') ? 'pass' : 'ERROR'}${rows ? `-${rows}` : ''}.png`;
    fs.mkdirSync(this.evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(this.evidenceDir, file), body);
    fs.appendFileSync(path.join(this.evidenceDir, 'index.txt'), `${file}\t${name}\n`);
  }
}

/** แนบภาพหน้าจอปัจจุบันลงรายงาน (ไม่ให้ภาพพังทำขั้นพัง) — คืนภาพไว้เก็บต่อ */
export async function snap(page: Page, name: string): Promise<Buffer | undefined> {
  const body = await page.screenshot({ timeout: 15_000 }).catch(() => undefined);
  if (body) await test.info().attach(name.slice(0, 120), { body, contentType: 'image/png' });
  return body;
}

/** ทำ `body` แบบไม่บังคับ: สำเร็จ → จดชื่อลง `filled` · ไม่สำเร็จ → จดลง `skipped` พร้อมสาเหตุ (ไม่โยน error) */
async function attempt(filled: string[], skipped: string[], name: string, body: () => Promise<unknown>) {
  try {
    const result = await body();
    if (result === false) skipped.push(`${name} (ไม่พบช่องบนจอ)`);
    else filled.push(typeof result === 'string' ? `${name}: ${result}` : name);
  } catch (error) {
    skipped.push(`${name} (${(error as Error).message.split('\n')[0].slice(0, 160)})`);
  }
}

/** จดสรุปช่องที่กรอก / กรอกไม่ได้ เป็นข้อสังเกตของขั้น */
export function noteFilled(play: Play, what: string, filled: string[], skipped: string[]) {
  play.note(`${what} กรอกแล้ว: ${filled.join(' · ') || '-'}`);
  if (skipped.length) play.note(`${what} กรอกไม่ได้ / ข้าม: ${skipped.join(' · ')}`);
}

// ---------- รูปผู้ป่วย (PNG ที่สร้างเอง — ไม่ใช่รูปคนจริง) ----------

const CACHE = path.join(__dirname, '..', '.cache');

/** ไฟล์รูป 160×160 พื้นฟ้า กรอบน้ำเงิน สำหรับช่อง "รูปโปรไฟล์" — สร้างครั้งแรกแล้วใช้ซ้ำ */
export function photoFile(): string {
  const file = path.join(CACHE, 'uat-tor-photo.png');
  if (fs.existsSync(file)) return file;
  const size = 160;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const border = x < 8 || y < 8 || x >= size - 8 || y >= size - 8;
      const head = (x - 80) ** 2 + (y - 62) ** 2 < 30 ** 2 || ((x - 80) ** 2) / 55 ** 2 + ((y - 160) ** 2) / 55 ** 2 < 1;
      const [r, g, b] = border ? [30, 60, 160] : head ? [120, 140, 170] : [210, 230, 250];
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, png);
  return file;
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

/** อัปโหลดรูปโปรไฟล์ในฟอร์มลงทะเบียนที่หน้าคัดกรอง ER (ปุ่ม "upload เลือกรูปภาพ") */
export async function uploadPatientPhoto(page: Page): Promise<string | false> {
  const main = page.getByRole('main');
  const button = main.getByRole('button', { name: /เลือกรูปภาพ/ }).first();
  if (!(await button.isVisible().catch(() => false))) return false;
  const input = main.locator('input[type="file"]').first();
  if (await input.count()) await input.setInputFiles(photoFile());
  else {
    const chooser = page.waitForEvent('filechooser', { timeout: 10_000 });
    await button.click();
    await (await chooser).setFiles(photoFile());
  }
  // บางรุ่นเปิดหน้าต่างครอปรูป → กดปุ่มยืนยันของหน้าต่างนั้น
  const confirm = page.getByRole('dialog').getByRole('button', { name: /^(ตกลง|ยืนยัน|บันทึก|ใช้รูปนี้|OK)$/ }).first();
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) await confirm.click();
  await expect(main.locator('img[src^="blob:"], img[src^="data:"]').first(), 'ต้องเห็นรูปที่อัปโหลดในฟอร์ม').toBeVisible({ timeout: 15_000 });
  return 'uat-tor-photo.png';
}

// ---------- ลงทะเบียน ----------

/** กรอกช่องไม่บังคับของฟอร์มลงทะเบียน (หน้าคัดกรอง ER) ให้ครบที่สุด — เรียกก่อนกด "ลงทะเบียนผู้ป่วย" */
export async function fillRegistrationExtras(page: Page, opts: { photo?: boolean; mobile?: boolean; address?: boolean } = {}): Promise<{ filled: string[]; skipped: string[] }> {
  const filled: string[] = [];
  const skipped: string[] = [];
  const main = page.getByRole('main');
  if (opts.mobile !== false) {
    await attempt(filled, skipped, 'เบอร์มือถือ', async () => {
      const box = main.getByRole('textbox', { name: /มือถือ|โทรศัพท์/ }).first();
      if (!(await box.isVisible().catch(() => false))) return false;
      const mobile = testMobile();
      await box.fill(mobile.slice(1)); // ช่องมี +66 นำหน้าอยู่แล้ว — ตัด 0 ตัวแรก
      return mobile;
    });
  }
  if (opts.photo !== false) await attempt(filled, skipped, 'รูปโปรไฟล์', () => uploadPatientPhoto(page));
  if (opts.address !== false) {
    await attempt(filled, skipped, 'บ้านเลขที่ (ทะเบียนบ้าน)', async () => {
      const house = page.locator('#officialAddress_houseNo');
      if (!(await house.isVisible().catch(() => false))) return false;
      await house.fill(TOR_CONTACT.houseNo);
      return TOR_CONTACT.houseNo;
    });
    await attempt(filled, skipped, 'ตำบล / อำเภอ / จังหวัด (ทะเบียนบ้าน)', async () => {
      const location = page.locator('#officialAddress_locationLabel');
      if (!(await location.isVisible().catch(() => false))) return false;
      await location.click();
      await location.pressSequentially(TOR_CONTACT.subDistrict, { delay: 60 });
      const option = page.locator(`.ant-select-item-option[title^="${TOR_CONTACT.subDistrict}"]`).filter({ visible: true }).first();
      await option.waitFor({ state: 'visible', timeout: 20_000 });
      const title = (await option.getAttribute('title')) ?? TOR_CONTACT.subDistrict;
      await option.click();
      return title;
    });
    await attempt(filled, skipped, 'ช่องที่อยู่อื่น (หมู่ / หมู่บ้าน / ซอย / ถนน)', async () => {
      const inputs = page.locator('input[id^="officialAddress_"]').filter({ visible: true });
      const done: string[] = [];
      for (let i = 0; i < (await inputs.count()); i++) {
        const input = inputs.nth(i);
        const id = (await input.getAttribute('id')) ?? '';
        if (/houseNo|location|postal|zip/i.test(id) || (await input.inputValue()) || !(await input.isEditable())) continue;
        const value = TOR_CONTACT.extra.find(([key]) => key.test(id))?.[1];
        if (!value) continue;
        await input.fill(value);
        done.push(`${id.replace('officialAddress_', '')}=${value}`);
      }
      return done.length ? done.join(', ') : false;
    });
    await attempt(filled, skipped, 'ที่อยู่ปัจจุบัน (กด ที่อยู่เดียวกัน)', async () => {
      const same = main.getByRole('button', { name: 'ที่อยู่เดียวกัน' }).or(main.getByText('ที่อยู่เดียวกัน', { exact: true })).first();
      if (!(await same.isVisible().catch(() => false))) return false;
      await same.click();
      return true;
    });
  }
  return { filled, skipped };
}

/**
 * ลงทะเบียนผู้ป่วยใหม่ที่หน้าคัดกรอง ER แบบกรอกครบ (ช่องบังคับ 5 ช่อง + เบอร์ + รูป + ที่อยู่) → เปิด Visit ER สิทธิ UC
 * `withoutVisit: true` = กด ยกเลิก ที่ modal เปิด Visit (ได้ HN ไม่มี Visit — R24 ใช้กับเคส "ผู้ป่วยมี HN เดิม")
 * เริ่มจากหน้า ER Dashboard
 */
export async function registerFull(
  page: Page,
  patient: NewPatient,
  opts: { withoutVisit?: boolean; extras?: Parameters<typeof fillRegistrationExtras>[1] } = {},
): Promise<{ hn: string; visit?: ErVisit; filled: string[]; skipped: string[] }> {
  await openTriagePage(page);
  let extras = { filled: [] as string[], skipped: [] as string[] };
  // ฟอร์มผู้ป่วยใหม่ ER รับปีเกิดเป็น พ.ศ. (ตั้งแต่ ~23 ต.ค. 2026 — screens/er-patient-list.md) · ข้อมูลทดสอบเป็น ค.ศ. 1990 → พิมพ์ 2533
  // (8 พ.ย. 2026 UAT-ER-01 / 02 พิมพ์ 1990 ได้อายุ 579 ปี)
  const { hn, dialog } = await registerMockPatient(page, { ...patient, birthDate: toBuddhistDate(patient.birthDate) }, async () => {
    extras = await fillRegistrationExtras(page, opts.extras);
  });
  if (opts.withoutVisit) {
    const modal = dialog ?? openVisitDialog(page);
    if (await modal.isVisible().catch(() => false)) {
      await modal.getByRole('button', { name: 'ยกเลิก' }).click();
      await expect(modal).toBeHidden();
    }
    return { hn, ...extras };
  }
  let modal = dialog;
  if (!modal) {
    await page.reload();
    await expect(page.getByRole('heading', { name: '1. ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 60_000 });
    modal = await selectExistingPatient(page, hn);
  }
  const visit = await confirmOpenErVisit(page, modal, COVERAGE_UC);
  return { hn, visit, ...extras };
}

/** ลงทะเบียนผู้ป่วยระบุตัวตนไม่ได้ (ชื่อสมมติ · เพศ · อายุโดยประมาณ · รูป) — คืน HN + modal เปิด Visit (เริ่มจากหน้า ER Dashboard) */
export async function registerUnidentifiedFull(page: Page, fresh: NewPatient, age = '40'): Promise<{ hn: string; dialog: Locator; filled: string[]; skipped: string[] }> {
  await openTriagePage(page);
  await page.locator('label').filter({ hasText: 'ผู้ป่วยระบุตัวตนไม่ได้' }).click();
  await page.getByRole('textbox', { name: 'ชื่อชั่วคราว' }).fill(fresh.firstName);
  await page.getByRole('textbox', { name: /นามสกุล/ }).fill(fresh.familyName);
  await page.getByLabel(/อายุโดยประมาณ/).fill(age);
  await page.getByRole('combobox', { name: /เพศ/ }).click();
  await page.locator(`.ant-select-item-option[title="${fresh.gender}"]`).click();
  // ผู้ป่วยหมดสติ: ไม่รู้เบอร์ / ที่อยู่ → กรอกเฉพาะรูป (ชีตแถว 96 "บันทึกรูปภาพ")
  const extras = await fillRegistrationExtras(page, { mobile: false, address: false });
  const registered = guard(waitForApi(page, 'POST', '/cortex-api/patients/er-registration'));
  await page.getByRole('button', { name: 'ลงทะเบียนผู้ป่วยไม่ทราบชื่อ' }).click();
  const res = await registered;
  await expectOk(res, 'ลงทะเบียนผู้ป่วยระบุตัวตนไม่ได้');
  const hn = ((await res.json()) as { patient: { data: { hn: string } } }).patient.data.hn;
  const dialog = openVisitDialog(page);
  await expect(dialog.getByText(`HN ${hn}`, { exact: true })).toBeVisible();
  return { hn, dialog, ...extras };
}

// ---------- ฟอร์มคัดกรอง ER รุ่นใหม่ — กรอกครบทุก Section ----------

/** GCS ตามคะแนน E / V / M */
export type Gcs = [number, number, number];
export const GCS_FULL: Gcs = [4, 5, 6];
export const GCS_COMA: Gcs = [1, 1, 1];
export const TOR_VITALS_NORMAL: VitalSigns = { systolic: '128', diastolic: '82', pr: '88', rr: '20', temp: '37.2', spo2: '98', painScore: '4' };
export const TOR_VITALS_HIGH_MEWS: VitalSigns = { systolic: '85', diastolic: '50', pr: '135', rr: '32', temp: '39.5', spo2: '88', painScore: '8' };
export const TOR_VITALS_CRITICAL: VitalSigns = { systolic: '70', diastolic: '40', pr: '140', rr: '8', temp: '35.5', spo2: '80', painScore: '0' };

export interface TriageFull {
  level: 1 | 2 | 3 | 4 | 5;
  vitals: VitalSigns;
  gcs?: Gcs;
  /** วิธีการมาถึง (ตั้งต้น Walk-in) */
  arrival?: 'Walk-in' | 'EMS';
  /** ตัวเลือกผู้นำส่ง (ตั้งต้น /ญาติ/ — Prod ชุดเก่า: ไม่มีผู้มาด้วย / ญาติ / ผู้ดูแล / เจ้าหน้าที่ EMS) */
  escort?: RegExp;
  transporter?: string;
  /** ชื่อ Fast Track (เช่น /Sepsis/) — ไม่ใส่ = Not Suspect */
  fastTrack?: RegExp;
  trauma?: boolean;
  /** Chief Complaint: true (ตั้งต้น) = กดปุ่มแรกที่ยังไม่ถูกเลือก · ชื่อ = กดปุ่มชื่อนั้น · false = ไม่กด (คัดกรองซ้ำ / เหตุการณ์หมู่) */
  chiefComplaint?: boolean | string;
  illness?: string;
  weight?: string;
  height?: string;
  /** ค้นโรคประจำตัวในส่วน Underlying Disease (Issue #4 — Prod บันทึกไม่ได้: จดผล) · '' = ไม่กรอก */
  underlying?: string;
  /** โซน: 'suggested' (ตั้งต้น) = โซนที่มีป้าย แนะนำ · RegExp = เลือกโซนชื่อนั้น */
  zone?: 'suggested' | RegExp;
}

function triageParts(page: Page) {
  const panel = erTriagePanel(page);
  const arrival = panel.getByRole('region', { name: 'ER Arrival' });
  return {
    panel,
    arrival,
    fastTrack: panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first(),
    emergency: panel.getByRole('radiogroup', { name: 'ประเภทฉุกเฉิน' }).first(),
    arrivalRadio: (name: string) => arrival.getByRole('radio', { name, exact: true }),
    escort: arrival.locator('.ant-select').first(),
    transporter: arrival.getByRole('textbox', { name: 'ระบุชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ' }),
    preHospital: arrival.getByRole('textbox', { name: /รายละเอียด EMS/ }),
    avpu: panel.getByRole('combobox', { name: 'AVPU' }).first(),
    zones: panel.locator('[class*="er-triage-zone-options"] button'),
  };
}

/** เลือกตัวเลือกของ <select> ที่ข้อความตรง pattern → คืนข้อความ */
async function selectByText(select: Locator, pattern: RegExp): Promise<string> {
  const label = (await select.locator('option').allTextContents()).find((t) => pattern.test(t));
  if (!label) throw new Error(`ไม่มีตัวเลือก ${pattern}`);
  await select.selectOption({ label });
  return label.trim();
}

/** ช่อง "โซน *" ของฟอร์มคัดกรอง: ระบบแค่แนะนำ ไม่เลือกให้ → กดโซนที่มีป้าย แนะนำ (หรือโซนตามชื่อ) → คืนชื่อโซน */
export async function selectTriageZone(page: Page, zone: 'suggested' | RegExp = 'suggested'): Promise<string> {
  const { zones } = triageParts(page);
  const nameOf = async (button: Locator) => (await button.innerText()).replace(/แนะนำ|ใช้\s*\d+/g, ' ').replace(/\s+/g, ' ').trim();
  await expect(zones.first(), 'ฟอร์มคัดกรองต้องมีตัวเลือกโซน').toBeVisible({ timeout: 20_000 });
  const target = zone === 'suggested' ? zones.filter({ hasText: 'แนะนำ' }).first() : zones.filter({ hasText: zone }).first();
  // คัดกรองซ้ำ: โซนเดิมถูกเลือกค้างอยู่ แต่ระบบอาจแนะนำโซนใหม่ → กดโซนที่แนะนำตอนนี้เสมอ (ไม่มีป้ายแนะนำค่อยใช้โซนที่เลือกอยู่)
  const pressed = zones.and(page.locator('[aria-pressed="true"]'));
  if (zone === 'suggested' && !(await target.isVisible().catch(() => false)) && (await pressed.count())) return nameOf(pressed.first());
  if ((await target.getAttribute('aria-pressed').catch(() => null)) === 'true') return nameOf(target);
  await expect(target, zone === 'suggested' ? 'ต้องมีโซนที่ระบบแนะนำ' : `ต้องมีโซน ${zone}`).toBeVisible({ timeout: 20_000 });
  await target.scrollIntoViewIfNeeded();
  await target.click();
  await expect(target, 'ต้องเลือกโซนได้').toHaveAttribute('aria-pressed', 'true');
  return nameOf(target);
}

/**
 * กรอกฟอร์มคัดกรอง ER รุ่นใหม่ให้ครบทุก Section ที่กรอกได้ (ยังไม่บันทึก):
 * Fast Track · ประเภทฉุกเฉิน · ER Arrival (วิธีมาถึง / ผู้นำส่ง / ชื่อผู้นำส่ง / ข้อมูลก่อนถึง รพ.) · Vital signs + Pain · Chief Complaint · Present illness ·
 * Body metric · GCS · AVPU · ระดับความเร่งด่วน · โซน · Underlying Disease (Issue #4)
 * ช่องบังคับ (Vital signs · ระดับ · โซน) พัง = โยน error · ช่องอื่นพัง = จดลง skipped
 */
export async function fillTriageFull(page: Page, input: TriageFull): Promise<{ filled: string[]; skipped: string[]; zone: string; chiefComplaint?: string }> {
  const f = triageParts(page);
  const filled: string[] = [];
  const skipped: string[] = [];
  await expect(f.panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });

  await attempt(filled, skipped, 'Suspect Fast Track Type', async () => {
    if (!(await f.fastTrack.isVisible().catch(() => false))) return false;
    return selectByText(f.fastTrack, input.fastTrack ?? /Not Suspect/i);
  });
  await attempt(filled, skipped, 'ประเภทฉุกเฉิน', async () => {
    if (!(await f.emergency.isVisible().catch(() => false))) return false;
    const name = input.trauma ? 'Trauma' : 'Non-Trauma';
    await f.emergency.getByText(name, { exact: true }).click();
    return name;
  });
  await attempt(filled, skipped, 'วิธีการมาถึง', async () => {
    if (!(await f.arrival.isVisible().catch(() => false))) return false;
    const name = input.arrival ?? 'Walk-in';
    if (!(await f.arrivalRadio(name).isChecked())) await f.arrival.getByText(name, { exact: true }).click();
    return name;
  });
  await attempt(filled, skipped, 'ผู้นำส่ง', async () => {
    if (!(await f.escort.isVisible().catch(() => false))) return false;
    await f.escort.click();
    const option = options(page).filter({ hasText: input.escort ?? (input.arrival === 'EMS' ? /EMS/ : /ญาติ/) }).first();
    await pick(option);
    return ((await option.textContent()) ?? '').trim();
  });
  await attempt(filled, skipped, 'ชื่อผู้นำส่ง', async () => {
    if (!(await f.transporter.isVisible().catch(() => false))) return false;
    const name = input.transporter ?? 'ญาติ (บุตร) — UAT';
    await f.transporter.fill(name);
    return name;
  });
  if (input.arrival === 'EMS') {
    await attempt(filled, skipped, 'ข้อมูลก่อนถึงโรงพยาบาล', async () => {
      if (!(await f.preHospital.isVisible().catch(() => false))) return false;
      await f.preHospital.fill('EMS รับจากบ้าน BP 130/80 PR 90 ระหว่างนำส่งอาการคงที่ (UAT)');
      await f.preHospital.press('Tab');
      return true;
    });
  }

  // ช่องบังคับ: Vital signs + Pain score
  const v = input.vitals;
  for (const [name, value] of [['Systolic', v.systolic], ['Diastolic', v.diastolic], ['PR', v.pr], ['RR', v.rr], ['Temp', v.temp], ['SpO2', v.spo2]] as const) {
    await f.panel.getByRole('spinbutton', { name }).first().fill(value);
  }
  filled.push(`Vital signs ${v.systolic}/${v.diastolic} PR ${v.pr} RR ${v.rr} T ${v.temp} SpO2 ${v.spo2}`);
  await attempt(filled, skipped, 'Pain score', async () => {
    await f.panel.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Pain score' }) }).first().selectOption(v.painScore);
    return v.painScore;
  });

  let chiefComplaint: string | undefined;
  if (input.chiefComplaint !== false) {
    await attempt(filled, skipped, 'Chief Complaint', async () => {
      const group = f.panel.getByRole('group', { name: 'Common chief complaints' });
      // ปุ่มที่ถูกเลือกอยู่แล้ว (ร่างเดิม) ห้ามกดซ้ำ — กดซ้ำ = ยกเลิกการเลือก
      const chosen = group.locator('button[aria-pressed="true"]');
      if (typeof input.chiefComplaint !== 'string' && (await chosen.count())) {
        chiefComplaint = ((await chosen.first().innerText()) ?? '').trim();
        return `${chiefComplaint} (เลือกไว้แล้ว)`;
      }
      const button = typeof input.chiefComplaint === 'string' ? group.getByRole('button', { name: input.chiefComplaint, exact: true }) : group.getByRole('button').first();
      chiefComplaint = ((await button.innerText()) ?? '').trim();
      if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
      return chiefComplaint;
    });
  }
  await attempt(filled, skipped, 'Present illness', async () => {
    const box = f.panel.locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').first();
    if (!(await box.isVisible().catch(() => false))) return false;
    if (await box.inputValue()) return 'มีค่าเดิม';
    const text = input.illness ?? 'ปวดท้องใต้ลิ้นปี่ 2 ชั่วโมงก่อนมา คลื่นไส้ ไม่มีไข้ (UAT)';
    await box.fill(text);
    return text;
  });
  await attempt(filled, skipped, 'Body metric (น้ำหนัก / ส่วนสูง)', async () => {
    const section = f.panel.locator('div').filter({ has: page.getByText(/^Body metric/i) }).filter({ has: page.getByRole('spinbutton') }).last();
    if (!(await section.isVisible().catch(() => false))) return false;
    const boxes = section.getByRole('spinbutton');
    await boxes.nth(0).fill(input.weight ?? '65');
    await boxes.nth(1).fill(input.height ?? '170');
    return `${input.weight ?? '65'} kg / ${input.height ?? '170'} cm`;
  });

  const [e, vv, m] = input.gcs ?? GCS_FULL;
  await attempt(filled, skipped, 'GCS', async () => {
    for (const [name, score] of [['Eye Opening (E)', e], ['Verbal Response (V)', vv], ['Motor Response (M)', m]] as const) {
      await selectByText(f.panel.getByRole('combobox', { name }).first(), new RegExp(`^${score} `));
    }
    return `E${e}V${vv}M${m}`;
  });
  await attempt(filled, skipped, 'AVPU', async () => {
    if (!(await f.avpu.isVisible().catch(() => false))) return false;
    // GCS ต่ำ = ไม่ตอบสนอง (U) · ปกติ = รู้ตัวดี (A)
    return selectByText(f.avpu, e + vv + m <= 8 ? /^U\b|Unresponsive/i : /^A\b|Alert/i);
  });

  // ช่องบังคับ: ระดับความเร่งด่วน + โซน
  const levels = f.panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' });
  await levels.scrollIntoViewIfNeeded();
  await levels.getByText(String(input.level), { exact: true }).click();
  await expect(erTriageLevel(page, input.level), `ระดับความเร่งด่วนต้องเป็น ${input.level}`).toBeChecked();
  filled.push(`ระดับความเร่งด่วน ${input.level}`);
  const zone = await selectTriageZone(page, input.zone ?? 'suggested');
  filled.push(`โซน ${zone}`);

  if (input.underlying !== '') {
    await attempt(filled, skipped, 'Underlying Disease (Issue #4)', async () => {
      const section = page.getByRole('main').getByRole('heading', { name: /Underlying Disease/ }).first().locator('xpath=ancestor::div[.//table][1]');
      if (!(await section.isVisible().catch(() => false))) return false;
      const search = section.getByRole('combobox').first();
      await search.click();
      await search.fill(input.underlying ?? 'Hypertension');
      await pick(options(page).first());
      // Issue #4: error มาจาก graphql (/cortex-api/graphql · clinicallyRecognisedAt) → จับทั้ง URL และ body ของคำสั่ง
      const saved = guard(
        page.waitForResponse(
          (res) => res.request().method() !== 'GET' && /underlying|condition|problem|clinicallyRecognised/i.test(`${res.url()} ${(res.request().postData() ?? '').slice(0, 2000)}`),
          { timeout: 20_000 },
        ),
      );
      await section.getByRole('button', { name: /บันทึก/ }).first().click();
      const res = await saved;
      if (!res.ok()) throw new Error(`บันทึกโรคประจำตัวได้ ${res.status()} (ตรง Issue #4)`);
      return input.underlying ?? 'Hypertension';
    });
  }
  return { filled, skipped, zone, chiefComplaint };
}

/** แถบ "ร่างถูกแก้ไขจากที่อื่น" ล็อกฟอร์ม → กด ลองเก็บร่างอีกครั้ง (สูงสุด 3 ครั้ง) — เรียกก่อนกดบันทึกฟอร์มคัดกรอง / Physician Note */
export async function unlockDraft(page: Page) {
  await page.waitForTimeout(3_000);
  const locked = page.getByRole('main').getByText('ร่างถูกแก้ไขจากที่อื่น', { exact: false });
  for (let i = 0; i < 3 && (await locked.isVisible().catch(() => false)); i++) {
    await page.getByRole('button', { name: 'ลองเก็บร่างอีกครั้ง' }).click();
    await page.waitForTimeout(5_000);
  }
  if (await locked.isVisible().catch(() => false)) throw new Error('ฟอร์มยังล็อก "ร่างถูกแก้ไขจากที่อื่น" หลังกด ลองเก็บร่างอีกครั้ง 3 ครั้ง');
}

/** บันทึกฟอร์มคัดกรองรุ่นใหม่ (ปลดล็อกร่าง → POST …/saves) แล้วรอหน้า Overview */
export async function saveTriageFull(page: Page, visit: ErVisit, what = 'บันทึกคัดกรอง') {
  await unlockDraft(page);
  await saveErTriageForm(page, `${what} ${visit.en}`);
  await expect(page.getByText(/กรอกข้อมูล คัดกรอง ER สำเร็จ|บันทึก.*สำเร็จ/).first(), 'ต้องขึ้นแจ้งเตือนบันทึกคัดกรองสำเร็จ').toBeVisible({ timeout: 30_000 }).catch(() => undefined);
}

// ---------- ER Physician Note รุ่นใหม่ — กรอกครบ ----------

/**
 * กรอก ER Physician Note ให้ครบที่สุดแล้วบันทึก: ปุ่ม Common chief complaints (ชีตแถว 31–33) · Present illness · ช่องข้อความอื่นที่ว่าง ·
 * Pain score · Diagnosis (ICD — R21 บังคับ) → POST …/saves 200 (ลองใหม่สูงสุด 3 ครั้ง)
 * คืนชื่ออาการที่กด + ที่ที่ข้อความไปแสดง (ชีตแถว 33 [ต้องยืนยัน])
 */
export async function savePhysicianNoteFull(
  page: Page,
  opts: { dx?: string; chip?: boolean; illness?: string } = {},
): Promise<{ filled: string[]; skipped: string[]; chip?: string; chipShownIn?: string; dx: string }> {
  const filled: string[] = [];
  const skipped: string[] = [];
  await waitPhysicianNoteForm(page);
  const panel = physicianNotePanel(page);
  let chip: string | undefined;
  let chipShownIn: string | undefined;

  if (opts.chip !== false) {
    await attempt(filled, skipped, 'Common chief complaints', async () => {
      const group = panel.getByRole('group', { name: 'Common chief complaints' }).first();
      if (!(await group.isVisible().catch(() => false))) return false;
      const button = group.getByRole('button').first();
      chip = ((await button.innerText()) ?? '').trim();
      await button.click();
      await page.waitForTimeout(1_000);
      // หาว่าอาการที่กดไปแสดงที่ไหน: ปุ่มเปลี่ยนสถานะ / ข้อความในช่องใด
      const pressed = await button.getAttribute('aria-pressed');
      const boxes = panel.locator('textarea, input[type="text"]');
      for (let i = 0; i < (await boxes.count()); i++) {
        const value = await boxes.nth(i).inputValue().catch(() => '');
        if (chip && value.includes(chip)) {
          chipShownIn = `${(await boxes.nth(i).getAttribute('placeholder')) || (await boxes.nth(i).getAttribute('aria-label')) || `ช่องที่ ${i + 1}`}`;
          break;
        }
      }
      chipShownIn ??= pressed === 'true' ? 'ปุ่มอาการเปลี่ยนเป็นสถานะถูกเลือก (aria-pressed=true) — ไม่พบข้อความในช่องข้อความ' : 'ไม่พบตำแหน่งที่แสดง';
      return chip;
    });
  }
  await attempt(filled, skipped, 'Present illness', async () => {
    const box = physicianNoteIllness(page);
    if (await box.inputValue()) return 'มีค่าเดิม';
    const text = opts.illness ?? 'ปวดท้องใต้ลิ้นปี่ 2 ชั่วโมง กดเจ็บเล็กน้อย ไม่มีไข้ ไม่มีถ่ายเหลว (UAT)';
    await box.click();
    await box.pressSequentially(text, { delay: 20 });
    return text;
  });
  await attempt(filled, skipped, 'ช่องข้อความอื่นที่ว่าง (PE / Note to nurse / สรุปอาการ ฯลฯ)', async () => {
    const boxes = panel.locator('textarea').filter({ visible: true });
    const done: string[] = [];
    for (let i = 0; i < Math.min(await boxes.count(), 12); i++) {
      const box = boxes.nth(i);
      if ((await box.inputValue()) || !(await box.isEditable())) continue;
      const label = (await box.getAttribute('placeholder')) || (await box.getAttribute('aria-label')) || `ช่องที่ ${i + 1}`;
      await box.fill(`${label}: ปกติ (UAT)`);
      done.push(label);
    }
    return done.length ? done.join(', ') : false;
  });
  await attempt(filled, skipped, 'Pain score', async () => {
    const select = panel.locator('[data-path$="overall_score"] select, select').filter({ has: page.getByRole('option', { name: /Pain score|^3$/ }) }).first();
    if (!(await select.isVisible().catch(() => false))) return false;
    if (await select.inputValue()) return 'มีค่าเดิม';
    await select.selectOption('3');
    return '3';
  });

  const code = opts.dx ?? 'K30';
  const diagnosis = physicianNoteDiagnosis(page);
  await diagnosis.scrollIntoViewIfNeeded();
  let dx = `${code} (ร่างเดิม)`;
  if (!(await diagnosis.getByText(new RegExp(`\\b${code}\\b`)).count())) {
    const search = diagnosis.getByRole('combobox').or(diagnosis.getByPlaceholder(/ค้นหา/)).first();
    await search.click();
    await search.fill(code);
    const option = page.getByText(new RegExp(`^${code}\\b`)).filter({ visible: true }).first();
    await expect(option).toBeVisible({ timeout: 20_000 });
    dx = ((await option.textContent()) ?? code).trim();
    await option.click();
  }
  filled.push(`Diagnosis ${dx}`);

  await unlockDraft(page);
  const save = physicianNoteSaveButton(page);
  let status = 0;
  for (let i = 1; i <= 3 && status !== 200; i++) {
    const saved = guard(page.waitForResponse((res) => res.request().method() === 'POST' && /\/clinical-form-groups\/[^/]+\/saves$/.test(new URL(res.url()).pathname), { timeout: 60_000 }));
    await expect(save).toBeEnabled({ timeout: 60_000 });
    await save.click();
    status = (await saved).status();
    if (status !== 200) await page.waitForTimeout(10_000);
  }
  expect(status, 'บันทึก ER Physician Note ต้องสำเร็จ (HTTP 200)').toBe(200);
  return { filled, skipped, chip, chipShownIn, dx };
}

// ---------- Doctor Progress Note — S O A P + Perform time ----------

/**
 * เมนูขวา "สร้างฟอร์ม" → Doctor Progress Note → Perform time (ถ้าหาช่องได้) + S O A P → บันทึก
 * คืนว่ากรอก Perform time ได้ไหม (ชีตแถว 178 — saveProgressNote เดิมยังหาช่องไม่ได้)
 */
export async function saveProgressNoteFull(page: Page, round: number, performAt?: Date): Promise<{ performTime: string | false; text: string }> {
  const main = page.getByRole('main');
  const heading = main.getByRole('heading', { name: 'Doctor Progress Note' });
  await careMenu(page, 'สร้างฟอร์ม', main.getByText('เลือกฟอร์ม', { exact: true }).first());
  await pick(main.locator('.ant-select').filter({ hasText: /^(เลือก|Doctor Progress Note)$/ }).last());
  await page.keyboard.type('Doctor Progress');
  await pick(options(page).filter({ hasText: /^Doctor Progress Note$/ }).first());
  await expect(heading).toBeVisible();

  let performTime: string | false = false;
  const at = performAt ?? new Date();
  const stamp = at.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 16); // YYYY-MM-DD HH:mm
  // ช่อง "Perform time:" = <input type="datetime-local"> บนแท็บ "สร้างฟอร์ม" (SBH Prod 8 พ.ย. 2026) ไม่อยู่ใน div เดียวกับช่อง S O A P
  // → หา datetime-local ที่มองเห็น (แท็บ Overview ที่มีฟอร์มคัดกรองซ่อนอยู่ตอนเปิดแท็บนี้ จึงไม่โดนช่องวันที่ของคัดกรอง)
  const perform = main.locator('input[type="datetime-local"]').filter({ visible: true }).first();
  if (await perform.isVisible().catch(() => false)) {
    const type = await perform.getAttribute('type');
    await perform.fill(type === 'datetime-local' ? stamp.replace(' ', 'T') : stamp).catch(() => undefined);
    performTime = (await perform.inputValue().catch(() => '')) || false;
  }

  const text = `รอบที่ ${round} (${stamp})`;
  const editors = main.locator('[contenteditable="true"]');
  await expect(editors.nth(3)).toBeVisible();
  const count = await editors.count();
  const soap: [string, string][] = [
    ['S', `ผู้ป่วยบอกปวดท้องลดลง ${text}`],
    ['O', `BP 120/80 PR 82 ท้องนุ่ม กดเจ็บลดลง ${text}`],
    ['A', `Dyspepsia อาการดีขึ้น ${text}`],
    ['P', `ให้ยาต่อ สังเกตอาการ 2 ชม. ${text}`],
  ];
  for (const [i, [, value]] of soap.entries()) await editors.nth(count - 4 + i).fill(value);
  const save = main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).last();
  await expect(save, 'กรอก S O A P แล้วปุ่มบันทึกต้องกดได้').toBeEnabled();
  const saved = nextMutation(page, /contribution|composition|\/saves/, 30_000);
  await save.click();
  await expectOk(await saved, `บันทึก Doctor Progress Note ${text}`);
  return { performTime, text };
}
