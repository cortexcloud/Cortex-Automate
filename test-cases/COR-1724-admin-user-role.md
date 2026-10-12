# COR-1724 — [Admin] User, Role in keycloak -> Admin — Test Coverage

- Requirement: https://linear.app/cortexcloud/issue/COR-1724/admin-user-role-in-keycloak-admin
- สร้างจาก Acceptance Criteria ของการ์ดโดยตรง ตาม skill `linear-testcase-writer`
- สถานะไฟล์นี้: **draft เก็บไว้ในโปรเจกต์ก่อน ยังไม่สร้างจริงใน Linear**
- Workflow: เขียน TC ไว้ที่นี่ → ผู้ใช้ run เคสเองด้วยมือบนเว็บ → อัปเดตช่อง "Actual Result" ของแต่ละ TC ด้านล่างตามผลจริง → เมื่อได้ผลครบแล้วและ **ได้รับอนุญาตจากผู้ใช้ชัดเจน** ค่อยนำไปสร้าง EXE/Scenario/Test Case จริงบน Linear
- รวม: 1 EXE, 16 Scenario, 83 Test Case

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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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

Preconditions
- ต่อจาก TC-COR-1724-005 (มี account ที่เพิ่งสร้าง)

Test Data
- -

Test Steps
- กดปุ่ม show/reveal password

Expected Result
- temporary password แสดงเป็น plain text ให้เห็น

Actual Result
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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

Preconditions
- ต่อจาก TC-COR-1724-014

Test Data
- -

Test Steps
- สังเกต list รายการ account หลังลบสำเร็จ

Expected Result
- list อัปเดตอัตโนมัติ ไม่แสดง account ที่เพิ่งลบอีกต่อไป โดยไม่ต้อง manual refresh

Actual Result
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- ถ้าไม่มีสิทธิ์เข้าถึง backend/DB โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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

Preconditions
- -

Test Data
- keyword ที่ไม่มี account ตรงเงื่อนไขอยู่จริง

Test Steps
- พิมพ์ keyword ที่ไม่มีอยู่จริงในระบบแล้ว search

Expected Result
- แสดงผลลัพธ์ว่างเปล่าอย่างถูกต้อง (empty state) ไม่ error

Actual Result
- -

หมายเหตุ
- -
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

Preconditions
- อยู่หน้าท้าย ๆ ของ list (ไม่ใช่หน้าแรก)

Test Data
- -

Test Steps
- เปลี่ยน page size ให้เล็กลง/ใหญ่ขึ้น ขณะอยู่หน้าท้าย ๆ

Expected Result
- ระบบคำนวณหน้าปัจจุบันใหม่ให้สอดคล้องกับ page size ใหม่ ไม่ error ไม่ค้างที่หน้าที่ไม่มีข้อมูล

Actual Result
- -

หมายเหตุ
- -
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

Preconditions
- -

Test Data
- URL ที่ page param เป็นเลขเกินจำนวนหน้าที่มีจริง

Test Steps
- แก้ URL ให้ page param เกินจำนวนหน้าจริงแล้วเปิด link

Expected Result
- ระบบจัดการอย่างเหมาะสม (เช่น empty state หรือ fallback หน้าสุดท้าย) ไม่ crash/error

Actual Result
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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

Preconditions
- ต่อจาก TC-COR-1724-022

Test Data
- -

Test Steps
- ดูหน้า credential list เดียวกับ TC-COR-1724-022

Expected Result
- แต่ละ credential แสดงวันที่สร้าง (created date) ถูกต้อง

Actual Result
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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

Preconditions
- account มี role อยู่แล้วอย่างน้อย 1 ตัว

Test Data
- -

Test Steps
- เปิดหน้า assign role

Expected Result
- role ที่ account มีอยู่แล้วไม่ปรากฏในรายการให้เลือก assign ซ้ำ

Actual Result
- -

หมายเหตุ
- -
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

Preconditions
- อยู่ที่หน้า assign role

Test Data
- keyword ที่ตรงกับ role บางส่วน

Test Steps
- พิมพ์ keyword ในช่องค้นหา role

Expected Result
- แสดงเฉพาะ role ที่ตรงกับ keyword

Actual Result
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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

Preconditions
- ต้องมีช่องทางทดสอบระดับ API (เรียก endpoint assign role ตรง ๆ ได้)

Test Data
- payload assign role: role name ที่ถูกต้อง 1 ตัว + role name ที่ไม่มีอยู่จริง 1 ตัว

Test Steps
- ยิง request assign role ด้วย payload ที่มี role ถูกต้องปนกับ role ที่ไม่มีจริง

Expected Result
- ทั้ง request fail ทั้งชุด ไม่มี role ไหนถูก apply แม้แต่ตัวที่ถูกต้อง (ไม่ partial-apply)

Actual Result
- -

หมายเหตุ
- ถ้าไม่มีช่องทางยิง API โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
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

Preconditions
- account มี role อยู่แล้วอย่างน้อย 1 ตัว

Test Data
- role ที่ account ถืออยู่แล้ว

Test Steps
- ยิง request assign role ตัวที่ account มีอยู่แล้วซ้ำอีกครั้ง (ผ่าน API ถ้า UI กรองออกไปแล้ว)

Expected Result
- ไม่มีการเปลี่ยนแปลงใด ๆ เกิดขึ้นกับ role ของ account

Actual Result
- -

หมายเหตุ
- -
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

Preconditions
- ต่อจาก TC-COR-1724-042

Test Data
- -

Test Steps
- ตรวจสอบ response/log ของ request ใน TC-COR-1724-042

Expected Result
- ระบบตอบกลับ/บันทึกว่าเป็นการดำเนินการที่ไม่มีผล (no-op) ไม่ใช่แสดงเป็น error ปลอม หรือรายงานว่า assign สำเร็จทั้งที่ไม่มีอะไรเปลี่ยน

Actual Result
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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

Preconditions
- มี client ใน Keycloak ที่เปิดใช้งาน service account

Test Data
- -

Test Steps
- ตรวจสอบสิทธิ์ baseline (FHIR/PostgREST/EHRbase) ของ service account นั้น

Expected Result
- service account ไม่ได้รับ baseline access ที่ให้เฉพาะ "คน"

Actual Result
- -

หมายเหตุ
- -
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

Preconditions
- มี environment ที่ seed ใหม่ (fresh) ตาม process การ deploy

Test Data
- -

Test Steps
- ตรวจสอบ realm/role/client scope ที่เกี่ยวกับ baseline access หลัง seed เสร็จ โดยไม่มีการตั้งค่ามือเพิ่มเติม

Expected Result
- baseline access (FHIR/PostgREST/EHRbase) พร้อมใช้งานตั้งแต่ seed เสร็จ โดยไม่ต้องพึ่ง realm ที่ทำมือ

Actual Result
- -

หมายเหตุ
- ต้องมี environment ใหม่ให้ทดสอบจริง ถ้าไม่มีให้ระบุ gap ไว้ใน Actual Result
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

Preconditions
- สามารถจำลองสถานการณ์ baseline grant ล้มเหลวได้ (เช่น service ที่ grant สิทธิ์ down หรือ mock failure)

Test Data
- -

Test Steps
- สร้าง account บุคคลใหม่ในสถานการณ์ที่ baseline grant จะ fail

Expected Result
- account ยังถูกสร้างสำเร็จ ไม่ rollback การสร้าง account ทั้งหมดเพราะ baseline grant fail

Actual Result
- -

หมายเหตุ
- ถ้าจำลอง failure ไม่ได้ในสภาพแวดล้อมทดสอบ ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
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

Preconditions
- ต่อจาก TC-COR-1724-050

Test Data
- -

Test Steps
- ตรวจสอบผลลัพธ์/สถานะที่แสดงหลังสร้าง account ใน TC-COR-1724-050

Expected Result
- ระบบระบุ/บันทึกว่า baseline access ส่วนที่ fail คือ gap ที่ต้องตามแก้ ไม่รายงานว่า "สร้างสำเร็จสมบูรณ์" ทั้งที่ยังขาด baseline

Actual Result
- -

หมายเหตุ
- -
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

Preconditions
- Login ด้วย account role Super_User (ตาม .env ของโปรเจกต์)

Test Data
- -

Test Steps
- เปิดเมนู/หน้าจอ user management ทั้งหมด

Expected Result
- เห็นปุ่ม/control ครบ view, create, edit, delete

Actual Result
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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

Preconditions
- Login ด้วย role ที่ไม่มีสิทธิ์ `menu:setting:user-management`

Test Data
- URL ตรง: `/cortex/setting/admin/user-management`

Test Steps
- พิมพ์/เปิด URL ของหน้า user-management ตรง ๆ โดยไม่ผ่านเมนู

Expected Result
- ถูกกันไม่ให้เข้าหน้าจอนี้ (redirect หรือแสดงหน้า access-denied) ไม่ใช่เข้าเห็นข้อมูลได้ทั้งที่เมนูถูกซ่อน

Actual Result
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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

Preconditions
- Login ด้วย role ที่ไม่มีสิทธิ์ (Doctor/Nurse)

Test Data
- URL ตรง: `/cortex/setting/admin/role-management`

Test Steps
- พิมพ์/เปิด URL ของหน้า role-management ตรง ๆ โดยไม่ผ่านเมนู

Expected Result
- ถูกกันไม่ให้เข้าหน้าจอนี้ (redirect หรือแสดงหน้า access-denied)

Actual Result
- -

หมายเหตุ
- -
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

Preconditions
- มี token/session ของ role ที่ไม่มีสิทธิ์ `menu:setting:user-management`

Test Data
- -

Test Steps
- ยิง request create account ตรงไปที่ API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request (เช่น 403) ไม่สร้าง account ให้

Actual Result
- -

หมายเหตุ
- ถ้าไม่มีช่องทางยิง API โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
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

Preconditions
- มี token/session ของ role ที่ไม่มีสิทธิ์ `menu:setting:user-management`

Test Data
- -

Test Steps
- ยิง request edit account ตรงไปที่ API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request (เช่น 403) ไม่แก้ไข account ให้

Actual Result
- -

หมายเหตุ
- ถ้าไม่มีช่องทางยิง API โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
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

Preconditions
- มี token/session ของ role ที่ไม่มีสิทธิ์ `menu:setting:user-management`

Test Data
- -

Test Steps
- ยิง request delete account ตรงไปที่ API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request (เช่น 403) ไม่ลบ account ให้

Actual Result
- -

หมายเหตุ
- ถ้าไม่มีช่องทางยิง API โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
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

Preconditions
- มี token/session ของ role ที่ไม่มีสิทธิ์ `menu:setting:user-management`

Test Data
- -

Test Steps
- ยิง request assign role และ remove role ตรงไปที่ API โดยไม่ผ่าน UI

Expected Result
- backend ปฏิเสธ request ทั้ง assign และ remove (เช่น 403) ไม่เปลี่ยน role ของ account เป้าหมาย

Actual Result
- -

หมายเหตุ
- ถ้าไม่มีช่องทางยิง API โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
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

Preconditions
- Login ด้วย role อื่นที่ไม่ใช่ super-user/admin (เช่น Doctor/Nurse ตาม .env)

Test Data
- -

Test Steps
- ตรวจสอบทุก operation (view/create/edit/delete) ทั้งฝั่ง UI และ API

Expected Result
- ไม่มี operation ไหนที่ role นี้ทำได้เลยแม้แต่อย่างเดียว

Actual Result
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
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

Preconditions
- มี token/session ของ account admin (ตัวเดียวกับที่ล็อกอินอยู่)

Test Data
- -

Test Steps
- ยิง request edit/credential/role ไปที่ account ตัวเองตรง ๆ ผ่าน API (bypass UI)

Expected Result
- backend ปฏิเสธ request แม้ bypass UI มา

Actual Result
- -

หมายเหตุ
- ถ้าไม่มีช่องทางยิง API โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
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
- -

หมายเหตุ
- -
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

Preconditions
- มี service account ที่ Keycloak สร้างให้ client

Test Data
- -

Test Steps
- พยายามลบ service account

Expected Result
- ระบบปฏิเสธการลบ service account

Actual Result
- -

หมายเหตุ
- -
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
- -

หมายเหตุ
- -
```

#### TC-COR-1724-070 — ตรวจสอบว่า API write ทุก endpoint ปฏิเสธ service account

```
ข้อมูลอ้างอิง
- TC ID: TC-COR-1724-070
- Scenario ID: SC-13
- Case Type: Error
- Test Level: System
- Test Type: Security
- Priority: High
- Requirement ที่อ้างอิง: COR-1724 - [Admin] User, Role in keycloak -> Admin

Preconditions
- มี service account ที่ Keycloak สร้างให้ client

Test Data
- -

Test Steps
- ยิง request create/edit/delete/role ไปที่ service account ตรง ๆ ผ่าน API ทีละ endpoint

Expected Result
- ทุก endpoint ปฏิเสธ request สำหรับ service account เหมือนกันหมด

Actual Result
- -

หมายเหตุ
- ถ้าไม่มีช่องทางยิง API โดยตรง ให้ระบุ gap ไว้ใน Actual Result แทนการข้าม
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
- -

หมายเหตุ
- -
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
