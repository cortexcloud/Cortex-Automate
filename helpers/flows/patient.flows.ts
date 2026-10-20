import { expect, type Page } from '@playwright/test';
import {
  gotoErDashboard,
  openErDashboardFromMenu,
  openTriagePage,
  registerNewPatient,
  trackOpenedErVisits,
} from '../functions/er';
import { appendPatient, lastSeq, type StoredPatient } from '../functions/patient-store';
import { aiTestPatient, nextSeq } from '../functions/test-data';

// สร้างผู้ป่วย mock data ชุด "AIทดสอบ" บน dev-x — 20 ต.ค. 2026
// ผู้ป่วยมี HN แต่ไม่มี Visit (ลงทะเบียนที่หน้าคัดกรอง ER แล้วกด "ยกเลิก" ที่ modal เปิด Visit แบบ R24) ·
// ทิ้งไว้บน dev-x ได้ (R11) · บันทึกลง test-data/patients.json ทีละคนทันทีที่ได้ HN
// คำนำหน้า: เปิดหน้าคัดกรองใหม่ทุกคน + เลือกเองตามเพศ (ชาย นาย / หญิง น.ส.) แล้วเช็คกับ response —
// เจอ 20 ต.ค. 2026: ลงทะเบียนต่อในฟอร์มเดิมคำนำหน้าค้างจากคนก่อน (หญิง → ชาย ได้ "น.ส.") และฟอร์มใหม่บางครั้งไม่เติมให้เลย

export interface CreatePatientsOptions {
  /** จำนวนผู้ป่วย (ค่าเริ่ม 1) */
  count?: number;
  /** ช่วงอายุสุ่ม (ค่าเริ่ม 18–80 ปี) */
  minAge?: number;
  maxAge?: number;
  /** เรียกหลังบันทึกแต่ละคน — ใช้แนบหลักฐาน/annotation ใน spec */
  onCreated?: (patient: StoredPatient) => Promise<void> | void;
}

/** ทีละคน: ER Dashboard → หน้าคัดกรอง → ลงทะเบียน "ผู้ป่วยใหม่" → ยกเลิก modal เปิด Visit → เช็คคำนำหน้า → ต่อท้าย patients.json */
export async function createPatients(page: Page, options: CreatePatientsOptions = {}): Promise<StoredPatient[]> {
  const { count = 1, minAge = 18, maxAge = 80, onCreated } = options;
  if (!Number.isInteger(count) || count < 1) throw new Error(`จำนวนผู้ป่วยต้องเป็นจำนวนเต็มตั้งแต่ 1: ${count}`);

  const openedVisits = trackOpenedErVisits(page);

  const created: StoredPatient[] = [];
  for (let i = 0; i < count; i++) {
    // คนแรกโหลดแอป · คนถัดไปกลับผ่านเมนู (ได้ฟอร์มใหม่เหมือนกัน แต่ไม่โหลด JS 15 MB ซ้ำ — goto ซ้ำเคยค้างเกิน 20 วินาที)
    if (i === 0) await gotoErDashboard(page);
    else await openErDashboardFromMenu(page);
    await openTriagePage(page);
    const patient = aiTestPatient(nextSeq(lastSeq()), { minAge, maxAge });
    const { hn, namePrefix, dialog } = await registerNewPatient(page, patient);
    await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await expect(dialog).toBeHidden();
    if (openedVisits.size) throw new Error(`ไม่ควรเกิด Visit แต่เจอ EN ${[...openedVisits.keys()].join(', ')}`);

    const stored: StoredPatient = {
      ...patient,
      hn,
      namePrefix: namePrefix ?? '',
      env: new URL(page.url()).host,
      createdAt: new Date().toISOString(),
    };
    // บันทึกก่อนเช็ค — ถ้าคำนำหน้าผิดก็ยังมีบันทึกว่าสร้างคนนี้ไปแล้ว (HN อยู่บน dev-x แล้ว)
    appendPatient(stored);
    expect(namePrefix, `คำนำหน้าของ HN ${hn} (${patient.gender})`).toBe(patient.namePrefix);
    created.push(stored);
    await onCreated?.(stored);
  }
  return created;
}
