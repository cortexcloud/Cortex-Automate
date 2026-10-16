# Draft Test Structure — SBH-1730

> สถานะ: **สร้างใน Linear แล้ว (2026-10-16)**
> - EXE SBH-2661 → HPY SBH-2662 (TC 001–006 = SBH-2663–2668)
> - Env: Dev-X / SBH Prod · QA Module : Reception · QA Sub-module / Feature : Visit Management (label ใหม่ สร้างแล้ว)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า (ผู้ใช้สั่ง 2026-10-16)
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)

Requirement: SBH-1730 — [OPD] [Registration] ปรับชื่อ/ตัวเลือก Visit/การรับบริการ Refill เมื่อคนไข้มาเติมยา
URL: https://linear.app/cortexcloud/issue/SBH-1730
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: Urgent · State: Ready for Testing
Labels: 🐷 VERSION 2.8.0, 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy · Assignee: Puwadon (Pooh) · ผูก Cycle อยู่ → Run Type = CT
Sub-Issue: ไม่มี · PR: cortex-testing "add canonical refill queue type" · cortex-api "remove refill appointment writes"

หน้าจอ (จากรูปในการ์ด): ข้อมูลผู้ป่วย → แท็บ "จัดการ Visit" → ตาราง "รายการเข้ารับบริการ" (คอลัมน์ ประเภท · คลินิก/ประเภทบริการ · แพทย์ · เวลานัด · ประเภทบริการ · Note/Remark) และช่อง "Walk-in ไป คลินิก … หรือรับบริการ [เลือกบริการ]" + ปุ่ม "สร้าง"

| AC / BR | Expected Results | TC |
|---|---|---|
| AC3 | จัดการ Visit → เลือกบริการ (Walk-in) มีตัวเลือก "รับยาต่อเนื่อง (Refill)" | 001 |
| AC4 | เลือก "รับยาต่อเนื่อง (Refill)" แล้วบันทึกประเภทบริการของ Visit ถูกต้อง | 002 |
| AC1 / BR1 | คอลัมน์ "คลินิก/ประเภทบริการ" ของ Visit Refill แสดง "รับยาต่อเนื่อง (Refill)" แทน "คิวรับยาหุ่นยนต์ (Robot)" | 003 |
| AC2 | หน้าจัดการ Visit แสดงประเภทบริการ "รับยาต่อเนื่อง (Refill)" สำหรับ Visit ที่เกี่ยวข้อง | 004 |
| BR3 | หมอสั่ง Order Refill → สร้างแค่ Task เติมยา ไม่สร้างนัดหมาย | 005 |
| BR3 | หมอสั่ง Order Refill → ไม่สร้าง Visit ไว้ล่วงหน้า | 006 |
| BR4 | ไม่ Fix วันของ Task | ไม่สร้าง TC — ครอบคลุมใน SBH-1738 TC-002 / 003 (สร้างใบยาได้แม้ไม่ตรงวันนัด) |

---

## EXE - CT - 2.8.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: UAT#3 Cashier, Pharmacy, Queue
Labels: 🐷 VERSION 2.8.0, 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy, QA Module : Reception, QA Sub-module / Feature : Visit Management, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.0
- Module: OPD / Registration
- Requirement ที่อ้างอิง: SBH-1730 — [OPD] [Registration] ปรับชื่อ/ตัวเลือก Visit/การรับบริการ Refill เมื่อคนไข้มาเติมยา
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ตัวเลือกบริการ "รับยาต่อเนื่อง (Refill)" สำหรับ Walk-in และการบันทึก Visit (AC3, AC4)
- การแสดงประเภทบริการ Refill ในหน้าจัดการ Visit (AC1, AC2)
- Order Refill ของแพทย์ไม่สร้างนัดหมาย / Visit ล่วงหน้า (BR3)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1730-HPY - เปิด Visit Walk-in ประเภทรับยาต่อเนื่อง (Refill) และแสดงประเภทบริการถูกต้อง

Status: Ready for Testing · Labels: requirement labels + QA Module : Reception + QA Sub-module / Feature : Visit Management + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1730-HPY
- Case Type: Happy
- Suffix: HPY
- Module: OPD / Registration
- Requirement ที่อ้างอิง: SBH-1730 — [OPD] [Registration] ปรับชื่อ/ตัวเลือก Visit/การรับบริการ Refill เมื่อคนไข้มาเติมยา

วัตถุประสงค์
- ยืนยันว่าเวชระเบียนเปิด Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" ได้ ระบบแสดงชื่อประเภทบริการถูกต้อง และ Order Refill ของแพทย์ไม่สร้างนัดหมาย / Visit ไว้ล่วงหน้า

ขอบเขต Requirement
- AC1 / BR1: คอลัมน์ "คลินิก/ประเภทบริการ" แสดง "รับยาต่อเนื่อง (Refill)" แทน "คิวรับยาหุ่นยนต์ (Robot)" (Remap)
- AC2: หน้าจัดการ Visit แสดงประเภทบริการ "รับยาต่อเนื่อง (Refill)"
- AC3: เลือกบริการ Walk-in มีตัวเลือก "รับยาต่อเนื่อง (Refill)"
- AC4: บันทึกประเภทบริการของ Visit เป็น "รับยาต่อเนื่อง (Refill)"
- BR3: Order Refill สร้างแค่ Task เติมยา ไม่สร้าง Visit หรือนัดหมาย

ความเสี่ยง
- เวชระเบียนเปิด Visit ผิดประเภท ทำให้ห้องยาดึง Task เติมยามาสร้างใบยาไม่ได้
- มีนัดหมาย / Visit ค้างจาก Order Refill ทั้งที่คนไข้ยังไม่มา

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1730-001 - แสดงตัวเลือกรับยาต่อเนื่อง (Refill) ในช่องเลือกบริการของ Walk-in

Status: Not Run · Labels: requirement labels + QA Module : Reception + QA Sub-module / Feature : Visit Management + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1730-001
- Scenario ID: TS-SBH-1730-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1730 — [OPD] [Registration] ปรับชื่อ/ตัวเลือก Visit/การรับบริการ Refill เมื่อคนไข้มาเติมยา

Preconditions
1. Login ด้วยผู้ใช้เวชระเบียน
2. มีคนไข้ทดสอบ 1 ราย

Test Data
- คนไข้ทดสอบ 1 ราย

Test Steps
1. เปิดข้อมูลคนไข้ > แท็บจัดการ Visit
2. เปิดช่อง "หรือรับบริการ" (เลือกบริการ) ของ Walk-in

Expected Result
- รายการบริการมีตัวเลือก "รับยาต่อเนื่อง (Refill)"

Actual Result
- -

หมายเหตุ
- AC3 · BR2
```

### TC-SBH-1730-002 - บันทึก Visit Walk-in ประเภทรับยาต่อเนื่อง (Refill) แล้วประเภทบริการถูกต้อง

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1730-002
- Scenario ID: TS-SBH-1730-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1730 — [OPD] [Registration] ปรับชื่อ/ตัวเลือก Visit/การรับบริการ Refill เมื่อคนไข้มาเติมยา

Preconditions
1. Login ด้วยผู้ใช้เวชระเบียน
2. มีคนไข้ทดสอบที่ยังไม่มี Visit วันนี้

Test Data
- บริการ: รับยาต่อเนื่อง (Refill)

Test Steps
1. เปิดข้อมูลคนไข้ > แท็บจัดการ Visit
2. ช่อง "หรือรับบริการ" เลือก "รับยาต่อเนื่อง (Refill)"
3. กด "สร้าง"
4. ดูแถว Visit ที่สร้างในตาราง "รายการเข้ารับบริการ"

Expected Result
- สร้าง Visit ได้ ประเภท Walk-in และประเภทบริการของ Visit เป็น "รับยาต่อเนื่อง (Refill)"

Actual Result
- -

หมายเหตุ
- AC4
```

### TC-SBH-1730-003 - แสดงคอลัมน์คลินิก/ประเภทบริการเป็นรับยาต่อเนื่อง (Refill) แทนคิวรับยาหุ่นยนต์ (Robot)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1730-003
- Scenario ID: TS-SBH-1730-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1730 — [OPD] [Registration] ปรับชื่อ/ตัวเลือก Visit/การรับบริการ Refill เมื่อคนไข้มาเติมยา

Preconditions
1. ทำ TC-SBH-1730-002 แล้ว (มี Visit ประเภทรับยาต่อเนื่อง (Refill))

Test Data
- Visit จาก TC-SBH-1730-002

Test Steps
1. เปิดข้อมูลคนไข้ > แท็บจัดการ Visit
2. ดูคอลัมน์ "คลินิก/ประเภทบริการ" ของ Visit Refill

Expected Result
- คอลัมน์ "คลินิก/ประเภทบริการ" แสดง "รับยาต่อเนื่อง (Refill)" ไม่ใช่ "คิวรับยาหุ่นยนต์ (Robot)"

Actual Result
- -

หมายเหตุ
- AC1 · BR1 (Remap)
```

### TC-SBH-1730-004 - แสดงคอลัมน์ประเภทบริการเป็นรับยาต่อเนื่อง (Refill) ในหน้าจัดการ Visit

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1730-004
- Scenario ID: TS-SBH-1730-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1730 — [OPD] [Registration] ปรับชื่อ/ตัวเลือก Visit/การรับบริการ Refill เมื่อคนไข้มาเติมยา

Preconditions
1. ทำ TC-SBH-1730-002 แล้ว

Test Data
- Visit จาก TC-SBH-1730-002

Test Steps
1. เปิดข้อมูลคนไข้ > แท็บจัดการ Visit
2. ดูคอลัมน์ "ประเภทบริการ" ของ Visit Refill

Expected Result
- คอลัมน์ "ประเภทบริการ" แสดง "รับยาต่อเนื่อง (Refill)" ตรงกับคอลัมน์ "คลินิก/ประเภทบริการ"

Actual Result
- -

หมายเหตุ
- AC2 · Requirement ข้อ 1 (ข้อความเดียวกันทั้ง 2 คอลัมน์)
```

### TC-SBH-1730-005 - ตรวจสอบไม่มีนัดหมาย Refill ถูกสร้าง เมื่อแพทย์สั่ง Order Refill

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1730-005
- Scenario ID: TS-SBH-1730-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1730 — [OPD] [Registration] ปรับชื่อ/ตัวเลือก Visit/การรับบริการ Refill เมื่อคนไข้มาเติมยา

Preconditions
1. Login ด้วยผู้ใช้แพทย์ และมีคนไข้ทดสอบที่มี OPD Visit เปิดอยู่
2. คนไข้ยังไม่มีนัดหมายล่วงหน้า

Test Data
- Order Refill 3 รอบ

Test Steps
1. แพทย์สั่งยา Refill 3 รอบที่ CPOE แล้วส่งคำสั่ง / Sign
2. เปิดรายการนัดหมายของคนไข้

Expected Result
- ไม่มีนัดหมายถูกสร้างจาก Order Refill

Actual Result
- -

หมายเหตุ
- BR3 · PR cortex-api "remove refill appointment writes"
```

### TC-SBH-1730-006 - ตรวจสอบไม่มี Visit ล่วงหน้าถูกสร้าง เมื่อแพทย์สั่ง Order Refill

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1730-006
- Scenario ID: TS-SBH-1730-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1730 — [OPD] [Registration] ปรับชื่อ/ตัวเลือก Visit/การรับบริการ Refill เมื่อคนไข้มาเติมยา

Preconditions
1. ทำ TC-SBH-1730-005 แล้ว (แพทย์สั่ง Order Refill 3 รอบแล้ว)

Test Data
- คนไข้จาก TC-SBH-1730-005

Test Steps
1. เปิดข้อมูลคนไข้ > แท็บจัดการ Visit / ประวัติรับบริการ
2. ดูว่ามี Visit ของรอบเติมยาถูกสร้างไว้ล่วงหน้าหรือไม่
3. เภสัชเปิดแท็บ Order เติมยา ดู Task ของคนไข้

Expected Result
- ไม่มี Visit ของรอบเติมยาถูกสร้างไว้ล่วงหน้า และมีแค่ Task เติมยาในแท็บ Order เติมยา

Actual Result
- -

หมายเหตุ
- BR3
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- AC1 กับ AC2: ทั้งสองข้อบอกให้แสดง "รับยาต่อเนื่อง (Refill)" ในหน้าจัดการ Visit แต่ไม่ชัดว่า AC1 หมายถึงคอลัมน์ "คลินิก/ประเภทบริการ" และ AC2 หมายถึงคอลัมน์ "ประเภทบริการ" หรือคนละหน้า — ร่างนี้แยกตามคอลัมน์
- BR1 (Remap): Visit Refill เก่าที่เคยแสดง "คิวรับยาหุ่นยนต์ (Robot)" ต้องเปลี่ยนเป็นข้อความใหม่ด้วยหรือไม่
- ตัวเลือก "คิวรับยาหุ่นยนต์ (Robot)" เดิมยังต้องอยู่ในรายการเลือกบริการหรือไม่ ถ้ายังอยู่ Visit ที่เลือก Robot จริงต้องแสดง Robot
- ข้อมูลอื่นที่ใช้ Visit Refill (คิว / บัตรคิว / รายงาน) ต้องแสดงชื่อใหม่ด้วยหรือไม่
- version: label การ์ด = 🐷 VERSION 2.8.0 ตรงกับชื่อ PR V2.8.0

Validation
- -

Error handling
- -

Permission / role
- ไม่ระบุ role ที่เปิด Visit Refill ได้ (ใช้ผู้ใช้เวชระเบียนเป็นค่าตั้งต้น)

Edge cases
- คนไข้มี Visit อื่นเปิดอยู่วันเดียวกันแล้ว (เช่น OPD) จะเปิด Visit Refill เพิ่มได้หรือไม่
