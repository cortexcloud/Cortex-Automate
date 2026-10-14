# Draft Test Structure — SBH-2470

> สถานะ: **สร้างใน Linear แล้ว (2026-10-14)**
> - EXE SBH-2561 → HPY SBH-2562 (TC 001–012 = SBH-2565–2576) · UHP SBH-2563 (TC 013–017 = SBH-2577–2581) · ERR SBH-2564 (TC 018–020 = SBH-2582–2584)
> - Env: Dev-X / SBH Prod · QA Module : ER · Run Type CT · QA Sub-module / Feature : Mass Casualty Triage (label ใหม่ สร้างแล้ว)
> - ตัด TC ที่ไม่ทดสอบออกทั้งหมดตามที่ผู้ใช้สั่ง: TC [Optional] ทุกข้อ + TC Performance (AC3) + TC N=1 (ซ้ำกับ TC-002 / SBH-2502) → ตัด Scenario EDG ทั้งก้อน · เหลือ 20 TC [Required] เลข 001–020
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก Dev-X / SBH Prod) เหมือน SBH-2436

Requirement: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น
URL: https://linear.app/cortexcloud/issue/SBH-2470
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: Ready for Testing
Labels: 🍄 Improvement, 🐷 VERSION 2.8.1 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT

แหล่ง AC: description ของการ์ด + คอมเมนต์ spec ของ jetsadaporn (Dew) วันที่ 2026-10-07 หัวข้อ "Acceptance criteria" (10 ข้อ)
อ้างอิงในไฟล์นี้เป็น AC1–AC10 ตามลำดับในคอมเมนต์ spec

| AC | เนื้อหา | TC |
|---|---|---|
| AC1 | สร้างเหตุการณ์โดยไม่กรอกจำนวน: ทำงานเหมือนเดิม | 001 |
| AC2 | กรอก N=5: ได้ member 5 คน มี HN, VN, ER encounter ในห้อง triage ชื่อ `ไม่ระบุตัวตน <ชื่อเหตุการณ์> 01..05` | 002–005 |
| AC3 | N=50 เสร็จภายใน 20 วินาทีบน dev | — ไม่ทดสอบรอบนี้ (ผู้ใช้สั่ง 2026-10-14) |
| AC4 | ระหว่างลงทะเบียน: เห็น progress, triage คนที่เสร็จแล้วได้, submit ไม่ได้ | 006, 007, 013 |
| AC5 | ล้มกลางทาง → "สร้างส่วนที่เหลือ": ครบ N, เลขไม่ซ้ำ/ไม่ข้าม, ไม่มี HN กำพร้า | 018–020 |
| AC6 | member ที่ระบบสร้าง mark ready ไม่ได้จนกว่าจะยืนยันอายุและเพศ | 008, 014 |
| AC7 | triage รายคนจาก dashboard: เป็น "triage แยกแล้ว" และ submit ไม่สร้าง triage ซ้ำ | 009, 010 |
| AC8 | ลบ member ที่ระบบสร้างและยังไม่มีใครแตะ: ER visit ถูกยกเลิก | 011 |
| AC9 | ไม่มี config / code สิทธิ์หาไม่เจอ / ไม่มี slot แพทย์ ER: ช่องจำนวนกดไม่ได้และแสดงเหตุผล | 015–017 |
| AC10 | ปุ่มพิมพ์บัตรคิวทั้งหมด: พิมพ์ครบทุก member | 012 |

---

## EXE - CT - 2.8.1

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul
Labels: 🍄 Improvement, 🐷 VERSION 2.8.1, QA Module : ER, QA Sub-module / Feature : Mass Casualty Triage, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.1
- Module: ER
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- สร้างเหตุการณ์ Triage หมู่ แบบไม่กรอก / กรอกจำนวนผู้ป่วย (AC1, AC2)
- ระบบลงทะเบียนผู้ป่วยนิรนาม + เปิด ER visit อัตโนมัติ (AC2)
- การทำงานระหว่างลงทะเบียน: progress, triage, ห้าม submit (AC4)
- ลงทะเบียนล้มกลางทาง และ "สร้างส่วนที่เหลือ" (AC5)
- ยืนยันอายุ/เพศก่อน mark ready (AC6)
- triage รายคนจาก ER dashboard (AC7)
- ลบ member ที่ระบบสร้าง (AC8)
- ช่องจำนวนผู้ป่วยถูก disable พร้อมเหตุผล (AC9)
- พิมพ์บัตรคิวทั้งหมด (AC10)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2470-HPY - สร้างเหตุการณ์ Triage หมู่พร้อมลงทะเบียนผู้ป่วยและเปิด visit ตามจำนวนที่กรอก

Status: Ready for Testing · Labels: requirement labels + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

วัตถุประสงค์
- ยืนยันว่ากรอกจำนวนผู้ป่วยตอนสร้างเหตุการณ์แล้ว ระบบลงทะเบียนผู้ป่วยนิรนาม เปิด ER visit และผูกเป็น member ให้ครบ ใช้งานต่อ (ยืนยันข้อมูล / triage / ลบ / พิมพ์บัตรคิว) ได้ และไม่กรอกจำนวนยังทำงานแบบเดิม

ขอบเขต Requirement
- AC1: ไม่กรอกจำนวน ทำงานเหมือนเดิม
- AC2: N=5 ได้ member 5 คน มี HN, VN, ER encounter ในห้อง triage ชื่อ ไม่ระบุตัวตน <ชื่อเหตุการณ์> 01..05
- AC4: เห็น progress และ triage คนที่เสร็จแล้วได้ระหว่างลงทะเบียน
- AC6: ยืนยันอายุ/เพศแล้ว mark ready ได้
- AC7: triage รายคนจาก dashboard → "triage แยกแล้ว" และ submit ไม่ triage ซ้ำ
- AC8: ลบ member ที่ยังไม่มีใครแตะ → ER visit ถูกยกเลิก
- AC10: พิมพ์บัตรคิวทั้งหมดครบทุก member

ความเสี่ยง
- ลงทะเบียนไม่ครบ / ชื่อซ้ำ ทำให้แยกผู้ป่วยในเหตุการณ์ไม่ได้
- submit เขียน triage ซ้ำให้คนที่ triage แยกไปแล้ว
- ผู้ป่วยนิรนามค้างใน ER board หลังลบ member

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### [Required] TC-SBH-2470-001 - ตรวจสอบการสร้างเหตุการณ์โดยไม่กรอกจำนวนผู้ป่วย ทำงานเหมือนเดิม

Status: Not Run · Labels: requirement labels + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-001
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์จัดการ ER (er:manage)
2. เปิดหน้า Triage หมู่ได้

Test Data
- ชื่อเหตุการณ์ / เวลาเกิดเหตุ / สถานที่เกิดเหตุ / อาการสำคัญร่วม ที่กรอกครบ
- ช่องจำนวนผู้ป่วย: เว้นว่าง

Test Steps
1. กดสร้างเหตุการณ์
2. กรอกข้อมูลเหตุการณ์ครบทุกช่องบังคับ โดยไม่กรอกจำนวนผู้ป่วย
3. กดสร้าง

Expected Result
- สร้างเหตุการณ์สำเร็จ ไม่มีผู้ป่วยถูกลงทะเบียน ไม่มี progress "กำลังลงทะเบียน" และเพิ่ม member ได้ตาม flow ลงทะเบียนหมู่ปัจจุบัน

Actual Result
- -

หมายเหตุ
- AC1
```

### [Required] TC-SBH-2470-002 - ตรวจสอบจำนวน member ที่ระบบสร้าง เมื่อกรอกจำนวนผู้ป่วย 5 คน

Status: Not Run · Labels: เหมือน TC-001 (QA Case : Happy, QA Type : Functional, QA Execution Type: Manual)

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-002
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์จัดการ ER (er:manage)
2. มี config สิทธิ์ตั้งต้น er_mass_casualty_registration_defaults และมี slot แพทย์คลินิก ER ในขณะนั้น (ช่องจำนวนผู้ป่วยกดได้)

Test Data
- ชื่อเหตุการณ์ เช่น "รถบัสคว่ำ"
- จำนวนผู้ป่วย: 5

Test Steps
1. กดสร้างเหตุการณ์ กรอกข้อมูลเหตุการณ์ครบ และกรอกจำนวนผู้ป่วย 5
2. กดสร้าง
3. รอจนลงทะเบียนเสร็จ แล้วดูรายการ member ในหน้าเหตุการณ์

Expected Result
- ระบบพาเข้าหน้าเหตุการณ์ทันที และเมื่อลงทะเบียนเสร็จมี member ที่ระบบสร้างครบ 5 คน

Actual Result
- -

หมายเหตุ
- AC2
```

### [Required] TC-SBH-2470-003 - ตรวจสอบชื่อ-นามสกุลผู้ป่วยที่ระบบสร้าง เป็น ไม่ระบุตัวตน + ชื่อเหตุการณ์ + เลขลำดับ 2 หลัก

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-003
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. ทำ TC-SBH-2470-002 แล้ว (เหตุการณ์ "รถบัสคว่ำ" มี member ที่ระบบสร้าง 5 คน)

Test Data
- เหตุการณ์ "รถบัสคว่ำ" N=5

Test Steps
1. เปิดหน้าเหตุการณ์
2. ดูชื่อ-นามสกุลของ member ทั้ง 5 คน

Expected Result
- ชื่อ "ไม่ระบุตัวตน" นามสกุล "รถบัสคว่ำ 01" ถึง "รถบัสคว่ำ 05" เรียงต่อเนื่อง ไม่ซ้ำ ไม่ข้าม

Actual Result
- -

หมายเหตุ
- AC2
```

### [Required] TC-SBH-2470-004 - ตรวจสอบผู้ป่วยที่ระบบสร้างได้ HN จริงทุกคน

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-004
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. ทำ TC-SBH-2470-002 แล้ว

Test Data
- เหตุการณ์ "รถบัสคว่ำ" N=5

Test Steps
1. ดู HN ของ member ทั้ง 5 คนในหน้าเหตุการณ์
2. ค้นหาผู้ป่วยด้วย HN แต่ละรายที่หน้าค้นหาผู้ป่วย

Expected Result
- member ทุกคนมี HN ไม่ซ้ำกัน และค้นหาเจอเป็นผู้ป่วยในระบบ

Actual Result
- -

หมายเหตุ
- AC2
```

### [Required] TC-SBH-2470-005 - ตรวจสอบผู้ป่วยที่ระบบสร้างมี VN และ ER encounter อยู่ในห้อง triage

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-005
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. ทำ TC-SBH-2470-002 แล้ว

Test Data
- เหตุการณ์ "รถบัสคว่ำ" N=5

Test Steps
1. เปิด ER board / ER dashboard
2. หาผู้ป่วย "ไม่ระบุตัวตน รถบัสคว่ำ 01" ถึง "05"

Expected Result
- ผู้ป่วยทั้ง 5 คนมี VN และแสดงเป็น ER encounter อยู่ในห้อง triage

Actual Result
- -

หมายเหตุ
- AC2
```

### [Required] TC-SBH-2470-006 - แสดง progress กำลังลงทะเบียน x/N ระหว่างระบบลงทะเบียนผู้ป่วย

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-006
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์จัดการ ER (er:manage)
2. ช่องจำนวนผู้ป่วยกดได้

Test Data
- จำนวนผู้ป่วย: 50 (เพื่อให้เห็นช่วงที่กำลังลงทะเบียน)

Test Steps
1. สร้างเหตุการณ์โดยกรอกจำนวนผู้ป่วย 50
2. ดูหน้าเหตุการณ์ทันทีหลังกดสร้าง จนลงทะเบียนเสร็จ

Expected Result
- แสดง "กำลังลงทะเบียน x/50" โดย x เพิ่มขึ้นเรื่อย ๆ และ member ที่สร้างเสร็จโผล่ในรายการระหว่างนั้น

Actual Result
- -

หมายเหตุ
- AC4
```

### [Required] TC-SBH-2470-007 - ทดสอบ triage member ที่ลงทะเบียนเสร็จแล้ว ระหว่างที่ระบบยังลงทะเบียนคนอื่นอยู่

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-007
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์จัดการ ER (er:manage)
2. ช่องจำนวนผู้ป่วยกดได้

Test Data
- จำนวนผู้ป่วย: 50

Test Steps
1. สร้างเหตุการณ์โดยกรอกจำนวนผู้ป่วย 50
2. ระหว่างที่ยังแสดง "กำลังลงทะเบียน" เลือก member คนแรกที่สร้างเสร็จ
3. ทำ triage member คนนั้น

Expected Result
- triage member ที่สร้างเสร็จแล้วได้ทันที โดยไม่ต้องรอให้ลงทะเบียนครบ

Actual Result
- -

หมายเหตุ
- AC4
```

### [Required] TC-SBH-2470-008 - ทดสอบ mark ready member ที่ระบบสร้าง หลังยืนยันอายุและเพศแล้ว

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-008
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. มีเหตุการณ์ที่ลงทะเบียนเสร็จแล้ว และมี member ที่ระบบสร้างที่ยังไม่ยืนยันอายุ/เพศ

Test Data
- อายุจริง เช่น 45 ปี · เพศ: ชาย

Test Steps
1. ที่การ์ด member กดยืนยันอายุ/เพศ
2. กรอกอายุและเพศจริง แล้วยืนยัน
3. กด mark ready

Expected Result
- ยืนยันอายุ/เพศสำเร็จ ปุ่ม ready กดได้ และ member เปลี่ยนเป็นสถานะ ready

Actual Result
- -

หมายเหตุ
- AC6 (ฝั่งที่ทำได้) · ฝั่งที่ทำไม่ได้อยู่ที่ TC-SBH-2470-014
```

### [Required] TC-SBH-2470-009 - ตรวจสอบสถานะ member เป็น triage แยกแล้ว เมื่อ triage รายคนจาก ER dashboard

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-009
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. มีเหตุการณ์ที่ลงทะเบียนเสร็จแล้ว อย่างน้อย 3 member ที่ยังไม่ triage

Test Data
- member "ไม่ระบุตัวตน <ชื่อเหตุการณ์> 01"

Test Steps
1. เปิด ER dashboard
2. triage ผู้ป่วย "ไม่ระบุตัวตน <ชื่อเหตุการณ์> 01" รายคนจนบันทึกสำเร็จ
3. กลับไปหน้าเหตุการณ์ ดูการ์ด member คนนั้น

Expected Result
- member ยังอยู่ในเหตุการณ์ และแสดงสถานะ/badge "triage แยกแล้ว"

Actual Result
- -

หมายเหตุ
- AC7
```

### [Required] TC-SBH-2470-010 - ตรวจสอบ submit เหตุการณ์ไม่สร้าง triage ซ้ำให้ member ที่ triage แยกแล้ว

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-010
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. ทำ TC-SBH-2470-009 แล้ว (member 01 เป็น "triage แยกแล้ว")
2. member อื่นอย่างน้อย 2 คนยืนยันอายุ/เพศและ ready แล้ว

Test Data
- เหตุการณ์จาก TC-SBH-2470-009

Test Steps
1. จดผล triage และตำแหน่ง (ห้อง/โซน) ของ member 01
2. submit เหตุการณ์
3. เปิดประวัติคัดกรอง (screening) ของ member 01

Expected Result
- member 01 มีผล triage 1 รายการเท่าเดิม และตำแหน่งไม่เปลี่ยน · member ที่ ready ถูก triage ตามปกติ

Actual Result
- -

หมายเหตุ
- AC7
```

### [Required] TC-SBH-2470-011 - ตรวจสอบ ER visit ถูกยกเลิก เมื่อลบ member ที่ระบบสร้างและยังไม่มีใครทำอะไร

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-011
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. มีเหตุการณ์ที่ลงทะเบียนเสร็จแล้ว
2. มี member ที่ระบบสร้างที่ยังไม่มี triage, order หรือบันทึกทางคลินิก

Test Data
- member "ไม่ระบุตัวตน <ชื่อเหตุการณ์> 05"

Test Steps
1. ลบ member "ไม่ระบุตัวตน <ชื่อเหตุการณ์> 05" ออกจากเหตุการณ์
2. เปิด ER board
3. ค้นหา visit ของ HN นั้น

Expected Result
- ER visit/encounter ของผู้ป่วยถูกยกเลิก และไม่แสดงบน ER board แล้ว

Actual Result
- -

หมายเหตุ
- AC8
```

### [Required] TC-SBH-2470-012 - ทดสอบปุ่มพิมพ์บัตรคิวทั้งหมด พิมพ์ครบทุก member

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-012
- Scenario ID: TS-SBH-2470-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. มีเหตุการณ์ที่ลงทะเบียนเสร็จแล้ว (N=5)

Test Data
- เหตุการณ์ N=5

Test Steps
1. เปิดหน้าเหตุการณ์
2. กดปุ่ม "พิมพ์บัตรคิวทั้งหมด"
3. ตรวจตัวอย่างก่อนพิมพ์ / ไฟล์ที่ได้

Expected Result
- ได้บัตรคิว 5 ใบ ครบทุก member ชื่อและ HN ตรงกับ member แต่ละคน

Actual Result
- -

หมายเหตุ
- AC10
```

---

## TS-SBH-2470-UHP - ป้องกันการทำงานที่ไม่อนุญาตระหว่าง/หลังลงทะเบียน และช่องจำนวนผู้ป่วยกดไม่ได้

Status: Ready for Testing · Labels: requirement labels + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2470-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

วัตถุประสงค์
- ยืนยันว่าระบบกันการ submit ระหว่างลงทะเบียน กันการ mark ready ก่อนยืนยันข้อมูล และ disable ช่องจำนวนผู้ป่วยพร้อมเหตุผลเมื่อเตรียมค่าตั้งต้นไม่ได้

ขอบเขต Requirement
- AC4: submit ไม่ได้ระหว่างลงทะเบียน
- AC6: member ที่ระบบสร้าง mark ready ไม่ได้จนกว่าจะยืนยันอายุและเพศ
- AC9: ไม่มี config / code สิทธิ์หาไม่เจอ / ไม่มี slot แพทย์ ER → ช่องจำนวนกดไม่ได้และแสดงเหตุผล

ความเสี่ยง
- submit ระหว่างลงทะเบียนทำให้ member บางคนหลุดจากการ triage หมู่
- ผู้ป่วยถูก triage ด้วยอายุ/เพศชั่วคราว ทำให้ข้อมูลคลินิกผิด
- ผู้ใช้ไม่รู้ว่าทำไมกรอกจำนวนไม่ได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### [Required] TC-SBH-2470-013 - ตรวจสอบปุ่ม submit กดไม่ได้ ระหว่างที่ระบบยังลงทะเบียนผู้ป่วย

Status: Not Run · Labels: requirement labels + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Unhappy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-013
- Scenario ID: TS-SBH-2470-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. Login ด้วยผู้ใช้ที่มีสิทธิ์จัดการ ER (er:manage)
2. ช่องจำนวนผู้ป่วยกดได้

Test Data
- จำนวนผู้ป่วย: 50

Test Steps
1. สร้างเหตุการณ์โดยกรอกจำนวนผู้ป่วย 50
2. ระหว่างที่ยังแสดง "กำลังลงทะเบียน" ลองกด submit เหตุการณ์

Expected Result
- ปุ่ม submit ถูก disable ระหว่างลงทะเบียน กด submit ไม่ได้

Actual Result
- -

หมายเหตุ
- AC4
```

### [Required] TC-SBH-2470-014 - ตรวจสอบ mark ready ไม่ได้ เมื่อ member ที่ระบบสร้างยังไม่ยืนยันอายุและเพศ

Status: Not Run · Labels: เหมือน TC-013

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-014
- Scenario ID: TS-SBH-2470-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. มีเหตุการณ์ที่ลงทะเบียนเสร็จแล้ว และมี member ที่ระบบสร้างที่ยังไม่ยืนยันอายุ/เพศ

Test Data
- member "ไม่ระบุตัวตน <ชื่อเหตุการณ์> 02"

Test Steps
1. เปิดการ์ด member "ไม่ระบุตัวตน <ชื่อเหตุการณ์> 02" โดยไม่ยืนยันอายุ/เพศ
2. ลองกด mark ready

Expected Result
- ปุ่ม ready ถูก disable หรือระบบปฏิเสธ member ยังไม่เป็น ready

Actual Result
- -

หมายเหตุ
- AC6
- เทคนิค: State Transition — เส้นที่ต้องทำไม่ได้ (placeholder → ready)
```

### [Required] TC-SBH-2470-015 - ตรวจสอบช่องจำนวนผู้ป่วยกดไม่ได้และแสดงเหตุผล เมื่อไม่มี config สิทธิ์ตั้งต้น

Status: Not Run · Labels: เหมือน TC-013

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-015
- Scenario ID: TS-SBH-2470-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. ไม่มี row er_mass_casualty_registration_defaults ในตาราง config (ต้องให้ Dev ช่วยลบ/ปิด)
2. มี slot แพทย์คลินิก ER ในขณะนั้น

Test Data
- -

Test Steps
1. เปิดหน้า Triage หมู่ แล้วกดสร้างเหตุการณ์
2. ดูช่องจำนวนผู้ป่วย

Expected Result
- ช่องจำนวนผู้ป่วยกดไม่ได้ และแสดงเหตุผลว่ายังไม่ได้ตั้งค่าสิทธิ์ตั้งต้น

Actual Result
- -

หมายเหตุ
- AC9 · เหตุผลฝั่ง API = CONFIG_MISSING (ข้อความที่แสดงบนจอไม่ได้ระบุในการ์ด)
- เทคนิค: Decision Table — คอลัมน์ config ไม่มี
```

### [Required] TC-SBH-2470-016 - ตรวจสอบช่องจำนวนผู้ป่วยกดไม่ได้และแสดงเหตุผล เมื่อหาสิทธิ์ตาม code ใน config ไม่เจอ

Status: Not Run · Labels: เหมือน TC-013

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-016
- Scenario ID: TS-SBH-2470-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. config er_mass_casualty_registration_defaults ชี้ไปที่ insurancePlanCode ที่ไม่มีในระบบ (ต้องให้ Dev ช่วยแก้)
2. มี slot แพทย์คลินิก ER ในขณะนั้น

Test Data
- insurancePlanCode ที่ไม่มีในระบบ

Test Steps
1. เปิดหน้า Triage หมู่ แล้วกดสร้างเหตุการณ์
2. ดูช่องจำนวนผู้ป่วย

Expected Result
- ช่องจำนวนผู้ป่วยกดไม่ได้ และแสดงเหตุผลว่าหาสิทธิ์ที่ตั้งไว้ไม่เจอ

Actual Result
- -

หมายเหตุ
- AC9 · เหตุผลฝั่ง API = INSURANCE_PLAN_NOT_FOUND
- เทคนิค: Decision Table — คอลัมน์ config มีแต่ code ไม่ถูกต้อง
```

### [Required] TC-SBH-2470-017 - ตรวจสอบช่องจำนวนผู้ป่วยกดไม่ได้และแสดงเหตุผล เมื่อขณะนั้นไม่มี slot แพทย์คลินิก ER

Status: Not Run · Labels: เหมือน TC-013

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-017
- Scenario ID: TS-SBH-2470-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. config สิทธิ์ตั้งต้นถูกต้อง
2. ขณะนั้นไม่มี slot แพทย์คลินิก ER (ตั้งตารางแพทย์ให้ไม่มี slot ช่วงเวลาที่ทดสอบ)

Test Data
- -

Test Steps
1. เปิดหน้า Triage หมู่ แล้วกดสร้างเหตุการณ์
2. ดูช่องจำนวนผู้ป่วย

Expected Result
- ช่องจำนวนผู้ป่วยกดไม่ได้ และแสดงเหตุผลว่าไม่มี slot แพทย์ ER

Actual Result
- -

หมายเหตุ
- AC9 · เหตุผลฝั่ง API = NO_ER_SLOT
- เทคนิค: Decision Table — คอลัมน์ config ถูกต้องแต่ไม่มี slot
```

---

## TS-SBH-2470-ERR - ลงทะเบียนล้มกลางทางและสร้างส่วนที่เหลือ

Status: Ready for Testing · Labels: requirement labels + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Error

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2470-ERR
- Case Type: Error
- Suffix: ERR
- Module: ER
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

วัตถุประสงค์
- ยืนยันว่าเมื่อการลงทะเบียนล้มกลางทาง ระบบเก็บคนที่สำเร็จไว้ และ "สร้างส่วนที่เหลือ" ได้ครบโดยไม่สร้างผู้ป่วยซ้ำ

ขอบเขต Requirement
- AC5: ล้มกลางทาง แล้วกด "สร้างส่วนที่เหลือ": ได้ครบ N, เลขลำดับไม่ซ้ำ/ไม่ข้าม, ไม่มี HN กำพร้าเพิ่ม

ความเสี่ยง
- ผู้ป่วยนิรนามซ้ำ / HN กำพร้าในระบบ
- เลขลำดับข้ามหรือซ้ำ ทำให้ระบุตัวผู้ป่วยหน้างานผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- การทำให้ล้มกลางทางต้องให้ Dev ช่วย (เช่น หยุด worker ระหว่างลงทะเบียน)
```

### [Required] TC-SBH-2470-018 - แสดงจำนวนที่ไม่สำเร็จและปุ่มสร้างส่วนที่เหลือ เมื่อลงทะเบียนล้มกลางทาง

Status: Not Run · Labels: requirement labels + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Error + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-018
- Scenario ID: TS-SBH-2470-ERR
- Case Type: Error
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. ช่องจำนวนผู้ป่วยกดได้
2. Dev พร้อมทำให้การลงทะเบียนล้มกลางทาง

Test Data
- จำนวนผู้ป่วย: 10

Test Steps
1. สร้างเหตุการณ์โดยกรอกจำนวนผู้ป่วย 10
2. ระหว่างลงทะเบียน ให้ Dev ทำให้ล้ม
3. ดูหน้าเหตุการณ์

Expected Result
- member ที่สร้างสำเร็จแล้วยังอยู่ ระบบแจ้งจำนวนที่ไม่สำเร็จ และแสดงปุ่ม "สร้างส่วนที่เหลือ"

Actual Result
- -

หมายเหตุ
- AC5
```

### [Required] TC-SBH-2470-019 - ตรวจสอบสร้างส่วนที่เหลือแล้วได้ครบ N และเลขลำดับไม่ซ้ำไม่ข้าม

Status: Not Run · Labels: เหมือน TC-018

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-019
- Scenario ID: TS-SBH-2470-ERR
- Case Type: Error
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. ทำ TC-SBH-2470-018 แล้ว (เหตุการณ์ N=10 ล้มกลางทาง)
2. Dev คืนระบบให้ลงทะเบียนได้ตามปกติ

Test Data
- เหตุการณ์ N=10 จาก TC-SBH-2470-018

Test Steps
1. จดชื่อและเลขลำดับของ member ที่สำเร็จไปแล้ว
2. กด "สร้างส่วนที่เหลือ" แล้วรอจนเสร็จ
3. ดูรายการ member ทั้งหมด

Expected Result
- มี member ที่ระบบสร้างครบ 10 คน เลขลำดับ 01–10 ไม่ซ้ำ ไม่ข้าม และคนที่ขาดได้เลขลำดับเดิมของตัวเอง

Actual Result
- -

หมายเหตุ
- AC5
```

### [Required] TC-SBH-2470-020 - ตรวจสอบสร้างส่วนที่เหลือแล้วไม่มี HN กำพร้าหรือผู้ป่วยซ้ำเพิ่ม

Status: Not Run · Labels: requirement labels + QA Module : ER + QA Sub-module / Feature : Mass Casualty Triage + QA Case : Error + QA Type : Integration + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-2470-020
- Scenario ID: TS-SBH-2470-ERR
- Case Type: Error
- Test Level: Integration
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: SBH-2470 — [ER] [ Triage หมู่ ] Improve ให้สามารถลงทะเบียนผู้ป่วยและเปิด visit ได้เร็วขึ้น

Preconditions
1. ทำ TC-SBH-2470-019 แล้ว

Test Data
- เหตุการณ์ N=10 จาก TC-SBH-2470-018

Test Steps
1. ค้นหาผู้ป่วยด้วยนามสกุล "<ชื่อเหตุการณ์>" ที่หน้าค้นหาผู้ป่วย
2. เทียบจำนวนผู้ป่วยที่เจอกับจำนวน member และ HN ของแต่ละคน

Expected Result
- เจอผู้ป่วย 10 คนพอดี HN ตรงกับ member ทุกคน ไม่มีผู้ป่วยชื่อซ้ำหรือ HN ที่ไม่ผูกกับ member

Actual Result
- -

หมายเหตุ
- AC5 · ถ้าต้องยืนยันระดับ DB ให้ Dev ช่วยเทียบจำนวน slot.hn กับผู้ป่วยที่ถูกสร้าง
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- ข้อความเหตุผลที่แสดงตอนช่องจำนวนผู้ป่วยถูก disable (AC9) ไม่ได้ระบุ — มีแค่รหัสฝั่ง API (CONFIG_MISSING / INSURANCE_PLAN_NOT_FOUND / NO_ER_SLOT)
- วิธีปิดเหตุการณ์เมื่อทุกคน triage แยกหมด (กดปุ่มเอง หรือปิดอัตโนมัติ) ไม่ได้ระบุ
- แก้ไขเหตุการณ์ไม่มีช่องจำนวนผู้ป่วย (คอมเมนต์ Note Bug 2026-10-14) — spec ระบุ "เพิ่มอีก N คน" เป็นนอก scope จึงอาจไม่ใช่บั๊ก ควรให้ PO ยืนยัน
- version ไม่ตรงกัน: label การ์ด = VERSION 2.8.1 แต่ชื่อ PR = V2.9.0 (ร่างนี้ใช้ 2.8.1 ตาม label)

Validation
- ค่าผิดของช่องจำนวน (0, 51, ทศนิยม, ค่าลบ) ไม่ได้ระบุผลในการ์ดนี้ — ย้ายไปอยู่ที่ SBH-2502 แล้ว จึงไม่สร้าง TC ซ้ำ

Error handling
- ข้อความแจ้งจำนวนที่ไม่สำเร็จ และ error ตอนเกิน 50 คน ไม่ได้ระบุถ้อยคำ
- QA ทำให้ลงทะเบียนล้มกลางทางเองไม่ได้ ต้องให้ Dev ช่วย (AC5)

Permission / role
- spec ระบุสิทธิ์ er:manage แต่ไม่ได้บอกว่า role ไหน (Nurse / Doctor / Super_User) ใช้ฟีเจอร์นี้ได้ / ไม่ได้

Edge cases
- ยืนยันอายุ/เพศ: ช่วงอายุที่กรอกได้ และค่าเพศที่เลือกได้ ไม่ได้ระบุ
- AC3 (Performance) ไม่ทดสอบรอบนี้ตามที่ผู้ใช้สั่ง · การ์ดวัดบน dev ไม่ได้ระบุเป้าบน env อื่น (SBH Prod)
