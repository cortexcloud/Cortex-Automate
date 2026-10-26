# Draft Test Structure — SBH-2436

> สถานะ: **สร้างใน Linear แล้ว (2026-10-14)** — Run Type = RT · QA Sub-module / Feature : Triage Form
> - ชุดที่ใช้งาน (Env: Dev-X / SBH Prod ในการ์ดเดียว): EXE SBH-2535 → HPY SBH-2537 (TC SBH-2543–2548) · EDG SBH-2538 (SBH-2549–2550) · ERR SBH-2539 (SBH-2551)
> - Body ของ TC ในการ์ดจริงเปลี่ยนเป็นรูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยกต่อ env) — body ด้านล่างเป็นร่างเดิม
> - ชุด SBH Prod เดิม (SBH-2536, 2540–2542, 2552–2560) ซ้ำซ้อน ผู้ใช้ลบแล้ว (2026-10-14)

Requirement: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ
URL: https://linear.app/cortexcloud/issue/SBH-2436
Project: [SBH] ER · Team: SBH Project · Priority: Urgent · State: Ready for Testing
Labels: 🐞 BUG, Natthaphat ( MOD ) 🙈, 🐷 VERSION 2.8.1 · Assignee: Suchat Chancherngsilapakul

---

## EXE - `<Run Type>` - 2.8.1

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul
Labels: 🐞 BUG, Natthaphat ( MOD ) 🙈, 🐷 VERSION 2.8.1, QA Module : ER, `<QA Sub-module>`, `<QA Run : ...>`

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: <Run Type>
- Scope / Version: 2.8.1
- Module: ER
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ
- Environment: <Environment>
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- แจ้งเตือนบันทึกสำเร็จหลังบันทึกคัดกรอง ER บนหน้า Overview (AC1)
- หัวข้อ "คัดกรอง ER" และปุ่มบันทึกแสดงแบบ fixed เมื่อเลื่อนหน้าจอลง (AC2)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2436-HPY - บันทึกคัดกรอง ER บนหน้า Overview และการแสดงหัวข้อ/ปุ่มบันทึกแบบ fixed

Status: Ready for Testing · Labels: requirement labels + QA Module : ER + `<QA Sub-module>` + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2436-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

วัตถุประสงค์
- ยืนยันว่าบันทึกคัดกรอง ER บนหน้า Overview แล้วมีแจ้งเตือนบันทึกสำเร็จ และหัวข้อ/ปุ่มบันทึกค้างอยู่เมื่อเลื่อนหน้าจอ เหมือน Physician Note

ขอบเขต Requirement
- AC1: บันทึกคัดกรองแล้วต้องแจ้งเตือนกรอกข้อมูลสำเร็จ เหมือน Physician Note บนหน้า Overview
- AC2: fixed หัวข้อ "คัดกรอง ER" และปุ่มบันทึก เวลาเลื่อนหน้าจอลง เหมือน Physician Note

ความเสี่ยง
- ผู้ใช้ไม่รู้ว่าบันทึกสำเร็จหรือไม่ ทำให้กดบันทึกซ้ำหรือคิดว่าข้อมูลหาย
- ต้องเลื่อนกลับขึ้นไปหาปุ่มบันทึก ทำให้คัดกรองช้าในห้องฉุกเฉิน

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### [Required] TC-SBH-2436-001 - แสดงแจ้งเตือนบันทึกสำเร็จ เมื่อกดบันทึกคัดกรอง ER บนหน้า Overview

Status: Not Run · Labels: requirement labels + QA Module : ER + `<QA Sub-module>` + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2436-001
- Scenario ID: TS-SBH-2436-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์บันทึกคัดกรอง ER
2. มีผู้ป่วย ER ที่เปิดหน้า Overview ได้

Test Data
- ผู้ป่วย ER 1 ราย
- ข้อมูลคัดกรองที่กรอกครบตามแบบฟอร์ม

Test Steps
1. เปิดหน้า Overview ของผู้ป่วย ER
2. กรอกข้อมูลในแบบฟอร์มคัดกรอง ER
3. กดปุ่มบันทึก โดยไม่เลื่อนหน้าจอ

Expected Result
- ระบบแสดงแจ้งเตือนว่าบันทึกข้อมูลสำเร็จ

Actual Result
- -

หมายเหตุ
- AC1
```

### [Required] TC-SBH-2436-002 - แสดงแจ้งเตือนบันทึกสำเร็จ เมื่อเลื่อนหน้าจอลงแล้วกดบันทึกคัดกรอง ER

Status: Not Run · Labels: เหมือน TC-001 (QA Case : Happy, QA Type : Functional, QA Execution Type: Manual)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2436-002
- Scenario ID: TS-SBH-2436-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์บันทึกคัดกรอง ER
2. มีผู้ป่วย ER ที่เปิดหน้า Overview ได้

Test Data
- ผู้ป่วย ER 1 ราย
- ข้อมูลคัดกรองที่กรอกครบตามแบบฟอร์ม

Test Steps
1. เปิดหน้า Overview ของผู้ป่วย ER
2. กรอกข้อมูลในแบบฟอร์มคัดกรอง ER
3. เลื่อนหน้าจอลงไปด้านล่างสุดของแบบฟอร์ม
4. กดปุ่มบันทึก

Expected Result
- ระบบแสดงแจ้งเตือนว่าบันทึกข้อมูลสำเร็จ

Actual Result
- -

หมายเหตุ
- AC1 — เป็นเงื่อนไขที่รายงานบั๊กไว้ในหัวข้อการ์ด ("เมื่อเลื่อน...แล้วไม่มีแจ้งเตือน")
```

### [Required] TC-SBH-2436-003 - ตรวจสอบรูปแบบแจ้งเตือนบันทึกสำเร็จของคัดกรอง ER ให้เหมือนกับ Physician Note

Status: Not Run · Labels: QA Case : Happy + QA Type : UIUX + QA Execution Type: Manual (+ requirement/module labels)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2436-003
- Scenario ID: TS-SBH-2436-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์บันทึกคัดกรอง ER และ Physician Note
2. มีผู้ป่วย ER ที่เปิดหน้า Overview ได้

Test Data
- ผู้ป่วย ER 1 ราย

Test Steps
1. บันทึก Physician Note บนหน้า Overview แล้วสังเกตแจ้งเตือนที่แสดง
2. บันทึกคัดกรอง ER บนหน้า Overview แล้วสังเกตแจ้งเตือนที่แสดง
3. เปรียบเทียบแจ้งเตือนทั้งสอง

Expected Result
- แจ้งเตือนของคัดกรอง ER มีรูปแบบเหมือนแจ้งเตือนของ Physician Note

Actual Result
- -

หมายเหตุ
- AC1 ("เหมือน physician note") — การ์ดไม่ระบุข้อความ/ตำแหน่ง/ระยะเวลาแสดง จึงใช้ Physician Note บน environment เดียวกันเป็นตัวเทียบ
```

### [Required] TC-SBH-2436-004 - ตรวจสอบหัวข้อ "คัดกรอง ER" แสดงค้างด้านบน เมื่อเลื่อนหน้าจอลงด้านล่าง

Status: Not Run · Labels: QA Case : Happy + QA Type : UIUX + QA Execution Type: Manual (+ requirement/module labels)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2436-004
- Scenario ID: TS-SBH-2436-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: High
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์บันทึกคัดกรอง ER
2. มีผู้ป่วย ER ที่เปิดหน้า Overview ได้ และแบบฟอร์มคัดกรองยาวเกินหน้าจอ

Test Data
- ผู้ป่วย ER 1 ราย

Test Steps
1. เปิดหน้า Overview ของผู้ป่วย ER
2. เลื่อนหน้าจอแบบฟอร์มคัดกรอง ER ลงไปด้านล่าง

Expected Result
- หัวข้อ "คัดกรอง ER" ยังแสดงค้างอยู่ด้านบน ไม่เลื่อนหายไปตามหน้าจอ

Actual Result
- -

หมายเหตุ
- AC2
```

### [Required] TC-SBH-2436-005 - ตรวจสอบปุ่มบันทึกแสดงค้างอยู่ เมื่อเลื่อนหน้าจอลงด้านล่าง

Status: Not Run · Labels: QA Case : Happy + QA Type : UIUX + QA Execution Type: Manual (+ requirement/module labels)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2436-005
- Scenario ID: TS-SBH-2436-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: High
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์บันทึกคัดกรอง ER
2. มีผู้ป่วย ER ที่เปิดหน้า Overview ได้ และแบบฟอร์มคัดกรองยาวเกินหน้าจอ

Test Data
- ผู้ป่วย ER 1 ราย

Test Steps
1. เปิดหน้า Overview ของผู้ป่วย ER
2. เลื่อนหน้าจอแบบฟอร์มคัดกรอง ER ลงไปด้านล่าง

Expected Result
- ปุ่มบันทึกยังแสดงค้างอยู่และกดได้ทันที โดยไม่ต้องเลื่อนกลับขึ้นไป

Actual Result
- -

หมายเหตุ
- AC2
```

### [Required] TC-SBH-2436-006 - ตรวจสอบตำแหน่งหัวข้อและปุ่มบันทึกแบบ fixed ของคัดกรอง ER ให้เหมือนกับ Physician Note

Status: Not Run · Labels: QA Case : Happy + QA Type : UIUX + QA Execution Type: Manual (+ requirement/module labels)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2436-006
- Scenario ID: TS-SBH-2436-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์บันทึกคัดกรอง ER และ Physician Note
2. มีผู้ป่วย ER ที่เปิดหน้า Overview ได้

Test Data
- ผู้ป่วย ER 1 ราย

Test Steps
1. เปิด Physician Note บนหน้า Overview แล้วเลื่อนหน้าจอลง สังเกตตำแหน่งหัวข้อและปุ่มบันทึก
2. เปิดคัดกรอง ER บนหน้า Overview แล้วเลื่อนหน้าจอลง สังเกตตำแหน่งหัวข้อและปุ่มบันทึก
3. เปรียบเทียบทั้งสอง

Expected Result
- ตำแหน่งหัวข้อและปุ่มบันทึกแบบ fixed ของคัดกรอง ER เหมือนกับ Physician Note

Actual Result
- -

หมายเหตุ
- AC2 ("เหมือน Physician Note")
```

---

## TS-SBH-2436-EDG - การบันทึกซ้ำและการเลื่อนหน้าจอกลับขึ้นของแบบฟอร์มคัดกรอง ER

Status: Ready for Testing · Labels: requirement labels + QA Module : ER + `<QA Sub-module>` + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2436-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

วัตถุประสงค์
- ตรวจพฤติกรรมขอบของปุ่มบันทึกแบบ fixed ที่กดได้ตลอดเวลา และการแสดงผลเมื่อเลื่อนกลับขึ้น

ขอบเขต Requirement
- AC1: แจ้งเตือนบันทึกสำเร็จ
- AC2: หัวข้อและปุ่มบันทึกแบบ fixed

ความเสี่ยง
- ปุ่มบันทึกที่ค้างอยู่ตลอดทำให้กดซ้ำง่ายขึ้น อาจเกิดข้อมูลคัดกรองซ้ำ (coverage นอก AC)
- หัวข้อ/ปุ่มแบบ fixed อาจซ้อนทับเนื้อหาเมื่อเลื่อนกลับขึ้นบนสุด (coverage นอก AC)

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### [Optional] TC-SBH-2436-007 - ตรวจสอบการกดปุ่มบันทึกคัดกรอง ER ซ้ำติดกันหลายครั้ง

Status: Not Run · Labels: QA Case : Edge + QA Type : Functional + QA Execution Type: Manual (+ requirement/module labels)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2436-007
- Scenario ID: TS-SBH-2436-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์บันทึกคัดกรอง ER
2. มีผู้ป่วย ER ที่เปิดหน้า Overview ได้

Test Data
- ผู้ป่วย ER 1 ราย
- ข้อมูลคัดกรองที่กรอกครบตามแบบฟอร์ม

Test Steps
1. เปิดหน้า Overview ของผู้ป่วย ER แล้วกรอกแบบฟอร์มคัดกรอง ER
2. เลื่อนหน้าจอลง แล้วกดปุ่มบันทึกที่ fixed อยู่ติดกันอย่างรวดเร็ว 2–3 ครั้ง
3. ตรวจสอบประวัติ/รายการคัดกรองของผู้ป่วย

Expected Result
- ไม่เกิดข้อมูลคัดกรองซ้ำซ้อนจากการกดบันทึกครั้งเดียวกัน

Actual Result
- -

หมายเหตุ
- เทคนิค: State Transition — เส้น "กดบันทึกซ้ำ"
- นอก AC: การ์ดไม่ระบุว่าการบันทึกซ้ำควรเป็นการอัปเดตหรือไม่ (ดู requirement gap)
```

### [Optional] TC-SBH-2436-008 - ตรวจสอบหัวข้อและปุ่มบันทึกไม่ซ้อนทับเนื้อหา เมื่อเลื่อนหน้าจอกลับขึ้นบนสุด

Status: Not Run · Labels: QA Case : Edge + QA Type : UIUX + QA Execution Type: Manual (+ requirement/module labels)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2436-008
- Scenario ID: TS-SBH-2436-EDG
- Case Type: Edge
- Test Level: System
- Test Type: UIUX
- Priority: Low
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์บันทึกคัดกรอง ER
2. มีผู้ป่วย ER ที่เปิดหน้า Overview ได้ และแบบฟอร์มคัดกรองยาวเกินหน้าจอ

Test Data
- ผู้ป่วย ER 1 ราย

Test Steps
1. เปิดหน้า Overview ของผู้ป่วย ER
2. เลื่อนหน้าจอแบบฟอร์มคัดกรอง ER ลงไปด้านล่างสุด
3. เลื่อนหน้าจอกลับขึ้นไปบนสุด

Expected Result
- หัวข้อ "คัดกรอง ER" และปุ่มบันทึกไม่ซ้อนทับช่องกรอกข้อมูลแรกของแบบฟอร์ม

Actual Result
- -

หมายเหตุ
- นอก AC: ความเสี่ยงจากการเปลี่ยน layout เป็นแบบ fixed
```

---

## TS-SBH-2436-ERR - บันทึกคัดกรอง ER ไม่สำเร็จ

Status: Ready for Testing · Labels: requirement labels + QA Module : ER + `<QA Sub-module>` + QA Case : Error

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2436-ERR
- Case Type: Error
- Suffix: ERR
- Module: ER
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

วัตถุประสงค์
- ยืนยันว่าแจ้งเตือนบันทึกสำเร็จไม่แสดงผิด เมื่อการบันทึกล้มเหลว

ขอบเขต Requirement
- AC1: แจ้งเตือนบันทึกสำเร็จ
- -

ความเสี่ยง
- ระบบแสดงว่าบันทึกสำเร็จทั้งที่ข้อมูลไม่ถูกบันทึก ทำให้ข้อมูลคัดกรองหาย (coverage นอก AC)

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### [Optional] TC-SBH-2436-009 - ตรวจสอบไม่แสดงแจ้งเตือนบันทึกสำเร็จ เมื่อบันทึกคัดกรอง ER ไม่สำเร็จ

Status: Not Run · Labels: QA Case : Error + QA Type : Functional + QA Execution Type: Manual (+ requirement/module labels)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2436-009
- Scenario ID: TS-SBH-2436-ERR
- Case Type: Error
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-2436 — [ER][Triage Form] - เมื่อเลื่อนบันทึกคัดกรอกบนหน้า Overview แล้วไม่มีแจ้งเตือนว่ากรอกข้อมูล สำเร็จ

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์บันทึกคัดกรอง ER
2. มีผู้ป่วย ER ที่เปิดหน้า Overview ได้

Test Data
- ผู้ป่วย ER 1 ราย
- ข้อมูลคัดกรองที่กรอกครบตามแบบฟอร์ม

Test Steps
1. เปิดหน้า Overview ของผู้ป่วย ER แล้วกรอกแบบฟอร์มคัดกรอง ER
2. ตัดการเชื่อมต่อเครือข่าย (DevTools → Network → Offline)
3. กดปุ่มบันทึก

Expected Result
- ระบบไม่แสดงแจ้งเตือนว่าบันทึกข้อมูลสำเร็จ

Actual Result
- -

หมายเหตุ
- นอก AC: การ์ดไม่ระบุข้อความ error ที่ต้องแสดง จึงตรวจเฉพาะว่าไม่แสดงแจ้งเตือนสำเร็จ (ดู requirement gap)
```

---

## Requirement gaps (นอกลำดับชั้น)

**Expected behavior**
- ไม่ระบุข้อความแจ้งเตือนบันทึกสำเร็จ / ตำแหน่ง / ระยะเวลาที่แสดง (ใช้ Physician Note เป็นตัวเทียบ)
- ไม่ระบุว่า fixed หัวข้อและปุ่มบันทึกอยู่ในขอบเขตกรอบแบบฟอร์ม หรือทั้งหน้า Overview
- การบันทึกซ้ำบนแบบฟอร์มเดิมควรเป็นการอัปเดตข้อมูลเดิม หรือสร้างรายการใหม่

**Validation**
- ไม่ระบุช่องบังคับกรอกของแบบฟอร์มคัดกรอง ER และพฤติกรรมเมื่อกรอกไม่ครบ

**Error handling**
- ไม่ระบุข้อความ/รูปแบบแจ้งเตือนเมื่อบันทึกไม่สำเร็จ

**Permission / role**
- ไม่ระบุ role ที่บันทึกคัดกรอง ER ได้

**Edge cases**
- ไม่ระบุพฤติกรรมบนหน้าจอขนาดเล็ก/แท็บเล็ต
