# Draft Test Structure — SBH-1717

> สถานะ: **สร้างใน Linear แล้ว (2026-10-21)**
> - EXE SBH-2846 (EXE - RT - 2.8.0) → HPY SBH-2847 (TC 001–003 = SBH-2849–2851 · TC 005–007 = SBH-2853–2855) · EDG SBH-2848 (TC 004 = SBH-2852)
> - ทดสอบ dev-x 21 ต.ค. 2026: ผ่านครบ 7 TC · ลงผลใต้หัว Dev-X + สถานะ Done on dev-x (spec `tests/modules/opd/SBH-1717-rx-create-revert-cancel.spec.ts`)
> - จากการทดสอบ: ยกเลิก / ย้อนกลับใบยา Refill แล้ว Task กลับเป็น "ยังไม่เติม" (ตอบ gap ข้อ 2) · สร้างใบยาจากรอบเติมยาต้องมี Visit ของวันนี้
> - QA Module : Pharmacy · QA Sub-module / Feature : Prescription · QA Run : Retest — ผู้ใช้ยืนยันแล้ว (2026-10-21) พร้อม Run Type RT และ Env Dev-X / SBH Prod
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · วงเล็บท้ายชื่อบอกหน้าที่ต้องดู
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)
> - Env: Dev-X / SBH Prod (default) · Run Type: RT (การ์ดบั๊กกลับมาเทสหลังแก้ · การ์ดไม่ผูก Cycle)

Requirement: SBH-1717 — [Bug][Pharmacy][สร้างใบยา] - ไม่สามารถ สร้าง/ย้อนกลับ/ยกเลิก ใบยาได้
URL: https://linear.app/cortexcloud/issue/SBH-1717
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: Urgent · State: Testing · Cycle: ไม่ผูก · Milestone: ไม่มี
Labels: 🐞 BUG, For OPD Biz Sim - SBH, 🐷 VERSION 2.8.0, SBH - UAT D4 Pharmacy · Assignee: Suchat Chancherngsilapakul
PR: cortex-api#2366 "prevent duplicate refill prescription items" · cortex-ui#1881 "load and submit multiple refill schedules" · Sub-Issue: ไม่มี · คอมเมนต์: ไม่มี

สรุปบั๊กจากการ์ด
- Expected: ระบบต้องกดสร้างใบยาได้ · Actual: กดแล้วขึ้น Error
- สร้างใบยา → 500 "Failed to create OPD prescription: encounter EN is required"
- ย้อนกลับไปแก้ไขใบยา → 500 "Failed to decompose prescription"
- ยกเลิกใบยา → 500 "Failed to cancel prescription"
- รูปในการ์ด: หน้า Prescription ของคนไข้ Visit "คำขอ Walk-in" มีใบยา 690901-01003 (ใบยารอจัด · Home med) และส่วน "ยา Refill" ที่ยังมีปุ่ม "สร้างใบยา" · แท็บเบราว์เซอร์ในคลิปชื่อ "Jame Refill 7" → เคสที่เจอบั๊กคือคนไข้ Refill

| ที่มา | Expected Results | TC |
|---|---|---|
| Expected ในการ์ด · ขั้นที่ 2 | สร้างใบยาได้ ไม่ขึ้น Error "encounter EN is required" | 001 |
| ขั้นที่ 3 (ย้อนกลับ) | ย้อนกลับไปแก้ไขใบยาได้ ไม่ขึ้น Error "Failed to decompose prescription" | 002 |
| ขั้นที่ 3 (ยกเลิก) | ยกเลิกใบยาได้ ไม่ขึ้น Error "Failed to cancel prescription" | 003 |
| PR cortex-api#2366 | สร้างใบยาใหม่หลังย้อนกลับไปแก้ไข รายการยาไม่ซ้ำ | 004 |
| ผู้ใช้สั่งเพิ่ม (2026-10-21) | ใบยา OPD ปกติ: สร้าง / ย้อนกลับ / ยกเลิก ได้ ไม่ขึ้น Error | 005 · 006 · 007 |

ข้อมูลตั้งต้น
- คนไข้ 1 (Refill): ไม่ผ่านห้องตรวจ (Visit Walk-in รับยาต่อเนื่อง) มี Task เติมยาในแท็บ Order เติมยา
  ทางเข้า: user เภสัช > การจัดการรายการสั่งยา OPD > แท็บ Order เติมยา > เลือก Task > นำไปสร้างใบยา > หน้าสร้างใบยา
- คนไข้ 2 (OPD ปกติ): แพทย์สั่งยาปกติและส่งคำสั่งแล้ว
  ทางเข้า: user เภสัช > การจัดการรายการสั่งยา OPD > แท็บ Order รอยืนยัน > คลิกชื่อคนไข้ > หน้าสร้างใบยา
ลำดับเทส: คนไข้ 1 → 001 → 002 → 004 → 003 · คนไข้ 2 → 005 → 006 → 007

---

## EXE - RT - 2.8.0

Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Run : Retest

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: RT
- Scope / Version: 2.8.0
- Module: Pharmacy / Prescription
- Requirement ที่อ้างอิง: SBH-1717 — [Bug][Pharmacy][สร้างใบยา] - ไม่สามารถ สร้าง/ย้อนกลับ/ยกเลิก ใบยาได้
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- สร้างใบยาของคนไข้ Refill (Visit Walk-in) ได้ ไม่ขึ้น Error
- ย้อนกลับไปแก้ไขใบยา และยกเลิกใบยา ได้ ไม่ขึ้น Error
- สร้างใบยาใหม่หลังย้อนกลับ รายการยาไม่ซ้ำ (PR cortex-api#2366)
- สร้าง / ย้อนกลับ / ยกเลิก ใบยา OPD ปกติ (ไม่ใช่ Refill) ได้ ไม่ขึ้น Error
- ลำดับเทส: คนไข้ Refill 001 → 002 → 004 → 003 · คนไข้ OPD ปกติ 005 → 006 → 007

หมายเหตุ
- สร้างจาก Expected Result และ Steps to Reproduce ของการ์ดบั๊กโดยตรง (การ์ดไม่มีตาราง AC)
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1717-HPY - ห้องยาสร้าง ย้อนกลับ และยกเลิกใบยาได้ ทั้งคนไข้ Refill และ OPD ปกติ

Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1717-HPY
- Case Type: Happy
- Suffix: HPY
- Module: Pharmacy / Prescription
- Requirement ที่อ้างอิง: SBH-1717

วัตถุประสงค์
- ยืนยันว่าเภสัชสร้างใบยา ย้อนกลับไปแก้ไขใบยา และยกเลิกใบยา ได้โดยไม่ขึ้น Error 500 ทั้งคนไข้ Refill และคนไข้ OPD ปกติ

ขอบเขต Requirement
- Expected Result ของการ์ด · Steps to Reproduce ขั้นที่ 1–3 · ภาพ / คลิปในการ์ด
- ใบยา OPD ปกติ: ผู้ใช้สั่งเพิ่ม (2026-10-21) เพราะการ์ดไม่ได้จำกัดว่าเป็นเฉพาะ Refill

ความเสี่ยง
- เภสัชจ่ายยาให้คนไข้ไม่ได้เพราะสร้างใบยาไม่ได้ (ทั้งยา Refill และยาปกติ)
- สร้างใบยาผิดแล้วแก้ไขหรือยกเลิกไม่ได้ ใบยาผิดค้างในระบบ

หมายเหตุ
- อิงตาม Expected Result ของการ์ดบั๊ก
```

### TC-SBH-1717-001 - สร้างใบยาเติมยาของคนไข้ Refill ได้โดยไม่ขึ้น Error (หน้าสร้างใบยา ห้องยา)
Priority: Urgent · Type: Functional
```
Test Step
1. เตรียมคนไข้ Refill ที่ไม่ผ่านห้องตรวจ (Visit Walk-in รับยาต่อเนื่อง) ที่มี Task เติมยาในแท็บ Order เติมยา
2. Login ระบบด้วย user เภสัช > การจัดการรายการสั่งยา OPD > แท็บ Order เติมยา > เลือก Task ของคนไข้ > นำไปสร้างใบยา
3. กดปุ่ม "สร้างใบยา"

Expected Result
ไม่ขึ้น Error "Failed to create OPD prescription: encounter EN is required" · ระบบสร้างใบยาสำเร็จ แสดงหน้า Prescription "ใบยาเลขที่ ..." พร้อมรายการยา Refill
```

### TC-SBH-1717-002 - ย้อนกลับไปแก้ไขใบยาเติมยาของคนไข้ Refill ได้โดยไม่ขึ้น Error (หน้า Prescription ห้องยา)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้ใบยาที่สร้างจาก `TC-SBH-1717-001`
2. ที่หน้า Prescription กดปุ่ม "ย้อนกลับ" ▾ > เลือก "ย้อนกลับ ไปแก้ไข"

Expected Result
ไม่ขึ้น Error "Failed to decompose prescription" · ระบบกลับไปหน้าสร้างใบยา แสดงรายการยาเดิม และมีปุ่ม "สร้างใบยา" ให้กดได้
```

### TC-SBH-1717-003 - ยกเลิกใบยาเติมยาของคนไข้ Refill ได้โดยไม่ขึ้น Error (หน้า Prescription ห้องยา)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้ใบยาใหม่ที่สร้างจาก `TC-SBH-1717-004` (เทส 004 ก่อนข้อนี้)
2. ที่หน้า Prescription กดปุ่ม "ย้อนกลับ" ▾ > เลือก "ยกเลิกใบยา" > ยืนยันการยกเลิก
3. กลับไปที่การจัดการรายการสั่งยา OPD > แท็บ "ยกเลิกใบยา"

Expected Result
ไม่ขึ้น Error "Failed to cancel prescription" · ใบยาถูกยกเลิก และแสดงในแท็บ "ยกเลิกใบยา"
```

### TC-SBH-1717-005 - สร้างใบยา OPD ปกติได้โดยไม่ขึ้น Error (หน้าสร้างใบยา ห้องยา)
Priority: Urgent · Type: Functional
```
Test Step
1. เตรียมคนไข้ OPD อีกรายที่แพทย์สั่งยาปกติ (ไม่ใช่ Refill) 1 รายการ และส่งคำสั่งแล้ว
2. Login ระบบด้วย user เภสัช > การจัดการรายการสั่งยา OPD > แท็บ Order รอยืนยัน > คลิกชื่อคนไข้ > หน้าสร้างใบยา
3. กดปุ่ม "สร้างใบยา"

Expected Result
ไม่ขึ้น Error · ระบบสร้างใบยาสำเร็จ แสดงหน้า Prescription "ใบยาเลขที่ ..." พร้อมรายการยาที่แพทย์สั่ง
```

### TC-SBH-1717-006 - ย้อนกลับไปแก้ไขใบยา OPD ปกติได้โดยไม่ขึ้น Error (หน้า Prescription ห้องยา)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้ใบยาที่สร้างจาก `TC-SBH-1717-005`
2. ที่หน้า Prescription กดปุ่ม "ย้อนกลับ" ▾ > เลือก "ย้อนกลับ ไปแก้ไข"

Expected Result
ไม่ขึ้น Error "Failed to decompose prescription" · ระบบกลับไปหน้าสร้างใบยา แสดงรายการยาเดิม และมีปุ่ม "สร้างใบยา" ให้กดได้
```

### TC-SBH-1717-007 - ยกเลิกใบยา OPD ปกติได้โดยไม่ขึ้น Error (หน้า Prescription ห้องยา)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้หน้าสร้างใบยาหลังย้อนกลับจาก `TC-SBH-1717-006` > กดปุ่ม "สร้างใบยา" อีกครั้ง
2. ที่หน้า Prescription ของใบยาใหม่ กดปุ่ม "ย้อนกลับ" ▾ > เลือก "ยกเลิกใบยา" > ยืนยันการยกเลิก
3. กลับไปที่การจัดการรายการสั่งยา OPD > แท็บ "ยกเลิกใบยา"

Expected Result
ไม่ขึ้น Error "Failed to cancel prescription" · ใบยาถูกยกเลิก และแสดงในแท็บ "ยกเลิกใบยา"
```

---

## TS-SBH-1717-EDG - สร้างใบยาใหม่หลังย้อนกลับไปแก้ไข รายการยาไม่ซ้ำ

Labels: requirement labels + QA Module + QA Sub-module + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1717-EDG
- Case Type: Edge
- Suffix: EDG
- Module: Pharmacy / Prescription
- Requirement ที่อ้างอิง: SBH-1717

วัตถุประสงค์
- ยืนยันว่าหลังย้อนกลับไปแก้ไขแล้วสร้างใบยาใหม่ รายการยา Refill ไม่ถูกเพิ่มซ้ำในใบยา

ขอบเขต Requirement
- PR cortex-api#2366 "prevent duplicate refill prescription items" ที่ผูกกับการ์ด

ความเสี่ยง
- ใบยาใหม่มียาซ้ำ ทำให้จ่ายยาและคิดเงินเกิน

หมายเหตุ
- ได้จากชื่อ PR ที่ผูกกับการ์ด ไม่ได้อยู่ใน Expected Result ของการ์ด — ผู้ใช้ให้เก็บไว้ (2026-10-21)
```

### TC-SBH-1717-004 - สร้างใบยาใหม่หลังย้อนกลับไปแก้ไขโดยรายการยาไม่ซ้ำ (หน้าสร้างใบยา ห้องยา)
Priority: High · Type: Functional
```
Test Step
1. ใช้หน้าสร้างใบยาหลังย้อนกลับจาก `TC-SBH-1717-002` · จดรายการยาและจำนวนก่อนสร้าง
2. กดปุ่ม "สร้างใบยา"
3. ดูรายการยาในหน้า Prescription ของใบยาใหม่

Expected Result
ไม่ขึ้น Error · ใบยาใหม่มีรายการยาและจำนวนเท่ากับที่จดไว้ในขั้นที่ 1 ไม่มียาตัวเดียวกันซ้ำ 2 แถว
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- การ์ดไม่ได้บอกว่าบั๊กเกิดเฉพาะคนไข้ Refill หรือใบยา OPD ปกติด้วย — ผู้ใช้ให้เทสทั้ง 2 แบบ (2026-10-21): Refill = TC 001–004 · OPD ปกติ = TC 005–007
- หลังยกเลิกใบยา Task เติมยา / Order ต้องกลับไปสถานะไหน — การ์ดไม่ได้ระบุ จึงไม่สร้าง TC
- PR cortex-ui#1881 "load and submit multiple refill schedules" (สร้างใบยาจากหลายรอบเติมยา) — การ์ดไม่ได้เขียนพฤติกรรมไว้ จึงไม่สร้าง TC
- เลขใบยาหลังย้อนกลับแล้วสร้างใหม่ ใช้เลขเดิมหรือเลขใหม่ — การ์ดไม่ได้ระบุ (TC-004 จึงไม่ตรวจเลขใบยา)

Validation
- -

Error handling
- -

Permission / role
- -

Edge cases
- ยกเลิกใบยาที่จัดยาแล้ว / จ่ายยาแล้ว — การ์ดไม่ได้ระบุ
