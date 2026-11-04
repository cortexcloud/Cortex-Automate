# Draft Test Structure — SBH-3610

> สถานะ: **สร้างใน Linear แล้ว 3 พ.ย. 2026** (ผู้ใช้พิมพ์ "สร้างได้" · ยืนยันสร้างด้วย connector บัญชี Pearsu → ช่อง "สร้างโดย" = Pearsu · assignee = Suchat)
> - EXE SBH-3850 · TS-HPY SBH-3853 (TC-001–014 = SBH-3858 / 3860 / 3862 / 3864 / 3866 / 3869 / 3870 / 3871 / 3872 / 3873 / 3874 / 3875 / 3876 / 3877) · TS-EDG SBH-3855 (TC-015 = SBH-3878)
> - ชุดนี้ = EXE 1 + Scenario 2 (HPY / EDG) + TC 15 = 18 ใบ
> - **Draft Coverage**: AC ในการ์ดเหลือข้อเดียว (ข้อ 2 — ข้อ 1 Custom Form ถูกขีดฆ่า) · ยึด AC 2 + รูป "ตรวจสอบก่อนส่ง Pherplus" ในการ์ด (รูป Custom Form ถูกขีดฆ่า ไม่ใช้)
> - **หน้านี้ยังไม่ขึ้น dev-x** (สำรวจ 3 พ.ย. 2026 · ไฟล์แอป `index-D-2VfyUS.js` · ไม่มีข้อความ "ตรวจสอบส่ง PHER+" / สิทธิ์ `pher-plus:view` · เมนู Super_User / Nurse / Doctor ไม่มีรายการ PHER+) → ทางเข้าเมนู / role / ชื่อหัวส่วนที่ 1 ยังยืนยันไม่ได้ ต้องกลับมาเทียบกับหน้าจริงหลัง deploy
> - PR (ดูได้แค่ชื่อ): cortex-ui #2645 "add PHER+ data viewer panel for ER encounters" · cortex-api #3030 "add PHER+ viewer endpoint, seat belt risk3 and ER arrival columns" · cortex-testing #1648 "deliver PHER+ trauma detail 1.1.0 and seed pher-plus:view" · openehr-repo #429 "add seat belt and three trauma detail fields to PHER+ trauma template" — ทั้งหมด V2.10.0 ตรงกับ label VERSION 2.10.0
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972 · TC ใช้ label `QA : Manual`
> - ค่าที่เสนอ (รอยืนยัน): Run Type CT (การ์ดผูก Cycle) · Version 2.10.0 · Env Dev-X · QA Module : ER · QA Sub-module / Feature : **PHER+ (label ใหม่ — สร้างแล้ว 3 พ.ย. 2026 ตามที่ผู้ใช้สั่ง "สร้างเลย" · id d992fc4b · อยู่ในกลุ่ม QA Sub-module / Feature ระดับ workspace · ผู้สร้างในประวัติ = Pearsu เพราะ connector เป็นบัญชีนั้น)**

Requirement: SBH-3610 — [ER] [ PherPlus ] สร้าง Form สำหรับข้อมูล PherPlus
URL: https://linear.app/cortexcloud/issue/SBH-3610/er-pherplus-สราง-form-สำหรบขอมล-pherplus
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · Estimate: 1 Point · State: In Review
Labels: Natthaphat ( MOD ) 🙈 · 🍄 New Feature · VERSION 2.10.0 · Assignee: jetsadaporn (Dew) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Relations: ไม่มี · Sub-Issue: CTXN-12638 "Design Task" (Designing — ไม่มี TC) · คอมเมนต์: ไม่มี
Scope / Version = 2.10.0

Business Rule ในการ์ด
1. ข้อมูลประกอบ Form / UI มาจาก 3 ที่: เอกสาร Pher/is · Web PHERPlus · Data dictionary
2. วัตถุประสงค์: ส่ง Pher · 43 แฟ้ม

AC ในการ์ด
1. ~~สร้าง Custom Form → สำหรับ PHerPlus Form~~ (ขีดฆ่า — ไม่ทดสอบ)
2. สร้างหน้า UI สำหรับ Prefilled ข้อมูลก่อนส่ง — 2.1 Data base PHerPlus · 2.2 อิงตาม Data dictionary PHERplus · 2.3 อิงตาม Form เอกสารของโรงพยาบาล

สิ่งที่เห็นในรูป "ตรวจสอบก่อนส่ง Pherplus"
- แท็บ "ตรวจสอบส่ง PHER+" ข้างแท็บ คัดกรอง ER / สร้างฟอร์ม · หัวแถบ "ตรวจสอบส่ง PHER+ (สำหรับเจ้าหน้าที่ธุรการ)" · ปุ่ม บันทึก
- ส่วนที่ 1 (หัวส่วนอยู่นอกรูป): อายุ ปี / เดือน / วัน · สัญชาติ · ประเภทที่อยู่ · เบอร์โทรศัพท์ · รหัสอาชีพ · ขยายอาชีพ · ที่อยู่ปัจจุบัน · สิทธิการรักษา 1–3
- ส่วนที่ 2 "ข้อมูลการมาโรงพยาบาลและการดูแลก่อนถึง รพ. (PHER+ ลำดับที่ 47, 56–73)" ป้าย "แหล่งข้อมูล: พยาบาลคัดกรอง (ER Arrival & Triage)"
- ส่วนที่ 3 "ข้อมูลการเกิดเหตุและปัจจัยเสี่ยง Trauma Detail (PHER+ ลำดับที่ 28, 30–46, 48–55, 74–87)" ป้าย "แหล่งข้อมูล: พยาบาลคัดกรอง / ฟอร์ม Trauma Detail"
- ทุกช่องมีรหัส field PHER+ ในวงเล็บเหลี่ยม (เช่น `[pmi ข้อ 56]`) + ไอคอน (i) · ค่าแสดงแบบ "รหัส - ชื่อ" (เช่น "1 - ไทย" · "4200 - สิทธิประกันสังคม") · ช่องไม่มีข้อมูลแสดงข้อความแนะนำ (เช่น "ระบุสิทธิการรักษา 2 (ถ้ามี)")

## AC → TC

| AC | เรื่อง | TC |
|---|---|---|
| 2 | มีหน้า UI ตรวจสอบก่อนส่ง PHER+ | 001 |
| 2.3 | จัดส่วนตามเอกสารของโรงพยาบาล + ลำดับ PHER+ + แหล่งข้อมูล | 002 · 003 |
| 2.2 | รหัส field / รูปแบบค่าตาม Data dictionary | 004 · 005 |
| 2 (Prefilled) | ส่วนที่ 1 ข้อมูลผู้ป่วย | 006 · 007 · 008 |
| 2 (Prefilled) | ส่วนที่ 2 จากคัดกรอง ER | 009 · 010 |
| 2 (Prefilled) | ส่วนที่ 3 จากฟอร์ม Trauma Detail / Visit | 011 · 012 · 013 · 014 |
| 2 (Prefilled) | ช่องที่ไม่มีข้อมูลต้นทาง | 015 |

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | แสดงหน้า "ตรวจสอบส่ง PHER+" ของผู้ป่วย ER | เปิดแท็บ "ตรวจสอบส่ง PHER+" · หัวแถบ "ตรวจสอบส่ง PHER+ (สำหรับเจ้าหน้าที่ธุรการ)" |
| 002 | HPY | แสดงหัวส่วนที่ 2 พร้อมลำดับ PHER+ และแหล่งข้อมูล | หัวส่วน "2. ข้อมูลการมาโรงพยาบาลและการดูแลก่อนถึง รพ. (PHER+ ลำดับที่ 47, 56–73)" · ป้าย "แหล่งข้อมูล: พยาบาลคัดกรอง (ER Arrival & Triage)" |
| 003 | HPY | แสดงหัวส่วนที่ 3 พร้อมลำดับ PHER+ และแหล่งข้อมูล | หัวส่วน "3. ข้อมูลการเกิดเหตุและปัจจัยเสี่ยง Trauma Detail (PHER+ ลำดับที่ 28, 30–46, 48–55, 74–87)" · ป้าย "แหล่งข้อมูล: พยาบาลคัดกรอง / ฟอร์ม Trauma Detail" |
| 004 | HPY | ตรวจสอบป้ายชื่อช่องแสดงรหัส field PHER+ และไอคอน (i) | ทุกช่องมีรหัส field PHER+ ในวงเล็บเหลี่ยมต่อท้ายชื่อ และมีไอคอน (i) |
| 005 | HPY | แสดงค่าที่ Prefill ในรูปแบบ "รหัส - ชื่อ" ตาม Data dictionary | ช่องแบบรหัสแสดง "รหัส - ชื่อ" เช่น สัญชาติ "1 - ไทย" · สิทธิการรักษา 1 "4200 - สิทธิประกันสังคม" |
| 006 | HPY | Prefill อายุ ปี / เดือน / วัน ของผู้ป่วย | อายุ ปี / เดือน / วัน ตรงกับอายุของผู้ป่วยที่แสดงในหน้า Visit |
| 007 | HPY | Prefill สัญชาติ อาชีพ เบอร์โทรศัพท์ และที่อยู่จากทะเบียนผู้ป่วย | สัญชาติ · รหัสอาชีพ · เบอร์โทรศัพท์ · ที่อยู่ปัจจุบัน ตรงกับทะเบียนผู้ป่วย |
| 008 | HPY | Prefill สิทธิการรักษา 1 จากสิทธิ์ของ Visit | สิทธิการรักษา 1 ตรงกับสิทธิ์หลักของ Visit |
| 009 | HPY | Prefill ข้อมูลการมาโรงพยาบาลจากคัดกรอง ER | ประเภทการมาโรงพยาบาล · ผู้นำส่ง · ระดับชุดปฏิบัติการ ตรงกับที่บันทึกในคัดกรอง ER |
| 010 | HPY | Prefill การดูแลระหว่างนำส่ง (Pre-hospital Care) | ดูแลการหายใจ · ห้ามเลือด · Splint/Slap C-Spine · Splint/Slap อื่นๆ · IV Fluid ตรงกับที่บันทึกไว้ |
| 011 | HPY | Prefill วันและเวลาที่เกิดเหตุ / มาถึง รพ. จากฟอร์ม Trauma Detail | วันเวลาที่เกิดเหตุ และวันเวลาที่มาถึง รพ. ตรงกับฟอร์ม Trauma Detail ไม่คลาดเคลื่อน |
| 012 | HPY | Prefill สถานที่เกิดเหตุจากฟอร์ม Trauma Detail | จังหวัด · อำเภอ · ตำบล ที่เกิดเหตุ ตรงกับฟอร์ม Trauma Detail |
| 013 | HPY | Prefill ปัจจัยเสี่ยงจากฟอร์ม Trauma Detail | แอลกอฮอล์ · เข็มขัดนิรภัย · หมวกนิรภัย · โทรศัพท์ ตรงกับฟอร์ม Trauma Detail |
| 014 | HPY | Prefill อุบัติเหตุหมู่จาก Visit | ช่อง อุบัติเหตุหมู่ [mass_casualty ข้อ 30] แสดง "ไม่เป็นอุบัติเหตุหมู่ (รหัส 0)" ตาม Visit |
| 015 | EDG | ตรวจสอบช่องที่ไม่มีข้อมูลต้นทางแสดงเป็นค่าว่าง | สิทธิการรักษา 2 / 3 ว่าง แสดงข้อความแนะนำ "ระบุสิทธิการรักษา 2 (ถ้ามี)" / "ระบุสิทธิการรักษา 3 (ถ้ามี)" ไม่มีค่าอื่นเติมมาเอง |

## Requirement gap (ไม่ทำเป็น TC — รอผู้ใช้ / BA ตัดสิน)

**expected behavior**
- ทางเข้าหน้า (เมนูขวา / ซ้าย / แท็บ) — การ์ดไม่ระบุ · รูปเห็นแค่แท็บ "ตรวจสอบส่ง PHER+" · หน้ายังไม่ขึ้น dev-x
- ชื่อหัวส่วนที่ 1 และป้ายแหล่งข้อมูลของส่วนที่ 1 — อยู่นอกรูป · มีส่วนอื่นต่อจากส่วนที่ 3 อีกไหม (เช่น ICD10 / BR / AIS ลำดับ 111–128 ที่อยู่ในฟอร์ม Trauma Detail)
- ปุ่ม **บันทึก** ทำอะไร — แก้ค่าที่ Prefill แล้วเก็บได้ไหม · บันทึกแล้วกลับไปทับข้อมูลต้นทาง (คัดกรอง / ฟอร์ม Trauma Detail) หรือเก็บแยก
- การส่ง PHER+ / ส่งออก 43 แฟ้ม — Business Rule บอกเป็นวัตถุประสงค์ แต่ AC ไม่มีขั้นส่ง
- ไอคอน (i) แสดงอะไร (คำอธิบายจาก Data dictionary?)
- การดูแลระหว่างนำส่ง (ลำดับ 64–73) ดึงจากคัดกรอง ER (ตามป้ายส่วนที่ 2) หรือจากส่วน "การดูแลระหว่างนำส่ง" ของฟอร์ม Trauma Detail (ตามที่เคยทำใน SBH-2952)
- อายุ ปี / เดือน / วัน คำนวณ ณ วันไหน (วันมาถึง รพ. / วันเกิดเหตุ / วันที่เปิดหน้า)
- แก้ข้อมูลต้นทางหลังเปิดหน้านี้แล้ว (เช่น แก้คัดกรอง) — หน้านี้อัปเดตตามไหม หรือค้างค่าที่บันทึกในหน้านี้
- ช่องใหม่จาก PR (เข็มขัดนิรภัย risk3 + 3 ช่อง Trauma Detail ใหม่ · template 1.1.0) — การ์ดไม่ได้ระบุชื่อช่อง

**validation**
- มีช่องบังคับก่อนส่ง / ก่อนบันทึกไหม · ข้อความแจ้งเตือนเมื่อขาด
- ค่าที่ไม่อยู่ใน Data dictionary ต้องทำอย่างไร

**permission / role**
- "สำหรับเจ้าหน้าที่ธุรการ" — role ไหนเห็นหน้านี้ · Nurse / Doctor เห็นไหม (PR มีสิทธิ์ `pher-plus:view`)
- เห็นแล้วแก้ได้ไหม หรือดูอย่างเดียว

**error handling**
- โหลดข้อมูลไม่สำเร็จ ต้องแสดงอะไร

**edge cases**
- ผู้ป่วย Non-Trauma (ไม่มีฟอร์ม Trauma Detail) — ส่วนที่ 3 ต้องแสดงอย่างไร หรือไม่แสดงหน้านี้เลย
- Visit ปิดแล้ว — ยังเปิด / แก้ / บันทึกได้ไหม
- Visit เป็นอุบัติเหตุหมู่ — ช่อง mass_casualty แสดงรหัสอะไร
- วันที่ในส่วนที่ 3 รูปแสดงปี ค.ศ. (16/10/2026) แต่ ER Summary แสดง พ.ศ. — ต้องเป็นแบบไหน

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user ที่เห็นหน้า ตรวจสอบส่ง PHER+** (role รอยืนยัน — การ์ดเขียน "สำหรับเจ้าหน้าที่ธุรการ")
- **ผู้ป่วย ER Trauma P** (Visit ยังไม่ปิด) — ทะเบียนมี สัญชาติ / อาชีพ / เบอร์โทร / ที่อยู่ ครบ · สิทธิ์หลัก 1 สิทธิ์ ไม่มีสิทธิ์ 2 / 3 · คัดกรอง ER แบบ Trauma มาด้วย EMS (ระบุผู้นำส่ง + ระดับชุดปฏิบัติการ + การดูแลระหว่างนำส่ง) · บันทึกฟอร์ม Trauma Detail For Pher Plus ครบ (วันเวลาเกิดเหตุ / สถานที่ / ปัจจัยเสี่ยง) · Visit ไม่เป็นอุบัติเหตุหมู่ — ใช้ทุก TC
- ผู้ป่วย T1 ของ SBH-3182 (HN 6932488) **Visit ปิดแล้ว** — ถ้าหน้านี้ต้องใช้ Visit ที่ยังไม่ปิด ต้องเตรียมผู้ป่วยใหม่

---

## EXE - CT - 2.10.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 New Feature, VERSION 2.10.0, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : PHER+, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.10.0
- Module: ER — ตรวจสอบส่ง PHER+
- Requirement ที่อ้างอิง: SBH-3610 — [ER] [ PherPlus ] สร้าง Form สำหรับข้อมูล PherPlus
- Environment: Dev-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- หน้า UI ตรวจสอบส่ง PHER+ (สำหรับเจ้าหน้าที่ธุรการ)
- จัดส่วน / ลำดับ PHER+ / แหล่งข้อมูล / รหัส field ตาม Data dictionary
- ข้อมูล Prefilled จากทะเบียนผู้ป่วย · คัดกรอง ER · ฟอร์ม Trauma Detail · Visit

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- Draft Coverage: AC มีข้อเดียว อิงรูปในการ์ดประกอบ · นอก scope: ปุ่มบันทึก · การส่ง PHER+ / 43 แฟ้ม · สิทธิ์ (การ์ดไม่ระบุ — ดู Requirement gap)
```

---

## TS-SBH-3610-HPY - ตรวจสอบข้อมูล PHER+ ที่ Prefilled ก่อนส่ง

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : PHER+ + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3610-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER — ตรวจสอบส่ง PHER+
- Requirement ที่อ้างอิง: SBH-3610 — [ER] [ PherPlus ] สร้าง Form สำหรับข้อมูล PherPlus

วัตถุประสงค์
- ยืนยันว่าหน้าตรวจสอบส่ง PHER+ แสดงข้อมูลผู้ป่วย ER ที่ดึงมาเติมไว้ (Prefilled) ครบและตรงกับแหล่งข้อมูล จัดตาม Data dictionary และเอกสารของโรงพยาบาล

ขอบเขต Requirement
- AC 2 สร้างหน้า UI สำหรับ Prefilled ข้อมูลก่อนส่ง
- AC 2.2 อิงตาม Data dictionary PHERplus
- AC 2.3 อิงตาม Form เอกสารของโรงพยาบาล

ความเสี่ยง
- ค่าที่ Prefill ไม่ตรงกับแหล่งข้อมูล → ส่ง PHER+ / 43 แฟ้ม ผิด
- รหัส field / รหัสค่า ไม่ตรง Data dictionary → ระบบปลายทางรับข้อมูลไม่ได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ดูหัวข้อ "ข้อมูลตั้งต้น" ในไฟล์ร่าง
- ทางเข้าหน้ายังไม่ยืนยัน (หน้ายังไม่ขึ้น dev-x 3 พ.ย. 2026) — ปรับ Test Step หลัง deploy
```

### TC-SBH-3610-001 - แสดงหน้า "ตรวจสอบส่ง PHER+" ของผู้ป่วย ER

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : PHER+ + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3610-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิด Visit ของผู้ป่วย ER Trauma P
3. เปิดหน้า ตรวจสอบส่ง PHER+ (ทางเข้ารอยืนยันหลัง deploy)

## Expected Result
เปิดแท็บ "ตรวจสอบส่ง PHER+" · หัวแถบแสดง "ตรวจสอบส่ง PHER+ (สำหรับเจ้าหน้าที่ธุรการ)"

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2
```

### TC-SBH-3610-002 - แสดงหัวส่วนที่ 2 พร้อมลำดับ PHER+ และแหล่งข้อมูล

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3610-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดหน้า ตรวจสอบส่ง PHER+ ของผู้ป่วย ER Trauma P
3. ดูหัวส่วนที่ 2

## Expected Result
หัวส่วน "2. ข้อมูลการมาโรงพยาบาลและการดูแลก่อนถึง รพ. (PHER+ ลำดับที่ 47, 56–73)" · ป้าย "แหล่งข้อมูล: พยาบาลคัดกรอง (ER Arrival & Triage)"

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2.3
```

### TC-SBH-3610-003 - แสดงหัวส่วนที่ 3 พร้อมลำดับ PHER+ และแหล่งข้อมูล

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3610-003
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดหน้า ตรวจสอบส่ง PHER+ ของผู้ป่วย ER Trauma P
3. ดูหัวส่วนที่ 3

## Expected Result
หัวส่วน "3. ข้อมูลการเกิดเหตุและปัจจัยเสี่ยง Trauma Detail (PHER+ ลำดับที่ 28, 30–46, 48–55, 74–87)" · ป้าย "แหล่งข้อมูล: พยาบาลคัดกรอง / ฟอร์ม Trauma Detail"

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2.3
```

### TC-SBH-3610-004 - ตรวจสอบป้ายชื่อช่องแสดงรหัส field PHER+ และไอคอน (i)

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3610-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดหน้า ตรวจสอบส่ง PHER+ ของผู้ป่วย ER Trauma P
3. ดูป้ายชื่อช่องทุกช่องในทุกส่วน

## Expected Result
ทุกช่องมีรหัส field PHER+ ในวงเล็บเหลี่ยมต่อท้ายชื่อ (เช่น อายุ [age/month/day] · ประเภทการมาโรงพยาบาล [pmi ข้อ 56]) และมีไอคอน (i)

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2.2
```

### TC-SBH-3610-005 - แสดงค่าที่ Prefill ในรูปแบบ "รหัส - ชื่อ" ตาม Data dictionary

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3610-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดหน้า ตรวจสอบส่ง PHER+ ของผู้ป่วย ER Trauma P
3. ดูค่าในช่องแบบเลือก (สัญชาติ · ประเภทที่อยู่ · รหัสอาชีพ · สิทธิการรักษา 1 · ประเภทการมาโรงพยาบาล)

## Expected Result
ค่าแสดงในรูปแบบ "รหัส - ชื่อ" ตาม Data dictionary เช่น สัญชาติ "1 - ไทย" · สิทธิการรักษา 1 "4200 - สิทธิประกันสังคม"

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2.2
```

### TC-SBH-3610-006 - Prefill อายุ ปี / เดือน / วัน ของผู้ป่วย

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3610-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิด Visit ของผู้ป่วย ER Trauma P > จดอายุที่แสดงบนหน้า Visit
3. เปิดหน้า ตรวจสอบส่ง PHER+ > ดูช่อง อายุ (ปี / เดือน / วัน) [age/month/day]

## Expected Result
อายุ ปี / เดือน / วัน ตรงกับอายุของผู้ป่วยที่แสดงในหน้า Visit

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 (Prefilled)
```

### TC-SBH-3610-007 - Prefill สัญชาติ อาชีพ เบอร์โทรศัพท์ และที่อยู่จากทะเบียนผู้ป่วย

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3610-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดข้อมูลทะเบียนของผู้ป่วย ER Trauma P > จด สัญชาติ · อาชีพ · เบอร์โทรศัพท์ · ที่อยู่ปัจจุบัน
3. เปิดหน้า ตรวจสอบส่ง PHER+ > ดูช่อง สัญชาติ [nationality] · รหัสอาชีพ [occu] · เบอร์โทรศัพท์ [tel] · ที่อยู่ปัจจุบัน [address, tumbon, ampur, changwat]

## Expected Result
สัญชาติ · รหัสอาชีพ · เบอร์โทรศัพท์ · ที่อยู่ปัจจุบัน ตรงกับทะเบียนผู้ป่วย

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 (Prefilled)
```

### TC-SBH-3610-008 - Prefill สิทธิการรักษา 1 จากสิทธิ์ของ Visit

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3610-008
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิด Visit ของผู้ป่วย ER Trauma P > จดสิทธิ์หลักของ Visit
3. เปิดหน้า ตรวจสอบส่ง PHER+ > ดูช่อง สิทธิการรักษา 1 [pttype]

## Expected Result
สิทธิการรักษา 1 ตรงกับสิทธิ์หลักของ Visit

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 (Prefilled)
```

### TC-SBH-3610-009 - Prefill ข้อมูลการมาโรงพยาบาลจากคัดกรอง ER

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3610-009
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดคัดกรอง ER ของผู้ป่วย ER Trauma P > จด การมาโรงพยาบาล · ผู้นำส่ง · ระดับชุดปฏิบัติการ
3. เปิดหน้า ตรวจสอบส่ง PHER+ > ดูส่วนที่ 2 ช่อง ประเภทการมาโรงพยาบาล [pmi] · ผู้นำส่ง [atohosp] · ระดับชุดปฏิบัติการฉุกเฉิน [ems]

## Expected Result
ประเภทการมาโรงพยาบาล · ผู้นำส่ง · ระดับชุดปฏิบัติการ ตรงกับที่บันทึกในคัดกรอง ER

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 (Prefilled) · แหล่งข้อมูลตามป้ายส่วนที่ 2
```

### TC-SBH-3610-010 - Prefill การดูแลระหว่างนำส่ง (Pre-hospital Care)

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3610-010
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. จดค่าการดูแลระหว่างนำส่งที่บันทึกไว้ของผู้ป่วย ER Trauma P (แหล่งข้อมูลรอยืนยัน — คัดกรอง ER หรือฟอร์ม Trauma Detail)
3. เปิดหน้า ตรวจสอบส่ง PHER+ > ดูส่วนที่ 2 "การดูแลระหว่างนำส่ง (Pre-hospital Care ลำดับที่ 64–73)"

## Expected Result
ดูแลการหายใจ [airway] · ห้ามเลือด [blood] · Splint/Slap C-Spine [splintc] · Splint/Slap อื่นๆ [splint] · IV Fluid [iv] และช่องระบุรายละเอียด ตรงกับที่บันทึกไว้

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 (Prefilled) · แหล่งข้อมูลยังไม่ชัด — ดู Requirement gap
```

### TC-SBH-3610-011 - Prefill วันและเวลาที่เกิดเหตุ / มาถึง รพ. จากฟอร์ม Trauma Detail

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3610-011
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดฟอร์ม Trauma Detail For Pher Plus ของผู้ป่วย ER Trauma P > จด วันและเวลาที่เกิดเหตุ · วันและเวลาที่มาถึง รพ.
3. เปิดหน้า ตรวจสอบส่ง PHER+ > ดูส่วนที่ 3 ช่อง [adate/atime] · [hdate/htime]

## Expected Result
วันเวลาที่เกิดเหตุ และวันเวลาที่มาถึง รพ. ตรงกับฟอร์ม Trauma Detail ไม่คลาดเคลื่อน (ไม่ต่าง 7 ชั่วโมง)

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 (Prefilled) · เช็กลิสต์วันที่ / เวลา — เวลาที่แสดงตรงกับเวลาที่บันทึก
```

### TC-SBH-3610-012 - Prefill สถานที่เกิดเหตุจากฟอร์ม Trauma Detail

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3610-012
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดฟอร์ม Trauma Detail For Pher Plus ของผู้ป่วย ER Trauma P > จด จังหวัด · อำเภอ · ตำบล ที่เกิดเหตุ
3. เปิดหน้า ตรวจสอบส่ง PHER+ > ดูส่วนที่ 3 ช่อง จังหวัดที่เกิดเหตุ [aplace] · อำเภอ [aampur] · ตำบล [atumbon]

## Expected Result
จังหวัด · อำเภอ · ตำบล ที่เกิดเหตุ ตรงกับฟอร์ม Trauma Detail

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 (Prefilled)
```

### TC-SBH-3610-013 - Prefill ปัจจัยเสี่ยงจากฟอร์ม Trauma Detail

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3610-013
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดฟอร์ม Trauma Detail For Pher Plus ของผู้ป่วย ER Trauma P > จด แอลกอฮอล์ผู้บาดเจ็บ · เข็มขัดนิรภัย · หมวกนิรภัย · โทรศัพท์
3. เปิดหน้า ตรวจสอบส่ง PHER+ > ดูช่องปัจจัยเสี่ยงในส่วนที่ 3

## Expected Result
แอลกอฮอล์ผู้บาดเจ็บ · เข็มขัดนิรภัย · หมวกนิรภัย · โทรศัพท์ ตรงกับฟอร์ม Trauma Detail

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 (Prefilled) · หัวส่วนที่ 3 "ข้อมูลการเกิดเหตุและปัจจัยเสี่ยง"
```

### TC-SBH-3610-014 - Prefill อุบัติเหตุหมู่จาก Visit

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3610-014
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดหน้า ตรวจสอบส่ง PHER+ ของผู้ป่วย ER Trauma P (Visit ไม่เป็นอุบัติเหตุหมู่)
3. ดูส่วนที่ 3 ช่อง อุบัติเหตุหมู่ (จาก Visit) [mass_casualty ข้อ 30]

## Expected Result
ช่อง อุบัติเหตุหมู่ แสดง "ไม่เป็นอุบัติเหตุหมู่ (รหัส 0)" ตาม Visit

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 (Prefilled)
```

---

## TS-SBH-3610-EDG - ช่องที่ไม่มีข้อมูลต้นทางในหน้าตรวจสอบส่ง PHER+

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : PHER+ + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3610-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER — ตรวจสอบส่ง PHER+
- Requirement ที่อ้างอิง: SBH-3610 — [ER] [ PherPlus ] สร้าง Form สำหรับข้อมูล PherPlus

วัตถุประสงค์
- ยืนยันว่าช่องที่ไม่มีข้อมูลต้นทางแสดงว่าง ไม่มีค่าเติมมาเอง

ขอบเขต Requirement
- AC 2 สร้างหน้า UI สำหรับ Prefilled ข้อมูลก่อนส่ง

ความเสี่ยง
- ระบบเติมค่า default / ค่าของผู้ป่วยอื่นลงช่องที่ไม่มีข้อมูล → ส่ง PHER+ ผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-3610-015 - ตรวจสอบช่องที่ไม่มีข้อมูลต้นทางแสดงเป็นค่าว่าง

Status: Not Run · Priority: Medium · Labels: … + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3610-015
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ที่เห็นหน้า ตรวจสอบส่ง PHER+
2. เปิดหน้า ตรวจสอบส่ง PHER+ ของผู้ป่วย ER Trauma P (มีสิทธิ์หลัก 1 สิทธิ์ ไม่มีสิทธิ์ 2 / 3)
3. ดูช่อง สิทธิการรักษา 2 [pttype2] · สิทธิการรักษา 3 [pttype3]

## Expected Result
สิทธิการรักษา 2 / 3 ว่าง แสดงข้อความแนะนำ "ระบุสิทธิการรักษา 2 (ถ้ามี)" / "ระบุสิทธิการรักษา 3 (ถ้ามี)" ไม่มีค่าอื่นเติมมาเอง

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 2 (Prefilled) · เทคนิค: Equivalence Partitioning — กลุ่มไม่มีข้อมูลต้นทาง
```
