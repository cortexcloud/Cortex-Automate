# ร่างการ์ดบั๊ก SBH-3182 (Sub-Issue การ์ดเดียว)

> สถานะ: **สร้างแล้ว SBH-3842 (3 พ.ย. 2026)** · ผู้ใช้สั่ง 3 พ.ย. 2026 "ข้อ 7 ไม่ถือเป็นบัค สร้างเป็น Sub-issue รวมเป็นการ์ดเดียว ข้อ 8 ฝาก Reproduce อีกที"
> - ไม่รวม: TC-023 (นัดหมาย) · TC-036 (คำ Compression) · TC-037 (ชื่อตำแหน่ง Body chart) — ผู้ใช้บอกไม่ถือเป็นบัค
> - ตั้งค่าแบบ SBH-3837: parent SBH-3182 · project [SBH] ER · milestone ว่าง · Priority High · สถานะ Waiting for Fixing Bugs ·
>   labels 🐞 BUG / VERSION 2.10.0 / Natthaphat ( MOD ) 🙈 · Assignee Suchat
> - ภาพข้อ 1–6 ใช้ assetUrl ที่อัปโหลดให้ TC แล้ว (clips/SBH-3182 dev-x 2026-11-02/upload/assets.tsv) · ข้อ 7 ภาพจากรอบ reproduce

**Title:** `[Bug][ER][ER Summary] - Vital signs ไม่รวมการคัดกรองซ้ำ · ประเภท Order ยา "-" · สถานะ Consult · Primary Survey ไม่มีกลุ่ม D · Trauma Fast Track บันทึกไม่ได้ · ไม่มีคอลัมน์ Pain · ผู้ป่วย Admit ไม่มีเวลาออกจาก ER`

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** Dev-X
* **User Account:** user1 (แพทย์ ทดสอบ มานะ)

### **2. Description**

1. ตาราง Vital signs ไม่แสดงค่าจากการคัดกรองซ้ำ

* **Expected Result:** แสดง Vital signs ทุกครั้ง (คัดกรองครั้งแรก + คัดกรองซ้ำ) เรียงตามเวลา · แถวแรก "แรกรับ" แถวสุดท้าย "ล่าสุด"
* **Actual Result:** คัดกรอง 14:45 → คัดกรองซ้ำบน Overview 14:47 → 14:49 (บันทึกสำเร็จ) → ER Summary มีแถวเดียว "14:45 แรกรับ" ไม่มีแถว "ล่าสุด"

[ภาพ TC009-1-result.png]

2. ประเภท Order ของรายการยาแสดง "-"

* **Expected Result:** คอลัมน์ประเภท Order ของยาแสดง One day / Continue ตามที่สั่ง
* **Actual Result:** สั่งยา One Day Order 3 รายการ → ER Summary คอลัมน์ประเภท Order ของยาเป็น "-" (Lab / Imaging / หัตถการ = One day)

[ภาพ TC011-1-result.png]

3. สถานะ Consult ที่ตอบแล้วแสดง "เสร็จสิ้น"

* **Expected Result:** สถานะ "ตอบรับแล้ว"
* **Actual Result:** ขอ Consult 14:54 → แพทย์ตอบ 14:54 → ER Summary สถานะ "เสร็จสิ้น"

[ภาพ TC017-1-result.png]

4. Primary Survey ไม่แสดงกลุ่ม D (Disability)

* **Expected Result:** แสดง A · B · C · D · E ตรงกับที่บันทึกใน ER Trauma Exam
* **Actual Result:** บันทึก Primary Survey + กลุ่ม D (รูม่านตา 3 mm RTL · DTX 110) → ER Summary แสดง A · B · C · E ไม่มีกลุ่ม D · ค่าที่เลือกภาษาไทยแสดงเป็นอังกฤษ (≤ 2 วินาที → "2 seconds or less")

[ภาพ TC033-1-result.png]

5. ฟอร์มคัดกรอง ER เลือก Suspect Fast Track Type "Trauma Fast Track" แล้วบันทึกไม่ได้

* **Expected Result:** บันทึกคัดกรองได้ · ER Summary ประเภทฉุกเฉินแสดง "Trauma · Trauma Fast Track"
* **Actual Result:** คัดกรอง Trauma + สัญญาณชีพครบ → เลือก Trauma Fast Track → บันทึก → "บันทึกไม่สำเร็จ: ข้อมูลบางรายการไม่ผ่านการตรวจสอบ" (422) · ไม่เลือก Fast Track บันทึกได้ → ER Summary แสดง "Trauma" อย่างเดียว

[ภาพ TC027-1-emergency-type.png · TC027-2-result.png]

6. ตาราง Vital signs ไม่มีคอลัมน์ Pain

* **Expected Result:** คอลัมน์ เวลา · BP · PR · RR · BT · SpO₂ · Pain
* **Actual Result:** มีคอลัมน์ถึง SpO₂ ไม่มี Pain

[ภาพ TC008-1-result.png]

7. ผู้ป่วย Admit ไม่มีเวลาออกจาก ER — "ออกจาก ER" แสดง "ไม่ทราบเวลา" · "เวลาใน ER" แสดง "-"

* **Expected Result:** ผู้ป่วยที่ Admit แล้ว "ออกจาก ER" แสดงเวลาที่ออกจาก ER (dd/MM/yyyy HH:mm) · "เวลาใน ER" แสดงระยะเวลาจากมาถึงถึงเวลานั้น
* **Actual Result:** คัดกรอง → Admit ได้ AN 6903043 → ลงนาม Disposition รับไว้รักษาต่อIPD → ER Summary "ออกจาก ER" = "ยังอยู่ใน ER" · "เวลาใน ER" = "10 นาที (ถึงตอนนี้)" → ปิด Visit ที่การเงิน → ER Summary "ออกจาก ER" = "ไม่ทราบเวลา" · "เวลาใน ER" = "-"

[ภาพ 02 Visit ยังเปิด · ภาพ 03 Actual หลังปิด Visit · คลิป BUG-LOS-clip.webm (ลงนาม → ER Summary Visit เปิด → การเงินปิด Visit → ER Summary หลังปิด) — clips/SBH-3182 dev-x 2026-11-02/BUG-LOS 2026-11-03/]

### **3. Technical Details**

* ทดสอบ 02–03/11/2569 · dev-x · ผลเต็มอยู่ใน TC ของ SBH-3182: ข้อ 1 SBH-3482 / SBH-3483 · ข้อ 2 SBH-3484 · ข้อ 3 SBH-3490 · ข้อ 4 SBH-3507 · ข้อ 5 SBH-3500 · ข้อ 6 SBH-3481
* ข้อ 1: พบเหมือนกันกับผู้ป่วยที่คัดกรองซ้ำ 1 ครั้ง (HN 6932472)
* ข้อ 2: comment dev (29 ต.ค.) ข้อ 11 บอกว่ายาจะแสดง One day ทั้งหมด แต่จริงแสดง "-" · ER มีแต่เมนู One Day Order
* ข้อ 5: `POST …/clinical-form-groups/<id>/saves` → 422 `VALIDATION_FAILED` · ลอง 3 ผู้ป่วย (02/11/2569)
* ข้อ 6: comment dev ข้อ 2 (ER preset ยังไม่มี pain score)
* ข้อ 7: reproduce 03/11/2569 ผู้ป่วย AUTO HN 6932592 · E69110333257 · AN 6903043 (พบครั้งแรกที่ HN 6932488 · E69110233095 · AN 6903039)
  * หลังได้ AN: API บอร์ด `GET /cortex-api/er/dashboard/encounters` → `patientStatus: bed_waiting` · `admitRequestStatus: admitted` · `canDischargeFromEr: false` · `departedAt: null` → ผู้ป่วย Admit ไม่มีปุ่ม "จำหน่าย" ในหน้ารายการผู้ป่วย ER จึงไม่มีจังหวะบันทึกเวลาออกจาก ER
  * หลังปิด Visit: `GET /cortex-api/er/encounters/<EN>/summary` → `departedAt: null` · `visitClosed: true` → หน้าจอใช้คำ `erSummary.treatment.departedUnknown` ("ไม่ทราบเวลา") และเวลาใน ER = "-" · ผู้ป่วยยังค้าง `bed_waiting`
  * ตรวจแล้ว 3 ราย ผลเหมือนกัน: E69110233089 (AN 6903038) · E69110233095 (AN 6903039) · E69110333257 (AN 6903043)
