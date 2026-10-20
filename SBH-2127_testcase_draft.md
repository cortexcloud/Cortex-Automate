# Draft Test Structure — SBH-2127

> สถานะ: **สร้างใน Linear แล้ว (2026-10-19)**
> - EXE SBH-2769 (EXE - CT - 2.8.0) → HPY SBH-2770 (TC 001–007 = SBH-2772–2778) · UHP SBH-2771 (TC 008–009 = SBH-2779–2780)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · วงเล็บท้ายชื่อบอกหน้าที่ต้องดู
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)
> - Env: Dev-X / SBH Prod (default) · Run Type: CT (การ์ดผูก Cycle) · QA Module : Pharmacy · QA Sub-module / Feature : Prescription (เหมือน SBH-2126 / SBH-1737)

Requirement: SBH-2127 — [CPOE][Pharmacy] Sync Order Refill (CPOE) กับ Task เติมยา (Pharmacy) — สร้าง/ลบ/แก้ไข
URL: https://linear.app/cortexcloud/issue/SBH-2127
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: Urgent · State: Testing · Cycle: ผูกแล้ว
Labels: 🐷 VERSION 2.8.0, 🍄 Improvement, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy · Assignee: Puwadon (Pooh)
Parent: SBH-1737 · Sub-Issue: ไม่มี · คอมเมนต์: ไม่มี · รูป Concept: สร้าง → ขึ้น | ลบ → หาย | แก้ไข → Sync
หน้าที่ดูผล: การจัดการรายการสั่งยา OPD → แท็บ Order เติมยา (ตาม SBH-1734 — สถานะ ยังไม่เติม / กำลังเติมยา / เติมยาแล้ว / ยกเลิกแล้ว)

| AC / BR | Expected Results | TC |
|---|---|---|
| AC1 / BR1 | ส่งคำสั่ง Order Refill → เกิด Task เติมยาตรงกับรอบที่ตั้งไว้ | 001 |
| AC3 / BR3 | แก้วิธีกิน / จำนวน / รอบ Refill → Task อัปเดตตาม ไม่สร้างซ้ำ | 002, 003, 004, 005 |
| AC2 / BR2 | ลบ Order Refill ที่หน้า CPOE → Task หายทั้งหมด | 006 |
| BR2 | ลบ Order ที่หน้าสร้างใบยา (ก่อนสร้างใบยา) → Task หายทั้งหมด | 007 |
| AC4 / BR4 | Task "กำลังเติมยา" / "เติมยาแล้ว" ไม่ถูกลบหรือสร้างซ้ำเมื่อแก้ Order ต้นทาง | 008, 009 |

ข้อมูลตั้งต้น
- คนไข้ 1: ยา A = Order Refill 3 รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28) → ใช้ 001–005 · ยา C = Order Refill 2 รอบ → ใช้ 006 · ยา D = Order Refill 2 รอบ → ใช้ 007
- คนไข้ 2: ยา E = Order Refill 3 รอบ → ใช้ 008–009
- ทุกข้อ: ห้องยายังไม่สร้างใบยาของ Order ต้นทาง (แพทย์ยังแก้ไขได้ตาม SBH-2126)

ลำดับเทส: 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009

---

## EXE - CT - 2.8.0

Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.0
- Module: CPOE / Pharmacy
- Requirement ที่อ้างอิง: SBH-2127 — [CPOE][Pharmacy] Sync Order Refill (CPOE) กับ Task เติมยา (Pharmacy) — สร้าง/ลบ/แก้ไข
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- สร้าง Order Refill → เกิด Task เติมยา (AC1)
- แก้ไขวิธีกิน / จำนวน / รอบ Refill → Task อัปเดตตาม ไม่สร้างซ้ำ (AC3)
- ลบ Order ที่หน้า CPOE และหน้าสร้างใบยา → Task หาย (AC2, BR2)
- Task กำลังเติมยา / เติมยาแล้ว ไม่ถูก sync ทับ (AC4)
- ลำดับเทส: 001 → 009

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2127-HPY - สร้าง แก้ไข และลบ Order Refill แล้ว Task เติมยา sync ตาม

Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2127-HPY
- Case Type: Happy
- Suffix: HPY
- Module: CPOE / Pharmacy
- Requirement ที่อ้างอิง: SBH-2127

วัตถุประสงค์
- ยืนยันว่าการสร้าง / แก้ไข / ลบ Order Refill ทำให้ Task เติมยาในหน้า Order เติมยา ขึ้น / อัปเดต / หาย ตรงกันเสมอ

ขอบเขต Requirement
- AC1, AC2, AC3 · BR1, BR2, BR3

ความเสี่ยง
- ลบ Order แล้ว Task ค้าง (Orphan) — บั๊กเดิม SBH-1656 ข้อ 9
- แก้ไขแล้ว Task ไม่อัปเดต หรือสร้าง Task ซ้ำ ทำให้เภสัชจ่ายยาผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2127-001 - สร้าง Task เติมยาตามรอบที่ตั้งไว้ เมื่อแพทย์ส่งคำสั่ง Order Refill (หน้า Order เติมยา)
Priority: Urgent · Type: Functional
```
Test Step
1. Login ระบบด้วย user แพทย์ > เปิด OPD Visit ของคนไข้ 1 > หน้า CPOE
2. สั่งยา A เป็น Order Refill 3 รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28) > ส่งคำสั่ง
3. Login ระบบด้วย user เภสัช > การจัดการรายการสั่งยา OPD > แท็บ Order เติมยา > ค้นหาคนไข้ 1

Expected Result
มี Task เติมยาของยา A สถานะ "ยังไม่เติม" ครบตามรอบที่ตั้งไว้ วันที่และจำนวนจ่ายแต่ละรอบตรงกับที่แพทย์ตั้ง
```

### TC-SBH-2127-002 - อัปเดตวิธีกินใน Task เติมยา เมื่อแพทย์แก้ไขวิธีกินของ Order Refill (หน้า Order เติมยา)
Priority: High · Type: Functional
```
Test Step
1. ใช้ยา A จาก `TC-SBH-2127-001`
2. user แพทย์ ที่หน้า CPOE แก้วิธีกินของยา A > บันทึก
3. user เภสัช > แท็บ Order เติมยา > ดู Task ของยา A

Expected Result
Task ของยา A ทุกรอบแสดงวิธีกินใหม่ และจำนวน Task ไม่เพิ่ม (ไม่สร้างซ้ำ)
```

### TC-SBH-2127-003 - อัปเดตจำนวนใน Task เติมยา เมื่อแพทย์แก้ไขจำนวนของ Order Refill (หน้า Order เติมยา)
Priority: High · Type: Functional
```
Test Step
1. ใช้ยา A จาก `TC-SBH-2127-002`
2. user แพทย์ ที่หน้า CPOE แก้จำนวนจ่ายของยา A > บันทึก
3. user เภสัช > แท็บ Order เติมยา > ดู Task ของยา A

Expected Result
Task ของยา A แสดงจำนวนใหม่ตรงกับที่แพทย์แก้ และจำนวน Task ไม่เพิ่ม
```

### TC-SBH-2127-004 - เพิ่ม Task เติมยา เมื่อแพทย์เพิ่มรอบ Refill (หน้า Order เติมยา)
Priority: High · Type: Functional
```
Test Step
1. ใช้ยา A จาก `TC-SBH-2127-003` (Refill 3 รอบ)
2. user แพทย์ ที่หน้า CPOE เปิดการตั้งค่า Refill ของยา A > เพิ่มรอบเป็น 4 รอบ > บันทึก
3. user เภสัช > แท็บ Order เติมยา > ดู Task ของยา A

Expected Result
Task ของยา A มีครบ 4 รอบตามที่ตั้งใหม่ รอบเดิมไม่ถูกสร้างซ้ำ
```

### TC-SBH-2127-005 - ลบ Task เติมยาของรอบที่ถูกลบ เมื่อแพทย์ลดรอบ Refill (หน้า Order เติมยา)
Priority: High · Type: Functional
```
Test Step
1. ใช้ยา A จาก `TC-SBH-2127-004` (Refill 4 รอบ)
2. user แพทย์ ที่หน้า CPOE เปิดการตั้งค่า Refill ของยา A > ลบรอบสุดท้าย เหลือ 3 รอบ > บันทึก
3. user เภสัช > แท็บ Order เติมยา > ดู Task ของยา A

Expected Result
Task ของรอบที่ถูกลบหายไป เหลือ Task ของยา A 3 รอบตรงกับที่ตั้ง
```

### TC-SBH-2127-006 - ลบ Task เติมยาทั้งหมด เมื่อแพทย์ลบ Order Refill ที่หน้า CPOE (หน้า Order เติมยา)
Priority: Urgent · Type: Functional
```
Test Step
1. user แพทย์ สั่งยา C เป็น Order Refill 2 รอบให้คนไข้ 1 > ส่งคำสั่ง
2. user เภสัช > แท็บ Order เติมยา > ยืนยันว่ามี Task ของยา C
3. user แพทย์ ที่หน้า CPOE ลบ Order ยา C
4. user เภสัช > แท็บ Order เติมยา > ค้นหาคนไข้ 1

Expected Result
ไม่มี Task ของยา C ค้างอยู่ในแท็บ Order เติมยา
```

### TC-SBH-2127-007 - ลบ Task เติมยาทั้งหมด เมื่อเภสัชลบ Order ที่หน้าสร้างใบยา (หน้า Order เติมยา)
Priority: High · Type: Functional
```
Test Step
1. user แพทย์ สั่งยา D เป็น Order Refill 2 รอบให้คนไข้ 1 > ส่งคำสั่ง
2. user เภสัช > แท็บ Order เติมยา > ยืนยันว่ามี Task ของยา D
3. แท็บ Order รอยืนยัน > เปิด Order ของคนไข้ 1 (หน้าสร้างใบยา) > ลบยา D ก่อนกดสร้างใบยา
4. แท็บ Order เติมยา > ค้นหาคนไข้ 1

Expected Result
ไม่มี Task ของยา D ค้างอยู่ในแท็บ Order เติมยา
```

---

## TS-SBH-2127-UHP - Task เติมยาที่กำลังเติมหรือเติมแล้ว ไม่ถูก sync ทับ

Labels: requirement labels + QA Module + QA Sub-module + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2127-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: CPOE / Pharmacy
- Requirement ที่อ้างอิง: SBH-2127

วัตถุประสงค์
- ยืนยันว่าการแก้ไข Order ต้นทางไม่ลบหรือสร้างซ้ำ Task ที่สถานะ "กำลังเติมยา" หรือ "เติมยาแล้ว"

ขอบเขต Requirement
- AC4 · BR4

ความเสี่ยง
- sync ทับ Task ที่กำลังเติม / เติมแล้ว ทำให้จ่ายยารอบเดิมซ้ำ หรือประวัติการเติมยาหาย

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2127-008 - ตรวจสอบ Task สถานะกำลังเติมยาไม่ถูกลบหรือสร้างซ้ำ เมื่อแพทย์แก้ไข Order ต้นทาง (หน้า Order เติมยา)
Priority: High · Type: Functional
```
Test Step
1. user แพทย์ สั่งยา E เป็น Order Refill 3 รอบให้คนไข้ 2 > ส่งคำสั่ง
2. user เภสัช > แท็บ Order เติมยา > ติ๊กเลือก Task รอบที่ 1 ของยา E > นำไปสร้างใบยา (ยังไม่จ่ายยา) → สถานะ "กำลังเติมยา"
3. user แพทย์ ที่หน้า CPOE แก้วิธีกินของยา E > บันทึก
4. user เภสัช > แท็บ Order เติมยา > ดู Task ของยา E

Expected Result
Task รอบที่ 1 ยังอยู่ 1 รายการ สถานะ "กำลังเติมยา" ไม่ถูกลบและไม่มี Task รอบที่ 1 ซ้ำ
```

### TC-SBH-2127-009 - ตรวจสอบ Task สถานะเติมยาแล้วไม่ถูกลบหรือสร้างซ้ำ เมื่อแพทย์แก้ไข Order ต้นทาง (หน้า Order เติมยา)
Priority: High · Type: Functional
```
Test Step
1. ใช้ยา E จาก `TC-SBH-2127-008` > user เภสัชดำเนินการใบยาของ Task รอบที่ 1 จนจ่ายยาแล้ว → สถานะ "เติมยาแล้ว"
2. user แพทย์ ที่หน้า CPOE แก้จำนวนจ่ายของยา E > บันทึก
3. user เภสัช > แท็บ Order เติมยา > ดู Task ของยา E

Expected Result
Task รอบที่ 1 ยังอยู่ 1 รายการ สถานะ "เติมยาแล้ว" ไม่ถูกลบและไม่มี Task รอบที่ 1 ซ้ำ
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- BR1 "ตามเงื่อนไขที่กำหนด เช่น ส่งคำสั่งแล้ว" — ไม่ชัดว่า Task เกิดตอนส่งคำสั่ง หรือตอน Sign / ตอนเภสัชยืนยัน → 001 ใช้ "ส่งคำสั่ง" ตามตัวอย่างในการ์ด
- AC4: Task ที่ "กำลังเติมยา" / "เติมยาแล้ว" ต้องอัปเดตข้อมูล (เช่น วิธีกิน) ตามด้วยหรือคงค่าเดิม — การ์ดบอกแค่ "ไม่ถูกลบ / สร้างซ้ำ"
- ลบ Order ต้นทางขณะมี Task "กำลังเติมยา" / "เติมยาแล้ว" — Task นั้นต้องคงอยู่หรือไม่ และ Task "ยังไม่เติม" รอบอื่นต้องหายหรือไม่ (BR4 บอกว่าไม่ถูกลบ แต่ AC2 บอกว่าลบทั้งหมด)
- เภสัชแก้ไข Order Refill ที่หน้า Order รอยืนยัน (SBH-1737) ต้อง sync ไป Task ด้วยหรือไม่ — AC3 ระบุเฉพาะหน้า CPOE
- Task สถานะ "ยกเลิกแล้ว" เมื่อแก้ / ลบ Order ต้นทาง — การ์ดไม่ได้ระบุ

Validation
- -

Error handling
- -

Permission / role
- -

Edge cases
- 008 / 009 ต้องให้แพทย์แก้ Order ต้นทางได้หลังมี Task กำลังเติม / เติมแล้ว — ถ้า CPOE ล็อกการแก้ไขตามกฎ SBH-2126 จะเทสไม่ได้ ต้องถาม Dev ว่าเทสผ่านช่องทางไหน
