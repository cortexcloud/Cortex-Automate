import fs from 'node:fs';
import path from 'node:path';
import type { ErVisit } from '../helpers/functions/er';
import { expectOk, gotoErDashboard } from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { ipdDischarge, putToBed } from '../helpers/functions/ipd-admit';
import { test } from './fixtures';
import { SYSTEM } from './uat-er';

// สคริปต์ชั่วคราว: ผู้ป่วยรอเตียงที่ Visit ER ปิดแล้ว แต่ Admit ไปแล้ว (มี AN) จึงยังค้างบน ER Board (ผู้ใช้สั่ง 8 พ.ย. 2026 "Discharge ทั้ง 10 ราย")
// IPD_DISCHARGE_CONFIRM=1 = ทำจริง (ยังไม่ลงเตียง → ลงเตียง SBHAUTO ก่อน · แล้ว Discharge คืนเตียง) · ไม่ใส่ = อ่านหอ / เตียงอย่างเดียว
const CONFIRM = process.env.IPD_DISCHARGE_CONFIRM === '1';
const LOG_FILE = path.join(__dirname, 'closed-visits.md');

type Row = { en: string; hn: string; vn: string; patientStatus: string; latestStatusCode: string; an?: string | null; patient?: { firstName: string; familyName?: string | null } };

// 10 รายที่ผู้ใช้สั่ง Discharge (8 พ.ย. 2026) — รอบ 1–2 Discharge แล้ว 4 ราย (6904648 · 6904647 · 6904645 · 6904644)
// ที่เหลือ: ลงเตียง SBHAUTO แล้ว (หลุดจาก ER Board) → Discharge อย่างเดียว · ยังรอเตียงบน Board → ลงเตียงก่อน
const IN_BED: Row[] = [
  { hn: '6904656', an: '6900057', vn: 'V6911064773', en: 'E6911065359', patientStatus: 'admitted', latestStatusCode: 'completed', patient: { firstName: 'AUTO', familyName: 'Cont38841106104835' } },
];
const WAITING: string[] = []; // รอบ 3: รายที่เหลือลงเตียง SBHAUTO-03 แล้ว
test.use({ actionTimeout: 60_000 });

test('Discharge ผู้ป่วยที่มี AN ค้างคอลัมน์รอเตียงบน ER Board', async ({ page }) => {
  test.setTimeout(60 * 60_000);
  const authorization = trackAuthorization(page);
  await gotoErDashboard(page);
  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const res = await page.request.post('/cortex-api/graphql', { headers: { authorization: authorization() }, data: { query, variables } });
    await expectOk(res, 'graphql');
    return (await res.json()) as { data?: Record<string, any>; errors?: { message: string }[] };
  };
  const readBoard = async () => {
    const res = await page.request.get('/cortex-api/er/dashboard/encounters?scope=current_queue', { headers: { authorization: authorization() } });
    await expectOk(res, 'อ่านบอร์ด ER');
    return ((await res.json()) as Row[]).filter((e) => !['cancelled', 'entered-in-error'].includes(e.latestStatusCode));
  };

  const rows = [...(await readBoard()).filter((e) => WAITING.includes(e.hn) && e.an), ...IN_BED];
  console.log(`[${SYSTEM}] ผู้ป่วยรอเตียงที่มี AN บนบอร์ด ${rows.length} ราย · ${CONFIRM ? 'ทำจริง' : 'อ่านอย่างเดียว'}`);
  for (const [i, e] of rows.entries()) {
    const name = [e.patient?.firstName, e.patient?.familyName].filter(Boolean).join(' ');
    const r = await gql('query Q($en: String!) { latestPatientAdmitRequest(en: $en) { id latestStatusCode ward { name } preferBed { name } } }', { en: e.en });
    const req = r.data?.latestPatientAdmitRequest;
    const ward: string = req?.ward?.name ?? '';
    const head = `${i + 1}/${rows.length}. ${name} · HN ${e.hn} · AN ${e.an} · หอ ${ward || '-'} · เตียงที่จอง ${req?.preferBed?.name ?? '-'}${r.errors ? ' · ERR ' + r.errors[0].message : ''}`;
    if (!CONFIRM) {
      console.log(head);
      continue;
    }
    const steps: string[] = [];
    // Prod ช้าเป็นช่วงๆ (หน้าเลือกหอ 2–33 วิ · 8 พ.ย.) → พังแล้วรอ 20 วิ ลองใหม่ (รวม 3 ครั้ง)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // ยังไม่ลงเตียง (อยู่แท็บ ผู้ป่วยเตรียมเข้า) → ลงเตียง SBHAUTO ก่อน · ลงอยู่แล้ว putToBed หาการ์ดไม่เจอ → ข้ามไป Discharge
        const bed = e.patientStatus === 'admitted' ? 'อยู่บนเตียงแล้ว' : await putToBed(page, { hn: e.hn, vn: e.vn, en: e.en } as ErVisit, ward, () => undefined).then(
          (b) => `ลงเตียง ${b}`,
          (error: Error) => `ไม่ได้ลงเตียง (${error.message.split('\n')[0].slice(0, 80)})`,
        );
        steps.push(bed);
        steps.push(await ipdDischarge(page, e.hn, ward));
        break;
      } catch (error) {
        steps.push(`ครั้งที่ ${attempt} หยุด — ${(error as Error).message.split('\n')[0].slice(0, 160)}`);
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.waitForTimeout(20_000);
      }
    }
    const result = steps.join(' → ');
    console.log(`${head} → ${result}`);
    const now = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
    fs.appendFileSync(LOG_FILE, `| ${now} | ${SYSTEM} | ${name} | ${e.hn} | ${e.vn} | ${e.en} | IPD AN ${e.an}: ${result} (ผู้ใช้สั่ง Discharge เพื่อเคลียร์ Board ER) |\n`);
  }
  if (CONFIRM) {
    await gotoErDashboard(page);
    const left = await readBoard();
    console.log(`\nเหลือบน ER Board ${left.length} ราย${left.length ? ': ' + left.map((e) => `HN ${e.hn} ${e.patientStatus}`).join(' · ') : ''}`);
  }
});
