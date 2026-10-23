# ความรู้หน้าจอ Cortex — การเงิน — ปิด Visit

แยกจาก SKILL.md §9 เมื่อ 24 ต.ค. 2026 (ข้อความเดิมทั้งหมด · หัว **ตัวหนา** เดิมกลายเป็น `###`)
**อ่านอย่างไร**: โหลดเฉพาะเมื่องานเกี่ยวกับโมดูลนี้ · Grep ชื่อหน้าจอ / class / URL ก่อน แล้ว Read ช่วงบรรทัดที่เจอ · ความรู้ใหม่ของโมดูลนี้ → เพิ่มเป็น `###` ใหม่ท้ายไฟล์ (ระบุระบบ + วันที่ + ไฟล์แอป)

## หัวข้อในไฟล์
- โมดูลการเงิน — ปิด Visit (สำรวจบน dev-x 3 ต.ค. 2026 · ยังไม่ได้ดูบน SBH Prod)

---

### โมดูลการเงิน — ปิด Visit (สำรวจบน dev-x 3 ต.ค. 2026 · ยังไม่ได้ดูบน SBH Prod)
- `/cortex/apps` → `การเงิน` → `/cortex/cashier/patients` ("ค้นหาผู้ป่วย ที่กล่องค้นหาด้านบน") · แถบหัวมี เล่มที่/เลขที่ปัจจุบัน · `จัดการรอบ` · ห้องการเงิน (dev-x user1 = ห้องการเงินผู้ป่วยนอก 1)
- พิมพ์ HN ที่ combobox `ค้นหาผู้ป่วย` บนแถบหัว → ระบบพาไป `/cortex/cashier/patients/<HN>/accounts/<VN>/charge-items` เอง (ไม่ต้องกดเลือก) · หัวบัญชี: `VN: <VN>` + `เปิด` + `สถานะ Visit: กำลังรักษา` + ปุ่ม `ล็อค` / `ปิด Visit`
- `ปิด Visit` → มียอดค้างชำระ: modal "ยืนยันการปิด Visit · ยอดค้างชำระคงเหลือ: 1,100.00" ปุ่ม `ยกเลิก` / `ปิด Visit` · **ยอดเป็น 0: ปิดทันทีไม่มี modal** → `POST /cortex-api/accounts/<accountId>/close` → 202 → หัวบัญชีเป็น `ปิด` + `สถานะ Visit: เสร็จสิ้น` + ปุ่ม `ปลดล็อค` / `Reopen Visit` · Encounter ER เป็น `completed` / `patientStatus: discharged` หายจากบอร์ด → `closeVisitAtCashier()` ใน `helpers/functions/cashier.ts`
- **บอร์ด ER ดึงรายชื่อด้วย `GET /cortex-api/er/dashboard/encounters?scope=current_queue`** (ทุก Encounter ที่ยังค้าง รวมค้างข้ามวัน — ตรงกับการ์ดบนจอ · ใช้ได้ทั้ง dev-x และ SBH Prod) · มุมมอง "รายการ" ใช้ `?scope=arrival_day` (Prod ตอบ 500 เป็นบางครั้ง) · `?date=` คืนเฉพาะที่มาถึงวันนั้น — **ใช้ `?date=` ดูว่า "บอร์ดว่างหรือยัง" ไม่ได้** (5 ต.ค. 2026 รายงานผู้ใช้ว่าเหลือ 0 ทั้งที่บอร์ดยังมี 22 / 114 ราย)
- ปิด Visit ที่การเงินแล้ว Encounter เป็น `completed` + `patientStatus: finished` (Prod v2.8.1) · **รายที่มี Admit Request / Admission (`bed_waiting`) ปิด Visit แล้วยังค้างคอลัมน์ "รอเตียง" ของบอร์ด** (`completed/bed_waiting`) — ปุ่มปิด Visit เอาออกไม่ได้
- ข้อมูลบอร์ด ER (`GET /cortex-api/er/dashboard/encounters?date=`) มี `patient.firstName / familyName / namePrefix.display` · `triageLevel` · `patientStatus` (`current_in_er` / `discharged`) ใช้กรองรายชื่อได้
