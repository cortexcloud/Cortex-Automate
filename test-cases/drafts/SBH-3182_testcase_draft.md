# Draft Test Structure — SBH-3182

> สถานะ: **สร้างใน Linear แล้ว (2026-10-31)** — ผู้ใช้พิมพ์ "สร้างได้ ตามที่แนะนำ"
> - EXE SBH-3456 (EXE - CT - 2.10.0) → HPY SBH-3459 (TC 001–039) · UHP SBH-3461 (TC 040 = SBH-3521) · EDG SBH-3464 (TC 041–059)
> - เลข TC → SBH: 001=3468 · 002=3470 · 003=3472 · 004=3474 · 005=3476 · 006=3479 · 007=3480 · 008=3481 · 009=3482 · 010=3483 · 011–020=3484–3493 · 021–030=3494–3503 ·
>   031=3504 · 032=3505 · 033=3507 · 034=3509 · 035=3511 · 036=3512 · 037=3515 · 038=3517 · 039=3519 · 040=3521 · 041=3524 · 042=3526 · 043=3528 · 044=3531 · 045=3533 ·
>   046=3535 · 047=3537 · 048=3539 · 049=3541 · 050=3543 · 051=3546 · 052=3549 · 053=3550 · 054=3551 · 055=3552 · 056=3554 · 057=3555 · 058=3557 · 059=3559 (เลขกระโดดเพราะทีมสร้างการ์ดอื่นพร้อมกัน)
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee Suchat ทุกใบ · milestone ER - เก็บตก, edge case · TC ใช้ label `QA : Manual` · connector เป็นบัญชี Suchat (สร้างโดย = Suchat)
> - Env = Dev-X / SBH Prod · สร้าง label ใหม่ `QA Sub-module / Feature : ER Summary` (id 9262b2fa) · TC ที่ขัดกับงาน dev ยึด AC ให้ BA ตัดสินตอนรัน — ผู้ใช้เลือกตามที่แนะนำทั้ง 3 ข้อ
> - Scenario HPY / EDG ใส่คำอธิบายผู้ป่วยที่ใช้ (A–G, T1–T3, H, I) ไว้ในหมายเหตุ
> - ชุดนี้ = EXE 1 + Scenario 3 (HPY / UHP / EDG) + TC 59 = 63 ใบ
> - การ์ดมี AC 2 ชุด: **Non-Trauma** (6 ส่วนที่เพิ่ม) และ **Trauma** (6 ข้อ) — รวมเป็น EXE เดียว
> - ชื่อหัวข้อ / คอลัมน์บนจอเทียบกับไฟล์ "ER Summary Prototype View.html" ที่แนบในการ์ด
> - คอมเมนต์ dev (jetsadaporn, 29 ต.ค.) มี Implementation notes 11 ข้อที่ทำต่างจาก AC — **TC ยึด AC** แล้วติดหมายเหตุ ⚠️ ที่ TC ที่น่าจะไม่ผ่าน (ดูหัวข้อ "จุดที่ AC กับงาน dev ขัดกัน")
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ⚠️ การ์ดสถานะ In Review · PR ยังเป็น draft (cortex-api #2958 · cortex-ui #2563) — ต้องเช็กว่าขึ้น dev-x แล้วก่อนรัน
> - ⚠️ Linear connector เปลี่ยนบัญชีได้ — เรียก whoami ก่อนสร้าง · assignee ใส่ ID ของ Suchat (`ac7ed47a-b74d-4a54-992f-5d09acad47f2`)

Requirement: SBH-3182 — [ER ] [ ER Summary ] Created ER Summary Trauma/Non-Trauma
URL: https://linear.app/cortexcloud/issue/SBH-3182/er-er-summary-created-er-summary-traumanon-trauma
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: In Review
Labels: Natthaphat ( MOD ) 🙈 · 🍄 Improvement · VERSION 2.10.0 · Assignee: jetsadaporn (Dew) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat (MOD)
Sub-Issue: SBH-3356 [ER] [MEWS] Restyle MEWS reference viewer (Triage — ไม่เกี่ยวกับ TC ชุดนี้) · ยังไม่มี EXE / TC
Related: SBH-1038 · SBH-1678 · SBH-2058 · SBH-2952 · SBH-2951 · SBH-2593 · SBH-2079 · SBH-1346
Scope / Version = 2.10.0 (label VERSION 2.10.0 ของการ์ด)

## AC → TC

| ชุด | AC | ความหมายที่ใช้ทดสอบ | TC |
|---|---|---|---|
| NT | ลำดับส่วนบนหน้า | 11 ส่วนเรียงตามการ์ด (ครอบ "แสดงต่อจาก…" ของทุกส่วน) | 001 |
| NT | 1 ข้อมูลการรักษาที่ ER | 8 ช่อง · รูปแบบเวลา · แพทย์จาก care team · เวลาใน ER 3 รูปแบบ · visit ยังไม่จำหน่าย | 002 · 003 · 004 · 041–045 |
| NT | 2 โรคประจำตัวและการแพ้ | 3 ช่องจากแหล่งที่การ์ดระบุ · U/D ใช้ประวัติทางการแพทย์เมื่อ Triage ไม่มี · ไม่มีข้อมูล | 005 · 006 · 007 · 046 · 047 |
| NT | 3 Vital signs | คอลัมน์ · ทุกครั้งรวมคัดกรองซ้ำ เรียงเวลา · แรกรับ / ล่าสุด | 008 · 009 · 010 |
| NT | 4 Order ที่ได้รับ | ครบ One day + Continue · กลุ่ม + จำนวน · คอลัมน์ · รายละเอียดยา · ยกเลิกขีดฆ่า · ตรง Order Summary · ไม่มี Order | 011–016 · 048 |
| NT | 5 Consult | ช่องที่แสดง · เวลาตรง Timeline · รอตอบรับ · ไม่มี Consult | 017 · 018 · 049 · 050 |
| NT | 6 การจำหน่าย | ช่องที่แสดง · ปลายทาง Admit / Refer / กลับบ้าน · ตรงรายการซ้าย · ยังไม่จำหน่าย | 019–023 · 051 |
| NT | Use case อ่านอย่างเดียว | ไม่มีช่องให้กรอก | 040 |
| T | ลำดับส่วนบนหน้า (Trauma) | 14 ส่วนเรียงตามการ์ด | 024 |
| T | 1 เงื่อนไขแสดงส่วน Trauma | หัวฟอร์ม ER Trauma Exam · Non-Trauma ไม่แสดง · แก้ประเภทใช้ค่าล่าสุด · ข้อมูลการรักษาแสดง Trauma + Fast Track Type | 025 · 026 · 027 · 052 · 053 |
| T | 2 การนำส่ง | ช่องที่แสดง · ตาราง 5 ข้อ · ค่าเป็นคำ · Walk-in · ไม่มีข้อมูล | 028 · 029 · 030 · 054 · 055 |
| T | 3 ข้อมูลการบาดเจ็บ | ยังไม่บันทึก Trauma Detail Form (ข้ออื่นถูกขีดฆ่าในการ์ด) | 056 |
| T | 4 RTS + Primary Survey | การแสดง RTS · สูตร · Incomplete · Primary Survey · ยังไม่บันทึก | 031 · 032 · 033 · 057 · 058 |
| T | 5 PE Trauma / Compression / Body chart | PE แทนของเดิม · สรุปแถวบน · Compression · Body chart + ดูภาพ · ไม่มี Body chart | 034–038 · 059 |
| T | 6 Diagnosis | Primary + Secondary + ICD-10 | 039 |

> เทคนิค: เวลาใน ER ใช้ EP 3 กลุ่ม (นาที / ชม. นาที / วัน ชม.) + BVA 2 ขอบตามเกณฑ์ในการ์ด (60 นาที · 24 ชม.) — ใช้ visit ที่ยังไม่จำหน่ายเพราะเวลานับถึงตอนเปิดหน้า คุมนาทีได้ ·
> ประเภทฉุกเฉินใช้ State Transition (Non-Trauma → Trauma · Trauma → Non-Trauma) · ค่าการดูแลระหว่างนำส่งใช้ EP กลุ่มละ 1 ค่า (0 / 1 / 2 / 3 / N)

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | ตรวจสอบลำดับส่วนบนหน้า ER Summary ของ visit Non-Trauma | 11 ส่วนเรียง ER Physician Note → ข้อมูลการรักษาที่ ER → อาการนำ → โรคประจำตัวและการแพ้ → Diagnosis → Vital signs → GCS/MEWS/Fast Track → PE → Order ที่ได้รับ → Consult → การจำหน่าย |
| 002 | HPY | ตรวจสอบส่วนข้อมูลการรักษาที่ ER แสดงข้อมูล 8 ช่องตรงกับ visit | EN · วิธีการมาถึง · ระดับคัดกรองครั้งแรกและโซน · ประเภทฉุกเฉิน · เวลามาถึง · เวลาออกจาก ER · เวลาใน ER · แพทย์ผู้รับผิดชอบ ตรงกับ visit |
| 003 | HPY | ตรวจสอบเวลามาถึงและเวลาออกจาก ER แสดงเวลาไทยปี พ.ศ. รูปแบบ dd/MM/yyyy HH:mm | รูปแบบ dd/MM/yyyy HH:mm · ปี พ.ศ. · ตรงเวลาจริง (ไม่คลาด 7 ชม.) |
| 004 | HPY | ตรวจสอบแพทย์ผู้รับผิดชอบมาจาก care team ของ ER encounter | แพทย์ผู้รับผิดชอบ = แพทย์ใน care team ของ ER encounter |
| 005 | HPY | ตรวจสอบโรคประจำตัวแสดงค่าที่บันทึกใน Triage ของ visit นี้ | โรคประจำตัว (U/D) = ค่าที่บันทึกใน Triage |
| 006 | HPY | ตรวจสอบประวัติแพ้ยาแสดงชื่อยาและอาการจากประวัติการแพ้ | แสดงชื่อยาและอาการตรงกับประวัติการแพ้ |
| 007 | HPY | ตรวจสอบยาที่ใช้ประจำแสดงรายการจาก Reconcile Med | แสดงรายการยาตรงกับ Reconcile Med |
| 008 | HPY | ตรวจสอบคอลัมน์ตาราง Vital signs | คอลัมน์ เวลา · BP · PR · RR · BT · SpO₂ · Pain · ไม่มีชื่อพยาบาล / ผู้บันทึก |
| 009 | HPY | ตรวจสอบ Vital signs แสดงทุกครั้งรวมการคัดกรองซ้ำบนหน้า Overview เรียงตามเวลา | 3 แถว (Triage + คัดกรองซ้ำ 2 ครั้ง) เรียงเวลา ค่าตรงที่บันทึก |
| 010 | HPY | ตรวจสอบแถวแรกของ Vital signs ต่อท้ายแรกรับและแถวสุดท้ายต่อท้ายล่าสุด | แถวแรก "แรกรับ" · แถวสุดท้าย "ล่าสุด" |
| 011 | HPY | ตรวจสอบ Order ที่ได้รับแสดงทุกรายการทั้ง One day และ Continue | แสดงครบทุกรายการ · ประเภท Order ตรง One day / Continue |
| 012 | HPY | ตรวจสอบ Order แบ่งกลุ่มพร้อมจำนวนรายการที่หัวกลุ่ม | กลุ่ม ยาและสารน้ำ / Lab / Imaging และหัตถการ · หัวกลุ่มแสดงจำนวนถูก |
| 013 | HPY | ตรวจสอบคอลัมน์ตาราง Order ที่ได้รับ | คอลัมน์ ประเภท Order · รายการ · เวลาสั่ง · สถานะ |
| 014 | HPY | ตรวจสอบรายการยาแสดงชื่อยา ขนาด และวิธีให้ | ชื่อยา ขนาด วิธีให้ ตรงกับที่สั่ง |
| 015 | HPY | ตรวจสอบ Order ที่ยกเลิกแสดงขีดฆ่าพร้อมสถานะยกเลิก | ยังแสดงรายการ · ชื่อขีดฆ่า · สถานะ "ยกเลิก" |
| 016 | HPY | ตรวจสอบรายการและจำนวน Order ตรงกับหน้า Order Summary ของ visit เดียวกัน | รายการและจำนวนทุกกลุ่มตรงกับ Order Summary |
| 017 | HPY | ตรวจสอบส่วน Consult แสดงแผนก แพทย์ สถานะ เวลาขอ และเวลาตอบรับ | ค่าทุกคอลัมน์ตรงกับ Consult ที่ขอ · สถานะตอบรับแล้ว |
| 018 | HPY | ตรวจสอบเวลาขอและเวลาตอบรับ Consult ตรงกับแท็บ Timeline | เวลาขอ / เวลาตอบรับ ตรงกับ Timeline |
| 019 | HPY | ตรวจสอบส่วนการจำหน่ายแสดงข้อมูลตาม Disposition ที่ลงนาม | ผลการจำหน่าย · สถานะการจำหน่าย · วิธีการจำหน่าย · เวลาลงนาม · แพทย์ผู้ลงนาม · คำแนะนำ/นัดหมาย ตรงกับ Disposition |
| 020 | HPY | ตรวจสอบปลายทางของผลการจำหน่าย Admit แสดงหอผู้ป่วยและ AN | ปลายทาง = หอผู้ป่วย + AN |
| 021 | HPY | ตรวจสอบปลายทางของ visit ที่ Admit ตรงกับรายการ visit ด้านซ้าย | AN ในส่วนการจำหน่าย = AN ใน "รับไว้ในโรงพยาบาล: AN" ด้านซ้าย |
| 022 | HPY | ตรวจสอบปลายทางของผลการจำหน่าย Refer แสดงโรงพยาบาลปลายทาง | ปลายทาง = โรงพยาบาลปลายทางที่ระบุใน Disposition |
| 023 | HPY | ตรวจสอบปลายทางของผลการจำหน่ายกลับบ้านแสดงนัดหมาย | แสดงนัดหมายของผู้ป่วย |
| 024 | HPY | ตรวจสอบลำดับส่วนบนหน้า ER Summary ของ visit Trauma | 14 ส่วนเรียงตามการ์ด · PE Trauma แทน PE ของ ER Physician Note |
| 025 | HPY | ตรวจสอบหัวฟอร์มแสดง ER Trauma Exam เมื่อประเภทฉุกเฉินเป็น Trauma | หัวฟอร์ม = "ER Trauma Exam" |
| 026 | HPY | ตรวจสอบไม่แสดงส่วน Trauma เมื่อประเภทฉุกเฉินเป็น Non-Trauma | ไม่มีส่วน Trauma ทั้ง 5 ส่วน · PE ใช้ของ ER Physician Note |
| 027 | HPY | ตรวจสอบข้อมูลการรักษาที่ ER แสดงประเภทฉุกเฉิน Trauma และ Suspect Fast Track Type | ประเภทฉุกเฉิน = Trauma · Fast Track Type ตรงกับ Triage |
| 028 | HPY | ตรวจสอบส่วนการนำส่งแสดงข้อมูล ER Arrival ที่บันทึกใน Triage | วิธีการมาถึง · ระดับ EMS · ผู้นำส่ง · ชื่อผู้นำส่ง/หน่วยงาน · ข้อมูลก่อนถึง รพ. ตรงกับ Triage |
| 029 | HPY | ตรวจสอบตารางการดูแลระหว่างนำส่งแสดงครบ 5 ข้อ | 5 ข้อ ดูแลการหายใจ · ห้ามเลือด · Splint/Slab C-Spine · Splint/Slab อื่นๆ · IV Fluid |
| 030 | HPY | ตรวจสอบค่าการดูแลระหว่างนำส่งแสดงเป็นคำไม่แสดงรหัส | 0 ไม่มี · 1 มี-เหมาะสม · 2 มี-ไม่เหมาะสม · 3 ไม่จำเป็น · N ไม่ระบุ · ไม่มีรหัสตัวเลข |
| 031 | HPY | ตรวจสอบ RTS แสดงค่าจริง คะแนนย่อย คะแนนรวม และสถานะ | ค่าจริง + คะแนนย่อย GCS / SBP / RR · คะแนนรวมทศนิยม · Complete |
| 032 | HPY | ตรวจสอบคะแนนรวม RTS คำนวณตามสูตรของ SBH-1678 | คะแนนรวม = 0.9368×GCS + 0.7326×SBP + 0.2908×RR (คะแนนย่อย) |
| 033 | HPY | ตรวจสอบ Primary Survey แสดงผลประเมิน A ถึง E ตามที่บันทึกใน ER Trauma Exam | A · B · C · D · E ตรงกับ ER Trauma Exam |
| 034 | HPY | ตรวจสอบ Physical Examination ของ visit Trauma ใช้ PE by system จาก ER Trauma Exam | ตาราง PE = PE by system ของ Trauma Exam · หน้าตาเดียวกับ PE เดิม |
| 035 | HPY | ตรวจสอบสรุปผลการตรวจแสดงในแถวบนสุดของตาราง PE Trauma | แถวบนสุด = สรุปผลการตรวจ |
| 036 | HPY | ตรวจสอบ Compression test แสดงผลของ Chest และ Pelvis | ผล Chest และ Pelvis ตรงกับ Trauma Exam |
| 037 | HPY | ตรวจสอบ Body chart แสดงจำนวนตำแหน่งและชื่อตำแหน่ง | จำนวน + ชื่อตำแหน่งตรงกับ Body chart ที่บันทึก |
| 038 | HPY | ตรวจสอบกดดูภาพแล้วเปิดภาพ Body chart แบบอ่านอย่างเดียว | เปิดภาพ Body chart · แก้ไข / วาดเพิ่มไม่ได้ |
| 039 | HPY | ตรวจสอบช่อง Diagnosis แสดง Primary และ Secondary พร้อมรหัส ICD-10 | Primary + Secondary พร้อมรหัส ICD-10 ตรงกับที่บันทึก |
| 040 | UHP | ตรวจสอบ ER Summary ไม่มีช่องให้กรอกหรือแก้ไขข้อมูล | ไม่มีช่องกรอก / ปุ่มบันทึก / ปุ่มแก้ไข ทุกส่วนที่เพิ่ม |
| 041 | EDG | ตรวจสอบเวลาใน ER แสดงเป็นนาทีเมื่ออยู่ใน ER 59 นาที | "59 นาที" |
| 042 | EDG | ตรวจสอบเวลาใน ER แสดงเป็นชั่วโมงและนาทีเมื่ออยู่ใน ER ครบ 60 นาที | "1 ชม. 0 นาที" |
| 043 | EDG | ตรวจสอบเวลาใน ER แสดงเป็นชั่วโมงและนาทีเมื่ออยู่ใน ER 23 ชั่วโมง 59 นาที | "23 ชม. 59 นาที" |
| 044 | EDG | ตรวจสอบเวลาใน ER แสดงเป็นวันและชั่วโมงเมื่ออยู่ใน ER ครบ 24 ชั่วโมง | "1 วัน 0 ชม." |
| 045 | EDG | ตรวจสอบเวลาออกจาก ER แสดงยังอยู่ใน ER เมื่อ visit ยังไม่จำหน่าย | เวลาออกจาก ER = "ยังอยู่ใน ER" |
| 046 | EDG | ตรวจสอบโรคประจำตัวใช้ประวัติทางการแพทย์เมื่อ Triage ของ visit นี้ไม่ได้บันทึก | U/D = ค่าจากประวัติทางการแพทย์ของผู้ป่วย |
| 047 | EDG | ตรวจสอบช่องโรคประจำตัว ประวัติแพ้ยา และยาที่ใช้ประจำแสดงไม่มีข้อมูลเมื่อไม่มีข้อมูล | ทั้ง 3 กล่องแสดง "ไม่มีข้อมูล" · ไม่ซ่อนช่อง |
| 048 | EDG | ตรวจสอบส่วน Order ที่ได้รับแสดงข้อความเมื่อไม่มี Order | "ไม่มี Order ใน visit นี้" |
| 049 | EDG | ตรวจสอบ Consult ที่ยังไม่ตอบรับแสดงสถานะรอตอบรับ | สถานะ "รอตอบรับ" · เวลาตอบรับ "-" |
| 050 | EDG | ตรวจสอบส่วน Consult แสดงข้อความเมื่อไม่มี Consult | "ไม่มี Consult ใน visit นี้" |
| 051 | EDG | ตรวจสอบส่วนการจำหน่ายแสดงยังไม่จำหน่ายเมื่อ visit ยังไม่จำหน่าย | ทั้งส่วนแสดง "ยังไม่จำหน่าย" |
| 052 | EDG | ตรวจสอบแสดงส่วน Trauma เมื่อแก้ประเภทฉุกเฉินจาก Non-Trauma เป็น Trauma | ใช้ค่าล่าสุด = Trauma · แสดงส่วน Trauma · หัว ER Trauma Exam |
| 053 | EDG | ตรวจสอบไม่แสดงส่วน Trauma เมื่อแก้ประเภทฉุกเฉินจาก Trauma เป็น Non-Trauma | ใช้ค่าล่าสุด = Non-Trauma · ไม่แสดงส่วน Trauma |
| 054 | EDG | ตรวจสอบส่วนการนำส่งของผู้ป่วย Walk-in แสดงเฉพาะวิธีการมาถึงและผู้นำส่ง | แสดงวิธีการมาถึง + ผู้นำส่ง · ไม่มีตารางการดูแลระหว่างนำส่ง |
| 055 | EDG | ตรวจสอบช่องในส่วนการนำส่งที่ไม่ได้บันทึกแสดงไม่มีข้อมูล | ข้อมูลก่อนถึงโรงพยาบาล = "ไม่มีข้อมูล" |
| 056 | EDG | ตรวจสอบส่วนข้อมูลการบาดเจ็บแสดงข้อความเมื่อยังไม่บันทึก Trauma Detail Form | "ยังไม่บันทึกข้อมูลการบาดเจ็บ" |
| 057 | EDG | ตรวจสอบสถานะ RTS แสดง Incomplete เมื่อค่าที่ใช้คำนวณไม่ครบ | สถานะ RTS = Incomplete |
| 058 | EDG | ตรวจสอบ Primary Survey แสดงข้อความเมื่อยังไม่บันทึก | "ยังไม่บันทึก Primary Survey" |
| 059 | EDG | ตรวจสอบ Body chart แสดงข้อความเมื่อไม่มีการบันทึก | "ไม่มีการบันทึก Body chart" |

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user**: แพทย์ ER (บันทึก ER Physician Note / ER Trauma Exam / Disposition, เปิด ER Summary) · พยาบาล ER (Triage, คัดกรองซ้ำ, Reconcile Med) · แพทย์แผนกที่ถูก Consult (ตอบรับ Consult)
- ทุก TC เปิดหน้าด้วย: เลือกผู้ป่วย > เมนูซ้าย **ประวัติการรักษา** > เลือก visit ER > แท็บ **ER Summary** (เรียกสั้นว่า "เปิด ER Summary")
- **ผู้ป่วย A (Non-Trauma · Admit · จำหน่ายแล้ว)** — ใช้กับ 001–021, 026, 040:
  Triage ประเภทฉุกเฉิน Non-Trauma วิธีการมาถึง EMS + โรคประจำตัว (U/D) → ประวัติแพ้ยา ≥ 1 รายการ (ชื่อยา + อาการ) → Reconcile Med ≥ 1 รายการ →
  คัดกรองซ้ำบนหน้า Overview 2 ครั้ง (รวม Vital signs 3 ชุด) → ER Physician Note + Diagnosis Primary + Secondary →
  Order: ยา One day ≥ 2 · ยา Continue ≥ 1 · สารน้ำ ≥ 1 · Lab ≥ 1 · Imaging ≥ 1 · หัตถการ ≥ 1 แล้วยกเลิกยา 1 รายการ →
  Consult 1 แผนก (แพทย์แผนกตอบรับแล้ว) → Disposition Admit ระบุหอผู้ป่วย + คำแนะนำ ลงนาม → ได้ AN
- **ผู้ป่วย B (Non-Trauma · Refer · จำหน่ายแล้ว)** — ใช้กับ 022: Disposition Refer ระบุโรงพยาบาลปลายทาง ลงนาม
- **ผู้ป่วย C (Non-Trauma · กลับบ้าน + นัดหมาย · จำหน่ายแล้ว)** — ใช้กับ 023: Disposition กลับบ้าน + ออกนัดหมาย ลงนาม
- **ผู้ป่วย D (Non-Trauma · ยังอยู่ใน ER)** — ใช้กับ 041, 042, 045, 049, 051: เปิด visit ER จดเวลามาถึง (นาทีตรง) → Triage → Consult 1 แผนก (ยังไม่ตอบรับ) · ไม่ทำ Disposition
- **ผู้ป่วย E (Non-Trauma · ยังอยู่ใน ER ข้ามวัน)** — ใช้กับ 043, 044: เปิด visit ER ไว้ตั้งแต่วันก่อน จดเวลามาถึง · ไม่จำหน่าย (visit ER active จนกว่าปิดที่การเงิน)
- **ผู้ป่วย F (Non-Trauma)** — ใช้กับ 046: ผู้ป่วยมีโรคประจำตัวในประวัติทางการแพทย์อยู่ก่อน · Triage ของ visit นี้ไม่บันทึก U/D
- **ผู้ป่วย G (Non-Trauma · ไม่มีข้อมูลเสริม)** — ใช้กับ 047, 048, 050: ผู้ป่วยใหม่ ไม่มี U/D ทั้งใน Triage และประวัติ · ไม่มีประวัติแพ้ยา · ไม่มี Reconcile Med · ไม่สั่ง Order · ไม่ขอ Consult
- **ผู้ป่วย T1 (Trauma · EMS · ข้อมูลครบ · Admit)** — ใช้กับ 024, 025, 027–039:
  Triage ประเภทฉุกเฉิน Trauma + Suspect Fast Track Type = Trauma Fast Track · ER Arrival: EMS · ALS · EMS ขึ้นทะเบียน · ชื่อหน่วยงาน · ข้อมูลก่อนถึงโรงพยาบาล ·
  การดูแลระหว่างนำส่ง 5 ข้อ ใส่ค่า 0 / 1 / 2 / 3 / N คนละข้อ · Vital signs ครบ GCS / SBP / RR (RTS Complete) →
  ER Trauma Exam: Primary Survey A–E · PE by system + สรุปผลการตรวจ · Compression test Chest + Pelvis · Body chart ≥ 2 ตำแหน่ง · Diagnosis Primary + Secondary → Disposition Admit ลงนาม
- **ผู้ป่วย T2 (Trauma · Walk-in · ข้อมูลน้อย)** — ใช้กับ 054, 056, 057, 058, 059: Triage Trauma วิธีการมาถึง Walk-in · ไม่บันทึก RR (RTS Incomplete) ·
  ER Trauma Exam ไม่บันทึก Primary Survey และ Body chart · ไม่บันทึก Trauma Detail Form
- **ผู้ป่วย T3 (Trauma · EMS · ไม่กรอกข้อมูลก่อนถึงโรงพยาบาล)** — ใช้กับ 055
- **ผู้ป่วย H (Non-Trauma → Trauma)** — ใช้กับ 052: Triage Non-Trauma บันทึก → แก้ Triage เป็น Trauma บันทึก → ER Trauma Exam
- **ผู้ป่วย I (Trauma → Non-Trauma)** — ใช้กับ 053: Triage Trauma บันทึก → แก้ Triage เป็น Non-Trauma บันทึก → ER Physician Note

---

## EXE - CT - 2.10.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, VERSION 2.10.0, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : ER Summary, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.10.0
- Module: ER — ประวัติการรักษา > ER Summary
- Requirement ที่อ้างอิง: SBH-3182 — [ER ] [ ER Summary ] Created ER Summary Trauma/Non-Trauma
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ลำดับส่วนบนหน้า ER Summary ของ visit Non-Trauma และ Trauma
- Non-Trauma 6 ส่วนที่เพิ่ม: ข้อมูลการรักษาที่ ER · โรคประจำตัวและการแพ้ · Vital signs · Order ที่ได้รับ · Consult · การจำหน่าย
- Trauma: เงื่อนไขการแสดง · การนำส่ง · ข้อมูลการบาดเจ็บ · RTS + Primary Survey · PE Trauma / Compression test / Body chart · Diagnosis
- visit ที่จำหน่ายแล้ว และ visit ที่ยังอยู่ใน ER
- การแสดงแบบอ่านอย่างเดียว

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-3182-HPY - แสดง ER Summary ครบทุกส่วนของ visit Non-Trauma และ Trauma

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3182-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER — ประวัติการรักษา > ER Summary
- Requirement ที่อ้างอิง: SBH-3182 — [ER ] [ ER Summary ] Created ER Summary Trauma/Non-Trauma

วัตถุประสงค์
- ยืนยันว่าแพทย์เปิด ER Summary ของ visit ที่มีข้อมูลครบ แล้วเห็นสรุปการรักษาทุกส่วนเรียงถูก ค่าตรงกับแหล่งข้อมูล ทั้งเคส Non-Trauma และ Trauma

ขอบเขต Requirement
- Non-Trauma AC 1–6 และลำดับส่วนบนหน้า
- Trauma AC 1, 2, 4, 5, 6 และลำดับส่วนบนหน้า (เคส Trauma)

ความเสี่ยง
- ค่าที่ดึงมาผิดแหล่ง (U/D, แพ้ยา, ยาประจำ, แพทย์ผู้รับผิดชอบ) → แพทย์ที่รับต่อตัดสินใจจากข้อมูลผิด
- Order / Consult ไม่ครบหรือไม่ตรงกับหน้าอื่น → รักษาซ้ำหรือตกหล่น
- ปลายทางการจำหน่ายไม่ตรง AN จริง
- ส่วน Trauma ไม่แสดง / แสดงผิดเคส → ไม่เห็นกลไกการบาดเจ็บก่อนรับผู้ป่วย

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ระบุในแต่ละ TC (ดูหัวข้อข้อมูลตั้งต้น)
```

### TC-SBH-3182-001 - ตรวจสอบลำดับส่วนบนหน้า ER Summary ของ visit Non-Trauma

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3182-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. เลื่อนดูหัวข้อทุกส่วนจากบนลงล่าง

## Expected Result
ส่วนเรียงตามลำดับ:
1. ER Physician Note (หัว)
2. ข้อมูลการรักษาที่ ER
3. อาการนำ: Chief Complaint, Present illness
4. โรคประจำตัวและการแพ้
5. Diagnosis, Order to nurse, Note to nurse
6. Vital signs
7. GCS, MEWS, Suspect Fast Track
8. Physical Examination, ตำแหน่งที่ปวด/ผิดปกติ
9. Order ที่ได้รับ
10. Consult
11. การจำหน่าย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ลำดับส่วนบนหน้า + "แสดงต่อจาก…" ของ AC 1–5 (Non-Trauma)
```

### TC-SBH-3182-002 - ตรวจสอบส่วนข้อมูลการรักษาที่ ER แสดงข้อมูล 8 ช่องตรงกับ visit

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-001 แต่ QA Type : Functional

```
TC ID: TC-SBH-3182-002
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูส่วน ข้อมูลการรักษาที่ ER
3. เทียบกับ Triage ครั้งแรก, ER Overview และ Disposition ของ visit เดียวกัน

## Expected Result
แสดง 8 ช่อง ค่าตรงกับ visit:
EN · วิธีการมาถึง (EMS) · ระดับคัดกรองครั้งแรกและโซน · ประเภทฉุกเฉิน (Non-Trauma)
เวลามาถึง · เวลาออกจาก ER · เวลาใน ER · แพทย์ผู้รับผิดชอบ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (NT) ⚠️ dev note 1: แสดง "ระดับคัดกรองแรกรับ / โซนปัจจุบัน" (ระบบไม่เก็บประวัติโซน)
```

### TC-SBH-3182-003 - ตรวจสอบเวลามาถึงและเวลาออกจาก ER แสดงเวลาไทยปี พ.ศ. รูปแบบ dd/MM/yyyy HH:mm

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูช่อง เวลามาถึง และ เวลาออกจาก ER
3. เทียบกับเวลาที่เปิด visit และเวลาที่จำหน่ายออกจาก ER จริง

## Expected Result
ทั้ง 2 ช่องแสดงรูปแบบ dd/MM/yyyy HH:mm ปี พ.ศ. (เช่น 31/10/2569 14:20)
เวลาตรงกับเวลาไทยที่เกิดจริง ไม่คลาด 7 ชั่วโมง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (NT) — เช็กลิสต์วันที่ / เวลา (พ.ศ. · UTC)
```

### TC-SBH-3182-004 - ตรวจสอบแพทย์ผู้รับผิดชอบมาจาก care team ของ ER encounter

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-004
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูช่อง แพทย์ผู้รับผิดชอบ
3. เทียบกับ care team ของ ER encounter

## Expected Result
แพทย์ผู้รับผิดชอบ = แพทย์ใน care team ของ ER encounter

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (NT) ⚠️ dev note 9: care team มีแต่พยาบาล จึงใช้แพทย์ของ encounter (คนเดียวกับหน้า ER Overview)
```

### TC-SBH-3182-005 - ตรวจสอบโรคประจำตัวแสดงค่าที่บันทึกใน Triage ของ visit นี้

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-005
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูช่อง โรคประจำตัว (U/D) ในส่วน โรคประจำตัวและการแพ้

## Expected Result
โรคประจำตัว (U/D) ตรงกับที่พยาบาลบันทึกใน Triage ของ visit นี้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 (NT) ⚠️ dev note 8: U/D เก็บระดับผู้ป่วย แสดง version ที่มีผลตอนออกจาก ER
```

### TC-SBH-3182-006 - ตรวจสอบประวัติแพ้ยาแสดงชื่อยาและอาการจากประวัติการแพ้

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูช่อง ประวัติแพ้ยา

## Expected Result
แสดงชื่อยาและอาการตรงกับประวัติการแพ้ของผู้ป่วย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 (NT)
```

### TC-SBH-3182-007 - ตรวจสอบยาที่ใช้ประจำแสดงรายการจาก Reconcile Med

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูช่อง ยาที่ใช้ประจำ

## Expected Result
แสดงรายการยาตรงกับที่บันทึกใน Reconcile Med

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 (NT)
```

### TC-SBH-3182-008 - ตรวจสอบคอลัมน์ตาราง Vital signs

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-3182-008
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูหัวตารางในส่วน Vital signs

## Expected Result
คอลัมน์: เวลา · BP · PR · RR · BT · SpO₂ · Pain
ไม่มีคอลัมน์ชื่อพยาบาลหรือผู้บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3 (NT) ⚠️ dev note 2: ตัดคอลัมน์ Pain เพราะ ER preset ยังไม่มี pain score
```

### TC-SBH-3182-009 - ตรวจสอบ Vital signs แสดงทุกครั้งรวมการคัดกรองซ้ำบนหน้า Overview เรียงตามเวลา

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-009
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูแถวในตาราง Vital signs
3. เทียบกับ Triage และการคัดกรองซ้ำ 2 ครั้งบนหน้า Overview

## Expected Result
แสดง 3 แถว (Triage 1 + คัดกรองซ้ำ 2) เรียงจากเวลาเก่าไปใหม่
ค่า BP / PR / RR / BT / SpO₂ แต่ละแถวตรงกับที่บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3 (NT)
```

### TC-SBH-3182-010 - ตรวจสอบแถวแรกของ Vital signs ต่อท้ายแรกรับและแถวสุดท้ายต่อท้ายล่าสุด

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-010
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูคอลัมน์เวลาของแถวแรกและแถวสุดท้ายในตาราง Vital signs

## Expected Result
แถวแรกต่อท้ายเวลาด้วย "แรกรับ"
แถวสุดท้ายต่อท้ายเวลาด้วย "ล่าสุด"
แถวกลางไม่มีคำต่อท้าย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3 (NT)
```

### TC-SBH-3182-011 - ตรวจสอบ Order ที่ได้รับแสดงทุกรายการทั้ง One day และ Continue

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-011
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูส่วน Order ที่ได้รับ

## Expected Result
แสดงทุก Order ที่สั่งใน visit นี้
คอลัมน์ประเภท Order ตรงกับที่สั่ง: ยา One day = One day · ยา Continue = Continue

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (NT) ⚠️ dev note 11: ข้อมูลไม่บอก One day / Continue รายการยาจึงแสดงเป็น One day ทั้งหมด
```

### TC-SBH-3182-012 - ตรวจสอบ Order แบ่งกลุ่มพร้อมจำนวนรายการที่หัวกลุ่ม

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-012
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูหัวกลุ่มในส่วน Order ที่ได้รับ และนับรายการใต้แต่ละกลุ่ม

## Expected Result
แบ่ง 3 กลุ่ม: ยาและสารน้ำ · Lab · Imaging และหัตถการ
หัวกลุ่มแสดงจำนวนรายการ เท่ากับจำนวนแถวในกลุ่มนั้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (NT)
```

### TC-SBH-3182-013 - ตรวจสอบคอลัมน์ตาราง Order ที่ได้รับ

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-3182-013
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูหัวตารางในส่วน Order ที่ได้รับ

## Expected Result
คอลัมน์: ประเภท Order · รายการ · เวลาสั่ง · สถานะ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (NT)
```

### TC-SBH-3182-014 - ตรวจสอบรายการยาแสดงชื่อยา ขนาด และวิธีให้

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-014
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูรายการในกลุ่ม ยาและสารน้ำ
3. เทียบกับ Order ยาที่สั่ง

## Expected Result
แต่ละรายการยาแสดงชื่อยา ขนาด และวิธีให้ ตรงกับที่สั่ง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (NT)
```

### TC-SBH-3182-015 - ตรวจสอบ Order ที่ยกเลิกแสดงขีดฆ่าพร้อมสถานะยกเลิก

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-015
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูแถวของยาที่ยกเลิกในกลุ่ม ยาและสารน้ำ

## Expected Result
ยังแสดงรายการที่ยกเลิก (ไม่ซ่อน)
ชื่อรายการขีดฆ่า · สถานะ "ยกเลิก"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (NT)
```

### TC-SBH-3182-016 - ตรวจสอบรายการและจำนวน Order ตรงกับหน้า Order Summary ของ visit เดียวกัน

Status: Not Run · Priority: High · Labels: เหมือน TC-001 แต่ QA Type : Integration

```
TC ID: TC-SBH-3182-016
Case Type: Happy
Test Type: Integration

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A > จดรายการและจำนวน Order แต่ละกลุ่ม
2. เปิดหน้า Order Summary ของผู้ป่วย A visit เดียวกัน
3. เทียบรายการและจำนวน

## Expected Result
รายการและจำนวน Order ทุกกลุ่มตรงกับหน้า Order Summary

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (NT) — Order Summary ตามการ์ด SBH-2593
```

### TC-SBH-3182-017 - ตรวจสอบส่วน Consult แสดงแผนก แพทย์ สถานะ เวลาขอ และเวลาตอบรับ

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-017
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูส่วน Consult

## Expected Result
แสดงแถว Consult ที่ขอใน visit นี้
แผนก · แพทย์ที่ถูก Consult · สถานะ (ตอบรับแล้ว) · เวลาขอ · เวลาตอบรับ ตรงกับ Consult ที่ขอ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 (NT)
```

### TC-SBH-3182-018 - ตรวจสอบเวลาขอและเวลาตอบรับ Consult ตรงกับแท็บ Timeline

Status: Not Run · Priority: Medium · Labels: เหมือน TC-016

```
TC ID: TC-SBH-3182-018
Case Type: Happy
Test Type: Integration

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A > จดเวลาขอและเวลาตอบรับในส่วน Consult
2. กดแท็บ Timeline ของ visit เดียวกัน
3. เทียบเวลาของรายการ Consult

## Expected Result
เวลาขอและเวลาตอบรับตรงกับแท็บ Timeline

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 (NT)
```

### TC-SBH-3182-019 - ตรวจสอบส่วนการจำหน่ายแสดงข้อมูลตาม Disposition ที่ลงนาม

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-019
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูส่วน การจำหน่าย
3. เทียบกับ Disposition ที่ลงนาม

## Expected Result
แสดง ผลการจำหน่าย (Admit) · สถานะการจำหน่าย · วิธีการจำหน่าย · เวลาลงนาม · แพทย์ผู้ลงนาม · คำแนะนำ/นัดหมาย
ค่าตรงกับ Disposition

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 (NT) — "ปลายทาง" ถูกขีดฆ่าในรายการช่องที่แสดง แต่ข้อถัดไปยังกำหนดปลายทางตามผลการจำหน่าย (ตรวจใน TC 020–023)
```

### TC-SBH-3182-020 - ตรวจสอบปลายทางของผลการจำหน่าย Admit แสดงหอผู้ป่วยและ AN

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-020
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดูปลายทางในส่วน การจำหน่าย

## Expected Result
ปลายทางแสดงหอผู้ป่วยที่ระบุใน Disposition และ AN ของผู้ป่วย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 (NT) — เทคนิค: EP กลุ่มผลการจำหน่าย Admit
```

### TC-SBH-3182-021 - ตรวจสอบปลายทางของ visit ที่ Admit ตรงกับรายการ visit ด้านซ้าย

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-021
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. ดู AN ในปลายทางของส่วน การจำหน่าย
3. ดูรายการ visit ER ด้านซ้าย บรรทัด "รับไว้ในโรงพยาบาล: AN"

## Expected Result
AN ในส่วนการจำหน่ายตรงกับ AN ในรายการ visit ด้านซ้าย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 (NT)
```

### TC-SBH-3182-022 - ตรวจสอบปลายทางของผลการจำหน่าย Refer แสดงโรงพยาบาลปลายทาง

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-022
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย B
2. ดูผลการจำหน่ายและปลายทางในส่วน การจำหน่าย

## Expected Result
ผลการจำหน่าย = Refer
ปลายทางแสดงโรงพยาบาลปลายทางตามที่ระบุใน Disposition

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 (NT) — เทคนิค: EP กลุ่มผลการจำหน่าย Refer
```

### TC-SBH-3182-023 - ตรวจสอบปลายทางของผลการจำหน่ายกลับบ้านแสดงนัดหมาย

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-023
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย C
2. ดูผลการจำหน่ายและปลายทางในส่วน การจำหน่าย

## Expected Result
ผลการจำหน่าย = กลับบ้าน
ปลายทางแสดงนัดหมายที่ออกให้ผู้ป่วย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 (NT) — เทคนิค: EP กลุ่มผลการจำหน่ายกลับบ้าน ⚠️ dev note 4: ยังไม่มีนัดหมายผูกกับ visit แสดงเฉพาะคำแนะนำ
```

### TC-SBH-3182-024 - ตรวจสอบลำดับส่วนบนหน้า ER Summary ของ visit Trauma

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-3182-024
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. เลื่อนดูหัวข้อทุกส่วนจากบนลงล่าง

## Expected Result
ส่วนเรียงตามลำดับ:
1. ER Trauma Exam (หัว)
2. ข้อมูลการรักษาที่ ER
3. อาการนำ: Chief Complaint, Present illness
4. โรคประจำตัวและการแพ้
5. การนำส่งและการดูแลระหว่างนำส่ง
6. ข้อมูลการบาดเจ็บ
7. Diagnosis, Order to nurse, Note to nurse
8. Vital signs
9. Revised Trauma Score และ Primary Survey
10. GCS, MEWS, Suspect Fast Track
11. Physical Examination (Trauma), Compression test, Body chart (ไม่มี PE ของ ER Physician Note)
12. Order ที่ได้รับ
13. Consult
14. การจำหน่าย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ลำดับส่วนบนหน้า (เคส Trauma) + "แสดงต่อจาก…" ของ AC 2, 3, 4 (Trauma) · ข้อ 7 ในการ์ดมี External cause แต่ AC 6 เหลือแค่ Diagnosis — ไม่ตรวจ External cause (ดู gap)
```

### TC-SBH-3182-025 - ตรวจสอบหัวฟอร์มแสดง ER Trauma Exam เมื่อประเภทฉุกเฉินเป็น Trauma

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-025
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูหัวฟอร์มบนสุดของ ER Summary

## Expected Result
หัวฟอร์มแสดง "ER Trauma Exam"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (Trauma) — เทคนิค: Decision Table คอลัมน์ ประเภทฉุกเฉิน = Trauma
```

### TC-SBH-3182-026 - ตรวจสอบไม่แสดงส่วน Trauma เมื่อประเภทฉุกเฉินเป็น Non-Trauma

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-026
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. เลื่อนดูทุกส่วน

## Expected Result
ไม่มีส่วน การนำส่งและการดูแลระหว่างนำส่ง · ข้อมูลการบาดเจ็บ · Revised Trauma Score และ Primary Survey · Physical Examination (Trauma) / Compression test / Body chart
ส่วน Physical Examination ใช้ PE ของ ER Physician Note ตามเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (Trauma) — เทคนิค: Decision Table คอลัมน์ ประเภทฉุกเฉิน = Non-Trauma
```

### TC-SBH-3182-027 - ตรวจสอบข้อมูลการรักษาที่ ER แสดงประเภทฉุกเฉิน Trauma และ Suspect Fast Track Type

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-027
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูช่อง ประเภทฉุกเฉิน ในส่วน ข้อมูลการรักษาที่ ER

## Expected Result
ประเภทฉุกเฉินแสดง Trauma และ Suspect Fast Track Type (Trauma Fast Track) ตามที่ Triage บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (Trauma)
```

### TC-SBH-3182-028 - ตรวจสอบส่วนการนำส่งแสดงข้อมูล ER Arrival ที่บันทึกใน Triage

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-028
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูส่วน การนำส่งและการดูแลระหว่างนำส่ง
3. เทียบกับ ER Arrival ใน Triage

## Expected Result
แสดง วิธีการมาถึง (EMS) · ระดับความเร่งด่วน EMS (ALS) · ผู้นำส่ง (EMS ขึ้นทะเบียน) · ชื่อผู้นำส่ง/หน่วยงาน/มูลนิธิ · ข้อมูลก่อนถึงโรงพยาบาล
ค่าตรงกับที่บันทึกใน Triage

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 (Trauma) — SBH-1678 ข้อ 2 ⚠️ dev note 6: อ่านจากฟอร์ม PHER+ (SBH-2952) ไม่ใช่ Triage
```

### TC-SBH-3182-029 - ตรวจสอบตารางการดูแลระหว่างนำส่งแสดงครบ 5 ข้อ

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-029
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูตารางการดูแลระหว่างนำส่ง

## Expected Result
ตารางมี 5 ข้อ: ดูแลการหายใจ · ห้ามเลือด · Splint/Slab C-Spine · Splint/Slab อื่นๆ · IV Fluid
ผลแต่ละข้อตรงกับที่บันทึกใน Triage

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 (Trauma) — SBH-1678 ข้อ 3 ⚠️ dev note 6
```

### TC-SBH-3182-030 - ตรวจสอบค่าการดูแลระหว่างนำส่งแสดงเป็นคำไม่แสดงรหัส

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-030
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1 (5 ข้อใส่ค่า 0 / 1 / 2 / 3 / N คนละข้อ)
2. ดูผลแต่ละข้อในตารางการดูแลระหว่างนำส่ง

## Expected Result
ข้อที่บันทึก 0 = ไม่มี · 1 = มี-เหมาะสม · 2 = มี-ไม่เหมาะสม · 3 = ไม่จำเป็น · N = ไม่ระบุ
ไม่มีช่องไหนแสดงรหัส 0 / 1 / 2 / 3 / N

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 (Trauma) — เทคนิค: EP กลุ่มละ 1 ค่า (5 รหัส)
```

### TC-SBH-3182-031 - ตรวจสอบ RTS แสดงค่าจริง คะแนนย่อย คะแนนรวม และสถานะ

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-031
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูตาราง Revised Trauma Score

## Expected Result
แสดงค่าจริงและคะแนนย่อยของ GCS · SBP · RR
คะแนนรวมเป็นทศนิยมตามที่คำนวณ
สถานะ Complete

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (Trauma) ⚠️ dev note 5: ระบบไม่บันทึกค่า RTS คำนวณจากค่าแรกรับ
```

### TC-SBH-3182-032 - ตรวจสอบคะแนนรวม RTS คำนวณตามสูตรของ SBH-1678

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-032
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. จดคะแนนย่อย GCS / SBP / RR และคะแนนรวมในตาราง RTS
3. คำนวณ (0.9368 × GCS) + (0.7326 × SBP) + (0.2908 × RR) จากคะแนนย่อย

## Expected Result
คะแนนรวมเท่ากับผลคำนวณ (เช่น คะแนนย่อย 4 / 4 / 4 = 7.8408)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (Trauma)
```

### TC-SBH-3182-033 - ตรวจสอบ Primary Survey แสดงผลประเมิน A ถึง E ตามที่บันทึกใน ER Trauma Exam

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-033
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูตาราง Primary Survey
3. เทียบกับ Primary Survey ใน ER Trauma Exam

## Expected Result
แสดง 5 แถว A (Airway + C-spine) · B (Breathing) · C (Circulation) · D (Disability) · E (Exposure)
ผลประเมินแต่ละแถวตรงกับที่แพทย์บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (Trauma)
```

### TC-SBH-3182-034 - ตรวจสอบ Physical Examination ของ visit Trauma ใช้ PE by system จาก ER Trauma Exam

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-034
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูส่วน Physical Examination (Trauma)
3. เทียบกับ PE by system ใน ER Trauma Exam

## Expected Result
ตาราง PE แสดงข้อความ PE by system ตรงกับ ER Trauma Exam
ใช้ตารางหน้าตาเดียวกับ PE เดิม · ไม่มี PE ของ ER Physician Note

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 (Trauma)
```

### TC-SBH-3182-035 - ตรวจสอบสรุปผลการตรวจแสดงในแถวบนสุดของตาราง PE Trauma

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-3182-035
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูแถวบนสุดของตาราง Physical Examination (Trauma)

## Expected Result
แถวบนสุดแสดงสรุปผลการตรวจตรงกับที่บันทึกใน ER Trauma Exam

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 (Trauma)
```

### TC-SBH-3182-036 - ตรวจสอบ Compression test แสดงผลของ Chest และ Pelvis

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-036
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูช่อง Compression test

## Expected Result
แสดงผลของ Chest และ Pelvis ตรงกับที่บันทึกใน ER Trauma Exam

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 (Trauma)
```

### TC-SBH-3182-037 - ตรวจสอบ Body chart แสดงจำนวนตำแหน่งและชื่อตำแหน่ง

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-037
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูช่อง Body chart

## Expected Result
แสดงจำนวนตำแหน่งและชื่อตำแหน่งตรงกับ Body chart ที่บันทึกใน ER Trauma Exam

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 (Trauma) ⚠️ dev note 7: แสดงจำนวนภาพ + ปุ่ม ดูภาพ ยังแสดงชื่อตำแหน่งไม่ได้
```

### TC-SBH-3182-038 - ตรวจสอบกดดูภาพแล้วเปิดภาพ Body chart แบบอ่านอย่างเดียว

Status: Not Run · Priority: Medium · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-038
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. กด "ดูภาพ" ที่ช่อง Body chart
3. ลองคลิก / วาดบนภาพ

## Expected Result
เปิดภาพ Body chart ที่บันทึกไว้
แก้ไขหรือวาดเพิ่มไม่ได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 (Trauma)
```

### TC-SBH-3182-039 - ตรวจสอบช่อง Diagnosis แสดง Primary และ Secondary พร้อมรหัส ICD-10

Status: Not Run · Priority: High · Labels: เหมือน TC-002

```
TC ID: TC-SBH-3182-039
Case Type: Happy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T1
2. ดูช่อง Diagnosis

## Expected Result
แสดง Primary และ Secondary พร้อมรหัส ICD-10 ตรงกับที่แพทย์บันทึก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 (Trauma)
```

---

## TS-SBH-3182-UHP - ER Summary แสดงข้อมูลแบบอ่านอย่างเดียว

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3182-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER — ประวัติการรักษา > ER Summary
- Requirement ที่อ้างอิง: SBH-3182 — [ER ] [ ER Summary ] Created ER Summary Trauma/Non-Trauma

วัตถุประสงค์
- ยืนยันว่าผู้ใช้แก้ไขข้อมูลการรักษาจากหน้า ER Summary ไม่ได้

ขอบเขต Requirement
- Overview: "ทุกส่วนเป็นการอ่านข้อมูลที่บันทึกไว้แล้ว ไม่มีช่องให้กรอก"
- Use case: Limitation อ่านอย่างเดียว

ความเสี่ยง
- แก้ข้อมูลทางคลินิกย้อนหลังจากหน้าสรุปได้ → ข้อมูลไม่ตรงกับฟอร์มต้นทาง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-3182-040 - ตรวจสอบ ER Summary ไม่มีช่องให้กรอกหรือแก้ไขข้อมูล

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3182-040
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย A
2. คลิกที่กล่องค่าในส่วนที่เพิ่มทั้ง 6 ส่วน แล้วลองพิมพ์

## Expected Result
พิมพ์หรือแก้ค่าไม่ได้
ไม่มีปุ่มบันทึกหรือปุ่มแก้ไขในส่วนที่เพิ่ม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: Overview + Use case (อ่านอย่างเดียว)
```

---

## TS-SBH-3182-EDG - ER Summary ของ visit ที่ยังอยู่ใน ER ข้อมูลไม่ครบ และค่าขอบของเวลาใน ER

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3182-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER — ประวัติการรักษา > ER Summary
- Requirement ที่อ้างอิง: SBH-3182 — [ER ] [ ER Summary ] Created ER Summary Trauma/Non-Trauma

วัตถุประสงค์
- ยืนยันว่า ER Summary แสดงถูกเมื่อ visit ยังไม่จำหน่าย เมื่อข้อมูลบางส่วนยังไม่บันทึก เมื่อแก้ประเภทฉุกเฉินระหว่าง visit และที่ค่าขอบของเวลาใน ER

ขอบเขต Requirement
- Non-Trauma AC 1 (เวลาใน ER · ยังไม่จำหน่าย) · AC 2 (ไม่มีข้อมูล · U/D จากประวัติ) · AC 4 / 5 / 6 (ไม่มี Order · Consult รอตอบรับ / ไม่มี · ยังไม่จำหน่าย)
- Trauma AC 1 (แก้ประเภทฉุกเฉิน) · AC 2 (Walk-in · ไม่มีข้อมูล) · AC 3 · AC 4 (Incomplete · ไม่มี Primary Survey) · AC 5 (ไม่มี Body chart)

ความเสี่ยง
- เวลาใน ER แสดงผิดรูปแบบที่ขอบ 60 นาที / 24 ชั่วโมง
- ส่วนที่ไม่มีข้อมูลถูกซ่อนหรือว่างเปล่า → แพทย์เข้าใจผิดว่าไม่มีโรคประจำตัว / ไม่แพ้ยา
- แก้ประเภทฉุกเฉินแล้ว ER Summary ยังใช้ค่าเก่า

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ระบุในแต่ละ TC (ดูหัวข้อข้อมูลตั้งต้น)
```

### TC-SBH-3182-041 - ตรวจสอบเวลาใน ER แสดงเป็นนาทีเมื่ออยู่ใน ER 59 นาที

Status: Not Run · Priority: Medium · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3182-041
Case Type: Edge
Test Type: Functional

## Test Step
1. รอให้ผู้ป่วย D อยู่ใน ER ครบ 59 นาทีนับจากเวลามาถึง
2. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย D
3. ดูช่อง เวลาใน ER

## Expected Result
เวลาใน ER แสดง "59 นาที" (นับถึงเวลาที่เปิดหน้า)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (NT) — เทคนิค: BVA ขอบล่างของเกณฑ์ 60 นาที (ค่าก่อนขอบ) · ครอบ "visit ยังไม่จำหน่าย เวลาใน ER นับถึงเวลาที่เปิดหน้า"
```

### TC-SBH-3182-042 - ตรวจสอบเวลาใน ER แสดงเป็นชั่วโมงและนาทีเมื่ออยู่ใน ER ครบ 60 นาที

Status: Not Run · Priority: Medium · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-042
Case Type: Edge
Test Type: Functional

## Test Step
1. รอให้ผู้ป่วย D อยู่ใน ER ครบ 60 นาทีนับจากเวลามาถึง
2. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย D (หรือรีเฟรชหน้า)
3. ดูช่อง เวลาใน ER

## Expected Result
เวลาใน ER แสดง "1 ชม. 0 นาที"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (NT) — เทคนิค: BVA ขอบ 60 นาที
```

### TC-SBH-3182-043 - ตรวจสอบเวลาใน ER แสดงเป็นชั่วโมงและนาทีเมื่ออยู่ใน ER 23 ชั่วโมง 59 นาที

Status: Not Run · Priority: Low · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-043
Case Type: Edge
Test Type: Functional

## Test Step
1. รอให้ผู้ป่วย E อยู่ใน ER ครบ 23 ชั่วโมง 59 นาทีนับจากเวลามาถึง
2. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย E
3. ดูช่อง เวลาใน ER

## Expected Result
เวลาใน ER แสดง "23 ชม. 59 นาที"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (NT) — เทคนิค: BVA ขอบล่างของเกณฑ์ 24 ชั่วโมง (ค่าก่อนขอบ)
```

### TC-SBH-3182-044 - ตรวจสอบเวลาใน ER แสดงเป็นวันและชั่วโมงเมื่ออยู่ใน ER ครบ 24 ชั่วโมง

Status: Not Run · Priority: Low · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-044
Case Type: Edge
Test Type: Functional

## Test Step
1. รอให้ผู้ป่วย E อยู่ใน ER ครบ 24 ชั่วโมงนับจากเวลามาถึง
2. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย E (หรือรีเฟรชหน้า)
3. ดูช่อง เวลาใน ER

## Expected Result
เวลาใน ER แสดง "1 วัน 0 ชม."

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (NT) — เทคนิค: BVA ขอบ 24 ชั่วโมง
```

### TC-SBH-3182-045 - ตรวจสอบเวลาออกจาก ER แสดงยังอยู่ใน ER เมื่อ visit ยังไม่จำหน่าย

Status: Not Run · Priority: High · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-045
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย D
2. ดูช่อง เวลาออกจาก ER

## Expected Result
เวลาออกจาก ER แสดง "ยังอยู่ใน ER"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (NT)
```

### TC-SBH-3182-046 - ตรวจสอบโรคประจำตัวใช้ประวัติทางการแพทย์เมื่อ Triage ของ visit นี้ไม่ได้บันทึก

Status: Not Run · Priority: Medium · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-046
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย F
2. ดูช่อง โรคประจำตัว (U/D)

## Expected Result
โรคประจำตัวแสดงค่าจากประวัติทางการแพทย์ของผู้ป่วย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 (NT) — เทคนิค: Decision Table คอลัมน์ Triage ไม่มี U/D + ประวัติมี U/D
```

### TC-SBH-3182-047 - ตรวจสอบช่องโรคประจำตัว ประวัติแพ้ยา และยาที่ใช้ประจำแสดงไม่มีข้อมูลเมื่อไม่มีข้อมูล

Status: Not Run · Priority: High · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-047
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย G
2. ดูส่วน โรคประจำตัวและการแพ้

## Expected Result
ยังแสดงครบ 3 ช่อง (ไม่ซ่อน)
กล่องโรคประจำตัว · ประวัติแพ้ยา · ยาที่ใช้ประจำ แสดง "ไม่มีข้อมูล"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 (NT)
```

### TC-SBH-3182-048 - ตรวจสอบส่วน Order ที่ได้รับแสดงข้อความเมื่อไม่มี Order

Status: Not Run · Priority: Medium · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-048
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย G
2. ดูส่วน Order ที่ได้รับ

## Expected Result
แสดง "ไม่มี Order ใน visit นี้"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (NT)
```

### TC-SBH-3182-049 - ตรวจสอบ Consult ที่ยังไม่ตอบรับแสดงสถานะรอตอบรับ

Status: Not Run · Priority: High · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-049
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย D
2. ดูแถว Consult ในส่วน Consult

## Expected Result
สถานะแสดง "รอตอบรับ"
เวลาตอบรับแสดง "-"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 (NT) — เทคนิค: State Transition สถานะ Consult (รอตอบรับ)
```

### TC-SBH-3182-050 - ตรวจสอบส่วน Consult แสดงข้อความเมื่อไม่มี Consult

Status: Not Run · Priority: Medium · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-050
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย G
2. ดูส่วน Consult

## Expected Result
แสดง "ไม่มี Consult ใน visit นี้"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 (NT)
```

### TC-SBH-3182-051 - ตรวจสอบส่วนการจำหน่ายแสดงยังไม่จำหน่ายเมื่อ visit ยังไม่จำหน่าย

Status: Not Run · Priority: High · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-051
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย D
2. ดูส่วน การจำหน่าย

## Expected Result
ทั้งส่วนแสดง "ยังไม่จำหน่าย" แทนรายละเอียดการจำหน่าย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6 (NT)
```

### TC-SBH-3182-052 - ตรวจสอบแสดงส่วน Trauma เมื่อแก้ประเภทฉุกเฉินจาก Non-Trauma เป็น Trauma

Status: Not Run · Priority: High · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-052
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย H (Triage แก้จาก Non-Trauma เป็น Trauma แล้ว)
2. ดูหัวฟอร์ม ช่องประเภทฉุกเฉิน และส่วนต่างๆ

## Expected Result
ประเภทฉุกเฉินแสดง Trauma (ค่าล่าสุด)
หัวฟอร์ม "ER Trauma Exam" · แสดงส่วน Trauma

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (Trauma) — เทคนิค: State Transition Non-Trauma → Trauma
```

### TC-SBH-3182-053 - ตรวจสอบไม่แสดงส่วน Trauma เมื่อแก้ประเภทฉุกเฉินจาก Trauma เป็น Non-Trauma

Status: Not Run · Priority: High · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-053
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย I (Triage แก้จาก Trauma เป็น Non-Trauma แล้ว)
2. ดูหัวฟอร์ม ช่องประเภทฉุกเฉิน และส่วนต่างๆ

## Expected Result
ประเภทฉุกเฉินแสดง Non-Trauma (ค่าล่าสุด)
ไม่แสดงส่วน Trauma · PE ใช้ของ ER Physician Note

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 (Trauma) — เทคนิค: State Transition Trauma → Non-Trauma
```

### TC-SBH-3182-054 - ตรวจสอบส่วนการนำส่งของผู้ป่วย Walk-in แสดงเฉพาะวิธีการมาถึงและผู้นำส่ง

Status: Not Run · Priority: Medium · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-054
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T2
2. ดูส่วน การนำส่งและการดูแลระหว่างนำส่ง

## Expected Result
แสดงเฉพาะวิธีการมาถึง (Walk-in) และผู้นำส่ง
ไม่แสดงตารางการดูแลระหว่างนำส่ง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 (Trauma) — เทคนิค: Decision Table คอลัมน์ วิธีการมาถึง = Walk-in
```

### TC-SBH-3182-055 - ตรวจสอบช่องในส่วนการนำส่งที่ไม่ได้บันทึกแสดงไม่มีข้อมูล

Status: Not Run · Priority: Medium · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-055
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T3
2. ดูช่อง ข้อมูลก่อนถึงโรงพยาบาล

## Expected Result
ช่องข้อมูลก่อนถึงโรงพยาบาลแสดง "ไม่มีข้อมูล"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 (Trauma)
```

### TC-SBH-3182-056 - ตรวจสอบส่วนข้อมูลการบาดเจ็บแสดงข้อความเมื่อยังไม่บันทึก Trauma Detail Form

Status: Not Run · Priority: Medium · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-056
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T2
2. ดูส่วน ข้อมูลการบาดเจ็บ

## Expected Result
แสดง "ยังไม่บันทึกข้อมูลการบาดเจ็บ"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3 (Trauma) ⚠️ dev note 6: จะเห็น "ไม่มีข้อมูล" จนกว่าพยาบาลบันทึกฟอร์ม PHER+
```

### TC-SBH-3182-057 - ตรวจสอบสถานะ RTS แสดง Incomplete เมื่อค่าที่ใช้คำนวณไม่ครบ

Status: Not Run · Priority: Medium · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-057
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T2 (Triage ไม่บันทึก RR)
2. ดูสถานะในตาราง Revised Trauma Score

## Expected Result
สถานะ RTS แสดง Incomplete

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (Trauma) — เทคนิค: EP กลุ่มค่าไม่ครบ
```

### TC-SBH-3182-058 - ตรวจสอบ Primary Survey แสดงข้อความเมื่อยังไม่บันทึก

Status: Not Run · Priority: Medium · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-058
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T2
2. ดูส่วน Primary Survey

## Expected Result
แสดง "ยังไม่บันทึก Primary Survey"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 (Trauma)
```

### TC-SBH-3182-059 - ตรวจสอบ Body chart แสดงข้อความเมื่อไม่มีการบันทึก

Status: Not Run · Priority: Low · Labels: เหมือน TC-041

```
TC ID: TC-SBH-3182-059
Case Type: Edge
Test Type: Functional

## Test Step
1. Login แพทย์ ER > เปิด ER Summary ของผู้ป่วย T2
2. ดูช่อง Body chart

## Expected Result
แสดง "ไม่มีการบันทึก Body chart"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 (Trauma)
```

---

## จุดที่ AC กับงาน dev ขัดกัน (จาก Implementation notes ในคอมเมนต์การ์ด 29 ต.ค.) — TC ยึด AC

| # | เรื่อง | AC บอก | dev ทำ | TC ที่กระทบ |
|---|---|---|---|---|
| 1 | โซน | ระดับคัดกรองครั้งแรกและโซน | ระดับคัดกรองแรกรับ / โซนปัจจุบัน | 002 |
| 2 | Pain | มีคอลัมน์ Pain | ตัดออก (preset ยังไม่มี) | 008 |
| 3 | External cause | อยู่ในลำดับส่วนข้อ 7 (Trauma) | ไม่แสดง (AC 6 เหลือแค่ Diagnosis) | ไม่มี TC |
| 4 | นัดหมาย | กลับบ้านแสดงนัดหมาย | แสดงเฉพาะคำแนะนำ | 023 |
| 5 | RTS | ไม่ระบุว่าใช้ค่าชุดไหน | คำนวณจากค่าแรกรับ | 031 · 032 |
| 6 | การนำส่ง | อ่านจาก Triage (SBH-1678 ข้อ 2, 3) | อ่านจากฟอร์ม PHER+ (SBH-2952) | 028 · 029 · 030 · 054 · 055 |
| 6 | ข้อมูลการบาดเจ็บ | "ยังไม่บันทึกข้อมูลการบาดเจ็บ" | "ไม่มีข้อมูล" | 056 |
| 7 | Body chart | จำนวน + ชื่อตำแหน่ง | จำนวนภาพ + ปุ่มดูภาพ | 037 |
| 8 | U/D | ใช้ค่าใน Triage ของ visit นี้ | version ระดับผู้ป่วยที่มีผลตอนออกจาก ER | 005 · 046 |
| 9 | แพทย์ผู้รับผิดชอบ | care team ของ ER encounter | แพทย์ของ encounter | 004 |
| 10 | เวลาออกจาก ER | ไม่ระบุแหล่ง | เวลายืนยันจำหน่ายออกจาก ER ถ้าไม่มีใช้เวลาปิด visit | — |
| 11 | Order ยา | แยก One day / Continue | ยาแสดง One day ทั้งหมด | 011 |

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - "ระดับคัดกรองครั้งแรกและโซน" — โซนครั้งแรกหรือโซนปัจจุบัน (dev ใช้ปัจจุบัน)
  - การจำหน่าย: "ปลายทาง" ถูกขีดฆ่าในรายการช่อง แต่ข้อถัดไปยังกำหนดปลายทาง Admit / Refer / กลับบ้าน — ร่างนี้ยังตรวจปลายทาง (TC 020–023)
  - ผลการจำหน่ายอื่น (เสียชีวิต · Transfer ภายใน) ปลายทางแสดงอะไร — การ์ดไม่บอก
  - Trauma AC 3: รายการช่องของ Trauma Detail Form ถูกขีดฆ่า — เมื่อบันทึกฟอร์มแล้วส่วนข้อมูลการบาดเจ็บแสดงอะไร ไม่มี TC
  - External cause อยู่ในลำดับส่วน (Trauma ข้อ 7) แต่ AC 6 เหลือแค่ Diagnosis — ยืนยันว่าตัดออกจริง
  - RTS ใช้ค่าชุดแรกรับหรือชุดล่าสุด
  - Vital signs มีชุดเดียว แถวนั้นต่อท้าย "แรกรับ" หรือ "ล่าสุด" หรือทั้งคู่
  - Consult ที่ถูกยกเลิก / ปฏิเสธ แสดงสถานะอะไร
- **เวลา**
  - เวลาใน ER ปัดเศษวินาทีอย่างไร (ปัดลง / ปัดเศษ) — มีผลกับ TC 041–044 ที่ขอบ
  - เวลาใน ER ของ visit ที่จำหน่ายแล้วนับถึงเวลาไหน (dev: เวลายืนยันจำหน่ายออกจาก ER)
- **Permission / role**
  - Use case ระบุแพทย์ ER และแพทย์ที่รับต่อ (IPD / Consult) — role อื่น (พยาบาล ฯลฯ) เปิด ER Summary ได้หรือไม่ การ์ดไม่บอก
- **Edge cases**
  - แพทย์เปิดแก้ Disposition (reopen) หลังลงนาม — ส่วนการจำหน่ายแสดงฉบับไหน
  - visit ที่ Admit แล้วรายการด้านซ้ายมีทั้ง IPD และ ER — ER Summary ต้องเปิดจาก visit ER เท่านั้น

## คำถามก่อนสร้างใน Linear

1. ~~Environment~~ → **Dev-X / SBH Prod** (31 ต.ค. 2569) · ⚠️ ถ้ารันบน SBH Prod ผู้ป่วยที่สร้างเป็นข้อมูลจริง
2. ~~QA Sub-module / Feature~~ → สร้าง `QA Sub-module / Feature : ER Summary` แล้ว (31 ต.ค. 2569)
3. ~~TC ที่ขัดกับงาน dev~~ → ยึด AC ให้ BA ตัดสินตอนรัน (31 ต.ค. 2569)
4. Run Type **CT** (การ์ดผูก Cycle) · QA Module **ER** — ใช้ตามนี้
