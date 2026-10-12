# TODO

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

- [ ] **P3 — เทส TC ที่เหลือด้วยมือบนเว็บจริง แล้วรายงานผลกลับมา**
      เมื่อได้ผลแล้ว: อัปเดตช่อง "Actual Result" ในไฟล์ `test-cases/COR-1724-admin-user-role.md` ให้ตรงกับผลจริงที่ user รายงาน

- [ ] **P3 — ขออนุญาต user ก่อนสร้างการ์งจริงใน Linear** (ต้องขอชัดเจนทุกครั้ง ห้ามข้ามขั้นตอนนี้)

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
