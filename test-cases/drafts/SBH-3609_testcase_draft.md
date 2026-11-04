# Draft Test Structure — SBH-3609

> สถานะ: **สร้างใน Linear แล้ว 3 พ.ย. 2026** — ผู้ใช้พิมพ์ "สร้างได้" · EXE `SBH-3845` · HPY `SBH-3846` (TC 001–011) · EDG `SBH-3847` (TC 012–013) · connector เป็นบัญชี Pearsu (ผู้ใช้อนุญาต "สร้างเลย assign ผม") · assignee Suchat ทุกใบ
> - เลข TC → SBH: 001=3848 · 002=3849 · 003=3851 · 004=3852 · 005=3854 · 006=3856 · 007=3857 · 008=3859 · 009=3861 · 010=3863 · 011=3865 · 012=3867 · 013=3868
> - ชุดนี้ = EXE 1 + Scenario 2 (HPY / EDG) + TC 13 = 16 ใบ
> - ยึด AC 3 ข้อในการ์ด + รูป 3 รูปในการ์ด + ผลสำรวจ dev-x 3 พ.ย. 2026 ~20:20 (อ่านอย่างเดียว · ภาพที่ `.cache/explore-3609/`)
> - การ์ดไม่มีคอมเมนต์ / Sub-Issue · PR 3 ตัว: cortex-x #8911 · cortex-ui #2630 · cortex-api #3018 (VERSION 2.10.0)
> - ผู้ใช้ตัดสิน 3 พ.ย. 2026: ไม่สร้างเหตุการณ์ทดสอบเพื่อสำรวจ เขียนตามการ์ด · เพิ่ม 3 TC ER Arrival ระดับเหตุการณ์ (TC-008–010) ·
>   **เลขนำหน้าเฉพาะผู้ป่วยที่ระบบสร้างอัตโนมัติ ผู้ป่วยที่เพิ่มเองต้องไม่มีเลข** (TC-013) · ESI 5 ไม่มีโซนแนะนำ → เปิดการ์ดบั๊ก (ร่างที่ `SBH-3609_bug_draft.md`)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ค่าที่เสนอ (รอยืนยัน): Run Type CT · Version 2.10.0 · Env Dev-X · QA Module : ER · QA Sub-module / Feature : Mass Casualty Triage (label มีอยู่แล้ว — ใช้กับ SBH-2470)

Requirement: SBH-3609 — [ER] [MC] Mass Causulty
URL: https://linear.app/cortexcloud/issue/SBH-3609/er-mc-mass-causulty
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: In Review
Labels: Natthaphat ( MOD ) 🙈 · 🍄 Improvement · VERSION 2.10.0 · Assignee: jetsadaporn (Dew) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Relations: ไม่มี · Sub-Issue: ไม่มี
Scope / Version = 2.10.0

Business Rule ในการ์ด
1. ผู้ป่วย MC เป็นผู้ป่วยอุบัติเหตุ ไม่จำเป็นต้องเลือก 2 zone นี้
2. ปรับปรุงชื่อแสดงของผู้ป่วย

AC ในการ์ด
1. Hide ชื่อ Zone — 1.1 Isolation 1 · 1.2 Isolation 2
2. Number ให้นำหน้าชื่อ — 01 name xxxx · 02 name xxxx
3. นำ ER Arrival ใหม่มาใช้ที่ Mass casualty

## ผลสำรวจ dev-x (3 พ.ย. 2026 · ไฟล์แอป `index-D-2VfyUS.js` + ชิ้น `index-mdf82neb.js`)

| เรื่อง | สิ่งที่เห็น |
|---|---|
| deploy | ขึ้นแล้ว |
| AC 1 โซน | หน้า MC เหลือ Resuscitation · Urgency · Observation ทั้งแถบ "ส่งเข้าโซน" และฟอร์มผู้ป่วย · ฟอร์มรายเดียว (หน้า Visit) ยังครบ 5 โซน |
| ESI ในหน้า MC | ESI 4 → Urgency แนะนำ · ESI 5 → API แนะนำ Isolation 1 ซึ่งหน้า MC กรองทิ้ง → **ไม่มีโซนแนะนำ** (ดูจากโค้ด + API ยังไม่เห็นบนจอ — กด ESI แล้วบันทึกร่างทันที) |
| AC 2 ชื่อ | แถวซ้ายเติมเลข 2 หลักนำหน้าแล้ว (ไม่มี "1." แล้ว) · เหตุการณ์ทั้งหมดบน dev-x สร้างก่อน deploy → เลขซ้ำ 2 ที่ `01 MCI Task A 01` · แถบชื่อฝั่งขวา `MCI Task A 01` ไม่มีเลข · **ผู้ป่วยที่เพิ่มเองก็มีเลข** `01 นาง AUTO …` |
| AC 3 ER Arrival | มี 2 ระดับ — **ระดับเหตุการณ์** ใน dialog "สร้างเหตุการณ์" / "แก้ไขเหตุการณ์" (วิธีการมาถึงยังไม่เลือก · ผู้นำส่ง / ชื่อผู้นำส่ง disabled จนกว่าเลือกวิธี · ข้อความ "ใช้กับผู้ป่วยที่ยังไม่ได้แก้ไขข้อมูลการมาถึงเฉพาะราย" · ปุ่ม `ล้างค่า`) · **ระดับผู้ป่วย** กล่องพับ "ER Arrival" บนสุดของฟอร์มขวา ค่าเริ่มต้น Walk-in · กดแล้วบันทึกทันที · มีป้ายบอกว่าค่ามาจากเหตุการณ์ / แก้เฉพาะราย (ทุกเหตุการณ์ตอนนี้ไม่มี arrival จึงยังไม่เห็นป้าย) |

## AC → TC

| AC | เรื่อง | TC |
|---|---|---|
| 1 | ซ่อน Isolation 1 / 2 ที่แถบ "ส่งเข้าโซน" | 001 |
| 1 | ซ่อน Isolation 1 / 2 ที่ปุ่มโซนในฟอร์มผู้ป่วย | 002 |
| 1 (เฉพาะ MC) | คัดกรองผู้ป่วยรายเดียวยังมี Isolation 1 / 2 | 012 |
| 2 | เลขลำดับนำหน้าชื่อในรายการผู้ป่วยของเหตุการณ์ | 003 |
| 2 | เลขลำดับนำหน้าชื่อที่แถบข้อมูลผู้ป่วยฝั่งขวา | 004 |
| 2 (เฉพาะผู้ป่วยที่ระบบสร้าง) | ผู้ป่วยที่เพิ่มเองไม่มีเลขนำหน้า | 013 |
| 3 | กล่อง ER Arrival ในฟอร์มผู้ป่วย | 005 |
| 3 | ช่องที่ขึ้นเมื่อเลือก EMS | 006 |
| 3 | ค่า ER Arrival เฉพาะรายถูกบันทึก | 007 |
| 3 (ระดับเหตุการณ์) | ER Arrival ใน dialog สร้างเหตุการณ์ | 008 |
| 3 (ระดับเหตุการณ์) | ผู้ป่วยได้ค่า ER Arrival จากเหตุการณ์ | 009 |
| 3 (ระดับเหตุการณ์) | แก้ค่าเหตุการณ์แล้วไม่ทับผู้ป่วยที่แก้เฉพาะราย | 010 |
| 3 | ค่า ER Arrival ไปถึง Visit หลังส่ง Triage ทั้งเหตุการณ์ | 011 |

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | ตรวจสอบแถบ "ส่งเข้าโซน" ไม่แสดงโซน Isolation 1 และ Isolation 2 | แถบ "ส่งเข้าโซน" มีเฉพาะ Resuscitation · Urgency · Observation ไม่มี Isolation 1 / Isolation 2 |
| 002 | HPY | ตรวจสอบปุ่มโซนในฟอร์มคัดกรองผู้ป่วย MC ไม่แสดง Isolation 1 และ Isolation 2 | ปุ่มโซนมีเฉพาะ Resuscitation · Urgency · Observation ไม่มี Isolation 1 / Isolation 2 |
| 003 | HPY | แสดงเลขลำดับนำหน้าชื่อผู้ป่วยที่ระบบสร้างในรายการผู้ป่วยของเหตุการณ์ | แถว 1 ชื่อขึ้นต้นด้วย 01 · แถว 2 ชื่อขึ้นต้นด้วย 02 · ท้ายชื่อไม่มีเลขลำดับ |
| 004 | HPY | แสดงเลขลำดับนำหน้าชื่อผู้ป่วยที่แถบข้อมูลผู้ป่วยฝั่งขวา | ชื่อที่แถบข้อมูลผู้ป่วยขึ้นต้นด้วย 01 ตรงกับรายการฝั่งซ้าย · ท้ายชื่อไม่มีเลขลำดับ |
| 005 | HPY | แสดงส่วน ER Arrival แบบใหม่ในฟอร์มคัดกรองผู้ป่วย MC | มีส่วน ER Arrival: วิธีการมาถึง (Walk-in / EMS / รับ Refer) · ผู้นำส่ง · ชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ |
| 006 | HPY | แสดงช่องข้อมูล EMS ใน ER Arrival เมื่อเลือกวิธีการมาถึงเป็น EMS | แสดงช่อง ระดับความเร่งด่วน EMS และ ข้อมูลก่อนถึงโรงพยาบาล |
| 007 | HPY | บันทึกค่า ER Arrival เฉพาะรายของผู้ป่วย MC | สลับไปผู้ป่วยอื่นแล้วกลับมา ค่า ER Arrival ที่กรอกยังอยู่ครบ |
| 008 | HPY | แสดงส่วน ER Arrival ในหน้าต่างสร้างเหตุการณ์ | มี วิธีการมาถึง · ผู้นำส่ง · ชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ · ข้อความ "ใช้กับผู้ป่วยที่ยังไม่ได้แก้ไขข้อมูลการมาถึงเฉพาะราย" |
| 009 | HPY | ตรวจสอบผู้ป่วยในเหตุการณ์ได้ค่า ER Arrival จากระดับเหตุการณ์ | ER Arrival ของผู้ป่วยตรงกับค่าที่กรอกตอนสร้างเหตุการณ์ · มีป้ายบอกว่าใช้ค่าจากเหตุการณ์ |
| 010 | HPY | ตรวจสอบแก้ ER Arrival ระดับเหตุการณ์แล้วไม่ทับผู้ป่วยที่แก้เฉพาะราย | ผู้ป่วยที่แก้เฉพาะรายยังเป็นค่าที่แก้ไว้ ไม่เปลี่ยนตามเหตุการณ์ |
| 011 | HPY | ตรวจสอบข้อมูล ER Arrival ใน Visit ผู้ป่วยหลังส่ง Triage ทั้งเหตุการณ์ | ER Arrival ใน Visit ของผู้ป่วยแต่ละรายตรงกับค่าในหน้าเหตุการณ์ |
| 012 | EDG | ตรวจสอบคัดกรองผู้ป่วยรายเดียวยังแสดงโซน Isolation 1 และ Isolation 2 | ปุ่มโซนยังมีครบ 5 โซนเหมือนเดิม |
| 013 | EDG | ตรวจสอบผู้ป่วยที่เพิ่มเองในเหตุการณ์ไม่มีเลขลำดับนำหน้าชื่อ | ชื่อแสดงตามทะเบียน ไม่มีเลขลำดับนำหน้า |

## Requirement gap / ข้อสังเกต (ไม่ทำเป็น TC)

**expected behavior**
- ESI 5 ในหน้า MC ไม่มีโซนแนะนำ → **ผู้ใช้ให้เปิดการ์ดบั๊ก** (ร่างที่ `SBH-3609_bug_draft.md`)
- รูปแบบชื่อที่ต้องการเป๊ะ ๆ — การ์ดเขียน "01 name xxxx" · ทะเบียนตอนนี้เก็บ firstName `MCI` / lastName `<ชื่อเหตุการณ์> 01` → เหตุการณ์ใหม่จะเก็บเป็น `01 MCI <ชื่อเหตุการณ์>` หรือไม่ ยังยืนยันไม่ได้ (ไม่มีเหตุการณ์ที่สร้างหลัง deploy)
- หน้าอื่นนอก MC (บอร์ด ER · ER Patient List · รายการงานพยาบาล · บัตรคิว) ต้องแสดงชื่อแบบมีเลขนำหน้าไหม
- ลบผู้ป่วยออกจากเหตุการณ์แล้ว เลขลำดับของคนที่เหลือต้องเรียงใหม่ไหม
- ER Arrival ระดับเหตุการณ์ (การ์ดไม่ได้เขียน — dev ทำเพิ่ม) · ปุ่ม `ล้างค่า` ไม่ได้ทำ TC

**validation**
- ER Arrival เป็นช่องบังคับก่อนกด "พร้อมส่ง" ไหม

**permission / role**
- -

**error handling**
- -

**edge cases**
- เหตุการณ์ที่สร้างก่อน deploy: ชื่อในแถวซ้ายมีเลข 2 ที่ (`01 MCI Task A 01`) และแถบขวาไม่มีเลข — ยอมรับได้ไหม
- ผู้ป่วย MC ที่อยู่โซน Isolation อยู่แล้วก่อน deploy — ยังแสดง / ย้ายโซนได้ไหม

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user พยาบาล ER** ที่มีสิทธิ์จัดการ ER (สร้างเหตุการณ์ Triage หมู่ได้) — ทุก TC
- **เหตุการณ์ MC B** สร้างใหม่ ชื่อ "SBH-3609 QA B" · จำนวนผู้ป่วย 2 · **ไม่ใส่** ER Arrival ระดับเหตุการณ์ — 001–007 · 013
- **เหตุการณ์ MC A** สร้างใน TC-008 / 009 ชื่อ "SBH-3609 QA A" · จำนวนผู้ป่วย 2 · ER Arrival ระดับเหตุการณ์ = EMS · ALS · EMS ขึ้นทะเบียน · "หน่วยกู้ภัย SBH-3609" — 009–011
- **ผู้ป่วยที่มีชื่อจริง (มี HN)** 1 ราย สำหรับค้นหาด้วย HN แล้วเพิ่มเข้าเหตุการณ์ MC B — 013
- **ผู้ป่วย ER ที่ยังไม่คัดกรอง** 1 ราย (ผู้ป่วยรายเดียว) — 012
- dev-x ใช้ร่วมกัน: ผู้ป่วยที่สร้าง / ส่ง Triage ทิ้ง Visit ไว้ แล้วลงบันทึกใน `mock-data/created-patients.md`

---

## EXE - CT - 2.10.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, VERSION 2.10.0, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Mass Casualty Triage, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.10.0
- Module: ER — คัดกรองผู้ป่วยหลายคน (Mass Casualty)
- Requirement ที่อ้างอิง: SBH-3609 — [ER] [MC] Mass Causulty
- Environment: Dev-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ซ่อนโซน Isolation 1 / Isolation 2 ในหน้าคัดกรองผู้ป่วยหลายคน
- เลขลำดับนำหน้าชื่อผู้ป่วยที่ระบบสร้าง
- ER Arrival แบบใหม่ในหน้าคัดกรองผู้ป่วยหลายคน ทั้งระดับเหตุการณ์และระดับผู้ป่วย

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- นอก scope: ชื่อในหน้าอื่นนอก MC · ปุ่มล้างค่า ER Arrival · โซนแนะนำ ESI 5 (แยกเป็นการ์ดบั๊ก)
```

---

## TS-SBH-3609-HPY - ปรับหน้าคัดกรองผู้ป่วยหลายคน (โซน · ชื่อ · ER Arrival)

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3609-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER — คัดกรองผู้ป่วยหลายคน (Mass Casualty)
- Requirement ที่อ้างอิง: SBH-3609 — [ER] [MC] Mass Causulty

วัตถุประสงค์
- ยืนยันว่าหน้าคัดกรองผู้ป่วยหลายคนไม่มีโซน Isolation 1 / 2 · ชื่อผู้ป่วยที่ระบบสร้างมีเลขลำดับนำหน้า · ใช้ ER Arrival แบบใหม่ทั้งระดับเหตุการณ์และระดับผู้ป่วย และบันทึกไปถึง Visit ได้

ขอบเขต Requirement
- AC 1 Hide ชื่อ Zone Isolation 1 / Isolation 2
- AC 2 Number ให้นำหน้าชื่อ
- AC 3 นำ ER Arrival ใหม่มาใช้ที่ Mass casualty

ความเสี่ยง
- ยังเลือก Isolation ได้ → ผู้ป่วยอุบัติเหตุหมู่ถูกส่งผิดโซน
- เลขลำดับอยู่ท้ายชื่อ → ชื่อยาวแล้วเลขถูกตัด พยาบาลแยกผู้ป่วยไม่ระบุตัวตนไม่ออก
- ค่า ER Arrival ระดับเหตุการณ์ทับค่าที่แก้เฉพาะราย หรือไม่ถูกบันทึกลง Visit → ข้อมูลการนำส่งผิด / หาย

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ข้อมูลที่ใช้ดูหัวข้อ "ข้อมูลตั้งต้น" ในไฟล์ร่าง
```

### TC-SBH-3609-001 - ตรวจสอบแถบ "ส่งเข้าโซน" ไม่แสดงโซน Isolation 1 และ Isolation 2

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3609-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยหลายคน
2. รายการเหตุการณ์ > เปิดเหตุการณ์ MC B
3. ดูแถบ "ส่งเข้าโซน" ใต้ช่อง เลือกทั้งหมด

## Expected Result
แถบ "ส่งเข้าโซน" มีเฉพาะ Resuscitation · Urgency · Observation ไม่มี Isolation 1 / Isolation 2

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1 + 1.2
```

### TC-SBH-3609-002 - ตรวจสอบปุ่มโซนในฟอร์มคัดกรองผู้ป่วย MC ไม่แสดง Isolation 1 และ Isolation 2

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3609-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยหลายคน
2. รายการเหตุการณ์ > เปิดเหตุการณ์ MC B > เลือกผู้ป่วยแถวที่ 1
3. ฟอร์มฝั่งขวา ดูปุ่มในหัวข้อ "โซน"

## Expected Result
ปุ่มโซนมีเฉพาะ Resuscitation · Urgency · Observation ไม่มี Isolation 1 / Isolation 2

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1 + 1.2
```

### TC-SBH-3609-003 - แสดงเลขลำดับนำหน้าชื่อผู้ป่วยที่ระบบสร้างในรายการผู้ป่วยของเหตุการณ์

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3609-003
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยหลายคน
2. รายการเหตุการณ์ > เปิดเหตุการณ์ MC B (ผู้ป่วย 2 รายที่ระบบสร้างจากจำนวนผู้ป่วย)
3. ดูชื่อผู้ป่วยในรายการฝั่งซ้าย แถว 1 และแถว 2

## Expected Result
แถว 1 ชื่อขึ้นต้นด้วย 01 · แถว 2 ชื่อขึ้นต้นด้วย 02 · ท้ายชื่อไม่มีเลขลำดับ

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 · ต้องใช้เหตุการณ์ที่สร้างหลัง deploy (เหตุการณ์เก่าบน dev-x แสดงเลข 2 ที่ เช่น "01 MCI Task A 01")
```

### TC-SBH-3609-004 - แสดงเลขลำดับนำหน้าชื่อผู้ป่วยที่แถบข้อมูลผู้ป่วยฝั่งขวา

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3609-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยหลายคน
2. รายการเหตุการณ์ > เปิดเหตุการณ์ MC B > เลือกผู้ป่วยแถวที่ 1
3. ดูชื่อผู้ป่วยที่แถบข้อมูลผู้ป่วยด้านบนฝั่งขวา (ข้าง HN)

## Expected Result
ชื่อที่แถบข้อมูลผู้ป่วยขึ้นต้นด้วย 01 ตรงกับรายการฝั่งซ้าย · ท้ายชื่อไม่มีเลขลำดับ

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 · เหตุการณ์เก่าบน dev-x แถบนี้ไม่มีเลข (แสดงชื่อตามทะเบียน "MCI Task A 01")
```

### TC-SBH-3609-005 - แสดงส่วน ER Arrival แบบใหม่ในฟอร์มคัดกรองผู้ป่วย MC

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3609-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยหลายคน
2. รายการเหตุการณ์ > เปิดเหตุการณ์ MC B > เลือกผู้ป่วยแถวที่ 1
3. ดูกล่อง ER Arrival บนสุดของฟอร์มฝั่งขวา

## Expected Result
มีส่วน ER Arrival: วิธีการมาถึง (Walk-in / EMS / รับ Refer) · ผู้นำส่ง · ชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 3 · เทียบกับรูปกล่อง ER Arrival ในการ์ด
```

### TC-SBH-3609-006 - แสดงช่องข้อมูล EMS ใน ER Arrival เมื่อเลือกวิธีการมาถึงเป็น EMS

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3609-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยหลายคน
2. รายการเหตุการณ์ > เปิดเหตุการณ์ MC B > เลือกผู้ป่วยแถวที่ 1
3. กล่อง ER Arrival กด วิธีการมาถึง = EMS
4. ดูช่องที่ขึ้นเพิ่มในกล่อง ER Arrival

## Expected Result
แสดงช่อง ระดับความเร่งด่วน EMS และ ข้อมูลก่อนถึงโรงพยาบาล

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 3 · กล่อง ER Arrival ใช้ชุดเดียวกับฟอร์มคัดกรองรายเดียว (SBH-1678)
```

### TC-SBH-3609-007 - บันทึกค่า ER Arrival เฉพาะรายของผู้ป่วย MC

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3609-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยหลายคน
2. รายการเหตุการณ์ > เปิดเหตุการณ์ MC B > เลือกผู้ป่วยแถวที่ 1
3. ER Arrival: วิธีการมาถึง = EMS · ระดับความเร่งด่วน EMS = ALS · ผู้นำส่ง = EMS ขึ้นทะเบียน · ชื่อผู้นำส่ง = "หน่วยกู้ภัย SBH-3609 B"
4. เลือกผู้ป่วยแถวที่ 2 แล้วกลับมาเลือกผู้ป่วยแถวที่ 1

## Expected Result
ค่า ER Arrival ของผู้ป่วยแถวที่ 1 ยังอยู่ครบ: EMS · ALS · EMS ขึ้นทะเบียน · หน่วยกู้ภัย SBH-3609 B

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 3 · กล่องนี้บันทึกทันทีที่เลือก ไม่ต้องกด "พร้อมส่งและไปคนถัดไป"
```

### TC-SBH-3609-008 - แสดงส่วน ER Arrival ในหน้าต่างสร้างเหตุการณ์

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3609-008
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยหลายคน
2. กด สร้างเหตุการณ์
3. ดูส่วนการมาถึงในหน้าต่าง "สร้างเหตุการณ์"

## Expected Result
มี วิธีการมาถึง (Walk-in / EMS / รับ Refer) · ผู้นำส่ง · ชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ · ข้อความ "ใช้กับผู้ป่วยที่ยังไม่ได้แก้ไขข้อมูลการมาถึงเฉพาะราย"

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 3 (ระดับเหตุการณ์ — การ์ดไม่ได้เขียน · ผู้ใช้ให้เพิ่ม 3 พ.ย. 2026)
```

### TC-SBH-3609-009 - ตรวจสอบผู้ป่วยในเหตุการณ์ได้ค่า ER Arrival จากระดับเหตุการณ์

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3609-009
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยหลายคน > สร้างเหตุการณ์
2. กรอกช่องบังคับ ชื่อเหตุการณ์ "SBH-3609 QA A" · จำนวนผู้ป่วย 2
3. ส่วนการมาถึง: วิธีการมาถึง = EMS · ระดับความเร่งด่วน EMS = ALS · ผู้นำส่ง = EMS ขึ้นทะเบียน · ชื่อผู้นำส่ง = "หน่วยกู้ภัย SBH-3609" > กด สร้าง
4. รอลงทะเบียนครบ 2 ราย > เลือกผู้ป่วยแถวที่ 1 > ดูกล่อง ER Arrival

## Expected Result
ER Arrival ของผู้ป่วยตรงกับค่าที่กรอกตอนสร้างเหตุการณ์ (EMS · ALS · EMS ขึ้นทะเบียน · หน่วยกู้ภัย SBH-3609) · มีป้ายบอกว่าใช้ค่าจากเหตุการณ์

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 3 (ระดับเหตุการณ์) · ข้อความบนป้ายยังไม่เคยเห็นบนจอ (เหตุการณ์บน dev-x ยังไม่มี ER Arrival) — จดข้อความจริงตอนรัน
```

### TC-SBH-3609-010 - ตรวจสอบแก้ ER Arrival ระดับเหตุการณ์แล้วไม่ทับผู้ป่วยที่แก้เฉพาะราย

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3609-010
Case Type: Happy
Test Type: Functional

## Test Step
1. ทำ TC-SBH-3609-009 ก่อน (เหตุการณ์ MC A)
2. เลือกผู้ป่วยแถวที่ 2 > ER Arrival เปลี่ยนเป็น Walk-in · ผู้นำส่ง = ญาติ/ผู้พบเห็น/อื่นๆ
3. กดไอคอนแก้ไขเหตุการณ์ > ชื่อผู้นำส่ง = "หน่วยกู้ภัย SBH-3609 แก้" > กด อัปเดต
4. เลือกผู้ป่วยแถวที่ 2 > ดูกล่อง ER Arrival

## Expected Result
ผู้ป่วยแถวที่ 2 ยังเป็น Walk-in · ญาติ/ผู้พบเห็น/อื่นๆ ไม่เปลี่ยนตามเหตุการณ์ · ป้ายบอกว่าแก้เฉพาะราย

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 3 (ระดับเหตุการณ์) · ตามข้อความในหน้าต่าง "ใช้กับผู้ป่วยที่ยังไม่ได้แก้ไขข้อมูลการมาถึงเฉพาะราย"
```

### TC-SBH-3609-011 - ตรวจสอบข้อมูล ER Arrival ใน Visit ผู้ป่วยหลังส่ง Triage ทั้งเหตุการณ์

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3609-011
Case Type: Happy
Test Type: Functional

## Test Step
1. ทำ TC-SBH-3609-010 ก่อน (เหตุการณ์ MC A · แถว 1 ใช้ค่าจากเหตุการณ์ · แถว 2 แก้เฉพาะราย)
2. ผู้ป่วยแถว 1 และแถว 2: ระดับความเร่งด่วน 3 + โซน Urgency > กด "พร้อมส่งและไปคนถัดไป"
3. กด "ส่ง Triage ทั้งเหตุการณ์"
4. เปิด Visit ER ของผู้ป่วยแต่ละราย > ดูส่วน ER Arrival ในข้อมูลคัดกรอง

## Expected Result
ER Arrival ใน Visit ของผู้ป่วยแต่ละรายตรงกับค่าในหน้าเหตุการณ์ (แถว 1: EMS · ALS · EMS ขึ้นทะเบียน · หน่วยกู้ภัย SBH-3609 แก้ · แถว 2: Walk-in · ญาติ/ผู้พบเห็น/อื่นๆ)

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 3
```

---

## TS-SBH-3609-EDG - ขอบเขตการเปลี่ยนแปลง (เฉพาะหน้า MC · เฉพาะผู้ป่วยที่ระบบสร้าง)

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3609-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER — คัดกรองผู้ป่วยหลายคน (Mass Casualty)
- Requirement ที่อ้างอิง: SBH-3609 — [ER] [MC] Mass Causulty

วัตถุประสงค์
- ยืนยันว่าการซ่อนโซน Isolation มีผลเฉพาะหน้า MC และเลขลำดับนำหน้าชื่อมีเฉพาะผู้ป่วยที่ระบบสร้างอัตโนมัติ

ขอบเขต Requirement
- AC 1 Hide ชื่อ Zone Isolation 1 / Isolation 2 (Business Rule 1: เฉพาะผู้ป่วย MC)
- AC 2 Number ให้นำหน้าชื่อ (เฉพาะผู้ป่วยที่ระบบสร้าง — ผู้ใช้ยืนยัน 3 พ.ย. 2026)

ความเสี่ยง
- ซ่อนโซนทั้งระบบ → ผู้ป่วยรายเดียวที่ต้องแยกโรคส่งเข้า Isolation ไม่ได้
- ผู้ป่วยที่มีชื่อจริงถูกเติมเลขหน้าชื่อ → ชื่อผู้ป่วยแสดงผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-3609-012 - ตรวจสอบคัดกรองผู้ป่วยรายเดียวยังแสดงโซน Isolation 1 และ Isolation 2

Status: Not Run · Priority: High · Labels: … + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3609-012
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยรายเดียว
2. เลือกผู้ป่วย ER ที่ยังไม่คัดกรอง
3. ดูปุ่มในหัวข้อ "โซน" ของฟอร์มคัดกรอง

## Expected Result
ปุ่มโซนยังมี Resuscitation · Urgency · Isolation 1 · Isolation 2 · Observation ครบ 5 โซนเหมือนเดิม

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1 (เฉพาะ MC ตาม Business Rule 1) · ไม่อยู่ใน AC ตรง ๆ — เพิ่มเพราะเสี่ยงซ่อนทั้งระบบ
```

### TC-SBH-3609-013 - ตรวจสอบผู้ป่วยที่เพิ่มเองในเหตุการณ์ไม่มีเลขลำดับนำหน้าชื่อ

Status: Not Run · Priority: Medium · Labels: … + QA Case : Edge + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3609-013
Case Type: Edge
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > คัดกรอง > แท็บ ผู้ป่วยหลายคน
2. รายการเหตุการณ์ > เปิดเหตุการณ์ MC B
3. ช่องค้นหาผู้ป่วย กรอก HN ของผู้ป่วยที่มีชื่อจริง > เพิ่มเข้าเหตุการณ์
4. ดูชื่อผู้ป่วยรายนี้ในรายการฝั่งซ้าย

## Expected Result
ชื่อแสดงตามทะเบียน (คำนำหน้า ชื่อ นามสกุล) ไม่มีเลขลำดับนำหน้า

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 · กฎจากผู้ใช้ 3 พ.ย. 2026: เลขนำหน้าเฉพาะผู้ป่วยที่ระบบสร้างอัตโนมัติ · dev-x 3 พ.ย. แสดง "01 นาง AUTO Ttl2371P1031111358" (MCI-20261031-93B562) → คาดว่า Fail
```
