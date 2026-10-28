# Draft Test Structure — SBH-2629

> สถานะ: **สร้างใน Linear แล้ว (2026-10-28)** — ผู้ใช้ตอบ "สร้างได้" · EXE SBH-3120 · HPY SBH-3121 (TC-001–022 = SBH-3124–3145) · UHP SBH-3122 (TC-023–027 = SBH-3146–3150) · EDG SBH-3123 (TC-028–030 = SBH-3151–3153) · label ใหม่ QA Sub-module / Feature : Nurse Focus Note · สร้างผ่าน connector บัญชี Neranchara (assignee = Suchat)
> - ค่าที่เสนอ (รอยืนยัน): Run Type **CT** (การ์ดผูก Cycle) · Env **Dev-X / SBH Prod** · QA Module : ER · QA Sub-module / Feature : **Nurse Focus Note** (label ใหม่ ต้องสร้าง — ในระบบยังไม่มี Sub-module ของ Nursing)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ยอดที่จะสร้าง: EXE 1 + Scenario 3 (HPY / UHP / EDG) + TC 30 = 34 ใบ
> - รอผู้ใช้ review ร่างเต็ม แล้วพิมพ์ "สร้างได้" จึงจะสร้าง

Requirement: SBH-2629 — [ER] [ Nurse Focus Note ] เพิ่ม Feature Note template
URL: https://linear.app/cortexcloud/issue/SBH-2629
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: High · State: Ready for Testing
Labels: 🍄 Improvement, Natthaphat ( MOD ) 🙈, VERSION 2.9.0 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT
Sub-Issue: ยังไม่มี EXE / TC
PR ที่แนบ: cortex-api #2799 · cortex-ui #2415 · cortex-x #8827 (ทุกตัวขึ้นต้น V2.9.0)
คอมเมนต์ (jetsadaporn (Dew) 21 ต.ค.): หน้า Nurse Note Template มีแท็บ Assessment / Intervention / Evaluation · มีเมนูด้านขวาของแต่ละช่อง · กด "ใช้ข้อความนี้" ข้อความเข้าช่องเลยไม่ต้อง copy paste

## ผลสำรวจบน Dev-X (28 ต.ค. 2026 · user1 / Super_User · ผู้ป่วย AUTO HN 6932118 · VN V69102827697)

หน้าตั้งค่า
- เข้าที่ `/cortex/setting/admin/note-templates` (สิทธิ์ `menu:setting:note-template`) → แท็บ Note Template · Nurse Note Template · Shortcut
- แท็บ Nurse Note Template มีแท็บย่อย (segmented) Assessment / Intervention / Evaluation → URL `type=NURSE_FOCUS_NOTE_ASSESSMENT / _INTERVENTION / _EVALUATION` · ตารางมีคอลัมน์ ID · ชื่อ · Labels · ประเภท · Assigned To · สถานะ · สร้างโดย · วันที่สร้าง · อัปเดตล่าสุดโดย · อัปเดตล่าสุดเมื่อ · จัดการ
- ปุ่ม "+ เพิ่ม Note Template" → ฟอร์ม: สวิตช์ Active (ตั้งต้นเปิด) · ชื่อ · Template (rich text) · Labels · Type (Public / Personal / Clinic) — **ไม่มีช่องเลือกหมวด A / I / E** ระบบผูกหมวดตามแท็บย่อยที่กดมา
- บันทึกฟอร์มว่าง → ชื่อ · Template · Labels ขึ้น "โปรดระบุ" ทั้ง 3 ช่อง (Template กับ Labels ไม่มีดอกจัน)
- บันทึกสำเร็จ → "สร้าง Note Template สำเร็จ" + กลับมาที่แท็บย่อยเดิม แถวใหม่อยู่บนสุด · ปิด Active = สถานะ "ปิดใช้งาน"
- Nurse Note Template กับ Note Template เก็บที่เดียวกันแต่แยกด้วย `templateType` → แท็บ Note Template ค้น "QA-2629" / "General" ไม่พบ

หน้าต่าง Nurse Note
- ไอคอน `เลือก Nurse Note Template` อยู่มุมขวาของช่อง A / I / E ครบ 3 ช่อง ทั้งหน้าต่าง "+ เพิ่ม Nurse Note" · "เพิ่มข้อมูล AIE" (เมนู more ของการ์ด) · "Edit note"
- กดไอคอน → หน้าต่าง `Nurse Note Template - <Assessment / Intervention / Evaluation>` แสดงเฉพาะ Template ของหมวดนั้น · **เลือกรายการแรกและแสดงพรีวิวให้อัตโนมัติ** · ช่องค้นหา "ค้นหาชื่อหรือข้อความ Template" ค้นได้ทั้งชื่อและเนื้อหา · ไม่พบ = "ไม่มี Template" พรีวิว "-" และปุ่ม "ใช้ข้อความนี้" กดไม่ได้ · "ล้างค่ากรอง" ล้างคำค้น + รายการกลับครบ · แบ่งหน้า 10 รายการ
- Template ที่ปิดใช้งาน**ไม่แสดง** (ค้นชื่อก็ไม่พบ)
- กด "ใช้ข้อความนี้" → หน้าต่าง Template **ปิดเอง** ไม่มีแจ้งเตือน · ข้อความ**แทรกที่ตำแหน่ง cursor ไม่ลบข้อความเดิม**
- กด "ปิด" → หน้าต่าง Template ปิด ข้อความในช่องไม่เปลี่ยน
- บันทึก Nurse Note → "บันทึกข้อมูลสำเร็จ" · การ์ด Focus แสดง A / I / E ตรงกับข้อความ Template
- แก้ข้อความ Template หลังบันทึก Note → Note ที่บันทึกแล้ว**ไม่เปลี่ยน** · หน้าต่าง Template แสดงข้อความใหม่
- หน้าต่าง Note Template ของ ER Physician Note (ไอคอน `Note Template`) เรียก `templateType: GENERAL` · ปุ่มเป็น "คัดลอกข้อความ" · ไม่มี Nurse Note Template ปน · Template "nurse note" (ID 22) ที่ติด label `nurse-note` อยู่ในแท็บ Note Template → ขึ้นฝั่งแพทย์ ไม่ขึ้นฝั่งพยาบาล (แยกด้วยประเภท ไม่ใช่ label)

ข้อมูลที่สร้างไว้บน Dev-X (ใช้เทสต่อได้): QA-2629 Assessment (ID 34 · แก้เพิ่มบรรทัด EDITED-AFTER-SAVE แล้ว) · QA-2629 Intervention (35) · QA-2629 Evaluation (36) · QA-2629 Inactive A (37 · ปิดใช้งาน) · Focus "QA-2629 Template Focus" ของ HN 6932118

## ข้อสังเกตจากการสำรวจ

1. **แทรกข้อความแล้วต่อในบรรทัดเดียวกับ cursor** — ช่องที่มีข้อความอยู่แล้ว กด "ใช้ข้อความนี้" บรรทัดแรกของ Template ต่อตรง cursor โดยไม่ขึ้นบรรทัดใหม่ / ไม่เว้นวรรค เช่น "พิมพ์เอง QA" + Template → "พิมพ์เอง QAFocus/problem:" · วาง cursor กลางคำ "AAA BBB" → "AAAIntervention: QA-I BBB" · ใช้ Template เดิมซ้ำ → "Evaluation: QA-EEvaluation: QA-E" — **ผู้ใช้ยืนยัน 28 ต.ค. 2026: ไม่ใช่บั๊ก** (TC-013 / 030 ยึดพฤติกรรมนี้)
2. ช่อง Template และ Labels ในฟอร์มบังคับกรอก แต่ไม่มีดอกจัน `*` เหมือนช่องชื่อ (UIUX — ยังไม่ได้ตัดสิน)

## ตาราง AC → TC

| AC / ที่มา | เนื้อหาย่อ | TC |
|---|---|---|
| 1 + 1.1 | Note template ของ Nurse Focus Note ชื่อ Nurse Note Template (หน้าตั้งค่า แยกแท็บ A / I / E) | 001, 002, 003, 004, 018, 025, 026, 027 |
| 1 (คอมเมนต์) | เมนู Template ด้านขวาของแต่ละช่อง A / I / E | 005, 029, 030 |
| 1 (คอมเมนต์) | หน้าต่าง Nurse Note Template - <ช่อง> แสดงเฉพาะ Template ของช่องนั้น + พรีวิว | 006, 007, 008, 009, 028 |
| 1 (คอมเมนต์) | กด "ใช้ข้อความนี้" ข้อความเข้าช่องโดยไม่ต้อง copy paste | 010, 011, 012, 013, 017 |
| 1.1 (ภาพตัวอย่าง ER Physician note) | ค้นหาชื่อหรือข้อความ Template · ล้างค่ากรอง · ปิด | 014, 015, 016, 023, 024 |
| 1.1.1 | ข้อมูลบันทึกและเก็บแยกกับ Note template | 019, 020, 021, 022 |

ข้อมูลตั้งต้น: ผู้ป่วยทดสอบที่มี Visit ER เปิดอยู่ · user ที่มีสิทธิ์ตั้งค่า Note Template และ `focus-note:write` (user1) · Nurse Note Template ของแต่ละหมวดอย่างน้อย 2 รายการ · Note Template (ประเภท GENERAL) อย่างน้อย 1 รายการ

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, Suchart ( Jame ) 🥷, VERSION 2.9.0, QA Module : ER, QA Sub-module / Feature : Nurse Focus Note (ใหม่), QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: ER / Nurse Focus Note
- Requirement ที่อ้างอิง: SBH-2629 — [ER] [ Nurse Focus Note ] เพิ่ม Feature Note template
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- หน้าตั้งค่า Nurse Note Template แยกแท็บ Assessment / Intervention / Evaluation (สร้าง · แก้ไข · validation)
- ไอคอน Template ของช่อง A / I / E ในหน้าต่าง Nurse Note · เพิ่มข้อมูล AIE · Edit note
- หน้าต่างเลือก Template: รายการตามหมวด · พรีวิว · ค้นหา · ล้างค่ากรอง · ปิด · ซ่อนตัวที่ปิดใช้งาน
- ปุ่ม "ใช้ข้อความนี้" แทรกข้อความเข้าช่องโดยตรง และบันทึก Nurse Note ได้
- ข้อมูล Nurse Note Template แยกจาก Note Template ของแพทย์ · Note ที่บันทึกแล้วไม่เปลี่ยนตาม Template

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2629-HPY - ตั้งค่าและใช้ Nurse Note Template ในหน้าต่าง Nurse Note

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Focus Note + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2629-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Nurse Focus Note
- Requirement ที่อ้างอิง: SBH-2629 — [ER] [ Nurse Focus Note ] เพิ่ม Feature Note template

วัตถุประสงค์
- ตรวจว่าตั้งค่า Nurse Note Template แยกตาม A / I / E ได้ พยาบาลนำข้อความ Template เข้าช่องของ Nurse Note ได้ทันที และข้อมูลแยกจาก Note Template ของแพทย์

ขอบเขต Requirement
- AC 1, 1.1, 1.1.1 + คอมเมนต์ของ jetsadaporn (Dew) 21 ต.ค. 2026

ความเสี่ยง
- ข้อความเข้าผิดช่อง (A / I / E สลับกัน) · Template ของแพทย์ปนกับของพยาบาล · Note ที่บันทึกแล้วเปลี่ยนตาม Template

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2629-001 - แสดงแท็บ Nurse Note Template ในหน้าตั้งค่า พร้อมแท็บย่อย Assessment Intervention Evaluation

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Focus Note + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2629-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login user1 > เข้าหน้าตั้งค่า Note Template (/cortex/setting/admin/note-templates)
2. กดแท็บ Nurse Note Template

## Expected Result
หัวหน้าเป็น "Nurse Note Template" · มีแท็บย่อย Assessment / Intervention / Evaluation (ตั้งต้นที่ Assessment) · ตารางมีคอลัมน์ ID · ชื่อ · Labels · ประเภท · Assigned To · สถานะ · สร้างโดย · วันที่สร้าง · อัปเดตล่าสุดโดย · อัปเดตล่าสุดเมื่อ · จัดการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-002 - สร้าง Nurse Note Template ในแท็บ Assessment แล้วแสดงในรายการของแท็บ Assessment

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-002
Case Type: Happy
Test Type: Functional

## Test Step
1. แท็บ Nurse Note Template > แท็บย่อย Assessment > กด "+ เพิ่ม Note Template"
2. กรอกชื่อ "QA-2629 Assessment" · Template "Focus/problem: QA-A" · Labels "nurse-note" · Type Public > บันทึก

## Expected Result
แจ้งเตือน "สร้าง Note Template สำเร็จ" · กลับมาแท็บย่อย Assessment แถว "QA-2629 Assessment" อยู่บนสุด สถานะ Active · ไม่ขึ้นในแท็บย่อย Intervention และ Evaluation

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-003 - สร้าง Nurse Note Template ในแท็บ Intervention แล้วแสดงในรายการของแท็บ Intervention

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-003
Case Type: Happy
Test Type: Functional

## Test Step
1. แท็บ Nurse Note Template > แท็บย่อย Intervention > กด "+ เพิ่ม Note Template"
2. กรอกชื่อ "QA-2629 Intervention" · Template "Intervention: QA-I" · Labels "nurse-note" > บันทึก

## Expected Result
แจ้งเตือน "สร้าง Note Template สำเร็จ" · แถว "QA-2629 Intervention" อยู่ในแท็บย่อย Intervention · ไม่ขึ้นในแท็บย่อย Assessment และ Evaluation

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-004 - สร้าง Nurse Note Template ในแท็บ Evaluation แล้วแสดงในรายการของแท็บ Evaluation

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-004
Case Type: Happy
Test Type: Functional

## Test Step
1. แท็บ Nurse Note Template > แท็บย่อย Evaluation > กด "+ เพิ่ม Note Template"
2. กรอกชื่อ "QA-2629 Evaluation" · Template "Evaluation: QA-E" · Labels "nurse-note" > บันทึก

## Expected Result
แจ้งเตือน "สร้าง Note Template สำเร็จ" · แถว "QA-2629 Evaluation" อยู่ในแท็บย่อย Evaluation · ไม่ขึ้นในแท็บย่อย Assessment และ Intervention

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-005 - แสดงไอคอน Template ด้านขวาของช่อง Assessment Intervention Evaluation ในหน้าต่าง Nurse Note

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2629-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. เปิดผู้ป่วยที่มี Visit ER > เมนูขวา Nursing Records > Nurse Focus Note
2. กด "+ เพิ่ม Nurse Note"

## Expected Result
หน้าต่าง Nurse Note มีไอคอน Template ที่มุมขวาบนของช่อง Assessment (A) · Intervention (I) · Evaluation (E) ครบทั้ง 3 ช่อง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-006 - กดไอคอน Template ของช่อง Assessment แล้วแสดงเฉพาะ Template ของแท็บ Assessment

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-006
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้าต่าง Nurse Note (ตาม TC-005)
2. กดไอคอน Template ของช่อง Assessment

## Expected Result
หน้าต่างหัวข้อ "Nurse Note Template - Assessment" · รายการ ชื่อ Template มีเฉพาะ Template ของแท็บย่อย Assessment (เช่น QA-2629 Assessment · General Assessment) · ไม่มีของ Intervention / Evaluation · รายการแรกถูกเลือกและแสดงพรีวิวอัตโนมัติ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-007 - กดไอคอน Template ของช่อง Intervention แล้วแสดงเฉพาะ Template ของแท็บ Intervention

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-007
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้าต่าง Nurse Note (ตาม TC-005)
2. กดไอคอน Template ของช่อง Intervention

## Expected Result
หน้าต่างหัวข้อ "Nurse Note Template - Intervention" · รายการมีเฉพาะ Template ของแท็บย่อย Intervention (เช่น QA-2629 Intervention · General Intervention)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-008 - กดไอคอน Template ของช่อง Evaluation แล้วแสดงเฉพาะ Template ของแท็บ Evaluation

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-008
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้าต่าง Nurse Note (ตาม TC-005)
2. กดไอคอน Template ของช่อง Evaluation

## Expected Result
หน้าต่างหัวข้อ "Nurse Note Template - Evaluation" · รายการมีเฉพาะ Template ของแท็บย่อย Evaluation (เช่น QA-2629 Evaluation · General Evaluation)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-009 - เลือก Template อีกรายการแล้วพรีวิวเปลี่ยนเป็นข้อความของ Template ที่เลือก

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-009
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้าต่าง Nurse Note Template - Assessment (ตาม TC-006)
2. กด "General Assessment" ในรายการ ชื่อ Template

## Expected Result
แถว "General Assessment" ถูกไฮไลต์ · ส่วน Template ด้านขวาเปลี่ยนเป็นข้อความของ General Assessment (Focus/problem: · Subjective (S): · Objective (O): V/S …, Pain …, Others)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-010 - กดใช้ข้อความนี้แล้วข้อความ Template เข้าช่อง Assessment และหน้าต่าง Template ปิด

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-010
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้าต่าง Nurse Note (ช่อง A / I / E ว่าง) > ไอคอน Template ช่อง Assessment
2. เลือก "QA-2629 Assessment" > กด "ใช้ข้อความนี้"

## Expected Result
หน้าต่าง Template ปิดเอง · ช่อง Assessment (A) แสดงข้อความ "Focus/problem: QA-A" ทันทีโดยไม่ต้องคัดลอกวาง · ช่อง Intervention และ Evaluation ยังว่าง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-011 - กดใช้ข้อความนี้แล้วข้อความ Template เข้าช่อง Intervention และหน้าต่าง Template ปิด

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-011
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้าต่าง Nurse Note (ช่อง A / I / E ว่าง) > ไอคอน Template ช่อง Intervention
2. เลือก "QA-2629 Intervention" > กด "ใช้ข้อความนี้"

## Expected Result
หน้าต่าง Template ปิดเอง · ช่อง Intervention (I) แสดงข้อความ "Intervention: QA-I" · ช่อง Assessment และ Evaluation ยังว่าง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-012 - กดใช้ข้อความนี้แล้วข้อความ Template เข้าช่อง Evaluation และหน้าต่าง Template ปิด

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-012
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้าต่าง Nurse Note (ช่อง A / I / E ว่าง) > ไอคอน Template ช่อง Evaluation
2. เลือก "QA-2629 Evaluation" > กด "ใช้ข้อความนี้"

## Expected Result
หน้าต่าง Template ปิดเอง · ช่อง Evaluation (E) แสดงข้อความ "Evaluation: QA-E" · ช่อง Assessment และ Intervention ยังว่าง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-013 - แทรกข้อความ Template ที่ตำแหน่ง cursor โดยไม่ลบข้อความเดิมในช่อง

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-013
Case Type: Happy
Test Type: Functional

## Test Step
1. หน้าต่าง Nurse Note > พิมพ์ "AAA BBB" ในช่อง Intervention > วาง cursor หลัง "AAA"
2. ไอคอน Template ช่อง Intervention > เลือก "QA-2629 Intervention" > กด "ใช้ข้อความนี้"

## Expected Result
ข้อความเดิม "AAA" และ "BBB" ยังอยู่ครบ · "Intervention: QA-I" ถูกแทรกตรงตำแหน่ง cursor ต่อในบรรทัดเดียวกัน → ช่อง Intervention เป็น "AAAIntervention: QA-I BBB"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-014 - ค้นหา Template ด้วยชื่อในหน้าต่าง Nurse Note Template

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-014
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้าต่าง Nurse Note Template - Assessment (มี Template ≥ 2 รายการ)
2. พิมพ์ "QA-2629" ในช่อง ค้นหาชื่อหรือข้อความ Template

## Expected Result
รายการ ชื่อ Template เหลือเฉพาะ "QA-2629 Assessment" และพรีวิวแสดงข้อความของรายการนั้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-015 - ค้นหา Template ด้วยข้อความในเนื้อหา Template

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-015
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้าต่าง Nurse Note Template - Assessment
2. พิมพ์ "QA-A" (คำที่อยู่ในเนื้อหา ไม่อยู่ในชื่อ) ในช่องค้นหา

## Expected Result
รายการแสดง "QA-2629 Assessment" · ไม่แสดง Template ที่เนื้อหาไม่มีคำนี้ (General Assessment)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-016 - กดล้างค่ากรองแล้วรายการ Template กลับมาครบ

Status: Not Run · Priority: Low · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-016
Case Type: Happy
Test Type: Functional

## Test Step
1. ทำต่อจาก TC-014 (รายการถูกกรองอยู่)
2. กด "ล้างค่ากรอง"

## Expected Result
ช่องค้นหาว่าง · รายการ ชื่อ Template กลับมาแสดง Template ของหมวด Assessment ครบทุกรายการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-017 - บันทึก Nurse Note ที่ใช้ข้อความจาก Template แล้ว A-I-E ของ Focus แสดงข้อความตรงกับที่บันทึก

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-017
Case Type: Happy
Test Type: Functional

## Test Step
1. หน้าต่าง Nurse Note > กรอก Focus "QA-2629 Template Focus" > ใช้ข้อความ Template ทั้ง 3 ช่อง (ตาม TC-010 ถึง 012)
2. ใส่ Perform time ทั้ง 3 ช่อง (ปุ่ม ตอนนี้) > กด บันทึก
3. กดหัวการ์ด Focus เพื่อกาง A-I-E

## Expected Result
แจ้งเตือน "บันทึกข้อมูลสำเร็จ" หน้าต่างปิด · การ์ด Focus แสดง A "Focus/problem: QA-A" · I "Intervention: QA-I" · E "Evaluation: QA-E" ตรงกับข้อความ Template

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-018 - แก้ไขข้อความ Nurse Note Template แล้วหน้าต่าง Template แสดงข้อความใหม่

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-018
Case Type: Happy
Test Type: Functional

## Test Step
1. หน้าตั้งค่า > แท็บ Nurse Note Template > Assessment > กดแก้ไข "QA-2629 Assessment" > เพิ่มบรรทัด "EDITED QA" > บันทึก
2. หน้าต่าง Nurse Note > ไอคอน Template ช่อง Assessment > เลือก "QA-2629 Assessment"

## Expected Result
พรีวิวแสดงข้อความที่แก้ล่าสุด มีบรรทัด "EDITED QA"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-019 - ตรวจสอบ Nurse Note Template ไม่แสดงในรายการแท็บ Note Template

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-019
Case Type: Happy
Test Type: Functional

## Test Step
1. หน้าตั้งค่า > แท็บ Note Template
2. ค้นหา "QA-2629" และ "General"

## Expected Result
ตารางแสดง "ไม่มีข้อมูล" ทั้ง 2 คำค้น — ไม่มี Nurse Note Template อยู่ในแท็บ Note Template

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-020 - ตรวจสอบ Note Template ของแพทย์ไม่แสดงในหน้าต่าง Nurse Note Template แม้ติด label nurse-note

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-020
Case Type: Happy
Test Type: Functional

## Test Step
1. หน้าตั้งค่า > แท็บ Note Template > จดชื่อ Template ที่ติด label nurse-note (Dev-X: "nurse note")
2. หน้าต่าง Nurse Note > เปิดไอคอน Template ของช่อง A / I / E ทีละช่อง > ค้นหาชื่อนั้น

## Expected Result
ทั้ง 3 ช่องแสดง "ไม่มี Template" — Note Template ของแพทย์ไม่ปนในหน้าต่าง Nurse Note Template

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-021 - ตรวจสอบ Nurse Note Template ไม่แสดงในหน้าต่าง Note Template ของ ER Physician Note

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-021
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดผู้ป่วยที่มี Visit ER > เมนูขวา ER Physician Note > ER Physician Note
2. กดไอคอน Note Template > ค้นหา "QA-2629" และ "General"

## Expected Result
หน้าต่าง Note Template (ปุ่ม คัดลอกข้อความ) แสดง "ไม่มี Template" ทั้ง 2 คำค้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-022 - ตรวจสอบ Nurse Note ที่บันทึกแล้วไม่เปลี่ยนตามเมื่อแก้ไข Nurse Note Template

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-022
Case Type: Happy
Test Type: Functional

## Test Step
1. มี Focus ที่บันทึกด้วยข้อความ Template แล้ว (จาก TC-017)
2. แก้ไขข้อความ "QA-2629 Assessment" ในหน้าตั้งค่า (ตาม TC-018)
3. กลับมาหน้า Nurse Focus Note > กางการ์ด Focus "QA-2629 Template Focus"

## Expected Result
A ของ Focus ยังเป็นข้อความเดิมตอนบันทึก "Focus/problem: QA-A" · ไม่มีบรรทัดที่แก้ใน Template

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2629-UHP - ยกเลิก ค้นหาไม่พบ หรือกรอกฟอร์ม Template ไม่ครบ

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Focus Note + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2629-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER / Nurse Focus Note
- Requirement ที่อ้างอิง: SBH-2629 — [ER] [ Nurse Focus Note ] เพิ่ม Feature Note template

วัตถุประสงค์
- ตรวจว่าปิดหน้าต่าง Template โดยไม่เลือก / ค้นหาไม่พบ ไม่กระทบข้อความในช่อง และฟอร์มสร้าง Template บังคับข้อมูลที่จำเป็น

ขอบเขต Requirement
- AC 1, 1.1 (หน้าต่าง Template ตามตัวอย่าง ER Physician note · หน้าตั้งค่า Nurse Note Template)

ความเสี่ยง
- ข้อความ Template เข้าช่องทั้งที่ผู้ใช้ไม่ได้กดใช้ · บันทึก Template ว่างแล้วพยาบาลเลือกได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2629-023 - ปิดหน้าต่าง Nurse Note Template โดยไม่กดใช้ข้อความนี้ แล้วข้อความในช่องไม่เปลี่ยน

Status: Not Run · Priority: Medium · Labels: … + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-023
Case Type: Unhappy
Test Type: Functional

## Test Step
1. หน้าต่าง Nurse Note > พิมพ์ "พิมพ์เอง QA" ในช่อง Assessment
2. ไอคอน Template ช่อง Assessment > เลือก "QA-2629 Assessment" > กด "ปิด"

## Expected Result
หน้าต่าง Template ปิด · ช่อง Assessment ยังเป็น "พิมพ์เอง QA" ไม่มีข้อความ Template เพิ่ม · หน้าต่าง Nurse Note ยังเปิดอยู่

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-024 - ค้นหาคำที่ไม่มีใน Template แล้วแสดงไม่มี Template และกดใช้ข้อความนี้ไม่ได้

Status: Not Run · Priority: Low · Labels: … + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-024
Case Type: Unhappy
Test Type: Functional

## Test Step
1. เปิดหน้าต่าง Nurse Note Template - Assessment
2. พิมพ์ "zzqa2629none" ในช่องค้นหา

## Expected Result
รายการ ชื่อ Template แสดง "ไม่มี Template" · พรีวิวแสดง "-" · ปุ่ม "ใช้ข้อความนี้" กดไม่ได้ (disabled)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-025 - บันทึก Nurse Note Template โดยไม่กรอกชื่อ แล้วแสดงโปรดระบุ

Status: Not Run · Priority: Medium · Labels: … + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-025
Case Type: Unhappy
Test Type: Functional

## Test Step
1. แท็บ Nurse Note Template > Intervention > "+ เพิ่ม Note Template"
2. กรอก Template "QA ไม่มีชื่อ" · Labels "nurse-note" · เว้นช่องชื่อ > บันทึก

## Expected Result
ใต้ช่องชื่อขึ้น "โปรดระบุ" · ไม่บันทึก ยังอยู่หน้าเพิ่ม Note Template

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-026 - บันทึก Nurse Note Template โดยไม่กรอกข้อความ Template แล้วแสดงโปรดระบุ

Status: Not Run · Priority: Medium · Labels: … + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-026
Case Type: Unhappy
Test Type: Functional

## Test Step
1. แท็บ Nurse Note Template > Intervention > "+ เพิ่ม Note Template"
2. กรอกชื่อ "QA-2629 NoText" · Labels "nurse-note" · เว้นช่อง Template > บันทึก

## Expected Result
ใต้ช่อง Template ขึ้น "โปรดระบุ" · ไม่บันทึก ยังอยู่หน้าเพิ่ม Note Template

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-027 - บันทึก Nurse Note Template โดยไม่เลือก Labels แล้วแสดงโปรดระบุ

Status: Not Run · Priority: Medium · Labels: … + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-027
Case Type: Unhappy
Test Type: Functional

## Test Step
1. แท็บ Nurse Note Template > Intervention > "+ เพิ่ม Note Template"
2. กรอกชื่อ "QA-2629 NoLabel" · Template "QA ไม่มี label" · ไม่เลือก Labels > บันทึก

## Expected Result
ใต้ช่อง Labels ขึ้น "โปรดระบุ" · ไม่บันทึก ยังอยู่หน้าเพิ่ม Note Template

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2629-EDG - Template ที่ปิดใช้งาน และทางเข้าหน้าต่าง Nurse Note อื่น

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Focus Note + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2629-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / Nurse Focus Note
- Requirement ที่อ้างอิง: SBH-2629 — [ER] [ Nurse Focus Note ] เพิ่ม Feature Note template

วัตถุประสงค์
- ตรวจว่า Template ที่ปิดใช้งานไม่ให้เลือก และหน้าต่าง Nurse Note ที่เปิดจากเมนูเพิ่มข้อมูล AIE / Edit note ใช้ Template ได้เหมือนกัน

ขอบเขต Requirement
- AC 1 + คอมเมนต์ (เมนูด้านขวาของแต่ละ Input)

ความเสี่ยง
- พยาบาลเลือก Template ที่ผู้ดูแลปิดไปแล้ว · หน้าต่าง Nurse Note อีก flow ไม่มีไอคอน Template

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2629-028 - ตรวจสอบ Nurse Note Template ที่ปิดใช้งานไม่แสดงในหน้าต่าง Template

Status: Not Run · Priority: Medium · Labels: … + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-028
Case Type: Edge
Test Type: Functional

## Test Step
1. แท็บ Nurse Note Template > Assessment > สร้าง "QA-2629 Inactive A" โดยปิดสวิตช์ Active > บันทึก (สถานะในตาราง "ปิดใช้งาน")
2. หน้าต่าง Nurse Note > ไอคอน Template ช่อง Assessment > ค้นหา "Inactive"

## Expected Result
ไม่มี "QA-2629 Inactive A" ในรายการ · ค้นหาแล้วแสดง "ไม่มี Template"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-029 - ใช้ข้อความ Template ในหน้าต่างเพิ่มข้อมูล AIE ของ Focus ที่บันทึกแล้ว

Status: Not Run · Priority: Medium · Labels: … + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-029
Case Type: Edge
Test Type: Functional

## Test Step
1. การ์ด Focus ที่บันทึกแล้ว (จาก TC-017) > ไอคอน more > เพิ่มข้อมูล AIE
2. ไอคอน Template ช่อง Assessment > เลือก "QA-2629 Assessment" > กด "ใช้ข้อความนี้"

## Expected Result
หน้าต่างเพิ่มข้อมูล AIE มีไอคอน Template ครบ 3 ช่อง · ช่อง Assessment แสดงข้อความของ "QA-2629 Assessment"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2629-030 - ใช้ข้อความ Template ในหน้าต่าง Edit note ของ Focus ที่บันทึกแล้ว

Status: Not Run · Priority: Medium · Labels: … + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2629-030
Case Type: Edge
Test Type: Functional

## Test Step
1. กางการ์ด Focus ที่บันทึกแล้ว > กด Edit note
2. วาง cursor ท้ายช่อง Evaluation > ไอคอน Template ช่อง Evaluation > เลือก "QA-2629 Evaluation" > กด "ใช้ข้อความนี้"

## Expected Result
หน้าต่าง Edit note มีไอคอน Template ครบ 3 ช่อง · ข้อความ "Evaluation: QA-E" ถูกแทรกต่อท้ายข้อความเดิมของช่อง Evaluation ในบรรทัดเดียวกัน (ข้อความเดิมไม่หาย)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## Requirement gap (ยังไม่สร้าง TC — รอคำตอบ)

ข้อที่ได้คำตอบจากการสำรวจแล้ว (เดิมเป็น gap ในร่าง v1): ใช้ข้อความนี้ตอนช่องมีข้อความ = แทรกที่ cursor (TC-013) · หน้าต่างปิดเองหลังใช้ (TC-010) · ความหมาย AC 1.1.1 ตรงทั้ง 2 แบบ (TC-019 ถึง 022) · Edit note มีไอคอน (TC-030) · Template ปิดใช้งานไม่แสดง (TC-028) · เส้นทางหน้าตั้งค่า (TC-001)

ที่ยังเหลือ
1. Type **Personal / Clinic** — Template ส่วนบุคคล / ของคลินิก แสดงให้ใครเห็นในหน้าต่าง Template (ต้องใช้ 2 user ทดสอบ · Doctor ไม่มีสิทธิ์ `focus-note:write`)
2. role ไหนเข้าหน้าตั้งค่า Nurse Note Template ได้ (สิทธิ์ `menu:setting:note-template`) · Nurse ทั่วไปควรสร้าง Template ได้ไหม
3. ลบ Template (ไอคอนถังขยะในตาราง) แล้วหายจากหน้าต่าง Template — การ์ดไม่ได้พูดถึง
4. IPD Nursing Records ใช้ Nurse Focus Note ตัวเดียวกัน — การ์ดขึ้นต้น [ER] · ต้องเทส IPD ด้วยไหม
5. หน้าต่าง Template แบ่งหน้า 10 รายการ — ต้องเทสกรณีเกิน 10 ไหม
6. SBH Prod: สร้าง Template ทดสอบ "QA-2629 …" บน Prod ได้ไหม (ต้องลบหลังเทส) หรือใช้ Template ที่มีอยู่แล้ว
