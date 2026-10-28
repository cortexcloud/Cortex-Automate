# Draft Test Structure — SBH-2618

> สถานะ: **สร้างใน Linear แล้ว (2026-10-27)** — Run Type CT · 2.9.0 · Env Dev-X / SBH Prod · สร้าง label ใหม่ "QA Sub-module / Feature : Nurse Task List"
> - EXE SBH-3097 · TS-HPY SBH-3098 (TC-001–006 = SBH-3100–3105) · TS-EDG SBH-3099 (TC-007–009 = SBH-3106–3108)
> - label ของ TC ใช้ "QA : Manual" ตามชุด SBH-2530 ที่สร้างก่อนหน้า (แทน "QA Execution Type: Manual" ในร่าง)
> - "สร้างโดย" เป็น Neranchara Kaewsiri (บัญชีของ connector) · assignee = Suchat Chancherngsilapakul

Requirement: SBH-2618 — [ER ] [ Nurse Task list ] Redesign
URL: https://linear.app/cortexcloud/issue/SBH-2618/er-nurse-task-list-redesign
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: Ready for Testing
Labels: (ไม่มี) · Cycle: ไม่ผูก · Assignee: Suchat Chancherngsilapakul · Created by: Natthaphat(MOD)
Sub-Issue: CTXN-11963 "Design Task" (On Hold) · ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี
PR ที่แนบ: cortex-ui #2389 "apply er nurse task list acceptance criteria" · cortex-api #2765 "scope er nurse task roster to the current er queue" (ขึ้นต้น V2.9.0 ทั้งคู่)
หน้าจอ: ER > รายการงานพยาบาล (`/cortex/er/nurse-task-list`)

## AC ในการ์ด

1. ผู้ป่วยที่ออกจาก ER → ไม่ต้องแสดง
2. แสดงเฉพาะผู้ป่วยที่มี order
3. ตัดส่วนที่อยู่ในกรอบฟ้า (ภาพในการ์ด: คอลัมน์ "ประเภท" · คอลัมน์ "ผู้รับผิดชอบ" + "Note" · กลุ่ม "ออกจาก ER (28)" ฝั่งซ้าย)
4. เรียงผู้ป่วยตาม Clinical → 4.1 แยกตามโซน

(คำอธิบายบนสุด "ปรับสี / ปรับความสวยงาม" ไม่มีรายละเอียดที่ตรวจได้ → ไม่มี TC ดู gap ท้ายไฟล์)

## ตาราง AC → TC

| AC | เนื้อหาย่อ | TC |
|---|---|---|
| 1 + 3 (กรอบซ้าย) | ไม่แสดงผู้ป่วยที่ออกจาก ER / กลุ่ม "ออกจาก ER" | 001, 008 |
| 2 | แสดงเฉพาะผู้ป่วยที่มี order | 002, 003, 007 |
| 3 (กรอบ "ประเภท") | ตัดคอลัมน์ประเภท | 004 |
| 3 (กรอบ "ผู้รับผิดชอบ / Note") | ตัดคอลัมน์ผู้รับผิดชอบ และ Note | 005 |
| 4.1 | แยกผู้ป่วยตามโซน | 006, 009 |
| 4 | เรียงผู้ป่วยตาม Clinical | — ยังไม่มี TC (การ์ดไม่บอกว่า "Clinical" เรียงตามอะไร ดู gap) |
| คำอธิบาย | ปรับสี / ปรับความสวยงาม | — ยังไม่มี TC (ไม่มี spec / Design Task On Hold) |

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Suchart ( Jame ) 🥷, VERSION 2.9.0, QA Module : ER, QA Sub-module / Feature : Nurse Task List (ใหม่), QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: ER / Nurse Task List
- Requirement ที่อ้างอิง: SBH-2618 — [ER ] [ Nurse Task list ] Redesign
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- รายชื่อผู้ป่วยฝั่งซ้าย: ไม่แสดงผู้ป่วยที่ออกจาก ER · แสดงเฉพาะผู้ป่วยที่มี order · แยกตามโซน
- ตารางงานพยาบาล: ตัดคอลัมน์ ประเภท · ผู้รับผิดชอบ · Note
- การเปลี่ยนสถานะผู้ป่วย (มี order แรก · จำหน่ายออกจาก ER · ย้ายโซน) สะท้อนในรายชื่อ

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2618-HPY - แสดงรายชื่อผู้ป่วยและตารางงานในหน้ารายการงานพยาบาลตามรูปแบบใหม่

Status: Ready for Testing · Labels: Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2618-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Nurse Task List
- Requirement ที่อ้างอิง: SBH-2618 — [ER ] [ Nurse Task list ] Redesign

วัตถุประสงค์
- ยืนยันว่าหน้ารายการงานพยาบาลแสดงเฉพาะผู้ป่วยที่ยังอยู่ใน ER และมี order แยกตามโซน และตารางงานไม่มีคอลัมน์ที่ตัดออก

ขอบเขต Requirement
- AC 1 · AC 2 · AC 3 · AC 4.1

ความเสี่ยง
- พยาบาลเห็นผู้ป่วยที่ออกจาก ER ไปแล้ว หรือผู้ป่วยที่ไม่มีงาน ทำให้รายชื่อยาวและหางานที่ต้องทำยาก
- ผู้ป่วยที่มี order หายจากรายชื่อ ทำให้งานพยาบาลตกหล่น

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ข้อมูลตั้งต้น: ผู้ป่วย A อยู่ใน ER (มีโซน) และมี order Lab / รังสีที่ส่งแล้ว · ผู้ป่วย B อยู่ใน ER แต่ยังไม่มี order · ผู้ป่วย C จำหน่ายออกจาก ER แล้ว (เคยมี order)
```

### TC-SBH-2618-001 - ตรวจสอบรายชื่อผู้ป่วยฝั่งซ้ายไม่แสดงกลุ่ม "ออกจาก ER" และไม่แสดงผู้ป่วยที่ออกจาก ER แล้ว

Status: Not Run · Priority: High · Labels: Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
TC ID: TC-SBH-2618-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login พยาบาล ER > เมนู ER > "รายการงานพยาบาล" > กด "วันนี้"
2. ดูรายชื่อผู้ป่วยฝั่งซ้ายทุกกลุ่ม (กางทุกโซน)
3. ค้นหา HN ผู้ป่วย C ในช่อง "HN / ชื่อ-นามสกุล"

## Expected Result
ไม่มีกลุ่ม "ออกจาก ER" ในรายชื่อฝั่งซ้าย · ไม่พบผู้ป่วย C ในรายชื่อ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2618-002 - แสดงผู้ป่วยที่อยู่ใน ER และมี order ในรายชื่อผู้ป่วย

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2618-002
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้า "รายการงานพยาบาล" > กด "วันนี้"
2. กางโซนที่ผู้ป่วย A อยู่ > หาผู้ป่วย A
3. กดชื่อผู้ป่วย A

## Expected Result
พบผู้ป่วย A ในรายชื่อ · กดแล้วตารางด้านขวาแสดงงานจาก order ของผู้ป่วย A

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2618-003 - ตรวจสอบรายชื่อผู้ป่วยไม่แสดงผู้ป่วยที่อยู่ใน ER แต่ยังไม่มี order

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2618-003
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดหน้า "รายการงานพยาบาล" > กด "วันนี้"
2. กางทุกโซน > หาผู้ป่วย B
3. ค้นหา HN ผู้ป่วย B ในช่อง "HN / ชื่อ-นามสกุล"

## Expected Result
ไม่พบผู้ป่วย B ในรายชื่อทุกโซน (รวมกลุ่ม "รอ")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2618-004 - ตรวจสอบตารางงานพยาบาลไม่แสดงคอลัมน์ "ประเภท"

Status: Not Run · Priority: Medium · Labels: Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Happy + QA Type : UIUX + QA Execution Type: Manual

```
TC ID: TC-SBH-2618-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. เปิดหน้า "รายการงานพยาบาล" > กดผู้ป่วย A
2. ดูหัวตารางงาน และแถวงานทุกกลุ่ม (Imaging / Specimen / Nurse added)

## Expected Result
ไม่มีคอลัมน์ "ประเภท" และไม่มีป้ายประเภท (Imaging / Specimen / Nurse added) ในแต่ละแถว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2618-005 - ตรวจสอบตารางงานพยาบาลไม่แสดงคอลัมน์ "ผู้รับผิดชอบ" และ "Note"

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2618-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. เปิดหน้า "รายการงานพยาบาล" > กดผู้ป่วย A
2. ดูหัวตารางงาน และแถวงานทุกแถว

## Expected Result
ไม่มีคอลัมน์ "ผู้รับผิดชอบ" (dropdown เลือกผู้รับผิดชอบ) และคอลัมน์ "Note" (ลิงก์ "เพิ่ม Note")

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2618-006 - แสดงผู้ป่วยแยกตามโซนที่ผู้ป่วยอยู่ปัจจุบัน

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2618-006
Case Type: Happy
Test Type: Functional

## Test Step
1. เตรียมผู้ป่วยที่มี order อย่างน้อย 2 โซน (เช่น โซนแดง 1 ราย · โซนเหลือง 1 ราย)
2. เปิดหน้า "รายการงานพยาบาล" > กด "วันนี้"
3. กางแต่ละโซน > เทียบกับโซนของผู้ป่วยบนแดชบอร์ด ER

## Expected Result
ผู้ป่วยแต่ละรายอยู่ใต้หัวโซนที่ตรงกับโซนบนแดชบอร์ด ER · ตัวเลขหลังชื่อโซนตรงกับจำนวนผู้ป่วยในโซนนั้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2618-EDG - รายชื่อผู้ป่วยในหน้ารายการงานพยาบาลเปลี่ยนตามสถานะผู้ป่วย

Status: Ready for Testing · Labels: Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2618-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / Nurse Task List
- Requirement ที่อ้างอิง: SBH-2618 — [ER ] [ Nurse Task list ] Redesign

วัตถุประสงค์
- ยืนยันว่าเมื่อผู้ป่วยเปลี่ยนสถานะ (มี order แรก · จำหน่ายออกจาก ER · ย้ายโซน) รายชื่อในหน้ารายการงานพยาบาลเปลี่ยนตาม

ขอบเขต Requirement
- AC 1 · AC 2 · AC 4.1

ความเสี่ยง
- รายชื่อค้างค่าเดิม ทำให้ผู้ป่วยที่เพิ่งมี order ไม่ขึ้น หรือผู้ป่วยที่ออกไปแล้วยังค้าง / อยู่ผิดโซน

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- เทคนิค: State Transition (ไม่มี order → มี order · อยู่ใน ER → จำหน่าย · โซน A → โซน B)
```

### TC-SBH-2618-007 - แสดงผู้ป่วยในรายชื่อหลังแพทย์ส่ง order แรก

Status: Not Run · Priority: Medium · Labels: Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Nurse Task List + QA Case : Edge + QA Type : Functional + QA Execution Type: Manual

```
TC ID: TC-SBH-2618-007
Case Type: Edge
Test Type: Functional

## Test Step
1. เปิดหน้า "รายการงานพยาบาล" > ยืนยันว่าไม่พบผู้ป่วย B
2. Login แพทย์ > สั่ง Lab 1 รายการให้ผู้ป่วย B > ส่ง order
3. กลับหน้า "รายการงานพยาบาล" > กด "รีเฟรช"

## Expected Result
ผู้ป่วย B แสดงในรายชื่อใต้โซนของผู้ป่วย · กดแล้วเห็นงานจาก Lab ที่สั่ง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — ไม่มี order → มี order
```

### TC-SBH-2618-008 - ตรวจสอบผู้ป่วยหายจากรายชื่อหลังจำหน่ายออกจาก ER

Status: Not Run · Priority: High · Labels: เหมือน TC-007

```
TC ID: TC-SBH-2618-008
Case Type: Edge
Test Type: Functional

## Test Step
1. เปิดหน้า "รายการงานพยาบาล" > ยืนยันว่าพบผู้ป่วย A
2. จำหน่ายผู้ป่วย A ออกจาก ER (Disposition จนผู้ป่วยออกจากคิว ER)
3. กลับหน้า "รายการงานพยาบาล" > กด "รีเฟรช"

## Expected Result
ไม่พบผู้ป่วย A ในรายชื่อทุกโซน และไม่มีกลุ่ม "ออกจาก ER"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — อยู่ใน ER → จำหน่าย
```

### TC-SBH-2618-009 - แสดงผู้ป่วยใต้โซนใหม่หลังย้ายโซน

Status: Not Run · Priority: Medium · Labels: เหมือน TC-007

```
TC ID: TC-SBH-2618-009
Case Type: Edge
Test Type: Functional

## Test Step
1. เปิดหน้า "รายการงานพยาบาล" > ผู้ป่วย A อยู่ใต้โซนแดง
2. ย้ายผู้ป่วย A ไปโซนเหลืองบนแดชบอร์ด ER
3. กลับหน้า "รายการงานพยาบาล" > กด "รีเฟรช"

## Expected Result
ผู้ป่วย A อยู่ใต้โซนเหลือง และไม่อยู่ใต้โซนแดงแล้ว · ตัวเลขหลังชื่อโซนทั้ง 2 อัปเดตตาม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — โซน A → โซน B
```

---

## Requirement gap / คำถามที่ต้องยืนยัน

**Expected behavior**
- AC 4 "เรียงผู้ป่วยตาม Clinical" — ไม่บอกว่าเรียงตามอะไร (ระดับคัดกรอง ESI · เวลาเข้า ER · ความเร่งด่วนของงาน) และลำดับโซนต้องเป็นแบบไหน → ยังไม่มี TC
- "ปรับสี / ปรับความสวยงาม" — ไม่มี spec สี / mockup (Sub-Issue Design Task CTXN-11963 ยัง On Hold) → ยังไม่มี TC
- AC 2 "มี order" นับอะไรบ้าง — งาน "Nurse added" อย่างเดียว (ไม่มี order แพทย์) นับไหม · ผู้ป่วยที่งานทั้งหมด "เสร็จแล้ว" / "ยกเลิก" ยังแสดงไหม
- กลุ่ม "zone: รอ" (ผู้ป่วยยังไม่ได้โซน) ยังคงแสดงหรือไม่

**Validation / ช่วงวันที่**
- ตัวกรองวันที่ย้อนหลัง (เช่น เมื่อวาน) — ผู้ป่วยที่ออกจาก ER ไปแล้วแต่มีงานในวันนั้นต้องแสดงไหม (PR API ระบุ "current er queue")

**Permission / role**
- ตัดคอลัมน์ "ผู้รับผิดชอบ" แล้ว พยาบาลยังกำหนดผู้รับผิดชอบงานได้ที่ไหน หรือเลิกใช้ field นี้
- ตัดคอลัมน์ "Note" แล้ว Note ของงานยังดู / เพิ่มได้ที่ไหน

**ข้อสังเกต**
- ไม่มี TC ตรวจปุ่ม รับงาน / เสร็จสิ้น / ยกเลิกงาน หลังตัดคอลัมน์ (ไม่อยู่ใน AC) — ถ้าต้องการกัน regression เพิ่มได้ 1–2 TC
