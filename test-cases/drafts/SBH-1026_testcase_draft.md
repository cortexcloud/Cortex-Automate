# Draft Test Structure — SBH-1026

> สถานะ: **สร้างใน Linear แล้ว (2026-10-27)**
> - EXE SBH-3024 (EXE - CT - 2.9.0) → HPY SBH-3025 (TC 001–003 = SBH-3026–3028)
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee Suchat ทุกใบ · milestone ER - เก็บตก, edge case · TC ใช้ label `QA : Manual` ตามชุด SBH-1719
> - ผู้ใช้สั่ง (27 ต.ค.): เพิ่ม TC-003 แล้วสร้างเลย · ค่าที่ใช้ CT · 2.9.0 · Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Queue
> - ชุดนี้ = EXE 1 + Scenario 1 + TC 3 = 5 ใบ
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — assignee ต้องใส่ ID ของ Suchat เอง · ช่อง "สร้างโดย" จะเป็นชื่อ Neranchara

Requirement: SBH-1026 — [ER][In ER Zone] Call Queue Menu
URL: https://linear.app/cortexcloud/issue/SBH-1026/erin-er-zone-call-queue-menu
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: High · State: Ready for Testing
Labels: Natthaphat ( MOD ) 🙈, VERSION 2.9.0 · Assignee: Thanadon (Modern) · ผูก Cycle อยู่ → Run Type = CT
Sub-Issue: ไม่มี · คอมเมนต์: ไม่มี
PR ที่ผูก: cortex-api#2879 (add ER queue-call API) · cortex-ui#2487 (add ER call-queue action) — ชื่อ PR เขียน **V2.10.0** แต่ label การ์ดเป็น VERSION 2.9.0
หน้าจอ: Cortex ER > แดชบอร์ด / คิว > แท็บ "ผู้ป่วยปัจจุบันใน ER" (ภาพในการ์ด) · จอปลายทาง = ER TV ของ SBH-1719
การ์ดที่เกี่ยวข้อง: SBH-1719 (จอ ER TV — สร้าง TC แล้ว SBH-2978) · SBH-1854 (พิมพ์บัตรคิว ER)

| ที่มาในการ์ด | Expected | TC |
|---|---|---|
| AC 1 + AC 2.1 | มีปุ่ม Call QUEUE ที่คอลัมน์ "คิว" แทนเลขคิว | 001 |
| AC 2 | กดแล้วเรียกผู้ป่วยขึ้นจอ ER TV | 002 |
| BA note | แดชบอร์ด ER ใช้ดูคิว (อ้าง SBH-1719) | ไม่สร้าง TC — เป็นขอบเขตของ SBH-1719 |

ข้อมูลตั้งต้นที่ต้องเตรียม: ผู้ป่วย ER ที่ลงทะเบียนและมีบัตรคิวแล้ว (SBH-1854) อยู่ในแท็บ "ผู้ป่วยปัจจุบันใน ER" · บัญชีเจ้าหน้าที่ ER
TC-002 ซ้อนกับ `TC-SBH-1719-001` (เส้นทางเดียวกัน แต่คนละมุม: 1026 ตรวจปุ่มเรียกคิว · 1719 ตรวจการแสดงผลบนจอ TV) — รันครั้งเดียวแนบคลิปแยกตาม TC ได้

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, Suchart ( Jame ) 🥷, VERSION 2.9.0, QA Module : ER, QA Sub-module / Feature : Queue, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-1026 — [ER][In ER Zone] Call Queue Menu
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ปุ่ม Call QUEUE ที่คอลัมน์ "คิว" ของแดชบอร์ด / คิว ER แท็บ "ผู้ป่วยปัจจุบันใน ER"
- กด Call QUEUE แล้วเรียกผู้ป่วยขึ้นจอ ER TV

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1026-HPY - เรียกคิวผู้ป่วยขึ้นจอ ER TV ด้วยปุ่ม Call QUEUE บนแดชบอร์ด ER

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1026-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Queue
- Requirement ที่อ้างอิง: SBH-1026 — [ER][In ER Zone] Call Queue Menu

วัตถุประสงค์
- ยืนยันว่าเจ้าหน้าที่ ER เรียกคิวผู้ป่วยจากแดชบอร์ด ER ได้ และคิวขึ้นจอ ER TV ให้ผู้ป่วย / ญาติเห็น

ขอบเขต Requirement
- AC 1: เพิ่มปุ่ม Call QUEUE บน Cortex ER
- AC 2: ใช้ Call QUEUE เรียกผู้ป่วยขึ้นจอ TV · วางที่คอลัมน์ "คิว" แทนเลขคิว

ความเสี่ยง
- กดเรียกแล้วคิวไม่ขึ้นจอ TV หรือขึ้นผิดคน ผู้ป่วยพลาดคิว

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- จอ ER TV เป็นของ SBH-1719
```

### TC-SBH-1026-001 - แสดงปุ่ม Call QUEUE ที่คอลัมน์คิวแทนเลขคิว ในแท็บผู้ป่วยปัจจุบันใน ER

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-1026-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ด้วยเจ้าหน้าที่ ER > เมนู แดชบอร์ด / คิว
2. เลือกแท็บ "ผู้ป่วยปัจจุบันใน ER"
3. ดูคอลัมน์ "คิว" ของผู้ป่วยที่มีบัตรคิวแล้ว

## Expected Result
คอลัมน์ "คิว" แสดงปุ่ม Call QUEUE ในตำแหน่งที่เคยแสดงเลขคิว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1026-002 - เรียกคิวผู้ป่วยขึ้นจอ ER TV เมื่อกดปุ่ม Call QUEUE

Status: Not Run · Priority: Urgent · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-1026-002
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดจอ ER TV ค้างไว้
2. อีกแท็บ Login ด้วยเจ้าหน้าที่ ER > แดชบอร์ด / คิว > แท็บ "ผู้ป่วยปัจจุบันใน ER"
3. กด Call QUEUE ที่แถวผู้ป่วย A (จดเลขคิวจากบัตรคิวของผู้ป่วย A)
4. กลับไปดูจอ ER TV

## Expected Result
จอ ER TV แสดงเลขคิวของผู้ป่วย A เป็นคิวที่กำลังเรียก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1026-003 - จอ ER TV เปลี่ยนเป็นคิวของผู้ป่วยรายใหม่ เมื่อกด Call QUEUE ผู้ป่วยรายอื่นต่อ

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-1026-003
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก `TC-SBH-1026-002` (คิวของผู้ป่วย A กำลังเรียกอยู่บนจอ ER TV)
2. ที่แดชบอร์ด / คิว แท็บ "ผู้ป่วยปัจจุบันใน ER" กด Call QUEUE ที่แถวผู้ป่วย B (จดเลขคิวจากบัตรคิวของผู้ป่วย B)
3. กลับไปดูจอ ER TV

## Expected Result
จอ ER TV เปลี่ยนจากคิวของผู้ป่วย A เป็นคิวของผู้ป่วย B เป็นคิวที่กำลังเรียก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

หมายเหตุ: TC-003 การ์ดไม่ได้เขียนไว้ตรงๆ — ผู้ใช้สั่งเพิ่ม (27 ต.ค.) เพื่อตรวจว่าปุ่มเรียกคนถัดไปได้ ไม่ค้างคิวแรก

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- ชื่อปุ่ม: การ์ดเขียน "Call QUEUE" แต่ชื่อไฟล์ทดสอบของ Dev ที่แนบมาใช้ "เรียกคิว" — ต้องยืนยันข้อความบนปุ่ม (กระทบ Expected ของ TC-001)
- "แทน number queue": เลขคิวยังแสดงอยู่บนปุ่ม / ข้างปุ่มหรือไม่ — การ์ดไม่ระบุ
- กดเรียกผู้ป่วยรายเดิมซ้ำ จอ TV ทำอะไร (เรียกซ้ำ / ไม่เปลี่ยน) — การ์ดไม่ระบุ
- หลังกดเรียกแล้ว ปุ่มหรือแถวผู้ป่วยบนแดชบอร์ดเปลี่ยนสถานะไหม (เช่น บอกว่าเรียกแล้ว) — การ์ดไม่ระบุ
- Version: label การ์ด VERSION 2.9.0 แต่ชื่อ PR เป็น V2.10.0 — ร่างนี้ใช้ 2.9.0 ตาม label

Validation
- ผู้ป่วยที่ยังไม่มีบัตรคิว (เช่น ไม่ได้พิมพ์บัตรคิวตาม SBH-1854) แสดงปุ่มหรือไม่ / กดได้ไหม — การ์ดไม่ระบุ

Error handling
- กดเรียกแล้วส่งไปจอ TV ไม่สำเร็จ ระบบแจ้งอะไร — การ์ดไม่ระบุ

Permission / role
- role ไหนเห็น / กดปุ่ม Call QUEUE ได้ — การ์ดไม่ระบุ

Edge cases
- ปุ่มแสดงเฉพาะแท็บ "ผู้ป่วยปัจจุบันใน ER" หรือทุกแท็บ (รับ Refer / รอเตียง / รอจำหน่าย ฯลฯ) — ชื่อการ์ด "[In ER Zone]" แต่ AC ไม่ระบุ
- เจ้าหน้าที่ 2 คนกดเรียกคนละผู้ป่วยพร้อมกัน จอ TV แสดงคิวไหน — การ์ดไม่ระบุ
