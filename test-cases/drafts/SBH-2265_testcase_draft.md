# Draft Test Structure — SBH-2265

> สถานะ: **สร้างใน Linear แล้ว (2026-10-29)** — ผู้ใช้พิมพ์ "สร้างเลย" (ใช้ค่าที่เสนอทั้งหมด รวม Version 2.9.1)
> - EXE SBH-3332 (EXE - CT - 2.9.1) → HPY SBH-3333 → TC 001–012 = SBH-3335–3346 · EDG SBH-3334 → TC 013–015 = SBH-3347–3349
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee Suchat ทุกใบ · milestone ER - เก็บตก, edge case · TC ใช้ label `QA : Manual` · "สร้างโดย" เป็น Neranchara (บัญชีของ connector)
> - ชุดนี้ = EXE 1 + Scenario 2 (HPY / EDG) + TC 15 = 18 ใบ
> - scope ตาม AC 4 ข้อ + Note ใบนำทาง 3 ห้องของการ์ด · เรื่องที่การ์ดไม่ตอบอยู่ในหัวข้อ "Requirement gap" ท้ายไฟล์
> - ค่าที่เสนอ (รอผู้ใช้ยืนยัน): Run Type CT (การ์ดผูก Cycle) · Scope / Version 2.9.1 (label VERSION 2.9.1 ของการ์ด — แต่ PR ทั้ง 3 ตัวเขียน V2.10.0) ·
>   Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Queue
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — assignee ต้องใส่ ID ของ Suchat (`ac7ed47a-b74d-4a54-992f-5d09acad47f2`)
> - ⚠️ การ์ดอยู่สถานะ Waiting for Fixing Bugs — คอมเมนต์ 29 ต.ค. (Natthaphat) แจ้งบั๊ก "ขาดใบนำทาง": หน้าต่างพิมพ์มีแค่คิวการเงิน / คิวรับยา → TC 006–012 จะ Fail จนกว่าแก้

Requirement: SBH-2265 — [ER] [ QUEUE ] ปุ่ม Menu ปริ้นบัตรคิว รับยา และการเงิน / ใบนำทางไปแต่ละ Service
URL: https://linear.app/cortexcloud/issue/SBH-2265
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: Waiting for Fixing Bugs
Labels: 🍄 Improvement · Natthaphat ( MOD ) 🙈 · VERSION 2.9.1 · Assignee: Thanadon (Modern) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Sub-Issue: ยังไม่มี EXE / TC · Relations: ไม่มี
PR ที่แนบ: cortex-x #8874 "add er visit slip destination sections view" · cortex-ui #2533 "add er visit print menu for queues and service navigation" · cortex-api #2933 "add en and vn scope to queue with details filter"

## AC → TC

| AC / Note | Expected | TC |
|---|---|---|
| AC 4 วางที่ Order Summary | มีปุ่มเมนูพิมพ์บนหน้า Order Summary ของ ER | 001 |
| AC 2 Copy and Apply Section คิวการเงิน / คิวรับยา | หน้าต่างแสดงคิวการเงิน + คิวรับยา พร้อมเลขคิว และพิมพ์บัตรคิวได้ | 002 · 003 · 004 |
| AC 1 Copy จาก OPD | บัตรคิวที่พิมพ์จาก ER รูปแบบเดียวกับ OPD | 005 |
| AC 3 + Note ใบนำทาง ห้อง Lab (Code 23) | มี Order Lab → มีใบนำทาง หน่วยบริการ / สถานที่ = ห้องปฏิบัติการ ชั้น 6 | 006 · 007 · 013 |
| AC 3 + Note ใบนำทาง ห้อง X-Ray (Code q-img) | มี Order X-Ray → มีใบนำทาง หน่วยบริการ / สถานที่ = ห้อง(X-ray) | 008 · 009 · 014 |
| AC 3 + Note ใบนำทาง ห้องหัตถการ (Code 100) | มี Order หัตถการ → มีใบนำทาง หน่วยบริการ / สถานที่ = ห้องหัตถการ | 010 · 011 · 015 |
| Note รูปใบนำทาง | ข้อมูลผู้ป่วยบนใบนำทางตรงกับ Visit ER | 012 |

> เทคนิค: เงื่อนไข "เมื่อมี Order ..." ของแต่ละห้องใช้ Decision Table (มี Order / ไม่มี Order) → ด้าน "มี" = 006–011 · ด้าน "ไม่มี" = 013–015

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **ผู้ป่วย A (ER)**: เปิด Visit ER → คัดกรอง → ER Physician Note (เลือก Diagnosis) → One Day Order สั่ง ยา + Lab + X-Ray + หัตถการ แพทย์ลงนามแล้ว
  และผู้ป่วยมีคิวการเงิน / คิวรับยาแล้ว (ขั้นที่ทำให้ได้คิว ต้องยืนยันกับแอปจริงก่อน — ดู Requirement gap) → ใช้กับ TC 001–012
- **ผู้ป่วย B (ER)**: เหมือนผู้ป่วย A แต่สั่ง **ยาอย่างเดียว** (ไม่มี Lab / X-Ray / หัตถการ) → ใช้กับ TC 013–015
- user: แพทย์ ER (สั่ง + ลงนาม) · พยาบาล ER (กดพิมพ์)
- ผลบน SBH Prod: หน่วยบริการ / สถานที่ ใช้ค่าตาม Code Location ของ Prod (BA Note) — ค่า Expected ใน TC เป็นของ Dev-X

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | แสดงปุ่มเมนูพิมพ์บัตรคิวและใบนำทางบน Order Summary ของ ER | หน้า Order Summary มีปุ่มเมนูสำหรับพิมพ์บัตรคิวและใบนำทาง |
| 002 | HPY | แสดงคิวการเงินและคิวรับยาพร้อมเลขคิวในหน้าต่างพิมพ์บัตรคิว | แสดงหน้าต่าง "พิมพ์บัตรคิวและใบนำทาง ER" · section "คิวรับยา การเงิน และบริการ" มีแถวคิวการเงิน และคิวรับยา พร้อมเลขคิวและปุ่ม พิมพ์บัตรคิว ทุกแถว |
| 003 | HPY | ทดสอบพิมพ์บัตรคิวการเงินจากหน้าต่างพิมพ์บัตรคิว | แสดงบัตรคิวการเงินสำหรับพิมพ์ · เลขคิวบนบัตรตรงกับเลขคิวการเงินในหน้าต่าง |
| 004 | HPY | ทดสอบพิมพ์บัตรคิวรับยาจากหน้าต่างพิมพ์บัตรคิว | แสดงบัตรคิวรับยาสำหรับพิมพ์ · เลขคิวบนบัตรตรงกับเลขคิวรับยาในหน้าต่าง |
| 005 | HPY | ตรวจสอบบัตรคิวที่พิมพ์จาก ER ใช้รูปแบบเดียวกับบัตรคิวของ OPD | บัตรคิวจาก ER มีหัวข้อและการจัดวางข้อมูลเหมือนบัตรคิวจาก OPD |
| 006 | HPY | แสดงใบนำทางห้อง Lab ในหน้าต่างพิมพ์เมื่อผู้ป่วยมี Order Lab | หน้าต่างมีรายการใบนำทางไปห้องปฏิบัติการ ชั้น 6 พร้อมปุ่มพิมพ์ |
| 007 | HPY | ตรวจสอบหน่วยบริการและสถานที่บนใบนำทางห้อง Lab | หน่วยบริการ : ห้องปฏิบัติการ ชั้น 6 · สถานที่ : ห้องปฏิบัติการ ชั้น 6 |
| 008 | HPY | แสดงใบนำทางห้อง X-Ray ในหน้าต่างพิมพ์เมื่อผู้ป่วยมี Order X-Ray | หน้าต่างมีรายการใบนำทางไปห้อง(X-ray) พร้อมปุ่มพิมพ์ |
| 009 | HPY | ตรวจสอบหน่วยบริการและสถานที่บนใบนำทางห้อง X-Ray | หน่วยบริการ : ห้อง(X-ray) · สถานที่ : ห้อง(X-ray) |
| 010 | HPY | แสดงใบนำทางห้องหัตถการในหน้าต่างพิมพ์เมื่อผู้ป่วยมี Order หัตถการ | หน้าต่างมีรายการใบนำทางไปห้องหัตถการ พร้อมปุ่มพิมพ์ |
| 011 | HPY | ตรวจสอบหน่วยบริการและสถานที่บนใบนำทางห้องหัตถการ | หน่วยบริการ : ห้องหัตถการ · สถานที่ : ห้องหัตถการ |
| 012 | HPY | ตรวจสอบข้อมูลผู้ป่วยบนใบนำทางตรงกับ Visit ER | มีหัว "ใบนำทาง" และบาร์โค้ด · HN / ชื่อ-สกุล / อายุ / เพศ / VN / สิทธิหลัก ตรงกับผู้ป่วย A และ Visit ER ครั้งนี้ |
| 013 | EDG | ตรวจสอบไม่แสดงใบนำทางห้อง Lab เมื่อผู้ป่วยไม่มี Order Lab | หน้าต่างไม่มีรายการใบนำทางไปห้องปฏิบัติการ ชั้น 6 |
| 014 | EDG | ตรวจสอบไม่แสดงใบนำทางห้อง X-Ray เมื่อผู้ป่วยไม่มี Order X-Ray | หน้าต่างไม่มีรายการใบนำทางไปห้อง(X-ray) |
| 015 | EDG | ตรวจสอบไม่แสดงใบนำทางห้องหัตถการ เมื่อผู้ป่วยไม่มี Order หัตถการ | หน้าต่างไม่มีรายการใบนำทางไปห้องหัตถการ |

---

## EXE - CT - 2.9.1

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: 🍄 Improvement, Natthaphat ( MOD ) 🙈, VERSION 2.9.1, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Queue, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.1
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-2265 — [ER] [ QUEUE ] ปุ่ม Menu ปริ้นบัตรคิว รับยา และการเงิน / ใบนำทางไปแต่ละ Service
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ปุ่มเมนูพิมพ์บัตรคิวและใบนำทางบน Order Summary ของ ER
- พิมพ์บัตรคิวการเงิน / คิวรับยา (รูปแบบเดียวกับ OPD)
- พิมพ์ใบนำทางไปห้อง Lab / X-Ray / หัตถการ ตาม Order ที่มี

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2265-HPY - พยาบาลพิมพ์บัตรคิวและใบนำทางจาก Order Summary ของ ER

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2265-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-2265 — [ER] [ QUEUE ] ปุ่ม Menu ปริ้นบัตรคิว รับยา และการเงิน / ใบนำทางไปแต่ละ Service

วัตถุประสงค์
- ยืนยันว่าพยาบาลพิมพ์บัตรคิวการเงิน / คิวรับยา และใบนำทางไปห้อง Lab / X-Ray / หัตถการ ได้จากปุ่มเมนูบน Order Summary ของ ER

ขอบเขต Requirement
- AC 1: Copy จาก OPD
- AC 2: Section คิวการเงิน / คิวรับยา
- AC 3: Print ใบนำทางไปแต่ละ Service (Lab / X-Ray / หัตถการ)
- AC 4: วางที่ Order Summary

ความเสี่ยง
- ไม่มีใบนำทางในหน้าต่างพิมพ์ (บั๊กที่แจ้งไว้ 29 ต.ค.) → ผู้ป่วยไม่รู้ว่าต้องไปห้องไหน
- หน่วยบริการ / สถานที่บนใบนำทางผิดห้อง หรือใช้ค่า Dev-X บน Prod
- เลขคิวบนบัตรไม่ตรงกับคิวจริงของ Visit นี้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- 001–012 ใช้ผู้ป่วย A
```

### TC-SBH-2265-001 - แสดงปุ่มเมนูพิมพ์บัตรคิวและใบนำทางบน Order Summary ของ ER

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2265-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เปิดผู้ป่วย A > เมนูขวา Order Summary

## Expected Result
หน้า Order Summary มีปุ่มเมนูสำหรับพิมพ์บัตรคิวและใบนำทาง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2265-002 - แสดงคิวการเงินและคิวรับยาพร้อมเลขคิวในหน้าต่างพิมพ์บัตรคิว

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2265-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง

## Expected Result
แสดงหน้าต่าง "พิมพ์บัตรคิวและใบนำทาง ER"
section "คิวรับยา การเงิน และบริการ" มีแถว คิวการเงิน และ คิวรับยา พร้อมเลขคิวของผู้ป่วย A และปุ่ม พิมพ์บัตรคิว ทุกแถว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2265-003 - ทดสอบพิมพ์บัตรคิวการเงินจากหน้าต่างพิมพ์บัตรคิว

Status: Not Run · Priority: High · Labels: เหมือน TC-001 แต่ QA Type : Functional

```
TC ID: TC-SBH-2265-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง
3. กดปุ่ม พิมพ์บัตรคิว ในแถวคิวการเงิน

## Expected Result
แสดงบัตรคิวการเงินสำหรับพิมพ์
เลขคิวบนบัตรตรงกับเลขคิวการเงินในหน้าต่าง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2265-004 - ทดสอบพิมพ์บัตรคิวรับยาจากหน้าต่างพิมพ์บัตรคิว

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-2265-004
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง
3. กดปุ่ม พิมพ์บัตรคิว ในแถวคิวรับยา

## Expected Result
แสดงบัตรคิวรับยาสำหรับพิมพ์
เลขคิวบนบัตรตรงกับเลขคิวรับยาในหน้าต่าง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2265-005 - ตรวจสอบบัตรคิวที่พิมพ์จาก ER ใช้รูปแบบเดียวกับบัตรคิวของ OPD

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2265-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. ใช้บัตรคิวการเงินที่พิมพ์จาก TC-003
2. เทียบกับบัตรคิวการเงินที่พิมพ์จาก OPD (ตารางการจัดการหลังตรวจ ของผู้ป่วย OPD รายใดก็ได้)

## Expected Result
บัตรคิวจาก ER มีหัวข้อและการจัดวางข้อมูลเหมือนบัตรคิวจาก OPD

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2265-006 - แสดงใบนำทางห้อง Lab ในหน้าต่างพิมพ์เมื่อผู้ป่วยมี Order Lab

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-2265-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A (มี Order Lab) > Order Summary
2. กดปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง

## Expected Result
หน้าต่างมีรายการใบนำทางไปห้องปฏิบัติการ ชั้น 6 พร้อมปุ่มพิมพ์

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — มี Order Lab
```

### TC-SBH-2265-007 - ตรวจสอบหน่วยบริการและสถานที่บนใบนำทางห้อง Lab

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-2265-007
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก TC-006 กดพิมพ์ใบนำทางห้อง Lab

## Expected Result
ใบนำทางแสดง
หน่วยบริการ : ห้องปฏิบัติการ ชั้น 6
สถานที่ : ห้องปฏิบัติการ ชั้น 6

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: Dev-X ใช้ Code Service Unit 23 · SBH Prod ใช้ค่าตาม Code Location ของ Prod
```

### TC-SBH-2265-008 - แสดงใบนำทางห้อง X-Ray ในหน้าต่างพิมพ์เมื่อผู้ป่วยมี Order X-Ray

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-2265-008
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A (มี Order X-Ray) > Order Summary
2. กดปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง

## Expected Result
หน้าต่างมีรายการใบนำทางไปห้อง(X-ray) พร้อมปุ่มพิมพ์

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — มี Order X-Ray
```

### TC-SBH-2265-009 - ตรวจสอบหน่วยบริการและสถานที่บนใบนำทางห้อง X-Ray

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-2265-009
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก TC-008 กดพิมพ์ใบนำทางห้อง X-Ray

## Expected Result
ใบนำทางแสดง
หน่วยบริการ : ห้อง(X-ray)
สถานที่ : ห้อง(X-ray)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: Dev-X ใช้ Code Service Unit q-img · SBH Prod ใช้ค่าตาม Code Location ของ Prod
```

### TC-SBH-2265-010 - แสดงใบนำทางห้องหัตถการในหน้าต่างพิมพ์เมื่อผู้ป่วยมี Order หัตถการ

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-2265-010
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A (มี Order หัตถการ) > Order Summary
2. กดปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง

## Expected Result
หน้าต่างมีรายการใบนำทางไปห้องหัตถการ พร้อมปุ่มพิมพ์

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — มี Order หัตถการ
```

### TC-SBH-2265-011 - ตรวจสอบหน่วยบริการและสถานที่บนใบนำทางห้องหัตถการ

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-2265-011
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก TC-010 กดพิมพ์ใบนำทางห้องหัตถการ

## Expected Result
ใบนำทางแสดง
หน่วยบริการ : ห้องหัตถการ
สถานที่ : ห้องหัตถการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: Dev-X ใช้ Code Service Unit 100 · SBH Prod ใช้ค่าตาม Code Location ของ Prod
```

### TC-SBH-2265-012 - ตรวจสอบข้อมูลผู้ป่วยบนใบนำทางตรงกับ Visit ER

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2265-012
Case Type: Happy
Test Type: UIUX

## Test Step
1. ใช้ใบนำทางห้อง Lab ที่พิมพ์จาก TC-007
2. เทียบกับข้อมูลผู้ป่วย A บน Patient Banner

## Expected Result
ใบนำทางมีหัว "ใบนำทาง" และบาร์โค้ด
HN / ชื่อ-สกุล / อายุ / เพศ / VN / สิทธิหลัก ตรงกับผู้ป่วย A และ Visit ER ครั้งนี้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2265-EDG - ไม่แสดงใบนำทางของห้องที่ผู้ป่วยไม่มี Order

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2265-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-2265 — [ER] [ QUEUE ] ปุ่ม Menu ปริ้นบัตรคิว รับยา และการเงิน / ใบนำทางไปแต่ละ Service

วัตถุประสงค์
- ยืนยันว่าใบนำทางแต่ละห้องแสดง "เมื่อมี Order" ของห้องนั้นเท่านั้น

ขอบเขต Requirement
- Note: ห้อง Lab เมื่อมี Order Lab · ห้อง X-Ray เมื่อมี Order X-Ray · ห้องหัตถการ เมื่อมี Order หัตถการ

ความเสี่ยง
- แสดงใบนำทางทุกห้องตลอด → ผู้ป่วยไปห้องที่ไม่ได้มีงาน

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- 013–015 ใช้ผู้ป่วย B (สั่งยาอย่างเดียว)
```

### TC-SBH-2265-013 - ตรวจสอบไม่แสดงใบนำทางห้อง Lab เมื่อผู้ป่วยไม่มี Order Lab

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2265-013
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B (ไม่มี Order Lab) > Order Summary
2. กดปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง

## Expected Result
หน้าต่างไม่มีรายการใบนำทางไปห้องปฏิบัติการ ชั้น 6

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — ไม่มี Order Lab
```

### TC-SBH-2265-014 - ตรวจสอบไม่แสดงใบนำทางห้อง X-Ray เมื่อผู้ป่วยไม่มี Order X-Ray

Status: Not Run · Priority: Medium · Labels: เหมือน TC-013

```
TC ID: TC-SBH-2265-014
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B (ไม่มี Order X-Ray) > Order Summary
2. กดปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง

## Expected Result
หน้าต่างไม่มีรายการใบนำทางไปห้อง(X-ray)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — ไม่มี Order X-Ray
```

### TC-SBH-2265-015 - ตรวจสอบไม่แสดงใบนำทางห้องหัตถการ เมื่อผู้ป่วยไม่มี Order หัตถการ

Status: Not Run · Priority: Medium · Labels: เหมือน TC-013

```
TC ID: TC-SBH-2265-015
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย B (ไม่มี Order หัตถการ) > Order Summary
2. กดปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง

## Expected Result
หน้าต่างไม่มีรายการใบนำทางไปห้องหัตถการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — ไม่มี Order หัตถการ
```

---

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - ผู้ป่วย ER ได้คิวการเงิน / คิวรับยาตอนไหน (หลังแพทย์ลงนาม / หลัง Disposition / หลังพยาบาลจำหน่าย) — ต้องรู้เพื่อเตรียมผู้ป่วย A
  - ชื่อปุ่มเมนูบน Order Summary และตำแหน่ง (การ์ดเขียนแค่ "วางที่ Order Summary") · ร่างนี้เรียกว่า "ปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง"
  - มี Order Lab หลายรายการ / หลายหมวด → ใบนำทางห้อง Lab 1 ใบ หรือแยกตามรายการ
  - "X-Ray" นับเฉพาะ X-Ray หรือรวม CT / MRI / Ultrasound (รังสีประเภทอื่นไปห้องไหน)
  - ใบนำทางต้องโชว์ เวลานัดหมาย / แพทย์ หรือไม่ (รูปในการ์ดเป็น "-")
- **Validation**
  - ผู้ป่วยไม่มียา → ยังมีแถวคิวรับยาหรือไม่ (OPD เคยเป็นบั๊ก: ไม่สั่งยาแต่มีบัตรคิวห้องยา)
  - Order ที่แพทย์ยังไม่ลงนาม / ถูกยกเลิก → ยังนับเป็น "มี Order" ให้ออกใบนำทางหรือไม่
- **Error handling**
  - ยังไม่มีคิว (ยังไม่ถึงขั้นออกคิว) กดปุ่มเมนูแล้วแสดงอะไร
- **Permission / role**
  - role ไหนเห็นและกดปุ่มเมนูได้ (ร่างนี้ใช้พยาบาล ER) · แพทย์ ER เห็นด้วยหรือไม่
- **Edge cases**
  - SBH Prod: ค่า หน่วยบริการ / สถานที่ ตาม Code Location ของ Prod เป็นชื่ออะไร (BA Note ไม่ได้ระบุ) — ต้องได้ค่าก่อนลงผล Env SBH Prod
  - ผู้ป่วยมีหลาย Visit — เลขคิวในหน้าต่างเป็นของ Visit ER ครั้งนี้เท่านั้นหรือไม่ (PR cortex-api #2933 เพิ่มการกรองคิวตาม EN / VN แต่ AC ไม่ได้เขียน)
  - ER IPD (Admit แล้ว) ยังมีปุ่มเมนูนี้หรือไม่
