# Draft Test Structure — SBH-694

> สถานะ: **สร้างใน Linear แล้ว (2026-10-22)**
> - EXE SBH-2907 (EXE - CT - 2.8.0) → HPY SBH-2908 → TC 001–012 = SBH-2909–2920
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — ช่อง "สร้างโดย" ของทั้ง 14 ใบจึงเป็นชื่อนั้น (ผู้รับผิดชอบตั้งเป็น Suchat แล้ว)
> - Run Type: CT (การ์ดผูก Cycle) · Env: Dev-X / SBH Prod · ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า
> - body ของ TC ใน Linear ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)
> - ยืนยันแล้ว (22 ต.ค.): QA Module : Appointment · QA Sub-module / Feature : Appointment Slip (label ใหม่) · VERSION 2.8.0 (label ใหม่ แทน 🐷 VERSION 2.8.0 ที่ถูก retire)

Requirement: SBH-694 — [OPD][Appointment] นัดหมาย Clinic – ปรับปรุงการเพิ่มข้อมูลในใบนัดหมาย สถานที่ให้บริการ/คำแนะนำการให้บริการ
URL: https://linear.app/cortexcloud/issue/SBH-694
Project: UAT#2 OPD EMR CPOE · Team: SBH Project · Priority: High · State: Testing · Cycle: ผูกแล้ว
Labels: 🍄 New Feature, SBH UAT D3 - CPOE, 🐷 VERSION 2.8.0, For OPD Biz Sim - SBH · Assignee: Suchat Chancherngsilapakul
Sub-Issue: SBH-1700 (cortex-ui) · SBH-1701 (cortex-api) · SBH-1836 (cortex-x) — Done on dev-x · CTXN-8955 (Design, Backlog) · ยังไม่มี EXE / TC
คอมเมนต์: ช่อง "สถานที่ให้บริการ" ดึงจาก `queue_service_unit.location_description` (Aum 31 ส.ค.)
Out of scope: หมายเหตุ (ไปทำใน SBH-1266)

| AC | Expected Results | TC |
|---|---|---|
| 1.1 + 1.2 | ทำนัดจากคลินิก / เลือกคลินิก → ดึง Pattern Location ของคลินิกมาแสดงใน Section สถานที่ให้บริการ | 001, 002 |
| 1.3 | บันทึกแล้วสถานที่ให้บริการเก็บในประวัตินัดหมายถูกต้อง | 003 |
| 1.4 | Print ใบนัด สถานที่ให้บริการถูกต้อง (ข้อความ / Pattern / Layout) | 004 |
| Business Req 2 | ช่องคำแนะนำการให้บริการมีข้อความ Default เดิม | 005 |
| 2.1 | พิมพ์ `/` เพื่อเลือก Shortcut | 006 |
| 2.2 | เลือก Shortcut แทรกข้อความที่ตำแหน่ง Cursor ไม่ลบข้อความเดิม | 007 |
| 2.3 | แก้ไข / เพิ่ม / ลบ Free text ได้ | 008, 009, 010 |
| 2.4 | บันทึกแล้วคำแนะนำเก็บในประวัตินัดหมายถูกต้อง | 011 |
| 2.5 | Print ใบนัด คำแนะนำถูกต้อง (ข้อความ / Pattern / Layout) | 012 |

ข้อมูลตั้งต้น: ผู้ป่วยทดสอบที่มี Visit OPD วันนี้ (เช็คอินแล้ว) · คลินิก 2 แห่งที่มี location ใน master data · มี Shortcut / Note Template อย่างน้อย 1 รายการ

---

## EXE - CT - 2.8.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: UAT#2 OPD EMR CPOE
Labels: 🍄 New Feature, SBH UAT D3 - CPOE, For OPD Biz Sim - SBH, VERSION 2.8.0 (ใหม่), QA Module : Appointment, QA Sub-module / Feature : Appointment Slip (ใหม่), QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.0
- Module: OPD / Appointment
- Requirement ที่อ้างอิง: SBH-694 — [OPD][Appointment] นัดหมาย Clinic – ปรับปรุงการเพิ่มข้อมูลในใบนัดหมาย สถานที่ให้บริการ/คำแนะนำการให้บริการ
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- สถานที่ให้บริการ: แสดงตาม Pattern Location ของคลินิก · บันทึก · Print (AC 1)
- คำแนะนำการให้บริการ: ข้อความ Default · Shortcut `/` · แก้ไข Free text · บันทึก · Print (AC 2)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- ไม่รวม หมายเหตุ (Out of scope → SBH-1266)
```

---

## TS-SBH-694-HPY - แสดง บันทึก และพิมพ์สถานที่ให้บริการและคำแนะนำการให้บริการในใบนัดหมาย

Status: Ready for Testing · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-694-HPY
- Case Type: Happy
- Suffix: HPY
- Module: OPD / Appointment
- Requirement ที่อ้างอิง: SBH-694 — [OPD][Appointment] นัดหมาย Clinic – ปรับปรุงการเพิ่มข้อมูลในใบนัดหมาย สถานที่ให้บริการ/คำแนะนำการให้บริการ

วัตถุประสงค์
- ยืนยันว่าใบนัดหมายแสดงสถานที่ให้บริการตามคลินิก และคำแนะนำการให้บริการที่ผู้ใช้แก้ไขได้ ทั้งบนหน้าจอ ในประวัตินัดหมาย และในเอกสารที่ Print

ขอบเขต Requirement
- AC 1.1–1.4 (สถานที่ให้บริการ)
- AC 2.1–2.5 + ข้อความ Default ใน Business Requirement ข้อ 2 (คำแนะนำการให้บริการ)

ความเสี่ยง
- ผู้ป่วยได้ใบนัดที่สถานที่ว่าง ("-") หรือผิดคลินิก ทำให้ไปผิดที่
- คำแนะนำที่แพทย์แก้ไขไม่ถูกบันทึก / Print ออกมาเป็นข้อความ Default

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-694-001 - แสดงสถานที่ให้บริการตาม Pattern Location ของคลินิก เมื่อทำนัดจากคลินิกที่ทำงานอยู่ (หน้าสร้างนัดหมาย)

Status: Not Run · Priority: High · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy + QA Type : Functional

```
TC ID: TC-SBH-694-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ OPD เลือกหน่วยงานเป็นคลินิก A
2. เปิด Visit ผู้ป่วยทดสอบ > กดสร้างนัดหมาย
3. ดูช่องคลินิก/หน่วยบริการ และ Section สถานที่ให้บริการ

## Expected Result
Section สถานที่ให้บริการแสดง Location ของคลินิก A ตาม Pattern "ชื่อคลินิก, อาคาร, ชั้น"
(เช่น คลินิกอายุรกรรมโรคทั่วไป, อาคาร 1, ชั้น 1) ตรงกับ master data ของคลินิก A ไม่แสดง "-"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-002 - แสดงสถานที่ให้บริการของคลินิกที่เลือก เมื่อเปลี่ยนคลินิก/หน่วยบริการ (หน้าสร้างนัดหมาย)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-694-002
Case Type: Happy
Test Type: Functional

## Test Step
1. ทำต่อจาก TC-SBH-694-001 (อยู่ที่หน้าสร้างนัดหมาย)
2. เลือกช่องคลินิก/หน่วยบริการ เป็นคลินิก B
3. ดู Section สถานที่ให้บริการ

## Expected Result
สถานที่ให้บริการเปลี่ยนเป็น Location ของคลินิก B ตาม Pattern "ชื่อคลินิก, อาคาร, ชั้น"
ไม่เหลือ Location ของคลินิก A

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-003 - บันทึกสถานที่ให้บริการในประวัติการนัดหมาย (หน้าประวัติการนัดหมาย)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-694-003
Case Type: Happy
Test Type: Functional

## Test Step
1. ที่หน้าสร้างนัดหมาย เลือกคลินิก B แพทย์ ประเภทบริการ และวันนัด ให้ครบ
2. กด Submit
3. เปิดเมนูซ้าย "ประวัติการนัดหมาย" > เปิดนัดที่เพิ่งสร้าง

## Expected Result
นัดหมายแสดงสถานที่ให้บริการเป็น Location ของคลินิก B ตรงกับที่แสดงตอนสร้างนัด

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-004 - แสดงสถานที่ให้บริการถูกต้องในใบนัดที่ Print (ใบนัดหมาย)

Status: Not Run · Priority: High · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy + QA Type : UIUX

```
TC ID: TC-SBH-694-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. เปิดนัดหมายจาก TC-SBH-694-003 > กด Print ใบนัด
2. ดูหัวข้อ "สถานที่ให้บริการ" ในเอกสาร

## Expected Result
หัวข้อสถานที่ให้บริการแสดง Location ของคลินิก B ตาม Pattern "ชื่อคลินิก, อาคาร, ชั้น"
อยู่ใต้บรรทัด "จากคลินิก" และเหนือ "คำแนะนำการให้บริการ" ไม่แสดง "-"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-005 - แสดงข้อความ Default ในช่องคำแนะนำการให้บริการ (หน้าสร้างนัดหมาย)

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-694-005
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ OPD > เปิด Visit ผู้ป่วยทดสอบ > กดสร้างนัดหมาย
2. ดูช่อง "คำแนะนำการให้บริการ" ก่อนพิมพ์อะไร

## Expected Result
มีช่องคำแนะนำการให้บริการเป็นกล่องข้อความ และแสดงข้อความ Default
· ชั่งน้ำหนักวัดความดัน
· นั่งรอเรียกคิวหน้าห้องตรวจ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-006 - แสดงรายการ Shortcut เมื่อพิมพ์ / ในช่องคำแนะนำการให้บริการ (หน้าสร้างนัดหมาย)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-694-006
Case Type: Happy
Test Type: Functional

## Test Step
1. ที่หน้าสร้างนัดหมาย คลิกท้ายข้อความในช่องคำแนะนำการให้บริการ
2. พิมพ์ /

## Expected Result
แสดงรายการ Shortcut / Note Template ให้เลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-007 - แทรกข้อความ Shortcut ที่ตำแหน่ง Cursor โดยไม่ลบข้อความเดิม (หน้าสร้างนัดหมาย)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-694-007
Case Type: Happy
Test Type: Functional

## Test Step
1. ที่ช่องคำแนะนำการให้บริการ วาง Cursor ระหว่างบรรทัด "ชั่งน้ำหนักวัดความดัน" กับ "นั่งรอเรียกคิวหน้าห้องตรวจ"
2. พิมพ์ / แล้วเลือก Shortcut 1 รายการ

## Expected Result
ข้อความของ Shortcut ถูกแทรกที่ตำแหน่ง Cursor (ระหว่าง 2 บรรทัดเดิม)
ข้อความ Default ทั้ง 2 บรรทัดยังอยู่ครบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-008 - แก้ไขข้อความในช่องคำแนะนำการให้บริการ (หน้าสร้างนัดหมาย)

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-694-008
Case Type: Happy
Test Type: Functional

## Test Step
1. ที่ช่องคำแนะนำการให้บริการ แก้บรรทัด "ชั่งน้ำหนักวัดความดัน" เป็น "ชั่งน้ำหนักวัดความดันก่อนพบแพทย์"

## Expected Result
ช่องแสดงข้อความที่แก้แล้ว บรรทัดอื่นไม่เปลี่ยน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-009 - เพิ่มข้อความ Free text ในช่องคำแนะนำการให้บริการ (หน้าสร้างนัดหมาย)

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-694-009
Case Type: Happy
Test Type: Functional

## Test Step
1. ที่ช่องคำแนะนำการให้บริการ ขึ้นบรรทัดใหม่ท้ายข้อความ
2. พิมพ์ "งดน้ำงดอาหารหลังเที่ยงคืน"

## Expected Result
ข้อความใหม่แสดงต่อท้าย ข้อความเดิมยังอยู่ครบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-010 - ลบข้อความในช่องคำแนะนำการให้บริการ (หน้าสร้างนัดหมาย)

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-694-010
Case Type: Happy
Test Type: Functional

## Test Step
1. ที่ช่องคำแนะนำการให้บริการ ลบบรรทัด "นั่งรอเรียกคิวหน้าห้องตรวจ"

## Expected Result
บรรทัดที่ลบหายไป บรรทัดอื่นยังอยู่

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-011 - บันทึกคำแนะนำการให้บริการที่แก้ไขในประวัติการนัดหมาย (หน้าประวัติการนัดหมาย)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-694-011
Case Type: Happy
Test Type: Functional

## Test Step
1. สร้างนัดหมายโดยแก้คำแนะนำการให้บริการตาม TC-SBH-694-007 ถึง 010 กรอกช่องอื่นให้ครบ > กด Submit
2. เปิดเมนูซ้าย "ประวัติการนัดหมาย" > เปิดนัดที่เพิ่งสร้าง

## Expected Result
คำแนะนำการให้บริการแสดงตรงกับข้อความสุดท้ายก่อนกด Submit
(มีข้อความ Shortcut + บรรทัดที่แก้ + บรรทัดที่เพิ่ม · ไม่มีบรรทัดที่ลบ) ไม่ย้อนกลับเป็นข้อความ Default

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-694-012 - แสดงคำแนะนำการให้บริการถูกต้องในใบนัดที่ Print (ใบนัดหมาย)

Status: Not Run · Priority: High · Labels: เหมือน TC-004 (QA Type : UIUX)

```
TC ID: TC-SBH-694-012
Case Type: Happy
Test Type: UIUX

## Test Step
1. เปิดนัดหมายจาก TC-SBH-694-011 > กด Print ใบนัด
2. ดูหัวข้อ "คำแนะนำการให้บริการ" ในเอกสาร

## Expected Result
หัวข้อคำแนะนำการให้บริการแสดงข้อความตรงกับที่บันทึก แยกบรรทัดเป็นรายการแบบ bullet
อยู่ใต้หัวข้อสถานที่ให้บริการ ข้อความไม่ล้นหรือทับส่วนอื่น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- AC 1.1 "ทำนัดจาก Clinic" — การ์ดไม่บอกว่าช่องคลินิก/หน่วยบริการจะเลือกคลินิกที่ทำงานอยู่ให้อัตโนมัติหรือไม่ (TC-001 จะยืนยันจากแอปจริงตอนทดสอบ)
- ช่องสถานที่ให้บริการบนหน้าจอแก้ไขได้หรือไม่ — การ์ดไม่ระบุ
- การ์ดยังมีโน้ต "ประสานงานขอ master data กับจารย์โอ" — ยังไม่รู้ว่าคลินิกทุกแห่งมี location ครบหรือยัง (ต้องได้ชื่อคลินิก A / B ที่มีข้อมูลจริงก่อนทดสอบ)
- คอมเมนต์ "เพิ่มปุ่ม setting ให้ Link ไปหน้าสร้าง หมายเหตุ" และ "ทำ Admin แก้ไข Instruction" — ไม่อยู่ใน AC จึงไม่สร้าง TC

Validation
- ลบข้อความคำแนะนำจนว่าง แล้วบันทึกได้ไหม / Print แสดงอะไร — การ์ดไม่ระบุ
- ความยาวสูงสุดของคำแนะนำการให้บริการ — การ์ดไม่ระบุ

Error handling
- คลินิกที่ไม่มี location ใน master data ต้องแสดงอะไร (ตอนนี้ใบนัดตัวอย่างแสดง "-") — การ์ดไม่ระบุ จึงยังไม่สร้าง TC

Permission / role
- ไม่ระบุว่า role ไหนทำนัด / แก้คำแนะนำได้ (ร่างใช้แพทย์ OPD)

Edge cases
- แก้ไขนัดหมายที่มีอยู่แล้ว (เปลี่ยนคลินิก / แก้คำแนะนำ) — การ์ดไม่พูดถึง
- นัดหมายเก่าที่สร้างก่อนฟีเจอร์นี้ Print ออกมาแสดงอย่างไร — การ์ดไม่พูดถึง
