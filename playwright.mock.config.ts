import { buildConfig } from './playwright.base';

// dev-x — สคริปต์เตรียม Mock Data ใน mock-data/ (ลองบน dev-x ก่อนรันบน SBH Prod ด้วย playwright.sbh-prod.config.ts)
// รัน: npm run mock:uat-er:dev
export default buildConfig({ testDir: './mock-data' });
