# Draft Test Structure — SBH-1123

> สถานะ: **สร้างใน Linear แล้ว (2026-10-21)**
> - EXE SBH-2856 (EXE - CT - 2.7.0) → HPY SBH-2857 (TC 001–004 = SBH-2859–2862) · UHP SBH-2858 (TC 005–006 = SBH-2863–2864)
> - QA Module: OPD · QA Sub-module / Feature : Visit Management · QA Run : Cycle Test · label 🐷 VERSION 2.7.0 ตามการ์ด
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · วงเล็บท้ายชื่อบอกหน้าที่ต้องดู
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)
> - Env: Dev-X / SBH Prod (default) · Run Type: CT (การ์ดผูก Cycle)

Requirement: SBH-1123 — [Walk-in Request] Note กดไม่ได้ แก้ไขให้มี note ของการ walk-in
URL: https://linear.app/cortexcloud/issue/SBH-1123
Project: [SBH] Go-live planning · Team: SBH Project · Priority: High · State: Testing · Cycle: ผูกแล้ว
Labels: 🐷 VERSION 2.7.0, 🍄 Improvement, Walk-in Management, For OPD Biz Sim - SBH · Assignee: Suchat Chancherngsilapakul
Sub-Issue: CTXN-8916 (Design — Done) · SBH-1466 / 1467 / 1468 (Dev cortex-x / ui / api — Done)

สิ่งที่ Dev ทำจริง (คอมเมนต์ Tinnapat 28 ส.ค. 2026 — "Merge to dev-x ทดสอบได้เลย")
- หน้าจัดการ Visit: เพิ่มคอลัมน์ "Note/Remark" (ช่องกรอกข้อความ) ในแถวรายการ ประเภท "คำขอ Walk-in"
- ข้อความที่กรอกไปแสดงที่หน้า รายการผู้ป่วยนอก > แท็บ "คำขอ Walk-in" คอลัมน์ "Note/Remark" (ต่อจาก Refer-in) · ไม่กรอก → แสดง "-"
- หน้าคำขอ Walk-in ปรับลำดับ Header ตาม Figma และตัดคอลัมน์ คิว / Queue ออก (ไม่มีไอคอน Note ที่กดไม่ได้แล้ว)
- ⚠️ ต่างจาก Business Solution ในการ์ดที่เขียนว่า "กด Action Note → เปิดหน้า / Dialog ดู/แก้ไข" — TC ชุดนี้อิงตามที่ Dev ทำจริง

| AC / Requirement | Expected Results | TC |
|---|---|---|
| AC1 / AC3 · "บันทึกและแสดงข้อมูล Note ตาม Workflow" | กรอก Note ตอนสร้างคำขอ Walk-in แล้วไปแสดงที่หน้าคำขอ Walk-in | 001, 002 |
| Business Solution "ไม่มี Note ต้องมี UI บ่งชี้" | ไม่กรอก Note → แสดง "-" | 003 |
| Business Solution "ย้าย Column Note ต่อจาก Refer-in" | คอลัมน์ Note/Remark อยู่ต่อจาก Refer-in | 004 |
| AC2 | ไม่มี Action / ไอคอน Note ที่แสดงแต่กดไม่ได้ | 005 |
| Business Solution "เพื่อไม่ให้ข้อมูลโดนทับ" | ข้อความ Note ยาวไม่ทับคอลัมน์อื่น | 006 |

ลำดับเทส: 001 → 002 → 004 → 005 → 006 → 003

---

## EXE - CT - 2.7.0

Labels: requirement labels + QA Module: OPD + QA Sub-module / Feature : Visit Management + QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.7.0
- Module: OPD / Walk-in Request
- Requirement ที่อ้างอิง: SBH-1123 — [Walk-in Request] Note กดไม่ได้ แก้ไขให้มี note ของการ walk-in
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- กรอก Note/Remark ตอนสร้างคำขอ Walk-in ที่หน้าจัดการ Visit
- แสดง Note/Remark ที่หน้าคำขอ Walk-in (มีข้อความ / ไม่มีข้อความ / ข้อความยาว)
- ตำแหน่งคอลัมน์ และไม่มี Action Note ที่กดไม่ได้ (AC2)
- ลำดับเทส: 001 → 002 → 004 → 005 → 006 → 003

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement และสิ่งที่ Dev ทำจริงตามคอมเมนต์ในการ์ด
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1123-HPY - บันทึก Note ตอนสร้างคำขอ Walk-in และแสดงที่หน้าคำขอ Walk-in

Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1123-HPY
- Case Type: Happy
- Suffix: HPY
- Module: OPD / Walk-in Request
- Requirement ที่อ้างอิง: SBH-1123

วัตถุประสงค์
- ยืนยันว่าเจ้าหน้าที่กรอก Note/Remark ตอนสร้างคำขอ Walk-in ได้ และหน้าคำขอ Walk-in แสดง Note ถูกต้องตำแหน่ง

ขอบเขต Requirement
- AC1, AC3 · Business Solution (ย้ายคอลัมน์ / UI บ่งชี้ว่าไม่มี Note)

ความเสี่ยง
- Note ที่กรอกไม่ถูกบันทึก หรือไม่ไปแสดงที่หน้าคำขอ Walk-in
- ผู้ใช้ต้องคลิกเข้าไปดูทีละรายการเพราะไม่รู้ว่ารายการไหนมี Note

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1123-001 - กรอก Note/Remark ตอนสร้างคำขอ Walk-in ได้ (หน้าจัดการ Visit)
Priority: High · Type: Functional
```
Test Step
1. Login ระบบด้วย user เวชระเบียน > ค้นหาคนไข้ทดสอบ > เปิดเมนูจัดการ Visit
2. เพิ่มรายการประเภท "คำขอ Walk-in" > เลือก Walk-in ไปคลินิก
3. ที่คอลัมน์ Note/Remark กรอก "ทดสอบใส่ note" > กดสร้าง

Expected Result
กรอกข้อความในช่อง Note/Remark ได้ และสร้างคำขอ Walk-in สำเร็จ
```

### TC-SBH-1123-002 - แสดง Note/Remark ตรงกับที่กรอกตอนสร้างคำขอ Walk-in (หน้าคำขอ Walk-in)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้คำขอ Walk-in จาก `TC-SBH-1123-001`
2. เปิดเมนูรายการผู้ป่วยนอก > แท็บ "คำขอ Walk-in" > หาแถวของคนไข้
3. ดูคอลัมน์ Note/Remark

Expected Result
คอลัมน์ Note/Remark แสดง "ทดสอบใส่ note" ตรงกับที่กรอก
```

### TC-SBH-1123-003 - แสดงขีดในคอลัมน์ Note/Remark เมื่อไม่ได้กรอก Note (หน้าคำขอ Walk-in)
Priority: Medium · Type: UIUX
```
Test Step
1. สร้างคำขอ Walk-in ให้คนไข้อีกราย โดยไม่กรอก Note/Remark (หน้าจัดการ Visit)
2. เปิดเมนูรายการผู้ป่วยนอก > แท็บ "คำขอ Walk-in" > หาแถวของคนไข้
3. ดูคอลัมน์ Note/Remark

Expected Result
คอลัมน์ Note/Remark แสดง "-" บอกว่าไม่มี Note โดยไม่ต้องคลิกเข้าไปดู
```

### TC-SBH-1123-004 - แสดงคอลัมน์ Note/Remark ต่อจากคอลัมน์ Refer-in (หน้าคำขอ Walk-in)
Priority: Medium · Type: UIUX
```
Test Step
1. เปิดเมนูรายการผู้ป่วยนอก > แท็บ "คำขอ Walk-in"
2. ดูลำดับหัวคอลัมน์ของตาราง

Expected Result
คอลัมน์ Note/Remark อยู่ถัดจากคอลัมน์ Refer-in
```

---

## TS-SBH-1123-UHP - ไม่มี Action Note ที่กดไม่ได้ และข้อความ Note ไม่ทับข้อมูลอื่น

Labels: requirement labels + QA Module + QA Sub-module + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1123-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: OPD / Walk-in Request
- Requirement ที่อ้างอิง: SBH-1123

วัตถุประสงค์
- ยืนยันว่าหน้าคำขอ Walk-in ไม่มีไอคอน Note ที่แสดงแต่ใช้ไม่ได้ (บั๊กเดิม) และข้อความ Note ยาวไม่ทับคอลัมน์อื่น

ขอบเขต Requirement
- AC2 · Business Solution "เพื่อไม่ให้ข้อมูลโดนทับ"

ความเสี่ยง
- ผู้ใช้กดไอคอนที่ไม่ทำงาน
- Note ยาวทับคอลัมน์คัดกรอง / จัดการ จนกดปุ่มไม่ได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1123-005 - ตรวจสอบไม่มีไอคอน Note ที่กดแล้วไม่ทำงาน (หน้าคำขอ Walk-in)
Priority: High · Type: Functional
```
Test Step
1. เปิดเมนูรายการผู้ป่วยนอก > แท็บ "คำขอ Walk-in"
2. ดูทุกคอลัมน์ของตาราง และลองกดในคอลัมน์ Note/Remark

Expected Result
ไม่มีไอคอน Note ที่แสดงแต่กดแล้วไม่ทำงาน คอลัมน์ Note/Remark แสดงเป็นข้อความ
```

### TC-SBH-1123-006 - ตรวจสอบข้อความ Note ยาวไม่ทับคอลัมน์อื่น (หน้าคำขอ Walk-in)
Priority: Medium · Type: UIUX
```
Test Step
1. สร้างคำขอ Walk-in โดยกรอก Note/Remark ยาว (เช่น ข้อความ 200 ตัวอักษร) (หน้าจัดการ Visit)
2. เปิดเมนูรายการผู้ป่วยนอก > แท็บ "คำขอ Walk-in" > หาแถวของคนไข้

Expected Result
ข้อความ Note แสดงอยู่ในคอลัมน์ Note/Remark ไม่ทับคอลัมน์คัดกรอง / จัดการ และยังกดปุ่มในแถวนั้นได้
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- การ์ดเขียนว่า "กด Action Note → เปิดหน้า / Dialog ดู/แก้ไข" แต่ Dev ทำเป็นช่องกรอกที่หน้าจัดการ Visit + คอลัมน์ข้อความ — ควรให้ BA ยืนยันว่ารับแบบที่ Dev ทำ
- แก้ไข Note หลังสร้างคำขอ Walk-in แล้วได้หรือไม่ (ที่หน้าไหน) — การ์ดไม่ระบุ
- Dev ตัดคอลัมน์ คิว / Queue ออกจากหน้าคำขอ Walk-in และเรียง Header ตาม Figma — ไม่อยู่ใน AC ควรยืนยันว่าตั้งใจ
- ความยาวสูงสุดของ Note — การ์ดไม่ระบุ (TC-006 ใช้ 200 ตัวอักษรเป็นตัวอย่าง)

Validation
- -

Error handling
- -

Permission / role
- -

Edge cases
- -
