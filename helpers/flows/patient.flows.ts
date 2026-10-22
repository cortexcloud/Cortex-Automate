import { expect, type Page } from '@playwright/test';
import {
  gotoErDashboard,
  openErDashboardFromMenu,
  openTriagePage,
  registerNewPatient,
  trackOpenedErVisits,
} from '../functions/er';
import {
  fillRandomReceptionAddress,
  fillReceptionPatient,
  openReceptionCreatePatient,
  saveReceptionPatient,
} from '../functions/reception';
import { appendPatient, lastSeq, type PatientChannel, type StoredPatient } from '../data/patient-store';
import { aiTestPatient, nextSeq, toIsoDate, type AiTestPatient } from '../data/test-data';

// สร้างผู้ป่วย mock data ชุด "AIทดสอบ" บน dev-x — 20 ต.ค. 2026 · เพิ่มช่องทาง Reception 22 ต.ค. 2026
// ผู้ป่วยมี HN แต่ไม่มี Visit · ทิ้งไว้บน dev-x ได้ (R11) · บันทึกลง test-data/patients.json ทีละคนทันทีที่ได้ HN
// - er: ลงทะเบียนที่หน้าคัดกรอง ER แล้วกด "ยกเลิก" ที่ modal เปิด Visit (แบบ R24) — ไม่มีที่อยู่
// - reception: "สร้างผู้ป่วยใหม่" ที่เวชระเบียน — ฟอร์มบังคับที่อยู่ จึงสุ่มที่อยู่ให้
// คำนำหน้า: เลือกเองตามเพศ (ชาย นาย / หญิง น.ส.) — เจอ 20 ต.ค. 2026: ฟอร์ม ER ที่ระบบเติมให้ ค่าค้างจากคนก่อน / บางครั้งไม่เติม
// วันเกิด: ทั้งสองฟอร์มรับปี พ.ศ. (ฟอร์ม ER เปลี่ยนจาก ค.ศ. หลัง 20 ต.ค. 2026) — เช็คกับค่าที่ระบบบันทึกทุกคน

export interface CreatePatientsOptions {
  /** ช่องทางลงทะเบียน — ไม่มีค่าเริ่ม ผู้ใช้ต้องเลือกเอง */
  channel: PatientChannel;
  /** จำนวนผู้ป่วย (ค่าเริ่ม 1) */
  count?: number;
  /** ช่วงอายุสุ่ม (ค่าเริ่ม 18–80 ปี) */
  minAge?: number;
  maxAge?: number;
  /** เรียกหลังบันทึกแต่ละคน — ใช้แนบหลักฐาน/annotation ใน spec */
  onCreated?: (patient: StoredPatient) => Promise<void> | void;
}

/** สิ่งที่ระบบบันทึกจริง ใช้เช็คกับค่าที่ตั้งใจ */
interface Registered {
  hn: string;
  namePrefix?: string;
  birthDate?: string;
  address?: string;
}

export async function createPatients(page: Page, options: CreatePatientsOptions): Promise<StoredPatient[]> {
  const { channel, count = 1, minAge = 18, maxAge = 80, onCreated } = options;
  if (!Number.isInteger(count) || count < 1) throw new Error(`จำนวนผู้ป่วยต้องเป็นจำนวนเต็มตั้งแต่ 1: ${count}`);

  const openedVisits = trackOpenedErVisits(page);
  const created: StoredPatient[] = [];
  for (let i = 0; i < count; i++) {
    const patient = aiTestPatient(nextSeq(lastSeq()), { minAge, maxAge });
    const registered = channel === 'er' ? await registerAtEr(page, patient, i === 0) : await registerAtReception(page, patient);
    if (openedVisits.size) throw new Error(`ไม่ควรเกิด Visit แต่เจอ EN ${[...openedVisits.keys()].join(', ')}`);

    const stored: StoredPatient = {
      ...patient,
      hn: registered.hn,
      channel,
      namePrefix: registered.namePrefix ?? '',
      env: new URL(page.url()).host,
      createdAt: new Date().toISOString(),
      ...(registered.address && { address: registered.address }),
    };
    // บันทึกก่อนเช็ค — ถ้าค่าผิดก็ยังมีบันทึกว่าสร้างคนนี้ไปแล้ว (HN อยู่บน dev-x แล้ว)
    appendPatient(stored);
    expect(registered.namePrefix, `คำนำหน้าของ HN ${registered.hn} (${patient.gender})`).toBe(patient.namePrefix);
    expect(registered.birthDate, `วันเกิดของ HN ${registered.hn}`).toBe(toIsoDate(patient.birthDate));
    created.push(stored);
    await onCreated?.(stored);
  }
  return created;
}

/** ER Dashboard → หน้าคัดกรอง → "ผู้ป่วยใหม่" → ลงทะเบียน → ยกเลิก modal เปิด Visit */
async function registerAtEr(page: Page, patient: AiTestPatient, first: boolean): Promise<Registered> {
  // คนแรกโหลดแอป · คนถัดไปกลับผ่านเมนู (ได้ฟอร์มใหม่เหมือนกัน แต่ไม่โหลด JS 15 MB ซ้ำ — goto ซ้ำเคยค้างเกิน 20 วินาที)
  if (first) await gotoErDashboard(page);
  else await openErDashboardFromMenu(page);
  await openTriagePage(page);
  const { hn, namePrefix, birthDate, dialog } = await registerNewPatient(page, patient);
  await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog).toBeHidden();
  return { hn, namePrefix, birthDate };
}

/** เวชระเบียน → "สร้างผู้ป่วยใหม่" → ข้อมูลส่วนตัว + ที่อยู่สุ่ม → บันทึก */
async function registerAtReception(page: Page, patient: AiTestPatient): Promise<Registered> {
  await openReceptionCreatePatient(page);
  await fillReceptionPatient(page, patient);
  const address = await fillRandomReceptionAddress(page);
  const saved = await saveReceptionPatient(page, 'สร้างผู้ป่วยใหม่ที่เวชระเบียน');
  return { hn: saved.hn, namePrefix: saved.namePrefix?.display, birthDate: saved.birthDate, address };
}
