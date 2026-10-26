# Draft Test Structure — SBH-1737

> สถานะ: **สร้างใน Linear แล้ว (2026-10-16)**
> - EXE SBH-2711 → HPY SBH-2712 (TC 001–013 = SBH-2714–2726) · UHP SBH-2713 (TC 014–015 = SBH-2727–2728)
> - Env: Dev-X / SBH Prod · QA Module : Pharmacy · QA Sub-module / Feature : Prescription
> - ลำดับเทส (เขียนไว้ใน EXE และ Test Step แล้ว): 001 → 002 → 010 → 003 → 004 → 011 → 005 → 012 → 006 → 007 → 013 → 008 → 014 → 015 → 009
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · วงเล็บท้ายชื่อบอกหน้าที่ต้องดู
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)

Requirement: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้
URL: https://linear.app/cortexcloud/issue/SBH-1737
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: High · State: Ready for Testing
Labels: 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy, 🐷 VERSION 2.8.0 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT
Sub-Issue: SBH-2126 (Editability ของ Order Refill) · SBH-2127 (Sync Order Refill กับ Task เติมยา) — เป็นการ์ดแยก ไม่รวมใน TC ชุดนี้ · CTXN-8989 (Design Task — Done)
PR ทั้งหมดเป็น V2.8.0 ตรงกับ label

หน้าจอ (จากรูปในการ์ด): การจัดการรายการสั่งยา OPD → แท็บ Order รอยืนยัน → หน้าสร้างใบยา (รับออเดอร์)
- ปุ่ม "Refill (n)" ที่หัวรายการยา ข้าง "+ เพิ่มรายการยา" → เปิด modal "จัดการการเติมยา (Refill)"
- ไอคอนดินสอท้ายแถวยา → ฟอร์มแก้ไขคำสั่งยา (To-be ต้องเต็มเหมือนของแพทย์: วิธีการใช้ · ปฏิทินรอบยา · กำหนดระยะเวลา · วิธีใช้ · วิธีใช้เพิ่มเติม · ระยะเวลาการใช้ · จำนวนที่จ่าย · หน่วยจ่าย · ประเภทการใช้ · หมายเหตุ)

| AC / BR | Expected Results | TC |
|---|---|---|
| AC1 / BR1 | เภสัชแก้ไขรายละเอียดคำสั่งได้ครบทุก field เหมือนแพทย์ (สถานะรอยืนยัน) | 001, 002 |
| AC2 / BR2 | เปิด modal "จัดการการเติมยา (Refill)" จาก Order Refill ได้ และแก้ไข / แทรกรอบได้เหมือนของแพทย์ | 003, 004, 005 |
| Business Solution | ลบรอบเติมยาได้ใน modal เดียวกัน | 006 |
| AC3 / BR3 | เปลี่ยน Order ปกติเป็น Order Refill ได้ | 007 |
| BR5 | แก้ไขแล้วไม่ต้องให้แพทย์ approve ซ้ำ | 008 |
| AC4 / BR4 | ยืนยันแล้วแก้ไขไม่ได้ จนกว่าจะย้อนสถานะกลับก่อนสร้างใบยา | 009, 014, 015 |
| ผู้ใช้สั่งเพิ่ม | เภสัชแก้ไขยาของแพทย์แล้ว หน้า CPOE อัปเดตตรงกับที่เภสัชแก้ | 010, 011, 012, 013 |

ข้อมูลตั้งต้น: แพทย์สั่งยาให้คนไข้ทดสอบ 2 รายการ — ยา A = Refill 3 รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28) · ยา B = ยาปกติ — แล้วส่งคำสั่ง

---

## EXE - CT - 2.8.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: UAT#3 Cashier, Pharmacy, Queue
Labels: 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy, 🐷 VERSION 2.8.0, QA Module : Pharmacy, QA Sub-module / Feature : Prescription, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.0
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- เภสัชแก้ไขคำสั่งยาเต็มรูปแบบเหมือนแพทย์ที่หน้า Order รอยืนยัน (AC1)
- modal "จัดการการเติมยา (Refill)" ฝั่งเภสัช: แก้ไข / แทรก / ลบรอบ (AC2)
- เปลี่ยน Order ปกติเป็น Order Refill (AC3)
- ล็อกการแก้ไขหลังยืนยัน และแก้ไขได้อีกหลังย้อนสถานะ (AC4)
- หน้า CPOE ของแพทย์อัปเดตตามที่เภสัชแก้ไข (ผู้ใช้สั่งเพิ่ม)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- Audit trail และการจำกัดสิทธิ์ตาม role อยู่นอก scope รอบนี้ (BR6)
```

---

## TS-SBH-1737-HPY - เภสัชแก้ไขคำสั่งยาและจัดการรอบเติมยาที่หน้า Order รอยืนยัน และหน้า CPOE อัปเดตตาม

Status: Ready for Testing · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Suffix: HPY
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

วัตถุประสงค์
- ยืนยันว่าเภสัชแก้ไขคำสั่งยาได้เท่าแพทย์ จัดการรอบเติมยาได้ เปลี่ยนยาปกติเป็น Refill ได้ และกลับมาแก้ไขได้หลังย้อนสถานะ

ขอบเขต Requirement
- AC1 / BR1: แก้ไขได้ครบทุก field เหมือนแพทย์
- AC2 / BR2: modal "จัดการการเติมยา (Refill)" แก้ไข / แทรกรอบได้ · Business Solution: ลบรอบได้
- AC3 / BR3: เปลี่ยน Order ปกติเป็น Order Refill
- BR5: ไม่ต้องให้แพทย์ approve ซ้ำ
- AC4 / BR4: ย้อนสถานะกลับก่อนสร้างใบยาแล้วแก้ไขได้อีก
- ผู้ใช้สั่งเพิ่ม: หน้า CPOE ของแพทย์แสดงข้อมูลตรงกับที่เภสัชแก้

ความเสี่ยง
- ยาไม่พอแต่เภสัชตั้ง Refill ไม่ได้ ต้องให้แพทย์สั่งใหม่
- เภสัชแก้ได้ไม่ครบ ทำให้คำสั่งยาไม่ตรงกับที่จ่ายจริง
- แพทย์เห็นคำสั่งยาเดิมทั้งที่เภสัชแก้ไปแล้ว ทำให้แพทย์กับเภสัชเข้าใจไม่ตรงกัน

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1737-001 - แสดงฟอร์มแก้ไขคำสั่งยาครบทุก field เหมือนของแพทย์ (หน้า Order รอยืนยัน ห้องยา)

Status: Not Run · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-001
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. แพทย์สั่งยา B (ยาปกติ) ให้คนไข้ทดสอบ และส่งคำสั่งแล้ว (จดรายการ field ในฟอร์มแก้ไขยาของแพทย์ไว้)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ยา B (ยาปกติ)

Test Steps
1. การจัดการรายการสั่งยา OPD > แท็บ Order รอยืนยัน > เปิด Order ของคนไข้
2. กดไอคอนดินสอที่แถวยา B
3. เทียบ field ในฟอร์มกับฟอร์มแก้ไขยาของแพทย์

Expected Result
- ฟอร์มมี field ครบเท่าของแพทย์ และแก้ไขได้ทุก field (ไม่ใช่ฟอร์มที่ถูกตัดเหลือบางส่วนแบบเดิม)

Actual Result
- -

หมายเหตุ
- AC1 · BR1
```

### TC-SBH-1737-002 - บันทึกการแก้ไขวิธีใช้และจำนวนจ่ายของคำสั่งยา (หน้า Order รอยืนยัน ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-002
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ใช้ Order จาก TC-SBH-1737-001 (สถานะรอยืนยัน)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ยา B: แก้วิธีใช้ และจำนวนที่จ่ายเป็นค่าใหม่

Test Steps
1. แท็บ Order รอยืนยัน > เปิด Order > กดไอคอนดินสอที่แถวยา B
2. แก้วิธีใช้และจำนวนที่จ่าย > กดบันทึก
3. ดูแถวยา B

Expected Result
- บันทึกสำเร็จ และแถวยา B แสดงวิธีใช้และจำนวนจ่ายตามค่าใหม่

Actual Result
- -

หมายเหตุ
- AC1 · BR1
```

### TC-SBH-1737-003 - เปิด modal จัดการการเติมยาจาก Order Refill ที่แพทย์สั่ง (หน้า Order รอยืนยัน ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-003
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. แพทย์สั่งยา A (Refill 3 รอบ) ให้คนไข้ทดสอบ และส่งคำสั่งแล้ว
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ยา A: Refill 3 รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28)

Test Steps
1. แท็บ Order รอยืนยัน > เปิด Order ของคนไข้
2. กดปุ่ม "Refill (n)" ที่หัวรายการยา (หรือทางเข้า Refill ของยา A)

Expected Result
- เปิด modal "จัดการการเติมยา (Refill)" ได้ แสดงรอบเติมยา วันที่ และจำนวนจ่ายของยา A ตรงกับที่แพทย์ตั้ง

Actual Result
- -

หมายเหตุ
- AC2 · BR2
```

### TC-SBH-1737-004 - บันทึกการแก้ไขวันที่และจำนวนจ่ายของรอบเติมยาใน modal จัดการการเติมยา (หน้า Order รอยืนยัน ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-004
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ใช้ Order จาก TC-SBH-1737-003 (สถานะรอยืนยัน)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- เติมยาครั้งที่ 1: เลื่อนวันที่ออกไป 7 วัน และแก้จำนวนจ่าย

Test Steps
1. เปิด modal "จัดการการเติมยา (Refill)" ของยา A
2. แก้วันที่และจำนวนจ่ายของเติมยาครั้งที่ 1 > กดยืนยัน
3. เปิด modal อีกครั้ง

Expected Result
- บันทึกสำเร็จ และเติมยาครั้งที่ 1 แสดงวันที่และจำนวนจ่ายตามค่าใหม่

Actual Result
- -

หมายเหตุ
- AC2 · Use case 2 (เภสัชแก้ไขรอบเติมยา)
```

### TC-SBH-1737-005 - บันทึกการแทรกรอบเติมยาเพิ่มใน modal จัดการการเติมยา (หน้า Order รอยืนยัน ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-005
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ใช้ Order จาก TC-SBH-1737-003 (ยา A Refill 3 รอบ สถานะรอยืนยัน)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- แทรกรอบเติมยาเพิ่ม 1 รอบ

Test Steps
1. เปิด modal "จัดการการเติมยา (Refill)" ของยา A
2. แทรกรอบเติมยาเพิ่ม 1 รอบ (กำหนดวันที่และจำนวนจ่าย) > กดยืนยัน
3. เปิด modal อีกครั้ง

Expected Result
- บันทึกสำเร็จ และยา A มีรอบเติมยาเพิ่มเป็น 4 รอบ ตามที่แทรก

Actual Result
- -

หมายเหตุ
- AC2 · Use case 3 (เภสัชแทรกรอบเติมยา)
```

### TC-SBH-1737-006 - บันทึกการลบรอบเติมยาใน modal จัดการการเติมยา (หน้า Order รอยืนยัน ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-006
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ใช้ Order จาก TC-SBH-1737-003 (ยา A Refill หลายรอบ สถานะรอยืนยัน)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ลบรอบเติมยาสุดท้าย 1 รอบ

Test Steps
1. เปิด modal "จัดการการเติมยา (Refill)" ของยา A
2. กดลบรอบเติมยาสุดท้าย > กดยืนยัน
3. เปิด modal อีกครั้ง

Expected Result
- บันทึกสำเร็จ และรอบที่ลบไม่แสดงแล้ว จำนวนรอบลดลง 1 รอบ

Actual Result
- -

หมายเหตุ
- Requirement / Business Solution (แก้ไข / แทรก / ลบรอบเติมยาได้)
```

### TC-SBH-1737-007 - เปลี่ยนคำสั่งยาปกติให้เป็น Order Refill (หน้า Order รอยืนยัน ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-007
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. แพทย์สั่งยา B (ยาปกติ ไม่ใช่ Refill) ให้คนไข้ทดสอบ และส่งคำสั่งแล้ว
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ยา B: ตั้ง Refill 3 รอบ

Test Steps
1. แท็บ Order รอยืนยัน > เปิด Order ของคนไข้
2. เปิดทางเข้า Refill ของยา B > ตั้งรอบเติมยา 3 รอบใน modal "จัดการการเติมยา (Refill)" > กดยืนยัน
3. ดูแถวยา B

Expected Result
- ยา B กลายเป็น Order Refill 3 รอบ (แสดงรอบเติมยา / Label Refill ที่แถวยา)

Actual Result
- -

หมายเหตุ
- AC3 · BR3 · Use case 1 (ยาไม่พอ เภสัชเปลี่ยนเป็น Refill)
```

### TC-SBH-1737-008 - ตรวจสอบสร้างใบยาต่อได้ทันทีหลังเภสัชแก้ไขโดยไม่ต้องให้แพทย์อนุมัติ (หน้า Order รอยืนยัน ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-008
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ทำ TC-SBH-1737-007 แล้ว (เภสัชเปลี่ยนยา B เป็น Refill)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- Order จาก TC-SBH-1737-007

Test Steps
1. ในหน้า Order รอยืนยันของ Order นั้น กดสร้างใบยา
2. ดูว่ามีขั้นตอนให้แพทย์อนุมัติ / แจ้งเตือนรอแพทย์หรือไม่

Expected Result
- สร้างใบยาได้ทันที ไม่มีการแจ้งเตือนหรือรอให้แพทย์ approve การแก้ไขซ้ำ

Actual Result
- -

หมายเหตุ
- BR5
```

### TC-SBH-1737-009 - แก้ไขคำสั่งยาได้อีกครั้งหลังย้อนสถานะกลับก่อนสร้างใบยา (หน้า Order รอยืนยัน ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-009
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ทำ TC-SBH-1737-008 แล้ว (สร้างใบยาแล้ว)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ใบยาจาก TC-SBH-1737-008

Test Steps
1. เปิดใบยา (แท็บ Prescription) > กด "ย้อนกลับ" ไปสถานะก่อนสร้างใบยา
2. แท็บ Order รอยืนยัน > เปิด Order > กดไอคอนดินสอที่แถวยา / เปิด modal Refill

Expected Result
- กลับมาแก้ไขคำสั่งยาและรอบเติมยาได้อีกครั้ง

Actual Result
- -

หมายเหตุ
- AC4 · BR4
- เทคนิค: State Transition — ยืนยันแล้ว → ย้อนกลับ → รอยืนยัน (แก้ไขได้)
```

### TC-SBH-1737-010 - แสดงวิธีใช้และจำนวนจ่ายตามที่เภสัชแก้ไข (หน้า CPOE)

Status: Not Run · Labels: เหมือน TC-001 (QA Type : Integration)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-010
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ทำ TC-SBH-1737-002 แล้ว (เภสัชแก้วิธีใช้และจำนวนที่จ่ายของยา B — จดค่าใหม่ไว้)
2. Login ด้วยผู้ใช้แพทย์

Test Data
- ยา B: วิธีใช้ / จำนวนที่จ่ายที่เภสัชแก้

Test Steps
1. เปิด OPD Visit ของคนไข้ > หน้า CPOE (คำสั่งการรักษา)
2. ดูแถวยา B และเปิดรายละเอียดคำสั่งยา

Expected Result
- วิธีใช้และจำนวนจ่ายของยา B ในหน้า CPOE ตรงกับค่าที่เภสัชแก้

Actual Result
- -

หมายเหตุ
- ผู้ใช้สั่งเพิ่ม (2026-10-16): เภสัชแก้ไขยาของแพทย์แล้ว หน้า CPOE ต้องอัปเดตตรงกัน — การ์ดไม่ได้เขียนไว้
```

### TC-SBH-1737-011 - แสดงวันที่และจำนวนจ่ายของรอบเติมยาตามที่เภสัชแก้ไข (หน้า CPOE)

Status: Not Run · Labels: เหมือน TC-001 (QA Type : Integration)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-011
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ทำ TC-SBH-1737-004 แล้ว (เภสัชแก้วันที่และจำนวนจ่ายของเติมยาครั้งที่ 1 ของยา A — จดค่าใหม่ไว้)
2. Login ด้วยผู้ใช้แพทย์

Test Data
- ยา A: เติมยาครั้งที่ 1 ค่าที่เภสัชแก้

Test Steps
1. เปิด OPD Visit ของคนไข้ > หน้า CPOE
2. เปิด modal "จัดการการเติมยา (Refill)" ของยา A

Expected Result
- วันที่และจำนวนจ่ายของเติมยาครั้งที่ 1 ตรงกับค่าที่เภสัชแก้

Actual Result
- -

หมายเหตุ
- ผู้ใช้สั่งเพิ่ม (2026-10-16): เภสัชแก้ไขยาของแพทย์แล้ว หน้า CPOE ต้องอัปเดตตรงกัน — การ์ดไม่ได้เขียนไว้
```

### TC-SBH-1737-012 - แสดงจำนวนรอบเติมยาตามที่เภสัชแทรกรอบเพิ่ม (หน้า CPOE)

Status: Not Run · Labels: เหมือน TC-001 (QA Type : Integration)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-012
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ทำ TC-SBH-1737-005 แล้ว (เภสัชแทรกรอบเติมยาของยา A จาก 3 เป็น 4 รอบ)
2. Login ด้วยผู้ใช้แพทย์

Test Data
- ยา A: 4 รอบหลังเภสัชแทรก

Test Steps
1. เปิด OPD Visit ของคนไข้ > หน้า CPOE
2. ดูความคืบหน้า Refill ของยา A (เช่น "Refill 0 of n") และเปิด modal "จัดการการเติมยา (Refill)"

Expected Result
- หน้า CPOE แสดงยา A มี 4 รอบ และรอบที่แทรกตรงกับที่เภสัชตั้ง

Actual Result
- -

หมายเหตุ
- ผู้ใช้สั่งเพิ่ม (2026-10-16): เภสัชแก้ไขยาของแพทย์แล้ว หน้า CPOE ต้องอัปเดตตรงกัน — การ์ดไม่ได้เขียนไว้
```

### TC-SBH-1737-013 - แสดงยาเป็น Order Refill หลังเภสัชเปลี่ยนจากยาปกติ (หน้า CPOE)

Status: Not Run · Labels: เหมือน TC-001 (QA Type : Integration)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-013
- Scenario ID: TS-SBH-1737-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Integration
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ทำ TC-SBH-1737-007 แล้ว (เภสัชเปลี่ยนยา B จากยาปกติเป็น Refill 3 รอบ)
2. Login ด้วยผู้ใช้แพทย์

Test Data
- ยา B: Refill 3 รอบที่เภสัชตั้ง

Test Steps
1. เปิด OPD Visit ของคนไข้ > หน้า CPOE
2. ดูแถวยา B (ไอคอน Refill / "Refill 0 of 3") และเปิด modal "จัดการการเติมยา (Refill)"

Expected Result
- ยา B แสดงเป็น Order Refill 3 รอบ และรอบเติมยาตรงกับที่เภสัชตั้ง

Actual Result
- -

หมายเหตุ
- ผู้ใช้สั่งเพิ่ม (2026-10-16): เภสัชแก้ไขยาของแพทย์แล้ว หน้า CPOE ต้องอัปเดตตรงกัน — การ์ดไม่ได้เขียนไว้
```

---

## TS-SBH-1737-UHP - ล็อกการแก้ไขคำสั่งยาและ Refill หลัง Order ถูกยืนยันแล้ว

Status: Ready for Testing · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1737-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

วัตถุประสงค์
- ยืนยันว่าหลัง Order ถูกยืนยัน (สร้างใบยาแล้ว) เภสัชแก้ไขคำสั่งยาและรอบเติมยาไม่ได้

ขอบเขต Requirement
- AC4 / BR4: แก้ไขได้เฉพาะสถานะรอยืนยัน หลังยืนยันแล้วแก้ไขไม่ได้

ความเสี่ยง
- คำสั่งยาถูกแก้หลังจัดยา ทำให้ยาที่จัดไม่ตรงกับคำสั่ง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1737-014 - ตรวจสอบแก้ไขคำสั่งยาไม่ได้ หลัง Order ถูกยืนยันแล้ว (หน้าใบยา ห้องยา)

Status: Not Run · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Unhappy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-014
- Scenario ID: TS-SBH-1737-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. Order ของคนไข้ทดสอบถูกยืนยันแล้ว (สร้างใบยาแล้ว)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ใบยาที่สร้างจาก Order ที่มียา A (Refill) และยา B (ยาปกติ)

Test Steps
1. เปิดใบยา (แท็บ Prescription)
2. ลองแก้ไขรายละเอียดคำสั่งของยา B

Expected Result
- แก้ไขรายละเอียดคำสั่งยาไม่ได้

Actual Result
- -

หมายเหตุ
- AC4 · BR4
- เทคนิค: State Transition — เส้นที่ต้องทำไม่ได้ (ยืนยันแล้ว → แก้ไขคำสั่ง)
```

### TC-SBH-1737-015 - ตรวจสอบแก้ไขรอบเติมยาไม่ได้ หลัง Order ถูกยืนยันแล้ว (หน้าใบยา ห้องยา)

Status: Not Run · Labels: เหมือน TC-014

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1737-015
- Scenario ID: TS-SBH-1737-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1737 — [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้

Preconditions
1. ใช้ใบยาจาก TC-SBH-1737-014
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ยา A (Refill)

Test Steps
1. เปิดใบยา (แท็บ Prescription)
2. ลองเปิด modal "จัดการการเติมยา (Refill)" ของยา A แล้วแก้รอบเติมยา

Expected Result
- แก้ไขรอบเติมยาไม่ได้ (ปุ่ม / modal ถูก disable หรือเป็นแบบอ่านอย่างเดียว)

Actual Result
- -

หมายเหตุ
- AC4 · BR4
- เทคนิค: State Transition — เส้นที่ต้องทำไม่ได้ (ยืนยันแล้ว → แก้ไข Refill)
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- "ยืนยัน" Order หมายถึงกดสร้างใบยา หรือขั้นอื่น — ร่างนี้ถือว่าสร้างใบยาแล้ว = ยืนยัน
- ทางเข้าเปลี่ยนยาปกติเป็น Refill (AC3) อยู่ที่ปุ่ม "Refill (n)" ที่หัวรายการ หรือที่แต่ละแถวยา — การ์ดไม่ระบุ
- เภสัชแก้ Refill แล้ว Task เติมยาในแท็บ Order เติมยา ต้อง sync ตาม (เกี่ยวกับ SBH-2127) — การ์ดไม่ระบุ
- PR "Adjust refill modal quantities by source Encounter status" — การ์ดไม่ได้อธิบายพฤติกรรมนี้
- การ์ดไม่ได้ระบุว่าหน้า CPOE ต้องอัปเดตตามการแก้ไขของเภสัช — เพิ่ม TC-010 ถึง 013 ตามที่ผู้ใช้สั่ง ควรให้ BA ยืนยันลงในการ์ด
- AC1 "ครบทุก field เหมือนแพทย์" ไม่มีรายการ field ให้เทียบ — ร่างนี้เทียบกับฟอร์มของแพทย์ในรูป To be

Validation
- ไม่ระบุ validation ของ modal ฝั่งเภสัช (เช่น จำนวนจ่ายรวมเกินยอดรวม) — ถือว่าเหมือน modal ของแพทย์

Error handling
- -

Permission / role
- BR6: ยังใช้ master user ไม่จำกัดสิทธิ์ตาม role อย่างเข้มงวด (นอก scope)

Edge cases
- ลบรอบเติมยาจนเหลือ 0 รอบ Order กลับเป็นยาปกติหรือไม่ — การ์ดไม่ระบุ
- แก้รอบเติมยาของรอบที่จ่ายไปแล้ว — การ์ดไม่ระบุ
