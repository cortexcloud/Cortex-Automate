# ER Patient List (แดชบอร์ด / คิว มุมมอง "รายการ") รุ่น SBH-3181

dev-x 3 พ.ย. 2026 · ไฟล์แอป `index-BneIKgug.js` / `index-5sq_loja.js` · URL `/cortex/er/dashboard?view=list` · สเปก `tests/modules/er/SBH-3181-er-patient-list.spec.ts`
(รุ่นเก่าก่อนการ์ดนี้ — คอลัมน์ Lab / ยา / IMG แยก · เวลารอ / เวลารับเข้า — อยู่ใน screens/er.md หัวข้อของ SBH-2391 · helper เดิม `helpers/functions/er-list.ts` ยังใช้ได้: erListTab / erListRow / erListCell / openErListTab / gotoErPatientList)

## Locator ที่ใช้ได้จริง

- แถบตัวนับ: `main button[class*="_summary-button_"]` — "ทั้งหมด n" · "1 กู้ชีพ n" · "2 ฉุกเฉิน n" · "3 เร่งด่วน n" · "4 กึ่งเร่งด่วน n" · "5 ไม่เร่งด่วน n" · "รอคัดกรอง n" · เลือกแล้ว `aria-pressed=true` + URL `&esi=` · นับตามแท็บ + ตัวกรองที่เลือก (บอร์ดนับรวมทุกสถานะ)
- ช่องค้นหา `getByPlaceholder('ค้นหา HN หรือชื่อ')` (ไม่จำค่า) · ตัวกรองโซน = `.ant-select` ตัวแรกใน main (multiple · ตัวเลือก `Urgency (4)` · เลือกแล้ว class `ant-select-item-option-selected` — **ไม่มี aria-selected บน div ที่มองเห็น**) · ช่องแสดงแค่ "โซน (n)" · ชิปใต้แถบเป็นข้อความ "โซน: Urgency ×" → `getByText(/^โซน:\s*Urgency$/)` · ตัวกรองแพทย์ = `.ant-select` ตัวที่ 2 (virtual list ~250 คน · จำคำค้นค้างไว้ในช่อง) · ปุ่ม `ตัวกรองเพิ่มเติม (วันที่, เวลา)` เปิด popover ช่อง "วัน" + "เวลาเริ่ม → ถึง" · ปุ่ม `reload ล้าง` (`getByRole('button', { name: /ล้าง$/ })`)
- จำตัวกรองโซน / การตั้งค่าคอลัมน์: localStorage `er-patient-list-prefs:v1:<userId>` = `{zones, columns:{order, hidden}}` + URL `zones=` · ไม่ส่ง API · ไม่ได้เก็บที่ server
- ตาราง: หัวเริ่มต้น 13 คอลัมน์ คิว · ESI · ชื่อ-สกุล · HN · อายุ · เพศ · โซน · MEWS · GCS · Order · ชำระเงิน · แพทย์ · สถานะ (แท็บรอจำหน่ายมี "จัดการ" เพิ่ม) · หัวเรียงได้ `th.ant-table-column-has-sorters` (ESI · ชื่อ-สกุล · อายุ · โซน · MEWS — `aria-sort`) · คอลัมน์ตรึงซ้าย `.ant-table-cell-fix-start` (ไม่ใช่ fix-left) · หัว sticky `.ant-table-sticky-holder`
- ป้าย ESI `[class*="_esi-badge_"]` (`data-level`) · บอร์ด `[class*="_triage-badge-esi-"]` สีเดียวกัน · โซน `[class*="_zone-tag_"]` · MEWS `[class*="_mews-badge_"] .ant-tag` (success / error) · GCS `[class*="_gcs-compact_"]`
- Order: ปุ่ม aria-label `แจ้งเตือนผล LAB` · `รายการยาที่ต้องดำเนินการ` · `รายการ Imaging` · `สถานะหัตถการ` · `รายการ Consult` · สถานะที่ `[data-tone]` (none · pending · done · critical · unavailable ระหว่างโหลด) · เป็นไอคอน ไม่มีตัวอักษร · ไม่มี legend · tooltip "Lab: รอดำเนินการ / คลิกเพื่อดูรายละเอียด"
- กฎสี (โค้ด resolve*OrderChipState): Lab — ถูกปฏิเสธ / alert ที่ยังไม่ acknowledge = critical · ครบ RESULTED/PERFORMED = done · Consult — completed / rejected = done · priority urgent / emergency = critical · Imaging / หัตถการ — REPORTED ครบ = done · STAT = critical · ยา — มีรายการค้าง = pending · completedItemCount > 0 = done
- แถว `tr.ant-table-row[data-row-key=<EN>]` class `_row-clickable_` → คลิกเซลล์ไหนก็ได้ไป `/cortex/next/patients/<HN>?en=<EN>&vn=<VN>` · ปุ่มเขียนข้อมูลในแถว: `เรียกคิว <เลข>` · `จบคิว <เลข>` (ใหม่) · `แก้ไขสถานะคอลัมน์ ชำระเงิน ด้วยตนเอง` · `จำหน่าย`
- แผงคอลัมน์: ปุ่ม `คอลัมน์` (ไอคอน setting) → `.ant-popover` "เลือกและเรียงคอลัมน์ 13/19" · ล็อก คิว / ESI / ชื่อ-สกุล (checkbox disabled + แท็ก "ล็อก") · ปุ่ม `เลื่อน <ชื่อ> ขึ้น/ลง` · `คืนค่าเริ่มต้น` · ติ๊กมีผลทันที ไม่มีปุ่มบันทึก · **ปิดแผง: คลิกพื้นที่ว่าง** (Esc แล้วกดปุ่มซ้ำตอนกำลังปิด = เปิดกลับ)
- ตัวเลขแท็บ `[class*="_tab-count_"]` (`data-empty`) 0 = สีเทาจาง · ตารางว่าง `.ant-table-placeholder .ant-empty-description`: แท็บว่าง "ไม่มีผู้ป่วยในสถานะนี้" · กรองโซน "ไม่มีผู้ป่วยในโซนที่เลือก" · ตัวกรองอื่น / ค้นหา "ไม่มีผู้ป่วยตรงกับตัวกรอง" + ปุ่ม `ล้างตัวกรอง`
- บอร์ด: หัวคอลัมน์เป็น `<strong>` Triage · Resuscitation · Urgency · **Zone Isolate** (ป้ายเลข 1/2 บนการ์ด) · Observation · ED Boarding (ไม่มีผู้ป่วยรอเตียง = ไม่แสดง) · บอร์ดเลื่อนในกล่องของตัวเอง (`window.scrollTo` ไม่มีผล → `card.scrollIntoView({block:'center'})`) · หาคอลัมน์ของการ์ด = หัวที่ x ≤ การ์ด.x + 40 ซ้ายสุดใกล้สุด

## อาการที่เห็น (3 พ.ย. 2026)

- อายุต่ำกว่า 1 ปีแสดง "-" ในตาราง (บอร์ด / หน้าผู้ป่วยแสดง 11 เดือน 15 วัน) · เรียงอายุแล้วไปอยู่ท้าย (TC-056 / 065 ไม่ผ่าน)
- แพทย์ placeholder (id 316 "ไม่ระบุแพทย์ ไม่ระบุแพทย์") แสดงชื่อเต็มสีปกติ · หน้าต่างเปิด Visit ER ไม่มีช่องแพทย์ — ระบบใส่แพทย์ตามตารางเวรห้องฉุกเฉินให้เอง (เปิดด้วยบัญชี Nurse ก็ได้แพทย์) → สร้างผู้ป่วยไม่มีแพทย์เองไม่ได้
- ผู้ป่วยไม่ระบุเพศ: ฟอร์มผู้ป่วยใหม่ ER มีแค่ ชาย / หญิง → ใช้แท็บ **"ผู้ป่วยระบุตัวตนไม่ได้"** (ชื่อชั่วคราว · อายุโดยประมาณ · เพศไม่บังคับ) → gender null แสดง "? ไม่ระบุเพศ"
- **ฟอร์มผู้ป่วยใหม่ ER รับปีเกิดเป็น พ.ศ.** (ตั้งแต่ ~23 ต.ค.) — `newTestPatient()` พิมพ์ 15/01/1990 จึงได้วันเกิด 1447 (อายุ 579 ปี) · พิมพ์ DD/MM/(ค.ศ.+543) แล้วยืนยันจาก `/new-demographic-api/patients` (spec SBH-3181 `beInput`) · คำนำหน้า "นางสาว" ไม่มี (มี "น.ส.") — `registerNewPatient` เพศหญิงพัง
- ฟอร์ม Consult ของ ER มีความเร่งด่วน Elective / Urgency / Emergency → `requestConsult(page, problem, to, 'er', 'Emergency')`
- เมนูผู้ใช้มุมขวาบน: แก้ไขข้อมูลของฉัน · คำสั่งรอยืนยัน · รับ Consult · ตารางงาน · ดูการตรวจ นศพ. · **ลงชื่อออก**

## SBH Prod (6 พ.ย. 2026 · การ์ด SBH-3181 · ไฟล์แอป `index-BoC124P0.js` → deploy `index-B30_rCX7.js` ระหว่าง 14:21–14:28 · chunk หน้ารายการ `useErPatientListView-*.js`)

- ฟีเจอร์ขึ้น Prod ครบ (ตรวจด้วยการไล่ chunk หา `er-patient-list-prefs` / `_summary-button_` — ไฟล์ index หลักไม่มี ต้องไล่ chunk ย่อย ~618 ไฟล์)
- **ตารางแบ่งหน้าละ 20 แถว** (ปุ่มเลขหน้า + "20 / หน้า" ล่างตาราง) · ข้อความ "แสดง n ราย" นับทั้งหมด แต่ DOM มีแค่หน้าปัจจุบัน → `readTable()` ในสเปกไล่ปุ่มเลขหน้าแล้วกลับหน้า 1 · ขั้นที่เปิดแผงคอลัมน์ / ต้องการแถวบนจอ ใช้ `readTablePage()` (กดเลขหน้า = คลิกนอกแผง แผงปิด) · ตารางเทียบ `side:'bottom'` บังปุ่มเลขหน้า → ไปหน้าที่ต้องการก่อนขึ้นตาราง
- ตัวกรองแพทย์ **จำคำค้นค้างในช่อง** — เลือกแพทย์คนที่ 2 ต้อง Ctrl+A + Backspace ก่อนพิมพ์ ไม่งั้นคำค้นต่อกันแล้วเลือกไม่ติด · แพทย์บัญชีหลัก (user1) = ดร. วิชัย รัตน์ เอื้อเฟื้อ · ผู้ป่วยอุบัติเหตุหมู่ = "นาย ไม่ระบุแพทย์ ไม่ระบุแพทย์"
- หลัง Logout / Login แอปโหลดใหม่ ~20 วิ — รอแถวในตารางขึ้นก่อนตีกรอบ (ภาพแรกได้จอ spinner)
- อายุต่ำกว่า 1 ปีแสดง "-" และเรียงไปท้ายทั้ง 2 ทิศ (เหมือน dev-x · BA ยืนยันให้แสดงได้) · บอร์ดยังใช้ "Zone Isolate" · tooltip ชิป Lab ไม่มีชื่อ order
- ชิป Order สีเขียว: บน Prod สร้างด้วย Consult ที่ตอบแล้วไม่ได้ (ดู screens/sbh-prod.md "Consult จาก ER")
- **ชิปยา (Prod 6 พ.ย. ตรวจจากโค้ด + ข้อมูลจริง)**: ข้อมูลจาก graphql `GetVisitMedicationStatusSummaries(vns)` → `{ completedItemCount, items[{source PENDING_MEDICATION_ORDER|PRESCRIPTION, status WAITING_RECEIVE|WAITING_REVIEW, pharmacyRoom}] }` · มี item ค้าง = pending (ส้ม) · ไม่มีค้างและ completedItemCount > 0 = done (เขียว · tooltip "ยา: จ่ายแล้ว n ใบสั่งยา") · **สร้างใบยาแล้วยังไม่จ่าย = ส้ม** · ทำเขียวบน Prod: One Day Order MED0000619 + ส่งคำสั่ง → ห้องยาชั้น 1 `createPrescriptionAt` → `chargeItems` + ยอด 0 = `createInvoicesOnly` → จัดยาแล้ว / ยืนยันรอจ่าย / จ่ายยา (เทส `@P3181-med`) · ห้องยาบน Prod ช่องเลขที่ใบยาในแถวเป็น "01001" (ไม่มี " - ชื่อ") → `dispensePrescription()` ของ BizSim คลิกไม่เจอ ใช้ `td.nth(1)`
