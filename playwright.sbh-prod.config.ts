import { buildConfig } from './playwright.base';

// SBH Prod (รพ.สระบุรี — https://cortex.srbrhospital.com) ใช้กับสคริปต์เตรียม Mock Data ใน mock-data/ เท่านั้น
// เทสการ์ด SBH-xxxx ใน tests/ ไม่ถูกรันจาก config นี้ · user/pass อยู่ที่ .env.sbh-prod · session ที่ .auth/sbh-prod/
// รัน: npx playwright test -c playwright.sbh-prod.config.ts
export default buildConfig({ env: 'sbh-prod', testDir: './mock-data' });
