# ร่างการ์ดบั๊ก (แบบ 2 · Sub-Issue ใต้ SBH-2079) — รอผู้ใช้ตรวจก่อนสร้าง

- ชื่อ: `[Bug][ER][ER Discharge Summary] - SBH Prod แสดง / พิมพ์สรุปการจำหน่ายไม่ได้ (print template not found)`
- Template: Bug Template (SBH) · parent SBH-2079 · Project `[SBH] ER` · Priority High · สถานะ Waiting for Fixing Bugs
- Labels: 🐞 BUG · VERSION 2.10.0 · Natthaphat ( MOD ) 🙈 · Assignee: Suchat Chancherngsilapakul
- สร้างด้วย connector บัญชี Nawin (Win) (ผู้ใช้อนุญาต 6 พ.ย.)

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** SBH Prod
* **User Account:** User1

### **2. Description**

1. เปิดแท็บ "สรุปการจำหน่าย" ของ Visit ER ที่ลงนาม Disposition แล้ว ไม่แสดงเอกสาร ER Discharge Summary

* **Expected Result:** แท็บแสดงเอกสาร ER Discharge Summary (A4) ของ Visit นั้น
* **Actual Result:** แท็บขึ้น "เกิดข้อผิดพลาด · ไม่สามารถโหลดสรุปการจำหน่ายได้" (API ตอบ 404 print template not found)

{{TC004-1.png}}

2. กดปุ่ม "พิมพ์สรุปการจำหน่าย" ที่หัวฟอร์ม Disposition หลังลงนาม พิมพ์ไม่ได้

* **Expected Result:** ได้เอกสาร ER Discharge Summary สำหรับพิมพ์
* **Actual Result:** ขึ้นแจ้งเตือน "ไม่สามารถพิมพ์สรุปการจำหน่ายได้" (API ตอบ 404 print template not found)

{{TC006-2.png}}

### **Technical Details**

* `POST /cortex-api/er/encounters/<EN>/discharge-summary/pdf?intent=view` และ `?intent=print` → HTTP 404 `{"error":{"class":"NotFound","message":"print template not found"}}`
* ลอง 3 Encounter ได้ 404 เหมือนกัน: E6911065495 (ผู้ป่วย AUTO ลงนาม 06/11/2569 16:56) · E6911054885 · E6910193966 — ไม่ขึ้นกับข้อมูลของผู้ป่วย น่าจะยังไม่มี print template ของ ER Discharge Summary บน Prod
* ไฟล์แอป Prod ตอนทดสอบ: index-B30_rCX7.js (6 พ.ย. 2026 ~17:00) · บน Dev-X ฟีเจอร์เดียวกันได้ PDF 200 (ทดสอบ 4 พ.ย.)
* กระทบ TC ที่ใช้เอกสาร PDF ของ SBH-2079 ทั้งหมด (ลง Fail ใต้หัว SBH Prod)
