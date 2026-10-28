# Draft Test Structure — SBH-2530

> สถานะ: **สร้างใน Linear แล้ว (2026-10-27)** — ผู้ใช้สั่ง "สร้างเลย"
> - EXE SBH-3029 (EXE - CT - 2.9.0) → HPY SBH-3030 (TC 001–049) · UHP SBH-3032 (TC 050–053 = SBH-3090–3093) · EDG SBH-3033 (TC 054–056 = SBH-3094–3096)
> - TC 001–010 = SBH-3035, 3037, 3038, 3040, 3042, 3043, 3045, 3046, 3048, 3049 · TC 011–049 = SBH-3051–3089 (ต่อเนื่อง)
> - label ใหม่ที่สร้าง: QA Sub-module / Feature : CPR Progression
> - Run Type CT · Env Dev-X / SBH Prod · QA Module : ER · ทุก TC สถานะ Not Run · ไม่ผูก Cycle (เหมือนชุด SBH-2969)
> - ⚠️ ช่อง "สร้างโดย" เป็น Neranchara Kaewsiri (บัญชีของ Linear MCP) · ผู้รับผิดชอบเป็น Suchat
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972

Requirement: SBH-2530 — [ER] [ CPR-Progression ] Improve CPR Progression
URL: https://linear.app/cortexcloud/issue/SBH-2530
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: High · State: Ready for Testing
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, VERSION 2.9.0 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT
Sub-Issue: ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี
PR ที่แนบ: cortex-ui #2442 · cortex-form #485 · cortex-api #2826 · cortex-testing #1495 / #1542 (ทุกตัวขึ้นต้น V2.9.0)
ลิงก์ mockup ในการ์ด (claude.ai artifact) เปิดแล้วหน้าว่าง "Loading…" — ร่างนี้อิงข้อความในการ์ดอย่างเดียว

## ตาราง AC → TC

| AC | เนื้อหาย่อ | TC |
|---|---|---|
| 1.1 | การ์ด Cycle: Cycle N · เวลาเริ่ม · countdown 02:00 · progress bar | 001 |
| 1.2 | default วันที่เวลาบันทึก = เวลาเริ่ม cycle + 2 นาที | 002 |
| 1.3 | quick chip 3 ตัว + highlight | 003, 004, 005 |
| 1.4 | บันทึก Cycle N+1 → event ใช้เวลาที่เลือก + countdown cycle ถัดไปเริ่มทันที | 006, 007 |
| 1.5 | countdown 00:00 → "ครบกำหนด Pulse/Rhythm check" (ไม่มีเสียง) | 055 |
| 1.6 | เวลาไม่ย้อนหลังกว่า event ก่อนหน้า · ไม่เกินปัจจุบันเกิน 2 นาที | 050, 051, 054 |
| 1.7 | ระยะ cycle ตั้งค่าได้ใน config ระดับ hospital | — ยังไม่มี TC (ดูคำถามท้ายไฟล์) |
| 2.1 + 2.2 | รายการยา 6 ตัว + แถว "ยาอื่นๆ" | 008 |
| 2.3 | Dose free text · Route IV / IO / ETT default IV | 009 |
| 2.4 | ยังไม่ติ๊ก = disabled · ติ๊กแล้ว enabled + highlight | 010 |
| 2.5 | ติ๊กแล้ว Dose ว่าง / ยาอื่นๆ ไม่มีชื่อ → inline error | 052, 053 |
| 2.6 | Badge "เลือกแล้ว N รายการ" | 011 |
| 2.7 + 2.8 | ติ๊กหลายตัว → drug event ผูกกับ cycle เวลาเดียวกัน · checklist reset | 012, 013 |
| 3.1 | Start CPR แต่ละครั้ง = Episode ใหม่ #1, #2 | 014 |
| 3.2 | label "กู้ชีพซ้ำ" + ลิงก์ "ดูประวัติ CPR ทั้งหมด (N Episode)" | 015 |
| 3.3 | Episode summary card ในหน้า History | 016 |
| 3.4 | เรียงล่าสุดบนสุด · ล่าสุดกาง เก่าหุบ + "ขยายดู Timeline" | 017, 018 |
| 3.5 | กด summary card → scroll ไป Timeline ของ Episode นั้น | 019 |
| 3.6 | Episode ที่จบแล้ว read-only | 020 · ส่วน "แก้ไขตามสิทธิ์ + audit log" ยังไม่มี TC (ดูคำถาม) |
| 4.1 + 7.5 | แถว event: ชื่อ · HH:MM:SS · T+MM:SS | 021 |
| 4.2 + 7.6 (ยา) | drug chip "ชื่อยา · Dose · Route" 1 chip ต่อ 1 ยา ใต้ cycle | 022 |
| 4.3 + 7.6 (Rhythm) | Rhythm tag สีตามกลุ่ม · ROSC tag | 023 |
| 4.4 | Header Episode สรุปยารวม "×N" | 024 |
| 4.5 | filter chips | 025 |
| 4.6 + 7.7 | cycle ครบกำหนดแต่ยังไม่บันทึก แสดง placeholder · ไม่นับใน N | 056 |
| 7.6 (field ที่มีข้อมูล) | แสดงเฉพาะ field ที่มีข้อมูล (Defib tag · Comment) | 026 |
| 5.1 | card Nurse note แยกจาก CPR Comment + badge "พยาบาล" | 027 |
| 5.2 | free text multi-line ขยายได้ | 028 |
| 5.3 + 4.3 + 7.6 (Nurse note) | Nurse note บน Timeline / Episode Summary พร้อมชื่อผู้บันทึกและเวลา | 029 |
| 5.4 | ใช้ได้หลัง ROSC | 030 |
| 6.1 | Vital Signs หุบระหว่าง CPR + ข้อความ | 031 |
| 6.2 | กางเองได้ ไม่บังคับกรอก | 032 |
| 6.3 | ROSC / Stop CPR → กางอัตโนมัติ + highlight + scroll | 033, 034 |
| 6.4 | เวลาวัดรอบ 1 default = เวลาจบ CPR | 035 |
| 6.5 | Field ครบ + MEWS ตาม logic เดิม | 036, 037 |
| 6.6 | "+ เพิ่มรอบวัด" · "ข้ามไปก่อน" → badge "ยังไม่บันทึก" | 038, 039 |
| 6.7 | banner สรุป Episode ที่จบแล้ว + ลิงก์ไป Timeline | 040 |
| 7.1 | การ์ด CPR Episode Summary ด้านบน ทั้งระหว่างและหลัง CPR | 041 |
| 7.2 | ตัวเลขสรุประหว่าง CPR | 042 |
| 7.3 | Status pill 3 สถานะ · "Episode #N · กู้ชีพซ้ำ" | 043, 044 |
| 7.4 | ปุ่ม "CPR Timeline (N)" default กาง · กางหุบได้ | 045, 046 |
| 7.8 | บันทึก cycle ใหม่ → แถวต่อท้ายทันที + ตัวเลขอัปเดต | 047 |
| 7.9 | เรียงเก่า → ใหม่ · ตรงกับหน้า History | 048, 049 |

**รวม TC ที่ซ้ำกัน:** ข้อ 7.9 ระบุว่า Episode Summary กับ CPR Timeline / History "ใช้ component และ API เดียวกัน"
จึงรวม AC ข้อ 4 กับข้อ 7 ที่ตรวจสิ่งเดียวกันไว้ใน TC เดียว (021 / 022 / 023 / 029 / 056) แล้วใช้ TC-049 ยืนยันว่าหน้า History ตรงกับหน้า CPR

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, Suchart ( Jame ) 🥷, VERSION 2.9.0, QA Module : ER, QA Sub-module / Feature : CPR Progression (ใหม่), QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: ER / CPR Progression
- Requirement ที่อ้างอิง: SBH-2530 — [ER] [ CPR-Progression ] Improve CPR Progression
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Cycle timer: countdown 2 นาที · default เวลาบันทึก · quick chip · validation เวลา
- Drug checklist: ยาใน CPR พร้อม Dose / Route · validation · บันทึกเป็น drug event ของ cycle
- ประวัติ CPR หลาย Episode (กู้ชีพซ้ำ) และหน้า History
- CPR Timeline: เวลาจริง / เวลาสัมพัทธ์ · drug chip · tag · filter · placeholder cycle ที่ยังไม่บันทึก
- Nurse note แยกจาก CPR Comment
- Vital Signs หุบระหว่าง CPR และกางอัตโนมัติหลัง ROSC / Stop CPR
- CPR Episode Summary และรายละเอียดแต่ละ Cycle

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2530-HPY - บันทึก CPR Progression ด้วย Cycle timer ยา Nurse note และดูสรุป / ประวัติ Episode

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : CPR Progression + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2530-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / CPR Progression
- Requirement ที่อ้างอิง: SBH-2530 — [ER] [ CPR-Progression ] Improve CPR Progression

วัตถุประสงค์
- ยืนยันว่าทีมกู้ชีพบันทึก CPR ได้ครบทุกส่วนที่การ์ดเพิ่ม (Cycle timer · ยา · Nurse note · Vital Signs หลังจบ) และดูสรุป / ประวัติทุก Episode ได้ถูกต้อง

ขอบเขต Requirement
- AC 1.1–1.4 · 2.1–2.4 · 2.6–2.8 · 3.1–3.6 (เฉพาะ read-only) · 4.1–4.5 · 5.1–5.4 · 6.1–6.7 · 7.1–7.6 · 7.8–7.9

ความเสี่ยง
- เวลาบันทึก / ยา / ผู้บันทึกผิด ทำให้ตรวจสอบย้อนหลังทางการแพทย์ผิด
- Episode กู้ชีพซ้ำปนกัน ทำให้ประเมินผู้ป่วยผิด
- หน้า CPR กับหน้า History แสดงข้อมูลไม่ตรงกัน

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ข้อมูลตั้งต้น: บัญชี user1 · ผู้ป่วยทดสอบที่มี Visit ER · เปิดเมนูขวา "CPR Progression"
- หน้า History = หน้าที่เปิดจากลิงก์ "ดูประวัติ CPR ทั้งหมด" (เดิมคือ ประวัติการรักษา > แท็บ CPR Progression)
```

### TC-SBH-2530-001 - ตรวจสอบการ์ด Cycle แสดงเลข Cycle เวลาเริ่ม และ countdown จาก 02:00 หลังกด Start CPR

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : CPR Progression + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2530-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login user1 > เปิดผู้ป่วยที่มี Visit ER > เมนูขวา "CPR Progression"
2. เลือก Rhythm > กด Start CPR > จดเวลาที่กด
3. ดูการ์ด Cycle

## Expected Result
การ์ดแสดง "Cycle 1" · เวลาเริ่ม cycle ตรงกับเวลาที่กด Start CPR · countdown เริ่มที่ 02:00 แล้วนับถอยหลัง · มี progress bar เดินตามเวลา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-002 - ตรวจสอบค่าตั้งต้นของวันที่และเวลาบันทึกเท่ากับเวลาเริ่ม Cycle บวก 2 นาที

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-002
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก `TC-SBH-2530-001` (อยู่ใน Cycle 1 · จดเวลาเริ่ม cycle ไว้)
2. ดูช่อง "วันที่และเวลาบันทึก"
3. กดบันทึก Cycle ถัดไป แล้วดูช่อง "วันที่และเวลาบันทึก" ของ cycle ใหม่เทียบกับเวลาเริ่ม cycle ใหม่

## Expected Result
ทุก cycle ช่อง "วันที่และเวลาบันทึก" มีค่าตั้งต้น = เวลาเริ่ม cycle นั้น + 2 นาที

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-003 - แสดง quick chip เวลาบันทึก 3 ตัว และ highlight ตัว +2 นาทีเป็นค่าตั้งต้น

Status: Not Run · Priority: Medium · Labels: requirement labels + … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2530-003
Case Type: Happy
Test Type: UIUX

## Test Step
1. Start CPR ให้ผู้ป่วยทดสอบ
2. ดู quick chip ใต้ช่อง "วันที่และเวลาบันทึก"

## Expected Result
มี chip 3 ตัว: "+2 นาที (Default)" · "ตอนนี้" · "แก้เวลาเอง" และ chip "+2 นาที (Default)" ถูก highlight อยู่

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-004 - ตรวจสอบกด chip ตอนนี้ แล้วเวลาบันทึกเปลี่ยนเป็นเวลาปัจจุบัน

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-004
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR ให้ผู้ป่วยทดสอบ
2. กด chip "ตอนนี้" > จดเวลาที่กด
3. ดูช่อง "วันที่และเวลาบันทึก" และ chip ที่ highlight

## Expected Result
ช่อง "วันที่และเวลาบันทึก" = เวลาปัจจุบันตอนกด · chip "ตอนนี้" ถูก highlight แทน "+2 นาที (Default)"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-005 - ตรวจสอบกด chip แก้เวลาเอง แล้วเปิดตัวเลือกวันที่เวลาให้กำหนดเวลาบันทึกเองได้

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-005
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR ให้ผู้ป่วยทดสอบ > รอ 1 นาที
2. กด chip "แก้เวลาเอง"
3. เลือกเวลา = เวลาปัจจุบัน − 30 วินาที (ไม่ย้อนกว่า Start CPR)

## Expected Result
กด "แก้เวลาเอง" แล้วเปิด datetime picker · chip "แก้เวลาเอง" ถูก highlight · ช่อง "วันที่และเวลาบันทึก" เป็นเวลาที่เลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-006 - บันทึก Cycle ถัดไปแล้ว event ใช้เวลาตามที่เลือกไว้

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-006
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก `TC-SBH-2530-005` (เลือกเวลาเองแล้ว · จดเวลาที่เลือก)
2. กด "บันทึก Cycle 2"
3. ดูแถว Cycle บน CPR Timeline ของ Episode Summary

## Expected Result
บันทึกสำเร็จ · แถว Cycle ที่เพิ่งบันทึกแสดงเวลาจริงตรงกับเวลาที่เลือก (ไม่ใช่เวลาที่กดบันทึก)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-007 - ตรวจสอบ countdown ของ Cycle ถัดไปเริ่มนับใหม่ทันทีหลังบันทึก Cycle

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > รอ countdown เหลือประมาณ 01:00
2. กด "บันทึก Cycle 2"
3. ดูการ์ด Cycle ทันทีหลังบันทึก

## Expected Result
การ์ดเปลี่ยนเป็น "Cycle 2" · countdown เริ่มใหม่ที่ 02:00 และนับถอยหลังทันที · progress bar เริ่มใหม่

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-008 - แสดงรายการยาที่ใช้ใน CPR 6 ตัวและแถวยาอื่นๆ ใน Section ยาที่ให้ใน Cycle นี้

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2530-008
Case Type: Happy
Test Type: UIUX

## Test Step
1. Start CPR ให้ผู้ป่วยทดสอบ
2. ดู Section "ยาที่ให้ใน Cycle นี้"

## Expected Result
มี checkbox ครบ 6 ตัว: Adrenaline 1:1,000 · Adrenaline 1:10,000 · Atropine · Amiodarone · MgSO4 · NaHCO3
และแถว "ยาอื่นๆ" ที่มี checkbox + ช่อง free text ชื่อยา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-009 - ตรวจสอบแถวยามีช่อง Dose และ Route ตัวเลือก IV IO ETT โดยค่าตั้งต้นเป็น IV

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-009
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > ติ๊ก Adrenaline 1:10,000
2. ดูช่อง Route > เปิด dropdown Route
3. พิมพ์ Dose "1 mg"

## Expected Result
Route ค่าตั้งต้น = IV · dropdown มีตัวเลือก IV / IO / ETT · ช่อง Dose พิมพ์ข้อความพร้อมหน่วยได้ ("1 mg")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-010 - ตรวจสอบช่อง Dose และ Route ปิดอยู่จนกว่าจะติ๊กยา และแถวที่ติ๊กเปลี่ยนเป็น highlight

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-010
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > ดูแถว Atropine ก่อนติ๊ก (ลองคลิกช่อง Dose / Route)
2. ติ๊ก Atropine
3. เอาติ๊ก Atropine ออก

## Expected Result
ก่อนติ๊ก: Dose / Route disabled กรอกไม่ได้
ติ๊กแล้ว: Dose / Route enabled และแถวเปลี่ยนเป็น highlight
เอาติ๊กออก: กลับเป็น disabled และไม่ highlight

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-011 - แสดง Badge จำนวนยาที่เลือกใน Cycle นี้ตามจำนวนที่ติ๊ก

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2530-011
Case Type: Happy
Test Type: UIUX

## Test Step
1. Start CPR > ติ๊ก Adrenaline 1:10,000 และ Amiodarone
2. ดู Badge
3. เอาติ๊ก Amiodarone ออก แล้วดู Badge

## Expected Result
ติ๊ก 2 ตัว Badge = "เลือกแล้ว 2 รายการ" · เอาออก 1 ตัว Badge = "เลือกแล้ว 1 รายการ"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-012 - บันทึกยาหลายตัวใน Cycle เดียว แล้วทุกตัวเป็น drug event ของ Cycle นั้นเวลาเดียวกัน

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-012
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR
2. ติ๊ก Adrenaline 1:10,000 (Dose 1 mg · IV) · Amiodarone (Dose 300 mg · IO) · ยาอื่นๆ ชื่อ "Calcium gluconate" (Dose 10 ml · IV)
3. กด "บันทึก Cycle 2" > จดเวลาของ Cycle
4. ดูแถว Cycle นั้นบน CPR Timeline ของ Episode Summary

## Expected Result
บันทึกสำเร็จ · แถว Cycle ที่บันทึกมี drug ครบ 3 ตัว Dose / Route ตรงที่กรอก · เวลาของยาทุกตัว = เวลาของ Cycle

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-013 - ตรวจสอบ Checklist ยาถูกล้างค่าสำหรับ Cycle ถัดไปหลังบันทึกสำเร็จ

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-013
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก `TC-SBH-2530-012` (บันทึกยา 3 ตัวสำเร็จ)
2. ดู Section "ยาที่ให้ใน Cycle นี้" ของ cycle ถัดไป

## Expected Result
ไม่มี checkbox ไหนติ๊กค้าง · Dose ว่าง · Route กลับเป็น IV · ชื่อยาอื่นๆ ว่าง · Badge ไม่แสดงจำนวนเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-014 - ตรวจสอบ Start CPR ครั้งที่สองใน admission เดียวกันสร้าง Episode ใหม่เลขรันต่อเนื่อง

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-014
Case Type: Happy
Test Type: Functional

## Test Step
1. ผู้ป่วยทดสอบใหม่ (ยังไม่เคยมี CPR) > Start CPR > บันทึก 1 Cycle > กด Stop CPR
2. กด Start CPR อีกครั้ง
3. ดูเลข Episode บนหน้า CPR และหน้า History

## Expected Result
ครั้งแรกเป็น Episode #1 · ครั้งที่สองเป็น Episode #2 (Episode ใหม่ ไม่ต่อท้าย Episode #1)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-015 - แสดงป้ายกู้ชีพซ้ำและลิงก์ดูประวัติ CPR ทั้งหมดพร้อมจำนวน Episode เมื่อผู้ป่วยเคยมี Episode ก่อนหน้า

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2530-015
Case Type: Happy
Test Type: UIUX

## Test Step
1. ต่อจาก `TC-SBH-2530-014` (อยู่ใน Episode #2)
2. ดูหน้า CPR
3. กดลิงก์ "ดูประวัติ CPR ทั้งหมด"

## Expected Result
หน้า CPR แสดงป้าย "กู้ชีพซ้ำ" และลิงก์ "ดูประวัติ CPR ทั้งหมด (2 Episode)" · กดแล้วเปิดหน้า History

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-016 - แสดง Episode summary card ในหน้า History ครบทุกข้อมูลของทุก Episode

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-016
Case Type: Happy
Test Type: Functional

## Test Step
1. ผู้ป่วยที่มี Episode #1 จบด้วย ROSC (มี Defib 1 ครั้ง · ยา 2 dose) และ Episode #2 กำลังทำอยู่
2. เปิดหน้า History
3. ดู summary card ของแต่ละ Episode

## Expected Result
มี card ครบทุก Episode · แต่ละ card แสดง วันที่ · เวลาเริ่มและจบ · duration · จำนวน shock · จำนวนยา · outcome
Episode #1 outcome = ROSC (shock 1 · ยา 2) · Episode #2 outcome = กำลังทำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-017 - ตรวจสอบหน้า History เรียง Episode ล่าสุดไว้บนสุด

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-017
Case Type: Happy
Test Type: Functional

## Test Step
1. ผู้ป่วยที่มีอย่างน้อย 2 Episode
2. เปิดหน้า History > ดูลำดับ Episode

## Expected Result
Episode ล่าสุด (#2) อยู่บนสุด ตามด้วย #1

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-018 - ตรวจสอบ Episode ล่าสุดกาง Timeline ไว้ Episode เก่าหุบไว้และกดขยายดู Timeline ได้

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-018
Case Type: Happy
Test Type: Functional

## Test Step
1. ผู้ป่วยที่มีอย่างน้อย 2 Episode > เปิดหน้า History
2. ดู Timeline ของ Episode #2 และ #1
3. กด "ขยายดู Timeline" ที่ Episode #1

## Expected Result
เปิดหน้ามา Episode #2 กาง Timeline อยู่ · Episode #1 หุบอยู่ · กด "ขยายดู Timeline" แล้ว Episode #1 กางแสดง event ครบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-019 - ตรวจสอบกด Episode summary card แล้วเลื่อนไปที่ Timeline ของ Episode นั้น

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-019
Case Type: Happy
Test Type: Functional

## Test Step
1. ผู้ป่วยที่มีอย่างน้อย 2 Episode > เปิดหน้า History
2. กด summary card ของ Episode #1

## Expected Result
หน้าเลื่อนไปที่ Timeline ของ Episode #1 (ไม่ใช่ Episode อื่น)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-020 - ตรวจสอบข้อมูล Episode ที่จบแล้วเป็นแบบอ่านอย่างเดียว

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-020
Case Type: Happy
Test Type: Functional

## Test Step
1. ผู้ป่วยที่มี Episode #1 จบแล้ว (Stop CPR)
2. เปิดหน้า History > Episode #1 > ลองแก้เวลา / Rhythm / ยา / Comment ของ event

## Expected Result
ข้อมูลของ Episode #1 แก้ไขไม่ได้ (ไม่มีช่องให้แก้ หรือแก้แล้วบันทึกไม่ได้)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-021 - แสดงแถว event บน CPR Timeline พร้อมชื่อ event เวลาจริงและเวลาสัมพัทธ์นับจาก Start CPR

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-021
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > จดเวลาเริ่ม
2. บันทึก Cycle 2 ด้วย chip "+2 นาที (Default)" > กด ROSC
3. ดู CPR Timeline ใน Episode Summary

## Expected Result
Timeline เป็นแนวตั้ง · แต่ละแถวแสดงชื่อ event (Start CPR / Cycle N / ROSC) · เวลาจริง HH:MM:SS · เวลาสัมพัทธ์ T+MM:SS
แถว Start CPR = T+00:00 · แถว Cycle 2 = T+02:00 (ต่างจาก Start CPR ตรงตามเวลาจริง)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-022 - แสดงยาเป็น chip ชื่อยา Dose Route หนึ่ง chip ต่อหนึ่งยา ใต้ Cycle ที่ให้ยา

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-022
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก `TC-SBH-2530-012` (Cycle ที่บันทึกยา 3 ตัว)
2. ดูแถว Cycle นั้นบน CPR Timeline ของ Episode Summary

## Expected Result
ใต้แถว Cycle นั้นมี chip 3 อัน รูปแบบ "ชื่อยา · Dose · Route":
"Adrenaline 1:10,000 · 1 mg · IV" · "Amiodarone · 300 mg · IO" · "Calcium gluconate · 10 ml · IV"
ไม่มี chip ยาใต้ Cycle อื่น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-023 - แสดง Rhythm เป็น tag สีตามกลุ่ม และ ROSC เป็น tag บน CPR Timeline

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2530-023
Case Type: Happy
Test Type: UIUX

## Test Step
1. Start CPR ด้วย Rhythm VF
2. บันทึก Cycle ด้วย Rhythm PEA > บันทึก Cycle ด้วย Rhythm Perfusing Rhythm
3. กด ROSC
4. ดู CPR Timeline ใน Episode Summary

## Expected Result
Rhythm แสดงเป็น tag: VF = แดง · PEA = ส้ม · Perfusing = เขียว · แถว ROSC แสดงเป็น tag

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-024 - แสดงสรุปยารวมของ Episode ที่ Header ของ Episode

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-024
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > บันทึก 3 Cycle ทุก Cycle ติ๊ก Adrenaline 1:10,000 (1 mg · IV) · Cycle ที่ 2 ติ๊ก Amiodarone เพิ่ม
2. เปิดหน้า History > ดู Header ของ Episode นี้

## Expected Result
Header สรุปยารวม "Adrenaline 1:10,000 ×3" และ "Amiodarone ×1"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-025 - ตรวจสอบ filter chips บน CPR Timeline กรอง event ตามประเภทที่เลือก

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-025
Case Type: Happy
Test Type: Functional

## Test Step
1. Episode ที่มี event ครบทุกประเภท: Cycle + Rhythm · Defib (Shock) · ยา · Nurse note
2. เปิด CPR Timeline > กด filter ทีละตัว: Cycle-Rhythm → Shock → ยา → Nurse note → ทั้งหมด

## Expected Result
มี filter chips 5 ตัว: ทั้งหมด / Cycle-Rhythm / Shock / ยา / Nurse note
แต่ละ filter แสดงเฉพาะ event ประเภทนั้น · "ทั้งหมด" แสดงครบทุก event

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-026 - ตรวจสอบแถว Cycle แสดงเฉพาะ field ที่มีข้อมูล

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-026
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR
2. บันทึก Cycle A: กรอก Defib 200 J + Comment "ทดสอบ comment" (ไม่ให้ยา · ไม่มี Nurse note)
3. บันทึก Cycle B: กรอกแค่ Rhythm
4. ดู CPR Timeline ใน Episode Summary

## Expected Result
Cycle A แสดง Defib เป็น tag และ Comment เป็นข้อความ · ไม่มีหัวข้อยา / Nurse note ว่าง
Cycle B แสดงแค่ Rhythm tag · ไม่มีหัวข้อ Defib / Comment / ยา / Nurse note ว่าง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-027 - แสดงการ์ด Nurse note แยกจาก CPR Comment พร้อม badge พยาบาล

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2530-027
Case Type: Happy
Test Type: UIUX

## Test Step
1. เปิดเมนู CPR Progression > Start CPR
2. ดูส่วน Comment และ Nurse note

## Expected Result
มีการ์ด "Nurse note" แยกจากการ์ด "CPR Comment" · การ์ด Nurse note มี badge "พยาบาล"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-028 - ตรวจสอบช่อง Nurse note พิมพ์ได้หลายบรรทัดและขยายตามข้อความ

Status: Not Run · Priority: Low · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-028
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR
2. ช่อง Nurse note พิมพ์ข้อความ 4 บรรทัด (กด Enter ขึ้นบรรทัดใหม่)

## Expected Result
ขึ้นบรรทัดใหม่ได้ · ช่องขยายแสดงข้อความครบทั้ง 4 บรรทัด (หรือลากขยายได้)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-029 - บันทึก Nurse note พร้อม Cycle แล้วแสดงบน Timeline และ Episode Summary พร้อมชื่อผู้บันทึกและเวลา

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-029
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR
2. Nurse note พิมพ์ "ใส่ ETT เบอร์ 7.5" > กด "บันทึก Cycle 2" > จดเวลา Cycle
3. ดูแถว Cycle 2 บน CPR Timeline ของ Episode Summary
4. เปิดหน้า History > ดูแถว Cycle 2 ของ Episode เดียวกัน

## Expected Result
ทั้ง 2 หน้าแสดง Nurse note เป็นกล่องสีฟ้า label "Nurse note" · ข้อความ "ใส่ ETT เบอร์ 7.5" · ชื่อผู้บันทึก (user1) · เวลาตรงกับ Cycle 2

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-030 - บันทึก Nurse note หลัง ROSC ได้

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-030
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > กด ROSC
2. Nurse note พิมพ์ "หลัง ROSC ส่ง CXR" > บันทึก
3. ดู CPR Timeline ของ Episode นี้

## Expected Result
บันทึกสำเร็จ · Timeline แสดง Nurse note "หลัง ROSC ส่ง CXR" พร้อมชื่อผู้บันทึกและเวลา ต่อจากแถว ROSC

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-031 - ตรวจสอบ Section Vital Signs หุบไว้ระหว่าง CPR พร้อมข้อความเปิดอัตโนมัติเมื่อ ROSC หรือ Stop CPR

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2530-031
Case Type: Happy
Test Type: UIUX

## Test Step
1. Start CPR
2. ดู Section Vital Signs

## Expected Result
Section Vital Signs หุบอยู่ และแสดงข้อความ "เปิดอัตโนมัติเมื่อ ROSC / Stop CPR"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-032 - ตรวจสอบกางส่วน Vital Signs เองระหว่าง CPR ได้และบันทึก Cycle ได้โดยไม่กรอก Vital Signs

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-032
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR
2. กดกาง Section Vital Signs
3. ไม่กรอกค่าใด ๆ > กด "บันทึก Cycle 2"

## Expected Result
Section กางได้ระหว่าง CPR · บันทึก Cycle สำเร็จโดยไม่มี error ให้กรอก Vital Signs

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-033 - ตรวจสอบกด ROSC แล้ว Section Vital Signs กางอัตโนมัติ highlight และเลื่อนมาที่ Section

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-033
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > บันทึก 1 Cycle (Vital Signs หุบอยู่)
2. กด ROSC

## Expected Result
Section Vital Signs กางเอง · มี highlight · หน้าเลื่อนมาที่ Section Vital Signs

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-034 - ตรวจสอบกด Stop CPR แล้ว Section Vital Signs กางอัตโนมัติ highlight และเลื่อนมาที่ Section

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-034
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > บันทึก 1 Cycle (Vital Signs หุบอยู่)
2. กด Stop CPR

## Expected Result
Section Vital Signs กางเอง · มี highlight · หน้าเลื่อนมาที่ Section Vital Signs

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-035 - ตรวจสอบเวลาวัด Vital Signs รอบที่ 1 มีค่าตั้งต้นเป็นเวลาที่จบ CPR และแก้ไขได้

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-035
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > กด ROSC > จดเวลา ROSC
2. ดูช่องเวลาวัดรอบที่ 1
3. แก้เวลาเป็น ROSC + 5 นาที > กรอก BP / PR > บันทึก

## Expected Result
เวลาวัดรอบที่ 1 ค่าตั้งต้น = เวลา ROSC · แก้ได้ และบันทึกด้วยเวลาที่แก้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-036 - แสดง field Vital Signs ครบตามที่กำหนดหลังจบ CPR

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2530-036
Case Type: Happy
Test Type: UIUX

## Test Step
1. Start CPR > กด ROSC
2. ดู field ใน Section Vital Signs

## Expected Result
มี field ครบ: BP (SBP / DBP) · PR · RR · Temperature · SpO₂ · Pain score · AVPU และช่อง MEWS

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-037 - คำนวณ MEWS จาก Vital Signs หลังจบ CPR ตาม logic เดิม

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-037
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > กด ROSC
2. กรอก Vital Signs: SBP 90 / DBP 60 · PR 120 · RR 24 · Temp 38.5 · SpO₂ 92 · AVPU = V
3. ดูค่า MEWS
4. กรอกค่าชุดเดียวกันในฟอร์มคัดกรอง ER (ที่ใช้ logic MEWS เดิม) แล้วเทียบ

## Expected Result
MEWS ในฟอร์ม CPR เท่ากับ MEWS ที่ฟอร์มคัดกรองคำนวณจากค่าชุดเดียวกัน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-038 - ตรวจสอบกดเพิ่มรอบวัด Vital Signs แล้วได้รอบวัดใหม่

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-038
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > กด ROSC > กรอก Vital Signs รอบที่ 1
2. กด "+ เพิ่มรอบวัด" > กรอกรอบที่ 2 > บันทึก

## Expected Result
มีรอบวัดที่ 2 เพิ่มขึ้น · บันทึกได้ทั้ง 2 รอบ ค่าไม่ทับกัน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-039 - ตรวจสอบกดข้ามไปก่อน แล้ว Section Vital Signs ยังแสดงอยู่พร้อม badge ยังไม่บันทึก

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-039
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > กด Stop CPR (Vital Signs กางอัตโนมัติ)
2. ไม่กรอกค่า > กด "ข้ามไปก่อน"

## Expected Result
Section Vital Signs ยังค้างแสดงอยู่ และมี badge "ยังไม่บันทึก"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-040 - แสดง banner สรุป Episode ที่จบแล้วพร้อมลิงก์ไป Timeline

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-040
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > บันทึก 2 Cycle (Defib 1 ครั้ง · Adrenaline 1:10,000 1 dose) > กด ROSC
2. ดู banner สรุป Episode
3. กดลิงก์ไป Timeline

## Expected Result
banner แสดง เวลา ROSC · duration · cycles = 2 · shocks = 1 · ยา = 1 · ผู้บันทึก (user1) ตรงกับที่ทำ
กดลิงก์แล้วไปที่ CPR Timeline ของ Episode นี้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-041 - แสดงการ์ด CPR Episode Summary ด้านบนของหน้า CPR ทั้งระหว่างและหลังจบ CPR

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2530-041
Case Type: Happy
Test Type: UIUX

## Test Step
1. Start CPR > ดูด้านบนของหน้า CPR
2. กด Stop CPR > ดูด้านบนของหน้า CPR อีกครั้ง

## Expected Result
การ์ด "CPR Episode Summary" แสดงอยู่ด้านบนของหน้า CPR ทั้งระหว่าง CPR และหลังจบ CPR

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-042 - แสดงตัวเลขสรุปบน CPR Episode Summary ระหว่าง CPR

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-042
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > จดเวลาเริ่ม
2. บันทึก 2 Cycle (Defib 200 J 1 ครั้ง · Adrenaline 1:10,000 ใน Cycle 2) — ยังไม่จบ CPR
3. ดูตัวเลขบน CPR Episode Summary 2 ครั้งห่างกัน 10 วินาที

## Expected Result
Started = เวลาเริ่ม · Ended = "—" · Duration เดินเวลาจริง (เพิ่มขึ้นประมาณ 10 วินาที) · Cycles = 2 · Shocks = 1 · จำนวน dose ยา = 1

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-043 - ตรวจสอบ Status pill เปลี่ยนตามสถานะ Episode กำลังทำ ROSC และ Stop CPR

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-043
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > ดู Status pill
2. กด ROSC > ดู Status pill
3. Start CPR ใหม่ > กด Stop CPR > ดู Status pill

## Expected Result
ระหว่าง CPR = "กำลังทำ CPR" สีแดง · หลัง ROSC = "Terminal: ROSC" สีเขียว · หลัง Stop CPR = "Terminal: Stop CPR" สีเทา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-044 - แสดง Episode ลำดับที่และกู้ชีพซ้ำบน Episode Summary ตั้งแต่ Episode ที่ 2

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2530-044
Case Type: Happy
Test Type: UIUX

## Test Step
1. ผู้ป่วยที่มี Episode #1 จบแล้ว > Start CPR (Episode #2)
2. ดูการ์ด CPR Episode Summary

## Expected Result
แสดง "Episode #2 · กู้ชีพซ้ำ"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-045 - ตรวจสอบ CPR Timeline บน Episode Summary กางไว้เป็นค่าตั้งต้นและจำนวนในปุ่มเท่ากับ event ที่บันทึก

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-045
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > บันทึก 2 Cycle (รวม Start CPR = 3 event)
2. เปิดหน้า CPR ใหม่ (ปิดแล้วเปิดเมนู CPR Progression) > ดูปุ่ม CPR Timeline

## Expected Result
ปุ่มแสดง "CPR Timeline (3)" · รายการ cycle กางอยู่เป็นค่าตั้งต้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-046 - ตรวจสอบกดปุ่ม CPR Timeline เพื่อหุบและกางรายการ cycle ได้

Status: Not Run · Priority: Low · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-046
Case Type: Happy
Test Type: Functional

## Test Step
1. Episode ที่มี event อย่างน้อย 2 รายการ (รายการกางอยู่)
2. กดปุ่ม "CPR Timeline (N)" > กดอีกครั้ง

## Expected Result
กดครั้งแรกรายการหุบ · กดครั้งที่สองรายการกางกลับมาครบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-047 - ตรวจสอบบันทึก Cycle ใหม่แล้วแถวใหม่ต่อท้ายรายการและตัวเลขสรุปอัปเดตทันทีโดยไม่ต้อง refresh

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-047
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > จดตัวเลข Cycles / Shocks / dose ยา และ N ของ "CPR Timeline (N)"
2. บันทึก Cycle ที่มี Defib 200 J + Atropine 1 mg IV (ไม่ refresh หน้า)

## Expected Result
แถว Cycle ใหม่ต่อท้ายรายการทันที · Cycles +1 · Shocks +1 · dose ยา +1 · N +1

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-048 - ตรวจสอบแถวบน CPR Timeline เรียงตามเวลาจากเก่าไปใหม่

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2530-048
Case Type: Happy
Test Type: Functional

## Test Step
1. Start CPR > บันทึก 3 Cycle > กด ROSC
2. ดูลำดับแถวบน CPR Timeline ของ Episode Summary

## Expected Result
เรียง Start CPR → Cycle → Cycle → Cycle → ROSC ตามเวลาจากเก่าไปใหม่

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-049 - ตรวจสอบข้อมูล CPR Timeline บน Episode Summary ตรงกับหน้า History

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Integration + QA : Manual

```
TC ID: TC-SBH-2530-049
Case Type: Happy
Test Type: Integration

## Test Step
1. Episode ที่จบแล้ว มี Rhythm · Defib · ยา · Comment · Nurse note ครบ
2. จดทุกแถวบน CPR Timeline ของ Episode Summary (ชื่อ event · เวลา · T+ · รายละเอียด)
3. เปิดหน้า History > Timeline ของ Episode เดียวกัน > เทียบทีละแถว

## Expected Result
จำนวนแถว ลำดับ เวลา และรายละเอียดทุกแถวตรงกันทั้ง 2 หน้า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2530-UHP - บันทึก Cycle ด้วยเวลาหรือข้อมูลยาที่ไม่ถูกต้อง

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : CPR Progression + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2530-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER / CPR Progression
- Requirement ที่อ้างอิง: SBH-2530 — [ER] [ CPR-Progression ] Improve CPR Progression

วัตถุประสงค์
- ยืนยันว่าระบบไม่ยอมบันทึก Cycle ที่เวลาผิดเงื่อนไขหรือข้อมูลยาไม่ครบ และแจ้ง inline error

ขอบเขต Requirement
- AC 1.6 (เวลาย้อนหลังกว่า event ก่อนหน้า · เกินเวลาปัจจุบันเกิน 2 นาที)
- AC 2.5 (ติ๊กยาแต่ Dose ว่าง · ยาอื่นๆ ไม่ระบุชื่อ)

ความเสี่ยง
- ลำดับเวลาใน Timeline ผิด หรือมีบันทึกยาที่ไม่รู้ขนาด ทำให้ทบทวนการกู้ชีพผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ใส่ค่าผิดทีละ 1 ค่าต่อ TC
```

### TC-SBH-2530-050 - ตรวจสอบบันทึก Cycle ด้วยเวลาก่อน event ก่อนหน้าไม่ได้และแสดง inline error

Status: Not Run · Priority: High · Labels: … + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2530-050
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Start CPR > จดเวลา Start CPR > รอ 1 นาที
2. กด "แก้เวลาเอง" > เลือกเวลา = เวลา Start CPR − 1 นาที
3. กด "บันทึก Cycle 2"

## Expected Result
แสดง inline error ที่ช่องเวลา · ไม่บันทึก Cycle (Timeline ไม่มีแถวใหม่)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-051 - ตรวจสอบบันทึก Cycle ด้วยเวลาเกินเวลาปัจจุบันมากกว่า 2 นาทีไม่ได้และแสดง inline error

Status: Not Run · Priority: High · Labels: เหมือน TC-050

```
TC ID: TC-SBH-2530-051
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Start CPR
2. กด "แก้เวลาเอง" > เลือกเวลา = เวลาปัจจุบัน + 3 นาที
3. กด "บันทึก Cycle 2"

## Expected Result
แสดง inline error ที่ช่องเวลา · ไม่บันทึก Cycle

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-052 - ตรวจสอบติ๊กยาแต่ไม่กรอก Dose แล้วบันทึกไม่ได้และแสดง inline error

Status: Not Run · Priority: High · Labels: เหมือน TC-050

```
TC ID: TC-SBH-2530-052
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Start CPR
2. ติ๊ก Adrenaline 1:10,000 · เว้น Dose ว่าง
3. กด "บันทึก Cycle 2"

## Expected Result
แสดง inline error ที่ช่อง Dose ของ Adrenaline 1:10,000 · ไม่บันทึก Cycle

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-053 - ตรวจสอบติ๊กยาอื่นๆ แต่ไม่ระบุชื่อยาแล้วบันทึกไม่ได้และแสดง inline error

Status: Not Run · Priority: High · Labels: เหมือน TC-050

```
TC ID: TC-SBH-2530-053
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Start CPR
2. ติ๊ก "ยาอื่นๆ" · ไม่กรอกชื่อยา · กรอก Dose "10 ml"
3. กด "บันทึก Cycle 2"

## Expected Result
แสดง inline error ที่ช่องชื่อยาอื่นๆ · ไม่บันทึก Cycle

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2530-EDG - Cycle ที่เวลาอยู่บนขอบเงื่อนไข และ Cycle ที่ครบกำหนดแต่ยังไม่บันทึก

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : CPR Progression + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2530-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / CPR Progression
- Requirement ที่อ้างอิง: SBH-2530 — [ER] [ CPR-Progression ] Improve CPR Progression

วัตถุประสงค์
- ยืนยันพฤติกรรมเมื่อเวลาบันทึกอยู่ที่ขอบเงื่อนไข และเมื่อ countdown หมดแต่ทีมยังไม่ได้บันทึก Cycle

ขอบเขต Requirement
- AC 1.5 · 1.6 (ค่าขอบ +2 นาที) · 4.6 · 7.7

ความเสี่ยง
- ระบบปฏิเสธเวลาที่ถูกต้องตามเงื่อนไข ทำให้บันทึกไม่ทัน
- Cycle ที่ยังไม่บันทึกถูกนับรวม ทำให้จำนวน event / cycle ผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2530-054 - บันทึก Cycle ด้วยเวลาเท่ากับเวลาปัจจุบันบวก 2 นาทีพอดีได้

Status: Not Run · Priority: Medium · Labels: … + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2530-054
Case Type: Edge
Test Type: Functional

## Test Step
1. Start CPR
2. กด "แก้เวลาเอง" > เลือกเวลา = เวลาปัจจุบัน + 2 นาที (นาทีเดียวกันกับขอบ)
3. กด "บันทึก Cycle 2" ทันที

## Expected Result
บันทึกสำเร็จ ไม่มี inline error · Timeline มีแถว Cycle 2 ตามเวลาที่เลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

หมายเหตุ TC-054: เทคนิค BVA — ขอบบน "ไม่เกินเวลาปัจจุบันเกิน 2 นาที" (ค่าเลยขอบอยู่ใน TC-051)

### TC-SBH-2530-055 - แสดงสถานะครบกำหนด Pulse Rhythm check เมื่อ countdown เหลือ 00:00

Status: Not Run · Priority: High · Labels: … + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2530-055
Case Type: Edge
Test Type: Functional

## Test Step
1. Start CPR
2. ไม่บันทึก Cycle · รอ countdown ลดจนเหลือ 00:00
3. ดูการ์ด Cycle และฟังเสียงจากเครื่อง

## Expected Result
การ์ดแสดงสถานะ "ครบกำหนด Pulse/Rhythm check" · ไม่มีเสียงแจ้งเตือน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2530-056 - แสดง Cycle ที่ครบกำหนดแต่ยังไม่บันทึกเป็นแถวจางและไม่นับรวมในจำนวน event

Status: Not Run · Priority: Medium · Labels: เหมือน TC-055

```
TC ID: TC-SBH-2530-056
Case Type: Edge
Test Type: Functional

## Test Step
1. Start CPR (event = 1)
2. ไม่บันทึก Cycle · รอเกิน 2 นาทีให้ countdown หมด
3. ดู CPR Timeline บน Episode Summary และหน้า History

## Expected Result
มีแถวจาง / เส้นประ ป้าย "ครบกำหนด · ยังไม่บันทึก" (หน้า History: "ครบกำหนด (ยังไม่บันทึก)")
ปุ่มยังเป็น "CPR Timeline (1)" (ไม่นับแถวนี้)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## Requirement gap / คำถามที่ต้องยืนยัน

**Expected behavior**
- 1.7 ระยะ cycle ตั้งค่าได้ใน config ระดับ hospital — การ์ดไม่บอกว่าตั้งค่าที่หน้าไหน / ใครตั้งได้ → ยังไม่มี TC · ถ้ารู้ที่ตั้งค่าและ QA เข้าถึงได้ จะเพิ่ม TC "เปลี่ยนเป็น 3 นาทีแล้ว countdown เริ่มที่ 03:00"
- 4.x "CPR Timeline" หมายถึงหน้า History หรือรายการใน Episode Summary — ร่างนี้ถือว่าเป็น component เดียวกันตาม 7.9 แล้วรวม TC
- 6.3 "highlight" เป็นลักษณะไหน (กรอบสี / พื้นหลัง) — TC ใช้ "มี highlight" ตามการ์ด
- 6.5 MEWS "ตาม logic เดิม" — TC-037 เทียบกับฟอร์มคัดกรอง ER เพราะการ์ดไม่ระบุตารางคะแนน

**Validation**
- 1.6 เวลา "เท่ากับ" event ก่อนหน้าพอดี บันทึกได้หรือไม่ — การ์ดไม่ตอบ จึงไม่สร้าง TC ค่าขอบนี้
- datetime picker ละเอียดถึงวินาทีหรือนาที — กระทบค่าขอบ +2 นาที (TC-054)

**Permission / role**
- 3.6 "แก้ไขได้ตามสิทธิ์และต้องมี audit log" — การ์ดไม่บอกว่า role ไหนแก้ได้ แก้ที่ไหน และดู audit log ที่ไหน (PR พูดถึง "corrections" และ "edit permission") → ยังไม่มี TC
- Nurse note (badge "พยาบาล") — บัญชีแพทย์ / Super User บันทึกได้ด้วยหรือเฉพาะพยาบาล — การ์ดไม่ระบุ
