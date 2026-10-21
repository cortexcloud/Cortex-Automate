# Draft Test Structure — SBH-1731

> สถานะ: **สร้างใน Linear แล้ว (2026-10-20)**
> - EXE SBH-2802 (EXE - CT - 2.8.0) → HPY SBH-2803 (TC 001–003 = SBH-2805–2807) · UHP SBH-2804 (TC 004 = SBH-2808)
> - QA Module : Pharmacy · QA Sub-module / Feature : Queue · QA Run : Cycle Test · label 🐷 VERSION 2.8.0 (ผู้ใช้ยืนยัน แม้ถูก retire)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · วงเล็บท้ายชื่อบอกหน้าที่ต้องดู
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)
> - Env: Dev-X / SBH Prod (default) · Run Type: CT (การ์ดผูก Cycle)

Requirement: SBH-1731 — [OPD][Pharmacy] เพิ่มปุ่ม Print queue รับยา
URL: https://linear.app/cortexcloud/issue/SBH-1731
Project: UAT#3 Cashier, Pharmacy, Queue · Team: SBH Project · Priority: Urgent · State: Testing · Cycle: ผูกแล้ว
Labels: 🍄 Improvement, 🐷 VERSION 2.8.0, For OPD Biz Sim - SBH, SBH - UAT D4 Pharmacy · Assignee: Suchat Chancherngsilapakul
PR: cortex-ui#2026 · cortex-api#2445 · cortex-testing#1202 · Sub-Issue: ไม่มี · คอมเมนต์: ไม่มี

ตำแหน่งปุ่ม (จากรูปในการ์ด): หน้า Prescription (ใบยาเลขที่ ...) → แถวสถานะด้านบน ถัดจาก "คิว: ..." และ "ช่อง: -" → ไอคอนเครื่องพิมพ์
รูปในการ์ดเป็นใบยา Refill (Walk-in) ที่คิวแสดง R001 — คือพฤติกรรมเดิมที่ AC3 ห้าม

| AC / BR | Expected Results | TC |
|---|---|---|
| AC1 / BR3 | Hover ปุ่ม → tooltip "พิมพ์คิวรับยา" | 001 |
| AC2 | กดปุ่ม → ออกเลขคิว Prefix S / M / L | 002 |
| BR1 | เลขคิวต่อจาก running number เดียวกับคิวสั่งยาปกติ | 003 |
| AC3 / BR2 | เลขคิวจากปุ่มนี้ไม่ใช้ Prefix R | 004 |

ข้อมูลตั้งต้น: คนไข้ Refill ที่ไม่ผ่านห้องตรวจ (Visit Walk-in รับยาต่อเนื่อง ตาม SBH-1730) มี Task เติมยาในแท็บ Order เติมยา
ทางเข้า: user เภสัช > การจัดการรายการสั่งยา OPD > แท็บ Order เติมยา > เลือก Task > นำไปสร้างใบยา > สร้างใบยา > หน้า Prescription
ลำดับเทส: 001 → 002 → 004 → 003

---

## EXE - CT - 2.8.0

Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Queue + QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.0
- Module: Pharmacy / Queue
- Requirement ที่อ้างอิง: SBH-1731 — [OPD][Pharmacy] เพิ่มปุ่ม Print queue รับยา
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- tooltip ของปุ่มพิมพ์คิวรับยา (AC1)
- Prefix เลขคิวจากปุ่ม: S / M / L และไม่ใช่ R (AC2, AC3)
- เลขคิวใช้ running number เดียวกับคิวสั่งยาปกติ (BR1)
- ลำดับเทส: 001 → 002 → 004 → 003

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1731-HPY - ห้องยาพิมพ์คิวรับยาให้คนไข้ Refill ที่ไม่ผ่านห้องตรวจ

Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1731-HPY
- Case Type: Happy
- Suffix: HPY
- Module: Pharmacy / Queue
- Requirement ที่อ้างอิง: SBH-1731

วัตถุประสงค์
- ยืนยันว่าห้องยากดปุ่มพิมพ์คิวรับยาแล้วได้เลขคิว Prefix S / M / L ต่อจาก running number เดียวกับคิวสั่งยาปกติ

ขอบเขต Requirement
- AC1, AC2 · BR1, BR3

ความเสี่ยง
- คนไข้ Refill ไม่มีคิว ต้องรอโดยไม่มีลำดับ
- เลขคิวชนหรือข้ามกับคิวสั่งยาปกติ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1731-001 - แสดง tooltip พิมพ์คิวรับยา เมื่อ Hover ปุ่มพิมพ์คิวรับยา (หน้า Prescription ห้องยา)
Priority: Medium · Type: UIUX
```
Test Step
1. Login ระบบด้วย user เภสัช > การจัดการรายการสั่งยา OPD > แท็บ Order เติมยา > เลือก Task ของคนไข้ Refill > นำไปสร้างใบยา > สร้างใบยา
2. ที่หน้า Prescription เอาเมาส์ไปวางที่ไอคอนเครื่องพิมพ์ข้าง "ช่อง:"

Expected Result
แสดง tooltip ข้อความ "พิมพ์คิวรับยา"
```

### TC-SBH-1731-002 - ออกเลขคิวรับยา Prefix S M หรือ L เมื่อกดปุ่มพิมพ์คิวรับยา (หน้า Prescription ห้องยา)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้ใบยาจาก `TC-SBH-1731-001`
2. กดไอคอนพิมพ์คิวรับยา
3. ดูบัตรคิวที่พิมพ์ออกมา และ "คิว:" ที่หัวใบยา

Expected Result
ได้บัตรคิวรับยา เลขคิวขึ้นต้นด้วย S, M หรือ L และ "คิว:" ที่หัวใบยาแสดงเลขเดียวกัน
```

### TC-SBH-1731-003 - ออกเลขคิวต่อจาก running number เดียวกับคิวสั่งยาปกติ (หน้า Prescription ห้องยา)
Priority: High · Type: Functional
```
Test Step
1. user แพทย์ สั่งยาให้คนไข้ OPD ปกติ (ไม่ใช่ Refill) > ส่งคำสั่ง → จดเลขคิวที่ระบบสร้าง (เช่น S010)
2. user เภสัช สร้างใบยา Refill ของคนไข้อีกราย (Prefix เดียวกัน) > กดไอคอนพิมพ์คิวรับยา
3. ดูเลขคิวที่ได้

Expected Result
เลขคิวจากปุ่มต่อจากเลขคิวสั่งยาปกติล่าสุดของ Prefix เดียวกัน (เช่น S011) ไม่ซ้ำและไม่เริ่มนับใหม่
```

---

## TS-SBH-1731-UHP - เลขคิวจากปุ่มพิมพ์คิวรับยาไม่ใช้ Prefix ของคิว Robot

Labels: requirement labels + QA Module + QA Sub-module + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1731-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: Pharmacy / Queue
- Requirement ที่อ้างอิง: SBH-1731

วัตถุประสงค์
- ยืนยันว่าปุ่มพิมพ์คิวรับยาไม่ออกเลขคิว Prefix R ที่สงวนไว้ให้คิวจัดยา Robot

ขอบเขต Requirement
- AC3 · BR2

ความเสี่ยง
- คิวคนไข้ Refill ไปปนกับคิวจัดยา Robot

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1731-004 - ตรวจสอบเลขคิวจากปุ่มพิมพ์คิวรับยาไม่ขึ้นต้นด้วย R (หน้า Prescription ห้องยา)
Priority: High · Type: Functional
```
Test Step
1. ใช้ใบยา Refill ที่ "คิว:" เดิมแสดงเป็น R (เหมือนรูปในการ์ด R001) หรือใบยาจาก `TC-SBH-1731-002`
2. กดไอคอนพิมพ์คิวรับยา
3. ดูเลขคิวบนบัตรคิวและที่หัวใบยา

Expected Result
เลขคิวไม่ขึ้นต้นด้วย R
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- เกณฑ์เลือก Prefix S / M / L ของคิวสั่งยาปกติคืออะไร (ขนาดใบยา / จำนวนรายการ) — การ์ดอ้างแค่ "ตามระบบเดิม" · TC-002 จึงตรวจแค่ว่าเป็น S, M หรือ L
- กดปุ่มซ้ำบนใบยาเดิม → พิมพ์เลขเดิมซ้ำ หรือออกเลขใหม่
- ใบยาที่มีคิวจากห้องตรวจแล้ว (ยาปกติ) ปุ่มนี้ต้องแสดงหรือไม่ และกดแล้วเกิดอะไร
- ปุ่มแสดงตั้งแต่สถานะไหนของใบยา (ใบยารอจัด / จัดยาแล้ว / จ่ายยาแล้ว)

Validation
- -

Error handling
- ไม่ได้ต่อเครื่องพิมพ์ / พิมพ์ไม่สำเร็จ — เลขคิวถูกจองไปแล้วหรือไม่

Permission / role
- -

Edge cases
- -
