# Draft Test Structure — SBH-1734

> สถานะ: **สร้างใน Linear แล้ว (2026-10-16)**
> - EXE SBH-2645 → HPY SBH-2646 (TC 001–012 = SBH-2648–2659) · UHP SBH-2647 (TC 013 = SBH-2660)
> - Env: Dev-X / SBH Prod · QA Module : Pharmacy · QA Sub-module / Feature : Prescription
> - ชื่อ TC ใน Linear ไม่มี `[Required]` นำหน้า (ผู้ใช้สั่ง)
> - ใส่เฉพาะ TC [Required] ที่จะทดสอบจริง
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)

Requirement: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)
URL: https://linear.app/cortexcloud/issue/SBH-1734
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: Urgent · State: Ready for Testing
Labels: 🐷 VERSION 2.8.0, 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy · Assignee: Puwadon (Pooh) · ผูก Cycle อยู่ → Run Type = CT
Scope: เมนู การจัดการรายการสั่งยา OPD → แท็บ Order เติมยา · Sub-Issue: CTXN-8898 (Design Task — Done)

| AC / BR | Expected Results | TC |
|---|---|---|
| AC1 | แสดงสถานะ task 4 แบบ: ยังไม่เติม, กำลังเติมยา, เติมยาแล้ว, ยกเลิกแล้ว | 001, 002, 003 (+ 011 ยกเลิกแล้ว) |
| AC2 | Task "กำลังเติมยา" ถูกเลือกไปสร้างใบยาซ้ำไม่ได้ | 013 |
| AC3 | Filter สถานะเลือกได้หลายค่า จาก 5 ตัวเลือก | 004, 005 |
| AC4 | Column รายการยา และแพทย์ผู้สั่ง | 006, 007 |
| BR4 | Column "รอบเติมยา" แสดงแบบ รอบปัจจุบัน/รอบทั้งหมด (เช่น 1/3) | 008 |
| AC5 | ทุกแถวมี Checkbox เลือกได้หลายแถว | 009 |
| AC6 | เลือกหลายแถว → "นำไปสร้างใบยา" นำ task ไปสร้างใบยาพร้อมกันครั้งเดียว | 010 |
| Requirement ข้อ 6.2 | กด "นำไปสร้างใบยา" แล้ว task ไปรวมกับ Order รอยืนยัน (ถ้ามี) และพาไปหน้าสร้างใบยา | 012 |
| AC7 | เลือกแล้วกด "ยกเลิกรอบเติมยา" → สถานะเป็น "ยกเลิกแล้ว" ทุก task ที่เลือก | 011 |

ข้อมูลตั้งต้นที่ต้องเตรียม: แพทย์สั่งยา Refill ที่ CPOE ให้คนไข้ทดสอบ → เกิด Task ในแท็บ Order เติมยา · คนไข้มี Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" (SBH-1730)

---

## EXE - CT - 2.8.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: UAT#3 Cashier, Pharmacy, Queue
Labels: 🐷 VERSION 2.8.0, 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy, QA Module : Pharmacy, QA Sub-module / Feature : Prescription, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.0
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- สถานะ Task เติมยา 4 แบบ (AC1)
- Filter สถานะแบบ Multi-select (AC3)
- Column รายการยา / แพทย์ผู้สั่ง / รอบเติมยา (AC4, BR4)
- Checkbox และปุ่ม "นำไปสร้างใบยา" / "ยกเลิกรอบเติมยา" (AC5–AC7)
- กันการนำ Task "กำลังเติมยา" ไปสร้างใบยาซ้ำ (AC2)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1734-HPY - จัดการรายการเติมยาในแท็บ Order เติมยา: สถานะ Filter Column และการเลือกหลายรายการ

Status: Ready for Testing · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Suffix: HPY
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

วัตถุประสงค์
- ยืนยันว่าแท็บ Order เติมยาแสดงสถานะ ข้อมูล และกรองรายการได้ถูกต้อง และเภสัชเลือกหลาย Task ไปสร้างใบยาหรือยกเลิกรอบเติมยาได้ในครั้งเดียว

ขอบเขต Requirement
- AC1: แสดงสถานะ 4 แบบ
- AC3: Filter สถานะเลือกได้หลายค่า จาก 5 ตัวเลือก
- AC4: Column รายการยา และแพทย์ผู้สั่ง
- BR4: Column รอบเติมยา แบบ รอบปัจจุบัน/รอบทั้งหมด
- AC5: Checkbox เลือกได้หลายแถว
- AC6: "นำไปสร้างใบยา" หลาย Task พร้อมกัน
- AC7: "ยกเลิกรอบเติมยา" → ยกเลิกแล้ว
- Requirement ข้อ 6.2: รวมกับ Order รอยืนยันแล้วพาไปหน้าสร้างใบยา

ความเสี่ยง
- เภสัชไม่รู้ว่า Task ไหนจ่ายไปแล้ว ทำให้จ่ายซ้ำหรือตกหล่น
- ต้องสร้างใบยาทีละ Task ทำให้ทำงานช้า

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1734-001 - แสดงสถานะยังไม่เติม สำหรับ Task เติมยาที่ยังไม่ถูกนำไปสร้างใบยา

Status: Not Run · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-001
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. แพทย์สั่งยา Refill ให้คนไข้ทดสอบแล้ว (เกิด Task เติมยา)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Task เติมยาที่ยังไม่ถูกนำไปสร้างใบยา

Test Steps
1. การจัดการรายการสั่งยา OPD > แท็บ Order เติมยา
2. ดูสถานะของ Task ที่ยังไม่ถูกนำไปสร้างใบยา

Expected Result
- Task แสดงสถานะ "ยังไม่เติม"

Actual Result
- -

หมายเหตุ
- AC1
```

### TC-SBH-1734-002 - แสดงสถานะกำลังเติมยา หลังนำ Task ไปสร้างใบยาแต่ยังไม่จ่ายยา

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-002
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. คนไข้ทดสอบมี Task สถานะ "ยังไม่เติม" และมี Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" วันนี้
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Task สถานะ "ยังไม่เติม" 1 รายการ

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task
2. กด "นำไปสร้างใบยา" > สร้างใบยา (ยังไม่จ่ายยา)
3. กลับไปแท็บ Order เติมยา ดูสถานะของ Task

Expected Result
- Task แสดงสถานะ "กำลังเติมยา"

Actual Result
- -

หมายเหตุ
- AC1
- เทคนิค: State Transition — ยังไม่เติม → กำลังเติมยา
```

### TC-SBH-1734-003 - แสดงสถานะเติมยาแล้ว หลังจ่ายยาจากใบยาของ Task นั้น

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-003
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. ทำ TC-SBH-1734-002 แล้ว (Task สถานะ "กำลังเติมยา")
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ใบยาจาก TC-SBH-1734-002

Test Steps
1. ดำเนินการใบยาจนจ่ายยาแล้ว
2. กลับไปแท็บ Order เติมยา ดูสถานะของ Task

Expected Result
- Task แสดงสถานะ "เติมยาแล้ว"

Actual Result
- -

หมายเหตุ
- AC1
- เทคนิค: State Transition — กำลังเติมยา → เติมยาแล้ว
```

### TC-SBH-1734-004 - แสดงตัวเลือก Filter สถานะครบ 5 ตัวเลือก

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-004
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. Login ด้วยผู้ใช้เภสัช

Test Data
- -

Test Steps
1. แท็บ Order เติมยา > เปิด Filter สถานะ

Expected Result
- มีตัวเลือกครบ 5 ตัว: ทั้งหมด · ยังไม่เติม · กำลังเติมยา · เติมยาแล้ว · ยกเลิกแล้ว

Actual Result
- -

หมายเหตุ
- AC3
```

### TC-SBH-1734-005 - ทดสอบ Filter สถานะเลือกหลายค่าพร้อมกัน แสดงเฉพาะ Task ตามสถานะที่เลือก

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-005
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. แท็บ Order เติมยามี Task ครบ 4 สถานะอย่างน้อยสถานะละ 1 รายการ
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Filter: ยังไม่เติม + เติมยาแล้ว

Test Steps
1. แท็บ Order เติมยา > เปิด Filter สถานะ
2. เลือก "ยังไม่เติม" และ "เติมยาแล้ว" พร้อมกัน
3. ดูรายการที่แสดง

Expected Result
- เลือก 2 ค่าพร้อมกันได้ และตารางแสดงเฉพาะ Task สถานะ "ยังไม่เติม" และ "เติมยาแล้ว"

Actual Result
- -

หมายเหตุ
- AC3 · BR3
```

### TC-SBH-1734-006 - แสดง Column รายการยาครบทุกรายการของ Task ในแถวเดียว

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-006
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. คนไข้ทดสอบมี Task เติมยาที่มียามากกว่า 1 รายการ
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Task ที่มียา 2 รายการ

Test Steps
1. แท็บ Order เติมยา > ดูแถวของ Task นั้น

Expected Result
- มี Column รายการยา และแสดงยาครบทั้ง 2 รายการในแถวเดียว (1 แถว = 1 Task)

Actual Result
- -

หมายเหตุ
- AC4 · Requirement ข้อ 3
```

### TC-SBH-1734-007 - แสดง Column แพทย์ผู้สั่งตรงกับแพทย์ที่สั่ง Order Refill

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-007
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. แพทย์ทดสอบสั่งยา Refill ให้คนไข้ทดสอบแล้ว
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ชื่อแพทย์ที่สั่ง Order Refill

Test Steps
1. แท็บ Order เติมยา > ดูแถวของ Task นั้น

Expected Result
- มี Column แพทย์ผู้สั่ง และแสดงชื่อแพทย์ตรงกับแพทย์ที่สั่ง Order Refill

Actual Result
- -

หมายเหตุ
- AC4 · Requirement ข้อ 4
```

### TC-SBH-1734-008 - แสดงรอบเติมยาในรูปแบบรอบปัจจุบันต่อรอบทั้งหมด

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-008
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. แพทย์สั่งยา Refill 3 รอบให้คนไข้ทดสอบแล้ว
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Order Refill 3 รอบ

Test Steps
1. แท็บ Order เติมยา > ดู Column รอบเติมยาของ Task รอบแรก

Expected Result
- แสดงรอบเติมยาเป็น "1/3"

Actual Result
- -

หมายเหตุ
- BR4
```

### TC-SBH-1734-009 - ทดสอบเลือก Checkbox ได้หลายแถวพร้อมกัน

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-009
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. แท็บ Order เติมยามี Task สถานะ "ยังไม่เติม" อย่างน้อย 2 รายการ
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Task สถานะ "ยังไม่เติม" 2 รายการ

Test Steps
1. แท็บ Order เติมยา > ติ๊ก Checkbox ที่ Column หน้าสุดของ Task แถวที่ 1
2. ติ๊ก Checkbox ของ Task แถวที่ 2

Expected Result
- ทุกแถวมี Checkbox และทั้ง 2 แถวถูกเลือกพร้อมกัน

Actual Result
- -

หมายเหตุ
- AC5
```

### TC-SBH-1734-010 - ทดสอบนำหลาย Task ไปสร้างใบยาพร้อมกันในครั้งเดียว

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-010
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. คนไข้ทดสอบ 1 ราย มี Task สถานะ "ยังไม่เติม" อย่างน้อย 2 รายการ และมี Visit Walk-in ประเภท "รับยาต่อเนื่อง (Refill)" วันนี้
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Task สถานะ "ยังไม่เติม" 2 รายการของคนไข้คนเดียวกัน

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task ทั้ง 2 รายการ
2. กด "นำไปสร้างใบยา"

Expected Result
- ระบบพาไปหน้าสร้างใบยา และมีรายการยาจาก Task ทั้ง 2 รายการพร้อมกัน

Actual Result
- -

หมายเหตุ
- AC6
```

### TC-SBH-1734-011 - ทดสอบยกเลิกรอบเติมยาหลาย Task แล้วสถานะเป็นยกเลิกแล้วทั้งหมด

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-011
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. แท็บ Order เติมยามี Task สถานะ "ยังไม่เติม" อย่างน้อย 2 รายการ
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Task สถานะ "ยังไม่เติม" 2 รายการ

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task ทั้ง 2 รายการ
2. กด "ยกเลิกรอบเติมยา"
3. ดูสถานะของ Task ทั้ง 2 รายการ

Expected Result
- Task ทั้ง 2 รายการเปลี่ยนเป็นสถานะ "ยกเลิกแล้ว"

Actual Result
- -

หมายเหตุ
- AC7 · AC1 (สถานะยกเลิกแล้ว) · BR2
- เทคนิค: State Transition — ยังไม่เติม → ยกเลิกแล้ว
```

### TC-SBH-1734-012 - ทดสอบนำ Task ไปสร้างใบยาแล้วรวมกับ Order รอยืนยันที่มีอยู่

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-012
- Scenario ID: TS-SBH-1734-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. คนไข้ทดสอบมี Order ยาสถานะรอยืนยัน (แท็บ Order รอยืนยัน) และมี Task เติมยาสถานะ "ยังไม่เติม"
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Order รอยืนยัน 1 รายการ · Task เติมยา 1 รายการ ของคนไข้คนเดียวกัน

Test Steps
1. แท็บ Order เติมยา > ติ๊กเลือก Task ของคนไข้นั้น
2. กด "นำไปสร้างใบยา"
3. ดูรายการยาในหน้าสร้างใบยา

Expected Result
- หน้าสร้างใบยาแสดงทั้งรายการยาจาก Task เติมยาและจาก Order รอยืนยันของคนไข้นั้นรวมกัน

Actual Result
- -

หมายเหตุ
- Requirement ข้อ 6.2 (ไม่อยู่ในตาราง AC แต่เขียนเป็น To be ชัดเจน)
```

---

## TS-SBH-1734-UHP - ป้องกันการนำ Task ที่กำลังเติมยาไปสร้างใบยาซ้ำ

Status: Ready for Testing · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1734-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

วัตถุประสงค์
- ยืนยันว่า Task ที่ถูกนำไปสร้างใบยาแล้ว (กำลังเติมยา) ไม่ถูกนำไปสร้างใบยาซ้ำ

ขอบเขต Requirement
- AC2: Task "กำลังเติมยา" เลือกไปสร้างใบยาซ้ำไม่ได้ · BR1

ความเสี่ยง
- จ่ายยารอบเดียวกันซ้ำ 2 ครั้ง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1734-013 - ตรวจสอบ Task ที่สถานะกำลังเติมยาถูกนำไปสร้างใบยาซ้ำไม่ได้

Status: Not Run · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Unhappy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1734-013
- Scenario ID: TS-SBH-1734-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1734 — [Pharmacy] [Refill] ปรับปรุงการแสดงข้อมูลและการใช้งานของหน้า รายการเติมยา (Order เติมยา)

Preconditions
1. ทำ TC-SBH-1734-002 แล้ว (Task สถานะ "กำลังเติมยา")
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Task จาก TC-SBH-1734-002

Test Steps
1. แท็บ Order เติมยา > ลองติ๊กเลือก Task ที่สถานะ "กำลังเติมยา"
2. ถ้าเลือกได้ กด "นำไปสร้างใบยา"

Expected Result
- นำ Task ที่สถานะ "กำลังเติมยา" ไปสร้างใบยาซ้ำไม่ได้

Actual Result
- -

หมายเหตุ
- AC2 · BR1
- เทคนิค: State Transition — เส้นที่ต้องทำไม่ได้ (กำลังเติมยา → สร้างใบยาซ้ำ)
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- AC2: ไม่ระบุว่ากันด้วยวิธีไหน (Checkbox ของ Task "กำลังเติมยา" ถูก disable / กดแล้วแจ้งเตือน)
- "ยกเลิกรอบเติมยา": ไม่ระบุว่ามี popup ยืนยันก่อนยกเลิก และยกเลิก Task สถานะอื่น (กำลังเติมยา / เติมยาแล้ว) ได้หรือไม่
- "นำไปสร้างใบยา" เลือก Task ของคนไข้หลายคนพร้อมกัน ผลเป็นอย่างไร — ระบุไว้ใน SBH-1738 (Merge ได้เฉพาะคนไข้คนเดียวกัน)
- ยกเลิกใบยาที่สร้างจาก Task แล้ว สถานะ Task กลับเป็น "ยังไม่เติม" หรือไม่
- ค่าตั้งต้นของ Filter สถานะตอนเปิดหน้า (ทั้งหมด / ยังไม่เติม) ไม่ระบุ

Validation
- -

Error handling
- ไม่ระบุข้อความแจ้งเตือนเมื่อกดปุ่มโดยยังไม่เลือก Checkbox

Permission / role
- PR cortex-testing "seed medication refill edit permission" — มีสิทธิ์ใหม่ แต่การ์ดไม่ระบุว่า role ไหนกดสร้างใบยา / ยกเลิกรอบเติมยาได้

Edge cases
- Filter สถานะทำงานร่วมกับ Filter อื่น (ค้นหา VN/HN · ช่วงวันที่ · คลินิก · แพทย์) อย่างไร — การ์ดไม่ระบุ
