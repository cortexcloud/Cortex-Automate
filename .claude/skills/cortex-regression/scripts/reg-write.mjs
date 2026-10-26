#!/usr/bin/env node
// ลงผลในไฟล์ Regression โดยแก้ XML ของเซลล์ที่ระบุเท่านั้น — กราฟ 9 อัน · สูตร dynamic array · Dropdown · Protect · Conditional Format อยู่ครบ
// (ห้ามใช้ exceljs / openpyxl เขียนไฟล์นี้: ทั้งคู่ทิ้งกราฟและทำสูตร FILTER / LET พัง)
//
// ใช้ (รันที่โฟลเดอร์โปรเจกต์ · ปิดไฟล์ใน Excel ก่อน):
//   node .claude/skills/cortex-regression/scripts/reg-write.mjs "<ไฟล์ .xlsx>" "<changes.json>" [--dry-run] [--allow-locked]
//
// changes.json = [ { "sheet": "E2E core flow", "id": "SMK-OPD-001", "col": "M", "value": "Done" },
//                  { "sheet": "Card Test Cases", "id": "TC-SBH-2394-001", "create": true, "values": { "B": "SBH-2394", "E": "…", "F": "Passed" } },
//                  { "sheet": "Dashboard", "ref": "C96", "value": "Ready" } ]
//   id      = หาแถวจากคอลัมน์ A (E2E แถว 15– · Cards / Card Test Cases แถว 4–) · create: true = ไม่พบให้เพิ่มแถวว่างถัดไป (ใส่ A ให้เอง)
//   ref     = ระบุเซลล์ตรง (หัวไฟล์ · Dashboard หัวข้อ 4–5 · Regression Plan ช่องเหลือง)
//   value   = ข้อความ / ตัวเลข · วันที่ส่งเป็น "yyyy-mm-dd" (คอลัมน์วันที่แปลงเป็นวันที่ของ Excel ให้) · "" = ล้างช่อง
// ก่อนเขียน: สำรองไฟล์ไว้ที่ <โฟลเดอร์ไฟล์>/_backup/ · ตรวจค่ากับ Dropdown · ปฏิเสธช่องสูตร / ช่องเทา
// หลังเขียน: ตั้ง fullCalcOnLoad ให้ Excel คำนวณใหม่ตอนเปิด (ค่าที่สูตร cache ไว้ยังเก่าจนกว่าจะเปิดใน Excel — ใช้ reg-status.mjs ดูผล)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const JSZip = require('jszip');

const args = process.argv.slice(2);
const [file, changesFile] = args.filter((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const allowLocked = args.includes('--allow-locked');
if (!file || !changesFile) {
  console.error('ใช้: node reg-write.mjs "<ไฟล์ .xlsx>" "<changes.json>" [--dry-run] [--allow-locked]');
  process.exit(1);
}

const TESTERS = ['Matt', 'Tar', 'Neran', 'Benz', 'James', 'Aof'];
const LISTS = {
  priority: ['Urgent', 'High', 'Medium', 'Low'],
  level: ['Unit', 'Integration', 'System', 'Acceptance'],
  type: ['Functional', 'UI/UX', 'Security', 'Performance', 'Integration'],
  intent: ['Happy', 'Unhappy', 'Edge', 'Error'],
  exec: ['ToDo', 'Ready for Testing', 'Testing', 'Blocked', 'Done', 'Out of Scope', 'Canceled'],
  severity: ['Critical', 'High', 'Medium', 'Low'],
  impact: ['Extensive', 'Significant', 'Moderate', 'Minor'],
  root: ['Config', 'Master Data', 'Code Bug'],
  defect: ['Open', 'Fixed – Retest Passed'],
  cardResult: ['Passed', 'Passed with Known Issue', 'Failed', 'Not Tested'],
  yesNo: ['Yes', 'No'],
  tcResult: ['Passed', 'Failed', 'Blocked', 'Not Run', 'Out of Scope'],
  env: ['demo-x', 'stg-tmh', 'stg-sbh', 'stg-nuh'],
  signoff: ['Ready', 'Not Ready', 'N/A'],
  approval: ['PO', 'CAB'],
};

// ช่องที่เขียนได้ ต่อชีต: list = ต้องอยู่ใน Dropdown · date = วันที่ · locked = Protect หลัง Day 0 (ต้อง --allow-locked + PO อนุมัติ)
const RULES = {
  'E2E core flow': {
    firstRow: 15,
    cols: { A: {}, B: {}, C: {}, D: {}, E: {}, F: {}, H: {}, I: { list: 'level' }, J: { list: 'type' }, K: { list: 'intent' }, L: { list: 'priority', locked: true },
      M: { list: 'exec' }, N: {}, O: {}, P: { list: 'severity' }, Q: { list: 'impact' }, S: { list: 'root' }, T: { list: 'defect' }, U: { list: 'tester' }, V: { date: true }, X: {} },
    refs: { B1: {}, B2: {}, B3: {}, B4: { list: 'env' }, D1: {}, D2: {}, D3: {}, C12: {} },
  },
  Cards: {
    firstRow: 4,
    cols: { A: {}, B: {}, C: {}, E: {}, F: { list: 'priority', locked: true }, H: { list: 'yesNo', locked: true }, I: {}, J: { list: 'cardResult' }, K: {} },
  },
  'Card Test Cases': {
    firstRow: 4,
    cols: { A: {}, B: {}, E: {}, F: { list: 'tcResult' }, G: { list: 'tester' }, H: { date: true }, I: {}, J: {} },
  },
  Dashboard: {
    refs: Object.fromEntries([
      ...['C96', 'D96', 'E96', 'F96', 'G96'].map((r) => [r, { list: 'signoff' }]),
      ['I96', {}], ['J96', { date: true }], ['K96', {}],
      ...Array.from({ length: 20 }, (_, i) => 105 + i).flatMap((r) => [
        [`B${r}`, {}], [`C${r}`, {}], [`D${r}`, { list: 'priority' }], [`E${r}`, {}], [`F${r}`, {}],
        [`I${r}`, { list: 'approval' }], [`J${r}`, {}], [`K${r}`, { date: true }], [`L${r}`, {}], [`M${r}`, {}],
      ]),
    ]),
  },
  'Regression Plan': { refs: { B14: { date: true }, B15: { number: true }, B79: { number: true }, B80: { number: true }, B81: { number: true }, B82: { number: true } } },
  // PO / BA เป็นเจ้าของชีตนี้ — Claude เพิ่มชื่อ Module ได้เมื่อมี Scenario ของ Module ใหม่ (Dashboard B200 ดึงรายชื่อ Module จากคอลัมน์ A) · D = สูตร
  'Ownership Matrix': { firstRow: 5, cols: { A: {}, B: {}, C: {}, E: {}, F: {}, G: {}, H: {}, I: {} } },
};

const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colNum = (c) => [...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const splitRef = (ref) => { const m = /^([A-Z]+)(\d+)$/.exec(ref); if (!m) fail(`อ้างเซลล์ผิด: ${ref}`); return [m[1], Number(m[2])]; };
const dateSerial = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) return null;
  return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000);
};
const decodeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// --- ไฟล์ถูกเปิดอยู่ใน Excel? (Excel ล็อกไฟล์ + สร้าง ~$ชื่อไฟล์) ---
const lockFile = path.join(path.dirname(file), `~$${path.basename(file).slice(2)}`);
const lockFile2 = path.join(path.dirname(file), `~$${path.basename(file)}`);
if (!dryRun && (fs.existsSync(lockFile) || fs.existsSync(lockFile2))) fail('ไฟล์เปิดอยู่ใน Excel (เจอไฟล์ล็อก ~$…) — ปิด Excel แล้วรันใหม่');
if (!dryRun) {
  try { fs.closeSync(fs.openSync(file, 'r+')); } catch (e) { fail(`เขียนไฟล์ไม่ได้ (${e.code}) — ปิดไฟล์ใน Excel / รอ OneDrive ซิงก์ แล้วรันใหม่`); }
}

const changes = JSON.parse(fs.readFileSync(changesFile, 'utf8'));
const zip = await JSZip.loadAsync(fs.readFileSync(file));

// ชื่อชีต → ไฟล์ XML
const wbXml = await zip.file('xl/workbook.xml').async('string');
const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
const sheetPath = {};
for (const m of wbXml.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
  const target = new RegExp(`<Relationship [^>]*Id="${m[2]}"[^>]*Target="([^"]+)"`).exec(relsXml) || new RegExp(`<Relationship [^>]*Target="([^"]+)"[^>]*Id="${m[2]}"`).exec(relsXml);
  sheetPath[decodeXml(m[1])] = `xl/${target[1].replace(/^\/?xl\//, '')}`;
}
const shared = (await zip.file('xl/sharedStrings.xml')?.async('string')) ?? '';
const sst = [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decodeXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));

const xmlCache = {};
const sheetXml = async (name) => {
  if (!sheetPath[name]) fail(`ไม่มีชีต "${name}" ในไฟล์`);
  return (xmlCache[name] ??= await zip.file(sheetPath[name]).async('string'));
};

function findRow(xml, r) {
  const start = xml.indexOf(`<row r="${r}"`);
  if (start < 0) return null;
  const close = xml.indexOf('>', start);
  if (xml[close - 1] === '/') return { start, end: close + 1, open: xml.slice(start, close - 1) + '>', body: '' };
  const end = xml.indexOf('</row>', start) + 6;
  return { start, end, open: xml.slice(start, close + 1), body: xml.slice(close + 1, end - 6) };
}
function cellsOf(body) {
  return [...body.matchAll(/<c r="([A-Z]+)(\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)].map((m) => ({ col: m[1], xml: m[0], index: m.index }));
}
function cellValue(cellXml) {
  if (!cellXml) return '';
  const t = /\bt="(\w+)"/.exec(cellXml)?.[1];
  if (t === 'inlineStr') return decodeXml([...cellXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''));
  const v = /<v>([\s\S]*?)<\/v>/.exec(cellXml)?.[1];
  if (v == null) return '';
  return t === 's' ? sst[Number(v)] : decodeXml(v);
}
function readCell(xml, ref) {
  const [col, r] = splitRef(ref);
  const row = findRow(xml, r);
  return row ? cellValue(cellsOf(row.body).find((c) => c.col === col)?.xml) : '';
}
function colStyle(xml, col) {
  const n = colNum(col);
  for (const m of xml.matchAll(/<col [^>]*>/g)) {
    const min = Number(/min="(\d+)"/.exec(m[0])[1]), max = Number(/max="(\d+)"/.exec(m[0])[1]);
    if (n >= min && n <= max) return /style="(\d+)"/.exec(m[0])?.[1];
  }
  return undefined;
}
function setCell(xml, ref, value, opts = {}) {
  const { date } = opts;
  const [col, r] = splitRef(ref);
  let row = findRow(xml, r);
  if (!row) {
    // แทรกแถวใหม่ตามลำดับเลขแถว
    const rows = [...xml.matchAll(/<row r="(\d+)"/g)];
    const after = rows.find((m) => Number(m[1]) > r);
    const at = after ? after.index : xml.indexOf('</sheetData>');
    xml = `${xml.slice(0, at)}<row r="${r}"></row>${xml.slice(at)}`;
    row = findRow(xml, r);
  }
  const cells = cellsOf(row.body);
  const existing = cells.find((c) => c.col === col);
  if (existing && /<f[ >]/.test(existing.xml)) fail(`${ref} เป็นช่องสูตร — ห้ามเขียนทับ`);
  // เซลล์ใหม่ในแถวข้อมูล: ใช้สไตล์ของคอลัมน์เดียวกันในแถวข้อมูลแรก (ตัดบรรทัด / ขอบ) — สไตล์ของคอลัมน์ทั้งคอลัมน์ไม่ตัดบรรทัด
  const style = (existing && /\bs="(\d+)"/.exec(existing.xml)?.[1]) ?? opts.templateStyles?.[col] ?? colStyle(xml, col);
  const s = style ? ` s="${style}"` : '';
  let cell;
  if (value === '' || value == null) cell = `<c r="${ref}"${s}/>`;
  else if (date) {
    const serial = dateSerial(value);
    if (serial == null) fail(`${ref}: วันที่ต้องเป็น yyyy-mm-dd (ได้ "${value}")`);
    cell = `<c r="${ref}"${s}><v>${serial}</v></c>`;
  } else if (typeof value === 'number' || (opts.number && value !== '' && !isNaN(Number(value)))) cell = `<c r="${ref}"${s}><v>${Number(value)}</v></c>`;
  else cell = `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
  let body;
  if (existing) body = row.body.slice(0, existing.index) + cell + row.body.slice(existing.index + existing.xml.length);
  else {
    const next = cells.find((c) => colNum(c.col) > colNum(col));
    body = next ? row.body.slice(0, next.index) + cell + row.body.slice(next.index) : row.body + cell;
  }
  // spans เป็นแค่คำใบ้ — คำนวณใหม่จากเซลล์จริง
  const cols = cellsOf(body).map((c) => colNum(c.col));
  const open = row.open.replace(/\s*\/?>$/, '>').replace(/ spans="[^"]*"/, cols.length ? ` spans="${Math.min(...cols)}:${Math.max(...cols)}"` : '');
  return xml.slice(0, row.start) + open + body + '</row>' + xml.slice(row.end);
}

function rowOfId(xml, firstRow, id) {
  for (let r = firstRow; r <= 1000; r++) if (readCell(xml, `A${r}`).trim() === id) return r;
  return null;
}
function nextEmptyRow(xml, firstRow) {
  let last = firstRow - 1;
  for (let r = firstRow; r <= 1000; r++) if (readCell(xml, `A${r}`).trim()) last = r;
  if (last >= 1000) fail('ถึงแถว 1000 แล้ว — สูตร / Dropdown รองรับถึงแถว 1000 แจ้งผู้ดูแลไฟล์ขยายช่วง');
  return last + 1;
}
function validate(sheet, ref, rule, value) {
  if (rule.locked && !allowLocked) fail(`${sheet}!${ref} ล็อกหลัง Day 0 (Priority / TOR) — เปลี่ยนได้เมื่อ PO อนุมัติ แล้วรันพร้อม --allow-locked`);
  if (value === '' || value == null) return;
  const list = rule.list === 'tester' ? TESTERS : LISTS[rule.list];
  if (list && !list.includes(value)) fail(`${sheet}!${ref} = "${value}" ไม่อยู่ใน Dropdown (${list.join(' / ')})`);
}

const log = [];
for (const ch of changes) {
  const rules = RULES[ch.sheet];
  if (!rules) fail(`ชีต "${ch.sheet}" เขียนไม่ได้ (เขียนได้: ${Object.keys(RULES).join(', ')})`);
  let xml = await sheetXml(ch.sheet);
  const writes = [];
  if (ch.ref) {
    const [col, r] = splitRef(ch.ref);
    const rule = rules.refs?.[ch.ref] ?? (rules.cols && r >= rules.firstRow ? rules.cols[col] : undefined);
    if (!rule) fail(`${ch.sheet}!${ch.ref} ไม่ใช่ช่องที่ให้กรอก (ช่องสูตร / ช่องเทา / นอกพื้นที่)`);
    writes.push([ch.ref, rule, ch.value]);
  } else if (ch.id) {
    if (!rules.cols) fail(`ชีต "${ch.sheet}" ใช้ id ไม่ได้ — ใช้ ref`);
    let r = rowOfId(xml, rules.firstRow, ch.id);
    if (!r && ch.create) { r = nextEmptyRow(xml, rules.firstRow); writes.push([`A${r}`, rules.cols.A, ch.id]); }
    if (!r) fail(`ไม่พบ "${ch.id}" ในคอลัมน์ A ของชีต ${ch.sheet} (ถ้าจะเพิ่มแถวใหม่ใส่ "create": true)`);
    const values = ch.values ?? { [ch.col]: ch.value };
    for (const [col, value] of Object.entries(values)) {
      const rule = rules.cols[col];
      if (!rule) fail(`${ch.sheet} คอลัมน์ ${col} ไม่ใช่ช่องที่ให้กรอก (ช่องสูตร / ช่องเทา)`);
      writes.push([`${col}${r}`, rule, value]);
    }
  } else fail(`รายการต้องมี ref หรือ id: ${JSON.stringify(ch)}`);
  const tplRow = rules.firstRow ? findRow(xml, rules.firstRow) : null;
  const templateStyles = tplRow ? Object.fromEntries(cellsOf(tplRow.body).map((c) => [c.col, /\bs="(\d+)"/.exec(c.xml)?.[1]]).filter(([, s]) => s)) : undefined;
  for (const [ref, rule, value] of writes) {
    validate(ch.sheet, ref, rule, value);
    const before = readCell(xml, ref);
    xml = setCell(xml, ref, value, { ...rule, templateStyles });
    log.push(`${ch.sheet}!${ref}: "${String(before).replace(/\n/g, '⏎').slice(0, 40)}" → "${String(value ?? '').replace(/\n/g, '⏎').slice(0, 60)}"`);
  }
  xmlCache[ch.sheet] = xml;
}

console.log(log.join('\n'));
if (dryRun) { console.log(`\n(dry-run — ยังไม่เขียน ${log.length} ช่อง)`); process.exit(0); }

for (const [name, xml] of Object.entries(xmlCache)) zip.file(sheetPath[name], xml);
zip.file('xl/workbook.xml', wbXml.replace(/<calcPr([^>]*?)\s*\/>/, (m, attrs) => (/fullCalcOnLoad/.test(attrs) ? m : `<calcPr${attrs} fullCalcOnLoad="1"/>`)));

const backupDir = path.join(path.dirname(file), '_backup');
fs.mkdirSync(backupDir, { recursive: true });
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const backup = path.join(backupDir, `${path.basename(file, '.xlsx')}.${stamp}.xlsx`);
fs.copyFileSync(file, backup);
const old = fs.readdirSync(backupDir).filter((f) => f.startsWith(path.basename(file, '.xlsx') + '.')).sort();
for (const f of old.slice(0, Math.max(0, old.length - 20))) fs.unlinkSync(path.join(backupDir, f));

const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
fs.writeFileSync(file, buffer);
console.log(`\n✓ เขียน ${log.length} ช่อง · สำรองไฟล์เดิม: ${backup}`);
