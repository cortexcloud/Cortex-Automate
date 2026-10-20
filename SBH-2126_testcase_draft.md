# Draft Test Structure — SBH-2126

> สถานะ: **สร้างใน Linear แล้ว (2026-10-19)**
> - EXE SBH-2759 (EXE - CT - 2.8.0) → HPY SBH-2760 (TC 001–005 = SBH-2762–2766) · UHP SBH-2761 (TC 006–007 = SBH-2767–2768)
> - QA Module : Pharmacy · QA Sub-module / Feature : Prescription · QA Run : Cycle Test
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · วงเล็บท้ายชื่อบอกหน้าที่ต้องดู
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)
> - Env: Dev-X / SBH Prod (ค่า default) · Run Type: CT (การ์ดผูก Cycle)

Requirement: SBH-2126 — [CPOE][Pharmacy] แก้กฎ Editability ของคำสั่ง Refill ให้สอดคล้องกับ Order ปกติ
URL: https://linear.app/cortexcloud/issue/SBH-2126
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: Urgent · State: Testing · Cycle: ผูกแล้ว
Labels: 🐷 VERSION 2.8.0, 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy · Assignee: Puwadon (Pooh)
Parent: SBH-1737 · Sub-Issue: ไม่มี · คอมเมนต์: ไม่มี

| AC | Expected Results | TC |
|---|---|---|
| AC1 | Order Refill ในตะกร้า (ยังไม่ส่งคำสั่ง) แก้ไขได้ | 001 |
| AC2 | Order Refill ส่งคำสั่ง / Sign แล้ว แต่ยังไม่สร้างใบยา ยังแก้ไขได้ | 002, 003 |
| (ความเสี่ยง) | ค่าที่แพทย์แก้หลัง Sign ไปถึงห้องยาจริง | 005 |
| AC3 | Order Refill ที่เภสัชสร้างใบยาแล้ว แก้ไขไม่ได้ | 006 |
| AC4 | Order ปกติยังแก้ไขได้จนกว่าจะสร้างใบยา (ไม่เปลี่ยน) | 004, 007 |

ข้อมูลตั้งต้น (ใช้ร่วมทุก TC): คนไข้ทดสอบ OPD 1 ราย · แพทย์สั่งยา 2 รายการ — ยา A = Order Refill 3 รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28) · ยา B = ยาปกติ
ลำดับเทส: 001 → 002 → 003 → 004 → 005 → 006 → 007 (ใช้ Order เดียวกันต่อเนื่อง — 001 ทำตอนยังอยู่ในตะกร้า แล้วค่อยส่งคำสั่ง · 006 / 007 ทำหลังเภสัชสร้างใบยา)

---

## EXE - CT - 2.8.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: UAT#3 Cashier, Pharmacy, Queue
Labels: 🐷 VERSION 2.8.0, 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy, QA Module : Pharmacy, QA Sub-module / Feature : Prescription, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.0
- Module: CPOE / Pharmacy
- Requirement ที่อ้างอิง: SBH-2126 — [CPOE][Pharmacy] แก้กฎ Editability ของคำสั่ง Refill ให้สอดคล้องกับ Order ปกติ
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- แพทย์แก้ไข Order Refill ได้ตอนอยู่ในตะกร้า และหลังส่งคำสั่ง / Sign ที่ยังไม่สร้างใบยา (AC1, AC2)
- ล็อกการแก้ไข Order Refill หลังเภสัชสร้างใบยา (AC3)
- Order ปกติยังทำงานเหมือนเดิม (AC4)
- ลำดับเทส: 001 → 002 → 003 → 004 → 005 → 006 → 007

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2126-HPY - แพทย์แก้ไข Order Refill และ Order ปกติได้ก่อนเภสัชสร้างใบยา

Status: Ready for Testing · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2126-HPY
- Case Type: Happy
- Suffix: HPY
- Module: CPOE / Pharmacy
- Requirement ที่อ้างอิง: SBH-2126 — [CPOE][Pharmacy] แก้กฎ Editability ของคำสั่ง Refill ให้สอดคล้องกับ Order ปกติ

วัตถุประสงค์
- ยืนยันว่า Order Refill แก้ไขได้ตั้งแต่อยู่ในตะกร้าจนถึงหลังส่งคำสั่ง / Sign ตราบใดที่ยังไม่สร้างใบยา เหมือน Order ปกติ

ขอบเขต Requirement
- AC1, AC2, AC4 · Business Rules ข้อ 1, 3

ความเสี่ยง
- ระบบยังล็อก Order Refill ทันทีหลัง Sign (บั๊กเดิม)
- แพทย์แก้หลัง Sign ได้ แต่ห้องยาไม่ได้ค่าใหม่
- การแก้ logic ของ Refill กระทบ Order ปกติ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2126-001 - แก้ไขรายละเอียด Order Refill ที่อยู่ในตะกร้าได้ (หน้า CPOE)

Status: Not Run · Priority: High · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
Test Step
1. Login ระบบด้วย user แพทย์ > เปิด OPD Visit ของคนไข้ทดสอบ > หน้า CPOE
2. สั่งยา A เป็น Order Refill 3 รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28) และยา B ยาปกติ ลงตะกร้า (ยังไม่ส่งคำสั่ง)
3. กดแก้ไขยา A ในตะกร้า > เปลี่ยนวิธีใช้ > บันทึก

Expected Result
แก้ไขยา A ในตะกร้าได้ และแสดงวิธีใช้ใหม่ที่แถวยา A
```
หมายเหตุ: AC1 · BR1

### TC-SBH-2126-002 - แก้ไขรายละเอียด Order Refill หลังส่งคำสั่งก่อนเภสัชสร้างใบยา (หน้า CPOE)

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-001

```
Test Step
1. ใช้ Order จาก `TC-SBH-2126-001` > กดส่งคำสั่ง / Sign Order (ห้องยายังไม่สร้างใบยา)
2. ที่หน้า CPOE กดแก้ไขยา A > เปลี่ยนวิธีใช้และจำนวนจ่ายครั้งนี้ > บันทึก

Expected Result
แก้ไขยา A ได้ ระบบไม่ล็อก และแสดงวิธีใช้ / จำนวนจ่ายใหม่ที่แถวยา A
```
หมายเหตุ: AC2 · BR1, BR2 (บั๊กเดิม: ล็อกทันทีหลัง Sign)

### TC-SBH-2126-003 - แก้ไขรอบเติมยาของ Order Refill หลังส่งคำสั่งก่อนเภสัชสร้างใบยา (หน้า CPOE)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
Test Step
1. ใช้ Order จาก `TC-SBH-2126-002` (ส่งคำสั่งแล้ว ห้องยายังไม่สร้างใบยา)
2. ที่หน้า CPOE เปิดการตั้งค่า Refill ของยา A > เปลี่ยนวันที่และจำนวนจ่ายของเติมยาครั้งที่ 1 > บันทึก

Expected Result
แก้ไขรอบเติมยาของยา A ได้ และแสดงวันที่ / จำนวนจ่ายใหม่ของเติมยาครั้งที่ 1
```
หมายเหตุ: AC2 — "รายละเอียด" ของ Order Refill รวมรอบเติมยา (ส่วนที่ต่างจาก Order ปกติ)

### TC-SBH-2126-004 - แก้ไขรายละเอียด Order ปกติหลังส่งคำสั่งก่อนเภสัชสร้างใบยา (หน้า CPOE)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
Test Step
1. ใช้ Order จาก `TC-SBH-2126-002` (ส่งคำสั่งแล้ว ห้องยายังไม่สร้างใบยา)
2. ที่หน้า CPOE กดแก้ไขยา B > เปลี่ยนวิธีใช้ > บันทึก

Expected Result
แก้ไขยา B ได้ และแสดงวิธีใช้ใหม่ที่แถวยา B (พฤติกรรมเหมือนเดิม)
```
หมายเหตุ: AC4 · BR3

### TC-SBH-2126-005 - แสดงรายละเอียดยาตามที่แพทย์แก้ไขหลังส่งคำสั่ง (หน้า Order รอยืนยัน ห้องยา)

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
Test Step
1. ทำ `TC-SBH-2126-002` ถึง `TC-SBH-2126-004` แล้ว
2. Login ระบบด้วย user เภสัช > การจัดการรายการสั่งยา OPD > แท็บ Order รอยืนยัน > เปิด Order ของคนไข้
3. ดูวิธีใช้ จำนวนจ่าย และรอบเติมยาของยา A และวิธีใช้ของยา B

Expected Result
ค่าของยา A และยา B ตรงกับที่แพทย์แก้ไขล่าสุดในหน้า CPOE
```
หมายเหตุ: เพิ่มจากความเสี่ยง — ยืนยันว่าการแก้ไขหลัง Sign ไปถึงห้องยาจริง (การ์ดไม่ได้เขียนไว้ตรงๆ)

---

## TS-SBH-2126-UHP - ล็อกการแก้ไข Order Refill และ Order ปกติหลังเภสัชสร้างใบยา

Status: Ready for Testing · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2126-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: CPOE / Pharmacy
- Requirement ที่อ้างอิง: SBH-2126 — [CPOE][Pharmacy] แก้กฎ Editability ของคำสั่ง Refill ให้สอดคล้องกับ Order ปกติ

วัตถุประสงค์
- ยืนยันว่าเมื่อเภสัชสร้างใบยาแล้ว แพทย์แก้ไข Order ไม่ได้ ทั้ง Order Refill และ Order ปกติ

ขอบเขต Requirement
- AC3, AC4 · Business Rules ข้อ 2, 3

ความเสี่ยง
- ปลดล็อก Refill แล้วเลยแก้ได้แม้สร้างใบยาแล้ว ทำให้ใบยาไม่ตรงกับคำสั่ง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2126-006 - ตรวจสอบแก้ไข Order Refill ไม่ได้หลังเภสัชสร้างใบยา (หน้า CPOE)

Status: Not Run · Priority: Urgent · Labels: requirement labels + QA Module + QA Sub-module + QA Case : Unhappy + QA Type : Functional + QA Execution Type: Manual

```
Test Step
1. ใช้ Order จาก `TC-SBH-2126-005` > user เภสัชกดสร้างใบยาจาก Order นั้น
2. Login ระบบด้วย user แพทย์ > เปิด OPD Visit ของคนไข้ > หน้า CPOE
3. พยายามแก้ไขยา A (รายละเอียดยาและรอบเติมยา)

Expected Result
แก้ไขรายละเอียดและรอบเติมยาของยา A ไม่ได้
```
หมายเหตุ: AC3 · BR2 · เทคนิค: State Transition — สร้างใบยาแล้ว → ล็อก

### TC-SBH-2126-007 - ตรวจสอบแก้ไข Order ปกติไม่ได้หลังเภสัชสร้างใบยา (หน้า CPOE)

Status: Not Run · Priority: High · Labels: เหมือน TC-006

```
Test Step
1. ใช้ Order จาก `TC-SBH-2126-006` (เภสัชสร้างใบยาแล้ว)
2. ที่หน้า CPOE พยายามแก้ไขยา B

Expected Result
แก้ไขรายละเอียดยา B ไม่ได้ (พฤติกรรมเหมือนเดิม)
```
หมายเหตุ: AC4 · BR3

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- การ์ดไม่บอกว่าหน้า CPOE แสดงสถานะ "ล็อก" อย่างไร (ซ่อนปุ่มแก้ไข / ปุ่มเป็นสีเทา / กดแล้วมีข้อความแจ้ง) — TC-006 / 007 จึงเขียน Expected แค่ "แก้ไขไม่ได้"
- เภสัชย้อนสถานะใบยากลับ (ตาม SBH-1737 BR4) แล้ว แพทย์ต้องกลับมาแก้ไขได้อีกหรือไม่ — การ์ดไม่ได้ระบุ จึงไม่สร้าง TC
- ถ้าแพทย์แก้ไขขณะเภสัชเปิดหน้า Order รอยืนยันค้างไว้ ห้องยาต้องเห็นค่าใหม่ทันทีหรือต้อง refresh — การ์ดไม่ได้ระบุ

Validation
- -

Error handling
- -

Permission / role
- -

Edge cases
- หลังสร้างใบยาครั้งแรกแล้ว รอบเติมยาครั้งถัดไปที่ยังไม่ถึงกำหนด แพทย์แก้ไขได้หรือไม่ — การ์ดไม่ได้ระบุ (เกี่ยวกับ SBH-2127 Sync Order Refill กับ Task เติมยา)
