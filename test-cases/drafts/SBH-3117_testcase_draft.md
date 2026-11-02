# Draft Test Structure — SBH-3117

> สถานะ: **สร้างใน Linear แล้ว (2026-10-31)** — ผู้ใช้พิมพ์ "สร้างได้"
> - EXE SBH-3457 (EXE - CT - 2.9.1) → HPY SBH-3458 (TC 001–010) · EDG SBH-3460 (TC 011)
> - TC 001–011 = SBH-3462, 3463, 3465, 3466, 3467, 3469, 3471, 3473, 3475, 3477, 3478 (เลขที่ข้ามเป็นการ์ดของคนอื่นที่สร้างแทรก)
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee + "สร้างโดย" = Suchat (whoami เป็นบัญชี Suchat) · milestone ER - เก็บตก, edge case · TC ใช้ label `QA : Manual`
> - ชุดนี้ = EXE 1 + Scenario 2 + TC 11 = 14 ใบ
> - scope ตาม AC 3 ข้อของการ์ด · เรื่องที่การ์ดไม่ตอบอยู่ในหัวข้อ "Requirement gap" ท้ายไฟล์
> - ใช้ค่าตามชุดก่อนหน้า (รอผู้ใช้ยืนยัน): Run Type CT (การ์ดผูก Cycle) · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Queue
> - Version = 2.9.1 (label การ์ด) — ผู้ใช้ยืนยันแล้ว 31 ต.ค. 2026 แม้ PR ทั้ง 3 ตัวขึ้นต้น [V2.10.0]
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — assignee ต้องใส่ ID ของ Suchat (`ac7ed47a-b74d-4a54-992f-5d09acad47f2`)

Requirement: SBH-3117 — [ER] [ QUEUE ] ปรับปรุง หน้าจอ QUEUE
URL: https://linear.app/cortexcloud/issue/SBH-3117/er-queue-ปรบปรง-หนาจอ-queue
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: High · State: Ready for Testing
Labels: Natthaphat ( MOD ) 🙈 · 🍄 Improvement · VERSION 2.9.1 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Sub-Issue: ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี · Relations: related SBH-3357 (ลบ field `isResuscitationActive` เดิมของจอ TV หลัง rollout)
PR ที่แนบ: cortex-ui #2572 "Improve ER queue screens" · cortex-x #8889 "Serialize queue exam transitions" · cortex-api #2963 "add er queue completion and banner settings"
การ์ดที่เกี่ยวข้อง: SBH-1719 (จอ ER TV) · SBH-1026 (ปุ่มเรียกคิวในรายการผู้ป่วย ER) = AS-IS ของการ์ดนี้

## AC → TC

| AC | Expected | TC |
|---|---|---|
| 1 | Banner "กำลังกู้ชีพ" เปลี่ยนเป็นข้อความแจ้งผู้ป่วย · Setting มี Slider Switch เปิด / ปิด + Free Text Box แก้ได้ · Default ข้อความตามการ์ด | 001 · 002 · 003 · 004 · 005 |
| 2 | รายการเรียกแล้ว แสดงหน้าละ 4 รายการ | 006 · 011 |
| 3.1 | คอลัมน์ คิว แสดง Queue number | 007 |
| 3.2 | เพิ่มปุ่มเหมือน OPD (เรียกคิว · จบคิว · ไม่มี พักไว้) | 008 |
| 3.2.1 | เรียกคิว → ผู้ป่วยไปแสดงที่ กำลังเรียก | 009 |
| 3.2.3 | จบคิว → ผู้ป่วยหายไปจาก เรียกแล้ว | 010 |

> เทคนิค: AC 2 ใช้ BVA ที่ขอบ 4 รายการต่อหน้า (4 คิว = 1 หน้า · 5 คิว = 2 หน้า) ·
> AC 1 ใช้ State Transition ของ Switch (ปิด → เปิด → ปิด) · AC 3 ใช้ State Transition ของคิว (รอเรียก → กำลังเรียก → เรียกแล้ว → จบคิว)

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **ผู้ป่วย A, B (ER)**: เปิด Visit ER → คัดกรอง (มีเลขคิวในคอลัมน์ คิว) → ใช้กับ TC 007–010
- **คิวในรายการ "เรียกแล้ว"**: ต้องคุมจำนวนให้ได้ 4 และ 5 คิวพอดี — รายการนี้เก็บคิวข้ามวัน ต้องกด จบคิว คิวเก่าออกก่อน แล้วเรียกคิวผู้ป่วยใหม่ให้ครบ → ใช้กับ TC 006 · 011
- จอ TV: `/cortex/public/er/tv-queue` (ไม่ต้องล็อกอิน) เปิดอีกแท็บคู่กับหน้ารายการผู้ป่วย ER
- user: user ที่มีสิทธิ์ตั้งค่า ER (TC 001–005) · พยาบาล / เจ้าหน้าที่ ER ที่มีสิทธิ์เรียกคิว (TC 006–011)

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | แสดงเมนูตั้งค่าข้อความแสดงผลสำหรับผู้ป่วยพร้อม Slider Switch และช่องข้อความ | มีเมนู ตั้งค่าข้อความแสดงผลสำหรับผู้ป่วย · มี Slider Switch เปิด / ปิด · มีช่องข้อความ (Free Text Box) |
| 002 | HPY | ตรวจสอบข้อความ Default ในช่องข้อความแสดงผลสำหรับผู้ป่วย | ช่องข้อความแสดง "ขณะนี้มีผู้ป่วยฉุกเฉินจำนวนมาก การรักษาอาจล่าช้ากว่าปกติ ขออภัยในความไม่สะดวก" |
| 003 | HPY | แสดง Banner ข้อความแจ้งผู้ป่วยบนจอ TV เมื่อเปิด Switch | Banner บนจอ TV แสดงข้อความ Default · ไม่แสดงข้อความเดิม "กำลังกู้ชีพ · การรักษาอาจล่าช้า" |
| 004 | HPY | ซ่อน Banner ข้อความแจ้งผู้ป่วยบนจอ TV เมื่อปิด Switch | จอ TV ไม่แสดง Banner ข้อความแจ้งผู้ป่วย |
| 005 | HPY | แสดงข้อความที่แก้ไขเองบน Banner จอ TV | Banner บนจอ TV แสดงข้อความที่แก้ไขตรงทุกตัวอักษร · ไม่แสดงข้อความ Default |
| 006 | HPY | แสดงรายการเรียกแล้วหน้าละ 4 รายการเมื่อมีคิวเรียกแล้ว 5 คิว | หน้า 1 / 2 แสดง 4 คิว · หน้า 2 / 2 แสดง 1 คิว · ไม่มีคิวซ้ำหรือหายระหว่างหน้า |
| 007 | HPY | แสดงหมายเลขคิวในคอลัมน์คิวของรายการผู้ป่วย ER | คอลัมน์ คิว แสดง Queue number ของผู้ป่วยแต่ละแถว ตรงกับเลขคิวของ Visit |
| 008 | HPY | แสดงปุ่มเรียกคิวและจบคิวในคอลัมน์คิว | คอลัมน์ คิว มีปุ่ม เรียกคิว และ จบคิว · ไม่มีปุ่ม พักไว้ |
| 009 | HPY | ทดสอบกดเรียกคิวแล้วผู้ป่วยแสดงที่กำลังเรียกบนจอ TV | การ์ด กำลังเรียก บนจอ TV แสดงเลขคิวของผู้ป่วย A |
| 010 | HPY | ทดสอบกดจบคิวแล้วผู้ป่วยหายจากรายการเรียกแล้วบนจอ TV | คิวผู้ป่วย A หายจาก เรียกแล้ว · จำนวน "n คิว" ลดลง 1 · คิวอื่นใน เรียกแล้ว ยังอยู่ |
| 011 | EDG | แสดงรายการเรียกแล้วหน้าเดียวเมื่อมีคิวเรียกแล้ว 4 คิว | แสดงครบ 4 คิวในหน้าเดียว · หน้า 1 / 1 · ไม่มีหน้าที่ 2 |

---

## EXE - CT - 2.9.1

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, VERSION 2.9.1, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Queue, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.1
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-3117 — [ER] [ QUEUE ] ปรับปรุง หน้าจอ QUEUE
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Setting ตั้งค่าข้อความแสดงผลสำหรับผู้ป่วย (Slider Switch + Free Text Box + ข้อความ Default) และ Banner บนจอ ER TV
- รายการ เรียกแล้ว บนจอ ER TV แสดงหน้าละ 4 รายการ
- คอลัมน์ คิว ในรายการผู้ป่วย ER: Queue number · ปุ่ม เรียกคิว · ปุ่ม จบคิว

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-3117-HPY - ตั้งค่าข้อความแจ้งผู้ป่วย แสดงรายการเรียกแล้ว และเรียกคิว / จบคิวของ ER

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3117-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-3117 — [ER] [ QUEUE ] ปรับปรุง หน้าจอ QUEUE

วัตถุประสงค์
- ยืนยันว่าเจ้าหน้าที่ตั้งค่า / เปิด / ปิด ข้อความแจ้งผู้ป่วยบนจอ ER TV ได้ · รายการเรียกแล้วแสดงหน้าละ 4 รายการ · เรียกคิวและจบคิวจากรายการผู้ป่วย ER แล้วจอ TV เปลี่ยนตาม

ขอบเขต Requirement
- AC 1: Banner ข้อความแจ้งผู้ป่วย + Setting Slider Switch / Free Text Box / Default
- AC 2: รายการเรียกแล้ว หน้าละ 4 รายการ
- AC 3: คอลัมน์ คิว แสดง Queue number + ปุ่ม เรียกคิว / จบคิว

ความเสี่ยง
- ปิด Switch แล้ว Banner ยังค้างบนจอ TV หรือยังผูกกับการกด Start CPR แบบเดิม
- แก้ข้อความแล้วจอ TV ยังแสดงข้อความ Default / ข้อความเก่า
- จบคิวแล้วคิวยังค้างใน เรียกแล้ว หรือไปลบคิวของผู้ป่วยรายอื่น
- แบ่งหน้าเรียกแล้วผิด ทำให้คิวซ้ำหรือหายระหว่างหน้า

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- 001–005 ใช้ user ตั้งค่า ER · 006–010 ใช้ผู้ป่วย A, B
```

### TC-SBH-3117-001 - แสดงเมนูตั้งค่าข้อความแสดงผลสำหรับผู้ป่วยพร้อม Slider Switch และช่องข้อความ

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3117-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user ที่มีสิทธิ์ตั้งค่า ER
2. ไปที่เมนู ห้องฉุกเฉิน > ตั้งค่า
3. เปิดหน้า ตั้งค่าข้อความแสดงผลสำหรับผู้ป่วย

## Expected Result
มีเมนู ตั้งค่าข้อความแสดงผลสำหรับผู้ป่วย
หน้าตั้งค่ามี Slider Switch เปิด / ปิด
หน้าตั้งค่ามีช่องข้อความ (Free Text Box)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3117-002 - ตรวจสอบข้อความ Default ในช่องข้อความแสดงผลสำหรับผู้ป่วย

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-3117-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user ที่มีสิทธิ์ตั้งค่า ER (ยังไม่เคยแก้ข้อความ)
2. เปิดหน้า ตั้งค่าข้อความแสดงผลสำหรับผู้ป่วย
3. ดูข้อความในช่อง Free Text Box

## Expected Result
ช่องข้อความแสดง "ขณะนี้มีผู้ป่วยฉุกเฉินจำนวนมาก การรักษาอาจล่าช้ากว่าปกติ ขออภัยในความไม่สะดวก"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3117-003 - แสดง Banner ข้อความแจ้งผู้ป่วยบนจอ TV เมื่อเปิด Switch

Status: Not Run · Priority: High · Labels: เหมือน TC-001 แต่ QA Type : Functional

```
TC ID: TC-SBH-3117-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่มีสิทธิ์ตั้งค่า ER > เปิดหน้า ตั้งค่าข้อความแสดงผลสำหรับผู้ป่วย (ข้อความเป็นค่า Default)
2. กด Slider Switch เป็น เปิด แล้วบันทึก
3. เปิดจอ ER TV (/cortex/public/er/tv-queue)

## Expected Result
Banner ส่วนหัวของจอ TV แสดง "ขณะนี้มีผู้ป่วยฉุกเฉินจำนวนมาก การรักษาอาจล่าช้ากว่าปกติ ขออภัยในความไม่สะดวก"
ไม่แสดงข้อความเดิม "กำลังกู้ชีพ · การรักษาอาจล่าช้า"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — Switch ปิด → เปิด
```

### TC-SBH-3117-004 - ซ่อน Banner ข้อความแจ้งผู้ป่วยบนจอ TV เมื่อปิด Switch

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-3117-004
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก TC-003 (Switch เปิด · จอ TV แสดง Banner)
2. กลับไปหน้า ตั้งค่าข้อความแสดงผลสำหรับผู้ป่วย > กด Slider Switch เป็น ปิด แล้วบันทึก
3. ดูจอ ER TV

## Expected Result
จอ TV ไม่แสดง Banner ข้อความแจ้งผู้ป่วย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — Switch เปิด → ปิด
```

### TC-SBH-3117-005 - แสดงข้อความที่แก้ไขเองบน Banner จอ TV

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-3117-005
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่มีสิทธิ์ตั้งค่า ER > เปิดหน้า ตั้งค่าข้อความแสดงผลสำหรับผู้ป่วย
2. แก้ข้อความในช่อง Free Text Box เป็น "ทดสอบ SBH3117 แจ้งผู้ป่วย"
3. กด Slider Switch เป็น เปิด แล้วบันทึก
4. เปิดจอ ER TV

## Expected Result
Banner บนจอ TV แสดง "ทดสอบ SBH3117 แจ้งผู้ป่วย" ตรงทุกตัวอักษร
ไม่แสดงข้อความ Default

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: หลังเทสคืนข้อความเป็นค่า Default และปิด Switch (SBH Prod ใช้จอจริง)
```

### TC-SBH-3117-006 - แสดงรายการเรียกแล้วหน้าละ 4 รายการเมื่อมีคิวเรียกแล้ว 5 คิว

Status: Not Run · Priority: Medium · Labels: เหมือน TC-003

```
TC ID: TC-SBH-3117-006
Case Type: Happy
Test Type: Functional

## Test Step
1. เตรียมให้รายการ เรียกแล้ว บนจอ ER TV มี 5 คิวพอดี (จบคิว คิวเก่าออก แล้วเรียกคิวผู้ป่วยใหม่)
2. เปิดจอ ER TV ดูกล่อง เรียกแล้ว หน้า 1
3. รอให้เปลี่ยนเป็นหน้า 2

## Expected Result
หัวกล่องแสดง 5 คิว
หน้า 1 / 2 แสดง 4 คิว
หน้า 2 / 2 แสดง 1 คิว
คิวทั้ง 5 แสดงครบ ไม่มีคิวซ้ำระหว่างหน้า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค BVA — ค่าที่เลยขอบ 4 รายการต่อหน้า (5 คิว)
```

### TC-SBH-3117-007 - แสดงหมายเลขคิวในคอลัมน์คิวของรายการผู้ป่วย ER

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-3117-007
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. ไปที่ แดชบอร์ด / คิว > มุมมองรายการ > แท็บ ผู้ป่วยปัจจุบันใน ER
3. ดูคอลัมน์ คิว ของแถวผู้ป่วย A

## Expected Result
คอลัมน์ คิว แสดง Queue number ของผู้ป่วย A ตรงกับเลขคิวของ Visit

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3117-008 - แสดงปุ่มเรียกคิวและจบคิวในคอลัมน์คิว

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-3117-008
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมองรายการ > แท็บ ผู้ป่วยปัจจุบันใน ER
2. ดูคอลัมน์ คิว ของแถวผู้ป่วย A

## Expected Result
คอลัมน์ คิว มีปุ่ม เรียกคิว และปุ่ม จบคิว
ไม่มีปุ่ม พักไว้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3117-009 - ทดสอบกดเรียกคิวแล้วผู้ป่วยแสดงที่กำลังเรียกบนจอ TV

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-3117-009
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดจอ ER TV ไว้อีกแท็บ
2. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมองรายการ > แท็บ ผู้ป่วยปัจจุบันใน ER
3. กดปุ่ม เรียกคิว ในแถวผู้ป่วย A
4. ดูจอ ER TV

## Expected Result
การ์ด กำลังเรียก บนจอ TV แสดงเลขคิวของผู้ป่วย A

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอเรียก → กำลังเรียก
```

### TC-SBH-3117-010 - ทดสอบกดจบคิวแล้วผู้ป่วยหายจากรายการเรียกแล้วบนจอ TV

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-3117-010
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก TC-009 > กดปุ่ม เรียกคิว ในแถวผู้ป่วย B (คิวผู้ป่วย A ย้ายไปอยู่ใน เรียกแล้ว)
2. จดจำนวน "n คิว" ของกล่อง เรียกแล้ว บนจอ TV
3. กดปุ่ม จบคิว ในแถวผู้ป่วย A
4. ดูกล่อง เรียกแล้ว บนจอ ER TV

## Expected Result
คิวของผู้ป่วย A หายไปจากรายการ เรียกแล้ว
จำนวนคิวในหัวกล่อง เรียกแล้ว ลดลง 1
คิวอื่นใน เรียกแล้ว ยังแสดงอยู่ตามเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — เรียกแล้ว → จบคิว
```

---

## TS-SBH-3117-EDG - จำนวนรายการเรียกแล้วที่ค่าขอบของหน้าละ 4 รายการ

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3117-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-3117 — [ER] [ QUEUE ] ปรับปรุง หน้าจอ QUEUE

วัตถุประสงค์
- ยืนยันการแบ่งหน้าของรายการ เรียกแล้ว ที่ค่าขอบพอดี 4 รายการ

ขอบเขต Requirement
- AC 2: รายการเรียกแล้ว แสดงหน้าละ 4 รายการ

ความเสี่ยง
- คิวครบ 4 พอดีแล้วระบบสร้างหน้าที่ 2 ว่าง หรือแบ่งเป็น 2 หน้า

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-3117-011 - แสดงรายการเรียกแล้วหน้าเดียวเมื่อมีคิวเรียกแล้ว 4 คิว

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3117-011
Case Type: Edge
Test Type: Functional

## Test Step
1. เตรียมให้รายการ เรียกแล้ว บนจอ ER TV มี 4 คิวพอดี (จบคิว คิวเก่าออก แล้วเรียกคิวผู้ป่วยใหม่)
2. เปิดจอ ER TV ดูกล่อง เรียกแล้ว
3. รออย่างน้อย 1 รอบการเปลี่ยนหน้า

## Expected Result
หัวกล่องแสดง 4 คิว
แสดงครบ 4 คิวในหน้าเดียว (หน้า 1 / 1)
ไม่มีหน้าที่ 2

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค BVA — ค่าขอบพอดี 4 รายการต่อหน้า
```

---

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - Banner ยังขึ้นอัตโนมัติตอน Start CPR แบบเดิมด้วยหรือไม่ หรือขึ้นตาม Switch อย่างเดียว (การ์ด SBH-3357 บอกว่าจะลบ field `isResuscitationActive` เดิมทีหลัง → น่าจะตาม Switch อย่างเดียว แต่การ์ดนี้ไม่ได้เขียน)
  - หน้าตั้งค่าอยู่เมนูไหน (ร่างใช้ ห้องฉุกเฉิน > ตั้งค่า) · มีปุ่มบันทึก หรือเปลี่ยนทันทีที่กด Switch · ต้องยืนยันกับแอปจริงก่อนรัน
  - หลังกด จบคิว คอลัมน์ คิว ในรายการผู้ป่วยแสดงอะไร (OPD แสดง "จบคิวแล้ว" แต่การ์ดไม่ได้เขียนสำหรับ ER) · กด เรียกคิว ซ้ำหลังจบคิวได้หรือไม่
  - จบคิว แล้วผู้ป่วยยังอยู่ในตาราง "ดูสถานะผู้ป่วยที่รักษาอยู่" ฝั่งขวาหรือไม่
  - "หน้าละ 4 รายการ" ตายตัวทุกขนาดจอหรือไม่ (เดิมจำนวนต่อหน้าขึ้นกับความสูงจอ)
- **Validation**
  - ช่องข้อความว่างได้หรือไม่ · เปิด Switch ขณะข้อความว่างแล้วจอ TV แสดงอะไร · จำกัดความยาวข้อความกี่ตัวอักษร
- **Error handling**
  - กด จบคิว กับคิวที่อยู่ในการ์ด กำลังเรียก (ยังไม่ย้ายไป เรียกแล้ว) ได้หรือไม่ และจอ TV แสดงอะไร
  - กด เรียกคิว / จบคิว ซ้อนกันเร็ว ๆ หรือจาก 2 เครื่องพร้อมกัน (PR cortex-x #8889 "Serialize queue exam transitions" แก้เรื่องนี้ แต่การ์ดไม่ได้ระบุผลที่ต้องได้)
- **Permission / role**
  - role ไหนตั้งค่าข้อความได้ · role ไหนเห็นปุ่ม จบคิว (ปุ่มเรียกคิวเดิมใช้สิทธิ์ `queue-exam:call`)
- **Edge cases**
  - ข้อความยาวมากบน Banner ตัดบรรทัด / ตัดคำอย่างไร
