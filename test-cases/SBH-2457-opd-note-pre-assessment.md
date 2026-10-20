# SBH-2457 — Form OPD note / Pre-assessment หลัง Restructure EHRbase — Test Coverage

- Requirement: https://linear.app/cortexcloud/issue/SBH-2457
- สร้างจาก Acceptance Criteria ของการ์ด (AC 1–16) ตาม skill `linear-testcase-writer`
- สถานะไฟล์นี้: **draft เก็บไว้ในโปรเจกต์ก่อน ยังไม่สร้างจริงใน Linear** — รอ **GATE 1 (QA review)** ตาม skill `qa-automate-readiness` ก่อนไปสำรวจแอปจริง
- รวม: **1 EXE, 1 Scenario, 18 Test Case** (17 Required, 1 Optional)
- TC granularity: **Flow-style** ตามที่ QA ยืนยัน (20 ต.ค. 2569) — 1 TC ต่อ 1 AC ไล่ กรอก → บันทึก → reload → ตรวจค่า ในฟอร์มเดียวกัน · ทางเลือกคู่ขนาน (Collapse / Expand ใน AC 16) แยกเป็นคนละ TC
- Run Type: `CT` (การ์ดผูก Cycle) · Scope/Version: `2.9.0` (จาก label `VERSION 2.9.0` ของการ์ด) · Environment: `DEV-X` (QA ยืนยัน)
- ข้อตกลงกับ QA (20 ต.ค. 2569):
  - **Fall risk** — ยึด BR 14 / AC 14: Pre-assessment ต้องไม่มี section Fall risk (ไม่ใช้บรรทัด "ใช้ `Fall risk screening general`" ในตาราง)
  - **Body chart** — ยึด AC 6: ใช้งานได้เหมือนเดิม ไม่ตรวจ Default collapsed
  - **Physical examination** — ตรวจแค่ AC 5 ไม่ตรวจขนาดช่อง
  - **Family history general** — ไม่มี AC จึงทำเป็น `[Optional]`
  - **Underlying disease** — ไม่เขียน TC ในการ์ดนี้ เทสที่ SBH-2413 (ยังไม่เทสรอบนี้) อ้างอิงไว้ว่า section นี้ใน OPD note / Pre-assessment ต้องทำงานเหมือนที่ SBH-2413 ระบุ
  - **BMI / BSA** — เทียบกับค่าจากระบบเดิม ถ้าไม่มีข้อมูลเดิม ให้ย้อนหาสูตรจากหน้าจอจริงแล้วทำ helper `helpers/functions/body-metrics.ts` ไว้เทียบ (งาน P1/P2 ถัดไปใน `TODO.md`)
  - Business rule นอก AC — ไม่มี ยึด AC
- ค่าที่ยังไม่รู้ใส่เป็น "รอยืนยัน" — จะเติมตอนสำรวจแอปจริง (GATE 2) ดูรายการที่ท้ายไฟล์ "Requirement gap"

---
### EXE

#### EXE - CT - 2.9.0

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: EMR — Form OPD note / Pre-assessment
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base
- Environment: DEV-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- OPD note: Chief complaint, Present illness, Body metrics (BMI/BSA), Vital sign (Pain score), Physical examination, Body chart, เอกสารแนบ, Diagnosis general (Onset date), ไม่มี Note to nurse (AC 1–9)
- Pre-assessment: การมาถึงและความช่วยเหลือ, การคัดกรองเพศหญิง, ประวัติแพ้, ประวัติการผ่าตัด / สุรา / บุหรี่, ไม่มี Fall risk, เอกสารแนบ (AC 10–15)
- Pre-assessment: Family history general (Optional — ไม่มี AC)
- Setting form: ค่า Default Expand / Collapse ของแต่ละ section (AC 16)
- ไม่รวม Underlying disease — เทสที่ SBH-2413

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- ไม่รวมงาน Low priority (Design Body metrics แบบเดิม, ปรับ Design การคัดกรองเพศหญิง) เพราะไม่อยู่ใน AC
- Underlying disease ใน OPD note / Pre-assessment ต้องทำงานเหมือนที่ระบุใน SBH-2413
```

### Scenario

#### TS-SBH-2457-HPY - ตรวจสอบการบันทึกและแสดงผล section ใน Form OPD note / Pre-assessment และค่า Default Expand/Collapse

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Suffix: HPY
- Module: EMR — Form OPD note / Pre-assessment
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

วัตถุประสงค์
- ยืนยันว่าหลัง Restructure EHRbase ฟอร์ม OPD note และ Pre-assessment มี section ครบตามที่กำหนด บันทึกแล้ว reload ข้อมูลยังอยู่ และ section ที่ต้องเอาออกไม่แสดง
- ยืนยันว่าค่า Default Expand / Collapse ที่ตั้งใน Setting form มีผลเมื่อเปิดฟอร์ม

ขอบเขต Requirement
- OPD note: AC 1–9
- Pre-assessment: AC 10–15 (+ Family history general แบบ Optional)
- Setting form: AC 16

ความเสี่ยง
- ฟอร์มเวชระเบียน OPD ถ้าบันทึกไม่ได้หรือข้อมูลหายหลัง reload กระทบการบันทึกจริงของแพทย์/พยาบาล
- BMI / BSA คำนวณผิด กระทบการคำนวณยาและการประเมินผู้ป่วย

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

##### Test Case ภายใต้ Scenario นี้

#### [Required] TC-SBH-2457-001 - ตรวจสอบการเลือก CC suggestion ใน Chief complaint ของ OPD note แล้วบันทึกได้

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-001
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด OPD note ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- CC suggestion: รายการแรกที่ระบบแสดง (ชื่อรายการ: รอยืนยันตอนสำรวจแอป)

Test Steps
1. ไปที่ section Chief complaint
2. ดูรายการ CC suggestion ที่ระบบแสดง
3. เลือก CC suggestion 1 รายการ
4. กด "บันทึก"
5. reload หน้า แล้วเปิด OPD Note เดิม

Expected Result
- section Chief complaint แสดงรายการ CC suggestion ให้เลือก
- เลือกแล้วข้อความของรายการนั้นเข้ามาอยู่ใน Chief complaint
- หลัง reload Chief complaint ยังเป็นค่าที่เลือกไว้

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 1 · ยังไม่รู้ว่า CC suggestion มาจากไหน (ดู Requirement gap)
```

#### [Required] TC-SBH-2457-002 - ทดสอบบันทึก Present illness ใน OPD note แล้วข้อมูลยังอยู่หลัง reload

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-002
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด OPD note ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- Present illness: "QA-SBH2457 present illness"

Test Steps
1. กรอก Present illness ตาม Test Data
2. กด "บันทึก"
3. reload หน้า แล้วเปิด OPD Note เดิม

Expected Result
- กด "บันทึก" สำเร็จ ไม่มีข้อความ error
- หลัง reload Present illness แสดงข้อความ "QA-SBH2457 present illness" ครบ

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 2
```

#### [Required] TC-SBH-2457-003 - คำนวณ BMI และ BSA จากน้ำหนักและส่วนสูงใน Body metrics ของ OPD note ถูกต้อง

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-003
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด OPD note ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"
4. มีค่า BMI / BSA อ้างอิงของน้ำหนัก/ส่วนสูงชุดเดียวกัน จากระบบเดิม หรือจาก helper `helpers/functions/body-metrics.ts` (รอยืนยันสูตร)

Test Data
- น้ำหนัก / ส่วนสูง: รอยืนยัน (เลือกตอนย้อนหาสูตร ให้มีทั้งค่าจำนวนเต็มและทศนิยม)
- BMI / BSA ที่คาดหวัง: รอยืนยันค่าจากระบบเดิม

Test Steps
1. ไปที่ section Body metrics
2. กรอกน้ำหนักและส่วนสูงตาม Test Data
3. ดูค่า BMI และ BSA ที่ระบบคำนวณ
4. กด "บันทึก"
5. reload หน้า แล้วเปิด OPD Note เดิม

Expected Result
- BMI ตรงกับค่าที่คาดหวัง (รอยืนยัน)
- BSA ตรงกับค่าที่คาดหวัง (รอยืนยัน)
- หลัง reload น้ำหนัก ส่วนสูง BMI และ BSA ยังเป็นค่าเดิม

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 3 · ถ้าค่าอ้างอิงมาจาก helper แทนระบบเดิม ผลนี้ยืนยันได้แค่ว่าตรงกับสูตรที่ย้อนหาได้ ไม่ได้ยืนยันว่าตรงกับระบบเดิมโดยตรง
```

#### [Required] TC-SBH-2457-004 - ทดสอบบันทึก Pain score ใน Vital sign ของ OPD note แล้วค่ายังอยู่หลัง reload

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-004
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด OPD note ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- Pain score: 3

Test Steps
1. ไปที่ section Vital sign
2. กรอก Pain score ตาม Test Data
3. กด "บันทึก"
4. reload หน้า แล้วเปิด OPD Note เดิม

Expected Result
- section Vital sign มีช่อง Pain score
- หลัง reload Pain score ยังเป็น 3

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 4 · ช่วงค่าที่รับได้ของ Pain score ไม่ได้ระบุในการ์ด
```

#### [Required] TC-SBH-2457-005 - ทดสอบพิมพ์ Free text พร้อมจัดรูปแบบด้วย Rich text ใน Physical examination แล้วรูปแบบยังอยู่หลังบันทึก

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-005
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด OPD note ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- ข้อความ: "QA-SBH2457 PE" (ตัวหนา) และ "normal" (ตัวเอียง)

Test Steps
1. ไปที่ section Physical examination
2. พิมพ์ข้อความตาม Test Data ในช่อง Free text
3. ใช้เครื่องมือ Rich text ทำ "QA-SBH2457 PE" เป็นตัวหนา และ "normal" เป็นตัวเอียง
4. กด "บันทึก"
5. reload หน้า แล้วเปิด OPD Note เดิม

Expected Result
- Physical examination มีช่อง Free text พร้อมแถบเครื่องมือ Rich text
- ข้อความแสดงเป็นตัวหนา / ตัวเอียงตามที่จัดไว้ก่อนบันทึก
- หลัง reload ข้อความและรูปแบบตัวหนา / ตัวเอียงยังอยู่ครบ

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 5 · ไม่ตรวจขนาดช่องตามที่ QA ยืนยัน · เครื่องมือ Rich text ที่มีจริงยังไม่ระบุในการ์ด ถ้าไม่มีตัวหนา/ตัวเอียง ให้ใช้รูปแบบที่มีแทนแล้วบันทึกไว้
```

#### [Required] TC-SBH-2457-006 - ตรวจสอบการใช้งาน Body chart ใน OPD note แล้วข้อมูลยังอยู่หลังบันทึก

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-006
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด OPD note ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- ตำแหน่ง / การ mark บน Body chart: รอยืนยันตอนสำรวจแอป

Test Steps
1. ไปที่ section Body chart
2. ใช้งาน Body chart ตาม Test Data
3. กด "บันทึก"
4. reload หน้า แล้วเปิด OPD Note เดิม

Expected Result
- Body chart ใช้งานได้เหมือนเดิม (พฤติกรรมเดิม: รอยืนยัน)
- หลัง reload สิ่งที่ทำไว้บน Body chart ยังอยู่

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 6 · ไม่ตรวจ Default collapsed ตามที่ QA ยืนยัน
```

#### [Required] TC-SBH-2457-007 - ทดสอบแนบเอกสารใน OPD note แล้วไฟล์ยังอยู่หลัง reload

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-007
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด OPD note ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- ไฟล์ทดสอบ: ชนิด/ขนาดที่รองรับ รอยืนยัน

Test Steps
1. ไปที่ section เอกสารแนบ
2. แนบไฟล์ตาม Test Data
3. กด "บันทึก"
4. reload หน้า แล้วเปิด OPD Note เดิม

Expected Result
- แนบไฟล์ได้ตามรูปแบบเดิมของ SBH
- หลัง reload ไฟล์ที่แนบยังแสดงอยู่

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 7
```

#### [Required] TC-SBH-2457-008 - ทดสอบบันทึก Onset date ใน Diagnosis general ของ OPD note แล้ววันที่ยังอยู่หลัง reload

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-008
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด OPD note ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- Diagnosis: รอยืนยัน (รหัสที่ค้นเจอบน DEV-X)
- Onset date: วันที่ก่อนวันเปิด visit (ค่าจริง: รอยืนยัน)

Test Steps
1. ไปที่ section Diagnosis
2. ค้นหาและเลือก Diagnosis ตาม Test Data
3. กรอก Onset date ตาม Test Data
4. กด "บันทึก"
5. reload หน้า แล้วเปิด OPD Note เดิม

Expected Result
- Diagnosis general มีช่อง Onset date
- หลัง reload Diagnosis และ Onset date ยังเป็นค่าที่บันทึกไว้

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 8
```

#### [Required] TC-SBH-2457-009 - ตรวจสอบว่า Form OPD note ไม่แสดง section Note to nurse

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-009
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด OPD note ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD

Test Data
- -

Test Steps
1. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"
2. เลื่อนดูทุก section ของฟอร์มจนสุด (กาง section ที่พับอยู่ทั้งหมด)

Expected Result
- ไม่มี section "Note to nurse" ในฟอร์ม OPD note

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 9 · Note to nurse ย้ายไปอยู่ใน Section Order — ไม่อยู่ในขอบเขตการ์ดนี้
```

#### [Required] TC-SBH-2457-010 - ทดสอบบันทึก section การมาถึงและความช่วยเหลือใน Pre-assessment แล้วข้อมูลยังอยู่หลัง reload

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-010
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด Pre-assessment ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดฟอร์ม Pre-assessment ของ visit นั้น (เมนู/ชื่อ tab บนหน้าจอ: รอยืนยัน)

Test Data
- ค่าที่เลือก/กรอกใน section: รอยืนยันตอนสำรวจแอป (field ตาม SBH เดิม)

Test Steps
1. ไปที่ section การมาถึงและความช่วยเหลือ
2. กรอก/เลือกค่าตาม Test Data
3. กด "บันทึก"
4. reload หน้า แล้วเปิดฟอร์ม Pre-assessment เดิม

Expected Result
- ฟอร์ม Pre-assessment มี section การมาถึงและความช่วยเหลือ
- หลัง reload ค่าที่กรอก/เลือกไว้ยังอยู่ครบ

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 10
```

#### [Required] TC-SBH-2457-011 - ทดสอบบันทึก section การคัดกรองเพศหญิงใน Pre-assessment แล้วข้อมูลยังอยู่หลัง reload

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-011
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด Pre-assessment ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD (เพศของผู้ป่วย: รอยืนยัน — ดู Requirement gap)
3. เปิดฟอร์ม Pre-assessment ของ visit นั้น (เมนู/ชื่อ tab บนหน้าจอ: รอยืนยัน)

Test Data
- ค่าที่เลือก/กรอกใน section: รอยืนยันตอนสำรวจแอป (field ตาม SBH เดิม)

Test Steps
1. ไปที่ section การคัดกรองเพศหญิง
2. กรอก/เลือกค่าตาม Test Data
3. กด "บันทึก"
4. reload หน้า แล้วเปิดฟอร์ม Pre-assessment เดิม

Expected Result
- ฟอร์ม Pre-assessment มี section การคัดกรองเพศหญิง
- หลัง reload ค่าที่กรอก/เลือกไว้ยังอยู่ครบ

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 11 · ไม่ตรวจ Design แบบ Compact (Low priority ไม่อยู่ใน AC)
```

#### [Required] TC-SBH-2457-012 - ทดสอบบันทึกประวัติแพ้ใน Pre-assessment ตามที่ Cortex มีอยู่แล้วข้อมูลยังอยู่หลัง reload

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-012
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด Pre-assessment ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดฟอร์ม Pre-assessment ของ visit นั้น (เมนู/ชื่อ tab บนหน้าจอ: รอยืนยัน)

Test Data
- รายการแพ้ที่จะเพิ่ม: รอยืนยันตอนสำรวจแอป

Test Steps
1. ไปที่ section ประวัติแพ้
2. เพิ่มรายการแพ้ตาม Test Data
3. กด "บันทึก"
4. reload หน้า แล้วเปิดฟอร์ม Pre-assessment เดิม

Expected Result
- section ประวัติแพ้ทำงานตามที่ Cortex มีอยู่
- หลัง reload รายการแพ้ที่เพิ่มยังอยู่

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 12
```

#### [Required] TC-SBH-2457-013 - ทดสอบบันทึกประวัติการผ่าตัด สุรา และบุหรี่ใน Pre-assessment ตามรูปแบบ SBH แล้วข้อมูลยังอยู่หลัง reload

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-013
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด Pre-assessment ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดฟอร์ม Pre-assessment ของ visit นั้น (เมนู/ชื่อ tab บนหน้าจอ: รอยืนยัน)

Test Data
- ประวัติการผ่าตัด / สุรา / บุหรี่: รอยืนยันตอนสำรวจแอป (field ตาม SBH เดิม)

Test Steps
1. ไปที่ section ประวัติการผ่าตัด แล้วกรอกตาม Test Data
2. ไปที่ section สุรา แล้วกรอกตาม Test Data
3. ไปที่ section บุหรี่ แล้วกรอกตาม Test Data
4. กด "บันทึก"
5. reload หน้า แล้วเปิดฟอร์ม Pre-assessment เดิม

Expected Result
- หลัง reload ประวัติการผ่าตัดยังเป็นค่าที่บันทึกไว้
- หลัง reload ข้อมูลสุรายังเป็นค่าที่บันทึกไว้
- หลัง reload ข้อมูลบุหรี่ยังเป็นค่าที่บันทึกไว้

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 13 · สุรา / บุหรี่ มีแผนปรับใหม่ก่อน go-live (SBH-2419) — ถ้าเปลี่ยนต้องปรับ TC นี้และเทสซ้ำ
```

#### [Required] TC-SBH-2457-014 - ตรวจสอบว่า Form Pre-assessment ไม่แสดง section Fall risk

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-014
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด Pre-assessment ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD

Test Data
- -

Test Steps
1. เปิดฟอร์ม Pre-assessment ของ visit นั้น (เมนู/ชื่อ tab บนหน้าจอ: รอยืนยัน)
2. เลื่อนดูทุก section ของฟอร์มจนสุด (กาง section ที่พับอยู่ทั้งหมด)

Expected Result
- ไม่มี section "Fall risk" ในฟอร์ม Pre-assessment

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 14 · ยึด BR 14 / AC 14 ตามที่ QA ยืนยัน (ตารางในการ์ดเขียนว่าใช้ `Fall risk screening general` ซึ่งขัดกับ AC)
```

#### [Required] TC-SBH-2457-015 - ทดสอบแนบเอกสารใน Pre-assessment แล้วไฟล์ยังอยู่หลัง reload

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-015
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด Pre-assessment ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดฟอร์ม Pre-assessment ของ visit นั้น (เมนู/ชื่อ tab บนหน้าจอ: รอยืนยัน)

Test Data
- ไฟล์ทดสอบ: ชนิด/ขนาดที่รองรับ รอยืนยัน

Test Steps
1. ไปที่ section เอกสารแนบ
2. แนบไฟล์ตาม Test Data
3. กด "บันทึก"
4. reload หน้า แล้วเปิดฟอร์ม Pre-assessment เดิม

Expected Result
- แนบไฟล์ได้ตามรูปแบบเดิมของ SBH
- หลัง reload ไฟล์ที่แนบยังแสดงอยู่

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 15
```

#### [Optional] TC-SBH-2457-016 - ทดสอบบันทึก Family history general ใน Pre-assessment แล้วข้อมูลยังอยู่หลัง reload

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-016
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เปิด Pre-assessment ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. เปิดฟอร์ม Pre-assessment ของ visit นั้น (เมนู/ชื่อ tab บนหน้าจอ: รอยืนยัน)

Test Data
- ประวัติครอบครัวที่จะเพิ่ม: รอยืนยันตอนสำรวจแอป

Test Steps
1. ไปที่ section ประวัติครอบครัว
2. กรอก/เพิ่มรายการตาม Test Data
3. กด "บันทึก"
4. reload หน้า แล้วเปิดฟอร์ม Pre-assessment เดิม

Expected Result
- section ประวัติครอบครัวใช้ `Family history general`
- หลัง reload ข้อมูลประวัติครอบครัวยังอยู่

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- ไม่มี AC รองรับ (อยู่ในตาราง Requirement เท่านั้น) — QA ยืนยันให้เป็น Optional ถ้าไม่ผ่านไม่ถือว่าการ์ดนี้ไม่ผ่าน
```

#### [Required] TC-SBH-2457-017 - ตรวจสอบว่า section ที่ตั้ง Default เป็น Collapse ใน Setting form แสดงแบบพับเมื่อเปิดฟอร์ม

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-017
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เข้าหน้า Setting form ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. รู้ตำแหน่งหน้า Setting form ที่ตั้งค่า Expand/Collapse (URL/เมนู: รอยืนยัน)

Test Data
- ฟอร์ม: OPD note · section: รอยืนยัน (เลือก section ที่ตอนนี้เป็น Expand) · ค่า: Collapse

Test Steps
1. เปิดหน้า Setting form ของ OPD note
2. ตั้ง section ตาม Test Data เป็น Collapse แล้วบันทึกการตั้งค่า
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note" ใหม่
4. ดูสถานะของ section ที่ตั้งค่าไว้
5. คืนค่า setting เดิมหลังทดสอบเสร็จ

Expected Result
- บันทึกการตั้งค่าใน Setting form สำเร็จ
- เมื่อเปิดฟอร์มใหม่ section นั้นแสดงแบบพับ (Collapse)

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 16 · Setting form กระทบทุกคนที่ใช้ฟอร์มนี้บน DEV-X ต้องคืนค่าเดิมเสมอ
```

#### [Required] TC-SBH-2457-018 - ตรวจสอบว่า section ที่ตั้ง Default เป็น Expand ใน Setting form แสดงแบบกางเมื่อเปิดฟอร์ม

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-018
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วยผู้ใช้ที่เข้าหน้า Setting form ได้ (role: รอยืนยัน)
2. มีผู้ป่วยทดสอบที่ QA สร้างเองและมี visit OPD
3. รู้ตำแหน่งหน้า Setting form ที่ตั้งค่า Expand/Collapse (URL/เมนู: รอยืนยัน)

Test Data
- ฟอร์ม: OPD note · section: รอยืนยัน (เลือก section ที่ตอนนี้เป็น Collapse) · ค่า: Expand

Test Steps
1. เปิดหน้า Setting form ของ OPD note
2. ตั้ง section ตาม Test Data เป็น Expand แล้วบันทึกการตั้งค่า
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note" ใหม่
4. ดูสถานะของ section ที่ตั้งค่าไว้
5. คืนค่า setting เดิมหลังทดสอบเสร็จ

Expected Result
- บันทึกการตั้งค่าใน Setting form สำเร็จ
- เมื่อเปิดฟอร์มใหม่ section นั้นแสดงแบบกาง (Expand)

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 16 (กรณีกลับกัน) · Setting form กระทบทุกคนที่ใช้ฟอร์มนี้บน DEV-X ต้องคืนค่าเดิมเสมอ
```

---

## AC → Test Case

| AC | Test Case |
| -- | -- |
| 1 | TC-001 |
| 2 | TC-002 |
| 3 | TC-003 |
| 4 | TC-004 |
| 5 | TC-005 |
| 6 | TC-006 |
| 7 | TC-007 |
| 8 | TC-008 |
| 9 | TC-009 |
| 10 | TC-010 |
| 11 | TC-011 |
| 12 | TC-012 |
| 13 | TC-013 |
| 14 | TC-014 |
| 15 | TC-015 |
| 16 | TC-017, TC-018 |
| (ไม่มี AC) Family history general | TC-016 [Optional] |
| (ไม่มี TC) Underlying disease | อ้างอิง SBH-2413 |

## Requirement gap (นอกลำดับชั้น)

**Expected behavior**
- AC 1: ไม่ระบุว่า CC suggestion มาจากไหน (template / ประวัติเดิม / master data)
- AC 2, 6, 7, 15: "เหมือนเดิม" / "รูปแบบเดิมของ SBH" ไม่ได้ระบุพฤติกรรมเดิมไว้ในการ์ด — ต้องยืนยันตอนสำรวจแอป
- AC 3: ยังไม่รู้สูตร BSA และการปัดทศนิยมของ BMI/BSA — รอเทียบระบบเดิม หรือย้อนหาจากหน้าจอจริง (TODO P1)
- AC 16: ไม่ระบุว่าหน้า Setting form อยู่ที่ไหน และตั้งค่าได้ต่อฟอร์ม หรือต่อทุกฟอร์ม
- ตาราง Requirement ขัดกับ AC เรื่อง Fall risk และ Body chart Default collapsed — ยึด AC ตามที่ QA ยืนยัน

**Validation**
- AC 4: ไม่ระบุช่วงค่า Pain score ที่รับได้
- AC 7, 15: ไม่ระบุชนิด/ขนาดไฟล์ที่แนบได้
- AC 8: ไม่ระบุว่า Onset date ต้องไม่เกินวันที่ปัจจุบันหรือไม่

**Error handling**
- -

**Permission / role**
- ไม่ระบุ role ที่ใช้เปิด OPD note, Pre-assessment และหน้า Setting form

**Edge cases**
- AC 11: ไม่ระบุว่า section การคัดกรองเพศหญิงแสดงเฉพาะผู้ป่วยหญิงหรือไม่
- AC 13: สุรา / บุหรี่ อาจเปลี่ยนก่อน go-live (SBH-2419)
