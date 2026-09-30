import type { Page } from '@playwright/test';
import {
  confirmOpenErVisit,
  dismissToast,
  expectTriageFormOpen,
  gotoErDashboard,
  openTriagePage,
  registerNewPatient,
  type ErVisit,
} from '../functions/er';
import { newTestPatient } from '../functions/test-data';

// Flow-level sequences ของ module ER (ใช้ซ้ำข้าม spec ได้) — 30 ก.ย. 2026
// flow = sequence ของ page action ที่เป็นหน่วยงานหนึ่งชิ้นทาง business
// spec ใช้ flow เหล่านี้ใน test.step/checkStep แทนการเขียน inline ทุกครั้ง

/**
 * เตรียม Visit ER + เปิดหน้า Triage สำหรับผู้ป่วยใหม่ AUTO (R10, R17)
 * ลำดับ: ไปหน้า ER Dashboard → เปิดหน้าคัดกรอง → ลงทะเบียน AUTO → ยืนยัน Visit → รอฟอร์ม Triage → ปิด toast
 * @param label ส่วนท้ายของนามสกุลผู้ป่วย เช่น 'Triage', 'NewHN' — ใช้แยกรายการในรายงาน
 * @returns ErVisit (hn, vn, en) ที่สร้างขึ้น
 */
export async function prepareNewPatientErVisit(page: Page, label: string): Promise<ErVisit> {
  await gotoErDashboard(page);
  await openTriagePage(page);
  const { dialog } = await registerNewPatient(page, newTestPatient(label));
  const visit = await confirmOpenErVisit(page, dialog);
  await expectTriageFormOpen(page, visit);
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  return visit;
}
