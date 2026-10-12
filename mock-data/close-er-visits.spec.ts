import fs from 'node:fs';
import path from 'node:path';
import { closeVisitAtCashier } from '../helpers/functions/cashier';
import { expectOk, gotoErDashboard, type ErDashboardEncounter } from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { checkStep } from '../helpers/functions/evidence';
import { expect, test } from './fixtures';
import { SYSTEM } from './uat-er';

// ปิด Visit ของผู้ป่วยที่ค้างอยู่บนหน้า ER (ผู้ใช้กำหนดวิธี 3 ต.ค. 2026: นำ HN ไปค้นในหน้าการเงินแล้วกดปุ่ม "ปิด Visit")
// รันผ่าน npm run er:close-visits (SBH Prod) / er:close-visits:dev (dev-x) — ตัวเลือกส่งมาทาง mock-data/close-er-visits.mjs:
//   --group=uat-er | test | all   กลุ่มผู้ป่วยที่จะปิด (ค่าตั้งต้น uat-er)
//   --skip-bed-waiting            ไม่ปิดรายที่รอเตียง (คอลัมน์ "รอเตียง" — มี Admit Request / Admission)
//   --confirm                     ปิดจริง — ไม่ใส่ = แสดงรายชื่อที่จะปิดอย่างเดียว
//   --date=YYYY-MM-DD             เฉพาะ Visit ที่มาถึงวันนั้น — ไม่ใส่ = ทุกรายที่บอร์ดแสดงอยู่ รวมที่ค้างข้ามวัน (API เดียวกับบอร์ด: scope=current_queue)

type Patient = { firstName: string; familyName?: string | null; namePrefix?: { display?: string } | null };
type Encounter = ErDashboardEncounter & { patient?: Patient; triageLevel?: number | null; admitRequestStatus?: string | null };

/** กลุ่มผู้ป่วยที่เลือกปิดได้ — เรียงจากแคบไปกว้าง */
const GROUPS: Record<string, { label: string; match: (patient: Patient) => boolean }> = {
  'uat-er': {
    label: 'ผู้ป่วย Mock ที่สคริปต์สร้าง (ชื่อ UAT นามสกุล ER<ข้อ>-<ลำดับ>)',
    match: (p) => p.firstName === 'UAT' && /^(ER\d{2}|RED|YELLOW|GREEN|OBS)-\d+$/.test(p.familyName ?? ''), // รวมชุดผู้ป่วยตามโซน (UAT-ER-zones.spec.ts)
  },
  test: { label: 'ผู้ป่วยทดสอบทั้งหมด (ชื่อขึ้นต้น UAT / AUTO / คนไข้)', match: (p) => /^(UAT|AUTO|คนไข้)/.test(p.firstName) },
  all: { label: 'ทุกรายที่ค้างบนหน้า ER', match: () => true },
};

/** latestStatusCode ของ Encounter ที่จบแล้ว — ค่าอื่น = ยังค้างบนหน้า ER (ใช้กับ --date · รายการของบอร์ดเองตัดแค่ที่ยกเลิก เพราะรายที่รอเตียงเป็น completed แต่ยังอยู่บนบอร์ด) */
const FINISHED_STATUSES = ['completed', 'cancelled', 'entered-in-error'];
const CANCELLED_STATUSES = ['cancelled', 'entered-in-error'];

const GROUP = process.env.ER_CLOSE_GROUP ?? 'uat-er';
const CONFIRM = process.env.ER_CLOSE_CONFIRM === '1';
const SKIP_BED_WAITING = process.env.ER_CLOSE_SKIP_BED_WAITING === '1';
/** รายที่อยู่คอลัมน์ "รอเตียง" ของบอร์ด */
const isBedWaiting = (e: Encounter) => e.patientStatus === 'bed_waiting' || Boolean(e.admitRequestStatus);
const DATE = process.env.ER_CLOSE_DATE;
const QUERY = DATE ? `date=${DATE}` : 'scope=current_queue';
const SOURCE = DATE ? `ที่มาถึงวันที่ ${DATE}` : 'ที่บอร์ดแสดงอยู่ (รวมค้างข้ามวัน)';

const LOG_FILE = path.join(__dirname, 'closed-visits.md');
const LOG_HEADER = '# Visit ER ที่สคริปต์ปิดผ่านหน้าการเงิน\n\n| เวลา | ระบบ | ผู้ป่วย | HN | VN | EN | ผล |\n|---|---|---|---|---|---|---|\n';

const nameOf = (e: Encounter) => [e.patient?.namePrefix?.display, e.patient?.firstName, e.patient?.familyName].filter(Boolean).join(' ') || '(ไม่มีชื่อ)';
const describe = (e: Encounter) => `${nameOf(e)} · HN ${e.hn} · ${e.vn} · ${e.en} · ESI ${e.triageLevel ?? '-'} · ${e.latestStatusCode}/${e.patientStatus}`;

function logClosed(e: Encounter, result: string) {
  const now = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, LOG_HEADER);
  fs.appendFileSync(LOG_FILE, `| ${now} | ${SYSTEM} | ${nameOf(e)} | ${e.hn} | ${e.vn} | ${e.en} | ${result} |\n`);
}

test.describe(`ปิด Visit ที่ค้างบนหน้า ER (${SYSTEM})`, () => {
  test.setTimeout(120 * 60_000); // บอร์ดที่ค้างข้ามวันมีได้เป็นร้อยราย (รายละ ~15 วินาที)

  test(`ปิด Visit ER ที่หน้าการเงิน — กลุ่ม ${GROUP} · ${CONFIRM ? 'ปิดจริง' : 'ดูรายชื่ออย่างเดียว'}`, async ({ page }) => {
    const group = GROUPS[GROUP];
    if (!group) throw new Error(`ไม่รู้จักกลุ่ม "${GROUP}" — ใช้ได้: ${Object.keys(GROUPS).join(' / ')}`);
    const authorization = trackAuthorization(page);

    const readPending = async (): Promise<Encounter[]> => {
      // SBH Prod ตัดการเชื่อมต่อ (ECONNRESET) / ตอบ 5xx เป็นพักๆ → ลองอ่านใหม่ก่อนถือว่าพัง
      let rows: Encounter[] = [];
      await expect(async () => {
        const res = await page.request.get(`/cortex-api/er/dashboard/encounters?${QUERY}`, { headers: { authorization: authorization() }, timeout: 60_000 });
        await expectOk(res, `อ่านรายการผู้ป่วย ER ${SOURCE}`);
        rows = (await res.json()) as Encounter[];
      }).toPass({ timeout: 120_000, intervals: [3_000] });
      return rows.filter((e) => !(DATE ? FINISHED_STATUSES : CANCELLED_STATUSES).includes(e.latestStatusCode));
    };

    await gotoErDashboard(page);
    const pending = await readPending();
    // กลุ่ม all รวมรายที่ API ไม่ส่งข้อมูลผู้ป่วยมาด้วย (การ์ดไม่มีชื่อบนบอร์ด)
    const targets = pending.filter((e) => (GROUP === 'all' || (e.patient && group.match(e.patient))) && !(SKIP_BED_WAITING && isBedWaiting(e)));
    const skipped = pending.filter((e) => !targets.includes(e));

    const lines = [
      `[${SYSTEM}] Visit ที่ค้างบนหน้า ER ${SOURCE}: ${pending.length} ราย · กลุ่มที่เลือก "${GROUP}" = ${group.label}`,
      `จะปิด ${targets.length} ราย:`,
      ...targets.map((e, i) => `  ${String(i + 1).padStart(2)}. ${describe(e)}`),
      `ไม่ปิด (อยู่นอกกลุ่ม${SKIP_BED_WAITING ? ' / รอเตียง' : ''}) ${skipped.length} ราย:`,
      ...skipped.map((e) => `   -  ${describe(e)}`),
    ];
    console.log(lines.join('\n'));
    await test.info().attach('รายชื่อ Visit ที่ค้างบนหน้า ER', { body: lines.join('\n'), contentType: 'text/plain' });

    if (!CONFIRM) {
      console.log('\nโหมดดูรายชื่อ — ยังไม่ได้ปิด Visit ใดเลย · ปิดจริงให้เติม --confirm');
      return;
    }

    const problems: string[] = [];
    for (const [i, e] of targets.entries()) {
      const title = `ปิด Visit ${i + 1}/${targets.length}: ${nameOf(e)} HN ${e.hn} ${e.vn}`;
      try {
        const closed = await checkStep(page, title, () => closeVisitAtCashier(page, e.hn, e.vn));
        const result = closed.result === 'closed' ? `ปิดแล้ว${closed.outstanding ? ` (ยอดค้างชำระ ${closed.outstanding})` : ''}` : 'ปิดอยู่ก่อนแล้ว';
        console.log(`    ✓ ${title} — ${result}`);
        logClosed(e, result);
      } catch (error) {
        const reason = (error as Error).message.split('\n')[0].replace(/\u001b\[[0-9;]*m/g, ''); // ตัดรหัสสีของข้อความ error
        problems.push(`${nameOf(e)} HN ${e.hn} ${e.vn} — ${reason}`);
        console.log(`    ✗ ${title} — ${reason} (ทำรายถัดไปต่อ)`);
        logClosed(e, `ปิดไม่สำเร็จ: ${reason}`);
      }
    }

    // สถานะ Encounter เปลี่ยนตามหลังการปิดบัญชีเล็กน้อย → อ่านซ้ำจนรายที่ปิดแล้วหายจากรายการค้าง
    const closedEns = targets.filter((e) => !problems.some((p) => p.includes(e.vn))).map((e) => e.en);
    let remaining: Encounter[] = [];
    await expect(async () => {
      remaining = await readPending();
      expect(remaining.filter((e) => closedEns.includes(e.en))).toEqual([]);
    })
      .toPass({ timeout: 30_000 })
      .catch(() => problems.push(`ยังเห็นค้างบนหน้า ER หลังปิด: ${remaining.filter((e) => closedEns.includes(e.en)).map((e) => `${nameOf(e)} ${e.en}`).join(' · ')}`));
    console.log(`\nเหลือ Visit ค้างบนหน้า ER ${SOURCE}: ${remaining.length} ราย`);
    expect(problems, 'รายที่ปิดไม่สำเร็จ').toEqual([]);
  });
});
