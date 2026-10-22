# COR-1724 — [Admin] User, Role in keycloak -> Admin — Test Coverage

- Requirement: https://linear.app/cortexcloud/issue/COR-1724/admin-user-role-in-keycloak-admin
- สร้างจาก Acceptance Criteria ของการ์ดโดยตรง ตาม skill `linear-testcase-writer`
- สถานะไฟล์นี้: **draft เก็บไว้ในโปรเจกต์ก่อน ยังไม่สร้างจริงใน Linear** (87 การ์ดเดิมที่เคย sync ไปแล้วจะถูกจัดการแยกตามแผน `calm-soaring-koala.md`)
- Workflow: เขียน TC ไว้ที่นี่ → ผู้ใช้ run เคสเองด้วยมือบนเว็บ → อัปเดตช่อง "Actual Result" ของแต่ละ TC ด้านล่างตามผลจริง → เมื่อได้ผลครบแล้วและ **ได้รับอนุญาตจากผู้ใช้ชัดเจน** ค่อยนำไปสร้าง EXE/Scenario/Test Case จริงบน Linear
- รวม: 1 EXE, 16 Scenario, **34 Test Case**
- **รื้อโครงสร้างใหม่ (8 ต.ค. 2026):** เดิมมี 87 Test Case แบบ "1 TC = 1 พฤติกรรม" (ตามกฎมาตรฐานของ `linear-testcase-writer`)
  ผู้ใช้ขอให้เปลี่ยนมาเขียนแบบ **functional/integration test ที่เดินผ่านหลาย step ต่อเนื่องในหน้า/session เดียวกัน** แทน (เฉพาะงานนี้
  เท่านั้น ยังไม่แก้กฎถาวรของสกิล) — รวม TC ที่เป็น sequential flow จริง (output step ก่อน = precondition step ถัดไป) เข้าเป็น TC เดียว
  ไม่รวมข้าม Scenario boundary (Happy/Unhappy/Edge/Error ยังแยกตามเดิม) และไม่รวม TC ที่เป็นทางเลือกคู่ขนานหรือวิธีตรวจสอบคนละแบบ
  (DB vs UI vs API) เพื่อไม่ให้เสีย traceability — ทุก TC ใหม่มีบรรทัด "รวมจาก TC เดิม" ระบุว่าเดิมคือ TC อะไรบ้าง สำหรับ map กลับไปหา
  evidence/การ์ด Linear เดิม — ผลการทดสอบจริงทั้งหมดที่เคยบันทึกไว้ (Pass/Fail/Not Test) **ไม่เปลี่ยนแปลง** แค่จัดกลุ่มใหม่ ดูรายละเอียด
  แผนเต็มที่ `/Users/neranchara/.claude/plans/calm-soaring-koala.md`

---

## EXE

### EXE - CT - VERSION 2.8.0

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: VERSION 2.8.0
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- Environment: -
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- Staff account administration (ค้นหา/สร้าง/แก้ไข/ลบ account)
- Sign-in methods and credentials (credential list, reset password, authenticator, required action)
- Role assignment (assign/remove role, ป้องกัน partial-apply)
- Baseline access for new accounts (FHIR/PostgREST/EHRbase)
- Permissions and safeguards (permission gating, self-modification prevention, service account protection)
- Migrating existing accounts (dry-run/apply, backup, sweep/named list)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
```

---

## หมายเหตุจากการสำรวจเว็บจริง (dev-x, 30 ก.ย. 2026, role Super_User)

สำรวจผ่าน Playwright script อ่านอย่างเดียว (ไม่ได้กด บันทึก/ลบ/ยืนยันใด ๆ จริง) — screenshot เก็บไว้ที่ `.playwright-mcp/COR-1724/` (15 ภาพ)

**เส้นทางเมนูจริง:** `ผู้ดูแลระบบ` (app tile) → ขยายแถบนำทาง → `โรงพยาบาล` → `ผู้ใช้งานในระบบ` (รายการ, URL `/cortex/setting/admin/user-management`) ·
หน้ารายละเอียด user มี 3 แท็บ: **ข้อมูลทั่วไป** (general + toggle "การใช้งาน" = enabled state) / **การเข้าสู่ระบบ** (credential list + reset password + required-next-login) / **บทบาทการใช้งาน** (role list + assign/remove)
เมนู role/permission แยกอยู่ที่ `โรงพยาบาล` → `บทบาทและสิทธิการใช้งาน` (URL `/cortex/setting/admin/role-management`, 2 แท็บ: สิทธิของ Role / สิทธิการใช้งาน)

**แก้คำที่ผิดจาก AC → ของจริง (สำคัญ กระทบ F03/F04 [เดิม TC-009–011]):** ตัว dropdown "วิธีการเมื่อเข้าสู่ระบบ" ตอนสร้าง user มี **3 ตัวเลือกแบบ single-select** ไม่ใช่ "temp password / authenticator / ทั้งคู่" ตามที่ตีความจาก AC ตอนแรก —
ของจริงคือ: `Username & Password` (temporary password ต้องเปลี่ยนตอน login แรก) / `OTP` (ไม่มี "authenticator app" — ระบบใช้คำว่า **OTP**) / `OTP พร้อมรหัสผ่านชั่วคราว` (ตัวเลือกที่ 3 แยกต่างหาก ไม่ใช่ติ๊กสองอันพร้อมกัน)

**ยืนยันตรงกับ AC:** ฟอร์มสร้าง user มีช่อง "รหัสผ่านชั่วคราว" พร้อมปุ่ม show/copy/regenerate · แท็บ "การเข้าสู่ระบบ" แสดงตาราง ประเภท/ชื่อเรียก/เพิ่มเมื่อ/จัดการ (ลบ/รีเซ็ตรหัสผ่าน) **ไม่มีช่องไหนโชว์ค่า secret จริงเลย** · แท็บ "บทบาทการใช้งาน" มีค้นหาบทบาท + ปุ่ม "กำหนดบทบาท" (multi-select checkbox + select-all) · dialog ลบ user ข้อความจริง: "ต้องการลบ &lt;username&gt; หรือไม่ ระบบจะลบบัญชีออกจาก Keycloak และไม่สามารถกู้คืนได้"

**2 เรื่องที่เคยเป็นคำถาม — ผู้ใช้ตอบและจัดการแล้ว (30 ก.ย. 2026):**
1. **โมเดล permission:** ค้นแคตตาล็อกสิทธิ (1,711 รายการ) เจอเฉพาะ `menu:setting:user-management` (สิทธิระดับเมนูเดียว ไม่มีสิทธิแยก view/create/edit/delete ตามที่ AC อธิบาย) — ผู้ใช้ยืนยันให้ **ใช้สิทธิ์ที่มีอยู่จริง** เพราะการ์ดนี้ scope แค่หน้า "ผู้ใช้งานในระบบ" เท่านั้น → F21–F26 (เดิม TC-054–062) ด้านล่างเทสกับ permission key เดียวนี้ทุกช่องทาง (UI + แต่ละ API endpoint) แทนที่จะเทส 4 permission แยกกันตามที่ AC อธิบายไว้ (ซึ่งไม่มีจริงในระบบตอนนี้) — ถือเป็น gap ระหว่าง AC กับ implementation ที่ควรแจ้งทีม product แยกต่างหาก ไม่ใช่ QA gap
2. **admin test account:** สร้างไม่สำเร็จผ่าน Playwright เจอ error "ระบบไม่ได้รับสิทธิ์ให้จัดการผู้ใช้งานในระบบยืนยันตัวตน" (บั๊กที่ยังอยู่ ดู F02) — ผู้ใช้สร้างให้เองแล้วเพิ่ม `CORTEX_USERNAME_Admin`/`CORTEX_PASSWORD_Admin` ใน `.env` · บัญชีนี้คือบัญชีจริงของผู้ใช้ (ชื่อแสดงผล "neranchara kaewsiri") ไม่ใช่ synthetic test account แบบ Super_User/Doctor/Nurse — ผู้ใช้ยืนยันแล้วว่าใช้ได้เพราะเป็น dev-x (test environment) ไม่ใช่ prod

---

## หมวด 1: Staff account administration

### SC-01 — TS-COR-1724-HPY - Staff account administration

```
ข้อมูลอ้างอิง
- Scenario ID: SC-01
- Case Type: Happy
- Suffix: HPY
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่า admin จัดการ staff account (ค้นหา/สร้าง/แก้ไข/ลบ) ผ่าน Cortex ได้ครบตาม flow ปกติ โดย Keycloak ยังเป็น source of truth

ขอบเขต Requirement
- ค้นหา/browse แบบ pagination ที่ state อยู่รอด refresh/shared link
- สร้าง account พร้อม temporary password และ login method ที่เลือกได้
- แก้ไข detail+enabled เป็น change เดียว, ลบ account พร้อม confirm

ความเสี่ยง
- ถ้า Cortex เก็บสำเนา account เอง จะขัดกับหลัก "Keycloak เป็น system of record" และเสี่ยงข้อมูลไม่ sync

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-001 — ค้นหา+browse รายการ account แบบ pagination พร้อม state คงอยู่หลัง refresh/shared link

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-001
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "Accounts can be searched and browsed page by page; the search term, page and page size survive a refresh or a shared link."
- รวมจาก TC เดิม: TC-001, TC-002, TC-003, TC-004 (flow เดียวกัน: ค้นหา→เปลี่ยนหน้า→refresh→เปิด shared link)

Preconditions
- Login ด้วย role ที่มีสิทธิ์ view (เช่น Super_User)
- มี staff account มากกว่า 1 หน้า (มากกว่า page size ที่ตั้งไว้) และรู้ชื่อ/username ของ account อย่างน้อย 1 รายการแน่ชัด

Test Data
- Keyword ค้นหา = ชื่อ/username ของ account ที่มีอยู่จริง

Test Steps
1. เข้าหน้า User Management พิมพ์ keyword ในช่องค้นหา แล้ว search
2. ล้างค้นหา เลื่อนไปหน้าถัดไปของรายการ
3. ตั้งค่า search term + page + page size ตามต้องการ แล้วกด refresh browser (F5)
4. คัดลอก URL จาก state ที่ตั้งไว้ เปิด URL นั้นใน tab/context ใหม่ (จำลอง shared link)

Expected Result
- Step 1: แสดงเฉพาะ account ที่ตรงกับ keyword ที่ค้นหา
- Step 2: หน้าที่ 2 แสดง account ชุดถัดไปไม่ซ้ำกับหน้าแรก ปุ่มเปลี่ยนหน้าทำงานถูกต้อง
- Step 3: search term, page, page size เหมือนก่อน refresh ทุกค่า
- Step 4: state ที่แสดง (search/page/page size) ตรงกับค่าที่ encode ไว้ใน URL

Actual Result
- Step 1 — Pass: ค้นหา "cashier01" แสดงผลตรง 1 แถว (cashier01) เท่านั้น
- Step 2 — Pass: กดปุ่มหน้าถัดไป หน้า 2 แสดง 20 แถวไม่ซ้ำกับ 20 แถวของหน้าแรกเลย (page size = 20, ทั้งหมด 11 หน้า)
- Step 3 — Pass: ตั้งค่าค้นหา = "a" แล้ว refresh (F5) URL และช่องค้นหาคงค่าเดิมทุกจุด (state encode อยู่ใน URL query `userSearch`)
- Step 4 — Pass: เปิด URL `?userSearch=a` ใน context/tab ใหม่ (จำลอง incognito) ช่องค้นหาแสดง "a" ตรงกับที่ encode ไว้

หมายเหตุ
- Evidence: images/tc001-search-cashier01.png, tc002-page1.png, tc002-page2.png, tc003-after-refresh.png, tc004-shared-link-new-tab.png
```

#### TC-COR-1724-002 — สร้าง account ใหม่พร้อม temporary password + ยืนยันสร้างจริง + login ครั้งแรกบังคับเปลี่ยนรหัสผ่าน (Username & Password)

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-002
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "A new account is created with a generated temporary password that can be shown, copied or regenerated." / "The login method chosen at creation decides how the account starts: a temporary password to change at first login, an authenticator to enrol, or both."
- รวมจาก TC เดิม: TC-005, TC-006, TC-007, TC-008, TC-009 (flow เดียวกัน: กรอกฟอร์ม→จัดการ temp password→บันทึก→ยืนยันสร้างจริง→login ครั้งแรก)

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- ข้อมูล staff ใหม่ตามฟอร์ม (ชื่อ, username ฯลฯ), login method = "Username & Password" (default)

Test Steps
1. เปิดฟอร์มสร้าง account กรอกข้อมูลครบ
2. กดปุ่ม show/reveal password ที่ช่อง temporary password
3. กดปุ่ม copy ที่ temporary password แล้ว paste ตรวจสอบค่า
4. กดปุ่ม regenerate password เทียบค่าก่อน-หลัง
5. กด "บันทึก"
6. ไปค้นหา username นี้ในหน้ารายการเพื่อยืนยันว่าสร้างจริง (ไม่ว่า toast จะขึ้นอะไร)
7. เปิด context ใหม่ (ไม่มี session เดิม) login ด้วย username + temporary password ที่ copy ไว้

Expected Result
- Step 1: ฟอร์มรับข้อมูลไม่มี validation error
- Step 2: temporary password แสดงเป็น plain text ให้เห็น
- Step 3: password ถูกคัดลอกไปยัง clipboard ถูกต้องตรงกับที่แสดง
- Step 4: ได้ temporary password ค่าใหม่ที่ต่างจากค่าเดิม
- Step 5-6: account ถูกสร้างสำเร็จจริง ค้นหาเจอในหน้ารายการ
- Step 7: ระบบบังคับให้เปลี่ยน password ทันทีตอน login ครั้งแรก

Actual Result
- Step 2 — Pass: กดไอคอนรูปตา (`aria-label="eye-invisible"`) ในฟอร์มสร้าง user แล้ว input เปลี่ยนจาก `type=password` เป็น `type=text` แสดง temp password เป็น plain text
- Step 3 — Pass: กดปุ่ม "คัดลอกรหัสผ่าน" แล้วอ่านค่าจาก `navigator.clipboard.readText()` ตรงกับค่าที่แสดงในช่องทุกตัวอักษร (ทดสอบใน headless Chrome พร้อม grant clipboard permission ไม่ได้ log ค่ารหัสผ่านจริงออกมาที่ไหน)
- Step 4 — Pass: กดปุ่ม "สร้างรหัสผ่านใหม่" แล้ว temp password เปลี่ยนเป็นค่าใหม่ที่ต่างจากค่าเดิมทันที
- Step 5-6 — **Fail/BUG สำคัญ**: กรอกฟอร์มครบถูกต้องแล้วกด "บันทึก" ขึ้น toast แดง "ระบบไม่ได้รับสิทธิ์ให้จัดการผู้ใช้งานในระบบยืนยันตัวตน กรุณาติดต่อผู้ดูแลระบบ" (API จริงตอบ `403 ErrUserDirectoryForbidden` — `"cortex-api is not allowed to manage users in the identity provider"`) ทำให้ดูเหมือนว่าการสร้าง account ล้มเหลว **แต่เมื่อเข้าไปตรวจสอบในหน้ารายการ user จริง ๆ พบว่า account ถูกสร้างสำเร็จจริงทุกครั้ง** (เช็คแล้วหลายสิบ account ที่เจอ error นี้ระหว่างทดสอบทั้งโปรเจกต์ ทุกตัวมีอยู่จริงในระบบ enabled=true มี credential ประเภท "รหัสผ่าน" ตั้งไว้จริง) → **สรุป: บั๊กนี้ไม่ใช่ "สร้าง account ไม่ได้" แต่คือ "สร้างสำเร็จจริง แต่ระบบแจ้งข้อความผิดว่าล้มเหลว"** อันตรายกว่าที่คิดไว้ตอนแรกมาก เพราะแอดมินที่เจอ error นี้จะเข้าใจผิดว่าไม่มีอะไรเกิดขึ้นและอาจกดสร้างซ้ำเรื่อย ๆ — ตรวจ AC ของการ์ด COR-1724 แล้ว **ไม่มีการระบุข้อความ (copy) ที่ต้องแสดงตอนสำเร็จหรือล้มเหลวไว้เลย** จึงเป็น **product/backend bug ที่ควรแจ้งแยกด่วน** (ข้อความ error ผิดจากผลจริง) ไม่ใช่แค่ TC fail ตาม AC ธรรมดา — **บั๊กนี้เป็น intermittent (flaky 403) ไม่ใช่ hard block 100%**: re-test พบ error คนละแบบบ้าง ("username/email ถูกใช้งานแล้ว" เมื่อ username ซ้ำกับที่เคยสร้างสำเร็จไปแล้วก่อนหน้า) ยืนยันว่า account สะสมอยู่ในระบบจริงจากการทดสอบหลายรอบ
- Step 7 — Pass: สร้าง account `qa-cor1724-pw-712395` เลือก login method "Username & Password" (default) บันทึกสำเร็จ แล้วเปิด context ใหม่ (ไม่มี session เดิม) ล็อกอินด้วย username + รหัสผ่านชั่วคราวที่ระบบสร้างให้ — ระบบ redirect ไปหน้า Keycloak "Update password" ทันที (URL มี `execution=UPDATE_PASSWORD`, ข้อความ "You need to change your password to activate your account.") ตรงตาม Expected Result ทุกประการ

หมายเหตุ
- Evidence Step 2-4: images/tc006-show-password.png, tc008-regenerate-password.png
- Evidence Step 5-6 (กรอบแดง = ช่องกรอกข้อมูล/ปุ่มที่กด และผลจริงที่ผิดคาด): images/tc005-evidence-01-before-save-marked.png, tc005-evidence-02-after-save-marked.png — วิดีโอเต็ม (ต้องยืนยันสถานะจริงต่อในคลิปเดียว ห้ามตัดจบแค่ข้อความ UI): videos/tc005-video.webm — คลิปเดียวต่อเนื่อง: กรอกฟอร์ม → กด บันทึก → toast error ขึ้น → ค้นหา username เดิม → เจอ account จริงในตาราง (กรอบเขียว) → เปิด detail เห็นการใช้งาน=เปิด (กรอบเขียว) → แท็บการเข้าสู่ระบบเห็น credential ตั้งไว้แล้ว (กรอบเขียว ยืนยันสร้างสำเร็จ 100%)
- Evidence Step 7: images/tc009-01-create-filled.png ... tc009-08-verified-forced-password-change.png · วิดีโอ: videos/tc009-admin-create-video.webm + videos/tc009-login-video.webm
- **ต้องแจ้ง dev/product เป็นประเด็นสำคัญ (severity สูง)** เรื่องข้อความ error ผิดจากผลจริงตอนสร้าง account
```

#### TC-COR-1724-003 — สร้าง account ด้วย login method "OTP" + login ครั้งแรกบังคับยืนยันตัวตนด้วย OTP

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-003
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "The login method chosen at creation decides how the account starts: a temporary password to change at first login, an authenticator to enrol, or both."
- รวมจาก TC เดิม: TC-010

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- วิธีการเมื่อเข้าสู่ระบบ = "OTP" (คำใน AC เขียนว่า "an authenticator to enrol" — ของจริงในระบบใช้คำว่า OTP ไม่มีตัวเลือกชื่อ authenticator แยกต่างหาก)

Test Steps
1. สร้าง account เลือก "วิธีการเมื่อเข้าสู่ระบบ" = OTP แล้วบันทึก
2. Login ด้วย account นั้นเป็นครั้งแรก

Expected Result
- ระบบบังคับให้ยืนยันตัวตนด้วย OTP ก่อนใช้งานต่อ

Actual Result
- **Fail** — สร้าง account `qa-cor1724-otp-251339` เลือก login method "OTP" บันทึกสำเร็จ (ยืนยันจากหน้ารายการ) สังเกตว่าฟอร์มสร้าง account สำหรับ login method นี้**ไม่มีช่องรหัสผ่านชั่วคราวให้เลย** (ต่างจาก "Username & Password" และ "OTP พร้อมรหัสผ่านชั่วคราว" ที่มี) — ลองล็อกอินครั้งแรกด้วย username อย่างเดียว (ไม่มีรหัสผ่านให้กรอกเพราะ account ไม่มี credential ประเภทรหัสผ่านเลย) ได้ผล **"Invalid username or password"** ทันที ไม่ไปถึงหน้ายืนยันตัวตนด้วย OTP เลย — สรุปว่า **account ที่สร้างด้วย login method "OTP" อย่างเดียว ไม่มีช่องทางให้ login ผ่านฟอร์มเว็บมาตรฐานได้เลยในสภาพปัจจุบัน** ไม่ตรงกับ Expected Result ที่คาดว่าระบบจะ "บังคับยืนยันตัวตนด้วย OTP" — กลายเป็นบล็อกไม่ให้เข้าระบบได้เลยแทน

หมายเหตุ
- Evidence: images/create-qa-cor1724-otp-251339-01-filled.png, create-qa-cor1724-otp-251339-02-after-save.png, tc010-01-welcome-page.png, tc010-02-keycloak-login-page.png, tc010-03-login-form-filled.png, tc010-04-after-login-result.png (เห็นข้อความ "Invalid username or password") · วิดีโอ: videos/tc010-011-admin-create-video.webm + videos/tc010-login-video.webm
- **ควรแจ้งทีม dev/product ตรวจสอบ**: อาจเป็นบั๊ก (account ที่สร้างด้วย login method นี้ใช้งานไม่ได้เลย) หรืออาจเป็นเพราะ flow ที่ตั้งใจไว้จริงๆ ต้องใช้ช่องทางอื่น (เช่น WebAuthn/passwordless, invite link ทางอีเมล) ที่ยังไม่ได้ implement หรือไม่ได้เปิดใช้ใน dev-x
```

#### TC-COR-1724-004 — สร้าง account ด้วย login method "OTP พร้อมรหัสผ่านชั่วคราว" + login ครั้งแรกเจอทั้ง 2 required action

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-004
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "The login method chosen at creation decides how the account starts: a temporary password to change at first login, an authenticator to enrol, or both."
- รวมจาก TC เดิม: TC-011

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- วิธีการเมื่อเข้าสู่ระบบ = "OTP พร้อมรหัสผ่านชั่วคราว" — เป็นตัวเลือกที่ 3 แยกต่างหากใน dropdown (single-select) ไม่ใช่การติ๊ก 2 ตัวเลือกพร้อมกัน

Test Steps
1. สร้าง account เลือก "วิธีการเมื่อเข้าสู่ระบบ" = OTP พร้อมรหัสผ่านชั่วคราว แล้วบันทึก
2. Login ด้วย account นั้นเป็นครั้งแรก

Expected Result
- ระบบกำหนดทั้ง required action เปลี่ยน password และยืนยันตัวตนด้วย OTP ให้ account นี้

Actual Result
- Pass — สร้าง account `qa-cor1724-both-410341` เลือก login method "OTP พร้อมรหัสผ่านชั่วคราว" บันทึกสำเร็จ ล็อกอินครั้งแรกด้วยรหัสผ่านชั่วคราว → ระบบ redirect ไปหน้า Keycloak "Mobile Authenticator Setup" ทันที (required action แรก = `CONFIGURE_TOTP`) เปิด "Unable to scan?" เพื่อดึง secret key แบบ manual (base32) มาคำนวณ one-time code ด้วย TOTP algorithm มาตรฐาน (RFC 6238 — ไม่ใช่การ bypass ความปลอดภัย ทำแบบเดียวกับที่แอป authenticator จริงทำ) กรอกโค้ด + ตั้งชื่ออุปกรณ์ กด Submit สำเร็จ → ระบบ redirect ต่อไปหน้า "Update password" ทันที (required action ที่ 2 = `UPDATE_PASSWORD`) ตั้งรหัสผ่านใหม่ กด Submit สำเร็จ → ระบบพาเข้าแอปจริง (`/cortex/apps`) ยืนยันว่าทั้ง 2 required action ถูกกำหนดให้ครบตามที่ Expected Result ระบุ และทำสำเร็จได้จริงทั้งคู่ — ทดสอบซ้ำอีกครั้งกับ account `qa-cor1724-both-827829` ได้ผลเดิมทุกจุด ยืนยันว่า reproducible

หมายเหตุ
- Evidence: images/tc011f-01-create-filled.png ... tc011f-11-final-state.png · วิดีโอ: videos/tc011-admin-create-video.webm + videos/tc011-login-full-enroll-video.webm
```

#### TC-COR-1724-005 — แก้ไข detail+enabled พร้อมกันเป็น change เดียว + clear field สะท้อนจริง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-005
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "An existing account's details and enabled state are edited together and saved as one change; a field cleared on the form is cleared on the account."
- รวมจาก TC เดิม: TC-012, TC-013 (session แก้ไขเดียวกัน)

Preconditions
- มี account ที่มีอยู่แล้วให้แก้ไข (มีค่าใน field ที่ไม่บังคับอยู่ด้วย)

Test Data
- -

Test Steps
1. เปิดหน้าแก้ไข account แก้ field รายละเอียด + toggle enabled ในหน้าเดียวกัน แล้วบันทึกครั้งเดียว
2. reload แล้วยืนยันค่าจาก server (ไม่เชื่อ UI เฉยๆ)
3. เปิดฟอร์มแก้ไขอีกครั้ง ลบค่าใน optional field ออกจนว่าง บันทึก แล้วเปิดดูอีกครั้ง

Expected Result
- Step 1-2: ทั้ง detail และ enabled state ถูกอัปเดตพร้อมกันด้วยการบันทึกครั้งเดียว ไม่ต้องแยก 2 ขั้นตอน
- Step 3: field ที่ clear ไว้ในฟอร์มแสดงเป็นค่าว่างในข้อมูล account จริงด้วย ไม่ใช่ยังเก็บค่าเดิม

Actual Result
- Step 1-2 — Pass: เปิดหน้าแก้ไข `qa-cor1724-main` แก้ field "ชื่อ" เป็น "QA" พร้อม toggle "การใช้งาน" (enabled) จาก เปิด→ปิด ในหน้าเดียวกัน กดบันทึกครั้งเดียว แล้ว reload หน้าใหม่ ยืนยันว่าทั้ง 2 ค่าถูกบันทึกพร้อมกันจริง (ชื่อ="QA", enabled=false) ไม่ต้องแยก 2 ขั้นตอน (หลังเทสคืนค่า enabled กลับเป็นเปิด (true) เพื่อความสะอาดของ test account)
- Step 3 — Pass: field "นามสกุล" มีค่าเดิม "Cor1724Main" อยู่แล้ว เปิดฟอร์มแก้ไข ลบค่าออกจนว่าง บันทึก แล้ว reload หน้าใหม่ ยืนยันว่า field แสดงค่าว่างจริง ไม่ใช่ยังเก็บค่าเดิม

หมายเหตุ
- Evidence: images/tc012-01-before-edit.png, tc012-02-filled-before-save.png, tc012-03-after-save-toast.png, tc012-04-verified-after-reload.png (กรอบเขียว), tc013-01-before-clear.png, tc013-02-cleared-before-save.png, tc013-03-after-save-toast.png, tc013-04-verified-after-reload.png (กรอบเขียว) · วิดีโอ: videos/tc012-013-video.webm (อัดต่อเนื่องทั้งขั้นตอน)
```

#### TC-COR-1724-006 — ลบ account สำเร็จ + list refresh อัตโนมัติ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-006
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "An account can be deleted, behind a confirmation, and the list refreshes."
- รวมจาก TC เดิม: TC-014, TC-015 (action เดียวกัน สังเกต 2 มุม)

Preconditions
- มี account ที่ไม่ใช่ตัวเองและไม่ใช่ service account สำหรับทดสอบลบ

Test Data
- -

Test Steps
1. สร้าง test account ใหม่ ยืนยันสร้างสำเร็จจริงผ่านการค้นหา
2. กดไอคอนลบที่แถว account ในหน้ารายการ กด confirm ใน dialog
3. ถ่ายภาพหน้าจอทันทีโดยไม่ reload สังเกต list
4. reload หน้าใหม่ + ค้นหาชื่อ account อีกครั้ง

Expected Result
- Step 2: account ถูกลบออกจากระบบสำเร็จ
- Step 3: list อัปเดตอัตโนมัติ ไม่แสดง account ที่เพิ่งลบอีกต่อไป โดยไม่ต้อง manual refresh
- Step 4: ยืนยันจาก backend ว่า account หายไปจริง ไม่ใช่แค่ optimistic update ฝั่ง UI

Actual Result
- Step 1-2 — Pass: สร้าง test account ใหม่ `qa-cor1724-del-627269` (login method Username & Password) ยืนยันสร้างสำเร็จจริงผ่านการค้นหาในหน้ารายการ แล้วทดสอบลบ: กดไอคอนลบที่แถว account นี้ → dialog ยืนยันขึ้นข้อความ "ต้องการลบ qa-cor1724-del-627269 หรือไม่ ระบบจะลบบัญชีออกจาก Keycloak และไม่สามารถกู้คืนได้" → กดปุ่ม "ลบ" ยืนยัน
- Step 3 — Pass: ทดสอบลบ account ผ่านไอคอนลบที่แถวใน "หน้ารายการ" โดยตรง หลังกดยืนยันลบ ถ่ายภาพหน้าจอทันทีโดยไม่ reload พบว่าแถวของ account หายไปจากตารางในหน้าเดิมทันที (list อัปเดต in-place อัตโนมัติ)
- Step 4 — Pass: reload หน้าใหม่ + ค้นหาชื่อ account อีกครั้ง ยืนยันว่า account หายไปจากระบบจริง ค้นหาไม่พบอีกต่อไป (ไม่ใช่แค่ optimistic update ฝั่ง UI)

หมายเหตุ
- Evidence: images/create-qa-cor1724-del-627269-01-filled.png, create-qa-cor1724-del-627269-02-after-save.png, delete-setup-01-account-created-verified.png, tc014-01-before-click-delete.png, tc014-02-confirm-dialog-before-confirm.png, tc015-01-list-immediately-after-delete-no-reload.png, tc015-02-verified-gone-after-reload-and-research.png · วิดีโอ: videos/tc014-015-017-video.webm
```

#### TC-COR-1724-007 — ตรวจสอบว่า Cortex ไม่เก็บสำเนาข้อมูล account เอง (Keycloak เป็น system of record)

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-007
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "Keycloak remains the system of record — Cortex stores no copy of the account."
- รวมจาก TC เดิม: TC-016 (วิธีตรวจคนละแบบ — DB access — แยกเดี่ยวจากกลุ่ม UI flow อื่น)

Preconditions
- เข้าถึง Cortex backend/DB ได้ (ถ้าเข้าถึงได้)

Test Data
- -

Test Steps
1. สร้าง/แก้ไข account ผ่าน Cortex
2. ตรวจสอบฝั่ง Cortex DB/backend ว่ามี table เก็บสำเนา credential/account เต็มรูปแบบหรือไม่

Expected Result
- ไม่มีสำเนา account data อยู่ฝั่ง Cortex ข้อมูลที่แสดงมาจาก Keycloak โดยตรงเสมอ

Actual Result
- Not Test — ไม่มีสิทธิ์เข้าถึง Cortex backend/DB โดยตรงในขอบเขตงานนี้ (มีแค่ session ระดับ UI ผ่าน Playwright)

หมายเหตุ
- ต้องมี backend/DB access หรือ log access เพิ่มถึงจะเทสได้จริง
- **มอบให้คนเทสเองผ่าน DB access โดยตรง ไม่ใช่ agent**
```

---

### SC-02 — TS-COR-1724-UHP - Staff account administration

```
ข้อมูลอ้างอิง
- Scenario ID: SC-02
- Case Type: Unhappy
- Suffix: UHP
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่าเมื่อผู้ใช้ยกเลิกหรือกรอกข้อมูลไม่ครบ ระบบตอบสนองอย่างปลอดภัย ไม่ทำรายการที่ไม่ได้ตั้งใจ

ขอบเขต Requirement
- ยกเลิกการลบผ่าน confirmation dialog
- validation เมื่อสร้าง account ไม่ครบข้อมูลบังคับ

ความเสี่ยง
- ถ้ายกเลิกแล้วยังลบจริง จะเป็นความเสี่ยงข้อมูลสูญหายโดยไม่ตั้งใจ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-008 — ยกเลิกการลบ account ที่ confirmation dialog + validation สร้าง account ไม่ครบข้อมูล

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-008
- Scenario ID: SC-02
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "An account can be deleted, behind a confirmation, and the list refreshes." / "A new account is created with a generated temporary password that can be shown, copied or regenerated."
- รวมจาก TC เดิม: TC-017, TC-018 (หน้า user-management เดียวกัน session เดียวกัน — negative checks)

Preconditions
- มี account สำหรับทดสอบยกเลิกการลบ · Login ด้วย role ที่มีสิทธิ์ create

Test Data
- ฟอร์มสร้าง account ที่เว้น field บังคับว่างไว้

Test Steps
1. กดปุ่มลบที่ account จน dialog ขึ้นมา กด cancel/ยกเลิก แล้วค้นหา account นั้นอีกครั้ง
2. เปิดฟอร์มสร้าง account ปล่อย field บังคับว่างแล้วกดบันทึก

Expected Result
- Step 1: account ไม่ถูกลบ ยังอยู่ใน list เหมือนเดิม
- Step 2: ระบบแสดง validation error และไม่สร้าง account

Actual Result
- Step 1 — Pass: บน `qa-cor1724-del-627269` (test account ที่สร้างเอง) กดไอคอนลบจน dialog ยืนยันขึ้นมา กด "ยกเลิก" แทนการยืนยัน แล้วค้นหาชื่อ account อีกครั้งในหน้ารายการ ยืนยันว่า account ยังอยู่ในระบบเหมือนเดิม ไม่ถูกลบ
- Step 2 — Pass: กดบันทึกฟอร์มว่างทั้งหมด แสดง validation error สีแดง "กรุณาระบุชื่อบัญชีผู้ใช้งาน" ใต้ช่องที่บังคับ modal ไม่ปิดและไม่สร้าง account

หมายเหตุ
- Evidence: images/tc017-01-before-click-delete.png, tc017-02-confirm-dialog-shown.png, tc017-03-verified-not-deleted-after-cancel.png (กรอบเขียว), tc018-validation-error.png · วิดีโอ: videos/tc014-015-017-video.webm
```

---

### SC-03 — TS-COR-1724-EDG - Staff account administration

```
ข้อมูลอ้างอิง
- Scenario ID: SC-03
- Case Type: Edge
- Suffix: EDG
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่ากรณีขอบเขต (ผลค้นหาว่าง, page เกินจำนวนจริง) ไม่ทำให้ระบบ error/พัง

ขอบเขต Requirement
- ค้นหาไม่พบผลลัพธ์
- shared link ที่ page เกินจำนวนจริง

ความเสี่ยง
- state ผิดพลาดจาก pagination อาจทำให้ admin เห็นข้อมูลผิดหน้าหรือระบบ crash

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-009 — ค้นหาไม่พบ account ตรงเงื่อนไข + shared link ที่ page เกินจำนวนหน้าที่มีจริง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-009
- Scenario ID: SC-03
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "Accounts can be searched and browsed page by page; the search term, page and page size survive a refresh or a shared link."
- รวมจาก TC เดิม: TC-019, TC-021 (หน้าเดียวกัน ทดสอบ edge ต่อเนื่อง)

Preconditions
- -

Test Data
- keyword ที่ไม่มี account ตรงเงื่อนไขอยู่จริง · URL ที่ page param เป็นเลขเกินจำนวนหน้าที่มีจริง

Test Steps
1. พิมพ์ keyword ที่ไม่มีอยู่จริงในระบบแล้ว search
2. แก้ URL ให้ page param เกินจำนวนหน้าจริงแล้วเปิด link

Expected Result
- Step 1: แสดงผลลัพธ์ว่างเปล่าอย่างถูกต้อง (empty state) ไม่ error
- Step 2: ระบบจัดการอย่างเหมาะสม (เช่น empty state หรือ fallback หน้าสุดท้าย) ไม่ crash/error

Actual Result
- Step 1 — Pass: ค้นหา keyword ที่ไม่มีจริงในระบบ ("zzz-no-such-account-zzz-999") แสดง empty state ปกติ ไม่มี error
- Step 2 — Pass: แก้ query param `page=9999` แล้วเปิด URL ตรงๆ ระบบไม่ crash ไม่มีข้อความ error โผล่บนหน้าจอ

หมายเหตุ
- Evidence: images/tc019-empty-search.png, tc021-page-overflow.png
- **ข้อสังเกต (ไม่ใช่ TC แยก เพราะฟีเจอร์ไม่มีจริงใน UI):** ตรวจ DOM ของ pagination พบว่าเป็น `.ant-pagination-mini` (mode mini ของ antd) ซึ่งไม่มี page-size-changer control อยู่ในหน้านี้เลย — ไม่มีช่องทาง UI ให้เปลี่ยน page size จริง (page size คงที่ 20 รายการ/หน้า) AC bullet เรื่อง "re-calculate page เมื่อเปลี่ยน page size" จึงเทสไม่ได้เพราะ UI ไม่มีฟีเจอร์นี้ ไม่ใช่บั๊ก (เดิมคือ TC-020)
```

---

## หมวด 2: Sign-in methods and credentials

### SC-04 — TS-COR-1724-HPY - Sign-in methods and credentials

```
ข้อมูลอ้างอิง
- Scenario ID: SC-04
- Case Type: Happy
- Suffix: HPY
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่า admin เห็นและจัดการ credential ของ account ได้ครบ (ดู, ลบ authenticator, reset password, ตั้ง required action)

ขอบเขต Requirement
- แสดง credential + วันที่สร้าง
- ลบ authenticator แล้ว enroll ใหม่ได้
- reset password temporary/permanent
- ตั้ง required action โดยไม่ overwrite ของ realm

ความเสี่ยง
- ถ้าตั้ง required action ใหม่แล้วลบของ realm ทิ้ง realm policy จะถูกละเมิด

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-010 — ดูรายการ credential ที่ account enroll ไว้ + วันที่สร้างของแต่ละ credential

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-010
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "An admin can see which credentials an account has enrolled — password, authenticator — and when each was created, which answers "how does this person sign in"."
- รวมจาก TC เดิม: TC-022, TC-023 (หน้าเดียวกัน ดูพร้อมกัน)

Preconditions
- มี account ที่ enroll credential ไว้แล้ว (password, authenticator)

Test Data
- -

Test Steps
1. เปิดหน้า detail ของ account ดูแท็บ/ส่วน credential

Expected Result
- แสดงประเภท credential ที่ enroll ไว้ครบ (password, authenticator ถ้ามี) พร้อมวันที่สร้าง (created date) ถูกต้อง

Actual Result
- Pass — เปิดแท็บ "การเข้าสู่ระบบ" ของ account จริง cashier01 (ดูอย่างเดียว ไม่แก้ไข) ตารางแสดงคอลัมน์ ประเภท/ชื่อเรียก/เพิ่มเมื่อ/จัดการ พบแถว "รหัสผ่าน" ชื่อเรียก "My password" คอลัมน์ "เพิ่มเมื่อ" แสดงวันที่/เวลาชัดเจน (เช่น "02/04/2569 12:02")

หมายเหตุ
- Evidence: images/tc022-credential-list.png (ทดสอบกับ account จริงที่มีอยู่แล้วแบบ read-only ไม่แก้ไข/ไม่ลบ)
```

#### TC-COR-1724-011 — ลบ authenticator ที่สูญหาย + enroll authenticator ใหม่ได้หลังลบตัวเดิม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-011
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "A lost authenticator can be deleted so the user can enrol a new one."
- รวมจาก TC เดิม: TC-024, TC-025 (sequential จริง: ลบแล้ว enroll ต่อ)

Preconditions
- account มี authenticator enroll ไว้แล้ว

Test Data
- -

Test Steps
1. เลือก authenticator ของ account กดลบแล้ว confirm
2. Admin ตั้ง required action "ต้องตั้งค่าแอปยืนยันตัวตน" เพิ่มให้ account
3. Login ด้วย account นั้น ทำ enroll authenticator ใหม่

Expected Result
- Step 1: authenticator ถูกลบออกจาก account สำเร็จ
- Step 2-3: enroll authenticator ตัวใหม่ได้สำเร็จ ไม่ติด error จาก authenticator เก่า

Actual Result
- Step 1 — Pass: เตรียม account `qa-cor1724-both-827829` ที่ enroll OTP ไว้แล้วจริง เปิดแท็บ "การเข้าสู่ระบบ" กดไอคอนลบที่แถว "แอปยืนยันตัวตน (OTP)" dialog ยืนยันขึ้นข้อความ "ลบข้อมูลการเข้าสู่ระบบนี้หรือไม่? ข้อมูล แอปยืนยันตัวตน (OTP) จะถูกลบออกและกู้คืนไม่ได้ ผู้ใช้ต้องลงทะเบียนใหม่" กดยืนยัน "ลบ" แล้ว reload หน้าใหม่ ยืนยันว่าแถว OTP หายไปจริง เหลือแค่ credential รหัสผ่านตัวเดียว
- Step 2-3 — Pass: **พบข้อสังเกตสำคัญระหว่างทดสอบ**: ลองให้ user login ใหม่ทันทีหลังลบ (ด้วย password เดิม) พบว่าระบบ**ไม่บังคับ**ให้ enroll OTP ใหม่โดยอัตโนมัติ — login ผ่านไปที่แอปตรงๆ ด้วย password อย่างเดียว (ตรวจเพิ่มว่ามี self-service account console ให้ user enroll เองไหม → ไม่มี, ขึ้น error "Something went wrong") → ต้องให้ admin ตั้ง required action "ต้องตั้งค่าแอปยืนยันตัวตน" เพิ่มให้ user อีกครั้งถึงจะบังคับ enroll ใหม่ตอน login ครั้งถัดไปได้ — หลังทำขั้นนี้แล้ว ให้ user login ใหม่: ระบบ redirect ไปหน้า "Mobile Authenticator Setup" จริง (secret key ใหม่ คนละตัวกับที่ลบไปแล้ว) ดึง secret มาคำนวณ TOTP code ใหม่ กรอก + Submit สำเร็จ ระบบพาเข้าแอปจริงได้ปกติ ไม่ติด error ใดๆ จาก authenticator ตัวเก่าที่ถูกลบไปเลย

หมายเหตุ
- Evidence: images/tc024-01-create-filled.png, tc024-04-before-delete-authenticator.png, tc024-05-confirm-dialog.png, tc024-06-after-delete-toast.png, tc024-07-verified-authenticator-removed.png, tc025-01-admin-sets-required-action.png, tc025-02-relogin-form-filled.png, tc025-03-required-action-again.png, tc025-04-reenroll-secret-revealed.png, tc025-04-reenroll-code-filled.png, tc025-05-after-reenroll-result.png, tc025-06-verified-final.png · วิดีโอ: videos/tc024-admin-delete-video.webm + videos/tc025-reenroll-video.webm
- **ข้อสังเกตสำคัญที่ควรแจ้งทีม product** (ไม่ใช่บั๊ก แต่เป็นพฤติกรรมที่อาจไม่ตรงกับสมมติฐานตอนแรก): การลบ authenticator ฝั่ง admin เพียงอย่างเดียว **ไม่ทำให้ user ถูกบังคับ enroll ใหม่อัตโนมัติ** ตอน login ครั้งถัดไป ต้องอาศัย 2 ขั้นตอนร่วมกัน (ลบ authenticator + ตั้ง required action ใหม่) ถึงจะบังคับ re-enroll ได้จริง — มิเช่นนั้น account จะตกอยู่ในสถานะ "ไม่มี MFA" เงียบๆ โดยไม่มีใครรู้ตัว
```

#### TC-COR-1724-012 — reset password แบบ temporary + แบบ permanent

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-012
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "A forgotten password can be reset, either as temporary or permanent."
- รวมจาก TC เดิม: TC-026, TC-027 (dialog เดียวกัน ลองสองโหมดต่อกัน)

Preconditions
- มี account สำหรับทดสอบ reset password

Test Data
- -

Test Steps
1. เปิดหน้า credential ของ account เปิด modal "รีเซ็ตรหัสผ่าน" โหมด temporary (default) แล้วยืนยัน reload เช็คผล
2. เปิด modal อีกครั้ง ปิด toggle "รหัสผ่านชั่วคราว" (permanent) แล้วยืนยัน reload เช็คผล

Expected Result
- Step 1: password ถูก reset เป็น temporary บังคับเปลี่ยนตอน login ครั้งถัดไป
- Step 2: password ถูก reset เป็น permanent ไม่บังคับเปลี่ยนตอน login ถัดไป

Actual Result
- Step 1 — Pass: บน `qa-cor1724-main` เปิด modal "รีเซ็ตรหัสผ่าน" ปล่อย toggle "รหัสผ่านชั่วคราว" ไว้ที่ค่า default (เปิด/true) กดยืนยัน แล้ว reload หน้าใหม่ ยืนยัน 2 อย่างพร้อมกัน: (1) แถว credential เปลี่ยนเวลา "เพิ่มเมื่อ" เป็นเวลาปัจจุบัน แสดงว่ารีเซ็ตจริง (2) dropdown "สิ่งที่ต้องทำเมื่อเข้าสู่ระบบครั้งถัดไป" มี "ต้องเปลี่ยนรหัสผ่าน" ถูกเพิ่มให้อัตโนมัติ
- Step 2 — Pass: ต่อจาก step 1 เปิด modal "รีเซ็ตรหัสผ่าน" อีกครั้ง คราวนี้ปิด toggle (permanent) กดยืนยัน reload หน้าใหม่ ยืนยัน (1) แถว credential เปลี่ยนเวลาอีกครั้ง (รีเซ็ตจริง) (2) required action "ต้องเปลี่ยนรหัสผ่าน" ที่เคยค้างจาก step 1 หายไป (กลายเป็นค่าว่าง) — permanent reset ไม่ได้แค่ "ไม่เพิ่ม" required action ใหม่ แต่ยังล้าง required action ที่ค้างจาก temporary ครั้งก่อนหน้าด้วย

หมายเหตุ
- ไม่มีการพิมพ์รหัสผ่านจริงออกที่ไหน (password field ใช้ auto-generate ของระบบ อ่านแค่ timestamp/required-action)
- Evidence: images/tc026-01-before-open-modal.png, tc026-02-modal-temporary-on.png, tc026-03-after-reset-toast.png, tc026-04-verified-after-reload.png, tc027-01-modal-temporary-off.png, tc027-02-after-reset-toast.png, tc027-03-verified-after-reload.png (กรอบเขียว) · วิดีโอ: videos/tc026-027-028-029-video.webm
```

#### TC-COR-1724-013 — ตั้ง required action สำหรับ login ถัดไป + required action ของ realm ไม่ถูก overwrite

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-013
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "An admin can set what the account must do at next login; requirements the realm sets for itself are preserved rather than overwritten."
- รวมจาก TC เดิม: TC-028, TC-029 (sequential: ตั้งแล้วตรวจว่าของเดิมยังอยู่)

Preconditions
- มี account ที่ realm ตั้ง required action เป็น default ไว้อยู่แล้ว (เช่น "ต้องเปลี่ยนรหัสผ่าน" จากตอนสร้าง account)

Test Data
- -

Test Steps
1. เปิดหน้า credential/required action ของ account เลือก required action เพิ่มเติมแล้วบันทึก
2. ตรวจสอบ required action ทั้งหมดของ account หลังบันทึก

Expected Result
- Step 1: required action ใหม่ถูกตั้งค่าให้ account สำเร็จ
- Step 2: required action เดิมที่ realm ตั้งไว้ยังอยู่ครบ ไม่ถูกลบ/overwrite โดย action ใหม่ที่ admin เพิ่ม

Actual Result
- Step 1 — Pass: บน `qa-cor1724-main` (มี required action "ต้องเปลี่ยนรหัสผ่าน" ตั้งมาจากตอนสร้าง account อยู่ก่อนแล้ว) เปิดdropdown "สิ่งที่ต้องทำเมื่อเข้าสู่ระบบครั้งถัดไป" เลือกเพิ่ม "ต้องตั้งค่าแอปยืนยันตัวตน" กดบันทึก reload หน้าใหม่ ยืนยันว่า required action ถูกตั้งค่าสำเร็จจริง
- Step 2 — Pass: หลังบันทึก reload หน้าใหม่ ยืนยันว่า required action มีครบทั้ง 2 รายการพร้อมกัน ("ต้องตั้งค่าแอปยืนยันตัวตน" + "ต้องเปลี่ยนรหัสผ่าน") — ตัวเดิมที่ realm ตั้งไว้ไม่ถูกลบ/overwrite โดยตัวใหม่ที่เพิ่มเข้าไป

หมายเหตุ
- ยังไม่ได้ทดสอบ "มีผลตอน login ครั้งถัดไป" จริงของ action ที่เพิ่งเพิ่ม (ต้อง login ด้วย account นี้ซึ่งจะกระทบ state ที่ใช้ต่อใน TC อื่น) — ยืนยันแค่ฝั่ง admin ตั้งค่าสำเร็จและถูกบันทึกจริง ผลตอน login จริงดูได้ทางอ้อมจาก TC-002 (บังคับเปลี่ยน password ตอน login แรกของ account อื่น)
- Evidence: images/tc028-01-before-add.png, tc028-02-selected-before-save.png, tc028-03-after-save-toast.png, tc028-04-verified-after-reload.png (กรอบเขียว, ภาพเดียวกันครอบคลุมทั้ง step 1-2) · วิดีโอ: videos/tc026-027-028-029-video.webm
```

---

### SC-05 — TS-COR-1724-ERR - Sign-in methods and credentials

```
ข้อมูลอ้างอิง
- Scenario ID: SC-05
- Case Type: Error
- Suffix: ERR
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่าไม่มี secret material ของ credential หลุดออกมาทั้งฝั่ง UI และ API [Security]

ขอบเขต Requirement
- "No secret material is ever shown or returned"

ความเสี่ยง
- secret หลุด (password hash, authenticator key) เป็นช่องโหว่ความปลอดภัยระดับวิกฤต

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-014 — ไม่แสดง secret material ของ credential ทั้งฝั่งหน้าจอ (UI) และ API response

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-014
- Scenario ID: SC-05
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "No secret material is ever shown or returned."
- รวมจาก TC เดิม: TC-030, TC-031 (assertion เดียวกัน 2 ชั้น: UI + network)

Preconditions
- account มี credential (password, authenticator) enroll ไว้

Test Data
- -

Test Steps
1. เปิดหน้า credential list/detail ของ account ตรวจสอบทุกจุดที่แสดงข้อมูล credential บนหน้าจอ
2. เปิด network tab/inspect เรียก API ดึงรายการ credential ของ account แล้วตรวจ response body

Expected Result
- Step 1: ไม่มี secret จริง (password hash, authenticator secret key) แสดงบนหน้าจอที่ใดเลย
- Step 2: response body ไม่มี field ที่เป็น secret จริง (มีเฉพาะ metadata เช่น type, createdDate)

Actual Result
- Step 1 — Pass: เปิดแท็บ "การเข้าสู่ระบบ" ของ account จริง cashier01 (ดูอย่างเดียว) ตรวจข้อความทั้งหน้าไม่พบ string ที่มีลักษณะเป็น secret/hash เลย มีแค่ประเภท ("รหัสผ่าน"), ชื่อเรียก ("My password"), วันที่เพิ่ม และ user ID (UUID, ไม่ใช่ secret)
- Step 2 — Pass: ดัก network response ของ `GET /cortex-api/users/{id}/credentials` (status 200) ขณะเปิดแท็บ credential ของ cashier01 ตรวจ response body ด้วย regex เทียบ field name ที่เป็น secret pattern ไม่พบ field password/hash/secret/secretData/credentialData เลย มีแค่ metadata

หมายเหตุ
- Evidence: images/tc030-no-secret-shown.png
```

---

## หมวด 3: Role assignment

### SC-06 — TS-COR-1724-HPY - Role assignment

```
ข้อมูลอ้างอิง
- Scenario ID: SC-06
- Case Type: Happy
- Suffix: HPY
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่า admin ดู/assign/remove role ของ account ได้ครบตาม flow ปกติ พร้อม search ที่ไม่ทำ selection หาย

ขอบเขต Requirement
- แสดง role ปัจจุบัน, assign เดี่ยว/หลายตัว, filter เฉพาะ role ที่ยังไม่มี
- ค้นหาโดย selection ไม่หาย, remove เดี่ยว/bulk, confirmation ระบุชื่อ role ถูกต้อง

ความเสี่ยง
- ถ้า confirmation ไม่ระบุชื่อ role ที่ถูกต้อง admin อาจ revoke role ผิดตัวโดยไม่รู้ตัว

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-015 — ดู role list ของ account + assign role เดียวสำเร็จ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-015
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "An admin can see the roles an account holds and assign or remove them from the user detail screen."
- รวมจาก TC เดิม: TC-032, TC-033 (sequential: ดู role ปัจจุบัน→assign เพิ่ม)

Preconditions
- Login ด้วย role ที่มีสิทธิ์ edit role

Test Data
- role 1 รายการที่ account ยังไม่มี

Test Steps
1. เปิดหน้า detail ของ account ที่มี role อยู่แล้ว ดูส่วน role
2. บน account อื่นที่ยังไม่มี role กดปุ่ม assign role เลือก role 1 รายการแล้ว confirm
3. reload หน้าใหม่ (เช็คจาก server จริง)

Expected Result
- Step 1: แสดง role ที่ account ถืออยู่จริงครบถ้วนถูกต้อง
- Step 2-3: account ได้รับ role ที่เลือกสำเร็จ ปรากฏใน role list ของ account

Actual Result
- Step 1 — Pass: เปิดแท็บ "บทบาทการใช้งาน" ของ account จริง user1 (Super_User, ดูอย่างเดียว) แสดง role ที่ถืออยู่จริง 2 รายการ: cashier-head, admin
- Step 2-3 — Pass: บน `qa-cor1724-main` (ไม่มี role มาก่อน) เปิด modal "กำหนดบทบาท" เลือก role "cashier" 1 รายการ กดยืนยัน แล้ว reload หน้าใหม่ ยืนยันว่า role "cashier" ปรากฏในรายการ role ของ account จริง — ทดสอบซ้ำอีกครั้ง (assign role "coder" เดี่ยวให้ account ที่มี cashier อยู่ก่อนแล้ว) ได้ผลเดียวกัน

หมายเหตุ
- Evidence: images/tc032-role-list.png, tc033-01-before-empty.png, tc033-02-after-save-toast.png, tc033-03-verified-after-reload.png · วิดีโอ: videos/tc033-034-video.webm
```

#### TC-COR-1724-016 — assign หลาย role พร้อมกัน + filter เฉพาะ role ที่ยังไม่มี + ค้นหา role + selection ไม่หายเมื่อค้นหาใหม่

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-016
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Assigning offers only the roles the account does not already hold, searchable, several at a time; a search never loses what was already selected."
- รวมจาก TC เดิม: TC-034, TC-035, TC-036, TC-037 (modal "กำหนดบทบาท" เดียวกันทั้งหมด)

Preconditions
- Login ด้วย role ที่มีสิทธิ์ edit role · account มี role อยู่แล้วอย่างน้อย 1 ตัว

Test Data
- role หลายรายการที่ account ยังไม่มี · keyword ที่ตรงกับ role บางส่วน

Test Steps
1. เปิด modal "กำหนดบทบาท" ของ account ที่มี role อยู่แล้ว ดูรายการ role ที่เลือกได้
2. พิมพ์ keyword ค้นหา role ในช่องค้นหา
3. เลือก role หลายรายการพร้อมกัน แล้วพิมพ์ keyword ใหม่ กลับไปดู role ที่เลือกไว้ตอนแรก
4. กด confirm

Expected Result
- Step 1: role ที่ account มีอยู่แล้วไม่ปรากฏในรายการให้เลือก assign ซ้ำ
- Step 2: แสดงเฉพาะ role ที่ตรงกับ keyword ที่ค้นหา
- Step 3: role ที่เลือกไว้ตั้งแต่การค้นหาครั้งแรกยังคงถูกเลือกอยู่ แม้ค้นหาด้วยคำใหม่แล้ว
- Step 4: account ได้รับ role ทั้งหมดที่เลือกพร้อมกันสำเร็จ

Actual Result
- Step 1 — Pass: เปิด modal "กำหนดบทบาท" ของ account จริง cashier01 (ดูอย่างเดียว ไม่กดยืนยัน) รายการ role ที่เลือกได้ไม่มี role ที่ account มีอยู่แล้วปน (cashier01 ตอนทดสอบไม่มี role เลย จึงเป็นกรณี trivial-pass — ควรทดสอบซ้ำกับ account ที่มี role อยู่ก่อนถ้ามีโอกาส)
- Step 2 — Pass: ในหน้าต่าง "กำหนดบทบาท" ของ cashier01 พิมพ์ "nurse" ในช่องค้นหา ได้ผลลัพธ์ 1 แถวตรงกับ keyword
- Step 3 — Pass: เลือก checkbox "nurse" แล้วค้นหาคำใหม่ "physician" จากนั้นค้นกลับมา "nurse" checkbox ที่เลือกไว้ตั้งแต่แรกยังติ๊กอยู่ (selection ไม่หายไปกับผลการค้นหา) — ทดสอบใน modal ที่ยังไม่ยืนยัน แล้วกด "ยกเลิก" ปิด modal ไม่มีการเปลี่ยนแปลง role จริง
- Step 4 — Pass: ต่อจาก TC-015 (`qa-cor1724-main` มี role "cashier" อยู่แล้ว) เปิด modal "กำหนดบทบาท" เลือก 3 role พร้อมกัน (nurse, coder, physician) กดยืนยันครั้งเดียว แล้ว reload หน้าใหม่ ยืนยันว่าทั้ง 3 role ปรากฏพร้อมกันจริง (รวมกับ cashier เดิม = 4 role ทั้งหมด)

หมายเหตุ
- Evidence: images/tc035-assign-role-modal-open.png, tc036-assign-role-search.png, tc037-search-again-check-selection.png, tc037-selection-persisted.png, tc034-01-before.png, tc034-02-after-save-toast.png, tc034-03-verified-after-reload.png · วิดีโอ: videos/tc033-034-video.webm
```

#### TC-COR-1724-017 — ลบ role ออกทีละตัว + ลบแบบ bulk หลายตัวพร้อมกัน + confirmation dialog ระบุชื่อ role ถูกต้อง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-017
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Roles can be removed one at a time or in bulk, with a confirmation that names what is about to be revoked."
- รวมจาก TC เดิม: TC-038, TC-039, TC-040 (dialog ลบ role เดียวกัน)

Preconditions
- account มี role อยู่แล้วหลายตัว

Test Data
- -

Test Steps
1. เลือก role 1 ตัวที่ account มี กดไอคอนลบ สังเกตข้อความ dialog แล้วกด "นำออก" ยืนยัน
2. เลือกหลาย role พร้อมกัน กดปุ่มลบแบบ bulk สังเกตข้อความ dialog แล้วยืนยัน
3. reload หน้าใหม่ตรวจสอบผล

Expected Result
- Step 1: dialog แสดงชื่อ role ที่กำลังจะถูก revoke ตรงกับที่เลือกไว้ จากนั้น role นั้นถูกลบออกจาก account สำเร็จ
- Step 2: dialog แสดงชื่อ role ทั้งหมดที่เลือก จากนั้น role ทั้งหมดที่เลือกถูกลบออกจาก account พร้อมกันสำเร็จ
- Step 3: role อื่นที่ไม่ได้เลือกไม่ถูกกระทบ

Actual Result
- Step 1 — Pass: บน `qa-cor1724-main` (มี role nurse, physician, cashier, coder) เลือก role "physician" กดไอคอนลบ dialog ยืนยันขึ้นข้อความ "นำบทบาทนี้ออกหรือไม่? บทบาท physician จะถูกนำออกจากบัญชีนี้ พร้อมกับสิทธิ์ทั้งหมดที่ได้จากบทบาทนี้" — ระบุชื่อ role "physician" ตรงกับที่เลือกไว้ถูกต้อง กดยืนยัน "นำออก" ดักเครือข่ายเห็น `DELETE /cortex-api/users/{id}/roles` payload `{"roleNames":["physician"]}` แล้ว reload หน้าใหม่ ยืนยันว่า physician หายไปจริง เหลือ role nurse, cashier, coder (3 รายการ)
- Step 2 — Pass: ต่อจาก step 1 เลือก checkbox ของ nurse + coder พร้อมกัน กดปุ่ม "นำที่เลือกออก" dialog แสดงข้อความ "บทบาท 2 รายการจะถูกนำออกจากบัญชีนี้ ... : nurse, coder" ระบุชื่อครบถูกต้อง กดยืนยัน ดักเครือข่ายเห็น `DELETE /cortex-api/users/{id}/roles` payload `{"roleNames":["nurse","coder"]}` (คำขอเดียว ลบ 2 role พร้อมกัน)
- Step 3 — Pass: reload หน้าใหม่ ยืนยันว่าเหลือ role cashier ตัวเดียว ("ทั้งหมด 1 บทบาท") — nurse และ coder ถูกนำออกพร้อมกันสำเร็จจริง ไม่มี role อื่นที่ไม่เกี่ยวข้องถูกกระทบ

หมายเหตุ
- Evidence: images/tc038-01-confirm-dialog.png, tc038-02-after-remove-toast.png, tc038-03-verified-after-reload.png, tc039-01-bulk-selected.png, tc039-02-bulk-confirm-dialog.png, tc039-03-after-bulk-remove-toast.png, tc039-04-verified-after-reload.png, tc040-01-before-click-trash.png, tc040-02-dialog-shows-role-name.png · วิดีโอ: videos/tc040-044-038-039-video.webm
```

---

### SC-07 — TS-COR-1724-ERR - Role assignment

```
ข้อมูลอ้างอิง
- Scenario ID: SC-07
- Case Type: Error
- Suffix: ERR
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่า role name ที่ไม่มีอยู่จริงทำให้ทั้ง request fail ไม่ partial-apply [Security/Integrity]

ขอบเขต Requirement
- "A role name that no longer exists fails the whole request rather than half-applying it"

ความเสี่ยง
- ถ้า apply บางส่วน account อาจได้ role ที่ตั้งใจให้ทั้งชุดไม่ครบ กลายเป็นสิทธิ์ไม่ตรงตามที่ตั้งใจ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-018 — assign role ที่มี role name ไม่มีจริงปนอยู่ ทำให้ทั้ง request fail (ไม่ partial-apply)

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-018
- Scenario ID: SC-07
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "A role name that no longer exists fails the whole request rather than half-applying it."
- รวมจาก TC เดิม: TC-041 (security-critical, ต้องยิง API ตรง)

Preconditions
- Login ด้วย role ที่มีสิทธิ์ edit role · มี account ทดสอบที่รู้ role ปัจจุบันแน่ชัด

Test Data
- payload รวม role จริง 1 ตัวที่ account ยังไม่มี + role ปลอม 1 ตัวที่ไม่มีอยู่จริง

Test Steps
1. ยิง `POST /cortex-api/users/{id}/roles` ตรงด้วย Bearer token จริง payload มี role จริง + role ปลอมปนกัน
2. ตรวจสอบ role ของ account ทั้งผ่าน API และ UI หลัง reload

Expected Result
- ทั้ง request fail ไม่มี role ไหนถูก apply เลย แม้แต่ตัวที่เป็น role จริง

Actual Result
- Pass — login Admin เปิด `qa-cor1724-main` (ID `6f678ef8-4f0d-44c7-8810-f1667461aa88`, มี role เดิมแค่ `cashier`) ยิง `POST /cortex-api/users/{id}/roles` ตรงด้วย Bearer token จริง payload `{"roleNames":["nurse","role-does-not-exist-cor1724-041"]}` (1 role จริงที่ยังไม่เคยมี + 1 role ปลอม) ได้ **400 `ErrUserRoleNotFound`** — ทั้ง request fail ทันที ไม่มี role ไหนถูก apply เลย ตรวจซ้ำทั้งผ่าน API (`GET .../roles`) และผ่าน UI หลัง reload ยืนยันตรงกันว่า role ยังเหลือแค่ `cashier` ไม่มี partial-apply จริง

หมายเหตุ
- Evidence: images/tc041-01-before-state.png (กรอบแดง), tc041-02-api-result-evidence.png (กรอบเขียว), tc041-03-ui-confirmed-after-reload.png (กรอบเขียว) · วิดีโอ: videos/tc041-video.webm
- ไม่ต้อง cleanup เพราะไม่มีอะไรเปลี่ยนแปลงจริง
```

---

### SC-08 — TS-COR-1724-EDG - Role assignment

```
ข้อมูลอ้างอิง
- Scenario ID: SC-08
- Case Type: Edge
- Suffix: EDG
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่าส่ง role ที่ account มีอยู่แล้วซ้ำไม่ทำให้เกิดการเปลี่ยนแปลง และไม่รายงานผลเป็น error ปลอม

ขอบเขต Requirement
- "Re-sending a role the account already holds changes nothing and is recorded as nothing"

ความเสี่ยง
- ถ้ารายงานผลผิด (error ปลอม หรือ "สำเร็จ" ทั้งที่ไม่มีอะไรเปลี่ยน) จะทำให้ admin สับสนเรื่องสถานะจริงของ role

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-019 — ส่ง role ซ้ำที่ account มีอยู่แล้วไม่เปลี่ยนแปลงอะไร + บันทึกเป็น no-op ไม่ใช่ error ปลอม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-019
- Scenario ID: SC-08
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Re-sending a role the account already holds changes nothing and is recorded as nothing."
- รวมจาก TC เดิม: TC-042, TC-043 (assertion เดียวกัน 2 มุม: UI+response code)

Preconditions
- account มี role อยู่แล้วอย่างน้อย 1 ตัว

Test Data
- role ที่ account ถืออยู่แล้ว

Test Steps
1. ยิง request assign role ตัวที่ account มีอยู่แล้วซ้ำอีกครั้ง (ผ่าน API ถ้า UI กรองออกไปแล้ว)
2. ตรวจสอบ response code/body และ role list หลัง reload

Expected Result
- ไม่มีการเปลี่ยนแปลงใด ๆ เกิดขึ้นกับ role ของ account และระบบตอบกลับ/บันทึกว่าเป็นการดำเนินการที่ไม่มีผล (no-op) ไม่ใช่แสดงเป็น error ปลอม หรือรายงานว่า assign สำเร็จทั้งที่ไม่มีอะไรเปลี่ยน

Actual Result
- Pass — `qa-cor1724-main` มี role "cashier" อยู่แล้ว (UI modal assign กรอง role ที่มีอยู่แล้วออกจากรายการเลือกจริง ตรงตามที่คาดไว้) ยิง `POST /cortex-api/users/{id}/roles` ตรงด้วย Bearer token จริงของ Super_User payload `{"roleNames":["cashier"]}` ซ้ำกับ role ที่มีอยู่แล้ว ได้ response **status 204 No Content** แล้ว reload หน้า role list ยืนยันว่าไม่มีอะไรเปลี่ยนแปลง (ยังมี cashier รายการเดียว ไม่มีรายการซ้ำ ไม่มี role อื่นหายไป) — status 204 เป็นสัญญาณมาตรฐานของ "รับคำขอสำเร็จแต่ไม่มีอะไรเปลี่ยนแปลง" ไม่ใช่ error (ไม่ใช่ 4xx/5xx) และไม่ใช่ 200 พร้อม body หลอกว่า "assign สำเร็จ" ทั้งที่ role เดิมมีอยู่แล้ว — ถือว่าระบบตอบกลับ/บันทึกการดำเนินการนี้เป็น no-op ที่ถูกต้อง

หมายเหตุ
- Evidence: images/tc042-01-before-duplicate-request.png, tc042-02-api-response-panel.png (แสดง status 204), tc042-03-verified-no-change-after-reload.png (กรอบเขียว) — ไม่มีข้อมูล token/secret ปนอยู่ในไฟล์ evidence · วิดีโอ: videos/tc042-043-video.webm (ทดสอบซ้ำ ได้ status 204 เหมือนเดิมทุกจุด ยืนยันผล reproducible)
```

---

### SC-09 — TS-COR-1724-UHP - Role assignment

```
ข้อมูลอ้างอิง
- Scenario ID: SC-09
- Case Type: Unhappy
- Suffix: UHP
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่าการยกเลิกการลบ role ผ่าน confirmation dialog ไม่ทำให้ role ถูกลบจริง

ขอบเขต Requirement
- "with a confirmation that names what is about to be revoked" (โดยนัยต้องยกเลิกได้)

ความเสี่ยง
- ถ้ายกเลิกแล้วยัง revoke จริง admin จะเสีย role โดยไม่ตั้งใจ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- Scenario นี้มี TC เดียว ไม่ได้ merge เข้ากับ F017 (SC-06) แม้เป็น dialog ลบ role แบบเดียวกัน เพื่อไม่ให้ Scenario นี้ไม่มี TC ของตัวเองเลย (รักษาโครงสร้าง EXE→Scenario→TC ให้ครบ)
```

#### TC-COR-1724-020 — ยกเลิกการลบ role ที่ confirmation dialog

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-020
- Scenario ID: SC-09
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Roles can be removed one at a time or in bulk, with a confirmation that names what is about to be revoked."
- รวมจาก TC เดิม: TC-044

Preconditions
- account มี role ให้เลือกลบหลายตัว

Test Data
- -

Test Steps
1. เลือก role ที่จะลบ กดลบแล้วดู dialog ที่ขึ้นมา
2. กด cancel แทนการยืนยัน
3. reload ตรวจสอบ role list

Expected Result
- role ไม่ถูกลบ ยังอยู่ใน role list ของ account เหมือนเดิม

Actual Result
- Pass — ต่อจาก TC-017/step1 (dialog ลบ role "physician" ขึ้นมาแล้ว) กด "ยกเลิก" แทนการยืนยัน แล้ว reload หน้าใหม่ ยืนยันว่า role "physician" ยังอยู่ครบ ไม่ถูกลบ (ตัวนับหน้าเว็บยังแสดง "ทั้งหมด 4 บทบาท" เท่าเดิม — nurse/physician/cashier/coder ครบทั้งหมด)

หมายเหตุ
- Evidence: images/tc044-01-before-cancel.png, tc044-02-verified-not-removed-after-reload.png (กรอบเขียว) · วิดีโอ: videos/tc040-044-038-039-video.webm
```

---

## หมวด 4: Baseline access for new accounts

### SC-10 — TS-COR-1724-HPY - Baseline access for new accounts

```
ข้อมูลอ้างอิง
- Scenario ID: SC-10
- Case Type: Happy
- Suffix: HPY
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่า account บุคคลใหม่ได้ baseline access (FHIR/PostgREST/EHRbase) อัตโนมัติ ขณะที่ service account ไม่ได้รับ และ environment ใหม่ provision ได้เองผ่าน seed

ขอบเขต Requirement
- baseline access ให้เฉพาะคน ไม่ใช่ service account
- fresh environment provision baseline ผ่าน Keycloak seed

ความเสี่ยง
- ถ้า service account ได้รับ baseline access ไปด้วย จะเป็นการให้สิทธิ์เกินความจำเป็น (over-privilege)

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-021 — baseline access FHIR/PostgREST/EHRbase ของ account บุคคลใหม่ (อัตโนมัติ) + service account ไม่ได้รับ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-021
- Scenario ID: SC-10
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Baseline access for new accounts): "Every account created through Cortex receives the baseline access a person needs — FHIR, PostgREST and EHRbase — without an admin granting it by hand." / "Baseline access is granted to people only; the service accounts Keycloak creates for clients do not receive it."
- รวมจาก TC เดิม: TC-045, TC-046, TC-047, TC-048 (วิธีตรวจเดียวกันผ่าน Keycloak console เมื่อมีสิทธิ์)

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create · มี client ใน Keycloak ที่เปิดใช้งาน service account

Test Data
- -

Test Steps
1. สร้าง account บุคคลใหม่ผ่าน Cortex ให้สำเร็จ
2. ตรวจสอบสิทธิ์ FHIR / PostgREST / EHRbase ของ account (ผ่าน Keycloak admin console หรือ endpoint ตรวจสอบ scope)
3. ตรวจสอบสิทธิ์ baseline เดียวกันของ service account ที่ Keycloak สร้างให้ client

Expected Result
- Step 1-2: account ได้รับ baseline access ทั้ง 3 ระบบ (FHIR, PostgREST, EHRbase) โดยไม่ต้อง admin grant มือ
- Step 3: service account ไม่ได้รับ baseline access ที่ให้เฉพาะ "คน"

Actual Result
- Step 1-2 — Not Test: **TC-005 (บั๊ก toast error) ไม่ใช่ตัวบล็อกจริง** (รู้แล้วว่าสร้าง account สำเร็จจริงแม้ UI จะขึ้น error ผิด มีวิธีสร้าง account สำรองพร้อมใช้) — **ตัวบล็อกจริงคือไม่มีช่องทาง/สิทธิ์เข้า Keycloak admin console หรือ endpoint ตรวจสอบ scope ของ FHIR/PostgREST/EHRbase โดยตรง** ต่อให้มี account ใหม่ก็ยังตรวจสอบสิทธิ์ของมันไม่ได้อยู่ดี
- Step 3 — Not Test: ตรวจแบบ read-only แล้ว (ห้ามแก้ไข service account จริง): ค้นหา "service"/"client" ในหน้า "ผู้ใช้งานในระบบ" ของ Cortex ไม่พบ service account ใดๆเลย — หน้ารายการนี้ของ Cortex ดูเหมือนแสดงเฉพาะ staff/บุคคลเท่านั้น จึงไม่มีช่องทางตรวจสอบสิทธิ์ baseline ของ service account ผ่าน UI นี้ได้

หมายเหตุ
- ต้องมีช่องทางตรวจสอบสิทธิ์ FHIR/PostgREST/EHRbase เพิ่มเติม (Keycloak admin console หรือเทียบ token claims) และสิทธิ์เข้า Keycloak admin console โดยตรงถึงจะเทส step 3 ได้
- **มอบให้คนเทสเองผ่าน Keycloak console โดยตรง ไม่ใช่ agent**
- **หลักฐานทางอ้อมที่พบเพิ่ม (8 ต.ค. 2026, สำรวจ exploratory flow แยกต่างหาก):** decode JWT access token ของ account ใหม่ที่สร้างผ่าน Cortex (ก่อนมี role ใดๆ) พบว่า `aud` claim มี `"postgrest"` อยู่แล้วตั้งแต่ token แรกสุด เป็นหลักฐานทางอ้อมที่สนับสนุนว่าได้ baseline access PostgREST จริง (evidence: `.playwright-mcp/e2e-user-role-exploration/images/flowC-01-decoded-jwt-claims-panel.png`) — **ไม่พบคำว่า "fhir" หรือ "ehrbase" ในที่ไหนเลยในที่ claims** จึงยังไม่มีหลักฐานสนับสนุนส่วน FHIR/EHRbase — รอ user ตัดสินใจว่าจะยอมรับหลักฐาน JWT ทางอ้อมนี้สำหรับส่วน PostgREST เป็น Pass หรือยังต้องรอ Keycloak console ยืนยันตรง
```

#### TC-COR-1724-022 — environment ใหม่ provision baseline ผ่าน Keycloak seed ได้เอง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-022
- Scenario ID: SC-10
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Baseline access for new accounts): "A fresh environment provisions this baseline as part of its Keycloak seed, so the behaviour is not dependent on a hand-made realm."
- รวมจาก TC เดิม: TC-049 (precondition ต่างจาก F021 โดยสิ้นเชิง — ต้องมี fresh environment แยกเดี่ยว)

Preconditions
- มี environment ที่ seed ใหม่ (fresh) ตาม process การ deploy

Test Data
- -

Test Steps
1. ตรวจสอบ realm/role/client scope ที่เกี่ยวกับ baseline access หลัง seed เสร็จ โดยไม่มีการตั้งค่ามือเพิ่มเติม

Expected Result
- baseline access (FHIR/PostgREST/EHRbase) พร้อมใช้งานตั้งแต่ seed เสร็จ โดยไม่ต้องพึ่ง realm ที่ทำมือ

Actual Result
- Not Test (N/A) — ต้องมี fresh environment ถึงจะเทสได้ ไม่มีให้ทดสอบบน dev-x ที่มีอยู่แล้ว

หมายเหตุ
- ตามที่ตกลงไว้ล่วงหน้า ข้ามการเทส TC นี้บน dev-x
```

---

### SC-11 — TS-COR-1724-ERR - Baseline access for new accounts

```
ข้อมูลอ้างอิง
- Scenario ID: SC-11
- Case Type: Error
- Suffix: ERR
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่าเมื่อ baseline grant ล้มเหลว account ยังถูกสร้างสำเร็จ และ gap ถูกบันทึกไว้ ไม่ปิดบังว่าสำเร็จสมบูรณ์ [Security/Reliability]

ขอบเขต Requirement
- "If the baseline grant fails, the account is still created and the gap is recorded rather than silently passed off as complete"

ความเสี่ยง
- ถ้า silently รายงานว่าสำเร็จ admin จะไม่รู้ว่า account ขาด baseline access และปล่อยผ่านไป

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-023 — account ยังถูกสร้างสำเร็จแม้ baseline grant ล้มเหลว + ระบบบันทึก/แสดง gap

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-023
- Scenario ID: SC-11
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Baseline access for new accounts): "If the baseline grant fails, the account is still created and the gap is recorded rather than silently passed off as complete."
- รวมจาก TC เดิม: TC-050, TC-051 (sequential: จำลอง fail แล้วตรวจผล)

Preconditions
- สามารถจำลองสถานการณ์ baseline grant ล้มเหลวได้ (เช่น service ที่ grant สิทธิ์ down หรือ mock failure)

Test Data
- -

Test Steps
1. สร้าง account บุคคลใหม่ในสถานการณ์ที่ baseline grant จะ fail
2. ตรวจสอบผลลัพธ์/สถานะที่แสดงหลังสร้าง account

Expected Result
- Step 1: account ยังถูกสร้างสำเร็จ ไม่ rollback การสร้าง account ทั้งหมดเพราะ baseline grant fail
- Step 2: ระบบระบุ/บันทึกว่า baseline access ส่วนที่ fail คือ gap ที่ต้องตามแก้ ไม่รายงานว่า "สร้างสำเร็จสมบูรณ์" ทั้งที่ยังขาด baseline

Actual Result
- Not Test — ไม่มีช่องทางจำลอง baseline-grant-failure ได้จริงบน dev-x (ไม่มีสิทธิ์ปิด/ทำให้ FHIR/PostgREST/EHRbase service ล้มแบบควบคุมได้) ไม่ลองจำลองแบบเสี่ยงตามที่ตกลงไว้ (TC-005 ไม่ใช่ตัวบล็อกร่วมแล้ว — สร้าง account ใหม่ได้จริงแล้ว แค่ยังจำลอง baseline-grant-failure ไม่ได้อยู่ดี)

หมายเหตุ
- ต้องมี mock/staging environment แยกถึงจะเทสสถานการณ์นี้ได้อย่างปลอดภัย
- **มอบให้คนเทสเองผ่าน mock/staging environment โดยตรง ไม่ใช่ agent**
```

---

## หมวด 5: Permissions and safeguards (Security-critical)

### SC-12 — TS-COR-1724-HPY - Permissions and safeguards

```
ข้อมูลอ้างอิง
- Scenario ID: SC-12
- Case Type: Happy
- Suffix: HPY
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่า role ที่มีสิทธิ์เต็ม (super-user, admin) เห็น control ครบทุกปุ่มตามที่ออกแบบไว้

ขอบเขต Requirement
- "Each operation carries its own permission — view, create, edit, delete — and only super-user and admin hold them"

ความเสี่ยง
- ถ้า super-user/admin เห็น control ไม่ครบ จะกระทบการทำงานปกติของผู้ดูแลระบบ

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-024 — role super-user และ role admin เห็นเมนูและ control ครบทุกปุ่ม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-024
- Scenario ID: SC-12
- Case Type: Happy
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Each operation carries its own permission — view, create, edit, delete — and only super-user and admin hold them."
- รวมจาก TC เดิม: TC-052, TC-053 (assertion เดียวกัน 2 role)

Preconditions
- Login ด้วย account role Super_User · Login ด้วย account role Admin

Test Data
- -

Test Steps
1. Login ด้วย Super_User เปิดเมนู/หน้าจอ user management ทั้งหมด
2. Login ด้วย Admin เปิดเมนู/หน้าจอ user management ทั้งหมด

Expected Result
- ทั้ง 2 role เห็นปุ่ม/control ครบ view, create, edit, delete

Actual Result
- Step 1 — Pass: login ด้วย Super_User เห็น control ครบทุกจุด: ปุ่ม "เพิ่มผู้ใช้งาน" ในหน้ารายการ, ปุ่มแก้ไข/ลบต่อแถว, ปุ่ม "ลบผู้ใช้งาน" ในหน้า detail, ปุ่ม "รีเซ็ตรหัสผ่าน" ในแท็บการเข้าสู่ระบบ, ปุ่ม "กำหนดบทบาท" ในแท็บบทบาทการใช้งาน
- Step 2 — Pass: login ด้วย Admin (บัญชีจริงของผู้ใช้บน dev-x) เห็น control ครบทุกจุดเหมือนกับ Super_User

หมายเหตุ
- Evidence: images/tc-052-super_user-list-controls.png, images/tc-052-super_user-detail-controls.png, images/tc-053-admin-list-controls.png, images/tc-053-admin-detail-controls.png
```

---

### SC-13 — TS-COR-1724-ERR - Permissions and safeguards

```
ข้อมูลอ้างอิง
- Scenario ID: SC-13
- Case Type: Error
- Suffix: ERR
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันทุก safeguard ด้าน security ของฟีเจอร์นี้: UI gating, backend enforcement, self-modification prevention,
  service account protection — ทั้ง UI-level และ API-level (กันเคส UI ซ่อนปุ่มแต่ API ยังยิงผ่านได้) [Security — หนักสุดของการ์ดนี้]

ขอบเขต Requirement
- "The menu and every screen control are gated on permission: a role without edit or delete rights gets a read-only view, not a failing button"
- "An admin cannot change their own credentials or roles"
- "Service accounts are refused on every write"
- "Deletion is permanent and the confirmation dialog is the only guard, which is why delete is granted narrowly"

ความเสี่ยง
- นี่คือกลุ่ม risk สูงสุดของการ์ด: ถ้าพังจุดใดจุดหนึ่ง อาจนำไปสู่ privilege escalation, self-approval ของ admin เอง,
  หรือ lock Cortex ออกจาก Keycloak ผ่านการแก้ service account

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement — ทุก TC ในกลุ่มนี้ต้องตรวจทั้ง UI และ backend (API) แยกกัน ไม่ใช่เชื่อ UI อย่างเดียว
- แคตตาล็อกสิทธิบน dev-x มีสิทธิเดียวคือ `menu:setting:user-management` ไม่มีสิทธิแยก view/create/edit/delete ตามที่ AC อธิบาย —
  F025/F026 ด้านล่างจึงทดสอบ permission key เดียวนี้ผ่านช่องทาง/endpoint ต่าง ๆ แทนการมี 4 permission แยกกัน — gap ระหว่าง AC
  กับของจริงนี้ควรแจ้งทีม product แยกไว้ด้วย
```

#### TC-COR-1724-025 — เมนู "ผู้ใช้งานในระบบ"/"บทบาทและสิทธิการใช้งาน" ไม่แสดง + URL ตรงถูกบล็อกสำหรับ role ที่ไม่มีสิทธิ์

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-025
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "The menu and every screen control are gated on permission: a role without edit or delete rights gets a read-only view, not a failing button."
- รวมจาก TC เดิม: TC-054, TC-055, TC-056, TC-057 (role เดียวกัน ไล่ 2 หน้าในเซสชันเดียว)

Preconditions
- Login ด้วย role ที่ไม่มีสิทธิ์ `menu:setting:user-management` (Doctor/Nurse ตาม .env)

Test Data
- URL ตรง: `/cortex/setting/admin/user-management`, `/cortex/setting/admin/role-management`

Test Steps
1. ขยายแถบนำทาง → เปิดเมนู ผู้ดูแลระบบ → โรงพยาบาล สังเกตว่ามีเมนู "ผู้ใช้งานในระบบ" และ "บทบาทและสิทธิการใช้งาน" ไหม
2. พิมพ์/เปิด URL `/cortex/setting/admin/user-management` ตรง ๆ โดยไม่ผ่านเมนู
3. พิมพ์/เปิด URL `/cortex/setting/admin/role-management` ตรง ๆ โดยไม่ผ่านเมนู

Expected Result
- Step 1: เมนูทั้ง 2 ไม่ปรากฏในรายการให้เลือกเลย
- Step 2-3: ถูกกันไม่ให้เข้าหน้าจอ (redirect หรือแสดงหน้า access-denied) ไม่ใช่เข้าเห็นข้อมูลได้ทั้งที่เมนูถูกซ่อน

Actual Result
- Step 1 — Pass: Doctor: app tile "ผู้ดูแลระบบ" ยังเห็น แต่หลังขยายแถบนำทาง → โรงพยาบาล ไม่มีเมนู "ผู้ใช้งานในระบบ" และ "บทบาทและสิทธิการใช้งาน" เลย · Nurse: แม้แต่ app tile "ผู้ดูแลระบบ" เองก็ไม่ปรากฏเลย (ถูกกันตั้งแต่ระดับ app)
- Step 2 — Pass: ทั้ง Doctor และ Nurse: พิมพ์ URL `/cortex/setting/admin/user-management` ตรงๆ แล้วเจอหน้า "คุณไม่มีสิทธิเข้าถึงหน้านี้" (access-denied ชัดเจน) ไม่เห็นตาราง/ข้อมูล user เลย
- Step 3 — Pass: ทั้ง Doctor และ Nurse: เข้า URL `/cortex/setting/admin/role-management` ตรงๆ เจอหน้า access-denied เหมือนกับ step 2 ไม่เห็นตาราง/สิทธิ

หมายเหตุ
- Evidence: images/tc054-Doctor-apps-landing.png, images/tc054-Doctor-sidebar-menu.png, images/tc054-Nurse-apps-landing.png, images/tc055-Doctor-direct-url-user-management.png, images/tc055-Nurse-direct-url-user-management.png, images/tc057-Doctor-direct-url-role-management.png, images/tc057-Nurse-direct-url-role-management.png
```

#### TC-COR-1724-026 — API create/edit/delete/assign-remove-role ถูกปฏิเสธเมื่อเรียกด้วย role ที่ไม่มีสิทธิ์ + สรุปรวมไม่มีสิทธิ์ operation ใดเลย

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-026
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Each operation carries its own permission — view, create, edit, delete — and only super-user and admin hold them."
- รวมจาก TC เดิม: TC-058, TC-059, TC-060, TC-061, TC-062 (ยิง endpoint ชุดเดียวกันด้วย role เดียวกัน)

Preconditions
- มี token/session ของ role ที่ไม่มีสิทธิ์ `menu:setting:user-management` (Doctor/Nurse)

Test Data
- -

Test Steps
1. ยิง `POST /cortex-api/users` (create) ตรงไปที่ API โดยไม่ผ่าน UI ด้วย Bearer token ของ Doctor/Nurse
2. ยิง `PUT /cortex-api/users/{id}` (edit) ไปที่ user ID ปลอม
3. ยิง `DELETE /cortex-api/users/{id}` (delete) ไปที่ user ID ปลอม
4. ยิง `POST /cortex-api/users/{id}/roles` (assign role) ไปที่ user ID ปลอม

Expected Result
- ทุก request ถูก backend ปฏิเสธ (403) ไม่มี operation ไหนที่ role นี้ทำได้เลยแม้แต่อย่างเดียว ทั้ง UI และ API

Actual Result
- Step 1 — Pass: ยิง `POST /cortex-api/users` ตรงด้วย Bearer token จริงของ Doctor และ Nurse (ดักจาก request จริงของแอปตอนโหลดหน้า แล้วใช้ยิง fetch เองจาก JS context เดียวกัน) ทั้งคู่ได้ `403 {"message":"Forbidden: insufficient permissions"}` — payload เป็น account สมมติ `qa-cor1724-apitest-*` ไม่กระทบ account จริง
- Step 2 — Pass: ลองหา verb ที่ถูกก่อน (PATCH ได้ 405 Method Not Allowed → เปลี่ยนเป็น PUT) ยิงด้วย Bearer token จริงของ Doctor/Nurse ไปที่ user ID ปลอม (`00000000-1111-2222-3333-444444444444`) ได้ `403` ทั้งคู่
- Step 3 — Pass: ยิง `DELETE` ด้วย Bearer token จริงของ Doctor/Nurse ไปที่ user ID ปลอมเดียวกัน ได้ `403` ทั้งคู่ — backend ปฏิเสธก่อนถึงขั้นเช็คว่า account มีอยู่จริงไหม
- Step 4 — Pass: ยิง `POST /cortex-api/users/{id}/roles` ด้วย Bearer token จริงของ Doctor/Nurse ไปที่ user ID ปลอม ได้ `403` ทั้งคู่ (ทดสอบเฉพาะ assign — remove ใช้ endpoint pattern เดียวกัน ไม่ได้ลองแยกเพราะ pattern การปฏิเสธสม่ำเสมออยู่แล้ว)
- สรุปรวม — Pass: Doctor/Nurse มองไม่เห็นเมนูทั้งสอง เข้า URL ตรงถูกกันด้วยหน้า access-denied และยิง API ตรงถูกปฏิเสธด้วย 403 ทุก endpoint — ไม่มี operation ไหนที่ทำได้เลยสักอย่างทั้ง UI และ API

หมายเหตุ
- วิธีทดสอบ: capture Authorization header จาก request จริงของแอป (ไม่ใช้ raw APIRequestContext เพราะจะไม่มี Bearer token ติดไปด้วย) แล้วยิงซ้ำผ่าน `fetch()` ใน page context เดียวกัน — ใช้ user ID ปลอมเป็น target ในทุก endpoint เพื่อความปลอดภัย 100% ไม่กระทบ account จริงไม่ว่าผลจะออกมาทางไหน
```

#### TC-COR-1724-027 — self-modification prevention: admin แก้ไข credential/role/ลบ role ของตัวเองไม่ได้ (UI) + แก้ไขข้อมูลตัวเองผ่าน API ตรง ๆ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-027
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "An admin cannot change their own credentials or roles, so no one can quietly widen their own access."
- รวมจาก TC เดิม: TC-063, TC-064, TC-065, TC-066 (admin เดียวกัน ไล่ทุกช่องทางป้องกันตัวเอง)

Preconditions
- Login ด้วย account admin (ตัวเดียวกับที่ล็อกอินอยู่)

Test Data
- -

Test Steps
1. เปิดหน้า detail ของ account ตัวเอง แท็บ "การเข้าสู่ระบบ" ดูว่ามีปุ่มแก้ไข/reset credential ไหม
2. แท็บ "บทบาทการใช้งาน" ดูว่ามีปุ่ม assign role ไหม
3. ดูว่าปุ่มลบ role ต่อแถวใช้งานได้ไหม
4. ยิง `PUT /cortex-api/users/{own-id}` ตรงด้วย Bearer token จริงของตัวเอง (bypass UI) ด้วย payload เป็นค่าปัจจุบันของตัวเองทั้งหมด (GET มาก่อนแล้วส่งกลับค่าเดิมทุก field เพื่อความปลอดภัย 100%)

Expected Result
- Step 1-3: ระบบปฏิเสธการทำรายการ (ปุ่มถูกซ่อน/disable) ทั้งฝั่ง UI
- Step 4: backend ปฏิเสธ request แม้ bypass UI มา

Actual Result
- Step 1 — Pass (ระดับ UI เท่านั้น — ดู step 4 สำคัญ): ปุ่ม "รีเซ็ตรหัสผ่าน" **ไม่แสดงเลย** ป้องกันไม่ให้กดได้ตั้งแต่ระดับ UI
- Step 2 — Pass (ระดับ UI เท่านั้น): ปุ่ม "กำหนดบทบาท" **ไม่แสดงเลย** ป้องกันไม่ให้ assign role ให้ตัวเองผ่าน UI ได้
- Step 3 — Pass (ระดับ UI เท่านั้น): role ทั้ง 3 แถวของบัญชีตัวเอง ปุ่มลบ role **ไม่แสดง/ถูก disable หมดทุกแถว**
- Step 4 — **Fail — [SECURITY BUG ร้ายแรง, พบแล้วหยุดทดสอบต่อทันทีตามที่ตกลงไว้]**: ยิง `PUT /cortex-api/users/{own-id}` ตรงด้วย Bearer token จริงของ Admin ไปที่ user ID ของตัวเอง (bypass UI ที่ซ่อนปุ่มไว้แล้วตาม step 1-3) payload เป็นค่าปัจจุบันของตัวเองทั้งหมด (ไม่มีข้อมูลจริงเปลี่ยนแปลง) **ได้ status 200 สำเร็จ** ไม่ถูกปฏิเสธเลย — พิสูจน์ว่า backend **ไม่มีการเช็ค self-modification prevention ที่ endpoint แก้ไขข้อมูลทั่วไป** การป้องกันที่เห็นใน step 1-3 มีแค่ระดับ UI (ซ่อนปุ่ม) เท่านั้น ไม่มีการบังคับใช้ที่ backend จริง — ยืนยันซ้ำด้วย payload ที่ shape ถูกต้องตาม DTO จริง (`UpdateUserRequestDTO`) ยัง **ได้ 200 สำเร็จเหมือนเดิม** ไม่ใช่ความผิดพลาดจาก payload ผิด shape

หมายเหตุ
- **หยุดทดสอบ self-modification เพิ่มเติมทันทีตามข้อตกลง** — ไม่ได้ลองยิง credential-reset หรือ role-assign/remove ผ่าน API กับบัญชีจริงต่อ เพราะเสี่ยงเกินไป (อาจล็อกบัญชีจริงของผู้ใช้ออกจากระบบถ้าช่องโหว่เดียวกันมีอยู่ที่ endpoint เหล่านั้นด้วย) **ต้องแจ้งทีม dev เป็นประเด็นความปลอดภัยด่วนที่สุด** — payload ที่ใช้ทดสอบและ response เต็มไม่มีรหัสผ่านหรือ secret ปน
- Evidence: images/tc063-admin-own-credential-tab.png, tc064-admin-own-role-tab.png, images/tc066-evidence-01-api-result-marked.png (กรอบแดงล้อม "200" และ Expected Result ที่ควรเป็น 403) · วิดีโอ: videos/tc066-video.webm
```

#### TC-COR-1724-028 — แก้ไข service account ผ่านหน้าจอ edit + ลบ + assign/remove role ไม่ได้ (UI-level)

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-028
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Service accounts are refused on every write, since changing them would lock Cortex out of Keycloak."
- รวมจาก TC เดิม: TC-067, TC-068, TC-069 (target เดียวกัน ถ้าหา ID เจอ)

Preconditions
- มี service account ที่ Keycloak สร้างให้ client

Test Data
- -

Test Steps
1. เปิดหน้า edit ของ service account (ถ้าค้นหาเจอในหน้าจอ) พยายามบันทึกการแก้ไข
2. พยายามลบ service account
3. พยายาม assign/remove role ให้ service account

Expected Result
- ระบบปฏิเสธการแก้ไข/ลบ/เปลี่ยน role ของ service account ทุกช่องทาง

Actual Result
- Not Test (ทั้ง 3 step) — สำรวจหาช่องทางค้นหา/ระบุ service account ID แล้วไม่พบเลยสักช่องทาง จึงไม่มีทางเปิดหน้า edit/ลบ/assign role ของ service account ได้เลยตั้งแต่ขั้นค้นหา: ลอง 3 ช่องทาง login ด้วย Admin — (1) ค้นหาในหน้า "ผู้ใช้งานในระบบ" ด้วยคำที่เป็นไปได้ (`service`, `service-account`, `cortex-api`, `cortex-ui`, `client`) ทุกคำได้ผล "ไม่มีข้อมูล" (2) ยิง `GET /cortex-api/users` ตรงด้วย Bearer token จริง paginate ครบทุกหน้า (3 หน้า, perPage=100, รวม 225/225 = 100% ของ totalCount) สแกนทุก username หา pattern คล้าย service account ไม่พบเลยสักตัว ยืนยันว่า backend endpoint นี้เองก็ไม่คืนข้อมูล service account ไม่ใช่แค่ UI กรอง (3) ลอง endpoint/parameter อื่น: `/cortex-api/service-accounts` (404), `/cortex-api/clients` (404), `/cortex-api/roles` (404), `?includeServiceAccounts=true`/`?type=service`/`?userType=service_account` (ถูกเพิกเฉย คืน list เดิมไม่กรองอะไรเพิ่ม) → ไม่มีช่องทางค้นหา/ระบุ service account ID ได้เลยผ่าน UI หรือ API ที่เข้าถึงได้ในขอบเขตนี้ ไม่เดา ID ตามกฎความปลอดภัย

หมายเหตุ
- ผลสรุปนี้ใช้ร่วมกับ F029 (API-level) ด้วย — สำรวจครั้งเดียวครอบคลุมทุก TC ในกลุ่ม service account ทั้งหมด
```

#### TC-COR-1724-029 — API edit/delete/assign-role/remove-role ถูกปฏิเสธเมื่อเรียกกับ service account (API-level)

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-029
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Service accounts are refused on every write, since changing them would lock Cortex out of Keycloak."
- รวมจาก TC เดิม: TC-070, TC-084, TC-085, TC-086 (target เดียวกัน — แยกทีละ operation ตามที่ user ตัดสินใจ 1 ต.ค. 2026 กันไม่รู้ว่า endpoint ไหนมีปัญหาถ้า fail)

Preconditions
- มี service account ที่ Keycloak สร้างให้ client (และมี role ผูกอยู่อย่างน้อย 1 ตัวสำหรับ step remove-role)

Test Data
- -

Test Steps
1. ยิง `PUT` (edit) ไปที่ service account ตรง ๆ ผ่าน API โดยไม่ผ่าน UI
2. ยิง `DELETE` ไปที่ service account ตรง ๆ
3. ยิง `POST .../roles` (assign role) ไปที่ service account ตรง ๆ
4. ยิง `DELETE .../roles` (remove role) ไปที่ service account ตรง ๆ

Expected Result
- ทุก request ถูก backend ปฏิเสธ (เช่น 403) ไม่แก้ไข/ลบ/เปลี่ยน role ของ service account เลยสักช่องทาง

Actual Result
- ทั้ง 4 step — Not Test: ไม่พบช่องทางค้นหา/ระบุ service account ID เลย (สำรวจรายละเอียดเต็มไว้ที่ F028 — ใช้ผลสำรวจชุดเดียวกัน: ไม่พบผ่านทั้ง UI search, raw API list paginate ครบ 225/225 users, และ endpoint อื่นที่ลองแล้วทั้งหมด) จึงไม่มี ID เป้าหมายให้ยิง request ใด ๆ ในกลุ่มนี้ — ไม่เดา ID ตามกฎความปลอดภัย (operation นี้ไม่สามารถทำแบบ no-op payload ได้ ถ้าเดา ID ผิดช่องแล้วบังเอิญยิงโดน account จริงจะกู้คืนไม่ได้)

หมายเหตุ
- เดิม TC-070 รวม create/edit/delete/role ไว้ด้วยกัน ถ้า fail จะไม่รู้ว่า endpoint ไหนมีปัญหา — แยกเป็น 4 operation ไว้ในนี้แล้ว (ไม่รวม "create" เพราะ service account ไม่ได้ถูกสร้างผ่านฟอร์ม "เพิ่มผู้ใช้งาน" นี้ Keycloak สร้างให้อัตโนมัติตอนเปิด service account ของ client จึงไม่มี operation "create service account" ให้ทดสอบจริง)
- ถ้าในอนาคตมีช่องทางถูกต้องเจอ service account ID ควรกลับมาทดสอบ TC นี้ใหม่ — ไม่ได้ยิง request ใด ๆ เข้า service account เลยในรอบนี้ จึงไม่มีความเสี่ยงต่อ Keycloak/Cortex service account เกิดขึ้นจริง ไม่เจอ security bug แบบเดียวกับ F027/step4 ในรอบนี้ (เพราะไม่สามารถทดสอบได้เลย ไม่ใช่เพราะพิสูจน์ว่าไม่มีช่องโหว่ — ยังเป็น gap ที่ไม่รู้คำตอบ)
```

#### TC-COR-1724-030 — delete permission ถูก grant เฉพาะ super-user/admin เท่านั้น

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-030
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Deletion is permanent and the confirmation dialog is the only guard, which is why delete is granted narrowly."
- รวมจาก TC เดิม: TC-071 (cross-ref F026 (เดิม TC-060) และสรุปรวมใน F026 — ไม่ merge รวมกันเพราะเป็น assertion สรุปคนละระดับ)

Preconditions
- Login ด้วย super-user หรือ admin; มี account ทดสอบที่ไม่ใช่ตัวเองและไม่ใช่ service account

Test Data
- -

Test Steps
1. ลบ account ด้วย super-user/admin ผ่าน confirm dialog เดียว
2. cross-check กับผล F026 (API delete ถูกปฏิเสธสำหรับ role อื่น) ว่า role อื่นไม่มีสิทธิ์นี้

Expected Result
- ลบสำเร็จด้วย confirm dialog เดียวสำหรับ super-user/admin เท่านั้น role อื่นไม่มีสิทธิ์นี้เลย

Actual Result
- **Pass — แก้ไข 7 ต.ค. 2026 หลัง retest** (เดิมมาร์ค Gap ครึ่งหนึ่งเพราะเข้าใจผิดว่าบล็อกจาก TC-005 — รู้แล้วว่าไม่จริง เพราะสร้าง account สำเร็จทุกครั้งแม้ toast จะขึ้น error ผิด) ทดสอบครบทั้ง 2 ส่วน: (1) ฝั่ง "ลบสำเร็จด้วย confirm dialog เดียวสำหรับ super-user" — สร้าง account ทดสอบ `qa-e2e-del-407246` ด้วย Super_User → ยืนยันสร้างจริงผ่านค้นหา (ไม่เชื่อ toast error) → กดไอคอนลบที่แถว → dialog ขึ้นข้อความ "ต้องการลบ qa-e2e-del-407246 หรือไม่ ระบบจะลบบัญชีออกจาก Keycloak และไม่สามารถกู้คืนได้" → กดปุ่ม "ลบ" ยืนยัน (dialog เดียว ไม่มีขั้นตอนอื่นแทรก) → toast "ลบผู้ใช้งานแล้ว" → reload + ค้นหา username เดิมอีกครั้ง ยืนยันไม่เจอจริง ("ไม่มีข้อมูล", ทั้งหมด 0 ผู้ใช้งาน) = ลบสำเร็จจริงจาก backend ไม่ใช่แค่ UI (2) ฝั่ง "role อื่นไม่มีสิทธิ์นี้เลย" ยังคง Pass ตามเดิมจาก F026 (API delete ถูกปฏิเสธด้วย Doctor/Nurse และสรุปรวม role อื่นไม่มีสิทธิ์ operation ใดเลย) — รวมทั้ง 2 ส่วนแล้ว Expected Result เป็นจริงครบถ้วน

หมายเหตุ
- Evidence (กรอบแดง = จุดกรอก/กดปุ่ม, กรอบเขียว = ผลยืนยันถูกต้อง) อยู่ที่ `.playwright-mcp/e2e-user-role-exploration/`: ภาพ `images/flowB-01-create-form-filled-before-save.png`, `flowB-02-verified-created-before-delete.png`, `flowB-03-before-click-delete-icon.png`, `flowB-04-confirm-dialog-before-confirm.png`, `flowB-05-verified-deleted-after-reload.png` — วิดีโอต่อเนื่องคลิปเดียว: `videos/flowB-01-create-and-delete-qa-e2e-del.webm`
- บั๊ก TC เดิม TC-005 (toast error ผิดตอนสร้าง account, ดู F002) ยังคงอยู่ ไม่เกี่ยวกับผลของ TC นี้
```

---

## หมวด 6: Migrating existing accounts

### SC-14 — TS-COR-1724-HPY - Migrating existing accounts

```
ข้อมูลอ้างอิง
- Scenario ID: SC-14
- Case Type: Happy
- Suffix: HPY
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่า migration script รัน dry-run/apply/backup/sweep/named-list ได้ถูกต้องตาม flow ปกติ โดยไม่ทิ้งช่วงที่ account ไม่มีสิทธิ์
  และไม่แตะ account ที่ไม่มีอะไรต้อง migrate

ขอบเขต Requirement
- dry-run ไม่เปลี่ยนอะไรจริง, apply ตาม report, backup mapping ก่อน apply
- add-before-remove, sweep ทั้ง realm/named list, account ที่ไม่มีอะไรต้อง migrate ถูกข้าม

ความเสี่ยง
- ถ้า remove ก่อน add จะมีช่วงที่ user ไม่มีสิทธิ์เข้าระบบเลยระหว่าง migrate

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- **สำคัญ:** สำรวจหน้าจอ "ผู้ดูแลระบบ → โรงพยาบาล" ทั้งหมดแล้ว**ไม่เคยเจอปุ่ม/เมนู "migration" ที่เป็น UI เลยสักจุด** — AC เขียน
  บรรยายเชิงพฤติกรรมล้วนๆ ไม่ได้ระบุว่าเป็น UI button, CLI/ops script แยกต่างหาก, หรือ API endpoint เฉพาะ **ก่อนเทส TC ในหมวดนี้
  ทุกข้อ ผู้ทดสอบต้องหาช่องทาง trigger จริงก่อน** (ถามทีม dev ว่า feature นี้ release มาจริงหรือยัง และ trigger ยังไง)
- **หมวดนี้ทั้งหมดมอบให้คนเทสเองผ่าน DB/Keycloak console/ops tool โดยตรง ไม่ใช่ agent** (กระทบข้อมูลจริงวงกว้างเกินกว่าจะให้ agent
  ทำอัตโนมัติ)
```

#### TC-COR-1724-031 — migration lifecycle เต็มรูปแบบ: dry-run → apply → backup mapping → add-before-remove → sweep ทั้ง realm/named list → account ที่ไม่มีอะไรต้อง migrate ถูกข้าม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-031
- Scenario ID: SC-14
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "The run reports what it would do and changes nothing until explicitly told to apply, and it backs up the current mappings first." / "Access is added before anything is taken away, so nobody is left without access mid-run." / "It can sweep the whole realm or a named list; service accounts and disabled accounts are left out of a sweep." / "Accounts with nothing to migrate are untouched, and roles that belong to other systems are preserved, never recreated or deleted."
- รวมจาก TC เดิม: TC-072, TC-073, TC-074, TC-075, TC-076, TC-077, TC-078 (migration run เดียวกัน ไล่ lifecycle เต็ม)

Preconditions
- มี account ที่ยังไม่ได้ migrate ไปใช้ role model ใหม่ หลายรายการ + มี account ที่ mapping ตรงกับ role model ใหม่อยู่แล้ว (ไม่มีอะไรต้องเปลี่ยน) ปนกัน

Test Data
- list ของ account เฉพาะที่ต้องการ migrate (สำหรับ step named-list)

Test Steps
1. รัน migration ในโหมด dry-run ตรวจสอบ report ที่ได้ และตรวจสอบ mapping จริงของ account ที่เกี่ยวข้อง
2. รัน migration โหมด apply ต่อจาก dry-run เดิม ตรวจสอบ mapping จริงหลังรัน
3. ก่อนรัน apply ตรวจสอบว่ามีการ backup mapping เดิมไว้ที่ไหน (ไฟล์/ตาราง log)
4. สังเกต/ตรวจสอบลำดับการเปลี่ยนแปลงระหว่างรัน (log หรือ intermediate state)
5. รัน migration โดยไม่ระบุ list เฉพาะ (sweep ทั้ง realm)
6. รัน migration โดยระบุ list ของ account เฉพาะ (named list)
7. รัน migration ครอบคลุม account ที่ mapping ตรงกับ role model ใหม่อยู่แล้ว ตรวจสอบ mapping ของ account นี้หลังรัน

Expected Result
- Step 1: ได้ report สิ่งที่ "จะ" ทำ แต่ mapping จริงของ account ไม่เปลี่ยนแปลงเลย
- Step 2: mapping ถูกเปลี่ยนตรงกับที่ dry-run report ไว้ทุกจุด
- Step 3: มี backup ของ mapping เดิมก่อนเริ่ม apply เสมอ
- Step 4: role/access ใหม่ถูก assign ก่อน แล้ว role/access เดิมจึงถูกตัดออกทีหลัง ไม่มีช่วงที่ account ไม่มีสิทธิ์เลย
- Step 5: account ที่เข้าเงื่อนไข (ไม่ใช่ service/disabled) ในทั้ง realm ถูก migrate สำเร็จ
- Step 6: เฉพาะ account ใน list ที่ระบุถูก migrate เท่านั้น account อื่นไม่ถูกแตะ
- Step 7: account นี้ไม่มีการเปลี่ยนแปลงใด ๆ (untouched)

Actual Result
- -

หมายเหตุ
- ถ้าตรวจสอบ intermediate state (step 4) ไม่ได้โดยตรง ให้ตรวจจาก log และระบุข้อจำกัดไว้ใน Actual Result
```

---

### SC-15 — TS-COR-1724-EDG - Migrating existing accounts

```
ข้อมูลอ้างอิง
- Scenario ID: SC-15
- Case Type: Edge
- Suffix: EDG
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่า migration เว้น service account/disabled account ออกจาก sweep, รักษา role ของระบบอื่นไว้, และรันซ้ำได้แบบ idempotent

ขอบเขต Requirement
- "It can sweep the whole realm or a named list; service accounts and disabled accounts are left out of a sweep"
- "roles that belong to other systems are preserved, never recreated or deleted"

ความเสี่ยง
- ถ้า sweep ไปโดน service account อาจ lock Cortex ออกจาก Keycloak; ถ้าลบ role ของระบบอื่นจะกระทบระบบอื่นที่ไม่เกี่ยวข้อง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- **สำคัญ:** ยังไม่เคยยืนยัน trigger จริงของ migration (ดูหมายเหตุใน SC-14) — ต้องหาช่องทางจริงก่อนเทส
- **หมวดนี้มอบให้คนเทสเองผ่าน DB/Keycloak console/ops tool โดยตรง ไม่ใช่ agent** (เหตุผลเดียวกับ SC-14)
```

#### TC-COR-1724-032 — sweep ทั้ง realm ไม่รวม service account/disabled account + role ของระบบอื่นไม่ถูก recreate/delete + รันซ้ำไม่เกิดผลข้างเคียง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-032
- Scenario ID: SC-15
- Case Type: Edge
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "It can sweep the whole realm or a named list; service accounts and disabled accounts are left out of a sweep." / "Accounts with nothing to migrate are untouched, and roles that belong to other systems are preserved, never recreated or deleted."
- รวมจาก TC เดิม: TC-079, TC-080, TC-081, TC-082 (ตรวจ safety หลัง run เดียวกัน)

Preconditions
- realm มี service account และ account ที่ถูก disable ปนอยู่กับ account บุคคลที่ยังไม่ได้ migrate · account มี role ที่เป็นของระบบอื่น (non-Cortex) ปนอยู่กับ role ที่ต้อง migrate · มี account ที่ผ่าน migration ไปแล้วในรอบก่อนหน้า

Test Data
- -

Test Steps
1. รัน sweep ทั้ง realm ตรวจสอบว่า service account ถูก migrate ไปด้วยหรือไม่
2. ตรวจสอบว่า account ที่ถูก disable ถูก migrate ไปด้วยหรือไม่
3. รัน migration บน account ที่มี role ของระบบอื่นปน ตรวจสอบ role ที่เป็นของระบบอื่นหลังรัน
4. รัน migration อีกครั้งกับ account เดิมที่ migrate ไปแล้ว ตรวจสอบ mapping หลังรันซ้ำ

Expected Result
- Step 1: service account ไม่ถูก migrate/แตะต้องเลย
- Step 2: disabled account ไม่ถูก migrate/แตะต้องเลย
- Step 3: role ของระบบอื่นยังอยู่ครบเหมือนเดิม ไม่ถูก recreate หรือ delete
- Step 4: ไม่เกิดผลข้างเคียง เช่น mapping ซ้ำซ้อนหรือ role ผิดเพี้ยนไปจากเดิม (idempotent)

Actual Result
- -

หมายเหตุ
- -
```

---

### SC-16 — TS-COR-1724-ERR - Migrating existing accounts

```
ข้อมูลอ้างอิง
- Scenario ID: SC-16
- Case Type: Error
- Suffix: ERR
- Module: -
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

วัตถุประสงค์
- ยืนยันว่าเมื่อ migration ล้มเหลวเพราะ permission ไม่พอ error message ระบุถูกต้องว่าเป็นปัญหา permission [Security]

ขอบเขต Requirement
- "Failures say what went wrong — a permissions problem reads as a permissions problem, not as missing data"

ความเสี่ยง
- ถ้า error message เข้าใจผิดว่าเป็น missing data จะทำให้ debug/แก้ปัญหาจริงผิดทาง

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- **สำคัญ:** ยังไม่เคยยืนยัน trigger จริงของ migration (ดูหมายเหตุใน SC-14) — ต้องหาช่องทางจริงก่อนเทส
- **หมวดนี้มอบให้คนเทสเองผ่าน DB/Keycloak console/ops tool โดยตรง ไม่ใช่ agent** (เหตุผลเดียวกับ SC-14)
```

#### TC-COR-1724-033 — error message เมื่อ migration ล้มเหลวเพราะ permission ไม่พอ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-033
- Scenario ID: SC-16
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "Failures say what went wrong — a permissions problem reads as a permissions problem, not as missing data."
- รวมจาก TC เดิม: TC-083

Preconditions
- สามารถจำลองสถานการณ์ที่ credential/permission ที่ migration script ใช้ไม่พอสิทธิ์ได้

Test Data
- -

Test Steps
1. รัน migration ในสถานการณ์ที่ permission ไม่พอ

Expected Result
- error message ที่ได้ระบุชัดว่าเป็นปัญหา permission ไม่ใช่แสดงเป็น missing data หรือ error type อื่นที่เข้าใจผิดได้

Actual Result
- -

หมายเหตุ
- ถ้าจำลอง permission failure ไม่ได้ในสภาพแวดล้อมทดสอบ ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
```

#### TC-COR-1724-034 — Sanity-check account เก่า (user1) ยัง login+มี role ถูกต้องหลังผ่านงานเทสทั้งหมด

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-034
- Scenario ID: SC-14
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง: ไม่ได้ derive จาก AC bullet ใดโดยตรง — ดูเหตุผลใน "หมายเหตุ scope" ของ Preconditions
- รวมจาก TC เดิม: TC-087

Preconditions
- account เก่าที่มีอยู่ในระบบก่อน feature นี้ (ไม่ได้ถูกสร้างผ่านฟอร์ม "เพิ่มผู้ใช้งาน" ของ COR-1724) — ใช้ account `user1`
  (= CORTEX_USERNAME_Super_User ใน .env ของโปรเจกต์นี้ ชื่อแสดงผล "user1 example")
- **หมายเหตุ scope:** นี่คือ sanity-check ตามที่ user ปรับ scope ไว้ก่อนหน้า ("ไปเปิดดูว่า user เก่าๆ ใช้งานได้ เช่น user1")
  แทนการเทส migration process ตรง ๆ — ไม่ใช่การยืนยันว่า migration mechanism (F031/F032/F033) ทำงานถูกต้อง เพราะไม่เคยเจอ
  UI/trigger ของ migration จริงระหว่างสำรวจทั้งหมด (ดูหมายเหตุ SC-14/15/16)

Test Data
- -

Test Steps
1. ล็อกอินใหม่ด้วย account user1 (ไม่ reuse session เดิม) ยืนยันว่า login ผ่าน
2. เปิดหน้า detail ของ user1 ผ่านเมนู "ผู้ใช้งานในระบบ" ดูแท็บ "ข้อมูลทั่วไป" (เช็ค toggle "การใช้งาน" ยัง enabled)
3. เปิดแท็บ "บทบาทการใช้งาน" เทียบ role ที่มีอยู่กับที่เคยบันทึกไว้ใน F015 (cashier-head, admin)

Expected Result
- login สำเร็จปกติ, account ยังอยู่ในสถานะ enabled, role ยังครบ 2 รายการตรงกับที่เคยเห็นใน F015 ไม่มีอะไรเปลี่ยนแปลง/หายไป

Actual Result
- Pass — เขียนสคริปต์แยกทดสอบ (เจอปัญหาระหว่างทำ 3 จุดที่ dev-x/สคริปต์ไม่ตรงกับที่คาด: ต้องใช้ `.fill()` จริงกับ password field ไม่ใช่ set `.value` ตรง ๆ, ต้องระบุ placeholder ค้นหาให้เป๊ะ "ค้นหาผู้ใช้งาน" ไม่งั้นไป match กล่องค้นหาผู้ป่วยผิดตัว, ต้องคลิกปุ่มแก้ไข (ดินสอ) ถึงเห็นแท็บ 3 อัน ไม่ใช่คลิกที่ `<td>`) — **ผลเทส (Pass):** login ด้วย user1/Super_User สำเร็จปกติ, แท็บ "ข้อมูลทั่วไป" toggle การใช้งาน = enabled, แท็บ "บทบาทการใช้งาน" มี role ครบ 2 ตัวตรงกับ F015 เป๊ะ (`cashier-head`, `admin`) ไม่มีอะไรหาย/เพิ่มแปลกปลอม

หมายเหตุ
- Evidence: 4 ภาพ + วิดีโอเต็ม (รายละเอียดไฟล์ดูใน TODO.md งานเดิม P3m)
```
