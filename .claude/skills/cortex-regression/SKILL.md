---
name: cortex-regression
description: ขั้นตอนทำรอบ Regression ของ Cortex HIS ตามไฟล์ {Site}_Regression_v{X}.xlsx (Master Regression Template ของทีม QA — ชีต E2E core flow / Cards / Card Test Cases / Dashboard / Regression Plan) ในโปรเจกต์ "Cortex Automate" — เตรียมรอบ Day 0 (ดึงการ์ดจาก Linear ที่ Release + การ์ด regression-fail รอบก่อน ลงชีต Cards / Map Scenario / Card Test Cases), รัน Scenario E2E core flow ด้วย Playwright เก็บภาพ + คลิป, ลงผลในไฟล์ Excel โดยไม่ทำสูตร / กราฟพัง, ส่ง Bug ตาม Case A/B/C และสรุปสถานะ / Release Decision (NO-GO / READY) รายวัน. ใช้เมื่อผู้ใช้พูดว่า "Regression", "รอบ Regression", "ไฟล์ Regression", "SBH_Regression", "E2E core flow", "SMK-OPD / SMK-IPD", "ลงผล Regression", "เตรียม Day 0", "ดึงการ์ดเข้า Cards", "Release Decision", "NO-GO", "สรุปสถานะ Regression", "อัปเดตสถานะใน Group Chat" หรือส่งไฟล์ Regression .xlsx มา. ต้องโหลดสกิล cortex-automate คู่กันเสมอ (กฎทั้งหมดอยู่ที่นั่น) และ cortex-card-test เมื่อรัน TC ของการ์ด. ไม่ใช่สำหรับทดสอบการ์ดเดี่ยวนอกรอบ Regression (cortex-card-test) หรือ Mock Data UAT
---

# รอบ Regression ตามไฟล์ {Site}_Regression_v{X}.xlsx

สกิลนี้เกิดจากคำสั่งผู้ใช้ 22 ต.ค. 2026: "อยากให้คุณช่วยสร้าง Skill สำหรับ Regression … เริ่มจากศึกษาการทำงานของไฟล์ SBH_Regression_v2.8.0"
กฎของโปรเจกต์ (R1–R64 …) · ความรู้หน้าจอ · คำสั่งรัน อยู่ในสกิล `cortex-automate` — **โหลดก่อนเริ่ม** ทำตามนั้นเมื่อขัดกับไฟล์นี้ · แจ้งสถานะเป็นระยะ (R44) · บอกก่อนแตะ Prod ทุกครั้ง (R31)
โครงไฟล์ · ทุกคอลัมน์ · Dropdown · ตรรกะสูตร อยู่ที่ [references/workbook-map.md](references/workbook-map.md) — อ่านเมื่อต้องกรอกช่องที่ไม่คุ้น
งานจบแล้วมีอะไรเปลี่ยน (ขั้นตอน / กับดัก / คำตอบผู้ใช้) → แก้ไฟล์นี้ + ลงประวัติท้ายไฟล์

---

## คำตอบของผู้ใช้ที่ใช้อยู่ (22 ต.ค. 2026)

| เรื่อง | คำตอบ |
|---|---|
| ขอบเขตสกิล | ครบ 4 ส่วน: ลงผลในไฟล์ Excel · รัน E2E core flow ด้วย Playwright · เตรียมรอบ Day 0 · สรุปสถานะ / Release Decision |
| วิธีแก้ไฟล์ Excel | **"เขียนลงไฟล์ตรง"** — ด้วย `scripts/reg-write.mjs` (แก้ XML เฉพาะเซลล์ · สำรองไฟล์ก่อนทุกครั้ง) แล้วให้ผู้ใช้เปิด Excel ตรวจ |
| ระบบที่รัน Regression v2.8.0 | **SBH Prod** (`.env.sbh-prod`) — การสร้างข้อมูลบน Prod (ผู้ป่วย / Visit / Order / ชำระเงิน) ยังต้องถามรายละเอียดก่อนรันครั้งแรก (ดู "เรื่องที่ยังต้องถาม") |
| ชื่อ Tester ของผู้ใช้ | **James** (คอลัมน์ U ของ E2E · G ของ Card Test Cases) |
| OPD Walk-in (23 ต.ค. 2026) | **คำขอ Walk-in → พยาบาลคัดกรองจากปุ่ม "แบบคัดกรอง" → ลงตาราง** (ระบบเช็คอินให้) — ไม่ผ่านแท็บ รอเช็คอิน / ปุ่ม Check In |
| เก็บ Specimen OPD | **เก็บหลังเช็คอินที่ห้องแล็บ** (SMK-OPD-006) — พยาบาลคลินิกไม่เก็บ (OPD-004 = ตรวจ Order + แจ้งชำระเงิน) |
| ผล Lab | ควรมาจาก LIS แต่**ยังไม่เชื่อม LIS → ห้องแล็บลงผลเอง** |
| สิทธิของรอบ Regression | **UC / เงินสด** ไปก่อน (ไม่ใช้กรมบัญชีกลาง) |
| ฉลากยา OPD | **พิมพ์อัตโนมัติตอนสร้างใบยา** (ไม่ใช่หลังชำระเงิน) |
| วิธีหาการ์ดลงชีต Cards (23 ต.ค. 2026) | Linear ทีม **SBH** · Label **`VERSION <x.y.z>`** (กลุ่ม 🐷VERSION) · **เฉพาะการ์ดหลัก (ไม่ใช่ Sub-issue)** · **เฉพาะที่ Dev เริ่มทำแล้ว** = statusType `started` / `completed` (ไม่เอา backlog / unstarted / triage — Todo · On Hold · Blocked · Need Draft Solution) · ไม่เอา Won't do / Canceled / Duplicate · แถวตัวอย่าง XXX-… เขียนทับ / ล้างออก · C = Assignee · F = Priority ของ Linear (No priority เว้นว่าง) · `list_issues` ใส่ `fields` ให้น้อย (ผล > 90 KB ถูกตัดลงไฟล์) แล้วขอ `statusType` แยก |
| IPD ที่พักไว้ | **M = Out of Scope ไว้ก่อน** (23 ต.ค. 2026) — ไม่นับใน Release Decision / เกณฑ์ผ่าน · เปลี่ยนกลับเมื่อผู้ใช้ยืนยัน Flow IPD |

## เครื่องมือ (รันที่โฟลเดอร์โปรเจกต์)

| สคริปต์ | ใช้ทำ |
|---|---|
| `node .claude/skills/cortex-regression/scripts/reg-status.mjs "<ไฟล์>"` | รายงานเต็ม: Release Decision · Risk · เกณฑ์ผ่าน · ทุก Scenario / การ์ด / TC · Blocking · Tester · **ปัญหาการกรอก** · `--chat` = ข้อความ Update รายวัน · `--json` |
| `node .claude/skills/cortex-regression/scripts/reg-write.mjs "<ไฟล์>" "<changes.json>" [--dry-run] [--allow-locked]` | ลงผล (รูปแบบ changes.json อยู่หัวไฟล์สคริปต์) — ตรวจ Dropdown · ปฏิเสธช่องสูตร / ช่องเทา · ช่อง L (E2E) และ F / H (Cards) ล็อกหลัง Day 0 ต้อง `--allow-locked` · ผิดข้อเดียว = ไม่เขียนเลยทั้งชุด · สำรองไว้ `<โฟลเดอร์ไฟล์>/_backup/` (เก็บ 20 ไฟล์ล่าสุด) |
| `& ".claude\skills\cortex-regression\scripts\reg-excel.ps1" -File "<ไฟล์>" [-Save]` (PowerShell) | เปิดด้วย Excel ซ่อนหน้าต่าง คำนวณใหม่ทั้งไฟล์ อ่าน Dashboard · `-Save` = บันทึกให้ค่า cache เป็นปัจจุบัน (Grand Dashboard ดึงผ่าน link) |

- `reg-status` คำนวณเองจากช่องที่กรอก (ตรรกะเดียวกับสูตร — ตรวจเทียบกับ Excel จริงแล้ว 22 ต.ค. 2026 ตรงทุกค่า) จึงใช้ได้ทันทีหลัง `reg-write` โดยไม่ต้องเปิด Excel
- **ห้ามเขียนไฟล์นี้ด้วย exceljs / openpyxl / pandas** — กราฟ 9 อันหาย สูตร FILTER / LET พัง · อ่านด้วย exceljs ได้ (สคริปต์ใช้อยู่)
- ไฟล์อยู่ใน OneDrive: ผู้ใช้เปิดค้างใน Excel → `reg-write` หยุดเอง (เจอ `~$…` / ไฟล์ถูกล็อก) ให้บอกผู้ใช้ปิดก่อน · หลังเขียนทุกชุดรัน `reg-excel.ps1 -Save` (ถ้าผู้ใช้ไม่ได้เปิดไฟล์อยู่) แล้วบอกให้ผู้ใช้เปิดตรวจ

## กฎการกรอกจาก README ของไฟล์ (ใช้ทุกครั้ง)

- ช่องเทา = สูตร ห้ามพิมพ์ทับ: E2E G R W Y Z + D4–D6 · Cards G L–S · Card Test Cases C D · Dashboard ทั้งหมดยกเว้นหัวข้อ 4 (แถว 96) และ 5 (Risk Log 105–124)
- เพิ่มแถว = ต่อท้ายแถวว่างถัดไป (ห้ามแทรกกลาง) · ช่วงสูตรถึงแถว 1000
- M (Execution Status) ใช้แค่สถานะการทำงาน — **ห้ามใส่ Passed / Failed** · ผลคุณภาพดูที่ W
- เจอ Bug: ใส่ O (ทุก ID คั่น `,`) + P Severity + Q Impact + S Root Cause · M ยัง `Done` ได้ (W จะเป็น Failed / Conditionally Passed เอง)
- `Fixed – Retest Passed` เมื่อผ่าน Direct Fix + Impact Area 1–2 Use Cases ของ**ทุก** ID แล้วเท่านั้น (เขียน Impact Area ใน X)
- Blocked ต้องมีเหตุผลใน X · V เป็นวันที่ yyyy-mm-dd
- Card Result (Cards J) เป็นของ QA Site ตัดสิน: Claude **เสนอ** จาก E2E Status + ผล TC แล้วให้ผู้ใช้ยืนยันก่อนเขียน · `Passed with Known Issue` ต้องมีชื่อ QA Lead ที่ยืนยันใน K
- Priority (E2E L · Cards F) และ TOR (Cards H) กรอกครบใน Day 0 แล้วล็อก · เปลี่ยนภายหลังได้เมื่อ PO อนุมัติ (ใส่เหตุผลใน Remark)
- ห้ามเปลี่ยนชื่อไฟล์ / ชื่อชีต · ห้ามแตะชีต Dashboard Feed · ห้ามแก้ไฟล์ของ Version เก่า

---

## ลำดับงาน

ผู้ใช้สั่งส่วนไหน ทำส่วนนั้น — ทุกส่วนเริ่มด้วย `reg-status.mjs` ดูสถานะไฟล์ก่อน แล้วสรุปให้ผู้ใช้ 2–3 บรรทัด

### A) เตรียมรอบ Day 0

1. **ไฟล์ของรอบ**: Version ใหม่ = Clone `Master_Regression_Template.xlsx` เป็น `{Site}_Regression_v{X}.xlsx` (ผู้ใช้ทำ / ส่งไฟล์มา — โปรเจกต์มีแค่ไฟล์ SBH v2.8.0 ที่ `Regression/`) · หัวไฟล์ E2E B1 (Project / Site) · B3 (Version) ต้องไม่เป็น Placeholder · B4 = Environment ของรอบ
2. **ดึงการ์ดจาก Linear** (อ่านอย่างเดียว):
   - การ์ดที่ Release ใน Version นี้ — **ยังไม่รู้ว่าทีมระบุด้วยอะไร** (Release / Label / Cycle / Project — 22 ต.ค. 2026 ค้น Linear แล้วยังไม่มี Release หรือ Label ชื่อ v2.8) → ถามผู้ใช้ครั้งแรก แล้วจดคำตอบในตารางท้ายไฟล์
   - การ์ด Label `regression-fail` + Label Version ก่อนหน้า → ใส่ I = Version นั้น และเขียน TC Retest
   - ลง Cards: A Card ID · B Title · C Owner (Assignee) · F Card Priority จาก Linear (Urgent/High/Medium/Low · No priority = เว้นว่างแล้วแจ้งผู้ใช้) · H TOR **ถามผู้ใช้** (QA Site ระบุ — ว่าง = นับเป็น TOR)
   - E Map to Scenario ID: Claude **เสนอ** จากเนื้อหาการ์ดเทียบ C/D/E ของ Scenario (Module · ขั้นตอน) เป็นตารางให้ผู้ใช้ยืนยันก่อนเขียน
3. **Card Test Cases**: TC ของการ์ดอยู่ใน Sub-Issue (EXE → SC → TC) — ไม่มีให้ร่างด้วยสกิล `linear-testcase-writer` (Run Type `RG`) · ลงแถว: A `TC-{Site}-{เลขการ์ด}-001` · B Card ID · E ชื่อ TC ย่อ (Step / Expected อยู่ใน Linear ไม่ต้องลอก)
4. **E2E**: เช็คว่า L (Flow Priority) ครบทุกแถว — ว่างให้ถาม QA Site / BA (`reg-write --allow-locked` ใน Day 0) · Module (B) ตรงกับ Ownership Matrix
5. **Linear Setup**: Label `regression-fail` + Label Version (`v{X}`) ต้องมีในทุก Team ของ Site ก่อน Day 1 — ยังไม่มี (22 ต.ค. 2026) · **การสร้าง Label เป็นการเขียน Linear ต้องถามผู้ใช้ก่อน**
6. Environment Sign-off (Dashboard แถว 96) เป็นของ SRE / Dev / QA Lead — Claude กรอกเมื่อผู้ใช้บอกค่ามาเท่านั้น
7. จบด้วย `reg-status.mjs` → ส่วน "ปัญหาการกรอก" ต้องเหลือแต่ข้อที่ผู้ใช้รับรู้แล้ว

### B) รัน Scenario E2E core flow ด้วย Playwright

1. อ่าน Scenario (C / D / E Steps / F Test Data / H Expected) ทีละแถวที่จะรัน · Expected แต่ละบรรทัด (`- …`) = 1 จุดตรวจ + ภาพหลักฐาน
2. Scenario ของ Module เดียวกันต่อกันเป็นเส้นเดียว → ใช้ผู้ป่วยรายเดียวไล่ทั้งเส้น (ลำดับแถวจัดใหม่ 23 ต.ค. 2026 ตามผู้ใช้สั่ง):
   - **OPD** (แถว 15–25): 001 ลงทะเบียน → 002 คัดกรอง → 003 แพทย์ตรวจ / สั่ง → 004 พยาบาลตรวจ Order → 005 การเงิน (Lab / X-ray) → 006 Lab → **007 X-ray** → 008 แพทย์แจ้งผล + นัด + ใบรับรองแพทย์ → 009 พยาบาลจำหน่าย → ห้องยา → ชำระ → จ่ายยา → การเงินปิด Visit · **010 Refer out** (พยาบาลจำหน่าย By Transfer + เอกสารส่งต่อ + MOPH Refer · ผู้ป่วยอีกรายที่ผ่าน 001–003) · **011 Refill** (แผนเติมยา → พิมพ์ใบ Refill → Task → รอบถัดไปด้วย Visit "รับยาต่อเนื่อง (Refill)" · ผู้ป่วยอีกราย)
   - **ER** (แถว 26–31): ER-001 ลงทะเบียน / เปิด Visit ER → 002 Triage + บอร์ดโซน → 003 แพทย์ Acknowledge + Note + One Day Order → 004 งานพยาบาล + Nursing Records + คัดกรองซ้ำ → 005 Disposition กลับบ้าน → ใบยา → ชำระ → จ่ายยา → ปิด Visit · ER-006 ESI 5 ส่งต่อ OPD (ผู้ป่วยอีกราย)
   - **ADM-001** (แถว 32): ER → Admit Request → AN → หอผู้ป่วย (ผู้ป่วยอีกรายที่ผ่าน ER-001–003) — ขั้นศูนย์จัดการเตียงยังไม่ได้สำรวจ
   - **IPD** (แถว 33–45): **พักไว้ — ไฮไลต์สีเทา + X "Flow ยังไม่ชัดเจน" + M = Out of Scope** (ผู้ใช้สั่ง 23 ต.ค. 2026) ไม่รันจนกว่าผู้ใช้สั่ง · สีเทานี้ไม่ใช่ช่องสูตร (เขียนได้)
   - การ์ดที่ไม่มี Scenario รองรับ → **เทสผ่าน TC ของการ์ดในชีต Card Test Cases** (ผู้ใช้สั่ง 23 ต.ค. 2026: CPR SBH-2530 · เหตุการณ์หมู่ SBH-2470 · Compound SBH-2245 / 2246 / 2247) — E ว่าง = Pending Mapping ไม่ทำให้ NO-GO (Release Decision ดู Card Result) · ห้าม Map กับ Scenario ที่ไม่ได้ใช้ฟีเจอร์ของการ์ดจริง
3. โครงที่วางไว้ (ยังไม่ได้สร้าง — สร้างตอนรันครั้งแรกหลังผู้ใช้ตอบเรื่องข้อมูลบน Prod):
   - spec: `tests/regression/SMK-<MODULE>.spec.ts` · `test.describe.serial` 1 `test()` ต่อ 1 Scenario ชื่อ `SMK-OPD-001 <ชื่อ Scenario>` · tag `@regression @SMK-OPD-001` · step `SMK-OPD-001 ขั้น [n] …` ตามเลข [n] ในคอลัมน์ E
   - config: `playwright.sbh-prod.regression.config.ts` = `buildConfig({ env: 'sbh-prod', testDir: './tests/regression' })` · import `test` จาก `mock-data/fixtures` (กันไฟล์แอปโหลดไม่ผ่านบน Prod) · กัน config dev-x ไม่ให้เก็บ `tests/regression` ไปรันด้วย (`testIgnore`)
   - **อย่าตั้งโฟลเดอร์ `regression/` ที่ราก** — Windows ไม่แยกตัวพิมพ์ จะชนกับ `Regression/` ที่เก็บไฟล์ Excel
   - คลิป 1 ไฟล์ต่อ 1 Scenario (`startClip(page, 'SMK-OPD-001')` — แนวเดียวกับ R61) · ภาพ `checkStep` / `snapEvidence` ทุก Expected (กรอบห้ามบัง Expected — R59)
4. ของที่ใช้ซ้ำได้แล้ว (ตรวจชื่อจริงก่อนใช้):

   | Scenario | helper ที่มี |
   |---|---|
   | OPD-001 ลงทะเบียน / เปิด Visit | `helpers/functions/reception.ts` (fillNewPatientForm · saveNewPatient · openNewVisitPanel) · `mock-data/uat-er.ts` (openOpdVisit · addCoverageFirst · nextPrefixedPatient) |
   | OPD-002 เช็คอิน / คัดกรอง / ลงตารางแพทย์ / พร้อมตรวจ | `opd-activity.ts` (selectOpdUnit · checkInFromOpdList) · `uat-er.ts` (checkInOpdVisit · scheduleWalkInRequest) · setVisitStatus ใน `mock-data/UAT-OPD-refer.spec.ts` |
   | OPD-003 แพทย์สั่ง Order | `opd-activity.ts` (orderFromOpdPanel) · `uat-play.ts` (addMedicineToCart) · `uat-er.ts` (submitOrders) · `cpoe-usage.ts` |
   | OPD-004 พยาบาลรับงาน | `opd-activity.ts` (gotoActivityTaskList · runActivityTaskAction) · `uat-er.ts` (fetchNurseTasks · acceptNurseTask) |
   | OPD-005 / 009 การเงิน · จำหน่าย · ใบยา · ปิด Visit | `cashier.ts` (closeCoverageWithEndpoint — End Point เลขสุ่ม R62 · payAllInCash · closeVisitAtCashier) · `uat-er.ts` (createPrescription) · ขั้นรับยาใน `UAT-OPD-refer.spec.ts` · Nurse จำหน่าย / ห้องยา / การเงินใน `mock-data/bizsim-opd.ts` (dischargeStep · pharmacyStep · paymentStep) |
   | OPD-007 X-ray · OPD-008 นัด / ใบรับรองแพทย์ | ห้องรังสีใน `bizsim-opd.ts` (APM-OPD-002 · บันทึกผลรังสีบน Prod 500 บั๊ก No.54) · `createAppointment` (bizsim-opd) · `createMedicalCertificate` (uat-play) |
   | ER-001–006 · ADM-001 | `UAT-ER-orders.spec.ts` (ER ครบเส้นถึงปิด Visit) · `er.ts` / `er-triage.ts` / `er-disposition.ts` / `er-list.ts` / `er-nursing-records.ts` · `uat-er.ts` (acceptNurseTask · savePhysicianNote · submitOrders) · ESI 5 ส่งต่อใน `UAT-ER-play-b.spec.ts` (UAT-ER-05) · Admit `er-admit.ts` (createAdmitRequest · createAdmissionWithoutBed) |
   | OPD-006 Lab | ยังไม่มี — สำรวจหน้าจอก่อน (เทสชั่วคราวอ่านอย่างเดียว ตาม cortex-card-test ข้อ 5) |

5. รัน**เปิดจอทีละ Scenario** (`--headed --grep @SMK-OPD-001`) บอกผู้ใช้ก่อนแต่ละรอบว่าจะสร้างอะไรบน Prod แล้วรายงานผลทันทีก่อนรันข้อถัดไป (R31) · คัดลอกหลักฐานออกทันทีด้วย `collect-evidence.mjs` ของ cortex-card-test ไป `clips/Regression v{X} SBH Prod <วันที่>/SMK-OPD-001/`
6. ขั้นที่ automate ตรวจไม่ได้ (พิมพ์กระดาษจริง · เสียงเรียกคิว) → ตรวจส่วนที่ทำได้ เขียนใน N ว่าตรวจถึงไหน แล้วถามผู้ใช้ว่าลง Done หรือไม่ (แนวเดียวกับ R42)
7. เทส fail → อย่าเพิ่งสรุปว่าระบบผิด: ดู `references/fail-diagnosis.md` ของ cortex-automate · ตรวจซ้ำแล้วว่าเป็นบั๊กจริงค่อยไปข้อ D

### C) ลงผลในไฟล์

1. รวมผลเป็น `changes.json` ใน scratchpad (รูปแบบอยู่หัว `reg-write.mjs`) — ต่อ Scenario ที่รันแล้ว:
   - ผ่าน: M `Done` · N สิ่งที่เห็นจริงสั้นๆ (HN / VN / เลขเอกสาร · ผล Expected ทีละข้อ) · U `James` · V วันที่รัน · X `Playwright (SBH Prod) · หลักฐาน clips/…`
   - เจอบั๊ก: M `Done` + O / P / Q / S (P / Q ถามผู้ใช้ถ้าไม่ชัด — กำหนด Bug Priority / Release Gate) · N อาการ
   - ไปต่อไม่ได้ (ข้อมูล / Env / ขั้นก่อนหน้าพัง): M `Blocked` + X เหตุผล
   - Card Test Cases: F ผล · G `James` · H วันที่ · I Sub-issue ID เมื่อ Failed · J อาการ
2. `--dry-run` ก่อน → แสดงตาราง "ช่อง: ค่าเดิม → ค่าใหม่" ให้ผู้ใช้เห็น → เขียนจริง → `reg-excel.ps1 -Save` → `reg-status.mjs` สรุปผลหลังลง
3. แก้ผลที่ผู้ใช้ / คนอื่นลงไว้แล้ว (ค่าเดิมไม่ว่าง และไม่ใช่ของรอบนี้ของ Claude) → ถามก่อนทับ

### D) ส่ง Bug และ Retest (README หัวข้อ 8)

| กรณี | ทำอะไร |
|---|---|
| A — Bug ของการ์ดที่ Release รอบนี้ | Sub-issue ใต้การ์ด (Board ของ Site) · Label `regression-fail` + `v{X}` · ใส่ ID ใน Card Test Cases I (หรือ E2E O ถ้าเจอจาก Scenario) · Card Result = Passed with Known Issue หรือ Failed |
| B — การ์ดที่ Release แต่เทสไม่ทัน | Card Result = Not Tested · ติด Label `regression-fail` + `v{X}` ที่การ์ดเดิม (รอบหน้าดึงเข้า Cards พร้อม I = v{X}) |
| C — Bug ที่ไม่มีการ์ด (เจอจาก E2E) | Issue ใน Team ของ Site · Assign PO / BA ของ Site (ดู Ownership Matrix) · Label `regression-fail` + `v{X}` · ใส่ ID ใน E2E O |

- Title `[Regression] {Module / Feature} - {อาการ}` · Description: Scenario ID / TC ID · Steps · Expected / Actual · Evidence (ภาพ + คลิป ตามวิธีอัปโหลดของ cortex-card-test ข้อ 7)
- **สร้าง / แก้ Issue · Label · สถานะ บน Linear = ถามผู้ใช้ก่อนทุกครั้ง** (ส่งร่าง Title / Description / Label / Assignee ให้ดูก่อน)
- Retest: Blocking ภายในวันเดียวกันหลัง Dev แจ้ง Deploy · อื่นๆ ภายใน 2 วันทำการ · ผ่าน Direct Fix + Impact Area 1–2 Use Cases → T = `Fixed – Retest Passed` + X บันทึก Impact Area · ไม่ผ่าน = คง Open แล้วตีกลับตั๋ว
- "New Cortex" ไม่รับ Bug แล้ว — ใช้เก็บ Evidence ของ TC / การ์ดรอบ Regression / Regression Report เท่านั้น

### E) สรุปสถานะ / Release Decision

- รายวัน: `reg-status.mjs "<ไฟล์>" --chat` → ข้อความ Update สำหรับ QA Group Chat (ให้ผู้ใช้ส่งเอง — Claude ไม่ส่งออกไปไหน)
- เมื่อถาม "ปล่อยได้ไหม": บอก Release Decision + เหตุผล NO-GO ทีละข้อ + Blocking List + เกณฑ์ผ่าน 4 ข้อ + Risk Level · ตัวเลขทางการคือ Dashboard ใน Excel (รัน `reg-excel.ps1` ยืนยัน)
- ไทม์ไลน์ของรอบ (README หัวข้อ 9): Day 0 Priority / TOR ครบ + Linear Label · ก่อน Day 1 Environment Sign-off ครบ 5 ช่อง · **Fix Cut-off Day 4 12:00** · Blocking ค้างหลัง Cut-off → ขอ CF ใน Group Chat Day 5 09:30 · ทวง 13:00 · เส้นตาย 15:00 (ไม่ตอบ = ไม่อนุมัติ) → Risk Log แถว CAB · Deferrable → PO / BA ทำ Risk Acceptance → Risk Log แถว PO (Pending Risk Acceptance ต้องเป็น 0) · **Release Decision Day 5 17:00** (Comment "Approved" บนการ์ด Release: PM · PO · QA Lead · Dev Lead)
- Bug ค้างครบ 2 รอบ Regression → รอบที่ 3 PO ปรับ Priority ขึ้น 1 ระดับ

---

## เรื่องที่ยังต้องถาม (ถามครั้งแรกที่ถึงขั้นนั้น แล้วย้ายคำตอบขึ้นตาราง "คำตอบของผู้ใช้")

| เรื่อง | ถามตอน | หมายเหตุ |
|---|---|---|
| E2E B4 (Tested Environment) | ก่อนลงผลชุดแรก | ไฟล์ตั้ง `demo-x` แต่รันบน SBH Prod · Dropdown มีแค่ `demo-x, stg-tmh, stg-sbh, stg-nuh` (ไม่มี SBH Prod) |
| ข้อมูลบน Prod | ก่อนรัน Scenario ครั้งแรก | ผู้ป่วยกี่ราย · ชื่อ (แบบ R31 / R63 เช่น `UAT` + `REG-<ลำดับ>`?) · สิทธิ / คลินิก / แพทย์ · ปิด Visit ท้ายเส้นไหม · Lab / X-ray / ยา รหัสอะไร · IPD ใช้เตียงจริงได้ไหม (R30) |
| สร้าง Label `regression-fail` / `v{X}` | Day 0 | เขียน Linear |
| หลักฐานไปไว้ที่ไหน | หลังรันชุดแรก | ลิงก์ใน X อย่างเดียว / แนบ Linear / New Cortex |
| เก็บไฟล์ Regression ใน git ไหม | ตอน commit ครั้งแรก | ตอนนี้ `Regression/` ยังไม่ขึ้น git · `_backup/` ไม่ควรขึ้น |
| ADM-001 จองเตียงจริงบน Prod ได้ไหม / ER flow เพิ่ม (Refer เข้า MOPH · เหตุการณ์หมู่ · CPR) | ก่อนรัน ER / ADM | R30 ห้ามเลือกเตียงเป็นกฎของเทสการ์ด — Regression ยังไม่ได้ตกลง |

## กับดัก

- ค่าที่สูตร cache ไว้ในไฟล์เก่าจนกว่า Excel จะคำนวณ — อ่านด้วย exceljs หลัง `reg-write` จะได้ค่าเก่า (ใช้ `reg-status` ที่คำนวณเอง หรือ `reg-excel.ps1`)
- `Fixed – Retest Passed` ใช้ขีดยาว (–) ไม่ใช่ขีดสั้น — พิมพ์ผิด = สูตรมองว่ายังเปิด
- Cards E จับคู่แบบ partial ไม่สนตัวพิมพ์ — Scenario ID เลขไม่เท่ากันจะผูกการ์ดผิดแถว (`reg-status` เตือน)
- O มีหลาย ID → Risk Log จับ CF ไม่ได้ (จับคู่ทั้งช่อง)
- `.ps1` ที่มีภาษาไทยต้องบันทึกเป็น UTF-8 **มี BOM** — PowerShell 5.1 อ่านไม่มี BOM เป็น ANSI แล้ว parse พัง
- Excel COM เพิ่งเปิดไฟล์ใหญ่จะปฏิเสธคำสั่ง (`RPC_E_CALL_REJECTED`) — `reg-excel.ps1` ลองใหม่ให้แล้ว
- README บอกว่าชีตถูก Protect แต่ไฟล์จริงไม่ได้ Protect — อย่าพึ่งการล็อกของ Excel กันช่องสูตร
- แถวใหม่ (เกินแถวที่ Template ใส่ข้อมูลตัวอย่าง) มีแค่เซลล์สูตร — `reg-write` ใช้สไตล์ของแถวข้อมูลแรกกับเซลล์ใหม่ให้แล้ว (ตัดบรรทัด / ขอบ) แต่เซลล์เดิมบางช่องไม่ตัดบรรทัด (เจอ E24 · X ทั้งคอลัมน์) → หลังเขียนข้อความยาวให้ตั้ง WrapText + AutoFit ความสูงแถวผ่าน Excel (ตัวอย่างสคริปต์ทาสี / AutoFit: ทำผ่าน Excel COM แล้ว `Save` — กราฟยังครบ 9)
- ไฟล์เปิดค้างใน Excel ของผู้ใช้ผ่าน OneDrive จะไม่มีไฟล์ `~$…` ในโฟลเดอร์ (เปิดเป็น URL `d.docs.live.net`) แต่เขียนไม่ได้ (EBUSY) → ดูด้วย `GetActiveObject('Excel.Application').Workbooks` แล้วให้ผู้ใช้ปิดก่อน
- Module ใหม่ต้องเพิ่มชื่อในชีต Ownership Matrix คอลัมน์ A ด้วย (Dashboard B200 ดึงรายชื่อ Module จากที่นั่น) — `reg-write` เขียนชีตนี้ได้แล้ว (A · B · C · E–I)

---

## ประวัติ

- 2026-10-22 — สร้างสกิล: ศึกษา `Regression/SBH_Regression_v2.8.0.xlsx` ครบ 8 ชีต (README · Regression Plan · Dashboard · E2E core flow 21 Scenario SMK-OPD-001–008 / SMK-IPD-001–013 · Cards / Card Test Cases ยังเป็นตัวอย่าง XXX-001/002 · Ownership Matrix · Dashboard Feed) · ผู้ใช้ตอบ: ขอบเขตครบ 4 ส่วน · เขียนไฟล์ตรง · SBH Prod · Tester James · เขียนสคริปต์ `reg-lib` / `reg-status` / `reg-write` / `reg-excel.ps1` · ทดสอบบนสำเนาใน scratchpad: เขียน 26 ช่อง (E2E / Cards / TC แถวใหม่ / Dashboard / Plan) → Excel เปิดไม่ต้องซ่อม · กราฟครบ 9 · ค่า Dashboard ที่ Excel คำนวณตรงกับ `reg-status` ทุกค่า · ตัวกันช่องล็อก / ค่านอก Dropdown ทำงาน · ยังไม่ได้แตะไฟล์จริง ยังไม่ได้เขียน spec Regression
- 2026-10-23 — ผู้ใช้ให้ประเมินความครอบคลุมของ E2E แล้วสั่ง 5 ข้อ → เขียนไฟล์จริงครั้งแรก (สำรอง `_backup/SBH_Regression_v2.8.0.20261023-223056.xlsx`): เพิ่ม SMK-ER-001–006 + SMK-ADM-001 · OPD X-ray เป็น SMK-OPD-007 (ข้อเดิม 007 / 008 เลื่อนเป็น 008 / 009 · การ์ดตัวอย่าง XXX-002 ผูก OPD-009) · IPD ย้ายท้าย (แถว 31–43) ทาสีเทา D9D9D9 + X "Flow ยังไม่ชัดเจน" · แก้ OPD ที่รู้แล้ว (สถานะ "พร้อมตรวจ" / "ตรวจเสร็จ" · ขั้นนัด + ใบรับรองแพทย์ · ขั้นเก็บแล้ว / รับแล้ว ของ Lab · พยาบาลจำหน่าย · การเงินปิด Visit แทนปิดอัตโนมัติ · คำผิด) · Test Data ของ SBH Prod ที่รู้ · Ownership Matrix เพิ่ม ER · `reg-write` ใช้สไตล์แถวแรกกับเซลล์ใหม่ + เขียน Ownership Matrix ได้ · ทาสี / AutoFit ผ่าน Excel COM · ส่งคำถาม OPD 5 ข้อให้ผู้ใช้ → ผู้ใช้ตอบครบ (ตาราง "คำตอบของผู้ใช้") แล้วแก้ OPD-001 / 002 / 004 / 005 / 006 / 009 ตามคำตอบ 15 ช่อง (สำรอง `_backup/…20261023-230847.xlsx`) · ผู้ใช้สั่ง IPD 13 ข้อ M = Out of Scope (สำรอง `…20261023-231912.xlsx`) → E2E ใน Scope 16 ข้อ · Urgent/High Untested 29 → 16 · ลงชีต Cards: การ์ด Label `VERSION 2.9.0` ทีม SBH 260 ใบ → การ์ดหลักที่ Dev เริ่มทำแล้ว 38 ใบ (แถว 4–41 · สำรอง `…20261023-233936.xlsx`) · Map Scenario ตามตารางที่ผู้ใช้ยืนยัน 29 ใบ · ไม่มี Scenario รองรับ 9 ใบ (CPR SBH-2530 · เหตุการณ์หมู่ SBH-2470 · Compound SBH-2245 / 2246 / 2247 · ใบ Refill SBH-1732 · Refer out SBH-1384 / 1143 / 1016) = Pending Mapping · TOR (H) ยังว่างทุกใบ · ไฟล์ B3 ยังเป็น v2.8.0 (ยังไม่ได้ถามว่าเปลี่ยนเป็น 2.9.0 ไหม) · การ์ด Refill หลายใบที่เทสสัปดาห์นี้ไม่ติด Label 2.9.0 จึงไม่อยู่ในรายการ · B3 = v2.9.0 ตามผู้ใช้สั่ง · **ผู้ใช้เปลี่ยนชื่อไฟล์เป็น `Regression/SBH_Regression_v2.9.0.xlsx` เอง** (ไฟล์ v2.8.0 ไม่มีแล้ว · ไฟล์ใน `_backup/` ยังใช้ชื่อเดิม) · เพิ่ม SMK-OPD-010 Refer out + SMK-OPD-011 Refill ที่แถว 24–25 แล้วเลื่อน ER / ADM / IPD ลง 2 แถว (สำรอง `…v2.9.0.20261023-235842.xlsx`) · Map SBH-1384 / 1143 / 1016 → OPD-010 · SBH-1732 → OPD-011 · เหลือ Pending Mapping 5 ใบ (เทสผ่าน TC) · E2E ใน Scope 18 ข้อ
