/** ข้อมูลผู้ป่วยใหม่สำหรับฟอร์มลงทะเบียนที่หน้า ER (ช่องบังคับ 5 ช่อง) */
export interface NewPatient {
  citizenId: string;
  firstName: string;
  familyName: string;
  gender: 'ชาย' | 'หญิง';
  /** DD/MM/YYYY เป็น ค.ศ. — พิมพ์ลงช่องวันเกิดได้เลย ไม่ต้องเปิดปฏิทิน */
  birthDate: string;
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
