# Draft Test Structure — SBH-2371

> สถานะ: **สร้างใน Linear แล้ว (2026-10-29)** — ผู้ใช้สั่ง "สร้างเลย"
> - EXE SBH-3193 (EXE - CT - 2.9.0) → HPY SBH-3194 (TC 001–005 = SBH-3196 · 3197 · 3198 · 3199 · 3200) · UHP SBH-3195 (TC 006–007 = SBH-3201 · 3202)
> - สถานะ TC Not Run · 001–004 High · 005–007 Medium · ผู้รับผิดชอบ Suchat · ช่อง "สร้างโดย" = Neranchara (บัญชี Linear MCP)
> - label ใหม่ที่สร้าง: QA Sub-module / Feature : Registration (workspace)
> - ยืนยันแล้ว (29 ต.ค.): Run Type CT · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Registration · AC ข้อ 2 ใส่ TC ไว้
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ผู้รับผิดชอบ = Suchat (ใส่ ID เอง) · ช่อง "สร้างโดย" จะเป็น Neranchara (บัญชีของ Linear MCP)

Requirement: SBH-2371 — [ER][Registration] - เพิ่ม Field: คำนำหน้าชื่อ + แนบ รูป Profile จากบัตร ประชาชน
URL: https://linear.app/cortexcloud/issue/SBH-2371
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: Medium · State: Ready for Testing
Labels: 🐞 BUG, VERSION 2.9.0, Natthaphat ( MOD ) 🙈 · Assignee: Suchat · ไม่ผูก Cycle
Related: SBH-1837 (อ่านบัตรประชาชนไม่ได้) · SBH-2361 (รูปจากบัตรเป็นตัวอย่างเท่านั้น — Done on dev-x)
Sub-Issue: ยังไม่มี EXE / TC
PR ที่แนบ: cortex-ui #2348 "[V2.9.0][BUG][SBH-2371] show ER title field on every new-patient registration"
Scope / Version = 2.9.0 (label VERSION 2.9.0 ของการ์ด)

คอมเมนต์ Dev (jetsadaporn, 14 ต.ค.)
- AC ข้อ 1: ทำแล้ว — ช่องคำนำหน้าชื่อแสดงทุกครั้งและเป็นช่องบังคับ ทั้งหน้าผู้ป่วยใหม่ และหน้าผู้ป่วยใหม่ (ผู้ป่วยหลายคน) · เดิมแสดงเฉพาะตอนมีข้อมูลจาก MOPH refer in / อ่านบัตรประชาชน
- AC ข้อ 2: **ไม่ได้ทำ** — ขัดกับ SBH-2361 ที่ให้รูปจากบัตรเป็นตัวอย่าง (preview-only) ไม่ส่งเป็นรูป Profile · ต้องตกลงร่วมกับ SBH-2361 ก่อน

| AC ในการ์ด | TC |
|---|---|
| 1. เพิ่มช่องคำนำหน้าชื่อ — หน้าผู้ป่วยใหม่ | 001 · 002 · 006 |
| 1. เพิ่มช่องคำนำหน้าชื่อ — หน้าผู้ป่วยใหม่ (ผู้ป่วยหลายคน) | 003 · 004 · 007 |
| 2. ลงทะเบียนจากการเสียบบัตรประชาชน → แนบรูปจากบัตรที่ Profile ผู้ป่วย | 005 (คาดว่าผล Failed / Blocked จนกว่าจะตกลงกับ SBH-2361) |

ที่มาของ TC แบบช่องบังคับ (006 · 007): ภาพในการ์ดมีดอกจัน `* คำนำหน้าชื่อ` + คอมเมนต์ Dev ว่าเป็นช่องบังคับ ·
ข้อความแจ้งเตือน "กรุณาเลือกคำนำหน้าชื่อ" มาจากหน้าจอ dev-x ที่เห็นแล้ว 28 ต.ค. 2026 (ไม่ได้อยู่ในการ์ด)

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: 🐞 BUG, VERSION 2.9.0, Natthaphat ( MOD ) 🙈, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Registration (ใหม่), QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: ER / Registration
- Requirement ที่อ้างอิง: SBH-2371 — [ER][Registration] - เพิ่ม Field: คำนำหน้าชื่อ + แนบ รูป Profile จากบัตร ประชาชน
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ช่อง "คำนำหน้าชื่อ" (ช่องบังคับ) ในหน้าผู้ป่วยใหม่ ทั้งแท็บผู้ป่วยรายเดียว และผู้ป่วยหลายคน — แสดง · บันทึก · แจ้งเตือนเมื่อไม่เลือก
- ลงทะเบียนผู้ป่วยจากการอ่านบัตรประชาชน แล้วรูปจากบัตรไปอยู่ที่ Profile ผู้ป่วย

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2371-HPY - ลงทะเบียนผู้ป่วยใหม่ที่ ER พร้อมคำนำหน้าชื่อ และรูป Profile จากบัตรประชาชน

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Registration + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2371-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Registration
- Requirement ที่อ้างอิง: SBH-2371 — [ER][Registration] - เพิ่ม Field: คำนำหน้าชื่อ + แนบ รูป Profile จากบัตร ประชาชน

วัตถุประสงค์
- ยืนยันว่าการลงทะเบียนผู้ป่วยใหม่ที่ ER มีช่องคำนำหน้าชื่อให้เลือกทุกครั้งและบันทึกค่าที่เลือกได้ ทั้งแท็บผู้ป่วยรายเดียวและผู้ป่วยหลายคน
- ยืนยันว่าลงทะเบียนจากการอ่านบัตรประชาชนแล้ว รูปจากบัตรถูกแนบเป็นรูป Profile ผู้ป่วย

ขอบเขต Requirement
- AC1: เพิ่มช่องคำนำหน้าชื่อ — หน้าผู้ป่วยใหม่
- AC1: เพิ่มช่องคำนำหน้าชื่อ — หน้าผู้ป่วยใหม่ (ผู้ป่วยหลายคน)
- AC2: ลงทะเบียนจากการเสียบบัตรประชาชน → แนบรูปจากบัตรที่ Profile ผู้ป่วย

ความเสี่ยง
- ผู้ป่วยใหม่ที่กรอกข้อมูลเอง (ไม่มีบัตร / ไม่มี MOPH refer in) ไม่มีคำนำหน้าชื่อ ทำให้ชื่อบนเอกสารและป้ายชื่อไม่ครบ
- ผู้ป่วยอุบัติเหตุหมู่ลงทะเบียนโดยไม่มีคำนำหน้าชื่อ
- ไม่มีรูป Profile ช่วยยืนยันตัวตนผู้ป่วยที่ลงทะเบียนจากบัตร

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- AC2 Dev แจ้งว่าไม่ได้ทำ (ขัดกับ SBH-2361) — TC-005 คาดว่าผลจะไม่ตรง Expected จนกว่าจะตกลงกัน
```

### TC-SBH-2371-001 - ตรวจสอบช่องคำนำหน้าชื่อแสดงเป็นช่องบังคับในหน้าผู้ป่วยใหม่ (ผู้ป่วยรายเดียว) เมื่อกรอกข้อมูลเอง

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Registration + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2371-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบ > ห้องฉุกเฉิน > กด คัดกรอง
2. แท็บ ผู้ป่วยรายเดียว > เลือก ผู้ป่วยใหม่ (ไม่กด อ่านบัตรประชาชน)
3. ดูช่องในส่วน 1. ข้อมูลผู้ป่วย

## Expected Result
แสดงช่อง "คำนำหน้าชื่อ" มีดอกจัน (*) เป็นช่องบังคับ และเปิดเลือกคำนำหน้าได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2371-002 - บันทึกคำนำหน้าชื่อที่เลือกเมื่อลงทะเบียนผู้ป่วยใหม่ (ผู้ป่วยรายเดียว)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2371-002
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบ > ห้องฉุกเฉิน > กด คัดกรอง > แท็บ ผู้ป่วยรายเดียว > เลือก ผู้ป่วยใหม่
2. เลือกคำนำหน้าชื่อ "นาง" > กรอกเลขบัตรประชาชน · ชื่อ · นามสกุล · เพศ หญิง · วันเกิด (อายุ 20 ปีขึ้นไป)
3. กด ลงทะเบียนผู้ป่วย
4. ค้นหาผู้ป่วยด้วย HN ที่ได้ ในช่อง ค้นหาผู้ป่วยด้วย HN หรือชื่อ

## Expected Result
ลงทะเบียนสำเร็จได้ HN และชื่อผู้ป่วยแสดงคำนำหน้า "นาง" ตามที่เลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2371-003 - ตรวจสอบช่องคำนำหน้าชื่อแสดงเป็นช่องบังคับในหน้าผู้ป่วยใหม่ (ผู้ป่วยหลายคน)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2371-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบ > ห้องฉุกเฉิน > กด คัดกรอง > แท็บ ผู้ป่วยหลายคน
2. กด สร้างเหตุการณ์ > กรอกชื่อเหตุการณ์ · สถานที่ · อาการสำคัญร่วม > บันทึก
3. กด + ผู้ป่วยใหม่
4. ดูช่องในฟอร์มลงทะเบียนผู้ป่วย

## Expected Result
แสดงช่อง "คำนำหน้าชื่อ" มีดอกจัน (*) เป็นช่องบังคับ และเปิดเลือกคำนำหน้าได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2371-004 - บันทึกคำนำหน้าชื่อที่เลือกเมื่อลงทะเบียนผู้ป่วยใหม่ (ผู้ป่วยหลายคน)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2371-004
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้เหตุการณ์จาก `TC-SBH-2371-003` > กด + ผู้ป่วยใหม่
2. เลือกคำนำหน้าชื่อ "นาง" > กรอกเลขบัตรประชาชน · ชื่อ · นามสกุล · เพศ หญิง · วันเกิด (อายุ 20 ปีขึ้นไป)
3. กด ลงทะเบียนผู้ป่วย
4. ดูชื่อผู้ป่วยในรายการของเหตุการณ์ > ค้นหาผู้ป่วยด้วย HN ที่ได้

## Expected Result
ลงทะเบียนสำเร็จได้ HN และชื่อผู้ป่วยแสดงคำนำหน้า "นาง" ตามที่เลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2371-005 - แนบรูปจากบัตรประชาชนเป็นรูป Profile ผู้ป่วยเมื่อลงทะเบียนด้วยการอ่านบัตร

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2371-005
Case Type: Happy
Test Type: Functional

## Test Step
1. เตรียมเครื่องอ่านบัตรประชาชนต่อกับเครื่อง + บัตรประชาชนของผู้ที่ยังไม่มี HN ในระบบ
2. Login ระบบ > ห้องฉุกเฉิน > กด คัดกรอง > แท็บ ผู้ป่วยรายเดียว > เลือก ผู้ป่วยใหม่
3. เสียบบัตร > กด อ่านบัตรประชาชน > ตรวจว่ามีรูปจากบัตรในส่วน รูปโปรไฟล์ผู้ป่วย
4. กด ลงทะเบียนผู้ป่วย
5. เปิดหน้าข้อมูลผู้ป่วย (Profile) ของ HN ที่ได้

## Expected Result
หน้า Profile ผู้ป่วยแสดงรูปจากบัตรประชาชนเป็นรูป Profile

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2371-UHP - ลงทะเบียนผู้ป่วยใหม่ที่ ER โดยไม่เลือกคำนำหน้าชื่อ

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Registration + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2371-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER / Registration
- Requirement ที่อ้างอิง: SBH-2371 — [ER][Registration] - เพิ่ม Field: คำนำหน้าชื่อ + แนบ รูป Profile จากบัตร ประชาชน

วัตถุประสงค์
- ยืนยันว่าระบบไม่ให้ลงทะเบียนผู้ป่วยใหม่ถ้ายังไม่เลือกคำนำหน้าชื่อ ทั้งแท็บผู้ป่วยรายเดียวและผู้ป่วยหลายคน

ขอบเขต Requirement
- AC1: ช่องคำนำหน้าชื่อเป็นช่องบังคับ (ดอกจันในภาพของการ์ด) — หน้าผู้ป่วยใหม่
- AC1: ช่องคำนำหน้าชื่อเป็นช่องบังคับ — หน้าผู้ป่วยใหม่ (ผู้ป่วยหลายคน)

ความเสี่ยง
- ลงทะเบียนผู้ป่วยได้โดยไม่มีคำนำหน้าชื่อ ข้อมูลผู้ป่วยไม่ครบ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ข้อความแจ้งเตือนอ้างจากหน้าจอ dev-x (28 ต.ค. 2026)
```

### TC-SBH-2371-006 - ตรวจสอบแจ้งเตือนและไม่ลงทะเบียนเมื่อไม่เลือกคำนำหน้าชื่อ (ผู้ป่วยรายเดียว)

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Registration + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2371-006
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบ > ห้องฉุกเฉิน > กด คัดกรอง > แท็บ ผู้ป่วยรายเดียว > เลือก ผู้ป่วยใหม่
2. กรอกเลขบัตรประชาชน · ชื่อ · นามสกุล · เพศ · วันเกิด ครบ โดยไม่เลือกคำนำหน้าชื่อ
3. กด ลงทะเบียนผู้ป่วย

## Expected Result
ช่องคำนำหน้าชื่อขึ้นข้อความแดง "กรุณาเลือกคำนำหน้าชื่อ" และระบบไม่ลงทะเบียนผู้ป่วย (ไม่ได้ HN)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2371-007 - ตรวจสอบแจ้งเตือนและไม่ลงทะเบียนเมื่อไม่เลือกคำนำหน้าชื่อ (ผู้ป่วยหลายคน)

Status: Not Run · Priority: Medium · Labels: เหมือน TC-006

```
TC ID: TC-SBH-2371-007
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบ > ห้องฉุกเฉิน > กด คัดกรอง > แท็บ ผู้ป่วยหลายคน > สร้างเหตุการณ์ (หรือใช้เหตุการณ์จาก `TC-SBH-2371-003`)
2. กด + ผู้ป่วยใหม่ > กรอกเลขบัตรประชาชน · ชื่อ · นามสกุล · เพศ · วันเกิด ครบ โดยไม่เลือกคำนำหน้าชื่อ
3. กด ลงทะเบียนผู้ป่วย

## Expected Result
ช่องคำนำหน้าชื่อขึ้นข้อความแดง "กรุณาเลือกคำนำหน้าชื่อ" และระบบไม่ลงทะเบียนผู้ป่วย (ไม่ได้ HN)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- AC2 ขัดกับ SBH-2361 (รูปจากบัตรเป็นตัวอย่างเท่านั้น) — ต้องให้ BA ตัดสินว่าจะยึดข้อไหน · ตอนนี้ Dev ไม่ได้ทำ AC2
- การ์ดไม่ได้ระบุว่าคำนำหน้าชื่อต้องเติมให้อัตโนมัติจากข้อมูลบัตร / MOPH refer in หรือไม่ (เดิมช่องแสดงเฉพาะกรณีนี้) — ไม่ได้ทำ TC
- การ์ดไม่ได้ระบุรายการตัวเลือกคำนำหน้าชื่อ (เช่น ด.ช. / ด.ญ. / นาย / นาง / นางสาว / ยศ) หรือความสัมพันธ์กับเพศ / อายุ

Validation
- การ์ดไม่ได้เขียนข้อความแจ้งเตือนเมื่อไม่เลือก — TC-006 / 007 ใช้ข้อความที่เห็นบน dev-x

Edge cases
- ผู้ป่วยระบุตัวตนไม่ได้ (ไม่ใช่ "ผู้ป่วยใหม่") ต้องมีช่องคำนำหน้าชื่อด้วยหรือไม่ — การ์ดไม่ระบุ

Test data
- TC-005 ต้องใช้เครื่องอ่านบัตรจริง + บัตรประชาชนจริงของผู้ที่ยังไม่มี HN → รัน Playwright อัตโนมัติไม่ได้ ต้องเทสมือ
