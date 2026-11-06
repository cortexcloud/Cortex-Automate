import { type Browser, type Locator, type Page, type Request } from '@playwright/test';
import { dismissToast, gotoErDashboard, type ErVisit } from '../../../helpers/functions/er';
import { createAdmitRequest } from '../../../helpers/functions/er-admit';
import { fillNurseNote, saveNurseNote } from '../../../helpers/functions/er-nursing-records';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, confirmOrderAlert, fetchNurseTasks, openErVisitForHn, orderAlert, registerAndOpenErVisit, submitOrders } from '../../../mock-data/uat-er';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { VITALS_NORMAL, addMedicineToCart, careMenu, gotoVisit } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// SBH-2593 [ER][Order Summary] Improve order summary ER — Note แพทย์ / พยาบาลแบบพับได้ · Sign ทีละรายการ / หลายรายการ / Sign All ·
//   ปุ่มงานยาของพยาบาล (รับ Order / ให้ยาแล้ว / ยกเลิก Order) · ส่วน ORDER FOR ONE DAY (ก่อน admit) + แถบรับไว้รักษา · หอผู้ป่วย / OPD ไม่เปลี่ยน
// ชุด EXE SBH-3203 → HPY SBH-3204 (TC 001–025, 036–038) · UHP SBH-3205 (026–027) · EDG SBH-3206 (028–035) · 1 เทสต่อผู้ป่วย (R9) · คลิปแยกต่อ TC (R61)
// บัญชี: Super_User (user1 · "นาย ทดสอบ มานะ") = แพทย์ / เภสัช / การเงิน · Nurse (x-nurse) = พยาบาล ER / หอผู้ป่วย / OPD (หน้าต่างแยก)
// ข้อมูลบน dev-x (สำรวจ 31 ต.ค. 2026 · ไฟล์แอป index-CAlFiC-E.js → DJaj9lPY.js):
//   ยา: ใช้ได้ med0000006 / 007 / 008 (R25 · med0000005 เพิ่มลงตะกร้าไม่ผ่าน) → แบ่งผู้ป่วยตามจำนวนยาที่ TC ต้องใช้
//   ยาที่ยังไม่ส่งคำสั่ง (อยู่ในตะกร้า One Day Order) = ยังไม่ลงนาม → Order Summary มีปุ่ม Sign · ยา ER ที่ลงนามแล้วเข้าคิว "ห้องยา A" (ช่องบริการตัวแรก)
//   มุมมอง ER IPD ขึ้นเมื่อ Encounter ER มี `an` = AN ที่สร้างจาก Admit Request ที่ศูนย์จัดการเตียง + จองเตียง (ผู้ใช้อนุญาตให้เลือกเตียง — decisions R80)
//   ห้ามลงนาม Disposition ระหว่างเทส (ระบบลงนามยาที่ค้างให้ทั้งหมด)
// รัน (dev-x): npx playwright test --headed --grep @SBH-2593   ·  เฉพาะผู้ป่วย: --grep "@SBH-2593-A" / B / C / D / E / F
// รัน (SBH Prod · R124): npm run card:prod -- --headed --grep "@SBH-2593-A( |$)" (ทีละราย) · ทำต่อรายเดิม SBH2593_<A–E>_VISIT="HN,VN,EN" · ท้ายงาน --grep @SBH-2593-CLOSE + SBH2593_CLOSE

const ISSUE: Record<number, string> = {};
for (let n = 1; n <= 35; n++) ISSUE[n] = `SBH-${3206 + n}`;
Object.assign(ISSUE, { 36: 'SBH-3450', 37: 'SBH-3451', 38: 'SBH-3452' });
const pad = (n: number) => String(n).padStart(3, '0');
const TC = (n: number) => `TC-${pad(n)} (${ISSUE[n]})`;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const tagsOf = (list: number[]) => list.map((n) => `@${ISSUE[n]}`);
const notesOf = (list: number[]) => [linear('SBH-2593'), ...list.map((n) => linear(ISSUE[n]))];

// SBH Prod (5 พ.ย. 2026 · decisions R124): ยา MED0000260 / 318 / 756 (สั่งได้บน Prod — SBH-1016) · หัตถการ ACT0000062 แทน ECG (Prod ค้น 89.52 ไม่เจอ) ·
//   ยา ER ไปห้องยาชั้น 1 · ผู้ป่วย OPD อ่านอย่างเดียว = UAT BIZSIM-APM006-03 · ชื่อยาเต็ม (ใช้จับงานยาใน API) อ่านจากรอบเตรียมผู้ป่วย A
//   ชื่อยาของ Prod ตั้งทับได้ด้วย SBH2593_MED_NAMES="ชื่อ 260|ชื่อ 318|ชื่อ 756"
const PROD = SYSTEM !== 'dev-x';
type Med = { code: string; name: string };
const PROD_NAMES = (process.env.SBH2593_MED_NAMES ?? '').split('|');
const MED: Record<'m6' | 'm7' | 'm8', Med> = PROD
  ? {
      m6: { code: 'MED0000260', name: PROD_NAMES[0] || '' },
      m7: { code: 'MED0000318', name: PROD_NAMES[1] || '' },
      m8: { code: 'MED0000756', name: PROD_NAMES[2] || '' },
    }
  : {
      m6: { code: 'med0000006', name: 'UTO LINCOMYCIN (lincomycin 3 g/10 mL) solution for injection' },
      m7: { code: 'med0000007', name: 'GPO-L-ONE (deferiprone 500 mg) film-coated tablet' },
      m8: { code: 'med0000008', name: 'CLINDAVID-300 (clindamycin 300 mg) capsule, hard' },
    };
const ALL_MEDS = [MED.m6, MED.m7, MED.m8];
/** หัตถการที่ส่งคำสั่ง (ลงนามแล้ว) ให้ผู้ป่วย A */
const PROC = PROD ? { code: 'ACT0000062', label: 'หัตถการ ACT0000062' } : { code: '89.52', label: 'ECG 89.52' };
const ECG = PROC.code;
/** ห้องยาที่รับยา ER ที่ลงนามแล้ว */
const PHARMACY = PROD ? 'ห้องยาชั้น 1' : 'ห้องยา A';
const TASK_STATUS: Record<string, string> = { PENDING: 'รอรับ Order', RUNNING: 'กำลังให้ยา', DONE: 'ให้ยาแล้ว', CANCELLED: 'ยกเลิก' };
const OPD_PATIENT = PROD
  ? { hn: '6904479', vn: 'V6910223956', en: 'E6910224459', label: 'UAT BIZSIM-APM006-03 (BizSim 22 ต.ค.)' }
  : { hn: '6932050', vn: 'V69102227565', en: 'E69102232339', label: 'AUTO MockOrder1022140821 (UAT-OPD-orders 22 ต.ค.)' }; // อ่านอย่างเดียว
const MED_CODE = /\[med\d{7}\]/i;

// ---------- locator ของ Order Summary (ER) ----------

const mainOf = (p: Page) => p.getByRole('main');
const toast = (p: Page, text: string | RegExp) => p.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: text }).first();
const cardByTitle = (p: Page, title: RegExp) =>
  mainOf(p).locator('.ant-card-head-title').filter({ hasText: title }).first().locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " ant-card ")][1]');
const medCard = (p: Page) => cardByTitle(p, /^ยา$/);
const medRows = (p: Page) => medCard(p).locator('tbody tr.ant-table-row').filter({ hasText: /\[med\d+\]/i });
const rowOf = (p: Page, med: Med, nth = 0) => medRows(p).filter({ hasText: `[${med.code}]` }).nth(nth);
type RowButton = 'Sign' | 'รับ Order' | 'ให้ยาแล้ว' | 'ยกเลิก Order';
const btn = (row: Locator, name: RowButton) => row.getByRole('button', { name, exact: true });
const rowCheckbox = (row: Locator) => row.locator('td.ant-table-selection-column .ant-checkbox-input').first();
const bulkBar = (p: Page) => mainOf(p).locator('[class*="_bulk-bar_"]').first();
const bulkBtn = (p: Page, name: string) => bulkBar(p).getByRole('button', { name: new RegExp(`${name} \\(\\d+\\)`) }).first();
const signAllBtn = (p: Page) => mainOf(p).getByRole('button', { name: /Sign All/ }).first();
const acceptAllBtn = (p: Page) => mainOf(p).getByRole('button', { name: /รับ Order ทั้งหมด/ }).first();
const progressHeader = (p: Page) => mainOf(p).getByRole('button').filter({ hasText: 'Progress Note (แพทย์)' }).filter({ hasNotText: 'เพิ่ม' }).first();
const nurseHeader = (p: Page) => mainOf(p).getByRole('button').filter({ hasText: 'Nurse Focus Note (พยาบาล)' }).filter({ hasNotText: 'เพิ่ม' }).first();
const addProgressBtn = (p: Page) => mainOf(p).getByRole('button', { name: /เพิ่ม Progress/ }).first();
const addNurseBtn = (p: Page) => mainOf(p).getByRole('button', { name: /เพิ่ม Nurse Note/ }).first();
/** ส่วน Note แพทย์ / พยาบาล = <section> (หัว `_header_` + เนื้อหา `_body_`) · คอลัมน์ Note = div ที่ครอบทั้ง 2 section */
const progressSection = (p: Page) => progressHeader(p).locator('xpath=ancestor::section[1]');
const nurseSection = (p: Page) => nurseHeader(p).locator('xpath=ancestor::section[1]');
const notesColumn = (p: Page) => progressHeader(p).locator('xpath=ancestor::section[1]/..');
const preAdmitHeader = (p: Page) => mainOf(p).getByRole('button', { name: /ORDER FOR ONE DAY \(ก่อน admit\)/ }).first();
const preAdmitSection = (p: Page) => preAdmitHeader(p).locator('xpath=ancestor::section[1]');
/** แถบ "สั่งบน AN <AN> · รอเตียง" ของมุมมอง ER IPD ("สั่งบน AN" กับเลขอยู่คนละ element) */
const anBand = (p: Page) => mainOf(p).getByText(/^สั่งบน AN/).first().locator('xpath=..');

/** ช่องของแถวตามชื่อหัวคอลัมน์ (เช่น "ลงนาม" / "Action") */
async function cellOf(card: Locator, row: Locator, header: RegExp): Promise<Locator> {
  const index = await card.locator('thead th').filter({ hasText: header }).first().evaluate((th) => [...(th.parentElement?.children ?? [])].indexOf(th));
  return row.locator(':scope > td').nth(index);
}

/** เปิดเมนูขวา Order Summary (ไม่คลิกเนื้อหา — หัวส่วนก่อน admit / Note เป็นปุ่มพับ) */
async function openOrderSummary(p: Page, visit: ErVisit, reload = true) {
  if (reload) await gotoVisit(p, visit);
  const item = p.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: /Order Summary$/ }).first();
  // หน้าเพิ่งโหลดเปิดแผง Overview ตามหลังแล้วทับ Order Summary → ต้องเห็นแผงต่อเนื่อง 3 วินาที
  await expect(async () => {
    if (!(await progressHeader(p).isVisible())) await item.click({ force: true });
    await expect(progressHeader(p)).toBeVisible({ timeout: 10_000 });
    await p.waitForTimeout(3_000);
    await expect(progressHeader(p)).toBeVisible({ timeout: 1_000 });
  }, 'เปิด Order Summary').toPass({ timeout: 120_000 });
  // แถบเมนูขวากางค้างหลังกด → คลิกพื้นที่ว่างของแถบแท็บให้หุบ
  await p.mouse.click(1100, 166);
  await p.mouse.move(960, 1050);
  await p.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await p.waitForTimeout(1_500);
}

async function showMedCard(p: Page) {
  if (!(await medCard(p).count())) return;
  await medCard(p).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await p.mouse.move(960, 1050);
}

async function snapToast(p: Page, text: string | RegExp, name: string) {
  const t = toast(p, text);
  await expect(t, `ต้องมีแจ้งเตือน "${text}"`).toBeVisible({ timeout: 20_000 });
  await t.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
  await markEvidence(alerted(t));
  await snapEvidence(p, name);
}

/** สถานะลงนามของแถว: ช่อง "ลงนาม" มีไอคอน + ไม่มีปุ่ม Sign */
async function signedState(p: Page, row: Locator): Promise<'ลงนามแล้ว' | 'ค้างลงนาม'> {
  if (await btn(row, 'Sign').isVisible().catch(() => false)) return 'ค้างลงนาม';
  const cell = await cellOf(medCard(p), row, /^ลงนาม$/);
  return (await cell.locator('svg, [role=img]').count()) ? 'ลงนามแล้ว' : 'ค้างลงนาม';
}

/** ปุ่มงานพยาบาลที่แถวมี */
async function rowButtons(row: Locator): Promise<string> {
  const names: string[] = [];
  for (const name of ['Sign', 'รับ Order', 'ให้ยาแล้ว', 'ยกเลิก Order'] as const) if (await btn(row, name).isVisible().catch(() => false)) names.push(name);
  return names.join(' / ') || '(ไม่มีปุ่ม)';
}

// ---------- คำสั่ง (API) ----------

/** รอคำสั่ง SignOPDOrders → คืน requestIds ที่ส่ง ([] = ลงนามทั้ง EN) + accepted */
function waitSign(p: Page) {
  const req = p.waitForRequest((r) => /SignOPDOrders/.test(r.postData() ?? ''), { timeout: 60_000 });
  const res = p.waitForResponse((r) => /SignOPDOrders/.test(r.request().postData() ?? ''), { timeout: 90_000 });
  req.catch(() => undefined);
  res.catch(() => undefined);
  return async () => {
    const r: Request = await req;
    const body = JSON.parse(r.postData() ?? '{}') as { variables?: { input?: { requestIds?: string[] } } };
    const json = (await (await res).json()) as { data?: { signOPDOrders?: { accepted?: boolean } }; errors?: { message: string }[] };
    return { requestIds: body.variables?.input?.requestIds ?? [], accepted: !!json.data?.signOPDOrders?.accepted, errors: json.errors?.map((e) => e.message) ?? [] };
  };
}

const waitNurse = (p: Page, action: 'accept' | 'complete' | 'cancel') => {
  const res = p.waitForResponse((r) => new RegExp(`/er/nurse-tasks/[^/]+/${action}`).test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
  res.catch(() => undefined);
  return res;
};

/** สถานะงานยาของ Encounter จาก API (ชื่อยา → สถานะ) */
async function medTasks(page: Page, auth: () => string, en: string) {
  const tasks = (await fetchNurseTasks(page, auth(), en).catch(() => [])).filter((t) => t.source === 'MEDICATION');
  return tasks;
}
/**
 * ชื่อยาเต็ม (ชื่องานยาใน API) ของยาที่ยังไม่รู้ชื่อ — จับคู่ชื่องานยากับข้อความแถว `[รหัส]` ใน Order Summary ที่เปิดอยู่ (SBH Prod)
 * งานยาเกิดตั้งแต่เพิ่มลงตะกร้า (dev-x 31 ต.ค.) · ไม่เจอ = จดข้อความแถว + ชื่องานยาลง annotation ไว้ตั้ง SBH2593_MED_NAMES
 */
async function resolveMedNames(page: Page, auth: () => string, en: string, note: (t: string, d: string) => void) {
  if (ALL_MEDS.every((m) => m.name)) return;
  const names = [...new Set((await medTasks(page, auth, en)).map((t) => t.name))];
  for (const med of ALL_MEDS) {
    const row = rowOf(page, med);
    const text = (await row.innerText({ timeout: 10_000 }).catch(() => '')).replace(/\s+/g, ' ');
    const hit = names.filter((n) => text.includes(n)).sort((a, b) => b.length - a.length)[0];
    if (hit && !med.name) med.name = hit;
    if (!hit) note(`ชื่อยา ${med.code} (หาไม่เจอ)`, `แถว: ${text.slice(0, 160)} · งานยา: ${names.join(' | ')}`);
  }
  note('ชื่อยา (งานยาใน API)', ALL_MEDS.map((m) => `${m.code} = ${m.name || '?'}`).join(' · '));
}

async function taskStatusOf(page: Page, auth: () => string, en: string, med: Med): Promise<string[]> {
  return (await medTasks(page, auth, en)).filter((t) => t.name === med.name).map((t) => TASK_STATUS[t.status] ?? t.status);
}

// ---------- หน้าต่างการกระทำของพยาบาล ----------

/** หน้าต่าง "บันทึกให้ยาแล้ว": เลือก ผู้ให้ยา คนแรก (เวลาเติมให้) → บันทึก */
async function confirmGiven(p: Page, shot: string) {
  const dialog = p.getByRole('dialog', { name: 'บันทึกให้ยาแล้ว' });
  await expect(dialog, 'กด ให้ยาแล้ว ต้องมีหน้าต่าง บันทึกให้ยาแล้ว (ถามผู้ให้ยาและเวลา)').toBeVisible({ timeout: 15_000 });
  const performer = dialog.locator('.ant-select').first();
  await performer.click();
  const option = p.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  const timeField = dialog.locator('.ant-picker, input[id*="performedAt"], input[placeholder*="เวลา"]').first();
  const save = dialog.getByRole('button', { name: 'บันทึก', exact: true });
  await markEvidence(filled(performer, 'ผู้ให้ยา'), expected(timeField, 'เวลาให้ยา'), clicked(save));
  await snapEvidence(p, `ก่อนกด — ${shot}`);
  const done = waitNurse(p, 'complete');
  await save.click();
  expect((await done).status(), 'บันทึกให้ยาแล้ว API ต้องตอบ 200').toBe(200);
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

/** หน้าต่าง "ยกเลิก Order": reason = ตัวเลือกเหตุผล (ไม่ใส่ = เว้นว่าง) → ยืนยันยกเลิก · คืน body ที่ส่ง */
async function confirmCancel(p: Page, shot: string, reason?: { label: string; note: string }) {
  const dialog = p.getByRole('dialog', { name: 'ยกเลิก Order' });
  await expect(dialog, 'กด ยกเลิก Order แล้วต้องมีหน้าต่างยืนยัน').toBeVisible({ timeout: 15_000 });
  const marks = [];
  if (reason) {
    const select = dialog.locator('.ant-select').first();
    await select.click();
    await p.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: reason.label }).first().click();
    const note = dialog.getByRole('textbox').last();
    await note.fill(reason.note);
    marks.push(filled(select, 'เหตุผล'), filled(note, 'หมายเหตุ'));
  }
  const confirm = dialog.getByRole('button', { name: 'ยืนยันยกเลิก' });
  marks.push(clicked(confirm));
  await markEvidence(...marks);
  await snapEvidence(p, `ก่อนกด — ${shot}`);
  const req = p.waitForRequest((r) => /\/er\/nurse-tasks\/[^/]+\/cancel/.test(r.url()) && r.method() === 'POST', { timeout: 30_000 });
  req.catch(() => undefined);
  const res = waitNurse(p, 'cancel');
  await confirm.click();
  const sent = (await req).postData() ?? '';
  const r = await res;
  expect(r.status(), 'ยกเลิก Order API ต้องตอบ 200').toBe(200);
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  return { sent, response: (await r.text().catch(() => '')).slice(0, 400) };
}

// ---------- ER Nurse Task List ----------

const taskRows = (p: Page, name: string) => mainOf(p).locator('[class*="_data-row_"]').filter({ hasText: name });
const taskStatusCell = (row: Locator) => row.locator('[data-label="สถานะ"]');
async function openTaskList(p: Page, visit: ErVisit) {
  await p.goto('/cortex/er/nurse-task-list');
  await mainOf(p).getByRole('button', { name: new RegExp(`HN ${visit.hn} `) }).first().click({ timeout: 90_000 });
  await expect(mainOf(p).getByText(`HN ${visit.hn}`, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(mainOf(p).locator('[class*="_data-row_"]').first()).toBeVisible({ timeout: 60_000 });
  await p.mouse.move(960, 1050);
}

// ---------- เตรียมผู้ป่วย (Super_User) ----------

async function openOneDayOrder(page: Page) {
  const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  await expect(async () => {
    if (!(await search.isVisible())) await careMenu(page, 'One Day Order', mainOf(page).getByRole('heading', { name: 'Order', exact: true }));
    await expect(search).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3_000);
    await expect(search).toBeVisible({ timeout: 1_000 });
  }, 'เปิด One Day Order').toPass({ timeout: 120_000 });
}

/** Route ต้องเป็น OralRoute — addMedicineToCart บางรอบเลือก OticRoute แล้ว "เกิดข้อผิดพลาดในระบบ" (dev-x 31 ต.ค.) */
async function forceOralRoute(page: Page) {
  if (PROD) return; // SBH Prod: ยากำหนด Route มาเอง (MED0000260 มีแค่ IntravenousRoute — 5 พ.ย. 2026)
  const route = mainOf(page).getByText('Route / Mode', { exact: true }).locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
  if (/OralRoute/.test(await route.innerText())) return;
  await route.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^OralRoute$/ }).first().click();
  await page.waitForTimeout(1_000);
}

/** ผู้ป่วย AUTO ใหม่ → Visit ER → คัดกรอง ESI 3 → One Day Order: (ECG ส่งคำสั่ง) + ยาในตะกร้า (ยังไม่ลงนาม) · signAll = กดส่งคำสั่ง (แพทย์ลงนามทั้ง EN) */
async function preparePatient(page: Page, label: string, opts: { ecg?: boolean; meds: Med[]; signAll?: boolean }, note: (t: string, d: string) => void): Promise<ErVisit> {
  const reuse = (process.env[`SBH2593_${label.slice(-1)}_VISIT`] ?? '').split(',').filter(Boolean);
  if (reuse.length === 3) {
    const visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
    note('ผู้ป่วย (ทำต่อกับรายเดิม)', `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
    // SBH2593_PREP=meds: เตรียมค้างที่ขั้นสั่งยา (คัดกรอง + หัตถการเสร็จแล้ว) → เพิ่มยาที่ยังไม่อยู่ในตะกร้าต่อ
    await gotoVisit(page, visit); // ให้ trackAuthorization เห็น token ก่อนอ่าน API (ทำต่อจากขั้นออกใบยา — 5 พ.ย.)
    if (process.env.SBH2593_PREP === 'meds' && opts.meds.length) {
      for (const med of opts.meds) {
        await openOneDayOrder(page);
        await addMedicineToCart(page, med.code, () => forceOralRoute(page));
      }
      if (opts.signAll) await submitOrders(page, []);
      note('One Day Order (ทำต่อ)', `ยา ${opts.meds.map((m) => m.code).join(' / ')} ${opts.signAll ? '(ส่งคำสั่ง = ลงนามแล้ว)' : '(อยู่ในตะกร้า = ยังไม่ลงนาม)'}`);
    }
    if (process.env.SBH2593_PREP !== 'triage') return visit;
  }
  // SBH2593_PREP=triage: Visit เปิดแล้วแต่คัดกรองไม่สำเร็จ (Prod "เก็บร่างไม่สำเร็จ" 5 พ.ย. 17:05) → คัดกรอง + สั่ง Order ต่อกับรายเดิม
  const resumeTriage = reuse.length === 3 && process.env.SBH2593_PREP === 'triage';
  // SBH Prod หลัง deploy 16:00 (5 พ.ย.): ER Dashboard ขึ้นช้ากว่า 20 วิ → ลองใหม่ได้ 3 ครั้ง (ยังไม่สร้างข้อมูล)
  let visit: ErVisit;
  if (resumeTriage) {
    visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
    const heading = mainOf(page).getByRole('heading', { name: 'คัดกรอง ER', exact: true });
    if (!(await heading.waitFor({ timeout: 30_000 }).then(() => true, () => false))) await careMenu(page, 'คัดกรอง ER', heading);
  } else {
    for (let i = 1; ; i++) {
      const ok = await gotoErDashboard(page).then(() => true, (e: Error) => (i >= 3 ? Promise.reject(e) : false));
      if (ok) break;
    }
    // SBH2593_<X>_HN: ลงทะเบียนแล้วแต่เปิด Visit ไม่สำเร็จ (Prod 500 "Failed to open ER visit" 5 พ.ย. 17:16) → เปิด Visit ให้ HN เดิม
    const hnOnly = process.env[`SBH2593_${label.slice(-1)}_HN`];
    if (hnOnly) {
      visit = await openErVisitForHn(page, hnOnly);
      note('ผู้ป่วย (HN เดิม · เปิด Visit ใหม่)', `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
    } else {
      const patient = newTestPatient(label);
      visit = await registerAndOpenErVisit(page, patient);
      note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
    }
  }
  await expect(mainOf(page).getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first()).toBeVisible({ timeout: 90_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
  if (!opts.meds.length && !opts.ecg) return visit;
  await openOneDayOrder(page);
  if (opts.ecg) await submitOrders(page, [ECG]);
  for (const med of opts.meds) {
    await openOneDayOrder(page); // แผง Overview โหลดตามหลังแล้วทับ One Day Order ได้ (ช่องค้นหายาหาย — dev-x 31 ต.ค.)
    await addMedicineToCart(page, med.code, () => forceOralRoute(page));
  }
  if (opts.signAll) await submitOrders(page, []);
  note('One Day Order', `${opts.ecg ? `${PROC.label} (ส่งคำสั่งแล้ว) · ` : ''}ยา ${opts.meds.map((m) => m.code).join(' / ')} ${opts.signAll ? '(ส่งคำสั่ง = ลงนามแล้ว)' : '(อยู่ในตะกร้า = ยังไม่ลงนาม)'}`);
  return visit;
}

/** Admit Request → ศูนย์จัดการเตียง "สร้าง AN" (เลือกเตียงตัวแรก — ผู้ใช้อนุญาต R80) → คืน AN ที่ผูกกับ Encounter ER */
async function admitWithBed(page: Page, visit: ErVisit, auth: () => string, note: (t: string, d: string) => void): Promise<string> {
  const main = mainOf(page);
  const req = await createAdmitRequest(page, 'ทดสอบ SBH-2593');
  await page.goto('/cortex/admission-center/admission-management?tab=admit-request-list');
  const row = main.getByRole('row').filter({ hasText: visit.hn }).first();
  await row.waitFor({ timeout: 90_000 });
  await row.getByRole('button', { name: 'สร้าง AN' }).click();
  await page.waitForURL(/admitRequestId=/, { timeout: 60_000 });
  await main.getByText('รายละเอียด Admit').first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(3_000);
  const sticker = main.getByRole('checkbox', { name: 'พิมพ์สติ๊กเกอร์ AN เมื่อบันทึก' });
  if (await sticker.isChecked().catch(() => false)) await sticker.uncheck();
  const picked: string[] = [];
  for (const label of [/^เลขเตียง :/, /^ประเภทการรับ Admit :/, /^รับ Admit จาก :/]) {
    const sel = main.getByText(label).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
    const current = (await sel.innerText()).trim();
    if (current && current !== 'เลือก') { picked.push(current); continue; }
    await sel.click();
    const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
    await page.waitForTimeout(800);
    picked.push((await sel.innerText()).trim());
  }
  const submit = main.getByRole('button', { name: 'check ส่งข้อมูล' });
  await expect(submit, 'เลือกเตียง / ประเภทการรับ / รับ Admit จาก แล้วปุ่ม ส่งข้อมูล ต้องกดได้').toBeEnabled();
  await submit.click();
  const dialog = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
  if (await dialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false)) await dialog.getByRole('button', { name: /ยืนยัน/ }).first().click();
  const saved = toast(page, /AN \d{5,}/);
  await expect(saved, 'สร้าง AN แล้วต้องมีแจ้งเตือนเลข AN').toBeVisible({ timeout: 30_000 });
  const an = (await saved.innerText()).match(/AN (\d{5,})/)![1];
  const res = await page.request.get(`/cortex-api/er/encounters/${visit.en}`, { headers: { authorization: auth() } });
  expect(((await res.json()) as { an: string | null }).an, 'Encounter ER ต้องผูกกับ AN ที่สร้าง').toBe(an);
  note('Admit', `Admit Request (${req.ward}) → ศูนย์จัดการเตียง สร้าง AN ${an} · เตียง ${picked[0]} · ${picked.slice(1).join(' / ')}`);
  return an;
}

/** หน้าต่าง Nurse (x-nurse) ที่ Visit นี้ — คลิปเริ่มหลังหน้าโหลดเสร็จ */
async function openNurseWindow(browser: Browser, url: string, hn: string): Promise<Page> {
  const context = await browser.newContext({
    storageState: authFile('Nurse'),
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1920, height: 1080 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  });
  await cacheAppAssets(context);
  const nurse = await context.newPage();
  await expect(async () => {
    await nurse.goto(url);
    await expect(mainOf(nurse).getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  }).toPass({ timeout: 150_000 });
  await trackVideo(nurse, 'Nurse');
  return nurse;
}
const visitUrl = (v: ErVisit) => `/cortex/next/patients/${v.hn}?en=${v.en}&vn=${v.vn}&fromApp=er`;

// ---------- ห้องยา / การเงิน (Super_User) ----------

async function openPharmacyA(page: Page) {
  const main = mainOf(page);
  const opt = () => page.locator('.ant-select-dropdown:visible .ant-select-item-option');
  // SBH Prod 5 พ.ย. 16:20: แอปค้างที่วงโหลดเต็มจอเกิน 60 วิเป็นพักๆ → โหลดหน้าใหม่ได้ 3 ครั้ง (ยังไม่เขียนข้อมูล)
  await expect(async () => {
    await page.goto('/cortex/pharmacy/select-location');
    await main.getByRole('combobox').first().click({ timeout: 60_000 });
  }, 'เปิดหน้าเลือกห้องยา').toPass({ timeout: 240_000 });
  await opt().filter({ hasText: new RegExp(`^${PHARMACY}$`) }).first().click();
  await page.waitForTimeout(800);
  await main.getByRole('combobox').nth(1).click();
  await page.waitForTimeout(800);
  await opt().first().click({ force: true });
  await page.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
}

/** ห้องยา A → แถวผู้ป่วยในแท็บ Order รอยืนยัน → หน้ารับออเดอร์ (ปุ่ม สร้างใบยา) */
async function openPharmacyOrder(page: Page, hn: string): Promise<Locator> {
  await openPharmacyA(page);
  const row = mainOf(page).getByRole('row').filter({ hasText: `HN ${hn}` }).first();
  await expect(row, `ผู้ป่วย HN ${hn} ต้องอยู่แท็บ Order รอยืนยัน ของ${PHARMACY}`).toBeVisible({ timeout: 60_000 });
  await row.locator('td').nth(4).click();
  const create = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
  await expect(create).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2_000);
  return create;
}

async function createPrescriptionA(page: Page, hn: string): Promise<string> {
  const create = await openPharmacyOrder(page, hn);
  if (PROD) {
    // SBH Prod 5 พ.ย.: ยาที่ "ไม่พบข้อมูลคลัง" (MED0000756 ในคลังยา A) ทำให้สร้างใบยาได้ 400 "คำขอไม่ถูกต้อง" → เอาติ๊กออก ออกใบยาเฉพาะยาที่มีในคลัง
    const noStock = mainOf(page).getByRole('row').filter({ hasText: 'ไม่พบข้อมูลคลัง' });
    for (const row of await noStock.all()) {
      const box = row.locator('.ant-checkbox-input').first();
      if (await box.isChecked().catch(() => false)) await box.uncheck();
      test.info().annotations.push({ type: 'ออกใบยา', description: `ไม่รวม (ไม่พบข้อมูลคลัง): ${(await row.innerText()).replace(/\s+/g, ' ').slice(0, 80)}` });
    }
    await page.waitForTimeout(1_000);
    await markEvidence(clicked(create, 'สร้างใบยา (ยาที่มีในคลัง)'));
    await snapEvidence(page, 'ก่อนกด — สร้างใบยา');
  }
  const created = page.waitForResponse((r) => r.url().includes('/cortex-api/opd/prescriptions') && r.request().method() === 'POST', { timeout: 60_000 });
  await create.click();
  const body = (await (await created).json()) as { prescriptionId?: string };
  expect(body.prescriptionId, 'สร้างใบยาต้องได้เลขใบยา').toBeTruthy();
  return body.prescriptionId!;
}

/** หน้าบัญชีการเงินของ Visit: แถวสถานะ Order / ใบยา + แถวรายการค่าใช้จ่ายของยา */
async function cashierSnapshot(page: Page, visit: ErVisit) {
  const main = mainOf(page);
  await page.goto(`/cortex/cashier/patients/${visit.hn}/accounts/${visit.vn}/charge-items`);
  await expect(main.getByText(visit.vn, { exact: true }).first()).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  const statusRow = main.getByRole('row').filter({ hasText: visit.en }).filter({ hasText: /order|ใบยา|\d{6}-\d{5}/i }).first();
  await expect(statusRow).toBeVisible({ timeout: 30_000 });
  const items = main.getByRole('row').filter({ hasText: /med\d{7} - /i });
  await expect(items.first()).toBeVisible({ timeout: 30_000 });
  const clean = (t: string) => t.replace(/\s+/g, ' ').trim();
  // SBH Prod 5 พ.ย. (TC-030): อ่านขณะช่องในแถวยังโหลดไม่ครบ → ค่าก่อน / หลังไม่ตรงทั้งที่หน้าจอเหมือนกัน → อ่านซ้ำจนนิ่ง 2 วิ
  let last = '';
  await expect(async () => {
    const now = JSON.stringify([await statusRow.innerText(), ...(await items.allInnerTexts())].map(clean));
    const same = now === last;
    last = now;
    expect(same, 'ข้อความหน้าการเงินยังไม่นิ่ง').toBe(true);
  }).toPass({ timeout: 30_000, intervals: [2_000] });
  return {
    statusRow,
    items,
    status: clean(await statusRow.innerText()),
    itemTexts: (await items.allInnerTexts()).map(clean).sort(),
  };
}

async function prescriptionState(page: Page, auth: () => string, id: string) {
  const res = await page.request.get(`/cortex-api/prescriptions/${id}`, { headers: { authorization: auth() } });
  const json = (await res.json()) as { medications?: { medicationItemId: string; currentState: string; careflowStep: string }[] };
  return (json.medications ?? []).map((m) => `${m.medicationItemId}: ${m.careflowStep} (${m.currentState})`).sort().join(' · ');
}

/** TC-027: สั่ง med0000006 ซ้ำ (ยังไม่ลงนาม) แล้วกด Sign ในแถวจาก Order Summary — ใช้ทั้งในเทสผู้ป่วย B และตรวจซ้ำกับรายเดิม */
async function runTc027(page: Page, visit: ErVisit, note: (t: string, d: string) => void) {
    // สั่ง med0000006 ซ้ำ (ยังไม่ลงนาม) — ตอนเพิ่มลงตะกร้ามี Drug Alert "Drug Duplication" ให้ใส่เหตุผล
    // Expected แก้ 31 ต.ค. 2026 (R80): การยืนยันยาซ้ำอยู่ตอนเพิ่มลงตะกร้า · Sign จาก Order Summary ลงนามได้เหมือน OPD Order Form
    const alertAtAdd = await addDuplicateMed6(page, visit, note);
    // Order Summary → Sign แถวยาซ้ำ (แถว med0000006 ตัวสุดท้าย = ตัวที่เพิ่งเพิ่ม)
    await openOrderSummary(page, visit);
    await showMedCard(page);
    const idx = (await medRows(page).filter({ hasText: `[${MED.m6.code}]` }).count()) - 1;
    const dup = rowOf(page, MED.m6, idx);
    await expect(btn(dup, 'Sign'), 'แถว med0000006 ที่เพิ่งเพิ่มต้องยังไม่ลงนาม (มีปุ่ม Sign)').toBeVisible({ timeout: 20_000 });
    const sign = btn(dup, 'Sign');
    await markEvidence(clicked(sign, 'Sign ยาซ้ำ'));
    await snapEvidence(page, 'ก่อนกด — Sign ยาซ้ำ');
    const signed = page.waitForResponse((r) => /SignOPDOrders/.test(r.request().postData() ?? ''), { timeout: 15_000 }).then(() => 'signed', () => 'none');
    await sign.click();
    const dialog = page.getByRole('dialog').filter({ visible: true }).last();
    const outcome = await Promise.race([dialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'dialog', () => 'none'), signed]);
    note(`${TC(27)} หลังกด Sign`, outcome === 'dialog' ? `หน้าต่าง: ${(await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 250)}` : outcome === 'signed' ? 'ลงนามทันที ไม่มีหน้าต่างยืนยันยาซ้ำ' : 'ไม่มีอะไรเกิดขึ้น');
    if (outcome === 'dialog') {
      // ต่างจาก dev-x (ลงนามทันที) — เก็บภาพหน้าต่างไว้ แล้วปิดโดยไม่ลงนาม
      await markEvidence(alerted(dialog, 'หน้าต่างตอน Sign ยาซ้ำ'));
      await snapEvidence(page, 'หน้าต่างตอน Sign ยาซ้ำ');
      await dialog.getByRole('button', { name: /ยกเลิก|ปิด|กลับไปแก้ไข|Cancel/ }).first().click().catch(() => undefined);
    }
    expect(outcome, 'Sign ยาซ้ำจาก Order Summary ต้องลงนามได้เหมือน OPD Order Form (ยืนยันยาซ้ำแล้วตอนเพิ่มลงตะกร้า)').toBe('signed');
    await toast(page, 'ส่งคำสั่งสำเร็จ').waitFor({ timeout: 15_000 }).catch(() => undefined);
    await showMedCard(page);
    await markEvidence(alerted(toast(page, 'ส่งคำสั่งสำเร็จ')), expected(await cellOf(medCard(page), rowOf(page, MED.m6, idx), /^ลงนาม$/), 'ลงนามแล้ว (ยืนยันยาซ้ำตอนเพิ่มลงตะกร้า)'));
    await snapEvidence(page, 'หลังกด — ลงนามแล้ว');
    // เทียบปุ่ม Sign ของ OPD Order Form (= ส่งคำสั่ง ใน One Day Order) กับยาซ้ำแบบเดียวกัน
    const form = await orderFormSendCheck(page, visit, note);
    note(`${TC(27)} เทียบ ส่งคำสั่ง (Order Form)`, form);
    expect(alertAtAdd, 'ตอนเพิ่มยาซ้ำลงตะกร้าต้องมี Drug Alert ยืนยันยาซ้ำ').not.toBe('');
    expect(form, 'ส่งคำสั่ง (OPD Order Form) ยาซ้ำต้องลงนามแบบเดียวกับ Sign ใน Order Summary').toMatch(/ลงนามทันที/);
}

/** One Day Order: เพิ่ม med0000006 ซ้ำลงตะกร้า (Drug Alert ตอนเพิ่ม → ยืนยัน) · คืนข้อความ Drug Alert ที่เห็น ('' = ไม่มี) */
async function addDuplicateMed6(page: Page, visit: ErVisit, note: (t: string, d: string) => void): Promise<string> {
    let alertText = '';
    await gotoVisit(page, visit);
    await openOneDayOrder(page);
    const main = mainOf(page);
    // SBH Prod 5 พ.ย.: เมนูตัวเลือกบางรอบไม่ขึ้น / ขึ้นแล้วหาย → พิมพ์ใหม่ทีละตัวแล้วรอตัวเลือกวนซ้ำ
    const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
    const option = page.locator('.ant-select-item-option').filter({ hasText: MED.m6.code }).first();
    await expect(async () => {
      await search.fill('');
      await search.pressSequentially(MED.m6.code, { delay: 60 });
      await expect(option).toBeVisible({ timeout: 10_000 });
      await option.click({ timeout: 5_000 });
    }, `ค้นหา ${MED.m6.code} แล้วเลือกจากรายการ`).toPass({ timeout: 90_000 });
    await page.waitForTimeout(2_000);
    await forceOralRoute(page);
    if (!(await main.getByRole('textbox', { name: /^\* วิธีใช้/ }).inputValue())) await main.getByRole('spinbutton', { name: 'ขนาดยา' }).fill('1');
    const freq = main.getByText('ความถี่', { exact: true }).locator('xpath=following::input[@role="spinbutton"][1]');
    if ((await freq.isEnabled()) && !(await freq.inputValue())) await freq.fill('1');
    const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
    if (!(await qty.inputValue())) await qty.fill('1');
    // กดเพิ่มทันทีหลังกรอก ฟอร์มยังสร้างวิธีใช้ไม่เสร็จแล้วเงียบ (31 ต.ค.) → กดซ้ำจนแถวที่ 2 ขึ้น
    const rows6 = main.getByRole('row').filter({ hasText: `[${MED.m6.code}]` });
    const target = (await rows6.count()) + 1;
    await expect(async () => {
      if (await orderAlert(page).isVisible()) await confirmOrderAlert(page);
      if ((await rows6.count()) >= target) return;
      await page.getByRole('button', { name: 'plus เพิ่มลงตะกร้า' }).click();
      if (await orderAlert(page).waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false)) {
        alertText = (await orderAlert(page).innerText()).replace(/\s+/g, ' ').slice(0, 200);
        note(`${TC(27)} ตอนเพิ่มลงตะกร้า`, alertText);
        await markEvidence(alerted(orderAlert(page), 'Drug Alert ยาซ้ำ (ตอนเพิ่มลงตะกร้า)'));
        await snapEvidence(page, 'Drug Alert ตอนเพิ่มยาซ้ำ');
        await confirmOrderAlert(page);
      }
      await expect(rows6).toHaveCount(target, { timeout: 10_000 });
    }, `เพิ่ม ${MED.m6.code} ซ้ำลงตะกร้า`).toPass({ timeout: 120_000 });
    return alertText;
}

/** เทียบ: ปุ่ม Sign ของ OPD Order Form (= ส่งคำสั่ง ใน One Day Order) กับยาซ้ำ — มีหน้าต่างยืนยันตอนส่งไหม · ส่งจริงให้จบ (ยืนยัน) */
async function orderFormSendCheck(page: Page, visit: ErVisit, note: (t: string, d: string) => void): Promise<string> {
  await addDuplicateMed6(page, visit, note);
  const main = mainOf(page);
  const submit = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
  const remaining = page.getByRole('dialog', { name: 'พบยาที่ผู้ป่วยยังใช้ไม่หมด' });
  await markEvidence(clicked(submit, 'ส่งคำสั่ง (Order Form) ยาซ้ำ'));
  await snapEvidence(page, 'เทียบ Order Form — ก่อนส่งคำสั่ง');
  // SBH Prod 5 พ.ย.: SignOPDOrders ตอบก่อนหน้าต่าง Drug Alert ขึ้น (accepted=false รอยืนยัน) → นับว่าลงนามเฉพาะ accepted=true
  const signedOk = async (r: { json(): Promise<unknown> }) => !!((await r.json().catch(() => ({}))) as { data?: { signOPDOrders?: { accepted?: boolean } } }).data?.signOPDOrders?.accepted;
  const signed = page.waitForResponse((r) => /SignOPDOrders/.test(r.request().postData() ?? ''), { timeout: 30_000 }).then(async (r) => ((await signedOk(r)) ? 'signed' : new Promise<string>(() => undefined)), () => 'none');
  await submit.click();
  const shown = (d: Locator, name: string) => d.waitFor({ state: 'visible', timeout: 20_000 }).then(() => name, () => 'none');
  const outcome = await Promise.race([shown(orderAlert(page), 'alert'), shown(remaining, 'remaining'), signed]);
  let result = '';
  if (outcome === 'alert' || outcome === 'remaining') {
    const d = outcome === 'alert' ? orderAlert(page) : remaining;
    result = `ส่งคำสั่งแล้วมีหน้าต่างยืนยันก่อนลงนาม: ${(await d.innerText()).replace(/\s+/g, ' ').slice(0, 160)}`;
    await markEvidence(alerted(d, 'Order Form: ยืนยันก่อนลงนาม'));
    await snapEvidence(page, 'เทียบ Order Form — หน้าต่างยืนยัน');
    if (outcome === 'alert') await confirmOrderAlert(page);
    else await remaining.getByRole('button', { name: 'ยืนยันสั่งต่อ' }).click();
    await signed.catch(() => undefined);
  } else {
    result = outcome === 'signed' ? 'ส่งคำสั่งแล้วลงนามทันที ไม่มีหน้าต่างยืนยันยาซ้ำ (ยืนยันแค่ตอนเพิ่มลงตะกร้า)' : 'กดส่งคำสั่งแล้วไม่มีอะไรเกิดขึ้น';
    await toast(page, /ส่งคำสั่ง|สำเร็จ/).waitFor({ timeout: 10_000 }).catch(() => undefined);
    await snapEvidence(page, 'เทียบ Order Form — หลังส่งคำสั่ง');
  }
  return result;
}

/**
 * TC-024 บน SBH Prod: หัตถการ ACT0000062 ลงรหัส ICD9-CM 06.13 ให้เอง (dev-x ECG ไม่ลง) → ผู้ป่วย A มีรายการ ICD9-CM จริง
 * ตรวจตาม AC "ซ่อนหมวดที่ไม่มีคำสั่ง": ทุกการ์ดที่แสดงในส่วนก่อน admit ต้องมีรายการ · Instrument (ไม่มีคำสั่ง) ต้องไม่แสดง · ICD9-CM แสดงเพราะมีรายการ
 */
async function checkTc024Prod(page: Page, note: (t: string, d: string) => void) {
  const header = preAdmitHeader(page);
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'true');
  await page.waitForTimeout(1_500);
  const section = preAdmitSection(page);
  const heads = section.locator('.ant-card-head-title');
  const titles = (await heads.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  const rows: CompareRow[] = [];
  const empty: string[] = [];
  for (const title of titles) {
    if (/รวมค่าใช้จ่าย/.test(title)) continue;
    const card = heads.filter({ hasText: title }).first().locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " ant-card ")][1]');
    const items = (await card.locator('tbody tr.ant-table-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!items.length) empty.push(title);
    rows.push({ label: title.replace(/ - .*/, ''), values: [`${items.length} รายการ${items.length ? `: ${items.map((t) => t.slice(0, 40)).join(' / ')}` : ''}`, 'มีรายการ'], same: items.length > 0 });
  }
  const hasInstrument = titles.some((t) => /Instrument/i.test(t));
  rows.push({ label: 'Instrument (ไม่มีคำสั่ง)', values: [hasInstrument ? 'แสดง' : 'ไม่แสดง', 'ไม่แสดง'], same: !hasInstrument });
  note(`${TC(24)} หมวดที่แสดง`, titles.join(' | '));
  const icdHead = heads.filter({ hasText: /^ICD9-CM$/ }).first();
  if (await icdHead.count()) {
    const icdCard = icdHead.locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " ant-card ")][1]');
    note(`${TC(24)} การ์ด ICD9-CM`, `${(await icdCard.locator('tbody tr.ant-table-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' / ')} — รหัสที่ระบบลงให้จากหัตถการ ${PROC.code}`);
    // เลื่อนในกล่องของส่วนก่อน admit ให้หัวหัตถการ + การ์ด ICD9-CM อยู่ในจอพร้อมกัน
    await icdCard.evaluate((el) => el.scrollIntoView({ block: 'end' }));
    await page.mouse.move(960, 1050);
    await page.waitForTimeout(800);
    await markEvidence(
      expected(heads.filter({ hasText: /^หัตถการ/ }).first(), 'หมวดหัตถการ (มีคำสั่ง)'),
      expected(icdCard.locator('tbody tr.ant-table-row').first(), 'ICD9-CM มีรายการ (ลงจากหัตถการ)'),
    );
    await snapEvidence(page, 'ICD9-CM มีรายการจากหัตถการ');
  }
  const medHead = heads.filter({ hasText: /^ยา$/ }).first();
  await clearEvidenceMarks(page);
  await medHead.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.mouse.move(960, 1050);
  await page.waitForTimeout(800);
  await markEvidence(expected(medHead, 'หมวดยา (มีคำสั่ง)'), expected(header, 'ขยายแล้ว'));
  await showCompareTable(page, 'TC-024 หมวดในส่วนก่อน admit (หน้าจอ)', ['หน้าจอ', 'Expected'], rows, { side: 'bottom' });
  for (const x of rows) expect(x.same, x.label).toBe(true);
  expect(empty, 'ต้องไม่แสดงหมวดที่ไม่มีคำสั่ง').toEqual([]);
  await hideCompareTable(page);
}

// =====================================================================================================

test.describe(`SBH-2593 Improve Order Summary ER (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 2_700_000 });

  let nurse: Page | undefined;
  test.beforeEach(() => {
    nurse = undefined;
  });
  test.afterEach(async () => {
    if (nurse) {
      await finishVideo(nurse).catch(() => undefined);
      await nurse.context().close().catch(() => undefined);
    }
  });

  // ================= ผู้ป่วย A: ER OPD → admit (Note · ยอดรวม · Sign · งานยาพยาบาล · Task List · ส่วนก่อน admit) =================
  const A_TC = [1, 2, 3, 4, 36, 6, 7, 26, 8, 11, 10, 12, 13, 19, 20, 16, 14, 15, 5, 21, 22, 23, 24, 25];
  test('ผู้ป่วย A: ER OPD → admit (TC 001–008 · 010–016 · 019–026 · 036)', { tag: ['@SBH-2593', '@SBH-2593-A', ...tagsOf(A_TC)], annotation: notesOf(A_TC) }, async ({ page, browser }) => {
    const { note, finish } = makeRunner(page);
    const auth = trackAuthorization(page);
    const su = makeRunner(page);
    const visit = await preparePatient(page, 'Os2593A', { ecg: true, meds: ALL_MEDS }, note);
    nurse = await openNurseWindow(browser, visitUrl(visit), visit.hn);
    const n = nurse;
    const nr = makeRunner(n);
    await openOrderSummary(page, visit);
    await resolveMedNames(page, () => auth(), visit.en, note);
    const progressText = `S: TC-002 SBH-2593 ปวดท้อง ${Date.now() % 100000}`;
    let progressEntry = '';
    const focusName = `TC-003 SBH-2593 ปวดท้อง ${Date.now() % 100000}`;
    let totals = { total: '', credit: '', paid: '' };

    // ---------- TC-001 ----------
    await startClip(page, 'TC-001');
    await su.soft(`${TC(1)} คอลัมน์ Note ซ้าย: แพทย์ (Progress Note) บน · พยาบาล (Nurse Focus Note) ล่าง · ไม่มี dropdown · ปุ่มเพิ่มของตัวเอง`, async () => {
      const p = await progressHeader(page).boundingBox();
      const nb = await nurseHeader(page).boundingBox();
      const order = await mainOf(page).getByText('ORDER FOR ONE DAY', { exact: true }).first().boundingBox();
      const dropdowns = await notesColumn(page).locator('.ant-select').count();
      const rows: CompareRow[] = [
        { label: 'Note แพทย์อยู่บน Note พยาบาล', values: [`y ${Math.round(p!.y)} < ${Math.round(nb!.y)}`], same: p!.y < nb!.y },
        { label: 'คอลัมน์ Note อยู่ซ้าย ORDER FOR ONE DAY', values: [`x ${Math.round(p!.x)} < ${Math.round(order!.x)}`], same: p!.x < order!.x },
        { label: 'dropdown เลือกแพทย์ / พยาบาล', values: [`${dropdowns} ตัว`], same: dropdowns === 0 },
        { label: 'ปุ่มเพิ่มของแต่ละส่วน', values: [`${await addProgressBtn(page).count()} / ${await addNurseBtn(page).count()}`], same: (await addProgressBtn(page).isVisible()) && (await addNurseBtn(page).isVisible()) },
      ];
      await markEvidence(expected(progressHeader(page), 'แพทย์ (บน)'), expected(nurseHeader(page), 'พยาบาล (ล่าง)'), expected(addProgressBtn(page), 'ปุ่มเพิ่ม'), expected(addNurseBtn(page), 'ปุ่มเพิ่ม'));
      await showCompareTable(page, 'TC-001 ตรวจจากหน้าจอ (สคริปต์ทดสอบ)', ['ผล'], rows, { side: 'bottom' });
      await hideCompareTable(page);
      for (const r of rows) expect(r.same, r.label).toBe(true);
    });

    // ---------- TC-002 ----------
    await startClip(page, 'TC-002');
    await su.soft(`${TC(2)} บันทึก Progress Note จากปุ่มเพิ่มของส่วน Note แพทย์ → แสดงในส่วนแพทย์พร้อมผู้บันทึกและเวลา ไม่แสดงในส่วนพยาบาล`, async () => {
      await addProgressBtn(page).click();
      const dialog = page.getByRole('dialog', { name: /Progress Note/ });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      const editors = dialog.getByRole('textbox');
      for (const [i, k] of ['S', 'O', 'A', 'P'].entries()) {
        await editors.nth(i).click();
        await page.keyboard.type(i === 0 ? progressText : `${k}: TC-002 SBH-2593`);
      }
      const save = dialog.getByRole('button', { name: 'บันทึก', exact: true });
      await markEvidence(filled(editors.nth(0), 'S'), filled(editors.nth(3), 'P'), clicked(save));
      await snapEvidence(page, 'ก่อนกด — บันทึก Progress Note');
      const saved = page.waitForResponse((r) => /\/contribution$/.test(r.url()) && r.request().method() === 'POST', { timeout: 60_000 });
      await save.click();
      expect((await saved).status(), 'บันทึก Progress Note ต้องตอบ 201').toBeLessThan(300);
      await expect(dialog).toBeHidden({ timeout: 20_000 });
      const entry = progressSection(page).getByText(progressText).first();
      await expect(entry, 'Progress Note ที่บันทึกต้องแสดงในส่วน Note แพทย์').toBeVisible({ timeout: 30_000 });
      const meta = progressSection(page).getByText(/สร้าง: /).first();
      await expect(meta).toBeVisible();
      const time = progressSection(page).getByText(/\d{1,2} \S+ \d{4} \d{2}:\d{2}/).first();
      progressEntry = `${(await time.innerText()).trim()} · ${(await meta.innerText()).trim()}`;
      note(`${TC(2)} รายการที่แสดง`, progressEntry);
      await expect(nurseSection(page).getByText(progressText), 'ต้องไม่แสดงในส่วน Note พยาบาล').toHaveCount(0);
      await markEvidence(expected(entry, 'ข้อความที่บันทึก'), expected(meta, 'ผู้บันทึก'), expected(time, 'เวลา'), expected(nurseHeader(page), 'ส่วนพยาบาล: ไม่มี'));
    });

    // ---------- TC-003 (Nurse) ----------
    await openOrderSummary(n, visit);
    await startClip(n, 'TC-003');
    await nr.soft(`${TC(3)} บันทึก Nurse Focus Note จากปุ่มเพิ่มของส่วน Note พยาบาล → แสดงในส่วนพยาบาลพร้อมผู้บันทึกและเวลา ไม่แสดงในส่วนแพทย์`, async () => {
      await addNurseBtn(n).click();
      await fillNurseNote(n, { focus: focusName, assessment: 'A: TC-003 ปวดท้อง', intervention: 'I: TC-003 ให้นอนพัก', evaluation: 'E: TC-003 อาการทุเลา' });
      const dialog = n.getByRole('dialog').filter({ hasText: 'Assessment (A)' });
      await markEvidence(filled(dialog.locator('input#focus'), 'Focus'), clicked(dialog.getByRole('button', { name: 'บันทึก' })));
      await snapEvidence(n, 'ก่อนกด — บันทึก Nurse Note');
      const result = await saveNurseNote(n);
      note(`${TC(3)} บันทึก`, `${result.status} · ${result.notices.join(' · ')}`);
      expect(result.closed, `บันทึก Nurse Note ไม่สำเร็จ: ${result.notices.join(' · ')}`).toBe(true);
      const card = nurseSection(n).getByText(`F: ${focusName}`).first();
      await expect(card, 'Focus ที่บันทึกต้องแสดงในส่วน Note พยาบาล').toBeVisible({ timeout: 30_000 });
      await expect(nurseHeader(n)).toContainText(/1 Focus/);
      await expect(nurseHeader(n)).toContainText(/ล่าสุด/);
      await card.click();
      await n.waitForTimeout(1_500);
      await expect(progressSection(n).getByText(focusName), 'ต้องไม่แสดงในส่วน Note แพทย์').toHaveCount(0);
      const who = nurseSection(n).getByText(/สร้าง|บันทึกโดย|โดย/).first();
      await markEvidence(expected(card, 'Focus ที่บันทึก'), expected(nurseHeader(n), 'จำนวน + เวลาล่าสุด'), ...((await who.isVisible().catch(() => false)) ? [expected(who, 'ผู้บันทึก')] : []), expected(progressHeader(n), 'ส่วนแพทย์: ไม่มี'));
      note(`${TC(3)} ส่วน Note พยาบาล`, (await nurseSection(n).innerText()).replace(/\s+/g, ' ').slice(0, 300));
    });

    // ---------- TC-004 (Nurse) ----------
    await startClip(n, 'TC-004');
    await nr.soft(`${TC(4)} พับและขยายส่วน Note แพทย์`, async () => {
      const entry = progressSection(n).getByText(progressText.slice(0, 20)).first();
      await expect(entry, 'ก่อนพับต้องเห็นรายการ Progress Note').toBeVisible({ timeout: 20_000 });
      await markEvidence(clicked(progressHeader(n), 'พับ'));
      await snapEvidence(n, 'ก่อนกด — พับ Note แพทย์');
      await progressHeader(n).click();
      await expect(progressHeader(n)).toHaveAttribute('aria-expanded', 'false');
      await expect(entry, 'พับแล้วต้องไม่แสดงรายการ Note').toBeHidden();
      await markEvidence(expected(progressHeader(n), 'พับแล้ว (หัว + จำนวน + เวลาล่าสุด)'));
      await snapEvidence(n, 'หลังกด — พับ Note แพทย์');
      await progressHeader(n).click();
      await expect(progressHeader(n)).toHaveAttribute('aria-expanded', 'true');
      await expect(entry, 'ขยายแล้วต้องแสดงรายการ Note ครบ').toBeVisible();
      await markEvidence(expected(entry, 'ขยายแล้ว: รายการกลับมา'));
    });

    // ---------- TC-036 (Nurse) ----------
    await startClip(n, 'TC-036');
    await nr.soft(`${TC(36)} พับและขยายส่วน Note พยาบาล`, async () => {
      const card = nurseSection(n).getByText(`F: ${focusName}`).first();
      await expect(card, 'ก่อนพับต้องเห็น Focus').toBeVisible({ timeout: 20_000 });
      await markEvidence(clicked(nurseHeader(n), 'พับ'));
      await snapEvidence(n, 'ก่อนกด — พับ Note พยาบาล');
      await nurseHeader(n).click();
      await expect(nurseHeader(n)).toHaveAttribute('aria-expanded', 'false');
      await expect(card, 'พับแล้วต้องไม่แสดงรายการ Note').toBeHidden();
      await markEvidence(expected(nurseHeader(n), 'พับแล้ว'));
      await snapEvidence(n, 'หลังกด — พับ Note พยาบาล');
      await nurseHeader(n).click();
      await expect(nurseHeader(n)).toHaveAttribute('aria-expanded', 'true');
      await expect(card, 'ขยายแล้วต้องแสดงรายการ Note ครบ').toBeVisible();
      await markEvidence(expected(card, 'ขยายแล้ว: รายการกลับมา'));
    });

    // ---------- TC-006 ----------
    await openOrderSummary(page, visit);
    await startClip(page, 'TC-006');
    await su.soft(`${TC(6)} ยอดรวมค่าใช้จ่าย ORDER FOR ONE DAY แสดงแถวเดียว (รวม / เครดิต / ต้องชำระ) = ผลรวมทุกรายการ`, async () => {
      const summary = mainOf(page).getByText('รวมค่าใช้จ่าย (วันนี้)', { exact: true }).first().locator('xpath=ancestor::div[.//table][1]');
      await summary.scrollIntoViewIfNeeded();
      const bodyRows = summary.locator('tbody tr').filter({ hasText: /\d/ });
      const rowTexts = (await bodyRows.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
      const totalRow = summary.getByText(/รวมทั้งหมด/).first().locator('xpath=ancestor::tr[1]');
      const nums = ((await totalRow.innerText()).match(/[\d,]+\.\d{2}/g) ?? []).map((s) => s.replace(/,/g, ''));
      totals = { total: nums[0] ?? '', credit: nums[1] ?? '', paid: nums[2] ?? '' };
      // ผลรวมของแต่ละการ์ด: "ราคาประมาณการรวม: รวม เครดิต จ่าย"
      const cardTotals = await mainOf(page).getByText(/ราคาประมาณการรวม/).evaluateAll((els) => els.map((e) => (e.closest('div')?.parentElement?.innerText ?? e.textContent ?? '').replace(/\s+/g, ' ')));
      const sums = [0, 0, 0];
      for (const t of cardTotals) {
        const m = t.match(/ราคาประมาณการรวม:\s*([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/);
        if (m) for (let i = 0; i < 3; i++) sums[i] += Number(m[i + 1].replace(/,/g, ''));
      }
      const fmt = (v: number) => v.toFixed(2);
      const rows: CompareRow[] = [
        { label: 'จำนวนแถวในตารางรวมค่าใช้จ่าย', values: [`${rowTexts.length} แถว: ${rowTexts.join(' | ').slice(0, 80)}`, '1 แถว (รวมทั้งหมด)'], same: rowTexts.length === 1 && /รวมทั้งหมด/.test(rowTexts[0] ?? '') },
        { label: 'รวม', values: [totals.total, fmt(sums[0])], same: Number(totals.total) === Number(fmt(sums[0])) },
        { label: 'เครดิต', values: [totals.credit, fmt(sums[1])], same: Number(totals.credit) === Number(fmt(sums[1])) },
        { label: 'ต้องชำระ', values: [totals.paid, fmt(sums[2])], same: Number(totals.paid) === Number(fmt(sums[2])) },
      ];
      note(`${TC(6)} ยอดของแต่ละการ์ด`, cardTotals.map((t) => t.slice(0, 80)).join(' | '));
      await markEvidence(expected(totalRow, 'แถวเดียว: รวม / เครดิต / ต้องชำระ'));
      await showCompareTable(page, 'TC-006 ยอดรวม (หน้าจอ) เทียบผลรวมของทุกการ์ด', ['ตารางรวมค่าใช้จ่าย', 'ผลรวมทุกการ์ด'], rows, { side: 'left', width: '760px', top: '120px' });
      for (const r of rows) expect(r.same, r.label).toBe(true);
      await hideCompareTable(page);
    });

    // ---------- TC-007 (Nurse) ----------
    await openOrderSummary(n, visit);
    await startClip(n, 'TC-007');
    await nr.soft(`${TC(7)} ตารางยาไม่มีคอลัมน์สถานะงานพยาบาล / สถานะห้องยา · ปุ่มในแถวแสดงตามสถานะแทน`, async () => {
      await showMedCard(n);
      const headers = (await medCard(n).locator('thead th').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
      const statusCols = headers.filter((h) => /สถานะ/.test(h));
      note(`${TC(7)} หัวคอลัมน์ตารางยา`, headers.join(' | '));
      await markEvidence(expected(medCard(n).locator('thead tr').first(), `หัวคอลัมน์: ไม่มีคอลัมน์สถานะ`), expected(await cellOf(medCard(n), rowOf(n, MED.m6), /^Action$/), 'ปุ่มตามสถานะ'));
      expect(statusCols, 'ต้องไม่มีคอลัมน์สถานะงานพยาบาล / สถานะห้องยา').toEqual([]);
    });

    // ---------- TC-026 (Nurse · ยายังไม่ลงนาม) ----------
    await startClip(n, 'TC-026');
    await nr.soft(`${TC(26)} ยาที่แพทย์ยังไม่ลงนามทำงานพยาบาลไม่ได้ (ไม่มีปุ่มในแถว · แถบสั่ง / รับ Order ทั้งหมด ไม่เปลี่ยนสถานะ)`, async () => {
      await showMedCard(n);
      const row = rowOf(n, MED.m7);
      const before = await rowButtons(row);
      note(`${TC(26)} แถว ${MED.m7.code} (ยังไม่ลงนาม)`, before);
      for (const b of ['รับ Order', 'ให้ยาแล้ว', 'ยกเลิก Order'] as const) await expect(btn(row, b), `แถวที่ยังไม่ลงนามต้องไม่มีปุ่ม ${b}`).toBeHidden();
      await markEvidence(expected(await cellOf(medCard(n), row, /^Action$/), 'ไม่มีปุ่มงานพยาบาล'), expected(await cellOf(medCard(n), row, /^ลงนาม$/), 'ยังไม่ลงนาม'));
      await snapEvidence(n, 'ยังไม่ลงนาม — ไม่มีปุ่ม');
      await rowCheckbox(row).check();
      await expect(bulkBar(n)).toBeVisible();
      const counts: string[] = [];
      for (const b of ['รับ Order', 'ให้ยาแล้ว', 'ยกเลิก Order']) {
        const x = bulkBtn(n, b);
        counts.push(`${(await x.innerText()).trim()}${(await x.isDisabled()) ? ' (กดไม่ได้)' : ''}`);
        await expect(x, `ติ๊กแถวที่ยังไม่ลงนาม ปุ่ม ${b} ในแถบสั่งต้องกดไม่ได้ (0)`).toBeDisabled();
      }
      note(`${TC(26)} แถบสั่ง`, counts.join(' · '));
      await markEvidence(filled(rowCheckbox(row), 'ติ๊กแถวที่ยังไม่ลงนาม'), expected(bulkBar(n), 'รับ Order / ให้ยาแล้ว / ยกเลิก Order = 0 กดไม่ได้'));
      await snapEvidence(n, 'แถบสั่ง — แถวยังไม่ลงนาม');
      await bulkBar(n).getByRole('button', { name: 'ล้างการเลือก' }).click().catch(() => rowCheckbox(row).uncheck());
      // งานยาของยาที่ยังไม่ลงนามมีอยู่แล้วตั้งแต่เพิ่มลงตะกร้า (PENDING — dev-x 31 ต.ค.) → เทียบสถานะก่อน / หลังกด
      const medNames = ALL_MEDS.map((m) => m.name);
      const beforeTasks = (await medTasks(n, () => auth(), visit.en)).filter((t) => medNames.includes(t.name)).map((t) => `${t.name.slice(0, 14)}=${t.status}`).sort();
      note(`${TC(26)} งานยาใน API ก่อนกด`, beforeTasks.join(' | ') || '(ไม่มีงานยา)');
      const all = acceptAllBtn(n);
      const allText = (await all.innerText()).trim();
      note(`${TC(26)} ปุ่มหัวตาราง`, `${allText}${(await all.isDisabled()) ? ' (กดไม่ได้)' : ''}`);
      if (await all.isEnabled()) {
        await markEvidence(clicked(all, `นับเฉพาะรายการที่ลงนามแล้ว (${PROC.label})`));
        await snapEvidence(n, 'ก่อนกด — รับ Order ทั้งหมด');
        const res = waitNurse(n, 'accept');
        await all.click();
        await res.catch(() => undefined);
        await n.waitForTimeout(2_000);
      }
      const afterTasks = (await medTasks(n, () => auth(), visit.en)).filter((t) => medNames.includes(t.name)).map((t) => `${t.name.slice(0, 14)}=${t.status}`).sort();
      note(`${TC(26)} งานยาใน API หลังกด`, afterTasks.join(' | ') || '(ไม่มีงานยา)');
      for (const b of ['รับ Order', 'ให้ยาแล้ว', 'ยกเลิก Order'] as const) await expect(btn(rowOf(n, MED.m7), b)).toBeHidden();
      await showMedCard(n);
      await markEvidence(expected(await cellOf(medCard(n), rowOf(n, MED.m7), /^Action$/), 'หลังกด: ยังไม่มีปุ่ม'));
      await showCompareTable(n, 'TC-026 งานยาของยาที่ยังไม่ลงนาม (API) ก่อน / หลังกด', ['หลังกด', 'ก่อนกด'], [{ label: 'สถานะงานยา', values: [afterTasks.join(' | '), beforeTasks.join(' | ')], same: afterTasks.join() === beforeTasks.join() }], { side: 'bottom' });
      expect(afterTasks, 'การสั่งจากแถบสั่ง / รับ Order ทั้งหมด ต้องไม่เปลี่ยนสถานะงานของยาที่ยังไม่ลงนาม').toEqual(beforeTasks);
      await hideCompareTable(n);
    });

    // ---------- TC-008 (Super_User · Sign ทีละรายการ) ----------
    await openOrderSummary(page, visit);
    await startClip(page, 'TC-008');
    await su.soft(`${TC(8)} Sign ยาทีละรายการ → ลงนามเฉพาะรายการนั้น รายการอื่นยังค้างและมีปุ่ม Sign`, async () => {
      await showMedCard(page);
      const row = rowOf(page, MED.m6);
      const sign = btn(row, 'Sign');
      await expect(sign).toBeVisible({ timeout: 20_000 });
      await markEvidence(clicked(sign, `Sign ${MED.m6.code}`));
      await snapEvidence(page, 'ก่อนกด — Sign แถว 1');
      const result = waitSign(page);
      await sign.click();
      const r = await result();
      note(`${TC(8)} SignOPDOrders`, `requestIds ${r.requestIds.length} รายการ · accepted ${r.accepted} ${r.errors.join(' ')}`);
      await snapToast(page, 'ส่งคำสั่งสำเร็จ', 'หลังกด — Sign แถว 1');
      expect(r.requestIds.length, 'Sign ในแถวต้องส่ง requestIds 1 รายการ').toBe(1);
      await expect(btn(rowOf(page, MED.m6), 'Sign')).toBeHidden({ timeout: 20_000 });
      const rows: CompareRow[] = [];
      for (const med of ALL_MEDS) {
        const st = await signedState(page, rowOf(page, med));
        rows.push({ label: med.code, values: [st, med === MED.m6 ? 'ลงนามแล้ว' : 'ค้างลงนาม'], same: st === (med === MED.m6 ? 'ลงนามแล้ว' : 'ค้างลงนาม') });
      }
      await markEvidence(expected(await cellOf(medCard(page), rowOf(page, MED.m6), /^ลงนาม$/), 'ลงนามแล้ว'), expected(btn(rowOf(page, MED.m7), 'Sign'), 'ยังค้าง'), expected(btn(rowOf(page, MED.m8), 'Sign'), 'ยังค้าง'));
      await showCompareTable(page, 'TC-008 สถานะลงนาม (หน้าจอ)', ['หน้าจอ', 'Expected'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(page);
    });

    // ---------- TC-011 (ห้องยา) ----------
    await startClip(page, 'TC-011');
    await su.soft(`${TC(11)} ยาที่ Sign จาก Order Summary เข้าคิวห้องยา · ยาที่ยังไม่ลงนามไม่อยู่ในคิว`, async () => {
      await openPharmacyOrder(page, visit.hn);
      const main = mainOf(page);
      const has = async (m: Med) => (await main.getByText(`[${m.code}]`).count()) > 0;
      const rows: CompareRow[] = [
        { label: `${MED.m6.code} (Sign แล้ว)`, values: [(await has(MED.m6)) ? 'อยู่ในคิว' : 'ไม่อยู่', 'อยู่ในคิว'], same: await has(MED.m6) },
        { label: `${MED.m7.code} (ยังไม่ลงนาม)`, values: [(await has(MED.m7)) ? 'อยู่ในคิว' : 'ไม่อยู่', 'ไม่อยู่'], same: !(await has(MED.m7)) },
        { label: `${MED.m8.code} (ยังไม่ลงนาม)`, values: [(await has(MED.m8)) ? 'อยู่ในคิว' : 'ไม่อยู่', 'ไม่อยู่'], same: !(await has(MED.m8)) },
      ];
      await markEvidence(expected(main.getByText(`[${MED.m6.code}]`).first(), 'ยาที่ Sign แล้ว'), expected(main.getByText(/Order รอยืนยัน/).first(), PHARMACY));
      await showCompareTable(page, `TC-011 คิว${PHARMACY} (หน้ารับออเดอร์)`, ['หน้าจอ', 'Expected'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(page);
    });

    // ---------- TC-010 (Sign All) ----------
    await openOrderSummary(page, visit);
    await startClip(page, 'TC-010');
    await su.soft(`${TC(10)} Sign All ที่หัวหมวดยา → ยาที่ค้างลงนามทุกรายการลงนามแล้ว ไม่มีปุ่ม Sign เหลือ`, async () => {
      await showMedCard(page);
      const all = signAllBtn(page);
      await expect(all).toBeVisible({ timeout: 20_000 });
      note(`${TC(10)} ปุ่ม`, (await all.innerText()).trim());
      await markEvidence(clicked(all), expected(btn(rowOf(page, MED.m7), 'Sign'), 'ค้าง'), expected(btn(rowOf(page, MED.m8), 'Sign'), 'ค้าง'));
      await snapEvidence(page, 'ก่อนกด — Sign All');
      const result = waitSign(page);
      await all.click();
      const confirm = page.getByRole('dialog').filter({ hasText: /ยืนยัน|ลงนาม/ }).getByRole('button', { name: /ยืนยัน|ตกลง|Sign/ }).first();
      if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) await confirm.click();
      const r = await result();
      note(`${TC(10)} SignOPDOrders`, `requestIds ${r.requestIds.length ? r.requestIds.length + ' รายการ' : '(ไม่ส่ง = ทั้ง EN)'} · accepted ${r.accepted}`);
      await snapToast(page, 'ส่งคำสั่งสำเร็จ', 'หลังกด — Sign All');
      await expect(medCard(page).getByRole('button', { name: 'Sign', exact: true }), 'ต้องไม่มีปุ่ม Sign เหลือในหมวดยา').toHaveCount(0, { timeout: 20_000 });
      for (const med of ALL_MEDS) expect(await signedState(page, rowOf(page, med)), `${med.code} ต้องลงนามแล้ว`).toBe('ลงนามแล้ว');
      await markEvidence(expected(await cellOf(medCard(page), rowOf(page, MED.m7), /^ลงนาม$/), 'ลงนามแล้ว'), expected(await cellOf(medCard(page), rowOf(page, MED.m8), /^ลงนาม$/), 'ลงนามแล้ว'));
    });

    // ---------- TC-012 (Nurse · รับ Order ในแถว) ----------
    await openOrderSummary(n, visit);
    await startClip(n, 'TC-012');
    await nr.soft(`${TC(12)} รับ Order จากปุ่มในแถวยา → ปุ่ม รับ Order หาย แสดง ให้ยาแล้ว · งานยาเป็น กำลังให้ยา`, async () => {
      await showMedCard(n);
      const row = rowOf(n, MED.m6);
      const accept = btn(row, 'รับ Order');
      await expect(accept, `แถว ${MED.m6.code} ต้องมีปุ่ม รับ Order`).toBeVisible({ timeout: 20_000 });
      await markEvidence(clicked(accept));
      await snapEvidence(n, 'ก่อนกด — รับ Order แถว');
      const res = waitNurse(n, 'accept');
      await accept.click();
      expect((await res).status()).toBe(200);
      await snapToast(n, 'รับ Order แล้ว 1 รายการ', 'หลังกด — รับ Order แถว');
      await expect(accept).toBeHidden({ timeout: 20_000 });
      await expect(btn(row, 'ให้ยาแล้ว')).toBeVisible();
      const st = await taskStatusOf(n, () => auth(), visit.en, MED.m6);
      note(`${TC(12)} งานยา (API)`, st.join(' · '));
      expect(st).toContain('กำลังให้ยา');
      await markEvidence(expected(btn(row, 'ให้ยาแล้ว'), `ไม่มี รับ Order แล้ว · API: ${st.join(' ')}`));
    });

    // ---------- TC-013 (Nurse · ให้ยาแล้ว) ----------
    await startClip(n, 'TC-013');
    await nr.soft(`${TC(13)} ให้ยาแล้ว → ระบบถามผู้ให้ยาและเวลา → งานยาเป็น ให้ยาแล้ว ปุ่มในแถวหาย`, async () => {
      await showMedCard(n);
      const row = rowOf(n, MED.m6);
      const given = btn(row, 'ให้ยาแล้ว');
      await expect(given).toBeVisible({ timeout: 20_000 });
      await markEvidence(clicked(given));
      await snapEvidence(n, 'ก่อนกด — ให้ยาแล้ว');
      await given.click();
      await confirmGiven(n, 'บันทึกให้ยาแล้ว (ผู้ให้ยา + เวลา)');
      await snapToast(n, /บันทึกให้ยาแล้ว 1 รายการ/, 'หลังกด — ให้ยาแล้ว');
      await expect(btn(row, 'ให้ยาแล้ว'), 'หลังบันทึก ปุ่ม ให้ยาแล้ว ต้องหาย').toBeHidden({ timeout: 20_000 });
      const st = await taskStatusOf(n, () => auth(), visit.en, MED.m6);
      note(`${TC(13)} งานยา (API)`, st.join(' · '));
      expect(st).toContain('ให้ยาแล้ว');
      await showMedCard(n);
      await markEvidence(expected(await cellOf(medCard(n), row, /^Action$/), `ให้ยาแล้ว: ไม่มีปุ่ม · API ${st.join(' ')}`));
    });

    // ---------- TC-019 (Order Summary → Task List) ----------
    await startClip(n, 'TC-019');
    await nr.soft(`${TC(19)} รับ Order ยา 1 รายการใน Order Summary → ER Nurse Task List แถวเดียวกันเป็น กำลังทำ`, async () => {
      await showMedCard(n);
      const accept = btn(rowOf(n, MED.m7), 'รับ Order');
      await expect(accept).toBeVisible({ timeout: 20_000 });
      await markEvidence(clicked(accept, MED.m7.code));
      await snapEvidence(n, 'ก่อนกด — รับ Order (Order Summary)');
      const res = waitNurse(n, 'accept');
      await accept.click();
      expect((await res).status()).toBe(200);
      await snapToast(n, 'รับ Order แล้ว 1 รายการ', 'หลังกด — รับ Order (Order Summary)');
      await openTaskList(n, visit);
      const row = taskRows(n, MED.m7.name).first();
      await expect(row, `ER Nurse Task List ต้องมีงาน ${MED.m7.name}`).toBeVisible({ timeout: 30_000 });
      await expect(taskStatusCell(row)).toHaveText(/กำลังทำ/, { timeout: 30_000 });
      note(`${TC(19)} Task List`, (await row.innerText()).replace(/\s+/g, ' ').slice(0, 120));
      await row.scrollIntoViewIfNeeded();
      await markEvidence(expected(taskStatusCell(row), 'กำลังทำ (= กำลังให้ยา)'), expected(row.locator('[data-label="รายการ"]').first(), MED.m7.code));
    });

    // ---------- TC-020 (Task List → Order Summary) ----------
    await startClip(n, 'TC-020');
    await nr.soft(`${TC(20)} รับงานยาใน ER Nurse Task List → Order Summary แถวเดียวกันไม่มี รับ Order แสดง ให้ยาแล้ว`, async () => {
      const row = taskRows(n, MED.m8.name).first();
      await expect(row).toBeVisible({ timeout: 30_000 });
      await expect(taskStatusCell(row)).toHaveText(/รอรับงาน/);
      const accept = row.getByRole('button', { name: /^(รับงาน|รับ Order)$/ }); // dev-x 31 ต.ค.: ปุ่มชื่อ รับ Order
      await markEvidence(clicked(accept, MED.m8.code), expected(taskStatusCell(row), 'รอรับงาน'));
      await snapEvidence(n, 'ก่อนกด — รับงาน (Task List)');
      const res = waitNurse(n, 'accept');
      await accept.click();
      expect((await res).status()).toBe(200);
      await expect(taskStatusCell(row)).toHaveText(/กำลังทำ/, { timeout: 20_000 });
      await markEvidence(expected(taskStatusCell(row), 'กำลังทำ'));
      await snapEvidence(n, 'หลังกด — รับงาน (Task List)');
      await openOrderSummary(n, visit);
      await showMedCard(n);
      const osRow = rowOf(n, MED.m8);
      await expect(btn(osRow, 'รับ Order'), 'Order Summary แถวเดียวกันต้องไม่มี รับ Order').toBeHidden({ timeout: 20_000 });
      await expect(btn(osRow, 'ให้ยาแล้ว')).toBeVisible();
      await markEvidence(expected(await cellOf(medCard(n), osRow, /^Action$/), `${MED.m8.code}: ไม่มี รับ Order · มี ให้ยาแล้ว`));
    });

    // ---------- TC-016 (dialog ยกเลิก Order) ----------
    await startClip(n, 'TC-016');
    await nr.soft(`${TC(16)} dialog ยกเลิก Order แจ้งว่าคำสั่งยา ใบยา และค่าใช้จ่ายยังอยู่`, async () => {
      if (!(await medCard(n).isVisible().catch(() => false))) await openOrderSummary(n, visit);
      await showMedCard(n);
      const cancel = btn(rowOf(n, MED.m7), 'ยกเลิก Order');
      await markEvidence(clicked(cancel));
      await snapEvidence(n, 'ก่อนกด — ยกเลิก Order (อ่านข้อความ)');
      await cancel.click();
      const dialog = n.getByRole('dialog', { name: 'ยกเลิก Order' });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      const notice = dialog.getByText(/คำสั่งยา ใบยา และค่าใช้จ่ายยังอยู่/).first();
      note(`${TC(16)} ข้อความใน dialog`, (await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 250));
      await markEvidence(expected(notice, 'คำสั่งยา ใบยา ค่าใช้จ่าย ยังอยู่'));
      await expect(notice).toBeVisible();
      await snapEvidence(n, 'ข้อความ dialog ยกเลิก Order');
      await dialog.getByRole('button', { name: 'ปิด' }).click();
      await expect(dialog).toBeHidden();
    });

    // ---------- TC-014 (ยกเลิก Order ใส่เหตุผล) ----------
    await startClip(n, 'TC-014');
    await nr.soft(`${TC(14)} ยกเลิก Order โดยใส่เหตุผล → งานยาเป็น ยกเลิก ปุ่มหาย · เหตุผลถูกบันทึก`, async () => {
      await showMedCard(n);
      const row = rowOf(n, MED.m7);
      await btn(row, 'ยกเลิก Order').click();
      const r = await confirmCancel(n, 'ยกเลิก Order + เหตุผล', { label: 'ผู้ป่วยปฏิเสธ', note: 'TC-014 SBH-2593 ผู้ป่วยไม่ประสงค์รับยา' });
      note(`${TC(14)} คำสั่งที่ส่ง`, r.sent);
      note(`${TC(14)} คำตอบ`, r.response);
      await snapToast(n, 'ยกเลิก Order แล้ว 1 รายการ', 'หลังกด — ยกเลิก Order + เหตุผล');
      for (const b of ['รับ Order', 'ให้ยาแล้ว', 'ยกเลิก Order'] as const) await expect(btn(row, b)).toBeHidden({ timeout: 20_000 });
      const st = await taskStatusOf(n, () => auth(), visit.en, MED.m7);
      const rows: CompareRow[] = [
        { label: 'สถานะงานยา (API)', values: [st.join(' '), 'ยกเลิก'], same: st.includes('ยกเลิก') },
        { label: 'เหตุผลที่ส่ง', values: [(r.sent.match(/"reasonCode":"(\w+)"/)?.[1] ?? '-') + ' · ' + (r.sent.match(/"reasonNote":"([^"]*)"/)?.[1] ?? '-'), 'PATIENT_REFUSED · TC-014 …'], same: /PATIENT_REFUSED/.test(r.sent) && /TC-014/.test(r.sent) },
        { label: 'คำตอบของระบบ', values: [r.response.slice(0, 70), 'บันทึกเหตุผล'], same: /PATIENT_REFUSED|TC-014|CANCELLED/i.test(r.response) },
      ];
      await showMedCard(n);
      await markEvidence(expected(await cellOf(medCard(n), row, /^Action$/), 'ยกเลิกแล้ว: ไม่มีปุ่ม'));
      await showCompareTable(n, 'TC-014 ยกเลิก Order (คำสั่งที่ส่ง / API)', ['ค่าที่เห็น', 'Expected'], rows, { side: 'bottom' });
      for (const x of rows.slice(0, 2)) expect(x.same, x.label).toBe(true);
      await hideCompareTable(n);
    });

    // ---------- TC-015 (ยกเลิก Order ไม่ใส่เหตุผล) ----------
    await startClip(n, 'TC-015');
    await nr.soft(`${TC(15)} ยกเลิก Order โดยไม่ใส่เหตุผล → ยืนยันได้ ไม่มีข้อความให้กรอก · งานยาเป็น ยกเลิก`, async () => {
      await showMedCard(n);
      const row = rowOf(n, MED.m8);
      await btn(row, 'ยกเลิก Order').click();
      const r = await confirmCancel(n, 'ยกเลิก Order ไม่ใส่เหตุผล');
      note(`${TC(15)} คำสั่งที่ส่ง`, r.sent);
      await expect(n.locator('.ant-form-item-explain-error')).toHaveCount(0);
      await snapToast(n, 'ยกเลิก Order แล้ว 1 รายการ', 'หลังกด — ยกเลิก Order ไม่ใส่เหตุผล');
      const st = await taskStatusOf(n, () => auth(), visit.en, MED.m8);
      note(`${TC(15)} งานยา (API)`, st.join(' · '));
      expect(st).toContain('ยกเลิก');
      await showMedCard(n);
      await markEvidence(expected(await cellOf(medCard(n), row, /^Action$/), `ยกเลิกแล้ว · API ${st.join(' ')}`));
    });

    // ---------- TC-005 (admit → Progress Note ยังอยู่) ----------
    const before = { progressEntry, totals };
    await startClip(page, 'TC-005');
    let an = '';
    await su.soft(`${TC(5)} Progress Note ที่บันทึกก่อนมี AN ยังแสดงใน Order Summary ของ ER หลัง admit (ข้อความ ผู้บันทึก เวลาเดิม)`, async () => {
      await gotoVisit(page, visit);
      an = await admitWithBed(page, visit, () => auth(), note);
      await openOrderSummary(page, visit);
      await expect(anBand(page), 'Order Summary ต้องเป็นมุมมองของ AN (ER IPD)').toContainText(new RegExp(`AN\\s*${an}`), { timeout: 30_000 });
      const entry = progressSection(page).getByText(progressText).first();
      await expect(entry, 'Progress Note ที่บันทึกก่อนมี AN ต้องยังแสดง').toBeVisible({ timeout: 30_000 });
      const meta = progressSection(page).getByText(/สร้าง: /).first();
      const time = progressSection(page).getByText(/\d{1,2} \S+ \d{4} \d{2}:\d{2}/).first();
      const now = `${(await time.innerText()).trim()} · ${(await meta.innerText()).trim()}`;
      const rows: CompareRow[] = [
        { label: 'ข้อความ S', values: [progressText, progressText], same: true },
        { label: 'เวลา · ผู้บันทึก', values: [now, before.progressEntry], same: now === before.progressEntry },
      ];
      await markEvidence(expected(entry, 'ข้อความเดิม'), expected(meta, 'ผู้บันทึก'), expected(time, 'เวลาเดิม'), expected(anBand(page), `มี AN ${an} แล้ว`));
      await showCompareTable(page, 'TC-005 Progress Note หลัง admit เทียบตอนบันทึก (TC-002)', ['หลัง admit', 'ตอนบันทึก'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(page);
    });

    // ---------- TC-021 ----------
    await startClip(page, 'TC-021');
    await su.soft(`${TC(21)} ER ที่มี AN: Note แพทย์ (บน) และพยาบาล (ล่าง) แสดงพร้อมกันแบบเดียวกับ ER ที่ยังไม่มี AN · ไม่มี dropdown`, async () => {
      const p = await progressHeader(page).boundingBox();
      const nb = await nurseHeader(page).boundingBox();
      const dropdowns = await notesColumn(page).locator('.ant-select').count();
      await markEvidence(expected(progressHeader(page), 'แพทย์ (บน)'), expected(nurseHeader(page), 'พยาบาล (ล่าง)'));
      expect(p!.y, 'Note แพทย์ต้องอยู่บน Note พยาบาล').toBeLessThan(nb!.y);
      expect(dropdowns, 'คอลัมน์ Note ต้องไม่มี dropdown เลือกแพทย์ / พยาบาล').toBe(0);
      await expect(nurseSection(page).getByText(`F: ${focusName}`).first(), 'Focus ที่พยาบาลบันทึก (TC-003) ต้องแสดงด้วย').toBeVisible();
    });

    // ---------- TC-022 ----------
    await openOrderSummary(page, visit);
    await startClip(page, 'TC-022');
    await su.soft(`${TC(22)} ORDER FOR ONE DAY (ก่อน admit) เปิดมาแบบพับ แสดงจำนวนรายการ + ราคารวม / เครดิต / จ่าย ตรงกับคำสั่งก่อน admit`, async () => {
      const header = preAdmitHeader(page);
      await expect(header).toBeVisible({ timeout: 30_000 });
      await expect(header, 'เปิดแท็บมาต้องเป็นแบบพับ').toHaveAttribute('aria-expanded', 'false');
      const text = (await header.innerText()).replace(/\s+/g, ' ');
      const count = text.match(/(\d+) รายการ/)?.[1] ?? '';
      const num = (label: string) => text.match(new RegExp(`${label}\\s*([\\d,.]+)`))?.[1]?.replace(/,/g, '') ?? '';
      const rows: CompareRow[] = [
        { label: 'จำนวนรายการ', values: [count, `4 (ยา 3 + ${PROC.label} 1)`], same: count === '4' },
        { label: 'ราคารวม', values: [num('ราคารวม'), before.totals.total], same: Number(num('ราคารวม')) === Number(before.totals.total) },
        { label: 'เครดิต', values: [num('เครดิต'), before.totals.credit], same: Number(num('เครดิต')) === Number(before.totals.credit) },
        { label: 'จ่าย', values: [num('จ่าย'), before.totals.paid], same: Number(num('จ่าย')) === Number(before.totals.paid) },
      ];
      note(`${TC(22)} หัวส่วน`, text);
      await markEvidence(expected(header, 'พับ · จำนวน + ราคารวม / เครดิต / จ่าย'));
      await showCompareTable(page, 'TC-022 หัวส่วนก่อน admit เทียบยอด ER ก่อน admit (TC-006)', ['หัวส่วน', 'ก่อน admit (TC-006)'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(page);
    });

    // ---------- TC-023 ----------
    await startClip(page, 'TC-023');
    await su.soft(`${TC(23)} คลิกหัว ORDER FOR ONE DAY (ก่อน admit) → ขยายแสดงรายการ · คลิกอีกครั้ง → พับเหลือหัวพร้อมยอดรวม`, async () => {
      const header = preAdmitHeader(page);
      await markEvidence(clicked(header, 'ขยาย'));
      await snapEvidence(page, 'ก่อนกด — ขยายส่วนก่อน admit');
      await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'true');
      const medInSection = preAdmitSection(page).getByText(`[${MED.m6.code}]`).first();
      await expect(medInSection, 'ขยายแล้วต้องเห็นรายการคำสั่งก่อน admit').toBeVisible({ timeout: 20_000 });
      await markEvidence(expected(header, 'ขยายแล้ว'), expected(medInSection, 'รายการคำสั่ง'));
      await snapEvidence(page, 'หลังกด — ขยาย');
      await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'false');
      await expect(medInSection).toBeHidden();
      await markEvidence(expected(header, 'พับกลับ: หัว + ยอดรวม'));
    });

    // ---------- TC-024 ----------
    await startClip(page, 'TC-024');
    await su.soft(`${TC(24)} ขยาย ORDER FOR ONE DAY (ก่อน admit) → แสดงเฉพาะหมวดที่มีคำสั่ง (ยา · หัตถการ) ไม่แสดง ICD9-CM`, async () => {
      if (PROD) return checkTc024Prod(page, note);
      const header = preAdmitHeader(page);
      if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
      await expect(header).toHaveAttribute('aria-expanded', 'true');
      const section = preAdmitSection(page);
      const titles = (await section.locator('.ant-card-head-title').allInnerTexts()).map((t) => t.trim());
      note(`${TC(24)} หมวดที่แสดง`, titles.join(' | '));
      await markEvidence(expected(section.locator('.ant-card-head-title').filter({ hasText: /^ยา$/ }).first(), 'ยา'), expected(section.locator('.ant-card-head-title').filter({ hasText: /^หัตถการ/ }).first(), 'หัตถการ'));
      expect(titles.some((t) => /^ยา$/.test(t)), 'ต้องแสดงหมวดยา').toBe(true);
      expect(titles.some((t) => /^หัตถการ/.test(t)), 'ต้องแสดงหมวดหัตถการ').toBe(true);
      await expect(section.getByText('ICD9-CM', { exact: true }), 'ต้องไม่แสดงหมวด ICD9-CM').toHaveCount(0);
    });

    // ---------- TC-025 ----------
    await startClip(page, 'TC-025');
    await su.soft(`${TC(25)} ORDER FOR ONE DAY ของ AN แสดงแถบ รับไว้รักษา / วันที่รับเข้าเตียง / วันที่สร้าง AN / PDx ตรงกับข้อมูล Admit`, async () => {
      const header = preAdmitHeader(page);
      if ((await header.getAttribute('aria-expanded')) === 'true') await header.click();
      const band = mainOf(page).getByText(/รับไว้รักษา:/).first().locator('xpath=ancestor::div[.//*[contains(., "PDx")]][1]');
      await band.scrollIntoViewIfNeeded();
      const text = (await band.innerText()).replace(/\s+/g, ' ');
      note(`${TC(25)} แถบ`, text);
      const today = new Date();
      const d = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear() + 543}`;
      const rows: CompareRow[] = [
        { label: 'รับไว้รักษา', values: [text.match(/รับไว้รักษา:\s*([^ ]+ [\d:]+)/)?.[1] ?? '-', `${d} (วันที่ Admit)`], same: text.includes(`รับไว้รักษา: ${d}`) },
        { label: 'วันที่รับเข้าเตียง', values: [text.match(/วันที่รับเข้าเตียง:\s*(\S+)/)?.[1] ?? '-', '- (ยังรอเตียง)'], same: /วันที่รับเข้าเตียง:/.test(text) },
        { label: 'วันที่สร้าง AN', values: [text.match(/วันที่สร้าง AN:\s*([^ ]+ [\d:]+)/)?.[1] ?? '-', `${d} (AN ${an})`], same: text.includes(`วันที่สร้าง AN: ${d}`) },
        { label: 'PDx', values: [text.match(/PDx:\s*(.+?)(?: Admit|$)/)?.[1] ?? '-', 'K30 (Admit Request)'], same: /PDx:\s*K30/.test(text) },
      ];
      await markEvidence(expected(band, 'รับไว้รักษา / รับเข้าเตียง / สร้าง AN / PDx'));
      await showCompareTable(page, 'TC-025 แถบรับไว้รักษา เทียบข้อมูล Admit', ['หน้าจอ', 'ข้อมูล Admit'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(page);
    });

    note('สถานะงานยาท้ายเทส (API)', (await medTasks(page, () => auth(), visit.en)).map((t) => `${t.name.slice(0, 20)} = ${t.status}`).join(' | '));
    nr.finish();
    su.finish();
    finish();
  });

  // ================= ผู้ป่วย A ตรวจซ้ำ TC-005 (อ่านอย่างเดียว · รายเดิมที่ admit แล้ว) =================
  // SBH2593_A_TC005="<HN>,<VN>,<EN>,<AN>" · SBH2593_A_TC002="<เวลา · ผู้บันทึก ที่ TC-002 จดไว้>" (annotation ของรอบที่บันทึก)
  test('ผู้ป่วย A: ตรวจซ้ำ TC-005 หลัง admit (อ่านอย่างเดียว)', { tag: ['@SBH-2593-A5', `@${ISSUE[5]}`], annotation: notesOf([5]) }, async ({ page }) => {
    const env = (process.env.SBH2593_A_TC005 ?? '').split(',').filter(Boolean);
    test.skip(env.length < 4, 'ต้องตั้ง SBH2593_A_TC005=HN,VN,EN,AN');
    const [hn, vn, en, an] = env;
    const visit = { hn, vn, en };
    const recorded = process.env.SBH2593_A_TC002 ?? '';
    const { note, soft, finish } = makeRunner(page);
    note('ผู้ป่วย (อ่านอย่างเดียว)', `HN ${hn} · ${vn} · ${en} · AN ${an} · TC-002 บันทึกไว้: ${recorded}`);
    await openOrderSummary(page, visit);
    await startClip(page, 'TC-005');
    await soft(`${TC(5)} Progress Note ที่บันทึกก่อนมี AN ยังแสดงใน Order Summary ของ ER หลัง admit (ข้อความ ผู้บันทึก เวลาเดิม)`, async () => {
      await expect(anBand(page), 'Order Summary ต้องเป็นมุมมองของ AN (ER IPD)').toContainText(new RegExp(`AN\\s*${an}`), { timeout: 30_000 });
      const entry = progressSection(page).getByText(/S: TC-002 SBH-2593/).first();
      await expect(entry, 'Progress Note ที่บันทึกก่อนมี AN ต้องยังแสดง').toBeVisible({ timeout: 30_000 });
      const meta = progressSection(page).getByText(/สร้าง: /).first();
      const time = progressSection(page).getByText(/\d{1,2} \S+ \d{4} \d{2}:\d{2}/).first();
      const now = `${(await time.innerText()).trim()} · ${(await meta.innerText()).trim()}`;
      const rows: CompareRow[] = [
        { label: 'ข้อความ S', values: [(await entry.innerText()).trim(), 'S: TC-002 SBH-2593 … (TC-002)'], same: true },
        { label: 'เวลา · ผู้บันทึก', values: [now, recorded], same: now === recorded },
      ];
      await markEvidence(expected(entry, 'ข้อความเดิม'), expected(meta, 'ผู้บันทึก'), expected(time, 'เวลาเดิม'), expected(anBand(page), `มี AN ${an} แล้ว`));
      await showCompareTable(page, 'TC-005 Progress Note หลัง admit เทียบตอนบันทึก (TC-002)', ['หลัง admit', 'ตอนบันทึก'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(page);
    });
    finish();
  });

  // ================= ผู้ป่วย A ตรวจซ้ำ TC-024 (อ่านอย่างเดียว · รายเดิมที่ admit แล้ว — SBH Prod 5 พ.ย. 2026) =================
  test('ผู้ป่วย A: ตรวจซ้ำ TC-024 หมวดในส่วนก่อน admit (อ่านอย่างเดียว)', { tag: ['@SBH-2593-A24', `@${ISSUE[24]}`], annotation: notesOf([24]) }, async ({ page }) => {
    const env = (process.env.SBH2593_A_VISIT ?? '').split(',').filter(Boolean);
    test.skip(env.length < 3, 'ต้องตั้ง SBH2593_A_VISIT=HN,VN,EN');
    const visit = { hn: env[0], vn: env[1], en: env[2] };
    const { note, soft, finish } = makeRunner(page);
    note('ผู้ป่วย (อ่านอย่างเดียว)', `HN ${visit.hn} · ${visit.vn} · ${visit.en} (ผู้ป่วย A หลัง admit)`);
    await openOrderSummary(page, visit);
    await startClip(page, 'TC-024');
    await soft(`${TC(24)} ขยายส่วนก่อน admit → แสดงเฉพาะหมวดที่มีคำสั่ง`, async () => checkTc024Prod(page, note));
    finish();
  });

  // ================= ผู้ป่วย B: Sign หลายรายการ · Sign ยาซ้ำ · ยกเลิก Order หลายแถว =================
  const B_TC = [9, 27, 38];
  test('ผู้ป่วย B: Sign หลายรายการ / ยาซ้ำ / ยกเลิก Order หลายแถว (TC 009 · 027 · 038)', { tag: ['@SBH-2593', '@SBH-2593-B', ...tagsOf(B_TC)], annotation: notesOf(B_TC) }, async ({ page, browser }) => {
    const { note, finish } = makeRunner(page);
    const auth = trackAuthorization(page);
    const su = makeRunner(page);
    const visit = await preparePatient(page, 'Os2593B', { meds: ALL_MEDS }, note);
    await openOrderSummary(page, visit);
    await resolveMedNames(page, () => auth(), visit.en, note);

    await startClip(page, 'TC-009');
    await su.soft(`${TC(9)} เลือกยา 2 รายการแล้ว Sign จากแถบสั่ง → 2 รายการลงนาม · รายการที่ไม่ได้เลือกยังค้าง`, async () => {
      await showMedCard(page);
      await rowCheckbox(rowOf(page, MED.m6)).check();
      await rowCheckbox(rowOf(page, MED.m7)).check();
      const sign = bulkBtn(page, 'Sign');
      await expect(sign).toHaveText(/Sign \(2\)/);
      await markEvidence(filled(rowCheckbox(rowOf(page, MED.m6))), filled(rowCheckbox(rowOf(page, MED.m7))), clicked(sign));
      await snapEvidence(page, 'ก่อนกด — Sign (2)');
      const result = waitSign(page);
      await sign.click();
      const r = await result();
      note(`${TC(9)} SignOPDOrders`, `requestIds ${r.requestIds.length} รายการ · accepted ${r.accepted}`);
      await snapToast(page, 'ส่งคำสั่งสำเร็จ', 'หลังกด — Sign (2)');
      expect(r.requestIds.length, 'Sign จากแถบสั่งต้องส่ง requestIds 2 รายการ').toBe(2);
      await expect(btn(rowOf(page, MED.m6), 'Sign')).toBeHidden({ timeout: 20_000 });
      const rows: CompareRow[] = [];
      for (const med of ALL_MEDS) {
        const st = await signedState(page, rowOf(page, med));
        const exp = med === MED.m8 ? 'ค้างลงนาม' : 'ลงนามแล้ว';
        rows.push({ label: med.code, values: [st, exp], same: st === exp });
      }
      await markEvidence(expected(await cellOf(medCard(page), rowOf(page, MED.m6), /^ลงนาม$/), 'ลงนามแล้ว'), expected(await cellOf(medCard(page), rowOf(page, MED.m7), /^ลงนาม$/), 'ลงนามแล้ว'), expected(btn(rowOf(page, MED.m8), 'Sign'), 'ไม่ได้เลือก: ยังค้าง'));
      await showCompareTable(page, 'TC-009 สถานะลงนาม (หน้าจอ)', ['หน้าจอ', 'Expected'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(page);
    });

    await startClip(page, 'TC-027');
    await su.soft(`${TC(27)} Sign ยาซ้ำ ลงนามได้เหมือน OPD Order Form (ยืนยันยาซ้ำตอนเพิ่มลงตะกร้า)`, async () => {
      await runTc027(page, visit, note);
    });

    // ลงนามที่เหลือทั้งหมด (เตรียม TC-038 — ไม่ใช่ขั้นของ TC)
    await openOrderSummary(page, visit);
    if (await medCard(page).getByRole('button', { name: 'Sign', exact: true }).count()) {
      const result = waitSign(page);
      await signAllBtn(page).click();
      const confirm = page.getByRole('dialog').filter({ visible: true }).getByRole('button', { name: /ยืนยัน|สั่งต่อ|ตกลง/ }).first();
      if (await confirm.isVisible({ timeout: 5_000 }).catch(() => false)) await confirm.click();
      await result().catch(() => undefined);
      await page.waitForTimeout(2_000);
    }

    nurse = await openNurseWindow(browser, visitUrl(visit), visit.hn);
    const n = nurse;
    const nr = makeRunner(n);
    await openOrderSummary(n, visit, false);
    await startClip(n, 'TC-038');
    await nr.soft(`${TC(38)} เลือกยา 2 แถวแล้วยกเลิก Order พร้อมกัน → 2 รายการเป็น ยกเลิก · ที่ไม่ได้เลือกยังรอรับ Order`, async () => {
      await showMedCard(n);
      const before = await medTasks(n, () => auth(), visit.en);
      note(`${TC(38)} ก่อนกด (API)`, before.map((t) => `${t.name.slice(0, 18)} = ${t.status}`).join(' | '));
      await rowCheckbox(rowOf(n, MED.m7)).check();
      await rowCheckbox(rowOf(n, MED.m8)).check();
      const cancel = bulkBtn(n, 'ยกเลิก Order');
      await expect(cancel).toHaveText(/ยกเลิก Order \(2\)/);
      await markEvidence(filled(rowCheckbox(rowOf(n, MED.m7))), filled(rowCheckbox(rowOf(n, MED.m8))), clicked(cancel));
      await snapEvidence(n, 'ก่อนกด — ยกเลิก Order (2)');
      await cancel.click();
      await confirmCancel(n, 'ยืนยันยกเลิก 2 รายการ');
      await snapToast(n, 'ยกเลิก Order แล้ว 2 รายการ', 'หลังกด — ยกเลิก Order (2)');
      const after = await medTasks(n, () => auth(), visit.en);
      const rows: CompareRow[] = [MED.m7, MED.m8].map((m) => {
        const st = after.filter((t) => t.name === m.name).map((t) => TASK_STATUS[t.status]).join(' ');
        return { label: `${m.code} (เลือก)`, values: [st, 'ยกเลิก'], same: st === 'ยกเลิก' };
      });
      const m6 = after.filter((t) => t.name === MED.m6.name).map((t) => TASK_STATUS[t.status]);
      rows.push({ label: `${MED.m6.code} ×${m6.length} (ไม่ได้เลือก)`, values: [m6.join(' / '), 'รอรับ Order'], same: m6.length > 0 && m6.every((s) => s === 'รอรับ Order') });
      await showMedCard(n);
      await markEvidence(expected(await cellOf(medCard(n), rowOf(n, MED.m7), /^Action$/), 'ยกเลิกแล้ว'), expected(await cellOf(medCard(n), rowOf(n, MED.m8), /^Action$/), 'ยกเลิกแล้ว'), expected(btn(rowOf(n, MED.m6), 'รับ Order'), 'ไม่ได้เลือก: ยังรอรับ'));
      await showCompareTable(n, 'TC-038 สถานะงานยา (API)', ['หลังกด', 'Expected'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(n);
    });
    nr.finish();
    su.finish();
    finish();
  });

  // ================= ผู้ป่วย B ตรวจซ้ำ TC-027 (รายเดิม: มี med0000006 ที่ลงนามแล้ว) =================
  // SBH2593_B_TC027="<HN>,<VN>,<EN>"
  test('ผู้ป่วย B: ตรวจซ้ำ TC-027 Sign ยาซ้ำ (รายเดิม)', { tag: ['@SBH-2593-B27', `@${ISSUE[27]}`], annotation: notesOf([27]) }, async ({ page }) => {
    const env = (process.env.SBH2593_B_TC027 ?? '').split(',').filter(Boolean);
    test.skip(env.length < 3, 'ต้องตั้ง SBH2593_B_TC027=HN,VN,EN');
    const visit = { hn: env[0], vn: env[1], en: env[2] };
    const { note, soft, finish } = makeRunner(page);
    note(`ผู้ป่วย (รายเดิม${process.env.SBH2593_TC027_LABEL ? ` — ${process.env.SBH2593_TC027_LABEL}` : 'ของเทส B'})`, `HN ${visit.hn} · ${visit.vn} · ${visit.en} · ${MED.m6.code} ลงนามแล้ว`);
    await gotoVisit(page, visit);
    await startClip(page, 'TC-027');
    await soft(`${TC(27)} Sign ยาซ้ำ ลงนามได้เหมือน OPD Order Form (ยืนยันยาซ้ำตอนเพิ่มลงตะกร้า)`, () => runTc027(page, visit, note));
    finish();
  });

  // ================= ผู้ป่วย C: รับ Order หลายแถว · ใบยา / ค่าใช้จ่ายไม่เปลี่ยน =================
  const C_TC = [17, 28, 29, 30];
  test('ผู้ป่วย C: รับ Order หลายแถว + ใบยา / ค่าใช้จ่ายไม่เปลี่ยนหลังกดปุ่มพยาบาล (TC 017 · 028–030)', { tag: ['@SBH-2593', '@SBH-2593-C', ...tagsOf(C_TC)], annotation: notesOf(C_TC) }, async ({ page, browser }) => {
    const { note, finish } = makeRunner(page);
    const auth = trackAuthorization(page);
    const su = makeRunner(page);
    const visit = await preparePatient(page, 'Os2593C', { meds: ALL_MEDS, signAll: true }, note);
    nurse = await openNurseWindow(browser, visitUrl(visit), visit.hn);
    const n = nurse;
    const nr = makeRunner(n);
    await openOrderSummary(n, visit, false);
    await resolveMedNames(n, () => auth(), visit.en, note);

    // SBH2593_C_FROM=rx: TC-017 ผ่านแล้วกับรายเดิม (SBH2593_C_VISIT) → ข้ามไปขั้นออกใบยา
    if (process.env.SBH2593_C_FROM !== 'rx') {
    await startClip(n, 'TC-017');
    await nr.soft(`${TC(17)} เลือกยา 2 แถวแล้วรับ Order พร้อมกัน → 2 รายการเป็น กำลังให้ยา · ที่ไม่ได้เลือกยังรอรับ Order`, async () => {
      await showMedCard(n);
      await rowCheckbox(rowOf(n, MED.m6)).check();
      await rowCheckbox(rowOf(n, MED.m7)).check();
      const accept = bulkBtn(n, 'รับ Order');
      await expect(accept).toHaveText(/รับ Order \(2\)/);
      await markEvidence(filled(rowCheckbox(rowOf(n, MED.m6))), filled(rowCheckbox(rowOf(n, MED.m7))), clicked(accept));
      await snapEvidence(n, 'ก่อนกด — รับ Order (2)');
      await accept.click();
      await snapToast(n, 'รับ Order แล้ว 2 รายการ', 'หลังกด — รับ Order (2)');
      await expect(btn(rowOf(n, MED.m6), 'รับ Order')).toBeHidden({ timeout: 20_000 });
      const after = await medTasks(n, () => auth(), visit.en);
      const st = (m: Med) => after.filter((t) => t.name === m.name).map((t) => TASK_STATUS[t.status]).join(' ');
      const rows: CompareRow[] = [
        { label: `${MED.m6.code} (เลือก)`, values: [st(MED.m6), 'กำลังให้ยา'], same: st(MED.m6) === 'กำลังให้ยา' },
        { label: `${MED.m7.code} (เลือก)`, values: [st(MED.m7), 'กำลังให้ยา'], same: st(MED.m7) === 'กำลังให้ยา' },
        { label: `${MED.m8.code} (ไม่ได้เลือก)`, values: [st(MED.m8), 'รอรับ Order'], same: st(MED.m8) === 'รอรับ Order' },
      ];
      await markEvidence(expected(btn(rowOf(n, MED.m6), 'ให้ยาแล้ว'), 'กำลังให้ยา'), expected(btn(rowOf(n, MED.m7), 'ให้ยาแล้ว'), 'กำลังให้ยา'), expected(btn(rowOf(n, MED.m8), 'รับ Order'), 'ยังรอรับ'));
      await showCompareTable(n, 'TC-017 สถานะงานยา (API)', ['หลังกด', 'Expected'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(n);
    });
    }

    // ห้องยาออกใบยา (เตรียม TC-028–030) — จดสถานะงานยาก่อน / หลังออกใบยา
    const beforeRx = await medTasks(page, () => auth(), visit.en);
    const rx = await createPrescriptionA(page, visit.hn);
    const afterRx = await medTasks(page, () => auth(), visit.en);
    note(`${PHARMACY} ออกใบยา`, `${rx} · งานยาก่อน: ${beforeRx.map((t) => `${t.name.slice(0, 12)}=${t.status}`).join(' ')} · หลัง: ${afterRx.map((t) => `${t.name.slice(0, 12)}=${t.status}`).join(' ')}`);

    /** เทียบหน้าการเงิน + ใบยา (API) ก่อน / หลังกดปุ่มพยาบาล */
    const compareAround = async (tc: number, label: string, act: () => Promise<void>) => {
      const before = await cashierSnapshot(page, visit);
      const rxBefore = await prescriptionState(page, () => auth(), rx);
      await markEvidence(expected(before.statusRow, 'ใบยา (ก่อนกด)'), expected(before.items.first(), 'ค่าใช้จ่าย (ก่อนกด)'));
      await snapEvidence(page, `การเงินก่อนกด — ${label}`);
      await act();
      const after = await cashierSnapshot(page, visit);
      const rxAfter = await prescriptionState(page, () => auth(), rx);
      const rows: CompareRow[] = [
        { label: 'สถานะ Order / ใบยา', values: [after.status.slice(0, 70), before.status.slice(0, 70)], same: after.status === before.status },
        { label: 'รายการค่าใช้จ่ายยา', values: [after.itemTexts.map((t) => t.slice(0, 45)).join(' | '), before.itemTexts.map((t) => t.slice(0, 45)).join(' | ')], same: JSON.stringify(after.itemTexts) === JSON.stringify(before.itemTexts) },
        { label: `ใบยา ${rx} (API)`, values: [rxAfter.slice(0, 90), rxBefore.slice(0, 90)], same: rxAfter === rxBefore },
      ];
      note(`${TC(tc)} ก่อน / หลัง`, `${before.status} ‖ ${after.status}`);
      await markEvidence(expected(after.statusRow, 'ใบยา (หลังกด) = เดิม'), expected(after.items.first(), 'ค่าใช้จ่าย (หลังกด) = เดิม'));
      await showCompareTable(page, `TC-${pad(tc)} หน้าการเงิน + ใบยา: หลังกด เทียบก่อนกด`, ['หลังกด', 'ก่อนกด'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(page);
    };

    // TC-028 ถูก Canceled (4 พ.ย. 2026 หลังบั๊ก SBH-3455 = Won't do) → ไม่รันบน SBH Prod
    if (!PROD) await startClip(n, 'TC-028');
    if (!PROD) await startClip(page, 'TC-028-su');
    if (!PROD) await su.soft(`${TC(28)} ห้องยาออกใบยาแล้ว: กด รับ Order → สถานะใบยาและรายการค่าใช้จ่ายของ visit ไม่เปลี่ยน`, async () => {
      await compareAround(28, 'รับ Order', async () => {
        await openOrderSummary(n, visit);
        await showMedCard(n);
        const accept = btn(rowOf(n, MED.m8), 'รับ Order');
        await expect(accept, `${MED.m8.code} (รอรับ Order) ต้องมีปุ่ม รับ Order หลังห้องยาออกใบยา`).toBeVisible({ timeout: 20_000 });
        await markEvidence(clicked(accept, MED.m8.code));
        await snapEvidence(n, 'ก่อนกด — รับ Order (ใบยาออกแล้ว)');
        await accept.click();
        await snapToast(n, 'รับ Order แล้ว 1 รายการ', 'หลังกด — รับ Order (ใบยาออกแล้ว)');
      });
    });

    await startClip(n, 'TC-029');
    await startClip(page, 'TC-029-su');
    await su.soft(`${TC(29)} ห้องยาออกใบยาแล้ว: กด ให้ยาแล้ว → สถานะใบยาและรายการค่าใช้จ่ายของ visit ไม่เปลี่ยน`, async () => {
      await compareAround(29, 'ให้ยาแล้ว', async () => {
        await openOrderSummary(n, visit);
        await showMedCard(n);
        const given = btn(rowOf(n, MED.m6), 'ให้ยาแล้ว');
        await expect(given).toBeVisible({ timeout: 20_000 });
        await markEvidence(clicked(given, MED.m6.code));
        await snapEvidence(n, 'ก่อนกด — ให้ยาแล้ว (ใบยาออกแล้ว)');
        await given.click();
        await confirmGiven(n, 'บันทึกให้ยาแล้ว (ใบยาออกแล้ว)');
        await snapToast(n, /บันทึกให้ยาแล้ว 1 รายการ/, 'หลังกด — ให้ยาแล้ว (ใบยาออกแล้ว)');
      });
    });

    await startClip(n, 'TC-030');
    await startClip(page, 'TC-030-su');
    await su.soft(`${TC(30)} ห้องยาออกใบยาแล้ว: กด ยกเลิก Order → ใบยาไม่ถูกยกเลิก ค่าใช้จ่ายของยายังอยู่ครบ`, async () => {
      await compareAround(30, 'ยกเลิก Order', async () => {
        await openOrderSummary(n, visit);
        await showMedCard(n);
        const cancel = btn(rowOf(n, MED.m7), 'ยกเลิก Order');
        await expect(cancel).toBeVisible({ timeout: 20_000 });
        await markEvidence(clicked(cancel, MED.m7.code));
        await snapEvidence(n, 'ก่อนกด — ยกเลิก Order (ใบยาออกแล้ว)');
        await cancel.click();
        await confirmCancel(n, 'ยืนยันยกเลิก (ใบยาออกแล้ว)');
        await snapToast(n, 'ยกเลิก Order แล้ว 1 รายการ', 'หลังกด — ยกเลิก Order (ใบยาออกแล้ว)');
      });
    });
    nr.finish();
    su.finish();
    finish();
  });

  // ================= ผู้ป่วย C ตรวจซ้ำ TC-030 หลังกดยกเลิก Order (อ่านอย่างเดียว — SBH Prod 5 พ.ย. 2026) =================
  // รอบรันจริงอ่านหน้าการเงินขณะโหลดไม่ครบ → ถ่ายสถานะหลังกดใหม่ · SBH2593_C_VISIT="HN,VN,EN" · SBH2593_C_RX=<เลขใบยา>
  test('ผู้ป่วย C: ตรวจซ้ำ TC-030 ใบยา / ค่าใช้จ่ายหลังยกเลิก Order (อ่านอย่างเดียว)', { tag: ['@SBH-2593-C30', `@${ISSUE[30]}`], annotation: notesOf([30]) }, async ({ page }) => {
    const env = (process.env.SBH2593_C_VISIT ?? '').split(',').filter(Boolean);
    const rx = process.env.SBH2593_C_RX ?? '';
    test.skip(env.length < 3 || !rx, 'ต้องตั้ง SBH2593_C_VISIT=HN,VN,EN และ SBH2593_C_RX');
    const visit = { hn: env[0], vn: env[1], en: env[2] };
    const { note, soft, finish } = makeRunner(page);
    const auth = trackAuthorization(page);
    note('ผู้ป่วย (อ่านอย่างเดียว)', `HN ${visit.hn} · ${visit.vn} · ${visit.en} · ใบยา ${rx} · กด ยกเลิก Order ของ ${MED.m7.code} ไปแล้วในรอบรัน`);
    await startClip(page, 'TC-030');
    await soft(`${TC(30)} หลังกด ยกเลิก Order: ใบยาไม่ถูกยกเลิก ค่าใช้จ่ายของยายังอยู่ครบ`, async () => {
      const snap = await cashierSnapshot(page, visit);
      const tasks = await medTasks(page, () => auth(), visit.en);
      const rxNow = await prescriptionState(page, () => auth(), rx);
      const task7 = tasks.filter((t) => t.name === MED.m7.name).map((t) => TASK_STATUS[t.status] ?? t.status).join(' ');
      const has = (m: Med) => snap.itemTexts.find((t) => t.includes(m.code)) ?? '(ไม่มี)';
      const rows: CompareRow[] = [
        { label: `งานพยาบาล ${MED.m7.code} (API)`, values: [task7, 'ยกเลิก (กดแล้ว)'], same: task7 === 'ยกเลิก' },
        { label: `ใบยา ${rx} (API)`, values: [rxNow.slice(0, 90), 'Prescription issued (active) ทุกรายการ'], same: !!rxNow && !/cancel/i.test(rxNow) },
        { label: `ค่าใช้จ่าย ${MED.m7.code}`, values: [has(MED.m7).slice(0, 70), 'ยังอยู่'], same: has(MED.m7) !== '(ไม่มี)' },
        { label: `ค่าใช้จ่าย ${MED.m6.code}`, values: [has(MED.m6).slice(0, 70), 'ยังอยู่'], same: has(MED.m6) !== '(ไม่มี)' },
        { label: 'แถวใบยาหน้าการเงิน', values: [snap.status.slice(0, 70), `มี ${rx}`], same: (await page.getByRole('main').getByText(rx).count()) > 0 },
      ];
      await markEvidence(expected(page.getByRole('main').getByText(rx).first(), 'ใบยายังอยู่ (รอจัด)'), expected(snap.items.filter({ hasText: MED.m7.code }).first(), 'ค่าใช้จ่ายของยาที่ยกเลิก Order ยังอยู่'));
      await showCompareTable(page, 'TC-030 หลังกด ยกเลิก Order (อ่านซ้ำ)', ['หน้าจอ / API', 'Expected'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(page);
    });
    finish();
  });

  // ================= ผู้ป่วย D: รับ Order ทั้งหมด · ให้ยาแล้วหลายแถว =================
  const D_TC = [18, 37];
  test('ผู้ป่วย D: รับ Order ทั้งหมด + ให้ยาแล้วหลายแถว (TC 018 · 037)', { tag: ['@SBH-2593', '@SBH-2593-D', ...tagsOf(D_TC)], annotation: notesOf(D_TC) }, async ({ page, browser }) => {
    const { note, finish } = makeRunner(page);
    const auth = trackAuthorization(page);
    const visit = await preparePatient(page, 'Os2593D', { meds: ALL_MEDS, signAll: true }, note);
    await gotoVisit(page, visit);
    nurse = await openNurseWindow(browser, visitUrl(visit), visit.hn);
    const n = nurse;
    const nr = makeRunner(n);
    await openOrderSummary(n, visit, false);
    await resolveMedNames(n, () => auth(), visit.en, note);

    await startClip(n, 'TC-018');
    await nr.soft(`${TC(18)} รับ Order ทั้งหมด → ยาทุกรายการที่รอรับเป็น กำลังให้ยา ไม่มีปุ่ม รับ Order เหลือ`, async () => {
      await showMedCard(n);
      const all = acceptAllBtn(n);
      await expect(all).toHaveText(/รับ Order ทั้งหมด \(3\)/, { timeout: 20_000 });
      await markEvidence(clicked(all));
      await snapEvidence(n, 'ก่อนกด — รับ Order ทั้งหมด');
      await all.click();
      await snapToast(n, 'รับ Order แล้ว 3 รายการ', 'หลังกด — รับ Order ทั้งหมด');
      await expect(medCard(n).getByRole('button', { name: 'รับ Order', exact: true }), 'ต้องไม่มีปุ่ม รับ Order เหลือในตารางยา').toHaveCount(0, { timeout: 20_000 });
      const after = await medTasks(n, () => auth(), visit.en);
      const rows: CompareRow[] = ALL_MEDS.map((m) => {
        const st = after.filter((t) => t.name === m.name).map((t) => TASK_STATUS[t.status]).join(' ');
        return { label: m.code, values: [st, 'กำลังให้ยา'], same: st === 'กำลังให้ยา' };
      });
      await markEvidence(expected(medCard(n).locator('tbody'), 'ไม่มี รับ Order เหลือ'));
      await showCompareTable(n, 'TC-018 สถานะงานยา (API)', ['หลังกด', 'Expected'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(n);
    });

    await startClip(n, 'TC-037');
    await nr.soft(`${TC(37)} เลือกยา 2 แถวแล้วกด ให้ยาแล้ว พร้อมกัน → ถามผู้ให้ยาและเวลา · 2 รายการเป็น ให้ยาแล้ว · ที่ไม่ได้เลือกยังกำลังให้ยา`, async () => {
      await showMedCard(n);
      await rowCheckbox(rowOf(n, MED.m6)).check();
      await rowCheckbox(rowOf(n, MED.m7)).check();
      const given = bulkBtn(n, 'ให้ยาแล้ว');
      await expect(given).toHaveText(/ให้ยาแล้ว \(2\)/);
      await markEvidence(filled(rowCheckbox(rowOf(n, MED.m6))), filled(rowCheckbox(rowOf(n, MED.m7))), clicked(given));
      await snapEvidence(n, 'ก่อนกด — ให้ยาแล้ว (2)');
      await given.click();
      await confirmGiven(n, 'บันทึกให้ยาแล้ว 2 รายการ');
      await snapToast(n, /บันทึกให้ยาแล้ว 2 รายการ/, 'หลังกด — ให้ยาแล้ว (2)');
      const after = await medTasks(n, () => auth(), visit.en);
      const st = (m: Med) => after.filter((t) => t.name === m.name).map((t) => TASK_STATUS[t.status]).join(' ');
      const rows: CompareRow[] = [
        { label: `${MED.m6.code} (เลือก)`, values: [st(MED.m6), 'ให้ยาแล้ว'], same: st(MED.m6) === 'ให้ยาแล้ว' },
        { label: `${MED.m7.code} (เลือก)`, values: [st(MED.m7), 'ให้ยาแล้ว'], same: st(MED.m7) === 'ให้ยาแล้ว' },
        { label: `${MED.m8.code} (ไม่ได้เลือก)`, values: [st(MED.m8), 'กำลังให้ยา'], same: st(MED.m8) === 'กำลังให้ยา' },
      ];
      await showMedCard(n);
      await markEvidence(expected(await cellOf(medCard(n), rowOf(n, MED.m6), /^Action$/), 'ให้ยาแล้ว'), expected(await cellOf(medCard(n), rowOf(n, MED.m7), /^Action$/), 'ให้ยาแล้ว'), expected(btn(rowOf(n, MED.m8), 'ให้ยาแล้ว'), 'ยังกำลังให้ยา'));
      await showCompareTable(n, 'TC-037 สถานะงานยา (API)', ['หลังกด', 'Expected'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(n);
    });
    nr.finish();
    finish();
  });

  // ================= ผู้ป่วย D กดซ้ำ TC-018 (SBH Prod 5 พ.ย. 2026 — รอบแรกคำขอรับ 1 ใน 3 ตอบ 500 · ผู้ใช้ให้ "กดซ้ำกับผู้ป่วย D ก่อนสรุป") =================
  // ผู้ป่วย D หลัง TC-027 มีงานยารอรับ 3 รายการ (MED0000260 เดิม + ที่สั่งซ้ำ 2) · SBH2593_D_VISIT="HN,VN,EN"
  test('ผู้ป่วย D: กดซ้ำ TC-018 รับ Order ทั้งหมด', { tag: ['@SBH-2593-D18', `@${ISSUE[18]}`], annotation: notesOf([18]) }, async ({ page, browser }) => {
    const env = (process.env.SBH2593_D_VISIT ?? '').split(',').filter(Boolean);
    test.skip(env.length < 3, 'ต้องตั้ง SBH2593_D_VISIT=HN,VN,EN');
    const visit = { hn: env[0], vn: env[1], en: env[2] };
    const { note, finish } = makeRunner(page);
    const auth = trackAuthorization(page);
    note('ผู้ป่วย (รายเดิม · กดซ้ำ)', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
    await gotoVisit(page, visit);
    nurse = await openNurseWindow(browser, visitUrl(visit), visit.hn);
    const n = nurse;
    const nr = makeRunner(n);
    await openOrderSummary(n, visit, false);
    const accepts: string[] = [];
    n.on('response', (r) => {
      if (/\/er\/nurse-tasks\/[^/]+\/accept/.test(r.url()) && r.request().method() === 'POST') accepts.push(`${r.url().match(/medication:([0-9a-f]{8})/)?.[1] ?? '?'}=${r.status()}`);
    });
    const pending = async () => (await medTasks(n, () => auth(), visit.en)).filter((t) => t.status === 'PENDING').length;
    await startClip(n, 'TC-018');
    await nr.soft(`${TC(18)} กดซ้ำ: รับ Order ทั้งหมด → งานยาที่รอรับเป็นกำลังให้ยาทุกรายการ`, async () => {
      await showMedCard(n);
      const before = await pending();
      const all = acceptAllBtn(n);
      const label = (await all.innerText()).trim();
      note(`${TC(18)} ก่อนกด`, `${label} · งานยารอรับ (API) ${before} รายการ`);
      await markEvidence(clicked(all, `งานยารอรับ ${before} รายการ`));
      await snapEvidence(n, 'ก่อนกด — รับ Order ทั้งหมด (กดซ้ำ)');
      await all.click();
      const notice = n.locator('.ant-notification-notice, .ant-message-notice').first();
      await notice.waitFor({ timeout: 20_000 }).catch(() => undefined);
      const noticeText = (await notice.innerText().catch(() => '(ไม่มีแจ้งเตือน)')).replace(/\s+/g, ' ');
      await markEvidence(alerted(notice));
      await snapEvidence(n, 'หลังกด — แจ้งเตือน (กดซ้ำ)');
      await n.waitForTimeout(4_000);
      const after = await pending();
      const left = await medCard(n).getByRole('button', { name: 'รับ Order', exact: true }).count();
      note(`${TC(18)} หลังกด`, `แจ้งเตือน: ${noticeText} · คำขอรับ: ${accepts.join(' ')} · งานยารอรับ (API) ${after} · ปุ่ม รับ Order ในตาราง ${left}`);
      const rows: CompareRow[] = [
        { label: 'คำขอรับ (สถานะ HTTP)', values: [accepts.join(' · ') || '(ไม่มี)', '200 ทุกคำขอ'], same: accepts.length > 0 && accepts.every((a) => a.endsWith('=200')) },
        { label: 'แจ้งเตือน', values: [noticeText.slice(0, 60), `รับ Order แล้ว ${before} รายการ`], same: noticeText.includes(`รับ Order แล้ว ${before} รายการ`) },
        { label: 'งานยารอรับ (API)', values: [`${after}`, '0'], same: after === 0 },
        { label: 'ปุ่ม รับ Order ในตารางยา', values: [`${left}`, '0'], same: left === 0 },
      ];
      await markEvidence(expected(medCard(n).locator('tbody'), after === 0 ? 'ไม่มี รับ Order เหลือ' : `ทุกรายการรับแล้ว · จริง: เหลือ ${after}`));
      await showCompareTable(n, 'TC-018 กดซ้ำ: รับ Order ทั้งหมด', ['หลังกด', 'Expected'], rows, { side: 'bottom' });
      for (const x of rows) expect(x.same, x.label).toBe(true);
      await hideCompareTable(n);
    });
    nr.finish();
    finish();
  });

  // ================= ผู้ป่วย E: AN ไม่มีคำสั่งก่อน admit · หอผู้ป่วย =================
  const E_TC = [31, 32, 33];
  test('ผู้ป่วย E: AN ไม่มีคำสั่งก่อน admit + Admission Summary หอผู้ป่วย (TC 031–033)', { tag: ['@SBH-2593', '@SBH-2593-E', ...tagsOf(E_TC)], annotation: notesOf(E_TC) }, async ({ page, browser }) => {
    const { note, finish } = makeRunner(page);
    const auth = trackAuthorization(page);
    const su = makeRunner(page);
    const visit = await preparePatient(page, 'Os2593E', { meds: [] }, note);
    const an = await admitWithBed(page, visit, () => auth(), note);
    await openOrderSummary(page, visit);

    await startClip(page, 'TC-031');
    await su.soft(`${TC(31)} ER มี AN แต่ไม่มีคำสั่งก่อน admit → ไม่แสดง section ORDER FOR ONE DAY (ก่อน admit)`, async () => {
      const band = anBand(page);
      await expect(band, 'ต้องเป็นมุมมองของ AN').toContainText(new RegExp(`AN\\s*${an}`), { timeout: 30_000 });
      await expect(preAdmitHeader(page), 'ต้องไม่แสดง ORDER FOR ONE DAY (ก่อน admit)').toHaveCount(0);
      await markEvidence(expected(band, `มี AN ${an}`), expected(mainOf(page).getByText(/ORDER FOR ONE DAY/).first(), 'มีแค่ ORDER FOR ONE DAY ของ AN'));
    });

    nurse = await openNurseWindow(browser, `/cortex/next/patients/${visit.hn}?an=${an}&fromApp=ipd`, visit.hn);
    const n = nurse;
    const nr = makeRunner(n);
    const viewSelect = () => mainOf(n).locator('.ant-select').filter({ hasText: /แสดงแบบ(ฟิลเตอร์|แท็บ)/ }).first();
    await expect(mainOf(n).getByText('IPD Summary').first()).toBeVisible({ timeout: 60_000 });
    const originalView = (await viewSelect().innerText()).trim();
    const chooseView = async (name: string) => {
      if ((await viewSelect().innerText()).includes(name)) return;
      await viewSelect().click();
      await n.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: name }).first().click();
      await n.waitForTimeout(3_000);
    };

    await startClip(n, 'TC-032');
    await nr.soft(`${TC(32)} Admission Summary ของหอผู้ป่วยยังมี dropdown เลือกแพทย์ / พยาบาล (ไม่ใช่ Note แบบพับได้ของ ER)`, async () => {
      await chooseView('แสดงแบบแท็บ');
      const noteSelect = mainOf(n).locator('.ant-select').filter({ hasText: /^(แพทย์|พยาบาล)$/ }).first();
      await expect(noteSelect, 'ส่วน Note ต้องมี dropdown เลือกแพทย์ / พยาบาล').toBeVisible({ timeout: 30_000 });
      await expect(progressHeader(n), 'ต้องไม่มี Note แบบพับได้ของ ER').toHaveCount(0);
      await noteSelect.click();
      const opts = await n.locator('.ant-select-dropdown:visible .ant-select-item-option').allInnerTexts();
      note(`${TC(32)} ตัวเลือก dropdown`, opts.join(' / '));
      await markEvidence(expected(noteSelect, `dropdown: ${opts.join(' / ')}`));
      await snapEvidence(n, 'dropdown แพทย์ / พยาบาล');
      await n.keyboard.press('Escape');
    });

    await startClip(n, 'TC-033');
    await nr.soft(`${TC(33)} Admission Summary หอผู้ป่วย มุมมองแสดงแบบแท็บ ไม่มีแถบ รับไว้รักษา / วันที่รับเข้าเตียง / วันที่สร้าง AN / PDx`, async () => {
      await chooseView('แสดงแบบแท็บ');
      const order = mainOf(n).getByText('ORDER FOR ONE DAY', { exact: true }).first();
      await expect(order).toBeVisible({ timeout: 30_000 });
      await expect(mainOf(n).getByText(/รับไว้รักษา:/), 'มุมมองแบบแท็บต้องไม่มีแถบรับไว้รักษา').toHaveCount(0);
      await expect(mainOf(n).getByText(/วันที่สร้าง AN:/)).toHaveCount(0);
      await markEvidence(expected(viewSelect(), 'แสดงแบบแท็บ'), expected(order, 'ไม่มีแถบรับไว้รักษา'));
    });
    await chooseView(originalView.includes('ฟิลเตอร์') ? 'แสดงแบบฟิลเตอร์' : 'แสดงแบบแท็บ').catch(() => undefined);
    nr.finish();
    su.finish();
    finish();
  });

  // ================= ผู้ป่วย F: OPD (อ่านอย่างเดียว) =================
  const F_TC = [34, 35];
  test('ผู้ป่วย F: Order Summary / Order Form ของ OPD ไม่เปลี่ยน (TC 034 · 035 · อ่านอย่างเดียว)', { tag: ['@SBH-2593', '@SBH-2593-F', ...tagsOf(F_TC)], annotation: notesOf(F_TC) }, async ({ page, browser }) => {
    const { note, finish } = makeRunner(page);
    const su = makeRunner(page);
    const opdUrl = `/cortex/next/patients/${OPD_PATIENT.hn}?en=${OPD_PATIENT.en}&vn=${OPD_PATIENT.vn}&fromApp=opd`;
    note('ผู้ป่วย OPD (อ่านอย่างเดียว)', `${OPD_PATIENT.label} · HN ${OPD_PATIENT.hn} · ${OPD_PATIENT.vn} · ${OPD_PATIENT.en} · มียาที่ส่งคำสั่งแล้ว`);
    /** เมนูขวา "คำสั่งการรักษา" → สวิตช์ "ดูรวม" V2 = Order Form / V1 = Order Summary (การ์ด ICD9-CM) */
    const openOpd = async (p: Page) => {
      await expect(async () => {
        await p.goto(opdUrl);
        await expect(mainOf(p).getByText(`HN ${OPD_PATIENT.hn}`, { exact: true }).first()).toBeVisible({ timeout: 45_000 });
      }).toPass({ timeout: 150_000 });
      const item = p.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: /คำสั่งการรักษา$/ }).first();
      const sw = mainOf(p).locator('[class*="_opd-summary-version-switch_"] [role=switch]').first();
      // บัญชี Nurse: แผง "ฟอร์มคัดกรอง" โหลดตามหลังแล้วทับ (ไม่บันทึกอะไร) → ต้องเห็นสวิตช์ต่อเนื่อง 3 วินาที
      await expect(async () => {
        if (!(await sw.isVisible())) await item.click({ force: true });
        await expect(sw).toBeVisible({ timeout: 10_000 });
        await p.waitForTimeout(3_000);
        await expect(sw).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 120_000 });
      await p.mouse.move(960, 1050);
      await p.waitForTimeout(3_000);
      return sw;
    };
    /** สลับ V1 / V2 — บัญชี Nurse มีแผง "ฟอร์มคัดกรอง" เด้งมาทับได้ → คลิกแท็บ OPD กลับ (ไม่บันทึก / ไม่ปิดฟอร์ม) จนเห็นสวิตช์ค่าที่ต้องการนิ่ง 3 วินาที */
    const setView = async (p: Page, sw: Locator, v: 'V1' | 'V2') => {
      const want = v === 'V2' ? 'true' : 'false';
      const item = p.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: /คำสั่งการรักษา$/ }).first();
      await expect(async () => {
        if (!(await sw.isVisible())) await item.click({ force: true, timeout: 5_000 });
        await expect(sw).toBeVisible({ timeout: 10_000 });
        if ((await sw.getAttribute('aria-checked')) !== want) await sw.click();
        await expect(sw).toHaveAttribute('aria-checked', want, { timeout: 5_000 });
        await p.waitForTimeout(3_000);
        await expect(sw).toBeVisible({ timeout: 1_000 });
        await expect(sw).toHaveAttribute('aria-checked', want, { timeout: 1_000 });
      }, `สลับมุมมอง ${v}`).toPass({ timeout: 120_000 });
      await p.mouse.move(960, 1050);
    };
    const nurseButtons = (p: Page) => mainOf(p).getByRole('button', { name: /^(รับ Order|ให้ยาแล้ว|ยกเลิก Order|รับ Order ทั้งหมด.*)$/ });

    const sw = await openOpd(page);
    const original = (await sw.getAttribute('aria-checked')) ?? 'true';
    await startClip(page, 'TC-034');
    await su.soft(`${TC(34)} Order Summary ของ OPD ยังแสดงการ์ด ICD9-CM ตามเดิม`, async () => {
      await setView(page, sw, 'V1');
      const icd = mainOf(page).getByText('ICD9-CM', { exact: true }).first();
      await expect(icd, 'ต้องแสดงการ์ด ICD9-CM').toBeVisible({ timeout: 30_000 });
      await icd.scrollIntoViewIfNeeded();
      const card = icd.locator('xpath=ancestor::div[.//*[contains(., "Add ICD9-CM")]][1]');
      await markEvidence(expected(icd, 'การ์ด ICD9-CM'), ...((await card.count()) ? [expected(card.getByText(/Add ICD9-CM/).first(), 'เพิ่ม ICD9-CM ได้ตามเดิม')] : []), expected(mainOf(page).locator('[class*="_opd-summary-version-switch_"]').first(), 'ดูรวม = V1 (Order Summary)'));
    });
    // TC-035 ใช้บัญชี Super_User (มีสิทธิ์งานพยาบาล — เห็นปุ่ม รับ Order / ให้ยาแล้ว ใน Order Summary ของ ER) แทนบัญชี Nurse:
    // หน้าต่าง Nurse ของผู้ป่วย OPD เปิดเป็น 2 ช่อง (OPD + ฟอร์มคัดกรอง) แล้วสวิตช์ ดูรวม ไม่นิ่ง (dev-x 31 ต.ค. — รันไม่ผ่าน 3 รอบ)
    note(`${TC(35)} บัญชีที่ใช้`, 'Super_User (มีสิทธิ์ nurse-task:edit — เห็นปุ่มงานพยาบาลใน ER) แทน Nurse ที่หน้าต่างแบ่ง 2 ช่องแล้วสวิตช์ไม่นิ่ง');
    await startClip(page, 'TC-035');
    await su.soft(`${TC(35)} Order Summary และ Order Form ของ OPD ไม่มีปุ่ม รับ Order / ให้ยาแล้ว / ยกเลิก Order / รับ Order ทั้งหมด`, async () => {
      await setView(page, sw, 'V1');
      const medRow = mainOf(page).getByRole('row').filter({ hasText: MED_CODE }).first();
      await expect(medRow).toBeVisible({ timeout: 30_000 });
      const inSummary = await nurseButtons(page).count();
      await markEvidence(expected(medRow, `Order Summary: ปุ่มงานพยาบาล ${inSummary} ปุ่ม`));
      await snapEvidence(page, 'OPD Order Summary (V1)');
      await setView(page, sw, 'V2');
      const formRow = mainOf(page).getByRole('row').filter({ hasText: MED_CODE }).first();
      await expect(formRow).toBeVisible({ timeout: 30_000 });
      const inForm = await nurseButtons(page).count();
      note(`${TC(35)} ปุ่มงานพยาบาล`, `Order Summary ${inSummary} · Order Form ${inForm}`);
      await markEvidence(expected(formRow, `Order Form: ปุ่มงานพยาบาล ${inForm} ปุ่ม`));
      expect(inSummary, 'Order Summary ของ OPD ต้องไม่มีปุ่มงานพยาบาล').toBe(0);
      expect(inForm, 'Order Form ของ OPD ต้องไม่มีปุ่มงานพยาบาล').toBe(0);
    });
    await setView(page, sw, original === 'true' ? 'V2' : 'V1').catch(() => undefined);
    su.finish();
    finish();
  });

  // ================= ท้ายงาน (SBH Prod): ปิด Visit ที่การเงิน — ผู้ใช้เลือก "สร้าง 5 ราย แล้วปิด Visit" (R124) =================
  // เทสการ์ดไม่ปิด Visit เอง (กันเสียโควตาเมื่อเทสล้มกลางทาง) → ปิดหลังเก็บหลักฐานครบด้วย SBH2593_CLOSE="HN,VN;HN,VN"
  test('ท้ายงาน: ปิด Visit ของผู้ป่วยที่เทสสร้าง', { tag: ['@SBH-2593-CLOSE'] }, async ({ page }) => {
    const list = (process.env.SBH2593_CLOSE ?? '').split(';').map((x) => x.split(',').map((s) => s.trim())).filter((x) => x.length === 2 && x[0]);
    test.skip(!list.length, 'ต้องตั้ง SBH2593_CLOSE="HN,VN;HN,VN"');
    const failed: string[] = [];
    for (const [hn, vn] of list) {
      const result = await closeVisitAtCashier(page, hn, vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => {
          failed.push(hn);
          return `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`;
        },
      );
      test.info().annotations.push({ type: 'ปิด Visit', description: `HN ${hn} · ${vn}: ${result}` });
      console.log(`    ปิด Visit: HN ${hn} · ${vn}: ${result}`);
    }
    expect(failed, 'ปิด Visit ไม่สำเร็จ').toEqual([]);
  });
});
