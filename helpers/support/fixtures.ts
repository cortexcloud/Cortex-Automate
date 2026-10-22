import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';

export { expect };

/** ขนาดวิดีโอ = ขนาดจอ (ตัวหนังสือไทยในวิดีโออ่านออก) */
const VIDEO_SIZE = { width: 1920, height: 1080 };

/**
 * test ของโปรเจกต์ — เทสทุกไฟล์ import จากที่นี่แทน '@playwright/test'
 *
 * วิดีโอผลเทส (R13): เริ่มอัดเมื่อหน้าแรกโหลดไฟล์แอปเสร็จ (event load) ด้วย page.screencast
 * ตัดช่วงจอขาว ~10 วินาทีตอนเปิดหน้าแรก (ไฟล์ JS ของแอป 15.5 MB ห้าม cache) ที่ video ใน config อัดติดมาด้วย
 * เทสที่พังก่อนหน้าแรกโหลดเสร็จจะไม่มีวิดีโอ — ดูภาพตอน fail + trace แทน
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const path = testInfo.outputPath('video.webm');
    let recording: Promise<unknown> | undefined;
    page.once('load', () => {
      recording = page.screencast.start({ path, size: VIDEO_SIZE }).catch((error: Error) => {
        testInfo.annotations.push({ type: 'video', description: `อัดวิดีโอไม่สำเร็จ: ${error.message}` });
      });
    });

    await use(page);

    if (!recording) return;
    await recording;
    await page.screencast.stop().catch(() => undefined);
    if (fs.existsSync(path)) await testInfo.attach('video', { path, contentType: 'video/webm' });
  },
});
