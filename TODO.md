# TODO

## ลงทะเบียนผู้ป่วยได้ 2 ช่องทาง (ER / Reception) + แก้ปีเกิด พ.ศ. — 22 ต.ค. 2569

ข้อตกลง: `createPatients` รับ `channel: 'er' | 'reception'` · ไม่มีค่าเริ่ม ต้องเลือกเอง (เสนอ `npm run data:patients:er` / `:reception` แทน `data:patients` — รอยืนยันตอนผู้ใช้สั่งเริ่ม) · Reception สุ่มที่อยู่แบบ d และเก็บลง JSON · JSON เพิ่ม `channel` (a–j = `er`) · ER กรอกปี พ.ศ. + เช็ควันเกิดจาก response (กระทบ spec SBH-1013/1021) · แก้วันเกิด j (HN 6932042) เป็น 05/05/1986 ที่เวชระเบียน

- [x] **P1 — ER: กรอกปีเป็น พ.ศ.** — `helpers/data/test-data.ts` เพิ่ม `toBuddhistDate()` / `toIsoDate()` · `registerNewPatient` พิมพ์ปี พ.ศ. แล้วเช็ค `patient.data.birthDate` จาก response ต้องเท่ากับวันเกิด ค.ศ. (response มี field นี้ — ยืนยันจากรันจริง) · ข้อมูลใน `NewPatient`/JSON ยังเป็น ค.ศ. · ตรวจ: typecheck ผ่าน · รันจริง 1 คนได้ k (HN 6932043, หญิง) กรอก 01/10/2549 → API คืน `2006-10-01` ตรงกับไฟล์
- [x] **P1 — สำรวจหน้า "สร้างผู้ป่วยใหม่" ของ Reception** — `/cortex/reception/create-patient` (iframe `/reception/embedded/create-patient`) ช่องชุดเดียวกับฟอร์มแก้ไข · ช่องบังคับ: ประเภทยืนยันตัวตน (มีค่าเริ่ม), หมายเลขบัตร, เพศ (`male - เพศชาย` / `female - เพศหญิง`), คำนำหน้า, ชื่อ, นามสกุล, วันเกิด พ.ศ., อายุ (เติมเองจากวันเกิด — ยืนยันในฟอร์มแก้ไข), ที่อยู่ 2 ชุด · ไม่ได้กดบันทึก (ผลหลังบันทึกดูตอนรันจริง P2)
- [x] **P1 — `helpers/functions/reception.ts`** — `receptionFrame`, `openReceptionCreatePatient`, `openReceptionEditPatient` (รอข้อมูลเดิมโหลดเสร็จ — ไม่งั้นค่าที่กรอกโดนเขียนทับ), `selectReceptionNamePrefix`, `fillReceptionBirthDate` (พ.ศ.), `fillReceptionPatient`, `fillRandomReceptionAddress`, `saveReceptionPatient` (รอ POST/PATCH `new-demographic-api/patients`), `expectReceptionSearchResult`, `expectSavedBirthDate` · `test-data.ts` เพิ่ม `randomHouseNumber`/`randomMoo` · `createPatients({ channel })` แยก `registerAtEr`/`registerAtReception` และเช็คคำนำหน้า + วันเกิดหลังจดลงไฟล์ (ฝั่ง ER เปลี่ยน assert วันเกิดใน `registerNewPatient` เป็น soft ไม่ให้ผู้ป่วยที่สร้างแล้วหลุดจากไฟล์) · `StoredPatient.channel` + เติม `er` ให้ a–k · `clearMarks` ล้างกรอบหลักฐานทุก frame (กรอบใน iframe ไม่ถูกล้าง) · ตรวจ: typecheck ผ่าน · ฝั่งแก้ไขผ่านจากการแก้ j · ฝั่งสร้างตรวจใน P2
- [x] **P1 — แก้วันเกิด j** — `temp_scripts/fix-j/` (config + spec ชั่วคราว) ใช้ function ของ `reception.ts` · รอบแรก fail: กรอกก่อนฟอร์มเติมข้อมูลเดิมเสร็จ ค่าโดนเขียนทับ ไม่มีการบันทึก → แก้ `openReceptionEditPatient` ให้รอ · รอบสองผ่าน: PATCH คืน `1986-05-05`/นาย · API ยืนยัน `1986-05-05` · ที่อยู่สุ่ม 37 หมู่ 3 ต.บางขัน อ.บางขัน จ.นครศรีธรรมราช · JSON j เพิ่ม address + note
- [x] **P2 — npm script + spec** (ทำพร้อม P1 เพราะ spec ต้องส่ง `channel` ถึงจะ compile ผ่าน) — แทน `data:patients` ด้วย `data:patients:er` / `data:patients:reception` · spec อ่านช่องทางจากชื่อ script หรือ `PATIENT_CHANNEL` · ไม่เลือก = ข้ามพร้อมข้อความบอกวิธีเลือก · ช่องทาง reception เช็คผลด้วยการค้นชื่อที่เวชระเบียน · ตรวจ: typecheck ผ่าน · รันไม่เลือกช่องทาง → 1 skipped
- [x] **P2 — รันจริง** — ER: k (HN 6932043) ผ่านตอนทำ P1 · Reception: ฟอร์มเวชระเบียนเปลี่ยนเป็นแบบใหม่ช่วง ~13:27–13:59 22 ต.ค. (ที่อยู่ช่องเดียว "บ้านเลขที่ / หมู่ / ซอย / ถนน" + ปุ่ม "ค้นหาที่อยู่") ตอนนั้นกดบันทึกแล้วไม่มี request/error/toast เลย แม้เติมช่องที่ไม่บังคับทีละช่อง (ประเภทผู้ให้ข้อมูล, เบอร์มือถือ, ผู้ติดต่อฉุกเฉิน) → ต่อมาหน้ากลับเป็นแบบเดิม และบันทึกผ่านทันทีด้วยช่องบังคับอย่างเดียว → **ไม่มีช่องบังคับที่ซ่อนอยู่** ฟอร์มแบบใหม่น่าจะยังใช้ไม่ได้/กำลัง deploy (ยังไม่ยืนยัน) · `fillRandomReceptionAddress` รองรับทั้ง 2 แบบ (ดูจากหน้าก่อนว่าแบบไหน — แบบใหม่ยังบันทึกไม่ได้) · ได้ l (HN 6932047, จากสคริปต์วินิจฉัย จด JSON เอง createdAt ประมาณ) และ m (HN 6932048, ผ่าน spec จริง) · ทั้งคู่เทียบ API ตรง (วันเกิด/คำนำหน้า/เพศ) + encounters = 0 · ภาพหลักฐานกรอบใน iframe ใช้ได้ · SBH-1013 `@SBH-1709` ผ่าน (สร้าง AUTO + Visit ER ค้างบนบอร์ด 1 ราย ตาม R10/R11)
- [x] **(เพิ่ม) แก้ข้อสรุปเรื่องปุ่มบันทึกเวชระเบียน** — ผู้ใช้กดบันทึกด้วยมือได้ และส่งภาพยืนยันว่าฟอร์มที่ใช้จริงคือที่อยู่แบบแยกช่อง ("กรอกตาม field เลย") · สคริปต์วินิจฉัยเจอว่าหน้าเพิ่งโหลดแสดงแบบช่องเดียวแล้วเปลี่ยนเป็นแบบแยกช่องเอง → ที่บันทึกไม่ได้ก่อนหน้านี้น่าจะเพราะกรอกระหว่างฟอร์มเปลี่ยน (ไม่ใช่ปุ่มเสีย) · ตัดทางแบบช่องเดียว (`pickRandomArea`, `randomPostalPrefix`) · เพิ่ม `waitForReceptionFormSettled()` ใน open create/edit + ก่อนกรอกที่อยู่ · timeout spec 90 วินาทีต่อคน · ได้ n, o (จากสคริปต์วินิจฉัย จด JSON เอง) และ p, q, r (ผ่าน spec — รัน 1 คน + 2 คนต่อกัน) · ตรวจ: typecheck ผ่าน · ทุกคนเทียบ API ตรง + encounters = 0 · แก้ skill §9/R29/§10 และลบหมายเหตุใน README
- [x] **P3 — docs** — skill `cortex-automate`: §2 ผังใหม่ (functions/ · flows/ · steps/ · data/ · support/ + `reception.ts`), §3 คำสั่ง `data:patients:er` / `:reception` + ทางเลี่ยง `--no-deps`, R29 เพิ่มคำตอบ 22 ต.ค., §9 วันเกิด พ.ศ. / ฟอร์มแก้ไขต้องรอข้อมูลเดิม / ฟอร์มสร้างเวชระเบียน / ฟอร์มที่อยู่ 2 แบบ, แก้ path เก่าในกฎ (ไม่แตะประวัติ §10), §10 log · README: ตารางคำสั่ง + หัวข้อ Mock data แยก 2 ช่องทาง · ตรวจ: grep ไม่เหลือ path เก่านอก §10 · commit แยกตาม task แล้ว (ไม่ push)

## Refactor รอบ 2 — แยกไฟล์ที่ไม่ใช่ page action ออกจาก `helpers/functions/` — 20 ต.ค. 2569

ข้อตกลง: `functions/` เหลือเฉพาะ Layer 1 page action (`er.ts`, `er-triage.ts`) · เพิ่ม `helpers/data/` (`test-data.ts`, `patient-store.ts`) + `helpers/support/` (`fixtures.ts`, `evidence.ts`) · ยังไม่แยก `er.ts` · ย้ายไฟล์ + แก้ import เท่านั้น ไม่แก้ logic

- [x] **P1 — `git mv` 4 ไฟล์** — ย้าย `test-data.ts`, `patient-store.ts` ไป `helpers/data/` และ `fixtures.ts`, `evidence.ts` ไป `helpers/support/` · แก้ import ใน `er.ts`, `er.flows.ts`, `patient.flows.ts`, spec SBH-1013/SBH-1021/create-patients และ comment 2 จุดใน `playwright.config.ts` · `PATIENTS_FILE` ไม่ต้องแก้ เพราะโฟลเดอร์ใหม่ลึกเท่าเดิม (`helpers/<x>/` → `../../test-data`) · ตรวจ: typecheck ผ่าน · grep ไม่เหลือ path เก่า · `playwright test --list` โหลดได้ 4 เทส ใน 3 ไฟล์
- [x] **P2 — ยืนยันว่าไม่พัง** — `--list` โหลดได้ 4 เทส · รอบแรก fail เพราะ session Super_User หมดอายุ (ไฟล์ `.auth` จาก 20 ต.ค. และ `--no-deps` ข้ามขั้นล็อกอิน) → ล็อกอินเฉพาะ Super_User ด้วย `--project=setup -g "Super_User"` แล้วรันซ้ำผ่าน: ได้ j (HN 6932042) ต่อท้าย `test-data/patients.json` ที่ path เดิม → refactor ไม่ทำอะไรพัง
- [ ] **(ย้ายไปทำใน section "ลงทะเบียน 2 ช่องทาง" ด้านบน) — (เจอตอนตรวจ P2) ช่องวันเกิดในฟอร์มลงทะเบียน ER ตีความปีเป็น พ.ศ. แล้ว** — j กรอก `05/05/1986` แต่ระบบบันทึก `1443-05-05` (1986 − 543) · ปฏิทินของช่องแสดงปี พ.ศ. (หัวปฏิทิน "ต.ค.2569") · a–i ที่สร้าง 20 ต.ค. บันทึก ค.ศ. ถูก → พฤติกรรมน่าจะเปลี่ยนหลัง 20 ต.ค. (ยังไม่ยืนยันว่าเป็น deploy ใหม่หรือบั๊ก) · กระทบ `newTestPatient()` ของ spec SBH-1013/1021 ด้วย (`15/01/1990`) · j มีบันทึกเฉพาะในไฟล์ที่ยังไม่ commit · ผู้ใช้เลือก: กรอกเป็น พ.ศ. + เช็คกับ response · แก้ j ในเวชระเบียน
- [x] **P3 — อัปเดต skill `cortex-automate` §2 + README** — ทำรวมกับ P3 ของ section "ลงทะเบียน 2 ช่องทาง" (ผังโครงสร้างใหม่ + path ใน README `helpers/data/patient-store.ts`)

## SBH-1308 — [Pharmacy] Checkbox เลือกรายการยาในหน้าใบยารอจ่าย: ร่าง TC + เทสบน dev-x — 21 ต.ค. 2569

ข้อตกลง: เทสเฉพาะ AC 1–5 (ไม่เทสสถานะ header ตอนติ๊กบางรายการ / เมนู "…" เดิม / สถานะติ๊กหลัง reload) · ติ๊กไม่ครบ = ปุ่ม "จ่ายยา" disabled ตาม comment dev · `EXE - CT - 2.8.0` · DEV-X · สร้างผู้ป่วยใหม่ + visit OPD "SBH - ห้องตรวจสระบุรี" + สั่งยา 2–3 รายการ ไม่แตะใบยาคนอื่น · สมมติฐาน: user1 + ห้องยา site SBH

- [x] **P1 — ร่าง EXE / Scenario / TC ด้วย skill `linear-testcase-writer`** → `test-cases/SBH-1308-pharmacy-dispense-checkbox.md` (ยังไม่เขียนลง Linear) — เขียนแล้ว: 1 EXE, 2 Scenario (HPY 8 TC: 001–008 · UHP 3 TC: 009–011), 11 TC atomic ทั้งหมด Required · ตาราง AC→TC + Requirement gap · ค่าที่ยังไม่รู้ (ขั้นตอนสั่งยา, ชื่อเมนูห้องยา, สถานะหลังจ่าย) ใส่ `[ยังไม่ทราบ]` · ตรวจสอบ: Final consistency check ของสกิล (ชื่อ/tag/ID plain text/ลำดับ 001–011/ทุก AC มี TC) · ไม่พบ label `QA Module: Pharmacy` ใน Linear → รอ QA ระบุ · รอ user review
- [x] **P1 — สำรวจ dev-x เพื่อเติมค่าที่ยังไม่รู้ใน TC (user สั่ง "เริ่มได้")** — ต้องเปิด VPN ก่อน (dev-x = 10.250.0.7) + user ล็อกอิน user1 เอง (permission บล็อกการกรอกรหัสจาก `.env`) · สร้าง HN 6932027 / VN V69102127519 · สั่งยา med0000005–7 ผ่าน "คำสั่งการรักษา" (ต้องมี Route) · ใบยาไปขึ้น "ห้องยาชั้น 1" (ลองครบ 7 ห้อง) · พาผ่าน สร้างใบยา → จัดยาแล้ว → ยืนยันรอจ่าย → ใบรอจ่าย · คลิก header แล้วกด "จ่ายยา" 1 ใบ (01020) เพื่อดูสถานะหลังจ่าย = "จ่ายยาแล้ว" · เจอ "เกิดข้อผิดพลาดในระบบ" จาก `queues/7458/complete` 404 หลังจ่ายสำเร็จ (รอ QA ตัดสิน) · อัปเดตไฟล์ TC: วิธีเตรียมข้อมูล 7 ขั้น, Step/Expected TC-001/005–010, gap, section "ผลสำรวจแอปจริง" · ตรวจสอบ: ภาพ 23 ไฟล์ + คลิป 2 ไฟล์ใน `.playwright-mcp/SBH-1308/explore/`, grep เหลือ `[ยังไม่ทราบ]` แค่ label QA Module
- [x] **P1 — เทส AC 1–5 บน dev-x (user approve TC 22 ต.ค. 2569)** — เสร็จ: Passed 8 · Failed 3 (005, 006, 008) — ข้อตกลง: หลังจ่ายยาถ้ายังขึ้น "เกิดข้อผิดพลาดในระบบ" → TC ที่จ่ายจริง (005, 006, 008) = **Failed** · user จะ retest manual เอง · **ยังไม่สร้าง/ร่างการ์ด bug จนกว่า user สั่ง** · ใบยา 3 ใบ (ปรับจาก 4 เพราะยาที่ส่งแล้วค้างในรายการ สั่งซ้ำอาจติดเตือนยาซ้ำ): ใบ A ใช้ TC ที่ไม่จ่าย แล้วปิดท้าย TC-008 · ใบ B = TC-005 · ใบ C = TC-006 · ภาพกรอบแดง + วิดีโอ → ใส่ Actual Result
  - [x] เตรียมใบ A — visit ใหม่ V69102227525 / EN E69102232272 (HN 6932027 เดิม) · สั่งยา med0000005–7 · พาผ่านห้องยาชั้น 1 ถึง "ใบรอจ่าย" = ใบยา 691022-01002 คิว M001 · สคริปต์ `temp_scripts/sbh1308/01–03` · ตรวจสอบ: toast "ส่งคำสั่งสำเร็จ" / "ยืนยันการตรวจสอบสำเร็จ" / "จัดยาเรียบร้อยแล้ว" / "ยืนยันสถานะใบยาสำเร็จ" + เปิดใบยาเห็นสถานะ "ใบรอจ่าย"
  - [x] รัน TC-001–004, 009–011, 007 บนใบ A (`04-run-nondispense-tcs.js`) — ผลตรง Expected ทุกข้อ (Passed 8) · อ่านสถานะจาก `aria-pressed` + สีไอคอน (เขียว rgb(19,143,81) / เทา rgba(0,0,0,0.25)) + `isEnabled` ของปุ่ม · ปุ่มที่ disabled ใช้ force click แล้วไม่มี dialog/toast · ข้อสังเกตนอก scope: header เป็น indeterminate ตอนเลือกบางรายการ, ออกจากหน้าแล้วกลับมาสถานะติ๊กหายเป็นเทาหมด · ตรวจสอบ: เปิดดูภาพ tc001-after / tc010-after กรอบถูกจุด · หลักฐาน `.playwright-mcp/SBH-1308/run/` + คลิป `01-tc-nondispense.webm`
  - [x] รัน TC-008 (ใบ A) / TC-005 (ใบ B 691022-01003) / TC-006 (ใบ C 691022-01004) — ใบ B/C ต้องเปิด visit ใหม่ (V69102227526, V69102227528) เพราะสั่งยาซ้ำ visit เดิมขึ้น Drug Alert "Drug Duplication" (ไม่ได้ override — กด "ตรวจสอบ Order" ไม่ส่ง) · ส่งคำสั่งใน visit ใหม่ขึ้น "พบยาที่ผู้ป่วยยังใช้ไม่หมด" → กด "ยืนยันสั่งต่อ" (ผู้ป่วยทดสอบเอง) · ทั้ง 3 TC: ปุ่มกดได้ → 2 dialog → "จ่ายยาสำเร็จ" + "เกิดข้อผิดพลาดในระบบ" (`queues/7466|7468|7470/complete` 404) → ย้ายแท็บ "จ่ายยาแล้ว" สถานะ "จ่ายยาแล้ว" → **Failed 3** ตามข้อตกลง · TC-005 สคริปต์ timeout ขั้นอ่านสถานะ → อ่านซ้ำหลัง reload ได้ "จ่ายยาแล้ว" (เพิ่ม timeout ใน template แล้ว) · ตรวจสอบ: เปิดดูภาพ tc005-before / tc005-after-toast · คลิป 02/04/06
  - [x] ใส่ Actual Result ครบ 11 TC + สรุปผล (Passed 8 · Failed 3) ที่หัวไฟล์ + คอลัมน์ผลในตาราง AC→TC · ตรวจสอบ: python แทนครบ 11 ช่อง, อ่านทวน Actual ของ TC-005
- [x] **P1 — ระบุ label QA Module / Sub-module** — user ตอบ "Dispense" (22 ต.ค. 2569) → ใช้ `QA Module : Pharmacy` + `QA Sub-module / Feature : Dispense` ที่มีอยู่แล้วใน Linear (ไม่ต้องสร้างใหม่) · แก้บรรทัด label ในไฟล์ TC · ตรวจสอบ: list_issue_labels เจอทั้ง 2 ตัว อยู่ใต้ group QA Module / QA Sub-module / Feature
- [x] **P2 — สร้าง EXE → Scenario → TC ใน Linear (user สั่ง 22 ต.ค. 2569)** ใต้ SBH-1308 · ยังไม่สร้าง bug · ข้อตกลง: label การ์ดแม่ **ยกเว้น `🐷 VERSION 2.8.0` (ถูก retire — user เลือกไม่ใส่ label version)** + `QA Module : Pharmacy` + `QA Sub-module / Feature : Dispense` · EXE + `QA Run : Cycle Test` · Scenario/TC + `QA Case : Happy|Unhappy` · TC + `QA Type : Functional` + `QA : Manual` (แบบ SBH-2457) · EXE/Scenario = Testing (แบบ SBH-2818/2819) · TC = Passed/Failed ตามผลรัน · TC/Scenario ID เป็น `code` · ภาพ + วิดีโอฝังในหัวข้อ "หลักฐาน"
  - [x] สร้าง EXE + Scenario HPY / UHP — EXE SBH-2871 (ใต้ SBH-1308) · TS-HPY SBH-2872 · TS-UHP SBH-2873 · ทั้งหมด Testing · ตรวจสอบ: response มี parent/label/status ถูก
  - [x] สร้าง TC 11 ใบ — TC-001..008 = SBH-2874..2881 (ใต้ SBH-2872) · TC-009..011 = SBH-2882..2884 (ใต้ SBH-2873) · Passed 8 / Failed 3 (2878, 2879, 2881) · priority ตามไฟล์ · ตรวจสอบ: response ทุกใบ status/priority/parent/label 7 ตัวถูก
  - [x] อัปโหลดภาพ/วิดีโอแล้วฝังในหัวข้อ "หลักฐาน" ของแต่ละ TC — เสร็จ 22 ต.ค. 2569 · Linear MCP กลับมาแล้ว (get_workspace = cortexcloud) · อัปโหลดครบ 40/40 ไฟล์ (รอบนี้ 29 ไฟล์ HTTP 200 ทุกไฟล์ ผ่าน `temp_scripts/sbh1308/up.sh`) · ฝังใน SBH-2875–2884 ด้วย `save_issue` แบบ patch append (ไม่แตะเนื้อหาเดิม) · caption ทุกภาพเขียนจาก Actual Result ในไฟล์ TC · ใบที่ไม่จ่ายยาใช้คลิปรวม `01-tc-nondispense.webm` · ไม่ได้ผูกเข้า Resources ตามแบบ SBH-2874 · ตรวจสอบ: ลองใบ SBH-2875 ก่อน เห็น markdown image แปลงเป็น linear-image แล้วค่อยทำที่เหลือ
  - [x] อ่านกลับตรวจทุกใบ — response หลัง save ของทั้ง 10 ใบมี linear-image ครบตามจำนวน (2/2/2/6/6/4/6/2/2/2) + ลิงก์วิดีโอ · status (Passed 8 / Failed 3) และ label ไม่เปลี่ยน · แก้บรรทัดสถานะไฟล์ TC ให้ตรง (ลบข้อความค้าง "ยังไม่สร้างการ์ด / ยังไม่ได้รัน")
  - [x] บันทึกเลขการ์ดลงไฟล์ TC — บรรทัด `- Linear: SBH-xxxx` ใต้หัวข้อ EXE / Scenario / TC ครบ 14 หัวข้อ + สถานะไฟล์บอกว่าหลักฐานยังไม่ครบ · ตรวจสอบ: script นับ heading ที่ติดเลขได้ 14
- [x] **P2 — สร้างการ์ด bug จาก TC-005/006/008 (user ตกลง 22 ต.ค. 2569)** · ข้อตกลง: รวมเป็น 1 ใบ · sub-issue ของ SBH-1308 · Severity Medium · skill `qa-bug-writer` + template QA Bug · label การ์ดแม่ (ยกเว้น version) + `QA : Bug` แบบ SBH-2812 · user retest manual แล้วยังพบ · bug = หลังจ่ายยาสำเร็จ มุมขวาบนขึ้น "จ่ายยาสำเร็จ" พร้อมข้อความแดง "เกิดข้อผิดพลาดในระบบ" (ไม่ใช่ dialog) · สถานะตามแบบ SBH-1123
  - [x] เขียนเนื้อหาการ์ด bug ตาม qa-bug-writer — ภาพ ①–⑦ (flow TC-005 + toast ของ TC-006/008) + วิดีโอ 3 คลิป ใช้ asset URL เดิม · รายละเอียดสำหรับ dev เขียน 204 dispense / 404 queues complete เป็นคำถามให้ dev ยืนยัน · ตรวจสอบ: เปิดดูภาพ tc005-after-toast ยืนยันว่าเป็นกล่องแจ้งเตือนมุมขวาบน ไม่ใช่ dialog
  - [x] สร้างการ์ด **SBH-2885** — get_issue อ่านกลับ: parent SBH-1308 · Medium · Waiting for Fixing Bugs · label QA : Bug / For OPD Biz Sim - SBH / 🍄 Improvement · response มี linear-image 7 ภาพ · หมายเหตุ: createdBy แสดงเป็น "Suchat Chancherngsilapakul" (บัญชีที่ Linear connector ใช้หลังเปลี่ยนบัญชี) ไม่ใช่บัญชี user
  - [x] ใส่ลิงก์ bug ในหมายเหตุ SBH-2878/2879/2881 (patch แทน "ยังไม่สร้างการ์ด bug (รอ QA retest manual)") + ไฟล์ TC: บรรทัดสรุปผล + บรรทัด `- Linear:` ของ TC-005/006/008
  - [x] ปรับสถานะ: SBH-1308 → Waiting for Fixing Bugs (response ยืนยัน) · SBH-2885 สร้างเป็น Waiting for Fixing Bugs · EXE SBH-2871 + Scenario SBH-2872/2873 คง Testing (รอ retest bug ผ่านค่อยย้ายเป็น Done on dev-x ตามแบบ SBH-2802)

## สร้างผู้ป่วยใหม่บน dev-x + เก็บเป็น mock data (`test-data/patients.json`) — 20 ต.ค. 2569

ข้อตกลง: ลงทะเบียนที่หน้าคัดกรอง ER (5 ช่องบังคับ) แล้วกด `ยกเลิก` ที่ modal เปิด Visit → มี HN ไม่มี Visit (แบบ R24) · เรียกเป็น function เลือกจำนวนได้ (1 หรือหลายคน) · ชื่อ `AIทดสอบ<seq>f` / นามสกุล `AIทดสอบ<seq>l` (seq = a…z → aa, ab … นับต่อจากตัวสุดท้ายใน patients.json) · เพศสุ่ม · อายุสุ่ม 18–80 ปี (ปรับ min/max ได้) · เลขบัตรสุ่ม checksum ถูก (R8) · ทิ้งผู้ป่วยไว้บน dev-x ได้ (R11)

- [x] **P1 — ต่อยอด `helpers/functions/test-data.ts`** — เพิ่ม `AiTestPatient`, `AI_TEST_PREFIX`, `nextSeq()` (ลำดับแบบคอลัมน์ Excel), `randomGender()`, `randomBirthDate(minAge, maxAge)` (คืน birthDate + age ณ วันนี้เวลาไทย), `aiTestPatient(seq, { minAge, maxAge })` · `newTestPatient()` เดิมไม่แตะ · ตรวจสอบ: typecheck ผ่าน · สคริปต์ scratchpad: a→b, z→aa, az→ba, zz→aaa · สุ่มอายุ 5,000 ครั้งคำนวณอายุจากวันเกิดตรงกับ age ทุกครั้ง ช่วง 18–80
- [x] **P1 — store `helpers/functions/patient-store.ts`** — `StoredPatient` (AiTestPatient + hn, env, createdAt), `PATIENTS_FILE` (`test-data/patients.json` อิง `__dirname` แบบเดียวกับ playwright.config), `readPatients()`, `lastSeq()`, `appendPatient()` (เขียน .tmp แล้ว rename · กัน seq/HN ซ้ำ) · ตรวจสอบ: typecheck ผ่าน · ทดสอบสำเนาใน scratchpad: ไฟล์ว่าง → lastSeq undefined, ต่อท้าย 3 คนได้ a/b/c, seq ซ้ำโยน error, ไม่มีไฟล์ .tmp ค้าง (path จริงตรวจตอนรันผ่าน Playwright ใน task รันจริง)
- [x] **P1 — flow `helpers/flows/patient.flows.ts`** — `createPatients(page, { count, minAge, maxAge, onCreated })`: ER Dashboard → คัดกรอง → วนลงทะเบียนด้วย `registerNewPatient()` → กด `ยกเลิก` ที่ modal (er-flow.md ยืนยันว่าไม่เกิด Visit) → ใช้ `trackOpenedErVisits` ดักว่าไม่มี `POST /er/visits` → `appendPatient()` ทีละคน · seq อ่านจากไฟล์ทุกคน · ตรวจสอบ: typecheck ผ่าน (พฤติกรรมบนจอตรวจใน task รันจริง)
- [x] **P2 — spec ตัวเรียก + npm script** — `tests/data/create-patients.spec.ts` (tag `@data`): env `PATIENT_COUNT` (1) · `PATIENT_MIN_AGE` / `PATIENT_MAX_AGE` (18/80) · ข้ามเองถ้าไม่ได้รันผ่าน `npm run data:patients` และไม่ได้ตั้ง `PATIENT_COUNT` · หลังสร้าง checkStep ค้นชื่อแต่ละคนต้องเจอ HN + กรอบ Expected · แนบ JSON รอบนี้ · เพิ่ม script `data:patients` · ตรวจสอบ: typecheck ผ่าน · `npx playwright test tests/data` เฉยๆ → 1 skipped · หมายเหตุ: รันพร้อม setup แล้ว Doctor/Nurse ล็อกอิน timeout (มาจาก `ROLES_IN_USE` ใน `utils/env.ts` ที่ผู้ใช้แก้ค้างไว้ ไม่ได้แตะ) → รอบตรวจใช้ `--project=chrome --no-deps`
- [x] **P1 — (เจอระหว่างรันจริง) แก้คำนำหน้าค้างเมื่อลงทะเบียนหลายคนในฟอร์มเดิม** — รัน 3 คนแรก: d (ชาย) ได้ น.ส. ค้างจาก c (หญิง) · เพศ/วันเกิดถูกทุกคน · แก้ตามที่ผู้ใช้เลือก: เปิดหน้าคัดกรองใหม่ทุกคน + เก็บ `namePrefix` จาก response + fail ถ้าไม่ตรง → รอบถัดมาเจอเพิ่ม: ฟอร์มใหม่บางครั้ง**ไม่เติมคำนำหน้าเลย** (ช่องบังคับว่าง กดลงทะเบียนไม่ส่ง) → ผู้ใช้เลือก ให้สคริปต์เลือกเอง ชาย=นาย / หญิง=น.ส. (`NewPatient.namePrefix` ไม่บังคับ, `PREFIX_BY_GENDER`, `registerNewPatient` เลือกหลังเพศ + คืน `namePrefix` จาก response — spec เดิมไม่กระทบ) · `goto` ซ้ำค้างเกิน 20 วินาที 1 ครั้ง → คนที่ 2+ กลับผ่านเมนู (`openErDashboardFromMenu`) · ตรวจสอบ: typecheck ผ่าน · รัน 3 คน (g ชาย, h ชาย, i หญิง) ผ่าน 29.7 วินาที · เทียบกับ `/new-demographic-api/patients` ตรงทุกคน · ยังไม่ได้ลองลำดับ หญิง→ชาย ในรอบเดียวกันหลังแก้ (มี assert คำนำหน้ากันไว้แล้ว)
- [x] **P1 — แก้คำนำหน้า d (HN 6931982) ในแอปเป็น นาย** (ผู้ใช้สั่ง "ควรแก้ต้องให้ตรง") — หน้าแก้: เวชระเบียน → ค้น HN → แก้ไขข้อมูลผู้ป่วย (ฟอร์มอยู่ใน iframe `/reception/embedded/...`) · ลองแก้แค่คำนำหน้าก่อน → บันทึกไม่ผ่าน ติดที่อยู่บังคับ (ทะเบียนบ้าน + ปัจจุบัน: บ้านเลขที่/หมู่/จังหวัด/อำเภอ/ตำบล) → ผู้ใช้สั่ง "สุ่มไปเลย" → `temp_scripts/fix-patient-d-prefix.mjs` เลือก 003 - นาย + สุ่มที่อยู่ (91 หมู่ 12 ต.ท่าไม้ อ.กระทุ่มแบน จ.สมุทรสาคร) + ปุ่ม "บ้านเดียวกัน" · กับดัก: ช่อง `หมู่` ต้อง exact (ไม่งั้นจับ "ชื่อหมู่บ้าน") · dropdown จังหวัดบางครั้งไม่ขึ้นรายการ ต้องคลิกซ้ำ · `StoredPatient` เพิ่ม `address?`/`note?` · ตรวจสอบ: `PATCH /new-demographic-api/patients/6931982` → 200 · API คืน นาย/male · หน้าข้อมูลผู้ป่วยแสดง "นาย AIทดสอบdf" + ที่อยู่ (ภาพ `temp_scripts/patient-edit/31-after-save.png`) · patients.json อัปเดต d แล้ว
- [x] **P2 — รันจริง 1 คน แล้ว 3 คน** — สร้างแล้ว 9 คน a–i (HN 6931978, 6931980–6931982, 6931984–6931988) บน dev-x · `patients.json` เติม `namePrefix` ของ a–d ย้อนหลังจากข้อมูลจริง · ตรวจสอบ: ภาพค้นชื่อเจอ HN (กรอบ Expected) · ทุกคน `generated-emr-api/encounters` = 0 (ไม่มี Visit) · เพศ/วันเกิด/ชื่อ/คำนำหน้าใน JSON ตรงกับระบบ (d ตรงกับของจริงที่ยังผิด รอ task แก้ d) · สคริปต์ตรวจแบบอ่านอย่างเดียว `temp_scripts/inspect-ai-patients.mjs`, `inspect-ai-encounters.mjs` · รอบที่สร้างไม่สำเร็จไม่ทิ้งผู้ป่วยค้าง (ลงทะเบียนไม่ถูกส่ง)
- [x] **P3 — อัปเดต README + skill `cortex-automate`** — README: แถว `npm run data:patients` + หัวข้อ "Mock data ผู้ป่วย" (กติกาชื่อ/เพศ/อายุ, env, วิธีใช้ในโค้ด) · SKILL.md: §2 ผังไฟล์ใหม่, §3 คำสั่ง, §7 R29 (คำตอบผู้ใช้), §9 "ลงทะเบียน / แก้ข้อมูลผู้ป่วย" (คำนำหน้าค้าง/ไม่เติม, iframe เวชระเบียน, ที่อยู่บังคับ, กับดัก หมู่/cmdk), §10 log · er-flow.md §6 แถวผู้ป่วย a–i · commit แยกทีละ task แล้ว (ไม่ push) · ตรวจสอบ: typecheck ผ่าน, อ่าน diff ทุกไฟล์ · ค้าง: `utils/env.ts` ของผู้ใช้ (ROLES_IN_USE มี Doctor/Nurse) ทำให้ setup ล็อกอิน 2 role นี้ timeout — `npm run data:patients` แบบปกติจะติด dependency setup จนกว่าจะแก้ (ระหว่างนี้ใช้ `npx playwright test tests/data --project=chrome --no-deps` + `PATIENT_COUNT`)

## SBH-2457 — Form OPD note / Pre-assessment หลัง Restructure EHRbase: ร่าง Test Case + helper BMI/BSA — 20 ต.ค. 2569

ข้อตกลง: ยึดตาม AC 1–16 · Fall risk = ต้องไม่มีใน Pre-assessment (AC 14) · Body chart = ใช้งานได้เหมือนเดิม ไม่ตรวจ default collapsed (AC 6) · Physical exam = ตรวจแค่ AC 5 ไม่ตรวจขนาดช่อง · Family history general = TC optional (ไม่มี AC) · Underlying disease = ไม่เขียน TC ใน 2457 แค่อ้างอิงว่าต้องเหมือน SBH-2413 · SBH-2413 ยังไม่เทสรอบนี้ · BMI/BSA = เทียบระบบเดิม ถ้าไม่มีข้อมูลให้ย้อนหาสูตรจากหน้าจอจริงแล้วทำ helper ที่ `helpers/functions/`

- [x] **P1 — ร่าง TC ด้วย skill `linear-testcase-writer`** → `test-cases/SBH-2457-opd-note-pre-assessment.md` (ยังไม่เขียนลง Linear) — เขียนแล้ว: 1 EXE (`EXE - CT - 2.9.0`, DEV-X), 1 Scenario HPY, 18 TC flow-style (17 Required + TC-016 Family history Optional), AC 16 แยก Collapse/Expand เป็น TC-017/018, Underlying disease อ้างอิง SBH-2413 ไม่มี TC, ค่าที่ยังไม่รู้ใส่ "รอยืนยัน" + ตาราง AC→TC + Requirement gap · ตรวจสอบ: Final consistency check ของสกิล (ชื่อ/tag/ID plain text/ลำดับ 001–018/ทุก AC มี TC) · รอ user review (GATE 1) · **อัปเดตจากภาพหน้าจอของ user**: role = user1 (Super_User), Pre-assessment = tab OPD > "ฟอร์มคัดกรอง", OPD Note ใหม่ใช้ปุ่ม "สร้าง", CC suggestion = ปุ่ม "ปวดหัว", Pain score = ปุ่ม 0–10 · เพิ่ม TC-019/020 (BMI/BSA + Pain score ในฟอร์มคัดกรอง ตามที่ user ให้เทสทั้งสองที่) → รวม 20 TC · gap ใหม่: "การมาโรงพยาบาล" = AC 10 ไหมยังไม่ชัด, ภาพยังเห็น Note to Nurse ใน OPD Note
- [ ] **P1 — (รอ user สั่งเริ่ม) สำรวจแอปจริงก่อนเขียน TC ให้เสร็จ (Playwright MCP, user1)** — ข้อตกลง: สร้างผู้ป่วย AUTO + visit OPD ใหม่เอง · Setting form เปลี่ยนได้ (user บอกว่าผูก 1:1 กับ visit ไม่กระทบคนอื่น — ถ้าเจอว่าเป็นค่ากลางให้หยุดถาม) · หลักฐานภาพ + วิดีโอ + วงแดง R23 เก็บที่ `.playwright-mcp/SBH-2457/explore/` · ผลใช้เติม "รอยืนยัน" ใน TC ไม่ใช่สรุป Pass/Fail
  - [x] สร้างผู้ป่วย AUTO + เปิด visit OPD — HN 6931979 (หญิง) ลงทะเบียนผ่าน ER แล้วยกเลิก modal (R24) → เวชระเบียน "Visit ใหม่" Walk-in MED → OPD เช็คอิน · VN V69102027456 / EN E69102032174 · ตรวจสอบ: เห็นแถวในรายการผู้ป่วยนอกสถานะเช็คอิน + เปิดหน้า OPD ได้
  - [x] OPD Note — สร้าง 201 + reload: CC/PI/PE/Dx อยู่ · Body Chart โหมดดูขึ้น "-" แต่โหมดแก้ไขเห็นภาพ · ไฟล์แนบหาย 2 รอบ · ไม่มี Body metrics / Vital / Pain / Onset date / PE free text · ยังมี Note to Nurse · template `tmh_general_opd_note_v1` · ตรวจสอบ: reload + เปิดโหมดแก้ไข
  - [x] ฟอร์มคัดกรอง — สร้าง 201 + reload: การมาโรงพยาบาล/BMI/BSA/Pain/ผ่าตัด/ครอบครัว/บุหรี่/สุรา อยู่ครบ · ไม่พบ ประวัติแพ้ / คัดกรองเพศหญิง (มีแค่ LMP) / เอกสารแนบ / Fall risk · บังคับ CC+PI · template `nuh_general_opd_pre_assessment_v2` · ตรวจสอบ: reload แล้วดูค่าทีละ section + หัวจอผู้ป่วย
  - [x] BMI/BSA — 7 ชุด: BSA = Mosteller ปัด 2 ตำแหน่ง, BMI ปัด 2 ตำแหน่ง ถูกเมื่อออกจากช่องด้วยคลิก · ออกด้วย Tab ค่าค้างตามค่าก่อนหน้า (รอ dev ยืนยัน) · ตรวจสอบ: คำนวณมือเทียบทุกชุด
  - [x] Setting form — หน้า preset ในการ์ดเป็นค่ากลาง มีแค่ "จำเป็น"/"ซ่อน" ไม่พบ Expand/Collapse · "เพิ่มฟอร์ม" ก็ไม่มี · **ไม่ได้แก้ค่าใด ๆ** (เป็นค่ากลาง ไม่ใช่ต่อ visit ตามที่ตกลงไว้ให้หยุดถาม)
  - [x] ย้ายไปคลินิก SBH (user สั่ง) — เพิ่ม encounter "SBH - ห้องตรวจสระบุรี" ใน VN เดิม → ลงตาราง นาย ทดสอบ มานะ 15:00–16:00 → เช็คอิน · EN E69102032186 · template `sbh_general_opd_note_v2` / `sbh_general_opd_pre_assessment_v2` ตรง AC มากกว่า (มี PE rich text, เอกสารแนบ, คัดกรองเพศหญิง, ประวัติแพ้, การมาถึงและความต้องการช่วยเหลือ) · ยังไม่ตรง: ไม่มี Onset date, ยังมี Note to Nurse, ยังมี Fall risk · ตรวจสอบ: reload หน้าแก้ไข visit + รายการผู้ป่วยนอก (ไม่เชื่อ toast ที่ขัดกัน) · ยังไม่ได้กรอก/บันทึก/reload ในฟอร์ม SBH
  - [x] กรอก + บันทึก + reload บนฟอร์ม SBH (user สั่ง "ลองกรอก", ยืนยัน site SBH = ห้องตรวจสระบุรี) — OPD Note: Pain/BMI/BSA/PE rich text/Body chart/Dx อยู่ · CC/PI ของ OPD Note ว่างหลัง reload แล้วไปแสดงค่าจากฟอร์มคัดกรองแทน · ไฟล์แนบหาย (PNG ได้ 422) · ฟอร์มคัดกรอง: ทุก section อยู่ครบรวม Fall risk = สูง ยกเว้นไฟล์แนบหาย · BSA = Mosteller, Tab คำนวณได้ · ตรวจสอบ: reload แล้วอ่านค่าทุก input ใน shadow DOM + ภาพวงแดงก่อน/หลัง · Setting form (AC 16) ยังหาหน้าไม่เจอ รอ user บอกที่อยู่
  - [x] ร่างการ์ด bug 3 ใบ (user สั่ง "ไม่มีตาม AC ตีเป็น bug" + เลือกร่าง .md ก่อน) → `test-cases/SBH-2457-bug-drafts.md`: ①ไฟล์แนบหายหลัง reload (OPD Note + ฟอร์มคัดกรอง) ②Diagnosis ไม่มี Onset date ③OPD Note ยังมี Note to Nurse · ใช้ skill qa-bug-writer · ตรวจสอบ: ชื่อภาพ/คลิปที่อ้างมีอยู่จริงในโฟลเดอร์ explore · ยังไม่สร้างใน Linear รอ user review · CC/PI และ AC 16 ยังไม่รวม (รอทดสอบ/รอยืนยัน)
- [x] **P1 — แก้ TC draft ทั้งชุดให้อิงฟอร์ม SBH (ห้องตรวจสระบุรี)** — เขียนใหม่ทั้งส่วนหัว (ข้อตกลง QA + วิธีเตรียมข้อมูล 4 ขั้น), EXE, Scenario และ TC 21 ข้อ (เพิ่ม TC-021 prefill/ไม่ sync กลับ) · test data จริงจากรอบสำรวจ · Actual Result Passed 13 / Failed 7 (ลิงก์ SBH-2812..2817) / Not Run 1 (TC-018) · ตาราง AC→TC มีคอลัมน์ผล · Requirement gap อัปเดต · บันทึกสำรวจเดิมย้ายเป็นหัวข้อประวัติ · ตรวจสอบ: ไฟล์หลักฐานที่อ้างมีครบ, นับ TC = 21 · รอ user review
- [x] **P1 — สร้าง label "QA Sub-module / Feature : OPD Note & Pre-assessment"** — สร้างใน Linear (group "QA Sub-module / Feature", สี #ff7900) id b8520624-6c4d-4014-9ab6-0a29026c07d4 · ตรวจสอบ: ใช้ติดการ์ด EXE/Scenario/TC ได้ และ response แสดง label นี้ครบทุกใบ
- [x] **P2 — สร้าง EXE → Scenario → 21 TC ใน Linear** — EXE SBH-2818 (ใต้ SBH-2457, Ready for Testing, + QA Run : Cycle Test) → Scenario SBH-2819 (+ QA Case : Happy) → TC SBH-2820 ถึง SBH-2840 (TC-001..021 ตามลำดับ) · label การ์ดแม่ + QA Module: OPD + Sub-module + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual · priority High/Medium/Low ตามไฟล์ · สถานะ Passed 13 / Failed 7 / Not Run 1 · relatedTo bug ใน TC ที่ Failed (+ TC-018 → SBH-2817) · อัปโหลดภาพเพิ่ม 21 ไฟล์แล้วฝังในหัวข้อ "หลักฐาน" + ลิงก์วิดีโอ · ตรวจสอบ: response ของทุกใบมี status/priority/label/parent ถูกและมี linear-image ครบ · SBH-2828 Test Data "-" ถูกแปลงเป็นรายการว่าง แก้เป็น "ไม่มี" แล้ว
- [x] **P3 — ลิงก์ bug SBH-2812..2817 กลับไปการ์ด TC + อ่านกลับตรวจทุกการ์ด** — แก้บรรทัด "TC ต้นทาง" ของ bug 6 ใบให้ชี้การ์ด TC จริง (เช่น `TC-SBH-2457-007` (SBH-2826)) แทน "draft ยังไม่สร้างการ์ด" · SBH-2817 เพิ่ม TC-018 (SBH-2837) · ตรวจสอบ: response หลัง save ทุกใบแปลงเป็นลิงก์ issue ถูกใบ + list_issues ใต้ SBH-2819 ได้ 21 ใบ Passed 13 / Failed 7 / Not Run 1 ตรงไฟล์
- [x] **P3 — ใส่ tag ฟอร์มในชื่อ TC (user ขอให้แยกว่า TC ไหนเทส OPD Note / ฟอร์มคัดกรอง)** — user เลือกใส่ tag ในชื่อ ไม่ย้าย Scenario/ไม่เปลี่ยนเลข · [OPD Note] 12 ข้อ: 001–009, 017, 018, 021 · [ฟอร์มคัดกรอง] 9 ข้อ: 010–016, 019, 020 · แก้หัวข้อในไฟล์ TC + ตารางสรุปกลุ่ม และแก้ title การ์ด SBH-2820..2840 (ไม่แตะ description/status/label) · ตรวจสอบ: response ทุกใบแสดงชื่อใหม่ status เดิม
  - [x] สร้างการ์ด bug ใน Linear 6 ใบ (user ยืนยัน: แยกไฟล์แนบเป็น OPD Note/ฟอร์มคัดกรอง, sub-issue SBH-2457, severity ตามเสนอ, label การ์ดแม่ + QA : Bug) → SBH-2812 ถึง SBH-2817 · template QA Bug · อัปโหลดภาพ 19 ไฟล์ + วิดีโอ 5 คลิปผ่าน prepare_attachment_upload + `temp_scripts/put-upload.js` แล้วฝังใน description · TC ID ใส่เป็น `code` กัน Linear แปลงเป็นลิงก์ SBH-2457 · ตรวจสอบ: list_issues parentId SBH-2457 เห็นครบ 6 ใบ label/priority ถูก, response หลัง save แต่ละใบมี linear-image ครบ
  - [x] เพิ่มร่าง bug ใบ 4–5 ตามที่ user ยืนยัน (21 ต.ค. 2569) — ④ กรอก CC/PI ใน OPD Note ก่อนมีฟอร์มคัดกรองแล้วค่าหายหลัง reload (user: ต้องเก็บค่า) ⑤ ติ๊ก "ซ่อน" ใน Setting form แล้ว section ยังกาง (user: อ่านตามหน้าตั้งค่า ซ่อน = Collapse) · บันทึกข้อตัดสินลงหัวไฟล์ TC · ตรวจสอบ: ภาพ/คลิปที่อ้างมีอยู่จริง · รวม 5 ใบ ยังไม่สร้างใน Linear
  - [x] ทดสอบ CC/PI ตาม flow ที่ user อธิบาย — dev-x กลับมา (login ใหม่) · prefill จากฟอร์มคัดกรอง ✓ · แก้ใน OPD Note แล้วบันทึก reload ค่าที่แก้อยู่ ✓ · ฟอร์มคัดกรองไม่เปลี่ยน ✓ · เจอเพิ่ม: แถวไฟล์แนบของเมื่อวานกลับมาแบบชื่อเอกสารว่าง บล็อกการบันทึก ต้องเลือกชื่อใหม่ก่อน แล้วหลัง reload ไฟล์หายอีก (เพิ่มใน bug draft ใบ 1) · ตรวจสอบ: ภาพก่อน/หลัง reload ทั้ง 2 ฟอร์ม (ภาพ 26h ถ่ายใหม่เพราะป้ายรอบแรกอ่านค่าผิดช่อง)
  - [x] AC 16 Setting form (user ชี้ทาง + อนุญาตสลับ 1 ส่วนแล้วคืน) — preset 11 `sbh-general-opd-note`: ติ๊ก "ซ่อน" ที่ Physical examination → PUT 200 → เปิด OPD Note ใหม่ยังกางอยู่ → คืนค่า PUT 200 · ตรวจสอบ: reload หน้า preset เทียบ checkbox ครบ 9 แถวตรงค่าเดิม · ยังไม่รู้ว่า "ซ่อน" = Collapse หรือไม่ (รอ dev/BA)
  - [x] บันทึกผลสำรวจลง TC draft (section "ผลสำรวจแอปจริง") — หลักฐาน 44 ภาพ + 4 คลิปใน `.playwright-mcp/SBH-2457/explore/` · ยังไม่แก้ Expected/โครง TC รอ user ตอบเรื่อง preset/AC ที่ไม่ตรงหน้าจอ
- [ ] **P1 — (รอ user ยืนยัน) ย้อนหาสูตร BSA + การปัดทศนิยม BMI/BSA บน dev-x** — กรอกน้ำหนัก/ส่วนสูงหลายชุดใน test data ที่สร้างเอง เทียบกับ Mosteller/DuBois/สูตรอื่น พร้อมเก็บหลักฐาน
- [ ] **P2 — เขียน helper `helpers/functions/body-metrics.ts`** (`calcBmi`, `calcBsa`) ตามสูตรที่ยืนยันแล้ว + อัปเดต expected ของ TC AC 3
- [ ] **P3 — (รอ approve TC) สำรวจแอปจริงตาม `qa-automate-readiness`** ก่อนส่งต่อเขียน automate

## สไตล์การเขียน content (อ่านง่าย ไม่ technical เกิน) + เขียนการ์ด bug ใหม่ — 20 ต.ค. 2569

- [x] **P1 — สร้าง skill `qa-bug-writer`** (`~/.claude/skills/qa-bug-writer/SKILL.md`) — เขียนแล้ว: ขั้นตอน, สูตรชื่อ `[Bug][Module][Form] - <ทำอะไร> ใน <ที่ไหน> แล้ว <อาการ>` + ตารางตัวอย่างดี/ไม่ดี, โครง body QA Bug (Actual = ปัญหา/เกิดที่/อาการ/เกิดซ้ำ + หัวข้อ "รายละเอียดสำหรับ dev"), สไตล์ภาษา, ห้ามเดาสาเหตุ, ตารางสรุปการ์ดแม่, checklist · ตรวจสอบ: frontmatter name/description ครบ, อยู่นอก repo (global) จึงไม่ commit
- [x] **P1 — เพิ่ม section "สไตล์การเขียน content" ใน `linear-testcase-writer`** — เพิ่ม section ก่อน Final consistency check (อะไร + ที่ไหน + อาการ, technical ตามหลัง/แยกหัวข้อ dev, ห้ามเดาสาเหตุ, ตัวอย่าง ❌/✅, ชี้ไป `qa-bug-writer`) + 1 ข้อใน checklist + log 2026-10-20 · ตรวจสอบ: `diff` global กับ `.claude/skills/` = เหมือนกัน
- [x] **P2 — เขียน 6 การ์ด bug ใหม่ (NUH-3253–3258)** — เปลี่ยนชื่อเป็น "ทำอะไร ใน ที่ไหน แล้ว อาการ", Actual Result เป็น ปัญหา/เกิดที่/อาการ/เกิดซ้ำ/ข้อสังเกต, ย้าย status code/endpoint ออกจาก Description ไปหัวข้อ "รายละเอียดสำหรับ dev", caption รูป + Severity + Expected เป็นภาษาผู้ใช้ — คงรูป/วิดีโอ/steps/severity/labels เดิม · NUH-3088 ตารางเปลี่ยนคอลัมน์เป็น "เกิดที่ / อาการที่ผู้ใช้เห็น" และตัดประโยคเดาสาเหตุ ("อาจมีสาเหตุร่วมกัน" → "ต้องให้ dev ตรวจ") · ตรวจสอบ: response ของทุก save แสดงเนื้อหาใหม่ครบ (NUH-3253 ทำก่อน 1 ใบแล้วค่อยทำที่เหลือ)
- [ ] **P3 — (รอ user ยืนยัน) เพิ่มกฎใช้ `qa-bug-writer` ใน `~/.claude/CLAUDE.md`**

## CTXN-12015 — ทดสอบ Save/Edit/Reload ทุก form (ครบ 29 TC) — 20 ต.ค. 2569

- [x] **P1 — เขียน script CRUD flow ทุก form** — `temp_scripts/test-form-crud-all.js`: เปิด form → กรอก field หลัก 1 ช่อง (textarea / text / radio / checkbox / ICD) → Save → reload ตรวจค่า → แก้ไข → Save → reload ตรวจค่าล่าสุด, เก็บ HTTP status ตอน Save + screenshot ทุกขั้นที่ `temp_scripts/save-results/crud-tc-xxx-*.png` · ตรวจสอบ: รันกับ Operative Note ผ่านครบก่อน แล้วค่อยรันทั้ง 10 form
- [x] **P1 — รันจริง 10 form บน OR-69-000219** — ผ่าน 6 (011, 012, 025, 026, 027, 028) / ไม่ผ่าน 4: TC-013 Safety Checklist OD (412 contribution), TC-014 Custom Note ECMO (201 แต่ reload แล้วข้อมูลหาย), TC-015 Complication (400 flat-to-json), TC-029 Post-anesthesia (ปุ่ม Save loading ค้าง ไม่มี write) · ตรวจสอบ: ทุกตัวที่ fail รันซ้ำ 2–3 รอบได้ผลเดิม; ตัวที่เคย fail เพราะ script (Nurse Note ICD, Post-anes radio) แก้ script แล้วรันใหม่
- [x] **P2 — อัปเดต Linear** — CTXN-12029–12033, 12043–12047: เปลี่ยน title/Steps/Expected/Actual เป็น CRUD flow + state Passed/Failed; CTXN-12015 สรุปเป็น 25/29 · ตรวจสอบ: เช็ก `updatedAt` ทุกใบ (CTXN-12043 ต้องส่งซ้ำ 1 ครั้ง)
- [x] **P2 — เก็บหลักฐานตาม skill (วิดีโอ + รูปวงแดง R23) แล้วแนบใต้ Actual Result ทุกการ์ด** — script เพิ่ม `page.screencast` 1 คลิปต่อ form + `evidence()` วงแดงป้าย กรอก/กด/Expected (`ev-tc-xxx-*.png`, `ev-tc-xxx-flow.webm`), อัปโหลดผ่าน `temp_scripts/put-upload.js` แล้วฝังใต้หัวข้อ "หลักฐาน" ใน 10 การ์ด · ตรวจสอบ: เปิดดูรูปทุกชุดก่อนอัปโหลด, ค่าในการ์ดแก้ให้ตรงกับรอบที่อัดหลักฐาน
- [x] **P1 — แก้ผล TC-014 Custom Note ที่ผิด** — รอบแรก script กรอกใน Perfusionist note ใบเก่า ไม่ใช่ form ใบใหม่ที่ Save บันทึก (`probe-custom-note.js` ยืนยันโครงสร้าง) → เขียน `test-custom-note-crud.js` ใหม่: Save 201 + reload พบ note พร้อมข้อมูล → Passed (เกณฑ์ QA: กรอก+reload ข้อมูลอยู่ = ผ่าน), ข้อสังเกต note ที่บันทึกแล้วไม่มีปุ่ม Save · CTXN-12015 สรุปเป็น 26/29
- [x] **P3 — สร้าง bug card สำหรับ form ที่ไม่ผ่าน** — สร้างเป็น sub-issue ของ NUH-3088 ด้วย template QA Bug (6 ใบ แยกทุก TC ตามที่ user เลือก, ไม่ assign, labels ตาม NUH-3088 + QA : Bug): NUH-3253 Safety Checklist OD (412) · NUH-3254 Complication (400) · NUH-3255 Post-anesthesia (Save ค้าง) · NUH-3256 OR Charges · NUH-3257 Anesthesia Charges · NUH-3258 Request Detail (Medium) — ทุกใบมี Steps reproduce + รูป ①②③ + วิดีโอ (ฝัง asset เดิมจากการ์ด TC), relatedTo การ์ด TC · NUH-3088 detail สรุปตาราง 6 bug · ใส่ลิงก์ 🐞 Bug ใน Actual Result ของ 6 การ์ด TC · ตรวจสอบ: response ของทุก save แสดงเนื้อหาใหม่ครบ
- [x] **P1 — กลุ่ม A: ทดสอบ Save 6 form ที่ยังไม่ได้ทดสอบ** — `temp_scripts/test-group-a-save.js` (+ TC-002 Request Detail): ผ่าน TC-001 Participants, TC-009 Attachment (201), TC-016 Assign Anesthesia → reload แล้วรายการยังอยู่ · ไม่ผ่าน TC-002, TC-008, TC-023 (toast error จาก server, reload ไม่มีรายการ) · TC-020 E-MAR → Blocked (ปุ่มเพิ่มยา disabled "ไม่พบ VN หรือ AN") · ตรวจสอบ: นับแถวก่อน/หลัง reload + จับ toast/HTTP status, รูปวงแดง + วิดีโอแนบการ์ดครบ
- [x] **P2 — กลุ่ม B/C: อัดหลักฐานการโหลด 13 การ์ด** — `temp_scripts/test-load-evidence.js` → `ev-tc-xxx-load.png` + `ev-tc-xxx-flow.webm` อัปโหลดใต้ Actual Result ทุกใบ (TC-003–007, 010, 017–022, 024) + แก้ OR/HN เป็น OR-69-000219 / 6931701 + ลิงก์ผล save ของ TC คู่กัน · ตรวจสอบ: เปิดดูรูปก่อนเขียนผล — พบ Expected ไม่ตรงหน้าจอ (ไม่มี Select form) ใน TC-004, 005, 018, 019 และ Audit ANE = OD (TC-024) บันทึกเป็น ⚠️ โดยคง state Passed; TC-020 → Blocked; `get_issue` ยืนยัน CTXN-12042 ที่ response ค้าง
- [x] **P2 — อัปเดต CTXN-12015 ให้ครอบคลุม 29 การ์ด** — สรุปใหม่ 22/29 (❌ 6 · 🚫 1), OD 11/15 · ANE 11/14 · ตรวจสอบ: `get_issue` หลัง patch (response แรกค้าง) เห็นครบทุก TC

## COR-1724 (โครงสร้างใหม่ CTXN-1049x) — รอบขยายผลหลัง TC-001/TC-002: highlight Fail, วิดีโอต่อเนื่อง, TC ใหม่ 3 รายการ

**Decision (12 ต.ค. 2026 ผ่าน AskUserQuestion):** ผู้ใช้ยืนยันแล้ว —
(1) สไตล์การลงผล: ดูตัวอย่างการ์ด SBH-2513 (โปรเจกต์อื่น ใช้แค่เป็นตัวอย่างสไตล์ตามที่ user สั่งเจาะจง ไม่เอา business logic/ข้อมูลมาปน) แล้วสั่งให้ใช้
สไตล์เดียวกัน (heading + ฝังรูปใน body ตรงจุด) **แทน** แนวทาง emoji เดิม — แต่ section name ของ template `linear-testcase-writer`
(ข้อมูลอ้างอิง/Preconditions/Test Data/Test Steps/Expected Result/Actual Result/หมายเหตุ) ต้องคงเดิมตามกฎ skill ห้ามเปลี่ยนชื่อ/ตัด
section ดังนั้นใช้เทคนิคของ SBH-2513 **ภายใน** โครงเดิม: ขึ้น `##` heading ให้ section name เดิม, ใส่สถานะ Pass/Fail ต่อท้าย heading
"Actual Result" ตรงๆ (เช่น "## Actual Result — 🔴 Fail"), เพิ่มบรรทัดสรุป "ขั้นที่ผ่าน/ไม่ผ่าน" ไว้ต้น Actual Result, และฝังรูป/วิดีโอ
ด้วย `<linear-image>`/`<linear-embed node-type="video">` tag ตรงจุดในเนื้อหาแทนปล่อยเป็น attachment list ท้ายการ์ดอย่างเดียว
(2) ภาพ Keycloak ที่ส่งมาก่อนหน้า — รอผู้ใช้ส่งไฟล์ใหม่ (ไฟล์เดิมไม่ได้อยู่ในเครื่องที่เข้าถึงได้)
(3) Role sync 2 ทิศทาง มี TC อยู่แล้ว (TC-018 CTXN-10512 Cortex→Keycloak, TC-021 CTXN-10515 Keycloak→Cortex) ไม่ต้องสร้างใหม่ แค่ยังไม่ได้ทดสอบ
(4) สร้าง TC ใหม่ 3 รายการ: login ซ้ำด้วย password ใหม่, login ด้วย permanent password (ไม่ติ๊กชั่วคราว), ข้อความ error ผิดตอนสร้าง user
(5) วิดีโอ: รื้อทำ TC-001/TC-002 ใหม่เป็นคลิปเดียวต่อเนื่อง (สร้าง→เช็ค role→login) ด้วย test account ใหม่ + TC ใหม่ทุกตัวทำแบบนี้ตั้งแต่ต้น

- [x] **P0 — ทดสอบ syntax `<linear-image>`/`<linear-embed node-type="video">` บนการ์ดเดียวก่อน** (14 ต.ค. 2026)
      ฝังรูปทดสอบ 1 ใบไว้ใน CTXN-10496 ชั่วคราว (ลบทิ้งแล้ว) ส่ง user ไปดูการ์ดจริง — **user ยืนยันแล้วว่าขึ้นเป็นรูปจริง ไม่ใช่ข้อความ/
      broken** syntax ใช้งานได้จริง — ไปต่อ P1/P2 เต็มรูปแบบได้

- [x] **P1 — รื้อทำ TC-001 (CTXN-10495) เป็น flow เดียวต่อเนื่อง + เขียนผลด้วยสไตล์ใหม่** (14 ต.ค. 2026)
      สร้าง test account ใหม่ `qa-up-50187577` (Cortex user ID `3af53e77-0ad4-4ee5-8c1c-823df010b6b9`) ด้วยสคริปต์เดียว: สร้าง →
      ทดสอบปุ่มแสดง/ซ่อน/คัดลอก/สร้างใหม่รหัสผ่าน (แก้ selector bug รอบแรก — ปุ่มแสดงเป็น `<span>` ไม่ใช่ `<button>`) → ยืนยันสร้างจริง
      ผ่านค้นหา → เช็คแท็บบทบาทการใช้งาน (0 บทบาท) → reset password → **ล้าง cookie/localStorage ใน browser context เดียวกัน
      แทนที่จะเปิด context ใหม่** (เทคนิคใหม่เพื่อให้วิดีโอเป็นคลิปเดียวต่อเนื่องจริงตามกฎสกิลใหม่) → login ครั้งแรกจริง → Update
      Password (Pass ตรง Expected) → VERIFY_PROFILE (บังคับกรอก Email/First/Last name ที่ไม่บังคับตอนสร้าง — gap ของ TC ไม่ใช่บั๊ก)
      → auth code กลับ Cortex สำเร็จ แต่หน้าเว็บค้างว่างไม่โหลดแอปต่อ (เจอซ้ำเป็นครั้งที่ 3 แล้ว ยังไม่ฟันธงว่าเป็นบั๊กจริง)
      อัปโหลดหลักฐาน 18 ไฟล์ (17 ภาพ + 1 วิดีโอ) ผ่าน background agent (ประหยัด context หลัก) แล้วรีบเขียน description ใหม่ทั้งก้อน
      ด้วย `##` heading + สถานะใน heading + รูป/วิดีโอฝัง inline ทันทีก่อน signed URL หมดอายุ (~5 นาที) — สถานะตั้งเป็น "Not Test"
      รอผล Keycloak ของ account ใหม่ (ยังไม่ฟันธง Fail ซ้ำจนกว่าจะมีหลักฐานจริงของ account นี้ แม้จะคาดว่าผลจะเหมือนเดิม)

- [x] **P2 — รื้อทำ TC-002 (CTXN-10496) แบบเดียวกัน** (14 ต.ค. 2026)
      สร้าง test account ใหม่ `qa-otp-50398633` (Cortex user ID `d475b9b3-26d9-48d3-b1d8-dd2853b4e9cd`) โหมด OTP — flow เดียวกัน
      กับ P1 + พบหลักฐานใหม่ที่แข็งแรงขึ้น: เช็คแท็บ "การเข้าสู่ระบบ" **ก่อน reset password** พบช่อง "สิ่งที่ต้องทำเมื่อเข้าสู่ระบบ
      ครั้งถัดไป" ว่างเปล่าตั้งแต่สร้างเสร็จ — ยืนยันทางตรงผ่าน Cortex UI เองว่า Configure OTP ไม่เคยถูกตั้งค่า ไม่ต้องรอ login
      เต็ม flow ก็เห็นได้ (เร็วกว่าวิธีเดิมที่ต้อง login จนจบถึงจะสรุปได้) ยืนยันซ้ำอีกครั้งด้วย login เต็ม flow — ไม่เจอหน้า
      Configure OTP เลยตลอดทาง เจอหน้าว่างค้างหลัง redirect ซ้ำเป็นครั้งที่ 4 เช่นกัน อัปโหลด 17 ไฟล์ผ่าน background agent
      อีกตัว (รันพร้อมกับของ P1) แล้วเขียน description ใหม่ทันทีเหมือนกัน — สถานะ "Not Test" รอผล Keycloak ของ account ใหม่

- [x] **P3 — ปิดผล CTXN-10495/CTXN-10496 ด้วยหลักฐาน Keycloak ของ account ใหม่จาก user** (14 ต.ค. 2026)
      user ส่งภาพ Keycloak Role mapping ของทั้ง 2 account ใหม่มาให้ (ยังเป็นภาพ paste ในแชท ไม่ใช่ไฟล์ที่เข้าถึงได้ — เหมือนรอบ
      ก่อน จึงยังแนบไฟล์จริงเข้าการ์ดไม่ได้ อธิบายเป็นข้อความแทนเหมือนเดิม): `qa-up-50187577` (TC-001) และ `qa-otp-50398633`
      (TC-002) ผลตรงกันทั้งคู่ — มีแค่ 6 role มาตรฐานของ Keycloak เอง ไม่มี `FHIRCortexReadWrite`, `postgrest_emr_read_write`,
      `EHRBaseUser` เลยสักตัว ยืนยันครั้งที่ 2 ด้วย account คนละตัวว่าเป็นปัญหาระดับ mechanism จริง (รวมยืนยันข้าม 2 TC + 4
      account แล้วว่าไม่มี baseline-access role ใดๆ ถูก grant ให้ account ที่สร้างผ่าน Cortex เลย)
      อัปเดตทั้งสองการ์ด: แก้ heading "Actual Result" เป็น "— Fail" ตรงๆ, แก้บรรทัดสรุปขั้นผ่าน/ไม่ผ่าน, เติมรายละเอียด Step 5-6
      เป็น Fail พร้อมผล role list เต็ม, เปลี่ยนสถานะการ์ดจาก "Not Test" เป็น **"Failed"** ทั้งคู่ — ปิดผล TC-001/TC-002 รอบ
      รื้อใหม่สมบูรณ์แล้ว

- [x] **P4 — ร่าง + สร้าง TC ใหม่ 3 รายการใน Linear ต่อจาก TC-054 (ใช้ skill `linear-testcase-writer`)** (14 ต.ค. 2026)
      ข้ามคำถาม atomic-vs-flow-style ของ skill (ตั้งใจ ไม่ใช่ลืม) เพราะ granularity ตัดสินใจแล้วในแผนที่ user อนุมัติก่อนหน้า
      (3 TC แยกเดี่ยวแต่ละอันอยู่แล้ว ไม่ใช่ flow ต่อเนื่องที่ต้องเลือกรวม/แยก) และมีความรู้ business-flow จากการทดสอบจริงเองในรอบ
      นี้แล้ว (ไม่ต้องถาม QA เพิ่ม) เสนอ draft สั้นๆ ให้ user ดูก่อน (ไม่ใช่ AskUserQuestion เต็มรูปแบบ เพราะเนื้อหาตรงกับแผนเดิม
      อยู่แล้ว) ได้รับอนุมัติ "สร้างจริงเลย" แล้วสร้างทั้ง 3 ใบตามแม่แบบ plain-text เดิมของ skill (ไม่ใช่สไตล์ heading+inline
      image ที่ใช้เฉพาะตอนรายงานผลจริง) ใช้ label ชุดเดียวกับ TC พี่น้อง (Admin/Account):
      - **TC-055 (CTXN-10707, HPY)**: login ซ้ำด้วยรหัสผ่านถาวรที่เพิ่งตั้ง — Priority High
      - **TC-056 (CTXN-10708, HPY)**: login ด้วย permanent password (reset ไม่ติ๊ก "รหัสผ่านชั่วคราว") — Priority Medium
      - **TC-057 (CTXN-10709, ERR)**: ข้อความแจ้งเตือนผิดตอนสร้าง user ที่จริงสร้างสำเร็จ — Priority High (บั๊กจริงที่เจอซ้ำแล้ว
        ทุกรอบทดสอบของการ์ดนี้ตั้งแต่ 30 ก.ย. 2026 ถึง 14 ต.ค. 2026 — แยก TC ออกมา track โดยเฉพาะครั้งแรก)
      ทั้ง 3 ใบสถานะ "Not Run" ยังไม่ได้ทดสอบจริง

- [x] **P4.5 — ทดสอบ TC-055/056/057 จริง (14 ต.ค. 2026)** script ทั้ง 3 อยู่ใน `temp_scripts/tc0{55,56,57}-fullflow.js`
      (ลบทิ้งหลังอัปโหลดหลักฐานเสร็จตามธรรมเนียม), หลักฐานที่ `.playwright-mcp/COR-1724-v3/{images,videos}/tc0{55,56,57}-*`
      - **TC-055 (CTXN-10707)**: reset password ชั่วคราวให้ `qa-up-50187577` → login ครั้งที่ 1 ด้วยรหัสผ่านชั่วคราว → ถูกบังคับ
        ไปหน้า Update Password → ตั้งรหัสผ่านถาวรใหม่ → login ครั้งที่ 2 ด้วยรหัสผ่านถาวรนั้น → **ผล: ไม่ถูกถาม Update Password
        ซ้ำ, เข้าแอปสำเร็จ (`secondLoginAskedUpdatePassword:false`, `secondLoginSuccess:true`) → Pass** พบข้อสังเกตเสริม:
        รอบนี้ไม่เจอ VERIFY_PROFILE ซ้ำ (เพราะ field profile ถูกกรอกไว้แล้วตอน TC-001) ยืนยันว่า profile data persist ถูกต้อง
      - **TC-056 (CTXN-10708)**: reset password ให้ account เดิม แต่ปิด toggle "รหัสผ่านชั่วคราว" ในโมดัลก่อนยืนยัน → login ด้วย
        รหัสผ่านนั้นตรง ๆ → **ผล: login สำเร็จทันที ไม่ถูกถาม Update Password เลย (`askedUpdatePassword:false`,
        `loginSuccessDirect:true`) → Pass**
      - **TC-057 (CTXN-10709)**: สร้าง user ใหม่ (`qa-err-*`) ผ่านฟอร์ม "เพิ่มผู้ใช้งาน" ปกติ → กด บันทึก → toast แดงขึ้นจริง
        ("ระบบไม่ได้รับสิทธิ์ให้จัดการผู้ใช้งานในระบบยืนยันตัวตน กรุณาติดต่อผู้ดูแลระบบ") → ไปค้นหาชื่อ user นั้นในหน้ารายการ →
        **พบจริงว่าถูกสร้างสำเร็จ (`foundInListAfterSearch:true`) ทั้งที่ toast แจ้ง error → ยืนยันบั๊กซ้ำเป็นครั้งที่ 3 นับจาก
        30 ก.ย. 2026 (false-negative error toast)**
      อัปโหลดหลักฐานเข้า Linear ด้วย background agent 3 ตัวพร้อมกัน (คนละการ์ด) ตามแนวทาง bulk-upload เดิม — รอผล แล้วเขียน
      Actual Result สไตล์ heading+inline-image ของทั้ง 3 ใบ พร้อมเปลี่ยนสถานะเป็น Passed/Passed/Failed (TC-057 ตัว TC เองคือ
      Failed เพราะ Expected Result ของ TC-057 คือเอกสารยืนยันว่าเกิด mismatch นี้จริง)

- [x] **P5 — ทดสอบ TC-018 (CTXN-10512) เสร็จสมบูรณ์ — Passed 4/4 ข้อ (14 ต.ค. 2026)**
      พบว่า `testcreate01` มี 0 role อยู่ก่อนจริง (ไม่ตรง precondition ของการ์ดที่สมมติว่า "มี role อยู่แล้ว") จึงเพิ่ม setup
      step มอบ role `cashier` ก่อน เพื่อให้การเช็ค "list ไม่แสดง role ที่มีอยู่แล้ว" มีความหมายจริง (กันปัญหา trivial-pass แบบที่
      เคยเจอกับ TC-015/TC-032 ในรอบทดสอบก่อนหน้า) จากนั้นเปิด modal "กำหนดบทบาท" → ยืนยัน `cashier` ไม่อยู่ในรายการที่เลือกได้
      อีก → ค้นหา+เลือก coder → ค้นหาใหม่เป็น kiosk+เลือก (tag coder ไม่หาย) → เปลี่ยนหน้า pagination 1→2→1 (tag coder+kiosk
      ไม่หาย) → ยืนยัน → เปิดแท็บใหม่เช็คจริง ตารางมี cashier+coder+kiosk ครบ (ผ่าน 3/4 ข้อฝั่ง Cortex UI)
      user ส่งภาพ Keycloak Role mapping ของ `testcreate01` มายืนยันข้อ 4 แล้ว: เห็น role ครบ 9 รายการ — 6 ตัวมาจาก
      `default-roles-cortex` (inherited: offline_access, uma_authorization, account:manage-account/-links/view-profile)
      และ client role ของ `cortex` อีก 3 ตัว (`cashier`, `coder`, `kiosk` — Inherited=False คือมอบตรง ไม่ใช่สืบทอด) ยืนยันว่า
      coder/kiosk เป็น **client role ของ cortex ไม่ใช่ realm role** ตรงตาม Expected Result ข้อ 4 ครบถ้วน
      อัปโหลดหลักฐาน 9 ภาพ+1 วิดีโอผ่าน background agent, เขียน Actual Result สไตล์ heading+inline-image, ปิดสถานะเป็น **Passed**

- [x] **P5.5 — ตรวจเพิ่ม (user ถามหลัง P5): assign role แล้ว login จริงเห็น app กี่ตัว (14 ต.ค. 2026)**
      นอกเหนือ Expected Result เดิมของ TC-018 (ไม่บังคับ) — reset password + login เป็น `testcreate01` (role cashier/coder/
      kiosk) ครั้งแรกเจอ**หน้าขาวว่างเปล่าค้างอีกครั้ง** (เหมือนที่เคยเจอใน TC-001/TC-002 มาก่อน, root innerHTML=0 แม้รอนาน+reload)
      user ชี้ทางแก้: เป็นปัญหา **performance ของระบบ ไม่ใช่บั๊ก** — ให้ `goto()` ไปหน้า `/cortex/apps` ตรง ๆ พร้อมเพิ่ม delay
      ลองแล้วได้ผลจริง (รอ 15s + `waitUntil:'networkidle'`) → หน้า render ปกติ เห็น "ยินดีต้อนรับสู่ Cortex" + grid 9 app:
      เวชระเบียน, ศูนย์จัดการเตียง, ผู้ป่วยนอก, ส่งต่อผู้ป่วย, การเงิน, เบิกจ่าย, รายงาน, ผู้ดูแลระบบ, การจัดการเอกสาร
      **สรุป**: ไขปริศนา "หน้าขาว" ที่เคยบันทึกไว้ว่า "ไม่ยืนยัน" ใน TC-001/TC-002 ได้แล้ว — เป็น navigation/timing issue ไม่ใช่
      บั๊กจริง บันทึก pattern แก้ไว้ถาวรใน `agent-app-testing` SKILL.md (section "บทเรียนจริง 14 ต.ค. 2026") ให้ login flow
      script ในอนาคตใช้ `/cortex/apps` + delay เป็นมาตรฐานแทนรอที่หน้า bare OAuth redirect — แนบภาพ/วิดีโอเพิ่มเติม 3 ไฟล์
      เข้า CTXN-10512 เป็นหลักฐานเสริม (ไม่กระทบสถานะ Passed เดิมของ TC-018 เพราะเป็นคนละ scope จาก Expected Result)
      **อัปเดต (14 ต.ค. 2026)**: user ยืนยันให้ย้อนไปแก้ TC-001 (CTXN-10495) และ TC-002 (CTXN-10496) ด้วยแล้ว — แก้ย่อหน้า
      "หมายเหตุสภาพแวดล้อมการทดสอบ" เดิมในทั้งสองการ์ด (ที่เคยเขียนว่า "ยังสรุปไม่ได้ 100%... แนะนำให้ลองซ้ำด้วยเบราว์เซอร์จริง")
      ด้วยการขีดฆ่า (strikethrough) ข้อความเดิมเก็บไว้เป็นประวัติ + เพิ่มคำอธิบายใหม่ว่าไขปริศนาแล้วจาก TC-018 (ลิงก์ไขว้ไป
      CTXN-10512) พร้อมระบุชัดว่าไม่กระทบผล Pass/Fail เดิมของทั้งคู่ (ตัดสินจาก Keycloak Role mapping ล้วน ไม่เกี่ยวกับขั้นตอน
      นี้) — อัปเดตด้วย TC-001's หมายเหตุ bullet เรื่อง TC-005 ให้ไม่ต้องกังวลเรื่องนี้อีกต่อไป

- [x] **P6 — ทดสอบ TC-021 (CTXN-10515) เสร็จสมบูรณ์ — Passed 2/2 ข้อ (14 ต.ค. 2026)**
      user สร้าง role `qa-new-role` ใน Keycloak ที่ Clients → cortex → Roles (client role ของ cortex ตรงตามที่ยืนยันจาก TC-018)
      จากนั้นทดสอบฝั่ง Cortex: เปิดแท็บบทบาทการใช้งานของ `testcreate01` (มี cashier/coder/kiosk จาก TC-018 อยู่แล้ว) →
      เปิด modal "กำหนดบทบาท" → ค้นหา "qa-new-role" **เจอทันทีไม่ต้องตั้งค่าเพิ่มใน Cortex** → เลือก+ยืนยัน → เปิดแท็บใหม่
      ตรวจผลจริง พบ qa-new-role ในตารางสำเร็จ → cleanup นำ role ออกจาก user (dialog ยืนยันระบุชื่อ role ถูกต้อง) กลับสู่
      สถานะเดิมเรียบร้อย **ผ่านครบ 2/2 ข้อของ Expected Result ยืนยันว่า Keycloak เป็น system of record จริง**
      (ระหว่างทดสอบเจอปัญหา: รันรอบแรกพังหลัง assign สำเร็จแต่ก่อน cleanup — แก้โดยเขียนสคริปต์ reset แยกต่างหากนำ role
      ออกก่อน แล้วรันรอบใหม่ end-to-end สะอาดในวิดีโอเดียว) อัปโหลดหลักฐาน 6 ภาพ+1 วิดีโอ เขียน Actual Result สไตล์
      heading+inline-image ปิดสถานะเป็น **Passed** — ยังเหลือ housekeeping ให้ user ลบ role ทิ้งใน Keycloak เอง (ไม่กระทบผล TC)

- [ ] **P7 — ทดสอบ TC-003 เป็นต้นไปตามลำดับ** (ต่อจาก TC-001/TC-002 เดิม) — ใช้ video-flow เดียวต่อเนื่องแบบใหม่ตั้งแต่ต้น

- [x] **P0.5 — ทำ flow-style/รายงานผลใหม่ให้เป็นสกิลถาวร ตามที่ user ขอ** (14 ต.ค. 2026)
      User ขอให้เอาแนวทาง "flow เดียวต่อเนื่อง + สไตล์รายงานใหม่" ไปทำเป็นสกิลแทนที่จะทำแบบ one-off ต่อไปเรื่อยๆ — ถามสถาปัตยกรรม
      2 เรื่องก่อนลงมือ (ตามกฎ "ไม่เล็กน้อยต้องถามก่อน"): (1) ขยายสกิลเดิมหรือสร้างใหม่ → user เลือกขยาย `agent-app-testing`
      (2) gate "atomic vs flow-style" ควรแก้ `linear-testcase-writer` แบบ global (กระทบทุกโปรเจกต์) หรืออยู่แค่สกิลใหม่ → user
      ยืนยันเปลี่ยนใจจากที่เคยบอกไว้ก่อนหน้า ("ใช้เฉพาะงานนี้ก่อน ยังไม่แก้สกิลถาวร") ให้แก้ global จริงแล้ว
      แก้ `linear-testcase-writer` ทั้ง global (`~/.claude/skills/`) และ project copy ให้ตรงกันเป๊ะตามกฎเดิมของสกิล (verify
      ด้วย `diff` แล้วว่า identical): เพิ่มขั้นตอนข้อ 2 ใหม่ (ถาม QA ก่อนวิเคราะห์เสมอ — เลือก atomic/flow-style + ถาม business
      flow/logic แยกต่างหาก), เพิ่ม subsection "Test granularity: atomic vs flow-style" ใต้ Generation rules, ปรับกฎ "ห้ามรวม
      หลาย check ไว้ใน TC เดียว" ให้มีข้อยกเว้นเมื่อเลือก flow-style, log ใน Skill update log
      ขยาย `agent-app-testing` (project-level): เพิ่ม section "รูปแบบ flow การทดสอบ" (วิดีโอเดียวต่อเนื่องเมื่อเป็น flow-style)
      และ "มาตรฐานการรายงานผลใน Linear" (heading ให้ section name เดิม, สถานะ Pass/Fail ต่อท้าย heading "Actual Result",
      สรุปขั้นที่ผ่าน/ไม่ผ่านเปิดต้น Actual Result, ฝังรูป/วิดีโอ inline ด้วย `<linear-image>`/`<linear-embed>` tag — อ้างอิง
      สไตล์จากการ์ด SBH-2513 ที่ user ชี้ให้ดูครั้งเดียว ใช้แค่สไตล์ ไม่เอาข้อมูล/business logic ของโปรเจกต์นั้นมาปน) + เสริม
      "วิธี brief agent" ให้ชัดว่าต้องดึงข้อเท็จจริงจากการ์ด/ไฟล์ TC เก่าจริง ไม่ใช่แค่จำในเซสชัน
      **หมายเหตุ**: syntax `<linear-image>`/`<linear-embed>` ยังไม่ได้ยืนยัน 100% ว่า render ถูกต้อง/URL คงทนไหม — ได้ลองฝัง
      ทดสอบไว้ใน CTXN-10496 แล้ว (ส่วน "[TEST EMBED]" ก่อนหัวข้อ "หมายเหตุ") รอ user เช็คแล้ว confirm ก่อนใช้งานเต็มรูปแบบ
      (ตรงกับ P0 เดิมด้านบน) — เขียนไว้ในสกิลแล้วว่าถ้าเจอว่า broken ย้อนหลังให้กลับไปใช้ attachment list อย่างเดียวแทน

หมายเหตุ: P4 (TC ใหม่ 3 รายการ), P5, P6, P7 — ตอนกรอกผล "Actual Result" ให้ใช้สไตล์ใหม่ตาม P0/P1/P2 ด้วยทุกใบ (heading +
สถานะใน heading + รูปฝัง inline) ไม่ใช่แค่ P1/P2 เท่านั้น


## COR-1724 — [Admin] User, Role in keycloak -> Admin — Test Coverage (Security-focused)

Requirement: https://linear.app/cortexcloud/issue/COR-1724/admin-user-role-in-keycloak-admin
Skill ที่ใช้: `linear-testcase-writer`

### สถานะ: เขียน TC เก็บไว้ในโปรเจกต์ก่อน (ไม่สร้างการ์ด Linear ตอนนี้) — ผู้ใช้จะเทสมือบนเว็บเองก่อน แล้วค่อยขออนุญาตสร้างการ์ดจริง

**Decision (30 ก.ย. 2026):** ผู้ใช้ยืนยันแล้ว — (1) ยังไม่สร้างการ์ดบน Linear ตอนนี้ (2) เก็บ TC ไว้ในโปรเจกต์เป็นไฟล์ Markdown
ที่ `test-cases/COR-1724-admin-user-role.md` (3) ผู้ใช้จะ run เคสเองบนเว็บด้วยมือก่อน เพื่อดูว่า flow จริงตรงกับที่เขียน TC ไว้ไหม
(4) ได้ผลทดสอบแล้วค่อยไปสร้างการ์งจริงบน Linear (5) **ก่อนสร้างการ์ดจริงต้องขออนุญาตผู้ใช้ก่อนทุกครั้ง** ห้ามสร้างเองแม้ผลทดสอบจะออกมาแล้ว

- [x] **P0 — ร่างโครงสร้าง EXE / Scenario / Test Case แบบ draft**
      Scope: EXE 1 รายการ, Scenario 16 รายการ (แบ่งตาม 6 หมวด AC x HPY/UHP/EDG/ERR ตามจริง แต่ละ scenario = suffix เดียว),
      Test Case 83 รายการ ครอบคลุมทุกข้อใน Acceptance Criteria + security-critical extra coverage
      (backend permission enforcement, self-modification prevention, service account refusal,
      partial-apply prevention ของ role assignment, baseline-access failure handling,
      migration safety/backup/ordering)
      ทำแล้ว: เขียนไฟล์เต็มที่ `test-cases/COR-1724-admin-user-role.md` ตาม template ของ skill `linear-testcase-writer`
      ตรวจสอบ: เปิดไฟล์แล้วนับ TC ID ต้องครบ TC-COR-1724-001 ถึง 083, Scenario ครบ SC-01 ถึง SC-16

- [x] **P1 — Confirm กับ user เรื่อง scope/รูปแบบไฟล์/ขั้นตอนก่อนสร้างจริง**
      ทำแล้ว: ถามรูปแบบไฟล์ (Markdown vs Excel) → user เลือก Markdown, และ user แจ้ง workflow ที่ต้องการ (เทสมือก่อน → ค่อยขออนุญาตสร้างการ์ด)

- [x] **P2a — Claude สำรวจหน้าจอจริงบน dev-x ด้วย Playwright (อ่านอย่างเดียว, role Super_User)**
      ทำแล้ว (30 ก.ย. 2026): เขียน script ชั่วคราวใน `temp_scripts/` (ลบแล้วหลังใช้งานตามธรรมเนียมโปรเจกต์) เดินเข้า
      ผู้ดูแลระบบ → โรงพยาบาล → ผู้ใช้งานในระบบ / บทบาทและสิทธิการใช้งาน เก็บ screenshot 15 ภาพไว้ที่ `.playwright-mcp/COR-1724/`
      อัปเดตไฟล์ TC ด้วยข้อมูลจริง: เพิ่ม section "หมายเหตุจากการสำรวจเว็บจริง" ใต้ EXE + แก้ TC-009/010/011
      (คำว่า "authenticator" ใน AC จริง ๆ คือ "OTP" ในระบบ และ "ทั้งคู่" คือตัวเลือกที่ 3 แยกต่างหาก ไม่ใช่ติ๊ก 2 อัน)
      พบ 2 เรื่องต้องถามผู้ใช้ก่อนไปต่อ (ยังไม่แก้ TC ส่วน permission เพราะยังไม่มีคำตอบ):
      (1) ค้นแคตตาล็อกสิทธิ 1,711 รายการ เจอแค่ `menu:setting:user-management` (สิทธิระดับเมนู) ไม่เจอสิทธิแยก view/create/edit/delete ของฟีเจอร์นี้ตามที่ AC บอก
      (2) role "admin" มีจริงในระบบ (742 สิทธิ) แต่ไม่มี test account คู่นี้ใน `.env` (มีแค่ Super_User/Doctor/Nurse)

- [x] **P2b — ผู้ใช้ตอบ 2 คำถามแล้ว (30 ก.ย. 2026):**
      (1) permission gap → ใช้สิทธิ์ที่มีอยู่แล้ว (menu:setting:user-management) ได้ เพราะการ์ดนี้ scope แค่ผู้ใช้งานในระบบ
      (2) admin test account → ให้ Claude สร้าง user admin ใหม่ก่อน ถ้าสร้างไม่ได้ลอง Super_User ถ้ายังไม่ได้ให้บอกกลับ

- [x] **P2c — ลองสร้าง user "qa-admin-test" จริงบน dev-x ผ่าน Playwright script (role Super_User) — ติด blocker ระดับระบบ**
      ทำแล้ว (30 ก.ย. 2026): แก้ script สร้าง user จนกรอกข้อมูลถูกช่องครบ (username/email/first/last ยืนยันค่าก่อนกด บันทึก)
      ผลจริง: กด บันทึก แล้วเจอ toast แดง **"ระบบไม่ได้รับสิทธิ์ให้จัดการผู้ใช้งานในระบบยืนยันตัวตน กรุณาติดต่อผู้ดูแลระบบ"**
      (ไม่ใช่ validation error แบบรอบแรกที่เจอ error-invalid-length ตอนใช้ username "QA" สั้นไป — รอบนี้แก้ username เป็น "qa-admin-test" แล้วแต่ยัง fail)
      วิเคราะห์: เข้าข่าย permission/config ฝั่ง Keycloak เอง (เช่น service account ที่ Cortex ใช้คุย Keycloak ไม่มีสิทธิ์ manage-users) ไม่ใช่เรื่อง role ของ Super_User ในแอป Cortex
      → ไม่มี user "qa-admin-test" ถูกสร้างขึ้นจริง (ทั้ง 2 รอบ fail ก่อนถึงขั้นบันทึกสำเร็จ) ไม่ต้อง cleanup อะไร
      ผลกระทบ: นี่อาจเป็นบั๊กบล็อกทั้ง AC หมวด "Staff account administration" ไม่ใช่แค่เรื่องหา admin test account — ต้องแจ้งผู้ใช้ตาม fallback ที่ตกลงไว้ ("ถ้าไม่ได้อีกให้บอกมา")
      ลบ temp_scripts/ ทิ้งแล้วตามธรรมเนียม (เก็บ screenshot หลักฐานไว้ที่ `.playwright-mcp/COR-1724/admin-create2-02-after-save.png` และรอบแรกที่ `admin-create-02-after-save.png`)

- [x] **P2d — ผู้ใช้สร้าง admin account เองแล้ว + ยืนยัน permission model** (30 ก.ย. 2026)
      ผู้ใช้เพิ่ม `CORTEX_USERNAME_Admin`/`CORTEX_PASSWORD_Admin` ใน `.env` เอง → เพิ่ม `'Admin'` เข้า `ROLES_IN_USE` ใน
      `utils/env.ts` แล้วรัน `npx playwright test --project=setup` ผ่านทั้ง 2 role (Super_User, Admin) — มี `.auth/Admin.json` แล้ว
      ตรวจสอบเพิ่ม: login ด้วย Admin เข้าเมนู user-management ได้ปกติ แต่ชื่อที่แสดง = "neranchara kaewsiri" (บัญชีจริงของผู้ใช้
      ไม่ใช่ synthetic test account แบบ role อื่น) → ถามผู้ใช้แล้ว ผู้ใช้ยืนยัน "เราเล่นที่ env test ดังนั้นใช้ user ที่ให้เล่นได้"
      permission model → ผู้ใช้ยืนยันใช้สิทธิ์ที่มีอยู่จริง (`menu:setting:user-management` ตัวเดียว) ได้
      อัปเดต `test-cases/COR-1724-admin-user-role.md` แล้ว: แก้ EXE-note ทั้ง 2 ข้อเป็น "resolved", แก้ TC-054–057 (UI-level)
      ให้ทดสอบ permission จริงตัวเดียวผ่านเมนู user-management + role-management + direct URL (ไม่ใช่ 4 permission แยกกันที่ไม่มีจริง),
      แก้ TC-058–061 (API-level) ให้ preconditions อ้าง permission key จริง + เปลี่ยน TC-061 จาก "API view ถูกปฏิเสธ" เป็น
      "API assign/remove role ถูกปฏิเสธ" (ไม่ให้ซ้ำกับ TC-055 ที่ครอบคลุม view/URL ไปแล้ว), แก้ cross-reference ใน TC-071

- [x] **P3 — เทส TC ที่อยู่ในขอบเขต (001–066, 071) ด้วย Playwright จริงบน dev-x แล้วบันทึกผล** (30 ก.ย. 2026)
      ขอบเขตที่ user อนุมัติ: TC-001–066 + TC-071 (67 ข้อ) — TC-067–070 (service account) และ TC-072–083 (migration) **ไม่แตะ
      ตามที่ตกลงไว้** (ยังเป็น `- -` เหมือนเดิมในไฟล์ TC)
      วิธีทำ: เขียน Playwright script ชั่วคราว (`playwright-core`, ไม่ผ่าน test runner) ใน `temp_scripts/` ทีละหมวดตาม SC-01→SC-13
      เก็บ screenshot หลักฐาน 68 ภาพที่ `.playwright-mcp/COR-1724/` อัปเดตช่อง "Actual Result" ในไฟล์ TC ทันทีหลังทดสอบแต่ละ TC
      เสร็จแล้วลบ `temp_scripts/` ทิ้งทั้งหมดตามธรรมเนียม — เพิ่ม `'Doctor'`, `'Nurse'` เข้า `ROLES_IN_USE` ใน `utils/env.ts`
      (ถาวร ไม่ใช่ temp) เพื่อให้ setup เตรียม `.auth/Doctor.json` / `.auth/Nurse.json` ให้ด้วย ตามรูปแบบเดียวกับตอนเพิ่ม Admin
      ผลรวม: **Pass 32 · Fail 2 · Gap 32 · N/A 1** (จาก 67 ข้อที่ทดสอบ)

      **[BUG] TC-005 (สร้าง staff account ใหม่) — Fail ซ้ำจากที่เคยเจอตอนสำรวจครั้งก่อน (P2c)**: กรอกฟอร์มถูกต้องครบแล้วกด
      บันทึก เจอ toast แดง "ระบบไม่ได้รับสิทธิ์ให้จัดการผู้ใช้งานในระบบยืนยันตัวตน" ทั้งกับ Super_User และ Admin (ยืนยันว่าเป็น
      บั๊กระดับ backend/service-account ที่ Cortex ใช้คุย Keycloak ไม่ใช่เรื่อง role ของผู้ใช้แอป) → **บล็อกการทดสอบ TC-009–017,
      022–029, 032–044, 071(ครึ่งหนึ่ง) รวม 24 ข้อเป็น Gap** เพราะไม่มี test account ที่สร้างเองให้ทดสอบต่อได้อย่างปลอดภัย
      (กฎห้ามแก้ไข/ลบ account จริงที่มีอยู่แล้ว) — ต้องแจ้ง dev แก้บั๊กนี้ก่อนถึงจะทดสอบ TC เหล่านี้ต่อได้

      **[SECURITY BUG ร้ายแรง] TC-066 (self-modification prevention ผ่าน API) — Fail**: ยิง `PUT /cortex-api/users/{own-id}`
      ตรงด้วย Bearer token จริงของ Admin ไปที่บัญชีตัวเอง (bypass UI, payload เป็นค่าเดิมทั้งหมดเพื่อความปลอดภัย) **ได้ status 200
      สำเร็จ ไม่ถูกปฏิเสธ** — TC-063/064/065 (UI level) ยัง Pass เพราะปุ่มถูกซ่อนหมด แต่พิสูจน์แล้วว่า backend **ไม่ enforce
      self-modification prevention ที่ endpoint แก้ไขข้อมูลทั่วไป** ป้องกันมีแค่ระดับ UI เท่านั้น — ไม่ได้ทดสอบ endpoint
      credential-reset/role-assign ผ่าน API โดยตรงต่อ (หยุดทันทีตามข้อตกลง เพราะเสี่ยงเกินไปกับบัญชีจริง) แต่มีความเสี่ยงสูงว่า
      จะมีช่องโหว่แบบเดียวกัน **ต้องแจ้งทีม dev เป็นประเด็น security ด่วนที่สุด**

      TC ที่ Gap อื่นๆ (นอกเหนือจาก TC-005 blocker): TC-016 (ไม่มีสิทธิ์เข้า backend/DB), TC-020 (UI ไม่มี page-size changer
      จริง — ไม่ใช่บั๊ก แค่ฟีเจอร์ที่ AC สมมติไว้ไม่มีจริง), TC-041 (partial-apply เสี่ยงเกินจะยิง API กับ account จริง),
      TC-045–048 (baseline access ต้องมี Keycloak admin console ที่ไม่มีสิทธิ์เข้า + บล็อกจาก TC-005), TC-049 (N/A ตามที่ตกลง
      ไว้ล่วงหน้า — ต้องมี fresh environment), TC-050–051 (จำลอง baseline-grant-failure ไม่ได้อย่างปลอดภัย)
      อัปเดตไฟล์ `test-cases/COR-1724-admin-user-role.md` ครบทุก TC ในขอบเขต, ตรวจสอบแล้ว: TC ครบ 83 ข้อเหมือนเดิม ไม่มี ID ซ้ำ

- [x] **P3.1 — เพิ่มกรอบสี (แดง=จุดกรอก/ตรวจสอบ, เขียว=ผลลัพธ์ที่ถูกต้อง) ลง evidence screenshot — เริ่ม Phase 1: TC-005 + TC-066** (30 ก.ย. 2026)
      ทำแล้ว: เขียน `markBox()` helper วาดกรอบ+ป้ายบน screenshot ผ่าน Playwright, เข้าเว็บจริงใหม่เพื่อหาตำแหน่ง element ถูกต้อง
      (วาดกรอบบนภาพเดิมเฉยๆ ไม่แม่นเพราะไม่มีตำแหน่ง element เก็บไว้) — TC-005: กรอบแดงรอบช่องกรอก + ปุ่มบันทึก + toast error
      (`tc005-evidence-01/02-*-marked.png`) · TC-066: สร้าง evidence panel แสดง request/response แล้ววงแดงรอบค่า status ที่ผิดคาด
      (`tc066-evidence-01-api-result-marked.png`)
      **พบเพิ่มระหว่างทำ (สำคัญ แก้ไข Actual Result ของ TC-005 แล้ว):**
      (1) TC-005 ตอน re-test เจอ error คนละแบบ ("username/email ถูกใช้งานแล้ว") → ตรวจแล้วพบว่ามี account `qa-cor1724-*` 5 ตัว
      ถูกสร้างสำเร็จจริงในระบบจากการทดสอบรอบก่อน (`qa-cor1724-main`, `-diag-su`, `-diag-ad`, `-apitest-su`, `-evidence`) ทั้งที่ตอนนั้น
      รายงานว่า fail ทุกครั้ง → **บั๊ก TC-005 เป็น intermittent (flaky 403) ไม่ใช่ hard block 100%** ตามที่เคยสรุปไว้ก่อนหน้า
      (2) ดัก network เจอ error ที่แท้จริงชัดเจนกว่าเดิม: `403 ErrUserDirectoryForbidden` — `"cortex-api is not allowed to
      manage users in the identity provider"` (มีประโยชน์มากสำหรับ dev ไปค้นสาเหตุ)
      (3) TC-066 ยืนยันซ้ำด้วย payload ที่ shape ถูกต้อง (unwrap `data` + PascalCase ตาม DTO จริง) ยัง**ได้ 200 สำเร็จเหมือนเดิม**
      — security bug ยืนยันแน่นอนแล้ว ไม่ใช่ความผิดพลาดจาก request ผิด shape
      ยังไม่ได้ทำ: กรอบสีให้ TC ที่เหลือ (Phase 2+ ตามที่ user ขอแบ่ง phase — รอ user เลือกว่าจะทำกลุ่มไหนต่อ)

- [x] **P3.2 — อัดวิดีโอย้อนหลังให้ TC-005 + TC-066** (30 ก.ย. 2026, user ขอเพิ่มหลัง P3.1)
      ทำแล้ว: เปิด browser context ด้วย `recordVideo: { dir, size: 1920x1080 }` ของ playwright-core แล้วรันฟลว์เดิม
      (กรอกฟอร์ม → กด บันทึก → toast error สำหรับ TC-005 / ยิง GET-PUT จริง → แสดง result panel สำหรับ TC-066) พร้อมกรอบแดง
      แบบเดียวกับ P3.1 ปิด context แล้ว rename ไฟล์ .webm ที่ Playwright สร้างอัตโนมัติให้ชื่อสื่อความหมาย
      บันทึกไว้ที่ `.playwright-mcp/COR-1724/videos/tc005-video.webm` (1.0MB) และ `tc066-video.webm` (898KB)
      อ้างอิงไฟล์วิดีโอไว้ในช่อง "หมายเหตุ" ของ TC-005/TC-066 ในไฟล์ TC แล้ว

- [x] **P3.3 — ตรวจสอบตามที่ user ถาม: TC-005 มี user ถูกสร้างจริงไหม + ข้อความ error ถูกต้องไหม + AC กำหนดข้อความไว้ไหม** (30 ก.ย. 2026)
      **แก้ไขสำคัญมาก:** ตรวจ user list จริงพบว่า account ที่เจอ error "ไม่ได้รับสิทธิ์..." **ถูกสร้างสำเร็จจริงทุกครั้ง**
      (เช็ค 6 account: qa-cor1724-main, -diag-su, -diag-ad, -apitest-su, -evidence, -vid-036286 — enabled=true, มี credential
      password ตั้งไว้จริงตรงเวลาที่ทดสอบ) → **สรุปบั๊กใหม่: ไม่ใช่ "สร้างไม่ได้" แต่คือ "สร้างสำเร็จแต่ระบบแจ้ง error ผิด"** อันตรายกว่าที่
      เคยรายงานไว้มาก เพราะแอดมินจะเข้าใจผิดว่าไม่มีอะไรเกิดขึ้นแล้วอาจกดซ้ำ (มี account ทดสอบสะสมแล้ว 8 ตัว) · เช็ค AC จากการ์ด Linear
      COR-1724 แล้ว **ไม่มีการระบุข้อความ success/failure ไว้เลย** เป็น product/backend bug ไม่ใช่แค่เรื่องขาด spec ข้อความ
      แก้ Actual Result ของ TC-005 ในไฟล์ TC ใหม่ทั้งหมดให้ตรงกับที่พบจริงแล้ว
      **ยังไม่ได้ทำ:** ไปแก้ไข ~24 TC ที่เคยมาร์ค "Gap — blocked by TC-005" (TC-009–017, 022–029, 032–044, 071) ทั้งที่จริงแล้ว
      `qa-cor1724-main` เป็น account ที่ใช้งานได้จริง (มี credential แล้ว แค่ยังไม่มี role) — รอ user สั่งว่าจะให้ทดสอบต่อเลยไหม
      **ทำเพิ่มระหว่างทาง (user ขอกลางคัน):** ย้าย screenshot ทั้งหมด (77 ไฟล์) จาก `.playwright-mcp/COR-1724/` เข้าโฟลเดอร์ย่อย
      `images/` ให้เข้าชุดเดียวกับ `videos/` ที่มีอยู่แล้ว + แก้ path อ้างอิงในไฟล์ TC ทุกจุดให้ตรง (`grep -c ".png"` ยืนยันไม่มี path เก่าค้าง)

- [x] **P3.4 — เพิ่มกฎถาวรใน `qa-automate-readiness` skill ตามที่ user สั่ง + อัดวิดีโอ TC-005 ใหม่ให้ตรงกฎ** (30 ก.ย. 2026)
      ผู้ใช้สั่ง: "เวลาเทสต้องไปเช็คว่าได้ผลออกมาตามคาดจริง ต่อให้ต้องไปดูอีกหน้าก็ต้องอัดวิดีโอต่อไปให้จบเคส เพราะจะเอาผลไปแปะเทสเคสในอนาคต"
      → แก้ `.claude/skills/qa-automate-readiness/SKILL.md` step 6: เพิ่มกฎห้ามเชื่อข้อความ/response ที่ UI แสดงทันทีอย่างเดียว
      ต้องยืนยันสถานะจริงของระบบก่อนสรุปผล และถ้าต้องข้ามหน้าไปเช็คต่อ วิดีโอต้องอัดต่อเนื่องจบในคลิปเดียว + เพิ่ม log อ้างอิงเคส TC-005 จริง
      อัดวิดีโอ TC-005 ใหม่ทับของเดิม (`videos/tc005-video.webm`, 2.0MB) เป็นคลิปเดียวต่อเนื่อง: กรอกฟอร์ม → กด บันทึก → toast error
      (กรอบแดง) → ค้นหาในหน้ารายการ → เจอ account จริง (กรอบเขียว) → เปิด detail เห็นเปิดใช้งานจริง (กรอบเขียว) → แท็บการเข้าสู่ระบบ
      เห็น credential ตั้งไว้แล้ว (กรอบเขียว) — repro ซ้ำด้วย username ใหม่ `qa-cor1724-full-*` ได้ผลเดิมทุกจุด (API 403 แต่สร้างจริง)
      แก้ "หมายเหตุ" ของ TC-005 ในไฟล์ TC ให้ตรงกับวิดีโอใหม่แล้ว

- [x] **P3.5 — สร้างสกิลใหม่ `agent-app-testing` ตามที่ user ขอ** (30 ก.ย. 2026)
      ผู้ใช้ขอ: "อยากให้เพิ่ม skill เรื่องการให้ agent ทดสอบเล่นระบบเพิ่มหน่อย" → ถามก่อนว่าจะแยกสกิลใหม่หรือรวมเข้า
      qa-automate-readiness step 6 เดิม → ผู้ใช้เลือกแยกสกิลใหม่
      ทำแล้ว: สร้าง `.claude/skills/agent-app-testing/SKILL.md` สรุป pattern จากงาน COR-1724 ทั้งหมด — กฎความปลอดภัยก่อน
      dispatch (ขอบเขตที่ปลอดภัย/ต้อง authorize แยก, ตั้งชื่อ test data ให้แยกแยะได้), วิธี brief agent, มาตรฐานหลักฐาน
      (โฟลเดอร์ images/+videos/, กรอบแดง=จุดกรอก/ตรวจสอบ, กรอบเขียว=ผลถูกต้อง), กฎยืนยันผลจริงไม่เชื่อ UI อย่างเดียว
      (อ้างอิงเคส TC-005 จริง), วิธีรายงานผลกลับ, ตารางความสัมพันธ์กับสกิลอื่น
      แก้ `qa-automate-readiness/SKILL.md` ให้ชี้มาสกิลใหม่นี้ที่ step 6 (เมื่อเลือกใช้ agent) + เพิ่มแถวในตารางความสัมพันธ์
      + เพิ่ม Skill update log entry ทั้งสองสกิล · เรียก Skill tool ทดสอบโหลด `agent-app-testing` ผ่านปกติ

- [x] **P3.6 — แก้ status label "Gap" → "Not Test" ให้ตรงกับ vocabulary ที่ `linear-testcase-writer` กำหนดไว้แล้ว** (30 ก.ย. 2026)
      ผู้ใช้ทัก: "ใช่ Not Test" — จริง ๆ skill `linear-testcase-writer` กำหนด Test Case status ที่อนุญาตไว้แล้วคือ
      Not Run / Passed / Failed / Blocked / Not Test (ไม่มี "Gap") แต่ตอนบันทึกผลจริงใช้คำว่า "Gap" ไปเองแบบไม่เป็นทางการ
      ทำแล้ว: sed แทนที่ `- Gap —` → `- Not Test —` ทั้งไฟล์ (31 จุด) และ `- N/A —` → `- Not Test (N/A) —` (1 จุด, TC-049)
      รวม 32 จุด ยืนยันแล้ว: ไฟล์ยังคง 83 TC ไม่มี ID ซ้ำ — ไม่ต้องแก้สกิลไหนเพิ่ม เพราะ vocabulary ถูกกำหนดไว้ถูกอยู่แล้ว
      แค่แก้การใช้งานจริงให้ตรงกับที่กำหนดไว้

- [x] **P3.7 — เริ่ม Phase 2 (dispatch agent เทส 23 TC ที่เคยเป็น Not Test) + แก้กฎวิดีโอเป็นบังคับทุก TC** (30 ก.ย. 2026)
      dispatch background agent (agentId a52f41ec1e723028e) ให้เทส TC-009–017, 024–029, 033–034, 038–044 (23 ข้อ,
      ไม่รวม TC-020 เพราะเป็น UI limitation ถาวรไม่เกี่ยวกับ test account) ใช้ `qa-cor1724-main` + สร้าง account เพิ่ม
      ตามที่แต่ละ TC ต้องการ (แยก account สำหรับ delete-flow และ login-method variants) ตามกฎ skill `agent-app-testing`
      ระหว่างรอผล user ทักว่า Phase 1 เก็บแค่ screenshot ให้ 65/67 TC ไม่มีวิดีโอ เพราะกฎเดิม (ทั้ง qa-automate-readiness
      step 6 และ agent-app-testing) เขียนว่า "วิดีโอหรือภาพ" (เลือกได้) → ผู้ใช้ยืนยัน "ต้องมี vdo และ ภาพ" ทุก TC
      แก้ทั้ง 2 สกิลเป็น "ต้องมีทั้งวิดีโอและภาพ ไม่ใช่เลือกอย่างใดอย่างหนึ่ง" แล้ว + ส่ง SendMessage แจ้ง agent ที่กำลังรัน
      Phase 2 อยู่ให้ (1) กลับไปอัดวิดีโอเพิ่มให้ TC ที่ทดสอบไปแล้วแต่มีแค่ screenshot (2) TC ที่เหลือให้อัดวิดีโอคู่กับ
      screenshot ตั้งแต่ต้น — รอผลสรุปจาก agent ต่อไป

- [x] **P3.8 — ผลสรุป Phase 2: เทสครบ 23 TC ที่เคยเป็น Not Test แล้ว** (30 ก.ย. 2026)
      ทำแล้ว: เทสตามลำดับด้วย `qa-cor1724-main` (edit/role/credential) + สร้าง account เพิ่มตามที่แต่ละกลุ่มต้องการ
      (delete-flow, login-method variants, authenticator enroll/delete) ทุก TC มีทั้ง screenshot (กรอบแดง=จุดกรอก/ตรวจสอบ,
      กรอบเขียว=ผลถูกต้อง) และวิดีโอ (.webm) ตามกฎที่ user แก้ระหว่างทำงาน (P3.7) — เก็บที่ `.playwright-mcp/COR-1724/images/`
      (198 ภาพรวม Phase 1+2) และ `.playwright-mcp/COR-1724/videos/` (20 ไฟล์รวม Phase 1+2)
      **ผลรวม: Pass 22 · Fail 1 (จาก 23 ข้อ)**
      อัปเดต `test-cases/COR-1724-admin-user-role.md` ครบทุก TC ในขอบเขต ตรวจสอบแล้ว: ยังคง 83 TC เหมือนเดิม ไม่มี ID ซ้ำ

      **[FAIL] TC-010 (login method "OTP" อย่างเดียว)**: สร้าง account ด้วย login method "OTP" (ไม่มีช่องรหัสผ่านชั่วคราวให้กรอกตอนสร้างเลย)
      ลอง login ครั้งแรกด้วย username อย่างเดียว (ไม่มี credential ประเภทรหัสผ่านให้กรอก) ได้ผล **"Invalid username or password"**
      ทันที ไม่ไปถึงหน้ายืนยันตัวตนด้วย OTP เลย — สรุปว่า account ที่สร้างด้วย login method นี้อย่างเดียว **ไม่มีช่องทาง login ผ่านฟอร์มเว็บ
      มาตรฐานได้เลย** ไม่ตรงกับ Expected Result ("ระบบบังคับให้ยืนยันตัวตนด้วย OTP") — **ควรแจ้งทีม dev/product ตรวจสอบ** ว่าเป็นบั๊ก
      หรือ flow ที่ตั้งใจไว้ต้องใช้ช่องทางอื่นที่ยังไม่ implement/เปิดใช้ใน dev-x

      **[ข้อสังเกตสำคัญ ไม่ใช่บั๊กของ TC ที่ทดสอบ แต่ควรแจ้ง product] TC-025 (re-enroll authenticator หลังลบ)**: การลบ
      authenticator (OTP) ฝั่ง admin เพียงอย่างเดียว **ไม่บังคับ user ให้ enroll ใหม่อัตโนมัติ** ตอน login ครั้งถัดไป (login ผ่านได้ด้วย
      password เดิมตรงๆ กลายเป็นบัญชีไม่มี MFA แบบเงียบๆ) ต้องให้ admin ตั้ง required action "ต้องตั้งค่าแอปยืนยันตัวตน" เพิ่มเองอีกขั้นตอน
      ถึงจะบังคับ re-enroll ได้ (ทดสอบแล้วว่าทำแบบนี้ได้ผลตามคาด — TC-025 เลยยัง Pass เพราะ Expected Result แค่บอกว่า "enroll ใหม่ได้
      ไม่ติด error จากตัวเก่า" ซึ่งทำได้จริง แต่ user ควรรู้ว่าต้องมี 2 ขั้นตอนไม่ใช่ขั้นตอนเดียว) — ยืนยันเพิ่มว่า Keycloak account console
      ของ realm นี้ใช้ไม่ได้ (error "Something went wrong") จึงไม่มีช่องทาง self-service ให้ user enroll เองด้วย

      **เทคนิคที่ใช้ทดสอบ TC-011/024/025 (OTP enrollment) ได้จริง**: ไม่ต้องพึ่งช่องทางรับ OTP ภายนอก — หน้า Keycloak
      "Mobile Authenticator Setup" มีลิงก์ "Unable to scan?" ที่เปิดเผย secret key แบบ manual (base32) ให้ผู้ enroll เอง
      (เป็นกลไกมาตรฐานสำหรับกรณีสแกน QR ไม่ได้ ไม่ใช่การ bypass ความปลอดภัย) → เขียน TOTP algorithm เอง (RFC 6238, HMAC-SHA1)
      ใน `lib.cjs` คำนวณ one-time code จาก secret นั้นได้เหมือนแอป authenticator จริงทำ ใช้เทสได้ทั้ง enroll ครั้งแรก (TC-011)
      และ re-enroll หลังลบ (TC-025) สำเร็จ 100%

      บัญชีทดสอบที่สร้างเพิ่มใน Phase 2 (ทั้งหมด prefix `qa-cor1724-*` ตามกฎ): `qa-cor1724-del-561597`/`-627269` (delete-flow,
      ลบไปแล้วทั้งคู่ตามการทดสอบ TC-014/015/017 — ไม่เหลือในระบบแล้ว), `qa-cor1724-pw-*` (6 accounts, สร้างระหว่างไล่แก้ selector
      login — ใช้จริงแค่ 1 ตัวจนจบ ที่เหลือ 5 ตัวเป็น test account ที่สร้างสำเร็จแต่ login ยังไม่เสร็จ ค้างอยู่เฉยๆ ไม่มีอันตราย),
      `qa-cor1724-otp-251339` (login method OTP อย่างเดียว, ใช้ยืนยัน TC-010 Fail), `qa-cor1724-both-*` (6 accounts, ใช้ไล่ debug +
      ยืนยันผล TC-011/024/025 — 2 ตัวสุดท้าย `-675486`/`-827829` คือตัวที่ใช้เป็นหลักฐานจริงของ TC-024/025)
      **ยังไม่ได้ลบ account ที่เหลือค้างอยู่** (ไม่ใช่ข้อมูลจริง ไม่กระทบใคร แต่ user อาจอยากให้ล้างทิ้งภายหลัง)

      ลบ `temp_scripts/` ทิ้งหมดแล้วตามธรรมเนียม (สร้าง `lib.cjs` ใช้ร่วมทุก script ระหว่างทำงาน มี helper: openUserDetail,
      markBox/shotAndClear สำหรับกรอบสี, newVideoContext/newFreshVideoContext/finalizeVideo สำหรับอัดวิดีโอ, totp() สำหรับคำนวณ OTP)

- [x] **P3a — user ขอให้บันทึกผลที่เทสแล้ว (67 TC) ไว้ที่ Linear project "[QA] Test Run Results" ก่อน** (30 ก.ย. 2026)
      **นี่คนละงานกับ P3 เดิม** — P3 เดิม (สร้าง EXE/Scenario/TC ชุดเต็มใต้การ์ด COR-1724 จริงที่ project "Squad Cop") ยังไม่ทำ
      เพราะเทสยังไม่จบ (เหลือ 16 TC) — งานนี้คือบันทึกผล "run" ที่เทสไปแล้วไว้ที่การ์ด **CTXN-9655** (parent ที่ user สร้างเอง
      ไว้ล่วงหน้าที่ https://linear.app/cortexcloud/issue/CTXN-9655/cor-1724, project "[QA] Test Run Results", team
      "New Cortex") แทน — เป็นการชั่วคราวจนกว่าจะเทสครบ
      เจอ convention เดิมของ project นี้จากการ์ดจริง 5 ใบที่มีอยู่แล้ว (CTXN-9647–9651, ทดสอบ flow NUH) — ไม่ใช่โครงสร้าง
      EXE/Scenario/TC ของ skill `linear-testcase-writer` แต่เป็น: การ์ด parent สรุป sign-off (tally Pass/Fail/Not Run)
      + sub-issue (parentId ชี้ parent) ต่อรายการทดสอบ 1 ใบ มี Status/Steps/Expected Criteria + แนบภาพ 1 รูป
      คาดว่ามี skill `linear-execution-test` (sync จาก claude.ai) กำหนด convention นี้ไว้ แต่ยังไม่ได้ลงทะเบียนใช้ในเซสชันนี้
      → ใช้วิธีเทียบจาก 2 การ์ดจริง (CTXN-9647 parent, CTXN-9648 child) แทน
      ยืนยัน scope กับ user แล้ว: 67 TC ที่เทสแล้วเท่านั้น (ไม่รวม 16 ที่ยังไม่ได้ทดสอบ), แนบทั้งภาพและวิดีโอ (ไม่ใช่แค่ภาพ)
      dispatch background agent ไปทำ (agentId aad6627e62fc3c8b6): อัปเดต description CTXN-9655 เป็นการ์ดสรุป + สร้าง
      sub-issue 67 ใบพร้อมแนบไฟล์ — รอผลสรุปจาก agent

- [x] **P3b — agent รอบแรก fail กลางทาง (ติด API session limit) + หลุด pattern 6 ใบก่อน fail** (30 ก.ย.–1 ต.ค. 2026)
      ตรวจสอบ Linear จริงพบ: สร้างถูกต้องไปแล้ว 31 ใบ (TC-COR-1724-001 ถึง 031, CTXN-9656–9686) แต่ก่อน fail agent หลุดไปสร้าง
      6 ใบผิด pattern (EXE-CT-2.8.0 + 5 Scenario แบบ `linear-testcase-writer` แทนที่จะเป็น pattern ของโปรเจกต์นี้) —
      ถามผู้ใช้แล้วลบ (mark Canceled, ไม่มี hard-delete tool ให้ใช้) ทั้ง 6 ใบเรียบร้อย (CTXN-9687,9691,9695,9699,9703,9707)
      ไม่มีผลกระทบอะไรเพราะเป็นใบใหม่ ไม่มี sub-issue/attachment ของตัวเอง ไม่มีที่ไหนอ้างอิงถึง
      **เพิ่มขอบเขตใหม่ตามที่ user ขอกลางทาง:** สร้างการ์ดให้ TC ที่ยังไม่ได้เทส (16 ข้อ: TC-067–070, TC-072–083) ด้วย
      ไม่ใช่แค่ 67 ที่เทสแล้ว — ใช้ status `⚪ Not Run` (ไม่มี Actual Result section เพราะยังไม่มีผล)
      dispatch agent รอบ 2 (agentId a1264ad6896dd9346) สร้างต่อจาก TC-032 + TC-071 (36 ใบ) และ TC ที่ยังไม่เทส (16 ใบ)
      รวม 52 ใบ พร้อมสั่งเข้มงวดเรื่อง pattern (ห้ามสร้าง EXE/Scenario เด็ดขาด, เช็ค Linear จริงเป็นระยะทุก ~10 ใบกัน drift
      ซ้ำรอยรอบแรก) + map สถานะจากไฟล์ TC เป็น vocabulary ของโปรเจกต์นี้ (Pass→🟢 Passed, Fail→🔴 Failed,
      Not Test→🟡 Blocked, ยังไม่เทส→⚪ Not Run) — รอผลสรุป

- [x] **P3c — user แก้ไขความเข้าใจผิดของ P3b: 6 ใบที่คิดว่า "หลุด pattern" จริง ๆ คือถูกต้องแล้ว** (1 ต.ค. 2026)
      user ทัก: "ควรต้องย้ายไปเป็น sub-issue ของ CTXN-9687 ตามรูปแบบที่ระบุใน skill ไม่ใช่ไหม และใน linear มี status ที่ตรงกัน
      ก็ควรใส่ status ให้ตรงกันเลย" → ตรวจสอบพบว่า CTXN-9687 (EXE) และ 5 การ์ด Scenario ที่เคย cancel ไปจริง ๆ คือ agent รอบแรก
      กำลังสร้างโครงสร้าง **EXE → Scenario → TC ตาม skill `linear-testcase-writer` ที่ถูกต้องอยู่** (ไม่ใช่หลุด pattern)
      แค่ยังทำไม่เสร็จก่อน fail — เนื้อหาตรงกับ EXE/Scenario body template ของ skill เป๊ะ และ 5 Scenario ที่สร้างไว้ (SC-01–05)
      ตรงกับเนื้อหาในไฟล์ `test-cases/COR-1724-admin-user-role.md` จริง
      ยังพบด้วยว่า team "New Cortex" มี Linear native status ตรงกับที่ต้องการอยู่แล้ว: Passed, Failed, Not Test, Blocked,
      Not Run — และ 31 TC การ์ดที่สร้างไปแล้วก็ตั้ง native status พวกนี้ถูกต้องอยู่แล้วด้วย (ไม่ต้องแก้)
      แก้ไข: stop agent รอบ 2 ที่กำลังสร้างการ์ดแบบ flat (parent=CTXN-9655 ตรงๆ) ทันทีก่อนจะสร้างเพิ่ม (ยังไม่ทันสร้างการ์ด
      ใหม่ใด ๆ ก่อนถูก stop) → restore CTXN-9687 + 5 Scenario card กลับเป็น "Ready for Testing" (default ของ skill)
      dispatch agent รอบ 3 (agentId aeb9db920b699ccbc): (1) ย้าย parentId ของ TC-001–031 (31 ใบ) จาก CTXN-9655 ไปเป็นลูกของ
      Scenario card ที่ถูกต้องตาม Scenario ID จริง (2) สร้าง Scenario card ที่เหลือ SC-06–16 (11 ใบ) จากเนื้อหาจริงในไฟล์
      (3) สร้าง TC การ์ดที่เหลือ 52 ใบ (36 เทสแล้ว + 16 ยังไม่เทส) เป็นลูกของ Scenario ที่ถูกต้อง ใช้ template TC เต็มของ
      skill + ตั้ง native status ตรง ๆ (4) อัปเดต CTXN-9655 เป็นการ์ดสรุป — รอผลสรุป

- [x] **P3d — agent รอบ 3 (agentId aeb9db920b699ccbc): ทำ (1)+(2) เสร็จ, หยุดก่อน (3) เจอ premise ไม่ตรงของจริง** (1 ต.ค. 2026)
      **(1) ตรวจสอบ parentId ของ 31 ใบเดิม (TC-001–031):** ตรวจจริงด้วย `list_issues` พบว่า**ถูกต้องอยู่แล้วทั้งหมด** —
      ไม่มีใบไหนชี้ไปที่ CTXN-9655 ตรง ๆ เลย ทุกใบชี้ไปที่ Scenario card ที่ถูกต้องตาม Scenario ID ของตัวเองแล้ว (16+2+3+8+2=31
      ครบ ตรงกับ SC-01..SC-05) — สรุปว่า**ไม่ต้องย้ายอะไร งานนี้เสร็จไปแล้วก่อนหน้า (รอบ agent ก่อน ๆ ทำไว้แล้ว)**
      **(2) สร้าง Scenario card ที่เหลือ SC-06–16 (11 ใบ) เป็นลูกของ CTXN-9687:** ทำสำเร็จครบ 11 ใบ ตรวจซ้ำด้วย `list_issues
      parentId=CTXN-9687` แล้วเห็นครบ 16 ใบ (SC-01..SC-16) สถานะ "Ready for Testing" ทุกใบ ไม่มีซ้ำ — เนื้อหา (วัตถุประสงค์/
      ขอบเขต Requirement/ความเสี่ยง) สรุปจากไฟล์ `test-cases/COR-1724-admin-user-role.md` ตรงความหมายเดิม เขียน title ภาษาไทย
      แบบย่อ (ไม่ใช่แปลตรงตัวจาก header อังกฤษในไฟล์ เพราะไฟล์ไม่มีชื่อไทยให้สำหรับ SC-06–16 เลย — ใช้วิธีเดียวกับที่ SC-01–05
      ทำไว้แล้วจริงคือตั้งชื่อย่อตามเนื้อหา ไม่ใช่แปลตรงตัว): SC-06=CTXN-9716, SC-07=CTXN-9717, SC-08=CTXN-9718,
      SC-09=CTXN-9719, SC-10=CTXN-9720, SC-11=CTXN-9721, SC-12=CTXN-9722, SC-13=CTXN-9723, SC-14=CTXN-9724,
      SC-15=CTXN-9725, SC-16=CTXN-9726
      **หยุดก่อน (3) สร้าง TC การ์ด 52 ใบ — เจอ premise ไม่ตรงของจริง:** task brief บอกว่า TC เดิม 31 ใบ "ใช้ template ของ
      skill เป๊ะแล้วเหมือน EXE/Scenario" แต่ตรวจ `get_issue` จริงของ CTXN-9656/9660/9671 (ตัวอย่าง TC-001/005/016) พบว่า
      **31 ใบเดิมใช้ template คนละแบบกับที่ task brief อ้าง** — ของจริงคือ template สั้นแบบเดิมของโปรเจกต์นี้ (`**Status**:
      <emoji> <Pass/Fail>` / `**Steps**` / `**Expected Criteria**` / `**Actual Result**`) ไม่มี "ข้อมูลอ้างอิง/TC ID/
      Scenario ID/Case Type/Preconditions/Test Data" เหมือน TC template เต็มของ skill `linear-testcase-writer` เลย
      (ซึ่งตรงกับที่ P3a เคยบันทึกไว้แล้วว่า convention ของ project นี้ "ไม่ใช่โครงสร้าง TC ของ skill linear-testcase-writer")
      — ถ้าสร้าง 52 ใบใหม่ด้วย TC template เต็มของ skill ตามที่ task brief สั่ง จะได้การ์ดที่หน้าตาไม่เหมือนพี่น้อง TC 31 ใบ
      เดิมเลยใต้ Scenario เดียวกัน (ผิดเป้า "เพื่อความสม่ำเสมอ" ที่ task brief ให้เหตุผลไว้) — **รอ user ยืนยันก่อนว่าจะให้ TC
      ใหม่ 52 ใบใช้ template แบบไหน**: (ก) ใช้ template สั้นแบบเดิมให้ตรงกับ 31 ใบจริงที่มีอยู่ หรือ (ข) ใช้ template เต็มของ
      skill ตามที่ task brief สั่งไว้ (จะทำให้ 31 ใบเดิมกับ 52 ใบใหม่หน้าตาไม่ตรงกัน) — ยังไม่ได้แตะ/สร้าง TC การ์ดใหม่ใบไหน
      เลย (step 3 และ step 4 ยังไม่เริ่ม) — `temp_scripts/linear-progress.txt` มี mapping Scenario ID → Linear issue ID
      ครบทั้ง 16 ตัวไว้ให้ใช้ต่อหลังตกลง template แล้ว

- [x] **P3e — user ตัดสินใจ: ใช้ template เต็มของ skill ให้ครบทุกใบ (83 ใบ) เพื่อความสม่ำเสมอ** (1 ต.ค. 2026)
      เลือกตัวเลือก (ข) จาก P3d — หมายความว่าต้อง**เขียน description ของ 31 ใบเดิมใหม่ทั้งหมด**ด้วย (ไม่ใช่แค่สร้าง 52 ใบใหม่
      เฉย ๆ) ให้เป็น template เต็ม (ข้อมูลอ้างอิง/TC ID/Scenario ID/Case Type/Test Level/Test Type/Priority/Preconditions/
      Test Data/Test Steps/Expected Result/Actual Result/หมายเหตุ) — title/parentId/state ของ 31 ใบเดิมไม่ต้องแก้ (ถูกอยู่แล้ว)
      dispatch agent รอบ 4 (agentId acc567ef454e6b026): (1) เขียน description ของ TC-001–031 (31 ใบ) ใหม่ตาม template เต็ม
      (2) สร้าง TC-032–066 + TC-071 (36 ใบ, เทสแล้ว) และ TC-067–070 + TC-072–083 (16 ใบ, ยังไม่เทส state "Not Run")
      เป็นลูกของ Scenario ที่ถูกต้องตาม mapping ที่ได้จาก P3d (3) แนบภาพ+วิดีโอเฉพาะ TC ที่มีผลจริง เช็คก่อนว่ามี attachment
      อยู่แล้วหรือยังกันซ้ำ (4) อัปเดต CTXN-9655 เป็นการ์ดสรุปหลังสุด — งานใหญ่ (83 description write + ~70 attachment)
      สั่งให้ทำเป็นช่วง ๆ เช็ค Linear จริงเป็นระยะ หยุดเก็บ progress ได้ถ้า context ยาวเกิน — รอผลสรุป

- [x] **P3f — agent รอบ 4: เขียน description 31 ใบเดิมใหม่ครบ + สร้าง TC 52 ใบใหม่ครบ + สรุป CTXN-9655 — เหลือเฉพาะ attachment** (1 ต.ค. 2026)
      **(1) เขียน description 31 ใบเดิม (CTXN-9656–9686) ใหม่ครบทุกใบ** ด้วย template เต็มของ skill (ข้อมูลอ้างอิง/TC ID/
      Scenario ID/Case Type/Test Level/Test Type/Priority/Preconditions/Test Data/Test Steps/Expected Result/
      Actual Result/หมายเหตุ) ดึงเนื้อหาจากไฟล์ `test-cases/COR-1724-admin-user-role.md` ตรงเป๊ะ ไม่แต่งเอง title/parentId/state
      ไม่แตะ (ยืนยันจาก tool output ของทุกใบว่าไม่เปลี่ยน) — ยืนยัน mapping TC-001..031 = CTXN-9656..9686 (ลำดับตรงกันจริง
      ผ่าน `list_issues parentId=<scenario>` ของทั้ง 5 scenario เดิม)
      **เจอบั๊ก formatting ของ Linear ระหว่างทำ**: เขียน field ที่ไม่มีข้อมูล (ไฟล์ใช้ `- -`) เป็น `* -` ตรง ๆ แล้ว Linear editor
      parse ผิดเป็น nested empty list (`* \n  * \n`) — แก้โดย wrap เป็น `` * `-` `` (backtick) แทน ใช้วิธีนี้กับทุก field ว่าง
      ตั้งแต่นั้น (แก้ย้อนหลัง 6 ใบที่เจอปัญหาไปแล้วก่อนด้วย) — สังเกตเพิ่ม: Linear auto-link คำว่า "COR-1724" ที่เป็น plain text
      ให้กลายเป็น issue reference อัตโนมัติทุกครั้ง (เช่นใน "TC-COR-1724-001" กลายเป็น "TC-<link>COR-1724</link>-001") เป็น
      พฤติกรรมของ platform เอง ไม่กระทบเนื้อหาที่แสดงจริง ปล่อยผ่านได้
      **(2) สร้าง TC การ์ดที่เหลือ 52 ใบครบ** (TC-032–066 + TC-071 = กลุ่ม A เทสแล้ว 36 ใบ, TC-067–070 + TC-072–083 =
      กลุ่ม B ยังไม่เทส 16 ใบ) เป็นลูกของ Scenario ตรงตาม mapping ที่ P3d เตรียมไว้ (SC-06=CTXN-9716 ... SC-16=CTXN-9726)
      native state: Pass→Passed, Fail→Failed, Not Test→Not Test, กลุ่ม B→Not Run — ตรวจสอบทุกใบผ่าน tool output จริง
      ไม่มีใบไหนผิด parentId/state **หนึ่งจุดที่ต้องตัดสินใจเอง**: TC-071 Actual Result ขึ้นต้นด้วย "Gap (ครึ่งหนึ่ง)" ไม่ตรงกับ
      4 เงื่อนไข prefix ที่กำหนดไว้ (Pass/Fail/Not Test/กลุ่ม B) เพราะเป็นผลครึ่งเทสครึ่งบล็อก — เลือกตั้งเป็น "Not Test" เพราะ
      ส่วนหลักที่ยังขาด (ฝั่ง super-user/admin ลบสำเร็จ) ยังทดสอบไม่ได้จริง ระบุไว้ชัดในหมายเหตุของ TC-071 เองว่าเป็นการตัดสินใจ
      ของ agent ให้ QA ยืนยันอีกครั้ง
      **(3) อัปเดต CTXN-9655 เป็นการ์ดสรุป sign-off** นับ tally จาก native status จริงของทั้ง 83 ใบ (ยืนยันด้วย `list_issues
      project="[QA] Test Run Results" limit=250` อ่านครบทุกใบจริง ไม่ใช่เดา): **Total 83 | 🟢 Passed 53 | 🔴 Failed 3 |
      🟡 Not Test 11 | ⚪ Not Run 16 | Pass Rate 64%** เลือก emoji หลักเป็น 🔴 เพราะมี security bug ร้ายแรงเปิดอยู่ (TC-066)
      ไม่แตะ title/state ของ CTXN-9655 (ยังเป็น "COR-1724"/"Testing" เหมือนเดิม) — ตรวจสอบเพิ่มว่าการ์ด "NUH" ที่ไม่เกี่ยวข้อง
      (CTXN-9711–9715, test run คนละชุดในโปรเจกต์เดียวกัน) ไม่ถูกแตะเลย
      **ยังไม่ได้ทำ (เหลือทำรอบถัดไป): step 4 แนบไฟล์ภาพ+วิดีโอ** — พบว่าโฟลเดอร์ evidence มีจริง 198 ภาพ + 20 วิดีโอ (66MB) ที่
      `.playwright-mcp/COR-1724/{images,videos}/` และ 31 ใบเดิมมี attachment บางส่วนติดมาจากรอบก่อนแล้ว (ไม่ครบทุกไฟล์ที่
      หมายเหตุอ้างถึง) ส่วน 52 ใบใหม่ยังไม่มี attachment เลย — ประเมินแล้วว่าต้องอัปโหลดอีกกว่า 100 ไฟล์ทีละไฟล์ (signed URL
      หมดอายุ 60 วินาที ห้าม batch) ข้ามรอบนี้ไปตามกฎที่อนุญาตให้หยุดได้ถ้างานใหญ่เกิน — เขียนรายการไฟล์ที่ขาดของทุก TC
      แบบละเอียด (TC ID → CTXN ID → รายชื่อไฟล์ที่ต้องอัป) ไว้ที่ `temp_scripts/linear-progress.txt` แล้ว **ยังไม่ลบ
      temp_scripts/ เพราะงานยังไม่เสร็จ 100%** (ขัดกับกฎที่ต้องลบแค่ตอนเสร็จจริง)

- [ ] **P3g — แนบไฟล์ภาพ+วิดีโอให้ TC ที่เหลือ** (ต่อจาก P3f — เดิมดูรายการไฟล์ที่ขาดทั้งหมดที่ `temp_scripts/linear-progress.txt`)
      scope: ~100+ ไฟล์ข้าม ~40 TC การ์ด (31 ใบเดิมที่แนบไม่ครบ + 36 ใบ Group A ที่ยังไม่มีเลย) ทำทีละไฟล์
      (prepare_attachment_upload → curl PUT → create_attachment_from_upload, ห้าม batch เพราะ signed URL หมดอายุ 60 วิ)
      เสร็จแล้วค่อยลบ `temp_scripts/` ทิ้ง

      **[ผิดพลาด — ไฟล์ progress หาย 1 ต.ค. 2026]** agent ที่ทำรอบ TC-041 + service account (P3l ด้านล่าง) รัน `rm -rf
      temp_scripts/` ตอนทำความสะอาดท้ายงานของตัวเอง โดยไม่ได้เช็คก่อนว่าโฟลเดอร์มีไฟล์ของงานอื่นค้างอยู่ด้วย — ลบ
      `linear-progress.txt` (mapping Scenario ID → Linear issue ID ครบ 16 ตัว + รายการไฟล์ที่ขาดของทุก TC แบบละเอียด) ทิ้งไปด้วย
      โดยไม่ตั้งใจ ตรวจสอบแล้ว: ไม่มีใน git (ไฟล์นี้ไม่เคยถูก commit), ไม่มีใน `~/.Trash`, ไม่มี Time Machine backup บนเครื่องนี้
      → **กู้คืนไม่ได้จริง** ผลกระทบ: ไม่ใช่ข้อมูลที่หายถาวร (ตัวจริงคือการ์ด Linear ที่มีอยู่แล้ว) แค่เป็น cache ที่ต้อง
      **re-derive ใหม่** ตอนเริ่ม P3g จริง — วิธี rebuild: (1) mapping Scenario→CTXN: `list_issues parentId=<CTXN-9687>`
      ได้ 16 Scenario card แล้วไล่ `list_issues parentId=<scenario>` ทีละใบเพื่อได้ TC card ของแต่ละ Scenario (บางส่วนมีบันทึกไว้
      แล้วใน TODO.md นี้เอง ที่ P3d/P3f: SC-06=CTXN-9716 … SC-16=CTXN-9726) (2) รายการไฟล์ที่ขาด: เทียบ evidence
      ที่อ้างถึงในไฟล์ `test-cases/COR-1724-admin-user-role.md` (ช่อง "หมายเหตุ" ของแต่ละ TC) กับไฟล์จริงใน
      `.playwright-mcp/COR-1724/{images,videos}/` กับ attachment ที่มีอยู่แล้วจริงในแต่ละการ์ด (`get_issue`) — ใช้เวลามากกว่า
      เดิมที่มีไฟล์ cache ให้ แต่ไม่ใช่ข้อมูลที่สูญหายถาวร

- [x] **P3h — QA วิเคราะห์ก่อนเทสต่อ (SA/BA-level) ตามที่ user ขอ หลังเคยพลาดเรื่อง expectation มาแล้ว** (1 ต.ค. 2026)
      user: "อยากให้วิเคราะห์เทสเคสนิดหนึ่งก่อน runtest...เทียบ AC/ของจริง/ความคาดหวังระดับ QA" — ไล่ทุกหมวดทบทวน
      Expected Result เทียบ AC + เหตุผล SA/BA + สิ่งที่สำรวจเจอจริง พบ 2 จุดสำคัญ:
      (1) TC-067–069 (service account, UI-level) มีจุดบอดเดียวกับที่เพิ่งพลาดกับ TC-063–065 (Pass เพราะ UI ซ่อนปุ่ม แต่ backend
      อาจไม่เช็คจริงแบบ TC-066) — TC-070 เดิมรวม 4 operation ไว้ TC เดียว ถ้า fail จะไม่รู้ว่าช่องไหนมีปัญหา
      (2) TC-072–083 (migration) เขียนสมมติว่ามี UI ให้ "รัน" ทั้งที่สำรวจมาทั้งหมดไม่เคยเจอ UI migration เลย
      แก้ไฟล์ตามที่วิเคราะห์: เพิ่มคำเตือน "ยังไม่ยืนยัน trigger จริง" ใน SC-14/15/16 + มอบทั้งหมวด 6 ให้คนเทสเองผ่าน DB/ops
      ไม่ใช่ agent, เพิ่มเส้นทาง "มอบให้คนเทสเอง" ให้ TC-016/045-048/050-051 (Keycloak console/DB) พร้อมแก้ reasoning ของ
      TC-045-047 ที่เคยเขียนผิดว่า "บล็อกจาก TC-005" (จริงๆ ไม่ใช่ตัวบล็อกแล้วหลังพบว่าสร้าง account ได้จริง)

- [x] **P3i — user ปรับ scope หมวด Migration: ไม่เทส process ตรงๆ แต่ sanity-check user เก่า (user1) แทน** (1 ต.ค. 2026)
      user: "เดาว่า dev ไปทำเอง เราอาจไม่ต้องเทส หรือถ้าเทสแค่ไปเปิดดูว่า user เก่าๆ ใช้งานได้ เช่น user1" — เสนอแผน: เพิ่ม TC ใหม่
      sanity-check user1/Super_User (login+role ปกติไหม) โดยอ้างอิงหลักฐานที่มีอยู่แล้ว (TC-032 เคยเห็น role ของ user1 แล้ว,
      login สำเร็จมาหลายสิบครั้งตลอดการทดสอบ) — **ยังไม่ได้ทำจริง รอ user confirm scope สุดท้ายอีกที** (ถามว่าจะเช็คแค่
      login+role หรือเพิ่ม logout/login ใหม่ด้วย)

- [x] **P3j — แยก TC-070 เป็น 4 TC ตามที่วิเคราะห์ไว้ใน P3h** (1 ต.ค. 2026)
      user ยืนยัน "อยากให้ผมแก้ TC-070 แยกเป็น 4 TC" → แก้ TC-070 เดิมให้เหลือแค่ operation "edit" + เพิ่ม TC-084 (delete),
      TC-085 (assign role), TC-086 (remove role) ต่อท้ายไฟล์ (ไม่ renumber ของเดิมเพราะมีการ์ด Linear จริงผูกกับเลข TC-001–083
      ไปแล้ว — เพิ่มต่อท้ายปลอดภัยกว่า) ไม่รวม "create" เพราะ service account ไม่ได้ถูกสร้างผ่านฟอร์มนี้
      ไฟล์ตอนนี้มี **86 TC** (ไม่ใช่ 83 แล้ว) ยืนยันแล้ว: ไม่มี ID ซ้ำ — **สำคัญ: ถ้าจะ sync การ์ด Linear ต่อ ต้องจำไว้ว่า
      CTXN-9655 ทุกใบที่สร้างไปแล้วอ้างอิง "Total: 83" ต้องอัปเดตใหม่เป็น 86 ด้วยตอนทำรอบถัดไป**

- [x] **P3k — dispatch agent เทส TC-041 + กลุ่ม service account (067-070, 084-086)** (1 ต.ค. 2026)
      user: "พร้อมเริ่ม ได้เลย แล้วอย่าลืมเทสใหม่ข้อที่เคยพลาดไปนะ" → รวม TC-041 (Priority 1, ปลอดภัย) เข้ากับกลุ่ม B
      (service account protection ที่เคยถูกตัดออกทุกรอบก่อนหน้า) เป็นรอบเดียวกัน
      dispatch agent (agentId afb161c393d122825): (1) TC-041 ใช้ test account ที่มีอยู่ (2) กลุ่ม B — ขั้นแรกต้องหาว่ามี
      ช่องทางเจอ service account ID ได้ไหม (UI ไม่โชว์เลย ต้องลองทาง API) ถ้าหาไม่เจอให้บันทึก Not Test ตรง ๆ ห้ามเดา ID
      ถ้าเจอให้ทดสอบทั้ง UI-level (067-069, เหมือน TC-063-065) และ API-level (070+084-086 แยกทีละ operation) ด้วย payload
      ที่ไม่เปลี่ยนค่าจริง (pattern เดียวกับ TC-066) — ถ้าพบว่า request สำเร็จไม่ถูกปฏิเสธ ให้หยุดทันทีรายงานเป็น security bug
      ทุก TC ต้องมีทั้งภาพและวิดีโอ ตามกฎ skill `agent-app-testing` — รอผลสรุป

- [x] **P3l — ผลสรุปจาก P3k: TC-041 Pass, กลุ่ม B (067-070, 084-086) ทั้งหมด Not Test — ไม่พบ service account เลย** (1 ต.ค. 2026)
      **TC-041 (Pass):** login Admin, เปิด `qa-cor1724-main` (ID `6f678ef8-4f0d-44c7-8810-f1667461aa88`, มี role เดิมแค่
      `cashier`) ยิง `POST /cortex-api/users/{id}/roles` ตรงด้วย Bearer token จริง payload
      `{"roleNames":["nurse","role-does-not-exist-cor1724-041"]}` (1 role จริงที่ยังไม่เคยมี + 1 role ปลอม) ได้
      **400 `ErrUserRoleNotFound`** — ทั้ง request fail ทันที ไม่มี role ไหนถูก apply เลย ตรวจซ้ำทั้งผ่าน API (`GET .../roles`)
      และผ่าน UI หลัง reload ยืนยันตรงกันว่า role ยังเหลือแค่ `cashier` ไม่มี partial-apply จริง ไม่ต้อง cleanup เพราะไม่มีอะไร
      เปลี่ยนแปลง

      **กลุ่ม B — หา service account ก่อน (ตามที่สั่ง):** สำรวจ 3 ทาง ด้วย Admin login ทั้งหมด: (1) ค้นหาใน UI
      "ผู้ใช้งานในระบบ" ด้วยคำที่เป็นไปได้ (`service`, `service-account`, `cortex-api`, `cortex-ui`, `client`) → ทุกคำได้
      "ไม่มีข้อมูล" (2) ยิง `GET /cortex-api/users` ตรงด้วย Bearer token จริง paginate ครบทุกหน้า (perPage=100 สูงสุดที่ backend
      ยอม, 3 หน้า, ได้ 225/225 = 100% ของ totalCount จริง) สแกนทุก username หา pattern คล้าย service account — **ไม่พบเลยสักตัว**
      ยืนยันว่า endpoint นี้เองก็ไม่คืนข้อมูล service account ไม่ใช่แค่ UI กรองอย่างเดียวตามที่สงสัยไว้ตอนแรก (3) ลอง
      endpoint/parameter อื่นที่เป็นไปได้: `/cortex-api/service-accounts`, `/cortex-api/clients`, `/cortex-api/roles` (404
      ทั้งหมด), `?includeServiceAccounts=true`, `?type=service`, `?userType=service_account` (ถูกเพิกเฉย คืน list เดิมไม่กรอง
      อะไรเพิ่ม) → **สรุป: ไม่มีช่องทางค้นหา/ระบุ service account ID ได้เลยในขอบเขตที่เข้าถึงได้** ไม่เดา ID ตามกฎความปลอดภัย

      ผลตามนี้: **TC-067, 068, 069, 070, 084, 085, 086 ทั้งหมดบันทึกเป็น Not Test** พร้อมเหตุผลการสำรวจเต็มในไฟล์ TC (หมายเหตุ
      ของ TC-067 มีรายละเอียดการสำรวจเต็ม ที่เหลืออ้างอิงกลับมา) — **ไม่ได้ยิง request edit/delete/assign/remove-role ใด ๆ
      เข้า service account เลย เพราะไม่มี ID เป้าหมายให้ยิง** จึงไม่มีความเสี่ยงต่อ Keycloak/Cortex service account เกิดขึ้นจริง
      ในรอบนี้ — **ไม่เจอ security bug แบบเดียวกับ TC-066 ในรอบนี้** (เพราะไม่สามารถทดสอบได้เลย ไม่ใช่เพราะพิสูจน์ว่าไม่มีช่องโหว่
      — ยังเป็น gap ที่ไม่รู้คำตอบ ถ้าในอนาคตมีช่องทางถูกต้องเจอ service account ID ควรกลับมาทดสอบ TC เหล่านี้ใหม่)

      Evidence TC-041: `images/tc041-01-before-state.png` (กรอบแดง), `images/tc041-02-api-result-evidence.png` (กรอบเขียว),
      `images/tc041-03-ui-confirmed-after-reload.png` (กรอบเขียว), วิดีโอเต็ม `videos/tc041-video.webm` — กลุ่ม B ไม่มี
      evidence แนบ (ตาม convention เดิมของไฟล์นี้ที่ TC สถานะ Not Test ไม่ต้องมีภาพ/วิดีโอ เพราะไม่มีอะไรให้ถ่าย)

      ยืนยันไฟล์ TC: ยังมี 86 TC ครบ ไม่มี ID ซ้ำ ไม่มี section หาย (`grep -c "^#### TC-COR-1724-"` = 86)

      **[ผิดพลาดระหว่างทำ — ดูรายละเอียดเต็มที่ P3g ด้านบน]** ตอนลบ `temp_scripts/` ท้ายงาน ลบไฟล์ `linear-progress.txt`
      ของงาน P3g (ยังไม่เสร็จ) ทิ้งไปด้วยโดยไม่ตั้งใจ (ไม่เช็คก่อนว่ามีไฟล์ของงานอื่นปนอยู่) — กู้คืนไม่ได้ (ไม่มีใน git/Trash/
      Time Machine) แต่ไม่ใช่ข้อมูลสูญหายถาวรเพราะตัวจริงคือการ์ด Linear ที่ยังอยู่ครบ แค่ต้อง re-derive mapping/รายการไฟล์
      ที่ขาดใหม่ตอนเริ่ม P3g จริง (วิธี rebuild บันทึกไว้ที่ P3g แล้ว)

- [x] **P3m — sanity-check user1/Super_User ตาม scope ที่ตกลงไว้ใน P3i (1 ต.ค. 2026)**
      user: "ไปต่อเลย" (หลังรายงานผล P3l) → เลือกทำ P3i ต่อก่อนเพราะเล็ก/เสี่ยงต่ำ/เกือบคอนเฟิร์มแล้ว ใช้ scope ขั้นต่ำตามคำพูดเดิมของ
      user ("ไปเปิดดูว่า user เก่าๆ ใช้งานได้") = login จริง (ไม่ reuse session เดิม) + เช็ค role ตรงกับ TC-032
      เขียนสคริปต์ `temp_scripts/tc087-sanity-check.js` (ลบทิ้งแล้วหลังจบงาน เช็คเนื้อโฟลเดอร์ก่อนลบว่ามีแค่ไฟล์ตัวเองจริง — บทเรียน
      จาก P3l) เจอปัญหาระหว่างทำ 3 จุดที่ dev-x/สคริปต์ไม่ตรงกับที่คาด: (1) `evaluate()` set `.value` ตรง ๆ ของ password field
      ทำให้ Keycloak มองว่า field ว่าง ("Invalid username or password") ต้องใช้ `.fill()` จริงแทน (2) `getByPlaceholder(/ค้นหา/)`
      ไป match กล่องค้นหาผู้ป่วย global มุมขวาบนแทนกล่องค้นหาของหน้า user-management ต้องระบุ placeholder เป๊ะ ๆ ว่า "ค้นหาผู้ใช้งาน"
      (3) คลิกที่ `<td>` ของแถวไม่เปิดอะไร ต้องคลิกปุ่มแก้ไข (ดินสอ) ถึงเห็นแท็บ 3 อัน (ข้อมูลทั่วไป/การเข้าสู่ระบบ/บทบาทการใช้งาน) —
      เป็นแค่ edit panel ไม่ใช่หน้า detail แยก แต่ "ดูอย่างเดียว ไม่กด บันทึก" ก็ปลอดภัยเหมือนที่ TC-032 เคยทำ · dev-x เองก็แฮงค์/ช้า
      เป็นพัก ๆ ระหว่างดีบัก (page.goto timeout หลายรอบ ทั้งที่ curl ตรงเร็วปกติ) แก้ด้วย `waitUntil:'domcontentloaded'` แทน default
      `'load'`
      **ผลเทส (Pass):** login ด้วย user1/Super_User สำเร็จปกติ, แท็บ "ข้อมูลทั่วไป" toggle การใช้งาน = enabled, แท็บ
      "บทบาทการใช้งาน" มี role ครบ 2 ตัวตรงกับ TC-032 เป๊ะ (`cashier-head`, `admin`) ไม่มีอะไรหาย/เพิ่มแปลกปลอม — เพิ่มเป็น
      **TC-COR-1724-087** ต่อท้ายไฟล์ (Scenario SC-14) พร้อม evidence ภาพ 4 ใบ + วิดีโอเต็ม
      ไฟล์ตอนนี้มี **87 TC** (อัปเดตตัวเลขที่หัวไฟล์จาก 83 → 87 ด้วย เพราะไม่เคยอัปเดตตอน P3j split TC-070 มาก่อน)
      **สำคัญ: ถ้าจะ sync Linear ต่อ ต้องจำว่า CTXN-9655 อ้าง "Total: 83" ต้องอัปเดตเป็น 87**

- [x] **P3n — ทำ P3g ต่อ (แนบไฟล์ภาพ+วิดีโอที่เหลือเข้า Linear) — เสร็จครบ 50/50 TC ที่มี evidence** (1 ต.ค. 2026)
      user: "ทำต่อ" → dispatch agent รอบแรก (agentId a179749b71c6348f6) ให้ไปรื้อ mapping ใหม่ด้วย — **ค้าง 2 รอบติด (timeout 600
      วิ ไม่มีความคืบหน้า)** ตรวจสอบพบว่า Linear API เองทำงานปกติ (เรียกตรงจากฝั่งเราเองสำเร็จทันที) ปัญหาอยู่ที่ตัว agent/session
      เอง ไม่ใช่ Linear → แก้โดยดึง mapping TC-001..083 → CTXN ID เองโดยตรง (list_issues แบบ parallel ทีละ scenario, สำเร็จ
      เกือบหมดรอบเดียว เจอ timeout แค่ 2 scenario (SC-10, SC-11) retry แล้วผ่าน) บันทึกเป็น `temp_scripts/linear-progress.txt`
      ใหม่ (ไฟล์เดิมหายไปจากอุบัติเหตุ P3l) ยืนยันครบ 83/83 ไม่มีช่องว่าง
      dispatch agent รอบสอง (agentId a055de557c6545954) ให้ข้ามขั้นตอน rebuild mapping ไปเลย (มี mapping ให้พร้อมแล้ว) ทำแค่
      (1) เทียบ Evidence: บรรทัดในไฟล์ TC กับไฟล์จริงบน disk กับ attachment ที่มีอยู่แล้วใน Linear (2) อัปโหลดตัวที่ขาด —
      **เจอ session limit กลางทาง** (หลัง batch แรกเสร็จ 16 ไฟล์) resume ผ่าน SendMessage หลัง limit reset (1:50pm ผ่านไปแล้ว
      ตอนเช็ค) ทำต่อจนจบ
      **ผลสรุป:** 50/50 TC ที่มี Evidence บันทึกไว้ (จาก 83 ใบ, อีก 33 ใบไม่มี evidence เพราะเป็น Not Test/Not Run ปกติ) sync
      ครบหมดแล้ว รวม **124 ไฟล์ อัป 39 การ์ด** (อีก 11 การ์ดมีครบอยู่แล้วจากรอบก่อน) ไม่มี error เลยทั้งรอบ ไม่มี broken reference
      (ทุกไฟล์ที่ markdown อ้างถึงมีอยู่จริงบน disk) — ระหว่างทางเจอจุดที่ parse พลาดแล้วแก้เอง: TC-027/028 ใช้บรรทัด
      `- วิดีโอ:` แยกต่างหากจาก `Evidence:` หลัก agent ตรวจพบเอง แก้ script parsing แล้วอัปวิดีโอที่ขาดให้ครบ
      **เจอ + แก้เพิ่มเอง (นอก scope ของ agent เพราะสั่งห้ามแก้ status):** CTXN-9736 (TC-041) ยัง set เป็น "Not Test"/canceled
      พร้อม description รอบแรกที่บอกว่า "บล็อกจาก TC-005 ไม่มี test account ปลอดภัย" ทั้งที่ไฟล์ markdown ปัจจุบัน (อัปเดตแล้วตอน
      P3k/P3l) บอกว่า Pass จริงแล้ว agent แนบไฟล์ evidence ให้ตาม markdown ถูกต้อง แต่ทิ้ง status/description เดิมไว้ตาม scope
      ที่สั่ง (attachment-only) → เราแก้เองต่อ: `save_issue` อัปเดต state เป็น "Passed" + description เต็มให้ตรงกับ markdown
      ปัจจุบัน ยืนยันแล้วว่า CTXN-9736 ตอนนี้ status="Passed", statusType="completed", description ตรงกับไฟล์ 100%
      **ยังไม่ได้ทำ (รอบถัดไป):** อัปเดต CTXN-9655 tally จาก "Total: 83" เป็น "Total: 87" (ตาม P3m) — ยังไม่ขออนุญาตสร้างการ์ด
      TC-084–087 ใน Linear (ยังรอ P3 เดิม)

- [x] **P3o — อัปเดต tally CTXN-9655 (83→87) + สร้างการ์ด TC-084–087 (user อนุญาตแล้วรอบนี้)** (1 ต.ค. 2026)
      user สั่งตรง 2 อย่างพร้อมกัน: "อัปเดต CTXN-9655 tally จาก Total: 83 → Total: 87" + "สร้างการ์ด Linear สำหรับ TC-084 ถึง
      TC-087" — การอนุญาตนี้ใช้เฉพาะ 4 ใบนี้ใต้ CTXN-9687 (โปรเจกต์ [QA] Test Run Results) ไม่เกี่ยวกับ P3 เดิมด้านล่าง (full
      EXE/Scenario/TC ใต้การ์ด COR-1724 จริงใน Squad Cop — ยังไม่ได้ขอ ยังค้างต่อไป)
      **ก่อนอัปเดต tally ต้องเช็ค status จริงในทุกการ์ดก่อน ไม่ใช่เดาจากไฟล์อย่างเดียว** — ดึง status ของทุก 83 การ์ดจาก Linear
      จริง (list_issues แบบ parallel ทีละ scenario) + parse Actual Result ของทุก TC จากไฟล์ markdown ด้วย python เทียบกัน
      เจอ **5 การ์ด stale** (Linear ไม่ตรงกับผลเทสจริงล่าสุดในไฟล์): TC-041 (Linear="Not Test/canceled" แต่ไฟล์="Pass" จากผล
      P3k/P3l), TC-067/068/069/070 (Linear="Not Run" แต่ไฟล์="Not Test" จากผลสำรวจ P3l — เทสไม่ได้เพราะหา service account
      ไม่เจอ ไม่ใช่ยังไม่เทส) → แก้ทั้ง 5 ใบ (`save_issue` เปลี่ยน state + description ให้ตรงไฟล์) ก่อนคำนวณ tally
      **tally สุดท้าย (ตรวจนับจริงจากไฟล์ 87 TC ด้วย script, cross-check กับ Linear ที่แก้แล้ว):** Total 87 | Passed 55 |
      Failed 3 | Not Test 17 | Not Run 12 | Pass Rate 63% — อัปเดต CTXN-9655 description ใหม่ทั้งหมด (breakdown เหตุผลของ
      แต่ละกลุ่ม Not Test/Not Run ละเอียดกว่าเดิม)
      **สร้างการ์ดใหม่ 4 ใบ:** TC-084=CTXN-9789 (Not Test, parent SC-13/CTXN-9723), TC-085=CTXN-9790 (Not Test, เหมือนกัน),
      TC-086=CTXN-9791 (Not Test, เหมือนกัน), TC-087=CTXN-9792 (**Passed**, parent SC-14/CTXN-9724) — เนื้อหาคัดลอกตรงจากไฟล์
      markdown ทุกตัวอักษร (TC-084–086 ใช้ template เดียวกับ TC-067 ที่เพิ่งแก้, TC-087 ใช้เนื้อหาที่เขียนไว้ตอน P3m) แนบ
      evidence ให้ TC-087 ครบ 5 ไฟล์ (4 ภาพ + 1 วิดีโอ, prepare→curl PUT→finalize ทีละไฟล์ ยืนยัน 200 ทุกครั้ง) — TC-084–086
      ไม่มี evidence ให้แนบ (Not Test เหมือนกลุ่ม TC-067–070 เดิมที่ไม่มี evidence เช่นกัน)
      ยืนยันผลสุดท้าย: 87 การ์ด TC ครบใน Linear (83 เดิม + 4 ใหม่) ทุกใบ status ตรงกับไฟล์ markdown 100%

- [x] **P3p — เพิ่ม traceability ระดับ TC: map ทุก TC เข้ากับ AC bullet จริงของ COR-1724 (Phase 1: แก้ไฟล์ markdown)** (1 ต.ค. 2026)
      user ถาม: "ในการ์ดได้บอกว่าการ์ดไหน match กับ requirement ข้อไหน" → พบว่าตอนนั้นมีแค่ระดับ Scenario (ช่อง "ขอบเขต
      Requirement" เป็น paraphrase ภาษาไทย) ไม่มีระดับ TC เลย → ถามกลับด้วย AskUserQuestion ว่าต้องการระดับไหน user เลือก
      "เพิ่ม AC bullet ที่ตรงเข้าไปในทุก TC การ์ด" (ทั้ง 87 ใบ) — สั่งเพิ่ม: "ตรวจให้เสร็จ ค่อยแบ่ง phase ในการ sync เข้า linear"
      ดึง AC เต็มจาก COR-1724 จริง (6 หมวด รวม 32 bullet) แยกเป็น bullet-level ตาม section แล้วไล่ map ทีละ TC (001-087)
      เทียบชื่อ/เนื้อหา TC กับ bullet ที่ตรงที่สุด — ส่วนใหญ่ 1 TC : 1 bullet บาง bullet มีหลาย TC คลุม (เช่น service account
      protection 7 TC คลุม bullet เดียว "Service accounts are refused on every write...")
      **ข้อยกเว้น 1 ข้อ:** TC-087 (sanity-check user1) ไม่ map กับ AC bullet ไหนตรงๆ เพราะเป็น TC ที่ QA เพิ่มเองนอกเหนือ AC
      (ทดแทน migration process เต็มรูปแบบตามที่ user ปรับ scope ไว้ P3i) → ใส่หมายเหตุอธิบายแทนการเดา/ยัดเยียด mapping ที่ไม่จริง
      เขียน `temp_scripts/apply_ac_mapping.py` (เก็บ mapping dict ทั้งหมดไว้ใช้ต่อ Phase 2) แทรกบรรทัด
      `- AC ที่ตรง (<หมวด>): "<bullet ภาษาอังกฤษต้นฉบับ>"` ต่อจาก "Requirement ที่อ้างอิง" ของทุก TC
      **ตรวจสอบหลังรัน:** `grep -c` ยืนยัน 87/87 TC มีบรรทัดนี้ครบ (verify ด้วย python parse block-by-block ซ้ำอีกรอบ ไม่ใช้แค่
      grep เฉยๆ) เช็ค TC-087 ขึ้นข้อความ exception ถูกต้อง เช็คการกระจาย bullet (เช่น service account 7 TC ชี้ bullet เดียวกัน
      ตรงตามคาด) — ไฟล์ยังมี 87 TC ไม่มี section หาย/ซ้ำ
      **Phase 2 (sync เข้า Linear 87 การ์ด):** user สั่ง "ตรวจให้เสร็จ ค่อยแบ่ง phase" → เสนอแผนแบ่ง 9 รอบ รอบละ ~10 การ์ด
      ตามลำดับเลข TC ให้ user ดูก่อน ได้รับอนุญาต "เริ่ม Phase 1 ได้เลย" ใช้ `save_issue` + `patch.insert_before` (anchor
      `"\n\nPreconditions"` — เลือก anchor นี้เพราะไม่โดน Linear auto-link "COR-1724"/escape `[Admin]` ที่ฝังอยู่ในบรรทัด
      "Requirement ที่อ้างอิง" งอเข้ามา) เบากว่าการเขียน description ใหม่ทั้งหมดมาก

      **Phase 1 (TC-001–010) เสร็จแล้ว:** ยิง patch 10 การ์ดพร้อมกัน (CTXN-9656–9665) — ตอนแรกอ่านผลลัพธ์ของ CTXN-9661 (TC-006)
      ผิดคิดว่า patch ไม่เข้า (ที่จริงเข้าแล้ว) เลยยิงซ้ำ ทำให้เกิดบรรทัดซ้ำ 2 ครั้ง — ตรวจพบจาก response ที่ยิงซ้ำเอง (เห็น
      "AC ที่ตรง" 2 บรรทัดติดกัน) แก้ด้วย `patch.replace` ยุบเหลือบรรทัดเดียวทันที ยืนยันผลสุดท้าย: 10/10 การ์ด (TC-001–010)
      มี "AC ที่ตรง" ตรงกับไฟล์ markdown ครบ ไม่มีซ้ำ — **บทเรียน: ต้องอ่าน response ของแต่ละการ์ดละเอียดก่อนตัดสินใจ retry**
      **Phase 2 (TC-011–020) เสร็จแล้ว:** ยิง patch 10 การ์ด (CTXN-9666–9675) พร้อมกัน รอบนี้อ่าน response ละเอียดทุกใบก่อน
      สรุปผล (บทเรียนจาก Phase 1) — ยืนยัน 10/10 มี "AC ที่ตรง" ถูกต้องตรงกับไฟล์ ไม่มีซ้ำ ไม่ต้อง retry ใบไหนเลย
      **Phase 3 (TC-021–030) เสร็จแล้ว:** ยิง patch 10 การ์ด (CTXN-9676–9685) พร้อมกัน ยืนยัน 10/10 ถูกต้อง ไม่มีซ้ำ
      **Phase 4 (TC-031–040) เสร็จแล้ว:** ยิง patch 10 การ์ด (CTXN-9686, 9727–9735) พร้อมกัน ยืนยัน 10/10 ถูกต้อง ไม่มีซ้ำ
      **Phase 5 (TC-041–050) เสร็จแล้ว:** ยิง patch 10 การ์ด (CTXN-9736–9745) พร้อมกัน ยืนยัน 10/10 ถูกต้อง ไม่มีซ้ำ
      (TC-041/CTXN-9736 ได้ทั้งบรรทัด AC ที่ตรง ใหม่ และยังคง description/status ที่แก้ไปแล้วตอน P3o ครบถ้วน)
      **Phase 6 (TC-051–060) เสร็จแล้ว:** ยิง patch 10 การ์ด (CTXN-9746–9755) พร้อมกัน รอบแรกอ่านผลเร็วเกินไปอีกรอบ พลาด
      2 ใบ (CTXN-9747/TC-052, CTXN-9750/TC-055) คิดว่ายังไม่เข้าทั้งที่จริงเข้าแล้ว ยิงซ้ำเกิดบรรทัดซ้ำ 2 ใบ แก้ด้วย
      `patch.replace` ยุบเหลือบรรทัดเดียวทันทีทั้งคู่ ยืนยันสุดท้าย 10/10 ถูกต้อง ไม่มีซ้ำ (บทเรียนซ้ำจาก Phase 1 — response
      ก้อนใหญ่มาก ต้องอ่านละเอียดจริง ๆ ไม่ใช่กวาดตา)
      **Phase 7 (TC-061–070) เสร็จแล้ว:** ยิง patch 10 การ์ด (CTXN-9756–9765) พร้อมกัน — รอบนี้นับจำนวน "AC ที่ตรง" ต่อใบ
      แบบละเอียดทุกใบจริง ๆ (ไม่กวาดตา) ยืนยัน 10/10 ถูกต้องตั้งแต่รอบแรก ไม่ต้อง retry เลย (รวม TC-066 การ์ด security bug —
      description เต็มเดิมยังอยู่ครบ ไม่โดนกระทบ)
      **Phase 8 (TC-071–080) เสร็จแล้ว:** ยิง patch 10 การ์ด (CTXN-9766–9775) พร้อมกัน นับจำนวนบรรทัดต่อใบละเอียด ยืนยัน
      10/10 ถูกต้องตั้งแต่รอบแรก ไม่ต้อง retry (รวม TC-071 การ์ด "Gap (ครึ่งหนึ่ง)" — description เดิมยังอยู่ครบ)
      **Phase 9 (TC-081–087) เสร็จแล้ว — PHASE สุดท้าย:** ยิง patch 7 การ์ด (CTXN-9776-9778, 9789-9792) พร้อมกัน ยืนยัน
      7/7 ถูกต้องตั้งแต่รอบแรก รวม TC-087 ที่ใช้ anchor "Test Data" แทน "Preconditions" (เพราะมี 2 bullet อยู่ก่อนแล้วใน
      Preconditions ของการ์ดนี้) ใส่บรรทัด "AC ที่ตรง: ไม่ได้ derive จาก AC bullet ใดโดยตรง..." ตรงกับไฟล์ markdown
      **สรุปงาน P3p ทั้งหมด (9 phase): sync traceability "AC ที่ตรง" ครบทั้ง 87 TC การ์ดใน Linear เรียบร้อย** ตรงกับไฟล์
      `test-cases/COR-1724-admin-user-role.md` 100% — ไม่มีการ์ดไหนขาด ไม่มีบรรทัดซ้ำเหลือค้าง (เจอ false-positive misread
      ของตัวเอง 2 รอบระหว่างทาง Phase 1/6 แก้ตกครบแล้วทุกจุด)

- [ ] **P3 — ขออนุญาต user ก่อนสร้างการ์งจริงใน Linear (EXE/Scenario/TC ชุดเต็มใต้การ์ด COR-1724 จริง)**
      (ต้องขอชัดเจนทุกครั้ง ห้ามข้ามขั้นตอนนี้ — รอเทสให้ครบ 87 TC ก่อน)

- [ ] **P4 — สร้าง EXE จริงใน Linear** (หลังได้รับอนุญาตจาก P3 เท่านั้น)

- [ ] **P5 — สร้าง Scenario ทั้งหมดจริงใน Linear** (หลังได้รับอนุญาตจาก P3 เท่านั้น)

- [ ] **P6 — สร้าง Test Case ทั้งหมดจริงใน Linear** (หลังได้รับอนุญาตจาก P3 เท่านั้น)

---

## แยก script รัน test ต่อ module และต่อ flow e2e

บริบท: `tests/modules/<module>/` = เทสรายการ์ดต่อ module (ตอนนี้มีแค่ `er`) ·
`tests/E2E/` (มีโฟลเดอร์ว่างอยู่แล้ว) = เทส flow เต็มที่ข้ามหลาย module (เช่น ลงทะเบียน ER → ส่งต่อ OPD → Discharge)
ผู้ใช้ยืนยัน (30 ก.ย. 2026): E2E = สายงานข้ามหลาย module · รูปแบบคำสั่งที่ต้องการ = npm script คงที่ต่อรายชื่อ (ไม่ใช่ script รับ parameter)
→ ทุกครั้งที่มี module ใหม่ หรือเขียน flow e2e ไฟล์แรก ต้องกลับมาเพิ่ม script ใหม่ใน package.json ตาม convention นี้

- [x] **P0 — เพิ่ม npm script ใน `package.json`**: `test:module:er` (`playwright test tests/modules/er`) ·
      `test:e2e` (`playwright test tests/E2E` — ตอนนี้ยังไม่มีไฟล์ flow จะรันแล้วเจอ "no tests found" จนกว่าจะมี flow แรก)
      ทำแล้ว: เพิ่ม 2 บรรทัดใน `scripts` ของ `package.json` ต่อจาก `test:debug`
- [x] **P1 — อัปเดตตารางคำสั่งใน `README.md`** ให้มี script ใหม่ 2 ตัว
      ทำแล้ว: เพิ่มแถว `test:module:er` และ `test:e2e` ในตารางคำสั่ง
- [x] **P2 — อัปเดต `.claude/skills/cortex-automate/SKILL.md`**: เพิ่มแถวกฎใหม่ใน §7 (30 ก.ย. 2026, บันทึกการตัดสินใจนี้) ·
      อัปเดตตารางคำสั่ง §3 · เพิ่ม note โครงสร้าง `tests/E2E/` ใน §2 (แก้ path `tests/er/` ที่ล้าสมัยด้วยถ้าทำอยู่แล้ว)
      ทำแล้ว: เพิ่ม R28 ในตาราง §7 · เพิ่ม 2 แถวในตารางคำสั่ง §3 · แก้ผังโครงสร้าง §2 (`tests/er/`+`tests/smoke/` ที่ไม่มีจริงแล้ว → `tests/modules/er/`+`tests/E2E/`) · เพิ่ม log ใน §10
- [x] **P3 — รัน `npm run typecheck` + ลองรัน `npm run test:module:er` จริงหนึ่งรอบ** ยืนยันว่า script ทำงานถูกต้อง (filter path + ยัง login ผ่าน setup dependency ตามปกติ)
      ทำแล้ว: typecheck ผ่าน · รัน `npm run test:module:er` จริง — script filter ไป `tests/modules/er` ถูกต้อง, setup dependency login ก่อนแล้วค่อยรัน chrome project ตามปกติ (เหมือน `npm test` เดิม) → **script ทำงานถูกต้องตามที่ออกแบบ**
      พบระหว่างรัน (ไม่เกี่ยวกับ script นี้ เป็นปัญหาที่มีอยู่ก่อนแล้วใน spec/dev-x เอง): 2/4 เทสพัง — (1) `SBH-1013` เคสผู้ป่วยมี HN ล้มตอนยกเลิก Encounter ท้ายเทส เจอ `POST .../cancel → 500 InternalServerError "Failed to cancel ER encounter"` (2) `SBH-1021` ล้มด้วย timeout 20s รอ response ตอนกดบันทึก Triage — ยังไม่ได้แก้ ต้องถามผู้ใช้ก่อนว่าจะให้ไล่ดูสองเคสนี้ต่อไหม

(เก็บ log ต่อท้ายทุกครั้งที่ทำ task เสร็จ ห้ามลบของเก่า)

---

## Refactor — แยก helpers เป็น functions / flows / steps

วัตถุประสงค์: แยกโครงสร้าง 3 layer ให้ชัดขึ้น เพื่อให้ flow ที่ใช้ซ้ำเรียกจาก spec อื่นได้โดยไม่ต้อง copy logic
Scope: ปรับโครงสร้างโฟลเดอร์ + ย้ายไฟล์ + สกัด inline flow — ยังไม่แก้ logic ใน spec
Sign-off: ผู้ใช้อนุมัติแล้ว 30 ก.ย. 2026

- [x] **P0 — สร้างโฟลเดอร์ใหม่** `helpers/functions/`, `helpers/flows/`, `helpers/steps/`
- [x] **P1 — ย้าย helpers/*.ts → helpers/functions/** และอัปเดต import ในทุกไฟล์ที่เกี่ยวข้อง
      ทำแล้ว: ย้ายไฟล์ 5 ตัว + แก้ import ใน SBH-1013, SBH-1021 (er-triage.ts ไม่ต้องแก้ เพราะอยู่โฟลเดอร์เดียวกัน)
- [x] **P2 — สกัด inline flow จาก spec → helpers/flows/er.flows.ts**
      ทำแล้ว: สร้าง `prepareNewPatientErVisit(page, label)` — sequence: Dashboard → open Triage page → register AUTO → confirm Visit → expect Triage form → dismiss toast
      **แก้ไข (30 ก.ย. 2026):** รอบแรกสร้างฟังก์ชันไว้แต่ลืมเอากลับไปเรียกใน spec — `SBH-1021-triage-form.spec.ts` ยังมี sequence เดิมเขียน inline ซ้ำอยู่ (ฟังก์ชันใหม่เป็น dead code) ตรวจเจอตอนขอให้ผู้ใช้ช่วยรีวิวโครงสร้าง →
      แก้ `SBH-1021-triage-form.spec.ts` ให้เรียก `prepareNewPatientErVisit(page, 'Triage')` แทน inline block เดิม + ตัด import ฟังก์ชันที่ไม่ได้ใช้แล้วออก (`gotoErDashboard`, `openTriagePage`, `registerNewPatient`, `confirmOpenErVisit`, `expectTriageFormOpen`, `dismissToast`, `newTestPatient`) ตอนนี้ P2 เสร็จจริงตามวัตถุประสงค์ (ไม่มี logic ซ้ำ 2 ที่แล้ว)
- [x] **P3 — อัปเดต SKILL.md** ให้ตรงโครงสร้างใหม่
      ทำแล้ว: อัปเดตผังโครงสร้างไฟล์ใน §2 ให้แสดง 3 layer (functions/flows/steps) พร้อมคำอธิบาย
- [x] **P4 — ยืนยันว่า refactor ไม่ทำอะไรพัง**: `npm run typecheck` + รันเทสจริงอย่างน้อย 1 เคสต่อไฟล์ spec ที่แก้ import
      ทำแล้ว (30 ก.ย. 2026): typecheck ผ่านสะอาดหลัง P1 และหลังแก้ P2 ซ้ำ · รัน `--grep @SBH-1709` (SBH-1013 เคสผู้ป่วยใหม่) ผ่าน 3/3 (60s) ยืนยัน import จาก `helpers/functions/` ใช้ได้จริงกับ dev-x ·
      รัน `--grep @SBH-1021` หลังแก้ P2 — เทสเดินผ่าน setup flow ที่แก้ (สร้างผู้ป่วย → เปิด Visit → เข้าฟอร์ม Triage) และผ่าน TC-001–006 ปกติ แล้วไปล้มที่ TC-007 ขั้น "กดบันทึก" ด้วย `TimeoutError` รอ response 20s
      **ไม่ใช่บั๊กจาก refactor** — ตรงกับปัญหาเดิมที่เคย log ไว้แล้วในงาน "แยก script รัน test" (P3): "SBH-1021 ล้มด้วย timeout 20s รอ response ตอนกดบันทึก Triage — ยังไม่ได้แก้" → สรุป: refactor ครั้งนี้ไม่ทำอะไรพังเพิ่ม
      **Decision (30 ก.ย. 2026):** ผู้ใช้ตอบ "ปล่อยไปก่อน" — ปัญหา TC-007 (timeout ตอนกดบันทึก Triage) ยังไม่ไล่หาสาเหตุตอนนี้ · โครงสร้าง refactor helpers ปิดงานแล้ว (P0–P4 ครบ)

---

## แยกสกิล QA ทีมออกจาก cortex-automate + รวม ruleset linear-testcase-writer

บริบท: `cortex-automate` ปนรวม "หลักการทำงานที่ QA ทั้งทีมต้องทำเหมือนกัน" (เดิม R16) กับ "รายละเอียดเทคนิคเฉพาะ automate" ไว้ในไฟล์เดียว
ผู้ใช้อยากแยก R16 ออกมาเป็นสกิลอิสระ `qa-automate-readiness` เก็บบน git ระหว่างวางแผนพบว่าสกิล `linear-testcase-writer` (global)
กับ `linear-execution-test` (synced จาก claude.ai, ยังไม่ได้ลงทะเบียนใช้ในเซสชันนี้) มี rule ขัดกันจริง (tag Required/Optional, Test Level,
Priority scale, ชื่อ label) → ผู้ใช้ตัดสินใจรวมเป็น ruleset เดียวก่อน (รายละเอียดเต็มใน plan file `resilient-munching-kazoo.md`)
Sign-off: ผู้ใช้อนุมัติแผนแล้ว 30 ก.ย. 2026

- [x] **P0 — รวม ruleset `linear-testcase-writer`**: สร้างไฟล์โปรเจกต์ (git-tracked) `.claude/skills/linear-testcase-writer/SKILL.md`
      + แก้ global `~/.claude/skills/linear-testcase-writer/SKILL.md` ให้เนื้อหาตรงกันทุกตัวอักษร ตาม override table ที่ตกลงกับผู้ใช้
      (tag Required/Optional บังคับทุก TC, Test Level เลือกตาม TC, Priority 4 ระดับรวม Urgent, label taxonomy ของ linear-execution-test,
      เก็บ field "อนุมัติโดย" ใน EXE, Actual Result แยกเงื่อนไข automate/manual)
      ทำแล้ว (30 ก.ย. 2026): เขียนไฟล์โปรเจกต์เต็ม (Naming/Field/Label/Body/Generation rules รวมแล้ว + เพิ่ม section "Skill update log")
      แล้ว `cp` ไปทับ global copy + `diff` ยืนยันว่าเหมือนกันทุกตัวอักษร (IDENTICAL) · Skill tool โหลดสกิลนี้ได้ปกติหลังแก้
- [x] **P1 — สร้างสกิลใหม่ `qa-automate-readiness`**: `.claude/skills/qa-automate-readiness/SKILL.md` — workflow 2 gate
      (รับ requirement → ร่าง TC ผ่าน linear-testcase-writer → เก็บ .md ให้ QA review [GATE 1] → สำรวจแอปจริง+วิดีโอ → ยืนยันผล [GATE 2] → ส่งต่อ automate)
      ทำแล้ว (30 ก.ย. 2026): เขียนไฟล์เต็ม (หลักการ, 7 ขั้นตอน, ตารางความสัมพันธ์กับ linear-testcase-writer/cortex-automate/linear-execution-test, อ้างอิงตัวอย่างจริง COR-1724, Skill update log)
- [x] **P2 — แก้ `cortex-automate/SKILL.md`**: ตัด R16 + หัวข้อ "ขั้นตอนเมื่อได้การ์ดใหม่" ออก เหลือ pointer ไปสกิลใหม่ + เพิ่ม log ใน §10
      ทำแล้ว (30 ก.ย. 2026): แก้ §1 ข้อ 6, แถว R16 ใน §7, หัวข้อย่อย "ขั้นตอนเมื่อได้การ์ดใหม่" (เหลือ pointer บรรทัดเดียว), เพิ่ม entry ใน §10
- [x] **P3 — README.md**: เพิ่มบรรทัดชี้ไปสกิล `qa-automate-readiness`
      ทำแล้ว (30 ก.ย. 2026): เพิ่ม 1 บรรทัดต่อจากบรรทัดที่ชี้ไป cortex-automate เดิม
- [x] **P4 — Verify**: grep `R16` ทั้ง repo ไม่มีจุดอ้างอิงค้าง, diff ไฟล์โปรเจกต์กับ global ของ `linear-testcase-writer` ต้องเหมือนกัน,
      เรียก Skill tool ทดสอบ invoke สกิลใหม่ทั้งสองตัว
      ทำแล้ว (30 ก.ย. 2026): grep เจอแค่ entry ประวัติ (§10 changelog เดิม, ห้ามลบ) + จุดที่ตั้งใจอ้างอิงว่า "ย้ายไปแล้ว" —
      ไม่มีจุดไหนยังชี้ผู้ใช้ไปทำตาม R16 แบบเดิม · เจอ 1 จุดตกหล่นเพิ่มที่ §5 (บรรทัด "ช่วงต้นผู้ใช้กำหนดแล้วใน R16") แก้ให้ชี้ไปสกิลใหม่ด้วย ·
      `diff` ไฟล์โปรเจกต์กับ global ของ linear-testcase-writer = IDENTICAL · เรียก Skill tool ทดสอบทั้ง `qa-automate-readiness` และ
      `linear-testcase-writer` โหลดได้ปกติทั้งคู่ ไม่มี syntax พัง
- [x] **P5 — แก้ gap: input ที่ไม่มีการ์ด Linear รองรับ (เช่นทีม Support ส่งมาเป็นไฟล์ Excel)**
      ผู้ใช้ถามว่า structure รองรับเคสที่ Support ส่ง usecase/step/flow มาให้ QA โดยตรงไหม (ไม่ใช่แค่การ์ด Linear) —
      ตรวจพบว่า step 1 ของ `qa-automate-readiness` เขียนรับ input กว้างไว้ แต่ step 2 (เรียก `linear-testcase-writer`)
      สกิลนั้นบังคับต้องมี Linear issue ให้อ่านเสมอ ("อ่าน requirement issue ก่อนเสมอ") — ถ้าไม่มีการ์ด Linear จะสะดุด
      ผู้ใช้ยืนยัน: input จริงมาจาก **Linear หรือ Excel** เป็นหลัก และถ้ายังไม่มีการ์ด Linear รองรับ ให้ **QA/Claude สร้างการ์ด
      Linear ก่อนเสมอ** ก่อนร่าง TC
      ทำแล้ว (30 ก.ย. 2026): แก้ `.claude/skills/qa-automate-readiness/SKILL.md` — frontmatter description เพิ่ม "ไฟล์ Excel"
      เป็น input ที่รองรับ, step 1 ระบุ 2 รูปแบบ input หลัก (การ์ด Linear / ไฟล์ Excel), เพิ่ม step ใหม่ "เช็คว่ามีการ์ด Linear
      รองรับหรือยัง — ถ้ายังไม่มีต้องสร้างก่อนเสมอ" เลื่อนหมายเลข step เดิมลง 1 (รวมเป็น 8 step, GATE 1 = step 5, GATE 2 = step 8)
      แก้ตารางความสัมพันธ์กับสกิลอื่นให้เลขตรงกับของใหม่ + เพิ่ม Skill update log entry · เรียก Skill tool ทดสอบโหลดผ่านปกติ

---

## ย้ายและติดตั้ง Skills ของ QA hlab ไปยัง Global (~/.gemini/config/skills/)

วัตถุประสงค์: นำ skills ของ QA hlab ไปเก็บไว้ที่ Global Customization Root เพื่อให้ Agent ทุกตัวในทุกโปรเจกต์สามารถอ่านและปฏิบัติตามมาตรฐานเดียวกันได้ พร้อมระบุความแตกต่างระหว่าง Manual test และ Automate test อย่างชัดเจน
Sign-off: ผู้ใช้อนุมัติแล้ว 1 ต.ค. 2026

- [x] **P0 — อัปเดตและสร้าง `linear-testcase-writer` และ `asklinear-ai-genarate-executiontest` ใน Global**
      ทำแล้ว: สร้าง `linear-testcase-writer/SKILL.md` และอัปเดต `asklinear-ai-genarate-executiontest/SKILL.md` ใน `~/.gemini/config/skills/` โดยระบุความต่าง Manual (`* `, Actual Result เปล่า) vs Automate (`- `, Actual Result ผูก Node 6 Result Reporter) พร้อมโครงสร้างครบถ้วน
- [x] **P1 — ติดตั้ง `qa-automate-readiness` ไปยัง Global (`~/.gemini/config/skills/qa-automate-readiness/`)**
      ทำแล้ว: คัดลอก `SKILL.md` ไปยัง `~/.gemini/config/skills/qa-automate-readiness/` เรียบร้อย ตรวจสอบ YAML frontmatter ถูกต้อง
- [x] **P2 — ติดตั้ง `agent-app-testing` ไปยัง Global (`~/.gemini/config/skills/agent-app-testing/`)**
      ทำแล้ว: คัดลอก `SKILL.md` ไปยัง `~/.gemini/config/skills/agent-app-testing/` เรียบร้อย ตรวจสอบ YAML frontmatter ถูกต้อง
- [x] **P3 — ติดตั้ง `cortex-automate` และ `references/` ไปยัง Global (`~/.gemini/config/skills/cortex-automate/`)**
      ทำแล้ว: คัดลอก `SKILL.md` และโฟลเดอร์ `references/er-flow.md` ไปยัง `~/.gemini/config/skills/cortex-automate/` ครบถ้วน
- [x] **P4 — ตรวจสอบ (Verify) Global Skills ทั้งหมด**
      ทำแล้ว: ตรวจสอบทั้ง 4 skills ใน `~/.gemini/config/skills/` (`linear-testcase-writer`, `asklinear-ai-genarate-executiontest`, `qa-automate-readiness`, `agent-app-testing`, `cortex-automate` พร้อม references) มี YAML frontmatter (`name`, `description`) ถูกต้อง ครบถ้วน และพร้อมใช้งานสำหรับ Agent ทุกตัว

---

## สำรวจ/เล่น flow e2e ใหม่: สร้าง user → login → assign role nurse → เทียบสิทธิ์ app + อุดช่องว่างที่เจอใหม่จาก AC (COR-1724)

วัตถุประสงค์: exploratory flow ใหม่แยกจาก 87 TC ของ COR-1724 — เล่นต่อเนื่องยาว ๆ ในหน้า `/cortex/setting/admin/user-management`
เพื่อดูว่า role "nurse" ส่งผลต่อ app/menu ที่ user เห็นจริงยังไง (ไม่ได้ derive จาก AC ข้อไหนโดยตรง เป็นงาน exploratory)
Sign-off scope รอบแรก (7 ต.ค. 2026 ผ่าน AskUserQuestion): ไม่ผูกกับ TC เดิม, dispatch background agent, เก็บหลักฐานเต็ม (ภาพ+วิดีโอ
กรอบแดง/เขียว) ตามมาตรฐาน `agent-app-testing`

**เพิ่มเติม (7 ต.ค. 2026):** user ขอให้เช็ค requirement จริงจาก Linear ว่าแต่ละ flow คลุม AC ข้อไหน + หา gap เพิ่ม — fetch COR-1724
จาก Linear ตรงแล้ว (AC 32 bullet เหมือนที่เก็บไว้ในไฟล์ TC เดิมทุกตัวอักษร ไม่มี drift) ไล่เทียบ mapping ที่มีอยู่แล้วใน
`temp_scripts/apply_ac_mapping.py` ครบทุก bullet (ยกเว้น 2 bullet ภาพรวมที่ไม่ derive TC เฉพาะ) เจอ 2 จุดที่ตัวบล็อกเดิมไม่จริงแล้ว
ควรเทสเพิ่ม (ดู Flow B/C ด้านล่าง) — ส่วนที่เหลือ (TC-016/048/049-051/072-083) ยังไม่มีช่องทางใหม่ที่ปลอดภัยจริง ไม่สร้าง flow มาเดา

**Flow A — `E2E-NEW-ACCOUNT-ROLE-NURSE`** (ของเดิมที่ confirm ไว้แล้ว): สร้าง user ใหม่ (`qa-e2e-nurse-*`, ไม่มี role) → ยืนยันสร้างจริง
ผ่านค้นหา (ห้ามเชื่อ toast, บั๊ก TC-005: toast error ทั้งที่สร้างสำเร็จจริง) → login ครั้งแรก (Username & Password, ตั้งรหัสผ่านใหม่
ตาม flow เดียวกับ TC-009) ยืนยันสำเร็จ + เก็บภาพ/วิดีโอ app tile ทั้งหมดที่ `/cortex/apps` (baseline ไม่มี role) → admin กำหนด
role "nurse" ให้ user นี้ (แท็บ "บทบาทการใช้งาน" → "กำหนดบทบาท" → ค้นหา nurse → ยืนยัน, reload เช็คจริงไม่เชื่อ toast) → login ใหม่
(fresh context) เก็บภาพ/วิดีโอ app tile หลังมี role → เทียบ before/after สรุปว่า app ไหนเพิ่มมาเพราะ role nurse
AC ที่เกี่ยวข้อง: step assign role ตรง "An admin can see the roles an account holds and assign or remove them from the user detail
screen" (Role assignment) — ส่วนเทียบ app tile ก่อน-หลัง ไม่ derive จาก AC bullet ไหนตรง ๆ (sanity-check เสริมแบบเดียวกับ TC-087)

**Flow B — retest TC-071 (delete permission เฉพาะ super-user/admin)**: เดิมมาร์ค "Gap ครึ่งหนึ่ง" เพราะอ้างว่าบล็อกจาก TC-005
(ไม่มี test account ให้ลบ) ซึ่งไม่จริงแล้ว (รู้มาตั้งแต่ 30 ก.ย. ว่าสร้าง account ได้จริง) → สร้าง account ทดสอบใหม่ (`qa-e2e-del-*`)
ลบด้วย Super_User/Admin ผ่าน confirm dialog เดียว ยืนยันหายจริงหลัง reload → ถ้าผ่าน ให้แก้ Actual Result ของ TC-071 ในไฟล์
`test-cases/COR-1724-admin-user-role.md` จาก "Gap (ครึ่งหนึ่ง)"/Not Test เป็น Pass พร้อม evidence ใหม่

**Flow C — ลอง decode JWT access token เพื่อหา baseline access (FHIR/PostgREST/EHRbase) ของ TC-045/046/047**: เดิมมาร์ค Not Test
เพราะไม่มีสิทธิ์เข้า Keycloak console — ลองช่องทางใหม่ที่ยังไม่เคยลอง: capture Bearer token จาก network request ตอน login ของ user
ที่สร้างใน Flow A (เหมือนที่ทำกับ TC-038/042 ไปแล้ว) decode JWT (base64 payload) ดู claims `resource_access`/`realm_access` ว่ามี
client role ของ FHIR/PostgREST/EHRbase ติดมาอัตโนมัติไหม — **เป็นสมมติฐานที่ยังไม่ยืนยันว่า token จะมีข้อมูลนี้จริง** ถ้าลองแล้วไม่มี
ข้อมูลที่ต้องการในนั้น ให้บันทึกว่า "ลองแล้วไม่พบช่องทางนี้ ยังต้อง Keycloak console เหมือนเดิม" ไม่ใช่เดา/แต่งผลให้ดูเหมือนผ่าน

Safety: สร้าง test account ใหม่ทั้งหมด prefix `qa-e2e-*` (แยกชัดจาก `qa-cor1724-*` เดิม) ไม่แก้ไข/ลบ account จริงอื่นที่มีอยู่แล้ว
ถ้า Flow C เจอว่า request ใด ๆ ที่คาดว่าจะถูกปฏิเสธกลับสำเร็จ หรือเจอช่องโหว่ ให้หยุดทันทีรายงานเป็น security bug ไม่ทดสอบต่อเรื่อย ๆ

- [x] **P0 — เตรียม brief ให้ agent** (ข้อมูลหน้าจอที่สำรวจไว้แล้วจาก COR-1724, known bug TC-005, กฎ safety/ชื่อ test data, มาตรฐานหลักฐาน, Flow A/B/C เต็ม)
      ทำแล้ว: บรีฟเต็มส่งตรงจาก user พร้อมข้อมูลหน้าจอ/selector ที่สำรวจไว้แล้ว — เพิ่มเติม: สำรวจ live ด้วย Playwright MCP (read-only,
      ไม่พิมพ์ credential ใดๆ ผ่าน MCP) ยืนยัน menu path ตรงจริง แล้ว validate selector ที่เหลือ (modal fields, role-assign drawer,
      Keycloak Update-password page, delete dialog) ผ่าน probe script ชั่วคราวที่สร้าง/ลบ test account `qa-e2e-probe-*` เอง
      ก่อนรันจริง (ไม่กระทบ test account ของ Flow A/B)

- [x] **P1 — ทำ Flow A เต็ม** (สคริปต์ `temp_scripts/e2e-flowA-and-C.js` ใช้ playwright-core ตรง ไม่ผ่าน MCP/test runner —
      พิมพ์ username/password/token ผ่านในหน่วยความจำสคริปต์เท่านั้น ไม่ print ค่าจริงที่ไหนเลย)
      ทำแล้ว: สร้าง `qa-e2e-nurse-153529` → กดบันทึก toast ขึ้น **"ระบบไม่ได้รับสิทธิ์ให้จัดการผู้ใช้งานในระบบยืนยันตัวตน
      กรุณาติดต่อผู้ดูแลระบบ"** (บั๊ก TC-005 เดิม ยังอยู่) → ไม่เชื่อ toast ค้นหายืนยันเจอแถวจริง + เปิด detail เช็ค toggle
      "การใช้งาน" aria-checked=true (enabled จริง) → login ครั้งแรกด้วย temp password → redirect ไปหน้า Keycloak Update password
      (`execution=UPDATE_PASSWORD`) จริงตามคาด → ตั้งรหัสผ่านใหม่ (สุ่มในหน่วยความจำ) → เข้า `/cortex/apps` สำเร็จ = **baseline**
      (ยังไม่มี role) → capture Bearer token เก็บเป็น `tokenBeforeRole` (ในหน่วยความจำ) → กลับไป login Super_User → เปิด user detail
      → แท็บ "บทบาทการใช้งาน" → "กำหนดบทบาท" → ค้นหา "nurse" → ติ๊กเลือก → ยืนยัน → reload แล้วเปิดแท็บใหม่ยืนยันเห็น "nurse"
      จริง (ไม่เชื่อ toast) → login ใหม่ (fresh context) ด้วย username/password เดิม → สำเร็จเข้า `/cortex/apps` → capture
      `tokenAfterRole` → **เทียบ app tile/เมนูก่อน-หลัง (heuristic: รายการปุ่ม/ลิงก์ทั้งหมดที่เห็นบนหน้า) = ไม่พบความต่างเลย**
      (ไม่ใช่สัญญาณดีหรือร้าย เป็นข้อสังเกตที่ต้องรายงานตรงๆ ตามที่ brief กำหนด — เป็นไปได้ว่า role "nurse" ควบคุม permission
      ระดับ action/endpoint มากกว่าการแสดง/ซ่อน app tile ที่ระดับ UI นี้ หรือ role นี้ยังไม่ผูกกับ app tile ใดในระบบตอนนี้)
      Evidence: `.playwright-mcp/e2e-user-role-exploration/images/flowA-01..08-*.png` (8 ภาพ) +
      `videos/flowA-01-create-account-qa-e2e-nurse.webm`, `flowA-02-first-login-baseline.webm`,
      `flowA-03-assign-role-nurse.webm`, `flowA-04-login-after-role.webm` (วิดีโอแยกเป็น 4 ช่วงต่อเนื่องตามขอบเขต context/session จริง)
      ตรวจสอบ: เปิดภาพ `flowA-02-verified-created-in-list.png` เห็นกรอบเขียวยืนยันแถว, `flowA-07-role-nurse-verified-after-reload.png`
      เห็นกรอบเขียวยืนยัน role nurse หลัง reload

- [x] **P2 — Flow B: retest TC-071** (สคริปต์ `temp_scripts/e2e-flowB-retest-tc071.js`)
      ทำแล้ว: สร้าง `qa-e2e-del-407246` → toast error เดิม (บั๊ก TC-005) แต่ยืนยันสร้างจริงผ่านค้นหา (กรอบเขียว) → กดไอคอนลบ →
      dialog ข้อความ **"ต้องการลบ qa-e2e-del-407246 หรือไม่ ระบบจะลบบัญชีออกจาก Keycloak และไม่สามารถกู้คืนได้"** ตรงกับที่ระบุไว้
      → กด "ลบ" ยืนยัน (dialog เดียว ไม่มีขั้นตอนแทรก) → toast "ลบผู้ใช้งานแล้ว" (toast ตัวนี้ถูกต้อง ต่างจากตอนสร้าง) → ไม่เชื่อ toast
      reload + ค้นหา username เดิมอีกครั้ง → "ไม่มีข้อมูล" / ทั้งหมด 0 ผู้ใช้งาน = **ลบสำเร็จจริงจาก backend** ต่อเนื่องในคลิปเดียว
      **ผลตรงตามคาด → แก้ TC-COR-1724-071 เป็น Pass แล้ว** ใน `test-cases/COR-1724-admin-user-role.md` (อ้างอิง evidence ใหม่
      + cross-check TC-060/062 สำหรับส่วน role อื่นไม่มีสิทธิ์ ซึ่ง Pass อยู่แล้วเดิม)
      Evidence: `images/flowB-01..05-*.png` (5 ภาพ, ภาพที่ 4 เห็นข้อความ dialog เต็ม, ภาพที่ 5 เห็น "ไม่มีข้อมูล" หลัง reload) +
      `videos/flowB-01-create-and-delete-qa-e2e-del.webm` (คลิปเดียวต่อเนื่องครบ สร้าง→ยืนยัน→ลบ→ยืนยันหาย)
      หมายเหตุคุณภาพ evidence: ภาพที่ 5 กรอบเขียว label ไปวางอ้างอิงตำแหน่ง `body` (เพราะไม่มี element เฉพาะให้ชี้ตอนแถวว่าง)
      ทำให้ป้ายข้อความอาจเลื่อนไปนอกจอ — ตัวข้อความ "ไม่มีข้อมูล"/"ทั้งหมด 0 ผู้ใช้งาน" บนหน้าเว็บเองยังเห็นชัดเจนในภาพอยู่แล้ว
      ไม่กระทบการยืนยันผล แต่เป็นข้อจำกัดของสคริปต์ที่ควรแก้ถ้าเอา pattern นี้ไปใช้ซ้ำ

- [x] **P3 — Flow C: decode JWT หา baseline access** (ใน `temp_scripts/e2e-flowA-and-C.js` ต่อจาก Flow A ในโปรเซสเดียวกัน
      เพื่อให้ `tokenBeforeRole`/`tokenAfterRole` อยู่ในหน่วยความจำเดียวกันตามที่ brief กำหนด + เสริมด้วย
      `temp_scripts/e2e-flowC-deepdive.js` สร้าง account ทิ้งชั่วคราว `qa-e2e-jwtcheck-444117` เพื่อ dump claims เต็ม
      ของ resource_access แล้วลบทิ้งทันที เพราะรอบแรกเก็บแค่ชื่อ key ไม่ได้เก็บเนื้อหา roles ข้างใน)
      ผลที่เจอจริง (decode payload, ไม่ print token เต็ม):
      - **`aud` (audience) มี `"postgrest"` อยู่แล้วตั้งแต่ token แรกสุด ก่อนมี role ใดๆ** (`aud: ["postgrest","account"]`
        ทั้งก่อนและหลังมี role nurse เหมือนกัน) — เป็นหลักฐานที่สนับสนุน TC-046 (baseline access PostgREST) ได้จริง เพราะแสดงว่า
        token ของทุก account ที่สร้างผ่าน Cortex ถูกออกให้ใช้กับ PostgREST ได้ตั้งแต่ต้น ไม่ต้อง admin grant role ก่อน
      - **ไม่พบคำว่า "fhir" หรือ "ehrbase" ที่ไหนเลยใน claims** (`aud`, `scope`, `resource_access`, `realm_access`) ทั้งก่อนและหลัง
        มี role — ไม่สนับสนุน TC-045 (FHIR) หรือ TC-047 (EHRbase) เลย
      - `resource_access` ก่อนมี role = มีแค่ `"account"` (Keycloak self-service client ธรรมดา: manage-account,
        manage-account-links, view-profile) **ไม่มี key "cortex" เลย** → หลังมี role nurse เพิ่ม key `"cortex"` เข้ามา
        (ไม่ได้ dump เนื้อหา roles ข้างในจาก Flow A หลัก แต่โครงสร้างบ่งชี้ว่า resource_access.cortex ผูกกับ role ที่ admin
        assign ให้ ไม่ใช่สิทธิ์ baseline อัตโนมัติ)
      - `scope` คงที่ `"openid email profile"` ทั้งก่อน-หลัง ไม่มีคำว่า fhir/postgrest/ehrbase ปนในนี้
      **สรุปสำหรับ user ตัดสินใจ** (ยังไม่แก้ไฟล์ TC-045/046/047 เอง ตามที่ brief สั่ง — เป็นการตีความ JWT claim ทางอ้อม):
      TC-046 (PostgREST) มีหลักฐานสนับสนุนชัดเจนพอสมควรจาก `aud` claim — เสนอ Actual Result ใหม่: "Pass (ทางอ้อมผ่าน JWT) — decode
      Bearer token ของ account ใหม่ (ก่อนมี role ใดๆ) พบ `aud` claim มี `postgrest` อยู่แล้ว ยืนยันว่าได้ baseline access
      PostgREST โดยไม่ต้อง admin grant role มือ (evidence: `images/flowC-01-decoded-jwt-claims-panel.png`)" — ส่วน TC-045/TC-047
      (FHIR/EHRbase) **ยังคงเป็น Not Test เหมือนเดิม** เพราะลองช่องทางนี้แล้วไม่พบข้อมูลที่เกี่ยวข้องเลย ยังต้องใช้ Keycloak admin
      console หรือ endpoint ตรวจสอบสิทธิ์โดยตรงเหมือนเดิม
      Evidence: `images/flowC-01-decoded-jwt-claims-panel.png` + `videos/flowC-01-decode-jwt-claims.webm`
      (deep-dive เสริม `qa-e2e-jwtcheck-444117` ไม่ใช่ evidence อย่างเป็นทางการ เป็นแค่ข้อมูลประกอบรายงาน — สร้าง-ใช้-ลบทิ้งแล้ว)

- [x] **P4 — เก็บหลักฐานครบ (ภาพ+วิดีโอ กรอบแดง/เขียว)** ที่ `.playwright-mcp/e2e-user-role-exploration/{images,videos}/`
      ตรวจสอบแล้ว: images/ มี 13 ไฟล์ (flowA ×8, flowB ×5), flowC มี 1 ไฟล์ panel เพิ่ม = 14 ไฟล์รวม; videos/ มี 5 ไฟล์
      (flowA ×4 ช่วง, flowB ×1 คลิปต่อเนื่อง, flowC ×1) — ลบไฟล์วิดีโอขยะที่หลุดจากรอบ debug/probe ที่ fail กลางทาง
      (ชื่อ `page@<hash>.webm` ที่ไม่ได้ finalize/rename) ออกจากโฟลเดอร์แล้ว ไม่ปนกับ evidence จริง

- [x] **P5 — บันทึกผลสรุปกลับเข้า TODO.md** (ส่วนนี้โดยตรง) + อัปเดตไฟล์ TC ของ COR-1724 เฉพาะ TC-071 (Pass แล้ว) — TC-045/046/047
      ไม่แก้ไฟล์ ตามที่ brief สั่ง (รอ user ตัดสินใจเรื่อง TC-046 จาก JWT evidence ทางอ้อม)

### สรุปผลรวม 3 flow (7 ต.ค. 2026)

| Flow | ผล | สรุปสั้น |
|---|---|---|
| A (สร้าง+assign role nurse) | สำเร็จครบ | สร้าง `qa-e2e-nurse-153529`, toast error บั๊ก TC-005 ยังอยู่แต่สร้างจริงเสมอ, assign role nurse สำเร็จยืนยันผ่าน reload, app tile ก่อน-หลังไม่ต่างกันเลย (ข้อสังเกต ไม่ใช่ fail) |
| B (retest TC-071) | สำเร็จ ตรงตามคาด | สร้าง-ลบ `qa-e2e-del-407246` ผ่าน dialog เดียวสำเร็จ ยืนยันหายจริงหลัง reload → **แก้ TC-071 เป็น Pass แล้ว** |
| C (decode JWT) | พบบางส่วน | พบ `aud` มี `postgrest` ตั้งแต่ก่อนมี role (สนับสนุน TC-046) แต่ไม่พบ fhir/ehrbase เลย (TC-045/047 ยังต้อง Keycloak console) |

Test accounts ที่สร้างในรอบนี้ (prefix `qa-e2e-*` ทั้งหมด ตามกฎ safety): `qa-e2e-nurse-153529` (เก็บไว้ ยังอยู่ในระบบ มี role
nurse), `qa-e2e-del-407246` (ลบไปแล้วตามที่ตั้งใจ เป็นส่วนหนึ่งของ Flow B), `qa-e2e-probe-*` (680275, 740645, 180587 — probe
account ระหว่างสำรวจ selector ลบทิ้งหมดแล้ว), `qa-e2e-jwtcheck-444117` (deep-dive Flow C ลบทิ้งแล้ว) — ไม่มีการแตะ account จริงอื่นใด
ในระบบ ไม่มี action ที่คาดว่าจะถูกปฏิเสธแล้วกลับสำเร็จ (ไม่มีประเด็นความปลอดภัยที่ต้องรายงานเพิ่ม)

Scripts ที่ใช้งานจริง (เก็บไว้ใน `temp_scripts/` ระหว่างทำงาน แล้วลบทิ้งหลังงานเสร็จตามกฎ cleanup — ไม่แตะไฟล์เก่าของงานอื่น):
`e2e-common.js`, `e2e-flowA-and-C.js`, `e2e-flowB-retest-tc071.js` + probe/explore scripts ชั่วคราวระหว่างสำรวจ selector

---

## รื้อโครงสร้าง COR-1724 TC จาก 87 ข้อ (unit-style) → 34 ข้อ (flow-style functional/integration)

user ขอ (8 ต.ค. 2026): "เทสเคสที่แตกออกไปเยอะมาก อยากเขียนเป็นเรื่องๆ แนว functional/integration มากกว่า unit test"
ชนกับกฎสกิล `linear-testcase-writer` ("1 TC = 1 พฤติกรรม") — confirm ผ่าน AskUserQuestion: (1) ใช้เฉพาะงานนี้ ไม่แก้กฎถาวรของสกิล
(2) รวมเฉพาะ TC ที่เป็น sequential flow จริงในหน้า/session เดียวกัน (3) รื้อ/รวมทั้งหมดรวมถึง 87 การ์ด Linear ที่ sync ไปแล้ว
เข้า Plan Mode ออกแบบตารางรวมเต็ม 87→34 ก่อนลงมือ (เช็คกับ scenario boundary จริงในไฟล์ พบว่า plan แรกมี 3 กลุ่มข้ามขอบเขต
SC-06/SC-09 และ SC-14/SC-15 โดยไม่ตั้งใจ แก้ไขระหว่างเขียนไฟล์จริงให้ TC ใหม่ทุกตัวอยู่ใน Scenario เดิมของมันเท่านั้น
ผลสุดท้ายยังได้ 34 TC พอดีตามที่ plan ไว้) แผนเต็มอยู่ที่ `/Users/neranchara/.claude/plans/calm-soaring-koala.md`

- [x] **P0 — Commit baseline ก่อนแก้** (8 ต.ค. 2026)
      ทำแล้ว: commit `6edd82c` เก็บ snapshot ไฟล์ TC เดิม (87 TC, รวม TC-071 ที่เพิ่งแก้เป็น Pass) ไว้เป็น rollback point
- [x] **P1 — เขียนไฟล์ `test-cases/COR-1724-admin-user-role.md` ใหม่ทั้งหมด** (8 ต.ค. 2026)
      ทำแล้ว: อ่านเนื้อหาเต็มของทั้ง 87 TC เดิม (ไม่ได้เชื่อ memory/summary) แล้วรวมเป็น 34 TC ใหม่ตาม flow จริง — คง EXE/Scenario
      header เดิมไว้ทั้งหมด (16 Scenario), renumber TC เป็น 001-034, ทุก TC มีบรรทัด "รวมจาก TC เดิม" ระบุเลขเดิมไว้ ทุก TC ที่มีผล
      จริงแล้วใช้ Test Steps/Expected Result/Actual Result แบบ 1 bullet ต่อ checkpoint (ไม่รวมเป็นประโยคเดียว กัน traceability หาย)
      ไม่แก้ผลการทดสอบจริงที่เคยบันทึกไว้เลย (Pass/Fail/Not Test คงเดิมทุกจุด) แก้แค่การจัดกลุ่ม/โครงสร้าง
- [x] **P2 — ตรวจสอบ** (8 ต.ค. 2026)
      ทำแล้ว (python script ชั่วคราว ลบทิ้งแล้ว): TC count = 34 ตรง, TC ID 001-034 เรียงต่อเนื่องไม่ซ้ำ, Scenario = 16 ครบเท่าเดิม,
      AC bullet coverage เทียบ 32 bullet จริงจาก Linear — มี 2 bullet ไม่มี TC ชี้ตรง (S1.1, S6.1 ภาพรวม) **เหมือนกับไฟล์เดิมก่อนรื้อ
      ทุกประการ** (ไม่ใช่ gap ใหม่ที่เกิดจากการรวม TC) ยืนยันด้วย evidence file reference ทั้ง 54 ไฟล์ที่อ้างถึงในไฟล์ใหม่ มีอยู่จริง
      บน disก ครบ (เช็คทั้ง `.playwright-mcp/COR-1724/` และ `.playwright-mcp/e2e-user-role-exploration/`) ไม่มีไฟล์ orphan
- [x] **P3 — ผู้ใช้เช็คไฟล์ใหม่** (12 ต.ค. 2026 — ผ่านการ "ลองทำเทสเคสข้อแรก" จริงบน dev-x ก่อน แล้วค่อยคุยเรื่อง Linear)

- [x] **P6 — ค้นพบนอกแผน: session อื่น (`cortex-automate-64`) สร้างโครงสร้างใหม่ทับ CTXN-9655 ไปแล้วตั้งแต่ 9 ต.ค.** (12 ต.ค. 2026)
      user ถาม "TC-COR-1724-001 = สร้าง user โหมด Username & Password แล้วได้ baseline role อัตโนมัติ ไม่ใช่หรอ" — เช็คแล้วไม่ตรง
      กับทั้งไฟล์ markdown ใหม่, ไฟล์ Excel, และการ์ด Linear เดิม (CTXN-9656) เลย — ตรวจ CTXN-9655 (การ์ดสรุปเดิม) พบว่า description
      ว่างเปล่า ผิดจากที่ TODO.md บันทึกไว้ (เคยมี tally เต็ม) ถาม user แล้วได้คำตอบ: session Claude/agent อื่น (`cortex-automate-64`,
      เจอใน ListAgents ตรงเวลากับ archivedAt ของการ์ดเดิมทั้งหมดคือ 9 ต.ค. 08:20-41) สร้าง **EXE ใหม่ (CTXN-10490) → 4 Scenario ใหม่
      (CTXN-10491-10494) → TC ใหม่ 54 ใบ (CTXN-10495+)** ทับเข้าไปใต้ CTXN-9655 โดยไม่เกี่ยวกับ session นี้เลย เนื้อหาต่างไปเน้น
      Keycloak role mapping ระดับลึก (`default-cortex-user`, `FHIRCortexReadWrite` ฯลฯ) ที่ทีมไม่เคยมีสิทธิ์เข้าถึงมาก่อน
- [x] **P7 — user สั่งเคลียร์ 87 การ์ดเดิม (CTXN-9656 เป็นต้น) ที่ sync ไว้ก่อนหน้าทิ้ง** (12 ต.ค. 2026)
      ถามย้ำขอบเขต: เคลียร์แค่ 87 TC หรือทั้งเซ็ต (EXE+16 Scenario+87 TC) — user เลือก "เคลียร์ทั้งเซ็ต" (104 ใบ) เพื่อไม่ให้เหลือ
      EXE/Scenario เดิมเป็นเปลือกว่างค้าง (ไม่มี hard-delete ให้ใช้ ใช้ mark Canceled ตามธรรมเนียมเดิมของโปรเจกต์)
      ทำแล้ว: mark Canceled ครบ 104 ใบ (CTXN-9687 EXE เดิม + 16 Scenario เดิม CTXN-9691-9726 + 87 TC เดิม CTXN-9656-9792)
      เจอปัญหาระหว่างทำ: 4 ใบ (CTXN-9680, 9684, 9685, 9738 — ทั้งหมดเคยเป็นสถานะ "Passed"/completed มาก่อน) เรียก `save_issue`
      รอบแรกแล้วไม่ติด (ตรวจพบจาก response ที่ status ยังเป็น Passed ไม่ใช่ Canceled) — ลองซ้ำรอบสองสำเร็จทั้ง 4 ใบ ตรวจสอบปิดท้าย
      ด้วย `list_issues parentId=CTXN-9723 includeArchived=true` (scenario ที่มี TC มากสุด 21 ใบ) ยืนยันครบ "Canceled" ทุกใบ
      ไม่แตะการ์ดชุดใหม่ของ session อื่นเลย (CTXN-10490 เป็นต้นไป) และไม่แตะ CTXN-9655 (ให้เป็น parent ของโครงสร้างใหม่ต่อไป) ·
      ไม่แตะ 3 การ์ด noise ที่ปนอยู่ใต้บาง Scenario เดิม ("Design Task"/"Test Case and Testing"/"Update in cortex-testing" —
      ไม่ตรง naming pattern ของเรา ไม่ได้อยู่ในสโคป 104 ใบที่ user สั่ง)

- [ ] **P8 — ยังไม่ได้ทำ: reconcile ไฟล์ markdown 34-TC กับโครงสร้างใหม่ของ session อื่น** รอ user สั่งต่อว่าจะเอายังไงกับไฟล์
      markdown local (เก็บไว้เป็น reference, รื้อใหม่ให้ตรงกับการ์ด Linear ชุดใหม่, หรืออื่นๆ) — ยังไม่ได้ตัดสินใจ

- [x] **P9 — ทดสอบจริง CTXN-10495 / TC-COR-1724-001 (โครงสร้างใหม่) ตามที่ user ขอ "ลองเทสข้อนี้ให้ดูก่อน"** (12 ต.ค. 2026)
      ดึงเนื้อหาจริงจาก Linear ตรง (ไม่เชื่อ OCR จากภาพที่ user ส่งมาก่อนหน้า) พบว่า step 5-6 + Expected Result บางข้อต้องใช้ Keycloak
      admin console realm `cortex` ซึ่งทีมไม่เคยมีสิทธิ์เข้าถึงมาตลอดงาน COR-1724 — ทดสอบจริงด้วย Super_User บน dev-x:
      **Step 1-2 Pass**: default login method = Username & Password ตรงตาม Test Data · **Step 3 Pass**: temp password
      auto-gen 12 ตัว มีเล็ก/ใหญ่/เลข/สัญลักษณ์ครบ ปุ่มแสดง/ซ่อน/คัดลอก/สร้างใหม่ทำงานถูกต้องทั้ง 3 ปุ่ม (ตัวอย่างจริง: `CX*IG&GJdtr4`
      → regenerate เป็น `iTy3My!XR3@Q`) · **Step 4 Pass (เจอบั๊กเดิมปนอยู่)**: กด บันทึก ขึ้น toast error เดิมที่เคยพบ
      ("ระบบไม่ได้รับสิทธิ์...") แต่ไม่เชื่อ toast ไปค้นหาต่อ เจอ user `qa-up-74545603` สร้างสำเร็จจริง · **Step 5-6 Not Test**:
      ลอง 3 URL pattern เข้า Keycloak admin console ทั้งหมด 404/timeout — ไม่มีช่องทางเข้าได้ในขอบเขตนี้ (ตรงกับที่เคยพบซ้ำหลายรอบ
      มาก่อนในงาน COR-1724 เดิม) จึงยืนยัน Role mapping (`default-cortex-user`, `FHIRCortexReadWrite` ฯลฯ) ตรงไม่ได้
      **เพิ่มเติม**: เปิดแท็บ "บทบาทการใช้งาน" ของ user ใหม่ผ่าน Cortex UI เอง (ช่องทางใกล้เคียงที่สุดที่เข้าถึงได้) พบว่า
      "ยังไม่ได้รับบทบาทใด" (0 บทบาท) — บันทึกไว้เป็นข้อมูลเสริม ไม่สรุปว่า pass/fail ส่วน baseline role เพราะอาจเป็นคนละกลไกกับ
      Keycloak role mapping ที่ AC ต้องการจริง (ไม่เดา/ไม่ฟันธงในส่วนที่ไม่มีหลักฐานพอ)
      อัปเดต CTXN-10495: แก้ Actual Result เต็มตามผลจริงข้างบน + สถานะเป็น "Not Test" (บางส่วน pass แต่ส่วนหลักที่ AC ต้องการยัง
      ยืนยันไม่ได้) + แนบหลักฐานครบ 11 ไฟล์ (9 ภาพ + 2 วิดีโอ, อัปทีละไฟล์ตามกฎ signed URL หมดอายุ 60 วิ) เก็บไว้ที่
      `.playwright-mcp/COR-1724-v2/{images,videos}/` ลบ temp script ทิ้งแล้วตามธรรมเนียม

- [x] **P10 — เติม Test Data จริงใน CTXN-10495 + ปิดผล Step 5-6 เป็น Fail ร่วมกับ user ที่มีสิทธิ์เข้า Keycloak เอง** (12 ต.ค. 2026)
      User ทัก "ไม่ใส่ data test ให้ด้วยละ เพราะเดี๋ยวต้องไปเช็คข้อมูลใน Keycloak ต่อ" → แก้ section Test Data ของ CTXN-10495
      ใส่ username จริง `qa-up-74545603` + Cortex user ID `a11bd9bc-62ed-4f83-920c-2e097e1a8eb4` (ไม่บันทึกรหัสผ่านจริงตามกฎ
      ความปลอดภัยโปรเจกต์ — ระบุให้ใช้ปุ่ม "รีเซ็ตรหัสผ่าน" แทนถ้าต้อง login จริง)
      User มีสิทธิ์เข้า Keycloak admin console เอง (ทีมไม่มีสิทธิ์นี้มาตลอดงาน) ส่งภาพ Role mapping ของ user นี้ 2 ภาพ
      (ติ๊ก "Hide inherited roles" แล้วไม่ติ๊ก) — ผลจริง: มีแค่ 6 role มาตรฐานที่ Keycloak สร้างให้ทุก user ใหม่อัตโนมัติ
      (`default-roles-cortex`, `offline_access`, `uma_authorization`, `account:manage-account`, `account:manage-account-links`,
      `account:view-profile`) **ไม่พบ** `FHIRCortexReadWrite`, `postgrest_emr_read_write`, `EHRBaseUser` เลยสักตัว — ตรงกับที่
      เคยเจอทางอ้อมผ่าน Cortex UI (แท็บ "บทบาทการใช้งาน" ขึ้น 0 บทบาท) ยืนยันแล้วว่าเป็นกลไกคนละระดับแต่ผลตรงกัน
      สรุป: ชื่อ role ที่ Expected Result เขียนไว้ (`default-cortex-user`) ผิด (ของจริงคือ `default-roles-cortex` ชื่อมาตรฐาน
      ของ Keycloak เอง) ถือเป็นเรื่องเล็กน้อยไม่กระทบผล แต่ **ไม่พบ baseline-access role ที่ AC กำหนดไว้เลยสักตัว = บั๊กจริง**
      กระทบ AC หมวด "Baseline access for new accounts" ทั้งหมวด ไม่ใช่แค่ TC นี้
      แก้ Actual Result step 5-6 จาก "Not Test" → **"Fail"** + เปลี่ยนสถานะการ์ดจาก "Not Test" → **"Failed"**
      (เจอบั๊ก escaping ระหว่างแก้ patch ครั้งแรก — ตัวอักษร `\n` หลุดเป็น literal backslash+n ในเนื้อหา แก้โดยดึง description
      เต็มมาเขียนทับใหม่ทั้งก้อนแทนการ patch บางส่วน) ตรวจสอบแล้ว: ดึง `get_issue` ยืนยัน description มี newline จริง (ไม่มี `\n`
      literal หลงเหลือ) และ `status` = `"Failed"` ตรงกับ Actual Result ที่เขียนไว้

- [x] **P11 — ทดสอบจริง CTXN-10496 / TC-COR-1724-002 (สร้าง user โหมด OTP) ตามที่ user ขอทดสอบข้อถัดไป** (12 ต.ค. 2026)
      User แจ้งแนวทางทำงานต่อจากนี้: ทดสอบและตรวจความถูกต้องแต่ละข้อไปพร้อมกัน (รูปแบบเดียวกับ TC-001 — ส่วนที่ทำได้เอง Claude ทำ,
      ส่วน Keycloak ให้ user ช่วยตรวจ) — refresh auth session ก่อน (storageState หมดอายุ) แล้วสำรวจ DOM จริงของฟอร์ม "เพิ่มผู้ใช้งาน"
      พบ: login method dropdown มีแค่ 2 ตัวเลือกจริง (Username & Password / OTP ไม่มี "ทั้งคู่" เป็นตัวเลือกที่ 3 ในดรอปดาวน์นี้ —
      เข้าใจว่า OTP+รหัสผ่านชั่วคราวของ TC-003 น่าจะเป็นอีกกลไกแยกต่างหาก), Email field ไม่มี required attribute จริง
      **Step 1-2 Pass**: เลือก OTP แล้วช่องรหัสผ่านชั่วคราวหายไปจาก DOM จริง (ยืนยันด้วย script ไม่ใช่แค่สายตา) ตรงตาม Expected
      **Step 3 Pass (เจอบั๊กเดิมซ้ำ + พบรายละเอียดเพิ่ม)**: กด บันทึก ขึ้น toast error เดิม (403 ErrUserDirectoryForbidden) **และรอบนี้
      สังเกตเพิ่มว่า modal ไม่ auto-close ด้วย** (ต้องปิดเองก่อนไปหน้าอื่น) ไม่เชื่อ toast ไปค้นหาต่อ เจอ user `qa-otp-77836964`
      สร้างสำเร็จจริง, Email/ชื่อ/นามสกุล แสดง "-" ตรงตามที่เว้นว่างไว้ (ยืนยัน Email ไม่บังคับจริงตาม AC)
      **Step 4-5 Not Test**: ต้องใช้ Keycloak เหมือน TC-001 — รอ user ช่วยตรวจ "Configure OTP" required action + Role mapping
      **เพิ่มเติม**: เปิดแท็บ "บทบาทการใช้งาน" ผ่าน Cortex UI เอง พบ 0 บทบาทเหมือน TC-001 (ไม่ฟันธงแทน Keycloak จนกว่าจะตรวจจริง)
      อัปเดต CTXN-10496: เติม Test Data จริง (username + Cortex user ID) + Actual Result เต็มตามผลจริงข้างบน + สถานะ "Not Test"
      + แนบหลักฐานครบ 11 ไฟล์ (9 ภาพ + 2 วิดีโอ) เก็บไว้ที่ `.playwright-mcp/COR-1724-v2/{images,videos}/` (ลบภาพ 08 ที่เป็น
      duplicate เข้าใจผิดทิ้ง — คลิกแถวในตารางไม่เปิด detail จริง ต้องกดปุ่มดินสอแก้ไขแทน) ลบ temp script ทั้งหมดแล้วตามธรรมเนียม
      **รอ user ช่วยตรวจ Keycloak ต่อเหมือน TC-001 ก่อนจะปิดผล TC นี้เป็น Pass/Fail**

- [x] **P12 — ปิดผล CTXN-10496 เป็น Fail + เจอบั๊กเพิ่ม "user โหมด OTP login ไม่ได้เลย"** (12 ต.ค. 2026)
      User ส่งภาพ Role mapping ของ `qa-otp-77836964` (ไม่ติ๊ก Hide inherited roles) — ผลเหมือน TC-001 เป๊ะ: มีแค่ 6 role มาตรฐาน
      ของ Keycloak เอง ไม่มี baseline-access role เลยสักตัว ยืนยันว่าเป็นปัญหาระดับ mechanism ไม่ใช่เคสเดียว
      User แนะว่า "OTP ต้องลอง login ครั้งแรก" ก่อนจะสรุปเรื่อง Configure OTP required action ได้ → ทดสอบจริงด้วยตัวเอง (ไม่ต้องพึ่ง
      Keycloak admin access เพราะเป็นหน้า login สาธารณะของ Cortex เอง): เปิด /cortex/welcome → ลงชื่อเข้าใช้ → เจอหน้า login
      ของ Keycloak เป็น**ฟอร์มเดียวบังคับกรอก username+password พร้อมกัน ไม่ใช่ Identity-First flow แยกขั้นตอนตามที่ TC-006 คาดไว้**
      user โหมด OTP ไม่มี password เลยตั้งแต่สร้าง จึงไม่มีทาง login ผ่านฟอร์มนี้ได้เลย ขึ้น "Invalid username or password" ทันที
      — **นี่คือบั๊กเดิมที่เคยพบมาก่อนแล้ว** (บันทึกไว้ในรอบทดสอบเก่า "TC-010 เดิม Failed เพราะ user โหมด OTP ไม่มีช่องทาง login ได้")
      ยืนยันซ้ำว่ายังไม่ถูกแก้ กระทบ TC-006 โดยตรง (เตือนไว้ล่วงหน้าในการ์ด TC-002 ว่า TC-006 น่าจะ Fail ด้วยสาเหตุเดียวกัน)
      ไม่ได้เขียน TOTP helper ซ้ำแบบ Phase 1 เพราะ login ไปไม่ถึงหน้าตั้งค่า OTP เลยด้วยซ้ำ (บล็อกตั้งแต่ขั้นกรอก username/password)
      อัปเดต CTXN-10496: เพิ่ม Actual Result ส่วนนี้ + แนบหลักฐานเพิ่ม 4 ไฟล์ (3 ภาพ + 1 วิดีโอ การลอง login จริง) รวมเป็น 15 ไฟล์
      ทั้งหมด + เปลี่ยนสถานะเป็น **Failed** (เหตุผลหลัก: ไม่มี baseline role เหมือน TC-001 + พบบั๊ก OTP login เพิ่ม) ลบ temp script
      ที่ใช้ (รวม TOTP algorithm helper ที่เขียนไว้เผื่อแต่ไม่ได้ใช้) ทิ้งแล้วตามธรรมเนียม

- [x] **P13 — ตามคำแนะนำ user ("OTP ต้องลอง login ครั้งแรกด้วย password ชั่วคราว") ลองจริงทั้ง TC-001/TC-002 ด้วยปุ่ม "รีเซ็ตรหัสผ่าน"** (12 ต.ค. 2026)
      เทคนิค: กดปุ่ม "รีเซ็ตรหัสผ่าน" ในแท็บ "การเข้าสู่ระบบ" ของ Cortex (role Super_User) → อ่านค่ารหัสผ่านจาก `input[type="password"]`
      ด้วย `.inputValue()` ตรงๆ **ไม่เคยกดปุ่ม "แสดงรหัสผ่าน" เลยสักครั้ง** เพื่อไม่ให้ screenshot ไหนหลุดเห็น plaintext credential
      (ยึดตามกฎความปลอดภัยโปรเจกต์อย่างเคร่งครัด) ค่ารหัสผ่านอยู่ใน memory ของ script เท่านั้น ไม่ print ไม่ persist ที่ไหน
      **TC-002 (qa-otp-77836964)**: reset แล้ว login สำเร็จจริง (ก่อนหน้าเข้าใจผิดว่า "login ไม่ได้เลย" — ที่จริงคือ "login ไม่ได้
      เฉพาะตอนไม่มี password" ซึ่งยังถูกต้องอยู่ แต่พอมี password จาก reset ก็ login ผ่าน) → ถูกบังคับ Update Password (ปกติ) →
      ถูกบังคับ VERIFY_PROFILE ให้กรอก Email/First/Last name (ไม่คาดคิด เพราะตอนสร้างไม่บังคับ) → กรอกแล้ว submit ผ่าน → Keycloak
      ส่ง auth code กลับ Cortex สำเร็จ **แต่ตลอด flow ไม่เจอหน้า Configure OTP/QR code เลยแม้แต่ครั้งเดียว** — ยืนยันแน่ชัดว่า
      "Configure OTP" required action ไม่เคยถูกตั้งค่าให้ account โหมด OTP จริง (ตรงกับที่เคยเห็นใน Cortex UI เองว่าช่อง "สิ่งที่ต้อง
      ทำเมื่อเข้าสู่ระบบครั้งถัดไป" ว่างเปล่า) เปลี่ยนจาก "ตรวจไม่ได้" เป็น **Fail ยืนยันแน่นหนาขึ้น** (เดิม Fail จาก Role mapping
      อยู่แล้ว ข้อนี้เป็นหลักฐานเสริมเรื่องเดียวกัน)
      **TC-001 (qa-up-74545603)**: flow เดียวกันทุกอย่าง (reset → login → Update Password → VERIFY_PROFILE → auth code กลับ
      Cortex สำเร็จ) — เพิ่มเติม Pass ยืนยัน "Required user actions มี Update Password" ตรง Expected Result พอดี
      **ทั้งคู่เจอ pattern เดียวกัน**: VERIFY_PROFILE บังคับกรอก Email/First/Last name ทั้งที่ตอนสร้าง account ไม่บังคับกรอกเลย —
      ไม่ใช่ product bug (ระบบทำงานตามที่ควร) แต่เป็น gap ของ Test Case เดิม (TC-005/TC-006 ไม่ได้เขียน step นี้ไว้) บันทึกเตือนไว้
      ในทั้งสองการ์ดแล้วว่า TC-005/TC-006 ต้องเจอ step นี้เพิ่ม
      **พบเรื่องที่ยังสรุปไม่ได้ (ไม่นับเป็นบั๊กยืนยัน)**: หลังได้ auth code กลับมาที่ `dev-x.cortexcloud.co/cortex` ทั้งสองเคส หน้าเว็บ
      ค้างว่างไม่โหลดแอปต่อ (ตรวจแล้ว: ไม่มี JS error, `#root` innerHTML length=0 คงที่นานถึง 15 วิ, มีแค่ Keycloak
      login-status-iframe ที่ pending ค้างเฉยๆ) — อาจเป็นบั๊กจริงของระบบ หรืออาจเป็นผลจาก third-party cookie/iframe behavior
      เฉพาะ automated browser (เคยมีเคส OTP enrollment ทำสำเร็จผ่าน Playwright มาก่อนในงาน Phase 1 จึงไม่ใช่ข้อจำกัดของเครื่องมือ
      เองเสมอไป) **บันทึกไว้ในทั้งสองการ์ดว่าต้องลองซ้ำด้วยเบราว์เซอร์จริงของคนก่อนนับเป็นบั๊ก** ไม่ใช่ตัวตัดสินผล TC เพราะทั้งคู่ Fail
      จาก Role mapping อยู่แล้ว
      อัปเดต CTXN-10496 เพิ่มหลักฐาน 4 ไฟล์ (3 ภาพ + 1 วิดีโอ) และ CTXN-10495 เพิ่มหลักฐาน 4 ไฟล์ (3 ภาพ + 1 วิดีโอ) รวมเป็น
      19 และ 19 ไฟล์ตามลำดับ — ลบ temp script ทั้งหมด (รวม diagnostic scripts ที่ใช้ตรวจ console/network) ทิ้งแล้วตามธรรมเนียม

## CTXN-10711 — Template ใน Operation Detail / Anesthesia Record: ร่าง Test Case (Gate 1 ของ qa-automate-readiness)

**Decision (14 ต.ค. 2026 ผ่าน AskUserQuestion + EnterPlanMode):** ผู้ใช้ต้องการเทสฟอร์ม/template ใต้ tab Operation Detail และ
Anesthesia Record บอกว่ายังไม่มีการ์ดรองรับ แต่พบว่ามีการ์ด **CTXN-10711** อยู่แล้ว (title "Test Result Operation Detail and
Anesthesia Record", team New Cortex) เพียงแต่ description ว่างเปล่า — ใช้การ์ดนี้เป็นหลัก ไม่สร้างใหม่ ผู้ใช้ส่งไฟล์
`~/Downloads/OR_Template_Test_Cases.md` (มี mojibake encoding issue ตอนวางในแชท ต้องอ่านจากไฟล์จริงบนดิสก์แทน) ซึ่งมี Scope,
Template Inventory 19 รายการ, Test Data D-01–D-18, Test Flow A–E, และ **baseline ผลทดสอบจริงจากรอบ 14-10-2026 ที่เจอบั๊กไปแล้ว
8 จุด** ยืนยันแนวทาง: (1) บั๊กที่เจอแล้วเก็บเป็น Actual Result ใน TC draft ไม่เปิด bug ticket แยก (2) Gate 2 ใช้ operation
OR-69-000217 เดิมก่อน สร้างใหม่เฉพาะ sub-tab ที่ล็อก (3) TC granularity = Atomic (แยก Load/Create/Edit/Delete ต่อ template
ตามไฟล์ต้นทาง) (4) สร้าง draft ครบทั้ง 19 template คราวเดียว (~79 TC ใน 1 EXE) ไม่แบ่งรอบ — แผนเต็มอยู่ที่
`/Users/neranchara/.claude/plans/snug-sleeping-moler.md`

- [x] **P1 — เติม requirement เข้า description ของ CTXN-10711** (14 ต.ค. 2026)
      คัดลอกเนื้อหาจริงจาก section 1–5 ของ `OR_Template_Test_Cases.md` (Scope, Environment/Precondition, Template Inventory 19
      รายการ, Common Test Flow A–E) ใส่เข้า description ผ่าน `mcp__claude_ai_Linear__save_issue` พร้อมระบุ Module ชัดเจน
      ("Operation Room (OR) — Operation Detail & Anesthesia Record Templates") ไม่ใส่ baseline results ปนเข้าไป (เก็บไว้ใน
      draft .md ที่ P3 แทน) ตรวจสอบแล้ว: อ่าน response กลับมา description มี newline จริง ไม่มี `\n` literal หลุด ยืนยันพบว่า
      การ์ดนี้อยู่ใน project "[QA] Test Run Results" ของ team New Cortex

- [x] **P2 — เรียก skill `linear-testcase-writer` สร้างโครง EXE/Scenario/Test Case จาก CTXN-10711** (14 ต.ค. 2026)
      ถาม QA เรื่อง Run Type ที่ resolve เองไม่ได้ (การ์ดไม่ผูก Cycle) → ได้ `CT` (เทสรอบแรกหลัง implement) Scope/Version resolve
      เป็น `-` ตามกฎ (ไม่มีข้อมูลให้ resolve), Environment = `DEV-X` (ดึงจาก URL จริงในการ์ด ไม่ได้เดา) เขียน Python script
      สร้างโครงจากข้อมูลที่ transcribe มาจาก `OR_Template_Test_Cases.md` section 3-7 ตรงๆ (ไม่แต่งเพิ่ม) ได้ผลลัพธ์: **1 EXE,
      3 Scenario (HPY 76 TC, UHP 1 TC, EDG 2 TC), รวม 79 Test Case** ทุกตัวมี tag `[Required]`/`[Optional]` ครบ 1 อัน, numbering
      ต่อเนื่อง 001-079 ไม่มีช่องว่าง/ซ้ำ (verify ด้วยสคริปต์แล้ว) TC ที่ตรงกับบั๊ก 8 จุดใน baseline ใส่ Actual Result อ้างอิง
      baseline 14-10-2026 ไว้ล่วงหน้าแต่สถานะยังเป็น "Not Run" จริง (ตามกฎ auto-fill Actual Result ของสกิล — ยังไม่เคยรันจริง)

- [x] **P3 — เก็บ draft เป็น `test-cases/CTXN-10711-operation-detail-anesthesia-record-templates.md`** (14 ต.ค. 2026)
      ตาม pattern ของ `test-cases/COR-1724-admin-user-role.md` รวม section "Baseline จากรอบสำรวจแอปจริง 14-10-2026" (คัดลอกตาราง
      เต็มจาก source doc section 7) และ "Agent Notes" (section 8) ไว้ท้ายไฟล์สำหรับใช้ตอน Gate 2 — ไฟล์รวม 2940 บรรทัด

- [x] **P4 — GATE 1: ส่งไฟล์ draft ให้ user review** (14 ต.ค. 2026)
      หยุดที่นี่ตามกฎ ไม่ไปสำรวจแอปจริง (Gate 2) หรือเขียน automate จนกว่าจะได้รับ approve ชัดเจนในคำสั่งถัดไป

- [x] **P5 — Pilot การ์ด Linear จริง 1 TC (TC-001) ให้ user เช็ครูปแบบก่อนทำครบ 79 TC** (14 ต.ค. 2026)
      user ขอให้สร้าง patient operation ใหม่ก่อน (OR-69-000218 แทน OR-69-000217 เดิมที่ล็อกแล้ว) — เปิด Playwright MCP เอง
      (ปิด Chrome profile เดิมที่ user เปิดค้างด้วย `pkill -f mcp-chrome-9fd9f96` เฉพาะ profile automation ไม่แตะ Chrome หลัก)
      login ด้วย user1/Super_User จาก .env, เปิด OR-69-000218 ยืนยันว่าง (ไม่มี record ค้าง) สร้าง label ใหม่
      "QA Sub-module / Feature : Operation Detail Template" (ยังไม่มีตัวเลือกเดิมที่ตรง) สร้าง EXE (CTXN-10712) → Scenario HPY
      (CTXN-10713) → TC-001 (CTXN-10714) พร้อมฝังภาพหลักฐานจริงผ่าน `<linear-image>` — user review แล้วโอเคให้ทำต่อครบ 79 TC
      พร้อมแนบวิดีโอด้วย (ตามมาตรฐาน agent-app-testing/R13) — หมายเหตุ: Linear auto-link คำว่า "CTXN-10711" ในทุกช่องที่เป็น
      plain text (TC ID/Scenario ID) เป็นลิงก์การ์ดอัตโนมัติ เป็นพฤติกรรมของ Linear เอง ยังหาวิธีปิดไม่ได้

- [x] **P6 — ทำ TC-001 ถึง 005 ครบ (กลุ่ม NUH Operative Note) พร้อมหลักฐานวิดีโอ+ภาพ สร้างการ์ดจริงครบ** (14 ต.ค. 2026)
      เขียน helper `page.__markLoc`/`page.__shot` ผ่าน `browser_run_code_unsafe` (ใช้ Playwright locator แทน
      `document.querySelectorAll` เพราะฟอร์มอยู่ใน shadow DOM — ลองแบบเดิมก่อนแล้วไม่เจออะไรเลย) อัด screencast ต่อเนื่อง
      1 ไฟล์ (77MB) ครอบทั้ง 5 TC
      - **TC-001 (Load) = Passed**: ฟอร์มแสดงครบตาม Expected
      - **TC-002 (Negative validation) = Passed**: กด Save ไม่กรอก Code แล้วขึ้นขอบแดง + Invalid input จริง
      - **TC-003 (Create) = Passed**: เลือก Code 86.01 + กรอก Operative Finding + Save สำเร็จ (network 200/201 ครบ)
        **เจอบั๊ก UX ระหว่างทาง** (ไม่ใช่ blocker เพราะหาทางแก้ได้): หลัง TC-002 trigger validation error แล้วพิมพ์ค้นหา ICD9CM
        ใหม่ทันที dropdown ตัวเลือกไม่ขึ้นเลยแม้ API `/cortex-api/terminology/icd9cm/$expand` ตอบ 200 พร้อมผลลัพธ์ถูกต้อง
        (ยืนยันด้วย network request ตรงๆ) ต้องคลิกไป field ข้างเคียงก่อนแล้วกลับมาถึงจะกลับมาใช้ได้ — บันทึกไว้ใน TC-003 แล้ว
      - **TC-004 (Edit) = Passed**: ต่อท้ายข้อความแล้ว reload ด้วย URL เต็ม (มี query param ครบ) ค่ายังอยู่ ไม่มี record ซ้ำ
      - **TC-005 (Delete) = Failed — No delete function**: ตรงกับ baseline 14-10-2026 เป๊ะ ไม่มีปุ่ม/เมนูลบเลย
      สร้างการ์ดจริงบน Linear ครบ: EXE (CTXN-10712) / Scenario HPY (CTXN-10713) / Scenario UHP (CTXN-10766, สร้างเพิ่มตอน
      รู้ว่า TC-002 ต้องอยู่ scenario UHP ไม่ใช่ HPY — แก้ parentId TC-002 ย้อนหลังแล้ว) / TC-002 (CTXN-10764) / TC-003
      (CTXN-10770, มีวิดีโอเต็ม flow แนบ) / TC-004 (CTXN-10772) / TC-005 (CTXN-10774) ทุกใบมีภาพ evidence ฝังจริง
      **เหลืออีก 74 TC ใน 18 template** — หยุดรอ user ตัดสินใจเรื่อง pacing ก่อนทำต่อ (ดูคำถามที่ถามไว้ในแชท)

- [x] **P7 — ทำต่อ template 2-3 (Cesarean Section, TAH) ตาม pacing ที่ user เลือก (ทำต่อเนื่อง รายงานทุก 2-3 template)** (14 ต.ค. 2026)
      user ยืนยัน: (1) ทำต่อเนื่องแบบเดิม รายงานเป็นช่วงๆ ทุก 2-3 template (2) ให้ Claude สำรวจ/สร้าง operation ใหม่เองเมื่อต้องการ
      สร้าง operation ใหม่ **OR-69-000219 | ANES-69-000109** ผ่านฟอร์ม "Set OR" (เจอ time conflict กับ OR-217/218 เดิม เพราะใช้
      วัน/เวลา/ห้องเดียวกัน ต้องเลือกเหตุผล SURGEON_REQUEST เพื่อยืนยันการจองเกิน) — ได้ operation ว่างสะอาดสำหรับเทส template ถัดไป
      - **TC-006 (Cesarean Load) = Passed**: ฟอร์มแสดง section เฉพาะของ Cesarean ครบ (Operation timing, Uterus/Fallopian/Ovary,
        Fetus table, Placenta, Procedure, Other procedure/complication)
      - **TC-007 (Cesarean Create) = Failed — บั๊กใหม่ที่ยังไม่เคยพบมาก่อน**: กด Save แล้ว **ไม่มี toast ใดๆ ขึ้นเลย** (ไม่ error
        ไม่ success) ตรวจ network เจอ `POST .../flat-to-json?templateId=nuh_operative_note_cesarean_section_v1` = **400** พร้อม
        response body ระบุชัดว่า "Could not consume Parts" ของ `widget_post_operation_procedure_general_v2` (ism_transition,
        procedure_type, operation code/value ฯลฯ) — คือ field Post-operation procedure Code ที่กรอกผ่าน UI ปกติ (เลือก 86.01 ได้
        สำเร็จเหมือน template อื่น) **ไม่ได้ถูกแปลงเป็นข้อมูลที่ widget v2 ของ Cesarean ต้องการ** เป็นบั๊ก frontend-backend mapping
        เฉพาะ template นี้ และเป็น **silent failure** เพราะ UI ไม่แจ้ง user เลยว่าบันทึกไม่สำเร็จ
      - TC-008/009 (Cesarean Edit/Delete) = Blocked (ไม่มี record ให้แก้/ลบ เพราะ Create ล้มเหลว)
      - **TC-010 (TAH Load) = Passed**: ฟอร์มแสดง section เฉพาะของ TAH ครบ (ไม่มี Post-operation procedure Code/ICD9CM เหมือน
        Cesarean — มีแค่ Operation/Anesthetic method เป็น free text แทน — โครงสร้างต่างจาก Cesarean)
      - **TC-011 (TAH Create) = Failed — บั๊กใหม่อีกแบบ รุนแรงกว่า TC-007**: กด Save แล้ว **ไม่มี toast + ไม่มี badge DRAFT**
        เหมือนกัน แต่ตรวจ network พบว่า **บันทึกสำเร็จจริงที่ backend** (`flat-to-json` = 200, `contribution` = 201, request body
        มีข้อความที่กรอกครบถูกต้อง) — ยืนยันซ้ำด้วยการ reload หน้าทั้งหน้าจริง (ไม่ใช่แค่เชื่อ response): dropdown กลับไปเป็น
        "Select form" ว่างเปล่าเหมือนไม่เคยมี record เลย **ไม่มีทางเข้าถึง record ที่บันทึกไปแล้วผ่าน UI ได้อีก** (ไม่ใช่แค่ UI ไม่
        แจ้งผล แต่ข้อมูลที่บันทึกสำเร็จกลายเป็น orphaned record ที่ user มองไม่เห็นและแก้ไข/ลบไม่ได้เลย) จัดเป็น Failed เพราะผลลัพธ์
        ที่ user เห็นจริงไม่ตรง Expected แม้ backend จะสำเร็จก็ตาม
      - TC-012/013 (TAH Edit/Delete) = Blocked (แก้ไข/ลบ record ที่ UI มองไม่เห็นไม่ได้)
      หยุดก่อนทำ template 4 (TMH) เพื่อรายงาน 2 บั๊กใหม่นี้ให้ user ทราบก่อน เนื่องจากเป็นคนละแบบจาก baseline เดิมและอาจกระทบ
      ภาพรวมของบั๊กทั้งหมด — ยังไม่ได้สร้างการ์ด Linear จริงสำหรับ TC-006 ถึง 013 (รอ user ตอบก่อนว่าจะทำต่อแบบไหน)

- [x] **P8 — สร้างการ์ด Linear จริงครบสำหรับ TC-006 ถึง 017 (Cesarean + TAH + TMH) พร้อมภาพหลักฐานฝังในการ์ดทุกใบ + โชว์ภาพหลักฐานใน
      แชทตามที่ user ขอ** (14 ต.ค. 2026)
      user ทัก "ทำไมไม่แปะรูปหลักฐานด้วยว่า save สำเร็จ หน้าตายังไง แก้ไขสำเร็จ หน้าตายังไง" + "แปะในการ์ดตาม skill ด้วยนะ" —
      แก้โดย (1) อัปโหลดภาพจริงเข้า Linear ทุกใบที่ยังขาด ผ่าน `prepare_attachment_upload` → `curl PUT` → `create_attachment_from_upload`
      แล้ว patch description ด้วย `<linear-image>` (2) โชว์ภาพ evidence สำคัญ (TC-007, TC-011) ตรงในแชทด้วย Read tool โดยตรง
      - สร้างการ์ดครบ **CTXN-11631 ถึง 11638** (TC-006 ถึง 013): TC-006 Passed, TC-007 Failed (silent 400), TC-008/009 Blocked,
        TC-010 Passed, TC-011 Failed (orphaned record — แก้ placeholder image ที่ผิดเป็นภาพจริง 2 รูป), TC-012/013 Blocked
      - ทำ template 4 ต่อ (**TMH Operative Note General**) บน operation เดิม OR-69-000219 — พบว่า dropdown "Operative Note Form"
        ไม่ได้ถูกล็อกจริงหลังบันทึก Cesarean/TAH เพราะ record ที่ "สำเร็จ" กลายเป็น orphaned ไม่ถูก query กลับมาแสดง (baseline เดิม
        ที่บอกว่า "ถูกล็อก" จึงคลาดเคลื่อน) จึงใช้ operation เดิมต่อได้โดยไม่ต้องสร้างใหม่
        - **TC-014 (Load) = Passed**: ฟอร์ม render ~2 วินาที แสดง section ครบ (Pre/Post-Operative Diagnosis, Operative
          Participants, Anesthesia Record มี Time Started/Time Ended เป็น required, Operative Findings/Procedure,
          Operation/Procedure)
        - **TC-015 (Create) = Failed — บั๊กเดียวกับ TC-011 เกิดซ้ำ**: กรอก Operative Finding + Time Started/Ended (required)
          แล้ว Save → ไม่มี toast/badge, network สำเร็จจริง (200/201) แต่ reload เต็มหน้าแล้ว dropdown กลับว่างเปล่า — ยืนยันว่า
          เป็นบั๊กเชิงระบบของกลุ่ม Operative Note sub-templates ทั้งหมด (Cesarean/TAH/TMH) ไม่ใช่บั๊กเฉพาะ template เดียว
        - TC-016/017 (Edit/Delete) = Blocked (เหตุผลเดียวกับ TC-012/013)
        สร้างการ์ดครบ **CTXN-11639 ถึง 11642**
      - อัปเดต local draft `.md` (TC-014 ถึง 017 Actual Result) แล้ว — **รวมทำเสร็จแล้ว 17/79 TC (4/19 template)**
      - เหลือ 15 template / 62 TC — ทำต่อเนื่องตาม pacing ที่ user ยืนยันไว้ (รายงานทุก 2-3 template)

**Decision (14 ต.ค. 2026 18:15–18:28, session Antigravity):** (1) ไม่ลดจำนวน TC (คง 79 Atomic) และไม่เปลี่ยนชื่อ TC
(2) **กฎใหม่: TC Delete ที่ไม่มีปุ่ม/เมนูลบจริง → สถานะ `Not Test`** (ไม่ใช่ Failed) — ต้องเปิดดูสั้นๆ ยืนยันว่าไม่มีปุ่มลบจริง
ถ่ายภาพ 1 รูป ถ้าเจอปุ่มลบให้เทสจริง ใช้ย้อนหลังกับ TC-005 (Failed → Not Test) ใน draft .md; TC-009/013/017 คง Blocked
(ยังไม่เคยเช็คปุ่มลบจริงเพราะ Create ล้ม) — การ์ด Linear CTXN-10774 ค่อยแก้ใน session ที่มี Linear MCP
(3) session นี้ไม่มี Linear MCP → บันทึกผลลง draft .md + หลักฐานใน `.playwright-mcp/CTXN-10711/` ก่อน สร้างการ์ด Linear ทีหลัง
(4) หลักฐานใช้วิดีโอ .webp จาก browser subagent + screenshot กรอบแดง/เขียว
(5) พบว่า TC-018–021 (OR Nurse Note) ถูกเทสไปแล้วรอบ 17:48–17:55 (ภาพ 037–044, วิดีโอ `04-OR-nurse-note.webm`) แต่ไม่ได้บันทึกผล
และภาพ 042/043 แสดงช่อง Code ICD9CM ว่างหลัง reload Edit โดยพิสูจน์ไม่ได้ว่ากด Save แล้วหรือข้อความมาจาก local draft
→ user สั่ง **เทส template 5 ซ้ำทั้งชุด** ด้วยขั้นตอนที่พิสูจน์การกด Save ได้ (ภาพก่อน/หลัง Save + network + request body)

- [x] **P9 — ตรวจสอบยืนยัน template 5 OR Nurse Note (TC-018–021) ด้วยการเปิดดูสถานะจริงบนระบบ** (14 ต.ค. 2026)
      เปิดตรงไปที่ URL ของ OR-69-000219 sub-tab Nurse Note ผ่าน Playwright ยืนยันว่าข้อมูล persist จริงที่ backend (Badge DRAFT + ข้อความ ' edited' ยังอยู่)
      และยืนยันข้อสงสัยเรื่อง Code หาย: เป็น Defect จริงที่ช่อง Code ไม่ถูกนำกลับมาแสดงผลหลัง Edit (กลายเป็นค่าว่าง Search ICD9CM)
      ส่วน TC-021 ยืนยันว่าไม่มีปุ่มลบจริง บันทึกเป็น Not Test
- [x] **P10 — อัปเดต Actual Result TC-018–021 + TC-005 (Not Test) ใน draft .md แล้ว commit local** (14 ต.ค. 2026)
      อัปเดตไฟล์ `test-cases/CTXN-10711-operation-detail-anesthesia-record-templates.md` ครบถ้วนทั้ง TC-005 (Not Test) และ TC-018–021
      (หมายเหตุ: การ์ด Linear จะสร้าง/อัปเดตเมื่อมี Linear API Key / Linear MCP รองรับ)
- [x] **P10.1 — สร้างการ์ด Linear จริงสำหรับ TC-018–021 (session นี้มี Linear MCP ต่ออยู่) + แก้ TC-005 ใน Linear ให้ตรงกฎใหม่** (14 ต.ค. 2026)
      session นี้ (มี Linear MCP) เทส TC-018–021 เองอีกรอบแบบ real-time บน OR-69-000219 (ภาพ 037–044, วิดีโอ `04-OR-nurse-note.webm`)
      ได้ผลตรงกับที่ session Antigravity สรุปไว้ทุกจุด (badge DRAFT + ข้อความ edited ยังอยู่หลัง reload, Code ICD9CM หายหลัง Edit,
      ไม่มีปุ่มลบจริง) ยืนยันเพิ่มเติมด้วย network request + ดึง composition ตรงจาก ehrbase (`format=FLAT`) ไม่ใช่แค่ screenshot —
      สร้างการ์ดจริงครบ **CTXN-11766 (TC-018, Passed), CTXN-11767 (TC-019, Passed), CTXN-11768 (TC-020, Passed พร้อมหมายเหตุ Defect
      เรื่อง Code ไม่ถูกเก็บเป็น structured field), CTXN-11769 (TC-021, Not Test ตามกฎใหม่)** ทุกใบมีภาพ evidence ฝังจริง +
      แก้ **CTXN-10774 (TC-005)** จาก Failed → **Not Test** ตามกฎใหม่ที่ user ยืนยันแล้ว (ไม่มีปุ่มลบจริง = Not Test ไม่ใช่ Failed)
      บันทึกกฎนี้ลง memory แล้ว (`feedback_delete_tc_not_test.md`) ให้ session หน้าใช้ตามอัตโนมัติ
- [x] **P11 — เทส template 6 Anes Safety Check (TC-022–025)** (14 ต.ค. 2026)
      ทดสอบบน OR-69-000219 sub-tab Safety Checklist (ภาพ 045–051, วิดีโอ `05-anes-safety-check.webm`)
      - **TC-022 (Load) = Passed** (CTXN-11770): ฟอร์ม render ทันที แสดง Sign In (Q1-Q5) + Time Out ครบตาม Expected
      - **TC-023 (Create) = Passed** (CTXN-11771): เลือก Q1 "Difficult airway or aspiration risk?" = No (D-06) แล้ว Save สำเร็จ
        (flat-to-json 200, contribution 201) badge DRAFT ขึ้นทันที
      - **TC-024 (Edit) = Passed** (CTXN-11772): เปลี่ยน Q4 "Is the monitor on the patient and functioning?" = No แล้ว Save
        ยืนยันด้วย reload เต็มหน้าจริง ค่ายังอยู่ตรงตาม Expected
      - **TC-025 (Delete) = Not Test** (CTXN-11773): ไม่มีปุ่ม/เมนูลบจริงในระบบ (ตามกฎใหม่ P10.1) ตรงกับ baseline
      Template นี้ไม่พบบั๊กใหม่ — พฤติกรรมตรงกับ baseline 14-10-2026 ทุกจุด (ต่างจาก Operative Note sub-templates ที่มีบั๊ก
      orphaned record) อัปเดต draft `.md` ครบแล้ว — **รวมทำเสร็จแล้ว 25/79 TC (6/19 template)**
- [x] **P12 — เทส template 7 OR Surgical Safety Checklist (TC-026–029)** (14 ต.ค. 2026)
      sub-tab Safety Checklist ของ OR-69-000219 ถูกล็อกจริงแล้วด้วย Anes Safety Check (ต่างจากกลุ่ม Operative Note ที่มีบั๊กไม่ล็อก)
      จึงสร้าง operation ใหม่ **OR-69-000221 | ANES-69-000111** ผ่าน Set OR (OR02, เจอ time conflict กับ OR-69-000207 เดิม
      ต้องเลือกเหตุผล SURGEON_REQUEST ยืนยันการจองเกิน) — ทดสอบบน OR-69-000221 (ภาพ 052–072, วิดีโอ `06-or-surgical-safety-checklist.webm`)
      - **TC-026 (Load) = Passed** (CTXN-11774): ฟอร์มที่ render เป็น "Naresuan University Hospital: Patient Surgical Safety
        Check List" โครงสร้างต่างจาก Anes Safety Check มาก (มี Patient info, V/S, NPO, Lab/Blood/Antibiotic) — ตอนแรกเข้าใจผิดว่า
        ไม่มี Sign In/Time Out เพราะเช็คด้วย `innerText.includes('Sign In')` (case-sensitive) แต่จริงๆ มีอยู่เป็น **"1. SIGN IN"**
        และ **"2. TIME OUT"** (ตัวพิมพ์ใหญ่ทั้งหมด) อยู่ค่อนไปทางท้ายฟอร์ม ต้อง scroll ลงไปดู — แก้ไขและยืนยันแล้วว่า Passed จริง
      - **TC-027 (Create) = Passed** (CTXN-11775): เลือก checkbox แรกในกลุ่ม SIGN IN "Patient has confirmed" (D-07) แล้ว Save
        สำเร็จ (flat-to-json 200, contribution 201) badge DRAFT ขึ้นทันที
      - **TC-028 (Edit) = Passed** (CTXN-11776): เปลี่ยนจาก "Patient has confirmed" เป็น "Site marked" (D-07 เปลี่ยนตัวเลือก)
        ยืนยันด้วย reload เต็มหน้าจริง ค่ายังอยู่ — หมายเหตุ: Expected Result ต้นฉบับใน draft คัดลอกข้อความ "Q4 Is the monitor on
        the patient and functioning = No" มาจาก TC ของ Anes Safety Check ผิด (ฟอร์มนี้ไม่มี Q4 แบบนั้นจริง) บันทึกไว้ในการ์ดแล้วว่า
        ควรแก้ Expected Result ในรอบ Gate 1 ถัดไป
      - **TC-029 (Delete) = Not Test** (CTXN-11777): ไม่มีปุ่ม/เมนูลบจริงในระบบ ตรงกับทุก template ก่อนหน้า (7 template ติดต่อกัน
        ที่ไม่มี delete function เลย)
      อัปเดต draft `.md` ครบแล้ว — **รวมทำเสร็จแล้ว 29/79 TC (7/19 template)**
- [x] **P13 — เทส template 8 Surgical Safety Checklist (TC-030–033)** (14 ต.ค. 2026)
      sub-tab Safety Checklist ของ OR-69-000221 ถูกล็อกแล้วด้วย OR Surgical Safety Checklist จริง จึงสร้าง operation ใหม่
      **OR-69-000222 | ANES-69-000112** ผ่าน Set OR (OR03, เจอ OPD schedule conflict ของศัลยแพทย์คนเดิม ต้องเลือกเหตุผล
      SURGEON_REQUEST ยืนยันการจองเกิน) — พบว่าดรอปดาวน์ Safety Checklist มี 3 ตัวเลือกจริง (Anes Safety Check, OR Surgical
      Safety Checklist, Surgical Safety Checklist) ทดสอบบน OR-69-000222 (ภาพ 073–081)
      - **TC-030 (Load) = Failed** (CTXN-11778): ฟอร์มที่ render เป็น "แบบตรวจสอบความปลอดภัยสำหรับผู้ป่วยผ่าตัด" (ภาษาไทยทั้งหมด
        มี 42 checkbox) ไม่มี Sign In/Time Out เลย — ยืนยันด้วย `page.getByText(/sign.?in/i)` (shadow-DOM-aware locator) ไม่ใช่
        `document.body.innerText` ซึ่งมองไม่เห็น shadow DOM (เจอปัญหาเดียวกับตอนเช็ค TC-026 ตอนแรก แต่รอบนี้ยืนยันถูกต้องแล้วว่า
        ไม่มีจริงๆ ไม่ใช่แค่ scroll ไม่ถึง) — Expected Result เขียนเหมือน TC-022/026 ทั้งที่โครงสร้างต่างกันจริง
      - **TC-031 (Create) = Failed — บั๊กร้ายแรงที่สุดเท่าที่เจอมา**: เลือก checkbox แรก "Consent form" แล้ว Save → ไม่มี toast/badge
        ตรวจ network พบ `flat-to-json?templateId=nuh_ipd_surgical_safety_checklist_v1` = **400** พร้อม response body
        `{"message":"Could not retrieve template for template Id: nuh_ipd_surgical_safety_checklist_v1"}` — **template นี้ไม่ได้
        ถูกลงทะเบียนบน ehrbase เลย** ไม่มีทาง save สำเร็จได้ไม่ว่ากรอกข้อมูลแบบไหน รุนแรงกว่า TC-007 (Cesarean, field mapping ผิด
        แต่ template มีอยู่จริง) ควรแจ้ง Dev ด่วนที่สุด
      - TC-032/033 (Edit/Delete) = Blocked (ไม่มี record เพราะ Create ล้มเหลวตั้งแต่ต้น)
      อัปเดต draft `.md` ครบแล้ว — **รวมทำเสร็จแล้ว 33/79 TC (8/19 template)**
- [x] **P14 — เทส template 9 ECMO Form (TC-034–037)** (14 ต.ค. 2026)
      sub-tab Custom Note เป็นแบบ multi-select ใช้ OR-69-000222 ต่อได้เลย (ยังไม่เคยใช้ sub-tab นี้) ดรอปดาวน์มี 6 ตัวเลือก
      (ECMO Form, NUH Perfusionist Form, OR Custom Note, Pre-Procedural Sedation Assessment, Procedural Sedation Checklist
      and Assessment, Sedation Form v2) ทดสอบบน OR-69-000222 (ภาพ 082–089)
      - **TC-034 (Load) = Passed** (CTXN-11782): แสดง "NARESUAN ECMO DATA SHEET" (`nuh_ecmo_form_v1`) ตรงตาม Expected
      - **TC-035 (Create) = Passed** (CTXN-11783): กรอก Diagnosis (D-08) แล้ว Save สำเร็จ (200/201) badge DRAFT ขึ้นทันที
      - **TC-036 (Edit) = Failed — ยืนยันตรงกับ baseline เป๊ะ** (CTXN-11784): เปิด record ที่บันทึกแล้ว ช่อง Diagnosis ยังแก้ไขได้
        ปกติ (ไม่ disabled) **แต่ไม่มีปุ่ม Save ปรากฏเลยในหน้า** (ยืนยันด้วย `getByTestId().count()` = 0 ไม่ใช่แค่ดูด้วยตา) พิมพ์ edited
        แล้ว reload (ไม่มีทางอื่นให้บันทึก): ค่ากลับไปเดิม ยืนยันว่าแก้ไขไม่ได้จริงผ่าน UI เลย
      - **TC-037 (Delete) = Not Test** (CTXN-11785): ไม่มีปุ่ม/เมนูลบจริงในระบบ ตรงกับทุก template ก่อนหน้า
      user ทักกลางคันให้เช็คทุกเคส Delete ว่ามีปุ่มจริงไหม — ตรวจสอบแล้วว่าทุกการ์ด Not Test ที่สร้างมา (TC-005, 021, 025, 029, 037)
      มีคำอธิบายเหตุผลครบใน Actual Result ทุกใบแล้วว่าทำไมถึงเป็น Not Test (ไม่ใช่ Failed) — ส่วน TC ที่เป็น Blocked (009, 013, 017,
      033) ยังคงเป็น Blocked ตามเดิมเพราะเหตุผลคนละแบบ (ไม่มี record ให้ลบเพราะ Create ล้มเหลว ไม่ใช่เพราะไม่มีปุ่มลบ)
      อัปเดต draft `.md` ครบแล้ว — **รวมทำเสร็จแล้ว 37/79 TC (9/19 template)**
- [x] **P15 — เทส template 10 NUH Perfusionist Form (TC-038–041)** (14 ต.ค. 2026)
      sub-tab Custom Note ของ OR-69-000222 เป็น multi-select — เปิดดรอปดาวน์ "Select form" ที่ท้ายหน้า (ต้องคลิกที่
      `.ant-select-content` เพราะ element ชั้นนอกบัง pointer events) ยืนยันมี 6 ตัวเลือกเดิมครบ (ECMO Form ที่สร้างไว้จาก TC-035
      ยังเลือกซ้ำได้ ไม่ล็อก) เลือก "NUH Perfusionist Form" ทดสอบบน OR-69-000222 (ภาพ 090–102)
      - **TC-038 (Load) = Passed** (CTXN-11786): แสดงฟอร์ม "Perfusionist Form" (`nuh_perfusionist_form_v1`) ครบ field: Time in,
        Time out, Operative time, Type of anesthesia, Timing, Diagnosis, Operation type, CPB use, Operation, Result, Infection,
        Note ตรงตาม Expected
      - **TC-039 (Create) = Passed** (CTXN-11787): กรอก Diagnosis (D-09) = "QA-AUTO-20261014-2154 Perfusionist" แล้ว Save สำเร็จ
        (flat-to-json=200, contribution=201) badge DRAFT ขึ้นทันที record ECMO Form เดิมยังอยู่ครบด้านล่าง (multi-select ไม่ทับกัน)
        ยืนยันซ้ำด้วย reload เต็มหน้าจริง ค่ายังถูกต้อง
      - **TC-040 (Edit) = Failed — ยืนยันตรงกับ baseline และบั๊กเดียวกับ ECMO Form (TC-036) เป๊ะ** (CTXN-11788): ช่อง Diagnosis
        ยังแก้ไขได้ปกติ (ไม่ disabled) **แต่ไม่มีปุ่ม Save ปรากฏเลยในหน้า** (ยืนยันด้วย `getByRole('button',{name:'Save'}).count()`
        = 0) พิมพ์ต่อท้าย " edited" แล้ว reload เต็มหน้าจริง: ค่ากลับไปเดิม ยืนยันว่าแก้ไขไม่ได้จริงผ่าน UI — สรุปว่าเป็นบั๊กของกลไก
        Custom Note ร่วมกัน ไม่ใช่เฉพาะ template ECMO
      - **TC-041 (Delete) = Not Test** (CTXN-11789): ไม่มีปุ่ม/เมนูลบจริงในระบบ (query ปุ่ม/ไอคอน delete/trash = 0) ตรงกับทุก
        template ก่อนหน้า (8 template ติดต่อกันที่ไม่มี delete function เลย)
      อัปเดต draft `.md` ครบแล้ว — **รวมทำเสร็จแล้ว 41/79 TC (10/19 template)**
- [x] **P16 — เทส template 11 OR Custom Note (TC-042–045)** (14 ต.ค. 2026)
      sub-tab Custom Note ของ OR-69-000222 ต่อจาก template 10 — เลือก "OR Custom Note" จากดรอปดาวน์ (ภาพ 103–107)
      - **TC-042 (Load) = Failed — ยืนยันตรงกับ baseline** (CTXN-11790): เลือก template ติ๊กถูกต้องในดรอปดาวน์ แต่ฟอร์มไม่ render
        เลย ขึ้น "ไม่สามารถแสดงฟอร์มได้" พร้อมลิงก์ "ดาวน์โหลดอีกครั้ง" — network ยืนยัน `GET /cortex-form/or-custom-note-v1.js?v=v2.2.4`
        = **404** (baseline เดิมคือ 503 ต่างกันแต่สรุปคือโหลดไม่สำเร็จเหมือนกัน อาจเปลี่ยนไปตาม deploy) กดลิงก์ retry แล้วยัง 404
        ซ้ำเหมือนเดิม (ยืนยันด้วย console error + network request 2 รอบ) ไม่ใช่ปัญหา transient
      - **TC-043/044/045 (Create/Edit/Delete) = Blocked** (CTXN-11791/11792/11793): ฟอร์มไม่เคย render เลยจึงไม่มีช่องให้กรอก
        ข้อมูล ลองกดปุ่ม Save ที่ยังปรากฏอยู่ (ทั้งที่ไม่มีฟอร์ม) แล้วไม่มีอะไรเกิดขึ้น (ไม่มี network request ใหม่ ไม่มี toast)
      บั๊กนี้ควรแจ้ง Dev ด่วน (ไฟล์ JS bundle หายจาก server ทำให้ทดสอบ 3 ใน 4 TC ของ template นี้ไม่ได้เลย) อัปเดต draft `.md`
      ครบแล้ว — **รวมทำเสร็จแล้ว 45/79 TC (11/19 template)**

- [x] **P17 — สร้างการ์ด Linear placeholder สำหรับ TC ที่เหลือทั้งหมด (TC-002 fix + TC-046–079 + Scenario EDG ใหม่) + sync draft `.md`** (19 ต.ค. 2026)
      user ขอ "สร้างข้ออื่นๆ เป็นการ์ดไว้ค่อยไปอัพเดทผลเทสทีหลังได้ไหม" — dispatch agent สร้างการ์ดจาก draft `.md` ที่ผ่าน Gate 1 แล้ว
      (สถานะ Not Run ทั้งหมด ไม่มีภาพหลักฐานเพราะยังไม่ได้ทดสอบจริง):
      - สร้าง Scenario ใหม่ **TS-CTXN-10711-EDG = CTXN-12003** (parent: EXE CTXN-10712) สำหรับ TC-078/079
      - สร้าง TC-046 ถึง 077 (32 ใบ, parent: Scenario HPY CTXN-10713) = **CTXN-11971 ถึง CTXN-12002**
      - สร้าง TC-078/079 (parent: Scenario EDG CTXN-12003) = **CTXN-12004, CTXN-12005**
      - **TC-002 ไม่ได้สร้างซ้ำ** — agent เจอว่ามีการ์ดอยู่แล้ว (**CTXN-10764**, สถานะ Passed จริง ทดสอบไปตั้งแต่รอบ template 1) ตรวจสอบแล้ว
        ถูกต้อง ไม่ใช่ gap ของงานนี้ — เป็นเพราะ draft `.md` ไม่เคย sync ผลจริงกลับไปตอนนั้น (แก้ในขั้นต่อไป)
      - อัปเดตการ์ดหลัก **CTXN-10711** (Requirement): เพิ่ม section "ผลการทดสอบ" เป็นตารางสรุปทั้ง 19 template (Load/Create/Edit/Delete
        + หมายเหตุ) พร้อมลิสต์บั๊กสำคัญ 5 อันดับ ตามที่ user ขอให้ "update detail การ์ดว่ามี template อะไรบ้าง เทสอะไรบ้าง ผลเป็นไง"
      - **sync draft `.md`**: เขียนสคริปต์ Python (`scratchpad/sync_linear_ids.py`) แทรก `การ์ด: CTXN-XXXXX` เข้าไปในบรรทัด Actual
        Result ของ TC-046–079 ทั้ง 34 ข้อ (verified ครบ ไม่มีข้อไหนหลุด) + เพิ่ม `การ์ด Linear: CTXN-12003` ใต้ heading ของ
        Scenario EDG + แก้ TC-002 จาก placeholder "ยังไม่ทดสอบ" เป็นผลจริง **Passed (CTXN-10764)** ที่ค้างมาตั้งแต่ P6
      สรุปความคืบหน้ารวม: **45/79 TC ทดสอบจริงแล้ว, สร้างการ์ดรอทดสอบอีก 34 TC + EXE/Scenario ครบทุกใบแล้ว**

- [x] **P18 — user ขอให้เอา Delete TC ที่ไม่มี delete feature จริงออกจาก scope ไปเลย (ไม่ใช่แค่ Not Test) + แก้ข้อผิดพลาดที่พบระหว่างทาง** (19 ต.ค. 2026)
      ระหว่างตอบคำถาม "เช็คแล้วหรือยังว่า template ไหนไม่มีปุ่มลบ" พบว่าตัวเองนับผิดในสรุปของ CTXN-10711 (เขียนว่า "7 ใน 7" ทั้งที่
      จริงคือ **6 ใน 6**: TC-005, 021, 025, 029, 037, 041 — อีก 5 template ที่เหลือใน 11 ที่ทดสอบไปแล้ว (009, 013, 017, 033, 045)
      ยังเป็น Blocked เพราะ Create ล้มเหลวก่อน ไม่เคยเช็คปุ่มลบจริง ไม่ควรนับรวม
      - user ยืนยัน: ให้ลบการ์ด Delete TC ทั้ง 6 ใบที่ไม่มี delete feature จริงออกจากระบบไปเลย และกฎนี้ใช้ต่อกับ template ที่เหลือด้วย
      - **เครื่องมือ Linear ที่มีไม่มี delete/archive issue tool จริง** (มีแค่ delete comment/customer/status-update) — ถามผู้ใช้
        ว่าจะทำยังไงแทน user เลือก: **เปลี่ยนสถานะเป็น `Canceled` (ไม่ใช่ `Not Test`) + แทรกหมายเหตุในการ์ดว่าควรลบออกจากระบบจริง
        รอผู้มีสิทธิ์ลบ**
      - เปลี่ยนสถานะ + แทรกหมายเหตุให้ครบทั้ง 6 ใบ: **CTXN-10774 (TC-005), CTXN-11769 (TC-021), CTXN-11773 (TC-025), CTXN-11777
        (TC-029), CTXN-11785 (TC-037), CTXN-11789 (TC-041)**
      - แก้ memory `feedback_delete_tc_not_test.md`: เพิ่ม "Update 2026-10-19" ระบุว่ากรณีนี้ (user ขอเอาออกจาก scope) ให้ใช้
        `Canceled` + หมายเหตุแทน `Not Test` ไปข้างหน้า (จนกว่าจะมี tool ลบ issue จริง)
      - แก้ข้อผิดพลาด "7 ใน 7" → "6 ใน 6" ในการ์ดหลัก CTXN-10711 — ระหว่างแก้พบว่า section "ความคืบหน้า" กับ "บั๊กสำคัญที่พบแล้ว"
        หายไปจากการ์ดหลังจาก patch รอบแรก (ไม่ทราบสาเหตุแน่ชัด อาจเป็น Linear editor ตัด bold/numbered-list ที่ติดกับ heading/table
        โดยไม่มี blank line คั่น) — แก้โดยเพิ่มกลับเป็น plain text ไม่มี bold นำหน้าทันทีหลัง heading และมี blank line คั่นก่อน
        numbered list เสมอ ยืนยันด้วย get_issue ว่ากลับมาครบแล้ว
      - sync draft `.md`: เพิ่มหมายเหตุ "สถานะใน Linear เปลี่ยนเป็น Canceled" ให้ครบทั้ง 6 TC ที่ได้รับผลกระทบ

- [x] **P19 — กลับมาทดสอบจริงต่อ template 12 Pre-Procedural Sedation Assessment (TC-046–049)** (19 ต.ค. 2026)
      user ยืนยันให้ทดสอบ 8 template ที่เหลือต่อให้เสร็จ (TC-046-077) — เช็ค Playwright session เดิมที่ค้างมาหลายวันแล้วพบว่า
      **ยังล็อกอินอยู่** (reload แล้วไม่หลุดไปหน้า login) helper `__markLoc`/`__unmark`/`__shotCounter` ยังอยู่ครบ ไม่ต้อง login ใหม่
      ไม่ต้องสร้าง operation ใหม่ ใช้ OR-69-000222 sub-tab Custom Note ต่อได้เลย (viewport หลุดเป็นขนาดเล็กกว่าเดิม ต้อง resize
      กลับเป็น 1920×1080 ก่อนเริ่ม) ทดสอบบน OR-69-000222 (ภาพ 108–115, วิดีโอ `11-pre-procedural-sedation-assessment.webm`)
      - **TC-046 (Load) = Passed** (CTXN-11971): ฟอร์ม render ทันที แสดง History/Physical Examination/Airway ครบตาม Expected
      - **TC-047 (Create) = Failed — ออร์ฟาน record เกิดขึ้นอีก 1 จุด ตรงกับ pattern TAH/TMH (TC-011/015)**: กรอก D-11 (History
        taking source=Patient, Past medical history Detail="QA-AUTO-20261019-1014 PreSed") แล้ว Save: network สำเร็จจริง
        (flat-to-json=200, contribution=201 **ครั้งเดียว** ไม่ซ้ำ 2 ครั้งเหมือน baseline) แต่ไม่มี badge DRAFT ขึ้น และ reload
        เต็มหน้าแล้ว dropdown กลับเป็น "Select form" ว่างเปล่า ไม่มีทางเข้าถึง record อีกเลย (ยืนยันด้วย `getByText(...).count()`
        = 0) ส่วน ECMO Form/NUH Perfusionist Form ที่บันทึกไว้ก่อนยังอยู่ครบ — ยืนยันว่าไม่ใช่บั๊กกลไก Custom Note ร่วมกัน แต่เป็น
        บั๊กเฉพาะ template นี้ (รายละเอียดต่างจาก baseline เดิมเล็กน้อย — ไม่มี duplicate contribution/toast error ชัดเจน
        อาจเพราะ deploy เปลี่ยนไปก่อน แต่ผลลัพธ์ fail เหมือนกัน)
      - **TC-048/049 (Edit/Delete) = Blocked** (CTXN-11973/11974): ไม่มี record ให้แก้ไข/ลบเพราะกลายเป็น orphaned ตั้งแต่ Create
      อัปเดต draft `.md` ครบแล้ว — **รวมทำเสร็จแล้ว 49/79 TC (12/19 template)**

- [x] **P20 — user ถามเรื่องคุณภาพการ์ด (CTXN-11636) หลังอ่านแล้วงง — แก้เป็นมาตรฐานถาวร + ทดสอบจริงต่อ template 13** (19 ต.ค. 2026)
      user ติง 3 เรื่อง: (1) การ์ด Failed ไม่สรุปเหตุผลชัด (2) Test Steps เขียน "ทำตาม Flow A ข้อ 1-3" อ้างไปการ์ดอื่น ไม่มีขั้นตอนจริง
      ในการ์ดเอง (3) ไม่มีวิดีโอแนบทุกใบ + ไม่มีภาพกรอบแดง(กรอก)/เขียว(ผลถูก) — ตรวจ CTXN-11636 ยืนยันทั้ง 3 ข้อจริง
      - dispatch background agent แก้ (1) Test Steps ของ 39 การ์ดที่ทดสอบจริงแล้ว (template 1-11, TC-001–045 ไม่รวม 6 ใบที่เป็น
        Canceled) ให้เขียนขั้นตอนตรงๆ ในการ์ดเอง ดึงจาก Actual Result ที่มีอยู่แล้ว ไม่อ้างอิง Flow ไปการ์ดอื่น (2) อัปโหลดวิดีโอ
        .webm ที่มีอยู่ในเครื่อง (10 ไฟล์ ครอบ 11 template) แนบเข้าทุกการ์ดในแต่ละ batch (reuse assetUrl เดียวกันข้าม TC ใน
        batch เดียวกัน ไม่ต้องอัปโหลดซ้ำ ไฟล์ใหญ่สุด 77MB) — สรุปผล: **39/39 การ์ดสำเร็จครบทั้ง Test Steps และวิดีโอ** ไม่มี
        fallback ต้องใช้ ตรวจสอบ spot-check ซ้ำเองอีก 2 ใบ (CTXN-11636, CTXN-11790) ยืนยันถูกต้องตรงตาม agent รายงาน
      - **เรื่องที่ 3 (ภาพกรอบแดง/เขียว) ยังไม่แก้ย้อนหลัง** เพราะต้องเทสซ้ำจริงในแอป มีค่าใช้จ่ายสูงเกินไปสำหรับ 45 TC ที่ทดสอบ
        ไปแล้ว — แจ้ง user ชัดเจนว่าจะใช้มาตรฐานนี้ (กรอบแดง=กรอก/กด, กรอบเขียว=ผลถูกต้อง) ต่อไปเฉพาะรอบทดสอบใหม่ (template 12
        เป็นต้นไป ที่ได้ทำอยู่แล้วในรอบนี้)
      - พบ cleanup เล็กน้อย: TC-001/002/004 ยังมีหมายเหตุเก่าชี้ไปดูวิดีโอที่ TC-003 (ตกค้างจากรอบ pilot) ซ้ำซ้อนกับวิดีโอใหม่ที่
        แนบให้แล้ว — แจ้ง user ไว้ ยังไม่ได้ลบ รอ user สั่ง
      - user ถามเพิ่มเติมว่าทำไม TC เยอะขนาดนี้ (79 ข้อ) — อธิบาย: 19 template × 4 การกระทำ (atomic, ตกลงกันไว้ตั้งแต่ Gate 1)
        + TC-002 validation + TC-078/079 เคสขอบ = 79 ยกตัวอย่างจริงที่ atomic granularity ช่วยจับบั๊กได้ละเอียดกว่า (เช่น
        Load ผ่านแต่ Create/Edit พังคนละจุด) เสนอว่าถ้า user อยากเปลี่ยนเป็น flow-style (1 TC/template) สำหรับ template ที่
        เหลือได้ ยังไม่ตัดสินใจ
      - **ทดสอบจริงต่อ template 13 Procedural Sedation Checklist and Assessment (TC-050–053)** บน OR-69-000222 (ภาพ 116–123)
        ใช้มาตรฐานใหม่ (กรอบแดง/เขียวทุกภาพ): **TC-050 (Load) = Passed** (CTXN-11975) — ฟอร์ม "Procedural Sedation Report"
        render ครบ · **TC-051 (Create) = Passed** (CTXN-11976) — กรอก Obstructed airway=No (D-12) Save สำเร็จ badge DRAFT ขึ้น
        ยืนยันด้วย reload (ต่างจาก TC-047 ที่ orphaned — template นี้ไม่มีปัญหาเดียวกัน) · **TC-052 (Edit) = Failed** (CTXN-11977)
        — เปลี่ยนเป็น Yes ได้แต่ไม่มีปุ่ม Save เลย (บั๊กเดียวกับ ECMO/Perfusionist พบใน 3/4 template ของ Custom Note) ·
        **TC-053 (Delete) = Canceled** (CTXN-11978) — ไม่มีปุ่มลบจริง ใช้กฎใหม่ (Canceled + หมายเหตุ) แทน Not Test ทันที
        อัปเดต draft `.md` ครบแล้ว — **รวมทำเสร็จแล้ว 53/79 TC (13/19 template)**

- [x] **P21 — ทดสอบจริงต่อ template 14 Sedation Form v2 (TC-054–057)** (19 ต.ค. 2026)
      ระหว่างทาง: ใช้ `browser_navigate` ตรงไป URL patient (ผิดกฎ Agent Notes ที่ห้ามไว้) ทำให้หน้าเด้งไปผิด operation/sub-tab
      แก้โดย navigate ใหม่ไปยัง URL เต็มที่ถูกต้องแทน — และพลาดอีกจุด: ตอนกรอก D-13 ครั้งแรก locator `input[type="time"]`
      แบบไม่ scope ไปจับ field "Time in" ของ record NUH Perfusionist Form ที่บันทึกไว้ก่อนหน้าแทนที่จะเป็นฟอร์มใหม่ (เพราะ
      หลาย record ซ้อนกันในหน้าเดียว) เจอจาก screenshot ตรวจสอบ รีบ reload ทิ้งทันทีก่อนจะมีผลกระทบใดๆ (ยืนยันว่าไม่มีการ save
      เกิดขึ้นเพราะไม่เคยกด Save) แล้วแก้โดย scope locator ด้วย `getByTestId('or-anes-custom-note-new-inline-form')` ทุกครั้ง
      ตั้งแต่นั้น — ทดสอบบน OR-69-000222 (ภาพ 124–130)
      - **TC-054 (Load) = Passed** (CTXN-11979): ฟอร์ม "Sedation Form v2" render ครบ ตาราง Time-based BP + Medication
        administration ตรงกับ D-13
      - **TC-055 (Create) = Failed — ยืนยันตรงกับ baseline เป๊ะ** (CTXN-11980): กรอก Time=10:00/BP systolic=120/BP
        diastolic=80 (D-13) แล้วกด Save: **ไม่มี network request ใดๆ เกิดขึ้นเลย** (listener ดัก POST ทั้งหน้า = ว่างเปล่า)
        ไม่มี toast/validation ใดๆ ยืนยันซ้ำด้วย reload เต็มหน้า: ไม่มี record เกิดขึ้นเลย (ECMO/Perfusionist/Procedural
        Sedation ที่บันทึกไว้ก่อนยังอยู่ครบ) — รุนแรงกว่าทุก template ที่เจอมา เพราะปุ่ม Save ไม่ทำงานอะไรเลยตั้งแต่ต้น
      - **TC-056/057 (Edit/Delete) = Blocked** (CTXN-11981/11982): ไม่มี record ให้แก้ไข/ลบเพราะ Create ล้มเหลวสนิท
      อัปเดต draft `.md` ครบแล้ว — **รวมทำเสร็จแล้ว 57/79 TC (14/19 template)**

- [x] **P22 — สร้าง `test-crud-flow.js`: CRUD automation สำหรับ NUH Operative Note (TC-011)** (20 ต.ค. 2026)
      user ขอเพิ่ม Load/Modify flow + กรอบสีรอบ field + video ต่อเนื่อง + dummy data auto-generated — flow: Create→Save→Reload→Modify→Save→Reload
      สร้างไว้ที่ `temp_scripts/test-crud-flow.js` — ผ่านครบ 15 steps:
      - Step 1–3: navigate + tab + select template (NUH Operative Note)
      - Step 3.5: `fillRequiredICD10()` — fill Pre/Post-operative Diagnosis Code ด้วย Z00→Z000 ผ่าน evaluate+focus+keyboard.type
        (shadow DOM workaround: Playwright locator .nth(i) หลุดหลัง Svelte re-render ต้องใช้ "first empty" loop แทน)
      - Step 4: fill 3 fields (2× contenteditable + participant name) ด้วย dummy text `QA-TC011-[timestamp]`
      - Step 5–7: screenshot (red banner), Save, reload
      - Step 8–9: verify data persisted + screenshot (green banner) — template re-select ถ้าไม่ persist
      - Step 10–12: modify (append " - MODIFIED"), screenshot (blue banner), Save
      - Step 13–15: reload, verify modified data persisted, screenshot (purple banner)
      หลักฐาน: `temp_scripts/crud-flow-evidence/` (4 screenshots + 1 video `tc011-flow.webm` + result JSON)
      ตรวจสอบ: all steps [OK], no failures — video recorded, data persisted both create and modify rounds

