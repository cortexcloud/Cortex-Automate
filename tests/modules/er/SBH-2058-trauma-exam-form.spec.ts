import type { Browser, Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { physicianNotePanel, physicianNoteSaveButton } from '../../../helpers/functions/er-physician-note';
import { erTriagePanel, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, restartVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { recordNotices } from '../../../helpers/functions/notices';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { gotoVisit } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// SBH-2058 [ER][Form Exam] Trauma Exam Form — แพทย์กด Patient Card: ผู้ป่วย Trauma ได้ ER Physician Note โหมด Trauma (RTS · Primary Survey · PE by System ·
// Compression Test · Body Chart) · Non-Trauma ได้ฟอร์มเดิม · Acknowledge เหลือเฉพาะ Fast Track · เวลารอบนบอร์ดหยุดเมื่อแพทย์เริ่มทำงาน
// ชุด EXE SBH-3553 → HPY SBH-3556 (TC-001–043 = SBH-3560–3602) · UHP SBH-3558 (TC-044–046 = SBH-3603–3605)
// 1 เทส = 1 กลุ่มผู้ป่วย (R9) · ผู้ป่วย AUTO ใหม่ (R10) · คัดกรองด้วยหน้าหลัก (Super_User แทนพยาบาล) · TC ทำในหน้าต่าง Doctor (TC-046 หน้าต่าง Nurse) ·
// คลิป 1 ไฟล์ต่อ 1 TC (R61 — clip-TC-0xx.webm ของหน้าต่าง Doctor / Nurse) · TC ที่ไม่ผ่านไม่หยุดเทส (soft)
// หน้าจอ (dev-x 31 ต.ค. 2026 · index-DJaj9lPY.js): ฟอร์มแพทย์อยู่ใต้หัว "ER Physician Note" ทั้ง 2 โหมด (ไม่มีชื่อ Trauma Exam Form) · ส่วนต่างๆ เป็น web component (shadow DOM)
//   คลิกในฟอร์มแพทย์ครั้งแรก = POST …/physician-activity (แพทย์เริ่มการรักษา → เวลารอหยุด) · Body chart / Diagnosis โหลดไม่ได้ (emr-form-artifacts/body-chart.js · diagnosis-general.js 404) → ปุ่มบันทึก disabled
//   Suspect Fast Track (31 ต.ค.) = Not Suspect · STEMI · STROKE · SEPSIS · HEAD TRAUMA · TRAUMA WITH SHOCK → (2 พ.ย. ฟอร์มคัดกรองรุ่นใหม่) Not Suspect · Stroke · STEMI / ACS · Sepsis · Trauma Fast Track
//   2 พ.ย. dev-x: Trauma Fast Track บันทึกคัดกรองได้ 422 ทุกครั้ง → ผู้ป่วย Trauma (A D F G) ใช้ Stroke Fast Track ตามที่ผู้ใช้เลือก (TC-014 ลง Fail) · C (ไม่มีสัญญาณชีพ) ใช้ Not Suspect
// หลังเทส: ปิด Visit ที่การเงิน (afterEach) · SBH2058_KEEP=1 = ไม่ปิด · SBH2058_<A|B|C|D|E|F|G>=HN,VN,EN = ใช้ผู้ป่วยเดิม (ข้ามขั้นสร้าง + คัดกรอง)
// รัน (dev-x): npx playwright test --headed --grep @SBH-2058   (เทสเดียว: --grep "@SBH-3560" ฯลฯ)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ISSUE = (n: number) => `SBH-${3559 + n}`;
const tcId = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const TC = (n: number) => `${tcId(n)} (${ISSUE(n)})`;
const meta = (...tcs: number[]) => ({ tag: ['@SBH-2058', ...tcs.map((n) => `@${ISSUE(n)}`)], annotation: [linear('SBH-2058'), ...tcs.map((n) => linear(ISSUE(n)))] });

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const yes = (b: boolean) => (b ? 'มี' : 'ไม่มี');
const bad = (rows: CompareRow[]) => rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (Expected ${r.values[0]})`);
const TRIAGE_SAVED = 'กรอกข้อมูล คัดกรอง ER สำเร็จ';

/** fallback = Fast Track ที่ใช้แทนเมื่อบันทึกคัดกรองด้วย fastTrack ไม่ได้ (ถ่ายหลักฐานแจ้งเตือนก่อนสลับ) */
type Prep = { fastTrack: string; fallback?: string; trauma: boolean; vitals: boolean; gcs: boolean; underlying: boolean; level: number };
/** Fast Track ที่บันทึกคัดกรองได้จริงของผู้ป่วยแต่ละราย (A / B / …) */
const ftUsed: Record<string, string> = {};
// Retest 4 พ.ย. 2026: SBH2058_FT="Trauma Fast Track" = ผู้ป่วย A คัดกรองด้วย Trauma Fast Track (ตัวแก้ SBH-3839 ข้อ 2) · บันทึกไม่ได้ → สลับเป็น Stroke
const A_FAST_TRACK = process.env.SBH2058_FT || 'Stroke Fast Track';

// ------------------------------------------------------------------------------------------------
// หน้าต่างของบัญชีอื่น (context แยก · session .auth/<Role>.json · อัดวิดีโอ video-<Role>.webm)
async function openRoleWindow(browser: Browser, role: 'Doctor' | 'Nurse'): Promise<Page> {
  const context = await browser.newContext({ storageState: authFile(role), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await cacheAppAssets(context);
  await context.addInitScript(recordNotices);
  const page = await context.newPage();
  await page.goto('/cortex/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await trackVideo(page, role);
  return page;
}

async function closeRoleWindow(page: Page | undefined) {
  if (!page) return;
  await hideCompareTable(page).catch(() => undefined);
  await finishVideo(page).catch(() => undefined);
  await page.context().close().catch(() => undefined);
}

// ------------------------------------------------------------------------------------------------
// ฟอร์มแพทย์ (แผงขวา Clinical Information)
function note(doc: Page) {
  const pn = physicianNotePanel(doc);
  const title = (t: string) => pn.getByText(t, { exact: true }).first();
  const section = (t: string, inner: Locator) => pn.locator('div').filter({ has: doc.getByText(t, { exact: true }) }).filter({ has: inner }).last();
  // ช่อง System: รุ่น 2 พ.ย. เป็น dropdown (combobox) · ตัวแก้ SBH-3839 ข้อ 6 เปลี่ยนเป็นข้อความอิสระ → จับด้วย label ได้ทั้ง 2 แบบ
  const pe = pn.locator('div').filter({ has: doc.getByLabel('System 1', { exact: true }) }).filter({ has: doc.getByRole('button', { name: 'ปกติทั้งหมด' }) }).last();
  return {
    pn,
    title,
    section,
    heading: pn.getByRole('heading', { name: 'ER Physician Note', exact: true }),
    save: physicianNoteSaveButton(doc),
    alert: pn.getByRole('alert').first(),
    cc: pn.locator('textarea[placeholder="สรุปอาการและอื่น ๆ"]').first(),
    rts: pn.getByTestId('er-rts-card'),
    rtsResult: pn.getByTestId('er-rts-result'),
    ack: pn.locator('[data-testid="ack-row-fast_track"]'),
    ackTitle: title('การรับทราบของแพทย์'),
    fastTrack: pn.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first(),
    gcsSelect: (name: string) => pn.getByRole('combobox', { name }).first(),
    avpu: pn.getByRole('combobox', { name: 'AVPU' }).first(),
    radios: (group: string) => pn.getByRole('radiogroup', { name: group, exact: true }).first(),
    field: (name: string) => pn.getByLabel(name, { exact: true }).first(),
    ps: section('ER trauma primary survey', doc.getByRole('radiogroup', { name: 'ทางเดินหายใจ' })),
    psTitle: title('Trauma Primary Survey'),
    pe,
    peRows: () => pe.getByLabel(/^System \d+$/),
    compression: section('ER compression test', doc.getByRole('radiogroup', { name: 'Chest compression test' })),
    bodyChart: section('Body chart', doc.getByText(/ไม่สามารถแสดงฟอร์มได้|FRONT|Front/)),
    bodyChartTitle: title('Body chart'),
    noteToNurse: title('Note to nurse'),
  };
}
type Note = ReturnType<typeof note>;

/** รอฟอร์มแพทย์โหลดเสร็จ (มีช่อง Chief Complaint ในแผงขวา) */
async function waitNote(doc: Page) {
  const n = note(doc);
  await expect(n.heading, 'แผงขวาต้องมีหัว ER Physician Note').toBeVisible({ timeout: 90_000 });
  await expect(n.cc, 'ฟอร์มแพทย์ต้องโหลดเสร็จ').toBeVisible({ timeout: 120_000 });
  await expect(n.gcsSelect('Eye Opening (E)')).toBeVisible({ timeout: 60_000 });
  await doc.waitForTimeout(3_000);
  return n;
}

/** ตัวเลือกที่ถูกเลือกของ <select> */
const selectedText = (select: Locator) => select.evaluate((el) => (el as HTMLSelectElement).options[(el as HTMLSelectElement).selectedIndex]?.text ?? '');

/** ตำแหน่งแนวตั้งของ element (ใช้เทียบลำดับส่วน) */
const topOf = (l: Locator) => l.evaluate((el) => el.getBoundingClientRect().top + (document.scrollingElement?.scrollTop ?? 0)).catch(() => NaN);

/** มีเครื่องหมาย * กำกับป้ายไหม */
async function hasRequiredMark(label: Locator): Promise<boolean> {
  return label.evaluate((el) => {
    const nodes = [el, ...(el.parentElement ? Array.from(el.parentElement.children) : [])];
    return nodes.some((n) => {
      const t = (n.textContent ?? '').trim();
      return t === '*' || t.startsWith('*') || getComputedStyle(n, '::before').content.includes('*') || getComputedStyle(n, '::after').content.includes('*');
    });
  });
}

// ------------------------------------------------------------------------------------------------
// บอร์ด ER
const boardCard = (page: Page, hn: string) => page.getByRole('main').locator('div').filter({ has: page.getByText(`HN: ${hn}`, { exact: true }) }).filter({ hasText: /รอ/ }).last();
const waitLabel = (card: Locator) => card.getByText(/^รอ\s*[\d:]+\s*นาที$/).first();
const toSeconds = (t: string) => {
  const m = t.match(/(\d+):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

async function openBoardCard(page: Page, hn: string) {
  const card = boardCard(page, hn);
  // อยู่บนบอร์ดแล้ว = อ่านจากการ์ดเลย ไม่โหลดหน้าใหม่ (เวลารอบนการ์ดเดินเองทุกวินาที · โหลดบอร์ดใหม่ = จอขาว + วงโหลด 6–22 วิ ในคลิป — ผู้ใช้ทัก 2 พ.ย. 2026)
  if (await card.isVisible().catch(() => false)) {
    await card.scrollIntoViewIfNeeded();
    return card;
  }
  await gotoErDashboard(page);
  await expect(card, `ต้องเห็นการ์ดผู้ป่วย HN ${hn} บน ER Dashboard`).toBeVisible({ timeout: 60_000 });
  await card.scrollIntoViewIfNeeded();
  return card;
}

async function readWait(page: Page, hn: string) {
  const card = await openBoardCard(page, hn);
  const label = waitLabel(card);
  const text = norm(await label.innerText());
  return { card, label, text, seconds: toSeconds(text) };
}

/** กด Patient Card (ชื่อ HN บนการ์ด) แล้วรอหน้าผู้ป่วย */
async function clickCard(page: Page, card: Locator, hn: string) {
  const target = card.getByText(`HN: ${hn}`, { exact: true });
  await target.click();
  await expect(page.getByRole('main').getByText(`HN ${hn}`, { exact: true }).first(), 'ต้องเปิดหน้าผู้ป่วย').toBeVisible({ timeout: 90_000 });
}

// ------------------------------------------------------------------------------------------------
test.describe('SBH-2058 Trauma Exam Form · ER Physician Note (dev-x)', () => {
  test.describe.configure({ timeout: 3_600_000 });

  let opened: Map<string, ErVisit>;
  let windows: Page[] = [];

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
    windows = [];
  });

  test.afterEach(async ({ page }) => {
    for (const w of windows) await closeRoleWindow(w);
    await hideCompareTable(page).catch(() => undefined);
    if (process.env.SBH2058_KEEP) return;
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  /** ผู้ป่วย AUTO ใหม่ → เปิด Visit ER → คัดกรอง ER ตาม prep → บันทึก (หน้าหลัก · Super_User แทนพยาบาล) */
  async function preparePatient(page: Page, key: string, prep: Prep, say: (t: string, d: string) => void): Promise<ErVisit> {
    const reuse = process.env[`SBH2058_${key}`]?.split(',');
    if (reuse?.length === 3) {
      const visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
      ftUsed[key] = prep.fastTrack;
      say(`ผู้ป่วย ${key}`, `ใช้รายเดิม HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      if (process.env.SBH2058_CLOSE_REUSED) opened.set(visit.en, visit as ErVisit); // ใช้รายเดิมแล้วให้ afterEach ปิด Visit ด้วย
      return visit;
    }
    const visit = await checkStep(page, `เตรียมข้อมูล: ผู้ป่วย ${key} AUTO ใหม่ + เปิด Visit ER`, async () => {
      await gotoErDashboard(page);
      const patient = newTestPatient(`Tef${key}`);
      const v = await registerAndOpenErVisit(page, patient);
      say(`ผู้ป่วย ${key}`, `${patient.firstName} ${patient.familyName} · HN ${v.hn} · ${v.vn} · ${v.en} · ใช้ซ้ำ: SBH2058_${key}=${v.hn},${v.vn},${v.en}`);
      return v;
    });
    await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
    await checkStep(page, `เตรียมข้อมูล: คัดกรอง ผู้ป่วย ${key} (${prep.trauma ? 'Trauma' : 'Non-Trauma'} · ${prep.fastTrack})`, async () => {
      const panel = erTriagePanel(page);
      for (let attempt = 1; attempt <= 3; attempt++) {
        const ok = await expect(panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first()).toBeEnabled({ timeout: 90_000 }).then(() => true, () => false);
        if (ok && (await page.getByRole('main').getByText('ไม่สามารถแสดงฟอร์มได้').count()) === 0) break;
        say(`ผู้ป่วย ${key}`, `ฟอร์มคัดกรองโหลดไม่ครบ รอบ ${attempt} → โหลดหน้าใหม่`);
        await gotoVisit(page, visit);
      }
      await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first()).toBeEditable({ timeout: 60_000 });
      await panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first().selectOption({ label: prep.fastTrack });
      if (prep.trauma) await panel.getByRole('radiogroup', { name: 'ประเภทฉุกเฉิน' }).first().getByText('Trauma', { exact: true }).click();
      if (prep.vitals) {
        for (const [name, value] of [['Systolic', '120'], ['Diastolic', '80'], ['PR', '80'], ['RR', '20'], ['Temp', '37'], ['SpO2', '98']]) {
          await panel.getByRole('spinbutton', { name }).first().fill(value);
        }
      }
      await panel.getByRole('group', { name: 'Common chief complaints' }).getByRole('button').first().click();
      if (prep.gcs) {
        for (const [name, score] of [['Eye Opening (E)', 4], ['Verbal Response (V)', 5], ['Motor Response (M)', 6]] as const) {
          const select = panel.getByRole('combobox', { name }).first();
          const label = (await select.locator('option').allTextContents()).find((t) => t.startsWith(`${score} `));
          if (!label) throw new Error(`ไม่เจอตัวเลือก GCS ${name} คะแนน ${score}`);
          await select.selectOption({ label });
        }
      }
      // SBH2058_NO_UD=1 ข้ามการใส่โรคประจำตัว (4 พ.ย. 19:00 dev-x ส่วน Underlying Disease โหลดไม่ได้ ปิดการแก้ไข) — ใช้กับ TC ที่ไม่ตรวจ Underlying Disease
      if (prep.underlying && !process.env.SBH2058_NO_UD) {
        const section = page.getByRole('main').getByRole('heading', { name: /Underlying Disease/ }).first().locator('xpath=ancestor::div[.//table][1]');
        const input = section.getByRole('combobox').first();
        await section.scrollIntoViewIfNeeded();
        await input.click();
        await input.pressSequentially('I10', { delay: 40 });
        const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^I10 / }).first();
        await option.waitFor({ state: 'visible', timeout: 20_000 });
        await option.click();
        await section.getByRole('button', { name: /บันทึก/ }).first().click();
        await expect(section.locator('table').getByText('Essential (primary) hypertension', { exact: true })).toBeVisible({ timeout: 20_000 });
      }
      const levels = panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }).first();
      await levels.scrollIntoViewIfNeeded();
      await levels.getByText(String(prep.level), { exact: true }).click();
      await page.waitForTimeout(1_000);
      await markEvidence(filled(panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first(), prep.fastTrack));
      await snapEvidence(page, `ก่อนกด — บันทึกคัดกรอง ${key}`);
      await clearEvidenceMarks(page).catch(() => undefined);
      try {
        await saveErTriageForm(page, `บันทึกคัดกรอง ผู้ป่วย ${key}`);
        await expect(page.getByText(TRIAGE_SAVED, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
        ftUsed[key] = prep.fastTrack;
        say(`ผู้ป่วย ${key} คัดกรอง`, `บันทึกได้ด้วย ${prep.fastTrack}`);
      } catch (error) {
        if (!prep.fallback) throw error;
        const msg = (error as Error).message.split('\n')[0];
        say(`ผู้ป่วย ${key} คัดกรอง`, `บันทึกด้วย ${prep.fastTrack} ไม่ได้ (${msg}) → สลับเป็น ${prep.fallback}`);
        const toast = page.getByText(/ไม่ผ่านการตรวจสอบ|ไม่สำเร็จ/).first();
        const shown = await toast.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false);
        await markEvidence(filled(panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first(), prep.fastTrack), ...(shown ? [alerted(toast, 'บันทึกไม่ได้')] : []));
        await snapEvidence(page, `บันทึกไม่ได้ — ${prep.fastTrack} ${key}`);
        await clearEvidenceMarks(page).catch(() => undefined);
        await panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first().selectOption({ label: prep.fallback });
        await saveErTriageForm(page, `บันทึกคัดกรอง ผู้ป่วย ${key} (${prep.fallback})`);
        await expect(page.getByText(TRIAGE_SAVED, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
        ftUsed[key] = prep.fallback;
      }
    });
    return visit;
  }

  /** หน้าต่าง Doctor: ER Dashboard → กด Patient Card → รอฟอร์มแพทย์ */
  async function doctorOpens(doc: Page, visit: ErVisit): Promise<{ n: Note; card: Locator }> {
    const card = await openBoardCard(doc, visit.hn);
    await markEvidence(clicked(card.getByText(`HN: ${visit.hn}`, { exact: true }), 'Patient Card'));
    await snapEvidence(doc, `ก่อนกด — Patient Card ${visit.hn}`);
    await clickCard(doc, card, visit.hn);
    const n = await waitNote(doc);
    await restartVideo(doc); // ตัดช่วงจอขาวตอนหน้าผู้ป่วยโหลด (~8 วิ) ออกจากคลิปของ TC
    return { n, card };
  }

  // ================================================================================================
  test(
    'ผู้ป่วย A (Trauma): TC-001, 003–011, 013–038 ฟอร์มแพทย์โหมด Trauma (Doctor)',
    meta(1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38),
    async ({ page, browser }) => {
      const main = makeRunner(page);
      const visit = await preparePatient(page, 'A', { fastTrack: A_FAST_TRACK, fallback: A_FAST_TRACK === 'Stroke Fast Track' ? undefined : 'Stroke Fast Track', trauma: true, vitals: true, gcs: true, underlying: true, level: 2 }, main.note);
      const doc = await openRoleWindow(browser, 'Doctor');
      windows.push(doc);
      const { note: say, soft: softAll, finish } = makeRunner(doc);
      // SBH2058_ONLY=37,3 = เล่นเฉพาะ TC ที่ระบุ (ใช้กับผู้ป่วยเดิม SBH2058_A=… เก็บหลักฐานซ้ำบาง TC)
      const only = process.env.SBH2058_ONLY?.split(",").map((s) => tcId(Number(s)));
      const soft = (title: string, body: () => Promise<void>) => (only && !only.some((t) => title.startsWith(t)) ? Promise.resolve(true) : softAll(title, body));
      say('ผู้ป่วยที่ใช้', `A · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      const compare = (n: number, rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'left') => showCompareTable(doc, `${ISSUE(n)} ${tcId(n)}`, ['Expected', 'หน้าจอ'], rows, { side });
      const notFound: string[] = [];
      doc.on('response', (r) => { if (r.status() === 404 && r.url().includes('emr-form-artifacts')) notFound.push(r.url().split('/').pop() ?? r.url()); });
      let n!: Note;

      // TC-001
      await startClip(doc, tcId(1));
      await soft(`${TC(1)} กด Patient Card ผู้ป่วย Trauma → ฟอร์ม Trauma`, async () => {
        ({ n } = await doctorOpens(doc, visit));
        const has = {
          rts: await n.rts.count() > 0,
          ps: await n.psTitle.count() > 0,
          comp: await n.title('ER compression test').count() > 0,
          body: await n.bodyChartTitle.count() > 0,
        };
        const rows: CompareRow[] = [
          { label: 'ฟอร์มแผงขวา (ข้อสังเกต: ชื่อหัว)', values: ['Trauma Exam Form', `โหมด Trauma ใต้หัว "${norm(await n.heading.innerText())}"`], same: has.rts && has.ps },
          { label: 'Revised Trauma Score (RTS)', values: ['มี', yes(has.rts)], same: has.rts },
          { label: 'Primary Survey', values: ['มี', yes(has.ps)], same: has.ps },
          { label: 'Compression Test', values: ['มี', yes(has.comp)], same: has.comp },
          { label: 'Body Chart', values: ['มี', has.body ? 'มีหัวส่วน (เนื้อหาโหลดไม่ได้ — ดู TC-037)' : 'ไม่มี'], same: has.body },
        ];
        await compare(1, rows);
        await n.rts.scrollIntoViewIfNeeded();
        await markEvidence(expected(n.heading, 'แผงขวา'), expected(n.rts, 'RTS'), expected(n.psTitle, 'Primary Survey'));
        await snapEvidence(doc, 'TC-001 RTS + Primary Survey');
        const chest = n.compression.getByRole('radiogroup', { name: 'Chest compression test' });
        await chest.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await markEvidence(expected(n.pn.getByText('Chest compression test', { exact: true }).first(), 'Compression Test'));
        await snapEvidence(doc, 'TC-001 Compression Test');
        await n.bodyChartTitle.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await markEvidence(expected(n.bodyChartTitle, 'Body Chart (โหลดไม่ได้ ดู TC-037)'));
        expect(bad(rows)).toEqual([]);
      });
      if (!n) ({ n } = await doctorOpens(doc, visit)); // SBH2058_ONLY ที่ไม่มี 1 — ยังต้องเปิดฟอร์มแพทย์
      say(`${TC(1)} ข้อสังเกต`, `หัวแผงขวาเป็น "${norm(await n.heading.innerText().catch(() => ''))}" ไม่มีคำว่า Trauma Exam Form`);

      // TC-004 ลำดับส่วน
      await startClip(doc, tcId(4));
      await soft(`${TC(4)} ลำดับส่วนของฟอร์ม Trauma`, async () => {
        await hideCompareTable(doc);
        const order: [string, Locator][] = [
          ['Chief Complaint', n.title('Chief Complaint - General')],
          ['Present Illness', n.title('Present illness general')],
          ['Underlying Disease', n.title('Verified Underlying Disease')],
          ['Vital Signs', n.title('Vital signs')],
          ['RTS', n.rts],
          ['Primary Survey', n.psTitle],
          ['Physical Examination', n.title('Physical examination')],
          ['Body Chart', n.bodyChartTitle],
        ];
        const tops = await Promise.all(order.map(([, l]) => topOf(l)));
        const rows: CompareRow[] = order.map(([name], i) => ({
          label: `${i + 1}. ${name}`,
          values: [`ลำดับ ${i + 1}`, Number.isNaN(tops[i]) ? 'ไม่พบ' : `y ${Math.round(tops[i])}`],
          same: !Number.isNaN(tops[i]) && (i === 0 || tops[i] > tops[i - 1]),
        }));
        const all = await n.pn.evaluate((root) => {
          const titles = ['Chief Complaint - General', 'Present illness general', 'Verified Underlying Disease', 'Vital signs', 'Glasgow Coma Scale', 'MEWS', 'การจำแนกผู้ป่วย', 'Revised Trauma Score (RTS)', 'การรับทราบของแพทย์', 'Trauma Primary Survey', 'Physical examination', 'ER compression test', 'Body chart', 'Body metric general', 'Diagnosis general', 'Note to nurse'];
          const found: [string, number][] = [];
          const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const t = (node.textContent ?? '').trim();
              const r = node.parentElement?.getBoundingClientRect();
              if (titles.includes(t) && r && r.height > 0 && !found.some(([x]) => x === t)) found.push([t, r.top]);
            }
            if (node instanceof Element && node.shadowRoot) node.shadowRoot.childNodes.forEach(walk);
            node.childNodes.forEach(walk);
          };
          walk(root);
          return found.sort((a, b) => a[1] - b[1]).map(([t]) => t).join(' → ');
        });
        say(`${TC(4)} ลำดับทั้งหมดบนจอ`, all);
        await compare(4, rows);
        await n.title('Chief Complaint - General').scrollIntoViewIfNeeded();
        await markEvidence(expected(n.title('Chief Complaint - General'), '1'), expected(n.title('Present illness general'), '2'), expected(n.title('Verified Underlying Disease'), '3'));
        await snapEvidence(doc, 'TC-004 ลำดับ 1–3');
        // แต่ละส่วนห่างกัน ~800 px → ภาพละส่วน (เลื่อนให้อยู่กลางจอ กรอบไม่หลุดขอบบน)
        const center = (l: Locator) => l.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await clearEvidenceMarks(doc);
        await center(n.title('Vital signs'));
        await markEvidence(expected(n.title('Vital signs'), '4 Vital Signs'));
        await snapEvidence(doc, 'TC-004 ลำดับ 4');
        await clearEvidenceMarks(doc);
        await center(n.rts);
        await markEvidence(expected(n.rts, '5 RTS'), expected(n.psTitle, '6 Primary Survey'));
        await snapEvidence(doc, 'TC-004 ลำดับ 5–6');
        await clearEvidenceMarks(doc);
        await center(n.title('Physical examination'));
        await markEvidence(expected(n.title('Physical examination'), '7 Physical Examination'));
        await snapEvidence(doc, 'TC-004 ลำดับ 7');
        await clearEvidenceMarks(doc);
        await center(n.bodyChartTitle);
        await markEvidence(expected(n.bodyChartTitle, '8 Body Chart (ส่วนสุดท้ายของลำดับ)'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-005 ไม่มี Order to Nurse
      await startClip(doc, tcId(5));
      await soft(`${TC(5)} ฟอร์ม Trauma ไม่มีส่วน Order to Nurse`, async () => {
        await hideCompareTable(doc);
        const order = await n.pn.getByText(/Order to Nurse/i).count();
        const noteNurse = await n.noteToNurse.count();
        const rows: CompareRow[] = [
          { label: 'ส่วน Order to Nurse', values: ['ไม่มี', yes(order > 0)], same: order === 0 },
          { label: 'ส่วน Note to nurse (หมายเหตุถึงพยาบาล)', values: ['ไม่มี (ตัด section)', yes(noteNurse > 0)], same: noteNurse === 0 },
        ];
        await n.noteToNurse.scrollIntoViewIfNeeded().catch(() => undefined);
        await compare(5, rows);
        if (noteNurse) await markEvidence(expected(n.noteToNurse, 'ไม่มี · จริง: มีส่วน Note to nurse'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-006 Underlying Disease
      await startClip(doc, tcId(6));
      await soft(`${TC(6)} Underlying Disease เติมจากการคัดกรอง`, async () => {
        await hideCompareTable(doc);
        const ud = n.pn.locator('div').filter({ has: doc.getByText('Verified Underlying Disease', { exact: true }) }).filter({ has: doc.locator('table') }).last();
        await ud.scrollIntoViewIfNeeded();
        const row = ud.locator('tr').filter({ hasText: 'Essential (primary) hypertension' }).first();
        const has = await row.count() > 0;
        await compare(6, [{ label: 'โรคประจำตัว', values: ['Essential (primary) hypertension (I10 ที่คัดกรอง)', has ? norm(await row.innerText()).slice(0, 60) : 'ไม่พบ'], same: has }]);
        await markEvidence(expected(has ? row : ud, 'I10 จากคัดกรอง'));
        expect(has).toBe(true);
      });

      // TC-007 Vital Signs
      await startClip(doc, tcId(7));
      await soft(`${TC(7)} Vital Signs เติมจากการคัดกรอง`, async () => {
        await hideCompareTable(doc);
        // รุ่น 2 พ.ย. ไม่มีหัวซ่อน "Vital signs general" แล้ว → ใช้หัวการ์ด "Vital signs"
        const vs = n.pn.locator('div').filter({ has: doc.getByText(/^Vital signs( general)?$/) }).filter({ has: doc.getByRole('spinbutton', { name: 'Systolic' }) }).last();
        await vs.scrollIntoViewIfNeeded();
        const want: [string, string][] = [['Systolic', '120'], ['Diastolic', '80'], ['PR', '80'], ['RR', '20'], ['Temp', '37'], ['SpO2', '98']];
        const rows: CompareRow[] = [];
        for (const [name, value] of want) {
          const got = await vs.getByRole('spinbutton', { name }).first().inputValue().catch(() => '(ไม่พบ)');
          rows.push({ label: name, values: [value, got || '(ว่าง)'], same: Number(got) === Number(value) });
        }
        await compare(7, rows);
        await markEvidence(expected(vs, rows.map((r) => `${r.label} ${r.values[1]}`).join(' · ')));
        expect(bad(rows)).toEqual([]);
      });

      // TC-010 GCS อยู่ก่อน MEWS · TC-011 ไม่มี Acknowledge
      const gcsTitle = n.title('Glasgow Coma Scale');
      const mewsTitle = n.title('MEWS');
      const gcsCard = n.pn.locator('div').filter({ has: doc.getByRole('combobox', { name: 'Eye Opening (E)' }) }).filter({ hasText: /GCS \d+/ }).last();
      const mewsCard = n.pn.locator('div').filter({ has: doc.getByRole('combobox', { name: 'AVPU' }) }).filter({ hasText: /MEWS/ }).last();

      // TC-015 RTS (ก่อนแก้ GCS ใน TC-008)
      await startClip(doc, tcId(15));
      await soft(`${TC(15)} RTS จาก GCS 15 · SBP 120 · RR 20`, async () => {
        await hideCompareTable(doc);
        await n.rts.scrollIntoViewIfNeeded();
        const text = norm(await n.rts.innerText());
        const result = norm(await n.rtsResult.innerText().catch(() => text));
        const rows: CompareRow[] = [
          { label: 'ช่อง GCS', values: ['15', /GCS\s*15|GCS:4/.test(text) ? text.match(/GCS[^,)]*/)?.[0] ?? text : text], same: /GCS\s*15\b/.test(text) },
          // รุ่น 4 พ.ย. แสดง "GCS 15 · Systolic BP 120 · RR 20" + "Revised Trauma Score - 8 คะแนน" (ภาษาไทย) — รุ่น 2 พ.ย. แสดง "RTS = 12 (GCS:4, SBP:4, RR:4)"
          { label: 'ช่อง Systolic BP', values: ['120', text.match(/(SBP|Systolic BP)[^,)]*?\d+/)?.[0] ?? '(ไม่แสดง)'], same: /(SBP|Systolic BP)\s*120\b/.test(text) },
          { label: 'ช่อง RR', values: ['20', text.match(/RR[^,)]*?\d+/)?.[0] ?? '(ไม่แสดง)'], same: /RR\s*20\b/.test(text) },
          { label: 'แถบผล (ข้อสังเกต: คำว่า คะแนน)', values: ['Revised Trauma Score - 8 Points', result], same: /Revised Trauma Score\s*-\s*8\s*(Points|คะแนน)/i.test(result) },
        ];
        const bg = await n.rtsResult.evaluate((el) => {
          for (let e: Element | null = el; e; e = e.parentElement) {
            const c = getComputedStyle(e).backgroundColor;
            const m = c.match(/\d+/g);
            if (m && !(m.length === 4 && m[3] === '0') && c !== 'rgb(255, 255, 255)') return c;
          }
          return '';
        }).catch(() => '');
        const rgb = (bg.match(/\d+/g) ?? []).map(Number);
        const green = rgb.length >= 3 && rgb[1] > rgb[0] && rgb[1] > rgb[2];
        rows.push({ label: 'สีแถบผล', values: ['เขียว', green ? `เขียว (${bg})` : bg || '(ไม่มีสีพื้น)'], same: green });
        await compare(15, rows);
        await markEvidence(expected(n.rts, bad(rows).length ? `GCS 15 · SBP 120 · RR 20 · 8 Points · จริง: ${result}` : `GCS 15 · Systolic BP 120 · RR 20 · ${result.replace(/^.*?-\s*/, '')} สีเขียว`));
        expect(bad(rows)).toEqual([]);
      });

      // TC-008 GCS แบบใหม่
      await startClip(doc, tcId(8));
      await soft(`${TC(8)} GCS เลือก E4 V5 M5 → 14 / 15 ระดับเล็กน้อย`, async () => {
        await hideCompareTable(doc);
        await gcsTitle.scrollIntoViewIfNeeded();
        const marks: CompareRow[] = [];
        for (const name of ['Eye Opening (E)', 'Verbal Response (V)', 'Motor Response (M)']) {
          const label = n.pn.getByText(name, { exact: true }).first();
          const star = await hasRequiredMark(label);
          const isSelect = await n.gcsSelect(name).evaluate((el) => el.tagName === 'SELECT');
          marks.push({ label: `${name} เป็นช่องเลือก + *`, values: ['ช่องเลือก · มี *', `${isSelect ? 'ช่องเลือก' : 'ไม่ใช่ช่องเลือก'} · ${yes(star)} *`], same: isSelect && star });
        }
        for (const [name, score] of [['Eye Opening (E)', 4], ['Verbal Response (V)', 5], ['Motor Response (M)', 5]] as const) {
          const select = n.gcsSelect(name);
          const label = (await select.locator('option').allTextContents()).find((t) => t.startsWith(`${score} `));
          await select.selectOption({ label: label! });
        }
        await doc.waitForTimeout(1_500);
        const summary = norm(await gcsCard.innerText()).match(/GCS\s*\d+.*$/)?.[0] ?? '(ไม่พบแถบสรุป)';
        const ok = /14/.test(summary) && /E4\s*V5\s*M5/.test(summary) && /(Mild|เล็กน้อย)/i.test(summary);
        const rows: CompareRow[] = [...marks, { label: 'แถบสรุป', values: ['E4 V5 M5 14 / 15 ระดับเล็กน้อย', summary], same: ok }];
        await compare(8, rows);
        const noStar = marks.filter((r) => !r.same).map((r) => r.label.split(' ')[0]);
        await markEvidence(
          filled(n.gcsSelect('Motor Response (M)'), 'M5'),
          expected(gcsCard.getByText(/GCS\s*14/).first(), summary),
          // ป้ายเดียวที่หัวการ์ด GCS (ไม่ทับค่าในช่อง) · กรอบป้ายชื่อ E / V / M ไม่ใส่ป้าย
          ...(noStar.length ? [expected(gcsTitle, `ป้าย E / V / M ต้องมี * · จริง: ไม่มี (${noStar.length} ช่อง)`), ...['Eye Opening (E)', 'Verbal Response (V)', 'Motor Response (M)'].map((t) => n.pn.getByText(t, { exact: true }).first())] : []),
        );
        expect(bad(rows)).toEqual([]);
      });

      // TC-010
      await startClip(doc, tcId(10));
      await soft(`${TC(10)} GCS อยู่ก่อน MEWS`, async () => {
        await hideCompareTable(doc);
        await gcsTitle.scrollIntoViewIfNeeded();
        const [g, m] = [await topOf(gcsTitle), await topOf(mewsTitle)];
        await compare(10, [{ label: 'ตำแหน่ง', values: ['GCS เหนือ MEWS', g < m ? 'GCS เหนือ MEWS' : 'MEWS เหนือ GCS'], same: g < m }]);
        await markEvidence(expected(gcsTitle, '1 GCS'), expected(mewsTitle, '2 MEWS'));
        expect(g).toBeLessThan(m);
      });

      // TC-011
      await startClip(doc, tcId(11));
      await soft(`${TC(11)} ไม่มี Acknowledge ที่ GCS และ MEWS`, async () => {
        await hideCompareTable(doc);
        await gcsTitle.scrollIntoViewIfNeeded();
        const re = /Acknowledge|Reject|รับทราบ|ปฏิเสธ/;
        const g = await gcsCard.getByRole('button', { name: re }).count() + await gcsCard.getByText(/Acknowledged/).count();
        const m = await mewsCard.getByRole('button', { name: re }).count() + await mewsCard.getByText(/Acknowledged/).count();
        const ackRows = (await n.pn.locator('[data-testid^="ack-row-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid') ?? ''))).join(', ');
        say(`${TC(11)} แถวรับทราบในฟอร์ม`, ackRows || '(ไม่มี)');
        const rows: CompareRow[] = [
          { label: 'GCS: ปุ่ม Acknowledge / Reject', values: ['ไม่มี', yes(g > 0)], same: g === 0 },
          { label: 'MEWS: ปุ่ม Acknowledge / Reject', values: ['ไม่มี', yes(m > 0)], same: m === 0 },
          { label: 'แถวรับทราบที่มีในฟอร์ม', values: ['เฉพาะ Fast Track', ackRows || '(ไม่มี)'], same: !/mews|gcs/i.test(ackRows) },
        ];
        await compare(11, rows);
        await markEvidence(expected(gcsCard, 'ไม่มี Acknowledge'), expected(mewsCard, 'ไม่มี Acknowledge'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-013 Suspect Fast Track
      await startClip(doc, tcId(13));
      await soft(`${TC(13)} ตัวเลือก Suspect Fast Track ตามฟอร์มคัดกรอง`, async () => {
        await hideCompareTable(doc);
        await n.fastTrack.scrollIntoViewIfNeeded();
        const options = (await n.fastTrack.locator('option').allTextContents()).map(norm);
        const want = ['Not Suspect Fast Track', 'Stroke Fast Track', 'STEMI / ACS Fast Track', 'Sepsis Fast Track', 'Trauma Fast Track'];
        const rows: CompareRow[] = [
          { label: 'ชนิดช่อง', values: ['รายการตัวเลือก (ไม่ใช่ปุ่ม)', (await n.fastTrack.evaluate((el) => el.tagName)) === 'SELECT' ? 'รายการตัวเลือก' : 'อื่น'], same: true },
          { label: 'จำนวนตัวเลือก', values: ['5', String(options.length)], same: options.length === 5 },
          ...want.map((o, i) => ({ label: `ตัวเลือก ${i + 1}`, values: [o, options[i] ?? '(ไม่มี)'], same: options[i] === o })),
          ...options.slice(want.length).map((o, i) => ({ label: `ตัวเลือกเกิน ${i + 1}`, values: ['(ไม่มี)', o], same: false })),
        ];
        say(`${TC(13)} ตัวเลือกบนจอ`, options.join(' · '));
        await compare(13, rows, 'left');
        await markEvidence(expected(n.fastTrack, `5 ค่าตามคัดกรอง · จริง: ${options.length} ค่า`));
        expect(bad(rows)).toEqual([]);
      });

      // TC-009 MEWS แบบใหม่ (ทำหลัง 010 / 011 / 013 — ตาราง ? ค้างจนมีการคลิกปุ่มอื่นในแผง เช่น กาง Primary Survey)
      await startClip(doc, tcId(9));
      await soft(`${TC(9)} MEWS แบบใหม่ตามฟอร์มคัดกรอง`, async () => {
        await hideCompareTable(doc);
        await mewsTitle.scrollIntoViewIfNeeded();
        const avpu = (await n.avpu.locator('option').allTextContents()).map(norm);
        const result = norm(await mewsCard.innerText()).match(/MEWS\s*=.*$/)?.[0] ?? norm(await mewsCard.innerText()).slice(-80);
        const table = n.pn.getByRole('button', { name: 'MEWS scoring table' }).first();
        let tableText = '(ไม่มีปุ่มตาราง)';
        let visible: Record<string, string> = {};
        let pop: Locator | undefined;
        // ถ่าย AVPU + แถบผลก่อนเปิดตาราง (ตารางเปิดแล้วบังแถบผล)
        // ป้ายสั้น (ป้ายยาวหาที่ว่างไม่ได้ ไปลอยทับแผงซ้าย)
        await markEvidence(expected(n.avpu, 'AVPU: GCS(0) · A(0) · V(1) · P(2) · U(3)'), expected(mewsCard.getByText(/MEWS\s*=/).first(), `MEWS = ${result.match(/MEWS\s*=\s*(\d+)/)?.[1] ?? '?'} ${/Low Risk/i.test(result) ? 'Low Risk' : ''}`.trim()));
        await snapEvidence(doc, 'TC-009 AVPU + แถบ MEWS');
        if (await table.count()) {
          await markEvidence(clicked(table, 'ตารางคะแนน MEWS'));
          await snapEvidence(doc, 'ก่อนกด — ตาราง MEWS');
          await table.click();
          await doc.waitForTimeout(1_500);
          pop = doc.locator('.ant-popover:visible, .ant-modal:visible, [role="dialog"]:visible, [role="tooltip"]:visible').last();
          tableText = (await pop.count()) ? norm(await pop.innerText()) : '(กดแล้วไม่เห็นตาราง)';
          // ผู้ใช้ทัก 3 พ.ย.: ข้อความครบใน DOM แต่กล่องถูกตัด เห็นแค่ SBP / PR / RR → ตรวจว่าแถวแต่ละตัวมองเห็นบนจอจริง (hit-test ไล่ shadow DOM)
          const hitTest = (p: Locator) => p.evaluate((root) => {
              const out: Record<string, string> = {};
              for (const key of ['SBP', 'PR', 'RR', 'Temp', 'AVPU']) {
                const el = Array.from(root.querySelectorAll('*')).find((e) => Array.from(e.childNodes).some((c) => c.nodeType === 3 && c.textContent?.trim() === key)) as HTMLElement | undefined;
                if (!el) { out[key] = 'ไม่พบ'; continue; }
                const r = el.getBoundingClientRect();
                const x = r.left + Math.min(r.width / 2, 8);
                const y = r.top + r.height / 2;
                if (y < 0 || y > window.innerHeight || x < 0 || x > window.innerWidth) { out[key] = 'นอกจอ'; continue; }
                let hit: Element | null = document.elementFromPoint(x, y);
                while (hit?.shadowRoot) { const inner = hit.shadowRoot.elementFromPoint(x, y); if (!inner || inner === hit) break; hit = inner; }
                out[key] = hit && (hit === el || el.contains(hit) || hit.contains(el)) ? 'เห็น' : 'ถูกตัด / บัง';
              }
              return out;
            });
          if (await pop.count()) {
            // จังหวะ 1: ทันทีหลังกด ? (ไม่เลื่อนจอ) · ถ่ายภาพก่อนตีกรอบ (markEvidence เลื่อนจอแล้วกล่องขยับ)
            visible = await hitTest(pop);
            const seenNow = Object.entries(visible).filter(([, s]) => s === 'เห็น').map(([k]) => k);
            // ตีกรอบที่ปุ่ม ? (อยู่ในจออยู่แล้ว ไม่ทำให้จอเลื่อน) · ไม่ตีกรอบกล่องเกณฑ์ (ตีแล้วจอเลื่อน กล่องขยับ)
            await markEvidence(expected(table, seenNow.length === 5 ? 'กด ? เห็นเกณฑ์ครบ 5 แถว' : `เห็นครบ 5 แถว · จริง: เห็น ${seenNow.join(' · ') || '-'}`));
            await snapEvidence(doc, 'TC-009 กด ? กล่องเกณฑ์');
          }
        }
        const has = (re: RegExp) => re.test(tableText);
        const tableOk = has(/SBP/) && has(/PR/) && has(/RR/) && has(/Temp/) && has(/AVPU/);
        tableText = tableOk ? 'มีช่วงค่าและคะแนน SBP · PR · RR · Temp · AVPU (กดปุ่ม ?)' : tableText.slice(0, 120);
        const rows: CompareRow[] = [
          { label: 'AVPU', values: ['ปุ่ม GCS (V) · A (0) · V (1) · P (2) · U (3)', `ช่องเลือก: ${avpu.join(' · ')}`], same: avpu.length === 5 },
          { label: 'ตาราง SBP / PR / RR / Temp / AVPU', values: ['มีช่วงค่าและคะแนน', tableText], same: tableOk },
          { label: 'ปุ่ม ? เห็นเกณฑ์ครบ: ทันทีหลังกด (ผู้ใช้เพิ่ม 3 พ.ย.)', values: ['เห็นครบ 5 แถว', Object.entries(visible).map(([k, v]) => `${k}: ${v}`).join(' · ') || '(ไม่ได้ตรวจ)'], same: Object.keys(visible).length === 5 && Object.values(visible).every((v) => v === 'เห็น') },
          { label: 'แถบสรุป', values: ['Total MEWS 1 / 14 Low Risk', result], same: /MEWS\s*=\s*1\b/.test(result) && /Low Risk/i.test(result) },
        ];
        await compare(9, rows);
        // ภาพท้าย step: ตารางเทียบ + กรอบที่ปุ่ม ? (ตีกรอบไว้แล้วตอนถ่ายภาพกล่องเกณฑ์)
        expect(bad(rows)).toEqual([]);
      });

      // TC-016 / 018 / 021 / 025 / 026 Primary Survey (ดูอย่างเดียว — กางส่วนก่อน)
      await hideCompareTable(doc);
      await n.psTitle.scrollIntoViewIfNeeded();
      if (!(await n.radios('ทางเดินหายใจ').isVisible().catch(() => false))) {
        // ส่วน Primary Survey หุบไว้ตั้งต้น (defaultCollapse) → กดปุ่มลูกศรของรายการใต้หัว Trauma Primary Survey
        // รุ่น 31 ต.ค. = ปุ่มลูกศรในการ์ด "รายการใหม่" · รุ่น 2 พ.ย. = ปุ่มหัวการ์ด "collapsed Trauma Primary Survey …" (ส่วนย้ายขึ้นไปอยู่ก่อน Chief Complaint)
        const psCard = n.pn.locator('div').filter({ has: doc.getByRole('button', { name: /Trauma Primary Survey/ }) }).filter({ hasText: 'รายการใหม่' }).last();
        const oldToggle = psCard.getByRole('button').filter({ has: doc.getByRole('img', { name: 'collapsed' }) }).first();
        const toggle = (await oldToggle.count()) > 0 ? oldToggle : n.pn.getByRole('button', { name: /Trauma Primary Survey/ }).first();
        await markEvidence(clicked(toggle, 'กาง Primary Survey'));
        await snapEvidence(doc, 'ก่อนกด — กาง Primary Survey');
        await toggle.click();
        await expect(n.radios('ทางเดินหายใจ')).toBeVisible({ timeout: 15_000 });
      }
      const optionsOf = async (group: string) => (await n.radios(group).locator('label').allInnerTexts()).map(norm).filter(Boolean);
      const psCheck = async (num: number, heading: string, checks: [string, string[] | 'text' | 'number'][]) => {
        const head = n.pn.getByText(heading, { exact: true }).first();
        await hideCompareTable(doc);
        await head.evaluate((el) => el.scrollIntoView({ block: 'start' })); // ให้เห็นทั้งหัวข้อ (หัวข้อท้ายแผงเคยติดแค่หัว)
        await doc.waitForTimeout(500);
        const rows: CompareRow[] = [];
        for (const [name, want] of checks) {
          if (want === 'text' || want === 'number') {
            const f = n.field(name);
            const ok = (await f.count()) > 0;
            rows.push({ label: name, values: ['ช่องระบุ', ok ? 'ช่องระบุ' : 'ไม่พบ'], same: ok });
          } else {
            const got = await optionsOf(name).catch(() => [] as string[]);
            rows.push({ label: name, values: [want.join(' · '), got.join(' · ') || 'ไม่พบ'], same: want.every((w) => got.some((g) => g.replace(/\.$/, '') === w.replace(/\.$/, ''))) });
          }
        }
        await compare(num, rows, 'left');
        await markEvidence(expected(head, heading.split(' - ')[0]));
        expect(bad(rows)).toEqual([]);
      };
      await startClip(doc, tcId(16));
      await soft(`${TC(16)} Primary Survey หัวข้อ A`, () => psCheck(16, 'A - ทางเดินหายใจและการป้องกันกระดูกสันหลัง', [
        ['ทางเดินหายใจ', ['Patent', 'Stridor', 'อื่นๆ']], ['ทางเดินหายใจ อื่นๆ', 'text'], ['ETT No.', 'text'], ['ความลึก (cm)', 'number'], ['C-spine', ['no tenderness', 'tenderness', 'cannot evaluation']],
      ]));
      await startClip(doc, tcId(18));
      await soft(`${TC(18)} Primary Survey หัวข้อ B`, () => psCheck(18, 'B - การหายใจและการระบายอากาศ', [
        ['การหายใจ', ['Normal', 'Dyspnea', 'Apneic']], ['Trachea', ['Midline', 'Deviate to', 'Negative']], ['Tracheal deviation side', ['Rt', 'Lt']],
        ['Subcutaneous emphysema Rt', ['มี', 'ไม่มี', 'ไม่ทราบ']], ['Subcutaneous emphysema Lt', ['มี', 'ไม่มี', 'ไม่ทราบ']],
        ['Breath Sound', ['ไม่ทราบ', 'Clear', 'Abnormal']], ['Breath Sound Rt', 'text'], ['Breath Sound Lt', 'text'], ['Open pneumothorax at', 'text'],
      ]));
      await startClip(doc, tcId(21));
      await soft(`${TC(21)} Primary Survey หัวข้อ C`, async () => {
        await psCheck(21, 'C - ระบบไหลเวียนโลหิตและการห้ามเลือด', [
          ['Pulse at ER', ['Palpable', 'Pulseless']], ['Active bleeding', 'text'], ['Capillary refill', ['น้อยกว่าหรือเท่ากับ 2 วินาที', 'มากกว่า 2 วินาที']],
          ['Pelvic hematoma at', 'text'], ['E-FAST', ['ไม่ได้ทำ', 'Negative', 'Positive']], ['E-FAST diameter (cm)', 'number'],
          ['Subxyphoid', 'text'], ['Hepatorenal', 'text'], ['Splenorenal', 'text'], ['cul-de-sac', 'text'], ['Hemothorax', 'text'], ['Pneumothorax', 'text'],
        ]);
      });
      await startClip(doc, tcId(25));
      await soft(`${TC(25)} Primary Survey หัวข้อ D`, () => psCheck(25, 'D - การรู้สึกตัว', [
        ['รูม่านตาข้างซ้าย ขนาด (mm)', 'number'], ['รูม่านตาข้างซ้าย การตอบสนองต่อแสง', ['RTL', 'Sluggish', 'Fixed']],
        ['รูม่านตาข้างขวา ขนาด (mm)', 'number'], ['รูม่านตาข้างขวา การตอบสนองต่อแสง', ['RTL', 'Sluggish', 'Fixed']], ['DTX (mg/dL)', 'number'],
      ]));
      await startClip(doc, tcId(26));
      await soft(`${TC(26)} Primary Survey หัวข้อ E + หมายเหตุ`, () => psCheck(26, 'E - Exposure / Environment', [
        ['Log Roll', ['Normal', 'Abnormal']], ['Log Roll Abnormal', 'text'], ['Sphincter tone', ['Normal', 'Loose']], ['Content', 'text'],
        ['Bulbocavernous reflex', ['Positive', 'Negative']], ['หมายเหตุ', 'text'],
      ]));

      // TC-028 รายการ System เริ่มต้น
      await startClip(doc, tcId(28));
      await soft(`${TC(28)} รายการ System เริ่มต้นใต้ Physical Examination`, async () => {
        await hideCompareTable(doc);
        await n.pe.scrollIntoViewIfNeeded();
        const rowsEl = n.peRows();
        const systems = await rowsEl.evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).options[(e as HTMLSelectElement).selectedIndex]?.text ?? ''));
        const want = ['HEENT', 'Lung', 'Abdomen', 'Perineum', 'Back', 'Neuro', 'Extremities'];
        const perRow = await Promise.all(systems.map(async (_, i) => {
          const g = n.pe.getByRole('radiogroup', { name: `Clinical Interpretation ${i + 1}` });
          const opts = (await g.locator('label').allInnerTexts()).map(norm).join('/');
          const detail = await n.pe.getByLabel(`Detail ${i + 1}`, { exact: true }).count();
          return opts.includes('ปกติ') && opts.includes('ไม่ปกติ') && detail > 0;
        }));
        const delCount = await n.pe.getByRole('button', { name: 'ลบ', exact: true }).count();
        const links = await Promise.all(['ปกติทั้งหมด', 'ไม่ปกติทั้งหมด', 'ล้างทั้งหมด', '+ เพิ่มรายการ'].map((t) => n.pe.getByRole('button', { name: t, exact: true }).count()));
        const editor = await n.pe.getByRole('textbox').first().count();
        const rows: CompareRow[] = [
          { label: 'ช่องข้อความ (rich text) ด้านบน', values: ['มี', yes(editor > 0)], same: editor > 0 },
          { label: 'แถว System', values: [want.join(' · '), systems.join(' · ')], same: want.every((w, i) => systems[i] === w) && systems.length === want.length },
          { label: 'แต่ละแถว ปกติ / ไม่ปกติ / รายละเอียด / ลบ', values: ['ครบทุกแถว', `${perRow.filter(Boolean).length}/${systems.length} แถว · ปุ่มลบ ${delCount}`], same: perRow.every(Boolean) && delCount >= systems.length },
          { label: 'ปกติทั้งหมด · ไม่ปกติทั้งหมด · ล้างทั้งหมด · + เพิ่มรายการ', values: ['มีครบ', links.map((c) => yes(c > 0)).join(' · ')], same: links.every((c) => c > 0) },
        ];
        await compare(28, rows);
        await markEvidence(expected(n.pe.getByText('System', { exact: true }).first(), '7 System'), expected(n.pe.getByRole('button', { name: 'ปกติทั้งหมด', exact: true }), 'ลิงก์'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-034 Compression Test (ยังไม่เลือก)
      await startClip(doc, tcId(34));
      await soft(`${TC(34)} ส่วน Compression Test ก่อนเลือก`, async () => {
        await hideCompareTable(doc);
        await n.compression.scrollIntoViewIfNeeded();
        const rows: CompareRow[] = [];
        for (const g of ['Chest compression test', 'Pelvic compression test']) {
          const opts = (await n.compression.getByRole('radiogroup', { name: g }).locator('label').allInnerTexts()).map(norm).filter(Boolean);
          const sides = await n.compression.getByRole('checkbox', { name: new RegExp(`${g.split(' ')[0]}.*(Rt|Lt)`, 'i') }).count();
          rows.push({ label: `${g}`, values: ['Negative · Positive · Rt. · Lt. (Rt./Lt. สีเทา)', `${opts.join(' · ') || 'ไม่พบ'}${sides ? ` · Rt/Lt ${sides} ช่อง` : ' · ไม่มี Rt./Lt.'}`], same: opts.includes('Negative') && opts.includes('Positive') && sides >= 2 });
        }
        await compare(34, rows);
        await markEvidence(expected(n.compression.getByRole('radiogroup', { name: 'Chest compression test' }), `Negative/Positive/Rt./Lt. · จริง: ${rows[0].values[1]}`));
        expect(bad(rows)).toEqual([]);
      });

      // TC-037 Body Chart
      await startClip(doc, tcId(37));
      await soft(`${TC(37)} ส่วน Body Chart แสดงภาพร่างกาย`, async () => {
        await hideCompareTable(doc);
        await n.bodyChartTitle.scrollIntoViewIfNeeded();
        // 31 ต.ค. ส่วนนี้ขึ้น "ไม่สามารถแสดงฟอร์มได้" (404) · 2 พ.ย. โหลดได้ (ปุ่มเครื่องมือวาด + select "ER Body Chart - Male" + ภาพ) — ไม่มีคำว่า "รายการ" แล้ว
        const box = n.pn
          .locator('div')
          .filter({ has: doc.getByText('Body chart', { exact: true }) })
          .filter({ has: doc.getByText(/ไม่สามารถแสดงฟอร์มได้|ER Body Chart/).or(doc.getByRole('combobox').filter({ hasText: /Body Chart/ })) })
          .filter({ hasNot: doc.getByText('Body metric general', { exact: true }) })
          .last();
        await box.scrollIntoViewIfNeeded();
        const failed = (await box.getByText('ไม่สามารถแสดงฟอร์มได้').count()) > 0;
        const imgs = await box.locator('img, canvas, svg image').count();
        say(`${TC(37)} ไฟล์ฟอร์มที่ตอบ 404`, [...new Set(notFound)].join(', ') || '(ไม่มี)');
        const rows: CompareRow[] = [
          { label: 'ภาพ FRONT / BACK VIEW · HEAD · HANDS · FEET', values: ['แสดง', failed ? 'ไม่สามารถแสดงฟอร์มได้' : `ภาพ ${imgs} รูป`], same: !failed && imgs > 0 },
          { label: 'ไฟล์ฟอร์ม body-chart.js', values: ['โหลดได้', notFound.some((u) => u.includes('body-chart')) ? '404' : 'ไม่เห็น 404'], same: !notFound.some((u) => u.includes('body-chart')) },
        ];
        await compare(37, rows);
        const err = n.pn.getByText('ไม่สามารถแสดงฟอร์มได้').first(); // ส่วนแรกที่แสดงไม่ได้ = Body chart (Diagnosis อยู่ถัดไป)
        await markEvidence(expected(failed ? err : box, failed ? 'ภาพร่างกาย · จริง: ไม่สามารถแสดงฟอร์มได้' : 'Body Chart'));
        expect(bad(rows)).toEqual([]);
      });

      // ---------------- ขั้นที่กรอก / กด (แพทย์เริ่มทำงานกับผู้ป่วย A) ----------------
      // TC-003 ฟอร์มคัดกรองแบบอ่านอย่างเดียว (แผงซ้าย)
      await startClip(doc, tcId(3));
      await soft(`${TC(3)} แผงคัดกรองของพยาบาลแบบอ่านอย่างเดียว`, async () => {
        await hideCompareTable(doc);
        const mainArea = doc.getByRole('main');
        const triage = mainArea.locator('div').filter({ has: doc.getByText('คัดกรอง ER', { exact: true }) }).filter({ has: doc.getByRole('combobox', { name: 'Suspect Fast Track Type' }) }).filter({ hasNot: doc.getByRole('heading', { name: 'ER Physician Note', exact: true }) }).last();
        if ((await triage.count()) === 0) {
          // รุ่น 4 พ.ย. (ตัวแก้ SBH-3839 ข้อ 3): แผงซ้ายของแพทย์เป็นมุมมองอ่านอย่างเดียว ไม่มีช่องกรอก → ตรวจค่าที่แสดง + ไล่หาช่องที่แก้ได้ (รวม shadow DOM)
          // คำ "คัดกรอง ER" มีในเมนูซ้ายของแอปด้วย (x < 40) → เลือกตัวที่อยู่ในแผงเนื้อหา
          let head = mainArea.getByText('คัดกรอง ER', { exact: true }).first();
          for (const h of await mainArea.getByText('คัดกรอง ER', { exact: true }).all()) {
            const b = await h.boundingBox();
            if (b && b.x > 60 && b.width > 0) { head = h; break; }
          }
          await head.scrollIntoViewIfNeeded();
          await doc.waitForTimeout(800);
          const pnBox = await n.pn.boundingBox();
          const headBox = await head.boundingBox();
          const scan = async () => doc.evaluate(({ minX, maxX, minY }) => {
            const editable: string[] = [];
            const texts: string[] = [];
            const walk = (root: Document | ShadowRoot) => {
              for (const el of Array.from(root.querySelectorAll('*'))) {
                if (el.shadowRoot) walk(el.shadowRoot);
                const r = el.getBoundingClientRect();
                if (!r.width || !r.height || r.left < minX || r.left >= maxX || r.top < minY || r.top > window.innerHeight) continue;
                const tag = el.tagName;
                const input = el as HTMLInputElement;
                const isField = (tag === 'INPUT' && input.type !== 'hidden') || tag === 'SELECT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
                if (isField) {
                  const off = input.disabled || input.readOnly || !!el.closest('[aria-disabled="true"],[inert]') || getComputedStyle(el).pointerEvents === 'none';
                  if (!off) editable.push(`${tag.toLowerCase()}${input.type ? `[${input.type}]` : ''} ${el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? el.getAttribute('name') ?? ''}`.trim());
                }
                for (const node of Array.from(el.childNodes)) if (node.nodeType === 3 && node.textContent?.trim()) texts.push(node.textContent.trim());
              }
            };
            walk(document);
            return { editable, text: texts.join(' ') };
          }, { minX: (headBox?.x ?? 90) - 40, maxX: pnBox?.x ?? 960, minY: (headBox?.y ?? 0) - 5 });
          const s1 = await scan();
          say(`${TC(3)} แผงซ้าย (ข้อความ)`, s1.text.slice(0, 900));
          say(`${TC(3)} แผงซ้าย (ช่องที่แก้ได้)`, s1.editable.join(' · ') || 'ไม่มี');
          const ftShown = s1.text.match(/Fast Track Type\s+(\S+)/)?.[1] ?? '';
          const ftOk = !!ftShown && ftUsed.A.toLowerCase().startsWith(ftShown.toLowerCase());
          const ftLabel = mainArea.getByText('Fast Track Type', { exact: true }).first();
          // ลองแก้: คลิกค่าที่แสดงแล้วพิมพ์ — มุมมองอ่านอย่างเดียวค่าต้องไม่เปลี่ยน
          const value = mainArea.getByText(ftShown || 'trauma', { exact: true }).first();
          await doc.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); // กันพิมพ์ลงช่องของฟอร์มแพทย์ที่โฟกัสค้าง
          await value.click().catch(() => undefined);
          await doc.keyboard.type('130');
          await doc.waitForTimeout(800);
          const s2 = await scan();
          const changed = s2.text.includes('130') && !s1.text.includes('130');
          const rows: CompareRow[] = [
            { label: 'ค่าที่พยาบาลบันทึก: Fast Track Type', values: [ftUsed.A, ftShown || '(ไม่พบ)'], same: ftOk },
            ...(/Trauma Classification\s+(\S+)/.test(s1.text) ? [{ label: 'ค่าที่พยาบาลบันทึก: Trauma Classification', values: ['trauma', s1.text.match(/Trauma Classification\s+(\S+)/)![1]], same: /^trauma$/i.test(s1.text.match(/Trauma Classification\s+(\S+)/)![1]) }] : []),
            { label: 'ช่องที่แก้ไขได้ในแผงคัดกรอง', values: ['ไม่มี (อ่านอย่างเดียว)', s1.editable.length ? `${s1.editable.length} ช่อง: ${s1.editable.slice(0, 4).join(' · ')}` : 'ไม่มี'], same: s1.editable.length === 0 },
            { label: 'คลิกค่าแล้วพิมพ์ 130', values: ['ค่าไม่เปลี่ยน', changed ? 'ค่าเปลี่ยน' : 'ค่าไม่เปลี่ยน'], same: !changed },
          ];
          await compare(3, rows, 'right');
          // ป้ายเดียวที่หัวแผง · กรอบค่า Fast Track ไม่ใส่ป้าย (ป้ายยาวทับการ์ด Trauma Classification ข้างกัน)
          await markEvidence(expected(head, `อ่านอย่างเดียว · Fast Track Type: ${ftShown || 'ไม่พบ'} · ช่องที่แก้ได้: ${s1.editable.length}`), ftLabel.locator('xpath=..'));
          expect(bad(rows)).toEqual([]);
          return;
        }
        await triage.scrollIntoViewIfNeeded();
        const ft = triage.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first();
        const sys = triage.getByRole('spinbutton', { name: 'Systolic' }).first();
        const ftNow = norm(await selectedText(ft));
        const sysNow = await sys.inputValue().catch(() => '');
        const ftEnabled = await ft.isEnabled();
        const sysEditable = await sys.isEditable().catch(() => false);
        const rows: CompareRow[] = [
          { label: 'ค่าที่พยาบาลบันทึก: Suspect Fast Track', values: [ftUsed.A, ftNow], same: ftNow === ftUsed.A },
          { label: 'ค่าที่พยาบาลบันทึก: Systolic', values: ['120', sysNow || '(ว่าง)'], same: sysNow === '120' },
        ];
        // ลองแก้ระดับ Systolic (ไม่กดบันทึก) แล้วคืนค่า
        let changed = false;
        if (sysEditable) {
          await sys.fill('130');
          changed = (await sys.inputValue()) === '130';
          await markEvidence(filled(sys, 'ลองแก้ 120 → 130'));
          await snapEvidence(doc, 'TC-003 ลองแก้ Systolic');
          await sys.fill('120');
        }
        rows.push(
          { label: 'Suspect Fast Track แก้ได้', values: ['ไม่ได้', ftEnabled ? 'ได้' : 'ไม่ได้'], same: !ftEnabled },
          { label: 'Systolic แก้ได้', values: ['ไม่ได้', changed ? 'ได้ (พิมพ์ 130 ได้)' : sysEditable ? 'ช่องเปิดแต่ค่าไม่เปลี่ยน' : 'ไม่ได้'], same: !changed },
        );
        await compare(3, rows, 'right');
        await markEvidence(expected(sys, changed ? 'แก้ไม่ได้ · จริง: พิมพ์ 130 ได้' : 'แก้ไม่ได้'), expected(ft, ftEnabled ? 'แก้ไม่ได้ · จริง: เลือกได้' : 'อ่านอย่างเดียว'));
        expect(bad(rows)).toEqual([]);
      });

      // ช่องสีเทาของ Primary Survey: เช็กก่อนเลือก (disabled) → เลือก → กรอก
      const grey = async (num: number, title: string, opts: { group?: string; choose: string; checkboxChoose?: string; target: string; kind: 'text' | 'number' | 'checkbox'; value?: string; others?: string[]; sideGroup?: string; sideLabel?: string }) => {
        await hideCompareTable(doc);
        const target = n.field(opts.target);
        // Rt / Lt ของ E-FAST เป็นปุ่มสลับ (checkbox ซ่อน) → กด / ตีกรอบที่ป้าย
        const visual = opts.sideGroup ? n.pn.getByRole('group', { name: opts.sideGroup }).getByText(opts.sideLabel!, { exact: true }) : target;
        await visual.scrollIntoViewIfNeeded();
        const before = await target.isDisabled();
        const othersBefore = await Promise.all((opts.others ?? []).map((o) => n.field(o).isDisabled()));
        await markEvidence(expected(visual, before ? `${opts.sideLabel ?? opts.target}: สีเทา` : `${opts.sideLabel ?? opts.target}: เลือกได้ก่อน ${opts.choose}`));
        await snapEvidence(doc, `${tcId(num)} ก่อนเลือก ${opts.choose}`);
        if (opts.checkboxChoose) {
          await n.field(opts.checkboxChoose).check();
        } else {
          await n.radios(opts.group!).getByText(opts.choose, { exact: true }).click();
        }
        await doc.waitForTimeout(500);
        const after = await target.isEnabled();
        let shown = '';
        if (after) {
          if (opts.kind === 'checkbox') {
            await visual.click();
            await doc.waitForTimeout(500);
            shown = (await target.isChecked()) ? 'ติ๊กแล้ว' : 'ติ๊กไม่ติด';
          } else {
            await target.fill(opts.value!);
            await target.press('Tab');
            shown = await target.inputValue();
          }
        }
        const rows: CompareRow[] = [
          { label: `ก่อนเลือก ${opts.choose}: ${opts.target}`, values: ['สีเทา กรอกไม่ได้', before ? 'สีเทา กรอกไม่ได้' : 'กรอกได้'], same: before },
          ...(opts.others ?? []).map((o, i) => ({ label: `ก่อนเลือก: ${o}`, values: ['สีเทา', othersBefore[i] ? 'สีเทา' : 'เลือกได้'], same: othersBefore[i] })),
          { label: `หลังเลือก ${opts.choose}`, values: [opts.kind === 'checkbox' ? 'ติ๊กได้' : `กรอกได้ แสดง ${opts.value}`, after ? (opts.kind === 'checkbox' ? shown : `กรอกได้ แสดง ${shown}`) : 'ยังสีเทา'], same: after && (opts.kind === 'checkbox' ? shown === 'ติ๊กแล้ว' : shown === opts.value) },
        ];
        await compare(num, rows);
        await markEvidence(clicked(opts.checkboxChoose ? n.field(opts.checkboxChoose) : n.radios(opts.group!).getByText(opts.choose, { exact: true }), opts.choose), expected(visual, opts.kind === 'checkbox' ? `${opts.sideLabel} ${shown}` : `แสดง ${shown}`));
        expect(bad(rows)).toEqual([]);
      };
      await startClip(doc, tcId(17));
      await soft(`${TC(17)} ทางเดินหายใจ อื่นๆ → ช่องระบุ`, () => grey(17, 'A', { group: 'ทางเดินหายใจ', choose: 'อื่นๆ', target: 'ทางเดินหายใจ อื่นๆ', kind: 'text', value: 'Gurgling' }));
      await startClip(doc, tcId(19));
      await soft(`${TC(19)} Trachea Deviate to → Rt.`, async () => {
        await hideCompareTable(doc);
        const sides = n.radios('Tracheal deviation side');
        await sides.scrollIntoViewIfNeeded();
        const rt = sides.getByRole('radio', { name: 'Rt', exact: true });
        const lt = sides.getByRole('radio', { name: 'Lt', exact: true });
        const before = [await rt.isDisabled(), await lt.isDisabled()];
        await markEvidence(expected(sides, before.every(Boolean) ? 'Rt / Lt สีเทา' : 'เลือกได้ก่อน'));
        await snapEvidence(doc, 'TC-019 ก่อนเลือก Deviate to');
        await n.radios('Trachea').getByText('Deviate to', { exact: true }).click();
        await doc.waitForTimeout(500);
        const enabled = await rt.isEnabled();
        if (enabled) await sides.getByText('Rt', { exact: true }).click();
        const checked = await rt.isChecked();
        const rows: CompareRow[] = [
          { label: 'ก่อนเลือก Deviate to: Rt. / Lt.', values: ['สีเทา เลือกไม่ได้', before.every(Boolean) ? 'สีเทา เลือกไม่ได้' : 'เลือกได้'], same: before.every(Boolean) },
          { label: 'หลังเลือก Deviate to', values: ['เลือกได้ · Rt. ถูกเลือก', `${enabled ? 'เลือกได้' : 'ยังสีเทา'} · Rt. ${checked ? 'ถูกเลือก' : 'ไม่ถูกเลือก'}`], same: enabled && checked },
        ];
        await compare(19, rows);
        await markEvidence(clicked(n.radios('Trachea').getByText('Deviate to', { exact: true })), expected(sides, 'Rt. ถูกเลือก'));
        expect(bad(rows)).toEqual([]);
      });
      await startClip(doc, tcId(20));
      await soft(`${TC(20)} Breath Sound Abnormal → Rt / Lt`, async () => {
        await grey(20, 'B', { group: 'Breath Sound', choose: 'Abnormal', target: 'Breath Sound Rt', kind: 'text', value: 'decreased', others: ['Breath Sound Lt'] });
        const lt = n.field('Breath Sound Lt');
        const rt = n.field('Breath Sound Rt');
        await lt.fill('clear');
        await lt.press('Tab');
        // กรอก Lt แล้วหน้าเลื่อน → ล้างกรอบเดิม (ค้างที่พิกัดเก่า) แล้ววาดใหม่ทั้งชุด
        await clearEvidenceMarks(doc);
        await n.radios('Breath Sound').scrollIntoViewIfNeeded();
        await markEvidence(clicked(n.radios('Breath Sound').getByText('Abnormal', { exact: true }), 'Abnormal'), expected(rt, `Rt: ${await rt.inputValue()}`), expected(lt, `Lt: ${await lt.inputValue()}`));
        expect(await lt.inputValue()).toBe('clear');
      });
      await startClip(doc, tcId(22));
      await soft(`${TC(22)} E-FAST Positive → ระบุขนาด`, () => grey(22, 'C', { group: 'E-FAST', choose: 'Positive', target: 'E-FAST diameter (cm)', kind: 'number', value: '2' }));
      await startClip(doc, tcId(23));
      await soft(`${TC(23)} E-FAST Hemothorax → Lt.`, () => grey(23, 'Rt. / Lt.', { choose: 'Hemothorax', checkboxChoose: 'Hemothorax', target: 'Hemothorax Lt', kind: 'checkbox', others: ['Hemothorax Rt'], sideGroup: 'Hemothorax side', sideLabel: 'Lt' }));
      await startClip(doc, tcId(24));
      await soft(`${TC(24)} E-FAST Pneumothorax → Rt.`, () => grey(24, 'Rt. / Lt.', { choose: 'Pneumothorax', checkboxChoose: 'Pneumothorax', target: 'Pneumothorax Rt', kind: 'checkbox', others: ['Pneumothorax Lt'], sideGroup: 'Pneumothorax side', sideLabel: 'Rt' }));
      await startClip(doc, tcId(27));
      await soft(`${TC(27)} Log Roll Abnormal → ช่องระบุ`, () => grey(27, 'E', { group: 'Log Roll', choose: 'Abnormal', target: 'Log Roll Abnormal', kind: 'text', value: 'Tenderness T10-L1' }));

      // TC-030 / 031 / 029 Physical Examination
      const addBtn = n.pe.getByRole('button', { name: '+ เพิ่มรายการ', exact: true });
      await startClip(doc, tcId(30));
      await soft(`${TC(30)} กด + เพิ่มรายการ → แถว System ใหม่`, async () => {
        await hideCompareTable(doc);
        await n.pe.scrollIntoViewIfNeeded();
        const before = await n.peRows().count();
        const enabled = await addBtn.isEnabled();
        await markEvidence(clicked(addBtn, enabled ? '+ เพิ่มรายการ' : 'ปุ่มสีเทา (disabled)'));
        await snapEvidence(doc, 'TC-030 ก่อนกด เพิ่มรายการ');
        if (enabled) await addBtn.click();
        await doc.waitForTimeout(800);
        const after = await n.peRows().count();
        const rows: CompareRow[] = [
          { label: 'ปุ่ม + เพิ่มรายการ', values: ['กดได้', enabled ? 'กดได้' : `กดไม่ได้ (มี ${before} แถว)`], same: enabled },
          { label: 'จำนวนแถว', values: [`${before + 1}`, `${after}`], same: after === before + 1 },
        ];
        await compare(30, rows);
        await markEvidence(expected(enabled ? n.peRows().last() : addBtn, `${before + 1} แถว · จริง: ${after} แถว`));
        expect(bad(rows)).toEqual([]);
      });
      await startClip(doc, tcId(31));
      await soft(`${TC(31)} กดลบแถว Perineum`, async () => {
        await hideCompareTable(doc);
        const systems = async () => n.peRows().evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).options[(e as HTMLSelectElement).selectedIndex]?.text ?? ''));
        const before = await systems();
        const idx = before.indexOf('Perineum');
        expect(idx, 'ต้องมีแถว Perineum').toBeGreaterThanOrEqual(0);
        const row = n.pe.locator('div').filter({ has: doc.getByRole('combobox', { name: `System ${idx + 1}`, exact: true }) }).filter({ has: doc.getByRole('button', { name: 'ลบ', exact: true }) }).last();
        const del = row.getByRole('button', { name: 'ลบ', exact: true });
        await row.scrollIntoViewIfNeeded();
        await markEvidence(clicked(del, 'ลบ Perineum'));
        await snapEvidence(doc, 'ก่อนกด — ลบ Perineum');
        await del.click();
        await doc.waitForTimeout(800);
        const after = await systems();
        const rest = before.filter((s) => s !== 'Perineum');
        const rows: CompareRow[] = [
          { label: 'แถว Perineum', values: ['หายไป', after.includes('Perineum') ? 'ยังอยู่' : 'หายไป'], same: !after.includes('Perineum') },
          { label: 'แถวอื่น', values: [rest.join(' · '), after.join(' · ')], same: rest.join('|') === after.join('|') },
        ];
        await compare(31, rows);
        await markEvidence(expected(n.pe.getByText('System', { exact: true }).first(), after.join(' · ')));
        expect(bad(rows)).toEqual([]);
      });
      await startClip(doc, tcId(29));
      await soft(`${TC(29)} ช่อง System เป็นข้อความอิสระ`, async () => {
        await hideCompareTable(doc);
        if (await addBtn.isEnabled()) {
          await markEvidence(clicked(addBtn, '+ เพิ่มรายการ'));
          await snapEvidence(doc, 'ก่อนกด — เพิ่มรายการ (TC-029)');
          await addBtn.click();
          await doc.waitForTimeout(800);
        }
        const last = n.peRows().last();
        await last.scrollIntoViewIfNeeded();
        const tag = await last.evaluate((el) => el.tagName);
        const options = (await last.locator('option').allTextContents()).map(norm);
        let typed = '(พิมพ์ไม่ได้)';
        if (tag !== 'SELECT') {
          await last.fill('Pelvis');
          typed = await last.inputValue();
        }
        const rows: CompareRow[] = [
          { label: 'ชนิดช่อง System', values: ['ข้อความอิสระ', tag === 'SELECT' ? `รายการเลือก (${options.join(' · ')})` : 'ข้อความอิสระ'], same: tag !== 'SELECT' },
          { label: 'พิมพ์ "Pelvis"', values: ['แสดง Pelvis', typed], same: typed === 'Pelvis' },
        ];
        await compare(29, rows);
        await markEvidence(expected(last, `พิมพ์ Pelvis · จริง: ${tag === 'SELECT' ? 'Dropdown' : typed}`));
        expect(bad(rows)).toEqual([]);
      });
      const interp = async () => Promise.all((await n.peRows().all()).map(async (_, i) => {
        const g = n.pe.getByRole('radiogroup', { name: `Clinical Interpretation ${i + 1}` });
        if (await g.getByRole('radio', { name: 'ไม่ปกติ', exact: true }).isChecked()) return 'ไม่ปกติ';
        if (await g.getByRole('radio', { name: 'ปกติ', exact: true }).isChecked()) return 'ปกติ';
        return '-';
      }));
      await startClip(doc, tcId(32));
      await soft(`${TC(32)} เลือก Lung ไม่ปกติ แล้วกด ปกติทั้งหมด`, async () => {
        await hideCompareTable(doc);
        // แถวว่าง "เลือกระบบ" ที่ TC-029 เพิ่มไว้ → ลบออกก่อน (ให้ตารางกลับเป็นแถว System ปกติ)
        const names = await n.peRows().evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).options[(e as HTMLSelectElement).selectedIndex]?.text ?? ''));
        for (let i = names.length - 1; i >= 0; i--) {
          if (names[i] !== 'เลือกระบบ') continue;
          const row = n.pe.locator('div').filter({ has: doc.getByRole('combobox', { name: `System ${i + 1}`, exact: true }) }).filter({ has: doc.getByRole('button', { name: 'ลบ', exact: true }) }).last();
          await row.getByRole('button', { name: 'ลบ', exact: true }).click();
          await doc.waitForTimeout(500);
          say(`${TC(32)} เตรียม`, `ลบแถวว่าง "เลือกระบบ" ที่ TC-029 เพิ่มไว้ (แถว ${i + 1})`);
        }
        const systems = await n.peRows().evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).options[(e as HTMLSelectElement).selectedIndex]?.text ?? ''));
        const li = systems.indexOf('Lung') + 1;
        const lungAbn = n.pe.getByRole('radiogroup', { name: `Clinical Interpretation ${li}` }).getByText('ไม่ปกติ', { exact: true });
        await lungAbn.scrollIntoViewIfNeeded();
        await lungAbn.click();
        const allNormal = n.pe.getByRole('button', { name: 'ปกติทั้งหมด', exact: true });
        await markEvidence(filled(lungAbn, 'Lung ไม่ปกติ'), clicked(allNormal));
        await snapEvidence(doc, 'ก่อนกด — ปกติทั้งหมด');
        await allNormal.click();
        await doc.waitForTimeout(800);
        const got = await interp();
        const rows: CompareRow[] = systems.map((s, i) => ({ label: s || `แถว ${i + 1}`, values: ['ปกติ', got[i]], same: got[i] === 'ปกติ' }));
        await compare(32, rows);
        await markEvidence(expected(n.pe.getByText('Clinical Interpretation', { exact: true }).first(), 'ทุกแถว ปกติ'));
        expect(bad(rows)).toEqual([]);
      });
      await startClip(doc, tcId(33));
      await soft(`${TC(33)} กด ไม่ปกติทั้งหมด`, async () => {
        await hideCompareTable(doc);
        const btn = n.pe.getByRole('button', { name: 'ไม่ปกติทั้งหมด', exact: true });
        await btn.scrollIntoViewIfNeeded();
        await markEvidence(clicked(btn));
        await snapEvidence(doc, 'ก่อนกด — ไม่ปกติทั้งหมด');
        await btn.click();
        await doc.waitForTimeout(800);
        const systems = await n.peRows().evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).options[(e as HTMLSelectElement).selectedIndex]?.text ?? ''));
        const got = await interp();
        const rows: CompareRow[] = systems.map((s, i) => ({ label: s || `แถว ${i + 1}`, values: ['ไม่ปกติ', got[i]], same: got[i] === 'ไม่ปกติ' }));
        await compare(33, rows);
        await markEvidence(expected(n.pe.getByText('Clinical Interpretation', { exact: true }).first(), 'ทุกแถว ไม่ปกติ'));
        expect(bad(rows)).toEqual([]);
      });

      // TC-035 / 036 Compression Positive / Negative
      const compressionTry = async (num: number, choice: 'Positive' | 'Negative') => {
        await hideCompareTable(doc);
        await n.compression.scrollIntoViewIfNeeded();
        // รุ่น 2 พ.ย.: ตัวเลือกเป็น ปกติ / ไม่ปกติ (ไม่มี Negative / Positive) · เลือก "ไม่ปกติ" แล้ว checkbox Rt. / Lt. โผล่ท้ายแถว
        //   → ไม่มีคำตาม TC ให้กดคำที่ความหมายเดียวกันแทน (Positive = ไม่ปกติ · Negative = ปกติ) แล้วตรวจ Rt. / Lt. ของแถวนั้น
        const alt = choice === 'Positive' ? 'ไม่ปกติ' : 'ปกติ';
        const rows: CompareRow[] = [];
        const marks = [];
        for (const g of ['Chest compression test', 'Pelvic compression test']) {
          const group = n.compression.getByRole('radiogroup', { name: g });
          const exact = (await group.getByText(choice, { exact: true }).count()) > 0;
          const label = exact ? choice : alt;
          await group.getByText(label, { exact: true }).click();
          await doc.waitForTimeout(800);
          // checkbox Rt. / Lt. อยู่คนละ shadow root กับ radiogroup → จับจากตำแหน่ง: checkbox ที่อยู่บรรทัดเดียวกับ radiogroup ของแถวนี้
          const gBox = await group.boundingBox();
          const visible: Locator[] = [];
          for (const s of await n.compression.getByRole('checkbox').all()) {
            const b = await s.boundingBox().catch(() => null);
            if (b && gBox && Math.abs(b.y + b.height / 2 - (gBox.y + gBox.height / 2)) < 20) visible.push(s);
          }
          let sideState = 'ไม่แสดงช่อง Rt. / Lt.';
          if (visible.length) {
            const enabled = await visible[0].isEnabled();
            if (enabled && choice === 'Positive') for (const s of visible) await s.check();
            const checked = (await Promise.all(visible.map((s) => s.isChecked()))).filter(Boolean).length;
            sideState = !enabled ? `มี Rt. / Lt. ${visible.length} ช่อง สีเทา` : choice === 'Positive' ? `มี Rt. / Lt. ${visible.length} ช่อง · ติ๊กได้ ${checked} ช่อง` : `มี Rt. / Lt. ${visible.length} ช่อง ติ๊กได้`;
          }
          const want = choice === 'Positive' ? 'Positive + Rt. + Lt. ถูกเลือก' : 'Negative ถูกเลือก · Rt./Lt. เลือกไม่ได้';
          const okSide = choice === 'Positive' ? /ติ๊กได้ 2 ช่อง/.test(sideState) : /ไม่แสดง|สีเทา/.test(sideState);
          rows.push({ label: g, values: [want, `${label} ถูกเลือก${exact ? '' : ` (ไม่มีคำ ${choice})`} · ${sideState}`], same: okSide });
          marks.push(expected(group, label), ...visible.map((s, i) => expected(s, i === 0 ? sideState : '')));
        }
        await compare(num, rows);
        await markEvidence(...marks);
        expect(bad(rows)).toEqual([]);
      };
      await startClip(doc, tcId(35));
      await soft(`${TC(35)} Compression Positive + Rt. และ Lt.`, () => compressionTry(35, 'Positive'));
      await startClip(doc, tcId(36));
      await soft(`${TC(36)} Compression Negative → Rt. / Lt. เลือกไม่ได้`, () => compressionTry(36, 'Negative'));

      // TC-014 Acknowledge Fast Track
      await startClip(doc, tcId(14));
      await soft(`${TC(14)} กด รับทราบ Fast Track`, async () => {
        await hideCompareTable(doc);
        await n.ack.scrollIntoViewIfNeeded();
        const btn = n.ack.getByRole('button', { name: /รับทราบ|Acknowledge/ }).first();
        const has = await btn.count() > 0;
        const before = norm(await n.ack.innerText().catch(() => '(ไม่มี)'));
        await markEvidence(clicked(btn, 'รับทราบ Fast Track'));
        await snapEvidence(doc, 'ก่อนกด — รับทราบ Fast Track');
        const res = doc.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('clinical-acknowledgements'), { timeout: 30_000 });
        await btn.click();
        const status = (await res).status();
        await expect(n.ack).toContainText(/ดร\.|Acknowledged/, { timeout: 20_000 });
        const after = norm(await n.ack.innerText());
        const now = new Date();
        const ymd = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
        const rows: CompareRow[] = [
          { label: 'Pre-condition: Fast Track ของผู้ป่วย A', values: ['Trauma Fast Track', ftUsed.A], same: ftUsed.A === 'Trauma Fast Track' },
          { label: 'ปุ่ม Acknowledge ที่ Fast Track', values: ['มี', has ? `มี (${before})` : 'ไม่มี'], same: has },
          { label: 'หลังกด', values: ['Acknowledged โดย <แพทย์> <วันเวลา>', after], same: /ดร\.|โดย/.test(after) && after.includes(ymd) },
          { label: 'POST clinical-acknowledgements', values: ['สำเร็จ', String(status)], same: status < 300 },
        ];
        await compare(14, rows);
        await markEvidence(expected(n.ack, after.replace(/\s*ถอนการตอบรับ.*$/, '')));
        expect(bad(rows)).toEqual([]);
      });

      // TC-038 บันทึกแล้วเปิดใหม่
      await startClip(doc, tcId(38));
      await soft(`${TC(38)} กรอก PS · PE · Compression แล้วกดบันทึก`, async () => {
        await hideCompareTable(doc);
        await n.radios('ทางเดินหายใจ').getByText('Patent', { exact: true }).click();
        await n.radios('การหายใจ').getByText('Normal', { exact: true }).click();
        await n.radios('Pulse at ER').getByText('Palpable', { exact: true }).click();
        await n.radios('Log Roll').getByText('Normal', { exact: true }).click();
        const systems = await n.peRows().evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).options[(e as HTMLSelectElement).selectedIndex]?.text ?? ''));
        const li = systems.indexOf('Lung') + 1;
        await n.pe.getByRole('radiogroup', { name: `Clinical Interpretation ${li}` }).getByText('ไม่ปกติ', { exact: true }).click();
        await n.pe.getByLabel(`Detail ${li}`, { exact: true }).fill('decreased breath sound Rt.');
        const pelvic = n.compression.getByRole('radiogroup', { name: 'Pelvic compression test' });
        const positive = (await pelvic.getByText('Positive', { exact: true }).count()) ? 'Positive' : 'ไม่ปกติ';
        await pelvic.getByText(positive, { exact: true }).click();
        say(`${TC(38)} Compression`, positive === 'Positive' ? 'Pelvic = Positive' : 'ไม่มี Positive / Rt. — เลือก "ไม่ปกติ" แทน');
        await doc.waitForTimeout(1_500);
        await n.save.scrollIntoViewIfNeeded();
        const enabled = await n.save.isEnabled();
        const alertText = norm(await n.alert.innerText().catch(() => ''));
        await markEvidence(clicked(n.save, enabled ? 'บันทึก' : 'ปุ่มบันทึก disabled'), ...(alertText ? [alerted(n.alert, alertText)] : []));
        await snapEvidence(doc, 'ก่อนกด — บันทึกฟอร์มแพทย์');
        const rows: CompareRow[] = [
          { label: 'ปุ่มบันทึก', values: ['กดได้ · บันทึกสำเร็จ', enabled ? 'กดได้' : `กดไม่ได้ — ${alertText || 'ไม่มีข้อความ'}`], same: enabled },
          { label: 'ส่วนที่แสดงไม่ได้', values: ['ไม่มี', `${await n.pn.getByText('ไม่สามารถแสดงฟอร์มได้').count()} ส่วน (Body chart · Diagnosis)`], same: (await n.pn.getByText('ไม่สามารถแสดงฟอร์มได้').count()) === 0 },
        ];
        if (enabled) {
          const saved = doc.waitForResponse((r) => r.request().method() === 'POST' && /clinical-form-groups\/[^/]+\/saves$/.test(r.url()), { timeout: 60_000 });
          await n.save.click();
          rows.push({ label: 'POST saves', values: ['สำเร็จ', String((await saved).status())], same: (await saved).status() < 300 });
        }
        const savedInfo = n.pn.getByText(/บันทึกจากแบบฟอร์มนี้/).first();
        if (enabled) await expect(savedInfo, 'หลังบันทึกต้องขึ้น "บันทึกจากแบบฟอร์มนี้: <วันเวลา> โดย <แพทย์>"').toBeVisible({ timeout: 30_000 }).catch(() => undefined);
        await compare(38, rows, 'left');
        const savedShown = await savedInfo.isVisible().catch(() => false);
        await markEvidence(expected(savedShown ? savedInfo : n.save, savedShown ? 'บันทึกสำเร็จ' : `บันทึกสำเร็จ · จริง: ${alertText || 'ไม่ขึ้นเวลาบันทึก'}`));
        expect(bad(rows), 'ขั้น 6 (เปิดใหม่ดูค่า) ตรวจได้เมื่อบันทึกสำเร็จเท่านั้น').toEqual([]);
      });

      // TC-038 ขั้น 6: ปิดผู้ป่วย → กด Patient Card อีกครั้ง → ค่าที่กรอกยังอยู่
      await soft(`${TC(38)} ขั้น 6 เปิดใหม่ ค่าที่กรอกยังอยู่`, async () => {
        await hideCompareTable(doc);
        await clearEvidenceMarks(doc);
        ({ n } = await doctorOpens(doc, visit));
        const pickedOf = (group: Locator) =>
          group
            .evaluate((g) => {
              const inp = g.querySelector('input[type=radio]:checked') as HTMLInputElement | null;
              if (!inp) return (g.querySelector('[role=radio][aria-checked=true]')?.textContent ?? '').trim();
              const lab = inp.closest('label') ?? (inp.id ? g.querySelector(`label[for="${inp.id}"]`) : null);
              return (lab?.textContent ?? inp.value ?? '').trim();
            })
            .catch(() => '(ไม่พบ)');
        if (!(await n.radios('ทางเดินหายใจ').isVisible().catch(() => false))) {
          await n.pn.getByRole('button', { name: /Trauma Primary Survey/ }).first().click();
          await expect(n.radios('ทางเดินหายใจ')).toBeVisible({ timeout: 15_000 });
        }
        const systems = await n.peRows().evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).options[(e as HTMLSelectElement).selectedIndex]?.text ?? ''));
        const li = systems.indexOf('Lung') + 1;
        const pelvic = n.compression.getByRole('radiogroup', { name: 'Pelvic compression test' });
        const got: [string, string, string, Locator][] = [
          ['PS ทางเดินหายใจ', 'Patent', norm(await pickedOf(n.radios('ทางเดินหายใจ'))), n.radios('ทางเดินหายใจ')],
          ['PS การหายใจ', 'Normal', norm(await pickedOf(n.radios('การหายใจ'))), n.radios('การหายใจ')],
          ['PS Pulse at ER', 'Palpable', norm(await pickedOf(n.radios('Pulse at ER'))), n.radios('Pulse at ER')],
          ['PS Log Roll', 'Normal', norm(await pickedOf(n.radios('Log Roll'))), n.radios('Log Roll')],
          ['PE Lung', 'ไม่ปกติ', li ? norm(await pickedOf(n.pe.getByRole('radiogroup', { name: `Clinical Interpretation ${li}` }))) : '(ไม่มีแถว Lung)', n.pe.getByRole('radiogroup', { name: `Clinical Interpretation ${li || 1}` })],
          ['PE Lung รายละเอียด', 'decreased breath sound Rt.', li ? norm(await n.pe.getByLabel(`Detail ${li}`, { exact: true }).inputValue().catch(() => '(ไม่พบ)')) : '-', n.pe.getByLabel(`Detail ${li || 1}`, { exact: true })],
          ['Compression Pelvic', 'ไม่ปกติ (ไม่มี Positive / Rt. ให้เลือก)', norm(await pickedOf(pelvic)), pelvic],
        ];
        const rows: CompareRow[] = got.map(([label, want, value]) => ({ label, values: [want, value || '(ว่าง)'], same: value === want.split(' (')[0] }));
        say(`${TC(38)} ขั้น 6 ค่าหลังเปิดใหม่`, rows.map((r) => `${r.label}=${r.values[1]}`).join(' · '));
        // ภาพ 1: Primary Survey
        await n.radios('ทางเดินหายใจ').evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await doc.waitForTimeout(800);
        await markEvidence(...got.slice(0, 2).map(([label, , value, loc]) => expected(loc, `${label} = ${value}`)));
        await snapEvidence(doc, 'TC-038 เปิดใหม่ Primary Survey');
        await clearEvidenceMarks(doc);
        await n.radios('Pulse at ER').evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await doc.waitForTimeout(800);
        await markEvidence(expected(n.radios('Pulse at ER'), `Pulse at ER = ${got[2][2]}`));
        await snapEvidence(doc, 'TC-038 เปิดใหม่ Pulse at ER');
        await clearEvidenceMarks(doc);
        await n.radios('Log Roll').evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await doc.waitForTimeout(800);
        await markEvidence(expected(n.radios('Log Roll'), `Log Roll = ${got[3][2]}`));
        await snapEvidence(doc, 'TC-038 เปิดใหม่ Log Roll');
        await clearEvidenceMarks(doc);
        // ภาพ 2: PE Lung (เลื่อนแถวมากลางจอให้นิ่งก่อนตีกรอบ — รอบแรกกรอบค้างตำแหน่งเก่าเป็นกล่องว่าง)
        await got[4][3].evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await doc.waitForTimeout(1_500);
        await markEvidence(expected(got[4][3], `Lung = ${got[4][2]}`), expected(got[5][3], `รายละเอียด = ${got[5][2]}`));
        await snapEvidence(doc, 'TC-038 เปิดใหม่ PE Lung');
        await clearEvidenceMarks(doc);
        // ภาพ 3: Compression Pelvic + ตารางเทียบ (ท้าย step)
        await pelvic.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await doc.waitForTimeout(1_500);
        await compare(38, rows, 'left');
        await markEvidence(expected(pelvic, `Pelvic = ${got[6][2]}`));
        expect(bad(rows)).toEqual([]);
      });

      await closeRoleWindow(doc);
      windows = [];
      finish();
    },
  );

  // ================================================================================================
  test(
    'ผู้ป่วย B (Non-Trauma): TC-002, 039–041 ER Physician Note (Doctor)',
    meta(2, 39, 40, 41),
    async ({ page, browser }) => {
      const main = makeRunner(page);
      const visit = await preparePatient(page, 'B', { fastTrack: 'Stroke Fast Track', trauma: false, vitals: true, gcs: true, underlying: false, level: 3 }, main.note);
      const doc = await openRoleWindow(browser, 'Doctor');
      windows.push(doc);
      const { note: say, soft, finish } = makeRunner(doc);
      say('ผู้ป่วยที่ใช้', `B · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      const compare = (n: number, rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'left') => showCompareTable(doc, `${ISSUE(n)} ${tcId(n)}`, ['Expected', 'หน้าจอ'], rows, { side });
      let n!: Note;

      await startClip(doc, tcId(2));
      await soft(`${TC(2)} กด Patient Card ผู้ป่วย Non-Trauma → ER Physician Note`, async () => {
        ({ n } = await doctorOpens(doc, visit));
        const has = {
          rts: await n.rts.count(),
          ps: await n.psTitle.count(),
          comp: await n.title('ER compression test').count(),
          body: await n.bodyChartTitle.count(),
        };
        const rows: CompareRow[] = [
          { label: 'หัวแผงขวา', values: ['ER Physician Note (ER Physician Exam)', norm(await n.heading.innerText())], same: /ER Physician Note/.test(await n.heading.innerText()) },
          { label: 'RTS', values: ['ไม่มี', yes(has.rts > 0)], same: has.rts === 0 },
          { label: 'Primary Survey', values: ['ไม่มี', yes(has.ps > 0)], same: has.ps === 0 },
          { label: 'Compression Test', values: ['ไม่มี', yes(has.comp > 0)], same: has.comp === 0 },
          { label: 'Body Chart', values: ['ไม่มี', yes(has.body > 0)], same: has.body === 0 },
        ];
        await compare(2, rows);
        const marks = [expected(n.heading, 'ER Physician Note')];
        if (has.body) {
          await n.bodyChartTitle.scrollIntoViewIfNeeded();
          marks.push(expected(n.bodyChartTitle, 'ไม่มี Body Chart · จริง: มี'));
        }
        await markEvidence(...marks);
        expect(bad(rows)).toEqual([]);
      });

      await startClip(doc, tcId(39));
      await soft(`${TC(39)} ไม่มี Acknowledge ที่ GCS และ MEWS`, async () => {
        await hideCompareTable(doc);
        const gcsCard = n.pn.locator('div').filter({ has: doc.getByRole('combobox', { name: 'Eye Opening (E)' }) }).filter({ hasText: /GCS \d+/ }).last();
        const mewsCard = n.pn.locator('div').filter({ has: doc.getByRole('combobox', { name: 'AVPU' }) }).filter({ hasText: /MEWS/ }).last();
        await n.title('Glasgow Coma Scale').scrollIntoViewIfNeeded();
        const re = /Acknowledge|Reject|รับทราบ|ปฏิเสธ/;
        const g = await gcsCard.getByRole('button', { name: re }).count() + await gcsCard.getByText(/Acknowledged/).count();
        const m = await mewsCard.getByRole('button', { name: re }).count() + await mewsCard.getByText(/Acknowledged/).count();
        const ackRows = (await n.pn.locator('[data-testid^="ack-row-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid') ?? ''))).join(', ');
        const rows: CompareRow[] = [
          { label: 'GCS: Acknowledge / Reject', values: ['ไม่มี', yes(g > 0)], same: g === 0 },
          { label: 'MEWS: Acknowledge / Reject', values: ['ไม่มี', yes(m > 0)], same: m === 0 },
          { label: 'แถวรับทราบที่มีในฟอร์ม', values: ['เฉพาะ Fast Track', ackRows || '(ไม่มี)'], same: !/mews|gcs/i.test(ackRows) },
        ];
        await compare(39, rows);
        await markEvidence(expected(gcsCard, 'ไม่มี Acknowledge'), expected(mewsCard, 'ไม่มี Acknowledge'));
        expect(bad(rows)).toEqual([]);
      });

      await startClip(doc, tcId(41));
      await soft(`${TC(41)} Order to Nurse ไม่มีช่อง Order`, async () => {
        await hideCompareTable(doc);
        await n.noteToNurse.scrollIntoViewIfNeeded();
        // รุ่น 2 พ.ย. การ์ดไม่มีบรรทัด "รายการใหม่" แล้ว และหัว / ช่องอยู่คนละ shadow root → นับจากทั้งแผงแทนการหากล่องของส่วน
        // ช่องหมายเหตุเป็น rich text (ไม่มี attribute placeholder) → จับการ์ดจากหัว "Note to nurse" + ป้ายช่อง "Note to Nurse"
        const noteLabel = n.pn.getByText('Note to Nurse', { exact: true }).first();
        const section = n.pn
          .locator('div')
          .filter({ has: doc.getByText('Note to nurse', { exact: true }) })
          .filter({ has: doc.getByText('Note to Nurse', { exact: true }) })
          .filter({ hasNot: doc.getByText('Diagnosis general', { exact: true }) })
          .last();
        const found = (await section.count()) > 0;
        const scope = found ? section : n.pn;
        const orderField = (await scope.getByText(/^\*?\s*Order\b/).count()) + (await scope.getByLabel(/^Order/).count());
        const labels = found ? (await section.getByText(/\S/).allInnerTexts().catch(() => [] as string[])).map(norm).filter((t) => t && t.length < 40) : [];
        const rows: CompareRow[] = [
          { label: 'ช่อง Order (คำสั่งถึงพยาบาล)', values: ['ไม่มี', yes(orderField > 0)], same: orderField === 0 },
          { label: 'สิ่งที่อยู่ในส่วน', values: ['(ไม่ระบุ)', found ? [...new Set(labels)].slice(0, 6).join(' · ') : 'ไม่พบส่วน Note to nurse'], same: true },
        ];
        await noteLabel.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => undefined);
        await doc.waitForTimeout(500);
        await compare(41, rows);
        await markEvidence(expected(found ? section : n.noteToNurse, 'มีแต่ Note to Nurse ไม่มีช่อง Order'));
        expect(bad(rows)).toEqual([]);
      });

      await startClip(doc, tcId(40));
      await soft(`${TC(40)} กด รับทราบ Fast Track (Non-Trauma)`, async () => {
        await hideCompareTable(doc);
        await n.ack.scrollIntoViewIfNeeded();
        const btn = n.ack.getByRole('button', { name: /รับทราบ|Acknowledge/ }).first();
        const has = await btn.count() > 0;
        await markEvidence(clicked(btn, 'รับทราบ Fast Track'));
        await snapEvidence(doc, 'ก่อนกด — รับทราบ Fast Track');
        const res = doc.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('clinical-acknowledgements'), { timeout: 30_000 });
        await btn.click();
        const status = (await res).status();
        await expect(n.ack).toContainText(/ดร\.|Acknowledged/, { timeout: 20_000 });
        const after = norm(await n.ack.innerText());
        const now = new Date();
        const ymd = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
        const rows: CompareRow[] = [
          { label: 'ปุ่ม Acknowledge ที่ Fast Track', values: ['มี', yes(has)], same: has },
          { label: 'หลังกด', values: ['Acknowledged โดย <แพทย์> <วันเวลา>', after], same: /ดร\.|โดย/.test(after) && after.includes(ymd) },
          { label: 'POST clinical-acknowledgements', values: ['สำเร็จ', String(status)], same: status < 300 },
        ];
        await compare(40, rows);
        await markEvidence(expected(n.ack, after.replace(/\s*ถอนการตอบรับ.*$/, '')));
        expect(bad(rows)).toEqual([]);
      });

      await closeRoleWindow(doc);
      windows = [];
      finish();
    },
  );

  // ================================================================================================
  test(
    'ผู้ป่วย C (Trauma ไม่มีสัญญาณชีพ / GCS): TC-044, 045 RTS Incomplete (Doctor)',
    meta(44, 45),
    async ({ page, browser }) => {
      const main = makeRunner(page);
      const visit = await preparePatient(page, 'C', { fastTrack: 'Not Suspect Fast Track', trauma: true, vitals: false, gcs: false, underlying: false, level: 2 }, main.note);
      const doc = await openRoleWindow(browser, 'Doctor');
      windows.push(doc);
      const { note: say, soft, finish } = makeRunner(doc);
      say('ผู้ป่วยที่ใช้', `C · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      const compare = (n: number, rows: CompareRow[]) => showCompareTable(doc, `${ISSUE(n)} ${tcId(n)}`, ['Expected', 'หน้าจอ'], rows, { side: 'left' });
      let n!: Note;

      await startClip(doc, tcId(44));
      await soft(`${TC(44)} RTS ไม่มี GCS / SBP / RR → Incomplete`, async () => {
        ({ n } = await doctorOpens(doc, visit));
        await n.rts.scrollIntoViewIfNeeded();
        const text = norm(await n.rts.innerText());
        const result = norm(await n.rtsResult.innerText().catch(() => text));
        const rows: CompareRow[] = [
          { label: 'ช่อง GCS / SBP / RR', values: ['- (ไม่มีค่า)', text], same: !/GCS:\d|SBP:\d|RR:\d/.test(text) },
          { label: 'แถบผล', values: ['Incomplete - GCS, SBP, RR (ไม่แสดงคะแนน)', result], same: /Incomplete/i.test(result) && /GCS/.test(result) && /SBP/.test(result) && /RR/.test(result) },
        ];
        await compare(44, rows);
        await markEvidence(expected(n.rtsResult, result));
        expect(bad(rows)).toEqual([]);
      });

      await startClip(doc, tcId(45));
      await soft(`${TC(45)} เลือก GCS E4 V5 M6 → Incomplete - SBP, RR`, async () => {
        await hideCompareTable(doc);
        await n.title('Glasgow Coma Scale').scrollIntoViewIfNeeded();
        for (const [name, score] of [['Eye Opening (E)', 4], ['Verbal Response (V)', 5], ['Motor Response (M)', 6]] as const) {
          const select = n.gcsSelect(name);
          const label = (await select.locator('option').allTextContents()).find((t) => t.startsWith(`${score} `));
          await select.selectOption({ label: label! });
        }
        await markEvidence(filled(n.gcsSelect('Eye Opening (E)'), 'E4'), filled(n.gcsSelect('Verbal Response (V)'), 'V5'), filled(n.gcsSelect('Motor Response (M)'), 'M6'));
        await snapEvidence(doc, 'TC-045 เลือก GCS');
        await doc.waitForTimeout(2_000);
        await n.rts.scrollIntoViewIfNeeded();
        const text = norm(await n.rts.innerText());
        const result = norm(await n.rtsResult.innerText().catch(() => text));
        const rows: CompareRow[] = [
          { label: 'GCS ใน RTS', values: ['15', text], same: /GCS\s*(:\s*4|15)/.test(text) || (!/GCS/.test(result) && /Incomplete/.test(result)) },
          { label: 'แถบผล', values: ['Incomplete - SBP, RR', result], same: /Incomplete/i.test(result) && /SBP/.test(result) && /RR/.test(result) && !/GCS(?!:)/.test(result.replace(/^.*Incomplete/i, '')) },
        ];
        await compare(45, rows);
        await markEvidence(expected(n.rtsResult, result));
        expect(bad(rows)).toEqual([]);
      });

      await closeRoleWindow(doc);
      windows = [];
      finish();
    },
  );

  // ================================================================================================
  test(
    'ผู้ป่วย D / E / F / G: TC-042, 043, 046 เวลารอบนบอร์ด · TC-012 MEWS บนการ์ด (Doctor / Nurse)',
    meta(12, 42, 43, 46),
    async ({ page, browser }) => {
      const main = makeRunner(page);
      // SBH2058_ONLY=12 = เล่นเฉพาะ TC ที่ระบุ และสร้างเฉพาะผู้ป่วยของ TC นั้น (G = 012 · D = 042 · E = 043 · F = 046)
      const onlyN = process.env.SBH2058_ONLY?.split(',').map(Number);
      const want = (num: number) => !onlyN || onlyN.includes(num);
      const skip = undefined as unknown as ErVisit;
      const patients = {
        G: want(12) ? await preparePatient(page, 'G', { fastTrack: 'Stroke Fast Track', trauma: true, vitals: true, gcs: true, underlying: false, level: 3 }, main.note) : skip,
        D: want(42) ? await preparePatient(page, 'D', { fastTrack: 'Stroke Fast Track', trauma: true, vitals: true, gcs: true, underlying: false, level: 3 }, main.note) : skip,
        E: want(43) ? await preparePatient(page, 'E', { fastTrack: 'Stroke Fast Track', trauma: false, vitals: true, gcs: true, underlying: false, level: 3 }, main.note) : skip,
        F: want(46) ? await preparePatient(page, 'F', { fastTrack: 'Stroke Fast Track', trauma: true, vitals: true, gcs: true, underlying: false, level: 3 }, main.note) : skip,
      };
      const doc = await openRoleWindow(browser, 'Doctor');
      windows.push(doc);
      const { note: say, soft, finish } = makeRunner(doc);
      for (const [k, v] of Object.entries(patients)) if (v) say(`ผู้ป่วย ${k}`, `HN ${v.hn} · ${v.vn} · ${v.en}`);
      const compare = (p: Page, n: number, rows: CompareRow[]) => showCompareTable(p, `${ISSUE(n)} ${tcId(n)}`, ['Expected', 'บนบอร์ด'], rows, { side: 'right' });
      const WAIT = 120_000;

      // TC-012 MEWS บนการ์ด
      if (want(12)) {
      await hideCompareTable(doc).catch(() => undefined);
      await clearEvidenceMarks(doc).catch(() => undefined);
      await openBoardCard(doc, patients.G.hn); // โหลดบอร์ดให้เสร็จก่อนเริ่มคลิป (ไม่มีจอขาวต้นคลิป)
      await doc.waitForTimeout(1_500);
      await startClip(doc, tcId(12));
      await soft(`${TC(12)} MEWS Score บนการ์ด ก่อน / หลังแพทย์รับทราบ`, async () => {
        const v = patients.G;
        const card = await openBoardCard(doc, v.hn);
        const mews = card.getByText(/^MEWS\s*\d+/).first();
        const before = (await mews.count()) ? norm(await mews.innerText()) : '';
        await markEvidence(expected(before ? mews : card, before ? `ก่อน: ${before}` : 'ไม่มี MEWS'));
        await snapEvidence(doc, 'TC-012 การ์ดก่อนแพทย์เปิด');
        await clickCard(doc, card, v.hn);
        const n = await waitNote(doc);
        const act = doc.waitForResponse((r) => r.url().includes(`/er/encounters/${v.en}/physician-activity`), { timeout: 30_000 });
        await n.cc.click();
        await n.cc.press('End');
        await n.cc.pressSequentially(' แพทย์ตรวจ', { delay: 40 });
        const actStatus = (await act).status();
        await markEvidence(filled(n.cc, 'แพทย์พิมพ์ Chief Complaint'));
        await snapEvidence(doc, 'TC-012 แพทย์เริ่มพิมพ์ (รับทราบ)');
        const card2 = await openBoardCard(doc, v.hn);
        await doc.waitForTimeout(3_000);
        const mews2 = card2.getByText(/^MEWS\s*\d+/).first();
        const after = (await mews2.count()) ? norm(await mews2.innerText()) : '';
        const rows: CompareRow[] = [
          { label: 'ก่อนรับทราบ', values: ['แสดง MEWS Score', before || 'ไม่แสดง'], same: !!before },
          { label: 'physician-activity', values: ['สำเร็จ', String(actStatus)], same: actStatus < 300 },
          { label: 'หลังรับทราบ', values: ['ไม่แสดง MEWS Score', after || 'ไม่แสดง'], same: !after },
        ];
        await compare(doc, 12, rows);
        await markEvidence(expected(after ? mews2 : card2, after ? `ไม่แสดง · จริง: ${after}` : 'MEWS หายแล้ว'));
        expect(bad(rows)).toEqual([]);
      });
      if (onlyN) await startClip(doc, 'after'); // ตัดคลิปของ TC-012 ก่อนขั้นปิด Visit
      }

      // TC-042 / 043 เวลารอหยุดเมื่อแพทย์เริ่มทำงาน
      const doctorStops = async (num: number, key: 'D' | 'E') => {
        await hideCompareTable(doc);
        const v = patients[key];
        const t0 = await readWait(doc, v.hn);
        await doc.waitForTimeout(5_000);
        const t1 = await readWait(doc, v.hn);
        await markEvidence(expected(t1.label, `กำลังนับ: ${t0.text} → ${t1.text}`));
        await snapEvidence(doc, `${tcId(num)} เวลารอก่อนแพทย์เปิด`);
        await clickCard(doc, t1.card, v.hn);
        const n = await waitNote(doc);
        const act = doc.waitForResponse((r) => r.url().includes(`/er/encounters/${v.en}/physician-activity`), { timeout: 30_000 });
        await n.cc.click();
        await n.cc.press('End');
        await n.cc.pressSequentially(' แพทย์ตรวจ', { delay: 40 });
        const actStatus = (await act).status();
        await markEvidence(filled(n.cc, 'แพทย์พิมพ์ Chief Complaint'));
        await snapEvidence(doc, `${tcId(num)} แพทย์เริ่มพิมพ์`);
        const t2 = await readWait(doc, v.hn);
        await markEvidence(expected(t2.label, `จดเวลา: ${t2.text}`));
        await snapEvidence(doc, `${tcId(num)} เวลาหลังแพทย์เริ่ม`);
        await doc.waitForTimeout(WAIT);
        const t3 = await readWait(doc, v.hn);
        const rows: CompareRow[] = [
          { label: 'ก่อนแพทย์เปิด', values: ['กำลังนับ', `${t0.text} → ${t1.text}`], same: t1.seconds > t0.seconds },
          { label: 'physician-activity', values: ['สำเร็จ', String(actStatus)], same: actStatus < 300 },
          { label: 'หลังแพทย์เริ่ม / รอ 2 นาที', values: ['ไม่เพิ่มขึ้น', `${t2.text} → ${t3.text}`], same: t3.seconds === t2.seconds },
        ];
        await compare(doc, num, rows);
        await markEvidence(expected(t3.label, `หลังรอ 2 นาที: ${t3.text}`));
        expect(bad(rows)).toEqual([]);
      };
      if (want(42)) {
      await hideCompareTable(doc).catch(() => undefined);
      await clearEvidenceMarks(doc).catch(() => undefined);
      await openBoardCard(doc, patients.D.hn); // โหลดบอร์ดให้เสร็จก่อนเริ่มคลิป (ไม่มีจอขาวต้นคลิป)
      await doc.waitForTimeout(1_500);
      await startClip(doc, tcId(42));
      await soft(`${TC(42)} เวลารอหยุดเมื่อแพทย์เริ่ม (Trauma)`, () => doctorStops(42, 'D'));
      }
      if (want(43)) {
      await hideCompareTable(doc).catch(() => undefined);
      await clearEvidenceMarks(doc).catch(() => undefined);
      await openBoardCard(doc, patients.E.hn); // โหลดบอร์ดให้เสร็จก่อนเริ่มคลิป (ไม่มีจอขาวต้นคลิป)
      await doc.waitForTimeout(1_500);
      await startClip(doc, tcId(43));
      await soft(`${TC(43)} เวลารอหยุดเมื่อแพทย์เริ่ม (Non-Trauma)`, () => doctorStops(43, 'E'));
      }
      await closeRoleWindow(doc);
      windows = [];
      if (!want(46)) { finish(); return; }

      // TC-046 พยาบาลเปิด / กรอก → เวลายังเดิน
      const nurse = await openRoleWindow(browser, 'Nurse');
      windows.push(nurse);
      const nr = makeRunner(nurse);
      await hideCompareTable(nurse).catch(() => undefined);
      await clearEvidenceMarks(nurse).catch(() => undefined);
      await openBoardCard(nurse, patients.F.hn); // โหลดบอร์ดให้เสร็จก่อนเริ่มคลิป (ไม่มีจอขาวต้นคลิป)
      await nurse.waitForTimeout(1_500);
      await startClip(nurse, tcId(46));
      await nr.soft(`${TC(46)} พยาบาลเปิดและกรอก → เวลารอยังเดิน`, async () => {
        const v = patients.F;
        const t0 = await readWait(nurse, v.hn);
        await markEvidence(expected(t0.label, `ก่อน: ${t0.text}`));
        await snapEvidence(nurse, 'TC-046 เวลารอก่อนพยาบาลเปิด');
        const acts: string[] = [];
        nurse.on('request', (r) => { if (r.url().includes('/physician-activity')) acts.push(r.url()); });
        await clickCard(nurse, t0.card, v.hn);
        const illness = nurse.getByRole('main').locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').first();
        await expect(illness, 'ต้องมีช่องประวัติเจ็บป่วยปัจจุบันที่พยาบาลกรอกได้').toBeVisible({ timeout: 120_000 });
        await illness.click();
        await illness.pressSequentially('พยาบาลประเมินซ้ำ', { delay: 40 });
        await nurse.waitForTimeout(3_000);
        await markEvidence(filled(illness, 'พยาบาลพิมพ์'));
        await snapEvidence(nurse, 'TC-046 พยาบาลพิมพ์');
        const t1 = await readWait(nurse, v.hn);
        await markEvidence(expected(t1.label, `จดเวลา: ${t1.text}`));
        await snapEvidence(nurse, 'TC-046 เวลาหลังพยาบาลกรอก');
        await nurse.waitForTimeout(WAIT);
        const t2 = await readWait(nurse, v.hn);
        const rows: CompareRow[] = [
          { label: 'physician-activity จากพยาบาล', values: ['ไม่เกิด', acts.length ? `เกิด ${acts.length} ครั้ง` : 'ไม่เกิด'], same: acts.length === 0 },
          { label: 'เวลารอหลังรอ 2 นาที', values: ['เพิ่มขึ้นต่อเนื่อง', `${t1.text} → ${t2.text}`], same: t2.seconds > t1.seconds },
        ];
        await compare(nurse, 46, rows);
        await markEvidence(expected(t2.label, `หลังรอ 2 นาที: ${t2.text}`));
        expect(bad(rows)).toEqual([]);
      });
      await closeRoleWindow(nurse);
      windows = [];
      nr.finish();
      finish();
    },
  );
});
