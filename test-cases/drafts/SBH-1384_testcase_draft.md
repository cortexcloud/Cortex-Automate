# Draft Test Structure — SBH-1384

> สถานะ: **สร้างใน Linear แล้ว (2026-10-15)**
> - EXE SBH-2619 → HPY SBH-2620 (TC 001–003 = SBH-2621–2623)
> - Run Type CT · QA Module: OPD · QA Sub-module / Feature : Refer Out Document (label ใหม่ สร้างแล้ว)
> - Env: **SBH Prod อย่างเดียว** (ผู้ใช้สั่ง) · ใส่เฉพาะ TC [Required]
> - เอกสารผูกกับคนไข้ ไม่ได้ผูกกับ VN และไม่ต้องเลือก VN ก่อนบันทึก (ผู้ใช้ยืนยัน 2026-10-15) → ตัด TC ตรวจการผูก visit และ Scenario UHP · เหลือ 3 TC
> - ตอนสร้างจริง body ของ TC ใช้รูปแบบ SBH-1972 มีช่อง Test Result เฉพาะ (Env: SBH Prod)

Requirement: SBH-1384 — [Bug] [OPD] [EMR] - แก้ไขข้อมูลคนไข้แล้วสร้างเอกสาร Refer Out ไม่สำเร็จ
URL: https://linear.app/cortexcloud/issue/SBH-1384
Project: UAT#2 OPD EMR CPOE · Team: SBH Project · Priority: Urgent · State: Testing
Labels: 🐞 BUG, SBH UAT D3 - OPD, For OPD Biz Sim - SBH, VERSION 2.9.0 · Assignee: Suchat Chancherngsilapakul · ผูก Cycle อยู่
Sub-Issue: SBH-2353 (งานแก้ของ Dev — Done) มี Acceptance Criteria เพิ่มเติม

แหล่ง AC
- การ์ดบั๊ก: Expected Result "ระบบควรสร้างเอกสารได้แม้จะมีการแก้ไขข้อมูลคนไข้" + Steps to Reproduce 6 ขั้น (จบที่กด View)
- SBH-2353 AC: (1) payload referral มี vn / en (2) Service History → Edit Visit คง visit context (3) Report 121 ที่ไม่มี context ต้องเลือก visit ก่อนบันทึก (4) referral ที่บันทึกผูกกับ visit ที่เลือก

| ที่มา | เนื้อหา | TC |
|---|---|---|
| การ์ดบั๊ก Expected | แก้ไขข้อมูลผู้ป่วยแล้วสร้างเอกสาร Refer Out ได้ ไม่ต้องออกจาก EMR | 001, 002 |
| SBH-2353 AC4 | referral ที่บันทึกผูกกับ visit ที่เลือก | ไม่สร้าง TC — เอกสารผูกกับคนไข้ ไม่ได้ผูกกับ VN (ผู้ใช้ยืนยัน 2026-10-15) |
| SBH-2353 AC2 | Service History → Edit Visit คง visit context | 003 |
| SBH-2353 AC3 | ไม่มี visit context ต้องเลือก visit ก่อนบันทึก | ไม่สร้าง TC — ไม่ต้องเลือก VN ก่อนบันทึก (ผู้ใช้ยืนยัน 2026-10-15) |
| SBH-2353 AC1 | payload มี vn / en | ไม่สร้าง TC — technical (ตรวจทางอ้อมผ่าน 001) |

---

## EXE - CT - 2.9.0

Status: Ready for Testing · Assignee: Suchat Chancherngsilapakul · Project: UAT#2 OPD EMR CPOE
Labels: 🐞 BUG, SBH UAT D3 - OPD, For OPD Biz Sim - SBH, VERSION 2.9.0, QA Module: OPD, QA Sub-module / Feature : Refer Out Document, QA Run : Cycle Test

```
ข้อมูลรอบทดสอบ
- ประเภทการทดสอบ: CT
- Scope / Version: 2.9.0
- Module: OPD / EMR
- Requirement ที่อ้างอิง: SBH-1384 — [Bug] [OPD] [EMR] - แก้ไขข้อมูลคนไข้แล้วสร้างเอกสาร Refer Out ไม่สำเร็จ
- Environment: SBH Prod
- อนุมัติโดย: -

ขอบเขตการทดสอบ
- สร้างเอกสาร Refer Out หลังแก้ไขข้อมูลผู้ป่วยในหน้า EMR (Expected Result ของบั๊ก)
- สร้างเอกสาร Refer Out หลังแก้ไข Visit จากประวัติรับบริการ (SBH-2353)

หมายเหตุ
- สร้างจาก Acceptance Criteria ของ requirement โดยตรง
- ไม่รวม BDD ตามกติกาปัจจุบัน
- ทดสอบบน SBH Prod อย่างเดียว ใช้ผู้ป่วยทดสอบ ไม่ใช่ผู้ป่วยจริง
```

---

## TS-SBH-1384-HPY - สร้างเอกสาร Refer Out สำเร็จหลังแก้ไขข้อมูลผู้ป่วยหรือ Visit

Status: Ready for Testing · Labels: requirement labels + QA Module: OPD + QA Sub-module / Feature : Refer Out Document + QA Case : Happy

```
ข้อมูลอ้างอิง
- Scenario ID: TS-SBH-1384-HPY
- Case Type: Happy
- Suffix: HPY
- Module: OPD / EMR
- Requirement ที่อ้างอิง: SBH-1384 — [Bug] [OPD] [EMR] - แก้ไขข้อมูลคนไข้แล้วสร้างเอกสาร Refer Out ไม่สำเร็จ

วัตถุประสงค์
- ยืนยันว่าหลังแก้ไขข้อมูลผู้ป่วยหรือแก้ไข Visit ในหน้า EMR แล้ว สร้างและเปิดดูเอกสาร Refer Out ได้ทันที

ขอบเขต Requirement
- Expected Result ของบั๊ก: สร้างเอกสารได้แม้จะมีการแก้ไขข้อมูลคนไข้
- SBH-2353 AC2: Service History → Edit Visit คง visit context

ความเสี่ยง
- ผู้ใช้ต้องออกจาก EMR แล้วเข้าใหม่ทุกครั้งที่แก้ข้อมูลผู้ป่วย ทำให้ส่งต่อผู้ป่วยล่าช้า

หมายเหตุ
- อิงตาม Acceptance Criteria ของ requirement
```

### [Required] TC-SBH-1384-001 - บันทึกเอกสารส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อสำเร็จ หลังแก้ไขข้อมูลผู้ป่วยโดยไม่ออกจากหน้า EMR

Status: Not Run · Labels: requirement labels + QA Module: OPD + QA Sub-module / Feature : Refer Out Document + QA Case : Happy + QA Type : Functional + QA Execution Type: Manual

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1384-001
- Scenario ID: TS-SBH-1384-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: Urgent
- Requirement ที่อ้างอิง: SBH-1384 — [Bug] [OPD] [EMR] - แก้ไขข้อมูลคนไข้แล้วสร้างเอกสาร Refer Out ไม่สำเร็จ

Preconditions
1. Login SBH Prod ด้วย user ที่มีสิทธิ์ OPD / EMR
2. มีผู้ป่วยทดสอบที่มี OPD visit เปิดอยู่ และเปิดหน้า EMR ของ visit นั้นแล้ว

Test Data
- ผู้ป่วยทดสอบบน SBH Prod 1 ราย (ไม่ใช่ผู้ป่วยจริง)
- ข้อมูลเอกสาร: สถานพยาบาลปลายทาง · ประเภทการส่งต่อ · การวินิจฉัยโรคขั้นต้น · สาเหตุการส่งต่อ

Test Steps
1. แท็บซ้าย > ทะเบียนผู้ป่วย
2. แก้ไขข้อมูลผู้ป่วย > แก้ไขข้อมูล 1 ช่อง > กดบันทึก
3. แท็บซ้าย > เอกสาร (ไม่ออกจากหน้า EMR)
4. กดสร้างเอกสาร > เลือก "แบบสำหรับส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อ"
5. กรอกข้อมูลที่บังคับ > กดบันทึก

Expected Result
- บันทึกเอกสารสำเร็จ ไม่มีแจ้งเตือน "สร้างแบบสำหรับส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อไม่สำเร็จ" และเอกสารแสดงในรายการเอกสาร

Actual Result
- -

หมายเหตุ
- Expected Result ของการ์ดบั๊ก · Steps to Reproduce ข้อ 1–5
```

### [Required] TC-SBH-1384-002 - ทดสอบกด View เปิดดูเอกสารส่งต่อที่สร้างหลังแก้ไขข้อมูลผู้ป่วย

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1384-002
- Scenario ID: TS-SBH-1384-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1384 — [Bug] [OPD] [EMR] - แก้ไขข้อมูลคนไข้แล้วสร้างเอกสาร Refer Out ไม่สำเร็จ

Preconditions
1. ทำ TC-SBH-1384-001 แล้ว (มีเอกสารส่งต่อที่สร้างหลังแก้ไขข้อมูลผู้ป่วย)

Test Data
- เอกสารจาก TC-SBH-1384-001

Test Steps
1. ในรายการเอกสาร กดปุ่ม "View" ของเอกสารที่สร้าง

Expected Result
- เปิดเอกสารแบบสำหรับส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อได้ และแสดงข้อมูลตามที่กรอก

Actual Result
- -

หมายเหตุ
- Steps to Reproduce ข้อ 6 ของการ์ดบั๊ก
```

### [Required] TC-SBH-1384-003 - บันทึกเอกสารส่งต่อสำเร็จ หลังแก้ไข Visit จากประวัติรับบริการ

Status: Not Run · Labels: เหมือน TC-001

```
ข้อมูลอ้างอิง
- TC ID: TC-SBH-1384-003
- Scenario ID: TS-SBH-1384-HPY
- Case Type: Happy
- Test Level: System
- Test Type: Functional
- Priority: High
- Requirement ที่อ้างอิง: SBH-1384 — [Bug] [OPD] [EMR] - แก้ไขข้อมูลคนไข้แล้วสร้างเอกสาร Refer Out ไม่สำเร็จ

Preconditions
1. Login SBH Prod ด้วย user ที่มีสิทธิ์ OPD / EMR
2. ผู้ป่วยทดสอบมี OPD visit อย่างน้อย 1 รายการในประวัติรับบริการ

Test Data
- ผู้ป่วยทดสอบบน SBH Prod 1 ราย

Test Steps
1. เปิดประวัติรับบริการ (Service History) ของผู้ป่วย
2. เลือก visit แล้วกดแก้ไข Visit > แก้ไขข้อมูล > กดบันทึก
3. แท็บซ้าย > เอกสาร > สร้างเอกสาร "แบบสำหรับส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อ"
4. กรอกข้อมูลที่บังคับ > กดบันทึก

Expected Result
- บันทึกเอกสารสำเร็จ ไม่มีแจ้งเตือน "สร้างแบบสำหรับส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อไม่สำเร็จ" และเอกสารแสดงในรายการเอกสารของผู้ป่วย

Actual Result
- -

หมายเหตุ
- SBH-2353 AC2 (Service History → Edit Visit คง visit context) · เอกสารผูกกับคนไข้ ไม่ได้ผูกกับ VN (ผู้ใช้ยืนยัน 2026-10-15)
```

---

## Requirement gap (นอกลำดับชั้น)

Expected behavior
- ไม่ระบุว่าเอกสารส่งต่อที่สร้างหลังแก้ไขข้อมูลผู้ป่วย ต้องแสดงข้อมูลผู้ป่วยชุดใหม่ที่แก้หรือไม่
- version ไม่ตรงกัน: label การ์ด = VERSION 2.9.0 แต่ชื่อ PR ของ SBH-2353 = V2.8.0 (ร่างนี้ใช้ 2.9.0 ตาม label)

Validation
- -

Error handling
- -

Permission / role
- ไม่ระบุ role ที่สร้างเอกสารส่งต่อได้ (ใช้ User1 ตามการ์ดบั๊ก)

Edge cases
- เอกสารประเภทอื่นในหน้าเอกสาร (Report อื่นนอกจาก 121) หลังแก้ไขข้อมูลผู้ป่วย ได้ผลกระทบเดียวกันหรือไม่ — การ์ดไม่ได้ระบุ
