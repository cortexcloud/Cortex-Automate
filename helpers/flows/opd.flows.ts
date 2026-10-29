import type { Page } from '@playwright/test';
import { OPD_CLINIC, OPD_UNIT, gotoPatient, openOpdVisit, scheduleWalkInRequest } from '../functions/opd-visit';

// Flow เปิด Visit OPD แบบ Walk-in ให้ผู้ป่วยที่มี HN แล้ว — 29 ต.ค. 2026
// คลินิกที่มีแพทย์ออกตรวจ (เช่น MED - อายุรกรรม บน dev-x) ได้ Visit พร้อมแพทย์ทันที
// คลินิกที่ไม่มีช่องแพทย์ (เช่น SBH - ห้องตรวจสระบุรี / อายุรกรรมบน SBH Prod) ได้แถว "คำขอ Walk-in" → ลงตารางแพทย์ต่อให้เอง
// Visit ที่ได้สถานะ "รอเช็คอิน" — เช็คอินต่อด้วย checkInOpdVisit() ใน mock-data/uat-er.ts

export interface OpdWalkInVisit {
  vn: string;
  en: string;
  clinic: string;
  doctor: string;
  /** มีเมื่อต้องลงตาราง: ช่วงเวลาที่ลง */
  slot?: string;
  scheduled: boolean;
}

export async function openOpdWalkInVisit(
  page: Page,
  hn: string,
  options: { clinic?: { search: string; prefer: RegExp }; unit?: { name: string; counter: string } } = {},
): Promise<OpdWalkInVisit> {
  await gotoPatient(page, hn);
  const visit = await openOpdVisit(page, options.clinic ?? OPD_CLINIC);
  if (visit.doctor) return { ...visit, scheduled: false };
  const { doctor, slot } = await scheduleWalkInRequest(page, hn, options.unit ?? OPD_UNIT);
  return { ...visit, doctor, slot, scheduled: true };
}
