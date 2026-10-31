import type { Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, openCarePanel, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import {
  browserStamp,
  clickCprSave,
  clockSeconds,
  countCprSaves,
  cprButton,
  cprForm,
  cprHistory,
  cprHistoryEpisodes,
  cprSummary,
  cycleCard,
  cycleTimeInput,
  drugFields,
  drugSection,
  fillStamp,
  fullStamp,
  nurseNoteInput,
  openCprForm,
  readCprRows,
  readSummaryNumbers,
  shiftStamp,
  stampClock,
  timeChip,
  vitalBox,
  type CprRow,
} from '../../../helpers/functions/er-cpr';
import { erTriagePanel, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow, type EvidenceMark } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_HIGH_MEWS, gotoVisit } from '../../../mock-data/uat-play';

// SBH-2530 [ER] [CPR-Progression] Improve CPR Progression — Cycle timer 2 นาที · ยา + Dose / Route · หลาย Episode (กู้ชีพซ้ำ) · Timeline + filter · Nurse note · Vital Signs หุบ / กางเอง · Episode Summary
// ชุด EXE SBH-3029 → SC HPY SBH-3030 (TC-001…049) · UHP SBH-3032 (TC-050…053) · EDG SBH-3033 (TC-054…056) — 56 TC (เลข Issue ใน ISSUE)
// 1 เทส = 1 flow ต่อผู้ป่วย (R9) · คลิป 1 ไฟล์ต่อ 1 TC (R61 — startClip ต้นช่วงของ TC · ช่วงรอ / เตรียมข้อมูลใช้ชื่อ wait-… / setup-… ไม่แนบ)
// TC ที่ใช้ผลของ action เดียวกัน (เช่น กด ROSC) ได้ภาพของ TC นั้นจากจุดที่เห็นผล — คลิปมีช่วง action อยู่ใน TC หลักของ action นั้น
// เทส A (ผู้ป่วย A): Episode #1 จบด้วย ROSC + Post-CPR · Episode #2 (กู้ชีพซ้ำ) → หน้า History → countdown หมด → Stop → MEWS เทียบฟอร์มคัดกรองซ้ำ (ไม่บันทึกคัดกรอง)
// เทส B (ผู้ป่วย B): chip เวลา + validation เวลา → ROSC + Vital 2 รอบ · Episode ยา ×3 · Episode บันทึกก่อนครบ 2 นาที (TC-007) + ขอบ +2 นาที (TC-054)
// ข้อมูล: ผู้ป่วย AUTO ใหม่ (R10 / R11) → Visit ER → คัดกรอง ESI 2 → ปิด Visit ที่การเงินท้ายเทส (afterEach) · SBH2530_KEEP=1 = ไม่ปิด Visit
// รัน (dev-x): npx playwright test --headed --grep @SBH-2530-A  /  --grep @SBH-2530-B

const ISSUE: Record<number, string> = {
  1: 'SBH-3035', 2: 'SBH-3037', 3: 'SBH-3038', 4: 'SBH-3040', 5: 'SBH-3042', 6: 'SBH-3043', 7: 'SBH-3045', 8: 'SBH-3046', 9: 'SBH-3048', 10: 'SBH-3049',
  11: 'SBH-3051', 12: 'SBH-3052', 13: 'SBH-3053', 14: 'SBH-3054', 15: 'SBH-3055', 16: 'SBH-3056', 17: 'SBH-3057', 18: 'SBH-3058', 19: 'SBH-3059', 20: 'SBH-3060',
  21: 'SBH-3061', 22: 'SBH-3062', 23: 'SBH-3063', 24: 'SBH-3064', 25: 'SBH-3065', 26: 'SBH-3066', 27: 'SBH-3067', 28: 'SBH-3068', 29: 'SBH-3069', 30: 'SBH-3070',
  31: 'SBH-3071', 32: 'SBH-3072', 33: 'SBH-3073', 34: 'SBH-3074', 35: 'SBH-3075', 36: 'SBH-3076', 37: 'SBH-3077', 38: 'SBH-3078', 39: 'SBH-3079', 40: 'SBH-3080',
  41: 'SBH-3081', 42: 'SBH-3082', 43: 'SBH-3083', 44: 'SBH-3084', 45: 'SBH-3085', 46: 'SBH-3086', 47: 'SBH-3087', 48: 'SBH-3088', 49: 'SBH-3089', 50: 'SBH-3090',
  51: 'SBH-3091', 52: 'SBH-3092', 53: 'SBH-3093', 54: 'SBH-3094', 55: 'SBH-3095', 56: 'SBH-3096',
};
const TC_A = [1, 3, 2, 41, 43, 31, 27, 28, 32, 8, 10, 52, 9, 11, 53, 12, 22, 13, 29, 26, 42, 47, 33, 21, 23, 48, 36, 35, 30, 40, 45, 46, 25, 49, 44, 15, 14, 16, 17, 18, 19, 20, 55, 56, 34, 39, 37];
const TC_B = [4, 50, 51, 5, 6, 38, 24, 7, 54];
const tcId = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const TC = (n: number) => `${tcId(n)} (${ISSUE[n]})`;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });

const SAVED_TOAST = 'บันทึก CPR progression แล้ว';
const RHYTHM_TONE: Record<string, string> = { VF: 'tone-danger', VT: 'tone-danger', PEA: 'tone-warning', Asystole: 'tone-warning', 'Perfusing Rhythm': 'tone-success' };
/** ค่าสัญญาณชีพของ TC-037 */
const MEWS_VITALS = { systolic: '90', diastolic: '60', pr: '120', rr: '24', temp: '38.5', spo2: '92' };

const row = (label: string, want: string, got: string, same = want === got): CompareRow => ({ label, values: [want, got], same });
/** "YYYY-MM-DDTHH:mm:ss" → "DD/MM/YYYY HH:mm:ss" (รูปแบบตัวเลข Started / Ended ของการ์ดสรุป) */
const summaryStamp = (stamp: string) => {
  const [date, time] = fullStamp(stamp).split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} ${time}`;
};
const isShock = (r: CprRow) => r.tags.some((t) => /Defib/.test(t.text));
const isCycle = (r: CprRow) => /^Cycle \d+$/.test(r.name);
const events = (rows: CprRow[]) => rows.filter((r) => !r.overdue);

/** ตัวช่วยร่วมของทั้ง 2 เทส */
function cprKit(page: Page, soft: (title: string, body: () => Promise<void>) => Promise<boolean>) {
  const main = page.getByRole('main');
  const form = cprForm(page);
  const summary = cprSummary(form);
  const card = cycleCard(form);
  const countdown = card.locator('.countdown');
  const progress = card.getByRole('progressbar');
  const toggle = (scope: Locator) => scope.locator('button.toggle').first();
  const vitalToggle = vitalBox(form).locator('button.toggle-link');
  const markSelect = form.locator('select').filter({ has: page.locator('option', { hasText: 'ROSC' }) }).first();
  const historyLink = form.getByRole('button', { name: /^ดูประวัติ CPR ทั้งหมด/ });
  const restartButton = form.getByRole('button', { name: /^Start CPR \(กู้ชีพซ้ำ\)/ });
  const postSave = form.getByRole('button', { name: 'บันทึก Post-CPR update', exact: true });
  const banner = form.locator('section[aria-label="สรุป Episode ที่จบแล้ว"]');
  const defibInput = form.locator('section[aria-labelledby="cpr-event-title"] input[type="number"]');
  const commentInput = form.getByPlaceholder(/Add CPR comment/);
  const rhythm = (name: string) => form.locator('section[aria-labelledby="cpr-event-title"]').getByRole('button', { name, exact: true });

  /** ขั้นของ TC — ล้างตารางเทียบของขั้นก่อนก่อนเริ่ม (soft: ไม่ผ่านแล้วเล่นต่อ) */
  const step = (n: number, title: string, body: () => Promise<void>) =>
    soft(`${TC(n)} ${title}`, async () => {
      await hideCompareTable(page);
      await body();
    });

  /** แสดงตารางเทียบ (สคริปต์วาด) + ตีกรอบ Expected แล้วค่อย expect — ภาพ Error เห็นแถวที่ไม่ตรง */
  const verify = async (title: string, rows: CompareRow[], marks: EvidenceMark[] = [], side: 'left' | 'right' | 'bottom' = 'right') => {
    await showCompareTable(page, title, ['Expected', 'ผลจริง'], rows, { side, width: side === 'bottom' ? undefined : '600px' });
    if (marks.length) await markEvidence(...marks);
    expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ต้องเป็น "${r.values[0]}" · ได้ "${r.values[1]}"`), title).toEqual([]);
  };

  const rowsNow = () => readCprRows(summary);
  const summaryRow = (name: string) => summary.locator('li.row').filter({ has: page.locator('strong', { hasText: new RegExp(`^${name}$`) }) }).first();
  const numbers = () => readSummaryNumbers(summary);
  const timelineCount = async (scope: Locator = summary) => Number(((await toggle(scope).textContent()) ?? '').match(/\((\d+)\)/)?.[1] ?? NaN);

  /** เลือก chip แล้วกดบันทึก Cycle → คืนเวลาที่บันทึก (ค่าในช่องวันที่และเวลาบันทึกตอนกด) */
  const saveCycle = async (chip: 'default' | 'ตอนนี้', what: string) => {
    await timeChip(form, chip).click();
    const time = fullStamp(await cycleTimeInput(form).inputValue());
    await clickCprSave(page, form, cprButton(form, 'Save CPR Progress'), what);
    return time;
  };

  /** รอ countdown ของ Cycle ที่ทำอยู่ลดถึงค่าที่กำหนด (วินาที) */
  const waitCountdown = async (seconds: number, timeout = 180_000) => {
    await expect.poll(async () => clockSeconds((await countdown.textContent()) ?? '99:99'), { message: `countdown ต้องลดถึง ${seconds} วินาที`, timeout, intervals: [1_000] }).toBeLessThanOrEqual(seconds);
  };

  /**
   * ช่องเวลาของ Post-CPR update / เริ่ม CPR ใหม่ (กู้ชีพซ้ำ): ค่าตั้งต้น = เวลาตอนฟอร์มวาดใหม่หลังบันทึก event ล่าสุด — ถ้าวินาทีเดียวกับ event ล่าสุด
   * บันทึกไม่ได้ ("เวลาที่บันทึกต้องไม่ย้อนหลังกว่า event ก่อนหน้า" — dev-x 29 ต.ค. 2026 รอบแรกของเทส B) → รอ 1.5 วิ แล้วตั้งเวลาเป็นปัจจุบัน + จดค่าเดิมไว้เป็นข้อสังเกต
   */
  const freshTime = async (which: 'post' | 'restart', note: (type: string, description: string) => void) => {
    const input = form.locator(which === 'post' ? 'section.post-box input[type="datetime-local"]' : '.restart-box input[type="datetime-local"]').first();
    const before = fullStamp(await input.inputValue());
    await page.waitForTimeout(1_500);
    const now = await browserStamp(page);
    await fillStamp(input, now);
    note('ข้อสังเกต เวลาตั้งต้น', `${which === 'post' ? 'Post-CPR update' : 'เริ่ม CPR ใหม่ (กู้ชีพซ้ำ)'}: ค่าตั้งต้น ${stampClock(before)} → ตั้งเป็นเวลาปัจจุบัน ${stampClock(now)} ก่อนบันทึก`);
  };

  /** ออกจากหน้า History กลับหน้า CPR — เรียกหลังจบขั้น (ภาพ "ผ่าน" ของขั้นต้องเป็นหน้า History) */
  const backToCpr = async () => {
    await hideCompareTable(page);
    const back = cprHistory(form).getByRole('button', { name: /กลับหน้า CPR/ });
    if (await back.isVisible().catch(() => false)) await back.click();
  };

  /** กรอกสัญญาณชีพรอบที่ index (0 = รอบที่ 1) ของส่วน Vital Signs */
  const fillVitals = async (index: number, v: Partial<typeof MEWS_VITALS> & { avpu?: string }) => {
    const round = vitalBox(form).locator('.vital-round').nth(index);
    const n = index + 1;
    if (v.systolic) await round.getByLabel(`Systolic ครั้งที่ ${n}`, { exact: true }).fill(v.systolic);
    if (v.diastolic) await round.getByLabel(`Diastolic ครั้งที่ ${n}`, { exact: true }).fill(v.diastolic);
    if (v.pr) await round.getByLabel('PR', { exact: true }).fill(v.pr);
    if (v.rr) await round.getByLabel('RR', { exact: true }).fill(v.rr);
    if (v.temp) await round.getByLabel('Temperature (°C)', { exact: true }).fill(v.temp);
    if (v.spo2) await round.getByLabel('SpO₂ (%)', { exact: true }).fill(v.spo2);
    if (v.avpu) {
      const select = round.getByLabel('Level of Consciousness (AVPU)', { exact: true });
      const label = (await select.locator('option').allTextContents()).find((t) => t.startsWith(`${v.avpu} `));
      await select.selectOption({ label: label ?? v.avpu });
    }
    return round;
  };

  /** ผู้ป่วยใหม่ → Visit ER → คัดกรอง ESI 2 → เปิดเมนู CPR Progression */
  const newPatient = async (label: string, note: (type: string, description: string) => void): Promise<ErVisit> => {
    let visit!: ErVisit;
    await checkStep(page, `เตรียมผู้ป่วย ${label}: ลงทะเบียน AUTO + เปิด Visit ER + คัดกรอง ESI 2`, async () => {
      await gotoErDashboard(page);
      await startClip(page, `setup-${label}`);
      const patient = newTestPatient(`Cpr2530${label}`);
      visit = await registerAndOpenErVisit(page, patient);
      note(`ผู้ป่วย ${label}`, `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
      await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
      await fillErTriageForm(page, { level: 2, vitals: VITALS_HIGH_MEWS });
      await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
      await expect(main.getByText('Clinical Summary', { exact: true })).toBeVisible({ timeout: 60_000 });
      await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
      await markEvidence(...[`HN ${visit.hn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first())));
    });
    await checkStep(page, `ผู้ป่วย ${label}: เปิดเมนูขวา CPR Progression`, async () => {
      await openCprForm(page);
      await markEvidence(expected(form.getByRole('button', { name: 'Start CPR', exact: true }), 'ฟอร์ม CPR (ยังไม่เริ่ม)'));
    });
    return visit;
  };

  return {
    main, form, summary, card, countdown, progress, toggle, vitalToggle, markSelect, historyLink, restartButton, postSave, banner, defibInput, commentInput, rhythm,
    step, verify, rowsNow, summaryRow, numbers, timelineCount, saveCycle, waitCountdown, fillVitals, newPatient, freshTime, backToCpr,
  };
}

test.describe(`SBH-2530 Improve CPR Progression (${SYSTEM})`, () => {
  // ลงทะเบียน + คัดกรอง + CPR หลาย Episode + รอ countdown 2 รอบ + ปิด Visit
  test.describe.configure({ timeout: 3_000_000 });

  let opened: Map<string, ErVisit>;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page);
    if (process.env.SBH2530_KEEP) return;
    // SBH2530_CLOSE="<HN>:<VN>;…" = ปิด Visit ผู้ป่วย AUTO ที่ค้างจากรอบก่อนด้วย
    const extra = (process.env.SBH2530_CLOSE ?? '').split(';').filter(Boolean).map((pair) => ({ hn: pair.split(':')[0], vn: pair.split(':')[1], en: '-' }));
    for (const visit of [...opened.values(), ...extra]) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  test(
    'A ผู้ป่วย AUTO ใหม่: Episode #1 จบด้วย ROSC + Post-CPR · Episode #2 กู้ชีพซ้ำ → History → ครบกำหนด → Stop CPR (Super_User = user1)',
    { tag: ['@SBH-2530', '@SBH-2530-A', ...TC_A.map((n) => `@${ISSUE[n]}`)], annotation: [linear('SBH-2530'), ...TC_A.map((n) => linear(ISSUE[n]))] },
    async ({ page }) => {
      const { note, soft, finish } = makeRunner(page);
      const k = cprKit(page, soft);
      const { form, summary, card, countdown, progress, step, verify } = k;
      const visit = await k.newPatient('A', note);

      let startStamp = '';
      let startClick = '';
      let roscStamp = '';
      const cycleTimes: Record<string, string> = {};

      // ================= Episode #1 =================
      await startClip(page, 'TC-001');
      await step(1, 'ขั้น 1–3 เลือก Rhythm VF > กด Start CPR > ดูการ์ด Cycle', async () => {
        const vf = k.rhythm('VF');
        await vf.click();
        startStamp = fullStamp(await form.locator('input[type="datetime-local"]').first().inputValue());
        await markEvidence(filled(vf, 'Rhythm VF'), clicked(cprButton(form, 'Start CPR')));
        await snapEvidence(page, 'ก่อนกด — Start CPR');
        startClick = await browserStamp(page);
        await clickCprSave(page, form, cprButton(form, 'Start CPR'), 'Start CPR');
        await expect(card).toBeVisible();
        const shownStart = ((await card.locator('.cycle-start time').textContent()) ?? '').trim();
        const c1 = ((await countdown.textContent()) ?? '').trim();
        const p1 = Number(await progress.getAttribute('aria-valuenow'));
        await page.waitForTimeout(4_000);
        const c2 = ((await countdown.textContent()) ?? '').trim();
        const p2 = Number(await progress.getAttribute('aria-valuenow'));
        const diff = clockSeconds(stampClock(startClick)) - clockSeconds(shownStart);
        note('TC-001 เวลา', `ช่องวันเวลาตอนเปิดฟอร์ม ${stampClock(startStamp)} · กด Start CPR ${stampClock(startClick)} · เริ่ม cycle ที่การ์ดแสดง ${shownStart} (ต่าง ${diff} วินาที) · countdown ${c1} → ${c2} · progress ${p1}% → ${p2}%`);
        await verify('TC-001 การ์ด Cycle หลังกด Start CPR', [
          row('หัวการ์ด', 'Cycle 1', ((await card.getByRole('heading').first().textContent()) ?? '').trim()),
          row('เวลาเริ่ม cycle = เวลาที่กด Start CPR (±10 วิ)', stampClock(startClick), shownStart, Math.abs(diff) <= 10),
          row('countdown เริ่ม ~02:00', '01:50–02:00', c1, clockSeconds(c1) >= 110 && clockSeconds(c1) <= 120),
          row('นับถอยหลัง (ห่าง 4 วิ)', 'ลดลง', `${c1} → ${c2}`, clockSeconds(c2) < clockSeconds(c1)),
          row('progress bar เดินตามเวลา', 'เพิ่มขึ้น', `${p1}% → ${p2}%`, p2 > p1),
        ], [expected(card.locator('.cycle-head'), `Cycle 1 · เริ่ม ${shownStart} · countdown ${c2}`)], 'left');
      });

      await startClip(page, 'TC-003');
      await step(3, 'ขั้น 2 ดู quick chip ใต้ช่องวันที่และเวลาบันทึก', async () => {
        const chips = await card.getByRole('group', { name: 'เวลาบันทึก' }).getByRole('button').evaluateAll((els) => els.map((e) => ({ text: e.textContent?.trim() ?? '', on: e.getAttribute('aria-pressed') === 'true' })));
        await verify('TC-003 quick chip เวลาบันทึก', [
          row('จำนวน chip', '3', String(chips.length)),
          row('ชื่อ chip', '+2 นาที (Default) · ตอนนี้ · แก้เวลาเอง', chips.map((c) => c.text).join(' · ')),
          row('chip ที่ highlight', '+2 นาที (Default)', chips.filter((c) => c.on).map((c) => c.text).join(' · ') || '-'),
        ], [expected(timeChip(form, 'default'), 'highlight'), expected(card.getByRole('group', { name: 'เวลาบันทึก' }), 'chip 3 ตัว')], 'left');
      });

      await startClip(page, 'TC-002');
      await step(2, 'ขั้น 2 ช่อง วันที่และเวลาบันทึก ของ Cycle 1 = เวลาเริ่ม cycle + 2 นาที', async () => {
        const start = `${startStamp.split('T')[0]}T${((await card.locator('.cycle-start time').textContent()) ?? '').trim()}`;
        const value = fullStamp(await cycleTimeInput(form).inputValue());
        await verify('TC-002 ค่าตั้งต้นของ Cycle 1', [row('วันที่และเวลาบันทึก', shiftStamp(start, 120).replace('T', ' '), value.replace('T', ' '))], [expected(card.locator('.cycle-start'), `เริ่ม ${stampClock(start)}`), expected(cycleTimeInput(form), '+2 นาที')], 'left');
      });

      await startClip(page, 'TC-041');
      await step(41, 'ขั้น 1 ระหว่าง CPR: การ์ด CPR Episode Summary อยู่ด้านบนของหน้า CPR', async () => {
        await summary.scrollIntoViewIfNeeded();
        const ys = await Promise.all([summary, card, form.locator('section[aria-labelledby="cpr-event-title"]')].map(async (l) => (await l.boundingBox())?.y ?? -1));
        await verify('TC-041 ตำแหน่งการ์ดสรุป (ระหว่าง CPR)', [
          row('หัวการ์ด', 'CPR Episode Summary', ((await summary.getByRole('heading').first().textContent()) ?? '').trim()),
          row('อยู่เหนือการ์ด Cycle และ CPR Event', 'ใช่', ys[0] < ys[1] && ys[0] < ys[2] ? 'ใช่' : `ไม่ (y ${ys.join(' / ')})`),
        ], [expected(summary.getByRole('heading').first(), 'Episode Summary ด้านบน')], 'bottom');
      });

      await startClip(page, 'TC-043');
      await step(43, 'ขั้น 1 ระหว่าง CPR: Status pill = กำลังทำ CPR สีแดง', async () => {
        const pill = summary.locator('.pill').first();
        await verify('TC-043 Status pill ระหว่าง CPR', [
          row('ข้อความ', 'กำลังทำ CPR', ((await pill.textContent()) ?? '').trim()),
          row('สี', 'แดง (tone-danger)', (await pill.getAttribute('class')) ?? '', /tone-danger/.test((await pill.getAttribute('class')) ?? '')),
        ], [expected(pill, 'กำลังทำ CPR')], 'bottom');
      });

      await startClip(page, 'TC-031');
      await step(31, 'ขั้น 2 ระหว่าง CPR: Section Vital Signs หุบ + ข้อความเปิดอัตโนมัติ', async () => {
        const box = vitalBox(form);
        await box.scrollIntoViewIfNeeded();
        const hint = box.getByText('เปิดอัตโนมัติเมื่อ ROSC / Stop CPR', { exact: true });
        await verify('TC-031 Vital Signs ระหว่าง CPR', [
          row('สถานะ section (aria-expanded)', 'false (หุบ)', String(await k.vitalToggle.getAttribute('aria-expanded')), (await k.vitalToggle.getAttribute('aria-expanded')) === 'false'),
          row('ช่องกรอก BP', 'ซ่อน', (await box.getByLabel('Systolic ครั้งที่ 1', { exact: true }).isVisible()) ? 'แสดง' : 'ซ่อน'),
          row('ข้อความ', 'เปิดอัตโนมัติเมื่อ ROSC / Stop CPR', (await hint.isVisible()) ? 'เปิดอัตโนมัติเมื่อ ROSC / Stop CPR' : '-'),
        ], [expected(box, 'หุบ'), expected(hint, 'ข้อความ')], 'left');
      });

      await startClip(page, 'TC-027');
      await step(27, 'ขั้น 2 ดูส่วน CPR Comment และ Nurse note', async () => {
        const nurseCard = form.locator('section.nurse-card');
        const commentCard = k.commentInput.locator('xpath=ancestor::section[1]');
        await nurseCard.scrollIntoViewIfNeeded();
        await verify('TC-027 การ์ด Nurse note', [
          row('การ์ด CPR Comment', 'มี', (await commentCard.getByRole('heading', { name: 'CPR Comment' }).isVisible()) ? 'มี' : 'ไม่มี'),
          row('การ์ด Nurse note แยกจาก CPR Comment', 'แยกกัน', (await nurseCard.isVisible()) && !(await commentCard.evaluate((c, n) => c === n || c.contains(n as Node), await nurseCard.elementHandle())) ? 'แยกกัน' : 'ไม่แยก'),
          row('badge ของ Nurse note', 'พยาบาล', ((await nurseCard.locator('.role-badge').textContent()) ?? '').trim()),
        ], [expected(commentCard, 'CPR Comment'), expected(nurseCard, 'Nurse note'), expected(nurseCard.locator('.role-badge'), 'badge')], 'bottom');
      });

      await startClip(page, 'TC-028');
      await step(28, 'ขั้น 2 พิมพ์ Nurse note 4 บรรทัด (กด Enter ขึ้นบรรทัดใหม่)', async () => {
        const input = nurseNoteInput(form);
        await input.click();
        for (let i = 1; i <= 4; i++) {
          await input.pressSequentially(`บรรทัด ${i} ทดสอบ SBH-2530`, { delay: 15 });
          if (i < 4) await input.press('Enter');
        }
        const measure = () => input.evaluate((t) => ({ scroll: t.scrollHeight, client: t.clientHeight, resize: getComputedStyle(t).resize }));
        let size = await measure();
        let dragged = '';
        if (size.scroll > size.client + 2) {
          // ไม่พอ 4 บรรทัด → ลากมุมช่องให้ขยาย (Expected ยอมรับ "ลากขยายได้")
          const box = (await input.boundingBox())!;
          await page.mouse.move(box.x + box.width - 3, box.y + box.height - 3);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width - 3, box.y + box.height + 80, { steps: 5 });
          await page.mouse.up();
          dragged = ' (หลังลากมุมขยาย)';
          size = await measure();
        }
        const lines = (await input.inputValue()).split('\n').length;
        await verify('TC-028 Nurse note หลายบรรทัด', [
          row('จำนวนบรรทัดในช่อง', '4', String(lines)),
          row('แสดงครบไม่ต้องเลื่อน', 'ครบ', size.scroll <= size.client + 2 ? `ครบ${dragged}` : `ไม่ครบ (${size.client}/${size.scroll}px)`, size.scroll <= size.client + 2),
          row('ลากขยายได้ (CSS resize)', 'vertical', size.resize),
        ], [filled(input, '4 บรรทัด')], 'left');
      });

      await startClip(page, 'TC-032');
      await step(32, 'ขั้น 2 กดกาง Section Vital Signs ระหว่าง CPR', async () => {
        await k.vitalToggle.click();
        const box = vitalBox(form);
        await expect(box.getByLabel('Systolic ครั้งที่ 1', { exact: true })).toBeVisible();
        await verify('TC-032 กาง Vital Signs ระหว่าง CPR', [row('สถานะ section (aria-expanded)', 'true (กาง)', String(await k.vitalToggle.getAttribute('aria-expanded')), (await k.vitalToggle.getAttribute('aria-expanded')) === 'true')], [clicked(k.vitalToggle, 'กาง'), expected(box, 'กางได้ · ไม่กรอก')], 'left');
      });

      await startClip(page, 'TC-008');
      await step(8, 'ขั้น 2 ดู Section ยาที่ให้ใน Cycle นี้', async () => {
        const section = drugSection(form);
        await section.scrollIntoViewIfNeeded();
        const names = await section.getByRole('checkbox').evaluateAll((els) => els.map((e) => e.closest('label')?.textContent?.trim() ?? ''));
        const other = drugFields(form, 'ยาอื่นๆ');
        await verify('TC-008 รายการยาใน CPR', [
          row('checkbox ยา 6 ตัว', 'Adrenaline 1:1,000 · Adrenaline 1:10,000 · Atropine · Amiodarone · MgSO4 · NaHCO3', names.slice(0, 6).join(' · ')),
          row('แถว ยาอื่นๆ', 'checkbox + ช่องชื่อยา', `${names[6] ?? '-'} + ${(await other.otherName.count()) ? 'ช่องชื่อยา' : 'ไม่มีช่องชื่อยา'}`, names[6] === 'ยาอื่นๆ' && (await other.otherName.count()) === 1),
        ], [expected(section, 'ยา 6 ตัว + ยาอื่นๆ'), expected(other.row, 'ยาอื่นๆ')], 'right');
      });

      await startClip(page, 'TC-010');
      await step(10, 'ขั้น 1–3 แถว Atropine ก่อนติ๊ก → ติ๊ก → เอาติ๊กออก', async () => {
        const a = drugFields(form, 'Atropine');
        await a.dose.click({ force: true, timeout: 3_000 }).catch(() => undefined);
        await page.keyboard.type('1');
        const state = async () => ({ dose: await a.dose.isEnabled(), route: await a.route.isEnabled(), selected: /selected/.test((await a.row.getAttribute('class')) ?? ''), value: await a.dose.inputValue() });
        const before = await state();
        await markEvidence(expected(a.row, 'ก่อนติ๊ก: Dose / Route ปิด'));
        await snapEvidence(page, 'ก่อนติ๊ก — Atropine');
        await a.check.check();
        const on = await state();
        await markEvidence(clicked(a.check, 'ติ๊ก'), expected(a.row, 'เปิด + highlight'));
        await snapEvidence(page, 'ติ๊กแล้ว — Atropine');
        await a.check.uncheck();
        const off = await state();
        await verify('TC-010 แถว Atropine', [
          row('ก่อนติ๊ก: Dose / Route', 'disabled / disabled', `${before.dose ? 'enabled' : 'disabled'} / ${before.route ? 'enabled' : 'disabled'}`),
          row('ก่อนติ๊ก: พิมพ์ใน Dose', '(ว่าง)', before.value || '(ว่าง)'),
          row('ติ๊กแล้ว: Dose / Route', 'enabled / enabled', `${on.dose ? 'enabled' : 'disabled'} / ${on.route ? 'enabled' : 'disabled'}`),
          row('ติ๊กแล้ว: highlight แถว', 'มี', on.selected ? 'มี' : 'ไม่มี'),
          row('เอาติ๊กออก: Dose / Route', 'disabled / disabled', `${off.dose ? 'enabled' : 'disabled'} / ${off.route ? 'enabled' : 'disabled'}`),
          row('เอาติ๊กออก: highlight แถว', 'ไม่มี', off.selected ? 'มี' : 'ไม่มี'),
        ], [expected(a.row, 'เอาติ๊กออก: กลับเป็นปิด')], 'right');
      });

      await startClip(page, 'TC-052');
      await step(52, 'ขั้น 2–3 ติ๊ก Adrenaline 1:10,000 เว้น Dose ว่าง > กด บันทึก Cycle', async () => {
        const ad = drugFields(form, 'Adrenaline 1:10,000');
        const before = events(await k.rowsNow()).length;
        await ad.check.check();
        await markEvidence(filled(ad.row, 'ติ๊ก · Dose ว่าง'), clicked(cprButton(form, 'Save CPR Progress')));
        await snapEvidence(page, 'ก่อนกด — บันทึก Cycle (Dose ว่าง)');
        const saves = await countCprSaves(page, () => cprButton(form, 'Save CPR Progress').click());
        const error = ad.row.getByText('กรุณาระบุ Dose', { exact: true });
        await ad.row.scrollIntoViewIfNeeded();
        await verify('TC-052 Dose ว่าง', [
          row('inline error ที่ช่อง Dose', 'กรุณาระบุ Dose', (await error.isVisible()) ? 'กรุณาระบุ Dose' : '-'),
          row('ช่อง Dose (aria-invalid)', 'true', String(await ad.dose.getAttribute('aria-invalid'))),
          row('คำสั่งบันทึกที่ส่ง', '0', String(saves)),
          row('แถวบน Timeline', String(before), String(events(await k.rowsNow()).length)),
        ], [alerted(error), expected(ad.dose, 'Dose ว่าง')], 'right');
      });

      await startClip(page, 'TC-009');
      await step(9, 'ขั้น 1–3 Adrenaline 1:10,000: ดู Route > ตัวเลือก Route > พิมพ์ Dose 1 mg', async () => {
        const ad = drugFields(form, 'Adrenaline 1:10,000');
        const route = await ad.route.inputValue();
        const options = await ad.route.locator('option').allTextContents();
        await ad.dose.fill('1 mg');
        await verify('TC-009 Dose / Route', [
          row('Route ค่าตั้งต้น', 'IV', route),
          row('ตัวเลือก Route', 'IV / IO / ETT', options.map((o) => o.trim()).join(' / ')),
          row('Dose พิมพ์พร้อมหน่วย', '1 mg', await ad.dose.inputValue()),
        ], [expected(ad.route, 'IV'), filled(ad.dose, '1 mg')], 'right');
      });

      await startClip(page, 'TC-011');
      await step(11, 'ขั้น 1–3 ติ๊ก Adrenaline 1:10,000 + Amiodarone > ดู Badge > เอา Amiodarone ออก', async () => {
        const badge = drugSection(form).locator('.badge');
        const am = drugFields(form, 'Amiodarone');
        await am.check.check();
        const two = ((await badge.textContent()) ?? '').trim();
        await markEvidence(clicked(am.check, 'ติ๊ก'), expected(badge, two));
        await snapEvidence(page, 'ติ๊ก 2 ตัว — Badge');
        await am.check.uncheck();
        const one = ((await badge.textContent()) ?? '').trim();
        await verify('TC-011 Badge จำนวนยา', [row('ติ๊ก 2 ตัว', 'เลือกแล้ว 2 รายการ', two), row('เอาออก 1 ตัว', 'เลือกแล้ว 1 รายการ', one)], [expected(badge, one)], 'right');
      });

      await startClip(page, 'TC-053');
      await step(53, 'ขั้น 2–3 ติ๊ก ยาอื่นๆ ไม่กรอกชื่อยา · Dose 10 ml > กด บันทึก Cycle', async () => {
        const other = drugFields(form, 'ยาอื่นๆ');
        const before = events(await k.rowsNow()).length;
        await other.check.check();
        await other.dose.fill('10 ml');
        await markEvidence(filled(other.row, 'ไม่มีชื่อยา · 10 ml'), clicked(cprButton(form, 'Save CPR Progress')));
        await snapEvidence(page, 'ก่อนกด — บันทึก Cycle (ไม่มีชื่อยา)');
        const saves = await countCprSaves(page, () => cprButton(form, 'Save CPR Progress').click());
        const error = other.row.getByText('กรุณาระบุชื่อยา', { exact: true });
        await other.row.scrollIntoViewIfNeeded();
        await verify('TC-053 ยาอื่นๆ ไม่มีชื่อ', [
          row('inline error ที่ช่องชื่อยา', 'กรุณาระบุชื่อยา', (await error.isVisible()) ? 'กรุณาระบุชื่อยา' : '-'),
          row('ช่องชื่อยา (aria-invalid)', 'true', String(await other.otherName.getAttribute('aria-invalid'))),
          row('คำสั่งบันทึกที่ส่ง', '0', String(saves)),
          row('แถวบน Timeline', String(before), String(events(await k.rowsNow()).length)),
        ], [alerted(error), expected(other.otherName, 'ชื่อยาว่าง')], 'right');
      });

      // รอครบ 2 นาทีของ Cycle 1 (บันทึกตอนครบกำหนดแบบที่ทีมทำจริง — เวลา +2 นาทีจึงไม่อยู่ในอนาคต)
      await startClip(page, 'wait-A1');
      await checkStep(page, 'รอ countdown ของ Cycle 1 ถึง 00:00', async () => {
        await hideCompareTable(page);
        await k.waitCountdown(0);
        await markEvidence(expected(countdown, '00:00'));
      });

      await startClip(page, 'TC-012');
      await step(12, 'ขั้น 2 ติ๊กยา 3 ตัว: Adrenaline 1:10,000 (1 mg · IV) · Amiodarone (300 mg · IO) · ยาอื่นๆ Calcium gluconate (10 ml · IV) + Rhythm PEA + Nurse note', async () => {
        const am = drugFields(form, 'Amiodarone');
        await am.check.check();
        await am.dose.fill('300 mg');
        await am.route.selectOption('IO');
        const other = drugFields(form, 'ยาอื่นๆ');
        await other.otherName.fill('Calcium gluconate');
        await k.rhythm('PEA').click();
        await nurseNoteInput(form).fill('ใส่ ETT เบอร์ 7.5');
        await drugSection(form).scrollIntoViewIfNeeded();
        await markEvidence(filled(drugFields(form, 'Adrenaline 1:10,000').row, '1 mg · IV'), filled(am.row, '300 mg · IO'), filled(other.row, 'Calcium gluconate · 10 ml · IV'), clicked(cprButton(form, 'Save CPR Progress')));
        await snapEvidence(page, 'ก่อนกด — บันทึก Cycle 1 (ยา 3 ตัว)');
      });
      await step(12, 'ขั้น 3–4 กด บันทึก Cycle (chip +2 นาที) > ดูแถว Cycle บน CPR Timeline', async () => {
        cycleTimes['Cycle 1'] = await k.saveCycle('default', 'บันทึก Cycle 1 (ยา 3 ตัว)');
        const r = (await k.rowsNow()).find((x) => x.name === 'Cycle 1');
        const want = ['Adrenaline 1:10,000 · 1 mg · IV', 'Amiodarone · 300 mg · IO', 'Calcium gluconate · 10 ml · IV'];
        await k.summaryRow('Cycle 1').scrollIntoViewIfNeeded();
        await verify('TC-012 ยาของ Cycle 1', [
          row('แถว Cycle 1 บน Timeline', 'มี', r ? 'มี' : 'ไม่มี'),
          row('จำนวนยา', '3', String(r?.drugs.length ?? 0)),
          ...want.map((w, i) => row(`ยา ${i + 1} (ชื่อ · Dose · Route)`, w, r?.drugs[i] ?? '-')),
          row('เวลาของยา = เวลาของ Cycle', stampClock(cycleTimes['Cycle 1']), r?.time ?? '-'),
        ], [expected(k.summaryRow('Cycle 1'), 'Cycle 1 + ยา 3 ตัว')], 'right');
      });
      await step(32, 'ขั้น 3 บันทึก Cycle ที่ Vital Signs กางอยู่โดยไม่กรอก — สำเร็จ ไม่มี error', async () => {
        const box = vitalBox(form);
        await box.scrollIntoViewIfNeeded();
        const errors = await box.locator('.field-error, [aria-invalid="true"]').count();
        await verify('TC-032 บันทึก Cycle โดยไม่กรอก Vital Signs', [
          row('บันทึก Cycle 1', 'สำเร็จ (contribution 201)', cycleTimes['Cycle 1'] ? 'สำเร็จ (contribution 201)' : '-'),
          row('error ให้กรอก Vital Signs', '0', String(errors)),
        ], [expected(box, 'ไม่มี error')], 'left');
      });
      await step(2, 'ขั้น 3 Cycle 2: ช่อง วันที่และเวลาบันทึก = เวลาเริ่ม Cycle 2 + 2 นาที', async () => {
        await card.scrollIntoViewIfNeeded();
        const start = `${cycleTimes['Cycle 1'].split('T')[0]}T${((await card.locator('.cycle-start time').textContent()) ?? '').trim()}`;
        const value = fullStamp(await cycleTimeInput(form).inputValue());
        await verify('TC-002 ค่าตั้งต้นของ Cycle 2', [
          row('หัวการ์ด', 'Cycle 2', ((await card.getByRole('heading').first().textContent()) ?? '').trim()),
          row('เริ่ม Cycle 2 = เวลาบันทึก Cycle 1', stampClock(cycleTimes['Cycle 1']), stampClock(start)),
          row('วันที่และเวลาบันทึก', shiftStamp(start, 120).replace('T', ' '), value.replace('T', ' ')),
        ], [expected(card.locator('.cycle-start'), 'เริ่ม Cycle 2'), expected(cycleTimeInput(form), '+2 นาที')], 'left');
      });

      await startClip(page, 'TC-022');
      await step(22, 'ขั้น 2 ดูแถว Cycle ที่บันทึกยา 3 ตัวบน CPR Timeline', async () => {
        const rows = await k.rowsNow();
        const c1 = rows.find((x) => x.name === 'Cycle 1');
        const others = rows.filter((x) => x.name !== 'Cycle 1' && x.drugs.length);
        await k.summaryRow('Cycle 1').scrollIntoViewIfNeeded();
        await verify('TC-022 chip ยาบน Timeline', [
          row('chip ใต้ Cycle 1', 'Adrenaline 1:10,000 · 1 mg · IV | Amiodarone · 300 mg · IO | Calcium gluconate · 10 ml · IV', c1?.drugs.join(' | ') ?? '-'),
          row('chip ยาใต้แถวอื่น', 'ไม่มี', others.length ? others.map((o) => o.name).join(', ') : 'ไม่มี'),
        ], [expected(k.summaryRow('Cycle 1').locator('.drug-chips'), '1 chip ต่อ 1 ยา'), expected(k.summaryRow('Start CPR'), 'ไม่มี chip ยา')], 'right');
      });

      await startClip(page, 'TC-013');
      await step(13, 'ขั้น 2 ดู Section ยาที่ให้ใน Cycle นี้ของ Cycle ถัดไป', async () => {
        const section = drugSection(form);
        await section.scrollIntoViewIfNeeded();
        const state = await section.evaluate((s) => ({
          checked: [...s.querySelectorAll('input[type="checkbox"]')].filter((c) => (c as HTMLInputElement).checked).length,
          doses: [...s.querySelectorAll('input.dose')].map((d) => (d as HTMLInputElement).value).filter(Boolean).length,
          routes: [...s.querySelectorAll('select')].map((d) => (d as HTMLSelectElement).value),
          name: (s.querySelector('input.name') as HTMLInputElement | null)?.value ?? '',
          badge: s.querySelector('.badge')?.textContent?.trim() ?? '',
        }));
        await verify('TC-013 checklist ยาล้างค่าแล้ว', [
          row('checkbox ที่ติ๊กค้าง', '0', String(state.checked)),
          row('Dose ที่มีค่า', '0', String(state.doses)),
          row('Route ทุกแถว', 'IV', [...new Set(state.routes)].join(' / ')),
          row('ชื่อยาอื่นๆ', '(ว่าง)', state.name || '(ว่าง)'),
          row('Badge', 'ไม่แสดงจำนวนเดิม (3)', state.badge, !/ 3 /.test(state.badge)),
        ], [expected(section, 'ล้างค่าแล้ว')], 'right');
      });

      await startClip(page, 'TC-029');
      await step(29, 'ขั้น 3 ดู Nurse note ของ Cycle 1 บน CPR Timeline (หน้า CPR)', async () => {
        const r = (await k.rowsNow()).find((x) => x.name === 'Cycle 1');
        const box = k.summaryRow('Cycle 1').locator('.nurse-note');
        await box.scrollIntoViewIfNeeded();
        const bg = await box.evaluate((e) => getComputedStyle(e).backgroundColor);
        const labelColor = await box.locator('.nurse-label').evaluate((e) => getComputedStyle(e).color);
        await verify('TC-029 Nurse note บนหน้า CPR', [
          row('label', 'Nurse note', ((await box.locator('.nurse-label').textContent()) ?? '').trim()),
          row('ข้อความ', 'ใส่ ETT เบอร์ 7.5', r?.nurse ?? '-'),
          row('ชื่อผู้บันทึก', 'user1', r?.nurseMeta ?? '-', /user1/.test(r?.nurseMeta ?? '')),
          row('เวลา = เวลา Cycle 1', stampClock(cycleTimes['Cycle 1']), r?.nurseMeta.split('·').pop()?.trim() ?? '-'),
          row('กล่องสีฟ้า', 'ฟ้า', `${bg} · ${labelColor}`, /28, 103, 255|0\.9|rgb\(2[0-4]\d, 2[3-5]\d, 255\)/.test(`${bg} ${labelColor}`)),
        ], [expected(box, 'Nurse note + ผู้บันทึก + เวลา')], 'right');
      });

      await startClip(page, 'TC-026');
      await step(26, 'ขั้น 2 Cycle A: Defib 200 J + Comment "ทดสอบ comment" (ไม่ให้ยา · ไม่มี Nurse note) > บันทึก', async () => {
        await k.defibInput.fill('200');
        await k.commentInput.fill('ทดสอบ comment');
        await markEvidence(filled(k.defibInput, '200 J'), filled(k.commentInput, 'ทดสอบ comment'), clicked(cprButton(form, 'Save CPR Progress')));
        await snapEvidence(page, 'ก่อนกด — Cycle 2 (Defib + Comment)');
        cycleTimes['Cycle 2'] = await k.saveCycle('ตอนนี้', 'บันทึก Cycle 2 (Defib + Comment)');
      });
      await step(26, 'ขั้น 3 Cycle B: กรอกแค่ Rhythm Perfusing Rhythm > บันทึก', async () => {
        await page.waitForTimeout(1_500);
        await k.rhythm('Perfusing Rhythm').click();
        await markEvidence(filled(k.rhythm('Perfusing Rhythm'), 'Rhythm อย่างเดียว'), clicked(cprButton(form, 'Save CPR Progress')));
        await snapEvidence(page, 'ก่อนกด — Cycle 3 (Rhythm อย่างเดียว)');
        cycleTimes['Cycle 3'] = await k.saveCycle('ตอนนี้', 'บันทึก Cycle 3 (Rhythm อย่างเดียว)');
      });
      await step(26, 'ขั้น 4 ดูแถว Cycle A / B บน CPR Timeline', async () => {
        const rows = await k.rowsNow();
        const a = rows.find((x) => x.name === 'Cycle 2');
        const b = rows.find((x) => x.name === 'Cycle 3');
        await k.summaryRow('Cycle 2').scrollIntoViewIfNeeded();
        await verify('TC-026 แสดงเฉพาะ field ที่มีข้อมูล', [
          row('Cycle A: tag', '⚡ Defib 200 J', a?.tags.map((t) => t.text).join(' · ') ?? '-'),
          row('Cycle A: Comment', 'ทดสอบ comment', a?.comment ?? '-', /ทดสอบ comment/.test(a?.comment ?? '')),
          row('Cycle A: ยา / Nurse note', 'ไม่มี / ไม่มี', `${a?.drugs.length ? 'มี' : 'ไม่มี'} / ${a?.nurse ? 'มี' : 'ไม่มี'}`),
          row('Cycle B: tag', 'Perfusing Rhythm', b?.tags.map((t) => t.text).join(' · ') ?? '-'),
          row('Cycle B: Defib / Comment / ยา / Nurse note', 'ไม่มีทั้งหมด', b && !b.comment && !b.drugs.length && !b.nurse && !b.tags.some((t) => /Defib/.test(t.text)) ? 'ไม่มีทั้งหมด' : JSON.stringify(b)),
        ], [expected(k.summaryRow('Cycle 2'), 'Cycle A'), expected(k.summaryRow('Cycle 3'), 'Cycle B')], 'right');
      });

      await startClip(page, 'TC-042');
      await step(42, 'ขั้น 3 ดูตัวเลขบน CPR Episode Summary 2 ครั้งห่างกัน 10 วินาที (ยังไม่จบ CPR)', async () => {
        await summary.scrollIntoViewIfNeeded();
        const rows = events(await k.rowsNow());
        const first = await k.numbers();
        await markEvidence(expected(summary.locator('dl').first(), `Duration ${first.Duration}`));
        await snapEvidence(page, 'ครั้งที่ 1 — ตัวเลขสรุป');
        await page.waitForTimeout(10_000);
        const second = await k.numbers();
        const grow = clockSeconds(second.Duration) - clockSeconds(first.Duration);
        await verify('TC-042 ตัวเลขสรุประหว่าง CPR', [
          row('Started', summaryStamp(startStamp), second.Started),
          row('Ended', '—', second.Ended),
          row('Duration เพิ่ม ~10 วิ', '9–12 วินาที', `${first.Duration} → ${second.Duration} (+${grow})`, grow >= 9 && grow <= 12),
          row('Cycles', String(rows.filter(isCycle).length), second.Cycles),
          row('Shocks (แถวที่มี Defib)', String(rows.filter(isShock).length), second.Shocks),
          row('ยา (dose)', String(rows.reduce((n, r) => n + r.drugs.length, 0)), second['ยา (dose)']),
        ], [expected(summary.locator('dl').first(), `Duration ${second.Duration}`)], 'bottom');
      });

      await startClip(page, 'TC-047');
      await step(47, 'ขั้น 1–2 จดตัวเลข > บันทึก Cycle ที่มี Defib 200 J + Atropine 1 mg IV (ไม่ refresh)', async () => {
        const before = await k.numbers();
        const beforeN = await k.timelineCount();
        await markEvidence(expected(summary.locator('dl').first(), 'ก่อนบันทึก'), expected(k.toggle(summary), `N = ${beforeN}`));
        await snapEvidence(page, 'ก่อนบันทึก — ตัวเลขสรุป');
        await k.rhythm('VF').click();
        await k.defibInput.fill('200');
        const at = drugFields(form, 'Atropine');
        await at.check.check();
        await at.dose.fill('1 mg');
        await markEvidence(filled(k.defibInput, '200 J'), filled(at.row, 'Atropine 1 mg IV'), clicked(cprButton(form, 'Save CPR Progress')));
        await snapEvidence(page, 'ก่อนกด — Cycle 4 (Defib + Atropine)');
        cycleTimes['Cycle 4'] = await k.saveCycle('ตอนนี้', 'บันทึก Cycle 4 (Defib + Atropine)');
        await summary.scrollIntoViewIfNeeded();
        const after = await k.numbers();
        const afterN = await k.timelineCount();
        const last = events(await k.rowsNow()).at(-1);
        await verify('TC-047 อัปเดตทันทีหลังบันทึก', [
          row('แถวใหม่ต่อท้ายรายการ', 'Cycle 4 · Atropine · 1 mg · IV', `${last?.name} · ${last?.drugs.join(', ')}`),
          row('Cycles +1', String(Number(before.Cycles) + 1), after.Cycles),
          row('Shocks +1', String(Number(before.Shocks) + 1), after.Shocks),
          row('dose ยา +1', String(Number(before['ยา (dose)']) + 1), after['ยา (dose)']),
          row('N ของ CPR Timeline +1', String(beforeN + 1), String(afterN)),
        ], [expected(summary.locator('dl').first(), 'อัปเดตแล้ว'), expected(k.toggle(summary), `N = ${afterN}`), expected(k.summaryRow('Cycle 4'), 'แถวใหม่')], 'bottom');
      });

      await startClip(page, 'TC-033');
      await step(33, 'ขั้น 2 เลือก CPR Mark = ROSC > กด บันทึก ROSC (Vital Signs หุบอยู่)', async () => {
        if ((await k.vitalToggle.getAttribute('aria-expanded')) === 'true') await k.vitalToggle.click();
        await k.markSelect.selectOption({ label: 'ROSC' });
        await timeChip(form, 'ตอนนี้').click();
        roscStamp = fullStamp(await cycleTimeInput(form).inputValue());
        const save = form.getByRole('button', { name: 'บันทึก ROSC', exact: true });
        await markEvidence(filled(k.markSelect, 'ROSC'), expected(vitalBox(form), 'หุบอยู่'), clicked(save));
        await snapEvidence(page, 'ก่อนกด — บันทึก ROSC');
        await clickCprSave(page, form, save, 'บันทึก ROSC');
        // chip "ตอนนี้" เดินตามนาฬิกา → เวลา ROSC จริง = เวลาที่ Timeline แสดง
        const roscRow = (await k.rowsNow()).find((x) => x.name === 'ROSC');
        if (roscRow) roscStamp = `${roscStamp.split('T')[0]}T${roscRow.time}`;
        const box = vitalBox(form);
        const highlight = await expect(box).toHaveClass(/highlight/, { timeout: 1_500 }).then(() => 'มี', () => 'ไม่มี');
        await snapEvidence(page, 'หลังกด — Vital Signs กางเอง + highlight');
        const rect = await box.boundingBox();
        await verify('TC-033 หลัง ROSC', [
          row('Vital Signs กางเอง', 'true', String(await k.vitalToggle.getAttribute('aria-expanded'))),
          row('highlight', 'มี', highlight),
          row('เลื่อนมาที่ section (อยู่ในจอ)', 'ใช่', rect && rect.y >= 0 && rect.y < 1080 ? 'ใช่' : `ไม่ (y ${rect?.y})`),
        ], [expected(box, 'กางเอง')], 'left');
      });

      await startClip(page, 'TC-021');
      await step(21, 'ขั้น 3 ดู CPR Timeline ใน Episode Summary (Start CPR / Cycle 1 ด้วย +2 นาที / ROSC)', async () => {
        await summary.scrollIntoViewIfNeeded();
        const rows = events(await k.rowsNow());
        const start = rows.find((x) => x.name === 'Start CPR');
        const c1 = rows.find((x) => x.name === 'Cycle 1');
        const rosc = rows.find((x) => x.name === 'ROSC');
        const rel = (r?: CprRow) => {
          if (!r || !start) return '-';
          const s = Math.round((Date.parse(r.iso) - Date.parse(start.iso)) / 1000);
          return `T+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
        };
        const xs = await summary.locator('li.row').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
        await verify('TC-021 เวลาจริง / เวลาสัมพัทธ์', [
          row('ชื่อ event', 'Start CPR · Cycle 1 … · ROSC', rows.map((r) => r.name).join(' · '), !!start && !!c1 && !!rosc),
          row('รูปแบบเวลาจริง HH:MM:SS', 'ทุกแถว', rows.every((r) => /^\d{2}:\d{2}:\d{2}$/.test(r.time)) ? 'ทุกแถว' : rows.map((r) => r.time).join(' · ')),
          row('Start CPR', 'T+00:00', start?.relative ?? '-'),
          row('Cycle 1 (chip +2 นาที)', 'T+02:00', c1?.relative ?? '-'),
          row('ROSC = เวลาจริง − Start', rel(rosc), rosc?.relative ?? '-'),
          row('แนวตั้ง (x ทุกแถวเท่ากัน)', 'ใช่', new Set(xs).size === 1 ? 'ใช่' : xs.join(',')),
        ], [expected(k.summaryRow('Start CPR').locator('.when'), 'T+00:00'), expected(k.summaryRow('Cycle 1').locator('.when'), 'T+02:00'), expected(k.summaryRow('ROSC').locator('.when'), 'ROSC')], 'right');
      });

      await startClip(page, 'TC-023');
      await step(23, 'ขั้น 4 ดู tag Rhythm (VF / PEA / Perfusing) และ ROSC บน CPR Timeline', async () => {
        const rows = events(await k.rowsNow());
        const tag = (name: string, text: string) => rows.find((r) => r.name === name)?.tags.find((t) => t.text === text);
        const color = async (name: string, text: string) => k.summaryRow(name).locator('.tag', { hasText: text }).first().evaluate((e) => getComputedStyle(e).color).catch(() => '-');
        await verify('TC-023 สี tag', [
          row('VF (Start CPR)', 'แดง · tone-danger', `${await color('Start CPR', 'VF')} · ${tag('Start CPR', 'VF')?.tone ?? '-'}`, tag('Start CPR', 'VF')?.tone === RHYTHM_TONE.VF),
          row('PEA (Cycle 1)', 'ส้ม · tone-warning', `${await color('Cycle 1', 'PEA')} · ${tag('Cycle 1', 'PEA')?.tone ?? '-'}`, tag('Cycle 1', 'PEA')?.tone === RHYTHM_TONE.PEA),
          row('Perfusing Rhythm (Cycle 3)', 'เขียว · tone-success', `${await color('Cycle 3', 'Perfusing Rhythm')} · ${tag('Cycle 3', 'Perfusing Rhythm')?.tone ?? '-'}`, tag('Cycle 3', 'Perfusing Rhythm')?.tone === RHYTHM_TONE['Perfusing Rhythm']),
          row('แถว ROSC เป็น tag', 'ROSC', tag('ROSC', 'ROSC')?.text ?? '-'),
        ], [expected(k.summaryRow('Start CPR').locator('.tag').first(), 'VF แดง'), expected(k.summaryRow('Cycle 1').locator('.tag').first(), 'PEA ส้ม'), expected(k.summaryRow('Cycle 3').locator('.tag').first(), 'Perfusing เขียว'), expected(k.summaryRow('ROSC').locator('.tag').first(), 'ROSC')], 'right');
      });

      await startClip(page, 'TC-048');
      await step(48, 'ขั้น 2 ดูลำดับแถวบน CPR Timeline (Start → Cycle → … → ROSC)', async () => {
        const rows = events(await k.rowsNow());
        const sorted = [...rows].sort((a, b) => a.iso.localeCompare(b.iso));
        await summary.scrollIntoViewIfNeeded();
        await verify('TC-048 ลำดับแถว', [
          row('ลำดับที่แสดง', 'Start CPR → Cycle 1 → Cycle 2 → Cycle 3 → Cycle 4 → ROSC', rows.map((r) => r.name).join(' → ')),
          row('เรียงตามเวลาเก่า → ใหม่', 'ใช่', rows.every((r, i) => r === sorted[i]) ? 'ใช่' : rows.map((r) => r.time).join(' → ')),
        ], [expected(summary.locator('ol').first(), 'เก่า → ใหม่')], 'right');
      });

      await startClip(page, 'TC-043b');
      await step(43, 'ขั้น 2 หลัง ROSC: Status pill = Terminal: ROSC สีเขียว', async () => {
        const pill = summary.locator('.pill').first();
        await summary.scrollIntoViewIfNeeded();
        await verify('TC-043 Status pill หลัง ROSC', [
          row('ข้อความ', 'Terminal: ROSC', ((await pill.textContent()) ?? '').trim()),
          row('สี', 'เขียว (tone-success)', (await pill.getAttribute('class')) ?? '', /tone-success/.test((await pill.getAttribute('class')) ?? '')),
        ], [expected(pill, 'Terminal: ROSC')], 'bottom');
      });

      await startClip(page, 'TC-036');
      await step(36, 'ขั้น 2 หลัง ROSC ดู field ใน Section Vital Signs', async () => {
        const box = vitalBox(form);
        await box.scrollIntoViewIfNeeded();
        const labels = ['Systolic ครั้งที่ 1', 'Diastolic ครั้งที่ 1', 'PR', 'RR', 'Temperature (°C)', 'SpO₂ (%)', 'Pain score (0–10)', 'Level of Consciousness (AVPU)'];
        const seen: string[] = [];
        for (const l of labels) if (await box.getByLabel(l, { exact: true }).first().isVisible()) seen.push(l);
        const mews = box.locator('.mews-badge').first();
        await verify('TC-036 field Vital Signs', [
          ...labels.map((l) => row(l, 'มี', seen.includes(l) ? 'มี' : 'ไม่มี')),
          row('ช่อง MEWS', 'มี', (await mews.isVisible()) ? `มี (${((await mews.textContent()) ?? '').trim()})` : 'ไม่มี', await mews.isVisible()),
        ], [expected(box.locator('.vital-round').first(), 'field ครบ'), expected(mews, 'MEWS')], 'left');
      });

      await startClip(page, 'TC-035');
      let vitalPayload = '';
      await step(35, 'ขั้น 2–3 ดูเวลาวัดรอบที่ 1 > แก้เป็น ROSC + 5 นาที > กรอก BP / PR > บันทึก', async () => {
        const box = vitalBox(form);
        const time = box.locator('input[type="datetime-local"]').first();
        const original = fullStamp(await time.inputValue());
        await markEvidence(expected(time, `ค่าตั้งต้น ${stampClock(original)}`));
        await snapEvidence(page, 'ก่อนแก้ — เวลาวัดรอบที่ 1');
        const edited = shiftStamp(roscStamp, 300);
        await fillStamp(time, edited);
        const afterFill = fullStamp(await time.inputValue());
        await k.fillVitals(0, { systolic: '110', diastolic: '70', pr: '96' });
        await k.freshTime('post', note);
        await markEvidence(filled(time, `ROSC + 5 นาที`), filled(box.locator('.vital-round').first().locator('.bp'), 'BP 110/70'), clicked(k.postSave));
        await snapEvidence(page, 'ก่อนกด — บันทึก Post-CPR update (Vital Signs)');
        const sent = await clickCprSave(page, form, k.postSave, 'บันทึก Post-CPR update (Vital Signs)');
        vitalPayload = sent.find((s) => s.template.startsWith('vital_signs'))?.body ?? '';
        test.info().attachments.push({ name: 'TC-035 payload Vital Signs ที่ส่งบันทึก (flat-to-json vital_signs)', contentType: 'application/json', body: Buffer.from(vitalPayload || '{}') });
        const utc = new Date(`${edited}+07:00`).toISOString().slice(0, 16);
        await verify('TC-035 เวลาวัดรอบที่ 1', [
          row('ค่าตั้งต้น = เวลา ROSC', stampClock(roscStamp), stampClock(original)),
          row('แก้เวลาได้ (ค่าในช่องหลังแก้)', stampClock(edited), stampClock(afterFill)),
          row('payload ที่บันทึกมีเวลาที่แก้', `${stampClock(edited).slice(0, 5)} (+07:00) / ${utc}Z`, vitalPayload.includes(edited.slice(0, 16)) || vitalPayload.includes(utc) ? 'มี' : 'ไม่พบ', vitalPayload.includes(edited.slice(0, 16)) || vitalPayload.includes(utc)),
        ], [expected(form.locator('section[aria-label="Saved CPR event"]'), 'บันทึกแล้ว')], 'bottom');
      });

      await startClip(page, 'TC-030');
      await step(30, 'ขั้น 2–3 หลัง ROSC: Nurse note "หลัง ROSC ส่ง CXR" > บันทึก > ดู CPR Timeline', async () => {
        const input = nurseNoteInput(form);
        await input.fill('หลัง ROSC ส่ง CXR');
        await k.freshTime('post', note);
        await markEvidence(filled(input, 'หลัง ROSC ส่ง CXR'), clicked(k.postSave));
        await snapEvidence(page, 'ก่อนกด — บันทึก Post-CPR update (Nurse note)');
        await clickCprSave(page, form, k.postSave, 'บันทึก Post-CPR update (Nurse note)');
        const rows = events(await k.rowsNow());
        const i = rows.findIndex((r) => r.nurse === 'หลัง ROSC ส่ง CXR');
        const r = rows[i];
        const roscIndex = rows.findIndex((x) => x.name === 'ROSC');
        const target = summary.locator('li.row').filter({ hasText: 'หลัง ROSC ส่ง CXR' }).first();
        await target.scrollIntoViewIfNeeded();
        await verify('TC-030 Nurse note หลัง ROSC', [
          row('บันทึกสำเร็จ / แถวบน Timeline', 'มี', r ? `มี (${r.name})` : 'ไม่มี', !!r),
          row('ชื่อผู้บันทึก + เวลา', 'user1 · HH:MM:SS', r?.nurseMeta ?? '-', /user1.*\d{2}:\d{2}:\d{2}/.test(r?.nurseMeta ?? '')),
          row('อยู่ต่อจากแถว ROSC', 'ใช่', i > roscIndex && roscIndex >= 0 ? 'ใช่' : `ไม่ (${i} / ${roscIndex})`),
        ], [expected(target, 'Nurse note หลัง ROSC')], 'right');
      });

      await startClip(page, 'TC-040');
      await step(40, 'ขั้น 2–3 ดู banner สรุป Episode > กดลิงก์ ดู Timeline', async () => {
        const rows = events(await k.rowsNow());
        const text = ((await k.banner.textContent()) ?? '').replace(/\s+/g, ' ');
        const cycles = rows.filter(isCycle).length;
        const shocks = rows.filter(isShock).length;
        const doses = rows.reduce((n, r) => n + r.drugs.length, 0);
        await k.banner.scrollIntoViewIfNeeded();
        await markEvidence(expected(k.banner, 'banner สรุป'));
        await snapEvidence(page, 'banner สรุป Episode #1');
        const link = k.banner.getByRole('button', { name: 'ดู Timeline' });
        await link.click();
        await page.waitForTimeout(1_500);
        const top = (await summary.locator('ol').first().boundingBox())?.y ?? -1;
        await verify('TC-040 banner สรุป Episode', [
          row('เวลา ROSC', summaryStamp(roscStamp), text.match(/ROSC ([\d/]+ [\d:]+)/)?.[1] ?? '-'),
          row('duration', 'มี', text.match(/Duration ([\d:]+)/)?.[1] ?? 'ไม่มี', /Duration \d/.test(text)),
          row('cycles', `${cycles} cycles`, text.match(/(\d+) cycles/)?.[0] ?? '-'),
          row('shocks', `${shocks} shocks`, text.match(/(\d+) shocks/)?.[0] ?? '-'),
          row('ยา', `ยา ${doses} dose`, text.match(/ยา (\d+) dose/)?.[0] ?? '-'),
          row('ผู้บันทึก', 'user1', text.match(/ผู้บันทึก ([^ ]+ ?[^ ]*)/)?.[1] ?? '-', /ผู้บันทึก user1/.test(text)),
          row('กดลิงก์แล้วไปที่ CPR Timeline', 'Timeline อยู่ในจอ', top >= 0 && top < 1080 ? 'Timeline อยู่ในจอ' : `y ${top}`),
        ], [clicked(link, 'ดู Timeline'), expected(summary.locator('li.row').last(), 'CPR Timeline ของ Episode นี้')], 'bottom');
      });

      await startClip(page, 'TC-045');
      await step(45, 'ขั้น 2 เปิดหน้า CPR ใหม่ (เปิด Visit ใหม่ + เมนู CPR Progression) > ดูปุ่ม CPR Timeline', async () => {
        await gotoVisit(page, visit);
        // Episode จบแล้ว ฟอร์มไม่มีหัวข้อ CPR Event (openCprForm รอหัวข้อนั้น) → รอการ์ดสรุปแทน
        await openCarePanel(page, 'CPR Progression', k.main.getByRole('heading', { name: 'CPR Progression' }).first());
        await expect(summary).toBeVisible({ timeout: 60_000 });
        await expect(form).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
        await summary.scrollIntoViewIfNeeded();
        const rows = events(await k.rowsNow());
        await verify('TC-045 ปุ่ม CPR Timeline (N)', [
          row('N = จำนวน event ที่บันทึก', `CPR Timeline (${rows.length})`, ((await k.toggle(summary).textContent()) ?? '').trim()),
          row('รายการกางเป็นค่าตั้งต้น', 'true', String(await k.toggle(summary).getAttribute('aria-expanded'))),
          row('แถวมองเห็น', 'ใช่', (await summary.locator('li.row').first().isVisible()) ? 'ใช่' : 'ไม่'),
        ], [expected(k.toggle(summary), `CPR Timeline (${rows.length})`), expected(summary.locator('ol').first(), 'กางอยู่')], 'bottom');
      });
      await step(35, 'ขั้น 3 หลังเปิดหน้าใหม่: สัญญาณชีพล่าสุดของผู้ป่วยมีเวลาวัด = ROSC + 5 นาที', async () => {
        const updated = page.getByText(/^อัปเดตล่าสุด:/).first();
        const text = ((await updated.textContent()) ?? '').trim();
        const want = stampClock(shiftStamp(roscStamp, 300)).slice(0, 5);
        await verify('TC-035 เวลาที่บันทึก', [row('อัปเดตล่าสุด (header สัญญาณชีพ)', want, text.match(/(\d{2}:\d{2})\s*$/)?.[1] ?? text)], [expected(updated, `เวลาวัด ${want}`)], 'bottom');
      });

      await startClip(page, 'TC-046');
      await step(46, 'ขั้น 2 กดปุ่ม CPR Timeline (N) > กดอีกครั้ง', async () => {
        const btn = k.toggle(summary);
        const list = summary.locator('li.row').first();
        const count = await summary.locator('li.row').count();
        await btn.click();
        const hidden = !(await list.isVisible());
        await markEvidence(clicked(btn, 'หุบ'));
        await snapEvidence(page, 'กดครั้งแรก — รายการหุบ');
        await btn.click();
        await expect(list).toBeVisible();
        await verify('TC-046 หุบ / กาง CPR Timeline', [
          row('กดครั้งแรก', 'หุบ', hidden ? 'หุบ' : 'ยังแสดง'),
          row('กดครั้งที่สอง', `กางครบ ${count} แถว`, `กาง ${await summary.locator('li.row').count()} แถว · aria-expanded ${await btn.getAttribute('aria-expanded')}`, (await summary.locator('li.row').count()) === count),
        ], [clicked(btn, 'กาง'), expected(summary.locator('ol').first(), 'กางกลับมาครบ')], 'bottom');
      });

      await startClip(page, 'TC-025');
      await step(25, 'ขั้น 2 กด filter ทีละตัว: Cycle-Rhythm → Shock → ยา → Nurse note → ทั้งหมด', async () => {
        const all = await k.rowsNow();
        const filters = summary.getByRole('group', { name: 'กรอง Timeline' });
        const chipNames = (await filters.getByRole('button').allTextContents()).map((t) => t.trim());
        const want: Record<string, string[]> = {
          'Cycle-Rhythm': all.filter((r) => isCycle(r) || r.tags.some((t) => t.text in RHYTHM_TONE)).map((r) => r.name),
          Shock: all.filter(isShock).map((r) => r.name),
          ยา: all.filter((r) => r.drugs.length).map((r) => r.name),
          'Nurse note': all.filter((r) => r.nurse).map((r) => r.name),
          ทั้งหมด: all.map((r) => r.name),
        };
        const rows: CompareRow[] = [row('filter chips', 'ทั้งหมด · Cycle-Rhythm · Shock · ยา · Nurse note', chipNames.join(' · '))];
        for (const name of ['Cycle-Rhythm', 'Shock', 'ยา', 'Nurse note', 'ทั้งหมด']) {
          const chip = filters.getByRole('button', { name, exact: true });
          await chip.click();
          await page.waitForTimeout(500);
          const shown = (await readCprRows(summary)).map((r) => r.name);
          rows.push(row(`filter ${name}`, want[name].join(', '), shown.join(', ')));
          await markEvidence(clicked(chip, name), expected(summary.locator('ol').first(), `${shown.length} แถว`));
          await snapEvidence(page, `filter ${name}`);
        }
        await verify('TC-025 filter chips', rows, [expected(filters, 'filter 5 ตัว')], 'bottom');
      });

      await startClip(page, 'TC-049');
      let historyRowsEp1: CprRow[] = [];
      await step(49, 'ขั้น 2–3 จดทุกแถวบน Episode Summary > เปิดหน้า History > เทียบทีละแถว', async () => {
        const pageRows = events(await k.rowsNow());
        await k.historyLink.click();
        await expect(cprHistory(form)).toBeVisible();
        const ep = cprHistoryEpisodes(form).first();
        historyRowsEp1 = events(await readCprRows(ep));
        const key = (r?: CprRow) => (r ? `${r.time} · ${r.relative} · ${r.name} · ${r.tags.map((t) => t.text).join('/')} · ${r.drugs.join('/')} · ${r.nurse} · ${r.nurseMeta} · ${r.comment}` : '-');
        const rows: CompareRow[] = [row('จำนวนแถว', String(pageRows.length), String(historyRowsEp1.length))];
        pageRows.forEach((r, i) => rows.push(row(`แถว ${i + 1} ${r.name}`, key(r), key(historyRowsEp1[i]))));
        await verify('TC-049 หน้า CPR (Expected) vs หน้า History (ผลจริง)', rows, [expected(ep, 'Episode #1 ในหน้า History')], 'bottom');
      });
      await step(29, 'ขั้น 4 หน้า History: Nurse note ของ Cycle 1 (Episode เดียวกัน)', async () => {
        const ep = cprHistoryEpisodes(form).first();
        const r = historyRowsEp1.find((x) => x.name === 'Cycle 1');
        const box = ep.locator('li.row').filter({ hasText: 'ใส่ ETT เบอร์ 7.5' }).locator('.nurse-note').first();
        await box.scrollIntoViewIfNeeded();
        await verify('TC-029 Nurse note บนหน้า History', [
          row('label', 'Nurse note', ((await box.locator('.nurse-label').textContent()) ?? '').trim()),
          row('ข้อความ', 'ใส่ ETT เบอร์ 7.5', r?.nurse ?? '-'),
          row('ชื่อผู้บันทึก + เวลา Cycle 1', `user1 … · ${stampClock(cycleTimes['Cycle 1'])}`, r?.nurseMeta ?? '-', /user1/.test(r?.nurseMeta ?? '') && (r?.nurseMeta ?? '').endsWith(stampClock(cycleTimes['Cycle 1']))),
        ], [expected(box, 'Nurse note (History)')], 'right');
      });
      await k.backToCpr();

      // ================= Episode #2 (กู้ชีพซ้ำ) =================
      await startClip(page, 'TC-044');
      await step(44, 'ขั้น 1–2 Episode #1 จบแล้ว > Start CPR (กู้ชีพซ้ำ) > ดูการ์ด CPR Episode Summary', async () => {
        await k.restartButton.scrollIntoViewIfNeeded();
        await k.freshTime('restart', note);
        await markEvidence(clicked(k.restartButton));
        await snapEvidence(page, 'ก่อนกด — Start CPR (กู้ชีพซ้ำ)');
        await clickCprSave(page, form, k.restartButton, 'Start CPR Episode #2');
        // ติดตัวนับเสียงไว้ก่อนรอ countdown (TC-055)
        await page.evaluate(() => {
          const w = window as unknown as { __cprAudio: number };
          w.__cprAudio = 0;
          const play = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) { w.__cprAudio++; return play.call(this); };
          if (window.AudioContext) {
            const osc = AudioContext.prototype.createOscillator;
            AudioContext.prototype.createOscillator = function (this: AudioContext) { w.__cprAudio++; return osc.call(this); };
          }
          if (window.speechSynthesis) { const speak = window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak = (u) => { w.__cprAudio++; speak(u); }; }
        });
        await summary.scrollIntoViewIfNeeded();
        const pills = (await summary.locator('.pill').allTextContents()).map((t) => t.trim());
        await verify('TC-044 Episode #2', [row('pill บนการ์ดสรุป', 'Episode #2 · กู้ชีพซ้ำ', pills.find((p) => p.startsWith('Episode')) ?? pills.join(' | '))], [expected(summary.locator('.pill', { hasText: 'Episode' }), 'Episode #2 · กู้ชีพซ้ำ')], 'bottom');
      });

      await startClip(page, 'TC-015');
      await step(15, 'ขั้น 2–3 ดูหน้า CPR (ป้ายกู้ชีพซ้ำ + ลิงก์) > กดลิงก์ ดูประวัติ CPR ทั้งหมด', async () => {
        const label = form.locator('.repeat-label').first();
        await label.scrollIntoViewIfNeeded();
        const linkText = ((await k.historyLink.textContent()) ?? '').trim();
        await markEvidence(expected(label, 'กู้ชีพซ้ำ'), clicked(k.historyLink, linkText));
        await snapEvidence(page, 'ก่อนกด — ลิงก์ดูประวัติ');
        const labelText = ((await label.textContent()) ?? '').trim();
        await k.historyLink.click();
        await expect(cprHistory(form)).toBeVisible();
        await verify('TC-015 ป้ายกู้ชีพซ้ำ + ลิงก์', [
          row('ป้าย', 'กู้ชีพซ้ำ', labelText),
          row('ลิงก์', 'ดูประวัติ CPR ทั้งหมด (2 Episode)', linkText),
          row('กดแล้วเปิดหน้า History', 'ประวัติ CPR ทั้งหมด (2 Episode)', ((await cprHistory(form).getByRole('heading').first().textContent()) ?? '').trim()),
        ], [expected(cprHistory(form).getByRole('heading').first(), 'หน้า History')], 'bottom');
      });

      await startClip(page, 'TC-014');
      await step(14, 'ขั้น 3 ดูเลข Episode บนหน้า History (+ หน้า CPR จาก TC-044)', async () => {
        const heads = (await cprHistoryEpisodes(form).locator('h3').allTextContents()).map((t) => t.trim());
        await verify('TC-014 เลข Episode', [
          row('Episode ล่าสุด (Start CPR ครั้งที่ 2)', 'Episode #2 · กู้ชีพซ้ำ', heads[0] ?? '-'),
          row('Episode แรก', 'Episode #1', heads[1] ?? '-'),
          row('จำนวน Episode (ไม่ต่อท้าย #1)', '2', String(heads.length)),
        ], [expected(cprHistoryEpisodes(form).nth(0).locator('h3'), '#2'), expected(cprHistoryEpisodes(form).nth(1).locator('h3'), '#1')], 'bottom');
      });

      await startClip(page, 'TC-016');
      await step(16, 'ขั้น 2–3 หน้า History ดู summary card ของแต่ละ Episode', async () => {
        const [ep2, ep1] = [cprHistoryEpisodes(form).nth(0), cprHistoryEpisodes(form).nth(1)];
        const n1 = await readSummaryNumbers(ep1);
        const n2 = await readSummaryNumbers(ep2);
        const pill = async (ep: Locator) => ((await ep.locator('.pill').first().textContent()) ?? '').trim();
        const date = async (ep: Locator) => ((await ep.locator('.date-line').textContent().catch(() => '')) ?? '').trim();
        const shocks = historyRowsEp1.filter(isShock).length;
        const doses = historyRowsEp1.reduce((n, r) => n + r.drugs.length, 0);
        // ภาพการ์ดเต็มก่อนขึ้นตารางเทียบ (ตารางครึ่งล่างบังตัวเลขของการ์ด #1)
        await ep1.locator('.head').scrollIntoViewIfNeeded();
        await markEvidence(expected(ep2.locator('.head'), '#2 กำลังทำ'), expected(ep1.locator('.head'), '#1 ROSC'));
        await snapEvidence(page, 'หน้า History — การ์ด Episode #2 / #1');
        await verify('TC-016 summary card ใน History', [
          row('#1 วันที่ · เวลาเริ่ม – จบ', `${summaryStamp(startStamp).split(' ')[0]} · ${stampClock(startStamp)} – ${stampClock(roscStamp)}`, await date(ep1)),
          row('#1 Started / Ended', `${summaryStamp(startStamp)} / ${summaryStamp(roscStamp)}`, `${n1.Started} / ${n1.Ended}`),
          row('#1 Duration', 'มีค่า', n1.Duration, /\d{2}:\d{2}:\d{2}/.test(n1.Duration)),
          row('#1 จำนวน shock', String(shocks), n1.Shocks),
          row('#1 จำนวนยา (dose)', String(doses), n1['ยา (dose)']),
          row('#1 outcome', 'Terminal: ROSC', await pill(ep1)),
          row('#2 outcome', 'กำลังทำ CPR', await pill(ep2)),
          row('#2 Started / Ended', 'มีค่า / —', `${n2.Started} / ${n2.Ended}`, !!n2.Started && n2.Ended === '—'),
        ], [expected(ep2.locator('.head'), '#2 กำลังทำ'), expected(ep1.locator('.head'), '#1 ROSC')], 'bottom');
      });

      await startClip(page, 'TC-017');
      await step(17, 'ขั้น 2 หน้า History ดูลำดับ Episode', async () => {
        const heads = (await cprHistoryEpisodes(form).locator('h3').allTextContents()).map((t) => t.trim());
        await verify('TC-017 ลำดับ Episode', [row('ลำดับบน → ล่าง', 'Episode #2 · กู้ชีพซ้ำ → Episode #1', heads.join(' → '))], [expected(cprHistoryEpisodes(form).nth(0).locator('h3'), 'บนสุด')], 'bottom');
      });

      await startClip(page, 'TC-018');
      await step(18, 'ขั้น 2–3 ดู Timeline ของ #2 และ #1 > กด ขยายดู Timeline ที่ #1', async () => {
        const [ep2, ep1] = [cprHistoryEpisodes(form).nth(0), cprHistoryEpisodes(form).nth(1)];
        const e2 = await k.toggle(ep2).getAttribute('aria-expanded');
        const e1 = await k.toggle(ep1).getAttribute('aria-expanded');
        const label1 = ((await k.toggle(ep1).textContent()) ?? '').trim();
        await ep1.scrollIntoViewIfNeeded();
        await markEvidence(expected(k.toggle(ep2), `#2 ${e2 === 'true' ? 'กาง' : 'หุบ'}`), clicked(k.toggle(ep1), label1));
        await snapEvidence(page, 'ก่อนกด — ขยายดู Timeline #1');
        await k.toggle(ep1).click();
        await page.waitForTimeout(800);
        const shown = await ep1.locator('li.row').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length);
        await verify('TC-018 กาง / หุบ Timeline ใน History', [
          row('#2 (ล่าสุด) ตอนเปิดหน้า', 'กาง (true)', String(e2), e2 === 'true'),
          row('#1 (เก่า) ตอนเปิดหน้า', 'หุบ (false) · ปุ่ม ขยายดู Timeline', `${e1} · ${label1}`, e1 === 'false' && label1 === 'ขยายดู Timeline'),
          row('#1 หลังกด', `กางแสดงครบ ${historyRowsEp1.length} event`, `${await k.toggle(ep1).getAttribute('aria-expanded')} · ${shown} แถว`, shown === historyRowsEp1.length),
        ], [expected(ep1.locator('ol').first(), '#1 กางแล้ว')], 'right');
      });

      await startClip(page, 'TC-019');
      await step(19, 'ขั้น 2 กด summary card ของ Episode #1', async () => {
        const [ep2, ep1] = [cprHistoryEpisodes(form).nth(0), cprHistoryEpisodes(form).nth(1)];
        await cprHistory(form).evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await page.waitForTimeout(500);
        const head = ep1.locator('.head');
        const before = Math.round((await ep1.boundingBox())?.y ?? -1);
        await markEvidence(clicked(head, 'การ์ด #1'));
        await snapEvidence(page, 'ก่อนกด — summary card #1');
        await head.click();
        await page.waitForTimeout(1_500);
        const after1 = Math.round((await ep1.locator('ol').first().boundingBox())?.y ?? -1);
        const after2 = Math.round((await ep2.locator('ol').first().boundingBox())?.y ?? -1);
        await verify('TC-019 กดการ์ดแล้วเลื่อนไป Timeline', [
          row('Timeline ของ #1 อยู่ในจอ', 'ใช่', after1 >= 0 && after1 < 1080 ? 'ใช่' : `y ${after1}`),
          row('หน้าเลื่อน (การ์ด #1 ก่อน → Timeline #1 หลัง)', 'เลื่อน', `${before} → ${after1}`, after1 < before),
          row('ไม่ใช่ Timeline ของ #2', 'ใช่', after2 < 0 || after2 < after1 ? 'ใช่' : `#2 y ${after2}`),
        ], [expected(ep1.locator('ol').first(), 'Timeline #1')], 'right');
      });

      await startClip(page, 'TC-020');
      await step(20, 'ขั้น 2 Episode #1 (จบแล้ว) ลองแก้ Comment ของ Cycle 1', async () => {
        const ep1 = cprHistoryEpisodes(form).nth(1);
        const edits = await ep1.getByRole('button', { name: 'แก้ไข', exact: true }).count();
        const target = ep1.locator('li.row').filter({ has: page.locator('strong', { hasText: /^Cycle 1$/ }) }).first();
        const edit = target.getByRole('button', { name: 'แก้ไข', exact: true });
        let saved = 'ไม่มีปุ่มแก้ไข';
        if (edits) {
          await target.scrollIntoViewIfNeeded();
          await markEvidence(expected(edit, `ปุ่มแก้ไข ${edits} ปุ่ม`));
          await snapEvidence(page, 'ก่อนกด — แก้ไข Cycle 1 ของ Episode #1');
          await edit.click();
          const dialog = form.getByRole('dialog');
          await expect(dialog).toBeVisible();
          const comment = dialog.locator('label', { hasText: 'Comment' }).locator('textarea');
          const reason = dialog.locator('label', { hasText: 'เหตุผลในการแก้ไข' }).locator('textarea');
          await comment.fill('แก้ไขโดย TC-020');
          await reason.fill('ทดสอบ SBH-2530 TC-020 ว่า Episode ที่จบแล้วแก้ไขได้หรือไม่');
          const submit = dialog.getByRole('button', { name: 'บันทึกการแก้ไข' });
          await markEvidence(filled(comment, 'แก้ Comment'), filled(reason, 'เหตุผล'), clicked(submit));
          await snapEvidence(page, 'ก่อนกด — บันทึกการแก้ไข');
          // การแก้ไขไม่ได้ส่งผ่าน contribution — จด request เขียนข้อมูลทุกตัวที่ส่งจริง แล้วตัดสินจากแถวบนหน้าจอ
          const writes: string[] = [];
          const onReq = (req: import('@playwright/test').Request) => {
            if (req.method() !== 'GET' && !/graphql|query\//.test(req.url())) writes.push(`${req.method()} ${req.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 110)}`);
          };
          page.on('request', onReq);
          await submit.click();
          await page.waitForTimeout(4_000);
          page.off('request', onReq);
          note('TC-020 request ที่ส่งตอนบันทึกการแก้ไข', writes.join(' · ') || '(ไม่มี)');
          const rowText = ((await target.textContent()) ?? '').replace(/\s+/g, ' ');
          const audit = rowText.match(/แก้ไขแล้ว[^แ]*?\d{2}:\d{2}:\d{2}/)?.[0] ?? '';
          saved = /แก้ไขโดย TC-020/.test(rowText) ? `บันทึกได้ (แถวแสดง Comment ใหม่${audit ? ` · ${audit}` : ''})` : 'บันทึกไม่ได้';
          if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'ยกเลิก' }).click();
          await target.scrollIntoViewIfNeeded();
        }
        await verify('TC-020 Episode ที่จบแล้วเป็น read-only', [
          row('ปุ่ม / ช่องแก้ไขของ Episode #1', 'ไม่มี (หรือแก้แล้วบันทึกไม่ได้)', edits ? `มีปุ่มแก้ไข ${edits} ปุ่ม` : 'ไม่มี', !edits || saved === 'บันทึกไม่ได้'),
          row('ผลการบันทึกการแก้ไข', 'บันทึกไม่ได้', saved, !edits || saved === 'บันทึกไม่ได้'),
        ], [expected(target, saved)], 'right');
      });

      await startClip(page, 'wait-A2');
      await checkStep(page, 'กลับหน้า CPR แล้วรอ countdown ของ Episode #2 ใกล้ 00:00 (ไม่บันทึก Cycle)', async () => {
        await hideCompareTable(page);
        await cprHistory(form).getByRole('button', { name: /กลับหน้า CPR/ }).click();
        await k.waitCountdown(8);
        await markEvidence(expected(countdown, 'ใกล้ครบกำหนด'));
      });

      await startClip(page, 'TC-055');
      await step(55, 'ขั้น 2–3 ไม่บันทึก Cycle รอ countdown เหลือ 00:00 > ดูการ์ด Cycle (+ ตรวจการเล่นเสียง)', async () => {
        await card.scrollIntoViewIfNeeded();
        await expect(card).toHaveClass(/overdue/, { timeout: 30_000 });
        const alert = card.getByRole('status');
        const audio = await page.evaluate(() => (window as unknown as { __cprAudio?: number }).__cprAudio ?? -1);
        const audioTags = await page.evaluate(() => document.querySelectorAll('audio').length);
        await verify('TC-055 ครบกำหนด', [
          row('countdown', '00:00', ((await countdown.textContent()) ?? '').trim()),
          row('สถานะบนการ์ด', 'ครบกำหนด Pulse/Rhythm check', ((await alert.textContent()) ?? '').trim()),
          row('เสียงแจ้งเตือน (play / oscillator / speech)', '0 ครั้ง', `${audio} ครั้ง · <audio> ${audioTags}`, audio === 0),
        ], [alerted(alert, 'ครบกำหนด'), expected(countdown, '00:00')], 'left');
      });

      await startClip(page, 'TC-056');
      await step(56, 'ขั้น 3 ดู CPR Timeline บน Episode Summary และหน้า History', async () => {
        await summary.scrollIntoViewIfNeeded();
        const rows = await k.rowsNow();
        const overdue = rows.find((r) => r.overdue);
        const li = summary.locator('li.row.overdue').first();
        const style = await li.evaluate((e) => ({ opacity: getComputedStyle(e).opacity, border: getComputedStyle(e).borderStyle + ' ' + getComputedStyle(e.querySelector('.body') ?? e).borderStyle, color: getComputedStyle(e).color })).catch(() => ({ opacity: '-', border: '-', color: '-' }));
        const label = ((await k.toggle(summary).textContent()) ?? '').trim();
        await markEvidence(expected(li, overdue?.name ?? 'ไม่มีแถวครบกำหนด'), expected(k.toggle(summary), label));
        await snapEvidence(page, 'หน้า CPR — แถวครบกำหนด');
        await k.historyLink.click();
        const ep2 = cprHistoryEpisodes(form).first();
        const hist = (await readCprRows(ep2)).find((r) => r.overdue);
        await verify('TC-056 Cycle ที่ครบกำหนดแต่ยังไม่บันทึก', [
          row('หน้า CPR: ป้าย', 'ครบกำหนด · ยังไม่บันทึก', overdue?.name ?? '-'),
          row('หน้า CPR: แถวจาง / เส้นประ', 'จาง / เส้นประ', `opacity ${style.opacity} · border ${style.border}`, true),
          row('ปุ่ม (ไม่นับแถวนี้)', 'CPR Timeline (1)', label),
          row('หน้า History: ป้าย', 'ครบกำหนด (ยังไม่บันทึก)', hist?.name ?? '-'),
        ], [expected(ep2.locator('li.row.overdue').first(), 'หน้า History')], 'right');
      });
      await k.backToCpr();

      await startClip(page, 'TC-034');
      await step(34, 'ขั้น 2 กด Stop CPR (Vital Signs หุบอยู่)', async () => {
        if ((await k.vitalToggle.getAttribute('aria-expanded')) === 'true') await k.vitalToggle.click();
        await timeChip(form, 'ตอนนี้').click();
        const stop = cprButton(form, 'Stop CPR');
        await markEvidence(expected(vitalBox(form), 'หุบอยู่'), clicked(stop));
        await snapEvidence(page, 'ก่อนกด — Stop CPR');
        await clickCprSave(page, form, stop, 'Stop CPR Episode #2');
        const box = vitalBox(form);
        const highlight = await expect(box).toHaveClass(/highlight/, { timeout: 1_500 }).then(() => 'มี', () => 'ไม่มี');
        await snapEvidence(page, 'หลังกด — Vital Signs กางเอง + highlight');
        const rect = await box.boundingBox();
        await verify('TC-034 หลัง Stop CPR', [
          row('Vital Signs กางเอง', 'true', String(await k.vitalToggle.getAttribute('aria-expanded'))),
          row('highlight', 'มี', highlight),
          row('เลื่อนมาที่ section (อยู่ในจอ)', 'ใช่', rect && rect.y >= 0 && rect.y < 1080 ? 'ใช่' : `ไม่ (y ${rect?.y})`),
        ], [expected(box, 'กางเอง')], 'left');
      });

      await startClip(page, 'TC-039');
      await step(39, 'ขั้น 2 ไม่กรอกค่า > กด ข้ามไปก่อน', async () => {
        const box = vitalBox(form);
        const skip = box.getByRole('button', { name: 'ข้ามไปก่อน', exact: true });
        await markEvidence(clicked(skip));
        await snapEvidence(page, 'ก่อนกด — ข้ามไปก่อน');
        await skip.click();
        await page.waitForTimeout(800);
        const badge = box.locator('.pending-badge');
        await verify('TC-039 ข้ามไปก่อน', [
          row('Section Vital Signs ยังแสดง', 'แสดง', (await box.isVisible()) ? 'แสดง' : 'หายไป'),
          row('badge', 'ยังไม่บันทึก', (await badge.isVisible()) ? ((await badge.textContent()) ?? '').trim() : '-'),
          row('ข้อความ', '(ข้อมูล)', ((await box.locator('.vital-hint').textContent().catch(() => '')) ?? '').trim() || '-', true),
        ], [expected(box, 'ยังแสดง'), expected(badge, 'ยังไม่บันทึก')], 'left');
      });

      await startClip(page, 'TC-041b');
      await step(41, 'ขั้น 2 หลัง Stop CPR: การ์ด CPR Episode Summary ยังอยู่ด้านบน', async () => {
        await form.evaluate((e) => e.scrollIntoView({ block: 'start' }));
        const ys = await Promise.all([summary, k.banner].map(async (l) => (await l.boundingBox())?.y ?? -1));
        await verify('TC-041 ตำแหน่งการ์ดสรุป (หลัง Stop CPR)', [
          row('การ์ด CPR Episode Summary', 'แสดง', (await summary.isVisible()) ? 'แสดง' : 'ไม่แสดง'),
          row('อยู่เหนือ banner / Post-CPR', 'ใช่', ys[0] >= 0 && ys[0] < ys[1] ? 'ใช่' : `y ${ys.join(' / ')}`),
        ], [expected(summary.getByRole('heading').first(), 'ด้านบน')], 'bottom');
      });
      await step(43, 'ขั้น 3 หลัง Stop CPR: Status pill = Terminal: Stop CPR สีเทา', async () => {
        const pill = summary.locator('.pill').first();
        const color = await pill.evaluate((e) => getComputedStyle(e).color);
        await verify('TC-043 Status pill หลัง Stop CPR', [
          row('ข้อความ', 'Terminal: Stop CPR', ((await pill.textContent()) ?? '').trim()),
          row('สี', 'เทา (tone-neutral)', `${(await pill.getAttribute('class')) ?? ''} · ${color}`, /tone-neutral/.test((await pill.getAttribute('class')) ?? '')),
        ], [expected(pill, 'Terminal: Stop CPR')], 'bottom');
      });

      await startClip(page, 'TC-037');
      let cprMews = '';
      await step(37, 'ขั้น 2–3 กรอก Vital Signs SBP 90 / DBP 60 · PR 120 · RR 24 · Temp 38.5 · SpO₂ 92 · AVPU V > ดู MEWS', async () => {
        if ((await k.vitalToggle.getAttribute('aria-expanded')) !== 'true') await k.vitalToggle.click();
        const round = await k.fillVitals(0, { ...MEWS_VITALS, avpu: 'V' });
        const mews = round.locator('.mews-badge');
        await expect(mews).toContainText(/MEWS \d+/);
        cprMews = ((await mews.textContent()) ?? '').trim();
        await markEvidence(filled(round, 'ค่าชุด TC-037'), expected(mews, cprMews));
        await snapEvidence(page, 'MEWS ในฟอร์ม CPR');
      });
      await step(37, 'ขั้น 4 กรอกค่าชุดเดียวกันในฟอร์มคัดกรองซ้ำ (ไม่บันทึก) แล้วเทียบ MEWS', async () => {
        const main = k.main;
        // ออกจากฟอร์ม CPR (ไม่บันทึก Vital Signs) → หน้า Overview ของ Visit
        await gotoVisit(page, visit);
        const redo = main.getByRole('button', { name: 'redo คัดกรองซ้ำ' });
        await expect(redo).toBeVisible({ timeout: 90_000 });
        await redo.scrollIntoViewIfNeeded();
        await redo.click();
        const panel = erTriagePanel(page);
        await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first()).toBeVisible({ timeout: 90_000 });
        const pairs: [string, string][] = [['Systolic', MEWS_VITALS.systolic], ['Diastolic', MEWS_VITALS.diastolic], ['PR', MEWS_VITALS.pr], ['RR', MEWS_VITALS.rr], ['Temp', MEWS_VITALS.temp], ['SpO2', MEWS_VITALS.spo2]];
        for (const [name, value] of pairs) await panel.getByRole('spinbutton', { name }).first().fill(value);
        const avpu = panel.locator('select[data-mews-avpu]').first();
        await avpu.selectOption({ label: 'V(1)' });
        // MEWS คำนวณจาก "ชุดข้อมูลสัญญาณชีพ" ที่เลือก — บางรอบยังค้าง "เลือกชุดข้อมูล" (ฉบับร่างยังไม่ถูกเลือก) → เลือกฉบับร่างที่เพิ่งกรอก
        const round = panel.locator('select').filter({ has: page.locator('option', { hasText: /ฉบับร่าง|Draft|Select a round/ }) }).first();
        await expect.poll(async () => (await round.locator('option').allTextContents()).some((t) => /ฉบับร่าง|Draft/.test(t)), { timeout: 30_000 }).toBe(true);
        const draft = (await round.locator('option').allTextContents()).find((t) => /ฉบับร่าง|Draft/.test(t));
        if (draft && !(await round.evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.textContent ?? '')).match(/ฉบับร่าง|Draft/)) await round.selectOption({ label: draft });
        const result = panel.getByText(/^MEWS = \d+/).first().locator('..');
        await expect(result).toContainText(/MEWS = \d+/, { timeout: 30_000 });
        await page.waitForTimeout(1_500);
        const triageMews = ((await result.textContent()) ?? '').replace(/\s+/g, ' ').trim();
        const a = cprMews.match(/MEWS (\d+)/)?.[1] ?? '-';
        const b = triageMews.match(/MEWS = (\d+)/)?.[1] ?? '-';
        await result.scrollIntoViewIfNeeded();
        await verify('TC-037 MEWS ฟอร์ม CPR (Expected) vs ฟอร์มคัดกรอง (ผลจริง)', [
          row('MEWS', `${a} (ฟอร์ม CPR: ${cprMews})`, `${b} (ฟอร์มคัดกรอง: ${triageMews})`, a === b && a !== '-'),
        ], [filled(avpu, 'AVPU V'), expected(result, triageMews)], 'right');
        // ไม่บันทึกคัดกรองซ้ำ — ไม่กดกลับในขั้นนี้ (ภาพ "ผ่าน" ต้องเห็นฟอร์มคัดกรองซ้ำ) · ท้ายเทสปิด Visit ที่การเงิน
      });

      note('ข้อมูลที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en} · Start CPR ${startStamp} · ROSC ${roscStamp} · Cycle ${JSON.stringify(cycleTimes)}`);
      finish();
    },
  );

  test(
    'B ผู้ป่วย AUTO ใหม่: chip เวลา + validation เวลา · ROSC + Vital 2 รอบ · Episode ยา ×3 · บันทึกก่อนครบ 2 นาที + ขอบ +2 นาที (Super_User = user1)',
    { tag: ['@SBH-2530', '@SBH-2530-B', ...TC_B.map((n) => `@${ISSUE[n]}`)], annotation: [linear('SBH-2530'), ...TC_B.map((n) => linear(ISSUE[n]))] },
    async ({ page }) => {
      const { note, soft, finish } = makeRunner(page);
      const k = cprKit(page, soft);
      const { form, summary, card, countdown, progress, step, verify } = k;
      const visit = await k.newPatient('B', note);
      let start = '';
      let chosen = '';
      const timeError = card.locator('.field-error');

      await startClip(page, 'TC-004');
      await step(4, 'ขั้น 1–3 Start CPR > กด chip ตอนนี้ > ดูช่องวันที่และเวลาบันทึก', async () => {
        await k.rhythm('PEA').click();
        start = fullStamp(await form.locator('input[type="datetime-local"]').first().inputValue());
        await clickCprSave(page, form, cprButton(form, 'Start CPR'), 'Start CPR');
        const now = timeChip(form, 'ตอนนี้');
        await now.click();
        const pressed = await browserStamp(page);
        const value = fullStamp(await cycleTimeInput(form).inputValue());
        const diff = Math.abs(clockSeconds(stampClock(value)) - clockSeconds(stampClock(pressed)));
        await verify('TC-004 chip ตอนนี้', [
          row('วันที่และเวลาบันทึก = เวลาที่กด (±2 วิ)', pressed.replace('T', ' '), value.replace('T', ' '), diff <= 2),
          row('chip ที่ highlight', 'ตอนนี้', (await now.getAttribute('aria-pressed')) === 'true' ? 'ตอนนี้' : '-'),
          row('+2 นาที (Default)', 'ไม่ highlight', (await timeChip(form, 'default').getAttribute('aria-pressed')) === 'true' ? 'highlight' : 'ไม่ highlight'),
        ], [clicked(now, 'ตอนนี้'), expected(cycleTimeInput(form), 'เวลาปัจจุบัน')], 'left');
      });

      await startClip(page, 'wait-B1');
      await checkStep(page, 'รอ 1 นาทีหลัง Start CPR (countdown ≤ 01:00)', async () => {
        await hideCompareTable(page);
        await k.waitCountdown(60);
        await markEvidence(expected(countdown, '≤ 01:00'));
      });

      await startClip(page, 'TC-050');
      await step(50, 'ขั้น 2–3 แก้เวลาเอง = เวลา Start CPR − 1 นาที > กด บันทึก Cycle', async () => {
        const before = events(await k.rowsNow()).length;
        await timeChip(form, 'แก้เวลาเอง').click();
        const value = shiftStamp(start, -60);
        await fillStamp(cycleTimeInput(form), value);
        await markEvidence(filled(cycleTimeInput(form), `${stampClock(value)} (Start − 1 นาที)`), clicked(cprButton(form, 'Save CPR Progress')));
        await snapEvidence(page, 'ก่อนกด — บันทึก Cycle (เวลาย้อนหลัง)');
        const saves = await countCprSaves(page, () => cprButton(form, 'Save CPR Progress').click());
        await card.scrollIntoViewIfNeeded();
        await verify('TC-050 เวลาก่อน event ก่อนหน้า', [
          row('inline error ที่ช่องเวลา', 'เวลาที่บันทึกต้องไม่ย้อนหลังกว่า event ก่อนหน้า', ((await timeError.first().textContent().catch(() => '-')) ?? '-').trim()),
          row('ช่องเวลา (aria-invalid)', 'true', String(await cycleTimeInput(form).getAttribute('aria-invalid'))),
          row('คำสั่งบันทึกที่ส่ง', '0', String(saves)),
          row('แถวบน Timeline (ไม่มีแถวใหม่)', String(before), String(events(await k.rowsNow()).length)),
        ], [alerted(timeError.first()), expected(cycleTimeInput(form), 'ย้อนหลัง')], 'left');
      });

      await startClip(page, 'TC-051');
      await step(51, 'ขั้น 2–3 แก้เวลาเอง = เวลาปัจจุบัน + 3 นาที > กด บันทึก Cycle', async () => {
        const before = events(await k.rowsNow()).length;
        const value = await browserStamp(page, 180_000);
        await fillStamp(cycleTimeInput(form), value);
        await markEvidence(filled(cycleTimeInput(form), `${stampClock(value)} (ปัจจุบัน + 3 นาที)`), clicked(cprButton(form, 'Save CPR Progress')));
        await snapEvidence(page, 'ก่อนกด — บันทึก Cycle (+3 นาที)');
        const saves = await countCprSaves(page, () => cprButton(form, 'Save CPR Progress').click());
        await card.scrollIntoViewIfNeeded();
        await verify('TC-051 เวลาเกินปัจจุบัน 2 นาที', [
          row('inline error ที่ช่องเวลา', 'เวลาที่บันทึกต้องไม่เกินเวลาปัจจุบันเกิน 2 นาที', ((await timeError.first().textContent().catch(() => '-')) ?? '-').trim()),
          row('คำสั่งบันทึกที่ส่ง', '0', String(saves)),
          row('แถวบน Timeline', String(before), String(events(await k.rowsNow()).length)),
        ], [alerted(timeError.first()), expected(cycleTimeInput(form), '+3 นาที')], 'left');
      });

      await startClip(page, 'TC-005');
      await step(5, 'ขั้น 2–3 กด chip แก้เวลาเอง > เลือกเวลา = เวลาปัจจุบัน − 30 วินาที', async () => {
        await timeChip(form, 'default').click();
        const input = cycleTimeInput(form);
        const readonlyBefore = (await input.getAttribute('readonly')) !== null;
        const manual = timeChip(form, 'แก้เวลาเอง');
        await markEvidence(clicked(manual), expected(input, readonlyBefore ? 'ก่อนกด: แก้ไม่ได้ (readonly)' : 'ก่อนกด'));
        await snapEvidence(page, 'ก่อนกด — แก้เวลาเอง');
        await manual.click();
        const focused = await page.evaluate(() => {
          let a: Element | null = document.activeElement;
          while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
          return a ? `${a.tagName.toLowerCase()}${a.getAttribute('type') ? `[${a.getAttribute('type')}]` : ''} ${a.textContent?.trim().slice(0, 20) ?? ''}` : '-';
        });
        const readonlyAfter = (await input.getAttribute('readonly')) !== null;
        chosen = await browserStamp(page, -30_000);
        if (chosen < start) chosen = shiftStamp(start, 1);
        await fillStamp(input, chosen);
        await verify('TC-005 แก้เวลาเอง', [
          row('กดแล้วเปิด datetime picker', 'เปิด picker', readonlyAfter ? 'ช่องยัง readonly' : `ช่องแก้ได้ (เลิก readonly) · picker ไม่เปิดเอง · focus อยู่ที่ ${focused}`, !readonlyAfter),
          row('chip ที่ highlight', 'แก้เวลาเอง', (await manual.getAttribute('aria-pressed')) === 'true' ? 'แก้เวลาเอง' : '-'),
          row('วันที่และเวลาบันทึก = เวลาที่เลือก', chosen.replace('T', ' '), fullStamp(await input.inputValue()).replace('T', ' ')),
          row('ไม่มี error', '(ไม่มี)', ((await timeError.first().textContent().catch(() => '')) ?? '').trim() || '(ไม่มี)'),
        ], [clicked(manual, 'highlight'), filled(input, `${stampClock(chosen)} (ปัจจุบัน − 30 วิ)`)], 'left');
      });

      await startClip(page, 'TC-006');
      await step(6, 'ขั้น 2–3 กด บันทึก Cycle > ดูแถว Cycle บน CPR Timeline', async () => {
        const clickedAt = await browserStamp(page);
        await clickCprSave(page, form, cprButton(form, 'Save CPR Progress'), 'บันทึก Cycle (เวลาที่เลือกเอง)');
        const r = events(await k.rowsNow()).find((x) => x.name === 'Cycle 1');
        await k.summaryRow('Cycle 1').scrollIntoViewIfNeeded();
        await verify('TC-006 เวลาของ Cycle ที่บันทึก', [
          row('บันทึกสำเร็จ', 'มีแถว Cycle 1', r ? 'มีแถว Cycle 1' : 'ไม่มี'),
          row('เวลาจริงของแถว = เวลาที่เลือก', stampClock(chosen), r?.time ?? '-'),
          row('ไม่ใช่เวลาที่กดบันทึก', `≠ ${stampClock(clickedAt)}`, r?.time ?? '-', r?.time !== stampClock(clickedAt)),
        ], [expected(k.summaryRow('Cycle 1').locator('.when'), stampClock(chosen))], 'right');
      });

      await startClip(page, 'TC-038');
      let payload = '';
      await step(38, 'ขั้น 1–2 กด ROSC > กรอก Vital Signs รอบที่ 1 > + เพิ่มรอบวัด > กรอกรอบที่ 2 > บันทึก', async () => {
        await k.markSelect.selectOption({ label: 'ROSC' });
        await timeChip(form, 'ตอนนี้').click();
        await clickCprSave(page, form, form.getByRole('button', { name: 'บันทึก ROSC', exact: true }), 'บันทึก ROSC');
        const box = vitalBox(form);
        await k.fillVitals(0, { systolic: '120', diastolic: '80', pr: '88', rr: '18', temp: '37', spo2: '98' });
        const add = box.getByRole('button', { name: '+ เพิ่มรอบวัด' });
        await add.click();
        const second = await k.fillVitals(1, { systolic: '104', diastolic: '66', pr: '112', rr: '22', temp: '37.6', spo2: '95' });
        await k.freshTime('post', note);
        await second.scrollIntoViewIfNeeded();
        await markEvidence(filled(box.locator('.vital-round').nth(0), 'รอบที่ 1'), filled(second, 'รอบที่ 2'), clicked(k.postSave));
        await snapEvidence(page, 'ก่อนกด — บันทึก Vital Signs 2 รอบ');
        const sent = await clickCprSave(page, form, k.postSave, 'บันทึก Post-CPR update (Vital 2 รอบ)');
        payload = sent.filter((s) => s.template.startsWith('vital_signs')).map((s) => s.body).join('\n');
        test.info().attachments.push({ name: 'TC-038 payload Vital Signs ที่ส่งบันทึก', contentType: 'application/json', body: Buffer.from(payload || '{}') });
        const snapshot = form.locator('section[aria-label="Saved CPR event"]');
        await snapshot.scrollIntoViewIfNeeded();
        const has = (v: string) => new RegExp(`(?<![\\d.])${v.replace('.', '\\.')}(?![\\d.])`).test(payload);
        await verify('TC-038 Vital Signs 2 รอบ', [
          row('มีรอบวัดที่ 2 เพิ่มขึ้น', 'ใช่', 'ใช่'),
          row('แถบบันทึกแล้ว', '2 vital rounds', ((await snapshot.textContent()) ?? '').match(/\d+ vital rounds?/)?.[0] ?? '-'),
          row('payload มีค่ารอบที่ 1 (SBP 120 · PR 88)', 'มี', has('120') && has('88') ? 'มี' : 'ไม่พบ'),
          row('payload มีค่ารอบที่ 2 (SBP 104 · PR 112)', 'มี', has('104') && has('112') ? 'มี' : 'ไม่พบ'),
        ], [expected(snapshot, '2 vital rounds')], 'bottom');
      });

      // ---------- Episode #2: ยา Adrenaline ทุก Cycle ----------
      await startClip(page, 'TC-024');
      await step(24, 'ขั้น 1 Start CPR > บันทึก 3 Cycle ติ๊ก Adrenaline 1:10,000 (1 mg · IV) ทุก Cycle · Cycle 2 เพิ่ม Amiodarone', async () => {
        await k.freshTime('restart', note);
        await clickCprSave(page, form, k.restartButton, 'Start CPR Episode #2');
        for (const n of [1, 2, 3]) {
          await page.waitForTimeout(1_500);
          const ad = drugFields(form, 'Adrenaline 1:10,000');
          await ad.check.check();
          await ad.dose.fill('1 mg');
          if (n === 2) {
            const am = drugFields(form, 'Amiodarone');
            await am.check.check();
            await am.dose.fill('300 mg');
          }
          if (n === 2) {
            await markEvidence(filled(ad.row, 'Adrenaline 1 mg IV'), filled(drugFields(form, 'Amiodarone').row, 'Amiodarone'), clicked(cprButton(form, 'Save CPR Progress')));
            await snapEvidence(page, 'ก่อนกด — Cycle 2 (Adrenaline + Amiodarone)');
          }
          await k.saveCycle('ตอนนี้', `บันทึก Cycle ${n} ของ Episode #2`);
        }
        await page.waitForTimeout(1_500);
        await timeChip(form, 'ตอนนี้').click();
        await clickCprSave(page, form, cprButton(form, 'Stop CPR'), 'Stop CPR Episode #2');
      });
      await step(24, 'ขั้น 2 เปิดหน้า History > ดู Header ของ Episode นี้', async () => {
        await k.historyLink.click();
        const ep = cprHistoryEpisodes(form).first();
        const head = ep.locator('.head');
        const text = ((await head.textContent()) ?? '').replace(/\s+/g, ' ');
        const drugsLine = text.match(/ยาที่ให้:[^]*?(?=$|CPR Timeline)/)?.[0]?.trim() ?? '-';
        await verify('TC-024 สรุปยารวมของ Episode', [
          row('Episode', 'Episode #2 · กู้ชีพซ้ำ', ((await ep.locator('h3').textContent()) ?? '').trim()),
          row('Adrenaline 1:10,000', '×3', /Adrenaline 1:10,000 ×3/.test(text) ? '×3' : drugsLine),
          row('Amiodarone', '×1', /Amiodarone ×1/.test(text) ? '×1' : drugsLine),
        ], [expected(head.getByText(/ยาที่ให้/), 'สรุปยารวม')], 'bottom');
      });
      await k.backToCpr();

      // ---------- Episode #3: บันทึกก่อนครบ 2 นาทีด้วยค่าตั้งต้น (TC-007) + ขอบ +2 นาที (TC-054) ----------
      await startClip(page, 'wait-B2');
      await checkStep(page, 'Start CPR (Episode #3) > รอ countdown เหลือประมาณ 01:00', async () => {
        await hideCompareTable(page);
        await k.freshTime('restart', note);
        await clickCprSave(page, form, k.restartButton, 'Start CPR Episode #3');
        await k.waitCountdown(62);
        await markEvidence(expected(countdown, '≈ 01:00'));
      });

      await startClip(page, 'TC-007');
      await step(7, 'ขั้น 2–3 countdown ≈ 01:00 > กด บันทึก Cycle (chip ค่าตั้งต้น) > ดูการ์ด Cycle ทันที', async () => {
        const before = ((await countdown.textContent()) ?? '').trim();
        await markEvidence(expected(countdown, `ก่อนบันทึก ${before}`), clicked(cprButton(form, 'Save CPR Progress')));
        await snapEvidence(page, 'ก่อนกด — บันทึก Cycle 1 (countdown ≈ 01:00)');
        const time = await k.saveCycle('default', 'บันทึก Cycle 1 ของ Episode #3');
        const c1 = ((await countdown.textContent()) ?? '').trim();
        const p1 = Number(await progress.getAttribute('aria-valuenow'));
        await page.waitForTimeout(3_000);
        const c2 = ((await countdown.textContent()) ?? '').trim();
        note('TC-007 เวลา', `countdown ก่อนบันทึก ${before} · เวลา Cycle ที่บันทึก (ค่าตั้งต้น) ${stampClock(time)} · หลังบันทึก ${c1} → ${c2} · progress ${p1}%`);
        await verify('TC-007 countdown หลังบันทึก Cycle', [
          row('หัวการ์ด', 'Cycle 2', ((await card.getByRole('heading').first().textContent()) ?? '').trim()),
          row('countdown เริ่มใหม่', '02:00', c1, clockSeconds(c1) >= 115 && clockSeconds(c1) <= 120),
          row('นับถอยหลังทันที (3 วิ)', 'ลดลง', `${c1} → ${c2}`, clockSeconds(c2) < clockSeconds(c1)),
          row('progress bar เริ่มใหม่', '≈ 0%', `${p1}%`, p1 <= 5),
        ], [expected(card.locator('.cycle-head'), `Cycle 2 · countdown ${c2}`)], 'left');
      });

      await startClip(page, 'TC-054');
      await step(54, 'ขั้น 2–3 แก้เวลาเอง = เวลาปัจจุบัน + 2 นาที > กด บันทึก Cycle ทันที', async () => {
        await timeChip(form, 'แก้เวลาเอง').click();
        const value = await browserStamp(page, 120_000);
        await fillStamp(cycleTimeInput(form), value);
        const error = ((await timeError.first().textContent().catch(() => '')) ?? '').trim();
        await markEvidence(filled(cycleTimeInput(form), `${stampClock(value)} (ปัจจุบัน + 2 นาที)`), clicked(cprButton(form, 'Save CPR Progress')));
        await snapEvidence(page, 'ก่อนกด — บันทึก Cycle (+2 นาทีพอดี)');
        await clickCprSave(page, form, cprButton(form, 'Save CPR Progress'), 'บันทึก Cycle (+2 นาทีพอดี)');
        const r = events(await k.rowsNow()).find((x) => x.name === 'Cycle 2');
        await k.summaryRow('Cycle 2').scrollIntoViewIfNeeded();
        await verify('TC-054 ขอบ +2 นาที', [
          row('inline error ก่อนกดบันทึก', '(ไม่มี)', error || '(ไม่มี)'),
          row('บันทึกสำเร็จ · แถว Cycle 2', stampClock(value), r?.time ?? '-'),
        ], [expected(k.summaryRow('Cycle 2').locator('.when'), stampClock(value))], 'right');
      });

      note('ข้อมูลที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en} · Start CPR ${start} · เวลาที่เลือกเอง ${chosen}`);
      void summary;
      finish();
    },
  );
});
