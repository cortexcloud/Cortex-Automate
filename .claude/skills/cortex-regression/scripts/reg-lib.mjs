// อ่านไฟล์ Regression ({Site}_Regression_v{X}.xlsx) แล้วคำนวณผลแบบเดียวกับสูตรใน Excel
// ทำไมคำนวณเอง: สคริปต์ reg-write.mjs แก้ XML ตรงๆ ค่าที่ Excel คำนวณเก็บไว้ (cached value) จึงเก่าจนกว่าจะเปิดไฟล์ใน Excel
// → สรุปสถานะต้องคำนวณจากช่องที่ QA กรอกเท่านั้น (ตรรกะลอกจากสูตรชีต E2E core flow G/R/W/Z · Cards G/L–S · Dashboard B10 · Dashboard Feed P11)
// สูตรของ Template เปลี่ยน → แก้ฟังก์ชัน evaluate() ให้ตรง แล้วจดใน references/workbook-map.md
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'package.json'));

export const SHEETS = { e2e: 'E2E core flow', cards: 'Cards', tc: 'Card Test Cases', dash: 'Dashboard', plan: 'Regression Plan', owner: 'Ownership Matrix' };
export const FIRST_ROW = { [SHEETS.e2e]: 15, [SHEETS.cards]: 4, [SHEETS.tc]: 4 };
export const LAST_ROW = 1000;
export const FIXED = 'Fixed – Retest Passed';

const SEVERITY = ['Critical', 'High', 'Medium', 'Low'];
const IMPACT = ['Extensive', 'Significant', 'Moderate', 'Minor'];
const BUG_MATRIX = [
  ['Urgent', 'Urgent', 'High', 'High'],
  ['Urgent', 'High', 'High', 'Medium'],
  ['High', 'High', 'Medium', 'Medium'],
  ['Medium', 'Medium', 'Low', 'Low'],
];

/** ค่าของเซลล์เป็นข้อความ (สูตร = ค่าที่ cache ไว้ · วันที่ = yyyy-mm-dd) */
export function text(cell) {
  let v = cell?.value;
  if (v && typeof v === 'object') {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if ('result' in v || v.formula || v.sharedFormula) v = v.result;
    else if (v.richText) v = v.richText.map((t) => t.text).join('');
    else if (v.text) v = v.text;
    else if (v.error) v = v.error;
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v == null ? '' : String(v);
}

export async function loadWorkbook(file) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  return wb;
}

/** อ่านเฉพาะช่องที่คนกรอก (ไม่ใช้ค่าที่สูตร cache ไว้) */
export async function readRegression(file) {
  const wb = await loadWorkbook(file);
  const e2e = wb.getWorksheet(SHEETS.e2e);
  const cards = wb.getWorksheet(SHEETS.cards);
  const tc = wb.getWorksheet(SHEETS.tc);
  const dash = wb.getWorksheet(SHEETS.dash);
  const plan = wb.getWorksheet(SHEETS.plan);
  const owner = wb.getWorksheet(SHEETS.owner);
  const get = (ws, ref) => text(ws.getCell(ref)).trim();

  const header = {
    project: get(e2e, 'B1'), suite: get(e2e, 'B2'), version: get(e2e, 'B3'), environment: get(e2e, 'B4'),
    sprint: get(e2e, 'D1'), executedBy: get(e2e, 'D2'), executedDate: get(e2e, 'D3'), sop: get(e2e, 'C12'),
  };

  const rows = (ws, first, cols) => {
    const list = [];
    for (let r = first; r <= LAST_ROW; r++) {
      const row = { row: r };
      for (const c of cols) row[c] = text(ws.getCell(`${c}${r}`)).trim();
      if (row.A) list.push(row);
    }
    return list;
  };
  const scenarios = rows(e2e, 15, 'ABCDEFHIJKLMNOPQSTUVX'.split(''));
  const cardRows = rows(cards, 4, 'ABCEFHIJK'.split(''));
  const tcs = rows(tc, 4, 'ABEFGHIJ'.split(''));

  const riskLog = [];
  for (let r = 105; r <= 124; r++) {
    const id = get(dash, `B${r}`);
    if (id) riskLog.push({ row: r, id, module: get(dash, `C${r}`), priority: get(dash, `D${r}`), summary: get(dash, `E${r}`), level: get(dash, `I${r}`), approvedBy: get(dash, `J${r}`), date: get(dash, `K${r}`) });
  }
  const signoff = { environment: get(dash, 'C96'), version: get(dash, 'D96'), master: get(dash, 'E96'), config: get(dash, 'F96'), linear: get(dash, 'G96'), by: get(dash, 'I96'), date: get(dash, 'J96') };
  const thresholds = { e2e: Number(get(plan, 'B79') || 1), cards: Number(get(plan, 'B80') || 0.9), tc: Number(get(plan, 'B81') || 0.9), knownIssue: Number(get(plan, 'B82') || 0.1) };
  const timeline = { start: get(plan, 'B14'), duration: get(plan, 'B15') };
  const modules = [];
  for (let r = 5; r <= 200; r++) {
    const m = get(owner, `A${r}`);
    if (m) modules.push({ module: m, feature: get(owner, `B${r}`), team: get(owner, `C${r}`) });
  }
  return { file, header, scenarios, cards: cardRows, tcs, riskLog, signoff, thresholds, timeline, modules };
}

const has = (s) => String(s ?? '').trim() !== '';
const contains = (haystack, needle) => has(needle) && String(haystack).toLowerCase().includes(String(needle).toLowerCase());
const isMedLow = (p) => p === 'Medium' || p === 'Low';

export function bugPriority(s) {
  if (!has(s.O)) return '';
  if (!s.P || !s.Q) return 'ระบุ Severity + Impact';
  const i = SEVERITY.indexOf(s.P), j = IMPACT.indexOf(s.Q);
  return i < 0 || j < 0 ? '-' : BUG_MATRIX[i][j];
}

/** คำนวณคอลัมน์ Auto ทุกชีต + Release Decision / Risk Level / เกณฑ์ผ่าน */
export function evaluate(data) {
  const { scenarios, cards, tcs, riskLog } = data;
  const cab = (id) => riskLog.some((r) => r.level === 'CAB' && r.id === id);
  const inRiskLog = (id) => riskLog.some((r) => r.id === id);
  const linkedCards = (sid) => cards.filter((c) => contains(c.E, sid));

  for (const s of scenarios) {
    s.hasBug = s.T !== FIXED && (has(s.O) || has(s.P));
    s.R = bugPriority(s);
    if (s.M === 'Out of Scope' || s.M === 'Canceled') s.W = 'Out of Scope';
    else if (s.M === 'Blocked') s.W = 'Blocked';
    else if (s.hasBug) s.W = isMedLow(s.L) && linkedCards(s.A).every((c) => isMedLow(c.F)) ? 'Conditionally Passed' : 'Failed';
    else s.W = s.M === 'Done' ? 'Passed' : 'Not Run';
    s.Z = '';
    if (s.M !== 'Out of Scope' && s.M !== 'Canceled' && s.hasBug) {
      if (s.W === 'Failed' || ['Urgent', 'High', 'ระบุ Severity + Impact'].includes(s.R)) s.Z = cab(s.O) ? 'Accepted (CF)' : 'Blocking';
      else s.Z = 'Deferrable';
    }
    s.highFlow = s.L === 'Urgent' || s.L === 'High' || s.L === '';
    s.cards = linkedCards(s.A).map((c) => c.A);
  }

  for (const c of cards) {
    const linked = scenarios.filter((s) => contains(c.E, s.A));
    const v = (x) => linked.some((s) => s.W === x);
    c.G = !has(c.E) ? 'Pending Mapping' : !linked.length ? 'ไม่พบ Scenario ID ใน E2E'
      : v('Failed') ? 'Failed' : v('Blocked') ? 'Blocked' : v('Not Run') ? 'Ready for Testing'
      : v('Conditionally Passed') ? 'Conditionally Passed' : v('Passed') ? 'Passed' : 'Out of Scope';
    c.inGate = c.H !== 'No' || !isMedLow(c.F);
    if (c.J === 'Passed') c.L = '';
    else if (c.J === 'Passed with Known Issue') c.L = 'Known Issue';
    else if (c.J === '') c.L = c.inGate ? 'Pending Result' : '';
    else if (c.inGate) c.L = cab(c.A) ? 'Accepted (CF)' : 'Blocking';
    else c.L = c.J === 'Failed' ? 'Deferrable' : 'Carry Over';
    c.M = linked[0]?.B ?? (has(c.E) ? '-' : '');
    const mine = tcs.filter((t) => t.B === c.A);
    c.O = mine.filter((t) => t.F !== 'Out of Scope').length;
    c.P = mine.filter((t) => t.F === 'Passed').length;
    c.Q = mine.filter((t) => t.F === 'Failed').length;
    c.R = c.O - c.P - c.Q;
    c.N = c.O === 0 ? (mine.length ? 'Out of Scope' : 'No TC') : c.Q > 0 ? 'Failed' : mine.some((t) => t.F === 'Blocked') ? 'Blocked' : c.R > 0 ? 'In Progress' : 'Passed';
    c.S = [...new Set([...mine.map((t) => t.G), ...linked.map((s) => s.U)].filter(has))].join(', ');
  }
  for (const t of tcs) {
    const card = cards.find((c) => c.A === t.B);
    t.C = card ? card.B : 'ไม่พบ Card ID ในชีต Cards';
    t.D = card ? card.M : '';
    t.result = t.F || 'Not Run';
  }

  const count = (list, fn) => list.filter(fn).length;
  const sc = scenarios.filter((s) => s.W !== 'Out of Scope');
  const area = (list, key) => {
    const p = count(list, (x) => x[key] === 'Passed'), cp = count(list, (x) => x[key] === 'Conditionally Passed' || x[key] === 'Passed with Known Issue');
    const f = count(list, (x) => x[key] === 'Failed'), b = count(list, (x) => x[key] === 'Blocked');
    const total = list.length, nr = total - p - cp - f - b;
    const verdict = total === 0 ? 'NO DATA' : f ? 'FAILED' : b ? 'BLOCKED' : nr ? 'IN PROGRESS' : cp ? 'COND. PASSED' : 'PASSED';
    return { passed: p, cond: cp, failed: f, blocked: b, notRun: nr, total, evaluated: total ? (p + cp + f) / total : 0, passRate: p + cp + f ? (p + cp) / (p + cp + f) : null, verdict };
  };
  const tcScope = tcs.filter((t) => t.F !== 'Out of Scope');
  const areas = {
    e2e: area(sc, 'W'),
    cards: area(cards.map((c) => ({ J: c.J === 'Not Tested' ? 'Not Run' : c.J })), 'J'),
    tc: area(tcScope.map((t) => ({ F: t.result })), 'F'),
  };

  const fe = count(scenarios, (s) => s.W === 'Failed' && s.Z !== 'Accepted (CF)');
  const fc = count(cards, (c) => c.G === 'Failed');
  const hnr = count(scenarios, (s) => s.highFlow && s.W === 'Not Run');
  const hb = count(scenarios, (s) => s.highFlow && s.W === 'Blocked');
  const hcu = count(cards, (c) => c.L === 'Pending Result');
  const lu = count(scenarios, (s) => isMedLow(s.L) && (s.W === 'Not Run' || s.W === 'Blocked'));
  const ub = count(scenarios, (s) => s.Z === 'Blocking' && s.W !== 'Failed');
  const tb = count(cards, (c) => c.L === 'Blocking');
  const cf = count(scenarios, (s) => s.Z === 'Accepted (CF)') + count(cards, (c) => c.L === 'Accepted (CF)');
  const ki = count(scenarios, (s) => s.W === 'Conditionally Passed');
  const kt = count(cards, (c) => c.L === 'Known Issue');
  const pr = areas.e2e.passRate;
  const nogo = fe + hnr + hb + hcu + ub + tb > 0;
  const reasons = [
    fe && `Failed (Urgent/High): ${fe} (Cards affected: ${fc})`,
    hnr + hb && `Urgent/High Untested: ${hnr} | Blocked: ${hb}`,
    hcu && `Cards Pending Result (TOR / Urgent-High): ${hcu}`,
    ub && `Open Urgent/High Bug (no CF): ${ub}`,
    tb && `Cards Failed / Not Tested (TOR / Urgent-High, no CF): ${tb}`,
  ].filter(Boolean);
  const decision = nogo ? 'NOT READY (NO-GO)' : pr != null ? 'READY TO RELEASE' : 'NOT READY';
  const decisionDetail = (nogo ? `NOT READY (NO-GO) - ${reasons.join(' | ')}` : pr != null ? `READY TO RELEASE${lu ? ` (Medium/Low Untested: ${lu})` : ''}` : 'NOT READY - ยังไม่มีเคสที่ประเมินผล')
    + (cf ? `     |     Accepted by CF: ${cf}` : '') + (ki + kt ? `     |     Known Issues: E2E ${ki} / Cards ${kt}` : '');

  const openBugs = scenarios.filter((s) => s.T !== FIXED && has(s.O) && s.M !== 'Out of Scope' && s.M !== 'Canceled');
  const openBy = (p) => count(openBugs, (s) => s.R === p);
  const pendingRisk = count(scenarios, (s) => s.Z === 'Deferrable' && !inRiskLog(s.O)) + count(cards, (c) => c.L === 'Deferrable' && !inRiskLog(c.A));
  const notEvaluated = areas.e2e.blocked + areas.e2e.notRun + areas.tc.blocked + areas.tc.notRun;
  const risk = decision === 'NOT READY (NO-GO)' || openBy('Urgent') ? 'Urgent'
    : openBy('High') || cf ? 'High'
    : openBy('Medium') || pendingRisk || kt || notEvaluated ? 'Medium' : 'Low';
  const riskReason = [
    decision === 'NOT READY (NO-GO)' && 'NO-GO', openBy('Urgent') && `Open Urgent: ${openBy('Urgent')}`, openBy('High') && `Open High: ${openBy('High')}`,
    cf && `Accepted by CF: ${cf}`, openBy('Medium') && `Open Medium: ${openBy('Medium')}`, pendingRisk && `Pending Risk Acceptance: ${pendingRisk}`,
    kt && `Known Issue Cards: ${kt}`, notEvaluated && `Not yet evaluated: ${notEvaluated}`,
  ].filter(Boolean).join(' | ') || 'No open risk';

  const th = data.thresholds;
  const ratio = (a, b) => (b > 0 ? a / b : 0);
  const kiCards = count(cards, (c) => c.J === 'Passed with Known Issue');
  const criteria = [
    { name: 'E2E Scenarios', target: `≥ ${th.e2e * 100}%`, actual: ratio(areas.e2e.passed + areas.e2e.cond, areas.e2e.total), detail: `${areas.e2e.passed + areas.e2e.cond} / ${areas.e2e.total}`, pass: ratio(areas.e2e.passed + areas.e2e.cond, areas.e2e.total) >= th.e2e },
    { name: 'Cards (excl. Known Issue)', target: `≥ ${th.cards * 100}%`, actual: ratio(count(cards, (c) => c.J === 'Passed'), cards.length - kiCards), detail: `${count(cards, (c) => c.J === 'Passed')} / ${cards.length - kiCards}`, pass: ratio(count(cards, (c) => c.J === 'Passed'), cards.length - kiCards) >= th.cards },
    { name: 'Card Test Cases', target: `≥ ${th.tc * 100}%`, actual: ratio(areas.tc.passed, areas.tc.total), detail: `${areas.tc.passed} / ${areas.tc.total}`, pass: ratio(areas.tc.passed, areas.tc.total) >= th.tc },
    { name: 'Known Issue ≤', target: `≤ ${th.knownIssue * 100}%`, actual: ratio(kiCards, cards.length), detail: `${kiCards} / ${cards.length} cards`, pass: ratio(kiCards, cards.length) <= th.knownIssue },
  ];

  const blocking = [
    ...scenarios.filter((s) => s.Z === 'Blocking').map((s) => ({ id: s.A, ref: s.O, title: s.D || s.C, priority: s.R || s.L, tester: s.U, note: s.X })),
    ...cards.filter((c) => c.L === 'Blocking').map((c) => ({ id: c.A, ref: c.K, title: c.B, priority: c.F || '(ว่าง)', tester: c.S, note: c.J })),
  ];
  const testers = {};
  for (const s of scenarios) if (s.U) (testers[s.U] ??= { scenarios: 0, scenariosDone: 0, tcs: 0, tcsDone: 0, openBugs: 0 }), testers[s.U].scenarios++, ['Passed', 'Conditionally Passed', 'Failed'].includes(s.W) && testers[s.U].scenariosDone++, s.T !== FIXED && has(s.O) && testers[s.U].openBugs++;
  for (const t of tcs) if (t.G) (testers[t.G] ??= { scenarios: 0, scenariosDone: 0, tcs: 0, tcsDone: 0, openBugs: 0 }), testers[t.G].tcs++, ['Passed', 'Failed'].includes(t.F) && testers[t.G].tcsDone++;

  const problems = [];
  for (const s of scenarios) {
    if (!s.L) problems.push(`${s.A}: Flow Priority (L) ว่าง — นับเป็น Urgent/High`);
    if (has(s.O) && (!s.P || !s.Q)) problems.push(`${s.A}: มี Defect ID แต่ยังไม่กรอก Severity / Impact`);
    if (['Passed', 'Failed', 'Conditionally Passed'].includes(s.M)) problems.push(`${s.A}: Execution Status (M) = "${s.M}" — ห้ามใช้ผลในคอลัมน์นี้`);
    if ((s.M === 'Done' || s.M === 'Testing' || s.M === 'Blocked') && !s.U) problems.push(`${s.A}: ยังไม่ใส่ Tester (U)`);
    if (s.M === 'Done' && !s.V) problems.push(`${s.A}: Done แต่ยังไม่ใส่ Executed Date (V)`);
    if (s.M === 'Blocked' && !s.X) problems.push(`${s.A}: Blocked แต่ไม่มีเหตุผลใน Remark (X)`);
    if (!data.modules.some((m) => m.module === s.B)) problems.push(`${s.A}: Module "${s.B}" ไม่มีใน Ownership Matrix`);
  }
  for (const c of cards) {
    if (!c.F) problems.push(`${c.A}: Card Priority (F) ว่าง — นับเป็น Urgent/High`);
    if (!c.H) problems.push(`${c.A}: TOR (H) ว่าง — นับเป็น TOR`);
    if (c.G === 'Pending Mapping') problems.push(`${c.A}: ยังไม่ Map to Scenario ID (E)`);
    if (c.G === 'ไม่พบ Scenario ID ใน E2E') problems.push(`${c.A}: Scenario ID ใน E ไม่พบในชีต E2E`);
    if (c.J === 'Passed with Known Issue' && !c.K) problems.push(`${c.A}: Known Issue ต้องมีเหตุผล / Sub-issue / ชื่อ QA Lead ใน Result Note (K)`);
  }
  for (const t of tcs) {
    if (t.F === 'Failed' && !t.I) problems.push(`${t.A}: Failed แต่ไม่มี Defect ID (I)`);
    if (t.C === 'ไม่พบ Card ID ในชีต Cards') problems.push(`${t.A}: Card ID "${t.B}" ไม่มีในชีต Cards`);
  }
  const ids = scenarios.map((s) => s.A);
  for (const id of ids) if (ids.filter((x) => x === id).length > 1 && !problems.includes(`${id}: Scenario ID ซ้ำ`)) problems.push(`${id}: Scenario ID ซ้ำ`);
  for (const id of ids) for (const other of ids) if (id !== other && other.startsWith(id)) problems.push(`${id} / ${other}: เลขรันไม่เท่ากัน — Map to Scenario ID จับคู่ซ้ำ`);
  if (/placeholder|\[|ระบุ/i.test(data.header.project + data.header.version)) problems.push('หัวไฟล์ E2E › B1 / B3 ยังเป็น Placeholder');
  const signed = ['environment', 'version', 'master', 'config', 'linear'].every((k) => ['Ready', 'N/A'].includes(data.signoff[k])) && data.signoff.by && data.signoff.date;

  return { areas, decision, decisionDetail, risk, riskReason, counts: { fe, fc, hnr, hb, hcu, lu, ub, tb, cf, ki, kt, pendingRisk, notEvaluated }, criteria, overallCriteria: criteria.every((c) => c.pass) ? 'PASS (Accept)' : 'FAIL (Not Accept)', blocking, testers, problems, signed };
}
