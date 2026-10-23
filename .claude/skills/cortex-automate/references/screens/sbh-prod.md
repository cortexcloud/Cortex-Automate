# ความรู้หน้าจอ Cortex — SBH Prod — พฤติกรรมเฉพาะระบบจริง (รพ.สระบุรี)

แยกจาก SKILL.md §9 เมื่อ 24 ต.ค. 2026 (ข้อความเดิมทั้งหมด · หัว **ตัวหนา** เดิมกลายเป็น `###`)
**อ่านอย่างไร**: โหลดเฉพาะเมื่องานเกี่ยวกับโมดูลนี้ · Grep ชื่อหน้าจอ / class / URL ก่อน แล้ว Read ช่วงบรรทัดที่เจอ · ความรู้ใหม่ของโมดูลนี้ → เพิ่มเป็น `###` ใหม่ท้ายไฟล์ (ระบุระบบ + วันที่ + ไฟล์แอป)

## หัวข้อในไฟล์
- SBH Prod `https://cortex.srbrhospital.com` (รพ.สระบุรี · ตรวจ 2 ต.ค. 2026 — ใช้ได้เฉพาะงาน

---

### SBH Prod `https://cortex.srbrhospital.com` (รพ.สระบุรี · ตรวจ 2 ต.ค. 2026 — ใช้ได้เฉพาะงานที่ผู้ใช้สั่ง R31)
- v2.8.1 (dev-x ยัง v2.2.4 — หน้าจอ/ข้อมูลหลักไม่เหมือนกัน) · Keycloak `https://id-cortex.srbrhospital.com` realm `cortex` · ล็อกอินด้วย `auth.setup.ts` เดิมได้ · มีผู้ป่วยทดสอบของทีมอยู่แล้ว (เช่น "UAT3 001–044", "AUTO UATER01A-…")
- หน้าคัดกรอง ER: ฟอร์มลงทะเบียนมีช่อง **รูปโปรไฟล์** (`upload เลือกรูปภาพ` / `camera ถ่ายรูป`) + ที่อยู่เพิ่มจาก dev-x · ช่องบังคับ 5 ช่องเดิม → `registerNewPatient()` ใช้ได้ · สิทธิ `H03 - สิทธิ UC` มีเหมือน dev-x
- หน้าผู้ป่วยของ Visit ER ต้องมี `&vn=<VN>&fromApp=er` ใน URL (`/cortex/next/patients/<HN>?en=<EN>&vn=<VN>&fromApp=er`) — เปิดแค่ `?en=` ได้หน้าแบบ OPD (ไม่มีแท็บ Triage) · แท็บในขั้น Triage: `Triage / Trauma / Non-Trauma / เด็ก / สัตว์มีพิษ`
- **ไม่นิ่งเป็นช่วงๆ** (2 ต.ค. 16:20–16:55): ไฟล์ `/cortex/assets/*` ได้ 502 / connection reset → หน้า "Unexpected Application Error" (`Unable to preload CSS` / `Failed to fetch dynamically imported module`) ·
  `/cortex-form/*.js` ตอบ 503 "no available server" ~15 นาที → ฟอร์มคัดกรองขึ้น "ไม่สามารถแสดงฟอร์มได้" + ปุ่ม `ดาวน์โหลดอีกครั้ง` · `generated-emr-api` ตอบ 403 "token validation failed" เป็นช่วง 1–5 นาที (token เดียวกันใช้กับ cortex-api ได้) → หน้าผู้ป่วยขึ้น "เกิดข้อผิดพลาด ระบบมีปัญหา กรุณาลองใหม่อีกครั้ง"
  → `mock-data/fixtures.ts` ลองโหลดไฟล์แอปซ้ำ + cache · `navigationTimeout` ของ Prod 90 วินาที · ขั้นที่พังเพราะระบบหลุดให้รันรายนั้นใหม่
- **ผลรันสคริปต์ Mock บน Prod 3 ต.ค. 2026 (ต่างจาก dev-x):**
  - คัดกรอง ESI 3 + สัญญาณชีพ บันทึกได้ (ฟอร์ม `sbh_general_er_triage_v1`) · แพ้ยา + Visit OPD ใช้ขั้นตอนเดียวกับ dev-x ได้ · คลินิกอายุรกรรมบน Prod = `00101 - คลินิกอายุรกรรมโรคทั่วไป` (ไม่มีตัวที่ขึ้นต้น "MED - " → สคริปต์เลือกตัวแรก)
  - **ER Physician Note มีหัวข้อ Pain Score** (`[data-path$="widget_pain_score_general_v1/pain_scale_vas/any_event:0/overall_score"]` — ปุ่ม radio 0–10 หรือ `<select>`) · เว้นว่าง → contribution 400 `pain_scale … Observation contains no results` หน้าจอเงียบ → `savePhysicianNote()` เลือก 3 ให้ (ยังไม่ได้รันยืนยันบน Prod)
  - `LAB0000001` (Glucose) + `IMG0000194` (LEFT ANKLE) เพิ่มลงตะกร้าและส่งคำสั่งได้ (`SignOPDOrders` accepted · ไม่เด้งแบบฟอร์ม Imaging) · **แถวหลังส่งชื่อ `กำลังดำเนินการ [รหัส]`** (dev-x `ส่งแล้ว`)
  - **งานพยาบาลเกิดเฉพาะ Imaging** (`source: IMAGING` 1 งาน PENDING) — Lab ไม่เกิดงาน → สคริปต์สั่ง `IMG0000420` เพิ่มบน Prod (`SETTINGS.extraCodes` · ยังไม่ได้รันยืนยัน)
  - modal เปิด Visit ER ค้างโหลด 1 ครั้ง (query `ImagingOrdersForRegistrationByHN` ไม่ตอบ → ปุ่ม `create-visit-submit` disabled ตลอด) → `registerAndOpenErVisit()` โหลดหน้าใหม่ ค้นด้วย HN แล้วเปิดอีกครั้ง
- **ผลรันรอบเปิดจอทีละราย 3 ต.ค. 2026 12:00–12:15:**
  - Pain Score ใน Physician Note + `IMG0000420` ใช้ได้ → งานพยาบาล Imaging 2 งาน · `registerAndOpenErVisit()` / `openErVisitForHn()` ใช้ได้ (ราย C: แพ้ยา → เปิด Visit ER)
  - เปิด Visit ER บางครั้งขึ้นแจ้งเตือนซ้อน `สร้าง Visit สำเร็จ แต่ไม่สามารถกำหนดระดับ ESI เริ่มต้นได้` (Visit เปิดสำเร็จ) → `confirmOpenErVisit()` ใช้ `.first()`
  - **หน้า "รายการงานพยาบาล"** `/cortex/er/nurse-task-list` เปิดได้บน Prod: ฝั่งซ้ายรายชื่อผู้ป่วยแยกตาม zone (ปุ่มชื่อ `นาย <ชื่อ> 0/0 HN <HN> VN <VN>`) → ตารางงาน (กำหนด / รายการ / ประเภท / Priority / สถานะ `รอรับงาน` / แพทย์ผู้สั่ง / ผู้รับผิดชอบ / Note) → ปุ่ม `รับงาน` ท้ายแถว → `POST /cortex-api/er/nurse-tasks/<id>/accept` → `{"status":"RUNNING"}` (ไม่มี dialog / toast) → `acceptNurseTask()` · `GET …/nurse-tasks?…` ตอบ 500 เป็นบางครั้ง
  - **Visit OPD บน Prod (เสาร์ 3 ต.ค.)**: คลินิกอายุรกรรมทุกตัว (00101–00111 · `MED - ห้องตรวจโรคอายุรกรรมทั่วไป` · `MEDS`) เพิ่มแล้วได้แถวประเภท **`คำขอ Walk-in`** แพทย์ / เวลานัด เป็น "-" ไม่มี select แพทย์ (ไม่มีตารางออกตรวจ) · Visit แบบคำขอ Walk-in: ช่อง `สถานะ` บนแถบหัวว่างและกดไม่ได้ → เช็คอินด้วย `checkInOpdVisit()` ไม่ได้ · dropdown คลินิกเป็น virtual list (ค้น "อายุรกรรม" เห็น 11 ตัวแรก)
  - **ลงตารางแพทย์ให้คำขอ Walk-in** (ผู้ใช้ส่งภาพ dialog มาให้ 3 ต.ค. 2026 "ราย D มีตารางออกตรวจแพทย์อยู่ตามรูป"): `/cortex/opd/select-service-unit` → combobox ใน `main` ตัวที่ 1 = หน่วยบริการ (`แผนกอายุรกรรม`) ตัวที่ 2 = ช่องบริการ (`หลังตรวจ / พร้อมตรวจ / ก่อนตรวจ`) → `ส่ง` (ค่าเก็บใน localStorage `opd-patient-list-clinic-ids` ต้องเลือกทุกครั้งที่เบราว์เซอร์ใหม่ · combobox ตัวแรกของทั้งหน้าคือช่องค้นหาผู้ป่วยบนแถบหัว) →
    `/cortex/opd/patient-list?tab=…` (ตัวกรองแพทย์ตั้งต้น = ผู้ที่ล็อกอิน "ดร. วิชัย รัตน์ เอื้อเฟื้อ" · แท็บ: นัดหมาย / ลงทะเบียน · คำขอ Walk-in · ทั้งหมด · เช็คอิน · พร้อมตรวจ | พักการตรวจ · ตรวจเสร็จ · จำหน่าย · เสร็จสิ้น · ยกเลิก — กดแท็บก่อนรายการโหลดเสร็จแท็บไม่เปลี่ยน) → แท็บ `คำขอ Walk-in` (`tab=walk-in-request`) → แถว `HN <HN>` ปุ่ม `ลงตาราง` →
    dialog `ลงตารางแพทย์`: combobox `*แพทย์ :` (แพทย์ของแผนก 11 คน) · `*ประเภทบริการ :` (ตั้งต้น ตรวจครั้งแรก) · เลือกแพทย์แล้วขึ้นช่วงเวลาเป็น radio (`07:00 - 08:00` … "มีนัดอยู่ 0/5 คน" · ยังไม่เลือกแพทย์ขึ้น "ไม่พบตารางตรวจ" ปุ่มบันทึก disabled) · checkbox `Print บัตรคิวอัตโนมัติ` (สคริปต์เอาออก) → `บันทึก` → graphql `AssignWalkIn` → `latestStatusCode: "in-progress"` + `queueExamId` = **เช็คอินให้เองทันที** (ช่องสถานะบนหน้าผู้ป่วยเป็น `เช็คอิน`) → `scheduleWalkInRequest()`
- เมนู "รับ Refer เข้า" บน Prod ตรวจแล้ว 6 ต.ค. 2026 — ดูหัวข้อ "รับ Refer เข้า + แถบ MOPH Refer" ด้านล่าง
