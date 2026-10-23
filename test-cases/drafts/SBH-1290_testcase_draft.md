# Draft Test Structure — SBH-1290

> สถานะ: **สร้างใน Linear แล้ว (2026-10-15)**
> - EXE SBH-2598 → HPY SBH-2599 (TC 001–014 = SBH-2601–2614) · UHP SBH-2600 (TC 015–017 = SBH-2615–2617)
> - QA Module : Reception · QA Sub-module / Feature : Patient Address (label ใหม่ สร้างแล้ว) · Env: Dev-X / SBH Prod
> - ใส่เฉพาะ TC [Required] ที่จะทดสอบจริง (ตามที่ผู้ใช้สั่งตอน SBH-2470)
> - ยกเลิก TC ส่งออก 43 แฟ้ม (AC4) ไปก่อนตามที่ผู้ใช้สั่ง (2026-10-15) → เหลือ 17 TC
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)

Requirement: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม
URL: https://linear.app/cortexcloud/issue/SBH-1290
Project: - (การ์ดไม่ได้ผูก project) · Team: SBH Project · Priority: Medium · State: Testing
Labels: 🍄 Improvement, For OPD Biz Sim - SBH, VERSION 2.9.0 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT
Sub-Issue ที่มีอยู่: SBH-2586 (บั๊ก ที่อยู่ที่ทำงานบันทึกไม่ได้ — Waiting for Fixing Bugs) · SBH-1570 (บั๊ก field ยังเป็นรูปแบบเดิม — Ready for Testing)

| AC | Expected Results | TC |
|---|---|---|
| AC1 | ระบบแสดง Field สำหรับกรอกข้อมูลที่อยู่แยกตามองค์ประกอบของที่อยู่ | 001–005 |
| AC2 | ผู้ใช้งานสามารถกรอกข้อมูลแต่ละ Field ได้อย่างอิสระ | 006, 011, 012 |
| AC3 | ระบบบันทึกข้อมูลแต่ละองค์ประกอบของที่อยู่ลงใน Field ที่ถูกต้อง | 007–010 |
| AC4 | ระบบสามารถนำข้อมูลแต่ละ Field ไปใช้ในการส่งออกข้อมูล 43 แฟ้มได้ | — ยกเลิกไปก่อน (ผู้ใช้สั่ง 2026-10-15) |
| AC5 | ระบบสามารถประกอบข้อมูลจากแต่ละ Field เพื่อแสดงผลเป็นที่อยู่ได้ถูกต้อง | 013, 014 |
| Data Fields (Required เฉพาะที่อยู่หลัก) | บ้านเลขที่ / หมู่ / ตำบล / อำเภอ / จังหวัด ต้องกรอก | 015–017 (+ 011 ฝั่งไม่บังคับ) |

Field ที่อยู่ตามการ์ด (12 ช่อง): บ้านเลขที่ · อาคาร/คอนโด · ห้อง · ซอยแยก · ซอย · ถนน · ชื่อหมู่บ้าน · หมู่ · ตำบล · อำเภอ · จังหวัด · รหัสไปรษณีย์
Section ที่อยู่ (4): ที่อยู่ และการติดต่อ (ที่อยู่หลัก) · ที่อยู่ที่ทำงาน · ครอบครัว · ข้อมูลการเกิด — ในหน้าสร้างผู้ป่วยใหม่ และหน้าแก้ไขข้อมูลผู้ป่วย

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul
Labels: 🍄 Improvement, For OPD Biz Sim - SBH, VERSION 2.9.0, QA Module : Reception, QA Sub-module / Feature : Patient Address, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: Registration
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- การแสดง field ที่อยู่แยกองค์ประกอบ ทั้ง 4 section ในหน้าสร้าง / แก้ไขผู้ป่วย (AC1)
- การกรอก field อิสระ และเลือก ตำบล/อำเภอ/จังหวัด จาก Master Data (AC2)
- การบันทึกแต่ละองค์ประกอบลง field ที่ถูกต้อง (AC3)
- การประกอบที่อยู่เป็นข้อความ (AC5)
- field บังคับเฉพาะที่อยู่หลัก (Data Fields)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- AC4 (ส่งออก 43 แฟ้ม) ยกเลิกไปก่อนในรอบนี้
```

---

## TS-SBH-1290-HPY - กรอก บันทึก แก้ไข และแสดงผลที่อยู่แบบแยก field ตาม 43 แฟ้ม

Status: Ready for Testing · Labels: requirement labels + QA Module : Reception + QA Sub-module / Feature : Patient Address + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Suffix: HPY
- Module: Registration
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

วัตถุประสงค์
- ยืนยันว่าที่อยู่ทุก section แสดง กรอก บันทึก แก้ไข และแสดงผลแบบแยก field ได้ถูกต้อง

ขอบเขต Requirement
- AC1: แสดง field ที่อยู่แยกตามองค์ประกอบ
- AC2: กรอกแต่ละ field ได้อย่างอิสระ · ตำบล อำเภอ จังหวัด อ้างอิง Master Data (Business Rule 2)
- AC3: บันทึกแต่ละองค์ประกอบลง field ที่ถูกต้อง
- AC5: ประกอบข้อมูลจากแต่ละ field เป็นที่อยู่ได้ถูกต้อง
- Business Rule 5: Prefill และแก้ไขแต่ละ field ได้อย่างอิสระ
- Required เฉพาะที่อยู่หลัก · ที่อยู่ที่ทำงาน ครอบครัว ข้อมูลการเกิด ไม่บังคับกรอก

ความเสี่ยง
- บาง section ยังเป็น field รูปแบบเดิม (เคยเจอใน SBH-1570)
- ที่อยู่ section รองบันทึกไม่ได้ (เคยเจอใน SBH-2586)
- ข้อมูลลง field ผิด ทำให้ส่ง 43 แฟ้มผิดในภายหลัง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### [Required] TC-SBH-1290-001 - แสดง field ที่อยู่แยกตามองค์ประกอบ ใน section ที่อยู่และการติดต่อ หน้าสร้างผู้ป่วยใหม่

Status: Not Run · Labels: requirement labels + QA Module : Reception + QA Sub-module / Feature : Patient Address + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-001
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- -

Test Steps
1. เวชระเบียน > สร้างผู้ป่วยใหม่
2. ดู section ที่อยู่ และการติดต่อ

Expected Result
- แสดง field แยกครบ 12 ช่อง: บ้านเลขที่ · อาคาร/คอนโด · ห้อง · ซอยแยก · ซอย · ถนน · ชื่อหมู่บ้าน · หมู่ · ตำบล · อำเภอ · จังหวัด · รหัสไปรษณีย์ · บ้านเลขที่ / หมู่ / ตำบล / อำเภอ / จังหวัด มีเครื่องหมายบังคับกรอก

Actual Result
- -

หมายเหตุ
- AC1 · Data Fields (Required)
```

### [Required] TC-SBH-1290-002 - แสดง field ที่อยู่แยกตามองค์ประกอบ ใน section ที่อยู่ที่ทำงาน หน้าสร้างผู้ป่วยใหม่

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-002
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- -

Test Steps
1. เวชระเบียน > สร้างผู้ป่วยใหม่
2. ดู section ที่อยู่ที่ทำงาน

Expected Result
- แสดง field แยกครบ 12 ช่องเหมือนที่อยู่หลัก และไม่มีเครื่องหมายบังคับกรอก

Actual Result
- -

หมายเหตุ
- AC1 · Required apply เฉพาะที่อยู่หลัก · เคยเจอบั๊ก SBH-1570
```

### [Required] TC-SBH-1290-003 - แสดง field ที่อยู่แยกตามองค์ประกอบ ใน section ครอบครัว หน้าสร้างผู้ป่วยใหม่

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-003
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- -

Test Steps
1. เวชระเบียน > สร้างผู้ป่วยใหม่
2. ดู section ครอบครัว

Expected Result
- แสดง field แยกครบ 12 ช่องเหมือนที่อยู่หลัก และไม่มีเครื่องหมายบังคับกรอก

Actual Result
- -

หมายเหตุ
- AC1 · เคยเจอบั๊ก SBH-1570
```

### [Required] TC-SBH-1290-004 - แสดง field ที่อยู่แยกตามองค์ประกอบ ใน section ข้อมูลการเกิด หน้าสร้างผู้ป่วยใหม่

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-004
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- -

Test Steps
1. เวชระเบียน > สร้างผู้ป่วยใหม่
2. ดู section ข้อมูลการเกิด (สถานที่เกิด)

Expected Result
- แสดง field แยกครบ 12 ช่อง แทนช่องเดิม "บ้านเลขที่ / หมู่ / ซอย / ถนน" และ "ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์" แบบรวม และไม่มีเครื่องหมายบังคับกรอก

Actual Result
- -

หมายเหตุ
- AC1 · As is ในการ์ดคือช่องรวม 2 ช่อง · เคยเจอบั๊ก SBH-1570
```

### [Required] TC-SBH-1290-005 - แสดง field ที่อยู่แยกตามองค์ประกอบครบทุก section ในหน้าแก้ไขข้อมูลผู้ป่วย

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-005
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. มีผู้ป่วยที่ลงทะเบียนแล้ว 1 ราย

Test Data
- ผู้ป่วยทดสอบ 1 ราย

Test Steps
1. เปิดหน้าแก้ไขข้อมูลผู้ป่วย
2. ดู section ที่อยู่ และการติดต่อ / ที่อยู่ที่ทำงาน / ครอบครัว / ข้อมูลการเกิด

Expected Result
- ทั้ง 4 section แสดง field ที่อยู่แยก 12 ช่องเหมือนหน้าสร้างผู้ป่วยใหม่

Actual Result
- -

หมายเหตุ
- AC1 · Scope ข้อ 2 (แก้ไขข้อมูลผู้ป่วย)
```

### [Required] TC-SBH-1290-006 - ทดสอบเลือก จังหวัด อำเภอ ตำบล จาก Master Data ตามลำดับ

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-006
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- จังหวัด สระบุรี · อำเภอ เมืองสระบุรี · ตำบล ปากเพรียว

Test Steps
1. เวชระเบียน > สร้างผู้ป่วยใหม่ > section ที่อยู่ และการติดต่อ
2. เลือกจังหวัด สระบุรี
3. เปิดรายการอำเภอ แล้วเลือก เมืองสระบุรี
4. เปิดรายการตำบล แล้วเลือก ปากเพรียว

Expected Result
- จังหวัด อำเภอ ตำบล เป็น 3 field แยกกัน รายการอำเภอแสดงเฉพาะของจังหวัดที่เลือก และรายการตำบลแสดงเฉพาะของอำเภอที่เลือก ตาม Master Data

Actual Result
- -

หมายเหตุ
- AC2 · Business Rule 2
```

### [Required] TC-SBH-1290-007 - บันทึกที่อยู่หลักครบทุก field แล้วข้อมูลลง field ที่ถูกต้อง

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-007
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- ค่าไม่ซ้ำกันทุกช่อง เช่น บ้านเลขที่ 99/1 · อาคาร/คอนโด ลุมพินี · ห้อง 1203 · ซอยแยก แยก 2 · ซอย สุขใจ · ถนน พหลโยธิน · ชื่อหมู่บ้าน ร่มเย็น · หมู่ 4 · สระบุรี / เมืองสระบุรี / ปากเพรียว

Test Steps
1. สร้างผู้ป่วยใหม่ กรอกข้อมูลส่วนตัวที่บังคับครบ
2. กรอก section ที่อยู่ และการติดต่อ ครบทุก field ตาม Test Data
3. กดบันทึก
4. เปิดหน้าแก้ไขข้อมูลผู้ป่วยรายนี้ ดู section ที่อยู่ และการติดต่อ

Expected Result
- บันทึกสำเร็จ และแต่ละ field แสดงค่าตรงกับที่กรอก ไม่สลับช่อง

Actual Result
- -

หมายเหตุ
- AC2, AC3 · ใช้ค่าไม่ซ้ำกันเพื่อจับการสลับช่อง
```

### [Required] TC-SBH-1290-008 - บันทึกที่อยู่ที่ทำงานแล้วข้อมูลลง field ที่ถูกต้อง

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-008
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- ที่อยู่ที่ทำงาน: บ้านเลขที่ + ถนน + จังหวัด / อำเภอ / ตำบล (ค่าต่างจากที่อยู่หลัก)

Test Steps
1. สร้างผู้ป่วยใหม่ กรอกข้อมูลส่วนตัวและที่อยู่หลักที่บังคับครบ
2. กรอก section ที่อยู่ที่ทำงาน ตาม Test Data
3. กดบันทึก
4. เปิดหน้าแก้ไขข้อมูลผู้ป่วยรายนี้ ดู section ที่อยู่ที่ทำงาน

Expected Result
- บันทึกสำเร็จ และแต่ละ field ของที่อยู่ที่ทำงานแสดงค่าตรงกับที่กรอก

Actual Result
- -

หมายเหตุ
- AC2, AC3 · retest บั๊ก SBH-2586 (กรอกที่อยู่ที่ทำงานแล้วบันทึกไม่ได้)
```

### [Required] TC-SBH-1290-009 - บันทึกที่อยู่ section ครอบครัวแล้วข้อมูลลง field ที่ถูกต้อง

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-009
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- ที่อยู่ครอบครัว: บ้านเลขที่ + หมู่ + ซอย + จังหวัด / อำเภอ / ตำบล (ค่าต่างจากที่อยู่หลัก)

Test Steps
1. สร้างผู้ป่วยใหม่ กรอกข้อมูลส่วนตัวและที่อยู่หลักที่บังคับครบ
2. กรอกที่อยู่ใน section ครอบครัว ตาม Test Data
3. กดบันทึก
4. เปิดหน้าแก้ไขข้อมูลผู้ป่วยรายนี้ ดู section ครอบครัว

Expected Result
- บันทึกสำเร็จ และแต่ละ field ของที่อยู่ครอบครัวแสดงค่าตรงกับที่กรอก

Actual Result
- -

หมายเหตุ
- AC2, AC3
```

### [Required] TC-SBH-1290-010 - บันทึกที่อยู่ section ข้อมูลการเกิดแล้วข้อมูลลง field ที่ถูกต้อง

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-010
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- สถานที่เกิด: บ้านเลขที่ + หมู่ + จังหวัด / อำเภอ / ตำบล (ค่าต่างจากที่อยู่หลัก)

Test Steps
1. สร้างผู้ป่วยใหม่ กรอกข้อมูลส่วนตัวและที่อยู่หลักที่บังคับครบ
2. กรอกที่อยู่ใน section ข้อมูลการเกิด ตาม Test Data
3. กดบันทึก
4. เปิดหน้าแก้ไขข้อมูลผู้ป่วยรายนี้ ดู section ข้อมูลการเกิด

Expected Result
- บันทึกสำเร็จ และแต่ละ field ของสถานที่เกิดแสดงค่าตรงกับที่กรอก

Actual Result
- -

หมายเหตุ
- AC2, AC3
```

### [Required] TC-SBH-1290-011 - บันทึกผู้ป่วยได้ เมื่อกรอกเฉพาะ field บังคับของที่อยู่หลักและเว้นที่อยู่ section อื่นว่าง

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-011
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- ที่อยู่หลัก: บ้านเลขที่ + หมู่ + จังหวัด / อำเภอ / ตำบล เท่านั้น

Test Steps
1. สร้างผู้ป่วยใหม่ กรอกข้อมูลส่วนตัวที่บังคับครบ
2. กรอกที่อยู่หลักเฉพาะ field บังคับ ตาม Test Data
3. เว้นที่อยู่ที่ทำงาน / ครอบครัว / ข้อมูลการเกิด ว่างทั้งหมด
4. กดบันทึก

Expected Result
- บันทึกผู้ป่วยสำเร็จ ไม่มีแจ้งเตือนให้กรอก field ใน section ที่อยู่อื่น

Actual Result
- -

หมายเหตุ
- AC2 · Required Field apply เฉพาะที่อยู่หลัก
```

### [Required] TC-SBH-1290-012 - ทดสอบแก้ไข field ที่อยู่ field เดียว แล้ว field อื่นไม่เปลี่ยน

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-012
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. มีผู้ป่วยจาก TC-SBH-1290-007 (ที่อยู่หลักครบทุก field)

Test Data
- ถนนใหม่: มิตรภาพ

Test Steps
1. เปิดหน้าแก้ไขข้อมูลผู้ป่วย
2. ตรวจว่า field ที่อยู่หลัก prefill ค่าเดิมครบ
3. แก้เฉพาะ field ถนน เป็น "มิตรภาพ" แล้วกดบันทึก
4. เปิดหน้าแก้ไขข้อมูลผู้ป่วยอีกครั้ง

Expected Result
- ถนนเปลี่ยนเป็น "มิตรภาพ" และ field ที่อยู่อื่นยังเป็นค่าเดิมทุกช่อง

Actual Result
- -

หมายเหตุ
- AC2 · Business Rule 5 (Prefill และแก้ไขแต่ละ field ได้อย่างอิสระ)
```

### [Required] TC-SBH-1290-013 - แสดงที่อยู่แบบข้อความที่ประกอบจากทุก field ได้ถูกต้อง

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-013
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. มีผู้ป่วยจาก TC-SBH-1290-007 (ที่อยู่หลักครบทุก field)

Test Data
- ผู้ป่วยจาก TC-SBH-1290-007

Test Steps
1. เปิดหน้าที่แสดงที่อยู่ผู้ป่วยแบบข้อความ (เช่น ข้อมูลผู้ป่วย / ผลค้นหาผู้ป่วย)
2. ดูข้อความที่อยู่

Expected Result
- ข้อความที่อยู่มีครบทุกองค์ประกอบที่กรอก ไม่ตกหล่น ไม่ซ้ำ และตรงกับค่าในแต่ละ field

Actual Result
- -

หมายเหตุ
- AC5 · Business Rule 3 · หน้าที่แสดงและรูปแบบลำดับข้อความ การ์ดไม่ระบุ (ดู gap)
```

### [Required] TC-SBH-1290-014 - แสดงที่อยู่แบบข้อความได้ถูกต้อง เมื่อกรอกเฉพาะ field บังคับ

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-014
- Scenario ID: TS-SBH-1290-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. มีผู้ป่วยจาก TC-SBH-1290-011 (ที่อยู่หลักเฉพาะ field บังคับ)

Test Data
- ผู้ป่วยจาก TC-SBH-1290-011

Test Steps
1. เปิดหน้าที่แสดงที่อยู่ผู้ป่วยแบบข้อความ
2. ดูข้อความที่อยู่

Expected Result
- ข้อความแสดงเฉพาะองค์ประกอบที่กรอก ไม่มีคำนำหน้าหรือตัวคั่นของ field ที่ว่าง (เช่น "ซอย -", "ถนน ,")

Actual Result
- -

หมายเหตุ
- AC5
```

---

## TS-SBH-1290-UHP - บันทึกผู้ป่วยไม่ได้เมื่อไม่กรอก field บังคับของที่อยู่หลัก

Status: Ready for Testing · Labels: requirement labels + QA Module : Reception + QA Sub-module / Feature : Patient Address + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1290-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: Registration
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

วัตถุประสงค์
- ยืนยันว่า field บังคับของที่อยู่หลักตามตาราง Data Fields ถูกบังคับกรอกจริง

ขอบเขต Requirement
- Data Fields: บ้านเลขที่ / หมู่ / ตำบล / อำเภอ / จังหวัด เป็น Required ของที่อยู่หลัก

ความเสี่ยง
- ผู้ป่วยถูกบันทึกโดยที่อยู่หลักไม่ครบ ทำให้ส่ง 43 แฟ้มไม่ผ่าน

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ไม่กรอกจังหวัด / อำเภอ จะทำให้เลือกตำบลไม่ได้อยู่แล้ว จึงทดสอบที่ตำบลว่างเป็นตัวแทน
```

### [Required] TC-SBH-1290-015 - ตรวจสอบบันทึกผู้ป่วยไม่ได้ เมื่อไม่กรอกบ้านเลขที่ของที่อยู่หลัก

Status: Not Run · Labels: requirement labels + QA Module : Reception + QA Sub-module / Feature : Patient Address + QA Case : Unhappy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-015
- Scenario ID: TS-SBH-1290-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- ที่อยู่หลัก: หมู่ + จังหวัด / อำเภอ / ตำบล (เว้นบ้านเลขที่)

Test Steps
1. สร้างผู้ป่วยใหม่ กรอกข้อมูลส่วนตัวที่บังคับครบ
2. กรอกที่อยู่หลักตาม Test Data โดยเว้นบ้านเลขที่ว่าง
3. กดบันทึก

Expected Result
- บันทึกไม่ได้ และแจ้งให้กรอกบ้านเลขที่

Actual Result
- -

หมายเหตุ
- Data Fields: บ้านเลขที่ = Required
- เทคนิค: EP — กลุ่มค่าผิด (ว่าง) ทีละ 1 field
```

### [Required] TC-SBH-1290-016 - ตรวจสอบบันทึกผู้ป่วยไม่ได้ เมื่อไม่กรอกหมู่ของที่อยู่หลัก

Status: Not Run · Labels: เหมือน TC-016

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-016
- Scenario ID: TS-SBH-1290-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- ที่อยู่หลัก: บ้านเลขที่ + จังหวัด / อำเภอ / ตำบล (เว้นหมู่)

Test Steps
1. สร้างผู้ป่วยใหม่ กรอกข้อมูลส่วนตัวที่บังคับครบ
2. กรอกที่อยู่หลักตาม Test Data โดยเว้นหมู่ว่าง
3. กดบันทึก

Expected Result
- บันทึกไม่ได้ และแจ้งให้กรอกหมู่

Actual Result
- -

หมายเหตุ
- Data Fields: หมู่ = Required
- เทคนิค: EP — กลุ่มค่าผิด (ว่าง) ทีละ 1 field
```

### [Required] TC-SBH-1290-017 - ตรวจสอบบันทึกผู้ป่วยไม่ได้ เมื่อไม่เลือกตำบลของที่อยู่หลัก

Status: Not Run · Labels: เหมือน TC-016

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1290-017
- Scenario ID: TS-SBH-1290-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1290 — [Registration] ข้อมูลผู้ป่วย ที่อยู่ เช่น ทะเบียนบ้าน ตำบล ถนน หมู่ ควรแยก field ของตัวเอง เพราะใช้นำส่ง 43 แฟ้ม

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์เวชระเบียน

Test Data
- ที่อยู่หลัก: บ้านเลขที่ + หมู่ + จังหวัด / อำเภอ (ไม่เลือกตำบล)

Test Steps
1. สร้างผู้ป่วยใหม่ กรอกข้อมูลส่วนตัวที่บังคับครบ
2. กรอกที่อยู่หลักตาม Test Data โดยไม่เลือกตำบล
3. กดบันทึก

Expected Result
- บันทึกไม่ได้ และแจ้งให้เลือกตำบล

Actual Result
- -

หมายเหตุ
- Data Fields: ตำบล = Required
- เทคนิค: EP — กลุ่มค่าผิด (ว่าง) ทีละ 1 field
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- AC5: ไม่ระบุว่าที่อยู่แบบข้อความแสดงที่หน้าไหน และรูปแบบ/ลำดับการต่อข้อความ (เช่น มีคำนำหน้า "ซอย", "ถนน", "ม." หรือไม่)
- AC4: ไม่ระบุเมนู/วิธีส่งออก 43 แฟ้ม ไฟล์ไหน (ADDRESS / HOME / PERSON) และการ map ADDRESSTYPE / HOUSETYPE / HOUSE_ID ที่ 43 แฟ้มบังคับ
- Business Rule 5 "Prefill": ไม่ระบุแหล่งที่ prefill (อ่านบัตรประชาชน? / prefill ที่อยู่ รพ.สระบุรี ใน SBH-1289?)
- ผู้ป่วยเก่าที่ที่อยู่เป็นข้อความรวมแบบเดิม: แสดง / แก้ไขอย่างไรหลังเปลี่ยนเป็น field แยก
- version ไม่ตรงกัน: label การ์ด = VERSION 2.9.0 แต่ชื่อ PR = V2.8.0 (ร่างนี้ใช้ 2.9.0 ตาม label)

Validation
- ไม่ระบุความยาวสูงสุดของ field Text (43 แฟ้มกำหนด เช่น ROOMNO 10, CONDO 75) จึงยังทำ BVA ไม่ได้
- หมู่เป็น Required แต่ที่อยู่ในเขตเมืองที่ไม่มีหมู่ ให้กรอกอย่างไร
- รหัสไปรษณีย์: ไม่ระบุว่าเติมอัตโนมัติจาก Master Data หรือกรอกเอง และบังคับหรือไม่
- SBH-1419 (Feature flag required field ที่อยู่ 43 แฟ้ม) อาจเปิด/ปิดการบังคับกรอก ต้องยืนยันสถานะ flag บน env ที่ทดสอบ

Error handling
- ไม่ระบุข้อความแจ้งเตือนเมื่อไม่กรอก field บังคับ

Permission / role
- ไม่ระบุ role ที่ใช้หน้าสร้าง / แก้ไขผู้ป่วย (ใช้สิทธิ์เวชระเบียนเป็นค่าตั้งต้น)

Edge cases
- ที่อยู่ที่ทำงาน / ครอบครัว / ข้อมูลการเกิด กรอกไม่ครบ (เช่น มีบ้านเลขที่แต่ไม่เลือกตำบล) ควรบันทึกได้หรือต้องแจ้ง — SBH-2586 คาดหวังว่า "ถ้าข้อมูลไม่ครบต้องแจ้งว่าต้องกรอกช่องไหน" ซึ่งขัดกับ "ไม่ต้องบังคับกรอก" ในการ์ด
