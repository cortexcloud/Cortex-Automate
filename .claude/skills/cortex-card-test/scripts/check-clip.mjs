// ตรวจคลิปผลเทส: เปิดใน Chrome เล่นเร็ว 8 เท่า พิมพ์ขนาด / ความยาว และถ่ายเฟรมเป็นระยะลงโฟลเดอร์ที่ระบุ (seek ใน webm ของ screencast ไม่ได้ ต้องเล่นจริง)
// ใช้: node .claude/skills/cortex-card-test/scripts/check-clip.mjs "<คลิป.webm>" <โฟลเดอร์เก็บเฟรม>   (รันจากรากโปรเจกต์)
import { chromium } from '@playwright/test';
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from 'node:url';
const [file, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.resolve(file)).href);
const video = page.locator('video');
await video.evaluate((v) => { v.muted = true; v.playbackRate = 8; return v.play(); });
const shots = [];
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1000);
  const state = await video.evaluate((v) => ({ t: v.currentTime, ended: v.ended, w: v.videoWidth, h: v.videoHeight, d: v.duration }));
  if (i % 2 === 0 || state.ended) { const name = path.join(out, `frame-${String(i).padStart(2, '0')}.png`); await video.screenshot({ path: name }); shots.push(`${name} @${state.t.toFixed(1)}s`); }
  if (state.ended) { console.log('ขนาดวิดีโอ', state.w, 'x', state.h, '· ความยาว ~', state.t.toFixed(1), 'วินาที'); break; }
}
console.log(shots.join('\n'));
await browser.close();
