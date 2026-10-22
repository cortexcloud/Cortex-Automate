/** ข้อมูลผู้ป่วยใหม่สำหรับฟอร์มลงทะเบียนที่หน้า ER (ช่องบังคับ 5 ช่อง) */
export interface NewPatient {
  citizenId: string;
  firstName: string;
  familyName: string;
  gender: 'ชาย' | 'หญิง';
  /** DD/MM/YYYY เป็น ค.ศ. — ฟอร์มที่รับปี พ.ศ. ให้แปลงด้วย toBuddhistDate() ก่อนพิมพ์ */
  birthDate: string;
  /** ช่อง "คำนำหน้าชื่อ" (บังคับในฟอร์ม) — ไม่ใส่ = ปล่อยให้ระบบเติมจากเพศ ซึ่งบางครั้งไม่เติม/ค้างจากคนก่อน */
  namePrefix?: string;
}

/**
 * ผู้ป่วยทดสอบใหม่ทุกรอบ (R10) — ชื่อ "AUTO" ให้คนในทีมรู้ว่ามาจากเทส automate
 * นามสกุล = label + เวลาไทย MMddHHmmss เช่น "NewHN0926153012" ไม่ซ้ำกันแต่ละรอบ
 */
export function newTestPatient(label: string): NewPatient {
  return {
    citizenId: randomThaiId(),
    firstName: 'AUTO',
    familyName: `${label}${bangkokStamp()}`,
    gender: 'ชาย',
    birthDate: '15/01/1990',
  };
}

/** ผู้ป่วย mock data ชุด "AIทดสอบ" — ชื่อ `AIทดสอบ<seq>f` / นามสกุล `AIทดสอบ<seq>l` + อายุ ณ วันที่สร้าง */
export interface AiTestPatient extends NewPatient {
  seq: string;
  namePrefix: string;
  age: number;
}

/** คำนำหน้าตามเพศของผู้ป่วย mock data (ผู้ใช้กำหนด 20 ต.ค. 2026) */
export const PREFIX_BY_GENDER: Record<NewPatient['gender'], string> = { ชาย: 'นาย', หญิง: 'น.ส.' };

export const AI_TEST_PREFIX = 'AIทดสอบ';

/** ลำดับตัวอักษรแบบคอลัมน์ Excel: a … z → aa, ab … az → ba … (ไม่ส่งค่า = เริ่มที่ a) */
export function nextSeq(last?: string): string {
  return indexToSeq(last ? seqToIndex(last) + 1 : 0);
}

function seqToIndex(seq: string): number {
  if (!/^[a-z]+$/.test(seq)) throw new Error(`seq ต้องเป็นตัวอักษร a-z เท่านั้น: "${seq}"`);
  return [...seq].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 96), 0) - 1;
}

function indexToSeq(index: number): string {
  let seq = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) seq = String.fromCharCode(97 + ((n - 1) % 26)) + seq;
  return seq;
}

export function randomGender(): NewPatient['gender'] {
  return Math.random() < 0.5 ? 'ชาย' : 'หญิง';
}

/** วันเกิดสุ่ม (DD/MM/YYYY ค.ศ.) ที่ทำให้อายุ ณ วันนี้ (เวลาไทย) อยู่ในช่วง minAge–maxAge ปี */
export function randomBirthDate(minAge: number, maxAge: number): { birthDate: string; age: number } {
  if (!Number.isInteger(minAge) || !Number.isInteger(maxAge) || minAge < 0 || minAge > maxAge) {
    throw new Error(`ช่วงอายุไม่ถูกต้อง: ${minAge}–${maxAge}`);
  }
  const age = minAge + Math.floor(Math.random() * (maxAge - minAge + 1));
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()).split('-').map(Number);
  // อายุ = age เมื่อเกิดระหว่าง (วันนี้ - (age+1) ปี + 1 วัน) ถึง (วันนี้ - age ปี) — ใช้ UTC กันเวลาเลื่อน
  const latest = Date.UTC(y - age, m - 1, d);
  const earliest = Date.UTC(y - age - 1, m - 1, d + 1);
  const born = new Date(earliest + Math.floor(Math.random() * ((latest - earliest) / 86_400_000 + 1)) * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { birthDate: `${pad(born.getUTCDate())}/${pad(born.getUTCMonth() + 1)}/${born.getUTCFullYear()}`, age };
}

/** ผู้ป่วย mock data ใหม่ 1 คนตามลำดับ seq — เลขบัตรสุ่ม (R8) · เพศสุ่ม + คำนำหน้าตามเพศ · อายุสุ่มตามช่วง */
export function aiTestPatient(seq: string, { minAge = 18, maxAge = 80 } = {}): AiTestPatient {
  const gender = randomGender();
  return {
    seq,
    citizenId: randomThaiId(),
    namePrefix: PREFIX_BY_GENDER[gender],
    firstName: `${AI_TEST_PREFIX}${seq}f`,
    familyName: `${AI_TEST_PREFIX}${seq}l`,
    gender,
    ...randomBirthDate(minAge, maxAge),
  };
}

/** บ้านเลขที่สุ่ม 1–999 (ที่อยู่ของผู้ป่วยที่ลงทะเบียนทางเวชระเบียน) */
export function randomHouseNumber(): string {
  return String(1 + Math.floor(Math.random() * 999));
}

/** หมู่สุ่ม 1–15 */
export function randomMoo(): string {
  return String(1 + Math.floor(Math.random() * 15));
}

/** รหัสไปรษณีย์ 2 หลักแรกแบบสุ่ม (10–96) ใช้ค้นหาตำบลในฟอร์มเวชระเบียน */
export function randomPostalPrefix(): string {
  return String(10 + Math.floor(Math.random() * 87));
}

/** DD/MM/YYYY ค.ศ. → DD/MM/YYYY พ.ศ. (ช่องวันเกิดของ Cortex รับปี พ.ศ.) */
export function toBuddhistDate(date: string): string {
  const [d, m, y] = date.split('/');
  return `${d}/${m}/${Number(y) + 543}`;
}

/** DD/MM/YYYY ค.ศ. → YYYY-MM-DD (รูปแบบ birthDate ที่ API คืน) */
export function toIsoDate(date: string): string {
  const [d, m, y] = date.split('/');
  return `${y}-${m}-${d}`;
}

/** เลขบัตรประชาชนสุ่ม 13 หลัก checksum ถูกต้อง (R8) — หลักที่ 13 = (11 - Σ dᵢ·(14-i) mod 11) mod 10 */
export function randomThaiId(): string {
  const d = [1 + Math.floor(Math.random() * 8)];
  for (let i = 1; i < 12; i++) d.push(Math.floor(Math.random() * 10));
  const sum = d.reduce((s, v, i) => s + v * (13 - i), 0);
  return [...d, (11 - (sum % 11)) % 10].join('');
}

function bangkokStamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('month')}${part('day')}${part('hour')}${part('minute')}${part('second')}`;
}
