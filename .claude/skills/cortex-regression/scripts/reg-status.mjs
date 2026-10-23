#!/usr/bin/env node
// สรุปสถานะรอบ Regression จากช่องที่ QA กรอก (คำนวณเองแบบเดียวกับสูตร — ไม่ต้องเปิด Excel ก่อน)
// ใช้ (รันที่โฟลเดอร์โปรเจกต์): node .claude/skills/cortex-regression/scripts/reg-status.mjs "Regression/SBH_Regression_v2.8.0.xlsx" [--json] [--chat]
//   ไม่มี flag = รายงานเต็ม (สถานะทุก Scenario / การ์ด / TC + ปัญหาการกรอก)
//   --chat     = ข้อความสั้นสำหรับ Update สถานะรายวันใน QA Group Chat
//   --json     = ผลทั้งหมดเป็น JSON (ใช้ต่อในสคริปต์อื่น)
import { evaluate, readRegression } from './reg-lib.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('ใช้: node reg-status.mjs "<ไฟล์ Regression .xlsx>" [--json] [--chat]');
  process.exit(1);
}
const data = await readRegression(file);
const r = evaluate(data);
const pct = (x) => (x == null ? '-' : `${(x * 100).toFixed(1)}%`);
const h = data.header;

if (args.includes('--json')) {
  console.log(JSON.stringify({ header: data.header, ...r, scenarios: data.scenarios, cards: data.cards, tcs: data.tcs, riskLog: data.riskLog, signoff: data.signoff }, null, 2));
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
if (args.includes('--chat')) {
  const a = r.areas;
  const lines = [
    `📋 Regression ${h.version} · ${h.project} · ${h.environment} — ${today}`,
    `Release Decision: ${r.decision} · Risk: ${r.risk}`,
    `E2E: Passed ${a.e2e.passed} · Cond. ${a.e2e.cond} · Failed ${a.e2e.failed} · Blocked ${a.e2e.blocked} · Not Run ${a.e2e.notRun} (ของ ${a.e2e.total})`,
    `Cards: Passed ${a.cards.passed} · Known Issue ${a.cards.cond} · Failed ${a.cards.failed} · ยังไม่มีผล ${a.cards.notRun} (ของ ${a.cards.total})`,
    `Card TC: Passed ${a.tc.passed} · Failed ${a.tc.failed} · Blocked ${a.tc.blocked} · Not Run ${a.tc.notRun} (ของ ${a.tc.total})`,
  ];
  if (r.blocking.length) lines.push(`Blocking ${r.blocking.length}: ${r.blocking.map((b) => `${b.id}${b.ref ? ` (${b.ref})` : ''}`).join(', ')}`);
  if (r.decision === 'NOT READY (NO-GO)') lines.push(`เหตุผล NO-GO: ${r.decisionDetail.replace(/^NOT READY \(NO-GO\) - /, '')}`);
  console.log(lines.join('\n'));
  process.exit(0);
}

const out = [];
out.push(`# Regression ${h.version} · ${h.project} · Env ${h.environment}`, '');
out.push(`- **Release Decision:** ${r.decisionDetail}`);
out.push(`- **Risk Level:** ${r.risk} — ${r.riskReason}`);
out.push(`- **เกณฑ์ผ่าน (Regression Plan ข้อ 9):** ${r.overallCriteria}`);
out.push(`- **Environment Sign-off:** ${r.signed ? `Signed (${data.signoff.by} ${data.signoff.date})` : 'ยังไม่ครบ'}`);
out.push('', '| ส่วน | Passed | Cond./Known | Failed | Blocked | Not Run | ทั้งหมด | % Evaluated | Pass Rate | Verdict |', '|---|---|---|---|---|---|---|---|---|---|');
for (const [name, a] of [['E2E Core Flow', r.areas.e2e], ['Cards (Card Result)', r.areas.cards], ['Card Test Cases', r.areas.tc]]) {
  out.push(`| ${name} | ${a.passed} | ${a.cond} | ${a.failed} | ${a.blocked} | ${a.notRun} | ${a.total} | ${pct(a.evaluated)} | ${pct(a.passRate)} | ${a.verdict} |`);
}
out.push('', '## เกณฑ์ผ่าน', '', '| หมวด | เป้า | ได้ | ผล |', '|---|---|---|---|');
for (const c of r.criteria) out.push(`| ${c.name} | ${c.target} | ${pct(c.actual)} (${c.detail}) | ${c.pass ? 'PASS' : 'FAIL'} |`);

out.push('', '## E2E Scenarios', '', '| แถว | ID | Module | Priority | Status (M) | Verdict (W) | Defect | Bug Priority | Gate | Tester | วันที่ | การ์ดที่ผูก |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const s of data.scenarios) out.push(`| ${s.row} | ${s.A} | ${s.B} | ${s.L || '(ว่าง)'} | ${s.M || '-'} | ${s.W} | ${s.O || ''} | ${s.R} | ${s.Z} | ${s.U} | ${s.V} | ${s.cards.join(', ')} |`);

out.push('', '## Cards', '', '| แถว | Card | Priority | TOR | Map | E2E Status | TC ผ่าน/ทั้งหมด | TC Status | Card Result | Gate | Retest from |', '|---|---|---|---|---|---|---|---|---|---|---|');
for (const c of data.cards) out.push(`| ${c.row} | ${c.A} ${c.B.slice(0, 50)} | ${c.F || '(ว่าง)'} | ${c.H || '(ว่าง)'} | ${c.E.replace(/\s+/g, ' ')} | ${c.G} | ${c.P}/${c.O} | ${c.N} | ${c.J || '-'} | ${c.L} | ${c.I} |`);

if (data.tcs.length) {
  out.push('', '## Card Test Cases', '', '| แถว | TC | Card | ชื่อ | Result | Tester | วันที่ | Defect |', '|---|---|---|---|---|---|---|---|');
  for (const t of data.tcs) out.push(`| ${t.row} | ${t.A} | ${t.B} | ${t.E.slice(0, 60)} | ${t.result} | ${t.G} | ${t.H} | ${t.I} |`);
}
if (r.blocking.length) {
  out.push('', '## Blocking (ขวาง Release)', '', '| ID | Defect / Note | ชื่อ | Priority | Tester |', '|---|---|---|---|---|');
  for (const b of r.blocking) out.push(`| ${b.id} | ${b.ref} | ${b.title.slice(0, 60)} | ${b.priority} | ${b.tester} |`);
}
if (Object.keys(r.testers).length) {
  out.push('', '## Tester Workload', '', '| Tester | Scenario (มีผล/ทั้งหมด) | TC (มีผล/ทั้งหมด) | Bug เปิด |', '|---|---|---|---|');
  for (const [name, t] of Object.entries(r.testers)) out.push(`| ${name} | ${t.scenariosDone}/${t.scenarios} | ${t.tcsDone}/${t.tcs} | ${t.openBugs} |`);
}
out.push('', `## ปัญหาการกรอก (${r.problems.length})`, '');
out.push(...(r.problems.length ? r.problems.map((p) => `- ${p}`) : ['- ไม่มี']));
out.push('', '> คำนวณจากช่องที่กรอกด้วยตรรกะเดียวกับสูตรของ Template — ตัวเลขทางการดูที่ Dashboard ใน Excel (เปิดไฟล์ให้ Excel คำนวณใหม่ก่อน)');
console.log(out.join('\n'));
