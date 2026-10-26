---
name: cortex-automate
description: สมุดกฎและคู่มือของโปรเจกต์ QA Automation ระบบ Cortex Cloud HIS ด้วย Playwright + TypeScript ที่โฟลเดอร์ "Cortex Automate" — กฎการทำงาน/ขั้นตอนที่ผู้ใช้กำหนด (ผู้ใช้จะสอนเพิ่มและปรับเรื่อยๆ ต้องอัปเดตสกิลนี้ทุกครั้งที่มีกฎใหม่), โครงสร้างโปรเจกต์, คำสั่งรัน, การล็อกอิน Keycloak อัตโนมัติจาก .env แยกตาม role (Super_User/Doctor/Nurse), ความรู้หน้าจอ Cortex สำหรับเขียน locator และรายการเรื่องที่ยังไม่ได้ตกลง (ต้องถามผู้ใช้ก่อน). ใช้สกิลนี้ทุกครั้งที่งานเกี่ยวกับ automate test แม้ไม่ได้พูดคำว่า Playwright เช่น "เขียน automate", "เขียนสคริปต์เทส", "สร้าง spec", "แปลง test case เป็น automate", "รัน automate", "รัน playwright", "รัน smoke test", "เทส fail ดูให้หน่อย", "เปิด report", "codegen", "page object", "locator/selector", "flaky" หรือเมื่อผู้ใช้สอน/เปลี่ยนกฎการทำงานของโปรเจกต์ automate. ไม่ใช่สำหรับเทสมือผ่าน Chrome ของผู้ใช้ (er-run-test) หรือเขียน Test Case ลง Excel/Linear (write-test-case, linear-execution-test) ไฟล์นี้คือกฎ + ดัชนี — ความรู้หน้าจอแยกตามโมดูลที่ references/screens/ (โหลดเฉพาะโมดูลที่งานแตะ) · คำตอบรายงานที่ references/decisions.md · ประวัติที่ references/changelog.md
---

# Cortex Automate — Playwright + TypeScript

สกิลนี้ = **กฎ + ดัชนี** ของโปรเจกต์ (ย่อจาก 769 KB เหลือไฟล์นี้ + `references/` เมื่อ 24 ต.ค. 2026 · สภาพเดิมอยู่ที่ tag `skills-before-slim`)
ลำดับอ่านเมื่อเริ่มงาน: §1 หลัก → §7 กฎ → Grep เลขการ์ดใน `references/decisions.md` → เปิด `references/screens/<โมดูล>.md` ที่เกี่ยว (`references/screens/general.md`) → เริ่มทำ

---

## 1) หลักที่ใช้ตลอด

1. **สงสัยตรงไหน ถามผู้ใช้ก่อน** (ผู้ใช้สั่งตอนเริ่มโปรเจกต์ 26 ก.ย. 2026) — โดยเฉพาะเรื่องใน §5 ห้ามเดาแล้วลงมือเอง
   ถ้ามีหลายเรื่อง รวบถามครั้งเดียว พร้อมตัวเลือกที่แนะนำ
2. ตอบผู้ใช้เป็นภาษาไทยเสมอ (ศัพท์เทคนิค/ชื่อเมนู/ชื่อการ์ดเป็นอังกฤษได้)
3. เทสการ์ด (`tests/`) รันกับ dev-x (`https://dev-x.cortexcloud.co`) เท่านั้น · **SBH Prod** (`https://cortex.srbrhospital.com` รพ.สระบุรี) ใช้ได้เฉพาะงานที่ผู้ใช้สั่งให้ทำบน Prod (ตอนนี้: Mock Data UAT ER — R31) ผ่าน `playwright.sbh-prod.config.ts` + `mock-data/` เท่านั้น ·
   ยกเว้นเทสการ์ดที่ผู้ใช้อนุญาตให้รันบน Prod เป็นรายการ์ด (R40) — รันผ่าน `playwright.sbh-prod.cards.config.ts` ซึ่งระบุไฟล์ไว้เป็นรายการ (ตอนนี้: SBH-2394 อ่านอย่างเดียว · SBH-2471 สร้างผู้ป่วย AUTO 4 ราย แล้วปิด Visit — R42 · SBH-2462 สร้างผู้ป่วย AUTO 2 ราย + Disposition แล้วปิด Visit — R43 · SBH-2373 สร้างผู้ป่วย AUTO 1 ราย + Triage + Physician Note แล้วปิด Visit — R45)
   `loadEnv()` กันไว้ทั้ง 2 ทาง (config ปกติ + BASE_URL ของ Prod = error) · งานอื่นจะทำบน Prod ต้องถามก่อนทุกครั้ง
4. ความลับ (user/pass, session) ทำตาม §6 ทุกกรณี
5. อ่านโค้ด/ไฟล์ของผู้ใช้ก่อนออกแบบ — เช่น `.env` ที่ผู้ใช้ตั้ง user แยก role เอง: **ปรับโค้ดให้ตามรูปแบบของผู้ใช้** ไม่ใช่ให้ผู้ใช้แก้ตามโค้ด
6. ได้การ์ดใหม่/requirement ใหม่ → ต้องผ่าน skill **`qa-automate-readiness`** ก่อนเขียนโค้ด automate ทุกครั้ง (เดิมคือ R16 —
   ย้ายไปเป็นสกิลแยกแล้ว 30 ก.ย. 2026 เพราะเป็นหลักการที่ QA ทั้งทีมต้องทำเหมือนกัน) เขียน Playwright ได้เฉพาะ TC ที่ยืนยัน
   จากแอปจริงแล้วเท่านั้น
7. **ระหว่างทำงานแจ้งสถานะเป็นระยะ** (R44): กำลังทำอะไร · ติดปัญหาอะไร — ไม่เงียบยาวแล้วสรุปทีเดียวตอนจบ
8. **`git pull` วันละ 1 ครั้ง ตอนเริ่มงานแรกของวัน** (R60) — ก่อนแก้ไฟล์ใดๆ ในโปรเจกต์
9. **อ่านสกิลให้ประหยัด**: ไฟล์นี้คือกฎ + ดัชนี — รายละเอียดอยู่ใน `references/` · เปิดเฉพาะไฟล์ของโมดูลที่งานนั้นแตะ · **Grep ก่อน Read** แล้วอ่านช่วงบรรทัดที่เจอ ·
   `changelog.md` / `project-map.md` / `decisions.md` ห้าม Read ทั้งไฟล์ (ใช้ Grep เลขการ์ด / คำสำคัญ)

---

## 2) โปรเจกต์

`C:\Users\jame4\OneDrive\Desktop\Cortex-Automate` (branch `Jame` · main = `main`) — Node 24 · `@playwright/test` 1.63 · TypeScript · `exceljs` · Browser = Chrome ในเครื่อง (`channel: 'chrome'`) · `.env` โหลดด้วย `process.loadEnvFile`
รายละเอียดว่าแต่ละสเปก / helper ทำอะไร → [references/project-map.md](references/project-map.md) (Grep ชื่อไฟล์หรือเลขการ์ด)

```
Cortex-Automate/
├─ playwright.base.ts / playwright.config.ts (dev-x) / playwright.sbh-prod.config.ts (Prod · mock-data) /
│  playwright.mock.config.ts (dev-x · mock-data) / playwright.sbh-prod.cards.config.ts (Prod · การ์ดที่อนุญาตรายไฟล์ — R40)
├─ tests/auth.setup.ts                 เตรียม session ตาม ROLES_IN_USE
├─ tests/modules/{er,opd,registration,activity}/SBH-<เลข>-<เรื่อง>.spec.ts   เทสรายการ์ด (หัวไฟล์บอก TC / ข้อมูลที่ใช้)
├─ helpers/functions/*.ts              er*.ts · opd-*.ts · reception*.ts · cashier.ts · refer-in.ts · evidence.ts (checkStep / วงแดง / คลิป) · print-capture.ts (PDF) · fixtures.ts · test-data.ts
├─ utils/env.ts · utils/session.ts     loadEnv() (กัน Prod ผิด config) · เช็ค session Keycloak
├─ mock-data/                          สคริปต์ Mock Data UAT ER / OPD · เล่น Scenario (uat-play.ts · bizsim*.ts) · _repl.spec.ts (สำรวจทีละขั้น) · created-patients.md (log ผู้ป่วยที่สร้าง)
├─ mock-data-refer/                    payload Refer เข้า (MOPH Refer UAT → SBH Prod) + make-refer-files.mjs / send-refer.mjs
├─ E2E/                                ไฟล์ Scenario UAT / BizSim (.xlsx) — backup/ ไม่ขึ้น git
├─ Regression/                         ไฟล์ {Site}_Regression_v{X}.xlsx (สกิล cortex-regression) — _backup/ ไม่ขึ้น git
├─ test-cases/drafts/                  ร่าง Test Case (.md) ต่อการ์ด ก่อนขึ้น Linear
├─ clips/                              หลักฐานภาพ / คลิป (ไม่ขึ้น git)
├─ .auth/ · .env · .cache/             session · ความลับ · ไฟล์ชั่วคราว (ไม่ขึ้น git)
├─ .claude/skills/                     cortex-automate (ไฟล์นี้) · cortex-card-test · cortex-regression · qa-automate-readiness · linear-testcase-writer
└─ .claude/agents/                     Sub Agent ทดลองใช้ (อ่านอย่างเดียว): cortex-screen-explorer (สำรวจหน้าจอ → ตาราง locator) · cortex-evidence-checker (ตรวจภาพ / คลิปก่อนแนบ Linear) — ลบไฟล์ได้ทุกเมื่อ ไม่มีอะไรอ้างถึง
```

- โฟลเดอร์อยู่ใน OneDrive — `npm install` เจอ `EPERM` / `EBUSY` ให้ผู้ใช้หยุด sync ชั่วคราว
- tag `skills-before-slim` = สภาพสกิลก่อนจัดโครงสร้าง 24 ต.ค. 2026 (ย้อนด้วย `git checkout skills-before-slim -- .claude/skills`)

---

## 3) คำสั่ง

คำสั่งงาน Mock Data / Scenario UAT / Refer / BizSim อยู่ที่ [references/commands-mock-data.md](references/commands-mock-data.md)

| ทำอะไร | คำสั่ง |
|--------|--------|
| รันทั้งหมด (ไม่เปิดจอ) | `npm test` |
| รันบางไฟล์ / บางชื่อ | `npx playwright test tests/modules/er` · `npx playwright test -g "ชื่อเทส"` |
| รันเฉพาะการ์ด / TC (tag) | `npx playwright test --grep @SBH-1013` · `--grep @SBH-1709` (เลข TC รันทั้งเทสที่มี step นั้น) |
| รันเฉพาะ module | `npm run test:module:er` (`tests/modules/er`) · `npm run test:module:activity` (`tests/modules/activity`) · `npm run test:module:opd` (`tests/modules/opd`) · `npm run test:module:registration` (`tests/modules/registration`) — module ใหม่เพิ่ม script คู่กันเอง (R47, ตั้งแต่ 30 ก.ย. 2026) |
| รันเฉพาะ flow e2e (ข้ามหลาย module) | `npm run test:e2e` (`tests/E2E`) — ยังไม่มีไฟล์เทสจริง (R47) |
| เปิดจอดูตอนรัน | `npm run test:headed` · เฉพาะการ์ด `npm run test:headed -- --grep @SBH-1013` (PowerShell 5.1 ส่ง `--` และ `@SBH-...` ต่อได้ปกติ — ตรวจแล้ว) |
| โหมด UI (เลือกเทส ดูทีละ step) | `npx playwright test --project=setup` ก่อน แล้ว `npx playwright test --ui --project=chrome` = **`npm run test:ui`** (แก้ script แล้ว 26 ก.ย. 2026 หลังผู้ใช้เจอว่า `npx playwright test --ui` ไม่เห็น SBH-1013) · เห็น Chrome จริงด้วย: `npm run test:ui -- --headed` · **อย่าใช้ `npx playwright test --ui` เฉยๆ** เหตุผลด้านล่าง |
| debug ทีละบรรทัด | `npm run test:debug` |
| เปิดรายงานล่าสุด | `npm run report` |
| อัดการกดเป็นโค้ด (Super_User) | `npm run codegen` — ต้องมี `.auth/Super_User.json` จากการรันสักรอบก่อน |
| อัดเป็น role อื่น | `npx playwright codegen --channel=chrome --viewport-size=1920,1080 --load-storage=.auth/Doctor.json https://dev-x.cortexcloud.co/cortex/apps` |
| เช็ค type | `npm run typecheck` |
| บังคับล็อกอินใหม่ | ลบ `.auth/<Role>.json` แล้วรัน (แก้ `.env` ก็ล็อกอินใหม่เอง) |
| เตรียม session อย่างเดียว | `npx playwright test --project=setup` |
| เทสการ์ดที่อนุญาตบน **SBH Prod** (R40) | `npm run card:prod -- --headed --grep @SBH-2394` (= `playwright test -c playwright.sbh-prod.cards.config.ts`) · รายงาน `playwright-report-sbh-prod/` · ภาพเรียงลำดับ + คลิปอยู่ที่ `test-results-sbh-prod/<เทส>/evidence/*.png` และ `video.webm` → คัดลอกไป `clips/` ทันที · ขั้นตอนเต็ม (อ่านการ์ด → รัน → แนบผลลง Linear) อยู่ในสกิล `cortex-card-test` · **ต้องใส่ `--grep` ทุกครั้ง** (ในรายการมี SBH-2471 ที่สร้างผู้ป่วย: `--grep @SBH-2497` = ผู้ป่วย A + B · `--grep @SBH-2500` = ผู้ป่วย C + D — รันทีละเทส แล้วคัดลอกหลักฐานก่อนรันตัวถัดไป · SBH-2462: `--grep @SBH-2490` = ผู้ป่วยรายที่ 1 · `--grep @SBH-2491` = ผู้ป่วยรายที่ 2 + หน้าต่างของ Doctor) |

**Claude รันเอง (Bash tool)** — shell ของ Claude ยังไม่เห็น PATH ของ Node จนกว่าจะเปิดแอปใหม่:

```bash
export PATH="/c/Program Files/nodejs:$PATH"; cd "/c/Users/jame4/OneDrive/Desktop/Cortex-Automate" && npx playwright test
```

- **โหมด UI ของ Playwright 1.63** (ตรวจจากโค้ดใน `node_modules` 26 ก.ย. 2026):
  - ไม่รัน project ที่เป็น dependency (`setup`) ถ้าไม่ได้ติ๊ก project นั้นในตัวกรอง → เทสใช้ `.auth/<Role>.json` เดิมตรงๆ ถ้า session หมดอายุจะเด้งไปหน้าเข้าสู่ระบบ
  - ไม่ใส่ `--project` → ติ๊กให้แค่ project แรกใน config (`setup`) → ไม่เห็นเทสอื่น
  - บังคับ trace `on` ทุกเทส รวม setup — ถ้าติ๊ก `setup` แล้วต้องล็อกอินใหม่ รหัสผ่าน (argument ของ `evaluate`) จะอยู่ใน trace ซึ่งผู้ใช้อนุญาตแล้ว (R14)
  - ไม่มีปุ่ม "Show browser" ในหน้า UI แล้ว — อยากเห็น Chrome จริงให้เติม `--headed` ตอนเปิด
- **อย่าใส่ `--reporter=list`** — ตัวเลือกนี้ทับ reporter ใน config ทำให้ไม่ได้ HTML report (config มี list อยู่แล้ว output บน terminal เหมือนกัน)
- `--list` ก็เขียน HTML report ทับด้วยผลว่าง (ทุกเทสเป็น skipped) — ถ้าจะดู report ต้องรันจริงหลังจากนั้น
- fail แล้วดูที่ `test-results/<ชื่อเทส>/`: `test-failed-1.png` (เปิดด้วย Read) · `error-context.md` · `trace.zip` (ให้ผู้ใช้เปิดด้วย `npx playwright show-trace <path>`)
- project **setup** เปิดดูได้เหมือนเทสอื่น (R14) — trace / `error-context.md` ของขั้นล็อกอินอาจมีรหัสผ่าน อ่านได้แต่ห้ามยกมาพิมพ์ในแชท (§6)

---

## 4) ค่าเริ่มต้นที่ Claude ตั้งตอนสร้างโปรเจกต์ (ยังไม่ใช่กฎ — ผู้ใช้เปลี่ยนได้)

| เรื่อง | ค่า | เหตุผล |
|--------|-----|--------|
| รันขนาน | `workers: 1`, `fullyParallel: false` | dev-x ใช้ข้อมูลร่วมกันทั้งทีม กันคนไข้/visit ชนกัน |
| Retry | 0 | ให้เห็นเทสที่ไม่นิ่งตรงๆ |
| จอ / ภาษา / เวลา | 1920×1080 · `th-TH` · `Asia/Bangkok` | ตรงจอผู้ใช้ และ env ของแอป (LANG th, TIMEZONE Asia/Bangkok) |
| Timeout | test 60s · expect 20s · action 20s · navigation 30s | เปิดหน้า Cortex แต่ละครั้ง ~11 วินาที (`references/screens/general.md`) |
| trace | เก็บเฉพาะตอน fail (`retain-on-failure`) ทุก project รวม setup (R14) · project `chrome` ไม่เก็บภาพใน trace (`screenshots: false`) | ไฟล์ใหญ่และมี cookie/ค่าที่พิมพ์ เก็บเฉพาะรอบที่ต้องไล่สาเหตุ — วิดีโอกับภาพเป็นกฎ R13 · ภาพของ trace ใช้ screencast ร่วมกับวิดีโอแล้วทำวิดีโอเล็กลง (`references/screens/general.md`) |
| ชื่อเทส | ภาษาไทย บอกว่าเช็คอะไร (+ role ในวงเล็บ) | |
| เช็ค session เดิม | ถาม Keycloak แบบ `prompt=none` (`utils/session.ts`) + ถ้า `.env` ใหม่กว่าไฟล์ session ถือว่าใช้ไม่ได้ | เร็ว (~0.5–1 วินาที) และจับกรณีเปลี่ยน user ใน `.env` ได้ |

---

## 5) เรื่องที่ยังไม่ได้ตกลง — ถามผู้ใช้ก่อนทำ

- **ขั้นตอนการทำงานช่วงท้าย** (รัน → รายงานผล) — ผู้ใช้บอกว่าจะอธิบายเอง · ช่วงต้น (เข้าใจการ์ด → ตรวจ TC → วางแผน) ผู้ใช้กำหนดแล้วที่ skill `qa-automate-readiness` (เดิมคือ R16)
- เทสที่ **แก้/ส่งต่อ** ข้อมูลบน dev-x (เช่น ส่งต่อคลินิก, ยกเลิก Visit ที่เทสไม่ได้เปิดเอง, บันทึก Triage ให้ผู้ป่วยทีม) รันได้เลยไหม —
  ที่ตกลงแล้ว: สร้างผู้ป่วยใหม่ + เปิด Visit (R10, R11) · เปิด Visit ให้ผู้ป่วยทีมแล้ว**ยกเลิก Encounter ที่เทสเปิดเอง** (R15) · บันทึก Triage ให้ผู้ป่วย AUTO (R17)
- รายงานผลให้ใคร รูปแบบไหน (HTML report / Excel / Linear) · เจอบั๊กจาก automate: รายงานผู้ใช้ + ลงข้อสังเกตในผล แล้วเปิดการ์ดบั๊กเมื่อผู้ใช้สั่ง (รูปแบบ R48) — เกณฑ์เลือกการ์ดใหม่ / Sub-Issue และ Assignee ยังไม่ได้ตกลง ถามทุกครั้ง
- เก็บโค้ดใน Git ไหม (repo ของบริษัท?) · CI / รันตามเวลา
- ลดเวลารันเพิ่ม (ยังไม่ได้ทำ): ให้เทส cache ไฟล์ JS ของแอป (ชื่อไฟล์มี hash — deploy ใหม่ได้ชื่อใหม่ จึงไม่ค้างของเก่า) ลดได้ ~9 วินาทีต่อการเปิดหน้า

ข้อไหนได้คำตอบ → ย้ายไปเป็นกฎใน §7 แล้วลบออกจากที่นี่

---

## 6) ความลับ (credential / session)

- `.env` — 26 ก.ย. 2026 ผู้ใช้อนุญาตให้เปิดดูได้ เพราะ "Username และ Password เป็นของปลอม" (user ทดสอบของ dev-x)
  เปิดได้เมื่อจำเป็น แต่**ไม่พิมพ์รหัสผ่านลงแชท หรือไฟล์ที่ Claude เขียน (โค้ด เอกสาร สกิล)** · ผลบันทึกขั้นล็อกอินในรายงาน (วิดีโอ / trace) ผู้ใช้อนุญาตแล้ว (R14)
  ถ้าผู้ใช้บอกว่าเปลี่ยนเป็นบัญชีจริง → กลับไปห้ามเปิด ตรวจได้แค่ metadata หรือไฟล์ค่าปลอมใน scratchpad และถามว่ายังให้บันทึกขั้นล็อกอิน (R14) อยู่ไหม
- `.auth/<Role>.json` มี session cookie ของ Keycloak — ไม่เปิดอ่าน ไม่แนบไปไหน · ห้าม `console.log(process.env...)`
- ช่องรหัสผ่านใส่ด้วย `locator.evaluate((el, v) => { (el as HTMLInputElement).value = v }, password)` (ชื่อ step แค่ `Evaluate`) —
  ถ้าใช้ `fill()` / `type()` / `pressSequentially()` / `keyboard.type()` / `keyboard.insertText()` Playwright 1.63 ตั้งชื่อ step เป็น `Fill "<ค่า>"` / `Type "<ค่า>"` / `Insert "<ค่า>"` ลง HTML report แบบไม่ mask
  ตั้งแต่ R14 ไม่บังคับแล้ว แต่คงไว้ (รหัสไม่ต้องโผล่เป็นตัวอักษรในรายการ step ทุกรอบที่ล็อกอิน) — ผู้ใช้อยากได้ `fill()` ปกติก็เปลี่ยนได้
  **ตรวจแล้ว 26 ก.ย. 2026:** HTML report จากการรันจริงมี username ครบ 3 role (จาก step Fill) แต่ไม่มีรหัสผ่านเลย · หลัง R14 สแกน report + test-results ของรอบที่ล็อกอินใหม่ก็ไม่เจอรหัสผ่าน
- project `setup` บันทึกเหมือนเทสอื่น (R14): วิดีโอมีเฉพาะรอบที่ล็อกอินจริง (setup ขอ `context` แล้วค่อย `newPage()` ตอนต้องล็อกอิน — รอบที่ใช้ session เดิมไม่เปิดหน้าเว็บ จึงไม่มีวิดีโอจอเปล่า) ·
  trace ตอน fail มีรหัสผ่าน (argument ของ `evaluate` + ข้อมูลที่ส่งไป Keycloak) และ cookie → ถ้าวันหนึ่งจะส่งผลเทสออกนอกเครื่อง (เช่น แนบ Linear) ถามผู้ใช้ก่อนว่ารวมผลของ setup ไหม
- รูปแบบ `.env` (parser ของ Node — ทดสอบแล้ว 26 ก.ย. 2026): `ชื่อ= "ค่า"` (มีช่องว่าง + เครื่องหมายคำพูด) อ่านได้ ·
  ค่าที่มี `#` หรือช่องว่างต้องครอบ `"..."` ไม่งั้นส่วนหลัง `#` ถูกตัด · ชื่อซ้ำ = ใช้บรรทัดล่างสุด · `ชื่อ: ค่า` (ใช้ `:`) อ่านไม่ได้ · CRLF อ่านได้
- **เปิดเว็บให้ผู้ใช้ดูผ่าน Playwright MCP** (R7): ผู้ใช้เลือกเมื่อ 26 ก.ย. 2026 ว่าให้ Claude กรอกรหัสจาก `.env` เอง ทั้งที่รหัสจะโผล่ในแถว tool call ของแชท
  → ดึงแค่บรรทัดที่ต้องใช้ด้วย Grep `^CORTEX_PASSWORD_<Role>` แล้ว `browser_type` ลง `#password` (`submit: true`) · ยังไม่พิมพ์รหัสในข้อความตอบ / ไฟล์ที่เขียนเอง เหมือนเดิม
- ล็อกอินไม่ผ่าน → รายงานข้อความ error ที่ setup โยนออกมา (บอกชื่อ role) แล้วให้ผู้ใช้เช็ค `.env`
- ล็อกอินพลาดซ้ำๆ อาจทำให้บัญชีโดนล็อกชั่วคราว (Keycloak) — `user1` ผู้ใช้ใช้เทสมือด้วย · ถ้า fail ที่รหัสผ่าน อย่ารันซ้ำวนๆ

---

## 7) กฎการทำงาน (ผู้ใช้กำหนด)

กฎที่ใช้ทั่วไปอยู่ตารางนี้ · **คำตอบรายงาน** (การ์ด SBH-xxxx · Mock Data ชุดใด · Scenario UAT ข้อใด) อยู่ที่ [references/decisions.md](references/decisions.md) — Grep เลขการ์ดก่อนเริ่มงานการ์ดนั้น
เลขกฎที่ไม่อยู่ในตารางนี้ (R12 R19 R24 R26 R28–R43 R45 R46 R49–R51 R53–R59 R62–R67 และ `Rnn-2`) อยู่ใน decisions.md

| # | กฎ | ตั้งเมื่อ |
|---|----|-----------|
| R1 | สงสัยตรงไหนให้ถามผู้ใช้ก่อน | 26 ก.ย. 2026 |
| R2 | ล็อกอินอัตโนมัติด้วย user/pass จาก `.env` ที่ผู้ใช้กรอกเอง (setup project + storageState) | 26 ก.ย. 2026 |
| R3 | เก็บสกิลนี้ไว้ในโฟลเดอร์โปรเจกต์ `Cortex Automate\.claude\skills\` | 26 ก.ย. 2026 |
| R4 | user ทดสอบแยกตาม role ใน `.env` ชื่อ `CORTEX_USERNAME_<Role>` / `CORTEX_PASSWORD_<Role>` (ตอนนี้ Super_User, Doctor, Nurse — ผู้ใช้ตั้งเอง) | 26 ก.ย. 2026 |
| R5 | "ใช้ session เดิมถ้ายังไม่หมดอายุ เพื่อลดเวลาล็อกอิน" → setup เช็คก่อน ใช้ได้ก็ข้ามการล็อกอิน | 26 ก.ย. 2026 |
| R6 | "ขณะที่กำลังสร้าง Test Case สามารถใช้ Super User ไปก่อนก็ได้" → role ตั้งต้นของ project `chrome` = Super_User และ setup เตรียมแค่ role ใน `ROLES_IN_USE` (3 ต.ค. 2026: Super_User + Doctor — Doctor ใช้เป็นแพทย์เฉพาะทางที่ตอบ Consult ใน `UAT-ER-play.spec.ts`) | 26 ก.ย. 2026 |
| R7 | ผู้ใช้สั่ง "เข้าเว็บ Cortex และเข้า Module ER ให้ดู" → เปิดผ่าน Playwright MCP แล้วให้ Claude ล็อกอินเองจาก `.env` (ผู้ใช้เลือกแบบนี้ ดูวิธีใน §6) | 26 ก.ย. 2026 |
| R8 | เลขบัตรประชาชนของผู้ป่วยทดสอบ: ผู้ใช้เลือก "ให้ Claude สุ่มเลขทดสอบ" (13 หลัก checksum ถูกต้อง — โค้ดใน [references/er-flow.md](references/er-flow.md)) แทนการให้ผู้ใช้พิมพ์เอง | 26 ก.ย. 2026 |
| R9 | "สร้างแบบ 2 เทสตาม Flow" (ตอบเรื่อง SBH-1013 — ผู้ใช้เลือกตัวเลือกที่ Claude เสนอ) → **1 เทส = 1 flow** (เช่น ตามที่มาของผู้ป่วย) ไม่ใช่ 1 เทสต่อ TC · `test.step` ตั้งชื่อ `TC-xxx (SBH-xxxx) <สิ่งที่เช็ค>` ตามชุด Manual ใต้ EXE ของการ์ด · tag เลขการ์ด + เลข TC · ไฟล์ `tests/<โมดูล>/SBH-<เลข>-<ชื่อ>.spec.ts` · ส่วนที่ใช้ซ้ำแยกไว้ `helpers/` (ไม่ใช่ Page Object เต็มรูป) | 26 ก.ย. 2026 |
| R10 | "สร้างคนไข้ใหม่ทุกรอบ" → flow **ผู้ป่วยใหม่** สร้างผู้ป่วยเองทุกรอบด้วย `newTestPatient()` ชื่อ `AUTO` (flow ผู้ป่วยมี HN เปลี่ยนเป็นตาม R15) | 26 ก.ย. 2026 |
| R11 | ข้อมูลที่เทสทิ้งไว้บน dev-x (ผู้ป่วย AUTO + Visit ค้างในคอลัมน์ "คัดกรอง" ที่ทั้งทีมเห็น) — ผู้ใช้ "รับได้" → ไม่ต้องยกเลิก/ล้างหลังเทส (เฉพาะผู้ป่วย AUTO — Visit ที่เปิดให้ผู้ป่วยทีมต้องยกเลิก R15) | 26 ก.ย. 2026 |
| R13 | "ทุกครั้งที่รันเทสมีเก็บผลเป็นรูปแบบ Video และใน Report อยากให้มีการแสดงรูปภาพในจุดที่ Expect ไว้ด้วย หากพบว่ามี Error ก็อยากให้เป็นผลที่ Error ไว้ด้วย" →<br>**วิดีโอทุกเทสทุกรอบ** 1920×1080 — เทส: fixture ใน `helpers/functions/fixtures.ts` (เริ่มอัดหลังหน้าแรกโหลดเสร็จ) · setup: `video: on` ของ config (R14) · **step ของ TC ต้องใช้ `checkStep()`** (`helpers/functions/evidence.ts`) ซึ่งแนบภาพ `ผ่าน — <step>` ตอนเช็ค Expected ครบ / `Error — <step>` ตอนพัง ไว้ใต้ step ในรายงาน · `screenshot: only-on-failure` คงไว้เป็นภาพท้ายเทสกันพังนอก step ·<br>ผู้ใช้ติ (26 ก.ย. 2026) "ภาพไม่ตรงกับ Expect" + "Video ยังมีหน้าขาวในช่วงแรก" → **ภาพต้องเห็นสิ่งที่ Expected พูดถึง**: ปิด step ด้วย `markEvidence(<สิ่งที่เช็ค>)` · TC ที่เช็คหลายสถานะ (เลือก → ยกเลิก, ค่าเปลี่ยนตาม) แยก `checkStep` ย่อยทีละสถานะ · ปิด toast ที่บังแถบหัว (`dismissToast`) · Expected ที่ไม่มีบนจอ (เช่น EN บนบอร์ด) แนบข้อมูล API เป็น JSON ใต้ step · **วิดีโอไม่มีช่วงจอขาวตอนโหลดแอป** | 26 ก.ย. 2026 |
| R14 | "ฉันอนุญาติไม่ต้องมีการปกปิดตอน Login ให้บันทึกได้ปกติ" (ตอบหลัง Claude แจ้งว่าขั้นล็อกอินไม่อัดวิดีโอเพราะมีการกรอกรหัสผ่าน) →<br>project `setup` ใช้ค่าบันทึกเดียวกับเทสอื่น (วิดีโอ · trace / ภาพตอน fail) ไม่ override แล้ว · ข้อห้ามใน §6 ที่มีไว้กันรหัสผ่านเข้าผลเทสยกเลิก (ยังไม่พิมพ์รหัสลงแชท / ไฟล์ที่ Claude เขียน) | 26 ก.ย. 2026 |
| R15 | "ขอแยกเป็นแบบนี้ในกรณีที่สร้างผู้ป่วยใหม่ --> ต้องไม่เคยมีคนไข้อยู่ในระบบมาก่อน แต่ถ้า เลือกผู้ป่วยที่มี HN --> ให้ใช้คนไข้ที่มีอยู่ในระบบแล้ว" + เลือกตัวเลือก **"สุ่มคนไข้ทดสอบของทีม"** (ชื่อขึ้นต้น "คนไข้" ที่ไม่อยู่บน ER Dashboard แบบเทสมือ และยกเลิก Visit ท้ายเทส) →<br>**ผู้ป่วยใหม่**: ก่อนลงทะเบียนค้นชื่อเต็มในช่องค้นหา ต้องไม่พบ (TC-003 ขั้น 3) · **ผู้ป่วยมี HN**: `pickTeamPatient()` สุ่มผู้ป่วยทีมที่ไม่มี Encounter / Admission ค้าง (Claude ทำเข้มกว่า "ไม่อยู่บนบอร์ด" เพราะเจอคนที่ Admit อยู่ → เปิด Visit ได้ 400 และ Visit ER ค้างข้ามวันที่บอร์ดไม่แสดง — แจ้งผู้ใช้แล้ว) ·<br>Visit ที่เปิดให้ผู้ป่วยทีมต้อง**ยกเลิก Encounter** เป็นขั้นสุดท้ายของเทส และ `afterEach` ยกเลิกให้ถ้าเทสพังกลางทาง (เช็ค EN ใน modal ก่อนกดยืนยันทุกครั้ง) | 26 ก.ย. 2026 |
| R16 | "ครั้งหน้าก่อนอยากให้เริ่มทำความเข้าใจกับการ์ดก่อนและจึงจะตรวจสอบ Test Case ที่อยู่ใน Sub-Issue แล้วลองพิจราณาว่า Test Case ครอบคุมไหม ถ้าไม่ครอบคุมคิดว่าต้องเพิ่มอะไรบ้างลองเสนอ Test Case ให้ User ได้แต่ถ้าครอบคลุมแล้วข้ามผ่านขั้นนี้ได้เลย ก่อนจะเขียน Code ให้วางแผนก่อนว่าจะเขียนยังไงให้ครอบคลุมเพื่อลดความผิดพลาด แต่ถ้าจุดไหนที่คิดว่าไม่มีประสิทธิภาพในการทำงานสามารถเสนอให้ User พิจราณาปรับเปลี่ยนแผนได้เสมอ" → **ย้ายไปเป็น skill แยก `qa-automate-readiness` แล้ว (30 ก.ย. 2026)** เพราะเป็นหลักการที่ QA ทั้งทีมต้องทำเหมือนกัน ไม่ใช่แค่เรื่อง automate — ดูขั้นตอนเต็มที่สกิลนั้น | 26 ก.ย. 2026 |
| R17 | ตอบเรื่อง SBH-1021 ข้อ 2 "อนุญาติให้บันทึกได้" (Claude ถามว่าบันทึก Triage กับผู้ป่วย AUTO ได้ไหม และทิ้งไว้ได้ไหมหลังการ์ดย้ายไปโซนเหลือง — แนะนำให้ทิ้งไว้แบบ R11) →<br>เทส**บันทึก Triage ให้ผู้ป่วย AUTO ที่เทสสร้างเองได้** และไม่ต้องล้าง (ผู้ป่วยย้ายจากคอลัมน์คัดกรองไปโซนตาม ESI) · ผู้ป่วยทีม (R15) ยังไม่ได้ขอ — ถามก่อน | 26 ก.ย. 2026 |
| R18 | ตอบหลังเล่น UAT-ER-02: "เมื่อกดปุ่มปริ้นป้ายปลายเตียงจะมี Network ที่ชื่อ PDF ขึ้นมาให้ Copy response ไปเปิดแท๊บใหม่จะแสดงเอกสารป้ายปลายเตียงขึ้นมา" →<br>**เช็คเอกสารพิมพ์ด้วย response PDF** ไม่ใช่ตัวพิมพ์จริง: ดัก `POST …/bedside-name-badge/pdf` (200 `application/pdf`) แล้วเปิด body ในแท็บใหม่ (`route().fulfill`) เช็คเนื้อหา · toast "ไม่สามารถพิมพ์ป้ายชื่อผู้ป่วยได้" (ไม่มี print agent `localhost:8081`) **ไม่ถือว่า fail** · วิธีเต็ม [er-flow.md](references/er-flow.md) §3.3 | 28 ก.ย. 2026 |
| R20 | "ปุ่ม Finalize คือปุ่มลงนาม ใช้แทนกันอนาคตให้ใช้คำว่าปุ่มลงนามแทน" → ขั้น "Finalize → FINALIZED" ในชีต = กด**ปุ่มลงนาม**ของ Disposition (+ "ลงนามต่อ" ถ้าเด้งเรื่องที่อยู่) สำเร็จ · ในรายงาน/ชื่อ step ใช้คำว่า "ปุ่มลงนาม" ไม่ใช้ Finalize | 28 ก.ย. 2026 |
| R21 | "หมอจะบันทึกได้ต้องกรอก Diagnosis ทุกครั้ง" → ขั้นบันทึก ER Physician Note ต้องเลือก Diagnosis (ICD) ก่อนบันทึกเสมอ (บันทึก memory แล้วด้วย) | 28 ก.ย. 2026 |
| R22 | "บันทึกซ้ำถ้าไม่ส่งผลอะไรก็ไม่เป็นไรให้ยึดตามนี้ไว้ก่อน" → Physician Note ส่ง contribution 2 ครั้งต่อการบันทึก 1 ครั้ง **ไม่ถือเป็นบั๊ก** ไม่ต้อง assert จำนวน | 28 ก.ย. 2026 |
| R23 | "อยากให้เพิ่มเงื่อนไขในการวงแดงในรูป 1. วงว่าเพิ่มข้อมูลอะไรไปบ้าง 2. กดปุ่มไหนไปบ้าง 3. กดแล้วมีข้อความแจ้งเตือนอย่างไร 4. ถ้ามี Expect ก็ให้วงตาม Expect Result" →<br>ภาพหลักฐาน (ทั้ง spec R13 และเล่นผ่าน MCP) **วงแดง 4 อย่าง พร้อมป้ายบนกรอบ**: `กรอก` ช่องที่ใส่ข้อมูล (ให้เห็นค่าที่กรอก) · `กด` ปุ่ม/ตัวเลือกที่กด · `แจ้งเตือน` toast / dialog / ข้อความแดงที่ขึ้นหลังกด · `Expected` สิ่งที่ Expected Result พูดถึง ·<br>แต่ละขั้นถ่าย **2 จังหวะ**: "ก่อนกด" (กรอก + ปุ่มที่จะกด — ปุ่มใน modal จะหายหลังกด) และ "หลังกด" (แจ้งเตือน + Expected — ถ่ายก่อน toast หาย ~4.5 วินาที) · ช่องอยู่ห่างกันเกินจอ → แยกภาพ ·<br>spec: `markEvidence(filled(…), clicked(…), alerted(…), expected(…))` + `snapEvidence(page, 'ก่อนกด — …')` ใน `helpers/functions/evidence.ts` (spec SBH-1013 / SBH-1021 ยังใช้แบบเดิม — ปรับตอนแก้ spec นั้นครั้งถัดไป) | 28 ก.ย. 2026 |
| R25 | "สั่งได้จริงแต่ให้ใช้ยา med0000005 med0000006 med0000007 med0000008" → สั่งยา / สั่ง Lab บน dev-x ได้ · **ยาใช้เฉพาะรหัส med0000005–med0000008** | 29 ก.ย. 2026 |
| R27 | UAT ที่มีหลายผู้ป่วยทำขั้นร่วมซ้ำ → ผู้ใช้เลือก **"เต็มแค่รายที่ 1"**: รายที่ 1 ถ่ายทุกขั้น (R23) · รายถัดไปทำขั้นร่วมครบแต่ถ่ายเฉพาะผลสำคัญ + ถ่ายเต็มที่ขั้นเฉพาะของกรณีตัวเอง · คลิปแยกรายละคลิป | 29 ก.ย. 2026 |
| R44 | "ขณะที่กำลังดำเนินการอยู่ อยากให้มีแจ้งสถานะว่าทำอะไรอยู่เป็นระยะๆ หรือติดปัญหาอะไร กำลังทำอะไร เป็นต้น" → **ระหว่างทำงานทุกงาน (ไม่เฉพาะ Prod) ให้เขียนข้อความสั้นๆ บอกผู้ใช้เป็นระยะ**: กำลังทำอะไร · ติดปัญหาอะไร ·<br>วิธีทำเป็นการตีความของ Claude (ผู้ใช้ยังไม่ได้ยืนยันรายละเอียด): บอก 1–2 บรรทัด **ก่อนเริ่มขั้นใหญ่** (อ่านการ์ด · สำรวจหน้าจอ · เขียน spec · รัน · แนบผล) · **ทันทีที่ติดปัญหา** (ติดที่ไหน · ข้อความ error · กำลังลองแก้อย่างไร / จะลองใหม่ หรือหยุดรอ) · **เมื่อจบแต่ละขั้น** (ผลสั้นๆ ผ่าน / ไม่ผ่าน) · คำสั่งที่รันนาน (รันเทสหลายนาที · วนรอ Prod กลับมา) บอกก่อนรันว่ารันอะไรและน่าจะใช้เวลาเท่าไร · ไม่ทำงานเงียบยาวหลายขั้นแล้วสรุปทีเดียวตอนจบ · ข้อความสรุปท้ายงานไม่ต้องเล่าซ้ำสิ่งที่แจ้งไปแล้ว · ใช้คู่กับ R31 (บอกก่อนแตะ Prod + รายงานทีละราย) | 9 ต.ค. 2026 |
| R47 | (เดิมจดเป็น R28 ใน commit 30 ก.ย. 2026 — เลขชนกับ R28 ของ SBH-1400 ตอน merge จึงเปลี่ยนเป็นข้อใหม่ 12 ต.ค. 2026) "อยากให้แยกการ run ต่อ module และ ต่อ flow e2e ได้" → ยืนยัน: "flow e2e" = สายงานเต็มข้ามหลาย module (เช่น ลงทะเบียน ER → ส่งต่อ OPD → Discharge) ต่างจากเทสรายการ์ดใน `tests/modules/<module>/` · รูปแบบคำสั่งที่เลือก = **npm script คงที่ต่อรายชื่อ** (ไม่ใช่ script รับ parameter) → เพิ่ม `test:module:er` (`tests/modules/er`) + `test:e2e` (`tests/E2E`) ใน `package.json` · module ใหม่ / flow e2e ไฟล์แรก ต้องกลับมาเพิ่ม script ใหม่ตาม pattern นี้ทุกครั้ง | 30 ก.ย. 2026 |
| R48 | "ฉันเปิดแล้ว (SBH-2528) … อาจจะให้คุณช่วยดู Format การเปิดการ์ดบั๊กไว้หน่อยเผื่ออนาคตจะให้คุณช่วยเปิดใหม่ มันจะมี 2 อย่าง 1 เปิดการ์ดใหม่เลยในโปรเจ็ค ER โดยใช้ Template Bug หรือ สร้างเป็น Sub-Issue ไว้เหมือน Test Case (SBH-2526)" →<br>**การ์ดบั๊กมี 2 แบบ**: (1) การ์ดใหม่ในโปรเจกต์ `[SBH] ER` ด้วย `Bug Template` (2) Sub-Issue ใต้การ์ดที่ทดสอบ · ชื่อ `[Bug][ER][<ฟีเจอร์>] - <สรุป>` · เนื้อหา = Environment & Context (URL/Environment · User Account) + Description เป็นข้อเลข แต่ละข้อมี Expected Result / Actual Result + ภาพตีกรอบแดง · label `🐞 BUG` + `VERSION <รุ่นปัจจุบัน>` + `Natthaphat ( MOD ) 🙈` · Priority High — รายละเอียดเต็ม + ตัวอย่างอยู่ในสกิล `cortex-card-test` ข้อ 9 ·<br>เปิดเมื่อผู้ใช้สั่งเท่านั้น (รอบนี้ผู้ใช้ให้ดูรูปแบบ ยังไม่ได้สั่งให้เปิด) · เกณฑ์เลือกแบบ 1 / 2 และ Assignee ผู้ใช้ยังไม่ได้บอก → ถามก่อนเปิดทุกครั้ง | 12 ต.ค. 2026 |
| R52 | ผู้ใช้อนุมัติให้นำ Flaky Test Doctor (qaskills.sh) มาปรับใช้ → เทส fail ให้วินิจฉัยตาม `references/fail-diagnosis.md` · ห้ามแก้ / skip เทสเองก่อนผู้ใช้อนุมัติ diff · ห้าม `--repeat-each` บน SBH Prod · คง `retries: 0` | 14 ต.ค. 2026 |
| R60 | "ทำเป็นกฏไว้หน่อยให้ Git pull วันล่ะ 1 ครั้งในครั้งแรกของวัน" (หลัง push 16 ต.ค. 2026 ชนกับงานที่อีกเครื่อง / session push เข้า Branch Jame — conflict ไฟล์สกิล 2 ไฟล์ · `evidence.ts` · SBH-1117 · เลขกฎ R54–R56 ซ้ำ) →<br>**งานแรกของวันในโปรเจกต์นี้ ก่อนแก้ไฟล์ใดๆ ให้ `git pull --rebase --autostash origin <branch ปัจจุบัน>`** · รู้ว่าวันนี้ pull แล้วหรือยังจากวันที่แก้ไขของ `.git/FETCH_HEAD` (ไม่ใช่วันนี้ = ยังไม่ pull · ไม่มีไฟล์ = ยังไม่เคย) ·<br>แจ้งผลสั้นๆ (ไม่มีอะไรใหม่ / ได้ commit ใหม่กี่อัน เรื่องอะไร) · **conflict = หยุด แจ้งผู้ใช้พร้อมไฟล์ที่ชน ก่อนแก้** · pull ไม่ได้ (เน็ต / VPN / สิทธิ์ GitHub) = แจ้งผู้ใช้แล้วทำงานต่อได้ · ตั้งเลขกฎใหม่ใน §7 หลัง pull เสมอ (กันเลขซ้ำกับอีกเครื่อง) | 16 ต.ค. 2026 |
| R61 | ผู้ใช้หยุดรอบ Retest SBH-1290 แล้วบอก "อยากให้ช่วยแก้ไขคลิปหน่อย 1 คลิปต่อ 1 เทสเคสไม่เอามารวมกันดูแล้วทำให้งง" → **คลิปหลักฐาน 1 ไฟล์ต่อ 1 TC** ไม่ใช้คลิปเดียวร่วมหลาย TC (เดิมทำบ่อย เช่น SBH-2482 · SBH-1290 · SBH-1103) · ใช้กับการแนบผลทุกการ์ดตั้งแต่นี้ · spec ที่ 1 เทสเล่นหลาย TC ต้องปรับให้แต่ละ TC ได้คลิปของตัวเอง (วิธีที่ผู้ใช้เลือกต่อการ์ดจดในประวัติ §10) | 18 ต.ค. 2026 |

### ขั้นตอนเมื่อได้การ์ดใหม่

อยู่ที่สกิล **`qa-automate-readiness`** (ย้ายไป 30 ก.ย. 2026 — เดิมคือ R16) · ตัวอย่างที่เคยทำตามขั้นตอน: SBH-1013, SBH-1021 (ดู changelog)

---

## 8) วิธีอัปเดตสกิลนี้

- ผู้ใช้สอน**กฎที่ใช้ทั่วไป** → เพิ่มแถวใน §7 (วันที่ + ใจความตามคำผู้ใช้ ไม่แต่งเพิ่ม) · **คำตอบเฉพาะงานหนึ่ง** → ต่อท้าย `references/decisions.md` ด้วยเลขถัดไป
- กฎใหม่ขัดกับของเดิม → แก้แถวเดิม (ไม่เก็บสองแบบ) · ไม่แน่ใจว่า "แทนที่" หรือ "เพิ่ม" → ถาม
- ข้อใน §5 ได้คำตอบ → ย้ายไป §7 · ผู้ใช้สั่งเปลี่ยนค่าใน §4 → แก้ config ด้วย แล้วย้ายไป §7
- ความรู้หน้าจอใหม่ → `references/screens/<โมดูล>.md` เป็น `###` ใหม่ท้ายไฟล์ (ระบุระบบ + วันที่ + ไฟล์แอป) · โมดูลใหม่ → สร้างไฟล์ใหม่แล้วเพิ่มแถวในตาราง §9
- ไฟล์ / สเปกใหม่ → เพิ่มบรรทัดใน `references/project-map.md` (บรรยายสั้น รายละเอียดอยู่หัวไฟล์สเปก) · คำสั่งใหม่ → §3 หรือ `references/commands-mock-data.md`
- แก้ทุกครั้ง → เพิ่ม 1 บรรทัดท้าย `references/changelog.md` (ไม่ลงในไฟล์นี้)
- **คุมขนาด**: SKILL.md นี้ไม่ควรเกิน ~60 KB · ไฟล์ screens แต่ละไฟล์เกิน ~100 KB ให้แยกตามหน้าจอย่อย

---

## 9) ความรู้หน้าจอ Cortex สำหรับเขียน automate

อยู่ใน `references/screens/` แยกตามโมดูล — **โหลดเฉพาะไฟล์ของโมดูลที่การ์ด / งานนั้นแตะ** (Grep ชื่อหน้าจอ / class / URL ก่อน แล้ว Read ช่วงที่เจอ)

| ไฟล์ | ครอบคลุม | โหลดเมื่อ |
|------|----------|-----------|
| [screens/general.md](references/screens/general.md) | ล็อกอิน · เวลาโหลดหน้า · Playwright MCP · ความรู้ทั่วไปจากเทสมือ | ทุกงานที่เขียน / แก้สเปก (ไฟล์เล็ก) |
| [screens/er.md](references/screens/er.md) | บอร์ด ER · Triage · Disposition / ประวัติ · รายงานสถิติ / คุณภาพ · CPR · Nursing Records · Treatment Timeline · ป้ายปลายเตียง · เรียงคิว | การ์ดโมดูล ER |
| [screens/er-uat-scenario.md](references/screens/er-uat-scenario.md) | Mock Data UAT ER · เล่น Scenario UAT ER บน dev-x / SBH Prod | งาน Mock Data / Scenario ER |
| [screens/opd.md](references/screens/opd.md) | Consult · Activity (หัตถการ) · คำขอ Walk-in · ใบนำทาง / คิว · ใบนัดหมาย · BizSim OPD | การ์ดโมดูล OPD / Scenario OPD |
| [screens/pharmacy-refill.md](references/screens/pharmacy-refill.md) | Order Refill ครบวงจร · ใบยา (สร้าง / ย้อน / ยกเลิก) · สิทธิ UC ของยา · ยานอกบัญชี F · Co-pay | การ์ด Refill / ห้องยา / สิทธิยา |
| [screens/refer.md](references/screens/refer.md) | MOPH Refer เข้า · แถบ MOPH Refer · Refer Out จาก EMR OPD · Discharge แบบ Refer out | งาน Refer |
| [screens/cashier.md](references/screens/cashier.md) | การเงิน — ปิด Visit | ขั้นปิด Visit / ชำระเงิน |
| [screens/sbh-prod.md](references/screens/sbh-prod.md) | พฤติกรรมเฉพาะ SBH Prod (ความไม่นิ่ง · ผลรัน Mock บน Prod) | ทุกงานที่รันบน SBH Prod |
| [er-flow.md](references/er-flow.md) | flow ER เต็ม ผู้ป่วยใหม่ → Visit → Triage (+ สุ่มเลขบัตร 13 หลัก) | เขียนสเปกที่สร้างผู้ป่วย / Triage |
| [fail-diagnosis.md](references/fail-diagnosis.md) | วินิจฉัยเทส fail (R52) | เทส fail |

---

## 10) ประวัติการปรับ

อยู่ที่ [references/changelog.md](references/changelog.md) — ไม่ต้องอ่านตอนทำงาน · แก้สกิลแล้วเพิ่ม 1 บรรทัดท้ายไฟล์นั้น
