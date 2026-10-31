import { buildConfig } from './playwright.base';

// SBH Dev (https://cortex-dev.srbrhospital.com) — clone ข้อมูล + user มาจาก SBH Prod (Smoke Test 29 ต.ค. 2026) → เทสการ์ดใน tests/
// user/pass ยืมจาก .env.sbh-prod อัตโนมัติ (.env.sbh-dev ไม่ต้องมี · มีได้ถ้าจะใช้บัญชีต่างจาก Prod) · session แยกที่ .auth/sbh-dev/ เพราะ Keycloak คนละตัว
// ผลรันอยู่ที่ test-results-sbh-dev/ · playwright-report-sbh-dev/
// รัน: npm run test:sbh-dev -- --grep @SBH-1013 · เปิดจอ: npm run test:sbh-dev -- --headed --grep @SBH-1013
export default buildConfig({ env: 'sbh-dev' });
