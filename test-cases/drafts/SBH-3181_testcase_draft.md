# Draft Test Structure — SBH-3181

> สถานะ: **สร้างใน Linear แล้ว 2 พ.ย. 2026** — ผู้ใช้พิมพ์ "สร้างได้" · EXE `SBH-3751` · HPY `SBH-3752` (TC 001–062) · UHP `SBH-3753` (TC 063) · EDG `SBH-3754` (TC 064–066) · สร้างผ่าน connector บัญชี Pearsu (ผู้ใช้อนุญาต) · assignee Suchat · TC สร้างพร้อมกัน 3 ชุดด้วย Sub Agent จึงได้เลขสลับกัน
> - เลข TC → SBH: 001=3755 · 002=3758 · 003=3761 · 004=3764 · 005=3767 · 006=3770 · 007=3773 · 008=3776 · 009=3779 · 010=3783 · 011=3785 · 012=3788 · 013=3791 · 014=3794 · 015=3797 · 016=3800 · 017=3804 · 018=3805 · 019=3810 · 020=3811 · 021=3815 · 022=3818 · 023=3756 · 024=3759 · 025=3762 · 026=3766 · 027=3769 · 028=3772 · 029=3775 · 030=3778 · 031=3781 · 032=3784 · 033=3789 · 034=3790 · 035=3792 · 036=3795 · 037=3801 · 038=3802 · 039=3807 · 040=3809 · 041=3813 · 042=3814 · 043=3817 · 044=3820 · 045=3757 · 046=3760 · 047=3763 · 048=3765 · 049=3768 · 050=3771 · 051=3774 · 052=3777 · 053=3780 · 054=3782 · 055=3786 · 056=3787 · 057=3793 · 058=3796 · 059=3798 · 060=3799 · 061=3803 · 062=3806 · 063=3808 · 064=3812 · 065=3816 · 066=3819
> - ชุดนี้ = EXE 1 + Scenario 3 (HPY / UHP / EDG) + TC 66 = 70 ใบ
> - ยึด AC 7 หัวข้อในการ์ด · คอมเมนต์: มีแค่ให้กำลังใจ dev ไม่มีข้อมูลเพิ่ม · ไม่มี Sub-Issue สเปก
> - ชื่อแท็บ / ข้อความตารางว่าง / ข้อความในแผงคอลัมน์ อ้างจากไฟล์ "ER Patient List Mockup.html" ที่แนบในการ์ด (Prototype) — ยังไม่ได้เทียบกับแอปจริง
> - PR: cortex-ui #2615 (improve ER patient list display conditions) · cortex-api #3003 (add ER treatment stage and medication completed count) — ขึ้นต้น [V2.10.0] ตรงกับ label
> - ใส่เฉพาะ TC ที่จะทดสอบจริง · ชื่อ TC ไม่มี `[Required]` นำหน้า · body ของ TC ใช้รูปแบบ SBH-1972
> - ผู้ใช้ยืนยันแล้ว (2 พ.ย. 2026): Run Type CT · Version 2.10.0 · Env Dev-X / SBH Prod · QA Module : ER · QA Sub-module / Feature : Queue (label ที่มีอยู่ ไม่สร้างใหม่) — **ยังรอ "สร้างได้" หลัง review ร่าง**

Requirement: SBH-3181 — [ER][Dashboard][Patientlist ] ปรับปรุงเงื่อนไขการแสดงผล
URL: https://linear.app/cortexcloud/issue/SBH-3181/erdashboardpatientlist-ปรบปรงเงอนไขการแสดงผล
Project: [SBH] ER · Team: SBH Project · Milestone: ER - เก็บตก, edge case · Priority: No priority · State: In Review
Labels: Natthaphat ( MOD ) 🙈 · 🍄 Improvement · VERSION 2.10.0 · Assignee: jetsadaporn (Dew) · ผูก Cycle อยู่ → Run Type = CT · สร้างโดย Natthaphat(MOD)
Relations: ไม่มี
Scope / Version = 2.10.0

## AC → TC

| AC | เรื่อง | TC |
|---|---|---|
| 1.1 | ระดับคัดกรองเป็นป้ายสี ESI แบบบอร์ด | 001 |
| 1.2 | หัวคอลัมน์ "ESI" | 002 |
| 1.3 | ชื่อโซนมาตรฐาน 7 ชื่อ | 003 |
| 1.4 | บอร์ดไม่ใช้ "Zone Isolate" | 004 |
| 1.5 | เพศไม่ทราบ "ไม่ระบุเพศ" ทั้ง 2 มุมมอง | 005 · 006 |
| 1.6 | "ยังไม่ระบุแพทย์" ครั้งเดียว สีเทา | 007 |
| 1.7 | คอลัมน์สถานะ = สถานะ encounter ไม่ใช่ชื่อโซน | 008 |
| 2.1 | ตัวนับตามแท็บ + ตัวกรอง · แท็บ 0 ราย = "ทั้งหมด 0" | 009 · 010 · 064 |
| 2.2 | ชิปตัวนับแยก ESI ชื่อตามฟอร์มคัดกรอง | 011 · 013 |
| 2.3 | ไม่ใช้ "สังเกตอาการ" เป็นชื่อกลุ่ม ESI | 012 |
| 2.4 | กดชิป ESI กรอง · กดซ้ำยกเลิก | 014 · 015 |
| 3.1 | ตัวเลือก "โซน" เลือกได้หลายค่า 7 โซน | 016 |
| 3.2 | จำนวนผู้ป่วยต่อโซนตามแท็บ | 017 |
| 3.3 | เลือก Urgency + Isolation 1 → ตาราง + ตัวนับ | 018 · 019 |
| 3.4 | ชิปตัวกรอง ลบทีละอัน · ปุ่ม "ล้าง" | 020 · 021 |
| 3.5 | จำตัวกรองโซนล่าสุด | 022 |
| 4.1 | ปุ่ม "คอลัมน์" (เฟือง) มุมขวาบน | 023 |
| 4.2 | checkbox ซ่อน / แสดง · ปุ่มเลื่อนขึ้น / ลง | 024 · 025 |
| 4.3 | คิว / ESI / ชื่อ-สกุล ซ่อนไม่ได้ | 026 |
| 4.4 | ปุ่ม "คืนค่าเริ่มต้น" | 027 |
| 4.5 | บันทึกต่อผู้ใช้ · ใช้กับทุกแท็บ | 028 · 029 · 030 |
| 4.6 | คอลัมน์ที่เลือกได้ 19 รายการ | 031 |
| 4.7 | คอลัมน์เริ่มต้น 13 รายการ | 032 |
| 5.1 | อายุ "45 ปี" | 033 · 066 |
| 5.2 | ต่ำกว่า 1 ปีแสดงเดือน | 065 |
| 5.3 | ไม่แสดง "x เดือน x วัน" | 034 |
| 6.1 | ไม่มีคอลัมน์ เวลารอ / เวลารับเข้า | 035 |
| 6.2 | ตัวกรองเวลาย้ายไป "ตัวกรองเพิ่มเติม" | 036 · 037 |
| 7.1 | 1366 px ไม่ต้องเลื่อนแนวนอน | 038 |
| 7.2 | หัวตารางค้าง · คอลัมน์ซ้ายค้าง | 039 · 040 |
| 7.3 | ชิป Order 5 ชนิด + legend | 041 · 042 |
| 7.4 | สีชิป Order 4 สถานะ | 043 · 044 · 045 · 046 |
| 7.5 | Hover tooltip · คลิกเปิดรายละเอียด | 047 · 048 |
| 7.6 | MEWS สีแบบบอร์ด | 049 |
| 7.7 | ช่องค้นหาเดียว "ค้นหา HN หรือชื่อ" | 050 · 051 · 063 |
| 7.8 | แถบตัวกรองหลักมีแค่ ค้นหา / โซน / แพทย์ / ตัวกรองเพิ่มเติม | 052 |
| 7.9 | เรียงเริ่มต้น ESI → คิว · คลิกหัวคอลัมน์ 5 คอลัมน์ | 053 · 054 · 055 · 056 · 057 · 058 |
| 7.10 | คลิกแถวเปิดหน้าผู้ป่วย | 059 |
| 7.11 | ตัวเลขแท็บ 0 ราย สีเทา | 060 |
| 7.12 | ตารางว่าง ข้อความตามบริบท + ปุ่ม "ล้างตัวกรอง" | 061 · 062 · 063 |

## ตารางสรุป Test Case

| TC | Scenario | ชื่อ Test Case | Expected Result |
|---|---|---|---|
| 001 | HPY | แสดงระดับคัดกรองเป็นป้ายสี ESI แบบเดียวกับการ์ดบนบอร์ด | ป้ายสี 1 แดง · 2 ม่วงแดง · 3 เหลืองอำพัน · 4 เขียว · 5 เทา ตรงกับการ์ดบนบอร์ด · ไม่ใช่ตัวเลขเปล่า |
| 002 | HPY | ตรวจสอบชื่อหัวคอลัมน์ระดับคัดกรองเป็น "ESI" | หัวคอลัมน์แสดง "ESI" เหมือนบอร์ด |
| 003 | HPY | ตรวจสอบชื่อโซนในคอลัมน์ "โซน" ใช้ชื่อมาตรฐานของระบบ | แสดงเฉพาะชื่อ Triage · Resuscitation · Urgency · Isolation 1 · Isolation 2 · Observation · ED Boarding · ตรงกับโซนบนบอร์ดของผู้ป่วยรายเดียวกัน |
| 004 | HPY | ตรวจสอบมุมมองบอร์ดไม่ใช้คำว่า "Zone Isolate" | ไม่มีคำ "Zone Isolate" · แสดง Isolation 1 / Isolation 2 (หรือ Isolation + เลขห้อง) ตรงกับคอลัมน์โซนในรายการ |
| 005 | HPY | แสดง "ไม่ระบุเพศ" ในคอลัมน์เพศของมุมมองรายการเมื่อไม่ทราบเพศ | คอลัมน์เพศแสดง "ไม่ระบุเพศ" |
| 006 | HPY | แสดง "ไม่ระบุเพศ" บนการ์ดมุมมองบอร์ดเมื่อไม่ทราบเพศ | การ์ดบนบอร์ดแสดง "ไม่ระบุเพศ" คำเดียวกับมุมมองรายการ |
| 007 | HPY | แสดง "ยังไม่ระบุแพทย์" ครั้งเดียวด้วยตัวอักษรสีเทาเมื่อยังไม่มีแพทย์ | แสดง "ยังไม่ระบุแพทย์" 1 ครั้ง สีเทา · ไม่แสดง "ไม่ระบุแพทย์ ไม่ระบุแพทย์" |
| 008 | HPY | ตรวจสอบคอลัมน์ "สถานะ" แสดงเฉพาะสถานะของ encounter | แสดงสถานะ encounter (เช่น กำลังตรวจ / รอเตียง / รอจำหน่าย) · ไม่มีชื่อโซนในคอลัมน์สถานะ |
| 009 | HPY | ตรวจสอบตัวนับ "ทั้งหมด" ตรงกับจำนวนผู้ป่วยของแท็บสถานะที่เลือก | "ทั้งหมด" = จำนวนแถวในตารางของแท็บที่เลือก · เปลี่ยนตามแท็บ |
| 010 | HPY | ตรวจสอบตัวนับด้านบนเปลี่ยนตามตัวกรองแพทย์ที่เลือก | "ทั้งหมด" และชิป ESI นับเฉพาะผู้ป่วยของแพทย์ที่เลือก |
| 011 | HPY | ตรวจสอบชื่อชิปตัวนับ ESI ใช้ชื่อระดับเดียวกับฟอร์มคัดกรอง | ชิป 5 อัน: 1 กู้ชีพ · 2 ฉุกเฉิน · 3 เร่งด่วน · 4 กึ่งเร่งด่วน · 5 ไม่เร่งด่วน |
| 012 | HPY | ตรวจสอบชิปตัวนับไม่ใช้คำว่า "สังเกตอาการ" เป็นชื่อกลุ่ม ESI | ไม่มีชิปชื่อ "สังเกตอาการ" ในแถบตัวนับ |
| 013 | HPY | ตรวจสอบตัวเลขบนชิป ESI ตรงกับจำนวนผู้ป่วยแต่ละระดับ | ตัวเลขชิปแต่ละระดับ = จำนวนแถวที่มี ESI นั้นในแท็บที่เลือก |
| 014 | HPY | กรองตารางด้วยการกดชิป ESI | ชิปแสดงสถานะถูกเลือก · ตารางเหลือเฉพาะผู้ป่วย ESI นั้น |
| 015 | HPY | ยกเลิกการกรองด้วยการกดชิป ESI ที่เลือกอยู่ซ้ำ | ชิปไม่ถูกเลือก · ตารางกลับมาแสดงผู้ป่วยทุกระดับ |
| 016 | HPY | ตรวจสอบตัวกรอง "โซน" มี 7 โซนและเลือกได้หลายค่า | ตัวเลือก Triage · Resuscitation · Urgency · Isolation 1 · Isolation 2 · Observation · ED Boarding · เลือกพร้อมกันได้มากกว่า 1 โซน |
| 017 | HPY | แสดงจำนวนผู้ป่วยของแต่ละโซนในตัวกรองตามแท็บที่เลือก | ตัวเลขข้างแต่ละโซน = จำนวนผู้ป่วยโซนนั้นในแท็บที่เลือก · เปลี่ยนเมื่อสลับแท็บ |
| 018 | HPY | กรองตารางด้วยโซน Urgency และ Isolation 1 | ตารางแสดงเฉพาะผู้ป่วยโซน Urgency และ Isolation 1 |
| 019 | HPY | ตรวจสอบตัวนับด้านบนเปลี่ยนตามโซนที่เลือก | "ทั้งหมด" และชิป ESI นับเฉพาะผู้ป่วยโซน Urgency และ Isolation 1 |
| 020 | HPY | แสดงโซนที่เลือกเป็นชิปใต้แถบตัวกรองและลบทีละอันได้ | ชิป "โซน: Urgency" · "โซน: Isolation 1" ใต้แถบ · กด × แล้วชิปนั้นหาย ตารางกรองตามโซนที่เหลือ |
| 021 | HPY | ล้างตัวกรองทั้งหมดด้วยปุ่ม "ล้าง" | ชิปตัวกรองหายทั้งหมด · ตารางแสดงผู้ป่วยทั้งหมดของแท็บ |
| 022 | HPY | ตรวจสอบระบบจำตัวกรองโซนล่าสุดเมื่อกลับมาหน้ารายการ | กลับมาหน้ารายการแล้วโซนที่เลือกไว้ยังถูกเลือก · ตารางกรองตามโซนนั้น |
| 023 | HPY | แสดงปุ่ม "คอลัมน์" ไอคอนเฟืองที่มุมขวาบนของตาราง | ปุ่ม "คอลัมน์" มีไอคอนเฟือง อยู่มุมขวาบนของตาราง |
| 024 | HPY | ซ่อนและแสดงคอลัมน์ด้วย checkbox ในแผงตั้งค่าคอลัมน์ | เอาเครื่องหมายออกแล้วคอลัมน์หายจากตาราง · ติ๊กกลับแล้วคอลัมน์กลับมา |
| 025 | HPY | เรียงลำดับคอลัมน์ด้วยปุ่มเลื่อนขึ้น / ลงในแผงตั้งค่าคอลัมน์ | ลำดับในแผงและลำดับคอลัมน์ในตารางเปลี่ยนตามที่เลื่อน |
| 026 | HPY | ตรวจสอบคอลัมน์ คิว ESI และชื่อ-สกุล ซ่อนไม่ได้ | checkbox ของ คิว · ESI · ชื่อ-สกุล ติ๊กไว้และกดไม่ได้ (ล็อก) · คอลัมน์ยังแสดง |
| 027 | HPY | คืนค่าคอลัมน์เริ่มต้นด้วยปุ่ม "คืนค่าเริ่มต้น" | คอลัมน์และลำดับกลับเป็นค่าเริ่มต้น 13 คอลัมน์ |
| 028 | HPY | ตรวจสอบการตั้งค่าคอลัมน์คงอยู่หลัง Logout และ Login ด้วยผู้ใช้เดิม | คอลัมน์และลำดับที่ตั้งไว้ยังคงเดิม |
| 029 | HPY | ตรวจสอบการตั้งค่าคอลัมน์ของผู้ใช้หนึ่งไม่มีผลกับผู้ใช้อื่น | ผู้ใช้ B เห็นคอลัมน์เริ่มต้น ไม่เห็นการตั้งค่าของผู้ใช้ A |
| 030 | HPY | ตรวจสอบการตั้งค่าคอลัมน์ใช้กับทุกแท็บสถานะ | ทุกแท็บแสดงคอลัมน์และลำดับเดียวกับที่ตั้งไว้ |
| 031 | HPY | ตรวจสอบรายการคอลัมน์ที่เลือกได้ในแผงตั้งค่าคอลัมน์ | มี 19 รายการ: คิว · ESI · HN · AN · VN · ชื่อ-สกุล · อายุ · เพศ · โซน · อาการสำคัญ (CC) · Diagnosis · Trauma/Non-Trauma · MEWS · GCS · Order · ชำระเงิน · สิทธิ · แพทย์ · สถานะ |
| 032 | HPY | ตรวจสอบคอลัมน์ที่แสดงเริ่มต้นของตาราง | แสดง 13 คอลัมน์: คิว · ESI · HN · ชื่อ-สกุล · อายุ · เพศ · โซน · MEWS · GCS · Order · ชำระเงิน · แพทย์ · สถานะ |
| 033 | HPY | แสดงอายุเป็นจำนวนปีอย่างเดียวในคอลัมน์อายุ | แสดง "<ปี> ปี" เช่น "45 ปี" · ไม่มีเดือนและวัน |
| 034 | HPY | ตรวจสอบคอลัมน์อายุไม่แสดงตัวยึดตำแหน่ง "x เดือน x วัน" | ไม่มีแถวใดแสดง "x เดือน x วัน" ทุกแท็บ |
| 035 | HPY | ตรวจสอบตารางไม่มีคอลัมน์ "เวลารอ" และ "เวลารับเข้า" | ไม่มีคอลัมน์ "เวลารอ" / "เวลารับเข้า" ทั้งในตารางและในแผงตั้งค่าคอลัมน์ |
| 036 | HPY | ตรวจสอบแถบตัวกรองหลักไม่มีตัวกรอง "เวลาเริ่ม → ถึง" | ไม่มีช่องเวลาเริ่ม → ถึง ในแถบตัวกรองหลัก |
| 037 | HPY | ตรวจสอบปุ่ม "ตัวกรองเพิ่มเติม" มีตัวกรองวันที่และเวลา | กดแล้วมีตัวกรองวันที่และเวลา |
| 038 | HPY | ตรวจสอบคอลัมน์เริ่มต้นแสดงครบที่ความกว้าง 1366 px โดยไม่ต้องเลื่อนแนวนอน | เห็นครบ 13 คอลัมน์ · ไม่มีแถบเลื่อนแนวนอนของตาราง |
| 039 | HPY | ตรวจสอบหัวตารางค้างอยู่ด้านบนเมื่อเลื่อนตารางลง | หัวตารางยังอยู่ด้านบนตลอดการเลื่อน |
| 040 | HPY | ตรวจสอบคอลัมน์ คิว ESI และชื่อ-สกุล ค้างทางซ้ายเมื่อเลื่อนแนวนอน | คอลัมน์ คิว · ESI · ชื่อ-สกุล ค้างอยู่ทางซ้าย · คอลัมน์อื่นเลื่อนผ่าน |
| 041 | HPY | แสดงคอลัมน์ Order เป็นชิป 5 ชนิดพร้อมตัวอักษรกำกับ | ทุกแถวมีชิป Lab · ยา · IMG · หัตถการ · Consult |
| 042 | HPY | แสดงคำอธิบายสีชิป Order (legend) ใต้ตาราง | legend ใต้ตารางบอกสี ไม่มีรายการ · รอดำเนินการ · เสร็จแล้ว · ผลผิดปกติ / ด่วน |
| 043 | HPY | แสดงชิป Order เป็นเส้นขอบเทาเมื่อไม่มีรายการ | ชิปชนิดที่ไม่มี order เป็นเส้นขอบเทา |
| 044 | HPY | แสดงชิป Order สีส้มเมื่อรายการรอดำเนินการ | ชิป Lab ของผู้ป่วยที่ Lab รอดำเนินการเป็นสีส้ม |
| 045 | HPY | แสดงชิป Order สีเขียวเมื่อรายการเสร็จแล้ว | ชิปของรายการที่เสร็จแล้วเป็นสีเขียว |
| 046 | HPY | แสดงชิป Order สีแดงเมื่อผลผิดปกติหรือด่วน | ชิป Lab ที่ผลผิดปกติเป็นสีแดง |
| 047 | HPY | แสดง tooltip ชื่อ order และสถานะเมื่อ Hover ชิป Order | tooltip แสดงชื่อ order และสถานะตรงกับสีชิป |
| 048 | HPY | เปิดรายละเอียด order ด้วยการคลิกชิป Order | เปิดรายละเอียด order แบบเดียวกับก่อนปรับหน้า |
| 049 | HPY | แสดงคะแนน MEWS พร้อมสีความเสี่ยงแบบเดียวกับบอร์ด | คะแนนและสีของ MEWS ตรงกับการ์ดบนบอร์ดของผู้ป่วยรายเดียวกัน |
| 050 | HPY | ค้นหาผู้ป่วยด้วย HN ในช่อง "ค้นหา HN หรือชื่อ" | มีช่องค้นหาเดียว placeholder "ค้นหา HN หรือชื่อ" · ตารางเหลือผู้ป่วย HN นั้น |
| 051 | HPY | ค้นหาผู้ป่วยด้วยชื่อในช่อง "ค้นหา HN หรือชื่อ" | ตารางเหลือเฉพาะผู้ป่วยที่ชื่อตรงคำค้น |
| 052 | HPY | ตรวจสอบแถบตัวกรองหลักมีเฉพาะ ค้นหา โซน แพทย์ และตัวกรองเพิ่มเติม | แถบหลักมี 4 อย่างนี้ (+ ปุ่มล้าง) · ไม่มีตัวกรอง ESI ในแถบหลัก |
| 053 | HPY | ตรวจสอบการเรียงลำดับเริ่มต้นตาม ESI แล้วตามคิว | เรียง ESI 1 → 5 · ESI เดียวกันเรียงตามคิว |
| 054 | HPY | เรียงตารางด้วยการคลิกหัวคอลัมน์ ESI | เรียงตาม ESI และสลับทิศเมื่อคลิกซ้ำ |
| 055 | HPY | เรียงตารางด้วยการคลิกหัวคอลัมน์ชื่อ-สกุล | เรียงตามชื่อ และสลับทิศเมื่อคลิกซ้ำ |
| 056 | HPY | เรียงตารางด้วยการคลิกหัวคอลัมน์อายุ | เรียงตามอายุ (นับเดือนของเด็กต่ำกว่า 1 ปีด้วย) และสลับทิศเมื่อคลิกซ้ำ |
| 057 | HPY | เรียงตารางด้วยการคลิกหัวคอลัมน์ MEWS | เรียงตามคะแนน MEWS และสลับทิศเมื่อคลิกซ้ำ |
| 058 | HPY | เรียงตารางด้วยการคลิกหัวคอลัมน์โซน | เรียงตามโซน และสลับทิศเมื่อคลิกซ้ำ |
| 059 | HPY | เปิดหน้าผู้ป่วยด้วยการคลิกที่แถวในตาราง | คลิกส่วนใดของแถวก็เปิดหน้าผู้ป่วย encounter ER ปัจจุบัน |
| 060 | HPY | แสดงตัวเลขของแท็บสถานะที่มี 0 รายเป็นสีเทา | แท็บ 0 ราย ตัวเลขสีเทา · แท็บที่มีผู้ป่วยตัวเลขเด่น |
| 061 | HPY | แสดงข้อความ "ไม่มีผู้ป่วยในโซนที่เลือก" เมื่อเลือกโซนที่ไม่มีผู้ป่วย | ตารางว่างแสดง "ไม่มีผู้ป่วยในโซนที่เลือก" + ปุ่ม "ล้างตัวกรอง" |
| 062 | HPY | ล้างตัวกรองด้วยปุ่ม "ล้างตัวกรอง" ในตารางว่าง | ตัวกรองหายทั้งหมด · ตารางแสดงผู้ป่วยของแท็บอีกครั้ง |
| 063 | UHP | ค้นหาด้วย HN ที่ไม่มีในแท็บที่เลือก | ตารางว่าง · ข้อความตามบริบทของการค้นหา (ไม่ใช่ข้อความโซน) + ปุ่ม "ล้างตัวกรอง" |
| 064 | EDG | แสดงตัวนับ "ทั้งหมด 0" ในแท็บสถานะที่ไม่มีผู้ป่วย | "ทั้งหมด 0" · ชิป ESI ทุกอันเป็น 0 |
| 065 | EDG | แสดงอายุเป็นเดือนเมื่อผู้ป่วยอายุต่ำกว่า 1 ปี | ผู้ป่วยอายุ 11 เดือน แสดง "11 เดือน" |
| 066 | EDG | แสดงอายุ "1 ปี" เมื่อผู้ป่วยอายุครบ 1 ปีพอดี | แสดง "1 ปี" ไม่ใช่ "12 เดือน" |

## ข้อมูลตั้งต้นที่ต้องเตรียม (ใช้ร่วมหลาย TC)

- **user พยาบาล ER A** (ใช้ทุก TC) · **user ER B** อีกบัญชี (TC-029 — ใช้ user แพทย์ ER ได้)
- dev-x เป็นระบบที่ใช้ร่วมกัน: ผู้ป่วยในตารางมีของคนอื่นปน — TC ที่เทียบจำนวนให้นับจากตารางตอนรัน ไม่ฝังตัวเลข
- **ชุดผู้ป่วย ER (แท็บ ผู้ป่วยปัจจุบันใน ER)** อย่างน้อย:
  - ESI ครบ 1–5 (ระดับละ ≥ 1 ราย) — 001, 011, 013, 014, 053, 054
  - โซน Urgency ≥ 2 ราย · Isolation 1 ≥ 1 ราย · Isolation 2 ≥ 1 ราย · โซนอื่นอย่างน้อย 1 โซน (เช่น Observation) — 003, 004, 016–022, 058
  - ผู้ป่วยแพทย์ต่างกัน ≥ 2 คน — 010
  - ผู้ป่วยเพศ "ไม่ระบุ" (ลงทะเบียนโดยไม่ระบุเพศ) — 005, 006
  - ผู้ป่วยที่ยังไม่ระบุแพทย์ (คัดกรองแล้ว แพทย์ยังไม่รับ) — 007
  - ผู้ป่วยอายุ ≥ 1 ปีที่มีเดือนและวันเกิน (เช่น 45 ปี 3 เดือน 10 วัน) — 033, 034
  - ผู้ป่วยอายุ 11 เดือน (065) · อายุ 1 ปีพอดี วันเกิด = วันนี้ปีก่อน (066 — ห้ามรันคร่อมเที่ยงคืน)
  - MEWS ต่างระดับความเสี่ยง (ต่ำ / ปานกลาง / สูง) — 049, 057
- **Order** (ผู้ป่วยในชุดเดียวกันได้): ผู้ป่วยที่ไม่มี IMG (043) · Lab รอดำเนินการ (044) · ยาจ่ายแล้ว / Lab ผลออกแล้ว (045) · Lab ผลผิดปกติ (046)
- **แท็บอื่น**: ผู้ป่วยอย่างน้อย 1 รายในแท็บ ผู้ป่วยรอเตียง หรือ รอจำหน่าย (008, 009, 017, 030) · แท็บที่มี 0 ราย ตอนรัน (060, 064 — เลือกจากตัวเลขแท็บตอนรัน)
- **โซนที่ไม่มีผู้ป่วย** ในแท็บที่เลือก (061, 062 — เลือกจากตัวเลขในตัวกรองโซนตอนรัน)
- TC-038: หน้าจอกว้าง 1366 px (เบราว์เซอร์ขนาด 1366 × 768 · zoom 100%)

---

## EXE - CT - 2.10.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: [SBH] ER · Milestone: ER - เก็บตก, edge case
Labels: Natthaphat ( MOD ) 🙈, 🍄 Improvement, VERSION 2.10.0, Suchart ( Jame ) 🥷, QA Module : ER, QA Sub-module / Feature : Queue, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.10.0
- Module: ER — แดชบอร์ด / คิว (มุมมอง "รายการ" — ER Patient List)
- Requirement ที่อ้างอิง: SBH-3181 — [ER][Dashboard][Patientlist ] ปรับปรุงเงื่อนไขการแสดงผล
- Environment: Dev-X / SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- ข้อมูลและคำเรียกตรงกับมุมมองบอร์ด (ESI · โซน · เพศ · แพทย์ · สถานะ)
- ตัวนับด้านบน + ชิป ESI กรองตาราง
- Filter เลือกโซน (หลายค่า · ชิป · ล้าง · จำค่าล่าสุด)
- ตั้งค่าคอลัมน์ (ซ่อน / แสดง · เรียง · ล็อก · คืนค่าเริ่มต้น · บันทึกต่อผู้ใช้)
- อายุแสดงเป็นปี / เดือน
- เอาคอลัมน์เวลารอ / เวลารับเข้า และตัวกรองเวลาออกจากแถบหลัก
- อ่านง่ายขึ้น: 1366 px · หัวตาราง / คอลัมน์ค้าง · ชิป Order · MEWS · ค้นหา · เรียงลำดับ · คลิกแถว · ตารางว่าง

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- นอก scope ตามการ์ด: มุมมองบอร์ด (ยกเว้นคำเรียก) · การทำงานของปุ่มเรียกคิว · ลิงก์ชื่อผู้ป่วย · รายงานทางสถิติ ER
```

---

## TS-SBH-3181-HPY - แสดงผลและใช้งาน ER Patient List ตามเงื่อนไขใหม่

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3181-HPY
- Case Type: Happy
- Suffix: HPY
- Module: ER — แดชบอร์ด / คิว (มุมมอง "รายการ")
- Requirement ที่อ้างอิง: SBH-3181 — [ER][Dashboard][Patientlist ] ปรับปรุงเงื่อนไขการแสดงผล

วัตถุประสงค์
- ยืนยันว่ามุมมอง "รายการ" ใช้ข้อมูลและคำเรียกเดียวกับบอร์ด มี Filter โซน ตั้งค่าคอลัมน์ได้ และอ่านง่ายตาม AC

ขอบเขต Requirement
- AC 1 ข้อมูลและคำเรียกตรงกับมุมมองบอร์ด · AC 2 ตัวนับด้านบน · AC 3 Filter เลือกโซน
- AC 4 ตั้งค่าคอลัมน์ · AC 5 อายุ · AC 6 เอาเวลารอ / เวลารับเข้าออก · AC 7 อ่านง่ายขึ้น

ความเสี่ยง
- ตัวนับ / ตัวกรองนับผิด → พยาบาลประเมินภาระงานในโซนผิด
- ป้ายสี ESI / MEWS / ชิป Order ไม่ตรงบอร์ด → อ่านความรุนแรงหรือสถานะ order ผิด
- การตั้งค่าคอลัมน์ไม่ถูกบันทึกหรือรั่วไปผู้ใช้อื่น
- คลิกแถวเปิดผิด encounter

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ผู้ป่วยที่ใช้ดูหัวข้อ "ข้อมูลตั้งต้น" ในไฟล์ร่าง
```

### TC-SBH-3181-001 - แสดงระดับคัดกรองเป็นป้ายสี ESI แบบเดียวกับการ์ดบนบอร์ด

Status: Not Run · Priority: High · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-001
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > เมนู ห้องฉุกเฉิน > แดชบอร์ด / คิว (มุมมอง "บอร์ด")
2. ดูป้าย ESI บนการ์ดผู้ป่วย ESI 1–5
3. สลับมุมมองเป็น "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
4. ดูคอลัมน์ ESI ของผู้ป่วยรายเดียวกัน

## Expected Result
ระดับคัดกรองแสดงเป็นป้ายสี: 1 แดง · 2 ม่วงแดง · 3 เหลืองอำพัน · 4 เขียว · 5 เทา ตรงกับการ์ดบนบอร์ด · ไม่ใช่ตัวเลขเปล่า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.1
```

### TC-SBH-3181-002 - ตรวจสอบชื่อหัวคอลัมน์ระดับคัดกรองเป็น "ESI"

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-002
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูหัวคอลัมน์ระดับคัดกรอง

## Expected Result
หัวคอลัมน์แสดง "ESI" เหมือนบอร์ด

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.2
```

### TC-SBH-3181-003 - ตรวจสอบชื่อโซนในคอลัมน์ "โซน" ใช้ชื่อมาตรฐานของระบบ

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-003
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. ดูคอลัมน์ "โซน" ทุกแถว
3. สลับเป็นมุมมอง "บอร์ด" ดูโซนของผู้ป่วยรายเดียวกัน 3 ราย (Urgency · Isolation 1 · Isolation 2)

## Expected Result
คอลัมน์โซนแสดงเฉพาะชื่อ Triage · Resuscitation · Urgency · Isolation 1 · Isolation 2 · Observation · ED Boarding · โซนของผู้ป่วยแต่ละรายตรงกับบอร์ด

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.3
```

### TC-SBH-3181-004 - ตรวจสอบมุมมองบอร์ดไม่ใช้คำว่า "Zone Isolate"

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-004
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว (มุมมอง "บอร์ด")
2. ดูหัวคอลัมน์ / ป้ายโซนของผู้ป่วยโซน Isolation 1 และ Isolation 2
3. สลับเป็นมุมมอง "รายการ" ดูคอลัมน์โซนของผู้ป่วย 2 รายเดียวกัน

## Expected Result
บอร์ดไม่มีคำ "Zone Isolate" · แสดง Isolation 1 / Isolation 2 หรือ "Isolation" พร้อมเลขห้อง ตรงกับคอลัมน์โซนในรายการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.4 (มุมมองบอร์ดอยู่ใน scope เฉพาะคำเรียก)
```

### TC-SBH-3181-005 - แสดง "ไม่ระบุเพศ" ในคอลัมน์เพศของมุมมองรายการเมื่อไม่ทราบเพศ

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-005
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูคอลัมน์เพศของผู้ป่วยที่ลงทะเบียนโดยไม่ระบุเพศ

## Expected Result
คอลัมน์เพศแสดง "ไม่ระบุเพศ"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.5
```

### TC-SBH-3181-006 - แสดง "ไม่ระบุเพศ" บนการ์ดมุมมองบอร์ดเมื่อไม่ทราบเพศ

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-006
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว (มุมมอง "บอร์ด")
2. ดูเพศบนการ์ดของผู้ป่วยรายเดียวกับ TC-005

## Expected Result
การ์ดบนบอร์ดแสดง "ไม่ระบุเพศ" คำเดียวกับมุมมองรายการ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.5
```

### TC-SBH-3181-007 - แสดง "ยังไม่ระบุแพทย์" ครั้งเดียวด้วยตัวอักษรสีเทาเมื่อยังไม่มีแพทย์

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-007
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูคอลัมน์แพทย์ของผู้ป่วยที่ยังไม่มีแพทย์รับ

## Expected Result
แสดง "ยังไม่ระบุแพทย์" 1 ครั้ง ตัวอักษรสีเทา · ไม่แสดง "ไม่ระบุแพทย์ ไม่ระบุแพทย์"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.6
```

### TC-SBH-3181-008 - ตรวจสอบคอลัมน์ "สถานะ" แสดงเฉพาะสถานะของ encounter

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-008
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูคอลัมน์ "สถานะ" ในแท็บ "ผู้ป่วยปัจจุบันใน ER"
3. ดูคอลัมน์ "สถานะ" ในแท็บ "ผู้ป่วยรอเตียง" หรือ "รอจำหน่าย"

## Expected Result
คอลัมน์สถานะแสดงสถานะ encounter (เช่น กำลังตรวจ · รอเตียง · รอจำหน่าย) · ไม่มีชื่อโซน (Triage · Urgency · Isolation ฯลฯ) ในคอลัมน์สถานะ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 1.7
```

### TC-SBH-3181-009 - ตรวจสอบตัวนับ "ทั้งหมด" ตรงกับจำนวนผู้ป่วยของแท็บสถานะที่เลือก

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-009
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. นับจำนวนแถวในตาราง เทียบกับตัวนับ "ทั้งหมด" ด้านบน
3. เปลี่ยนเป็นแท็บ "ผู้ป่วยรอเตียง" (หรือแท็บอื่นที่มีผู้ป่วย) แล้วเทียบอีกครั้ง

## Expected Result
ตัวนับ "ทั้งหมด" เท่ากับจำนวนแถวของแท็บที่เลือกอยู่ และเปลี่ยนตามแท็บ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.1
```

### TC-SBH-3181-010 - ตรวจสอบตัวนับด้านบนเปลี่ยนตามตัวกรองแพทย์ที่เลือก

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-010
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. ตัวกรองแพทย์ > เลือกแพทย์ 1 คน
3. เทียบตัวนับ "ทั้งหมด" และตัวเลขบนชิป ESI กับแถวในตาราง

## Expected Result
"ทั้งหมด" และชิป ESI นับเฉพาะผู้ป่วยของแพทย์ที่เลือก ตรงกับแถวในตาราง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.1
```

### TC-SBH-3181-011 - ตรวจสอบชื่อชิปตัวนับ ESI ใช้ชื่อระดับเดียวกับฟอร์มคัดกรอง

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-011
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูชิปตัวนับด้านบน

## Expected Result
ชิป 5 อันชื่อ 1 กู้ชีพ · 2 ฉุกเฉิน · 3 เร่งด่วน · 4 กึ่งเร่งด่วน · 5 ไม่เร่งด่วน (ตรงกับชื่อระดับในฟอร์มคัดกรอง)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.2
```

### TC-SBH-3181-012 - ตรวจสอบชิปตัวนับไม่ใช้คำว่า "สังเกตอาการ" เป็นชื่อกลุ่ม ESI

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-012
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูชิปตัวนับด้านบนทั้งหมด

## Expected Result
ไม่มีชิปชื่อ "สังเกตอาการ" ในแถบตัวนับ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.3
```

### TC-SBH-3181-013 - ตรวจสอบตัวเลขบนชิป ESI ตรงกับจำนวนผู้ป่วยแต่ละระดับ

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-013
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. นับจำนวนแถวของแต่ละ ESI ในตาราง เทียบกับตัวเลขบนชิป ESI 1–5

## Expected Result
ตัวเลขบนชิปแต่ละระดับเท่ากับจำนวนผู้ป่วย ESI นั้นในแท็บที่เลือก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.2
```

### TC-SBH-3181-014 - กรองตารางด้วยการกดชิป ESI

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-014
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. กดชิป "3 เร่งด่วน"

## Expected Result
ชิปแสดงสถานะถูกเลือก · ตารางแสดงเฉพาะผู้ป่วย ESI 3

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.4
```

### TC-SBH-3181-015 - ยกเลิกการกรองด้วยการกดชิป ESI ที่เลือกอยู่ซ้ำ

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-015
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. กดชิป "3 เร่งด่วน" (ตารางเหลือ ESI 3)
3. กดชิป "3 เร่งด่วน" ซ้ำ

## Expected Result
ชิปกลับเป็นไม่ถูกเลือก · ตารางกลับมาแสดงผู้ป่วยทุกระดับ ESI

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.4
```

### TC-SBH-3181-016 - ตรวจสอบตัวกรอง "โซน" มี 7 โซนและเลือกได้หลายค่า

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-016
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. กดตัวกรอง "โซน" ในแถบตัวกรอง
3. ติ๊ก Urgency แล้วติ๊ก Observation

## Expected Result
ตัวเลือกมี Triage · Resuscitation · Urgency · Isolation 1 · Isolation 2 · Observation · ED Boarding · เลือกได้ทั้ง 2 โซนพร้อมกัน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.1
```

### TC-SBH-3181-017 - แสดงจำนวนผู้ป่วยของแต่ละโซนในตัวกรองตามแท็บที่เลือก

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-017
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. กดตัวกรอง "โซน" ดูตัวเลขข้างแต่ละโซน เทียบกับคอลัมน์โซนในตาราง
3. เปลี่ยนเป็นแท็บ "ผู้ป่วยรอเตียง" (หรือแท็บอื่นที่มีผู้ป่วย) แล้วเปิดตัวกรอง "โซน" อีกครั้ง

## Expected Result
ตัวเลขข้างแต่ละโซนเท่ากับจำนวนผู้ป่วยโซนนั้นในแท็บที่เลือก และเปลี่ยนตามแท็บ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.2
```

### TC-SBH-3181-018 - กรองตารางด้วยโซน Urgency และ Isolation 1

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-018
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. ตัวกรอง "โซน" > ติ๊ก Urgency และ Isolation 1
3. ดูคอลัมน์โซนในตาราง

## Expected Result
ตารางแสดงเฉพาะผู้ป่วยโซน Urgency และ Isolation 1

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.3
```

### TC-SBH-3181-019 - ตรวจสอบตัวนับด้านบนเปลี่ยนตามโซนที่เลือก

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-019
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. จดตัวนับ "ทั้งหมด" และชิป ESI ก่อนกรอง
3. ตัวกรอง "โซน" > ติ๊ก Urgency และ Isolation 1
4. เทียบตัวนับกับแถวในตาราง

## Expected Result
"ทั้งหมด" และชิป ESI เปลี่ยนเป็นจำนวนเฉพาะผู้ป่วยโซน Urgency และ Isolation 1

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.3
```

### TC-SBH-3181-020 - แสดงโซนที่เลือกเป็นชิปใต้แถบตัวกรองและลบทีละอันได้

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-020
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ตัวกรอง "โซน" > ติ๊ก Urgency และ Isolation 1
3. ดูชิปใต้แถบตัวกรอง
4. กด × ที่ชิป Isolation 1

## Expected Result
ใต้แถบตัวกรองมีชิปของ Urgency และ Isolation 1 · กด × แล้วชิป Isolation 1 หาย ตารางเหลือเฉพาะโซน Urgency

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.4
```

### TC-SBH-3181-021 - ล้างตัวกรองทั้งหมดด้วยปุ่ม "ล้าง"

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-021
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ตัวกรอง "โซน" > ติ๊ก Urgency และ Isolation 1
3. กดปุ่ม "ล้าง" ในแถบตัวกรอง

## Expected Result
ชิปตัวกรองหายทั้งหมด · ตารางแสดงผู้ป่วยทั้งหมดของแท็บ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.4
```

### TC-SBH-3181-022 - ตรวจสอบระบบจำตัวกรองโซนล่าสุดเมื่อกลับมาหน้ารายการ

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-022
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ตัวกรอง "โซน" > ติ๊ก Urgency
3. ไปเมนูอื่น (เช่น เปิดหน้าผู้ป่วย) แล้วกลับมา แดชบอร์ด / คิว > มุมมอง "รายการ"

## Expected Result
ตัวกรองโซน Urgency ยังถูกเลือกอยู่ · ตารางกรองเฉพาะโซน Urgency

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 3.5
```

### TC-SBH-3181-023 - แสดงปุ่ม "คอลัมน์" ไอคอนเฟืองที่มุมขวาบนของตาราง

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-023
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูมุมขวาบนของตาราง

## Expected Result
มีปุ่ม "คอลัมน์" พร้อมไอคอนเฟือง ที่มุมขวาบนของตาราง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.1
```

### TC-SBH-3181-024 - ซ่อนและแสดงคอลัมน์ด้วย checkbox ในแผงตั้งค่าคอลัมน์

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-024
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. กดปุ่ม "คอลัมน์"
3. เอาเครื่องหมายออกที่ "เพศ" > ดูตาราง
4. ติ๊ก "เพศ" กลับ > ดูตาราง

## Expected Result
แผงแสดงรายการคอลัมน์ทั้งหมดพร้อม checkbox · เอาเครื่องหมายออกแล้วคอลัมน์ "เพศ" หายจากตาราง · ติ๊กกลับแล้วคอลัมน์ "เพศ" กลับมา

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.2
```

### TC-SBH-3181-025 - เรียงลำดับคอลัมน์ด้วยปุ่มเลื่อนขึ้น / ลงในแผงตั้งค่าคอลัมน์

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-025
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. กดปุ่ม "คอลัมน์"
3. กดปุ่มเลื่อนขึ้นที่ "โซน" 1 ครั้ง > ดูลำดับในแผงและในตาราง
4. กดปุ่มเลื่อนลงที่ "โซน" 1 ครั้ง > ดูลำดับอีกครั้ง

## Expected Result
หลังเลื่อนขึ้น "โซน" อยู่ก่อนคอลัมน์ที่เคยอยู่ด้านบน ทั้งในแผงและในตาราง · เลื่อนลงแล้วกลับลำดับเดิม

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.2
```

### TC-SBH-3181-026 - ตรวจสอบคอลัมน์ คิว ESI และชื่อ-สกุล ซ่อนไม่ได้

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-026
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. กดปุ่ม "คอลัมน์"
3. กด checkbox ของ คิว · ESI · ชื่อ-สกุล

## Expected Result
checkbox ของ คิว · ESI · ชื่อ-สกุล ติ๊กไว้และล็อก กดเปลี่ยนไม่ได้ · ทั้ง 3 คอลัมน์ยังแสดงในตาราง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.3
```

### TC-SBH-3181-027 - คืนค่าคอลัมน์เริ่มต้นด้วยปุ่ม "คืนค่าเริ่มต้น"

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-027
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. กดปุ่ม "คอลัมน์" > เอาเครื่องหมายออกที่ "เพศ" · ติ๊ก "VN" · เลื่อน "โซน" ขึ้น 1 ครั้ง
3. กดปุ่ม "คืนค่าเริ่มต้น"

## Expected Result
ตารางกลับเป็นคอลัมน์เริ่มต้น 13 คอลัมน์ตามลำดับเริ่มต้น (มี "เพศ" · ไม่มี "VN" · "โซน" อยู่ตำแหน่งเดิม)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.4
```

### TC-SBH-3181-028 - ตรวจสอบการตั้งค่าคอลัมน์คงอยู่หลัง Logout และ Login ด้วยผู้ใช้เดิม

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-028
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER A > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. กดปุ่ม "คอลัมน์" > ติ๊ก "Diagnosis" · เอาเครื่องหมายออกที่ "GCS"
3. Logout แล้ว Login ด้วย user พยาบาล ER A อีกครั้ง > แดชบอร์ด / คิว > มุมมอง "รายการ"

## Expected Result
ตารางแสดง "Diagnosis" และไม่แสดง "GCS" ตามที่ตั้งไว้

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.5 · หลังจบกด "คืนค่าเริ่มต้น"
```

### TC-SBH-3181-029 - ตรวจสอบการตั้งค่าคอลัมน์ของผู้ใช้หนึ่งไม่มีผลกับผู้ใช้อื่น

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-029
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER A > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. กดปุ่ม "คอลัมน์" > ติ๊ก "Diagnosis" · เอาเครื่องหมายออกที่ "GCS"
3. Logout > Login ด้วย user B (ยังไม่เคยตั้งค่าคอลัมน์) > แดชบอร์ด / คิว > มุมมอง "รายการ"

## Expected Result
user B เห็นคอลัมน์เริ่มต้น (มี "GCS" · ไม่มี "Diagnosis") ไม่ได้รับการตั้งค่าของ user A

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.5 · หลังจบให้ user A กด "คืนค่าเริ่มต้น"
```

### TC-SBH-3181-030 - ตรวจสอบการตั้งค่าคอลัมน์ใช้กับทุกแท็บสถานะ

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-030
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. กดปุ่ม "คอลัมน์" > ติ๊ก "AN" · เอาเครื่องหมายออกที่ "เพศ"
3. เปลี่ยนไปแท็บ "ผู้ป่วยรอเตียง" · "รอจำหน่าย" · "เสร็จสิ้น"

## Expected Result
ทุกแท็บแสดง "AN" และไม่แสดง "เพศ" ลำดับคอลัมน์เดียวกัน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.5 · หลังจบกด "คืนค่าเริ่มต้น"
```

### TC-SBH-3181-031 - ตรวจสอบรายการคอลัมน์ที่เลือกได้ในแผงตั้งค่าคอลัมน์

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-031
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. กดปุ่ม "คอลัมน์" > ดูรายการคอลัมน์ทั้งหมดในแผง

## Expected Result
มี 19 รายการ: คิว · ESI · HN · AN · VN · ชื่อ-สกุล · อายุ · เพศ · โซน · อาการสำคัญ (CC) · Diagnosis · Trauma/Non-Trauma · MEWS · GCS · Order · ชำระเงิน · สิทธิ · แพทย์ · สถานะ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.6 (Order = 1 คอลัมน์ รวม Lab, ยา, IMG, หัตถการ, Consult)
```

### TC-SBH-3181-032 - ตรวจสอบคอลัมน์ที่แสดงเริ่มต้นของตาราง

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-032
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER ที่ยังไม่เคยตั้งค่าคอลัมน์ (หรือกด "คืนค่าเริ่มต้น" ก่อน) > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูหัวคอลัมน์ของตาราง

## Expected Result
แสดง 13 คอลัมน์: คิว · ESI · HN · ชื่อ-สกุล · อายุ · เพศ · โซน · MEWS · GCS · Order · ชำระเงิน · แพทย์ · สถานะ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 4.7
```

### TC-SBH-3181-033 - แสดงอายุเป็นจำนวนปีอย่างเดียวในคอลัมน์อายุ

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-033
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูคอลัมน์อายุของผู้ป่วยอายุ ≥ 1 ปีที่มีเดือนและวันเกิน (เช่น 45 ปี 3 เดือน 10 วัน)

## Expected Result
แสดง "45 ปี" · ไม่มีเดือนและวัน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.1
```

### TC-SBH-3181-034 - ตรวจสอบคอลัมน์อายุไม่แสดงตัวยึดตำแหน่ง "x เดือน x วัน"

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-034
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ไล่ดูคอลัมน์อายุทุกแถวในทุกแท็บสถานะที่มีผู้ป่วย

## Expected Result
ไม่มีแถวใดแสดง "x เดือน x วัน"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.3
```

### TC-SBH-3181-035 - ตรวจสอบตารางไม่มีคอลัมน์ "เวลารอ" และ "เวลารับเข้า"

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-035
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูหัวคอลัมน์ของตาราง
3. กดปุ่ม "คอลัมน์" ดูรายการคอลัมน์ในแผง

## Expected Result
ไม่มีคอลัมน์ "เวลารอ" และ "เวลารับเข้า" ทั้งในตารางและในแผงตั้งค่าคอลัมน์

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.1
```

### TC-SBH-3181-036 - ตรวจสอบแถบตัวกรองหลักไม่มีตัวกรอง "เวลาเริ่ม → ถึง"

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-036
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูแถบตัวกรองหลัก

## Expected Result
ไม่มีช่องตัวกรอง "เวลาเริ่ม → ถึง" ในแถบตัวกรองหลัก

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.2
```

### TC-SBH-3181-037 - ตรวจสอบปุ่ม "ตัวกรองเพิ่มเติม" มีตัวกรองวันที่และเวลา

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-037
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. กดปุ่ม "ตัวกรองเพิ่มเติม"

## Expected Result
มีตัวกรองวันที่และตัวกรองเวลา (เวลาเริ่ม → ถึง)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 6.2 · 7.8
```

### TC-SBH-3181-038 - ตรวจสอบคอลัมน์เริ่มต้นแสดงครบที่ความกว้าง 1366 px โดยไม่ต้องเลื่อนแนวนอน

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-038
Case Type: Happy
Test Type: UIUX

## Test Step
1. ตั้งหน้าต่างเบราว์เซอร์กว้าง 1366 px (zoom 100%)
2. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" (คอลัมน์เริ่มต้น)
3. ดูตารางตั้งแต่คอลัมน์ "คิว" ถึง "สถานะ"

## Expected Result
เห็นครบ 13 คอลัมน์ · ตารางไม่มีแถบเลื่อนแนวนอน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.1
```

### TC-SBH-3181-039 - ตรวจสอบหัวตารางค้างอยู่ด้านบนเมื่อเลื่อนตารางลง

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-039
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" (แท็บที่มีผู้ป่วยมากพอให้เลื่อนได้)
2. เลื่อนตารางลงจนสุด

## Expected Result
หัวตารางยังค้างอยู่ด้านบนตลอดการเลื่อน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.2
```

### TC-SBH-3181-040 - ตรวจสอบคอลัมน์ คิว ESI และชื่อ-สกุล ค้างทางซ้ายเมื่อเลื่อนแนวนอน

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-040
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. กดปุ่ม "คอลัมน์" > ติ๊กคอลัมน์เพิ่มจนตารางกว้างกว่าจอ (เช่น AN · VN · อาการสำคัญ (CC) · Diagnosis)
3. เลื่อนตารางไปทางขวาจนสุด

## Expected Result
คอลัมน์ คิว · ESI · ชื่อ-สกุล ค้างอยู่ทางซ้าย · คอลัมน์อื่นเลื่อนผ่าน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.2 · หลังจบกด "คืนค่าเริ่มต้น"
```

### TC-SBH-3181-041 - แสดงคอลัมน์ Order เป็นชิป 5 ชนิดพร้อมตัวอักษรกำกับ

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-041
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูคอลัมน์ "Order"

## Expected Result
ทุกแถวมีชิป Lab · ยา · IMG · หัตถการ · Consult ในคอลัมน์เดียว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.3
```

### TC-SBH-3181-042 - แสดงคำอธิบายสีชิป Order (legend) ใต้ตาราง

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-042
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูใต้ตาราง

## Expected Result
มี legend บอกความหมายสีชิป Order: ไม่มีรายการ · รอดำเนินการ · เสร็จแล้ว · ผลผิดปกติ / ด่วน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.3
```

### TC-SBH-3181-043 - แสดงชิป Order เป็นเส้นขอบเทาเมื่อไม่มีรายการ

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-043
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูชิป IMG ของผู้ป่วยที่ไม่มี order IMG

## Expected Result
ชิป IMG แสดงเป็นเส้นขอบเทา ตรงกับ legend "ไม่มีรายการ"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.4
```

### TC-SBH-3181-044 - แสดงชิป Order สีส้มเมื่อรายการรอดำเนินการ

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-044
Case Type: Happy
Test Type: UIUX

## Test Step
1. แพทย์สั่ง Lab ให้ผู้ป่วย ER (ยังไม่ส่งตรวจ / ยังไม่มีผล)
2. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
3. ดูชิป Lab ของผู้ป่วยรายนั้น

## Expected Result
ชิป Lab เป็นสีส้ม ตรงกับ legend "รอดำเนินการ"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.4
```

### TC-SBH-3181-045 - แสดงชิป Order สีเขียวเมื่อรายการเสร็จแล้ว

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-045
Case Type: Happy
Test Type: UIUX

## Test Step
1. ผู้ป่วย ER ที่มี order ยาที่ให้ยาครบแล้ว (หรือ Lab ที่ผลออกปกติแล้ว)
2. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
3. ดูชิปของ order นั้น

## Expected Result
ชิปเป็นสีเขียว ตรงกับ legend "เสร็จแล้ว"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.4
```

### TC-SBH-3181-046 - แสดงชิป Order สีแดงเมื่อผลผิดปกติหรือด่วน

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-046
Case Type: Happy
Test Type: UIUX

## Test Step
1. ผู้ป่วย ER ที่มีผล Lab ผิดปกติ
2. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
3. ดูชิป Lab ของผู้ป่วยรายนั้น

## Expected Result
ชิป Lab เป็นสีแดง ตรงกับ legend "ผลผิดปกติ / ด่วน"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.4
```

### TC-SBH-3181-047 - แสดง tooltip ชื่อ order และสถานะเมื่อ Hover ชิป Order

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-047
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. เลื่อนเมาส์ไปวางบนชิป Lab ของผู้ป่วยที่มี Lab รอดำเนินการ

## Expected Result
tooltip แสดงชื่อ order และสถานะ (รอดำเนินการ) ตรงกับสีชิป

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.5
```

### TC-SBH-3181-048 - เปิดรายละเอียด order ด้วยการคลิกชิป Order

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-048
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. คลิกชิป Lab ของผู้ป่วยที่มี Lab

## Expected Result
เปิดรายละเอียด order Lab ของผู้ป่วยรายนั้น แบบเดียวกับก่อนปรับหน้า

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.5
```

### TC-SBH-3181-049 - แสดงคะแนน MEWS พร้อมสีความเสี่ยงแบบเดียวกับบอร์ด

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-049
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว (มุมมอง "บอร์ด") > ดู MEWS บนการ์ดผู้ป่วย 3 รายที่ความเสี่ยงต่างกัน
2. สลับเป็นมุมมอง "รายการ" > ดูคอลัมน์ MEWS ของผู้ป่วย 3 รายเดียวกัน

## Expected Result
คอลัมน์ MEWS แสดงคะแนนพร้อมสีความเสี่ยง · คะแนนและสีตรงกับการ์ดบนบอร์ดทั้ง 3 ราย

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.6
```

### TC-SBH-3181-050 - ค้นหาผู้ป่วยด้วย HN ในช่อง "ค้นหา HN หรือชื่อ"

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-050
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. ดูช่องค้นหาในแถบตัวกรอง
3. พิมพ์ HN ของผู้ป่วยในตาราง

## Expected Result
มีช่องค้นหาช่องเดียว ข้อความ "ค้นหา HN หรือชื่อ" · ตารางเหลือผู้ป่วย HN นั้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.7
```

### TC-SBH-3181-051 - ค้นหาผู้ป่วยด้วยชื่อในช่อง "ค้นหา HN หรือชื่อ"

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-051
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. พิมพ์ชื่อของผู้ป่วยในตารางในช่อง "ค้นหา HN หรือชื่อ"

## Expected Result
ตารางเหลือเฉพาะผู้ป่วยที่ชื่อตรงกับคำค้น

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.7
```

### TC-SBH-3181-052 - ตรวจสอบแถบตัวกรองหลักมีเฉพาะ ค้นหา โซน แพทย์ และตัวกรองเพิ่มเติม

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-052
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูแถบตัวกรองหลัก

## Expected Result
แถบตัวกรองหลักมีแค่ ช่องค้นหา · โซน · แพทย์ · ปุ่ม "ตัวกรองเพิ่มเติม" (วันที่, เวลา) · ไม่มีตัวกรอง ESI ในแถบหลัก (ESI กรองผ่านชิปตัวนับ)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.8 (ปุ่ม "ล้าง" ใน Prototype อยู่ท้ายแถบเดียวกัน)
```

### TC-SBH-3181-053 - ตรวจสอบการเรียงลำดับเริ่มต้นตาม ESI แล้วตามคิว

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-053
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. ดูลำดับแถวโดยไม่กดเรียงคอลัมน์ใด

## Expected Result
แถวเรียง ESI 1 → 5 · ผู้ป่วย ESI เดียวกันเรียงตามเลขคิว

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.9
```

### TC-SBH-3181-054 - เรียงตารางด้วยการคลิกหัวคอลัมน์ ESI

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-054
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. คลิกหัวคอลัมน์ "ESI"
3. คลิกหัวคอลัมน์ "ESI" ซ้ำ

## Expected Result
ตารางเรียงตาม ESI และสลับทิศ (น้อย → มาก / มาก → น้อย) เมื่อคลิกซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.9
```

### TC-SBH-3181-055 - เรียงตารางด้วยการคลิกหัวคอลัมน์ชื่อ-สกุล

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-055
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. คลิกหัวคอลัมน์ "ชื่อ-สกุล"
3. คลิกหัวคอลัมน์ "ชื่อ-สกุล" ซ้ำ

## Expected Result
ตารางเรียงตามชื่อ-สกุล และสลับทิศเมื่อคลิกซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.9
```

### TC-SBH-3181-056 - เรียงตารางด้วยการคลิกหัวคอลัมน์อายุ

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-056
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER" (มีผู้ป่วยอายุต่ำกว่า 1 ปีอย่างน้อย 1 ราย)
2. คลิกหัวคอลัมน์ "อายุ"
3. คลิกหัวคอลัมน์ "อายุ" ซ้ำ

## Expected Result
ตารางเรียงตามอายุ (ผู้ป่วยที่แสดงเป็นเดือนอยู่น้อยกว่า "1 ปี") และสลับทิศเมื่อคลิกซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.9
```

### TC-SBH-3181-057 - เรียงตารางด้วยการคลิกหัวคอลัมน์ MEWS

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-057
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. คลิกหัวคอลัมน์ "MEWS"
3. คลิกหัวคอลัมน์ "MEWS" ซ้ำ

## Expected Result
ตารางเรียงตามคะแนน MEWS และสลับทิศเมื่อคลิกซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.9
```

### TC-SBH-3181-058 - เรียงตารางด้วยการคลิกหัวคอลัมน์โซน

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-058
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. คลิกหัวคอลัมน์ "โซน"
3. คลิกหัวคอลัมน์ "โซน" ซ้ำ

## Expected Result
ผู้ป่วยโซนเดียวกันอยู่ติดกันตามลำดับโซน และสลับทิศเมื่อคลิกซ้ำ

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.9 · การ์ดไม่ระบุว่าเรียงโซนตามตัวอักษรหรือตามลำดับโซน (ดู gap) — Prototype เรียงตามลำดับ Triage → ED Boarding
```

### TC-SBH-3181-059 - เปิดหน้าผู้ป่วยด้วยการคลิกที่แถวในตาราง

Status: Not Run · Priority: High · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-059
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. คลิกที่เซลล์ "อายุ" ของแถวผู้ป่วย (ไม่คลิกที่ชื่อ)
3. ดู HN / VN บนหน้าที่เปิด

## Expected Result
เปิดหน้าผู้ป่วยรายนั้นที่ encounter ER ปัจจุบัน (HN / VN ตรงกับแถวที่คลิก)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.10
```

### TC-SBH-3181-060 - แสดงตัวเลขของแท็บสถานะที่มี 0 รายเป็นสีเทา

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-060
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ดูตัวเลขบนแท็บสถานะที่มี 0 ราย และแท็บที่มีผู้ป่วย

## Expected Result
แท็บที่มี 0 ราย ตัวเลขสีเทา · แท็บที่มีผู้ป่วย ตัวเลขเด่น (ต่างจากสีเทา)

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.11
```

### TC-SBH-3181-061 - แสดงข้อความ "ไม่มีผู้ป่วยในโซนที่เลือก" เมื่อเลือกโซนที่ไม่มีผู้ป่วย

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-061
Case Type: Happy
Test Type: UIUX

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ตัวกรอง "โซน" > ติ๊กโซนที่ตัวเลขเป็น 0 ในแท็บที่เลือก

## Expected Result
ตารางว่างแสดงข้อความ "ไม่มีผู้ป่วยในโซนที่เลือก" พร้อมปุ่ม "ล้างตัวกรอง"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.12
```

### TC-SBH-3181-062 - ล้างตัวกรองด้วยปุ่ม "ล้างตัวกรอง" ในตารางว่าง

Status: Not Run · Priority: Medium · Labels: … + QA Case : Happy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-062
Case Type: Happy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. ตัวกรอง "โซน" > ติ๊กโซนที่ไม่มีผู้ป่วย (ตารางว่าง)
3. กดปุ่ม "ล้างตัวกรอง" ในตาราง

## Expected Result
ตัวกรองโซนถูกล้าง · ตารางแสดงผู้ป่วยทั้งหมดของแท็บอีกครั้ง

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.12
```

---

## TS-SBH-3181-UHP - ค้นหาไม่พบผู้ป่วยใน ER Patient List

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Unhappy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3181-UHP
- Case Type: Unhappy
- Suffix: UHP
- Module: ER — แดชบอร์ด / คิว (มุมมอง "รายการ")
- Requirement ที่อ้างอิง: SBH-3181 — [ER][Dashboard][Patientlist ] ปรับปรุงเงื่อนไขการแสดงผล

วัตถุประสงค์
- ยืนยันว่าเมื่อค้นหาไม่พบ ตารางว่างแสดงข้อความตามบริบทและมีทางล้างตัวกรอง

ขอบเขต Requirement
- AC 7.7 ช่องค้นหา HN หรือชื่อ
- AC 7.12 ตารางว่างแสดงข้อความตามบริบท + ปุ่ม "ล้างตัวกรอง"

ความเสี่ยง
- ตารางว่างแสดงข้อความผิดบริบท ทำให้เข้าใจว่าไม่มีผู้ป่วยใน ER

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### TC-SBH-3181-063 - ค้นหาด้วย HN ที่ไม่มีในแท็บที่เลือก

Status: Not Run · Priority: Medium · Labels: … + QA Case : Unhappy + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-063
Case Type: Unhappy
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ" > แท็บ "ผู้ป่วยปัจจุบันใน ER"
2. พิมพ์ HN ที่ไม่มีในแท็บนี้ (เช่น HN ผู้ป่วยที่ไม่มี Visit ER) ในช่อง "ค้นหา HN หรือชื่อ"

## Expected Result
ตารางว่าง แสดงข้อความตามบริบทของการค้นหา (ไม่ใช่ "ไม่มีผู้ป่วยในโซนที่เลือก") พร้อมปุ่ม "ล้างตัวกรอง"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 7.7 · 7.12 · Prototype ใช้ข้อความ "ไม่มีผู้ป่วยตรงกับตัวกรอง" (การ์ดไม่ระบุข้อความ — ดู gap)
```

---

## TS-SBH-3181-EDG - ค่าขอบของตัวนับและอายุใน ER Patient List

Status: Ready for Testing · Labels: requirement labels + Suchart ( Jame ) 🥷 + QA Module : ER + QA Sub-module / Feature : Queue + QA Case : Edge

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-3181-EDG
- Case Type: Edge
- Suffix: EDG
- Module: ER — แดชบอร์ด / คิว (มุมมอง "รายการ")
- Requirement ที่อ้างอิง: SBH-3181 — [ER][Dashboard][Patientlist ] ปรับปรุงเงื่อนไขการแสดงผล

วัตถุประสงค์
- ยืนยันตัวนับในแท็บที่ไม่มีผู้ป่วย และการแสดงอายุที่ขอบ 1 ปี

ขอบเขต Requirement
- AC 2.1 แท็บที่มี 0 ราย ต้องแสดง "ทั้งหมด 0"
- AC 5.1 · 5.2 อายุเป็นปี / ต่ำกว่า 1 ปีเป็นเดือน

ความเสี่ยง
- ตัวนับค้างค่าของแท็บก่อนหน้า
- อายุเด็กเล็กแสดงผิด (0 ปี / 12 เดือน) ทำให้ประเมินขนาดยาผิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- ต้องสร้างผู้ป่วย AUTO อายุ 11 เดือน และอายุ 1 ปีพอดี (วันเกิด = วันนี้ปีก่อน) · ห้ามรันคร่อมเที่ยงคืน
```

### TC-SBH-3181-064 - แสดงตัวนับ "ทั้งหมด 0" ในแท็บสถานะที่ไม่มีผู้ป่วย

Status: Not Run · Priority: Medium · Labels: … + QA Case : Edge + QA Type : Functional + QA : Manual

```
TC ID: TC-SBH-3181-064
Case Type: Edge
Test Type: Functional

## Test Step
1. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
2. เลือกแท็บสถานะที่ตัวเลขบนแท็บเป็น 0
3. ดูตัวนับด้านบน

## Expected Result
แสดง "ทั้งหมด 0" · ชิป ESI ทุกอันเป็น 0

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 2.1
```

### TC-SBH-3181-065 - แสดงอายุเป็นเดือนเมื่อผู้ป่วยอายุต่ำกว่า 1 ปี

Status: Not Run · Priority: High · Labels: … + QA Case : Edge + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-065
Case Type: Edge
Test Type: UIUX
เทคนิค: BVA — ค่าต่ำกว่าขอบ 1 ปี

## Test Step
1. ผู้ป่วย ER อายุ 11 เดือน (วันเกิด = 11 เดือนก่อนวันนี้)
2. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
3. ดูคอลัมน์อายุของผู้ป่วยรายนั้น

## Expected Result
แสดง "11 เดือน" · ไม่แสดง "0 ปี" และไม่มีวัน

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.2 (ตัวอย่างในการ์ด "8 เดือน")
```

### TC-SBH-3181-066 - แสดงอายุ "1 ปี" เมื่อผู้ป่วยอายุครบ 1 ปีพอดี

Status: Not Run · Priority: Medium · Labels: … + QA Case : Edge + QA Type : UIUX + QA : Manual

```
TC ID: TC-SBH-3181-066
Case Type: Edge
Test Type: UIUX
เทคนิค: BVA — ขอบ 1 ปี

## Test Step
1. ผู้ป่วย ER อายุ 1 ปีพอดี (วันเกิด = วันนี้ของปีก่อน)
2. Login ระบบด้วย user พยาบาล ER > แดชบอร์ด / คิว > มุมมอง "รายการ"
3. ดูคอลัมน์อายุของผู้ป่วยรายนั้น

## Expected Result
แสดง "1 ปี" · ไม่แสดง "12 เดือน"

## Test Result : (Env: Dev-X) (Status)

## Test Result : (Env: SBH Prod) (Status)

หมายเหตุ: AC 5.1 · 5.2
```

---

## Requirement gap (การ์ดไม่ตอบ — ไม่สร้าง TC)

**Expected behavior**
- อายุต่ำกว่า 1 เดือน แสดงอย่างไร ("0 เดือน" / เป็นวัน)
- ผู้ป่วยที่ยังไม่คัดกรอง (ไม่มี ESI) แสดงป้าย ESI / นับในชิปไหน / อยู่ลำดับไหนเมื่อเรียงเริ่มต้น
- เกณฑ์สี MEWS อ้าง "แบบเดียวกับบอร์ด" ไม่มีช่วงคะแนน (Prototype: 0–2 ต่ำ · 3–4 ปานกลาง · ≥ 5 สูง) — TC-049 เทียบกับบอร์ดแทน
- ชิป Order "ผลผิดปกติหรือด่วน": "ด่วน" นับจากอะไร (order STAT?) · order หลายรายการในชนิดเดียวสถานะต่างกัน ชิปใช้สีไหน
- เรียงคอลัมน์ "โซน" ตามตัวอักษรหรือตามลำดับโซน · คอลัมน์อื่นนอก 5 คอลัมน์คลิกเรียงได้ไหม
- ตัวเลขบนแท็บสถานะเปลี่ยนตามตัวกรองไหม (Prototype เปลี่ยน)
- ตัวกรองโซน / ชิป ESI คงอยู่เมื่อสลับแท็บสถานะไหม
- ข้อความตารางว่างกรณีอื่น (ค้นหาไม่พบ · แท็บไม่มีผู้ป่วย) — การ์ดยกตัวอย่างแค่ข้อความโซน
- ค่าเริ่มต้นของตัวกรองวันที่ / เวลาใน "ตัวกรองเพิ่มเติม"
- ชิป ESI เลือกได้หลายระดับพร้อมกันไหม (Prototype เลือกได้หลายอัน)

**Validation**
- ช่องค้นหา: ค้นด้วย HN บางส่วน / ชื่อบางส่วน / นามสกุล ได้ไหม

**Permission / role**
- หน้าใช้ได้กับ role ไหน (พยาบาล / แพทย์ / เวชระเบียน) · "บันทึกต่อผู้ใช้" เก็บที่ server หรือเบราว์เซอร์ (เปลี่ยนเครื่องแล้วยังอยู่ไหม — Prototype เก็บในเบราว์เซอร์)
- "ระบบจำตัวกรองโซนล่าสุด" จำหลัง Logout / เปลี่ยนเครื่องไหม

**Edge cases**
- 1366 px วัดตอนแถบเมนูซ้ายกางหรือหุบ
- AC 1.4 ให้เลือกได้ 2 แบบ (แยก Isolation 1 / 2 หรือ "Isolation" + เลขห้อง) — TC-004 ยอมรับทั้ง 2 แบบ
