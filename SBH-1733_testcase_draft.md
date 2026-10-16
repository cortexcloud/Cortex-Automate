# Draft Test Structure — SBH-1733

> สถานะ: **Draft (2026-10-16)** — ยังไม่สร้างใน Linear · รอผู้ใช้ยืนยัน Environment / QA Module / Sub-module แล้ว review ร่างเต็ม รอ "สร้างได้"
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · วงเล็บท้ายชื่อบอกหน้าที่ต้องดู
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)

Requirement: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา
URL: https://linear.app/cortexcloud/issue/SBH-1733
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: High · State: Ready for Testing
Labels: 🐷 VERSION 2.7.0, 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT
Sub-Issue: CTXN-8990 (Design Task — Triage ยังไม่มี Figma) · PR: cortex-ui "[V2.8.0] show refill progress in prescription and OPD summary"
คอมเมนต์ BA (Bess 2026-09-21): เดิมออกแบบเป็นคอลัมน์ "Refill" ✓ ในหน้าใบยา — ตอนนี้ไม่เอาแล้ว

รูปแบบอ้างอิงจาก CPOE (รูปในการ์ด): ไอคอน Refill (↻) หน้าจำนวน + "7 TAB" · hover แสดง "7 / 28 · Refill 0 of 3" (จ่ายครั้งนี้ / ยอดรวม · รอบที่จ่ายแล้ว of รอบทั้งหมด)
หน้าห้องยาที่เกี่ยวข้อง: หน้าสร้างใบยา (รับออเดอร์ / Order รอยืนยัน) และหน้าใบยา (แท็บ Prescription — ใบยาเลขที่)

| AC / BR | Expected Results | TC |
|---|---|---|
| AC1 / BR1 | Order Refill มี Label บ่งชี้ว่าเป็น Refill ที่หน้าใบยาเภสัช | 001, 002 |
| BR1 | Order ที่ถูกเปลี่ยนเป็น Refill ภายหลัง (SBH-1737) ก็แสดง Label | 003 |
| AC2 / BR2 | รูปแบบรายการยา / จำนวน / หน่วย ตรงกับหน้า CPOE | 004, 005, 006 |
| AC1 (ด้านกลับ) | ยาที่ไม่ใช่ Refill ไม่แสดง Label Refill | 007 |
| คอมเมนต์ BA | ไม่แสดงเป็นคอลัมน์ "Refill" แยก | 008 |

---

## EXE - CT - 2.7.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: UAT#3 Cashier, Pharmacy, Queue
Labels: 🐷 VERSION 2.7.0, 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy, `<QA Module — รอยืนยัน>`, `<QA Sub-module — รอยืนยัน>`, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.7.0
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา
- Environment: <รอ QA ยืนยัน>
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Label บ่งชี้ Order Refill ในหน้าสร้างใบยา / หน้าใบยาของห้องยา (AC1, BR1)
- รูปแบบรายการยา / จำนวน / หน่วยตรงกับหน้า CPOE (AC2, BR2)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- การ์ดนี้เป็นเรื่องการแสดงผลเท่านั้น ไม่รวมการแก้ไข Order / Refill (อยู่ใน SBH-1737)
```

---

## TS-SBH-1733-HPY - แสดง Label Refill และรูปแบบจำนวนยาเหมือน CPOE ในหน้าใบยาของห้องยา

Status: Ready for Testing · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1733-HPY
- Case Type: Happy
- Suffix: HPY
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา

วัตถุประสงค์
- ยืนยันว่าเภสัชเห็นชัดว่ารายการยาไหนเป็น Order Refill และเห็นจำนวน / หน่วยรูปแบบเดียวกับที่แพทย์เห็นใน CPOE

ขอบเขต Requirement
- AC1 / BR1: Order Refill มี Label บ่งชี้ (ทั้งที่แพทย์สั่งเป็น Refill และที่ถูกเปลี่ยนเป็น Refill ภายหลัง)
- AC2 / BR2: รูปแบบรายการยา / จำนวน / หน่วยตรงกับหน้า CPOE

ความเสี่ยง
- เภสัชไม่รู้ว่าเป็นยา Refill แล้วจ่ายยอดรวมทั้งหมดแทนจำนวนของรอบนี้
- เภสัชกับแพทย์เห็นจำนวน / หน่วยไม่ตรงกัน ทำให้สื่อสารผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1733-001 - แสดง Label Refill บนรายการยาที่แพทย์สั่งเป็น Refill (หน้าสร้างใบยา ห้องยา)

Status: Not Run · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy + QA Type : UIUX + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1733-001
- Scenario ID: TS-SBH-1733-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: High
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา

Preconditions
1. แพทย์สั่งยา Refill 3 รอบให้คนไข้ทดสอบ และส่งคำสั่งแล้ว
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ยา Refill 1 รายการ (เช่น จ่ายครั้งนี้ 7 / ยอดรวม 28 / 3 รอบ)

Test Steps
1. การจัดการรายการสั่งยา OPD > แท็บ Order รอยืนยัน > เปิด Order ของคนไข้ (หน้าสร้างใบยา)
2. ดูรายการยา Refill

Expected Result
- รายการยา Refill มี Label / ไอคอนบ่งชี้ว่าเป็น Order Refill

Actual Result
- -

หมายเหตุ
- AC1 · BR1
```

### TC-SBH-1733-002 - แสดง Label Refill บนรายการยาที่แพทย์สั่งเป็น Refill (หน้าใบยา ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1733-002
- Scenario ID: TS-SBH-1733-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: High
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา

Preconditions
1. ทำ TC-SBH-1733-001 แล้ว และสร้างใบยาจาก Order นั้นแล้ว
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ใบยาที่มียา Refill

Test Steps
1. การจัดการรายการสั่งยา OPD > เปิดใบยา (แท็บ Prescription — ใบยาเลขที่)
2. ดูรายการยา Refill

Expected Result
- รายการยา Refill มี Label / ไอคอนบ่งชี้ว่าเป็น Order Refill

Actual Result
- -

หมายเหตุ
- AC1 · BR1
```

### TC-SBH-1733-003 - แสดง Label Refill บนรายการยาที่ถูกเปลี่ยนเป็น Refill ภายหลัง (หน้าสร้างใบยา ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1733-003
- Scenario ID: TS-SBH-1733-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา

Preconditions
1. แพทย์สั่งยาปกติ (ไม่ใช่ Refill) ให้คนไข้ทดสอบ และส่งคำสั่งแล้ว
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ยาปกติ 1 รายการ

Test Steps
1. แท็บ Order รอยืนยัน > เปิด Order ของคนไข้ (หน้าสร้างใบยา)
2. เปลี่ยนรายการยานั้นเป็น Refill ตามวิธีของ SBH-1737 แล้วบันทึก
3. ดูรายการยานั้น

Expected Result
- รายการยาที่ถูกเปลี่ยนเป็น Refill แสดง Label / ไอคอนบ่งชี้ว่าเป็น Order Refill

Actual Result
- -

หมายเหตุ
- BR1 · ขึ้นกับ SBH-1737 (เภสัชเปลี่ยน Order เป็น Refill)
```

### TC-SBH-1733-004 - แสดงจำนวนและหน่วยของยาปกติรูปแบบเดียวกับหน้า CPOE (หน้าสร้างใบยา ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1733-004
- Scenario ID: TS-SBH-1733-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา

Preconditions
1. แพทย์สั่งยาปกติ (เช่น 7 TAB) ให้คนไข้ทดสอบ และส่งคำสั่งแล้ว (จดรูปแบบที่แสดงในหน้า CPOE ไว้)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ยาปกติ 7 TAB

Test Steps
1. แท็บ Order รอยืนยัน > เปิด Order ของคนไข้ (หน้าสร้างใบยา)
2. เทียบรายการยา / จำนวน / หน่วย กับที่แสดงในหน้า CPOE

Expected Result
- รายการยา จำนวน และหน่วย แสดงรูปแบบเดียวกับหน้า CPOE

Actual Result
- -

หมายเหตุ
- AC2 · BR2
```

### TC-SBH-1733-005 - แสดงจำนวนและความคืบหน้า Refill รูปแบบเดียวกับหน้า CPOE (หน้าสร้างใบยา ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1733-005
- Scenario ID: TS-SBH-1733-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: High
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา

Preconditions
1. ใช้ Order Refill จาก TC-SBH-1733-001 (CPOE แสดง "7 TAB" และ hover "7 / 28 · Refill 0 of 3")
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ยา Refill จ่ายครั้งนี้ 7 / ยอดรวม 28 / 3 รอบ

Test Steps
1. แท็บ Order รอยืนยัน > เปิด Order ของคนไข้ (หน้าสร้างใบยา)
2. ดูจำนวน / หน่วยของยา Refill และ hover ที่ไอคอน Refill

Expected Result
- แสดง "7 TAB" และรายละเอียด "7 / 28 · Refill 0 of 3" ตรงกับหน้า CPOE

Actual Result
- -

หมายเหตุ
- AC2 · BR2
```

### TC-SBH-1733-006 - แสดงจำนวนและความคืบหน้า Refill รูปแบบเดียวกับหน้า CPOE (หน้าใบยา ห้องยา)

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1733-006
- Scenario ID: TS-SBH-1733-HPY
- Case Type: Happy
- Test Level: System
- Test Type: UIUX
- Priority: High
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา

Preconditions
1. ทำ TC-SBH-1733-002 แล้ว (มีใบยาที่มียา Refill)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ใบยาที่มียา Refill จ่ายครั้งนี้ 7 / ยอดรวม 28 / 3 รอบ

Test Steps
1. การจัดการรายการสั่งยา OPD > เปิดใบยา (แท็บ Prescription — ใบยาเลขที่)
2. ดูจำนวน / หน่วยของยา Refill และ hover ที่ไอคอน Refill

Expected Result
- แสดง "7 TAB" และรายละเอียด "7 / 28 · Refill 0 of 3" ตรงกับหน้า CPOE

Actual Result
- -

หมายเหตุ
- AC2 · BR2
```

---

## TS-SBH-1733-UHP - ไม่แสดง Label Refill ผิดที่ และไม่ใช้คอลัมน์ Refill แบบเดิม

Status: Ready for Testing · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1733-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: Pharmacy
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา

วัตถุประสงค์
- ยืนยันว่ายาที่ไม่ใช่ Refill ไม่มี Label Refill และหน้าใบยาไม่ใช้คอลัมน์ "Refill" แบบที่ BA ยกเลิกไปแล้ว

ขอบเขต Requirement
- AC1 (ด้านกลับ): Label แสดงเฉพาะ Order Refill
- คอมเมนต์ BA: ไม่แสดงเป็นคอลัมน์ "Refill" แยก

ความเสี่ยง
- เภสัชเข้าใจผิดว่ายาปกติเป็นยา Refill

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1733-007 - ตรวจสอบยาที่ไม่ใช่ Refill ไม่แสดง Label Refill (หน้าสร้างใบยา ห้องยา)

Status: Not Run · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Unhappy + QA Type : UIUX + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1733-007
- Scenario ID: TS-SBH-1733-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: UIUX
- Priority: High
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา

Preconditions
1. แพทย์สั่งยา Refill 1 รายการ และยาปกติ 1 รายการ ใน Order เดียวกัน
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ยา Refill 1 รายการ · ยาปกติ 1 รายการ

Test Steps
1. แท็บ Order รอยืนยัน > เปิด Order ของคนไข้ (หน้าสร้างใบยา)
2. ดูรายการยาปกติ

Expected Result
- ยาปกติไม่มี Label / ไอคอน Refill (มีเฉพาะยา Refill)

Actual Result
- -

หมายเหตุ
- AC1 (ด้านกลับ)
- เทคนิค: EP — กลุ่มยาที่ไม่ใช่ Refill
```

### TC-SBH-1733-008 - ตรวจสอบไม่แสดงคอลัมน์ Refill แยกแบบเดิม (หน้าใบยา ห้องยา)

Status: Not Run · Labels: เหมือน TC-007

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1733-008
- Scenario ID: TS-SBH-1733-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: UIUX
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1733 — [Pharmacy][ใบยา] เพิ่ม Label แสดงการเป็น Order Refill ในหน้าใบยา

Preconditions
1. ทำ TC-SBH-1733-002 แล้ว (มีใบยาที่มียา Refill)
2. Login ด้วยผู้ใช้เภสัช

Test Data
- ใบยาที่มียา Refill

Test Steps
1. การจัดการรายการสั่งยา OPD > เปิดใบยา (แท็บ Prescription — ใบยาเลขที่)
2. ดูหัวคอลัมน์ของตารางรายการยา

Expected Result
- ไม่มีคอลัมน์ "Refill" (เครื่องหมาย ✓) แยก — แสดงเป็น Label / ไอคอนบนรายการยาแทน

Actual Result
- -

หมายเหตุ
- คอมเมนต์ BA (Bess 2026-09-21) "เดิมออกแบบเป็นคอลัมน์ ตอนนี้ไม่เอาแล้ว"
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- ไม่ระบุหน้าตา Label (ข้อความ / ไอคอน ↻ / สี) และตำแหน่งที่วาง — Design Task CTXN-8990 ยังเป็น Triage ไม่มี Figma
- "หน้าใบยาเภสัช" ไม่ชัดว่าหมายถึงหน้าสร้างใบยา (Order รอยืนยัน) / หน้าใบยา (Prescription) / ทั้งคู่ — ร่างนี้ทดสอบทั้ง 2 หน้า
- PR ระบุ "OPD summary" ด้วย แต่การ์ดไม่ได้พูดถึงหน้า OPD Summary
- AC2 "รูปแบบเดียวกับ CPOE" ใช้กับยาทุกรายการหรือเฉพาะยา Refill — ร่างนี้ทดสอบทั้งยาปกติ (TC-004) และยา Refill (TC-005, 006)
- version ไม่ตรงกัน: label การ์ด = 🐷 VERSION 2.7.0 แต่ชื่อ PR = V2.8.0 (ร่างนี้ใช้ 2.7.0 ตาม label)

Validation
- -

Error handling
- -

Permission / role
- -

Edge cases
- Label / ความคืบหน้าหลังจ่ายยาไปบางรอบ (เช่น Refill 1 of 3) แสดงถูกต้องหรือไม่ — การ์ดไม่ระบุ
