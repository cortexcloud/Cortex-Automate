---
name: linear-testcase-writer
description: Generate a QA execution test structure (EXE → Scenario → Test Case) from a Linear requirement issue, using the requirement as the only source of truth and following an exact naming/template/label pattern. Use whenever the user asks to draft, write, or create test cases, test scenarios, or an EXE (execution round) for a Linear issue/requirement/ticket — e.g. "write test cases for TMH-2462", "generate scenario สำหรับการ์ดนี้", "สร้าง EXE ให้ requirement นี้".
---

# Linear Test-Case Writer

สร้างโครงสร้างการทดสอบจาก Linear requirement โดยใช้ requirement เป็น **แหล่งความจริงเดียว** (only source of truth) ห้ามแต่งหรือเดาข้อมูลที่ไม่มีในการ์ด

สร้างเฉพาะลำดับชั้นนี้: Requirement → EXE → Scenario → Test Case (EXE อยู่ใต้ Requirement, Scenario อยู่ใต้ EXE, Test Case อยู่ใต้ Scenario) ห้ามสร้าง item นอกลำดับชั้นนี้

> **หมายเหตุ**: สกิลนี้เคยมีเวอร์ชันขัดกันอยู่ 2 ชุด (ชุดนี้ กับสกิล `linear-execution-test`) ตั้งแต่ 30 ก.ย. 2026 ได้รวมเป็น ruleset เดียวแล้วตามที่เขียนในไฟล์นี้ — ห้ามใช้กฎเก่าของเวอร์ชันก่อนหน้า และห้ามอ้างอิง `linear-execution-test` แทนไฟล์นี้

## ขั้นตอน

1. **อ่าน requirement issue ก่อนเสมอ** — ดึงข้อมูลให้ครบ ไม่ใช่แค่ title/description:
   - title, description, identifier, url
   - project, team, priority, state, labels, assignee
   - Clone context จาก requirement ทุกครั้งที่ทำได้
   - ดึง issue จาก Linear ตามที่โปรเจกต์มี: Linear MCP ถ้าต่ออยู่, ไม่เช่นนั้น `LINEAR_API_KEY` / helper ในโปรเจกต์ (เช่น `src/tools/linear.ts`) — ห้ามเดา field ที่ไม่ได้ดึงมาจริง
2. วิเคราะห์ requirement ตาม **Generation rules**
3. Resolve ค่าตาม **Resolve test attributes**
4. สร้างโครงตาม **Naming rules**, **Body rules**, **Label rules**
5. รัน **Final consistency check** ก่อนส่งคำตอบทุกครั้ง
6. ทำตาม **Creation behavior** — อย่าสร้างอะไรจริงจนกว่าจะได้รับการยืนยันชัดเจน

## กฎทั่วไป (บังคับ)

- ห้ามเปลี่ยน naming pattern
- ห้ามเปลี่ยนลำดับ section
- ห้ามเปลี่ยนชื่อหัวข้อ (section heading)
- ห้ามตัด section ที่ต้องมีออก
- ห้ามเพิ่ม section พิเศษ เว้นแต่ผู้ใช้ขอเอง
- ห้ามใส่ BDD เว้นแต่ผู้ใช้ขอเอง
- ห้ามรวมหลาย check ไว้ใน Test Case เดียว (1 Test Case = 1 พฤติกรรมที่ตรวจ)
- ชื่อ Test Case ต้องเป็น**ภาษาไทยเท่านั้น**
- เนื้อหาต้องกระชับ ใช้งานได้จริง เน้น execution
- **รักษา template เดิมไว้เสมอแม้ข้อมูลจะขาด** — ถ้าข้อมูลไม่มี ให้คงหัวข้อ/ฟิลด์ไว้แล้วใส่ `-` แทน
- ห้าม infer/แต่ง/ขยายความเนื้อหาที่ขาดหายไปเอง
- **ทุก Test Case ต้องมี tag `[Required]` หรือ `[Optional]` เป๊ะ 1 อัน เสมอ** (ไม่ใช่ใส่เฉพาะตอนมีคนขอ)

## Generation rules (วิเคราะห์ requirement)

- สร้างจาก **Acceptance Criteria ก่อนเสมอ** — AC คือ coverage ขั้นต่ำที่ต้องมี
- `[Required]` = พฤติกรรม/ผลลัพธ์ทางธุรกิจที่ user/business ตรวจสอบได้, AC หลัก, business flow สำคัญ, validation ที่บังคับ
- `[Optional]` = coverage เสริม, ความเสี่ยงรอง, รายละเอียดทางเทคนิค, หรือ Unit test coverage — สร้างได้แม้ QA จะไม่รัน เพื่อบันทึก coverage ไว้
- ถ้า AC มีทั้ง business behavior และ technical detail ปนกัน ให้แยกเป็นคนละ Test Case
- 1 Test Case ตรวจ 1 พฤติกรรม/1 การเช็คเท่านั้น
- เพิ่ม coverage นอกเหนือ AC ได้เฉพาะเมื่อมี **risk หรือ coverage gap ที่ชัดเจน** เท่านั้น
- ถ้า behavior มีอยู่ใน AC แต่ยังไม่มีใน UI จริง ก็ยังสร้าง Test Case ได้ตามปกติ
- ห้ามใส่ BDD เว้นแต่ผู้ใช้ขอเอง

ถ้า requirement มีแต่ technical implementation ไม่มี business behavior:
1. แจ้ง QA ว่าการ์ดนี้เป็น technical implementation
2. ลิสต์เฉพาะ business behavior / AC / Expected Result ที่เจอในการ์ดจริง ห้าม infer เพิ่ม
3. ถ้าไม่เจอ business behavior เลย ห้ามสร้าง `[Required]` EXE/Scenario/Test Case และให้ถาม QA หา user flow, expected result, validation, error handling, หรือ permission/role ที่ต้องเทส

รายงาน requirement gap แยกไว้นอกลำดับชั้น จัดกลุ่มตาม: expected behavior, validation, error handling, permission/role, edge cases

### Subject-only rules (การ์ดมีแค่หัวเรื่อง)

- ถ้า requirement **ไม่มี Acceptance Criteria**: ถือว่าผลลัพธ์เป็น **Draft Coverage**
- ถ้ามีแค่หัวเรื่อง (subject) อย่างเดียว:
  - สร้าง scenario ระดับสูงก่อน
  - ห้ามแต่ง business rule ที่ไม่ได้บอกไว้
  - สร้าง Test Case แบบละเอียดเฉพาะ behavior ที่ infer ได้อย่างมั่นใจสูงเท่านั้น
- ถ้ารายละเอียดคลุมเครือเกินไป: คืน template เดิม ใส่ `-` ในเนื้อหาที่ขาด แล้วระบุ gap ของ requirement (จัดกลุ่มเหมือนด้านบน)

## Resolve test attributes

Resolve **Scope / Version** ตามลำดับนี้:
1. Version ที่ระบุตรงๆ ใน requirement
2. ชื่อ Cycle ที่ผูกกับการ์ด (ถ้า requirement ไม่มี version)
3. ชื่อ repository/commit ที่ผูก (ถ้าทั้ง requirement และ Cycle ไม่มี version)
4. Delivery/scope จาก requirement
5. `-`

ห้าม infer ค่าที่ขาดหรือใช้ชื่อ title ของ requirement เป็น Scope/Version เอง

Resolve **Run Type** ตามลำดับนี้:
1. Run Type ที่ user ระบุตรงๆ
2. Test objective ที่ระบุใน requirement
3. Requirement ผูกกับ Cycle → ใช้ `CT`
4. ถาม QA

**Run Type ที่อนุญาตเท่านั้น:** `CT` (Cycle Test), `RT` (Retest), `RG` (Regression Test), `SM` (Smoke Test)

Resolve **Environment** จาก requirement — ถ้าไม่มีให้ถาม QA ก่อนสร้าง แนะนำ `DEV-X` เป็น environment หลักที่ใช้บ่อย แต่ห้ามตั้งเองโดยไม่ให้ QA ยืนยัน

เลือก **Test Level** ต่อ Test Case ตาม AC/Expected Result ที่เกี่ยวข้อง: `Unit`, `Integration`, `System`, `Acceptance`, หรือ `-`

เลือก **Test Type** ต่อ Test Case ตาม AC/Expected Result โดยให้ business flow มาก่อน: `Functional`, `UIUX`, `Security`, `Integration`, `Performance`

เลือก **Priority** ของ Test Case ตามลำดับ: business impact → ความถี่ในการใช้งาน → ความเสี่ยงถ้าปล่อยบั๊กออกไป
**ค่าที่อนุญาต:** `Urgent`, `High`, `Medium`, `Low`

หมายเหตุ: `[Required]`/`[Optional]` คือ **execution priority** ส่วน `Urgent`/`High`/`Medium`/`Low` คือ **Test Case priority** คนละแกนกัน

## Naming rules

รูปแบบชื่อ (title) ที่ต้องใช้เป๊ะ ๆ:

- **EXE**: `EXE - <Run Type> - <Scope/Version>`
- **Scenario**: `TS-<Requirement ID>-<Suffix> - <Scenario Name>`
- **Test Case**: `[Required] TC-<Requirement ID>-<3-digit sequence> - <Test Case Name>` หรือ `[Optional] TC-<Requirement ID>-<3-digit sequence> - <Test Case Name>`
  (ต้องมี tag เสมอ — ดู "กฎทั่วไป")

**Scenario suffix ที่อนุญาตเท่านั้น:** `HPY` (Happy Path), `UHP` (Unhappy Path), `EDG` (Edge Case), `ERR` (Error Case)

ถ้า suffix ขัดกับ Case Type ให้ยึด Case Type เป็นความจริง แล้วแก้ suffix ให้ตรงกัน

Numbering: เรียง Test Case ต่อเนื่องภายใน **แต่ละ EXE** (`001`, `002`, `003`, ...) — เริ่มนับ `001` ใหม่ทุกครั้งที่ขึ้น EXE ใหม่ ไม่นับต่อเนื่องข้าม EXE

### รูปแบบชื่อ Test Case

ใช้ pattern นี้เสมอ: `[คำนำหน้า/กริยา] + [สิ่งที่ต้องการตรวจ] + [เงื่อนไข/กรณีที่ทดสอบ]`
ใช้กริยา QA ที่ชัดเจน เช่น: ตรวจสอบ..., ทดสอบ..., แสดง..., บันทึก..., คำนวณ...

## Field rules

- Clone context จาก requirement ทุกครั้งที่ทำได้
- ใช้ requirement เป็นแหล่งความจริงของ: **module, delivery/scope, version, project**
- ห้ามเดา/แต่งค่า module, delivery/scope, version ที่ไม่มีในการ์ด (ใส่ `-` แทน)
- Assign EXE, Scenario, Test Case ให้ current user โดย default
- ใช้ project เดียวกับ requirement ถ้ามี
- **Default status:**
  - EXE = `Ready for Testing`
  - Scenario = `Ready for Testing`
  - Test Case = `Not Run`
  - Test Case ที่เป็น `[Optional]` technical/Unit ที่ QA จะไม่รัน = `Not Test`
- **EXE/Scenario status ที่อนุญาต:** ToDo, Ready for Testing, Testing, Blocked, Done, Canceled
- **Test Case status ที่อนุญาต:** Not Run, Passed, Failed, Blocked, Not Test
- ถ้าทีมไม่มี status ที่ต้องใช้ ให้ถาม QA ก่อน ใช้ status ใกล้เคียงได้เฉพาะหลัง QA อนุมัติ

## Label rules

ก่อนสร้าง EXE/Scenario/Test Case ต้องถามผู้ใช้ยืนยัน `QA Module` และ `QA Sub-module / Feature` ก่อนเสมอ ห้ามสร้างการ์ดจนกว่าจะยืนยันทั้งสองอย่างแล้ว

ตรวจ Issue label ที่มีอยู่จริงในระบบก่อนเลือกใช้:
- ใช้ `QA Case Type` สำหรับ Happy / Unhappy / Edge / Error
- ใช้ `QA Type` สำหรับ Functional / UIUX / Security / Integration / Performance
- ใช้ `QA Run` เฉพาะบน EXE
- ใช้ `QA Execution Type: Manual` บน Test Case ที่ QA จะรันเอง
- ห้ามใส่ `QA Execution Type: Automation` เว้นแต่ QA ขอให้ทำ automate ชัดเจน
- ห้ามใส่ `QA Execution Type` บน Test Case ที่เป็น `[Optional]` technical/Unit ที่ไม่ได้รัน
- `QA Layer` และ `QA Execution Type` ไม่ใช่ตัวแทนของ Test Level หรือ Test Type

Apply label:
- **EXE**: label ของ requirement + `QA Module`/`QA Sub-module` ที่ยืนยันแล้ว + `QA Run` ที่ตรงกัน
- **Scenario**: label ของ requirement + `QA Module`/`QA Sub-module` + `QA Case Type` ที่ตรงกัน
- **Test Case**: label ของ requirement + `QA Module`/`QA Sub-module` + `QA Case Type` + `QA Type` + `QA Execution Type: Manual` (เมื่อ QA จะรัน)

QA Run mapping: `CT` → `QA Run: Cycle Test` / `RT` → `QA Run: Retest` / `RG` → `QA Run: Regression Test` / `SM` → `QA Run: Smoke Test`

ใช้ label ที่มีอยู่จริงในระบบเท่านั้น ห้ามใช้ legacy label ห้ามแต่ง label QA ที่ยังไม่เคยอนุมัติเอง ถ้าหา label ที่ตรงไม่เจอให้ถาม QA ให้ระบุ สร้าง label ใหม่ทั้ง workspace ได้เฉพาะหลัง QA ยืนยันหรือสั่งให้สร้างชัดเจนเท่านั้น

## Body rules

ใช้ template ด้านล่างตรงตัว ห้ามเปลี่ยนชื่อหรือลำดับหัวข้อ ถ้าไม่มีข้อมูลให้คง section ไว้แล้วใส่ `-` ในฟิลด์/bullet/ข้อที่ขาด ห้ามตัด section ทิ้ง

### EXE body template

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: <Run Type>
- Scope / Version: <Scope/Version>
- Module: <Module or ->
- Requirement ที่อ้างอิง: <Requirement identifier/title>
- Environment: <Environment or ->
- อนุมัติโดย: <email ของคนที่กด approve ผ่าน Dashboard, "-" ถ้าไม่มี (เช่นรันผ่าน CLI)>

ขอบเขตการทดสอบ
- <scope item 1>
- <scope item 2>

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

### Scenario body template

```
ข้อมูลอ้างอิง
- Scenario ID: <Scenario ID>          (plain text เท่านั้น)
- Case Type: <Happy/Unhappy/Edge/Error>
- Suffix: <HPY/UHP/EDG/ERR>
- Module: <Module or ->
- Requirement ที่อ้างอิง: <Requirement identifier/title>

วัตถุประสงค์
- <objective>

ขอบเขต Requirement
- <requirement scope item 1>
- <requirement scope item 2>

ความเสี่ยง
- <risk item>

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### Test Case body template

```
ข้อมูลอ้างอิง
- TC ID: <TC ID>                      (plain text เท่านั้น)
- Scenario ID: <Scenario ID>          (plain text เท่านั้น)
- Case Type: <Happy/Unhappy/Edge/Error>
- Test Level: <Unit/Integration/System/Acceptance or ->
- Test Type: <Functional/UIUX/Security/Integration/Performance>
- Priority: <Urgent/High/Medium/Low>
- Requirement ที่อ้างอิง: <Requirement identifier/title>

Preconditions
1. <precondition 1>
2. <precondition 2>

Test Data
- <test data item>

Test Steps
1. <step 1>
2. <step 2>

Expected Result
- <expected result 1>

Actual Result
- <TC ที่ผลมาจากการรัน automate: Node 6 (Result Reporter) จะอัปเดตช่องนี้ให้อัตโนมัติทุกครั้งหลังรัน Playwright จริง
  (ดู log เต็มได้ที่คอมเมนต์ของการ์ด) — ปล่อย "-" ไว้ก่อนถ้ายังไม่เคยรัน
  TC ที่เป็น manual test: ปล่อยว่าง "-" จนกว่า QA จะกรอกผลจริงเอง>

หมายเหตุ
- <note>
```

Use plain text only for TC ID and Scenario ID.

## Final consistency check (เช็คก่อนตอบทุกครั้ง)

- titles ตรงรูปแบบที่กำหนดเป๊ะ
- ทุก Test Case มี tag `[Required]` หรือ `[Optional]` เป๊ะ 1 อัน
- version สอดคล้องกันทั้ง title, body, labels
- Scenario ID และ TC ID เป็น plain text
- Test Level / Test Type / Case Type และ label ตรงกับ Test Case จริง
- Priority ใน body ใช้ได้แค่ Urgent / High / Medium / Low
- Test Case sequence ต่อเนื่องภายในแต่ละ EXE และเริ่มนับ `001` ใหม่ทุก EXE
- ทุก business Acceptance Criteria มี Test Case อย่างน้อย 1 ตัว
- ไม่มี section ไหนหายไปหรือเกินที่ไม่ได้ขอ
- ไม่มี Test Case ที่ตรวจหลายพฤติกรรมในอันเดียว
- Test Case แบบ Optional technical/Unit ที่ไม่ได้รัน ต้องเป็นสถานะ `Not Test` และไม่มี label `QA Execution Type`

ถ้าเจอจุดไม่ตรง ให้แก้ก่อนส่งคำตอบ

## Creation behavior

- ถ้าผู้ใช้ขอแค่ **draft**: คืนเฉพาะโครงสร้าง EXE/Scenario/Test Case ที่เสนอ ไม่สร้างอะไรจริง
- ถ้าขอให้ **สร้างจริง**:
  1. เสนอโครงสร้างที่เตรียมไว้ก่อน (ถ้าไม่ใช่เคสง่าย ๆ)
  2. แก้ไขตามที่ขอถ้ามี
  3. สร้างจริงเฉพาะเมื่อได้รับการยืนยันชัดเจนแล้วเท่านั้น
- ให้โครงสร้างกระชับและใช้งานได้จริงเสมอ

## Skill update log

หลังแก้สกิลนี้สำเร็จทุกครั้ง เพิ่ม entry ใหม่ไว้บนสุดของ log นี้ รูปแบบ `YYYY-MM-DD` — สรุปสั้นๆ ว่าแก้กฎ/ขั้นตอนไหน แล้วแจ้งผู้ใช้ด้วยวันที่ + สรุปที่แก้ ห้ามบอกว่าอัปเดตแล้วถ้ายังไม่ได้ save จริง

`2026-09-30` — รวม ruleset กับสกิล `linear-execution-test` ที่เคยขัดกัน: บังคับ tag `[Required]`/`[Optional]` ทุก TC เสมอ, Test Level เลือกตาม TC จริงแทนที่จะตายตัวที่ System, Priority เพิ่มเป็น 4 ระดับ (มี Urgent), เปลี่ยนชุด label เป็น `QA Case Type`/`QA Type`/`QA Run`/`QA Execution Type` พร้อมบังคับยืนยัน QA Module/Sub-module ก่อนสร้าง, รับ Scope/Version resolution order และ Environment resolution มาใช้, เพิ่ม section นี้ (Skill update log) — คงไว้ field "อนุมัติโดย" ใน EXE และโน้ต auto-fill ของ Actual Result (ผูกกับ Node 6 Result Reporter) จากเวอร์ชันเดิมของโปรเจกต์นี้ · ไฟล์นี้ต้องเหมือนกันทุกตัวอักษรกับ `~/.claude/skills/linear-testcase-writer/SKILL.md` (global) — แก้ที่หนึ่ง ต้องแก้อีกที่ให้ตรงกันด้วยเสมอ
