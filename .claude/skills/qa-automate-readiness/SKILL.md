---
name: qa-automate-readiness
description: >
  Workflow gate ที่ QA ทุกคนต้องทำเหมือนกันก่อนแปลงการ์ด Linear / requirement / use case / test step / workflow ให้เป็น
  automate test — วิเคราะห์และร่างเทสเคสก่อนเสมอ (ผ่าน skill linear-testcase-writer) → เก็บเป็น .md ให้ QA review และ
  approve → ขอยืนยันไปสำรวจแอปจริงตาม requirement พร้อมหลักฐานวิดีโอ/ภาพ → ยืนยันว่าผลตรงกับที่ร่างไว้แล้วเท่านั้นถึงส่งต่อ
  ไปเขียน automate จริงได้. ใช้ทุกครั้งที่ได้รับการ์ด/requirement มาแล้วจะทำ automate ไม่ว่าจะพูดตรง ("ทำ automate ให้
  การ์ดนี้") หรืออ้อม ("แปลง test case เป็น automate", "เตรียมเทสก่อนจะ automate")
---

# QA Automate Readiness

Gate มาตรฐานที่ QA ทั้งทีมต้องทำ**เหมือนกันทุกครั้ง**ก่อนเริ่มเขียนโค้ด automate ใด ๆ — ไม่ผูกกับ Playwright/โปรเจกต์ใดโปรเจกต์
หนึ่งโดยเฉพาะ ใช้ได้กับทุกโปรเจกต์ QA automate ที่มี pattern นี้

## หลักการ (ทำไมต้องมี gate นี้)

Automate ที่เขียนจากสเปกที่ยังไม่ผ่าน QA review หรือยังไม่เคย verify กับแอปจริง มีความเสี่ยงสองแบบ:
1. **เขียน automate ผิดตาม requirement ที่เข้าใจคลาดเคลื่อน** — เพราะไม่มีใคร review draft ก่อน
2. **เขียน automate ตามพฤติกรรมที่เป็นบั๊ก** — เพราะไม่เคยเอาไปรันกับแอปจริงเพื่อยืนยันว่า "ที่ร่างไว้" ตรงกับ "ที่แอปทำจริง"

Gate นี้บังคับให้มี **หลักฐานยืนยัน 2 ชั้น** (QA review ที่ draft + วิดีโอ/ภาพจากแอปจริง) ก่อนแตะโค้ด automate เสมอ

## ขั้นตอน (มี 2 GATE ที่ห้ามข้าม)

### 1. รับ input
การ์ด Linear / requirement / use case / test step / workflow ที่ต้องแปลงเป็น automate

### 2. วิเคราะห์ + ร่างเทสเคส
เรียก skill **`linear-testcase-writer`** สร้างโครง EXE/Scenario/Test Case ตาม template มาตรฐาน — **ห้ามเขียนโครง
EXE/Scenario/TC เอง** นอก skill นั้น (กันรูปแบบเพี้ยนไปคนละแบบต่อคน)

### 3. เก็บ draft เป็นไฟล์ `.md`
เก็บไว้ในโปรเจกต์ (ไม่ใช่สร้างจริงบน Linear) — pattern: `test-cases/<requirement-id>-<slug>.md`
ดูตัวอย่างจริงที่ `test-cases/COR-1724-admin-user-role.md` (มี header บอก workflow + status ของไฟล์ชัดเจน)

### 4. GATE 1 — QA review
ส่งไฟล์ draft ให้ QA review — **ห้ามไปขั้นถัดไปจนกว่า QA จะ approve ชัดเจน**

### 5. สำรวจแอปจริง (ต้องขอยืนยันก่อนเริ่ม)
หลัง draft ผ่านแล้ว ขอยืนยันจาก QA อีกครั้งก่อนไปสำรวจ/ทดสอบแอปจริงตาม TC ที่ร่างไว้ (ผ่าน Playwright MCP หรือเทสมือ)
ทุก TC/Scenario สำคัญต้องมี**หลักฐานวิดีโอหรือภาพ**ประกอบผลที่เจอจริง

### 6. เทียบผลจริงกับ Expected Result
อัปเดตช่อง "Actual Result" ในไฟล์ draft ตามผลที่เจอจริง:
- **ตรงกับที่ร่างไว้** → TC นั้นถือว่า "พร้อม automate"
- **ไม่ตรง** (เจอบั๊ก/พฤติกรรมต่างจากที่คาด) → กลับไปแก้ draft หรือแจ้ง QA ก่อนเสมอ **ห้ามข้ามไปเขียน automate ตามพฤติกรรมที่ยังไม่ยืนยัน**

### 7. GATE 2 — ส่งต่อให้เขียน automate
เขียน automate code ได้**เฉพาะ TC ที่ผ่านการยืนยันจากแอปจริงแล้วเท่านั้น** — จากนี้ส่งต่อให้สกิลเขียน automate เฉพาะ
โปรเจกต์เป็นคนจัดการรายละเอียดทางเทคนิค (เช่น `cortex-automate` ในโปรเจกต์ Cortex Automate)

## ความสัมพันธ์กับสกิลอื่น (กันสับสน/กันซ้ำ)

| สกิล | ใช้ตอนไหน | หน้าที่ |
|---|---|---|
| `linear-testcase-writer` | Step 2 เท่านั้น | ร่างโครง EXE/Scenario/TC ตาม template/naming/label มาตรฐาน |
| สกิลเขียน automate เฉพาะโปรเจกต์ (เช่น `cortex-automate`) | Step 7 เท่านั้น | รายละเอียดทางเทคนิคของการเขียน/รันโค้ด automate จริง |
| `linear-execution-test` | ไม่เกี่ยวกับ gate นี้ | สร้างการ์ดจริงบน Linear เพื่อไป run แบบ manual — คนละวัตถุประสงค์ |

สกิลนี้เป็นชั้น**workflow เชื่อม** ระหว่างการได้รับ requirement กับการลงมือเขียน automate — ไม่ทำหน้าที่ของ
`linear-testcase-writer` (ร่าง TC) หรือของสกิล automate เฉพาะโปรเจกต์ (เขียนโค้ด) เอง แค่บังคับลำดับและ gate ที่ต้องผ่าน

## ตัวอย่างจริงที่เคยใช้ pattern นี้

การ์ด COR-1724 ในโปรเจกต์ Cortex Automate — ร่าง TC ไว้ที่ `test-cases/COR-1724-admin-user-role.md`, สำรวจแอปจริงผ่าน
Playwright MCP เก็บ screenshot หลักฐาน, พบ gap 2 เรื่องระหว่างสำรวจแล้วถาม QA ก่อนไปต่อ — เป็นตัวอย่างการใช้ gate 1
และ gate 2 ตามขั้นตอนนี้ (ดูรายละเอียดเต็มใน `TODO.md` ของโปรเจกต์นั้น)

## Skill update log

`2026-09-30` — แยกออกมาจาก `cortex-automate` (เดิมคือ R16 ในสกิลนั้น) ให้เป็นสกิลอิสระที่ใช้ได้ทุกโปรเจกต์ QA ไม่ผูกกับ
automate เฉพาะทาง — ขยายรายละเอียดจาก R16 เดิมให้มี 2 gate ชัดเจน (QA review ที่ draft / ยืนยันผลจากแอปจริงด้วยวิดีโอ)
