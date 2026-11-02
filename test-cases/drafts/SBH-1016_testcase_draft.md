# Draft Test Structure — SBH-1016

> สถานะ: **สร้างใน Linear แล้ว (2026-10-31)** — ผู้ใช้พิมพ์ "สร้างได้"
> - EXE SBH-3392 (EXE - CT - 2.9.0) → HPY SBH-3393 (TC 001–031 = SBH-3396–3426) · UHP SBH-3394 (TC 032–048 = SBH-3427–3443) · EDG SBH-3395 (TC 049–053 = SBH-3444–3448) — เลข TC เรียงต่อเนื่อง TC-001 = SBH-3396 … TC-053 = SBH-3448
> - EXE / Scenario = Ready for Testing · TC = Not Run · assignee Suchat ทุกใบ · milestone ER - เก็บตก, edge case · TC ใช้ label `QA : Manual` · connector เป็นบัญชี Suchat (สร้างโดย = Suchat)
> - ตอนสร้างเพิ่มหมายเหตุใน Linear: TC-021 / TC-022 "กด ส่ง = สร้างใบส่งต่อจริงในระบบ MoPH Refer ของ env นั้น" (TC-022 + "ทำหลัง TC-034") · TC-041 / TC-046 / TC-047 ขยายหมายเหตุเรื่องการเตรียม user / แพทย์
> - ชุดนี้ = EXE 1 + Scenario 3 (HPY / UHP / EDG) + TC 53 = 57 ใบ · ผู้ใช้สั่งตัด Scenario ERR + TC 054–057 ออก (31 ต.ค. 2569)
> - ยึด AC 5 ข้อของการ์ดเป็นหลัก · รายละเอียดพฤติกรรม / ข้อความ / สถานะ อ้างจากสเปก SBH-2430 (sub-issue ของการ์ด), SBH-2435 (UI)
>   และเอกสาร "MoPH Refer Out — แหล่งข้อมูลและ Prefill ของฟอร์ม" (Dev, 14 ต.ค. 2569)
> - Scope ตามที่อนุมัติในการ์ด (12 ต.ค.): **ER + OPD** · ส่งผ่าน **ศูนย์ Refer (ห้อง 13)** ไม่ส่งตรงจาก ER/OPD · IPD ไม่อยู่ในรอบนี้
> - **Env Dev-X / SBH Prod — ผู้ใช้ยืนยันแล้ว (31 ต.ค. 2569)**
> - **QA Sub-module / Feature : MoPH Refer Out — สร้าง label ใหม่ในกลุ่มแล้วตามที่ผู้ใช้สั่ง (31 ต.ค. 2569, id ea1175f0)**
> - ใช้ค่าตามชุดก่อนหน้า (รอผู้ใช้ยืนยัน): Run Type CT (การ์ดผูก Cycle) · QA Module : ER
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ⚠️ กด "ส่ง" = สร้างใบส่งต่อจริงในระบบ MoPH Refer ของ env นั้น — ถ้ารันบน SBH Prod จะเป็นใบส่งต่อจริงระดับประเทศ (ดูคำถามท้ายไฟล์)
> - ⚠️ Linear MCP ล็อกอินด้วยบัญชี Neranchara Kaewsiri — assignee ต้องใส่ ID ของ Suchat (`ac7ed47a-b74d-4a54-992f-5d09acad47f2`)

Requirement: SBH-1016 — [ER][OPD] Integrate MOPH Refer - Refer Out
URL: https://linear.app/cortexcloud/issue/SBH-1016/eropd-integrate-moph-refer-refer-out
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: High · State: Ready for Testing
Labels: Natthaphat ( MOD ) 🙈 · 🍄 Improvement · VERSION 2.9.0 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Chalantorn (Not)
Sub-Issue: CTXN-9885 Design Task · SBH-2430 สเปก (sub-issue SBH-2431–2435) — ยังไม่มี EXE / TC
คอมเมนต์: อัปเดตการตัดสินใจ 12 ต.ค. (workflow ผ่านศูนย์ Refer) + รูป Hospital Refer Out Process
PR: cortex-api #2713 · cortex-ui #2344 · cortex-x #8783 · cortex-testing #1432
Scope / Version = 2.9.0 (label VERSION 2.9.0 ของการ์ด)

## AC → TC

| AC | ความหมายที่ใช้ทดสอบ | TC |
|---|---|---|
| 1 ระบุ TOR reference และ data fields สำหรับ MOPH Refer | ฟอร์ม Refer Out มีข้อมูลครบตามที่ MoPH ต้องการ และเติมจาก Visit ถูกต้อง | 004–015 |
| 2 รองรับ destination ward / referral payload สำหรับ refer/transfer | รายการเข้า Worklist ถูกต้องตามแหล่ง (ER / OPD) และโรงพยาบาลปลายทาง | 001 · 002 · 003 · 016 · 043 · 049 |
| 3 ต้องมี error, retry และ audit trail design | กดส่งซ้ำไม่เกิดใบส่งต่อซ้ำ | 053 (error / retry → ผู้ใช้สั่งตัดออก · audit trail → gap) |
| 4 ต้องระบุ permission สำหรับ user ที่ส่งข้อมูลภายนอกได้ | user ไม่มีสิทธิ์ไม่เห็นเมนู / ปุ่ม · ฝั่ง ER/OPD ดูได้อย่างเดียว | 046 · 047 · 048 |
| 5 ต้องมี test case สำหรับ required field และ failed submission | ช่องบังคับว่าง / ค่าผิดรูปแบบ → ส่งไม่ได้ | 032–041 (failed submission → ผู้ใช้สั่งตัดออก) |
| Business Flow + scope ที่อนุมัติ (ER กดส่งให้ศูนย์ Refer) | รอพิจารณา → รอ ผอ. ลงนาม → อนุมัติ (ได้เลข) → ส่งแล้ว / ไม่อนุมัติ · ยกเลิก · ER/OPD เห็นสถานะ | 017–031 · 042 · 044 · 045 · 050–052 |

> เทคนิค: สถานะคำขอใช้ State Transition ตามตารางในสเปก SBH-2430 (ทุกเส้นที่ทำได้ + เส้นที่ต้องทำไม่ได้) ·
> ช่องบังคับใช้ EP กลุ่มค่าว่าง 1 ช่องต่อ TC · เลขบัตรประชาชน / วันหมดอายุใช้ BVA ตามกฎในเอกสาร Prefill (13 หลัก · ห้ามเป็นวันที่ผ่านมาแล้ว)

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | ตรวจสอบรายการ ER ที่ลงนาม Disposition ส่งต่อพร้อมโรงพยาบาลปลายทางแสดงใน Worklist Refer Out | แสดงแถวผู้ป่วย แหล่ง ER · สถานะ รอพิจารณา · ปลายทางตาม Disposition |
| 002 | HPY | ตรวจสอบรายการ OPD ที่ลงนาม Disposition ส่งต่อแสดงใน Worklist Refer Out | แสดงแถวผู้ป่วย แหล่ง OPD · สถานะ รอพิจารณา · ปลายทางแสดงว่ารอเลือก |
| 003 | HPY | ตรวจสอบคอลัมน์ของ Worklist Refer Out | มีคอลัมน์ ผู้ป่วย · HN/VN · แหล่ง · เวลาลงนาม · ปลายทาง · แพทย์ผู้ลงนาม · สถานะ |
| 004 | HPY | ตรวจสอบส่วนหัวฟอร์มแสดง HN VN และโรงพยาบาลต้นทางปลายทางตาม Disposition ER | HN / VN ตรงกับ Visit · ต้นทาง = โรงพยาบาลตัวเอง · ปลายทาง = ที่แพทย์ระบุใน Disposition |
| 005 | HPY | ตรวจสอบข้อมูลผู้ป่วยเติมอัตโนมัติจากทะเบียนผู้ป่วย | เลขบัตร ชื่อ เพศ วันเกิด เบอร์โทร ที่อยู่ ตรงกับทะเบียนผู้ป่วย |
| 006 | HPY | ตรวจสอบแพทย์ผู้ส่งต่อเริ่มต้นเป็นแพทย์ผู้ลงนาม Disposition | แพทย์ผู้ส่งต่อ = แพทย์ที่ลงนาม Disposition ไม่ใช่ user ที่ login |
| 007 | HPY | ตรวจสอบรายการการวินิจฉัยเติมจากรหัส ICD-10 ของ Visit | แสดงทุกรหัสของ Visit · Primary = PP · Comorbidity = CM |
| 008 | HPY | ตรวจสอบการวินิจฉัยเบื้องต้นเติมจากการวินิจฉัยหลัก | การวินิจฉัยเบื้องต้น = "รหัส ชื่อโรค" ของการวินิจฉัยหลัก และแก้ไขได้ |
| 009 | HPY | ตรวจสอบสัญญาณชีพเติมจากชุดล่าสุดของ Visit ER | ค่าสัญญาณชีพเป็นชุดล่าสุด · ชีพจร = อัตราการเต้นของหัวใจ · วัดเมื่อ = เวลาชุดล่าสุด |
| 010 | HPY | ตรวจสอบความเร่งด่วนของ ER เติมตามระดับ ESI | ความเร่งด่วน = ระดับ ESI ของผู้ป่วย |
| 011 | HPY | ตรวจสอบประวัติแพ้ยาเติมชื่อสิ่งที่แพ้ของผู้ป่วย | แสดงสิ่งที่แพ้ตามประวัติ · ระดับความรุนแรงและอาการว่างรอเลือก |
| 012 | HPY | ตรวจสอบยาที่สั่งใน Visit เติมครบโดยไม่รวมรายการที่ยกเลิก | แสดงเฉพาะยาที่สั่งอยู่ · ไม่มีรายการที่ยกเลิก · ระบุว่าเป็นยาที่สั่งใน Visit นี้ |
| 013 | HPY | ตรวจสอบสิทธิการรักษาแสดงอย่างเดียวแก้ไขไม่ได้ | ช่องสิทธิแก้ไม่ได้ · มีข้อความให้แก้ที่ Visit |
| 014 | HPY | ตรวจสอบวันหมดอายุเริ่มต้นเป็น 31 ธ.ค. ของปีปัจจุบัน | ระยะเวลาใช้ได้ = ระบุวันหมดอายุ · วันหมดอายุ = 31 ธ.ค. ของปีปัจจุบัน |
| 015 | HPY | บันทึกร่างฟอร์ม Refer Out แล้วเปิดใหม่ข้อมูลที่กรอกยังอยู่ | เหตุผลในการส่งต่อและประเภทการส่งต่อยังเป็นค่าที่กรอกไว้ |
| 016 | HPY | เลือกโรงพยาบาลปลายทางให้รายการ OPD | ปลายทางแสดงตามที่เลือกทั้งในคำขอและ Worklist |
| 017 | HPY | บันทึกสถานะรอ ผอ. ลงนาม | สถานะเปลี่ยนเป็น รอ ผอ. ลงนาม |
| 018 | HPY | ส่งคำขอกลับรอพิจารณาจากสถานะรอ ผอ. ลงนาม | สถานะกลับเป็น รอพิจารณา |
| 019 | HPY | อนุมัติคำขอ Refer Out | สถานะเปลี่ยนเป็น อนุมัติ |
| 020 | HPY | ตรวจสอบเลข Refer Out แสดงทันทีหลังอนุมัติตามรูปแบบเลขลำดับ/ปี พ.ศ. | แสดงเลขรูปแบบ 0000/69 ทันทีหลังอนุมัติ ก่อนส่ง MoPH |
| 021 | HPY | ส่งข้อมูล Refer Out ของ ER ไป MoPH สำเร็จ | สถานะ ส่งแล้ว · แสดง Refer ID · เลข Refer Out เดิมจากตอนอนุมัติ |
| 022 | HPY | ส่งข้อมูล Refer Out ของ OPD ไป MoPH สำเร็จ | สถานะ ส่งแล้ว · แสดง Refer ID · ปลายทาง = ที่ศูนย์ Refer เลือก |
| 023 | HPY | รีเฟรชสถานะล่าสุดจาก MoPH ของใบส่งต่อที่ส่งแล้ว | แสดงสถานะล่าสุดจาก MoPH |
| 024 | HPY | ไม่อนุมัติคำขอ Refer Out พร้อมระบุเหตุผล | สถานะ ไม่อนุมัติ · แสดงเหตุผลที่กรอก |
| 025 | HPY | ตรวจสอบคำขอที่ไม่อนุมัติไม่ได้รับเลข Refer Out | ไม่มีเลข Refer Out ในคำขอ |
| 026 | HPY | ตรวจสอบหน้าหลังตรวจ ER แสดงสถานะ Refer ID และเลข Refer Out หลังส่งแล้ว | Panel แสดงสถานะ ส่งแล้ว · Refer ID · เลข Refer Out ตรงกับศูนย์ Refer |
| 027 | HPY | ตรวจสอบเมนูด้านข้างผู้ป่วย OPD แสดงสถานะ Refer Out ของ VN ที่เลือก | Panel แสดงสถานะ ส่งแล้ว · Refer ID · เลข Refer Out ตรงกับศูนย์ Refer |
| 028 | HPY | ตรวจสอบหน้าหลังตรวจ ER แสดงเหตุผลไม่อนุมัติและให้เปลี่ยน Disposition เป็น Discharge with approval | Panel แสดงสถานะ ไม่อนุมัติ · เหตุผล · ข้อความให้เปลี่ยน Disposition เป็น Discharge with approval |
| 029 | HPY | ยกเลิกการอนุมัติก่อนส่ง MoPH | แจ้งเตือนว่าเลข Refer Out จะถูกยกเลิก · ยืนยันแล้วสถานะกลับเป็น รอพิจารณา |
| 030 | HPY | ยกเลิกใบส่งต่อที่ส่ง MoPH แล้วพร้อมระบุเหตุผล | สถานะใบส่งต่อเป็น ยกเลิก |
| 031 | HPY | อนุมัติใหม่หลังยกเลิกใบส่งต่อได้เลข Refer Out ใหม่ | ได้เลข Refer Out ใหม่ ไม่ซ้ำเลขเดิม |
| 032 | UHP | ตรวจสอบส่งไม่ได้เมื่อไม่กรอกเหตุผลในการส่งต่อ | ส่งไม่ได้ · ช่องเหตุผลในการส่งต่อแจ้งว่าต้องกรอก |
| 033 | UHP | ตรวจสอบส่งไม่ได้เมื่อไม่เลือกประเภทการส่งต่อ | ส่งไม่ได้ · ช่องประเภทการส่งต่อแจ้งว่าต้องเลือก |
| 034 | UHP | ตรวจสอบส่งไม่ได้เมื่อไม่เลือกความเร่งด่วนของรายการ OPD | ส่งไม่ได้ · ช่องความเร่งด่วนแจ้งว่าต้องเลือก |
| 035 | UHP | ตรวจสอบส่งไม่ได้เมื่อลบการวินิจฉัยเบื้องต้นออก | ส่งไม่ได้ · ช่องการวินิจฉัยเบื้องต้นแจ้งว่าต้องกรอก |
| 036 | UHP | ตรวจสอบส่งไม่ได้เมื่อไม่เลือกระดับความรุนแรงของรายการแพ้ยา | ส่งไม่ได้ · ช่องระดับความรุนแรงแจ้งว่าต้องเลือก |
| 037 | UHP | ตรวจสอบส่งไม่ได้เมื่อไม่เลือกอาการของรายการแพ้ยา | ส่งไม่ได้ · ช่องอาการแจ้งว่าต้องเลือก |
| 038 | UHP | ตรวจสอบส่งไม่ได้เมื่อเลขบัตรประชาชนผู้ป่วยมี 12 หลัก | ส่งไม่ได้ · แจ้งว่าเลขบัตรประชาชนไม่ถูกต้อง |
| 039 | UHP | ตรวจสอบส่งไม่ได้เมื่อเลขบัตรประชาชนผู้ป่วย 13 หลักแต่หลักตรวจสอบผิด | ส่งไม่ได้ · แจ้งว่าเลขบัตรประชาชนไม่ถูกต้อง |
| 040 | UHP | ตรวจสอบส่งไม่ได้เมื่อวันหมดอายุเป็นวันที่ผ่านมาแล้ว | ส่งไม่ได้ · ช่องวันหมดอายุแจ้งว่าห้ามเป็นวันที่ผ่านมาแล้ว |
| 041 | UHP | ตรวจสอบส่งไม่ได้เมื่อแพทย์ผู้ส่งต่อไม่มีเลขบัตรประชาชน | แจ้งว่าแพทย์ไม่มีเลขบัตรประชาชน · ส่งไม่ได้ |
| 042 | UHP | ตรวจสอบไม่อนุมัติไม่ได้เมื่อไม่ระบุเหตุผล | บันทึกไม่อนุมัติไม่ได้ · ช่องเหตุผลแจ้งว่าต้องกรอก · สถานะยังเป็น รอพิจารณา |
| 043 | UHP | ตรวจสอบอนุมัติคำขอ OPD ไม่ได้เมื่อยังไม่เลือกโรงพยาบาลปลายทาง | อนุมัติไม่ได้ · แจ้งให้เลือกโรงพยาบาลปลายทาง |
| 044 | UHP | ตรวจสอบยกเลิกใบส่งต่อไม่ได้เมื่อไม่ระบุเหตุผล | ยกเลิกไม่ได้ · ช่องเหตุผลแจ้งว่าต้องกรอก · สถานะยังเป็น ส่งแล้ว |
| 045 | UHP | ตรวจสอบไม่มีปุ่มส่งเมื่อคำขอยังไม่อนุมัติ | ไม่มีปุ่ม ส่ง ในสถานะ รอพิจารณา |
| 046 | UHP | ตรวจสอบ user ที่ไม่มีสิทธิ์ไม่เห็นเมนู Refer Out | ไม่มีเมนู Refer Out ในแอป Refer |
| 047 | UHP | ตรวจสอบ user ที่มีสิทธิ์ดูอย่างเดียวไม่เห็นปุ่มพิจารณาและส่ง | เปิดคำขอได้ แต่ไม่มีปุ่ม อนุมัติ / ไม่อนุมัติ / ส่ง / ยกเลิก |
| 048 | UHP | ตรวจสอบหน้าหลังตรวจ ER ไม่มีปุ่มส่งหรือยกเลิกใบส่งต่อ | Panel แสดงสถานะอย่างเดียว · ไม่มีฟอร์ม ปุ่ม ส่ง หรือ ยกเลิก |
| 049 | EDG | ตรวจสอบรายการ ER ส่งต่อที่ไม่ระบุโรงพยาบาลปลายทางไม่แสดงใน Worklist | ไม่มีแถวของผู้ป่วยใน Worklist Refer Out |
| 050 | EDG | ตรวจสอบคำขอแสดงสถานะ Disposition เปลี่ยนเมื่อแพทย์เปิดแก้ Disposition หลังอนุมัติ | สถานะคำขอแสดง Disposition เปลี่ยน |
| 051 | EDG | ตรวจสอบส่งไม่ได้เมื่อ Disposition เปลี่ยนหลังอนุมัติ | ไม่มีปุ่ม ส่ง หรือกดแล้วถูกปฏิเสธจนกว่าจะพิจารณาใหม่ |
| 052 | EDG | ตรวจสอบรายการกลับเข้า Worklist เป็นรอพิจารณาเมื่อลงนาม Disposition ส่งต่อใหม่หลังไม่อนุมัติ | แสดงคำขอใหม่สถานะ รอพิจารณา |
| 053 | EDG | ตรวจสอบกดส่ง 2 ครั้งติดกันได้ใบส่งต่อใน MoPH ใบเดียว | ได้ Refer ID เดียว · ใน MoPH มีใบส่งต่อของเลขนี้ใบเดียว |

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user ศูนย์ Refer**: role ที่มีสิทธิ์ `moph-refer-out:review` / `submit` / `cancel` (บน dev-x = role ชุดเดียวกับ Refer IN confirm-arrival เช่น nurse)
- **user แพทย์ ER / พยาบาล ER / user OPD**: ใช้สร้างและลงนาม Disposition, ดู Panel สถานะ
- **user ไม่มีสิทธิ์** (TC 046) และ **user สิทธิ์ดูอย่างเดียว** (TC 047): ต้องเตรียม — ดู gap ข้อ Permission
- โรงพยาบาลปลายทางทดสอบของ MoPH `C0016` ต้องมีใน master โรงพยาบาล (สเปก SBH-2430)
- **ผู้ป่วย A (ER)** — ใช้กับ 001, 003–015, 017–021, 023, 026, 030, 031, 044, 048:
  เปิด Visit ER → คัดกรอง (ESI) → ER Physician Note เลือก Diagnosis ≥ 2 รหัส (Primary + Comorbidity) → สัญญาณชีพ 2 ชุด →
  ประวัติแพ้ยา ≥ 1 รายการ → สั่งยา 3 รายการ แล้วยกเลิก 1 รายการ → Disposition ประเภท 4 (Refer) ระบุโรงพยาบาลปลายทาง →
  แพทย์ที่มีเลขบัตรประชาชนลงนาม
- **ผู้ป่วย B (OPD)** — ใช้กับ 002, 016, 022, 027, 034, 043: Visit OPD → Diagnosis → Disposition ประเภท 4 ลงนาม (OPD ไม่มีช่องปลายทาง)
- **ผู้ป่วย C (ER)** — ใช้กับ 024, 025, 028, 042, 052: เหมือนผู้ป่วย A (ไม่ต้องมีแพ้ยา / ยา)
- **ผู้ป่วย D (ER)** — ใช้กับ 029, 045, 050, 051: เหมือนผู้ป่วย C
- **ผู้ป่วย E (ER)** — ใช้กับ 049: Disposition ประเภท 4 **ไม่ระบุ** โรงพยาบาลปลายทาง (Transfer ภายใน) ลงนามแล้ว
- **ผู้ป่วย F (ER)** — ใช้กับ 041: Disposition ลงนามโดยแพทย์ที่ **ไม่มี** เลขบัตรประชาชนในระบบ
- **ผู้ป่วย G (ER)** — ใช้กับ 032, 033, 035–040: เหมือนผู้ป่วย A อนุมัติแล้ว (ยังไม่ส่ง)
- **ผู้ป่วย H (ER)** — ใช้กับ 053: เหมือนผู้ป่วย C อนุมัติแล้ว

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, VERSION 2.9.0, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : MoPH Refer Out, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: ER / OPD / Refer — MoPH Refer Out
- Requirement ที่อ้างอิง: SBH-1016 — [ER][OPD] Integrate MOPH Refer - Refer Out
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Worklist Refer Out ของศูนย์ Refer: รายการจาก ER / OPD ที่ลงนาม Disposition ส่งต่อ และโรงพยาบาลปลายทาง
- ฟอร์ม Refer Out: ข้อมูลที่เติมจาก Visit · ช่องบังคับ · สิทธิแสดงอย่างเดียว · บันทึกร่าง
- การพิจารณา: รอ ผอ. ลงนาม · อนุมัติ (ได้เลข Refer Out) · ไม่อนุมัติ · ยกเลิกการอนุมัติ
- ส่ง MoPH: ส่งสำเร็จ · กดส่งซ้ำไม่เกิดใบซ้ำ · ยกเลิกใบส่งต่อ
- Panel สถานะ Refer Out ฝั่ง ER (หลังตรวจ) และ OPD (เมนูด้านข้างผู้ป่วย)
- สิทธิ์การเห็นเมนูและปุ่ม

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-1016-HPY - ศูนย์ Refer พิจารณาและส่ง Refer Out ของ ER และ OPD ไป MoPH Refer

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : MoPH Refer Out + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1016-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER / OPD / Refer — MoPH Refer Out
- Requirement ที่อ้างอิง: SBH-1016 — [ER][OPD] Integrate MOPH Refer - Refer Out

วัตถุประสงค์
- ยืนยันว่ารายการ Refer Out จาก ER / OPD เข้า Worklist ศูนย์ Refer ฟอร์มเติมข้อมูลถูกต้อง พิจารณา อนุมัติ ส่ง MoPH และยกเลิกได้ และฝั่ง ER / OPD เห็นสถานะ

ขอบเขต Requirement
- AC 1: data fields สำหรับ MoPH Refer
- AC 2: destination / referral payload
- Business Flow: ER/OPD ลงนาม → ศูนย์ Refer พิจารณา → ส่ง MoPH (scope ที่อนุมัติ 12 ต.ค. 2569)

ความเสี่ยง
- รายการส่งต่อไม่เข้า Worklist → ไม่มีใครส่ง MoPH ผู้ป่วยไปถึงปลายทางแล้วไม่มีใบส่งต่อ
- ข้อมูลที่เติมผิด (แพทย์ผิดคน ยาที่ยกเลิกติดไป ข้อมูลผู้ป่วยผิด) ถูกส่งออกนอกโรงพยาบาล
- เลข Refer Out ไม่แสดงตอนอนุมัติ → ประทับตราบนหนังสือไม่ได้
- ER / OPD ไม่เห็นผลไม่อนุมัติ → ไม่แก้ Disposition ปิด Visit ไม่ถูก

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ระบุในแต่ละ TC (ดูหัวข้อข้อมูลตั้งต้น)
```

### TC-SBH-1016-001 - ตรวจสอบรายการ ER ที่ลงนาม Disposition ส่งต่อพร้อมโรงพยาบาลปลายทางแสดงใน Worklist Refer Out

Status: Not Run · Priority: Urgent · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : MoPH Refer Out + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-1016-001
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer
2. แอป Refer > เมนู Refer Out
3. ค้นหาผู้ป่วย A

## Expected Result
แสดงแถวผู้ป่วย A แหล่ง ER สถานะ รอพิจารณา
โรงพยาบาลปลายทางตรงกับที่แพทย์ระบุใน Disposition

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 — ER ประเภท 4 + มีโรงพยาบาลปลายทาง = เข้า Worklist
```

### TC-SBH-1016-002 - ตรวจสอบรายการ OPD ที่ลงนาม Disposition ส่งต่อแสดงใน Worklist Refer Out

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-002
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > แอป Refer > เมนู Refer Out
2. ค้นหาผู้ป่วย B

## Expected Result
แสดงแถวผู้ป่วย B แหล่ง OPD สถานะ รอพิจารณา
ช่องโรงพยาบาลปลายทางแสดงว่ารอเลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 — OPD ไม่มีช่องปลายทางใน Disposition ศูนย์ Refer เป็นผู้เลือก
```

### TC-SBH-1016-003 - ตรวจสอบคอลัมน์ของ Worklist Refer Out

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001 แต่ QA Type : UIUX

```
TC ID: TC-SBH-1016-003
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > แอป Refer > เมนู Refer Out
2. ดูหัวตารางและแถวผู้ป่วย A

## Expected Result
ตารางมีคอลัมน์ ผู้ป่วย · HN/VN · แหล่ง (ER/OPD) · เวลาลงนาม · โรงพยาบาลปลายทาง · แพทย์ผู้ลงนาม · สถานะ
ค่าในแถวผู้ป่วย A ตรงกับ Visit และ Disposition

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-004 - ตรวจสอบส่วนหัวฟอร์มแสดง HN VN และโรงพยาบาลต้นทางปลายทางตาม Disposition ER

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-004
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > แอป Refer > เมนู Refer Out
2. เปิดคำขอของผู้ป่วย A
3. ดูส่วนหัวของฟอร์ม Refer Out

## Expected Result
HN / VN ตรงกับ Visit ER ของผู้ป่วย A
โรงพยาบาลต้นทางเป็นโรงพยาบาลตัวเอง และโรงพยาบาลปลายทางตรงกับที่ระบุใน Disposition
ส่วนหัวแก้ไขไม่ได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 / AC 2
```

### TC-SBH-1016-005 - ตรวจสอบข้อมูลผู้ป่วยเติมอัตโนมัติจากทะเบียนผู้ป่วย

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-005
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A
2. ดูส่วนข้อมูลผู้ป่วย เทียบกับหน้าทะเบียนผู้ป่วย A

## Expected Result
เลขบัตรประชาชน คำนำหน้า ชื่อ นามสกุล เพศ วันเกิด เบอร์มือถือ และที่อยู่ (บ้านเลขที่ หมู่ ถนน ตำบล อำเภอ จังหวัด) ตรงกับทะเบียนผู้ป่วย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1 — ซอยไม่แสดง / ไม่ส่ง เพราะ MoPH ไม่มีช่องซอย (เอกสาร Prefill)
```

### TC-SBH-1016-006 - ตรวจสอบแพทย์ผู้ส่งต่อเริ่มต้นเป็นแพทย์ผู้ลงนาม Disposition

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-006
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer (ไม่ใช่แพทย์ที่ลงนาม Disposition) > เปิดคำขอของผู้ป่วย A
2. ดูช่องแพทย์ผู้ส่งต่อ

## Expected Result
แพทย์ผู้ส่งต่อเป็นแพทย์ที่ลงนาม Disposition ของผู้ป่วย A ไม่ใช่ user ที่ login อยู่

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-007 - ตรวจสอบรายการการวินิจฉัยเติมจากรหัส ICD-10 ของ Visit

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-007
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A
2. ดูส่วนการวินิจฉัย เทียบกับ Diagnosis ที่แพทย์บันทึกใน Visit

## Expected Result
แสดงรหัส ICD-10 ทุกรหัสของ Visit เรียงตามลำดับ
ประเภทการวินิจฉัย: Primary = PP · Comorbidity = CM

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-008 - ตรวจสอบการวินิจฉัยเบื้องต้นเติมจากการวินิจฉัยหลัก

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-008
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A
2. ดูช่องการวินิจฉัยเบื้องต้นในส่วนสรุปทางคลินิก

## Expected Result
ช่องการวินิจฉัยเบื้องต้นแสดง "รหัส ชื่อโรค" ของการวินิจฉัยหลัก (PP) และแก้ไขได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-009 - ตรวจสอบสัญญาณชีพเติมจากชุดล่าสุดของ Visit ER

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-009
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A (บันทึกสัญญาณชีพไว้ 2 ชุด)
2. ดูส่วนสัญญาณชีพ เทียบกับสัญญาณชีพชุดที่ 2

## Expected Result
ความดัน อัตราการเต้นของหัวใจ อัตราการหายใจ อุณหภูมิ SpO2 เป็นค่าของชุดที่ 2 (ล่าสุด)
ชีพจรเท่ากับอัตราการเต้นของหัวใจ และวัดเมื่อ = เวลาของชุดที่ 2

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-010 - ตรวจสอบความเร่งด่วนของ ER เติมตามระดับ ESI

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-010
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A
2. ดูช่องความเร่งด่วน เทียบกับระดับ ESI ตอนคัดกรอง

## Expected Result
ความเร่งด่วนตรงกับระดับ ESI (เช่น ESI 3 → 3 Urgent)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-011 - ตรวจสอบประวัติแพ้ยาเติมชื่อสิ่งที่แพ้ของผู้ป่วย

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-011
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A
2. ดูส่วนประวัติแพ้ยา เทียบกับประวัติแพ้ยาของผู้ป่วย A

## Expected Result
แสดงสิ่งที่แพ้ครบตามประวัติที่ Active
ช่องระดับความรุนแรงและอาการว่าง รอเจ้าหน้าที่เลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-012 - ตรวจสอบยาที่สั่งใน Visit เติมครบโดยไม่รวมรายการที่ยกเลิก

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-012
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A (สั่งยา 3 รายการ ยกเลิก 1 รายการ)
2. ดูส่วนยาที่สั่งใน Visit

## Expected Result
แสดงยา 2 รายการที่สั่งอยู่ ไม่มีรายการที่ยกเลิก
ส่วนนี้ระบุว่าเป็นยาที่สั่งใน Visit นี้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-013 - ตรวจสอบสิทธิการรักษาแสดงอย่างเดียวแก้ไขไม่ได้

Status: Not Run · Priority: High · Labels: เหมือน TC-001 แต่ QA Type : UIUX

```
TC ID: TC-SBH-1016-013
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A
2. ลองแก้ไขช่องในส่วนสิทธิการรักษา

## Expected Result
ช่องสิทธิการรักษาแก้ไขไม่ได้ และมีข้อความแนะนำให้แก้ที่ Visit

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-014 - ตรวจสอบวันหมดอายุเริ่มต้นเป็น 31 ธ.ค. ของปีปัจจุบัน

Status: Not Run · Priority: Low · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-014
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A
2. ดูช่องระยะเวลาใช้ได้และวันหมดอายุ

## Expected Result
ระยะเวลาใช้ได้เป็น ระบุวันหมดอายุ และวันหมดอายุเป็น 31 ธ.ค. ของปีปัจจุบัน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-015 - บันทึกร่างฟอร์ม Refer Out แล้วเปิดใหม่ข้อมูลที่กรอกยังอยู่

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-015
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A
2. กรอกเหตุผลในการส่งต่อ และเลือกประเภทการส่งต่อ
3. กด บันทึกร่าง
4. กลับไป Worklist แล้วเปิดคำขอของผู้ป่วย A อีกครั้ง

## Expected Result
เหตุผลในการส่งต่อและประเภทการส่งต่อยังเป็นค่าที่กรอกไว้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-016 - เลือกโรงพยาบาลปลายทางให้รายการ OPD

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-016
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย B (ทำหลัง TC-043)
2. เลือกโรงพยาบาลปลายทาง (C0016) แล้วบันทึก
3. กลับไปดูแถวผู้ป่วย B ใน Worklist

## Expected Result
โรงพยาบาลปลายทางแสดงตามที่เลือก ทั้งในคำขอและใน Worklist

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 — ต้องเลือกปลายทางก่อนอนุมัติ (สเปก SBH-2430)
```

### TC-SBH-1016-017 - บันทึกสถานะรอ ผอ. ลงนาม

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-017
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A (สถานะ รอพิจารณา)
2. กดทำเครื่องหมายว่าต้องให้ ผอ. ลงนาม

## Expected Result
สถานะคำขอเปลี่ยนเป็น รอ ผอ. ลงนาม ทั้งในคำขอและใน Worklist

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอพิจารณา → รอ ผอ. ลงนาม
```

### TC-SBH-1016-018 - ส่งคำขอกลับรอพิจารณาจากสถานะรอ ผอ. ลงนาม

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-018
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A (สถานะ รอ ผอ. ลงนาม จาก TC-017)
2. กดส่งกลับไปพิจารณา

## Expected Result
สถานะคำขอกลับเป็น รอพิจารณา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอ ผอ. ลงนาม → รอพิจารณา
```

### TC-SBH-1016-019 - อนุมัติคำขอ Refer Out

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-019
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A (สถานะ รอพิจารณา)
2. กด อนุมัติ

## Expected Result
สถานะคำขอเปลี่ยนเป็น อนุมัติ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอพิจารณา → อนุมัติ
```

### TC-SBH-1016-020 - ตรวจสอบเลข Refer Out แสดงทันทีหลังอนุมัติตามรูปแบบเลขลำดับ/ปี พ.ศ.

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-020
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก TC-019 ดูคำขอของผู้ป่วย A หลังอนุมัติ (ยังไม่กดส่ง)

## Expected Result
แสดงเลข Refer Out ทันที รูปแบบเลขลำดับ 4 หลัก / ปี พ.ศ. 2 หลัก (เช่น 0001/69)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ออกเลขตอนอนุมัติ เพื่อประทับตราบนหนังสือส่งตัว (ADR-0015)
```

### TC-SBH-1016-021 - ส่งข้อมูล Refer Out ของ ER ไป MoPH สำเร็จ

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-001 แต่ QA Type : Integration

```
TC ID: TC-SBH-1016-021
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A (อนุมัติแล้วจาก TC-019)
2. กรอกช่องบังคับให้ครบ (เหตุผลในการส่งต่อ · ประเภทการส่งต่อ · ระดับความรุนแรงและอาการของแพ้ยา)
3. กด ส่ง แล้วรอผล

## Expected Result
สถานะเปลี่ยนเป็น ส่งแล้ว
แสดง Refer ID จาก MoPH และเลข Refer Out เดียวกับตอนอนุมัติ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-022 - ส่งข้อมูล Refer Out ของ OPD ไป MoPH สำเร็จ

Status: Not Run · Priority: Urgent · Labels: เหมือน TC-021

```
TC ID: TC-SBH-1016-022
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย B (เลือกปลายทางแล้วจาก TC-016)
2. กด อนุมัติ
3. กรอกช่องบังคับให้ครบ (รวมความเร่งด่วน)
4. กด ส่ง แล้วรอผล

## Expected Result
สถานะเปลี่ยนเป็น ส่งแล้ว แสดง Refer ID
โรงพยาบาลปลายทางเป็นโรงพยาบาลที่ศูนย์ Refer เลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-023 - รีเฟรชสถานะล่าสุดจาก MoPH ของใบส่งต่อที่ส่งแล้ว

Status: Not Run · Priority: Medium · Labels: เหมือน TC-021

```
TC ID: TC-SBH-1016-023
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A (ส่งแล้วจาก TC-021)
2. กด Refresh สถานะ

## Expected Result
แสดงสถานะล่าสุดของใบส่งต่อจาก MoPH (เช่น ส่งถึงปลายทางแล้ว)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-024 - ไม่อนุมัติคำขอ Refer Out พร้อมระบุเหตุผล

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-024
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย C (สถานะ รอพิจารณา · ทำหลัง TC-042)
2. กด ไม่อนุมัติ > กรอกเหตุผล > ยืนยัน

## Expected Result
สถานะคำขอเปลี่ยนเป็น ไม่อนุมัติ และแสดงเหตุผลที่กรอก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — รอพิจารณา → ไม่อนุมัติ
```

### TC-SBH-1016-025 - ตรวจสอบคำขอที่ไม่อนุมัติไม่ได้รับเลข Refer Out

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-025
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก TC-024 ดูคำขอของผู้ป่วย C (ไม่อนุมัติ)

## Expected Result
คำขอไม่มีเลข Refer Out

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-026 - ตรวจสอบหน้าหลังตรวจ ER แสดงสถานะ Refer ID และเลข Refer Out หลังส่งแล้ว

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-026
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เปิดผู้ป่วย A (ส่งแล้วจาก TC-021) > หน้าหลังตรวจ
3. ดู Panel สถานะ Refer Out

## Expected Result
Panel แสดงสถานะ ส่งแล้ว พร้อม Refer ID และเลข Refer Out ตรงกับที่ศูนย์ Refer

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-027 - ตรวจสอบเมนูด้านข้างผู้ป่วย OPD แสดงสถานะ Refer Out ของ VN ที่เลือก

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-027
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user OPD
2. เปิดผู้ป่วย B เลือก VN ที่ส่งต่อ (ส่งแล้วจาก TC-022)
3. เมนูด้านข้างผู้ป่วย > Refer Out

## Expected Result
แสดงสถานะ ส่งแล้ว พร้อม Refer ID และเลข Refer Out ตรงกับที่ศูนย์ Refer

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-028 - ตรวจสอบหน้าหลังตรวจ ER แสดงเหตุผลไม่อนุมัติและให้เปลี่ยน Disposition เป็น Discharge with approval

Status: Not Run · Priority: High · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-028
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เปิดผู้ป่วย C (ไม่อนุมัติจาก TC-024) > หน้าหลังตรวจ
3. ดู Panel สถานะ Refer Out

## Expected Result
Panel แสดงสถานะ ไม่อนุมัติ พร้อมเหตุผล และข้อความให้เปลี่ยน Disposition เป็น Discharge with approval

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-029 - ยกเลิกการอนุมัติก่อนส่ง MoPH

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-029
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย D > กด อนุมัติ (ยังไม่ส่ง · ทำหลัง TC-045)
2. กด ยกเลิกการอนุมัติ > กรอกเหตุผล > ยืนยัน

## Expected Result
ก่อนยืนยันมีแจ้งเตือนว่าเลข Refer Out จะถูกยกเลิก
ยืนยันแล้วสถานะคำขอกลับเป็น รอพิจารณา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — อนุมัติ → รอพิจารณา (ทำได้เฉพาะยังไม่ส่ง)
```

### TC-SBH-1016-030 - ยกเลิกใบส่งต่อที่ส่ง MoPH แล้วพร้อมระบุเหตุผล

Status: Not Run · Priority: High · Labels: เหมือน TC-021

```
TC ID: TC-SBH-1016-030
Case Type: Happy
Test Type: Integration

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A (ส่งแล้ว · ทำหลัง TC-044)
2. กด ยกเลิกใบส่งต่อ > กรอกเหตุผล > ยืนยัน

## Expected Result
สถานะใบส่งต่อเปลี่ยนเป็น ยกเลิก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — ส่งแล้ว → ยกเลิก
```

### TC-SBH-1016-031 - อนุมัติใหม่หลังยกเลิกใบส่งต่อได้เลข Refer Out ใหม่

Status: Not Run · Priority: Medium · Labels: เหมือน TC-001

```
TC ID: TC-SBH-1016-031
Case Type: Happy
Test Type: Functional

## Test Step
1. ต่อจาก TC-030 จดเลข Refer Out เดิมของผู้ป่วย A
2. เปิดคำขอของผู้ป่วย A > กด อนุมัติ

## Expected Result
ได้เลข Refer Out ใหม่ ไม่ซ้ำกับเลขเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เลขที่ยกเลิกแล้วไม่นำกลับมาใช้ (ADR-0015)
```

---

## TS-SBH-1016-UHP - ส่ง Refer Out ไม่ได้เมื่อข้อมูลไม่ครบ ไม่ถูกต้อง หรือไม่มีสิทธิ์

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : MoPH Refer Out + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1016-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER / OPD / Refer — MoPH Refer Out
- Requirement ที่อ้างอิง: SBH-1016 — [ER][OPD] Integrate MOPH Refer - Refer Out

วัตถุประสงค์
- ยืนยันว่าระบบกันการส่ง / อนุมัติ / ยกเลิกเมื่อข้อมูลบังคับไม่ครบหรือไม่ถูกต้อง และ user ที่ไม่มีสิทธิ์ทำไม่ได้

ขอบเขต Requirement
- AC 4: permission สำหรับ user ที่ส่งข้อมูลภายนอกได้
- AC 5: required field
- Business Flow: ไม่อนุมัติ / ยกเลิกต้องระบุเหตุผล · OPD ต้องเลือกปลายทางก่อนอนุมัติ

ความเสี่ยง
- ข้อมูลไม่ครบถูกส่งไป MoPH แล้วถูกปฏิเสธ หรือปลายทางได้ข้อมูลผิด
- ใบส่งต่อออกในชื่อแพทย์ที่ไม่มีเลขบัตรประชาชน
- user ที่ไม่ใช่ศูนย์ Refer ส่ง / ยกเลิกใบส่งต่อได้

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- 032–040 แต่ละ TC เว้นว่าง / ใส่ค่าผิดทีละ 1 ช่อง ช่องอื่นกรอกครบ
```

### TC-SBH-1016-032 - ตรวจสอบส่งไม่ได้เมื่อไม่กรอกเหตุผลในการส่งต่อ

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : MoPH Refer Out + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-1016-032
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย G (อนุมัติแล้ว)
2. กรอกช่องบังคับอื่นครบ เว้นว่างเหตุผลในการส่งต่อ
3. กด ส่ง

## Expected Result
ส่งไม่ได้ ช่องเหตุผลในการส่งต่อแจ้งว่าต้องกรอก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — เทคนิค EP กลุ่มค่าว่าง
```

### TC-SBH-1016-033 - ตรวจสอบส่งไม่ได้เมื่อไม่เลือกประเภทการส่งต่อ

Status: Not Run · Priority: High · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-033
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย G (อนุมัติแล้ว)
2. กรอกช่องบังคับอื่นครบ ไม่เลือกประเภทการส่งต่อ
3. กด ส่ง

## Expected Result
ส่งไม่ได้ ช่องประเภทการส่งต่อแจ้งว่าต้องเลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — เทคนิค EP กลุ่มค่าว่าง
```

### TC-SBH-1016-034 - ตรวจสอบส่งไม่ได้เมื่อไม่เลือกความเร่งด่วนของรายการ OPD

Status: Not Run · Priority: High · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-034
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย B (เลือกปลายทางและอนุมัติแล้ว · ทำก่อนกดส่งใน TC-022)
2. กรอกช่องบังคับอื่นครบ ไม่เลือกความเร่งด่วน
3. กด ส่ง

## Expected Result
ส่งไม่ได้ ช่องความเร่งด่วนแจ้งว่าต้องเลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — OPD ไม่มี ESI จึงไม่มีค่าเติมให้ · เทคนิค EP กลุ่มค่าว่าง
```

### TC-SBH-1016-035 - ตรวจสอบส่งไม่ได้เมื่อลบการวินิจฉัยเบื้องต้นออก

Status: Not Run · Priority: High · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-035
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย G (อนุมัติแล้ว)
2. กรอกช่องบังคับอื่นครบ ลบข้อความในช่องการวินิจฉัยเบื้องต้นออก
3. กด ส่ง

## Expected Result
ส่งไม่ได้ ช่องการวินิจฉัยเบื้องต้นแจ้งว่าต้องกรอก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — เทคนิค EP กลุ่มค่าว่าง
```

### TC-SBH-1016-036 - ตรวจสอบส่งไม่ได้เมื่อไม่เลือกระดับความรุนแรงของรายการแพ้ยา

Status: Not Run · Priority: High · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-036
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย G (อนุมัติแล้ว มีประวัติแพ้ยา)
2. กรอกช่องบังคับอื่นครบ เลือกอาการแพ้ แต่ไม่เลือกระดับความรุนแรง
3. กด ส่ง

## Expected Result
ส่งไม่ได้ ช่องระดับความรุนแรงของรายการแพ้ยาแจ้งว่าต้องเลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — เทคนิค EP กลุ่มค่าว่าง
```

### TC-SBH-1016-037 - ตรวจสอบส่งไม่ได้เมื่อไม่เลือกอาการของรายการแพ้ยา

Status: Not Run · Priority: High · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-037
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย G (อนุมัติแล้ว มีประวัติแพ้ยา)
2. กรอกช่องบังคับอื่นครบ เลือกระดับความรุนแรง แต่ไม่เลือกอาการ
3. กด ส่ง

## Expected Result
ส่งไม่ได้ ช่องอาการของรายการแพ้ยาแจ้งว่าต้องเลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — เทคนิค EP กลุ่มค่าว่าง
```

### TC-SBH-1016-038 - ตรวจสอบส่งไม่ได้เมื่อเลขบัตรประชาชนผู้ป่วยมี 12 หลัก

Status: Not Run · Priority: High · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-038
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย G (อนุมัติแล้ว)
2. กรอกช่องบังคับอื่นครบ แก้เลขบัตรประชาชนผู้ป่วยให้เหลือ 12 หลัก
3. กด ส่ง

## Expected Result
ส่งไม่ได้ แจ้งว่าเลขบัตรประชาชนไม่ถูกต้อง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — เทคนิค BVA ขอบล่างของความยาว 13 หลัก (12 = เลยขอบ)
```

### TC-SBH-1016-039 - ตรวจสอบส่งไม่ได้เมื่อเลขบัตรประชาชนผู้ป่วย 13 หลักแต่หลักตรวจสอบผิด

Status: Not Run · Priority: Medium · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-039
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย G (อนุมัติแล้ว)
2. กรอกช่องบังคับอื่นครบ แก้หลักสุดท้ายของเลขบัตรประชาชนให้ผิด (ยังครบ 13 หลัก)
3. กด ส่ง

## Expected Result
ส่งไม่ได้ แจ้งว่าเลขบัตรประชาชนไม่ถูกต้อง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — เทคนิค EP กลุ่มเลขครบหลักแต่ check digit ผิด
```

### TC-SBH-1016-040 - ตรวจสอบส่งไม่ได้เมื่อวันหมดอายุเป็นวันที่ผ่านมาแล้ว

Status: Not Run · Priority: Medium · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-040
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย G (อนุมัติแล้ว)
2. กรอกช่องบังคับอื่นครบ ระยะเวลาใช้ได้ = ระบุวันหมดอายุ แก้วันหมดอายุเป็นเมื่อวาน
3. กด ส่ง

## Expected Result
ส่งไม่ได้ ช่องวันหมดอายุแจ้งว่าห้ามเป็นวันที่ผ่านมาแล้ว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — เทคนิค BVA ขอบล่างของวันหมดอายุ (เมื่อวาน = เลยขอบ)
```

### TC-SBH-1016-041 - ตรวจสอบส่งไม่ได้เมื่อแพทย์ผู้ส่งต่อไม่มีเลขบัตรประชาชน

Status: Not Run · Priority: High · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-041
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย F > กด อนุมัติ
2. กรอกช่องบังคับอื่นครบ (แพทย์ผู้ส่งต่อคงเป็นแพทย์ที่ไม่มีเลขบัตรประชาชน)
3. กด ส่ง

## Expected Result
แจ้งว่าแพทย์ผู้ส่งต่อไม่มีเลขบัตรประชาชน และส่งไม่ได้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5 — ต้องมีแพทย์ใน env ที่ไม่มีเลขบัตรประชาชน (ดู gap)
```

### TC-SBH-1016-042 - ตรวจสอบไม่อนุมัติไม่ได้เมื่อไม่ระบุเหตุผล

Status: Not Run · Priority: High · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-042
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย C (สถานะ รอพิจารณา)
2. กด ไม่อนุมัติ เว้นว่างเหตุผล > ยืนยัน

## Expected Result
บันทึกไม่อนุมัติไม่ได้ ช่องเหตุผลแจ้งว่าต้องกรอก สถานะยังเป็น รอพิจารณา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-043 - ตรวจสอบอนุมัติคำขอ OPD ไม่ได้เมื่อยังไม่เลือกโรงพยาบาลปลายทาง

Status: Not Run · Priority: High · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-043
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย B (ยังไม่เลือกปลายทาง)
2. กด อนุมัติ

## Expected Result
อนุมัติไม่ได้ แจ้งให้เลือกโรงพยาบาลปลายทางก่อน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 — สเปก SBH-2430 "Approve is refused without one"
```

### TC-SBH-1016-044 - ตรวจสอบยกเลิกใบส่งต่อไม่ได้เมื่อไม่ระบุเหตุผล

Status: Not Run · Priority: Medium · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-044
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย A (ส่งแล้วจาก TC-021)
2. กด ยกเลิกใบส่งต่อ เว้นว่างเหตุผล > ยืนยัน

## Expected Result
ยกเลิกไม่ได้ ช่องเหตุผลแจ้งว่าต้องกรอก สถานะยังเป็น ส่งแล้ว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-045 - ตรวจสอบไม่มีปุ่มส่งเมื่อคำขอยังไม่อนุมัติ

Status: Not Run · Priority: High · Labels: เหมือน TC-032

```
TC ID: TC-SBH-1016-045
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย D (สถานะ รอพิจารณา)
2. ดูปุ่มของคำขอ

## Expected Result
ไม่มีปุ่ม ส่ง ในสถานะ รอพิจารณา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: เทคนิค State Transition — เส้นที่ต้องทำไม่ได้ (รอพิจารณา → ส่ง)
```

### TC-SBH-1016-046 - ตรวจสอบ user ที่ไม่มีสิทธิ์ไม่เห็นเมนู Refer Out

Status: Not Run · Priority: High · Labels: เหมือน TC-032 แต่ QA Type : Security

```
TC ID: TC-SBH-1016-046
Case Type: Unhappy
Test Type: Security

## Test Step
1. Login ระบบด้วย user ที่ไม่มีสิทธิ์เมนู Refer Out
2. เปิดแอป Refer

## Expected Result
ไม่มีเมนู Refer Out ในแอป Refer

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 — ต้องเตรียม user (ดู gap)
```

### TC-SBH-1016-047 - ตรวจสอบ user ที่มีสิทธิ์ดูอย่างเดียวไม่เห็นปุ่มพิจารณาและส่ง

Status: Not Run · Priority: High · Labels: เหมือน TC-046

```
TC ID: TC-SBH-1016-047
Case Type: Unhappy
Test Type: Security

## Test Step
1. Login ระบบด้วย user ที่มีสิทธิ์ดู Refer Out แต่ไม่มีสิทธิ์พิจารณา / ส่ง / ยกเลิก
2. แอป Refer > เมนู Refer Out > เปิดคำขอของผู้ป่วย A

## Expected Result
เปิดคำขอได้ แต่ไม่มีปุ่ม อนุมัติ / ไม่อนุมัติ / ส่ง / ยกเลิก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 — ต้องเตรียม user (ดู gap)
```

### TC-SBH-1016-048 - ตรวจสอบหน้าหลังตรวจ ER ไม่มีปุ่มส่งหรือยกเลิกใบส่งต่อ

Status: Not Run · Priority: Medium · Labels: เหมือน TC-046

```
TC ID: TC-SBH-1016-048
Case Type: Unhappy
Test Type: Security

## Test Step
1. Login ระบบด้วย user พยาบาล ER
2. เปิดผู้ป่วย A > หน้าหลังตรวจ > ดู Panel สถานะ Refer Out

## Expected Result
Panel แสดงสถานะอย่างเดียว ไม่มีฟอร์ม ปุ่ม ส่ง หรือ ยกเลิก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4 — ER / OPD ไม่ส่ง MoPH เอง ส่งผ่านศูนย์ Refer เท่านั้น
```

---

## TS-SBH-1016-EDG - Refer Out เมื่อ Disposition ไม่มีปลายทาง ถูกแก้ หรือกดส่งซ้ำ

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : MoPH Refer Out + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1016-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER / OPD / Refer — MoPH Refer Out
- Requirement ที่อ้างอิง: SBH-1016 — [ER][OPD] Integrate MOPH Refer - Refer Out

วัตถุประสงค์
- ยืนยันว่า Transfer ภายในไม่เข้า Worklist · Disposition ที่ถูกแก้หลังอนุมัติส่งไม่ได้ · ลงนามใหม่หลังไม่อนุมัติกลับเข้า Worklist · กดส่งซ้ำไม่เกิดใบซ้ำ

ขอบเขต Requirement
- AC 2: destination สำหรับ refer / transfer
- AC 3: retry ไม่สร้างใบส่งต่อซ้ำ

ความเสี่ยง
- Transfer ภายในถูกส่งเป็น Refer Out ไป MoPH
- ส่งใบส่งต่อที่แพทย์ถอนไปแล้ว
- ปลายทางได้ใบส่งต่อซ้ำ 2 ใบ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-1016-049 - ตรวจสอบรายการ ER ส่งต่อที่ไม่ระบุโรงพยาบาลปลายทางไม่แสดงใน Worklist

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : MoPH Refer Out + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-1016-049
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > แอป Refer > เมนู Refer Out
2. ค้นหาผู้ป่วย E (ER ประเภท 4 ไม่ระบุปลายทาง)

## Expected Result
ไม่มีแถวของผู้ป่วย E ใน Worklist Refer Out

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2 — ER ประเภท 4 ไม่มีปลายทาง = Transfer ภายใน (ตัดสินใจ 12 ต.ค.) · เทคนิค EP กลุ่มไม่มีปลายทาง
```

### TC-SBH-1016-050 - ตรวจสอบคำขอแสดงสถานะ Disposition เปลี่ยนเมื่อแพทย์เปิดแก้ Disposition หลังอนุมัติ

Status: Not Run · Priority: High · Labels: เหมือน TC-049

```
TC ID: TC-SBH-1016-050
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย D > กด อนุมัติ (ทำหลัง TC-029)
2. Login ด้วยแพทย์ ER > เปิดผู้ป่วย D > เปิดแก้ Disposition เปลี่ยนโรงพยาบาลปลายทาง > ลงนามใหม่
3. Login ด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย D

## Expected Result
สถานะคำขอแสดง Disposition เปลี่ยน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-051 - ตรวจสอบส่งไม่ได้เมื่อ Disposition เปลี่ยนหลังอนุมัติ

Status: Not Run · Priority: High · Labels: เหมือน TC-049

```
TC ID: TC-SBH-1016-051
Case Type: Edge
Test Type: Functional

## Test Step
1. ต่อจาก TC-050 เปิดคำขอของผู้ป่วย D (สถานะ Disposition เปลี่ยน)
2. กรอกช่องบังคับครบ แล้วกด ส่ง (ถ้ามีปุ่ม)

## Expected Result
ส่งไม่ได้ (ไม่มีปุ่ม ส่ง หรือกดแล้วถูกปฏิเสธ) จนกว่าศูนย์ Refer จะพิจารณาใหม่

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)
```

### TC-SBH-1016-052 - ตรวจสอบรายการกลับเข้า Worklist เป็นรอพิจารณาเมื่อลงนาม Disposition ส่งต่อใหม่หลังไม่อนุมัติ

Status: Not Run · Priority: Medium · Labels: เหมือน TC-049

```
TC ID: TC-SBH-1016-052
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ด้วยแพทย์ ER > เปิดผู้ป่วย C (ไม่อนุมัติจาก TC-024) > เปิดแก้ Disposition แล้วลงนามประเภท 4 พร้อมปลายทางอีกครั้ง
2. Login ด้วย user ศูนย์ Refer > แอป Refer > เมนู Refer Out > ค้นหาผู้ป่วย C

## Expected Result
แสดงคำขอใหม่ของผู้ป่วย C สถานะ รอพิจารณา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: ทำหลัง TC-028 · ไม่อนุมัติเป็นสถานะสุดท้ายของ Disposition ที่ลงนามครั้งนั้น ลงนามใหม่ = คำขอใหม่ (สเปก SBH-2430)
```

### TC-SBH-1016-053 - ตรวจสอบกดส่ง 2 ครั้งติดกันได้ใบส่งต่อใน MoPH ใบเดียว

Status: Not Run · Priority: High · Labels: เหมือน TC-049 แต่ QA Type : Integration

```
TC ID: TC-SBH-1016-053
Case Type: Edge
Test Type: Integration

## Test Step
1. Login ระบบด้วย user ศูนย์ Refer > เปิดคำขอของผู้ป่วย H (อนุมัติแล้ว) กรอกช่องบังคับครบ
2. ดับเบิลคลิกปุ่ม ส่ง
3. รอผล แล้วตรวจรายการใบส่งต่อของผู้ป่วย H ในระบบ MoPH Refer

## Expected Result
ได้ Refer ID เดียว และใน MoPH มีใบส่งต่อของเลข Refer Out นี้ใบเดียว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3 — ส่งได้ทีละ 1 ครั้งต่อใบ (ADR-0015)
```

---

## เรื่องในสเปกที่ไม่ได้ใส่เป็น TC (นอก AC หรือทดสอบด้วยมือไม่ได้) — ผู้ใช้เลือกเพิ่มได้

- MoPH ปฏิเสธข้อมูล / เชื่อมต่อ MoPH ไม่ได้ → ข้อความ · แก้แล้วส่งใหม่ใช้เลขเดิม · Retry (เดิม TC 054–057 กลุ่ม ERR) — ผู้ใช้สั่งตัดออก 31 ต.ค. 2569 เพราะต้องให้ Dev จำลอง
- Filter ของ Worklist (สถานะ / วันที่ / แหล่ง) — user story 3 ไม่อยู่ใน AC
- สถานะ "ไม่แน่ใจ" (unknown: timeout / 5xx) + Resolve "พบใน MoPH" / "ไม่พบ" — ต้องจำลอง timeout ฝั่ง server
- 2 คนกดส่งพร้อมกัน → ข้อความ "มีผู้ใช้อื่นกำลังส่ง" (409)
- เลข Refer Out: ขึ้นปีใหม่ตามเวลาไทย · ไม่ต่ำกว่าเลขตั้งต้น · เลขซ้ำใน MoPH แล้วออกเลขใหม่
- ปุ่ม "ดึงข้อมูลจากระบบอีกครั้ง" รายส่วน · ช่องค้นหา ICD-10 / ยา · เปลี่ยนแพทย์ผู้ส่งต่อเป็นคนอื่น
- Refer Out ไม่ขวางการเงิน / จำหน่าย (user story 13)

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - AC 1 อ้าง "TOR reference" แต่การ์ดไม่ได้แนบ TOR — ร่างนี้ใช้ช่องข้อมูลตามเอกสาร Prefill ของ Dev แทน
  - ชื่อเมนู / ปุ่ม / สถานะภาษาไทยบนหน้าจอ (รอพิจารณา · รอ ผอ. ลงนาม · ส่งไม่สำเร็จ · Disposition เปลี่ยน ฯลฯ) อ้างจากสเปก ต้องเทียบกับแอปจริงก่อนรัน
  - หลังกดส่ง 2 ครั้ง (TC-053) หน้าจอแสดงอะไร — สเปกบอกแค่ว่าครั้งที่ 2 ถูกปฏิเสธ
- **Validation**
  - วันหมดอายุ = วันนี้ ใช้ได้หรือไม่ (เอกสารเขียนว่า "ห้ามเป็นวันที่ผ่านมาแล้ว") — จึงทำ BVA แค่ฝั่งเมื่อวาน
- **Error handling**
  - วิธีทำให้ MoPH ปฏิเสธ / เชื่อมต่อไม่ได้บน dev-x — ฝั่ง Cortex ตรวจช่องบังคับก่อนส่งแล้ว ต้องถาม Dev ว่าจำลองอย่างไร (ผู้ใช้สั่งตัด TC กลุ่มนี้ออกแล้ว)
  - **Audit trail (AC 3)**: สเปกเก็บประวัติในฐานข้อมูล (request event / attempt log) แต่ไม่มีหน้าจอให้ดูประวัติ — QA จะตรวจ audit trail จากที่ไหน
- **Permission / role**
  - บน dev-x สิทธิ์ Refer Out ให้ role จำนวนมาก (super-user, physician, nurse, reception, coder, pharmacist, lab-staff ฯลฯ) — role ไหน **ไม่มี** สิทธิ์ (TC 046) และมี role ที่ดูได้อย่างเดียวหรือไม่ (TC 047)
  - Production ยังไม่มี role ศูนย์ Refer โดยเฉพาะ (สเปกบอกว่าควร map ก่อนขึ้นจริง)
- **Edge cases**
  - แพทย์ที่ไม่มีเลขบัตรประชาชน (TC-041) — cortex-api ไม่มีทางแก้ `id_card` ต้องหาแพทย์ใน env ที่ไม่มีเลขอยู่แล้ว
  - หลังแพทย์เปลี่ยน Disposition เป็น Discharge with approval (หลังไม่อนุมัติ) Panel ฝั่ง ER แสดงอย่างไร

## คำถามก่อนสร้างใน Linear

1. ~~Environment~~ → ผู้ใช้เลือก **Dev-X / SBH Prod** (31 ต.ค. 2569) · ข้อควรระวังตอนรันบน SBH Prod: กด "ส่ง" = ใบส่งต่อจริงใน MoPH Refer
2. ~~QA Sub-module / Feature~~ → สร้าง `QA Sub-module / Feature : MoPH Refer Out` แล้ว (31 ต.ค. 2569)
3. ~~TC 054–057 (ERR)~~ → ผู้ใช้สั่งตัดออก (31 ต.ค. 2569)
