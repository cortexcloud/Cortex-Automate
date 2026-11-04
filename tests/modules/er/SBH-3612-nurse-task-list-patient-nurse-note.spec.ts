import { type Browser, type Locator, type Page } from '@playwright/test';
import { closeVisitAtCashier, gotoCashierAccount, payAllInCash } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, gotoErDashboard, trackOpenedErVisits, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { fillNurseNote, readFocusNotes, saveNurseNote } from '../../../helpers/functions/er-nursing-records';
import { fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { fetchNurseTasks, registerAndOpenErVisit, SETTINGS, submitOrders } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, careMenu, gotoVisit } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// SBH-3612 [ER][Nurse task] แก้ไข Menu — ย้ายปุ่ม เพิ่ม / ดู Nurse Note จากแถว task ไปเป็นระดับผู้ป่วย ข้างปุ่ม "+ เพิ่ม Nurse task"
//   หน้า ER "รายการงานพยาบาล" (/cortex/er/nurse-task-list) · PR cortex-ui #2632 · ขึ้น dev-x รุ่นไฟล์แอป index-BneIKgug.js (3 พ.ย. 2026 11:09)
// ชุด EXE SBH-3821 → HPY SBH-3822 (TC-001–008 = SBH-3824–3831) · EDG SBH-3823 (TC-009 = SBH-3832) · 1 เทส = 1 flow (R9) · คลิปต่อ TC (R61)
// ผู้ป่วย AUTO 2 ราย (dev-x · R10 / R11 / R17):
//   A = ESI 3 + รังสี SBHIMG1 + Nurse task ที่พยาบาลเพิ่มเอง 1 รายการ (งาน ≥ 2) + Focus ตั้งต้น "SBH-3612 เดิม A" (บันทึกจากหน้า Order Summary)
//   B = ESI 3 + รังสี SBHIMG1 + Focus ตั้งต้น "SBH-3612 เดิม B" → TC-009
// บัญชี: Super_User (user1) ลงทะเบียน / คัดกรอง / สั่ง order / Focus ตั้งต้น · Nurse (x-nurse) เล่น TC ที่หน้ารายการงานพยาบาล (หน้าต่างแยก)
// หน้าจอรุ่นใหม่ (สำรวจ 3 พ.ย.): แถบบน `[เพิ่ม Nurse Note] [ดู Nurse Note (n)] [+ เพิ่ม Nurse task] [รีเฟรช]` · ดู = drawer "Nurse Focus Note (พยาบาล)"
//   (ปุ่มปิด aria-label "ปิด") · เพิ่ม = drawer + หน้าต่าง "Nurse Note" ซ้อน (Focus / A / I / E) · หัวตารางไม่มี Nurse note
// รัน (dev-x): npx playwright test --headed --grep @SBH-3612
//   SBH3612_KEEP=1 = ไม่ปิด Visit ท้ายเทส · SBH3612_A=hn,vn,en + SBH3612_B=hn,vn,en = ใช้ผู้ป่วยเดิม (ข้ามขั้นเตรียม)

const ISSUE: Record<number, string> = {};
for (let n = 1; n <= 9; n++) ISSUE[n] = `SBH-${3823 + n}`;
const pad = (n: number) => String(n).padStart(3, '0');
const TC = (n: number) => `TC-${pad(n)} (${ISSUE[n]})`;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });

const mainOf = (p: Page) => p.getByRole('main');
// ---------- หน้า รายการงานพยาบาล ----------
const searchBox = (p: Page) => mainOf(p).getByPlaceholder('HN / ชื่อ-นามสกุล');
const sidebar = (p: Page) => mainOf(p).locator('[class*="_sidebar_"]').filter({ has: p.locator('input[placeholder="HN / ชื่อ-นามสกุล"]') }).last();
const patientBtn = (p: Page, hn: string) => sidebar(p).getByRole('button', { name: new RegExp(`HN ${hn}\\s`) }).first();
const summaryLine = (p: Page) => mainOf(p).getByText(/^รายการงาน \d+ active/).first();
/** แถบบนตาราง = แถวที่มีบรรทัดสรุป "รายการงาน …" + ปุ่ม (div ที่ครอบทั้งคู่) */
const topBar = (p: Page) => summaryLine(p).locator('xpath=..');
const headerRow = (p: Page) => mainOf(p).locator('[class*="_table-row-header_"]').first();
const headerCells = (p: Page) => headerRow(p).locator('[class*="_table-header-cell_"]');
const taskRows = (p: Page) => mainOf(p).locator('[class*="_data-row_"]');
const addNoteBtn = (p: Page) => mainOf(p).getByRole('button', { name: /เพิ่ม Nurse Note$/i });
const viewNoteBtn = (p: Page) => mainOf(p).getByRole('button', { name: /ดู Nurse Note/i });
const addTaskBtn = (p: Page) => mainOf(p).getByRole('button', { name: /เพิ่ม Nurse task/ });
const refreshBtn = (p: Page) => mainOf(p).getByRole('button', { name: 'reload รีเฟรช' }).first();
const isEncounters = (url: string) => /\/er\/nurse-tasks\/encounters\?/.test(url);
/** drawer รายการ Nurse Note (ant-drawer-section role=dialog) */
const noteDrawer = (p: Page) => p.getByRole('dialog').filter({ hasText: 'Nurse Focus Note (พยาบาล)' }).first();
const drawerClose = (p: Page) => noteDrawer(p).getByRole('button', { name: 'ปิด', exact: true }).first();
const noteDialog = (p: Page) => p.getByRole('dialog').filter({ hasText: 'Assessment (A)' }).first();
const focusPanel = (p: Page) => noteDrawer(p).getByRole('tabpanel', { name: 'Focus' });
const focusNames = (p: Page) => focusPanel(p).locator('[class*="_focus-name_"]');
const focusCardIn = (p: Page, name: string) => focusPanel(p).locator('[class*="_wrapper_"]').filter({ has: p.locator('[class*="_focus-name_"]', { hasText: name }) }).first();

async function openTaskList(n: Page) {
  const loaded = n.waitForResponse((r) => isEncounters(r.url()), { timeout: 90_000 });
  loaded.catch(() => undefined);
  await n.goto('/cortex/er/nurse-task-list');
  await expectOk(await loaded, 'รายชื่อผู้ป่วยของหน้ารายการงานพยาบาล');
  await expect(searchBox(n)).toBeVisible({ timeout: 60_000 });
  await n.mouse.move(960, 1000);
}

async function refresh(n: Page) {
  for (let attempt = 1; ; attempt++) {
    const loaded = n.waitForResponse((r) => isEncounters(r.url()), { timeout: 30_000 });
    loaded.catch(() => undefined);
    await refreshBtn(n).click();
    const res = await loaded;
    if (res.ok() || attempt >= 3) break;
    await n.waitForTimeout(5_000);
  }
  await n.waitForTimeout(800);
}

/** เลือกผู้ป่วยในรายชื่อฝั่งซ้าย (รอขึ้นในรายชื่อ — กดรีเฟรชซ้ำ) → หัวผู้ป่วย + แถบบนขึ้น */
async function selectPatient(n: Page, hn: string) {
  await expect(async () => {
    if (!(await patientBtn(n, hn).isVisible())) {
      await refresh(n);
      await expect(patientBtn(n, hn)).toBeVisible({ timeout: 3_000 });
    }
  }, `ผู้ป่วย HN ${hn} ต้องขึ้นในรายชื่อ`).toPass({ timeout: 120_000 });
  await patientBtn(n, hn).click();
  await expect(mainOf(n).getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(summaryLine(n)).toBeVisible({ timeout: 30_000 });
  await expect(viewNoteBtn(n).first()).toBeVisible({ timeout: 30_000 });
  await n.waitForTimeout(1_500);
}

async function closeDrawer(n: Page) {
  if (!(await noteDrawer(n).isVisible().catch(() => false))) return;
  await drawerClose(n).click();
  await expect(noteDrawer(n)).toBeHidden({ timeout: 10_000 });
  await n.waitForTimeout(500);
}

/** เปิด drawer ดู Nurse Note แล้วรอรายการ Focus โหลด */
async function openViewDrawer(n: Page) {
  await viewNoteBtn(n).first().click();
  await expect(noteDrawer(n)).toBeVisible({ timeout: 20_000 });
  await expect(focusNames(n).first()).toBeVisible({ timeout: 30_000 });
  await n.waitForTimeout(1_000);
}

/** พยาบาลเพิ่ม Nurse task 1 รายการ (ขั้นเตรียม — ให้ผู้ป่วย A มีงาน ≥ 2) */
async function addNurseTask(n: Page, name: string) {
  await addTaskBtn(n).click();
  const modal = n.getByRole('dialog').filter({ hasText: 'เพิ่ม Nurse task' }).first();
  await expect(modal).toBeVisible();
  await modal.locator('input#name').fill(name);
  await modal.locator('input#priority').click();
  await n.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Routine' }).first().click();
  await modal.locator('input#assignee').click();
  await n.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
  const created = n.waitForResponse((r) => /\/er\/nurse-tasks/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
  await modal.getByRole('button', { name: /บันทึก/ }).click();
  await expectOk(await created, `เพิ่ม Nurse task "${name}"`);
  await expect(modal).toBeHidden({ timeout: 15_000 });
}

/** เปิด Order Summary ของ Visit (แบบเดียวกับ SBH-2593) */
async function openOrderSummary(p: Page, visit: ErVisit) {
  await gotoVisit(p, visit);
  const item = p.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: /Order Summary$/ }).first();
  const header = mainOf(p).getByRole('button').filter({ hasText: 'Nurse Focus Note (พยาบาล)' }).filter({ hasNotText: 'เพิ่ม' }).first();
  await expect(async () => {
    if (!(await header.isVisible())) await item.click({ force: true });
    await expect(header).toBeVisible({ timeout: 10_000 });
    await p.waitForTimeout(3_000);
    await expect(header).toBeVisible({ timeout: 1_000 });
  }, 'เปิด Order Summary').toPass({ timeout: 120_000 });
  await p.mouse.click(1100, 166);
  await p.mouse.move(960, 1050);
  await p.waitForTimeout(1_500);
}

/** Focus ตั้งต้นของผู้ป่วย — บันทึกจากหน้า Order Summary (คนละหน้ากับที่ทดสอบ) */
async function seedFocus(p: Page, visit: ErVisit, focus: string) {
  await openOrderSummary(p, visit);
  await mainOf(p).getByRole('button', { name: /เพิ่ม Nurse Note/ }).first().click();
  await fillNurseNote(p, { focus, assessment: `${focus} - A ตั้งต้น`, intervention: `${focus} - I ตั้งต้น`, evaluation: `${focus} - E ตั้งต้น` });
  const result = await saveNurseNote(p);
  expect(result.closed, `บันทึก Focus ตั้งต้น ${focus} ไม่สำเร็จ: ${result.notices.join(' · ')}`).toBe(true);
}

async function openOneDayOrder(page: Page) {
  const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  await expect(async () => {
    if (!(await search.isVisible())) await careMenu(page, 'One Day Order', mainOf(page).getByRole('heading', { name: 'Order', exact: true }));
    await expect(search).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3_000);
    await expect(search).toBeVisible({ timeout: 1_000 });
  }, 'เปิด One Day Order').toPass({ timeout: 120_000 });
}

/** ผู้ป่วย AUTO ใหม่ → Visit ER → คัดกรอง ESI 3 (โซนแนะนำ) → สั่งรังสี */
async function preparePatient(page: Page, label: string, note: (t: string, d: string) => void): Promise<ErVisit> {
  await gotoErDashboard(page);
  const patient = newTestPatient(label);
  const visit = await registerAndOpenErVisit(page, patient);
  note(`ผู้ป่วย ${label}`, `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
  await expect(mainOf(page).getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
  const zoned = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await expectOk(await zoned, `ส่งผู้ป่วย ${label} เข้าโซน`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
  await openOneDayOrder(page);
  await submitOrders(page, [SETTINGS.imagingCode]);
  note(`ผู้ป่วย ${label} order`, `ส่งคำสั่ง ${SETTINGS.imagingCode}`);
  return visit;
}

const fromEnv = (v?: string): ErVisit | undefined => {
  if (!v) return undefined;
  const [hn, vn, en] = v.split(',').map((s) => s.trim());
  return { hn, vn, en };
};

async function openNurseWindow(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    storageState: authFile('Nurse'),
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1920, height: 1080 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  });
  await cacheAppAssets(context);
  const nurse = await context.newPage();
  await openTaskList(nurse);
  await trackVideo(nurse, 'Nurse');
  return nurse;
}

const box = async (l: Locator) => (await l.boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };

test.describe('SBH-3612 ER รายการงานพยาบาล — Nurse Note ระดับผู้ป่วย (dev-x)', () => {
  test.describe.configure({ timeout: 1_800_000 });

  let opened: Map<string, ErVisit>;
  let nurse: Page | undefined;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
    nurse = undefined;
  });

  test.afterEach(async ({ page }) => {
    if (nurse) {
      await finishVideo(nurse).catch(() => undefined);
      await nurse.context().close().catch(() => undefined);
    }
    if (process.env.SBH3612_KEEP) return;
    for (const visit of opened.values()) {
      // มี order รังสี → ปิดได้ 400 ErrAccountHasUninvoicedItems → ชำระเงินสดทั้งหมดก่อน แล้วปิดใหม่ (แบบ SBH-2947 · รอบแรก 3 พ.ย. ปิดไม่ได้)
      const closeOnce = () => closeVisitAtCashier(page, visit.hn, visit.vn);
      const result = await closeOnce()
        .catch(async (error: Error) => {
          if (!/Uninvoiced/.test(error.message)) throw error;
          await gotoCashierAccount(page, visit.hn, visit.vn);
          await payAllInCash(page);
          return closeOnce();
        })
        .then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  test(
    'ปุ่ม เพิ่ม / ดู Nurse Note ระดับผู้ป่วย ข้างปุ่ม เพิ่ม Nurse task · แถว task ไม่มีเมนู Nurse note · บันทึก / ดูได้ · สลับผู้ป่วย (TC 001–009)',
    { tag: ['@SBH-3612', ...Object.values(ISSUE).map((id) => `@${id}`)], annotation: [linear('SBH-3612'), ...Object.values(ISSUE).map(linear)] },
    async ({ page, browser }) => {
      const { note } = makeRunner(page);
      const authorization = trackAuthorization(page);
      const stamp = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }).replace(':', '');
      const SEED_A = `SBH-3612 เดิม A ${stamp}`;
      const SEED_B = `SBH-3612 เดิม B ${stamp}`;
      const QA = `SBH-3612 QA ${stamp}`;
      const AIE = { assessment: `A: ${QA} ผู้ป่วยปวดศีรษะ`, intervention: `I: ${QA} วัดสัญญาณชีพซ้ำ`, evaluation: `E: ${QA} อาการทุเลา` };

      // ---------- เตรียมผู้ป่วย (Super_User) ----------
      const reuseA = fromEnv(process.env.SBH3612_A);
      const reuseB = fromEnv(process.env.SBH3612_B);
      const A = reuseA ?? (await preparePatient(page, 'Nn3612A', note));
      const B = reuseB ?? (await preparePatient(page, 'Nn3612B', note));
      if (reuseA) note('ผู้ป่วย A (เดิม)', `HN ${A.hn} · ${A.vn} · ${A.en}`);
      if (reuseB) note('ผู้ป่วย B (เดิม)', `HN ${B.hn} · ${B.vn} · ${B.en}`);
      if (!reuseA) await seedFocus(page, A, SEED_A);
      if (!reuseB) await seedFocus(page, B, SEED_B);
      note('Focus ตั้งต้น (บันทึกจาก Order Summary)', reuseA ? '(ใช้ของเดิม)' : `A: ${SEED_A} · B: ${SEED_B}`);

      nurse = await openNurseWindow(browser);
      const n = nurse;
      const { soft: nsoft, finish: nfinish } = makeRunner(n);
      await selectPatient(n, A.hn);
      if ((await taskRows(n).count()) < 2) {
        await addNurseTask(n, `SBH-3612 งานพยาบาล ${stamp}`);
        await expect.poll(async () => { await refresh(n); return taskRows(n).count(); }, { timeout: 60_000, intervals: [3_000] }).toBeGreaterThanOrEqual(2);
      }
      const tasksA = await fetchNurseTasks(page, authorization(), A.en);
      note('งานพยาบาลของ A (API)', tasksA.map((t) => `${t.type} ${t.name} ${t.status}`).join(' · '));
      expect(await taskRows(n).count(), 'Pre-condition: ผู้ป่วย A ต้องมีงานพยาบาล ≥ 2 แถว').toBeGreaterThanOrEqual(2);
      await clearEvidenceMarks(n);

      // ---------- TC-001 ปุ่ม เพิ่ม Nurse Note ----------
      await startClip(n, 'TC-001');
      await nsoft(`${TC(1)} มีปุ่ม เพิ่ม Nurse Note 1 ปุ่มที่แถบด้านบนตาราง ไม่ผูกกับแถว task`, async () => {
        const total = await addNoteBtn(n).count();
        const inBar = await topBar(n).getByRole('button', { name: /เพิ่ม Nurse Note/i }).count();
        const inRows = await taskRows(n).getByRole('button', { name: /เพิ่ม Nurse Note/i }).count();
        note(`${TC(1)} นับปุ่ม`, `ทั้งหน้า ${total} · แถบบน ${inBar} · ในแถว task ${inRows}`);
        await showCompareTable(n, 'ปุ่ม "เพิ่ม Nurse Note"', ['ที่เห็น'], [
          { label: 'ทั้งหน้า', values: [`${total} ปุ่ม`], same: total === 1 },
          { label: 'แถบด้านบนตาราง', values: [`${inBar} ปุ่ม`], same: inBar === 1 },
          { label: 'ในแถว task', values: [`${inRows} ปุ่ม`], same: inRows === 0 },
        ], { side: 'bottom' });
        await markEvidence(expected(addNoteBtn(n).first(), 'เพิ่ม Nurse Note ระดับผู้ป่วย'), expected(taskRows(n).first(), 'แถว task ไม่มีปุ่ม'));
        expect(total).toBe(1);
        expect(inBar).toBe(1);
        expect(inRows).toBe(0);
      });
      await hideCompareTable(n);

      // ---------- TC-002 ปุ่ม ดู Nurse Note ----------
      await startClip(n, 'TC-002');
      await nsoft(`${TC(2)} มีปุ่ม ดู Nurse Note 1 ปุ่มที่แถบด้านบนตาราง ไม่ผูกกับแถว task`, async () => {
        const total = await viewNoteBtn(n).count();
        const inBar = await topBar(n).getByRole('button', { name: /ดู Nurse Note/i }).count();
        const inRows = await taskRows(n).getByRole('button', { name: /ดู Nurse Note/i }).count();
        const label = (await viewNoteBtn(n).first().innerText()).trim();
        note(`${TC(2)} นับปุ่ม`, `ทั้งหน้า ${total} · แถบบน ${inBar} · ในแถว task ${inRows} · ข้อความ "${label}"`);
        await showCompareTable(n, 'ปุ่ม "ดู Nurse Note"', ['ที่เห็น'], [
          { label: 'ทั้งหน้า', values: [`${total} ปุ่ม (${label})`], same: total === 1 },
          { label: 'แถบด้านบนตาราง', values: [`${inBar} ปุ่ม`], same: inBar === 1 },
          { label: 'ในแถว task', values: [`${inRows} ปุ่ม`], same: inRows === 0 },
        ], { side: 'bottom' });
        await markEvidence(expected(viewNoteBtn(n).first(), 'ดู Nurse Note ระดับผู้ป่วย'), expected(taskRows(n).first(), 'แถว task ไม่มีปุ่ม'));
        expect(total).toBe(1);
        expect(inBar).toBe(1);
        expect(inRows).toBe(0);
      });
      await hideCompareTable(n);

      // ---------- TC-003 ตำแหน่ง ข้างปุ่ม + เพิ่ม Nurse task ----------
      await startClip(n, 'TC-003');
      await nsoft(`${TC(3)} ปุ่ม เพิ่ม / ดู Nurse Note อยู่แถวเดียวกันและติดกับปุ่ม + เพิ่ม Nurse task`, async () => {
        const [a, v, t] = [await box(addNoteBtn(n).first()), await box(viewNoteBtn(n).first()), await box(addTaskBtn(n).first())];
        const cy = (b: { y: number; height: number }) => Math.round(b.y + b.height / 2);
        const gapAV = Math.round(v.x - (a.x + a.width));
        const gapVT = Math.round(t.x - (v.x + v.width));
        const sameRow = Math.abs(cy(a) - cy(t)) <= 3 && Math.abs(cy(v) - cy(t)) <= 3;
        const order = (await topBar(n).getByRole('button').allInnerTexts()).map((s) => s.trim()).filter(Boolean);
        note(`${TC(3)} ตำแหน่ง`, `เพิ่ม x${Math.round(a.x)} y${cy(a)} · ดู x${Math.round(v.x)} y${cy(v)} · เพิ่ม Nurse task x${Math.round(t.x)} y${cy(t)} · ช่องว่าง ${gapAV}/${gapVT} px · ลำดับ ${order.join(' → ')}`);
        await showCompareTable(n, 'ตำแหน่งปุ่ม (พิกัดบนจอ)', ['ที่เห็น'], [
          { label: 'แถวเดียวกัน (กึ่งกลางแนวตั้ง)', values: [`${cy(a)} / ${cy(v)} / ${cy(t)} px`], same: sameRow },
          { label: 'ลำดับปุ่มในแถบ', values: [order.join(' → ')], same: true },
          { label: 'ช่องว่าง เพิ่ม → ดู', values: [`${gapAV} px`], same: gapAV >= 0 && gapAV <= 16 },
          { label: 'ช่องว่าง ดู → เพิ่ม Nurse task', values: [`${gapVT} px`], same: gapVT >= 0 && gapVT <= 16 },
        ], { side: 'bottom' });
        // กรอบเดียวรอบกลุ่มปุ่ม — ปุ่มห่างกัน 8 px ป้าย 3 อันเรียงชนกันจนอ่านไม่ออก (รอบแรก 3 พ.ย.)
        await markEvidence(expected(addTaskBtn(n).first().locator('xpath=..'), 'เพิ่ม · ดู Nurse Note อยู่ติดกับ + เพิ่ม Nurse task'));
        expect(sameRow, 'ปุ่มทั้ง 3 ต้องอยู่แถวเดียวกัน').toBe(true);
        expect(gapVT, 'ปุ่ม ดู Nurse Note ต้องติดกับ + เพิ่ม Nurse task').toBeLessThanOrEqual(16);
        expect(gapVT).toBeGreaterThanOrEqual(0);
        expect(gapAV).toBeLessThanOrEqual(16);
      });
      await hideCompareTable(n);

      // ---------- TC-004 แถว task ไม่มีเมนู Nurse note ----------
      await startClip(n, 'TC-004');
      await nsoft(`${TC(4)} หัวตารางไม่มีคอลัมน์ Nurse note · ทุกแถว task ไม่มีปุ่ม เพิ่ม / ดู Nurse note`, async () => {
        const headers = (await headerCells(n).allInnerTexts()).map((t) => t.trim());
        const rows = await taskRows(n).count();
        const rowNoteBtns = await taskRows(n).getByRole('button', { name: /Nurse note/i }).count();
        const rowNoteText = await taskRows(n).getByText(/Nurse note/i).count();
        note(`${TC(4)} หัวตาราง`, headers.join(' / '));
        note(`${TC(4)} แถว task`, `${rows} แถว · ปุ่ม Nurse note ในแถว ${rowNoteBtns} · ข้อความ Nurse note ในแถว ${rowNoteText}`);
        const hasCol = headers.some((h) => /nurse note/i.test(h));
        await showCompareTable(n, 'ตาราง task', ['ที่เห็น'], [
          { label: 'หัวตาราง', values: [headers.join(' / ')], same: !hasCol },
          { label: 'คอลัมน์ Nurse note', values: [hasCol ? 'มี' : 'ไม่มี'], same: !hasCol },
          { label: `ปุ่ม Nurse note ใน ${rows} แถว`, values: [`${rowNoteBtns} ปุ่ม`], same: rowNoteBtns === 0 && rowNoteText === 0 },
        ], { side: 'bottom' });
        await markEvidence(expected(headerRow(n), 'ไม่มีคอลัมน์ Nurse note'), expected(taskRows(n).first(), 'ไม่มีปุ่ม Nurse note'), expected(taskRows(n).nth(1), 'ไม่มีปุ่ม Nurse note'));
        expect(rows).toBeGreaterThanOrEqual(2);
        expect(hasCol, 'หัวตารางต้องไม่มีคอลัมน์ Nurse note').toBe(false);
        expect(rowNoteBtns + rowNoteText, 'แถว task ต้องไม่มีปุ่ม เพิ่ม / ดู Nurse note').toBe(0);
      });
      await hideCompareTable(n);

      // ---------- TC-005 กด เพิ่ม Nurse Note → หน้าต่างบันทึก ----------
      await startClip(n, 'TC-005');
      await nsoft(`${TC(5)} กด เพิ่ม Nurse Note → เปิดหน้าต่าง Nurse Note (Focus / A / I / E) ของผู้ป่วยที่เลือก`, async () => {
        await markEvidence(clicked(addNoteBtn(n).first()), expected(mainOf(n).getByText(`HN ${A.hn}`, { exact: true }).first(), 'ผู้ป่วย A ที่เลือก'));
        await snapEvidence(n, 'ก่อนกด — เพิ่ม Nurse Note');
        await addNoteBtn(n).first().click();
        const dialog = noteDialog(n);
        await expect(dialog).toBeVisible({ timeout: 20_000 });
        for (const label of ['Focus', 'Assessment (A)', 'Intervention (I)', 'Evaluation (E)']) await expect(dialog.getByText(label).first()).toBeVisible();
        // drawer ด้านหลังโหลด Focus ของผู้ป่วย A (Focus ตั้งต้นของ A) = หน้าต่างเปิดให้ผู้ป่วยที่เลือก
        await expect(focusCardIn(n, SEED_A)).toBeVisible({ timeout: 30_000 }).catch(() => undefined);
        const names = (await focusNames(n).allInnerTexts()).map((s) => s.trim());
        note(`${TC(5)} Focus ใน drawer ด้านหลัง`, names.join(' · '));
        await markEvidence(
          expected(dialog.locator('.ant-modal-title').first(), 'หน้าต่าง Nurse Note'),
          expected(dialog.getByText('Focus').first(), 'Focus'),
          expected(dialog.getByText('Assessment (A)').first(), 'A'),
          expected(dialog.getByText('Intervention (I)').first(), 'I'),
          expected(dialog.getByText('Evaluation (E)').first(), 'E'),
        );
        if (!reuseA) expect(names.some((s) => s.includes(SEED_A)), `drawer ด้านหลังต้องเป็นของผู้ป่วย A (มี ${SEED_A})`).toBe(true);
        expect(names.some((s) => s.includes(SEED_B)), 'ต้องไม่มี Focus ของผู้ป่วย B').toBe(false);
      });

      // ---------- TC-006 บันทึก ----------
      await startClip(n, 'TC-006');
      await nsoft(`${TC(6)} บันทึก Nurse Note จากปุ่มระดับผู้ป่วย → แจ้ง บันทึกข้อมูลสำเร็จ · หน้าต่างปิด`, async () => {
        const dialog = noteDialog(n);
        if (!(await dialog.isVisible())) {
          await closeDrawer(n);
          await addNoteBtn(n).first().click();
          await expect(dialog).toBeVisible({ timeout: 20_000 });
        }
        const times = await fillNurseNote(n, { focus: QA, ...AIE });
        note(`${TC(6)} ค่าที่กรอก`, `Focus ${QA} · ${AIE.assessment} · ${AIE.intervention} · ${AIE.evaluation} · Perform time ${times.join(' / ')}`);
        await markEvidence(filled(dialog.locator('input#focus'), 'Focus'), filled(dialog.locator('.ProseMirror').nth(0), 'A'), filled(dialog.locator('.ProseMirror').nth(1), 'I'), filled(dialog.locator('.ProseMirror').nth(2), 'E'), clicked(dialog.getByRole('button', { name: 'บันทึก' })));
        await snapEvidence(n, 'ก่อนกด — บันทึก Nurse Note');
        const result = await saveNurseNote(n);
        note(`${TC(6)} ผลบันทึก`, `${result.status ?? '-'} ${result.template ?? ''} · หน้าต่างปิด ${result.closed} · แจ้งเตือน ${result.notices.join(' · ') || '-'}`);
        const toast = n.locator('.ant-notification-notice:visible, .ant-message-notice:visible').filter({ hasText: 'บันทึกข้อมูลสำเร็จ' }).first();
        const toastSeen = result.notices.some((t) => t.includes('บันทึกข้อมูลสำเร็จ'));
        // หน้าต่าง Nurse Note ปิด → เหลือ drawer รายการ (Focus ใหม่ขึ้นในรายการทันที)
        const newCard = focusCardIn(n, QA).locator('[class*="_focus-name_"]').first();
        const marks = [];
        if (await toast.isVisible().catch(() => false)) {
          await toast.hover({ trial: true }).catch(() => undefined);
          marks.push(alerted(toast, 'บันทึกข้อมูลสำเร็จ'));
        }
        if (await newCard.isVisible().catch(() => false)) marks.push(expected(newCard, 'หน้าต่างบันทึกปิด · Focus ใหม่ในรายการ'));
        if (marks.length) await markEvidence(...marks);
        expect(toastSeen, `ต้องแจ้ง บันทึกข้อมูลสำเร็จ (ได้: ${result.notices.join(' · ') || 'ไม่มี'})`).toBe(true);
        expect(result.closed, 'หน้าต่าง Nurse Note ต้องปิด').toBe(true);
      });
      await n.waitForTimeout(1_500);
      await closeDrawer(n);

      // ---------- TC-007 กด ดู Nurse Note → รายการของผู้ป่วยที่เลือก ----------
      await startClip(n, 'TC-007');
      await nsoft(`${TC(7)} กด ดู Nurse Note → เปิดรายการ Nurse Note ของผู้ป่วยที่เลือก แสดง Focus ที่มีอยู่`, async () => {
        await markEvidence(clicked(viewNoteBtn(n).first()), expected(mainOf(n).getByText(`HN ${A.hn}`, { exact: true }).first(), 'ผู้ป่วย A ที่เลือก'));
        await snapEvidence(n, 'ก่อนกด — ดู Nurse Note');
        await openViewDrawer(n);
        const names = (await focusNames(n).allInnerTexts()).map((s) => s.trim());
        note(`${TC(7)} Focus ที่แสดง`, names.join(' · '));
        const want = reuseA ? [QA] : [SEED_A, QA];
        await showCompareTable(n, 'Focus ของผู้ป่วย A', ['ใน drawer'], [
          ...want.map((f) => ({ label: f, values: [names.some((s) => s.includes(f)) ? 'แสดง' : 'ไม่แสดง'], same: names.some((s) => s.includes(f)) })),
          { label: `Focus ของ B (${SEED_B})`, values: [names.some((s) => s.includes(SEED_B)) ? 'แสดง' : 'ไม่แสดง'], same: !names.some((s) => s.includes(SEED_B)) },
        ], { side: 'left' });
        const marks = want.filter((f) => names.some((s) => s.includes(f))).map((f) => expected(focusCardIn(n, f).locator('[class*="_focus-name_"]'), f === QA ? 'Focus ที่เพิ่งบันทึก' : 'Focus ที่มีอยู่'));
        await markEvidence(expected(noteDrawer(n).locator('.ant-drawer-title'), 'รายการ Nurse Note'), ...marks);
        for (const f of want) expect(names.some((s) => s.includes(f)), `ต้องแสดง Focus ${f}`).toBe(true);
        expect(names.some((s) => s.includes(SEED_B)), 'ต้องไม่มี Focus ของผู้ป่วย B').toBe(false);
      });
      await hideCompareTable(n);

      // ---------- TC-008 Focus ที่บันทึกแสดงพร้อม A / I / E ----------
      await startClip(n, 'TC-008');
      await nsoft(`${TC(8)} Focus ${QA} แสดงในรายการ ดู Nurse Note พร้อม A / I / E ตรงกับที่กรอก`, async () => {
        if (!(await noteDrawer(n).isVisible())) await openViewDrawer(n);
        const card = focusCardIn(n, QA);
        await expect(card).toBeVisible({ timeout: 20_000 });
        if (!(await card.locator('[class*="_nursing-note-content_"]').first().isVisible().catch(() => false))) {
          await card.locator('button[class*="_header_"]').first().click();
        }
        await expect(card.locator('[class*="_nursing-note-content_"]').first()).toBeVisible({ timeout: 20_000 });
        await n.waitForTimeout(800);
        const notes = await readFocusNotes(card);
        const got = notes[0] ?? { A: '', I: '', E: '' };
        note(`${TC(8)} A/I/E ที่แสดง`, JSON.stringify(notes));
        const rows: CompareRow[] = [
          { label: 'A', values: [AIE.assessment, got.A || '(ไม่มี)'], same: got.A === AIE.assessment },
          { label: 'I', values: [AIE.intervention, got.I || '(ไม่มี)'], same: got.I === AIE.intervention },
          { label: 'E', values: [AIE.evaluation, got.E || '(ไม่มี)'], same: got.E === AIE.evaluation },
        ];
        await showCompareTable(n, `Focus ${QA}`, ['ที่กรอก (TC-006)', 'ที่แสดง'], rows, { side: 'left' });
        await markEvidence(expected(card.locator('[class*="_focus-name_"]').first(), 'Focus ที่บันทึก'), expected(card.locator('[class*="_content_"]').first(), 'A / I / E ตรงกับที่กรอก'));
        expect(rows.every((r) => r.same), 'A / I / E ต้องตรงกับที่กรอก').toBe(true);
      });
      await hideCompareTable(n);
      await closeDrawer(n);

      // ---------- TC-009 สลับผู้ป่วย ----------
      await startClip(n, 'TC-009');
      await nsoft(`${TC(9)} สลับไปผู้ป่วย B → ดู Nurse Note แสดงของ B เท่านั้น ไม่มี Focus ของ A ปน`, async () => {
        // ขั้น 2: ผู้ป่วย A → ดู → จำ Focus → ปิด
        await openViewDrawer(n);
        const namesA = (await focusNames(n).allInnerTexts()).map((s) => s.trim());
        note(`${TC(9)} Focus ของ A`, namesA.join(' · '));
        await markEvidence(expected(noteDrawer(n).locator('[class*="_focus-list_"]').first(), 'Focus ของผู้ป่วย A'));
        await snapEvidence(n, 'ผู้ป่วย A — Focus ที่แสดง');
        await closeDrawer(n);
        // ขั้น 3: เลือกผู้ป่วย B
        await markEvidence(clicked(patientBtn(n, B.hn), 'ผู้ป่วย B'));
        await snapEvidence(n, 'ก่อนกด — เลือกผู้ป่วย B');
        await selectPatient(n, B.hn);
        // ขั้น 4: ดู Nurse Note
        await markEvidence(expected(mainOf(n).getByText(`HN ${B.hn}`, { exact: true }).first(), 'ผู้ป่วย B ที่เลือก'), clicked(viewNoteBtn(n).first()));
        await snapEvidence(n, 'ก่อนกด — ดู Nurse Note ของ B');
        await openViewDrawer(n);
        const namesB = (await focusNames(n).allInnerTexts()).map((s) => s.trim());
        note(`${TC(9)} Focus ของ B`, namesB.join(' · '));
        const leaked = namesA.filter((a) => namesB.includes(a));
        await showCompareTable(n, 'สลับผู้ป่วย A → B', ['ผู้ป่วย A', 'ผู้ป่วย B'], [
          { label: 'Focus ที่แสดง', values: [namesA.join(' · '), namesB.join(' · ') || '(ไม่มี)'], same: true },
          { label: `Focus ของ B (${SEED_B})`, values: ['-', namesB.some((s) => s.includes(SEED_B)) ? 'แสดง' : 'ไม่แสดง'], same: reuseB ? true : namesB.some((s) => s.includes(SEED_B)) },
          { label: 'Focus ของ A ที่ปนมา', values: ['-', leaked.join(' · ') || 'ไม่มี'], same: leaked.length === 0 },
        ], { side: 'left' });
        await markEvidence(expected(noteDrawer(n).locator('[class*="_focus-list_"]').first(), 'Focus ของ B เท่านั้น'));
        if (!reuseB) expect(namesB.some((s) => s.includes(SEED_B)), `ต้องแสดง Focus ของ B (${SEED_B})`).toBe(true);
        expect(leaked, 'ต้องไม่มี Focus ของผู้ป่วย A ปน').toEqual([]);
      });
      await hideCompareTable(n);
      await closeDrawer(n);
      await startClip(n, 'after');
      nfinish();
    },
  );
});
