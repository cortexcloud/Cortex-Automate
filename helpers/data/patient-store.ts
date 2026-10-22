import fs from 'node:fs';
import path from 'node:path';
import type { AiTestPatient } from './test-data';

export type PatientChannel = 'er' | 'reception';

// mock data ผู้ป่วยที่สร้างจริงบน dev-x (ชุด "AIทดสอบ") — เก็บใน git ให้ spec / งานถัดไป import ไปใช้ได้

/** ผู้ป่วย 1 รายที่ลงทะเบียนสำเร็จแล้ว (มี HN ไม่มี Visit) */
export interface StoredPatient extends AiTestPatient {
  hn: string;
  /** ช่องทางที่ลงทะเบียน: หน้าคัดกรอง ER หรือเวชระเบียน (Reception) */
  channel: PatientChannel;
  /** host ที่สร้างผู้ป่วย เช่น dev-x.cortexcloud.co — ผู้ป่วยมีอยู่แค่ใน env นั้น */
  env: string;
  /** ISO 8601 */
  createdAt: string;
  /** ที่อยู่ — ช่องทาง Reception มีทุกคน (สุ่ม) · ช่องทาง ER มีเฉพาะคนที่แก้ข้อมูลทีหลังผ่านเวชระเบียน */
  address?: string;
  /** หมายเหตุสิ่งที่ทำกับผู้ป่วยหลังสร้าง */
  note?: string;
}

export const PATIENTS_FILE = path.resolve(__dirname, '../../test-data/patients.json');

export function readPatients(file = PATIENTS_FILE): StoredPatient[] {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')) as StoredPatient[];
}

/** seq ล่าสุดในไฟล์ (ใช้กับ nextSeq) — ไฟล์ว่าง/ไม่มีไฟล์ = undefined */
export function lastSeq(file = PATIENTS_FILE): string | undefined {
  return readPatients(file).at(-1)?.seq;
}

/** ต่อท้ายผู้ป่วย 1 ราย — เขียนไฟล์ชั่วคราวแล้ว rename ไฟล์ไม่พังถ้าเทสหยุดกลางคัน */
export function appendPatient(patient: StoredPatient, file = PATIENTS_FILE) {
  const patients = readPatients(file);
  if (patients.some((p) => p.seq === patient.seq || p.hn === patient.hn)) {
    throw new Error(`patients.json มี seq "${patient.seq}" หรือ HN ${patient.hn} อยู่แล้ว`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify([...patients, patient], null, 2)}\n`);
  fs.renameSync(tmp, file);
}
