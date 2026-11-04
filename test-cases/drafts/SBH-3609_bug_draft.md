# ร่างการ์ดบั๊ก SBH-3609 (Sub-Issue การ์ดเดียว)

> สถานะ: **สร้างแล้ว 4 พ.ย. 2026 → SBH-3883** (Sub-Issue ใต้ SBH-3609 · การ์ดเดียว 3 ข้อ: ESI 5 · เลขนำหน้าผู้ป่วยที่เพิ่มเอง · ER Arrival ไม่แสดงใน Visit) — ร่างด้านล่างเป็นฉบับ 3 พ.ย.
> - ข้อ 1: ผู้ใช้สั่ง 3 พ.ย. 2026 "ESI 5 ไม่มีโซนแนะนำ → เปิดการ์ดบั๊ก" (มองว่าควรแนะนำ Observation)
> - ข้อ 2: **เสนอเพิ่ม** — ผู้ใช้บอกกฎ "คนไข้ที่เพิ่มเองต้องไม่มีเลข" แต่ dev-x แสดงเลขแล้ว (ภาพมีจริง) · ถ้าไม่ต้องการให้ตัดออก
> - ข้อ 1 **ยังไม่มีภาพบนจอ** — รู้จากโค้ด + API เท่านั้น เพราะกด ESI ในหน้า MC แล้วบันทึกร่างทันที (`PUT …/members/<id>/draft`) จึงไม่ได้กด · ต้องได้ภาพก่อนสร้างการ์ด
>   → **ผู้ใช้สั่ง 3 พ.ย. 2026: เก็บภาพตอนรันเทสการ์ดจริง** — ในเหตุการณ์ MC B (สร้างตอนรัน) เลือกผู้ป่วย → กด ESI 5 → ภาพปุ่มโซนไม่มี "แนะนำ" + เทียบ ESI 4 "Urgency แนะนำ" · สร้างการ์ดบั๊กหลังรันเทส
> - ตั้งค่าแบบ SBH-3842: parent SBH-3609 · project [SBH] ER · Priority High · สถานะ Waiting for Fixing Bugs · labels 🐞 BUG / VERSION 2.10.0 / Natthaphat ( MOD ) 🙈 · Assignee Suchat (ใส่ ID — connector อาจเป็นบัญชีคนอื่น)

**Title:** `[Bug][ER][Mass Casualty] - ESI 5 ไม่มีโซนแนะนำ · ผู้ป่วยที่เพิ่มเองมีเลขลำดับนำหน้าชื่อ`

---

### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** Dev-X
* **User Account:** user1 (Super_User)

### **2. Description**

1. หน้าคัดกรองผู้ป่วยหลายคน เลือก ESI 5 แล้วไม่มีโซนแนะนำ

* **Expected Result:** เลือก ESI 5 → ระบบแนะนำและเลือกโซน Observation ให้ (ปุ่ม "Observation แนะนำ")
* **Actual Result:** เปิดเหตุการณ์ → เลือกผู้ป่วย → กด ESI 5 → ไม่มีปุ่มโซนไหนถูกเลือก ไม่มีคำ "แนะนำ" ต้องเลือกโซนเอง (ESI 1–4 มีโซนแนะนำปกติ)

[ภาพ — เก็บตอนรันเทสการ์ดจริง]

2. ผู้ป่วยที่เพิ่มเองเข้าเหตุการณ์มีเลขลำดับนำหน้าชื่อ

* **Expected Result:** เลขลำดับนำหน้าชื่อเฉพาะผู้ป่วยที่ระบบสร้างจาก "จำนวนผู้ป่วย" · ผู้ป่วยที่เพิ่มเอง (ค้นหา HN / ผู้ป่วยใหม่) แสดงชื่อตามทะเบียน
* **Actual Result:** เพิ่มผู้ป่วย HN 6932338 เข้าเหตุการณ์ → รายการฝั่งซ้ายแสดง "01 นาง AUTO Ttl2371P1031111358" (แถบชื่อฝั่งขวาไม่มีเลข)

[ภาพ `.cache/explore-3609/manual-member.png`]

### **3. Technical Details**

* สำรวจ 03/11/2569 ~20:20 · dev-x · ไฟล์แอป `index-D-2VfyUS.js` + ชิ้นหน้า MC `index-mdf82neb.js`
* ข้อ 1: `GET /cortex-api/er/triage/zones?triageLevel=5` → `suggestedLocationId` 269 (Isolation 1 · ER_GREEN_ZONE) ซึ่งหน้า MC กรองทิ้งตาม SBH-3609 (`resolveErMassCasualtySuggestedZoneId`) → ไม่เหลือโซนแนะนำ · ESI 4 → Urgency แนะนำ (เห็นบนจอ)
* ข้อ 2: เหตุการณ์ MCI-20261031-93B562 · เลขมาจาก `registrationSeq` หรือลำดับแถว (`getErMassCasualtyMemberTitle`)
