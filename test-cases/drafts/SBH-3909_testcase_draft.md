# Draft Test Structure — SBH-3909

> สถานะ: **สร้างใน Linear แล้ว 8 พ.ย. 2026** — ผู้ใช้พิมพ์ "สร้างได้" · EXE `SBH-3937` · HPY `SBH-3938` (TC 001–007) · EDG `SBH-3939` (TC 008–009) · UHP `SBH-3940` (TC 010–011) · connector เป็นบัญชี Pearsu (ผู้ใช้อนุญาต "สร้างเลย") · assignee Suchat ทุกใบ
> - เลข TC → SBH: 001=3941 · 002=3942 · 003=3943 · 004=3944 · 005=3945 · 006=3946 · 007=3947 · 008=3948 · 009=3949 · 010=3950 · 011=3951
> - ชุดนี้ = EXE 1 + Scenario 3 (HPY / EDG / UHP) + TC 11 = 15 ใบ
> - แก้ตามผู้ใช้ (8 พ.ย.): **แผงค่าแพทย์ไม่ได้อยู่ใน ER Note แต่เปิดจากเมนู "ค่าตรวจแพทย์"** · **TC ที่กดบันทึก ให้ไปตรวจผลที่หน้าการเงิน**
>   → รวม TC บันทึก + TC หน้าการเงินของรอบ 1 เป็นข้อเดียว (เหลือ 11 TC)
> - ยึด AC ข้อเดียวในการ์ด ("เพิ่ม Section Doctor Free อ้างอิงตาม OPD Note") + รูปในการ์ด (แผง "ค่าแพทย์" ของ OPD)
> - ค่าตั้งต้น / ปุ่มลัด / ช่วงราคา มาจากรูปในการ์ด · ฝั่ง OPD เคยรันจริงบน SBH Prod 22 ต.ค. 2026 (APM-OPD-005): เมนู "ค่าตรวจแพทย์" → แผง "ค่าแพทย์" → บันทึก → การเงินได้รายการค่าตรวจแพทย์
> - PR: cortex-ui #2758 / #2760 "[V2.10.0][FEAT][SBH-3909] open ER doctor fee as its own panel" — ตรงกับ label VERSION 2.10.0
> - การ์ดไม่มี Sub-Issue / คอมเมนต์
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ค่าที่เสนอ (รอยืนยัน): Run Type CT · Version 2.10.0 · Env Dev-X · QA Module : ER · QA Sub-module / Feature : Doctor Fee (ผู้ใช้สั่งสร้าง 8 พ.ย. 2026 — สร้างแล้วด้วยบัญชี Pearsu ตามที่ผู้ใช้อนุญาต)

Requirement: SBH-3909 — [ER] [ ER Note ] เพิ่ม Section Doctor Free
URL: https://linear.app/cortexcloud/issue/SBH-3909/er-er-note-เพม-section-doctor-free
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: Urgent · State: Ready for Testing
Labels: VERSION 2.10.0 · Natthaphat ( MOD ) 🙈 · 🍄 Improvement · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Relations: ไม่มี · Sub-Issue: ไม่มี
Scope / Version = 2.10.0

AC ในการ์ด
1. เพิ่ม Section : Doctor Free (= ค่าแพทย์ / Doctor Fee) — 1.1 อ้างอิงตาม OPD Note ของ OPD ได้เลย (+ รูปแผง "ค่าแพทย์")

สิ่งที่เห็นในรูปอ้างอิง (OPD)
- หัวแผง "ค่าแพทย์" (ไอคอน $) · สถานะ "ยังไม่ได้บันทึก" · ปุ่ม "บันทึก" · ปุ่มปิด (X)
- การเรียกเก็บ: radio "ต้องการเก็บ" (เลือกอยู่) / "ไม่ต้องการเก็บ" · ปุ่ม "คิดค่าธรรมเนียมแพทย์ตามสิทธิการรักษา"
- จำนวนเงิน: ช่องกรอก (200) · ข้อความ "ราคาที่กำหนด 0 - 800" · ปุ่มลัด 200 / 400 / 600

## AC → TC

| AC | เรื่อง | TC |
|---|---|---|
| 1 | มีแผงค่าแพทย์ของผู้ป่วย ER (เปิดจากเมนูค่าตรวจแพทย์) | 001 |
| 1.1 | หน้าตา / องค์ประกอบตาม OPD | 002 · 003 · 004 |
| 1.1 | บันทึกแล้วค่าแพทย์ไปถึงหน้าการเงิน (ต้องการเก็บ / ไม่ต้องการเก็บ) | 005 · 007 |
| 1.1 | เปิดแผงอีกครั้งแสดงค่าที่บันทึก | 006 |
| 1.1 (ช่วงราคา 0 - 800 ในรูป) | ค่าขอบ | 008 · 009 · 010 · 011 |

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | แสดงแผง "ค่าแพทย์" เมื่อกดเมนูค่าตรวจแพทย์ของผู้ป่วย ER | เปิดแผง "ค่าแพทย์" ของผู้ป่วยที่เลือก |
| 002 | HPY | ตรวจสอบองค์ประกอบของแผงค่าแพทย์ตรงกับ OPD | มี การเรียกเก็บ (ต้องการเก็บ / ไม่ต้องการเก็บ) · ปุ่ม "คิดค่าธรรมเนียมแพทย์ตามสิทธิการรักษา" · ช่องจำนวนเงิน · "ราคาที่กำหนด 0 - 800" · ปุ่มลัด 200 / 400 / 600 · สถานะ "ยังไม่ได้บันทึก" · ปุ่มบันทึก · ปุ่มปิด |
| 003 | HPY | ตรวจสอบค่าตั้งต้นของแผงค่าแพทย์เมื่อยังไม่เคยบันทึก | การเรียกเก็บ = "ต้องการเก็บ" · จำนวนเงิน = 200 |
| 004 | HPY | ทดสอบเลือกจำนวนเงินจากปุ่มลัด 400 | ช่องจำนวนเงินเปลี่ยนเป็น 400 |
| 005 | HPY | บันทึกค่าแพทย์แบบต้องการเก็บแล้วแสดงในหน้าการเงิน | หน้าการเงินของ Visit ER มีรายการค่าตรวจแพทย์ จำนวนเงิน 400 |
| 006 | HPY | แสดงค่าแพทย์ที่บันทึกไว้เมื่อเปิดเมนูค่าตรวจแพทย์อีกครั้ง | การเรียกเก็บ = "ต้องการเก็บ" · จำนวนเงิน = 400 · สถานะ "บันทึกแล้ว" |
| 007 | HPY | บันทึกค่าแพทย์แบบไม่ต้องการเก็บแล้วตรวจสอบหน้าการเงิน | หน้าการเงินของ Visit ER ไม่มีรายการค่าตรวจแพทย์ |
| 008 | EDG | บันทึกค่าแพทย์จำนวนเงินเท่ากับขอบล่าง 0 แล้วตรวจสอบหน้าการเงิน | บันทึกได้ · หน้าการเงินไม่มียอดค่าตรวจแพทย์ที่ต้องชำระ (0 บาท) |
| 009 | EDG | บันทึกค่าแพทย์จำนวนเงินเท่ากับขอบบน 800 แล้วตรวจสอบหน้าการเงิน | บันทึกได้ · หน้าการเงินมีรายการค่าตรวจแพทย์ จำนวนเงิน 800 |
| 010 | UHP | ตรวจสอบบันทึกค่าแพทย์ไม่ได้เมื่อจำนวนเงินเกิน 800 | บันทึกไม่ได้ · หน้าการเงินไม่มีรายการค่าตรวจแพทย์ 801 |
| 011 | UHP | ตรวจสอบบันทึกค่าแพทย์ไม่ได้เมื่อจำนวนเงินติดลบ | บันทึกไม่ได้ · หน้าการเงินไม่มีรายการค่าตรวจแพทย์ -1 |

## Requirement gap (ไม่ทำเป็น TC — รอผู้ใช้ / BA ตัดสิน)

**expected behavior**
- ปุ่ม "คิดค่าธรรมเนียมแพทย์ตามสิทธิการรักษา" คิดตามอะไร ได้ค่าเท่าไรต่อสิทธิ — การ์ดไม่บอก
- เลือก "ไม่ต้องการเก็บ" แล้วช่องจำนวนเงินต้องซ่อน / ล็อก / ส่ง 0 ไหม (TC-007 ยึดแค่ "การเงินไม่มีรายการค่าตรวจแพทย์" — **ขอยืนยัน**)
- บันทึก 0 แบบ "ต้องการเก็บ" การเงินต้องมีแถว 0 บาท หรือไม่มีแถว (TC-008 ยึดแค่ "ไม่มียอดที่ต้องชำระ")
- ER ใช้ช่วงราคา 0 - 800 และปุ่มลัด 200 / 400 / 600 เท่ากับ OPD ไหม (เช่น ในเวลา / นอกเวลาราชการต่างกันไหม)
- รหัส / ชื่อรายการค่าตรวจแพทย์ที่การเงินของ ER (OPD SBH Prod = "MED058 - ค่าตรวจแพทย์") · สิทธิเบิกได้ / ไม่ได้
- ค่าแพทย์ต้องแสดงใน ER Summary / เอกสาร PDF ไหม

**validation**
- จำนวนเงินเกินช่วง / ติดลบ ต้องแสดงข้อความอะไร
- ช่องจำนวนเงินว่าง + "ต้องการเก็บ" บันทึกได้ไหม
- ไม่บันทึกค่าแพทย์ก่อนจำหน่าย / ลงนาม Disposition ต้องเตือนไหม

**permission / role**
- พยาบาล ER เห็น / แก้แผงค่าแพทย์ได้ไหม
- Visit จำหน่ายแล้ว / การเงินชำระแล้ว ยังแก้ค่าแพทย์ได้ไหม

**error handling / edge cases**
- บันทึกไม่สำเร็จ (เครือข่าย / server) ต้องแสดงอะไร
- แพทย์ 2 คนบันทึกค่าแพทย์ Visit เดียวกัน — ทับกันหรือเป็น 2 รายการ

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user แพทย์ ER** ที่บันทึกค่าแพทย์ได้ (ทุก TC) · **user การเงิน** (005 · 007–011)
- **ผู้ป่วย ER A** คัดกรองแล้ว Visit Active ยังไม่เคยบันทึกค่าแพทย์ — 001–006 (ทำต่อกันตามลำดับ)
- **ผู้ป่วย ER B** คัดกรองแล้ว Visit Active ยังไม่เคยบันทึกค่าแพทย์ — 007
- **ผู้ป่วย ER C** คัดกรองแล้ว Visit Active ยังไม่เคยบันทึกค่าแพทย์ — 008–011 (ทำตามลำดับ · 010 / 011 ทำหลัง 009 แล้วการเงินต้องยังเป็น 800)
- dev-x ใช้ร่วมกัน: ใช้ผู้ป่วย AUTO ที่สร้างเพื่อเทสเท่านั้น

---

## EXE - CT - 2.10.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: VERSION 2.10.0, Natthaphat ( MOD ) 🙈, 🍄 Improvement, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Doctor Fee, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.10.0
- Module: ER — ค่าตรวจแพทย์ (แผงค่าแพทย์)
- Requirement ที่อ้างอิง: SBH-3909 — [ER] [ ER Note ] เพิ่ม Section Doctor Free
- Environment: Dev-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- เปิดแผงค่าแพทย์ของผู้ป่วย ER จากเมนูค่าตรวจแพทย์ และหน้าตาตาม OPD
- บันทึกค่าแพทย์ (ต้องการเก็บ / ไม่ต้องการเก็บ) แล้วตรวจผลที่หน้าการเงิน
- ค่าขอบของช่วงราคา 0 - 800

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- นอก scope: ปุ่มคิดค่าธรรมเนียมตามสิทธิ · สิทธิ์ผู้ใช้ · Visit ปิด (การ์ดไม่ระบุ — ดู Requirement gap)
```

---

## TS-SBH-3909-HPY - บันทึกค่าแพทย์จากเมนูค่าตรวจแพทย์ของผู้ป่วย ER แล้วแสดงที่หน้าการเงิน

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3909-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER — ค่าตรวจแพทย์ (แผงค่าแพทย์)
- Requirement ที่อ้างอิง: SBH-3909 — [ER] [ ER Note ] เพิ่ม Section Doctor Free

วัตถุประสงค์
- ยืนยันว่าผู้ป่วย ER มีแผงค่าแพทย์หน้าตาเหมือน OPD บันทึกได้ และค่าแพทย์ไปถึงหน้าการเงิน

ขอบเขต Requirement
- AC 1 เพิ่ม Section Doctor Fee
- AC 1.1 อ้างอิงตาม OPD (รูปแผง "ค่าแพทย์")

ความเสี่ยง
- ไม่มีที่บันทึกค่าแพทย์ใน ER → การเงินไม่มีค่าตรวจแพทย์ของ Visit ER (เก็บเงินไม่ได้)
- บันทึกได้แต่ค่าไม่ไปถึงการเงิน / จำนวนเงินไม่ตรง หรือเปิดใหม่ค่าหาย

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ดูหัวข้อ "ข้อมูลตั้งต้น" ในไฟล์ร่าง
```

### TC-SBH-3909-001 - แสดงแผง "ค่าแพทย์" เมื่อกดเมนูค่าตรวจแพทย์ของผู้ป่วย ER

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Happy + QA Type : UIUX + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > เมนู ห้องฉุกเฉิน
2. กด Patient Card ของผู้ป่วย ER A > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์"

## Expected Result
เปิดแผง "ค่าแพทย์" ของผู้ป่วยที่เลือก

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1
```

### TC-SBH-3909-002 - ตรวจสอบองค์ประกอบของแผงค่าแพทย์ตรงกับ OPD

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Happy + QA Type : UIUX + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > เมนู ห้องฉุกเฉิน
2. กด Patient Card ของผู้ป่วย ER A > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์"
4. เทียบองค์ประกอบในแผงกับรูปอ้างอิงในการ์ด

## Expected Result
แผงมีองค์ประกอบครบตาม OPD: การเรียกเก็บ ("ต้องการเก็บ" / "ไม่ต้องการเก็บ") · ปุ่ม "คิดค่าธรรมเนียมแพทย์ตามสิทธิการรักษา" · ช่องจำนวนเงิน · ข้อความ "ราคาที่กำหนด 0 - 800" · ปุ่มลัด 200 / 400 / 600 · สถานะ "ยังไม่ได้บันทึก" · ปุ่ม "บันทึก" · ปุ่มปิด (X)

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1
```

### TC-SBH-3909-003 - ตรวจสอบค่าตั้งต้นของแผงค่าแพทย์เมื่อยังไม่เคยบันทึก

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Happy + QA Type : Functional + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > เมนู ห้องฉุกเฉิน
2. กด Patient Card ของผู้ป่วย ER A (ยังไม่เคยบันทึกค่าแพทย์) > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์"
4. ดูค่าในช่อง การเรียกเก็บ และ จำนวนเงิน

## Expected Result
การเรียกเก็บ = "ต้องการเก็บ" · จำนวนเงิน = 200

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1 · ค่าตั้งต้นอ้างอิงรูปในการ์ด และแผงค่าแพทย์ OPD (SBH Prod 22 ต.ค. 2026)
```

### TC-SBH-3909-004 - ทดสอบเลือกจำนวนเงินจากปุ่มลัด 400

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Happy + QA Type : Functional + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-004
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > เมนู ห้องฉุกเฉิน
2. กด Patient Card ของผู้ป่วย ER A > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์"
4. กดปุ่มลัด "400" ใต้ช่องจำนวนเงิน

## Expected Result
ช่องจำนวนเงินเปลี่ยนเป็น 400

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1
```

### TC-SBH-3909-005 - บันทึกค่าแพทย์แบบต้องการเก็บแล้วแสดงในหน้าการเงิน

Status: Not Run · Priority: Urgent · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Happy + QA Type : Integration + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-005
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user แพทย์ ER > เมนู ห้องฉุกเฉิน
2. กด Patient Card ของผู้ป่วย ER A > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์"
4. เลือก การเรียกเก็บ "ต้องการเก็บ" > จำนวนเงิน 400
5. กดปุ่ม "บันทึก" ของแผงค่าแพทย์
6. Login ระบบด้วย user การเงิน > เมนู การเงิน
7. ค้นหา HN ของผู้ป่วย ER A > หน้ารายการค่าใช้จ่ายของ Visit ER

## Expected Result
หน้าการเงินของ Visit ER มีรายการค่าตรวจแพทย์ จำนวนเงิน 400

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1 · อ้างอิงพฤติกรรม OPD (SBH Prod 22 ต.ค. 2026: บันทึกค่าแพทย์ → การเงินได้รายการ "ค่าตรวจแพทย์")
```

### TC-SBH-3909-006 - แสดงค่าแพทย์ที่บันทึกไว้เมื่อเปิดเมนูค่าตรวจแพทย์อีกครั้ง

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Happy + QA Type : Functional + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-006
Case Type: Happy
Test Type: Functional

## Test Step
1. ทำต่อจาก TC-SBH-3909-005 (ผู้ป่วย ER A บันทึกค่าแพทย์ ต้องการเก็บ 400 แล้ว)
2. Login ระบบด้วย user แพทย์ ER > กด Patient Card ของผู้ป่วย ER A > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์"

## Expected Result
การเรียกเก็บ = "ต้องการเก็บ" · จำนวนเงิน = 400 · สถานะ "บันทึกแล้ว"

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1
```

### TC-SBH-3909-007 - บันทึกค่าแพทย์แบบไม่ต้องการเก็บแล้วตรวจสอบหน้าการเงิน

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Happy + QA Type : Integration + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-007
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user แพทย์ ER > เมนู ห้องฉุกเฉิน
2. กด Patient Card ของผู้ป่วย ER B > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์"
4. เลือก การเรียกเก็บ "ไม่ต้องการเก็บ"
5. กดปุ่ม "บันทึก" ของแผงค่าแพทย์
6. Login ระบบด้วย user การเงิน > เมนู การเงิน
7. ค้นหา HN ของผู้ป่วย ER B > หน้ารายการค่าใช้จ่ายของ Visit ER

## Expected Result
หน้าการเงินของ Visit ER ไม่มีรายการค่าตรวจแพทย์

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1 · Expected รอผู้ใช้ยืนยัน (การ์ดไม่ระบุผลฝั่งการเงินของ "ไม่ต้องการเก็บ")
```

---

## TS-SBH-3909-EDG - บันทึกค่าแพทย์ที่ค่าขอบของช่วงราคา 0 - 800

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3909-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER — ค่าตรวจแพทย์ (แผงค่าแพทย์)
- Requirement ที่อ้างอิง: SBH-3909 — [ER] [ ER Note ] เพิ่ม Section Doctor Free

วัตถุประสงค์
- ยืนยันว่าบันทึกค่าแพทย์ที่ขอบล่างและขอบบนของ "ราคาที่กำหนด 0 - 800" ได้ และยอดที่หน้าการเงินตรงกับที่บันทึก

ขอบเขต Requirement
- AC 1.1 อ้างอิงตาม OPD (รูปแสดง "ราคาที่กำหนด 0 - 800")

ความเสี่ยง
- ตรวจช่วงราคาผิดขอบ (เช่น ใช้ < แทน ≤) ทำให้บันทึก 0 หรือ 800 ไม่ได้
- ยอดที่ส่งไปการเงินไม่ตรงกับที่บันทึก

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ใช้ผู้ป่วย ER C ทำตามลำดับ
```

### TC-SBH-3909-008 - บันทึกค่าแพทย์จำนวนเงินเท่ากับขอบล่าง 0 แล้วตรวจสอบหน้าการเงิน

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Edge + QA Type : Integration + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-008
Case Type: Edge
Test Type: Integration

## Test Step
1. Login ระบบด้วย user แพทย์ ER > เมนู ห้องฉุกเฉิน
2. กด Patient Card ของผู้ป่วย ER C > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์" > เลือก "ต้องการเก็บ"
4. กรอกจำนวนเงิน 0
5. กดปุ่ม "บันทึก" ของแผงค่าแพทย์
6. Login ระบบด้วย user การเงิน > เมนู การเงิน
7. ค้นหา HN ของผู้ป่วย ER C > หน้ารายการค่าใช้จ่ายของ Visit ER

## Expected Result
บันทึกได้ (หัวแผงเป็น "บันทึกแล้ว") · หน้าการเงินไม่มียอดค่าตรวจแพทย์ที่ต้องชำระ (0 บาท)

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1 · เทคนิค: BVA — ขอบล่างของช่วง 0 - 800 (จากรูปในการ์ด)
```

### TC-SBH-3909-009 - บันทึกค่าแพทย์จำนวนเงินเท่ากับขอบบน 800 แล้วตรวจสอบหน้าการเงิน

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Edge + QA Type : Integration + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-009
Case Type: Edge
Test Type: Integration

## Test Step
1. ทำต่อจาก TC-SBH-3909-008 (ผู้ป่วย ER C)
2. Login ระบบด้วย user แพทย์ ER > กด Patient Card ของผู้ป่วย ER C > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์" > เลือก "ต้องการเก็บ"
4. กรอกจำนวนเงิน 800
5. กดปุ่ม "บันทึก" ของแผงค่าแพทย์
6. Login ระบบด้วย user การเงิน > เมนู การเงิน
7. ค้นหา HN ของผู้ป่วย ER C > หน้ารายการค่าใช้จ่ายของ Visit ER

## Expected Result
บันทึกได้ (หัวแผงเป็น "บันทึกแล้ว") · หน้าการเงินมีรายการค่าตรวจแพทย์ จำนวนเงิน 800

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1 · เทคนิค: BVA — ขอบบนของช่วง 0 - 800 (จากรูปในการ์ด)
```

---

## TS-SBH-3909-UHP - บันทึกค่าแพทย์ไม่ได้เมื่อจำนวนเงินอยู่นอกช่วง 0 - 800

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3909-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER — ค่าตรวจแพทย์ (แผงค่าแพทย์)
- Requirement ที่อ้างอิง: SBH-3909 — [ER] [ ER Note ] เพิ่ม Section Doctor Free

วัตถุประสงค์
- ยืนยันว่าระบบไม่ยอมให้บันทึกค่าแพทย์ที่อยู่นอก "ราคาที่กำหนด 0 - 800" และค่าที่ผิดไม่ไปถึงหน้าการเงิน

ขอบเขต Requirement
- AC 1.1 อ้างอิงตาม OPD (รูปแสดง "ราคาที่กำหนด 0 - 800")

ความเสี่ยง
- บันทึกค่าแพทย์เกินราคาที่กำหนด / ติดลบ แล้วไปเก็บเงินผู้ป่วยผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ข้อความเตือนที่ต้องแสดง การ์ดไม่ระบุ (ดู Requirement gap) — Expected ยึดแค่ "บันทึกไม่ได้"
- ใช้ผู้ป่วย ER C ต่อจาก TC-SBH-3909-009 (การเงินมีค่าตรวจแพทย์ 800 อยู่แล้ว)
```

### TC-SBH-3909-010 - ตรวจสอบบันทึกค่าแพทย์ไม่ได้เมื่อจำนวนเงินเกิน 800

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Unhappy + QA Type : Functional + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-010
Case Type: Unhappy
Test Type: Functional

## Test Step
1. ทำต่อจาก TC-SBH-3909-009 (ผู้ป่วย ER C บันทึกค่าแพทย์ 800 แล้ว)
2. Login ระบบด้วย user แพทย์ ER > กด Patient Card ของผู้ป่วย ER C > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์" > เลือก "ต้องการเก็บ"
4. กรอกจำนวนเงิน 801
5. กดปุ่ม "บันทึก" ของแผงค่าแพทย์
6. Login ระบบด้วย user การเงิน > เมนู การเงิน > ค้นหา HN ของผู้ป่วย ER C > หน้ารายการค่าใช้จ่ายของ Visit ER

## Expected Result
บันทึกไม่ได้ (มีข้อความเตือน หรือปุ่มบันทึกกดไม่ได้) · หน้าการเงินไม่มีรายการค่าตรวจแพทย์ 801 (ยังเป็น 800)

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1 · เทคนิค: BVA — ค่าที่เลยขอบบน 800
```

### TC-SBH-3909-011 - ตรวจสอบบันทึกค่าแพทย์ไม่ได้เมื่อจำนวนเงินติดลบ

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Doctor Fee + QA Case : Unhappy + QA Type : Functional + QA Execution Type : Manual

```
TC ID: TC-SBH-3909-011
Case Type: Unhappy
Test Type: Functional

## Test Step
1. ทำต่อจาก TC-SBH-3909-009 (ผู้ป่วย ER C บันทึกค่าแพทย์ 800 แล้ว)
2. Login ระบบด้วย user แพทย์ ER > กด Patient Card ของผู้ป่วย ER C > หน้าผู้ป่วย ER
3. กดเมนู "ค่าตรวจแพทย์" > เลือก "ต้องการเก็บ"
4. กรอกจำนวนเงิน -1
5. กดปุ่ม "บันทึก" ของแผงค่าแพทย์
6. Login ระบบด้วย user การเงิน > เมนู การเงิน > ค้นหา HN ของผู้ป่วย ER C > หน้ารายการค่าใช้จ่ายของ Visit ER

## Expected Result
บันทึกไม่ได้ (กรอกค่าติดลบไม่ได้ / มีข้อความเตือน / ปุ่มบันทึกกดไม่ได้) · หน้าการเงินไม่มีรายการค่าตรวจแพทย์ -1 (ยังเป็น 800)

## Test Result : (Env: Dev-X) (Status)

หมายเหตุ: AC 1.1 · เทคนิค: BVA — ค่าที่เลยขอบล่าง 0
```
