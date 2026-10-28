# Draft Test Structure — SBH-1719

> สถานะ: **สร้างใน Linear แล้ว (2026-10-27)**
> - EXE SBH-2978 (EXE - CT - 2.9.0) → HPY SBH-2979 (TC 001–015 = SBH-2981–2995) · EDG SBH-2980 (TC 016–018 = SBH-2996–2998)
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee Suchat ทุกใบ · milestone ER – 4th -- Other documentation · TC ใช้ label `QA : Manual` ตามชุด SBH-694
> - ผู้ใช้ยืนยัน (27 ต.ค.): CT · Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Queue
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — ช่อง "สร้างโดย" ของทั้ง 21 ใบจึงเป็นชื่อนั้น
> - ผู้ใช้สั่ง (27 ต.ค.): ยึด Scope ตามการ์ดก่อน → ใช้เฉพาะคำอธิบาย 7 ข้อ + BA note · ข้อที่มาจากคอมเมนต์ handoff ของ Dev อย่างเดียวย้ายไปหัวข้อ "นอก Scope การ์ด" ท้ายไฟล์
> - ผู้ใช้สั่ง (27 ต.ค.) ตัดเพิ่ม 3 ข้อ: ย้ายคิวเดิมไป "เรียกแล้ว" (การ์ดไม่ได้บอก) · ซ่อน Tag เมื่อสิ้นสุดการกู้ชีพ (ยังทดสอบไม่ได้) · ไม่แสดง Tag "ข้อมูลจำลอง" (ไม่น่ามี Tag นี้)
> - ชุดนี้ = EXE 1 + Scenario 2 + TC 18 = 21 ใบ
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972

Requirement: SBH-1719 — [ER] [ QUEUE ] หน้าจอแสดง QUEUE List สำหรับผู้ป่วย
URL: https://linear.app/cortexcloud/issue/SBH-1719
Project: [SBH] ER · Team: SBH Project · Milestone: ER – 4th -- Other documentation · Priority: Urgent · State: Ready for Testing
Labels: 🍄 New Feature, Natthaphat ( MOD ) 🙈, VERSION 2.9.0 · Assignee: Thanadon (Modern) · ผูก Cycle อยู่ → Run Type = CT
Sub-Issue: CTXN-8885 (Design Task — Done) · ยังไม่มี EXE / TC
หน้าจอ: ER TV หน้าห้อง ER สำหรับผู้ป่วยและญาติ
การ์ดที่เกี่ยวข้อง: SBH-1026 (ปุ่ม Call QUEUE บน Cortex ER) · SBH-1854 (พิมพ์บัตรคิว ER)

| ที่มาในการ์ด | Expected | TC |
|---|---|---|
| คำอธิบาย (บรรทัดแรก) | ไม่เปิดเผยข้อมูลส่วนบุคคล | 007, 008 |
| ข้อ 1 ฝั่งซ้าย | คิวล่าสุด 1 คิวค้างไว้จนมีคิวใหม่หรือถูกเคลียร์ | 001, 002 |
| ข้อ 1 ฝั่งซ้าย | สี ส้ม / เขียว / เทา = เร่งด่วน / กึ่งเร่งด่วน / ไม่เร่งด่วน | 003, 004, 005 |
| ข้อ 2 ฝั่งขวา | ลำดับ ชื่อที่ mask สถานะการรักษา สูงสุด 8 รายต่อหน้า | 006, 007, 009 |
| ข้อ 3 | เปลี่ยนหน้าอัตโนมัติทุก 15 วินาที + progress แบบ IG Story | 010, 011, 012 |
| ข้อ 4 | Tag สีแดงกระพริบต่อท้ายหัวข้อเมื่อกำลังกู้ชีพ | 013 |
| BA note | Banner ประกาศเมื่อ Staff ER เปิดเมนู ประกาศหน้าจอผู้ป่วย | 014 |
| ข้อ 6 | ปุ่ม Full screen | 015 |
| ข้อ 5 | Empty state | 016, 017, 018 |
| ข้อ 7 | ลบ mock data และ Tag "ข้อมูลจำลอง" | ไม่สร้าง TC (ผู้ใช้สั่งตัด) · 001 ใช้คิวจริงอยู่แล้ว |

ข้อมูลตั้งต้นที่ต้องเตรียม: ผู้ป่วย ER ที่ลงทะเบียนและมีบัตรคิวแล้ว (SBH-1854) คัดกรองครบ 3 ระดับความเร่งด่วน · บัญชีเจ้าหน้าที่ ER ที่กด Call QUEUE ได้ (SBH-1026)
ข้อความ Empty state ใน TC 016–018 อ้างจากภาพ Design ที่แนบในการ์ด

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER – 4th -- Other documentation
Labels: 🍄 New Feature, Natthaphat ( MOD ) 🙈, Suchart ( Jame ) 🥷, VERSION 2.9.0, QA Module : ER, QA Sub-module / Feature : Queue, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-1719 — [ER] [ QUEUE ] หน้าจอแสดง QUEUE List สำหรับผู้ป่วย
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ฝั่ง "ดูคิวพบแพทย์": คิวที่กำลังเรียก สีตามความเร่งด่วน
- ฝั่ง "ดูสถานะผู้ป่วย": ลำดับ ชื่อที่ mask สถานะการรักษา สูงสุด 8 รายต่อหน้า
- เปลี่ยนหน้าอัตโนมัติทุก 15 วินาที + progress
- Tag กำลังกู้ชีพ · Banner ประกาศ · Full screen · Empty state
- ไม่เปิดเผยข้อมูลส่วนบุคคล

หมายเหตุ
- สร้างจากคำอธิบาย 7 ข้อ + BA note ของการ์ด (การ์ดไม่มีหัวข้อ AC แยก)
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1719-HPY - แสดงคิวพบแพทย์และสถานะผู้ป่วยบนจอ ER TV ระหว่างการทำงานปกติ

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1719-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-1719 — [ER] [ QUEUE ] หน้าจอแสดง QUEUE List สำหรับผู้ป่วย

วัตถุประสงค์
- ยืนยันว่าจอ TV แสดงคิวที่เรียกและสถานะผู้ป่วยตรงกับข้อมูลจริงใน ER อ่านง่าย และไม่เปิดเผยข้อมูลส่วนบุคคล

ขอบเขต Requirement
- คำอธิบายข้อ 1–4, 6
- BA note: Banner ประกาศหน้าจอผู้ป่วย

ความเสี่ยง
- ข้อมูลส่วนบุคคลของผู้ป่วยหลุดขึ้นจอสาธารณะ
- ผู้ป่วย / ญาติพลาดคิวเพราะคิวไม่ขึ้น หรือคิวหายก่อนเวลา

หมายเหตุ
- อิงตามคำอธิบายของ requirement
- เจ้าหน้าที่เรียกคิวผ่านปุ่ม Call QUEUE ของ SBH-1026
```

### TC-SBH-1719-001 - แสดงคิวที่กำลังเรียก 1 คิว หลังเจ้าหน้าที่กด Call QUEUE

Status: Not Run · Priority: Urgent · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
TC ID: TC-SBH-1719-001
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดจอ ER TV ค้างไว้
2. อีกแท็บ Login ด้วยเจ้าหน้าที่ ER > รายชื่อผู้ป่วย ER > กด Call QUEUE ที่ผู้ป่วย A (จดเลขคิว)
3. กลับไปดูจอ ER TV

## Expected Result
การ์ด "กำลังเรียก · คิวล่าสุด" แสดงเลขคิวของผู้ป่วย A เพียง 1 คิว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-002 - คงคิวที่กำลังเรียกไว้บนจอจนกว่าจะมีการเรียกคิวใหม่

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1719-002
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก `TC-SBH-1719-001` (คิวของผู้ป่วย A กำลังเรียกอยู่)
2. ไม่เรียกคิวใหม่ รอดูจอ 2 นาที (ผ่านการเปลี่ยนหน้าอัตโนมัติหลายรอบ)

## Expected Result
การ์ด "กำลังเรียก · คิวล่าสุด" ยังแสดงเลขคิวของผู้ป่วย A ตลอด ไม่หายเองตามเวลา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-003 - แสดงคิวของผู้ป่วยเร่งด่วนเป็นสีส้ม

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy + QA Type : UIUX + QA Execution Type: Manual

```
TC ID: TC-SBH-1719-003
Case Type: Happy
Test Type: UIUX

## Test Step
1. กด Call QUEUE ที่ผู้ป่วยที่คัดกรองเป็นระดับ "เร่งด่วน"
2. ดูคิวของผู้ป่วยรายนี้บนจอ ER TV ฝั่ง "ดูคิวพบแพทย์"

## Expected Result
คิวแสดงแถบสีส้ม พร้อมคำว่า "เร่งด่วน"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-004 - แสดงคิวของผู้ป่วยกึ่งเร่งด่วนเป็นสีเขียว

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-1719-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. กด Call QUEUE ที่ผู้ป่วยที่คัดกรองเป็นระดับ "กึ่งเร่งด่วน"
2. ดูคิวของผู้ป่วยรายนี้บนจอ ER TV ฝั่ง "ดูคิวพบแพทย์"

## Expected Result
คิวแสดงแถบสีเขียว พร้อมคำว่า "กึ่งเร่งด่วน"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-005 - แสดงคิวของผู้ป่วยไม่เร่งด่วนเป็นสีเทา

Status: Not Run · Priority: High · Labels: เหมือน TC-003

```
TC ID: TC-SBH-1719-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. กด Call QUEUE ที่ผู้ป่วยที่คัดกรองเป็นระดับ "ไม่เร่งด่วน"
2. ดูคิวของผู้ป่วยรายนี้บนจอ ER TV ฝั่ง "ดูคิวพบแพทย์"

## Expected Result
คิวแสดงแถบสีเทา พร้อมคำว่า "ไม่เร่งด่วน"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-006 - แสดงลำดับ ชื่อ-สกุล และสถานะการรักษา ของผู้ป่วยที่รักษาอยู่

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1719-006
Case Type: Happy
Test Type: Functional

## Test Step
1. มีผู้ป่วยที่รักษาอยู่ใน ER อย่างน้อย 1 ราย
2. เปิดจอ ER TV ดูฝั่ง "ดูสถานะผู้ป่วยที่รักษาอยู่"

## Expected Result
ตารางมี 3 คอลัมน์ "ลำดับ" · "ชื่อ - สกุล" · "สถานะการรักษา" · แต่ละแถวมีเลขลำดับเรียง 1, 2, 3, … และสถานะการรักษา 1 ค่า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-007 - แสดงชื่อ-สกุลของผู้ป่วยแบบ mask ไม่แสดงชื่อเต็ม

Status: Not Run · Priority: Urgent · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy + QA Type : Security + QA Execution Type: Manual

```
TC ID: TC-SBH-1719-007
Case Type: Happy
Test Type: Security

## Test Step
1. จดชื่อ-สกุลเต็มของผู้ป่วยที่รักษาอยู่ใน ER 1 ราย
2. เปิดจอ ER TV หาแถวของผู้ป่วยรายนี้

## Expected Result
ชื่อและนามสกุลแสดงบางส่วนตามด้วย xxxx (เช่น "สมชxxxx วัฒxxxx") ไม่แสดงชื่อ-สกุลเต็ม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-008 - ไม่แสดง HN / AN / VN ของผู้ป่วยบนจอ ER TV

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-007

```
TC ID: TC-SBH-1719-008
Case Type: Happy
Test Type: Security

## Test Step
1. จด HN และ VN ของผู้ป่วยที่รักษาอยู่ใน ER 1 ราย
2. เปิดจอ ER TV ดูทั้ง 2 ฝั่ง (รวมทุกหน้าที่เปลี่ยนอัตโนมัติ)

## Expected Result
ไม่มี HN / AN / VN ของผู้ป่วยแสดงบนจอ · เลขคิวเป็นเลขบัตรคิว (เช่น M60015) ไม่ใช่ HN

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-009 - แสดงผู้ป่วยไม่เกิน 8 รายต่อหน้า เมื่อมีผู้ป่วยมากกว่า 8 ราย

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1719-009
Case Type: Happy
Test Type: Functional

## Test Step
1. มีผู้ป่วยที่รักษาอยู่ใน ER มากกว่า 8 ราย
2. เปิดจอ ER TV ดูฝั่ง "ดูสถานะผู้ป่วยที่รักษาอยู่" ทุกหน้า

## Expected Result
แต่ละหน้าแสดงไม่เกิน 8 แถว · มีหน้ามากกว่า 1 หน้า ("หน้า 1 / N") · ลำดับต่อเนื่องข้ามหน้า (หน้า 2 เริ่มที่ 9)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-010 - เปลี่ยนหน้าคิวที่เรียกแล้วอัตโนมัติทุก 15 วินาที

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1719-010
Case Type: Happy
Test Type: Functional

## Test Step
1. มีคิว "เรียกแล้ว" มากกว่า 1 หน้า
2. เปิดจอ ER TV จับเวลาตั้งแต่ฝั่ง "ดูคิวพบแพทย์" ขึ้น "หน้า 1 / N"

## Expected Result
ฝั่งซ้ายเปลี่ยนเป็นหน้าถัดไปทุก 15 วินาที และวนกลับหน้า 1 หลังหน้าสุดท้าย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-011 - เปลี่ยนหน้าสถานะผู้ป่วยอัตโนมัติทุก 15 วินาที

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1719-011
Case Type: Happy
Test Type: Functional

## Test Step
1. มีผู้ป่วยที่รักษาอยู่มากกว่า 8 ราย (มากกว่า 1 หน้า)
2. เปิดจอ ER TV จับเวลาตั้งแต่ฝั่ง "ดูสถานะผู้ป่วยที่รักษาอยู่" ขึ้น "หน้า 1 / N"

## Expected Result
ฝั่งขวาเปลี่ยนเป็นหน้าถัดไปทุก 15 วินาที และวนกลับหน้า 1 หลังหน้าสุดท้าย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-012 - แสดง progress แบบ IG Story ตามจำนวนหน้าและหน้าปัจจุบัน

Status: Not Run · Priority: Low · Labels: เหมือน TC-003

```
TC ID: TC-SBH-1719-012
Case Type: Happy
Test Type: UIUX

## Test Step
1. ฝั่งใดฝั่งหนึ่งมี 2 หน้าขึ้นไป
2. ดูแถบ progress ใต้ "หน้า X / N" ระหว่างจอเปลี่ยนหน้า

## Expected Result
แถบ progress แบ่งเป็นช่องเท่าจำนวนหน้า · ช่องของหน้าปัจจุบันค่อยๆ เต็มภายใน 15 วินาที แล้วไปเริ่มช่องถัดไปเมื่อเปลี่ยนหน้า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-013 - แสดง Tag สีแดงกระพริบต่อท้ายหัวข้อ ขณะกำลังกู้ชีพ

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1719-013
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดจอ ER TV ค้างไว้ (ยังไม่มีการกู้ชีพ)
2. อีกแท็บ Login ด้วยเจ้าหน้าที่ ER > เริ่มกู้ชีพให้ผู้ป่วย 1 ราย (Start CPR บนฟอร์ม CPR Progression)
3. ดูจอ ER TV

## Expected Result
แสดง Tag สีแดงพร้อมจุดกระพริบ "กำลังกู้ชีพ · การรักษาอาจล่าช้า" ต่อท้ายหัวข้อ "ดูสถานะผู้ป่วยที่รักษาอยู่"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-014 - แสดง Banner ประกาศ เมื่อ Staff ER เปิดเมนู ประกาศหน้าจอผู้ป่วย

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1719-014
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดจอ ER TV ค้างไว้
2. อีกแท็บ Login ด้วยเจ้าหน้าที่ ER > เมนู "ประกาศหน้าจอผู้ป่วย" > เปิดประกาศ
3. ดูจอ ER TV

## Expected Result
จอแสดง Banner ข้อความ "📢 ขณะนี้มีผู้ป่วยฉุกเฉินจำนวนมาก การรักษาอาจล่าช้ากว่าปกติ ทีมงานดูแลตามความรุนแรงอาการอย่างเต็มที่ หากอาการท่านเปลี่ยนแปลง กรุณาแจ้งเจ้าหน้าที่ทันที ขออภัยในความไม่สะดวก"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-015 - แสดงหน้าจอเต็มจอเมื่อกดปุ่ม Full screen

Status: Not Run · Priority: Medium · Labels: เหมือน TC-003

```
TC ID: TC-SBH-1719-015
Case Type: Happy
Test Type: UIUX

## Test Step
1. เปิดจอ ER TV
2. กดปุ่ม Full screen มุมขวาบน

## Expected Result
หน้าจอแสดงเต็มจอ (ไม่มีแถบเบราว์เซอร์) ทั้ง 2 ฝั่งยังแสดงครบไม่ถูกตัด

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-1719-EDG - แสดง Empty state บนจอ ER TV เมื่อไม่มีคิวหรือไม่มีผู้ป่วย

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1719-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-1719 — [ER] [ QUEUE ] หน้าจอแสดง QUEUE List สำหรับผู้ป่วย

วัตถุประสงค์
- ยืนยันว่าจอแสดง Empty state ถูกต้องเมื่อไม่มีข้อมูลในแต่ละส่วน

ขอบเขต Requirement
- คำอธิบายข้อ 5: รองรับ Empty state เมื่อไม่มีคิวหรือไม่มีผู้ป่วย

ความเสี่ยง
- จอว่างเปล่าหรือค้างข้อมูลเก่าเมื่อไม่มีข้อมูล ทำให้ญาติเข้าใจผิด

หมายเหตุ
- อิงตามคำอธิบายของ requirement · ข้อความ Empty state อ้างจากภาพ Design ในการ์ด
- ต้องทดสอบตอนที่ ER ไม่มีคิว / ไม่มีผู้ป่วย (ดู Requirement gap)
```

### TC-SBH-1719-016 - แสดง "กรุณารอเรียกคิว" เมื่อไม่มีคิวที่กำลังเรียก

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge + QA Type : UIUX + QA Execution Type: Manual

```
TC ID: TC-SBH-1719-016
Case Type: Edge
Test Type: UIUX

## Test Step
1. ไม่มีคิวที่กำลังเรียกอยู่ (ยังไม่เคยเรียกคิว หรือคิวถูกเคลียร์แล้ว)
2. เปิดจอ ER TV ดูฝั่ง "ดูคิวพบแพทย์"

## Expected Result
พื้นที่คิวที่กำลังเรียกแสดง "กรุณารอเรียกคิว"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-017 - แสดง "ยังไม่มีคิวที่เรียกแล้ว" เมื่อไม่มีคิวที่เรียกแล้ว

Status: Not Run · Priority: Low · Labels: เหมือน TC-016

```
TC ID: TC-SBH-1719-017
Case Type: Edge
Test Type: UIUX

## Test Step
1. ไม่มีคิวที่เรียกแล้วในระบบ
2. เปิดจอ ER TV ดูหัวข้อ "เรียกแล้ว"

## Expected Result
หัวข้อ "เรียกแล้ว" แสดง "0 คิว" และ "ยังไม่มีคิวที่เรียกแล้ว"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1719-018 - แสดง "ไม่มีผู้ป่วยที่กำลังรับการรักษา" เมื่อไม่มีผู้ป่วย

Status: Not Run · Priority: Low · Labels: เหมือน TC-016

```
TC ID: TC-SBH-1719-018
Case Type: Edge
Test Type: UIUX

## Test Step
1. ไม่มีผู้ป่วยที่รักษาอยู่ใน ER
2. เปิดจอ ER TV ดูฝั่ง "ดูสถานะผู้ป่วยที่รักษาอยู่"

## Expected Result
แสดง "0 ราย" และ "ไม่มีผู้ป่วยที่กำลังรับการรักษา"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## ตัดออกแล้ว (ผู้ใช้สั่ง 27 ต.ค.)

ร่างแรกเก็บไว้ที่ scratchpad (SBH-1719_draft_v1.md) ถ้าจะเอากลับมาใส่

มาจากคอมเมนต์ handoff ของ Dev อย่างเดียว (นอก Scope การ์ด)
- เปิดจอ ER TV ผ่าน URL ได้โดยไม่ต้อง Login (คอมเมนต์ระบุ route เป็น public)
- ผู้ป่วยหายจากจอเมื่อ Discharge / เมื่อยกเลิก Visit ER
- กติกา mask ชื่อแบบละเอียด: ชื่อ 3 ตัว → ตัดตัวสุดท้าย + xxxx · ชื่อ 1 ตัว → xxxx
- คิวใหม่และ Tag กู้ชีพขึ้นบนจอภายใน 5 วินาที

ผู้ใช้ตัดหลัง review รอบ 2
- ย้ายคิวเดิมไปเป็นรายการแรกของ "เรียกแล้ว" เมื่อเรียกคิวใหม่ — การ์ดไม่ได้บอกว่าย้ายคิวได้
- ซ่อน Tag กำลังกู้ชีพ เมื่อสิ้นสุดการกู้ชีพ — ยังทดสอบไม่ได้ อย่าเพิ่งเทส
- ไม่แสดง Tag "ข้อมูลจำลอง" — ไม่น่ามี Tag นี้บนจอจริง

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- สถานะการรักษาบนจอมีค่าอะไรบ้าง และแต่ละขั้นตอนใน ER แสดงเป็นสถานะไหน — การ์ดไม่ระบุ (คอมเมนต์ Dev มี 8 ค่า แต่เขียนว่ายังต้องยืนยัน mapping กับ ER) จึงยังไม่สร้าง TC รายสถานะ
- การจัดระดับ เร่งด่วน / กึ่งเร่งด่วน / ไม่เร่งด่วน มาจากผลคัดกรองระดับไหน — การ์ดไม่ระบุ
- "กำลังกู้ชีพ" เกิดจากอะไร — การ์ดไม่ระบุ · ร่างนี้ใช้ Start CPR (TC-013) ต้องยืนยัน
- คิวเข้าไปอยู่ใน "เรียกแล้ว" เมื่อไหร่ — การ์ดบอกแค่ว่าแสดงคิวที่เรียกแล้ว ไม่บอกว่าคิวย้ายมาอย่างไร (กระทบการเตรียมข้อมูล TC 010, 017)
- Banner ประกาศ (BA note): ปิดประกาศได้อย่างไร และเมนู "ประกาศหน้าจอผู้ป่วย" อยู่ตรงไหน — ยังไม่สร้าง TC ปิดประกาศ
- คิวที่กำลังเรียก "ถูกเคลียร์" ทำจากปุ่มไหน — การ์ดไม่ระบุ (กระทบ TC-016)
- "เรียกแล้ว" แสดงกี่คิวต่อหน้า และเก็บย้อนหลังกี่คิว — การ์ดไม่ระบุ

Validation
- กติกา mask ชื่อ (เก็บกี่ตัว) การ์ดไม่ระบุ — TC-007 ตรวจแค่ว่าไม่แสดงชื่อเต็ม

Error handling
- -

Permission / role
- ใครเปิดเมนูประกาศและกด Call QUEUE ได้บ้าง — การ์ดไม่ระบุ

Edge cases
- Empty state (TC 016–018) ต้องการช่วงที่ ER ไม่มีคิว / ไม่มีผู้ป่วย — Dev-X ใช้ร่วมกันหลายคน อาจต้องขอ Dev ช่วยเตรียมสภาพนี้
- จำนวนผู้ป่วยพอดี 8 ราย (1 หน้า) vs 9 ราย — คุมจำนวนบน Dev-X ไม่ได้ จึงใช้แบบ "มากกว่า 8 ราย" (TC-009)
