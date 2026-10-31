# Draft Test Structure — SBH-2593

> สถานะ: **สร้างใน Linear แล้ว (2026-10-29)** — ผู้ใช้ review ตาราง แล้วพิมพ์ "สร้างได้"
> - EXE SBH-3203 (EXE - CT - 2.9.0) → HPY SBH-3204 → TC 001–025 = SBH-3207–3231 · UHP SBH-3205 → TC 026–027 = SBH-3232–3233 · EDG SBH-3206 → TC 028–035 = SBH-3234–3241 (TC สถานะ Not Run ทั้งหมด)
> - ⚠️ ช่อง "สร้างโดย" เป็น Neranchara Kaewsiri (บัญชีของ Linear MCP · แจ้งผู้ใช้แล้วก่อนสร้าง) · ผู้รับผิดชอบเป็น Suchat
> - ผู้ใช้สั่งให้ scope เฉพาะ AC (29 ต.ค.) — ตัด TC ที่มาจากหัวข้อ "การตัดสินใจ" ออก 3 ข้อ (เปิดแท็บใหม่แล้วกลับมาพับ · แถบรับไว้รักษาในมุมมองแสดงแบบฟิลเตอร์ · ให้ยาแล้วก่อนห้องยาออกใบยา) และตัด Expected ที่เกิน AC ออกจาก 004 / 007 / 024 / 025 (เลขปัจจุบัน) · TC ที่ตามมาเลื่อนเลข
> - ผู้ใช้สั่งตัด TC ส่วน Security ออก (29 ต.ค.) — ร่างชุดแรกเป็น 029 / 030 เรื่องสิทธิ์ `nurse-task:edit` / `opd-order:create` · TC ที่ตามมาเลื่อนเลขขึ้น 2
> - ยืนยันแล้ว (29 ต.ค.): QA Sub-module / Feature : Order Summary — สร้าง label ใหม่ในกลุ่ม QA Sub-module / Feature แล้วตามที่ผู้ใช้สั่ง
> - ใช้ค่าตามชุดก่อนหน้า (ผู้ใช้ยังไม่ได้ทักท้วง): Run Type CT · Env Dev-X / SBH Prod
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972

Requirement: SBH-2593 — [ER] [ Order Summary ] Improve order summary ER
URL: https://linear.app/cortexcloud/issue/SBH-2593/er-order-summary-improve-order-summary-er
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: Ready for Testing
Labels: VERSION 2.9.0 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ · สร้างโดย Natthaphat(MOD)
Sub-Issue: ยังไม่มี EXE / TC · คอมเมนต์: ไม่มี
Relations: blocks SBH-2689, SBH-2669 · related SBH-2441, SBH-2079, SBH-3182, NUH-3185
PR ที่แนบ: cortex-ui #2382 "improve er order summary" · cortex-api #2758 "sign selected opd orders by request ids"
Scope / Version = 2.9.0 (label VERSION 2.9.0 ของการ์ด)

## AC → TC

| กลุ่ม | AC | TC |
|---|---|---|
| ER OPD | คอลัมน์ Note ซ้าย แพทย์บน / พยาบาลล่าง ไม่มี dropdown · ปุ่มเพิ่มของตัวเอง · พับ/ขยายได้ | 001 · 002 · 003 · 004 |
| ER OPD | Progress Note ตอนยังไม่มี AN เก็บกับ VN และยังเห็นหลัง admit | 005 |
| ER OPD | ปุ่มในแถวยาเปลี่ยนตามสถานะงานพยาบาล ไม่มีคอลัมน์สถานะงานพยาบาล / ห้องยา | 007 · 012 |
| ER OPD | ยอดรวม ORDER FOR ONE DAY แถวเดียว (รวม / เครดิต / ต้องชำระ) | 006 |
| ER OPD | ปุ่มแถว รับ Order / ให้ยาแล้ว / ยกเลิก Order · เลือกหลายแถว · รับ Order ทั้งหมด | 012 · 013 · 014 · 017 · 018 |
| ER OPD | "ให้ยาแล้ว" ถามผู้ให้ยาและเวลา · "ยกเลิก Order" ใส่เหตุผลได้ (ไม่บังคับ) | 013 · 014 · 015 |
| ER OPD | dialog ยกเลิก Order บอกว่าคำสั่งยา ใบยา ค่าใช้จ่ายยังอยู่ | 016 |
| ER OPD | ปุ่มพยาบาลไม่แตะค่าใช้จ่าย / สต็อก / ใบยา / EMAR | 028 · 029 · 030 |
| ER OPD | ทำจาก Order Summary แล้ว Nurse Task List เปลี่ยนตาม และกลับกัน | 019 · 020 |
| ER OPD | Sign ในแถว · เลือกหลายรายการแล้ว Sign · Sign All | 008 · 009 · 010 |
| ER OPD | Sign ทีละรายการลงนามเฉพาะรายการนั้น · ผ่านเงื่อนไขเดียวกับ OPD Order Form · เข้าคิวห้องยา | 008 · 011 · 027 |
| ER OPD | ยาที่ยังไม่ลงนามทำงานพยาบาลไม่ได้ | 026 |
| ER OPD | ปุ่มงานพยาบาลเฉพาะ `nurse-task:edit` · ปุ่ม Sign เฉพาะ `opd-order:create` | ไม่มี TC — ตัดออกตามที่ผู้ใช้สั่ง (ส่วน Security) |
| ER IPD | Note แพทย์ / พยาบาลแบบเดียวกับ ER OPD | 021 |
| ER IPD | ORDER FOR ONE DAY (ก่อน admit) เปิดมาแบบพับ + จำนวนรายการ + ราคา · คลิกหัวขยาย/พับ | 022 · 023 |
| ER IPD | ขยายแล้วหมวดที่ไม่มีคำสั่งไม่แสดง | 024 |
| ER IPD | ไม่มีคำสั่งก่อน admit → section ไม่แสดง | 031 |
| ER IPD | แถบ รับไว้รักษา / วันที่รับเข้าเตียง / วันที่สร้าง AN / PDx | 025 |
| ไม่กระทบที่อื่น | Admission Summary หอผู้ป่วยเหมือนเดิม (dropdown · แท็บไม่มีแถบรับไว้รักษา) | 032 · 033 |
| ไม่กระทบที่อื่น | Order Summary / Order Form OPD เหมือนเดิม (ICD9-CM · ไม่มีปุ่มงานพยาบาล) | 034 · 035 |

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **ผู้ป่วย A (ER OPD ยังไม่มี AN)**: เปิด Visit ER → คัดกรอง → ER Physician Note (เลือก Diagnosis) → One Day Order ยาอย่างน้อย 4 รายการ (ยังไม่ Sign)
- **ผู้ป่วย B (ER IPD มี AN รอเตียง)**: มีคำสั่งก่อน admit (ยา + หัตถการ ไม่มี ICD9-CM) → สร้าง Admit Order ได้ AN
- **ผู้ป่วย C (ER IPD มี AN)**: ไม่มีคำสั่งก่อน admit เลย
- **ผู้ป่วย D (หอผู้ป่วย)** และ **ผู้ป่วย E (OPD ที่มีหัตถการ ICD9-CM)** สำหรับตรวจว่าไม่กระทบที่อื่น
- user: แพทย์ ER · พยาบาล ER · เภสัช (ออกใบยา) · แพทย์ OPD · พยาบาล OPD · พยาบาลหอผู้ป่วย

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: VERSION 2.9.0, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Order Summary, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: ER / Order Summary
- Requirement ที่อ้างอิง: SBH-2593 — [ER] [ Order Summary ] Improve order summary ER
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- คอลัมน์ Note แพทย์ / พยาบาลแบบพับได้ ทั้ง ER OPD และ ER IPD
- Progress Note ก่อนมี AN เก็บกับ VN และยังเห็นหลัง admit
- ยอดรวมค่าใช้จ่าย ORDER FOR ONE DAY แถวเดียว
- แพทย์ Sign ทีละรายการ / เลือกหลายรายการ / Sign All และเข้าคิวห้องยา
- งานยาของพยาบาล (รับ Order / ให้ยาแล้ว / ยกเลิก Order) ทั้งรายแถว หลายแถว และรับทั้งหมด
- สถานะงานยาตรงกับ ER Nurse Task List ทั้งสองทาง
- ปุ่มพยาบาลไม่กระทบใบยาและค่าใช้จ่าย
- ยาที่ยังไม่ลงนามทำงานพยาบาลไม่ได้ และ Sign ต้องยืนยันยาซ้ำเหมือน OPD Order Form
- ORDER FOR ONE DAY (ก่อน admit) แบบพับ + ซ่อนหมวดว่าง + แถบข้อมูลรับไว้รักษา
- Admission Summary หอผู้ป่วย และ Order Summary / Order Form OPD ไม่เปลี่ยน

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2593-HPY - ใช้งาน Order Summary ของ ER ทั้ง Note งานยาพยาบาล การลงนาม และส่วนก่อน admit

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Order Summary + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2593-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / Order Summary
- Requirement ที่อ้างอิง: SBH-2593 — [ER] [ Order Summary ] Improve order summary ER

วัตถุประสงค์
- ยืนยันว่าแพทย์และพยาบาลเห็นและเพิ่ม Note ได้ในจุดเดียว ลงนามยาได้ทีละรายการ และทำงานยาของพยาบาลจาก Order Summary ได้โดยสถานะตรงกับ ER Nurse Task List
- ยืนยันว่า ER IPD เห็นส่วนก่อน admit แบบพับพร้อมยอดรวม และมีแถบข้อมูลรับไว้รักษา

ขอบเขต Requirement
- AC ER OPD: Note · Progress Note กับ VN · ยอดรวม · ปุ่มงานยา · ให้ยาแล้ว / ยกเลิก Order · Nurse Task List ตรงกัน · Sign
- AC ER IPD: Note · ORDER FOR ONE DAY (ก่อน admit) แบบพับ · ซ่อนหมวดว่าง · แถบรับไว้รักษา

ความเสี่ยง
- Sign ทีละรายการแล้วลงนามทั้ง EN (ส่งยาที่แพทย์ยังไม่ตั้งใจสั่งเข้าห้องยา)
- สถานะงานยาใน Order Summary กับ Nurse Task List ไม่ตรงกัน → ให้ยาซ้ำหรือตกหล่น
- Progress Note ที่เขียนก่อน admit หายหลังได้ AN

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- 001–020 ใช้ผู้ป่วย A · 021–025 ใช้ผู้ป่วย B
```

### TC-SBH-2593-001 - แสดงคอลัมน์ Note ด้านซ้าย แพทย์อยู่บน พยาบาลอยู่ล่าง โดยไม่มี dropdown

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Order Summary + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-2593-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER
2. เปิดผู้ป่วย A (ER ยังไม่มี AN) > เมนูขวา Order Summary
3. ดูคอลัมน์ด้านซ้ายของแท็บ

## Expected Result
คอลัมน์ Note อยู่ด้านซ้าย ส่วนบนเป็น Note แพทย์ (Progress Note) ส่วนล่างเป็น Note พยาบาล (Nurse Focus Note)
ไม่มี dropdown เลือกแพทย์ / พยาบาล
แต่ละส่วนมีปุ่มเพิ่มของตัวเอง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-002 - บันทึก Progress Note จากปุ่มเพิ่มของส่วน Note แพทย์

Status: Not Run · Priority: High · Labels: เหมือน TC-001 แต่ QA Type : Functional

```
TC ID: TC-SBH-2593-002
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่มเพิ่มในส่วน Note แพทย์
3. พิมพ์ข้อความ Progress Note แล้วกดบันทึก

## Expected Result
Progress Note ที่บันทึกแสดงในส่วน Note แพทย์ พร้อมผู้บันทึกและเวลา
ไม่แสดงในส่วน Note พยาบาล

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-003 - บันทึก Nurse Focus Note จากปุ่มเพิ่มของส่วน Note พยาบาล

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่มเพิ่มในส่วน Note พยาบาล
3. กรอก Nurse Focus Note แล้วกดบันทึก

## Expected Result
Nurse Focus Note ที่บันทึกแสดงในส่วน Note พยาบาล พร้อมผู้บันทึกและเวลา
ไม่แสดงในส่วน Note แพทย์

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-004 - ทดสอบพับและขยายส่วน Note แพทย์

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2593-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. ใช้ผู้ป่วย A ที่มี Progress Note จาก TC-002 > Order Summary
2. กดพับส่วน Note แพทย์
3. กดขยายส่วน Note แพทย์อีกครั้ง

## Expected Result
กดพับแล้วส่วน Note แพทย์พับลง ไม่แสดงรายการ Note
กดขยายแล้วส่วน Note แพทย์กลับมาแสดงรายการ Note ครบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-005 - ตรวจสอบ Progress Note ที่บันทึกก่อนมี AN ยังแสดงใน Order Summary ของ ER หลัง admit

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-005
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่มี Progress Note จาก TC-002 (บันทึกตอนยังไม่มี AN)
2. Login ระบบด้วย user แพทย์ ER > สร้าง Admit Order ให้ผู้ป่วย A จนได้ AN
3. เปิดผู้ป่วย A ใน ER > Order Summary
4. ดูส่วน Note แพทย์

## Expected Result
Progress Note ที่บันทึกก่อนมี AN ยังแสดงในส่วน Note แพทย์ ข้อความ ผู้บันทึก และเวลาตรงกับที่บันทึกไว้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-006 - แสดงยอดรวมค่าใช้จ่ายของ ORDER FOR ONE DAY เป็นแถวเดียว

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2593-006
Case Type: Happy
Test Type: UIUX

## Test Step
1. ใช้ผู้ป่วย A ที่มีคำสั่งหลายประเภท (ยา + Lab หรือหัตถการ) ใน One Day Order
2. เปิด Order Summary > ดูท้าย ORDER FOR ONE DAY

## Expected Result
แสดงยอดรวมแถวเดียว ได้แก่ รวม / เครดิต / ต้องชำระ ไม่แยกยอดตามประเภทคำสั่ง
ยอดรวมเท่ากับผลรวมของทุกรายการในตาราง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-007 - ตรวจสอบตารางยาไม่มีคอลัมน์สถานะงานพยาบาลและสถานะห้องยา

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2593-007
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. ดูหัวคอลัมน์และปุ่มในตารางยา

## Expected Result
ไม่มีคอลัมน์สถานะงานพยาบาล และไม่มีคอลัมน์สถานะห้องยาแยก
ปุ่มในแถวยาแสดงตามสถานะงานพยาบาลแทน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-008 - ทดสอบ Sign ยาทีละรายการ ลงนามเฉพาะรายการนั้น

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-008
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่มียาค้างลงนามอย่างน้อย 3 รายการ
2. Login ระบบด้วย user แพทย์ ER > Order Summary
3. กดปุ่ม Sign ในแถวยารายการที่ 1
4. ดูสถานะลงนามของยาทุกรายการ

## Expected Result
ยารายการที่ 1 ลงนามแล้ว (Medication authorised)
ยารายการอื่นยังค้างลงนามและยังมีปุ่ม Sign ในแถว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-009 - ทดสอบเลือกยาหลายรายการแล้ว Sign จากแถบสั่ง

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-009
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่มียาค้างลงนามอย่างน้อย 3 รายการ
2. Login ระบบด้วย user แพทย์ ER > Order Summary
3. ติ๊ก checkbox ยา 2 รายการ > กด Sign จากแถบสั่ง
4. ดูสถานะลงนามของยาทุกรายการ

## Expected Result
ยา 2 รายการที่เลือกลงนามแล้ว
ยารายการที่ไม่ได้เลือกยังค้างลงนาม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-010 - ทดสอบ Sign All ที่หัวหมวดยา ลงนามทุกรายการที่ค้าง

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-010
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่มียาค้างลงนามอย่างน้อย 2 รายการ
2. Login ระบบด้วย user แพทย์ ER > Order Summary
3. กด Sign All ที่หัวหมวดยา

## Expected Result
ยาทุกรายการที่ค้างลงนามเปลี่ยนเป็นลงนามแล้ว ไม่มีปุ่ม Sign เหลือในหมวดยา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-011 - ตรวจสอบยาที่ Sign จาก Order Summary เข้าคิวห้องยา

Status: Not Run · Priority: High · Labels: เหมือน TC-002 แต่ QA Type : Integration

```
TC ID: TC-SBH-2593-011
Case Type: Happy
Test Type: Integration

## Test Step
1. ใช้ยาที่ลงนามแล้วจาก TC-008 (ลงนาม 1 รายการ)
2. Login ระบบด้วย user เภสัช > เปิดคิวห้องยาของผู้ป่วย A

## Expected Result
ยารายการที่ลงนามแล้วอยู่ในคิวห้องยา
ยารายการที่ยังไม่ลงนามไม่อยู่ในคิวห้องยา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-012 - ทดสอบรับ Order จากปุ่มในแถวยา แล้วปุ่มในแถวเปลี่ยนตามสถานะ

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-012
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่มียาลงนามแล้ว สถานะงานพยาบาล "รอรับ Order"
2. Login ระบบด้วย user พยาบาล ER > Order Summary
3. กดปุ่ม รับ Order ในแถวยา

## Expected Result
ปุ่ม รับ Order ในแถวนั้นหายไป แถวแสดงปุ่ม ให้ยาแล้ว แทน
งานยารายการนั้นเปลี่ยนเป็น "กำลังให้ยา"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-013 - ทดสอบให้ยาแล้ว ระบบถามผู้ให้ยาและเวลาก่อนบันทึก

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-013
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ยาสถานะ "กำลังให้ยา" จาก TC-012
2. กดปุ่ม ให้ยาแล้ว ในแถวยา
3. เลือกผู้ให้ยาและเวลา แล้วกดยืนยัน

## Expected Result
ระบบแสดงหน้าต่างให้ระบุผู้ให้ยาและเวลา
หลังยืนยัน งานยารายการนั้นเป็น "ให้ยาแล้ว" ปุ่ม ให้ยาแล้ว ในแถวหายไป

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-014 - ทดสอบยกเลิก Order โดยใส่เหตุผล

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-014
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่มียาลงนามแล้วและยังไม่ได้ให้ยา
2. Login ระบบด้วย user พยาบาล ER > Order Summary
3. กดปุ่ม ยกเลิก Order ในแถวยา > ใส่เหตุผล > กดยืนยัน

## Expected Result
งานยารายการนั้นเป็น "ยกเลิก" ปุ่มงานยาในแถวหายไป
เหตุผลที่ใส่ถูกบันทึกไว้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค EP — ช่องเหตุผล (ไม่บังคับ) กลุ่มที่กรอก
```

### TC-SBH-2593-015 - ทดสอบยกเลิก Order โดยไม่ใส่เหตุผล บันทึกได้

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-015
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่มียาลงนามแล้วและยังไม่ได้ให้ยา
2. Login ระบบด้วย user พยาบาล ER > Order Summary
3. กดปุ่ม ยกเลิก Order ในแถวยา > เว้นช่องเหตุผลว่าง > กดยืนยัน

## Expected Result
ยืนยันได้โดยไม่มีข้อความแจ้งให้กรอกเหตุผล
งานยารายการนั้นเป็น "ยกเลิก"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค EP — ช่องเหตุผล (ไม่บังคับ) กลุ่มที่เว้นว่าง
```

### TC-SBH-2593-016 - แสดงข้อความใน dialog ยกเลิก Order ว่าคำสั่งยา ใบยา และค่าใช้จ่ายยังอยู่

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2593-016
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กดปุ่ม ยกเลิก Order ในแถวยา
3. อ่านข้อความใน dialog

## Expected Result
dialog แจ้งว่าการยกเลิกนี้ไม่ได้ยกเลิกคำสั่งยา ใบยา และค่าใช้จ่าย (ทั้ง 3 อย่างยังอยู่)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-017 - ทดสอบเลือกยาหลายแถวแล้วรับ Order พร้อมกัน

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-017
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่มียาลงนามแล้วสถานะ "รอรับ Order" อย่างน้อย 3 รายการ
2. Login ระบบด้วย user พยาบาล ER > Order Summary
3. ติ๊ก checkbox ยา 2 รายการ > กด รับ Order จากแถบสั่ง

## Expected Result
ยา 2 รายการที่เลือกเปลี่ยนเป็น "กำลังให้ยา"
ยารายการที่ไม่ได้เลือกยังเป็น "รอรับ Order"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-018 - ทดสอบปุ่มรับ Order ทั้งหมด รับทุกรายการที่รอรับ

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-018
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่มียาลงนามแล้วสถานะ "รอรับ Order" อย่างน้อย 2 รายการ
2. Login ระบบด้วย user พยาบาล ER > Order Summary
3. กดปุ่ม รับ Order ทั้งหมด

## Expected Result
ยาทุกรายการที่ "รอรับ Order" เปลี่ยนเป็น "กำลังให้ยา" ไม่มีปุ่ม รับ Order เหลือในตารางยา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-019 - ตรวจสอบ ER Nurse Task List เปลี่ยนตาม เมื่อทำงานยาจาก Order Summary

Status: Not Run · Priority: High · Labels: เหมือน TC-002 แต่ QA Type : Integration

```
TC ID: TC-SBH-2593-019
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เปิดผู้ป่วย A > Order Summary
2. กด รับ Order ยา 1 รายการ
3. เปิด ER Nurse Task List > ดูแถวยารายการเดียวกัน

## Expected Result
แถวยาใน ER Nurse Task List เป็น "กำลังให้ยา" ตรงกับที่ทำจาก Order Summary

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-020 - ตรวจสอบปุ่มใน Order Summary เปลี่ยนตาม เมื่อทำงานยาจาก ER Nurse Task List

Status: Not Run · Priority: High · Labels: เหมือน TC-019

```
TC ID: TC-SBH-2593-020
Case Type: Happy
Test Type: Integration

## Test Step
1. ใช้ผู้ป่วย A ที่มียาลงนามแล้วสถานะ "รอรับ Order"
2. Login ระบบด้วย user พยาบาล ER > ER Nurse Task List > กด รับ Order ยารายการนั้น
3. เปิดผู้ป่วย A > Order Summary > ดูแถวยารายการเดียวกัน

## Expected Result
แถวยาใน Order Summary ไม่มีปุ่ม รับ Order และแสดงปุ่ม ให้ยาแล้ว ตรงกับสถานะ "กำลังให้ยา"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-021 - แสดง Note แพทย์และพยาบาลพร้อมกันแทน dropdown ใน ER ที่มี AN

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2593-021
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER
2. เปิดผู้ป่วย B (ER มี AN รอเตียง) > Order Summary
3. ดูคอลัมน์ Note

## Expected Result
Note แพทย์ (บน) และ Note พยาบาล (ล่าง) แสดงพร้อมกันแบบเดียวกับ ER ที่ยังไม่มี AN
ไม่มี dropdown เลือกแพทย์ / พยาบาล

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-022 - ตรวจสอบ ORDER FOR ONE DAY (ก่อน admit) เปิดมาแบบพับ พร้อมจำนวนรายการและราคารวม

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2593-022
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > เปิดผู้ป่วย B > Order Summary
2. ดู section ORDER FOR ONE DAY (ก่อน admit)

## Expected Result
section เปิดมาเป็นแบบพับ
หัว section แสดงจำนวนรายการ และ ราคารวม / เครดิต / จ่าย ตรงกับคำสั่งก่อน admit ของผู้ป่วย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-023 - ทดสอบคลิกหัว ORDER FOR ONE DAY (ก่อน admit) เพื่อขยายและพับ

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-2593-023
Case Type: Happy
Test Type: Functional

## Test Step
1. เปิดผู้ป่วย B > Order Summary
2. คลิกหัว ORDER FOR ONE DAY (ก่อน admit)
3. คลิกหัวอีกครั้ง

## Expected Result
คลิกครั้งแรก section ขยายและแสดงรายการคำสั่งก่อน admit
คลิกครั้งที่สอง section พับกลับเหลือหัวพร้อมยอดรวม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-024 - ตรวจสอบหมวดที่ผู้ป่วยไม่มีคำสั่งไม่แสดงเมื่อขยาย ORDER FOR ONE DAY (ก่อน admit)

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2593-024
Case Type: Happy
Test Type: UIUX

## Test Step
1. ใช้ผู้ป่วย B ที่มีคำสั่งก่อน admit เป็นยาและหัตถการ ไม่มี ICD9-CM
2. เปิด Order Summary > คลิกหัว ORDER FOR ONE DAY (ก่อน admit) ให้ขยาย
3. ดูหมวดที่แสดง

## Expected Result
แสดงเฉพาะหมวดที่มีคำสั่ง (ยา · หัตถการ)
ไม่แสดงหมวด ICD9-CM

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-025 - แสดงแถบรับไว้รักษา วันที่รับเข้าเตียง วันที่สร้าง AN และ PDx บน ORDER FOR ONE DAY ของ AN

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2593-025
Case Type: Happy
Test Type: UIUX

## Test Step
1. เปิดผู้ป่วย B > Order Summary
2. ดู ORDER FOR ONE DAY ของ AN

## Expected Result
มีแถบแสดง รับไว้รักษา / วันที่รับเข้าเตียง / วันที่สร้าง AN / PDx
ค่าที่แสดงตรงกับข้อมูล Admit ของผู้ป่วย B

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2593-UHP - ป้องกันงานยาที่ยังไม่ลงนาม และเงื่อนไขการลงนาม

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Order Summary + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2593-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER / Order Summary
- Requirement ที่อ้างอิง: SBH-2593 — [ER] [ Order Summary ] Improve order summary ER

วัตถุประสงค์
- ยืนยันว่าพยาบาลทำงานยาที่แพทย์ยังไม่ลงนามไม่ได้ และการลงนามจาก Order Summary ผ่านเงื่อนไขเดียวกับ OPD Order Form

ขอบเขต Requirement
- AC: ยาที่แพทย์ยังไม่ลงนามทำงานพยาบาลไม่ได้
- AC: ทุกแบบของ Sign ผ่านเงื่อนไขเดียวกับปุ่ม Sign ใน OPD Order Form

ความเสี่ยง
- พยาบาลให้ยาที่แพทย์ยังไม่ลงนาม
- Sign จาก Order Summary ข้ามการยืนยันยาซ้ำ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2593-026 - ตรวจสอบยาที่แพทย์ยังไม่ลงนามทำงานพยาบาลไม่ได้

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Order Summary + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2593-026
Case Type: Unhappy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่มียาค้างลงนาม 1 รายการ
2. Login ระบบด้วย user พยาบาล ER > Order Summary
3. ดูแถวยาที่ยังไม่ลงนาม แล้วลองติ๊กเลือกแถวนั้นกับแถบสั่ง และกด รับ Order ทั้งหมด

## Expected Result
แถวยาที่ยังไม่ลงนามไม่มีปุ่ม รับ Order / ให้ยาแล้ว / ยกเลิก Order
การสั่งจากแถบสั่งและ รับ Order ทั้งหมด ไม่เปลี่ยนสถานะงานของยารายการนั้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-027 - ตรวจสอบ Sign จาก Order Summary ต้องยืนยันยาซ้ำเหมือนปุ่ม Sign ใน OPD Order Form

Status: Not Run · Priority: High · Labels: เหมือน TC-026

```
TC ID: TC-SBH-2593-027
Case Type: Unhappy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วยที่ได้รับยา X ไปแล้ว แล้วสั่งยา X ซ้ำใน One Day Order (ยังไม่ลงนาม)
2. Login ระบบด้วย user แพทย์ ER > Order Summary
3. กดปุ่ม Sign ในแถวยา X

## Expected Result
ระบบแสดงการยืนยันยาซ้ำแบบเดียวกับปุ่ม Sign ใน OPD Order Form ก่อนลงนาม
ถ้ากดยกเลิกในหน้าต่างยืนยัน ยา X ยังค้างลงนาม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## TS-SBH-2593-EDG - ปุ่มพยาบาลไม่กระทบใบยาและค่าใช้จ่าย และขอบเขตเฉพาะ ER

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Order Summary + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2593-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / Order Summary
- Requirement ที่อ้างอิง: SBH-2593 — [ER] [ Order Summary ] Improve order summary ER

วัตถุประสงค์
- ยืนยันว่าปุ่มงานยาของพยาบาลเป็นแค่สถานะงาน ไม่เปลี่ยนใบยาและค่าใช้จ่าย
- ยืนยันว่า ER ที่ไม่มีคำสั่งก่อน admit ไม่แสดง section ก่อน admit
- ยืนยันว่าหอผู้ป่วยและ OPD ไม่ได้รับผลจากการ์ดนี้

ขอบเขต Requirement
- AC: ปุ่มพยาบาลไม่สร้าง/ยกเลิกค่าใช้จ่าย ไม่ตัด/คืนสต็อก ไม่แตะใบยาและ EMAR
- AC: ไม่มีคำสั่งก่อน admit → section ไม่แสดง
- AC: Admission Summary หอผู้ป่วย และ Order Summary / Order Form OPD เหมือนเดิม

ความเสี่ยง
- พยาบาลกดยกเลิก Order แล้วเข้าใจว่าหยุดยา แต่ห้องยายังคิดเงิน (ต้องเป็นแบบนั้นตามการ์ด)
- กดให้ยาแล้วไปตัดสต็อกหรือสร้างค่าใช้จ่ายซ้ำกับห้องยา
- component ที่ใช้ร่วมกับ IPD / OPD (AdmissionSummary, ActivityOrderEditableList) เปลี่ยนพฤติกรรมของหอผู้ป่วยหรือ OPD

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- 032–035 เป็นการตรวจว่าไม่กระทบที่อื่น
```

### TC-SBH-2593-028 - ตรวจสอบใบยาและค่าใช้จ่ายของ visit ไม่เปลี่ยนหลังกดรับ Order

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Order Summary + QA Case : Edge + QA Type : Integration + QA : Manual

```
TC ID: TC-SBH-2593-028
Case Type: Edge
Test Type: Integration

## Test Step
1. ใช้ผู้ป่วย A ที่ห้องยาออกใบยาแล้ว งานยาเป็น "รอรับ Order"
2. จดสถานะใบยาและรายการค่าใช้จ่ายของ visit ไว้
3. Login ระบบด้วย user พยาบาล ER > Order Summary > กด รับ Order
4. ดูสถานะใบยาและรายการค่าใช้จ่ายของ visit อีกครั้ง

## Expected Result
สถานะใบยาและรายการค่าใช้จ่ายของ visit เหมือนก่อนกด รับ Order

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-029 - ตรวจสอบใบยาและค่าใช้จ่ายของ visit ไม่เปลี่ยนหลังกดให้ยาแล้ว

Status: Not Run · Priority: High · Labels: เหมือน TC-028

```
TC ID: TC-SBH-2593-029
Case Type: Edge
Test Type: Integration

## Test Step
1. ใช้ผู้ป่วย A ที่ห้องยาออกใบยาแล้ว งานยาเป็น "กำลังให้ยา"
2. จดสถานะใบยาและรายการค่าใช้จ่ายของ visit ไว้
3. Login ระบบด้วย user พยาบาล ER > Order Summary > กด ให้ยาแล้ว > ยืนยัน
4. ดูสถานะใบยาและรายการค่าใช้จ่ายของ visit อีกครั้ง

## Expected Result
สถานะใบยาและรายการค่าใช้จ่ายของ visit เหมือนก่อนกด ให้ยาแล้ว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-030 - ตรวจสอบใบยาและค่าใช้จ่ายของ visit ยังอยู่หลังกดยกเลิก Order

Status: Not Run · Priority: High · Labels: เหมือน TC-028

```
TC ID: TC-SBH-2593-030
Case Type: Edge
Test Type: Integration

## Test Step
1. ใช้ผู้ป่วย A ที่ห้องยาออกใบยาแล้ว งานยายังไม่ได้ให้ยา
2. จดสถานะใบยาและรายการค่าใช้จ่ายของ visit ไว้
3. Login ระบบด้วย user พยาบาล ER > Order Summary > กด ยกเลิก Order > ยืนยัน
4. ดูสถานะใบยาและรายการค่าใช้จ่ายของ visit อีกครั้ง

## Expected Result
ใบยาไม่ถูกยกเลิก ค่าใช้จ่ายของยารายการนั้นยังอยู่ครบ เหมือนก่อนกด ยกเลิก Order

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-031 - ตรวจสอบ section ORDER FOR ONE DAY (ก่อน admit) ไม่แสดงเมื่อไม่มีคำสั่งก่อน admit

Status: Not Run · Priority: Medium · Labels: เหมือน TC-028 แต่ QA Type : UIUX

```
TC ID: TC-SBH-2593-031
Case Type: Edge
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER
2. เปิดผู้ป่วย C (ER มี AN ไม่มีคำสั่งก่อน admit) > Order Summary

## Expected Result
ไม่แสดง section ORDER FOR ONE DAY (ก่อน admit)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-032 - ตรวจสอบ Admission Summary ของหอผู้ป่วยยังมี dropdown เลือกแพทย์ / พยาบาล

Status: Not Run · Priority: High · Labels: เหมือน TC-031

```
TC ID: TC-SBH-2593-032
Case Type: Edge
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาลหอผู้ป่วย
2. เปิดผู้ป่วย D (Admit อยู่หอผู้ป่วย) > IPD Summary
3. ดูส่วน Note

## Expected Result
ส่วน Note ยังมี dropdown เลือกแพทย์ / พยาบาลเหมือนเดิม ไม่ใช่ Note แบบพับได้ของ ER

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-033 - ตรวจสอบ Admission Summary ของหอผู้ป่วยในมุมมองแสดงแบบแท็บไม่มีแถบรับไว้รักษา

Status: Not Run · Priority: Medium · Labels: เหมือน TC-031

```
TC ID: TC-SBH-2593-033
Case Type: Edge
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาลหอผู้ป่วย > เปิดผู้ป่วย D > IPD Summary
2. เลือกมุมมอง แสดงแบบแท็บ
3. ดู ORDER FOR ONE DAY

## Expected Result
ไม่มีแถบ รับไว้รักษา / วันที่รับเข้าเตียง / วันที่สร้าง AN / PDx (เหมือนเดิม)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-034 - ตรวจสอบ Order Summary ของ OPD ยังแสดงการ์ด ICD9-CM ตามเดิม

Status: Not Run · Priority: Medium · Labels: เหมือน TC-031

```
TC ID: TC-SBH-2593-034
Case Type: Edge
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ OPD
2. เปิดผู้ป่วย E (Visit OPD) > Order Summary

## Expected Result
การ์ด ICD9-CM แสดงตามเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-2593-035 - ตรวจสอบ Order Summary และ Order Form ของ OPD ไม่มีปุ่มงานพยาบาล

Status: Not Run · Priority: Medium · Labels: เหมือน TC-031

```
TC ID: TC-SBH-2593-035
Case Type: Edge
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล OPD
2. เปิดผู้ป่วย E (Visit OPD ที่มียาลงนามแล้ว) > Order Summary
3. เปิด Order Form ของผู้ป่วยเดียวกัน

## Expected Result
ทั้ง Order Summary และ Order Form ไม่มีปุ่ม รับ Order / ให้ยาแล้ว / ยกเลิก Order / รับ Order ทั้งหมด

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

---

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - ปุ่มในแถวยาแต่ละสถานะมีปุ่มอะไรบ้าง — สถานะ "รอรับ Order" มี ยกเลิก Order ด้วยหรือไม่ · "กำลังให้ยา" ยกเลิกได้หรือไม่ · "ให้ยาแล้ว" / "ยกเลิก" แสดงอะไรแทนปุ่ม (การ์ดไม่มีคอลัมน์สถานะ)
  - ส่วน Note ที่พับ "เวลาล่าสุด" นับจากเวลาบันทึกหรือเวลาแก้ไขล่าสุด · พับทั้ง 2 ส่วนพร้อมกันได้หรือไม่
  - ER IPD: Progress Note ที่เขียนหลังมี AN เก็บกับ AN หรือ VN
  - ยอดรวม ORDER FOR ONE DAY รวมรายการที่ยกเลิก / Inactive ด้วยหรือไม่
- **Validation**
  - ให้ยาแล้ว: เวลาให้ยาเลือกเวลาในอนาคต หรือก่อนเวลาสั่งยาได้หรือไม่ · ผู้ให้ยาเลือกได้จากรายชื่อใคร
  - เหตุผลยกเลิก Order มีความยาวสูงสุดเท่าไร
- **Error handling**
  - Sign ทีละรายการ / หลายรายการ ต้องผ่านเงื่อนไข ฟอร์ม lab ที่บังคับ และ imaging category ด้วยไหม เมื่อรายการที่เลือกเป็นยาอย่างเดียว (การ์ดบอกแค่ "ทุกแบบผ่านเงื่อนไขเดียวกัน")
  - รับ Order ทั้งหมด / สั่งหลายแถว แล้วบางรายการล้ม (เช่นถูกเปลี่ยนสถานะจาก Nurse Task List พร้อมกัน) แจ้งอย่างไร
- **Permission / role**
  - role ไหนบ้างที่ได้ `nurse-task:view` / `nurse-task:edit` และ `opd-order:create` (การ์ดให้ cortex-testing เพิ่ม "ถ้ายังไม่มี") (ไม่มี TC เพราะผู้ใช้สั่งตัดส่วน Security)
  - user ที่มี `nurse-task:view` แต่ไม่มี edit เห็นอะไรในตารางยา
- **Edge cases**
  - แพทย์ยกเลิกคำสั่งยาหลังพยาบาล "ให้ยาแล้ว" — แถวยาใน Order Summary แสดงอย่างไร
  - ห้องยายกเลิกใบยาหลังพยาบาลรับ Order — ปุ่มพยาบาลยังทำต่อได้หรือไม่
  - ข้ามเที่ยงคืน: ORDER FOR ONE DAY ของ ER แยกตามวันหรือไม่ และยอดรวมนับรวมทุกวันหรือเฉพาะวันนี้
