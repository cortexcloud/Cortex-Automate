# ร่างการ์ดบั๊ก (Sub-Issue ใต้ SBH-1678) — 4 ข้อที่ Fail บน SBH Prod

> สถานะ: **สร้างแล้ว = SBH-3929** (ผู้ใช้ตอบ "ตัดข้อ 4 ออก" → สร้าง 3 ข้อ · ข้อ 4 ติดตามที่ SBH-3928) — เดิม: ร่าง รอผู้ใช้ review (7 พ.ย. 2026 · ผู้ใช้สั่ง "Bug 4 ข้อ ที่ Fail บน Prod สร้างเป็นการ์ดบัคแบบ Sub-issue ไว้หน่อย")
> - **แบบ 2** Sub-Issue · parentId = SBH-1678 · การ์ดเดียว 4 ข้อ (ฟีเจอร์เดียวกัน = การ์ดเดียวตามรูปแบบเดิม)
> - ตั้งค่า: Bug Template · project [SBH] ER · Milestone `ER - เก็บตก, edge case` · Priority High · สถานะ Waiting for Fixing Bugs · labels 🐞 BUG / VERSION 2.10.0 / Natthaphat ( MOD ) 🙈 · Assignee Suchat · connector Nawin (Win) · ไม่แตะสถานะการ์ดแม่
> - ภาพ / คลิปใช้ assetUrl ที่อัปโหลดให้ TC แล้ว (ไม่อัปโหลดซ้ำ)
> - ข้อ 4 มีการ์ดแยก SBH-3928 อยู่แล้ว (ผู้ใช้สั่งก่อนหน้า) → ใส่ในการ์ดนี้ด้วยเพื่อให้ครบ 4 ข้อ + อ้างถึง SBH-3928 + ผูก Related

**Title:** `[Bug][ER][Triage Trauma Form] - SBH Prod ผู้นำส่งมี 4 ตัวเลือก · เลือก EMS ไม่เติม EMS ขึ้นทะเบียน · ER Summary ผู้นำส่งไม่ตรง · บันทึกโรคประจำตัวไม่ได้`

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** SBH Prod
* **User Account:** User1

### **2. Description**

1. dropdown ผู้นำส่ง (ER Arrival ฟอร์มคัดกรอง ER) มีแค่ 4 ตัวเลือก

* **Expected Result:** dropdown ผู้นำส่งมี 9 ตัวเลือก: ไม่มีผู้นำส่ง/มาเอง · ตำรวจ/ทหาร · EMS ขึ้นทะเบียน · องค์กรไม่ขึ้นทะเบียน (มูลนิธิ/อาสา) · ญาติ/ผู้พบเห็น/อื่นๆ · ไม่ทราบ · ไม่มีผู้มาด้วย · ผู้ดูแล · เจ้าหน้าที่ EMS
* **Actual Result:** มี 4 ตัวเลือก: none - ไม่มีผู้มาด้วย · relative - ญาติ · caregiver - ผู้ดูแล · ems_personnel - เจ้าหน้าที่ EMS

[ภาพ TC004-P-01 · คลิป TC004]

2. เลือกวิธีการมาถึง = EMS แล้วผู้นำส่งไม่ถูกตั้งเป็น EMS ขึ้นทะเบียน

* **Expected Result:** เลือก EMS → ผู้นำส่งเป็น "EMS ขึ้นทะเบียน" อัตโนมัติ
* **Actual Result:** เลือก EMS → ผู้นำส่งยังว่าง (เลือกผู้นำส่ง)

[ภาพ TC006-P-01 (ก่อนกด) · TC006-P-02 (หลังกด) · คลิป TC006]

3. ER Summary ส่วนการนำส่ง แสดงผู้นำส่งไม่ตรงกับ ER Arrival ที่ต้องได้

* **Expected Result:** บันทึกคัดกรอง EMS · ALS → ER Summary ส่วน "การนำส่งและการดูแลระหว่างนำส่ง" แสดง ผู้นำส่ง = EMS ขึ้นทะเบียน
* **Actual Result:** ผู้นำส่ง = "เจ้าหน้าที่ EMS" (ไม่มีตัวเลือก EMS ขึ้นทะเบียนให้เลือก) · ช่องอื่นตรง: EMS · ALS · หน่วยกู้ภัยทดสอบ · BP 110/70 ระหว่างนำส่ง

[ภาพ TC009-P-01 (ผู้นำส่งไม่ถูกเติม) · TC009-P-04 (ER Summary) · คลิป TC009]

4. บันทึกโรคประจำตัว (Underlying Disease) ในฟอร์มคัดกรอง ER ไม่ได้ (การ์ดแยก SBH-3928)

* **Expected Result:** ค้น I10 → เลือก Essential (primary) hypertension → กด บันทึก → บันทึกสำเร็จ · หลังบันทึกคัดกรองแสดงในผลคัดกรอง / U/D
* **Actual Result:** กด บันทึก → ข้อความแดง "ไม่สามารถอัปเดตโรคประจำตัวได้" (graphql 400) → U/D "-" · "ไม่พบข้อมูลโรคประจำตัว"

[ภาพ TC014-P-03 · TC014-P-07 · คลิป TC014]

### **3. Technical Details**

* ทดสอบ 07/11/2569 12:16–12:44 · SBH Prod ไฟล์แอป `index-BkJczri0.js` (deploy 06/11/2569 22:45) · ผู้ป่วย AUTO ปิด Visit แล้วทุกราย · ผลต่อ TC: TC-004 (SBH-3285) · TC-006 (SBH-3287) · TC-009 (SBH-3290) · TC-014 (SBH-3295) — Failed บน SBH Prod · ผ่านบน Dev-X
* ข้อ 1–3 สาเหตุเดียวกัน: `GET /cortex-api/er/registration-options` ของ SBH Prod `accompanyingPersons` มี 4 รายการ (id 5 none · 6 relative · 7 caregiver · 8 ems_personnel) — master data ผู้นำส่งยังเป็นชุดเก่า (Dev-X มีรหัสตามมาตรฐาน PHER+ เช่น "3 - EMS ขึ้นทะเบียน" id 11) → ไม่มีค่าให้เติมเมื่อเลือก EMS
* ข้อ 3: `GET /er/encounters/E6911075590` → accompanyingPersonOptionId 8 · ค่าอื่น arrivalMethod ems · emsLevel 1 · transporterName / preHospitalInfo ตรงที่กรอก
* ข้อ 4: `POST /cortex-api/graphql` 400 — `mutation UpsertUnderlyingDisease` `Cannot query field "clinicallyRecognisedAt" on type "UnderlyingDisease"` (หน้าเว็บใหม่กว่า API ของ Prod) · รายละเอียด + การ์ดอื่นที่โดนอยู่ที่ SBH-3928
