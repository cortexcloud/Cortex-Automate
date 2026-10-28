# Draft Test Structure — SBH-2355

> สถานะ: **สร้างใน Linear แล้ว (2026-10-27)**
> - EXE SBH-2969 (EXE - RT - 2.9.0) → HPY SBH-2970 → TC 001–007 = SBH-2971–2977 (สถานะ Not Run · Priority Medium)
> - label ใหม่ที่สร้าง: QA Sub-module / Feature : Treatment Timeline
> - ⚠️ ช่อง "สร้างโดย" เป็น Neranchara Kaewsiri (บัญชีของ Linear MCP) · ผู้รับผิดชอบเป็น Suchat
> - ยืนยันแล้ว (27 ต.ค.): Run Type RT · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Treatment Timeline (label ใหม่ ต้องสร้าง) · TC เสริมเอาเฉพาะ 007 (ตัดข้อเสนอผู้ทำ ≠ ผู้เปิดดู)
> - รอผู้ใช้ review ร่างเต็ม แล้วพิมพ์ "สร้างได้" จึงจะสร้าง EXE 1 + Scenario 1 + TC 7 = 9 ใบ
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972

Requirement: SBH-2355 — [Bug[ER][Treatment Timeline] Event บางรายการแสดงชื่อ Account แทนชื่อ User
URL: https://linear.app/cortexcloud/issue/SBH-2355
Project: [SBH] ER · Team: SBH Project · Milestone: ER – 2nd -- Examination · Priority: Low · State: Ready for Testing
Labels: 🐞 BUG, Natthaphat ( MOD ) 🙈 · Assignee: Suchat Chancherngsilapakul · ไม่ผูก Cycle
Sub-Issue: ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี
PR ที่แนบ: cortex-api #2726 "[V2.9.0][BUG][SBH-2355] resolve ER timeline actors to practitioner names" → Scope / Version = 2.9.0 (ลำดับที่ 3 ของกติกา: การ์ดและ Cycle ไม่มีเวอร์ชัน)

การ์ดเป็นบั๊ก ไม่มี AC — ใช้ Expected Result ของการ์ด "ระบบต้องสามารถแสดงชื่อผู้ใช้งานได้ถูกต้อง" + รายการ Event 6 ข้อที่แสดงผิด (ข้อ 2.1–2.7 ในการ์ด ไม่มีข้อ 2.5)
วิธีทำให้เกิดแต่ละ Event อ้างจากตาราง Trigger ของการ์ดฟีเจอร์ SBH-1038 (Treatment Timeline)

| ข้อในการ์ด | Event บน Timeline | Trigger (จาก SBH-1038) | TC |
|---|---|---|---|
| 2.1 | แพทย์เริ่มการรักษา | กด Ack การแจ้งเตือน MEWS / GCS / Fast track (`start_treatment_by`) | 001 |
| 2.2 | แพทย์ตรวจเสร็จสิ้น | กด บันทึกเสร็จสิ้น บนฟอร์ม ER Physician Exam (`Completed_treatment_by`) | 002 |
| 2.3 | เริ่ม CPR | กด Start CPR บนฟอร์ม CPR Progression (`start_CPR_by`) | 003 |
| 2.4 | บันทึกรอบ CPR | กด Save CPR Progress ระหว่าง CPR | 004 |
| 2.6 | หยุด CPR | กด Stop CPR (`stop_CPR_by`) | 005 |
| 2.7 | คัดกรองซ้ำ | กด คัดกรองซ้ำ + บันทึก (`Retrigae_by`) | 006 |
| (เพิ่มจากความเสี่ยง) | Event ที่แสดงถูกอยู่แล้ว | เปิด ER Visit · คัดกรองครั้งแรก · ส่ง Order | 007 |

ชื่อที่ใช้เทียบ ("ชื่อผู้ใช้งานที่ถูกต้อง"): ชื่อที่แถว `เปิด ER Visit / ผู้ป่วยมาถึง` แสดงเมื่อทำด้วยบัญชีเดียวกัน — ในภาพของการ์ดคือ "นาย ทดสอบ มานะ" (บัญชี user1 บน Dev-X) · ชื่อที่ผิดคือ "user1 example"

---

## EXE - RT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER – 2nd -- Examination
Labels: 🐞 BUG, Natthaphat ( MOD ) 🙈, Suchart ( Jame ) 🥷, VERSION 2.9.0, QA Module : ER, QA Sub-module / Feature : Treatment Timeline (ใหม่), QA Run : Retest

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: RT
- Scope / Version: 2.9.0
- Module: ER / Treatment Timeline
- Requirement ที่อ้างอิง: SBH-2355 — [Bug[ER][Treatment Timeline] Event บางรายการแสดงชื่อ Account แทนชื่อ User
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ชื่อผู้ทำ ("โดย …") ของ 6 Event ที่การ์ดระบุ: แพทย์เริ่มการรักษา · แพทย์ตรวจเสร็จสิ้น · เริ่ม CPR · บันทึกรอบ CPR · หยุด CPR · คัดกรองซ้ำ
- Event ที่แสดงชื่อถูกอยู่แล้วต้องไม่เปลี่ยน: เปิด ER Visit · คัดกรองครั้งแรก · ส่ง Order

หมายเหตุ
- สร้างจาก Expected Result และรายการ Event ในการ์ดบั๊กโดยตรง (การ์ดไม่มี Acceptance Criteria)
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2355-HPY - แสดงชื่อผู้ใช้งานที่ทำรายการบน Event ของ Treatment Timeline

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + VERSION 2.9.0 + QA Module + QA Sub-module + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2355-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Treatment Timeline
- Requirement ที่อ้างอิง: SBH-2355 — [Bug[ER][Treatment Timeline] Event บางรายการแสดงชื่อ Account แทนชื่อ User

วัตถุประสงค์
- ยืนยันว่าทุก Event ที่การ์ดระบุ แสดงชื่อผู้ใช้งานที่ทำรายการ (ชื่อ Practitioner ของบัญชี) ไม่ใช่ชื่อ Account

ขอบเขต Requirement
- Expected Result ของการ์ด: ระบบต้องแสดงชื่อผู้ใช้งานได้ถูกต้อง
- Event ข้อ 2.1 · 2.2 · 2.3 · 2.4 · 2.6 · 2.7 ในการ์ด

ความเสี่ยง
- ย้อนดูไม่ได้ว่าใครเป็นผู้ทำ CPR / ตรวจเสร็จ / คัดกรองซ้ำ ซึ่งใช้ตรวจสอบย้อนหลังทางการแพทย์
- ตัวแก้เปลี่ยนวิธีหาชื่อผู้ทำของ Timeline ทั้งชุด อาจกระทบ Event ที่เคยแสดงถูก

หมายเหตุ
- อิงตาม Expected Result ของการ์ด (การ์ดบั๊ก ไม่มี AC)
- ข้อมูลตั้งต้น: บัญชี user1 (ตามการ์ด) · ผู้ป่วยทดสอบใหม่ เปิด Visit ER + คัดกรองครั้งแรกด้วยบัญชีเดียวกัน · TC 001–006 ใช้ผู้ป่วยรายเดียวต่อเนื่องกันได้
```

### TC-SBH-2355-001 - ตรวจสอบชื่อผู้ทำของ Event แพทย์เริ่มการรักษาบน Timeline แสดงชื่อผู้ใช้งาน

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + VERSION 2.9.0 + QA Module + QA Sub-module + QA Case : Happy + QA Type : Integration + QA : Manual

```
TC ID: TC-SBH-2355-001
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ด้วยบัญชี user1 > เปิด Visit ER ให้ผู้ป่วยรายใหม่ > บันทึกคัดกรองครั้งแรก ให้มีการแจ้งเตือน MEWS / GCS / Fast track อย่างน้อย 1 รายการ
2. ที่หน้า Visit ER กด Acknowledge การแจ้งเตือนนั้น
3. เปิดเมนูซ้าย "ประวัติการรักษา" > Encounter ER ของผู้ป่วยรายนี้ > แท็บ "Timeline"
4. ดูบรรทัด "โดย …" ของแถว "แพทย์เริ่มการรักษา" เทียบกับแถว "เปิด ER Visit / ผู้ป่วยมาถึง"

## Expected Result
แถว "แพทย์เริ่มการรักษา" แสดง "โดย <ชื่อผู้ใช้งานของ user1>" ชื่อเดียวกับแถว "เปิด ER Visit / ผู้ป่วยมาถึง"
ไม่แสดงชื่อ Account (เช่น "user1 example")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2355-002 - ตรวจสอบชื่อผู้ทำของ Event แพทย์ตรวจเสร็จสิ้นบน Timeline แสดงชื่อผู้ใช้งาน

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2355-002
Case Type: Happy
Test Type: Integration

## Test Step
1. ใช้ผู้ป่วยจาก `TC-SBH-2355-001` (บัญชี user1)
2. เปิดฟอร์ม ER Physician Exam > เลือก Diagnosis > กด บันทึกเสร็จสิ้น
3. เปิด ประวัติการรักษา > Encounter ER นี้ > แท็บ "Timeline"
4. ดูบรรทัด "โดย …" ของแถว "แพทย์ตรวจเสร็จสิ้น"

## Expected Result
แถว "แพทย์ตรวจเสร็จสิ้น" แสดง "โดย <ชื่อผู้ใช้งานของ user1>" ชื่อเดียวกับแถว "เปิด ER Visit / ผู้ป่วยมาถึง"
ไม่แสดงชื่อ Account (เช่น "user1 example")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2355-003 - ตรวจสอบชื่อผู้ทำของ Event เริ่ม CPR บน Timeline แสดงชื่อผู้ใช้งาน

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2355-003
Case Type: Happy
Test Type: Integration

## Test Step
1. ใช้ผู้ป่วยจาก `TC-SBH-2355-001` (บัญชี user1)
2. เปิดเมนู CPR Progression > เลือก Rhythm > กด Start CPR
3. เปิด ประวัติการรักษา > Encounter ER นี้ > แท็บ "Timeline"
4. ดูบรรทัด "โดย …" ของแถว "เริ่ม CPR"

## Expected Result
แถว "เริ่ม CPR" แสดง "โดย <ชื่อผู้ใช้งานของ user1>" ชื่อเดียวกับแถว "เปิด ER Visit / ผู้ป่วยมาถึง"
ไม่แสดงชื่อ Account (เช่น "user1 example")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2355-004 - ตรวจสอบชื่อผู้ทำของ Event บันทึกรอบ CPR ทุกรอบบน Timeline แสดงชื่อผู้ใช้งาน

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2355-004
Case Type: Happy
Test Type: Integration

## Test Step
1. ต่อจาก `TC-SBH-2355-003` (CPR ยังไม่หยุด · บัญชี user1)
2. ที่ฟอร์ม CPR Progression กด Save CPR Progress 2 รอบ
3. เปิด ประวัติการรักษา > Encounter ER นี้ > แท็บ "Timeline"
4. ดูบรรทัด "โดย …" ของแถว "บันทึกรอบ CPR" ทั้ง 2 แถว

## Expected Result
แถว "บันทึกรอบ CPR" ทั้ง 2 แถว แสดง "โดย <ชื่อผู้ใช้งานของ user1>" ชื่อเดียวกับแถว "เปิด ER Visit / ผู้ป่วยมาถึง"
ไม่มีแถวไหนแสดงชื่อ Account (เช่น "user1 example")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2355-005 - ตรวจสอบชื่อผู้ทำของ Event หยุด CPR บน Timeline แสดงชื่อผู้ใช้งาน

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2355-005
Case Type: Happy
Test Type: Integration

## Test Step
1. ต่อจาก `TC-SBH-2355-004` (บัญชี user1)
2. ที่ฟอร์ม CPR Progression กด Stop CPR
3. เปิด ประวัติการรักษา > Encounter ER นี้ > แท็บ "Timeline"
4. ดูบรรทัด "โดย …" ของแถว "หยุด CPR"

## Expected Result
แถว "หยุด CPR" แสดง "โดย <ชื่อผู้ใช้งานของ user1>" ชื่อเดียวกับแถว "เปิด ER Visit / ผู้ป่วยมาถึง"
ไม่แสดงชื่อ Account (เช่น "user1 example")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2355-006 - ตรวจสอบชื่อผู้ทำของ Event คัดกรองซ้ำบน Timeline แสดงชื่อผู้ใช้งาน

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2355-006
Case Type: Happy
Test Type: Integration

## Test Step
1. ใช้ผู้ป่วยจาก `TC-SBH-2355-001` (บัญชี user1)
2. ที่แท็บ Triage ของหน้า Overview กด คัดกรองซ้ำ > เลือกระดับความเร่งด่วน + GCS > กด บันทึก
3. เปิด ประวัติการรักษา > Encounter ER นี้ > แท็บ "Timeline"
4. ดูบรรทัด "โดย …" ของแถว "คัดกรองซ้ำ" เทียบกับแถว "คัดกรองครั้งแรก"

## Expected Result
แถว "คัดกรองซ้ำ" แสดง "โดย <ชื่อผู้ใช้งานของ user1>" ชื่อเดียวกับแถว "เปิด ER Visit / ผู้ป่วยมาถึง"
ไม่แสดงชื่อ Account (เช่น "user1 example")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2355-007 - ตรวจสอบ Event ที่เคยแสดงชื่อถูกต้องยังแสดงชื่อผู้ใช้งานเหมือนเดิมหลังแก้ไข

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2355-007
Case Type: Happy
Test Type: Integration

## Test Step
1. ใช้ผู้ป่วยจาก `TC-SBH-2355-001` (บัญชี user1) > สั่ง Order 1 รายการ > กด ส่งคำสั่ง
2. เปิด ประวัติการรักษา > Encounter ER นี้ > แท็บ "Timeline"
3. ดูบรรทัด "โดย …" ของแถว "เปิด ER Visit / ผู้ป่วยมาถึง" · "คัดกรองครั้งแรก" · "ส่ง Order"

## Expected Result
ทั้ง 3 แถวแสดง "โดย <ชื่อผู้ใช้งานของ user1>" ไม่มีแถวไหนเปลี่ยนเป็นชื่อ Account หรือว่าง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

> ที่มา: ความเสี่ยงของตัวแก้ (PR เปลี่ยนวิธีหาชื่อผู้ทำของ Timeline ทั้งชุด) — ไม่อยู่ในรายการ Event ของการ์ด

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- "ชื่อผู้ใช้งานที่ถูกต้อง" การ์ดไม่ได้นิยาม — ร่างนี้ใช้ชื่อ Practitioner ของบัญชี (ตามชื่อ PR) โดยเทียบกับแถว เปิด ER Visit ที่ทำด้วยบัญชีเดียวกัน
- SBH Prod 12 ต.ค. 2026 แถว "คัดกรองครั้งแรก" แสดงชื่อแพทย์ของ Visit ("ดร. วิชัย รัตน์ เอื้อเฟื้อ") ไม่ใช่ชื่อของบัญชีที่คัดกรอง — ไม่แน่ใจว่าบน Prod ชื่อที่ใช้เทียบควรเป็นชื่อไหน
- Encounter เก่าที่บันทึกก่อนแก้ (เช่น ผู้ป่วยในภาพของการ์ด 25/09/2026) จะแสดงชื่อถูกด้วยหรือเฉพาะรายการใหม่ — การ์ดไม่ระบุ จึงยังไม่สร้าง TC

Validation
- -

Error handling
- บัญชีที่ไม่ได้ผูก Practitioner ทำรายการ ต้องแสดงอะไร (ชื่อ Account / "-" / ว่าง) — การ์ดไม่ระบุ

Permission / role
- การ์ดใช้บัญชี User1 อย่างเดียว · Trigger ใน SBH-1038 ระบุผู้ทำเป็นแพทย์ / พยาบาล — ไม่ระบุว่าต้องเทสแยก role หรือไม่
- ทำ Event ด้วยบัญชีหนึ่งแล้วเปิดดูด้วยอีกบัญชี (ตรวจว่าไม่ได้ดึงชื่อคนที่ล็อกอินอยู่) — เสนอเป็น TC แล้ว ผู้ใช้เลือกไม่ใส่ (27 ต.ค.)

Edge cases
- "แพทย์เริ่มการรักษา" ใช้เวลาน้อยสุดเมื่อ Ack หลายรายการ — ถ้า Ack โดยคนละบัญชี ผู้ทำควรเป็นคนที่ Ack ก่อน (การ์ดไม่ระบุ)
- "คัดกรองซ้ำ" มากกว่า 1 ครั้ง (SBH-1038 เขียนว่าเอาเวลาล่าสุด) — การ์ดไม่ระบุว่าทุกแถวต้องแสดงชื่อของรอบนั้นเอง
