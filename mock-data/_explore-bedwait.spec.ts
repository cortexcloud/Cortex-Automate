import fs from 'node:fs';
import path from 'node:path';
import * as report from '../helpers/functions/er-report';
import { expect, test } from './fixtures';

// เทสสำรวจชั่วคราว (อ่านอย่างเดียว) — ผู้ป่วยรอเตียงบน ER Board หายจากบอร์ดได้อย่างไร
// REPL: เขียนโค้ดลง .cache/explore-bedwait/cmd.js (บรรทัดแรก `// <n>`) · `// stop` = จบ
// กันเขียนข้อมูล: graphql mutation ทุกตัว + REST PATCH/PUT/DELETE ถูก abort
const DIR = path.join(__dirname, '..', '.cache', 'explore-bedwait');
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

test('สำรวจ รอเตียง (อ่านอย่างเดียว)', async ({ page, context, browser }) => {
  test.setTimeout(0);
  fs.mkdirSync(DIR, { recursive: true });
  const net: string[] = [];
  await context.route('**/cortex-api/**', async (route) => {
    const req = route.request();
    const body = req.postData() ?? '';
    if (/\bmutation\b/.test(body) || ['PATCH', 'PUT', 'DELETE'].includes(req.method())) {
      net.push(`BLOCKED ${req.method()} ${req.url()} ${body.slice(0, 120)}`);
      return route.abort();
    }
    return route.fallback();
  });
  page.on('response', (res) => {
    const u = res.url();
    if (!u.includes('/cortex-api/')) return;
    const body = res.request().postData() ?? '';
    const op = body.match(/"operationName":"(\w+)"/)?.[1] ?? '';
    net.push(`${res.request().method()} ${res.status()} ${u.replace(/^https?:\/\/[^/]+/, '')} ${op}`);
  });
  const state: Record<string, unknown> = { authorization: report.trackAuthorization(page), net };
  await page.goto('/cortex/apps');
  fs.writeFileSync(path.join(DIR, 'ready.txt'), new Date().toISOString());
  const cmdFile = path.join(DIR, 'cmd.js');
  let last = -1;
  for (;;) {
    await new Promise((r) => setTimeout(r, 500));
    if (!fs.existsSync(cmdFile)) continue;
    const code = fs.readFileSync(cmdFile, 'utf8');
    const head = code.split('\n')[0].trim();
    if (head === '// stop') break;
    const n = Number(head.replace(/^\/\/\s*/, ''));
    if (!Number.isFinite(n) || n === last) continue;
    last = n;
    const lines: string[] = [];
    const log = (...args: unknown[]) => lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 1))).join(' '));
    const started = Date.now();
    net.length = 0;
    try {
      const result = await new AsyncFunction('page', 'context', 'browser', 'state', 'log', 'expect', 'fs', 'DIR', code)(page, context, browser, state, log, expect, fs, DIR);
      if (result !== undefined) log('RESULT', result);
    } catch (e) {
      log('ERROR', (e as Error).message?.split('\n').slice(0, 12).join('\n'));
    }
    log(`(${((Date.now() - started) / 1000).toFixed(1)} s · ${page.url()})`);
    log('--- network', net.join('\n'));
    await page.screenshot({ path: path.join(DIR, `shot-${n}.png`) }).catch(() => {});
    fs.writeFileSync(path.join(DIR, `out-${n}.txt`), lines.join('\n'));
  }
});
