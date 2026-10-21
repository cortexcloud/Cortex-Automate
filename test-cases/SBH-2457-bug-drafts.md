# SBH-2457 — ร่างการ์ด bug (ยังไม่สร้างใน Linear)

- ที่มา: ผลสำรวจแอปจริงบนฟอร์ม SBH (คลินิก "ห้องตรวจสระบุรี") 20 ต.ค. 2569 — ดูหัวข้อ "ผลสำรวจแอปจริง" ใน `SBH-2457-opd-note-pre-assessment.md`
- กติกา: QA สั่ง (21 ต.ค. 2569) ว่าข้อไหนหน้าจอไม่มีตาม AC ให้ตีเป็น bug
- สถานะ: **สร้างใน Linear แล้ว 21 ต.ค. 2569** (sub-issue ของ SBH-2457 · template QA Bug · label การ์ดแม่ + QA : Bug · Backlog · ไม่ assign · ภาพ/วิดีโอฝังใต้ Actual Result ครบทุกใบ)

| Draft | Linear | Priority |
| -- | -- | -- |
| Bug 1a ไฟล์แนบหาย (OPD Note) | SBH-2812 | High |
| Bug 1b ไฟล์แนบหาย (ฟอร์มคัดกรอง) | SBH-2813 | High |
| Bug 2 ไม่มี Onset date | SBH-2814 | Medium |
| Bug 3 ยังมี Note to Nurse | SBH-2815 | Low |
| Bug 4 CC/PI หายเมื่อยังไม่มีฟอร์มคัดกรอง | SBH-2816 | High |
| Bug 5 ตั้ง "ซ่อน" แล้วไม่พับ | SBH-2817 | Medium |
- QA ยืนยัน (21 ต.ค. 2569): **6 ใบ** (ไฟล์แนบแยก OPD Note กับฟอร์มคัดกรอง) · sub-issue ของ SBH-2457 · template QA Bug · label ของการ์ดแม่ + "QA : Bug" (แบบ NUH-3088) · ไม่ assign · severity ตามที่เสนอ
- หลักฐานทั้งหมดอยู่ที่ `.playwright-mcp/SBH-2457/explore/` — ตอนสร้างจริงจะอัปโหลดแนบใต้ Actual Result
- TC ต้นทางยังเป็น draft ในไฟล์ ยังไม่มีการ์ดใน Linear — ตอนสร้างจริงจะใส่ลิงก์เมื่อมีการ์ด TC

ข้อตัดสินจาก QA ที่เกี่ยวกับ bug:
- **CC/PI ใน OPD Note (มีฟอร์มคัดกรองก่อน)** — ทดสอบตาม flow ที่ QA อธิบายแล้ว (21 ต.ค. 2569) prefill + แก้ใน OPD Note + ไม่ sync กลับ **ทำงานถูกต้อง** จึงไม่เป็น bug · กรณีกรอก OPD Note ก่อนมีฟอร์มคัดกรอง QA ยืนยันว่าต้องเก็บค่า → เป็น Bug 4
- **AC 16** — QA ยืนยัน (21 ต.ค. 2569) ให้อ่านตามหน้าตั้งค่า "ซ่อน" = Collapse → เป็น Bug 5

---

## Bug 1a

**ชื่อ:** `[Bug][EMR][OPD Note] - แนบไฟล์ในเอกสารแนบของ OPD Note (SBH) แล้วบันทึก ไฟล์หายหลัง reload`

**Severity ที่เสนอ:** High — ผู้ใช้เห็นชื่อไฟล์ขึ้นและกดบันทึกได้ตามปกติ จึงเข้าใจว่าแนบสำเร็จ แต่เอกสารไม่ได้ถูกเก็บไว้กับฟอร์ม

```
# Test Result

### 1. Description:
* User: user1 (Super_User) · Env: DEV-X · Version: 2.9.0 · Date/Time: 20/10/2569 15:41 และ 21/10/2569 09:55
* Severity: High — ผู้ใช้เข้าใจว่าแนบเอกสารแล้ว แต่เอกสารหายจากฟอร์มโดยไม่มีอะไรเตือน
* etc.,: HN 6931979 · VN V69102027456 · EN E69102032186 · คลินิก ห้องตรวจสระบุรี
* TC ต้นทาง: TC-SBH-2457-007

### 2. Steps reproduce:
1. เปิดหน้าผู้ป่วยที่มี encounter คลินิก "ห้องตรวจสระบุรี" (เช็คอินแล้ว) > tab "OPD" > "OPD Note"
2. ที่ section "เอกสารแนบ" กด "+ เพิ่มรายการ"
3. ชื่อเอกสาร เลือก "อื่นๆ" · รายละเอียดเอกสาร กรอก "QA-SBH2457 attachment"
4. กด "อัปโหลด" แล้วเลือกไฟล์ PDF — ชื่อไฟล์ขึ้นในแถว (ระบบตั้งชื่อเป็น "other-6-69.pdf")
5. กด "สร้าง"
6. Reload หน้า แล้วเปิด "OPD Note" เดิม

### 3. Actual Result:
* ปัญหา: แนบไฟล์แล้วบันทึก OPD Note ได้ แต่หลัง reload แถวเอกสารแนบหายไป
* เกิดที่: OPD › OPD Note › เอกสารแนบ
* อาการ: ก่อนบันทึกเห็นชื่อไฟล์ในแถว กด "สร้าง" แล้วไม่มีข้อความแจ้งเตือนใด ๆ ผู้ใช้จะเข้าใจว่าแนบสำเร็จ แต่หลัง reload section "เอกสารแนบ" ว่าง ส่วนข้อมูล section อื่นในฟอร์มเดียวกันยังอยู่ครบ
* เกิดซ้ำ: 2 รอบ (20/10/2569 และ 21/10/2569)
* ข้อสังเกต:
  * วันถัดมา (21/10/2569 09:55) เปิด OPD Note เดิม แถว "other-6-69.pdf" กลับมาแสดง แต่ช่องชื่อเอกสารว่าง ขึ้น "กรุณาเลือกชื่อเอกสาร" และกด "สร้าง" แล้วไม่บันทึกทั้งฟอร์ม จนกว่าจะเลือกชื่อเอกสารใหม่ · เลือก "อื่นๆ" แล้วบันทึก → reload แถวไฟล์แนบหายอีก
  * ลองอัปโหลดไฟล์ PNG แล้วระบบไม่รับ (ดูรายละเอียดสำหรับ dev) และหลังจากนั้นกด "สร้าง" แล้วฟอร์มไม่ถูกบันทึก
  * ฟอร์มของคลินิกห้องตรวจโรคอายุรกรรมทั่วไป (template อื่น) ก็เกิดอาการเดียวกัน 2 รอบ
  * ไฟล์ที่ใช้เป็น PDF ขนาดเล็กที่ QA สร้างเอง — ควรลองซ้ำด้วยไฟล์เอกสารจริง

① ก่อนบันทึก — เห็นชื่อไฟล์ในแถว: 20g-sbh-opd-attachment.png
② หลัง reload — section เอกสารแนบว่าง: 21f-sbh-opd-after-reload-attachment-dx.png
③ วันถัดมา แถวกลับมาแบบชื่อเอกสารว่าง และบล็อกการบันทึก: 26e-opd-attachment-row-back-name-empty.png
④ เลือกชื่อเอกสารแล้วบันทึก → reload หายอีก: 26i-opd-attachment-after-reload.png
⑤ ลองไฟล์ PNG: 22a-sbh-opd-attach-png-before-save.png
🎬 วิดีโอ: 06-sbh-opd-note.webm, 09-sbh-cc-pi-prefill-nosync.webm

**รายละเอียดสำหรับ dev**
* อัปโหลด PDF: `201 POST /cortex-api/documents/upload-by-hn`
* บันทึกฟอร์ม: `200 POST .../plugin/transform-composition/flat-to-json?templateId=sbh_general_opd_note_v2` → `201 POST .../rest/openehr/v1/ehr/{ehr_id}/contribution`
* อัปโหลด PNG: `422 POST /cortex-api/documents/upload-by-hn` · กด "สร้าง" หลังจากนั้นไม่มี request contribution
* ต้องให้ dev ยืนยันว่า ข้อมูลไฟล์แนบถูกส่งไปใน composition หรือไม่ แถวที่กลับมาในวันถัดมามาจาก draft หรือไม่ และระบบรับไฟล์ชนิดไหนบ้าง

### 4. Expected Result:
* แนบไฟล์แล้วบันทึก หลัง reload แถวเอกสารแนบยังอยู่ พร้อมชื่อเอกสาร รายละเอียด และไฟล์ที่เปิดดูได้
* ถ้าไฟล์ชนิดนั้นแนบไม่ได้ ต้องมีข้อความบอกผู้ใช้
```

---

## Bug 1b

**ชื่อ:** `[Bug][EMR][ฟอร์มคัดกรอง] - แนบไฟล์ในเอกสารแนบของฟอร์มคัดกรอง (SBH) แล้วบันทึก ไฟล์หายหลัง reload`

**Severity ที่เสนอ:** High — ผู้ใช้เห็นชื่อไฟล์ขึ้นและกดบันทึกได้ตามปกติ จึงเข้าใจว่าแนบสำเร็จ แต่เอกสารไม่ได้ถูกเก็บไว้กับฟอร์ม

```
# Test Result

### 1. Description:
* User: user1 (Super_User) · Env: DEV-X · Version: 2.9.0 · Date/Time: 20/10/2569 15:47
* Severity: High — ผู้ใช้เข้าใจว่าแนบเอกสารแล้ว แต่เอกสารหายจากฟอร์มโดยไม่มีอะไรเตือน
* etc.,: HN 6931979 · VN V69102027456 · EN E69102032186 · คลินิก ห้องตรวจสระบุรี
* TC ต้นทาง: TC-SBH-2457-015

### 2. Steps reproduce:
1. เปิดหน้าผู้ป่วยที่มี encounter คลินิก "ห้องตรวจสระบุรี" (เช็คอินแล้ว) > tab "OPD" > "ฟอร์มคัดกรอง"
2. กรอกช่องบังคับ (การมาถึงและความต้องการช่วยเหลือ, Chief Complaint, Present Illness)
3. ที่ section "เอกสารแนบ" กด "+ เพิ่มรายการ"
4. ชื่อเอกสาร เลือก "อื่นๆ" · รายละเอียดเอกสาร กรอก "QA-SBH2457 screening attachment"
5. กด "อัปโหลด" แล้วเลือกไฟล์ PDF — ชื่อไฟล์ขึ้นในแถว (ระบบตั้งชื่อเป็น "other-7-69.pdf")
6. กด "สร้าง"
7. Reload หน้า แล้วเปิด "ฟอร์มคัดกรอง" เดิม

### 3. Actual Result:
* ปัญหา: แนบไฟล์แล้วบันทึกฟอร์มคัดกรองได้ แต่หลัง reload แถวเอกสารแนบหายไป
* เกิดที่: OPD › ฟอร์มคัดกรอง › เอกสารแนบ
* อาการ: ก่อนบันทึกเห็นชื่อไฟล์ในแถว กด "สร้าง" แล้วไม่มีข้อความแจ้งเตือนใด ๆ ผู้ใช้จะเข้าใจว่าแนบสำเร็จ แต่หลัง reload section "เอกสารแนบ" ว่าง ส่วน section อื่น (การมาถึง, Body metric, การคัดกรองเพศหญิง, ประวัติแพ้, ความเสี่ยงพลัดตกหกล้ม ฯลฯ) ยังอยู่ครบ
* เกิดซ้ำ: 1 รอบ
* ข้อสังเกต: OPD Note ของ encounter เดียวกันเกิดอาการเดียวกัน (การ์ดแยก) · ไฟล์ที่ใช้เป็น PDF ขนาดเล็กที่ QA สร้างเอง — ควรลองซ้ำด้วยไฟล์เอกสารจริง

① ก่อนบันทึก — เห็นแถวเอกสารแนบ: 24a-sbh-scr-create-before.png
② หลัง reload — section เอกสารแนบว่าง: 24d-sbh-scr-after-reload-2.png
🎬 วิดีโอ: 07-sbh-screening.webm

**รายละเอียดสำหรับ dev**
* อัปโหลด PDF: `201 POST /cortex-api/documents/upload-by-hn`
* บันทึกฟอร์ม: `200 POST .../plugin/transform-composition/flat-to-json?templateId=sbh_general_opd_pre_assessment_v2` → `201 POST .../rest/openehr/v1/ehr/{ehr_id}/contribution`
* ต้องให้ dev ยืนยันว่า ข้อมูลไฟล์แนบถูกส่งไปใน composition หรือไม่

### 4. Expected Result:
* แนบไฟล์แล้วบันทึก หลัง reload แถวเอกสารแนบยังอยู่ พร้อมชื่อเอกสาร รายละเอียด และไฟล์ที่เปิดดูได้ (AC 15)
```

---

## Bug 2

**ชื่อ:** `[Bug][EMR][OPD Note] - เพิ่ม Diagnosis ใน OPD Note (SBH) แล้วไม่มีช่อง Onset date`

**Severity ที่เสนอ:** Medium — แพทย์บันทึกวันที่เริ่มเป็นโรคไม่ได้ ตาม requirement ต้องมี (AC 8) แต่ยังบันทึก Diagnosis ได้

```
# Test Result

### 1. Description:
* User: user1 (Super_User) · Env: DEV-X · Version: 2.9.0 · Date/Time: 20/10/2569 15:42
* Severity: Medium — ขาดช่องที่ requirement กำหนด แพทย์บันทึกวันที่เริ่มเป็นโรคไม่ได้
* etc.,: HN 6931979 · VN V69102027456 · EN E69102032186 · คลินิก ห้องตรวจสระบุรี
* TC ต้นทาง: TC-SBH-2457-008

### 2. Steps reproduce:
1. เปิดหน้าผู้ป่วยที่มี encounter คลินิก "ห้องตรวจสระบุรี" (เช็คอินแล้ว) > tab "OPD" > "OPD Note"
2. ไปที่ section "Diagnosis"
3. ค้นหา "M54.5" แล้วเลือก "M545 - Low back pain"
4. ดูช่องในแถว Diagnosis

### 3. Actual Result:
* ปัญหา: แถว Diagnosis ไม่มีช่อง Onset date
* เกิดที่: OPD › OPD Note › Diagnosis
* อาการ: แถวมีช่อง ICD-10, รายละเอียด, ประเภท (Principal), สถานะ (Confirm), Severity และช่องวันเวลา 1 ช่อง ช่องวันเวลานี้เติมเวลาปัจจุบันให้เอง และในโหมดดูแสดงชื่อว่า "อัปเดตล่าสุด" ไม่ใช่ Onset date
* เกิดซ้ำ: ทุกครั้งที่เปิด (เห็นทั้งฟอร์มคลินิก SBH และคลินิกห้องตรวจโรคอายุรกรรมทั่วไป)

① แถว Diagnosis ตอนกรอก: 20h-sbh-opd-diagnosis.png, 19g-sbh-opd-diagnosis.png
② โหมดดู ช่องวันที่ชื่อ "อัปเดตล่าสุด": 07d-opd-note-after-reload-2.png
🎬 วิดีโอ: 06-sbh-opd-note.webm

**รายละเอียดสำหรับ dev**
* ช่องวันที่ใน widget คือ `data-dx-field="last_updated"` · path `sbh_general_opd_note_v2/widget_diagnosis_general_v1/problem_diagnosis:0/last_updated`
* field ใน widget ทั้งหมด: name, description, category, status, severity, last_updated

### 4. Expected Result:
* Diagnosis general มีช่อง Onset date ให้กรอก และบันทึกแล้ว reload ค่ายังอยู่ (AC 8)
```

---

## Bug 3

**ชื่อ:** `[Bug][EMR][OPD Note] - เปิด OPD Note (SBH) แล้วยังมี section Note to Nurse`

**Severity ที่เสนอ:** Low — มี section เกินจาก requirement (BR 9 / AC 9) ไม่ได้ทำให้บันทึกข้อมูลอื่นไม่ได้ แต่ซ้ำกับ Note to nurse ที่ย้ายไปอยู่ใน Section Order แล้ว ผู้ใช้อาจกรอกผิดที่

```
# Test Result

### 1. Description:
* User: user1 (Super_User) · Env: DEV-X · Version: 2.9.0 · Date/Time: 20/10/2569 15:25
* Severity: Low — section เกินจาก requirement ผู้ใช้อาจกรอก Note to Nurse ผิดที่
* etc.,: HN 6931979 · VN V69102027456 · EN E69102032186 · คลินิก ห้องตรวจสระบุรี
* TC ต้นทาง: TC-SBH-2457-009

### 2. Steps reproduce:
1. เปิดหน้าผู้ป่วยที่มี encounter คลินิก "ห้องตรวจสระบุรี" (เช็คอินแล้ว) > tab "OPD" > "OPD Note"
2. เลื่อนลงท้ายฟอร์ม

### 3. Actual Result:
* ปัญหา: OPD Note ยังมี section "Note to Nurse"
* เกิดที่: OPD › OPD Note (ท้ายฟอร์ม ต่อจาก Diagnosis)
* อาการ: มี section "Note to Nurse" พร้อมช่อง "Note" ให้พิมพ์ ขณะเดียวกันแผง "คำสั่งการรักษา" ด้านขวาก็มี "Note to nurse" อีกที่หนึ่ง
* เกิดซ้ำ: ทุกครั้งที่เปิด (เห็นทั้งฟอร์มคลินิก SBH และคลินิกห้องตรวจโรคอายุรกรรมทั่วไป)
* ข้อสังเกต: หน้าตั้งค่าแบบฟอร์ม "SBH GENERAL OPD NOTE" (ผู้ดูแลระบบ > แบบฟอร์ม > แบบฟอร์ม) ไม่มีแถว Note to Nurse ในรายการส่วนของฟอร์ม แต่ฟอร์มจริงยังแสดง

① section Note to Nurse ใน OPD Note: 19g-sbh-opd-diagnosis.png, 19f-sbh-opd-note-to-nurse.png
🎬 วิดีโอ: 05-edit-visit-sbh.webm

**รายละเอียดสำหรับ dev**
* template `sbh_general_opd_note_v2` · preset `sbh-general-opd-note` (`/cortex/setting/admin/forms/presets/11/edit?tab=emr`) มี 9 ส่วน ไม่มี Note to Nurse
* ต้องให้ dev ยืนยันว่า section นี้มาจาก template หรือจาก preset

### 4. Expected Result:
* Form OPD note ไม่แสดง section Note to Nurse (BR 9 / AC 9)
```

---

## Bug 4

**ชื่อ:** `[Bug][EMR][OPD Note] - กรอก Chief Complaint และ Present Illness ใน OPD Note (SBH) ก่อนมีฟอร์มคัดกรอง แล้วบันทึก ค่าหายหลัง reload`

**Severity ที่เสนอ:** High — แพทย์กรอกอาการสำคัญและประวัติปัจจุบันแล้วบันทึกสำเร็จ แต่ข้อมูลหายโดยไม่มีอะไรเตือน

```
# Test Result

### 1. Description:
* User: user1 (Super_User) · Env: DEV-X · Version: 2.9.0 · Date/Time: 20/10/2569 15:39–15:43
* Severity: High — ข้อมูลอาการสำคัญและประวัติปัจจุบันที่แพทย์กรอกหายหลังบันทึก ผู้ใช้ไม่รู้ตัว
* etc.,: HN 6931979 · VN V69102027456 · EN E69102032186 · คลินิก ห้องตรวจสระบุรี · ตอนทดสอบ encounter นี้ยังไม่มีฟอร์มคัดกรอง (ฟอร์มคัดกรองบันทึกครั้งแรก 15:47)
* TC ต้นทาง: TC-SBH-2457-001 (Chief Complaint), TC-SBH-2457-002 (Present Illness)

### 2. Steps reproduce:
1. เปิดหน้าผู้ป่วยที่มี encounter คลินิก "ห้องตรวจสระบุรี" (เช็คอินแล้ว) ที่ยังไม่มีการบันทึก "ฟอร์มคัดกรอง"
2. tab "OPD" > "OPD Note"
3. Chief Complaint กดปุ่ม "ปวดหลัง" (ข้อความ "ปวดหลัง" เข้าช่อง)
4. Present Illness พิมพ์ "QA-SBH2457 SBH present illness"
5. กด "สร้าง"
6. Reload หน้า แล้วเปิด "OPD Note" เดิม

### 3. Actual Result:
* ปัญหา: บันทึก OPD Note สำเร็จ แต่หลัง reload ช่อง Chief Complaint และ Present Illness ว่าง
* เกิดที่: OPD › OPD Note › Chief Complaint และ Present Illness
* อาการ: กด "สร้าง" แล้วไม่มีข้อความแจ้งเตือน และ section อื่นที่บันทึกพร้อมกัน (Pain score, Body metric, Physical Examination, Body Chart, Diagnosis) ยังอยู่ครบ มีแค่ 2 ช่องนี้ที่หาย ผู้ใช้จะเข้าใจว่าบันทึกครบแล้ว
* เกิดซ้ำ: 1 รอบ (encounter เดียว)
* ข้อสังเกต:
  * หลังจากบันทึกฟอร์มคัดกรอง ช่อง CC / PI ของ OPD Note แสดงค่าจากฟอร์มคัดกรองแทน ("ปวดเข่า")
  * กรณีที่มีฟอร์มคัดกรองก่อน แล้วแก้ CC / PI ใน OPD Note ค่าที่แก้ถูกเก็บไว้ถูกต้อง (ทดสอบ 21/10/2569) — ปัญหาเกิดเฉพาะตอนที่ยังไม่มีฟอร์มคัดกรอง

① ก่อนบันทึก — กรอก CC / PI แล้ว: 20a-sbh-cc-pi.png
② กด "สร้าง": 21a-sbh-opd-create-before.png, 21b-sbh-opd-create-after.png
③ หลัง reload — CC / PI ว่าง ส่วน Physical Examination ยังอยู่: 21c-sbh-opd-after-reload-1.png
④ หลังบันทึกฟอร์มคัดกรอง — CC / PI แสดงค่าจากฟอร์มคัดกรอง: 24g-sbh-opd-cc-pi-after-screening.png
🎬 วิดีโอ: 06-sbh-opd-note.webm

**รายละเอียดสำหรับ dev**
* บันทึก: `200 POST .../plugin/transform-composition/flat-to-json?templateId=sbh_general_opd_note_v2` → `201 POST .../rest/openehr/v1/ehr/{ehr_id}/contribution`
* หลังบันทึกมี query `sbh_general_opd_pre_assessment_get_latest_by_encounter_id` และ `sbh_general_opd_note_get_prev_by_clinic_id`
* ต้องให้ dev ยืนยันว่า CC / PI ถูกส่งไปใน composition ของ OPD Note หรือไม่ และตอนเปิดฟอร์ม ระบบอ่าน CC / PI จาก OPD Note หรือจากฟอร์มคัดกรอง

### 4. Expected Result:
* แพทย์กรอก CC / PI ใน OPD Note โดยยังไม่มีฟอร์มคัดกรอง → บันทึกแล้ว reload ค่ายังอยู่ (QA ยืนยัน 21/10/2569)
* ถ้ามีฟอร์มคัดกรองก่อน → prefill จากฟอร์มคัดกรอง แก้ใน OPD Note ได้ และไม่ sync กลับ (ทำงานถูกต้องแล้ว)
```

---

## Bug 5

**ชื่อ:** `[Bug][EMR][Setting form] - ติ๊ก "ซ่อน" ให้ Physical examination ในชุดแบบฟอร์ม SBH GENERAL OPD NOTE แล้วเปิด OPD Note section ยังกางอยู่`

**Severity ที่เสนอ:** Medium — ตั้งค่าแสดงผลเริ่มต้นของฟอร์มไม่ได้ตาม requirement (AC 16) แต่ยังกรอกและบันทึกฟอร์มได้ปกติ

```
# Test Result

### 1. Description:
* User: user1 (Super_User) · Env: DEV-X · Version: 2.9.0 · Date/Time: 20/10/2569 ~18:45
* Severity: Medium — ค่าที่ตั้งใน Setting form ไม่มีผลกับการแสดงผลของฟอร์ม
* etc.,: ชุดแบบฟอร์ม "SBH GENERAL OPD NOTE" (`sbh-general-opd-note`) · ทดสอบเปิดฟอร์มกับ HN 6931979 · EN E69102032186 · คลินิก ห้องตรวจสระบุรี
* TC ต้นทาง: TC-SBH-2457-017 (ตั้ง Collapse)

### 2. Steps reproduce:
1. ผู้ดูแลระบบ > แบบฟอร์ม > แบบฟอร์ม → แท็บ "แบบฟอร์ม EMR" → แถว "SBH GENERAL OPD NOTE" กด "เปิด"
2. แถว "5. Physical examination general" ติ๊ก "ซ่อน"
3. กด "บันทึก"
4. เปิดหน้าผู้ป่วยที่มี encounter คลินิก "ห้องตรวจสระบุรี" > tab "OPD" > "OPD Note"
5. ดู section "Physical Examination"
6. (คืนค่า) กลับไปเอาติ๊ก "ซ่อน" ออก แล้วกด "บันทึก"

### 3. Actual Result:
* ปัญหา: ตั้ง "ซ่อน" แล้ว section Physical Examination ใน OPD Note ยังกางอยู่
* เกิดที่: Setting form (ชุดแบบฟอร์ม SBH GENERAL OPD NOTE) → OPD › OPD Note › Physical Examination
* อาการ: บันทึกการตั้งค่าได้โดยไม่มีข้อความแจ้งเตือน แต่เปิด OPD Note ใหม่แล้วยังเห็นแถบ Rich text และตาราง System ของ Physical Examination ทันที ไม่ได้พับเหมือน section ที่ติ๊ก "ซ่อน" ไว้อยู่เดิม (Vital Signs, Body metric, Body Chart)
* เกิดซ้ำ: 1 รอบ
* ข้อสังเกต:
  * 3 section ที่ติ๊ก "ซ่อน" ไว้เดิม (Vital signs general, Body metric general, Body chart v2) พับอยู่จริงตอนเปิดฟอร์ม
  * OPD Note ของ encounter ที่ใช้ทดสอบเคยบันทึกไว้แล้ว — ยังไม่ได้ลองกับฟอร์มที่ยังไม่เคยบันทึก
  * คืนค่าแล้ว reload หน้าตั้งค่า ค่าตรงกับค่าเดิมครบ 9 แถว

① หน้าตั้งค่า ติ๊ก "ซ่อน" ก่อนบันทึก: 25b-setting-pe-hide-before-save.png
② หลังบันทึก: 25c-setting-pe-hide-after-save.png
③ เปิด OPD Note — Physical Examination ยังกางอยู่: 25d-opd-pe-collapsed-after-setting.png
④ คืนค่า: 25e-setting-pe-revert-before-save.png, 25f-setting-reverted.png
🎬 วิดีโอ: 08-sbh-setting-expand-collapse.webm

**รายละเอียดสำหรับ dev**
* บันทึกการตั้งค่า: `200 PUT /cortex-api/clinical-form-presets/11`
* หน้าตั้งค่า `/cortex/setting/admin/forms/presets/11/edit?tab=emr`
* ต้องให้ dev ยืนยันว่า ค่า "ซ่อน" มีผลกับฟอร์มที่เคยบันทึกแล้วหรือไม่ และมี cache ที่ทำให้ค่าใหม่ยังไม่ถูกใช้หรือไม่

### 4. Expected Result:
* ติ๊ก "ซ่อน" ใน Setting form แล้วเปิดฟอร์ม section นั้นต้องแสดงแบบพับ (Collapse) และเอาติ๊กออกต้องแสดงแบบกาง (Expand) (AC 16 · QA ยืนยัน "ซ่อน" = Collapse ตามหน้าตั้งค่า)
```
