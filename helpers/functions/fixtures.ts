import { test as base, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

export { expect };

/** ขนาดวิดีโอ = ขนาดจอ (ตัวหนังสือไทยในวิดีโออ่านออก) */
const VIDEO_SIZE = { width: 1920, height: 1080 };

/** วิดีโอที่กำลังอัดของแต่ละหน้า (ไว้ให้ restartVideo อัดใหม่ทับไฟล์เดิม) */
const videos = new WeakMap<Page, { path: string; recording: Promise<unknown> }>();

/**
 * เริ่มอัดวิดีโอใหม่ทับไฟล์เดิม — ตัดช่วงก่อนหน้าทิ้ง (เช่น จอว่างตอนแอปในหน้า (iframe) โหลดช้า)
 * ใช้เมื่อหน้าที่จะเริ่มเล่าเรื่องขึ้นครบแล้ว · เวชระเบียน (SBH-1289 14 ต.ค. 2026): iframe โหลดไฟล์ 8 MB ทุกครั้งที่เปลี่ยนหน้า dev-x ช้าแล้วจอว่าง ~140 วินาทีในคลิป
 */
export async function restartVideo(page: Page) {
  const video = videos.get(page);
  if (!video) return;
  await video.recording;
  await page.screencast.stop().catch(() => undefined);
  await page.screencast.start({ path: video.path, size: VIDEO_SIZE });
}

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
      videos.set(page, { path, recording });
    });

    await use(page);

    if (!recording) return;
    await recording;
    await page.screencast.stop().catch(() => undefined);
    if (fs.existsSync(path)) await testInfo.attach('video', { path, contentType: 'video/webm' });
  },
});
