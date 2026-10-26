// ลงผลรัน Scenario BizSim (clips/BizSim <ระบบ> <วันที่>/<Case_id>.json) ลงไฟล์ Excel ของทีม
//   ชีต "Scenario-OPD BizSim"  → คอลัมน์ F Pass / G Fail (No Pass · Block) / H N/A ของแต่ละขั้น + ต่อท้าย NOTE (I)
//   ชีต "Bug list (OPDBIzSim)" → บั๊กเดิม (No.) ต่อท้ายหมายเหตุ (K) "Retest Automate …" · บั๊กใหม่เพิ่มแถวว่างถัดไป (ชื่อซ้ำ = ต่อท้ายหมายเหตุแถวเดิม)
//
// ใช้:  node mock-data/bizsim-log.mjs                       → ดูสิ่งที่จะเขียน (ไม่แตะไฟล์) — ผลรันของวันนี้ ระบบ sbh-prod
//       node mock-data/bizsim-log.mjs --write               → เขียนจริง (สำรองไฟล์เดิมไว้ที่ E2E/backup/ ก่อน)
//       --date=2026-10-22  --system=sbh-prod  --case=APM-OPD-001  --file="E2E/New file Test case OPD #2.xlsx"
//
// ไม่ใช้ exceljs เขียนไฟล์: ไฟล์มีรูปในเซลล์ (richData) / webextension / named sheet views ที่ exceljs ทิ้งตอนเขียน
// → อ่านตำแหน่งแถวด้วย exceljs อย่างเดียว แล้วแก้เฉพาะเซลล์ใน XML ของ 2 ชีต (ค่าเป็น inline string · คง style เดิมของเซลล์) ไฟล์อื่นใน zip คงเดิม
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, ...v]) => [k, v.length ? v.join('=') : true]));
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
const date = args.date ?? today;
const system = args.system ?? 'sbh-prod';
const file = path.resolve(args.file ?? 'E2E/New file Test case OPD #2.xlsx');
const resultDir = path.resolve('clips', `BizSim ${system} ${date}`);
const SCENARIO_SHEET = 'Scenario-OPD BizSim';
const BUG_SHEET = 'Bug list (OPDBIzSim)';
const [y, m, d] = date.split('-').map(Number);
const thaiDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y + 543).slice(2)}`;
const MARK = `[Automate ${thaiDate}]`;
const RETEST = `[Retest Automate ${thaiDate}]`;

if (!fs.existsSync(resultDir)) {
  console.error(`ไม่พบโฟลเดอร์ผลรัน: ${resultDir}`);
  process.exit(1);
}
const runs = fs
  .readdirSync(resultDir)
  .filter((f) => /^[A-Z]{3}-[A-Z]{3}-\d{3}\.json$/.test(f) && (!args.case || f === `${args.case}.json`))
  .map((f) => JSON.parse(fs.readFileSync(path.join(resultDir, f), 'utf8')));
if (!runs.length) {
  console.error(`ไม่มีผลรันใน ${resultDir}${args.case ? ` ของ ${args.case}` : ''}`);
  process.exit(1);
}

// ---------- อ่านตำแหน่งแถว (exceljs อ่านอย่างเดียว) ----------
const text = (cell) => {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object') return v.richText ? v.richText.map((t) => t.text).join('') : String(v.text ?? v.result ?? '');
  return String(v);
};
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const scenario = wb.getWorksheet(SCENARIO_SHEET);
const bugSheet = wb.getWorksheet(BUG_SHEET);
if (!scenario || !bugSheet) throw new Error(`ไฟล์ไม่มีชีต "${SCENARIO_SHEET}" / "${BUG_SHEET}"`);

/** แถวเริ่มของแต่ละ Case_id (คอลัมน์ A) → แถวขั้นถัดมาจนถึง Case_id ตัวถัดไป */
function caseRows(caseId) {
  const rows = [];
  let inside = false;
  scenario.eachRow({ includeEmpty: false }, (row, n) => {
    const a = norm(text(row.getCell(1)));
    if (/^[A-Z]{3}-[A-Z]{3}-\d{3}$/.test(a) || /^(Appointment|Walk in|Refill|Injection|Admit|ODS|Inventory)$/.test(a)) {
      inside = a === caseId;
      return;
    }
    if (inside) rows.push({ n, title: norm(text(row.getCell(3))), note: text(row.getCell(9)) });
  });
  return rows;
}

const edits = { [SCENARIO_SHEET]: new Map(), [BUG_SHEET]: new Map() };
const set = (sheet, ref, value) => edits[sheet].set(ref, value);
const plan = [];

/** NOTE เดิม + บรรทัดใหม่ (ลบบรรทัด marker เดียวกันของรอบก่อนในวันเดียวกัน — รันซ้ำไม่ซ้อน) */
function appendNote(old, marker, line) {
  // บรรทัดของ automate ต่อท้ายเสมอ → ลบตั้งแต่บรรทัด marker ของวันนี้บรรทัดแรกลงไปทั้งหมด (รวมเศษบรรทัดของข้อความที่เคยขึ้นบรรทัดใหม่)
  const lines = String(old ?? '').split('\n');
  const first = lines.findIndex((l) => l.startsWith(marker));
  const kept = (first < 0 ? lines : lines.slice(0, first)).filter((l, i, arr) => l.trim() || i < arr.length - 1);
  // 1 รายการ = 1 บรรทัด: ข้อความ error ของ API มีขึ้นบรรทัดใหม่ติดมา
  return [...kept, `${marker} ${String(line).replace(/\s*\n\s*/g, ' ')}`].join('\n').replace(/^\n+/, '');
}

// ---------- ชีต Scenario ----------
for (const run of runs) {
  const rows = caseRows(run.caseId);
  if (!rows.length) {
    plan.push(`! ${run.caseId}: ไม่เจอ Case_id ในชีต ${SCENARIO_SHEET}`);
    continue;
  }
  const who = [run.facts.hn && `HN ${run.facts.hn}`, run.facts.vn].filter(Boolean).join(' ');
  for (const step of run.steps.filter((s) => !s.pre)) {
    const row = rows.find((r) => r.title === norm(step.title));
    if (!row) {
      plan.push(`! ${run.caseId}: ไม่เจอแถวขั้น "${step.title}"`);
      continue;
    }
    const col = { Pass: ['F', 'Pass'], Fail: ['G', 'No Pass'], Block: ['G', 'Block'], 'N/A': ['H', 'N/A'] }[step.status];
    for (const c of ['F', 'G', 'H']) set(SCENARIO_SHEET, `${c}${row.n}`, c === col[0] ? col[1] : '');
    const note = appendNote(row.note, `${MARK}`, `${who} · ${step.status}${step.notes.length ? ' · ' + step.notes.join(' · ') : ''}`);
    set(SCENARIO_SHEET, `I${row.n}`, note);
    plan.push(`${run.caseId} แถว ${row.n} "${step.title}" → ${col[1]}`);
  }
}

// ---------- ชีต Bug list ----------
const bugRows = [];
bugSheet.eachRow({ includeEmpty: true }, (row, n) => {
  if (n === 1) return;
  bugRows.push({ n, no: norm(text(row.getCell(1))), title: norm(text(row.getCell(2))), status: norm(text(row.getCell(6))), note: text(row.getCell(11)) });
});
// รวมบั๊กจากทุก Scenario ตามชื่อ + ผล
const findings = new Map();
for (const run of runs) {
  for (const bug of run.bugs) {
    const key = `${bug.known ?? norm(bug.title)}|${bug.result}`;
    const where = `${run.caseId} ขั้น "${bug.step}" (HN ${run.facts.hn ?? '-'})`;
    const evidence = bug.evidence.map((e) => path.relative(process.cwd(), e)).slice(0, 6); // คู่ภาพ + คลิปของจุด Fail
    const prev = findings.get(key);
    if (prev) prev.where.push(`${where}: ${bug.actual}`), prev.evidence.push(...evidence);
    else findings.set(key, { ...bug, where: [`${where}: ${bug.actual}`], evidence });
  }
}
const label = { found: 'ยังพบ', fixed: 'ไม่พบแล้ว', unverifiable: 'ตรวจไม่ได้' };
for (const bug of findings.values()) {
  const detail = `${bug.where.join(' · ')}${bug.evidence.length ? ` · หลักฐาน: ${[...new Set(bug.evidence)].join(', ')}` : ''}`;
  let row = bug.known ? bugRows.find((r) => r.no === String(bug.known)) : bugRows.find((r) => r.title && r.title === norm(bug.title));
  if (row) {
    const marker = bug.known ? RETEST : MARK;
    set(BUG_SHEET, `K${row.n}`, appendNote(row.note, marker, `${bug.known ? label[bug.result] + ' — ' : ''}${detail}`));
    if (bug.result === 'found' && row.status !== 'No Pass') set(BUG_SHEET, `F${row.n}`, 'No Pass');
    row.note = edits[BUG_SHEET].get(`K${row.n}`);
    plan.push(`Bug No.${row.no} (แถว ${row.n}) ${bug.known ? label[bug.result] : 'บั๊กใหม่ (มีแถวแล้ว) ต่อหมายเหตุ'} — ${norm(bug.title).slice(0, 60)}`);
    continue;
  }
  if (bug.result !== 'found') continue; // บั๊กใหม่ที่ไม่พบ ไม่ต้องลง
  row = bugRows.find((r) => !r.title && !edits[BUG_SHEET].has(`B${r.n}`));
  if (!row) {
    plan.push(`! ไม่มีแถวว่างในชีต Bug list สำหรับ: ${bug.title}`);
    continue;
  }
  set(BUG_SHEET, `B${row.n}`, bug.title);
  set(BUG_SHEET, `C${row.n}`, bug.module);
  set(BUG_SHEET, `D${row.n}`, bug.type);
  set(BUG_SHEET, `E${row.n}`, bug.priority);
  set(BUG_SHEET, `F${row.n}`, 'No Pass');
  set(BUG_SHEET, `K${row.n}`, `${MARK} พบจาก automate (${system}) — ${detail}`);
  row.title = norm(bug.title);
  plan.push(`Bug ใหม่ No.${row.no} (แถว ${row.n}) — ${bug.title.slice(0, 80)}`);
}

console.log(`ไฟล์: ${file}\nผลรัน: ${runs.map((r) => r.caseId).join(', ')} (${resultDir})\n`);
console.log(plan.join('\n'));
console.log(`\nเซลล์ที่จะเขียน: ${SCENARIO_SHEET} ${edits[SCENARIO_SHEET].size} · ${BUG_SHEET} ${edits[BUG_SHEET].size}`);
// --emit=<ไฟล์> = เขียนรายการเซลล์ที่จะแก้เป็น JSON (ใช้กับ Excel ที่เปิดไฟล์อยู่: mock-data/bizsim-log-excel.ps1 เขียนผ่าน Excel แล้วบันทึก)
if (args.emit) {
  fs.writeFileSync(args.emit, JSON.stringify(Object.fromEntries(Object.entries(edits).map(([k, v]) => [k, Object.fromEntries(v)])), null, 1));
  console.log(`\nรายการเซลล์ → ${args.emit}`);
  process.exit(0);
}
if (!args.write) {
  console.log('\n(ดูอย่างเดียว — ใส่ --write เพื่อเขียนลงไฟล์)');
  process.exit(0);
}

// ---------- เขียน: แก้ XML ของ 2 ชีตใน zip ----------
const zip = await JSZip.loadAsync(fs.readFileSync(file));
const workbookXml = await zip.file('xl/workbook.xml').async('string');
const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
const sheetPath = (name) => {
  const esc = name.replace(/&/g, '&amp;');
  const rid = workbookXml.match(new RegExp(`<sheet [^>]*name="${esc.replace(/[()]/g, '\\$&')}"[^>]*r:id="([^"]+)"`))?.[1];
  const target = relsXml.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`))?.[1] ?? relsXml.match(new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`))?.[1];
  if (!target) throw new Error(`หาไฟล์ของชีต ${name} ใน zip ไม่เจอ`);
  return `xl/${target.replace(/^\/?xl\//, '')}`;
};
const colNum = (ref) => ref.match(/^[A-Z]+/)[0].split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function setCell(xml, ref, value) {
  const rowNo = Number(ref.match(/\d+$/)[0]);
  const rowRe = new RegExp(`<row r="${rowNo}"([^>]*?)(/>|>([\\s\\S]*?)</row>)`);
  const match = xml.match(rowRe);
  const cellXml = (style) => (value === '' ? `<c r="${ref}"${style}/>` : `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(value)}</t></is></c>`);
  if (!match) {
    // แถวยังไม่มี → แทรกตามลำดับ
    const rows = [...xml.matchAll(/<row r="(\d+)"/g)];
    const after = rows.find((r) => Number(r[1]) > rowNo);
    const newRow = `<row r="${rowNo}">${cellXml('')}</row>`;
    return after ? xml.slice(0, after.index) + newRow + xml.slice(after.index) : xml.replace('</sheetData>', `${newRow}</sheetData>`);
  }
  const attrs = match[1];
  const inner = match[3] ?? '';
  const cellRe = new RegExp(`<c r="${ref}"([^>]*?)(/>|>[\\s\\S]*?</c>)`);
  const existing = inner.match(cellRe);
  let newInner;
  if (existing) {
    const style = existing[1].match(/ s="\d+"/)?.[0] ?? '';
    newInner = inner.replace(cellRe, cellXml(style));
  } else {
    const cells = [...inner.matchAll(/<c r="([A-Z]+)\d+"/g)];
    const next = cells.find((c) => colNum(c[1]) > colNum(ref));
    newInner = next ? inner.slice(0, next.index) + cellXml('') + inner.slice(next.index) : inner + cellXml('');
  }
  return xml.replace(rowRe, `<row r="${rowNo}"${attrs}>${newInner}</row>`);
}

const backupDir = path.join(path.dirname(file), 'backup');
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backup = path.join(backupDir, `${path.basename(file, '.xlsx')} ${stamp}.xlsx`);
fs.copyFileSync(file, backup);
for (const [sheet, cells] of Object.entries(edits)) {
  if (!cells.size) continue;
  const p = sheetPath(sheet);
  let xml = await zip.file(p).async('string');
  for (const [ref, value] of cells) xml = setCell(xml, ref, value);
  zip.file(p, xml, { createFolders: false });
}
const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
try {
  fs.writeFileSync(file, out);
} catch (e) {
  console.error(`เขียนไฟล์ไม่ได้ (เปิดอยู่ใน Excel?): ${e.message}`);
  process.exit(1);
}
// ตรวจว่าไฟล์ที่เขียนเปิดอ่านได้
await new ExcelJS.Workbook().xlsx.readFile(file);
console.log(`\nเขียนแล้ว ✓ · สำรองไฟล์เดิม: ${backup}`);
