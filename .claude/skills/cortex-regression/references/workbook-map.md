# แผนที่ไฟล์ Regression ({Site}_Regression_v{X}.xlsx)

ศึกษาจาก `Regression/SBH_Regression_v2.8.0.xlsx` (Master Regression Template · README เวอร์ชันเอกสาร 1.0 อัปเดต 2026-09-29) เมื่อ 22 ต.ค. 2026
Template เปลี่ยน (คอลัมน์ / สูตร / Dropdown) → อ่านชีต README ของไฟล์ใหม่ แล้วแก้ไฟล์นี้ + `scripts/reg-lib.mjs` (evaluate) + `scripts/reg-write.mjs` (RULES / LISTS)

## ชีต

| ชีต | หน้าที่ | ใครกรอก |
|---|---|---|
| README | คู่มือ + เงื่อนไขการคำนวณ (อ่านก่อนเสมอเมื่อได้ไฟล์ Version ใหม่) | — |
| Regression Plan | สรุปแผน / ผล 10 หัวข้อ ดึงค่าอัตโนมัติ | ช่องเหลือง: B14 Test Start Date · B15 Duration (วันทำการ) · B79:B82 เกณฑ์ผ่าน |
| Dashboard | Release Decision (B10) · Risk (K10) · Overall Verdict (D12) · หัวข้อ 1–10 + กราฟ 9 อัน | เฉพาะหัวข้อ 4 Environment Sign-off (แถว 96) และ 5 Risk Log (แถว 105–124) |
| E2E core flow | Scenario หลัก (แถว 15–1000) — QA ลงผลที่นี่ | QA |
| Cards | การ์ด Linear ที่ Release + การ์ด Retest (แถว 4–1000) | QA Site |
| Card Test Cases | 1 แถว = 1 TC ของการ์ด (แถว 4–1000) | QA |
| Ownership Matrix | Module → Linear Team / PO / BA / Dev Lead | PO / BA |
| Dashboard Feed (ซ่อน) | ค่าที่ Grand Dashboard ดึงผ่าน link (O:P แถว 5–45 · R:Y Risk Items · AA:AI กราฟ) | ห้ามแตะ · ห้ามแทรก/ลบแถว · ห้ามเปลี่ยนชื่อชีต / ชื่อไฟล์ |

## E2E core flow

หัวไฟล์: B1 Project/Site · B2 Test Suite · B3 Build/Version · B4 Tested Environment (Dropdown `demo-x, stg-tmh, stg-sbh, stg-nuh` — 1 ไฟล์ = 1 Environment) · B5 Priority · B6 Exit Criteria · D1 Sprint · D2 Executed By · D3 Executed Date · C12 URL ของ SOP
D4 (Summary) · D5 (Overall) · D6 (% Readiness) = สูตร

| คอลัมน์ | ช่อง | ค่า |
|---|---|---|
| A | Scenario ID | `SMK-OPD-001` ไม่ซ้ำ · เลขรันจำนวนหลักเท่ากัน (Cards จับคู่แบบ partial — `SMK-OPD-001` จะไปติด `SMK-OPD-0011`) |
| B | Module | ต้องตรงกับ Ownership Matrix คอลัมน์ A |
| C–F, H | Scope · Name · Steps `[1] [2]…` · Test Data · Expected | ข้อความ (เตรียมโดย QA Site / BA) |
| G | Related Card(s) | **สูตร** — ดึงจาก Cards ที่ Map มา |
| I / J / K | Test Level / Type / Intent | `Unit, Integration, System, Acceptance` · `Functional, UI/UX, Security, Performance, Integration` · `Happy, Unhappy, Edge, Error` |
| L | Flow Priority | `Urgent, High, Medium, Low` — กรอกครบใน Day 0 แล้วล็อก · ว่าง = นับเป็น Urgent/High |
| M | Execution Status | `ToDo, Ready for Testing, Testing, Blocked, Done, Out of Scope, Canceled` — **ห้ามใส่ Passed / Failed** |
| N | Actual Result | ข้อความ / Log / Error |
| O | Defect ID | ทุก Bug ที่เจอใน Scenario คั่นด้วย `,` (Risk Log จับคู่ได้เฉพาะช่องที่มี ID เดียว) |
| P / Q | Severity / Impact | `Critical, High, Medium, Low` / `Extensive, Significant, Moderate, Minor` — กรอกเมื่อมี O |
| R | Bug Priority | **สูตร** Severity × Impact |
| S | Root Cause | `Config, Master Data, Code Bug` |
| T | Defect Status | `Open` (หรือว่าง) / `Fixed – Retest Passed` (ขีดยาว en-dash) — Fixed เมื่อผ่าน Direct Fix + Impact Area ทุก ID แล้วเท่านั้น |
| U | Tester | Dropdown `Matt, Tar, Neran, Benz, James, Aof` |
| V | Executed Date | วันที่ (yyyy-mm-dd) — ต้องเป็นวันที่จริง ไม่ใช่ข้อความ (Grand Dashboard คำนวณ Last Executed Date) |
| W | Overall Verdict | **สูตร** |
| X | Remark | Impact Area ที่ Retest / เหตุผลที่ Blocked |
| Y / Z | Owner Team / Release Gate | **สูตร** |

## Cards

| คอลัมน์ | ช่อง | ค่า |
|---|---|---|
| A / B / C | Card ID / Title / Owner | จาก Linear |
| E | Map to Scenario ID | หลาย ID คั่น `,` หรือขึ้นบรรทัดใหม่ |
| F | Card Priority | `Urgent, High, Medium, Low` — Day 0 แล้วล็อก · ว่าง = Urgent/High |
| H | TOR | `Yes, No` — Day 0 แล้วล็อก · ว่าง = นับเป็น TOR |
| I | Retest from Version | เช่น `v2.7.0` เมื่อเป็นการ์ด regression-fail ของรอบก่อน |
| J | Card Result | `Passed, Passed with Known Issue, Failed, Not Tested` — QA Site ตัดสิน · Known Issue ต้อง QA Lead ยืนยัน |
| K | Result Note | เหตุผล + Sub-issue ID + ชื่อ QA Lead (กรณี Known Issue) |
| G, L–S | E2E Status · Release Gate · Module · TC Status/Total/Passed/Failed/Remaining · Tester | **สูตร** |

## Card Test Cases

A TC ID (`TC-{Site}-{Card no.}-001`) · B Card ID (ต้องตรง Cards A) · C/D **สูตร** · E ชื่อ TC ย่อ · F Result `Passed, Failed, Blocked, Not Run, Out of Scope` (ว่าง = Not Run) · G Tester · H Executed Date · I Defect ID (Failed ต้องมี Sub-issue ID) · J Remark

## Dashboard ที่กรอกได้

- แถว 96: C Environment (SRE) · D Version (SRE) · E Master (Dev) · F Config (Dev) · G Linear (QA Lead) = `Ready, Not Ready, N/A` · I ผู้ Sign-off · J วันที่ · K Remark / Evidence
- Risk Log แถว 105–124: B Linear ID (Defect ID หรือ Card ID) · C Module · D Bug Priority · E อาการ · F เหตุผลที่ยอมรับ · I Approval Level `PO` (Deferrable) / `CAB` (Blocking ที่ได้ CF) · J ผู้อนุมัติ · K วันที่ · L Target Sprint · M Remark

## ตรรกะของสูตร (ลอกไว้ใน reg-lib.mjs)

- **Bug Priority (R)** = Severity × Impact

  | Severity \ Impact | Extensive | Significant | Moderate | Minor |
  |---|---|---|---|---|
  | Critical | Urgent | Urgent | High | High |
  | High | Urgent | High | High | Medium |
  | Medium | High | High | Medium | Medium |
  | Low | Medium | Medium | Low | Low |

  มี O แต่ P / Q ว่าง → "ระบุ Severity + Impact" (นับเป็น Blocking)
- **มี Bug ค้าง** = T ≠ Fixed และ (O หรือ P มีค่า)
- **Overall Verdict (W)**: M = Out of Scope/Canceled → Out of Scope · M = Blocked → Blocked · มี Bug ค้าง → (L เป็น Medium/Low **และ** การ์ดที่ผูกทุกใบเป็น Medium/Low) ? Conditionally Passed : Failed · M = Done → Passed · อื่นๆ → Not Run
- **Release Gate (Z)** (เฉพาะแถวที่มี Bug ค้างและไม่ Out of Scope): W = Failed หรือ R เป็น Urgent/High/ยังไม่ระบุ → (Risk Log มีแถว CAB ที่ B = O) ? Accepted (CF) : Blocking · ที่เหลือ → Deferrable
- **Cards G (E2E Status)**: ผลแย่สุดของ Scenario ที่ผูก Failed > Blocked > Ready for Testing (Not Run) > Conditionally Passed > Passed > Out of Scope · E ว่าง → Pending Mapping
- **Cards L (Release Gate)**: การ์ดใน Gate = H ≠ No หรือ F ไม่ใช่ Medium/Low · J ว่าง → (ใน Gate ? Pending Result : ว่าง) · Passed → ว่าง · Known Issue → Known Issue · Failed/Not Tested ใน Gate → Accepted (CF) / Blocking · นอก Gate: Failed → Deferrable · Not Tested → Carry Over
- **Release Decision (Dashboard B10)** — NO-GO เมื่อข้อใดข้อหนึ่ง > 0:
  1. Scenario Failed ที่ยังไม่ CF
  2. Scenario Urgent/High/ว่าง ที่ Not Run หรือ Blocked
  3. การ์ด Pending Result
  4. Z = Blocking ที่ W ≠ Failed (Bug Urgent/High ค้าง)
  5. การ์ด L = Blocking

  ไม่ NO-GO + มีเคสที่ประเมินแล้ว → READY TO RELEASE (+ Medium/Low Untested) · ยังไม่มีผลเลย → NOT READY
- **Risk Level**: Urgent = NO-GO หรือ Bug Urgent ค้าง · High = Bug High ค้าง หรือมี CF · Medium = Bug Medium ค้าง / Pending Risk Acceptance / การ์ด Known Issue / ยังเทสไม่ครบ · Low = ที่เหลือ
- **เกณฑ์ผ่าน (Regression Plan ข้อ 9)**: E2E (Passed + Cond.) ÷ Scenario ใน Scope ≥ 100% · Cards Passed ÷ (การ์ด − Known Issue) ≥ 90% · TC Passed ÷ TC ใน Scope ≥ 90% · Known Issue ÷ การ์ด ≤ 10% → ผ่านครบ 4 ข้อ = Accept Build

## สิ่งที่ตรวจพบในไฟล์จริง (22 ต.ค. 2026)

- README บอกว่า E2E / Cards / Card Test Cases ถูก Protect แต่ใน XML ไม่มี `sheet="1"` → **จริงๆ ไม่ได้ Protect** (ช่องเทาพิมพ์ทับได้) — reg-write.mjs กันช่องสูตรเอง
- ไฟล์มีกราฟ 9 อัน · สูตร dynamic array (`metadata.xml`) · customXml ของ SharePoint · webextension — **exceljs / openpyxl เขียนแล้วกราฟหาย** ต้องใช้ reg-write.mjs (แก้ XML เฉพาะเซลล์)
- B4 = `demo-x` แต่รอบ v2.8.0 ผู้ใช้สั่งรันบน SBH Prod และ Dropdown ไม่มีค่า SBH Prod — ยังไม่ได้ถามว่าจะใส่อะไร
- Cards / Card Test Cases ยังเป็นข้อมูลตัวอย่าง (XXX-001 / XXX-002 / TC-TMH-001-001) · L ว่างทุก Scenario · Ownership Matrix คอลัมน์ C (Linear Team) ว่างทุก Module → Y (Owner Team) ขึ้น "ไม่พบใน Ownership Matrix" ทุกแถว
- 23 ต.ค. 2026 จัดแถวใหม่ 31 Scenario: OPD 001–011 (แถว 15–25) · ER 001–006 (26–31) · ADM-001 (32) · IPD 001–013 (33–45 พักไว้ สีเทา D9D9D9 — ไม่ใช่ช่องสูตร · M = Out of Scope) · Ownership Matrix แถว 12 = ER · ไฟล์เปลี่ยนชื่อเป็น `SBH_Regression_v2.9.0.xlsx` (B3 = v2.9.0)
- คอลัมน์ G (Related Cards) แสดงการ์ดที่ผูกทุกใบหลายบรรทัด → AutoFit ทำให้แถวที่ผูกหลายการ์ดสูงมาก (OPD-009 ผูก 8 ใบ = 409.6 สูงสุดของ Excel)
- คอลัมน์ V ใช้รูปแบบวันที่ของเครื่อง (แสดง 10/22/2026) — ค่าเป็นวันที่ถูกต้อง แค่หน้าตาไม่ใช่ yyyy-mm-dd
