# ฟอร์ม Trauma Detail For Pher Plus (Custom Form รุ่นใหม่ · ER)

แยกจาก `er.md` (ไฟล์นั้นเกิน 100 KB) · การ์ด SBH-2952 · สเปก `tests/modules/er/SBH-2952-trauma-detail-form.spec.ts`

### dev-x 31 ต.ค. 2026 (ไฟล์แอป index-DJaj9lPY.js)

- **เปิดฟอร์ม**: หน้าผู้ป่วย ER → เมนูขวา `สร้างฟอร์ม` (`careMenu`) → select ใต้ป้าย `เลือกฟอร์ม` (Ant Design · **virtual list** — ตัวเลือก "Trauma Detail For Pher Plus" อยู่ท้ายรายการ ต้องเลื่อน `.rc-virtual-list-holder` จนเห็น · พิมพ์ค้นไม่กรอง · **~10 วินาทีแรกมีแค่ 5 ฟอร์ม เลื่อนไม่ได้ แล้วค่อยโหลดครบ ~67** — รอ scrollHeight ยาวก่อนเลื่อน · Nurse เห็นฟอร์มนี้ (ลำดับก่อนสุดท้าย))
  - แผงมี `กลุ่มแบบฟอร์มและร่างของฉัน` · `สร้างจากชุดแบบฟอร์ม` · ปุ่ม `บันทึก` / `ลบร่างของฉัน` / `Note Template` / `Retrieve`
- **ตั้งค่า (API)**: concept `er-trauma-detail-pher-plus` (id 281 · template version 136 · เผยแพร่ 28 ต.ค.) · `allowMultiplePerEncounter: false` = **1 ฉบับต่อ Encounter** (บันทึกแล้ว `canCreateOccurrence: false`) · Nurse / Super_User `canEdit: true`
  - `GET /cortex-api/clinical-form-template-concepts?limit=50&offset=50` (หน้าละ 50 · `search` ไม่กรอง) · `GET /cortex-api/clinical-form-template-versions/available?encounterId=<EN>`
- **web component** `er-trauma-detail-pher-plus-v1` (shadow DOM เปิด — `getByRole` / CSS ทะลุได้):
  - 3 ส่วน = `details[data-card="transport" | "trauma" | "diagnosis"] > summary` (diagnosis: `<span>` ชื่อ + `.pher__badge` "รายการวินิจฉัย n / 6")
  - dropdown = `input[role=combobox][aria-label=<ชื่อช่อง>]` → listbox `[id=<aria-controls>] [role=option]` (ตัวเลือกเป็น `<button>`) · ช่อง ICD ต้อง**พิมพ์ก่อน**รายการถึงขึ้น (`GET /diagnosis-search/icd10/?q=…&system=icd10&limit=50`) · option มีช่องว่างท้าย → regex อย่าใช้ `$`
  - ปุ่มเลือก = `role=radiogroup aria-label=<ชื่อ>` > `label` (ห่อ `input[type=radio]`) · ค่าเริ่มต้น ไม่ทราบ ×5 · ประวัติสลบ = ไม่สลบ
  - ช่องอื่น: `[data-path$="date_and_time_of_injury"]` / `…hospital_arrival` (`datetime-local` · `fill('2026-10-16T08:30')` · **มาถึง รพ. เติมเวลาเปิด Visit ให้เอง**) · `…transport_accident` (checkbox) · `…blood_alcohol_level` (number) · `…loss_of_consciousness_hours` / `_minutes` (disabled จนเลือก สลบ · นาที max 59 แต่พิมพ์ 75 ได้ แค่ invalid)
  - อำเภอ / ตำบล disabled จนเลือกจังหวัด (กรองตามจังหวัด)
  - แถว ICD: `.pher__injury` · เลข `.pher__row-number` (#1…) · ช่อง `ICD10 n` / `BR n` / `AIS n` · ปุ่มลบ `ลบรายการ n` (×) · ปุ่ม `+ เพิ่มรายการ (ICD10, BR, AIS)`
  - **BR auto-map**: S22.3 → 3 Thorax · T00.9 → 6 External · T07 → 9 Unknown · S06.0 → 1 Head / Neck · รหัสแสดงแบบไม่มีจุด (`S223 - Fracture of rib`)
  - **ครบ 6 แถว ปุ่ม + เพิ่มรายการ ยังแสดง** · กดอีกไม่เพิ่มแถว + ข้อความแดง "สามารถเพิ่มรายการ ICD10, BR, AIS ได้สูงสุด 6 รายการตามโครงสร้าง PHER+" (TC-019 ลง Fail ตามคำตอบผู้ใช้)
  - ลบแถวกลาง → เรียงเลขใหม่ · เหลือแถวเดียวกด × = ล้างค่าในแถว (แถวไม่หาย)
  - ช่อง ICD10 สาเหตุ ค้นได้เฉพาะ V W X Y (ค้น S22 / fracture = ไม่มีรายการ)
- **ร่าง**: แก้ช่องใดก็ตาม → `PUT /cortex-api/clinical-form-groups/<uuid>/draft[/occurrences/…]` (ร่างของผู้ใช้ ไม่ใช่การบันทึก) · URL ได้ `&draftInstanceId=`
- **บันทึก**: ปุ่ม `บันทึก` → `POST /cortex-api/clinical-form-groups/<uuid>/saves` (200) · ไม่มี toast — แถบฟ้า "บันทึกข้อมูลทางคลินิกและเชื่อมโยงกลุ่มแล้ว" + "บันทึกจากแบบฟอร์มนี้: <วันเวลา> โดย <ผู้ใช้>" + หัวรายการ "version 1"
  - ตรวจว่าบันทึก: `GET /cortex-api/clinical-form-groups?encounterId=<EN>&mode=committed&page=1&pageSize=100` → group ชื่อ "Trauma Detail For Pher Plus"
- **ดูย้อนหลัง**: **ไม่อยู่ในแท็บ "ประวัติ Custom Form"** (ทั้งแท็บในประวัติการรักษา และเมนูซ้าย — ตัวกรองมีแต่ฟอร์มระบบเดิม Doctor Progress Note ฯลฯ) ·
  แสดงที่ **ประวัติการรักษา → แท็บ `ER Summary` → ส่วน "ข้อมูลการบาดเจ็บ"** = `er-trauma-detail-pher-plus-v1-viewer` (shadow DOM: `section[data-section]` + `dl > dt/dd` + ตาราง ICD `tbody tr td`) · วันที่แสดง พ.ศ. (`16/10/2569 08:30`) · ค่าปุ่มเลือกแสดงพร้อมรหัส (`0 - ไม่ใช่` · `1 - ใช้` · `2 - สลบ · 0 ชั่วโมง 10 นาที`)

### SBH Prod 6 พ.ย. 2026 (ไฟล์แอป index-B30_rCX7.js · R145)

- concept `er-trauma-detail-pher-plus` = **id 73** (dev-x id 281) · หน้าจอ / ตัวเลือก / BR auto-map / เพดาน 6 แถว เหมือน dev-x · ปุ่ม + เพิ่มรายการ ยังแสดงเมื่อครบ 6 (ผู้ใช้ให้ TC-019 ผ่าน)
- ตอนเลือกฟอร์มขึ้นแถบฟ้า "กำลังรอการเชื่อมต่อตัวกรอกข้อมูลที่รองรับ ยังไม่สามารถบันทึกได้" ~4 วิ แล้วหาย · ระหว่างกรอกอาจขึ้นข้อความส้ม "ร่างล่าสุดยังไม่ถูกเก็บถาวร…" + ปุ่ม `ลองเก็บร่างอีกครั้ง` ชั่วครู่ = รอ PUT draft (ได้ 200 ทุกครั้ง ไม่ใช่ error)
- **กด `บันทึก` (Nurse) → `POST …/saves` 503** `{"errorCode":"STATE_UNAVAILABLE","outcome":"UNKNOWN","message":"Save state unavailable; inspect the original operation before another submission"}` 3/3 ครั้ง (ผู้ป่วย 2 ราย) → แถบเหลือง "ยังไม่ทราบผลการบันทึก กรุณาตรวจสอบคำขอเดิมก่อนบันทึกอีกครั้ง" + "ยังตรวจสอบผลไม่ได้ เก็บเลขอ้างอิงไว้และตรวจสอบอีกครั้ง ห้ามส่งคำขอซ้ำ" · ปุ่ม `บันทึก` / `ลบร่างของฉัน` ถูกปิด · มีปุ่ม `ตรวจสอบผลการบันทึก` / `ตรวจสอบและกู้คืนผลการบันทึก` · committed ไม่มีฟอร์ม (บันทึกคัดกรอง ER ของ Super_User ได้ 200) — ตรวจว่าบันทึกจริงไหมด้วย `clinical-form-groups?encounterId=…&mode=committed`
- Dropdown จังหวัด → อำเภอ → ตำบล บน Prod โหลดช้า รวม ~60 วิ (คลิป TC-015 ยาว 112 วิ ต้องตัด)
- เปิดหน้าใหม่หลังได้ 503: ร่างที่กรอกยังอยู่ (ค่าเดิม) — ถ่ายภาพค่าเริ่มต้น (TC-005 / 007) ต้องใช้ผู้ป่วยใหม่
