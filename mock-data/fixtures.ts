import { type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test as base } from '../helpers/fixtures';
import { envName } from '../utils/env';

export { expect };

/** ไฟล์ JS/CSS ของแอป (ชื่อมี hash — deploy ใหม่ได้ชื่อใหม่ ไม่ค้างของเก่า) เก็บไว้ใช้รอบถัดไป */
const CACHE_DIR = path.join(__dirname, '..', '.cache', `${envName() ?? 'dev-x'}-assets`);
const CONTENT_TYPE: Record<string, string> = { '.js': 'application/javascript', '.css': 'text/css' };
const MAX_ATTEMPTS = 4;

/**
 * test ของสคริปต์ Mock Data (dev-x และ SBH Prod)
 *
 * SBH Prod ตอบ 502 / ตัดการเชื่อมต่อเป็นพักๆ ตอนโหลดไฟล์ของแอป (ตรวจ 2 ต.ค. 2026) → หน้า "Unexpected Application Error"
 * จึงดักไฟล์ใน /cortex/assets/: โหลดไม่ผ่านให้ลองใหม่ และเก็บไฟล์ที่โหลดได้ลงเครื่อง (เปิดหน้าครั้งถัดไปไม่ต้องโหลดไฟล์ 15 MB ซ้ำ)
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await cacheAppAssets(context);
    await use(context);
  },
});

/** ดักไฟล์ของแอปใน context นี้ (โหลดไม่ผ่านลองใหม่ + เก็บลงเครื่อง) — context ที่เทสสร้างเอง (หน้าต่างของอีกบัญชี) ต้องเรียกเอง */
export async function cacheAppAssets(context: BrowserContext) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  await context.route(/\/cortex\/assets\/[^/?]+\.(js|css)$/, async (route) => {
    const name = path.basename(new URL(route.request().url()).pathname);
    const file = path.join(CACHE_DIR, name);
    const contentType = CONTENT_TYPE[path.extname(name)];
    if (fs.existsSync(file)) return route.fulfill({ path: file, contentType });

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const res = await route.fetch({ timeout: 90_000 }).catch(() => null);
      if (res?.ok()) {
        const body = await res.body();
        // เขียนไฟล์ชั่วคราวก่อน กันไฟล์ครึ่งๆ กลางๆ ถ้าถูกหยุดกลางทาง
        const partial = `${file}.${process.pid}.part`;
        fs.writeFileSync(partial, body);
        fs.renameSync(partial, file);
        return route.fulfill({ body, contentType });
      }
    }
    return route.abort();
  });
}
