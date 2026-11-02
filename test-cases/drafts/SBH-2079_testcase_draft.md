# Draft Test Structure — SBH-2079

> สถานะ: **สร้างใน Linear แล้ว (2026-11-02)** — EXE `SBH-3617` · TS-HPY `SBH-3619` (TC 001–052 = `SBH-3626`–`SBH-3729`) ·
> TS-UHP `SBH-3620` (TC 053–059 = `SBH-3731`–`SBH-3737`) · TS-EDG `SBH-3622` (TC 060–070 = `SBH-3738`–`SBH-3750`)
> - ใช้ค่าที่แนะนำทั้ง 6 ข้อ (2.9.1 · Dev-X / SBH Prod · Disposition · ไม่ทำ TC hard-code / audit log · TC 066 ตัดถ้าหา visit ฉบับเดิมไม่ได้)
> - สร้างผ่าน connector บัญชี Pearsu Kaeomanee ("สร้างโดย" = Pearsu) · assignee = Suchat ทุกใบ
> - ชุดนี้ = EXE 1 + Scenario 3 (HPY / UHP / EDG) + TC 70 = 74 ใบ
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - TC ยึด AC ของการ์ด + **คำตอบ PO ในคอมเมนต์ 30 ต.ค. 2569** (Natthaphat) ที่แก้ AC 5 ข้อ — ดูหัวข้อ "คำตอบ PO ที่ใช้แทน AC"
> - ⚠️ การ์ดสถานะ In Review · PR: cortex-api #3001 / #3005 / #3007 · cortex-ui #2613 · cortex-testing #1638 / #1640 · cortex-x #8906 — เช็กว่าขึ้น dev-x แล้วก่อนรัน
> - ⚠️ Version ไม่ตรงกัน: label การ์ด = **VERSION 2.9.1** แต่ PR ทุกตัวตั้งชื่อ **[V2.10.0]** — ร่างนี้ใช้ 2.9.1 ตามลำดับ resolve (label ของการ์ดมาก่อน) รอผู้ใช้ยืนยัน
> - ⚠️ Linear connector เปลี่ยนบัญชีได้ — เรียก whoami ก่อนสร้าง · assignee ใส่ ID ของ Suchat (`ac7ed47a-b74d-4a54-992f-5d09acad47f2`)

Requirement: SBH-2079 — [ ER ] [ Disposition] Discharge summary
URL: https://linear.app/cortexcloud/issue/SBH-2079/er-disposition-discharge-summary
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: In Review
Labels: Natthaphat ( MOD ) 🙈 · 🍄 Improvement · VERSION 2.9.1 · Assignee: Thanadon (Modern) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat (MOD)
Sub-Issue: ยังไม่มี (ยังไม่มี EXE / TC)
Related: SBH-1346 (Disposition) · SBH-2593 (Order Summary) · SBH-1038 (ประวัติการรักษา) · SBH-3182 (ER Summary)
Resource: Prototype "ER Discharge Summary View.html" · ตัวอย่าง NUH_DischargeSummary.pdf · IPD-Discharge summary-print.pdf (แนบในการ์ด)

## คำตอบ PO ที่ใช้แทน AC (คอมเมนต์ 30 ต.ค. 2569)

| # | เรื่อง | AC เดิม | PO ตอบ | TC ที่ใช้ |
|---|---|---|---|---|
| 1 | สาเหตุการเสียชีวิต / Discharge Instruction | Scope บอก "การ์ดแยก" | ไม่มีการ์ดแยก → อยู่ในการ์ดนี้ อิง UI ที่เป็น free text | 001 · 002 · 037 · 044 · 055 · 063 · 068–070 |
| 2 | วันเวลาจำหน่าย | วันเวลา "แก้ไขล่าสุดโดย" ของ Disposition | อิงวันเวลาที่ลงนาม | 014 |
| 3 | ผู้มีสิทธิ์ดู / พิมพ์ | — | Role เดิม | 051 |
| 4 | Order หลัง Admit | — | รวม Order ของ ER และระหว่างรอเตียง · ไม่รวม Order ผู้ป่วยในที่มี Ward และเตียง | 057 · 064 |
| 5 | รหัสแบบฟอร์ม | หัวกระดาษขวามีรหัสแบบฟอร์ม | Skip ยังไม่ต้องมี | ไม่มี TC (009 ไม่ตรวจรหัสแบบฟอร์ม) |

## AC → TC

| AC | ความหมายที่ใช้ทดสอบ | TC |
|---|---|---|
| ส่วนที่ 1 แก้ UI Disposition | ช่องสาเหตุการเสียชีวิตเมื่อเลือกเสียชีวิต · ส่วน Discharge Instruction & Follow-up Plan · ช่องบังคับ · 1000 ตัวอักษร | 001 · 002 · 055 · 068 · 069 · 070 |
| 1 จุดเข้าใช้งาน | ลำดับแท็บ · เอกสารอ่านอย่างเดียว · ปุ่มพิมพ์ 2 ที่ · ยังไม่ลงนาม · เนื้อหา 2 ที่เหมือนกัน | 003–007 · 053 · 054 |
| 2 หัวกระดาษ | ตรา + ชื่อ ที่อยู่ โทร · ขวา (ไม่มีรหัสแบบฟอร์มตาม PO) · ชื่อเอกสาร · ซ้ำทุกหน้า | 008 · 009 · 010 · 050 |
| 3 ข้อมูลระบุตัวผู้ป่วย | 8 ช่อง · วันเวลาจำหน่าย = เวลาลงนาม (PO) | 013 · 014 |
| 4 ประวัติการแพ้ | แพ้ยา · แพ้อื่นๆ · เฉพาะ Active · ไม่มีรายการ | 015 · 016 · 058 · 060 |
| 5 ER Physician Note | หัวข้อตามฟอร์ม · ค่าทั้ง 10 หัวข้อ · ไม่แสดง Diagnosis general / Note to nurse · ฉบับคอมโพเนนต์ / ฉบับเดิม | 017–027 · 059 · 065 · 066 |
| 6 Order ที่ได้รับใน ER | One day + Continue · กลุ่ม · คอลัมน์ · ยา / หัตถการ / Lab · ยกเลิก · ไม่มี Order · รอเตียง / หอผู้ป่วย (PO) | 028–033 · 056 · 057 · 061 · 064 |
| 7 Disposition | ลำดับหัวข้อ · สถานะ / วิธีจำหน่าย [X] · สาเหตุเสียชีวิต · ข้อมูล Visit · การวินิจฉัย · หัตถการ · NON OR 22 ข้อ · ข้อความ 2 ช่อง · Discharge Instruction · "-" | 034–044 · 062 · 063 |
| 8 การลงนาม | แพทย์ผู้สั่งจำหน่าย · แพทย์ร่วมทำ · Submit by | 045 · 046 · 047 |
| 9 การพิมพ์ | A4 แนวตั้ง ฟอนต์ไทย ไม่มี UI · ท้ายหน้า · ไม่ตัดกลางแถว · พิมพ์ใหม่ได้ข้อมูลล่าสุด | 048 · 049 · 052 · 067 |
| Note ในการ์ด | หัว Section สีเทาเข้ม ไม่ใช่สีดำ | 012 |
| ลำดับส่วนบนเอกสาร (ลำดับ AC 3–8 + "ต่อจาก" ใน AC 4) | 011 |
| Use case แพทย์ / พยาบาล ดูและพิมพ์ซ้ำ | 051 |

> เทคนิค: ความยาวช่องข้อความใช้ BVA 2 ค่า (1000 / 1001) จากตัวนับ "0 / 1000" ในภาพของการ์ด · ปุ่มพิมพ์ / แท็บใช้ State Transition (ยังไม่ลงนาม → ลงนาม) ·
> Order หลัง Admit ใช้ EP 3 กลุ่มตามคำตอบ PO (สั่งใน ER · สั่งระหว่างรอเตียง · หอผู้ป่วยสั่งหลังได้เตียง)

### AC ที่ยังไม่มี TC

- AC 2 "ตรา ชื่อ ที่อยู่ และเบอร์โทร อ่านจากข้อมูลตั้งค่าโรงพยาบาล ไม่ hard-code" — ต้องแก้ข้อมูลตั้งค่าโรงพยาบาลเพื่อพิสูจน์ (แก้บน SBH Prod ไม่ได้ · ยังไม่รู้หน้าตั้งค่า) → รอผู้ใช้ตัดสิน (คำถามข้อ 4)
- AC 9 "ทุกครั้งที่พิมพ์ ระบบบันทึกผู้พิมพ์และวันเวลา" — dev บอกเป็นบันทึกเบื้องหลัง ยังไม่รู้ว่า QA ดูได้ที่หน้าไหน → รอผู้ใช้ตัดสิน (คำถามข้อ 5)
- AC 2 รหัสแบบฟอร์ม — PO ให้ skip

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | ตรวจสอบหน้า Disposition แสดงช่องสาเหตุการเสียชีวิตเมื่อเลือกวิธีการจำหน่ายเสียชีวิต | ขึ้นช่อง "สาเหตุการเสียชีวิต" (บังคับ *) ใต้วิธีการจำหน่าย · ตัวนับ 0 / 1000 |
| 002 | HPY | ตรวจสอบหน้า Disposition มีส่วน Discharge Instruction & Follow-up Plan พร้อมช่องคำแนะนำผู้ป่วยและนัดติดตาม | มีส่วน Discharge Instruction & Follow-up Plan · ช่อง คำแนะนำผู้ป่วย + นัดติดตาม/ Follow-up · ตัวนับ 0 / 1000 ทั้ง 2 ช่อง |
| 003 | HPY | ตรวจสอบแท็บ Discharge Summary ของ visit ER อยู่ต่อจากแท็บ ER Summary ในประวัติการรักษา | ลำดับแท็บ ER Summary · Discharge Summary · Timeline · CPR Progression · ประวัติ Custom Form · ค่าใช้จ่าย |
| 004 | HPY | ตรวจสอบแท็บ Discharge Summary แสดงเอกสาร A4 แบบอ่านอย่างเดียว | แสดงเอกสาร A4 · ไม่มีช่องกรอก / ปุ่มแก้ไข / ปุ่มบันทึก |
| 005 | HPY | ตรวจสอบกดปุ่มพิมพ์ในแท็บ Discharge Summary แล้วได้เอกสาร ER Discharge Summary | มีปุ่ม "พิมพ์" · กดแล้วได้เอกสาร ER Discharge Summary ของ visit นั้น |
| 006 | HPY | ตรวจสอบกดปุ่มพิมพ์ Discharge Summary ที่หัวฟอร์ม Disposition หลังลงนามแล้วได้เอกสาร | ปุ่ม "พิมพ์ Discharge Summary" อยู่หัวฟอร์ม กดได้ · ได้เอกสาร ER Discharge Summary ของ visit นั้น |
| 007 | HPY | ตรวจสอบเอกสารที่พิมพ์จากเมนู Disposition และแท็บ Discharge Summary มีเนื้อหาเหมือนกันทุกช่อง | เนื้อหาทุกส่วนทุกช่องเหมือนกัน (ต่างได้เฉพาะวันเวลาที่พิมพ์) |
| 008 | HPY | ตรวจสอบหัวกระดาษแสดงตราและชื่อ ที่อยู่ เบอร์โทรของโรงพยาบาลสระบุรี | ซ้าย ตรา รพ.สระบุรี · กลาง โรงพยาบาลสระบุรี / Saraburi Hospital / ที่อยู่ / โทร. 036-343500 · ไม่มีชื่อหรือตรา รพ.อื่น |
| 009 | HPY | ตรวจสอบหัวกระดาษด้านขวาแสดงวันเวลาที่พิมพ์และผู้สั่งพิมพ์โดยไม่แสดงสิทธิการรักษา | วันเวลาที่พิมพ์ + ผู้สั่งพิมพ์ ตรงกับผู้ใช้และเวลาที่กด · ไม่มีสิทธิการรักษา |
| 010 | HPY | ตรวจสอบชื่อเอกสารแสดงสรุปการจำหน่ายผู้ป่วยฉุกเฉินและ ER Discharge Summary | ชื่อเอกสาร "สรุปการจำหน่ายผู้ป่วยฉุกเฉิน" / "ER Discharge Summary" |
| 011 | HPY | ตรวจสอบลำดับส่วนบนเอกสาร ER Discharge Summary | หัวกระดาษ → ข้อมูลระบุตัวผู้ป่วย → ประวัติการแพ้ → ER Physician Note → Order ที่ได้รับใน ER → Disposition → การลงนามท้ายเอกสาร |
| 012 | HPY | ตรวจสอบหัว Section ของเอกสารเป็นสีเทาเข้มไม่ใช่สีดำ | แถบหัว Section ทุกส่วนเป็นสีเทาเข้ม ไม่ใช่สีดำ |
| 013 | HPY | ตรวจสอบข้อมูลระบุตัวผู้ป่วยตรงกับ Patient banner และ Encounter | ชื่อ-สกุล · HN · EN · VN · วันเกิด · อายุ · เพศ · วันเวลาเปิด Visit ตรงกับ banner / Encounter |
| 014 | HPY | ตรวจสอบวันเวลาจำหน่ายตรงกับวันเวลาที่ลงนาม Disposition | วันเวลาจำหน่าย = วันเวลาที่ลงนาม (ไม่ใช่เวลาบันทึกฉบับร่าง) |
| 015 | HPY | ตรวจสอบประวัติแพ้ยาแสดงชื่อยา ประเภท สรุปอาการ Severity และผลการประเมินตามที่บันทึก | ชื่อยา/กลุ่ม · ประเภทของการแพ้ยา · สรุปอาการแพ้ · Severity · ผลการประเมิน ตรงกับประวัติการแพ้ |
| 016 | HPY | ตรวจสอบประวัติแพ้อื่นๆ แสดงสิ่งที่แพ้ ประเภท สรุปอาการ และ Severity ตามที่บันทึก | สิ่งที่แพ้ · ประเภทการแพ้ · สรุปอาการแพ้ · Severity ตรงกับประวัติการแพ้ |
| 017 | HPY | ตรวจสอบส่วน ER Physician Note แสดงหัวข้อครบและชื่อหัวข้อตามฟอร์ม | 10 หัวข้อ Chief Complaint - General → … → Body chart ชื่อตรงกับฟอร์ม |
| 018 | HPY | ตรวจสอบ Chief Complaint - General และ Present illness general แสดงข้อความตามที่บันทึก | ข้อความ 2 หัวข้อตรงกับ ER Physician Note |
| 019 | HPY | ตรวจสอบ Verified Underlying Disease แสดง Display ของรายการที่ Active | แสดงชื่อ Display ของโรคที่ Active ตรงกับ Note |
| 020 | HPY | ตรวจสอบ Vital signs แสดงค่ารายการล่าสุดใน ER Physician Note | BP · PR · RR · BT · SpO₂ · Pain = ชุดล่าสุดใน Note (ไม่ใช่ชุดแรก) |
| 021 | HPY | ตรวจสอบ Glasgow Coma Scale แสดง E V M และ Total GCS ตามที่บันทึก | Eye Opening (E) · Verbal Response (V) · Motor Response (M) · Total GCS ตรงกับ Note |
| 022 | HPY | ตรวจสอบ MEWS แสดง Total MEWS ตามที่บันทึก | Total MEWS ตรงกับ Note |
| 023 | HPY | ตรวจสอบการจำแนกผู้ป่วยแสดง Suspect Fast Track Type และประเภทฉุกเฉิน | Suspect Fast Track Type · ประเภทฉุกเฉิน ตรงกับ Note |
| 024 | HPY | ตรวจสอบ Body metric general แสดงน้ำหนัก ส่วนสูง และ BMI | น้ำหนัก · ส่วนสูง · BMI ตรงกับ Note |
| 025 | HPY | ตรวจสอบ Physical examination แสดงสรุปผลการตรวจและผลรายระบบครบ 7 ระบบ | สรุปผลการตรวจ + GA · HEENT · Heart · Lungs · Abdomen · Extremities · Neuro ตรงกับ Note |
| 026 | HPY | ตรวจสอบ Body chart แสดงรายการตำแหน่งและรายละเอียดโดยไม่พิมพ์ภาพ | รายการตำแหน่ง + รายละเอียดครบ · ไม่มีภาพ Body chart |
| 027 | HPY | ตรวจสอบเอกสารไม่แสดง Diagnosis general และ Note to nurse ของ ER Physician Note | ไม่มีหัวข้อ / ข้อความของ Diagnosis general และ Note to nurse |
| 028 | HPY | ตรวจสอบ Order ที่ได้รับใน ER แสดงครบทั้ง ORDER FOR ONE DAY และ ORDER FOR CONTINUE | แสดงทุก Order ของ visit · คอลัมน์ ORDER FOR = One day / Continue ตรงกับที่สั่ง |
| 029 | HPY | ตรวจสอบ Order จัดกลุ่มและชื่อกลุ่มตรงกับหน้า Order Summary | กลุ่ม ยา · เวชภัณฑ์ · หัตถการ · Instrument · รังสี - [modality] · ห้องปฏิบัติการ - [หมวด] ตรงกับ Order Summary |
| 030 | HPY | ตรวจสอบตาราง Order มีเฉพาะคอลัมน์ ORDER FOR รายการ ความเร่งด่วน และจำนวน | 4 คอลัมน์เท่านั้น · ไม่มีสถานะ / ราคา / ลงนาม / Alert / Action / หมายเหตุ |
| 031 | HPY | ตรวจสอบรายการยาแสดงรายการ วิธีการใช้ และฉลากช่วยตาม Order | ยาแสดง "รายการ / วิธีการใช้ / ฉลากช่วย" ตรงกับ Order |
| 032 | HPY | ตรวจสอบรายการหัตถการต่อท้ายด้วยรหัส ICD9-CM | ชื่อหัตถการตามด้วยรหัส ICD9-CM ที่ถูกต้อง |
| 033 | HPY | ตรวจสอบรายการห้องปฏิบัติการต่อท้ายด้วย Specimen | ชื่อ Lab ตามด้วย Specimen ที่ถูกต้อง |
| 034 | HPY | ตรวจสอบส่วน Disposition เรียงหัวข้อตามลำดับฟอร์ม Disposition | สรุปการจำหน่าย → ข้อมูล Visit → การวินิจฉัย → หัตถการ → NON OR PROCEDURE → ข้อมูลทางคลินิกฯ → การตรวจเพิ่มเติมฯ → Discharge Instruction & Follow-up Plan · สรุปโดยอยู่ท้ายเอกสาร |
| 035 | HPY | ตรวจสอบสถานะการจำหน่ายแสดงตัวเลือกครบ 9 ข้อและติ๊ก [X] ที่ค่าที่เลือก | 9 ตัวเลือกครบ · [X] เฉพาะค่าที่เลือก |
| 036 | HPY | ตรวจสอบวิธีการจำหน่ายแสดงตัวเลือกครบ 10 ข้อและติ๊ก [X] ที่ค่าที่เลือก | 10 ตัวเลือกครบ · [X] เฉพาะค่าที่เลือก |
| 037 | HPY | ตรวจสอบสาเหตุการเสียชีวิตแสดงต่อจากวิธีการจำหน่ายเมื่อมีบันทึก | ข้อความสาเหตุการเสียชีวิตต่อจากวิธีการจำหน่าย ตรงกับที่บันทึก · [X] ที่ Dead / เสียชีวิต |
| 038 | HPY | ตรวจสอบข้อมูล Visit แสดงวินิจฉัยโดยแพทย์ | วินิจฉัย โดยแพทย์ ตรงกับฟอร์ม Disposition |
| 039 | HPY | ตรวจสอบการวินิจฉัยแสดงรหัส - ชื่อโรค ประเภท และแพทย์ตามที่บันทึก | ทุกแถว: รหัส - ชื่อโรค · ประเภท · แพทย์ ตรงกับ Disposition |
| 040 | HPY | ตรวจสอบหัตถการแสดง Type Procedure Practitioner Start - End Date และ Site | 5 ช่องตรงกับหัตถการใน Disposition |
| 041 | HPY | ตรวจสอบ NON OR PROCEDURE แสดงครบ 22 ข้อและติ๊ก [X] ที่รายการที่เลือก | 22 ข้อครบ · [X] เฉพาะข้อที่เลือก |
| 042 | HPY | ตรวจสอบข้อมูลทางคลินิกและการดำเนินโรคแสดงข้อความตามที่บันทึก | ข้อความตรงกับ Disposition |
| 043 | HPY | ตรวจสอบการตรวจเพิ่มเติมและผลการตรวจแสดงข้อความตามที่บันทึก | ข้อความตรงกับ Disposition |
| 044 | HPY | ตรวจสอบ Discharge Instruction & Follow-up Plan แสดงคำแนะนำผู้ป่วยและนัดติดตามตามที่บันทึก | คำแนะนำผู้ป่วย · นัดติดตาม/ Follow-up ตรงกับ Disposition |
| 045 | HPY | ตรวจสอบช่องลงนามแพทย์ผู้สั่งจำหน่ายแสดงชื่อ-สกุลและวันเวลาที่ลงนาม | ช่องลงชื่อ · ชื่อ-สกุลแพทย์ผู้สั่งจำหน่าย · วันเวลาที่ลงนาม ตรงกับ Disposition |
| 046 | HPY | ตรวจสอบแพทย์ร่วมทำแสดงชื่อเมื่อมีบันทึก | ชื่อแพทย์ร่วมทำตรงกับ Disposition |
| 047 | HPY | ตรวจสอบ Submit by แสดงชื่อและวันเวลาตรงกับแก้ไขล่าสุดโดยของ Disposition | ชื่อ + วันเวลา = "แก้ไขล่าสุดโดย" ที่หัวฟอร์ม Disposition |
| 048 | HPY | ตรวจสอบเอกสารพิมพ์เป็นกระดาษ A4 แนวตั้ง ฟอนต์ไทยอ่านได้ และไม่มี UI ของหน้าจอ | A4 แนวตั้ง · ภาษาไทยไม่เพี้ยน · ไม่มีเมนู / ปุ่ม / แท็บของหน้าจอ |
| 049 | HPY | ตรวจสอบท้ายทุกหน้าแสดงผู้สั่งพิมพ์ วันเวลาที่พิมพ์ และหน้า x/y | ทุกหน้ามี ผู้สั่งพิมพ์ · วันเวลาที่พิมพ์ · "หน้า x/y" ถูกต้อง |
| 050 | HPY | ตรวจสอบหัวกระดาษแสดงซ้ำทุกหน้าเมื่อเอกสารมีหลายหน้า | หัวกระดาษ (ตรา · ชื่อ รพ. · ชื่อเอกสาร · ขวา) อยู่ครบทุกหน้า |
| 051 | HPY | ตรวจสอบพยาบาลเปิดแท็บ Discharge Summary และพิมพ์ได้ด้วยสิทธิ์เดิม | พยาบาลเห็นแท็บ · เปิดเอกสารได้ · กดพิมพ์ได้ · ไม่มีช่องแก้ไข |
| 052 | HPY | ตรวจสอบพิมพ์ใหม่หลังแก้ไขข้อมูลต้นทางแล้วได้ข้อมูลล่าสุด | เอกสารครั้งที่ 2 แสดงค่าใหม่ · ไม่ใช่ค่าตอนพิมพ์ครั้งแรก |
| 053 | UHP | ตรวจสอบปุ่มพิมพ์ Discharge Summary ในเมนู Disposition ถูกปิดเมื่อยังไม่ลงนาม | ปุ่มพิมพ์ Discharge Summary ถูกปิด กดไม่ได้ |
| 054 | UHP | ตรวจสอบแท็บ Discharge Summary แสดงข้อความยังไม่มีเอกสารเมื่อยังไม่ลงนาม | "ยังไม่มี Discharge Summary เพราะยังไม่ลงนามการจำหน่าย" · ไม่มีเอกสาร |
| 055 | UHP | ตรวจสอบลงนาม Disposition ไม่ได้เมื่อเลือกเสียชีวิตแต่ไม่กรอกสาเหตุการเสียชีวิต | ลงนามไม่สำเร็จ · แจ้งให้กรอกช่องสาเหตุการเสียชีวิต |
| 056 | UHP | ตรวจสอบ Order ที่ยกเลิกไม่แสดงในเอกสาร | Order ที่ยกเลิกไม่อยู่ในเอกสาร · Order อื่นยังแสดงครบ |
| 057 | UHP | ตรวจสอบ Order ที่หอผู้ป่วยสั่งหลังได้เตียงไม่แสดงในเอกสาร | ไม่มี Order ที่สั่งหลังผู้ป่วยมี Ward และเตียง |
| 058 | UHP | ตรวจสอบประวัติการแพ้ที่ไม่ Active ไม่แสดงในเอกสาร | รายการแพ้ที่ Inactive ไม่แสดง · รายการ Active ยังแสดง |
| 059 | UHP | ตรวจสอบโรคประจำตัวที่ไม่ Active ไม่แสดงใน Verified Underlying Disease | โรคที่ Inactive ไม่แสดง · โรค Active ยังแสดง |
| 060 | EDG | ตรวจสอบประวัติการแพ้แสดงข้อความไม่มีประวัติเมื่อไม่มีรายการแพ้ | "ไม่มีประวัติแพ้ยาที่บันทึกไว้" · "ไม่มีประวัติแพ้อื่นๆ ที่บันทึกไว้" |
| 061 | EDG | ตรวจสอบส่วน Order แสดงข้อความเมื่อไม่มี Order ใน visit | "ไม่มี Order ใน visit นี้" |
| 062 | EDG | ตรวจสอบช่องในส่วน Disposition ที่ไม่มีข้อมูลแสดงเครื่องหมายขีด | ช่องที่ไม่ได้บันทึกแสดง "-" ไม่เว้นว่าง / ไม่ซ่อน |
| 063 | EDG | ตรวจสอบไม่แสดงสาเหตุการเสียชีวิตเมื่อวิธีการจำหน่ายไม่ใช่เสียชีวิต | ไม่มีบรรทัดสาเหตุการเสียชีวิต |
| 064 | EDG | ตรวจสอบ Order ที่สั่งระหว่างรอเตียงใน ER แสดงในเอกสาร | Order ที่สั่งใน ER + ระหว่างรอเตียง แสดงครบ |
| 065 | EDG | ตรวจสอบเอกสารใช้ ER Physician Note ฉบับคอมโพเนนต์ชุดเดียวเมื่อมีทั้งฉบับคอมโพเนนต์และฉบับเดิม | ใช้ข้อมูลฉบับคอมโพเนนต์ · แสดงชุดเดียว ไม่ซ้ำ |
| 066 | EDG | ตรวจสอบเอกสารใช้บันทึกแพทย์ฉบับเดิมเมื่อไม่มี ER Physician Note ฉบับคอมโพเนนต์ | ส่วน ER Physician Note แสดงข้อมูลจากบันทึกแพทย์ฉบับเดิม |
| 067 | EDG | ตรวจสอบตารางที่ยาวเกินหน้าต่อขึ้นหน้าใหม่โดยไม่ตัดกลางแถว | ตารางต่อหน้าใหม่ · ไม่มีแถวถูกตัดครึ่งระหว่างหน้า |
| 068 | EDG | ตรวจสอบช่องสาเหตุการเสียชีวิตรับได้สูงสุด 1000 ตัวอักษร | 1000 ตัวอักษรรับได้ (1000 / 1000) · ตัวที่ 1001 ไม่เข้า |
| 069 | EDG | ตรวจสอบช่องคำแนะนำผู้ป่วยรับได้สูงสุด 1000 ตัวอักษร | 1000 ตัวอักษรรับได้ (1000 / 1000) · ตัวที่ 1001 ไม่เข้า |
| 070 | EDG | ตรวจสอบช่องนัดติดตาม Follow-up รับได้สูงสุด 1000 ตัวอักษร | 1000 ตัวอักษรรับได้ (1000 / 1000) · ตัวที่ 1001 ไม่เข้า |

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user**: แพทย์ ER (ER Physician Note · Order · Disposition · ลงนาม · พิมพ์) · พยาบาล ER (Triage · ดูแท็บ · TC 051) · ผู้รับเตียงที่หอผู้ป่วย / แพทย์ IPD (ผู้ป่วย E)
- "เปิดแท็บ Discharge Summary" = เลือกผู้ป่วย > เมนูซ้าย **ประวัติการรักษา** > เลือก visit ER > แท็บ **Discharge Summary**
- "พิมพ์จากแท็บ" = กดปุ่ม **พิมพ์** ในแท็บ · "พิมพ์จาก Disposition" = เมนู Disposition > ปุ่ม **พิมพ์ Discharge Summary** ที่หัวฟอร์ม
- **ผู้ป่วย A (ข้อมูลครบ · จำหน่าย With Approval · ลงนามแล้ว · เอกสาร ≥ 2 หน้า)** — ใช้กับ 003–036, 038–052, 056, 058, 059, 067:
  ประวัติการแพ้: แพ้ยา Active 1 รายการ (กรอกครบ 5 ช่อง) + แพ้ยา Inactive 1 รายการ · แพ้อื่นๆ Active 1 รายการ (กรอกครบ 4 ช่อง) →
  Triage → ER Physician Note ฉบับคอมโพเนนต์: Chief Complaint · Present illness · Verified U/D Active 2 + Inactive 1 · Vital signs 2 ชุด (ค่าต่างกัน) · GCS E/V/M ·
  MEWS · การจำแนกผู้ป่วย · น้ำหนัก + ส่วนสูง · PE สรุปผล + 7 ระบบ · Body chart ≥ 2 ตำแหน่งพร้อมรายละเอียด · Diagnosis general · Note to nurse →
  Order: ยา One day ≥ 2 (มีฉลากช่วย) · ยา Continue ≥ 1 · เวชภัณฑ์ · หัตถการ (มี ICD9-CM) · Instrument · รังสี · Lab (มี Specimen) แล้วยกเลิกยา 1 รายการ (เพิ่ม Order จนเอกสาร ≥ 2 หน้า) →
  Disposition: สถานะ Improved · วิธี With Approval · ข้อมูล Visit · การวินิจฉัย ≥ 2 รายการ · หัตถการ 1 รายการ (กรอกครบ 5 ช่อง) · NON OR ≥ 2 ข้อ ·
  ข้อมูลทางคลินิกฯ · การตรวจเพิ่มเติมฯ · คำแนะนำผู้ป่วย · นัดติดตาม · แพทย์ร่วมทำ → **บันทึกฉบับร่าง (จดเวลา T1) → รอ ≥ 1 นาที → ลงนาม (จดเวลา T2)**
- **ผู้ป่วย B (ยังไม่ลงนาม)** — ใช้กับ 002, 053, 054, 069, 070: เริ่ม Disposition บันทึกฉบับร่างแล้ว · ยังไม่ลงนาม
- **ผู้ป่วย C (เสียชีวิต)** — ใช้กับ 001, 037, 055, 068: Disposition สถานะ Dead · วิธี เสียชีวิต · สาเหตุการเสียชีวิต (ข้อความ) · ลงนาม
- **ผู้ป่วย D (ข้อมูลน้อย)** — ใช้กับ 060, 061, 062, 063: ผู้ป่วยใหม่ไม่มีประวัติแพ้ · ไม่สั่ง Order · Disposition กรอกเฉพาะช่องบังคับ (วิธี With Approval) · ลงนาม
- **ผู้ป่วย E (Admit + รอเตียง)** — ใช้กับ 057, 064: สั่ง Order ใน ER (1) → Disposition รับไว้รักษาต่อIPD + Admit Request ลงนาม → สั่ง Order ระหว่างรอเตียงใน ER (2) →
  ได้เตียงที่หอผู้ป่วย → แพทย์หอผู้ป่วยสั่ง Order (3) · จดชื่อ Order ทั้ง 3 ชุด
- **ผู้ป่วย F (Note 2 ฉบับ)** — ใช้กับ 065: visit ที่มีทั้งบันทึกแพทย์ฉบับเดิมและ ER Physician Note ฉบับคอมโพเนนต์ (Chief Complaint คนละข้อความ) · ลงนาม Disposition
- **ผู้ป่วย G (Note ฉบับเดิมเท่านั้น)** — ใช้กับ 066: visit ที่มีเฉพาะบันทึกแพทย์ฉบับเดิม · ลงนาม Disposition (ดูคำถามข้อ 6 — ยังไม่รู้ว่าสร้างฉบับเดิมใหม่ได้หรือต้องใช้ visit เก่า)

---

## EXE - CT - 2.9.1

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, VERSION 2.9.1, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Disposition, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.1
- Module: ER — Disposition / ประวัติการรักษา > Discharge Summary
- Requirement ที่อ้างอิง: SBH-2079 — [ ER ] [ Disposition] Discharge summary
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- หน้า Disposition: ช่องสาเหตุการเสียชีวิต · ส่วน Discharge Instruction & Follow-up Plan
- จุดเข้าใช้งาน: แท็บ Discharge Summary ในประวัติการรักษา · ปุ่มพิมพ์ในเมนู Disposition · ก่อน / หลังลงนาม
- เนื้อหาเอกสาร: หัวกระดาษ · ข้อมูลระบุตัวผู้ป่วย · ประวัติการแพ้ · ER Physician Note · Order ที่ได้รับใน ER · Disposition · การลงนาม
- การพิมพ์: A4 · ท้ายหน้า · หลายหน้า · พิมพ์ซ้ำได้ข้อมูลล่าสุด
- สิทธิ์ดู / พิมพ์ของแพทย์และพยาบาล (role เดิม)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-2079-HPY - แสดงและพิมพ์ ER Discharge Summary ครบทุกส่วนหลังลงนาม Disposition

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Disposition + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2079-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER — Disposition / ประวัติการรักษา > Discharge Summary
- Requirement ที่อ้างอิง: SBH-2079 — [ ER ] [ Disposition] Discharge summary

วัตถุประสงค์
- ยืนยันว่าหลังแพทย์ลงนาม Disposition แล้ว เปิดและพิมพ์ ER Discharge Summary ได้จาก 2 ที่ เอกสารเหมือนกัน เนื้อหาทุกส่วนดึงจากแหล่งที่การ์ดกำหนดและค่าตรงกับที่บันทึก

ขอบเขต Requirement
- ส่วนที่ 1 (แก้ UI Disposition) และ AC 1–9
- Note ในการ์ด: สีหัว Section
- คำตอบ PO 30 ต.ค. 2569 ข้อ 1–3

ความเสี่ยง
- เอกสารที่ส่งต่อ / เก็บเวชระเบียนมีข้อมูลผิดคนหรือผิด visit
- ประวัติการแพ้ / Order ยาไม่ครบ → ผู้รับต่อให้ยาซ้ำหรือให้ยาที่แพ้
- พิมพ์จาก 2 ที่ได้เอกสารไม่ตรงกัน
- หัวกระดาษผิดโรงพยาบาล

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ระบุในแต่ละ TC (ดูหัวข้อข้อมูลตั้งต้น)
```

### TC-SBH-2079-001 - ตรวจสอบหน้า Disposition แสดงช่องสาเหตุการเสียชีวิตเมื่อเลือกวิธีการจำหน่ายเสียชีวิต

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด visit ER ของผู้ป่วย C > เมนู Disposition > เริ่มบันทึก
2. ส่วนสรุปการจำหน่าย > วิธีการจำหน่าย เลือก "เสียชีวิต"

## Expected Result
ขึ้นช่อง "สาเหตุการเสียชีวิต" (มี * บังคับ) ใต้วิธีการจำหน่าย
ช่องเป็นข้อความอิสระ มีตัวนับ 0 / 1000

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ส่วนที่ 1 ข้อ 2 + PO ข้อ 1 (free text) · ภาพในการ์ด
```

### TC-SBH-2079-002 - ตรวจสอบหน้า Disposition มีส่วน Discharge Instruction & Follow-up Plan พร้อมช่องคำแนะนำผู้ป่วยและนัดติดตาม

Status: Not Run · Priority: High · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > เปิด visit ER ของผู้ป่วย B > เมนู Disposition
2. เลื่อนหาส่วน Discharge Instruction & Follow-up Plan

## Expected Result
มีส่วน "Discharge Instruction & Follow-up Plan"
มีช่อง "คำแนะนำผู้ป่วย" และ "นัดติดตาม/ Follow-up" แต่ละช่องมีตัวนับ 0 / 1000

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ส่วนที่ 1 ข้อ 3 + PO ข้อ 1 · ภาพในการ์ด
```

### TC-SBH-2079-003 - ตรวจสอบแท็บ Discharge Summary ของ visit ER อยู่ต่อจากแท็บ ER Summary ในประวัติการรักษา

Status: Not Run · Priority: High · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-003
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > เลือกผู้ป่วย A > เมนูซ้าย ประวัติการรักษา
2. เลือก visit ER
3. ดูแถบแท็บ

## Expected Result
แท็บเรียง: ER Summary · Discharge Summary · Timeline · CPR Progression · ประวัติ Custom Form · ค่าใช้จ่าย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 ข้อ 1
```

### TC-SBH-2079-004 - ตรวจสอบแท็บ Discharge Summary แสดงเอกสาร A4 แบบอ่านอย่างเดียว

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-004
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิดแท็บ Discharge Summary ของผู้ป่วย A
2. คลิกที่ข้อความในเอกสาร และหาช่องกรอก / ปุ่มแก้ไข / ปุ่มบันทึก

## Expected Result
แสดงเอกสารขนาด A4
ไม่มีช่องกรอก ปุ่มแก้ไข หรือปุ่มบันทึก แก้ข้อความในเอกสารไม่ได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 ข้อ 2
```

### TC-SBH-2079-005 - ตรวจสอบกดปุ่มพิมพ์ในแท็บ Discharge Summary แล้วได้เอกสาร ER Discharge Summary

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-005
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิดแท็บ Discharge Summary ของผู้ป่วย A
2. กดปุ่ม "พิมพ์"

## Expected Result
มีปุ่ม "พิมพ์" ในแท็บ
กดแล้วได้เอกสาร ER Discharge Summary ของ visit ER นี้ (HN / EN ตรงกับผู้ป่วย A)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 ข้อ 2 · Use case แพทย์ / พยาบาลพิมพ์ซ้ำ
```

### TC-SBH-2079-006 - ตรวจสอบกดปุ่มพิมพ์ Discharge Summary ที่หัวฟอร์ม Disposition หลังลงนามแล้วได้เอกสาร

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด visit ER ของผู้ป่วย A (ลงนาม Disposition แล้ว) > เมนู Disposition
2. ดูหัวฟอร์ม แล้วกดปุ่ม "พิมพ์ Discharge Summary"

## Expected Result
ปุ่ม "พิมพ์ Discharge Summary" อยู่ที่หัวฟอร์ม และกดได้
ได้เอกสาร ER Discharge Summary ของ visit ER นี้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 ข้อ 3 · Use case แพทย์ ER ลงนามแล้วกดพิมพ์
```

### TC-SBH-2079-007 - ตรวจสอบเอกสารที่พิมพ์จากเมนู Disposition และแท็บ Discharge Summary มีเนื้อหาเหมือนกันทุกช่อง

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จาก Disposition เก็บไฟล์ไว้
2. พิมพ์จากแท็บ Discharge Summary เก็บไฟล์ไว้
3. เทียบเอกสาร 2 ฉบับทีละส่วน

## Expected Result
เนื้อหาทุกส่วนทุกช่องเหมือนกัน
ต่างได้เฉพาะวันเวลาที่พิมพ์

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 ข้อ 5
```

### TC-SBH-2079-008 - ตรวจสอบหัวกระดาษแสดงตราและชื่อ ที่อยู่ เบอร์โทรของโรงพยาบาลสระบุรี

Status: Not Run · Priority: High · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-008
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวกระดาษหน้าแรก

## Expected Result
ซ้าย: ตราโรงพยาบาลสระบุรี
กลาง: "โรงพยาบาลสระบุรี" / "Saraburi Hospital" / "18 ถนนเทศบาล 4 ตำบลปากเพรียว อำเภอเมืองสระบุรี จังหวัดสระบุรี 18000" / "โทร. 036-343500"
ไม่มีชื่อหรือตราของโรงพยาบาลอื่น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 ข้อ 1, 2, 5 · ถ้า Dev-X ตั้งค่าโรงพยาบาลเป็นชื่ออื่น ให้เทียบกับข้อมูลตั้งค่าของ Dev-X แล้วจดไว้
```

### TC-SBH-2079-009 - ตรวจสอบหัวกระดาษด้านขวาแสดงวันเวลาที่พิมพ์และผู้สั่งพิมพ์โดยไม่แสดงสิทธิการรักษา

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-009
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > จดเวลาแล้วพิมพ์จากแท็บ
2. ดูหัวกระดาษด้านขวา

## Expected Result
แสดงวันเวลาที่พิมพ์ = เวลาที่กดพิมพ์ และผู้สั่งพิมพ์ = ผู้ใช้ที่ login
ไม่แสดงสิทธิการรักษา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 ข้อ 3 · รหัสแบบฟอร์มไม่ตรวจ (PO ข้อ 5 ให้ skip)
```

### TC-SBH-2079-010 - ตรวจสอบชื่อเอกสารแสดงสรุปการจำหน่ายผู้ป่วยฉุกเฉินและ ER Discharge Summary

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-010
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูชื่อเอกสารใต้หัวกระดาษ

## Expected Result
ชื่อเอกสาร "สรุปการจำหน่ายผู้ป่วยฉุกเฉิน" / "ER Discharge Summary"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 ข้อ 6
```

### TC-SBH-2079-011 - ตรวจสอบลำดับส่วนบนเอกสาร ER Discharge Summary

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-011
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ไล่ดูหัวส่วนจากบนลงล่างทุกหน้า

## Expected Result
ส่วนเรียงตามลำดับ:
1. หัวกระดาษ + ชื่อเอกสาร
2. ข้อมูลระบุตัวผู้ป่วย
3. ประวัติการแพ้
4. ER Physician Note
5. Order ที่ได้รับใน ER
6. Disposition
7. การลงนาม (สรุปโดย) ท้ายเอกสาร

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ลำดับ AC 3–8 · AC 4 "ต่อจากข้อมูลระบุตัวผู้ป่วย" · AC 7 ข้อ 9 "สรุปโดยอยู่ท้ายเอกสาร"
```

### TC-SBH-2079-012 - ตรวจสอบหัว Section ของเอกสารเป็นสีเทาเข้มไม่ใช่สีดำ

Status: Not Run · Priority: Low · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-012
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > เปิดแท็บ Discharge Summary และพิมพ์จากแท็บ
2. ดูแถบหัว Section (ประวัติการแพ้ · ER Physician Note · Order ที่ได้รับใน ER · Disposition)

## Expected Result
แถบหัว Section ทุกส่วนเป็นสีเทาเข้ม ไม่ใช่สีดำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: Note ในการ์ด (ภาพตัวอย่างหัวสีดำ → ให้เป็นเทาเข้ม)
```

### TC-SBH-2079-013 - ตรวจสอบข้อมูลระบุตัวผู้ป่วยตรงกับ Patient banner และ Encounter

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-013
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูส่วนข้อมูลระบุตัวผู้ป่วย
3. เทียบกับ Patient banner และข้อมูล Encounter ของ visit ER

## Expected Result
ชื่อ-สกุล · HN · EN · VN · วันเกิด · อายุ · เพศ · วันเวลาเปิด Visit ตรงกับ Patient banner / Encounter ทุกช่อง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3 ข้อ 1
```

### TC-SBH-2079-014 - ตรวจสอบวันเวลาจำหน่ายตรงกับวันเวลาที่ลงนาม Disposition

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-014
Case Type: Happy
Test Type: Functional

## Test Step
1. ใช้ผู้ป่วย A ที่จดเวลาบันทึกฉบับร่าง (T1) และเวลาลงนาม (T2) ห่างกัน ≥ 1 นาที
2. Login แพทย์ ER > พิมพ์จากแท็บ
3. ดูช่อง วันเวลาจำหน่าย

## Expected Result
วันเวลาจำหน่าย = T2 (เวลาลงนาม) ไม่ใช่ T1
เวลาตรงกับเวลาไทยที่ลงนามจริง ไม่คลาด 7 ชั่วโมง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3 ข้อ 2 แก้ตาม PO ข้อ 2 (อิงวันเวลาที่ลงนาม) · เช็กลิสต์วันที่ / เวลา (UTC)
```

### TC-SBH-2079-015 - ตรวจสอบประวัติแพ้ยาแสดงชื่อยา ประเภท สรุปอาการ Severity และผลการประเมินตามที่บันทึก

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-015
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูส่วนประวัติการแพ้ > แพ้ยา
3. เทียบกับรายการแพ้ยา Active ในประวัติการแพ้ของผู้ป่วย

## Expected Result
แสดงคอลัมน์ ชื่อยา/กลุ่ม · ประเภทของการแพ้ยา · สรุปอาการแพ้ · Severity · ผลการประเมิน
ค่าทุกช่องตรงกับที่บันทึกในประวัติการแพ้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 ข้อ 1, 2
```

### TC-SBH-2079-016 - ตรวจสอบประวัติแพ้อื่นๆ แสดงสิ่งที่แพ้ ประเภท สรุปอาการ และ Severity ตามที่บันทึก

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-016
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูส่วนประวัติการแพ้ > แพ้อื่นๆ
3. เทียบกับรายการแพ้อื่นๆ ในประวัติการแพ้ของผู้ป่วย

## Expected Result
แสดงคอลัมน์ สิ่งที่แพ้ · ประเภทการแพ้ · สรุปอาการแพ้ · Severity
ค่าทุกช่องตรงกับที่บันทึกในประวัติการแพ้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 ข้อ 3
```

### TC-SBH-2079-017 - ตรวจสอบส่วน ER Physician Note แสดงหัวข้อครบและชื่อหัวข้อตามฟอร์ม

Status: Not Run · Priority: High · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-017
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวข้อในส่วน ER Physician Note เทียบกับชื่อหัวข้อบนฟอร์ม ER Physician Note

## Expected Result
หัวส่วน "ER Physician Note" มี 10 หัวข้อ ชื่อตรงกับฟอร์ม:
Chief Complaint - General · Present illness general · Verified Underlying Disease · Vital signs · Glasgow Coma Scale ·
MEWS · การจำแนกผู้ป่วย · Body metric general · Physical examination · Body chart

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1 (ชื่อหัวข้อ)
```

### TC-SBH-2079-018 - ตรวจสอบ Chief Complaint - General และ Present illness general แสดงข้อความตามที่บันทึก

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-018
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวข้อ Chief Complaint - General และ Present illness general
3. เทียบกับ ER Physician Note ของ visit

## Expected Result
ข้อความทั้ง 2 หัวข้อตรงกับที่บันทึกใน ER Physician Note

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1
```

### TC-SBH-2079-019 - ตรวจสอบ Verified Underlying Disease แสดง Display ของรายการที่ Active

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-019
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวข้อ Verified Underlying Disease
3. เทียบกับรายการ Active ใน ER Physician Note

## Expected Result
แสดงชื่อ Display ของโรคที่ Active ทั้ง 2 รายการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1 · รายการ Inactive ตรวจที่ TC 059
```

### TC-SBH-2079-020 - ตรวจสอบ Vital signs แสดงค่ารายการล่าสุดใน ER Physician Note

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-020
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (Vital signs ใน Note 2 ชุดค่าต่างกัน) > พิมพ์จากแท็บ
2. ดูหัวข้อ Vital signs

## Expected Result
BP · PR · RR · BT · SpO₂ · Pain = ค่าชุดล่าสุดใน ER Physician Note
ไม่ใช่ค่าชุดแรก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1
```

### TC-SBH-2079-021 - ตรวจสอบ Glasgow Coma Scale แสดง E V M และ Total GCS ตามที่บันทึก

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-021
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวข้อ Glasgow Coma Scale เทียบกับ ER Physician Note

## Expected Result
Eye Opening (E) · Verbal Response (V) · Motor Response (M) · Total GCS ตรงกับที่บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1
```

### TC-SBH-2079-022 - ตรวจสอบ MEWS แสดง Total MEWS ตามที่บันทึก

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-022
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวข้อ MEWS เทียบกับ ER Physician Note

## Expected Result
Total MEWS ตรงกับที่บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1
```

### TC-SBH-2079-023 - ตรวจสอบการจำแนกผู้ป่วยแสดง Suspect Fast Track Type และประเภทฉุกเฉิน

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-023
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวข้อ การจำแนกผู้ป่วย เทียบกับ ER Physician Note

## Expected Result
Suspect Fast Track Type · ประเภทฉุกเฉิน ตรงกับที่บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1
```

### TC-SBH-2079-024 - ตรวจสอบ Body metric general แสดงน้ำหนัก ส่วนสูง และ BMI

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-024
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวข้อ Body metric general เทียบกับ ER Physician Note

## Expected Result
น้ำหนัก · ส่วนสูง · BMI ตรงกับที่บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1
```

### TC-SBH-2079-025 - ตรวจสอบ Physical examination แสดงสรุปผลการตรวจและผลรายระบบครบ 7 ระบบ

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-025
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวข้อ Physical examination เทียบกับ ER Physician Note

## Expected Result
แสดงสรุปผลการตรวจ และผลระบบ GA · HEENT · Heart · Lungs · Abdomen · Extremities · Neuro ตรงกับที่บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1
```

### TC-SBH-2079-026 - ตรวจสอบ Body chart แสดงรายการตำแหน่งและรายละเอียดโดยไม่พิมพ์ภาพ

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-026
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (Body chart ≥ 2 ตำแหน่ง) > พิมพ์จากแท็บ
2. ดูหัวข้อ Body chart

## Expected Result
แสดงรายการตำแหน่งและรายละเอียดครบทุกตำแหน่งที่บันทึก
ไม่มีภาพ Body chart ในเอกสาร

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1
```

### TC-SBH-2079-027 - ตรวจสอบเอกสารไม่แสดง Diagnosis general และ Note to nurse ของ ER Physician Note

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-027
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (Note มี Diagnosis general และ Note to nurse) > พิมพ์จากแท็บ
2. หาหัวข้อและข้อความของ Diagnosis general และ Note to nurse ทั้งเอกสาร

## Expected Result
ไม่มีหัวข้อ Diagnosis general และ Note to nurse
ไม่มีข้อความที่บันทึกใน 2 หัวข้อนี้ในเอกสาร

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 2
```

### TC-SBH-2079-028 - ตรวจสอบ Order ที่ได้รับใน ER แสดงครบทั้ง ORDER FOR ONE DAY และ ORDER FOR CONTINUE

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-028
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูส่วน Order ที่ได้รับใน ER
3. เทียบกับ Order ที่สั่งใน visit (ยกเว้นรายการที่ยกเลิก)

## Expected Result
แสดงทุก Order ของ visit ทั้ง ORDER FOR ONE DAY และ ORDER FOR CONTINUE
คอลัมน์ ORDER FOR = One day / Continue ตรงกับที่สั่ง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 ข้อ 1
```

### TC-SBH-2079-029 - ตรวจสอบ Order จัดกลุ่มและชื่อกลุ่มตรงกับหน้า Order Summary

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-029
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูชื่อกลุ่มในส่วน Order ที่ได้รับใน ER
3. เทียบกับหน้า Order Summary ของ visit เดียวกัน

## Expected Result
กลุ่มและชื่อกลุ่มตรงกับ Order Summary: ยา · เวชภัณฑ์ · หัตถการ · Instrument · รังสี - [modality] · ห้องปฏิบัติการ - [หมวด]
แต่ละรายการอยู่ในกลุ่มเดียวกับ Order Summary

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 ข้อ 2
```

### TC-SBH-2079-030 - ตรวจสอบตาราง Order มีเฉพาะคอลัมน์ ORDER FOR รายการ ความเร่งด่วน และจำนวน

Status: Not Run · Priority: High · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-030
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวคอลัมน์ทุกกลุ่มในส่วน Order ที่ได้รับใน ER

## Expected Result
มี 4 คอลัมน์: ORDER FOR (One day / Continue) · รายการ · ความเร่งด่วน · จำนวน
ไม่มีสถานะ · ราคา (รวม, เครดิต, จ่าย, ราคาต่อหน่วย, ราคารวม) · ลงนาม · Alert · Action · หมายเหตุ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 ข้อ 3, 5
```

### TC-SBH-2079-031 - ตรวจสอบรายการยาแสดงรายการ วิธีการใช้ และฉลากช่วยตาม Order

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-031
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูกลุ่มยา เทียบกับ Order ยาที่สั่ง

## Expected Result
แต่ละรายการแสดง "รายการ / วิธีการใช้ / ฉลากช่วย" ตรงกับ Order

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 ข้อ 4
```

### TC-SBH-2079-032 - ตรวจสอบรายการหัตถการต่อท้ายด้วยรหัส ICD9-CM

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-032
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูกลุ่มหัตถการ เทียบกับ Order หัตถการ

## Expected Result
ชื่อหัตถการตามด้วยรหัส ICD9-CM ของหัตถการนั้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 ข้อ 4
```

### TC-SBH-2079-033 - ตรวจสอบรายการห้องปฏิบัติการต่อท้ายด้วย Specimen

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-033
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูกลุ่มห้องปฏิบัติการ เทียบกับ Order Lab

## Expected Result
ชื่อรายการ Lab ตามด้วย Specimen ของรายการนั้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 ข้อ 4
```

### TC-SBH-2079-034 - ตรวจสอบส่วน Disposition เรียงหัวข้อตามลำดับฟอร์ม Disposition

Status: Not Run · Priority: High · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-034
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูหัวข้อในส่วน Disposition เทียบกับลำดับบนฟอร์ม Disposition

## Expected Result
หัวส่วน "Disposition" เรียง:
1. สรุปการจำหน่าย
2. ข้อมูล Visit
3. การวินิจฉัย
4. หัตถการ
5. NON OR PROCEDURE
6. ข้อมูลทางคลินิกและการดำเนินโรค
7. การตรวจเพิ่มเติมและผลการตรวจ
8. Discharge Instruction & Follow-up Plan
สรุปโดย อยู่ท้ายเอกสารเป็นช่องลงนาม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1
```

### TC-SBH-2079-035 - ตรวจสอบสถานะการจำหน่ายแสดงตัวเลือกครบ 9 ข้อและติ๊ก [X] ที่ค่าที่เลือก

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-035
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (สถานะ Improved) > พิมพ์จากแท็บ
2. ดู สรุปการจำหน่าย > สถานะการจำหน่าย

## Expected Result
แสดงครบ 9 ตัวเลือก: Complete Recovery · Improved · Not Improved · Normal Delivery · Un-Delivery ·
Normal child w/ mother · Normal child separately · Stillbirth · Dead
[X] เฉพาะ Improved

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (1) + ข้อ 2
```

### TC-SBH-2079-036 - ตรวจสอบวิธีการจำหน่ายแสดงตัวเลือกครบ 10 ข้อและติ๊ก [X] ที่ค่าที่เลือก

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-036
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (วิธี With Approval) > พิมพ์จากแท็บ
2. ดู สรุปการจำหน่าย > วิธีการจำหน่าย

## Expected Result
แสดงครบ 10 ตัวเลือก: With Approval · ปฎิเสธการรักษา · หนีกลับ · กลับก่อนได้รับการตรวจ · รับไว้รักษาต่อIPD ·
By Transfer · Dead Autopsy · Dead Non-Autopsy · เสียชีวิต · เสียชีวิตก่อนมาถึง
[X] เฉพาะ With Approval

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (1) + ข้อ 3
```

### TC-SBH-2079-037 - ตรวจสอบสาเหตุการเสียชีวิตแสดงต่อจากวิธีการจำหน่ายเมื่อมีบันทึก

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-037
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย C (เสียชีวิต + สาเหตุการเสียชีวิต) > พิมพ์จากแท็บ
2. ดู สรุปการจำหน่าย

## Expected Result
สถานะการจำหน่าย [X] Dead · วิธีการจำหน่าย [X] เสียชีวิต
ตามด้วยสาเหตุการเสียชีวิต ข้อความตรงกับที่บันทึกใน Disposition

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (1) + PO ข้อ 1
```

### TC-SBH-2079-038 - ตรวจสอบข้อมูล Visit แสดงวินิจฉัยโดยแพทย์

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-038
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดู Disposition > ข้อมูล Visit เทียบกับฟอร์ม Disposition

## Expected Result
แสดง "วินิจฉัย โดยแพทย์" ตรงกับฟอร์ม Disposition

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (2)
```

### TC-SBH-2079-039 - ตรวจสอบการวินิจฉัยแสดงรหัส - ชื่อโรค ประเภท และแพทย์ตามที่บันทึก

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-039
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (การวินิจฉัย ≥ 2 รายการ) > พิมพ์จากแท็บ
2. ดู Disposition > การวินิจฉัย เทียบกับฟอร์ม Disposition

## Expected Result
ทุกรายการแสดง รหัส - ชื่อโรค · ประเภท · แพทย์ ตรงกับที่บันทึก ครบทุกรายการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (3)
```

### TC-SBH-2079-040 - ตรวจสอบหัตถการแสดง Type Procedure Practitioner Start - End Date และ Site

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-040
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดู Disposition > หัตถการ เทียบกับฟอร์ม Disposition

## Expected Result
Type · Procedure · Practitioner · Start - End Date · Site ตรงกับที่บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (4)
```

### TC-SBH-2079-041 - ตรวจสอบ NON OR PROCEDURE แสดงครบ 22 ข้อและติ๊ก [X] ที่รายการที่เลือก

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-041
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (NON OR เลือก ≥ 2 ข้อ) > พิมพ์จากแท็บ
2. ดู Disposition > NON OR PROCEDURE เทียบกับฟอร์ม Disposition

## Expected Result
แสดงครบ 22 ข้อ ชื่อตรงกับฟอร์ม
[X] เฉพาะข้อที่เลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (5) · dev เพิ่มการบันทึก NON OR แล้ว (cortex-api #3001 · cortex-x #8906)
```

### TC-SBH-2079-042 - ตรวจสอบข้อมูลทางคลินิกและการดำเนินโรคแสดงข้อความตามที่บันทึก

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-042
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดู Disposition > ข้อมูลทางคลินิกและการดำเนินโรค เทียบกับฟอร์ม Disposition

## Expected Result
ข้อความตรงกับที่บันทึกครบทุกบรรทัด

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (6)
```

### TC-SBH-2079-043 - ตรวจสอบการตรวจเพิ่มเติมและผลการตรวจแสดงข้อความตามที่บันทึก

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-043
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดู Disposition > การตรวจเพิ่มเติมและผลการตรวจ เทียบกับฟอร์ม Disposition

## Expected Result
ข้อความตรงกับที่บันทึกครบทุกบรรทัด

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (7)
```

### TC-SBH-2079-044 - ตรวจสอบ Discharge Instruction & Follow-up Plan แสดงคำแนะนำผู้ป่วยและนัดติดตามตามที่บันทึก

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-044
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดู Disposition > Discharge Instruction & Follow-up Plan เทียบกับฟอร์ม Disposition

## Expected Result
คำแนะนำผู้ป่วย · นัดติดตาม/ Follow-up ข้อความตรงกับที่บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (8) + PO ข้อ 1
```

### TC-SBH-2079-045 - ตรวจสอบช่องลงนามแพทย์ผู้สั่งจำหน่ายแสดงชื่อ-สกุลและวันเวลาที่ลงนาม

Status: Not Run · Priority: Urgent · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-045
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูช่องลงนามท้ายเอกสาร เทียบกับ Disposition (แพทย์ผู้สั่งจำหน่าย · เวลาลงนาม T2)

## Expected Result
มีช่องลงชื่อ · ชื่อ-สกุลแพทย์ผู้สั่งจำหน่าย · วันเวลาที่ลงนาม (T2) ตรงกับ Disposition

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 8 ข้อ 1
```

### TC-SBH-2079-046 - ตรวจสอบแพทย์ร่วมทำแสดงชื่อเมื่อมีบันทึก

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-046
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (มีแพทย์ร่วมทำ) > พิมพ์จากแท็บ
2. ดูส่วนการลงนามท้ายเอกสาร

## Expected Result
แสดงชื่อแพทย์ร่วมทำตรงกับ Disposition

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 8 ข้อ 2
```

### TC-SBH-2079-047 - ตรวจสอบ Submit by แสดงชื่อและวันเวลาตรงกับแก้ไขล่าสุดโดยของ Disposition

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-047
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > เมนู Disposition จด "แก้ไขล่าสุดโดย: <ชื่อ> <วันเวลา>" ที่หัวฟอร์ม
2. พิมพ์จากแท็บ > ดู Submit by

## Expected Result
Submit by แสดงชื่อและวันเวลาตรงกับ "แก้ไขล่าสุดโดย" ของ Disposition

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 8 ข้อ 3
```

### TC-SBH-2079-048 - ตรวจสอบเอกสารพิมพ์เป็นกระดาษ A4 แนวตั้ง ฟอนต์ไทยอ่านได้ และไม่มี UI ของหน้าจอ

Status: Not Run · Priority: High · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-048
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ
2. ดูขนาด / แนวกระดาษ ภาษาไทย และองค์ประกอบในเอกสารทุกหน้า

## Expected Result
กระดาษ A4 แนวตั้ง
ภาษาไทยอ่านได้ ไม่เป็นสี่เหลี่ยม / สระลอย
ไม่มีเมนู ปุ่ม แท็บ หรือ UI อื่นของหน้าจอติดมา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 9 ข้อ 1
```

### TC-SBH-2079-049 - ตรวจสอบท้ายทุกหน้าแสดงผู้สั่งพิมพ์ วันเวลาที่พิมพ์ และหน้า x/y

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-049
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (เอกสาร ≥ 2 หน้า) > จดเวลาแล้วพิมพ์จากแท็บ
2. ดูท้ายกระดาษทุกหน้า

## Expected Result
ทุกหน้ามี ผู้สั่งพิมพ์ · วันเวลาที่พิมพ์ · "หน้า x/y"
x = เลขหน้านั้น · y = จำนวนหน้าทั้งหมด

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 9 ข้อ 2
```

### TC-SBH-2079-050 - ตรวจสอบหัวกระดาษแสดงซ้ำทุกหน้าเมื่อเอกสารมีหลายหน้า

Status: Not Run · Priority: Medium · QA Case : Happy · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-050
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (เอกสาร ≥ 2 หน้า) > พิมพ์จากแท็บ
2. ดูหัวกระดาษของหน้า 2 เป็นต้นไป

## Expected Result
หัวกระดาษ (ตรา · ชื่อ ที่อยู่ เบอร์โทร รพ. · ด้านขวา) แสดงครบทุกหน้าเหมือนหน้าแรก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 ข้อ 7
```

### TC-SBH-2079-051 - ตรวจสอบพยาบาลเปิดแท็บ Discharge Summary และพิมพ์ได้ด้วยสิทธิ์เดิม

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Security · QA : Manual

```
TC ID: TC-SBH-2079-051
Case Type: Happy
Test Type: Security

## Test Step
1. Login พยาบาล ER > เลือกผู้ป่วย A > ประวัติการรักษา > visit ER
2. เปิดแท็บ Discharge Summary
3. กดปุ่ม "พิมพ์"

## Expected Result
เห็นแท็บ Discharge Summary และเปิดเอกสารได้
กดพิมพ์ได้ ได้เอกสารเดียวกับที่แพทย์พิมพ์
ไม่มีช่องแก้ไข

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: Use case แพทย์ / พยาบาล ดูหรือพิมพ์ซ้ำ (อ่านอย่างเดียว) + PO ข้อ 3 (Role เดิม) · cortex-testing #1640 ให้สิทธิ์ er-discharge-summary:view
```

### TC-SBH-2079-052 - ตรวจสอบพิมพ์ใหม่หลังแก้ไขข้อมูลต้นทางแล้วได้ข้อมูลล่าสุด

Status: Not Run · Priority: High · QA Case : Happy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-052
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A > พิมพ์จากแท็บ จด Chief Complaint บนเอกสาร
2. เปิด ER Physician Note แก้ Chief Complaint เป็นข้อความใหม่ > บันทึก
3. กลับมาพิมพ์จากแท็บอีกครั้ง

## Expected Result
เอกสารครั้งที่ 2 แสดง Chief Complaint ข้อความใหม่
ไม่ใช่ข้อความตอนพิมพ์ครั้งแรก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 9 ข้อ 5 · เทคนิค: State Transition (พิมพ์ → แก้ต้นทาง → พิมพ์ใหม่) · ถ้าแก้ ER Physician Note หลังลงนามไม่ได้ ให้ใช้ประวัติการแพ้แทน
```

---

## TS-SBH-2079-UHP - ป้องกันการพิมพ์ก่อนลงนามและไม่แสดงข้อมูลที่ต้องตัดออก

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Disposition + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2079-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER — Disposition / ประวัติการรักษา > Discharge Summary
- Requirement ที่อ้างอิง: SBH-2079 — [ ER ] [ Disposition] Discharge summary

วัตถุประสงค์
- ยืนยันว่าพิมพ์ / ดู Discharge Summary ไม่ได้ก่อนลงนาม ลงนามเสียชีวิตโดยไม่ระบุสาเหตุไม่ได้ และเอกสารไม่ดึงข้อมูลที่การ์ดให้ตัดออก

ขอบเขต Requirement
- AC 1 ข้อ 4 (ยังไม่ลงนาม)
- ส่วนที่ 1 ช่องสาเหตุการเสียชีวิต (บังคับ)
- AC 4 / AC 5 เฉพาะรายการ Active · AC 6 Order ที่ยกเลิก · PO ข้อ 4 Order ของหอผู้ป่วย

ความเสี่ยง
- เอกสารฉบับร่างหลุดออกไปก่อนแพทย์ลงนาม
- เอกสารแสดงยาที่ยกเลิก / ข้อมูลแพ้ที่เลิกใช้ → ผู้อ่านเข้าใจผิด
- Order ของหอผู้ป่วยปนใน ER Discharge Summary

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ระบุในแต่ละ TC (ดูหัวข้อข้อมูลตั้งต้น)
```

### TC-SBH-2079-053 - ตรวจสอบปุ่มพิมพ์ Discharge Summary ในเมนู Disposition ถูกปิดเมื่อยังไม่ลงนาม

Status: Not Run · Priority: Urgent · QA Case : Unhappy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-053
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด visit ER ของผู้ป่วย B (Disposition ฉบับร่าง ยังไม่ลงนาม) > เมนู Disposition
2. ดูปุ่ม "พิมพ์ Discharge Summary" ที่หัวฟอร์ม แล้วลองกด

## Expected Result
ปุ่มพิมพ์ Discharge Summary ถูกปิด กดแล้วไม่ได้เอกสาร

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 ข้อ 4 · Use case "พิมพ์ได้หลังลงนามแล้วเท่านั้น" · เทคนิค: State Transition (ยังไม่ลงนาม)
```

### TC-SBH-2079-054 - ตรวจสอบแท็บ Discharge Summary แสดงข้อความยังไม่มีเอกสารเมื่อยังไม่ลงนาม

Status: Not Run · Priority: High · QA Case : Unhappy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-054
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เลือกผู้ป่วย B > ประวัติการรักษา > visit ER
2. เปิดแท็บ Discharge Summary

## Expected Result
แสดง "ยังไม่มี Discharge Summary เพราะยังไม่ลงนามการจำหน่าย"
ไม่มีเอกสาร และพิมพ์ไม่ได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 ข้อ 4 · เทคนิค: State Transition (ยังไม่ลงนาม)
```

### TC-SBH-2079-055 - ตรวจสอบลงนาม Disposition ไม่ได้เมื่อเลือกเสียชีวิตแต่ไม่กรอกสาเหตุการเสียชีวิต

Status: Not Run · Priority: High · QA Case : Unhappy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-055
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด visit ER ของผู้ป่วย C (ก่อนลงนาม) > เมนู Disposition
2. กรอกช่องบังคับอื่นครบ · วิธีการจำหน่าย เลือก "เสียชีวิต" · เว้นช่องสาเหตุการเสียชีวิตว่าง
3. กดลงนาม

## Expected Result
ลงนามไม่สำเร็จ
แจ้งให้กรอกช่องสาเหตุการเสียชีวิต

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ส่วนที่ 1 ข้อ 2 — ช่องมี * บังคับในภาพของการ์ด · ข้อความแจ้งเตือนการ์ดไม่ระบุ จดข้อความจริงไว้
```

### TC-SBH-2079-056 - ตรวจสอบ Order ที่ยกเลิกไม่แสดงในเอกสาร

Status: Not Run · Priority: High · QA Case : Unhappy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-056
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (ยกเลิกยา 1 รายการ) > พิมพ์จากแท็บ
2. หาชื่อยาที่ยกเลิกในส่วน Order ที่ได้รับใน ER

## Expected Result
ไม่มีรายการยาที่ยกเลิก
Order อื่นที่ไม่ได้ยกเลิกยังแสดงครบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 ข้อ 6
```

### TC-SBH-2079-057 - ตรวจสอบ Order ที่หอผู้ป่วยสั่งหลังได้เตียงไม่แสดงในเอกสาร

Status: Not Run · Priority: High · QA Case : Unhappy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-057
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย E > เปิดแท็บ Discharge Summary ของ visit ER > พิมพ์
2. หา Order ชุดที่ 3 (หอผู้ป่วยสั่งหลังได้เตียง) ในส่วน Order ที่ได้รับใน ER

## Expected Result
ไม่มี Order ชุดที่ 3 (Order ผู้ป่วยในที่มี Ward และเตียง)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: PO ข้อ 4 · เทคนิค: EP กลุ่ม "หอผู้ป่วยสั่งหลังได้เตียง" · cortex-api #3007
```

### TC-SBH-2079-058 - ตรวจสอบประวัติการแพ้ที่ไม่ Active ไม่แสดงในเอกสาร

Status: Not Run · Priority: High · QA Case : Unhappy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-058
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (แพ้ยา Active 1 + Inactive 1) > พิมพ์จากแท็บ
2. ดูส่วนประวัติการแพ้ > แพ้ยา

## Expected Result
ไม่มีรายการแพ้ยาที่ Inactive
รายการ Active ยังแสดง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 ข้อ 1 "เฉพาะรายการที่ Active"
```

### TC-SBH-2079-059 - ตรวจสอบโรคประจำตัวที่ไม่ Active ไม่แสดงใน Verified Underlying Disease

Status: Not Run · Priority: Medium · QA Case : Unhappy · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-059
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (U/D Active 2 + Inactive 1) > พิมพ์จากแท็บ
2. ดูหัวข้อ Verified Underlying Disease

## Expected Result
ไม่มีโรคที่ Inactive
โรค Active ทั้ง 2 รายการยังแสดง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 1 "แสดง Display ที่ Active"
```

---

## TS-SBH-2079-EDG - เอกสารเมื่อข้อมูลว่าง รอเตียง Note หลายฉบับ หลายหน้า และค่าขอบของช่องข้อความ

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Disposition + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-2079-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER — Disposition / ประวัติการรักษา > Discharge Summary
- Requirement ที่อ้างอิง: SBH-2079 — [ ER ] [ Disposition] Discharge summary

วัตถุประสงค์
- ยืนยันว่าเอกสารแสดงข้อความ / "-" ถูกต้องเมื่อไม่มีข้อมูล เลือกแหล่งข้อมูลถูกเมื่อมีหลายฉบับหรือผู้ป่วยรอเตียง แบ่งหน้าไม่ตัดแถว และช่องข้อความใหม่รับได้ไม่เกิน 1000 ตัวอักษร

ขอบเขต Requirement
- AC 4 / 6 / 7 กรณีไม่มีข้อมูล · AC 7 สาเหตุการเสียชีวิตเมื่อไม่มีบันทึก
- AC 5 ฉบับคอมโพเนนต์ / ฉบับเดิม · AC 9 ข้อ 3 หลายหน้า
- PO ข้อ 4 Order ระหว่างรอเตียง · ส่วนที่ 1 ตัวนับ 1000 ตัวอักษร

ความเสี่ยง
- เอกสารว่าง / ช่องหายเมื่อไม่มีข้อมูล → ผู้อ่านไม่รู้ว่าไม่มีหรือระบบไม่ดึง
- ข้อมูลแพทย์ซ้ำ 2 ชุดหรือหายเมื่อมี Note หลายฉบับ
- Order ระหว่างรอเตียงหาย ทั้งที่ผู้ป่วยยังรักษาใน ER
- แถวตารางถูกตัดครึ่งระหว่างหน้า อ่านไม่ได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ระบุในแต่ละ TC (ดูหัวข้อข้อมูลตั้งต้น)
```

### TC-SBH-2079-060 - ตรวจสอบประวัติการแพ้แสดงข้อความไม่มีประวัติเมื่อไม่มีรายการแพ้

Status: Not Run · Priority: Medium · QA Case : Edge · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-060
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย D (ไม่มีประวัติแพ้) > พิมพ์จากแท็บ
2. ดูส่วนประวัติการแพ้

## Expected Result
แพ้ยา: "ไม่มีประวัติแพ้ยาที่บันทึกไว้"
แพ้อื่นๆ: "ไม่มีประวัติแพ้อื่นๆ ที่บันทึกไว้"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 ข้อ 4
```

### TC-SBH-2079-061 - ตรวจสอบส่วน Order แสดงข้อความเมื่อไม่มี Order ใน visit

Status: Not Run · Priority: Medium · QA Case : Edge · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-061
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย D (ไม่สั่ง Order) > พิมพ์จากแท็บ
2. ดูส่วน Order ที่ได้รับใน ER

## Expected Result
แสดง "ไม่มี Order ใน visit นี้"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 ข้อ 7
```

### TC-SBH-2079-062 - ตรวจสอบช่องในส่วน Disposition ที่ไม่มีข้อมูลแสดงเครื่องหมายขีด

Status: Not Run · Priority: Medium · QA Case : Edge · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-062
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย D (Disposition กรอกเฉพาะช่องบังคับ) > พิมพ์จากแท็บ
2. ดูช่องในส่วน Disposition ที่ไม่ได้กรอก (เช่น หัตถการ · Discharge Instruction & Follow-up Plan)

## Expected Result
ช่องที่ไม่มีข้อมูลแสดง "-"
ไม่เว้นว่างและไม่ซ่อนหัวข้อ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 4
```

### TC-SBH-2079-063 - ตรวจสอบไม่แสดงสาเหตุการเสียชีวิตเมื่อวิธีการจำหน่ายไม่ใช่เสียชีวิต

Status: Not Run · Priority: Medium · QA Case : Edge · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-063
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย D (วิธี With Approval) > พิมพ์จากแท็บ
2. ดู Disposition > สรุปการจำหน่าย

## Expected Result
ไม่มีบรรทัดสาเหตุการเสียชีวิตต่อจากวิธีการจำหน่าย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 ข้อ 1 (1) "ตามด้วยสาเหตุการเสียชีวิตเมื่อมีบันทึก"
```

### TC-SBH-2079-064 - ตรวจสอบ Order ที่สั่งระหว่างรอเตียงใน ER แสดงในเอกสาร

Status: Not Run · Priority: High · QA Case : Edge · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-064
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย E > เปิดแท็บ Discharge Summary ของ visit ER > พิมพ์
2. หา Order ชุดที่ 1 (สั่งใน ER) และชุดที่ 2 (สั่งระหว่างรอเตียง)

## Expected Result
Order ชุดที่ 1 และชุดที่ 2 แสดงครบในส่วน Order ที่ได้รับใน ER

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: PO ข้อ 4 · เทคนิค: EP กลุ่ม "สั่งใน ER" + "สั่งระหว่างรอเตียง" · cortex-api #3007
```

### TC-SBH-2079-065 - ตรวจสอบเอกสารใช้ ER Physician Note ฉบับคอมโพเนนต์ชุดเดียวเมื่อมีทั้งฉบับคอมโพเนนต์และฉบับเดิม

Status: Not Run · Priority: High · QA Case : Edge · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-065
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย F (Note 2 ฉบับ Chief Complaint คนละข้อความ) > พิมพ์จากแท็บ
2. ดูส่วน ER Physician Note

## Expected Result
Chief Complaint = ข้อความของฉบับคอมโพเนนต์
ส่วน ER Physician Note แสดงชุดเดียว ไม่มีข้อมูลฉบับเดิมซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 3
```

### TC-SBH-2079-066 - ตรวจสอบเอกสารใช้บันทึกแพทย์ฉบับเดิมเมื่อไม่มี ER Physician Note ฉบับคอมโพเนนต์

Status: Not Run · Priority: High · QA Case : Edge · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-066
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย G (มีเฉพาะบันทึกแพทย์ฉบับเดิม) > พิมพ์จากแท็บ
2. ดูส่วน ER Physician Note เทียบกับบันทึกแพทย์ฉบับเดิม

## Expected Result
ส่วน ER Physician Note แสดงข้อมูลจากบันทึกแพทย์ฉบับเดิม (ชุดเดียว)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 ข้อ 3 · ดูคำถามข้อ 6 (หา visit ที่มีเฉพาะฉบับเดิม)
```

### TC-SBH-2079-067 - ตรวจสอบตารางที่ยาวเกินหน้าต่อขึ้นหน้าใหม่โดยไม่ตัดกลางแถว

Status: Not Run · Priority: Medium · QA Case : Edge · QA Type : UIUX · QA : Manual

```
TC ID: TC-SBH-2079-067
Case Type: Edge
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > ผู้ป่วย A (Order มากจนตารางล้นหน้า) > พิมพ์จากแท็บ
2. ดูรอยต่อระหว่างหน้าของตาราง

## Expected Result
ตารางต่อขึ้นหน้าใหม่
ไม่มีแถวถูกตัดครึ่งระหว่างหน้า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 9 ข้อ 3
```

### TC-SBH-2079-068 - ตรวจสอบช่องสาเหตุการเสียชีวิตรับได้สูงสุด 1000 ตัวอักษร

Status: Not Run · Priority: Low · QA Case : Edge · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-068
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย C (ก่อนลงนาม) > เมนู Disposition > วิธีการจำหน่าย "เสียชีวิต"
2. กรอกสาเหตุการเสียชีวิต 1000 ตัวอักษร
3. พิมพ์เพิ่มอีก 1 ตัวอักษร

## Expected Result
1000 ตัวอักษรรับได้ ตัวนับแสดง 1000 / 1000
ตัวที่ 1001 ไม่เข้า ตัวนับยังเป็น 1000 / 1000

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ส่วนที่ 1 ข้อ 2 · เทคนิค: BVA — ขอบบน 1000 (ตัวนับ "0 / 1000" ในภาพของการ์ด)
```

### TC-SBH-2079-069 - ตรวจสอบช่องคำแนะนำผู้ป่วยรับได้สูงสุด 1000 ตัวอักษร

Status: Not Run · Priority: Low · QA Case : Edge · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-069
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย B > เมนู Disposition > Discharge Instruction & Follow-up Plan
2. กรอกคำแนะนำผู้ป่วย 1000 ตัวอักษร
3. พิมพ์เพิ่มอีก 1 ตัวอักษร

## Expected Result
1000 ตัวอักษรรับได้ ตัวนับแสดง 1000 / 1000
ตัวที่ 1001 ไม่เข้า ตัวนับยังเป็น 1000 / 1000

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ส่วนที่ 1 ข้อ 3 · เทคนิค: BVA — ขอบบน 1000 (ตัวนับในภาพของการ์ด)
```

### TC-SBH-2079-070 - ตรวจสอบช่องนัดติดตาม Follow-up รับได้สูงสุด 1000 ตัวอักษร

Status: Not Run · Priority: Low · QA Case : Edge · QA Type : Functional · QA : Manual

```
TC ID: TC-SBH-2079-070
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > ผู้ป่วย B > เมนู Disposition > Discharge Instruction & Follow-up Plan
2. กรอกนัดติดตาม/ Follow-up 1000 ตัวอักษร
3. พิมพ์เพิ่มอีก 1 ตัวอักษร

## Expected Result
1000 ตัวอักษรรับได้ ตัวนับแสดง 1000 / 1000
ตัวที่ 1001 ไม่เข้า ตัวนับยังเป็น 1000 / 1000

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ส่วนที่ 1 ข้อ 3 · เทคนิค: BVA — ขอบบน 1000 (ตัวนับในภาพของการ์ด)
```

---

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - ช่องสาเหตุการเสียชีวิตขึ้นเฉพาะวิธี "เสียชีวิต" หรือรวม Dead Autopsy / Dead Non-Autopsy / เสียชีวิตก่อนมาถึง / สถานะ Dead ด้วย — การ์ดบอกแค่ "เลือก เสียชีวิต"
  - เลือกเสียชีวิต กรอกสาเหตุ แล้วเปลี่ยนวิธีการจำหน่ายเป็นอย่างอื่น — ช่องหายและค่าที่กรอกถูกล้างหรือไม่
  - ส่วน ER Physician Note เมื่อ visit ไม่มีบันทึกแพทย์เลย (ทั้ง 2 ฉบับ) แสดงอะไร — "-" กำหนดไว้เฉพาะส่วน Disposition
  - แพทย์ร่วมทำเมื่อไม่มีบันทึก — ซ่อนหรือแสดง "-"
  - รูปแบบวันเวลาบนเอกสาร (ปี พ.ศ. / ค.ศ. · มีวินาทีหรือไม่) — การ์ดไม่ระบุ
  - คอลัมน์ ความเร่งด่วน / จำนวน ของ Order ประเภทที่ไม่มีค่านี้ แสดงอะไร
- **Validation**
  - คำแนะนำผู้ป่วย / นัดติดตาม เป็นช่องบังคับหรือไม่ (ภาพไม่มี *)
- **Error handling**
  - สร้างเอกสารไม่สำเร็จ / บันทึกประวัติการพิมพ์ล้มเหลว (dev แจ้งว่าผู้ใช้อาจได้เอกสารแต่ไม่มีประวัติ) — PO ยังไม่ตอบเรื่อง "ขอรับทราบ" 2 ข้อ (Audit · ลายเซ็น)
- **Permission / role**
  - "เวชระเบียน" ใน Use case คือ role ไหน (dev ถาม medical-statistician) — PO ตอบ "Role เดิม" แต่ไม่ระบุว่าเวชระเบียนต้องพิมพ์ได้หรือไม่
- **Edge cases**
  - ลงนาม → เปิดแก้ไข (reopen) → ระหว่างยังไม่ลงนามใหม่ ปุ่มพิมพ์ / แท็บเป็นสถานะไหน · วันเวลาจำหน่ายใช้เวลาลงนามครั้งไหน
  - Order ที่สั่งระหว่างรอเตียงแต่ยากจะแยกจาก Order หอผู้ป่วย (dev ถามว่าใช้เวลาสั่งเทียบเวลาออก ER ได้หรือไม่) — PO ยังไม่ตอบวิธีจัดการ
  - ลายเซ็นรับรองเฉพาะ Disposition แต่ส่วนอื่นเป็นข้อมูลล่าสุดตอนพิมพ์ (dev เสนอ) — PO ยังไม่ยืนยัน

## คำถามก่อนสร้างใน Linear

1. **Version**: label การ์ด VERSION 2.9.1 แต่ PR เป็น [V2.10.0] — ใช้ **2.9.1** ตาม label (แนะนำ) หรือ 2.10.0
2. **Environment**: Dev-X / SBH Prod (แนะนำ ตามชุดเดิม) · ⚠️ ถ้ารันบน SBH Prod ผู้ป่วย A–G เป็นข้อมูลจริง
3. **QA Sub-module / Feature**: ใช้ `Disposition` ที่มีอยู่แล้ว (แนะนำ) หรือสร้างใหม่ `Discharge Summary` · QA Module = ER · Run Type = CT (การ์ดผูก Cycle)
4. AC "อ่านจากข้อมูลตั้งค่าโรงพยาบาล ไม่ hard-code" — ไม่สร้าง TC (แนะนำ เพราะต้องแก้ตั้งค่าโรงพยาบาล) หรือเพิ่ม TC ทดสอบเฉพาะ Dev-X
5. AC "ทุกครั้งที่พิมพ์ ระบบบันทึกผู้พิมพ์และวันเวลา" — ไม่สร้าง TC จนกว่ารู้หน้าที่ดูได้ (แนะนำ) หรือเพิ่ม TC ตรวจผ่าน API / log
6. TC 066 (บันทึกแพทย์ฉบับเดิม) — ใช้ visit เก่าที่มีอยู่ หรือยังสร้างฉบับเดิมได้บน Dev-X — ถ้าหาไม่ได้จะตัด TC นี้ออก
