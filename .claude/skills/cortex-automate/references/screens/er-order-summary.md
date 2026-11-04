# ความรู้หน้าจอ — Order Summary ของ ER (Note แพทย์ / พยาบาล · Sign · งานยาพยาบาล · ส่วนก่อน admit)

แยกจาก `screens/er.md` (ไฟล์นั้นเกิน 100 KB) · ส่วนปุ่มงานพยาบาลของ หัตถการ / รังสี / Lab / เวชภัณฑ์ (SBH-3158) ยังอยู่ที่ `er.md` หัวข้อ "Order Summary ER"
สเปก: `tests/modules/er/SBH-2593-order-summary-improve.spec.ts`

### SBH-2593 Improve Order Summary ER (dev-x 31 ต.ค. 2026 · ไฟล์แอป index-CAlFiC-E.js → DJaj9lPY.js ระหว่างวัน · locale `/cortex/locale/th/er-order-summary.json`)

**ข้อมูลตั้งต้น**
- ยาบน dev-x ที่ใช้ได้ (R25): `med0000006` UTO LINCOMYCIN · `med0000007` GPO-L-ONE (NED) · `med0000008` CLINDAVID-300 — **`med0000005` เพิ่มลงตะกร้าไม่ผ่าน** (กดแล้วไม่มีคำสั่งออก · ตรงกับ SBH-1181 ที่เจอ Route ผิด)
- ฟอร์มยาใน One Day Order ต้องมี ขนาดยา · Route · ความถี่ · จำนวนที่จ่าย → ใช้ `addMedicineToCart` (mock-data/uat-play.ts) + บังคับ **OralRoute** ใน `beforeAdd` (helper บางรอบเลือก OticRoute → "เกิดข้อผิดพลาดในระบบ")
- **ยาที่อยู่ในตะกร้า (ยังไม่กด ส่งคำสั่ง) = ยังไม่ลงนาม** → Order Summary แสดงแถวพร้อมปุ่ม `Sign` · กด ส่งคำสั่ง ใน One Day Order = ลงนามทั้ง EN (`submitOrders(page, [])`)
- เพิ่มยาตัวเดิมซ้ำ: Drug Alert "Drug Duplication" (timeBasis CURRENT_ORDER) ตอนเพิ่มลงตะกร้า → ใส่เหตุผล + ยืนยันการสั่งออเดอร์ · `addMedicineToCart` ไม่กดเพิ่มถ้ามีแถวรหัสเดียวกันอยู่แล้ว → ต้องกด `plus เพิ่มลงตะกร้า` เอง
- **ลงนาม Disposition แล้วยาที่ค้างลงนามทั้งหมด (รวมที่เพิ่มทีหลัง) กลายเป็นลงนามแล้ว** — ห้ามทำ Disposition ระหว่างเทส Sign

**ER OPD (ยังไม่มี AN)**
- คอลัมน์ซ้าย: ปุ่มหัวส่วน `Progress Note (แพทย์) <n> รายการ ล่าสุด <วัน เวลา>` (`aria-expanded`) + `เพิ่ม Progress` · ล่าง `Nurse Focus Note (พยาบาล) <n> Focus ล่าสุด …` + `เพิ่ม Nurse Note` + แท็บ Focus / Resolved · ไม่มี dropdown · บัญชี Nurse ไม่เห็นปุ่ม `เพิ่ม Progress`
- เพิ่ม Progress → dialog `Progress Note (แพทย์)`: Perform time (datetime-local) + textbox S / O / A / P (คลิกแล้วพิมพ์) → `บันทึก` → `POST …/openehr/v1/ehr/<ehr>/contribution` 201 → รายการ "<วัน เวลา> · สร้าง: <ชื่อ> · รายละเอียด S: O: A: P:"
- เพิ่ม Nurse Note → dialog แบบเดียวกับ ER Nursing Records (`fillNurseNote` / `saveNurseNote` ใน er-nursing-records.ts) → การ์ด `F: <Focus>`
- ปุ่มหัวส่วนกดพับ / ขยาย: `aria-expanded` true ↔ false · พับแล้วรายการหาย หัวยังมีจำนวน + เวลาล่าสุด
- ORDER FOR ONE DAY: การ์ดหัว `ยา` (คอลัมน์ … · ลงนาม · … · Action) · ปุ่มบนตาราง `Sign All (n)` (n = ค้างลงนาม) · `รับ Order ทั้งหมด (n)` (n = รอรับ รวมหัตถการ) · ไม่มีคอลัมน์สถานะงานพยาบาล / ห้องยา
- แถวยังไม่ลงนาม: ปุ่ม `Sign` อย่างเดียว · ลงนามแล้ว: ช่องลงนามเป็นไอคอนถูกสีเขียว + ปุ่ม `รับ Order` `ให้ยาแล้ว` `ยกเลิก Order` (รับแล้วเหลือ ให้ยาแล้ว / ยกเลิก Order · ให้ยาแล้ว / ยกเลิกแล้ว ไม่มีปุ่ม)
- Sign ในแถว → graphql `SignOPDOrders {en, requestIds:[1 ตัว]}` → แจ้งเตือน `ส่งคำสั่งสำเร็จ` (ไม่มี dialog) · ติ๊กหลายแถว → แถบ `[class*="_bulk-bar_"]` "เลือก n รายการ" ปุ่ม `Sign (n)` `รับ Order (n)` `ให้ยาแล้ว (n)` `เสร็จสิ้น (n)` `ยกเลิก Order (n)` `ล้างการเลือก` — นับเฉพาะรายการที่ทำได้ (ติ๊กยาที่ยังไม่ลงนาม = Sign (1) · ปุ่มพยาบาล (0) กดไม่ได้)
- ให้ยาแล้ว → dialog `บันทึกให้ยาแล้ว` (ผู้ให้ยา select + เวลา) → `…/complete` · ยกเลิก Order → dialog `ยกเลิก Order` แจ้ง "ยกเลิกเฉพาะงานของพยาบาล คำสั่งยา ใบยา และค่าใช้จ่ายยังอยู่ …" · เหตุผล (ไม่บังคับ) ผู้ป่วยปฏิเสธ / แพทย์สั่งหยุด / อื่น ๆ + หมายเหตุ → `ยืนยันยกเลิก` / `ปิด`
- "รวมค่าใช้จ่าย (วันนี้)" ใน Order Summary = แถว `รวมทั้งหมด` แถวเดียว (หน้า One Day Order ยังแยก MEDICATION / ACTIVITY …)
- **บัญชี Nurse (x-nurse) เห็นปุ่ม `Sign` / `Sign All` ด้วย** (AC สิทธิ์ไม่อยู่ในรอบทดสอบ — ข้อสังเกต)
- งานยาใน API `GET /er/nurse-tasks?en=` source MEDICATION · `sourceRef.itemId` = requestId · PENDING / RUNNING / DONE / CANCELLED · ผู้ป่วยสำรวจ: แถวที่ออกใบยา + ลงนาม Disposition แล้วเป็น RUNNING เองโดยไม่ได้กด รับ Order (ยังไม่รู้ว่าขั้นไหนทำ — เทส C จดก่อน / หลังออกใบยา)

**ห้องยา / การเงิน**
- ยา ER ที่ลงนามแล้วเข้า **ห้องยา A** (ช่องบริการตัวแรก = 5) แท็บ Order รอยืนยัน · คิว R00x · คลินิก "ER - ห้องตรวจนอกเวลาราชการ" · ห้องยาชั้น 1 / ผู้ป่วยนอก 1 ไม่มี · หน้ารับออเดอร์แสดงเฉพาะยาที่ลงนามแล้ว · `สร้างใบยา` → `POST /opd/prescriptions` {prescriptionId} (แจ้ง "พิมพ์ใบสั่งยาและฉลากยาไม่สำเร็จ" — ไม่มีเครื่องพิมพ์ ไม่กระทบ)
- ใบยา: `GET /cortex-api/prescriptions/<เลข>` → medications[].careflowStep ("Prescription issued") / currentState
- การเงิน `/cortex/cashier/patients/<HN>/accounts/<VN>/charge-items`: แถว Encounter "… order ยืนยันแล้ว <เลขใบยา> - รอจัด" + แถวค่าใช้จ่าย "med000000x - … รอตั้งเบิก"

**ER IPD (มี AN)**
- มุมมองเปลี่ยนเมื่อ `GET /er/encounters/<EN>` มี `an` — **AN จากเมนูขวา "จัดการ Admission" ไม่ผูก** (`an: null` แม้ลงนาม Disposition แบบ "รับไว้รักษาต่อIPD") · ต้อง Admit Request → แอป **ศูนย์จัดการเตียง** `/cortex/admission-center/admission-management?tab=admit-request-list` แถว HN → `สร้าง AN` (หน้า `?admitRequestId=…&actions=admission`) → เลือก เลขเตียง (SBH0xx) · ประเภทการรับ Admit · รับ Admit จาก → `check ส่งข้อมูล` → ยืนยัน → `บันทึกข้อมูลสำเร็จ “AN <เลข>”` (ผู้ป่วยที่มี AN แบบไม่ผูกอยู่แล้วสร้างซ้ำได้ "เกิดข้อผิดพลาดในระบบ") · การจองเตียงผู้ใช้อนุญาตเฉพาะการ์ดนี้ (R80)
- หน้า: แถบ `สั่งบน AN <AN> · รอเตียง` + `รีเฟรชสถานะการ admit` · ปุ่มหัว `ORDER FOR ONE DAY (ก่อน admit) <n> รายการ ราคารวม … เครดิต … จ่าย …` **เปิดมา aria-expanded=false** (careMenu ที่คลิก ready = หัวส่วนนี้ จะขยายมันเอง — ห้ามใช้หัวส่วนเป็น ready) · ขยายแล้วไม่มีการ์ด ICD9-CM / Instrument ที่ว่าง · ไม่มีคำสั่งก่อน admit = ไม่มีส่วนนี้
- ส่วนของ AN: ตัวเลือก สรุปรายวัน / สรุป Admission / Sign All / Show Inactive / แสดงแบบแท็บ · คอลัมน์ Note แบบ ER · ORDER FOR ONE DAY แถบ `รับไว้รักษา: … วันที่รับเข้าเตียง: - วันที่สร้าง AN: … PDx: K30 - Functional dyspepsia` + "Admit Ward … สั่งโดย …"
- หอผู้ป่วย `/cortex/next/patients/<HN>?an=<AN>&fromApp=ipd` แผง IPD Summary ตั้งต้น "แสดงแบบฟิลเตอร์" (มีแถบรับไว้รักษาเดิม) · "แสดงแบบแท็บ" = Note มี dropdown `แพทย์` / พยาบาล · ไม่มีแถบรับไว้รักษา

- **ปุ่ม `+` ท้ายหัว ORDER FOR CONTINUE** (context ER `fromApp=er` ผู้ป่วยมี AN รอเตียง · dev-x 4 พ.ย. 2026): เปิดหน้าต่างลอย `Physician Order` (ประเภท `One Day Order` / `Continue Order` · ค้นหา · ตะกร้า · ปุ่ม `บันทึก` หัวหน้าต่าง) — **บันทึกไม่ได้ทุกแบบ** toast "บริบทของคำสั่งยาไม่ถูกต้อง" (`upsertIpdOrder` → ErrMedicationOrderInvalidContext · ส่ง encounterEn = EN ER) = บั๊ก SBH-3884 · สั่งบน AN ให้ใช้ context IPD (`ipdContinueOrder` ใน helpers/functions/ipd-admit.ts) · เมนูขวา context ER ไม่มี `Physician Order` มีแค่ `One Day Order` (แผง Order แบบ OPD) · หัตถการในหน้าต่างนี้ปุ่มชื่อ `เพิ่มลงตะกร้า` (ยา = `เพิ่มออเดอร์`) · ยาที่กด `เพิ่มออเดอร์` เร็วก่อนวิธีใช้สร้างเสร็จ ขึ้น toast "กรุณาระบุวิธีใช้งาน" (รอ ~2.5 วิ หลังกรอกขนาดยา) · ยาซ้ำกับที่สั่งบน AN แล้ว เด้ง `Drug Alert` ต้องกรอก `ระบุเหตุผล` → `ยืนยันการสั่งออเดอร์`

**OPD (ไม่กระทบ)**
- ไม่มีเมนูขวาชื่อ Order Summary · เมนู `คำสั่งการรักษา` + สวิตช์ `ดูรวม` (`[class*="_opd-summary-version-switch_"] [role=switch]`) V2 (checked) = Order Form · V1 = แบบ Order Summary (คอลัมน์ ลงนาม · การ์ด ICD9-CM "ไม่มีข้อมูล" + Add ICD9-CM · Instrument) — ทั้ง 2 แบบไม่มีปุ่มงานพยาบาล · สลับแล้วคืนค่าเดิม
- ผู้ป่วย OPD ใช้อ่าน: AUTO MockOrder1022140821 HN 6932050 · V69102227565 · E69102232339 (med0000008 + ECG + Lab + X-ray ส่งคำสั่งแล้ว)

**ผู้ป่วยสำรวจ 31 ต.ค. (AUTO · ทิ้งไว้ R11)**: Os2593X HN 6932341 (Disposition With Approval ลงนามแล้ว · ใบยา 691031-01001) · Os2593Y HN 6932352 (AN 6903027 แบบไม่ผูก + Admit Request ค้าง · Disposition รับไว้รักษาต่อIPD) · Os2593Z HN 6932356 (AN 6903029 ผูก ER · เตียง SBH009)

### SBH-2265 ปุ่มเมนู "พิมพ์บัตรคิวและใบนำทาง ER" (dev-x 3 พ.ย. 2026 · ไฟล์แอป index-D-2VfyUS.js · flag `reception.visit-slip.print` = true)

- ปุ่ม `getByRole('main').getByRole('button', { name: 'พิมพ์บัตรคิวและใบนำทาง ER', exact: true })` มุมขวาบนของ Order Summary (อย่าใช้ regex /พิมพ์บัตรคิว/ — ชนปุ่ม "พิมพ์บัตรคิว / พิมพ์ OPD Slip" ที่แถบหัวผู้ป่วย) · แผง Overview ที่โหลดตามหลังทับ Order Summary → วนกดเมนูจนปุ่มนี้อยู่ 3 วิ
- หน้าต่าง `getByRole('dialog', { name: 'พิมพ์บัตรคิวและใบนำทาง ER' })`: หัว "คิวรับยา การเงิน และบริการ" + แถว `div.ant-flex-justify-space-between` ข้อความ "คิวการเงินชั้น 1 · R001" / "คิวรับยาหุ่นยนต์ (Robot) · R001" + ปุ่ม `พิมพ์บัตรคิว <เลข>` — **แถวคิวโหลดตามหลัง destinations** (อ่านทันทีได้ 0 แถว → `expect.poll` count > 0) · คิวเกิดเมื่อมียาที่ส่งคำสั่งแล้ว
- กดพิมพ์บัตรคิว → `POST /cortex-api/queues/print {queueFifoIds:[…]}` → zip `queue-1.pdf` แล้วส่งงานพิมพ์ `localhost:8081/print/thermal` (ดักด้วย `captureGeneratedDocs` + `capturePrintJobs`) · บัตร ER หัวข้อ / การจัดวางเหมือนบัตร OPD ทุกบรรทัด
- section `section[aria-label="ใบนำทางไปจุดบริการอื่น"]` component เดียวกับ OPD (SBH-2233) · หน้าต่างเรียก `GET /visits/<VN>/visit-slip/destinations?en=<EN ของ ER>` → `[]` ทุก Visit ER (Order จาก ER ได้ Encounter LAB / IMAGING / ACTIVITY ของตัวเอง) → "ไม่มีจุดบริการถัดไปสำหรับ Visit นี้" = บั๊ก SBH-3879 · ไม่ส่ง en: Lab → QSU 2 "ห้องเจาะเลือด ชั้น 1" · Imaging / Activity (PROC1) จาก ER = "destination location is incomplete"
- รหัสหน่วยบริการ dev-x (graphql `queueServiceUnits{id code info}`): `23` = QSU 344 ห้องปฏิบัติการ ชั้น 6 · `q-img` = QSU 23 ห้อง(X-ray) · `100` = QSU 347 ห้องหัตถการ · `q-lab` = QSU 2 · `q-echo` = QSU 36 (ECG 89.52)
- หัตถการ: `NUH-OS-ACT-019` / `NUH-OS-ACT-024` เพิ่มลงตะกร้าไม่ได้ · `PROC1` ส่งได้ · ยังไม่พบหัตถการที่ไปห้องหัตถการ
- ฟอร์มคัดกรอง ER (dev-x 3 พ.ย.): ช่อง "โซน *" บังคับ ระบบไม่เลือกโซนแนะนำให้แล้ว → กดปุ่มโซนที่มีป้าย "แนะนำ" ก่อน `saveErTriageForm` (helper ร่วมยังไม่เลือกให้ — แก้ในสเปก SBH-2265)
- ผู้ป่วย: A HN 6932607 (VN V69110328273 · ปิด Visit ไม่ได้ 400 ErrAccountHasUninvoicedItems — ทิ้งไว้ R11) · B HN 6932610 (ปิดแล้ว) · OPD สำหรับบัตรคิวเทียบ HN 6932033 (SBH-2233)
