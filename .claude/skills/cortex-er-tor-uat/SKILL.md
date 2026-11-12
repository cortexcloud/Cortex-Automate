---
name: cortex-er-tor-uat
description: ข้อมูลและขั้นตอนเล่น Scenario UAT ห้องฉุกเฉิน (ER) ของ รพ.สระบุรี ตามชีตส่งมอบใน SharePoint "New file Test case OPD #2.xlsx" — ชีต "ER Scenario Map" (Map ข้อ TOR 4.9.8 จำนวน 39 ข้อ กับ UAT-ER-01 ถึง 14 พร้อมคอมเมนต์ QA) · "Scenario- ER ส่งมอบ" (ขั้นตอน 298 แถว) · "ER Issue ส่งมอบ" (16 issue) · "Mock-Data ER" (รหัส Order / สถานะตั้งต้น) และสเปก Playwright ที่เล่นชีตนี้บน SBH Prod. ใช้เมื่อผู้ใช้พูดถึง "ER Scenario Map", "TOR ER", "ข้อ TOR 4.9.8.x", "Scenario ER ส่งมอบ", "UAT-ER-xx", "ER Issue ส่งมอบ", "รันเทส Scenario ER ตามชีต", "เล่น UAT ER รอบส่งมอบ" หรือถามว่าข้อ TOR ไหนครอบคลุม / ขั้นไหนผูกกับข้อไหน. ต้องโหลดสกิล cortex-automate คู่กันเสมอ (กฎ Prod / ความลับ / หลักฐานอยู่ที่นั่น). ไม่ใช่สำหรับชีต Scenario ER รุ่นเก่า (135 แถว — สเปก UAT-ER-play / play-b) หรือ BizSim OPD
---

# Cortex ER — TOR Map + Scenario UAT ส่งมอบ

สร้าง 8 พ.ย. 2026 ตามคำสั่ง "อ่านข้อมูลในชีททั้งหมดแล้วทำเป็น Skill เก็บไว้ก่อน และเตรียมรันเทสตามข้อต่างๆ"
**โหลด `cortex-automate` ก่อนเสมอ** — กฎ Prod (R31: เปิดจอ · ทีละราย · รายงานทีละราย · บอกก่อนแตะ Prod), ความลับ §6, หลักฐาน R13 / R23 / R61 / R86 อยู่ที่นั่น

## 1) ที่มาของข้อมูล

| ชีต | ไฟล์ข้อมูลในสกิล | เนื้อหา |
|---|---|---|
| ER Scenario Map | [references/tor-map.md](references/tor-map.md) | 39 ข้อ TOR (✅ 34 · ⚠️ 5) → Scenario + แถวขั้นตอน + หมายเหตุ + **คอมเมนต์ QA (คอลัมน์ H / I)** + TOR_ID ต่อ Scenario |
| Scenario- ER ส่งมอบ | [references/scenario-steps.md](references/scenario-steps.md) | UAT-ER-01 ถึง 14 ทุกขั้น (ทำ / ผลที่ควรเห็น / ผู้ทำ / เลขแถว) |
| ER Issue ส่งมอบ + Mock-Data ER | [references/issues-mockdata.md](references/issues-mockdata.md) | 16 issue (Done 3 · Partial 1) + รหัส Order Prod + สถานะตั้งต้นต่อข้อ |

- ไฟล์ต้นทาง: SharePoint (OneDrive ของ panupong_mun_hlabconsulting_com) ชื่อ **"New file Test case OPD #2.xlsx"** — ลิงก์ที่ผู้ใช้ให้ขึ้นต้น `https://hlabconsulting365-my.sharepoint.com/:x:/g/personal/panupong_mun_hlabconsulting_com/IQD2-ATVkOq…` (ขอลิงก์เต็มจากผู้ใช้ถ้าต้องดึงใหม่)
- ไฟล์ใน `E2E/` ของโปรเจกต์ (26 ต.ค.) เป็นรุ่นเก่า **ไม่มี** 3 ชีตส่งมอบ — อย่าใช้แทน
- เลข "(แถว xx)" ในทุกไฟล์ = แถวของชีต **Scenario- ER ส่งมอบ** · ชีตนี้ร่างโดย Claude 4 พ.ย. 2569 จาก TOR-ER.xlsx แล้วทีมย้ายมาไฟล์ SharePoint (หัวชีตยังเขียน "รอ QA ตรวจ")
- ข้อที่ยังเป็น ⚠️: 4.9.8.1.2 (QR / Barcode) · 4.9.8.1.5 (Merge HN) · 4.9.8.1.7 (IPD → ER) · และอีก 2 ข้อตามหัวชีต (ชีตแสดงสรุป 5 แต่ในแถวมี ⚠️ 3 ข้อ — ถ้าต้องรายงานตัวเลขให้นับจากแถวจริง)

### ดึงชีตใหม่ (เมื่อผู้ใช้บอกว่าชีตอัปเดต)

ผู้ใช้ล็อกอิน SharePoint ไว้ใน **Chrome ของผู้ใช้** (Claude in Chrome) — Browser ในแอป Claude ยังไม่ได้ล็อกอิน
1. เปิดลิงก์ในแท็บใหม่ (`tabs_create_mcp` → `navigate`) — Excel Online เปิดในโหมด Editing: **ห้ามคลิกในตาราง / พิมพ์**
2. `javascript_tool` บนหน้า SharePoint: `fetch(location.href.split('?')[0] + '?download=1', {credentials:'include'})` → ได้ไฟล์ xlsx ในหน่วยความจำ (ไม่บันทึกลงเครื่อง) → แตก zip เองด้วย `DataView` + `DecompressionStream('deflate-raw')` → อ่าน `xl/workbook.xml` + rels + `sharedStrings.xml` + `worksheets/sheetN.xml` ด้วย `DOMParser`
3. ข้อจำกัดของ extension ที่เจอ: ค่าที่คืนเป็น**สตริงยาวถูกตัด** (~1,500 ตัวอักษร) → คืนเป็น **array ของบรรทัด** แทน · ข้อความรูปแบบ `คอลัมน์=ค่า | …` ถูกบล็อก "[BLOCKED: Cookie/query string data]" → ใช้ตัวคั่น `¦` หรือ array
4. เทียบกับไฟล์ใน `references/` แล้วแก้เฉพาะที่เปลี่ยน + บันทึกท้าย `references/changelog.md` (§7)

## 2) ขอบเขตรอบรันที่ผู้ใช้ตกลง (8 พ.ย. 2026)

| เรื่อง | คำตอบผู้ใช้ |
|---|---|
| ระบบ | **SBH Prod** (`https://cortex.srbrhospital.com`) — ผ่าน `playwright.sbh-prod.config.ts` + `mock-data/` |
| รูปแบบสเปก | **ไฟล์ใหม่ตามชีตส่งมอบ** (ไม่แก้ UAT-ER-play / play-b) |
| รวมในการเตรียม | **MOPH Refer เข้า** (UAT-ER-14) · **ตั้งค่าเวลารอตรวจ** (UAT-ER-08 แถว 216–217 — คืนค่าเดิมหลังจบ) |
| ตัดออก ⛔ | เพิ่ม / ปิดโซนบริการ (08 แถว 227–230) · เชื่อมโยง HN / Merge (03 แถว 114–121) |
| ข้อมูลคนไข้ | **กรอกทุกส่วนที่ผ่านให้ครบที่สุด**: ลงทะเบียนทุกช่อง (ที่อยู่ · โทร · ผู้ติดต่อ · รูป ฯลฯ) + คัดกรองทุก Section + Physician Note / Disposition / Progress Note ทุกช่องที่กรอกได้ |
| เวลารัน | "ถ้าพร้อมรันเทสแล้วแจ้งฉันอีกที" → เตรียมให้พร้อม (typecheck + `--list`) **แล้วรอผู้ใช้สั่งรัน** · รันจริงตาม R31 |

## 3) สเปกและคำสั่ง

**รันทีละเทส เปิดจอ (R31) — ต้องใส่ `--grep` ทุกครั้ง** แล้วรายงานผลรายนั้นก่อนรันตัวถัดไป · บอกผู้ใช้ก่อนแตะ Prod ทุกรอบ

```bash
npm run uat:er-tor -- --grep "@UAT-ER-01-1"
```

(= `playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor --headed` · tag ทั้งหมดอยู่ §6)
ผลแต่ละข้อ: `.cache/uat-play-sbh-prod/<ข้อ>.json` · ภาพทุกขั้นแนบใน HTML report ("ผ่าน — …" / "Error — …") · วิดีโอ `test-results/…/video.webm` · ผู้ป่วยที่สร้างจดใน `mock-data/created-patients.md`

## 3.1) ลงผลในชีต SharePoint (ผู้ใช้สั่ง 8 พ.ย. 2026)

- "ถ้า Fail ให้ลงผลใน Note ให้หน่อยโดย List เป็นข้อไว้ว่า Fail จุดไหนบ้าง" → เลือก **"คอลัมน์ NOTE ทุกแถวที่ Fail"** ของชีต **Scenario- ER ส่งมอบ**:
  - คอลัมน์ **G (Fail)** ของแถวแรกของขั้น พิมพ์ `Fail` (ทีมใช้คำลงช่อง ไม่ใช่ Checkbox — เทียบชีต Scenario-OPD BizSim ที่ใช้ Pass / No Pass / Block / N/A)
  - คอลัมน์ **I (NOTE)** คงบรรทัดเดิม `ผู้ทำ: …` แล้วต่อ (Alt+Enter) `Fail (<วันที่> · SBH Prod · <ชื่อ> HN <HN>):` + ข้อ `1.` `2.` ว่า Fail ตรงไหน / ตรง Issue ข้อไหน
  - **ลงเฉพาะที่ระบบ Fail จริง** — ขั้นที่สคริปต์พังให้ดูภาพก่อน แก้สคริปต์ (R52 ขออนุมัติ) แล้วรันใหม่ · ผู้ใช้บอกให้ตี Fail เองได้ (เช่น Consult Issue #16)
- "ข้อไหนผ่านแล้วฝากใส่ว่าผ่านไว้หน่อย" (8 พ.ย. 2026) → ขั้นที่ผ่าน: คอลัมน์ **F (Pass)** แถวแรกของขั้น พิมพ์ `Pass` · ขั้นที่ไม่ได้ทดสอบจริง (เช่น แถว 88 หน้าต่างไม่มีที่อยู่ไม่ขึ้นเพราะกรอกที่อยู่แล้ว) = คอลัมน์ **H** `N/A` + เหตุผลเป็นข้อใน NOTE
- **Browser (ผู้ใช้สั่ง 8 พ.ย. 2026 "ให้ใช้ Claude in Chrome ของ Jame ไม่ใช่ของคนอื่น")**: ลงผลชีต = Claude in Chrome **บนเครื่องนี้ (Windows)** · บัญชีนี้มี Chrome เชื่อมอยู่หลายเครื่อง → **ก่อนใช้ทุกครั้ง `list_connected_browsers`** แล้ว `select_browser` ตัวที่ `onThisComputer: true` / Windows (8 พ.ย. = "Browser 1" deviceId `6f2f7475-…`) · **ห้ามใช้ "Browser 2" (macOS) — เป็นของคนอื่น** (UAT-ER-01 ถึง 07 ลงชีตผ่านเครื่องนั้นไปแล้วโดยไม่รู้) · ห้ามใช้ Browser ในแอป Claude (`mcp__Claude_Browser__*`) · รันเทส = Google Chrome ในเครื่อง (`channel: 'chrome'` ใน `playwright.base.ts`)
- **วิธีพิมพ์ผ่าน Claude in Chrome ที่ใช้ได้จริง**: เลื่อนจอให้เห็นแถว → **คลิกที่ช่องโดยตรง** → zoom ดู Name Box ว่าเป็นช่องที่ตั้งใจ → พิมพ์ → Enter · ทำทีละไม่กี่ช่องแล้ว screenshot ตรวจ
  - **อย่าพิมพ์ที่อยู่ช่องใน Name Box แล้วพิมพ์ค่าต่อทันที**: บางครั้งโฟกัสค้างที่ Name Box / คลิกไม่ทัน → ค่าไปลงช่องอื่น (เจอ F24 ได้ "26") · Name Box ไม่รับหลายช่อง ("F15,F17" ขึ้น "The syntax of this name is incorrect")
  - หลัง Enter ช่องที่เลือกเลื่อนลงจนจอเลื่อนได้ → ตำแหน่งแถวบนจอเปลี่ยน **คลิกครั้งต่อไปต้องดูภาพใหม่ก่อน** (เจอข้อความ NOTE ทับหัวข้อ UAT-ER-03 แถว 90 → แก้ด้วย Ctrl+Z ทันที)
  - **ต่อท้าย NOTE**: คลิกช่อง → คลิก**แถบสูตร** → `ctrl+End` → `alt+Return` → พิมพ์ (ทีละบรรทัด + zoom แถบสูตรตรวจ) → Enter · **ห้ามใช้ F2** (Excel Online ไม่เข้าโหมดแก้ไข → พิมพ์ทับบรรทัด "ผู้ทำ:" + Alt+Enter ไม่ขึ้นบรรทัด — เจอ I206 8 พ.ย. แก้ด้วย Esc ก่อน Enter)
  - ไอคอนเมฆถูกเขียว / "Saved" ข้างชื่อไฟล์ = บันทึกแล้ว · ไฟล์ `?download=1` อัปเดตตามหลังหลายนาที (ใช้ยืนยันทันทีไม่ได้ — ดูแถบสูตร / จอแทน)

## 3.2) หลักฐาน

- `TorPlay` เก็บภาพทุกขั้นลง `clips/UAT-ER-tor/<ข้อ>-<YYYYMMDD-HHmm>/` + `index.txt` (ชื่อไฟล์ `NN-pass|ERROR-<แถว>.png`) — **HTML report `playwright-report-sbh-prod/` ใช้ร่วมกับ session อื่นที่รัน Prod และถูกเขียนทับได้** (เจอ 8 พ.ย. — SBH-3839 รันต่อท้ายแล้วภาพรอบ 01-1 หาย)
- ถอดภาพจาก `video.webm` ด้วย Chrome ช้า / ค้าง (screencast ไม่มี index ให้ seek) — ใช้ภาพใน `clips/` แทน

## 4) ข้อควรรู้ตอนเล่นตามชีต

- Issue ที่ยังไม่ Done ([issues-mockdata.md](references/issues-mockdata.md)) = ขั้นที่คาดว่าไม่ผ่าน → รายงานว่า "ตรง Issue #n" · ไม่เปิดการ์ดบั๊กเอง (R48 — ถามผู้ใช้ก่อน)
- ขั้น [ต้องยืนยัน] ในชีต: บันทึกสิ่งที่เห็นจริงบนจอ (ข้อความ / ช่องที่ค่าไปแสดง) เพื่อให้ทีม QA เติมชีต
- หมอบันทึก ER Physician Note ต้องเลือก Diagnosis (ICD) ทุกครั้ง (R21)
- คำว่า Finalize = "ปุ่มลงนาม" (R20)
- แถวที่ชีตเขียนผิด: 284 เลขข้อ "2." ควรเป็น "4." · 151 ผลที่ควรเห็นไม่ชัด (ควรขึ้นที่คลินิก OPD ปลายทาง — R34 บน Prod ใช้ "ห้องตรวจโรคอายุรกรรมทั่วไป")

## 5) ไฟล์ใน repo ที่เกี่ยวข้อง

- สเปกรุ่นเก่า (ชีต 135 แถว): `mock-data/UAT-ER-play.spec.ts` · `UAT-ER-play-b.spec.ts` · Mock `UAT-ER-mock-data.spec.ts` · helper `mock-data/uat-play.ts` · `uat-er.ts`
- ร่างเพิ่มขั้นตอน 5 ข้อ TOR (ที่มาของแถวใหม่ในชีตส่งมอบ): `test-cases/drafts/TOR-ER_scenario-additions_draft.md`
- ความรู้หน้าจอ: `cortex-automate/references/screens/er-uat-scenario.md` · `sbh-prod.md` · `er.md` · `refer.md`

## 6) สเปกรอบส่งมอบ (เขียน 8 พ.ย. 2026 · รันจริงครบ 01–14 บน SBH Prod 8–9 พ.ย. 2026)

| ไฟล์ | tag (1 tag = 1 เทส = ผู้ป่วยใหม่) | หมายเหตุ |
|---|---|---|
| `mock-data/uat-tor.ts` | — | helper กลาง: `TorPlay` (ขั้นพังแล้วเล่นต่อ + ภาพทุกขั้น) · `registerFull` (เบอร์ · รูป PNG ที่สร้างเอง · ที่อยู่) · `registerUnidentifiedFull` · `fillTriageFull` (ทุก Section ของฟอร์มคัดกรองรุ่นใหม่) · `saveTriageFull` · `savePhysicianNoteFull` · `saveProgressNoteFull` (+ Perform time) · `TOR_ORDER_CODES` |
| `UAT-ER-tor-01-02.spec.ts` | `@UAT-ER-01-1` (1.1 + 1.3) · `@UAT-ER-01-2` (1.2) · `@UAT-ER-02` | 01-1 เปิดหน้าต่างบัญชี Doctor ขอ Consult (Issue #16) · 02 กรอกที่อยู่แล้ว จึงอาจไม่ขึ้น "ลงนามต่อ" (แถว 88–89 — จดเป็นข้อสังเกต) |
| `UAT-ER-tor-03-06.spec.ts` | `@UAT-ER-03` · `@UAT-ER-04` · `@UAT-ER-05-1` / `-2` / `-3` (รวม `@UAT-ER-05`) · `@UAT-ER-06` | 03 ตัดแถว 114–121 · 04 สร้าง AN จริง (ไม่เลือกเตียง) · **รัน 05-2 ก่อน 06** (06 ใช้ผู้ป่วย `tor05-2`) |
| `UAT-ER-tor-07-10.spec.ts` | `@UAT-ER-07` · `@UAT-ER-08` · `@UAT-ER-09` · `@UAT-ER-10` | **08 แก้เวลารอตรวจของ ER จริง** (ESI 4 → 2 นาที ราว 5–10 นาที · env `ER08_LEVEL` / `ER08_TARGET_MIN`) คืนค่าใน `finally` + `afterEach` · พังทั้ง 2 ชั้น = ตั้งกลับเองตามค่าที่พิมพ์ใน console · 07 ทิ้งเหตุการณ์ไว้ 1 รายการ |
| `UAT-ER-tor-11-14.spec.ts` | `@UAT-ER-11` · `@UAT-ER-12` · `@UAT-ER-13` · `@UAT-ER-14` | **11 เรียกคิวบนจอ ER TV จริง** — เรียกเฉพาะผู้ป่วยทดสอบ จบคิวใน `finally` · ห้ามรันพร้อม SBH-1026 / 3117 / 3181 · 12 อ่านอย่างเดียว · 14 ต้องส่ง Refer ก่อน (`npm run mock:refer`) ไม่มีรายการรอรับ = skip · ขั้น "รับผู้ป่วยเข้า ER" เดาจากบันทึก ยังไม่เคยกด |

ลำดับรันที่แนะนำ: 12 (อ่านอย่างเดียว) → 10 → 02 → 01-1 → 01-2 → 03 → 04 → 05-1 → 05-2 → 06 → 05-3 → 09 → 07 → 13 → 11 → 08 → 14
จุดที่เดา locator (ยังไม่เคยเห็นบน Prod): ช่องรูป / ที่อยู่ในฟอร์มลงทะเบียน ER · Body metric · AVPU · Perform time · ปุ่ม Acknowledge MEWS (ฟอร์มใหม่อาจไม่มี) · หน้าตั้งค่าเวลารอตรวจ · ฟอร์มสมาชิกเหตุการณ์หมู่ · รับ Refer เข้า ER — ขั้นพังแล้วเล่นต่อ ดูภาพ "Error — …" แล้วแก้ทีละจุด (R52: ห้ามแก้ / skip เองก่อนผู้ใช้อนุมัติ)

## 7) ประวัติ

อยู่ที่ [references/changelog.md](references/changelog.md) (ผลรันแต่ละรอบ + สถานะล่าสุด) — **ไม่ Read ทั้งไฟล์** · จะเล่นต่อจากรอบก่อน: ดูรายการท้ายไฟล์ (`tail -n 5`) · หาบริบทของ Scenario / สเปก: Grep เลขข้อหรือชื่อไฟล์ · งานจบแล้วเพิ่มรายการใหม่ท้ายไฟล์นั้น (ไม่ลงในไฟล์นี้)
