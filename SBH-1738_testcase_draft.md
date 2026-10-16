# Draft Test Structure — SBH-1738

> สถานะ: **สร้างใน Linear แล้ว (2026-10-16)**
> - EXE SBH-2632 → HPY SBH-2633 (TC 001–008 = SBH-2635–2642) · UHP SBH-2634 (TC 009–010 = SBH-2643–2644)
> - Env: Dev-X / SBH Prod · QA Module : Pharmacy · QA Sub-module / Feature : Prescription
> - ใส่เฉพาะ TC [Required] ที่จะทดสอบจริง
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)

Requirement: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit
URL: https://linear.app/cortexcloud/issue/SBH-1738
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: Urgent · State: Ready for Testing
Labels: 🍄 Improvement, 🐷 VERSION 2.8.0, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy · Assignee: Puwadon (Pooh) · ผูก Cycle อยู่ → Run Type = CT
Related: SBH-1734 (สถานะ Task เติมยา + ปุ่มนำไปสร้างใบยา) · SBH-1199 (การ์ดรวมงาน Refill) · Sub-Issue: CTXN-8884 (Design Task — Done)

| AC / BR | Expected Results | TC |
|---|---|---|
| To be | ดึง Task Refill ได้มากกว่า 1 Task ต่อ 1 Visit | 001 |
| AC1 | Merge ได้เฉพาะ Task ของคนไข้คนเดียวกัน | 001, 009 |
| AC2 | Task ที่วันนัดเติมยาไม่ตรง (มาก่อน / มาหลังกำหนด) ยังสร้างใบยาได้ | 002, 003 |
| AC3 | ใบยาที่ Merge แต่ละรายการแสดงรอบเติมยาของตัวเอง | 004 |
| AC4 | Task จากแพทย์คนละคนอยู่ใบยาเดียวกันได้ อ้างอิงแพทย์ผู้สั่งของตัวเอง | 005 |
| AC5 | Task ที่ Merge แล้วเป็น "กำลังเติมยา" และ Merge ซ้ำไม่ได้ | 006, 010 |
| AC6 | Task คนละคลินิก หน้าสร้างใบยา (Refill) แยก Section ตามคลินิก | 007 |
| BR8 | Merge ยา Item เดียวกันต้องไม่รวมเป็นบรรทัดเดียว | 008 |
| BR5 | ไม่จำกัดจำนวน Task ต่อ 1 ใบยา | ไม่สร้าง TC — ทดสอบ "ไม่จำกัด" ไม่ได้ (ดู gap) |

ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมกันหลาย TC): แพทย์สั่งยา Refill ที่ CPOE ให้คนไข้ทดสอบ → เกิด Task ในแท็บ Order เติมยา · เปิด Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" (SBH-1730)

---

## EXE - CT - 2.8.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: UAT#3 Cashier, Pharmacy, Queue
Labels: 🍄 Improvement, 🐷 VERSION 2.8.0, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy, QA Module : Pharmacy, QA Sub-module / Feature : Prescription, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.0
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Merge Task Refill หลายรายการของคนไข้คนเดียวกันเป็นใบยาเดียว (AC1)
- สร้างใบยาจาก Task ที่ไม่ตรงวันนัดเติมยา (AC2)
- รอบเติมยา / แพทย์ผู้สั่ง / Section คลินิก ของแต่ละรายการหลัง Merge (AC3, AC4, AC6)
- สถานะ "กำลังเติมยา" และกันการ Merge ซ้ำ (AC5)
- ยา Item เดียวกันไม่ถูกรวมบรรทัด (BR8)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1738-HPY - Merge Task Refill หลายรายการของคนไข้คนเดียวกันเป็นใบยาเดียว

Status: Ready for Testing · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1738-HPY
- Case Type: Happy
- Suffix: HPY
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

วัตถุประสงค์
- ยืนยันว่าเภสัชดึง Task Refill หลายรายการของคนไข้คนเดียวกันมาสร้างใบยาเดียวได้ แม้ไม่ตรงวันนัด และข้อมูลแต่ละรายการยา (รอบเติมยา / แพทย์ / คลินิก) ยังถูกต้อง

ขอบเขต Requirement
- To be: ดึง Task Refill ได้มากกว่า 1 Task ต่อ 1 Visit
- AC1: Merge ได้เฉพาะ Task ของคนไข้คนเดียวกัน
- AC2: Task ที่ไม่ตรงวันนัดเติมยายังสร้างใบยาได้
- AC3: แต่ละรายการยาแสดงรอบเติมยาของตัวเอง
- AC4: แต่ละรายการยาอ้างอิงแพทย์ผู้สั่งของตัวเอง
- AC5: Task ที่ Merge แล้วเป็น "กำลังเติมยา"
- AC6: Task คนละคลินิกแยก Section ตามคลินิก
- BR8: ยา Item เดียวกันไม่ถูกรวมเป็นบรรทัดเดียว

ความเสี่ยง
- คนไข้มีหลายยา Refill ต้องรับยาหลายรอบ / หลายใบ
- คนไข้มาไม่ตรงวันนัดแล้วจ่ายยาไม่ได้
- รอบเติมยาหรือแพทย์ผู้สั่งสลับกันหลัง Merge ทำให้นับรอบผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### [Required] TC-SBH-1738-001 - บันทึกใบยาเดียวจาก Task Refill หลายรายการของคนไข้คนเดียวกัน

Status: Not Run · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1738-001
- Scenario ID: TS-SBH-1738-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. คนไข้ทดสอบ 1 ราย มี Task Refill สถานะ "ยังไม่เติม" อย่างน้อย 2 Task (ยาคนละตัว)
3. คนไข้มี Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" วันนี้

Test Data
- Task Refill ยา A และยา B ของคนไข้คนเดียวกัน

Test Steps
1. การจัดการรายการสั่งยา OPD > แท็บ Order เติมยา
2. ติ๊กเลือก Task ยา A และยา B
3. กด "นำไปสร้างใบยา"
4. ในหน้า "สร้างใบยา (Refill)" กดสร้างใบยา

Expected Result
- สร้างใบยาได้ 1 ใบ ที่มีทั้งยา A และยา B

Actual Result
- -

หมายเหตุ
- To be (มากกว่า 1 Task ต่อ 1 Visit) · AC1
```

### [Required] TC-SBH-1738-002 - บันทึกใบยาจาก Task Refill ที่เลยวันนัดเติมยามาแล้ว

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1738-002
- Scenario ID: TS-SBH-1738-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. คนไข้ทดสอบมี Task Refill สถานะ "ยังไม่เติม" ที่วันนัดเติมยาอยู่ก่อนวันนี้ (คนไข้มาหลังกำหนด)
3. คนไข้มี Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" วันนี้

Test Data
- Task Refill ที่วันนัดเติมยา < วันนี้

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task ที่เลยวันนัด
2. กด "นำไปสร้างใบยา"
3. กดสร้างใบยา

Expected Result
- สร้างใบยาได้ ไม่ถูกบล็อกเพราะไม่ตรงวันนัดเติมยา

Actual Result
- -

หมายเหตุ
- AC2 · BR2
- เทคนิค: EP — กลุ่ม "มาหลังกำหนด"
```

### [Required] TC-SBH-1738-003 - บันทึกใบยาจาก Task Refill ที่ยังไม่ถึงวันนัดเติมยา

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1738-003
- Scenario ID: TS-SBH-1738-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. คนไข้ทดสอบมี Task Refill สถานะ "ยังไม่เติม" ที่วันนัดเติมยาอยู่หลังวันนี้ (คนไข้มาก่อนกำหนด)
3. คนไข้มี Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" วันนี้

Test Data
- Task Refill ที่วันนัดเติมยา > วันนี้

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task ที่ยังไม่ถึงวันนัด
2. กด "นำไปสร้างใบยา"
3. กดสร้างใบยา

Expected Result
- สร้างใบยาได้ ไม่ถูกบล็อกเพราะไม่ตรงวันนัดเติมยา

Actual Result
- -

หมายเหตุ
- AC2 · BR2
- เทคนิค: EP — กลุ่ม "มาก่อนกำหนด"
```

### [Required] TC-SBH-1738-004 - แสดงรอบเติมยาของแต่ละรายการถูกต้อง ในใบยาที่ Merge จากหลาย Task

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1738-004
- Scenario ID: TS-SBH-1738-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. คนไข้ทดสอบมี Task Refill 2 Task ที่รอบต่างกัน เช่น ยา A รอบ 1/3 และยา B รอบ 2/3
3. คนไข้มี Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" วันนี้

Test Data
- ยา A รอบ 1/3 · ยา B รอบ 2/3

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task ยา A และยา B
2. กด "นำไปสร้างใบยา"
3. ดูรอบเติมยาของแต่ละรายการในหน้า "สร้างใบยา (Refill)"

Expected Result
- ยา A แสดงรอบ 1/3 และยา B แสดงรอบ 2/3 ไม่ถูกรวมหรือสลับกัน

Actual Result
- -

หมายเหตุ
- AC3 · BR3
```

### [Required] TC-SBH-1738-005 - แสดงแพทย์ผู้สั่งของแต่ละรายการถูกต้อง เมื่อ Merge Task จากแพทย์คนละคน

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1738-005
- Scenario ID: TS-SBH-1738-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. คนไข้ทดสอบมี Task Refill ยา A สั่งโดยแพทย์ 1 และยา B สั่งโดยแพทย์ 2
3. คนไข้มี Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" วันนี้

Test Data
- ยา A (แพทย์ 1) · ยา B (แพทย์ 2)

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task ยา A และยา B
2. กด "นำไปสร้างใบยา" > กดสร้างใบยา
3. ดูแพทย์ผู้สั่งของแต่ละรายการยาในใบยา

Expected Result
- สร้างใบยาเดียวได้ ยา A อ้างอิงแพทย์ 1 และยา B อ้างอิงแพทย์ 2

Actual Result
- -

หมายเหตุ
- AC4 · BR4
```

### [Required] TC-SBH-1738-006 - ตรวจสอบสถานะ Task เป็นกำลังเติมยา หลังนำไป Merge สร้างใบยา

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1738-006
- Scenario ID: TS-SBH-1738-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

Preconditions
1. ทำ TC-SBH-1738-001 แล้ว (สร้างใบยาจาก Task ยา A และยา B แล้ว ยังไม่จ่ายยา)

Test Data
- Task ยา A และยา B จาก TC-SBH-1738-001

Test Steps
1. กลับไปแท็บ Order เติมยา
2. ดูสถานะของ Task ยา A และยา B

Expected Result
- Task ทั้ง 2 รายการแสดงสถานะ "กำลังเติมยา"

Actual Result
- -

หมายเหตุ
- AC5 · BR6
```

### [Required] TC-SBH-1738-007 - แสดงรายการยาแยก Section ตามคลินิก เมื่อ Merge Task จากคนละคลินิก

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1738-007
- Scenario ID: TS-SBH-1738-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. คนไข้ทดสอบมี Task Refill ยา A จากคลินิก 1 และยา B จากคลินิก 2
3. คนไข้มี Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" วันนี้

Test Data
- ยา A (คลินิก 1) · ยา B (คลินิก 2)

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task ยา A และยา B
2. กด "นำไปสร้างใบยา"
3. ดูการจัดกลุ่มรายการยาในหน้า "สร้างใบยา (Refill)"

Expected Result
- รายการยาแยกเป็น 2 Section ตามคลินิก ยา A อยู่ Section คลินิก 1 และยา B อยู่ Section คลินิก 2

Actual Result
- -

หมายเหตุ
- AC6 · BR7
```

### [Required] TC-SBH-1738-008 - ตรวจสอบยา Item เดียวกันจากหลาย Task ไม่ถูกรวมเป็นบรรทัดเดียวหลัง Merge

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1738-008
- Scenario ID: TS-SBH-1738-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. คนไข้ทดสอบมี Task Refill 2 Task ที่เป็นยา Item เดียวกัน (จาก Order Refill คนละใบ)
3. คนไข้มี Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" วันนี้

Test Data
- ยา A จาก Order Refill ใบที่ 1 และยา A จาก Order Refill ใบที่ 2

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task ยา A ทั้ง 2 Task
2. กด "นำไปสร้างใบยา"
3. ดูรายการยาในหน้า "สร้างใบยา (Refill)"

Expected Result
- ยา A แสดงเป็น 2 บรรทัดแยกกัน ไม่ถูกรวมเป็นบรรทัดเดียว

Actual Result
- -

หมายเหตุ
- BR8
```

---

## TS-SBH-1738-UHP - ป้องกันการ Merge Task ที่ไม่อนุญาต

Status: Ready for Testing · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1738-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

วัตถุประสงค์
- ยืนยันว่าระบบไม่ให้ Merge Task ของคนไข้ต่างคน และไม่ให้ Task ที่กำลังเติมยาถูก Merge ซ้ำ

ขอบเขต Requirement
- AC1: Merge ได้เฉพาะ Task ของคนไข้คนเดียวกัน
- AC5: Task ที่ Merge แล้วเลือกไป Merge ซ้ำไม่ได้

ความเสี่ยง
- ยาของคนไข้คนหนึ่งไปอยู่ในใบยาของอีกคน
- จ่ายยารอบเดียวกันซ้ำ 2 ครั้ง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### [Required] TC-SBH-1738-009 - ตรวจสอบ Merge ไม่ได้ เมื่อเลือก Task Refill ของคนไข้ต่างคน

Status: Not Run · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Unhappy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1738-009
- Scenario ID: TS-SBH-1738-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. คนไข้ทดสอบ 2 ราย (คนไข้ X และ Y) แต่ละรายมี Task Refill สถานะ "ยังไม่เติม" อย่างน้อย 1 Task

Test Data
- Task ของคนไข้ X 1 รายการ · Task ของคนไข้ Y 1 รายการ

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task ของคนไข้ X และคนไข้ Y
2. กด "นำไปสร้างใบยา"

Expected Result
- ระบบไม่ให้ Merge Task ของคนไข้ต่างคนเป็นใบยาเดียวกัน

Actual Result
- -

หมายเหตุ
- AC1 · BR1 · การ์ดไม่ระบุว่ากันด้วยวิธีไหน (ปุ่มกดไม่ได้ / แจ้งเตือน) — ดู gap
```

### [Required] TC-SBH-1738-010 - ตรวจสอบ Task ที่สถานะกำลังเติมยาถูกเลือกไป Merge ซ้ำไม่ได้

Status: Not Run · Labels: เหมือน TC-009

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1738-010
- Scenario ID: TS-SBH-1738-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1738 — [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill ได้ ในกรณีที่มีการสร้างใบยา Refill มากกว่า 1 ใบ ใน 1 visit

Preconditions
1. ทำ TC-SBH-1738-006 แล้ว (Task ยา A และยา B สถานะ "กำลังเติมยา")

Test Data
- Task ยา A จาก TC-SBH-1738-001

Test Steps
1. แท็บ Order เติมยา > ลองติ๊กเลือก Task ยา A ที่สถานะ "กำลังเติมยา"
2. ถ้าเลือกได้ กด "นำไปสร้างใบยา"

Expected Result
- เลือก Task ที่สถานะ "กำลังเติมยา" ไป Merge สร้างใบยาใหม่ไม่ได้

Actual Result
- -

หมายเหตุ
- AC5 · BR6
- เทคนิค: State Transition — เส้นที่ต้องทำไม่ได้ (กำลังเติมยา → สร้างใบยาซ้ำ)
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- AC1: ไม่ระบุว่ากันการ Merge คนไข้ต่างคนด้วยวิธีไหน (checkbox เลือกไม่ได้ / ปุ่มกดไม่ได้ / แจ้งเตือน)
- BR8: "ถ้าสร้างทั้งหมดครั้งเดียว" Merge Order Refill กับ Order จาก OPD (Order รอยืนยัน) เข้าใบยาเดียวกัน — ขั้นตอนทำจริงยังไม่ชัด
- ใบยาที่ Merge แล้ว ต้องผูกกับ Visit Refill ของวันนี้หรือ Visit เดิมของแต่ละ Order
- version: label การ์ด = 🐷 VERSION 2.8.0 ตรงกับชื่อ PR V2.8.0

Validation
- BR5: "ไม่จำกัดจำนวน Task ต่อ 1 ใบยา" ทดสอบไม่ได้ตรง ๆ ถ้าจะทดสอบต้องกำหนดจำนวนที่ใช้ทดสอบ (เช่น 5 / 10 Task)

Error handling
- ไม่ระบุข้อความแจ้งเตือนเมื่อ Merge ไม่ได้

Permission / role
- ไม่ระบุ role (ใช้ผู้ใช้เภสัชเป็นค่าตั้งต้น)

Edge cases
- การ์ดนี้ขึ้นกับ SBH-1734 (checkbox + ปุ่ม "นำไปสร้างใบยา" + สถานะ Task) ถ้า SBH-1734 ยังไม่ผ่าน TC ส่วนใหญ่จะเล่นไม่ได้
- ยกเลิกใบยาที่ Merge แล้ว สถานะ Task กลับเป็น "ยังไม่เติม" หรือไม่ — การ์ดไม่ระบุ
