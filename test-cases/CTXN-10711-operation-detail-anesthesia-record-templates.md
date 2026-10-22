# CTXN-10711 — Template ใน Operation Detail / Anesthesia Record — Test Coverage

- Requirement: https://linear.app/cortexcloud/issue/CTXN-10711/test-result-operation-detail-and-anesthesia-record
- สร้างจาก Scope ของการ์ด (เติม description เข้าไปจากไฟล์ `OR_Template_Test_Cases.md` ที่ทีมเตรียมไว้ รอบสำรวจแอปจริง 14-10-2026) ตาม skill `linear-testcase-writer`
- สถานะไฟล์นี้: **draft เก็บไว้ในโปรเจกต์ก่อน ยังไม่สร้างจริงใน Linear** — รอ **GATE 1 (QA review)** ตาม skill `qa-automate-readiness` ก่อนไปสำรวจแอปจริง
- Workflow: เขียน TC ไว้ที่นี่ → QA review (GATE 1) → ขอยืนยันไปสำรวจแอปจริงเก็บหลักฐานวิดีโอ+ภาพครบทุก TC (GATE 2 ตามมาตรฐาน `agent-app-testing`) → อัปเดต Actual Result ตามผลจริง → ได้รับอนุญาตชัดเจนแล้วค่อยสร้าง EXE/Scenario/Test Case จริงบน Linear (ตอนนั้นต้องยืนยัน QA Module/Sub-module label เพิ่มตามกฎ `linear-testcase-writer`)
- รวม: **1 EXE, 3 Scenario, 79 Test Case** (76 Happy Path, 1 Unhappy Path, 2 Edge Case) ครอบคลุม 19 template (Operation Detail 15, Anesthesia Record 4)
- TC granularity: **Atomic** ตามที่ QA ยืนยัน — แยก TC ต่อการกระทำ Load / Create / Edit / Delete ต่อ template ไม่รวมเป็น flow เดียว
- Run Type: `CT` (ยืนยันกับ QA แล้วว่าเป็นการเทสรอบแรกหลัง implement, การ์ดไม่ได้ผูก Cycle จึง resolve Scope/Version = `-` ตามกฎของสกิล ห้ามเดา)
- **บั๊ก 8 จุดที่เจอแล้วจาก baseline รอบสำรวจ 14-10-2026 ถูกใส่ไว้ใน Actual Result ของ TC ที่ตรงกันไว้ล่วงหน้าแล้ว** (ค้นคำว่า "baseline 14-10-2026" ในแต่ละ TC) เพื่อให้เห็น context ตอน QA review — **ทุก TC ยังมีสถานะ "ยังไม่ทดสอบ (Not Run)" จริง** เพราะ baseline เดิมยังไม่มีหลักฐานวิดีโอ/ภาพครบตามมาตรฐาน ต้องยืนยันซ้ำตอน GATE 2 ก่อนจะเปลี่ยนเป็น Passed/Failed จริง — ดูตาราง baseline เต็มที่ท้ายไฟล์นี้
- Operation สำหรับ GATE 2: ใช้ OR-69-000217 เดิมก่อน (⚠️ หลาย sub-tab มี record DRAFT ค้างลบไม่ได้แล้วตั้งแต่รอบ 14-10-2026 — ดู PRE-02/PRE-03) สร้าง operation ใหม่เฉพาะ sub-tab ที่ถูกล็อก (ตามที่ตาราง baseline ระบุ N/T ไว้)
- บั๊กที่เจอแล้วจะยืนยันซ้ำผ่าน Actual Result ของ TC โดยตรง **ไม่เปิด Linear bug ticket แยก** ในรอบนี้ (ตามที่ QA ยืนยัน)

---
### EXE

#### EXE - CT - -

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: -
- Module: Operation Room (OR) — Operation Detail & Anesthesia Record Templates
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record
- Environment: DEV-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Template Load: ฟอร์มทุกตัวต้อง render ได้เมื่อเลือกจาก dropdown
- Template Create: กรอกข้อมูล + Save ต้องได้ record ใหม่สถานะ DRAFT
- Template Edit: แก้ไข record ที่บันทึกแล้วต้องคงค่าไว้หลัง reload
- Template Delete: ลบ record ที่บันทึกแล้วต้องหายไปหลัง reload (ไม่มีปุ่ม/เมนูลบ = FAIL)
- ครอบคลุม 19 template ภายใต้ Operation Detail (15) และ Anesthesia Record (4)

หมายเหตุ
- สร้างจาก Acceptance Criteria (Scope) ของ requirement CTXN-10711 โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- Actual Result ทุก TC ยังเป็น "ยังไม่ทดสอบ (Not Run)" รอ Gate 2 (สำรวจแอปจริง + หลักฐานวิดีโอ/ภาพ) — ค่า baseline ที่อ้างอิงมาจากรอบสำรวจ 14-10-2026 ใช้เป็นข้อมูลอ้างอิงเบื้องต้นเท่านั้น ยังไม่ใช่ผลทดสอบที่ยืนยันซ้ำแล้วตามมาตรฐาน Gate 2
```

### Scenario

#### TS-CTXN-10711-HPY - ตรวจสอบการ Load / Create / Edit / Delete ของ template ปกติทั้ง 19 รายการ

```
ข้อมูลอ้างอิง
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Suffix: HPY
- Module: Operation Room (OR) — Operation Detail & Anesthesia Record Templates
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

วัตถุประสงค์
- ยืนยันว่าแต่ละ template ภายใต้ Operation Detail และ Anesthesia Record เปิดได้ กรอก+บันทึกได้ แก้ไขได้ และลบได้ตามพฤติกรรมปกติที่คาดไว้

ขอบเขต Requirement
- Template Inventory ทั้ง 19 รายการ (Operation Detail 15, Anesthesia Record 4)
- Common Test Flow A-E ตาม requirement

ความเสี่ยง
- ฟอร์มทางคลินิก (operative note, anesthesia record ฯลฯ) ถ้าบันทึก/แก้ไข/ลบไม่ได้ กระทบการบันทึกเวชระเบียนจริงของ OR

หมายเหตุ
- อิงตาม Acceptance Criteria (Scope) ของ requirement
```

##### Test Case ภายใต้ Scenario นี้

#### [Required] TC-CTXN-10711-001 - ตรวจสอบการแสดงฟอร์ม NUH Operative Note เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-001
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ฟอร์มแสดง section Operative diagnosis and procedure, Operative Finding / Procedure และ Body Chart

Actual Result
- ยังไม่ทดสอบ (Not Run) — baseline 14-10-2026 ของ NUH Operative Note (Load) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-003 - ทดสอบบันทึกข้อมูล NUH Operative Note สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-003
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note"

Test Data
- D-01, D-02

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast `Operative note saved`
- badge `DRAFT`

Actual Result
- **Passed** — ทดสอบจริงบน OR-69-000218 (14 ต.ค. 2569): เลือก Post-operation procedure Code 86.01 สำเร็จ, กรอก Operative Finding = "QA-AUTO-20261014-1641 create OPN", กด Save แล้ว POST /ehrbase/plugin/transform-composition/flat-to-json?templateId=nuh_operative_note_general_v1 = 200 และ POST /ehrbase/rest/openehr/v1/ehr/.../contribution = 201, badge DRAFT ปรากฏข้าง "NUH Operative Note" ตรงตาม Expected
- หลักฐาน: วิดีโอ tc001-005-operative-note-full-flow.webm แนบที่การ์ด CTXN-10770 (ครอบคลุม TC-001 ถึง TC-005)
- พบ UI quirk (ไม่ใช่ blocker): หลังเกิด validation error แล้วพิมพ์ "86" ในช่อง Post-operation procedure Code ทันที — dropdown ICD9CM ไม่ขึ้น แม้ API ตอบ 200 ถูกต้อง แก้ได้โดยไปแตะ field อื่นก่อนแล้วกลับมา

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-004 - ทดสอบแก้ไขข้อมูล NUH Operative Note แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-004
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note"
4. ต้องมี record NUH Operative Note ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-02 (ต่อท้าย ' - edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ข้อความ ' - edited' ยังอยู่หลัง reload
- placeholder 'Operative finding' ไม่แสดงซ้อนกับข้อความ

Actual Result
- **Passed** — ทดสอบจริงบน OR-69-000218 (14 ต.ค. 2569): ต่อท้ายข้อความ " - edited" ใน Operative Finding แล้วกด Save, จากนั้น page.goto() ไปที่ URL เดิม (reload ทั้งหน้าจริง ไม่ใช่ปุ่ม refresh ของ operation), หลัง reload ข้อความ "QA-AUTO-20261014-1641 create OPN - edited" ยังอยู่ครบ badge DRAFT ยังอยู่ ไม่มี record ซ้ำเกิดขึ้น ตรงตาม Expected ทุกจุด
- หลักฐาน: screenshot ภาพ after-reload แนบที่การ์ด CTXN-10772, วิดีโอ full flow แนบที่การ์ด CTXN-10770

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-005 - ทดสอบลบข้อมูล NUH Operative Note (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-005
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note"
4. ต้องมี record NUH Operative Note ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Not Test** (Linear: CTXN-10774) — ไม่มีปุ่มหรือเมนูลบจริงในหน้าจอ (ตามกติกาใหม่: TC Delete ที่ไม่มีปุ่มลบจริงให้บันทึกเป็น Not Test)

หมายเหตุ
- **สถานะใน Linear เปลี่ยนเป็น Canceled** (19 ต.ค. 2569) — user ขอให้เอา TC นี้ออกจาก scope เพราะไม่มี delete feature จริง แต่เครื่องมือไม่มีสิทธิ์ลบ issue ได้ จึงเปลี่ยนเป็น Canceled + หมายเหตุรอผู้มีสิทธิ์ลบแทน (การ์ด: CTXN-10774)
- ได้รับการยืนยันจาก QA ว่าระบบไม่มีฟังก์ชันลบจริง
```

#### [Required] TC-CTXN-10711-006 - ตรวจสอบการแสดงฟอร์ม NUH Operative Note Cesarean Section เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-006
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note Cesarean Section"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ฟอร์มแสดงผล (render) ได้ภายใน 5 วินาทีหลังเลือก template จาก dropdown

Actual Result
- ยังไม่ทดสอบ (Not Run) — baseline 14-10-2026 ของ NUH Operative Note Cesarean Section (Load) = N/T, หมายเหตุ: ถูกล็อกหลังบันทึก NUH Operative Note (record DRAFT ค้าง ลบไม่ได้)

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-007 - ทดสอบบันทึกข้อมูล NUH Operative Note Cesarean Section สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-007
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note Cesarean Section"

Test Data
- D-03

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast สีเขียวแจ้งบันทึกสำเร็จ
- ชื่อ template แสดงพร้อม badge `DRAFT`
- network: `POST /ehrbase/plugin/transform-composition/flat-to-json?templateId=<id>` = 200
- network: `POST /ehrbase/rest/openehr/v1/ehr/<ehrId>/contribution` = 201

Actual Result
- ยังไม่ทดสอบ (Not Run) — baseline 14-10-2026 ของ NUH Operative Note Cesarean Section (Create) = N/T

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-008 - ทดสอบแก้ไขข้อมูล NUH Operative Note Cesarean Section แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-008
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note Cesarean Section"
4. ต้องมี record NUH Operative Note Cesarean Section ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-03 (ต่อท้าย ' - edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ค่าที่แก้ยังอยู่หลัง reload ทั้งหน้า
- ไม่มี record ซ้ำเกิดขึ้น

Actual Result
- ยังไม่ทดสอบ (Not Run) — baseline 14-10-2026 ของ NUH Operative Note Cesarean Section (Edit) = N/T

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-009 - ทดสอบลบข้อมูล NUH Operative Note Cesarean Section (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-009
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note Cesarean Section"
4. ต้องมี record NUH Operative Note Cesarean Section ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- ยังไม่ทดสอบ (Not Run) — baseline 14-10-2026 ของ NUH Operative Note Cesarean Section (Delete) = N/T

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-010 - ตรวจสอบการแสดงฟอร์ม NUH Operative Note Total Abdominal Hysterectomy เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-010
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note Total Abdominal Hysterectomy"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ฟอร์มแสดงผล (render) ได้ภายใน 5 วินาทีหลังเลือก template จาก dropdown

Actual Result
- ยังไม่ทดสอบ (Not Run) — baseline 14-10-2026 ของ NUH Operative Note Total Abdominal Hysterectomy (Load) = N/T, หมายเหตุ: ถูกล็อกหลังบันทึก NUH Operative Note

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-011 - ทดสอบบันทึกข้อมูล NUH Operative Note Total Abdominal Hysterectomy สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-011
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note Total Abdominal Hysterectomy"

Test Data
- D-03

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast สีเขียวแจ้งบันทึกสำเร็จ
- ชื่อ template แสดงพร้อม badge `DRAFT`
- network: `POST /ehrbase/plugin/transform-composition/flat-to-json?templateId=<id>` = 200
- network: `POST /ehrbase/rest/openehr/v1/ehr/<ehrId>/contribution` = 201

Actual Result
- ยังไม่ทดสอบ (Not Run) — baseline 14-10-2026 ของ NUH Operative Note Total Abdominal Hysterectomy (Create) = N/T

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-012 - ทดสอบแก้ไขข้อมูล NUH Operative Note Total Abdominal Hysterectomy แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-012
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note Total Abdominal Hysterectomy"
4. ต้องมี record NUH Operative Note Total Abdominal Hysterectomy ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-03 (ต่อท้าย ' - edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ค่าที่แก้ยังอยู่หลัง reload ทั้งหน้า
- ไม่มี record ซ้ำเกิดขึ้น

Actual Result
- ยังไม่ทดสอบ (Not Run) — baseline 14-10-2026 ของ NUH Operative Note Total Abdominal Hysterectomy (Edit) = N/T

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-013 - ทดสอบลบข้อมูล NUH Operative Note Total Abdominal Hysterectomy (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-013
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note Total Abdominal Hysterectomy"
4. ต้องมี record NUH Operative Note Total Abdominal Hysterectomy ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- ยังไม่ทดสอบ (Not Run) — baseline 14-10-2026 ของ NUH Operative Note Total Abdominal Hysterectomy (Delete) = N/T

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-014 - ตรวจสอบการแสดงฟอร์ม TMH Operative Note (General) เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-014
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "TMH Operative Note (General)"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ฟอร์มแสดงผล (render) ได้ภายใน 5 วินาทีหลังเลือก template จาก dropdown

Actual Result
- **Passed** — ทดสอบจริงบน OR-69-000219 (14 ต.ค. 2569, Linear: CTXN-11639) ฟอร์ม render ภายใน ~2 วินาที แสดง section ครบ (Pre/Post-Operative Diagnosis, Operative Participants, Anesthesia Record, Operative Findings/Procedure, Operation/Procedure)

หมายเหตุ
- operation OR-69-000219 ไม่ถูกล็อกจริงหลังบันทึก Cesarean/TAH เพราะ record ที่ "สำเร็จ" กลายเป็น orphaned ไม่ถูกแสดงกลับมา (ดู TC-015/CTXN-11640) — baseline เดิมที่บอกว่า "ถูกล็อก" คลาดเคลื่อนจากที่พบจริงรอบนี้
```

#### [Required] TC-CTXN-10711-015 - ทดสอบบันทึกข้อมูล TMH Operative Note (General) สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-015
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "TMH Operative Note (General)"

Test Data
- D-03

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast สีเขียวแจ้งบันทึกสำเร็จ
- ชื่อ template แสดงพร้อม badge `DRAFT`
- network: `POST /ehrbase/plugin/transform-composition/flat-to-json?templateId=<id>` = 200
- network: `POST /ehrbase/rest/openehr/v1/ehr/<ehrId>/contribution` = 201

Actual Result
- **Failed** — บั๊กเดียวกับ TC-011 (orphaned record) ทดสอบจริงบน OR-69-000219 (14 ต.ค. 2569, Linear: CTXN-11640) network สำเร็จ (flat-to-json 200, contribution 201) แต่ไม่มี toast/badge ขึ้นเลย และหลัง reload เต็มหน้า dropdown กลับเป็น "Select form" ว่างเปล่า — record หายจาก UI ถาวร ยืนยันเป็นบั๊กเชิงระบบของกลุ่ม Operative Note sub-templates (Cesarean/TAH/TMH)

หมายเหตุ
- บล็อก TC-016/017 เพราะ UI มองไม่เห็น record ที่จะแก้/ลบ
```

#### [Required] TC-CTXN-10711-016 - ทดสอบแก้ไขข้อมูล TMH Operative Note (General) แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-016
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "TMH Operative Note (General)"
4. ต้องมี record TMH Operative Note (General) ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-03 (ต่อท้าย ' - edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ค่าที่แก้ยังอยู่หลัง reload ทั้งหน้า
- ไม่มี record ซ้ำเกิดขึ้น

Actual Result
- **Blocked** (Linear: CTXN-11641) — TC-015 (Create) บันทึกสำเร็จที่ backend แต่ record เป็น orphaned ไม่ปรากฏใน UI จึงไม่มี record ให้แก้ไข

หมายเหตุ
- รอ fix ของ TC-015 ก่อนถึงจะทดสอบ TC นี้ได้จริง
```

#### [Required] TC-CTXN-10711-017 - ทดสอบลบข้อมูล TMH Operative Note (General) (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-017
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "TMH Operative Note (General)"
4. ต้องมี record TMH Operative Note (General) ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Blocked** (Linear: CTXN-11642) — TC-015 (Create) บันทึกสำเร็จที่ backend แต่ record เป็น orphaned ไม่ปรากฏใน UI จึงไม่มี record ให้ลบ

หมายเหตุ
- รอ fix ของ TC-015 ก่อนถึงจะทดสอบ TC นี้ได้จริง
```

#### [Required] TC-CTXN-10711-018 - ตรวจสอบการแสดงฟอร์ม OR Nurse Note เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-018
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Nurse Note" แล้วเตรียมเลือก template "OR Nurse Note"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ฟอร์มแสดง Dx, Op และตาราง Focus list / Intervention / Evaluation ที่เพิ่มแถวได้

Actual Result
- **Passed** — ฟอร์ม render สมบูรณ์ แสดง section Pre-operative Diagnosis, Post-operation procedure (Code & Text) และตาราง Focus list / Intervention / Evaluation พร้อมปุ่ม Add สำหรับเพิ่มแถวในตาราง
- หลักฐาน: `.playwright-mcp/CTXN-10711/images/037-TC018-nursenote-load.png`

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-019 - ทดสอบบันทึกข้อมูล OR Nurse Note สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-019
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Nurse Note" แล้วเตรียมเลือก template "OR Nurse Note"

Test Data
- D-04

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast `Nurse note saved`
- badge `DRAFT`

Actual Result
- **Passed** — กรอก Post-operation procedure Code 86.01 และ Text "Aspiration of skin and subcutaneous tissue" แล้วกด Save แสดง badge DRAFT และ toast แจ้งเตือน หลัง reload ข้อมูลถูกบันทึกจริง
- หลักฐาน: `.playwright-mcp/CTXN-10711/images/039-TC019-nursenote-save-result.png`, `040-TC019-nursenote-save-marked.png`, `041-TC019-reload-verify.png`

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-020 - ทดสอบแก้ไขข้อมูล OR Nurse Note แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-020
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Nurse Note" แล้วเตรียมเลือก template "OR Nurse Note"
4. ต้องมี record OR Nurse Note ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-05 (ต่อท้าย ' edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ข้อความ ' edited' ยังอยู่หลัง reload

Actual Result
- **Passed (มี Bug/Defect พบ)** — แก้ไขข้อความต่อท้าย ' edited' แล้วกด Save สำเร็จ ข้อมูลถูก persist จริงที่ backend (ยืนยันจากการเปิดหน้าโดยตรงใน session ใหม่ ค่า ' edited' ยังคงอยู่) **แต่พบ Defect**: ช่อง Code ICD9CM (86.01) หายไป กลายเป็นค่าว่าง `Search ICD9CM` หลัง reload
- หลักฐาน: `.playwright-mcp/CTXN-10711/images/042-TC020-edit-reload-check.png`, `043-TC020-edit-reload-marked.png`, `temp_scripts/nurse_note_direct_url.png`

หมายเหตุ
- พบ Defect ช่อง Code ไม่แสดงผล/หายไปหลัง Edit
```

#### [Required] TC-CTXN-10711-021 - ทดสอบลบข้อมูล OR Nurse Note (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-021
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Nurse Note" แล้วเตรียมเลือก template "OR Nurse Note"
4. ต้องมี record OR Nurse Note ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Not Test** — ไม่มีปุ่มหรือเมนูลบจริงในหน้าจอ (ตามกติกาใหม่: TC Delete ที่ไม่มีปุ่มลบจริงให้บันทึกเป็น Not Test)
- หลักฐาน: `.playwright-mcp/CTXN-10711/images/044-TC021-no-delete-marked.png`

หมายเหตุ
- **สถานะใน Linear เปลี่ยนเป็น Canceled** (19 ต.ค. 2569) — user ขอให้เอา TC นี้ออกจาก scope เพราะไม่มี delete feature จริง แต่เครื่องมือไม่มีสิทธิ์ลบ issue ได้ จึงเปลี่ยนเป็น Canceled + หมายเหตุรอผู้มีสิทธิ์ลบแทน (การ์ด: CTXN-11769)
- ยืนยันจากหน้าจอจริงว่าไม่มีปุ่ม/เมนูลบฟอร์ม Nurse Note
```

#### [Required] TC-CTXN-10711-022 - ตรวจสอบการแสดงฟอร์ม Anes Safety Check เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-022
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "Anes Safety Check"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- แสดง Sign In และ Time Out

Actual Result
- **Passed** (Linear: CTXN-11770) — ฟอร์ม render ครบ แสดง Sign In (Q1-Q5) และ Time Out ตาม Expected

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-023 - ทดสอบบันทึกข้อมูล Anes Safety Check สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-023
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "Anes Safety Check"

Test Data
- D-06

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast `Safety checklist saved`
- badge `DRAFT`

Actual Result
- **Passed** (Linear: CTXN-11771) — เลือก Q1 = No แล้ว Save สำเร็จ (200/201) badge DRAFT ขึ้นทันที

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-024 - ทดสอบแก้ไขข้อมูล Anes Safety Check แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-024
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "Anes Safety Check"
4. ต้องมี record Anes Safety Check ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-06 (Q4 เปลี่ยนเป็น No)

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- Q4 "Is the monitor on the patient and functioning?" = No ยังอยู่หลัง reload

Actual Result
- **Passed** (Linear: CTXN-11772) — เปลี่ยน Q4 เป็น No แล้ว Save สำเร็จ ยืนยันด้วย reload เต็มหน้าจริง ค่ายังอยู่

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-025 - ทดสอบลบข้อมูล Anes Safety Check (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-025
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "Anes Safety Check"
4. ต้องมี record Anes Safety Check ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Not Test** (Linear: CTXN-11773) — ไม่มีปุ่ม/เมนูลบจริงในระบบ (ตามกฎใหม่: TC Delete ที่ไม่มีปุ่มลบจริงให้บันทึกเป็น Not Test)

หมายเหตุ
- **สถานะใน Linear เปลี่ยนเป็น Canceled** (19 ต.ค. 2569) — user ขอให้เอา TC นี้ออกจาก scope เพราะไม่มี delete feature จริง แต่เครื่องมือไม่มีสิทธิ์ลบ issue ได้ จึงเปลี่ยนเป็น Canceled + หมายเหตุรอผู้มีสิทธิ์ลบแทน (การ์ด: CTXN-11773)
- -
```

#### [Required] TC-CTXN-10711-026 - ตรวจสอบการแสดงฟอร์ม OR Surgical Safety Checklist เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-026
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "OR Surgical Safety Checklist"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- แสดง Sign In และ Time Out

Actual Result
- **Passed** (Linear: CTXN-11774) — สร้าง operation ใหม่ OR-69-000221 เพราะ sub-tab ถูกล็อกจริงหลัง Anes Safety Check — ฟอร์มแสดง SIGN IN/TIME OUT/SIGN OUT (ต้อง scroll ลง)

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-027 - ทดสอบบันทึกข้อมูล OR Surgical Safety Checklist สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-027
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "OR Surgical Safety Checklist"

Test Data
- D-07

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast `Safety checklist saved`
- badge `DRAFT`

Actual Result
- **Passed** (Linear: CTXN-11775) — เลือก checkbox แรก "Patient has confirmed" แล้ว Save สำเร็จ badge DRAFT ขึ้นทันที

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-028 - ทดสอบแก้ไขข้อมูล OR Surgical Safety Checklist แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-028
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "OR Surgical Safety Checklist"
4. ต้องมี record OR Surgical Safety Checklist ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-07 (เปลี่ยนเป็นอีกตัวเลือก)

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- Q4 "Is the monitor on the patient and functioning?" = No ยังอยู่หลัง reload

Actual Result
- **Passed** (Linear: CTXN-11776) — เปลี่ยนจาก "Patient has confirmed" เป็น "Site marked" แล้ว Save ยืนยันด้วย reload เต็มหน้าจริง ค่ายังอยู่ (หมายเหตุ: Expected Result ต้นฉบับคัดลอกข้อความ Q4 จาก Anes Safety Check มาผิด ฟอร์มนี้ไม่มี Q4 นั้น)

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-029 - ทดสอบลบข้อมูล OR Surgical Safety Checklist (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-029
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "OR Surgical Safety Checklist"
4. ต้องมี record OR Surgical Safety Checklist ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Not Test** (Linear: CTXN-11777) — ไม่มีปุ่ม/เมนูลบจริงในระบบ ตรงกับทุก template ที่เทสมาก่อนหน้า

หมายเหตุ
- **สถานะใน Linear เปลี่ยนเป็น Canceled** (19 ต.ค. 2569) — user ขอให้เอา TC นี้ออกจาก scope เพราะไม่มี delete feature จริง แต่เครื่องมือไม่มีสิทธิ์ลบ issue ได้ จึงเปลี่ยนเป็น Canceled + หมายเหตุรอผู้มีสิทธิ์ลบแทน (การ์ด: CTXN-11777)
- -
```

#### [Required] TC-CTXN-10711-030 - ตรวจสอบการแสดงฟอร์ม Surgical Safety Checklist เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-030
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "Surgical Safety Checklist"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- แสดง Sign In และ Time Out

Actual Result
- **Failed** (Linear: CTXN-11778) — ฟอร์มที่ render เป็น "แบบตรวจสอบความปลอดภัยสำหรับผู้ป่วยผ่าตัด" ไม่มี Sign In/Time Out เลย (ยืนยันด้วย locator shadow-DOM-aware) โครงสร้างต่างจาก Expected Result โดยสิ้นเชิง

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-031 - ทดสอบบันทึกข้อมูล Surgical Safety Checklist สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-031
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "Surgical Safety Checklist"

Test Data
- D-07

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast `Safety checklist saved`
- badge `DRAFT`

Actual Result
- **Failed — บั๊กร้ายแรง** (Linear: CTXN-11779) — template `nuh_ipd_surgical_safety_checklist_v1` ไม่มีอยู่จริงบน ehrbase เลย (400 "Could not retrieve template") ไม่มีทาง save สำเร็จได้ไม่ว่ากรอกอะไร

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-032 - ทดสอบแก้ไขข้อมูล Surgical Safety Checklist แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-032
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "Surgical Safety Checklist"
4. ต้องมี record Surgical Safety Checklist ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-07 (เปลี่ยนเป็นอีกตัวเลือก)

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- Q4 "Is the monitor on the patient and functioning?" = No ยังอยู่หลัง reload

Actual Result
- **Blocked** (Linear: CTXN-11780) — TC-031 ล้มเหลวตั้งแต่ Create เพราะ template ไม่มีอยู่จริงบน backend

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-033 - ทดสอบลบข้อมูล Surgical Safety Checklist (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-033
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Safety Checklist" แล้วเตรียมเลือก template "Surgical Safety Checklist"
4. ต้องมี record Surgical Safety Checklist ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Blocked** (Linear: CTXN-11781) — TC-031 ล้มเหลวตั้งแต่ Create เพราะ template ไม่มีอยู่จริงบน backend

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-034 - ตรวจสอบการแสดงฟอร์ม ECMO Form เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-034
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "ECMO Form"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- แสดง NARESUAN ECMO DATA SHEET

Actual Result
- **Passed** (Linear: CTXN-11782) — แสดง "NARESUAN ECMO DATA SHEET" ตรงตาม Expected

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-035 - ทดสอบบันทึกข้อมูล ECMO Form สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-035
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "ECMO Form"

Test Data
- D-08

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast `Custom note saved`

Actual Result
- **Passed** (Linear: CTXN-11783) — กรอก Diagnosis แล้ว Save สำเร็จ (200/201) badge DRAFT ขึ้นทันที

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-036 - ทดสอบแก้ไขข้อมูล ECMO Form แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-036
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "ECMO Form"
4. ต้องมี record ECMO Form ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-08 (ต่อท้าย ' edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- record ที่บันทึกแล้วต้องมีปุ่ม Save
- ค่าที่แก้ยังอยู่หลัง reload

Actual Result
- **Failed** (Linear: CTXN-11784) — ยืนยันแล้วตรงกับ baseline เป๊ะ: ไม่มีปุ่ม Save เลยหลังบันทึก record แรก พิมพ์แก้ได้แต่ reload แล้วค่ากลับไปเดิม

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-037 - ทดสอบลบข้อมูล ECMO Form (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-037
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "ECMO Form"
4. ต้องมี record ECMO Form ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Not Test** (Linear: CTXN-11785) — ไม่มีปุ่ม/เมนูลบจริงในระบบ (ตามกฎ: ไม่มีปุ่มลบจริง = Not Test ไม่ใช่ Failed)

หมายเหตุ
- **สถานะใน Linear เปลี่ยนเป็น Canceled** (19 ต.ค. 2569) — user ขอให้เอา TC นี้ออกจาก scope เพราะไม่มี delete feature จริง แต่เครื่องมือไม่มีสิทธิ์ลบ issue ได้ จึงเปลี่ยนเป็น Canceled + หมายเหตุรอผู้มีสิทธิ์ลบแทน (การ์ด: CTXN-11785)
- -
```

#### [Required] TC-CTXN-10711-038 - ตรวจสอบการแสดงฟอร์ม NUH Perfusionist Form เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-038
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "NUH Perfusionist Form"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- แสดงฟอร์ม NUH Perfusionist Form (เหมือนรูปแบบ ECMO Form)

Actual Result
- **Passed** (CTXN-11786) — ทดสอบจริงบน OR-69-000222 (14 ต.ค. 2569) เลือก "NUH Perfusionist Form" จาก dropdown Custom Note ฟอร์ม render ทันที แสดงหัว "Perfusionist Form" (template: `nuh_perfusionist_form_v1`) พร้อม field ครบ: Time in, Time out, Operative time, Type of anesthesia, Timing, Diagnosis, Operation type, CPB use, Operation, Result, Infection, Note — ยืนยัน baseline PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-039 - ทดสอบบันทึกข้อมูล NUH Perfusionist Form สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-039
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "NUH Perfusionist Form"

Test Data
- D-09

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast `Custom note saved`

Actual Result
- **Passed** (CTXN-11787) — กรอก Diagnosis = "QA-AUTO-20261014-2154 Perfusionist" แล้วกด Save: network `flat-to-json?templateId=nuh_perfusionist_form_v1` = 200, `contribution` = 201 — หลัง save badge DRAFT ขึ้นข้างชื่อ "NUH Perfusionist Form" ทันที record ECMO Form เดิมยังอยู่ครบด้านล่าง (multi-select ไม่ทับกัน) ยืนยันซ้ำด้วยการ reload หน้าทั้งหน้า: ค่า Diagnosis ยังถูกต้อง — ยืนยัน baseline PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-040 - ทดสอบแก้ไขข้อมูล NUH Perfusionist Form แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-040
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "NUH Perfusionist Form"
4. ต้องมี record NUH Perfusionist Form ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-09 (ต่อท้าย ' edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- record ที่บันทึกแล้วต้องมีปุ่ม Save
- ค่าที่แก้ยังอยู่หลัง reload

Actual Result
- **Failed** (CTXN-11788) — record ที่บันทึกแล้วไม่มีปุ่ม Save เลย ตรงกับ baseline และตรงกับบั๊กเดียวกับ ECMO Form (TC-036) เป๊ะ: ช่อง Diagnosis ยังแก้ไขได้ (พิมพ์ต่อท้าย "edited" ได้ปกติ) แต่ไม่มีปุ่ม Save ปรากฏที่ไหนในหน้าเลย (ยืนยันด้วย `getByRole('button',{name:'Save'}).count()` = 0) พิมพ์ "...Perfusionist edited" แล้ว reload หน้าทั้งหน้าจริง: ค่ากลับไปเป็น "...Perfusionist" เดิม ยืนยันว่าข้อมูลที่แก้ไขหายไปจริง ไม่มีทางบันทึกการแก้ไขได้เลยผ่าน UI — ยืนยัน baseline FAIL

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-041 - ทดสอบลบข้อมูล NUH Perfusionist Form (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-041
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "NUH Perfusionist Form"
4. ต้องมี record NUH Perfusionist Form ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Not Test** (CTXN-11789) — ไม่มีปุ่ม/เมนูลบในระบบจริง ทดสอบจริงบน OR-69-000222 (14 ต.ค. 2569) ตรวจ header "NUH Perfusionist Form / DRAFT" และทั้งหน้าด้วย query ปุ่ม/ไอคอนทั้งหมด (`getByRole('button',{name:/delete|ลบ/i})` = 0, ไอคอน class/aria-label ที่มีคำว่า delete/trash = 0) ไม่พบปุ่มหรือเมนูลบ record เลย — ตรงกับผลเดียวกับ ECMO Form (TC-037) จึงจัดเป็น Not Test แทน Failed ตามกฎที่ยืนยันกับ QA แล้ว (feature ลบ record ไม่มีอยู่จริงในระบบ)

หมายเหตุ
- **สถานะใน Linear เปลี่ยนเป็น Canceled** (19 ต.ค. 2569) — user ขอให้เอา TC นี้ออกจาก scope เพราะไม่มี delete feature จริง แต่เครื่องมือไม่มีสิทธิ์ลบ issue ได้ จึงเปลี่ยนเป็น Canceled + หมายเหตุรอผู้มีสิทธิ์ลบแทน (การ์ด: CTXN-11789)
- -
```

#### [Required] TC-CTXN-10711-042 - ตรวจสอบการแสดงฟอร์ม OR Custom Note เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-042
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "OR Custom Note"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ฟอร์มแสดง ไม่ขึ้นข้อความ `ไม่สามารถแสดงฟอร์มได้`
- network: `GET /cortex-form/or-custom-note-v1.js` = 200

Actual Result
- **Failed** (CTXN-11790) — ยืนยันตรงกับ baseline: เลือก "OR Custom Note" จาก dropdown ติ๊กถูกต้อง แต่ฟอร์มไม่ render เลย แสดง "ไม่สามารถแสดงฟอร์มได้" พร้อมลิงก์ "ดาวน์โหลดอีกครั้ง" — network ยืนยัน `GET /cortex-form/or-custom-note-v1.js?v=v2.2.4` → **404** (baseline เดิมคือ 503 ต่างกันแต่สรุปคือโหลดไม่สำเร็จเหมือนกัน) กดลิงก์ retry แล้วยัง 404 ซ้ำเหมือนเดิม ไม่ใช่ transient

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-043 - ทดสอบบันทึกข้อมูล OR Custom Note สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-043
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "OR Custom Note"

Test Data
- D-10

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast สีเขียวแจ้งบันทึกสำเร็จ
- ชื่อ template แสดงพร้อม badge `DRAFT`
- network: `POST /ehrbase/plugin/transform-composition/flat-to-json?templateId=<id>` = 200
- network: `POST /ehrbase/rest/openehr/v1/ehr/<ehrId>/contribution` = 201

Actual Result
- **Blocked** (CTXN-11791) — TC-042 (Load) ล้มเหลวตั้งแต่ขั้นแรก (JS bundle 404) ฟอร์มไม่ render เลย ไม่มีช่องให้กรอกข้อมูลตาม D-10 ลองกดปุ่ม Save ที่ยังปรากฏอยู่แล้วไม่มีอะไรเกิดขึ้น (ไม่มี network request ใหม่ ไม่มี toast)

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-044 - ทดสอบแก้ไขข้อมูล OR Custom Note แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-044
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "OR Custom Note"
4. ต้องมี record OR Custom Note ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-10 (ต่อท้าย ' edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ค่าที่แก้ยังอยู่หลัง reload ทั้งหน้า
- ไม่มี record ซ้ำเกิดขึ้น

Actual Result
- **Blocked** (CTXN-11792) — TC-043 (Create) ล้มเหลวตั้งแต่ขั้นแรก เพราะ TC-042 (Load) โหลดฟอร์มไม่สำเร็จ จึงไม่มี record ให้ทดสอบแก้ไข

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-045 - ทดสอบลบข้อมูล OR Custom Note (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-045
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "OR Custom Note"
4. ต้องมี record OR Custom Note ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Blocked** (CTXN-11793) — TC-043 (Create) ล้มเหลวตั้งแต่ขั้นแรก เพราะ TC-042 (Load) โหลดฟอร์มไม่สำเร็จ จึงไม่มี record ให้ทดสอบลบ (ต่างจาก Not Test เพราะไม่เคยได้ลองหาปุ่มลบจริง)

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-046 - ตรวจสอบการแสดงฟอร์ม Pre-Procedural Sedation Assessment เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-046
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Pre-Procedural Sedation Assessment"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ฟอร์มแสดงผล (render) ได้ภายใน 5 วินาทีหลังเลือก template จาก dropdown

Actual Result
- **Passed** (CTXN-11971) — ทดสอบจริงบน OR-69-000222 (19 ต.ค. 2569) ฟอร์ม render ทันที แสดงหัว "Pre-Procedural Sedation Assessment" พร้อม section History/Physical Examination/Airway ครบ มีปุ่ม Save — ยืนยัน baseline PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-047 - ทดสอบบันทึกข้อมูล Pre-Procedural Sedation Assessment สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-047
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Pre-Procedural Sedation Assessment"

Test Data
- D-11

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast สำเร็จ
- record แสดงในรายการ
- ไม่มี contribution ซ้ำหรือค้าง

Actual Result
- **Failed** (CTXN-11972) — ออร์ฟาน record แบบเดียวกับ TAH/TMH: Save สำเร็จที่ backend (flat-to-json=200, contribution=201 ครั้งเดียว) แต่ไม่มี badge DRAFT ขึ้น และหลัง reload เต็มหน้า dropdown กลับเป็น "Select form" ว่างเปล่า ไม่มีทางเข้าถึง record อีกเลย (ECMO/Perfusionist ที่บันทึกไว้ก่อนยังอยู่ครบ ยืนยันว่าไม่ใช่ปัญหากลไกร่วม) — บั๊กคนละรายละเอียดจาก baseline (ไม่มี duplicate contribution, ไม่มี toast error ชัดเจน) แต่ผลลัพธ์ fail เหมือนกัน

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-048 - ทดสอบแก้ไขข้อมูล Pre-Procedural Sedation Assessment แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-048
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Pre-Procedural Sedation Assessment"
4. ต้องมี record Pre-Procedural Sedation Assessment ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-11 (ต่อท้าย ' edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ค่าที่แก้ยังอยู่หลัง reload ทั้งหน้า
- ไม่มี record ซ้ำเกิดขึ้น

Actual Result
- **Blocked** (CTXN-11973) — TC-047 (Create) บันทึกสำเร็จที่ backend แต่ record กลายเป็น orphaned ไม่มีทางเปิดแก้ไขได้ผ่าน UI เลย

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-049 - ทดสอบลบข้อมูล Pre-Procedural Sedation Assessment (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-049
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Pre-Procedural Sedation Assessment"
4. ต้องมี record Pre-Procedural Sedation Assessment ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Blocked** (CTXN-11974) — TC-047 (Create) บันทึกสำเร็จที่ backend แต่ record กลายเป็น orphaned ไม่มี record ให้ทดสอบลบเลย (ต่างจาก Not Test เพราะยังไม่เคยได้ลองหาปุ่มลบจริง)

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-050 - ตรวจสอบการแสดงฟอร์ม Procedural Sedation Checklist and Assessment เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-050
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Procedural Sedation Checklist and Assessment"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- แสดงฟอร์ม Procedural Sedation Checklist and Assessment (เหมือนรูปแบบ ECMO Form)

Actual Result
- **Passed** (CTXN-11975) — ทดสอบจริงบน OR-69-000222 (19 ต.ค. 2569) ฟอร์ม render ทันที แสดงหัว "Procedural Sedation Report" ตาราง Events ครบตาม Expected

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-051 - ทดสอบบันทึกข้อมูล Procedural Sedation Checklist and Assessment สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-051
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Procedural Sedation Checklist and Assessment"

Test Data
- D-12

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast `Custom note saved`

Actual Result
- **Passed** (CTXN-11976) — กรอก Obstructed airway=No (D-12) แล้ว Save สำเร็จ (200/201) badge DRAFT ขึ้นทันที ยืนยันด้วย reload เต็มหน้า ค่ายังถูกต้อง ต่างจาก TC-047 ที่กลายเป็น orphaned — template นี้ไม่มีปัญหาเดียวกัน

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-052 - ทดสอบแก้ไขข้อมูล Procedural Sedation Checklist and Assessment แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-052
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Procedural Sedation Checklist and Assessment"
4. ต้องมี record Procedural Sedation Checklist and Assessment ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-12 (เปลี่ยนเป็น Yes)

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- record ที่บันทึกแล้วต้องมีปุ่ม Save
- ค่าที่แก้ยังอยู่หลัง reload

Actual Result
- **Failed** (CTXN-11977) — ยืนยันตรงกับ baseline และบั๊กเดียวกับ ECMO/Perfusionist: เปลี่ยน Obstructed airway เป็น Yes ได้ปกติแต่ไม่มีปุ่ม Save เลยในหน้า reload แล้วค่ากลับเป็น No เหมือนเดิม — บั๊กร่วมของกลไก Custom Note (พบใน 3/4 template)

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-053 - ทดสอบลบข้อมูล Procedural Sedation Checklist and Assessment (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-053
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Procedural Sedation Checklist and Assessment"
4. ต้องมี record Procedural Sedation Checklist and Assessment ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Canceled** (CTXN-11978) — ไม่มีปุ่ม/เมนูลบจริงในระบบ ตรงกับทุก template ก่อนหน้า — ตามกฎใหม่ (19 ต.ค. 2569) Delete TC ที่ไม่มี delete feature จริงให้เอาออกจาก scope แทน Not Test (เครื่องมือลบ issue ไม่ได้จริง จึงใช้ Canceled + หมายเหตุรอผู้มีสิทธิ์ลบแทน)

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-054 - ตรวจสอบการแสดงฟอร์ม Sedation Form v2 เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-054
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Sedation Form v2"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ฟอร์มแสดงผล (render) ได้ภายใน 5 วินาทีหลังเลือก template จาก dropdown

Actual Result
- **Passed** (CTXN-11979) — ทดสอบจริงบน OR-69-000222 (19 ต.ค. 2569) ฟอร์ม render ทันที แสดงหัว "Sedation Form v2" ตาราง Time-based BP + Medication administration ครบ

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-055 - ทดสอบบันทึกข้อมูล Sedation Form v2 สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-055
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Sedation Form v2"

Test Data
- D-13

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- กด Save แล้วมี network request `flat-to-json` และ toast สำเร็จ
- หรือถ้าข้อมูลไม่ครบต้องมีข้อความ validation แจ้งชัดเจน

Actual Result
- **Failed** (CTXN-11980) — ยืนยันตรงกับ baseline เป๊ะ: กรอก D-13 ครบแล้ว Save ไม่มี network request ใดๆ เกิดขึ้นเลย ไม่มี toast/validation ยืนยันซ้ำด้วย reload เต็มหน้า ไม่มี record เกิดขึ้นเลย — รุนแรงกว่าทุก template เพราะปุ่ม Save ไม่ทำงานอะไรเลยตั้งแต่ต้น

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-056 - ทดสอบแก้ไขข้อมูล Sedation Form v2 แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-056
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Sedation Form v2"
4. ต้องมี record Sedation Form v2 ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-13 (systolic = 130)

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ค่าที่แก้ยังอยู่หลัง reload ทั้งหน้า
- ไม่มี record ซ้ำเกิดขึ้น

Actual Result
- **Blocked** (CTXN-11981) — TC-055 (Create) ล้มเหลวสนิท ไม่มี record ให้เปิดแก้ไขได้เลย

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-057 - ทดสอบลบข้อมูล Sedation Form v2 (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-057
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note" แล้วเตรียมเลือก template "Sedation Form v2"
4. ต้องมี record Sedation Form v2 ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- **Blocked** (CTXN-11982) — TC-055 (Create) ล้มเหลวสนิท ไม่มี record ให้ทดสอบลบ (ต่างจาก Not Test เพราะยังไม่เคยลองหาปุ่มลบจริง)

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-058 - ตรวจสอบการแสดงฟอร์ม Operation Complication เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-058
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Complication" แล้วเตรียมเลือก template "Operation Complication"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- แสดง checkbox รายการ complication

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11983 — baseline 14-10-2026 ของ Operation Complication (Load) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-059 - ทดสอบบันทึกข้อมูล Operation Complication สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-059
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Complication" แล้วเตรียมเลือก template "Operation Complication"

Test Data
- D-14

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast สำเร็จ
- network: `flat-to-json` = 200
- badge `DRAFT`

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11984 — baseline 14-10-2026 ของ Operation Complication (Create) = FAIL, หมายเหตุ: toast `Save complication failed`, `flat-to-json` → 400

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-060 - ทดสอบแก้ไขข้อมูล Operation Complication แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-060
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Complication" แล้วเตรียมเลือก template "Operation Complication"
4. ต้องมี record Operation Complication ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-14 (ติ๊กเพิ่ม Wound infection)

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ค่าที่แก้ยังอยู่หลัง reload

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11985 — baseline 14-10-2026 ของ Operation Complication (Edit) = N/T

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-061 - ทดสอบลบข้อมูล Operation Complication (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-061
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Complication" แล้วเตรียมเลือก template "Operation Complication"
4. ต้องมี record Operation Complication ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11986 — baseline 14-10-2026 ของ Operation Complication (Delete) = N/T

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-062 - ตรวจสอบการแสดงฟอร์ม Pre-med in 24h Record เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-062
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Pre-med in 24h" แล้วเตรียมเลือก template "Pre-med in 24h Record"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ฟอร์มแสดงผล (render) ได้ภายใน 5 วินาทีหลังเลือก template จาก dropdown

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11987 — baseline 14-10-2026 ของ Pre-med in 24h Record (Load) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-063 - ทดสอบบันทึกข้อมูล Pre-med in 24h Record สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-063
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Pre-med in 24h" แล้วเตรียมเลือก template "Pre-med in 24h Record"

Test Data
- D-15

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- toast `บันทึก Pre-med in 24h Record สำเร็จ`
- badge `DRAFT` ข้าง dropdown

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11988 — baseline 14-10-2026 ของ Pre-med in 24h Record (Create) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-064 - ทดสอบแก้ไขข้อมูล Pre-med in 24h Record แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-064
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Pre-med in 24h" แล้วเตรียมเลือก template "Pre-med in 24h Record"
4. ต้องมี record Pre-med in 24h Record ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-15 (ต่อท้าย ' edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- toast `บันทึก Pre-med in 24h Record สำเร็จ`
- ค่าที่แก้ยังอยู่หลัง reload

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11989 — baseline 14-10-2026 ของ Pre-med in 24h Record (Edit) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-065 - ทดสอบลบข้อมูล Pre-med in 24h Record (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-065
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Pre-med in 24h" แล้วเตรียมเลือก template "Pre-med in 24h Record"
4. ต้องมี record Pre-med in 24h Record ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11990 — baseline 14-10-2026 ของ Pre-med in 24h Record (Delete) = FAIL, หมายเหตุ: ไม่มีปุ่มลบ

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-066 - ตรวจสอบการแสดงฟอร์ม Anesthesia Record เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-066
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Anesthesia Record" แล้วเตรียมเลือก template "Anesthesia Record"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- แสดง ANESTHESIA RECORD INTRA-OP

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11991 — baseline 14-10-2026 ของ Anesthesia Record (Load) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-067 - ทดสอบบันทึกข้อมูล Anesthesia Record สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-067
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Anesthesia Record" แล้วเตรียมเลือก template "Anesthesia Record"

Test Data
- D-16

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- badge `DRAFT`

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11992 — baseline 14-10-2026 ของ Anesthesia Record (Create) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-068 - ทดสอบแก้ไขข้อมูล Anesthesia Record แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-068
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Anesthesia Record" แล้วเตรียมเลือก template "Anesthesia Record"
4. ต้องมี record Anesthesia Record ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-16 (ต่อท้าย ' edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ค่าที่แก้ยังอยู่หลัง reload ทั้งหน้า
- ไม่มี record ซ้ำเกิดขึ้น

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11993 — baseline 14-10-2026 ของ Anesthesia Record (Edit) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-069 - ทดสอบลบข้อมูล Anesthesia Record (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-069
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Anesthesia Record" แล้วเตรียมเลือก template "Anesthesia Record"
4. ต้องมี record Anesthesia Record ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11994 — baseline 14-10-2026 ของ Anesthesia Record (Delete) = FAIL, หมายเหตุ: ไม่มีปุ่มลบ

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-070 - ตรวจสอบการแสดงฟอร์ม PACU Record เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-070
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "PACU Record" แล้วเตรียมเลือก template "PACU Record"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ระบบเลือก template ให้อัตโนมัติ (ไม่มี dropdown ให้เลือกเอง)

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11995 — baseline 14-10-2026 ของ PACU Record (Load) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-071 - ทดสอบบันทึกข้อมูล PACU Record สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-071
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "PACU Record" แล้วเตรียมเลือก template "PACU Record"

Test Data
- D-17

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- Save เสร็จภายใน 10 วินาที (ปกติใช้เวลาประมาณ 8 วินาที)

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11996 — baseline 14-10-2026 ของ PACU Record (Create) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-072 - ทดสอบแก้ไขข้อมูล PACU Record แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-072
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "PACU Record" แล้วเตรียมเลือก template "PACU Record"
4. ต้องมี record PACU Record ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-17 (ต่อท้าย ' edited')

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ค่าที่แก้ยังอยู่หลัง reload ทั้งหน้า
- ไม่มี record ซ้ำเกิดขึ้น

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11997 — baseline 14-10-2026 ของ PACU Record (Edit) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-073 - ทดสอบลบข้อมูล PACU Record (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-073
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "PACU Record" แล้วเตรียมเลือก template "PACU Record"
4. ต้องมี record PACU Record ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11998 — baseline 14-10-2026 ของ PACU Record (Delete) = FAIL, หมายเหตุ: Save ช้าประมาณ 8 วินาที

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-074 - ตรวจสอบการแสดงฟอร์ม Post Anesthesia Record เมื่อเลือกจาก dropdown

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-074
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Post-anesthesia" แล้วเตรียมเลือก template "Post Anesthesia Record"

Test Data
- -

Test Steps
1. ทำตาม Flow A (Navigation) ข้อ 1-3
2. ทำตาม Flow B (Create) ข้อ 1-3 — เลือก template แล้วรอฟอร์ม render

Expected Result
- ฟอร์มแสดงผล (render) ได้ภายใน 5 วินาทีหลังเลือก template จาก dropdown

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-11999 — baseline 14-10-2026 ของ Post Anesthesia Record (Load) = PASS

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-075 - ทดสอบบันทึกข้อมูล Post Anesthesia Record สำเร็จ (Create)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-075
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Post-anesthesia" แล้วเตรียมเลือก template "Post Anesthesia Record"

Test Data
- D-18

Test Steps
1. ทำตาม Flow A ข้อ 1-3
2. ทำตาม Flow B ข้อ 1-7 ทั้งหมด ด้วย test data ที่ระบุ

Expected Result
- ปุ่ม Save กดได้หลังกรอกข้อมูล
- network: `flat-to-json?templateId=nuh_anesthesia_post_anesthesia_complication_v2`

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-12000 — baseline 14-10-2026 ของ Post Anesthesia Record (Create) = FAIL, หมายเหตุ: ปุ่ม Save disabled; ครั้งแรกกดได้แต่ค้าง ไม่มี request

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-076 - ทดสอบแก้ไขข้อมูล Post Anesthesia Record แล้วบันทึกสำเร็จ (Edit)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-076
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Post-anesthesia" แล้วเตรียมเลือก template "Post Anesthesia Record"
4. ต้องมี record Post Anesthesia Record ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- D-18 (Pain score = 3)

Test Steps
1. ทำตาม Flow C ข้อ 1-3 ทั้งหมด ด้วยค่า Edit ที่ระบุ

Expected Result
- ค่าที่แก้ยังอยู่หลัง reload ทั้งหน้า
- ไม่มี record ซ้ำเกิดขึ้น

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-12001 — baseline 14-10-2026 ของ Post Anesthesia Record (Edit) = N/T

หมายเหตุ
- -
```

#### [Required] TC-CTXN-10711-077 - ทดสอบลบข้อมูล Post Anesthesia Record (Delete)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-077
- Scenario ID: TS-CTXN-10711-HPY
- Case Type: Happy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Post-anesthesia" แล้วเตรียมเลือก template "Post Anesthesia Record"
4. ต้องมี record Post Anesthesia Record ที่สร้างไว้แล้วจาก Test Case Create ของ template เดียวกัน

Test Data
- -

Test Steps
1. ทำตาม Flow D ข้อ 1-3 ทั้งหมด
2. ถ้าไม่เจอปุ่ม/เมนูลบ: ถ้าไม่เจอปุ่มหรือเมนูลบเลย ให้บันทึก Actual Result = FAIL – No delete function

Expected Result
- record หายไปหลัง reload
- dropdown กลับมาให้เลือก template ได้อีก (สำหรับ sub-tab แบบ single)

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-12002 — baseline 14-10-2026 ของ Post Anesthesia Record (Delete) = N/T

หมายเหตุ
- -
```

#### TS-CTXN-10711-UHP - ตรวจสอบ validation เมื่อกรอกข้อมูลไม่ครบตาม required field

```
ข้อมูลอ้างอิง
- Scenario ID: TS-CTXN-10711-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: Operation Room (OR) — Operation Detail & Anesthesia Record Templates
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

วัตถุประสงค์
- ยืนยันว่าฟอร์มบังคับกรอก required field จริง และแสดงข้อความ validation ที่ชัดเจนเมื่อข้อมูลไม่ครบ

ขอบเขต Requirement
- required field ที่ระบุไว้ใน Test Data (เช่น Post-operation procedure code ของ NUH Operative Note)

ความเสี่ยง
- ถ้า validation ไม่ทำงาน อาจมี record ที่ข้อมูลทางคลินิกไม่ครบหลุดเข้าระบบ

หมายเหตุ
- อิงตาม Acceptance Criteria (Scope) ของ requirement
```

##### Test Case ภายใต้ Scenario นี้

#### [Required] TC-CTXN-10711-002 - ตรวจสอบการ validate ฟอร์ม NUH Operative Note เมื่อกด Save โดยไม่กรอก Post-operation procedure code (required)

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-002
- Scenario ID: TS-CTXN-10711-UHP
- Case Type: Unhappy
- Test Level: Integration
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Operative Note" แล้วเตรียมเลือก template "NUH Operative Note"

Test Data
- -

Test Steps
1. ทำตาม Flow A และ Flow B ข้อ 1-3 จนฟอร์ม render
2. กด Save โดยไม่กรอก Post-operation procedure code (required)
3. กด Save

Expected Result
- Save ไม่ผ่าน
- field Code ขอบแดง
- ข้อความ `Invalid input`

Actual Result
- **Passed** (การ์ด: CTXN-10764) — ทดสอบจริงบน OR-69-000218 (14 ต.ค. 2569) กด Save โดยไม่กรอก Post-operation procedure Code แล้ว ช่อง Code ขึ้นขอบแดงจริง และมีข้อความ `Invalid input` ใต้ทั้งช่อง Code และช่อง Text ตรงตาม Expected ทุกจุด

หมายเหตุ
- -
```

#### TS-CTXN-10711-EDG - ตรวจสอบเคสขอบ: หลาย record ปนกัน และ sub-tab ที่ไม่มี template

การ์ด Linear: CTXN-12003

```
ข้อมูลอ้างอิง
- Scenario ID: TS-CTXN-10711-EDG
- Case Type: Edge
- Suffix: EDG
- Module: Operation Room (OR) — Operation Detail & Anesthesia Record Templates
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

วัตถุประสงค์
- ยืนยันว่าระบบไม่ปนข้อมูลเมื่อมีหลาย record ใน Custom Note และตรวจพฤติกรรมของ sub-tab Safety Checklist ฝั่ง Anesthesia Record ที่ไม่มี template ให้เลือก

ขอบเขต Requirement
- Custom Note (multi-select) ที่สร้างได้หลาย record ต่อ operation
- Anesthesia Record > Safety Checklist ที่ไม่มี template

ความเสี่ยง
- ข้อมูลคนละ record ปนกันในฟอร์มทางคลินิกเป็นความเสี่ยงสูงต่อความถูกต้องของเวชระเบียน แม้ความถี่ในการเกิดต่ำ

หมายเหตุ
- อิงตาม Acceptance Criteria (Scope) ของ requirement
```

##### Test Case ภายใต้ Scenario นี้

#### [Optional] TC-CTXN-10711-078 - ตรวจสอบความถูกต้องของข้อมูลเมื่อสร้าง Custom Note หลาย template ต่อเนื่องกันในหน้าเดียว

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-078
- Scenario ID: TS-CTXN-10711-EDG
- Case Type: Edge
- Test Level: Integration
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Operation Detail" > sub-tab "Custom Note"
4. ต้องยังไม่มี record Custom Note อื่นค้างอยู่ในหน้า เพื่อไม่ให้ปนกับ record ที่ทดสอบ

Test Data
- D-08, D-09

Test Steps
1. สร้าง record ECMO Form ด้วยข้อมูล D-08 ตาม Flow B ให้เสร็จสมบูรณ์ (Load → กรอก → Save)
2. สร้าง record NUH Perfusionist Form ด้วยข้อมูล D-09 ต่อในหน้าเดียวกัน ตาม Flow B ให้เสร็จสมบูรณ์
3. Reload ทั้งหน้า แล้วกลับไปที่ sub-tab Custom Note

Expected Result
- ทั้ง 2 record (ECMO Form, NUH Perfusionist Form) แสดงครบในรายการ
- ข้อมูลของแต่ละ record ไม่สลับ/ปนกัน

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-12004 — ยังไม่มี Actual Result จาก baseline 14-10-2026 สำหรับเคสนี้โดยตรง — ต้องทดสอบจริงตอน Gate 2

หมายเหตุ
- -
```

#### [Optional] TC-CTXN-10711-079 - ตรวจสอบพฤติกรรมของ sub-tab Safety Checklist ใน Anesthesia Record เมื่อไม่มี template ให้เลือก

```
ข้อมูลอ้างอิง
- TC ID: TC-CTXN-10711-079
- Scenario ID: TS-CTXN-10711-EDG
- Case Type: Edge
- Test Level: Integration
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: CTXN-10711 - Test Result Operation Detail and Anesthesia Record

Preconditions
1. เปิด URL patient แล้วเปิด tab "Operation Detail" ของ operation ที่จะทดสอบไว้ก่อน (PRE-01)
2. ใช้ operation ที่ยังไม่มีข้อมูลค้าง (PRE-02) — ถ้า sub-tab เลือกได้ฟอร์มเดียวต่อ operation ต้องใช้ 1 operation ต่อ 1 template (PRE-03)
3. เปิด main tab "Anesthesia Record" > sub-tab "Safety Checklist"

Test Data
- -

Test Steps
1. เปิด main tab Anesthesia Record
2. คลิก sub-tab Safety Checklist

Expected Result
- แสดงข้อความ `No active safety checklist form.`
- (ต้องยืนยันกับ BA ว่านี่คือ expected behavior ของระบบ หรือเป็น gap ที่ต้องแก้)

Actual Result
- ยังไม่ทดสอบ (Not Run) — การ์ด: CTXN-12005 — Baseline 14-10-2026: พบข้อความ `No active safety checklist form.` จริง — ยังไม่ฟันธง Pass/Fail จนกว่า BA ยืนยัน

หมายเหตุ
- -
```

---

## Baseline จากรอบสำรวจแอปจริง 14-10-2026 (OR-69-000217)

คัดลอกจากไฟล์ต้นทาง `OR_Template_Test_Cases.md` section 7 ทั้งหมด — ใช้เป็น **regression reference** สำหรับ GATE 2 เท่านั้น ยังไม่ใช่ผลทดสอบที่ยืนยันแล้วตามมาตรฐานโปรเจกต์ (ไม่มีหลักฐานวิดีโอ/ภาพครบตาม `agent-app-testing` ในรอบนั้น) — case ที่ FAIL ควรนำไปทดสอบซ้ำหลัง Dev แก้

| Template | Load | Create | Edit | Delete | หลักฐาน / หมายเหตุ |
|---|---|---|---|---|---|
| NUH Operative Note | PASS | PASS | PASS | FAIL | ไม่มีปุ่มลบ, placeholder แสดงซ้อนกับข้อความ |
| NUH Op Note Cesarean / TAH / TMH | N/T | N/T | N/T | N/T | ถูกล็อกหลังบันทึก NUH Operative Note |
| OR Nurse Note | PASS | PASS | PASS | FAIL | ตาราง Focus list ไม่มีแถวและไม่มีปุ่มเพิ่มแถว |
| Anes Safety Check | PASS | PASS | PASS | FAIL | ไม่มีปุ่มลบ |
| OR Surgical Safety Checklist / Surgical Safety Checklist | N/T | N/T | N/T | N/T | ถูกล็อก |
| ECMO Form | PASS | PASS | FAIL | FAIL | record ที่บันทึกแล้วไม่มีปุ่ม Save, ค่าที่แก้หายหลัง reload |
| NUH Perfusionist Form | PASS | PASS | FAIL | FAIL | ปัญหาเดียวกับ ECMO |
| Procedural Sedation Checklist and Assessment | PASS | PASS | FAIL | FAIL | ปัญหาเดียวกับ ECMO |
| OR Custom Note | FAIL | N/T | N/T | N/T | `GET /cortex-form/or-custom-note-v1.js?v=v2.2.4` → **503** |
| Pre-Procedural Sedation Assessment | PASS | FAIL | N/T | N/T | toast `Custom note save failed` แต่ contribution = 201 (เกิด 2 ครั้ง) จึงน่าจะมีข้อมูลค้าง |
| Sedation Form v2 | PASS | FAIL | N/T | N/T | กด Save แล้วไม่มี request และไม่มีข้อความแจ้ง |
| Operation Complication | PASS | FAIL | N/T | N/T | toast `Save complication failed`, `flat-to-json` → **400** |
| Pre-med in 24h Record | PASS | PASS | PASS | FAIL | ไม่มีปุ่มลบ |
| Anesthesia Record | PASS | PASS | PASS | FAIL | ไม่มีปุ่มลบ |
| PACU Record | PASS | PASS | PASS | FAIL | Save ช้าประมาณ 8 วินาที |
| Post Anesthesia Record | PASS | FAIL | N/T | N/T | ปุ่ม Save disabled; ครั้งแรกกดได้แต่ค้าง ไม่มี request |
| Anesthesia → Safety Checklist | — | — | — | — | `No active safety checklist form.` |

N/T = Not tested

**ข้อมูลทดสอบที่ค้างอยู่ใน OR-69-000217 (ลบไม่ได้):** NUH Operative Note, OR Nurse Note, Anes Safety Check, ECMO Form, NUH Perfusionist Form, Procedural Sedation Checklist, Pre-med in 24h Record, Anesthesia Record และ PACU Record (สถานะ DRAFT ทั้งหมด ข้อความขึ้นต้นด้วย `QA test`)

**Console error ที่พบ:** `NotSupportedError: Failed to execute 'define' on 'CustomElementRegistry': the name "mb-context" has already been used with this registry` เกิดเมื่อโหลดหลาย form ในหน้าเดียวกัน (เช่น nuh-operative-note-general-v1.js, nuh-anesthesia-pacu-record-v4.js, nuh-anesthesia-intraoperative-record-v3.js)

## Agent Notes (เทคนิคสำหรับตอน GATE 2)

คัดลอกจากไฟล์ต้นทาง section 8 — ใช้ตอนไปสำรวจแอปจริงจริง

1. **Dropdown เป็น Ant Design Select** อ่านรายการ option ได้ด้วย JS:
   ```js
   [...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content')].map(x=>x.textContent.trim())
   ```
   เลือกแล้วต้องปิด dropdown ด้วย `Escape` หรือคลิกพื้นที่ว่าง ไม่เช่นนั้น dropdown จะบังปุ่ม Save
2. **ตรวจรายการ record ที่บันทึกแล้วใน sub-tab** (ชื่อ template ตามด้วย DRAFT):
   ```js
   const t=document.body.innerText; t.slice(t.indexOf('Audit\n'), t.indexOf('Audit\n')+300)
   ```
3. **Reload:** ใช้ `location.reload()` (tab Operation Detail ยังอยู่) **ห้าม navigate ไปที่ URL ของ patient ตรง ๆ** เพราะ tab Operation Detail จะหายไป ถ้าหายให้ใช้ browser Back
4. **ตรวจผลการ Save จาก network:** filter `transform-composition` (ต้องเป็น 200) และ `contribution` (ต้องเป็น 201) ส่วน `GET /cortex-api/drafts/...` ที่ได้ 404 ถือเป็นปกติ (หมายถึงไม่มี local draft)
5. ปุ่ม refresh (⟳) ใน header ของ operation **ไม่ได้ reload ข้อมูลฟอร์มจริง** ห้ามใช้เป็นหลักฐานยืนยัน Edit
6. Custom Note: dropdown สำหรับเพิ่ม record ใหม่อยู่ **ท้ายสุดของหน้า** หลัง record ทั้งหมด
7. ห้ามกดปุ่มที่เปลี่ยนสถานะ operation เช่น `Check in`, `ลงเวลาตอนนี้` และเมนู `⋮` ที่มีคำสั่ง cancel เพราะอยู่นอก scope
8. หลังจบแต่ละ test case ให้บันทึก: TC ID, ผล (PASS/FAIL/N/T/Blocked), toast ที่เห็น, status code ของ network, screenshot ถ้า FAIL — **และตาม skill `agent-app-testing`: ต้องมีทั้งวิดีโอและภาพทุก TC พร้อมกรอบสีแดง/เขียวเทียบข้อความที่กรอกกับที่ระบบแสดง**
