#!/usr/bin/env node
// คัดลอกหลักฐานของเทส 1 ตัว (evidence/*.png + video.webm) ออกจากโฟลเดอร์ผลรัน ไปเก็บที่ปลายทาง
// ใช้: node collect-evidence.mjs "<test-results/<โฟลเดอร์ของเทส>>" "<clips/<การ์ด> <ระบบ> <วันที่>/<ชื่อชุด>>" [คำนำหน้าไฟล์]
//
// ทำไมไม่ใช้ cp: ชื่อภาพเป็นชื่อ step ภาษาไทยยาวได้ถึง 120 ตัว + path ของโปรเจกต์ยาว → เกิน 260 ตัวของ Windows
// แล้ว `cp -r` ใน Git Bash พังด้วย "No such file or directory" (7 ต.ค. 2026 เสียหลักฐานไป 1 รอบเพราะรอบรันถัดไปล้างโฟลเดอร์ทับ)
// Node อ่าน / เขียน path ยาวได้ → คัดลอกเป็นชื่อสั้น ASCII `<คำนำหน้า>-NN.png` (ใช้อัปโหลด Linear ได้เลย) + index.md จดชื่อเดิมของแต่ละภาพ
import fs from 'node:fs';
import path from 'node:path';

const [source, target, prefix = 'evidence'] = process.argv.slice(2);
if (!source || !target) {
  console.error('ใช้: node collect-evidence.mjs "<โฟลเดอร์ผลของเทส>" "<โฟลเดอร์ปลายทาง>" [คำนำหน้าไฟล์]');
  process.exit(1);
}

const evidenceDir = path.join(source, 'evidence');
if (!fs.existsSync(evidenceDir)) {
  console.error(`ไม่พบ ${evidenceDir}`);
  process.exit(1);
}
fs.mkdirSync(target, { recursive: true });

const lines = [`# หลักฐานจาก ${path.basename(path.resolve(source))}`, '', '| ไฟล์ | ชื่อเดิม (ชื่อ step) | ขนาด (byte) |', '|---|---|---|'];
for (const name of fs.readdirSync(evidenceDir).filter((file) => file.endsWith('.png')).sort()) {
  const order = name.match(/^(\d+)/)?.[1] ?? '00';
  const short = `${prefix}-${order}.png`;
  fs.copyFileSync(path.join(evidenceDir, name), path.join(target, short));
  lines.push(`| ${short} | ${name.replace(/^\d+\s*/, '').replace(/\.png$/, '')} | ${fs.statSync(path.join(target, short)).size} |`);
}

const video = path.join(source, 'video.webm');
if (fs.existsSync(video)) {
  fs.copyFileSync(video, path.join(target, `${prefix}.webm`));
  lines.push(`| ${prefix}.webm | คลิปทั้งเทส | ${fs.statSync(path.join(target, `${prefix}.webm`)).size} |`);
} else {
  lines.push('', 'ไม่มี video.webm (เทสพังก่อนหน้าแรกโหลดเสร็จ?)');
}

fs.writeFileSync(path.join(target, 'index.md'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
