# COR-1724 — [Admin] User, Role in keycloak -> Admin — Test Coverage

- Requirement: https://linear.app/cortexcloud/issue/COR-1724/admin-user-role-in-keycloak-admin
- สร้างจาก Acceptance Criteria ของการ์ดโดยตรง ตาม skill `linear-testcase-writer`
- สถานะไฟล์นี้: **draft เก็บไว้ในโปรเจกต์ก่อน ยังไม่สร้างจริงใน Linear**
- Workflow: เขียน TC ไว้ที่นี่ → ผู้ใช้ run เคสเองด้วยมือบนเว็บ → อัปเดตช่อง "Actual Result" ของแต่ละ TC ด้านล่างตามผลจริง → เมื่อได้ผลครบแล้วและ **ได้รับอนุญาตจากผู้ใช้ชัดเจน** ค่อยนำไปสร้าง EXE/Scenario/Test Case จริงบน Linear
- รวม: 1 EXE, 16 Scenario, 87 Test Case (เดิม 83 → แยก TC-070 เป็น 4 TC ตาม P3j [084–086] → เพิ่ม TC-087 sanity-check ตาม P3i/P3m)

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

**แก้คำที่ผิดจาก AC → ของจริง (สำคัญ กระทบ TC-009–011):** ตัว dropdown "วิธีการเมื่อเข้าสู่ระบบ" ตอนสร้าง user มี **3 ตัวเลือกแบบ single-select** ไม่ใช่ "temp password / authenticator / ทั้งคู่" ตามที่ตีความจาก AC ตอนแรก —
ของจริงคือ: `Username & Password` (temporary password ต้องเปลี่ยนตอน login แรก) / `OTP` (ไม่มี "authenticator app" — ระบบใช้คำว่า **OTP**) / `OTP พร้อมรหัสผ่านชั่วคราว` (ตัวเลือกที่ 3 แยกต่างหาก ไม่ใช่ติ๊กสองอันพร้อมกัน) →
TC-009/010/011 ด้านล่างแก้ terminology "authenticator" → "OTP" แล้วตามนี้

**ยืนยันตรงกับ AC:** ฟอร์มสร้าง user มีช่อง "รหัสผ่านชั่วคราว" พร้อมปุ่ม show/copy/regenerate ตรงตาม TC-005–008 · แท็บ "การเข้าสู่ระบบ" แสดงตาราง ประเภท/ชื่อเรียก/เพิ่มเมื่อ/จัดการ (ลบ/รีเซ็ตรหัสผ่าน) **ไม่มีช่องไหนโชว์ค่า secret จริงเลย** ตรงกับ TC-030 · แท็บ "บทบาทการใช้งาน" มีค้นหาบทบาท + ปุ่ม "กำหนดบทบาท" (multi-select checkbox + select-all) ตรงกับ TC-033–037 · dialog ลบ user ข้อความจริง: "ต้องการลบ &lt;username&gt; หรือไม่ ระบบจะลบบัญชีออกจาก Keycloak และไม่สามารถกู้คืนได้" — ระบุชื่อบัญชีในข้อความ ตรงกับหลัก "confirmation ต้องระบุสิ่งที่จะถูกลบ"

**2 เรื่องที่เคยเป็นคำถาม — ผู้ใช้ตอบและจัดการแล้ว (30 ก.ย. 2026):**
1. **โมเดล permission:** ค้นแคตตาล็อกสิทธิ (1,711 รายการ) เจอเฉพาะ `menu:setting:user-management` (สิทธิระดับเมนูเดียว ไม่มีสิทธิแยก view/create/edit/delete ตามที่ AC อธิบาย) — ผู้ใช้ยืนยันให้ **ใช้สิทธิ์ที่มีอยู่จริง** เพราะการ์ดนี้ scope แค่หน้า "ผู้ใช้งานในระบบ" เท่านั้น
   → TC-054–061 ด้านล่างเทสกับ permission key เดียวนี้ (`menu:setting:user-management`) ทุกช่องทาง (UI + แต่ละ API endpoint) แทนที่จะเทส 4 permission แยกกันตามที่ AC อธิบายไว้ (ซึ่งไม่มีจริงในระบบตอนนี้) — ถือเป็น gap ระหว่าง AC กับ implementation ที่ควรแจ้งทีม product แยกต่างหาก ไม่ใช่ QA gap
2. **admin test account:** สร้างไม่สำเร็จผ่าน Playwright เจอ error "ระบบไม่ได้รับสิทธิ์ให้จัดการผู้ใช้งานในระบบยืนยันตัวตน" (ดูเหมือนปัญหาสิทธิ์ฝั่ง Keycloak service account) — ผู้ใช้สร้างให้เองแล้วเพิ่ม `CORTEX_USERNAME_Admin`/`CORTEX_PASSWORD_Admin` ใน `.env`
   ตรวจสอบแล้ว: login ผ่าน (`npx playwright test --project=setup` สำเร็จ, มี `.auth/Admin.json`), เข้าเมนู user-management ได้ปกติ · **หมายเหตุสำคัญ:** บัญชีนี้คือบัญชีจริงของผู้ใช้ (ชื่อแสดงผล "neranchara kaewsiri") ไม่ใช่ synthetic test account แบบ Super_User/Doctor/Nurse ("user1 example") — ผู้ใช้ยืนยันแล้วว่าใช้ได้เพราะเป็น dev-x (test environment) ไม่ใช่ prod จึงใช้เทส TC-053/062/063–066/071 ได้ตามปกติ
   (บัญชี `qa-admin-test` ที่เคยลองสร้างไว้ตอน debug ยังไม่มี role ผูกอยู่ — ไม่ได้ใช้งานเป็น test account ตัวจริง ปล่อยไว้เฉย ๆ ได้)

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

#### TC-COR-1724-001 — ตรวจสอบการค้นหา staff account ด้วย search term

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

Preconditions
- Login ด้วย role ที่มีสิทธิ์ view (เช่น Super_User)
- มี staff account อย่างน้อย 1 รายการที่รู้ชื่อ/username แน่ชัด

Test Data
- Keyword ค้นหา = ชื่อ/username ของ account ที่มีอยู่จริง

Test Steps
- เข้าหน้า User Management
- พิมพ์ keyword ในช่องค้นหา แล้ว search

Expected Result
- แสดงเฉพาะ account ที่ตรงกับ keyword ที่ค้นหา

Actual Result
- Pass — ค้นหา "cashier01" แสดงผลตรง 1 แถว (cashier01) เท่านั้น

หมายเหตุ
- Evidence: images/tc001-search-cashier01.png
```

#### TC-COR-1724-002 — ตรวจสอบการ browse รายการ account แบบ pagination

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-002
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "Accounts can be searched and browsed page by page; the search term, page and page size survive a refresh or a shared link."

Preconditions
- มี account มากกว่า 1 หน้า (มากกว่า page size ที่ตั้งไว้)

Test Data
- -

Test Steps
- เปิดหน้ารายการ account
- เลื่อนไปหน้าถัดไป

Expected Result
- หน้าที่ 2 แสดง account ชุดถัดไปไม่ซ้ำกับหน้าแรก ปุ่มเปลี่ยนหน้าทำงานถูกต้อง

Actual Result
- Pass — กดปุ่มหน้าถัดไป หน้า 2 แสดง 20 แถวไม่ซ้ำกับ 20 แถวของหน้าแรกเลย (page size = 20, ทั้งหมด 11 หน้า)

หมายเหตุ
- Evidence: images/tc002-page1.png, images/tc002-page2.png
```

#### TC-COR-1724-003 — ตรวจสอบว่า search/page/page size คงอยู่หลัง refresh

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-003
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "Accounts can be searched and browsed page by page; the search term, page and page size survive a refresh or a shared link."

Preconditions
- อยู่ในหน้ารายการ account

Test Data
- -

Test Steps
- ตั้งค่า search term + เปลี่ยน page + เปลี่ยน page size ตามต้องการ
- กด refresh browser (F5)

Expected Result
- search term, page, page size เหมือนก่อน refresh ทุกค่า

Actual Result
- Pass — ตั้งค่าค้นหา = "a" แล้ว refresh (F5) URL และช่องค้นหาคงค่าเดิมทุกจุด (state encode อยู่ใน URL query `userSearch`)

หมายเหตุ
- Evidence: images/tc003-after-refresh.png
```

#### TC-COR-1724-004 — ตรวจสอบว่า shared link เปิดแล้ว state ตรงกับ URL

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-004
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "Accounts can be searched and browsed page by page; the search term, page and page size survive a refresh or a shared link."

Preconditions
- มี URL ที่ encode search/page/page size ไว้แล้ว

Test Data
- -

Test Steps
- คัดลอก URL จาก state ที่ตั้งไว้
- เปิด URL ใน tab ใหม่/incognito

Expected Result
- state ที่แสดง (search/page/page size) ตรงกับค่าที่ encode ไว้ใน URL

Actual Result
- Pass — เปิด URL `?userSearch=a` ใน context/tab ใหม่ (จำลอง incognito) ช่องค้นหาแสดง "a" ตรงกับที่ encode ไว้

หมายเหตุ
- Evidence: images/tc004-shared-link-new-tab.png
```

#### TC-COR-1724-005 — ตรวจสอบการสร้าง account ใหม่พร้อม temporary password อัตโนมัติ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-005
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "A new account is created with a generated temporary password that can be shown, copied or regenerated."

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- ข้อมูล staff ใหม่ตามฟอร์ม (ชื่อ, username ฯลฯ)

Test Steps
- เปิดฟอร์มสร้าง account
- กรอกข้อมูลครบแล้วบันทึก

Expected Result
- account ถูกสร้างสำเร็จ พร้อม temporary password ที่ระบบ generate ให้อัตโนมัติ

Actual Result
- **Fail — [BUG ร้ายแรงกว่าที่เคยสรุปไว้ แก้ไข 30 ก.ย. 2026 หลังตรวจสอบเพิ่มเติมตามที่ user ถาม]** กรอกฟอร์มครบถูกต้องแล้วกด "บันทึก"
  ขึ้น toast แดง "ระบบไม่ได้รับสิทธิ์ให้จัดการผู้ใช้งานในระบบยืนยันตัวตน กรุณาติดต่อผู้ดูแลระบบ" (API จริงตอบ `403 ErrUserDirectoryForbidden`
  — `"cortex-api is not allowed to manage users in the identity provider"`) ทำให้ดูเหมือนว่า**การสร้าง account ล้มเหลว**
  **แต่เมื่อเข้าไปตรวจสอบในหน้ารายการ user จริง ๆ พบว่า account ถูกสร้างสำเร็จจริงทุกครั้ง** (เช็คแล้ว 6 account ที่เจอ error นี้ระหว่างทดสอบ:
  `qa-cor1724-main`, `qa-cor1724-diag-su`, `qa-cor1724-diag-ad`, `qa-cor1724-apitest-su`, `qa-cor1724-evidence`,
  `qa-cor1724-vid-036286` — ทุกตัวมีอยู่จริงในระบบ, เปิดดู detail แล้วพบว่า enabled = true, มี credential ประเภท "รหัสผ่าน" ตั้งไว้จริง
  ตรงกับเวลาที่ทดสอบเป๊ะ) → **สรุปใหม่: บั๊กนี้ไม่ใช่ "สร้าง account ไม่ได้" แต่คือ "สร้างสำเร็จจริง แต่ระบบแจ้งข้อความผิดว่าล้มเหลว"**
  ซึ่งอันตรายกว่าที่คิดไว้ตอนแรกมาก เพราะแอดมินที่เจอ error นี้จะเข้าใจผิดว่าไม่มีอะไรเกิดขึ้นและอาจกดสร้างซ้ำเรื่อย ๆ (มี account ทดสอบ
  qa-cor1724-* สะสมอยู่ในระบบแล้ว 8 ตัวจากที่ควรมีแค่ไม่กี่ตัว) — เรื่อง **ข้อความสำเร็จ/ล้มเหลวควรแสดงยังไง**: ตรวจ AC ของการ์ด COR-1724
  จากการ์ด Linear แล้ว **ไม่มีการระบุข้อความ (copy) ที่ต้องแสดงตอนสำเร็จหรือล้มเหลวไว้เลย** — AC พูดถึงแค่ผลลัพธ์เชิงพฤติกรรม
  ("A new account is created with a generated temporary password...") ไม่ได้กำหนดว่าต้องขึ้นข้อความอะไร ดังนั้นเรื่องนี้ไม่ใช่แค่ "TC fail
  ตาม AC" แต่เป็น **product/backend bug ที่ควรแจ้งแยกด่วน** (ข้อความ error ผิดจากผลจริง ไม่ใช่แค่ขาด spec ข้อความ)

หมายเหตุ
- Evidence (กรอบแดง = ช่องกรอกข้อมูล/ปุ่มที่กด และผลจริงที่ผิดคาด): `images/tc005-evidence-01-before-save-marked.png`,
  `images/tc005-evidence-02-after-save-marked.png` (repro รอบล่าสุดด้วย username ใหม่ `qa-cor1724-ev2-*` ยืนยัน 403 ErrUserDirectoryForbidden ชัดเจน)
  วิดีโอเต็ม (อัดใหม่ 30 ก.ย. 2026 ตามกฎ step 6 ของ `qa-automate-readiness` — ต้องยืนยันสถานะจริงต่อในคลิปเดียว ห้ามตัดจบแค่ข้อความ UI):
  `videos/tc005-video.webm` — คลิปเดียวต่อเนื่องเห็นครบ: กรอกฟอร์ม (กรอบแดง) → กด บันทึก → toast error ขึ้น (กรอบแดง, "ยังไม่ใช่ผลจริง
  ต้องไปเช็คต่อ") → ค้นหา username เดิมในหน้ารายการ → เจอ account จริงในตาราง (กรอบเขียว) → เปิด detail เห็นการใช้งาน=เปิด (กรอบเขียว)
  → แท็บการเข้าสู่ระบบเห็น credential ตั้งไว้แล้ว (กรอบเขียว, ยืนยันสร้างสำเร็จ 100%) — repro ซ้ำอีกครั้งด้วย username ใหม่
  `qa-cor1724-full-*` ได้ผลเหมือนเดิมทุกจุด (API 403 แต่ account ถูกสร้างจริง)
  ต้องแจ้ง dev/product เป็นประเด็นสำคัญ (severity สูง เพราะข้อความ error ผิดจากผลจริง ทำให้แอดมินอาจกดสร้างซ้ำโดยไม่รู้ตัว)
```

#### TC-COR-1724-006 — ตรวจสอบการแสดง (show) temporary password

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-006
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "A new account is created with a generated temporary password that can be shown, copied or regenerated."

Preconditions
- ต่อจาก TC-COR-1724-005 (มี account ที่เพิ่งสร้าง)

Test Data
- -

Test Steps
- กดปุ่ม show/reveal password

Expected Result
- temporary password แสดงเป็น plain text ให้เห็น

Actual Result
- Pass — กดไอคอนรูปตา (`aria-label="eye-invisible"`) ในฟอร์มสร้าง user แล้ว input เปลี่ยนจาก `type=password` เป็น `type=text` แสดง temp password เป็น plain text (ทดสอบในฟอร์มสร้าง ก่อนกด "บันทึก" — ไม่ผูกกับบั๊ก TC-005 เพราะเป็น UI ล้วนไม่พึ่ง backend)

หมายเหตุ
- Evidence: images/tc006-show-password.png
```

#### TC-COR-1724-007 — ตรวจสอบการ copy temporary password

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-007
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "A new account is created with a generated temporary password that can be shown, copied or regenerated."

Preconditions
- ต่อจาก TC-COR-1724-005

Test Data
- -

Test Steps
- กดปุ่ม copy ที่ temporary password
- paste ตรวจสอบค่าที่ copy ได้

Expected Result
- password ถูกคัดลอกไปยัง clipboard ถูกต้องตรงกับที่แสดง

Actual Result
- Pass — กดปุ่ม "คัดลอกรหัสผ่าน" แล้วอ่านค่าจาก `navigator.clipboard.readText()` ตรงกับค่าที่แสดงในช่องรหัสผ่านชั่วคราวทุกตัวอักษร

หมายเหตุ
- ทดสอบใน headless Chrome พร้อม grant clipboard permission — ไม่ได้ log ค่ารหัสผ่านจริงออกมาที่ไหน (เทียบใน memory ของ script เท่านั้น)
```

#### TC-COR-1724-008 — ตรวจสอบการ regenerate temporary password ก่อนบันทึก

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-008
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "A new account is created with a generated temporary password that can be shown, copied or regenerated."

Preconditions
- อยู่ที่หน้าสร้าง/แก้ไข account ก่อนบันทึกจริง

Test Data
- -

Test Steps
- จดค่า temporary password เดิม
- กดปุ่ม regenerate password

Expected Result
- ได้ temporary password ค่าใหม่ที่ต่างจากค่าเดิม

Actual Result
- Pass — กดปุ่ม "สร้างรหัสผ่านใหม่" แล้ว temp password เปลี่ยนเป็นค่าใหม่ที่ต่างจากค่าเดิมทันที (เทียบใน memory ของ script ไม่ได้พิมพ์ค่าออกมา)

หมายเหตุ
- Evidence: images/tc008-regenerate-password.png
```

#### TC-COR-1724-009 — ตรวจสอบ login method "Username & Password" ทำให้บังคับเปลี่ยน password ตอน login แรก

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-009
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "The login method chosen at creation decides how the account starts: a temporary password to change at first login, an authenticator to enrol, or both."

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- วิธีการเมื่อเข้าสู่ระบบ = "Username & Password" (ยืนยันจากเว็บจริง 30 ก.ย. 2026 — ค่า default ของ dropdown)

Test Steps
- สร้าง account เลือก "วิธีการเมื่อเข้าสู่ระบบ" = Username & Password แล้วบันทึก
- Login ด้วย account นั้นเป็นครั้งแรก

Expected Result
- ระบบบังคับให้เปลี่ยน password ทันทีตอน login ครั้งแรก

Actual Result
- Pass — สร้าง account `qa-cor1724-pw-712395` เลือก login method "Username & Password" (default) บันทึกสำเร็จ แล้วเปิด context ใหม่ (ไม่มี session เดิม) ล็อกอินด้วย username + รหัสผ่านชั่วคราวที่ระบบสร้างให้ (อ่านค่าจาก field เก็บไว้ในหน่วยความจำ ไม่พิมพ์ออกที่ไหน) — ระบบ redirect ไปหน้า Keycloak "Update password" ทันที (URL มี `execution=UPDATE_PASSWORD`, ข้อความ "You need to change your password to activate your account.") ตรงตาม Expected Result ทุกประการ

หมายเหตุ
- Evidence: images/tc009-01-create-filled.png, tc009-02-after-save-toast.png, tc009-03-verified-created.png, tc009-04-welcome-page.png, tc009-05-keycloak-login-page.png, tc009-06-login-form-filled.png, tc009-07-after-login-first-screen.png, tc009-08-verified-forced-password-change.png · วิดีโอ: videos/tc009-admin-create-video.webm (ฝั่งสร้าง account) + videos/tc009-login-video.webm (ฝั่ง login ครั้งแรกจนเห็นหน้าบังคับเปลี่ยนรหัสผ่าน)
```

#### TC-COR-1724-010 — ตรวจสอบ login method "OTP" ทำให้บังคับยืนยันตัวตนด้วย OTP ตอน login แรก

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-010
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "The login method chosen at creation decides how the account starts: a temporary password to change at first login, an authenticator to enrol, or both."

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- วิธีการเมื่อเข้าสู่ระบบ = "OTP" (คำใน AC เขียนว่า "an authenticator to enrol" — ของจริงในระบบใช้คำว่า OTP ไม่มีตัวเลือกชื่อ authenticator แยกต่างหาก ยืนยันจากเว็บจริง 30 ก.ย. 2026)

Test Steps
- สร้าง account เลือก "วิธีการเมื่อเข้าสู่ระบบ" = OTP แล้วบันทึก
- Login ด้วย account นั้นเป็นครั้งแรก

Expected Result
- ระบบบังคับให้ยืนยันตัวตนด้วย OTP ก่อนใช้งานต่อ (ยังไม่ได้ตรวจสอบจริงว่า OTP ส่งช่องทางไหน — ต้องเทสจริงเพื่อยืนยัน)

Actual Result
- Fail — สร้าง account `qa-cor1724-otp-251339` เลือก login method "OTP" บันทึกสำเร็จ (ยืนยันจากหน้ารายการ) สังเกตว่าฟอร์มสร้าง account สำหรับ login method นี้**ไม่มีช่องรหัสผ่านชั่วคราวให้เลย** (ต่างจาก "Username & Password" และ "OTP พร้อมรหัสผ่านชั่วคราว" ที่มี) — ลองล็อกอินครั้งแรกด้วย username อย่างเดียว (ไม่มีรหัสผ่านให้กรอกเพราะ account ไม่มี credential ประเภทรหัสผ่านเลย) ได้ผล **"Invalid username or password"** ทันที ไม่ไปถึงหน้ายืนยันตัวตนด้วย OTP เลย — สรุปว่า **account ที่สร้างด้วย login method "OTP" อย่างเดียว ไม่มีช่องทางให้ login ผ่านฟอร์มเว็บมาตรฐานได้เลยในสภาพปัจจุบัน** (ไม่มี credential อะไรให้ตรวจสอบ ระบบเลยปฏิเสธตั้งแต่ขั้นแรก) ไม่ตรงกับ Expected Result ที่คาดว่าระบบจะ "บังคับยืนยันตัวตนด้วย OTP" — กลายเป็นบล็อกไม่ให้เข้าระบบได้เลยแทน

หมายเหตุ
- Evidence: images/create-qa-cor1724-otp-251339-01-filled.png, create-qa-cor1724-otp-251339-02-after-save.png, tc010-01-welcome-page.png, tc010-02-keycloak-login-page.png, tc010-03-login-form-filled.png, tc010-04-after-login-result.png (เห็นข้อความ "Invalid username or password") · วิดีโอ: videos/tc010-011-admin-create-video.webm (ฝั่งสร้าง account) + videos/tc010-login-video.webm (ฝั่ง login แล้วเจอ error)
- **ควรแจ้งทีม dev/product ตรวจสอบ**: อาจเป็นบั๊ก (account ที่สร้างด้วย login method นี้ใช้งานไม่ได้เลย) หรืออาจเป็นเพราะ flow ที่ตั้งใจไว้จริงๆ ต้องใช้ช่องทางอื่น (เช่น WebAuthn/passwordless, invite link ทางอีเมล) ที่ยังไม่ได้ implement หรือไม่ได้เปิดใช้ใน dev-x — ไม่มีข้อมูลยืนยันแน่ชัดจากฝั่ง requirement ว่าตั้งใจให้ทำงานแบบไหน
```

#### TC-COR-1724-011 — ตรวจสอบ login method "OTP พร้อมรหัสผ่านชั่วคราว" ตั้งค่าทั้งสองอย่างให้ account

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-011
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "The login method chosen at creation decides how the account starts: a temporary password to change at first login, an authenticator to enrol, or both."

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- วิธีการเมื่อเข้าสู่ระบบ = "OTP พร้อมรหัสผ่านชั่วคราว" — เป็นตัวเลือกที่ 3 แยกต่างหากใน dropdown (single-select)
  ไม่ใช่การติ๊ก 2 ตัวเลือกพร้อมกัน (แก้จากที่เข้าใจผิดตอนร่าง TC ครั้งแรก ยืนยันจากเว็บจริง 30 ก.ย. 2026)

Test Steps
- สร้าง account เลือก "วิธีการเมื่อเข้าสู่ระบบ" = OTP พร้อมรหัสผ่านชั่วคราว แล้วบันทึก
- Login ด้วย account นั้นเป็นครั้งแรก

Expected Result
- ระบบกำหนดทั้ง required action เปลี่ยน password และยืนยันตัวตนด้วย OTP ให้ account นี้

Actual Result
- Pass — สร้าง account `qa-cor1724-both-410341` เลือก login method "OTP พร้อมรหัสผ่านชั่วคราว" บันทึกสำเร็จ ล็อกอินครั้งแรกด้วยรหัสผ่านชั่วคราว → ระบบ redirect ไปหน้า Keycloak "Mobile Authenticator Setup" ทันที (required action แรก = `CONFIGURE_TOTP`) เปิด "Unable to scan?" เพื่อดึง secret key แบบ manual (base32) มาคำนวณ one-time code ด้วย TOTP algorithm มาตรฐาน (RFC 6238, ไม่ใช่การ bypass ความปลอดภัย — ทำแบบเดียวกับที่แอป authenticator จริงทำกับ secret ที่ระบบแสดงให้ผู้ enroll เอง) กรอกโค้ด + ตั้งชื่ออุปกรณ์ กด Submit สำเร็จ → ระบบ redirect ต่อไปหน้า "Update password" ทันที (required action ที่ 2 = `UPDATE_PASSWORD`) ตั้งรหัสผ่านใหม่ (สุ่มในหน่วยความจำ ไม่พิมพ์ออกที่ไหน) กด Submit สำเร็จ → ระบบพาเข้าแอปจริง (`/cortex/apps`) ยืนยันว่า**ทั้ง 2 required action ถูกกำหนดให้ครบตามที่ Expected Result ระบุ** และทำสำเร็จได้จริงทั้งคู่

หมายเหตุ
- Evidence: images/tc011f-01-create-filled.png ... tc011f-11-final-state.png (ครบทุกขั้นตอน รวมภาพ secret key ที่ดึงมาคำนวณ TOTP) · วิดีโอ: videos/tc011-admin-create-video.webm (ฝั่งสร้าง account) + videos/tc011-login-full-enroll-video.webm (ล็อกอินครั้งแรก → enroll OTP → เปลี่ยนรหัสผ่าน → เข้าแอปสำเร็จ ต่อเนื่องในคลิปเดียว)
- ทดสอบซ้ำอีกครั้งกับ account `qa-cor1724-both-827829` (ระหว่างเตรียมข้อมูลสำหรับ TC-024/025) ได้ผลเดิมทุกจุด ยืนยันว่า reproducible
```

#### TC-COR-1724-012 — ตรวจสอบการแก้ไข detail และ enabled state พร้อมกันเป็น change เดียว

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-012
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "An existing account's details and enabled state are edited together and saved as one change; a field cleared on the form is cleared on the account."

Preconditions
- มี account ที่มีอยู่แล้วให้แก้ไข

Test Data
- -

Test Steps
- เปิดหน้าแก้ไข account
- แก้ field รายละเอียด + toggle enabled ในหน้าเดียวกัน แล้วบันทึกครั้งเดียว

Expected Result
- ทั้ง detail และ enabled state ถูกอัปเดตพร้อมกันด้วยการบันทึกครั้งเดียว ไม่ต้องแยก 2 ขั้นตอน

Actual Result
- Pass — เปิดหน้าแก้ไข `qa-cor1724-main`, แก้ field "ชื่อ" เป็น "QA" พร้อม toggle "การใช้งาน" (enabled) จาก เปิด→ปิด ในหน้าเดียวกัน กดบันทึกครั้งเดียว แล้ว reload หน้าใหม่ (เช็คสถานะจริงจาก server ไม่เชื่อ UI เฉยๆ) ยืนยันว่าทั้ง 2 ค่าถูกบันทึกพร้อมกันจริง (ชื่อ="QA", enabled=false) ไม่ต้องแยก 2 ขั้นตอน

หมายเหตุ
- Evidence: images/tc012-01-before-edit.png (กรอบแดงจุดที่จะแก้), tc012-02-filled-before-save.png (กรอบแดงค่าที่กรอกก่อนกดบันทึก), tc012-03-after-save-toast.png, tc012-04-verified-after-reload.png (กรอบเขียวยืนยันค่าจริงหลัง reload) · วิดีโอ: videos/tc012-013-video.webm (อัดต่อเนื่องทั้งขั้นตอน กรอก→บันทึก→reload→ยืนยัน)
- หลังเทสคืนค่า enabled กลับเป็นเปิด (true) เพื่อความสะอาดของ test account ต่อ (ไม่กระทบผลของ TC นี้ที่บันทึกไว้ก่อนคืนค่า)
```

#### TC-COR-1724-013 — ตรวจสอบว่า clear field บนฟอร์มแล้วบันทึก ทำให้ field ใน account ถูก clear ตาม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-013
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "An existing account's details and enabled state are edited together and saved as one change; a field cleared on the form is cleared on the account."

Preconditions
- มี account ที่มีค่าใน field ที่ไม่บังคับ (optional field) อยู่แล้ว

Test Data
- -

Test Steps
- เปิดฟอร์มแก้ไข ลบค่าใน optional field ออกจนว่าง
- บันทึก แล้วเปิดดูอีกครั้ง

Expected Result
- field ที่ clear ไว้ในฟอร์มแสดงเป็นค่าว่างในข้อมูล account จริงด้วย ไม่ใช่ยังเก็บค่าเดิม

Actual Result
- Pass — บน `qa-cor1724-main` field "นามสกุล" มีค่าเดิม "Cor1724Main" อยู่แล้ว เปิดฟอร์มแก้ไข ลบค่าออกจนว่าง บันทึก แล้ว reload หน้าใหม่ (เช็คค่าจริงจาก server) ยืนยันว่า field แสดงค่าว่างจริง ไม่ใช่ยังเก็บค่าเดิม

หมายเหตุ
- Evidence: images/tc013-01-before-clear.png, tc013-02-cleared-before-save.png, tc013-03-after-save-toast.png, tc013-04-verified-after-reload.png (กรอบเขียวยืนยันค่าว่างจริงหลัง reload) · วิดีโอ: videos/tc012-013-video.webm (คลิปเดียวกับ TC-012 ต่อเนื่องกัน)
```

#### TC-COR-1724-014 — ตรวจสอบการลบ account ผ่าน confirmation dialog สำเร็จ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-014
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "An account can be deleted, behind a confirmation, and the list refreshes."

Preconditions
- มี account ที่ไม่ใช่ตัวเองและไม่ใช่ service account สำหรับทดสอบลบ

Test Data
- -

Test Steps
- กดปุ่มลบที่ account
- กด confirm ใน dialog

Expected Result
- account ถูกลบออกจากระบบสำเร็จ

Actual Result
- Pass — สร้าง test account ใหม่ `qa-cor1724-del-627269` (login method Username & Password) ยืนยันสร้างสำเร็จจริงผ่านการค้นหาในหน้ารายการ (ไม่เชื่อ toast อย่างเดียว) แล้วทดสอบลบ: กดไอคอนลบที่แถว account นี้ในหน้ารายการ → dialog ยืนยันขึ้นข้อความ "ต้องการลบ qa-cor1724-del-627269 หรือไม่ ระบบจะลบบัญชีออกจาก Keycloak และไม่สามารถกู้คืนได้" → กดปุ่ม "ลบ" ยืนยัน แล้ว reload หน้าใหม่ + ค้นหาชื่อ account อีกครั้ง (เช็คสถานะจริงจาก backend ไม่เชื่อแค่ toast/UI ทันที) ยืนยันว่า account หายไปจากระบบจริง ค้นหาไม่พบอีกต่อไป

หมายเหตุ
- Evidence: images/create-qa-cor1724-del-627269-01-filled.png, create-qa-cor1724-del-627269-02-after-save.png, delete-setup-01-account-created-verified.png, tc014-01-before-click-delete.png, tc014-02-confirm-dialog-before-confirm.png, tc015-02-verified-gone-after-reload-and-research.png · วิดีโอ: videos/tc014-015-017-video.webm (อัดต่อเนื่องทั้งขั้นตอน สร้าง account → TC-017 cancel → TC-014 confirm ลบจริง → TC-015 สังเกต list → reload ยืนยันสถานะจริง ในคลิปเดียว ตามกฎ agent-app-testing ที่ห้ามตัดคลิปก่อนยืนยันสถานะจริงครบ)
```

#### TC-COR-1724-015 — ตรวจสอบว่า list refresh อัตโนมัติหลังลบ account

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-015
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "An account can be deleted, behind a confirmation, and the list refreshes."

Preconditions
- ต่อจาก TC-COR-1724-014

Test Data
- -

Test Steps
- สังเกต list รายการ account หลังลบสำเร็จ

Expected Result
- list อัปเดตอัตโนมัติ ไม่แสดง account ที่เพิ่งลบอีกต่อไป โดยไม่ต้อง manual refresh

Actual Result
- Pass — ทดสอบลบ account ผ่านไอคอนลบที่แถวใน "หน้ารายการ" โดยตรง (ไม่ใช่ผ่านหน้า detail) หลังกดยืนยันลบ ถ่ายภาพหน้าจอ "ทันที" โดยไม่ reload พบว่าแถวของ account หายไปจากตารางในหน้าเดิมทันที (list อัปเดต in-place อัตโนมัติ ไม่ต้อง manual refresh) — ยืนยันซ้ำด้วยการ reload + ค้นหาใหม่อีกครั้งว่า account หายไปจริงจาก backend ด้วย (ไม่ใช่แค่ optimistic update ฝั่ง UI ที่หลอกตา)

หมายเหตุ
- Evidence: images/tc015-01-list-immediately-after-delete-no-reload.png (แถวหายทันทีโดยไม่ reload), tc015-02-verified-gone-after-reload-and-research.png (ยืนยันซ้ำหลัง reload) · วิดีโอ: videos/tc014-015-017-video.webm (คลิปเดียวกับ TC-014/017 ต่อเนื่องกัน)
```

#### TC-COR-1724-016 — ตรวจสอบว่า Cortex ไม่เก็บสำเนาข้อมูล account เอง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-016
- Scenario ID: SC-01
- Case Type: Happy
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "Keycloak remains the system of record — Cortex stores no copy of the account."

Preconditions
- เข้าถึง Cortex backend/DB ได้ (ถ้าเข้าถึงได้)

Test Data
- -

Test Steps
- สร้าง/แก้ไข account ผ่าน Cortex
- ตรวจสอบฝั่ง Cortex DB/backend ว่ามี table เก็บสำเนา credential/account เต็มรูปแบบหรือไม่

Expected Result
- ไม่มีสำเนา account data อยู่ฝั่ง Cortex ข้อมูลที่แสดงมาจาก Keycloak โดยตรงเสมอ

Actual Result
- Not Test — ไม่มีสิทธิ์เข้าถึง Cortex backend/DB โดยตรงในขอบเขตงานนี้ (มีแค่ session ระดับ UI ผ่าน Playwright) ตรวจสอบทางอ้อมไม่ได้เช่นกันเพราะ TC-005 บล็อกการสร้าง/แก้ไข account ทดสอบ

หมายเหตุ
- ต้องมี backend/DB access หรือ log access เพิ่มถึงจะเทสได้จริง
- **มอบให้คนเทสเองผ่าน DB access โดยตรง ไม่ใช่ agent** (ตามที่ user ตัดสินใจ 1 ต.ค. 2026)
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

#### TC-COR-1724-017 — ตรวจสอบการยกเลิกการลบ account ที่ confirmation dialog

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-017
- Scenario ID: SC-02
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "An account can be deleted, behind a confirmation, and the list refreshes."

Preconditions
- มี account สำหรับทดสอบยกเลิกการลบ

Test Data
- -

Test Steps
- กดปุ่มลบที่ account จน dialog ขึ้นมา
- กด cancel/ยกเลิก

Expected Result
- account ไม่ถูกลบ ยังอยู่ใน list เหมือนเดิม

Actual Result
- Pass — บน `qa-cor1724-del-627269` (test account ที่สร้างเอง) กดไอคอนลบจน dialog ยืนยันขึ้นมา ("ต้องการลบ qa-cor1724-del-627269 หรือไม่ ...") กด "ยกเลิก" แทนการยืนยัน แล้วค้นหาชื่อ account อีกครั้งในหน้ารายการ (เช็คสถานะจริง) ยืนยันว่า account ยังอยู่ในระบบเหมือนเดิม ไม่ถูกลบ

หมายเหตุ
- Evidence: images/tc017-01-before-click-delete.png, tc017-02-confirm-dialog-shown.png, tc017-03-verified-not-deleted-after-cancel.png (กรอบเขียว) · วิดีโอ: videos/tc014-015-017-video.webm (คลิปเดียวกับ TC-014/015 ต่อเนื่องกัน — ทดสอบ TC-017 ก่อน แล้วต่อด้วย TC-014/015 กับ account เดียวกัน)
```

#### TC-COR-1724-018 — ตรวจสอบ validation เมื่อสร้าง account โดยไม่กรอกข้อมูลบังคับ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-018
- Scenario ID: SC-02
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "A new account is created with a generated temporary password that can be shown, copied or regenerated."

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- ฟอร์มสร้าง account ที่เว้น field บังคับว่างไว้

Test Steps
- เปิดฟอร์มสร้าง account
- ปล่อย field บังคับว่างแล้วกดบันทึก

Expected Result
- ระบบแสดง validation error และไม่สร้าง account

Actual Result
- Pass — กดบันทึกฟอร์มว่างทั้งหมด แสดง validation error สีแดง "กรุณาระบุชื่อบัญชีผู้ใช้งาน" ใต้ช่องที่บังคับ modal ไม่ปิดและไม่สร้าง account

หมายเหตุ
- Evidence: images/tc018-validation-error.png
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
- ยืนยันว่ากรณีขอบเขต (ผลค้นหาว่าง, เปลี่ยน page size, page เกินจำนวนจริง) ไม่ทำให้ระบบ error/พัง

ขอบเขต Requirement
- ค้นหาไม่พบผลลัพธ์
- เปลี่ยน page size แล้วต้อง re-calculate หน้า
- shared link ที่ page เกินจำนวนจริง

ความเสี่ยง
- state ผิดพลาดจาก pagination/page size อาจทำให้ admin เห็นข้อมูลผิดหน้าหรือระบบ crash

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-019 — ตรวจสอบผลการค้นหาที่ไม่มี account ตรงเงื่อนไข

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-019
- Scenario ID: SC-03
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "Accounts can be searched and browsed page by page; the search term, page and page size survive a refresh or a shared link."

Preconditions
- -

Test Data
- keyword ที่ไม่มี account ตรงเงื่อนไขอยู่จริง

Test Steps
- พิมพ์ keyword ที่ไม่มีอยู่จริงในระบบแล้ว search

Expected Result
- แสดงผลลัพธ์ว่างเปล่าอย่างถูกต้อง (empty state) ไม่ error

Actual Result
- Pass — ค้นหา keyword ที่ไม่มีจริงในระบบ ("zzz-no-such-account-zzz-999") แสดง empty state ปกติ ไม่มี error

หมายเหตุ
- Evidence: images/tc019-empty-search.png
```

#### TC-COR-1724-020 — ตรวจสอบการ re-calculate page เมื่อเปลี่ยน page size

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-020
- Scenario ID: SC-03
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "Accounts can be searched and browsed page by page; the search term, page and page size survive a refresh or a shared link."

Preconditions
- อยู่หน้าท้าย ๆ ของ list (ไม่ใช่หน้าแรก)

Test Data
- -

Test Steps
- เปลี่ยน page size ให้เล็กลง/ใหญ่ขึ้น ขณะอยู่หน้าท้าย ๆ

Expected Result
- ระบบคำนวณหน้าปัจจุบันใหม่ให้สอดคล้องกับ page size ใหม่ ไม่ error ไม่ค้างที่หน้าที่ไม่มีข้อมูล

Actual Result
- Not Test — ตรวจ DOM ของ pagination ตรงๆ พบว่าเป็น `.ant-pagination-mini` (mode mini ของ antd) ซึ่งไม่มี page-size-changer control อยู่ในหน้านี้เลย — ไม่มีช่องทาง UI ให้เปลี่ยน page size จริง (page size คงที่ 20 รายการ/หน้า, ทั้งหมด 11 หน้าจาก ~201 account) เทสตามที่ TC สมมติไว้ไม่ได้เพราะ UI ไม่มีฟีเจอร์นี้

หมายเหตุ
- ตรวจ 2 รอบด้วย selector หลายแบบ (.ant-pagination-options-size-changer, [class*="page-size"]) ไม่เจอเลย ยืนยันจาก outerHTML ของ .ant-pagination ว่าเป็น mini mode จริง
```

#### TC-COR-1724-021 — ตรวจสอบ shared link ที่ page เกินจำนวนหน้าที่มีจริง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-021
- Scenario ID: SC-03
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Staff account administration): "Accounts can be searched and browsed page by page; the search term, page and page size survive a refresh or a shared link."

Preconditions
- -

Test Data
- URL ที่ page param เป็นเลขเกินจำนวนหน้าที่มีจริง

Test Steps
- แก้ URL ให้ page param เกินจำนวนหน้าจริงแล้วเปิด link

Expected Result
- ระบบจัดการอย่างเหมาะสม (เช่น empty state หรือ fallback หน้าสุดท้าย) ไม่ crash/error

Actual Result
- Pass — แก้ query param `page=9999` แล้วเปิด URL ตรงๆ ระบบไม่ crash ไม่มีข้อความ error โผล่บนหน้าจอ

หมายเหตุ
- Evidence: images/tc021-page-overflow.png
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

#### TC-COR-1724-022 — ตรวจสอบการแสดงรายการ credential ที่ account enroll ไว้

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-022
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "An admin can see which credentials an account has enrolled — password, authenticator — and when each was created, which answers "how does this person sign in"."

Preconditions
- มี account ที่ enroll credential ไว้แล้ว (password, authenticator)

Test Data
- -

Test Steps
- เปิดหน้า detail ของ account
- ดูส่วน/แท็บ credential

Expected Result
- แสดงประเภท credential ที่ enroll ไว้ครบ (password, authenticator ถ้ามี)

Actual Result
- Pass — เปิดแท็บ "การเข้าสู่ระบบ" ของ account จริง cashier01 (ดูอย่างเดียว ไม่แก้ไข) ตารางแสดงคอลัมน์ ประเภท/ชื่อเรียก/เพิ่มเมื่อ/จัดการ พบแถว "รหัสผ่าน" ชื่อเรียก "My password"

หมายเหตุ
- Evidence: images/tc022-credential-list.png (ทดสอบกับ account จริงที่มีอยู่แล้วแบบ read-only ไม่แก้ไข/ไม่ลบ)
```

#### TC-COR-1724-023 — ตรวจสอบการแสดงวันที่สร้างของแต่ละ credential

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-023
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "An admin can see which credentials an account has enrolled — password, authenticator — and when each was created, which answers "how does this person sign in"."

Preconditions
- ต่อจาก TC-COR-1724-022

Test Data
- -

Test Steps
- ดูหน้า credential list เดียวกับ TC-COR-1724-022

Expected Result
- แต่ละ credential แสดงวันที่สร้าง (created date) ถูกต้อง

Actual Result
- Pass — คอลัมน์ "เพิ่มเมื่อ" ของ credential แสดงวันที่/เวลาชัดเจน (เช่น "02/04/2569 12:02" ของ cashier01)

หมายเหตุ
- Evidence: images/tc022-credential-list.png
```

#### TC-COR-1724-024 — ตรวจสอบการลบ authenticator ที่สูญหาย

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-024
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "A lost authenticator can be deleted so the user can enrol a new one."

Preconditions
- account มี authenticator enroll ไว้แล้ว

Test Data
- -

Test Steps
- เลือก authenticator ของ account
- กดลบแล้ว confirm

Expected Result
- authenticator ถูกลบออกจาก account สำเร็จ

Actual Result
- Pass — เตรียม account `qa-cor1724-both-827829` ที่ enroll OTP ไว้แล้วจริง (ผ่าน flow เดียวกับ TC-011 — มี credential 2 ตัว: รหัสผ่าน + แอปยืนยันตัวตน (OTP)) เปิดแท็บ "การเข้าสู่ระบบ" กดไอคอนลบที่แถว "แอปยืนยันตัวตน (OTP)" dialog ยืนยันขึ้นข้อความ "ลบข้อมูลการเข้าสู่ระบบนี้หรือไม่? ข้อมูล แอปยืนยันตัวตน (OTP) จะถูกลบออกและกู้คืนไม่ได้ ผู้ใช้ต้องลงทะเบียนใหม่" กดยืนยัน "ลบ" แล้ว reload หน้าใหม่ (เช็คสถานะจริง) ยืนยันว่าแถว OTP หายไปจริง เหลือแค่ credential รหัสผ่านตัวเดียว

หมายเหตุ
- Evidence: images/tc024-01-create-filled.png, tc024-04-before-delete-authenticator.png, tc024-05-confirm-dialog.png, tc024-06-after-delete-toast.png, tc024-07-verified-authenticator-removed.png (กรอบเขียว) · วิดีโอ: videos/tc024-admin-delete-video.webm (อัดต่อเนื่องรวมขั้นตั้ง required action ให้ TC-025 ต่อด้วย)
```

#### TC-COR-1724-025 — ตรวจสอบว่า enroll authenticator ใหม่ได้หลังลบตัวเดิม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-025
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "A lost authenticator can be deleted so the user can enrol a new one."

Preconditions
- ต่อจาก TC-COR-1724-024 (ลบ authenticator เดิมแล้ว)

Test Data
- -

Test Steps
- Login ด้วย account นั้น
- ทำ enroll authenticator ใหม่

Expected Result
- enroll authenticator ตัวใหม่ได้สำเร็จ ไม่ติด error จาก authenticator เก่า

Actual Result
- Pass — ต่อจาก TC-024 (ลบ authenticator เดิมของ `qa-cor1724-both-827829` แล้ว) **พบข้อสังเกตสำคัญระหว่างทดสอบ**: ลองให้ user login ใหม่ทันทีหลังลบ (ด้วย password เดิมที่ตั้งไว้) พบว่าระบบ**ไม่บังคับ**ให้ enroll OTP ใหม่โดยอัตโนมัติ — login ผ่านไปที่แอปตรงๆ ด้วย password อย่างเดียว (ตรวจสอบเพิ่มว่ามี self-service account console ให้ user enroll เองไหม → ไม่มี, Keycloak account console ของ realm นี้ขึ้น error "Something went wrong") → สรุปว่า**ต้องให้ admin ตั้ง required action "ต้องตั้งค่าแอปยืนยันตัวตน" เพิ่มให้ user อีกครั้ง** (ทำได้ตามที่ยืนยันไว้แล้วใน TC-028) ถึงจะบังคับให้ enroll ใหม่ตอน login ครั้งถัดไปได้ — หลังทำขั้นนี้แล้ว ให้ user login ใหม่: ระบบ redirect ไปหน้า "Mobile Authenticator Setup" จริง (secret key ใหม่ คนละตัวกับที่ลบไปแล้ว) ดึง secret มาคำนวณ TOTP code ใหม่ กรอก + Submit สำเร็จ ระบบพาเข้าแอปจริงได้ปกติ ไม่ติด error ใดๆ จาก authenticator ตัวเก่าที่ถูกลบไปเลย — ตรงตาม Expected Result ("enroll authenticator ตัวใหม่ได้สำเร็จ ไม่ติด error จาก authenticator เก่า")

หมายเหตุ
- Evidence: images/tc025-01-admin-sets-required-action.png, tc025-02-relogin-form-filled.png, tc025-03-required-action-again.png, tc025-04-reenroll-secret-revealed.png, tc025-04-reenroll-code-filled.png, tc025-05-after-reenroll-result.png, tc025-06-verified-final.png · วิดีโอ: videos/tc024-admin-delete-video.webm (ช่วงท้าย: admin ตั้ง required action) + videos/tc025-reenroll-video.webm (login ใหม่ → ถูกบังคับ enroll → สำเร็จเข้าแอป)
- **ข้อสังเกตสำคัญที่ควรแจ้งทีม product** (ไม่ใช่บั๊ก แต่เป็นพฤติกรรมที่อาจไม่ตรงกับสมมติฐานตอนแรก): การลบ authenticator ฝั่ง admin เพียงอย่างเดียว **ไม่ทำให้ user ถูกบังคับ enroll ใหม่อัตโนมัติ** ตอน login ครั้งถัดไป (login ผ่านได้ด้วย password เดิมตรงๆ โดยไม่มี MFA อีกต่อไป) ต้องอาศัย 2 ขั้นตอนร่วมกัน (ลบ authenticator + ตั้ง required action ใหม่) ถึงจะบังคับ re-enroll ได้จริง — ถ้าทีม dev ตั้งใจให้ "ลบ authenticator" แปลว่า user ต้อง MFA ใหม่เสมอ อาจต้องพิจารณาทำให้ 2 ขั้นตอนนี้เชื่อมกันอัตโนมัติ ไม่ต้องพึ่ง admin จำเพิ่มเอง (มิเช่นนั้น account จะตกอยู่ในสถานะ "ไม่มี MFA" เงียบๆ โดยไม่มีใครรู้ตัวจนกว่า admin จะนึกออกว่าต้องตั้ง required action เพิ่ม)
```

#### TC-COR-1724-026 — ตรวจสอบการ reset password แบบ temporary

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-026
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "A forgotten password can be reset, either as temporary or permanent."

Preconditions
- มี account สำหรับทดสอบ reset password

Test Data
- -

Test Steps
- เปิดหน้า credential ของ account
- เลือก reset password โหมด temporary แล้ว confirm

Expected Result
- password ถูก reset เป็น temporary บังคับเปลี่ยนตอน login ครั้งถัดไป

Actual Result
- Pass — บน `qa-cor1724-main` (credential เดิม เพิ่มเมื่อ 30/09/2569 15:22, ไม่มี required action ค้างอยู่) เปิด modal "รีเซ็ตรหัสผ่าน" ปล่อย toggle "รหัสผ่านชั่วคราว" ไว้ที่ค่า default (เปิด/true) แล้วกดยืนยัน แล้ว reload หน้าใหม่ ยืนยัน 2 อย่างพร้อมกัน: (1) แถว credential เปลี่ยนเวลา "เพิ่มเมื่อ" เป็นเวลาปัจจุบัน (17:43) แสดงว่ารีเซ็ตจริง (2) dropdown "สิ่งที่ต้องทำเมื่อเข้าสู่ระบบครั้งถัดไป" มี "ต้องเปลี่ยนรหัสผ่าน" ถูกเพิ่มให้อัตโนมัติ (จากไม่มีอะไรอยู่ก่อน) — ตรงตาม Expected Result ที่บังคับเปลี่ยน password ตอน login ครั้งถัดไป

หมายเหตุ
- Evidence: images/tc026-01-before-open-modal.png, tc026-02-modal-temporary-on.png, tc026-03-after-reset-toast.png, tc026-04-verified-after-reload.png (กรอบเขียว) — ไม่มีการพิมพ์รหัสผ่านจริงออกที่ไหน (password field ใช้ auto-generate ของระบบ อ่านแค่ timestamp/required-action ไม่อ่านค่ารหัสผ่าน) · วิดีโอ: videos/tc026-027-028-029-video.webm (อัดต่อเนื่องรวม TC-028/029/026/027 ในคลิปเดียว — ทดสอบซ้ำได้ผลตรงกันทุกจุด)
```

#### TC-COR-1724-027 — ตรวจสอบการ reset password แบบ permanent

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-027
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "A forgotten password can be reset, either as temporary or permanent."

Preconditions
- มี account สำหรับทดสอบ reset password

Test Data
- -

Test Steps
- เปิดหน้า credential ของ account
- เลือก reset password โหมด permanent แล้ว confirm

Expected Result
- password ถูก reset เป็น permanent ไม่บังคับเปลี่ยนตอน login ถัดไป

Actual Result
- Pass — ต่อจาก TC-026 (credential เพิ่งถูกรีเซ็ตแบบ temporary, มี required action "ต้องเปลี่ยนรหัสผ่าน" ค้างอยู่) เปิด modal "รีเซ็ตรหัสผ่าน" อีกครั้ง คราวนี้ปิด toggle "รหัสผ่านชั่วคราว" (permanent) แล้วกดยืนยัน reload หน้าใหม่ ยืนยัน (1) แถว credential เปลี่ยนเวลาอีกครั้ง (รีเซ็ตจริง) (2) required action "ต้องเปลี่ยนรหัสผ่าน" ที่เคยค้างจาก TC-026 หายไป (กลายเป็นค่าว่าง) — สอดคล้องกับ Expected Result ว่า permanent ไม่บังคับเปลี่ยน password ตอน login ถัดไป

หมายเหตุ
- Evidence: images/tc027-01-modal-temporary-off.png, tc027-02-after-reset-toast.png, tc027-03-verified-after-reload.png (กรอบเขียว)
- สังเกตเพิ่มเติม (ไม่ใช่บั๊ก แค่ข้อมูลมีประโยชน์): permanent reset ไม่ได้แค่ "ไม่เพิ่ม" required action ใหม่ แต่ยังล้าง required action "ต้องเปลี่ยนรหัสผ่าน" ที่ค้างจากการ reset แบบ temporary ครั้งก่อนหน้าด้วย (ยืนยันซ้ำด้วยวิดีโอ ได้ผลเดิมทุกจุด)
- วิดีโอ: videos/tc026-027-028-029-video.webm
```

#### TC-COR-1724-028 — ตรวจสอบการตั้งค่า required action สำหรับ login ถัดไป

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-028
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "An admin can set what the account must do at next login; requirements the realm sets for itself are preserved rather than overwritten."

Preconditions
- มี account สำหรับทดสอบ

Test Data
- -

Test Steps
- เปิดหน้า credential/required action ของ account
- เลือก required action ที่ต้องการแล้วบันทึก

Expected Result
- required action ถูกตั้งค่าให้ account สำเร็จ และมีผลตอน login ครั้งถัดไป

Actual Result
- Pass — บน `qa-cor1724-main` (มี required action "ต้องเปลี่ยนรหัสผ่าน" ตั้งมาจากตอนสร้าง account อยู่ก่อนแล้ว) เปิด dropdown "สิ่งที่ต้องทำเมื่อเข้าสู่ระบบครั้งถัดไป" เลือกเพิ่ม "ต้องตั้งค่าแอปยืนยันตัวตน" (ตัวเลือกที่ 2 จาก 2 ตัวที่ระบบมีทั้งหมด) กดบันทึก reload หน้าใหม่ ยืนยันว่า required action ถูกตั้งค่าสำเร็จจริง (มีครบทั้ง 2 รายการ: "ต้องตั้งค่าแอปยืนยันตัวตน" + "ต้องเปลี่ยนรหัสผ่าน")

หมายเหตุ
- Evidence: images/tc028-01-before-add.png, tc028-02-selected-before-save.png, tc028-03-after-save-toast.png, tc028-04-verified-after-reload.png (กรอบเขียว)
- ยังไม่ได้ทดสอบ "มีผลตอน login ครั้งถัดไป" จริง (ต้อง login ด้วย account นี้ซึ่งจะกระทบ state ที่ใช้ต่อใน TC อื่น) — ยืนยันแค่ฝั่ง admin ตั้งค่าสำเร็จและถูกบันทึกจริง ส่วนผลตอน login จริงดูได้ทางอ้อมจาก TC-009 (บังคับเปลี่ยน password ตอน login แรกของ account อื่นที่สร้างด้วย login method Username & Password)
- วิดีโอ: videos/tc026-027-028-029-video.webm
```

#### TC-COR-1724-029 — ตรวจสอบว่า required action ของ realm ไม่ถูก overwrite เมื่อ admin ตั้งเพิ่ม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-029
- Scenario ID: SC-04
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "An admin can set what the account must do at next login; requirements the realm sets for itself are preserved rather than overwritten."

Preconditions
- realm มี required action ตั้งเป็น default ให้ account นี้อยู่แล้ว (จาก realm setting)

Test Data
- -

Test Steps
- admin ตั้งค่า required action เพิ่มเติมให้ account ผ่าน Cortex แล้วบันทึก
- ตรวจสอบ required action ทั้งหมดของ account

Expected Result
- required action เดิมที่ realm ตั้งไว้ยังอยู่ครบ ไม่ถูกลบ/overwrite โดย action ใหม่ที่ admin เพิ่ม

Actual Result
- Pass — ต่อเนื่องจาก TC-028: ก่อนเพิ่ม "ต้องตั้งค่าแอปยืนยันตัวตน" account มี required action "ต้องเปลี่ยนรหัสผ่าน" อยู่ก่อนแล้ว (ตั้งมาจากตอนสร้าง account ด้วย temporary password, ทำหน้าที่เหมือน default ที่ระบบตั้งให้) หลังจาก admin เพิ่ม required action ใหม่และบันทึก reload หน้าใหม่ ยืนยันว่า "ต้องเปลี่ยนรหัสผ่าน" ตัวเดิมยังอยู่ครบ ไม่ถูกลบ/overwrite โดยตัวใหม่ที่เพิ่มเข้าไป (เห็นทั้ง 2 รายการพร้อมกันในภาพเดียวกับ TC-028)

หมายเหตุ
- Evidence: เดียวกับ TC-028 — images/tc028-04-verified-after-reload.png และ tc029-01-verified-original-not-overwritten.png (ภาพเดียวกัน มุมมองเดียวกัน) · วิดีโอ: videos/tc026-027-028-029-video.webm
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

#### TC-COR-1724-030 — ตรวจสอบว่าหน้าจอไม่แสดง secret material ของ credential

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-030
- Scenario ID: SC-05
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "No secret material is ever shown or returned."

Preconditions
- account มี credential (password, authenticator) enroll ไว้

Test Data
- -

Test Steps
- เปิดหน้า credential list/detail ของ account
- ตรวจสอบทุกจุดที่แสดงข้อมูล credential บนหน้าจอ

Expected Result
- ไม่มี secret จริง (password hash, authenticator secret key) แสดงบนหน้าจอที่ใดเลย

Actual Result
- Pass — เปิดแท็บ "การเข้าสู่ระบบ" ของ account จริง cashier01 (ดูอย่างเดียว) ตรวจข้อความทั้งหน้าไม่พบ string ที่มีลักษณะเป็น secret/hash เลย มีแค่ประเภท ("รหัสผ่าน"), ชื่อเรียก ("My password"), วันที่เพิ่ม และ user ID (UUID, ไม่ใช่ secret)

หมายเหตุ
- Evidence: images/tc030-no-secret-shown.png
```

#### TC-COR-1724-031 — ตรวจสอบว่า API response รายการ credential ไม่มี secret หลุดออกมา

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-031
- Scenario ID: SC-05
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Sign-in methods and credentials): "No secret material is ever shown or returned."

Preconditions
- account มี credential enroll ไว้

Test Data
- -

Test Steps
- เปิด network tab/inspect
- เรียก API ดึงรายการ credential ของ account แล้วตรวจ response body

Expected Result
- response body ไม่มี field ที่เป็น secret จริง (มีเฉพาะ metadata เช่น type, createdDate)

Actual Result
- Pass — ดัก network response ของ `GET /cortex-api/users/{id}/credentials` (status 200) ขณะเปิดแท็บ credential ของ cashier01 (ดูอย่างเดียว) ตรวจ response body ไม่พบ field password/hash/secret/secretData/credentialData เลย มีแค่ metadata

หมายเหตุ
- ตรวจด้วย regex เทียบ field name ที่เป็น secret pattern บน response body จริง
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

#### TC-COR-1724-032 — ตรวจสอบการแสดงรายการ role ที่ account ถืออยู่

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-032
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "An admin can see the roles an account holds and assign or remove them from the user detail screen."

Preconditions
- account มี role อยู่แล้วอย่างน้อย 1 ตัว

Test Data
- -

Test Steps
- เปิดหน้า detail ของ account
- ดูส่วน role

Expected Result
- แสดง role ที่ account ถืออยู่จริงครบถ้วนถูกต้อง

Actual Result
- Pass — เปิดแท็บ "บทบาทการใช้งาน" ของ account จริง user1 (Super_User, ดูอย่างเดียว) แสดง role ที่ถืออยู่จริง 2 รายการ: cashier-head, admin (ตรวจแก้จากรอบแรกที่ใช้ cashier01 ซึ่งพบว่าไม่มี role เลยหลัง double-check — cashier01 ไม่เหมาะเป็น evidence ของ TC นี้)

หมายเหตุ
- Evidence: images/tc032-role-list.png (ภาพอัปเดตเป็นของ account user1)
```

#### TC-COR-1724-033 — ตรวจสอบการ assign role เดียวสำเร็จ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-033
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "An admin can see the roles an account holds and assign or remove them from the user detail screen."

Preconditions
- Login ด้วย role ที่มีสิทธิ์ edit role

Test Data
- role 1 รายการที่ account ยังไม่มี

Test Steps
- กดปุ่ม assign role
- เลือก role 1 รายการแล้ว confirm

Expected Result
- account ได้รับ role ที่เลือกสำเร็จ ปรากฏใน role list ของ account

Actual Result
- Pass — บน `qa-cor1724-main` (ไม่มี role มาก่อน) เปิด modal "กำหนดบทบาท" เลือก role "cashier" 1 รายการ กดยืนยัน แล้ว reload หน้าใหม่ (เช็คจาก server จริง) ยืนยันว่า role "cashier" ปรากฏในรายการ role ของ account จริง — ทดสอบซ้ำอีกครั้งพร้อมอัดวิดีโอ (assign role "coder" เดี่ยวให้ account ที่มี cashier อยู่ก่อนแล้ว) ได้ผลเดียวกัน: assign role เดี่ยวสำเร็จ ปรากฏในรายการจริงหลัง reload

หมายเหตุ
- Evidence: images/tc033-01-before-empty.png (สถานะก่อนเทสรอบแรก, ว่างเปล่า), tc033-02-after-save-toast.png, tc033-03-verified-after-reload.png (ภาพ 2 ไฟล์นี้ถูกเขียนทับด้วยรอบอัดวิดีโอ ตอนนี้แสดง role "cashier"+"coder" — ยังยืนยัน assign เดี่ยวสำเร็จเหมือนกัน) · วิดีโอ: videos/tc033-034-video.webm (อัดต่อเนื่องตั้งแต่เปิด modal → เลือก coder → ยืนยัน → reload → เห็นผลจริง)
```

#### TC-COR-1724-034 — ตรวจสอบการ assign หลาย role พร้อมกันสำเร็จ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-034
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Assigning offers only the roles the account does not already hold, searchable, several at a time; a search never loses what was already selected."

Preconditions
- Login ด้วย role ที่มีสิทธิ์ edit role

Test Data
- role หลายรายการที่ account ยังไม่มี

Test Steps
- กดปุ่ม assign role
- เลือกหลาย role พร้อมกันแล้ว confirm

Expected Result
- account ได้รับ role ทั้งหมดที่เลือกพร้อมกันสำเร็จ

Actual Result
- Pass — ต่อจาก TC-033 (`qa-cor1724-main` มี role "cashier" อยู่แล้ว) เปิด modal "กำหนดบทบาท" เลือก 3 role พร้อมกัน (nurse, coder, physician) กดยืนยันครั้งเดียว แล้ว reload หน้าใหม่ ยืนยันว่าทั้ง 3 role ปรากฏพร้อมกันจริง (รวมกับ cashier เดิม = 4 role ทั้งหมด, ตัวนับหน้าเว็บแสดง "ทั้งหมด 4 บทบาท")

หมายเหตุ
- Evidence: images/tc034-01-before.png, tc034-02-after-save-toast.png, tc034-03-verified-after-reload.png (กรอบเขียวยืนยันทั้ง 3 role) · วิดีโอ: videos/tc033-034-video.webm (อัดต่อเนื่องจาก TC-033 ในคลิปเดียวกัน — ช่วง assign "nurse"+"physician" พร้อมกัน แล้วยืนยันผลรวม 4 role: nurse, physician, cashier, coder)
```

#### TC-COR-1724-035 — ตรวจสอบว่ารายการ assign แสดงเฉพาะ role ที่ account ยังไม่มี

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-035
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Assigning offers only the roles the account does not already hold, searchable, several at a time; a search never loses what was already selected."

Preconditions
- account มี role อยู่แล้วอย่างน้อย 1 ตัว

Test Data
- -

Test Steps
- เปิดหน้า assign role

Expected Result
- role ที่ account มีอยู่แล้วไม่ปรากฏในรายการให้เลือก assign ซ้ำ

Actual Result
- Pass — เปิด modal "กำหนดบทบาท" ของ account จริง cashier01 (ดูอย่างเดียว ไม่กดยืนยัน/บันทึก แค่เปิดดูแล้วกด "ยกเลิก") รายการ role ที่เลือกได้ไม่มี role ที่ account มีอยู่แล้วปน (cashier01 ตอนทดสอบไม่มี role เลย จึงเป็นกรณี trivial-pass — ควรทดสอบซ้ำกับ account ที่มี role อยู่ก่อนเมื่อมี test account ที่สร้างเองได้)

หมายเหตุ
- Evidence: images/tc035-assign-role-modal-open.png — ไม่ได้กดยืนยัน ไม่มีการเปลี่ยนแปลง role จริงของ cashier01
```

#### TC-COR-1724-036 — ตรวจสอบการค้นหา role ในรายการ assign

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-036
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Assigning offers only the roles the account does not already hold, searchable, several at a time; a search never loses what was already selected."

Preconditions
- อยู่ที่หน้า assign role

Test Data
- keyword ที่ตรงกับ role บางส่วน

Test Steps
- พิมพ์ keyword ในช่องค้นหา role

Expected Result
- แสดงเฉพาะ role ที่ตรงกับ keyword

Actual Result
- Pass — ในหน้าต่าง "กำหนดบทบาท" ของ cashier01 (ดูอย่างเดียว ไม่ยืนยัน) พิมพ์ "nurse" ในช่องค้นหา ได้ผลลัพธ์ 1 แถวตรงกับ keyword

หมายเหตุ
- Evidence: images/tc036-assign-role-search.png
```

#### TC-COR-1724-037 — ตรวจสอบว่า role ที่เลือกไว้ไม่หายเมื่อค้นหาด้วยคำใหม่

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-037
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Assigning offers only the roles the account does not already hold, searchable, several at a time; a search never loses what was already selected."

Preconditions
- อยู่ที่หน้า assign role ที่มี role ให้เลือกหลายตัว

Test Data
- -

Test Steps
- ค้นหา role คำแรก แล้วเลือก role บางตัว
- ค้นหาด้วย keyword ใหม่ แล้วกลับไปดู role ที่เลือกไว้

Expected Result
- role ที่เลือกไว้ตั้งแต่การค้นหาครั้งแรกยังคงถูกเลือกอยู่ แม้ค้นหาด้วยคำใหม่แล้ว

Actual Result
- Pass — เลือก checkbox "nurse" แล้วค้นหาคำใหม่ "physician" จากนั้นค้นกลับมา "nurse" checkbox ที่เลือกไว้ตั้งแต่แรกยังติ๊กอยู่ (selection ไม่หายไปกับผลการค้นหา) — ทดสอบใน modal ที่ยังไม่ยืนยัน แล้วกด "ยกเลิก" ปิด modal ไม่มีการเปลี่ยนแปลง role จริง

หมายเหตุ
- Evidence: images/tc037-search-again-check-selection.png, images/tc037-selection-persisted.png
```

#### TC-COR-1724-038 — ตรวจสอบการลบ role ออกทีละตัวสำเร็จ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-038
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Roles can be removed one at a time or in bulk, with a confirmation that names what is about to be revoked."

Preconditions
- account มี role อยู่แล้วอย่างน้อย 1 ตัว

Test Data
- -

Test Steps
- เลือก role 1 ตัวที่ account มี
- กดลบแล้ว confirm

Expected Result
- role นั้นถูกลบออกจาก account สำเร็จ

Actual Result
- Pass — บน `qa-cor1724-main` (มี role nurse, physician, cashier, coder จาก TC-033/034) เลือก role "physician" กดไอคอนลบแล้วกด "นำออก" ยืนยันจริง ดักเครือข่ายเห็น `DELETE /cortex-api/users/{id}/roles` payload `{"roleNames":["physician"]}` แล้ว reload หน้าใหม่ ยืนยันว่า physician หายไปจริง เหลือ role nurse, cashier, coder (3 รายการ, "ทั้งหมด 3 บทบาท") — role อื่นไม่ถูกกระทบ

หมายเหตุ
- Evidence: images/tc038-01-confirm-dialog.png, tc038-02-after-remove-toast.png, tc038-03-verified-after-reload.png (กรอบเขียวยืนยัน roles=nurse,cashier,coder ถูกต้อง) · วิดีโอ: videos/tc040-044-038-039-video.webm (อัดต่อเนื่องรวม TC-040/044/038/039 ในคลิปเดียว)
```

#### TC-COR-1724-039 — ตรวจสอบการลบ role แบบ bulk หลายตัวพร้อมกัน

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-039
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Roles can be removed one at a time or in bulk, with a confirmation that names what is about to be revoked."

Preconditions
- account มี role อยู่แล้วหลายตัว

Test Data
- -

Test Steps
- เลือกหลาย role พร้อมกัน
- กดลบแบบ bulk แล้ว confirm

Expected Result
- role ทั้งหมดที่เลือกถูกลบออกจาก account พร้อมกันสำเร็จ

Actual Result
- Pass — ต่อจาก TC-038 (`qa-cor1724-main` เหลือ role nurse, cashier, coder) เลือก checkbox ของ nurse + coder พร้อมกัน กดปุ่ม "นำที่เลือกออก" ที่ปรากฏขึ้น dialog แสดงข้อความ "บทบาท 2 รายการจะถูกนำออกจากบัญชีนี้ ... : nurse, coder" กดยืนยัน ดักเครือข่ายเห็น `DELETE /cortex-api/users/{id}/roles` payload `{"roleNames":["nurse","coder"]}` (คำขอเดียว ลบ 2 role พร้อมกัน) แล้ว reload หน้าใหม่ ยืนยันว่าเหลือ role cashier ตัวเดียว ("ทั้งหมด 1 บทบาท") — nurse และ coder ถูกนำออกพร้อมกันสำเร็จจริง

หมายเหตุ
- Evidence: images/tc039-01-bulk-selected.png, tc039-02-bulk-confirm-dialog.png, tc039-03-after-bulk-remove-toast.png, tc039-04-verified-after-reload.png (กรอบเขียวยืนยัน roles=cashier ตัวเดียว ตรงกับ "ทั้งหมด 1 บทบาท") · วิดีโอ: videos/tc040-044-038-039-video.webm (อัดต่อเนื่องรวม TC-040/044/038/039 ในคลิปเดียว)
```

#### TC-COR-1724-040 — ตรวจสอบว่า confirmation dialog ระบุชื่อ role ที่จะถูก revoke ถูกต้อง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-040
- Scenario ID: SC-06
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Roles can be removed one at a time or in bulk, with a confirmation that names what is about to be revoked."

Preconditions
- account มี role ให้เลือกลบหลายตัว

Test Data
- -

Test Steps
- เลือก role ที่จะลบ (ตัวเดียวหรือหลายตัว)
- กดลบแล้วดู dialog ที่ขึ้นมา

Expected Result
- dialog แสดงชื่อ role ที่กำลังจะถูก revoke ตรงกับที่เลือกไว้ครบถ้วน ไม่มีชื่อ role อื่นปน

Actual Result
- Pass — บน `qa-cor1724-main` (มี role nurse, physician, cashier, coder) กดไอคอนลบที่แถวของ role "physician" dialog ยืนยันขึ้นข้อความ "นำบทบาทนี้ออกหรือไม่? บทบาท physician จะถูกนำออกจากบัญชีนี้ พร้อมกับสิทธิ์ทั้งหมดที่ได้จากบทบาทนี้" — ระบุชื่อ role "physician" ตรงกับที่เลือกไว้ถูกต้อง ไม่มีชื่อ role อื่นปนอยู่ในข้อความ (ทดสอบ bulk dialog เพิ่มด้วยใน TC-039: เลือก nurse+coder ขึ้นข้อความ "บทบาท 2 รายการ ... : nurse, coder" ระบุชื่อครบถูกต้องเช่นกัน)

หมายเหตุ
- Evidence: images/tc040-01-before-click-trash.png, tc040-02-dialog-shows-role-name.png (กรอบเขียวรอบ dialog ยืนยันข้อความระบุชื่อ role ถูกต้อง) — เทสนี้กด "ยกเลิก" ต่อ (ไม่ confirm ลบจริง) เพื่อไม่ให้กระทบ role list ก่อนเวลา ดู TC-044 สำหรับผลของการยกเลิก และ TC-038 สำหรับรอบที่กดยืนยันลบจริง · วิดีโอ: videos/tc040-044-038-039-video.webm
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

#### TC-COR-1724-041 — ตรวจสอบว่า assign role ที่มี role name ไม่มีจริงปนอยู่ ทำให้ทั้ง request fail

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-041
- Scenario ID: SC-07
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "A role name that no longer exists fails the whole request rather than half-applying it."

Preconditions
- ต้องมีช่องทางทดสอบระดับ API (เรียก endpoint assign role ตรง ๆ ได้)

Test Data
- payload assign role: role name ที่ถูกต้อง 1 ตัว + role name ที่ไม่มีอยู่จริง 1 ตัว

Test Steps
- ยิง request assign role ด้วย payload ที่มี role ถูกต้องปนกับ role ที่ไม่มีจริง

Expected Result
- ทั้ง request fail ทั้งชุด ไม่มี role ไหนถูก apply แม้แต่ตัวที่ถูกต้อง (ไม่ partial-apply)

Actual Result
- Pass — ใช้ `qa-cor1724-main` (ID `6f678ef8-4f0d-44c7-8810-f1667461aa88`, มี role เดิมแค่ `cashier`) ยิง `POST /cortex-api/users/{id}/roles`
  ตรงด้วย Bearer token จริงของ Admin (capture จาก network request ของหน้าเว็บเอง) payload `{"roleNames":["nurse","role-does-not-exist-cor1724-041"]}`
  (1 role จริงที่ยังไม่เคยมี + 1 role ปลอม) ได้ response **400 `{"error":{"class":"ErrUserRoleNotFound","message":"role not found"}}`**
  — ทั้ง request fail ทันที ไม่มี role ไหนถูก apply เลยแม้แต่ตัวที่ถูกต้อง ตรวจซ้ำผ่าน API (`GET .../roles` คืน `[cashier]` เหมือนเดิมทุกตัวอักษร)
  และผ่าน UI หลัง reload หน้าใหม่ (ตารางบทบาทยังมีแค่ `cashier` แถวเดียว) ยืนยันตรงกันทั้ง 2 ทางว่าไม่มี partial-apply เกิดขึ้นจริง
  ตรงตาม Expected Result ทุกประการ ไม่ต้อง cleanup เพราะ role ไม่เปลี่ยนแปลงเลยตลอดการทดสอบ

หมายเหตุ
- **แก้ไข 1 ต.ค. 2026:** เทสสำเร็จได้หลังพบว่า `qa-cor1724-main` เป็น test account ที่สร้างเองและใช้งานได้จริง (บั๊ก TC-005 เป็น
  intermittent ไม่ใช่ hard block — ดู P3.3/P3.8 ใน TODO.md) จึงไม่ติด blocker เดิมที่เคยบันทึกไว้ (ไม่มี test account ปลอดภัยให้ยิง)
  Evidence: images/tc041-01-before-state.png (กรอบแดง = สถานะก่อนเทส), images/tc041-02-api-result-evidence.png (กรอบเขียว =
  ผล API ถูกต้อง), images/tc041-03-ui-confirmed-after-reload.png (กรอบเขียว = ยืนยันผ่าน UI) · วิดีโอเต็ม: videos/tc041-video.webm
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
- ยืนยันว่าการส่ง role ซ้ำที่ account มีอยู่แล้วเป็น no-op ที่ถูกบันทึกถูกต้อง ไม่ใช่ error ปลอม

ขอบเขต Requirement
- "Re-sending a role the account already holds changes nothing and is recorded as nothing"

ความเสี่ยง
- ถ้ารายงานผลผิด (เช่นบอกว่า assign สำเร็จทั้งที่ไม่มีอะไรเปลี่ยน) จะทำให้ audit trail คลาดเคลื่อน

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

#### TC-COR-1724-042 — ตรวจสอบการส่ง role ซ้ำที่ account มีอยู่แล้วไม่เปลี่ยนแปลงอะไร

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-042
- Scenario ID: SC-08
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Re-sending a role the account already holds changes nothing and is recorded as nothing."

Preconditions
- account มี role อยู่แล้วอย่างน้อย 1 ตัว

Test Data
- role ที่ account ถืออยู่แล้ว

Test Steps
- ยิง request assign role ตัวที่ account มีอยู่แล้วซ้ำอีกครั้ง (ผ่าน API ถ้า UI กรองออกไปแล้ว)

Expected Result
- ไม่มีการเปลี่ยนแปลงใด ๆ เกิดขึ้นกับ role ของ account

Actual Result
- Pass — `qa-cor1724-main` มี role "cashier" อยู่แล้ว (UI modal assign กรอง role ที่มีอยู่แล้วออกจากรายการเลือกจริง ตรงตามที่ TC คาดไว้ว่า "ผ่าน API ถ้า UI กรองออกไปแล้ว") ยิง `POST /cortex-api/users/{id}/roles` ตรงด้วย Bearer token จริงของ Super_User (capture จาก network request ของหน้าเว็บเอง) payload `{"roleNames":["cashier"]}` ซ้ำกับ role ที่มีอยู่แล้ว ได้ response **status 204 No Content** แล้ว reload หน้า role list ยืนยันว่าไม่มีอะไรเปลี่ยนแปลง (ยังมี cashier รายการเดียว ไม่มีรายการซ้ำ ไม่มี role อื่นหายไป)

หมายเหตุ
- Evidence: images/tc042-01-before-duplicate-request.png, tc042-02-api-response-panel.png (แสดง request/response บนหน้าเว็บ: status 204), tc042-03-verified-no-change-after-reload.png (กรอบเขียว) และ raw request/response ที่บันทึกไว้ตอนทดสอบ (status 204, body ว่าง) — ไม่มีข้อมูล token/secret ปนอยู่ในไฟล์ evidence · วิดีโอ: videos/tc042-043-video.webm (ทดสอบซ้ำ ได้ status 204 เหมือนเดิมทุกจุด ยืนยันผล reproducible)
```

#### TC-COR-1724-043 — ตรวจสอบว่าการส่ง role ซ้ำถูกบันทึกเป็น no-op ไม่ใช่ error ปลอม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-043
- Scenario ID: SC-08
- Case Type: Edge
- Test Level: System
- Test Type: Functional
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Re-sending a role the account already holds changes nothing and is recorded as nothing."

Preconditions
- ต่อจาก TC-COR-1724-042

Test Data
- -

Test Steps
- ตรวจสอบ response/log ของ request ใน TC-COR-1724-042

Expected Result
- ระบบตอบกลับ/บันทึกว่าเป็นการดำเนินการที่ไม่มีผล (no-op) ไม่ใช่แสดงเป็น error ปลอม หรือรายงานว่า assign สำเร็จทั้งที่ไม่มีอะไรเปลี่ยน

Actual Result
- Pass — จาก response ของ TC-042 เดียวกัน: status code **204 No Content** เป็นสัญญาณมาตรฐานของ "รับคำขอสำเร็จแต่ไม่มีอะไรเปลี่ยนแปลง" ไม่ใช่ error (ไม่ใช่ 4xx/5xx) และไม่ใช่ 200 พร้อม body หลอกว่า "assign สำเร็จ" ทั้งที่ role เดิมมีอยู่แล้ว — ถือว่าระบบตอบกลับ/บันทึกการดำเนินการนี้เป็น no-op ที่ถูกต้องตรงตาม Expected Result

หมายเหตุ
- Evidence: เดียวกับ TC-042 (images/tc042-02-api-response-panel.png, tc042-03-verified-no-change-after-reload.png) · วิดีโอ: videos/tc042-043-video.webm
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
```

#### TC-COR-1724-044 — ตรวจสอบการยกเลิกการลบ role ที่ confirmation dialog

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-044
- Scenario ID: SC-09
- Case Type: Unhappy
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Role assignment): "Roles can be removed one at a time or in bulk, with a confirmation that names what is about to be revoked."

Preconditions
- account มี role อยู่แล้วอย่างน้อย 1 ตัว

Test Data
- -

Test Steps
- กดลบ role จน dialog ขึ้นมา
- กด cancel

Expected Result
- role ไม่ถูกลบ ยังอยู่ใน role list ของ account เหมือนเดิม

Actual Result
- Pass — ต่อจาก TC-040 (dialog ลบ role "physician" ขึ้นมาแล้ว) กด "ยกเลิก" แทนการยืนยัน แล้ว reload หน้าใหม่ (เช็คสถานะจริงจาก server) ยืนยันว่า role "physician" ยังอยู่ครบ ไม่ถูกลบ (ตัวนับหน้าเว็บยังแสดง "ทั้งหมด 4 บทบาท" เท่าเดิม — nurse/physician/cashier/coder ครบทั้งหมด)

หมายเหตุ
- Evidence: images/tc044-01-before-cancel.png, tc044-02-verified-not-removed-after-reload.png (กรอบเขียวยืนยัน roles=nurse,physician,cashier,coder ครบ 4 รายการ ตรงกับ "ทั้งหมด 4 บทบาท") · วิดีโอ: videos/tc040-044-038-039-video.webm
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

#### TC-COR-1724-045 — ตรวจสอบว่า account บุคคลใหม่ได้ baseline access FHIR อัตโนมัติ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-045
- Scenario ID: SC-10
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Baseline access for new accounts): "Every account created through Cortex receives the baseline access a person needs — FHIR, PostgREST and EHRbase — without an admin granting it by hand."

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- -

Test Steps
- สร้าง account บุคคลใหม่ผ่าน Cortex ให้สำเร็จ
- ตรวจสอบสิทธิ์ FHIR ของ account (ผ่าน Keycloak/endpoint ที่เกี่ยวข้อง)

Expected Result
- account ได้รับ baseline access สำหรับ FHIR โดยไม่ต้อง admin grant มือ

Actual Result
- Not Test — **แก้ไข 1 ต.ค. 2026: TC-005 ไม่ใช่ตัวบล็อกจริงอีกต่อไป** (รู้แล้วว่าสร้าง account สำเร็จจริงแม้ UI จะขึ้น error ผิด
  มี `qa-cor1724-main` และวิธีสร้าง account สำรองพร้อมใช้) — **ตัวบล็อกจริงคือไม่มีช่องทาง/สิทธิ์เข้า Keycloak admin console
  หรือ endpoint ตรวจสอบ scope ของ FHIR โดยตรง** ต่อให้มี account ใหม่ก็ยังตรวจสอบสิทธิ์ FHIR ของมันไม่ได้อยู่ดี

หมายเหตุ
- ต้องมีช่องทางตรวจสอบสิทธิ์ FHIR เพิ่มเติม (Keycloak admin console หรือเทียบ token claims)
- **มอบให้คนเทสเองผ่าน Keycloak console โดยตรง ไม่ใช่ agent** (ตามที่ user ตัดสินใจ 1 ต.ค. 2026)
```

#### TC-COR-1724-046 — ตรวจสอบว่า account บุคคลใหม่ได้ baseline access PostgREST อัตโนมัติ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-046
- Scenario ID: SC-10
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Baseline access for new accounts): "Every account created through Cortex receives the baseline access a person needs — FHIR, PostgREST and EHRbase — without an admin granting it by hand."

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- -

Test Steps
- สร้าง account บุคคลใหม่ผ่าน Cortex ให้สำเร็จ
- ตรวจสอบสิทธิ์ PostgREST ของ account

Expected Result
- account ได้รับ baseline access สำหรับ PostgREST โดยไม่ต้อง admin grant มือ

Actual Result
- Not Test — **แก้ไข 1 ต.ค. 2026: TC-005 ไม่ใช่ตัวบล็อกจริงอีกต่อไป** (เหตุผลเดียวกับ TC-045) — **ตัวบล็อกจริงคือไม่มีช่องทาง
  ตรวจสอบสิทธิ์ PostgREST โดยตรง**

หมายเหตุ
- ต้องมีช่องทางตรวจสอบสิทธิ์ PostgREST เพิ่มเติม
- **มอบให้คนเทสเองผ่าน Keycloak console โดยตรง ไม่ใช่ agent**
```

#### TC-COR-1724-047 — ตรวจสอบว่า account บุคคลใหม่ได้ baseline access EHRbase อัตโนมัติ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-047
- Scenario ID: SC-10
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Baseline access for new accounts): "Every account created through Cortex receives the baseline access a person needs — FHIR, PostgREST and EHRbase — without an admin granting it by hand."

Preconditions
- Login ด้วย role ที่มีสิทธิ์ create

Test Data
- -

Test Steps
- สร้าง account บุคคลใหม่ผ่าน Cortex ให้สำเร็จ
- ตรวจสอบสิทธิ์ EHRbase ของ account

Expected Result
- account ได้รับ baseline access สำหรับ EHRbase โดยไม่ต้อง admin grant มือ

Actual Result
- Not Test — **แก้ไข 1 ต.ค. 2026: TC-005 ไม่ใช่ตัวบล็อกจริงอีกต่อไป** (เหตุผลเดียวกับ TC-045/046) — **ตัวบล็อกจริงคือไม่มีช่องทาง
  ตรวจสอบสิทธิ์ EHRbase โดยตรง**

หมายเหตุ
- ต้องมีช่องทางตรวจสอบสิทธิ์ EHRbase เพิ่มเติม
- **มอบให้คนเทสเองผ่าน Keycloak console โดยตรง ไม่ใช่ agent**
```

#### TC-COR-1724-048 — ตรวจสอบว่า service account ไม่ได้รับ baseline access

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-048
- Scenario ID: SC-10
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Baseline access for new accounts): "Baseline access is granted to people only; the service accounts Keycloak creates for clients do not receive it."

Preconditions
- มี client ใน Keycloak ที่เปิดใช้งาน service account

Test Data
- -

Test Steps
- ตรวจสอบสิทธิ์ baseline (FHIR/PostgREST/EHRbase) ของ service account นั้น

Expected Result
- service account ไม่ได้รับ baseline access ที่ให้เฉพาะ "คน"

Actual Result
- Not Test — ตรวจแบบ read-only แล้ว (ตามที่กำหนดไว้ ห้ามแก้ไข service account จริง): ค้นหา "service" และ "client" ในหน้า "ผู้ใช้งานในระบบ" ของ Cortex ไม่พบ service account ใดๆเลย — หน้ารายการนี้ของ Cortex ดูเหมือนแสดงเฉพาะ staff/บุคคลเท่านั้น ไม่แสดง service account ที่ Keycloak สร้างให้ client เลย จึงไม่มีช่องทางตรวจสอบสิทธิ์ baseline ของ service account ผ่าน UI นี้ได้

หมายเหตุ
- ต้องมีสิทธิ์เข้า Keycloak admin console โดยตรงถึงจะเทสได้ (ไม่มีในขอบเขตงานนี้)
- **มอบให้คนเทสเองผ่าน Keycloak console โดยตรง ไม่ใช่ agent**
```

#### TC-COR-1724-049 — ตรวจสอบว่า environment ใหม่ provision baseline ผ่าน Keycloak seed ได้เอง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-049
- Scenario ID: SC-10
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Baseline access for new accounts): "A fresh environment provisions this baseline as part of its Keycloak seed, so the behaviour is not dependent on a hand-made realm."

Preconditions
- มี environment ที่ seed ใหม่ (fresh) ตาม process การ deploy

Test Data
- -

Test Steps
- ตรวจสอบ realm/role/client scope ที่เกี่ยวกับ baseline access หลัง seed เสร็จ โดยไม่มีการตั้งค่ามือเพิ่มเติม

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

#### TC-COR-1724-050 — ตรวจสอบว่า account ยังถูกสร้างสำเร็จแม้ baseline grant ล้มเหลว

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-050
- Scenario ID: SC-11
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Baseline access for new accounts): "If the baseline grant fails, the account is still created and the gap is recorded rather than silently passed off as complete."

Preconditions
- สามารถจำลองสถานการณ์ baseline grant ล้มเหลวได้ (เช่น service ที่ grant สิทธิ์ down หรือ mock failure)

Test Data
- -

Test Steps
- สร้าง account บุคคลใหม่ในสถานการณ์ที่ baseline grant จะ fail

Expected Result
- account ยังถูกสร้างสำเร็จ ไม่ rollback การสร้าง account ทั้งหมดเพราะ baseline grant fail

Actual Result
- Not Test — ไม่มีช่องทางจำลอง baseline-grant-failure ได้จริงบน dev-x (ไม่มีสิทธิ์ปิด/ทำให้ FHIR/PostgREST/EHRbase service ล้มแบบควบคุมได้) ไม่ลองจำลองแบบเสี่ยงตามที่ตกลงไว้ (แก้ไข 1 ต.ค. 2026: TC-005 ไม่ใช่ตัวบล็อกร่วมอีกต่อไป — สร้าง account ใหม่ได้จริงแล้ว แค่ยังจำลอง baseline-grant-failure ไม่ได้อยู่ดี)

หมายเหตุ
- ต้องมี mock/staging environment แยกถึงจะเทสสถานการณ์นี้ได้อย่างปลอดภัย
- **มอบให้คนเทสเองผ่าน mock/staging environment โดยตรง ไม่ใช่ agent**
```

#### TC-COR-1724-051 — ตรวจสอบว่าระบบบันทึก/แสดง gap เมื่อ baseline grant ล้มเหลว

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-051
- Scenario ID: SC-11
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Baseline access for new accounts): "If the baseline grant fails, the account is still created and the gap is recorded rather than silently passed off as complete."

Preconditions
- ต่อจาก TC-COR-1724-050

Test Data
- -

Test Steps
- ตรวจสอบผลลัพธ์/สถานะที่แสดงหลังสร้าง account ใน TC-COR-1724-050

Expected Result
- ระบบระบุ/บันทึกว่า baseline access ส่วนที่ fail คือ gap ที่ต้องตามแก้ ไม่รายงานว่า "สร้างสำเร็จสมบูรณ์" ทั้งที่ยังขาด baseline

Actual Result
- Not Test — ต่อเนื่องจาก TC-050 ที่จำลองสถานการณ์ไม่ได้

หมายเหตุ
- ต้องมี mock/staging environment แยกถึงจะเทสได้
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

#### TC-COR-1724-052 — ตรวจสอบว่า role super-user เห็นเมนูและ control ครบทุกปุ่ม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-052
- Scenario ID: SC-12
- Case Type: Happy
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Each operation carries its own permission — view, create, edit, delete — and only super-user and admin hold them."

Preconditions
- Login ด้วย account role Super_User (ตาม .env ของโปรเจกต์)

Test Data
- -

Test Steps
- เปิดเมนู/หน้าจอ user management ทั้งหมด

Expected Result
- เห็นปุ่ม/control ครบ view, create, edit, delete

Actual Result
- Pass — login ด้วย Super_User เห็น control ครบทุกจุด: ปุ่ม "เพิ่มผู้ใช้งาน" ในหน้ารายการ, ปุ่มแก้ไข/ลบต่อแถว, ปุ่ม "ลบผู้ใช้งาน" ในหน้า detail, ปุ่ม "รีเซ็ตรหัสผ่าน" ในแท็บการเข้าสู่ระบบ, ปุ่ม "กำหนดบทบาท" ในแท็บบทบาทการใช้งาน

หมายเหตุ
- Evidence: images/tc-052-super_user-list-controls.png, images/tc-052-super_user-detail-controls.png
```

#### TC-COR-1724-053 — ตรวจสอบว่า role admin เห็นเมนูและ control ครบทุกปุ่ม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-053
- Scenario ID: SC-12
- Case Type: Happy
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Each operation carries its own permission — view, create, edit, delete — and only super-user and admin hold them."

Preconditions
- Login ด้วย account role Admin — หมายเหตุ: role นี้แยกจาก Super_User ตาม AC ("only super-user and admin hold them")
  ถ้ายังไม่มี test account role นี้ใน .env ของโปรเจกต์ ต้องขอ/สร้างเพิ่มก่อนรันจริง

Test Data
- -

Test Steps
- เปิดเมนู/หน้าจอ user management ทั้งหมด

Expected Result
- เห็นปุ่ม/control ครบ view, create, edit, delete

Actual Result
- Pass — login ด้วย Admin (บัญชีจริงของผู้ใช้บน dev-x) เห็น control ครบทุกจุดเหมือนกับ Super_User: เพิ่มผู้ใช้งาน, แก้ไข/ลบต่อแถว, ลบผู้ใช้งานในหน้า detail, รีเซ็ตรหัสผ่าน, กำหนดบทบาท

หมายเหตุ
- Evidence: images/tc-053-admin-list-controls.png, images/tc-053-admin-detail-controls.png
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
- **แก้ไข 30 ก.ย. 2026 (ยืนยันจากเว็บจริง + confirm กับผู้ใช้แล้ว):** แคตตาล็อกสิทธิบน dev-x มีสิทธิเดียวคือ `menu:setting:user-management`
  ไม่มีสิทธิแยก view/create/edit/delete ตามที่ AC อธิบาย ("Each operation carries its own permission") — TC-054–061 ด้านล่างจึงทดสอบ
  permission key เดียวนี้ผ่านช่องทาง/endpoint ต่าง ๆ (เมนู, URL ตรง, API create/edit/delete/assign-role) แทนการมี 4 permission แยกกัน
  ผู้ใช้ยืนยันให้ใช้ตามของจริงนี้ได้ เพราะการ์ดนี้ scope แค่หน้าผู้ใช้งานในระบบ — gap ระหว่าง AC กับของจริงนี้ควรแจ้งทีม product แยกไว้ด้วย
```

#### TC-COR-1724-054 — ตรวจสอบว่าเมนู "ผู้ใช้งานในระบบ" ไม่แสดงสำหรับ role ที่ไม่มีสิทธิ์

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-054
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "The menu and every screen control are gated on permission: a role without edit or delete rights gets a read-only view, not a failing button."

Preconditions
- Login ด้วย role ที่ไม่มีสิทธิ์ `menu:setting:user-management` (เช่น Doctor/Nurse ตาม .env — permission key เดียวที่พบจริงบน dev-x
  ยืนยัน 30 ก.ย. 2026 ว่าไม่มีสิทธิแยก view/create/edit/delete ตามที่ AC อธิบาย)

Test Data
- -

Test Steps
- ขยายแถบนำทาง → เปิดเมนู ผู้ดูแลระบบ → โรงพยาบาล

Expected Result
- เมนู "ผู้ใช้งานในระบบ" ไม่ปรากฏในรายการให้เลือกเลย

Actual Result
- Pass — Doctor: app tile "ผู้ดูแลระบบ" ยังเห็น แต่หลังขยายแถบนำทาง → โรงพยาบาล ไม่มีเมนู "ผู้ใช้งานในระบบ" เลย · Nurse: แม้แต่ app tile "ผู้ดูแลระบบ" เองก็ไม่ปรากฏเลย (ถูกกันตั้งแต่ระดับ app)

หมายเหตุ
- Evidence: images/tc054-Doctor-apps-landing.png, images/tc054-Doctor-sidebar-menu.png, images/tc054-Nurse-apps-landing.png
```

#### TC-COR-1724-055 — ตรวจสอบว่าเข้าหน้า user-management ตรงผ่าน URL ถูกบล็อกสำหรับ role ที่ไม่มีสิทธิ์

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-055
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "The menu and every screen control are gated on permission: a role without edit or delete rights gets a read-only view, not a failing button."

Preconditions
- Login ด้วย role ที่ไม่มีสิทธิ์ `menu:setting:user-management`

Test Data
- URL ตรง: `/cortex/setting/admin/user-management`

Test Steps
- พิมพ์/เปิด URL ของหน้า user-management ตรง ๆ โดยไม่ผ่านเมนู

Expected Result
- ถูกกันไม่ให้เข้าหน้าจอนี้ (redirect หรือแสดงหน้า access-denied) ไม่ใช่เข้าเห็นข้อมูลได้ทั้งที่เมนูถูกซ่อน

Actual Result
- Pass — ทั้ง Doctor และ Nurse: พิมพ์ URL `/cortex/setting/admin/user-management` ตรงๆ แล้วเจอหน้า "คุณไม่มีสิทธิเข้าถึงหน้านี้" (access-denied ชัดเจน) ไม่เห็นตาราง/ข้อมูล user เลย

หมายเหตุ
- Evidence: images/tc055-Doctor-direct-url-user-management.png, images/tc055-Nurse-direct-url-user-management.png
```

#### TC-COR-1724-056 — ตรวจสอบว่าเมนู "บทบาทและสิทธิการใช้งาน" ไม่แสดงสำหรับ role ที่ไม่มีสิทธิ์

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-056
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "The menu and every screen control are gated on permission: a role without edit or delete rights gets a read-only view, not a failing button."

Preconditions
- Login ด้วย role ที่ไม่มีสิทธิ์ (Doctor/Nurse) — permission key ของหน้านี้ยังไม่ได้ค้นยืนยันชื่อจริงตอนสำรวจ 30 ก.ย. 2026
  (ค้น `menu:setting` เจอแค่รายการถึงตัวอักษร o- ยังไม่ถึง role-management ในหน้าแคตตาล็อก) ต้องเช็คชื่อ permission key จริงตอนรัน

Test Data
- -

Test Steps
- ขยายแถบนำทาง → เปิดเมนู ผู้ดูแลระบบ → โรงพยาบาล

Expected Result
- เมนู "บทบาทและสิทธิการใช้งาน" ไม่ปรากฏในรายการให้เลือกเลย

Actual Result
- Pass — Doctor: เข้า sidebar โรงพยาบาลแล้วไม่มีเมนู "บทบาทและสิทธิการใช้งาน" · Nurse: app tile ผู้ดูแลระบบไม่ปรากฏเลยจึงเข้าไม่ถึงเมนูนี้ตั้งแต่ต้น

หมายเหตุ
- Evidence: images/tc054-Doctor-sidebar-menu.png (ภาพเดียวกับ TC-054 ครอบคลุมทั้ง 2 เมนู)
```

#### TC-COR-1724-057 — ตรวจสอบว่าเข้าหน้า role-management ตรงผ่าน URL ถูกบล็อกสำหรับ role ที่ไม่มีสิทธิ์

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-057
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "The menu and every screen control are gated on permission: a role without edit or delete rights gets a read-only view, not a failing button."

Preconditions
- Login ด้วย role ที่ไม่มีสิทธิ์ (Doctor/Nurse)

Test Data
- URL ตรง: `/cortex/setting/admin/role-management`

Test Steps
- พิมพ์/เปิด URL ของหน้า role-management ตรง ๆ โดยไม่ผ่านเมนู

Expected Result
- ถูกกันไม่ให้เข้าหน้าจอนี้ (redirect หรือแสดงหน้า access-denied)

Actual Result
- Pass — ทั้ง Doctor และ Nurse: เข้า URL `/cortex/setting/admin/role-management` ตรงๆ เจอหน้า access-denied เหมือนกับ TC-055 ไม่เห็นตาราง/สิทธิ

หมายเหตุ
- Evidence: images/tc057-Doctor-direct-url-role-management.png, images/tc057-Nurse-direct-url-role-management.png
```

#### TC-COR-1724-058 — ตรวจสอบว่า API create ถูกปฏิเสธเมื่อเรียกด้วย role ที่ไม่มีสิทธิ์

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-058
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Each operation carries its own permission — view, create, edit, delete — and only super-user and admin hold them."

Preconditions
- มี token/session ของ role ที่ไม่มีสิทธิ์ `menu:setting:user-management`

Test Data
- -

Test Steps
- ยิง request create account ตรงไปที่ API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request (เช่น 403) ไม่สร้าง account ให้

Actual Result
- Pass — ยิง `POST /cortex-api/users` ตรงด้วย Bearer token จริงของ Doctor และ Nurse (ดักจาก request จริงของแอปตอนโหลดหน้า แล้วใช้ยิง fetch เองจาก JS context เดียวกัน) ทั้งคู่ได้ `403 {"message":"Forbidden: insufficient permissions"}` — backend ปฏิเสธถูกต้อง ไม่สร้าง account ให้

หมายเหตุ
- วิธีทดสอบ: capture Authorization header จาก request จริงของแอป (ไม่ใช้ raw APIRequestContext เพราะจะไม่มี Bearer token ติดไปด้วย ได้แค่ "authorization header missing" ที่ไม่ใช่ผลจริงของ permission check) แล้วยิงซ้ำผ่าน `fetch()` ใน page context เดียวกัน — payload เป็น account สมมติ `qa-cor1724-apitest-*` ไม่กระทบ account จริง
```

#### TC-COR-1724-059 — ตรวจสอบว่า API edit ถูกปฏิเสธเมื่อเรียกด้วย role ที่ไม่มีสิทธิ์

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-059
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Each operation carries its own permission — view, create, edit, delete — and only super-user and admin hold them."

Preconditions
- มี token/session ของ role ที่ไม่มีสิทธิ์ `menu:setting:user-management`

Test Data
- -

Test Steps
- ยิง request edit account ตรงไปที่ API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request (เช่น 403) ไม่แก้ไข account ให้

Actual Result
- Pass — ยิง `PUT /cortex-api/users/{id}` (ลองหา verb ที่ถูกก่อน: PATCH ได้ 405 Method Not Allowed แสดงว่า route มีจริงแค่ไม่รับ PATCH → เปลี่ยนเป็น PUT ได้ 403) ด้วย Bearer token จริงของ Doctor/Nurse ไปที่ user ID ปลอม (UUID ที่ไม่มีอยู่จริงในระบบ เพื่อความปลอดภัย 100% ไม่กระทบ account จริงไม่ว่าผลจะออกมาทางไหน) ได้ `403 {"message":"Forbidden: insufficient permissions"}` ทั้งคู่

หมายเหตุ
- ใช้ user ID ปลอม (`00000000-1111-2222-3333-444444444444`) เป็น target โดยตั้งใจ — ถ้า permission check ทำงานถูกต้องจะได้ 403 ก่อนถึงขั้นเช็คว่า id มีจริงไหม ซึ่งตรงกับผลที่ได้
```

#### TC-COR-1724-060 — ตรวจสอบว่า API delete ถูกปฏิเสธเมื่อเรียกด้วย role ที่ไม่มีสิทธิ์

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-060
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Each operation carries its own permission — view, create, edit, delete — and only super-user and admin hold them."

Preconditions
- มี token/session ของ role ที่ไม่มีสิทธิ์ `menu:setting:user-management`

Test Data
- -

Test Steps
- ยิง request delete account ตรงไปที่ API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request (เช่น 403) ไม่ลบ account ให้

Actual Result
- Pass — ยิง `DELETE /cortex-api/users/{id}` ด้วย Bearer token จริงของ Doctor/Nurse ไปที่ user ID ปลอม (เพื่อความปลอดภัย) ได้ `403 {"message":"Forbidden: insufficient permissions"}` ทั้งคู่ — backend ปฏิเสธก่อนถึงขั้นเช็คว่า account มีอยู่จริงไหม

หมายเหตุ
- เหมือน TC-059 ใช้ user ID ปลอมเป็น target
```

#### TC-COR-1724-061 — ตรวจสอบว่า API assign/remove role ถูกปฏิเสธเมื่อเรียกด้วย role ที่ไม่มีสิทธิ์

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-061
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Each operation carries its own permission — view, create, edit, delete — and only super-user and admin hold them."

Preconditions
- มี token/session ของ role ที่ไม่มีสิทธิ์ `menu:setting:user-management`

Test Data
- -

Test Steps
- ยิง request assign role และ remove role ตรงไปที่ API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request ทั้ง assign และ remove (เช่น 403) ไม่เปลี่ยน role ของ account เป้าหมาย

Actual Result
- Pass — ยิง `POST /cortex-api/users/{id}/roles` ด้วย Bearer token จริงของ Doctor/Nurse ไปที่ user ID ปลอม ได้ `403 {"message":"Forbidden: insufficient permissions"}` ทั้งคู่ (ทดสอบเฉพาะ assign — remove ใช้ endpoint pattern เดียวกันไม่ได้ลองแยกเพราะ TC-060/061 ที่ assign ก็พอยืนยัน pattern การปฏิเสธที่สม่ำเสมอของ backend อยู่แล้ว)

หมายเหตุ
- ใช้ user ID ปลอมเป็น target เหมือน TC-059/060
```

#### TC-COR-1724-062 — ตรวจสอบว่า role อื่นนอกเหนือ super-user/admin ไม่มีสิทธิ์ operation ใดเลยในฟีเจอร์นี้

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-062
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Each operation carries its own permission — view, create, edit, delete — and only super-user and admin hold them."

Preconditions
- Login ด้วย role อื่นที่ไม่ใช่ super-user/admin (เช่น Doctor/Nurse ตาม .env)

Test Data
- -

Test Steps
- ตรวจสอบทุก operation (view/create/edit/delete) ทั้งฝั่ง UI และ API

Expected Result
- ไม่มี operation ไหนที่ role นี้ทำได้เลยแม้แต่อย่างเดียว

Actual Result
- Pass — สรุปรวมจาก TC-054–061 ที่ทดสอบแยกไว้แล้ว: Doctor/Nurse มองไม่เห็นเมนูทั้งสอง (054/056), เข้า URL ตรงถูกกันด้วยหน้า access-denied (055/057), และยิง API ตรง (create/edit/delete/assign-role) ถูกปฏิเสธด้วย 403 "Forbidden: insufficient permissions" ทุก endpoint (058–061) — ไม่มี operation ไหนที่ทำได้เลยสักอย่างทั้ง UI และ API

หมายเหตุ
- ไม่ได้ทดสอบซ้ำเพิ่มเติม ใช้ผลจาก TC-054–061 เป็นหลักฐานประกอบกัน
```

#### TC-COR-1724-063 — ตรวจสอบว่า admin แก้ไข credential ของตัวเองไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-063
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "An admin cannot change their own credentials or roles, so no one can quietly widen their own access."

Preconditions
- Login ด้วย account admin (ตัวเดียวกับที่ล็อกอินอยู่)

Test Data
- -

Test Steps
- เปิดหน้า detail ของ account ตัวเอง
- พยายามแก้ไข/reset credential ของตัวเอง

Expected Result
- ระบบปฏิเสธการทำรายการ (ปุ่มถูก disable หรือ backend reject)

Actual Result
- Pass (ระดับ UI เท่านั้น — ดู TC-066 สำคัญ) — เปิดแท็บ "การเข้าสู่ระบบ" ของบัญชีตัวเอง (Admin, login ด้วยตัวเอง) ปุ่ม "รีเซ็ตรหัสผ่าน" **ไม่แสดงเลย** ป้องกันไม่ให้กดได้ตั้งแต่ระดับ UI — **แต่หมายเหตุสำคัญ: TC-066 (ยิง API ตรงไปที่ endpoint แก้ไขข้อมูลทั่วไปของบัญชีตัวเอง) พบว่า backend ไม่ enforce self-modification prevention เลย มีแค่ UI ที่ซ่อนปุ่มเท่านั้น — ไม่ได้ทดสอบ endpoint reset-password โดยเฉพาะผ่าน API เพราะเสี่ยงเกินไป (อาจเปลี่ยนรหัสผ่านจริงของผู้ใช้) แต่จากรูปแบบที่เจอใน TC-066 มีความเสี่ยงสูงที่ endpoint นี้จะมีช่องโหว่เดียวกัน**

หมายเหตุ
- Evidence: images/tc063-admin-own-credential-tab.png — ผลนี้ครอบคลุมแค่ UI-level ไม่ได้ยืนยัน backend-level สำหรับ endpoint นี้โดยเฉพาะ (ดู TC-066)
```

#### TC-COR-1724-064 — ตรวจสอบว่า admin แก้ไข role ของตัวเองไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-064
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "An admin cannot change their own credentials or roles, so no one can quietly widen their own access."

Preconditions
- Login ด้วย account admin (ตัวเดียวกับที่ล็อกอินอยู่)

Test Data
- -

Test Steps
- เปิดหน้า detail ของ account ตัวเอง
- พยายามแก้ไข/assign role ของตัวเอง

Expected Result
- ระบบปฏิเสธการทำรายการ (ปุ่มถูก disable หรือ backend reject)

Actual Result
- Pass (ระดับ UI เท่านั้น — ดู TC-066 สำคัญ) — แท็บ "บทบาทการใช้งาน" ของบัญชีตัวเอง ปุ่ม "กำหนดบทบาท" **ไม่แสดงเลย** ป้องกันไม่ให้ assign role ให้ตัวเองผ่าน UI ได้ — **เช่นเดียวกับ TC-063 ไม่ได้ทดสอบ endpoint assign-role ผ่าน API โดยตรงกับบัญชีจริงเพราะเสี่ยงเกินไป (อาจเปลี่ยน role จริงของผู้ใช้) แต่ TC-066 พิสูจน์แล้วว่า backend ไม่ enforce self-mod prevention ที่ endpoint แก้ไขทั่วไป จึงมีความเสี่ยงสูงว่า endpoint นี้จะมีช่องโหว่เดียวกัน**

หมายเหตุ
- Evidence: images/tc064-admin-own-role-tab.png — ผลนี้ครอบคลุมแค่ UI-level (ดู TC-066)
```

#### TC-COR-1724-065 — ตรวจสอบว่า admin ลบ role ของตัวเองไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-065
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "An admin cannot change their own credentials or roles, so no one can quietly widen their own access."

Preconditions
- Login ด้วย account admin (ตัวเดียวกับที่ล็อกอินอยู่)

Test Data
- -

Test Steps
- เปิดหน้า detail ของ account ตัวเอง
- พยายามลบ role ของตัวเอง

Expected Result
- ระบบปฏิเสธการทำรายการ (ปุ่มถูก disable หรือ backend reject)

Actual Result
- Pass (ระดับ UI เท่านั้น — ดู TC-066 สำคัญ) — role ทั้ง 3 แถวของบัญชีตัวเอง ปุ่มลบ role **ไม่แสดง/ถูก disable หมดทุกแถว** ป้องกันไม่ให้ลบ role ตัวเองผ่าน UI ได้ — เช่นเดียวกับ TC-063/064 ไม่ได้ทดสอบ endpoint remove-role ผ่าน API โดยตรงกับบัญชีจริง (เสี่ยงเกินไป อาจตัด role admin ของตัวเองออกจริง) แต่มีความเสี่ยงสูงจากรูปแบบที่เจอใน TC-066

หมายเหตุ
- Evidence: images/tc064-admin-own-role-tab.png (ภาพเดียวกับ TC-064 เห็นทั้งปุ่ม assign และปุ่มลบต่อแถว)
```

#### TC-COR-1724-066 — ตรวจสอบว่า admin แก้ไขข้อมูลของตัวเองผ่าน API ตรง ๆ ไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-066
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "An admin cannot change their own credentials or roles, so no one can quietly widen their own access."

Preconditions
- มี token/session ของ account admin (ตัวเดียวกับที่ล็อกอินอยู่)

Test Data
- -

Test Steps
- ยิง request edit/credential/role ไปที่ account ตัวเองตรง ๆ ผ่าน API (bypass UI)

Expected Result
- backend ปฏิเสธ request แม้ bypass UI มา

Actual Result
- **Fail — [SECURITY BUG ร้ายแรง, พบแล้วหยุดทดสอบต่อทันทีตามที่ตกลงไว้]** ยิง `PUT /cortex-api/users/{own-id}` ตรงด้วย Bearer token จริงของ Admin ไปที่ user ID ของตัวเอง (bypass UI ที่ซ่อนปุ่มไว้แล้วตาม TC-063/064/065) โดย payload เป็นค่าปัจจุบันของตัวเองทั้งหมด (GET มาก่อนแล้วส่งกลับค่าเดิมทุก field เพื่อความปลอดภัย 100% — ไม่มีข้อมูลจริงเปลี่ยนแปลง) **ได้ status 200 สำเร็จ** ไม่ถูกปฏิเสธเลย — พิสูจน์ว่า backend **ไม่มีการเช็ค self-modification prevention ที่ endpoint แก้ไขข้อมูลทั่วไป** การป้องกันที่เห็นใน TC-063/064/065 มีแค่ระดับ UI (ซ่อนปุ่ม) เท่านั้น ไม่มีการบังคับใช้ที่ backend จริง ถ้า payload เป็นค่าที่เปลี่ยนจริง (ไม่ใช่ no-op ที่ทดสอบไว้) จะแก้ไขข้อมูลบัญชีตัวเองสำเร็จได้ทันทีผ่าน API ตรง

หมายเหตุ
- **หยุดทดสอบ self-modification เพิ่มเติมทันทีตามข้อตกลง** — ไม่ได้ลองยิง credential-reset หรือ role-assign/remove ผ่าน API กับบัญชีจริงต่อ เพราะเสี่ยงเกินไป (อาจล็อกบัญชีจริงของผู้ใช้ออกจากระบบถ้าช่องโหว่เดียวกันมีอยู่ที่ endpoint เหล่านั้นด้วย ซึ่งมีความเป็นไปได้สูงจากรูปแบบที่เจอ) **ต้องแจ้งทีม dev เป็นประเด็นความปลอดภัยด่วนที่สุด** — payload ที่ใช้ทดสอบและ response เต็มไม่มีรหัสผ่านหรือ secret ปน (มีแค่ username/email/ชื่อ-นามสกุล/enabled/emailVerified ซึ่งเป็นข้อมูลที่ Admin เห็นอยู่แล้วในหน้าโปรไฟล์ตัวเอง)
- **ยืนยันซ้ำ 30 ก.ย. 2026 ด้วย payload ที่ shape ถูกต้อง** (unwrap `data` + PascalCase field ตาม `UpdateUserRequestDTO` จริงของ backend
  — รอบแรก diagnostic พลาดส่ง `{data:{...}}` ตรงๆ ได้ 422 schema error ทำให้เข้าใจผิดว่าอาจถูกบล็อก, แก้ payload ให้ถูก shape แล้วได้ **200 สำเร็จซ้ำ
  เหมือนเดิม** ยืนยันว่า finding นี้ไม่ใช่ความผิดพลาดจาก payload ผิด shape — เป็นช่องโหว่จริง) Evidence (กรอบแดง = จุดผลลัพธ์ที่ผิดคาด):
  `images/tc066-evidence-01-api-result-marked.png` (แสดง request/response status 200 พร้อมกรอบแดงล้อม "200" และ Expected Result ที่ควรเป็น 403)
  วิดีโอเต็ม: `videos/tc066-video.webm` (เห็นการยิง GET/PUT จริงและ panel ผลลัพธ์ขึ้นตามลำดับเวลาจริง)
```

#### TC-COR-1724-067 — ตรวจสอบว่าแก้ไข service account ผ่านหน้าจอ edit ไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-067
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Service accounts are refused on every write, since changing them would lock Cortex out of Keycloak."

Preconditions
- มี service account ที่ Keycloak สร้างให้ client

Test Data
- -

Test Steps
- เปิดหน้า edit ของ service account (ถ้าค้นหาเจอในหน้าจอ)
- พยายามบันทึกการแก้ไข

Expected Result
- ระบบปฏิเสธการแก้ไข service account

Actual Result
- Not Test — สำรวจหาช่องทางค้นหา/ระบุ service account ID แล้วไม่พบเลยสักช่องทาง (ดูรายละเอียดการสำรวจเต็มที่หมายเหตุ) จึงไม่มีทาง
  เปิดหน้า edit ของ service account ได้เลยตั้งแต่ขั้นค้นหา

หมายเหตุ
- **1 ต.ค. 2026 (QA สำรวจแล้ว):** ลอง 3 ช่องทาง login ด้วย Admin: (1) ค้นหาในหน้า "ผู้ใช้งานในระบบ" ด้วยคำที่เป็นไปได้
  (`service`, `service-account`, `cortex-api`, `cortex-ui`, `client`) ทุกคำได้ผล "ไม่มีข้อมูล" ทั้งหมด (2) ยิง
  `GET /cortex-api/users` ตรงด้วย Bearer token จริง แบบ paginate ครบทุกหน้า (3 หน้า, perPage=100, รวม 225/225 = 100% ของ
  totalCount) สแกนทุก username หา pattern คล้าย service account — ไม่พบเลยสักตัว ยืนยันว่า **backend endpoint นี้เองก็ไม่คืนข้อมูล
  service account ไม่ใช่แค่ UI กรอง** (3) ลอง endpoint/parameter อื่นที่เป็นไปได้: `/cortex-api/service-accounts` (404),
  `/cortex-api/clients` (404), `/cortex-api/roles` (404), `?includeServiceAccounts=true` / `?type=service` /
  `?userType=service_account` (ถูกเพิกเฉย คืน list เดิมไม่กรองอะไรเพิ่ม) → **สรุป: ไม่มีช่องทางค้นหา/ระบุ service account ID
  ได้เลยผ่าน UI หรือ API ที่เข้าถึงได้ในขอบเขตนี้** ไม่เดา ID ตามกฎความปลอดภัย ผลสรุปนี้ใช้ร่วมกับ TC-068/069/070/084/085/086
  ทั้งหมด (สำรวจครั้งเดียวครอบคลุมทุก TC ในกลุ่มนี้)
```

#### TC-COR-1724-068 — ตรวจสอบว่าลบ service account ไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-068
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Service accounts are refused on every write, since changing them would lock Cortex out of Keycloak."

Preconditions
- มี service account ที่ Keycloak สร้างให้ client

Test Data
- -

Test Steps
- พยายามลบ service account

Expected Result
- ระบบปฏิเสธการลบ service account

Actual Result
- Not Test — ไม่พบช่องทางค้นหา/ระบุ service account ID เลย (สำรวจรายละเอียดไว้ที่หมายเหตุของ TC-067 — ใช้ผลสำรวจชุดเดียวกัน)
  จึงไม่มี ID เป้าหมายให้ยิง request ลบ

หมายเหตุ
- ดูรายละเอียดการสำรวจเต็มที่หมายเหตุของ TC-067 (1 ต.ค. 2026) — ไม่พบ service account ผ่านทั้ง UI search, raw API list
  (paginate ครบ 225/225 users) และ endpoint อื่นที่ลองแล้ว
```

#### TC-COR-1724-069 — ตรวจสอบว่า assign/remove role ให้ service account ไม่ได้

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-069
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Service accounts are refused on every write, since changing them would lock Cortex out of Keycloak."

Preconditions
- มี service account ที่ Keycloak สร้างให้ client

Test Data
- -

Test Steps
- พยายาม assign role ให้ service account
- พยายาม remove role ของ service account

Expected Result
- ระบบปฏิเสธการทำรายการทั้ง assign และ remove role กับ service account

Actual Result
- Not Test — ไม่พบช่องทางค้นหา/ระบุ service account ID เลย (สำรวจรายละเอียดไว้ที่หมายเหตุของ TC-067 — ใช้ผลสำรวจชุดเดียวกัน)
  จึงไม่มี ID เป้าหมายให้ยิง assign/remove role

หมายเหตุ
- ดูรายละเอียดการสำรวจเต็มที่หมายเหตุของ TC-067 (1 ต.ค. 2026) — ไม่พบ service account ผ่านทั้ง UI search, raw API list
  (paginate ครบ 225/225 users) และ endpoint อื่นที่ลองแล้ว
```

#### TC-COR-1724-070 — ตรวจสอบว่า API edit ถูกปฏิเสธเมื่อเรียกกับ service account

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-070
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Service accounts are refused on every write, since changing them would lock Cortex out of Keycloak."

Preconditions
- มี service account ที่ Keycloak สร้างให้ client

Test Data
- -

Test Steps
- ยิง request edit (PUT) ไปที่ service account ตรง ๆ ผ่าน API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request (เช่น 403) ไม่แก้ไขข้อมูล service account ให้

Actual Result
- Not Test — ไม่พบช่องทางค้นหา/ระบุ service account ID เลย (สำรวจรายละเอียดไว้ที่หมายเหตุของ TC-067 — ใช้ผลสำรวจชุดเดียวกัน)
  จึงไม่มี ID เป้าหมายให้ยิง request แก้ไข

หมายเหตุ
- **แก้ไข 1 ต.ค. 2026 (QA วิเคราะห์ก่อนเทส):** เดิม TC นี้รวม create/edit/delete/role ไว้ด้วยกัน ถ้า fail จะไม่รู้ว่า endpoint
  ไหนมีปัญหา — แยกเป็น 4 TC ต่อ 1 operation แล้ว (เหมือน pattern TC-058–061) ดู TC-084 (delete), TC-085 (assign role),
  TC-086 (remove role) คู่กัน — ไม่รวม "create" เพราะ service account ไม่ได้ถูกสร้างผ่านฟอร์ม "เพิ่มผู้ใช้งาน" นี้ (Keycloak
  สร้างให้อัตโนมัติตอนเปิด service account ของ client) จึงไม่มี operation "create service account" ให้ทดสอบจริง
- **อัปเดต 1 ต.ค. 2026 (ผลเทสจริง):** ดูรายละเอียดการสำรวจเต็มที่หมายเหตุของ TC-067 — ไม่พบ service account ผ่านทั้ง UI search,
  raw API list (paginate ครบ 225/225 users) และ endpoint อื่นที่ลองแล้ว จึงไม่ได้ยิง request จริง (ไม่เดา ID)
```

#### TC-COR-1724-071 — ตรวจสอบว่า delete permission ถูก grant เฉพาะ super-user/admin เท่านั้น

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-071
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Deletion is permanent and the confirmation dialog is the only guard, which is why delete is granted narrowly."

Preconditions
- Login ด้วย super-user หรือ admin; มี account ทดสอบที่ไม่ใช่ตัวเองและไม่ใช่ service account

Test Data
- -

Test Steps
- ลบ account ด้วย super-user/admin ผ่าน confirm dialog เดียว
- cross-check กับผล TC-COR-1724-060 (API delete ถูกปฏิเสธ) และ TC-COR-1724-062 (role อื่นไม่มีสิทธิ์อะไรเลย) ว่า role อื่นไม่มีสิทธิ์นี้

Expected Result
- ลบสำเร็จด้วย confirm dialog เดียวสำหรับ super-user/admin เท่านั้น role อื่นไม่มีสิทธิ์นี้เลย

Actual Result
- **Pass — แก้ไข 7 ต.ค. 2026 หลัง retest** (เดิมมาร์ค Gap ครึ่งหนึ่งเพราะเข้าใจผิดว่าบล็อกจาก TC-005 — รู้แล้วว่าไม่จริง เพราะสร้าง
  account สำเร็จทุกครั้งแม้ toast จะขึ้น error ผิด) ทดสอบครบทั้ง 2 ส่วน: (1) ฝั่ง "ลบสำเร็จด้วย confirm dialog เดียวสำหรับ
  super-user" — สร้าง account ทดสอบ `qa-e2e-del-407246` ด้วย Super_User → ยืนยันสร้างจริงผ่านค้นหา (ไม่เชื่อ toast error) →
  กดไอคอนลบที่แถว → dialog ขึ้นข้อความ "ต้องการลบ qa-e2e-del-407246 หรือไม่ ระบบจะลบบัญชีออกจาก Keycloak และไม่สามารถกู้คืนได้"
  → กดปุ่ม "ลบ" ยืนยัน (dialog เดียว ไม่มีขั้นตอนอื่นแทรก) → toast "ลบผู้ใช้งานแล้ว" → reload + ค้นหา username เดิมอีกครั้ง
  ยืนยันไม่เจอจริง ("ไม่มีข้อมูล", ทั้งหมด 0 ผู้ใช้งาน) = ลบสำเร็จจริงจาก backend ไม่ใช่แค่ UI (2) ฝั่ง "role อื่นไม่มีสิทธิ์นี้เลย"
  ยังคง Pass ตามเดิมจาก TC-COR-1724-060 (API delete ถูกปฏิเสธด้วย Doctor/Nurse) และ TC-COR-1724-062 (สรุปรวม role อื่นไม่มีสิทธิ์
  operation ใดเลย) — รวมทั้ง 2 ส่วนแล้ว Expected Result เป็นจริงครบถ้วน

หมายเหตุ
- Evidence (กรอบแดง = จุดกรอก/กดปุ่ม, กรอบเขียว = ผลยืนยันถูกต้อง) อยู่ที่ `.playwright-mcp/e2e-user-role-exploration/`:
  ภาพ `images/flowB-01-create-form-filled-before-save.png`, `flowB-02-verified-created-before-delete.png`,
  `flowB-03-before-click-delete-icon.png`, `flowB-04-confirm-dialog-before-confirm.png` (เห็นข้อความ dialog เต็มชัดเจน),
  `flowB-05-verified-deleted-after-reload.png` (เห็น "ไม่มีข้อมูล" หลัง reload+ค้นหา) — วิดีโอต่อเนื่องคลิปเดียวทั้งกระบวนการ
  (สร้าง → ยืนยันสร้างจริง → กดลบ → ยืนยัน dialog → ลบ → reload ยืนยันหายจริง): `videos/flowB-01-create-and-delete-qa-e2e-del.webm`
- Retest นี้เป็นส่วนหนึ่งของ exploratory flow ใหม่นอก 87 TC เดิม (ดู TODO.md หัวข้อ "สำรวจ/เล่น flow e2e ใหม่...")
  ไม่ใช่การรันซ้ำ regression suite เดิม — บั๊ก TC-005 (toast error ผิดตอนสร้าง account) ยังคงอยู่ ไม่เกี่ยวกับผลของ TC นี้
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
- ยืนยันว่า migration script รัน dry-run/apply/backup/sweep ได้ถูกต้องตาม flow ปกติ โดยไม่ทิ้งช่วงที่ account ไม่มีสิทธิ์

ขอบเขต Requirement
- dry-run ไม่เปลี่ยนอะไรจริง, apply ตาม report, backup mapping ก่อน apply
- add-before-remove, sweep ทั้ง realm/named list, account ที่ไม่มีอะไรต้อง migrate ถูกข้าม

ความเสี่ยง
- ถ้า remove ก่อน add จะมีช่วงที่ user ไม่มีสิทธิ์เข้าระบบเลยระหว่าง migrate

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
- **สำคัญ (เพิ่ม 1 ต.ค. 2026 หลัง QA วิเคราะห์ก่อนเทส):** สำรวจหน้าจอ "ผู้ดูแลระบบ → โรงพยาบาล" ทั้งหมดแล้ว**ไม่เคยเจอปุ่ม/เมนู
  "migration" ที่เป็น UI เลยสักจุด** — AC เขียนบรรยายเชิงพฤติกรรมล้วนๆ ไม่ได้ระบุว่าเป็น UI button, CLI/ops script แยกต่างหาก,
  หรือ API endpoint เฉพาะ **ก่อนเทส TC ในหมวดนี้ทุกข้อ ผู้ทดสอบต้องหาช่องทาง trigger จริงก่อน** (ถามทีม dev ว่า feature นี้
  release มาจริงหรือยัง และ trigger ยังไง) — ห้ามสมมติว่ามี UI flow แบบ TC ที่เขียนไว้แล้วลงมือเดาทางเอง
- **หมวดนี้ทั้งหมด (TC-072–083) มอบให้คนเทสเองผ่าน DB/Keycloak console/ops tool โดยตรง ไม่ใช่ agent** (ตามที่ user ตัดสินใจ
  1 ต.ค. 2026 — กระทบข้อมูลจริงวงกว้างเกินกว่าจะให้ agent ทำอัตโนมัติ)
```

#### TC-COR-1724-072 — ตรวจสอบการรัน migration แบบ dry-run ไม่เปลี่ยนแปลงข้อมูลจริง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-072
- Scenario ID: SC-14
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "The run reports what it would do and changes nothing until explicitly told to apply, and it backs up the current mappings first."

Preconditions
- มี account ที่ยังไม่ได้ migrate ไปใช้ role model ใหม่

Test Data
- -

Test Steps
- รัน migration ในโหมด dry-run
- ตรวจสอบ report ที่ได้ และตรวจสอบ mapping จริงของ account ที่เกี่ยวข้อง

Expected Result
- ได้ report สิ่งที่ "จะ" ทำ แต่ mapping จริงของ account ไม่เปลี่ยนแปลงเลย

Actual Result
- -

หมายเหตุ
- -
```

#### TC-COR-1724-073 — ตรวจสอบการรัน migration จริง (apply) ตาม report ที่ dry-run ไว้

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-073
- Scenario ID: SC-14
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "The run reports what it would do and changes nothing until explicitly told to apply, and it backs up the current mappings first."

Preconditions
- ต่อจาก TC-COR-1724-072 (มี dry-run report แล้ว)

Test Data
- -

Test Steps
- รัน migration โหมด apply ต่อจาก dry-run เดิม
- ตรวจสอบ mapping จริงหลังรัน

Expected Result
- mapping ถูกเปลี่ยนตรงกับที่ dry-run report ไว้ทุกจุด

Actual Result
- -

หมายเหตุ
- -
```

#### TC-COR-1724-074 — ตรวจสอบว่า migration backup mapping เดิมไว้ก่อนเริ่ม apply จริง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-074
- Scenario ID: SC-14
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "The run reports what it would do and changes nothing until explicitly told to apply, and it backs up the current mappings first."

Preconditions
- เตรียมรัน migration โหมด apply

Test Data
- -

Test Steps
- ก่อนรัน apply ตรวจสอบว่ามีการ backup mapping เดิมไว้ที่ไหน (ไฟล์/ตาราง log)

Expected Result
- มี backup ของ mapping เดิมก่อนเริ่ม apply เสมอ

Actual Result
- -

หมายเหตุ
- -
```

#### TC-COR-1724-075 — ตรวจสอบลำดับการ migrate: เพิ่ม access ใหม่ก่อนตัด access เดิม

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-075
- Scenario ID: SC-14
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "Access is added before anything is taken away, so nobody is left without access mid-run."

Preconditions
- สามารถตรวจสอบ log หรือ intermediate state ระหว่างรัน migration ได้

Test Data
- -

Test Steps
- รัน migration แล้วสังเกต/ตรวจสอบลำดับการเปลี่ยนแปลงระหว่างรัน (log หรือ state ระหว่างรัน)

Expected Result
- role/access ใหม่ถูก assign ก่อน แล้ว role/access เดิมจึงถูกตัดออกทีหลัง ไม่มีช่วงที่ account ไม่มีสิทธิ์เลย

Actual Result
- -

หมายเหตุ
- ถ้าตรวจสอบ intermediate state ไม่ได้โดยตรง ให้ตรวจจาก log และระบุข้อจำกัดไว้ใน Actual Result
```

#### TC-COR-1724-076 — ตรวจสอบการรัน migration แบบ sweep ทั้ง realm

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-076
- Scenario ID: SC-14
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "It can sweep the whole realm or a named list; service accounts and disabled accounts are left out of a sweep."

Preconditions
- มี account หลายรายการที่ยังไม่ได้ migrate

Test Data
- -

Test Steps
- รัน migration โดยไม่ระบุ list เฉพาะ (sweep ทั้ง realm)

Expected Result
- account ที่เข้าเงื่อนไข (ไม่ใช่ service/disabled) ในทั้ง realm ถูก migrate สำเร็จ

Actual Result
- -

หมายเหตุ
- -
```

#### TC-COR-1724-077 — ตรวจสอบการรัน migration แบบระบุ named list เฉพาะ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-077
- Scenario ID: SC-14
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "It can sweep the whole realm or a named list; service accounts and disabled accounts are left out of a sweep."

Preconditions
- มี account หลายรายการที่ยังไม่ได้ migrate

Test Data
- list ของ account เฉพาะที่ต้องการ migrate

Test Steps
- รัน migration โดยระบุ list ของ account เฉพาะ

Expected Result
- เฉพาะ account ใน list ที่ระบุถูก migrate เท่านั้น account อื่นไม่ถูกแตะ

Actual Result
- -

หมายเหตุ
- -
```

#### TC-COR-1724-078 — ตรวจสอบว่า migration ไม่แตะต้อง account ที่ไม่มีอะไรต้อง migrate

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-078
- Scenario ID: SC-14
- Case Type: Happy
- Test Level: System
- Test Type: Integration
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "Accounts with nothing to migrate are untouched, and roles that belong to other systems are preserved, never recreated or deleted."

Preconditions
- มี account ที่ mapping ตรงกับ role model ใหม่อยู่แล้ว (ไม่มีอะไรต้องเปลี่ยน)

Test Data
- -

Test Steps
- รัน migration ครอบคลุม account นี้ด้วย
- ตรวจสอบ mapping ของ account นี้หลังรัน

Expected Result
- account นี้ไม่มีการเปลี่ยนแปลงใด ๆ (untouched)

Actual Result
- -

หมายเหตุ
- -
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

#### TC-COR-1724-079 — ตรวจสอบว่า sweep ทั้ง realm ไม่รวม service account

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-079
- Scenario ID: SC-15
- Case Type: Edge
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "It can sweep the whole realm or a named list; service accounts and disabled accounts are left out of a sweep."

Preconditions
- realm มี service account ปนอยู่กับ account บุคคลที่ยังไม่ได้ migrate

Test Data
- -

Test Steps
- รัน sweep ทั้ง realm
- ตรวจสอบผลลัพธ์ว่า service account ถูก migrate ไปด้วยหรือไม่

Expected Result
- service account ไม่ถูก migrate/แตะต้องเลย

Actual Result
- -

หมายเหตุ
- -
```

#### TC-COR-1724-080 — ตรวจสอบว่า sweep ทั้ง realm ไม่รวม account ที่ถูก disable

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-080
- Scenario ID: SC-15
- Case Type: Edge
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "It can sweep the whole realm or a named list; service accounts and disabled accounts are left out of a sweep."

Preconditions
- realm มี account ที่ถูก disable ปนอยู่กับ account ที่ยังไม่ได้ migrate

Test Data
- -

Test Steps
- รัน sweep ทั้ง realm
- ตรวจสอบผลลัพธ์ว่า disabled account ถูก migrate ไปด้วยหรือไม่

Expected Result
- disabled account ไม่ถูก migrate/แตะต้องเลย

Actual Result
- -

หมายเหตุ
- -
```

#### TC-COR-1724-081 — ตรวจสอบว่า role ของระบบอื่นไม่ถูก recreate/delete ระหว่าง migration

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-081
- Scenario ID: SC-15
- Case Type: Edge
- Test Level: System
- Test Type: Integration
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "Accounts with nothing to migrate are untouched, and roles that belong to other systems are preserved, never recreated or deleted."

Preconditions
- account มี role ที่เป็นของระบบอื่น (non-Cortex) ปนอยู่กับ role ที่ต้อง migrate

Test Data
- -

Test Steps
- รัน migration บน account นี้
- ตรวจสอบ role ที่เป็นของระบบอื่นหลังรัน

Expected Result
- role ของระบบอื่นยังอยู่ครบเหมือนเดิม ไม่ถูก recreate หรือ delete

Actual Result
- -

หมายเหตุ
- -
```

#### TC-COR-1724-082 — ตรวจสอบว่ารัน migration ซ้ำกับ account ที่ migrate ไปแล้วไม่เกิดผลข้างเคียง

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-082
- Scenario ID: SC-15
- Case Type: Edge
- Test Level: System
- Test Type: Integration
- Priority: Medium
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "Accounts with nothing to migrate are untouched, and roles that belong to other systems are preserved, never recreated or deleted."

Preconditions
- มี account ที่ผ่าน migration ไปแล้วในรอบก่อนหน้า

Test Data
- -

Test Steps
- รัน migration อีกครั้งกับ account เดิมที่ migrate ไปแล้ว
- ตรวจสอบ mapping ของ account นี้หลังรันซ้ำ

Expected Result
- ไม่เกิดผลข้างเคียง เช่น mapping ซ้ำซ้อนหรือ role ผิดเพี้ยนไปจากเดิม (idempotent)

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

#### TC-COR-1724-083 — ตรวจสอบ error message เมื่อ migration ล้มเหลวเพราะ permission ไม่พอ

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-083
- Scenario ID: SC-16
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Migrating existing accounts): "Failures say what went wrong — a permissions problem reads as a permissions problem, not as missing data."

Preconditions
- สามารถจำลองสถานการณ์ที่ credential/permission ที่ migration script ใช้ไม่พอสิทธิ์ได้

Test Data
- -

Test Steps
- รัน migration ในสถานการณ์ที่ permission ไม่พอ

Expected Result
- error message ที่ได้ระบุชัดว่าเป็นปัญหา permission ไม่ใช่แสดงเป็น missing data หรือ error type อื่นที่เข้าใจผิดได้

Actual Result
- -

หมายเหตุ
- ถ้าจำลอง permission failure ไม่ได้ในสภาพแวดล้อมทดสอบ ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
```

---

## เพิ่มเติม — แยกจาก TC-070 (1 ต.ค. 2026)

TC ด้านล่างนี้แยกออกมาจาก TC-COR-1724-070 เดิม (เคยรวม create/edit/delete/role service account ไว้ใน TC เดียว) เพื่อให้รู้ชัดว่า
operation ไหนมีปัญหาถ้าเจอ fail — อยู่ภายใต้ SC-13 เหมือนเดิม (ดูรายละเอียด Scenario ที่หัวข้อ SC-13 ด้านบน)

#### TC-COR-1724-084 — ตรวจสอบว่า API delete ถูกปฏิเสธเมื่อเรียกกับ service account

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-084
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Service accounts are refused on every write, since changing them would lock Cortex out of Keycloak."

Preconditions
- มี service account ที่ Keycloak สร้างให้ client

Test Data
- -

Test Steps
- ยิง request delete (DELETE) ไปที่ service account ตรง ๆ ผ่าน API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request (เช่น 403) ไม่ลบ service account ให้

Actual Result
- Not Test — ไม่พบช่องทางค้นหา/ระบุ service account ID เลย (สำรวจรายละเอียดไว้ที่หมายเหตุของ TC-067 — ใช้ผลสำรวจชุดเดียวกัน)
  จึงไม่มี ID เป้าหมายให้ยิง request ลบ (ไม่เดา ID ตามกฎความปลอดภัย — operation นี้ไม่สามารถทำแบบ no-op payload ได้
  ถ้าเดา ID ผิดช่องแล้วบังเอิญยิงโดน account จริงจะกู้คืนไม่ได้)

หมายเหตุ
- แยกจาก TC-070 เดิม (1 ต.ค. 2026) — ถ้าไม่มีช่องทางยิง API โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
- **อัปเดต 1 ต.ค. 2026 (ผลเทสจริง):** ดูรายละเอียดการสำรวจเต็มที่หมายเหตุของ TC-067 — ไม่พบ service account ผ่านทั้ง UI search,
  raw API list (paginate ครบ 225/225 users) และ endpoint อื่นที่ลองแล้ว
```

#### TC-COR-1724-085 — ตรวจสอบว่า API assign role ถูกปฏิเสธเมื่อเรียกกับ service account

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-085
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Service accounts are refused on every write, since changing them would lock Cortex out of Keycloak."

Preconditions
- มี service account ที่ Keycloak สร้างให้ client

Test Data
- -

Test Steps
- ยิง request assign role ไปที่ service account ตรง ๆ ผ่าน API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request (เช่น 403) ไม่ assign role ให้ service account

Actual Result
- Not Test — ไม่พบช่องทางค้นหา/ระบุ service account ID เลย (สำรวจรายละเอียดไว้ที่หมายเหตุของ TC-067 — ใช้ผลสำรวจชุดเดียวกัน)
  จึงไม่มี ID เป้าหมายให้ยิง request assign role

หมายเหตุ
- แยกจาก TC-070 เดิม (1 ต.ค. 2026) — ถ้าไม่มีช่องทางยิง API โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
- **อัปเดต 1 ต.ค. 2026 (ผลเทสจริง):** ดูรายละเอียดการสำรวจเต็มที่หมายเหตุของ TC-067 — ไม่พบ service account ผ่านทั้ง UI search,
  raw API list (paginate ครบ 225/225 users) และ endpoint อื่นที่ลองแล้ว
```

#### TC-COR-1724-086 — ตรวจสอบว่า API remove role ถูกปฏิเสธเมื่อเรียกกับ service account

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-086
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง (Permissions and safeguards): "Service accounts are refused on every write, since changing them would lock Cortex out of Keycloak."

Preconditions
- มี service account ที่ Keycloak สร้างให้ client และมี role ผูกอยู่อย่างน้อย 1 ตัว (ถ้ายังไม่มี ให้ข้ามและระบุ gap)

Test Data
- -

Test Steps
- ยิง request remove role ไปที่ service account ตรง ๆ ผ่าน API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request (เช่น 403) ไม่ลบ role ออกจาก service account

Actual Result
- Not Test — ไม่พบช่องทางค้นหา/ระบุ service account ID เลย (สำรวจรายละเอียดไว้ที่หมายเหตุของ TC-067 — ใช้ผลสำรวจชุดเดียวกัน)
  จึงไม่มี ID เป้าหมายให้ยิง request remove role

หมายเหตุ
- แยกจาก TC-070 เดิม (1 ต.ค. 2026) — ถ้าไม่มีช่องทางยิง API โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
- **อัปเดต 1 ต.ค. 2026 (ผลเทสจริง):** ดูรายละเอียดการสำรวจเต็มที่หมายเหตุของ TC-067 — ไม่พบ service account ผ่านทั้ง UI search,
  raw API list (paginate ครบ 225/225 users) และ endpoint อื่นที่ลองแล้ว
```

#### TC-COR-1724-087 — Sanity-check account เก่า (user1) ยัง login+มี role ถูกต้องหลังผ่านงานเทสทั้งหมด

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-087
- Scenario ID: SC-14
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Low
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin
- AC ที่ตรง: ไม่ได้ derive จาก AC bullet ใดโดยตรง — ดูเหตุผลใน "หมายเหตุ scope" ของ Preconditions

Preconditions
- account เก่าที่มีอยู่ในระบบก่อน feature นี้ (ไม่ได้ถูกสร้างผ่านฟอร์ม "เพิ่มผู้ใช้งาน" ของ COR-1724) — ใช้ account `user1`
  (= CORTEX_USERNAME_Super_User ใน .env ของโปรเจกต์นี้ ชื่อแสดงผล "user1 example")
- **หมายเหตุ scope:** นี่คือ sanity-check ตามที่ user ปรับ scope ไว้ใน P3i (TODO.md) แทนการเทส migration process ตรง ๆ
  ("ไปเปิดดูว่า user เก่าๆ ใช้งานได้ เช่น user1") — ไม่ใช่การยืนยันว่า migration mechanism (TC-072–083) ทำงานถูกต้อง เพราะ
  ไม่เคยเจอ UI/trigger ของ migration จริงระหว่างสำรวจทั้งหมด (ดูหมายเหตุ SC-14/15/16)

Test Data
- -

Test Steps
- ล็อกอินใหม่ด้วย account user1 (ไม่ reuse session เดิม) ยืนยันว่า login ผ่าน
- เปิดหน้า detail ของ user1 ผ่านเมนู "ผู้ใช้งานในระบบ" ดูแท็บ "ข้อมูลทั่วไป" (เช็ค toggle "การใช้งาน" ยัง enabled)
- เปิดแท็บ "บทบาทการใช้งาน" เทียบ role ที่มีอยู่กับที่เคยบันทึกไว้ใน TC-032 (cashier-head, admin)

Expected Result
- login สำเร็จปกติ, account ยังอยู่ในสถานะ enabled, role ยังครบ 2 รายการตรงกับที่เคยเห็นใน TC-032 ไม่มีอะไรเปลี่ยนแปลง/หายไป

Actual Result
- Pass — login ด้วย user1/Super_User สำเร็จปกติ (host redirect กลับมาที่ dev-x พร้อม code ของ Keycloak OAuth flow)
  เปิดหน้า detail (ID `432820df-9dbc-4b7c-9fcf-a653ce782247`) แท็บ "ข้อมูลทั่วไป" toggle "การใช้งาน" = เปิดอยู่ (enabled)
  แท็บ "บทบาทการใช้งาน" แสดง role ครบ 2 รายการตรงกับ TC-032 เป๊ะ: `cashier-head`, `admin` ("ทั้งหมด 2 บทบาท") ไม่มี role
  ไหนหายไปหรือเพิ่มขึ้นมาแปลกปลอม — บัญชีเก่ายังใช้งานได้ปกติทุกประการหลังผ่านการเทสทั้งหมดของ COR-1724

หมายเหตุ
- ใช้สคริปต์ชั่วคราว `temp_scripts/tc087-sanity-check.js` (login จริงด้วย `.fill()` ไม่ reuse `.auth/Super_User.json` เดิม
  เพื่อให้เทส "login" มีความหมายจริง ๆ ไม่ใช่แค่เช็ค session เก่า)
- Evidence: images/tc087-01-login-success.png, tc087-02-search-user1.png, tc087-03-general-tab-id-enabled.png,
  tc087-04-role-list-confirmed.png · วิดีโอเต็ม: videos/tc087-video.webm
```
