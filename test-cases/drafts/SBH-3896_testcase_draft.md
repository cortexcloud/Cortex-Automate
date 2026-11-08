# Draft Test Structure — SBH-3896

> สถานะ: **สร้างใน Linear แล้ว 8 พ.ย. 2026** — ผู้ใช้พิมพ์ "สร้างได้" · EXE `SBH-3952` · HPY `SBH-3953` (TC 001–006) · connector เป็นบัญชี Pearsu (ผู้ใช้เลือก "สร้างเลย assign ผม") · assignee Suchat ทุกใบ
> - เลข TC → SBH: 001=3954 · 002=3955 · 003=3956 · 004=3957 · 005=3958 · 006=3959
> - ชุดนี้ = EXE 1 + Scenario 1 (HPY) + TC 6 = 8 ใบ
> - ผู้ใช้สั่ง "เอาแค่ตาม AC พอ" → มีเฉพาะ TC ของ AC 1 / 2.1 / 2.2 ไม่มี Edge / Unhappy
> - การ์ดไม่มี Sub-Issue / คอมเมนต์ / Relation
> - ชื่อโซนของ Dev-X ไม่ได้เขียนในการ์ด → ใช้ความรู้หน้าจอของโปรเจกต์ (`screens/er.md`: dev-x 31 ต.ค. / 3–4 พ.ย. 2026)
>   - ฟอร์มคัดกรองรายเดียว: Resuscitation / Urgency / Isolation 1 / Isolation 2 / Observation (ปุ่มมี "ใช้ n" ต่อท้าย)
>   - หน้า Mass Casualty: Resuscitation / Urgency / Observation (ซ่อน Isolation 1 / 2 ตามการ์ด SBH-3609)
> - บันทึกเดิม `screens/sbh-prod.md`: 5 พ.ย. 2026 บ่าย โซน ER ของ SBH Prod เปลี่ยนเป็นชุดเดียวกับ dev-x แล้ว (การ์ดสร้าง 5 พ.ย. 14:28 ก่อนเปลี่ยน)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ค่าที่เสนอ (รอยืนยัน): Run Type CT · Version 2.10.0 · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature ตาม TC (ดูตาราง AC → TC)

Requirement: SBH-3896 — [Bug][ER] ER Form + ชื่อ Zone
URL: https://linear.app/cortexcloud/issue/SBH-3896/buger-er-form-ชอ-zone
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: Urgent · State: Ready for Testing
Labels: VERSION 2.10.0 · Natthaphat ( MOD ) 🙈 · 🍄 Improvement · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Relations: ไม่มี · Sub-Issue: ไม่มี
Scope / Version = 2.10.0

AC ในการ์ด
1. เอากรอบ Diagnosis ข้างนอก ออกจาก ER Form (รูป 1: ER Physician Note ส่วน "Diagnosis general" มีกล่อง "Diagnosis" ครอบรายการอีกชั้น)
2. ปรับชื่อ Zone ให้เหมือน Dev-x
   1. Triage (รูป 2: ฟอร์มคัดกรอง ER ปุ่มโซน "โซนแดง ER / โซนเหลือง ER / โซนเขียว ER / ห้องสังเกตอาการ ER" + "แนะนำ: โซนเหลือง ER")
   2. MC (รูป 3: Mass Casualty แถบ "ส่งเข้าโซน" · ป้ายโซนในแถวผู้ป่วย · ปุ่มโซนในฟอร์มขวา)

## AC → TC

| AC | เรื่อง | TC | QA Sub-module / Feature |
|---|---|---|---|
| 1 | ER Physician Note ไม่มีกรอบ Diagnosis ซ้อน | 001 | ER Physician Note |
| 2.1 | ชื่อปุ่มโซนในฟอร์มคัดกรอง ER | 002 | Triage Form |
| 2.1 | ชื่อโซนที่แนะนำในฟอร์มคัดกรอง ER | 003 | Triage Form |
| 2.2 | ชื่อปุ่มในแถบ "ส่งเข้าโซน" ของ MC | 004 | Mass Casualty Triage |
| 2.2 | ชื่อปุ่มโซนในฟอร์มผู้ป่วยของ MC | 005 | Mass Casualty Triage |
| 2.2 | ชื่อโซนบนป้ายในแถวผู้ป่วยของ MC | 006 | Mass Casualty Triage |

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | ตรวจสอบส่วน Diagnosis general ของ ER Physician Note ไม่มีกรอบ Diagnosis ซ้อน | รายการ Diagnosis อยู่ใต้หัว "Diagnosis general" โดยตรง · ไม่มีกล่อง "Diagnosis" ครอบอีกชั้น · ช่องในแถว / ปุ่มลบ / "+ เพิ่มรายการ" ยังแสดงครบ |
| 002 | HPY | แสดงชื่อปุ่มโซนในฟอร์มคัดกรอง ER ตรงกับ Dev-X | ปุ่มโซน = Resuscitation · Urgency · Isolation 1 · Isolation 2 · Observation · ไม่มีชื่อ "โซนแดง ER / โซนเหลือง ER / โซนเขียว ER / ห้องสังเกตอาการ ER" |
| 003 | HPY | แสดงชื่อโซนที่แนะนำในฟอร์มคัดกรอง ER ตรงกับ Dev-X เมื่อเลือกระดับความเร่งด่วน 4 | ปุ่ม "Urgency" มีป้าย "แนะนำ" · ข้อความใต้ปุ่มเป็น "แนะนำ: Urgency" |
| 004 | HPY | แสดงชื่อปุ่มในแถบ "ส่งเข้าโซน" ของหน้า Mass Casualty ตรงกับ Dev-X | ปุ่ม = Resuscitation · Urgency · Observation · ไม่มีชื่อ "โซนแดง ER / โซนเหลือง ER / ห้องสังเกตอาการ ER" |
| 005 | HPY | แสดงชื่อปุ่มโซนในฟอร์มผู้ป่วยของหน้า Mass Casualty ตรงกับ Dev-X | ปุ่มโซน = Resuscitation · Urgency · Observation · ไม่มีชื่อ "โซนแดง ER / โซนเหลือง ER / ห้องสังเกตอาการ ER" |
| 006 | HPY | แสดงชื่อโซนบนป้ายในแถวผู้ป่วยของหน้า Mass Casualty ตรงกับ Dev-X | ป้ายโซนในแถวผู้ป่วยเป็น "Urgency" (ไม่ใช่ "โซนเหลือง ER") |

## Requirement gap (ไม่ทำเป็น TC — รอผู้ใช้ / BA ตัดสิน)

**expected behavior**
- AC 1 "กรอบ Diagnosis ข้างนอก" = กล่องหัว "Diagnosis" ที่ครอบรายการใต้ "Diagnosis general" (ตามรูป) — **ขอยืนยัน** ว่าไม่ใช่ตัวหัว "Diagnosis general"
- AC 1 เขียนว่า "ER Form" แต่รูปเป็น ER Physician Note — ฟอร์มแพทย์โหมด Trauma (มี Diagnosis general เหมือนกัน) / ฟอร์ม ER อื่นที่มี Diagnosis ต้องเอากรอบออกด้วยไหม
- AC 2 ไม่ได้ระบุชื่อโซนเป้าหมาย — TC ยึดชื่อบน Dev-X ตามที่โปรเจกต์เคยสำรวจ (ดูหัวไฟล์)
- AC 2 ระบุแค่ Triage / MC — ที่อื่นที่แสดงชื่อโซน (ER Dashboard · Patient list · จอ TV · ประวัติการคัดกรอง "โซน :") ไม่อยู่ใน scope

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user แพทย์ ER** (001) · **user พยาบาล ER** (002–006)
- **ผู้ป่วย ER A** คัดกรองแล้ว Visit Active — 001
- **ผู้ป่วย ER B** เปิด Visit ER แล้ว ยังไม่คัดกรอง — 002–003 (ไม่ต้องกดบันทึกฟอร์มคัดกรอง)
- **เหตุการณ์ MC** สร้างใหม่ จำนวนผู้ป่วย 2 ราย (สถานะ DRAFT) — 004–006 (ไม่ต้องส่ง Triage ทั้งเหตุการณ์ · ล้างด้วยการลบ member / ยกเลิกเหตุการณ์หลังเทส)
- dev-x ใช้ร่วมกัน: ใช้ผู้ป่วย AUTO ที่สร้างเพื่อเทสเท่านั้น · SBH Prod ใช้ผู้ป่วยทดสอบตามที่ผู้ใช้กำหนด

---

## EXE - CT - 2.10.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: VERSION 2.10.0, Natthaphat ( MOD ) 🙈, 🍄 Improvement, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Triage Form, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.10.0
- Module: ER — ER Physician Note / คัดกรอง ER / Mass Casualty
- Requirement ที่อ้างอิง: SBH-3896 — [Bug][ER] ER Form + ชื่อ Zone
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ER Physician Note ส่วน Diagnosis general ไม่มีกรอบ Diagnosis ซ้อน
- ชื่อโซนในฟอร์มคัดกรอง ER ตรงกับ Dev-X
- ชื่อโซนในหน้า Mass Casualty ตรงกับ Dev-X

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- นอก scope: ชื่อโซนที่ ER Dashboard / Patient list / จอ TV / ประวัติการคัดกรอง (การ์ดไม่ระบุ — ดู Requirement gap)
```

---

## TS-SBH-3896-HPY - แสดง ER Physician Note ไม่มีกรอบ Diagnosis ซ้อน และชื่อโซนในคัดกรอง ER / Mass Casualty ตรงกับ Dev-X

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3896-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER — ER Physician Note / คัดกรอง ER / Mass Casualty
- Requirement ที่อ้างอิง: SBH-3896 — [Bug][ER] ER Form + ชื่อ Zone

วัตถุประสงค์
- ยืนยันว่ากรอบ Diagnosis ชั้นนอกถูกเอาออกจาก ER Physician Note และชื่อโซนในฟอร์มคัดกรอง ER / หน้า Mass Casualty ตรงกับ Dev-X

ขอบเขต Requirement
- AC 1 เอากรอบ Diagnosis ข้างนอก ออกจาก ER Form
- AC 2.1 ปรับชื่อ Zone ให้เหมือน Dev-x — Triage
- AC 2.2 ปรับชื่อ Zone ให้เหมือน Dev-x — MC

ความเสี่ยง
- ชื่อโซนต่างกันระหว่างหน้าจอ / ระหว่าง site ทำให้พยาบาลส่งผู้ป่วยผิดโซน
- เอากรอบออกแล้วช่องในรายการ Diagnosis หาย ทำให้บันทึก Physician Note ไม่ได้ (Diagnosis general เป็นช่องบังคับ)

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ชื่อโซนของ Dev-X มาจากการสำรวจของโปรเจกต์ (dev-x 3–4 พ.ย. 2026) เพราะการ์ดไม่ระบุ
- ผู้ป่วยที่ใช้ดูหัวข้อ "ข้อมูลตั้งต้น" ในไฟล์ร่าง
```

### TC-SBH-3896-001 - ตรวจสอบส่วน Diagnosis general ของ ER Physician Note ไม่มีกรอบ Diagnosis ซ้อน

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : ER Physician Note + QA Case : Happy + QA Type : UIUX + QA Execution Type : Manual

```
TC ID: TC-SBH-3896-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > เมนู ห้องฉุกเฉิน
2. กด Patient Card ของผู้ป่วย ER A > หน้าผู้ป่วย ER
3. เปิดฟอร์ม ER Physician Note
4. ดูส่วน "Diagnosis general"

## Expected Result
รายการ Diagnosis อยู่ใต้หัว "Diagnosis general" โดยตรง ไม่มีกล่อง "Diagnosis" ครอบอีกชั้น · ช่องในแถว (ประเภท / Diagnosis / Category / Status / Severity) ปุ่มลบ และ "+ เพิ่มรายการ" ยังแสดงครบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 · เทียบกับรูป 1 ในการ์ด
```

### TC-SBH-3896-002 - แสดงชื่อปุ่มโซนในฟอร์มคัดกรอง ER ตรงกับ Dev-X

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Happy + QA Type : UIUX + QA Execution Type : Manual

```
TC ID: TC-SBH-3896-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน
2. กด Patient Card ของผู้ป่วย ER B (ยังไม่คัดกรอง) > แท็บ "คัดกรอง ER"
3. เลื่อนลงไปส่วน "โซน" ใต้ระดับความเร่งด่วน

## Expected Result
ปุ่มโซน = Resuscitation · Urgency · Isolation 1 · Isolation 2 · Observation (มีจำนวน "ใช้ n" ต่อท้าย) · ไม่มีชื่อ "โซนแดง ER / โซนเหลือง ER / โซนเขียว ER / ห้องสังเกตอาการ ER"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.1 · ชื่อโซนอ้างอิง Dev-X (ฟอร์มคัดกรองรายเดียวแสดงครบ 5 โซน)
```

### TC-SBH-3896-003 - แสดงชื่อโซนที่แนะนำในฟอร์มคัดกรอง ER ตรงกับ Dev-X เมื่อเลือกระดับความเร่งด่วน 4

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Triage Form + QA Case : Happy + QA Type : UIUX + QA Execution Type : Manual

```
TC ID: TC-SBH-3896-003
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน
2. กด Patient Card ของผู้ป่วย ER B (ยังไม่คัดกรอง) > แท็บ "คัดกรอง ER"
3. ส่วน "ระดับความเร่งด่วน" เลือก 4 กึ่งเร่งด่วน
4. ดูส่วน "โซน"

## Expected Result
ปุ่ม "Urgency" มีป้าย "แนะนำ" · ข้อความใต้ปุ่มโซนเป็น "แนะนำ: Urgency" (ไม่ใช่ "โซนเหลือง ER")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.1 · เทียบกับรูป 2 ในการ์ด (ESI 4 → โซนแนะนำเดิม "โซนเหลือง ER")
```

### TC-SBH-3896-004 - แสดงชื่อปุ่มในแถบ "ส่งเข้าโซน" ของหน้า Mass Casualty ตรงกับ Dev-X

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Happy + QA Type : UIUX + QA Execution Type : Manual

```
TC ID: TC-SBH-3896-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > คัดกรอง > แท็บ "ผู้ป่วยหลายคน"
2. สร้างเหตุการณ์ใหม่ จำนวนผู้ป่วย 2 ราย > เข้าหน้าเหตุการณ์
3. ดูแถบ "ส่งเข้าโซน" ใต้ "เลือกทั้งหมด"

## Expected Result
ปุ่มในแถบ "ส่งเข้าโซน" = Resuscitation · Urgency · Observation · ไม่มีชื่อ "โซนแดง ER / โซนเหลือง ER / ห้องสังเกตอาการ ER"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.2 · หน้า MC ซ่อน Isolation 1 / 2 ตามการ์ด `SBH-3609`
```

### TC-SBH-3896-005 - แสดงชื่อปุ่มโซนในฟอร์มผู้ป่วยของหน้า Mass Casualty ตรงกับ Dev-X

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Happy + QA Type : UIUX + QA Execution Type : Manual

```
TC ID: TC-SBH-3896-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > คัดกรอง > แท็บ "ผู้ป่วยหลายคน"
2. เปิดเหตุการณ์จาก TC-SBH-3896-004 (ปุ่ม "ทำต่อ")
3. กดแถวผู้ป่วยรายที่ 01 > ฟอร์มผู้ป่วยด้านขวา
4. ดูส่วน "โซน" ใต้ระดับความเร่งด่วน

## Expected Result
ปุ่มโซน = Resuscitation · Urgency · Observation · ไม่มีชื่อ "โซนแดง ER / โซนเหลือง ER / ห้องสังเกตอาการ ER"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.2 · หน้า MC ซ่อน Isolation 1 / 2 ตามการ์ด `SBH-3609`
```

### TC-SBH-3896-006 - แสดงชื่อโซนบนป้ายในแถวผู้ป่วยของหน้า Mass Casualty ตรงกับ Dev-X

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Happy + QA Type : UIUX + QA Execution Type : Manual

```
TC ID: TC-SBH-3896-006
Case Type: Happy
Test Type: UIUX

## Test Step
1. ทำต่อจาก TC-SBH-3896-005 (ฟอร์มผู้ป่วยรายที่ 01 เปิดอยู่)
2. ส่วน "ระดับความเร่งด่วน" เลือก 4 กึ่งเร่งด่วน
3. ดูป้ายโซนในแถวผู้ป่วยรายที่ 01 ด้านซ้าย

## Expected Result
ป้ายโซนในแถวผู้ป่วยรายที่ 01 เป็น "Urgency" (ไม่ใช่ "โซนเหลือง ER")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.2 · เทียบกับรูป 3 ในการ์ด (ป้าย "โซนเหลือง ER" ในแถว DRAFT)
```
