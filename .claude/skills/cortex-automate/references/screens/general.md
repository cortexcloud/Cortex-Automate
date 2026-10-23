# ความรู้หน้าจอ Cortex — ทั่วไป — ล็อกอิน · เวลาโหลด · Playwright MCP · ความรู้จากเทสมือ

แยกจาก SKILL.md §9 เมื่อ 24 ต.ค. 2026 (ข้อความเดิมทั้งหมด · หัว **ตัวหนา** เดิมกลายเป็น `###`)
**อ่านอย่างไร**: โหลดเฉพาะเมื่องานเกี่ยวกับโมดูลนี้ · Grep ชื่อหน้าจอ / class / URL ก่อน แล้ว Read ช่วงบรรทัดที่เจอ · ความรู้ใหม่ของโมดูลนี้ → เพิ่มเป็น `###` ใหม่ท้ายไฟล์ (ระบุระบบ + วันที่ + ไฟล์แอป)

## หัวข้อในไฟล์
- ล็อกอิน (ตรวจจริง 26 ก.ย. 2026 — ผ่านครบ 3 role)
- เวลาโหลดหน้า (วัด 26 ก.ย. 2026)
- Playwright MCP (เครื่องมือเปิดเว็บให้ผู้ใช้ดู — คนละตัวกับ `npx playwright test`)
- ทั่วไป (จากงานเทสมือ ก.ค.–ก.ย. 2026)
- แหล่งความรู้หน้าจอเดิม (อยู่ที่ `C:\Users\SuchatChancherngsila\OneDrive - บริษัท เอช แล็บ 

---

### ล็อกอิน (ตรวจจริง 26 ก.ย. 2026 — ผ่านครบ 3 role)
- ยังไม่ล็อกอิน: `/cortex/apps` → เด้งไป `/cortex/welcome` (~11 วินาที) → ปุ่ม **ลงชื่อเข้าใช้** → Keycloak `id-dev-x.cortexcloud.co/realms/cortex/...` (client `cortex-ui`, redirect กลับ `/cortex/apps`)
- ฟอร์ม Keycloak (theme v2) เป็นภาษาอังกฤษแม้ locale `th-TH`: `#username` "Username or email" · `#password` "Password" · `#kc-login` "Sign In"
  ใช้ id ดีกว่า label เพราะมีปุ่ม "Show password" (aria-label) ปนอยู่ · ข้อความ error น่าจะอยู่ที่ `#input-error` (มาตรฐาน Keycloak — ยังไม่เห็นจริง)
- ล็อกอิน 1 role ~22 วินาที (หน้า welcome ~11 + Keycloak + โหลดแอปกลับมาอีก ~10) · session จาก storageState ใช้ข้าม context ได้ (smoke test ผ่าน)
- session อยู่ใน cookie ของ Keycloak (`KEYCLOAK_IDENTITY` เป็น session cookie, `KEYCLOAK_SESSION`) · localStorage ของแอปมีแค่ `i18nextLng` กับ `kc-callback-*`
  ไม่มีเวลาใช้งานล่าสุด → เช็คแค่ฝั่ง Keycloak ก็พอ · เช็ค session เดิม ~0.5–1 วินาที (ทดสอบแล้วทั้ง session ดี / session เสีย / `.env` ใหม่กว่า)
- smoke test เมื่อใช้ session เดิม: ทั้งรอบ ~15 วินาที (เวลาที่เหลือคือโหลดหน้าแอป ~12 วินาที)
- แอปตั้ง `SESSION_IDLE_TIMEOUT=1800` (idle 30 นาทีหลุด)
- config ฝั่งแอปดูได้ที่ `/cortex/environment/env.js` (เปิดสาธารณะ) — URL ของ API ทุกตัว, timezone, version

---

### เวลาโหลดหน้า (วัด 26 ก.ย. 2026)
- เปิดหน้าไหนก็ตาม (`page.goto` / reload) ใช้ ~11 วินาทีก่อนแอปเริ่มทำงาน: ไฟล์ `/cortex/assets/index-<hash>.js` ขนาด 15.5 MB (gzip 4.8 MB)
  ส่ง `Cache-Control: no-store` → browser โหลดใหม่ทุกครั้ง (~9 วินาที) — ต้นเหตุของ "จอขาว 7–12 วินาที" ที่เจอตอนเทสมือ
  → ในเทส: `goto` ครั้งเดียวแล้วเดินต่อด้วยการกดเมนูในแอป เลี่ยง reload/goto ซ้ำ
- ยังไม่ล็อกอิน แอปยิง `POST /cortex-api/graphql` และ `GET /cortex-api/feature-flags` ได้ 403 — ปกติของ API ที่ยังไม่มี token

---

### Playwright MCP (เครื่องมือเปิดเว็บให้ผู้ใช้ดู — คนละตัวกับ `npx playwright test`)
- เปิด Chrome แยก ไม่มี session จาก `.auth/` → ต้องล็อกอินใหม่ทุกครั้งที่เปิดเบราว์เซอร์ (หน้าต่างเดิมยังอยู่ก็ใช้ต่อได้)
- `browser_run_code_unsafe` ถูกระบบ permission (auto mode) ปฏิเสธ ("Containment Escape") → ใน auto mode อย่าใช้ ให้ใช้ `browser_click` / `browser_type` / `browser_snapshot` แทน · โหมด bypass permissions ใช้ได้ (28 ก.ย. 2026)
- **อัดวิดีโอตอนเล่นผ่าน MCP** (ใช้กับ UAT-ER-02 28 ก.ย. 2026): `browser_run_code_unsafe` → `await page.screencast.start({ path: '<path เต็มในโปรเจกต์>.webm', size: { width: 1920, height: 1080 } })` หลังล็อกอิน · จบแล้ว `page.screencast.stop()` (~40 MB ต่อ 5 นาที) — ต้องใช้โหมดที่ run_code ผ่าน
  - **ห้ามเรียก `browser_take_screenshot` ระหว่างอัด** — รอบแรกผู้ใช้บ่น "คลิปเห็นแค่บางส่วน": หลังเรียกเครื่องมือนี้ เฟรมหดเหลือ ~1440×667 มุมซ้ายบน ที่เหลือเป็นสีเทา → ถ่ายภาพหลักฐานด้วย `page.screenshot({ path })` ใน run_code แทน (รอบสองเต็มจอทั้งคลิป)
  - ตัวแปร global ไม่ข้าม run_code แต่ละครั้ง → เก็บ helper ไว้บน `page` (เช่น `page.__ev = async (loc, name) => …` ตีกรอบแดง div fixed + screenshot) · `process` / `require` ใช้ไม่ได้
  - **วงแดงตาม R23 ผ่าน MCP** (UAT-ER-02 run3): helper `page.__mark([[locator, 'กรอก'|'กด'|'แจ้งเตือน'|'Expected'], …])` + `page.__shot(name)` — ถ่ายก่อนกด / หลังกด · กับดักที่เจอ:
    ช่องที่ถูกแถบลอยบัง (Chief Complaint ใต้แถบระดับความเร่งด่วน) ผ่านเช็ค "อยู่ในจอ" แต่ถูกทับ → เช็ค `elementFromPoint` ที่จุดกลาง (ทะลุ shadow DOM) ถ้าโดนบังให้ scroll ตัวนั้นไว้กลางจอ (ใส่ใน `helpers/functions/evidence.ts` แล้ว) ·
    locator แบบ `ancestor::*[…][1]` ที่ได้กล่องใหญ่เกินจอ → โดน scroll จนตัวอื่นหลุดจอ ภาพไม่มีกรอบ (Diagnosis ใน Physician Note ใช้ `getByText('Diagnosis', { exact: true }).locator('xpath=../..')`) ·
    แถบเมนูขวากางค้างบังภาพ — คลิกเนื้อหาให้หุบก่อนถ่าย · กรอบ `.ant-modal-content` ของ dialog "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" ไม่ขึ้น (ยังไม่รู้สาเหตุ — ครั้งหน้าลอง `getByRole('dialog')`) ·
    ไฟล์ภาพที่เพิ่ง Read อาจถูกล็อก (OneDrive) เขียนทับไม่ได้ → ตั้งชื่อใหม่
  - เปิด PDF ให้ติดในคลิป: `page.evaluate` สร้าง Blob จาก base64 → `<iframe>` overlay เต็มจอ แล้วลบทิ้ง (แท็บใหม่ไม่ติดคลิปของหน้าเดิม)
  - ตรวจคลิปเอง: `python -m http.server --bind 127.0.0.1` เสิร์ฟโฟลเดอร์ → แท็บใหม่ `setContent('<video src=http://127.0.0.1:…>')` เล่น `playbackRate = 8` แล้ว screenshot ทุก 2 วินาที (seek ด้วย `currentTime` ใน webm ของ screencast ไม่ได้ — ได้เฟรมแรกตลอด)
- ไฟล์ที่ MCP เขียนได้ต้องอยู่ในโฟลเดอร์โปรเจกต์ (scratchpad ไม่ได้) → เก็บภาพไว้ที่ `.playwright-mcp/` (อยู่ใน `.gitignore` แล้ว) · `filename` แบบ relative อิง**ราก workspace** ไม่ใช่ `.playwright-mcp/` → ใส่ `.playwright-mcp/<โฟลเดอร์>/…` ให้ครบ
- **ffmpeg ของ Playwright หายหลังใช้ MCP** (เจอ 26 ก.ย. 2026: `%LOCALAPPDATA%\ms-playwright` ถูกสร้างใหม่ตอน 12:38 ที่เริ่มใช้ MCP เหลือแค่โฟลเดอร์ `b/` — น่าจะเกิดจาก MCP)
  → เทส fail ที่ `newPage`: `Executable doesn't exist ... ffmpeg-1011` → รัน `npx playwright install ffmpeg` แล้วรันใหม่

---

### ทั่วไป (จากงานเทสมือ ก.ค.–ก.ย. 2026)
- ใช้ web-first assertion (`await expect(loc).toBeVisible()`) รอ **ห้าม `waitForTimeout`**
- เช็ค API ด้วย `waitForResponse` + `expectOk(res, 'ทำอะไร')` (`helpers/functions/er.ts`) — fail แล้วข้อความมี method · path · status · body ให้เห็นสาเหตุเลย
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
- **เวชระเบียน (Reception) — ตรวจกับหน้าจอจริง 14 ต.ค. 2026 (dev-x + SBH Prod แบบไม่บันทึก):** `/cortex/apps` → `getByLabel('เวชระเบียน')` → `/cortex/reception/search-patient` · เนื้อหาเป็น **iframe** `iframe[title="iframe"]` (`/reception/embedded/<route>`) หน้านอกไม่มี role `main` · iframe ถูกสร้างใหม่ทุกครั้งที่เปลี่ยนหน้า → ใช้ `page.frameLocator()` (`elementHandle().contentFrame()` ได้ null บน Prod)
  - **dev-x 16 ต.ค. 2026 บ่าย: เลขบัตรประชาชนบังคับที่อยู่แล้ว** (ผู้ใช้ปรับ config — บ้านเลขที่ + หมู่ + จ/อ/ต ทั้งทะเบียนบ้านและปัจจุบัน) → `fillNewPatientForm()` กรอก 99/1 หมู่ 1 ปากเพรียว / เมืองสระบุรี / สระบุรี แล้วกด "บ้านเดียวกัน" (คัดลอกไม่ติดค่อยกรอกเอง) — ไม่กรอก = "โปรดระบุ" 4 ช่อง ไม่มีคำสั่งสร้างผู้ป่วย
  - ฟอร์มสร้างผู้ป่วยใหม่ (ปุ่ม "สร้างผู้ป่วยใหม่") เป็น Radix UI จับด้วย data-testid: `identifyVerification.identify` · `select-trigger-gender` (ตัวเลือก "male - เพศชาย" / "female - เพศหญิง") · `searchbox-trigger-prefixName-searchbox` (ตัวเลือก "003 - นาย") · `firstName` · `familyName` · `birthDate` (DD/MM/พ.ศ. → Tab แล้วระบบเติม `age`) · `submit-button` = บันทึก → `POST /new-demographic-api/patients` 201 → หน้านอกไป `/cortex/next/patients/<HN>?views=patientInfo`
  - **SBH Prod บังคับที่อยู่เพิ่ม** (dev-x เป็นฟอร์มที่อยู่แยกช่องและไม่บังคับ): `address.officialAddressLine` + ปุ่ม "ค้นหาที่อยู่" ใน `address-form-official` (คลิก div ของ searchbox แล้ว dialog ไม่เปิด) → dialog combobox พิมพ์ "ปากเพรียว" → "ปากเพรียว เมืองสระบุรี สระบุรี 18000" · ที่อยู่ปัจจุบัน = `copy-address-form-button` ("บ้านเดียวกัน") ใน `address-form-current`
  - **ส่วน "ข้อมูลการเกิด"** (dev-x 14 ต.ค. 2026 · การ์ด SBH-1289): หัวส่วนอยู่นอก `birth-form` (จับด้วย `getByText('ข้อมูลการเกิด', { exact: true }).first()`) · โรงพยาบาล `searchbox-trigger-birth.hospital-searchbox` → popup `[data-radix-popper-content-wrapper]` (มีช่องค้นหา · ตัวเลือก role option "<รหัส> - <ชื่อ>" · ตัวแรก = `10661 - โรงพยาบาลสระบุรี`) · ช่องข้อความ `birth.houseNo / condo / roomNo / soiSub / soiMain / road / villageName / villageNo` · ช่องเลือก `searchbox-trigger-birth.address-<stateCode|districtCode|cityCode>-searchbox` (ค่าว่าง = ข้อความ "เลือกจังหวัด" ฯลฯ · popup มี input ค้นหา · ปุ่มล้าง aria-label "Clear selection") · `birth.address-postalCode` disabled เติมตามตำบล ·
    เลือก รพ.สระบุรี แล้วระบบเติม บ้านเลขที่ 18 · ถนน เทศบาล 4 · **จังหวัด พิษณุโลก / อำเภอ เมืองพิษณุโลก / ตำบล ท่าโพธิ์ / 65000** (บั๊ก — ควรเป็น ปากเพรียว / เมืองสระบุรี / สระบุรี / 18000) · ส่วนนี้ยาวเกือบเต็มจอ → ตีกรอบหลายช่องให้เลื่อนหัวส่วนขึ้นบนสุดก่อน (`scrollIntoView({ block: 'start' })`) ไม่งั้นแถวตำบล/รหัสไปรษณีย์ตกขอบ ·
    หน้าข้อมูลผู้ป่วย: แถว `label-title` "สถานที่เกิด (ที่อยู่) :" / "สถานที่เกิด (โรงพยาบาล) :" คู่กับ `label-description` (ที่อยู่ 1 บรรทัด เรียงจังหวัด → อำเภอ → ตำบล) · ปุ่ม "แก้ไขข้อมูลผู้ป่วย" → `?actions=patientEdit` (ฟอร์มเดียวกันใน iframe · ช่อง รพ. แสดงไม่มีรหัส "โรงพยาบาลสระบุรี") → `submit-button` "บันทึก" → `PATCH /new-demographic-api/patients/<HN>` 200 แล้วกลับหน้าข้อมูลผู้ป่วย
  - **คลิปจอว่างตอนเข้าเวชระเบียน** (SBH-1289 · ผู้ใช้ทัก 14 ต.ค. 2026 "คลิปช่วงแรกหน้าขาวไปนานเกิน"): iframe โหลด `/reception/assets/index-<hash>.js` 8 MB (`no-store`) ใหม่ทุกครั้งที่เปลี่ยนหน้า (ค้นหา → สร้างผู้ป่วย = 2 รอบ) + `reception/assets/better/form-renderer.js` 1.9 MB · ตอน dev-x ช้า `waitReception` โหลดหน้าใหม่วน → คลิปว่าง ~140 วินาที · แก้: `cacheAppAssets()` (mock-data/fixtures) cache `/reception/assets/<ชื่อมี hash>` ด้วย · `restartVideo(page)` (helpers/functions/fixtures) อัดคลิปใหม่ทับไฟล์เดิมหลังหน้าค้นหาผู้ป่วยขึ้น → เหลือจอว่าง 2–3 วินาทีตอนเปลี่ยนหน้า · ตรวจจอว่างในคลิปด้วย `node .claude/skills/cortex-card-test/scripts/clip-sheet.mjs <คลิป> <ภาพ.png> [เริ่ม] [จบ]` (ภาพรวมเฟรมทุก 2 วินาที — พื้นแอปเป็นเทาอ่อน วัดสีพิกเซลแยกจอว่างไม่ได้ ต้องดูภาพ)
  - หน้าข้อมูลผู้ป่วย (iframe heading "ข้อมูลผู้ป่วย") มีปุ่ม **"Visit ใหม่"** (disabled ช่วงโหลด) → `?actions=createVisit` = แผงจัดการ Visit ของหน้าผู้ป่วย (เหมือนเมนูขวา "จัดการ Visit") · `openOpdVisit()` ข้ามการกดเมนูถ้าแผงเปิดอยู่แล้ว
  - **ที่อยู่แบบแยกช่องตาม 43 แฟ้ม** (dev-x 14 ต.ค. 2026 · การ์ด SBH-1290 · flag `registration.structured-patient-address` — ดูค่าได้ที่ `GET /cortex-api/feature-flags?key=<ชื่อ>` → `{enabled}`): ฟอร์มสร้าง / แก้ไขผู้ป่วยมี 8 ส่วน container `address-form-official` / `-current` / `-work` · `form-emergency-contact` · `father-` / `mother-` / `spouse-parent-form` · `birth-form` ·
    ช่องข้อความ `address.<official|current|work><HouseNo|Condo|RoomNo|SoiSub|SoiMain|Road|VillageName|VillageNo>` (ส่วนอื่น `emergencyContacts[0].houseNo` · `family.father.houseNo` · `birth.houseNo`) · จังหวัด / อำเภอ / ตำบล = `searchbox-trigger-<ส่วน>Address-<stateCode|districtCode|cityCode>-searchbox` → role option ชื่อตรงตัว (พิมพ์ค้นแล้วรายการไม่กรอง) · `<ส่วน>Address-postalCode` disabled เติมเองจากตำบล · ข้อความ error `error-message-<ชื่อช่อง>` (ของ searchbox / คำนำหน้า / เบอร์โทร ไม่มี testid — หาข้อความ "โปรดระบุ" ในกล่อง) ·
    ที่ทำงานมี `address.workAddressName` · บิดา / มารดา / คู่สมรส / ผู้ติดต่อฉุกเฉิน: กรอกชื่อแล้วบังคับคำนำหน้า (`searchbox-trigger-<คน>.prefixName-searchbox`) · ผู้ติดต่อฉุกเฉินบังคับ `relationship` + `input[name="emergencyContacts[0].mobilePhoneNumber"]` ด้วย · กรอกที่อยู่บางช่องแล้วต้องมีบ้านเลขที่ + ตำบล ·
    **ช่องบังคับของที่อยู่ไม่ได้ฝังในโค้ด** — `GET /generated-emr-api/identity-verification-modes` → `requiredField` ต่อประเภท: dev-x `cid` (เลขบัตรประชาชน · ค่าตั้งต้น) ไม่บังคับที่อยู่ · passport / foreigner / newborn / นิติบุคคล บังคับ `address.officialHouseNo` + state/district/cityCode (+ current) · **หมู่ไม่อยู่ในรายการของประเภทไหนเลย** · ไม่กรอกจังหวัด/อำเภอ ข้อความขึ้นที่ตำบลช่องเดียว ·
    **บั๊ก SBH-2586: ที่อยู่ที่ทำงานกรอกบ้านเลขที่ + พื้นที่แล้วกดบันทึก เงียบ ไม่ส่งคำสั่ง** (ส่วนอื่นบันทึกได้) · API `GET /new-demographic-api/patients/<HN>?include=RelatedPerson` → `data.officialAddress` / `currentAddress` / `birthPlace` / `emergencyContacts[0].currentAddress` / `include.<father|mother|spouse>Contact.currentAddress` = houseNo … villageNo + `state` / `district` / `city` `{system thai-province|thai-amphoe|thai-tumbon, code, display}` (สระบุรี 19 / เมืองสระบุรี 1901 / ปากเพรียว 190101 / ตะกุด 190114) + postalCode + `line` (ข้อความรวม) ·
    หน้าข้อมูลผู้ป่วยแสดงเป็นข้อความ "<บ้านเลขที่> <อาคาร> <ห้อง> <ซอยแยก> <ซอย> <ถนน> <ชื่อหมู่บ้าน> <หมู่>, ตำบล, อำเภอ, จังหวัด, รหัส" (หมู่ไม่มีคำนำหน้า · ข้อมูลการเกิดเรียง จังหวัด, อำเภอ, ตำบล) · ปุ่ม `แก้ไขข้อมูลผู้ป่วย` → `?actions=patientEdit` (URL `/cortex/reception/patient/<HN>/edit` = ไม่พบหน้า) ·
    **เพิ่มเติม 16 ต.ค. 2026**: flag ถูกปิด / เปิดได้ระหว่างวัน (ปิดแล้วทุกส่วนกลับเป็นช่องรวม `address.officialAddressLine` + ค้นหาที่อยู่ — ผู้ใช้ไปเปิดให้) → **เช็ค flag ก่อนรันทุกครั้ง** · รายการจังหวัด / อำเภอ / ตำบล = cmdk listbox (`[cmdk-list][role=listbox]` ที่มองเห็น — ฟอร์มมี listbox ซ่อนของช่องอื่นอีกหลายชุด) ตัวเลือกมี testid `searchbox-result-<code>` (อำเภอ 1901 · ตำบล 190101) · Master Data `GET /generated-emr-api/thai_address_with_address_details?select=*&perPage=1000&filter[province_code][equals]=19` (หรือ `district_code`) → `districtCode` / `subDistrictCode` + `districtInfo.th.name` · หลังเลือกจังหวัดมีช่อง "ชุมชน" เพิ่ม ·
    เลขบัตรประชาชนไม่มี * แต่ **เริ่มกรอกที่อยู่บางช่องแล้วบังคับบ้านเลขที่ / ตำบล** (หมู่ไม่บังคับทั้ง 2 ประเภท) · ประเภทหนังสือเดินทางต้องกรอก `identifyVerification.identify` + `identifyVerification.expire` (DD/MM/YYYY ค.ศ.) · เปลี่ยนเป็นหนังสือเดินทางแล้ว "โปรดระบุ" ขึ้นทันทีโดยไม่ต้องกดบันทึก
  - **คำสั่งสร้าง / แก้ผู้ป่วยของเวชระเบียนยิงจาก service worker** (dev-x 14 ต.ค. 2026): `page.route` / `page.waitForResponse` / `page.on('request')` **ไม่เห็น** `POST /new-demographic-api/patients` (trace เห็น) → spec ที่รอ response คิดว่า "ไม่มีคำสั่ง" ทั้งที่สร้างผู้ป่วยแล้ว (เกิด HN 6931870 โดยไม่ตั้งใจ) · ปิด service worker (`serviceWorkers: 'block'`) แล้วเวชระเบียนไม่ขึ้น · ใช้ env `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1` (ตั้งใน spec ก่อน browser เริ่ม) แล้ว `context.route` / `context.on('request')` · ดักเพื่อไม่สร้างข้อมูล: ยิง `fetch POST` ทดสอบจากใน iframe ก่อน ต้องถูกนับ (แอปลองส่งซ้ำหลังถูก abort — รอ 3 วินาทีก่อนนับใหม่) · body เป็น multipart (`postDataJSON` พัง ใช้ `postDataBuffer`) · ผลของการบันทึกดูจาก URL `/next/patients/<HN>` แทน response
- UI เป็น Ant Design: toast `.ant-message-notice` (หายเองใน ~4.5 วินาที) · notification `.ant-notification-notice` · modal `.ant-modal-content`
- ฟอร์ม "คัดกรอง ER" อยู่ใน shadow DOM (open) — locator ของ Playwright (role / text / CSS) ทะลุเข้าไปเอง แต่ XPath ไม่ทะลุ
- dev-x: สร้าง Visit OPD แล้วมี toast แดง "พิมพ์คิวไม่สำเร็จ - Network Error" ทุกครั้ง — ไม่ใช่เทสพัง
- ลำดับ locator (ค่าเริ่มต้น): `getByRole` / `getByLabel` / `getByText` → `getByTestId` (ถ้าแอปมี) → CSS · เลี่ยง XPath และ `nth-child`

---

### แหล่งความรู้หน้าจอเดิม (อยู่ที่ `C:\Users\SuchatChancherngsila\OneDrive - บริษัท เอช แล็บ จำกัด\Desktop\Claude Project\`)
- `.claude\skills\er-run-test\SKILL.md` — flow ER ทีละขั้น + บั๊กที่รู้แล้ว · `.claude\skills\er-testing\SKILL.md` — โดเมน ER / การ์ด
- `playbooks\01-open-visit.md` — เปิด Visit OPD · `playbooks\99-test-data.md` — คนไข้ทดสอบ (ค้นชื่อ "Jame")
- สกิล `cortex-db-query` ต่อ **prod_cortex** (read-only) ไม่ใช่ dev-x → ใช้เช็คผลเทส automate ไม่ได้
