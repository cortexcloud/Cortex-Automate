# SBH-2457 — Form OPD note / Pre-assessment หลัง Restructure EHRbase — Test Coverage

- Requirement: https://linear.app/cortexcloud/issue/SBH-2457
- สร้างจาก Acceptance Criteria ของการ์ด (AC 1–16) ตาม skill `linear-testcase-writer` · ปรับให้อิงฟอร์ม SBH ตามผลสำรวจแอปจริง 20–21 ต.ค. 2569
- สถานะไฟล์นี้: **สร้างใน Linear แล้ว (21 ต.ค. 2569)** — EXE SBH-2818 → Scenario SBH-2819 → TC SBH-2820 ถึง SBH-2840 (TC-001..021 ตามลำดับ)
- รวม: **1 EXE, 1 Scenario, 21 Test Case** (20 Required, 1 Optional) · ผลจากรอบสำรวจ: **Passed 13 · Failed 7 · Not Run 1**
- TC granularity: **Flow-style** (QA ยืนยัน 20 ต.ค. 2569) — 1 TC ต่อ 1 AC ไล่ กรอก → บันทึก → reload → ตรวจค่า · ทางเลือกคู่ขนาน (Collapse / Expand ใน AC 16) แยกคนละ TC
- Run Type: `CT` · Scope/Version: `2.9.0` (label `VERSION 2.9.0`) · Environment: `DEV-X`
- Label ตอนสร้างจริง (QA ยืนยัน 21 ต.ค. 2569): label ของการ์ดแม่ + `QA Module: OPD` + `QA Sub-module / Feature : OPD Note & Pre-assessment` (สร้างใหม่) · Scenario/TC + `QA Case : Happy` · TC + `QA Type : Functional` + `QA Execution Type: Manual` · EXE + `QA Run : Cycle Test`
- สถานะ TC ตอนสร้างจริง: ใส่ผลจากรอบสำรวจ (Passed / Failed พร้อมหลักฐานและลิงก์ bug) · ข้อที่ยังไม่ได้เทส = Not Run

### ข้อตกลงกับ QA

- **ฟอร์มที่ใช้เทส:** site SBH → คลินิก **"SBH - ห้องตรวจสระบุรี"** (template `sbh_general_opd_note_v2` / `sbh_general_opd_pre_assessment_v2`) · role **user1** (`CORTEX_USERNAME_Super_User`) · Pre-assessment = tab "OPD" > **"ฟอร์มคัดกรอง"**
- **ข้อไหนหน้าจอไม่มีตาม AC ให้ตีเป็น bug** (21 ต.ค. 2569)
- **Fall risk (AC 14):** การ์ดเขียนว่าต้องไม่มี แต่ฟอร์ม SBH มี "ความเสี่ยงพลัดตกหกล้ม" → QA สั่ง "ถ้ามีก็เช็คไปเลย" → TC-014 ตรวจว่าใช้งานได้
- **Body chart (AC 6):** ตรวจว่าใช้งานได้เหมือนเดิม ไม่ตรวจ Default collapsed
- **Physical examination (AC 5):** ตรวจแค่ Free text + Rich text + บันทึกแล้วรูปแบบยังอยู่ ไม่ตรวจขนาดช่อง
- **Family history general:** ไม่มี AC → `[Optional]`
- **Underlying disease:** ไม่มี TC ในการ์ดนี้ ต้องทำงานเหมือนที่ SBH-2413 ระบุ (SBH-2413 ยังไม่เทสรอบนี้)
- **Body metrics / Pain score (AC 3–4):** มีทั้งใน OPD Note และฟอร์มคัดกรอง → เทสทั้งสองที่ (TC-003/004 และ TC-019/020)
- **BMI / BSA:** ไม่มีข้อมูลระบบเดิมให้เทียบ → ใช้สูตรที่ย้อนหาจากหน้าจอจริงและคำนวณมือตรงทุกชุด: **BMI = W ÷ (H/100)²** · **BSA = Mosteller √(H × W ÷ 3600)** · ปัดทศนิยม 2 ตำแหน่ง (หน้าจอตัดเลข 0 ท้าย เช่น 28.90 แสดง 28.9)
- **CC / PI:** ถ้ามีฟอร์มคัดกรองก่อน → prefill ใน OPD Note แก้ได้ และ**ไม่ sync กลับ** · ถ้ายังไม่มีฟอร์มคัดกรอง → ค่าที่แพทย์กรอกใน OPD Note **ต้องถูกเก็บ** (21 ต.ค. 2569)
- **AC 16:** ตั้งค่าแล้วเปิดฟอร์ม section ต้องแสดงตามที่ตั้ง · checkbox **"ซ่อน" = Collapse** / ไม่ติ๊ก = Expand (อ่านตามหน้าตั้งค่า) · หน้าตั้งค่า = ผู้ดูแลระบบ > แบบฟอร์ม > แบบฟอร์ม → แท็บ "แบบฟอร์ม EMR" → "SBH GENERAL OPD NOTE" / "SBH OPD PRE-ASSESSMENT" · เป็นค่ากลางทั้งระบบ ต้องคืนค่าเดิมทุกครั้ง

### วิธีเตรียมข้อมูลทดสอบ (ใช้กับทุก TC)

1. ลงทะเบียนผู้ป่วยใหม่ที่ ER (`/cortex/er/triage` → "ผู้ป่วยใหม่") แล้วกด "ยกเลิก" ที่ modal "เปิด Visit ER" → ได้ HN ไม่มี visit
2. เวชระเบียน → ค้นหา HN → หน้าผู้ป่วย กด "Visit ใหม่" → "Walk-in ไป คลินิก" = **"SBH - ห้องตรวจสระบุรี"** (สิทธิ H01 - เงินสด เติมให้) → "สร้าง"
3. แอปผู้ป่วยนอก → แท็บ "คำขอ Walk-in" → "ลงตาราง" → แพทย์ที่มีตารางที่คลินิกนี้ (รอบสำรวจใช้ "นาย ทดสอบ มานะ") → เลือกช่วงเวลา → "บันทึก"
4. แท็บ "ทั้งหมด" (กด "ล้าง" ตัวกรองก่อน) → ค้นหา HN → "เช็คอิน" → คลิกชื่อผู้ป่วย → tab "OPD"
- ข้อมูลรอบสำรวจ: HN 6931979 (หญิง) · VN V69102027456 · EN E69102032186 · หลักฐาน `.playwright-mcp/SBH-2457/explore/` (ภาพ 19–26 · คลิป 05–09)

---
### EXE

#### EXE - CT - 2.9.0

- Linear: SBH-2818

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: EMR — Form OPD note / Pre-assessment (SBH)
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base
- Environment: DEV-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- OPD Note (SBH): Chief complaint, Present illness, Body metrics (BMI/BSA), Vital sign (Pain score), Physical examination, Body chart, เอกสารแนบ, Diagnosis (Onset date), ไม่มี Note to nurse (AC 1–9)
- ฟอร์มคัดกรอง (SBH): การมาถึงและความต้องการช่วยเหลือ, การคัดกรองเพศหญิง, ประวัติแพ้, ประวัติการผ่าตัด / สุรา / บุหรี่, ความเสี่ยงพลัดตกหกล้ม, เอกสารแนบ, Body metric, Pain score (AC 3–4, 10–15)
- ฟอร์มคัดกรอง: Family history general (Optional — ไม่มี AC)
- CC / PI prefill จากฟอร์มคัดกรองไป OPD Note และไม่ sync กลับ (business rule จาก QA)
- Setting form: ค่า Default Expand / Collapse ของแต่ละ section (AC 16)
- ไม่รวม Underlying disease — อ้างอิง SBH-2413

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- ไม่รวมงาน Low priority (Design Body metrics แบบเดิม, ปรับ Design การคัดกรองเพศหญิง) เพราะไม่อยู่ใน AC
- ผลรอบนี้มาจากการสำรวจแอปจริง 20–21 ต.ค. 2569 บนคลินิก "SBH - ห้องตรวจสระบุรี" · bug ที่เจอ: SBH-2812 ถึง SBH-2817
```

### Scenario

#### TS-SBH-2457-HPY - ตรวจสอบการบันทึกและแสดงผล section ใน OPD Note / ฟอร์มคัดกรอง (SBH) และค่า Default Expand/Collapse

- Linear: SBH-2819

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Suffix: HPY
- Module: EMR — Form OPD note / Pre-assessment (SBH)
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

วัตถุประสงค์
- ยืนยันว่า OPD Note และฟอร์มคัดกรองของ SBH มี section ครบตามที่กำหนด บันทึกแล้ว reload ข้อมูลยังอยู่ และ section ที่ต้องเอาออกไม่แสดง
- ยืนยันว่า CC / PI prefill จากฟอร์มคัดกรองไป OPD Note ได้ และไม่ sync กลับ
- ยืนยันว่าค่า Default Expand / Collapse ที่ตั้งใน Setting form มีผลเมื่อเปิดฟอร์ม

ขอบเขต Requirement
- OPD Note: AC 1–9
- ฟอร์มคัดกรอง: AC 3–4, 10–15 (+ Family history general แบบ Optional)
- Setting form: AC 16

ความเสี่ยง
- ฟอร์มเวชระเบียน OPD ถ้าบันทึกไม่ได้หรือข้อมูลหายหลัง reload กระทบการบันทึกจริงของแพทย์/พยาบาล
- BMI / BSA คำนวณผิด กระทบการคำนวณยาและการประเมินผู้ป่วย

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

##### Test Case ภายใต้ Scenario นี้

#### [Required] TC-SBH-2457-001 - ทดสอบเลือก CC suggestion ใน OPD Note ตอนยังไม่มีฟอร์มคัดกรอง แล้วค่ายังอยู่หลัง reload

- Linear: SBH-2820

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-001
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว และ**ยังไม่มีการบันทึกฟอร์มคัดกรอง** (ดู "วิธีเตรียมข้อมูลทดสอบ")
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- CC suggestion: ปุ่ม "ปวดหลัง"

Test Steps
1. ที่ section Chief Complaint กดปุ่ม "ปวดหลัง"
2. กด "สร้าง"
3. reload หน้า แล้วเปิด "OPD Note" เดิม

Expected Result
- section Chief Complaint มีปุ่ม CC suggestion ให้เลือก (ปวดไหล่ คอ, ปวดแขน, ปวดหลัง, … นวดเพื่อสุขภาพ)
- กดปุ่มแล้วข้อความ "ปวดหลัง" เข้าช่อง Chief Complaint
- หลัง reload ช่อง Chief Complaint ยังเป็น "ปวดหลัง"

Actual Result
- **Failed** — ทดสอบ 20/10/2569 (HN 6931979 · EN E69102032186): ปุ่ม suggestion มีและกดแล้วข้อความเข้าช่อง · กด "สร้าง" บันทึกสำเร็จ แต่หลัง reload ช่อง Chief Complaint ว่าง ส่วน section อื่นที่บันทึกพร้อมกันยังอยู่ครบ
- Bug: SBH-2816
- หลักฐาน: 20a-sbh-cc-pi.png (ก่อนบันทึก) · 21c-sbh-opd-after-reload-1.png (หลัง reload) · วิดีโอ 06-sbh-opd-note.webm

หมายเหตุ
- AC 1 · กรณีมีฟอร์มคัดกรองก่อน ดู TC-021
```

#### [Required] TC-SBH-2457-002 - ทดสอบบันทึก Present illness ใน OPD Note ตอนยังไม่มีฟอร์มคัดกรอง แล้วข้อมูลยังอยู่หลัง reload

- Linear: SBH-2821

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-002
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว และ**ยังไม่มีการบันทึกฟอร์มคัดกรอง**
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- Present Illness: "QA-SBH2457 SBH present illness"

Test Steps
1. พิมพ์ Present Illness ตาม Test Data
2. กด "สร้าง"
3. reload หน้า แล้วเปิด "OPD Note" เดิม

Expected Result
- กด "สร้าง" สำเร็จ ไม่มีข้อความ error
- หลัง reload Present Illness แสดงข้อความ "QA-SBH2457 SBH present illness" ครบ

Actual Result
- **Failed** — ทดสอบ 20/10/2569: บันทึกสำเร็จ แต่หลัง reload ช่อง Present Illness ว่าง
- Bug: SBH-2816
- หลักฐาน: 20a-sbh-cc-pi.png · 21c-sbh-opd-after-reload-1.png · วิดีโอ 06-sbh-opd-note.webm

หมายเหตุ
- AC 2 · กรณีมีฟอร์มคัดกรองก่อน ดู TC-021
```

#### [Required] TC-SBH-2457-003 - คำนวณ BMI และ BSA จากน้ำหนักและส่วนสูงใน Body metric ของ OPD Note ถูกต้อง

- Linear: SBH-2822

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-003
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note" แล้วกางหัวข้อ "Body metric" (พับอยู่ตอนเปิดฟอร์ม)

Test Data
- Weight 72.5 kg / Height 158.4 cm → BMI 28.90 (หน้าจอแสดง 28.9) / BSA 1.79
- สูตร: BMI = W ÷ (H/100)² · BSA = Mosteller √(H × W ÷ 3600) · ปัด 2 ตำแหน่ง

Test Steps
1. กรอก Weight แล้วกด Tab
2. กรอก Height แล้วกด Tab
3. ดูค่า BMI และ BSA
4. กด "สร้าง"
5. reload หน้า แล้วเปิด "OPD Note" เดิม

Expected Result
- BMI = 28.9
- BSA = 1.79
- หลัง reload Weight, Height, BMI และ BSA ยังเป็นค่าเดิม

Actual Result
- **Passed** — ทดสอบ 20/10/2569: BMI 28.9 / BSA 1.79 ตรงสูตร · ลองเพิ่ม 60/165 → 22.04/1.66 · 95/180 → 29.32/2.18 · 95/150 → 42.22/1.99 · 45/150 → 20/1.37 ตรงทุกชุด และออกจากช่องด้วย Tab ก็คำนวณใหม่ทันที · หลัง reload ค่ายังอยู่และขึ้นที่หัวจอผู้ป่วย
- หลักฐาน: 20c-sbh-opd-bmi-bsa.png · 21d-sbh-opd-after-reload-vitals.png · วิดีโอ 06-sbh-opd-note.webm

หมายเหตุ
- AC 3 · ไม่มีค่าจากระบบเดิมให้เทียบ ใช้สูตรที่ย้อนหาจากหน้าจอจริง (QA ตกลง)
```

#### [Required] TC-SBH-2457-004 - ทดสอบบันทึก Pain score ใน Vital Signs ของ OPD Note แล้วค่ายังอยู่หลัง reload

- Linear: SBH-2823

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-004
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note" แล้วกางหัวข้อ "Vital Signs" (พับอยู่ตอนเปิดฟอร์ม)

Test Data
- Pain score (0-10): 4

Test Steps
1. ที่ Vital Signs เลือก Pain score ตาม Test Data
2. กด "สร้าง"
3. reload หน้า แล้วเปิด "OPD Note" เดิม

Expected Result
- Vital Signs มีช่อง Pain score (0-10)
- หลัง reload Pain score ยังเป็น 4

Actual Result
- **Passed** — ทดสอบ 20/10/2569: เลือก 4 ได้ · หลัง reload ยังเป็น 4 และหัวจอผู้ป่วยแสดง Pain 4
- หลักฐาน: 20b-sbh-opd-pain.png · 21d-sbh-opd-after-reload-vitals.png · วิดีโอ 06-sbh-opd-note.webm

หมายเหตุ
- AC 4
```

#### [Required] TC-SBH-2457-005 - ทดสอบพิมพ์ Free text พร้อมจัดรูปแบบด้วย Rich text ใน Physical Examination แล้วรูปแบบยังอยู่หลังบันทึก

- Linear: SBH-2824

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-005
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- ข้อความ "QA-SBH2457 PE BOLD and ITALIC UNDER" โดย BOLD = ตัวหนา · ITALIC = ตัวเอียง · UNDER = ขีดเส้นใต้ (ปุ่ม U)

Test Steps
1. ที่ Physical Examination พิมพ์ข้อความในช่อง Free text เหนือตาราง System
2. ใช้แถบเครื่องมือ Rich text ทำตัวหนา / ตัวเอียง / ขีดเส้นใต้ตาม Test Data
3. กด "สร้าง"
4. reload หน้า แล้วเปิด "OPD Note" เดิม

Expected Result
- Physical Examination มีช่อง Free text พร้อมแถบเครื่องมือ Rich text (B, I, U, S, สี, H1–H3, list ฯลฯ)
- ข้อความแสดงตัวหนา / ตัวเอียง / ขีดเส้นใต้ตามที่จัดไว้
- หลัง reload ข้อความและรูปแบบยังอยู่ครบ

Actual Result
- **Passed** — ทดสอบ 20/10/2569: มีแถบเครื่องมือ Rich text · จัดรูปแบบได้ (กดปุ่ม U บนแถบได้จริง) · หลัง reload รูปแบบตัวหนา / ตัวเอียง / ขีดเส้นใต้ยังอยู่
- หลักฐาน: 20d-sbh-opd-pe-richtext-filled.png · 21c-sbh-opd-after-reload-1.png · วิดีโอ 06-sbh-opd-note.webm

หมายเหตุ
- AC 5 · ไม่ตรวจขนาดช่องตามที่ QA ยืนยัน
```

#### [Required] TC-SBH-2457-006 - ตรวจสอบการวาด Body Chart ใน OPD Note แล้วภาพยังอยู่หลังบันทึก

- Linear: SBH-2825

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-006
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- วาดเส้น 1 เส้นบนภาพร่างกายด้านหน้า ด้วยเครื่องมือดินสอ สีแดง

Test Steps
1. คลิกหัวข้อ "Body Chart" ให้กาง
2. วาดตาม Test Data
3. กด "สร้าง"
4. reload หน้า แล้วเปิด "OPD Note" เดิม และกาง Body Chart

Expected Result
- Body Chart มีเครื่องมือวาด (ดินสอ, เลือก, ยางลบ, ข้อความ, undo/redo) และวาดได้
- หลัง reload เส้นที่วาดยังอยู่

Actual Result
- **Passed** — ทดสอบ 20/10/2569: วาดได้ · หลัง reload เส้นยังอยู่
- ข้อสังเกต: template ตั้งต้นเป็น "Adult Male" ทั้งที่ผู้ป่วยเป็นหญิง · Body Chart พับไว้ตอนเปิดฟอร์ม
- หลักฐาน: 20e-sbh-opd-bodychart-collapsed.png · 20f-sbh-opd-bodychart-drawn.png · 21e-sbh-opd-after-reload-bodychart.png · วิดีโอ 06-sbh-opd-note.webm

หมายเหตุ
- AC 6 · ไม่ตรวจ Default collapsed ตามที่ QA ยืนยัน
```

#### [Required] TC-SBH-2457-007 - ทดสอบแนบเอกสารใน OPD Note แล้วไฟล์ยังอยู่หลัง reload

- Linear: SBH-2826

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-007
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- ชื่อเอกสาร "อื่นๆ" · รายละเอียด "QA-SBH2457 attachment" · ไฟล์ PDF

Test Steps
1. ที่ section "เอกสารแนบ" กด "+ เพิ่มรายการ"
2. เลือกชื่อเอกสาร กรอกรายละเอียด แล้วกด "อัปโหลด" เลือกไฟล์
3. กด "สร้าง"
4. reload หน้า แล้วเปิด "OPD Note" เดิม

Expected Result
- แถวเอกสารแนบแสดงชื่อไฟล์หลังอัปโหลด
- หลัง reload แถวเอกสารแนบยังอยู่ พร้อมชื่อเอกสาร รายละเอียด และไฟล์

Actual Result
- **Failed** — ทดสอบ 20/10 และ 21/10/2569: อัปโหลดได้ (ระบบตั้งชื่อ "other-6-69.pdf") และบันทึกสำเร็จ แต่หลัง reload section เอกสารแนบว่าง (2 รอบ) · วันถัดมาแถวกลับมาแบบชื่อเอกสารว่างและบล็อกการบันทึกทั้งฟอร์ม · ไฟล์ PNG อัปโหลดไม่ได้ (422)
- Bug: SBH-2812
- หลักฐาน: 20g-sbh-opd-attachment.png · 21f-sbh-opd-after-reload-attachment-dx.png · 26e-opd-attachment-row-back-name-empty.png · 26i-opd-attachment-after-reload.png · วิดีโอ 06-sbh-opd-note.webm, 09-sbh-cc-pi-prefill-nosync.webm

หมายเหตุ
- AC 7 · รอบสำรวจใช้ PDF ขนาดเล็กที่ QA สร้างเอง ควรลองซ้ำด้วยไฟล์จริงตอน retest
```

#### [Required] TC-SBH-2457-008 - ทดสอบบันทึก Onset date ใน Diagnosis ของ OPD Note แล้ววันที่ยังอยู่หลัง reload

- Linear: SBH-2827

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-008
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"

Test Data
- Diagnosis: "M545 - Low back pain" (ค้นด้วย "M54.5")
- Onset date: วันก่อนวันเปิด visit

Test Steps
1. ที่ section Diagnosis ค้นหาและเลือก Diagnosis ตาม Test Data
2. กรอก Onset date
3. กด "สร้าง"
4. reload หน้า แล้วเปิด "OPD Note" เดิม

Expected Result
- แถว Diagnosis มีช่อง Onset date
- หลัง reload Diagnosis และ Onset date ยังเป็นค่าที่บันทึกไว้

Actual Result
- **Failed** — ทดสอบ 20/10/2569: แถว Diagnosis ไม่มีช่อง Onset date · ช่องวันเวลาที่มีคือ "อัปเดตล่าสุด" (`last_updated`) เติมเวลาปัจจุบันให้เอง · Diagnosis บันทึกและอยู่หลัง reload ได้ปกติ
- Bug: SBH-2814
- หลักฐาน: 20h-sbh-opd-diagnosis.png · 19g-sbh-opd-diagnosis.png · วิดีโอ 06-sbh-opd-note.webm

หมายเหตุ
- AC 8
```

#### [Required] TC-SBH-2457-009 - ตรวจสอบว่า OPD Note ไม่แสดง section Note to Nurse

- Linear: SBH-2828

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-009
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว

Test Data
- -

Test Steps
1. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note"
2. เลื่อนดูทุก section จนท้ายฟอร์ม (กาง section ที่พับอยู่ทั้งหมด)

Expected Result
- ไม่มี section "Note to Nurse" ในฟอร์ม OPD Note

Actual Result
- **Failed** — ทดสอบ 20/10/2569: ท้ายฟอร์มต่อจาก Diagnosis ยังมี section "Note to Nurse" พร้อมช่อง "Note" · หน้าตั้งค่า SBH GENERAL OPD NOTE ไม่มีแถว Note to Nurse
- Bug: SBH-2815
- หลักฐาน: 19g-sbh-opd-diagnosis.png · 19f-sbh-opd-note-to-nurse.png · วิดีโอ 05-edit-visit-sbh.webm

หมายเหตุ
- AC 9 · Note to nurse ควรอยู่ใน Section Order (แผงคำสั่งการรักษา) เท่านั้น
```

#### [Required] TC-SBH-2457-010 - ทดสอบบันทึก section การมาถึงและความต้องการช่วยเหลือในฟอร์มคัดกรอง แล้วข้อมูลยังอยู่หลัง reload

- Linear: SBH-2829

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-010
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "ฟอร์มคัดกรอง"

Test Data
- การมาถึง: เดินมา · ความต้องการช่วยเหลือ: ไม่ต้องการความช่วยเหลือ · ผู้มาด้วย: มาคนเดียว
- กรอกช่องบังคับอื่นด้วย: Chief Complaint, Present Illness

Test Steps
1. ที่ section "การมาถึงและความต้องการช่วยเหลือ" เลือกค่าตาม Test Data
2. กรอกช่องบังคับที่เหลือ
3. กด "สร้าง"
4. reload หน้า แล้วเปิด "ฟอร์มคัดกรอง" เดิม

Expected Result
- ฟอร์มคัดกรองมี section "การมาถึงและความต้องการช่วยเหลือ" (การมาถึง / ความต้องการช่วยเหลือ / ผู้มาด้วย)
- หลัง reload ค่าที่เลือกยังอยู่ครบ

Actual Result
- **Passed** — ทดสอบ 20/10/2569: มี section และเป็นช่องบังคับ (*) · หลัง reload ค่าทั้ง 3 ช่องยังอยู่
- หลักฐาน: 23a-sbh-scr-arrival-filled.png · 24c-sbh-scr-after-reload-1.png · วิดีโอ 07-sbh-screening.webm

หมายเหตุ
- AC 10 · ฟอร์มคัดกรองบังคับกรอก Chief Complaint + Present Illness ("กรุณากรอกข้อมูล")
```

#### [Required] TC-SBH-2457-011 - ทดสอบบันทึก section การคัดกรองเพศหญิงในฟอร์มคัดกรอง แล้วข้อมูลยังอยู่หลัง reload

- Linear: SBH-2830

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-011
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ของผู้ป่วยหญิง ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "ฟอร์มคัดกรอง"

Test Data
- การตั้งครรภ์: ไม่มี · การให้นมบุตร: ไม่มี · สถานะการมีประจำเดือน: อยู่ในวัยมีประจำเดือน · LMP: 01/10/2026

Test Steps
1. ที่ section "การคัดกรองเพศหญิง" กรอกตาม Test Data
2. กรอกช่องบังคับที่เหลือ แล้วกด "สร้าง"
3. reload หน้า แล้วเปิด "ฟอร์มคัดกรอง" เดิม

Expected Result
- ฟอร์มคัดกรองมี section "การคัดกรองเพศหญิง"
- หลัง reload ค่าที่กรอกยังอยู่ครบ

Actual Result
- **Passed** — ทดสอบ 20/10/2569 (ผู้ป่วยหญิง): มี section · หลัง reload ค่าทั้งหมดยังอยู่ รวม LMP 01/10/2026
- หลักฐาน: 23d-sbh-scr-female.png · 24f-sbh-scr-after-reload-female.png · วิดีโอ 07-sbh-screening.webm

หมายเหตุ
- AC 11 · ยังไม่ได้ทดสอบกับผู้ป่วยชาย (การ์ดไม่ได้ระบุว่าต้องแสดงเฉพาะผู้ป่วยหญิง)
```

#### [Required] TC-SBH-2457-012 - ทดสอบเพิ่มประวัติแพ้ในฟอร์มคัดกรอง แล้วรายการยังอยู่หลัง reload

- Linear: SBH-2831

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-012
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "ฟอร์มคัดกรอง"

Test Data
- ประเภท: แพ้ยา · ชื่อยา/สิ่งที่แพ้: "QA Penicillin" · อาการแพ้: "ผื่นคัน"

Test Steps
1. ที่ section "ประวัติแพ้" กด "+ เพิ่มรายการ" แล้วกรอกตาม Test Data
2. กรอกช่องบังคับที่เหลือ แล้วกด "สร้าง"
3. reload หน้า แล้วเปิด "ฟอร์มคัดกรอง" เดิม

Expected Result
- section ประวัติแพ้ทำงานตามที่ Cortex มีอยู่ (ประเภท / ชื่อยา / อาการ / ผลการประเมิน)
- หลัง reload รายการแพ้ยังอยู่

Actual Result
- **Passed** — ทดสอบ 20/10/2569: เพิ่มรายการได้ (ผลการประเมิน Unverified) · หลัง reload ยังอยู่
- หลักฐาน: 23e-sbh-scr-allergy.png · 24e-sbh-scr-after-reload-allergy-family-history.png · วิดีโอ 07-sbh-screening.webm

หมายเหตุ
- AC 12
```

#### [Required] TC-SBH-2457-013 - ทดสอบบันทึกประวัติการผ่าตัด สุรา และบุหรี่ในฟอร์มคัดกรอง แล้วข้อมูลยังอยู่หลัง reload

- Linear: SBH-2832

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-013
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "ฟอร์มคัดกรอง"

Test Data
- ประวัติการเจ็บป่วยในอดีต: ไม่มี · ประวัติการผ่าตัดในอดีต: มี + "QA appendectomy 2015"
- ประวัติการดื่มสุรา: ไม่เคยดื่ม · ประวัติการสูบบุหรี่: ไม่เคยสูบ

Test Steps
1. ที่ section "ประวัติการเจ็บป่วย/ผ่าตัดในอดีต" กรอกตาม Test Data
2. ที่ section "ประวัติการดื่มสุราและการสูบบุหรี่" เลือกตาม Test Data
3. กรอกช่องบังคับที่เหลือ แล้วกด "สร้าง"
4. reload หน้า แล้วเปิด "ฟอร์มคัดกรอง" เดิม

Expected Result
- หลัง reload ประวัติการเจ็บป่วย / การผ่าตัดยังเป็นค่าที่บันทึก
- หลัง reload ประวัติการดื่มสุรายังเป็น "ไม่เคยดื่ม"
- หลัง reload ประวัติการสูบบุหรี่ยังเป็น "ไม่เคยสูบ"

Actual Result
- **Passed** — ทดสอบ 20/10/2569: หลัง reload ค่าทั้งหมดยังอยู่
- หลักฐาน: 23f-sbh-scr-family-surgery.png · 23g-sbh-scr-alcohol-smoke-fall.png · 24d-sbh-scr-after-reload-2.png · วิดีโอ 07-sbh-screening.webm

หมายเหตุ
- AC 13 · สุรา / บุหรี่ มีแผนปรับใหม่ก่อน go-live (SBH-2419) — ถ้าเปลี่ยนต้องปรับ TC นี้และเทสซ้ำ
```

#### [Required] TC-SBH-2457-014 - ทดสอบเลือกความเสี่ยงพลัดตกหกล้มในฟอร์มคัดกรอง แล้วค่ายังอยู่หลัง reload

- Linear: SBH-2833

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-014
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "ฟอร์มคัดกรอง"

Test Data
- ความเสี่ยงพลัดตกหกล้ม: "สูง"

Test Steps
1. ที่ section "ความเสี่ยงพลัดตกหกล้ม" กดตัวเลือกตาม Test Data
2. กรอกช่องบังคับที่เหลือ แล้วกด "สร้าง"
3. reload หน้า แล้วเปิด "ฟอร์มคัดกรอง" เดิม

Expected Result
- section "ความเสี่ยงพลัดตกหกล้ม" มีตัวเลือก ไม่มี / ต่ำ / สูง
- หลัง reload ตัวเลือก "สูง" ยังถูกเลือกอยู่

Actual Result
- **Passed** — ทดสอบ 20/10/2569: เลือก "สูง" ได้ · หลัง reload ยังถูกเลือก
- หลักฐาน: 23g-sbh-scr-alcohol-smoke-fall.png · 24d-sbh-scr-after-reload-2.png · วิดีโอ 07-sbh-screening.webm

หมายเหตุ
- AC 14 · การ์ดเขียนว่าต้องไม่มี Fall risk แต่ฟอร์ม SBH ยังมี — QA สั่ง (20 ต.ค. 2569) "ถ้ามีก็เช็คไปเลย"
```

#### [Required] TC-SBH-2457-015 - ทดสอบแนบเอกสารในฟอร์มคัดกรอง แล้วไฟล์ยังอยู่หลัง reload

- Linear: SBH-2834

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-015
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "ฟอร์มคัดกรอง"

Test Data
- ชื่อเอกสาร "อื่นๆ" · รายละเอียด "QA-SBH2457 screening attachment" · ไฟล์ PDF

Test Steps
1. ที่ section "เอกสารแนบ" กด "+ เพิ่มรายการ"
2. เลือกชื่อเอกสาร กรอกรายละเอียด แล้วกด "อัปโหลด" เลือกไฟล์
3. กรอกช่องบังคับที่เหลือ แล้วกด "สร้าง"
4. reload หน้า แล้วเปิด "ฟอร์มคัดกรอง" เดิม

Expected Result
- แถวเอกสารแนบแสดงชื่อไฟล์หลังอัปโหลด
- หลัง reload แถวเอกสารแนบยังอยู่ พร้อมชื่อเอกสาร รายละเอียด และไฟล์

Actual Result
- **Failed** — ทดสอบ 20/10/2569: อัปโหลดได้ ("other-7-69.pdf") และบันทึกสำเร็จ แต่หลัง reload section เอกสารแนบว่าง
- Bug: SBH-2813
- หลักฐาน: 24a-sbh-scr-create-before.png · 24d-sbh-scr-after-reload-2.png · วิดีโอ 07-sbh-screening.webm

หมายเหตุ
- AC 15 · รอบสำรวจใช้ PDF ขนาดเล็กที่ QA สร้างเอง ควรลองซ้ำด้วยไฟล์จริงตอน retest
```

#### [Optional] TC-SBH-2457-016 - ทดสอบเพิ่มประวัติครอบครัวในฟอร์มคัดกรอง แล้วข้อมูลยังอยู่หลัง reload

- Linear: SBH-2835

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-016
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "ฟอร์มคัดกรอง"

Test Data
- ประวัติโรคในครอบครัว: "QA Hypertension" · บุคคลในครอบครัว: "บิดา"

Test Steps
1. ที่ section "ประวัติครอบครัว" กด "+ เพิ่มรายการ" แล้วกรอกตาม Test Data
2. กรอกช่องบังคับที่เหลือ แล้วกด "สร้าง"
3. reload หน้า แล้วเปิด "ฟอร์มคัดกรอง" เดิม

Expected Result
- section ประวัติครอบครัวมีตัวเลือก ไม่มีประวัติโรคในครอบครัว / ไม่ทราบ และเพิ่มรายการได้
- หลัง reload รายการยังอยู่

Actual Result
- **Passed** — ทดสอบ 20/10/2569: เพิ่มรายการได้ · หลัง reload ยังอยู่
- หลักฐาน: 23f-sbh-scr-family-surgery.png · 24e-sbh-scr-after-reload-allergy-family-history.png · วิดีโอ 07-sbh-screening.webm

หมายเหตุ
- ไม่มี AC รองรับ (อยู่ในตาราง Requirement เท่านั้น) — QA ยืนยันให้เป็น Optional
```

#### [Required] TC-SBH-2457-017 - ตรวจสอบว่า section ที่ตั้ง "ซ่อน" ใน Setting form แสดงแบบพับเมื่อเปิด OPD Note

- Linear: SBH-2836

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-017
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. จดค่า "จำเป็น" / "ซ่อน" เดิมของทุกแถวในชุดแบบฟอร์ม "SBH GENERAL OPD NOTE" ไว้ก่อน

Test Data
- section: "5. Physical examination general" (ค่าเดิม = ไม่ติ๊ก "ซ่อน") → ติ๊ก "ซ่อน"

Test Steps
1. ผู้ดูแลระบบ > แบบฟอร์ม > แบบฟอร์ม → แท็บ "แบบฟอร์ม EMR" → แถว "SBH GENERAL OPD NOTE" กด "เปิด"
2. ติ๊ก "ซ่อน" ที่ section ตาม Test Data แล้วกด "บันทึก"
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note" ใหม่
4. ดูสถานะของ Physical Examination
5. กลับไปเอาติ๊ก "ซ่อน" ออก กด "บันทึก" แล้ว reload หน้าตั้งค่าเทียบกับค่าเดิม

Expected Result
- บันทึกการตั้งค่าสำเร็จ
- เปิด OPD Note แล้ว Physical Examination แสดงแบบพับ (Collapse)
- คืนค่าแล้วหน้าตั้งค่าตรงกับค่าเดิมครบทุกแถว

Actual Result
- **Failed** — ทดสอบ 20/10/2569: บันทึกการตั้งค่าได้ (`PUT /cortex-api/clinical-form-presets/11` 200) แต่เปิด OPD Note แล้ว Physical Examination ยังกางอยู่ · คืนค่าแล้วตรงค่าเดิมครบ 9 แถว
- Bug: SBH-2817
- หลักฐาน: 25b-setting-pe-hide-before-save.png · 25c-setting-pe-hide-after-save.png · 25d-opd-pe-collapsed-after-setting.png · 25f-setting-reverted.png · วิดีโอ 08-sbh-setting-expand-collapse.webm

หมายเหตุ
- AC 16 · "ซ่อน" = Collapse (QA ยืนยัน) · section ที่ติ๊ก "ซ่อน" อยู่เดิม (Vital signs, Body metric, Body chart v2) พับอยู่จริง · OPD Note ที่ใช้ทดสอบเคยบันทึกแล้ว ควร retest กับฟอร์มที่ยังไม่เคยบันทึกด้วย · หน้าตั้งค่าเป็นค่ากลาง ต้องคืนค่าเดิมทุกครั้ง
```

#### [Required] TC-SBH-2457-018 - ตรวจสอบว่า section ที่เอาติ๊ก "ซ่อน" ออกใน Setting form แสดงแบบกางเมื่อเปิด OPD Note

- Linear: SBH-2837

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-018
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. จดค่า "จำเป็น" / "ซ่อน" เดิมของทุกแถวในชุดแบบฟอร์ม "SBH GENERAL OPD NOTE" ไว้ก่อน

Test Data
- section: "3. Vital signs general" (ค่าเดิม = ติ๊ก "ซ่อน") → เอาติ๊กออก

Test Steps
1. ผู้ดูแลระบบ > แบบฟอร์ม > แบบฟอร์ม → แท็บ "แบบฟอร์ม EMR" → แถว "SBH GENERAL OPD NOTE" กด "เปิด"
2. เอาติ๊ก "ซ่อน" ออกที่ section ตาม Test Data แล้วกด "บันทึก"
3. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note" ใหม่
4. ดูสถานะของ Vital Signs
5. กลับไปติ๊ก "ซ่อน" คืน กด "บันทึก" แล้ว reload หน้าตั้งค่าเทียบกับค่าเดิม

Expected Result
- บันทึกการตั้งค่าสำเร็จ
- เปิด OPD Note แล้ว Vital Signs แสดงแบบกาง (Expand)
- คืนค่าแล้วหน้าตั้งค่าตรงกับค่าเดิมครบทุกแถว

Actual Result
- ยังไม่ทดสอบ (Not Run)

หมายเหตุ
- AC 16 (กรณีกลับกัน) · หน้าตั้งค่าเป็นค่ากลาง ต้องคืนค่าเดิมทุกครั้ง
```

#### [Required] TC-SBH-2457-019 - คำนวณ BMI และ BSA จากน้ำหนักและส่วนสูงใน Body metric ของฟอร์มคัดกรองถูกต้อง

- Linear: SBH-2838

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-019
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "ฟอร์มคัดกรอง"

Test Data
- Weight 60 kg / Height 165 cm → BMI 22.04 / BSA 1.66
- สูตร: BMI = W ÷ (H/100)² · BSA = Mosteller √(H × W ÷ 3600) · ปัด 2 ตำแหน่ง

Test Steps
1. ที่ section Body metric กรอก Weight แล้วกด Tab
2. กรอก Height แล้วกด Tab
3. ดูค่า BMI และ BSA
4. กรอกช่องบังคับที่เหลือ แล้วกด "สร้าง"
5. reload หน้า แล้วเปิด "ฟอร์มคัดกรอง" เดิม

Expected Result
- BMI = 22.04
- BSA = 1.66
- หลัง reload Weight, Height, BMI และ BSA ยังเป็นค่าเดิม

Actual Result
- **Passed** — ทดสอบ 20/10/2569: BMI 22.04 / BSA 1.66 · หลัง reload ค่ายังอยู่และหัวจอผู้ป่วยแสดงค่าล่าสุดนี้
- หลักฐาน: 23b-sbh-scr-bmi.png · 24c-sbh-scr-after-reload-1.png · วิดีโอ 07-sbh-screening.webm

หมายเหตุ
- AC 3 (เทสซ้ำในฟอร์มคัดกรองตามที่ QA สั่ง) · Body metric ในฟอร์มคัดกรองกับ OPD Note เป็นคนละชุดค่ากัน ไม่ดึงกันเอง
```

#### [Required] TC-SBH-2457-020 - ทดสอบบันทึก Pain score ใน Vital Signs ของฟอร์มคัดกรอง แล้วค่ายังอยู่หลัง reload

- Linear: SBH-2839

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-020
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว
3. เปิดหน้าผู้ป่วย > tab "OPD" > "ฟอร์มคัดกรอง"

Test Data
- Pain score (0-10): 3

Test Steps
1. ที่ Vital Signs เลือก Pain score ตาม Test Data
2. กรอกช่องบังคับที่เหลือ แล้วกด "สร้าง"
3. reload หน้า แล้วเปิด "ฟอร์มคัดกรอง" เดิม

Expected Result
- Vital Signs มีช่อง Pain score (0-10)
- หลัง reload Pain score ยังเป็น 3

Actual Result
- **Passed** — ทดสอบ 20/10/2569: เลือก 3 ได้ · หลัง reload ยังเป็น 3
- หลักฐาน: 23a-sbh-scr-arrival-filled.png · 24c-sbh-scr-after-reload-1.png · วิดีโอ 07-sbh-screening.webm

หมายเหตุ
- AC 4 (เทสซ้ำในฟอร์มคัดกรองตามที่ QA สั่ง)
```

#### [Required] TC-SBH-2457-021 - ตรวจสอบว่า CC และ PI จากฟอร์มคัดกรอง prefill ไป OPD Note แก้ได้ และไม่ sync กลับไปฟอร์มคัดกรอง

- Linear: SBH-2840

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2457-021
- Scenario ID: TS-SBH-2457-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2457 - [EMR] [Form] ประกอบและปรับแต่ง Form OPD note/Pre-assessment จากการ Restructure EHR base

Preconditions
1. ล็อกอิน DEV-X ด้วย user1 (`CORTEX_USERNAME_Super_User`)
2. มี encounter คลินิก "SBH - ห้องตรวจสระบุรี" ที่เช็คอินแล้ว และ**บันทึกฟอร์มคัดกรองแล้ว** โดย CC = "ปวดเข่า" · PI = "QA-SBH2457 SBH screening PI"

Test Data
- แก้ใน OPD Note: CC = "ปวดหลัง (แก้จาก OPD Note)" · PI = "QA-SBH2457 OPD edited PI"

Test Steps
1. เปิดหน้าผู้ป่วย > tab "OPD" > "OPD Note" แล้วดูช่อง Chief Complaint และ Present Illness
2. แก้ CC / PI ตาม Test Data
3. กด "สร้าง" (หรือ "บันทึก")
4. reload หน้า แล้วเปิด "OPD Note" เดิม
5. เปิด "ฟอร์มคัดกรอง" แล้วดูช่อง Chief Complaint และ Present Illness

Expected Result
- เปิด OPD Note ครั้งแรก CC / PI แสดงค่าจากฟอร์มคัดกรอง ("ปวดเข่า" / PI ของฟอร์มคัดกรอง)
- หลัง reload OPD Note ยังเป็นค่าที่แก้
- ฟอร์มคัดกรองยังเป็นค่าเดิม (ไม่ sync กลับ)

Actual Result
- **Passed** — ทดสอบ 21/10/2569: prefill ถูกต้อง · แก้แล้วบันทึก (201) · หลัง reload OPD Note ยังเป็นค่าที่แก้ · ฟอร์มคัดกรองยังเป็น "ปวดเข่า" / PI เดิม
- ข้อสังเกต: กด "สร้าง" ครั้งแรกไม่บันทึก เพราะแถวไฟล์แนบเดิมกลับมาแบบชื่อเอกสารว่างและขึ้น "กรุณาเลือกชื่อเอกสาร" (SBH-2812) ต้องเลือกชื่อเอกสารก่อนจึงบันทึกได้
- หลักฐาน: 26a-scr-cc-pi-baseline.png · 26b-opd-cc-pi-prefilled.png · 26c-opd-cc-pi-edited-before-save.png · 26h-opd-cc-pi-after-reload.png · 26j-scr-cc-pi-after-opd-edit.png · วิดีโอ 09-sbh-cc-pi-prefill-nosync.webm

หมายเหตุ
- Business rule จาก QA (21 ต.ค. 2569) ไม่มีใน AC ของการ์ด · เกี่ยวกับ AC 1–2
```

---

## บันทึกการสำรวจแอปจริง (ประวัติ 20–21 ต.ค. 2569)

> รอบ 1 เป็นฟอร์มคลินิก MED (template tmh/nuh) ซึ่งไม่ใช่ฟอร์มที่ใช้เทส — เก็บไว้เป็นประวัติ · TC ด้านบนอิงรอบ 2–3 และรอบ CC/PI (ฟอร์ม SBH)

### รอบ 1 — คลินิก MED

- ข้อมูลทดสอบ: ผู้ป่วย AUTO หญิง HN 6931979 (น.ส. AUTO SBH2457X10202640) · VN V69102027456 / EN E69102032174 · Walk-in ห้องตรวจโรคอายุรกรรมทั่วไป · user1 · DEV-X
- หลักฐาน (ภาพวงแดง + วิดีโอ): `.playwright-mcp/SBH-2457/explore/` — คลิป `01-setup-visit` · `02-opd-note` · `03-screening-form` · `04-setting-form`
- วิธีเตรียม visit OPD: ลงทะเบียนผู้ป่วยที่ ER แล้วกด "ยกเลิก" ที่ modal เปิด Visit ER (R24) → เวชระเบียน ค้น HN → หน้าผู้ป่วย "Visit ใหม่" → Walk-in ไปคลินิก "MED - ห้องตรวจโรคอายุรกรรมทั่วไป" (สิทธิ H01 เติมให้เอง) → "สร้าง" → แอปผู้ป่วยนอก (แผนกอายุรกรรม / สถานที่ "ก่อนตรวจ") → กด "ล้าง" ตัวกรอง (ตัวกรองแพทย์ถูกเติมไว้) → ค้น HN → "เช็คอิน" → คลิกชื่อผู้ป่วย
- Template ที่ระบบใช้จริง: OPD Note = `tmh_general_opd_note_v1` · ฟอร์มคัดกรอง = `nuh_general_opd_pre_assessment_v2` (ไม่ใช่ชื่อ SBH — ต้องถามว่าเป็น preset ที่ถูกต้องของ SBH หรือไม่)

| AC | สิ่งที่เห็นบนหน้าจอจริง | ภาพ |
| -- | -- | -- |
| 1 | CC มีปุ่ม suggestion 9 ปุ่ม (ปวดหัว, ปวดท้อง, …) กดแล้วข้อความเข้าช่อง · บันทึก + reload แล้วยังอยู่ | 01a, 01b, 07c |
| 2 | Present Illness บันทึก + reload แล้วยังอยู่ | 02a, 07c |
| 3 | **OPD Note ไม่มี Body metrics** · ฟอร์มคัดกรองมี Body Metric: BSA = สูตร Mosteller ปัด 2 ตำแหน่ง, BMI = kg/m² ปัด 2 ตำแหน่ง (ถูกทุกชุดเมื่อออกจากช่องด้วยการคลิก) · **ออกจากช่องด้วย Tab แล้ว BMI/BSA ไม่คำนวณใหม่ ค่าค้างตามค่าก่อนหน้า** (เช่น W45/H150 ได้ BMI 13.89 แทน 20.00) — ต้องให้ dev ยืนยัน · บันทึก + reload แล้วค่ายังอยู่ และขึ้นที่หัวจอผู้ป่วย | 09a, 09b, 14a |
| 4 | **OPD Note ไม่มี Vital sign / Pain score** · ฟอร์มคัดกรองมี Pain Score เป็น section แยก (ปุ่ม 0–10) ไม่ได้อยู่ใน Vital Signs · บันทึก + reload แล้วยังอยู่ | 10a, 14a |
| 5 | **Physical Examination เป็นตาราง System / Clinical Interpretation (GA, HEENT, …) ไม่พบช่อง Free text + Rich text tools** · section ถูกพับไว้ตอนเปิดฟอร์ม · ค่าที่กรอกบันทึกได้ | 03a, 03b, 07c |
| 6 | วาดบน Body Chart ได้ · หลังบันทึก โหมดดูแสดง "-" แต่กด "แก้ไข" แล้วเห็นภาพที่วาด · Body Chart กางไว้ตอนเปิดฟอร์ม · template ตั้งต้น "Adult Male" ทั้งที่ผู้ป่วยเป็นหญิง | 04a, 07d, 07f |
| 7 | อัปโหลดไฟล์ได้ (มีชื่อไฟล์ขึ้น) แต่**หลังบันทึก + reload ไฟล์หายทั้ง 2 รอบ** (ทดสอบด้วยไฟล์ PDF เล็กที่สร้างเอง — ควรลองไฟล์จริงซ้ำตอนรัน) | 05a, 07g, 07j |
| 8 | **Diagnosis ไม่มีช่อง Onset date** — ช่องวันที่ในแถวคือ "อัปเดตล่าสุด" (`last_updated`) | 06a, 07d |
| 9 | **OPD Note ยังมี section "Note to Nurse"** (และมี Note to nurse ที่แผงคำสั่งการรักษาด้วย) | 07c, 07d |
| 10 | ฟอร์มคัดกรองมี "การมาโรงพยาบาล" (dropdown: เดิน / รถนั่ง / เปลนอน / ผู้ปกครองอุ้มมา / ญาติติดต่อแทน) ไม่มีส่วน "ความช่วยเหลือ" · บันทึก + reload แล้วยังอยู่ | 11a, 14a |
| 11 | **ไม่พบ section การคัดกรองเพศหญิง** — มีแค่ช่อง LMP / Comment ใต้ Present Illness (ผู้ป่วยเป็นหญิง) | 12a |
| 12 | **ไม่พบ section ประวัติแพ้ในฟอร์มคัดกรอง** | 12a |
| 13 | มีประวัติการผ่าตัด (dropdown + รายละเอียด), ประวัติการสูบบุหรี่, ประวัติการดื่มสุรา (+ สารเสพติด) · บันทึก + reload แล้วยังอยู่ | 12b, 12c, 14b |
| 14 | ไม่พบ Fall risk ในฟอร์มคัดกรอง | 12a |
| 15 | **ไม่พบเอกสารแนบในฟอร์มคัดกรอง** | 12a |
| 16 | หน้า preset ในการ์ด (`/setting/admin/forms/presets/2`) เป็นค่ากลาง "General OPD pre-assessment" — แต่ละส่วนมีแค่ "จำเป็น" / "ซ่อน" **ไม่พบตัวเลือก Expand/Collapse** · "เพิ่มฟอร์ม" ใน visit ก็ไม่มี · ไม่ได้แก้ค่าใด ๆ | 15a, 15b |
| optional | ประวัติครอบครัวเป็นช่องข้อความ "ประวัติการเจ็บป่วยในครอบครัวที่เกี่ยวข้อง…" · บันทึก + reload แล้วยังอยู่ | 12c, 14b |

### รอบ 2 — ย้ายไปคลินิก SBH (20 ต.ค. 2569 ~15:25, ดูอย่างเดียว ยังไม่กรอก/บันทึก)

- วิธี (user เลือก "แก้ visit เดิม"): แถว encounter เดิมเปลี่ยนคลินิกไม่ได้ → ที่หน้า "แก้ไข Visit" ใช้ "Walk-in ไป คลินิก" = "SBH - ห้องตรวจสระบุรี" (Location ตั้งให้เป็น "แผนกอายุรกรรม" อัตโนมัติ) → บันทึก (ขึ้นทั้ง "Visit saved successfully" และ "Error saving visit เกิดข้อผิดพลาดในระบบ" แต่ reload แล้วมี encounter ใหม่จริง) → แอปผู้ป่วยนอก แท็บ "คำขอ Walk-in" → "ลงตาราง" แพทย์ "นาย ทดสอบ มานะ" ช่วง 15:00–16:00 (แพทย์อื่นไม่มีตารางที่คลินิกนี้) → "เช็คอิน" → EN **E69102032186** · คิว SBHA93 · VN เดิม V69102027456
- Template: OPD Note = **`sbh_general_opd_note_v2`** · ฟอร์มคัดกรอง = **`sbh_general_opd_pre_assessment_v2`** → **ใช้รอบนี้เป็นฐานของ TC แทนรอบ MED ด้านบน**
- หลักฐาน: คลิป `05-edit-visit-sbh.webm` · ภาพ 16a–16d, 17a–17d, 18a–18b, 19a–19g

| AC | สิ่งที่เห็น (SBH) | ภาพ |
| -- | -- | -- |
| 1 | CC มีปุ่ม suggestion ชุดใหม่ (ปวดไหล่ คอ, ปวดแขน, ปวดหลัง, … นวดเพื่อสุขภาพ) | — |
| 3, 4 | OPD Note มี Vital Signs (มี Pain score 0–10 ในนั้น) + Body metric (Weight/Height/BMI/BSA) · ฟอร์มคัดกรองก็มีทั้งคู่ | — |
| 5 | Physical Examination มีช่อง Free text + แถบ Rich text (B, I, U, S, </>, สี, H1–H3, list ฯลฯ) อยู่เหนือตาราง System | 19e |
| 6 | Body Chart **พับไว้**ตอนเปิดฟอร์ม | 19e, 19g |
| 7, 15 | มี section "เอกสารแนบ" (ชื่อเอกสาร / รายละเอียด / เอกสารแนบ / Action) ทั้ง OPD Note และฟอร์มคัดกรอง | 19d, 19e |
| 8 | Diagnosis ยัง**ไม่มีช่อง Onset date** — ช่องวันที่ยังเป็น `last_updated` | 19g |
| 9 | OPD Note **ยังมี Note to Nurse** | 19g |
| 10 | มี "การมาถึงและความต้องการช่วยเหลือ" (บังคับ) — การมาถึง / ความต้องการช่วยเหลือ / ผู้มาด้วย | 19a |
| 11 | มี "การคัดกรองเพศหญิง" — การตั้งครรภ์, การให้นมบุตร, สถานะการมีประจำเดือน, LMP | 19b |
| 12 | มี "ประวัติแพ้" (ประเภท / ชื่อยา / อาการ / ผลการประเมิน) | 19c |
| 13 | มี "ประวัติการเจ็บป่วย/ผ่าตัดในอดีต" (มี/ไม่มี) + "ประวัติการดื่มสุราและการสูบบุหรี่" | 19d |
| 14 | **ยังมี "ความเสี่ยงพลัดตกหกล้ม"** (ไม่มี / ต่ำ / สูง) | 19d |
| optional | มี "ประวัติครอบครัว" (ไม่มีประวัติ / ไม่ทราบ / + เพิ่มรายการ) | — |
| 16 | ยังไม่ได้ดู Setting form ของ preset SBH | — |

### รอบ 3 — กรอก + บันทึก + reload บนฟอร์ม SBH (20 ต.ค. 2569 ~15:39–15:50)

- QA ยืนยัน: **site SBH ให้เลือกคลินิก "ห้องตรวจสระบุรี"** · encounter E69102032186 · คลิป `06-sbh-opd-note.webm`, `07-sbh-screening.webm` · ภาพ 20a–24g

**OPD Note (`sbh_general_opd_note_v2`)** — กด "สร้าง" → contribution 201

| AC | กรอก | หลัง reload | ภาพ |
| -- | -- | -- | -- |
| 1, 2 | CC กดปุ่ม "ปวดหลัง" (เข้าช่องได้) · PI "QA-SBH2457 SBH present illness" | **ช่อง CC / PI ว่าง** · หลังบันทึกฟอร์มคัดกรอง ช่อง CC / PI ของ OPD Note แสดงค่าของฟอร์มคัดกรองแทน ("ปวดเข่า" + PI ของฟอร์มคัดกรอง) — ต้องให้ dev/BA ยืนยันว่าตั้งใจให้ OPD Note ดึง CC/PI จากฟอร์มคัดกรองหรือไม่ | 20a, 21c, 24g |
| 3 | W 72.5 / H 158.4 → BMI 28.9 (= 28.90) / BSA 1.79 · ชุดอื่น: 60/165 → 22.04/1.66 · 95/180 → 29.32/2.18 · 95/150 → 42.22/1.99 · 45/150 → 20/1.37 · **BSA = Mosteller** · **ออกจากช่องด้วย Tab ก็คำนวณใหม่ทันที** (ต่างจากฟอร์ม MED) · BMI ตัดเลข 0 ท้าย (28.9, 20) | ค่ายังอยู่ + ขึ้นที่หัวจอผู้ป่วย | 20c, 21d |
| 4 | Pain score (dropdown 0–10 ใน Vital Signs) = 4 | ยังเป็น 4 | 20b, 21d |
| 5 | พิมพ์ Free text + **ตัวหนา / ตัวเอียง (คีย์ลัด) / ขีดเส้นใต้ (ปุ่ม U บนแถบเครื่องมือ)** | รูปแบบยังอยู่ครบ (`<strong>`, `<em>`, `<u>`) | 20d, 21c |
| 6 | Body Chart พับไว้ตอนเปิด → กางแล้ววาดเส้น (template "Adult Male" ทั้งที่ผู้ป่วยหญิง) | เส้นที่วาดยังอยู่ | 20e, 20f, 21e |
| 7 | + เพิ่มรายการ → "อื่นๆ" + รายละเอียด + อัปโหลด PDF (ระบบตั้งชื่อ other-6-69.pdf, upload 201) | **ไฟล์แนบหาย** · ลองอีกรอบด้วยไฟล์ PNG จริง → upload-by-hn ตอบ **422** และกด "สร้าง" แล้วไม่มีการบันทึก | 20g, 21f, 22a, 22b |
| 8 | Diagnosis M545 Low back pain | ยังอยู่ · **ไม่มีช่อง Onset date** (ช่องวันที่ = `last_updated`) | 20h, 21f |
| 9 | — | OPD Note ยังมี Note to Nurse | 19g |

**ฟอร์มคัดกรอง (`sbh_general_opd_pre_assessment_v2`)** — กด "สร้าง" → contribution 201

| AC | กรอก | หลัง reload | ภาพ |
| -- | -- | -- | -- |
| 10 | การมาถึง = เดินมา · ความต้องการช่วยเหลือ = ไม่ต้องการความช่วยเหลือ · ผู้มาด้วย = มาคนเดียว (บังคับ *) | ยังอยู่ครบ | 23a, 24c |
| 3, 4 | W 60 / H 165 (Tab) → 22.04 / 1.66 · Pain 3 | ยังอยู่ · หัวจอผู้ป่วยเปลี่ยนเป็นค่าล่าสุดนี้ | 23b, 24c |
| 1, 2 | CC "ปวดเข่า" · PI (บังคับ *) | ยังอยู่ | 23c, 24c |
| 11 | การตั้งครรภ์ = ไม่มี · การให้นมบุตร = ไม่มี · สถานะประจำเดือน = อยู่ในวัยมีประจำเดือน · LMP 01/10/2026 | ยังอยู่ | 23d, 24f |
| 12 | แพ้ยา / QA Penicillin / ผื่นคัน (ผลประเมิน Unverified) | ยังอยู่ | 23e, 24e |
| optional | ประวัติครอบครัว: QA Hypertension / บิดา | ยังอยู่ | 23f, 24e |
| 13 | เจ็บป่วยในอดีต = ไม่มี · ผ่าตัด = มี + "QA appendectomy 2015" · สุรา = ไม่เคยดื่ม · บุหรี่ = ไม่เคยสูบ | ยังอยู่ | 23f, 23g, 24d |
| 14 | ความเสี่ยงพลัดตกหกล้ม = สูง | ยังเลือก "สูง" | 23g, 24d |
| 15 | เอกสารแนบ "อื่นๆ" + อัปโหลด PDF (upload 201, other-7-69.pdf) | **ไฟล์แนบหาย** | 24a, 24d |
| 16 | หน้า Setting form ของ SBH — ยังหาไม่เจอ (`/setting/admin/forms/presets` = "ไม่พบหน้าที่ต้องการ") | — | — |

**CC / PI ตาม flow ที่ QA อธิบาย (21 ต.ค. 2569 ~09:54)** — คลิป `09-sbh-cc-pi-prefill-nosync.webm` · ภาพ 26a–26j

1. ฟอร์มคัดกรองบันทึกไว้แล้ว: CC "ปวดเข่า" · PI "QA-SBH2457 SBH screening PI" (26a)
2. เปิด OPD Note → CC / PI **prefill จากฟอร์มคัดกรอง** (26b)
3. แก้ใน OPD Note เป็น CC "ปวดหลัง (แก้จาก OPD Note)" · PI "QA-SBH2457 OPD edited PI" → กด "สร้าง" (26c)
4. กดครั้งแรก**ไม่บันทึก** — section เอกสารแนบมีแถว "other-6-69.pdf" ของเมื่อวานกลับมา แต่ช่องชื่อเอกสารว่าง ขึ้น "กรุณาเลือกชื่อเอกสาร" และบล็อกการบันทึกทั้งฟอร์ม (26d, 26e) — เมื่อวานหลัง reload แถวนี้ไม่มี
5. เลือกชื่อเอกสาร "อื่นๆ" → กด "สร้าง" → contribution 201 (26f, 26g)
6. Reload → OPD Note CC / PI **ยังเป็นค่าที่แก้** (26h) · ฟอร์มคัดกรองยังเป็น "ปวดเข่า" / PI เดิม = **ไม่ sync กลับ** (26j) → **ตรงตาม rule** · แถวไฟล์แนบหายอีกครั้ง (26i)

- ข้อสังเกต: รอบ 20 ต.ค. กรอก CC/PI ใน OPD Note **ก่อน**มีฟอร์มคัดกรอง แล้วหลัง reload ช่องว่าง — flow นี้ (ไม่มีฟอร์มคัดกรองก่อน) ยังไม่มี rule ว่าควรเป็นอย่างไร ต้องถาม QA/BA

**Setting form (AC 16)** — QA ชี้ทาง: ผู้ดูแลระบบ > แบบฟอร์ม > แบบฟอร์ม → แท็บ "แบบฟอร์ม EMR" → "SBH GENERAL OPD NOTE" (`sbh-general-opd-note`) "เปิด" → `/cortex/setting/admin/forms/presets/11/edit?tab=emr` · คลิป `08-sbh-setting-expand-collapse.webm` · ภาพ 25a–25f

- แต่ละส่วนมี checkbox "จำเป็น" / "ซ่อน" · ค่าเดิม: ติ๊ก "ซ่อน" ที่ Vital signs general, Body metric general, Body chart v2 (ตรงกับ 3 ส่วนที่พับอยู่ตอนเปิด OPD Note SBH) · ไม่มีแถว Note to Nurse ใน preset (แต่ฟอร์มจริงแสดง)
- เป็น**ค่ากลางของฟอร์ม SBH ทั้งระบบ** ไม่ใช่ต่อ visit — QA อนุญาตให้ "สลับ 1 ส่วนแล้วคืนค่าทันที"
- ลองติ๊ก "ซ่อน" ที่ Physical examination general → บันทึก (`PUT /cortex-api/clinical-form-presets/11` 200) → เปิด OPD Note SBH ใหม่ (goto ใหม่) → **Physical Examination ยังกางอยู่** (ทดสอบ 1 รอบ) → คืนค่า (PUT 200) → reload หน้า preset ค่าตรงกับค่าเดิมครบ 9 แถว
- ยังสรุปไม่ได้ว่า "ซ่อน" = Default Collapse (QA ไม่แน่ใจ) — เป็นไปได้ว่าต้องเป็นฟอร์มที่ยังไม่เคยบันทึก หรือมี cache · **ต้องถาม dev/BA ว่า "ซ่อน" หมายถึงอะไร และค่าใหม่มีผลเมื่อไร**

ข้อสังเกตอื่น: ฟอร์มคัดกรองบังคับกรอก Chief Complaint + Present Illness ("กรุณากรอกข้อมูล") (13c) · ระหว่างกรอกหัวฟอร์มขึ้น "อัปเดตไม่ได้" (บันทึก draft) แต่กด "สร้าง" แล้วบันทึกได้ (201) · Underlying Disease ในฟอร์มคัดกรองมี checkbox 3 ช่องที่ไม่มีข้อความกำกับ

## AC → Test Case

| AC | Test Case | ผล |
| -- | -- | -- |
| 1 | TC-001 (+ TC-021) | Failed (SBH-2816) · TC-021 Passed |
| 2 | TC-002 (+ TC-021) | Failed (SBH-2816) · TC-021 Passed |
| 3 | TC-003 (OPD Note), TC-019 (ฟอร์มคัดกรอง) | Passed |
| 4 | TC-004 (OPD Note), TC-020 (ฟอร์มคัดกรอง) | Passed |
| 5 | TC-005 | Passed |
| 6 | TC-006 | Passed |
| 7 | TC-007 | Failed (SBH-2812) |
| 8 | TC-008 | Failed (SBH-2814) |
| 9 | TC-009 | Failed (SBH-2815) |
| 10 | TC-010 | Passed |
| 11 | TC-011 | Passed |
| 12 | TC-012 | Passed |
| 13 | TC-013 | Passed |
| 14 | TC-014 | Passed (ตรวจว่าใช้งานได้ ตามที่ QA สั่ง) |
| 15 | TC-015 | Failed (SBH-2813) |
| 16 | TC-017, TC-018 | Failed (SBH-2817) · Not Run |
| (ไม่มี AC) Family history general | TC-016 [Optional] | Passed |
| (ไม่มี AC) CC / PI prefill + ไม่ sync กลับ | TC-021 | Passed |
| (ไม่มี TC) Underlying disease | อ้างอิง SBH-2413 | — |

## Requirement gap (นอกลำดับชั้น)

**Expected behavior**
- AC 1: ไม่ระบุว่า CC suggestion มาจากไหน — หน้าจอ SBH มีปุ่มชุดคงที่ (ปวดไหล่ คอ … นวดเพื่อสุขภาพ)
- AC 1–2: การ์ดไม่ได้เขียน rule prefill CC / PI จากฟอร์มคัดกรอง — QA ให้ rule เพิ่มแล้ว (prefill + ไม่ sync กลับ / ต้องเก็บค่าเมื่อยังไม่มีฟอร์มคัดกรอง)
- AC 2, 6, 7, 15: "เหมือนเดิม" / "รูปแบบเดิมของ SBH" ไม่ได้ระบุพฤติกรรมเดิม — ใช้ตามที่หน้าจอ SBH มีปัจจุบัน
- AC 3: ไม่มีค่าจากระบบเดิมให้เทียบ — ใช้สูตร Mosteller ที่ย้อนหาจากหน้าจอจริง (QA ตกลง)
- AC 3–4: การ์ดเขียนไว้ใต้ OPD note แต่หน้าจอมีทั้ง 2 ฟอร์ม — เทสทั้งสองที่
- AC 14 ขัดกับหน้าจอ SBH (ยังมี Fall risk) — QA สั่งให้ตรวจว่าใช้งานได้แทน
- AC 16: การ์ดไม่ระบุชื่อตัวเลือก — หน้าตั้งค่าใช้ checkbox "ซ่อน" (QA ยืนยัน = Collapse) และเป็นค่ากลางทั้งระบบ
- ตาราง Requirement ขัดกับ AC เรื่อง Body chart Default collapsed — ยึด AC ตามที่ QA ยืนยัน

**Validation**
- AC 4: ไม่ระบุช่วงค่า Pain score ที่รับได้ (หน้าจอเป็น dropdown 0–10)
- AC 7, 15: ไม่ระบุชนิด/ขนาดไฟล์ที่แนบได้ — PNG ได้ 422 (ดู SBH-2812)
- AC 8: ไม่ระบุว่า Onset date ต้องไม่เกินวันที่ปัจจุบันหรือไม่

**Error handling**
- AC 7, 15: ไม่ระบุว่าแนบไฟล์ไม่สำเร็จต้องแจ้งผู้ใช้อย่างไร

**Permission / role**
- ไม่ระบุ role ที่ใช้เข้าหน้า Setting form และ role ที่ใช้กรอกแต่ละฟอร์ม (รอบนี้ใช้ user1 ทั้งหมด)

**Edge cases**
- AC 11: ไม่ระบุว่า section การคัดกรองเพศหญิงแสดงเฉพาะผู้ป่วยหญิงหรือไม่ (ยังไม่ได้ลองกับผู้ป่วยชาย)
- AC 13: สุรา / บุหรี่ อาจเปลี่ยนก่อน go-live (SBH-2419)
- AC 16: ไม่ระบุว่าค่าที่ตั้งมีผลกับฟอร์มที่เคยบันทึกแล้วหรือไม่
