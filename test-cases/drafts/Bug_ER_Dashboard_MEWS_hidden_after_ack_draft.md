# ร่างการ์ดบั๊ก — แพทย์รับทราบแล้ว MEWS Score หายจากการ์ดผู้ป่วยบน ER Dashboard

> สถานะ: **สร้างแล้ว SBH-3936** (8 พ.ย. 2026 — ผู้ใช้ "ใช้ภาพเดิม สร้างได้" · ภาพ / คลิปใช้ assetUrl ของ TC-012 พร้อมหมายเหตุว่าป้าย Expected ในภาพเป็นของ TC เดิม)
> - ผู้ใช้สั่ง "สร้างการ์ดให้หน่อย เมื่อแพทย์รับทราบแล้ว Mews Score ต้องไม่หาย" · เลือก **แบบ 1** การ์ดใหม่ใน `[SBH] ER` · หน้าจอ = การ์ดผู้ป่วยบน ER Dashboard · ภาพใช้ของเดิมจาก TC-012 (SBH-3571) · Assignee Dew
> - ตั้งค่า: Bug Template · project [SBH] ER · Priority High · สถานะ Waiting for Fixing Bugs · labels 🐞 BUG / VERSION 2.10.0 (ตาม SBH-2058) / Natthaphat ( MOD ) 🙈 · Assignee jetsadaporn (Dew) · Milestone `ER - เก็บตก, edge case` (ตาม SBH-2058) · ไม่ผูก relation (แบบ 1) — อ้าง SBH-2058 ในเนื้อหา
> - connector Linear ตอนนี้ = **Pearsu Kaeomanee** (ผู้สร้างจะแสดงเป็น Pearsu)
> - หมายเหตุ: พฤติกรรมตอนนี้ตรงกับ AC 2.3.1 ของ SBH-2058 (ให้ MEWS หาย) — การ์ดนี้จึงเป็นการเปลี่ยน AC ข้อนั้น · TC-012 (SBH-3571) ที่ Pass ไว้จะกลับทาง ต้องแก้ Expected เมื่อ dev แก้เสร็จ
> - ภาพ: ใช้ภาพ SBH Prod ของ TC-012 `p2058-TC012-01.png` (ก่อนแพทย์เปิด MEWS 1) · `p2058-TC012-03.png` (หลังแพทย์เริ่ม ไม่มี MEWS) + คลิป `p2058-clip-TC-012.webm` — **ภาพเดิมมีป้าย "Expected: MEWS หายแล้ว" และตาราง ✓ ตรง** (จาก TC เดิม) อ่านกลับความหมายในการ์ดบั๊ก

**Title:** `[Bug][ER][ER Dashboard] - แพทย์รับทราบ (เริ่มการรักษา) แล้ว MEWS Score หายจากการ์ดผู้ป่วยบน ER Dashboard`

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** Dev-X , SBH Prod
* **User Account:** user1 (คัดกรองแทนพยาบาล) · Doctor

### **2. Description**

1. แพทย์รับทราบ (เปิดผู้ป่วยแล้วเริ่มพิมพ์ในฟอร์มแพทย์) แล้ว MEWS Score หายไปจากการ์ดผู้ป่วยบน ER Dashboard

* **Expected Result:** การ์ดผู้ป่วยบน ER Dashboard ยังแสดง MEWS Score (เช่น "MEWS 1 · ความเสี่ยงต่ำ") ทั้งก่อนและหลังแพทย์รับทราบ
* **Actual Result:** คัดกรองผู้ป่วย (MEWS 1) → การ์ดบน ER Dashboard แสดง "MEWS 1 · ความเสี่ยงต่ำ" → แพทย์กด Patient Card แล้วพิมพ์ Chief Complaint (POST physician-activity 200) → กลับ ER Dashboard การ์ดผู้ป่วยไม่แสดง MEWS แล้ว (GCS / Fast Track / Vital Signs ยังแสดง)

[ภาพ p2058-TC012-01.png — ก่อนแพทย์เปิด การ์ดแสดง MEWS 1]

[ภาพ p2058-TC012-03.png — หลังแพทย์เริ่มทำงาน การ์ดไม่มี MEWS]

[คลิป p2058-clip-TC-012.webm]

### **3. Technical Details**

* เดิม SBH-2058 AC 2.3.1 กำหนดให้ "รับทราบแล้ว MEWS Score หายจากการ์ดผู้ป่วยบน Dashboard" — การ์ดนี้เปลี่ยนเป็นให้คงแสดง MEWS Score
* เจอทั้ง Dev-X (4/11/2569 · HN 6932789) และ SBH Prod (7/11/2569 · HN 6904804 · V6911074928) จาก `TC-SBH-2058-012`
* จุดที่ MEWS หาย: หลัง POST `physician-activity` (แพทย์เริ่มทำงาน) — ไม่มีปุ่ม Acknowledge ที่ MEWS แล้ว (AC 2.1)
