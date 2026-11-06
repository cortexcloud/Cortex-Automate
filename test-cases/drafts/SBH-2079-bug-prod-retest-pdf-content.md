# ร่างการ์ดบั๊ก (แบบ 2 · Sub-Issue ใต้ SBH-2079) — รอผู้ใช้ตรวจก่อนสร้าง

- ชื่อ: `[Bug][ER][ER Discharge Summary] - เอกสารแสดงข้อมูลไม่ครบ / ไม่ตรง: ชื่อโรงพยาบาลอังกฤษ · Pain · Physical examination · ICD-10 สาเหตุการเสียชีวิต · วินิจฉัยโดยแพทย์`
- Template: Bug Template (SBH) · parent SBH-2079 · Project `[SBH] ER` · Priority High · สถานะ Waiting for Fixing Bugs
- Labels: 🐞 BUG · VERSION 2.10.0 · Natthaphat ( MOD ) 🙈 · Assignee: Suchat Chancherngsilapakul
- สร้างด้วย connector บัญชี Nawin (Win) (แบบเดียวกับ SBH-3917)
- ภาพ `BUG-*.png` = ภาพใหม่ (ตัดส่วน PDF + กรอบเส้นประ / ป้าย Actual) อัปโหลดด้วย prepare_file_upload ตอนสร้าง · ภาพ / คลิปอื่นใช้ assetUrl เดิมของ TC

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** SBH Prod
* **User Account:** User1

### **2. Description**

1. หัวกระดาษเอกสารไม่มีชื่อภาษาอังกฤษของโรงพยาบาล และที่อยู่เป็นแบบย่อ

* **Expected Result:** หัวกระดาษแสดง "โรงพยาบาลสระบุรี" / "Saraburi Hospital" / "18 ถนนเทศบาล 4 ตำบลปากเพรียว อำเภอเมืองสระบุรี จังหวัดสระบุรี 18000" / "โทร. 036-343500"
* **Actual Result:** บรรทัดชื่ออังกฤษแสดง "โรงพยาบาลสระบุรี" ซ้ำ และที่อยู่แสดงแบบย่อ "18 ถ.เทศบาล 4 ปากเพรียว เมือง สระบุรี 18000" (ตรา และ โทร. ถูกต้อง)

{{BUG-008-header.png}}

2. Vital signs ในส่วน ER Physician Note ไม่แสดงค่า Pain

* **Expected Result:** Vital signs แสดงค่ารายการล่าสุดของ ER Physician Note ครบทุกช่อง รวม Pain
* **Actual Result:** BP / PR / RR / BT / SpO₂ ของรายการล่าสุดตรง แต่ช่อง Pain แสดง "-" ทั้งที่บันทึก Pain score = 4

{{BUG-020-pain.png}}

3. Physical examination ไม่แสดงผลการตรวจที่บันทึก

* **Expected Result:** แสดงสรุปผลการตรวจ และผลรายระบบครบ 7 ระบบตามที่บันทึกใน ER Physician Note
* **Actual Result:** บันทึกสรุปผลการตรวจ + 7 ระบบแล้ว (ประวัติการรักษา › ER Summary แสดงครบ) แต่เอกสารแสดง "สรุปผลการตรวจ: -" และไม่มีรายการระบบ

ข้อมูลที่บันทึกใน ER Physician Note

{{TC025-1.png}}

บนเอกสาร

{{BUG-025-pe.png}}

4. สาเหตุการเสียชีวิตไม่แสดงรหัส ICD-10 ที่เลือก

* **Expected Result:** สาเหตุการเสียชีวิตแสดงครบตามที่บันทึก (ข้อความ + สาเหตุ ICD-10)
* **Actual Result:** แสดงเฉพาะข้อความ "หัวใจหยุดเต้นเฉียบพลัน ทดสอบ SBH-2079" ไม่มี "I469 Cardiac arrest, unspecified" ที่เลือกในส่วนสาเหตุการเสียชีวิต (ICD-10)

ข้อมูลที่กรอกในฟอร์ม Disposition

{{TC037-1.png}}

บนเอกสาร

{{BUG-037-cause.png}}

5. ข้อมูล Visit ไม่แสดงวินิจฉัยโดยแพทย์

* **Expected Result:** "วินิจฉัยโดยแพทย์" แสดงค่าเดียวกับส่วนข้อมูล Visit ของฟอร์ม Disposition
* **Actual Result:** ฟอร์ม Disposition แสดง "K30 - Functional dyspepsia" แต่เอกสารแสดง "วินิจฉัยโดยแพทย์: -"

{{BUG-038-dx.png}}

### **3. Technical Details**

* ทดสอบ 6/11/2569 20:38–20:58 บน SBH Prod ด้วย Playwright (ไฟล์แอป index-B30_rCX7.js) · เอกสารจาก `POST /cortex-api/er/encounters/<EN>/discharge-summary/pdf?intent=view|print` (200 application/pdf)
* ข้อ 1, 2, 3, 5: ผู้ป่วย AUTO HN 6904772 · E6911065518 (ลงนาม Disposition 06/11/2569 20:38) · `TC-SBH-2079-008` (SBH-3639) · `TC-SBH-2079-020` (SBH-3662) · `TC-SBH-2079-025` (SBH-3672) · `TC-SBH-2079-038` (SBH-3698)
* ข้อ 2: Vital signs รายการที่ 2 ใน ER Physician Note บันทึก BP 132/86 · PR 88 · RR 20 · BT 37.5 · SpO₂ 97 · Pain score 4 — ค่าอื่นขึ้นในเอกสารครบ ขาดเฉพาะ Pain
* ข้อ 3: ประวัติการรักษา › ER Summary แสดง Physical Examination (PE) "ตรวจร่างกายปกติ ยกเว้นปอดขวาส่วนล่าง (SBH-2079 A)" + HEENT / Lung (Abnormal · crepitation Rt lower lung) / Abdomen / Perineum / Back / Neuro / Extremities — ข้อมูลต้นทางบันทึกแล้ว
* ข้อ 4: ผู้ป่วย AUTO HN 6904779 · E6911065531 · Disposition สถานะ Dead · วิธี เสียชีวิต · ช่อง "* สาเหตุการเสียชีวิต" + สาเหตุ ICD-10 I469 · `TC-SBH-2079-037` (SBH-3696)
* คลิป: {{TC008-clip.webm}} · {{TC020-clip.webm}} · {{TC025-clip.webm}} · {{TC037-clip.webm}} · {{TC038-clip.webm}}

---

## ไม่ใส่ในการ์ดนี้ (ดูแลแยก)

* วิธีการจำหน่ายไม่ตรง 10 ข้อตาม AC (`TC-SBH-2079-036`) — อยู่ใน SBH-3885 ข้อ 4 แล้ว
* บันทึกโรคประจำตัวใน ER Physician Note บน Prod ได้ 400 (`TC-SBH-2079-019` / 059) — เป็นปัญหาฟอร์มต้นทาง session SBH-3182 เจอเหมือนกัน
* Body chart ไม่มีรายการตำแหน่ง (`TC-SBH-2079-026`) — ยังไม่แน่ใจว่าเป็นบั๊ก
* ข้อสังเกต: เวชภัณฑ์แสดงเป็นรหัส "MSP0000004 / -" · คอลัมน์จำนวน "7 1" · ประเภท Dx others ↔ comorbidity
