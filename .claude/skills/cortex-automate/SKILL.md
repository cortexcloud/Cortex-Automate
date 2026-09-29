---
name: cortex-automate
description: สมุดกฎและคู่มือของโปรเจกต์ QA Automation ระบบ Cortex Cloud HIS ด้วย Playwright + TypeScript ที่โฟลเดอร์ "Cortex Automate" — กฎการทำงาน/ขั้นตอนที่ผู้ใช้กำหนด (ผู้ใช้จะสอนเพิ่มและปรับเรื่อยๆ ต้องอัปเดตสกิลนี้ทุกครั้งที่มีกฎใหม่), โครงสร้างโปรเจกต์, คำสั่งรัน, การล็อกอิน Keycloak อัตโนมัติจาก .env แยกตาม role (Super_User/Doctor/Nurse), ความรู้หน้าจอ Cortex สำหรับเขียน locator และรายการเรื่องที่ยังไม่ได้ตกลง (ต้องถามผู้ใช้ก่อน). ใช้สกิลนี้ทุกครั้งที่งานเกี่ยวกับ automate test แม้ไม่ได้พูดคำว่า Playwright เช่น "เขียน automate", "เขียนสคริปต์เทส", "สร้าง spec", "แปลง test case เป็น automate", "รัน automate", "รัน playwright", "รัน smoke test", "เทส fail ดูให้หน่อย", "เปิด report", "codegen", "page object", "locator/selector", "flaky" หรือเมื่อผู้ใช้สอน/เปลี่ยนกฎการทำงานของโปรเจกต์ automate. ไม่ใช่สำหรับเทสมือผ่าน Chrome ของผู้ใช้ (er-run-test) หรือเขียน Test Case ลง Excel/Linear (write-test-case, linear-execution-test)
---

# Cortex Automate — Playwright + TypeScript

สกิลนี้เป็น **สมุดกฎที่ปรับได้เรื่อยๆ** ของโปรเจกต์ automate: ผู้ใช้จะค่อยๆ อธิบายกฎและขั้นตอนการทำงานเพิ่ม และเปลี่ยนของเดิมได้
ผู้ใช้สอนหรือเปลี่ยนอะไร → **แก้ไฟล์นี้ทันทีตาม §8** เพื่อให้ session ถัดไปทำงานตามกฎล่าสุด

---

## 1) หลักที่ใช้ตลอด

1. **สงสัยตรงไหน ถามผู้ใช้ก่อน** (ผู้ใช้สั่งตอนเริ่มโปรเจกต์ 26 ก.ย. 2026) — โดยเฉพาะเรื่องใน §5 ห้ามเดาแล้วลงมือเอง
   ถ้ามีหลายเรื่อง รวบถามครั้งเดียว พร้อมตัวเลือกที่แนะนำ
2. ตอบผู้ใช้เป็นภาษาไทยเสมอ (ศัพท์เทคนิค/ชื่อเมนู/ชื่อการ์ดเป็นอังกฤษได้)
3. รันกับ dev-x (`https://dev-x.cortexcloud.co`) เท่านั้น — ผู้ใช้ยืนยันว่าเป็น Dev/UAT ยังไม่มี Prod · ห้ามชี้ `BASE_URL` ไป production
4. ความลับ (user/pass, session) ทำตาม §6 ทุกกรณี
5. อ่านโค้ด/ไฟล์ของผู้ใช้ก่อนออกแบบ — เช่น `.env` ที่ผู้ใช้ตั้ง user แยก role เอง: **ปรับโค้ดให้ตามรูปแบบของผู้ใช้** ไม่ใช่ให้ผู้ใช้แก้ตามโค้ด
6. ได้การ์ดใหม่ → ทำตาม**ขั้นตอน R16** (§7) ก่อนเขียนโค้ดเสมอ: เข้าใจการ์ด → ตรวจ TC ใน Sub-Issue ว่าครอบคลุมไหม → วางแผน

---

## 2) โปรเจกต์

`C:\Users\SuchatChancherngsila\OneDrive - บริษัท เอช แล็บ จำกัด\Desktop\Cortex Automate`

```
Cortex Automate/
├─ playwright.config.ts            ค่ากลาง + projects: setup → chrome
├─ tests/
│  ├─ auth.setup.ts                เตรียม session ของ role ใน ROLES_IN_USE (ใช้ของเดิมถ้ายังไม่หมดอายุ) → .auth/<Role>.json
│  ├─ smoke/app-launcher.spec.ts   เทสตัวอย่าง (Super_User): เปิด /cortex/apps หลังล็อกอิน
│  └─ er/SBH-1013-open-visit-er.spec.ts   การ์ด SBH-1013: 2 เทสตาม flow (ผู้ป่วยใหม่ที่ไม่เคยมีในระบบ / ผู้ป่วยทีมที่มี HN อยู่แล้ว + ยกเลิก Visit หลังเทส) · step ตาม TC-001–006 ของชุด EXE SBH-1702
│     er/SBH-1021-triage-form.spec.ts     การ์ด SBH-1021: 1 เทส ผู้ป่วย AUTO ใหม่ → กรอกฟอร์ม Triage จนบันทึก + โหลดหน้าใหม่เช็คค่าที่บันทึก · step ตาม TC-001–008 ของชุด EXE SBH-1739
├─ helpers/er.ts                   ขั้นตอนหน้าจอ ER ที่ใช้ซ้ำ: เข้า Dashboard · หน้าคัดกรอง · ค้นผู้ป่วย (searchPatients) · สุ่มผู้ป่วยทีม (pickTeamPatient) ·
│                                  ลงทะเบียนผู้ป่วยใหม่ · เลือกผู้ป่วยมี HN · จด Visit ที่เปิด (trackOpenedErVisits) · ยกเลิก Encounter (cancelErEncounter) ·
│                                  modal เปิด Visit ER · แถบหัว Visit (expectVisitHeader) · หน้า Triage ของ Visit · การ์ดบนบอร์ด (showDashboardCard) ·
│                                  กลับ Dashboard ผ่านเมนู · expectOk() (API error พร้อม body)
├─ helpers/er-triage.ts            ฟอร์ม "คัดกรอง ER": triageForm · กรอก Vital Signs · Pain score · แถว MEWS · เลือก GCS (chooseGcs) · อุปกรณ์ช่วยเหลือ / ผู้ที่มาด้วย ·
│                                  labelledBox() (กล่อง Total MEWS / Total GCS / ผล Triage)
├─ helpers/evidence.ts             checkStep() — step ที่แนบภาพ "ผ่าน — …" / "Error — …" ลงรายงาน · markEvidence() — กรอบแดงในภาพ (R13) + ป้าย filled/clicked/alerted/expected (R23) · snapEvidence() — ภาพกลาง step เช่น "ก่อนกด"
├─ helpers/fixtures.ts             test / expect ของโปรเจกต์ (เทสทุกไฟล์ import จากที่นี่) — อัดวิดีโอด้วย page.screencast เริ่มหลังหน้าแรกโหลดเสร็จ (R13)
├─ helpers/test-data.ts            newTestPatient(label) — ชื่อ AUTO + นามสกุล label+เวลาไทย · randomThaiId()
├─ utils/env.ts                    DEFAULT_ROLE · ROLES_IN_USE · authFile(role) · getCredentials(role) · listRoles()
├─ utils/session.ts                isSessionAlive() — ถาม Keycloak ว่า session เดิมยังใช้ได้ไหม
├─ .env (.env.example)             BASE_URL + CORTEX_USERNAME_<Role> / CORTEX_PASSWORD_<Role>
├─ .auth/<Role>.json               session หลังล็อกอิน (สร้างใหม่ทุกรอบ)
├─ test-results/ playwright-report/   ผลรัน (ล้างใหม่ทุกรอบ)
└─ .claude/skills/cortex-automate/    สกิลนี้
```

- Node.js 24 LTS (winget → `C:\Program Files\nodejs`) · `@playwright/test` 1.63 · TypeScript 7 (`tsc` ตัว native) · `@types/node` 24
- Browser = Google Chrome ที่ติดตั้งในเครื่อง (`channel: 'chrome'`, v153 ณ 26 ก.ย. 2026) — ไม่ได้โหลด Chromium ของ Playwright มีแค่ ffmpeg ไว้อัดวิดีโอ
- `.env` โหลดด้วย `process.loadEnvFile` ของ Node (ไม่ได้ใช้ dotenv)
- role ใน `.env`: **Super_User · Doctor · Nurse** · เทสใช้ Super_User เป็นค่าตั้งต้น (R6)
  เทสไหนต้องใช้ role อื่น: (1) มีคู่ตัวแปรใน `.env` (2) เพิ่มชื่อ role ใน `ROLES_IN_USE` (`utils/env.ts`) (3) ใส่ `test.use({ storageState: authFile('<Role>') })` ในไฟล์เทส
- มี `.gitignore` แล้ว แต่**ยังไม่ได้ `git init`** (ดู §5)
- โฟลเดอร์อยู่ใน OneDrive — ถ้า `npm install` เจอ `EPERM` / `EBUSY` ให้ผู้ใช้หยุด sync ชั่วคราวแล้วลองใหม่

---

## 3) คำสั่ง

| ทำอะไร | คำสั่ง |
|--------|--------|
| รันทั้งหมด (ไม่เปิดจอ) | `npm test` |
| รันบางไฟล์ / บางชื่อ | `npx playwright test tests/smoke` · `npx playwright test -g "ชื่อเทส"` |
| รันเฉพาะการ์ด / TC (tag) | `npx playwright test --grep @SBH-1013` · `--grep @SBH-1709` (เลข TC รันทั้งเทสที่มี step นั้น) |
| เปิดจอดูตอนรัน | `npm run test:headed` · เฉพาะการ์ด `npm run test:headed -- --grep @SBH-1013` (PowerShell 5.1 ส่ง `--` และ `@SBH-...` ต่อได้ปกติ — ตรวจแล้ว) |
| โหมด UI (เลือกเทส ดูทีละ step) | `npx playwright test --project=setup` ก่อน แล้ว `npx playwright test --ui --project=chrome` = **`npm run test:ui`** (แก้ script แล้ว 26 ก.ย. 2026 หลังผู้ใช้เจอว่า `npx playwright test --ui` ไม่เห็น SBH-1013) · เห็น Chrome จริงด้วย: `npm run test:ui -- --headed` · **อย่าใช้ `npx playwright test --ui` เฉยๆ** เหตุผลด้านล่าง |
| debug ทีละบรรทัด | `npm run test:debug` |
| เปิดรายงานล่าสุด | `npm run report` |
| อัดการกดเป็นโค้ด (Super_User) | `npm run codegen` — ต้องมี `.auth/Super_User.json` จากการรันสักรอบก่อน |
| อัดเป็น role อื่น | `npx playwright codegen --channel=chrome --viewport-size=1920,1080 --load-storage=.auth/Doctor.json https://dev-x.cortexcloud.co/cortex/apps` |
| เช็ค type | `npm run typecheck` |
| บังคับล็อกอินใหม่ | ลบ `.auth/<Role>.json` แล้วรัน (แก้ `.env` ก็ล็อกอินใหม่เอง) |
| เตรียม session อย่างเดียว | `npx playwright test --project=setup` |

**Claude รันเอง (Bash tool)** — shell ของ Claude ยังไม่เห็น PATH ของ Node จนกว่าจะเปิดแอปใหม่:

```bash
export PATH="/c/Program Files/nodejs:$PATH"; cd "/c/Users/SuchatChancherngsila/OneDrive - บริษัท เอช แล็บ จำกัด/Desktop/Cortex Automate" && npx playwright test
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
| Timeout | test 60s · expect 20s · action 20s · navigation 30s | เปิดหน้า Cortex แต่ละครั้ง ~11 วินาที (§9) |
| trace | เก็บเฉพาะตอน fail (`retain-on-failure`) ทุก project รวม setup (R14) · project `chrome` ไม่เก็บภาพใน trace (`screenshots: false`) | ไฟล์ใหญ่และมี cookie/ค่าที่พิมพ์ เก็บเฉพาะรอบที่ต้องไล่สาเหตุ — วิดีโอกับภาพเป็นกฎ R13 · ภาพของ trace ใช้ screencast ร่วมกับวิดีโอแล้วทำวิดีโอเล็กลง (§9) |
| ชื่อเทส | ภาษาไทย บอกว่าเช็คอะไร (+ role ในวงเล็บ) | |
| เช็ค session เดิม | ถาม Keycloak แบบ `prompt=none` (`utils/session.ts`) + ถ้า `.env` ใหม่กว่าไฟล์ session ถือว่าใช้ไม่ได้ | เร็ว (~0.5–1 วินาที) และจับกรณีเปลี่ยน user ใน `.env` ได้ |

---

## 5) เรื่องที่ยังไม่ได้ตกลง — ถามผู้ใช้ก่อนทำ

- **ขั้นตอนการทำงานช่วงท้าย** (รัน → รายงานผล) — ผู้ใช้บอกว่าจะอธิบายเอง · ช่วงต้น (เข้าใจการ์ด → ตรวจ TC → วางแผน) ผู้ใช้กำหนดแล้วใน R16
- เทสที่ **แก้/ส่งต่อ** ข้อมูลบน dev-x (เช่น ส่งต่อคลินิก, ยกเลิก Visit ที่เทสไม่ได้เปิดเอง, บันทึก Triage ให้ผู้ป่วยทีม) รันได้เลยไหม —
  ที่ตกลงแล้ว: สร้างผู้ป่วยใหม่ + เปิด Visit (R10, R11) · เปิด Visit ให้ผู้ป่วยทีมแล้ว**ยกเลิก Encounter ที่เทสเปิดเอง** (R15) · บันทึก Triage ให้ผู้ป่วย AUTO (R17)
- รายงานผลให้ใคร รูปแบบไหน (HTML report / Excel / Linear) · เจอบั๊กจาก automate รายงานแบบไหน
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

| # | กฎ | ตั้งเมื่อ |
|---|----|-----------|
| R1 | สงสัยตรงไหนให้ถามผู้ใช้ก่อน | 26 ก.ย. 2026 |
| R2 | ล็อกอินอัตโนมัติด้วย user/pass จาก `.env` ที่ผู้ใช้กรอกเอง (setup project + storageState) | 26 ก.ย. 2026 |
| R3 | เก็บสกิลนี้ไว้ในโฟลเดอร์โปรเจกต์ `Cortex Automate\.claude\skills\` | 26 ก.ย. 2026 |
| R4 | user ทดสอบแยกตาม role ใน `.env` ชื่อ `CORTEX_USERNAME_<Role>` / `CORTEX_PASSWORD_<Role>` (ตอนนี้ Super_User, Doctor, Nurse — ผู้ใช้ตั้งเอง) | 26 ก.ย. 2026 |
| R5 | "ใช้ session เดิมถ้ายังไม่หมดอายุ เพื่อลดเวลาล็อกอิน" → setup เช็คก่อน ใช้ได้ก็ข้ามการล็อกอิน | 26 ก.ย. 2026 |
| R6 | "ขณะที่กำลังสร้าง Test Case สามารถใช้ Super User ไปก่อนก็ได้" → role ตั้งต้นของ project `chrome` = Super_User และ setup เตรียมแค่ role ใน `ROLES_IN_USE` (ตอนนี้มีแค่ Super_User) | 26 ก.ย. 2026 |
| R7 | ผู้ใช้สั่ง "เข้าเว็บ Cortex และเข้า Module ER ให้ดู" → เปิดผ่าน Playwright MCP แล้วให้ Claude ล็อกอินเองจาก `.env` (ผู้ใช้เลือกแบบนี้ ดูวิธีใน §6) | 26 ก.ย. 2026 |
| R8 | เลขบัตรประชาชนของผู้ป่วยทดสอบ: ผู้ใช้เลือก "ให้ Claude สุ่มเลขทดสอบ" (13 หลัก checksum ถูกต้อง — โค้ดใน [references/er-flow.md](references/er-flow.md)) แทนการให้ผู้ใช้พิมพ์เอง | 26 ก.ย. 2026 |
| R9 | "สร้างแบบ 2 เทสตาม Flow" (ตอบเรื่อง SBH-1013 — ผู้ใช้เลือกตัวเลือกที่ Claude เสนอ) → **1 เทส = 1 flow** (เช่น ตามที่มาของผู้ป่วย) ไม่ใช่ 1 เทสต่อ TC · `test.step` ตั้งชื่อ `TC-xxx (SBH-xxxx) <สิ่งที่เช็ค>` ตามชุด Manual ใต้ EXE ของการ์ด · tag เลขการ์ด + เลข TC · ไฟล์ `tests/<โมดูล>/SBH-<เลข>-<ชื่อ>.spec.ts` · ส่วนที่ใช้ซ้ำแยกไว้ `helpers/` (ไม่ใช่ Page Object เต็มรูป) | 26 ก.ย. 2026 |
| R10 | "สร้างคนไข้ใหม่ทุกรอบ" → flow **ผู้ป่วยใหม่** สร้างผู้ป่วยเองทุกรอบด้วย `newTestPatient()` ชื่อ `AUTO` (flow ผู้ป่วยมี HN เปลี่ยนเป็นตาม R15) | 26 ก.ย. 2026 |
| R11 | ข้อมูลที่เทสทิ้งไว้บน dev-x (ผู้ป่วย AUTO + Visit ค้างในคอลัมน์ "คัดกรอง" ที่ทั้งทีมเห็น) — ผู้ใช้ "รับได้" → ไม่ต้องยกเลิก/ล้างหลังเทส (เฉพาะผู้ป่วย AUTO — Visit ที่เปิดให้ผู้ป่วยทีมต้องยกเลิก R15) | 26 ก.ย. 2026 |
| R12 | "ผูกกับหน่วยบริการ ER Room" (TC-001 SBH-1707): "ตอนนี้เช็คแค่ว่าได้ EN และขึ้นบน ER Dashboard" → **ยังไม่เช็คชื่อคลินิก** (modal โชว์ "ห้องตรวจแผนกฉุกเฉิน" แต่ Visit ได้ "ห้องตรวจนอกเวลาราชการ" `clinicId 6` — รอรู้กฎก่อน) | 26 ก.ย. 2026 |
| R13 | "ทุกครั้งที่รันเทสมีเก็บผลเป็นรูปแบบ Video และใน Report อยากให้มีการแสดงรูปภาพในจุดที่ Expect ไว้ด้วย หากพบว่ามี Error ก็อยากให้เป็นผลที่ Error ไว้ด้วย" →<br>**วิดีโอทุกเทสทุกรอบ** 1920×1080 — เทส: fixture ใน `helpers/fixtures.ts` (เริ่มอัดหลังหน้าแรกโหลดเสร็จ) · setup: `video: on` ของ config (R14) · **step ของ TC ต้องใช้ `checkStep()`** (`helpers/evidence.ts`) ซึ่งแนบภาพ `ผ่าน — <step>` ตอนเช็ค Expected ครบ / `Error — <step>` ตอนพัง ไว้ใต้ step ในรายงาน · `screenshot: only-on-failure` คงไว้เป็นภาพท้ายเทสกันพังนอก step ·<br>ผู้ใช้ติ (26 ก.ย. 2026) "ภาพไม่ตรงกับ Expect" + "Video ยังมีหน้าขาวในช่วงแรก" → **ภาพต้องเห็นสิ่งที่ Expected พูดถึง**: ปิด step ด้วย `markEvidence(<สิ่งที่เช็ค>)` · TC ที่เช็คหลายสถานะ (เลือก → ยกเลิก, ค่าเปลี่ยนตาม) แยก `checkStep` ย่อยทีละสถานะ · ปิด toast ที่บังแถบหัว (`dismissToast`) · Expected ที่ไม่มีบนจอ (เช่น EN บนบอร์ด) แนบข้อมูล API เป็น JSON ใต้ step · **วิดีโอไม่มีช่วงจอขาวตอนโหลดแอป** | 26 ก.ย. 2026 |
| R14 | "ฉันอนุญาติไม่ต้องมีการปกปิดตอน Login ให้บันทึกได้ปกติ" (ตอบหลัง Claude แจ้งว่าขั้นล็อกอินไม่อัดวิดีโอเพราะมีการกรอกรหัสผ่าน) →<br>project `setup` ใช้ค่าบันทึกเดียวกับเทสอื่น (วิดีโอ · trace / ภาพตอน fail) ไม่ override แล้ว · ข้อห้ามใน §6 ที่มีไว้กันรหัสผ่านเข้าผลเทสยกเลิก (ยังไม่พิมพ์รหัสลงแชท / ไฟล์ที่ Claude เขียน) | 26 ก.ย. 2026 |
| R15 | "ขอแยกเป็นแบบนี้ในกรณีที่สร้างผู้ป่วยใหม่ --> ต้องไม่เคยมีคนไข้อยู่ในระบบมาก่อน แต่ถ้า เลือกผู้ป่วยที่มี HN --> ให้ใช้คนไข้ที่มีอยู่ในระบบแล้ว" + เลือกตัวเลือก **"สุ่มคนไข้ทดสอบของทีม"** (ชื่อขึ้นต้น "คนไข้" ที่ไม่อยู่บน ER Dashboard แบบเทสมือ และยกเลิก Visit ท้ายเทส) →<br>**ผู้ป่วยใหม่**: ก่อนลงทะเบียนค้นชื่อเต็มในช่องค้นหา ต้องไม่พบ (TC-003 ขั้น 3) · **ผู้ป่วยมี HN**: `pickTeamPatient()` สุ่มผู้ป่วยทีมที่ไม่มี Encounter / Admission ค้าง (Claude ทำเข้มกว่า "ไม่อยู่บนบอร์ด" เพราะเจอคนที่ Admit อยู่ → เปิด Visit ได้ 400 และ Visit ER ค้างข้ามวันที่บอร์ดไม่แสดง — แจ้งผู้ใช้แล้ว) ·<br>Visit ที่เปิดให้ผู้ป่วยทีมต้อง**ยกเลิก Encounter** เป็นขั้นสุดท้ายของเทส และ `afterEach` ยกเลิกให้ถ้าเทสพังกลางทาง (เช็ค EN ใน modal ก่อนกดยืนยันทุกครั้ง) | 26 ก.ย. 2026 |
| R16 | "ครั้งหน้าก่อนอยากให้เริ่มทำความเข้าใจกับการ์ดก่อนและจึงจะตรวจสอบ Test Case ที่อยู่ใน Sub-Issue แล้วลองพิจราณาว่า Test Case ครอบคุมไหม ถ้าไม่ครอบคุมคิดว่าต้องเพิ่มอะไรบ้างลองเสนอ Test Case ให้ User ได้แต่ถ้าครอบคลุมแล้วข้ามผ่านขั้นนี้ได้เลย ก่อนจะเขียน Code ให้วางแผนก่อนว่าจะเขียนยังไงให้ครอบคลุมเพื่อลดความผิดพลาด แต่ถ้าจุดไหนที่คิดว่าไม่มีประสิทธิภาพในการทำงานสามารถเสนอให้ User พิจราณาปรับเปลี่ยนแผนได้เสมอ" → ขั้นตอนด้านล่าง | 26 ก.ย. 2026 |
| R17 | ตอบเรื่อง SBH-1021 ข้อ 2 "อนุญาติให้บันทึกได้" (Claude ถามว่าบันทึก Triage กับผู้ป่วย AUTO ได้ไหม และทิ้งไว้ได้ไหมหลังการ์ดย้ายไปโซนเหลือง — แนะนำให้ทิ้งไว้แบบ R11) →<br>เทส**บันทึก Triage ให้ผู้ป่วย AUTO ที่เทสสร้างเองได้** และไม่ต้องล้าง (ผู้ป่วยย้ายจากคอลัมน์คัดกรองไปโซนตาม ESI) · ผู้ป่วยทีม (R15) ยังไม่ได้ขอ — ถามก่อน | 26 ก.ย. 2026 |

| R18 | ตอบหลังเล่น UAT-ER-02: "เมื่อกดปุ่มปริ้นป้ายปลายเตียงจะมี Network ที่ชื่อ PDF ขึ้นมาให้ Copy response ไปเปิดแท๊บใหม่จะแสดงเอกสารป้ายปลายเตียงขึ้นมา" →<br>**เช็คเอกสารพิมพ์ด้วย response PDF** ไม่ใช่ตัวพิมพ์จริง: ดัก `POST …/bedside-name-badge/pdf` (200 `application/pdf`) แล้วเปิด body ในแท็บใหม่ (`route().fulfill`) เช็คเนื้อหา · toast "ไม่สามารถพิมพ์ป้ายผู้ป่วยได้" (ไม่มี print agent `localhost:8081`) **ไม่ถือว่า fail** · วิธีเต็ม [er-flow.md](references/er-flow.md) §3.3 | 28 ก.ย. 2026 |
| R19 | "ให้ตัดตัวเลือก Routine Discharge ออกโดยดึงตัวเลือกตามที่มีอยู่ใน Form จนกว่าจะมีอัพเดทใหม่เพิ่มเติม" → ขั้น Disposition ในชีต UAT (Routine Discharge / AMA / Escape ฯลฯ) **ใช้ตัวเลือกที่มีในฟอร์มจริง** (สถานะการจำหน่าย + วิธีการจำหน่าย) ไม่หาตัวเลือกตามชื่อในชีต · กรณีปกติใช้ Improved + With Approval | 28 ก.ย. 2026 |
| R20 | "ปุ่ม Finalize คือปุ่มลงนาม ใช้แทนกันอนาคตให้ใช้คำว่าปุ่มลงนามแทน" → ขั้น "Finalize → FINALIZED" ในชีต = กด**ปุ่มลงนาม**ของ Disposition (+ "ลงนามต่อ" ถ้าเด้งเรื่องที่อยู่) สำเร็จ · ในรายงาน/ชื่อ step ใช้คำว่า "ปุ่มลงนาม" ไม่ใช้ Finalize | 28 ก.ย. 2026 |
| R21 | "หมอจะบันทึกได้ต้องกรอก Diagnosis ทุกครั้ง" → ขั้นบันทึก ER Physician Note ต้องเลือก Diagnosis (ICD) ก่อนบันทึกเสมอ (บันทึก memory แล้วด้วย) | 28 ก.ย. 2026 |
| R22 | "บันทึกซ้ำถ้าไม่ส่งผลอะไรก็ไม่เป็นไรให้ยึดตามนี้ไว้ก่อน" → Physician Note ส่ง contribution 2 ครั้งต่อการบันทึก 1 ครั้ง **ไม่ถือเป็นบั๊ก** ไม่ต้อง assert จำนวน | 28 ก.ย. 2026 |
| R23 | "อยากให้เพิ่มเงื่อนไขในการวงแดงในรูป 1. วงว่าเพิ่มข้อมูลอะไรไปบ้าง 2. กดปุ่มไหนไปบ้าง 3. กดแล้วมีข้อความแจ้งเตือนอย่างไร 4. ถ้ามี Expect ก็ให้วงตาม Expect Result" →<br>ภาพหลักฐาน (ทั้ง spec R13 และเล่นผ่าน MCP) **วงแดง 4 อย่าง พร้อมป้ายบนกรอบ**: `กรอก` ช่องที่ใส่ข้อมูล (ให้เห็นค่าที่กรอก) · `กด` ปุ่ม/ตัวเลือกที่กด · `แจ้งเตือน` toast / dialog / ข้อความแดงที่ขึ้นหลังกด · `Expected` สิ่งที่ Expected Result พูดถึง ·<br>แต่ละขั้นถ่าย **2 จังหวะ**: "ก่อนกด" (กรอก + ปุ่มที่จะกด — ปุ่มใน modal จะหายหลังกด) และ "หลังกด" (แจ้งเตือน + Expected — ถ่ายก่อน toast หาย ~4.5 วินาที) · ช่องอยู่ห่างกันเกินจอ → แยกภาพ ·<br>spec: `markEvidence(filled(…), clicked(…), alerted(…), expected(…))` + `snapEvidence(page, 'ก่อนกด — …')` ใน `helpers/evidence.ts` (spec SBH-1013 / SBH-1021 ยังใช้แบบเดิม — ปรับตอนแก้ spec นั้นครั้งถัดไป) | 28 ก.ย. 2026 |
| R24 | UAT-ER-01 ถามว่าผู้ป่วย "มี HN เดิม" ใช้ใคร → ผู้ใช้เลือก **"สร้าง AUTO ใหม่ก่อน"**: ลงทะเบียน AUTO ใหม่ (รู้เลขบัตร) แล้วกด `ยกเลิก` ที่ modal เปิด Visit (ได้ HN ไม่มี Visit) จากนั้นเล่นเคสแบบ "ผู้ป่วยมี HN" · ใช้กับเคส UAT ที่ต้องค้นด้วยเลขบัตร (R15 ยังใช้กับ spec SBH-1013) | 29 ก.ย. 2026 |
| R25 | "สั่งได้จริงแต่ให้ใช้ยา med0000005 med0000006 med0000007 med0000008" → สั่งยา / สั่ง Lab บน dev-x ได้ · **ยาใช้เฉพาะรหัส med0000005–med0000008** | 29 ก.ย. 2026 |
| R26 | หมายเหตุชีต UAT-ER-01 "ต้องกด จ่ายบางส่วน" (กรณี 1.3, 1.4) → **ข้ามไปก่อน** ลงหมายเหตุไว้ | 29 ก.ย. 2026 |
| R27 | UAT ที่มีหลายผู้ป่วยทำขั้นร่วมซ้ำ → ผู้ใช้เลือก **"เต็มแค่รายที่ 1"**: รายที่ 1 ถ่ายทุกขั้น (R23) · รายถัดไปทำขั้นร่วมครบแต่ถ่ายเฉพาะผลสำคัญ + ถ่ายเต็มที่ขั้นเฉพาะของกรณีตัวเอง · คลิปแยกรายละคลิป | 29 ก.ย. 2026 |

### ขั้นตอนเมื่อได้การ์ดใหม่ (R16)

1. **ทำความเข้าใจการ์ด** — description · AC · scope · ภาพประกอบ · คอมเมนต์ · การ์ด/บั๊กที่ลิงก์ไว้ ให้รู้ว่าฟีเจอร์ต้องทำอะไรและอะไรอยู่นอก scope
2. **ตรวจ Test Case ใน Sub-Issue** — โครงสร้างที่เจอใน SBH-1013: การ์ด → `EXE - CT - <โมดูล> / VERSION x` (มี Pre-condition + Scope หมายเหตุ เช่น เคสที่ย้ายไปทดสอบในการ์ดอื่น)
   → `SC-00x` (Scenario) → `TC-00x` (Test Step + Expected Result + ผลเทสมือพร้อมวิดีโอ/ภาพ)
3. **ครอบคลุมไหม** — จับคู่ AC / scope ของการ์ดกับ TC ทีละข้อ
   - ไม่ครอบคลุม → เสนอ TC ที่ควรเพิ่มให้ผู้ใช้ พร้อมบอกว่าเติมช่องว่างข้อไหนของการ์ด (เสนอในแชท — จะเพิ่มลง Linear ไหม ผู้ใช้ตัดสิน)
   - ครอบคลุมแล้ว → ข้ามขั้นนี้
4. **วางแผนก่อนเขียนโค้ด** ให้ครอบคลุมเพื่อลดความผิดพลาด — flow ต่อเทส (R9) · ข้อมูลทดสอบ (R10, R15) · จุดที่เช็คของแต่ละ TC + ภาพหลักฐาน (R13) · การล้างข้อมูล · เรื่องที่ต้องถาม (R1)
5. เห็นจุดไหนไม่มีประสิทธิภาพ (ในแผน หรือในขั้นตอนนี้เอง) → เสนอผู้ใช้ปรับแผนได้เสมอ

วิธีส่งงานของ Claude: ส่งสรุปการ์ด + ผลตรวจ TC (+ TC ที่เสนอ) + แผน ในข้อความเดียวก่อนเขียนโค้ด · ถ้ามี TC ที่เสนอหรือเรื่องให้เลือก → รอคำตอบก่อนลงมือ
(ใช้กับ SBH-1021 แล้ว — ตั้งคำถามเป็นข้อมีเลข ผู้ใช้ตอบกลับเป็นข้อๆ ได้สะดวก)
- TC ที่ขาดอาจ**อยู่ในการ์ดอื่นแล้ว** (SBH-1021: ผู้ใช้ตอบว่า TC ที่เสนอ "อยู่ในการ์ดอื่นไม่ต้องเพิ่ม") → ก่อนเสนอ ลองค้น TC ชื่อใกล้เคียงใน EXE อื่นของโปรเจกต์ ER ก่อน
- ผลเทสมือใน Sub-Issue ขัดกันเอง หรือ AC ขัดกับบั๊กที่แก้แล้ว → ถามผู้ใช้ว่ายึดอันไหน (SBH-1021: AC "ต้องระบุ Vital Signs" vs บั๊ก SBH-1773 → ผู้ใช้ตอบ "Vital Sign ไม่บังคับให้กรอกแล้ว")

_(กฎและขั้นตอนถัดไปผู้ใช้จะสอนเพิ่ม — ลงตารางนี้ตาม §8)_

---

## 8) วิธีอัปเดตสกิลนี้

- ผู้ใช้สอนกฎใหม่ → เพิ่มแถวใน §7 (วันที่ + ใจความตามคำผู้ใช้ ไม่แต่งเพิ่ม) · ถ้าเป็นขั้นตอนตามลำดับ เขียนเป็นหัวข้อย่อยใต้ตาราง §7
- กฎใหม่ขัดกับของเดิม → แก้แถวเดิม (ไม่เก็บสองแบบ) · ไม่แน่ใจว่า "แทนที่" หรือ "เพิ่ม" → ถาม
- ข้อใน §5 ได้คำตอบ → ย้ายไป §7 · ผู้ใช้สั่งเปลี่ยนค่าใน §4 → แก้ config ด้วย แล้วย้ายไป §7
- ความรู้หน้าจอที่ได้ระหว่างเขียนเทส (locator ที่ใช้ได้ จุดที่ต้องรอ กับดัก) → §9
- เนื้อหายาวขึ้นมาก → แยกเป็น `references/<เรื่อง>.md` ในโฟลเดอร์สกิลนี้ แล้วลิงก์จากที่นี่
- แก้ทุกครั้ง → ลง §10 หนึ่งบรรทัด

---

## 9) ความรู้หน้าจอ Cortex สำหรับเขียน automate

**ล็อกอิน** (ตรวจจริง 26 ก.ย. 2026 — ผ่านครบ 3 role)
- ยังไม่ล็อกอิน: `/cortex/apps` → เด้งไป `/cortex/welcome` (~11 วินาที) → ปุ่ม **ลงชื่อเข้าใช้** → Keycloak `id-dev-x.cortexcloud.co/realms/cortex/...` (client `cortex-ui`, redirect กลับ `/cortex/apps`)
- ฟอร์ม Keycloak (theme v2) เป็นภาษาอังกฤษแม้ locale `th-TH`: `#username` "Username or email" · `#password` "Password" · `#kc-login` "Sign In"
  ใช้ id ดีกว่า label เพราะมีปุ่ม "Show password" (aria-label) ปนอยู่ · ข้อความ error น่าจะอยู่ที่ `#input-error` (มาตรฐาน Keycloak — ยังไม่เห็นจริง)
- ล็อกอิน 1 role ~22 วินาที (หน้า welcome ~11 + Keycloak + โหลดแอปกลับมาอีก ~10) · session จาก storageState ใช้ข้าม context ได้ (smoke test ผ่าน)
- session อยู่ใน cookie ของ Keycloak (`KEYCLOAK_IDENTITY` เป็น session cookie, `KEYCLOAK_SESSION`) · localStorage ของแอปมีแค่ `i18nextLng` กับ `kc-callback-*`
  ไม่มีเวลาใช้งานล่าสุด → เช็คแค่ฝั่ง Keycloak ก็พอ · เช็ค session เดิม ~0.5–1 วินาที (ทดสอบแล้วทั้ง session ดี / session เสีย / `.env` ใหม่กว่า)
- smoke test เมื่อใช้ session เดิม: ทั้งรอบ ~15 วินาที (เวลาที่เหลือคือโหลดหน้าแอป ~12 วินาที)
- แอปตั้ง `SESSION_IDLE_TIMEOUT=1800` (idle 30 นาทีหลุด)
- config ฝั่งแอปดูได้ที่ `/cortex/environment/env.js` (เปิดสาธารณะ) — URL ของ API ทุกตัว, timezone, version

**เวลาโหลดหน้า** (วัด 26 ก.ย. 2026)
- เปิดหน้าไหนก็ตาม (`page.goto` / reload) ใช้ ~11 วินาทีก่อนแอปเริ่มทำงาน: ไฟล์ `/cortex/assets/index-<hash>.js` ขนาด 15.5 MB (gzip 4.8 MB)
  ส่ง `Cache-Control: no-store` → browser โหลดใหม่ทุกครั้ง (~9 วินาที) — ต้นเหตุของ "จอขาว 7–12 วินาที" ที่เจอตอนเทสมือ
  → ในเทส: `goto` ครั้งเดียวแล้วเดินต่อด้วยการกดเมนูในแอป เลี่ยง reload/goto ซ้ำ
- ยังไม่ล็อกอิน แอปยิง `POST /cortex-api/graphql` และ `GET /cortex-api/feature-flags` ได้ 403 — ปกติของ API ที่ยังไม่มี token

**โมดูล ER** (เปิดผ่าน Playwright MCP 26 ก.ย. 2026 ด้วย Super_User)
- หน้า `/cortex/apps`: การ์ดแอปเป็น element ที่มี label ตามชื่อแอป → `page.getByLabel('ห้องฉุกเฉิน').click()` → ไป `/cortex/er/dashboard`
- หัวหน้า "แดชบอร์ด / คิว" · ตัวนับ ทั้งหมด / กู้ชีพ / เร่งด่วน / สังเกตอาการ (ตัวนับ "สังเกตอาการ" นับผิด — เป็นบั๊กที่รอ Dev แก้ ยังไม่ต้อง assert · [er-flow.md](references/er-flow.md) §5) · สลับมุมมอง radio "บอร์ด" (ค่าเริ่มต้น) / "รายการ" · ปุ่ม "คัดกรอง" (มีไอคอน plus)
- ไม่มีคนไข้ในคิว → ข้อความ "ไม่มีผู้ป่วยในคิว ER" (ตอนเปิดดู ตัวนับเป็น 0 ทั้งหมด)
- กด "คัดกรอง" (`getByRole('button', { name: 'plus คัดกรอง' })` — ชื่อมีคำว่า plus จากไอคอน) → `/cortex/er/triage` ไม่มี modal:
  tab "ผู้ป่วยรายเดียว" (ค่าเริ่มต้น) / "ผู้ป่วยหลายคน" · หัวข้อ "1. ข้อมูลผู้ป่วย" · radio "ผู้ป่วยมี HN" (ค่าเริ่มต้น) / "ผู้ป่วยใหม่" / "ผู้ป่วยระบุตัวตนไม่ได้" ·
  ปุ่ม "อ่านบัตรประชาชน" · combobox "ค้นหาผู้ป่วยด้วย HN หรือชื่อ" (focus ให้เลย ยังไม่พิมพ์ขึ้น "ไม่พบผู้ป่วย") · ฝั่งขวาขึ้น "เลือกผู้ป่วยเพื่อเริ่มคัดกรอง" จนกว่าจะเลือกคนไข้
- แถบบน: ช่อง combobox "ค้นหาผู้ป่วย" · ปุ่ม "ขยายแถบนำทาง" (เมนูด้านซ้ายของโมดูล)
- **flow เต็ม ผู้ป่วยใหม่ → เปิด Visit → Triage (ESI 4 โซนเหลือง / ESI 5 โซนเขียว + modal ส่งต่อไปคลินิก) → ขึ้น Dashboard (ทำสำเร็จ 26 ก.ย. 2026)** — locator ทีละขั้น, API ที่ใช้เช็คผล, สิ่งที่เจอ, test data ที่สร้าง:
  [references/er-flow.md](references/er-flow.md) · ลงทะเบียนผู้ป่วยใหม่ที่ ER **ใช้ได้แล้ว** (16 ก.ย. เคยติด 400 เรื่องที่อยู่)
- กับดักที่เจอตอนเขียน spec SBH-1013 (26 ก.ย. 2026 — รายละเอียดใน er-flow.md):
  - **กด Enter ในช่องวันเกิดตอนช่องบังคับครบแล้ว = ส่งฟอร์มลงทะเบียนทันที** (ไม่ผ่านปุ่ม) → ใช้ Tab แทน
  - `getByText('แดชบอร์ด / คิว')` เจอ 2 ตัว (เมนูที่ซ่อนอยู่ + หัวหน้า) → `getByRole('main').getByText(...)`
  - บอร์ดและมุมมอง "รายการ" **ไม่แสดง EN** (มีแค่ HN/VN) → เช็ค EN จาก `GET /cortex-api/er/dashboard/encounters?date=`
  - ตัวเลือกใน dropdown ของ Ant Design (เพศ, สิทธิ, ผลค้นหา HN) ใช้ `.ant-select-item-option[title="..."]` —
    มี `role=option` ขนาด 0px ซ่อนซ้อนอยู่ อย่าใช้ `getByRole('option')`
  - **API ของบอร์ดคืน Encounter ที่ยกเลิกแล้วด้วย** (`latestStatusCode: cancelled`) → หาผู้ป่วยบนบอร์ดต้องตัดออก และอ้าง Encounter ด้วย EN ไม่ใช่ HN
  - ผู้ป่วยทีมบางคน Admit อยู่ (เปิด Visit ได้ 400 `ErrVisitBlockedByActiveAdmission`) หรือมี Visit ER ค้างข้ามวันที่บอร์ดวันนี้ไม่แสดง → เช็คผ่าน `generated-emr-api` ([er-flow.md](references/er-flow.md) §2.2)
  - `page.request` ส่งแค่ cookie ของหน้า แต่ API ของแอปใช้ `Authorization: Bearer` → เอาจาก request ที่แอปยิงเอง (`res.request().headers()['authorization']`) ใช้กับ GET เท่านั้น
  - `afterEach` ยกเลิก Visit ของผู้ป่วยทีมตอนเทสพัง — ทดสอบแล้ว (ใส่ `throw` ชั่วคราวหลัง TC-005 → afterEach ยกเลิก E69092631225 สำเร็จ แล้วลบ throw ออก)
  - ชื่อห้อง ER แสดงต่างกันตามจอ ("ห้องตรวจแผนกฉุกเฉิน" ใน modal / "ห้องตรวจนอกเวลาราชการ" จออื่น) เพราะข้อมูลคลินิก id 6 (รหัส `ER`) ตั้งชื่อไม่ตรงกัน — Visit ผูกคลินิก ER ถูกแล้ว ([er-flow.md](references/er-flow.md) §5)
  - ข้อความ error ของการเปิด Visit ที่ถูกกัน (ไม่เลือกสิทธิ / ผู้ป่วย Admit อยู่) และการเลือกผู้ป่วยที่มี Visit ER ค้าง → [er-flow.md](references/er-flow.md) §2, §2.1

- ฟอร์ม "คัดกรอง ER" (spec SBH-1021, 26 ก.ย. 2026 — locator + พฤติกรรมเต็มใน [er-flow.md](references/er-flow.md) §3):
  - **`toContainText` / `innerText()` บน tabpanel ไม่เห็นข้อความในฟอร์ม** (อยู่ใน shadow DOM) → เช็คผ่าน locator ที่ทะลุได้ (`getByText`, `getByRole`, CSS) เช่น `labelledBox()` = div ชั้นในสุดที่มีข้อความหัว
  - `getByText(/Total MEWS\s*1/)` (regex) จับ div ใหญ่ทั้ง widget ไม่ใช่กล่อง Total → ใช้ `labelledBox(form, 'Total MEWS')` แล้ว `toHaveText(regex)`
  - ปุ่มบันทึกกดได้ทันทีที่ช่องบังคับฝั่งซ้าย + ระดับความเร่งด่วนครบ — **GCS ไม่ได้คุมปุ่ม** ระบบเช็คตอนกด (ขึ้น "กรุณาเลือก …" ใต้ช่อง) · ตอนสำรวจเห็นปุ่ม disabled ชั่วครู่หลังเลือก "ผู้ที่มาด้วย" (รอ PATCH) อย่าสรุปจากค่าที่อ่านทันที
  - ทุกช่องถูกเก็บเป็น draft (`PUT /cortex-api/drafts`) → เปิดหน้าเดิมซ้ำจะได้ค่าที่กรอกค้างไว้ · บันทึกแล้ว draft ถูกลบ ค่าที่เห็นหลังโหลดใหม่มาจากที่บันทึกจริง
  - GCS: ปุ่มช่องที่ยังว่างชื่อ "เลือกคะแนน" (เรียง E, V, M) · ช่องที่เลือกแล้วชื่อ = ตัวเลือกปัจจุบัน → `chooseGcs(page, ตัวเลือก, ค่าเดิม?)`
  - เลือก GCS แล้วระบบ**ตั้ง AVPU ให้เอง** (หัวข้อเปลี่ยนเป็น "Level of Consciousness (AVPU) — จาก GCS": GCS 15 → A) — ขัดกับ AC "AVPU ต้องระบุเอง" · spec เช็ค TC-003 ก่อนเลือก GCS ตามลำดับของ TC · แจ้งผู้ใช้แล้ว

**โมดูลผู้ป่วยนอก (OPD)** (เปิดผ่าน Playwright MCP 28 ก.ย. 2026 ด้วย Super_User)
- `/cortex/apps` → `page.getByLabel('ผู้ป่วยนอก').click()` → `/cortex/opd/select-service-unit` หน้า "เลือกหน่วยบริการ": combobox (ค้นหาได้) + ปุ่ม "ส่ง" (disabled จนกว่าจะเลือก)
- ตัวเลือกหน่วยบริการเป็น dropdown แบบ virtual list (snapshot เห็นแค่ 2 ตัวแรก): คลินิกไข้ ชั้น 1 · แผนกฉุกเฉิน · คลินิกนรีเวช(GYN) · คลินิกสูติ(ANC) · คลินิกโรคหัวใจ · … · คลินิกอายุรกรรม(MED) — เลื่อนดูเพิ่มได้
  เลือกด้วย `.ant-select-item-option[title="<ชื่อหน่วย>"]` แล้วกดปุ่ม "ส่ง" ได้เลย
- หลังกด "ส่ง" → `/cortex/opd/patient-list?tab=all&from=<วันนี้>&to=<วันนี้>` หัวข้อ "รายการผู้ป่วยนอก" · ชื่อหน่วยที่เลือกขึ้นเป็นปุ่มบนแถบบน (เปลี่ยนหน่วยได้จากตรงนั้น)
  ช่องคลินิกเติมให้เองไม่เท่ากันทุกรอบ: รอบแรกว่าง · รอบสอง (28 ก.ย. 2026) URL มี `clinicIds=11,19,344,345,347,349` และช่องขึ้น "MED - ห้องตรวจโรคอายุรกรรมทั่วไป +5" → ถ้าเทสอิงผลในตาราง ให้ตั้งตัวกรองเองก่อน อย่าพึ่งค่าที่เติมมา
  ตัวกรอง: ค้นหา HN · ค้นหาชื่อผู้ป่วย · ช่วงวันที่ · ช่วงเวลา · คลินิก · Patient category · แพทย์ (ตอนเปิดกับ user1 มี "นาย ทดสอบ มานะ" ใส่ไว้ให้แล้ว) · สวิตช์ "เรียงตามความรุนแรง ESI" / "ดูรายการ นศพ." · ปุ่ม "ล้าง"
  แท็บ: นัดหมาย / ลงทะเบียน · คำขอ Walk-in · ทั้งหมด (ค่าเริ่มต้น) · รอเช็คอิน · เช็คอิน · พร้อมตรวจ | พักการตรวจ · ตรวจเสร็จ · จำหน่าย · … · ปุ่ม "ย้ายแพทย์หลายคนไข้" · ไม่มีรายการจะขึ้น "ไม่มีข้อมูล"

**Playwright MCP** (เครื่องมือเปิดเว็บให้ผู้ใช้ดู — คนละตัวกับ `npx playwright test`)
- เปิด Chrome แยก ไม่มี session จาก `.auth/` → ต้องล็อกอินใหม่ทุกครั้งที่เปิดเบราว์เซอร์ (หน้าต่างเดิมยังอยู่ก็ใช้ต่อได้)
- `browser_run_code_unsafe` ถูกระบบ permission (auto mode) ปฏิเสธ ("Containment Escape") → ใน auto mode อย่าใช้ ให้ใช้ `browser_click` / `browser_type` / `browser_snapshot` แทน · โหมด bypass permissions ใช้ได้ (28 ก.ย. 2026)
- **อัดวิดีโอตอนเล่นผ่าน MCP** (ใช้กับ UAT-ER-02 28 ก.ย. 2026): `browser_run_code_unsafe` → `await page.screencast.start({ path: '<path เต็มในโปรเจกต์>.webm', size: { width: 1920, height: 1080 } })` หลังล็อกอิน · จบแล้ว `page.screencast.stop()` (~40 MB ต่อ 5 นาที) — ต้องใช้โหมดที่ run_code ผ่าน
  - **ห้ามเรียก `browser_take_screenshot` ระหว่างอัด** — รอบแรกผู้ใช้บ่น "คลิปเห็นแค่บางส่วน": หลังเรียกเครื่องมือนี้ เฟรมหดเหลือ ~1440×667 มุมซ้ายบน ที่เหลือเป็นสีเทา → ถ่ายภาพหลักฐานด้วย `page.screenshot({ path })` ใน run_code แทน (รอบสองเต็มจอทั้งคลิป)
  - ตัวแปร global ไม่ข้าม run_code แต่ละครั้ง → เก็บ helper ไว้บน `page` (เช่น `page.__ev = async (loc, name) => …` ตีกรอบแดง div fixed + screenshot) · `process` / `require` ใช้ไม่ได้
  - **วงแดงตาม R23 ผ่าน MCP** (UAT-ER-02 run3): helper `page.__mark([[locator, 'กรอก'|'กด'|'แจ้งเตือน'|'Expected'], …])` + `page.__shot(name)` — ถ่ายก่อนกด / หลังกด · กับดักที่เจอ:
    ช่องที่ถูกแถบลอยบัง (Chief Complaint ใต้แถบระดับความเร่งด่วน) ผ่านเช็ค "อยู่ในจอ" แต่ถูกทับ → เช็ค `elementFromPoint` ที่จุดกลาง (ทะลุ shadow DOM) ถ้าโดนบังให้ scroll ตัวนั้นไว้กลางจอ (ใส่ใน `helpers/evidence.ts` แล้ว) ·
    locator แบบ `ancestor::*[…][1]` ที่ได้กล่องใหญ่เกินจอ → โดน scroll จนตัวอื่นหลุดจอ ภาพไม่มีกรอบ (Diagnosis ใน Physician Note ใช้ `getByText('Diagnosis', { exact: true }).locator('xpath=../..')`) ·
    แถบเมนูขวากางค้างบังภาพ — คลิกเนื้อหาให้หุบก่อนถ่าย · กรอบ `.ant-modal-content` ของ dialog "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" ไม่ขึ้น (ยังไม่รู้สาเหตุ — ครั้งหน้าลอง `getByRole('dialog')`) ·
    ไฟล์ภาพที่เพิ่ง Read อาจถูกล็อก (OneDrive) เขียนทับไม่ได้ → ตั้งชื่อใหม่
  - เปิด PDF ให้ติดในคลิป: `page.evaluate` สร้าง Blob จาก base64 → `<iframe>` overlay เต็มจอ แล้วลบทิ้ง (แท็บใหม่ไม่ติดคลิปของหน้าเดิม)
  - ตรวจคลิปเอง: `python -m http.server --bind 127.0.0.1` เสิร์ฟโฟลเดอร์ → แท็บใหม่ `setContent('<video src=http://127.0.0.1:…>')` เล่น `playbackRate = 8` แล้ว screenshot ทุก 2 วินาที (seek ด้วย `currentTime` ใน webm ของ screencast ไม่ได้ — ได้เฟรมแรกตลอด)
- ไฟล์ที่ MCP เขียนได้ต้องอยู่ในโฟลเดอร์โปรเจกต์ (scratchpad ไม่ได้) → เก็บภาพไว้ที่ `.playwright-mcp/` (อยู่ใน `.gitignore` แล้ว) · `filename` แบบ relative อิง**ราก workspace** ไม่ใช่ `.playwright-mcp/` → ใส่ `.playwright-mcp/<โฟลเดอร์>/…` ให้ครบ
- **ffmpeg ของ Playwright หายหลังใช้ MCP** (เจอ 26 ก.ย. 2026: `%LOCALAPPDATA%\ms-playwright` ถูกสร้างใหม่ตอน 12:38 ที่เริ่มใช้ MCP เหลือแค่โฟลเดอร์ `b/` — น่าจะเกิดจาก MCP)
  → เทส fail ที่ `newPage`: `Executable doesn't exist ... ffmpeg-1011` → รัน `npx playwright install ffmpeg` แล้วรันใหม่

**ทั่วไป** (จากงานเทสมือ ก.ค.–ก.ย. 2026)
- ใช้ web-first assertion (`await expect(loc).toBeVisible()`) รอ **ห้าม `waitForTimeout`**
- เช็ค API ด้วย `waitForResponse` + `expectOk(res, 'ทำอะไร')` (`helpers/er.ts`) — fail แล้วข้อความมี method · path · status · body ให้เห็นสาเหตุเลย
- **เขียน step ให้ภาพหลักฐาน (R13) ใช้ได้จริง** — ภาพถ่ายแค่ส่วนที่อยู่ในจอ ณ ตอนจบ step:
  - ปิดท้าย step ด้วย expect ของสิ่งที่เห็นบนจอ แล้ว `markEvidence(...)` ของสิ่งนั้น ไม่งั้นได้ภาพหน้าที่ยังโหลดไม่เสร็จ / ภาพส่วนอื่นของหน้า
  - **`scrollIntoViewIfNeeded()` + `toBeInViewport()` ไม่พอ** (เจอ 26 ก.ย. 2026): ฟอร์ม Triage มีแถบระดับความเร่งด่วน/โซนลอยทับขอบล่าง ~180px — element ผ่าน `toBeInViewport` แต่ถูกบังในภาพ → `markEvidence` เลื่อนไว้**กลางจอ** (`scrollIntoView({ block: 'center' })`)
  - กรอบของ `markEvidence` เป็น div `position: fixed` ใน body ทับตำแหน่ง element — ใช้ `outline` บน element ตรงๆ ไม่ได้ผล: โดนกรอบแม่ (overflow) ตัด และปุ่มที่ focus อยู่มี outline ของตัวเองทับ
  - step แม่ที่มี `checkStep` ย่อย ไม่แนบภาพ "ผ่าน" ซ้ำ (ภาพเดียวกับย่อยตัวสุดท้าย) — ถ้าทำอะไรต่อหลังย่อยตัวสุดท้าย ให้ `markEvidence` แล้วจะได้ภาพของแม่
  - หลังกด X ของ toast มุมขวาบน เมาส์ค้างแล้วขึ้น tooltip "สถานะบัญชี" ทับภาพ → `dismissToast` ย้ายเมาส์ออก
- **วิดีโอ (R13)** — ตรวจกับ Playwright 1.63 26 ก.ย. 2026:
  - `video` ใน config เริ่มอัดตั้งแต่สร้างหน้า → ~10 วินาทีแรกเป็นจอขาว (โหลด JS 15.5 MB) · fixture ใช้ `page.screencast.start({ path, size })` ตอน event `load` ของหน้าแรก → เหลือ spinner < 1 วินาที
  - **screencast ใช้ขนาดภาพของ client ตัวแรก** — trace (`retain-on-failure`) เก็บภาพผ่าน screencast ขนาด 800×450 และเริ่มก่อน → วิดีโอได้ภาพ 800×450 วางมุมซ้ายบนของเฟรม 1920×1080 → ปิดภาพของ trace (`screenshots: false`) ใน project `chrome`
  - ดูเฟรมวิดีโอเอง: เปิดไฟล์ .webm ใน Chrome ของ Playwright แล้วตั้ง `video.currentTime` + `locator.screenshot()` (ffmpeg ของ Playwright อ่าน webm ไม่ได้)
  - เทสที่พังก่อนหน้าแรกโหลดเสร็จ (เช่น goto ไม่ผ่าน) จะไม่มีวิดีโอ — ดูภาพตอน fail + trace แทน
  - ตรวจแล้ว 26 ก.ย. 2026: step ที่พังได้ภาพ `Error — …` ใต้ step + `test-failed-1.png` + วิดีโอ · ภาพที่เหมือนกันเป๊ะรายงานเก็บไฟล์เดียว
  - ต้นทุน: รอบเต็ม 56 วินาที → ~1.3 นาที · ผลต่อรอบ ~10 MB (report ~5.6 MB + test-results ~4.2 MB) และอยู่ในโฟลเดอร์ OneDrive → sync ขึ้นทุกรอบ
- `page.on('framenavigated')` จับการเปลี่ยนหน้าแบบ SPA (กดเมนูในแอป) ได้ — ตรวจแล้ว 26 ก.ย. 2026 · ใช้เช็คว่า flow ไม่ออกไปหน้าอื่น เช่น `/cortex/reception`
- **อย่าเช็คแบบ "ไม่มี network error เลย"** — หน้าผู้ป่วย ER ยิง `get_present_illness_history` ได้ 500 เป็นประจำ (บั๊กที่รู้แล้ว) · ให้เช็ค API ของขั้นที่เทสอยู่แทน
- หน้าเลือกแอป (`/cortex/apps`) มีข้อความ "เวชระเบียน" ให้ใช้เช็คว่าโหลดเสร็จ (ใช้ใน smoke test กับ Super_User)
- UI เป็น Ant Design: toast `.ant-message-notice` (หายเองใน ~4.5 วินาที) · notification `.ant-notification-notice` · modal `.ant-modal-content`
- ฟอร์ม "คัดกรอง ER" อยู่ใน shadow DOM (open) — locator ของ Playwright (role / text / CSS) ทะลุเข้าไปเอง แต่ XPath ไม่ทะลุ
- dev-x: สร้าง Visit OPD แล้วมี toast แดง "พิมพ์คิวไม่สำเร็จ - Network Error" ทุกครั้ง — ไม่ใช่เทสพัง
- ลำดับ locator (ค่าเริ่มต้น): `getByRole` / `getByLabel` / `getByText` → `getByTestId` (ถ้าแอปมี) → CSS · เลี่ยง XPath และ `nth-child`

**แหล่งความรู้หน้าจอเดิม** (อยู่ที่ `C:\Users\SuchatChancherngsila\OneDrive - บริษัท เอช แล็บ จำกัด\Desktop\Claude Project\`)
- `.claude\skills\er-run-test\SKILL.md` — flow ER ทีละขั้น + บั๊กที่รู้แล้ว · `.claude\skills\er-testing\SKILL.md` — โดเมน ER / การ์ด
- `playbooks\01-open-visit.md` — เปิด Visit OPD · `playbooks\99-test-data.md` — คนไข้ทดสอบ (ค้นชื่อ "Jame")
- สกิล `cortex-db-query` ต่อ **prod_cortex** (read-only) ไม่ใช่ dev-x → ใช้เช็คผลเทส automate ไม่ได้

---

## 10) ประวัติการปรับ

- 2026-09-26 — เริ่มโปรเจกต์: ติดตั้ง Node 24.19.0 ผ่าน winget (ผู้ใช้กด UAC), Playwright 1.63 + TypeScript 7.0.2, ใช้ Chrome ในเครื่อง ·
  ผู้ใช้เลือกล็อกอินอัตโนมัติจาก `.env` และเก็บสกิลในโฟลเดอร์โปรเจกต์ · ทำ `auth.setup.ts` + smoke test
- 2026-09-26 — ผู้ใช้ตั้ง user แยก role ใน `.env` (Super_User/Doctor/Nurse) → เปลี่ยน setup เป็นล็อกอินทุก role, เทสเลือก role ด้วย `authFile()` ·
  smoke test ผ่าน 4/4 (1.3 นาที) · ยืนยันว่า HTML report ไม่มีรหัสผ่าน · วัดเวลาโหลด (JS 15.5 MB + `no-store`) · ผู้ใช้อนุญาตให้เปิด `.env` (ค่าเป็นของปลอม)
- 2026-09-26 — ผู้ใช้สั่ง R5 (ใช้ session เดิม) + R6 (Super User ไปก่อน) → เพิ่ม `utils/session.ts`, `DEFAULT_ROLE` / `ROLES_IN_USE`,
  role ตั้งต้นใน config · รอบที่ใช้ session เดิมเหลือ ~15 วินาที (จาก 1.3 นาที)
- 2026-09-26 — เปิด Cortex → ER ให้ผู้ใช้ดูผ่าน Playwright MCP · ผู้ใช้เลือกให้ Claude กรอกรหัสจาก `.env` เอง (R7, §6) ·
  เพิ่มความรู้หน้า ER dashboard + ข้อจำกัดของ MCP ใน §9 · เพิ่ม `/.playwright-mcp/` ใน `.gitignore`
- 2026-09-26 — ผู้ใช้สั่ง "สร้างคนไข้ + ประเมิน Triage ดูว่าขึ้น Dashboard" → ทำสำเร็จ (HN 6931484) · ผู้ใช้เลือก R8 (Claude สุ่มเลขบัตรเอง) ·
  แยก flow ER เต็มไปไว้ที่ `references/er-flow.md`
- 2026-09-26 — ผู้ใช้ตอบ: บอร์ดไม่มีโซนเขียว = ตั้งใจ (โซนเขียวจะถามย้าย Clinic) · ตัวนับ "สังเกตอาการ" รอ confirm กับ BA จันทร์ 28 ก.ย. → บันทึกใน `references/er-flow.md` §4–5
- 2026-09-26 — ผู้ใช้แก้: โซนเขียวยังอยู่ แค่ซ่อนคอลัมน์ตอนไม่มีคนไข้ · สั่งเปิดคนไข้โซนเขียวแล้วตอบ "ภายหลัง" ที่คำถามส่งต่อคลินิก →
  ทำสำเร็จ (HN 6931485, ESI 5) · เพิ่ม `er-flow.md` §3.1 (modal "ส่งต่อไปคลินิก") และแก้ §4–6
- 2026-09-26 — การ์ดแรก SBH-1013: ผู้ใช้ตอบ 4 ข้อ → R9–R12 (ย้ายออกจาก §5) · เขียน `tests/er/SBH-1013-open-visit-er.spec.ts` + `helpers/` ·
  รันผ่านครบ 4/4 (56 วินาที) · ติดตั้ง ffmpeg ใหม่ (หายหลังใช้ MCP) · เพิ่มความรู้หน้าจอใน §9 และ `er-flow.md` §1–2.1, §4, §6
- 2026-09-26 — ผู้ใช้ถามคำสั่งรันแบบเปิดหน้า UI → ตรวจพฤติกรรมโหมด UI จากโค้ด Playwright แล้วจดใน §3 (ต้องรัน setup ก่อน + `--project=chrome` · trace ถูกบังคับเปิด)
- 2026-09-26 — ผู้ใช้สั่ง R13 (วิดีโอทุกรอบ + ภาพ ณ จุด Expect / จุด Error ในรายงาน) → config `video: on` 1920×1080 · `helpers/evidence.ts` `checkStep()` ·
  spec SBH-1013 + smoke ใช้ checkStep · เพิ่ม `expectVisitHeader` / `showDashboardCard` · `expectTriageFormOpen` รอฟอร์มโหลดเสร็จ · ย้ายแถว "หลักฐาน" ออกจาก §4 ·
  ทดสอบ step ที่พังด้วยเทสชั่วคราว (ลบแล้ว) · รันเต็มผ่าน 4/4 (1.3 นาที)
- 2026-09-26 — ผู้ใช้สั่ง R14 (ไม่ต้องปกปิดขั้นล็อกอิน บันทึกได้ปกติ) → ลบ `trace/video: 'off'` ของ project setup · `auth.setup.ts` ขอ `context` แล้ว `newPage()` เฉพาะตอนล็อกอินจริง +
  annotation `session` บอกว่ารอบนั้นล็อกอินใหม่หรือใช้ session เดิม · แก้ §3, §4, §6 · ทดสอบ 2 ทาง: ใช้ session เดิม (setup 0.4 วินาที ไม่มีวิดีโอ) / ลบ `.auth/Super_User.json` ให้ล็อกอินใหม่ (28 วินาที มีวิดีโอ 1.1 MB, ไม่เจอรหัสผ่านในผลเทส)
- 2026-09-26 — ผู้ใช้ถามว่าเทสผู้ป่วยมี HN "สร้างใหม่หรือใช้ของเดิม" → สั่ง R15 + เลือก "สุ่มคนไข้ทดสอบของทีม" (แก้ R10, R11, §5) ·
  เทสผู้ป่วยใหม่เพิ่มการค้นชื่อก่อนลงทะเบียน · เทสผู้ป่วยมี HN ใช้ `pickTeamPatient()` + ยกเลิก Encounter ท้ายเทส + `afterEach` สำรอง ·
  สำรวจปุ่มยกเลิก Encounter (ยกเลิก E69092631222 ของ AUTO) · เจอผู้ป่วยทีมที่ Admit อยู่ / Visit ค้างข้ามวัน → เช็คด้วย `generated-emr-api` · รันเต็มผ่าน 4/4 (1.1 นาที) · เพิ่ม er-flow.md §2.1–2.2, §4, §6
- 2026-09-26 — ผู้ใช้สั่ง R16 (ขั้นตอนเมื่อได้การ์ดใหม่: เข้าใจการ์ด → ตรวจ TC ใน Sub-Issue → เสนอ TC ที่ขาด → วางแผนก่อนเขียนโค้ด) → เพิ่ม §7 ขั้นตอน R16, §1 ข้อ 6 · §5 เหลือเรื่องรัน/รายงานผล ·
  จดโครงสร้าง Sub-Issue จาก SBH-1013 (การ์ด → EXE SBH-1702 → SC SBH-1703/1704 → TC SBH-1707–1712)
- 2026-09-26 — ทำ R16 ย้อนกับ SBH-1013 ตามที่ผู้ใช้ขอ: SC-001–004 / TC-001–006 (Happy ล้วน) · เสนอ TC-007–012 (Negative/Edge + Scope 1 ที่ติด SBH-1757) รอผู้ใช้เลือก ·
  สำรวจเพิ่ม: คลินิก id 6 = รหัส ER (ชื่อตั้งไม่ตรง) · ข้อความตอนไม่เลือกสิทธิ / ผู้ป่วย Admit · เลือกผู้ป่วยที่มี Visit ER ค้าง → ไป Encounter เดิม (สร้าง AUTO 6931503) · จดใน er-flow.md §2, §2.1, §5, §6
  → ผู้ใช้ตอบ "ไม่ต้องทำอะไรเพิ่ม ทิ้งไว้ประมาณนี้พอ" — ข้อเสนอ TC-007–012 และคำถาม 3 ข้อยังไม่ได้ทำ/ไม่ได้ตัดสิน (spec คงเดิม) · ยกขึ้นมาใหม่เมื่อผู้ใช้กลับมาทำ SBH-1013
- 2026-09-26 — การ์ด SBH-1021 (ฟอร์ม Triage) ตามขั้นตอน R16: ผู้ใช้ตอบ Vital Signs ไม่บังคับ · อนุญาตบันทึก Triage (R17, แก้ §5) · TC ที่เสนอ (TC-011–014) อยู่ในการ์ดอื่น · ข้าม TC-010 (10 วินาที) ·
  สำรวจฟอร์มด้วยเทสชั่วคราว (ลบแล้ว, ผู้ป่วย AUTO 6931504 บันทึก Triage แล้ว / 6931505 ค้างคอลัมน์คัดกรอง) · เขียน `tests/er/SBH-1021-triage-form.spec.ts` + `helpers/er-triage.ts` · `waitForApi` export และรับ RegExp ·
  รันเต็มผ่าน 5/5 (1.9 นาที) · เพิ่ม §9 ฟอร์มคัดกรอง + er-flow.md §3 · แก้วิธีส่งงาน R16
- 2026-09-26 — ผู้ใช้ติ report: "ภาพไม่ตรงกับ Expect" + "Video ยังมีหน้าขาวในช่วงแรก" → เพิ่ม `markEvidence()` (เลื่อนกลางจอ + กรอบแดง) · checkStep ไม่แนบภาพแม่ซ้ำ · spec SBH-1021 แยก checkStep ย่อยตามสถานะ (TC-001/003/004/005/006/007) ·
  SBH-1013 ตีกรอบ EN/การ์ด + แนบ JSON ข้อมูลบอร์ด + `dismissToast` · `helpers/fixtures.ts` อัดวิดีโอด้วย page.screencast หลังหน้าแรกโหลด (config `video: off` + trace ไม่เก็บภาพใน project chrome) · แก้ R13, §2, §4, §9 · รันเต็มผ่าน 5/5 (2.0 นาที)
- 2026-09-26 — ผู้ใช้เปิด `npx playwright test --ui` แล้วไม่เจอ SBH-1013 (ติ๊กแค่ project setup) → script `test:ui` = เตรียม session (setup) แล้วเปิด UI ด้วย `--project=chrome` · แก้ §3 + README
- 2026-09-28 — ผู้ใช้แจ้ง: ตัวนับ "สังเกตอาการ" เป็นบั๊ก เปิดการ์ดแล้ว รอ Dev แก้ → แก้ er-flow.md §5 + §9 (ยังไม่ assert ตัวนับนี้)
- 2026-09-28 — ผู้ใช้ขอผู้ป่วย 5 คน ESI 1–5 คนละโซน (เลือก: ESI 1–2 แดง · 3 เหลือง · 4 ห้องสังเกตอาการ · 5 เขียว / สร้างด้วยสคริปต์ชั่วคราว) → สร้างครบ (HN 6931523–6931528 ยกเว้น 6931526 ที่ค้างคัดกรอง) ·
  เจอ dialog "เปลี่ยนเป็น workflow สังเกตอาการ?" + ตารางโซนแนะนำตาม ESI → er-flow.md §3, §3.2, §6
- 2026-09-28 — ผู้ใช้ขอคนไข้โซนแดง 1 คน → สร้างผ่าน Playwright MCP (ESI 1, HN 6931529) ตาม flow ใน er-flow.md ได้ครบโดยไม่ต้องแก้ locator · จดใน er-flow.md §6
- 2026-09-28 — ผู้ใช้ให้เล่น UAT-ER-02 (ชีต Scenario- ER ในไฟล์ "New file Test case OPD #2.xlsx") ผ่าน MCP + อัดวิดีโอ / แคปจุด error → เล่นถึงลงนาม Disposition (HN 6931534) · ติด 2 จุด: พิมพ์ป้ายปลายเตียง (print agent localhost:8081) และไม่มีปุ่ม Finalize · จด er-flow.md §3.3, §6 + วิธีอัดวิดีโอผ่าน MCP ใน §9
- 2026-09-28 — ผู้ใช้สั่ง R23 (วงแดง: กรอก / กด / แจ้งเตือน / Expected) → `helpers/evidence.ts` เพิ่มป้าย `filled/clicked/alerted/expected` + `snapEvidence()` + เลื่อนจอเมื่อถูกแถบลอยบัง (typecheck ผ่าน · spec เดิมยังใช้ได้) · เล่น UAT-ER-02 run3 ตาม R23 (HN 6931536) ภาพ 33 จุด + คลิปเต็มจอ ใน `.playwright-mcp/UAT-ER-02/run3/`
- 2026-09-28 — ผู้ใช้ขอเล่น UAT-ER-02 ซ้ำ + ภาพหลักฐาน + คลิปเต็ม ("คราวก่อนคลิปเห็นแค่บางส่วน") → หาสาเหตุ (browser_take_screenshot ทำเฟรมหด) · รอบสองผ่านครบ 6 ขั้น (HN 6931535) ภาพ 17 จุดใน `.playwright-mcp/UAT-ER-02/run2/` + คลิปเต็มจอ · จด §9 MCP + er-flow.md §3.3, §6
- 2026-09-28 — ผู้ใช้ตอบผล UAT-ER-02 6 ข้อ → R18–R22 (เช็คป้ายจาก response PDF · ตัด Routine Discharge ใช้ตัวเลือกในฟอร์ม · Finalize = ปุ่มลงนาม · Physician Note ต้องมี Dx · บันทึกซ้ำไม่เป็นไร) + การ์ด `Diagnosis: -` บนบอร์ดเป็นบั๊กรอ Dev · เล่นขั้น 4 ใหม่ผ่าน (PDF ป้ายถูกต้อง) · UAT-ER-02 ผ่านครบทุกขั้นตามกฎใหม่
- 2026-09-28 — ผู้ใช้ขอเปิด Cortex → เมนูผู้ป่วยนอก ผ่าน Playwright MCP → ล็อกอิน Super_User แล้วถึงหน้า "เลือกหน่วยบริการ" → ผู้ใช้เลือกคลินิกอายุรกรรม(MED) → หน้ารายการผู้ป่วยนอก · เพิ่มความรู้โมดูล OPD ใน §9
- 2026-09-29 — ผู้ใช้ขอเปิด Visit ผู้ป่วยมี HN + Triage ครบทุก ESI / ทุกโซน → สเปกชั่วคราว (ลบแล้ว) ใช้ผู้ป่วยทีมนอกหน้าแรกของผลค้นหา 5 คน · ผ่าน 5/5 (4.4 นาที) ทิ้งไว้บนบอร์ด · จด er-flow.md §6
- 2026-09-29 — ผู้ใช้ให้เล่น UAT-ER-01 ผ่าน MCP → ผู้ใช้ตอบ R24–R27 (AUTO ที่มี HN ก่อน · ยา med0000005–8 · ข้ามจ่ายบางส่วน · หลักฐานเต็มรายที่ 1) · เล่นครบ 5 กรณี (HN 6931538–6931541) คลิป 4 ไฟล์ + ภาพ ~100 ใน `.playwright-mcp/UAT-ER-01/` · สำรวจสั่งยา/Lab/พิมพ์ใบสั่งยา/AMA/Escape/Reopen → er-flow.md §3.4
