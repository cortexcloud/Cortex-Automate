import type { Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, erTriageSaveButton, saveErTriageForm, type VitalSigns } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { gotoVisit } from '../../../mock-data/uat-play';

// SBH-1678 [ER][Triage] Trauma Form — ฟอร์มคัดกรอง ER รองรับผู้ป่วย Trauma (การจำแนกผู้ป่วย · ER Arrival · การดูแลระหว่างนำส่ง · GCS / MEWS / RTS · ชื่อโซนใหม่)
// ชุด EXE SBH-3273 → HPY SBH-3276 (TC-001–027) · UHP SBH-3278 (028–032) · EDG SBH-3279 (033–037) · ERR SBH-3280 (038–039) — เลข Issue ใน ISSUE ด้านล่าง
// 1 เทส = 1 flow (R9) · ผู้ป่วย AUTO ใหม่เทสละ 1 ราย (R10) · คลิป 1 ไฟล์ต่อ 1 TC (R61 — startClip) · TC ที่ไม่ผ่านไม่หยุดเทส (soft) แล้วเทสจบไม่ผ่านพร้อมรายการ
// คำตอบผู้ใช้ 29 ต.ค. 2026: รันครบ 39 TC ตาม Expected เดิม · RTS ที่ไม่ตรงสูตรในการ์ด = ไม่ผ่าน ·
//   ถ้อยคำต่างเล็กน้อย (รับ Refer · "3 - หน่วยบริการ…(EMS ขึ้นทะเบียน)" · "GCS 14 (E4V5M5) Mild") = ผ่าน + แก้ Expected ใน TC → เทสยอมรับถ้อยคำจริง
// หน้าจอ (dev-x 29 ต.ค. 2026 · index-DoL2cL_M.js): ฟอร์มอยู่ใน shadow DOM (getByRole / CSS ทะลุได้) · เลือก วิธีการมาถึง / ระดับ EMS / ผู้นำส่ง / ชื่อผู้นำส่ง
//   ถูกเก็บทันที (PATCH /er/encounters/<EN>/registration-details) · ช่องอื่นเก็บเป็นร่างจนกด บันทึก · MEWS คิดคะแนนเมื่อเลือก "ชุดข้อมูลสัญญาณชีพ" ·
//   ไม่เลือกระดับ = ปุ่มบันทึก disabled + tooltip · เลือกระดับแล้วระบบเลือกโซนแนะนำให้เสมอ (กดซ้ำไม่หลุด)
// หลังเทส: ปิด Visit ที่การเงิน (afterEach) · SBH1678_KEEP=1 = ไม่ปิด
// รัน (dev-x): npx playwright test --headed --grep @SBH-1678   (เทสเดียว: --grep "@SBH-3281" ฯลฯ)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ISSUE: Record<number, string> = {
  1: 'SBH-3281', 2: 'SBH-3282', 3: 'SBH-3283', 4: 'SBH-3285', 5: 'SBH-3286', 6: 'SBH-3287', 7: 'SBH-3288', 8: 'SBH-3289', 9: 'SBH-3290', 10: 'SBH-3291',
  11: 'SBH-3292', 12: 'SBH-3293', 13: 'SBH-3294', 14: 'SBH-3295', 15: 'SBH-3296', 16: 'SBH-3297', 17: 'SBH-3298', 18: 'SBH-3299', 19: 'SBH-3300', 20: 'SBH-3301',
  21: 'SBH-3302', 22: 'SBH-3303', 23: 'SBH-3304', 24: 'SBH-3305', 25: 'SBH-3306', 26: 'SBH-3307', 27: 'SBH-3308', 28: 'SBH-3309', 29: 'SBH-3310', 30: 'SBH-3311',
  31: 'SBH-3312', 32: 'SBH-3313', 33: 'SBH-3314', 34: 'SBH-3315', 35: 'SBH-3316', 36: 'SBH-3317', 37: 'SBH-3318', 38: 'SBH-3319', 39: 'SBH-3320',
};
const tcId = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const TC = (n: number) => `${tcId(n)} (${ISSUE[n]})`;
const meta = (...tcs: number[]) => ({ tag: ['@SBH-1678', ...tcs.map((n) => `@${ISSUE[n]}`)], annotation: [linear('SBH-1678'), ...tcs.map((n) => linear(ISSUE[n]))] });

const PLACEHOLDER_PREHOSPITAL = 'รายละเอียด EMS/ส่งต่อ สัญญาณชีพระหว่างนำส่ง, โรงพยาบาลต้นทาง';
const ZONES_NEW = ['Resuscitation', 'Urgency', 'Isolation 1', 'Isolation 2', 'Observation'];
const ZONES_OLD = ['โซนแดง', 'โซนเหลือง', 'โซนเขียว', 'ห้องสังเกตอาการ'];
const TRIAGE_SAVED = 'กรอกข้อมูล คัดกรอง ER สำเร็จ';
const VITALS_TC: VitalSigns = { systolic: '120', diastolic: '80', pr: '80', rr: '16', temp: '37', spo2: '98', painScore: '0' };
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const yes = (b: boolean) => (b ? 'มี' : 'ไม่มี');

/** locator ของฟอร์มคัดกรอง ER (แผงที่ทำงานอยู่) */
function form(page: Page) {
  const panel = erTriagePanel(page);
  const arrival = panel.getByRole('region', { name: 'ER Arrival' });
  const cardWith = (inner: Locator) => panel.locator('div').filter({ has: inner }).filter({ has: page.getByRole('status') }).last();
  return {
    panel,
    arrival,
    fastTrack: panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first(),
    fastTrackLabel: panel.getByText(/^\*?\s*Suspect Fast Track Type$/).first(),
    emergency: panel.getByRole('radiogroup', { name: 'ประเภทฉุกเฉิน' }).first(),
    emergencyLabel: panel.getByText(/^\*?\s*ประเภทฉุกเฉิน/).first(),
    arrivalRadio: (name: string) => arrival.getByRole('radio', { name, exact: true }),
    escort: arrival.locator('.ant-select').first(),
    transporter: arrival.getByRole('textbox', { name: 'ระบุชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ' }),
    preHospital: arrival.getByRole('textbox', { name: /รายละเอียด EMS/ }),
    care: panel.getByText(/การดูแลระหว่างนำส่ง/),
    gcsSelect: (name: string) => panel.getByRole('combobox', { name }).first(),
    gcsCard: cardWith(page.getByRole('combobox', { name: 'Eye Opening (E)' })),
    mewsCard: cardWith(page.getByRole('combobox', { name: 'AVPU' })),
    avpu: panel.getByRole('combobox', { name: 'AVPU' }).first(),
    rtsCard: panel.locator('div').filter({ has: page.getByText('Revised Trauma Score (RTS)', { exact: true }) }).filter({ hasText: /RTS =|Incomplete|Points|Complete/ }).last(),
    levels: panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }).first(),
    zones: panel.locator('[class*="er-triage-zone-options"] button'),
    zoneArea: panel.locator('[class*="er-triage-zone-options"]').first(),
    save: erTriageSaveButton(page),
  };
}
type Form = ReturnType<typeof form>;

/** มีเครื่องหมาย * กำกับป้ายไหม (ตัวอักษร * หรือ ::before / ::after ของป้ายหรือพี่น้อง) */
async function hasRequiredMark(label: Locator): Promise<boolean> {
  return label.evaluate((el) => {
    const nodes = [el, ...(el.parentElement ? Array.from(el.parentElement.children) : [])];
    return nodes.some((n) => {
      const before = getComputedStyle(n, '::before').content;
      const after = getComputedStyle(n, '::after').content;
      return (n.textContent ?? '').trim() === '*' || before.includes('*') || after.includes('*') || (n.textContent ?? '').trim().startsWith('*');
    });
  });
}

/** ตัวเลือกที่ถูกเลือกของ <select> */
const selectedText = (select: Locator) => select.evaluate((el) => {
  const s = el as HTMLSelectElement;
  return s.options[s.selectedIndex]?.text ?? '';
});

/** สีพื้นของกล่องผล (ไล่ขึ้นหาพื้นที่ไม่โปร่งใส) → เขียว / เทา / อื่น */
async function toneOf(target: Locator): Promise<string> {
  const rgb = await target.evaluate((el) => {
    let n: Element | null = el;
    while (n) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba?\(0, 0, 0, 0\)|transparent/.test(bg) && bg !== 'rgb(255, 255, 255)') return bg;
      n = n.parentElement;
    }
    return '';
  });
  const m = rgb.match(/(\d+), (\d+), (\d+)/);
  if (!m) return `(ไม่พบสีพื้น ${rgb})`;
  const [r, g, b] = m.slice(1).map(Number);
  if (Math.max(r, g, b) - Math.min(r, g, b) < 12) return `เทา (${rgb})`;
  if (g > r && g > b) return `เขียว (${rgb})`;
  return `อื่น (${rgb})`;
}

async function pickGcs(f: Form, e: number, v: number, m: number) {
  for (const [name, score] of [['Eye Opening (E)', e], ['Verbal Response (V)', v], ['Motor Response (M)', m]] as const) {
    const select = f.gcsSelect(name);
    const label = (await select.locator('option').allTextContents()).find((t) => t.startsWith(`${score} `));
    if (!label) throw new Error(`ไม่เจอตัวเลือก GCS ${name} คะแนน ${score}`);
    await select.selectOption({ label });
  }
}

async function fillVitals(f: Form, v: Partial<VitalSigns>) {
  const map: [string, string | undefined][] = [['Systolic', v.systolic], ['Diastolic', v.diastolic], ['PR', v.pr], ['RR', v.rr], ['Temp', v.temp], ['SpO2', v.spo2]];
  for (const [name, value] of map) if (value !== undefined) await f.panel.getByRole('spinbutton', { name }).first().fill(value);
}

/** ช่องค้นหาโรคในส่วน Underlying Disease + ปุ่มบันทึกของส่วนนั้น */
function underlying(page: Page) {
  const section = page.getByRole('main').getByRole('heading', { name: /Underlying Disease/ }).first().locator('xpath=ancestor::div[.//table][1]');
  return { section, input: section.getByRole('combobox').first(), save: section.getByRole('button', { name: /บันทึก/ }).first(), table: section.locator('table') };
}

/** การ์ดผู้ป่วยบน ER Dashboard (หลังคัดกรอง) */
const boardCard = (page: Page, hn: string) => page.getByRole('main').locator('div').filter({ has: page.getByText(`HN: ${hn}`, { exact: true }) }).filter({ hasText: /รอ/ }).last();

test.describe('SBH-1678 ฟอร์มคัดกรอง ER แบบ Trauma (dev-x)', () => {
  test.describe.configure({ timeout: 1_500_000 });

  let opened: Map<string, ErVisit>;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page).catch(() => undefined);
    if (process.env.SBH1678_KEEP) return;
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  /** ผู้ป่วย AUTO ใหม่ → เปิด Visit ER → ฟอร์มคัดกรอง ER พร้อม (env SBH1678_<key>=HN,VN,EN = ใช้รายเดิม) */
  async function preparePatient(page: Page, key: string, note: (t: string, d: string) => void): Promise<ErVisit> {
    const reuse = process.env[`SBH1678_${key}`]?.split(',');
    let visit: ErVisit;
    if (reuse?.length === 3) {
      visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
      await gotoVisit(page, visit);
    } else {
      visit = await checkStep(page, `เตรียมข้อมูล: ผู้ป่วย AUTO ใหม่ (${key}) + เปิด Visit ER`, async () => {
        await gotoErDashboard(page);
        const patient = newTestPatient(`Trauma${key}`);
        const v = await registerAndOpenErVisit(page, patient);
        note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${v.hn} · ${v.vn} · ${v.en} · ใช้ซ้ำ: SBH1678_${key}=${v.hn},${v.vn},${v.en}`);
        return v;
      });
    }
    await waitFormReady(page, visit, note);
    await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
    return visit;
  }

  /**
   * รอฟอร์มคัดกรองโหลดครบ (สัญญาณชีพ + GCS + ระดับความเร่งด่วน)
   * dev-x 29 ต.ค. 2026: บางรอบส่วนย่อยขึ้น "ไม่สามารถแสดงฟอร์มได้ · ดาวน์โหลดอีกครั้ง" → กดดาวน์โหลดอีกครั้ง / โหลดหน้าใหม่ (ไม่เกิน 4 รอบ)
   */
  async function waitFormReady(page: Page, visit: ErVisit, note: (t: string, d: string) => void) {
    const main = page.getByRole('main');
    for (let attempt = 1; attempt <= 4; attempt++) {
      const ready = await expect(form(page).panel.getByRole('combobox', { name: 'Eye Opening (E)' }).first())
        .toBeVisible({ timeout: 60_000 })
        .then(() => true, () => false);
      if (ready && (await main.getByText('ไม่สามารถแสดงฟอร์มได้').count()) === 0) return;
      const retry = main.getByRole('button', { name: /ดาวน์โหลดอีกครั้ง/ });
      note('ฟอร์มโหลดไม่ครบ', `รอบ ${attempt}: ${await retry.count()} ส่วนขึ้น "ไม่สามารถแสดงฟอร์มได้" → ${(await retry.count()) ? 'กดดาวน์โหลดอีกครั้ง' : 'โหลดหน้าใหม่'}`);
      if (await retry.count()) {
        for (const button of await retry.all()) await button.click().catch(() => undefined);
        await page.waitForTimeout(5_000);
      } else {
        await gotoVisit(page, visit);
      }
    }
    throw new Error('ฟอร์มคัดกรอง ER โหลดไม่ครบหลังลอง 4 รอบ (ไม่สามารถแสดงฟอร์มได้)');
  }

  /** เลือกระดับ (+ โซน) แล้วบันทึกคัดกรอง → แจ้งเตือนสำเร็จ → หน้า Overview */
  async function saveTriage(page: Page, f: Form, what: string, zone?: string) {
    await f.levels.scrollIntoViewIfNeeded();
    await f.levels.getByText('3', { exact: true }).click();
    if (zone) await f.zones.filter({ hasText: zone }).first().click();
    const pressed = f.zones.and(page.locator('[aria-pressed="true"]'));
    await expect(pressed, 'ต้องมีโซนถูกเลือก').toHaveCount(1);
    if (zone) await expect(pressed).toContainText(zone);
    await markEvidence(filled(f.levels, 'ระดับ 3'), filled(pressed, `โซน ${norm(await pressed.locator('[class*="_name"]').innerText())}`), clicked(f.save));
    await snapEvidence(page, `ก่อนกด — บันทึก ${what}`);
    await saveErTriageForm(page, what);
    const toast = page.getByText(TRIAGE_SAVED, { exact: true }).first();
    await toast.waitFor({ state: 'visible', timeout: 30_000 });
    await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
    await markEvidence(alerted(toast));
    await snapEvidence(page, `หลังกด — บันทึก ${what}`);
    await expect(page.getByRole('main').getByText('Clinical Summary', { exact: true }), 'บันทึกแล้วหน้าต้องเปลี่ยนเป็น Overview').toBeVisible({ timeout: 60_000 });
  }

  /** ประวัติการคัดกรอง > ดู → ส่วน "ข้อมูลที่ผูกกับการประเมิน" */
  async function openSavedView(page: Page): Promise<Locator> {
    const main = page.getByRole('main');
    const hist = main.locator('div').filter({ has: page.getByText('ประวัติการคัดกรอง', { exact: true }) }).filter({ hasText: 'การคัดกรองครั้งแรก' }).last();
    await expect(hist, 'ต้องมีรายการคัดกรองครั้งแรกในประวัติการคัดกรอง').toBeVisible({ timeout: 60_000 });
    const view = hist.getByRole('button', { name: /ดู$/ }).first();
    await markEvidence(clicked(view, 'ดูผลคัดกรองที่บันทึก'));
    await snapEvidence(page, 'ก่อนกด — ดูผลคัดกรอง');
    await view.click();
    const area = main.locator('div').filter({ has: page.getByText('ข้อมูลที่ผูกกับการประเมิน', { exact: true }) }).last();
    await expect(area, 'ต้องเปิดหน้าดูผลคัดกรอง').toBeVisible({ timeout: 30_000 });
    return area;
  }

  // ------------------------------------------------------------------------------------------------
  test(
    'TC-001…008, 016, 018, 028–031: ช่องของฟอร์มตอนเปิด + ER Arrival (Walk-in / EMS / รับ Refer) — ไม่บันทึก (Super_User)',
    meta(1, 2, 3, 4, 5, 6, 7, 8, 16, 18, 28, 29, 30, 31),
    async ({ page }) => {
      const run = makeRunner(page);
      const { note, soft } = run;
      const visit = await preparePatient(page, 'A', note);
      const f = form(page);
      const compare = async (n: number, rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'right') =>
        showCompareTable(page, `${ISSUE[n]} ${tcId(n)}`, ['Expected', 'หน้าจอ'], rows, { side });
      const bad = (rows: CompareRow[]) => rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (Expected ${r.values[0]})`);
      note('ผู้ป่วยที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);

      // TC-001 Suspect Fast Track Type
      await startClip(page, tcId(1));
      await soft(`${TC(1)} ขั้น 3 ช่อง Suspect Fast Track Type: เครื่องหมาย * · ค่าเริ่มต้น · ตัวเลือก`, async () => {
        const options = (await f.fastTrack.locator('option').allTextContents()).map(norm);
        const expectedOptions = ['Not Suspect Fast Track', 'Stroke Fast Track', 'STEMI / ACS Fast Track', 'Sepsis Fast Track', 'Trauma Fast Track'];
        const star = await hasRequiredMark(f.fastTrackLabel);
        const current = norm(await selectedText(f.fastTrack));
        await f.fastTrack.click();
        const rows: CompareRow[] = [
          { label: 'เครื่องหมาย *', values: ['มี', yes(star)], same: star },
          { label: 'ค่าเริ่มต้น', values: ['Not Suspect Fast Track', current], same: current === 'Not Suspect Fast Track' },
          { label: 'จำนวนตัวเลือก', values: ['5', String(options.length)], same: options.length === 5 },
          ...expectedOptions.map((o, i) => ({ label: `ตัวเลือก ${i + 1}`, values: [o, options[i] ?? '(ไม่มี)'], same: options[i] === o })),
          ...options.slice(expectedOptions.length).map((o, i) => ({ label: `ตัวเลือกเกิน ${i + 1}`, values: ['(ไม่มี)', o], same: false })),
        ];
        note(`${TC(1)} ตัวเลือก`, options.join(' · '));
        await page.keyboard.press('Escape');
        await compare(1, rows);
        await markEvidence(expected(f.fastTrack, `ค่าเริ่มต้น ${current}`), expected(f.fastTrackLabel, `* ${yes(star)}`));
        expect(bad(rows), 'Expected: * · ค่าเริ่มต้น Not Suspect Fast Track · 5 ตัวเลือกตาม AC').toEqual([]);
      });

      // TC-002 ประเภทฉุกเฉิน
      await startClip(page, tcId(2));
      await soft(`${TC(2)} ขั้น 2 ช่องประเภทฉุกเฉิน: * · segmented 2 ตัวเลือก · ค่าเริ่มต้น Non-Trauma`, async () => {
        await hideCompareTable(page);
        const radios = (await f.emergency.getByRole('radio').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? (e as HTMLInputElement).value ?? ''))).map(norm);
        const names = await Promise.all(['Non-Trauma', 'Trauma'].map((n) => f.emergency.getByRole('radio', { name: n, exact: true }).count()));
        const nonChecked = await f.emergency.getByRole('radio', { name: 'Non-Trauma', exact: true }).isChecked();
        const star = await hasRequiredMark(f.emergencyLabel);
        const total = await f.emergency.getByRole('radio').count();
        const rows: CompareRow[] = [
          { label: 'เครื่องหมาย *', values: ['มี', yes(star)], same: star },
          { label: 'ตัวเลือก', values: ['Non-Trauma · Trauma (2)', `${['Non-Trauma', 'Trauma'].filter((_, i) => names[i]).join(' · ')} (${total})`], same: total === 2 && names.every(Boolean) },
          { label: 'ค่าเริ่มต้น', values: ['Non-Trauma', nonChecked ? 'Non-Trauma' : 'ไม่ใช่ Non-Trauma'], same: nonChecked },
        ];
        note(`${TC(2)} radio`, radios.join(' · '));
        await compare(2, rows);
        await markEvidence(expected(f.emergency, 'ค่าเริ่มต้น Non-Trauma'), expected(f.emergencyLabel, `* ${yes(star)}`));
        expect(bad(rows)).toEqual([]);
      });

      // TC-003 วิธีการมาถึง
      await startClip(page, tcId(3));
      await soft(`${TC(3)} ขั้น 2 วิธีการมาถึง: segmented 3 ตัวเลือก · ค่าเริ่มต้น Walk-in`, async () => {
        await hideCompareTable(page);
        const names = ['Walk-in', 'EMS', 'รับ Refer'];
        const counts = await Promise.all(names.map((n) => f.arrivalRadio(n).count()));
        const walk = await f.arrivalRadio('Walk-in').isChecked();
        const rows: CompareRow[] = [
          { label: 'ตัวเลือก', values: ['Walk-in · EMS · Refer (บนจอ: รับ Refer — ผู้ใช้ให้ถือว่าผ่าน)', names.filter((_, i) => counts[i]).join(' · ')], same: counts.every((c) => c === 1) },
          { label: 'ค่าเริ่มต้น', values: ['Walk-in', walk ? 'Walk-in' : 'ไม่ใช่ Walk-in'], same: walk },
        ];
        await compare(3, rows);
        await markEvidence(expected(f.arrival, 'วิธีการมาถึง: Walk-in · EMS · รับ Refer — ค่าเริ่มต้น Walk-in'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-004 ผู้นำส่ง
      await startClip(page, tcId(4));
      await soft(`${TC(4)} ขั้น 2 ผู้นำส่ง (Walk-in): ค่าว่าง + placeholder · dropdown 6 ตัวเลือก`, async () => {
        await hideCompareTable(page);
        const shown = norm(await f.escort.innerText());
        const isPlaceholder = (await f.escort.locator('[class*="placeholder"]').filter({ visible: true }).count()) > 0;
        const placeholder = isPlaceholder ? shown : '';
        const value = isPlaceholder ? '' : shown;
        await f.escort.click();
        const dropdown = page.locator('.ant-select-dropdown:visible').first();
        await expect(dropdown).toBeVisible();
        const options = (await dropdown.locator('.ant-select-item-option').allInnerTexts()).map(norm);
        const wanted = ['ไม่มีผู้นำส่ง/มาเอง', 'ตำรวจ/ทหาร', 'EMS ขึ้นทะเบียน', 'องค์กรไม่ขึ้นทะเบียน (มูลนิธิ/อาสา)', 'ญาติ/ผู้พบเห็น/อื่นๆ', 'ไม่ทราบ'];
        const key = (s: string) => s.replace(/\s/g, '').replace(/^[^-]+-/, '');
        const match = (w: string) => options.find((o) => key(o).includes(w.replace(/\s/g, '').replace('องค์กรไม่ขึ้นทะเบียน', 'องค์กรอื่นที่ไม่ขึ้นทะเบียน').replace('(มูลนิธิ/อาสา)', '(มูลนิธิ/อาสาสมัคร)')));
        const used = new Set<string>();
        const rows: CompareRow[] = [
          { label: 'ค่าเริ่มต้น', values: ['ว่าง · placeholder "เลือกผู้นำส่ง"', value ? `มีค่า ${value}` : `ว่าง · placeholder "${placeholder}"`], same: !value && placeholder === 'เลือกผู้นำส่ง' },
          { label: 'จำนวนตัวเลือก', values: ['6', String(options.length)], same: options.length === 6 },
          ...wanted.map((w) => {
            const m = match(w);
            if (m) used.add(m);
            return { label: 'ตัวเลือก', values: [w, m ?? '(ไม่มี)'], same: !!m };
          }),
        ];
        rows.push(...options.filter((o) => !used.has(o)).map((o) => ({ label: 'ตัวเลือกเกิน', values: ['(ไม่มีใน AC)', o], same: false })));
        note(`${TC(4)} ตัวเลือกผู้นำส่ง`, options.join(' · '));
        await compare(4, rows, 'right');
        await markEvidence(expected(f.escort, value ? value : `placeholder ${placeholder}`), expected(dropdown, `${options.length} ตัวเลือก`));
        expect(bad(rows), 'Expected: ผู้นำส่งว่าง + 6 ตัวเลือกตาม AC').toEqual([]);
      });
      await page.keyboard.press('Escape');

      // TC-030 Walk-in ไม่แสดงช่อง EMS
      await startClip(page, tcId(30));
      await soft(`${TC(30)} ขั้น 2–3 Walk-in: ไม่มีระดับความเร่งด่วน EMS / ข้อมูลก่อนถึงโรงพยาบาล`, async () => {
        await hideCompareTable(page);
        await expect(f.arrivalRadio('Walk-in')).toBeChecked();
        const ems = await f.arrival.getByRole('radio', { name: 'ALS', exact: true }).count();
        const pre = await f.preHospital.count();
        const escort = await f.escort.count();
        const tr = await f.transporter.count();
        const rows: CompareRow[] = [
          { label: 'ระดับความเร่งด่วน EMS', values: ['ไม่มี', yes(ems > 0)], same: ems === 0 },
          { label: 'ข้อมูลก่อนถึงโรงพยาบาล', values: ['ไม่มี', yes(pre > 0)], same: pre === 0 },
          { label: 'ผู้นำส่ง', values: ['มี', yes(escort > 0)], same: escort > 0 },
          { label: 'ชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ', values: ['มี', yes(tr > 0)], same: tr > 0 },
        ];
        await compare(30, rows);
        await markEvidence(expected(f.arrival, 'Walk-in: มีแค่ วิธีการมาถึง · ผู้นำส่ง · ชื่อผู้นำส่ง'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-028 Non-Trauma ไม่มีการดูแลระหว่างนำส่ง
      await startClip(page, tcId(28));
      await soft(`${TC(28)} ขั้น 2–3 Non-Trauma: ไม่มีหัวข้อ "การดูแลระหว่างนำส่ง" ใน ER Arrival`, async () => {
        await hideCompareTable(page);
        await expect(f.emergency.getByRole('radio', { name: 'Non-Trauma', exact: true })).toBeChecked();
        const care = await f.care.count();
        await compare(28, [{ label: 'การดูแลระหว่างนำส่ง', values: ['ไม่มี', yes(care > 0)], same: care === 0 }]);
        await markEvidence(expected(f.emergency, 'Non-Trauma'), expected(f.arrival, 'ไม่มีการดูแลระหว่างนำส่ง'));
        expect(care, 'Non-Trauma ต้องไม่มีหัวข้อการดูแลระหว่างนำส่ง').toBe(0);
      });

      // TC-029 Non-Trauma ไม่มีการ์ด RTS
      await startClip(page, tcId(29));
      await soft(`${TC(29)} ขั้น 2–3 Non-Trauma: score card ฝั่งขวามี GCS + MEWS ไม่มี RTS`, async () => {
        await hideCompareTable(page);
        const rts = await f.panel.getByText('Revised Trauma Score (RTS)', { exact: true }).count();
        const gcs = await f.gcsCard.count();
        const mews = await f.mewsCard.count();
        const rows: CompareRow[] = [
          { label: 'การ์ด RTS', values: ['ไม่มี', yes(rts > 0)], same: rts === 0 },
          { label: 'การ์ด GCS', values: ['มี', yes(gcs > 0)], same: gcs > 0 },
          { label: 'การ์ด MEWS', values: ['มี', yes(mews > 0)], same: mews > 0 },
        ];
        await compare(29, rows, 'left');
        await markEvidence(expected(f.gcsCard, 'GCS'), expected(f.mewsCard, 'MEWS · ไม่มี RTS'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-016 MEWS ไม่มีช่อง Vital sign
      await startClip(page, tcId(16));
      await soft(`${TC(16)} ขั้น 2 การ์ด MEWS: มีช่อง AVPU + แถบผล ไม่มีช่องกรอก Vital sign`, async () => {
        await hideCompareTable(page);
        const spins = await f.mewsCard.getByRole('spinbutton').count();
        const avpu = await f.mewsCard.getByRole('combobox', { name: 'AVPU' }).count();
        const status = await f.mewsCard.getByRole('status').count();
        const otherSelects = (await f.mewsCard.locator('select').count()) - avpu;
        const rows: CompareRow[] = [
          { label: 'ช่อง AVPU', values: ['มี', yes(avpu > 0)], same: avpu > 0 },
          { label: 'แถบผลคะแนน', values: ['มี', yes(status > 0)], same: status > 0 },
          { label: 'ช่องกรอก SBP / PR / RR / Temp', values: ['ไม่มี', spins ? `มี ${spins} ช่อง` : 'ไม่มี'], same: spins === 0 },
        ];
        note(`${TC(16)} การ์ด MEWS`, `ช่องเลือกอื่นนอกจาก AVPU ${otherSelects} ช่อง (ชุดข้อมูลสัญญาณชีพ / Vital signs round — เลือกชุดค่าที่ใช้คิดคะแนน ไม่ใช่ช่องกรอก)`);
        await compare(16, rows, 'left');
        await markEvidence(expected(f.mewsCard, 'AVPU + แถบผล ไม่มีช่องกรอก Vital sign'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-018 MEWS Incomplete
      await startClip(page, tcId(18));
      await soft(`${TC(18)} ขั้น 2–3 ยังไม่กรอก Vital signs / GCS: แถบผล MEWS = Incomplete - SBP, PR, RR, Temp, AVPU`, async () => {
        await hideCompareTable(page);
        const status = f.mewsCard.getByRole('status').first();
        const text = norm(await status.innerText());
        await compare(18, [{ label: 'แถบผล MEWS', values: ['Incomplete - SBP, PR, RR, Temp, AVPU', text], same: text === 'Incomplete - SBP, PR, RR, Temp, AVPU' }], 'left');
        await markEvidence(expected(status, text));
        expect(text).toBe('Incomplete - SBP, PR, RR, Temp, AVPU');
      });

      // TC-006 ผู้นำส่ง AUTO เมื่อเลือก EMS
      await startClip(page, tcId(6));
      await soft(`${TC(6)} ขั้น 2–4 ผู้นำส่งว่าง → เลือก EMS → ผู้นำส่งเป็น EMS ขึ้นทะเบียนเอง`, async () => {
        await hideCompareTable(page);
        const before = (await f.escort.locator('[class*="placeholder"]').filter({ visible: true }).count()) ? '' : norm(await f.escort.innerText());
        await markEvidence(expected(f.escort, before ? `ก่อน: ${before}` : 'ก่อน: ว่าง'), clicked(f.arrival.getByText('EMS', { exact: true })));
        await snapEvidence(page, 'ก่อนกด — EMS');
        await f.arrival.getByText('EMS', { exact: true }).click();
        await expect(f.arrivalRadio('EMS')).toBeChecked();
        await expect(f.escort, 'ผู้นำส่งต้องถูกตั้งค่าเอง').toContainText('EMS', { timeout: 15_000 }).catch(() => undefined);
        const value = norm(await f.escort.innerText());
        const rows: CompareRow[] = [
          { label: 'ผู้นำส่งก่อนเลือก EMS', values: ['ว่าง', before || 'ว่าง'], same: !before },
          { label: 'ผู้นำส่งหลังเลือก EMS', values: ['EMS ขึ้นทะเบียน (บนจอมีรหัส "3 - หน่วยบริการ…" — ผู้ใช้ให้ถือว่าผ่าน)', value], same: value.includes('EMS ขึ้นทะเบียน') },
        ];
        await compare(6, rows);
        await markEvidence(clicked(f.arrival.getByText('EMS', { exact: true }), 'EMS'), expected(f.escort, value));
        expect(bad(rows)).toEqual([]);
      });

      // TC-005 ระดับความเร่งด่วน EMS
      await startClip(page, tcId(5));
      await soft(`${TC(5)} ขั้น 2–3 เลือก EMS → ระดับความเร่งด่วน EMS 5 ตัวเลือก ค่าเริ่มต้น ไม่ระบุ`, async () => {
        await hideCompareTable(page);
        await expect(f.arrivalRadio('EMS')).toBeChecked();
        const names = ['ไม่ระบุ', 'ALS', 'BLS', 'ILS', 'FR'];
        const counts = await Promise.all(names.map((n) => f.arrivalRadio(n).count()));
        const none = (await f.arrivalRadio('ไม่ระบุ').count()) ? await f.arrivalRadio('ไม่ระบุ').isChecked() : false;
        const rows: CompareRow[] = [
          { label: 'ช่องระดับความเร่งด่วน EMS', values: ['แสดง', counts.some(Boolean) ? 'แสดง' : 'ไม่แสดง'], same: counts.some(Boolean) },
          { label: 'ตัวเลือก', values: [names.join(' · '), names.filter((_, i) => counts[i]).join(' · ')], same: counts.every((c) => c === 1) },
          { label: 'ค่าเริ่มต้น', values: ['ไม่ระบุ', none ? 'ไม่ระบุ' : 'ไม่ใช่ ไม่ระบุ'], same: none },
        ];
        await compare(5, rows);
        await markEvidence(expected(f.arrival.getByText('ไม่ระบุ', { exact: true }), 'ค่าเริ่มต้น ไม่ระบุ'), ...['ALS', 'BLS', 'ILS', 'FR'].map((n) => expected(f.arrival.getByText(n, { exact: true }))));
        expect(bad(rows)).toEqual([]);
      });

      // TC-007 ข้อมูลก่อนถึงโรงพยาบาล (EMS)
      await startClip(page, tcId(7));
      await soft(`${TC(7)} ขั้น 2–3 EMS: ช่องข้อมูลก่อนถึงโรงพยาบาล (textarea 2 บรรทัด) ว่าง + placeholder`, async () => {
        await hideCompareTable(page);
        await expect(f.preHospital, 'ต้องมีช่องข้อมูลก่อนถึงโรงพยาบาล').toBeVisible();
        const info = await f.preHospital.evaluate((el) => ({ tag: el.tagName, rows: el.getAttribute('rows'), value: (el as HTMLTextAreaElement).value, placeholder: el.getAttribute('placeholder') }));
        const rows: CompareRow[] = [
          { label: 'ชนิดช่อง', values: ['กล่องข้อความ (textarea)', info.tag], same: info.tag === 'TEXTAREA' },
          { label: 'จำนวนบรรทัด (ข้อสังเกต)', values: ['2', `rows=${info.rows}`], same: true },
          { label: 'ค่า', values: ['ว่าง', info.value || 'ว่าง'], same: !info.value },
          { label: 'placeholder', values: [PLACEHOLDER_PREHOSPITAL, info.placeholder ?? ''], same: info.placeholder === PLACEHOLDER_PREHOSPITAL },
        ];
        await compare(7, rows);
        await markEvidence(expected(f.preHospital, 'ว่าง + placeholder'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-008 ข้อมูลก่อนถึงโรงพยาบาล (Refer)
      await startClip(page, tcId(8));
      await soft(`${TC(8)} ขั้น 2–3 เลือก รับ Refer → ช่องข้อมูลก่อนถึงโรงพยาบาล + placeholder`, async () => {
        await hideCompareTable(page);
        const refer = f.arrival.getByText('รับ Refer', { exact: true });
        await markEvidence(clicked(refer));
        await snapEvidence(page, 'ก่อนกด — รับ Refer');
        await refer.click();
        await expect(f.arrivalRadio('รับ Refer')).toBeChecked();
        await expect(f.preHospital, 'ต้องมีช่องข้อมูลก่อนถึงโรงพยาบาล').toBeVisible();
        const info = await f.preHospital.evaluate((el) => ({ tag: el.tagName, rows: el.getAttribute('rows'), placeholder: el.getAttribute('placeholder') }));
        const rows: CompareRow[] = [
          { label: 'ชนิดช่อง', values: ['กล่องข้อความ (textarea)', info.tag], same: info.tag === 'TEXTAREA' },
          { label: 'จำนวนบรรทัด (ข้อสังเกต)', values: ['2', `rows=${info.rows}`], same: true },
          { label: 'placeholder', values: [PLACEHOLDER_PREHOSPITAL, info.placeholder ?? ''], same: info.placeholder === PLACEHOLDER_PREHOSPITAL },
        ];
        await compare(8, rows);
        await markEvidence(expected(f.preHospital, 'รับ Refer: มีช่องข้อมูลก่อนถึงโรงพยาบาล'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-031 Refer ไม่มีระดับ EMS
      await startClip(page, tcId(31));
      await soft(`${TC(31)} ขั้น 2–3 รับ Refer: ไม่มีช่องระดับความเร่งด่วน EMS`, async () => {
        await hideCompareTable(page);
        await expect(f.arrivalRadio('รับ Refer')).toBeChecked();
        const ems = await f.arrival.getByRole('radio', { name: 'ALS', exact: true }).count();
        await compare(31, [{ label: 'ระดับความเร่งด่วน EMS', values: ['ไม่มี', yes(ems > 0)], same: ems === 0 }]);
        await markEvidence(expected(f.arrival, 'รับ Refer: ไม่มีระดับความเร่งด่วน EMS'));
        expect(ems).toBe(0);
      });

      run.finish();
    },
  );

  // ------------------------------------------------------------------------------------------------
  test(
    'TC-010…012, 015, 017, 019–023, 032–037: Trauma — การดูแลระหว่างนำส่ง · GCS · MEWS · RTS (สูตร + ค่าขอบ) — ไม่บันทึก (Super_User)',
    meta(10, 11, 12, 15, 17, 19, 20, 21, 22, 23, 32, 33, 34, 35, 36, 37),
    async ({ page }) => {
      const run = makeRunner(page);
      const { note, soft } = run;
      const visit = await preparePatient(page, 'B', note);
      note('ผู้ป่วยที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      const f = form(page);
      const compare = async (n: number, rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'left') =>
        showCompareTable(page, `${ISSUE[n]} ${tcId(n)}`, ['Expected', 'หน้าจอ'], rows, { side });
      const bad = (rows: CompareRow[]) => rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (Expected ${r.values[0]})`);
      const rtsText = async () => norm(await f.rtsCard.innerText().catch(() => '(ไม่มีการ์ด RTS)'));

      // TC-010 การดูแลระหว่างนำส่ง
      await startClip(page, tcId(10));
      await soft(`${TC(10)} ขั้น 2–3 เลือก Trauma → หัวข้อ "การดูแลระหว่างนำส่ง" แบบย่อใน ER Arrival`, async () => {
        const trauma = f.emergency.getByText('Trauma', { exact: true });
        await markEvidence(clicked(trauma));
        await snapEvidence(page, 'ก่อนกด — Trauma');
        await trauma.click();
        await expect(f.emergency.getByRole('radio', { name: 'Trauma', exact: true })).toBeChecked();
        await page.waitForTimeout(1_500);
        const care = await f.care.count();
        await compare(10, [{ label: 'หัวข้อการดูแลระหว่างนำส่ง', values: ['มี (เริ่มต้นแบบย่อ)', yes(care > 0)], same: care > 0 }], 'right');
        await markEvidence(expected(f.emergency, 'Trauma'), expected(f.arrival, care ? 'มีการดูแลระหว่างนำส่ง' : 'ไม่มีการดูแลระหว่างนำส่ง'));
        expect(care, 'Trauma ต้องมีหัวข้อการดูแลระหว่างนำส่งใน ER Arrival').toBeGreaterThan(0);
      });

      // TC-011 ช่องในการดูแลระหว่างนำส่ง
      await startClip(page, tcId(11));
      await soft(`${TC(11)} ขั้น 2–3 กดขยาย "การดูแลระหว่างนำส่ง" → 5 dropdown ค่าว่าง ตัวเลือกเหมือนกัน`, async () => {
        await hideCompareTable(page);
        const care = await f.care.count();
        await markEvidence(expected(f.arrival, care ? 'ส่วนการดูแลระหว่างนำส่ง' : 'ไม่มีส่วนการดูแลระหว่างนำส่งให้กดขยาย'));
        expect(care, 'ต้องมีหัวข้อ "การดูแลระหว่างนำส่ง" ให้กดขยาย (เลือก Trauma แล้ว)').toBeGreaterThan(0);
        await f.care.first().click();
        for (const name of ['ดูแลการหายใจ', 'ห้ามเลือด', 'Splint/Slap C-Spine', 'Splint/Slap อื่นๆ', 'IV Fluid']) await expect(f.panel.getByText(name, { exact: true }).first()).toBeVisible();
      });

      // TC-012 บันทึกการดูแลระหว่างนำส่ง — ไม่มีส่วนนี้ให้เลือก
      await startClip(page, tcId(12));
      await soft(`${TC(12)} ขั้น 2–3 เลือกค่าในการดูแลระหว่างนำส่ง 5 ช่อง`, async () => {
        const care = await f.care.count();
        await markEvidence(expected(f.arrival, care ? 'ส่วนการดูแลระหว่างนำส่ง' : 'ไม่มีส่วนการดูแลระหว่างนำส่งให้เลือกค่า'));
        expect(care, 'ต้องมีส่วน "การดูแลระหว่างนำส่ง" ให้เลือกค่า — ไม่มี จึงเลือก / บันทึก / ตรวจผลไม่ได้').toBeGreaterThan(0);
      });

      // TC-032 ไม่มี Trauma Detail
      await startClip(page, tcId(32));
      await soft(`${TC(32)} ขั้น 2–3 Trauma: ไม่มีส่วน Trauma Detail ในฟอร์ม`, async () => {
        await hideCompareTable(page);
        const detail = await page.getByRole('main').getByText(/Trauma Detail/i).count();
        const sections = (await f.panel.getByRole('button', { name: /^expanded / }).allInnerTexts()).map(norm).filter(Boolean);
        note(`${TC(32)} ส่วนในฟอร์ม`, sections.join(' · '));
        await compare(32, [{ label: 'ส่วน Trauma Detail', values: ['ไม่มี', yes(detail > 0)], same: detail === 0 }, { label: 'หัวส่วนในฟอร์ม', values: ['-', sections.join(' · ')], same: true }], 'right');
        await markEvidence(expected(f.emergency, 'Trauma'), expected(f.panel.getByRole('button', { name: 'expanded การจำแนกผู้ป่วย' }), 'ไม่มี Trauma Detail'));
        expect(detail).toBe(0);
      });

      // TC-020 การ์ด RTS
      await startClip(page, tcId(20));
      await soft(`${TC(20)} ขั้น 2–3 Trauma: การ์ด Revised Trauma Score (RTS) มีช่อง GCS · Systolic BP · RR`, async () => {
        await hideCompareTable(page);
        const card = await f.rtsCard.count();
        const text = await rtsText();
        const hasField = (label: RegExp) => f.rtsCard.getByText(label).count().then((c) => c > 0);
        const fields = { gcs: await hasField(/^GCS$/), sbp: await hasField(/^Systolic BP$/), rr: await hasField(/^RR$/) };
        const rows: CompareRow[] = [
          { label: 'การ์ด RTS', values: ['แสดง', yes(card > 0)], same: card > 0 },
          { label: 'ช่อง GCS', values: ['มี', yes(fields.gcs)], same: fields.gcs },
          { label: 'ช่อง Systolic BP', values: ['มี', yes(fields.sbp)], same: fields.sbp },
          { label: 'ช่อง RR', values: ['มี', yes(fields.rr)], same: fields.rr },
          { label: 'ข้อความในการ์ด', values: ['-', text], same: true },
        ];
        await compare(20, rows);
        await markEvidence(expected(f.rtsCard, 'การ์ด RTS'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-021 RTS Incomplete ทั้งหมด
      await startClip(page, tcId(21));
      await soft(`${TC(21)} ขั้น 2–3 ยังไม่กรอก: ช่อง GCS / SBP / RR = "-" · แถบผล Incomplete - GCS, SBP, RR (สีเทา)`, async () => {
        await hideCompareTable(page);
        const text = await rtsText();
        const status = f.rtsCard.getByText(/Incomplete/).first();
        const tone = (await status.count()) ? await toneOf(status) : '(ไม่มีแถบ Incomplete)';
        const dashes = await f.rtsCard.getByText('-', { exact: true }).count();
        const rows: CompareRow[] = [
          { label: 'ช่อง GCS / SBP / RR', values: ['"-" ทั้ง 3 ช่อง', dashes >= 3 ? `"-" ${dashes} ช่อง` : 'ไม่มีช่องแยก'], same: dashes >= 3 },
          { label: 'แถบผล', values: ['Incomplete - GCS, SBP, RR', text.replace(/^Revised Trauma Score \(RTS\) ?/, '')], same: /Incomplete - GCS, SBP, RR/.test(text) },
          { label: 'สีแถบผล', values: ['เทา', tone], same: tone.startsWith('เทา') },
        ];
        await compare(21, rows);
        await markEvidence(expected(f.rtsCard, 'Incomplete - GCS, SBP, RR'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-017 AVPU จาก GCS
      await startClip(page, tcId(17));
      await soft(`${TC(17)} ขั้น 2–4 AVPU ก่อน / หลังเลือก GCS E4 V5 M6 (15)`, async () => {
        await hideCompareTable(page);
        const before = norm(await selectedText(f.avpu));
        await markEvidence(expected(f.avpu, `ก่อนเลือก GCS: ${before}`));
        await snapEvidence(page, 'ก่อนเลือก GCS — AVPU');
        await pickGcs(f, 4, 5, 6);
        await expect(f.gcsCard.getByRole('status').first()).toContainText('15', { timeout: 15_000 });
        await expect.poll(async () => norm(await selectedText(f.avpu)), { timeout: 15_000 }).not.toBe(before);
        const after = norm(await selectedText(f.avpu));
        const mews = norm(await f.mewsCard.getByRole('status').first().innerText());
        const rows: CompareRow[] = [
          { label: 'AVPU ก่อนเลือก GCS', values: ['-', before], same: true },
          { label: 'AVPU หลังเลือก GCS 15', values: ['ได้ค่าตาม GCS เอง (A = 0)', after], same: /\(0\)|^A/.test(after) && after !== before },
          { label: 'แถบผล MEWS', values: ['ไม่ขาด AVPU แล้ว', mews], same: !/AVPU/.test(mews) },
        ];
        await compare(17, rows);
        await markEvidence(filled(f.gcsCard, 'GCS E4 V5 M6'), expected(f.avpu, `AVPU = ${after}`));
        expect(bad(rows)).toEqual([]);
      });

      // TC-022 RTS ขาด SBP / RR
      await startClip(page, tcId(22));
      await soft(`${TC(22)} ขั้น 2–4 GCS 15 ยังไม่กรอก SBP / RR: ช่อง GCS 15 · แถบผล Incomplete - SBP, RR`, async () => {
        await hideCompareTable(page);
        const text = await rtsText();
        const gcsField = await f.rtsCard.getByText('15', { exact: true }).count();
        const rows: CompareRow[] = [
          { label: 'ช่อง GCS', values: ['15', gcsField ? '15' : 'ไม่มีช่องแยก'], same: gcsField > 0 },
          { label: 'แถบผล', values: ['Incomplete - SBP, RR', text.replace(/^Revised Trauma Score \(RTS\) ?/, '')], same: /Incomplete - SBP, RR$/.test(text) },
        ];
        await compare(22, rows);
        await markEvidence(expected(f.rtsCard, 'Incomplete - SBP, RR'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-015 GCS E4 V5 M5
      await startClip(page, tcId(15));
      await soft(`${TC(15)} ขั้น 2–3 GCS E4 V5 M5 → ผลรวม 14 ระดับเล็กน้อย (Mild)`, async () => {
        await hideCompareTable(page);
        await pickGcs(f, 4, 5, 5);
        const status = f.gcsCard.getByRole('status').first();
        await expect(status).toContainText('14', { timeout: 15_000 });
        const text = norm(await status.innerText());
        const rows: CompareRow[] = [
          { label: 'ผลรวม', values: ['14 (บนจอ "GCS 14" — ผู้ใช้ให้แก้ Expected)', text], same: /GCS 14\b/.test(text) },
          { label: 'E / V / M', values: ['E4 V5 M5', text], same: /E4\s*V5\s*M5/.test(text) },
          { label: 'ระดับ', values: ['ระดับเล็กน้อย (บนจอ Mild)', text], same: /Mild|เล็กน้อย/.test(text) },
        ];
        await compare(15, rows);
        await markEvidence(filled(f.gcsCard.getByRole('combobox', { name: 'Motor Response (M)' }), 'M5'), expected(status, text));
        expect(bad(rows)).toEqual([]);
      });

      // TC-023 + 033–037 RTS ครบ
      const rtsCases: { n: number; gcs: [number, number, number]; total: number; sbp: string; rr: string; coded: [number, number, number]; points: number; raw: string }[] = [
        { n: 23, gcs: [4, 5, 6], total: 15, sbp: '120', rr: '20', coded: [4, 4, 4], points: 8, raw: '7.8408' },
        { n: 33, gcs: [4, 4, 5], total: 13, sbp: '90', rr: '10', coded: [4, 4, 4], points: 8, raw: '7.8408' },
        { n: 34, gcs: [3, 4, 5], total: 12, sbp: '89', rr: '30', coded: [3, 3, 3], points: 6, raw: '5.8806' },
        { n: 35, gcs: [1, 1, 4], total: 6, sbp: '50', rr: '6', coded: [2, 2, 2], points: 4, raw: '3.9204' },
        { n: 36, gcs: [1, 1, 3], total: 5, sbp: '49', rr: '5', coded: [1, 1, 1], points: 2, raw: '1.9602' },
        { n: 37, gcs: [1, 1, 1], total: 3, sbp: '0', rr: '0', coded: [0, 0, 0], points: 0, raw: '0' },
      ];
      for (const c of rtsCases) {
        await startClip(page, tcId(c.n));
        await soft(`${TC(c.n)} GCS E${c.gcs[0]} V${c.gcs[1]} M${c.gcs[2]} (${c.total}) · SBP ${c.sbp} · RR ${c.rr} → RTS Complete ${c.points} Points`, async () => {
          await hideCompareTable(page);
          await pickGcs(f, ...c.gcs);
          await fillVitals(f, { systolic: c.sbp, rr: c.rr });
          await f.panel.getByRole('spinbutton', { name: 'RR' }).first().press('Tab');
          await expect(f.gcsCard.getByRole('status').first()).toContainText(`GCS ${c.total}`, { timeout: 15_000 });
          // ข้อความเตือนใต้ช่องสัญญาณชีพขึ้น / หายแล้วหน้าเลื่อน → รอให้นิ่งก่อนตีกรอบ (รอบ 29 ต.ค. กรอบ SBP เลื่อนไปทับ Pain score)
          await page.waitForTimeout(1_500);
          await expect.poll(async () => rtsText(), { timeout: 15_000 }).not.toMatch(/Incomplete/);
          const text = await rtsText();
          const sbpValue = await f.panel.getByRole('spinbutton', { name: 'Systolic' }).first().inputValue();
          const rrValue = await f.panel.getByRole('spinbutton', { name: 'RR' }).first().inputValue();
          const got = (k: string) => text.match(new RegExp(`${k}:(\\d+)`))?.[1] ?? '-';
          const shown = Number(text.match(/RTS = ([\d.]+)/)?.[1] ?? text.match(/([\d.]+) Points/)?.[1] ?? NaN);
          const tone = await toneOf(f.rtsCard.getByText(/RTS =|Points/).first()).catch(() => '-');
          const rows: CompareRow[] = [
            { label: 'ค่าที่กรอก SBP / RR', values: [`${c.sbp} / ${c.rr}`, `${sbpValue} / ${rrValue}`], same: sbpValue === c.sbp && rrValue === c.rr },
            { label: 'คะแนน GCS', values: [String(c.coded[0]), got('GCS')], same: got('GCS') === String(c.coded[0]) },
            { label: 'คะแนน SBP', values: [String(c.coded[1]), got('SBP')], same: got('SBP') === String(c.coded[1]) },
            { label: 'คะแนน RR', values: [String(c.coded[2]), got('RR')], same: got('RR') === String(c.coded[2]) },
            { label: 'ผล RTS', values: [`Complete · ${c.points} Points (0.9368×${c.coded[0]} + 0.7326×${c.coded[1]} + 0.2908×${c.coded[2]} = ${c.raw})`, text.replace(/^Revised Trauma Score \(RTS\) ?/, '')], same: shown === c.points },
            ...(c.n === 23 ? [{ label: 'สีแถบผล', values: ['เขียว', tone], same: tone.startsWith('เขียว') }] : []),
          ];
          await compare(c.n, rows);
          await markEvidence(filled(f.gcsCard, `GCS ${c.total}`), filled(f.panel.getByRole('spinbutton', { name: 'Systolic' }).first(), `SBP ${c.sbp}`), filled(f.panel.getByRole('spinbutton', { name: 'RR' }).first(), `RR ${c.rr}`), expected(f.rtsCard, text.replace(/^Revised Trauma Score \(RTS\) ?/, '')));
          note(`${TC(c.n)} RTS บนจอ`, text);
          expect(bad(rows), `Expected: RTS Complete = ${c.points} Points ตามสูตรในการ์ด`).toEqual([]);
        });
      }

      // TC-019 MEWS ครบ
      await startClip(page, tcId(19));
      await soft(`${TC(19)} ขั้น 2–4 Vital signs SBP 120 · PR 80 · RR 16 · Temp 37.0 + GCS E4 V5 M6 → MEWS = 1`, async () => {
        await hideCompareTable(page);
        await fillVitals(f, { systolic: '120', pr: '80', rr: '16', temp: '37.0' });
        await pickGcs(f, 4, 5, 6);
        const status = f.mewsCard.getByRole('status').first();
        await page.waitForTimeout(2_000);
        let text = norm(await status.innerText());
        // dev-x: MEWS คิดคะแนนเมื่อเลือก "ชุดข้อมูลสัญญาณชีพ / Vital signs round" (ฉบับร่างของรอบที่กรอก)
        const round = f.mewsCard.locator('select').filter({ has: page.locator('option', { hasText: /Select a round/ }) }).first();
        let usedRound = '';
        if (/Incomplete/.test(text) && (await round.count())) {
          const label = (await round.locator('option').allTextContents()).find((t) => /ฉบับร่าง|Draft/.test(t));
          if (label) {
            await round.selectOption({ label });
            usedRound = norm(label);
            await expect.poll(async () => norm(await status.innerText()), { timeout: 15_000 }).not.toMatch(/Incomplete/);
            text = norm(await status.innerText());
          }
        }
        if (usedRound) note(`${TC(19)} ขั้นเพิ่ม`, `แถบผลยัง Incomplete หลังกรอก → เลือก "ชุดข้อมูลสัญญาณชีพ" = ${usedRound} แล้วคิดคะแนน`);
        const rows: CompareRow[] = [
          { label: 'สถานะ', values: ['ไม่เป็น Incomplete', /Incomplete/.test(text) ? 'Incomplete' : 'คิดคะแนนแล้ว'], same: !/Incomplete/.test(text) },
          { label: 'คะแนน MEWS', values: ['1 (RR 16 = 1 · ค่าอื่น 0)', text], same: /MEWS = 1\b/.test(text) },
          { label: 'ชุดข้อมูลสัญญาณชีพ', values: ['(TC ไม่ได้ระบุ)', usedRound || 'ไม่ต้องเลือก'], same: true },
        ];
        await compare(19, rows);
        await markEvidence(filled(f.panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'SBP 120'), filled(f.panel.getByRole('spinbutton', { name: 'PR' }).first(), 'PR 80'), filled(f.panel.getByRole('spinbutton', { name: 'RR' }).first(), 'RR 16'), filled(f.panel.getByRole('spinbutton', { name: 'Temp' }).first(), 'Temp 37'), expected(status, text));
        expect(bad(rows)).toEqual([]);
      });

      run.finish();
    },
  );

  // ------------------------------------------------------------------------------------------------
  test(
    'TC-038, 024, 039: ปุ่มบันทึกเมื่อยังไม่เลือกระดับ · ชื่อโซนใหม่ · เอาโซนออก — ไม่บันทึก (Super_User)',
    meta(38, 24, 39),
    async ({ page }) => {
      const run = makeRunner(page);
      const { note, soft } = run;
      const authorization = trackAuthorization(page);
      const visit = await preparePatient(page, 'C', note);
      note('ผู้ป่วยที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      const f = form(page);
      const bad = (rows: CompareRow[]) => rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (Expected ${r.values[0]})`);
      const pressedZone = f.zones.and(page.locator('[aria-pressed="true"]'));

      await startClip(page, tcId(38));
      await soft(`${TC(38)} ขั้น 2 กรอกสัญญาณชีพ · Chief Complaint · GCS ครบ ไม่เลือกระดับความเร่งด่วน`, async () => {
        await fillVitals(f, VITALS_TC);
        await f.panel.getByRole('group', { name: 'Common chief complaints' }).getByRole('button').first().click();
        await pickGcs(f, 4, 5, 6);
        await expect(f.gcsCard.getByRole('status').first()).toContainText('GCS 15');
        await markEvidence(filled(f.panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'สัญญาณชีพ'), filled(f.panel.getByRole('group', { name: 'Common chief complaints' }), 'Chief Complaint'), filled(f.gcsCard, 'GCS 15'), expected(f.levels, 'ยังไม่เลือกระดับ'));
      });
      await soft(`${TC(38)} ขั้น 3 กดบันทึกคัดกรอง → บันทึกไม่ได้ + แจ้งให้เลือกระดับ · ผู้ป่วยยังไม่ถูกคัดกรอง`, async () => {
        const enabled = await f.save.isEnabled();
        const zones = await pressedZone.count();
        // ภาพก่อนกด (ป้าย "กด" แยกภาพ — ไม่ให้ทับข้อความ tooltip ในภาพผล)
        await markEvidence(clicked(f.save, enabled ? 'บันทึก' : 'บันทึก (disabled)'));
        await snapEvidence(page, 'ก่อนกด — บันทึก ไม่เลือกระดับ');
        await f.save.hover({ force: true });
        const tip = page.locator('.ant-tooltip:visible').first();
        await tip.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
        const tipText = norm(await tip.innerText().catch(() => ''));
        if (enabled) await f.save.click();
        await page.waitForTimeout(2_000);
        const res = await page.request.get(`/cortex-api/er/encounters/${visit.en}/triage-assessments`, { headers: { authorization: authorization() } });
        const assessments = res.ok() ? ((await res.json()) as unknown[]).length : -1;
        const rows: CompareRow[] = [
          { label: 'ปุ่มบันทึก', values: ['บันทึกไม่ได้', enabled ? 'กดได้' : 'กดไม่ได้ (disabled)'], same: !enabled },
          { label: 'ข้อความแจ้ง', values: ['ให้เลือกระดับความเร่งด่วน', tipText || '(ไม่มี)'], same: /ระดับ/.test(tipText) },
          { label: 'โซนที่ถูกเลือก', values: ['-', zones ? `${zones} โซน` : 'ไม่มี'], same: true },
          { label: 'ผลคัดกรองใน API', values: ['ไม่มี (ยังไม่ถูกคัดกรอง)', assessments < 0 ? `อ่านไม่ได้ ${res.status()}` : `${assessments} รายการ`], same: assessments === 0 },
        ];
        note(`${TC(38)} ผล`, rows.map((r) => `${r.label}: ${r.values[1]}`).join(' · '));
        await showCompareTable(page, `${ISSUE[38]} ${tcId(38)}`, ['Expected', 'หน้าจอ / API'], rows, { side: 'left' });
        await markEvidence(...(tipText ? [alerted(tip, 'tooltip ของปุ่มบันทึก')] : [expected(f.save, 'ไม่มี tooltip')]));
        expect(bad(rows)).toEqual([]);
      });

      await startClip(page, tcId(24));
      await soft(`${TC(24)} ขั้น 2 เลือกระดับ 3 → ตัวเลือกโซนเป็นชื่อใหม่ 5 โซน`, async () => {
        await hideCompareTable(page);
        await page.mouse.move(400, 900);
        await f.levels.scrollIntoViewIfNeeded();
        await f.levels.getByText('3', { exact: true }).click();
        await expect(pressedZone).toHaveCount(1);
        const names = (await f.zones.locator('[class*="_name"]').allInnerTexts()).map(norm);
        const areaText = norm(await f.zoneArea.innerText());
        const rows: CompareRow[] = [
          { label: 'ตัวเลือกโซน', values: [ZONES_NEW.join(' · '), names.join(' · ')], same: names.join('|') === ZONES_NEW.join('|') },
          ...ZONES_OLD.map((o) => ({ label: `ชื่อเดิม ${o}`, values: ['ไม่มี', yes(areaText.includes(o))], same: !areaText.includes(o) })),
        ];
        await showCompareTable(page, `${ISSUE[24]} ${tcId(24)}`, ['Expected', 'หน้าจอ'], rows, { side: 'left' });
        await markEvidence(filled(f.levels, 'ระดับ 3'), expected(f.zoneArea, names.join(' · ')));
        expect(bad(rows)).toEqual([]);
      });

      await startClip(page, tcId(39));
      await soft(`${TC(39)} ขั้น 2 เลือกระดับแล้วเอาโซนที่ระบบเลือกให้ออก (ไม่มีโซน)`, async () => {
        await hideCompareTable(page);
        const zone = norm(await pressedZone.locator('[class*="_name"]').innerText());
        await markEvidence(clicked(pressedZone, `${zone} (กดซ้ำเพื่อเอาออก)`));
        await snapEvidence(page, 'ก่อนกด — โซนซ้ำ');
        await pressedZone.click();
        await page.waitForTimeout(1_000);
        const after = await pressedZone.count();
        const afterName = after ? norm(await pressedZone.locator('[class*="_name"]').innerText()) : '';
        const levelsTried: string[] = [];
        for (const lv of ['1', '2', '4', '5']) {
          await f.levels.getByText(lv, { exact: true }).click();
          await page.waitForTimeout(800);
          levelsTried.push(`ระดับ ${lv} → ${(await pressedZone.count()) ? norm(await pressedZone.locator('[class*="_name"]').innerText()) : 'ไม่มีโซน'}`);
        }
        note(`${TC(39)} ตรวจไม่ได้`, `กดโซน ${zone} ซ้ำแล้วยังถูกเลือก (${after ? afterName : 'หลุด'}) · ทุกระดับระบบเลือกโซนแนะนำให้เอง: ${levelsTried.join(' · ')} → สร้างสภาพ "มีระดับแต่ไม่มีโซน" บนหน้าจอไม่ได้`);
        await showCompareTable(page, `${ISSUE[39]} ${tcId(39)}`, ['Expected', 'หน้าจอ'], [
          { label: 'เอาโซนออก', values: ['ไม่มีโซน', after ? `ยังเลือก ${afterName}` : 'ไม่มีโซน'], same: !after },
          { label: 'ทุกระดับ', values: ['-', levelsTried.join(' · ')], same: true },
        ], { side: 'left' });
        await markEvidence(expected(pressedZone, after ? `ยังเลือก ${afterName}` : 'ไม่มีโซน'));
        if (!after) throw new Error('เอาโซนออกได้ — ต้องเขียนขั้นกดบันทึกต่อ');
      });

      // TC-039 ตรวจไม่ได้ (ไม่ใช่ไม่ผ่าน) — ไม่นับใน finish
      run.finish();
    },
  );

  // ------------------------------------------------------------------------------------------------
  test(
    'TC-009: บันทึก ER Arrival แบบ EMS (ALS · ผู้นำส่ง · ชื่อหน่วยงาน · ข้อมูลก่อนถึงโรงพยาบาล) แล้วดูค่าที่บันทึก (Super_User)',
    meta(9),
    async ({ page }) => {
      const run = makeRunner(page);
      const { note, soft } = run;
      const authorization = trackAuthorization(page);
      const visit = await preparePatient(page, 'D', note);
      note('ผู้ป่วยที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      const f = form(page);
      const main = page.getByRole('main');
      const patched: string[] = [];
      page.on('request', (req) => {
        if (req.method() === 'PATCH' && req.url().includes('/registration-details')) patched.push(req.postData() ?? '');
      });

      await startClip(page, tcId(9));
      await soft(`${TC(9)} ขั้น 2–3 ER Arrival: EMS · ALS · ผู้นำส่ง (อัตโนมัติ) · ชื่อหน่วยงาน · ข้อมูลก่อนถึงโรงพยาบาล`, async () => {
        await f.arrival.getByText('EMS', { exact: true }).click();
        await expect(f.arrivalRadio('EMS')).toBeChecked();
        await f.arrival.getByText('ALS', { exact: true }).click();
        await expect(f.arrivalRadio('ALS')).toBeChecked();
        await expect(f.escort).toContainText('EMS ขึ้นทะเบียน', { timeout: 15_000 });
        await f.transporter.fill('หน่วยกู้ภัยทดสอบ');
        await f.transporter.press('Tab');
        await f.preHospital.fill('BP 110/70 ระหว่างนำส่ง');
        await f.preHospital.press('Tab');
        await page.waitForTimeout(3_000);
        await markEvidence(filled(f.arrival.getByText('EMS', { exact: true }), 'EMS'), filled(f.arrival.getByText('ALS', { exact: true }), 'ALS'), expected(f.escort, 'EMS ขึ้นทะเบียน (อัตโนมัติ)'), filled(f.transporter, 'หน่วยกู้ภัยทดสอบ'), filled(f.preHospital, 'BP 110/70 ระหว่างนำส่ง'));
      });
      note(`${TC(9)} คำสั่งเก็บ ER Arrival (PATCH registration-details)`, patched.map((b) => b.slice(0, 200)).join(' | ') || '(ไม่มี)');

      await soft(`${TC(9)} ขั้น 4 กรอกช่องบังคับ · เลือกระดับ 3 + โซน แล้วกดบันทึกคัดกรอง → สำเร็จ`, async () => {
        await fillVitals(f, VITALS_TC);
        await f.panel.getByRole('group', { name: 'Common chief complaints' }).getByRole('button').first().click();
        await pickGcs(f, 4, 5, 6);
        await saveTriage(page, f, `คัดกรอง ${visit.en}`);
      });

      await soft(`${TC(9)} ขั้น 5 เปิดดูผลคัดกรองที่บันทึก → ข้อมูล ER Arrival ตรงกับที่กรอก`, async () => {
        const area = await openSavedView(page);
        const inputs = await main.locator('input, textarea').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value).filter(Boolean));
        const screen = norm(await main.innerText());
        const onScreen = (v: string) => screen.includes(v) || inputs.some((x) => x.includes(v));
        const regions = await main.getByRole('region', { name: 'ER Arrival' }).count();
        const res = await page.request.get(`/cortex-api/er/encounters/${visit.en}`, { headers: { authorization: authorization() } });
        const enc = (res.ok() ? await res.json() : {}) as Record<string, unknown>;
        const want: [string, string, unknown][] = [
          ['วิธีการมาถึง', 'EMS', enc.arrivalMethod],
          ['ระดับความเร่งด่วน EMS', 'ALS', enc.emsLevel],
          ['ผู้นำส่ง', 'EMS ขึ้นทะเบียน', enc.accompanyingPersonOptionId],
          ['ชื่อผู้นำส่ง / หน่วยงาน', 'หน่วยกู้ภัยทดสอบ', enc.transporterName],
          ['ข้อมูลก่อนถึงโรงพยาบาล', 'BP 110/70 ระหว่างนำส่ง', enc.preHospitalInfo],
        ];
        const rows: CompareRow[] = [
          { label: 'ส่วน ER Arrival หลังบันทึก', values: ['แสดง', regions ? 'แสดง' : 'ไม่มีบนหน้าจอ (Overview / ดู)'], same: regions > 0 },
          ...want.map(([label, value, api]) => ({ label, values: [value, onScreen(value) ? 'เห็นบนจอ' : 'ไม่เห็นบนจอ', `${api ?? 'null'}`], same: onScreen(value) })),
        ];
        note(`${TC(9)} API /er/encounters/${visit.en}`, `arrivalMethod ${enc.arrivalMethod} · emsLevel ${enc.emsLevel} · accompanyingPersonOptionId ${enc.accompanyingPersonOptionId} · transporterName ${enc.transporterName} · preHospitalInfo ${enc.preHospitalInfo}`);
        const chip = main.getByText(/^(Walk-in|EMS|รับ Refer|Refer)$/).first();
        if (await chip.count()) note(`${TC(9)} ข้อสังเกต`, `ป้ายวิธีการมาถึงที่แถบ Visit = "${norm(await chip.innerText())}"`);
        await showCompareTable(page, `${ISSUE[9]} ${tcId(9)} ER Arrival หลังบันทึก`, ['Expected', 'หน้าจอ', 'API'], rows, { side: 'right' });
        await markEvidence(expected(area, 'ข้อมูลที่ผูกกับการประเมิน (ไม่มี ER Arrival)'), ...((await chip.count()) ? [expected(chip, 'ป้ายวิธีการมาถึง')] : []));
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (API ${r.values[2] ?? '-'})`), 'Expected: ข้อมูล ER Arrival ที่บันทึกแสดงตรงกับที่กรอก').toEqual([]);
      });

      run.finish();
    },
  );

  // ------------------------------------------------------------------------------------------------
  test(
    'TC-013: บันทึก Vital signs · Body Metrics · Chief Complaint · Present Illness แล้วดูค่าที่บันทึก (Super_User)',
    meta(13),
    async ({ page }) => {
      const run = makeRunner(page);
      const { note, soft } = run;
      const visit = await preparePatient(page, 'E', note);
      note('ผู้ป่วยที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      const f = form(page);
      const main = page.getByRole('main');
      const body = f.panel.locator('div').filter({ has: page.getByText('Body metric general', { exact: true }) }).filter({ has: page.getByText('Weight', { exact: true }) }).last();
      const cc = f.panel.getByRole('group', { name: 'Common chief complaints' });
      const pi = f.panel.locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').first();
      let ccName = '';

      await startClip(page, tcId(13));
      await soft(`${TC(13)} ขั้น 2–3 กรอก Vital signs · Body Metrics · Chief Complaint · Present Illness`, async () => {
        await fillVitals(f, VITALS_TC);
        await body.getByRole('spinbutton').nth(0).fill('60');
        await body.getByRole('spinbutton').nth(1).fill('165');
        ccName = norm(await cc.getByRole('button').first().innerText());
        await cc.getByRole('button').first().click();
        await pi.fill('ทดสอบ PI');
        await pi.press('Tab');
        await pickGcs(f, 4, 5, 6);
        await markEvidence(filled(f.panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'SBP 120 / DBP 80 · PR 80 · RR 16 · Temp 37 · SpO2 98'), filled(body, 'น้ำหนัก 60 · ส่วนสูง 165'));
        await snapEvidence(page, 'กรอก — สัญญาณชีพ + Body Metrics');
        await markEvidence(filled(cc, `Chief Complaint: ${ccName}`), filled(pi, 'ทดสอบ PI'));
      });
      await soft(`${TC(13)} ขั้น 4 เลือกระดับ 3 + โซน แล้วกดบันทึกคัดกรอง → สำเร็จ`, async () => {
        await saveTriage(page, f, `คัดกรอง ${visit.en}`);
      });
      await soft(`${TC(13)} ขั้น 5 เปิดดูผลคัดกรองที่บันทึก → ค่าตรงกับที่กรอก`, async () => {
        const area = await openSavedView(page);
        // หน้าดูผลโหลดส่วนย่อยตามหลัง · ER Physician Note (มี Present Illness) โหลดในหน้าเอง ~20 วินาที
        await expect(area, 'หน้าดูผลต้องแสดงสัญญาณชีพและน้ำหนัก').toContainText(/Systolic[\s\S]*Weight|Weight[\s\S]*Systolic/, { timeout: 60_000 }).catch(() => undefined);
        await expect.poll(async () => (await main.locator('textarea').evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value))).some((v) => v.includes('ทดสอบ PI')), { timeout: 60_000 }).toBe(true).catch(() => undefined);
        const text = norm(await area.innerText());
        // หัวช่องแสดงตัวพิมพ์ใหญ่ด้วย CSS (ข้อความจริงไม่ใช่ตัวใหญ่) → จับแบบไม่สนตัวพิมพ์
        const ccLabel = page.getByText(/^อาการสำคัญ \(chief complaint\)$/i);
        const ccShown = main.locator('div').filter({ has: ccLabel }).filter({ has: page.getByText(/^triage level$/i) }).last();
        const ccInputs = await ccShown.locator('input, textarea').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
        const ccText = norm(await ccShown.innerText().catch(() => ''));
        const ccValue = ccText.match(/chief complaint\)\s*(.*?)\s*triage level/i)?.[1] || ccInputs.find((v) => v.includes(ccName)) || '';
        const inputs = await main.locator('textarea').evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value));
        const piShown = inputs.some((v) => v.includes('ทดสอบ PI'));
        // ส่วนดูผลเป็น web component (shadow DOM) — innerText ไม่เห็นค่า → ค้นทีละค่าด้วย getByText (ทะลุ shadow)
        void text;
        const seen = async (label: string, shown: string) => ({ label, shown, ok: (await area.getByText(shown, { exact: true }).count()) > 0 });
        const vals = [
          await seen('Systolic', '120 mm[Hg]'), await seen('Diastolic', '80 mm[Hg]'), await seen('PR', '80 /min'), await seen('RR', '16 /min'),
          await seen('Temp', '37 Cel'), await seen('SpO2', '98%'), await seen('น้ำหนัก', '60 kg'), await seen('ส่วนสูง', '165 cm'),
        ];
        const row = (label: string, want: string, i: number[]) => ({ label, values: [want, i.map((n) => (vals[n].ok ? vals[n].shown : '-')).join(' / ')], same: i.every((n) => vals[n].ok) });
        const rows: CompareRow[] = [
          row('BP', '120 / 80', [0, 1]),
          row('PR', '80', [2]),
          row('RR', '16', [3]),
          row('Temp', '37.0', [4]),
          row('SpO2', '98', [5]),
          row('น้ำหนัก', '60', [6]),
          row('ส่วนสูง', '165', [7]),
          { label: 'Chief Complaint', values: [ccName, ccValue || '-'], same: ccValue.includes(ccName) },
          { label: 'Present Illness', values: ['ทดสอบ PI', piShown ? 'ทดสอบ PI' : '-'], same: piShown },
        ];
        await showCompareTable(page, `${ISSUE[13]} ${tcId(13)} ค่าที่บันทึก`, ['Expected', 'หน้าจอ'], rows, { side: 'right' });
        await markEvidence(expected(area, 'สัญญาณชีพ · น้ำหนัก / ส่วนสูง (CC อยู่ใน Clinical Summary ด้านบน)'));
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`)).toEqual([]);
      });
      await soft(`${TC(13)} ขั้น 5 (ต่อ) Present Illness ที่บันทึก`, async () => {
        await hideCompareTable(page);
        const piBox = main.locator('textarea').filter({ hasText: 'ทดสอบ PI' }).first();
        const box = (await piBox.count()) ? piBox : main.getByText('Present illness general', { exact: true }).first();
        await markEvidence(expected(box, 'Present Illness: ทดสอบ PI'));
      });

      run.finish();
    },
  );

  // ------------------------------------------------------------------------------------------------
  test(
    'TC-014: เพิ่มโรคประจำตัว (Underlying disease) ในฟอร์มคัดกรอง ER แล้วดูผลคัดกรอง (Super_User)',
    meta(14),
    async ({ page }) => {
      const run = makeRunner(page);
      const { note, soft } = run;
      const visit = await preparePatient(page, 'F', note);
      note('ผู้ป่วยที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      const f = form(page);
      const main = page.getByRole('main');
      const ud = underlying(page);
      const disease = 'Essential (primary) hypertension';

      await startClip(page, tcId(14));
      await soft(`${TC(14)} ขั้น 2 ส่วนโรคประจำตัว: ค้น I10 ความดันโลหิตสูง แล้วกดบันทึกของส่วนนี้`, async () => {
        await ud.section.scrollIntoViewIfNeeded();
        await ud.input.click();
        await ud.input.pressSequentially('I10', { delay: 40 });
        const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^I10 / }).first();
        await option.waitFor({ state: 'visible', timeout: 20_000 });
        await markEvidence(filled(ud.input, 'I10'), clicked(option));
        await snapEvidence(page, 'ก่อนกด — เลือกโรค I10');
        await option.click();
        await expect(ud.save).toBeEnabled();
        await markEvidence(filled(ud.input, 'I10 Essential (primary) hypertension'), clicked(ud.save));
        await snapEvidence(page, 'ก่อนกด — บันทึกโรคประจำตัว');
        await ud.save.click();
        await expect(ud.table.getByText(disease, { exact: true }), 'ตารางโรคประจำตัวต้องมีโรคที่เพิ่ม').toBeVisible({ timeout: 20_000 });
        await markEvidence(expected(ud.table.locator('tr').filter({ hasText: disease }).first(), disease));
      });
      await soft(`${TC(14)} ขั้น 3 กรอกช่องบังคับ · เลือกระดับ 3 + โซน แล้วกดบันทึกคัดกรอง → สำเร็จ`, async () => {
        await fillVitals(f, VITALS_TC);
        await f.panel.getByRole('group', { name: 'Common chief complaints' }).getByRole('button').first().click();
        await pickGcs(f, 4, 5, 6);
        await saveTriage(page, f, `คัดกรอง ${visit.en}`);
      });
      await soft(`${TC(14)} ขั้น 4 เปิดดูผลคัดกรองที่บันทึก → โรคประจำตัวที่เพิ่มแสดง`, async () => {
        await openSavedView(page);
        const row = main.locator('table tr').filter({ hasText: disease }).first();
        // ตารางโรคประจำตัว (Verified Underlying Disease) โหลดตามหลังหน้าดูผล
        await row.waitFor({ state: 'attached', timeout: 30_000 }).catch(() => undefined);
        const banner = main.getByText(disease, { exact: true }).first();
        const rows: CompareRow[] = [
          { label: 'ตารางโรคประจำตัว (หน้าดูผล)', values: [disease, (await row.count()) ? norm(await row.innerText()) : '(ไม่มี)'], same: (await row.count()) > 0 },
          { label: 'U/D ที่แถบผู้ป่วย', values: [disease, (await banner.count()) ? disease : '(ไม่มี)'], same: (await banner.count()) > 0 },
        ];
        await showCompareTable(page, `${ISSUE[14]} ${tcId(14)} โรคประจำตัว`, ['Expected', 'หน้าจอ'], rows, { side: 'left' });
        await row.scrollIntoViewIfNeeded().catch(() => undefined);
        await markEvidence(expected(row, disease), expected(banner, 'U/D'));
        note(`${TC(14)} ข้อสังเกต`, 'หัวส่วนในฟอร์มคัดกรอง = "Underlying Disease" (ค้น ICD10 / SNOMED + ปุ่มบันทึกของส่วนนี้) · หลังบันทึกเป็น "Verified Underlying Disease" · ยังไม่ได้เปิดหน้า OPD เทียบว่าเหมือนกันทุกจุด');
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });

      run.finish();
    },
  );

  // ------------------------------------------------------------------------------------------------
  test(
    'TC-025, 027: คัดกรองโซน Isolation 2 → Zone Isolate บน ER Dashboard + เลข 2 ที่ Patient banner (Super_User)',
    meta(25, 27),
    async ({ page }) => {
      const run = makeRunner(page);
      const { note, soft } = run;
      const visit = await preparePatient(page, 'G', note);
      note('ผู้ป่วยที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      const f = form(page);
      const main = page.getByRole('main');

      await startClip(page, tcId(25));
      await soft(`${TC(25)} ขั้น 2 กรอกช่องบังคับ · ระดับ 3 · โซน Isolation 2 แล้วกดบันทึกคัดกรอง`, async () => {
        await fillVitals(f, VITALS_TC);
        await f.panel.getByRole('group', { name: 'Common chief complaints' }).getByRole('button').first().click();
        await pickGcs(f, 4, 5, 6);
        await saveTriage(page, f, `คัดกรอง ${visit.en} (Isolation 2)`, 'Isolation 2');
      });
      await soft(`${TC(25)} ขั้น 3 ER Dashboard: ผู้ป่วยอยู่ในโซน "Zone Isolate"`, async () => {
        await gotoErDashboard(page);
        const card = boardCard(page, visit.hn);
        await expect(card, 'ต้องเห็นการ์ดผู้ป่วยบนบอร์ด').toBeVisible({ timeout: 30_000 });
        await card.scrollIntoViewIfNeeded();
        const header = main.getByText('Zone Isolate', { exact: true }).first();
        // อยู่คอลัมน์ไหน = ตำแหน่งแนวนอนของการ์ดอยู่ใต้หัวคอลัมน์ Zone Isolate
        const [hb, cb] = [await header.boundingBox(), await card.boundingBox()];
        // ช่วงคอลัมน์ = จากหัว Zone Isolate ถึงหัวคอลัมน์ถัดไป (Observation)
        const nb = await main.getByText('Observation', { exact: true }).first().boundingBox();
        const hcb = hb && nb ? { x: hb.x - 16, width: nb.x - hb.x } : hb;
        const inColumn = !!(hcb && cb && cb.x + cb.width / 2 >= hcb.x && cb.x + cb.width / 2 <= hcb.x + hcb.width);
        note(`${TC(25)} ตำแหน่ง`, `หัวคอลัมน์ x ${Math.round(hcb?.x ?? -1)}–${Math.round((hcb?.x ?? 0) + (hcb?.width ?? 0))} · กลางการ์ด x ${Math.round((cb?.x ?? 0) + (cb?.width ?? 0) / 2)}`);
        const badge = card.locator('[title="Zone Isolate"], [aria-label="Zone Isolate"]').first();
        const badgeText = (await badge.count()) ? norm(await badge.innerText()) : '';
        note(`${TC(25)} การ์ดบนบอร์ด`, `อยู่คอลัมน์ Zone Isolate: ${inColumn} · ป้ายเลขบนการ์ด: ${badgeText || '-'}`);
        await markEvidence(expected(header, 'Zone Isolate'), expected(card, `HN ${visit.hn}${badgeText ? ` · ป้าย ${badgeText}` : ''}`));
        expect(inColumn, 'การ์ดผู้ป่วย Isolation 2 ต้องอยู่ในคอลัมน์ Zone Isolate').toBe(true);
      });

      await startClip(page, tcId(27));
      await soft(`${TC(27)} ขั้น 2–3 ผู้ป่วยโซน Isolation 2 (จาก TC-025): Patient banner แสดง Isolation เลข 2`, async () => {
        await gotoVisit(page, visit);
        const chip = main.getByText(/^Isolation\s*2$/).first();
        await expect(chip, 'แถบผู้ป่วยต้องแสดง Isolation 2').toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(chip, 'Isolation 2'), expected(main.getByText(`VN ${visit.vn}`, { exact: true }).first(), visit.vn));
      });

      run.finish();
    },
  );

  // ------------------------------------------------------------------------------------------------
  test(
    'TC-026: คัดกรองโซน Isolation 1 → เลข 1 ที่ Patient banner (+ ป้ายบน ER Dashboard) (Super_User)',
    meta(26),
    async ({ page }) => {
      const run = makeRunner(page);
      const { note, soft } = run;
      const visit = await preparePatient(page, 'H', note);
      note('ผู้ป่วยที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      const f = form(page);
      const main = page.getByRole('main');

      await startClip(page, tcId(26));
      await soft(`${TC(26)} ขั้น 2 คัดกรองโซน Isolation 1 แล้วกดบันทึก`, async () => {
        await fillVitals(f, VITALS_TC);
        await f.panel.getByRole('group', { name: 'Common chief complaints' }).getByRole('button').first().click();
        await pickGcs(f, 4, 5, 6);
        await saveTriage(page, f, `คัดกรอง ${visit.en} (Isolation 1)`, 'Isolation 1');
      });
      await soft(`${TC(26)} ขั้น 3 Patient banner แสดง Isolation เลข 1`, async () => {
        const chip = main.getByText(/^Isolation\s*1$/).first();
        await expect(chip, 'แถบผู้ป่วยต้องแสดง Isolation 1').toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(chip, 'Isolation 1'), expected(main.getByText(`VN ${visit.vn}`, { exact: true }).first(), visit.vn));
      });
      await soft(`${TC(26)} (ประกอบ) ER Dashboard: การ์ดในคอลัมน์ Zone Isolate มีป้ายเลข 1`, async () => {
        await gotoErDashboard(page);
        const card = boardCard(page, visit.hn);
        await expect(card).toBeVisible({ timeout: 30_000 });
        await card.scrollIntoViewIfNeeded();
        const badge = card.locator('[title="Zone Isolate"], [aria-label="Zone Isolate"]').first();
        const badgeText = (await badge.count()) ? norm(await badge.innerText()) : '';
        note(`${TC(26)} ป้ายบนการ์ด`, badgeText || '-');
        await markEvidence(expected(main.getByText('Zone Isolate', { exact: true }).first(), 'Zone Isolate'), expected((await badge.count()) ? badge : card, `ป้าย ${badgeText || '-'}`));
        expect(badgeText).toBe('1');
      });

      run.finish();
    },
  );
});
