# SBH-1085 — [BUG][Order Set] Can't load order set — Test Coverage

- Requirement: https://linear.app/cortexcloud/issue/SBH-1085
- สร้างตาม skill `linear-testcase-writer` แบบ atomic (1 TC = 1 จุดตรวจ)
- **Draft Coverage**: การ์ดเป็นบั๊ก ไม่มี Acceptance Criteria มีแค่ Steps to Reproduce (สร้าง Order Set ที่เมนู Order set หรือ Product Package → สร้างสำเร็จ → เรียกใช้บน OPD Card) — TC สร้างจาก Steps นี้เท่านั้น
- สถานะไฟล์นี้: **สร้างใน Linear แล้ว 27 ต.ค. 2026** — EXE SBH-3002 · Scenario SBH-3003 (HPY) / SBH-3004 (UHP) / SBH-3005 (EDG) · TC SBH-3006–3021 (001–016 ตามลำดับ)
- รวม: 1 EXE, 3 Scenario (HPY / UHP / EDG), **16 Test Case** (Required 16)
- เคส UHP / EDG เพิ่มตามที่ QA เลือก (27 ต.ค. 2026) — การ์ดไม่มี AC ผลที่คาดยึดตามที่ระบบทำจริงบน DEV-X
- Label ที่ยืนยันแล้ว (27 ต.ค. 2026): `QA Module : OPD` · `QA Sub-module / Feature : CPOE` · EXE ใช้ `QA Run : Retest`
- Business rule เพิ่มเติม: ผู้ใช้ตอบว่าไม่มี — ยึดตามที่เห็นในระบบ
- ผลสำรวจบน DEV-X (26 ต.ค. 2026, user1, HN 6932107) อยู่ใน "หมายเหตุ" ของ TC ที่เกี่ยวข้อง — ช่อง Actual Result ยังว่าง รอรันจริง

### การ map Steps ในการ์ด → TC

| Steps ในการ์ด | เมนูที่สร้าง | TC |
|---|---|---|
| 1–2 สร้าง Order Set สำเร็จ | ตั้งค่า Order Set | 001 |
| 3 เรียกใช้บน OPD Card — ค้นหาเจอ | ตั้งค่า Order Set | 002 |
| 3 เรียกใช้บน OPD Card — เลือกแล้วเห็นรายการ | ตั้งค่า Order Set | 003 |
| 3 เรียกใช้บน OPD Card — กดยืนยันแล้วลงตะกร้า | ตั้งค่า Order Set | 004 |
| 3 เรียกใช้บน OPD Card — โหลดหน้าใหม่แล้วยังอยู่ | ตั้งค่า Order Set | 005 |
| 1–2 สร้าง Order Set สำเร็จ | แพ็คเกจ (Product Package) | 006 |
| 3 เรียกใช้บน OPD Card — ค้นหาเจอ | แพ็คเกจ (Product Package) | 007 |
| 3 เรียกใช้บน OPD Card — กดยืนยันแล้วลงตะกร้า | แพ็คเกจ (Product Package) | 008 |
| 1–2 สร้างไม่สำเร็จเมื่อไม่กรอกช่องบังคับ | ตั้งค่า Order Set | 009 (UHP) |
| 1–2 สร้างไม่สำเร็จเมื่อไม่กรอกช่องบังคับ | แพ็คเกจ (Product Package) | 010 (UHP) |
| 1–2 สร้างด้วยรหัสซ้ำ | แพ็คเกจ (Product Package) | 011 (UHP) |
| 3 ค้นชื่อที่ไม่มีใน popup | — | 012 (UHP) |
| 3 ค้นด้วยตัวพิมพ์ต่างจากรหัส | ตั้งค่า Order Set | 013 (EDG) |
| 3 ค้นด้วยบางส่วนของชื่อ | ตั้งค่า Order Set | 014 (EDG) |
| 3 แพ็กเกจปิดใช้งานไม่ขึ้นใน popup | แพ็คเกจ (Product Package) | 015 (EDG) |
| 3 แพ็กเกจประเภท IPD ไม่ขึ้นใน popup | แพ็คเกจ (Product Package) | 016 (EDG) |

### Requirement gap

- **expected behavior**: การ์ดไม่บอกว่า Order Set ที่สร้างจากหน้า แพ็คเกจ ต้องขึ้นแท็บไหนของ popup (My / Public) — dev-x ปัจจุบันขึ้นแท็บ My Order Set ของผู้สร้าง · ไม่บอกว่าต้องกดส่งคำสั่งต่อได้หรือไม่
- **expected behavior**: ฟอร์ม สร้างแพ็กเกจ ไม่มีช่องวิธีใช้ของยา (ฟอร์ม สร้าง Order Set มี) — การ์ดไม่บอกว่ายาจากแพ็กเกจเมื่อลงตะกร้าบน OPD Card ต้องมีวิธีใช้หรือให้แพทย์กรอกเอง
- **validation**: ไม่ระบุว่าแพ็กเกจที่ปิดการใช้งาน (Active = off) หรือประเภทบริการ IPD ต้องไม่ขึ้นบน OPD Card — TC-015 / 016 ยึดตามระบบ (dev-x ไม่แสดงทั้งคู่)
- **validation**: การ์ดไม่ระบุว่ารหัสซ้ำได้หรือไม่ — TC-011 ใช้ผลที่คาดตาม QA ว่ารหัสต้องไม่ซ้ำ (ข้อมูลแพ็กเกจ 106 รายการบน dev-x ไม่มีรหัสซ้ำเลย) · ไม่ระบุว่ารหัสต่างแค่ตัวพิมพ์เล็ก/ใหญ่ถือว่าซ้ำหรือไม่
- **error handling**: ไม่ระบุข้อความเตือนเมื่อไม่กรอกช่องบังคับ และข้อความเมื่อค้นไม่เจอ — ยึดตามระบบ · สองฟอร์มใช้ข้อความต่างกัน ("กรุณากรอก..." กับ "จำเป็น")
- **edge cases**: ค้นหาด้วยตัวพิมพ์เล็ก/ใหญ่ต่างจากรหัส (หลักฐานในการ์ดค้น "Aug14" กับรหัส aug14D) — QA ขอให้แตกเป็น TC-013 · ค้นหาโดยมีช่องว่างหน้า-หลังไม่เจอ (ไม่แตกเป็น TC เพราะไม่รู้ว่าระบบควรตัดช่องว่างหรือไม่)
- **นอกขอบเขต**: คำขอ "ปิดหน้าสร้าง Order Set ไป 1 หน้า" ท้ายการ์ด ย้ายไป SBH-2966 · บั๊กหน้าตั้งค่าแสดงแค่ 20 รายการ = SBH-2965 · ช่อง สร้างโดย เป็น UUID = SBH-2967

---

## EXE

### EXE - RT - VERSION 2.7.0

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: RT
- Scope / Version: VERSION 2.7.0
- Module: OPD — Order Set
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set
- Environment: DEV-X
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- สร้าง Order Set จากเมนู ตั้งค่า Order Set แล้วเรียกใช้บน OPD Card
- สร้าง Order Set จากเมนู แพ็คเกจ (Product Package) แล้วเรียกใช้บน OPD Card
- รายการจาก Order Set ลงตะกร้าคำสั่งและยังอยู่หลังโหลดหน้าใหม่
- ฟอร์มสร้างไม่กรอกช่องบังคับ / รหัสซ้ำ และค้นชื่อที่ไม่มีใน popup
- ค้นด้วยตัวพิมพ์ต่างกัน / บางส่วนของชื่อ และแพ็กเกจปิดใช้งาน / IPD ไม่แสดงบน OPD Card

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## Scenario

### TS-SBH-1085-HPY - สร้าง Order Set แล้วเรียกใช้บน OPD Card ได้

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1085-HPY
- Case Type: Happy
- Suffix: HPY
- Module: OPD — Order Set
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

วัตถุประสงค์
- ยืนยันว่า Order Set ที่สร้างสำเร็จ เรียกใช้บน OPD Card ได้ ทั้งที่สร้างจากเมนู ตั้งค่า Order Set และเมนู แพ็คเกจ

ขอบเขต Requirement
- สร้าง Order Set ที่เมนู Order set หรือเมนู Product Package
- สร้างสำเร็จ
- เรียกใช้งานบน OPD Card

ความเสี่ยง
- แพทย์สร้าง Order Set ไว้แล้วใช้สั่งคำสั่งไม่ได้ ต้องสั่งทีละรายการเอง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- การ์ดไม่มี AC — ใช้ Steps to Reproduce ของการ์ดแทน (Draft Coverage)
```

### TS-SBH-1085-UHP - สร้างหรือค้นหา Order Set ด้วยข้อมูลไม่ถูกต้อง

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1085-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: OPD — Order Set
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

วัตถุประสงค์
- ยืนยันว่าระบบไม่สร้าง Order Set / แพ็กเกจเมื่อข้อมูลไม่ครบหรือรหัสซ้ำ และ popup ไม่แสดงรายการเมื่อค้นชื่อที่ไม่มี

ขอบเขต Requirement
- สร้าง Order Set ที่เมนู Order set หรือเมนู Product Package
- เรียกใช้งานบน OPD Card

ความเสี่ยง
- สร้าง Order Set ที่ข้อมูลไม่ครบหรือรหัสซ้ำ ทำให้แพทย์เลือกชุดผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- การ์ดไม่มี AC — ผลที่คาดยึดตามที่ระบบทำจริงบน DEV-X (Draft Coverage)
```

### TS-SBH-1085-EDG - ค้นหาและแสดง Order Set ในกรณีขอบเขต

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1085-EDG
- Case Type: Edge
- Suffix: EDG
- Module: OPD — Order Set
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

วัตถุประสงค์
- ยืนยันการค้นหาใน popup Order Set ด้วยตัวพิมพ์ต่างกันและบางส่วนของชื่อ และยืนยันว่าแพ็กเกจที่ปิดใช้งานหรือเป็นประเภท IPD ไม่แสดงบน OPD Card

ขอบเขต Requirement
- เรียกใช้งานบน OPD Card

ความเสี่ยง
- แพทย์ค้น Order Set ไม่เจอเพราะพิมพ์ตัวพิมพ์ต่างจากรหัส (ตัวอย่างในการ์ดค้น "Aug14" กับรหัส aug14D)
- แพทย์เลือกแพ็กเกจที่ปิดใช้งานแล้วหรือเป็นของ IPD มาสั่งบน OPD

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- การ์ดไม่มี AC — ผลที่คาดยึดตามที่ระบบทำจริงบน DEV-X (Draft Coverage)
```

---

## Test Case

### [Required] TC-SBH-1085-001 - ตรวจสอบการสร้าง My Order Set ที่เมนู ตั้งค่า Order Set สำเร็จ

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-001
- Scenario ID: TS-SBH-1085-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. Login ด้วย user1 (Super_User)
2. มีสิทธิ์เมนู ตั้งค่า Order Set

Test Data
- รหัส: SBH1085-OS-<วันที่>
- ชื่อภาษาไทย: ทดสอบ SBH-1085 เมนู Order Set <วันที่>
- ชื่อภาษาอังกฤษ: Test SBH-1085 Order Set menu <วันที่>
- รายการยา: [12621_1] amoxicillin + clavulanic acid, CAVUMOX 875 mg + 125 mg (tablet) · วิธีการใช้ 1*2pc · จำนวนที่จ่าย 1 · หน่วยจ่าย tablet

Test Steps
1. เปิดเมนู ตั้งค่า Order Set → แท็บ My Order Set
2. กดปุ่ม สร้าง My Order Set → เปิดหน้าต่าง สร้าง Order Set
3. กรอก * รหัส · * ชื่อภาษาไทย · * ชื่อภาษาอังกฤษ
4. ที่ Order Search พิมพ์ "CAVUMOX" แล้วเลือก [12621_1] CAVUMOX 875 mg + 125 mg (tablet)
5. กรอก ระบุวิธีการใช้ "1*2pc" แล้วตรวจว่า * วิธีใช้ · * จำนวนที่จ่าย · * หน่วยจ่าย มีค่า
6. กดปุ่ม เพิ่มลง Basket
7. กดปุ่ม สร้าง
8. พิมพ์รหัสหรือชื่อในช่อง ค้นหา Order Set

Expected Result
- Order Set ที่สร้างขึ้นในตาราง My Order Set สถานะ Active เปิดอยู่

Actual Result
- -

หมายเหตุ
- เมนู ตั้งค่า Order Set = `/cortex/setting/admin/order-set` (เปิดเมื่อ feature flag `opd.order-set.create-edit-page` เปิด — dev-x เปิดอยู่)
- ตารางหน้านี้แสดงแค่ 20 รายการแรก (SBH-2965) จึงตรวจด้วยการค้นหาชื่อ
- สำรวจฟอร์มบน DEV-X 27 ต.ค. 2026 (กดยกเลิก ไม่บันทึก): ช่องบังคับ รหัส / ชื่อภาษาไทย / ชื่อภาษาอังกฤษ · เลือกยาแล้วมีช่องบังคับเพิ่ม วิธีใช้ / จำนวนที่จ่าย / หน่วยจ่าย และช่อง ประเภทการใช้ (Home med ตั้งต้น) · ฟอร์มนี้ไม่มีช่องเลือก My / Clinic
- ข้อความหลังกด สร้าง ยังไม่เคยเห็น (ยังไม่ได้บันทึกจริง)
```

### [Required] TC-SBH-1085-002 - ตรวจสอบการค้นหา Order Set ที่สร้างจากเมนู ตั้งค่า Order Set ใน popup Order Set บน OPD Card

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-002
- Scenario ID: TS-SBH-1085-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. ผ่าน TC-SBH-1085-001 (มี Order Set ที่สร้างจากเมนู ตั้งค่า Order Set)
2. มีผู้ป่วยทดสอบที่มี Visit OPD เปิดอยู่

Test Data
- Order Set จาก TC-SBH-1085-001
- ผู้ป่วยทดสอบที่มี Visit OPD เปิดอยู่

Test Steps
1. เปิด OPD Card ของผู้ป่วย
2. ที่ส่วน Order กดปุ่ม Order Set
3. อยู่แท็บ My Order Set พิมพ์ชื่อ Order Set ในช่อง ค้นหา Order Set

Expected Result
- รายการ Order Set ที่สร้างขึ้นในรายการฝั่งซ้ายของ popup

Actual Result
- -

หมายเหตุ
- -
```

### [Required] TC-SBH-1085-003 - ตรวจสอบการเลือก Order Set ใน popup Order Set แล้วแสดงรายการคำสั่งในชุด

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-003
- Scenario ID: TS-SBH-1085-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. ผ่าน TC-SBH-1085-002 (popup Order Set เปิดอยู่และค้นเจอ Order Set)

Test Data
- Order Set จาก TC-SBH-1085-001

Test Steps
1. กดชื่อ Order Set ในรายการฝั่งซ้าย

Expected Result
- ฝั่งขวาของ popup แสดงรายการคำสั่งในชุดตรงกับที่บันทึกไว้ (ชื่อยา จำนวน หน่วย)
- ปุ่ม ยืนยัน แสดงจำนวนรายการที่เลือก เช่น "ยืนยัน (1)"

Actual Result
- -

หมายเหตุ
- ผลสำรวจ DEV-X 26 ต.ค. 2026 กับ Order Set "augmentin 14 วัน" (aug14D): ฝั่งขวาแสดง amoxicillin + clavulanic acid, CAVUMOX 875 mg + 125 mg (tablet) 28 TAB และปุ่ม "ยืนยัน (1)"
```

### [Required] TC-SBH-1085-004 - ตรวจสอบการกดยืนยัน Order Set แล้วรายการลงตะกร้าคำสั่งบน OPD Card

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-004
- Scenario ID: TS-SBH-1085-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. ผ่าน TC-SBH-1085-003 (เลือก Order Set แล้ว)

Test Data
- Order Set จาก TC-SBH-1085-001

Test Steps
1. กดปุ่ม ยืนยัน ใน popup Order Set

Expected Result
- popup ปิด และขึ้นข้อความ "เพิ่ม/แก้ไข Order สำเร็จ"
- รายการคำสั่งในชุดลงตะกร้าคำสั่งของ OPD Card ครบทุกรายการ

Actual Result
- -

หมายเหตุ
- ผลสำรวจ DEV-X 26 ต.ค. 2026 (aug14D, HN 6932107): ขึ้น "เพิ่ม/แก้ไข Order สำเร็จ" · ยาลงตะกร้า Medication · รวมค่าใช้จ่าย 231.00 ตรงกับราคาแพ็กเกจ
```

### [Required] TC-SBH-1085-005 - ตรวจสอบรายการจาก Order Set ยังอยู่ในตะกร้าคำสั่งหลังโหลดหน้าใหม่

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-005
- Scenario ID: TS-SBH-1085-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. ผ่าน TC-SBH-1085-004 (รายการลงตะกร้าแล้ว ยังไม่กดส่งคำสั่ง)

Test Data
- Order Set จาก TC-SBH-1085-001

Test Steps
1. โหลดหน้า OPD Card ใหม่
2. ดูตะกร้าคำสั่งส่วน Order

Expected Result
- รายการคำสั่งจาก Order Set ยังอยู่ในตะกร้าครบทุกรายการ

Actual Result
- -

หมายเหตุ
- ผลสำรวจ DEV-X 26 ต.ค. 2026 (aug14D, HN 6932107): โหลดหน้าใหม่แล้วยา CAVUMOX ยังอยู่ในตะกร้า
```

### [Required] TC-SBH-1085-006 - ตรวจสอบการสร้างแพ็กเกจที่เมนู แพ็คเกจ สำเร็จ

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-006
- Scenario ID: TS-SBH-1085-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. Login ด้วย user1 (Super_User)
2. มีสิทธิ์เมนู แพ็คเกจ

Test Data
- รหัส: SBH1085-PKG-<วันที่>
- ประเภทบริการ: OPD (ค่าตั้งต้น)
- Application: เว้นว่าง
- ชื่อภาษาไทย: ทดสอบ SBH-1085 เมนูแพ็คเกจ <วันที่>
- ชื่อภาษาอังกฤษ: Test SBH-1085 Package menu <วันที่>
- รายการยา: amoxicillin + clavulanic acid, CAVUMOX 875 mg + 125 mg (tablet)

Test Steps
1. เปิดเมนู แพ็คเกจ
2. กดปุ่ม สร้างแพ็กเกจ → เปิดหน้าต่าง สร้างแพ็กเกจ
3. กรอก รหัส · ชื่อภาษาไทย · ชื่อภาษาอังกฤษ และคง ประเภทบริการ = OPD
4. ที่ รายการในแพ็กเกจ พิมพ์ "CAVUMOX" ในช่อง ค้นหารหัสหรือชื่อสินค้า แล้วเลือก CAVUMOX 875 mg + 125 mg (tablet)
5. กดปุ่ม เพิ่มรายการ
6. กดปุ่ม บันทึก
7. พิมพ์รหัสในช่อง รหัส ด้านบนตาราง

Expected Result
- แพ็กเกจที่สร้างขึ้นในตาราง ประเภทบริการ OPD การใช้งานเปิดอยู่

Actual Result
- -

หมายเหตุ
- เมนู แพ็คเกจ = `/cortex/setting/admin/product-packages`
- สำรวจฟอร์มบน DEV-X 27 ต.ค. 2026 (กดยกเลิก ไม่บันทึก): ช่องบังคับ รหัส / ประเภทบริการ / ชื่อภาษาไทย / ชื่อภาษาอังกฤษ (ฟอร์มนี้ไม่แสดงเครื่องหมาย * บนหน้าจอ) · ประเภทบริการ มี ทั้งหมด / OPD / IPD · Application มี OR / ANESTHESIA
- กด เพิ่มรายการ แล้วยาขึ้นในตารางกลุ่ม "ยา (1)" ราคาต่อหน่วย 8.25 · ฟอร์มนี้ไม่มีช่องวิธีใช้ของยา และไม่มีช่องเลือก My / Public
- ข้อความหลังกด บันทึก ยังไม่เคยเห็น (ยังไม่ได้บันทึกจริง)
```

### [Required] TC-SBH-1085-007 - ตรวจสอบการค้นหาแพ็กเกจที่สร้างจากเมนู แพ็คเกจ ใน popup Order Set บน OPD Card

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-007
- Scenario ID: TS-SBH-1085-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. ผ่าน TC-SBH-1085-006 (มีแพ็กเกจที่สร้างจากเมนู แพ็คเกจ)
2. มีผู้ป่วยทดสอบที่มี Visit OPD เปิดอยู่

Test Data
- แพ็กเกจจาก TC-SBH-1085-006

Test Steps
1. เปิด OPD Card ของผู้ป่วย
2. ที่ส่วน Order กดปุ่ม Order Set
3. อยู่แท็บ My Order Set พิมพ์ชื่อหรือรหัสแพ็กเกจในช่อง ค้นหา Order Set

Expected Result
- แพ็กเกจที่สร้างขึ้นในรายการฝั่งซ้ายของ popup

Actual Result
- -

หมายเหตุ
- ผลสำรวจ DEV-X 26 ต.ค. 2026: แพ็กเกจ aug14D "augmentin 14 วัน" (จากหน้า แพ็คเกจ ตามภาพในการ์ด สร้างโดย user1) อยู่แท็บ My Order Set · ค้น "Aug14" · "aug14D" · "AUG14D" · "aug14" · "ug14" · "14 วัน" เจอทุกแบบ
- การ์ดไม่บอกว่าต้องขึ้นแท็บ My หรือ Public — ยึดตามระบบ (Requirement gap)
```

### [Required] TC-SBH-1085-008 - ตรวจสอบการกดยืนยันแพ็กเกจที่สร้างจากเมนู แพ็คเกจ แล้วรายการลงตะกร้าคำสั่งบน OPD Card

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-008
- Scenario ID: TS-SBH-1085-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. ผ่าน TC-SBH-1085-007 (popup Order Set เปิดอยู่และค้นเจอแพ็กเกจ)

Test Data
- แพ็กเกจจาก TC-SBH-1085-006

Test Steps
1. กดชื่อแพ็กเกจในรายการฝั่งซ้าย
2. กดปุ่ม ยืนยัน

Expected Result
- popup ปิด และขึ้นข้อความ "เพิ่ม/แก้ไข Order สำเร็จ"
- รายการคำสั่งในแพ็กเกจลงตะกร้าคำสั่งของ OPD Card ครบทุกรายการ

Actual Result
- -

หมายเหตุ
- ผลสำรวจ DEV-X 26 ต.ค. 2026 กับ aug14D: ผลเดียวกับ TC-SBH-1085-004 (หลักฐานใน comment ของ SBH-1085)
```

### [Required] TC-SBH-1085-009 - ตรวจสอบการกดสร้าง Order Set โดยไม่กรอกช่องบังคับที่เมนู ตั้งค่า Order Set

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-009
- Scenario ID: TS-SBH-1085-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. Login ด้วย user1 (Super_User)
2. มีสิทธิ์เมนู ตั้งค่า Order Set

Test Data
- ไม่กรอกข้อมูลใด

Test Steps
1. เปิดเมนู ตั้งค่า Order Set → แท็บ My Order Set
2. กดปุ่ม สร้าง My Order Set
3. ไม่กรอกช่องใด แล้วกดปุ่ม สร้าง

Expected Result
- ใต้ช่องบังคับขึ้นข้อความ "กรุณากรอกรหัส" · "กรุณากรอกชื่อภาษาไทย" · "กรุณากรอกชื่อภาษาอังกฤษ"
- หน้าต่าง สร้าง Order Set ยังเปิดอยู่ และไม่มี Order Set ใหม่ในตาราง

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 27 ต.ค. 2026: ได้ข้อความตามที่เขียนใน Expected Result · ระบบไม่ส่ง request ไป server · กดยกเลิกแล้วไม่มีอะไรถูกบันทึก
```

### [Required] TC-SBH-1085-010 - ตรวจสอบการกดบันทึกแพ็กเกจโดยไม่กรอกช่องบังคับที่เมนู แพ็คเกจ

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-010
- Scenario ID: TS-SBH-1085-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. Login ด้วย user1 (Super_User)
2. มีสิทธิ์เมนู แพ็คเกจ

Test Data
- ไม่กรอกข้อมูลใด (ประเภทบริการ คงค่าตั้งต้น OPD)

Test Steps
1. เปิดเมนู แพ็คเกจ
2. กดปุ่ม สร้างแพ็กเกจ
3. ไม่กรอกช่องใด แล้วกดปุ่ม บันทึก

Expected Result
- ใต้ช่อง รหัส · ชื่อภาษาไทย · ชื่อภาษาอังกฤษ ขึ้นข้อความ "จำเป็น" และกรอบช่องเป็นสีแดง
- หน้าต่าง สร้างแพ็กเกจ ยังเปิดอยู่ และไม่มีแพ็กเกจใหม่ในตาราง

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 27 ต.ค. 2026: ได้ผลตามที่เขียนใน Expected Result · ระบบไม่ส่ง request ไป server
- ข้อความเตือนต่างจากฟอร์ม สร้าง Order Set ("จำเป็น" กับ "กรุณากรอก...")
```

### [Required] TC-SBH-1085-011 - ตรวจสอบการบันทึกแพ็กเกจด้วยรหัสซ้ำกับแพ็กเกจที่มีอยู่ที่เมนู แพ็คเกจ

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-011
- Scenario ID: TS-SBH-1085-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. ผ่าน TC-SBH-1085-006 (มีแพ็กเกจรหัส SBH1085-PKG-<วันที่>)

Test Data
- รหัส: ใช้รหัสเดียวกับแพ็กเกจจาก TC-SBH-1085-006
- ชื่อภาษาไทย: ทดสอบ SBH-1085 รหัสซ้ำ <วันที่>
- ชื่อภาษาอังกฤษ: Test SBH-1085 duplicate code <วันที่>
- รายการยา: CAVUMOX 875 mg + 125 mg (tablet)

Test Steps
1. เปิดเมนู แพ็คเกจ แล้วกดปุ่ม สร้างแพ็กเกจ
2. กรอกรหัสซ้ำกับแพ็กเกจจาก TC-SBH-1085-006 และกรอกชื่อภาษาไทย / ภาษาอังกฤษ
3. ค้น CAVUMOX แล้วกดปุ่ม เพิ่มรายการ
4. กดปุ่ม บันทึก
5. ค้นรหัสในช่อง รหัส ด้านบนตาราง

Expected Result
- ระบบไม่ยอมให้บันทึก และแจ้งว่ารหัสซ้ำ
- ตารางมีแพ็กเกจรหัสนี้รายการเดียว (ของ TC-SBH-1085-006)

Actual Result
- -

หมายเหตุ
- ผลที่คาดมาจาก QA (27 ต.ค. 2026): รหัสไม่ควรซ้ำ — การ์ดไม่ได้ระบุไว้ และยังไม่เคยลองบันทึกจริง ข้อความแจ้งเตือนที่ระบบใช้จะคัดลอกลง Actual Result ตอนรัน
- ลองกับรหัสแพ็กเกจทดสอบของเราเอง ถ้าระบบยอมให้บันทึก แพ็กเกจที่ซ้ำเป็นของเราเอง ไม่กระทบข้อมูลคนอื่น
- ข้อมูลแพ็กเกจ 106 รายการบน dev-x (27 ต.ค. 2026) ไม่มีรหัสซ้ำเลย
```

### [Required] TC-SBH-1085-012 - ตรวจสอบการค้นหาชื่อที่ไม่มีอยู่ใน popup Order Set บน OPD Card

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-012
- Scenario ID: TS-SBH-1085-UHP
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. มีผู้ป่วยทดสอบที่มี Visit OPD เปิดอยู่

Test Data
- คำค้น: zzSBH1085ไม่มี

Test Steps
1. เปิด OPD Card ของผู้ป่วย แล้วกดปุ่ม Order Set
2. แท็บ My Order Set พิมพ์คำค้นในช่อง ค้นหา Order Set
3. เปลี่ยนเป็นแท็บ Public Order Set แล้วค้นคำเดิม

Expected Result
- รายการฝั่งซ้ายว่างทั้ง 2 แท็บ และฝั่งขวาแสดง "เลือก Order Set จากรายการทางซ้าย"

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 27 ต.ค. 2026: ได้ผลตามที่เขียน · ระบบไม่มีข้อความแจ้งว่า "ไม่พบข้อมูล"
```

### [Required] TC-SBH-1085-013 - ตรวจสอบการค้นหา Order Set ด้วยตัวพิมพ์เล็ก/ใหญ่ต่างจากรหัสใน popup Order Set

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-013
- Scenario ID: TS-SBH-1085-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. ผ่าน TC-SBH-1085-001 (มี Order Set รหัส SBH1085-OS-<วันที่>)
2. มีผู้ป่วยทดสอบที่มี Visit OPD เปิดอยู่

Test Data
- คำค้นตัวพิมพ์เล็ก: sbh1085-os
- คำค้นตัวพิมพ์ผสม: Sbh1085-Os

Test Steps
1. เปิด OPD Card ของผู้ป่วย แล้วกดปุ่ม Order Set
2. แท็บ My Order Set พิมพ์ "sbh1085-os"
3. ล้างช่อง แล้วพิมพ์ "Sbh1085-Os"

Expected Result
- Order Set จาก TC-SBH-1085-001 ขึ้นในรายการฝั่งซ้ายทั้ง 2 คำค้น

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 26 ต.ค. 2026 กับรหัส aug14D: ค้น "Aug14" · "AUG14D" · "aug14" เจอทุกแบบ
```

### [Required] TC-SBH-1085-014 - ตรวจสอบการค้นหา Order Set ด้วยบางส่วนของชื่อใน popup Order Set

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-014
- Scenario ID: TS-SBH-1085-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. ผ่าน TC-SBH-1085-001 (มี Order Set ชื่อ ทดสอบ SBH-1085 เมนู Order Set <วันที่>)
2. มีผู้ป่วยทดสอบที่มี Visit OPD เปิดอยู่

Test Data
- คำค้นกลางชื่อภาษาไทย: เมนู Order Set

Test Steps
1. เปิด OPD Card ของผู้ป่วย แล้วกดปุ่ม Order Set
2. แท็บ My Order Set พิมพ์ "เมนู Order Set"

Expected Result
- Order Set จาก TC-SBH-1085-001 ขึ้นในรายการฝั่งซ้าย

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 26 ต.ค. 2026: ค้น "ug14" และ "14 วัน" เจอ "augmentin 14 วัน"
```

### [Required] TC-SBH-1085-015 - ตรวจสอบแพ็กเกจที่ปิดการใช้งานไม่แสดงใน popup Order Set บน OPD Card

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-015
- Scenario ID: TS-SBH-1085-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. ผ่าน TC-SBH-1085-008 (แพ็กเกจจาก TC-SBH-1085-006 ใช้งานบน OPD Card ได้แล้ว)
2. มีผู้ป่วยทดสอบที่มี Visit OPD เปิดอยู่

Test Data
- แพ็กเกจจาก TC-SBH-1085-006

Test Steps
1. เปิดเมนู แพ็คเกจ ค้นรหัสแพ็กเกจ แล้วปิดสวิตช์ การใช้งาน
2. เปิด OPD Card ของผู้ป่วย แล้วกดปุ่ม Order Set
3. ค้นรหัสแพ็กเกจในแท็บ My Order Set และแท็บ Public Order Set

Expected Result
- แพ็กเกจที่ปิดการใช้งานไม่ขึ้นในรายการฝั่งซ้ายทั้ง 2 แท็บ

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 27 ต.ค. 2026: แพ็กเกจ OPD ของ user1 ที่ปิดการใช้งานอยู่แล้ว (1234567890 · art-for-test-order-set-1) ไม่ขึ้นทั้ง 2 แท็บ
- ใช้แพ็กเกจทดสอบของเราเอง ไม่แก้แพ็กเกจของคนอื่น
```

### [Required] TC-SBH-1085-016 - ตรวจสอบแพ็กเกจประเภทบริการ IPD ไม่แสดงใน popup Order Set บน OPD Card

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1085-016
- Scenario ID: TS-SBH-1085-EDG
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: SBH-1085 - [BUG][Order Set] Can't load order set

Preconditions
1. มีแพ็กเกจประเภทบริการ IPD ที่เปิดการใช้งานอยู่
2. มีผู้ป่วยทดสอบที่มี Visit OPD เปิดอยู่

Test Data
- แพ็กเกจ IPD ที่มีอยู่แล้ว: TEST-123456 "เทสipdออเดอร์เซ็ต" (เปิดการใช้งาน)

Test Steps
1. เปิด OPD Card ของผู้ป่วย แล้วกดปุ่ม Order Set
2. ค้น "TEST-123456" ในแท็บ My Order Set และแท็บ Public Order Set

Expected Result
- แพ็กเกจ IPD ไม่ขึ้นในรายการฝั่งซ้ายทั้ง 2 แท็บ

Actual Result
- -

หมายเหตุ
- สำรวจ DEV-X 27 ต.ค. 2026: TEST-123456 ไม่ขึ้นทั้ง 2 แท็บ · popup ค้นเฉพาะแพ็กเกจประเภท ทั้งหมด / OPD (รายละเอียดสำหรับ dev: SearchProductPackages filter visitClasses [ALL, OPD])
- dev-x มีแพ็กเกจ IPD 6 รายการ — ใช้ของที่มีอยู่ อ่านอย่างเดียว ไม่ต้องสร้างใหม่
```
