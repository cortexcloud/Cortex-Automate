import { buildConfig } from './playwright.base';

// SBH Dev (clone ของ SBH Prod) — สคริปต์ใน mock-data/ เช่น Scenario OPD BizSim (ค่าตั้งต้นใช้ชุดของ Prod) · user/pass ยืมจาก .env.sbh-prod
// ผลรันใช้โฟลเดอร์เดียวกับ playwright.sbh-dev.config.ts (test-results-sbh-dev/) — อย่ารัน 2 config พร้อมกัน
// รัน: npx playwright test -c playwright.sbh-dev.mock.config.ts BizSim-OPD --headed --grep "@APM-OPD-001"
export default buildConfig({ env: 'sbh-dev', testDir: './mock-data' });
