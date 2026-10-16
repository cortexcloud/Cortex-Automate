// ภาพรวมคลิป: เล่นคลิปเร็ว 4 เท่า วาดเฟรมทุก ~2 วินาทีของคลิปลงตาราง (ช่องละ 320x180 + เวลา) แล้วถ่ายเป็นภาพเดียว
// ใช้: node .claude/skills/cortex-card-test/scripts/clip-sheet.mjs "<คลิป.webm>" <ภาพผล.png> [วินาทีเริ่ม] [วินาทีจบ]
import { chromium } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [file, out, from = '0', to = '9999'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.resolve(file)).href);
await page.evaluate(() => {
  const c = document.createElement('canvas');
  c.id = 'sheet'; c.width = 1920; c.height = 1080;
  Object.assign(c.style, { position: 'fixed', inset: '0', zIndex: '9', background: '#333' });
  document.body.appendChild(c);
});
const video = page.locator('video');
await video.evaluate((v) => { v.muted = true; v.playbackRate = 4; return v.play(); });
let cell = 0, last = -10;
for (;;) {
  await page.waitForTimeout(100);
  const { t, ended } = await video.evaluate((v) => ({ t: v.currentTime, ended: v.ended }));
  if (ended || t > Number(to) || cell >= 36) break;
  if (t < Number(from) || t - last < 2) continue;
  last = t;
  await page.evaluate(({ cell, t }) => {
    const v = document.querySelector('video'); const x = document.getElementById('sheet').getContext('2d');
    const cx = (cell % 6) * 320, cy = Math.floor(cell / 6) * 180;
    x.drawImage(v, cx, cy, 318, 178);
    x.fillStyle = '#c00'; x.fillRect(cx, cy, 70, 22); x.fillStyle = '#fff'; x.font = 'bold 16px sans-serif'; x.fillText(`${t.toFixed(1)}s`, cx + 4, cy + 16);
  }, { cell, t });
  cell++;
}
await page.screenshot({ path: out });
console.log(`เฟรม ${cell} ช่อง → ${out}`);
await browser.close();
