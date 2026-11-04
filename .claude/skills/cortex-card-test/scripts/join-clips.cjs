// join-clips.cjs <out.webm> <seg1.webm> <seg2.webm> ... — เล่นช่วงต่อกันในเบราว์เซอร์ (1920×1080) แล้วอัดเป็นไฟล์เดียว
// ตัวอย่าง: export PROJECT="<โฟลเดอร์โปรเจกต์>"; node .claude/skills/cortex-card-test/scripts/join-clips.cjs out.webm seg1.webm seg2.webm (ตัดช่วงก่อนด้วย ffmpeg -ss -to -c:v libvpx -b:v 2M -an)
// ใช้ playwright จากโปรเจกต์ (env PROJECT)
const { chromium } = require(require('path').join(process.env.PROJECT, 'node_modules', 'playwright'));
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
(async () => {
  const [out, ...segs] = process.argv.slice(2);
  const tmp = path.join(path.dirname(path.resolve(out)), 'rec-' + Date.now());
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: tmp, size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage();
  const urls = segs.map((s) => pathToFileURL(path.resolve(s)).href);
  await page.goto(urls[0].replace(/[^/]+$/, ''));
  await page.setContent('<body style="margin:0;background:#fff"><video id="v" muted style="width:1920px;height:1080px;display:block"></video></body>');
  await page.evaluate(async (list) => {
    const v = document.getElementById('v');
    for (const u of list) {
      v.src = u;
      await new Promise((r) => { v.onloadeddata = r; });
      await v.play();
      await new Promise((r) => { v.onended = r; });
    }
  }, urls);
  await page.waitForTimeout(300);
  const video = page.video();
  await ctx.close();
  fs.copyFileSync(await video.path(), out);
  fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
  console.log('ok', out, fs.statSync(out).size);
})();
