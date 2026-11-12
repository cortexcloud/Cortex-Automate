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

### SBH Prod 9 พ.ย. 2026 (Mock TOR `@TORM-PHER`)

- **บันทึกได้ 200 แล้ว** (Nurse · HN 6904939 / 6904940 · 11:55 / 11:58) — ไม่เจอ 503 STATE_UNAVAILABLE แบบ 6 พ.ย. (SBH-3918) · แถบ "บันทึกข้อมูลทางคลินิกและเชื่อมโยงกลุ่มแล้ว" ขึ้น
- เปิดหน้าฟอร์มแล้ว `clinical-form-groups?mode=committed` มี group "Trauma Detail For Pher Plus" ทันทีแม้ยังไม่บันทึก (`occurrences: []`) → ตรวจว่าบันทึกแล้วให้ดู `occurrences.length > 0` ไม่ใช่แค่ชื่อ group
- ตัวเลือกที่สำรวจ (`_explore-trauma-options.spec.ts`): ประเภทจุดเกิดเหตุ 5 / 501 / 502 / 503 / 1 / 11–17 / 2–4 / 6–9 / N · ประเภทผู้บาดเจ็บ 1 คนเดินเท้า / 2 คนขับขี่ / 3 คนโดยสาร · ยานพาหนะ 01–19 (02 จักรยานยนต์ · 05 รถปิกอัพ) · ส่งตรวจแอลกอฮอล์ 0–4 · กลไก 01–19+ (05 ชนรถปิกอัพ · 20 ตกจากพาหนะ) · เหตุการณ์ 0–4 / 8 / 9 · ลักษณะ 1 Blunt / 2 Penetrating / 3 / 9 · AIS 1–6 / 9 · radio เพิ่ม "เข็มขัดนิรภัย" (ไม่ทราบ / ไม่ใช้ / ใช้ Belt / ใช้ Car seat)
- แท็บ ER Summary ของ user1 หา `er-trauma-detail-pher-plus-v1-viewer` ไม่เจอ (ก่อนบันทึก — ยังไม่ได้ดูหลังบันทึก)
- **ฟอร์มซ้ำ (9 พ.ย.)**: เปิดฟอร์มในหน้าต่าง Nurse (สำรวจตัวเลือก ไม่ได้บันทึก) → เกิด group committed ว่าง (`occurrences: []`) · กรอก + บันทึกรอบหลังได้ **group ใหม่** → Encounter เดียวมี 2 group ทั้งที่ `allowMultiplePerEncounter: false` → หน้า EMR มีแท็บ "Trauma Detail For Pher Plus" ซ้ำ 2 แท็บ (HN 6904939 group 318 ว่าง + 320 · HN 6904940 group 319 ว่าง + 321) — ควรแจ้ง Dev
- หน้า EMR (user1): ปุ่ม ⋮ ท้ายหัวฟอร์ม `aria-label="การดำเนินการเพิ่มเติมของรายการ"` → `แก้ไขวันเวลาและผู้ปฏิบัติ` · `นำรายการออก` (แดง · ไม่มีหน้าต่างยืนยัน) · กดที่แท็บว่าง (ผู้ใช้อนุมัติ) → รายการหายจากจอ "ไม่มีข้อมูลในช่วงเวลานี้" · PUT draft 400 "เก็บร่างไม่สำเร็จ" · **group ว่างยังอยู่ แท็บไม่หาย** → ลบ group ว่างผ่าน UI ไม่ได้ (ไม่ได้กดบันทึกต่อ) · สคริปต์ `mock-data/_remove-empty-pher.spec.ts`

### แผง "ข้อมูล PHER+" — dev-x 12 พ.ย. 2026 (การ์ด SBH-3610 · index-CjGp3MZk → B4_wAMcw → rvjqyXLh.js · แผง index-BUkGeiVh / Ci62XKQ4.js)

- ทางเข้า: หน้า Visit ER → **เมนูขวา › ER › `ข้อมูล PHER+`** (สิทธิ์ `pher-plus:view` · `erOnly` · ต้องมี Encounter) · Super_User / Nurse / Doctor เห็น · แท็บ dockview `[data-testid="patient-dockview-tab"][data-panel-id="pherPlusData"]`
- API `GET /cortex-api/pher-plus/by-vn/<VN>` (404 "ER visit not found" = VN ไม่ใช่ ER) → `{ person, address, service, diagnoses, traumaDetail: { present, labels, … } }` · locale `/cortex/locale/th/pher-plus.json`
- แผงอ่านอย่างเดียว ไม่มีปุ่มบันทึก · 3 ส่วน antd Descriptions `data-testid="pher-plus-section-<patient|arrival|trauma>"` หัว `.ant-descriptions-title` = "1. ข้อมูลผู้ป่วย" / "2. ข้อมูลการมาโรงพยาบาลและการดูแลก่อนถึง รพ." / "3. ข้อมูลการเกิดเหตุและปัจจัยเสี่ยง Trauma Detail" (ไม่มีลำดับ PHER+ / ป้ายแหล่งข้อมูล) · ป้าย `.ant-descriptions-item-label` → ค่า = sibling ถัดไป
- กฎแสดงค่า (โค้ดแผง): noSource (รหัสอาชีพ `occupation_new` · ประเภทการมา `pmi` · ITEMS · hprov · amb · refer) และ required ที่ว่าง = **ช่องว่าง** · optional ว่าง = "-" · "รหัส - ชื่อ" เฉพาะช่องที่ `traumaDetail.labels` มีชื่อ (ส่วนที่ 3) — ทะเบียน / Visit แสดงรหัสอย่างเดียว (สัญชาติ 099 · ประเภทที่อยู่ 2 · จังหวัด 19 · สิทธิ UCS) · ไม่มีช่องอายุ มีแต่วันเกิด (พ.ศ.) · ไม่มี badge รหัส field (SBH-3972)
- ต้นทาง: ER Arrival ของคัดกรอง → ผู้นำส่ง (รหัส 3) · ชื่อผู้นำส่ง · ระดับชุด EMS (ALS = 1) · อุบัติเหตุหมู่ = `mass_casualty` "0" อยู่ส่วนที่ 2 · ระดับคัดแยก = ESI · การดูแลระหว่างนำส่ง (airway … iv) มาจากฟอร์ม Trauma Detail · ส่วนที่ 3 ไม่มีฟอร์ม = ข้อความ "ยังไม่มีฟอร์ม Trauma Detail"
- **บันทึกฟอร์ม Trauma Detail (Nurse) บน dev-x 12 พ.ย. ได้ 503 STATE_UNAVAILABLE / NOT_COMMITTED ทุกครั้ง** (5 ราย · stage PREPARATION) แถบแดง "ไม่ได้บันทึกข้อมูลทางคลินิก ร่างยังคงอยู่" · Comment ใน SBH-3918 แล้ว · เปิดฟอร์มรอบถัดไปอาจขึ้น "ลบร่างของคุณแล้ว" (ร่างหาย) แล้วกดบันทึกได้ 200 แต่เป็นฟอร์มว่าง
- dropdown `เลือกฟอร์ม` หุบเองระหว่างเลื่อน (รายการโหลดใหม่) → วน `toPass` เปิดใหม่เมื่อ `.rc-virtual-list-holder` หาย
- เวชระเบียน › แก้ไขข้อมูลผู้ป่วย (dev-x รุ่นนี้): `searchbox-trigger-nationality-searchbox` / `…occupation-searchbox` (cmdk · ค้นด้วย `[cmdk-input]`) · `mobile-phone-input` (ตัวแรก = มือถือ) · ที่อยู่เป็นช่องเดียว `address.officialAddressLine` + ปุ่ม ค้นหาที่อยู่ (dialog combobox) + `copy-address-form-button` "บ้านเดียวกัน" · `submit-button` → PUT `/new-demographic-api/patients/<id>`
