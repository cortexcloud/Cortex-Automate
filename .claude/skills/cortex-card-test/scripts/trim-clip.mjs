// trim-clip.mjs — ตัดช่วงจอขาว / ช่วงที่ไม่ใช่ของ TC ออกจากคลิปหลักฐาน แล้วต่อเป็นไฟล์เดียว (SBH-2593 5 พ.ย. 2026)
// ใช้: export PROJECT="<โฟลเดอร์โปรเจกต์>"; node .claude/skills/cortex-card-test/scripts/trim-clip.mjs <in.webm> <out.webm> [auto | a-b,c-d] [--end <วินาที>]
//   auto (ค่าตั้งต้น) = เก็บส่วนที่ไม่ใช่จอว่าง ตาม image-stats --clip (ขอบ 0.2 วิ) · a-b,c-d = ช่วงที่เก็บเอง (วินาที) · --end = ตัดทุกอย่างหลังวินาทีนี้
//   ส่วนเดียว = ไฟล์ผลจาก ffmpeg ตรงๆ · หลายส่วน = join-clips.cjs (เล่นต่อกันในเบราว์เซอร์แล้วอัดใหม่)
//   ffmpeg = ของ Playwright (%LOCALAPPDATA%/ms-playwright/ffmpeg-*/ffmpeg-win64.exe — ไม่มี filter concat / xstack)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const endAt = args.indexOf('--end');
const end = endAt >= 0 ? Number(args.splice(endAt, 2)[1]) : Infinity;
const [input, output, mode = 'auto'] = args;
if (!input || !output) {
  console.log('ใช้: node trim-clip.mjs <in.webm> <out.webm> [auto | a-b,c-d] [--end <วินาที>]');
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const pw = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
const ffDir = fs.readdirSync(pw).find((d) => d.startsWith('ffmpeg'));
const ffmpeg = path.join(pw, ffDir, 'ffmpeg-win64.exe');
const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(output)), 'trim-'));

let keep;
let duration = Infinity;
if (mode === 'auto') {
  const json = path.join(tmp, 'stats.json');
  execFileSync(process.execPath, [path.join(here, 'image-stats.mjs'), '--clip', input, '--json', json], { stdio: 'ignore' });
  const r = JSON.parse(fs.readFileSync(json, 'utf8'));
  const stat = Array.isArray(r) ? r[0] : r.results?.[0] ?? r;
  duration = stat.duration;
  keep = [];
  let from = 0;
  for (const b of stat.blankSeg ?? []) {
    if (b.from - from > 0.6) keep.push([from, Math.max(from, b.from - 0.2)]);
    from = b.to + 0.5; // b.to = เวลาของตัวอย่างสุดท้ายที่ว่าง (ถ่ายทุก ~0.5 วิ)
  }
  if (duration - from > 0.6) keep.push([from, duration]);
} else {
  keep = mode.split(',').map((s) => s.split('-').map(Number));
}
keep = keep.map(([a, b]) => [a, Math.min(b, end)]).filter(([a, b]) => b - a > 0.5);
if (!keep.length) throw new Error('ไม่เหลือช่วงที่เก็บ');
const segs = keep.map(([a, b], i) => {
  const out = path.join(tmp, `seg${i}.webm`);
  execFileSync(ffmpeg, ['-y', '-ss', String(a), '-to', String(b), '-i', input, '-c:v', 'libvpx', '-b:v', '2M', '-an', out], { stdio: 'ignore' });
  return out;
});
if (segs.length === 1) fs.copyFileSync(segs[0], output);
else execFileSync(process.execPath, [path.join(here, 'join-clips.cjs'), output, ...segs], { stdio: 'inherit', env: process.env });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${path.basename(input)} → ${path.basename(output)} · เก็บ ${keep.map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)}s`).join(' + ')} · ${(fs.statSync(output).size / 1e6).toFixed(1)} MB`);
