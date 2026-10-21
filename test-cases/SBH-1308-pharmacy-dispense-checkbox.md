# SBH-1308 — [Pharmacy] Checkbox เลือกรายการยาในหน้าใบยารอจ่าย — Test Coverage

- Requirement: https://linear.app/cortexcloud/issue/SBH-1308
- สร้างจาก Acceptance Criteria ของการ์ด (AC 1–5) ตาม skill `linear-testcase-writer`
- สถานะไฟล์นี้: **ร่าง รอ QA review** — ยังไม่สร้างการ์ดใน Linear และยังไม่ได้สำรวจแอปจริง
- รวม: **1 EXE, 2 Scenario, 11 Test Case** (11 Required, 0 Optional)
- TC granularity: **Atomic** (ค่าเริ่มต้นของ skill — ยังไม่ได้ถาม QA ถ้าอยากได้ flow-style ให้บอก)
- Run Type: `CT` · Scope/Version: `2.8.0` (label `VERSION 2.8.0`) · Environment: `DEV-X`
- Label ตอนสร้างจริง (รอ QA ยืนยัน): label ของการ์ดแม่ + `QA Module: [ยังไม่ทราบ — ไม่พบ "QA Module: Pharmacy" ใน Linear]` + `QA Sub-module / Feature : [ยังไม่ทราบ]` · Scenario/TC + `QA Case : Happy` / `QA Case : Unhappy` · TC + `QA Type : Functional` + `QA Execution Type: Manual` · EXE + `QA Run : Cycle Test`

### ข้อตกลงกับ QA

- **Scope:** เทสตาม AC 1–5 เท่านั้น ไม่เทสสถานะ checkbox ที่ header ตอนติ๊กบางรายการ, เมนู "…" แบบเดิม และการคงสถานะติ๊กหลัง reload
- **AC 3–4:** ติ๊กไม่ครบทุกรายการ ปุ่ม "จ่ายยา" ต้องกดไม่ได้ (disabled) ตามที่ dev แจ้งใน comment 14 ก.ย. 2569
- **Feature flag:** ไม่มี (comment 31 ส.ค. 2569)
- **Test data:** สร้างผู้ป่วยใหม่ + visit OPD คลินิก "SBH - ห้องตรวจสระบุรี" แล้วสั่งยา 2–3 รายการ ไม่แตะใบยาของคนอื่น
- **สมมติฐาน (ยังไม่ยืนยัน):** role user1 (`CORTEX_USERNAME_Super_User`) และห้องยาของ site SBH เหมือน SBH-2457

### วิธีเตรียมข้อมูลทดสอบ (ใช้กับทุก TC)

1. ลงทะเบียนผู้ป่วยใหม่ที่ ER (`/cortex/er/triage` → "ผู้ป่วยใหม่") แล้วกด "ยกเลิก" ที่ modal "เปิด Visit ER" → ได้ HN ไม่มี visit
2. เวชระเบียน → ค้นหา HN → "Visit ใหม่" → "Walk-in ไป คลินิก" = "SBH - ห้องตรวจสระบุรี" → "สร้าง"
3. แอปผู้ป่วยนอก → แท็บ "คำขอ Walk-in" → "ลงตาราง" → เลือกแพทย์และช่วงเวลา → "บันทึก" → แท็บ "ทั้งหมด" → "เช็คอิน"
4. สั่งยา 3 รายการให้ผู้ป่วยรายนี้ → [ยังไม่ทราบ: เมนู/ขั้นตอนสั่งยาจนใบยาไปขึ้นที่หน้าใบยารอจ่าย — ยืนยันตอนสำรวจ]
5. เมนูห้องยา → หน้าใบยารอจ่าย → เปิดใบยาของ HN นี้ → [ยังไม่ทราบ: ชื่อเมนู/แท็บจริง — ยืนยันตอนสำรวจ]
- TC ที่ต้องกด "จ่ายยา" จริง (TC-005, 006, 008) ใช้ใบยาใหม่ทุกครั้ง เพราะจ่ายแล้วใบยาออกจากหน้ารอจ่าย

---
### EXE

#### EXE - CT - 2.8.0

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.0
- Module: Pharmacy — หน้าใบยารอจ่าย
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว
- Environment: DEV-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Checkbox หน้ารายการยาแต่ละตัว คลิกสลับเลือก/ยกเลิกได้ (AC 1)
- Checkbox ที่ header เลือก/ยกเลิกทุกรายการในใบยา (AC 2)
- ปุ่ม "จ่ายยา" กดได้เมื่อเลือกครบทุกรายการเท่านั้น (AC 3–4)
- การติ๊ก checkbox ไม่ถือเป็นการจ่ายยา จ่ายจริงเมื่อกด "จ่ายยา" (AC 5)
- ไม่รวม: สถานะ header ตอนติ๊กบางรายการ, เมนู "…" แบบเดิม, การคงสถานะติ๊กหลัง reload

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- ไม่มี feature flag (comment 31 ส.ค. 2569)
```

### Scenario

#### TS-SBH-1308-HPY - ตรวจสอบการเลือกรายการยาด้วย checkbox และการจ่ายยาเมื่อเลือกครบทุกรายการ

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1308-HPY
- Case Type: Happy
- Suffix: HPY
- Module: Pharmacy — หน้าใบยารอจ่าย
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

วัตถุประสงค์
- ยืนยันว่าคลิก checkbox หน้ายาและที่ header เพื่อเลือก/ยกเลิกได้ในคลิกเดียว
- ยืนยันว่าเลือกครบทุกรายการแล้วกด "จ่ายยา" ได้ และการติ๊กอย่างเดียวยังไม่ถือเป็นการจ่ายยา

ขอบเขต Requirement
- AC 1, AC 2, AC 3, AC 5
- Business Rule 7: จ่ายสำเร็จแล้วสถานะใบยาเป็นไปตาม flow จ่ายยาเดิม

ความเสี่ยง
- ติ๊กแล้วระบบจ่ายยาทันทีโดยไม่ได้กด "จ่ายยา" ทำให้จ่ายยาผิดพลาด
- เลือกครบแล้วปุ่มยังกดไม่ได้ ห้องยาจ่ายยาไม่ได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### [Required] TC-SBH-1308-001 - ตรวจสอบคลิก checkbox หน้ารายการยาที่ยังไม่เลือก แล้วเปลี่ยนเป็นเลือก (เขียว)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-001
- Scenario ID: TS-SBH-1308-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. มีใบยารอจ่ายของผู้ป่วยทดสอบ 3 รายการ ทุกรายการยังไม่เลือก (เทา)

Test Data
- ผู้ป่วยทดสอบที่สร้างใหม่ + ใบยา 3 รายการ [ยังไม่ทราบ: HN / ชื่อยา — เติมตอนสำรวจ]

Test Steps
1. เมนูห้องยา → หน้าใบยารอจ่าย → เปิดใบยาของผู้ป่วยทดสอบ
2. คลิก checkbox หน้ารายการยาที่ 1 หนึ่งครั้ง

Expected Result
- checkbox รายการยาที่ 1 เปลี่ยนจากเทาเป็นเขียว (เลือกแล้ว) ในคลิกเดียว โดยไม่ต้องเปิดเมนู "…"
- รายการยาที่ 2 และ 3 ยังเป็นเทา

Actual Result
- -

หมายเหตุ
- AC 1
```

#### [Required] TC-SBH-1308-002 - ตรวจสอบคลิก checkbox หน้ารายการยาที่เลือกอยู่ แล้วกลับเป็นไม่เลือก (เทา)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-002
- Scenario ID: TS-SBH-1308-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. เปิดใบยารอจ่ายของผู้ป่วยทดสอบ รายการยาที่ 1 เลือกอยู่ (เขียว)

Test Data
- ใบยาเดียวกับ TC-001

Test Steps
1. คลิก checkbox หน้ารายการยาที่ 1 อีกครั้ง

Expected Result
- checkbox รายการยาที่ 1 เปลี่ยนจากเขียวกลับเป็นเทา (ไม่เลือก) ในคลิกเดียว

Actual Result
- -

หมายเหตุ
- AC 1
```

#### [Required] TC-SBH-1308-003 - ตรวจสอบคลิก checkbox ที่ header แล้วรายการยาทุกตัวในใบยาถูกเลือก

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-003
- Scenario ID: TS-SBH-1308-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. เปิดใบยารอจ่ายของผู้ป่วยทดสอบ ทุกรายการยังไม่เลือก (เทา)

Test Data
- ใบยา 3 รายการของผู้ป่วยทดสอบ

Test Steps
1. คลิก checkbox ที่หัว column หนึ่งครั้ง

Expected Result
- รายการยาทั้ง 3 รายการเปลี่ยนเป็นเขียว (เลือกแล้ว) พร้อมกัน

Actual Result
- -

หมายเหตุ
- AC 2
```

#### [Required] TC-SBH-1308-004 - ตรวจสอบคลิก checkbox ที่ header ซ้ำ แล้วรายการยาทุกตัวกลับเป็นไม่เลือก

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-004
- Scenario ID: TS-SBH-1308-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. เปิดใบยารอจ่ายของผู้ป่วยทดสอบ ทุกรายการเลือกอยู่ (เขียว) จาก checkbox ที่ header

Test Data
- ใบยาเดียวกับ TC-003

Test Steps
1. คลิก checkbox ที่หัว column อีกครั้ง

Expected Result
- รายการยาทั้ง 3 รายการกลับเป็นเทา (ไม่เลือก) พร้อมกัน

Actual Result
- -

หมายเหตุ
- AC 2
```

#### [Required] TC-SBH-1308-005 - ตรวจสอบติ๊กหน้ายาครบทุกรายการทีละตัว แล้วกดปุ่ม "จ่ายยา" ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-005
- Scenario ID: TS-SBH-1308-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. เปิดใบยารอจ่ายของผู้ป่วยทดสอบ ทุกรายการยังไม่เลือก (เทา)

Test Data
- ใบยาใหม่ 3 รายการ (ใช้แล้วจ่ายจริง)

Test Steps
1. คลิก checkbox หน้ารายการยาที่ 1, 2 และ 3 ทีละตัวจนเขียวครบ
2. ดูปุ่ม "จ่ายยา" (สีฟ้า)
3. กดปุ่ม "จ่ายยา"

Expected Result
- หลังติ๊กครบ ปุ่ม "จ่ายยา" เปลี่ยนเป็นกดได้
- กดแล้วระบบรับคำสั่งจ่ายยา ไม่มีข้อความ error

Actual Result
- -

หมายเหตุ
- AC 3
```

#### [Required] TC-SBH-1308-006 - ตรวจสอบเลือกครบทุกรายการด้วย checkbox ที่ header แล้วกดปุ่ม "จ่ายยา" ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-006
- Scenario ID: TS-SBH-1308-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. เปิดใบยารอจ่ายของผู้ป่วยทดสอบ ทุกรายการยังไม่เลือก (เทา)

Test Data
- ใบยาใหม่ 3 รายการ (ใช้แล้วจ่ายจริง)

Test Steps
1. คลิก checkbox ที่หัว column หนึ่งครั้ง
2. ดูปุ่ม "จ่ายยา" (สีฟ้า)
3. กดปุ่ม "จ่ายยา"

Expected Result
- หลังเลือกทั้งหมดจาก header ปุ่ม "จ่ายยา" เปลี่ยนเป็นกดได้
- กดแล้วระบบรับคำสั่งจ่ายยา ไม่มีข้อความ error

Actual Result
- -

หมายเหตุ
- AC 2 + AC 3 · แยกจาก TC-005 เพราะเป็นวิธีเลือกครบคนละทาง
```

#### [Required] TC-SBH-1308-007 - ตรวจสอบติ๊กหน้ายาครบแต่ยังไม่กด "จ่ายยา" แล้วใบยายังอยู่ในหน้าใบยารอจ่าย

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-007
- Scenario ID: TS-SBH-1308-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. เปิดใบยารอจ่ายของผู้ป่วยทดสอบ ทุกรายการยังไม่เลือก (เทา)

Test Data
- ใบยา 3 รายการของผู้ป่วยทดสอบ

Test Steps
1. คลิก checkbox ที่หัว column ให้เขียวครบ
2. ไม่กดปุ่ม "จ่ายยา" ออกจากใบยากลับไปที่รายการหน้าใบยารอจ่าย
3. ค้นหาใบยาของผู้ป่วยทดสอบ

Expected Result
- ใบยายังอยู่ในหน้าใบยารอจ่าย สถานะยังเป็นรอจ่าย [ยังไม่ทราบ: ชื่อสถานะบนหน้าจอ — ยืนยันตอนสำรวจ]

Actual Result
- -

หมายเหตุ
- AC 5 · ไม่ตรวจว่าสถานะติ๊กยังคงอยู่หรือไม่หลังออกจากใบยา (นอก scope)
```

#### [Required] TC-SBH-1308-008 - ตรวจสอบกด "จ่ายยา" หลังเลือกครบ แล้วสถานะใบยาเปลี่ยนตาม flow จ่ายยาเดิม

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-008
- Scenario ID: TS-SBH-1308-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. เปิดใบยารอจ่ายของผู้ป่วยทดสอบ ทุกรายการยังไม่เลือก (เทา)

Test Data
- ใบยาใหม่ 3 รายการ (ใช้แล้วจ่ายจริง)

Test Steps
1. คลิก checkbox ที่หัว column ให้เขียวครบ
2. กดปุ่ม "จ่ายยา"
3. กลับไปที่รายการหน้าใบยารอจ่าย แล้วค้นหาใบยาของผู้ป่วยทดสอบ

Expected Result
- ใบยาไม่อยู่ในรายการรอจ่ายแล้ว และสถานะใบยา/รายการยาเป็นไปตาม flow จ่ายยาเดิม [ยังไม่ทราบ: สถานะปลายทาง/แท็บที่ใบยาย้ายไป — ยืนยันตอนสำรวจ]

Actual Result
- -

หมายเหตุ
- AC 5 + Business Rule 7
```

#### TS-SBH-1308-UHP - ตรวจสอบว่าจ่ายยาทั้งใบไม่ได้เมื่อยังเลือกรายการยาไม่ครบ

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1308-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: Pharmacy — หน้าใบยารอจ่าย
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

วัตถุประสงค์
- ยืนยันว่าปุ่ม "จ่ายยา" กดไม่ได้ (disabled) เมื่อมีรายการยาอย่างน้อย 1 รายการที่ยังไม่เลือก

ขอบเขต Requirement
- AC 3, AC 4
- Business Rule 4–5

ความเสี่ยง
- ห้องยาจ่ายยาทั้งใบได้ทั้งที่ยังตรวจยาไม่ครบ (ปัญหาเดิมของการ์ด)

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- พฤติกรรม disabled อ้างอิง comment ของ dev 14 ก.ย. 2569
```

#### [Required] TC-SBH-1308-009 - ตรวจสอบปุ่ม "จ่ายยา" กดไม่ได้เมื่อยังไม่เลือกรายการยาเลย

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-009
- Scenario ID: TS-SBH-1308-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. เปิดใบยารอจ่ายของผู้ป่วยทดสอบ ทุกรายการยังไม่เลือก (เทา)

Test Data
- ใบยา 3 รายการของผู้ป่วยทดสอบ

Test Steps
1. ดูปุ่ม "จ่ายยา" (สีฟ้า)
2. ลองกดปุ่ม "จ่ายยา"

Expected Result
- ปุ่ม "จ่ายยา" เป็น disabled กดแล้วไม่มีอะไรเกิดขึ้น ใบยายังอยู่ในหน้าใบยารอจ่าย

Actual Result
- -

หมายเหตุ
- AC 3 + AC 4
```

#### [Required] TC-SBH-1308-010 - ตรวจสอบปุ่ม "จ่ายยา" กดไม่ได้เมื่อเลือกรายการยาไม่ครบ (เหลือ 1 รายการ)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-010
- Scenario ID: TS-SBH-1308-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. เปิดใบยารอจ่ายของผู้ป่วยทดสอบ ทุกรายการยังไม่เลือก (เทา)

Test Data
- ใบยา 3 รายการของผู้ป่วยทดสอบ

Test Steps
1. คลิก checkbox หน้ารายการยาที่ 1 และ 2 ให้เขียว ปล่อยรายการที่ 3 เป็นเทา
2. ดูปุ่ม "จ่ายยา" แล้วลองกด

Expected Result
- ปุ่ม "จ่ายยา" เป็น disabled กดแล้วไม่มีอะไรเกิดขึ้น ใบยายังอยู่ในหน้าใบยารอจ่าย

Actual Result
- -

หมายเหตุ
- AC 4
```

#### [Required] TC-SBH-1308-011 - ตรวจสอบเลือกครบแล้วยกเลิก 1 รายการ ปุ่ม "จ่ายยา" กลับเป็นกดไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1308-011
- Scenario ID: TS-SBH-1308-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1308 - [Pharmacy] ตรวจสอบใบยารอจ่ายอยากติ๊กถูกข้างหน้าคลิกเดียว

Preconditions
1. Login ด้วย user1
2. เปิดใบยารอจ่ายของผู้ป่วยทดสอบ ทุกรายการยังไม่เลือก (เทา)

Test Data
- ใบยา 3 รายการของผู้ป่วยทดสอบ

Test Steps
1. คลิก checkbox ที่หัว column ให้เขียวครบ แล้วดูว่าปุ่ม "จ่ายยา" กดได้
2. คลิก checkbox หน้ารายการยาที่ 2 ให้กลับเป็นเทา
3. ดูปุ่ม "จ่ายยา" แล้วลองกด

Expected Result
- หลังยกเลิกรายการที่ 2 ปุ่ม "จ่ายยา" กลับเป็น disabled กดแล้วไม่มีอะไรเกิดขึ้น

Actual Result
- -

หมายเหตุ
- AC 4 · coverage เพิ่มนอก AC ตรง ๆ เพราะเสี่ยงที่ปุ่มค้างสถานะกดได้หลังเคยเลือกครบ
```

---
### ตาราง AC → TC

| AC | Expected | TC |
| -- | -- | -- |
| 1 | คลิก checkbox รายการยาเพื่อเลือก/ยกเลิกได้ | 001, 002 |
| 2 | มี checkbox ที่ header สำหรับเลือก/ยกเลิกทั้งหมด | 003, 004, 006 |
| 3 | กด "จ่ายยา" ได้เมื่อเลือกครบทุกรายการเท่านั้น | 005, 006, 009 |
| 4 | ถ้ามีรายการที่ยังไม่เลือก ระบบไม่ให้จ่ายทั้งใบ | 009, 010, 011 |
| 5 | การติ๊ก checkbox ยังไม่ถือเป็นการจ่ายยา จ่ายจริงเมื่อกด "จ่ายยา" | 007, 008 |

### Requirement gap

- **Expected behavior**
  - สถานะใบยา/รายการยาหลังจ่ายสำเร็จ "ตาม flow เดิม" ไม่ได้ระบุชื่อสถานะ → เติมจากหน้าจอจริงตอนสำรวจ (TC-007, 008)
  - สถานะ checkbox ที่ header ตอนติ๊กบางรายการ (indeterminate หรือไม่) ไม่ได้ระบุ → QA ตัดออกจาก scope แล้ว
  - ติ๊กไว้แล้วออกจากหน้า/reload สถานะติ๊กคงอยู่หรือไม่ ไม่ได้ระบุ → QA ตัดออกจาก scope แล้ว
  - เมนู "…" (ยืนยันจ่ายยา / ยกเลิกจ่ายยา) ยังอยู่หรือเอาออก ไม่ได้ระบุ → QA ตัดออกจาก scope แล้ว
- **Validation**
  - AC บอกแค่ "ไม่อนุญาตให้จ่าย" ไม่ได้บอกรูปแบบ → ใช้ disabled ตาม comment dev (14 ก.ย. 2569) ไม่มีข้อความแจ้งเตือน
- **Error handling**
  - ไม่ระบุกรณีจ่ายยาไม่สำเร็จ (เช่น ระบบ error ตอนกด "จ่ายยา")
- **Permission / role**
  - ไม่ระบุ role ที่ใช้หน้านี้ → ใช้ user1 ตามสมมติฐาน
- **Edge cases**
  - ใบยาที่มีรายการเดียว, รายการยาที่ถูกยกเลิก/จ่ายบางส่วนไปแล้ว ไม่ได้ระบุ → ไม่มี TC
