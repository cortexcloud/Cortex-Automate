# Draft Test Structure — SBH-2952

> สถานะ: **สร้างใน Linear แล้ว (2026-10-31)** — ผู้ใช้พิมพ์ "สร้างได้"
> - EXE SBH-3506 (EXE - CT - 2.9.1) → TS-HPY SBH-3508 (TC 001–016 = SBH-3513, 3514, 3516, 3518, 3520, 3522, 3523, 3525, 3527, 3529, 3530, 3532, 3534, 3536, 3538, 3540) · TS-EDG SBH-3510 (TC 017–021 = SBH-3542, 3544, 3545, 3547, 3548)
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee + "สร้างโดย" = Suchat (connector เป็นบัญชี Suchat แล้ว) · milestone ER - เก็บตก, edge case · สร้าง label ใหม่ `QA Sub-module / Feature : Trauma Detail Form`
> - ชุดนี้ = EXE 1 + Scenario 2 (HPY / EDG) + TC 21 = 24 ใบ
> - scope (ผู้ใช้สั่ง 31 ต.ค.): AC ของการ์ด + รูปในการ์ด + prototype `Downloads/index.html` **แบบที่ 2** (เมนูขวา → สร้างฟอร์ม → เลือก Trauma Detail For Pher Plus) · รายละเอียดตรงกับ In Scope ของ Sub-Issue SBH-2951
> - Open points ของ BA ใน SBH-2951 และเรื่องที่การ์ด / prototype ไม่ตอบ อยู่ในหัวข้อ "Requirement gap" ท้ายไฟล์ (ไม่สร้างเป็น TC)
> - ค่าที่ใช้: Run Type CT (การ์ดผูก Cycle) · Version 2.9.1 (label การ์ด — ผู้ใช้ยืนยัน แม้ PR ขึ้นต้น V2.10.0) · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : **Trauma Detail Form (label ใหม่ — ผู้ใช้อนุมัติให้สร้าง)**
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972 · TC ใช้ label `QA : Manual`
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — assignee ต้องใส่ ID ของ Suchat (`ac7ed47a-b74d-4a54-992f-5d09acad47f2`) · เช็กบัญชีก่อนสร้าง
> - ⚠️ TC 016 (ข้อมูลแสดงในแท็บ ประวัติ Custom Form) อิงพฤติกรรมเดิมของ Custom Form ในแอป (Doctor Progress Note) — การ์ดไม่ได้เขียนไว้ตรง ๆ รอผู้ใช้ยืนยัน

Requirement: SBH-2952 — [ ER ] [ Trauma ] Trauma Detail Form
URL: https://linear.app/cortexcloud/issue/SBH-2952/er-trauma-trauma-detail-form
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: High · Estimate: 1 Point · State: In Review
Labels: Natthaphat ( MOD ) 🙈 · 🍄 New Feature · VERSION 2.9.1 · Assignee: jetsadaporn (Dew) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Sub-Issue: SBH-2951 "[ ER ] [ Trauma ] Trauma Detail For PHER+ form" (Triage — สเปกฟิลด์ + code set + BR auto-map) · ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี
Relations (related): SBH-3182 (ER Summary Trauma — แสดงข้อมูลจากฟอร์มนี้ · นอก scope)
PR ที่แนบ: cortex-testing #1581 "register ER trauma detail for PHER+ component" · openehr-repo #401 "add ER trauma detail for PHER+ component template"
หน้าจอ: หน้าผู้ป่วย ER → เมนูขวา `สร้างฟอร์ม` → select `เลือกฟอร์ม` → Trauma Detail For Pher Plus · ดูย้อนหลัง: เมนูซ้าย ประวัติการรักษา → แท็บ ประวัติ Custom Form
หมายเหตุ: ไฟล์ Reference ในการ์ด (ลิงก์ uploads.linear.app) ยังไม่ได้เปิด

## AC → TC

| AC / ที่มา | Expected | TC |
|---|---|---|
| AC 1 | เพิ่ม Custom Form Trauma Detail Form ให้เลือกจากเมนู สร้างฟอร์ม | 001 · 002 |
| AC 1.1 (PHER PLUS) · 2951 ข้อ 1 | การดูแลระหว่างนำส่ง 5 หัวข้อ Dropdown + ระบุรายละเอียด · code set 0/1/2/3/N · ค่าเริ่มต้นว่าง | 003 · 004 · 005 |
| รูปในการ์ด · 2951 ข้อ 2 | ฟิลด์ Trauma Detail ครบ · ปุ่มเลือก 3 ตัวเลือกเริ่มที่ ไม่ทราบ | 006 · 007 |
| 2951 ข้อ 2 · prototype | ประวัติสลบ: สลบ → กรอกชั่วโมง / นาทีได้ · เปลี่ยนกลับ → ล้างค่าและปิดช่อง | 008 · 017 |
| 2951 ข้อ 3 | ICD10 สาเหตุ (V, W, X, Y) + ICD10 การบาดเจ็บ / BR / AIS | 009 · 010 |
| 2951 ข้อ 3 | BR auto-map จาก ICD-10 หมวด S / T (1–6) · ไม่แมพ = 9 | 011 · 012 · 018 |
| 2951 ข้อ 3 | ICD10 การบาดเจ็บ + BR + AIS สูงสุด 6 รายการ | 013 · 019 · 020 |
| prototype | ลบรายการแล้วเลขลำดับเรียงใหม่ · เหลือ 1 แถวกดลบ = ล้างค่า | 014 · 021 |
| AC 1.1 (บันทึกข้อมูล) | บันทึกฟอร์มสำเร็จ · ดูย้อนหลังได้ | 015 · 016 |

> เทคนิค: BR auto-map ใช้ Equivalence Partitioning — กลุ่มรหัส S ที่แมพได้ / กลุ่มรหัส T ที่แมพได้ / กลุ่มที่ไม่แมพ (= 9) กลุ่มละ 1 ค่า ·
> จำนวนรายการ ICD10 ใช้ BVA ที่ขอบบน 6 (6 = ได้ · 7 = ไม่ได้) และขอบล่าง 1 (ลบแถวสุดท้ายไม่ได้ ล้างค่าแทน) ·
> ประวัติสลบใช้ State Transition (ไม่สลบ → สลบ → ไม่สลบ)

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | ตรวจสอบเมนู สร้างฟอร์ม มีตัวเลือก Trauma Detail For Pher Plus | ช่อง เลือกฟอร์ม มีตัวเลือก Trauma Detail For Pher Plus |
| 002 | HPY | แสดงฟอร์ม Trauma Detail For Pher Plus เมื่อเลือกจากช่อง เลือกฟอร์ม | แสดง 3 ส่วน: การดูแลระหว่างนำส่ง · Trauma Detail · การวินิจฉัยสาเหตุภายนอกและความรุนแรงของการบาดเจ็บ |
| 003 | HPY | ตรวจสอบหัวข้อในส่วน การดูแลระหว่างนำส่ง | 5 หัวข้อ ดูแลการหายใจ / ห้ามเลือด / Splint/Slap C-Spine / Splint/Slap อื่นๆ / IV Fluid · แต่ละข้อมี Dropdown + ช่อง ระบุรายละเอียด |
| 004 | HPY | ตรวจสอบตัวเลือก Dropdown การดูแลระหว่างนำส่ง | มี 5 ตัวเลือก 0 ไม่มี · 1 มี-เหมาะสม · 2 มี-ไม่เหมาะสม · 3 ไม่จำเป็น · N ไม่ระบุ |
| 005 | HPY | ตรวจสอบค่าเริ่มต้น Dropdown การดูแลระหว่างนำส่ง เมื่อเปิดฟอร์มใหม่ | ทั้ง 5 หัวข้อเป็นค่าว่าง (เลือกการดูแลระหว่างนำส่ง) |
| 006 | HPY | ตรวจสอบฟิลด์ในส่วน Trauma Detail | มีฟิลด์ครบตามรายการใน Test Data |
| 007 | HPY | ตรวจสอบค่าเริ่มต้นของปุ่มเลือกในส่วน Trauma Detail | บาดเจ็บจากการทำงาน / แอลกอฮอล์ / ยา-วัตถุออกฤทธิ์ / หมวกนิรภัย / โทรศัพท์ = ไม่ทราบ · ประวัติสลบ = ไม่สลบ |
| 008 | HPY | ทดสอบกรอกระยะเวลาสลบเมื่อเลือกประวัติสลบ = สลบ | ช่อง ชั่วโมง และ นาที กรอกได้ · ค่าที่กรอกแสดงถูกต้อง |
| 009 | HPY | ตรวจสอบส่วน การวินิจฉัยสาเหตุภายนอกและความรุนแรงของการบาดเจ็บ | มี ICD10 สาเหตุ (V, W, X, Y) · แถว #1 ICD10 / BR / AIS · ตัวนับ รายการวินิจฉัย 1 / 6 · ปุ่ม + เพิ่มรายการ |
| 010 | HPY | ตรวจสอบรหัสใน ICD10 สาเหตุ เป็นหมวด V W X Y | ทุกรายการขึ้นต้นด้วย V / W / X / Y · เลือกแล้วแสดงรหัส + ชื่อ |
| 011 | HPY | ตรวจสอบ BR ถูกกำหนดอัตโนมัติเมื่อเลือก ICD10 การบาดเจ็บหมวด S | เลือก S22.3 → BR = 3 - Thorax |
| 012 | HPY | ตรวจสอบ BR ถูกกำหนดอัตโนมัติเมื่อเลือก ICD10 การบาดเจ็บหมวด T | เลือก T00.9 → BR = 6 - External & body surface |
| 013 | HPY | ทดสอบเพิ่มรายการ ICD10 BR AIS | มีแถว #2 · ตัวนับ 2 / 6 |
| 014 | HPY | ทดสอบลบรายการ ICD10 BR AIS ที่อยู่ระหว่างกลาง | แถวที่ลบหายไป · แถวที่เหลือเรียงเลขใหม่ #1 #2 · ตัวนับ 2 / 6 |
| 015 | HPY | บันทึกฟอร์ม Trauma Detail For Pher Plus ครบทุกส่วน | บันทึกสำเร็จ ไม่มีข้อความ error |
| 016 | HPY | ตรวจสอบข้อมูลฟอร์มที่บันทึกแสดงในแท็บ ประวัติ Custom Form | แสดงฟอร์ม Trauma Detail For Pher Plus · ค่าทุกช่องตรงกับที่บันทึก |
| 017 | EDG | ตรวจสอบช่องระยะเวลาสลบเมื่อเปลี่ยนจาก สลบ เป็น ไม่สลบ | ช่อง ชั่วโมง / นาที ถูกล้างค่าและกรอกไม่ได้ |
| 018 | EDG | ตรวจสอบ BR เมื่อเลือก ICD10 การบาดเจ็บที่ไม่ได้แมพกับส่วนของร่างกาย | เลือก T07 → BR = 9 - Unknown |
| 019 | EDG | ทดสอบเพิ่มรายการ ICD10 BR AIS ครบ 6 รายการ | มีแถว #1–#6 · ตัวนับ 6 / 6 · ไม่แสดงปุ่ม + เพิ่มรายการ |
| 020 | EDG | ตรวจสอบเพิ่มรายการ ICD10 BR AIS รายการที่ 7 ไม่ได้ | ไม่มีแถว #7 · ตัวนับยังเป็น 6 / 6 |
| 021 | EDG | ทดสอบลบรายการ ICD10 BR AIS เมื่อเหลือรายการเดียว | แถว #1 ยังอยู่ ค่าในแถวถูกล้าง · ตัวนับ 1 / 6 |

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **ผู้ป่วย A**: เปิด Visit ER → คัดกรอง ประเภทฉุกเฉิน = Trauma (ฟอร์มคัดกรองใหม่ SBH-1678) → ใช้ทุก TC · TC 015 / 016 ใช้ visit นี้บันทึกจริง
- user: พยาบาล ER
- ชุดค่าสำหรับ TC 015 (กรอกครบทุกส่วน):
  - การดูแลระหว่างนำส่ง: ดูแลการหายใจ 1 - มี-เหมาะสม "O2 mask" · ห้ามเลือด 2 - มี-ไม่เหมาะสม · Splint/Slap C-Spine 0 - ไม่มี · Splint/Slap อื่นๆ 3 - ไม่จำเป็น · IV Fluid N - ไม่ระบุ
  - Trauma Detail: เกิดเหตุ 16/10/2026 08:30 · มาถึง รพ. 16/10/2026 09:00 · ติ๊ก อุบัติเหตุจากการขนส่ง · สระบุรี / เมืองสระบุรี / ปากเพรียว · ประเภทจุดเกิดเหตุ 5 - ถนนหรือทางหลวง · บาดเจ็บจากการทำงาน ไม่ใช่ · ประเภทผู้บาดเจ็บ 2 - คนขับขี่ · ยานพาหนะผู้ป่วย 02 - จักรยานยนต์ · ยานพาหนะคู่กรณี 05 - รถปิกอัพ · ส่งตรวจแอลกอฮอล์ 2 - ส่งตรวจผู้บาดเจ็บ · แอลกอฮอล์ผู้บาดเจ็บ ใช้ · ปริมาณ 80 mg% · หมวกนิรภัย ไม่ใช้ · กลไกการบาดเจ็บ 05 · เหตุการณ์ 1 · ลักษณะการบาดเจ็บ 1 - Blunt · ประวัติสลบ สลบ 0 ชั่วโมง 10 นาที
  - ICD10 สาเหตุ V23.4 · รายการ #1 S06.0 / BR 1 / AIS 2 · #2 S22.3 / BR 3 / AIS 3

---

## EXE - CT - 2.9.1

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 New Feature, VERSION 2.9.1, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Trauma Detail Form, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.1
- Module: ER / Trauma Detail Form
- Requirement ที่อ้างอิง: SBH-2952 — [ ER ] [ Trauma ] Trauma Detail Form
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- เปิด Custom Form Trauma Detail For Pher Plus จากเมนู สร้างฟอร์ม
- ส่วน การดูแลระหว่างนำส่ง (5 หัวข้อ · code set 0 / 1 / 2 / 3 / N)
- ส่วน Trauma Detail (ฟิลด์ครบ · ค่าเริ่มต้น · ประวัติสลบ + ชั่วโมง / นาที)
- ส่วน การวินิจฉัยสาเหตุภายนอกและความรุนแรงของการบาดเจ็บ (ICD10 สาเหตุ · ICD10 / BR / AIS สูงสุด 6 รายการ · BR auto-map)
- บันทึกฟอร์ม และดูย้อนหลังในประวัติ Custom Form

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2952-HPY - พยาบาลบันทึกฟอร์ม Trauma Detail For Pher Plus ของผู้ป่วย Trauma

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Trauma Detail Form + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2952-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Trauma Detail Form
- Requirement ที่อ้างอิง: SBH-2952 — [ ER ] [ Trauma ] Trauma Detail Form

วัตถุประสงค์
- ยืนยันว่าพยาบาลเปิดฟอร์ม Trauma Detail For Pher Plus จากเมนู สร้างฟอร์ม กรอกข้อมูลครบ 3 ส่วนตามโครงสร้าง PHER+ บันทึกได้ และดูย้อนหลังได้

ขอบเขต Requirement
- AC 1: เพิ่ม Custom Form - Trauma Detail Form
- AC 1.1: ใช้บันทึกข้อมูล PHER PLUS (การดูแลระหว่างนำส่ง · Trauma Detail · ICD10 / BR / AIS)

ความเสี่ยง
- ฟอร์มไม่อยู่ในรายการ สร้างฟอร์ม → พยาบาลบันทึกข้อมูล Trauma ไม่ได้ (ถูกตัดออกจากฟอร์มคัดกรองแล้วใน SBH-1678)
- code set / BR ผิด → ข้อมูลส่ง PHER+ ผิด
- บันทึกแล้วข้อมูลหาย → ER Summary (SBH-3182) แสดงข้อมูลการบาดเจ็บไม่ได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- รายละเอียดฟิลด์ตาม Sub-Issue SBH-2951 และ prototype แบบที่ 2
```

### TC-SBH-2952-001 - ตรวจสอบเมนู สร้างฟอร์ม มีตัวเลือก Trauma Detail For Pher Plus

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Trauma Detail Form + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2952-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เปิดหน้าผู้ป่วย A (ER · Trauma)
3. เมนูด้านขวา > สร้างฟอร์ม
4. กดช่อง เลือกฟอร์ม

## Expected Result
ช่อง เลือกฟอร์ม มีตัวเลือก Trauma Detail For Pher Plus

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-002 - แสดงฟอร์ม Trauma Detail For Pher Plus เมื่อเลือกจากช่อง เลือกฟอร์ม

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-002
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม
3. ช่อง เลือกฟอร์ม เลือก Trauma Detail For Pher Plus

## Expected Result
แสดงฟอร์ม 3 ส่วน: การดูแลระหว่างนำส่ง · Trauma Detail · การวินิจฉัยสาเหตุภายนอกและความรุนแรงของการบาดเจ็บ (ICD10 / BR / AIS)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-003 - ตรวจสอบหัวข้อในส่วน การดูแลระหว่างนำส่ง

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Trauma Detail Form + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2952-003
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. ดูส่วน การดูแลระหว่างนำส่ง

## Expected Result
มี 5 หัวข้อ: ดูแลการหายใจ · ห้ามเลือด · Splint/Slap C-Spine · Splint/Slap อื่นๆ · IV Fluid
แต่ละหัวข้อมี Dropdown และช่อง ระบุรายละเอียด

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-004 - ตรวจสอบตัวเลือก Dropdown การดูแลระหว่างนำส่ง

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-004
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. กด Dropdown ของหัวข้อ ดูแลการหายใจ
4. ทำซ้ำข้อ 3 กับ ห้ามเลือด · Splint/Slap C-Spine · Splint/Slap อื่นๆ · IV Fluid

## Expected Result
ทุกหัวข้อมี 5 ตัวเลือก: 0 - ไม่มี · 1 - มี-เหมาะสม · 2 - มี-ไม่เหมาะสม · 3 - ไม่จำเป็น · N - ไม่ระบุ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-005 - ตรวจสอบค่าเริ่มต้น Dropdown การดูแลระหว่างนำส่ง เมื่อเปิดฟอร์มใหม่

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-005
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus (ฟอร์มใหม่ ยังไม่เคยกรอก)
3. ดูค่าใน Dropdown ทั้ง 5 หัวข้อ

## Expected Result
ทั้ง 5 หัวข้อเป็นค่าว่าง (แสดง เลือกการดูแลระหว่างนำส่ง) ไม่มีค่าใดถูกเลือกไว้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-006 - ตรวจสอบฟิลด์ในส่วน Trauma Detail

Status: Not Run · Priority: High · Labels: เหมือน TC-003 (QA Type : UIUX)

```
TC ID: TC-SBH-2952-006
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. ดูส่วน Trauma Detail

## Expected Result
มีฟิลด์ครบ:
- วันที่และเวลาที่เกิดเหตุ · วันที่และเวลาที่มาถึง รพ. · อุบัติเหตุจากการขนส่ง (checkbox)
- จังหวัดที่เกิดเหตุ · อำเภอ · ตำบล · ชื่อหมู่บ้านที่เกิดเหตุ · ประเภทจุดเกิดเหตุ · ชื่อถนน/แยก/บริเวณ
- บาดเจ็บจากการทำงาน (ไม่ทราบ / ใช่ / ไม่ใช่)
- ประเภทผู้บาดเจ็บ · ยานพาหนะผู้ป่วย · ทะเบียนรถ · ยานพาหนะคู่กรณี
- ส่งตรวจแอลกอฮอล์ · แอลกอฮอล์ผู้บาดเจ็บ (ไม่ทราบ / ไม่ใช้ / ใช้) · ปริมาณที่พบในผู้บาดเจ็บ (mg%)
- ยา/วัตถุออกฤทธิ์ต่อจิตประสาท · หมวกนิรภัย · โทรศัพท์ (ไม่ทราบ / ไม่ใช้ / ใช้) · ความเสี่ยงอื่นๆ
- กลไกการบาดเจ็บ · เหตุการณ์และกิจกรรมขณะเกิดเหตุ · ลักษณะการบาดเจ็บ
- ประวัติสลบตั้งแต่เกิดเหตุ (ไม่สลบ / สลบ / ไม่ทราบ) + ชั่วโมง · นาที

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-007 - ตรวจสอบค่าเริ่มต้นของปุ่มเลือกในส่วน Trauma Detail

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus (ฟอร์มใหม่)
3. ดูปุ่มที่ถูกเลือกในแต่ละกลุ่มปุ่มของส่วน Trauma Detail

## Expected Result
บาดเจ็บจากการทำงาน · แอลกอฮอล์ผู้บาดเจ็บ · ยา/วัตถุออกฤทธิ์ต่อจิตประสาท · หมวกนิรภัย · โทรศัพท์ = ไม่ทราบ
ประวัติสลบตั้งแต่เกิดเหตุ = ไม่สลบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-008 - ทดสอบกรอกระยะเวลาสลบเมื่อเลือกประวัติสลบ = สลบ

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-008
Case Type: Happy
Test Type: Functional
เทคนิค: State Transition — ไม่สลบ → สลบ

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. ประวัติสลบตั้งแต่เกิดเหตุ กด สลบ
4. กรอก ชั่วโมง 1 · นาที 30

## Expected Result
ช่อง ชั่วโมง และ นาที กรอกได้ · แสดงค่า 1 และ 30

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-009 - ตรวจสอบส่วน การวินิจฉัยสาเหตุภายนอกและความรุนแรงของการบาดเจ็บ

Status: Not Run · Priority: High · Labels: เหมือน TC-003 (QA Type : UIUX)

```
TC ID: TC-SBH-2952-009
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. ดูส่วน การวินิจฉัยสาเหตุภายนอกและความรุนแรงของการบาดเจ็บ (ICD10 / BR / AIS)

## Expected Result
มีช่อง ICD10 สาเหตุ (V, W, X, Y)
มีแถว #1: ICD10 1 · BR 1 (Body Region) · AIS 1 (ความรุนแรง)
ตัวนับแสดง รายการวินิจฉัย 1 / 6 · มีปุ่ม + เพิ่มรายการ (ICD10, BR, AIS)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-010 - ตรวจสอบรหัสใน ICD10 สาเหตุ เป็นหมวด V W X Y

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-010
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. กดช่อง ICD10 สาเหตุ (V, W, X, Y) ดูรายการ
4. เลือก V23.4

## Expected Result
ทุกรายการในช่องขึ้นต้นด้วย V / W / X / Y
เลือกแล้วแสดง V23.4 พร้อมชื่อรหัส

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-011 - ตรวจสอบ BR ถูกกำหนดอัตโนมัติเมื่อเลือก ICD10 การบาดเจ็บหมวด S

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-011
Case Type: Happy
Test Type: Functional
เทคนิค: EP — กลุ่มรหัส S ที่แมพกับ BR 1–6

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. แถว #1 ช่อง ICD10 1 เลือก S22.3 (Fracture of rib)
4. ดูช่อง BR 1

## Expected Result
BR 1 ถูกเลือกเป็น 3 - Thorax (ทรวงอก) โดยไม่ต้องเลือกเอง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-012 - ตรวจสอบ BR ถูกกำหนดอัตโนมัติเมื่อเลือก ICD10 การบาดเจ็บหมวด T

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-012
Case Type: Happy
Test Type: Functional
เทคนิค: EP — กลุ่มรหัส T ที่แมพกับ BR 1–6

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. แถว #1 ช่อง ICD10 1 เลือก T00.9 (Multiple superficial injuries, unspecified)
4. ดูช่อง BR 1

## Expected Result
BR 1 ถูกเลือกเป็น 6 - External & body surface โดยไม่ต้องเลือกเอง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-013 - ทดสอบเพิ่มรายการ ICD10 BR AIS

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-013
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. กด + เพิ่มรายการ (ICD10, BR, AIS) 1 ครั้ง

## Expected Result
มีแถว #2 (ICD10 2 · BR 2 · AIS 2) ต่อจากแถว #1
ตัวนับแสดง รายการวินิจฉัย 2 / 6

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-014 - ทดสอบลบรายการ ICD10 BR AIS ที่อยู่ระหว่างกลาง

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-014
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. กด + เพิ่มรายการ 2 ครั้ง (มีแถว #1 #2 #3) · แถว #3 เลือก ICD10 S06.0
4. กด × ที่แถว #2

## Expected Result
แถว #2 เดิมหายไป · แถวที่มี S06.0 เลื่อนขึ้นเป็น #2 (ICD10 2 · BR 2 · AIS 2)
ตัวนับแสดง รายการวินิจฉัย 2 / 6

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-015 - บันทึกฟอร์ม Trauma Detail For Pher Plus ครบทุกส่วน

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-015
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. กรอกทุกส่วนตามชุดค่าในไฟล์ร่าง (การดูแลระหว่างนำส่ง · Trauma Detail · ICD10 สาเหตุ + รายการ #1 #2)
4. กด บันทึก

## Expected Result
บันทึกสำเร็จ ไม่มีข้อความ error

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-016 - ตรวจสอบข้อมูลฟอร์มที่บันทึกแสดงในแท็บ ประวัติ Custom Form

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2952-016
Case Type: Happy
Test Type: Functional

## Test Step
1. ทำ TC-SBH-2952-015 ให้บันทึกสำเร็จก่อน
2. หน้าผู้ป่วย A > เมนูซ้าย ประวัติการรักษา > เลือก visit ER ของผู้ป่วย A
3. แท็บ ประวัติ Custom Form > เปิดรายการ Trauma Detail For Pher Plus

## Expected Result
แสดงฟอร์ม Trauma Detail For Pher Plus ที่บันทึก
ค่าทุกช่องตรงกับที่กรอกใน TC-SBH-2952-015 (การดูแลระหว่างนำส่ง 5 หัวข้อ · Trauma Detail · ICD10 สาเหตุ · ICD10 / BR / AIS 2 รายการ)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2952-EDG - ค่าขอบของจำนวนรายการ ICD10 / BR / AIS ประวัติสลบ และรหัสที่ไม่แมพ BR

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Trauma Detail Form + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2952-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / Trauma Detail Form
- Requirement ที่อ้างอิง: SBH-2952 — [ ER ] [ Trauma ] Trauma Detail Form

วัตถุประสงค์
- ยืนยันว่าฟอร์มทำงานถูกต้องที่ค่าขอบ: จำนวนรายการ ICD10 / BR / AIS ขั้นต่ำ 1 สูงสุด 6 · รหัส ICD10 ที่ไม่แมพ BR · การเปลี่ยนสถานะประวัติสลบกลับ

ขอบเขต Requirement
- AC 1.1: บันทึกข้อมูล PHER PLUS ตามโครงสร้าง (ICD10 / BR / AIS สูงสุด 6 รายการ · BR ค่าเริ่มต้น 9)
- ประวัติสลบตั้งแต่เกิดเหตุ + ชั่วโมง / นาที

ความเสี่ยง
- เพิ่มรายการเกิน 6 → ข้อมูลเกินโครงสร้าง PHER+ (diag1–6)
- รหัสที่ไม่แมพได้ BR ว่างหรือผิด → ข้อมูล PHER+ ไม่ครบ
- เปลี่ยนเป็น ไม่สลบ แล้วค่าชั่วโมง / นาทีค้าง → บันทึกข้อมูลขัดกัน

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- รายละเอียดตาม Sub-Issue SBH-2951 และ prototype แบบที่ 2
```

### TC-SBH-2952-017 - ตรวจสอบช่องระยะเวลาสลบเมื่อเปลี่ยนจาก สลบ เป็น ไม่สลบ

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Trauma Detail Form + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2952-017
Case Type: Edge
Test Type: Functional
เทคนิค: State Transition — สลบ → ไม่สลบ

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. ประวัติสลบตั้งแต่เกิดเหตุ กด สลบ > กรอก ชั่วโมง 1 · นาที 30
4. กด ไม่สลบ

## Expected Result
ช่อง ชั่วโมง และ นาที ถูกล้างค่าเป็นว่าง และกรอกไม่ได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-018 - ตรวจสอบ BR เมื่อเลือก ICD10 การบาดเจ็บที่ไม่ได้แมพกับส่วนของร่างกาย

Status: Not Run · Priority: Medium · Labels: เหมือน TC-017

```
TC ID: TC-SBH-2952-018
Case Type: Edge
Test Type: Functional
เทคนิค: EP — กลุ่มรหัสที่ไม่แมพ (ค่าเริ่มต้น 9)

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. แถว #1 ช่อง ICD10 1 เลือก T07 (Unspecified multiple injuries)
4. ดูช่อง BR 1

## Expected Result
BR 1 ถูกเลือกเป็น 9 - Unknown (ไม่ทราบ / ระบุไม่ได้)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-019 - ทดสอบเพิ่มรายการ ICD10 BR AIS ครบ 6 รายการ

Status: Not Run · Priority: High · Labels: เหมือน TC-017

```
TC ID: TC-SBH-2952-019
Case Type: Edge
Test Type: Functional
เทคนิค: BVA — ขอบบน 6 รายการ

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. กด + เพิ่มรายการ (ICD10, BR, AIS) 5 ครั้ง

## Expected Result
มีแถว #1 ถึง #6
ตัวนับแสดง รายการวินิจฉัย 6 / 6 · ไม่แสดงปุ่ม + เพิ่มรายการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-020 - ตรวจสอบเพิ่มรายการ ICD10 BR AIS รายการที่ 7 ไม่ได้

Status: Not Run · Priority: High · Labels: เหมือน TC-017

```
TC ID: TC-SBH-2952-020
Case Type: Edge
Test Type: Functional
เทคนิค: BVA — ค่าที่เลยขอบบน (7 รายการ)

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. เพิ่มรายการจนครบ 6 รายการ
4. พยายามเพิ่มรายการที่ 7 (หาปุ่ม / ช่องทางเพิ่มรายการ)

## Expected Result
เพิ่มรายการที่ 7 ไม่ได้ · ไม่มีแถว #7
ตัวนับยังแสดง รายการวินิจฉัย 6 / 6

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2952-021 - ทดสอบลบรายการ ICD10 BR AIS เมื่อเหลือรายการเดียว

Status: Not Run · Priority: Medium · Labels: เหมือน TC-017

```
TC ID: TC-SBH-2952-021
Case Type: Edge
Test Type: Functional
เทคนิค: BVA — ขอบล่าง 1 รายการ

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดหน้าผู้ป่วย A
2. เมนูด้านขวา > สร้างฟอร์ม > เลือก Trauma Detail For Pher Plus
3. แถว #1 เลือก ICD10 S06.0 · AIS 2 (มีแถวเดียว)
4. กด × ที่แถว #1

## Expected Result
แถว #1 ยังอยู่ · ค่า ICD10 / BR / AIS ในแถวถูกล้างเป็นว่าง
ตัวนับแสดง รายการวินิจฉัย 1 / 6

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## Requirement gap (ไม่สร้างเป็น TC)

**Expected behavior**
- Master data ของ จังหวัด / อำเภอ / ตำบล ยานพาหนะ ประเภทผู้บาดเจ็บ กลไกการบาดเจ็บ ใช้แหล่งไหน (Open point ใน SBH-2951) · อำเภอ / ตำบล กรองตามจังหวัดที่เลือกหรือไม่ (prototype เป็นรายการคงที่)
- วันที่และเวลาที่มาถึง รพ. ดึงจากเวลามาถึงของ ER episode อัตโนมัติหรือไม่ (Open point)
- ตัวเลือก Trauma ในฟอร์มคัดกรองมีทางลัดเปิดฟอร์มนี้หรือไม่ (Open point · ไม่มีใน prototype)
- ฟอร์มเปิดได้เฉพาะ visit ที่คัดกรองเป็น Trauma หรือเปิดได้ทุก visit
- ICD10 การบาดเจ็บ จำกัดเฉพาะหมวด S / T หรือไม่ · หลัง BR auto-map ผู้ใช้แก้ BR เองได้หรือไม่
- วันเวลาแสดงปี พ.ศ. หรือ ค.ศ. (รูปใน AC แสดง 16/10/2026)
- บันทึกแล้วแก้ไข / ลบฟอร์มได้หรือไม่ · บันทึกซ้ำใน visit เดียวกันได้กี่ฉบับ
- Design task CTXN-8918 ยังอยู่ระหว่าง Designing — หน้าจอจริงอาจต่างจาก prototype

**Validation**
- ช่องไหนบังคับกรอกก่อนบันทึก (การ์ดไม่ระบุ · prototype ไม่มี validation)
- ปริมาณที่พบในผู้บาดเจ็บ (mg%) ช่วงค่าที่รับได้ (prototype ตั้ง 0–600 แต่การ์ดไม่ระบุ) · กรอกได้เฉพาะเมื่อแอลกอฮอล์ผู้บาดเจ็บ = ใช้ หรือไม่
- นาที 0–59 / ชั่วโมงสูงสุด (prototype ตั้ง max 59 แต่การ์ดไม่ระบุ)
- วันเวลาเกิดเหตุต้องไม่หลังวันเวลามาถึง รพ. หรือไม่
- ช่อง ระบุรายละเอียด บังคับเมื่อเลือกค่าใดหรือไม่ · ตัวเลือก "อื่นๆ ระบุ" มีช่องให้ระบุหรือไม่
- อุบัติเหตุจากการขนส่ง ติ๊กแล้วบังคับฟิลด์ยานพาหนะ / ประเภทผู้บาดเจ็บหรือไม่

**Error handling**
- บันทึกไม่สำเร็จ (เช่น server error) แสดงข้อความอะไร

**Permission / role**
- นอกจากพยาบาล ER แพทย์เปิด / บันทึกฟอร์มนี้ได้หรือไม่ (SBH-2951 ระบุเฉพาะพยาบาล)

**Edge cases**
- เปิดฟอร์มค้างแล้วเปลี่ยนไปเลือกฟอร์มอื่นในช่อง เลือกฟอร์ม → ข้อมูลที่กรอกไว้หายหรือไม่
- การแสดงผลใน ER Summary อยู่ในการ์ด SBH-3182 (นอก scope)
