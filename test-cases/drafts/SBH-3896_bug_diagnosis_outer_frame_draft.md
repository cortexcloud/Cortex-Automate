# ร่างการ์ดบั๊ก — SBH-3896 TC-001 (SBH Prod 8 พ.ย. 2569)

> สถานะ: **สร้างแล้ว SBH-3962** (8 พ.ย. 2569 21:45 · ผู้ใช้พิมพ์ "สร้างได้")

## ตั้งค่า

- แบบ 2: Sub-Issue ของ SBH-3896 · Template `Bug Template` (ทีม SBH)
- Project `[SBH] ER` · Milestone `ER - เก็บตก, edge case` (ตามการ์ดแม่) · Priority High
- Labels: `🐞 BUG` · `VERSION 2.10.0` (ตามการ์ดแม่) · `Natthaphat ( MOD ) 🙈`
- Assignee: Suchat (ID ac7ed47a-b74d-4a54-992f-5d09acad47f2) · สถานะ `Waiting for Fixing Bugs`
- สร้างด้วย connector บัญชี Pearsu (ช่อง "สร้างโดย" จะเป็น Pearsu)
- ภาพ: `.cache/bug3896/bug3896-01-outer-frame.png` (เฟรมคลิป TC-001 + กรอบเส้นประ / ป้าย Actual) ฝังด้วย prepare_file_upload

## ชื่อ

[Bug][ER][ER Physician Note] - ส่วน Diagnosis general เอากรอบออกผิดด้าน กรอบนอกยังอยู่ แต่หัวกล่อง Diagnosis ด้านในหายไป

## เนื้อหา

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** SBH Prod
* **User Account:** Doctor (แพทย์ ER)

### **2. Description**

1. ER Physician Note ส่วน Diagnosis general เอากรอบออกผิดด้าน (AC 1 ของ SBH-3896)

* **Expected Result:** ไม่มีกรอบนอก "Diagnosis general" ครอบอีกชั้น · คงกล่อง "Diagnosis" ด้านในที่ครอบรายการไว้
* **Actual Result:** กรอบนอก "Diagnosis general" (หัว + ⋮ / ยุบ-ขยาย) ยังอยู่ · หัวกล่อง "Diagnosis" ด้านในถูกเอาออกแทน เหลือแค่กรอบจางรอบแถว

<ภาพ bug3896-01-outer-frame.png>

### **Technical Details**

* พบจาก `TC-SBH-3896-001` (SBH-3954) · 8 พ.ย. 2569 21:07 · ไฟล์แอป index-BVfsMIKN.js · ผู้ป่วย AUTO HN 6904874
* กรอบนอกที่ยังอยู่คือ `.ant-collapse-item` ของ occurrence ฟอร์ม (หัว `.ant-collapse-header` "Diagnosis general *" + ปุ่ม "การดำเนินการเพิ่มเติมของรายการ") ครอบรวม Doctor diagnosis note · แถวรายการ `[data-dx-index="0"]` อยู่ใน `.ant-collapse-body` โดยไม่มีหัว "Diagnosis"
* ภาพก่อนแก้: รูป 1 ในการ์ด SBH-3896 (กล่อง Diagnosis ด้านในมีหัวสีเทา ซ้อนในกรอบ Diagnosis general)
