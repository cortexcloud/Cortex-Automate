# เปิดการ์ดบั๊ก — รูปแบบ + รายการการ์ดที่เคยเปิด

ย้ายมาจาก cortex-card-test/SKILL.md ขั้น 9 เมื่อ 2026-11-12 (คำต่อคำ) · เปิดการ์ดบั๊กใบใหม่แล้วเพิ่ม 1 รายการต่อท้ายย่อหน้ารายการการ์ดด้านล่าง (ไม่ลงใน SKILL.md)

ผู้ใช้ให้ดูรูปแบบไว้เมื่อ 12 ต.ค. 2026 จากการ์ดที่ผู้ใช้เปิดเอง 2 ใบ ("เผื่ออนาคตจะให้คุณช่วยเปิดใหม่") · เจอสิ่งผิดปกติระหว่างเทส: รายงานผู้ใช้ + ลงเป็นข้อสังเกตในผล แล้วถามว่าจะเปิดไหม (ตัวเลือก ยังไม่เปิด / แบบ 1 / แบบ 2) · **ครั้งแรกที่ Claude เปิดเอง: SBH-2531 (14 ต.ค. 2026 · แบบ 2 Sub-Issue ใต้ SBH-2441 ตามที่ผู้ใช้เลือก)** · SBH-3192 (29 ต.ค. 2026 · แบบ 2 ใต้ SBH-1026 · 2 อาการ + Technical Details · ภาพใช้ assetUrl เดิมที่อัปโหลดให้ TC ไม่ต้องอัปโหลดซ้ำ · ก่อนเปิดเช็ค decisions / changelog ว่า session อื่นเจออาการเดียวกันไหม แล้วอ้างถึงกัน) · SBH-3355 (29 ต.ค. 2026 · แบบ 2 ใต้ SBH-1678 · 5 อาการคนละส่วนของฟอร์มเดียว → ผู้ใช้เลือก "การ์ดเดียว" · Technical Details) · SBH-3455 (31 ต.ค. 2026 · แบบ 2 ใต้ SBH-2593 · ห้องยาสร้างใบยาแล้วงานยาพยาบาลเปลี่ยนเอง · Assignee ผู้ใช้ · Technical Details · ภาพใช้ assetUrl ของ TC) · SBH-3449 (31 ต.ค. 2026 · แบบ 2 ใต้ SBH-2470 · 3 อาการ → ผู้ใช้เลือก "การ์ดเดียว" · Assignee ผู้ใช้ · Technical Details · ภาพใช้ assetUrl ที่อัปโหลดให้ TC) · SBH-3606 (31 ต.ค. 2026 · แบบ 2 ใต้ SBH-3117 · 2 อาการ (ช่องข้อความตั้งค่าว่าง · จอ TV ไม่ขึ้น Banner) → ผู้ใช้เลือก "การ์ดเดียว" · Assignee ผู้ใช้ · Technical Details · ภาพใช้ assetUrl ของ TC · **2 พ.ย. เพิ่มข้อ 3 ในการ์ดเดิม** (ผู้ใช้เจออาการใหม่ตอน Retest: patch `insert_before` หัว Technical Details + `append` bullet + ต่อท้ายชื่อ · ภาพ / คลิปฝังด้วย `prepare_file_upload` — R94) · SBH-3454 (31 ต.ค. 2026 · แบบ 2 ใต้ SBH-2618 · Lab ไม่สร้างงานพยาบาล — อาการเดียวกับ SBH-3158 ที่ยังไม่เคยเปิดการ์ด · Assignee ผู้ใช้ · Technical Details · ภาพใช้ assetUrl ของ TC-007) · SBH-3608 (1 พ.ย. 2026 · แบบ 2 ใต้ SBH-2236 · Task ปิด Visit 22:00 ไม่ทำงานบน dev-x (Visit OPD ไม่ถูกปิด) · ผู้ใช้สั่ง "สร้างการ์ดบัคเป็น Sub-issue" · Assignee ผู้ใช้ · Technical Details · ภาพใช้ assetUrl ของ TC-003) · SBH-3614 (2 พ.ย. 2026 · แบบ 2 ใต้ SBH-2529 การ์ดบั๊กที่ไม่มี TC · 2 อาการ (หัตถการลง Order Set ไม่ได้ · Package ใหม่สั่งที่หน้า Order ไม่ได้) → "การ์ดเดียว" · project ตามการ์ดแม่ `[SBH] Go-live planning` · label `VERSION 2.10.0` ตามรุ่น PR ของการ์ดแม่ · Assignee ผู้ใช้ · Technical Details · ภาพใช้ assetUrl ที่อัปโหลดให้ Comment) · SBH-3837 (3 พ.ย. 2026 · แบบ 2 ใต้ SBH-3350 · 2 อาการ (แก้เวลาประเมินได้ PUT 400 · Physician Note ไม่มีช่องบังคับ) การ์ดเดียว · label `VERSION 2.10.0` ตามรุ่น PR ของการ์ดแม่ · Assignee ผู้ใช้ · Technical Details · ภาพใช้ assetUrl ของ TC-004 / TC-048 · ผู้สร้างแสดงเป็นบัญชีของ connector) · SBH-3842 (3 พ.ย. 2026 · แบบ 2 ใต้ SBH-3182 · 7 อาการการ์ดเดียว (ผู้ใช้สั่ง) · Assignee ผู้ใช้ · สร้างด้วยบัญชี connector Pearsu (ผู้ใช้เลือก) · Technical Details · ข้อ 1–6 ใช้ assetUrl ของ TC · ข้อ 7 reproduce ใหม่ ภาพป้าย Actual + คลิปรวม) · SBH-3880 (3 พ.ย. 2026 · แบบ 2 ใต้ SBH-1016 · SBH Prod · 3 อาการการ์ดเดียว (ชื่อสิ่งที่แพ้เป็น JSON · key แปลภาษาดิบฟอร์มจำหน่าย OPD · ข้อความเลขเดิมหลังเลขซ้ำ) · Assignee ผู้ใช้ · สร้างด้วยบัญชี connector Pearsu (ผู้ใช้เลือก) · Technical Details · label VERSION 2.9.0 ตามการ์ดแม่ · ภาพใช้ assetUrl ของ TC) · SBH-3879 (3 พ.ย. 2026 · แบบ 2 ใต้ SBH-2265 · 2 อาการ (ใบนำทางว่างเพราะตัวกรอง en · ปลายทางไม่ตรงรหัส) การ์ดเดียว · label `VERSION 2.10.0` ตามรุ่น PR ของการ์ดแม่ · Assignee ผู้ใช้ · Technical Details · ภาพใช้ assetUrl ของ TC · ร่างให้ดูก่อน → "สร้างได้") · SBH-3895 (5 พ.ย. 2026 · **แบบ 1** การ์ดใหม่ใน `[SBH] ER` · ข้อสังเกตจากการทดสอบ SBH-2362 บน SBH Prod: ช่องแพทย์ใน Disposition แสดงเลข id · ผู้ใช้เลือก "เฉพาะ Practitioner" (ไม่เปิด React error #185 ที่เจอครั้งเดียว) · Milestone ตามการ์ดที่ทดสอบ · ภาพ = เฟรมจากคลิปที่ยังไม่มีกรอบของสคริปต์ (ffmpeg `-ss`) แล้วตีกรอบเส้นประแดง + ป้าย `Actual:` ด้วย Playwright `setContent` (`.cache/bug2362/annotate.cjs`) + ภาพฟอร์มย้อนหลังที่แสดงชื่อไว้เทียบ · Technical Details อ่าน `erDischargeSummaryHistory` snapshot แบบอ่านอย่างเดียว · Assignee ผู้ใช้ · connector Pearsu · ร่างให้ดูก่อน → "สร้างได้") · SBH-3883 (4 พ.ย. 2026 · แบบ 2 ใต้ SBH-3609 · 3 อาการการ์ดเดียว (ESI 5 ไม่มีโซนแนะนำ · ผู้ป่วยที่เพิ่มเองมีเลขนำหน้า · ER Arrival ไม่แสดงใน Visit) · ข้อ ESI 5 เก็บภาพด้วยเทส `@SBH-3609-BUG` (เหตุการณ์ 1 ราย ลบ member ท้ายงาน) · connector Pearsu (ผู้ใช้เลือก) · Assignee ผู้ใช้ · Technical Details · ภาพข้อ 2–3 ใช้ assetUrl ของ TC) · SBH-3885 (4 พ.ย. 2026 · แบบ 2 ใต้ SBH-2079 · 3 อาการการ์ดเดียว (ผู้ใช้เลือก) · Assignee ผู้ใช้ · connector Pearsu · VERSION 2.10.0 · Technical Details · ภาพใช้ assetUrl ของ TC) · SBH-3843 (3 พ.ย. 2026 · แบบ 2 ใต้ SBH-2947 · เจอจากขั้นตรวจเพิ่มของ TC-022 · reproduce ด้วยเทส `@SBH-2947-BUGNT` ผู้ป่วย AUTO · Assignee ผู้ใช้ · connector Pearsu · Technical Details) · SBH-3882 (4 พ.ย. 2026 · แบบ 2 ใต้ SBH-3181 · บอร์ดยังใช้ "Zone Isolate" (TC-004) · ร่าง 3 ข้อ → BA ยืนยันข้ออายุต่ำกว่า 1 ปี (TC-065 / 056) ไม่ใช่บั๊ก → TC เป็น Pass + Done on dev-x พร้อมหมายเหตุ BA · เหลือข้อเดียว · Assignee ผู้ใช้ · connector Pearsu (ผู้ใช้เลือก) · ภาพใช้ assetUrl ของ TC · เลข TC ใน Technical Details ต้องครอบ backtick ไม่งั้น `SBH-xxxx` ข้างในถูกแปลงเป็นลิงก์) · SBH-3884 (4 พ.ย. 2026 · **แบบ 1** การ์ดใหม่ใน `[SBH] ER` ไม่มีการ์ดแม่ — ผู้ใช้ส่งรูปบั๊กมาให้ Reproduce ไม่ได้มาจากการ์ดที่ทดสอบ · 3 อาการการ์ดเดียว (Continue ยา · Continue หัตถการ · One Day ในหน้าต่าง Physician Order ที่เปิดจาก + ORDER FOR CONTINUE ของ Order Summary ER ผู้ป่วยรอเตียง → ErrMedicationOrderInvalidContext) · Reproduce ด้วย `mock-data/_repro-continue-order.spec.ts` ผู้ป่วย AUTO ใหม่ · ป้ายกรอบใช้ `Actual:` แทน `Expected:` (Sub Agent ทักว่าการ์ดบั๊ก Expected อ่านกลับความหมาย) · ภาพ / คลิปอัปโหลดใหม่ (ชื่อไฟล์ ASCII) · Assignee ผู้ใช้ · connector Pearsu · Technical Details) · SBH-3906 (6 พ.ย. 2026 · แบบ 2 ใต้ SBH-2593 · SBH Prod · 2 ข้อ (รับ Order ทั้งหมดได้ 500 บางรายการ · Sign ยาซ้ำ Order Summary ไม่ถามแบบ Order Form) · ภาพข้อ 1 เป็นเฟรมคลิปตีกรอบด้วย setContent · ร่างให้ดูก่อน → "สร้างได้") · SBH-3897 (5 พ.ย. 2026 · **แบบ 1** ใน `[SBH] ER` · จาก TC-016 ของ SBH-1038 บน SBH Prod · ผู้ใช้เลือกเปิดเฉพาะเรื่อง Consult (แถวขอ Consult แสดงคลินิกต้นทาง + แพทย์ที่ถูกขอปรึกษาตอบกลับไม่ได้) ไม่เปิด TC-002 / CPR · Milestone ตามการ์ดที่ทดสอบ · ภาพ = เฟรมคลิปที่ยังไม่มีกรอบของสคริปต์ + กรอบเส้นประ / ป้าย `Actual:` (`.cache/bug1038/annotate.cjs`) · คลิปใช้ assetUrl ของ TC · Technical Details จาก API Timeline · Assignee ผู้ใช้ · connector Pearsu · ร่างให้ดูก่อน → "สร้างได้") · SBH-3914 (6 พ.ย. 2026 · **แบบ 1** ใน `[SBH] ER` · จาก TC-045 ของ SBH-3181 บน SBH Prod · 2 ข้อ (ตอบกลับ consult ไม่มีช่องคำตอบ · คำขอจาก ER ไม่ขึ้นใน OPD รายการปรึกษาแพทย์ › รับ Consult) · Milestone ตามการ์ดที่ทดสอบ · ภาพ = ภาพเทส / สำรวจ + กรอบเส้นประ / ป้าย `Actual:` (`.cache/bug3181/annotate.cjs`) ฝังด้วย prepare_file_upload · Technical Details จาก graphql consultRequests · Assignee ผู้ใช้ · connector Pearsu · ร่างให้ดูก่อน → "สร้างได้") · SBH-3918 (6 พ.ย. 2026 · แบบ 2 ใต้ SBH-2952 · SBH Prod · บันทึกฟอร์ม Trauma Detail For Pher Plus (Nurse) ได้ 503 STATE_UNAVAILABLE · label VERSION 2.9.1 ตามการ์ดแม่ · ภาพหน้าจอจริงตีกรอบ / ป้าย `Actual:` ด้วย setContent (`.cache/bug2952/annotate.cjs`) ฝังด้วย prepare_file_upload · คลิปใช้ assetUrl ของ TC-015 · Technical Details จาก response + trace · Assignee ผู้ใช้ · connector Nawin (Win) · ร่างให้ดูก่อน → "สร้างได้") · SBH-3919 (6 พ.ย. 2026 ดึก · แบบ 2 ใต้ SBH-2079 · SBH Prod · 5 ข้อการ์ดเดียว (ชื่อ รพ. อังกฤษ · Pain · Physical examination · ICD-10 สาเหตุเสียชีวิต · วินิจฉัยโดยแพทย์ ในเอกสาร ER Discharge Summary) · ภาพ = ตัดส่วน PDF จากภาพเทส + กรอบเส้นประ / ป้าย `Actual:` (`.cache/bug2079/annotate-r.cjs`) ฝังด้วย prepare_file_upload + ภาพต้นทาง / คลิปใช้ assetUrl ของ TC · label VERSION 2.10.0 · Assignee ผู้ใช้ · connector Nawin (Win) · ร่างให้ดูก่อน → "สร้างได้")
 · SBH-3962 (8 พ.ย. 2026 · แบบ 2 ใต้ SBH-3896 · SBH Prod · กรอบ Diagnosis general เอาออกผิดด้าน (ผู้ใช้ปรับ TC-001 เป็น Fail) · ภาพ = เฟรมคลิป TC-001 ก่อนสคริปต์ตีกรอบ + กรอบเส้นประ / ป้าย `Actual:` (`.cache/bug3896/annotate.cjs`) ฝังด้วย prepare_file_upload · Milestone + VERSION 2.10.0 ตามการ์ดแม่ · Technical Details จาก DOM dump ของเทส · Assignee ผู้ใช้ · connector Pearsu · ร่างให้ดูก่อน → "สร้างได้") — Bug Template · labels 3 ตัวแบบ SBH-2526 · milestone ว่าง (แบบ SBH-2526) · Assignee = ผู้ใช้ · สถานะ Waiting for Fixing Bugs · ไม่แตะสถานะการ์ดแม่ · ภาพของการ์ดบั๊กต้องเห็นแจ้งเตือน error ชัด — ภาพจากเทสถ่ายช้าไป ให้กดซ้ำกับผู้ป่วยสำรวจแล้วถ่ายทันทีที่แจ้งเตือนขึ้น

มี 2 แบบ (ผู้ใช้บอก — **ถามทุกครั้งว่าใช้แบบไหน** ผู้ใช้ยังไม่ได้บอกเกณฑ์เลือก):

| แบบ | ตัวอย่าง | ตั้งค่า |
|---|---|---|
| 1 การ์ดใหม่ในโปรเจกต์ ER | SBH-2528 (ดูประวัติ Disposition — บั๊กที่เจอจากการ์ด SBH-2462) | ไม่มี parent · ไม่ผูก relation · project `[SBH] ER` |
| 2 Sub-Issue ของการ์ดที่ทดสอบ (แบบเดียวกับ Test Case) | SBH-2526 (กด Expand CPR Timeline ไม่ได้ — บั๊กของการ์ด SBH-2442) | `parentId` = **การ์ด requirement** (ไม่ใช่ EXE / SC / TC) · การ์ดแม่ถูกปรับเป็น `Waiting for Fixing Bugs` (ผู้ใช้ปรับเอง) |

ค่าที่เหมือนกันทั้ง 2 ใบ:

- Template: **`Bug Template`** ของทีม SBH (id `e1c6151d-de8c-4ab8-b440-e058287059f5` — ไม่ใช่ `QA Bug` ของ workspace) · template ตั้งสถานะ `Backlog` + label 🐞 BUG ให้ แล้วผู้ใช้เปลี่ยนสถานะเป็น `Todo` (SBH-2528) / `Waiting for Fixing Bugs` (SBH-2526)
- ชื่อการ์ด: `[Bug][ER][<ชื่อฟีเจอร์>] - <สรุปอาการสั้นๆ>` เช่น `[Bug][ER][Treatment Timeline] - ไม่สามารถกดปุ่ม Expend ได้ หรือ ไม่ Expend Auto`
- Project `[SBH] ER` · Milestone เดียวกับการ์ดต้นเรื่อง (`ER – 4th -- Other documentation`) · Priority `High`
- Label: `🐞 BUG` · `VERSION 2.9.0` (รุ่นที่ทีมกำลังทำ ณ วันที่เปิด — ไม่ใช่รุ่นของการ์ดต้นเรื่องซึ่งเป็น 2.8.1) · `Natthaphat ( MOD ) 🙈`
- Assignee: SBH-2528 = jetsadaporn (Dew) · SBH-2526 = ผู้ใช้เอง — **ไม่มีกฎตายตัว ถามผู้ใช้**
- ไม่มี Comment · ไม่มีไฟล์แนบแยก (ภาพฝังใน description)

เนื้อหา (Bug Template ที่ผู้ใช้ตัดหัวข้อที่ไม่ใช้ออก — ไม่มี Device/OS · Browser · Steps to Reproduce · Technical Details):

```markdown
### **1. Environment & Context**

Help the dev recreate your world.

* **URL/Environment:** Dev-X , SBH Prod
* **User Account:** User1

### **2. Description**

1. <อาการข้อที่ 1 — 1 บรรทัด>

* **Expected Result:** <ระบบต้อง…>
* **Actual Result:** <สิ่งที่เกิดจริง>

<ภาพของข้อ 1>

2. <อาการข้อที่ 2>

* **Expected Result:** …
* **Actual Result:** …

<ภาพของข้อ 2>

### **3. Visual Evidence**   ← มีเฉพาะ SBH-2526 (ข้อเดียว ภาพรวมไว้ท้ายการ์ด) · SBH-2528 วางภาพใต้แต่ละข้อแทน
```

- หลายอาการของฟีเจอร์เดียวกัน = **การ์ดเดียว** แยกเป็นข้อเลข แต่ละข้อมี Expected / Actual + ภาพของตัวเอง
- ภาพของผู้ใช้: ภาพหน้าจอจริง ตีกรอบ**เส้นประสีแดง**ตรงจุดที่ผิด + ลูกศรแดงโยงจากจุดที่กดไปยังผล · วาง 2 หน้าจอเทียบกันในภาพเดียวได้ (ไม่มีตารางเทียบค่าของสคริปต์) → ใช้ภาพหลักฐานของเทส (กรอบแดง `Expected`) ได้ แต่เลือกภาพที่ไม่มีตารางกรอบเขียวบัง หรือถ่ายใหม่
- ภาษา: หัวข้อตาม template (อังกฤษ) · เนื้อหาไทยสั้นๆ ประโยคเดียวต่อช่อง
- ก่อนเปิด ถามผู้ใช้ครั้งเดียว: แบบ 1 หรือ 2 · Assignee · ระบบที่ใส่ใน Environment (ใส่เฉพาะระบบที่เห็นอาการจริง) · จะใส่ผลตรวจเชิงเทคนิค (ค่าจาก API / สาเหตุที่หาได้) เป็นหัวข้อ `Technical Details` ของ template ไหม (การ์ดของผู้ใช้ 2 ใบไม่มี)
