# Draft Test Structure — SBH-1181

> สถานะ: **สร้างใน Linear แล้ว (2026-10-22)**
> - EXE SBH-2921 (EXE - CT - 2.8.0) → HPY SBH-2922 (TC 001–009 = SBH-2925–2933) · EDG SBH-2923 (TC 010–016 = SBH-2934–2940) · UHP SBH-2924 (TC 017–018 = SBH-2941–2942)
> - สร้างผ่าน Linear ที่ต่อด้วยบัญชี Neranchara Kaewsiri (ผู้ใช้อนุญาต) → ผู้สร้างการ์ดเป็นชื่อนั้น · assignee = Suchat ทุกใบ
> - ไม่ได้ผูก Cycle ให้การ์ดลูก (การ์ดแม่ผูก Cycle อยู่) · label 🐷 VERSION 2.8.0 ใส่ได้แม้ถูก retire
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · วงเล็บท้ายชื่อบอกหน้าที่ต้องดู
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)
> - Env: Dev-X / SBH Prod (default) · Run Type: CT (การ์ดผูก Cycle) — ผู้ใช้ review แล้วสั่งสร้าง
> - QA Module : OPD · QA Sub-module / Feature : CPOE — ผู้ใช้เลือกแล้ว (2026-10-22) · สร้าง label Sub-module CPOE ใหม่ใน workspace แล้วตามที่ผู้ใช้สั่ง (2026-10-22)
> - ยาตัวอย่างใน Test Data มาจากผลสำรวจ dev-x 20 ต.ค. 2026 (สิทธิ UC) ต้องยืนยันยอดเครดิต / ต้องชำระอีกครั้งตอนสำรวจแอป

Requirement: SBH-1181 — [CPOE] Copay: ระบบสามารถแสดงช่องบันทึกเอกสาร Copay ขึ้นมาอัตโนมัติเมื่อมีค่าใช้จ่ายเพิ่มเติม
URL: https://linear.app/cortexcloud/issue/SBH-1181
Project: UAT#2 OPD EMR CPOE · Team: SBH Project · Priority: Urgent · State: Testing · Cycle: ผูกอยู่ · Milestone: ไม่มี
Labels: 🍄 New Feature, SBH UAT D3 - CPOE, For OPD Biz Sim - SBH, 🐷 VERSION 2.8.0 · Assignee: Suchat Chancherngsilapakul
PR: cortex-ui#1794 "[V2.8.0][FEAT][SBH-1181] Update Co-pay item eligibility" · Sub-Issue: ไม่มี · คอมเมนต์: ไม่มี
การ์ดที่เกี่ยวข้อง: SBH-915 (เหตุผล F → เครดิต 0 · Testing) · SBH-1418 (ปุ่มผู้ป่วยประสงค์ชำระเงินเอง · Won't do)

สรุปการ์ด
- รายการเข้า Co-pay เมื่อ "ยอดที่ผู้ป่วยต้องชำระ" > 0 และสิทธิไม่ใช่เงินสด (ไม่ดูยอดเครดิต)
  - Order (ยา / Lab / Imaging / Activity): `estimatedPrice.nonReimbursablePrice > 0`
  - เวชภัณฑ์ / อุปกรณ์จาก charge item: `accountChargeItem.totalNetPaid > 0`
- มีอย่างน้อย 1 รายการ → แสดงปุ่ม "พิมพ์ Co-pay" · เอกสารมีเฉพาะรายการที่ต้องชำระ ราคาในเอกสาร = ยอดต้องชำระ
- 1 เอกสารต่อ Visit · เพิ่ม / แก้ / ลบ Order → อัปเดตเอกสารเดิม · ไม่เหลือรายการ → ลบหรือยกเลิกเอกสาร
- ตารางตัวอย่างในการ์ด: 10/0/10 เข้า · 20/10/10 เข้า · 50/50/0 ไม่เข้า · 30/0/0 ไม่เข้า

| AC / ที่มา | Expected Result | TC |
|---|---|---|
| AC1 (เพิ่ม) · AC2 | สั่ง Order ที่มียอดต้องชำระ → แสดงปุ่ม "พิมพ์ Co-pay" | 001 · 002 · 007 · 008 · 009 |
| AC1 (แก้) · AC5 | แก้จำนวน → เอกสารอัปเดตจำนวนและยอด | 010 |
| AC1 (ลบ) · AC5 | ลบรายการ Copay → หายจากเอกสาร | 013 |
| AC3 | เอกสารมีเฉพาะรายการที่ต้องชำระ | 003 |
| AC4 | หลายรายการแสดงครบในเอกสารเดียว | 004 |
| สูตรคำนวณในการ์ด | ราคาในเอกสาร = ยอดต้องชำระ · ยอดรวม = ผลรวม | 005 |
| AC6 | ใช้ Template Copay ตาม Product Setup | 006 |
| AC7 | 1 เอกสารต่อ Visit | 012 |
| AC8 | เพิ่มรายการใน Visit เดิม → อัปเดตเอกสารเดิม | 011 |
| AC9 · BR3 | ไม่เหลือรายการ → ปุ่มหาย · เอกสารถูกลบ / ยกเลิก | 014 · 015 |
| AC1 (แก้) · AC9 · BR9 | เปลี่ยนเหตุผล F → B รายการออกจาก Co-pay | 016 |
| AC10 | สิทธิเงินสดไม่แสดงปุ่ม | 017 |
| AC11 | Non-ED + เหตุผล F เข้า Co-pay | 007 (ปุ่ม) · 003 (ในเอกสาร) |
| ตารางตัวอย่าง แถว 50/50/0 | เบิกได้เต็มไม่เข้า Co-pay | 018 |
| ตารางตัวอย่าง แถว 30/0/0 | — | ไม่มี TC (ดู gap) |

ข้อมูลตั้งต้น (สิทธิ UC = H03 · ทุกรายต้องยังไม่สร้างใบยา เพราะสร้างใบยาแล้ว Order ถูกล็อก)
- คนไข้ A (UC): BETAMED (med0000005) 100 → เบิกได้ 50 / ต้องชำระ 50 → TC 001
- คนไข้ B (UC): DUOCETZ (ยานอกบัญชี เหตุผล B · ไม่มีเพดาน) → เบิกได้ 0 / ต้องชำระเต็ม → TC 002
- คนไข้ C (UC): med0000007 (ยา NED ที่มีเพดาน UC) เหตุผล F → เบิกได้ 0 / ต้องชำระเต็ม → TC 007
- คนไข้ D (UC): 4 รายการแบบ Case 1 ของการ์ด — DUOCETZ เหตุผล B (จ่ายเต็ม) · BETAMED (จ่ายส่วนต่าง) · med0000007 เหตุผล F · LINCOMYCIN (med0000006) 1 vial (เบิกได้เต็ม) → TC 003 → 004 → 005 → 006 → 012 → 010 → 011 → 013 → 016 → 014 → 015
- คนไข้ E (UC): Lab / Imaging / Activity 1 รายการที่สิทธิ UC มียอดต้องชำระ > 0 (หาตอนสำรวจ) → TC 008
- คนไข้ F (UC): เวชภัณฑ์ / อุปกรณ์ 1 รายการที่มียอดต้องชำระ > 0 (หาตอนสำรวจ) → TC 009
- คนไข้ G (เงินสด H01): DUOCETZ เหตุผล B + BETAMED → TC 017
- คนไข้ H (UC): LINCOMYCIN 1 vial อย่างเดียว (เบิกได้เต็ม) → TC 018

---

## EXE - CT - 2.8.0

Labels: requirement labels + QA Module : OPD + QA Sub-module / Feature : CPOE + QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.8.0
- Module: OPD / CPOE
- Requirement ที่อ้างอิง: SBH-1181 — [CPOE] Copay: ระบบสามารถแสดงช่องบันทึกเอกสาร Copay ขึ้นมาอัตโนมัติเมื่อมีค่าใช้จ่ายเพิ่มเติม
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- แสดงปุ่ม "พิมพ์ Co-pay" เมื่อ Visit มีรายการที่ผู้ป่วยต้องชำระเอง (จ่ายส่วนต่าง / จ่ายเต็ม / Non-ED เหตุผล F / Order ที่ไม่ใช่ยา / เวชภัณฑ์)
- เนื้อหาเอกสาร Co-pay: เฉพาะรายการที่ต้องชำระ · ครบทุกรายการ · ราคาเป็นยอดต้องชำระ · Template ตาม Product Setup
- เอกสาร 1 ฉบับต่อ Visit และอัปเดตตามการเพิ่ม / แก้ / ลบ Order
- ไม่เหลือรายการ Co-pay → ปุ่มหายและเอกสารถูกลบ / ยกเลิก
- สิทธิเงินสด และรายการที่เบิกได้เต็ม ไม่เข้า Co-pay

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1181-HPY - แสดงปุ่มและสร้างเอกสาร Co-pay เมื่อ Visit มีรายการที่ผู้ป่วยต้องชำระเอง

Labels: requirement labels + QA Module : OPD + QA Sub-module / Feature : CPOE + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1181-HPY
- Case Type: Happy
- Suffix: HPY
- Module: OPD / CPOE
- Requirement ที่อ้างอิง: SBH-1181

วัตถุประสงค์
- ยืนยันว่ารายการที่มียอดต้องชำระ > 0 ทุกแบบทำให้แสดงปุ่ม "พิมพ์ Co-pay" และเอกสารแสดงรายการและยอดถูกต้อง

ขอบเขต Requirement
- AC1 (เพิ่ม) · AC2 · AC3 · AC4 · AC6 · AC11 · สูตรคำนวณ Co-pay · แหล่งข้อมูลราคา 2 แบบ (Order / charge item)

ความเสี่ยง
- ผู้ป่วยไม่ได้รับเอกสาร Co-pay ทั้งที่ต้องชำระเอง · เอกสารแสดงยอดผิด (ราคาก่อนคิดสิทธิหรือยอดเครดิต)

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1181-001 - แสดงปุ่มพิมพ์ Co-pay เมื่อสั่งยาที่ผู้ป่วยต้องจ่ายส่วนต่าง (หน้า CPOE)
Priority: Urgent · Type: Functional
```
Test Step
1. เตรียมคนไข้ A สิทธิ UC เปิด Visit OPD
2. Login ระบบด้วย user แพทย์ > เปิด CPOE ของคนไข้ A > สั่งยา BETAMED 1 รายการ (เบิกได้ 50 / ต้องชำระ 50) > ส่งคำสั่ง
3. ดูปุ่ม "พิมพ์ Co-pay"

Expected Result
แสดงปุ่ม "พิมพ์ Co-pay"
```

### TC-SBH-1181-002 - แสดงปุ่มพิมพ์ Co-pay เมื่อสั่งยาที่เบิกไม่ได้เลย (หน้า CPOE)
Priority: Urgent · Type: Functional
```
Test Step
1. เตรียมคนไข้ B สิทธิ UC เปิด Visit OPD
2. Login ระบบด้วย user แพทย์ > เปิด CPOE ของคนไข้ B > สั่งยานอกบัญชี DUOCETZ เหตุผล B 1 รายการ (เบิกได้ 0 / ต้องชำระเต็ม) > ส่งคำสั่ง
3. ดูปุ่ม "พิมพ์ Co-pay"

Expected Result
แสดงปุ่ม "พิมพ์ Co-pay"
```

### TC-SBH-1181-003 - เอกสาร Co-pay มีเฉพาะรายการที่ผู้ป่วยต้องชำระเอง (เอกสาร Co-pay)
Priority: Urgent · Type: Functional
```
Test Step
1. เตรียมคนไข้ D สิทธิ UC เปิด Visit OPD
2. Login ระบบด้วย user แพทย์ > เปิด CPOE > สั่งยา 4 รายการ แล้วส่งคำสั่ง
   - DUOCETZ เหตุผล B (ต้องชำระเต็ม)
   - BETAMED (ต้องชำระส่วนต่าง)
   - med0000007 เหตุผล F (ต้องชำระเต็ม)
   - LINCOMYCIN 1 vial (เบิกได้เต็ม)
3. กดปุ่ม "พิมพ์ Co-pay" > เปิดเอกสาร

Expected Result
เอกสารมี DUOCETZ · BETAMED · med0000007 · ไม่มี LINCOMYCIN
```

### TC-SBH-1181-004 - เอกสาร Co-pay แสดงรายการที่ต้องชำระครบทุกรายการ (เอกสาร Co-pay)
Priority: High · Type: Functional
```
Test Step
1. ใช้เอกสารจาก `TC-SBH-1181-003`
2. นับรายการในเอกสาร เทียบกับรายการที่ต้องชำระใน CPOE

Expected Result
เอกสารแสดงรายการที่ต้องชำระครบ 3 รายการในเอกสารฉบับเดียว ไม่มีรายการตกหล่นหรือถูกตัด
```

### TC-SBH-1181-005 - คำนวณราคาในเอกสาร Co-pay เป็นยอดที่ผู้ป่วยต้องชำระเอง (เอกสาร Co-pay)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้เอกสารจาก `TC-SBH-1181-003`
2. จดยอด "ต้องชำระ" ของแต่ละรายการจากส่วนรวมค่าใช้จ่ายใน CPOE
3. เทียบราคาแต่ละแถวและยอดรวมในเอกสาร

Expected Result
ราคาแต่ละแถว = ยอดต้องชำระของรายการนั้น (BETAMED แสดง 50 ไม่ใช่ราคาเต็ม 100 หรือยอดเครดิต 50) · ยอดรวม = ผลรวมยอดต้องชำระทั้ง 3 รายการ
```

### TC-SBH-1181-006 - ตรวจสอบเอกสาร Co-pay ใช้ Template ตามที่ตั้งใน Product Setup (เอกสาร Co-pay)
Priority: Medium · Type: UIUX
```
Test Step
1. ใช้เอกสารจาก `TC-SBH-1181-003`
2. เปิด Template Copay ที่กำหนดใน Product Setup
3. เทียบหัวเอกสาร ฟิลด์ และการจัดวาง

Expected Result
เอกสาร Co-pay ใช้ Template Copay ตาม Product Setup ชุดฟิลด์และการจัดวางตรงกัน
```

### TC-SBH-1181-007 - แสดงปุ่มพิมพ์ Co-pay เมื่อสั่งยานอกบัญชีเหตุผล F (หน้า CPOE)
Priority: Urgent · Type: Functional
```
Test Step
1. เตรียมคนไข้ C สิทธิ UC เปิด Visit OPD
2. Login ระบบด้วย user แพทย์ > เปิด CPOE > สั่งยา med0000007 เลือกเหตุผล F 1 รายการ > ส่งคำสั่ง
3. ดูปุ่ม "พิมพ์ Co-pay"

Expected Result
แสดงปุ่ม "พิมพ์ Co-pay"
```

### TC-SBH-1181-008 - แสดงปุ่มพิมพ์ Co-pay เมื่อสั่ง Order ที่ไม่ใช่ยาซึ่งมียอดต้องชำระ (หน้า CPOE)
Priority: High · Type: Functional
```
Test Step
1. เตรียมคนไข้ E สิทธิ UC เปิด Visit OPD
2. Login ระบบด้วย user แพทย์ > เปิด CPOE > สั่ง Lab / Imaging / Activity 1 รายการที่มียอดต้องชำระ > 0 > ส่งคำสั่ง
3. ดูปุ่ม "พิมพ์ Co-pay"

Expected Result
แสดงปุ่ม "พิมพ์ Co-pay"
```

### TC-SBH-1181-009 - แสดงปุ่มพิมพ์ Co-pay เมื่อเพิ่มเวชภัณฑ์ที่มียอดต้องชำระ (หน้า CPOE)
Priority: High · Type: Functional
```
Test Step
1. เตรียมคนไข้ F สิทธิ UC เปิด Visit OPD
2. เพิ่มเวชภัณฑ์ / อุปกรณ์ 1 รายการที่มียอดต้องชำระ > 0
3. ดูปุ่ม "พิมพ์ Co-pay"

Expected Result
แสดงปุ่ม "พิมพ์ Co-pay"
```

---

## TS-SBH-1181-EDG - เอกสาร Co-pay อัปเดตเมื่อเพิ่ม แก้ไข หรือลบ Order ใน Visit เดิม

Labels: requirement labels + QA Module : OPD + QA Sub-module / Feature : CPOE + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1181-EDG
- Case Type: Edge
- Suffix: EDG
- Module: OPD / CPOE
- Requirement ที่อ้างอิง: SBH-1181

วัตถุประสงค์
- ยืนยันว่าเอกสาร Co-pay มีฉบับเดียวต่อ Visit และเปลี่ยนตาม Order ล่าสุดทุกครั้งที่เพิ่ม แก้ไข หรือลบ

ขอบเขต Requirement
- AC1 (แก้ / ลบ) · AC5 · AC7 · AC8 · AC9 · Business Rule 3 และ 9

ความเสี่ยง
- เอกสารค้างข้อมูลเก่า ผู้ป่วยถูกเรียกเก็บผิด · เอกสารซ้ำหลายฉบับใน Visit เดียว · เอกสารค้างทั้งที่ไม่มีรายการต้องชำระแล้ว

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ใช้คนไข้ D ต่อจาก HPY ตามลำดับ 012 → 010 → 011 → 013 → 016 → 014 → 015
```

### TC-SBH-1181-010 - อัปเดตจำนวนและยอดในเอกสาร Co-pay เมื่อแก้จำนวนยาที่ต้องชำระ (เอกสาร Co-pay)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้ Visit ของคนไข้ D ที่มีเอกสาร Co-pay แล้ว (ยังไม่สร้างใบยา)
2. Login ระบบด้วย user แพทย์ > CPOE > แก้จำนวน BETAMED จาก 1 เป็น 2 > บันทึก
3. กดปุ่ม "พิมพ์ Co-pay" > เปิดเอกสาร

Expected Result
แถว BETAMED แสดงจำนวน 2 และยอดต้องชำระใหม่ตามจำนวน · ยอดรวมเปลี่ยนตาม
```

### TC-SBH-1181-011 - เพิ่มรายการ Co-pay ใน Visit เดิมแล้วอัปเดตเอกสารเดิม (เอกสาร Co-pay)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้ Visit ของคนไข้ D ต่อจาก `TC-SBH-1181-010` · จดเลขที่ / ตัวระบุเอกสาร Co-pay เดิม
2. สั่ง Order ใหม่ 1 รายการที่มียอดต้องชำระ > 0 > ส่งคำสั่ง
3. กดปุ่ม "พิมพ์ Co-pay" > เปิดเอกสาร

Expected Result
เอกสารเป็นฉบับเดิม (ตัวระบุเดิม) และมีรายการใหม่เพิ่มเข้ามา
```

### TC-SBH-1181-012 - ตรวจสอบ Visit มีเอกสาร Co-pay เพียง 1 ฉบับเมื่อพิมพ์ซ้ำ (รายการเอกสารของ Visit)
Priority: High · Type: Functional
```
Test Step
1. ใช้ Visit ของคนไข้ D ที่พิมพ์เอกสารแล้วจาก `TC-SBH-1181-003`
2. กดปุ่ม "พิมพ์ Co-pay" อีก 1 ครั้ง
3. เปิดรายการเอกสารของ Visit

Expected Result
Visit มีเอกสาร Co-pay 1 ฉบับ ไม่เกิดฉบับใหม่จากการพิมพ์ซ้ำ
```

### TC-SBH-1181-013 - ลบรายการ Co-pay แล้วรายการหายจากเอกสาร Co-pay (เอกสาร Co-pay)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้ Visit ของคนไข้ D ต่อจาก `TC-SBH-1181-011`
2. CPOE > ลบ DUOCETZ > บันทึก
3. กดปุ่ม "พิมพ์ Co-pay" > เปิดเอกสาร

Expected Result
เอกสารไม่มี DUOCETZ · รายการ Co-pay อื่นยังอยู่ · ยอดรวมลดลงเท่ายอดต้องชำระของ DUOCETZ
```

### TC-SBH-1181-014 - ซ่อนปุ่มพิมพ์ Co-pay เมื่อไม่เหลือรายการที่ต้องชำระเอง (หน้า CPOE)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้ Visit ของคนไข้ D ต่อจาก `TC-SBH-1181-016`
2. CPOE > ลบรายการที่ต้องชำระที่เหลือทั้งหมด > บันทึก (เหลือเฉพาะรายการที่เบิกได้เต็ม)
3. ดูปุ่ม "พิมพ์ Co-pay"

Expected Result
ไม่แสดงปุ่ม "พิมพ์ Co-pay"
```

### TC-SBH-1181-015 - ลบหรือยกเลิกเอกสาร Co-pay เมื่อไม่เหลือรายการที่ต้องชำระเอง (รายการเอกสารของ Visit)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้ Visit ของคนไข้ D ต่อจาก `TC-SBH-1181-014`
2. เปิดรายการเอกสารของ Visit

Expected Result
เอกสาร Co-pay ที่สร้างอัตโนมัติถูกลบหรือแสดงสถานะยกเลิก
```

### TC-SBH-1181-016 - เปลี่ยนเหตุผลยานอกบัญชีจาก F เป็น B แล้วรายการออกจากเอกสาร Co-pay (เอกสาร Co-pay)
Priority: High · Type: Functional
```
Test Step
1. ใช้ Visit ของคนไข้ D ต่อจาก `TC-SBH-1181-013`
2. CPOE > แก้ med0000007 เปลี่ยนเหตุผลจาก F เป็น B > บันทึก
3. กดปุ่ม "พิมพ์ Co-pay" > เปิดเอกสาร

Expected Result
เอกสารไม่มี med0000007 (กลับไปเบิกได้ตามสิทธิ ต้องชำระ 0)
```

---

## TS-SBH-1181-UHP - ไม่แสดงปุ่ม Co-pay เมื่อสิทธิเงินสดหรือไม่มีรายการที่ต้องชำระเอง

Labels: requirement labels + QA Module : OPD + QA Sub-module / Feature : CPOE + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1181-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: OPD / CPOE
- Requirement ที่อ้างอิง: SBH-1181

วัตถุประสงค์
- ยืนยันว่าระบบไม่ trigger Co-pay กับสิทธิเงินสด และกับ Visit ที่ทุกรายการเบิกได้เต็ม

ขอบเขต Requirement
- AC10 · Business Rule 1 · ตารางตัวอย่างแถว 50/50/0

ความเสี่ยง
- ออกเอกสาร Co-pay ให้ผู้ป่วยที่ไม่ต้องจ่าย ทำให้เรียกเก็บผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1181-017 - ไม่แสดงปุ่มพิมพ์ Co-pay สำหรับผู้ป่วยสิทธิเงินสด (หน้า CPOE)
Priority: High · Type: Functional
```
Test Step
1. เตรียมคนไข้ G สิทธิเงินสด (H01) เปิด Visit OPD
2. Login ระบบด้วย user แพทย์ > CPOE > สั่ง DUOCETZ เหตุผล B และ BETAMED > ส่งคำสั่ง
3. ดูปุ่ม "พิมพ์ Co-pay"

Expected Result
ไม่แสดงปุ่ม "พิมพ์ Co-pay"
```

### TC-SBH-1181-018 - ไม่แสดงปุ่มพิมพ์ Co-pay เมื่อทุกรายการเบิกได้เต็ม (หน้า CPOE)
Priority: High · Type: Functional
```
Test Step
1. เตรียมคนไข้ H สิทธิ UC เปิด Visit OPD
2. Login ระบบด้วย user แพทย์ > CPOE > สั่ง LINCOMYCIN 1 vial (เบิกได้เต็ม · ต้องชำระ 0) > ส่งคำสั่ง
3. ดูปุ่ม "พิมพ์ Co-pay"

Expected Result
ไม่แสดงปุ่ม "พิมพ์ Co-pay"
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- การ์ดไม่ได้บอกว่าปุ่ม "พิมพ์ Co-pay" อยู่หน้าไหน (TC เขียนเป็น "หน้า CPOE" ไว้ก่อน ยืนยันตอนสำรวจ) และดูรายการเอกสารของ Visit ได้ที่ไหน (TC 012 · 015 · 017)
- ระบบเริ่มตรวจตอนเพิ่มลงตะกร้า หรือตอนส่งคำสั่ง — TC ตรวจหลังส่งคำสั่ง
- เอกสาร Co-pay ถูกสร้างตอนสั่ง Order หรือตอนกดปุ่ม "พิมพ์ Co-pay" ครั้งแรก
- AC9 ให้ "ลบหรือยกเลิก" เอกสาร — ไม่ได้ระบุว่าแบบไหน (TC 015 ยอมรับทั้งสองแบบ)
- ตารางแถว 30 / 0 / 0 (ราคา 30 เครดิต 0 ต้องชำระ 0) — ไม่รู้ว่ารายการแบบไหนในแอปให้ผลนี้ จึงไม่สร้าง TC
- ตัวอย่าง Case 1 ในการ์ดใช้สิทธิ SS แต่ TC ใช้สิทธิ UC (มีข้อมูลยาที่รู้ยอดแล้ว) — จะเทส SS ด้วยหรือไม่
- หลังสร้างใบยาแล้ว Order ถูกล็อก — ถ้าเภสัชย้อนกลับใบยาแล้วแก้ Order เอกสาร Co-pay ต้องอัปเดตด้วยหรือไม่

Validation
- -

Error handling
- -

Permission / role
- การ์ดไม่ได้ระบุว่า role ไหนเห็น / กดปุ่ม "พิมพ์ Co-pay" ได้ (TC ใช้ user แพทย์)

Edge cases
- Visit ที่มีหลายสิทธิ (เช่น UC + เงินสด) — การ์ดไม่ได้ระบุว่านับเป็น "ไม่ใช่สิทธิเงินสด" หรือไม่
- สิทธิเงินสดที่มีรายการยานอกบัญชีเหตุผล F — เหตุผล F มีผลกับสิทธิเงินสดหรือไม่
