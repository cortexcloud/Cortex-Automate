// ตัวเรียกสคริปต์ปิด Visit ที่ค้างบนหน้า ER (mock-data/close-er-visits.spec.ts) — แปลงตัวเลือกบนบรรทัดคำสั่งเป็นค่าที่สคริปต์อ่าน
//   node mock-data/close-er-visits.mjs <dev-x|sbh-prod> [--group=uat-er|test|all] [--skip-bed-waiting] [--confirm] [--date=YYYY-MM-DD]
// ไม่ใส่ --date = ทุกรายที่บอร์ดแสดงอยู่ (รวมค้างข้ามวัน) · ไม่ใส่ --confirm = แสดงรายชื่อที่จะปิดอย่างเดียว · เปิดจอทุกครั้งให้เห็นว่ากำลังทำรายไหน
import { spawnSync } from 'node:child_process';

const CONFIGS = { 'dev-x': 'playwright.mock.config.ts', 'sbh-prod': 'playwright.sbh-prod.config.ts' };
const GROUPS = ['uat-er', 'test', 'all'];

const [system, ...options] = process.argv.slice(2);
const fail = (message) => {
  console.error(`${message}\nวิธีใช้: npm run er:close-visits[:dev] -- [--group=${GROUPS.join('|')}] [--skip-bed-waiting] [--confirm] [--date=YYYY-MM-DD]`);
  process.exit(1);
};
if (!CONFIGS[system]) fail(`ไม่รู้จักระบบ "${system ?? ''}"`);

const env = { ...process.env, ER_CLOSE_GROUP: 'uat-er', ER_CLOSE_CONFIRM: '0', ER_CLOSE_SKIP_BED_WAITING: '0' };
delete env.ER_CLOSE_DATE;
for (const option of options) {
  const [name, value] = option.split('=');
  if (name === '--group' && GROUPS.includes(value)) env.ER_CLOSE_GROUP = value;
  else if (name === '--confirm' && value === undefined) env.ER_CLOSE_CONFIRM = '1';
  else if (name === '--skip-bed-waiting' && value === undefined) env.ER_CLOSE_SKIP_BED_WAITING = '1';
  else if (name === '--date' && /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) env.ER_CLOSE_DATE = value;
  else fail(`ตัวเลือกไม่ถูกต้อง: ${option}`);
}

const result = spawnSync(`npx playwright test -c ${CONFIGS[system]} close-er-visits --headed`, { stdio: 'inherit', shell: true, env });
process.exit(result.status ?? 1);
