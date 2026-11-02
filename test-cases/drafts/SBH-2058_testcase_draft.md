# Draft Test Structure — SBH-2058

> สถานะ: **สร้างใน Linear แล้ว (2026-10-31)** — ผู้ใช้พิมพ์ "สร้างได้"
> - EXE SBH-3553 (EXE - CT - 2.9.1) → HPY SBH-3556 (TC 001–043 = SBH-3560–3602) · UHP SBH-3558 (TC 044–046 = SBH-3603–3605) — เลข TC เรียงต่อเนื่อง TC-001 = SBH-3560 … TC-046 = SBH-3605
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee Suchat ทุกใบ · milestone ER - เก็บตก, edge case · TC ใช้ label `QA : Manual` · connector เป็นบัญชี Suchat (สร้างโดย = Suchat)
> - สร้าง label ใหม่ `QA Sub-module / Feature : Trauma Exam Form` (id 3e544e59) · หมายเหตุของ Scenario ใน Linear มีรายการผู้ป่วยตั้งต้น A–G · ตัดคำว่า "(ดู gap)" ออกจาก TC ใน Linear · `<ชื่อแพทย์>` เขียนเป็น `(ชื่อแพทย์)` ใน TC-014 / 040
> - ชุดนี้ = EXE 1 + Scenario 2 (HPY / UHP) + TC 46 = 49 ใบ
> - 31 ต.ค. 2569 ผู้ใช้สั่งเพิ่ม: AC 2.3.1 (= รับทราบแล้ว MEWS Score หายจากการ์ดผู้ป่วยบน Dashboard) TC-012 · ช่องสีเทาใน Primary Survey TC-017 / 019 / 020 / 022 / 023 / 024 / 027 · Compression เลือก Negative TC-036 → เลข TC เดิมเรียงใหม่
> - ยึด AC 6 ข้อ + รูปอ้างอิงในการ์ด (GCS/MEWS · RTS · Primary Survey · Body Chart · Compression Test · PE by System) · ไม่มี Sub-Issue สเปก (มีแค่ CTXN-8890 Design Task) · คอมเมนต์: ไม่มี
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - **ค่าที่ผู้ใช้ยืนยันแล้ว (31 ต.ค. 2569 "ใช้ค่าที่แนะนำ")**: Run Type CT · Version 2.9.1 · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Trauma Exam Form (**label ใหม่ — สร้างตอนสร้างการ์ด**) · หยุดเวลา / รับทราบ = แพทย์เริ่มพิมพ์ (ตามแอป)
> - ชื่อส่วน / ปุ่ม / ข้อความ อ้างจากรูปในการ์ด ยังไม่ได้เทียบกับแอปจริง
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — assignee ต้องใส่ ID ของ Suchat (`ac7ed47a-b74d-4a54-992f-5d09acad47f2`)

Requirement: SBH-2058 — [ER] [Form Exam] Trauma Exam Form
URL: https://linear.app/cortexcloud/issue/SBH-2058/er-form-exam-trauma-exam-form
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: Low · State: In Review
Labels: 🍄 New Feature · Natthaphat ( MOD ) 🙈 · VERSION 2.9.1 · Assignee: jetsadaporn (Dew) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Settapat (Ohm)
Relations: related SBH-1678 (Triage Trauma Form) · SBH-2951 · SBH-2968 · SBH-3182 · SBH-3350
PR: openehr-repo #384 · cortex-testing #1530 · cortex-ui #2481 · cortex-api #2871 (ทุกตัวขึ้นต้น [V2.10.0])
Scope / Version = 2.9.1 (label VERSION 2.9.1 ของการ์ด — PR เขียน V2.10.0 · ผู้ใช้ยืนยันใช้ 2.9.1)

## AC → TC

| AC | เรื่อง | TC |
|---|---|---|
| BR + 1 | ผู้ป่วย Trauma จากการคัดกรอง → แพทย์ใช้ Trauma Exam Form | 001 |
| 2.1 | ตัด Acknowledge ออกจากฟอร์ม Trauma | 011 |
| 2.2 | GCS แบบใหม่ | 008 |
| 2.3 | MEWS แบบใหม่ (ตามฟอร์มคัดกรอง) | 009 |
| 2.3.1 | รับทราบแล้ว → MEWS Score หายไปจากการ์ดผู้ป่วยบน Dashboard (ผู้ใช้อธิบาย 31 ต.ค. 2569) | 012 |
| 2.4 | GCS ขึ้นก่อน MEWS | 010 |
| 2.5 | Suspect Fast Track แบบใหม่ตาม Triage | 013 |
| 3.1–3.8 | ลำดับ CC → Present illness → U/D → Vital sign → RTS → Primary Survey → PE → Body Chart | 004 |
| 3.3 · 3.4 | U/D และ Vital sign เติมจากการคัดกรอง | 006 · 007 |
| 3.5 | RTS จาก GCS / SBP / RR | 015 · 044 · 045 |
| 3.6 | Primary Survey ตามรูป (A–E) | 016 · 018 · 021 · 025 · 026 |
| 3.6 | ช่องสีเทาในรูป Primary Survey กรอกได้เมื่อเลือกตัวเลือกนั้น (ผู้ใช้สั่งเพิ่ม) | 017 · 019 · 020 · 022 · 023 · 024 · 027 |
| 3.7.1 | System ใต้ PE ตามรูป (System เป็น Free Text) | 028 · 029 · 030 · 031 · 032 · 033 |
| 3.7.2 | เพิ่ม Compression test | 034 · 035 · 036 |
| 3.8 | Body Chart ตามรูป | 037 |
| 3.9 | ตัด section Order to Nurse ในฟอร์ม Trauma | 005 |
| 4 | เอา Acknowledge ออกจากทุกที่ ยกเว้น Fast Track | 014 · 039 · 040 |
| 5 | Order to Nurse เอาช่อง Order ออก (ER Physician Note) | 041 |
| 6.1.1 | กด Patient Card → ค่าเริ่มต้น ER Physician Exam · Trauma → ER Trauma Form | 001 · 002 |
| 6.1.2 | แสดงหน้าคัดกรองของพยาบาลแบบ Read Only | 003 |
| 6.1.3 | เวลาหยุดนับเมื่อแพทย์ ER เริ่มทำงานกับผู้ป่วย | 042 · 043 · 046 |
| (นอก AC — ความเสี่ยงสูง) | บันทึกฟอร์ม Trauma แล้วข้อมูลยังอยู่ | 038 |

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | เปิด ER Trauma Exam Form เมื่อแพทย์ ER กด Patient Card ของผู้ป่วยประเภท Trauma | แผงขวาแสดงฟอร์ม Trauma Exam Form (มี RTS · Primary Survey · Compression Test · Body Chart) |
| 002 | HPY | เปิด ER Physician Note เมื่อแพทย์ ER กด Patient Card ของผู้ป่วยประเภท Non-Trauma | แผงขวาแสดง ER Physician Note แบบเดิม · ไม่มี RTS / Primary Survey / Body Chart |
| 003 | HPY | แสดงฟอร์มคัดกรองของพยาบาลแบบอ่านอย่างเดียวเมื่อแพทย์ ER เปิดผู้ป่วย | แผงซ้ายแสดงคัดกรอง ER ค่าตรงกับที่พยาบาลบันทึก · แพทย์แก้ไขค่าไม่ได้ |
| 004 | HPY | ตรวจสอบลำดับส่วนของ Trauma Exam Form | CC → Present Illness → Underlying Disease → Vital Signs → RTS → Primary Survey → Physical Examination → Body Chart |
| 005 | HPY | ตรวจสอบ Trauma Exam Form ไม่มีส่วน Order to Nurse | ไม่มีส่วน Order to Nurse ในฟอร์ม |
| 006 | HPY | ตรวจสอบ Underlying Disease เติมจากการคัดกรองใน Trauma Exam Form | แสดงโรคประจำตัวตรงกับที่พยาบาลบันทึกตอนคัดกรอง |
| 007 | HPY | ตรวจสอบ Vital Signs เติมจากการคัดกรองใน Trauma Exam Form | BP · PR · RR · Temperature · SpO2 ตรงกับชุดที่พยาบาลบันทึกตอนคัดกรอง |
| 008 | HPY | ตรวจสอบส่วน GCS แสดงรูปแบบใหม่ใน Trauma Exam Form | Eye / Verbal / Motor เป็นช่องเลือกมี * · สรุป "E4 V5 M5 14 / 15 ระดับเล็กน้อย" |
| 009 | HPY | ตรวจสอบส่วน MEWS แสดงรูปแบบใหม่ตามฟอร์มคัดกรองใน Trauma Exam Form | AVPU เป็นปุ่ม GCS (V) / A (0) / V (1) / P (2) / U (3) · ตาราง SBP / PR / RR / Temperature / AVPU พร้อมคะแนน · Total MEWS 1 / 14 Low Risk |
| 010 | HPY | ตรวจสอบส่วน GCS อยู่ก่อนส่วน MEWS ใน Trauma Exam Form | GCS อยู่เหนือ MEWS |
| 011 | HPY | ตรวจสอบ Trauma Exam Form ไม่มีปุ่ม Acknowledge ที่ GCS และ MEWS | ไม่มีปุ่ม Acknowledge / Reject ที่ GCS และ MEWS |
| 012 | HPY | ตรวจสอบ MEWS Score หายจากการ์ดผู้ป่วยบน ER Dashboard หลังแพทย์รับทราบ | ก่อนรับทราบการ์ดแสดง MEWS Score · หลังรับทราบ MEWS Score ไม่แสดงบนการ์ด |
| 013 | HPY | ตรวจสอบส่วน Suspect Fast Track แสดงรูปแบบใหม่ตามฟอร์มคัดกรอง | ตัวเลือก 5 ค่า เหมือนฟอร์มคัดกรอง: Not Suspect · Stroke · STEMI / ACS · Sepsis · Trauma Fast Track |
| 014 | HPY | ตรวจสอบปุ่ม Acknowledge ของ Suspect Fast Track ยังใช้ได้ใน Trauma Exam Form | มีปุ่ม Acknowledge · กดแล้วแสดง "Acknowledged โดย <แพทย์> <วันเวลา>" |
| 015 | HPY | คำนวณคะแนน RTS จาก GCS, SBP และ RR ใน Trauma Exam Form | GCS 15 · SBP 120 · RR 20 · "Revised Trauma Score - 8 Points" สีเขียว |
| 016 | HPY | ตรวจสอบหัวข้อ A ของ Primary Survey | ทางเดินหายใจ · ETT No. · ความลึก (cm) · C-spine พร้อมตัวเลือกตามรูป |
| 017 | HPY | ระบุทางเดินหายใจอื่นๆ ใน Primary Survey หัวข้อ A | ก่อนเลือก อื่นๆ ช่องระบุเป็นสีเทา · เลือกแล้วกรอกได้และแสดงตามที่พิมพ์ |
| 018 | HPY | ตรวจสอบหัวข้อ B ของ Primary Survey | การหายใจ · Trachea · Subcutaneous emphysema · Breath Sound · Open pneumothorax at พร้อมตัวเลือกตามรูป |
| 019 | HPY | ระบุข้าง Trachea Deviate to ใน Primary Survey หัวข้อ B | ก่อนเลือก Deviate to Rt. / Lt. เป็นสีเทา · เลือกแล้วติ๊ก Rt. ได้ |
| 020 | HPY | ระบุรายละเอียด Breath Sound Abnormal ใน Primary Survey หัวข้อ B | ก่อนเลือก Abnormal ช่อง Rt / Lt เป็นสีเทา · เลือกแล้วกรอกได้ทั้ง 2 ช่อง |
| 021 | HPY | ตรวจสอบหัวข้อ C ของ Primary Survey | Pulse at ER · Active bleeding · Capillary refill · Pelvic hematoma at · E-FAST พร้อมตัวเลือกตามรูป |
| 022 | HPY | ระบุขนาด E-FAST Positive ใน Primary Survey หัวข้อ C | ก่อนเลือก Positive ช่องระบุขนาดเป็นสีเทา · เลือกแล้วกรอกได้ แสดง 2 cm. |
| 023 | HPY | ระบุข้าง Hemothorax ของ E-FAST ใน Primary Survey หัวข้อ C | ก่อนเลือก Hemothorax Rt. / Lt. เป็นสีเทา · เลือกแล้วติ๊ก Lt. ได้ |
| 024 | HPY | ระบุข้าง Pneumothorax ของ E-FAST ใน Primary Survey หัวข้อ C | ก่อนเลือก Pneumothorax Rt. / Lt. เป็นสีเทา · เลือกแล้วติ๊ก Rt. ได้ |
| 025 | HPY | ตรวจสอบหัวข้อ D ของ Primary Survey | รูม่านตาซ้าย / ขวา (mm + RTL / Sluggish / Fixed) · DTX (mg/dL) |
| 026 | HPY | ตรวจสอบหัวข้อ E และหมายเหตุของ Primary Survey | Log Roll · PR (Sphincter tone / Content / Bulbocavernosus reflex) · ช่องหมายเหตุ |
| 027 | HPY | ระบุรายละเอียด Log Roll Abnormal ใน Primary Survey หัวข้อ E | ก่อนเลือก Abnormal ช่องระบุเป็นสีเทา · เลือกแล้วกรอกได้และแสดงตามที่พิมพ์ |
| 028 | HPY | ตรวจสอบรายการ System เริ่มต้นใต้ Physical Examination | HEENT · Lung · Abdomen · Perineum · Back · Neuro · Extremities แต่ละแถวมี ปกติ / ไม่ปกติ · ช่องรายละเอียด · ลบ |
| 029 | HPY | ระบุชื่อ System ใต้ Physical Examination เป็นข้อความอิสระ | พิมพ์ชื่อ System ที่ไม่มีในรายการได้ และแสดงตามที่พิมพ์ |
| 030 | HPY | เพิ่มรายการ System ใต้ Physical Examination | มีแถว System ใหม่เพิ่ม 1 แถว |
| 031 | HPY | ลบรายการ System ใต้ Physical Examination | แถวที่กดลบหายไป แถวอื่นยังอยู่ |
| 032 | HPY | เลือกปกติทั้งหมดใน Physical Examination | ทุกแถวถูกเลือก ปกติ |
| 033 | HPY | เลือกไม่ปกติทั้งหมดใน Physical Examination | ทุกแถวถูกเลือก ไม่ปกติ |
| 034 | HPY | ตรวจสอบส่วน Compression Test ใน Trauma Exam Form | Chest / Pelvic compression test มี Negative · Positive · Rt. Lt. เลือกไม่ได้ก่อนเลือก Positive |
| 035 | HPY | เลือก Positive ใน Compression Test แล้วระบุข้าง Rt. และ Lt. | Rt. / Lt. เลือกได้ · ติ๊กแล้วแสดงถูกเลือกทั้งคู่ |
| 036 | HPY | เลือก Negative ใน Compression Test แล้วระบุข้าง Rt. และ Lt. ไม่ได้ | Negative ถูกเลือกทั้ง 2 แถว · Rt. / Lt. ยังเป็นสีเทา ติ๊กไม่ได้ |
| 037 | HPY | ตรวจสอบส่วน Body Chart แสดงภาพร่างกายตามแบบ | ภาพ Front / Back view · Head 6 มุม · Hands · Feet ตามรูปในการ์ด |
| 038 | HPY | บันทึก Trauma Exam Form แล้วเปิดใหม่ข้อมูลที่กรอกยังอยู่ | Primary Survey · PE · Compression Test ยังเป็นค่าที่กรอกไว้ |
| 039 | HPY | ตรวจสอบ ER Physician Note ไม่มีปุ่ม Acknowledge ที่ GCS และ MEWS | ไม่มีปุ่ม Acknowledge / Reject ที่ GCS และ MEWS |
| 040 | HPY | ตรวจสอบปุ่ม Acknowledge ของ Suspect Fast Track ยังใช้ได้ใน ER Physician Note | มีปุ่ม Acknowledge · กดแล้วแสดง "Acknowledged โดย <แพทย์> <วันเวลา>" |
| 041 | HPY | ตรวจสอบส่วน Order to Nurse ใน ER Physician Note ไม่มีช่อง Order | ไม่มีช่อง Order (กรอกคำสั่งถึงพยาบาล) |
| 042 | HPY | ตรวจสอบเวลารอบน ER Dashboard หยุดนับเมื่อแพทย์ ER เริ่มทำงานกับผู้ป่วย Trauma | เวลารอบนการ์ดหยุดที่ค่าตอนแพทย์เริ่ม ไม่เพิ่มขึ้น |
| 043 | HPY | ตรวจสอบเวลารอบน ER Dashboard หยุดนับเมื่อแพทย์ ER เริ่มทำงานกับผู้ป่วย Non-Trauma | เวลารอบนการ์ดหยุดที่ค่าตอนแพทย์เริ่ม ไม่เพิ่มขึ้น |
| 044 | UHP | แสดง RTS เป็น Incomplete เมื่อไม่มี GCS, SBP และ RR | GCS / Systolic BP / RR แสดง "-" · "Incomplete - GCS, SBP, RR" |
| 045 | UHP | แสดง RTS เป็น Incomplete พร้อมเฉพาะรายการที่ขาดเมื่อมีแค่ GCS | GCS 15 · SBP / RR "-" · "Incomplete - SBP, RR" |
| 046 | UHP | ตรวจสอบเวลารอไม่หยุดนับเมื่อพยาบาล ER เปิดและกรอกข้อมูลผู้ป่วย | เวลารอบนการ์ดยังเพิ่มขึ้นต่อเนื่อง |

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user แพทย์ ER** (role Doctor) · **user พยาบาล ER** (role Nurse)
- **ผู้ป่วย A (Trauma)** — ใช้กับ 001, 003–011, 013–038: พยาบาลคัดกรอง ประเภทฉุกเฉิน = Trauma · Suspect Fast Track = Trauma Fast Track ·
  Vital signs BP 120/80 · PR 80 · RR 20 · Temperature 37 · SpO2 98 · GCS E4 V5 M6 · Underlying Disease 1 รายการ · ระดับ 2 + โซน · บันทึก
- **ผู้ป่วย B (Non-Trauma)** — ใช้กับ 002, 039, 040, 041: คัดกรอง ประเภทฉุกเฉิน = Non-Trauma · Suspect Fast Track = Stroke Fast Track · Vital signs + GCS ครบ · บันทึก
- **ผู้ป่วย C (Trauma ไม่มี Vital signs / GCS)** — ใช้กับ 044, 045: คัดกรอง Trauma โดยไม่กรอก Vital signs และไม่เลือก GCS (ถ้าคัดกรองบันทึกไม่ได้ ดู gap)
- **ผู้ป่วย D (Trauma ใหม่)** — ใช้กับ 042 · **ผู้ป่วย E (Non-Trauma ใหม่)** — ใช้กับ 043 · **ผู้ป่วย F (Trauma ใหม่)** — ใช้กับ 046:
  คัดกรองแล้ว แพทย์ยังไม่เคยเปิด / เวลารอบนการ์ดยังนับอยู่
- **ผู้ป่วย G (Trauma ใหม่ มี MEWS Score)** — ใช้กับ 012: คัดกรอง Trauma พร้อม Vital signs ครบ (เช่น RR 20 → MEWS 1) · แพทย์ยังไม่เคยเปิด · การ์ดบน ER Dashboard แสดง MEWS Score

---

## EXE - CT - 2.9.1

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: 🍄 New Feature, Natthaphat ( MOD ) 🙈, VERSION 2.9.1, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Trauma Exam Form, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.1
- Module: ER — ER Physician Note / Trauma Exam Form
- Requirement ที่อ้างอิง: SBH-2058 — [ER] [Form Exam] Trauma Exam Form
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- การเลือกฟอร์มเมื่อแพทย์กด Patient Card: Trauma → Trauma Exam Form · Non-Trauma → ER Physician Note
- ฟอร์มคัดกรองของพยาบาลแสดงแบบอ่านอย่างเดียว
- Trauma Exam Form: ลำดับส่วน · ข้อมูลเติมจากการคัดกรอง · GCS / MEWS / Suspect Fast Track แบบใหม่ · RTS · Primary Survey · Physical Examination by System · Compression Test · Body Chart · บันทึก
- Acknowledge เหลือเฉพาะ Suspect Fast Track · ช่อง Order ใน Order to Nurse ถูกเอาออก
- เวลารอบน ER Dashboard หยุดนับเมื่อแพทย์ ER เริ่มทำงานกับผู้ป่วย

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2058-HPY - แพทย์ ER ประเมินผู้ป่วยด้วย Trauma Exam Form และ ER Physician Note รูปแบบใหม่

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Trauma Exam Form + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2058-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER — ER Physician Note / Trauma Exam Form
- Requirement ที่อ้างอิง: SBH-2058 — [ER] [Form Exam] Trauma Exam Form

วัตถุประสงค์
- ยืนยันว่าแพทย์ ER ได้ฟอร์มตามประเภทผู้ป่วย เห็นคัดกรองแบบอ่านอย่างเดียว ใช้ Trauma Exam Form ได้ครบทุกส่วนและบันทึกได้ และเวลารอหยุดนับเมื่อแพทย์เริ่มทำงาน

ขอบเขต Requirement
- AC 1 สร้าง Trauma Exam Form
- AC 2 ลอก ER Note มาปรับ (Acknowledge · GCS · MEWS · ลำดับ · Suspect Fast Track)
- AC 3 ลำดับส่วนและเนื้อหา (U/D · Vital sign · RTS · Primary Survey · PE · Compression · Body Chart · ตัด Order to Nurse)
- AC 4 Acknowledge เหลือเฉพาะ Fast Track · AC 5 เอาช่อง Order ออก
- AC 6 Logic เลือกฟอร์ม · คัดกรองแบบ Read Only · Time Count

ความเสี่ยง
- ผู้ป่วย Trauma เปิดได้ฟอร์มทั่วไป → แพทย์ไม่ได้ประเมิน Primary Survey / RTS
- ข้อมูลจากคัดกรองไม่เติม → แพทย์กรอกซ้ำหรือใช้ค่าผิดชุด
- RTS คำนวณผิด → ประเมินความรุนแรงผิด
- เวลารอไม่หยุด → Door-to-doc / ลำดับบนบอร์ดผิด
- บันทึกแล้วข้อมูลหาย → เวชระเบียนไม่ครบ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ระบุในแต่ละ TC (ดูหัวข้อข้อมูลตั้งต้น)
```

### TC-SBH-2058-001 - เปิด ER Trauma Exam Form เมื่อแพทย์ ER กด Patient Card ของผู้ป่วยประเภท Trauma

Status: Not Run · Priority: Urgent · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Trauma Exam Form + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2058-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER
2. ไปที่ ER Dashboard
3. กด Patient Card ของผู้ป่วย A (คัดกรองเป็น Trauma)

## Expected Result
แผงขวา (Clinical Information) แสดงฟอร์ม Trauma Exam Form
มีส่วน Revised Trauma Score (RTS) · Primary Survey · Compression Test · Body Chart

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 · AC 6.1.1.1 — Business Rule ระบุ Trauma = อุบัติเหตุ / อุบัติเหตุจราจร แต่ฟอร์มคัดกรองมีแค่ Non-Trauma / Trauma (ดู gap)
```

### TC-SBH-2058-002 - เปิด ER Physician Note เมื่อแพทย์ ER กด Patient Card ของผู้ป่วยประเภท Non-Trauma

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-002
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard
2. กด Patient Card ของผู้ป่วย B (คัดกรองเป็น Non-Trauma)

## Expected Result
แผงขวาแสดง ER Physician Note (ER Physician Exam) แบบเดิม
ไม่มีส่วน RTS · Primary Survey · Compression Test · Body Chart

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.1.1 — ค่าเริ่มต้น = หน้า ER Physician Exam
```

### TC-SBH-2058-003 - แสดงฟอร์มคัดกรองของพยาบาลแบบอ่านอย่างเดียวเมื่อแพทย์ ER เปิดผู้ป่วย

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ดูแผงคัดกรอง ER ฝั่งซ้าย
3. ลองแก้ค่าในฟอร์มคัดกรอง (เช่น ระดับความเร่งด่วน · Vital signs)

## Expected Result
แผงซ้ายแสดงคัดกรอง ER ที่พยาบาลบันทึก ค่าตรงกับที่พยาบาลกรอก
แพทย์แก้ไขค่าในฟอร์มคัดกรองไม่ได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.1.2
```

### TC-SBH-2058-004 - ตรวจสอบลำดับส่วนของ Trauma Exam Form

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001 แต่ QA Type : UIUX

```
TC ID: TC-SBH-2058-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. เลื่อนดู Trauma Exam Form จากบนลงล่าง

## Expected Result
ส่วนเรียงตามลำดับ: Chief Complaint → Present Illness → Underlying Disease → Vital Signs → Revised Trauma Score (RTS) → Primary Survey → Physical Examination → Body Chart

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.1–3.8 — การ์ดไม่ได้บอกตำแหน่งของ GCS / MEWS / Suspect Fast Track / Diagnosis ในลำดับนี้ (ดู gap)
```

### TC-SBH-2058-005 - ตรวจสอบ Trauma Exam Form ไม่มีส่วน Order to Nurse

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. เลื่อนดู Trauma Exam Form ทั้งฟอร์ม

## Expected Result
ไม่มีส่วน Order to Nurse ในฟอร์ม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.9
```

### TC-SBH-2058-006 - ตรวจสอบ Underlying Disease เติมจากการคัดกรองใน Trauma Exam Form

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ดูส่วน Underlying Disease ใน Trauma Exam Form

## Expected Result
แสดงโรคประจำตัวตรงกับที่พยาบาลบันทึกตอนคัดกรอง โดยแพทย์ไม่ต้องกรอกเอง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.3 Prefilled → U/D
```

### TC-SBH-2058-007 - ตรวจสอบ Vital Signs เติมจากการคัดกรองใน Trauma Exam Form

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ดูส่วน Vital Signs ใน Trauma Exam Form

## Expected Result
BP 120/80 · PR 80 · RR 20 · Temperature 37 · SpO2 98 ตรงกับชุดที่พยาบาลบันทึกตอนคัดกรอง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.4 Prefilled → Vital sign
```

### TC-SBH-2058-008 - ตรวจสอบส่วน GCS แสดงรูปแบบใหม่ใน Trauma Exam Form

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-008
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ส่วน Glasgow Coma Scale (GCS) เลือก Eye Opening 4 · Verbal Response 5 · Motor Response 5

## Expected Result
Eye Opening (E) · Verbal Response (V) · Motor Response (M) เป็นช่องเลือก มีเครื่องหมาย *
แถบสรุปแสดง "E4 V5 M5 14 / 15 ระดับเล็กน้อย" (ตามรูปในการ์ด)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.2
```

### TC-SBH-2058-009 - ตรวจสอบส่วน MEWS แสดงรูปแบบใหม่ตามฟอร์มคัดกรองใน Trauma Exam Form

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-009
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ดูส่วน Modified Early Warning Score (MEWS)

## Expected Result
Level of Consciousness (AVPU) เป็นปุ่ม GCS (V) · A (0) · V (1) · P (2) · U (3)
ตารางแสดง Systolic BP · PR · RR · Temperature · AVPU พร้อมช่วงค่าและคะแนน
แถบสรุป "Total MEWS 1 / 14 Low Risk" (SBP 120 = 0 · PR 80 = 0 · RR 20 = 1 · Temp 37 = 0 · A = 0)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.3 — "MEWS ใหม่ จาก Triage Form" · คะแนนตามรูปในการ์ด
```

### TC-SBH-2058-010 - ตรวจสอบส่วน GCS อยู่ก่อนส่วน MEWS ใน Trauma Exam Form

Status: Not Run · Priority: Low · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-010
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ดูตำแหน่งส่วน GCS และ MEWS

## Expected Result
ส่วน Glasgow Coma Scale (GCS) อยู่เหนือส่วน Modified Early Warning Score (MEWS)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.4
```

### TC-SBH-2058-011 - ตรวจสอบ Trauma Exam Form ไม่มีปุ่ม Acknowledge ที่ GCS และ MEWS

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-011
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ดูส่วน GCS และ MEWS

## Expected Result
ไม่มีปุ่ม Acknowledge / Reject และไม่มีข้อความ "Acknowledged โดย …" ที่ส่วน GCS และ MEWS

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.1
```

### TC-SBH-2058-012 - ตรวจสอบ MEWS Score หายจากการ์ดผู้ป่วยบน ER Dashboard หลังแพทย์รับทราบ

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-012
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard
2. ดูการ์ดผู้ป่วย G ว่าแสดง MEWS Score
3. กด Patient Card ของผู้ป่วย G แล้วรับทราบ (แพทย์เริ่มการรักษา — พิมพ์ใน Chief Complaint)
4. กลับไป ER Dashboard ดูการ์ดผู้ป่วย G

## Expected Result
ก่อนรับทราบ: การ์ดผู้ป่วย G แสดง MEWS Score
หลังรับทราบ: MEWS Score ไม่แสดงบนการ์ดผู้ป่วย G แล้ว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.3.1 — ผู้ใช้อธิบาย 31 ต.ค. 2569 "กดรับทราบแล้วให้ MEWS Score หายไปจากการ์ดของคนไข้ในหน้า Dashboard" · AC 2.1 ตัดปุ่ม Acknowledge ของ MEWS ออกแล้ว ร่างนี้จึงถือว่า "รับทราบ" = แพทย์เริ่มการรักษา
```

### TC-SBH-2058-013 - ตรวจสอบส่วน Suspect Fast Track แสดงรูปแบบใหม่ตามฟอร์มคัดกรอง

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-013
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ส่วน Suspect Fast Track เปิดรายการตัวเลือก

## Expected Result
ตัวเลือกเหมือนฟอร์มคัดกรอง 5 ค่า: Not Suspect Fast Track · Stroke Fast Track · STEMI / ACS Fast Track · Sepsis Fast Track · Trauma Fast Track
(ไม่ใช่ปุ่ม "Not Suspect Fast Track" แบบเดิม)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.5 — ตัวเลือกอ้างจากฟอร์มคัดกรอง SBH-1678 TC-001
```

### TC-SBH-2058-014 - ตรวจสอบปุ่ม Acknowledge ของ Suspect Fast Track ยังใช้ได้ใน Trauma Exam Form

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-014
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A (Trauma Fast Track)
2. ที่ส่วน Suspect Fast Track กด Acknowledge

## Expected Result
มีปุ่ม Acknowledge ที่ส่วน Suspect Fast Track
กดแล้วแสดง "Acknowledged โดย <ชื่อแพทย์> <วันเวลาที่กด>"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 — ยกเว้น Fast Track
```

### TC-SBH-2058-015 - คำนวณคะแนน RTS จาก GCS, SBP และ RR ใน Trauma Exam Form

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-015
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A (GCS E4 V5 M6 · SBP 120 · RR 20)
2. ดูส่วน Revised Trauma Score (RTS)

## Expected Result
ช่อง GCS 15 · Systolic BP 120 · RR 20
แถบผลแสดง "Revised Trauma Score - 8 Points" สีเขียว (ตามรูปในการ์ด)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.5 — GCS 15 = 4 · SBP 120 = 4 · RR 20 = 4 → 0.9368×4 + 0.7326×4 + 0.2908×4 = 7.8408 → แสดง 8 (ใช้คะแนนแปลงและปัดเป็นจำนวนเต็มตาม SBH-1678 ที่ผู้ใช้ยืนยัน 29 ต.ค. 2026)
```

### TC-SBH-2058-016 - ตรวจสอบหัวข้อ A ของ Primary Survey

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-016
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ส่วน Primary Survey ดูหัวข้อ "A - ทางเดินหายใจและการป้องกันกระดูกต้นคอ"

## Expected Result
ทางเดินหายใจ: Patent · Stridor · อื่นๆ + ช่องระบุ
ETT No. (ช่องระบุ) · ความลึก (cm) (ช่องระบุ)
C-spine ประเมินแนวกระดูกต้นคอ: no tenderness · tenderness · cannot evaluation

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6 — ตามรูป Primary Survey ในการ์ด
```

### TC-SBH-2058-017 - ระบุทางเดินหายใจอื่นๆ ใน Primary Survey หัวข้อ A

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-017
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Primary Survey หัวข้อ A ดูช่อง ระบุ ข้าง อื่นๆ ของทางเดินหายใจ
3. เลือก อื่นๆ แล้วพิมพ์ "Gurgling" ในช่อง ระบุ

## Expected Result
ก่อนเลือก อื่นๆ: ช่อง ระบุ เป็นสีเทากรอกไม่ได้
หลังเลือก อื่นๆ: ช่อง ระบุ กรอกได้และแสดง "Gurgling"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6 — ช่องสีเทาในรูป Primary Survey (ผู้ใช้สั่งเพิ่ม 31 ต.ค. 2569)
```

### TC-SBH-2058-018 - ตรวจสอบหัวข้อ B ของ Primary Survey

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-018
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ส่วน Primary Survey ดูหัวข้อ "B - การหายใจและการระบายอากาศ"

## Expected Result
การหายใจ: Normal · Dyspnea · Apneic
Trachea: Midline · Deviate to (Rt. / Lt.) · Negative
Subcutaneous emphysema Rt / Lt: มี · ไม่มี · ไม่ทราบ
Breath Sound: ไม่ทราบ · Clear · Abnormal + ช่องรายละเอียด Rt / Lt
Open pneumothorax at (ช่องระบุ)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6
```

### TC-SBH-2058-019 - ระบุข้าง Trachea Deviate to ใน Primary Survey หัวข้อ B

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-019
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Primary Survey หัวข้อ B ดูช่อง Rt. / Lt. ข้าง Deviate to ของ Trachea
3. เลือก Deviate to แล้วติ๊ก Rt.

## Expected Result
ก่อนเลือก Deviate to: Rt. / Lt. เป็นสีเทาเลือกไม่ได้
หลังเลือก Deviate to: Rt. / Lt. เลือกได้ · Rt. ถูกติ๊ก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6 — ช่องสีเทาในรูป Primary Survey (ผู้ใช้สั่งเพิ่ม 31 ต.ค. 2569)
```

### TC-SBH-2058-020 - ระบุรายละเอียด Breath Sound Abnormal ใน Primary Survey หัวข้อ B

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-020
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Primary Survey หัวข้อ B ดูช่องรายละเอียด Rt : และ Lt : ของ Breath Sound
3. เลือก Abnormal แล้วพิมพ์ Rt : "decreased" · Lt : "clear"

## Expected Result
ก่อนเลือก Abnormal: ช่องรายละเอียด Rt / Lt เป็นสีเทากรอกไม่ได้
หลังเลือก Abnormal: กรอกได้ทั้ง 2 ช่อง และแสดงตามที่พิมพ์

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6 — ช่องสีเทาในรูป Primary Survey (ผู้ใช้สั่งเพิ่ม 31 ต.ค. 2569)
```

### TC-SBH-2058-021 - ตรวจสอบหัวข้อ C ของ Primary Survey

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-021
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ส่วน Primary Survey ดูหัวข้อ "C - ระบบไหลเวียนโลหิตและการห้ามเลือด"

## Expected Result
Pulse at ER: Palpable · Pulseless
Active bleeding (ช่องระบุ)
Capillary refill: น้อยกว่าหรือเท่ากับ 2 วินาที · มากกว่า 2 วินาที
Pelvic hematoma at (ช่องระบุ)
E-FAST: ไม่ได้ทำ · Negative · Positive, diameter (cm.) · Subxyphoid · Hepatorenal · Splenorenal · cul-de-sac · Hemothorax (Rt. / Lt.) · Pneumothorax (Rt. / Lt.)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6
```

### TC-SBH-2058-022 - ระบุขนาด E-FAST Positive ใน Primary Survey หัวข้อ C

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-022
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Primary Survey หัวข้อ C ดูช่อง ระบุขนาด ข้าง Positive, diameter ของ E-FAST
3. เลือก Positive, diameter แล้วพิมพ์ขนาด 2

## Expected Result
ก่อนเลือก Positive: ช่อง ระบุขนาด เป็นสีเทากรอกไม่ได้
หลังเลือก Positive: กรอกได้ และแสดง 2 cm.

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6 — ช่องสีเทาในรูป Primary Survey (ผู้ใช้สั่งเพิ่ม 31 ต.ค. 2569)
```

### TC-SBH-2058-023 - ระบุข้าง Hemothorax ของ E-FAST ใน Primary Survey หัวข้อ C

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-023
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Primary Survey หัวข้อ C ดูช่อง Rt. / Lt. ข้าง Hemothorax ของ E-FAST
3. เลือก Hemothorax แล้วติ๊ก Lt.

## Expected Result
ก่อนเลือก Hemothorax: Rt. / Lt. เป็นสีเทาเลือกไม่ได้
หลังเลือก Hemothorax: Rt. / Lt. เลือกได้ · Lt. ถูกติ๊ก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6 — ช่องสีเทาในรูป Primary Survey (ผู้ใช้สั่งเพิ่ม 31 ต.ค. 2569)
```

### TC-SBH-2058-024 - ระบุข้าง Pneumothorax ของ E-FAST ใน Primary Survey หัวข้อ C

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-024
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Primary Survey หัวข้อ C ดูช่อง Rt. / Lt. ข้าง Pneumothorax ของ E-FAST
3. เลือก Pneumothorax แล้วติ๊ก Rt.

## Expected Result
ก่อนเลือก Pneumothorax: Rt. / Lt. เป็นสีเทาเลือกไม่ได้
หลังเลือก Pneumothorax: Rt. / Lt. เลือกได้ · Rt. ถูกติ๊ก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6 — ช่องสีเทาในรูป Primary Survey (ผู้ใช้สั่งเพิ่ม 31 ต.ค. 2569)
```

### TC-SBH-2058-025 - ตรวจสอบหัวข้อ D ของ Primary Survey

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-025
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ส่วน Primary Survey ดูหัวข้อ "D - การรู้สึกตัว"

## Expected Result
กล่อง รูม่านตาข้างซ้าย และ รูม่านตาข้างขวา แต่ละกล่องมี รูม่านตา (mm) + การตอบสนองของรูม่านตา: RTL · Sluggish · Fixed
DTX (mg/dL) (ช่องระบุ)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6
```

### TC-SBH-2058-026 - ตรวจสอบหัวข้อ E และหมายเหตุของ Primary Survey

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-026
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ส่วน Primary Survey ดูหัวข้อ "E - Exposure / Environment" และท้ายส่วน

## Expected Result
Log Roll: Normal · Abnormal + ช่องระบุ
PR - การตรวจทวารหนักด้วยนิ้ว: Sphincter tone (Normal · Loose) · Content (ช่องระบุ) · Bulbocavernosus reflex (Positive · Negative)
ท้ายส่วน Primary Survey มีช่อง หมายเหตุ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6
```

### TC-SBH-2058-027 - ระบุรายละเอียด Log Roll Abnormal ใน Primary Survey หัวข้อ E

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-027
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Primary Survey หัวข้อ E ดูช่อง ระบุ ข้าง Abnormal ของ Log Roll
3. เลือก Abnormal แล้วพิมพ์ "Tenderness T10–L1"

## Expected Result
ก่อนเลือก Abnormal: ช่อง ระบุ เป็นสีเทากรอกไม่ได้
หลังเลือก Abnormal: ช่อง ระบุ กรอกได้และแสดงตามที่พิมพ์

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.6 — ช่องสีเทาในรูป Primary Survey (ผู้ใช้สั่งเพิ่ม 31 ต.ค. 2569)
```

### TC-SBH-2058-028 - ตรวจสอบรายการ System เริ่มต้นใต้ Physical Examination

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-028
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ดูส่วน Physical Examination

## Expected Result
มีช่องข้อความ (rich text) ด้านบน
ตาราง System / Clinical Interpretation มีแถว HEENT · Lung · Abdomen · Perineum · Back · Neuro · Extremities
แต่ละแถวมี ปกติ · ไม่ปกติ · ช่องรายละเอียด · ลบ
มีลิงก์ ปกติทั้งหมด · ไม่ปกติทั้งหมด · ล้างทั้งหมด และปุ่ม + เพิ่มรายการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.7.1 — ตามรูป PE ในการ์ด
```

### TC-SBH-2058-029 - ระบุชื่อ System ใต้ Physical Examination เป็นข้อความอิสระ

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-029
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Physical Examination กด + เพิ่มรายการ
3. ที่ช่อง System ของแถวใหม่ พิมพ์ "Pelvis"

## Expected Result
ช่อง System รับข้อความที่พิมพ์ได้ และแสดง "Pelvis" (ไม่บังคับเลือกจากรายการ)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.7.1 — การ์ดระบุ "PE - System เป็น Free Text ไม่ใช่ Dropdown"
```

### TC-SBH-2058-030 - เพิ่มรายการ System ใต้ Physical Examination

Status: Not Run · Priority: Low · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-030
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Physical Examination นับจำนวนแถว แล้วกด + เพิ่มรายการ

## Expected Result
มีแถว System ใหม่ต่อท้าย 1 แถว (ปกติ / ไม่ปกติ · ช่องรายละเอียด · ลบ)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.7.1 — ตามรูป PE ในการ์ด
```

### TC-SBH-2058-031 - ลบรายการ System ใต้ Physical Examination

Status: Not Run · Priority: Low · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-031
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Physical Examination กด ลบ ที่แถว Perineum

## Expected Result
แถว Perineum หายไป · แถวอื่นยังอยู่ครบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.7.1 — ตามรูป PE ในการ์ด
```

### TC-SBH-2058-032 - เลือกปกติทั้งหมดใน Physical Examination

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-032
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Physical Examination เลือก ไม่ปกติ ที่แถว Lung
3. กด ปกติทั้งหมด

## Expected Result
ทุกแถว (รวม Lung) ถูกเลือก ปกติ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.7.1 — ตามรูป PE ในการ์ด
```

### TC-SBH-2058-033 - เลือกไม่ปกติทั้งหมดใน Physical Examination

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-033
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Physical Examination กด ไม่ปกติทั้งหมด

## Expected Result
ทุกแถวถูกเลือก ไม่ปกติ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.7.1 — ตามรูป PE ในการ์ด
```

### TC-SBH-2058-034 - ตรวจสอบส่วน Compression Test ใน Trauma Exam Form

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-034
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ดูส่วน Compression Test ก่อนเลือกค่าใด

## Expected Result
มี 2 แถว: Chest compression test · Pelvic compression test
แต่ละแถวมี Negative · Positive · Rt. · Lt.
Rt. / Lt. เป็นสีเทาเลือกไม่ได้ขณะยังไม่เลือก Positive

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.7.2 — ตามรูป Compression Test (ยังไม่เลือก)
```

### TC-SBH-2058-035 - เลือก Positive ใน Compression Test แล้วระบุข้าง Rt. และ Lt.

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-035
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Chest compression test เลือก Positive แล้วติ๊ก Rt. และ Lt.
3. ที่ Pelvic compression test เลือก Positive แล้วติ๊ก Rt. และ Lt.

## Expected Result
หลังเลือก Positive ช่อง Rt. / Lt. เลือกได้
ทั้ง 2 แถวแสดง Positive + Rt. + Lt. ถูกเลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.7.2 — ตามรูป Compression Test (เลือก Positive)
```

### TC-SBH-2058-036 - เลือก Negative ใน Compression Test แล้วระบุข้าง Rt. และ Lt. ไม่ได้

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-036
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ที่ Chest compression test เลือก Negative แล้วลองติ๊ก Rt. / Lt.
3. ที่ Pelvic compression test เลือก Negative แล้วลองติ๊ก Rt. / Lt.

## Expected Result
ทั้ง 2 แถวแสดง Negative ถูกเลือก
Rt. / Lt. ยังเป็นสีเทา ติ๊กไม่ได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.7.2 — ผู้ใช้สั่งเพิ่ม 31 ต.ค. 2569 · ถ้าเลือก Positive + Rt. แล้วเปลี่ยนเป็น Negative ค่า Rt. ถูกล้างหรือไม่ การ์ดไม่ระบุ (ดู gap)
```

### TC-SBH-2058-037 - ตรวจสอบส่วน Body Chart แสดงภาพร่างกายตามแบบ

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-037
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. ดูส่วน Body Chart

## Expected Result
แสดงภาพ FRONT VIEW · BACK VIEW
HEAD: Front · Back · Right · Left · Top · Bottom
HANDS: Right / Left hand (Palmar · Dorsal view)
FEET: Right / Left foot (Medial · Lateral · Dorsal · Plantar view)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.8 — การ์ดมีรูป 2 แบบ (หญิง / ชาย) ไม่ได้บอกว่าเลือกตามอะไร (ดู gap)
```

### TC-SBH-2058-038 - บันทึก Trauma Exam Form แล้วเปิดใหม่ข้อมูลที่กรอกยังอยู่

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-038
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A
2. กรอก Primary Survey: ทางเดินหายใจ = Patent · การหายใจ = Normal · Pulse at ER = Palpable · Log Roll = Normal
3. Physical Examination: Lung = ไม่ปกติ + รายละเอียด "decreased breath sound Rt."
4. Compression Test: Pelvic = Positive + Rt.
5. เลือก Diagnosis แล้วกด บันทึก
6. ปิดผู้ป่วย แล้วกด Patient Card ของผู้ป่วย A อีกครั้ง

## Expected Result
บันทึกสำเร็จ
เปิดใหม่แล้ว Primary Survey · Physical Examination · Compression Test ยังเป็นค่าที่กรอกในข้อ 2–4

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: นอก AC — เพิ่มเพราะฟอร์มบันทึกแล้วข้อมูลหาย = เวชระเบียนไม่ครบ · ER Physician Note ต้องเลือก Diagnosis ก่อนบันทึก (ถ้าฟอร์ม Trauma ไม่มี Diagnosis ข้ามขั้นนี้)
```

### TC-SBH-2058-039 - ตรวจสอบ ER Physician Note ไม่มีปุ่ม Acknowledge ที่ GCS และ MEWS

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-039
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย B (Non-Trauma)
2. ดูส่วน GCS และ MEWS ใน ER Physician Note

## Expected Result
ไม่มีปุ่ม Acknowledge / Reject และไม่มีข้อความ "Acknowledged โดย …" ที่ส่วน GCS และ MEWS

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 — เอา Acknowledge ออกจากทุกที่ ยกเว้น Fast Track
```

### TC-SBH-2058-040 - ตรวจสอบปุ่ม Acknowledge ของ Suspect Fast Track ยังใช้ได้ใน ER Physician Note

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-040
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย B (Stroke Fast Track)
2. ที่ส่วน Suspect Fast Track กด Acknowledge

## Expected Result
มีปุ่ม Acknowledge ที่ส่วน Suspect Fast Track
กดแล้วแสดง "Acknowledged โดย <ชื่อแพทย์> <วันเวลาที่กด>"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 — ยกเว้น Fast Track
```

### TC-SBH-2058-041 - ตรวจสอบส่วน Order to Nurse ใน ER Physician Note ไม่มีช่อง Order

Status: Not Run · Priority: Medium · Labels: เหมือน TC-004

```
TC ID: TC-SBH-2058-041
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย B (Non-Trauma)
2. เลื่อนไปที่ส่วน Order to Nurse ใน ER Physician Note

## Expected Result
ไม่มีช่อง Order (กรอกคำสั่งถึงพยาบาล)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — กรอบสีน้ำเงินในรูป · การ์ดไม่ได้บอกว่าหัว Order to Nurse ยังอยู่หรือไม่ (ดู gap)
```

### TC-SBH-2058-042 - ตรวจสอบเวลารอบน ER Dashboard หยุดนับเมื่อแพทย์ ER เริ่มทำงานกับผู้ป่วย Trauma

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-042
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard
2. ดูเวลารอบนการ์ดผู้ป่วย D (Trauma ยังไม่มีแพทย์เปิด) ว่ากำลังนับอยู่
3. กด Patient Card ของผู้ป่วย D แล้วพิมพ์ใน Chief Complaint
4. กลับไป ER Dashboard จดเวลารอบนการ์ด รอ 2 นาทีแล้วดูอีกครั้ง

## Expected Result
เวลารอบนการ์ดผู้ป่วย D หยุดที่ค่าตอนแพทย์เริ่มทำงาน ไม่เพิ่มขึ้นหลังรอ 2 นาที

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.1.3 — การ์ดให้หยุดตอนกด Patient Card ถ้าทำไม่ได้ให้ใช้การพิมพ์ · PR cortex-api #2871 เขียน "start trauma treatment on physician activity" · ผู้ใช้ยืนยันเขียนตามแอป (เริ่มพิมพ์)
```

### TC-SBH-2058-043 - ตรวจสอบเวลารอบน ER Dashboard หยุดนับเมื่อแพทย์ ER เริ่มทำงานกับผู้ป่วย Non-Trauma

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-2058-043
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard
2. ดูเวลารอบนการ์ดผู้ป่วย E (Non-Trauma ยังไม่มีแพทย์เปิด) ว่ากำลังนับอยู่
3. กด Patient Card ของผู้ป่วย E แล้วพิมพ์ใน Chief Complaint
4. กลับไป ER Dashboard จดเวลารอบนการ์ด รอ 2 นาทีแล้วดูอีกครั้ง

## Expected Result
เวลารอบนการ์ดผู้ป่วย E หยุดที่ค่าตอนแพทย์เริ่มทำงาน ไม่เพิ่มขึ้นหลังรอ 2 นาที

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.1.3 — Logic อยู่ใต้ "Doctor กดที่ Patient Card" ใช้กับทั้ง 2 ฟอร์ม
```

---

## TS-SBH-2058-UHP - RTS ข้อมูลไม่ครบ และผู้ใช้ที่ไม่ใช่แพทย์ไม่หยุดเวลารอ

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Trauma Exam Form + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2058-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER — ER Physician Note / Trauma Exam Form
- Requirement ที่อ้างอิง: SBH-2058 — [ER] [Form Exam] Trauma Exam Form

วัตถุประสงค์
- ยืนยันว่า RTS ไม่แสดงคะแนนเมื่อข้อมูลไม่ครบและบอกรายการที่ขาด และเวลารอไม่หยุดเมื่อผู้ทำงานไม่ใช่แพทย์ ER

ขอบเขต Requirement
- AC 3.5 RTS (รูป Incomplete - GCS, SBP, RR)
- AC 6.1.3 Trigger จาก User Doctor ER เท่านั้น

ความเสี่ยง
- RTS แสดงคะแนนทั้งที่ข้อมูลไม่ครบ → แพทย์เข้าใจผิดว่าผู้ป่วยไม่รุนแรง
- พยาบาลกรอกข้อมูลแล้วเวลาหยุด → Door-to-doc ผิด ผู้ป่วยหลุดลำดับบนบอร์ด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-2058-044 - แสดง RTS เป็น Incomplete เมื่อไม่มี GCS, SBP และ RR

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Trauma Exam Form + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-2058-044
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย C (Trauma ไม่มี Vital signs / GCS)
2. ดูส่วน Revised Trauma Score (RTS)

## Expected Result
ช่อง GCS · Systolic BP · RR แสดง "-"
แถบผลแสดง "Incomplete - GCS, SBP, RR" สีเทา ไม่แสดงคะแนน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.5 — ตามรูป RTS (Incomplete)
```

### TC-SBH-2058-045 - แสดง RTS เป็น Incomplete พร้อมเฉพาะรายการที่ขาดเมื่อมีแค่ GCS

Status: Not Run · Priority: Medium · Labels: เหมือน TC-044

```
TC ID: TC-SBH-2058-045
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย C
2. ที่ส่วน GCS เลือก E4 V5 M6 (ยังไม่มี SBP และ RR)
3. ดูส่วน Revised Trauma Score (RTS)

## Expected Result
ช่อง GCS 15 · Systolic BP และ RR แสดง "-"
แถบผลแสดง "Incomplete - SBP, RR"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.5 — ใช้ได้เมื่อ RTS ดึง GCS จากส่วน GCS ของฟอร์มแพทย์ (ดู gap)
```

### TC-SBH-2058-046 - ตรวจสอบเวลารอไม่หยุดนับเมื่อพยาบาล ER เปิดและกรอกข้อมูลผู้ป่วย

Status: Not Run · Priority: High · Labels: เหมือน TC-044

```
TC ID: TC-SBH-2058-046
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard
2. ดูเวลารอบนการ์ดผู้ป่วย F (Trauma ยังไม่มีแพทย์เปิด)
3. กด Patient Card ของผู้ป่วย F แล้วพิมพ์ข้อความในช่องที่พยาบาลกรอกได้
4. กลับไป ER Dashboard จดเวลารอ รอ 2 นาทีแล้วดูอีกครั้ง

## Expected Result
เวลารอบนการ์ดผู้ป่วย F ยังเพิ่มขึ้นต่อเนื่อง (ไม่หยุด)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.1.3 — Trigger จาก User Doctor ER เท่านั้น
```

---

## เรื่องที่ไม่ได้ใส่เป็น TC (เห็นจากรูปแต่การ์ดไม่เขียน) — ผู้ใช้เลือกเพิ่มได้

- ~~ช่องสีเทาใน Primary Survey~~ → เพิ่มเป็น TC-017 / 019 / 020 / 022 / 023 / 024 / 027 แล้ว (31 ต.ค. 2569)
- ~~Compression Test เลือก Negative~~ → เพิ่มเป็น TC-036 แล้ว (31 ต.ค. 2569)
- RTS ที่ค่าขอบของแต่ละช่วงคะแนน (BVA) — ทำแล้วในฟอร์มคัดกรอง SBH-1678 TC-033–037 ถ้าใช้ component เดียวกันไม่ต้องทำซ้ำ

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - Business Rule: Trauma = "อุบัติเหตุ / อุบัติเหตุจราจร" แต่ฟอร์มคัดกรอง (SBH-1678) มีแค่ ประเภทฉุกเฉิน Non-Trauma / Trauma — ร่างนี้ใช้ ประเภทฉุกเฉิน = Trauma
  - ~~AC 2.3.1~~ → ผู้ใช้อธิบายแล้ว = MEWS Score หายจากการ์ดผู้ป่วยบน Dashboard (TC-012) · "รับทราบ" = แพทย์เริ่มการรักษา (เริ่มพิมพ์) เพราะ AC 2.1 ตัดปุ่ม Acknowledge ของ MEWS แล้ว — ผู้ใช้ยืนยัน 31 ต.ค. 2569
  - Compression Test: เลือก Positive + Rt. แล้วเปลี่ยนเป็น Negative ค่า Rt. / Lt. ถูกล้างหรือไม่
  - AC 3 ลำดับไม่ได้ระบุตำแหน่งของ GCS · MEWS · Suspect Fast Track · Diagnosis · เอกสารแนบ ในฟอร์ม Trauma
  - RTS ใช้ GCS / SBP / RR จากไหน (GCS ของฟอร์มแพทย์หรือของคัดกรอง · Vital signs ชุดไหน) และแพทย์เปลี่ยน GCS แล้ว RTS คำนวณใหม่หรือไม่ · สูตรในการ์ดเขียนเป็นค่าดิบ แต่รูป 8 Points = ใช้คะแนนแปลง (ยึดตาม SBH-1678)
  - Body Chart มี 2 รูป (หญิง / ชาย) — เลือกตามเพศผู้ป่วยหรือไม่ · แพทย์ทำเครื่องหมายบนภาพอย่างไร
  - Physical Examination: "ล้างทั้งหมด" ทำอะไร (ล้างการเลือก หรือลบทุกแถว) · ค่าเริ่มต้นของแต่ละแถวเป็น ปกติ หรือว่าง · การ์ดเขียน System เป็น Free Text แต่รูปมีลูกศร dropdown
  - AC 5 เอาแค่ช่อง Order ออก หรือเอาส่วน Order to Nurse ออกทั้งส่วนใน ER Physician Note
  - AC 4 "ทุก" ครอบคลุมหน้าไหนบ้าง (ER Physician Note · Trauma Exam Form · หน้าอื่นที่เคยมี Acknowledge)
  - AC 6.1.3 Trigger หยุดเวลา: การ์ดให้กด Patient Card เป็นหลัก "ถ้าไม่ได้" ใช้การพิมพ์ — แอปใช้แบบไหน (dev-x 28 ต.ค. หยุดเมื่อเริ่มกรอกฟอร์มครั้งแรก)
- **Validation**
  - ช่องบังคับของ Trauma Exam Form (GCS มี * ในรูป) — บันทึกไม่ได้เมื่อขาดอะไร ข้อความว่าอะไร · ฟอร์ม Trauma มี Diagnosis และต้องเลือกเหมือน ER Physician Note หรือไม่
  - ช่วงค่าที่รับได้ของ รูม่านตา (mm) · DTX · ETT No. · ความลึก (cm) · E-FAST diameter
- **Error handling**
  - บันทึกฟอร์มไม่สำเร็จ (เช่น เครือข่ายหลุด) — การ์ดไม่ระบุ
- **Permission / role**
  - ใครเปิด / แก้ Trauma Exam Form ได้ (แพทย์เท่านั้น?) · พยาบาลเห็นฟอร์มแพทย์แบบอ่านอย่างเดียวหรือไม่
- **Edge cases**
  - คัดกรองซ้ำเปลี่ยน Non-Trauma ↔ Trauma หลังแพทย์เปิด / บันทึกฟอร์มแล้ว — ฟอร์มเปลี่ยนตามหรือไม่ ข้อมูลเดิมไปไหน
  - ผู้ป่วยที่ยังไม่คัดกรอง แพทย์กดการ์ด → ได้ฟอร์มไหน
  - ผู้ป่วย C (Trauma ไม่มี Vital signs / GCS) — ฟอร์มคัดกรองยอมบันทึกโดยไม่มี Vital signs หรือไม่ ถ้าไม่ได้ TC-044 / 045 ต้องเปลี่ยนวิธีเตรียมข้อมูล
  - แพทย์คนที่ 2 เปิดผู้ป่วยเดียวกัน — เวลาที่หยุดไว้ไม่เปลี่ยน

## คำถามก่อนสร้างใน Linear

1. ~~QA Sub-module / Feature~~ → สร้าง label ใหม่ `QA Sub-module / Feature : Trauma Exam Form` (ผู้ใช้ยืนยัน 31 ต.ค. 2569)
2. ~~Version~~ → 2.9.1 ตาม label ของการ์ด (ผู้ใช้ยืนยัน 31 ต.ค. 2569)
3. ~~Trigger หยุดเวลา และ "รับทราบ" (TC-012 / 042 / 043 / 046)~~ → ตามแอป: แพทย์เริ่มพิมพ์ = เริ่มการรักษา = รับทราบ (ผู้ใช้ยืนยัน 31 ต.ค. 2569)
4. ~~Env~~ → Dev-X / SBH Prod (ผู้ใช้ยืนยัน 31 ต.ค. 2569)
5. ~~เพิ่ม TC จากหัวข้อ "เรื่องที่ไม่ได้ใส่เป็น TC"~~ → ผู้ใช้สั่งเพิ่มช่องสีเทา Primary Survey + Compression Negative (31 ต.ค. 2569) · RTS ค่าขอบไม่เพิ่ม
