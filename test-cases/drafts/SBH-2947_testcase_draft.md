# Draft Test Structure — SBH-2947

> สถานะ: **สร้างใน Linear แล้ว (2026-10-31)** — ผู้ใช้พิมพ์ "สร้างได้"
> - EXE SBH-3363 (EXE - CT - 2.9.1) → TS-HPY SBH-3364 (TC 001–021 = SBH-3366–3386) · TS-EDG SBH-3365 (TC 022–026 = SBH-3387–3391)
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee + "สร้างโดย" = Suchat (connector เชื่อมบัญชี Suchat ใหม่ก่อนสร้าง) · milestone ER - เก็บตก, edge case · TC ใช้ label `QA : Manual`
> - เทคนิค ISTQB ใส่เป็นบรรทัด "เทคนิค: …" ใต้ Test Type ใน TC 020–022 · 024–026
> - ผู้ใช้ยืนยัน (31 ต.ค.): Bubble แดง AC 5.1 อยู่ที่เมนู รายการงานพยาบาล ตามรูป AC → TC 017 / 022
> - ชุดนี้ = EXE 1 + Scenario 2 (HPY / EDG) + TC 26 = 29 ใบ
> - scope ตาม AC 7 ข้อของการ์ดเท่านั้น · เรื่องที่การ์ดไม่ตอบอยู่ในหัวข้อ "Requirement gap" ท้ายไฟล์
> - ใช้ค่าตามชุดก่อนหน้า (รอผู้ใช้ยืนยัน): Run Type CT (การ์ดผูก Cycle) · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Nurse Task List (label มีอยู่แล้วจาก SBH-2618)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972 · TC ใช้ label `QA : Manual`
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — assignee ต้องใส่ ID ของ Suchat (`ac7ed47a-b74d-4a54-992f-5d09acad47f2`)
> - ⚠️ Version: label การ์ด = VERSION 2.9.1 แต่ PR ทั้ง 3 ขึ้นต้น V2.10.0 → ร่างใช้ 2.9.1 ตามลำดับ resolve (version ที่ระบุในการ์ดมาก่อน) รอผู้ใช้ยืนยัน

Requirement: SBH-2947 — [ER][In ER Zone][ Improve ] Nurse Tasks List
URL: https://linear.app/cortexcloud/issue/SBH-2947/erin-er-zone-improve-nurse-tasks-list
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: Urgent · Estimate: 2 Points · State: Ready for Testing
Labels: Natthaphat ( MOD ) 🙈 · 🍄 Improvement · VERSION 2.9.1 · Assignee: Thanadon (Modern) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Sub-Issue: ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี
Relations (related): SBH-1980 · CTXN-2378 · SBH-2024 · SBH-1038 · SBH-2005
PR ที่แนบ: cortex-api #2962 "decode nurse note task identifiers" · cortex-ui #2560 "improve ER nurse task list zones, MC tag and pending badge" · cortex-api #2956 "rank and filter the ER nurse task roster, mark mass casualty patients"
หน้าจอ: ห้องฉุกเฉิน > รายการงานพยาบาล (`/cortex/er/nurse-task-list`) · การ์ดที่เกี่ยวข้อง: SBH-2618 (Redesign — กฎ "แสดงเฉพาะผู้ป่วยที่มี order" ยังใช้อยู่)

## AC → TC

| AC | Expected | TC |
|---|---|---|
| 1 | เพิ่ม Nurse Note → เปิดมาสำเร็จ | 001 |
| 2.1 | ไม่แสดงผู้ป่วยที่อยู่ Zone คัดกรอง | 002 |
| 2.2.1 | ไม่แสดงผู้ป่วยรับเป็นผู้ป่วยใน (Disposition Save + AN + Ward / เตียง) | 003 |
| 2.2.2 | ไม่แสดงผู้ป่วยรอจำหน่าย (Disposition Save + ลงนาม) | 004 |
| 2.2.3 | ไม่แสดงผู้ป่วยที่กดจำหน่ายแล้ว | 005 |
| 2.2.4 | ไม่แสดงผู้ป่วยที่ปิด Visit ที่การเงินแล้ว | 006 |
| 2.2.5 | ไม่แสดงผู้ป่วยที่ cancel Encounter | 007 |
| 3.1 / 3.2 / 3.4 | ชื่อ Zone → Resuscitation / Urgency / Observation | 008 · 009 · 012 |
| 3.3 | โซนเขียว → Isolation 1 / Isolation 2 ตามที่เลือก | 010 · 011 |
| 4 | สี Header Zone แดง / เหลือง / เขียว / ฟ้า | 013 · 014 · 015 · 016 |
| 5.1 | มี Order ที่ยังไม่รับ → Bubble แดง | 017 · 022 |
| 5.2 | ผู้ป่วย Mass Casualty → แสดง MC | 018 · 023 |
| 6 | ปุ่ม รับงาน → รับ Order | 019 |
| 7.b | Fast Track อยู่บนสุด · มากกว่า 1 ราย เรียง FIFO | 020 · 024 |
| 7.c | ESI น้อย → มาก · ESI เท่ากัน → MEWS มาก → น้อย · MEWS เท่ากัน → FIFO | 021 · 025 · 026 |
| 7.a | Check Step < Dynamic > | — (ไม่มีรายละเอียดที่ตรวจได้ → gap) |

> เทคนิค: AC 2 ใช้ State Transition — ผู้ป่วยที่เคยแสดงอยู่ เปลี่ยนสถานะ Visit ทีละเส้นแล้วต้องหายจากรายการ (1 สถานะ = 1 TC) ·
> AC 7 ใช้ Decision Table ตามลำดับเงื่อนไขในการ์ด (Fast Track → ESI → MEWS → FIFO) — 1 เงื่อนไขที่ตัดสินลำดับ = 1 TC ·
> AC 5 ตรวจทั้งกรณีเข้าเงื่อนไข (แสดง) และไม่เข้าเงื่อนไข (ไม่แสดง)

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | ทดสอบเพิ่ม Nurse Note จากรายการงานพยาบาล | ฟอร์ม Nurse Note เปิดขึ้นสำเร็จ ไม่มีข้อความ error |
| 002 | HPY | ตรวจสอบไม่แสดงผู้ป่วยที่อยู่ Zone คัดกรอง ใน Left Panel | ไม่มีกลุ่ม รอคัดกรอง / Zone คัดกรอง · ค้น HN ผู้ป่วยที่ยังไม่คัดกรองไม่พบ |
| 003 | HPY | ตรวจสอบไม่แสดงผู้ป่วยที่รับเป็นผู้ป่วยในแล้ว ใน Left Panel | ผู้ป่วยที่ Disposition Admit Save + มี AN + มี Ward / เตียง ไม่แสดงใน Left Panel |
| 004 | HPY | ตรวจสอบไม่แสดงผู้ป่วยที่รอจำหน่าย ใน Left Panel | ผู้ป่วยที่ Disposition Save + ลงนาม ไม่แสดงใน Left Panel |
| 005 | HPY | ตรวจสอบไม่แสดงผู้ป่วยที่จำหน่ายแล้ว ใน Left Panel | ผู้ป่วยที่กดจำหน่ายแล้ว ไม่แสดงใน Left Panel |
| 006 | HPY | ตรวจสอบไม่แสดงผู้ป่วยที่ปิด Visit ที่การเงินแล้ว ใน Left Panel | ผู้ป่วยที่ปิด Visit ที่การเงินแล้ว ไม่แสดงใน Left Panel |
| 007 | HPY | ตรวจสอบไม่แสดงผู้ป่วยที่ยกเลิก Encounter ใน Left Panel | ผู้ป่วยที่ cancel Encounter ไม่แสดงใน Left Panel |
| 008 | HPY | แสดงชื่อ Zone Resuscitation แทนโซนแดง | หัวกลุ่มของผู้ป่วยโซนแดงแสดง Resuscitation · ไม่มีคำว่า โซนแดง |
| 009 | HPY | แสดงชื่อ Zone Urgency แทนโซนเหลือง | หัวกลุ่มของผู้ป่วยโซนเหลืองแสดง Urgency · ไม่มีคำว่า โซนเหลือง |
| 010 | HPY | แสดงชื่อ Zone Isolation 1 เมื่อผู้ป่วยถูกเลือก Isolation 1 | ผู้ป่วยอยู่ใต้หัวกลุ่ม Isolation 1 · ไม่มีคำว่า โซนเขียว |
| 011 | HPY | แสดงชื่อ Zone Isolation 2 เมื่อผู้ป่วยถูกเลือก Isolation 2 | ผู้ป่วยอยู่ใต้หัวกลุ่ม Isolation 2 · ไม่มีคำว่า โซนเขียว |
| 012 | HPY | แสดงชื่อ Zone Observation แทนห้องสังเกตอาการ ER | หัวกลุ่มของผู้ป่วยห้องสังเกตอาการแสดง Observation · ไม่มีคำว่า ห้องสังเกตอาการ ER |
| 013 | HPY | ตรวจสอบสี Header Zone Resuscitation | Header Zone Resuscitation เป็นสีแดง |
| 014 | HPY | ตรวจสอบสี Header Zone Urgency | Header Zone Urgency เป็นสีเหลือง |
| 015 | HPY | ตรวจสอบสี Header Zone Isolation | Header Zone Isolation 1 และ Isolation 2 เป็นสีเขียว |
| 016 | HPY | ตรวจสอบสี Header Zone Observation | Header Zone Observation เป็นสีฟ้า |
| 017 | HPY | แสดง Bubble แดงเมื่อมี Order ที่ยังไม่ได้รับ Order | เมนู รายการงานพยาบาล แสดง Bubble แดง |
| 018 | HPY | แสดง MC เมื่อผู้ป่วยเป็น case Mass Casualty | ชื่อผู้ป่วย Mass Casualty ใน Left Panel แสดงป้าย MC |
| 019 | HPY | แสดงปุ่ม รับ Order แทนปุ่ม รับงาน | แถวงานที่ยังไม่รับแสดงปุ่ม รับ Order · ไม่มีปุ่ม รับงาน |
| 020 | HPY | ตรวจสอบผู้ป่วย Fast Track เรียงอยู่บนสุดของ Zone | ผู้ป่วย Fast Track อยู่บนสุดของ Zone แม้ ESI มากกว่ารายอื่น |
| 021 | HPY | ตรวจสอบเรียงผู้ป่วยตาม ESI Level จากน้อยไปมาก | ผู้ป่วย ESI น้อยกว่าอยู่บนกว่า แม้มาทีหลัง |
| 022 | EDG | ตรวจสอบไม่แสดง Bubble แดงเมื่อรับ Order ครบทุกรายการแล้ว | เมนู รายการงานพยาบาล ไม่แสดง Bubble แดง |
| 023 | EDG | ตรวจสอบไม่แสดง MC เมื่อผู้ป่วยไม่ใช่ case Mass Casualty | ผู้ป่วยที่ไม่ใช่ Mass Casualty ไม่มีป้าย MC |
| 024 | EDG | ตรวจสอบเรียงผู้ป่วย Fast Track มากกว่า 1 รายตาม FIFO | ผู้ป่วย Fast Track ที่มาก่อนอยู่บนกว่า |
| 025 | EDG | ตรวจสอบเรียงตาม MEWS Score จาก High risk ไป Low risk เมื่อ ESI Level เท่ากัน | ESI เท่ากัน → MEWS มากกว่าอยู่บนกว่า แม้มาทีหลัง |
| 026 | EDG | ตรวจสอบเรียงตาม FIFO เมื่อ ESI Level และ MEWS Score เท่ากัน | ESI และ MEWS เท่ากัน → ผู้ป่วยที่มาก่อนอยู่บนกว่า |

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

ผู้ป่วยทุกรายต้อง **มี Order** (ตามกฎ SBH-2618 รายการงานพยาบาลแสดงเฉพาะผู้ป่วยที่มี order — ไม่มี Order จะไม่แสดงอยู่แล้ว ทำให้ TC 002–007 ผ่านแบบหลอก)

- **ผู้ป่วย A**: เปิด Visit ER → คัดกรอง โซนแดง → ER Physician Note (เลือก Diagnosis) → One Day Order แพทย์ลงนามแล้ว (ยังไม่รับ Order) → TC 001 · 008 · 013 · 017 · 019 · 022
- **ผู้ป่วย B**: เปิด Visit ER ยังไม่คัดกรอง (อยู่ Zone คัดกรอง) + มี Order → TC 002
- **ผู้ป่วย C–G**: คัดกรองแล้ว มี Order แสดงในรายการงานพยาบาล แล้วพาไปแต่ละสถานะ — C รับเป็นผู้ป่วยใน · D รอจำหน่าย · E จำหน่าย · F ปิด Visit ที่การเงิน · G cancel Encounter → TC 003–007
- **ผู้ป่วยโซนละ 1 ราย** (มี Order): โซนเหลือง · Isolation 1 · Isolation 2 · ห้องสังเกตอาการ → TC 009–012 · 014–016
- **ผู้ป่วย MC**: ส่ง Triage ทั้งเหตุการณ์ (mass casualty ≥ 2 ราย) + มี Order → TC 018 · ผู้ป่วยปกติใช้ผู้ป่วย A → TC 023
- **ชุดเรียงลำดับ** (คัดกรองเข้าโซนเดียวกัน · ทุกรายมี Order · คัดกรองห่างกันอย่างน้อย 1 นาที ตามลำดับที่เขียน):
  - TC 020: S1 ESI 1 ไม่ Fast Track → S2 ESI 2 + Suspect Fast Track
  - TC 021: S3 ESI 2 → S4 ESI 1 (ไม่ Fast Track ทั้งคู่)
  - TC 024: S5 Fast Track → S6 Fast Track
  - TC 025: S7 ESI 2 MEWS ต่ำ → S8 ESI 2 MEWS สูงกว่า
  - TC 026: S9 ESI 2 MEWS เท่ากับ S10 → S10
- user: แพทย์ ER (สั่ง + ลงนาม + Disposition) · พยาบาล ER (รายการงานพยาบาล) · การเงิน (ปิด Visit — TC 006)

---

## EXE - CT - 2.9.1

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, VERSION 2.9.1, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Nurse Task List, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.1
- Module: ER / Nurse Task List
- Requirement ที่อ้างอิง: SBH-2947 — [ER][In ER Zone][ Improve ] Nurse Tasks List
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- เพิ่ม Nurse Note จากรายการงานพยาบาล
- Left Panel ไม่แสดงผู้ป่วย Zone คัดกรอง และผู้ป่วยที่ออกจาก ER แล้ว (รับเป็นผู้ป่วยใน / รอจำหน่าย / จำหน่าย / เสร็จสิ้น / ยกเลิก)
- ชื่อ Zone และสี Header Zone ใหม่ (Resuscitation / Urgency / Isolation / Observation)
- Marker: Bubble แดงเมื่อมี Order ที่ยังไม่ได้รับ · ป้าย MC ของผู้ป่วย Mass Casualty
- ข้อความปุ่ม รับ Order
- การเรียงผู้ป่วย: Fast Track → ESI → MEWS → FIFO

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2947-HPY - พยาบาลใช้รายการงานพยาบาล ER ที่ปรับ Zone Marker และการเรียงผู้ป่วยใหม่

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2947-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Nurse Task List
- Requirement ที่อ้างอิง: SBH-2947 — [ER][In ER Zone][ Improve ] Nurse Tasks List

วัตถุประสงค์
- ยืนยันว่ารายการงานพยาบาล ER เปิด Nurse Note ได้ แสดงเฉพาะผู้ป่วยที่อยู่ในโซนรักษาของ ER ใช้ชื่อ / สี Zone ใหม่ แสดง Marker และเรียงผู้ป่วยตามความเร่งด่วน

ขอบเขต Requirement
- AC 1: เพิ่ม Nurse Note เปิดสำเร็จ
- AC 2: Exclude Zone คัดกรอง และผู้ป่วยที่ออกจาก ER แล้ว
- AC 3: ปรับชื่อ Zone
- AC 4: ปรับสี Header Zone
- AC 5: Marker Bubble แดง / MC
- AC 6: ข้อความ รับ Order
- AC 7: Fast Track บนสุด · ESI น้อยไปมาก

ความเสี่ยง
- กดเพิ่ม Nurse Note แล้วเปิดไม่ขึ้น (บั๊กเดิมที่ PR cortex-api #2962 แก้)
- ผู้ป่วยที่ออกจาก ER แล้วยังค้างในรายการ → พยาบาลทำงานผิดราย
- ผู้ป่วยวิกฤตไม่อยู่บนสุด → ได้รับการดูแลช้า

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยทุกรายต้องมี Order (ดูข้อมูลตั้งต้นในไฟล์ร่าง)
```

### TC-SBH-2947-001 - ทดสอบเพิ่ม Nurse Note จากรายการงานพยาบาล

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2947-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
3. เลือกผู้ป่วย A ใน Left Panel
4. กดเพิ่ม Nurse Note ที่แถวงานของผู้ป่วย A

## Expected Result
ฟอร์ม Nurse Note เปิดขึ้นสำเร็จ ไม่มีข้อความ error

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-002 - ตรวจสอบไม่แสดงผู้ป่วยที่อยู่ Zone คัดกรอง ใน Left Panel

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2947-002
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ดูกลุ่มใน Left Panel
3. ค้น HN ของผู้ป่วย B (ยังไม่คัดกรอง มี Order)

## Expected Result
Left Panel ไม่มีกลุ่ม รอคัดกรอง / Zone คัดกรอง
ค้น HN ผู้ป่วย B ไม่พบในรายการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-003 - ตรวจสอบไม่แสดงผู้ป่วยที่รับเป็นผู้ป่วยในแล้ว ใน Left Panel

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2947-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล > ค้น HN ผู้ป่วย C → พบในรายการ
2. Login ระบบด้วย user แพทย์ ER > เปิดผู้ป่วย C > Disposition เลือก Admit > Save
3. ผู้ป่วย C ได้ AN และได้ Ward + เตียง
4. กลับไปหน้ารายการงานพยาบาล > กด รีเฟรช > ค้น HN ผู้ป่วย C

## Expected Result
ผู้ป่วย C ไม่แสดงใน Left Panel

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-004 - ตรวจสอบไม่แสดงผู้ป่วยที่รอจำหน่าย ใน Left Panel

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2947-004
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล > ค้น HN ผู้ป่วย D → พบในรายการ
2. Login ระบบด้วย user แพทย์ ER > เปิดผู้ป่วย D > Disposition (จำหน่ายกลับบ้าน) > Save > ลงนาม
3. กลับไปหน้ารายการงานพยาบาล > กด รีเฟรช > ค้น HN ผู้ป่วย D

## Expected Result
ผู้ป่วย D ไม่แสดงใน Left Panel

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-005 - ตรวจสอบไม่แสดงผู้ป่วยที่จำหน่ายแล้ว ใน Left Panel

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2947-005
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล > ค้น HN ผู้ป่วย E → พบในรายการ
2. ผู้ป่วย E: Disposition Save + ลงนาม > กดจำหน่าย
3. กลับไปหน้ารายการงานพยาบาล > กด รีเฟรช > ค้น HN ผู้ป่วย E

## Expected Result
ผู้ป่วย E ไม่แสดงใน Left Panel

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-006 - ตรวจสอบไม่แสดงผู้ป่วยที่ปิด Visit ที่การเงินแล้ว ใน Left Panel

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2947-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล > ค้น HN ผู้ป่วย F → พบในรายการ
2. ผู้ป่วย F: Disposition Save + ลงนาม > จำหน่าย > Login ด้วย user การเงิน > ปิด Visit ผู้ป่วย F
3. กลับไปหน้ารายการงานพยาบาล > กด รีเฟรช > ค้น HN ผู้ป่วย F

## Expected Result
ผู้ป่วย F ไม่แสดงใน Left Panel

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-007 - ตรวจสอบไม่แสดงผู้ป่วยที่ยกเลิก Encounter ใน Left Panel

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2947-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล > ค้น HN ผู้ป่วย G → พบในรายการ
2. ยกเลิก Encounter ของผู้ป่วย G
3. กลับไปหน้ารายการงานพยาบาล > กด รีเฟรช > ค้น HN ผู้ป่วย G

## Expected Result
ผู้ป่วย G ไม่แสดงใน Left Panel

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-008 - แสดงชื่อ Zone Resuscitation แทนโซนแดง

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2947-008
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ดูหัวกลุ่มของผู้ป่วย A (คัดกรองโซนแดง) ใน Left Panel

## Expected Result
หัวกลุ่มแสดง Resuscitation
ไม่มีคำว่า โซนแดง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-009 - แสดงชื่อ Zone Urgency แทนโซนเหลือง

Status: Not Run · Priority: Medium · Labels: เหมือน TC-008

```
TC ID: TC-SBH-2947-009
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ดูหัวกลุ่มของผู้ป่วยที่คัดกรองโซนเหลือง ใน Left Panel

## Expected Result
หัวกลุ่มแสดง Urgency
ไม่มีคำว่า โซนเหลือง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-010 - แสดงชื่อ Zone Isolation 1 เมื่อผู้ป่วยถูกเลือก Isolation 1

Status: Not Run · Priority: Medium · Labels: เหมือน TC-008

```
TC ID: TC-SBH-2947-010
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ดูหัวกลุ่มของผู้ป่วยที่ถูกเลือก Isolation 1 ใน Left Panel

## Expected Result
ผู้ป่วยอยู่ใต้หัวกลุ่ม Isolation 1
ไม่มีคำว่า โซนเขียว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-011 - แสดงชื่อ Zone Isolation 2 เมื่อผู้ป่วยถูกเลือก Isolation 2

Status: Not Run · Priority: Medium · Labels: เหมือน TC-008

```
TC ID: TC-SBH-2947-011
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ดูหัวกลุ่มของผู้ป่วยที่ถูกเลือก Isolation 2 ใน Left Panel

## Expected Result
ผู้ป่วยอยู่ใต้หัวกลุ่ม Isolation 2
ไม่มีคำว่า โซนเขียว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-012 - แสดงชื่อ Zone Observation แทนห้องสังเกตอาการ ER

Status: Not Run · Priority: Medium · Labels: เหมือน TC-008

```
TC ID: TC-SBH-2947-012
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ดูหัวกลุ่มของผู้ป่วยที่อยู่ห้องสังเกตอาการ ใน Left Panel

## Expected Result
หัวกลุ่มแสดง Observation
ไม่มีคำว่า ห้องสังเกตอาการ ER

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-013 - ตรวจสอบสี Header Zone Resuscitation

Status: Not Run · Priority: Low · Labels: เหมือน TC-008

```
TC ID: TC-SBH-2947-013
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ดู Header Zone Resuscitation ใน Left Panel

## Expected Result
Header Zone Resuscitation เป็นสีแดง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-014 - ตรวจสอบสี Header Zone Urgency

Status: Not Run · Priority: Low · Labels: เหมือน TC-008

```
TC ID: TC-SBH-2947-014
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ดู Header Zone Urgency ใน Left Panel

## Expected Result
Header Zone Urgency เป็นสีเหลือง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-015 - ตรวจสอบสี Header Zone Isolation

Status: Not Run · Priority: Low · Labels: เหมือน TC-008

```
TC ID: TC-SBH-2947-015
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ดู Header Zone Isolation 1 และ Isolation 2 ใน Left Panel

## Expected Result
Header Zone Isolation 1 และ Isolation 2 เป็นสีเขียว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-016 - ตรวจสอบสี Header Zone Observation

Status: Not Run · Priority: Low · Labels: เหมือน TC-008

```
TC ID: TC-SBH-2947-016
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ดู Header Zone Observation ใน Left Panel

## Expected Result
Header Zone Observation เป็นสีฟ้า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-017 - แสดง Bubble แดงเมื่อมี Order ที่ยังไม่ได้รับ Order

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2947-017
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เมนู ห้องฉุกเฉิน > ดูเมนู รายการงานพยาบาล (ผู้ป่วย A มี Order ที่ยังไม่ได้รับ Order)

## Expected Result
เมนู รายการงานพยาบาล (เมนูซ้าย ใต้ ห้องฉุกเฉิน) แสดง Bubble แดง แบบเดียวกับ Bubble ของเมนู ผู้ป่วยนอก ในรูปของ AC 5

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-018 - แสดง MC เมื่อผู้ป่วยเป็น case Mass Casualty

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2947-018
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ค้น HN ผู้ป่วย MC (มาจาก Triage แบบ Mass Casualty) ใน Left Panel

## Expected Result
ชื่อผู้ป่วย MC แสดงป้าย MC

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-019 - แสดงปุ่ม รับ Order แทนปุ่ม รับงาน

Status: Not Run · Priority: Low · Labels: เหมือน TC-008

```
TC ID: TC-SBH-2947-019
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. เลือกผู้ป่วย A > ดูคอลัมน์ Actions ของแถวงานที่ยังไม่รับ

## Expected Result
แสดงปุ่ม รับ Order
ไม่มีปุ่ม รับงาน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-020 - ตรวจสอบผู้ป่วย Fast Track เรียงอยู่บนสุดของ Zone

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2947-020
Case Type: Happy
Test Type: Functional

## Test Step
1. คัดกรองผู้ป่วย S1 (ESI 1 ไม่ Fast Track) แล้วตามด้วย S2 (ESI 2 + Suspect Fast Track) เข้าโซนเดียวกัน
2. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
3. ดูลำดับผู้ป่วยใน Zone นั้น

## Expected Result
ผู้ป่วย S2 (Fast Track) อยู่บนสุดของ Zone เหนือ S1

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — เงื่อนไข Fast Track ชนะ ESI
```

### TC-SBH-2947-021 - ตรวจสอบเรียงผู้ป่วยตาม ESI Level จากน้อยไปมาก

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2947-021
Case Type: Happy
Test Type: Functional

## Test Step
1. คัดกรองผู้ป่วย S3 (ESI 2) แล้วตามด้วย S4 (ESI 1) เข้าโซนเดียวกัน ไม่ Fast Track ทั้งคู่
2. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
3. ดูลำดับผู้ป่วยใน Zone นั้น

## Expected Result
ผู้ป่วย S4 (ESI 1) อยู่เหนือ S3 (ESI 2) แม้มาทีหลัง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — ESI ต่างกัน
```

---

## TS-SBH-2947-EDG - ตรวจสอบ Marker เมื่อไม่เข้าเงื่อนไข และการเรียงผู้ป่วยเมื่อค่าเท่ากัน

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2947-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / Nurse Task List
- Requirement ที่อ้างอิง: SBH-2947 — [ER][In ER Zone][ Improve ] Nurse Tasks List

วัตถุประสงค์
- ยืนยันว่า Marker ไม่แสดงเมื่อไม่เข้าเงื่อนไข และการเรียงผู้ป่วยใช้เงื่อนไขถัดไปเมื่อค่าก่อนหน้าเท่ากัน

ขอบเขต Requirement
- AC 5.1: Bubble แดงเฉพาะเมื่อมี Order ที่ยังไม่ได้รับ
- AC 5.2: MC เฉพาะผู้ป่วย Mass Casualty
- AC 7.b.1: Fast Track > 1 เรียง FIFO
- AC 7.c: ESI เท่ากัน → MEWS · MEWS เท่ากัน → FIFO

ความเสี่ยง
- Bubble แดงค้างหลังรับ Order ครบ → พยาบาลเข้าใจว่ายังมีงานค้าง
- ป้าย MC ขึ้นกับผู้ป่วยทุกราย
- ลำดับผิดเมื่อค่าเท่ากัน → ผู้ป่วยที่เสี่ยงกว่าหรือมาก่อนถูกดันลง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2947-022 - ตรวจสอบไม่แสดง Bubble แดงเมื่อรับ Order ครบทุกรายการแล้ว

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2947-022
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. กด รับ Order ทุกงานที่ยังไม่รับ ของผู้ป่วยทุกรายที่มีงานค้าง (ให้ไม่เหลือ Order ที่ยังไม่ได้รับ)
3. กด รีเฟรช > ดูเมนู รายการงานพยาบาล ที่เมนูซ้าย

## Expected Result
เมนู รายการงานพยาบาล ไม่แสดง Bubble แดง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — มี Order ค้าง → รับครบ
```

### TC-SBH-2947-023 - ตรวจสอบไม่แสดง MC เมื่อผู้ป่วยไม่ใช่ case Mass Casualty

Status: Not Run · Priority: Medium · Labels: เหมือน TC-022

```
TC ID: TC-SBH-2947-023
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
2. ค้น HN ผู้ป่วย A (คัดกรองปกติ ไม่ใช่ Mass Casualty) ใน Left Panel

## Expected Result
ชื่อผู้ป่วย A ไม่มีป้าย MC

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2947-024 - ตรวจสอบเรียงผู้ป่วย Fast Track มากกว่า 1 รายตาม FIFO

Status: Not Run · Priority: High · Labels: เหมือน TC-022

```
TC ID: TC-SBH-2947-024
Case Type: Edge
Test Type: Functional

## Test Step
1. คัดกรองผู้ป่วย S5 (Suspect Fast Track) แล้วตามด้วย S6 (Suspect Fast Track) เข้าโซนเดียวกัน
2. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
3. ดูลำดับผู้ป่วยใน Zone นั้น

## Expected Result
ผู้ป่วย S5 (มาก่อน) อยู่เหนือ S6

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — Fast Track เท่ากัน → FIFO
```

### TC-SBH-2947-025 - ตรวจสอบเรียงตาม MEWS Score จาก High risk ไป Low risk เมื่อ ESI Level เท่ากัน

Status: Not Run · Priority: High · Labels: เหมือน TC-022

```
TC ID: TC-SBH-2947-025
Case Type: Edge
Test Type: Functional

## Test Step
1. คัดกรองผู้ป่วย S7 (ESI 2 · MEWS ต่ำ) แล้วตามด้วย S8 (ESI 2 · MEWS สูงกว่า) เข้าโซนเดียวกัน ไม่ Fast Track ทั้งคู่
2. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
3. ดูลำดับผู้ป่วยใน Zone นั้น

## Expected Result
ผู้ป่วย S8 (MEWS สูงกว่า) อยู่เหนือ S7 แม้มาทีหลัง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — ESI เท่ากัน MEWS ต่างกัน
```

### TC-SBH-2947-026 - ตรวจสอบเรียงตาม FIFO เมื่อ ESI Level และ MEWS Score เท่ากัน

Status: Not Run · Priority: Medium · Labels: เหมือน TC-022

```
TC ID: TC-SBH-2947-026
Case Type: Edge
Test Type: Functional

## Test Step
1. คัดกรองผู้ป่วย S9 แล้วตามด้วย S10 เข้าโซนเดียวกัน ESI 2 และ MEWS เท่ากันทั้งคู่ ไม่ Fast Track
2. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > รายการงานพยาบาล
3. ดูลำดับผู้ป่วยใน Zone นั้น

## Expected Result
ผู้ป่วย S9 (มาก่อน) อยู่เหนือ S10

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค Decision Table — ESI และ MEWS เท่ากัน → FIFO
```

---

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - AC 5.1 Bubble แดง (ผู้ใช้ยืนยัน 31 ต.ค.: อยู่ที่เมนู รายการงานพยาบาล ตามรูป AC) — มีตัวเลขหรือไม่ นับเป็นจำนวน Order หรือจำนวนผู้ป่วย · นับรวมทุกวันหรือเฉพาะวันที่เลือก
  - AC 7.a "Check Step < Dynamic >" ไม่มีรายละเอียดที่ตรวจได้
  - AC 3.3 ข้อ 2 เขียนว่า "ถ้าผู้ป่วยถูกเลือก Isolation 1 → แสดง Isolation 2" — ร่างนี้ตีความเป็น "เลือก Isolation 2 → แสดง Isolation 2" (TC 011)
  - กลุ่ม "รอเตียง" (มีในรูป AC) ยังแสดงอยู่หรือไม่ · ใช้ชื่อ / สีอะไร
  - ชื่อ Zone ใหม่ใช้ที่ตัวกรอง "เลือก Zone" ด้านบนด้วยหรือไม่
  - AC 6 เปลี่ยนเฉพาะปุ่ม — สถานะ "รอรับงาน" เปลี่ยนเป็น "รอรับ Order" ด้วยหรือไม่
  - AC 1 "เพิ่ม Nurse Note" อยู่ที่คอลัมน์ Nurse note ของแถวงาน หรือปุ่มอื่น · เปิดได้กับงานทุกสถานะหรือไม่
- **Validation**
  - การเรียงทำต่อ Zone หรือรวมทั้งรายการ · Fast Track ใช้กับทุก Zone หรือเฉพาะ Resuscitation (บน ER Dashboard ชั้น Fast Track มีแค่โซนแดง)
  - FIFO นับจากเวลามาถึง (arrivedAt) หรือเวลาคัดกรอง
  - ผู้ป่วยที่ไม่มี ESI / MEWS เรียงไว้ตรงไหน · Acknowledge Fast Track แล้วยังนับเป็น Fast Track หรือไม่
- **Error handling**
  - เปิด Nurse Note ไม่สำเร็จ แสดงข้อความอะไร
- **Permission / role**
  - role ไหนเห็น Bubble แดง / กด เพิ่ม Nurse Note ได้
- **Edge cases**
  - Disposition Admit Save แล้วแต่ยังไม่มี AN หรือยังไม่ได้ Ward / เตียง (รอเตียง) — ยังแสดงหรือไม่ (การ์ดระบุครบ 3 เงื่อนไขจึงไม่แสดง)
  - Disposition Save แต่ยังไม่ลงนาม — ยังแสดงหรือไม่
  - ย้อน Disposition (reopen) แล้วผู้ป่วยกลับมาแสดงหรือไม่
  - ผู้ป่วยย้าย Zone ระหว่างวัน — หัวกลุ่ม / ลำดับเปลี่ยนตามหรือไม่
