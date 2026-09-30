# Cortex Automate

QA Automation สำหรับ Cortex Cloud HIS (dev-x) ด้วย Playwright + TypeScript

## ติดตั้งครั้งแรก

1. Node.js 24 LTS (`winget install OpenJS.NodeJS.LTS`)
2. `npm install`
3. `npx playwright install ffmpeg` (ใช้อัดวิดีโอผลเทสทุกรอบ — ตัว browser ใช้ Google Chrome ที่มีในเครื่อง)
   ถ้าวันหลังเทส fail ว่า `Executable doesn't exist ... ffmpeg` ให้รันคำสั่งนี้ใหม่ (เคยหายหลังใช้ Playwright MCP)
4. คัดลอก `.env.example` เป็น `.env` แล้วกรอก user ทดสอบแยกตาม role (`CORTEX_USERNAME_<Role>` / `CORTEX_PASSWORD_<Role>` เช่น Super_User, Doctor, Nurse)

## รัน

| คำสั่ง | ทำอะไร |
|--------|--------|
| `npm test` | รันทั้งหมด (ไม่เปิดจอ) |
| `npx playwright test --grep @SBH-1013` | รันเฉพาะการ์ด (ใส่เลข TC ก็ได้ เช่น `@SBH-1709`) |
| `npm run test:module:er` | รันเฉพาะเทสของ module ER (`tests/modules/er`) — module ใหม่เพิ่ม script คู่กันตาม pattern นี้ |
| `npm run test:e2e` | รันเทส flow e2e ที่ข้ามหลาย module ทั้งหมด (`tests/E2E`) |
| `npm run test:headed` | รันแบบเปิดจอให้เห็น |
| `npm run test:ui` | โหมด UI เลือกเทสและดูทีละ step (เตรียม session ให้ก่อน) — อย่าใช้ `npx playwright test --ui` เฉยๆ จะเห็นแค่ขั้นล็อกอิน |
| `npm run report` | เปิดรายงานผลล่าสุด |
| `npm run codegen` | อัดการกดบนหน้าจอเป็นโค้ด |

รายงาน (`npm run report`): ทุกเทสมีวิดีโอทั้งตอนผ่านและตอน fail (เริ่มอัดหลังแอปโหลดเสร็จ ไม่มีช่วงจอขาว) ·
step ที่ขึ้นต้นด้วย TC-xxx มีภาพหน้าจอแนบ ("ผ่าน — …" ตอนเช็คผลที่คาดหวังครบ / "Error — …" ตอนพัง) — **กรอบแดงในภาพ = จุดที่เทสเช็ค** ·
TC ที่เช็คหลายสถานะ (เช่น เลือกแล้วยกเลิก) มีภาพแยกทีละสถานะใน step ย่อย
ขั้น "ล็อกอิน <Role>" มีวิดีโอเฉพาะรอบที่ล็อกอินใหม่ — รอบที่ใช้ session เดิมไม่ได้เปิดหน้าเว็บ (ดูหมายเหตุ `session` ในรายงาน)
ไฟล์เดียวกันอยู่ที่ `test-results/<ชื่อเทส>/` ด้วย — ทั้งสองโฟลเดอร์ถูกล้างเมื่อรันรอบใหม่ ถ้าจะเก็บเป็นหลักฐานให้คัดลอกออกไปก่อน

ข้อมูลบน dev-x ที่เทส SBH-1021 ใช้ต่อรอบ: สร้างผู้ป่วย `AUTO Triage…` ใหม่ 1 ราย + Visit ER แล้ว**บันทึก Triage** (ESI 4) → ผู้ป่วยอยู่คอลัมน์โซนเหลือง ER บนบอร์ด (ทิ้งไว้ได้)

ข้อมูลบน dev-x ที่เทส SBH-1013 ใช้ต่อรอบ:
- ผู้ป่วยใหม่: สร้างผู้ป่วย `AUTO` ใหม่ 1 ราย (ค้นชื่อก่อนว่าไม่เคยมีในระบบ) + Visit ER ทิ้งไว้บนบอร์ด
- ผู้ป่วยมี HN: สุ่มผู้ป่วยทดสอบของทีม (ชื่อขึ้นต้น "คนไข้") ที่ไม่มี Visit / Admission ค้าง → เปิด Visit แล้ว**ยกเลิก Encounter ท้ายเทสทุกครั้ง** (เทสพังกลางทางก็ยกเลิกให้)
  ถ้าการยกเลิกไม่สำเร็จ รายงานจะบอก HN / EN ให้ไปกด "ยกเลิก Encounter" เองที่ ER Dashboard

ทุกรอบจะเตรียม session ก่อน (`tests/auth.setup.ts`): session เดิมใน `.auth/<Role>.json` ยังไม่หมดอายุก็ใช้ต่อ (~1 วินาที) ไม่งั้นล็อกอินใหม่ (~22 วินาที)
บังคับล็อกอินใหม่: ลบไฟล์ใน `.auth/` (แก้ `.env` ก็ล็อกอินใหม่เอง)

เทสใช้ Super_User เป็นค่าตั้งต้น — ถ้าต้องใช้ role อื่น เพิ่มชื่อ role ใน `ROLES_IN_USE` (`utils/env.ts`) แล้วใส่ในไฟล์เทส:

```ts
import { authFile } from '../../utils/env';
test.use({ storageState: authFile('Doctor') });
```

กฎและขั้นตอนการทำงานของโปรเจกต์อยู่ที่ `.claude/skills/cortex-automate/SKILL.md`
ขั้นตอนก่อนจะเขียน automate (ร่าง TC → QA review → ยืนยันกับแอปจริง) เป็นมาตรฐานทีม QA แยกไว้ที่ `.claude/skills/qa-automate-readiness/SKILL.md`
