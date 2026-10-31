# Draft Test Structure — SBH-3158

> สถานะ: **สร้างใน Linear แล้ว (2026-10-29)** — ผู้ใช้พิมพ์ "สร้างได้"
> - EXE SBH-3242 (EXE - CT - 2.10.0) → HPY SBH-3243 → TC 001–032 = SBH-3244–3272, 3274, 3275, 3277 (เลข 3273 / 3276 เป็นการ์ดของคนอื่นที่สร้างแทรกระหว่างนั้น)
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee Suchat ทุกใบ · milestone ER - เก็บตก, edge case · TC ใช้ label `QA : Manual` · "สร้างโดย" เป็น Neranchara (บัญชีของ connector)
> - ชุดนี้ = EXE 1 + Scenario 1 + TC 32 = 34 ใบ
> - scope ตาม AC 3 ข้อของการ์ด (ใช้แนวเดียวกับ SBH-2593) · เรื่องที่การ์ดไม่ตอบอยู่ในหัวข้อ "Requirement gap" ท้ายไฟล์
> - ผู้ใช้สั่งเพิ่ม (29 ต.ค.): TC 025–032 ตรวจ Order Summary กับ ER Nurse Task List ตรงกันทั้ง 2 ทาง ครบ 4 ประเภท (ไม่อยู่ใน AC · อิง PR cortex-api #2940)
> - ใช้ค่าตามชุดก่อนหน้า (รอผู้ใช้ยืนยัน): Run Type CT (การ์ดผูก Cycle) · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Order Summary (label เดียวกับ SBH-2593)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — assignee ต้องใส่ ID ของ Suchat (`ac7ed47a-b74d-4a54-992f-5d09acad47f2`)

Requirement: SBH-3158 — [ER][ Order Summary ] เพิ่ม Action บน Order Summary
URL: https://linear.app/cortexcloud/issue/SBH-3158/er-order-summary-เพม-action-บน-order-summary
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: Ready for Testing
Labels: Natthaphat ( MOD ) 🙈 · 🍄 Improvement · VERSION 2.10.0 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Sub-Issue: ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี · Relations: ไม่มี
PR ที่แนบ: cortex-ui #2544 "add order summary actions for lab imaging activity and supply" · cortex-api #2940 "add request ids to er nurse task source ref"
Scope / Version = 2.10.0 (label VERSION 2.10.0 ของการ์ด)
การ์ดที่เกี่ยวข้อง: SBH-2593 (ปุ่มงานยาของพยาบาลบน Order Summary ER = AS-IS ของการ์ดนี้)

## AC → TC

| AC | Expected | TC |
|---|---|---|
| 1.1 หัตถการ | แถวแสดง Action รับ Order / เสร็จสิ้น / ยกเลิก Order และกดใช้ได้ | 001 · 002 · 003 · 004 |
| 1.2 รังสี | เหมือน 1.1 | 005 · 006 · 007 · 008 |
| 1.3 Lab | เหมือน 1.1 | 009 · 010 · 011 · 012 |
| 1.4 เวชภัณฑ์ | เหมือน 1.1 | 013 · 014 · 015 · 016 |
| 2 | Checkbox เลือกทุกรายการของแต่ละประเภท เหมือน Medication | 017 · 018 · 019 · 020 |
| 3 | ปุ่ม เสร็จสิ้น (ในแถบเมื่อเลือกหลายรายการ) | 021 · 022 · 023 · 024 |
| นอก AC (ผู้ใช้สั่งเพิ่ม) | รับ Order จาก Order Summary → ER Nurse Task List เปลี่ยนตาม · และกลับกัน | 025–026 หัตถการ · 027–028 รังสี · 029–030 Lab · 031–032 เวชภัณฑ์ |

> เทคนิค: แต่ละประเภท Order = 1 กลุ่ม (EP) เพราะ backend แยกกัน (PR ระบุ lab / imaging / activity / supply) จึงเทสครบทั้ง 4 ประเภท ·
> ปุ่มในแถวใช้ State Transition ตามเส้นที่การ์ดระบุ: รอรับ Order → รับ Order → เสร็จสิ้น และ รอรับ Order → ยกเลิก Order

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **ผู้ป่วย A (ER)**: เปิด Visit ER → คัดกรอง → ER Physician Note (เลือก Diagnosis) → One Day Order แพทย์ลงนามแล้ว
  ประเภทละอย่างน้อย 2 รายการ: หัตถการ · รังสี (เช่น CT) · Lab (เช่น Hematology) · เวชภัณฑ์ → ใช้กับ TC 001–016
- **ผู้ป่วย B (ER)**: เหมือนผู้ป่วย A แต่ประเภทละอย่างน้อย 3 รายการ → ใช้กับ TC 017–024
- **ผู้ป่วย C (ER)**: เหมือนผู้ป่วย A (ประเภทละอย่างน้อย 2 รายการ ยังไม่รับ Order) → ใช้กับ TC 025–032
- user: แพทย์ ER (สั่ง + ลงนาม) · พยาบาล ER (กด Action)

---

## EXE - CT - 2.10.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, VERSION 2.10.0, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Order Summary, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.10.0
- Module: ER / Order Summary
- Requirement ที่อ้างอิง: SBH-3158 — [ER][ Order Summary ] เพิ่ม Action บน Order Summary
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Action รับ Order / เสร็จสิ้น / ยกเลิก Order ในแถว หัตถการ รังสี Lab เวชภัณฑ์
- Checkbox เลือกทุกรายการของแต่ละประเภท Order
- ปุ่ม เสร็จสิ้น ในแถบเมื่อเลือกหลายรายการ
- สถานะใน Order Summary กับ ER Nurse Task List ตรงกันทั้ง 2 ทาง

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-3158-HPY - พยาบาลจัดการ Order หัตถการ รังสี Lab และเวชภัณฑ์จาก Order Summary ของ ER

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Order Summary + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3158-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Order Summary
- Requirement ที่อ้างอิง: SBH-3158 — [ER][ Order Summary ] เพิ่ม Action บน Order Summary

วัตถุประสงค์
- ยืนยันว่าพยาบาลรับ Order / เสร็จสิ้น / ยกเลิก Order ของ หัตถการ รังสี Lab เวชภัณฑ์ ได้จาก Order Summary ทั้งรายแถวและเลือกหลายรายการ เหมือนที่ทำกับยาได้

ขอบเขต Requirement
- AC 1: Action รับ Order / เสร็จสิ้น / ยกเลิก Order ของ หัตถการ รังสี Lab เวชภัณฑ์
- AC 2: Checkbox เลือกทุกรายการของแต่ละประเภท เหมือน Medication
- AC 3: ปุ่ม เสร็จสิ้น
- เพิ่มเติม (ผู้ใช้สั่ง): สถานะตรงกับ ER Nurse Task List ทั้ง 2 ทาง

ความเสี่ยง
- กด Action ในแถวหนึ่งแล้วไปเปลี่ยนรายการอื่น หรือรายการคนละประเภท
- Checkbox เลือกทั้งหมดของประเภทหนึ่งไปติ๊กรายการของประเภทอื่นด้วย → กดเสร็จสิ้น / ยกเลิกเกินที่ตั้งใจ
- ปุ่ม เสร็จสิ้น ในแถบทำแค่บางรายการที่เลือก
- สถานะใน Order Summary กับ ER Nurse Task List ไม่ตรงกัน → ทำงานซ้ำหรือตกหล่น

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- 001–016 ใช้ผู้ป่วย A · 017–024 ใช้ผู้ป่วย B · 025–032 ใช้ผู้ป่วย C
```

### TC-SBH-3158-001 - แสดง Action รับ Order / เสร็จสิ้น / ยกเลิก Order ในแถวหัตถการ

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Order Summary + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3158-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เปิดผู้ป่วย A > เมนูขวา Order Summary
3. ดู section หัตถการ ใน ORDER FOR ONE DAY

## Expected Result
ตารางหัตถการมีคอลัมน์ Action
แถวหัตถการที่ยังไม่ได้รับ Order แสดงปุ่ม รับ Order / เสร็จสิ้น / ยกเลิก Order

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-002 - ทดสอบรับ Order หัตถการจากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-001 แต่ QA Type : Functional

```
TC ID: TC-SBH-3158-002
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่ม รับ Order ในแถวหัตถการรายการที่ 1

## Expected Result
รับ Order สำเร็จ ปุ่ม รับ Order ในแถวนั้นหายไป
หัตถการรายการอื่นยังแสดงปุ่ม รับ Order ตามเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอรับ Order → รับ Order
```

### TC-SBH-3158-003 - ทดสอบกดเสร็จสิ้นหัตถการจากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-003
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้หัตถการรายการที่ 1 ที่รับ Order แล้วจาก TC-002
2. กดปุ่ม เสร็จสิ้น ในแถวนั้น (มีหน้าต่างยืนยัน ให้กดยืนยัน)

## Expected Result
บันทึกเสร็จสิ้นสำเร็จ แถวนั้นไม่มีปุ่ม รับ Order / เสร็จสิ้น ให้กดซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รับ Order → เสร็จสิ้น
```

### TC-SBH-3158-004 - ทดสอบยกเลิก Order หัตถการจากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-004
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่ม ยกเลิก Order ในแถวหัตถการรายการที่ 2 (ยังไม่ได้รับ Order) > กดยืนยัน

## Expected Result
ยกเลิก Order สำเร็จ แถวนั้นไม่มีปุ่ม รับ Order / เสร็จสิ้น / ยกเลิก Order ให้กดต่อ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอรับ Order → ยกเลิก Order
```

### TC-SBH-3158-005 - แสดง Action รับ Order / เสร็จสิ้น / ยกเลิก Order ในแถวรังสี

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-3158-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เปิดผู้ป่วย A > เมนูขวา Order Summary
3. ดู section รังสี ใน ORDER FOR ONE DAY

## Expected Result
ตารางรังสีมีคอลัมน์ Action
แถวรังสีที่ยังไม่ได้รับ Order แสดงปุ่ม รับ Order / เสร็จสิ้น / ยกเลิก Order

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-006 - ทดสอบรับ Order รังสีจากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่ม รับ Order ในแถวรังสีรายการที่ 1

## Expected Result
รับ Order สำเร็จ ปุ่ม รับ Order ในแถวนั้นหายไป
รังสีรายการอื่นยังแสดงปุ่ม รับ Order ตามเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอรับ Order → รับ Order
```

### TC-SBH-3158-007 - ทดสอบกดเสร็จสิ้นรังสีจากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-007
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้รังสีรายการที่ 1 ที่รับ Order แล้วจาก TC-006
2. กดปุ่ม เสร็จสิ้น ในแถวนั้น (มีหน้าต่างยืนยัน ให้กดยืนยัน)

## Expected Result
บันทึกเสร็จสิ้นสำเร็จ แถวนั้นไม่มีปุ่ม รับ Order / เสร็จสิ้น ให้กดซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รับ Order → เสร็จสิ้น
```

### TC-SBH-3158-008 - ทดสอบยกเลิก Order รังสีจากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-008
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่ม ยกเลิก Order ในแถวรังสีรายการที่ 2 (ยังไม่ได้รับ Order) > กดยืนยัน

## Expected Result
ยกเลิก Order สำเร็จ แถวนั้นไม่มีปุ่ม รับ Order / เสร็จสิ้น / ยกเลิก Order ให้กดต่อ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอรับ Order → ยกเลิก Order
```

### TC-SBH-3158-009 - แสดง Action รับ Order / เสร็จสิ้น / ยกเลิก Order ในแถว Lab

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-3158-009
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เปิดผู้ป่วย A > เมนูขวา Order Summary
3. ดู section ห้องปฏิบัติการ (Lab) ใน ORDER FOR ONE DAY

## Expected Result
ตาราง Lab มีคอลัมน์ Action
แถว Lab ที่ยังไม่ได้รับ Order แสดงปุ่ม รับ Order / เสร็จสิ้น / ยกเลิก Order

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-010 - ทดสอบรับ Order Lab จากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-010
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่ม รับ Order ในแถว Lab รายการที่ 1

## Expected Result
รับ Order สำเร็จ ปุ่ม รับ Order ในแถวนั้นหายไป
Lab รายการอื่นยังแสดงปุ่ม รับ Order ตามเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอรับ Order → รับ Order
```

### TC-SBH-3158-011 - ทดสอบกดเสร็จสิ้น Lab จากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-011
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ Lab รายการที่ 1 ที่รับ Order แล้วจาก TC-010
2. กดปุ่ม เสร็จสิ้น ในแถวนั้น (มีหน้าต่างยืนยัน ให้กดยืนยัน)

## Expected Result
บันทึกเสร็จสิ้นสำเร็จ แถวนั้นไม่มีปุ่ม รับ Order / เสร็จสิ้น ให้กดซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รับ Order → เสร็จสิ้น
```

### TC-SBH-3158-012 - ทดสอบยกเลิก Order Lab จากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-012
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่ม ยกเลิก Order ในแถว Lab รายการที่ 2 (ยังไม่ได้รับ Order) > กดยืนยัน

## Expected Result
ยกเลิก Order สำเร็จ แถวนั้นไม่มีปุ่ม รับ Order / เสร็จสิ้น / ยกเลิก Order ให้กดต่อ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอรับ Order → ยกเลิก Order
```

### TC-SBH-3158-013 - แสดง Action รับ Order / เสร็จสิ้น / ยกเลิก Order ในแถวเวชภัณฑ์

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-3158-013
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เปิดผู้ป่วย A > เมนูขวา Order Summary
3. ดู section เวชภัณฑ์ ใน ORDER FOR ONE DAY

## Expected Result
ตารางเวชภัณฑ์มีคอลัมน์ Action
แถวเวชภัณฑ์ที่ยังไม่ได้รับ Order แสดงปุ่ม รับ Order / เสร็จสิ้น / ยกเลิก Order

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-014 - ทดสอบรับ Order เวชภัณฑ์จากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-014
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่ม รับ Order ในแถวเวชภัณฑ์รายการที่ 1

## Expected Result
รับ Order สำเร็จ ปุ่ม รับ Order ในแถวนั้นหายไป
เวชภัณฑ์รายการอื่นยังแสดงปุ่ม รับ Order ตามเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอรับ Order → รับ Order
```

### TC-SBH-3158-015 - ทดสอบกดเสร็จสิ้นเวชภัณฑ์จากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-015
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้เวชภัณฑ์รายการที่ 1 ที่รับ Order แล้วจาก TC-014
2. กดปุ่ม เสร็จสิ้น ในแถวนั้น (มีหน้าต่างยืนยัน ให้กดยืนยัน)

## Expected Result
บันทึกเสร็จสิ้นสำเร็จ แถวนั้นไม่มีปุ่ม รับ Order / เสร็จสิ้น ให้กดซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รับ Order → เสร็จสิ้น
```

### TC-SBH-3158-016 - ทดสอบยกเลิก Order เวชภัณฑ์จากปุ่มในแถว

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-016
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่ม ยกเลิก Order ในแถวเวชภัณฑ์รายการที่ 2 (ยังไม่ได้รับ Order) > กดยืนยัน

## Expected Result
ยกเลิก Order สำเร็จ แถวนั้นไม่มีปุ่ม รับ Order / เสร็จสิ้น / ยกเลิก Order ให้กดต่อ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอรับ Order → ยกเลิก Order
```

### TC-SBH-3158-017 - ทดสอบ Checkbox ที่หัวตารางหัตถการ เลือกทุกรายการของหัตถการ

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-017
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B > Order Summary
2. ติ๊ก Checkbox ที่หัวตาราง section หัตถการ

## Expected Result
หัตถการทุกรายการใน section นั้นถูกติ๊ก
แถบด้านบนแสดง "เลือก N รายการ" (N = จำนวนหัตถการ) เหมือนตอนเลือกยา
รายการของประเภทอื่น (ยา / รังสี / Lab / เวชภัณฑ์) ไม่ถูกติ๊ก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-018 - ทดสอบ Checkbox ที่หัวตารางรังสี เลือกทุกรายการของรังสี

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-018
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B > Order Summary
2. ติ๊ก Checkbox ที่หัวตาราง section รังสี

## Expected Result
รังสีทุกรายการใน section นั้นถูกติ๊ก
แถบด้านบนแสดง "เลือก N รายการ" (N = จำนวนรังสี) เหมือนตอนเลือกยา
รายการของประเภทอื่น (ยา / หัตถการ / Lab / เวชภัณฑ์) ไม่ถูกติ๊ก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-019 - ทดสอบ Checkbox ที่หัวตาราง Lab เลือกทุกรายการของ Lab

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-019
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B > Order Summary
2. ติ๊ก Checkbox ที่หัวตาราง section ห้องปฏิบัติการ (Lab)

## Expected Result
Lab ทุกรายการใน section นั้นถูกติ๊ก
แถบด้านบนแสดง "เลือก N รายการ" (N = จำนวน Lab) เหมือนตอนเลือกยา
รายการของประเภทอื่น (ยา / หัตถการ / รังสี / เวชภัณฑ์) ไม่ถูกติ๊ก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-020 - ทดสอบ Checkbox ที่หัวตารางเวชภัณฑ์ เลือกทุกรายการของเวชภัณฑ์

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-020
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B > Order Summary
2. ติ๊ก Checkbox ที่หัวตาราง section เวชภัณฑ์

## Expected Result
เวชภัณฑ์ทุกรายการใน section นั้นถูกติ๊ก
แถบด้านบนแสดง "เลือก N รายการ" (N = จำนวนเวชภัณฑ์) เหมือนตอนเลือกยา
รายการของประเภทอื่น (ยา / หัตถการ / รังสี / Lab) ไม่ถูกติ๊ก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-021 - ทดสอบเลือกหัตถการหลายรายการแล้วกดเสร็จสิ้นจากแถบ

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-021
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B > Order Summary
2. กด รับ Order หัตถการ 3 รายการ
3. ติ๊ก Checkbox หัตถการ 2 รายการ
4. กดปุ่ม เสร็จสิ้น ในแถบด้านบน (มีหน้าต่างยืนยัน ให้กดยืนยัน)

## Expected Result
แถบด้านบนมีปุ่ม เสร็จสิ้น พร้อมจำนวนรายการที่เลือก
หัตถการ 2 รายการที่เลือกเสร็จสิ้นทั้งคู่
หัตถการรายการที่ 3 ที่ไม่ได้เลือกยังไม่เสร็จสิ้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-022 - ทดสอบเลือกรังสีหลายรายการแล้วกดเสร็จสิ้นจากแถบ

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-022
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B > Order Summary
2. กด รับ Order รังสี 3 รายการ
3. ติ๊ก Checkbox รังสี 2 รายการ
4. กดปุ่ม เสร็จสิ้น ในแถบด้านบน (มีหน้าต่างยืนยัน ให้กดยืนยัน)

## Expected Result
แถบด้านบนมีปุ่ม เสร็จสิ้น พร้อมจำนวนรายการที่เลือก
รังสี 2 รายการที่เลือกเสร็จสิ้นทั้งคู่
รังสีรายการที่ 3 ที่ไม่ได้เลือกยังไม่เสร็จสิ้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-023 - ทดสอบเลือก Lab หลายรายการแล้วกดเสร็จสิ้นจากแถบ

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-023
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B > Order Summary
2. กด รับ Order Lab 3 รายการ
3. ติ๊ก Checkbox Lab 2 รายการ
4. กดปุ่ม เสร็จสิ้น ในแถบด้านบน (มีหน้าต่างยืนยัน ให้กดยืนยัน)

## Expected Result
แถบด้านบนมีปุ่ม เสร็จสิ้น พร้อมจำนวนรายการที่เลือก
Lab 2 รายการที่เลือกเสร็จสิ้นทั้งคู่
Lab รายการที่ 3 ที่ไม่ได้เลือกยังไม่เสร็จสิ้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-3158-024 - ทดสอบเลือกเวชภัณฑ์หลายรายการแล้วกดเสร็จสิ้นจากแถบ

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3158-024
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B > Order Summary
2. กด รับ Order เวชภัณฑ์ 3 รายการ
3. ติ๊ก Checkbox เวชภัณฑ์ 2 รายการ
4. กดปุ่ม เสร็จสิ้น ในแถบด้านบน (มีหน้าต่างยืนยัน ให้กดยืนยัน)

## Expected Result
แถบด้านบนมีปุ่ม เสร็จสิ้น พร้อมจำนวนรายการที่เลือก
เวชภัณฑ์ 2 รายการที่เลือกเสร็จสิ้นทั้งคู่
เวชภัณฑ์รายการที่ 3 ที่ไม่ได้เลือกยังไม่เสร็จสิ้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---
### TC-SBH-3158-025 - ตรวจสอบ ER Nurse Task List เปลี่ยนตาม เมื่อรับ Order หัตถการจาก Order Summary

Status: Not Run · Priority: High · Labels: เหมือน TC-002 แต่ QA Type : Integration

```
TC ID: TC-SBH-3158-025
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย C > Order Summary
2. กดปุ่ม รับ Order ในแถวหัตถการรายการที่ 1
3. เปิด ER Nurse Task List > ดูงานของหัตถการรายการเดียวกัน

## Expected Result
งานของหัตถการรายการนั้นใน ER Nurse Task List เป็นสถานะรับ Order แล้ว ตรงกับที่ทำจาก Order Summary

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ไม่อยู่ใน AC — เพิ่มตามที่ผู้ใช้สั่ง (29 ต.ค.) อิง PR cortex-api #2940 ที่ผูก request id เข้ากับ ER Nurse Task
```

### TC-SBH-3158-026 - ตรวจสอบปุ่มใน Order Summary เปลี่ยนตาม เมื่อรับ Order หัตถการจาก ER Nurse Task List

Status: Not Run · Priority: High · Labels: เหมือน TC-025

```
TC ID: TC-SBH-3158-026
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Nurse Task List
2. กด รับ Order งานของหัตถการรายการที่ 2 ของผู้ป่วย C
3. เปิดผู้ป่วย C > Order Summary > ดูแถวหัตถการรายการเดียวกัน

## Expected Result
แถวหัตถการรายการนั้นใน Order Summary ไม่มีปุ่ม รับ Order แล้ว ตรงกับที่ทำจาก ER Nurse Task List

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ไม่อยู่ใน AC — เพิ่มตามที่ผู้ใช้สั่ง (29 ต.ค.) อิง PR cortex-api #2940 ที่ผูก request id เข้ากับ ER Nurse Task
```

### TC-SBH-3158-027 - ตรวจสอบ ER Nurse Task List เปลี่ยนตาม เมื่อรับ Order รังสีจาก Order Summary

Status: Not Run · Priority: High · Labels: เหมือน TC-002 แต่ QA Type : Integration

```
TC ID: TC-SBH-3158-027
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย C > Order Summary
2. กดปุ่ม รับ Order ในแถวรังสีรายการที่ 1
3. เปิด ER Nurse Task List > ดูงานของรังสีรายการเดียวกัน

## Expected Result
งานของรังสีรายการนั้นใน ER Nurse Task List เป็นสถานะรับ Order แล้ว ตรงกับที่ทำจาก Order Summary

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ไม่อยู่ใน AC — เพิ่มตามที่ผู้ใช้สั่ง (29 ต.ค.) อิง PR cortex-api #2940 ที่ผูก request id เข้ากับ ER Nurse Task
```

### TC-SBH-3158-028 - ตรวจสอบปุ่มใน Order Summary เปลี่ยนตาม เมื่อรับ Order รังสีจาก ER Nurse Task List

Status: Not Run · Priority: High · Labels: เหมือน TC-027

```
TC ID: TC-SBH-3158-028
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Nurse Task List
2. กด รับ Order งานของรังสีรายการที่ 2 ของผู้ป่วย C
3. เปิดผู้ป่วย C > Order Summary > ดูแถวรังสีรายการเดียวกัน

## Expected Result
แถวรังสีรายการนั้นใน Order Summary ไม่มีปุ่ม รับ Order แล้ว ตรงกับที่ทำจาก ER Nurse Task List

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ไม่อยู่ใน AC — เพิ่มตามที่ผู้ใช้สั่ง (29 ต.ค.) อิง PR cortex-api #2940 ที่ผูก request id เข้ากับ ER Nurse Task
```

### TC-SBH-3158-029 - ตรวจสอบ ER Nurse Task List เปลี่ยนตาม เมื่อรับ Order Lab จาก Order Summary

Status: Not Run · Priority: High · Labels: เหมือน TC-002 แต่ QA Type : Integration

```
TC ID: TC-SBH-3158-029
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย C > Order Summary
2. กดปุ่ม รับ Order ในแถว Labรายการที่ 1
3. เปิด ER Nurse Task List > ดูงานของ Labรายการเดียวกัน

## Expected Result
งานของ Labรายการนั้นใน ER Nurse Task List เป็นสถานะรับ Order แล้ว ตรงกับที่ทำจาก Order Summary

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ไม่อยู่ใน AC — เพิ่มตามที่ผู้ใช้สั่ง (29 ต.ค.) อิง PR cortex-api #2940 ที่ผูก request id เข้ากับ ER Nurse Task
```

### TC-SBH-3158-030 - ตรวจสอบปุ่มใน Order Summary เปลี่ยนตาม เมื่อรับ Order Lab จาก ER Nurse Task List

Status: Not Run · Priority: High · Labels: เหมือน TC-029

```
TC ID: TC-SBH-3158-030
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Nurse Task List
2. กด รับ Order งานของ Labรายการที่ 2 ของผู้ป่วย C
3. เปิดผู้ป่วย C > Order Summary > ดูแถว Labรายการเดียวกัน

## Expected Result
แถว Labรายการนั้นใน Order Summary ไม่มีปุ่ม รับ Order แล้ว ตรงกับที่ทำจาก ER Nurse Task List

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ไม่อยู่ใน AC — เพิ่มตามที่ผู้ใช้สั่ง (29 ต.ค.) อิง PR cortex-api #2940 ที่ผูก request id เข้ากับ ER Nurse Task
```

### TC-SBH-3158-031 - ตรวจสอบ ER Nurse Task List เปลี่ยนตาม เมื่อรับ Order เวชภัณฑ์จาก Order Summary

Status: Not Run · Priority: High · Labels: เหมือน TC-002 แต่ QA Type : Integration

```
TC ID: TC-SBH-3158-031
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย C > Order Summary
2. กดปุ่ม รับ Order ในแถวเวชภัณฑ์รายการที่ 1
3. เปิด ER Nurse Task List > ดูงานของเวชภัณฑ์รายการเดียวกัน

## Expected Result
งานของเวชภัณฑ์รายการนั้นใน ER Nurse Task List เป็นสถานะรับ Order แล้ว ตรงกับที่ทำจาก Order Summary

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ไม่อยู่ใน AC — เพิ่มตามที่ผู้ใช้สั่ง (29 ต.ค.) อิง PR cortex-api #2940 ที่ผูก request id เข้ากับ ER Nurse Task
```

### TC-SBH-3158-032 - ตรวจสอบปุ่มใน Order Summary เปลี่ยนตาม เมื่อรับ Order เวชภัณฑ์จาก ER Nurse Task List

Status: Not Run · Priority: High · Labels: เหมือน TC-031

```
TC ID: TC-SBH-3158-032
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Nurse Task List
2. กด รับ Order งานของเวชภัณฑ์รายการที่ 2 ของผู้ป่วย C
3. เปิดผู้ป่วย C > Order Summary > ดูแถวเวชภัณฑ์รายการเดียวกัน

## Expected Result
แถวเวชภัณฑ์รายการนั้นใน Order Summary ไม่มีปุ่ม รับ Order แล้ว ตรงกับที่ทำจาก ER Nurse Task List

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ไม่อยู่ใน AC — เพิ่มตามที่ผู้ใช้สั่ง (29 ต.ค.) อิง PR cortex-api #2940 ที่ผูก request id เข้ากับ ER Nurse Task
```


## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - หลังรับ Order / เสร็จสิ้น / ยกเลิก Order แถวแสดงอะไร — ปุ่มไหนหาย ปุ่มไหนเหลือ (แถวยามีปุ่มเปลี่ยนตามสถานะ แต่การ์ดนี้ไม่ได้ระบุ) · ร่างนี้เขียน Expected กว้าง ๆ ไว้ ต้องยืนยันกับแอปจริงก่อนรัน
  - กด เสร็จสิ้น ได้ทันทีโดยไม่ต้องรับ Order ก่อนหรือไม่ (แถวยาในรูปการ์ดแสดง ให้ยาแล้ว ตั้งแต่ยังไม่รับ Order)
  - เสร็จสิ้น / ยกเลิก Order มีหน้าต่างยืนยันหรือไม่ · ถามผู้ทำและเวลาเหมือน "ให้ยาแล้ว" หรือไม่ · ยกเลิก Order ใส่เหตุผลได้หรือไม่
  - ปุ่มพยาบาลกระทบสถานะงานของรังสี / Lab หรือไม่ (ตารางรังสี / Lab มีคอลัมน์ "สถานะ" ของตัวเอง เช่น Examination) · ยกเลิก Order แล้วคำสั่ง / ค่าใช้จ่ายยังอยู่หรือไม่
  - ER Nurse Task List แสดงงานของ หัตถการ / รังสี / Lab / เวชภัณฑ์ หรือไม่ และสถานะชื่ออะไร (AC ไม่ได้เขียน · TC 025–032 เพิ่มตามที่ผู้ใช้สั่ง ต้องยืนยันกับแอปจริงก่อนรัน) · เสร็จสิ้น / ยกเลิก Order ต้องตรงกันด้วยหรือไม่
- **Validation**
  - Checkbox "เลือกทุกรายการของแต่ละประเภท" นับต่อ section (เช่น รังสี - CT แยกกับ รังสี - MRI · Lab แยกตามหมวดและวัน) หรือรวมทั้งประเภท
  - เลือกรายการต่างประเภทพร้อมกัน (เช่น ยา + Lab) แถบแสดงปุ่มอะไร · ปุ่ม เสร็จสิ้น ใช้กับยาได้ไหม
  - เลือกรายการที่ยังไม่รับ Order แล้วกด เสร็จสิ้น จากแถบ ได้หรือไม่
- **Error handling**
  - เลือกหลายรายการแล้วบางรายการทำไม่ได้ (ถูกยกเลิก / เสร็จสิ้นไปแล้วจากที่อื่น) แจ้งอย่างไร
- **Permission / role**
  - role ไหนเห็นและกด Action ได้ (แถวยาใช้สิทธิ์ `nurse-task:edit` ตาม SBH-2593 — ประเภทใหม่ใช้สิทธิ์เดียวกันหรือไม่)
- **Edge cases**
  - รายการที่แพทย์ยังไม่ลงนาม (หัตถการ / รังสี / Lab / เวชภัณฑ์) แสดง Action หรือไม่ (แถวยาที่ยังไม่ลงนามทำงานพยาบาลไม่ได้ตาม SBH-2593)
  - แพทย์ยกเลิกคำสั่งหลังพยาบาลรับ Order แล้ว — แถวแสดงอย่างไร
  - ER IPD (มี AN แล้ว) ส่วน ORDER FOR ONE DAY (ก่อน admit) มี Action ชุดนี้ด้วยหรือไม่
