# Draft Test Structure — SBH-1732

> สถานะ: **สร้างใน Linear แล้ว (2026-10-16)**
> - EXE SBH-2670 → HPY SBH-2671 (TC 001–011 = SBH-2673–2683) · UHP SBH-2672 (TC 012–015 = SBH-2684–2687)
> - Env: Dev-X / SBH Prod · QA Module : Pharmacy · QA Sub-module / Feature : Prescription
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)

Requirement: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)
URL: https://linear.app/cortexcloud/issue/SBH-1732
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: Urgent · State: Ready for Testing
Labels: 🍄 Improvement, SBH - UAT D4 Pharmacy, For OPD Biz Sim - SBH, VERSION 2.9.0 · Assignee: Puwadon (Pooh) · ผูก Cycle อยู่ → Run Type = CT
Sub-Issue: CTXN-9135 (Design Task — Done) · PR ทั้งหมดเป็น V2.9.0 ตรงกับ label

จุดพิมพ์ (จากรูป To be ในการ์ด)
- CPOE (แพทย์): modal "จัดการการเติมยา (Refill)" → ปุ่มมุมขวาบน เดิม "พิมพ์ใบค้างจ่ายยา" → เปลี่ยนเป็น "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา"
- Discharge (พยาบาล): แท็บ dischargeForm → ปุ่ม "พิมพ์ใบ Refill ยา" · มีส่วน "เอกสารประกอบการรับบริการครั้งนี้"
- ประวัติการรักษา (ทุก role): แท็บ OPD Summary → ปุ่ม "พิมพ์ใบ Refill ยา" ใต้ "พิมพ์สรุป" / "พิมพ์ OPD Slip"
- หน้าใบยา ห้องยา (เภสัช — จุดเดิม As is): แท็บ Prescription → ปุ่ม "พิมพ์ใบยา ▾" → เมนู "พิมพ์ใบ Refill ยา" / "Print Refill Prescription"

| AC / BR | Expected Results | TC |
|---|---|---|
| AC2 / BR2 | CPOE modal "จัดการการเติมยา" ปุ่มชื่อ "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา" และกดแล้วพิมพ์ใบ Refill ยาได้ | 001, 002 |
| AC3 / BR3 | Discharge มีปุ่ม "พิมพ์ใบ Refill ยา" ใต้ปุ่มพิมพ์คิวยา และกดแล้วพิมพ์ได้ | 003, 004 |
| AC4 / BR4 | ประวัติการรักษามีปุ่ม "พิมพ์ใบ Refill ยา" พิมพ์จาก Visit เก่าได้ ไม่จำกัด role | 005, 006 |
| AC5 / BR5 | แก้ข้อมูลยา / กำหนดการ Refill หลังสั่ง แล้วพิมพ์ → แสดงค่าล่าสุด (เช่น จำนวนจ่าย, วันที่เติมยา) | 007, 008, 011 |
| AC6 / BR6 | Discharge รวมเอกสารอื่นใน VN เดียวกัน (ใบรับรองแพทย์ ฯลฯ) มา Print พร้อมใบ Refill ยาได้ | 009 |
| AC1 / BR1 | ไม่มียา Refill → ปุ่ม "พิมพ์ใบ Refill ยา" disable ทุกจุด (CPOE, Discharge, ประวัติการรักษา) | 012, 013, 014 (+ 015 หน้าใบยา ห้องยา) |
| As is (ผู้ใช้สั่งเพิ่ม) | จุดพิมพ์เดิมที่หน้าใบยา ห้องยา ยังพิมพ์ได้ | 010 |

ข้อมูลตั้งต้น: แพทย์สั่งยา Refill (เช่น 3 รอบ) ให้คนไข้ทดสอบที่ CPOE · คนไข้ทดสอบอีกรายที่มี Visit แต่ไม่มียา Refill

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: UAT#3 Cashier, Pharmacy, Queue
Labels: 🍄 Improvement, SBH - UAT D4 Pharmacy, For OPD Biz Sim - SBH, VERSION 2.9.0, QA Module : Pharmacy, QA Sub-module / Feature : Prescription, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: OPD / Pharmacy
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- พิมพ์ใบ Refill ยาจาก CPOE / Discharge / ประวัติการรักษา (AC2–AC4) และหน้าใบยา ห้องยา (จุดเดิม)
- เอกสารแสดงข้อมูลล่าสุดหลังแก้ไข (AC5)
- รวมเอกสารอื่นใน VN เดียวกันที่หน้า Discharge (AC6)
- ปุ่ม disable เมื่อไม่มียา Refill (AC1)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1732-HPY - พิมพ์ใบ Refill ยาจาก CPOE Discharge ประวัติการรักษา และหน้าใบยาของห้องยา

Status: Ready for Testing · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Suffix: HPY
- Module: OPD / Pharmacy
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

วัตถุประสงค์
- ยืนยันว่าแพทย์ พยาบาล เภสัช และผู้ใช้ทั่วไปพิมพ์ใบ Refill ยาได้จากทั้ง 4 จุด เอกสารแสดงข้อมูลล่าสุด และหน้า Discharge รวมเอกสารอื่นใน VN เดียวกันมาพิมพ์ได้

ขอบเขต Requirement
- AC2: CPOE ปุ่ม "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา" พิมพ์ได้
- AC3: Discharge ปุ่ม "พิมพ์ใบ Refill ยา" ใต้ปุ่มพิมพ์คิวยา พิมพ์ได้
- AC4: ประวัติการรักษา พิมพ์จาก Visit เก่าได้ · BR4 ไม่จำกัด role
- AC5: เอกสารแสดงค่าที่แก้ไขล่าสุด
- AC6: Discharge รวมเอกสารอื่นใน VN เดียวกันมาพิมพ์

ความเสี่ยง
- คนไข้ไม่ได้รับใบ Refill เมื่อแพทย์ไม่ได้พิมพ์ในห้องตรวจ
- ใบ Refill แสดงจำนวน / วันที่เดิมหลังแก้ไข ทำให้คนไข้มาเติมยาผิดวัน
- คนไข้ทำใบหายแล้วพิมพ์ย้อนหลังไม่ได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1732-001 - แสดงชื่อปุ่มพิมพ์ใบค้างจ่ายยา/ใบ Refill ยา ใน modal จัดการการเติมยา (หน้า CPOE)

Status: Not Run · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-001
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้แพทย์ และเปิด OPD Visit ของคนไข้ทดสอบ
2. สั่งยา Refill ลงตะกร้าแล้ว

Test Data
- ยา Refill 3 รอบ

Test Steps
1. หน้า CPOE เปิด modal "จัดการการเติมยา (Refill)" ของยาที่สั่ง
2. ดูปุ่มพิมพ์มุมขวาบนของ modal

Expected Result
- ปุ่มแสดงชื่อ "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา" (ไม่ใช่ "พิมพ์ใบค้างจ่ายยา")

Actual Result
- -

หมายเหตุ
- AC2 · BR2
```

### TC-SBH-1732-002 - พิมพ์ใบ Refill ยาจากปุ่มใน modal จัดการการเติมยา (หน้า CPOE)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-002
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้แพทย์ และเปิด OPD Visit ของคนไข้ทดสอบ
2. สั่งยา Refill 3 รอบแล้ว

Test Data
- ยา Refill 3 รอบ

Test Steps
1. หน้า CPOE เปิด modal "จัดการการเติมยา (Refill)"
2. กดปุ่ม "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา"
3. ดูเอกสารที่ได้

Expected Result
- ได้เอกสารใบ Refill ยา แสดงรายการยาและรอบเติมยาตรงกับที่สั่ง

Actual Result
- -

หมายเหตุ
- AC2 · BR2
```

### TC-SBH-1732-003 - แสดงปุ่มพิมพ์ใบ Refill ยาอยู่ใต้ปุ่มพิมพ์คิวยา (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-003
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้พยาบาล
2. คนไข้ทดสอบมี Visit ที่แพทย์สั่งยา Refill แล้ว

Test Data
- Visit ที่มียา Refill

Test Steps
1. เปิด Visit ของคนไข้ > หน้า Discharge
2. ดูตำแหน่งปุ่ม "พิมพ์ใบ Refill ยา"

Expected Result
- มีปุ่ม "พิมพ์ใบ Refill ยา" อยู่ใต้ปุ่มพิมพ์คิวยา

Actual Result
- -

หมายเหตุ
- AC3 · BR3 · รูป To be ในการ์ดแสดงปุ่มอยู่ใต้ปุ่ม "บันทึก" (ดู gap)
```

### TC-SBH-1732-004 - พิมพ์ใบ Refill ยาจากปุ่มพิมพ์ใบ Refill ยา (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001 (QA Type : Functional)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-004
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้พยาบาล
2. คนไข้ทดสอบมี Visit ที่แพทย์สั่งยา Refill แล้ว (แพทย์ไม่ได้พิมพ์ใบให้)

Test Data
- Visit ที่มียา Refill

Test Steps
1. เปิด Visit ของคนไข้ > หน้า Discharge
2. กดปุ่ม "พิมพ์ใบ Refill ยา"
3. ดูเอกสารที่ได้

Expected Result
- ได้เอกสารใบ Refill ยา แสดงรายการยาและรอบเติมยาตรงกับที่แพทย์สั่ง

Actual Result
- -

หมายเหตุ
- AC3 · BR3
```

### TC-SBH-1732-005 - พิมพ์ใบ Refill ยาย้อนหลังจาก Visit เก่า (หน้าประวัติการรักษา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-005
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. คนไข้ทดสอบมี Visit เก่า (ไม่ใช่ Visit ปัจจุบัน) ที่มียา Refill

Test Data
- Visit เก่าที่มียา Refill

Test Steps
1. เปิดคนไข้ > ประวัติการรักษา
2. เลือก Visit เก่าที่มียา Refill > แท็บ OPD Summary
3. กดปุ่ม "พิมพ์ใบ Refill ยา"

Expected Result
- ได้เอกสารใบ Refill ยาของ Visit เก่านั้น

Actual Result
- -

หมายเหตุ
- AC4 · BR4
```

### TC-SBH-1732-006 - พิมพ์ใบ Refill ยาได้ ด้วยผู้ใช้ที่ไม่ใช่เภสัช (หน้าประวัติการรักษา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-006
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้พยาบาล
2. คนไข้ทดสอบมี Visit ที่มียา Refill

Test Data
- Visit ที่มียา Refill

Test Steps
1. เปิดคนไข้ > ประวัติการรักษา > เลือก Visit ที่มียา Refill > แท็บ OPD Summary
2. กดปุ่ม "พิมพ์ใบ Refill ยา"

Expected Result
- ปุ่มกดได้ และได้เอกสารใบ Refill ยา

Actual Result
- -

หมายเหตุ
- BR4 (ไม่จำกัด role)
```

### TC-SBH-1732-007 - แสดงจำนวนจ่ายล่าสุดในใบ Refill ยา หลังแก้จำนวนจ่ายของรอบเติมยา (หน้า CPOE)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-007
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้แพทย์
2. สั่งยา Refill 3 รอบแล้ว (จดจำนวนจ่ายของเติมยาครั้งที่ 1 ไว้)

Test Data
- เติมยาครั้งที่ 1: จำนวนจ่ายเดิม 2 → แก้เป็น 5

Test Steps
1. เปิด modal "จัดการการเติมยา (Refill)" > แก้จำนวนจ่ายของเติมยาครั้งที่ 1 จาก 2 เป็น 5 > ยืนยัน
2. กดปุ่ม "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา"
3. ดูจำนวนจ่ายของเติมยาครั้งที่ 1 ในเอกสาร

Expected Result
- เอกสารแสดงจำนวนจ่ายของเติมยาครั้งที่ 1 เป็น 5 (ค่าที่แก้ล่าสุด) ไม่ใช่ 2

Actual Result
- -

หมายเหตุ
- AC5 · BR5
```

### TC-SBH-1732-008 - แสดงวันที่เติมยาล่าสุดในใบ Refill ยา หลังแก้วันที่ของรอบเติมยา (หน้า CPOE)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-008
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้แพทย์
2. สั่งยา Refill 3 รอบแล้ว (จดวันที่ของเติมยาครั้งที่ 1 ไว้)

Test Data
- เติมยาครั้งที่ 1: เลื่อนวันที่ออกไป 7 วัน

Test Steps
1. เปิด modal "จัดการการเติมยา (Refill)" > แก้วันที่ของเติมยาครั้งที่ 1 > ยืนยัน
2. กดปุ่ม "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา"
3. ดูวันที่ของเติมยาครั้งที่ 1 ในเอกสาร

Expected Result
- เอกสารแสดงวันที่เติมยาครั้งที่ 1 เป็นวันที่ที่แก้ล่าสุด ไม่ใช่วันที่เดิม

Actual Result
- -

หมายเหตุ
- AC5 · BR5 · ตรวจรูปแบบปี พ.ศ. / ค.ศ. ในเอกสารให้ตรงกับที่แสดงบนจอ
```

### TC-SBH-1732-009 - พิมพ์ใบ Refill ยารวมกับเอกสารอื่นใน VN เดียวกัน (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-009
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. คนไข้ทดสอบมี Visit ที่แพทย์สั่งยา Refill และออกใบรับรองแพทย์ใน VN เดียวกันแล้ว
2. Login ด้วยผู้ใช้พยาบาล

Test Data
- VN ที่มียา Refill + ใบรับรองแพทย์ 1 ฉบับ

Test Steps
1. เปิด Visit ของคนไข้ > หน้า Discharge
2. ดูส่วน "เอกสารประกอบการรับบริการครั้งนี้"
3. สั่งพิมพ์เอกสารจากจุดนี้

Expected Result
- พิมพ์ใบ Refill ยาพร้อมใบรับรองแพทย์ของ VN เดียวกันได้จากจุดเดียว

Actual Result
- -

หมายเหตุ
- AC6 · BR6 · การ์ดไม่ระบุวิธีเลือก / รวมเอกสาร (ดู gap)
```

### TC-SBH-1732-010 - พิมพ์ใบ Refill ยาจากเมนูพิมพ์ใบยา (หน้าใบยา ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-010
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. มีใบยาของคนไข้ทดสอบที่มียา Refill

Test Data
- ใบยาที่มียา Refill

Test Steps
1. การจัดการรายการสั่งยา OPD > เปิดใบยาที่มียา Refill (แท็บ Prescription)
2. กดปุ่ม "พิมพ์ใบยา" ด้านล่าง > เลือก "พิมพ์ใบ Refill ยา"
3. ดูเอกสารที่ได้

Expected Result
- ได้เอกสารใบ Refill ยา แสดงรายการยาและรอบเติมยาตรงกับที่สั่ง

Actual Result
- -

หมายเหตุ
- จุดพิมพ์เดิม (As is) ที่ยังต้องใช้ได้หลังเพิ่มจุดใหม่ (ผู้ใช้สั่งให้เช็กส่วนของเภสัช 2026-10-16)
```

### TC-SBH-1732-011 - แสดงข้อมูลล่าสุดในใบ Refill ยา หลังแก้จำนวนจ่ายของรอบเติมยา (หน้าใบยา ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-011
- Scenario ID: TS-SBH-1732-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. แพทย์สั่งยา Refill 3 รอบแล้ว และแก้จำนวนจ่ายของเติมยาครั้งที่ 1 จาก 2 เป็น 5 ใน modal "จัดการการเติมยา (Refill)"
2. Login ด้วยผู้ใช้เภสัช

Test Data
- เติมยาครั้งที่ 1: จำนวนจ่ายเดิม 2 → แก้เป็น 5

Test Steps
1. การจัดการรายการสั่งยา OPD > เปิดใบยาของคนไข้ (แท็บ Prescription)
2. กดปุ่ม "พิมพ์ใบยา" > เลือก "พิมพ์ใบ Refill ยา"
3. ดูจำนวนจ่ายของเติมยาครั้งที่ 1 ในเอกสาร

Expected Result
- เอกสารแสดงจำนวนจ่ายของเติมยาครั้งที่ 1 เป็น 5 (ค่าที่แก้ล่าสุด) ไม่ใช่ 2

Actual Result
- -

หมายเหตุ
- AC5 · BR5 (พิมพ์จากจุดใดก็ตามต้องได้ค่าล่าสุด)
```

---

## TS-SBH-1732-UHP - ปุ่มพิมพ์ใบ Refill ยาถูก disable เมื่อไม่มียา Refill

Status: Ready for Testing · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1732-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: OPD / Pharmacy
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

วัตถุประสงค์
- ยืนยันว่าปุ่ม "พิมพ์ใบ Refill ยา" ทุกจุดกดไม่ได้เมื่อรายการนั้นไม่มียา Refill

ขอบเขต Requirement
- AC1 / BR1: ไม่มียา Refill → ปุ่ม disable ทุกจุด (CPOE, Discharge, ประวัติการรักษา)

ความเสี่ยง
- พิมพ์ใบ Refill ว่าง / ผิดให้คนไข้ที่ไม่มียา Refill

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1732-012 - ตรวจสอบปุ่มพิมพ์ใบ Refill ยาถูก disable เมื่อไม่มียา Refill (หน้า CPOE)

Status: Not Run · Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Case : Unhappy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-012
- Scenario ID: TS-SBH-1732-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้แพทย์ และเปิด OPD Visit ของคนไข้ทดสอบ
2. สั่งยาที่ไม่ได้ตั้งรอบ Refill

Test Data
- ยาที่ไม่มีรอบ Refill

Test Steps
1. หน้า CPOE เปิด modal "จัดการการเติมยา (Refill)" ของยาที่ไม่ได้ตั้งรอบ Refill
2. ดูปุ่ม "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา"

Expected Result
- ปุ่มพิมพ์ใบ Refill ยาแสดงเป็นสถานะ disable

Actual Result
- -

หมายเหตุ
- AC1 · BR1 · ปุ่มนี้รวมใบค้างจ่ายยาด้วย (ดู gap)
```

### TC-SBH-1732-013 - ตรวจสอบปุ่มพิมพ์ใบ Refill ยาถูก disable เมื่อ Visit ไม่มียา Refill (หน้า Discharge)

Status: Not Run · Labels: เหมือน TC-012

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-013
- Scenario ID: TS-SBH-1732-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้พยาบาล
2. คนไข้ทดสอบมี Visit ที่ไม่มียา Refill

Test Data
- Visit ที่ไม่มียา Refill

Test Steps
1. เปิด Visit ของคนไข้ > หน้า Discharge
2. ดูปุ่ม "พิมพ์ใบ Refill ยา"

Expected Result
- ปุ่ม "พิมพ์ใบ Refill ยา" แสดงเป็นสถานะ disable

Actual Result
- -

หมายเหตุ
- AC1 · BR1
```

### TC-SBH-1732-014 - ตรวจสอบปุ่มพิมพ์ใบ Refill ยาถูก disable เมื่อ Visit ไม่มียา Refill (หน้าประวัติการรักษา)

Status: Not Run · Labels: เหมือน TC-012

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-014
- Scenario ID: TS-SBH-1732-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. คนไข้ทดสอบมี Visit ที่ไม่มียา Refill

Test Data
- Visit ที่ไม่มียา Refill

Test Steps
1. เปิดคนไข้ > ประวัติการรักษา > เลือก Visit ที่ไม่มียา Refill > แท็บ OPD Summary
2. ดูปุ่ม "พิมพ์ใบ Refill ยา"

Expected Result
- ปุ่ม "พิมพ์ใบ Refill ยา" แสดงเป็นสถานะ disable

Actual Result
- -

หมายเหตุ
- AC1 · BR1
```

### TC-SBH-1732-015 - ตรวจสอบเมนูพิมพ์ใบ Refill ยาถูก disable เมื่อใบยาไม่มียา Refill (หน้าใบยา ห้องยา)

Status: Not Run · Labels: เหมือน TC-012

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1732-015
- Scenario ID: TS-SBH-1732-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1732 — [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา (ปัจจุบันและย้อนหลัง)

Preconditions
1. Login ด้วยผู้ใช้เภสัช
2. มีใบยาของคนไข้ทดสอบที่ไม่มียา Refill

Test Data
- ใบยาที่ไม่มียา Refill

Test Steps
1. การจัดการรายการสั่งยา OPD > เปิดใบยาที่ไม่มียา Refill (แท็บ Prescription)
2. กดปุ่ม "พิมพ์ใบยา" > ดูเมนู "พิมพ์ใบ Refill ยา"

Expected Result
- เมนู "พิมพ์ใบ Refill ยา" แสดงเป็นสถานะ disable กดไม่ได้

Actual Result
- -

หมายเหตุ
- AC1 · BR1 · จุดพิมพ์เดิม (As is) ของเภสัช
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- AC3 บอกว่าปุ่มที่หน้า Discharge อยู่ "ใต้ปุ่มพิมพ์คิวยา" แต่รูป To be แสดงปุ่มอยู่ใต้ปุ่ม "บันทึก" — ควรยืนยันตำแหน่งที่ถูก
- AC6: ไม่ระบุวิธีรวมเอกสาร (เลือกเอกสารเอง / พิมพ์ทั้งหมดอัตโนมัติ / ปุ่มเดียวกับ "พิมพ์ใบ Refill ยา") และเอกสารประเภทไหนบ้างที่ต้องกวาดมา
- CPOE: ปุ่มเป็น "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา" (รวม 2 เอกสาร) — ถ้าไม่มียา Refill แต่มียาค้างจ่าย ปุ่มต้อง disable หรือพิมพ์ใบค้างจ่ายได้ (AC1 ขัดกับการใช้ปุ่มร่วมกัน)
- CPOE: modal "จัดการการเติมยา" เปิดได้เฉพาะยาที่ตั้ง Refill หรือเปิดได้ทุกยา — กระทบวิธีทดสอบ TC-010
- "อาจเพิ่ม icon R" แสดง Visit ที่มียา Refill ในประวัติการรักษา — เขียนว่า "อาจ" จึงไม่สร้าง TC
- รูปแบบ / ข้อมูลที่ต้องอยู่ในเอกสารใบ Refill ยา ไม่ระบุในการ์ดนี้ (อ้าง SBH-1500 / SBH-1720)

Validation
- -

Error handling
- ไม่ระบุพฤติกรรมเมื่อพิมพ์ไม่สำเร็จ (สร้าง PDF ไม่ได้)

Permission / role
- BR4 ไม่จำกัด role เฉพาะหน้าประวัติการรักษา — จุด CPOE / Discharge จำกัด role หรือไม่ ไม่ระบุ

Edge cases
- Visit ที่มียา Refill หลายรายการ / หลาย Order เอกสารรวมเป็นใบเดียวหรือแยกใบ
