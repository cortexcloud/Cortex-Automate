# Draft Test Structure — SBH-3350

> สถานะ: **สร้างใน Linear แล้ว 2 พ.ย. 2026** — EXE `SBH-3618` · HPY `SBH-3621` (TC 001–047 = `SBH-3625`–`SBH-3718`) · UHP `SBH-3623` (TC 048–051 = `SBH-3720`–`SBH-3725`) · EDG `SBH-3624` (TC 052–054 = `SBH-3726`–`SBH-3730`) · สร้างผ่าน connector บัญชี Pearsu (ผู้ใช้อนุญาต) · assignee Suchat · ข้อมูลผู้ป่วยตั้งต้นใส่ไว้ในหมายเหตุของ Scenario
> - ชุดนี้ = EXE 1 + Scenario 3 (HPY / UHP / EDG) + TC 54 = 58 ใบ
> - ยึด AC 9 ข้อในการ์ด · คอมเมนต์: ไม่มี · ไม่มี Sub-Issue สเปก · รูปแบบอ้างอิง = OPD Note บน dev-x
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ค่าทดสอบ MEWS มาจากตาราง MEWS ของฟอร์มคัดกรองที่ตรวจกับ dev-x แล้ว (RR 9–14 = 0 · 15–20 = 1 · 21–29 = 2 · ≥30 = 3 · PR 51–100 = 0 · 101–110 = 1 · 111–129 = 2)
> - ช่วงปกติของ RR ใช้ตัวอย่างในการ์ด "ปกติ 12–20" — ต้องเทียบกับช่วงที่ระบบแสดงจริงตอนรัน
> - ชื่อส่วน / ปุ่ม / ข้อความ อ้างจากการ์ด ยังไม่ได้เทียบกับแอปจริง (PR ขึ้นต้น [V2.10.0])
> - **ค่าที่ต้องยืนยันก่อนสร้าง**: Run Type CT (แนะนำ — การ์ดผูก Cycle) · Version 2.9.1 (label ของการ์ด) · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : ER Physician Note (สร้าง label ใหม่แล้ว 2 พ.ย. 2026)
> - Linear MCP 2 พ.ย. 2026 ล็อกอินเป็น Pearsu Kaeomanee — "สร้างโดย" ของทั้งชุดเป็น Pearsu · assignee ใส่ ID ของ Suchat

Requirement: SBH-3350 — [ER][Cosmetic] Overview + ER Physician note
URL: https://linear.app/cortexcloud/issue/SBH-3350/ercosmetic-overview-er-physician-note
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: In Review
Labels: 🍄 Improvement · Natthaphat ( MOD ) 🙈 · VERSION 2.9.1 · Assignee: jetsadaporn (Dew) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat (MOD)
Relations: related SBH-3188 · SBH-1404 · SBH-2058 · SBH-1678 · SBH-1567
PR: cortex-testing #1627 · cortex-ui #2596 (ขึ้นต้น [V2.10.0])
Scope / Version = 2.9.1 (label VERSION 2.9.1 ของการ์ด — PR เขียน V2.10.0)

## AC → TC

| AC | เรื่อง | TC |
|---|---|---|
| 1.1 · 1.2 | ตัดแท็บ Trauma / Non-Trauma / เด็ก / สัตว์มีพิษ | 001 |
| 1.3 | ไม่มีแถบแท็บ แสดง "ประวัติการคัดกรอง" เป็นหัว Section | 002 |
| 1.4 | ปุ่ม "ดู" / "แก้ไข" ทำงานเหมือนเดิม | 003 · 004 |
| 2.1 | หัวฟอร์ม "คัดกรอง ER" / "ER Physician Note" | 005 · 006 |
| 2.2 | Underlying Disease / Verified Underlying Disease เป็นหัว Section | 007 · 008 |
| 2.3 | หัวกลุ่มภาษาไทย | 009 · 010 |
| 2.4 | หัว Section ทุกอันรูปแบบเดียวกัน | 011 · 012 |
| 2.5 | ใช้ style ชุดเดียวกับ OPD Note | 013 |
| 3.1 | ค่านอกช่วงปกติ: ขอบ `#ffd591` + ป้าย H / L | 014 · 015 |
| 3.2 | ค่าวิกฤต: ขอบ `#ffa39e` | 016 |
| 3.3 | แสดงช่วงปกติใต้ช่อง | 017 |
| 3.4 | ไม่ใช้สี Input error · ไม่ขัดขวางการบันทึก | 018 · 019 |
| 3.5 | Patient banner สี Abnormal / Critical | 020 · 021 |
| 4.1 · 4.5 | Weight / Height / BMI แถวเดียว 3 คอลัมน์ (ทั้ง 2 ฟอร์ม) | 022 · 026 |
| 4.2 | ชื่อช่องด้านบน + ช่องค่าคู่หน่วย | 023 |
| 4.3 | BMI คำนวณอัตโนมัติ · อ่านอย่างเดียว | 024 · 025 |
| 4.4 | จอแคบขึ้นบรรทัดใหม่ ไม่มี scroll แนวนอน | 053 |
| 5.1 | GCS 3 ระดับสี (BVA) | 027 · 028 · 029 · 030 |
| 5.2 | MEWS 3 ระดับสี (BVA) | 031 · 032 · 033 · 034 |
| 5.3 | ชิป MEWS บนแถบ encounter | 035 |
| 5.4 | GCS ≤ 8 → ป้าย "แนะนำ" ที่ ESI 1 | 036 |
| 5.5 | ชิปตัวเลือก CC / Present illness | 037 · 038 |
| 6.1 · 6.2 | ตาราง Underlying Disease ไม่มีคอลัมน์ System (ทั้ง 2 ฟอร์ม) | 039 · 040 |
| 6.3 | Display ขึ้นบรรทัดใหม่ ไม่มี scroll แนวนอน | 054 |
| 7 | ลำดับ Section ของ ER Physician Note | 041 |
| 8.1 · 8.6 | หัว Section แสดงเฉพาะชื่อ / ⋮ / พับ-ขยาย | 042 |
| 8.2 | ไม่แสดง "รายการที่บันทึกร่วมกัน" / "รายการใหม่" | 043 |
| 8.3 | ไม่แสดงบรรทัด วันเวลาที่ปฏิบัติ / ผู้ปฏิบัติ | 044 |
| 8.4 | ไม่แสดงบรรทัด แก้ไขล่าสุด / version | 045 |
| 8.5 | ปุ่ม "ประวัติ" ย้ายเข้าเมนู ⋮ และยังเปิดดูได้ | 046 · 047 |
| 8.7 | ข้อมูลยังเก็บในระบบตามเดิม | — ไม่มี TC (ดู gap) |
| 9.1 | ช่องบังคับว่าง → ไม่บันทึก | 048 |
| 9.2 | error state กรอบแดง + "กรุณาระบุ [ชื่อช่อง]" | 049 |
| 9.3 | scroll to first error + focus | 050 |
| 9.4 | Section พับอยู่ → ขยายก่อนเลื่อน | 052 |
| 9.5 | กรอกแล้ว error หายทันที | 051 |

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | ตรวจสอบส่วนคัดกรองบน Overview ไม่แสดงแท็บ Trauma, Non-Trauma, เด็ก และสัตว์มีพิษ | ไม่มีแท็บ "Trauma" · "Non-Trauma" · "เด็ก" · "สัตว์มีพิษ" ใต้ Clinical Summary |
| 002 | HPY | แสดง "ประวัติการคัดกรอง" เป็นหัว Section แทนแถบแท็บบน Overview | ไม่มีแถบแท็บ · "ประวัติการคัดกรอง" เป็นหัว Section รูปแบบเดียวกับ Section อื่น |
| 003 | HPY | เปิดดูรายการประวัติการคัดกรองด้วยปุ่ม "ดู" บน Overview | เปิดรายละเอียดการคัดกรองรายการนั้น ค่าตรงกับที่บันทึก |
| 004 | HPY | แก้ไขรายการประวัติการคัดกรองด้วยปุ่ม "แก้ไข" บน Overview | เปิดหน้าต่าง "แก้ไขการประเมิน" · บันทึกแล้วรายการแสดงเวลาที่ประเมินใหม่ |
| 005 | HPY | ตรวจสอบรูปแบบหัวฟอร์ม "คัดกรอง ER" | ตัวอักษร `#0d4ad9` หนา 700 · พื้น `#e8f4ff` |
| 006 | HPY | ตรวจสอบรูปแบบหัวฟอร์ม "ER Physician Note" | ตัวอักษร `#0d4ad9` หนา 700 · พื้น `#e8f4ff` |
| 007 | HPY | ตรวจสอบ Underlying Disease บน Overview แสดงเป็นหัว Section | ไม่ใช่ป้ายหัวฟอร์ม · รูปแบบเดียวกับหัว Section อื่น |
| 008 | HPY | ตรวจสอบ Verified Underlying Disease บน ER Physician Note แสดงเป็นหัว Section | ไม่ใช่ป้ายหัวฟอร์ม · รูปแบบเดียวกับหัว Section อื่น |
| 009 | HPY | ตรวจสอบรูปแบบหัวกลุ่มภาษาไทยบนฟอร์มคัดกรอง ER | ตัวอักษร `rgba(0,0,0,.88)` 15.2px หนา 700 · ไม่มีพื้นและเส้น |
| 010 | HPY | ตรวจสอบรูปแบบหัวกลุ่มภาษาไทยบน ER Physician Note | ตัวอักษร `rgba(0,0,0,.88)` 15.2px หนา 700 · ไม่มีพื้นและเส้น |
| 011 | HPY | ตรวจสอบหัว Section ทุกอันบนฟอร์มคัดกรอง ER ใช้รูปแบบเดียวกัน | ตัวอักษร `rgba(0,0,0,.88)` 14px หนา 600 · พื้น `rgba(0,0,0,.02)` · เส้นใต้ `#d9d9d9` · ขอบการ์ด `#d9d9d9` มุม 8px · ไม่แยกสีตาม Section |
| 012 | HPY | ตรวจสอบหัว Section ทุกอันบน ER Physician Note ใช้รูปแบบเดียวกัน | ตัวอักษร `rgba(0,0,0,.88)` 14px หนา 600 · พื้น `rgba(0,0,0,.02)` · เส้นใต้ `#d9d9d9` · ขอบการ์ด `#d9d9d9` มุม 8px · ไม่แยกสีตาม Section |
| 013 | HPY | ตรวจสอบหัวกลุ่มและการ์ด Section ของ ER ใช้รูปแบบเดียวกับ OPD Note | ฟอนต์ ขนาด น้ำหนัก สี พื้น เส้น มุม ของหัวกลุ่มและการ์ด Section ตรงกับ OPD Note |
| 014 | HPY | แสดงขอบส้มและป้าย "H" เมื่อ RR สูงกว่าช่วงปกติในฟอร์มคัดกรอง ER | ขอบช่อง RR `#ffd591` · ป้าย "H" สี Abnormal ข้างค่า |
| 015 | HPY | แสดงขอบส้มและป้าย "L" เมื่อ RR ต่ำกว่าช่วงปกติในฟอร์มคัดกรอง ER | ขอบช่อง RR `#ffd591` · ป้าย "L" สี Abnormal ข้างค่า |
| 016 | HPY | แสดงขอบแดงอ่อนเมื่อ RR อยู่ในเกณฑ์วิกฤตในฟอร์มคัดกรอง ER | ขอบช่อง RR `#ffa39e` |
| 017 | HPY | แสดงช่วงปกติใต้ช่อง Vital signs ในฟอร์มคัดกรอง ER | ใต้ช่อง RR แสดง "ปกติ 12–20" สี Meta · ไม่มีข้อความ "ต้องไม่มากกว่า 20" |
| 018 | HPY | ตรวจสอบช่อง Vital signs ที่ผิดปกติไม่แสดงเป็น Input error | ไม่มีกรอบแดง `#ff4d4f` · ไม่มีข้อความ error ใต้ช่อง |
| 019 | HPY | บันทึกฟอร์มคัดกรอง ER ได้เมื่อ Vital signs ผิดปกติ | บันทึกสำเร็จ · ค่า RR 22 อยู่ในประวัติการคัดกรอง |
| 020 | HPY | ตรวจสอบ Patient banner แสดงสี Abnormal เมื่อ RR ผิดปกติ | ค่า RR บน Patient banner เป็นสี Abnormal ชุดเดียวกับในฟอร์ม |
| 021 | HPY | ตรวจสอบ Patient banner แสดงสี Critical เมื่อ RR วิกฤต | ค่า RR บน Patient banner เป็นสี Critical ชุดเดียวกับในฟอร์ม |
| 022 | HPY | ตรวจสอบ Weight, Height และ BMI อยู่ในแถวเดียวบนฟอร์มคัดกรอง ER | 3 ช่องอยู่แถวเดียว แบ่ง 3 คอลัมน์กว้างเท่ากัน |
| 023 | HPY | ตรวจสอบชื่อช่องและหน่วยของ Body metric general | ชื่อช่องอยู่ด้านบน · ช่องค่าคู่หน่วยในแถวเดียวกัน: Weight + kg · Height + cm · BMI + kg/m2 |
| 024 | HPY | คำนวณ BMI อัตโนมัติจาก Weight และ Height | BMI แสดงประมาณ 20.76 โดยไม่ต้องกรอกเอง |
| 025 | HPY | ตรวจสอบช่อง BMI เป็นแบบอ่านอย่างเดียว | พิมพ์ในช่อง BMI ไม่ได้ · ค่ายังเป็นค่าที่คำนวณ |
| 026 | HPY | ตรวจสอบ Weight, Height และ BMI อยู่ในแถวเดียวบน ER Physician Note | 3 ช่องอยู่แถวเดียว แบ่ง 3 คอลัมน์กว้างเท่ากัน · ชื่อช่องด้านบน ช่องค่าคู่หน่วย |
| 027 | HPY | แสดงผล GCS สี Normal เมื่อคะแนน 13 | GCS 13 · พื้นกล่อง ขอบ และคำ "Mild" เป็นสี Normal |
| 028 | HPY | แสดงผล GCS สี Abnormal เมื่อคะแนน 12 | GCS 12 · พื้นกล่อง ขอบ และคำ "Moderate" เป็นสี Abnormal |
| 029 | HPY | แสดงผล GCS สี Abnormal เมื่อคะแนน 9 | GCS 9 · พื้นกล่อง ขอบ และคำ "Moderate" เป็นสี Abnormal |
| 030 | HPY | แสดงผล GCS สี Critical เมื่อคะแนน 8 | GCS 8 · พื้นกล่อง ขอบ และคำ "Severe" เป็นสี Critical |
| 031 | HPY | แสดงผล MEWS สี Normal เมื่อคะแนน 2 | MEWS 2 · พื้นกล่อง ขอบ และคำระดับเป็นสี Normal |
| 032 | HPY | แสดงผล MEWS สี Abnormal เมื่อคะแนน 3 | MEWS 3 · พื้นกล่อง ขอบ และคำระดับเป็นสี Abnormal |
| 033 | HPY | แสดงผล MEWS สี Abnormal เมื่อคะแนน 4 | MEWS 4 · พื้นกล่อง ขอบ และคำระดับเป็นสี Abnormal |
| 034 | HPY | แสดงผล MEWS สี Critical เมื่อคะแนน 5 | MEWS 5 · พื้นกล่อง ขอบ และคำระดับเป็นสี Critical |
| 035 | HPY | ตรวจสอบชิป MEWS บนแถบ encounter ใช้สีเดียวกับกล่องผล MEWS | ชิป MEWS 5 บนแถบ encounter เป็นสี Critical เหมือนกล่องผล |
| 036 | HPY | แสดงป้าย "แนะนำ" ที่ ESI 1 เมื่อ GCS 8 | ESI 1 มีป้าย "แนะนำ" สี Primary แบบเดียวกับป้ายแนะนำของโซน |
| 037 | HPY | ตรวจสอบรูปแบบชิปตัวเลือกที่ยังไม่เลือกใน Chief Complaint และ Present illness | ตัวอักษร `#1c67ff` 12px · พื้น `#eef3ff` |
| 038 | HPY | ตรวจสอบรูปแบบชิปตัวเลือกที่เลือกแล้วใน Chief Complaint และ Present illness | พื้น `#1c67ff` · ตัวอักษรสีขาว |
| 039 | HPY | ตรวจสอบตาราง Underlying Disease บน Overview ไม่มีคอลัมน์ System | คอลัมน์ = Display · Active · สร้างโดย · สร้างเมื่อ · ไม่มี "System" |
| 040 | HPY | ตรวจสอบตาราง Verified Underlying Disease บน ER Physician Note ไม่มีคอลัมน์ System | คอลัมน์ = Display · Active · สร้างโดย · สร้างเมื่อ · ไม่มี "System" |
| 041 | HPY | ตรวจสอบลำดับ Section ของ ER Physician Note | การจำแนกผู้ป่วย (+ การรับทราบของแพทย์) → Chief Complaint - General → Present illness general → Verified Underlying Disease → Vital signs → Body metric general → Glasgow Coma Scale → MEWS → Physical examination → Body chart → Diagnosis general → Note to nurse |
| 042 | HPY | ตรวจสอบหัว Section บนฟอร์มคัดกรอง ER แสดงเฉพาะชื่อ ปุ่ม ⋮ และปุ่มพับ/ขยาย | หัว Section มีแค่ ชื่อ Section · ปุ่ม ⋮ · ปุ่มพับ/ขยาย |
| 043 | HPY | ตรวจสอบหัว Section บน ER Physician Note ไม่แสดง "รายการที่บันทึกร่วมกัน" และ "รายการใหม่" | ไม่มีข้อความ "รายการที่บันทึกร่วมกัน" / "รายการใหม่" ต่อท้ายชื่อ Section |
| 044 | HPY | ตรวจสอบหัว Section บน ER Physician Note ไม่แสดงบรรทัดวันเวลาที่ปฏิบัติและผู้ปฏิบัติ | ไม่มีบรรทัด "วันเวลาที่ปฏิบัติ: … · ผู้ปฏิบัติ: …" |
| 045 | HPY | ตรวจสอบหัว Section บน ER Physician Note ไม่แสดงบรรทัดแก้ไขล่าสุดและ version | ไม่มีบรรทัด "แก้ไขล่าสุด … โดย … · version …" |
| 046 | HPY | ตรวจสอบปุ่ม "ประวัติ" อยู่ในเมนู ⋮ ของ Section | ไม่มีปุ่ม "ประวัติ" บนหัว Section · เมนู ⋮ มีรายการ "ประวัติ" |
| 047 | HPY | เปิดดูประวัติการแก้ไขของ Section จากเมนู ⋮ | เปิดประวัติการแก้ไขของ Section นั้น เห็นทั้งฉบับแรกและฉบับที่แก้ |
| 048 | UHP | ไม่บันทึก ER Physician Note เมื่อช่องบังคับยังไม่กรอก | ไม่บันทึก · ไม่มีแจ้งเตือนบันทึกสำเร็จ · หัวแผงไม่เปลี่ยนเป็นบันทึกแล้ว |
| 049 | UHP | แสดง error state ที่ช่องบังคับที่ยังไม่กรอกเมื่อกดบันทึก | ช่องมีกรอบแดง `#ff4d4f` · ใต้ช่องแสดง "กรุณาระบุ [ชื่อช่อง]" |
| 050 | UHP | เลื่อนหน้าจอไปที่ช่องบังคับแรกที่ยังไม่กรอกเมื่อกดบันทึก | หน้าจอเลื่อนไปช่องแรกที่ผิดทันที · cursor อยู่ที่ช่องนั้น |
| 051 | UHP | ล้าง error state ทันทีเมื่อกรอกช่องบังคับที่ขึ้น error | กรอบแดงและข้อความใต้ช่องหายทันทีโดยไม่ต้องกดบันทึกซ้ำ |
| 052 | EDG | ขยาย Section ที่พับอยู่ก่อนเลื่อนไปช่องบังคับที่ยังไม่กรอก | Section ที่พับอยู่ขยายออกเอง · หน้าจอเลื่อนไปช่องนั้นพร้อม error state |
| 053 | EDG | ตรวจสอบ Body metric general ขึ้นบรรทัดใหม่เมื่อหน้าจอแคบ | ช่องขึ้นบรรทัดใหม่ · ค่าแสดงครบ · ไม่มี scroll แนวนอน |
| 054 | EDG | ตรวจสอบข้อความ Display ที่ยาวในตาราง Underlying Disease ขึ้นบรรทัดใหม่ | Display ขึ้นบรรทัดใหม่ อ่านได้ครบ · ตารางไม่มี scroll แนวนอน |

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user พยาบาล ER** (role Nurse) · **user แพทย์ ER** (role Doctor) · ใช้ผู้ป่วย AUTO ของเทสเท่านั้น (แพทย์เปิด / กรอกฟอร์ม = บันทึก "แพทย์เริ่มการรักษา")
- **ผู้ป่วย A (คัดกรองแล้ว ค่าปกติ)** — ใช้กับ 001–013, 026, 039–047: คัดกรอง ESI 2 · BP 120/80 · PR 80 · RR 14 · Temperature 37 · SpO2 98 · GCS E4 V5 M6 ·
  Weight 60 · Height 170 · Underlying Disease 1 รายการ · บันทึก → แพทย์บันทึก ER Physician Note (เลือก Diagnosis) แล้ว**แก้ไขบันทึกซ้ำอีก 1 ครั้ง** (ให้มีประวัติ 2 ฉบับ และมีข้อมูลวันเวลาที่ปฏิบัติ / version ที่หัว Section เคยแสดง)
- **ผู้ป่วย B (ลงทะเบียน ER ยังไม่คัดกรอง)** — ใช้กับ 014–019, 022–025, 027–034, 036, 053: เปิดฟอร์มคัดกรอง ER แล้วกรอกค่าตาม TC · ค่าตั้งต้นที่ไม่ได้ระบุใน TC ใช้ BP 120/80 · PR 80 · RR 12 · Temperature 37 · SpO2 98 · GCS E4 V5 M6 (= MEWS 0) ·
  ไม่ต้องบันทึก ยกเว้น TC-019
- **ผู้ป่วย C (คัดกรองแล้ว RR 22)** — ใช้กับ 020 (ใช้ผู้ป่วย B หลังจบ TC-019 ได้)
- **ผู้ป่วย D (คัดกรองแล้ว RR 30 · PR 115 = MEWS 5)** — ใช้กับ 021, 035
- **ผู้ป่วย E (Underlying Disease ข้อความยาว)** — ใช้กับ 054: Underlying Disease ที่ Display ยาวเกินความกว้างคอลัมน์ (เช่นชื่อโรคภาษาอังกฤษเต็มยาว)
- **ผู้ป่วย F (คัดกรองแล้ว แพทย์ยังไม่บันทึก ER Physician Note)** — ใช้กับ 037, 038, 048–052 (ใช้ 1 รายต่อ TC ที่กดบันทึก หรือโหลดหน้าใหม่ก่อนเริ่ม TC ถัดไป)
- ตรวจสี / ขนาด / น้ำหนักตัวอักษร ด้วย DevTools (คลิกขวา → Inspect → แท็บ Computed) · `#0d4ad9` = rgb(13, 74, 217) · `#e8f4ff` = rgb(232, 244, 255) · `#ffd591` = rgb(255, 213, 145) · `#ffa39e` = rgb(255, 163, 158) · `#ff4d4f` = rgb(255, 77, 79) · `#1c67ff` = rgb(28, 103, 255) · `#eef3ff` = rgb(238, 243, 255) · `#d9d9d9` = rgb(217, 217, 217)

---

## EXE - CT - 2.9.1

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: 🍄 Improvement, Natthaphat ( MOD ) 🙈, VERSION 2.9.1, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : ER Physician Note, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.1
- Module: ER — Overview (คัดกรอง ER) / ER Physician Note
- Requirement ที่อ้างอิง: SBH-3350 — [ER][Cosmetic] Overview + ER Physician note
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ส่วนคัดกรองบน Overview: ตัดแท็บ เหลือ "ประวัติการคัดกรอง" · ปุ่ม ดู / แก้ไข
- หัวฟอร์ม หัวกลุ่ม หัว Section ตามรูปแบบ OPD Note
- สี Vital signs ผิดปกติ / วิกฤต · ช่วงปกติใต้ช่อง · Patient banner
- Body metric general แถวเดียว · BMI
- สีผล GCS / MEWS · ชิป MEWS · ป้ายแนะนำ ESI 1 · ชิปตัวเลือก
- ตาราง Underlying Disease ไม่มี System · ลำดับ Section ของ ER Physician Note
- หัว Section แสดงแค่ชื่อ · ปุ่มประวัติในเมนู ⋮
- Validation ช่องบังคับ + Scroll to first error

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## TS-SBH-3350-HPY - ปรับหน้าตา Overview (คัดกรอง ER) และ ER Physician Note ตามรูปแบบ OPD Note

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : ER Physician Note + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3350-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER — Overview (คัดกรอง ER) / ER Physician Note
- Requirement ที่อ้างอิง: SBH-3350 — [ER][Cosmetic] Overview + ER Physician note

วัตถุประสงค์
- ยืนยันว่าหน้า Overview (คัดกรอง ER) และ ER Physician Note แสดงหัวข้อ สี และลำดับตามการ์ด โดยฟังก์ชันเดิม (ดู / แก้ไขการคัดกรอง · BMI · ประวัติ) ยังทำงาน

ขอบเขต Requirement
- AC 1 ส่วนคัดกรองบน Overview
- AC 2 หัวฟอร์ม หัวกลุ่ม หัว Section
- AC 3 Vital signs ผิดปกติ · AC 4 Body metric general
- AC 5 ผลคะแนน GCS / MEWS · ชิปตัวเลือก
- AC 6 Underlying Disease · AC 7 ลำดับ ER Physician Note · AC 8 หัว Section

ความเสี่ยง
- สี GCS / MEWS / Vital signs ผิดระดับ → ทีมประเมินความรุนแรงผิด
- ค่าผิดปกติใช้สี Input error หรือขัดขวางการบันทึก → บันทึกคัดกรองไม่ได้
- ตัดแท็บแล้วปุ่ม ดู / แก้ไข ประวัติการคัดกรองพัง
- ย้ายปุ่มประวัติแล้วเปิดประวัติการแก้ไขไม่ได้
- BMI ไม่คำนวณหลังจัดแถวใหม่

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ระบุในแต่ละ TC (ดูหัวข้อข้อมูลตั้งต้น)
```

### TC-SBH-3350-001 - ตรวจสอบส่วนคัดกรองบน Overview ไม่แสดงแท็บ Trauma, Non-Trauma, เด็ก และสัตว์มีพิษ

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : ER Physician Note + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard
2. กดการ์ดผู้ป่วย A > หน้า Overview
3. ดูส่วนใต้ Clinical Summary

## Expected Result
ไม่มีแท็บ "Trauma" · "Non-Trauma" · "เด็ก" · "สัตว์มีพิษ"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.1 · 1.2
```

### TC-SBH-3350-002 - แสดง "ประวัติการคัดกรอง" เป็นหัว Section แทนแถบแท็บบน Overview

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual (ชุดเดียวกับ TC-001)

```
TC ID: TC-SBH-3350-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย A > หน้า Overview
2. ดูส่วนใต้ Clinical Summary

## Expected Result
ไม่มีแถบแท็บ (รวมแท็บ "Triage")
"ประวัติการคัดกรอง" แสดงเป็นหัว Section รูปแบบเดียวกับหัว Section อื่นบนหน้า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.3 — การ์ดเขียน "แบบข้อ 1" น่าจะหมายถึงรูปแบบหัว Section ใน AC 2 (ดู gap)
```

### TC-SBH-3350-003 - เปิดดูรายการประวัติการคัดกรองด้วยปุ่ม "ดู" บน Overview

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย A > หน้า Overview
2. ที่ Section "ประวัติการคัดกรอง" กดปุ่ม "ดู" ของรายการล่าสุด

## Expected Result
เปิดรายละเอียดการคัดกรองรายการนั้น
ค่าตรงกับที่บันทึก (ESI 2 · BP 120/80 · PR 80 · RR 14 · GCS 15)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.4
```

### TC-SBH-3350-004 - แก้ไขรายการประวัติการคัดกรองด้วยปุ่ม "แก้ไข" บน Overview

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-004
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย A > หน้า Overview
2. ที่ Section "ประวัติการคัดกรอง" กดปุ่ม "แก้ไข" ของรายการล่าสุด
3. เปลี่ยนเวลาที่ประเมินย้อนหลัง 5 นาที > บันทึก

## Expected Result
เปิดหน้าต่าง "แก้ไขการประเมิน"
บันทึกแล้วรายการในประวัติการคัดกรองแสดงเวลาที่ประเมินใหม่

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.4 — หน้าต่างแก้ไขเดิมแก้ได้เฉพาะประเภท / เวลาที่ประเมิน
```

### TC-SBH-3350-005 - ตรวจสอบรูปแบบหัวฟอร์ม "คัดกรอง ER"

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย A > หน้า Overview
2. Inspect หัวฟอร์ม "คัดกรอง ER" ดูค่า Computed

## Expected Result
ตัวอักษร #0d4ad9 หนา 700
พื้น #e8f4ff

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.1
```

### TC-SBH-3350-006 - ตรวจสอบรูปแบบหัวฟอร์ม "ER Physician Note"

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-006
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview
2. Inspect หัวฟอร์ม "ER Physician Note" (แผงขวา) ดูค่า Computed

## Expected Result
ตัวอักษร #0d4ad9 หนา 700
พื้น #e8f4ff

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.1
```

### TC-SBH-3350-007 - ตรวจสอบ Underlying Disease บน Overview แสดงเป็นหัว Section

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-007
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย A > หน้า Overview
2. ดูหัว "Underlying Disease" เทียบกับหัวฟอร์ม "คัดกรอง ER" และหัว Section อื่น

## Expected Result
"Underlying Disease" ไม่ใช่ป้ายหัวฟอร์ม (ไม่ใช่ตัวอักษร #0d4ad9 บนพื้น #e8f4ff)
รูปแบบเดียวกับหัว Section อื่น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.2
```

### TC-SBH-3350-008 - ตรวจสอบ Verified Underlying Disease บน ER Physician Note แสดงเป็นหัว Section

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-008
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview
2. ที่ ER Physician Note ดูหัว "Verified Underlying Disease" เทียบกับหัวฟอร์มและหัว Section อื่น

## Expected Result
"Verified Underlying Disease" ไม่ใช่ป้ายหัวฟอร์ม (ไม่ใช่ตัวอักษร #0d4ad9 บนพื้น #e8f4ff)
รูปแบบเดียวกับหัว Section อื่น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.2
```

### TC-SBH-3350-009 - ตรวจสอบรูปแบบหัวกลุ่มภาษาไทยบนฟอร์มคัดกรอง ER

Status: Not Run · Priority: Low · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-009
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย A > หน้า Overview
2. Inspect หัวกลุ่มภาษาไทยในฟอร์มคัดกรอง ER ทุกอัน

## Expected Result
ตัวอักษร rgba(0,0,0,.88) ขนาด 15.2px หนา 700
ไม่มีพื้นและไม่มีเส้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.3 — การ์ดไม่ได้ระบุว่าหัวกลุ่มมีคำไหนบ้าง (ดู gap)
```

### TC-SBH-3350-010 - ตรวจสอบรูปแบบหัวกลุ่มภาษาไทยบน ER Physician Note

Status: Not Run · Priority: Low · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-010
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview
2. Inspect หัวกลุ่มภาษาไทยใน ER Physician Note ทุกอัน

## Expected Result
ตัวอักษร rgba(0,0,0,.88) ขนาด 15.2px หนา 700
ไม่มีพื้นและไม่มีเส้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.3
```

### TC-SBH-3350-011 - ตรวจสอบหัว Section ทุกอันบนฟอร์มคัดกรอง ER ใช้รูปแบบเดียวกัน

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-011
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย A > หน้า Overview
2. Inspect หัว Section ทุกอันในฟอร์มคัดกรอง ER

## Expected Result
ทุกอันเหมือนกัน ไม่แยกสีตาม Section:
ตัวอักษร rgba(0,0,0,.88) 14px หนา 600 · พื้น rgba(0,0,0,.02) · เส้นใต้ #d9d9d9 · ขอบการ์ด #d9d9d9 มุม 8px

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.4
```

### TC-SBH-3350-012 - ตรวจสอบหัว Section ทุกอันบน ER Physician Note ใช้รูปแบบเดียวกัน

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-012
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview
2. Inspect หัว Section ทุกอันใน ER Physician Note

## Expected Result
ทุกอันเหมือนกัน ไม่แยกสีตาม Section:
ตัวอักษร rgba(0,0,0,.88) 14px หนา 600 · พื้น rgba(0,0,0,.02) · เส้นใต้ #d9d9d9 · ขอบการ์ด #d9d9d9 มุม 8px

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.4
```

### TC-SBH-3350-013 - ตรวจสอบหัวกลุ่มและการ์ด Section ของ ER ใช้รูปแบบเดียวกับ OPD Note

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-013
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview
2. Inspect หัวกลุ่ม 1 อัน และการ์ด Section 1 อันใน ER Physician Note
3. เปิด OPD Note ของผู้ป่วย OPD รายใดก็ได้บน dev-x > Inspect หัวกลุ่มและการ์ด Section

## Expected Result
ฟอนต์ ขนาด น้ำหนัก สีตัวอักษร พื้น เส้นใต้ ขอบ และมุม ของหัวกลุ่มและการ์ด Section ใน ER ตรงกับ OPD Note

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.5 — ตรวจได้เฉพาะหน้าตา ส่วน "ใช้ component กลาง" เป็นเรื่องโค้ด
```

### TC-SBH-3350-014 - แสดงขอบส้มและป้าย "H" เมื่อ RR สูงกว่าช่วงปกติในฟอร์มคัดกรอง ER

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-014
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก Vital signs ค่าตั้งต้น แต่ RR = 22
3. Inspect ช่อง RR

## Expected Result
ขอบช่อง RR #ffd591
ป้าย "H" สี Abnormal ข้างค่า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.1 — เทคนิค: EP — กลุ่มค่าสูงกว่าช่วงปกติ (ช่วงปกติ 12–20 ตามตัวอย่างในการ์ด · RR 22 = MEWS 2 ไม่ใช่วิกฤต)
```

### TC-SBH-3350-015 - แสดงขอบส้มและป้าย "L" เมื่อ RR ต่ำกว่าช่วงปกติในฟอร์มคัดกรอง ER

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-015
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก Vital signs ค่าตั้งต้น แต่ RR = 10
3. Inspect ช่อง RR

## Expected Result
ขอบช่อง RR #ffd591
ป้าย "L" สี Abnormal ข้างค่า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.1 — เทคนิค: EP — กลุ่มค่าต่ำกว่าช่วงปกติ (RR 10 = MEWS 0 ไม่ใช่วิกฤต)
```

### TC-SBH-3350-016 - แสดงขอบแดงอ่อนเมื่อ RR อยู่ในเกณฑ์วิกฤตในฟอร์มคัดกรอง ER

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-016
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก Vital signs ค่าตั้งต้น แต่ RR = 30
3. Inspect ช่อง RR

## Expected Result
ขอบช่อง RR #ffa39e

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.2 — เทคนิค: EP — กลุ่มค่าวิกฤต (RR ≥ 30 = MEWS 3 ในช่อง RR)
```

### TC-SBH-3350-017 - แสดงช่วงปกติใต้ช่อง Vital signs ในฟอร์มคัดกรอง ER

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-017
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก RR = 22
3. ดูข้อความใต้ช่อง RR

## Expected Result
แสดง "ปกติ 12–20" สี Meta
ไม่มีข้อความ "ต้องไม่มากกว่า 20"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.3 — การ์ดไม่ได้บอกว่าแสดงตลอดหรือเฉพาะตอนค่าผิดปกติ (ดู gap)
```

### TC-SBH-3350-018 - ตรวจสอบช่อง Vital signs ที่ผิดปกติไม่แสดงเป็น Input error

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-018
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก RR = 22
3. Inspect ช่อง RR

## Expected Result
ไม่มีกรอบแดง #ff4d4f
ไม่มีข้อความ error ใต้ช่อง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.4
```

### TC-SBH-3350-019 - บันทึกฟอร์มคัดกรอง ER ได้เมื่อ Vital signs ผิดปกติ

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-019
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอกช่องบังคับครบ · Vital signs ค่าตั้งต้น แต่ RR = 22 · เลือกระดับ + โซน
3. กดบันทึก

## Expected Result
บันทึกสำเร็จ
ประวัติการคัดกรองมีรายการใหม่ที่ RR = 22

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.4 — ผู้ป่วยรายนี้ใช้ต่อเป็นผู้ป่วย C ใน TC-020 ได้
```

### TC-SBH-3350-020 - ตรวจสอบ Patient banner แสดงสี Abnormal เมื่อ RR ผิดปกติ

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-020
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย C (RR 22) > หน้า Overview
2. Inspect ค่า RR บน Patient banner และในฟอร์มคัดกรอง

## Expected Result
ค่า RR บน Patient banner เป็นสี Abnormal ชุดเดียวกับในฟอร์ม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.5
```

### TC-SBH-3350-021 - ตรวจสอบ Patient banner แสดงสี Critical เมื่อ RR วิกฤต

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-021
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย D (RR 30) > หน้า Overview
2. Inspect ค่า RR บน Patient banner และในฟอร์มคัดกรอง

## Expected Result
ค่า RR บน Patient banner เป็นสี Critical ชุดเดียวกับในฟอร์ม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.5
```

### TC-SBH-3350-022 - ตรวจสอบ Weight, Height และ BMI อยู่ในแถวเดียวบนฟอร์มคัดกรอง ER

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-022
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER (จอปกติ)
2. ดู Section Body metric general

## Expected Result
Weight · Height · BMI อยู่แถวเดียวกัน แบ่ง 3 คอลัมน์กว้างเท่ากัน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.1 · 4.5
```

### TC-SBH-3350-023 - ตรวจสอบชื่อช่องและหน่วยของ Body metric general

Status: Not Run · Priority: Low · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-023
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. ดู Section Body metric general

## Expected Result
ชื่อช่องอยู่ด้านบนของแต่ละคอลัมน์
ช่องค่าคู่หน่วยในแถวเดียวกัน: Weight + kg · Height + cm · BMI + kg/m2

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.2
```

### TC-SBH-3350-024 - คำนวณ BMI อัตโนมัติจาก Weight และ Height

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-024
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก Weight = 60 · Height = 170

## Expected Result
BMI แสดงประมาณ 20.76 (ทศนิยมตามรูปแบบเดิมของระบบ) โดยไม่ต้องกรอกเอง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.3 — 60 / 1.70² = 20.76
```

### TC-SBH-3350-025 - ตรวจสอบช่อง BMI เป็นแบบอ่านอย่างเดียว

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-025
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก Weight = 60 · Height = 170
3. คลิกช่อง BMI แล้วพิมพ์ 30

## Expected Result
พิมพ์ในช่อง BMI ไม่ได้
ค่ายังเป็นค่าที่คำนวณ (ประมาณ 20.76)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.3
```

### TC-SBH-3350-026 - ตรวจสอบ Weight, Height และ BMI อยู่ในแถวเดียวบน ER Physician Note

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-026
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview (จอปกติ)
2. ที่ ER Physician Note ดู Section Body metric general

## Expected Result
Weight · Height · BMI อยู่แถวเดียวกัน แบ่ง 3 คอลัมน์กว้างเท่ากัน
ชื่อช่องด้านบน · ช่องค่าคู่หน่วย kg / cm / kg/m2

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.5
```

### TC-SBH-3350-027 - แสดงผล GCS สี Normal เมื่อคะแนน 13

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-027
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. เลือก GCS E3 V4 M6
3. ดูกล่องผล GCS

## Expected Result
GCS 13
พื้นกล่อง ขอบ และคำ "Mild" เป็นสี Normal

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.1 — เทคนิค: BVA — ขอบล่างของช่วง Normal (13)
```

### TC-SBH-3350-028 - แสดงผล GCS สี Abnormal เมื่อคะแนน 12

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-028
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. เลือก GCS E3 V3 M6
3. ดูกล่องผล GCS

## Expected Result
GCS 12
พื้นกล่อง ขอบ และคำ "Moderate" เป็นสี Abnormal

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.1 — เทคนิค: BVA — ขอบบนของช่วง Abnormal (12)
```

### TC-SBH-3350-029 - แสดงผล GCS สี Abnormal เมื่อคะแนน 9

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-029
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. เลือก GCS E2 V2 M5
3. ดูกล่องผล GCS

## Expected Result
GCS 9
พื้นกล่อง ขอบ และคำ "Moderate" เป็นสี Abnormal

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.1 — เทคนิค: BVA — ขอบล่างของช่วง Abnormal (9)
```

### TC-SBH-3350-030 - แสดงผล GCS สี Critical เมื่อคะแนน 8

Status: Not Run · Priority: Urgent · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-030
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. เลือก GCS E2 V2 M4
3. ดูกล่องผล GCS

## Expected Result
GCS 8
พื้นกล่อง ขอบ และคำ "Severe" เป็นสี Critical

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.1 — เทคนิค: BVA — ขอบบนของช่วง Critical (8)
```

### TC-SBH-3350-031 - แสดงผล MEWS สี Normal เมื่อคะแนน 2

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-031
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก Vital signs ค่าตั้งต้น แต่ RR = 22 · GCS E4 V5 M6
3. รอ Total MEWS แสดงค่า > ดูกล่องผล MEWS

## Expected Result
MEWS 2
พื้นกล่อง ขอบ และคำระดับเป็นสี Normal

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.2 — เทคนิค: BVA — ขอบบนของช่วง Normal (2) · RR 22 = 2 คะแนน
```

### TC-SBH-3350-032 - แสดงผล MEWS สี Abnormal เมื่อคะแนน 3

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-032
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก Vital signs ค่าตั้งต้น แต่ RR = 22 · PR = 105 · GCS E4 V5 M6
3. รอ Total MEWS แสดงค่า > ดูกล่องผล MEWS

## Expected Result
MEWS 3
พื้นกล่อง ขอบ และคำระดับเป็นสี Abnormal

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.2 — เทคนิค: BVA — ขอบล่างของช่วง Abnormal (3) · RR 22 = 2 + PR 105 = 1
```

### TC-SBH-3350-033 - แสดงผล MEWS สี Abnormal เมื่อคะแนน 4

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-033
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก Vital signs ค่าตั้งต้น แต่ RR = 22 · PR = 115 · GCS E4 V5 M6
3. รอ Total MEWS แสดงค่า > ดูกล่องผล MEWS

## Expected Result
MEWS 4
พื้นกล่อง ขอบ และคำระดับเป็นสี Abnormal

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.2 — เทคนิค: BVA — ขอบบนของช่วง Abnormal (4) · RR 22 = 2 + PR 115 = 2
```

### TC-SBH-3350-034 - แสดงผล MEWS สี Critical เมื่อคะแนน 5

Status: Not Run · Priority: Urgent · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-034
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก Vital signs ค่าตั้งต้น แต่ RR = 30 · PR = 115 · GCS E4 V5 M6
3. รอ Total MEWS แสดงค่า > ดูกล่องผล MEWS

## Expected Result
MEWS 5
พื้นกล่อง ขอบ และคำระดับเป็นสี Critical

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.2 — เทคนิค: BVA — ขอบล่างของช่วง Critical (5) · RR 30 = 3 + PR 115 = 2
```

### TC-SBH-3350-035 - ตรวจสอบชิป MEWS บนแถบ encounter ใช้สีเดียวกับกล่องผล MEWS

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-035
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย D (MEWS 5) > หน้า Overview
2. Inspect ชิป MEWS บนแถบ encounter และกล่องผล MEWS ในฟอร์มคัดกรอง

## Expected Result
ชิป MEWS 5 บนแถบ encounter เป็นสี Critical เหมือนกล่องผล

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.3
```

### TC-SBH-3350-036 - แสดงป้าย "แนะนำ" ที่ ESI 1 เมื่อ GCS 8

Status: Not Run · Priority: Urgent · Labels: QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-036
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. เลือก GCS E2 V2 M4 (= 8)
3. ดูตัวเลือกระดับความเร่งด่วน

## Expected Result
ESI 1 มีป้าย "แนะนำ"
ป้ายเป็นสี Primary แบบเดียวกับป้ายแนะนำของโซน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.4 — เทคนิค: BVA — ขอบ GCS ≤ 8
```

### TC-SBH-3350-037 - ตรวจสอบรูปแบบชิปตัวเลือกที่ยังไม่เลือกใน Chief Complaint และ Present illness

Status: Not Run · Priority: Low · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-037
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย F > หน้า Overview
2. ที่ ER Physician Note Inspect ชิปที่ยังไม่เลือกใน Chief Complaint - General และ Present illness general

## Expected Result
ตัวอักษร #1c67ff ขนาด 12px
พื้น #eef3ff

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.5
```

### TC-SBH-3350-038 - ตรวจสอบรูปแบบชิปตัวเลือกที่เลือกแล้วใน Chief Complaint และ Present illness

Status: Not Run · Priority: Low · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-038
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย F > หน้า Overview
2. ที่ ER Physician Note กดเลือกชิป 1 ตัวใน Chief Complaint - General และ 1 ตัวใน Present illness general
3. Inspect ชิปที่เลือก

## Expected Result
พื้น #1c67ff
ตัวอักษรสีขาว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.5
```

### TC-SBH-3350-039 - ตรวจสอบตาราง Underlying Disease บน Overview ไม่มีคอลัมน์ System

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-039
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย A > หน้า Overview
2. ดูหัวคอลัมน์ตาราง Underlying Disease

## Expected Result
คอลัมน์ = Display · Active · สร้างโดย · สร้างเมื่อ
ไม่มีคอลัมน์ "System"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.1 · 6.2
```

### TC-SBH-3350-040 - ตรวจสอบตาราง Verified Underlying Disease บน ER Physician Note ไม่มีคอลัมน์ System

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-040
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview
2. ที่ ER Physician Note ดูหัวคอลัมน์ตาราง Verified Underlying Disease

## Expected Result
คอลัมน์ = Display · Active · สร้างโดย · สร้างเมื่อ
ไม่มีคอลัมน์ "System"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.1 · 6.2
```

### TC-SBH-3350-041 - ตรวจสอบลำดับ Section ของ ER Physician Note

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-041
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview
2. ที่ ER Physician Note เลื่อนดูจากบนลงล่าง

## Expected Result
การจำแนกผู้ป่วย (+ การรับทราบของแพทย์) → Chief Complaint - General → Present illness general → Verified Underlying Disease → Vital signs → Body metric general → Glasgow Coma Scale → MEWS → Physical examination → Body chart → Diagnosis general → Note to nurse

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7 — ผู้ป่วย Non-Trauma (ฟอร์ม Trauma ใช้ลำดับของ SBH-2058)
```

### TC-SBH-3350-042 - ตรวจสอบหัว Section บนฟอร์มคัดกรอง ER แสดงเฉพาะชื่อ ปุ่ม ⋮ และปุ่มพับ/ขยาย

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-042
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย A > หน้า Overview
2. ดูหัว Section ทุกอันในฟอร์มคัดกรอง ER

## Expected Result
หัว Section มีแค่ ชื่อ Section · ปุ่ม ⋮ · ปุ่มพับ/ขยาย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 8.1 · 8.6
```

### TC-SBH-3350-043 - ตรวจสอบหัว Section บน ER Physician Note ไม่แสดง "รายการที่บันทึกร่วมกัน" และ "รายการใหม่"

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-043
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview
2. ดูหัว Section ทุกอันใน ER Physician Note

## Expected Result
ไม่มีข้อความ "รายการที่บันทึกร่วมกัน" และ "รายการใหม่" ต่อท้ายชื่อ Section

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 8.2
```

### TC-SBH-3350-044 - ตรวจสอบหัว Section บน ER Physician Note ไม่แสดงบรรทัดวันเวลาที่ปฏิบัติและผู้ปฏิบัติ

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-044
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview
2. ดูหัว Section ทุกอันใน ER Physician Note

## Expected Result
ไม่มีบรรทัด "วันเวลาที่ปฏิบัติ: … · ผู้ปฏิบัติ: …"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 8.3
```

### TC-SBH-3350-045 - ตรวจสอบหัว Section บน ER Physician Note ไม่แสดงบรรทัดแก้ไขล่าสุดและ version

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-045
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A (บันทึกแล้วแก้ไขซ้ำ) > หน้า Overview
2. ดูหัว Section ทุกอันใน ER Physician Note

## Expected Result
ไม่มีบรรทัด "แก้ไขล่าสุด … โดย … · version …"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 8.4
```

### TC-SBH-3350-046 - ตรวจสอบปุ่ม "ประวัติ" อยู่ในเมนู ⋮ ของ Section

Status: Not Run · Priority: Medium · Labels: QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-046
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A > หน้า Overview
2. ที่ ER Physician Note ดูหัว Section Present illness general
3. กดปุ่ม ⋮ ของ Section นั้น

## Expected Result
ไม่มีปุ่ม "ประวัติ" บนหัว Section
เมนู ⋮ มีรายการ "ประวัติ"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 8.5
```

### TC-SBH-3350-047 - เปิดดูประวัติการแก้ไขของ Section จากเมนู ⋮

Status: Not Run · Priority: High · Labels: QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-047
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย A (บันทึกแล้วแก้ไขซ้ำ) > หน้า Overview
2. ที่ ER Physician Note กดปุ่ม ⋮ ของ Section Present illness general > "ประวัติ"

## Expected Result
เปิดประวัติการแก้ไขของ Section นั้น
เห็นทั้งฉบับแรกและฉบับที่แก้ (เหมือนปุ่มประวัติเดิม)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 8.5
```

---

## TS-SBH-3350-UHP - บันทึก ER Physician Note โดยยังกรอกช่องบังคับไม่ครบ

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : ER Physician Note + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3350-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER — ER Physician Note
- Requirement ที่อ้างอิง: SBH-3350 — [ER][Cosmetic] Overview + ER Physician note

วัตถุประสงค์
- ยืนยันว่ากดบันทึกโดยช่องบังคับยังว่างแล้วระบบไม่บันทึก แสดง error ที่ช่อง พาไปที่ช่องแรก และ error หายเมื่อกรอก

ขอบเขต Requirement
- AC 9.1 ไม่บันทึก
- AC 9.2 error state
- AC 9.3 scroll to first error + focus
- AC 9.5 error หายเมื่อกรอก

ความเสี่ยง
- บันทึกได้ทั้งที่ช่องบังคับว่าง → เวชระเบียนไม่ครบ
- แพทย์ไม่รู้ว่าขาดช่องไหน (ฟอร์มยาว) → กดบันทึกซ้ำหลายรอบ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ช่องบังคับที่ใช้ = Diagnosis (ER Physician Note ต้องเลือก Diagnosis ทุกครั้ง)
```

### TC-SBH-3350-048 - ไม่บันทึก ER Physician Note เมื่อช่องบังคับยังไม่กรอก

Status: Not Run · Priority: Urgent · Labels: QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-048
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย F > หน้า Overview
2. ที่ ER Physician Note กรอก Present illness แต่ไม่เลือก Diagnosis
3. กดบันทึก

## Expected Result
ไม่บันทึก
ไม่มีแจ้งเตือนบันทึกสำเร็จ · หัวแผงไม่เปลี่ยนเป็นบันทึกแล้ว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 9.1
```

### TC-SBH-3350-049 - แสดง error state ที่ช่องบังคับที่ยังไม่กรอกเมื่อกดบันทึก

Status: Not Run · Priority: High · Labels: QA Case : Unhappy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-049
Case Type: Unhappy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย F > หน้า Overview
2. ที่ ER Physician Note กรอก Present illness แต่ไม่เลือก Diagnosis > กดบันทึก
3. Inspect ช่อง Diagnosis

## Expected Result
ช่อง Diagnosis มีกรอบแดง #ff4d4f
ใต้ช่องแสดง "กรุณาระบุ [ชื่อช่อง]" ตามชื่อช่อง Diagnosis

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 9.2
```

### TC-SBH-3350-050 - เลื่อนหน้าจอไปที่ช่องบังคับแรกที่ยังไม่กรอกเมื่อกดบันทึก

Status: Not Run · Priority: High · Labels: QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-050
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย F > หน้า Overview
2. ที่ ER Physician Note กรอก Present illness แต่ไม่เลือก Diagnosis
3. เลื่อนขึ้นบนสุดของฟอร์ม > กดบันทึก

## Expected Result
หน้าจอเลื่อนไปที่ช่องบังคับแรกที่ยังไม่กรอก (Diagnosis) ทันที
cursor / focus อยู่ที่ช่องนั้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 9.3 — ถ้าฟอร์มมีช่องบังคับมากกว่า 1 ช่อง ให้เว้นว่างทุกช่อง แล้วตรวจว่าไปที่ช่องบนสุด
```

### TC-SBH-3350-051 - ล้าง error state ทันทีเมื่อกรอกช่องบังคับที่ขึ้น error

Status: Not Run · Priority: Medium · Labels: QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-051
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย F > หน้า Overview
2. ที่ ER Physician Note กรอก Present illness แต่ไม่เลือก Diagnosis > กดบันทึก (ช่อง Diagnosis ขึ้น error)
3. เลือก Diagnosis 1 รายการ (ยังไม่กดบันทึก)

## Expected Result
กรอบแดงและข้อความใต้ช่อง Diagnosis หายทันที โดยไม่ต้องกดบันทึกซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 9.5
```

---

## TS-SBH-3350-EDG - การแสดงผลกรณีจอแคบ ข้อความยาว และ Section ที่พับอยู่

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : ER Physician Note + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3350-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER — Overview (คัดกรอง ER) / ER Physician Note
- Requirement ที่อ้างอิง: SBH-3350 — [ER][Cosmetic] Overview + ER Physician note

วัตถุประสงค์
- ยืนยันว่าฟอร์มยังใช้งานได้เมื่อหน้าจอแคบ ข้อความยาว หรือช่องบังคับอยู่ใน Section ที่พับไว้

ขอบเขต Requirement
- AC 4.4 Body metric ขึ้นบรรทัดใหม่ ไม่มี scroll แนวนอน
- AC 6.3 Display ขึ้นบรรทัดใหม่ ไม่มี scroll แนวนอน
- AC 9.4 Section พับอยู่ → ขยายก่อนเลื่อนไป

ความเสี่ยง
- ช่องค่าถูกตัด / ต้องเลื่อนแนวนอน → อ่านค่าผิดหรือไม่เห็นค่า
- ช่องบังคับซ่อนใน Section ที่พับ → แพทย์ไม่เห็นว่าขาดอะไร

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-3350-052 - ขยาย Section ที่พับอยู่ก่อนเลื่อนไปช่องบังคับที่ยังไม่กรอก

Status: Not Run · Priority: High · Labels: QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3350-052
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user แพทย์ ER > ER Dashboard > กด Patient Card ของผู้ป่วย F > หน้า Overview
2. ที่ ER Physician Note กรอก Present illness แต่ไม่เลือก Diagnosis
3. กดปุ่มพับ Section Diagnosis general > เลื่อนขึ้นบนสุดของฟอร์ม > กดบันทึก

## Expected Result
Section Diagnosis general ขยายออกเอง
หน้าจอเลื่อนไปที่ช่อง Diagnosis พร้อมกรอบแดงและข้อความ "กรุณาระบุ [ชื่อช่อง]"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 9.4
```

### TC-SBH-3350-053 - ตรวจสอบ Body metric general ขึ้นบรรทัดใหม่เมื่อหน้าจอแคบ

Status: Not Run · Priority: Medium · Labels: QA Case : Edge + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-053
Case Type: Edge
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย B > ฟอร์มคัดกรอง ER
2. กรอก Weight = 60 · Height = 170
3. ย่อความกว้างหน้าต่างเบราว์เซอร์ทีละขั้นจนช่องค่าใน Body metric general แสดงไม่ครบในแถวเดียว

## Expected Result
ช่องขึ้นบรรทัดใหม่ ค่า Weight / Height / BMI พร้อมหน่วยแสดงครบ
ไม่มี scroll แนวนอน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.4 — การ์ดไม่ระบุความกว้างจอ (ดู gap)
```

### TC-SBH-3350-054 - ตรวจสอบข้อความ Display ที่ยาวในตาราง Underlying Disease ขึ้นบรรทัดใหม่

Status: Not Run · Priority: Low · Labels: QA Case : Edge + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3350-054
Case Type: Edge
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > ER Dashboard > กดการ์ดผู้ป่วย E (Underlying Disease ข้อความยาว) > หน้า Overview
2. ดูตาราง Underlying Disease

## Expected Result
ข้อความใน Display ขึ้นบรรทัดใหม่ อ่านได้ครบ
ตารางไม่มี scroll แนวนอน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.3
```

---

## Requirement gap (ไม่สร้างเป็น TC)

- **Expected behavior**
  - ค่าสี Normal / Abnormal / Critical / Meta / Primary — การ์ดอ้าง "กติกากลาง S1" แต่ไม่ได้ใส่ค่าสี → TC ตรวจได้แค่ว่า "ใช้สีชุดเดียวกัน" ไม่ได้เทียบ hex
  - Scope ระบุ "ชุดสี ESI ตามกติกากลาง S1" และ "แถบสรุปบนสุดของ ER Physician Note" แต่ไม่มี AC → ไม่มี TC
  - AC 1.3 "แบบข้อ 1" — น่าจะหมายถึงรูปแบบหัว Section ใน AC 2
  - AC 2.3 หัวกลุ่ม (ภาษาไทย) มีคำไหนบ้าง อยู่ฟอร์มไหน
  - AC 3 ใช้กับ ER Physician Note ด้วยหรือไม่ (AC 4 / 8 เขียน "ใช้ทั้ง 2 ฟอร์ม" แต่ AC 3 ไม่เขียน) · ใช้กับ Vital signs ทุกตัว (BP / PR / Temp / SpO2) หรือไม่ · ค่าวิกฤตแสดงป้าย H / L ด้วยหรือไม่
  - AC 3.3 ช่วงปกติแสดงตลอด หรือเฉพาะตอนค่าผิดปกติ
  - AC 3.2 ช่อง SpO2 ไม่อยู่ในตาราง MEWS ของระบบ — ค่าวิกฤตของ SpO2 ใช้เกณฑ์ไหน
  - AC 5.3 "แถบ encounter" = แถบไหน (แถบ Visit บนหัวหน้า หรือการ์ดบน Dashboard)
  - AC 5.4 GCS ≤ 8 แต่ระดับ ESI ที่ระบบแนะนำจากเกณฑ์อื่นเป็นค่าอื่น — ป้ายแนะนำขึ้นที่ไหน
  - AC 8.7 "ยังเก็บในระบบตามเดิม" — QA ตรวจจากจุดไหน (หน้าประวัติ / API) · ไม่มี TC
  - AC 9 ใช้กับฟอร์มคัดกรอง ER ด้วยหรือไม่ · ข้อความเดิม "กรุณากรอกข้อมูลให้ครบ" ยังขึ้นหรือไม่ · ช่องบังคับของ ER Physician Note มีอะไรบ้างนอกจาก Diagnosis
- **Validation**
  - ช่วงปกติของ Vital signs แต่ละตัว (การ์ดบอก "ใช้ค่าเดิมของระบบ" แต่ไม่ได้ระบุ) — TC ใช้ RR 12–20 ตามตัวอย่างในการ์ด
- **Error handling**
  - -
- **Permission / role**
  - พยาบาลเห็น ER Physician Note รูปแบบใหม่แบบอ่านอย่างเดียวหรือไม่ · แพทย์เห็นปุ่ม ดู / แก้ไข ประวัติการคัดกรองหรือไม่
- **Edge cases**
  - AC 4.4 / 6.3 ไม่ระบุความกว้างจอที่ต้องรองรับ
  - ค่าตรงขอบช่วงปกติ (RR 12 / 20) แสดงเป็นปกติหรือผิดปกติ — ไม่ได้ใส่ TC เพราะการ์ดไม่บอกช่วงจริง

## เรื่องที่ไม่ได้ใส่เป็น TC (เสนอ — เพิ่มได้ถ้าผู้ใช้ต้องการ)

- GCS 9 → ESI 1 **ไม่**มีป้าย "แนะนำ" (ขอบอีกด้านของ AC 5.4)
- ค่า Vital signs ตรงขอบช่วงปกติ (RR 12 / 20) ไม่มีขอบส้ม / ป้าย H-L
- AC 3 บน ER Physician Note (ขอบ / ป้าย H-L ที่ Vital signs ของแพทย์)
- AC 9 บนฟอร์มคัดกรอง ER
- ปุ่ม "ประวัติ" ในเมนู ⋮ บนฟอร์มคัดกรอง ER (TC-046 / 047 ทำบน ER Physician Note)

## คำถามก่อนสร้างใน Linear

1. ~~QA Sub-module / Feature~~ — ยืนยันแล้ว: สร้าง label ใหม่ `QA Sub-module / Feature : ER Physician Note` (2 พ.ย. 2026)
2. Version — 2.9.1 ตาม label ของการ์ด (PR เขียน V2.10.0)
3. Run Type CT · Env Dev-X / SBH Prod
4. เพิ่ม TC จากหัวข้อ "เรื่องที่ไม่ได้ใส่เป็น TC" หรือไม่
