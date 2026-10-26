# Draft Test Structure — SBH-915

> สถานะ: **สร้างใน Linear แล้ว (2026-10-22)**
> - EXE SBH-2895 (EXE - RT - 2.8.0) → HPY SBH-2896 (TC 001–006 = SBH-2898–2903) · EDG SBH-2897 (TC 007–009 = SBH-2904–2906)
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee Suchat ทุกใบ
> - createdBy ทั้ง 12 ใบเป็น Neranchara Kaewsiri เพราะ Linear connector ล็อกอินบัญชีนั้น — ผู้ใช้ให้สร้างต่อได้ โดยตั้ง assignee เป็น Suchat
> - QA Module : Pharmacy · QA Sub-module / Feature : Prescription · QA Run : Retest — ผู้ใช้ยืนยันแล้ว (2026-10-22) พร้อม Run Type RT · เก็บ TC-002 แบบเพิ่ม LINCOMYCIN · เก็บ TC-004 (ห้องยา)
> - เช็ก label ใน Linear แล้ว (2026-10-22): QA Module : Pharmacy · QA Sub-module / Feature : Prescription · QA Run : Retest · QA Case : Happy / Edge · QA Type : Functional มีครบ · **🐷 VERSION 2.8.0 ถูก retire (20 ต.ค. 2026) ใส่ให้การ์ดใหม่ไม่ได้** → ใช้ label ของการ์ดแม่ที่เหลือ (🐞 BUG · SBH - UAT D4 Pharmacy · For OPD Biz Sim - SBH) · version ยังอยู่ในชื่อ EXE
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · วงเล็บท้ายชื่อบอกหน้าที่ต้องดู
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 (TC ID / Case Type / Test Type → Test Step → Expected Result → Test Result แยก env)
> - Env: Dev-X / SBH Prod (default)

Requirement: SBH-915 — [Pharmacy] ปรับยอดเครดิต (เบิกได้) เป็น 0 เมื่อเลือกเหตุผลใช้ยานอกบัญชี = F
URL: https://linear.app/cortexcloud/issue/SBH-915
Project: UAT#2 OPD EMR CPOE · Team: SBH Project · Priority: Urgent · State: Testing · Cycle: ผูกอยู่ · Milestone: ไม่มี
Labels: 🐞 BUG, SBH - UAT D4 Pharmacy, For OPD Biz Sim - SBH, 🐷 VERSION 2.8.0 · Assignee: Suchat Chancherngsilapakul
PR: cortex-api#2305 "set reimbursable price to zero for NED F medications" · Sub-Issue: ไม่มี
คอมเมนต์: "อาจต้องเพิ่ม Condition ที่ Cashier ไม่ให้กดใช้วงเงินกับยาเหตุผล F กรณีสิทธิ พรบ." (ยังไม่ใช่ข้อสรุป → gap)
การ์ดที่เกี่ยวข้อง: SBH-1181 (เอกสาร Co-pay) · TMH-5178 (Done — มติ 23 ก.ย.: ยา F คงสิทธิไว้ แต่เครดิต 0 ไม่ใช่เปลี่ยนเป็นเงินสด) · CTXN-9605 / 9609 / 9610 (E2E-02 ใช้การ์ดนี้)

สรุปจากการ์ด
- Business Rule: ยา Non-ED เหตุผล F → เครดิต = 0.00 · จ่าย = ราคารวมของรายการ · เหตุผล A–E คำนวณตามสิทธิเดิม
- รูปในการ์ด (หน้าสั่งยา CPOE): GPO-L-ONE (deferiprone 500 mg) 7 tablet · Non-ED · เหตุผล F · รวม 33.25
  - ตอนนี้: เครดิต 33.25 / จ่าย 0.00 (ทั้งแถวและยอดรวมท้ายตาราง)
  - ที่ถูกต้อง: เครดิต 0 / จ่าย 33.25 (ทั้งแถวและยอดรวมท้ายตาราง)
- Scope: เครดิต / จ่าย ต่อรายการ · ราคาประมาณการรวม · คำนวณใหม่เมื่อแก้เหตุผลหรือจำนวน · ส่งต่อ Cashier

| ที่มา | Expected Results | TC |
|---|---|---|
| AC-01 | สั่งยา Non-ED เลือกเหตุผล F → แถวยา เครดิต 0.00 / จ่าย = ราคารวม | 001 |
| AC-02 | ยอดรวมท้ายตาราง (ราคาประมาณการรวม) ไม่นับเครดิตของยา F | 002 |
| AC-07 | สั่งยาเหตุผล F แล้วมีเอกสาร Co-pay ที่มีรายการยา F | 003 |
| หมายเหตุในการ์ด ("ดักจังหวะสร้างใบยา") | สร้างใบยาแล้ว รายการยา F ที่ห้องยา เครดิต 0 | 004 |
| AC-05 | Cashier ได้ยอดเครดิตของยา F = 0 | 005 |
| AC-06 | ยา F ไม่เข้ายอดเบิก e-Claim | 006 |
| AC-03 | เปลี่ยนเหตุผลจาก A–E เป็น F → เครดิตเป็น 0 | 007 |
| AC-04 | เปลี่ยนเหตุผลจาก F กลับเป็น A–E → คำนวณตามสิทธิเดิม | 008 |
| Scope (แก้จำนวน) | แก้จำนวนยาเหตุผล F → เครดิตยังเป็น 0 · จ่ายตามราคารวมใหม่ | 009 |

ข้อมูลตั้งต้น
- ยา F: med0000007 GPO-L-ONE (deferiprone 500 mg) film-coated tablet · Non-ED · 4.75 / เม็ด · สิทธิ UC เบิกได้ (เพดาน 6.19) — ยาตัวเดียวกับรูปในการ์ด · 7 เม็ด = 33.25
- ยาเบิกได้ (ใช้ใน TC-002): med0000006 LINCOMYCIN 1 vial = 3.50 · สิทธิ UC เบิกได้เต็ม (เพดาน 4.63)
- คนไข้ 1 (HPY): Visit OPD สิทธิ H03 UC ลำดับ 1 · ลำดับเทส 001 → 002 → 003 → 004 → 005 → (รับชำระ + ปิด Visit) → 006
- คนไข้ 2 (EDG): Visit OPD สิทธิ H03 UC ลำดับ 1 · ลำดับเทส 007 → 008 → 009

---

## EXE - RT - 2.8.0

Labels: requirement labels + QA Module : Pharmacy + QA Sub-module / Feature : Prescription + QA Run : Retest

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: RT
- Scope / Version: 2.8.0
- Module: Pharmacy / Prescription
- Requirement ที่อ้างอิง: SBH-915 — [Pharmacy] ปรับยอดเครดิต (เบิกได้) เป็น 0 เมื่อเลือกเหตุผลใช้ยานอกบัญชี = F
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ยา Non-ED เหตุผล F: เครดิต 0.00 / จ่าย = ราคารวม ทั้งแถวยาและยอดรวมท้ายตาราง (หน้าสั่งยา CPOE)
- เอกสาร Co-pay มีรายการยาเหตุผล F
- ยอดเครดิต 0 ส่งต่อไปที่ห้องยา (สร้างใบยา) · Cashier · และไม่เข้ายอดเบิก e-Claim
- คำนวณใหม่เมื่อเปลี่ยนเหตุผล (A–E ↔ F) และเมื่อแก้จำนวน
- ลำดับเทส: คนไข้ 1 → 001 → 002 → 003 → 004 → 005 → 006 · คนไข้ 2 → 007 → 008 → 009

หมายเหตุ
- สร้างจาก Acceptance Criteria / Business Rules / Scope ของการ์ดโดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-915-HPY - สั่งยานอกบัญชีเหตุผล F แล้วเครดิตเป็น 0 ตั้งแต่สั่งยาจนถึงส่งเบิก

Labels: requirement labels + QA Module + QA Sub-module + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-915-HPY
- Case Type: Happy
- Suffix: HPY
- Module: Pharmacy / Prescription
- Requirement ที่อ้างอิง: SBH-915

วัตถุประสงค์
- ยืนยันว่ายา Non-ED ที่เลือกเหตุผล F มีเครดิต 0 และผู้ป่วยจ่ายเต็มราคา ตั้งแต่หน้าสั่งยา ห้องยา การเงิน จนถึง e-Claim

ขอบเขต Requirement
- AC-01 · AC-02 · AC-05 · AC-06 · AC-07
- หมายเหตุในการ์ด: account_charge_item ถูกสร้างตอนสร้างใบยา

ความเสี่ยง
- โรงพยาบาลส่งเบิกยาที่ผู้ป่วยยืนยันจ่ายเอง → ถูกเรียกเงินคืน
- การเงินเก็บเงินผู้ป่วยไม่ครบ เพราะยอดไปอยู่ที่ช่องเครดิต

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-915-001 - สั่งยานอกบัญชีเหตุผล F แล้วเครดิตเป็น 0 และจ่ายเท่าราคารวม (หน้าสั่งยา CPOE)
Priority: Urgent · Type: Functional
```
Test Step
1. เตรียมคนไข้ 1 ที่มี Visit OPD สิทธิ H03 UC ลำดับ 1
2. Login ระบบด้วย user แพทย์ > เปิดหน้าสั่งยา (CPOE) ของคนไข้
3. สั่งยา GPO-L-ONE (deferiprone 500 mg) film-coated tablet จำนวน 7 เม็ด
4. ช่อง "* เหตุผล" เลือก "F - ผู้ป่วยแสดงความจำนงต้องการ ..." > เพิ่มลงรายการ
5. ดูแถวยา GPO-L-ONE ในตารางรายการสั่งยา

Expected Result
แถวยา GPO-L-ONE: บัญชียา Non-ED · หมายเหตุแสดงเหตุผล F · รวม 33.25 · เครดิต 0.00 · จ่าย 33.25
```

### TC-SBH-915-002 - ยอดรวมท้ายตารางไม่นับเครดิตของยาเหตุผล F (หน้าสั่งยา CPOE)
Priority: High · Type: Functional
```
Test Step
1. ใช้รายการสั่งยาของคนไข้ 1 ต่อจาก `TC-SBH-915-001` (มี GPO-L-ONE เหตุผล F 7 เม็ด)
2. สั่งยา LINCOMYCIN จำนวน 1 vial เพิ่มอีก 1 รายการ
3. ดูแถว "ราคาประมาณการรวม" ท้ายตาราง

Expected Result
ราคาประมาณการรวม: รวม 36.75 · เครดิต 3.50 (เฉพาะ LINCOMYCIN) · จ่าย 33.25 (เฉพาะ GPO-L-ONE)
```

### TC-SBH-915-003 - เอกสาร Co-pay มีรายการยาเหตุผล F ยอดเท่าราคารวม (หน้าสั่งยา CPOE)
Priority: High · Type: Functional
```
Test Step
1. ใช้รายการสั่งยาของคนไข้ 1 ต่อจาก `TC-SBH-915-002`
2. กดปุ่ม "พิมพ์ Co-pay"
3. ดูรายการในเอกสาร Co-pay

Expected Result
มีปุ่ม "พิมพ์ Co-pay" · เอกสาร Co-pay มีรายการ GPO-L-ONE ยอดที่ผู้ป่วยต้องชำระ 33.25 · ไม่มีรายการ LINCOMYCIN (เบิกได้เต็ม)
```

### TC-SBH-915-004 - สร้างใบยาแล้วยาเหตุผล F เครดิตเป็น 0 (หน้าสร้างใบยา ห้องยา)
Priority: Urgent · Type: Functional
```
Test Step
1. คนไข้ 1: แพทย์กด "ส่งคำสั่ง" รายการสั่งยาจาก `TC-SBH-915-002`
2. Login ระบบด้วย user เภสัช > การจัดการรายการสั่งยา OPD > แท็บ Order รอยืนยัน > คลิกชื่อคนไข้
3. ดูช่อง เครดิต / เบิกไม่ได้ ของแถว GPO-L-ONE > กดปุ่ม "สร้างใบยา"

Expected Result
แถว GPO-L-ONE: ราคารวม 33.25 · เครดิต 0 · เบิกไม่ได้ 33.25 · สร้างใบยาสำเร็จ
```

### TC-SBH-915-005 - Cashier ได้รับยาเหตุผล F ด้วยยอดเครดิต 0 (หน้าการเงิน)
Priority: Urgent · Type: Functional
```
Test Step
1. ใช้คนไข้ 1 ที่สร้างใบยาแล้วจาก `TC-SBH-915-004`
2. Login ระบบด้วย user การเงิน > เปิด Visit ของคนไข้ในหน้าการเงิน
3. ดูรายการค่าใช้จ่ายของยา GPO-L-ONE

Expected Result
ยา GPO-L-ONE: เครดิต 0.00 · ยอดที่ผู้ป่วยต้องชำระ 33.25 (ไม่ใช่เครดิต 33.25)
```

### TC-SBH-915-006 - ยาเหตุผล F ไม่เข้ายอดเบิก e-Claim (หน้า E-Claim OPD)
Priority: Urgent · Type: Functional
```
Test Step
1. คนไข้ 1 ต่อจาก `TC-SBH-915-005`: การเงินรับชำระส่วนที่ผู้ป่วยต้องจ่าย > เภสัชจ่ายยา > การเงินปิด Visit
2. Login ระบบด้วย user เจ้าหน้าที่ Claim > Claims panel > เปิดรายละเอียด E-Claim OPD ของ Visit
3. ดูยอดเบิกของยา GPO-L-ONE

Expected Result
ยา GPO-L-ONE ไม่ถูกนับเข้ายอดเบิก e-Claim · ยอดเบิกของยามีเฉพาะ LINCOMYCIN 3.50
```

---

## TS-SBH-915-EDG - แก้เหตุผลหรือจำนวนหลังสั่งยา ระบบคำนวณเครดิตใหม่

Labels: requirement labels + QA Module + QA Sub-module + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-915-EDG
- Case Type: Edge
- Suffix: EDG
- Module: Pharmacy / Prescription
- Requirement ที่อ้างอิง: SBH-915

วัตถุประสงค์
- ยืนยันว่าเมื่อแพทย์เปลี่ยนเหตุผลการใช้ยานอกบัญชี (A–E ↔ F) หรือแก้จำนวนยาเหตุผล F ระบบคำนวณเครดิต / จ่าย ใหม่ทันที

ขอบเขต Requirement
- AC-03 · AC-04
- Scope: การคำนวณใหม่เมื่อผู้ใช้แก้เหตุผล หรือแก้จำนวน
- Business Rule: เหตุผล A–E คงคำนวณตามสิทธิเดิม

ความเสี่ยง
- ค่าเครดิตค้างจากเหตุผลเดิม ทำให้ส่งเบิกผิดหรือเก็บเงินผู้ป่วยผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- เทคนิค: State Transition (B → F → E → F) · Equivalence Partitioning — A–E ทำงานแบบเดียวกัน เลือกตัวแทน B (ค่าตั้งต้นของฟอร์ม) และ E
```

### TC-SBH-915-007 - เปลี่ยนเหตุผลจาก B เป็น F แล้วเครดิตเปลี่ยนเป็น 0 (หน้าสั่งยา CPOE)
Priority: High · Type: Functional
```
Test Step
1. เตรียมคนไข้ 2 ที่มี Visit OPD สิทธิ H03 UC ลำดับ 1
2. Login ระบบด้วย user แพทย์ > หน้าสั่งยา (CPOE) > สั่งยา GPO-L-ONE จำนวน 7 เม็ด เหตุผล B > เพิ่มลงรายการ
3. จดค่า เครดิต / จ่าย ของแถว (ควรเป็น 33.25 / 0.00)
4. กดไอคอนแก้ไข ✏ ที่แถว GPO-L-ONE > เปลี่ยน "* เหตุผล" เป็น F > บันทึก

Expected Result
แถว GPO-L-ONE: เครดิต 0.00 · จ่าย 33.25 · ราคาประมาณการรวม เครดิต 0.00 · จ่าย 33.25
```

### TC-SBH-915-008 - เปลี่ยนเหตุผลจาก F เป็น E แล้วเครดิตกลับมาคำนวณตามสิทธิ (หน้าสั่งยา CPOE)
Priority: High · Type: Functional
```
Test Step
1. ใช้แถว GPO-L-ONE เหตุผล F ของคนไข้ 2 ต่อจาก `TC-SBH-915-007`
2. กดไอคอนแก้ไข ✏ ที่แถว > เปลี่ยน "* เหตุผล" เป็น E > บันทึก

Expected Result
แถว GPO-L-ONE: เครดิต 33.25 · จ่าย 0.00 · ราคาประมาณการรวม เครดิต 33.25 · จ่าย 0.00
```

### TC-SBH-915-009 - แก้จำนวนยาเหตุผล F แล้วเครดิตยังเป็น 0 และจ่ายตามราคาใหม่ (หน้าสั่งยา CPOE)
Priority: Medium · Type: Functional
```
Test Step
1. ใช้แถว GPO-L-ONE ของคนไข้ 2 ต่อจาก `TC-SBH-915-008` > แก้ไข ✏ เปลี่ยน "* เหตุผล" กลับเป็น F > บันทึก
2. แก้จำนวนจาก 7 เป็น 10 เม็ด

Expected Result
แถว GPO-L-ONE: รวม 47.50 · เครดิต 0.00 · จ่าย 47.50 · ราคาประมาณการรวม ตรงกับแถว
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- AC ในการ์ดมีแค่หัวข้อ ไม่มีค่า Expected — TC ใช้ค่าจาก Business Rule + รูปในการ์ด + การ์ด E2E CTXN-9605 / 9609 / 9610
- AC-06: ในแฟ้ม e-Claim ยา F ต้อง "ไม่มีรายการเลย" หรือ "มีรายการแต่ยอดเบิก 0" — การ์ดไม่ระบุ (TMH-5178 บอกว่ายา F คงสิทธิไว้ เครดิต 0 · ในแฟ้ม SSOP ใช้ claimcont = NR) → TC-006 ตรวจแค่ว่าไม่เข้ายอดเบิก
- หน้าการเงินต้องแสดงยา F ใต้สิทธิ UC (คงสิทธิไว้) หรือไม่ — การ์ดนี้ไม่ระบุ มีแค่ใน TMH-5178 จึงไม่ตรวจใน TC-005
- คอมเมนต์: กันไม่ให้ Cashier กดใช้วงเงินกับยา F กรณีสิทธิ พรบ. — เขียนว่า "อาจต้องเพิ่ม" ยังไม่ใช่ข้อสรุป จึงไม่สร้าง TC

Validation
- Business Rule "ยา Non-ED ต้องระบุเหตุผล A–F ก่อนบันทึก" — เป็นพฤติกรรมเดิมที่การ์ดนี้ไม่ได้แก้ (ฟอร์มเติม B ให้อัตโนมัติ) จึงไม่สร้าง TC

Error handling
- -

Permission / role
- ห้องยาแก้เหตุผลของยาได้หรือไม่ — การ์ดไม่ระบุ (TC-007–009 แก้ที่หน้าสั่งยาของแพทย์)

Edge cases
- เปลี่ยนเหตุผลเป็น F หลังสร้างใบยาแล้ว (ย้อนกลับใบยา) — การ์ดไม่ระบุว่า charge item ต้องคำนวณใหม่หรือไม่
- ยา Non-ED ที่สิทธิเบิกไม่ได้อยู่แล้ว (ไม่มีเพดาน) เครดิตเป็น 0 ทั้ง A–E และ F จึงไม่ใช้เป็นข้อมูลทดสอบ

---

## ค่าที่ผู้ใช้ยืนยัน (2026-10-22)

1. Run Type: **RT** (การ์ดบั๊กกลับมาเทสหลังแก้ แม้การ์ดผูก Cycle อยู่)
2. QA Module / Sub-module: **Pharmacy / Prescription**
3. TC-002 เพิ่มยา LINCOMYCIN 1 vial — ใช้ตามร่าง
4. TC-004 (ห้องยา) — เก็บไว้
