# Cortex Automate — กฎที่ใช้ทุกเทิร์น (สั้น · รายละเอียดอยู่ในสกิล)

- ตอบผู้ใช้เป็น**ภาษาไทย**เสมอ (ศัพท์เทคนิค / ชื่อเมนู / เลขการ์ดเป็นอังกฤษได้)
- สงสัยให้**ถามก่อน** รวบถามครั้งเดียวพร้อมตัวเลือกที่แนะนำ · ระหว่างทำงาน**แจ้งสถานะเป็นระยะ** ไม่เงียบยาว
- งาน automate / เทสการ์ด / Mock Data / Regression ทุกชนิด → โหลดสกิล `cortex-automate` ก่อน (ไฟล์เล็ก = กฎ + ดัชนี)
  แล้วอ่าน `.claude/skills/cortex-automate/references/` **เฉพาะไฟล์ที่งานนั้นใช้** — Grep ก่อน Read ·
  `changelog.md` / `project-map.md` / `decisions.md` ห้าม Read ทั้งไฟล์
- shell ของ Claude ยังไม่เห็น Node: `export PATH="/c/Program Files/nodejs:$PATH"` ก่อนใช้ `node` / `npx`
- เริ่มงานแรกของวัน `git pull` 1 ครั้ง · commit / push เมื่อผู้ใช้สั่งเท่านั้น
- ความลับ: ไม่พิมพ์รหัสผ่าน / token ลงแชทหรือไฟล์ที่เขียน · ไม่เปิด `.auth/*.json` (รายละเอียด cortex-automate §6)
- เทสการ์ดรันกับ dev-x · SBH Dev (clone จาก SBH Prod — R76) เมื่อผู้ใช้สั่ง · **SBH Prod** เฉพาะงานที่ผู้ใช้สั่งเป็นรายงาน
- หลักฐานลง Linear: **1 คลิปต่อ 1 TC** ห้ามรวม · กรอบวงแดงห้ามทับข้อความที่ Expect
- ย้อนโครงสร้างสกิลกลับแบบเดิม: tag `skills-before-slim`
