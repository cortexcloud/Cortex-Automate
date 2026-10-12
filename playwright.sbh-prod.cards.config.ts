import { buildConfig } from './playwright.base';

// SBH Prod (รพ.สระบุรี) — เทสการ์ดใน tests/ เฉพาะไฟล์ที่ผู้ใช้อนุญาตให้รันบน Prod เป็นรายการ์ด (เพิ่มได้เมื่อผู้ใช้สั่งเท่านั้น)
// เทสการ์ดอื่นสร้างผู้ป่วย / Visit จึงไม่ถูกรันจาก config นี้ · ผลรันใช้โฟลเดอร์เดียวกับ playwright.sbh-prod.config.ts (อย่ารัน 2 คำสั่งพร้อมกัน)
// ไฟล์ที่สร้างข้อมูล (SBH-2471) ต้องเลือกด้วย --grep ทุกครั้ง — อย่ารันทั้ง config รวดเดียว
// รัน: npm run card:prod -- --headed --grep @SBH-2394
export default buildConfig({
  env: 'sbh-prod',
  testMatch: [
    /SBH-2394-.*\.spec\.ts$/, // แถบ MOPH Refer ที่หน้าคัดกรอง ER — อ่านอย่างเดียว (ผู้ใช้อนุญาต 6 ต.ค. 2026 · dev-x ไม่มีผู้ป่วยรับ Refer)
    /SBH-2471-.*\.spec\.ts$/, // ป้ายปลายเตียงแสดงอายุ + HN — **สร้างผู้ป่วย AUTO 4 ราย + Visit ER + Triage แล้วปิด Visit ที่การเงิน** (ผู้ใช้อนุญาต 7 ต.ค. 2026 · dev-x ยังเป็น template ป้ายเดิม)
    /SBH-2462-.*\.spec\.ts$/, // ประวัติ Disposition — **สร้างผู้ป่วย AUTO 2 ราย + Visit ER + Triage + Disposition (ลงนาม) แล้วปิด Visit ที่การเงิน** (ผู้ใช้อนุญาต 8 ต.ค. 2026 · dev-x ยังไม่มี API ประวัติ)
    /SBH-2373-.*\.spec\.ts$/, // บันทึก Form Triage + ER Physician Note — **สร้างผู้ป่วย AUTO 1 ราย + Visit ER + Triage + Physician Note แล้วปิด Visit ที่การเงิน** (ผู้ใช้อนุญาต 12 ต.ค. 2026)
  ],
});
