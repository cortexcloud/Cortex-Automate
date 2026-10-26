import fs from 'node:fs';
import path from 'node:path';
import * as cashier from '../helpers/functions/cashier';
import * as er from '../helpers/functions/er';
import * as disposition from '../helpers/functions/er-disposition';
import * as report from '../helpers/functions/er-report';
import * as evidence from '../helpers/functions/evidence';
import * as opd from '../helpers/functions/opd-activity';
import * as print from '../helpers/functions/print-capture';
import * as reception from '../helpers/functions/reception';
import * as testData from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import * as bizsim from './bizsim-opd';
import * as uatEr from './uat-er';
import * as uatPlay from './uat-play';

// เทสสำรวจแบบสั่งทีละขั้น (ไม่ใช่เทสจริง): เปิดเบราว์เซอร์ค้างไว้ แล้วรันโค้ดจาก .cache/repl/cmd.js ทีละครั้ง
// ไฟล์คำสั่งบรรทัดแรก = `// <เลขคำสั่ง>` · ผล .cache/repl/out-<n>.txt + shot-<n>.png · ตัวแปร: page · context · browser · state · h (ตัวช่วยทั้งหมด) · log · expect
// เขียน `// stop` = จบเทส · ไม่มี require (ใช้ process.env ได้)
// รัน: npx playwright test -c playwright.mock.config.ts _repl --headed --project=chrome --no-deps (SBH Prod: -c playwright.sbh-prod.config.ts)

const DIR = path.join(__dirname, '..', '.cache', 'repl-bizsim');
const h = { ...cashier, ...er, ...disposition, ...report, ...evidence, ...opd, ...print, ...reception, ...testData, ...uatEr, ...uatPlay, ...bizsim };
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

test('REPL BizSim (ส่วนตัว)', async ({ page, context, browser }) => {
  test.setTimeout(0);
  fs.mkdirSync(DIR, { recursive: true });
  const cmdFile = path.join(DIR, 'cmd.js');
  const state: Record<string, unknown> = { authorization: report.trackAuthorization(page) };
  await page.goto('/cortex/apps');
  fs.writeFileSync(path.join(DIR, 'ready.txt'), new Date().toISOString());
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
    try {
      const result = await new AsyncFunction('page', 'context', 'browser', 'state', 'h', 'log', 'expect', code)(page, context, browser, state, h, log, expect);
      if (result !== undefined) log('RESULT', result);
    } catch (e) {
      log('ERROR', (e as Error).message?.split('\n').slice(0, 12).join('\n'));
    }
    log(`(${((Date.now() - started) / 1000).toFixed(1)} s · ${page.url()})`);
    await page.screenshot({ path: path.join(DIR, `shot-${n}.png`) }).catch(() => {});
    fs.writeFileSync(path.join(DIR, `out-${n}.txt`), lines.join('\n'));
  }
});
