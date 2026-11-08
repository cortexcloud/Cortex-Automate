# ร่างการ์ดบั๊ก — สร้างแล้วเป็น SBH-3961 (8 พ.ย. 2026 20:57 · แบบ 1 · connector Pearsu · assign Suchat · เพิ่มผลเช็กซ้ำ 20:51 + GetUnderlyingDiseaseSnapshotByHN)

> พบระหว่าง Retest TC ที่ Failed เพราะ SBH-3928 บน SBH Prod (8 พ.ย. 2026) · TC ที่กระทบ: `TC-SBH-3182-046` (SBH-3535)
> ต้องเลือกตอน review: แบบ 1 (การ์ดใหม่ใน [SBH] ER) / แบบ 2 (Sub-Issue ใต้ SBH-3182) · Assignee · ใส่ Technical Details ไหม

**ชื่อการ์ด:** `[Bug][ER][ประวัติทางการแพทย์] - SBH Prod เปิดเมนู ประวัติทางการแพทย์ แล้วแอปแครชเป็นบางครั้ง (.filter is not a function)`

Labels: 🐞 BUG · VERSION 2.10.0 · Natthaphat ( MOD ) 🙈 · Priority High

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** SBH Prod
* **User Account:** User1

### **2. Description**

1. เปิดหน้า Visit ER ของผู้ป่วย แล้วกดเมนูซ้าย ประวัติทางการแพทย์ แอปแครชทั้งหน้า (เกิดเป็นบางครั้ง)

* **Expected Result:** กดเมนู ประวัติทางการแพทย์ → แสดงหน้าประวัติทางการแพทย์ (ประวัติประจำเดือน / Underlying Disease / ประวัติผ่าตัด ฯลฯ) ใช้งานได้
* **Actual Result:** กดเมนู → หน้าแสดง "Unexpected Application Error!" · "(intermediate value)(intermediate value)(intermediate value).filter is not a function" ทั้งหน้า ต้องโหลดหน้าใหม่

`SBH-3182-TC046-crash.png` (ภาพตีกรอบ Actual) · `SBH-3182-TC046-precrash.png` (ก่อนแครช — เห็น HN และเมนู) · คลิป `SBH-3182-TC046-crash.webm`
(ในเครื่อง: `clips/SBH-3928 SBH Prod 2026-11-08/3182-TC046/`)

### **3. Technical Details**

* SBH Prod ไฟล์แอป `index-BVfsMIKN.js` (deploy 08/11/2569 16:43) · stack: `PHt (index-BVfsMIKN.js:50074:13759)` ← `Iv` ← `kv` ← `Bw` …
* 08/11/2569 18:55–19:20 เปิดหน้านี้ 9 ครั้ง กับผู้ป่วย AUTO 3 ราย (HN 6904861 / 6904862 / 6904863 — มี / ไม่มี U/D) **แครช 5 ครั้ง** · ครั้งที่แครช = เปิดหน้า Visit รอบเดียวแล้วกดเมนู · ครั้งที่ไม่แครช = โหลดหน้า Visit ซ้ำก่อนกดเมนู (ทั้งก่อนและหลังล้าง localStorage / Cache Storage — ไม่เกี่ยวกับ cache: มีแค่ `i18nextLng` · ไม่มี service worker)
* ตอนเปิดหน้าที่ไม่แครช แอปเรียก GetUnderlyingDisease · GetMenstrualHistory · GetPatientEHR (null) · GetDrugResistantByHN · PatientSurgicalHistory ตอบ 200 ทั้งหมด (ยังไม่ได้จับ response ของรอบที่แครช)
* ยังไม่ได้ลองบน Dev-X
* ผลต่อ TC: `TC-SBH-3182-046` ขั้นเตรียม (บันทึก U/D ที่ประวัติทางการแพทย์) ทำไม่ได้
