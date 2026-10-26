import { test, type Browser, type Page } from '@playwright/test';
import { cacheAppAssets } from '../../mock-data/fixtures';
import { authFile } from '../../utils/env';
import { trackVideo } from './fixtures';
import { recordNotices } from './notices';

// หน้าต่าง (context แยก) ของบัญชี role อื่นที่ใช้ session จาก `.auth/<Role>.json` — รวมจากสเปก Refill (24 ต.ค. 2026)
// ต่างจาก `openRoleWindow` ใน print-capture.ts ที่ล็อกอินใหม่ด้วย user/pass จาก .env

/**
 * หน้าต่างของบัญชี Doctor (context แยก) + จดแจ้งเตือน (recordNotices) + อัดวิดีโอ `video-Doctor.webm`
 * ปิดด้วย `finishVideo(doc)` แล้ว `doc.context().close()` · `goto` = ตัวเลือกของ page.goto('/cortex/') เช่น `{ waitUntil: 'domcontentloaded', timeout: 90_000 }` ตอน dev-x ช้า
 */
export async function openDoctorWindow(browser: Browser, options: { goto?: Parameters<Page['goto']>[1] } = {}): Promise<Page> {
  const context = await browser.newContext({ storageState: authFile('Doctor'), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await cacheAppAssets(context);
  await context.addInitScript(recordNotices);
  const page = await context.newPage();
  await page.goto('/cortex/', options.goto);
  await trackVideo(page, 'Doctor');
  return page;
}
