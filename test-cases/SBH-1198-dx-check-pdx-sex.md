# SBH-1198 — [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx — Test Coverage (Draft)

- Requirement: https://linear.app/cortexcloud/issue/SBH-1198
- สร้างจาก Acceptance Criteria + comment ของการ์ด ตาม skill `linear-testcase-writer` (แบบ atomic: 1 TC = 1 จุดตรวจ)
- สถานะไฟล์นี้: **Draft รอ QA review** — ยังไม่ได้สร้างอะไรใน Linear
- รวม: 1 EXE, 3 Scenario, **28 Test Case** (Required 23 · Optional 5)
- การตัดสินใจที่ QA ยืนยันแล้ว (28 ต.ค. 2026): Atomic · รวมหน้า OPD Note ด้วย (เทสเผื่อไว้) · Sex เป็น Required · Age ไม่ใส่ · Environment DEV-X · ข้อความเตือนให้ยึดผลจริงก่อน (อาจแก้ภายหลัง) · ผู้ป่วยไม่ระบุเพศต้องเช็ค · การลากสลับแถวลองเล่นแล้ว (ผลอยู่ใน TC-023, 026, 027)
- Label: `QA Module` / `QA Sub-module / Feature` **[ยังไม่ยืนยัน: เสนอ `QA Module : OPD` + Sub-module ด้าน Diagnosis / Coding]** — ต้องยืนยันก่อนสร้างการ์ดจริง

### ผลสำรวจระบบจริง (DEV-X 28 ต.ค. 2026 · user1 · อ่านอย่างเดียว ไม่กดบันทึก)

| จุดที่ดู | ผล |
|---|---|
| API `GET /diagnosis-search/icd10/?q=<คำค้น>&system=icd10&type=opd` | แต่ละรหัสมี `pdx` (true/false) · `sex` (`["M"]` / `["F"]` / `["M","F"]`) · `age` (`age_min` / `age_max` / `age_day_min`) |
| หน้า **รหัสโรค OPD** (OPD Coding form) แถวที่ 1 | Category ล็อกเป็น `primary-diagnosis` · รหัสที่ `pdx=false` หรือเพศไม่ตรงผู้ป่วย ขึ้น tag **"Unacceptable PDx"** และกดเลือกไม่ได้ — **ตรง AC** |
| หน้า รหัสโรค OPD แถวที่ 2 ขึ้นไป | Category มี comorbidity / complication / others / external-cause (ไม่มี primary) · เลือก U071 ได้ ไม่มี tag |
| หน้า **OPD Note** (ทั้งมุมมอง V2 ค่าตั้งต้น และ V1) | แถวแรก Category ตั้งต้นเป็น Principal · ค้น U071 / O923 กับผู้ป่วยชาย **ไม่มี tag และเลือกเป็น Principal ได้** — ยังไม่ตรง AC และไม่ตรงรูปที่ dev แนบใน comment |
| ข้อความเตือน pdx เทียบกับเพศ | **เหมือนกันทุกอย่าง** — ข้อความ "Unacceptable PDx" ป้ายแดงแบบเดียวกัน (`ant-tag-error`) ไม่มี tooltip ไม่มีข้อความอธิบายเพิ่ม → ผู้ใช้แยกไม่ได้ว่าโดนกันเพราะ pdx หรือเพศ (comment 17 ส.ค. เขียนแยกเป็น "Unacceptable Sex") |
| อายุ | ยังไม่เช็ค — ผู้ป่วยหญิง 64 ปี เลือก O923 (`age_max` 60) ได้ ตรงกับ comment 18 ส.ค. ว่าทำ Age หลัง Go-live |
| เพศที่ระบบมี | ฟอร์มสร้างผู้ป่วยที่เวชระเบียนมีแค่ `male - เพศชาย` / `female - เพศหญิง` · ฟอร์ม "ผู้ป่วยระบุตัวตนไม่ได้" ของ ER มีช่อง `เพศ (ไม่บังคับ)` · API ผู้ป่วยบน DEV-X มีรายที่ `gender: null` จริงหลายสิบราย (ทั้งหมดเป็น `identityVerificationMode: anonymous` เช่น ชื่อขึ้นต้น "Unknown" HN 6931801–6931820) → **ระบบรองรับผู้ป่วยไม่ระบุเพศแล้ว** |
| ลากสลับแถว (Coding form) | ลากแถวที่มี U071 หรือ O923 (ผู้ป่วยชาย) ขึ้นแถวที่ 1 → **แถวเด้งกลับที่เดิม** ไม่มีข้อความแจ้ง · ลากแถว primary ลงให้ U071 ขึ้นมาแทน → เด้งกลับเหมือนกัน · ตัวเปรียบเทียบ: ลาก Z017 (ผ่านเงื่อนไข) ขึ้นแถวที่ 1 ได้ แต่แถว K30 ที่ถูกดันลงแถวที่ 2 ถูกล้างช่อง Category เป็นว่าง |

### รหัสโรคที่ใช้เป็น Test Data (flag จาก API 28 ต.ค. 2026)

| รหัส | ชื่อ | pdx | sex |
|---|---|---|---|
| K30 | Functional dyspepsia | true | M, F |
| U071 | 2019 nCov virus disease (Covid-19 disease) | false | M, F |
| O923 | Agalactia | true | F |
| N40 | Hyperplasia of prostate | true | M |

### ผู้ป่วยทดสอบ (DEV-X · `test-data/patients.json`)

- ชาย: นาย AIทดสอบtf AIทดสอบtl HN 6932107 อายุ 39 ปี · Visit OPD V69102627662 / E69102632486 (ยังเปิดอยู่)
- หญิง: AIทดสอบvf HN 6932109 อายุ 24 ปี · Visit ล่าสุด V69102727694 / E69102732534 (ปิดแล้ว — เปิดหน้า รหัสโรค OPD ได้)

### การ map AC → TC

| AC / ที่มา | Coding form | OPD Note |
|---|---|---|
| AC1 ระบบ search รายการ Dx ได้ | 001, 025 (ไม่ระบุเพศ) | 006 |
| AC2 ห้ามลง primary Dx ที่ `pdx=false` | 009, 010 | 015, 016, 019 |
| AC3 ห้ามลง primary Dx ที่ sex ไม่ตรงผู้ป่วย | 011–014, 028 (ไม่ระบุเพศ) | 017, 018 |
| Dx ที่ผ่านเงื่อนไขลงเป็น primary ได้ | 002–004 | 007 |
| บันทึกแล้วข้อมูลคงอยู่ | 005 | 008 |
| comment 17 ส.ค.: `pdx=false` ลงเป็น Comorbid / อื่นๆ ได้ | 020 | 021 |
| ลากสลับแถว | 023, 026, 027 | - |
| coverage เสริม | 022 | 024 |

### Requirement gap

- **expected behavior**: Overview เขียน "แก้หน้า opd note" แต่ระบบเช็คเฉพาะหน้า รหัสโรค OPD — QA ให้เทสเผื่อไว้ (TC-006–008, 015–019, 021, 024) คาดว่า TC เรื่องกันของ OPD Note จะ Fail
- **expected behavior**: comment 17 ส.ค. แยกข้อความเป็น Unacceptable PDx / Sex / Age แต่ระบบใช้ "Unacceptable PDx" แบบเดียวกันทั้งเรื่อง pdx และเพศ — QA ให้ยึดผลจริงก่อน (Expected ของ TC-011, 013, 017 เขียนตามระบบ ถ้าแก้ภายหลังต้องแก้ Expected ตาม)
- **expected behavior**: comment 18 ส.ค. บอกทำเฉพาะ PDx ก่อน แต่ระบบเช็คเพศแล้ว — QA ให้เทสเพศเป็น Required ตาม AC ข้อ 3
- **validation**: ผู้ป่วยไม่ระบุเพศ (ลงทะเบียนเป็นผู้ป่วยระบุตัวตนไม่ได้ของ ER แล้วเว้นช่องเพศ) — QA ยืนยันว่าต้องค้นหาได้เหมือนผู้ป่วยทั่วไป (TC-025) · ส่วนรหัสเฉพาะเพศควรถูกกันไหมยังไม่มีคำตอบ (TC-028 Expected = [ยังไม่ทราบ] ต้องถาม PO)
- **edge cases**: ลากสลับแถวใน Coding form — กันรหัสที่ไม่ผ่านไม่ให้ขึ้นแถวที่ 1 ได้ (เด้งกลับ) แต่ไม่มีข้อความบอกผู้ใช้ · ลากรหัสที่ผ่านเงื่อนไขขึ้นแถวที่ 1 แล้ว Category ของแถวที่ถูกดันลงถูกล้างเป็นว่าง — ต้องให้ PO ยืนยันว่าตั้งใจไหม
- **edge cases**: Age (AgeMin / AgeMax / AgeDayMin) ไม่อยู่ใน draft นี้ (หลัง Go-live)
- **permission/role**: ไม่ได้ระบุว่าใคร (แพทย์ / Coder) ใช้หน้าไหน

---

## EXE

### EXE - CT - VERSION 2.8.0

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: VERSION 2.8.0
- Module: OPD EMR — ลงรหัสโรค (OPD Note / รหัสโรค OPD)
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx
- Environment: DEV-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ค้นหารายการ Dx ได้ทั้งหน้า รหัสโรค OPD และ OPD Note
- กันรหัสโรคที่ pdx = false ไม่ให้ลงเป็น primary / Principal
- กันรหัสโรคที่ sex ไม่ตรงกับเพศผู้ป่วยไม่ให้ลงเป็น primary / Principal
- รหัสโรคที่ไม่ผ่านเงื่อนไข primary ยังลงเป็นประเภทอื่นได้

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## Scenario

### TS-SBH-1198-HPY - ค้นหาและลงรหัสโรคที่ผ่านเงื่อนไข pdx และ sex เป็น primary ได้

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1198-HPY
- Case Type: Happy
- Suffix: HPY
- Module: OPD EMR — ลงรหัสโรค
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

วัตถุประสงค์
- ยืนยันว่าค้นหา Dx ได้ และ Dx ที่ pdx = true + sex ตรงกับผู้ป่วยลงเป็น primary แล้วบันทึกได้

ขอบเขต Requirement
- AC: ระบบสามารถ search รายการ dx
- Dx ที่ผ่านเงื่อนไขลงเป็น primary ได้ทั้งหน้า รหัสโรค OPD และ OPD Note

ความเสี่ยง
- การเช็คใหม่กันผิดตัว ทำให้ลง Dx ปกติเป็น primary ไม่ได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TS-SBH-1198-UHP - กันรหัสโรคที่ pdx = false หรือ sex ไม่ตรงกับผู้ป่วยไม่ให้ลงเป็น primary

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: OPD EMR — ลงรหัสโรค
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

วัตถุประสงค์
- ยืนยันว่า Dx ที่ไม่ผ่านเงื่อนไขแสดง tag "Unacceptable PDx" และเลือกเป็น primary ไม่ได้

ขอบเขต Requirement
- AC: ต้องไม่สามารถสั่งรายการ primary dx ที่มี flag pdx เป็น false ได้
- AC: ต้องไม่สามารถสั่งรายการ primary dx ที่มี flag sex ไม่ตรงกับเพศของผู้ป่วย
- comment dev 30 ก.ค.: OPD Note เลือก Diagnosis ก่อน Category แล้ว Category Principal ต้อง disabled

ความเสี่ยง
- ข้อมูลเบิกจ่าย / รายงานผิดเพราะ primary Dx ไม่ถูกต้อง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TS-SBH-1198-EDG - รหัสโรคที่ไม่ผ่านเงื่อนไข primary ยังลงเป็นประเภทอื่นได้ และกรณีขอบ

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1198-EDG
- Case Type: Edge
- Suffix: EDG
- Module: OPD EMR — ลงรหัสโรค
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

วัตถุประสงค์
- ยืนยันว่าการเช็คกันเฉพาะ primary ไม่กันประเภทอื่น และไม่มีทางอ้อมให้ Dx ที่ไม่ผ่านกลายเป็น primary

ขอบเขต Requirement
- comment 17 ส.ค.: pdx = false ลงเป็น Comorbid หรืออื่นๆ ได้
- มุมมอง OPD Note V1 / V2 และการลากสลับแถวของ รหัสโรค OPD

ความเสี่ยง
- เช็คเกินจนลง Dx รองไม่ได้ / ลากแถวแล้ว Dx ที่ไม่ผ่านกลายเป็น primary

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

---

## Test Case

> Preconditions กลางของหน้า **รหัสโรค OPD**: ล็อกอิน user1 บน DEV-X → เปิดหน้าผู้ป่วยพร้อม Visit → เมนูขวา "รหัสโรค OPD" → หน้า "OPD Coding form" แถวที่ 1 Category = `primary-diagnosis`
>
> Preconditions กลางของหน้า **OPD Note**: ล็อกอิน user1 บน DEV-X → เปิดหน้าผู้ป่วยพร้อม Visit → OPD Note (มุมมอง V2 ค่าตั้งต้น) → ส่วน Diagnosis กด "+ เพิ่มรายการ" → แถวที่ 1 Category ตั้งต้น = `Principal`

### [Required] TC-SBH-1198-001 - ตรวจสอบการค้นหารหัสโรคในหน้า รหัสโรค OPD แสดงรายการที่ตรงกับคำค้น

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-001
- Scenario ID: TS-SBH-1198-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว

Test Data
- คำค้น: "ag" และ "K30"

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1
2. พิมพ์ "ag"
3. ล้างช่องแล้วพิมพ์ "K30"

Expected Result
- พิมพ์ "ag" แสดงรายการ Dx ในรูป "<รหัส> - <ชื่อ>" เช่น "K294 - Chronic atrophic gastritis"
- พิมพ์ "K30" แสดง "K30 - Functional dyspepsia"

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ผ่าน
```

### [Required] TC-SBH-1198-002 - ตรวจสอบเลือกรหัสโรคที่ pdx = true และใช้ได้ทุกเพศเป็น primary-diagnosis ได้ในหน้า รหัสโรค OPD

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-002
- Scenario ID: TS-SBH-1198-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว

Test Data
- K30 (pdx = true · sex M, F)

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "K30"
2. คลิก "K30 - Functional dyspepsia"

Expected Result
- ตัวเลือก K30 ไม่มี tag "Unacceptable PDx"
- แถวที่ 1 แสดง K30 และ Category ยังเป็น primary-diagnosis

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ตัวเลือกไม่มี tag (ยังไม่ได้กดเลือกจริง)
```

### [Required] TC-SBH-1198-003 - ตรวจสอบผู้ป่วยชายเลือกรหัสโรคเฉพาะเพศชายเป็น primary-diagnosis ได้ในหน้า รหัสโรค OPD

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-003
- Scenario ID: TS-SBH-1198-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว

Test Data
- N40 (pdx = true · sex M)

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "N40"
2. คลิก "N40 - Hyperplasia of prostate"

Expected Result
- ตัวเลือก N40 ไม่มี tag "Unacceptable PDx"
- แถวที่ 1 แสดง N40

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ตัวเลือกไม่มี tag กดได้
```

### [Required] TC-SBH-1198-004 - ตรวจสอบผู้ป่วยหญิงเลือกรหัสโรคเฉพาะเพศหญิงเป็น primary-diagnosis ได้ในหน้า รหัสโรค OPD

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-004
- Scenario ID: TS-SBH-1198-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยหญิง HN 6932109 (24 ปี) เปิดหน้า OPD Coding form ของ Visit V69102727694 แล้ว

Test Data
- O923 (pdx = true · sex F)

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "O923"
2. คลิก "O923 - Agalactia"

Expected Result
- ตัวเลือก O923 ไม่มี tag "Unacceptable PDx"
- แถวที่ 1 แสดง O923

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ตัวเลือกไม่มี tag กดได้
```

### [Required] TC-SBH-1198-005 - ตรวจสอบบันทึกรหัสโรค primary-diagnosis ที่ผ่านเงื่อนไขในหน้า รหัสโรค OPD แล้วข้อมูลคงอยู่หลังโหลดหน้าใหม่

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-005
- Scenario ID: TS-SBH-1198-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว
2. Visit นี้ยังไม่เคยบันทึกรหัสโรค (สถานะ PENDING)

Test Data
- K30 · แพทย์: นาย ทดสอบ มานะ

Test Steps
1. แถวที่ 1 เลือก "K30 - Functional dyspepsia"
2. เลือกแพทย์ "นาย ทดสอบ มานะ"
3. กดปุ่ม "บันทึก"
4. โหลดหน้าใหม่ แล้วเปิดเมนู "รหัสโรค OPD" ของ Visit เดิม

Expected Result
- บันทึกสำเร็จ ไม่มีข้อความ error
- หลังโหลดหน้าใหม่ แถวที่ 1 ยังเป็น K30 / primary-diagnosis / นาย ทดสอบ มานะ

Actual Result
- -

หมายเหตุ
- ยังไม่ได้ลองบันทึกจริงตอนสำรวจ · ข้อความแจ้งเตือนหลังบันทึก [ยังไม่ทราบ] — กรอกตามจริงตอนรัน
```

### [Required] TC-SBH-1198-006 - ตรวจสอบการค้นหารหัสโรคในส่วน Diagnosis ของ OPD Note แสดงรายการที่ตรงกับคำค้น

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-006
- Scenario ID: TS-SBH-1198-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิด OPD Note ของ Visit V69102627662 แล้ว เพิ่มแถว Diagnosis 1 แถว

Test Data
- คำค้น: "a" (1 ตัวอักษร) · "ag" · "K30"

Test Steps
1. คลิกช่อง "ค้นหา" ของแถวที่ 1 แล้วพิมพ์ "a"
2. พิมพ์ต่อเป็น "ag"
3. ล้างช่องแล้วพิมพ์ "K30"

Expected Result
- พิมพ์ 1 ตัวอักษร แสดงข้อความ "พิมพ์อย่างน้อย 2 ตัวอักษร"
- พิมพ์ "ag" แสดงรายการ Dx ในรูป "<รหัส> - <ชื่อ>"
- พิมพ์ "K30" แสดง "K30 - Functional dyspepsia"

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ผ่าน (ข้อความ "พิมพ์อย่างน้อย 2 ตัวอักษร" เห็นตอนช่องว่าง)
```

### [Required] TC-SBH-1198-007 - ตรวจสอบเลือกรหัสโรคที่ผ่านเงื่อนไขในแถว Category Principal ของ OPD Note ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-007
- Scenario ID: TS-SBH-1198-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิด OPD Note ของ Visit V69102627662 แล้ว เพิ่มแถว Diagnosis 1 แถว (Category = Principal)

Test Data
- K30 (pdx = true · sex M, F)

Test Steps
1. พิมพ์ "K30" ในช่อง "ค้นหา" ของแถวที่ 1
2. คลิก "K30 - Functional dyspepsia"

Expected Result
- ตัวเลือก K30 ไม่มี tag "Unacceptable PDx"
- ช่องรหัสแสดง K30 ช่อง Diagnosis แสดง "Functional dyspepsia" Category ยังเป็น Principal

Actual Result
- -

หมายเหตุ
- -
```

### [Required] TC-SBH-1198-008 - ตรวจสอบบันทึก OPD Note ที่มี Principal Diagnosis ผ่านเงื่อนไขแล้วข้อมูลคงอยู่หลังโหลดหน้าใหม่

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-008
- Scenario ID: TS-SBH-1198-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิด OPD Note ของ Visit V69102627662 แล้ว

Test Data
- Principal: K30

Test Steps
1. ส่วน Diagnosis กด "+ เพิ่มรายการ" แล้วเลือก K30 (Category = Principal)
2. กดปุ่ม "สร้าง" (V2) หรือ "บันทึก" (V1) ของ OPD Note
3. โหลดหน้าใหม่ แล้วดูส่วน Diagnosis ของ OPD Note

Expected Result
- บันทึกสำเร็จ ไม่มีข้อความ error
- หลังโหลดหน้าใหม่ แถวที่ 1 ยังเป็น K30 / Principal

Actual Result
- -

หมายเหตุ
- ยังไม่ได้ลองบันทึกจริงตอนสำรวจ · ฟอร์มอาจบังคับช่องอื่น (เช่น Chief Complaint) [ยังไม่ทราบ] — กรอกตามที่ระบบบังคับตอนรัน
```

### [Required] TC-SBH-1198-009 - ตรวจสอบแสดง tag Unacceptable PDx ที่รหัสโรค pdx = false ในแถว primary-diagnosis ของหน้า รหัสโรค OPD

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-009
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว

Test Data
- U071 (pdx = false · sex M, F)

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "U071"

Expected Result
- ตัวเลือก "U071 - 2019 nCov virus disease(Covid-19 disease)" มี tag สีแดง "Unacceptable PDx"
- ตัวเลือกเป็นสีจาง (disabled)

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ผ่าน
```

### [Required] TC-SBH-1198-010 - ตรวจสอบเลือกรหัสโรค pdx = false เป็น primary-diagnosis ไม่ได้ในหน้า รหัสโรค OPD

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-010
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว

Test Data
- U071 (pdx = false)

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "U071"
2. คลิกตัวเลือก U071

Expected Result
- คลิกแล้วไม่มีอะไรเกิดขึ้น ช่องแถวที่ 1 ยังว่าง ("ค้นหา ICD10")

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ผ่าน
```

### [Required] TC-SBH-1198-011 - ตรวจสอบแสดง tag Unacceptable PDx ที่รหัสโรคเฉพาะเพศหญิงเมื่อผู้ป่วยเป็นชายในหน้า รหัสโรค OPD

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-011
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว

Test Data
- O923 (pdx = true · sex F)

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "O923"

Expected Result
- ตัวเลือก "O923 - Agalactia" มี tag "Unacceptable PDx" และเป็นสีจาง (disabled)

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ผ่าน · ข้อความ / สี / รูปแบบ เหมือน tag เรื่อง pdx ทุกอย่าง ไม่มี tooltip (comment 17 ส.ค. เขียนเป็น "Unacceptable Sex") — QA ให้ยึดผลจริงก่อน ถ้าแก้ข้อความภายหลังต้องแก้ Expected ข้อนี้
```

### [Required] TC-SBH-1198-012 - ตรวจสอบผู้ป่วยชายเลือกรหัสโรคเฉพาะเพศหญิงเป็น primary-diagnosis ไม่ได้ในหน้า รหัสโรค OPD

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-012
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว

Test Data
- O923 (sex F)

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "O923"
2. คลิกตัวเลือก O923

Expected Result
- คลิกแล้วไม่มีอะไรเกิดขึ้น ช่องแถวที่ 1 ยังว่าง

Actual Result
- -

หมายเหตุ
- -
```

### [Required] TC-SBH-1198-013 - ตรวจสอบแสดง tag Unacceptable PDx ที่รหัสโรคเฉพาะเพศชายเมื่อผู้ป่วยเป็นหญิงในหน้า รหัสโรค OPD

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-013
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยหญิง HN 6932109 เปิดหน้า OPD Coding form ของ Visit V69102727694 แล้ว

Test Data
- N40 (pdx = true · sex M)

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "N40"

Expected Result
- ตัวเลือก "N40 - Hyperplasia of prostate" มี tag "Unacceptable PDx" และเป็นสีจาง (disabled)

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ผ่าน (C61 ก็ได้ผลเดียวกัน) · ข้อความเหมือน tag เรื่อง pdx — ยึดผลจริงก่อน
```

### [Required] TC-SBH-1198-014 - ตรวจสอบผู้ป่วยหญิงเลือกรหัสโรคเฉพาะเพศชายเป็น primary-diagnosis ไม่ได้ในหน้า รหัสโรค OPD

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-014
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยหญิง HN 6932109 เปิดหน้า OPD Coding form ของ Visit V69102727694 แล้ว

Test Data
- N40 (sex M)

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "N40"
2. คลิกตัวเลือก N40

Expected Result
- คลิกแล้วไม่มีอะไรเกิดขึ้น ช่องแถวที่ 1 ยังว่าง

Actual Result
- -

หมายเหตุ
- -
```

### [Required] TC-SBH-1198-015 - ตรวจสอบแสดง tag Unacceptable PDx ที่รหัสโรค pdx = false ในแถว Category Principal ของ OPD Note

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-015
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิด OPD Note ของ Visit V69102627662 แล้ว เพิ่มแถว Diagnosis 1 แถว (Category = Principal)

Test Data
- U071 (pdx = false)

Test Steps
1. พิมพ์ "U071" ในช่อง "ค้นหา" ของแถวที่ 1

Expected Result
- ตัวเลือก "U071 - 2019 nCov virus disease(Covid-19 disease)" มี tag "Unacceptable PDx"

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026 (V2 และ V1): **ไม่ผ่าน** — ตัวเลือกไม่มี tag · คาดว่าต้องเปิดการ์ด bug ด้วย skill `qa-bug-writer`
```

### [Required] TC-SBH-1198-016 - ตรวจสอบเลือกรหัสโรค pdx = false ในแถว Category Principal ของ OPD Note ไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-016
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิด OPD Note ของ Visit V69102627662 แล้ว เพิ่มแถว Diagnosis 1 แถว (Category = Principal)

Test Data
- U071 (pdx = false)

Test Steps
1. พิมพ์ "U071" ในช่อง "ค้นหา" ของแถวที่ 1
2. คลิกตัวเลือก U071

Expected Result
- คลิกแล้วไม่มีอะไรเกิดขึ้น ช่องรหัสและช่อง Diagnosis ของแถวที่ 1 ยังว่าง

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026 (V2 และ V1): **ไม่ผ่าน** — เลือกได้ แถวแสดง U071 / "2019 nCov virus disease(Covid-19 disease)" / Principal
```

### [Required] TC-SBH-1198-017 - ตรวจสอบแสดง tag Unacceptable PDx ที่รหัสโรคเฉพาะเพศหญิงเมื่อผู้ป่วยเป็นชายในแถว Principal ของ OPD Note

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-017
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิด OPD Note ของ Visit V69102627662 แล้ว เพิ่มแถว Diagnosis 1 แถว (Category = Principal)

Test Data
- O923 (sex F)

Test Steps
1. พิมพ์ "O923" ในช่อง "ค้นหา" ของแถวที่ 1

Expected Result
- ตัวเลือก "O923 - Agalactia" มี tag "Unacceptable PDx" (ตามรูปใน comment dev 30 ก.ค.)

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026 (V2 และ V1): **ไม่ผ่าน** — ไม่มี tag
```

### [Required] TC-SBH-1198-018 - ตรวจสอบผู้ป่วยชายเลือกรหัสโรคเฉพาะเพศหญิงในแถว Principal ของ OPD Note ไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-018
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิด OPD Note ของ Visit V69102627662 แล้ว เพิ่มแถว Diagnosis 1 แถว (Category = Principal)

Test Data
- O923 (sex F)

Test Steps
1. พิมพ์ "O923" ในช่อง "ค้นหา" ของแถวที่ 1
2. คลิกตัวเลือก O923

Expected Result
- คลิกแล้วไม่มีอะไรเกิดขึ้น ช่องรหัสและช่อง Diagnosis ของแถวที่ 1 ยังว่าง

Actual Result
- -

หมายเหตุ
- -
```

### [Required] TC-SBH-1198-019 - ตรวจสอบตัวเลือก Principal ถูก disabled เมื่อเลือกรหัสโรค pdx = false ก่อนเลือก Category ใน OPD Note

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-019
- Scenario ID: TS-SBH-1198-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิด OPD Note ของ Visit V69102627662 แล้ว เพิ่มแถว Diagnosis 1 แถว

Test Data
- U071 (pdx = false)

Test Steps
1. กด x ที่ช่อง Category ของแถวที่ 1 ให้ว่าง (หรือเปลี่ยนเป็น Comorbid)
2. พิมพ์ "U071" ในช่อง "ค้นหา" แล้วคลิกเลือก
3. เปิด dropdown ช่อง Category ของแถวนั้น

Expected Result
- ตัวเลือก "Principal" เป็นสีจาง (disabled) เลือกไม่ได้ (ตามรูปใน comment dev 30 ก.ค.)

Actual Result
- -

หมายเหตุ
- ยังไม่ได้ลองตอนสำรวจ
```

### [Required] TC-SBH-1198-020 - ตรวจสอบเลือกรหัสโรค pdx = false ในแถวที่ 2 (ไม่ใช่ primary) ของหน้า รหัสโรค OPD ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-020
- Scenario ID: TS-SBH-1198-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว

Test Data
- U071 (pdx = false) · Category: comorbidity

Test Steps
1. กดปุ่ม "Add" ใต้ส่วน Diagnosis ให้มีแถวที่ 2
2. แถวที่ 2 เลือก Category "comorbidity"
3. พิมพ์ "U071" ในช่อง "ค้นหา ICD10" ของแถวที่ 2 แล้วคลิกเลือก

Expected Result
- ตัวเลือก U071 ในแถวที่ 2 ไม่มี tag "Unacceptable PDx"
- แถวที่ 2 แสดง "2019 nCov virus disease(Covid-19 disease)"

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ผ่าน
```

### [Required] TC-SBH-1198-021 - ตรวจสอบเลือกรหัสโรค pdx = false ในแถว Category Comorbid ของ OPD Note ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-021
- Scenario ID: TS-SBH-1198-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิด OPD Note ของ Visit V69102627662 แล้ว เพิ่มแถว Diagnosis 1 แถว

Test Data
- U071 (pdx = false) · Category: Comorbid

Test Steps
1. เปลี่ยน Category ของแถวที่ 1 เป็น "Comorbid"
2. พิมพ์ "U071" ในช่อง "ค้นหา" แล้วคลิกเลือก

Expected Result
- ตัวเลือก U071 ไม่มี tag "Unacceptable PDx"
- แถวแสดง U071 / "2019 nCov virus disease(Covid-19 disease)" / Comorbid

Actual Result
- -

หมายเหตุ
- -
```

### [Optional] TC-SBH-1198-022 - ตรวจสอบช่อง Category แถวที่ 2 ของหน้า รหัสโรค OPD ไม่มีตัวเลือก primary-diagnosis

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-022
- Scenario ID: TS-SBH-1198-EDG
- Case Type: Edge
- Test Level: System
- Test Type: UIUX
- Priority: Low
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว

Test Data
- -

Test Steps
1. ดูช่อง Category ของแถวที่ 1
2. กดปุ่ม "Add" ให้มีแถวที่ 2 แล้วเปิด dropdown ช่อง Category ของแถวที่ 2

Expected Result
- แถวที่ 1 Category เป็น "primary-diagnosis" และแก้ไม่ได้ (disabled)
- แถวที่ 2 มีตัวเลือก comorbidity / complication / others / external-cause ไม่มี primary-diagnosis

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ผ่าน
```

### [Optional] TC-SBH-1198-023 - ตรวจสอบลากแถวที่มีรหัสโรค pdx = false ขึ้นเป็นแถวที่ 1 ของหน้า รหัสโรค OPD แล้วต้องไม่กลายเป็น primary-diagnosis

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-023
- Scenario ID: TS-SBH-1198-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว
2. แถวที่ 1 เลือก K30 (primary-diagnosis) · แถวที่ 2 เลือก U071 (comorbidity)

Test Data
- U071 (pdx = false)

Test Steps
1. กดค้างที่ไอคอนลาก (⋮⋮) หน้าแถวที่ 2
2. ลากขึ้นไปวางเหนือแถวที่ 1 แล้วปล่อย

Expected Result
- แถวเด้งกลับที่เดิม: แถวที่ 1 ยังเป็น K30 / primary-diagnosis · แถวที่ 2 ยังเป็น U071 / comorbidity

Actual Result
- -

หมายเหตุ
- กรณีความเสี่ยงที่ไม่มีใน AC · สำรวจ DEV-X 28 ต.ค. 2026: ผ่าน (เด้งกลับ ไม่มีข้อความแจ้ง) · O923 กับผู้ป่วยชายได้ผลเดียวกัน · กรณีแถวที่ 1 ว่างแล้วลาก U071 ขึ้นก็เด้งกลับ
- ข้อสังเกต: ไม่มีข้อความบอกผู้ใช้ว่าทำไมลากไม่ได้ — ถาม PO ว่าต้องมีไหม
```

### [Optional] TC-SBH-1198-024 - ตรวจสอบ OPD Note มุมมอง V1 กันรหัสโรค pdx = false ในแถว Principal เหมือนมุมมอง V2

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-024
- Scenario ID: TS-SBH-1198-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิด OPD Note ของ Visit V69102627662 แล้ว
2. กดสวิตช์ "ดูรวม" เปลี่ยนจาก V2 เป็น V1

Test Data
- U071 (pdx = false)

Test Steps
1. ส่วน Diagnosis กด "+ เพิ่มรายการ" (Category = Principal)
2. พิมพ์ "U071" ในช่อง "ค้นหา" แล้วคลิกตัวเลือก

Expected Result
- ตัวเลือก U071 มี tag "Unacceptable PDx" และเลือกไม่ได้ เหมือนมุมมอง V2

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: **ไม่ผ่าน** เหมือน V2 (ไม่มี tag เลือกได้)
```

### [Required] TC-SBH-1198-025 - ตรวจสอบผู้ป่วยไม่ระบุเพศค้นหารหัสโรคในหน้า รหัสโรค OPD ได้เหมือนผู้ป่วยทั่วไป

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-025
- Scenario ID: TS-SBH-1198-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ลงทะเบียนผู้ป่วยใหม่ที่หน้าคัดกรอง ER แบบ "ผู้ป่วยระบุตัวตนไม่ได้" โดยเว้นช่อง "เพศ (ไม่บังคับ)" ว่าง และเปิด Visit แล้ว
2. เปิดหน้าผู้ป่วยของ Visit นั้น → เมนูขวา "รหัสโรค OPD"

Test Data
- คำค้น: "ag" และ "K30"

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "ag"
2. ล้างช่องแล้วพิมพ์ "K30"

Expected Result
- พิมพ์ "ag" แสดงรายการ Dx ในรูป "<รหัส> - <ชื่อ>" เหมือนผู้ป่วยที่ระบุเพศ (TC-001)
- พิมพ์ "K30" แสดง "K30 - Functional dyspepsia"
- ไม่มี error หรือรายการว่างเพราะผู้ป่วยไม่มีค่าเพศ

Actual Result
- -

หมายเหตุ
- QA ยืนยัน 28 ต.ค. 2026: "Unknown ต้องค้นหาได้เหมือนกัน"
- ระบบมีผู้ป่วย `gender: null` จริง (ผู้ป่วยระบุตัวตนไม่ได้ของ ER) · ยังไม่ได้สร้างผู้ป่วยของเราเองมาลอง (รายที่มีอยู่เป็นของทีมอื่น ไม่ใช้)
- ยังไม่ทราบว่าหน้า รหัสโรค OPD เปิดกับ Visit ER ได้ไหม — ถ้าไม่ได้ ต้องหาทางเปิด Visit OPD ให้ผู้ป่วยรายนี้แทน
```

### [Required] TC-SBH-1198-028 - ตรวจสอบการกันรหัสโรคเฉพาะเพศในแถว primary-diagnosis เมื่อผู้ป่วยไม่ระบุเพศ ในหน้า รหัสโรค OPD

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-028
- Scenario ID: TS-SBH-1198-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ลงทะเบียนผู้ป่วยใหม่ที่หน้าคัดกรอง ER แบบ "ผู้ป่วยระบุตัวตนไม่ได้" โดยเว้นช่อง "เพศ (ไม่บังคับ)" ว่าง และเปิด Visit แล้ว
2. เปิดหน้าผู้ป่วยของ Visit นั้น → เมนูขวา "รหัสโรค OPD"

Test Data
- O923 (sex F) · N40 (sex M) · K30 (sex M, F)

Test Steps
1. คลิกช่อง "ค้นหา ICD10" แถวที่ 1 แล้วพิมพ์ "O923"
2. ล้างช่องแล้วพิมพ์ "N40"
3. ล้างช่องแล้วพิมพ์ "K30"

Expected Result
- [ยังไม่ทราบ: รหัสเฉพาะเพศ (O923 / N40) ควรขึ้น "Unacceptable PDx" หรือเลือกได้ และ K30 ต้องเลือกได้ไหม — ต้องให้ PO ยืนยันก่อนรัน]

Actual Result
- -

หมายเหตุ
- แยกออกจาก TC-025 เดิม (28 ต.ค. 2026) เพราะเรื่องค้นหา QA ยืนยันแล้ว แต่เรื่องการกันยังไม่มีคำตอบ
- ระบบมีผู้ป่วย `gender: null` จริง (ผู้ป่วยระบุตัวตนไม่ได้ของ ER) · ยังไม่ได้สร้างผู้ป่วยของเราเองมาลอง (รายที่มีอยู่เป็นของทีมอื่น ไม่ใช้)
- ยังไม่ทราบว่าหน้า รหัสโรค OPD เปิดกับ Visit ER ได้ไหม — ถ้าไม่ได้ ต้องหาทางเปิด Visit OPD ให้ผู้ป่วยรายนี้แทน
```

### [Optional] TC-SBH-1198-026 - ตรวจสอบลากแถวที่มีรหัสโรคผ่านเงื่อนไขขึ้นเป็นแถวที่ 1 ของหน้า รหัสโรค OPD แล้วกลายเป็น primary-diagnosis

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-026
- Scenario ID: TS-SBH-1198-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว
2. แถวที่ 1 เลือก K30 (primary-diagnosis) · แถวที่ 2 เลือก Z017 (comorbidity)

Test Data
- Z017 (pdx = true · sex M, F)

Test Steps
1. กดค้างที่ไอคอนลาก (⋮⋮) หน้าแถวที่ 2
2. ลากขึ้นไปวางเหนือแถวที่ 1 แล้วปล่อย

Expected Result
- แถวที่ 1 เป็น Z017 / primary-diagnosis
- แถวที่ 2 เป็น K30

Actual Result
- -

หมายเหตุ
- ใช้เป็นตัวเปรียบเทียบกับ TC-023 (ยืนยันว่าการลากทำงาน ไม่ใช่ลากไม่ได้ทั้งหมด)
- สำรวจ DEV-X 28 ต.ค. 2026: Z017 ขึ้นแถวที่ 1 เป็น primary-diagnosis (ช่องแสดงแค่ชื่อ "Laboratory examination" ไม่มีรหัสนำหน้า) · **แถว K30 ที่ถูกดันลงถูกล้าง Category เป็นว่าง ("ประเภทโรค")** ต้องเลือกใหม่ — ถาม PO ว่าตั้งใจไหม
```

### [Optional] TC-SBH-1198-027 - ตรวจสอบลากแถว primary-diagnosis ลงล่างเพื่อให้รหัสโรค pdx = false ขึ้นเป็นแถวที่ 1 ของหน้า รหัสโรค OPD ไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1198-027
- Scenario ID: TS-SBH-1198-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1198 - [OPD] [EMR] - Improvement - แก้การลงรหัสโรคให้ check sex, pdx

Preconditions
1. ผู้ป่วยชาย HN 6932107 เปิดหน้า OPD Coding form ของ Visit V69102627662 แล้ว
2. แถวที่ 1 เลือก K30 (primary-diagnosis) · แถวที่ 2 เลือก U071 (comorbidity)

Test Data
- U071 (pdx = false)

Test Steps
1. กดค้างที่ไอคอนลาก (⋮⋮) หน้าแถวที่ 1
2. ลากลงไปวางใต้แถวที่ 2 แล้วปล่อย

Expected Result
- แถวเด้งกลับที่เดิม: แถวที่ 1 ยังเป็น K30 / primary-diagnosis · แถวที่ 2 ยังเป็น U071 / comorbidity

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 28 ต.ค. 2026: ผ่าน (เด้งกลับ ไม่มีข้อความแจ้ง)
```

---

## Field / Label ตอนสร้างจริง (ยังไม่สร้าง)

- Project: UAT#2 OPD EMR CPOE · Team: SBH Project
- Assignee: [ยังไม่ทราบ — ต้องถามก่อนสร้าง]
- Status: EXE / Scenario = Ready for Testing · TC = Not Run
- Label ทุกชั้น: label ของการ์ดแม่ (🍄 Improvement · Feature for golive - SBH · deployed on release version · 🐷 VERSION 2.8.0) + `QA Module` / `QA Sub-module / Feature` [ยังไม่ยืนยัน]
- EXE + `QA Run : Cycle Test` · Scenario + `QA Case Type` ตาม suffix · TC + `QA Case Type` + `QA Type` + `QA Execution Type: Manual`
