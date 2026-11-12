// แสดงขนาด SKILL.md ของทุกสกิล (หน่วยตัวอักษร) แล้วเตือนเมื่อเกินงบ
// รัน: node .claude/skills/cortex-automate/scripts/skill-size.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// งบต่อไฟล์ (ตัวอักษร) — ตั้งจากขนาดหลังลดรอบ 12 พ.ย. 2026 · ลดไฟล์ได้อีกให้ลดงบตาม ห้ามเพิ่มงบเพื่อให้ผ่าน
const BUDGET = {
  'cortex-automate': 35000,
  'cortex-card-test': 76000,
  'cortex-er-tor-uat': 12000,
  'cortex-regression': 20000,
  'linear-testcase-writer': 18000,
  'qa-automate-readiness': 6000,
};
const DEFAULT_BUDGET = 15000;

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let over = 0;
for (const name of readdirSync(skillsDir).sort()) {
  const file = join(skillsDir, name, 'SKILL.md');
  if (!existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  const chars = [...text].length;
  const budget = BUDGET[name] ?? DEFAULT_BUDGET;
  const longest = Math.max(...text.split(/\r?\n/).map((l) => [...l].length));
  const flag = chars > budget ? 'เกินงบ' : 'ผ่าน';
  if (chars > budget) over++;
  console.log(
    `${flag.padEnd(7)} ${name.padEnd(26)} ${String(chars).padStart(7)} / ${String(budget).padStart(6)} ตัวอักษร · บรรทัดยาวสุด ${longest}`,
  );
}
if (over) {
  console.log(`\nเกินงบ ${over} ไฟล์ — ย้ายประวัติ / ตัวอย่างรายการ์ด / รายละเอียดไป references/ (ไฟล์หลักเก็บกฎ 1 บรรทัด + ตัวชี้)`);
  process.exitCode = 1;
}
