# ร่างการ์ดบั๊ก — สร้างแล้วเป็น SBH-3960 (8 พ.ย. 2026 20:57 · แบบ 1 · connector Pearsu · assign Suchat)

> พบระหว่าง Retest TC ที่ Failed เพราะ SBH-3928 บน SBH Prod (8 พ.ย. 2026) · TC ที่กระทบ: `TC-SBH-2079-019` (SBH-3661) · `TC-SBH-2079-059` (SBH-3737)
> ต้องเลือกตอน review: แบบ 1 (การ์ดใหม่ใน [SBH] ER) / แบบ 2 (Sub-Issue ใต้ SBH-2079) · Assignee · ใส่ Technical Details ไหม

**ชื่อการ์ด:** `[Bug][ER][Underlying Disease] - SBH Prod ผู้ป่วยที่มีโรคประจำตัวอยู่แล้ว เพิ่ม / แก้โรคประจำตัวไม่ได้ (UpsertUnderlyingDisease version conflict)`

Labels: 🐞 BUG · VERSION 2.10.0 · Natthaphat ( MOD ) 🙈 · Priority High

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** SBH Prod
* **User Account:** User1

### **2. Description**

1. ผู้ป่วยที่บันทึกโรคประจำตัวไว้แล้ว 1 รายการ เพิ่มโรคประจำตัวรายการที่ 2 ใน Verified Underlying Disease ของ ER Physician Note แล้วบันทึกไม่ได้

* **Expected Result:** มี I10 อยู่แล้ว → ค้น E119 → เลือก "Type 2 diabetes mellitus, without complications" → กด บันทึก ของส่วน → บันทึกสำเร็จ ตารางแสดงทั้ง 2 โรค (สร้างโดย user1)
* **Actual Result:** กด บันทึก → ขึ้นข้อความแดง "ไม่สามารถอัปเดตโรคประจำตัวได้" → แถว E119 ค้างบนจอ ช่องสร้างโดย "-" (ไม่ถูกบันทึก) · โหลดหน้าใหม่แล้วลองอีกครั้ง ผลเหมือนเดิม

`SBH-2079-UD-conflict.png` (ภาพตีกรอบ Actual) · คลิป `SBH-2079-UD-conflict.webm`
(ในเครื่อง: `clips/SBH-3928 SBH Prod 2026-11-08/2079-TC019-059/`)

### **3. Technical Details**

* ทดสอบ 08/11/2569 19:01 (รอบเทส) และ 19:13 (ลองซ้ำหลังโหลดหน้าใหม่) · SBH Prod ไฟล์แอป `index-BVfsMIKN.js` (deploy 08/11/2569 16:43 — รอบที่แก้ SBH-3928) · ผู้ป่วย AUTO HN 6904863 (ปิด Visit แล้ว)
* ครั้งแรก (ยังไม่มี U/D): `mutation UpsertUnderlyingDisease` items `[I10]` → 200 ได้ `versionUid 612ce82b-…`
* ครั้งที่ 2: items `[E119, I10]` ไม่มี expected version → 200 แต่ body `errors: underlying disease version conflict` · `extensions: { code: CONFLICT, currentVersionUid: "612ce82b-…::local.ehrbase.org::1", expectedVersionUid: null }`
* `query GetUnderlyingDisease` (getUnderlyingDiseaseByHN) คืนแค่ disease / active / createdBy / createdAt — ไม่มี version → หน้าเว็บไม่มีค่า version ส่งกลับ แม้โหลดหน้าใหม่ → คาดว่าผู้ป่วยที่มี U/D แล้ว**เพิ่ม / ปิด Active / แก้ U/D ไม่ได้ทุกกรณี** (ยังไม่ได้ลองจากหน้าอื่น เช่น ฟอร์มคัดกรอง / ประวัติทางการแพทย์)
* ผลต่อ TC: `TC-SBH-2079-019` / `059` เตรียมผู้ป่วยที่มี U/D Active 2 + Inactive 1 ไม่ได้
* การ์ดที่เกี่ยวข้อง: SBH-3928 (ตัวแก้ clinicallyRecognisedAt · PR cortex-ui#2765)
