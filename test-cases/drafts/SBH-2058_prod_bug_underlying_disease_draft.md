# ร่างการ์ดบั๊ก — บันทึกโรคประจำตัว (Underlying Disease) บน SBH Prod ไม่ได้ (จาก TC-006 ของ SBH-2058)

> สถานะ: **ไม่ต้องสร้างแล้ว — รวมเป็นการ์ดเดียว SBH-3928** (สร้างจาก session SBH-1678 7 พ.ย. 2026 ตามที่ผู้ใช้สั่ง "สร้างเป็นการ์ดแยก ระบุการ์ดที่เกี่ยวข้อง" · ผูก Related กับ SBH-2058 / TC-006 SBH-3565 แล้ว) — เดิม: ร่าง รอผู้ใช้ review (7 พ.ย. 2026)
> - ผู้ใช้เลือก "Fail + Failed + เปิดการ์ดบั๊ก" สำหรับ TC-006 บน SBH Prod
> - เสนอ **แบบ 1** การ์ดใหม่ใน `[SBH] ER` (ไม่ใช่ Sub-Issue) เพราะเป็นการบันทึกโรคประจำตัวทั้งหน้า Visit (ส่วน Underlying Disease ของฟอร์มคัดกรอง) ไม่ใช่ฟอร์ม Trauma · ถ้าต้องการแบบ 2 ใต้ SBH-2058 แจ้งได้
> - ตั้งค่า: Bug Template · project [SBH] ER · Priority High · สถานะ Waiting for Fixing Bugs · labels 🐞 BUG / VERSION 2.9.1 (ตามการ์ด SBH-2058) / Natthaphat ( MOD ) 🙈 · Assignee Suchat · Milestone ตามการ์ด SBH-2058 · connector = Nawin (Win)
> - ภาพ: `.cache/p2058/TC006-ud-save-failed.png` · `.cache/p2058/TC006-ud-after-reload.png` (ตีกรอบใหม่ — ป้ายใช้ `Actual:` ตอนสร้างจริง)

**Title:** `[Bug][ER][Underlying Disease] - SBH Prod บันทึกโรคประจำตัวไม่ได้ (UpsertUnderlyingDisease 400) ฟอร์มแพทย์จึงไม่มีโรคประจำตัวจากการคัดกรอง`

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** SBH Prod
* **User Account:** user1 (คัดกรองแทนพยาบาล) · Doctor (กันตวิทย์ สวนทวี)

### **2. Description**

1. กดบันทึกโรคประจำตัวในส่วน Underlying Disease ของหน้า Visit ER แล้วไม่ถูกบันทึก

* **Expected Result:** เลือก I10 Essential (primary) hypertension → กด บันทึก ของส่วน → บันทึกสำเร็จ โหลดหน้าใหม่ยังอยู่ · header U/D แสดงโรค · ส่วน Verified Underlying Disease ของ ER Physician Note แสดงโรคที่คัดกรอง
* **Actual Result:** เลือก I10 → กด บันทึก → ขึ้นข้อความแดง "ไม่สามารถอัปเดตโรคประจำตัวได้" (แถวยังค้างในตาราง) → โหลดหน้าใหม่ แถวหายเป็น "ไม่พบข้อมูลโรคประจำตัว" · header U/D: - · ฟอร์มแพทย์ Verified Underlying Disease ว่าง

[ภาพ TC006-ud-save-failed.png]

[ภาพ TC006-ud-after-reload.png]

### **3. Technical Details**

* ทดสอบ 07/11/2569 11:14 · SBH Prod ไฟล์แอป `index-BkJczri0.js` (deploy 6 พ.ย. 22:45) · ผู้ป่วย AUTO HN 6904800 · E6911075565 (เจอครั้งแรกกับ HN 6904798 ระหว่างเตรียมผู้ป่วย Trauma)
* กด บันทึก → `POST /cortex-api/graphql` `mutation UpsertUnderlyingDisease` ตอบ **400** `GRAPHQL_VALIDATION_FAILED` — `Cannot query field "clinicallyRecognisedAt" on type "UnderlyingDisease"` → หน้าเว็บขอ field ที่ API ของ Prod ยังไม่มี (หน้าเว็บรุ่นใหม่กว่า API)
* dev-x (index-CgKmiuKR.js) บันทึกโรคประจำตัวในขั้นเดียวกันได้ และฟอร์มแพทย์แสดง "Essential (primary) hypertension"
* กระทบ TC-006 [SBH-3565](<https://linear.app/cortexcloud/issue/SBH-3565>) ของ SBH-2058 (Underlying Disease เติมจากการคัดกรอง) — ลง Fail บน SBH Prod
