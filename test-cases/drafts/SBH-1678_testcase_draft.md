# Draft Test Structure — SBH-1678

> สถานะ: **สร้างใน Linear แล้ว (2026-10-29)** — ผู้ใช้สั่ง "สร้างได้" · ไม่เพิ่ม TC ของ Sub-Issue นอก AC · RTS แสดงจำนวนเต็มตามรูปในการ์ด
> - EXE SBH-3273 → HPY SBH-3276 (TC 001–027 = SBH-3281–3283, 3285–3308) · UHP SBH-3278 (028–032 = SBH-3309–3313) · EDG SBH-3279 (033–037 = SBH-3314–3318) · ERR SBH-3280 (038–039 = SBH-3319–3320)
> - ⚠️ ช่อง "สร้างโดย" เป็น Neranchara Kaewsiri (บัญชีของ Linear MCP) · ผู้รับผิดชอบเป็น Suchat · milestone ER - เก็บตก, edge case
> - ค่าที่ใช้: Run Type CT (การ์ดผูก Cycle) · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Triage Form
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - scope ตาม AC ของการ์ดแม่ + validation ปุ่มบันทึก (In Scope) ที่ Sub-Issue SBH-3186 ข้อ 1 ระบุ Expected ไว้ · ตัวเลือก Fast Track ตาม SBH-3187

Requirement: SBH-1678 — [ ER ] [ Triage ] Truama-Form
URL: https://linear.app/cortexcloud/issue/SBH-1678/er-triage-truama-form
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: Urgent · State: Ready for Testing
Labels: 🍄 New Feature, Natthaphat ( MOD ) 🙈, VERSION 2.10.0 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Sub-Issue (การ์ด dev ทั้งหมด Done on dev-x): SBH-3186 (บล็อกบันทึกไม่มี ESI / โซน · คงโซนตอนคัดกรองซ้ำ · warning ร่างค้าง) · SBH-3187 (ตัวเลือก Fast Track ตาม AC) · SBH-3188 (ย้ายการ์ดสัตว์กัด / งูกัด) · SBH-3189 (Dashboard คอลัมน์ "คัดกรอง" → "Triage") · SBH-2968 (preset slot) · CTXN-8886 (Design) — ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี
Relations: related SBH-1567 (GCS) · SBH-1404 (MEWS) · SBH-2058 (Trauma Exam Form) · SBH-2173 · SBH-3182 · SBH-1813 · SBH-1805
Scope / Version = 2.10.0 (label VERSION 2.10.0 ของการ์ด)

## AC → TC

| AC | เรื่อง | TC |
|---|---|---|
| 1 | Suspect Fast Track Type 5 ตัวเลือก ค่าเริ่มต้น Not Suspect | 001 |
| 1 | ประเภทฉุกเฉิน Non-Trauma / Trauma ค่าเริ่มต้น Non-Trauma | 002 |
| 1 | เลือก Fast Track อื่น → trigger BR-01 | ไม่มี TC — การ์ดไม่ได้นิยาม BR-01 (requirement gap) |
| 2 | วิธีการมาถึง Walk-in / EMS / Refer ค่าเริ่มต้น Walk-in | 003 · 030 |
| 2 | ผู้นำส่ง 6 ตัวเลือก placeholder "เลือกผู้นำส่ง" · AUTO = 3 เมื่อเลือก EMS | 004 · 006 |
| 2 | ระดับความเร่งด่วน EMS แสดงเมื่อเลือก EMS · ค่าเริ่มต้น ไม่ระบุ | 005 · 030 · 031 |
| 2 | ข้อมูลก่อนถึงโรงพยาบาล แสดงเมื่อเลือก EMS หรือ Refer | 007 · 008 · 030 |
| 2 | ชื่อผู้นำส่ง / หน่วยงาน (Free text) + บันทึกข้อมูล ER Arrival | 009 |
| 3 | การดูแลระหว่างนำส่ง แสดงเมื่อ Trauma เริ่มแบบย่อ · 5 ช่อง code set เดียวกัน ค่าเริ่มต้นว่าง | 010 · 011 · 012 · 028 |
| 4–7 | Vital signs / Body Metrics / Chief Complaint / Present Illness เงื่อนไขเดิม | 013 |
| 8 | เพิ่ม Underlying disease (ลอก OPD) | 014 |
| 9.1 | GCS ใช้สูตรเดิม (SBH-1567) | 015 |
| 9.2 | MEWS ไม่แสดง Vital sign · AVPU ค่าเริ่มต้นจาก GCS · สูตรเดิม (SBH-1404) | 016 · 017 · 018 · 019 |
| 9.3 | ประเภท Trauma → แสดง RTS · Complete / Incomplete | 020 · 021 · 022 · 023 · 029 |
| 9.3 | สูตร RTS + คะแนนแปลงค่า GCS / SBP / RR · แสดงเป็นจำนวนเต็มตามรูปในการ์ด | 023 · 033–037 |
| 9.3 | สีตามคะแนน RTS | ไม่มี TC — การ์ดเว้นว่างไว้ (requirement gap) |
| 9.4 | ชื่อโซนใหม่ Resuscitation / Urgency / Isolation 1 / Isolation 2 / Observation | 024 |
| 9.4 | Dashboard แสดง Zone Isolate · Patient banner มีเลข 1 / 2 | 025 · 026 · 027 |
| Out Scope | Trauma Detail ตัดทิ้ง | 032 |
| In Scope (ปุ่มบันทึก + validation) | บันทึกไม่ได้ถ้ายังไม่เลือกระดับ Triage / โซน (SBH-3186 ข้อ 1) | 038 · 039 |

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- user: **พยาบาล ER** (การ์ดระบุว่าพยาบาลเป็นผู้ประเมิน)
- **ผู้ป่วยรอคัดกรอง**: เปิด Visit ER แล้วยังไม่คัดกรอง — TC ที่ดูหน้าจออย่างเดียว (001–008, 010, 011, 015–018, 020–022, 024, 028–037) ใช้ผู้ป่วยรายเดียวกันได้โดยไม่กดบันทึก
- **ผู้ป่วยใหม่สำหรับ TC ที่กดบันทึก**: 009 · 012 · 013 · 014 · 019 · 023 · 025 · 026 · 027 (ใช้รายเดียวกันได้ถ้าเป็นการบันทึกครั้งเดียว เช่น 009 + 012 + 013 + 014 บันทึกพร้อมกัน)
- ผู้ป่วย Isolation 1 / Isolation 2 อย่างละ 1 ราย สำหรับ 025–027

---

## EXE - CT - 2.10.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: 🍄 New Feature, Natthaphat ( MOD ) 🙈, VERSION 2.10.0, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Triage Form, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.10.0
- Module: ER / Triage Form
- Requirement ที่อ้างอิง: SBH-1678 — [ ER ] [ Triage ] Truama-Form
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- การจำแนกผู้ป่วย: Suspect Fast Track Type และประเภทฉุกเฉิน
- ER Arrival: วิธีการมาถึง · ระดับความเร่งด่วน EMS · ผู้นำส่ง · ข้อมูลก่อนถึงโรงพยาบาล
- การดูแลระหว่างนำส่ง (แสดงเมื่อ Trauma)
- Vital signs / Body Metrics / Chief Complaint / Present Illness ตามเดิม + โรคประจำตัว (Underlying disease)
- GCS · MEWS (AVPU จาก GCS) · RTS (แสดงเมื่อ Trauma + สูตรคำนวณ)
- ชื่อโซนใหม่ · Zone Isolate บน Dashboard · เลข Isolation บน Patient banner
- ปุ่มบันทึกต้องมีระดับ Triage และโซน
- Trauma Detail ถูกตัดออก

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1678-HPY - ประเมินคัดกรอง ER ด้วยฟอร์ม Trauma ครบทุกส่วนและบันทึกได้

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1678-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Triage Form
- Requirement ที่อ้างอิง: SBH-1678 — [ ER ] [ Triage ] Truama-Form

วัตถุประสงค์
- ยืนยันว่าพยาบาลประเมินผู้ป่วย Trauma / Non-Trauma ได้ครบ ตั้งแต่การจำแนกผู้ป่วย ER Arrival การดูแลระหว่างนำส่ง สัญญาณชีพ GCS MEWS RTS จนถึงเลือกระดับและโซน แล้วบันทึกได้
- ยืนยันชื่อโซนใหม่ทั้งในฟอร์ม Dashboard และ Patient banner

ขอบเขต Requirement
- AC 1 การจำแนกผู้ป่วย · AC 2 ER Arrival · AC 3 การดูแลระหว่างนำส่ง
- AC 4–8 Vital signs / Body Metrics / Chief Complaint / Present Illness / Underlying disease
- AC 9.1 GCS · 9.2 MEWS · 9.3 RTS · 9.4 Zone

ความเสี่ยง
- ค่าอัตโนมัติ (ผู้นำส่ง = EMS ขึ้นทะเบียน, AVPU จาก GCS) ไม่ถูกตั้ง → ข้อมูล PHER+ ผิด
- คะแนน RTS คำนวณผิด → ประเมินความรุนแรงผู้ป่วย Trauma ผิด
- ข้อมูล ER Arrival / การดูแลระหว่างนำส่ง ไม่ถูกบันทึกหลังกดบันทึก

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1678-001 - ตรวจสอบตัวเลือกและค่าเริ่มต้นของ Suspect Fast Track Type

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-1678-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
3. ดูค่าในช่อง Suspect Fast Track Type แล้วกดเปิด dropdown

## Expected Result
ช่อง Suspect Fast Track Type มีเครื่องหมาย * และค่าเริ่มต้นเป็น Not Suspect Fast Track
dropdown มี 5 ตัวเลือก: Not Suspect Fast Track · Stroke Fast Track · STEMI / ACS Fast Track · Sepsis Fast Track · Trauma Fast Track

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-002 - ตรวจสอบตัวเลือกและค่าเริ่มต้นของประเภทฉุกเฉิน

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1678-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ดูช่องประเภทฉุกเฉินในส่วนการจำแนกผู้ป่วย

## Expected Result
ช่องประเภทฉุกเฉินมีเครื่องหมาย * เป็นปุ่มแบบ segmented 2 ตัวเลือก: Non-Trauma · Trauma
ค่าเริ่มต้นเป็น Non-Trauma

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-003 - ตรวจสอบตัวเลือกและค่าเริ่มต้นของวิธีการมาถึง

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1678-003
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ดูช่องวิธีการมาถึงในส่วน ER Arrival

## Expected Result
วิธีการมาถึงเป็นปุ่มแบบ segmented 3 ตัวเลือก: Walk-in · EMS · Refer
ค่าเริ่มต้นเป็น Walk-in

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-004 - ตรวจสอบตัวเลือกและค่าเริ่มต้นของผู้นำส่ง

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1678-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ในส่วน ER Arrival (วิธีการมาถึง = Walk-in) ดูช่องผู้นำส่ง แล้วกดเปิด dropdown

## Expected Result
ช่องผู้นำส่งว่าง แสดง placeholder "เลือกผู้นำส่ง"
dropdown มี 6 ตัวเลือก: ไม่มีผู้นำส่ง/มาเอง · ตำรวจ/ทหาร · EMS ขึ้นทะเบียน · องค์กรไม่ขึ้นทะเบียน (มูลนิธิ/อาสา) · ญาติ/ผู้พบเห็น/อื่นๆ · ไม่ทราบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-005 - แสดงระดับความเร่งด่วน EMS เมื่อเลือกวิธีการมาถึงเป็น EMS

Status: Not Run · Priority: High · Labels: เหมือน TC-001 แต่ QA Type : Functional

```
TC ID: TC-SBH-1678-005
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ในส่วน ER Arrival เลือกวิธีการมาถึง = EMS
3. ดูช่องระดับความเร่งด่วน EMS

## Expected Result
แสดงช่องระดับความเร่งด่วน EMS เป็นปุ่มแบบ segmented 5 ตัวเลือก: ไม่ระบุ · ALS · BLS · ILS · FR
ค่าเริ่มต้นเป็น ไม่ระบุ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-006 - ตั้งค่าผู้นำส่งเป็น EMS ขึ้นทะเบียนอัตโนมัติเมื่อเลือก EMS

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ในส่วน ER Arrival ตรวจว่าช่องผู้นำส่งยังว่าง
3. เลือกวิธีการมาถึง = EMS
4. ดูช่องผู้นำส่ง

## Expected Result
ช่องผู้นำส่งเปลี่ยนเป็น "EMS ขึ้นทะเบียน" เองโดยไม่ต้องเลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-007 - แสดงช่องข้อมูลก่อนถึงโรงพยาบาลเมื่อเลือกวิธีการมาถึงเป็น EMS

Status: Not Run · Priority: Medium · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ในส่วน ER Arrival เลือกวิธีการมาถึง = EMS
3. ดูช่องข้อมูลก่อนถึงโรงพยาบาล

## Expected Result
แสดงช่องข้อมูลก่อนถึงโรงพยาบาล (กล่องข้อความ 2 บรรทัด) ว่าง
placeholder "รายละเอียด EMS/ส่งต่อ สัญญาณชีพระหว่างนำส่ง, โรงพยาบาลต้นทาง"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-008 - แสดงช่องข้อมูลก่อนถึงโรงพยาบาลเมื่อเลือกวิธีการมาถึงเป็น Refer

Status: Not Run · Priority: Medium · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-008
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ในส่วน ER Arrival เลือกวิธีการมาถึง = Refer
3. ดูช่องข้อมูลก่อนถึงโรงพยาบาล

## Expected Result
แสดงช่องข้อมูลก่อนถึงโรงพยาบาล (กล่องข้อความ 2 บรรทัด) พร้อม placeholder "รายละเอียด EMS/ส่งต่อ สัญญาณชีพระหว่างนำส่ง, โรงพยาบาลต้นทาง"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-009 - บันทึกข้อมูล ER Arrival แบบ EMS แล้วค่าที่บันทึกแสดงครบ

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-009
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรองรายใหม่ > แท็บ คัดกรอง ER
2. ส่วน ER Arrival: วิธีการมาถึง = EMS · ระดับความเร่งด่วน EMS = ALS · ผู้นำส่ง = EMS ขึ้นทะเบียน (ค่าอัตโนมัติ)
3. ชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ = "หน่วยกู้ภัยทดสอบ" · ข้อมูลก่อนถึงโรงพยาบาล = "BP 110/70 ระหว่างนำส่ง"
4. กรอกช่องบังคับที่เหลือ เลือกระดับความเร่งด่วนและโซน แล้วกดบันทึกคัดกรอง
5. เปิดดูผลคัดกรองที่บันทึก

## Expected Result
บันทึกคัดกรองสำเร็จ
ข้อมูล ER Arrival ที่บันทึกแสดงตรงกับที่กรอก: EMS · ALS · EMS ขึ้นทะเบียน · หน่วยกู้ภัยทดสอบ · BP 110/70 ระหว่างนำส่ง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-010 - แสดงส่วนการดูแลระหว่างนำส่งแบบย่อเมื่อเลือกประเภทฉุกเฉินเป็น Trauma

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-010
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. เลือกประเภทฉุกเฉิน = Trauma
3. ดูส่วน ER Arrival

## Expected Result
แสดงหัวข้อย่อย "การดูแลระหว่างนำส่ง" ในส่วน ER Arrival
เริ่มต้นแบบย่อ (ยังไม่เห็นช่องข้างใน)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-011 - ตรวจสอบช่องและตัวเลือกในส่วนการดูแลระหว่างนำส่ง

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1678-011
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. เลือกประเภทฉุกเฉิน = Trauma > กดขยาย "การดูแลระหว่างนำส่ง"
3. ดูช่องทั้งหมด แล้วกดเปิด dropdown ทีละช่อง

## Expected Result
มี 5 ช่อง dropdown: ดูแลการหายใจ · ห้ามเลือด · Splint/Slap C-Spine · Splint/Slap อื่นๆ · IV Fluid
ทุกช่องค่าเริ่มต้นว่าง
ทุกช่องมี 5 ตัวเลือกเหมือนกัน: ไม่มี · มี-เหมาะสม · มี-ไม่เหมาะสม · ไม่จำเป็น · ไม่ระบุ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-012 - บันทึกข้อมูลการดูแลระหว่างนำส่งแล้วค่าที่บันทึกแสดงครบ

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-012
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรองรายใหม่ > แท็บ คัดกรอง ER
2. เลือกประเภทฉุกเฉิน = Trauma > กดขยาย "การดูแลระหว่างนำส่ง"
3. เลือก ดูแลการหายใจ = มี-เหมาะสม · ห้ามเลือด = มี-ไม่เหมาะสม · Splint/Slap C-Spine = ไม่มี · Splint/Slap อื่นๆ = ไม่จำเป็น · IV Fluid = ไม่ระบุ
4. กรอกช่องบังคับที่เหลือ เลือกระดับความเร่งด่วนและโซน แล้วกดบันทึกคัดกรอง
5. เปิดดูผลคัดกรองที่บันทึก

## Expected Result
บันทึกคัดกรองสำเร็จ
ค่าการดูแลระหว่างนำส่งทั้ง 5 ช่องแสดงตรงกับที่เลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-013 - บันทึก Vital signs, Body Metrics, Chief Complaint และ Present Illness ได้ตามเดิม

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-013
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรองรายใหม่ > แท็บ คัดกรอง ER
2. กรอก Vital signs (SBP 120 · DBP 80 · PR 80 · RR 16 · Temp 37.0 · SpO2 98) · Body Metrics (น้ำหนัก 60 · ส่วนสูง 165)
3. เลือก Chief Complaint 1 รายการ · พิมพ์ Present Illness "ทดสอบ PI"
4. เลือกระดับความเร่งด่วนและโซน แล้วกดบันทึกคัดกรอง
5. เปิดดูผลคัดกรองที่บันทึก

## Expected Result
บันทึกคัดกรองสำเร็จ
Vital signs · Body Metrics · Chief Complaint · Present Illness แสดงตรงกับที่กรอก (ทำงานเหมือนฟอร์มคัดกรองเดิม)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-014 - บันทึกโรคประจำตัว (Underlying disease) ในฟอร์มคัดกรอง ER

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-014
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรองรายใหม่ > แท็บ คัดกรอง ER
2. ในส่วนโรคประจำตัว (Underlying disease) เพิ่มโรคประจำตัว 1 รายการ (เช่น ความดันโลหิตสูง)
3. กรอกช่องบังคับที่เหลือ เลือกระดับความเร่งด่วนและโซน แล้วกดบันทึกคัดกรอง
4. เปิดดูผลคัดกรองที่บันทึก

## Expected Result
ฟอร์มคัดกรอง ER มีส่วนโรคประจำตัวแบบเดียวกับ OPD
บันทึกสำเร็จ และโรคประจำตัวที่เพิ่มแสดงในผลคัดกรอง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-015 - คำนวณคะแนน GCS จาก Eye, Verbal และ Motor ตามสูตรเดิม

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-015
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ในการ์ด Glasgow Coma Scale (GCS) เลือก Eye Opening (E) = 4 · Verbal Response (V) = 5 · Motor Response (M) = 5
3. ดูกล่องผลรวม GCS

## Expected Result
กล่องผลรวมแสดง "E4 V5 M5 14 / 15" และระดับ "ระดับเล็กน้อย" (ตามรูปในการ์ด · สูตรเดิมจาก SBH-1567)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-016 - ตรวจสอบการ์ด MEWS ไม่แสดงช่อง Vital sign

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1678-016
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ดูการ์ด Modified Early Warning Score (MEWS) ฝั่งขวา

## Expected Result
การ์ด MEWS มีเฉพาะช่อง AVPU และแถบผลคะแนน
ไม่มีช่องกรอก Vital sign (SBP / PR / RR / Temp) ในการ์ด MEWS

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-017 - ตั้งค่า AVPU ของ MEWS จากคะแนน GCS อัตโนมัติ

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-017
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ดูช่อง AVPU ในการ์ด MEWS ก่อนเลือก GCS
3. เลือก GCS E4 V5 M6 (15 คะแนน)
4. ดูช่อง AVPU อีกครั้ง

## Expected Result
หลังเลือก GCS ช่อง AVPU ได้ค่าเริ่มต้นตามคะแนน GCS เองโดยไม่ต้องเลือก (สูตรเดิมจาก SBH-1404)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-018 - แสดง MEWS เป็น Incomplete พร้อมรายการที่ยังขาด

Status: Not Run · Priority: Medium · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-018
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ยังไม่กรอก Vital signs และยังไม่เลือก GCS
3. ดูแถบผลของการ์ด MEWS

## Expected Result
แถบผล MEWS แสดง "Incomplete - SBP, PR, RR, Temp, AVPU"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-019 - คำนวณคะแนน MEWS เมื่อกรอก Vital signs และ GCS ครบ

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-019
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. กรอก Vital signs: SBP 120 · PR 80 · RR 16 · Temp 37.0
3. เลือก GCS E4 V5 M6 (15 คะแนน)
4. ดูแถบผลของการ์ด MEWS

## Expected Result
แถบผล MEWS ไม่เป็น Incomplete แล้ว และแสดงคะแนน MEWS = 1 (RR 16 ได้ 1 คะแนน ค่าอื่น 0 ตามสูตรเดิม SBH-1404)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-020 - แสดงการ์ด Revised Trauma Score (RTS) เมื่อเลือกประเภทฉุกเฉินเป็น Trauma

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-020
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. เลือกประเภทฉุกเฉิน = Trauma
3. ดู score card ฝั่งขวา

## Expected Result
แสดงการ์ด Revised Trauma Score (RTS) มีช่อง GCS · Systolic BP · RR

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-021 - แสดง RTS เป็น Incomplete เมื่อยังไม่มี GCS, SBP และ RR

Status: Not Run · Priority: Medium · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-021
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. เลือกประเภทฉุกเฉิน = Trauma (ยังไม่กรอก Vital signs และยังไม่เลือก GCS)
3. ดูการ์ด RTS

## Expected Result
ช่อง GCS · Systolic BP · RR แสดง "-"
แถบผลแสดง "Incomplete - GCS, SBP, RR" (สีเทา)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-022 - แสดง RTS เป็น Incomplete พร้อมเฉพาะรายการที่ยังขาดเมื่อกรอกไม่ครบ

Status: Not Run · Priority: Medium · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-022
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. เลือกประเภทฉุกเฉิน = Trauma
3. เลือก GCS E4 V5 M6 (15 คะแนน) โดยยังไม่กรอก SBP และ RR
4. ดูการ์ด RTS

## Expected Result
ช่อง GCS แสดง 15 · Systolic BP และ RR แสดง "-"
แถบผลแสดง "Incomplete - SBP, RR"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-023 - คำนวณคะแนน RTS เมื่อกรอก GCS, SBP และ RR ครบ

Status: Not Run · Priority: High · Labels: เหมือน TC-005

```
TC ID: TC-SBH-1678-023
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. เลือกประเภทฉุกเฉิน = Trauma
3. เลือก GCS E4 V5 M6 (15) · กรอก SBP 120 · RR 20
4. ดูการ์ด RTS

## Expected Result
ช่อง GCS 15 · Systolic BP 120 · RR 20
แถบผลเป็น Complete แสดง "Revised Trauma Score - 8 Points" (สีเขียว · ตามรูปในการ์ด)
(GCS 15 = 4 · SBP 120 = 4 · RR 20 = 4 → 0.9368×4 + 0.7326×4 + 0.2908×4 = 7.8408 → แสดง 8)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-024 - ตรวจสอบชื่อโซนใหม่ในฟอร์มคัดกรอง ER

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1678-024
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. เลือกระดับความเร่งด่วน (Triage) แล้วดูตัวเลือกโซนทั้งหมด

## Expected Result
ตัวเลือกโซนแสดงชื่อใหม่: Resuscitation · Urgency · Isolation 1 · Isolation 2 · Observation
ไม่มีชื่อเดิม โซนแดง / โซนเหลือง / โซนเขียว / ห้องสังเกตอาการอาคาร ER

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-025 - แสดงผู้ป่วยโซน Isolation เป็น Zone Isolate บน ER Dashboard

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1678-025
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรองรายใหม่ > แท็บ คัดกรอง ER
2. กรอกช่องบังคับ เลือกระดับความเร่งด่วน และเลือกโซน = Isolation 2 แล้วกดบันทึกคัดกรอง
3. ไปหน้า ER Dashboard แล้วหาผู้ป่วยรายนี้

## Expected Result
ผู้ป่วยแสดงอยู่ในโซนชื่อ "Zone Isolate" บน ER Dashboard

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-026 - แสดงเลข 1 ที่ Patient banner ของผู้ป่วยโซน Isolation 1

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1678-026
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. คัดกรองผู้ป่วยรายใหม่โดยเลือกโซน = Isolation 1 แล้วกดบันทึก
3. ดู Patient banner ของผู้ป่วยรายนี้

## Expected Result
Patient banner แสดงโซน Isolation พร้อมเลขกำกับ 1

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-027 - แสดงเลข 2 ที่ Patient banner ของผู้ป่วยโซน Isolation 2

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1678-027
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. ใช้ผู้ป่วยโซน Isolation 2 จาก TC-025
3. ดู Patient banner ของผู้ป่วยรายนี้

## Expected Result
Patient banner แสดงโซน Isolation พร้อมเลขกำกับ 2

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-1678-UHP - ไม่แสดงส่วนที่ใช้เฉพาะ Trauma / EMS เมื่อไม่เข้าเงื่อนไข

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1678-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER / Triage Form
- Requirement ที่อ้างอิง: SBH-1678 — [ ER ] [ Triage ] Truama-Form

วัตถุประสงค์
- ยืนยันว่าช่องที่มีเงื่อนไข (การดูแลระหว่างนำส่ง · RTS · ระดับความเร่งด่วน EMS · ข้อมูลก่อนถึงโรงพยาบาล) ไม่แสดงเมื่อไม่เข้าเงื่อนไข
- ยืนยันว่าส่วน Trauma Detail ถูกตัดออกแล้ว

ขอบเขต Requirement
- AC 1 ประเภทฉุกเฉินควบคุมการแสดง RTS และการดูแลระหว่างนำส่ง (BR-02)
- AC 2 เงื่อนไข "เมื่อเลือก EMS" / "เมื่อเลือก EMS หรือ Refer"
- Out Scope: Trauma Detail ตัดทิ้ง

ความเสี่ยง
- ผู้ป่วย Non-Trauma เห็น RTS หรือการดูแลระหว่างนำส่ง → พยาบาลกรอกข้อมูลเกินและส่ง PHER+ ผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- เทคนิค: Decision Table — วิธีการมาถึง (Walk-in / EMS / Refer) × ช่องที่แสดง
```

### TC-SBH-1678-028 - ไม่แสดงส่วนการดูแลระหว่างนำส่งเมื่อประเภทฉุกเฉินเป็น Non-Trauma

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-1678-028
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ประเภทฉุกเฉิน = Non-Trauma (ค่าเริ่มต้น)
3. ดูส่วน ER Arrival

## Expected Result
ไม่มีหัวข้อ "การดูแลระหว่างนำส่ง" ในส่วน ER Arrival

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-029 - ไม่แสดงการ์ด RTS เมื่อประเภทฉุกเฉินเป็น Non-Trauma

Status: Not Run · Priority: High · Labels: เหมือน TC-028

```
TC ID: TC-SBH-1678-029
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ประเภทฉุกเฉิน = Non-Trauma (ค่าเริ่มต้น)
3. ดู score card ฝั่งขวา

## Expected Result
ไม่มีการ์ด Revised Trauma Score (RTS) · มีเฉพาะ GCS และ MEWS

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-030 - ไม่แสดงระดับความเร่งด่วน EMS และข้อมูลก่อนถึงโรงพยาบาลเมื่อมาแบบ Walk-in

Status: Not Run · Priority: Medium · Labels: เหมือน TC-028

```
TC ID: TC-SBH-1678-030
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ส่วน ER Arrival วิธีการมาถึง = Walk-in (ค่าเริ่มต้น)
3. ดูช่องในส่วน ER Arrival

## Expected Result
ไม่มีช่องระดับความเร่งด่วน EMS และไม่มีช่องข้อมูลก่อนถึงโรงพยาบาล
มีเฉพาะ วิธีการมาถึง · ผู้นำส่ง · ชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-031 - ไม่แสดงระดับความเร่งด่วน EMS เมื่อวิธีการมาถึงเป็น Refer

Status: Not Run · Priority: Medium · Labels: เหมือน TC-028

```
TC ID: TC-SBH-1678-031
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. ส่วน ER Arrival เลือกวิธีการมาถึง = Refer
3. ดูช่องในส่วน ER Arrival

## Expected Result
ไม่มีช่องระดับความเร่งด่วน EMS

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-032 - ตรวจสอบฟอร์มคัดกรองไม่มีส่วน Trauma Detail

Status: Not Run · Priority: Medium · Labels: เหมือน TC-028 แต่ QA Type : UIUX

```
TC ID: TC-SBH-1678-032
Case Type: Unhappy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER
2. เลือกประเภทฉุกเฉิน = Trauma
3. เลื่อนดูฟอร์มทั้งซ้ายและขวา

## Expected Result
ไม่มีส่วน Trauma Detail ในฟอร์มคัดกรอง ER

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-1678-EDG - คำนวณ RTS ที่ค่าขอบของแต่ละช่วงคะแนน GCS / SBP / RR

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1678-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / Triage Form
- Requirement ที่อ้างอิง: SBH-1678 — [ ER ] [ Triage ] Truama-Form

วัตถุประสงค์
- ยืนยันว่าการแปลงค่า GCS / SBP / RR เป็นคะแนน 0–4 ถูกต้องทุกช่วง และคะแนน RTS ที่แสดงตรงกับสูตร

ขอบเขต Requirement
- AC 9.3.3 สูตร RTS = 0.9368×GCS + 0.7326×SBP + 0.2908×RR · แสดงเป็นจำนวนเต็มตามรูปในการ์ด (7.8408 → 8 Points · ผู้ใช้ยืนยัน 29 ต.ค. 2026)
- AC 9.3.4 ช่วงคะแนน GCS 13-15 / 9-12 / 6-8 / 4-5 / 3 · SBP >89 / 76-89 / 50-75 / 1-49 / 0 · RR 10-29 / >29 / 6-9 / 1-5 / 0

ความเสี่ยง
- เงื่อนไขขอบใช้ > กับ ≥ สลับกัน (เช่น SBP 89 / 90, RR 29 / 30) → คะแนนผิดไป 1 ระดับ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- เทคนิค: EP (ทุกช่วงคะแนน 0–4 อย่างน้อย 1 ครั้ง) + BVA (ใช้ค่าขอบของแต่ละช่วง)
```

### TC-SBH-1678-033 - คำนวณ RTS เมื่อ GCS, SBP และ RR อยู่ที่ขอบล่างของช่วง 4 คะแนน

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-1678-033
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER > ประเภทฉุกเฉิน = Trauma
2. เลือก GCS E4 V4 M5 (13) · กรอก SBP 90 · RR 10
3. ดูการ์ด RTS

## Expected Result
RTS Complete = 8 Points (GCS 13 = 4 · SBP 90 = 4 · RR 10 = 4 → 7.8408)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-034 - คำนวณ RTS เมื่อ GCS, SBP และ RR อยู่ที่ขอบของช่วง 3 คะแนน

Status: Not Run · Priority: High · Labels: เหมือน TC-033

```
TC ID: TC-SBH-1678-034
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER > ประเภทฉุกเฉิน = Trauma
2. เลือก GCS E3 V4 M5 (12) · กรอก SBP 89 · RR 30
3. ดูการ์ด RTS

## Expected Result
RTS Complete = 6 Points (GCS 12 = 3 · SBP 89 = 3 · RR 30 = 3 → 5.8806)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-035 - คำนวณ RTS เมื่อ GCS, SBP และ RR อยู่ที่ขอบล่างของช่วง 2 คะแนน

Status: Not Run · Priority: High · Labels: เหมือน TC-033

```
TC ID: TC-SBH-1678-035
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER > ประเภทฉุกเฉิน = Trauma
2. เลือก GCS E1 V1 M4 (6) · กรอก SBP 50 · RR 6
3. ดูการ์ด RTS

## Expected Result
RTS Complete = 4 Points (GCS 6 = 2 · SBP 50 = 2 · RR 6 = 2 → 3.9204)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-036 - คำนวณ RTS เมื่อ GCS, SBP และ RR อยู่ที่ขอบบนของช่วง 1 คะแนน

Status: Not Run · Priority: High · Labels: เหมือน TC-033

```
TC ID: TC-SBH-1678-036
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER > ประเภทฉุกเฉิน = Trauma
2. เลือก GCS E1 V1 M3 (5) · กรอก SBP 49 · RR 5
3. ดูการ์ด RTS

## Expected Result
RTS Complete = 2 Points (GCS 5 = 1 · SBP 49 = 1 · RR 5 = 1 → 1.9602)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-037 - คำนวณ RTS เมื่อ GCS, SBP และ RR อยู่ในช่วง 0 คะแนน

Status: Not Run · Priority: High · Labels: เหมือน TC-033

```
TC ID: TC-SBH-1678-037
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรอง > แท็บ คัดกรอง ER > ประเภทฉุกเฉิน = Trauma
2. เลือก GCS E1 V1 M1 (3) · กรอก SBP 0 · RR 0
3. ดูการ์ด RTS

## Expected Result
RTS Complete = 0 Points (GCS 3 = 0 · SBP 0 = 0 · RR 0 = 0)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-1678-ERR - บันทึกคัดกรองไม่ได้เมื่อยังไม่เลือกระดับ Triage หรือโซน

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Error

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1678-ERR
- Case Type: Error
- Suffix: ERR
- Module: ER / Triage Form
- Requirement ที่อ้างอิง: SBH-1678 — [ ER ] [ Triage ] Truama-Form

วัตถุประสงค์
- ยืนยันว่าปุ่มบันทึกคัดกรองตรวจระดับความเร่งด่วน (Triage 1–5) และโซนก่อนบันทึก

ขอบเขต Requirement
- In Scope: ระดับความเร่งด่วน (Triage 1–5) และโซน · ปุ่มบันทึก + validation
- Expected จาก Sub-Issue SBH-3186 ข้อ 1

ความเสี่ยง
- ผู้ป่วยถูกบันทึกโดยไม่มีระดับหรือโซน → ไม่ขึ้นโซนบน Dashboard / เรียงคิวผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1678-038 - ตรวจสอบบันทึกคัดกรองไม่ได้เมื่อยังไม่เลือกระดับความเร่งด่วน

Status: Not Run · Priority: Urgent · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Error + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-1678-038
Case Type: Error
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรองรายใหม่ > แท็บ คัดกรอง ER
2. กรอกช่องบังคับฝั่งซ้ายและ GCS ให้ครบ แต่ไม่เลือกระดับความเร่งด่วน (Triage 1–5)
3. กดบันทึกคัดกรอง

## Expected Result
บันทึกไม่สำเร็จ ระบบแจ้งให้เลือกระดับความเร่งด่วน
ผู้ป่วยยังไม่ถูกคัดกรอง (ไม่มีผลคัดกรองใหม่)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1678-039 - ตรวจสอบบันทึกคัดกรองไม่ได้เมื่อยังไม่เลือกโซน

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-038

```
TC ID: TC-SBH-1678-039
Case Type: Error
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วยรอคัดกรองรายใหม่ > แท็บ คัดกรอง ER
2. กรอกช่องบังคับฝั่งซ้ายและ GCS ให้ครบ เลือกระดับความเร่งด่วน แล้วเอาโซนที่ระบบเลือกให้ออก (ไม่มีโซน)
3. กดบันทึกคัดกรอง

## Expected Result
บันทึกไม่สำเร็จ ระบบแจ้งให้เลือกโซน
ผู้ป่วยยังไม่ถูกคัดกรอง (ไม่มีผลคัดกรองใหม่)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - BR-01 (เลือก Suspect Fast Track ที่ไม่ใช่ Not Suspect) ไม่ได้นิยามในการ์ด — เกิดอะไรขึ้น (แจ้งเตือน / ป้าย Fast Track บน Dashboard / ช่องเพิ่ม)
  - RTS ข้อความในการ์ดบอก "เจอทศนิยม → แสดงทศนิยมเลย" แต่รูปแสดง "8 Points" — **ผู้ใช้ตัดสินแล้ว (29 ต.ค. 2026) ให้แสดงตามรูปเป็นจำนวนเต็ม** · ค่าในร่างทุกข้อปัดได้เลขเดียวกันทั้งแบบปัดปกติและปัดขึ้น (7.8408 → 8 · 5.8806 → 6 · 3.9204 → 4 · 1.9602 → 2) จึงไม่ต้องรู้กฎการปัด
  - สีของ RTS ตามคะแนน — การ์ดเขียน "สี ตามคะแนน →" แล้วเว้นว่าง (รูปมีแค่ Incomplete เทา / Complete เขียว)
  - ตาราง GCS → AVPU ที่ใช้ตั้งค่าเริ่มต้น (การ์ดอ้าง SBH-1404 แต่ไม่ระบุช่วง) · ตัวเลือก "คำนวณ GCS" ในรูปคือค่าอะไร
  - Underlying disease "ลอก OPD" — ลอกแค่หน้าตาช่อง หรือดึงโรคประจำตัวที่บันทึกไว้ใน OPD มาแสดงด้วย
  - Allergy อยู่ใน In Scope แต่ไม่มีข้อ AC (ถือว่าเงื่อนไขเดิมหรือไม่)
  - ระดับ Triage 1–5 → โซนแนะนำของชื่อโซนใหม่ (Isolation 1 / 2 แนะนำเมื่อไร) · Resuscitation / Urgency / Observation บน Dashboard ใช้ชื่อใหม่ด้วยหรือไม่ · รูปแบบเลขบน Patient banner
- **Validation**
  - SBP 0 / RR 0 กรอกได้ในช่อง Vital signs หรือไม่ (TC-037 ต้องใช้ค่านี้ตามช่วงคะแนนในการ์ด)
  - ผู้นำส่ง / ชื่อผู้นำส่ง / ข้อมูลก่อนถึงโรงพยาบาล บังคับกรอกเมื่อเลือก EMS หรือ Refer หรือไม่ · ความยาวสูงสุดของช่องข้อความ
- **Error handling**
  - ข้อความแจ้งเตือนเมื่อบันทึกโดยไม่มีระดับ / โซน (SBH-3186 ไม่ระบุข้อความ)
- **Permission / role**
  - "Form นี้ พยาบาลเป็นผู้ประเมิน" — แพทย์เปิด / บันทึกฟอร์มนี้ได้หรือไม่
- **Edge cases**
  - เปลี่ยน Trauma → Non-Trauma หลังกรอกการดูแลระหว่างนำส่งแล้ว: ค่าถูกล้างหรือยังถูกบันทึก
  - เปลี่ยน EMS → Walk-in: ผู้นำส่งที่ตั้งเป็น EMS ขึ้นทะเบียน / ระดับ EMS / ข้อมูลก่อนถึงโรงพยาบาล ถูกล้างหรือไม่
  - คัดกรองซ้ำ: ค่า ER Arrival / การดูแลระหว่างนำส่ง ของรอบก่อนติดมาหรือไม่

## Sub-Issue ที่ไม่อยู่ใน AC ของการ์ดแม่ (ยังไม่ใส่ TC — รอผู้ใช้ตัดสิน)

- SBH-3186 ข้อ 2: คัดกรองซ้ำแล้วคงโซนเดิม (โซนแนะนำเป็นทางเลือก "ใช้โซนที่แนะนำ") · ข้อ 3: warning "ร่างล่าสุดยังไม่ถูกเก็บถาวร…" ไม่ค้างหลังบันทึกสำเร็จ
- SBH-3187: ข้อมูลเก่าที่เป็น HEAD TRAUMA / TRAUMA WITH SHOCK ยังแสดงได้ แต่เลือกใหม่ไม่ได้
- SBH-3188: Trauma + ติ๊กสัตว์กัด / งูกัด → การ์ดคัดกรองขึ้นต่อจากการจำแนกผู้ป่วย ก่อน ER Arrival · ยกเลิกติ๊กแล้วไม่เหลือช่องว่าง
- SBH-3189: ER Dashboard คอลัมน์ "คัดกรอง" เปลี่ยนชื่อเป็น "Triage"
- SBH-2968: preset slot / loading state (technical)
