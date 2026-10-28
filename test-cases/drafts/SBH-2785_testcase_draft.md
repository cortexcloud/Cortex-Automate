# Draft Test Structure — SBH-2785

> สถานะ: **สร้างใน Linear แล้ว (2026-10-27)**
> - EXE SBH-3109 (EXE - CT - 2.9.0) → HPY SBH-3110 → TC 001–003 = SBH-3112 · 3113 · 3114 · EDG SBH-3111 → TC 004–005 = SBH-3115 · 3116 (สถานะ Not Run · 001 / 003 High · 002 / 004 / 005 Medium)
> - ⚠️ ช่อง "สร้างโดย" เป็น Neranchara Kaewsiri (บัญชีของ Linear MCP · ผู้ใช้รับทราบแล้วสั่งสร้าง) · ผู้รับผิดชอบเป็น Suchat
> - ยืนยันแล้ว (27 ต.ค.): Run Type CT · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Queue (มีอยู่แล้ว) · เอา TC ครบ 5 ข้อ (รวม 004 / 005)
> - รอผู้ใช้ review ร่างเต็ม แล้วพิมพ์ "สร้างได้" จึงจะสร้าง EXE 1 + Scenario 2 + TC 5 = 8 ใบ
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972

Requirement: SBH-2785 — [ER] [บัตรคิว] เพิ่ม Barcode HN
URL: https://linear.app/cortexcloud/issue/SBH-2785
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: Ready for Testing
Labels: Natthaphat ( MOD ) 🙈, VERSION 2.9.0 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่
Sub-Issue: ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี · Relations: ไม่มี
PR ที่แนบ: cortex-api #2856 "supply raw hn for er card barcode" · cortex-testing #1519 "add hn barcode to er queue card"
Scope / Version = 2.9.0 (label VERSION 2.9.0 ของการ์ด)

AC ในการ์ด

| ข้อ | AC | TC |
|---|---|---|
| 1 | เพิ่ม Barcode HN บนบัตรคิว | 001 · 003 |
| 1.1 | ตำแหน่ง ใต้สุดของใบ | 002 |
| (ความเสี่ยง) | เพิ่ม Barcode แล้วบัตรล้นหน้า / ข้อมูลเดิมหาย | 004 · 005 |

ข้อมูลประกอบ (ไม่ได้อยู่ในการ์ด)
- รูปในการ์ด = บัตรคิว ER แบบปัจจุบัน (ยังไม่มี Barcode): โลโก้ + ชื่อ รพ. · ห้องตรวจ · ระดับความเร่งด่วน · หมายเลขบัตรคิว (กรอบใหญ่) · ข้อความ "หมายเลขนี้ใช้เพื่อระบุตัวตน…" · บรรทัดสุดท้าย "ออกคิวเมื่อ <วันที่ เวลา>"
- พิมพ์บัตรคิวจากปุ่ม `พิมพ์บัตรคิว` ในฟอร์มคัดกรอง ER → ระบบส่งไฟล์ zip กลับมา (จาก er-uat-scenario.md · ยังไม่เคยแตกดูเนื้อหา)
- ชื่อ PR ฝั่ง API บอกว่าส่ง "raw hn" ให้ Barcode → น่าจะเป็น HN แบบไม่มีตัวคั่น แต่การ์ดไม่ได้ระบุ → ใส่เป็น gap

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: VERSION 2.9.0, Natthaphat ( MOD ) 🙈, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Queue, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: ER / บัตรคิว
- Requirement ที่อ้างอิง: SBH-2785 — [ER] [บัตรคิว] เพิ่ม Barcode HN
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- บัตรคิว ER แสดง Barcode HN
- ตำแหน่ง Barcode HN อยู่ใต้สุดของบัตรคิว
- สแกน Barcode แล้วได้ HN ของผู้ป่วย

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2785-HPY - แสดง Barcode HN ใต้สุดของบัตรคิว ER และสแกนได้ HN ของผู้ป่วย

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2785-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / บัตรคิว
- Requirement ที่อ้างอิง: SBH-2785 — [ER] [บัตรคิว] เพิ่ม Barcode HN

วัตถุประสงค์
- ยืนยันว่าบัตรคิว ER ที่พิมพ์จากฟอร์มคัดกรอง มี Barcode HN อยู่ใต้สุดของใบ และสแกนแล้วได้ HN ของผู้ป่วยรายนั้น

ขอบเขต Requirement
- AC 1: เพิ่ม Barcode HN บนบัตรคิว
- AC 1.1: ตำแหน่ง ใต้สุดของใบ

ความเสี่ยง
- Barcode เป็น HN ของผู้ป่วยรายอื่น หรือสแกนไม่ได้ → เจ้าหน้าที่ระบุตัวผู้ป่วยผิด
- Barcode วางผิดตำแหน่ง ทับหรือแทรกข้อความเดิมบนบัตร

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ข้อมูลตั้งต้น: ผู้ป่วยทดสอบที่มี HN · เปิด Visit ER + บันทึกคัดกรองแล้ว · TC 001–003 ใช้บัตรคิวใบเดียวกันได้
```

### TC-SBH-2785-001 - ตรวจสอบบัตรคิว ER แสดง Barcode HN หลังกดพิมพ์บัตรคิว

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2785-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login > เปิด Visit ER ให้ผู้ป่วยที่มี HN > บันทึกคัดกรอง
2. ในฟอร์มคัดกรอง กดปุ่ม พิมพ์บัตรคิว
3. เปิดบัตรคิวที่ระบบสร้าง

## Expected Result
บัตรคิวแสดง Barcode HN

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2785-002 - ตรวจสอบตำแหน่ง Barcode HN อยู่ใต้สุดของบัตรคิว

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001 แต่ QA Type : UIUX

```
TC ID: TC-SBH-2785-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. ใช้บัตรคิวจาก TC-001 (หรือทำขั้น 1–3 ของ TC-001)
2. ดูตำแหน่งของ Barcode HN เทียบกับข้อความอื่นบนบัตร

## Expected Result
Barcode HN อยู่ใต้สุดของใบ (ต่อจากบรรทัด "ออกคิวเมื่อ …") ไม่มีข้อความอื่นอยู่ใต้ Barcode

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2785-003 - ตรวจสอบสแกน Barcode HN บนบัตรคิวแล้วได้ HN ของผู้ป่วย

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2785-003
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้บัตรคิวจาก TC-001 · จด HN ของผู้ป่วยจาก Patient Banner
2. สแกน Barcode บนบัตรด้วยเครื่องสแกน (หรือแอปอ่าน Barcode)
3. เทียบค่าที่สแกนได้กับ HN ของผู้ป่วย

## Expected Result
ค่าที่สแกนได้ตรงกับ HN ของผู้ป่วยรายนั้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2785-EDG - บัตรคิวที่เพิ่ม Barcode HN ยังพิมพ์ได้ครบเหมือนเดิม

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2785-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / บัตรคิว
- Requirement ที่อ้างอิง: SBH-2785 — [ER] [บัตรคิว] เพิ่ม Barcode HN

วัตถุประสงค์
- ยืนยันว่าการเพิ่ม Barcode ใต้สุดของใบ ไม่ทำให้บัตรคิวล้นหน้า หรือข้อมูลเดิมบนบัตรหาย

ขอบเขต Requirement
- AC 1.1: ตำแหน่ง ใต้สุดของใบ (ส่วนท้ายบัตรที่เดิมมีแค่ "ออกคิวเมื่อ")

ความเสี่ยง
- บัตรคิวเป็นกระดาษขนาดเดียว เพิ่มของท้ายใบแล้วอาจขึ้นหน้าที่ 2 → Barcode ถูกพิมพ์แยกใบ
- ข้อมูลเดิม (ห้องตรวจ · ระดับความเร่งด่วน · หมายเลขบัตรคิว · เวลาออกคิว) ถูกเบียดหรือหาย

หมายเหตุ
- เพิ่มจากความเสี่ยง ไม่อยู่ใน AC โดยตรง
```

### TC-SBH-2785-004 - ตรวจสอบบัตรคิวที่มี Barcode HN ยังพิมพ์ได้ใน 1 หน้า

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2785-004
Case Type: Edge
Test Type: UIUX

## Test Step
1. ใช้บัตรคิวจาก TC-001
2. ดูจำนวนหน้าของบัตรคิว

## Expected Result
บัตรคิวมี 1 หน้า Barcode HN อยู่หน้าเดียวกับหมายเลขบัตรคิว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2785-005 - ตรวจสอบข้อมูลเดิมบนบัตรคิวแสดงครบหลังเพิ่ม Barcode HN

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2785-005
Case Type: Edge
Test Type: UIUX

## Test Step
1. ใช้บัตรคิวจาก TC-001
2. เทียบข้อมูลบนบัตรกับรูปบัตรคิวเดิมในการ์ด

## Expected Result
บัตรคิวยังแสดงครบ: ชื่อ รพ. + แผนกฉุกเฉิน · ห้องตรวจ · ระดับความเร่งด่วน · หมายเลขบัตรคิว · ข้อความ "หมายเลขนี้ใช้เพื่อระบุตัวตนของท่านเท่านั้น" · ออกคิวเมื่อ <วันที่ เวลา>
ไม่มีข้อความใดถูก Barcode ทับ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - ค่าที่เข้ารหัสใน Barcode เป็น HN แบบไหน — มีตัวคั่น / ปีนำหน้าแบบที่แสดงบนจอหรือไม่ (PR ฝั่ง API เขียนว่า "raw hn")
  - ชนิด Barcode (Code 128 / QR / อื่น ๆ) และขนาด — ต้องสแกนได้ด้วยเครื่องสแกนรุ่นที่ รพ. ใช้
  - ต้องมีตัวเลข HN พิมพ์ใต้ Barcode ให้คนอ่านด้วยหรือไม่
- **Validation**: -
- **Error handling**: ผู้ป่วย ER ที่ยังไม่มี HN (ผู้ป่วยระบุตัวตนไม่ได้ / ยังไม่ลงทะเบียน) — บัตรคิวแสดงอะไรตรงตำแหน่ง Barcode
- **Permission / role**: -
- **Edge cases**
  - จุดพิมพ์บัตรคิวอื่นนอกจากปุ่มในฟอร์มคัดกรอง (เช่น พิมพ์ซ้ำ / พิมพ์อัตโนมัติ) ต้องมี Barcode ด้วยหรือไม่
  - ผู้ป่วยเหตุการณ์หมู่ (Mass Casualty) พิมพ์บัตรคิวแล้วมี Barcode เหมือนกันหรือไม่
