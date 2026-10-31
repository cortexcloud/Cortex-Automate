import { type Browser, type Locator, type Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, clicked, expected, filled, holdForClip, makeRunner, markEvidence, snapEvidence } from '../../../helpers/functions/evidence';
import { finishVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { fetchNurseTasks, orderAlert, confirmOrderAlert, registerAndOpenErVisit, submitOrders } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, careMenu, gotoVisit } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// SBH-3158 [ER][Order Summary] เพิ่ม Action บน Order Summary — ปุ่ม รับ Order / เสร็จสิ้น / ยกเลิก Order ของ หัตถการ · รังสี · Lab · เวชภัณฑ์
//   + Checkbox หัวตารางเลือกทุกรายการของประเภท + ปุ่ม เสร็จสิ้น (n) ในแถบเมื่อเลือกหลายรายการ + ตรงกับ ER Nurse Task List ทั้ง 2 ทาง
// ชุด EXE SBH-3242 → HPY SBH-3243 → TC-001…032 (เลข Issue ดู ISSUE) · 1 เทสต่อผู้ป่วย (R9) · คลิปแยกต่อ TC (R61)
//   ผู้ป่วย A = TC 001–016 · ผู้ป่วย B = TC 017–024 · ผู้ป่วย C = TC 025–032
// บัญชี: Super_User (user1) ลงทะเบียน / คัดกรอง / สั่ง One Day Order (= แพทย์ส่งคำสั่ง) · Nurse (x-nurse) กดปุ่มใน Order Summary / ER Nurse Task List (หน้าต่างแยก · คลิปจากหน้าต่างนี้)
// ข้อมูลบน dev-x (สำรวจ 29 ต.ค. 2026 · ไฟล์แอป index-DoL2cL_M.js · locale er-order-summary):
//   หัตถการ: ใช้ได้แค่ ECG 89.52 (SBHACT… อยู่หมวด 11 ที่ปิดใช้งาน ส่งคำสั่งไม่ผ่าน) → ผู้ใช้ให้ "ใช้ ECG ซ้ำ" เป็นรายการที่ 1 / 2 / 3
//   เวชภัณฑ์: ต้องกรอก "จำนวนที่จ่าย" ก่อนเพิ่มลงตะกร้า · ที่มีราคา: NUH-OS-MDS-125 / 116 / 104 / 123 (ตัวอื่นขึ้น "ไม่พบราคาต่อหน่วย")
//   Lab: สั่งได้แต่ไม่เกิดงานพยาบาล (SPECIMEN) → แถว Lab ไม่มีปุ่ม · Checkbox กดไม่ได้ — ผู้ใช้ให้ "เล่นเก็บหลักฐาน + Fail + Failed"
//   ER Nurse Task List: รับงานแล้วสถานะ "กำลังทำ" — ผู้ใช้ให้ถือว่าตรงกับ Expected "สถานะรับ Order แล้ว" (เขียนในผลว่าเห็นอะไร)
// ไม่ได้บันทึก ER Physician Note (ไม่จำเป็นต่อการส่งคำสั่ง One Day Order — เขียนในผล)
// รัน (dev-x): npx playwright test --headed --grep @SBH-3158   ·  เฉพาะผู้ป่วย: --grep "@SBH-3158-A" / B / C
// SBH3158_KEEP=1 = ไม่ปิด Visit ท้ายเทส

const ISSUE: Record<number, string> = {};
for (let n = 1; n <= 29; n++) ISSUE[n] = `SBH-${3243 + n}`;
Object.assign(ISSUE, { 30: 'SBH-3274', 31: 'SBH-3275', 32: 'SBH-3277' });
const pad = (n: number) => String(n).padStart(3, '0');
const TC = (n: number) => `TC-${pad(n)} (${ISSUE[n]})`;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const tags = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `@${ISSUE[from + i]}`);
const notes = (from: number, to: number) => [linear('SBH-3158'), ...Array.from({ length: to - from + 1 }, (_, i) => linear(ISSUE[from + i]))];

type Kind = 'activity' | 'imaging' | 'lab' | 'supply';
const KIND: Record<Kind, { label: string; title: RegExp }> = {
  activity: { label: 'หัตถการ', title: /^หัตถการ - / },
  imaging: { label: 'รังสี', title: /^รังสี - / },
  lab: { label: 'Lab', title: /^ห้องปฏิบัติการ - / },
  supply: { label: 'เวชภัณฑ์', title: /^เวชภัณฑ์$/ },
};
const ECG = '89.52';

// ---------- Order Summary (หน้าต่าง Nurse) ----------

const mainOf = (p: Page) => p.getByRole('main');
/** การ์ดของประเภทนั้นใน ORDER FOR ONE DAY (หัวการ์ด เช่น "รังสี - XR - วันนี้ - 29/10/2569") */
const card = (p: Page, kind: Kind) =>
  mainOf(p).locator('.ant-card-head-title').filter({ hasText: KIND[kind].title }).first().locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " ant-card ")][1]');
const rowsOf = (p: Page, kind: Kind) => card(p, kind).locator('tbody tr.ant-table-row');
const btn = (row: Locator, name: 'รับ Order' | 'เสร็จสิ้น' | 'ยกเลิก Order') => row.getByRole('button', { name, exact: true });
const actionHeader = (p: Page, kind: Kind) => card(p, kind).locator('thead th').filter({ hasText: /^Action$/ }).first();
const headerCheckbox = (p: Page, kind: Kind) => card(p, kind).locator('thead .ant-table-selection-column .ant-checkbox-input').first();
const rowCheckbox = (row: Locator) => row.locator('td.ant-table-selection-column .ant-checkbox-input').first();
const bulkBar = (p: Page) => mainOf(p).locator('[class*="_bulk-bar_"]').first();
const toast = (p: Page, text: string | RegExp) => p.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: text }).first();

async function openOrderSummary(nurse: Page, visit: ErVisit, reload = true) {
  if (reload) await gotoVisit(nurse, visit);
  await careMenu(nurse, 'Order Summary', mainOf(nurse).getByText('ORDER FOR ONE DAY', { exact: true }).first());
  // ตารางโหลดสถานะงานพยาบาลตามหลัง (GET /er/nurse-tasks) — รอให้แถวแรกของการ์ดเวชภัณฑ์ขึ้น
  await expect(rowsOf(nurse, 'supply').first()).toBeVisible({ timeout: 60_000 });
  await nurse.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  // แถบเมนูขวากางค้างหลังกดเมนู (บังคอลัมน์ Action) → คลิกหัวข้อ ORDER FOR ONE DAY + ย้ายเมาส์ออก รอหุบ
  await mainOf(nurse).getByText('ORDER FOR ONE DAY', { exact: true }).first().click();
  await nurse.mouse.move(960, 1000);
  await nurse.waitForTimeout(1_000);
}

/** ช่องคอลัมน์ Action ของแถว (ใช้ตีกรอบเมื่อแถวไม่มีปุ่ม) */
async function actionCell(p: Page, kind: Kind, row: Locator) {
  const index = await actionHeader(p, kind).evaluate((th) => [...(th.parentElement?.children ?? [])].indexOf(th));
  return row.locator(':scope > td').nth(index);
}

/** แถวไม่มีปุ่มที่ต้องกด → ตีกรอบช่อง Action "ไม่มีปุ่ม …" ถ่ายภาพ แล้วให้ step ไม่ผ่าน */
async function expectButton(p: Page, kind: Kind, row: Locator, name: 'รับ Order' | 'เสร็จสิ้น' | 'ยกเลิก Order', message: string) {
  if (await btn(row, name).isVisible({ timeout: 5_000 }).catch(() => false)) return;
  await showCard(p, kind);
  await markEvidence(expected(await actionCell(p, kind, row), `ไม่มีปุ่ม ${name}`));
  await snapEvidence(p, `ไม่มีปุ่ม ${name} — ${KIND[kind].label}`);
  await expect(btn(row, name), message).toBeVisible({ timeout: 1_000 });
}

/** เลื่อนการ์ดมากลางจอ (การ์ดล่างๆ อยู่นอกจอ) */
async function showCard(p: Page, kind: Kind) {
  await card(p, kind).scrollIntoViewIfNeeded();
  await card(p, kind).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await p.mouse.move(960, 1000);
}

async function snapToast(p: Page, text: string | RegExp, name: string) {
  const t = toast(p, text);
  await expect(t, `ต้องมีแจ้งเตือน "${text}"`).toBeVisible({ timeout: 15_000 });
  await t.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
  await markEvidence(alerted(t));
  await snapEvidence(p, name);
}

/** ชื่อรายการในแถว: "[รหัส] ชื่อ" → { code, name } */
async function rowItem(row: Locator) {
  const text = (await row.innerText()).replace(/\s+/g, ' ');
  const m = text.match(/\[([^\]]+)\]\s*(.+?)(?:\s+(?:Routine|routine|-|set)\b|$)/);
  return { code: m?.[1] ?? '', name: (m?.[2] ?? '').trim(), text };
}

/** กด เสร็จสิ้น ในแถว / แถบ → หน้าต่าง "บันทึกเสร็จสิ้น" → เลือก ทำโดย คนแรก → บันทึก */
async function confirmComplete(nurse: Page, shotName: string) {
  const dialog = nurse.getByRole('dialog', { name: 'บันทึกเสร็จสิ้น' });
  await expect(dialog, 'กด เสร็จสิ้น แล้วต้องมีหน้าต่าง บันทึกเสร็จสิ้น').toBeVisible({ timeout: 15_000 });
  await dialog.locator('.ant-select').first().click();
  const option = nurse.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  const save = dialog.getByRole('button', { name: 'บันทึก', exact: true });
  await markEvidence(filled(dialog.locator('.ant-select').first(), 'ทำโดย'), expected(dialog.getByText(/ทำเมื่อ/).first(), 'เวลาเติมให้'), clicked(save));
  await snapEvidence(nurse, `ก่อนกด — ${shotName}`);
  const done = nurse.waitForResponse((r) => /\/er\/nurse-tasks\/[^/]+\/complete/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
  done.catch(() => undefined);
  await save.click();
  const res = await done;
  expect(res.status(), 'บันทึกเสร็จสิ้น API ต้องตอบ 200').toBe(200);
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

/** กด ยกเลิก Order ในแถว → หน้าต่าง ยกเลิก Order → เหตุผล อื่น ๆ + หมายเหตุ → ยืนยันยกเลิก */
async function confirmCancel(nurse: Page, shotName: string) {
  const dialog = nurse.getByRole('dialog', { name: 'ยกเลิก Order' });
  await expect(dialog, 'กด ยกเลิก Order แล้วต้องมีหน้าต่างยืนยัน').toBeVisible({ timeout: 15_000 });
  await dialog.locator('.ant-select').first().click();
  await nurse.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'อื่น ๆ' }).first().click();
  const note = dialog.getByRole('textbox').last();
  await note.fill('ทดสอบ SBH-3158');
  const confirm = dialog.getByRole('button', { name: 'ยืนยันยกเลิก' });
  await markEvidence(filled(dialog.locator('.ant-select').first(), 'เหตุผล'), filled(note), clicked(confirm));
  await snapEvidence(nurse, `ก่อนกด — ${shotName}`);
  const cancelled = nurse.waitForResponse((r) => /\/er\/nurse-tasks\/[^/]+\/cancel/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
  cancelled.catch(() => undefined);
  await confirm.click();
  const res = await cancelled;
  expect(res.status(), 'ยกเลิก Order API ต้องตอบ 200').toBe(200);
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

// ---------- ER Nurse Task List (หน้าต่าง Nurse) ----------

const taskRows = (p: Page, name: string) => mainOf(p).locator('[class*="_data-row_"]').filter({ hasText: name });
const taskStatus = (row: Locator) => row.locator('[data-label="สถานะ"]');

async function openTaskList(nurse: Page, visit: ErVisit) {
  await nurse.goto('/cortex/er/nurse-task-list');
  const patient = mainOf(nurse).getByRole('button', { name: new RegExp(`HN ${visit.hn} `) }).first();
  await patient.click({ timeout: 90_000 });
  await expect(mainOf(nurse).getByText(`HN ${visit.hn}`, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(mainOf(nurse).locator('[class*="_data-row_"]').first()).toBeVisible({ timeout: 60_000 });
  await nurse.mouse.move(960, 1000);
}

// ---------- ผู้ป่วย (หน้าต่าง Super_User) ----------

/** เปิด One Day Order จนช่องค้นหาขึ้นและอยู่ต่อ 3 วินาที (แผง Overview ที่โหลดตามหลังทับได้) */
async function openOneDayOrder(page: Page) {
  const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  await expect(async () => {
    if (!(await search.isVisible())) await careMenu(page, 'One Day Order', mainOf(page).getByRole('heading', { name: 'Order', exact: true }));
    await expect(search).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3_000);
    await expect(search).toBeVisible({ timeout: 1_000 });
  }, 'เปิด One Day Order').toPass({ timeout: 120_000 });
}

/** เวชภัณฑ์: เลือกรายการ → กรอก จำนวนที่จ่าย 1 → เพิ่มลงตะกร้า (submitOrders ไม่รองรับช่องจำนวน) */
async function addSupply(page: Page, code: string) {
  const main = mainOf(page);
  const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  const rows = main.getByRole('row').filter({ hasText: `[${code}]` });
  const before = await rows.count();
  await expect(async () => {
    // หน้าเพิ่งโหลดเปิดแผง Overview ตามหลังแล้วทับแท็บ One Day Order → ช่องค้นหาหาย ให้เปิดเมนูซ้ำ
    if (!(await search.isVisible())) await openOneDayOrder(page);
    // fill() ทีเดียวบางรอบไม่ยิงค้นหา (dev-x 29 ต.ค. — รายการไม่เด้ง) → ล้างแล้วพิมพ์ทีละตัว
    await search.click();
    await search.fill('');
    await search.pressSequentially(code, { delay: 40 });
    const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: `[${code}]` }).first();
    await expect(option, `ต้องค้นเจอ ${code}`).toBeVisible({ timeout: 10_000 });
    await option.click();
    const qty = main.getByRole('textbox', { name: /จำนวนที่จ่าย/ }).or(main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ })).first();
    await expect(qty).toBeVisible();
    await page.waitForTimeout(1_500);
    await qty.click();
    await qty.fill('');
    await qty.pressSequentially('1', { delay: 100 });
    await page.keyboard.press('Tab');
    const add = page.getByRole('button', { name: 'plus เพิ่มลงตะกร้า' });
    await expect(add, `${code}: ปุ่มเพิ่มลงตะกร้าต้องกดได้ (ถ้าไม่มีราคาจะขึ้น "ไม่พบราคาต่อหน่วย")`).toBeEnabled({ timeout: 10_000 });
    await add.click();
    if (await orderAlert(page).isVisible({ timeout: 3_000 }).catch(() => false)) await confirmOrderAlert(page);
    await expect(rows).toHaveCount(before + 1, { timeout: 15_000 });
  }, `เพิ่ม ${code} ลงตะกร้า`).toPass({ timeout: 120_000 });
}

/** ผู้ป่วย AUTO ใหม่ → Visit ER → คัดกรอง ESI 3 → One Day Order (แพทย์ส่งคำสั่ง) */
async function preparePatient(page: Page, label: string, orders: string[], supplies: string[], note: (t: string, d: string) => void): Promise<ErVisit> {
  // SBH3158_VISIT=<HN>,<VN>,<EN> = ทำต่อกับผู้ป่วยเดิมที่ส่งคำสั่งแล้ว (รันทีละเทส)
  const reuse = (process.env.SBH3158_VISIT ?? '').split(',').filter(Boolean);
  if (reuse.length === 3) {
    const visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
    note('ผู้ป่วย (ทำต่อกับรายเดิม — ส่งคำสั่งไว้แล้ว)', `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
    return visit;
  }
  await gotoErDashboard(page);
  const patient = newTestPatient(label);
  const visit = await registerAndOpenErVisit(page, patient);
  note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
  await expect(mainOf(page).getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first()).toBeVisible({ timeout: 90_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
  await openOneDayOrder(page);
  for (const code of supplies) await addSupply(page, code);
  await submitOrders(page, orders);
  note('สั่ง One Day Order (ส่งคำสั่งแล้ว)', [...supplies, ...orders].join(' · '));
  return visit;
}

/** หน้าต่างของ Nurse (x-nurse) ที่ Visit นี้ — คลิปเริ่มหลังหน้าโหลดเสร็จ (trackVideo) */
async function openNurseWindow(browser: Browser, visit: ErVisit): Promise<Page> {
  const context = await browser.newContext({
    storageState: authFile('Nurse'),
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1920, height: 1080 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  });
  await cacheAppAssets(context);
  const nurse = await context.newPage();
  await gotoVisit(nurse, visit);
  await trackVideo(nurse, 'Nurse');
  return nurse;
}

async function closeVisits(page: Page, opened: Map<string, ErVisit>) {
  if (process.env.SBH3158_KEEP) return;
  for (const visit of opened.values()) {
    const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
      (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
      (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
    );
    test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
    console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
  }
}

test.describe('SBH-3158 Order Summary ER: ปุ่มงานพยาบาลของ หัตถการ / รังสี / Lab / เวชภัณฑ์ (dev-x)', () => {
  test.describe.configure({ timeout: 2_400_000 });

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
    await closeVisits(page, opened);
  });

  // ================= ผู้ป่วย A: TC 001–016 (แสดงปุ่ม · รับ Order · เสร็จสิ้น · ยกเลิก Order รายแถว) =================
  test(
    'ผู้ป่วย A: ปุ่มในแถว รับ Order / เสร็จสิ้น / ยกเลิก Order ของ 4 ประเภท (TC 001–016)',
    { tag: ['@SBH-3158', '@SBH-3158-A', ...tags(1, 16)], annotation: notes(1, 16) },
    async ({ page, browser }) => {
      const { note, soft, finish } = makeRunner(page);
      const authorization = trackAuthorization(page);
      const visit = await preparePatient(page, 'Os3158A', [ECG, ECG, 'SBHIMG1', 'SBHIMG21', 'SBHLAB2', 'SBHLAB5'], ['NUH-OS-MDS-125', 'NUH-OS-MDS-116'], note);
      nurse = await openNurseWindow(browser, visit);
      const n = nurse;
      const run = makeRunner(n);
      await openOrderSummary(n, visit, false);

      const plan: [Kind, number][] = [['activity', 1], ['imaging', 5], ['lab', 9], ['supply', 13]];
      for (const [kind, first] of plan) {
        const label = KIND[kind].label;
        const rows = rowsOf(n, kind);

        // --- แสดงปุ่ม ---
        await startClip(n, `TC-${pad(first)}`);
        const shown = await run.soft(`${TC(first)} ตาราง${label}มีคอลัมน์ Action + แถวที่ยังไม่รับ Order มีปุ่ม รับ Order / เสร็จสิ้น / ยกเลิก Order`, async () => {
          await showCard(n, kind);
          await expect(rows, `ตาราง${label}ต้องมีอย่างน้อย 2 แถว`).toHaveCount(2, { timeout: 30_000 });
          const marks = [expected(actionHeader(n, kind), 'คอลัมน์ Action')];
          for (let i = 0; i < 2; i++) {
            const row = rows.nth(i);
            const has = await Promise.all((['รับ Order', 'เสร็จสิ้น', 'ยกเลิก Order'] as const).map((b) => btn(row, b).isVisible()));
            note(`${TC(first)} แถว ${i + 1}`, `${(await rowItem(row)).text.slice(0, 80)} → ปุ่ม: ${has.every(Boolean) ? 'ครบ 3 ปุ่ม' : `รับ Order ${has[0] ? '✓' : '✗'} · เสร็จสิ้น ${has[1] ? '✓' : '✗'} · ยกเลิก Order ${has[2] ? '✓' : '✗'}`}`);
            marks.push(expected(await actionCell(n, kind, row), has.every(Boolean) ? `แถว ${i + 1}: 3 ปุ่ม` : `แถว ${i + 1}: ไม่มีปุ่ม`));
          }
          await markEvidence(...marks);
          await holdForClip(n);
          if (kind === 'lab') {
            const tasks = await fetchNurseTasks(page, authorization(), visit.en).catch(() => []);
            const counts = tasks.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.source]: (acc[t.source] ?? 0) + 1 }), {});
            note(`${TC(first)} งานพยาบาลของ Encounter (API)`, JSON.stringify(counts));
            await test.info().attach(`${TC(first)} งานพยาบาล (GET /er/nurse-tasks?en=)`, { body: JSON.stringify(tasks, null, 2), contentType: 'application/json' });
          }
          for (let i = 0; i < 2; i++) {
            for (const b of ['รับ Order', 'เสร็จสิ้น', 'ยกเลิก Order'] as const) await expect(btn(rows.nth(i), b), `แถว${label}ที่ ${i + 1} ต้องมีปุ่ม ${b}`).toBeVisible({ timeout: 5_000 });
          }
        });

        // --- รับ Order แถว 1 ---
        await startClip(n, `TC-${pad(first + 1)}`);
        const acceptedOk = await run.soft(`${TC(first + 1)} กด รับ Order แถว${label}รายการที่ 1 → ปุ่ม รับ Order แถวนั้นหาย · แถวอื่นยังมี`, async () => {
          await showCard(n, kind);
          const row1 = rows.nth(0);
          const accept = btn(row1, 'รับ Order');
          await expectButton(n, kind, row1, 'รับ Order', `แถว${label}รายการที่ 1 ต้องมีปุ่ม รับ Order`);
          await markEvidence(clicked(accept));
          await snapEvidence(n, `ก่อนกด — รับ Order ${label} 1`);
          await accept.click();
          await snapToast(n, 'รับ Order แล้ว 1 รายการ', `หลังกด — รับ Order ${label} 1`);
          await expect(accept, 'หลังรับ Order ปุ่ม รับ Order ในแถวนั้นต้องหายไป').toBeHidden({ timeout: 20_000 });
          await expect(btn(rows.nth(1), 'รับ Order'), `${label}รายการที่ 2 ต้องยังมีปุ่ม รับ Order`).toBeVisible();
          await markEvidence(expected(btn(row1, 'เสร็จสิ้น').locator('xpath=ancestor::td[1]'), 'แถว 1: ไม่มี รับ Order แล้ว'), expected(btn(rows.nth(1), 'รับ Order'), 'แถว 2: ยังมี รับ Order'));
          await holdForClip(n);
        });
        void shown;

        // --- เสร็จสิ้น แถว 1 ---
        await startClip(n, `TC-${pad(first + 2)}`);
        await run.soft(`${TC(first + 2)} กด เสร็จสิ้น แถว${label}รายการที่ 1 (รับ Order แล้ว) → ยืนยัน → ไม่มีปุ่ม รับ Order / เสร็จสิ้น ให้กดซ้ำ`, async () => {
          await showCard(n, kind);
          const row1 = rows.nth(0);
          const complete = btn(row1, 'เสร็จสิ้น');
          await expectButton(n, kind, row1, 'เสร็จสิ้น', `แถว${label}รายการที่ 1 ต้องมีปุ่ม เสร็จสิ้น`);
          expect(acceptedOk, `ต้องรับ Order แถว${label}รายการที่ 1 ได้ก่อน (${TC(first + 1)})`).toBe(true);
          await markEvidence(clicked(complete));
          await snapEvidence(n, `ก่อนกด — เสร็จสิ้น ${label} 1`);
          await complete.click();
          await confirmComplete(n, `บันทึกเสร็จสิ้น ${label} 1`);
          await snapToast(n, 'บันทึกเสร็จสิ้นแล้ว 1 รายการ', `หลังกด — เสร็จสิ้น ${label} 1`);
          await expect(btn(row1, 'รับ Order')).toBeHidden({ timeout: 20_000 });
          await expect(btn(row1, 'เสร็จสิ้น'), 'หลังบันทึกเสร็จสิ้น ปุ่ม เสร็จสิ้น ต้องหายไป').toBeHidden({ timeout: 20_000 });
          await showCard(n, kind);
          await markEvidence(expected(row1, 'เสร็จสิ้นแล้ว: ไม่มีปุ่ม'));
          await holdForClip(n);
        });

        // --- ยกเลิก Order แถว 2 ---
        await startClip(n, `TC-${pad(first + 3)}`);
        await run.soft(`${TC(first + 3)} กด ยกเลิก Order แถว${label}รายการที่ 2 (ยังไม่รับ Order) → ยืนยัน → ไม่มีปุ่มให้กดต่อ`, async () => {
          await showCard(n, kind);
          const row2 = rows.nth(1);
          const cancel = btn(row2, 'ยกเลิก Order');
          await expectButton(n, kind, row2, 'ยกเลิก Order', `แถว${label}รายการที่ 2 ต้องมีปุ่ม ยกเลิก Order`);
          await markEvidence(clicked(cancel));
          await snapEvidence(n, `ก่อนกด — ยกเลิก Order ${label} 2`);
          await cancel.click();
          await confirmCancel(n, `ยืนยันยกเลิก ${label} 2`);
          await snapToast(n, 'ยกเลิก Order แล้ว 1 รายการ', `หลังกด — ยกเลิก ${label} 2`);
          for (const b of ['รับ Order', 'เสร็จสิ้น', 'ยกเลิก Order'] as const) await expect(btn(row2, b), `หลังยกเลิก ต้องไม่มีปุ่ม ${b}`).toBeHidden({ timeout: 20_000 });
          await showCard(n, kind);
          await markEvidence(expected(row2, 'ยกเลิกแล้ว: ไม่มีปุ่ม'));
          await holdForClip(n);
        });
      }

      const tasks = await fetchNurseTasks(page, authorization(), visit.en).catch(() => []);
      note('สถานะงานพยาบาลท้ายเทส (API)', tasks.map((t) => `${t.source} ${t.name} = ${t.status}`).join(' | '));
      await test.info().attach('งานพยาบาลท้ายเทส (API)', { body: JSON.stringify(tasks, null, 2), contentType: 'application/json' });
      run.finish();
      finish();
    },
  );

  // ================= ผู้ป่วย B: TC 017–024 (Checkbox หัวตาราง · เสร็จสิ้น จากแถบ) =================
  test(
    'ผู้ป่วย B: Checkbox หัวตาราง + เลือกหลายรายการแล้วกด เสร็จสิ้น จากแถบ (TC 017–024)',
    { tag: ['@SBH-3158', '@SBH-3158-B', ...tags(17, 24)], annotation: notes(17, 24) },
    async ({ page, browser }) => {
      const { note, finish } = makeRunner(page);
      const authorization = trackAuthorization(page);
      const visit = await preparePatient(
        page,
        'Os3158B',
        [ECG, ECG, ECG, 'SBHIMG1', 'SBHIMG21', 'SBHIMG101', 'SBHLAB2', 'SBHLAB5', 'SBHLAB1070'],
        ['NUH-OS-MDS-125', 'NUH-OS-MDS-116', 'NUH-OS-MDS-104'],
        note,
      );
      nurse = await openNurseWindow(browser, visit);
      const n = nurse;
      const run = makeRunner(n);
      await openOrderSummary(n, visit, false);
      const kinds: Kind[] = ['activity', 'imaging', 'lab', 'supply'];
      const others = (kind: Kind) => kinds.filter((k) => k !== kind);
      const clearSelection = async () => {
        const clear = bulkBar(n).getByRole('button', { name: 'ล้างการเลือก' });
        if (await clear.isVisible().catch(() => false)) await clear.click();
        await expect(bulkBar(n)).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
      };

      // --- Checkbox หัวตาราง ---
      for (const [i, kind] of kinds.entries()) {
        const no = 17 + i;
        const label = KIND[kind].label;
        await startClip(n, `TC-${pad(no)}`);
        await run.soft(`${TC(no)} ติ๊ก Checkbox หัวตาราง${label} → ${label}ทุกรายการถูกติ๊ก · แถบแสดง "เลือก N รายการ" · ประเภทอื่นไม่ถูกติ๊ก`, async () => {
          await clearSelection();
          await showCard(n, kind);
          const rows = rowsOf(n, kind);
          const total = await rows.count();
          const header = headerCheckbox(n, kind);
          const enabled = await header.isEnabled();
          note(`${TC(no)} ตาราง${label}`, `${total} แถว · Checkbox หัวตาราง ${enabled ? 'กดได้' : 'กดไม่ได้ (disabled)'}`);
          await markEvidence(enabled ? clicked(header.locator('xpath=ancestor::th[1]'), 'Checkbox หัวตาราง') : expected(header.locator('xpath=ancestor::th[1]'), 'Checkbox กดไม่ได้'));
          await snapEvidence(n, `ก่อนกด — Checkbox หัวตาราง${label}`);
          expect(enabled, `Checkbox หัวตาราง${label}ต้องกดได้`).toBe(true);
          await header.click({ force: true });
          const checked = rows.locator('td.ant-table-selection-column .ant-checkbox-input:checked');
          await expect(checked, `${label}ทุกรายการ (${total}) ต้องถูกติ๊ก`).toHaveCount(total, { timeout: 10_000 });
          const bar = bulkBar(n);
          await expect(bar.getByText(`เลือก ${total} รายการ`, { exact: true }), `แถบด้านบนต้องแสดง "เลือก ${total} รายการ"`).toBeVisible({ timeout: 10_000 });
          const otherChecked: string[] = [];
          for (const k of others(kind)) {
            const c = await rowsOf(n, k).locator('td.ant-table-selection-column .ant-checkbox-input:checked').count();
            if (c) otherChecked.push(`${KIND[k].label} ${c}`);
          }
          // ยา: ผู้ป่วยนี้ไม่มีคำสั่งยา — นับ checkbox ที่ติ๊กทั้งหน้า ต้องเท่ากับของประเภทนี้
          const allChecked = await mainOf(n).locator('tbody td.ant-table-selection-column .ant-checkbox-input:checked').count();
          note(`${TC(no)} ผล`, `ติ๊ก ${await checked.count()}/${total} · แถบ "เลือก ${total} รายการ" · ประเภทอื่นที่ติ๊ก: ${otherChecked.join(', ') || 'ไม่มี'} · ติ๊กทั้งหน้า ${allChecked}`);
          await bar.scrollIntoViewIfNeeded();
          await markEvidence(expected(bar.getByText(`เลือก ${total} รายการ`, { exact: true }), `เลือก ${total} รายการ`));
          await snapEvidence(n, `แถบ เลือก ${total} รายการ ${label}`);
          await showCard(n, kind);
          await markEvidence(expected(card(n, kind).locator('tbody'), `ติ๊กครบ ${total} แถว`));
          await holdForClip(n);
          expect(otherChecked, 'รายการของประเภทอื่นต้องไม่ถูกติ๊ก').toEqual([]);
          expect(allChecked, 'จำนวนที่ติ๊กทั้งหน้าต้องเท่ากับจำนวนของประเภทนี้').toBe(total);
        });
      }
      await clearSelection();

      // --- เลือกหลายรายการแล้วกด เสร็จสิ้น จากแถบ ---
      for (const [i, kind] of kinds.entries()) {
        const no = 21 + i;
        const label = KIND[kind].label;
        await startClip(n, `TC-${pad(no)}`);
        await run.soft(`${TC(no)} รับ Order ${label} 3 รายการ → ติ๊ก 2 รายการ → กด เสร็จสิ้น ในแถบ → 2 รายการเสร็จสิ้น · รายการที่ 3 ยังไม่เสร็จสิ้น`, async () => {
          await clearSelection();
          await showCard(n, kind);
          const rows = rowsOf(n, kind);
          await expect(rows, `ตาราง${label}ต้องมี 3 แถว`).toHaveCount(3, { timeout: 30_000 });
          for (let r = 0; r < 3; r++) {
            const accept = btn(rows.nth(r), 'รับ Order');
            await expectButton(n, kind, rows.nth(r), 'รับ Order', `แถว${label}ที่ ${r + 1} ต้องมีปุ่ม รับ Order`);
            if (r === 0) {
              await markEvidence(clicked(accept, 'รับ Order ทีละแถว'));
              await snapEvidence(n, `ก่อนกด — รับ Order ${label} 3 รายการ`);
            }
            await accept.click();
            await expect(toast(n, 'รับ Order แล้ว 1 รายการ')).toBeVisible({ timeout: 15_000 });
            await expect(accept).toBeHidden({ timeout: 20_000 });
          }
          await markEvidence(expected(card(n, kind).locator('tbody'), 'รับ Order ครบ 3 แถว'));
          await holdForClip(n);
          for (let r = 0; r < 2; r++) await rowCheckbox(rows.nth(r)).click({ force: true });
          const bar = bulkBar(n);
          const bulkDone = bar.getByRole('button', { name: /^เสร็จสิ้น \(\d+\)$/ });
          await expect(bar.getByText('เลือก 2 รายการ', { exact: true })).toBeVisible({ timeout: 10_000 });
          const bulkText = (await bulkDone.innerText()).trim();
          note(`${TC(no)} แถบ`, `${(await bar.innerText()).replace(/\s+/g, ' ')}`);
          await bar.scrollIntoViewIfNeeded();
          await markEvidence(expected(bar.getByText('เลือก 2 รายการ', { exact: true }), 'เลือก 2 รายการ'), clicked(bulkDone, bulkText));
          await snapEvidence(n, `ก่อนกด — ${bulkText} ในแถบ`);
          expect(bulkText, 'ปุ่มในแถบต้องเป็น เสร็จสิ้น (2)').toBe('เสร็จสิ้น (2)');
          await bulkDone.click();
          await confirmComplete(n, `บันทึกเสร็จสิ้น ${label} 2 รายการ`);
          await snapToast(n, 'บันทึกเสร็จสิ้นแล้ว 2 รายการ', `หลังกด — เสร็จสิ้น ${label} 2 รายการ`);
          for (let r = 0; r < 2; r++) await expect(btn(rows.nth(r), 'เสร็จสิ้น'), `${label}รายการที่ ${r + 1} ต้องเสร็จสิ้นแล้ว (ไม่มีปุ่ม เสร็จสิ้น)`).toBeHidden({ timeout: 20_000 });
          await expect(btn(rows.nth(2), 'เสร็จสิ้น'), `${label}รายการที่ 3 ที่ไม่ได้เลือกต้องยังไม่เสร็จสิ้น`).toBeVisible();
          await showCard(n, kind);
          await markEvidence(expected(rows.nth(0), 'เสร็จสิ้น'), expected(rows.nth(1), 'เสร็จสิ้น'), expected(btn(rows.nth(2), 'เสร็จสิ้น'), 'แถว 3 ยังไม่เสร็จสิ้น'));
          await holdForClip(n);
        });
      }

      const tasks = await fetchNurseTasks(page, authorization(), visit.en).catch(() => []);
      note('สถานะงานพยาบาลท้ายเทส (API)', tasks.map((t) => `${t.source} ${t.name} = ${t.status}`).join(' | '));
      await test.info().attach('งานพยาบาลท้ายเทส (API)', { body: JSON.stringify(tasks, null, 2), contentType: 'application/json' });
      run.finish();
      finish();
    },
  );

  // ================= ผู้ป่วย C: TC 025–032 (ตรงกับ ER Nurse Task List ทั้ง 2 ทาง) =================
  test(
    'ผู้ป่วย C: รับ Order จาก Order Summary ↔ ER Nurse Task List ตรงกันทั้ง 2 ทาง (TC 025–032)',
    { tag: ['@SBH-3158', '@SBH-3158-C', ...tags(25, 32)], annotation: notes(25, 32) },
    async ({ page, browser }) => {
      const { note, finish } = makeRunner(page);
      const authorization = trackAuthorization(page);
      const visit = await preparePatient(page, 'Os3158C', [ECG, ECG, 'SBHIMG1', 'SBHIMG21', 'SBHLAB2', 'SBHLAB5'], ['NUH-OS-MDS-104', 'NUH-OS-MDS-123'], note);
      nurse = await openNurseWindow(browser, visit);
      const n = nurse;
      const run = makeRunner(n);
      await openOrderSummary(n, visit, false);

      /** ชื่องานใน ER Nurse Task List: เวชภัณฑ์แสดงเป็นรหัส · ประเภทอื่นแสดงชื่อรายการ */
      const taskName = (kind: Kind, item: { code: string; name: string }) => (kind === 'supply' ? item.code : item.name);
      const plan: [Kind, number][] = [['activity', 25], ['imaging', 27], ['lab', 29], ['supply', 31]];
      for (const [kind, first] of plan) {
        const label = KIND[kind].label;
        const rows = rowsOf(n, kind);
        let item1 = { code: '', name: '', text: '' };
        let item2 = { code: '', name: '', text: '' };

        // --- Order Summary → Nurse Task List ---
        await startClip(n, `TC-${pad(first)}`);
        await run.soft(`${TC(first)} รับ Order ${label}รายการที่ 1 ใน Order Summary → ER Nurse Task List งานเดียวกันเป็น กำลังทำ (รับ Order แล้ว)`, async () => {
          await openOrderSummary(n, visit);
          await showCard(n, kind);
          await expect(rows.first()).toBeVisible({ timeout: 30_000 });
          item1 = await rowItem(rows.nth(0));
          item2 = await rowItem(rows.nth(1));
          const accept = btn(rows.nth(0), 'รับ Order');
          await expectButton(n, kind, rows.nth(0), 'รับ Order', `แถว${label}รายการที่ 1 ต้องมีปุ่ม รับ Order`);
          await markEvidence(clicked(accept));
          await snapEvidence(n, `ก่อนกด — รับ Order ${label} 1 (Order Summary)`);
          await accept.click();
          await snapToast(n, 'รับ Order แล้ว 1 รายการ', `หลังกด — รับ Order ${label} 1`);
          await expect(accept).toBeHidden({ timeout: 20_000 });
          await openTaskList(n, visit);
          const name = taskName(kind, item1);
          const tRows = taskRows(n, name);
          await expect(tRows.first(), `ER Nurse Task List ต้องมีงาน "${name}"`).toBeVisible({ timeout: 30_000 });
          // ECG ซ้ำ 2 งานชื่อเดียวกัน → ต้องมี "กำลังทำ" 1 งาน (ที่รับจาก Order Summary) อีกงานยัง "รอรับงาน"
          const running = tRows.filter({ has: n.getByText('กำลังทำ', { exact: true }) });
          await expect(running, `งาน "${name}" ต้องเป็นสถานะ กำลังทำ 1 งาน`).toHaveCount(1, { timeout: 30_000 });
          note(`${TC(first)} ER Nurse Task List`, (await tRows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').slice(0, 90)).join(' | '));
          await running.scrollIntoViewIfNeeded();
          await markEvidence(expected(taskStatus(running), 'กำลังทำ = รับ Order แล้ว'), expected(running.locator('[data-label="รายการ"]'), name));
          await holdForClip(n);
        });

        // --- Nurse Task List → Order Summary ---
        await startClip(n, `TC-${pad(first + 1)}`);
        await run.soft(`${TC(first + 1)} รับงาน ${label}รายการที่ 2 ใน ER Nurse Task List → Order Summary แถวเดียวกันไม่มีปุ่ม รับ Order`, async () => {
          if (!item2.text) {
            await openOrderSummary(n, visit);
            item2 = await rowItem(rows.nth(1));
          }
          await openTaskList(n, visit);
          const name = taskName(kind, item2);
          const pending = taskRows(n, name).filter({ has: n.getByText('รอรับงาน', { exact: true }) }).first();
          const has = await pending.isVisible({ timeout: 15_000 }).catch(() => false);
          note(`${TC(first + 1)} ER Nurse Task List`, has ? `งาน "${name}" รอรับงาน` : `ไม่พบงาน "${name}" ที่รอรับงาน`);
          const accept = pending.getByRole('button', { name: 'รับงาน', exact: true });
          // ไม่มีงาน → ตีกรอบบรรทัดสรุป "รายการงาน N active …" ของผู้ป่วย (ไม่มีกลุ่มของประเภทนี้ในตาราง)
          await markEvidence(has ? clicked(accept) : expected(mainOf(n).getByText(/^รายการงาน \d+ active/).first(), `ไม่มีงาน ${label} ในรายการ`));
          await snapEvidence(n, `ก่อนกด — รับงาน ${label} 2 (Task List)`);
          expect(has, `ER Nurse Task List ต้องมีงาน${label} "${name}" ที่รอรับงาน`).toBe(true);
          const acceptRes = n.waitForResponse((r) => /\/er\/nurse-tasks\/[^/]+\/accept/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
          acceptRes.catch(() => undefined);
          await accept.click();
          const res = await acceptRes;
          expect(res.status(), 'รับงาน API ต้องตอบ 200').toBe(200);
          const nowRunning = taskRows(n, name).filter({ has: n.getByText('กำลังทำ', { exact: true }) });
          await expect(nowRunning.last()).toBeVisible({ timeout: 20_000 });
          await markEvidence(expected(taskStatus(nowRunning.last()), 'กำลังทำ'));
          await snapEvidence(n, `หลังกด — รับงาน ${label} 2`);
          await openOrderSummary(n, visit);
          await showCard(n, kind);
          const row2 = rows.nth(1);
          await expect(row2).toBeVisible({ timeout: 30_000 });
          expect((await rowItem(row2)).code, 'แถวที่ 2 ต้องเป็นรายการเดียวกับงานที่รับ').toBe(item2.code);
          await expect(btn(row2, 'รับ Order'), `Order Summary แถว${label}รายการที่ 2 ต้องไม่มีปุ่ม รับ Order`).toBeHidden({ timeout: 20_000 });
          await expect(btn(row2, 'เสร็จสิ้น')).toBeVisible();
          await markEvidence(expected(btn(row2, 'เสร็จสิ้น').locator('xpath=ancestor::td[1]'), `แถว 2 [${item2.code}]: ไม่มี รับ Order แล้ว`));
          await holdForClip(n);
        });
      }

      const tasks = await fetchNurseTasks(page, authorization(), visit.en).catch(() => []);
      note('สถานะงานพยาบาลท้ายเทส (API)', tasks.map((t) => `${t.source} ${t.name} = ${t.status}`).join(' | '));
      await test.info().attach('งานพยาบาลท้ายเทส (API)', { body: JSON.stringify(tasks, null, 2), contentType: 'application/json' });
      run.finish();
      finish();
    },
  );
});
