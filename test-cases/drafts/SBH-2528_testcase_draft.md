# Draft Test Structure — SBH-2528

> สถานะ: **สร้างใน Linear แล้ว (2026-10-27)** · **ทดสอบ Dev-X 2026-10-28 ผ่านครบ 6 TC → Done on dev-x** (สเปก `tests/modules/er/SBH-2528-disposition-history-ordinal-signer.spec.ts`) · Expected ของ TC-004 / 005 ใน Linear แก้แล้ว (รายการลงนามไม่มีแถว ผู้บันทึก / เวลาบันทึก) — ร่างด้านล่างเป็นถ้อยคำเดิม
> - EXE SBH-3031 (EXE - RT - 2.9.0) → HPY SBH-3034 → TC 001–006 = SBH-3036 · 3039 · 3041 · 3044 · 3047 · 3050 (สถานะ Not Run · 001–005 High · 006 Medium)
> - label ใหม่ที่สร้าง: QA Sub-module / Feature : Disposition (workspace)
> - ⚠️ ช่อง "สร้างโดย" เป็น Neranchara Kaewsiri (บัญชีของ Linear MCP · ผู้ใช้ยืนยันให้สร้างต่อ) · ผู้รับผิดชอบเป็น Suchat
> - ยืนยันแล้ว (27 ต.ค.): Run Type RT · Env Dev-X / SBH Prod (ตามการ์ด) · QA Module : ER · QA Sub-module / Feature : Disposition (label ใหม่ ต้องสร้าง) · TC เสริมเอาเฉพาะ 006 (ตัด 007 เคสเสียชีวิต)
> - รอผู้ใช้ review ร่างเต็ม แล้วพิมพ์ "สร้างได้" จึงจะสร้าง EXE 1 + Scenario 1 + TC 6 = 8 ใบ (+ label ใหม่ 1)
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972

Requirement: SBH-2528 — [Bug][ER][Disposiontion] - ดูประวัติ Disposition
URL: https://linear.app/cortexcloud/issue/SBH-2528
Project: [SBH] ER · Team: SBH Project · Milestone: ER – 4th -- Other documentation · Priority: High · State: Ready for Testing
Labels: 🐞 BUG, VERSION 2.9.0, Natthaphat ( MOD ) 🙈 · Assignee: jetsadaporn (Dew) · ไม่ผูก Cycle
Related: SBH-2462 (ฟีเจอร์ประวัติ Disposition · ชุด TC เดิม SBH-2486)
Sub-Issue: ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี
PR ที่แนบ: cortex-ui #2341 "[V2.9.0][BUG][SBH-2528] show sequential disposition history ordinal and clarify signer labels"
Scope / Version = 2.9.0 (label VERSION 2.9.0 ของการ์ด)

การ์ดเป็นบั๊ก ไม่มี AC — ใช้ Expected Result 2 ข้อของการ์ด

| ข้อในการ์ด | Expected Result ในการ์ด | TC |
|---|---|---|
| 1 | ระบบต้องเรียงลำดับหมายเลขฉบับได้ถูกต้อง | 001 · 002 · 003 |
| 2 | ระบบต้องแสดงชื่อผู้ลงนาม และวันที่ลงนามได้ถูกต้อง | 004 · 005 · 006 |

ข้อมูลประกอบ (ไม่ได้อยู่ในการ์ด — มาจากที่เคยตรวจ API บน dev-x 12 ต.ค. และไฟล์ข้อความ `/cortex/locale/th/er.json` บน dev-x วันนี้)
- สาเหตุเลขข้าม: `ฉบับที่` เดิมใช้ `snapshot.version` · กด ลงนาม = บันทึกร่างอัตโนมัติ + ลงนาม แล้วประวัติรวมเป็นรายการเดียว → เลขถูกข้าม 1 ตัวทุกครั้งที่ลงนาม
- สาเหตุผู้ลงนามไม่แสดง: แถว `ผู้ลงนาม` / `วันที่` เดิมเป็นของ **การยืนยันการเสียชีวิต** เคสไม่เสียชีวิตจึงว่างเสมอ
- dev-x มีข้อความใหม่แล้ว: `ผู้ลงนาม` · `วันที่ลงนาม` (ของการลงนาม Disposition) และ `ผู้ลงนามยืนยันการเสียชีวิต` · `วันที่ยืนยันการเสียชีวิต` (ยังไม่ได้เปิดดูบนหน้าจอจริง)
- รายการ บันทึกฉบับร่าง กับ ลงนาม ของผู้ใช้เดียวกันที่ห่างกันไม่เกิน 30 วินาที ถูกรวมเป็นรายการเดียว (กติกาจาก SBH-2486) → Test Step ให้เว้นเกิน 30 วินาที

---

## EXE - RT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER – 4th -- Other documentation
Labels: 🐞 BUG, VERSION 2.9.0, Natthaphat ( MOD ) 🙈, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Disposition (ใหม่ — รอยืนยัน), QA Run : Retest

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: RT
- Scope / Version: 2.9.0
- Module: ER / Disposition
- Requirement ที่อ้างอิง: SBH-2528 — [Bug][ER][Disposiontion] - ดูประวัติ Disposition
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- เลข "ฉบับที่" ในหน้าต่างฟอร์ม Disposition ย้อนหลัง เรียงต่อเนื่องไม่ข้ามเลข (บันทึกร่างก่อนลงนาม · ลงนามทันที · เปิดแก้ไขแล้วลงนามซ้ำ)
- แถว "ผู้ลงนาม" และ "วันที่ลงนาม" ของรายการลงนาม แสดงค่าจริง

หมายเหตุ
- สร้างจาก Expected Result ในการ์ดบั๊กโดยตรง (การ์ดไม่มี Acceptance Criteria)
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2528-HPY - แสดงเลขฉบับ ผู้ลงนาม และวันที่ลงนาม ในประวัติ Disposition ได้ถูกต้อง

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Disposition + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2528-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Disposition
- Requirement ที่อ้างอิง: SBH-2528 — [Bug][ER][Disposiontion] - ดูประวัติ Disposition

วัตถุประสงค์
- ยืนยันว่าหน้าต่างฟอร์ม Disposition ย้อนหลัง แสดงเลขฉบับเรียงต่อเนื่อง และแสดงผู้ลงนาม / วันที่ลงนามของรายการลงนาม

ขอบเขต Requirement
- ข้อ 1 ของการ์ด: หมายเลขฉบับต้องเรียงลำดับถูกต้อง ไม่ข้ามเลข
- ข้อ 2 ของการ์ด: แสดงชื่อผู้ลงนาม และวันที่ลงนามได้ถูกต้อง

ความเสี่ยง
- เลขฉบับข้ามทำให้ผู้ตรวจสอบเข้าใจว่ามีฉบับที่หายไปจากประวัติ
- ย้อนดูไม่ได้ว่าใครลงนามจำหน่าย และลงนามเมื่อไร ซึ่งใช้ตรวจสอบย้อนหลังทางการแพทย์

หมายเหตุ
- อิงตาม Expected Result ของการ์ด (การ์ดบั๊ก ไม่มี AC)
- ข้อมูลตั้งต้น: บัญชี user1 (ตามการ์ด) · ผู้ป่วยทดสอบใหม่ เปิด Visit ER + คัดกรองแล้ว ยังไม่เริ่ม Disposition · TC 001 · 002 · 004 · 005 ใช้ผู้ป่วยรายเดียวต่อเนื่องกันได้ · TC 003 ใช้ผู้ป่วยอีกราย
```

### TC-SBH-2528-001 - ตรวจสอบเลขฉบับที่ในประวัติ Disposition เรียงต่อเนื่องเมื่อบันทึกฉบับร่างก่อนลงนาม

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Disposition + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2528-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ด้วยบัญชี user1 > เปิด Visit ER ให้ผู้ป่วยรายใหม่ > บันทึกคัดกรอง
2. เปิดแท็บ Disposition > กด เริ่มบันทึก
3. กรอกช่องบังคับ (สถานะการจำหน่าย · วิธีการจำหน่าย · การวินิจฉัย · แพทย์ผู้สั่งจำหน่าย · ข้อมูลทางคลินิกฯ · การตรวจเพิ่มเติมฯ) > กด บันทึกฉบับร่าง
4. รอเกิน 30 วินาที > กด ลงนาม
5. กดปุ่ม ดูประวัติ Disposition > กด ดูฟอร์ม ของทีละรายการ (เริ่มบันทึก · บันทึกฉบับร่าง · ลงนาม) > อ่านแถว "ฉบับที่"

## Expected Result
แถว "ฉบับที่" เรียงต่อเนื่องจากรายการเก่าไปใหม่: เริ่มบันทึก = 1 · บันทึกฉบับร่าง = 2 · ลงนาม = 3
ไม่ข้ามเลข และไม่ซ้ำกัน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2528-002 - ตรวจสอบเลขฉบับที่ต่อเนื่องหลังเปิดแก้ไขและลงนามซ้ำ

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2528-002
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วยจาก `TC-SBH-2528-001` (ลงนามแล้ว · บัญชี user1)
2. กด เปิดแก้ไข > แก้ช่อง ข้อมูลทางคลินิกและการดำเนินโรค > กด บันทึกฉบับร่าง
3. รอเกิน 30 วินาที > กด ลงนาม
4. กดปุ่ม ดูประวัติ Disposition > กด ดูฟอร์ม ของรายการที่เกิดในขั้น 2–3 (เปิดแก้ไข · บันทึกฉบับร่าง · ลงนาม) > อ่านแถว "ฉบับที่"

## Expected Result
แถว "ฉบับที่" ต่อจากฉบับล่าสุดของ `TC-SBH-2528-001` (3) โดยไม่ข้ามเลข: เปิดแก้ไข = 4 · บันทึกฉบับร่าง = 5 · ลงนาม = 6

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2528-003 - ตรวจสอบเลขฉบับที่ไม่ข้ามเมื่อกดลงนามโดยไม่บันทึกฉบับร่างก่อน

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2528-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ด้วยบัญชี user1 > เปิด Visit ER ให้ผู้ป่วยรายใหม่อีกราย > บันทึกคัดกรอง
2. เปิดแท็บ Disposition > กด เริ่มบันทึก
3. กรอกช่องบังคับ > กด ลงนาม ทันที (ไม่กด บันทึกฉบับร่าง)
4. กดปุ่ม ดูประวัติ Disposition > กด ดูฟอร์ม ของรายการ เริ่มบันทึก และ ลงนาม > อ่านแถว "ฉบับที่"

## Expected Result
ประวัติมี 2 รายการ: เริ่มบันทึก = 1 · ลงนาม = 2
ไม่ข้ามไปเป็น 3 (ระบบบันทึกร่างอัตโนมัติก่อนลงนาม แต่เลขที่แสดงต้องต่อเนื่องตามรายการที่เห็น)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2528-004 - ตรวจสอบฟอร์มย้อนหลังของรายการลงนามแสดงชื่อผู้ลงนาม

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2528-004
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วยจาก `TC-SBH-2528-001` (ลงนามด้วยบัญชี user1)
2. กดปุ่ม ดูประวัติ Disposition > กด ดูฟอร์ม ของรายการ ลงนาม
3. เลื่อนลงท้ายหน้าต่าง ฟอร์ม Disposition ย้อนหลัง (อ่านอย่างเดียว) > อ่านแถว "ผู้ลงนาม"

## Expected Result
แถว "ผู้ลงนาม" แสดงชื่อผู้ใช้ที่กดลงนาม (user1) ชื่อเดียวกับแถว "ผู้บันทึก" ของรายการลงนามนี้
ไม่แสดง "ไม่ได้บันทึก"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2528-005 - ตรวจสอบฟอร์มย้อนหลังของรายการลงนามแสดงวันที่ลงนาม

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2528-005
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วยจาก `TC-SBH-2528-001` · จดวันเวลาที่กด ลงนาม ไว้
2. กดปุ่ม ดูประวัติ Disposition > กด ดูฟอร์ม ของรายการ ลงนาม
3. เลื่อนลงท้ายหน้าต่าง > อ่านแถว "วันที่ลงนาม"

## Expected Result
แถว "วันที่ลงนาม" แสดงวันเวลาที่กดลงนาม รูปแบบ DD/MM/พ.ศ., HH:mm ตรงกับแถว "เวลาบันทึก" ของรายการลงนามนี้
ไม่แสดง "-"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2528-006 - ตรวจสอบผู้ลงนามเป็นผู้ที่กดลงนามเมื่อต่างจากผู้บันทึกฉบับร่าง

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001
(เพิ่มจากความเสี่ยง: ถ้าแสดงชื่อผู้บันทึกร่างแทนผู้ลงนาม TC-004 จับไม่ได้ เพราะใช้บัญชีเดียวกันทั้งคู่ · ใช้ 2 บัญชี Super_User → Doctor)

```
TC ID: TC-SBH-2528-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login บัญชี A (Super_User) > เปิด Visit ER ผู้ป่วยรายใหม่ > คัดกรอง > Disposition > เริ่มบันทึก > กรอกช่องบังคับ > บันทึกฉบับร่าง > Logout
2. Login บัญชี B (Doctor) > เปิดผู้ป่วยรายเดียวกัน > Disposition > กด ลงนาม
3. กดปุ่ม ดูประวัติ Disposition > กด ดูฟอร์ม ของรายการ ลงนาม > อ่านแถว "ผู้ลงนาม"

## Expected Result
แถว "ผู้ลงนาม" แสดงชื่อของบัญชี B (ผู้กดลงนาม) ไม่ใช่ชื่อบัญชี A (ผู้บันทึกฉบับร่าง)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## ตัดออก (ผู้ใช้เลือก 27 ต.ค.)

- เคสเสียชีวิต: แถว "ผู้ลงนามยืนยันการเสียชีวิต" / "วันที่ยืนยันการเสียชีวิต" แยกจากผู้ลงนาม Disposition (มาจาก PR ไม่อยู่ในการ์ด)

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - เลข "ฉบับที่" ควรนับทุกรายการในประวัติ (รวม เริ่มบันทึก / เปิดแก้ไข) หรือนับเฉพาะฉบับที่บันทึกเนื้อหา — การ์ดไม่บอก · ร่างนี้ยึดตามภาพในการ์ดที่ เริ่มบันทึก = 1 และ เปิดแก้ไข มีเลขฉบับ
  - รายการที่ยังไม่ลงนาม (เริ่มบันทึก / บันทึกฉบับร่าง / เปิดแก้ไข) ควรแสดงแถว ผู้ลงนาม / วันที่ลงนาม ไหม ถ้าแสดงต้องเป็นค่าอะไร ("ไม่ได้บันทึก" / "-" / ซ่อนแถว)
  - หลังเปิดแก้ไขแล้วลงนามใหม่ ฟอร์มย้อนหลังของการลงนามครั้งแรกต้องคงผู้ลงนาม / วันที่ของครั้งแรกไว้หรือไม่
- **Permission / role**: การ์ดระบุแค่ User1 — ไม่ได้บอกว่า Nurse (ไม่มีสิทธิ์ sign) เห็นแถวนี้แบบไหน
- **Edge cases**: บันทึกฉบับร่างแล้วลงนามภายใน 30 วินาที (รายการถูกรวม) เลขฉบับต้องเป็นเท่าไร — ไม่อยู่ในการ์ด
