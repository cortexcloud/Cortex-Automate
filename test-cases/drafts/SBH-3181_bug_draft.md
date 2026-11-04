# ร่างการ์ดบั๊ก SBH-3181 (Sub-Issue การ์ดเดียว)

> สถานะ: **สร้างแล้ว SBH-3882** (4 พ.ย. 2026 · ผู้ใช้ "สร้างได้" · connector Pearsu → ผู้ใช้เลือก "สร้างเลย assign ผม")
> - ที่มา: ผลรัน dev-x 3 พ.ย. 2026 (EXE SBH-3751 · 66 TC) · สถานะ TC ใน Linear ณ 4 พ.ย. ~10:20: Failed 4 ใบ (004 / 042 / 056 / 065)
> - TC-042 (legend ใต้ตาราง) **ไม่เปิดบั๊ก** — อยู่ใน AC 7.3 ที่การ์ดขีดฆ่าแล้ว (TC-041 ข้อเดียวกันถูก Canceled 4 พ.ย. 10:19) → เสนอเปลี่ยน TC-042 เป็น Canceled
> - TC-007 ("ไม่ระบุแพทย์" ซ้ำ) / TC-041 ถูก Canceled แล้ว · TC-047 ถูกเปลี่ยนเป็น Done on dev-x (หัวผลยังเขียน "(Fail)")
> - **4 พ.ย. 2026 BA ยืนยัน: อายุต่ำกว่า 1 ปีแสดง "-" (TC-065) และเรียงตามอายุ (TC-056) ไม่ถือเป็นบั๊ก** → ตัดออกจากร่าง · ลง TC ทั้ง 2 เป็น Pass + Done on dev-x พร้อมหมายเหตุ BA แล้ว
> - ตั้งค่าแบบ SBH-3609: parent SBH-3181 · project [SBH] ER · Priority High · สถานะ Waiting for Fixing Bugs · labels 🐞 BUG / VERSION 2.10.0 / Natthaphat ( MOD ) 🙈 · Assignee Suchat (ใส่ ID `ac7ed47a-b74d-4a54-992f-5d09acad47f2`)

**Title:** `[Bug][ER][Dashboard] - มุมมองบอร์ดยังใช้หัวคอลัมน์ "Zone Isolate"`

---

### **1. Environment & Context**

* **URL/Environment:** Dev-X (`/cortex/er/dashboard`)
* **User Account:** user1 (Super_User)

### **2. Description**

1. มุมมองบอร์ดยังใช้หัวคอลัมน์ "Zone Isolate"

* **Expected Result:** บอร์ดไม่มีคำ "Zone Isolate" · แยก Isolation 1 / Isolation 2 หรือแสดง "Isolation" พร้อมเลขห้อง ให้ตรงกับคอลัมน์โซนในมุมมองรายการ (AC 1.4)
* **Actual Result:** แดชบอร์ด / คิว → มุมมองบอร์ด → หัวคอลัมน์ยังเป็น "Zone Isolate" (ผู้ป่วย Isolation 1 / 2 อยู่คอลัมน์เดียวกัน แยกด้วยป้ายเลขบนการ์ด)
  * มุมมองรายการ: แสดง Isolation 1 / Isolation 2 ถูกต้อง

[ภาพ `TC004-1.png` — บอร์ด หัวคอลัมน์ "Zone Isolate"] · [ภาพ `TC004-2.png` — รายการ โซน Isolation 1 / 2]

### **3. Technical Details**

* ทดสอบ 03/11/2569 12:22–12:25 · dev-x · ไฟล์แอป `index-BneIKgug.js` 
* TC-SBH-3181-004 (SBH-3764) · ⚠️ ขัดกับ TC-SBH-1678-025 (SBH-3306 "แสดงผู้ป่วยโซน Isolation เป็น Zone Isolate บน ER Dashboard" · Done on dev-x)

---

## ข้อสังเกตจาก TC ที่ผ่าน (ไม่ใส่ในการ์ด เว้นแต่ผู้ใช้สั่ง)

* การตั้งค่าคอลัมน์ / ตัวกรองโซนเก็บใน localStorage ของเบราว์เซอร์ ไม่ได้เก็บที่ server — เปลี่ยนเครื่องแล้วค่าหาย (TC-022 / 028 · AC 3.5 / 4.5 "บันทึกต่อผู้ใช้")
* บอร์ดยังแสดงอายุ "30 ปี x เดือน x วัน" (ตัวยึดตำแหน่ง) — AC 5.3 "ทุกกรณี" แต่บอร์ดอยู่นอก scope (TC-006 / 034)
* ลำดับคอลัมน์เริ่มต้น คิว · ESI · ชื่อ-สกุล · HN (AC เขียน HN ก่อนชื่อ) — น่าจะตั้งใจเพื่อให้ชื่อค้างซ้าย (AC 7.2) (TC-032)
