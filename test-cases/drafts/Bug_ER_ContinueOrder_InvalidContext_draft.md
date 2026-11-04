# ร่างการ์ดบั๊ก — Continue Order จาก Order Summary ER (ผู้ป่วยรอเตียง) บันทึกไม่ได้

- ชื่อ: `[Bug][ER][Order Summary / Physician Order] - ผู้ป่วยรอเตียง (มี AN) สั่ง Order จากปุ่ม + ORDER FOR CONTINUE ไม่ได้ ทั้งยาและหัตถการ "บริบทของคำสั่งยาไม่ถูกต้อง"`
- Template `Bug Template` · Project `[SBH] ER` · Priority High · Labels `🐞 BUG` · `VERSION 2.10.0` · `Natthaphat ( MOD ) 🙈` · สถานะ Waiting for Fixing Bugs
- Reproduce: dev-x 4 พ.ย. 2026 · สคริปต์ `mock-data/_repro-continue-order.spec.ts` · หลักฐาน `clips/Bug-ER-ContinueOrder-InvalidContext/`

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** Dev-X
* **User Account:** User1

### **2. Description**

1. สั่ง Continue Order **ยา** จาก Order Summary ของ ER (ผู้ป่วยรอเตียง) ไม่ได้

* **Expected Result:** บันทึกสำเร็จ รายการยาแสดงใน ORDER FOR CONTINUE ของ AN
* **Actual Result:** Order Summary (สั่งบน AN · รอเตียง) → กด + ที่ ORDER FOR CONTINUE → Continue Order → med0000006 → บันทึก
  * แจ้งเตือนแดง "บริบทของคำสั่งยาไม่ถูกต้อง" · รายการค้างในตะกร้า ไม่ถูกบันทึก

<ภาพ 01 แถบ AN รอเตียง + ปุ่ม + · 02 ก่อนกด · 03 หลังกด · คลิป clip-new-1-MED-CONT>

2. สั่ง Continue Order **หัตถการ** จากหน้าต่างเดียวกันไม่ได้

* **Expected Result:** บันทึกสำเร็จ รายการหัตถการแสดงใน ORDER FOR CONTINUE ของ AN
* **Actual Result:** + ORDER FOR CONTINUE → Continue Order → 89.52 Electrocardiogram (ECG) → เพิ่มลงตะกร้า → บันทึก
  * แจ้งเตือนแดง "บริบทของคำสั่งยาไม่ถูกต้อง" เหมือนข้อ 1 (ทั้งที่ไม่มียาในคำสั่ง)

<ภาพ 05 ก่อนกด · 06 หลังกด · คลิป clip-new-2-ACT-CONT>

3. สลับเป็น **One Day Order** ในหน้าต่างเดียวกันก็บันทึกไม่ได้

* **Expected Result:** บันทึกสำเร็จ รายการแสดงใน ORDER FOR ONE DAY ของ AN
* **Actual Result:** + ORDER FOR CONTINUE → One Day Order → med0000008 → บันทึก
  * แจ้งเตือนแดง "บริบทของคำสั่งยาไม่ถูกต้อง" เหมือนข้อ 1

<ภาพ 08 เลือก One Day Order · 09 ก่อนกด · 10 หลังกด · คลิป clip-new-3-MED-ONEDAY>

### **Technical Details**

* ทั้ง 3 ข้อ: graphql `upsertIpdOrder` → `errors: ErrMedicationOrderInvalidContext` · `data: null`
* หน้าต่างนี้เปิดใน context ER (`fromApp=er`) และส่ง `encounterEn` = EN ของ ER (E69110433467) คู่กับ `an` 6903049
* เปิดผู้ป่วยเดียวกันจากฝั่ง IPD (`?an=<AN>&fromApp=ipd` → Physician Order) สั่ง Continue Order ยาได้ปกติ "เพิ่ม/แก้ไข Order สำเร็จ" (ตรวจกับ HN 6932747 · AN 6903047)
* ผู้ป่วยที่ใช้: HN 6932771 · EN E69110433467 · AN 6903049 (สร้างใหม่ตอน Reproduce: คัดกรอง ESI 3 → Disposition รับไว้รักษาต่อIPD → Admit Order → ศูนย์จัดการเตียงสร้าง AN · ยังไม่รับลงเตียงที่หอ — Order Summary แสดง "รอเตียง") · ผู้ใช้เจอครั้งแรกกับ HN 6932747 · EN E69110433431 · AN 6903047
* การ์ดที่ error ชื่อเดียวกัน: COR-2039 (TMH · ฝั่ง IPD · ข้อความ "medicationEncounterEn is required")
