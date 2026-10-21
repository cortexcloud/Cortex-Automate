# SBH-2457 — ร่างการ์ด bug (ยังไม่สร้างใน Linear)

- ที่มา: ผลสำรวจแอปจริงบนฟอร์ม SBH (คลินิก "ห้องตรวจสระบุรี") 20 ต.ค. 2569 — ดูหัวข้อ "ผลสำรวจแอปจริง" ใน `SBH-2457-opd-note-pre-assessment.md`
- กติกา: QA สั่ง (21 ต.ค. 2569) ว่าข้อไหนหน้าจอไม่มีตาม AC ให้ตีเป็น bug
- สถานะ: **ร่างให้ QA review** · สร้างจริงใน Linear หลัง QA approve เท่านั้น
- เสนอการแบ่งการ์ด: 3 ใบ (ไฟล์แนบรวม 2 ฟอร์มไว้ใบเดียวเพราะอาการเดียวกัน) · วางเป็น sub-issue ของ SBH-2457 · template QA Bug · ไม่ assign · severity เป็นค่าที่เสนอ รอ QA ยืนยัน
- หลักฐานทั้งหมดอยู่ที่ `.playwright-mcp/SBH-2457/explore/` — ตอนสร้างจริงจะอัปโหลดแนบใต้ Actual Result
- TC ต้นทางยังเป็น draft ในไฟล์ ยังไม่มีการ์ดใน Linear — ตอนสร้างจริงจะใส่ลิงก์เมื่อมีการ์ด TC

ยังไม่รวมเป็น bug ในรอบนี้:
- **CC/PI ใน OPD Note** — ทดสอบตาม flow ที่ QA อธิบายแล้ว (21 ต.ค. 2569) prefill + แก้ใน OPD Note + ไม่ sync กลับ **ทำงานถูกต้อง** จึงไม่เป็น bug · เหลือคำถามกรณีกรอก OPD Note ก่อนมีฟอร์มคัดกรอง (รอบ 20 ต.ค. ค่าหายหลัง reload)
- **AC 16 ตั้งค่าแล้วฟอร์มไม่เปลี่ยนตาม** — รอยืนยันว่า checkbox "ซ่อน" = ตัวตั้ง Expand/Collapse

---

## Bug 1

**ชื่อ:** `[Bug][EMR][OPD Note/ฟอร์มคัดกรอง] - แนบไฟล์ในเอกสารแนบของ OPD Note และฟอร์มคัดกรอง (SBH) แล้วบันทึก ไฟล์หายหลัง reload`

**Severity ที่เสนอ:** High — ผู้ใช้เห็นชื่อไฟล์ขึ้นและกดบันทึกได้ตามปกติ จึงเข้าใจว่าแนบสำเร็จ แต่เอกสารไม่ได้ถูกเก็บไว้กับฟอร์ม

```
# Test Result

### 1. Description:
* User: user1 (Super_User) · Env: DEV-X · Version: 2.9.0 · Date/Time: 20/10/2569 15:41–15:49
* Severity: High — ผู้ใช้เข้าใจว่าแนบเอกสารแล้ว แต่เอกสารหายจากฟอร์มโดยไม่มีอะไรเตือน
* etc.,: HN 6931979 · VN V69102027456 · EN E69102032186 · คลินิก ห้องตรวจสระบุรี
* TC ต้นทาง: TC-SBH-2457-007 (OPD Note), TC-SBH-2457-015 (ฟอร์มคัดกรอง)

### 2. Steps reproduce:
1. เปิดหน้าผู้ป่วยที่มี encounter คลินิก "ห้องตรวจสระบุรี" (เช็คอินแล้ว) > tab "OPD" > "OPD Note"
2. ที่ section "เอกสารแนบ" กด "+ เพิ่มรายการ"
3. ชื่อเอกสาร เลือก "อื่นๆ" · รายละเอียดเอกสาร กรอก "QA-SBH2457 attachment"
4. กด "อัปโหลด" แล้วเลือกไฟล์ PDF — ชื่อไฟล์ขึ้นในแถว (ระบบตั้งชื่อเป็น "other-6-69.pdf")
5. กด "สร้าง"
6. Reload หน้า แล้วเปิด "OPD Note" เดิม
7. ทำซ้ำข้อ 2–6 ที่ "ฟอร์มคัดกรอง" (ชื่อไฟล์ที่ระบบตั้ง "other-7-69.pdf")

### 3. Actual Result:
* ปัญหา: แนบไฟล์แล้วบันทึกฟอร์มได้ แต่หลัง reload แถวเอกสารแนบหายไป
* เกิดที่: OPD › OPD Note › เอกสารแนบ และ OPD › ฟอร์มคัดกรอง › เอกสารแนบ
* อาการ: ก่อนบันทึกเห็นชื่อไฟล์ในแถว กด "สร้าง" แล้วไม่มีข้อความแจ้งเตือนใด ๆ ผู้ใช้จะเข้าใจว่าแนบสำเร็จ แต่หลัง reload section "เอกสารแนบ" ว่าง ส่วนข้อมูล section อื่นในฟอร์มเดียวกันยังอยู่ครบ
* เกิดซ้ำ: เกิดทั้ง 2 ฟอร์มที่ลอง (ฟอร์มละ 1 รอบ)
* ข้อสังเกต:
  * ฟอร์มของคลินิกห้องตรวจโรคอายุรกรรมทั่วไป (template อื่น) ก็เกิดอาการเดียวกัน 2 รอบ
  * ไฟล์ที่ใช้เป็น PDF ขนาดเล็กที่ QA สร้างเอง — ควรลองซ้ำด้วยไฟล์เอกสารจริง
  * ลองอัปโหลดไฟล์ PNG แล้วระบบไม่รับ (ดูรายละเอียดสำหรับ dev) และหลังจากนั้นกด "สร้าง" แล้วฟอร์มไม่ถูกบันทึก
  * วันถัดมา (21/10/2569 09:55) เปิด OPD Note เดิม แถว "other-6-69.pdf" กลับมาแสดง แต่ช่องชื่อเอกสารว่าง ขึ้น "กรุณาเลือกชื่อเอกสาร" และกด "สร้าง" แล้วไม่บันทึกทั้งฟอร์ม จนกว่าจะเลือกชื่อเอกสารใหม่ · เลือก "อื่นๆ" แล้วบันทึก (201) → reload แถวไฟล์แนบหายอีก (รวม 3 รอบที่ OPD Note)
  * ภาพเพิ่ม: 26e-opd-attachment-row-back-name-empty.png, 26i-opd-attachment-after-reload.png · วิดีโอ 09-sbh-cc-pi-prefill-nosync.webm

① ก่อนบันทึก — เห็นชื่อไฟล์ในแถว: 20g-sbh-opd-attachment.png, 24a-sbh-scr-create-before.png
② หลัง reload — section เอกสารแนบว่าง: 21f-sbh-opd-after-reload-attachment-dx.png, 24d-sbh-scr-after-reload-2.png
③ ลองไฟล์ PNG: 22a-sbh-opd-attach-png-before-save.png, 22b-sbh-opd-attach-png-after-reload.png
🎬 วิดีโอ: 06-sbh-opd-note.webm, 07-sbh-screening.webm

**รายละเอียดสำหรับ dev**
* อัปโหลด PDF: `201 POST /cortex-api/documents/upload-by-hn` ทั้ง 2 ฟอร์ม
* บันทึกฟอร์ม: `201 POST /cortex-api/clinical-form-legacy/rest/openehr/v1/ehr/{ehr_id}/contribution` (template `sbh_general_opd_note_v2`, `sbh_general_opd_pre_assessment_v2`)
* อัปโหลด PNG: `422 POST /cortex-api/documents/upload-by-hn` · กด "สร้าง" หลังจากนั้นไม่มี request contribution
* ต้องให้ dev ยืนยันว่า ข้อมูลไฟล์แนบถูกส่งไปใน composition หรือไม่ และระบบรับไฟล์ชนิดไหนบ้าง

### 4. Expected Result:
* แนบไฟล์แล้วบันทึก หลัง reload แถวเอกสารแนบยังอยู่ พร้อมชื่อเอกสาร รายละเอียด และไฟล์ที่เปิดดูได้
* ถ้าไฟล์ชนิดนั้นแนบไม่ได้ ต้องมีข้อความบอกผู้ใช้
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
