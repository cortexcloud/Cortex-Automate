import fs from 'node:fs';
import path from 'node:path';
import { trackAuthorization } from '../helpers/functions/er-report';
import { expect, test } from './fixtures';
import * as reception from '../helpers/functions/reception';
import * as cashier from '../helpers/functions/cashier';
import * as er from '../helpers/functions/er';
import * as opd from '../helpers/functions/opd-activity';
import * as evidence from '../helpers/functions/evidence';
import * as uat from './uat-er';
import * as play from './uat-play';

const h = { ...reception, ...cashier, ...er, ...opd, ...evidence, ...uat, ...play };

// เทสสำรวจชั่วคราว (ลบหลังใช้): เปิดเบราว์เซอร์ค้างไว้ แล้วรันโค้ดจากไฟล์ .cache/repl/cmd.js ทีละชุด
// ผล → .cache/repl/out-<n>.txt + ภาพ shot-<n>.png · ไฟล์ cmd.js ที่มีแค่ "exit" = จบ
const DIR = path.join(__dirname, '..', '.cache', 'repl');

test('repl', async ({ page, context, browser }) => {
  test.setTimeout(0);
  fs.mkdirSync(DIR, { recursive: true });
  const authorization = trackAuthorization(page);
  const state: Record<string, unknown> = {};
  await page.goto('/cortex/apps');
  await expect(page.getByText('เวชระเบียน').first()).toBeVisible({ timeout: 90_000 });
  fs.writeFileSync(path.join(DIR, 'ready.txt'), new Date().toISOString());
  const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor;
  for (let n = 1; ; ) {
    const cmdFile = path.join(DIR, 'cmd.js');
    if (!fs.existsSync(cmdFile)) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    const code = fs.readFileSync(cmdFile, 'utf8');
    fs.unlinkSync(cmdFile);
    if (code.trim() === 'exit') break;
    let out = '';
    const log = (...args: unknown[]) => (out += args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 1))).join(' ') + '\n');
    try {
      const fn = new AsyncFunction('page', 'context', 'browser', 'expect', 'log', 'state', 'auth', 'h', code);
      const result = await fn(page, context, browser, expect, log, state, authorization, h);
      if (result !== undefined) log('RESULT', result);
    } catch (error) {
      log('ERROR', String((error as Error).message ?? error).slice(0, 3000));
    }
    await page.screenshot({ path: path.join(DIR, `shot-${n}.png`) }).catch((e) => log('shot error', String(e)));
    fs.writeFileSync(path.join(DIR, `out-${n}.txt`), out || '(no output)');
    n++;
  }
});
