# Draft Test Structure — SBH-2236

> สถานะ: **สร้างใน Linear แล้ว (2026-10-29)** — ผู้ใช้พิมพ์ "สร้างเลย"
> - EXE SBH-3321 (EXE - CT - 2.9.0) → HPY SBH-3322 (TC 001 = SBH-3324 · 002 = 3325 · 003 = 3326 · 008 = 3327) → EDG SBH-3323 (TC 004 = SBH-3328 · 005 = 3329 · 006 = 3330 · 007 = 3331)
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee Suchat ทุกใบ · milestone ER - เก็บตก, edge case · TC ใช้ label `QA : Manual` · "สร้างโดย" เป็น Neranchara (บัญชีของ connector)
> - ชุดนี้ = EXE 1 + Scenario 2 + TC 8 = 11 ใบ
> - ผู้ใช้ยืนยันแล้ว (29 ต.ค.): Env Dev-X / SBH Prod · QA Sub-module / Feature : Queue · Run Type CT (การ์ดผูก Cycle) · QA Module : ER · Active = Visit ER ที่ยังไม่ได้ปิดที่การเงิน (รวมรอจำหน่าย)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — assignee ต้องใส่ ID ของ Suchat (`ac7ed47a-b74d-4a54-992f-5d09acad47f2`)

Requirement: SBH-2236 — [ER] [ Patient list ] ผู้ป่วยรายชื่อหายไปหลัง เที่ยงคืน
URL: https://linear.app/cortexcloud/issue/SBH-2236
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: Ready for Testing
Labels: VERSION 2.9.0 · 🍄 Improvement · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Sub-Issue: ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี
PR ที่แนบ: cortex-api #2775 "[V2.9.0][BUG][SBH-2236] preserve active er visits during automatic closure"
Relations: เกี่ยวข้อง SBH-2396 (สเปกวงจรสถานะ / คิวข้ามวันของรายการผู้ป่วย ER) · Block การ์ด Refactor ER 4 ใบ (SBH-2669 / 2688 / 2690 / 2696)
Scope / Version = 2.9.0 (label VERSION 2.9.0 ของการ์ด)

AC ของการ์ด (คัดตามต้นฉบับ)
1. แยก ER ออกจาก OPD เพื่อไม่ให้ Patient list หายหลัง Task 4 ทุ่ม [ ปิด Visit Auto ]
2. ปรับเงื่อนไขหลังบ้าน ไม่ให้รายชื่อผู้ป่วยหายหลังเที่ยงคืน

## AC → TC

| AC | Expected | TC |
|---|---|---|
| 1 | ผู้ป่วย ER ที่ยังรักษาอยู่ไม่หายจากรายการ และ Visit ไม่ถูกปิดหลัง Task 22:00 | 001 · 002 |
| 1 (แยกจาก OPD) | Visit OPD ยังถูกปิดอัตโนมัติตามเดิม | 003 |
| 1 (Active = ยังไม่ปิดที่การเงิน) | ผู้ป่วยที่จำหน่ายออกจาก ER แล้วแต่ Visit ยังเปิด ไม่ถูก Task ปิด | 008 |
| 2 | ผู้ป่วย ER ที่มาถึงก่อนเที่ยงคืนยังแสดงหลังเที่ยงคืน ทั้งมุมมองรายการและบอร์ด | 004 · 005 |
| 2 (สถานะอื่นในคิวปัจจุบัน) | ผู้ป่วยรอเตียง / รอจำหน่ายไม่หายหลังเที่ยงคืน | 006 · 007 |

> เทคนิค: เที่ยงคืน และเวลา Task 22:00 เป็นค่าขอบของวัน (เช็กลิสต์วันที่ / เวลา) · Visit OPD กับ Visit ER เป็น 2 กลุ่มที่ Task ต้องทำต่างกัน (EP)

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

เตรียมทั้งหมดในวัน D **ก่อน 22:00** แล้วตรวจหลัง 22:00 (TC 001–003 · 008) และหลังเที่ยงคืน = วัน D+1 (TC 004–007)

- **ผู้ป่วย A (ER — ผู้ป่วยปัจจุบันใน ER)**: เปิด Visit ER → คัดกรอง · ไม่ลงนาม Disposition · ไม่จำหน่าย · ไม่ปิด Visit → TC 001 · 002 · 004 · 005
- **ผู้ป่วย B (OPD)**: เปิด Visit OPD · ไม่ปิด Visit → TC 003
- **ผู้ป่วย C (ER — ผู้ป่วยรอเตียง)**: เปิด Visit ER → คัดกรอง → ส่ง Admit Request (ยังไม่ได้เตียง) → TC 006
- **ผู้ป่วย D (ER — รอจำหน่าย)**: เปิด Visit ER → คัดกรอง → ER Physician Note (มี Diagnosis) → Disposition แบบไม่ Admit แล้วลงนาม · ยังไม่กดจำหน่าย → TC 007
- **ผู้ป่วย E (ER — จำหน่ายออกจาก ER แล้ว Visit ยังเปิด)**: เปิด Visit ER → คัดกรอง → ER Physician Note (มี Diagnosis) → Disposition แบบไม่ Admit แล้วลงนาม → กดจำหน่าย · ไม่ปิด Visit ที่การเงิน → TC 008
- user: แพทย์ ER (Physician Note / Disposition / Admit Request) · พยาบาล ER (ดูรายการ / บอร์ด) · user ที่ดูสถานะ Visit ได้ (การเงิน)

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: 🍄 Improvement, VERSION 2.9.0, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Queue, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: ER / Patient list
- Requirement ที่อ้างอิง: SBH-2236 — [ER] [ Patient list ] ผู้ป่วยรายชื่อหายไปหลัง เที่ยงคืน
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Task ปิด Visit อัตโนมัติ 22:00 ไม่ปิด Visit ER ที่ยังไม่ปิดที่การเงิน (รวมจำหน่ายออกจาก ER แล้ว) และยังปิด Visit OPD ตามเดิม
- รายชื่อผู้ป่วย ER ไม่หายหลังเที่ยงคืน ทั้งมุมมองรายการและบอร์ด

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2236-HPY - Task ปิด Visit อัตโนมัติ 22:00 ไม่ปิด Visit ER และยังปิด Visit OPD ตามเดิม

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2236-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Patient list
- Requirement ที่อ้างอิง: SBH-2236 — [ER] [ Patient list ] ผู้ป่วยรายชื่อหายไปหลัง เที่ยงคืน

วัตถุประสงค์
- ยืนยันว่าหลัง Task ปิด Visit อัตโนมัติเวลา 22:00 ผู้ป่วย ER ที่ยังรักษาอยู่ยังแสดงในรายการ และ Visit ER ที่ยังไม่ปิดที่การเงินยังเปิด (รวมผู้ป่วยที่จำหน่ายออกจาก ER แล้ว) ส่วน Visit OPD ยังถูกปิดตามเดิม

ขอบเขต Requirement
- AC 1: แยก ER ออกจาก OPD เพื่อไม่ให้ Patient list หายหลัง Task 4 ทุ่ม [ ปิด Visit Auto ]

ความเสี่ยง
- Task ปิด Visit ER ที่ยังรักษาอยู่ → ผู้ป่วยหายจากรายการทั้งที่ยังอยู่ใน ER
- Task ปิด Visit ของผู้ป่วยที่จำหน่ายออกจาก ER แล้ว ทั้งที่การเงินยังไม่ได้ปิด → ค้างงานการเงิน / ผู้ป่วยไปอยู่ เสร็จสิ้น ก่อนเวลา
- แก้แล้ว Task ข้าม Visit OPD ไปด้วย → Visit OPD ค้างไม่ถูกปิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- 001–002 ใช้ผู้ป่วย A · 003 ใช้ผู้ป่วย B · 008 ใช้ผู้ป่วย E · ตรวจหลัง 22:00 ของวัน D
```

### TC-SBH-2236-001 - ตรวจสอบผู้ป่วย ER ที่ยังรักษาอยู่ยังแสดงในแท็บผู้ป่วยปัจจุบันใน ER หลัง Task ปิด Visit อัตโนมัติ 22:00

Status: Not Run · Priority: Urgent · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2236-001
Case Type: Happy
Test Type: Functional

## Test Step
1. เตรียมผู้ป่วย A: เปิด Visit ER และคัดกรองในวัน D ก่อน 22:00 (ไม่จำหน่าย ไม่ปิด Visit)
2. รอให้ Task ปิด Visit อัตโนมัติ 22:00 ของวัน D ทำงาน
3. หลัง 22:00 (ก่อนเที่ยงคืน) Login ระบบด้วย user พยาบาล ER > ER Dashboard > มุมมองรายการ
4. ค้นหา HN ของผู้ป่วย A ในแท็บ ผู้ป่วยปัจจุบันใน ER

## Expected Result
ผู้ป่วย A แสดงในแท็บ ผู้ป่วยปัจจุบันใน ER
ไม่ไปอยู่แท็บ เสร็จสิ้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค BVA — เวลา Task 22:00 (เปิด Visit ก่อนเวลา Task)
```

### TC-SBH-2236-002 - ตรวจสอบ Visit ของผู้ป่วย ER ที่ยังรักษาอยู่ไม่ถูกปิดหลัง Task ปิด Visit อัตโนมัติ 22:00

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2236-002
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ของ TC-001 (หลัง Task 22:00 ของวัน D ทำงานแล้ว)
2. Login ระบบด้วย user ที่ดูสถานะ Visit ได้ (การเงิน)
3. ค้นหา VN ของผู้ป่วย A และดูสถานะ Visit

## Expected Result
Visit ER ของผู้ป่วย A ยังเปิดอยู่ ไม่ถูกปิดโดย Task

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2236-003 - ตรวจสอบ Visit OPD ที่ยังไม่ปิดถูกปิดอัตโนมัติตามเดิมหลัง Task 22:00

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2236-003
Case Type: Happy
Test Type: Functional

## Test Step
1. เตรียมผู้ป่วย B: เปิด Visit OPD ในวัน D ก่อน 22:00 และไม่ปิด Visit
2. รอให้ Task ปิด Visit อัตโนมัติ 22:00 ของวัน D ทำงาน
3. Login ระบบด้วย user ที่ดูสถานะ Visit ได้ (การเงิน)
4. ค้นหา VN ของผู้ป่วย B และดูสถานะ Visit

## Expected Result
Visit OPD ของผู้ป่วย B ถูกปิดโดย Task ตามเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค EP — Visit OPD เป็นกลุ่มที่ Task ยังต้องปิด (คู่กับ Visit ER ใน TC-002)
```

### TC-SBH-2236-008 - ตรวจสอบ Visit ของผู้ป่วยที่จำหน่ายออกจาก ER แล้วแต่ยังไม่ปิด Visit ที่การเงินไม่ถูกปิดหลัง Task ปิด Visit อัตโนมัติ 22:00

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2236-008
Case Type: Happy
Test Type: Functional

## Test Step
1. เตรียมผู้ป่วย E ในวัน D ก่อน 22:00: เปิด Visit ER > คัดกรอง > ER Physician Note (มี Diagnosis) > Disposition แบบไม่ Admit แล้วลงนาม
2. Login ระบบด้วย user พยาบาล ER > ER Dashboard > มุมมองรายการ > แท็บ รอจำหน่าย > กดปุ่ม จำหน่าย ของผู้ป่วย E > ยืนยัน (ไม่ปิด Visit ที่การเงิน)
3. รอให้ Task ปิด Visit อัตโนมัติ 22:00 ของวัน D ทำงาน
4. Login ระบบด้วย user ที่ดูสถานะ Visit ได้ (การเงิน)
5. ค้นหา VN ของผู้ป่วย E และดูสถานะ Visit

## Expected Result
Visit ER ของผู้ป่วย E ยังเปิดอยู่ ไม่ถูกปิดโดย Task

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค EP — จำหน่ายออกจาก ER แล้วแต่ Visit ยังเปิด เป็นอีกกลุ่มของ Visit ER ที่ยัง Active (ผู้ใช้ยืนยัน 29 ต.ค.: Active = ยังไม่ปิด Visit ที่การเงิน) · ตรวจหลัง 22:00 อย่างเดียว เพราะแท็บ จำหน่าย แสดงตามวันที่มาถึง (SBH-2396) · เลข 008 เพราะเพิ่มทีหลัง แต่จัดอยู่ใต้ Scenario HPY
```

---

## TS-SBH-2236-EDG - รายชื่อผู้ป่วย ER ไม่หายเมื่อข้ามเที่ยงคืน

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2236-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / Patient list
- Requirement ที่อ้างอิง: SBH-2236 — [ER] [ Patient list ] ผู้ป่วยรายชื่อหายไปหลัง เที่ยงคืน

วัตถุประสงค์
- ยืนยันว่าผู้ป่วย ER ที่มาถึงก่อนเที่ยงคืนและยังไม่จบการรักษา ยังแสดงในรายการและบอร์ดหลังเที่ยงคืน

ขอบเขต Requirement
- AC 2: ปรับเงื่อนไขหลังบ้าน ไม่ให้รายชื่อผู้ป่วยหายหลังเที่ยงคืน

ความเสี่ยง
- รายการกรองตามวันที่มาถึง → ผู้ป่วยที่มาเมื่อวานหายเมื่อขึ้นวันใหม่
- มุมมองรายการกับบอร์ดใช้เงื่อนไขคนละแบบ → แสดงไม่ตรงกัน
- ผู้ป่วยรอเตียง / รอจำหน่ายหายหลังเที่ยงคืนทั้งที่ยังไม่ออกจาก ER

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- 004–005 ใช้ผู้ป่วย A · 006 ใช้ผู้ป่วย C · 007 ใช้ผู้ป่วย D · ตรวจหลังเที่ยงคืน (วัน D+1)
```

### TC-SBH-2236-004 - ตรวจสอบผู้ป่วย ER ที่มาถึงก่อนเที่ยงคืนยังแสดงในแท็บผู้ป่วยปัจจุบันใน ER หลังเที่ยงคืน

Status: Not Run · Priority: Urgent · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2236-004
Case Type: Edge
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A (มาถึงวัน D ยังไม่จำหน่าย ไม่ปิด Visit)
2. หลังเที่ยงคืน (วัน D+1) Login ระบบด้วย user พยาบาล ER > ER Dashboard > มุมมองรายการ (ไม่เลือกวันที่)
3. ค้นหา HN ของผู้ป่วย A ในแท็บ ผู้ป่วยปัจจุบันใน ER

## Expected Result
ผู้ป่วย A แสดงในแท็บ ผู้ป่วยปัจจุบันใน ER แม้มาถึงวันก่อนหน้า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค BVA — ข้ามเที่ยงคืน
```

### TC-SBH-2236-005 - ตรวจสอบผู้ป่วย ER ที่มาถึงก่อนเที่ยงคืนยังแสดงบนบอร์ด ER หลังเที่ยงคืน

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2236-005
Case Type: Edge
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A (มาถึงวัน D ยังไม่จำหน่าย ไม่ปิด Visit)
2. หลังเที่ยงคืน (วัน D+1) Login ระบบด้วย user พยาบาล ER > ER Dashboard > มุมมองบอร์ด
3. หาการ์ดของผู้ป่วย A

## Expected Result
การ์ดของผู้ป่วย A แสดงบนบอร์ดในโซนเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค BVA — ข้ามเที่ยงคืน
```

### TC-SBH-2236-006 - ตรวจสอบผู้ป่วยรอเตียงที่มาถึงก่อนเที่ยงคืนยังแสดงในแท็บผู้ป่วยรอเตียงหลังเที่ยงคืน

Status: Not Run · Priority: High · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2236-006
Case Type: Edge
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย C (มาถึงวัน D ส่ง Admit Request แล้ว ยังไม่ได้เตียง)
2. หลังเที่ยงคืน (วัน D+1) Login ระบบด้วย user พยาบาล ER > ER Dashboard > มุมมองรายการ (ไม่เลือกวันที่)
3. ค้นหา HN ของผู้ป่วย C ในแท็บ ผู้ป่วยรอเตียง

## Expected Result
ผู้ป่วย C แสดงในแท็บ ผู้ป่วยรอเตียง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค EP — สถานะรอเตียงเป็นอีกกลุ่มในคิวปัจจุบัน (การ์ดไม่ได้ระบุแท็บ อิงคิวปัจจุบันตาม SBH-2396)
```

### TC-SBH-2236-007 - ตรวจสอบผู้ป่วยรอจำหน่ายที่มาถึงก่อนเที่ยงคืนยังแสดงในแท็บรอจำหน่ายหลังเที่ยงคืน

Status: Not Run · Priority: High · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2236-007
Case Type: Edge
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย D (มาถึงวัน D ลงนาม Disposition แบบไม่ Admit แล้ว ยังไม่กดจำหน่าย)
2. หลังเที่ยงคืน (วัน D+1) Login ระบบด้วย user พยาบาล ER > ER Dashboard > มุมมองรายการ (ไม่เลือกวันที่)
3. ค้นหา HN ของผู้ป่วย D ในแท็บ รอจำหน่าย

## Expected Result
ผู้ป่วย D แสดงในแท็บ รอจำหน่าย และยังมีปุ่ม จำหน่าย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค EP — สถานะรอจำหน่ายเป็นอีกกลุ่มในคิวปัจจุบัน · ผู้ใช้ยืนยัน (29 ต.ค.): รอจำหน่ายยังถือว่า Active เพราะยังไม่ได้ปิด Visit ที่การเงิน → Task 22:00 ต้องไม่ปิด
```

---

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - ~~Task 22:00 ข้าม Visit ER สถานะไหนบ้าง~~ → **ผู้ใช้ตอบแล้ว (29 ต.ค.)**: Visit ER ที่ยังไม่ได้ปิดที่การเงินถือว่า Active ทั้งหมด (รวมรอจำหน่าย) Task 22:00 ต้องไม่ปิด · ส่วนสเปก SBH-2396 ที่ว่า "ปิด Visit อัตโนมัติ นับเป็น เสร็จสิ้น" ใช้กับ Visit ที่ถูกปิดจริงเท่านั้น
  - ผู้ป่วย ER ค้างข้ามวันได้นานแค่ไหน (แสดงไปเรื่อย ๆ จนกว่าจะจำหน่าย / ปิด Visit หรือมีวันตัด)
  - Visit ที่เปิดจาก OPD แล้วส่งเข้า ER (หรือ ER ส่งคลินิกอื่นใน VN เดียวกัน) Task ถือเป็น ER หรือ OPD
- **Validation**
  - "เที่ยงคืน" นับตามเวลาโรงพยาบาล (UTC+7) — การ์ดไม่ระบุ ร่างนี้ถือเป็นเวลาไทย
- **Error handling**
  - Task 22:00 ทำงานไม่สำเร็จบางราย มี log / แจ้งเตือนหรือไม่ (การ์ดไม่ระบุ)
- **Permission / role**
  - ไม่มีในการ์ด (ใช้ user พยาบาล ER ดูรายการ / บอร์ดตามปกติ)
- **Edge cases**
  - เปิด Visit ER หลัง 22:00 (หลัง Task ทำงานแล้ว) — ไม่ได้ทำ TC เพราะ Task ไม่ทำงานซ้ำในคืนนั้น
  - ทดสอบ Task 22:00 ต้องรอเวลาจริง หรือ Dev สั่งรัน Task เองบน Dev-X ได้ — ต้องถาม Dev ก่อนวางวันรัน
