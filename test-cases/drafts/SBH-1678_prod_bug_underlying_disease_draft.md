# ร่างการ์ดบั๊ก (การ์ดแยก) — บันทึกโรคประจำตัว (Underlying Disease) บน SBH Prod ไม่ได้

> สถานะ: **สร้างแล้ว = SBH-3928** (7 พ.ย. 2026 ผู้ใช้ตอบ "สร้างได้" · จากการทดสอบ SBH-1678 TC-014 บน SBH Prod)
> - ผู้ใช้สั่ง "สร้างเป็นการ์ดแยก และระบุว่าเกี่ยวข้องกับการ์ดไหนบ้าง" → **แบบ 1** การ์ดใหม่ใน `[SBH] ER` ไม่มี parent + relation "Related" กับการ์ดที่เกี่ยวข้อง
> - **รวมกับร่างของ session SBH-2058** (`test-cases/drafts/SBH-2058_prod_bug_underlying_disease_draft.md` — อาการเดียวกัน ยังไม่ได้สร้าง) → สร้างการ์ดเดียว ไม่สร้างของ SBH-2058 ซ้ำ
> - ตั้งค่า: Bug Template · project [SBH] ER · Milestone `ER - เก็บตก, edge case` (ตาม SBH-1678) · Priority High · สถานะ Waiting for Fixing Bugs · labels 🐞 BUG / VERSION 2.10.0 (ตาม SBH-1678) / Natthaphat ( MOD ) 🙈 · Assignee Suchat · connector = Nawin (Win)
> - Related: SBH-1678 · SBH-2058 · SBH-3182 · SBH-2079 + TC ที่ Failed: SBH-3295 · SBH-3565 · SBH-3476 · SBH-3535
> - ภาพ: `clips/SBH-1678 Prod 2026-11-07/t3295/t3295-04r.png` (กดบันทึกแล้วขึ้นข้อความแดง) · `t3295-08.png` ตีป้ายใหม่เป็น `Actual:` (หลังบันทึกคัดกรอง U/D "-" + "ไม่พบข้อมูลโรคประจำตัว") · คลิป TC-014 ใช้ assetUrl ที่อัปโหลดให้ TC

**Title:** `[Bug][ER][Underlying Disease] - SBH Prod บันทึกโรคประจำตัวไม่ได้ (UpsertUnderlyingDisease 400 · clinicallyRecognisedAt)`

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** SBH Prod
* **User Account:** User1

### **2. Description**

1. กดบันทึกโรคประจำตัวในส่วน Underlying Disease ของหน้า Visit ER (ฟอร์มคัดกรอง ER) แล้วไม่ถูกบันทึก

* **Expected Result:** ค้น I10 → เลือก "Essential (primary) hypertension" → กด บันทึก ของส่วน → บันทึกสำเร็จ · U/D ที่แถบผู้ป่วยและ Verified Underlying Disease แสดงโรคที่เพิ่ม
* **Actual Result:** กด บันทึก → ขึ้นข้อความแดง "ไม่สามารถอัปเดตโรคประจำตัวได้" (แถวยังค้างบนจอ) → บันทึกคัดกรองแล้ว U/D ที่แถบผู้ป่วย = "-" · Verified Underlying Disease = "ไม่พบข้อมูลโรคประจำตัว"

[ภาพ t3295-04r.png — ข้อความแดงหลังกดบันทึก]

[ภาพ t3295-08 (Actual) — หลังบันทึกคัดกรอง U/D ว่าง]

[คลิป SBH-1678-TC014-P-0711.webm]

### **3. Technical Details**

* ทดสอบ 07/11/2569 12:16 และ 12:22 (2 ราย ผลเหมือนกัน) · SBH Prod ไฟล์แอป `index-BkJczri0.js` (deploy 06/11/2569 22:45) · ผู้ป่วย AUTO HN 6904817 / HN 6904819 (ปิด Visit แล้ว)
* กด บันทึก → `POST /cortex-api/graphql` ตอบ **400** (SBH-1678 รอบนี้) · ข้อความ error จากการทดสอบ SBH-2058 บน Prod วันเดียวกัน (11:14): `mutation UpsertUnderlyingDisease` → `GRAPHQL_VALIDATION_FAILED` — `Cannot query field "clinicallyRecognisedAt" on type "UnderlyingDisease"` → หน้าเว็บขอ field ที่ API ของ Prod ยังไม่มี (หน้าเว็บรุ่นใหม่กว่า API)
* dev-x บันทึกโรคประจำตัวขั้นเดียวกันได้ (SBH-1678 TC-014 ผ่านบน Dev-X 29/10/2569 · SBH-2058 TC-006 ผ่านบน dev-x)
* การ์ดที่เกี่ยวข้อง (TC ที่ลง Failed บน SBH Prod เพราะอาการนี้):
  * SBH-1678 ฟอร์มคัดกรอง ER แบบ Trauma — `TC-SBH-1678-014` (SBH-3295) เพิ่มโรคประจำตัวในฟอร์มคัดกรอง ER
  * SBH-2058 Trauma Exam Form — `TC-SBH-2058-006` (SBH-3565) Underlying Disease เติมจากการคัดกรอง
  * SBH-3182 ER Summary — `TC-SBH-3182-005` (SBH-3476) โรคประจำตัวจาก Triage ของ visit · `TC-SBH-3182-046` (SBH-3535) โรคประจำตัวจากประวัติทางการแพทย์
  * SBH-2079 ER Discharge Summary — พบตอนเตรียมข้อมูลบน Prod 06/11/2569 (บันทึก Verified Underlying Disease ใน ER Physician Note ไม่ได้ อาการเดียวกัน)
