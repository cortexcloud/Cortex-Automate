import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_ROLE, authFile } from './utils/env';

// โหลด .env ที่ผู้ใช้กรอกเอง (ค่าที่มีใน environment อยู่แล้วจะไม่ถูกทับ)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 20_000 }, // หน้า Cortex โหลดครั้งแรก 7–12 วินาที
  // dev-x ใช้ข้อมูลร่วมกันทั้งทีม — รันทีละเทสกันคนไข้/visit ชนกัน
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'https://dev-x.cortexcloud.co',
    channel: 'chrome', // Google Chrome ที่ติดตั้งในเครื่อง ไม่ต้องโหลด Chromium
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    // หลักฐาน (R13): วิดีโอทุกเทสทุกรอบ ขนาดเท่าจอ (ตัวหนังสือไทยในวิดีโออ่านออก) ·
    // ภาพ ณ จุดที่เช็ค Expected / จุด Error แนบใต้ step ผ่าน checkStep() (helpers/evidence.ts)
    // screenshot ด้านล่าง = ภาพท้ายเทสตอน fail ของ Playwright เอง (กันกรณีพังนอก checkStep)
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      // บันทึกผลเหมือนเทสอื่น (วิดีโอ · trace/ภาพตอน fail) — ผู้ใช้อนุญาตให้บันทึกขั้นล็อกอินได้ ไม่ต้องปกปิด (R14)
      // ขั้นล็อกอินใช้ video ของ Playwright ตรงๆ (เริ่มอัดตั้งแต่เปิดหน้า จึงมีช่วงจอขาวตอนโหลดแอป)
      use: { video: { mode: 'on', size: { width: 1920, height: 1080 } } },
    },
    {
      // role ตั้งต้น = Super_User · เทสที่ต้องใช้ role อื่น: test.use({ storageState: authFile('Doctor') })
      // แล้วเพิ่ม role นั้นใน ROLES_IN_USE (utils/env.ts)
      // วิดีโอของเทสอัดโดย fixture ใน helpers/fixtures.ts (เริ่มหลังแอปโหลดเสร็จ ตัดช่วงจอขาว) — ไม่ใช้ video ของ config
      // trace ไม่เก็บภาพ (screenshots: false): ภาพของ trace ใช้ screencast ตัวเดียวกับวิดีโอและเริ่มก่อน
      // วิดีโอจะได้ภาพขนาดของ trace (800×450) แทน 1920×1080 · trace ยังมี DOM snapshot ทุก action ไว้ไล่สาเหตุ
      name: 'chrome',
      use: {
        storageState: authFile(DEFAULT_ROLE),
        video: 'off',
        trace: { mode: 'retain-on-failure', screenshots: false },
      },
      dependencies: ['setup'],
    },
  ],
});
