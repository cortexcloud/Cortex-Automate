# SBH-498 — [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner — Test Case (draft)

- Requirement: https://linear.app/cortexcloud/issue/SBH-498
- สร้างจาก Acceptance Criteria + Business Rules ของการ์ดโดยตรง ตาม skill `linear-testcase-writer` · โหมด **atomic** (ผู้ใช้เลือก 26 ต.ค. 2569)
- step ของแต่ละ TC มาจากการสำรวจ dev-x จริง 26 ต.ค. 2569 (ดู TODO.md หัวข้อ SBH-498)
- สถานะไฟล์นี้: **draft รอ review — ยังไม่สร้างใน Linear**
- รวม: 1 EXE · 1 Scenario · 9 Test Case
- Labels (ยืนยันแล้ว): QA Module : OPD · QA Sub-module / Feature : Patient Banner (**ยังไม่มีในระบบ — ต้องสร้างใหม่**) · Assignee: Neranchara Kaewsiri

---

## EXE

### EXE - CT - VERSION 2.9.0

Labels: 🍄 New Feature · SBH UAT D3 - EMR · Improvement for golive - SBH · VERSION 2.9.0 · QA Module : OPD · QA Sub-module / Feature : Patient Banner · QA Run : Cycle Test
Status: Ready for Testing

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: VERSION 2.9.0
- Module: EMR — Patient History / Patient Banner
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner
- Environment: DEV-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Section On Warfarin ในหน้า ประวัติทางการแพทย์ (แสดง / ติ๊กเข้า-ออก / ไม่มีช่องวันที่)
- Label "On Warfarin" บน Patient Banner ตามสถานะ Checked / Unchecked
- ประวัติการเปลี่ยนแปลง (วันที่ เวลา ผู้แก้ไข)
- คลิก Label แล้วเปิด Section On Warfarin

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- นอก scope: Alert ตอนสั่งยา (To-be แบบที่ 1 ไม่อยู่ใน AC) · เงื่อนไขเพศของ Maternal Status (แยกเป็น SBH-2953)
```

---

## Scenario

### TS-SBH-498-HPY - บันทึกสถานะ On Warfarin และแสดง Label บน Patient Banner

Labels: label ของ requirement + QA Module : OPD + QA Sub-module / Feature : Patient Banner + QA Case : Happy
Status: Ready for Testing

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-498-HPY
- Case Type: Happy
- Suffix: HPY
- Module: EMR — Patient History / Patient Banner
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner

วัตถุประสงค์
- ผู้ใช้บันทึกสถานะ On Warfarin ในหน้า ประวัติทางการแพทย์ แล้ว Patient Banner แสดง/ซ่อน Label ตามสถานะ พร้อมเก็บประวัติการแก้ไข

ขอบเขต Requirement
- AC 1–8
- Business Rule 1–7

ความเสี่ยง
- Label ไม่ตรงกับสถานะจริง ทำให้แพทย์ไม่รู้ว่าผู้ป่วยใช้ Warfarin อยู่ แล้วสั่งยาที่ไม่ควรสั่ง
- ไม่มีประวัติการแก้ไข ตรวจย้อนหลังไม่ได้ว่าใครเปลี่ยนสถานะ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

---

## Test Case

Labels ทุก TC: label ของ requirement + QA Module : OPD + QA Sub-module / Feature : Patient Banner + QA Case : Happy + QA Type ตามที่ระบุ + QA Execution Type: Manual
Status ทุก TC: Not Run

Preconditions ร่วม (ใช้ในทุก TC)
1. ล็อกอิน dev-x ด้วย user1 (Super_User)
2. มีผู้ป่วยทดสอบที่มี Visit OPD (เปิด Visit ที่คลินิก MED - ห้องตรวจโรคอายุรกรรมทั่วไป)

### [Required] TC-SBH-498-001 - ตรวจสอบการแสดง Section On Warfarin ในหน้าประวัติทางการแพทย์ตาม Design

QA Type: UIUX

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-498-001
- Scenario ID: TS-SBH-498-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner

Preconditions
1. ล็อกอิน dev-x ด้วย user1 (Super_User)
2. มีผู้ป่วยทดสอบที่มี Visit OPD และยังไม่เคยบันทึกสถานะ On Warfarin

Test Data
- ผู้ป่วยทดสอบใหม่ (สร้างที่เวชระเบียน) + Visit OPD

Test Steps
1. เปิดหน้าผู้ป่วยของ Visit OPD
2. กดเมนูซ้าย "ประวัติทางการแพทย์"
3. เลื่อนลงไปที่ Section "Maternal Status" และ Section ถัดไป

Expected Result
- มี Section หัวข้อ "On Warfarin" อยู่ถัดจาก Section "Maternal Status"
- ใน Section มี checkbox "On Warfarin" และข้อความ "ยังไม่บันทึก"
- ไม่มีช่อง วันที่เริ่มต้น / วันที่สิ้นสุด
- มีปุ่ม "ประวัติการเปลี่ยนแปลง" ที่หัว Section

Actual Result
- -

หมายเหตุ
- Design: Figma "SBH-XXX: [Patient History][Banner] On Warfarin" (node 196-21657) — ช่องวันที่ถูกตัดตามรูปในการ์ด
```

### [Required] TC-SBH-498-002 - ทดสอบติ๊กเลือก On Warfarin แล้วระบบบันทึกสถานะ

QA Type: Functional

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-498-002
- Scenario ID: TS-SBH-498-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner

Preconditions
1. ล็อกอิน dev-x ด้วย user1 (Super_User)
2. ผู้ป่วยทดสอบมี Visit OPD และ checkbox On Warfarin ยังไม่ถูกติ๊ก

Test Data
- ผู้ป่วยเดียวกับ TC-SBH-498-001

Test Steps
1. เปิดหน้าผู้ป่วย → เมนูซ้าย "ประวัติทางการแพทย์" → Section "On Warfarin"
2. ติ๊ก checkbox "On Warfarin"
3. โหลดหน้าใหม่ แล้วกลับไปที่ Section "On Warfarin"

Expected Result
- หลังติ๊ก checkbox ถูกติ๊กทันทีโดยไม่ต้องกดปุ่มบันทึก
- หลังโหลดหน้าใหม่ checkbox ยังถูกติ๊กอยู่

Actual Result
- -

หมายเหตุ
- -
```

### [Required] TC-SBH-498-003 - ทดสอบยกเลิกการเลือก On Warfarin แล้วระบบบันทึกสถานะ

QA Type: Functional

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-498-003
- Scenario ID: TS-SBH-498-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner

Preconditions
1. ล็อกอิน dev-x ด้วย user1 (Super_User)
2. ผู้ป่วยทดสอบมีสถานะ On Warfarin = ติ๊กอยู่ (ต่อจาก TC-SBH-498-002)

Test Data
- ผู้ป่วยเดียวกับ TC-SBH-498-001

Test Steps
1. เปิดหน้าผู้ป่วย → เมนูซ้าย "ประวัติทางการแพทย์" → Section "On Warfarin"
2. เอาติ๊ก checkbox "On Warfarin" ออก
3. โหลดหน้าใหม่ แล้วกลับไปที่ Section "On Warfarin"

Expected Result
- หลังเอาติ๊กออก checkbox ไม่ถูกติ๊กทันทีโดยไม่ต้องกดปุ่มบันทึก
- หลังโหลดหน้าใหม่ checkbox ยังไม่ถูกติ๊ก

Actual Result
- -

หมายเหตุ
- -
```

### [Required] TC-SBH-498-004 - แสดง Label On Warfarin บน Patient Banner เมื่อสถานะเป็น Checked

QA Type: Functional

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-498-004
- Scenario ID: TS-SBH-498-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner

Preconditions
1. ล็อกอิน dev-x ด้วย user1 (Super_User)
2. ผู้ป่วยทดสอบมี Visit OPD และ checkbox On Warfarin ยังไม่ถูกติ๊ก

Test Data
- ผู้ป่วยเดียวกับ TC-SBH-498-001

Test Steps
1. เปิดหน้าผู้ป่วย → ดู Patient Banner ว่ายังไม่มี Label "On Warfarin"
2. เมนูซ้าย "ประวัติทางการแพทย์" → ติ๊ก checkbox "On Warfarin"
3. ดู Patient Banner
4. โหลดหน้าใหม่ แล้วดู Patient Banner

Expected Result
- หลังติ๊ก Patient Banner แสดง Label "On Warfarin"
- หลังโหลดหน้าใหม่ Label "On Warfarin" ยังแสดงอยู่

Actual Result
- -

หมายเหตุ
- การ์ดไม่ได้กำหนดว่า Label ต้องแสดงที่หน้าผู้ป่วยแบบไหน (นอก scope) · ที่เห็นบน dev-x: Label แสดงและคลิกได้ทั้งหน้าที่มี Visit และไม่มี Visit · ควรเป็น: Label แสดงเหมือนกันทุกหน้าที่มี Patient Banner (มี/ไม่มี Visit, OPD/ER/IPD) และคลิกแล้วไป Section On Warfarin ได้ทุกหน้า — ให้ BA ยืนยัน
```

### [Required] TC-SBH-498-005 - ไม่แสดง Label On Warfarin บน Patient Banner เมื่อสถานะเป็น Unchecked

QA Type: Functional

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-498-005
- Scenario ID: TS-SBH-498-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner

Preconditions
1. ล็อกอิน dev-x ด้วย user1 (Super_User)
2. ผู้ป่วยทดสอบมีสถานะ On Warfarin = ติ๊กอยู่ และ Banner แสดง Label "On Warfarin"

Test Data
- ผู้ป่วยเดียวกับ TC-SBH-498-001

Test Steps
1. เปิดหน้าผู้ป่วย → เมนูซ้าย "ประวัติทางการแพทย์" → เอาติ๊ก checkbox "On Warfarin" ออก
2. ดู Patient Banner
3. โหลดหน้าใหม่ แล้วดู Patient Banner

Expected Result
- หลังเอาติ๊กออก Label "On Warfarin" หายจาก Patient Banner
- หลังโหลดหน้าใหม่ Patient Banner ไม่มี Label "On Warfarin"

Actual Result
- -

หมายเหตุ
- -
```

### [Required] TC-SBH-498-006 - บันทึกวันที่ เวลา และผู้แก้ไข เมื่อเปลี่ยนสถานะ On Warfarin

QA Type: Functional

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-498-006
- Scenario ID: TS-SBH-498-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner

Preconditions
1. ล็อกอิน dev-x ด้วย user1 (Super_User)
2. ผู้ป่วยทดสอบมี Visit OPD

Test Data
- ผู้ป่วยเดียวกับ TC-SBH-498-001
- ชื่อผู้แก้ไขของ user1 บน dev-x: นาย ทดสอบ มานะ

Test Steps
1. เปิดหน้าผู้ป่วย → เมนูซ้าย "ประวัติทางการแพทย์" → Section "On Warfarin"
2. ติ๊กหรือเอาติ๊ก checkbox "On Warfarin" ออก 1 ครั้ง แล้วจดเวลาที่กด
3. กดปุ่ม "ประวัติการเปลี่ยนแปลง"

Expected Result
- ในตารางประวัติการเปลี่ยนแปลง มีรายการใหม่ที่ วันที่และเวลา ตรงกับเวลาที่กด และ ผู้แก้ไข เป็นชื่อของ user ที่ล็อกอิน

Actual Result
- -

หมายเหตุ
- ใต้ checkbox แสดงชื่อผู้แก้ไขและเวลาครั้งล่าสุดด้วย (เช่น "นาย ทดสอบ มานะ 26/10/2569, 14:16")
```

### [Required] TC-SBH-498-007 - ตรวจสอบประวัติการเปลี่ยนแปลงสถานะ On Warfarin ย้อนหลัง

QA Type: Functional

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-498-007
- Scenario ID: TS-SBH-498-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner

Preconditions
1. ล็อกอิน dev-x ด้วย user1 (Super_User)
2. ผู้ป่วยทดสอบเคยติ๊กและเอาติ๊กออกแล้ว (ต่อจาก TC-SBH-498-002 และ 003)

Test Data
- ผู้ป่วยเดียวกับ TC-SBH-498-001

Test Steps
1. เปิดหน้าผู้ป่วย → เมนูซ้าย "ประวัติทางการแพทย์" → Section "On Warfarin"
2. กดปุ่ม "ประวัติการเปลี่ยนแปลง"

Expected Result
- เปิดหน้าต่าง "ประวัติการเปลี่ยนแปลง" มีคอลัมน์ สถานะเดิม / สถานะใหม่ / วันที่และเวลา / ผู้แก้ไข
- มีรายการครบทุกครั้งที่เปลี่ยนสถานะ เรียงใหม่สุดอยู่บน (เช่น "ยังไม่บันทึก → On Warfarin" และ "On Warfarin → ไม่ได้ใช้ Warfarin")

Actual Result
- -

หมายเหตุ
- -
```

### [Required] TC-SBH-498-008 - ตรวจสอบรูปแบบและตำแหน่งของ Label On Warfarin บน Patient Banner ตาม Design

QA Type: UIUX

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-498-008
- Scenario ID: TS-SBH-498-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner

Preconditions
1. ล็อกอิน dev-x ด้วย user1 (Super_User)
2. ผู้ป่วยทดสอบมีสถานะ On Warfarin = ติ๊กอยู่
3. มีผู้ป่วยหญิงที่บันทึก การตั้งครรภ์ หรือ การให้นมบุตร = มี ไว้เทียบหน้าตา Label

Test Data
- ผู้ป่วยหญิง: ติ๊ก On Warfarin + Maternal Status = มี (เห็น Label ทั้ง 2 แบบพร้อมกัน)

Test Steps
1. เปิดหน้าผู้ป่วยหญิงที่มีทั้ง Label ตั้งครรภ์/ให้นมบุตร และ On Warfarin
2. เทียบ Label "On Warfarin" กับ Label ตั้งครรภ์/ให้นมบุตร และกับ Figma

Expected Result
- Label "On Warfarin" มีรูปแบบเดียวกับ Label ตั้งครรภ์/ให้นมบุตร และอยู่ตำแหน่งตาม Design

Actual Result
- -

หมายเหตุ
- Design: Figma node 196-21657 · ในโค้ด Label ใช้ class คนละตัวกับป้ายตั้งครรภ์ (`on-warfarin-tag` vs `patient-profile-alert-tag`) — ต้องเทียบจากหน้าจอจริง
```

### [Required] TC-SBH-498-009 - คลิก Label On Warfarin บน Patient Banner แล้วเปิด Section On Warfarin

QA Type: Functional

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-498-009
- Scenario ID: TS-SBH-498-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-498 - [EMR] [Patient History] Label แสดงสถานะ "On Warfarin" บน Patient Banner

Preconditions
1. ล็อกอิน dev-x ด้วย user1 (Super_User)
2. ผู้ป่วยทดสอบมีสถานะ On Warfarin = ติ๊กอยู่

Test Data
- ผู้ป่วยเดียวกับ TC-SBH-498-001

Test Steps
1. เปิดหน้าผู้ป่วย → กดเมนูซ้ายอื่นที่ไม่ใช่ ประวัติทางการแพทย์ (เช่น "ประวัติการรักษา")
2. คลิก Label "On Warfarin" บน Patient Banner

Expected Result
- ระบบเปิดหน้า "ประวัติทางการแพทย์" และแสดง Section "On Warfarin" ในจอ

Actual Result
- -

หมายเหตุ
- อ้างอิง Business Rule ข้อ 7 (ไม่มีใน AC)
- การ์ดไม่ได้กำหนดว่า Label ต้องแสดงที่หน้าผู้ป่วยแบบไหน (นอก scope) · ที่เห็นบน dev-x: Label แสดงและคลิกได้ทั้งหน้าที่มี Visit และไม่มี Visit · ควรเป็น: Label แสดงเหมือนกันทุกหน้าที่มี Patient Banner (มี/ไม่มี Visit, OPD/ER/IPD) และคลิกแล้วไป Section On Warfarin ได้ทุกหน้า — ให้ BA ยืนยัน
```

---

## Requirement gaps (นอกลำดับชั้น)

- **permission/role:** การ์ดไม่ได้บอกว่า role ไหนแก้สถานะได้ / ดู Label ได้ (ในโค้ด Label แสดงเมื่อมีสิทธิ์ `patient-ehr:view`)
- **error handling:** การ์ดไม่ได้บอกพฤติกรรมเมื่อบันทึกไม่สำเร็จ (ในระบบมีข้อความ "บันทึกสถานะ On Warfarin ไม่สำเร็จ")
- **expected behavior:** การ์ดไม่ได้บอกว่า Label ต้องแสดงที่หน้าไหนบ้าง (มี/ไม่มี Visit, OPD/ER/IPD) — ใส่ในหมายเหตุ TC-004, 009
- **edge cases:** เงื่อนไขเพศของ Maternal Status — แยกเป็น SBH-2953
