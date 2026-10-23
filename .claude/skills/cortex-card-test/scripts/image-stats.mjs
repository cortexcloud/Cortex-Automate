// วัดคุณภาพหลักฐานจากพิกเซลจริง — ใช้คู่กับการเปิดดูภาพด้วยตา (ไม่แทนกัน)
//   ภาพ:  node .claude/skills/cortex-card-test/scripts/image-stats.mjs "<โฟลเดอร์ หรือ ไฟล์.png ...>" [--json <ไฟล์ผล.json>]
//   คลิป: node .claude/skills/cortex-card-test/scripts/image-stats.mjs --clip "<คลิป.webm>" [--json <ไฟล์ผล.json>]
// รันจากรากโปรเจกต์ · ต้อง export PATH ของ Node ก่อน
//
// ภาพ 1 ใบ → ขาว% (พื้นขาว) · ตัวอักษร% · ว่าง? · กรอบแดง (จำนวน · ตำแหน่ง · ชนขอบจอ? · ใหญ่เกิน 60% จอ = ตีทั้งคอลัมน์?) ·
//   ป้ายแดงทึบ (กรอก / กด / แจ้งเตือน / Expected) และกรอบที่ "ไม่มีป้ายติดอยู่" · ตารางเทียบค่า (ขอบเขียว)
// คลิป → ไทม์ไลน์: ช่วงจอว่าง (ขาว) · ช่วงที่กรอบแดงอยู่บนจอนานกี่วินาที (สั้นกว่า MIN_HOLD = คนดูอ่านไม่ทัน) · ความยาวรวม
// สี: กรอบ 3px / ป้าย #ff4d4f (evidence.ts) · ขอบตารางเทียบ #1f6f43 · badge แจ้งเตือน "99+" ของแอปมุมขวาบนถูกตัดออก
// seek ใน webm ของ screencast ไม่ได้ → เล่นจริงที่ 4 เท่าแล้วสุ่มเฟรม (ย่อครึ่ง) · ภาพนิ่งวิเคราะห์เต็มขนาด (เส้นกรอบบาง ย่อแล้วจางหาย)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MIN_HOLD = 1.2; // วินาที — holdForClip() ค่าตั้งต้น
const args = process.argv.slice(2);
const jsonAt = args.indexOf('--json');
const jsonOut = jsonAt >= 0 ? args.splice(jsonAt, 2)[1] : null;
const clipAt = args.indexOf('--clip');
const clip = clipAt >= 0 ? args.splice(clipAt, 2)[1] : null;

// ---- วิเคราะห์พิกเซลใน browser ----
const analyze = (source, scale) => {
  const nat = source instanceof HTMLVideoElement ? { w: source.videoWidth, h: source.videoHeight } : { w: source.naturalWidth, h: source.naturalHeight };
  const w = Math.max(1, Math.round(nat.w * scale)), h = Math.max(1, Math.round(nat.h * scale));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const CELL = 4; const gw = Math.ceil(w / CELL), gh = Math.ceil(h / CELL);
  const redGrid = new Uint16Array(gw * gh);
  let white = 0, dark = 0, red = 0, green = 0;
  const darkMax = scale >= 1 ? 100 : 140;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    if (r >= 245 && g >= 245 && b >= 245) white++;
    else if (r < darkMax && g < darkMax && b < darkMax) dark++;
    if (r >= 215 && g >= 30 && g <= 135 && b >= 30 && b <= 135 && r - g >= 90) { red++; redGrid[((y / CELL) | 0) * gw + ((x / CELL) | 0)]++; }
    else if (Math.abs(r - 31) <= 25 && Math.abs(g - 111) <= 25 && Math.abs(b - 67) <= 25) green++;
  }
  const cellMax = CELL * CELL;
  const solid = (k) => redGrid[k] >= cellMax - 3; // ช่องแดงทึบ = ป้าย · ช่องแดงบางส่วน = เส้นกรอบ
  const cluster = (accept) => {
    const seen = new Uint8Array(gw * gh); const out = [];
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const k = gy * gw + gx; if (!redGrid[k] || seen[k] || !accept(k)) continue;
      const q = [k]; seen[k] = 1; let minX = gx, maxX = gx, minY = gy, maxY = gy, px = 0, cells = 0;
      while (q.length) {
        const cur = q.pop(); const cy = (cur / gw) | 0, cx = cur % gw; px += redGrid[cur]; cells++;
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const nk = ny * gw + nx; if (redGrid[nk] && !seen[nk] && accept(nk)) { seen[nk] = 1; q.push(nk); }
        }
      }
      const bw = (maxX - minX + 1) * CELL, bh = (maxY - minY + 1) * CELL;
      out.push({ x: Math.round(minX * CELL / scale), y: Math.round(minY * CELL / scale), w: Math.round(bw / scale), h: Math.round(bh / scale), px, cells, fill: +(px / (bw * bh)).toFixed(2) });
    }
    return out;
  };
  const isBadge = (b) => b.x >= nat.w - 70 && b.y <= 40 && b.w <= 60 && b.h <= 40; // badge "99+" ของแอป
  // ป้าย = ช่องทึบ (ตัวอักษรขาวบนป้ายทำให้แตกเป็นชิ้น) → รวมชิ้นที่อยู่แถวเดียวกันและห่างกัน ≤ 14px
  let frags = cluster(solid).filter((b) => b.h >= 10 && b.h <= 34 && !isBadge(b));
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < frags.length; i++) for (let j = i + 1; j < frags.length; j++) {
      const a = frags[i], b = frags[j];
      const sameRow = a.y < b.y + b.h && b.y < a.y + a.h;
      const gap = Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w);
      if (sameRow && gap <= 14) {
        const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), x2 = Math.max(a.x + a.w, b.x + b.w), y2 = Math.max(a.y + a.h, b.y + b.h);
        frags.splice(j, 1); frags[i] = { x, y, w: x2 - x, h: y2 - y, px: a.px + b.px, cells: a.cells + b.cells, fill: +((a.px + b.px) / ((x2 - x) * (y2 - y))).toFixed(2) };
        merged = true; break outer;
      }
    }
  }
  const labels = frags.filter((b) => b.w >= 24);
  // กรอบของเรา = เส้น 3px (evidence.ts) → ความทึบที่คาดของกรอบ 3px บน bbox นั้น = 6(w+h)/(w·h) · วัดได้ต่ำกว่าครึ่ง = ขอบ 1px ของแอป (ช่อง error สีแดงของ Ant) ไม่นับ ·
  // ทึบ ≥ 0.3 = ปุ่ม / tag สีแดงของแอป ไม่นับ · ตัดไอคอนแดงเล็กๆ (< 40px ทั้งกว้างและสูง) และ badge "99+"
  const frames = cluster((k) => !solid(k)).filter((b) => {
    const expect3px = (6 * (b.w + b.h)) / (b.w * b.h);
    return b.px >= 24 && (b.w >= 40 || b.h >= 40) && b.fill < 0.3 && b.fill >= expect3px * 0.5 && !isBadge(b);
  });
  const near = (f, l) => l.x + l.w >= f.x - 8 && l.x <= f.x + f.w + 8 && l.y + l.h >= f.y - 30 && l.y <= f.y + f.h + 8;
  const framesNoLabel = frames.filter((f) => !labels.some((l) => near(f, l))).length;
  const edge = 2;
  const touchesEdge = frames.some((f) => f.x <= edge || f.y <= edge || f.x + f.w >= nat.w - edge || f.y + f.h >= nat.h - edge);
  const huge = frames.filter((f) => (f.w * f.h) / (nat.w * nat.h) > 0.6).length;
  const total = w * h;
  const strip = ({ px, cells, ...b }) => b;
  return { width: nat.w, height: nat.h, white: +(white / total).toFixed(3), dark: +(dark / total).toFixed(4), redPx: red, greenPx: green,
    blank: white / total >= 0.9 && dark / total < 0.004, frames: frames.length, labels: labels.length, framesNoLabel, hugeFrames: huge, touchesEdge,
    compareTable: green / total > 0.0008, frameBoxes: frames.slice(0, 8).map(strip), labelBoxes: labels.slice(0, 8).map(strip) };
};

const browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const results = [];
const flagsOf = (s) => {
  const f = [];
  if (s.blank) f.push('เกือบว่าง (ขาว ≥90%)');
  if (!s.frames && !s.labels) f.push('ไม่มีกรอบแดง');
  if (s.frames && !s.labels) f.push('มีกรอบแต่ไม่เจอป้ายเลย (ป้ายไทยสั้นๆ อาจตรวจไม่เจอ — ดูภาพ)');
  if (s.touchesEdge) f.push('กรอบชนขอบจอ');
  if (s.hugeFrames) f.push('กรอบ >60% จอ');
  if (s.frames > 6) f.push(`กรอบ ${s.frames} อัน (รก?)`);
  return f.join(' · ') || '-';
};

if (clip) {
  await page.goto(pathToFileURL(path.resolve(clip)).href);
  const video = page.locator('video');
  await video.evaluate((v) => { v.muted = true; v.playbackRate = 4; return v.play(); });
  const samples = [];
  for (let i = 0; i < 2400; i++) {
    await page.waitForTimeout(250);
    const s = await video.evaluate((v, fn) => { const t = v.currentTime, ended = v.ended; const stats = (0, eval)(fn)(v, 0.5); return { t, ended, ...stats }; }, `(${analyze.toString()})`);
    samples.push(s);
    if (s.ended) break;
  }
  const duration = samples.at(-1)?.t ?? 0;
  const segments = (pred) => {
    const out = []; let start = null, last = null;
    for (const s of samples) {
      if (pred(s)) { if (start === null) start = s.t; last = s.t; }
      else if (start !== null) { out.push({ from: +start.toFixed(1), to: +last.toFixed(1), sec: +Math.max(0.5, last - start + 0.5).toFixed(1) }); start = null; }
    }
    if (start !== null) out.push({ from: +start.toFixed(1), to: +last.toFixed(1), sec: +Math.max(0.5, last - start + 0.5).toFixed(1) });
    return out;
  };
  const blankSeg = segments((s) => s.blank);
  const redSeg = segments((s) => s.frames > 0 || s.labels > 0);
  const fast = redSeg.filter((r) => r.sec < MIN_HOLD);
  const lead = blankSeg.find((b) => b.from <= 1);
  const sizeMB = fs.statSync(clip).size / 1048576;
  console.log(`คลิป ${path.basename(clip)} · ${sizeMB.toFixed(1)} MB · ยาว ~${duration.toFixed(0)} วินาที · สุ่ม ${samples.length} เฟรม (ทุก ~${(duration / Math.max(1, samples.length)).toFixed(1)}s)`);
  console.log(`ช่วงจอว่าง: ${blankSeg.length ? blankSeg.map((b) => `${b.from}–${b.to}s (${b.sec}s)`).join(' · ') : 'ไม่มี'}${lead ? `   ← จอว่างตอนต้น ${lead.sec}s (ควร restartVideo หลังหน้าพร้อม)` : ''}`);
  console.log(`ช่วงที่มีกรอบแดง: ${redSeg.length} ช่วง · รวม ${redSeg.reduce((a, r) => a + r.sec, 0).toFixed(0)}s · สั้นกว่า ${MIN_HOLD}s: ${fast.length} ช่วง${fast.length ? ' → ที่ ' + fast.map((r) => `${r.from}s`).join(', ') + ' (คนดูอ่านไม่ทัน — holdForClip)' : ''}`);
  if (sizeMB > 10) console.log('⚠ ขนาด > 10 MB อัปโหลด Linear ช้า');
  if (duration < 3) console.log('⚠ คลิปสั้นผิดปกติ — เทสอาจไม่ได้เปิดหน้า');
  results.push({ clip, duration: +duration.toFixed(1), sizeMB: +sizeMB.toFixed(1), samples: samples.length, blankSeg, redSeg, fast });
} else {
  const files = args.flatMap((a) => fs.statSync(a).isDirectory() ? fs.readdirSync(a).filter((f) => /\.png$/i.test(f)).sort().map((f) => path.join(a, f)) : [a]);
  if (!files.length) { console.error('ไม่พบไฟล์ .png'); process.exit(1); }
  console.log('| ไฟล์ | ขาว% | ตัวอักษร% | กรอบ | ป้าย~ | ตารางเทียบ | ธง |');
  console.log('|---|---|---|---|---|---|---|');
  for (const f of files) {
    await page.goto(pathToFileURL(path.resolve(f)).href);
    const s = await page.evaluate((fn) => (0, eval)(fn)(document.querySelector('img'), 1), `(${analyze.toString()})`);
    const row = { file: f, ...s, flags: flagsOf(s) };
    results.push(row);
    console.log(`| ${path.basename(f)} | ${(s.white * 100).toFixed(0)} | ${(s.dark * 100).toFixed(1)} | ${s.frames} | ${s.labels} | ${s.compareTable ? 'มี' : '-'} | ${row.flags} |`);
  }
}
if (jsonOut) { fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true }); fs.writeFileSync(jsonOut, JSON.stringify(results, null, 1)); console.log('→', jsonOut); }
await browser.close();
