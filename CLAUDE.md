# Cortex Automate — กฎของโปรเจกต์

## กฎการเขียนภาษา

- **เขียนข้อความให้คนอ่านทุกครั้ง ต้องอ่าน skill `plain-writing-th` ก่อนเสมอ** (`.claude/skills/plain-writing-th/SKILL.md`)
  - ใช้กับคำตอบใน chat, เอกสาร/slide/report, การ์ด Linear, `TODO.md` และ content ที่ใส่ลงไฟล์/ระบบ/UI
  - หลักภาษา: ไทยเป็นหลัก ศัพท์ technical เป็นภาษาอังกฤษ ไม่ใส่คำลงท้าย บรรทัดแรกเป็นข้อสรุป
  - **ไม่ใช้กับของใน repo** เช่น commit, PR, code comment, README ให้ตาม convention ของ repo
  - ข้อความ UI ให้ใช้มาตรฐานของทีมก่อน ถ้ามี
- **เขียน/แก้การ์ด bug ให้ใช้ skill `qa-bug-writer`** (`.claude/skills/qa-bug-writer/SKILL.md`)
  - skill เฉพาะทาง (`qa-bug-writer`, `linear-testcase-writer`) กำหนด **โครง** ส่วน `plain-writing-th` กำหนด **ภาษา**
