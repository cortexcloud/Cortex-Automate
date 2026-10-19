# Draft Test Structure — SBH-2233

> สถานะ: **สร้างใน Linear แล้ว (2026-10-16)**
> - EXE SBH-2729 (EXE - CT - 2.9.0) → HPY SBH-2730 (TC 001–019 = SBH-2732–2750) · UHP SBH-2731 (TC 020–022 = SBH-2751–2753)
> - Env: Dev-X / SBH Prod · QA Run : Cycle Test · QA Module: OPD · QA Sub-module / Feature : Queue (label ใหม่)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · วงเล็บท้ายชื่อบอกหน้าที่ต้องดู
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)
> - ⚠️ การ์ดยังเป็น **In Progress** (ยังไม่ Ready for Testing) และ AC5 (คิวซ้ำ) ยังไม่มี policy

Requirement: SBH-2233 — [OPD] [Queue] Queue Improvement
URL: https://linear.app/cortexcloud/issue/SBH-2233
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: Urgent · State: In Progress · Cycle: ไม่ได้ผูก
Labels: SBH - UAT D4 Queue, 🍄 Improvement, For OPD Biz Sim - SBH, Natthaphat ( MOD ) 🙈, VERSION 2.9.0, Suchart ( Jame ) 🥷 · Assignee: Nattanan (Frame)
Sub-Issue: SBH-2385 (Discharge — ใบนำทางและ Queue ผู้ป่วยไม่มี Order ยา) · SBH-2386 (Visit Slip — ปรับใบนำทาง) · SBH-2387 (Lab Queue Type / RAX — นอก scope ตามคอมเมนต์ Dev)
คอมเมนต์ Dev (Frame 2026-10-16): implementation พร้อม review — SBH-2625 (DB) · SBH-2626 (API) · SBH-2627 (UI Discharge) · SBH-2628 (SBH template/config) · ยังไม่รวม SBH-2387

แหล่ง AC: "AC." (ใบนำทาง + ปุ่ม) และ "Acceptance criteria เพิ่มเติม" 1–5 ของการ์ดนี้ · รายละเอียดและ decision ที่ยืนยันแล้วจาก SBH-2385 / SBH-2386

| AC | Expected Results | TC |
|---|---|---|
| AC เพิ่มเติม 1 | Order/Discharge สร้าง Cashier Queue อัตโนมัติเมื่อมีรายการยาเท่านั้น | 001 |
| AC เพิ่มเติม 2 | Visit ไม่มียา + มี Order ไปจุดบริการอื่น → ได้ใบนำทาง ไม่สร้าง Cashier Queue อัตโนมัติ | 002, 003 |
| AC 2.1 | ปุ่มพิมพ์ใบนำทางแสดงเมื่อมี Order Type: X-ray / Lab / Image / Activity | 004, 005, 006, 007 |
| AC 2.2 | การจัดการหลังตรวจแสดงใบนำทาง: จุดบริการ · สถานที่ · รายการ Order (จัดกลุ่มตาม QSU + Location) | 008, 009, 010 |
| AC 2.2.3 | Print แยกแต่ละจุดบริการ (1 destination = 1 ใบ) | 011 |
| AC 1 | ข้อมูลในใบนำทาง (Logo SBH, Barcode HN, ชื่อ, วันเกิด, VN, หน่วยบริการ, สถานที่, แพทย์ผู้สั่ง, สิทธิ์หลัก / รอง · ไม่มีเวลานัดหมาย) | 012, 013, 014, 015 |
| AC เพิ่มเติม 3 | Cashier / จุดบริการปลายทางสร้างคิว Manual ผ่านหน้ารายการคิว โดยกรอก HN | 016, 017 |
| Flow ข้อ 3 | ดำเนินการตามลำดับคิว (FIFO) | 018 |
| AC เพิ่มเติม 4 | หน้า Cashier queue list มี tab OPD / IPD | 019 |
| SBH-2385 AC7 | ไม่มีปลายทางที่รองรับ → ไม่แสดงปุ่มพิมพ์ใบนำทาง | 020 |
| SBH-2385 AC4 | หน้า Discharge ไม่แสดงปุ่มพิมพ์บัตรคิวการเงิน | 021 |
| SBH-2386 AC9 | resolve Location ไม่ได้ → ไม่เดาห้องปลายทาง | 022 |
| AC เพิ่มเติม 4 (filter / column) · AC เพิ่มเติม 5 (คิวซ้ำ) | — | ไม่สร้าง TC — การ์ดยังไม่ระบุ UI / policy (ดู gap) |

ข้อมูลตั้งต้น: คนไข้ทดสอบ OPD ตรวจเสร็จ — ชุด A: มี Order ยา · ชุด B: ไม่มี Order ยา แต่มี Lab + X-ray + Activity Order (Sign แล้ว)

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: UAT#3 Cashier, Pharmacy, Queue
Labels: SBH - UAT D4 Queue, 🍄 Improvement, For OPD Biz Sim - SBH, Natthaphat ( MOD ) 🙈, VERSION 2.9.0, Suchart ( Jame ) 🥷, `<QA Module — รอยืนยัน>`, `<QA Sub-module — รอยืนยัน>`, `<QA Run — รอยืนยัน>`

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: <รอยืนยัน>
- Scope / Version: 2.9.0
- Module: OPD / Queue
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement
- Environment: <รอ QA ยืนยัน>
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- สร้าง Cashier Queue อัตโนมัติเฉพาะ Visit ที่มียา (AC เพิ่มเติม 1, 2)
- ใบนำทางไปจุดบริการอื่นที่หน้า Discharge: แสดง จัดกลุ่ม และพิมพ์แยกจุดบริการ (AC 2)
- ข้อมูลในใบนำทาง (AC 1)
- สร้างคิว Manual ที่ Cashier / จุดบริการปลายทาง และลำดับ FIFO (AC เพิ่มเติม 3)
- tab OPD / IPD ในหน้า Cashier queue list (AC เพิ่มเติม 4)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- ไม่รวม AC เพิ่มเติม 5 (คิวซ้ำ) เพราะยังไม่มี policy · ไม่รวม SBH-2387 (Queue Type / RAX)
```

---

## TS-SBH-2233-HPY - สร้างคิวการเงินอัตโนมัติ พิมพ์ใบนำทาง และสร้างคิว Manual ที่จุดบริการปลายทาง

Status: Ready for Testing · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Suffix: HPY
- Module: OPD / Queue
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

วัตถุประสงค์
- ยืนยันว่าหลังตรวจ ระบบสร้างคิวการเงินเฉพาะ Visit ที่มียา ผู้ป่วยที่ไม่มียาได้ใบนำทางแยกตามจุดบริการ และจุดบริการปลายทางสร้างคิว Manual เรียงแบบ FIFO ได้

ขอบเขต Requirement
- AC เพิ่มเติม 1–4 · AC 1 (ข้อมูลใบนำทาง) · AC 2 (ปุ่ม / การจัดการหลังตรวจ)
- รายละเอียดการจัดกลุ่ม / การพิมพ์ตาม decision ใน SBH-2385 / SBH-2386

ความเสี่ยง
- ผู้ป่วยไม่มียาได้คิวการเงินโดยไม่จำเป็น หรือผู้ป่วยมียาไม่ได้คิว
- ใบนำทางพาผู้ป่วยไปผิดห้อง
- จุดบริการปลายทางสร้างคิวไม่ได้ ทำให้ผู้ป่วยรอโดยไม่มีลำดับ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2233-001 - ตรวจสอบระบบสร้าง Cashier Queue อัตโนมัติ เมื่อ Visit มีรายการยา (หน้า Cashier queue list)

Status: Not Run · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-001
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ทดสอบชุด A: แพทย์สั่งยาใน Visit และส่งคำสั่งแล้ว

Test Data
- คนไข้ชุด A (มี Order ยา)

Test Steps
1. พยาบาลเปิด Visit > จำหน่ายผู้ป่วย > บันทึก Discharge
2. ผู้ใช้การเงินเปิดหน้า Cashier queue list ค้นหาคนไข้

Expected Result
- มี Cashier Queue ของคนไข้ถูกสร้างอัตโนมัติ

Actual Result
- -

หมายเหตุ
- AC เพิ่มเติม 1 · Flow ข้อ 1
```

### TC-SBH-2233-002 - แสดงส่วนใบนำทางไปจุดบริการอื่น เมื่อ Visit ไม่มียาแต่มี Order ไปจุดบริการอื่น (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-002
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ทดสอบชุด B: ไม่มี Order ยา แต่มี Lab + X-ray + Activity Order (Sign แล้ว)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- คนไข้ชุด B

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > section การจัดการหลังตรวจ

Expected Result
- แสดงส่วน "ใบนำทางไปจุดบริการอื่น"

Actual Result
- -

หมายเหตุ
- AC เพิ่มเติม 2 · SBH-2385 AC1
```

### TC-SBH-2233-003 - ตรวจสอบไม่สร้าง Cashier Queue อัตโนมัติ เมื่อ Visit ไม่มีรายการยา (หน้า Cashier queue list)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-003
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ชุด B จาก TC-SBH-2233-002 บันทึก Discharge แล้ว

Test Data
- คนไข้ชุด B

Test Steps
1. ผู้ใช้การเงินเปิดหน้า Cashier queue list ค้นหาคนไข้

Expected Result
- ไม่มี Cashier Queue ของคนไข้ถูกสร้างอัตโนมัติ

Actual Result
- -

หมายเหตุ
- AC เพิ่มเติม 2
```

### TC-SBH-2233-004 - แสดงปุ่มพิมพ์ใบนำทาง เมื่อ Visit มี Lab Order (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-004
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ไม่มี Order ยา มีเฉพาะ Lab Order (Sign แล้ว)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- Lab Order เช่น CBC

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ

Expected Result
- แสดงจุดบริการ Lab พร้อมปุ่มพิมพ์ใบนำทาง

Actual Result
- -

หมายเหตุ
- AC 2.1
- เทคนิค: EP — Order Type กลุ่ม Lab
```

### TC-SBH-2233-005 - แสดงปุ่มพิมพ์ใบนำทาง เมื่อ Visit มี X-ray Order (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-005
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ไม่มี Order ยา มีเฉพาะ X-ray Order (Sign แล้ว)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- X-ray Order เช่น Chest PA upright

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ

Expected Result
- แสดงจุดบริการ X-ray พร้อมปุ่มพิมพ์ใบนำทาง

Actual Result
- -

หมายเหตุ
- AC 2.1
- เทคนิค: EP — Order Type กลุ่ม X-ray
```

### TC-SBH-2233-006 - แสดงปุ่มพิมพ์ใบนำทาง เมื่อ Visit มี Image Order (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-006
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ไม่มี Order ยา มีเฉพาะ Image Order ที่ไม่ใช่ X-ray (เช่น Ultrasound) (Sign แล้ว)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- Image Order 1 รายการ

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ

Expected Result
- แสดงจุดบริการของ Image Order พร้อมปุ่มพิมพ์ใบนำทาง

Actual Result
- -

หมายเหตุ
- AC 2.1
- เทคนิค: EP — Order Type กลุ่ม Image
```

### TC-SBH-2233-007 - แสดงปุ่มพิมพ์ใบนำทาง เมื่อ Visit มี Activity Order (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-007
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ไม่มี Order ยา มีเฉพาะ Activity Order (เช่น ทำแผล) (Sign แล้ว)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- Activity Order 1 รายการ

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ

Expected Result
- แสดงจุดบริการของ Activity (เช่น ห้องหัตถการ) พร้อมสถานที่ และปุ่มพิมพ์ใบนำทาง

Actual Result
- -

หมายเหตุ
- AC 2.1 · SBH-2386 AC10 (Activity ต้องแสดง destination ได้หลังเก็บ ordered Location)
- เทคนิค: EP — Order Type กลุ่ม Activity
```

### TC-SBH-2233-008 - แสดงชื่อจุดบริการ สถานที่ และรายการ Order ของแต่ละจุดบริการ (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-008
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ชุด B (Lab + X-ray + Activity)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- Lab: CBC, FBS · X-ray: Chest PA · Activity: ทำแผล

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ > ส่วนใบนำทางไปจุดบริการอื่น

Expected Result
- แสดง 3 จุดบริการ แต่ละจุดมีชื่อจุดบริการ (ห้องบริการตาม Location ที่ Category ผูก) สถานที่ และรายการ Order ของจุดนั้นถูกต้อง

Actual Result
- -

หมายเหตุ
- AC 2.2.1 – 2.2.2 · SBH-2385 AC2
```

### TC-SBH-2233-009 - รวม Order ที่ไปจุดบริการและสถานที่เดียวกันเป็นจุดบริการเดียว (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-009
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ไม่มี Order ยา มี Lab Order 3 รายการที่ไปห้อง Lab เดียวกัน (QSU + Location เดียวกัน)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- Lab: CBC, FBS, HbA1c (ห้องเดียวกัน)

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ

Expected Result
- แสดงเป็น 1 จุดบริการ ที่มีรายการ Order ทั้ง 3 รายการ

Actual Result
- -

หมายเหตุ
- SBH-2386 AC6 (grouping QSU + Location)
```

### TC-SBH-2233-010 - แยก Order ที่จุดบริการเดียวกันแต่คนละสถานที่เป็นคนละจุดบริการ (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-010
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ไม่มี Order ยา มี Order 2 รายการที่ QSU เดียวกันแต่คนละ Location (ต้องเตรียม master data ให้ Category ผูกคนละห้อง)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- Order 2 รายการ QSU เดียวกัน · Location ต่างกัน

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ

Expected Result
- แสดงเป็น 2 จุดบริการแยกกันตาม Location

Actual Result
- -

หมายเหตุ
- SBH-2385 AC2 · SBH-2386 AC7
```

### TC-SBH-2233-011 - พิมพ์ใบนำทางแยกทีละจุดบริการ หนึ่งจุดบริการต่อหนึ่งใบ (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-011
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ชุด B (3 จุดบริการ)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- จุดบริการ X-ray

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ
2. กดปุ่มพิมพ์ที่แถวจุดบริการ X-ray
3. ดูเอกสารที่ได้

Expected Result
- ได้ใบนำทาง 1 ใบ ที่มีเฉพาะจุดบริการ X-ray และ Order ของ X-ray ไม่รวม Order หรือสถานที่ของจุดบริการอื่น

Actual Result
- -

หมายเหตุ
- AC 2.2.3 · SBH-2386 AC12–14
```

### TC-SBH-2233-012 - แสดงข้อมูลผู้ป่วยครบในใบนำทาง (ใบนำทาง)

Status: Not Run · Labels: เหมือน TC-001 (QA Type : UIUX)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-012
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. ทำ TC-SBH-2233-011 แล้ว (มีใบนำทางที่พิมพ์)

Test Data
- ใบนำทางจุดบริการ X-ray

Test Steps
1. ดูส่วนข้อมูลผู้ป่วยในใบนำทาง

Expected Result
- มี Logo โรงพยาบาลสระบุรี · Barcode HN · HN · ชื่อ–นามสกุล · วันเดือนปีเกิด · VN ครบและตรงกับคนไข้

Actual Result
- -

หมายเหตุ
- AC 1.1–1.5 · Mockup ในการ์ดยังเป็น Logo / ชื่อ รพ. มหาวิทยาลัยนเรศวร — ต้องเป็นของ รพ.สระบุรี
```

### TC-SBH-2233-013 - แสดงหน่วยบริการ สถานที่ และแพทย์ผู้สั่ง Order ในใบนำทาง (ใบนำทาง)

Status: Not Run · Labels: เหมือน TC-012

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-013
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. ทำ TC-SBH-2233-011 แล้ว

Test Data
- ใบนำทางจุดบริการ X-ray

Test Steps
1. ดูส่วนข้อมูลปลายทางในใบนำทาง

Expected Result
- แสดงหน่วยบริการ สถานที่ รายการ Order และชื่อแพทย์ผู้สั่ง Order ตรงกับจุดบริการ X-ray

Actual Result
- -

หมายเหตุ
- AC 1.6, 1.7, 1.9
```

### TC-SBH-2233-014 - แสดงสิทธิ์หลักและสิทธิ์รองในใบนำทาง (ใบนำทาง)

Status: Not Run · Labels: เหมือน TC-012

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-014
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ชุด B มีสิทธิ์หลักและสิทธิ์รองใน Visit
2. ทำ TC-SBH-2233-011 แล้ว

Test Data
- สิทธิ์หลัก + สิทธิ์รองของ Visit

Test Steps
1. ดูส่วนสิทธิ์ในใบนำทาง

Expected Result
- แสดงสิทธิ์หลักและสิทธิ์รองตรงกับสิทธิ์ของ Visit

Actual Result
- -

หมายเหตุ
- AC 1.10, 1.11
```

### TC-SBH-2233-015 - ตรวจสอบใบนำทางไม่แสดงเวลานัดหมาย (ใบนำทาง)

Status: Not Run · Labels: เหมือน TC-012

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-015
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. ทำ TC-SBH-2233-011 แล้ว

Test Data
- ใบนำทางจุดบริการ X-ray

Test Steps
1. ดูทั้งใบนำทาง

Expected Result
- ไม่มีบรรทัด "เวลานัดหมาย"

Actual Result
- -

หมายเหตุ
- AC 1.8 (ตัดเวลานัดหมายออก)
```

### TC-SBH-2233-016 - สร้างคิว Manual ด้วยปุ่ม Create Queue โดยกรอก HN (หน้า Cashier queue list)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-016
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. Login ด้วยผู้ใช้การเงิน
2. คนไข้ชุด B นำใบนำทางมาติดต่อ (ไม่มี Cashier Queue อัตโนมัติ)

Test Data
- HN ของคนไข้ชุด B

Test Steps
1. เปิดหน้า Cashier queue list > กดปุ่ม "Create Queue"
2. กรอก HN และข้อมูลที่จำเป็นใน modal > ยืนยัน

Expected Result
- สร้างคิวสำเร็จ และคิวของคนไข้แสดงในรายการคิว Cashier

Actual Result
- -

หมายเหตุ
- AC เพิ่มเติม 3 · ข้อสรุปเพิ่มเติม "Create Queue แบบ Manual"
```

### TC-SBH-2233-017 - สร้างคิวที่จุดบริการปลายทางเมื่อผู้ป่วยนำใบนำทางมาติดต่อ (หน้าจุดบริการ Lab)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-017
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ชุด B มีใบนำทางจุดบริการ Lab
2. Login ด้วยผู้ใช้จุดบริการ Lab

Test Data
- HN ของคนไข้ชุด B

Test Steps
1. เปิดหน้ารายการคิวของจุดบริการ Lab
2. สร้างคิว / Check-in คนไข้ด้วย HN ตามใบนำทาง

Expected Result
- สร้างคิวของคนไข้ในจุดบริการ Lab สำเร็จ

Actual Result
- -

หมายเหตุ
- AC เพิ่มเติม 3 · SBH-2385 AC8 · วิธี Check-in (สแกน Barcode / ค้นหา HN / Worklist) ยังเป็น pending decision
```

### TC-SBH-2233-018 - ตรวจสอบลำดับคิวของจุดบริการเรียงแบบ FIFO (หน้าจุดบริการ Lab)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-018
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ทดสอบ 2 ราย (X แล้ว Y) มีใบนำทางจุดบริการ Lab
2. Login ด้วยผู้ใช้จุดบริการ Lab

Test Data
- คนไข้ X สร้างคิวก่อน · คนไข้ Y สร้างคิวหลัง

Test Steps
1. สร้างคิวคนไข้ X แล้วตามด้วยคนไข้ Y
2. ดูลำดับคิวในหน้ารายการคิว

Expected Result
- คนไข้ X อยู่ลำดับก่อนคนไข้ Y (มาก่อนได้ก่อน)

Actual Result
- -

หมายเหตุ
- Flow ข้อ 3 · SBH-2385 AC8
```

### TC-SBH-2233-019 - แสดง tab OPD และ IPD ในหน้ารายการคิว Cashier (หน้า Cashier queue list)

Status: Not Run · Labels: เหมือน TC-012

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-019
- Scenario ID: TS-SBH-2233-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. Login ด้วยผู้ใช้การเงิน

Test Data
- -

Test Steps
1. เปิดหน้า Cashier queue list (cashier/queue-list)
2. ดู tab ของรายการบัญชี

Expected Result
- มี tab OPD และ IPD แยกตามประเภทงาน

Actual Result
- -

หมายเหตุ
- AC เพิ่มเติม 4 (เฉพาะ tab — filter / column ยังไม่มี spec)
```

---

## TS-SBH-2233-UHP - ไม่แสดงปุ่มพิมพ์ที่ไม่ควรมี และไม่เดาห้องปลายทาง

Status: Ready for Testing · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2233-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: OPD / Queue
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

วัตถุประสงค์
- ยืนยันว่าหน้า Discharge ไม่แสดงปุ่มพิมพ์ใบนำทางเมื่อไม่มีปลายทาง ไม่มีปุ่มพิมพ์บัตรคิวการเงิน และไม่พิมพ์ห้องปลายทางที่เดาเอง

ขอบเขต Requirement
- SBH-2385 AC4, AC7 · SBH-2386 AC9

ความเสี่ยง
- ผู้ป่วยได้ใบนำทางว่าง / ผิดห้อง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2233-020 - ตรวจสอบไม่แสดงปุ่มพิมพ์ใบนำทาง เมื่อ Visit ไม่มี Order ที่รองรับ (หน้า Discharge)

Status: Not Run · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Unhappy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-020
- Scenario ID: TS-SBH-2233-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ไม่มี Order ยา และไม่มี Lab / X-ray / Image / Activity Order
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- Visit ที่ไม่มี Order ที่รองรับ

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ

Expected Result
- ไม่แสดงปุ่มพิมพ์ใบนำทาง

Actual Result
- -

หมายเหตุ
- SBH-2385 AC7
```

### TC-SBH-2233-021 - ตรวจสอบไม่แสดงปุ่มพิมพ์บัตรคิวการเงินที่หน้า Discharge (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-020

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-021
- Scenario ID: TS-SBH-2233-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. คนไข้ชุด B (ไม่มียา มี Order ไปจุดบริการอื่น)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- คนไข้ชุด B

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ

Expected Result
- ไม่มีปุ่มพิมพ์บัตรคิวการเงินในส่วนใบนำทาง (มีเฉพาะปุ่มพิมพ์ใบนำทาง)

Actual Result
- -

หมายเหตุ
- SBH-2385 AC4 · Decision 1 ต.ค. 2026
```

### TC-SBH-2233-022 - ตรวจสอบไม่แสดงห้องปลายทางที่เดาเอง เมื่อหาสถานที่ของ Order ไม่ได้ (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-020

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2233-022
- Scenario ID: TS-SBH-2233-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2233 — [OPD] [Queue] Queue Improvement

Preconditions
1. มี Order ที่ Category ไม่ได้ผูก Location และไม่มี default location (ต้องเตรียม master data)
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- Order ที่ resolve Location ไม่ได้

Test Steps
1. เปิด Visit > จำหน่ายผู้ป่วย > การจัดการหลังตรวจ

Expected Result
- ระบบไม่แสดงห้องปลายทางที่เดาเอง และแจ้งให้ผู้ใช้รู้ว่าข้อมูลสถานที่ไม่ครบ

Actual Result
- -

หมายเหตุ
- SBH-2386 AC9 · Destination grouping decision (SBH-2385)
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- การ์ดยังเป็น In Progress — Dev บอกว่าพร้อม review เฉพาะส่วน Discharge / ใบนำทาง (SBH-2625–2628) · ส่วน Cashier queue list / Create Queue / tab OPD-IPD ยังไม่รู้ว่าพร้อมหรือยัง
- AC เพิ่มเติม 4: filter และ column "ตาม UI ที่ตกลงกับเตชิน" ไม่มี spec ในการ์ด — สร้าง TC ได้เฉพาะ tab OPD / IPD
- AC เพิ่มเติม 5: policy คิวซ้ำ (Auto vs Manual) ยังไม่ได้ข้อสรุป — สร้าง TC ไม่ได้
- Option ของ Cashier (Quick win พิมพ์บัตรคิว / เพิ่มปุ่ม Call Queue + Print) ยังไม่ได้เลือก
- Mockup หน้า Discharge มีปุ่ม "พิมพ์ใบนำทางรวม" และส่วน "บัตรคิว (ของเดิม)" ที่มีปุ่มพิมพ์ — ขัดกับ decision SBH-2385 (1 destination = 1 ใบ, ไม่มีปุ่มบัตรคิวการเงินบน Discharge)
- Mockup ใบนำทางยังเป็น Logo / ชื่อ รพ. มหาวิทยาลัยนเรศวร
- Pending decisions ใน SBH-2385 / 2386: วิธี Check-in · Reprint · Category ผูกหลาย Location · แพทย์ผู้สั่งเมื่อหนึ่งจุดบริการมีหลายแพทย์ · ขนาดกระดาษ

Validation
- modal Create Queue: "ข้อมูลที่จำเป็นต่อการสร้างคิว" มีอะไรบ้าง และกรอก HN ผิด / ไม่มีในระบบ ต้องแจ้งอย่างไร — การ์ดไม่ระบุ

Error handling
- -

Permission / role
- ไม่ระบุว่า role ไหนกด Create Queue ได้ (การเงิน / จุดบริการปลายทาง)

Edge cases
- Visit มีทั้งยาและ Order ไปจุดบริการอื่น — ต้องแสดงใบนำทางด้วยหรือไม่ (AC บอกเฉพาะกรณีไม่มียา)
- Appointment Location ที่จองจริงต้องมาก่อน Default Location (SBH-2386 AC8) — ยังไม่สร้าง TC ถ้าต้องการเพิ่มบอกได้
