# Draft Test Structure — SBH-3612

> สถานะ: **สร้างใน Linear แล้ว 3 พ.ย. 2026** — ผู้ใช้พิมพ์ "สร้างได้" · EXE `SBH-3821` · HPY `SBH-3822` (TC 001–008) · EDG `SBH-3823` (TC 009) · connector เป็นบัญชี Pearsu (ผู้ใช้อนุญาต "สร้างเลย assign ผม") · assignee Suchat ทุกใบ
> - เลข TC → SBH: 001=3824 · 002=3825 · 003=3826 · 004=3827 · 005=3828 · 006=3829 · 007=3830 · 008=3831 · 009=3832
> - ชุดนี้ = EXE 1 + Scenario 2 (HPY / EDG) + TC 9 = 12 ใบ
> - ยึด AC 2 ข้อในการ์ด + รูปในการ์ด (กรอบน้ำเงินคอลัมน์ Nurse note ในแถว task → ย้ายขึ้นไปข้างปุ่ม "+ เพิ่ม Nurse task")
> - คอมเมนต์ dev (Thanadon) มีผลทดสอบ Before / After + เรื่องที่ทำเพิ่มนอก AC (ตัวเลข (n) · Visit ปิด · สิทธิ์ · ภาษาอังกฤษ) → **ไม่ทำเป็น TC** ใส่ไว้ใน Requirement gap ให้ผู้ใช้ตัดสิน
> - PR: cortex-ui #2632 "[V2.9.1][FEAT][SBH-3612] move nurse note to patient level in ER nurse task list" — ตรงกับ label VERSION 2.9.1
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972 · Env **Dev-X อย่างเดียว** (ตามที่ผู้ใช้สั่ง)
> - ค่าที่เสนอ (รอยืนยัน): Run Type CT · Version 2.9.1 · Env Dev-X · QA Module : ER · QA Sub-module / Feature : Nurse Task List (label มีอยู่แล้ว)

Requirement: SBH-3612 — [ER][Nurse task ] แก้ไข Menu
URL: https://linear.app/cortexcloud/issue/SBH-3612/ernurse-task-แกไข-menu
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: In Review
Labels: Natthaphat ( MOD ) 🙈 · 🍄 Improvement · VERSION 2.9.1 · Assignee: Thanadon (Modern) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Relations: ไม่มี · Sub-Issue: ไม่มี
Scope / Version = 2.9.1

AC ในการ์ด
1. ย้าย Menu → ไปในระดับ Patient — 1.1 เพิ่ม Nurse note · 1.2 ดู Nurse note
2. ตำแหน่ง — 2.1 ข้างๆ Menu : เพิ่ม Nurse Task

## AC → TC

| AC | เรื่อง | TC |
|---|---|---|
| 1 | ย้ายออกจากแถว task (ไม่เหลือในแถว) | 004 |
| 1.1 | เพิ่ม Nurse note ระดับผู้ป่วย | 001 · 005 · 006 |
| 1.2 | ดู Nurse note ระดับผู้ป่วย | 002 · 007 · 008 |
| 1 (ระดับ Patient) | ปุ่มทำงานกับผู้ป่วยที่เลือกอยู่ เมื่อสลับผู้ป่วย | 009 |
| 2.1 | ตำแหน่งข้างปุ่ม "+ เพิ่ม Nurse task" | 003 |

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | แสดงปุ่ม "เพิ่ม Nurse Note" ระดับผู้ป่วยบนหน้ารายการงานพยาบาล | มีปุ่ม "เพิ่ม Nurse Note" 1 ปุ่มที่แถบด้านบนตาราง ไม่ผูกกับแถว task |
| 002 | HPY | แสดงปุ่ม "ดู Nurse Note" ระดับผู้ป่วยบนหน้ารายการงานพยาบาล | มีปุ่ม "ดู Nurse Note" 1 ปุ่มที่แถบด้านบนตาราง ไม่ผูกกับแถว task |
| 003 | HPY | ตรวจสอบตำแหน่งปุ่ม Nurse Note อยู่ข้างปุ่ม "+ เพิ่ม Nurse task" | ปุ่ม เพิ่ม Nurse Note / ดู Nurse Note อยู่แถวเดียวกันและติดกับปุ่ม "+ เพิ่ม Nurse task" |
| 004 | HPY | ตรวจสอบแถว task ไม่มีเมนู Nurse note แล้ว | หัวตารางไม่มีคอลัมน์ "Nurse note" · ทุกแถว task ไม่มีปุ่ม เพิ่ม Nurse note / ดู Nurse note |
| 005 | HPY | ทดสอบกด "เพิ่ม Nurse Note" ระดับผู้ป่วยแล้วเปิดหน้าต่างบันทึก | เปิดหน้าต่าง "Nurse Note" (Focus / A / I / E) ของผู้ป่วยที่เลือก |
| 006 | HPY | บันทึก Nurse Note จากปุ่มระดับผู้ป่วย | แจ้ง "บันทึกข้อมูลสำเร็จ" · หน้าต่างปิด |
| 007 | HPY | ทดสอบกด "ดู Nurse Note" ระดับผู้ป่วยแล้วแสดงรายการ Nurse Note | เปิดรายการ Nurse Note ของผู้ป่วยที่เลือก แสดง Focus ที่มีอยู่ |
| 008 | HPY | แสดง Nurse Note ที่บันทึกจากปุ่มระดับผู้ป่วยในรายการ "ดู Nurse Note" | Focus ที่เพิ่งบันทึกแสดงในรายการพร้อม A / I / E ที่กรอก |
| 009 | EDG | ตรวจสอบปุ่ม Nurse Note ทำงานกับผู้ป่วยที่เลือกหลังสลับผู้ป่วย | ดู Nurse Note แสดงของผู้ป่วยคนที่ 2 เท่านั้น ไม่มี Focus ของผู้ป่วยคนแรกปน |

## Requirement gap (ไม่ทำเป็น TC — รอผู้ใช้ / BA ตัดสิน)

**expected behavior**
- ตัวเลขใน "ดู Nurse Note (n)" นับอะไร — การ์ดไม่ได้ระบุว่าต้องมีตัวเลข · dev ทำเป็น "จำนวน note ของ visit ทั้งหมด" และอัปเดตทันทีหลังบันทึก
- Nurse note เก่าที่เคยสร้างจากแถว task — dev แสดงรวมในรายการเดียว ไม่มีป้ายบอกชื่อ task · การ์ดไม่บอกว่าต้องแสดงแบบไหน
- Note ที่เพิ่มจากปุ่มใหม่ผูกกับ visit ไม่ผูก task แล้ว (จาก dev) — ยอมรับได้ไหม
- ผู้ป่วยที่ยังไม่มี Order (เปิดสวิตช์ "แสดงผู้ป่วยที่ยังไม่มี Order") ต้องเห็นปุ่ม Nurse Note ด้วยไหม

**validation / permission / role**
- Visit ปิดแล้ว: ปุ่ม "เพิ่ม Nurse Note" ต้อง disable ไหม (dev ทำ disable · ทดสอบแค่ unit test)
- ผู้ใช้ไม่มีสิทธิ์ `nurse-note:create` ต้องซ่อน / disable ปุ่มไหม (dev ครอบด้วย unit test)

**UI**
- ฟอร์มเพิ่ม note เปิดเป็น modal ซ้อนบน drawer (2 ชั้น) — dev ตั้งข้อสังเกตไว้
- ข้อความปุ่มภาษาอังกฤษ ("Add nurse note" / "View nurse notes (n)") — การ์ดไม่ได้ระบุ

**error handling / edge cases**
- โหลดรายการ Nurse Note ไม่สำเร็จ ต้องแสดงอะไร (Before เคยขึ้น "ไม่สามารถโหลด Nurse note ของงานนี้ได้")

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user พยาบาล ER** ที่บันทึก Nurse Note ได้ (ใช้ทุก TC)
- **ผู้ป่วย ER A** (คัดกรองแล้ว อยู่ในโซน ไม่ใช่โซน Triage) มี Nurse task วันนี้ ≥ 2 รายการ และมี Nurse Focus Note อยู่แล้ว ≥ 1 รายการ — 001–008
- **ผู้ป่วย ER B** มี Nurse task วันนี้ ≥ 1 รายการ และ Nurse Focus Note ชื่อ Focus ต่างจากผู้ป่วย A — 009
- dev-x ใช้ร่วมกัน: ข้อมูล note ที่บันทึกใน TC-006 ตั้งชื่อ Focus ให้รู้ว่าเป็นของการทดสอบ เช่น "SBH-3612 QA"

---

## EXE - CT - 2.9.1

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, VERSION 2.9.1, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Nurse Task List, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.1
- Module: ER — รายการงานพยาบาล (Nurse Task List)
- Requirement ที่อ้างอิง: SBH-3612 — [ER][Nurse task ] แก้ไข Menu
- Environment: Dev-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ย้ายเมนู เพิ่ม Nurse Note / ดู Nurse Note จากแถว task ไปเป็นระดับผู้ป่วย
- ตำแหน่งปุ่มอยู่ข้างปุ่ม "+ เพิ่ม Nurse task"
- เพิ่ม / ดู Nurse Note จากปุ่มใหม่ทำงานกับผู้ป่วยที่เลือก

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- นอก scope: ตัวเลขบนปุ่มดู · Visit ปิด · สิทธิ์ · ภาษาอังกฤษ (การ์ดไม่ระบุ — ดู Requirement gap)
```

---

## TS-SBH-3612-HPY - ย้ายเมนู Nurse Note ไประดับผู้ป่วยบนหน้ารายการงานพยาบาล

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3612-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER — รายการงานพยาบาล (Nurse Task List)
- Requirement ที่อ้างอิง: SBH-3612 — [ER][Nurse task ] แก้ไข Menu

วัตถุประสงค์
- ยืนยันว่าเมนู เพิ่ม Nurse Note / ดู Nurse Note ย้ายจากแถว task ไปอยู่ระดับผู้ป่วย ข้างปุ่ม "+ เพิ่ม Nurse task" และใช้งานได้

ขอบเขต Requirement
- AC 1 ย้าย Menu ไประดับ Patient (1.1 เพิ่ม Nurse note · 1.2 ดู Nurse note)
- AC 2 ตำแหน่งข้าง Menu เพิ่ม Nurse Task

ความเสี่ยง
- ยังเหลือปุ่มในแถว task ซ้ำกับปุ่มใหม่ → พยาบาลสับสนว่า note ผูกกับอะไร
- ปุ่มใหม่บันทึก / แสดง note ไม่ได้ → พยาบาลบันทึกการพยาบาลจากหน้านี้ไม่ได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ดูหัวข้อ "ข้อมูลตั้งต้น" ในไฟล์ร่าง
```

### TC-SBH-3612-001 - แสดงปุ่ม "เพิ่ม Nurse Note" ระดับผู้ป่วยบนหน้ารายการงานพยาบาล

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3612-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. เลือกผู้ป่วย ER A จากรายชื่อฝั่งซ้าย
3. ดูแถบด้านบนตารางรายการงาน (แถวเดียวกับข้อความ "รายการงาน … active")

## Expected Result
มีปุ่ม "เพิ่ม Nurse Note" 1 ปุ่มที่แถบด้านบนตาราง ไม่ผูกกับแถว task

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1
```

### TC-SBH-3612-002 - แสดงปุ่ม "ดู Nurse Note" ระดับผู้ป่วยบนหน้ารายการงานพยาบาล

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3612-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. เลือกผู้ป่วย ER A จากรายชื่อฝั่งซ้าย
3. ดูแถบด้านบนตารางรายการงาน

## Expected Result
มีปุ่ม "ดู Nurse Note" 1 ปุ่มที่แถบด้านบนตาราง ไม่ผูกกับแถว task

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.2
```

### TC-SBH-3612-003 - ตรวจสอบตำแหน่งปุ่ม Nurse Note อยู่ข้างปุ่ม "+ เพิ่ม Nurse task"

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3612-003
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. เลือกผู้ป่วย ER A
3. ดูตำแหน่งปุ่ม "เพิ่ม Nurse Note" / "ดู Nurse Note" เทียบกับปุ่ม "+ เพิ่ม Nurse task"

## Expected Result
ปุ่ม เพิ่ม Nurse Note / ดู Nurse Note อยู่แถวเดียวกันและติดกับปุ่ม "+ เพิ่ม Nurse task"

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2.1
```

### TC-SBH-3612-004 - ตรวจสอบแถว task ไม่มีเมนู Nurse note แล้ว

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3612-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. เลือกผู้ป่วย ER A (มี task ≥ 2 รายการ)
3. ดูหัวตารางและทุกแถว task

## Expected Result
หัวตารางไม่มีคอลัมน์ "Nurse note" · ทุกแถว task ไม่มีปุ่ม เพิ่ม Nurse note / ดู Nurse note

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1 (ย้าย Menu ออกจากแถว task)
```

### TC-SBH-3612-005 - ทดสอบกด "เพิ่ม Nurse Note" ระดับผู้ป่วยแล้วเปิดหน้าต่างบันทึก

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3612-005
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. เลือกผู้ป่วย ER A
3. กดปุ่ม "เพิ่ม Nurse Note" ที่แถบด้านบนตาราง

## Expected Result
เปิดหน้าต่าง "Nurse Note" (ช่อง Focus / A / I / E) ของผู้ป่วยที่เลือก

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1
```

### TC-SBH-3612-006 - บันทึก Nurse Note จากปุ่มระดับผู้ป่วย

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3612-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. เลือกผู้ป่วย ER A > กดปุ่ม "เพิ่ม Nurse Note"
3. กรอก Focus "SBH-3612 QA" + A / I / E พร้อม Perform time
4. กด บันทึก

## Expected Result
แจ้ง "บันทึกข้อมูลสำเร็จ" · หน้าต่างปิด

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1
```

### TC-SBH-3612-007 - ทดสอบกด "ดู Nurse Note" ระดับผู้ป่วยแล้วแสดงรายการ Nurse Note

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3612-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. เลือกผู้ป่วย ER A (มี Nurse Focus Note อยู่แล้ว)
3. กดปุ่ม "ดู Nurse Note" ที่แถบด้านบนตาราง

## Expected Result
เปิดรายการ Nurse Note ของผู้ป่วยที่เลือก แสดง Focus ที่มีอยู่

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.2
```

### TC-SBH-3612-008 - แสดง Nurse Note ที่บันทึกจากปุ่มระดับผู้ป่วยในรายการ "ดู Nurse Note"

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3612-008
Case Type: Happy
Test Type: Functional

## Test Step
1. ทำ TC-SBH-3612-006 ให้บันทึกสำเร็จก่อน (Focus "SBH-3612 QA")
2. บนหน้ารายการงานพยาบาล ผู้ป่วย ER A กดปุ่ม "ดู Nurse Note"
3. กดเปิด Focus "SBH-3612 QA"

## Expected Result
Focus "SBH-3612 QA" แสดงในรายการ พร้อม A / I / E ตรงกับที่กรอก

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1 + 1.2
```

---

## TS-SBH-3612-EDG - ปุ่ม Nurse Note ระดับผู้ป่วยเมื่อสลับผู้ป่วย

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3612-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER — รายการงานพยาบาล (Nurse Task List)
- Requirement ที่อ้างอิง: SBH-3612 — [ER][Nurse task ] แก้ไข Menu

วัตถุประสงค์
- ยืนยันว่าปุ่มระดับผู้ป่วยอ้างอิงผู้ป่วยที่เลือกอยู่เสมอ เมื่อสลับผู้ป่วยในรายชื่อฝั่งซ้าย

ขอบเขต Requirement
- AC 1 ย้าย Menu ไประดับ Patient (1.2 ดู Nurse note)

ความเสี่ยง
- ปุ่มค้างข้อมูลของผู้ป่วยคนก่อน → พยาบาลดู / บันทึก note ผิดคน

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-3612-009 - ตรวจสอบปุ่ม Nurse Note ทำงานกับผู้ป่วยที่เลือกหลังสลับผู้ป่วย

Status: Not Run · Priority: High · Labels: … + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3612-009
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. เลือกผู้ป่วย ER A > กด "ดู Nurse Note" > จำชื่อ Focus ที่แสดง > ปิด
3. เลือกผู้ป่วย ER B จากรายชื่อฝั่งซ้าย
4. กด "ดู Nurse Note"

## Expected Result
แสดง Nurse Note ของผู้ป่วย ER B เท่านั้น ไม่มี Focus ของผู้ป่วย ER A ปน

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1 (ระดับ Patient) · เทคนิค: State Transition — เปลี่ยนผู้ป่วยที่เลือก
```
