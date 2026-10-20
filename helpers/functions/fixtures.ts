import { test as base, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

export { expect };

/** ขนาดวิดีโอ = ขนาดจอ (ตัวหนังสือไทยในวิดีโออ่านออก) */
const VIDEO_SIZE = { width: 1920, height: 1080 };

/** วิดีโอที่กำลังอัดของแต่ละหน้า (ไว้ให้ restartVideo อัดใหม่ทับไฟล์เดิม · startClip เปลี่ยนไฟล์) */
const videos = new WeakMap<Page, { path: string; recording: Promise<unknown>; files: string[] }>();

/**
 * ตัดคลิปใหม่เป็นไฟล์แยก `clip-<name>.webm` ในโฟลเดอร์ผลของเทส — 1 คลิปต่อ 1 TC (R61 · ผู้ใช้สั่ง 18 ต.ค. 2026)
 * เรียกตอนเริ่มช่วงของ TC (หลังหน้าที่จะเล่าเรื่องขึ้นแล้ว) · ช่วงก่อนเรียกครั้งแรกอยู่ใน video.webm
 */
export async function startClip(page: Page, name: string) {
  const video = videos.get(page);
  if (!video) return;
  await video.recording;
  await page.screencast.stop().catch(() => undefined);
  const path = base.info().outputPath(`clip-${name}.webm`);
  video.path = path;
  video.files.push(path);
  video.recording = page.screencast.start({ path, size: VIDEO_SIZE });
  await video.recording;
}

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
 * อัดวิดีโอหน้าของหน้าต่างอื่น (context ที่เทสสร้างเอง เช่น บัญชี Doctor) ด้วย screencast — ใช้ startClip กับหน้านั้นได้เหมือนหน้าหลัก
 * ไฟล์แรก `video-<name>.webm` · ชื่อคลิปของหน้านี้ต้องไม่ซ้ำกับของหน้าหลัก (โฟลเดอร์เดียวกัน) · ปิดด้วย finishVideo() ก่อนเทสจบ
 */
export async function trackVideo(page: Page, name: string) {
  const path = base.info().outputPath(`video-${name}.webm`);
  const recording = page.screencast.start({ path, size: VIDEO_SIZE });
  videos.set(page, { path, recording, files: [path] });
  await recording;
}

/** หยุดอัดหน้าที่ trackVideo ไว้ แล้วแนบไฟล์ทั้งหมดของหน้านั้นเข้าผลเทส */
export async function finishVideo(page: Page) {
  const video = videos.get(page);
  if (!video) return;
  videos.delete(page);
  await video.recording;
  await page.screencast.stop().catch(() => undefined);
  for (const file of video.files) {
    if (fs.existsSync(file)) await base.info().attach(file.split(/[\\/]/).pop()!.replace(/\.webm$/, ''), { path: file, contentType: 'video/webm' });
  }
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
      videos.set(page, { path, recording, files: [path] });
    });

    await use(page);

    const video = videos.get(page);
    if (!video) return;
    await video.recording;
    await page.screencast.stop().catch(() => undefined);
    for (const file of video.files) {
      if (fs.existsSync(file)) await testInfo.attach(file === path ? 'video' : file.split(/[\\/]/).pop()!.replace(/\.webm$/, ''), { path: file, contentType: 'video/webm' });
    }
  },
});
