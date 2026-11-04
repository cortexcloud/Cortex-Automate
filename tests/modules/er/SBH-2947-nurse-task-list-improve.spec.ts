import fs from 'node:fs';
import path from 'node:path';
import { type Browser, type Locator, type Page } from '@playwright/test';
import { closeVisitAtCashier, gotoCashierAccount, payAllInCash } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, fetchBoard, fetchZones, gotoErDashboard, openCarePanel, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import { createAdmitRequest } from '../../../helpers/functions/er-admit';
import { chooseDispositionDiagnosis, dispositionTextBoxes, graphqlMutation, saveDispositionDraft, signDisposition, startDisposition } from '../../../helpers/functions/er-disposition';
import { erDischargeButton, erDischargeConfirm, erListRow, filterErListByHn, gotoErPatientList, openErListTab } from '../../../helpers/functions/er-list';
import { createDialog, fetchIncident, fillMemberTriage, memberRow, openCreateIncident, pressReady, selectMember, submitAllButton, submitCreateIncident, type MciIncident } from '../../../helpers/functions/er-mass-casualty';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, erTriageSaveButton, fillErTriageForm, saveErTriageForm, type VitalSigns } from '../../../helpers/functions/er-triage';
import { alerted, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit, SETTINGS, submitOrders } from '../../../mock-data/uat-er';
import { VITALS_HIGH_MEWS, VITALS_NORMAL, careMenu, gotoVisit, options } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// SBH-2947 [ER][In ER Zone][Improve] Nurse Tasks List — หน้า ER "รายการงานพยาบาล" (/cortex/er/nurse-task-list)
//   AC: เพิ่ม Nurse Note เปิดได้ · ไม่แสดงโซน Triage / ผู้ป่วยที่ออกจาก ER · ชื่อ + สีหัวโซนใหม่ · Bubble แดงที่เมนู · ป้าย MC · ปุ่ม รับ Order · เรียง Fast Track → ESI → MEWS → FIFO
// ชุด EXE SBH-3363 → HPY SBH-3364 (TC-001–021 = SBH-3366–3386) · EDG SBH-3365 (TC-022–026 = SBH-3387–3391) · 1 เทส = 1 flow (R9) · คลิปต่อ TC (R61)
// ผู้ป่วย AUTO ใหม่ทุกรอบบน dev-x (R10 / R11 / R17) · ทุกรายสั่ง Imaging (Lab ไม่สร้างงานพยาบาลบน dev-x — SBH-2618) ให้ขึ้นในรายการ
//   เทส 1 โซน / Marker: A ESI 2 Resuscitation · Y ESI 3 Urgency · I1 / I2 ESI 4 Isolation 1 / 2 · O ESI 5 Observation · B ยังไม่คัดกรอง
//   เทส 2 เรียงลำดับ (Resuscitation ทุกราย · คัดกรองตามลำดับ): P1 ESI 2 · P2 ESI 2 (MEWS เท่า P1) · P3 ESI 1 · P4 ESI 2 MEWS สูง · P5 / P6 ESI 2 + Fast Track
//     (ใช้แทน S1–S10 ของ TC: 020 = P5 เหนือ P3 · 021 = P3 เหนือ P1 · 024 = P5 เหนือ P6 · 025 = P4 เหนือ P1 · 026 = P1 เหนือ P2)
//   เทส 3 MC: เหตุการณ์ Triage หมู่ 2 ราย → ส่งทั้งเหตุการณ์ → สั่ง Imaging
//   เทส 4 ออกจาก ER: C รับเป็นผู้ป่วยใน (Disposition Admit + Admit Order → AN + เตียง → IPD เพิ่มผู้ป่วยลงเตียง — ผู้ใช้อนุญาตเลือกเตียงรอบนี้ R84) ·
//     D Disposition ลงนาม (รอจำหน่าย) · E จำหน่าย · F จำหน่าย + ปิด Visit ที่การเงิน · G ยกเลิก Encounter
//   เทส 5 Bubble หลังรับ Order ครบ: รับ Order ทุกงานที่ค้างทั้ง ER วันนี้ (รวมของผู้ป่วยรายอื่น — ผู้ใช้อนุญาต R84) → ตรวจเพิ่ม (Retest 3 พ.ย. 2026 ผู้ใช้ขอ):
//     เปิดผู้ป่วยทุกรายในรายชื่อ ต้องไม่มีงาน "รอรับงาน" / ปุ่ม รับ Order + API งานรอรับรายผู้ป่วย = 0 → รีเฟรชดู Bubble → ปิด Visit ผู้ป่วยของชุดนี้
// บัญชี: Super_User (user1) ลงทะเบียน / คัดกรอง / สั่ง / Disposition / Admit / การเงิน · Nurse (x-nurse) หน้ารายการงานพยาบาล (หน้าต่างแยก)
// สิ่งที่รู้ก่อนเขียน (dev-x 31 ต.ค. 2026 · ไฟล์แอป index-DJaj9lPY.js · chunk หน้า index-CVp9tXVO.js · decisions R84):
//   - ป้ายโซน: "zone: Resuscitation (1-2)" / "zone: Urgency (3-4)" / "zone: Observation (5)" (เลขคือช่วง ESI) · Isolation ไม่มีช่วง → แสดงชื่ออย่างเดียว
//   - สีหัวโซน = data-tone red / yellow / green / blue (class _red_ … ของ .ant-collapse-item) · Bubble = .ant-badge-dot ที่เมนู (title = จำนวนงานรอรับทั้ง ER)
//   - เมนูซ้ายพับไว้ตั้งต้น → กดปุ่ม "ขยายแถบนำทาง" ก่อนดู Bubble
// รัน (dev-x): npx playwright test --headed --grep @SBH-2947  ·  เทสเดียว: --grep @SBH-2947-ZONE / -SORT / -MC / -EXIT / -BUBBLE
//   SBH2947_KEEP=1 = ไม่ปิด Visit ท้ายเทส 5
// Retest 4 พ.ย. 2026 (ตัวแก้ SBH-3843 · index-DABLTrDz.js): Bubble เป็นวงตัวเลข (nurseBadge) นับงานรวม NURSE_ADDED เฉพาะผู้ป่วยโซนจริง (badgeFromApi)
//   รัน --grep @SBH-2947-RETEST (TC-017 + บั๊กข้อ 1 / 3) แล้ว --grep @SBH-2947-BUBBLE (TC-022 + ปิด Visit) · เทส ZONE ยังตรวจ TC-017 แบบจุด (รุ่นเก่า)

const ISSUE: Record<number, string> = {};
for (let n = 1; n <= 26; n++) ISSUE[n] = `SBH-${3365 + n}`;
const pad = (n: number) => String(n).padStart(3, '0');
const TC = (n: number) => `TC-${pad(n)} (${ISSUE[n]})`;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const tagsOf = (group: string, tcs: number[]) => ({
  tag: ['@SBH-2947', `@SBH-2947-${group}`, ...tcs.map((n) => `@${ISSUE[n]}`)],
  annotation: [linear('SBH-2947'), ...tcs.map((n) => linear(ISSUE[n]))],
});
const RESUS = 'Resuscitation';
const URGENCY = 'Urgency';
const ISO1 = 'Isolation 1';
const ISO2 = 'Isolation 2';
const OBS = 'Observation';
const STATE_FILE = path.join(__dirname, '..', '..', '..', '.cache', 'sbh2947-visits.json');

// ---------- ผู้ป่วยที่เปิด Visit ในชุดนี้ (ปิดที่การเงินท้ายเทส 5) ----------
function rememberVisit(label: string, v: ErVisit) {
  const all = readVisits();
  all.push({ label, hn: v.hn, vn: v.vn, en: v.en, at: new Date().toISOString() });
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(all, null, 1));
}
function readVisits(): (ErVisit & { label: string; at: string })[] {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// ---------- หน้า รายการงานพยาบาล (หน้าต่าง Nurse) ----------

const mainOf = (p: Page) => p.getByRole('main');
const searchBox = (p: Page) => mainOf(p).getByPlaceholder('HN / ชื่อ-นามสกุล');
const sidebar = (p: Page) => mainOf(p).locator('[class*="_sidebar_"]').filter({ has: p.locator('input[placeholder="HN / ชื่อ-นามสกุล"]') }).last();
const patientBtn = (p: Page, hn: string) => sidebar(p).getByRole('button', { name: new RegExp(`HN ${hn}\\s`) }).first();
const zoneItems = (p: Page) => sidebar(p).locator('.ant-collapse-item');
const zoneItemOf = (p: Page, hn: string) => zoneItems(p).filter({ has: p.getByRole('button', { name: new RegExp(`HN ${hn}\\s`) }) }).first();
const zoneHeaderOf = (p: Page, hn: string) => zoneItemOf(p, hn).locator('.ant-collapse-header').first();
const zoneRe = (zone: string) => new RegExp(`^\\s*(zone:\\s*)?${zone}(\\s*\\(|\\s*$)`);
const zoneHeader = (p: Page, zone: string) => sidebar(p).locator('.ant-collapse-header').filter({ hasText: zoneRe(zone) }).first();
const sidebarEmpty = (p: Page) => sidebar(p).getByText('ไม่พบผู้ป่วย', { exact: true });
const withoutOrders = (p: Page) => mainOf(p).getByRole('switch').first();
const taskRows = (p: Page) => mainOf(p).locator('[class*="_data-row_"]');
const refreshBtn = (p: Page) => mainOf(p).getByRole('button', { name: 'reload รีเฟรช' }).first();
const mcTag = (btn: Locator) => btn.locator('[class*="mc-tag"]');
const navToggle = (p: Page) => p.getByRole('button', { name: 'ขยายแถบนำทาง' }).first();
const nurseMenu = (p: Page) => p.locator('li[data-menu-id$="er/nurse-task-list"]').first();
const nurseDot = (p: Page) => nurseMenu(p).locator('.ant-badge-dot');
/** Bubble ของเมนู รายการงานพยาบาล รุ่นแก้ SBH-3843 (dev-x 4 พ.ย. 2026 index-DABLTrDz.js) = วงตัวเลข (.ant-badge-count) · รุ่นก่อนเป็นจุด (.ant-badge-dot) */
const nurseBadge = (p: Page) => nurseMenu(p).locator('.ant-badge-count, .ant-badge-dot');
const TASK_TYPES = 'SPECIMEN,MEDICATION,ACTIVITY,IMAGING,NURSE_ADDED';
const todayBkk = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
interface PendingEnc { hn: string; en: string; currentLocationId: number | null; locationName: string | null; taskTotalCount: number }
/**
 * ตัวเลข Bubble ที่ระบบควรแสดง — คำนวณแบบเดียวกับแอปรุ่นแก้ SBH-3843 (โค้ดเมนู: encounters ที่มีงาน PENDING ชนิด SPECIMEN / MEDICATION / ACTIVITY / IMAGING / NURSE_ADDED
 * รวม taskTotalCount เฉพาะผู้ป่วยที่อยู่โซนจริง — ไม่นับโซน Triage และผู้ป่วยไม่ทราบโซน)
 */
async function badgeFromApi(p: Page, auth: () => string) {
  const headers = { authorization: auth() };
  const z = (await (await p.request.get('/cortex-api/er/triage/zones', { headers })).json()) as { boardLocations?: { id: number; code: string }[]; zones?: { id: number; code: string }[] };
  const locs = z.boardLocations ?? z.zones ?? [];
  const triage = new Set(locs.filter((l) => /TRIAGE/i.test(l.code)).map((l) => l.id));
  const known = new Set(locs.map((l) => l.id));
  const enc = ((await (await p.request.get(`/cortex-api/er/nurse-tasks/encounters?date=${todayBkk()}&dateBasis=task&types=${TASK_TYPES}&statuses=PENDING`, { headers })).json()) as { data: PendingEnc[] }).data.filter((e) => e.taskTotalCount > 0);
  const isCounted = (e: PendingEnc) => e.currentLocationId !== null && known.has(e.currentLocationId) && !triage.has(e.currentLocationId);
  const counted = enc.filter(isCounted);
  const notCounted = enc.filter((e) => !isCounted(e));
  return { total: counted.reduce((s, e) => s + e.taskTotalCount, 0), counted, notCounted };
}
/** ข้อความที่ Bubble ควรแสดง (antd overflowCount 99) */
const badgeText = (total: number) => (total > 99 ? '99+' : String(total));
/** อ่าน Bubble ที่เมนู รายการงานพยาบาล (null = ไม่มี) */
async function readBadge(n: Page) {
  const b = nurseBadge(n).first();
  if (!(await b.count())) return null;
  return b.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { dot: e.classList.contains('ant-badge-dot'), title: e.getAttribute('title') ?? '', text: (e.textContent ?? '').trim(), bg: getComputedStyle(e).backgroundColor, w: Math.round(r.width), h: Math.round(r.height) };
  });
}
/** รอจน Bubble แสดงตัวเลขตรงกับที่คำนวณจาก API (แอปดึงใหม่ทุก 30 วิ) — คืนค่าสุดท้ายที่เห็น */
async function waitBadgeMatchesApi(n: Page, auth: () => string, timeout = 100_000) {
  let last = { api: await badgeFromApi(n, auth), seen: await readBadge(n) };
  const until = Date.now() + timeout;
  for (;;) {
    const want = last.api.total === 0 ? null : badgeText(last.api.total);
    const got = last.seen && !last.seen.dot ? last.seen.text : null;
    if (want === got || Date.now() > until) return last;
    await n.waitForTimeout(5_000);
    last = { api: await badgeFromApi(n, auth), seen: await readBadge(n) };
  }
}
const opdMenuTitle = (p: Page) => p.locator('.ant-menu-submenu-title').filter({ hasText: /^\s*ผู้ป่วยนอก/ }).first();
const isEncounters = (url: string) => /\/er\/nurse-tasks\/encounters\?/.test(url);
/** "zone: Urgency (3-4)" → "Urgency" */
const zoneName = (label: string) => label.replace(/^\s*zone:\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();

interface SidebarZone { label: string; patients: { name: string; count: string; hn: string; mc: boolean }[] }

async function openTaskList(n: Page) {
  const loaded = n.waitForResponse((r) => isEncounters(r.url()), { timeout: 90_000 });
  loaded.catch(() => undefined);
  await n.goto('/cortex/er/nurse-task-list');
  await expectOk(await loaded, 'รายชื่อผู้ป่วยของหน้ารายการงานพยาบาล');
  await expect(searchBox(n)).toBeVisible({ timeout: 60_000 });
  await n.mouse.move(960, 1000);
}

/** กด รีเฟรช บนแถบตัวกรอง → รอรายชื่อผู้ป่วยโหลดใหม่ (dev-x ตอบ 502 เป็นพักๆ → ลองใหม่ไม่เกิน 3 ครั้ง) */
async function refresh(n: Page) {
  for (let attempt = 1; ; attempt++) {
    const loaded = n.waitForResponse((r) => isEncounters(r.url()), { timeout: 30_000 });
    loaded.catch(() => undefined);
    await refreshBtn(n).click();
    const res = await loaded;
    if (res.ok() || attempt >= 3) {
      await expectOk(res, 'รีเฟรชรายชื่อผู้ป่วย');
      break;
    }
    console.log(`    รีเฟรชได้ ${res.status()} → ลองใหม่ (ครั้งที่ ${attempt + 1})`);
    await n.waitForTimeout(5_000);
  }
  await n.waitForTimeout(800);
}

async function clearSearch(n: Page) {
  if ((await searchBox(n).inputValue()) !== '') await searchBox(n).fill('');
}

/** กางทุกโซนแล้วอ่าน ป้ายโซน + ผู้ป่วยใต้โซน (เรียงตามที่แสดง) */
async function readSidebar(n: Page): Promise<SidebarZone[]> {
  const headers = sidebar(n).locator('.ant-collapse-header');
  for (let i = 0; i < (await headers.count()); i++) {
    if ((await headers.nth(i).getAttribute('aria-expanded')) === 'false') await headers.nth(i).click();
  }
  return zoneItems(n).evaluateAll((items) =>
    items.map((item) => ({
      label: (item.querySelector('.ant-collapse-header')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      patients: [...item.querySelectorAll('[class*="_patient-meta_"]')].map((meta) => {
        const row = meta.closest('[role="button"], button') ?? meta.parentElement!;
        return {
          name: (row.querySelector('[class*="_patient-name_"]')?.textContent ?? '').trim(),
          count: (row.querySelector('[class*="_task-count_"]')?.textContent ?? '').trim(),
          hn: (meta.textContent ?? '').match(/HN\s*(\d+)/)?.[1] ?? '',
          mc: !!row.querySelector('[class*="mc-tag"]'),
        };
      }),
    })),
  );
}

const zoneOf = (zones: SidebarZone[], hn: string) => zones.find((z) => z.patients.some((p) => p.hn === hn))?.label ?? '';
const describe = (zones: SidebarZone[]) => zones.map((z) => `${z.label}: ${z.patients.map((p) => `HN ${p.hn} ${p.count}${p.mc ? ' MC' : ''}`).join(', ') || '-'}`).join(' | ') || 'ไม่พบผู้ป่วย';

async function searchHn(n: Page, hn: string): Promise<boolean> {
  await searchBox(n).fill(hn);
  await expect(searchBox(n)).toHaveValue(hn);
  await n.waitForTimeout(600);
  return patientBtn(n, hn).isVisible();
}

/** รอจนผู้ป่วยขึ้น / หายจากรายชื่อ (กดรีเฟรชซ้ำ) — คืนผลสุดท้าย */
async function waitPresence(n: Page, hn: string, present: boolean, timeout = 60_000): Promise<boolean> {
  const until = Date.now() + timeout;
  for (;;) {
    await clearSearch(n);
    const now = await patientBtn(n, hn).isVisible();
    if (now === present || Date.now() > until) return now;
    await refresh(n);
  }
}

/** สีของหัวโซน: data-tone + พื้นหลัง + เส้นขอบซ้าย → ชื่อสีจาก hue ของเส้นขอบ */
async function zoneColors(n: Page, header: Locator) {
  const raw = await header.evaluate((h) => {
    const s = getComputedStyle(h);
    return { tone: h.querySelector('[data-tone]')?.getAttribute('data-tone') ?? '', bg: s.backgroundColor, border: s.borderLeftColor };
  });
  return { ...raw, name: colorName(raw.border), bgName: colorName(raw.bg) };
}
function colorName(rgb: string): string {
  const m = rgb.match(/(\d+(?:\.\d+)?)/g)?.map(Number);
  if (!m || m.length < 3 || (m.length > 3 && m[3] === 0)) return 'ไม่มีสี';
  const [r, g, b] = m.map((x) => x / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // พื้นหัวโซนเป็นสีอ่อน (แดง rgb(255,241,240) ห่างกัน ~0.059) → เกณฑ์เทา 0.03 (รอบ 2 ใช้ 0.06 แล้วจัดแดงอ่อนเป็นเทา)
  if (max - min < 0.03) return 'เทา / ขาว';
  let h = 0;
  if (max === r) h = (60 * ((g - b) / (max - min)) + 360) % 360;
  else if (max === g) h = 60 * ((b - r) / (max - min)) + 120;
  else h = 60 * ((r - g) / (max - min)) + 240;
  if (h < 15 || h >= 335) return 'แดง';
  if (h < 70) return 'เหลือง';
  if (h < 170) return 'เขียว';
  if (h < 260) return 'ฟ้า';
  return 'ม่วง';
}

/** หน้าต่างของ Nurse (x-nurse) ที่หน้ารายการงานพยาบาล — คลิปเริ่มหลังหน้าโหลดเสร็จ */
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

async function closeNurse(nurse: Page | undefined) {
  if (!nurse) return;
  await finishVideo(nurse).catch(() => undefined);
  await nurse.context().close().catch(() => undefined);
}

/** กางเมนูซ้าย (พับไว้ตั้งต้น) + กางกลุ่ม ห้องฉุกเฉิน ให้เห็นเมนู รายการงานพยาบาล */
async function openNav(n: Page) {
  if (!(await nurseMenu(n).isVisible().catch(() => false))) {
    if (await navToggle(n).isVisible().catch(() => false)) await navToggle(n).click();
    await n.waitForTimeout(800);
  }
  if (!(await nurseMenu(n).isVisible().catch(() => false))) {
    await n.locator('.ant-menu-submenu-title').filter({ hasText: 'ห้องฉุกเฉิน' }).first().click();
  }
  await expect(nurseMenu(n)).toBeVisible({ timeout: 15_000 });
  await n.waitForTimeout(600);
}
/** ปิดเมนูซ้าย (เปิดแบบลอยทับหน้า มีฉากหลังมืด) — กดฉากหลังนอกเมนู · รอบ 2 (31 ต.ค.) เมนูค้างบังปุ่มรีเฟรชของ TC-002 */
async function closeNav(n: Page) {
  for (let i = 0; i < 3 && (await nurseMenu(n).isVisible().catch(() => false)); i++) {
    const backdrop = n.locator('[class*="sider-backdrop"]').first();
    if (await backdrop.isVisible().catch(() => false)) await backdrop.click({ position: { x: 900, y: 600 } }).catch(() => undefined);
    else await n.mouse.click(1400, 700);
    await n.waitForTimeout(800);
  }
  await expect(nurseMenu(n), 'ต้องปิดเมนูซ้ายได้').toBeHidden({ timeout: 10_000 });
}

// ---------- หน้าต่าง Super_User ----------

/** เปิด One Day Order จนช่องค้นหาอยู่ต่อ 3 วินาที (หน้าที่เพิ่งโหลดเด้งกลับแท็บ Overview เองได้ — SBH-3158) */
async function openOneDayOrder(page: Page, timeout = 120_000) {
  const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  await expect(async () => {
    if (!(await search.isVisible())) await careMenu(page, 'One Day Order', mainOf(page).getByRole('heading', { name: 'Order', exact: true }));
    await expect(search).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3_000);
    await expect(search).toBeVisible({ timeout: 1_000 });
  }, 'เปิด One Day Order').toPass({ timeout });
}

interface Prep {
  label: string;
  level?: 1 | 2 | 3 | 4 | 5;
  vitals?: VitalSigns;
  zone?: string;
  fastTrack?: string;
  /** false = ไม่คัดกรอง (อยู่โซน Triage) */
  triage?: boolean;
  /** ภาพหลักฐานตอนคัดกรอง (ESI / Fast Track / โซน) */
  evidence?: string;
}

/** ผู้ป่วย AUTO ใหม่ → Visit ER → คัดกรอง (ESI / สัญญาณชีพ / Fast Track / โซน) → สั่ง Imaging */
async function preparePatient(page: Page, p: Prep, note: (t: string, d: string) => void): Promise<ErVisit> {
  await gotoErDashboard(page);
  const patient = newTestPatient(p.label);
  const visit = await registerAndOpenErVisit(page, patient);
  rememberVisit(p.label, visit);
  note(`ผู้ป่วย ${p.label}`, `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
  await expect(mainOf(page).getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  if (p.triage !== false) {
    const panel = erTriagePanel(page);
    await fillErTriageForm(page, { level: p.level ?? 3, vitals: p.vitals ?? VITALS_NORMAL });
    const marks = [filled(panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }), `ESI ${p.level ?? 3}`)];
    if (p.fastTrack) {
      const ft = panel.getByRole('combobox', { name: /Suspect Fast Track Type/ }).filter({ visible: true }).last();
      await ft.scrollIntoViewIfNeeded();
      await ft.selectOption({ label: p.fastTrack });
      await expect(ft.locator('option:checked')).toHaveText(p.fastTrack);
      marks.push(filled(ft, `Fast Track ${p.fastTrack}`));
    }
    if (p.zone) {
      const zoneButton = panel.locator('[class*="er-triage-zone-options"] button').filter({ hasText: new RegExp(`^\\s*${p.zone}`) }).last();
      await zoneButton.scrollIntoViewIfNeeded();
      if ((await zoneButton.getAttribute('aria-pressed')) !== 'true') await zoneButton.click();
      // โซน Observation ถามยืนยัน "เปลี่ยนเป็น workflow สังเกตอาการ?" (dev-x 31 ต.ค. 2026)
      const observe = page.getByRole('dialog').filter({ hasText: 'workflow สังเกตอาการ' });
      if (await observe.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false)) {
        await markEvidence(alerted(observe.getByText('เปลี่ยนเป็น workflow สังเกตอาการ?')), clicked(observe.getByRole('button', { name: 'ยืนยัน' })));
        if (p.evidence) await snapEvidence(page, `ก่อนกด — ยืนยัน workflow สังเกตอาการ (${p.label})`);
        await clearEvidenceMarks(page);
        await observe.getByRole('button', { name: 'ยืนยัน' }).click();
        await expect(observe).toBeHidden();
      }
      await expect(zoneButton, `ต้องเลือกโซน ${p.zone} ได้`).toHaveAttribute('aria-pressed', 'true');
      marks.push(filled(zoneButton, `โซน ${p.zone}`));
    }
    if (p.evidence) {
      await markEvidence(...marks, clicked(erTriageSaveButton(page)));
      await snapEvidence(page, p.evidence);
      await clearEvidenceMarks(page);
    }
    // บันทึกฟอร์มแล้วหน้าเว็บยิง "ส่งเข้าโซน" ตามหลัง — เปลี่ยนหน้าเร็วไปผู้ป่วยค้างโซน Triage (SBH-2618)
    const zoned = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
    await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
    await expectOk(await zoned, `ส่งผู้ป่วย ${p.label} เข้าโซน`);
    await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
  }
  return visit;
}

/** สั่ง Imaging ให้ผู้ป่วย (One Day Order) — คืนข้อความผล */
async function orderImaging(page: Page, visit: ErVisit, reload = false) {
  if (reload) await gotoVisit(page, visit);
  // รอบ 3 (31 ต.ค.): หลังคัดกรอง ESI 1 กดเมนู One Day Order แล้วแผงไม่เปลี่ยน 2 นาที — เปิดหน้าผู้ป่วยใหม่แล้วกดซ้ำได้ปกติ
  await openOneDayOrder(page, 60_000).catch(async () => {
    console.log(`    เปิด One Day Order ของ ${visit.hn} ไม่ขึ้น → เปิดหน้าผู้ป่วยใหม่แล้วลองอีกครั้ง`);
    await gotoVisit(page, visit);
    await openOneDayOrder(page);
  });
  await submitOrders(page, [SETTINGS.imagingCode]);
}

/** Disposition (Improved · With Approval · K30) → ลงนาม → (ถ้า discharge) รายการ ER แท็บ รอจำหน่าย → จำหน่าย */
async function signDispositionOf(page: Page, visit: ErVisit, who: string) {
  const main = mainOf(page);
  await gotoVisit(page, visit);
  await openCarePanel(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }));
  await startDisposition(page);
  await main.getByRole('radio', { name: 'Improved', exact: true }).check();
  await main.getByRole('radio', { name: 'With Approval', exact: true }).check();
  await chooseDispositionDiagnosis(page, 'K30');
  const { clinical, finding } = dispositionTextBoxes(page);
  await clinical.fill(`ทดสอบ SBH-2947 ผู้ป่วย ${who}`);
  await finding.fill(`ทดสอบ SBH-2947 ผู้ป่วย ${who}`);
  await markEvidence(clicked(page.getByTestId('er-disposition-finalize'), 'ลงนาม'));
  await snapEvidence(page, `ก่อนกด — ลงนาม Disposition ${who}`);
  await signDisposition(page);
  await markEvidence(alerted(page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว')));
  await snapEvidence(page, `หลังกด — ลงนาม Disposition ${who}`);
}

async function dischargeOf(page: Page, visit: ErVisit, who: string) {
  await gotoErPatientList(page);
  await filterErListByHn(page, visit.hn);
  await openErListTab(page, 'waiting-for-discharge');
  const row = erListRow(page, visit.en);
  await expect(row, `ผู้ป่วย ${who} ต้องอยู่แท็บ รอจำหน่าย`).toBeVisible({ timeout: 30_000 });
  const button = erDischargeButton(row);
  await markEvidence(expected(row, 'รอจำหน่าย'), clicked(button));
  await snapEvidence(page, `ก่อนกด — จำหน่าย ${who}`);
  await button.click();
  const confirm = erDischargeConfirm(page);
  await expect(confirm).toContainText('ยืนยันการจำหน่ายผู้ป่วยออกจาก ER หรือไม่');
  const discharged = graphqlMutation(page, 'DischargeEncounterStatus', 40_000);
  await confirm.getByRole('button', { name: 'จำหน่าย', exact: true }).click();
  const res = await discharged;
  await expectOk(res, `จำหน่ายผู้ป่วย ${who} ออกจาก ER`);
  const toast = page.getByText('ยืนยันการจำหน่ายผู้ป่วยออกจาก ER แล้ว');
  await expect(toast).toBeVisible();
  await markEvidence(alerted(toast));
  await snapEvidence(page, `หลังกด — จำหน่าย ${who}`);
}

/** Disposition เลือก รับไว้รักษาต่อIPD → บันทึกฉบับร่าง (TC-003 ขั้น 2) */
async function saveAdmitDisposition(page: Page, visit: ErVisit) {
  const main = mainOf(page);
  await gotoVisit(page, visit);
  await openCarePanel(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }));
  await startDisposition(page);
  await main.getByRole('radio', { name: 'Improved', exact: true }).check();
  const admit = main.getByRole('radio', { name: 'รับไว้รักษาต่อIPD', exact: true });
  await admit.check();
  await chooseDispositionDiagnosis(page, 'K30');
  const { clinical, finding } = dispositionTextBoxes(page);
  await clinical.fill('ทดสอบ SBH-2947 ผู้ป่วย C รับไว้รักษาต่อ IPD');
  await finding.fill('ทดสอบ SBH-2947 ผู้ป่วย C รับไว้รักษาต่อ IPD');
  await markEvidence(filled(admit.locator('xpath=ancestor::label[1]'), 'รับไว้รักษาต่อIPD'), clicked(page.getByTestId('er-disposition-save-draft'), 'Save'));
  await snapEvidence(page, 'ก่อนกด — Disposition Admit Save');
  await saveDispositionDraft(page);
  await clearEvidenceMarks(page);
}

/**
 * dropdown เตียงที่เปิดอยู่ → เลือกเตียงแรกที่ขึ้นว่า "ว่าง" (เลื่อนรายการแบบ virtual list ไล่หา) — คืนข้อความของตัวเลือก
 * รอบ 3 (31 ต.ค.): เลือกตัวแรก (SBH009 ไม่ว่าง) แล้วลงเตียงได้ "คำขอถูกปฏิเสธ กรุณาโหลดข้อมูลใหม่…" · หออายุรกรรม ชาย ว่าง SBH013 / 015 / 016 / 019
 */
async function pickFreeBed(page: Page): Promise<string> {
  const holder = page.locator('.ant-select-dropdown:visible .rc-virtual-list-holder').first();
  await expect(options(page).first()).toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 60; i++) {
    // ข้อความตัวเลือกเป็นหลาย element ติดกัน ("SBH013สามัญว่าง") → ดูจาก innerText ทีละตัว (รอบ 5 ใช้ regex ช่องว่างแล้วหาไม่เจอ)
    const texts = (await options(page).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    const idx = texts.findIndex((t) => /ว่าง/.test(t) && !/ไม่ว่าง/.test(t) && !/จองแล้ว/.test(t));
    if (idx >= 0) {
      const free = options(page).nth(idx);
      await free.click({ timeout: 4_000 }).catch(() => free.click({ force: true }));
      return texts[idx];
    }
    await holder.evaluate((e) => { e.scrollTop += 200; }).catch(() => undefined);
    await page.waitForTimeout(150);
  }
  throw new Error('ไม่พบเตียงที่ว่างในหอผู้ป่วยนี้');
}

/** Admit Order → ศูนย์จัดการเตียง สร้าง AN (เลือกเตียงที่ว่าง) → คืน AN + หอผู้ป่วย (แบบ SBH-2593) */
async function admitWithBed(page: Page, visit: ErVisit, auth: () => string, note: (t: string, d: string) => void, requested?: { ward: string }): Promise<{ an: string; ward: string; bed: string }> {
  const main = mainOf(page);
  // requested = ส่ง Admit Order ไปแล้ว (เทสบั๊กรอเตียงตรวจหน้าจอระหว่างขั้น) → ข้ามไปสร้าง AN
  let req = requested;
  if (!req) {
    await gotoVisit(page, visit);
    req = await createAdmitRequest(page, 'ทดสอบ SBH-2947');
  }
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
    // เตียงตอนสร้าง AN ใช้ตัวแรกแบบ SBH-2593 (รอบ 3 สร้าง AN ได้) — เตียงว่างจริงไปเลือกตอนลงเตียงที่ IPD
    // (รอบ 4 เลือก "ว่าง" ตัวแรกที่นี่ = TESTBED22 แล้วขึ้น "คำขอเดิมยังรอยืนยันผล")
    if (current && current !== 'เลือก') {
      picked.push(current);
      continue;
    }
    await sel.click();
    const option = options(page).first();
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
    await page.waitForTimeout(800);
    picked.push((await sel.innerText()).trim());
  }
  const submit = main.getByRole('button', { name: 'check ส่งข้อมูล' });
  await expect(submit, 'เลือกเตียง / ประเภทการรับ / รับ Admit จาก แล้วปุ่ม ส่งข้อมูล ต้องกดได้').toBeEnabled();
  await markEvidence(filled(main.getByText(/^เลขเตียง :/).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]'), 'เตียง'), clicked(submit));
  await snapEvidence(page, 'ก่อนกด — สร้าง AN เลือกเตียง');
  await submit.click();
  const dialog = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
  if (await dialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false)) await dialog.getByRole('button', { name: /ยืนยัน/ }).first().click();
  // รอบ 4: ขึ้นแถบ "คำขอเดิมยังรอยืนยันผล กรุณาลองส่งคำขอเดิมอีกครั้ง" → กดปุ่มส่งซ้ำ · ยืนยันผลจาก API (an ของ Encounter) แทนแจ้งเตือน
  const retry = main.getByRole('button', { name: /ลองส่งคำขอเดิมอีกครั้ง/ });
  let an = '';
  let retried = 0;
  await expect.poll(async () => {
    if (await retry.isVisible().catch(() => false)) {
      retried++;
      await retry.click().catch(() => undefined);
    }
    const r = await page.request.get(`/cortex-api/er/encounters/${visit.en}`, { headers: { authorization: auth() } });
    an = ((await r.json()) as { an: string | null }).an ?? '';
    return an;
  }, { timeout: 120_000, intervals: [3_000], message: 'Encounter ER ต้องได้ AN หลังสร้าง AN' }).not.toBe('');
  const saved = page.getByText(new RegExp(`AN ${an}`)).first();
  if (await saved.isVisible().catch(() => false)) await markEvidence(alerted(saved));
  await snapEvidence(page, `หลังกด — สร้าง AN ${an}`);
  if (retried) note('Admit', `กดส่งคำขอสร้าง AN ซ้ำ ${retried} ครั้ง (แถบ คำขอเดิมยังรอยืนยันผล)`);
  note('Admit', `Admit Order (${req.ward}) → ศูนย์จัดการเตียง สร้าง AN ${an} · เตียง ${picked[0]} · ${picked.slice(1).join(' / ')}`);
  return { an, ward: req.ward, bed: picked[0] };
}

/** IPD: เลือกหอ → รายการเตียง แท็บ ผู้ป่วยเตรียมเข้า → เพิ่มผู้ป่วยลงเตียง (แพทย์เจ้าของไข้ / เบอร์โทร / ผู้ติดต่อฉุกเฉิน) → ยืนยัน */
async function putToBed(page: Page, visit: ErVisit, ward: string, note: (t: string, d: string) => void) {
  const main = mainOf(page);
  await page.goto('/cortex/ipd/select-ward');
  await main.locator('.ant-select').first().click();
  const wardOpt = options(page).filter({ hasText: ward }).first();
  await expect(options(page).first()).toBeVisible({ timeout: 30_000 });
  await ((await wardOpt.count()) ? wardOpt : options(page).first()).click();
  await main.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/ipd\/bed-list/, { timeout: 60_000 });
  await page.goto('/cortex/ipd/bed-list?tab=waiting-list');
  const clear = main.getByRole('button', { name: /ล้างตัวกรอง/ });
  await expect(clear).toBeVisible({ timeout: 60_000 });
  await clear.click();
  const card = main.locator('div').filter({ hasText: `HN ${visit.hn}` }).filter({ has: page.getByRole('button', { name: 'เพิ่มผู้ป่วยลงเตียง' }) }).last();
  await expect(card, `ผู้ป่วย C (HN ${visit.hn}) ต้องอยู่ในแท็บ ผู้ป่วยเตรียมเข้า`).toBeVisible({ timeout: 60_000 });
  await card.scrollIntoViewIfNeeded();
  const add = card.getByRole('button', { name: 'เพิ่มผู้ป่วยลงเตียง' });
  await markEvidence(expected(card, 'ผู้ป่วย C'), clicked(add));
  await snapEvidence(page, 'ก่อนกด — เพิ่มผู้ป่วยลงเตียง');
  await clearEvidenceMarks(page);
  await add.click();
  const dlg = page.locator('.ant-modal:visible').filter({ hasText: 'จัดการข้อมูลผู้ป่วย' }).first();
  await expect(dlg).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1_500);
  const selectAfter = (label: RegExp) => dlg.getByText(label).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
  const confirm = dlg.getByRole('button', { name: 'ยืนยัน' });
  const reload = dlg.getByRole('button', { name: /โหลดใหม่และตรวจสอบ/ });
  let bed = '';
  // รอบ 3: เตียงที่ติดมาจากตอนสร้าง AN (SBH009 ไม่ว่าง) → "คำขอถูกปฏิเสธ กรุณาโหลดข้อมูลใหม่…" → เลือกเตียงที่ว่าง · ถูกปฏิเสธอีกให้กดโหลดใหม่แล้วกรอกซ้ำ (ไม่เกิน 2 รอบ)
  for (let attempt = 1; ; attempt++) {
    await expect(selectAfter(/เตียง :/)).toBeVisible({ timeout: 30_000 });
    await selectAfter(/เตียง :/).click();
    bed = await pickFreeBed(page);
    await page.waitForTimeout(800);
    const doctor = selectAfter(/แพทย์เจ้าของไข้/);
    if (/^\s*เลือก\s*$/.test(await doctor.innerText())) {
      await doctor.click();
      await expect(options(page).first()).toBeVisible({ timeout: 15_000 });
      await options(page).first().click();
    }
    const phone = dlg.getByPlaceholder(/0900000000/).first();
    if (!(await phone.inputValue())) await phone.fill('0812345678');
    const contact = dlg.getByPlaceholder(/คำนำหน้า/).first();
    if (!(await contact.inputValue())) await contact.fill('นาย ทดสอบ ญาติ, บุตร, 0812345679');
    await markEvidence(filled(selectAfter(/เตียง :/), 'เตียงว่าง'), filled(doctor, 'แพทย์เจ้าของไข้'), filled(phone), filled(contact), clicked(confirm));
    await snapEvidence(page, `ก่อนกด — ยืนยันลงเตียง ${attempt}`);
    await clearEvidenceMarks(page);
    await confirm.click();
    const closed = await dlg.waitFor({ state: 'hidden', timeout: 30_000 }).then(() => true, () => false);
    if (closed) break;
    const msg = (await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);
    note(`ลงเตียง ครั้งที่ ${attempt}`, `หน้าต่างไม่ปิด: ${msg}`);
    await snapEvidence(page, `ลงเตียงไม่สำเร็จ ${attempt}`);
    if (attempt >= 4) throw new Error(`ลงเตียงไม่สำเร็จ: ${msg}`);
    // รอบ 6: ถูกปฏิเสธเมื่อทำทันทีหลังสร้าง AN (ระบบยังประมวลผล AN) — ลองใน REPL หลังผ่านไปหลายนาทีสำเร็จ → ปิดหน้าต่าง รอ 30 วิ เปิดใหม่
    await dlg.getByRole('button', { name: 'ยกเลิก' }).click().catch(() => page.keyboard.press('Escape'));
    await page.waitForTimeout(30_000);
    await page.reload();
    await expect(clear).toBeVisible({ timeout: 60_000 });
    await clear.click();
    await expect(card).toBeVisible({ timeout: 60_000 });
    await card.getByRole('button', { name: 'เพิ่มผู้ป่วยลงเตียง' }).click();
    await expect(dlg).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2_500);
  }
  await snapEvidence(page, 'หลังกด — ยืนยันลงเตียง');
  note('ลงเตียง', `IPD ${ward} · ${bed}`);
  return bed;
}

/** ยกเลิก Encounter จากช่องสถานะมุมขวาบนของหน้าผู้ป่วย (วิธีเดียวกับ UAT-ER-10) */
async function cancelEncounter(page: Page, visit: ErVisit) {
  await gotoVisit(page, visit);
  const status = mainOf(page).locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
  await expect(status).toBeVisible({ timeout: 60_000 });
  await markEvidence(clicked(status, 'สถานะ'));
  await snapEvidence(page, 'ก่อนกด — ช่องสถานะ');
  await clearEvidenceMarks(page);
  await status.click();
  await options(page).filter({ hasText: /^ยกเลิก$/ }).click();
  const dialog = page.getByRole('dialog', { name: /ต้องการยกเลิก/ });
  await expect(dialog).toContainText(visit.en);
  // เหตุผลเกิน 30 ตัวอักษร → ERROR value too long for type character varying(30) แม้ช่องให้พิมพ์ได้ 80 (รอบ 3 · 31 ต.ค.)
  await dialog.getByRole('textbox', { name: 'ระบุเหตุผลการยกเลิก' }).fill('ทดสอบ SBH-2947');
  const confirm = dialog.getByRole('button', { name: 'ยืนยัน' });
  await markEvidence(filled(dialog.getByRole('textbox', { name: 'ระบุเหตุผลการยกเลิก' })), clicked(confirm));
  await snapEvidence(page, 'ก่อนกด — ยืนยันยกเลิก Encounter');
  const cancelled = page.waitForResponse((r) => r.request().method() === 'POST' && /\/cortex-api\/graphql/.test(r.url()) && /cancel/i.test(r.request().postData() ?? ''), { timeout: 40_000 });
  await confirm.click();
  await expectOk(await cancelled, `ยกเลิก Encounter ${visit.en}`);
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await snapEvidence(page, 'หลังกด — ยกเลิก Encounter');
}

// ---------- เช็คในหน้าต่าง Nurse ที่ใช้ซ้ำ ----------

/** TC 003–007: ขั้น 1 ค้น HN → พบ */
async function expectFound(n: Page, hn: string, who: string) {
  await expect.poll(async () => { await clearSearch(n); return patientBtn(n, hn).isVisible(); }, { timeout: 60_000, intervals: [3_000] }).toBe(true);
  const found = await searchHn(n, hn);
  await markEvidence(filled(searchBox(n), `HN ${who} ${hn}`), expected(patientBtn(n, hn), `พบ ${who}`));
  expect(found, `ค้น HN ของ ${who} ต้องพบก่อนเปลี่ยนสถานะ`).toBe(true);
}

/** TC 003–007: ขั้นสุดท้าย รีเฟรช → ค้น HN → ไม่พบ */
async function expectGone(n: Page, hn: string, who: string, note: (t: string, d: string) => void, tc: string) {
  await refresh(n);
  const still = await waitPresence(n, hn, false, 90_000);
  const all = await readSidebar(n);
  note(`${tc} รายชื่อหลังรีเฟรช`, describe(all));
  const found = await searchHn(n, hn);
  await markEvidence(clicked(refreshBtn(n), 'รีเฟรช'), filled(searchBox(n), `HN ${who} ${hn}`), expected(sidebarEmpty(n), `ไม่พบ ${who}`));
  expect(still, `${who} ต้องไม่อยู่ในรายชื่อ`).toBe(false);
  expect(found, `ค้น HN ของ ${who} ต้องไม่พบ`).toBe(false);
  await expect(sidebarEmpty(n)).toBeVisible();
}

test.describe('SBH-2947 ER รายการงานพยาบาล Improve (dev-x)', () => {
  test.describe.configure({ timeout: 3_600_000 });

  let nurse: Page | undefined;
  test.beforeEach(() => {
    nurse = undefined;
  });
  test.afterEach(async () => {
    await closeNurse(nurse);
  });

  // ======================= เทส 1: ชื่อ / สีโซน · Bubble · ปุ่ม · Nurse Note · ไม่มีโซน Triage =======================
  test(
    'โซน Triage ไม่แสดง · ชื่อและสีหัวโซนใหม่ · Bubble แดงที่เมนู · ปุ่ม รับ Order · ไม่มี MC ผู้ป่วยปกติ · เพิ่ม Nurse Note (TC 001 · 002 · 008–017 · 019 · 023)',
    tagsOf('ZONE', [1, 2, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 23]),
    async ({ page, browser }) => {
      const { note, soft, finish } = makeRunner(page);
      const authorization = trackAuthorization(page);

      // ---------- เตรียมผู้ป่วย (Super_User) ----------
      const A = await preparePatient(page, { label: 'Ntl2947A', level: 2, zone: RESUS, evidence: 'คัดกรอง A — ESI 2 โซน Resuscitation' }, note);
      await orderImaging(page, A);
      const Y = await preparePatient(page, { label: 'Ntl2947Y', level: 3, zone: URGENCY, evidence: 'คัดกรอง Y — ESI 3 โซน Urgency' }, note);
      await orderImaging(page, Y);
      const I1 = await preparePatient(page, { label: 'Ntl2947I1', level: 4, zone: ISO1, evidence: 'คัดกรอง I1 — โซน Isolation 1' }, note);
      await orderImaging(page, I1);
      const I2 = await preparePatient(page, { label: 'Ntl2947I2', level: 4, zone: ISO2, evidence: 'คัดกรอง I2 — โซน Isolation 2' }, note);
      await orderImaging(page, I2);
      const O = await preparePatient(page, { label: 'Ntl2947O', level: 5, zone: OBS, evidence: 'คัดกรอง O — ESI 5 โซน Observation' }, note);
      await orderImaging(page, O);
      const B = await preparePatient(page, { label: 'Ntl2947B', triage: false }, note);
      let bOrdered = false;
      await soft('เตรียม TC-002: สั่ง Imaging ให้ผู้ป่วย B ที่ยังไม่คัดกรอง (อยู่โซน Triage)', async () => {
        await orderImaging(page, B, true);
        bOrdered = true;
      });
      note('ผู้ป่วย B order', bOrdered ? `ส่งคำสั่ง ${SETTINGS.imagingCode} แล้ว (ยังไม่คัดกรอง)` : 'สั่งไม่สำเร็จ — ใช้สวิตช์ "แสดงผู้ป่วยที่ยังไม่มี Order" ช่วยตรวจ');

      const zones = await fetchZones(page, authorization);
      const board = await fetchBoard(page, authorization);
      const want: [string, ErVisit, string][] = [['A', A, RESUS], ['Y', Y, URGENCY], ['I1', I1, ISO1], ['I2', I2, ISO2], ['O', O, OBS], ['B', B, 'Triage']];
      for (const [k, v, z] of want) {
        const e = board.find((x) => x.en === v.en);
        note(`โซนบนบอร์ดหลังเตรียม ${k}`, e ? zones.get(e.currentLocationId ?? -1) ?? `location ${e.currentLocationId}` : 'ไม่อยู่บนบอร์ด');
        if (z !== 'Triage') expect(zones.get(e?.currentLocationId ?? -1), `Pre-condition: ${k} ต้องอยู่โซน ${z}`).toBe(z);
      }

      nurse = await openNurseWindow(browser);
      const n = nurse;
      const { note: nnote, soft: nsoft, finish: nfinish } = makeRunner(n);
      for (const v of [A, Y, I1, I2, O]) await expect.poll(async () => { await clearSearch(n); return patientBtn(n, v.hn).isVisible(); }, { timeout: 90_000, intervals: [5_000] }).toBe(true);
      const all = await readSidebar(n);
      nnote('รายชื่อทุกโซนตอนเริ่ม', describe(all));

      // ---------- TC-001 เพิ่ม Nurse Note ----------
      await startClip(n, 'TC-001');
      await nsoft(`${TC(1)} เลือกผู้ป่วย A → กด เพิ่ม Nurse note → ฟอร์ม Nurse Note เปิดสำเร็จ ไม่มี error`, async () => {
        await patientBtn(n, A.hn).click();
        await expect(mainOf(n).getByText(`HN ${A.hn}`, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
        const row = taskRows(n).first();
        await expect(row).toBeVisible({ timeout: 60_000 });
        const add = row.getByRole('button', { name: 'เพิ่ม Nurse note' });
        await markEvidence(expected(patientBtn(n, A.hn), 'ผู้ป่วย A'), clicked(add));
        await snapEvidence(n, 'ก่อนกด — เพิ่ม Nurse note');
        const ctx = n.waitForResponse((r) => /\/nursing-note-context\?/.test(r.url()), { timeout: 30_000 });
        await add.click();
        const res = await ctx;
        nnote(`${TC(1)} API nursing-note-context`, `${res.status()} ${new URL(res.url()).pathname}`);
        const modal = n.locator('.ant-modal:visible').filter({ hasText: 'Nurse Note' }).first();
        await expect(modal).toBeVisible({ timeout: 30_000 });
        await expect(modal).toContainText(`HN ${A.hn}`);
        await n.waitForTimeout(1_500);
        const errors = await n.locator('.ant-message-error, .ant-notification-notice-error, .ant-alert-error').allInnerTexts();
        nnote(`${TC(1)} ข้อความ error`, errors.join(' | ') || 'ไม่มี');
        await markEvidence(expected(modal.locator('.ant-modal-title'), 'Nurse Note เปิดสำเร็จ'), expected(modal.getByText(`HN ${A.hn}`, { exact: false }).first(), 'ผู้ป่วย A'));
        expect(res.ok(), 'API ของฟอร์ม Nurse Note ต้องตอบสำเร็จ').toBe(true);
        expect(errors, 'ต้องไม่มีข้อความ error').toEqual([]);
      });
      await n.locator('.ant-modal:visible').getByRole('button', { name: 'ยกเลิก' }).click().catch(() => undefined);

      // ---------- TC-019 ปุ่ม รับ Order ----------
      await startClip(n, 'TC-019');
      await nsoft(`${TC(19)} แถวงานที่ยังไม่รับของผู้ป่วย A แสดงปุ่ม รับ Order · ไม่มีปุ่ม รับงาน`, async () => {
        const row = taskRows(n).first();
        const accept = row.getByRole('button', { name: 'รับ Order', exact: true });
        await expect(row.locator('[data-label="สถานะ"]')).toContainText('รอรับงาน');
        const oldBtn = await mainOf(n).getByRole('button', { name: 'รับงาน', exact: true }).count();
        nnote(`${TC(19)} ปุ่มในแถว`, (await row.getByRole('button').allInnerTexts()).join(' / '));
        await showCompareTable(n, 'ปุ่มของแถวงานที่ยังไม่รับ', ['ที่เห็น'], [
          { label: 'ปุ่ม รับ Order', values: [(await accept.count()) ? 'มี' : 'ไม่มี'], same: (await accept.count()) > 0 },
          { label: 'ปุ่ม รับงาน', values: [`${oldBtn} ปุ่ม`], same: oldBtn === 0 },
        ], { side: 'bottom' });
        await markEvidence(expected(accept, 'รับ Order'));
        await expect(accept).toBeVisible();
        expect(oldBtn, 'ต้องไม่มีปุ่ม รับงาน').toBe(0);
      });
      await hideCompareTable(n).catch(() => undefined);

      // ---------- TC-023 ผู้ป่วยปกติไม่มี MC ----------
      await startClip(n, 'TC-023');
      await nsoft(`${TC(23)} ค้น HN ผู้ป่วย A (คัดกรองปกติ) — ชื่อไม่มีป้าย MC`, async () => {
        await searchHn(n, A.hn);
        const tags = await mcTag(patientBtn(n, A.hn)).count();
        await markEvidence(filled(searchBox(n), `HN A ${A.hn}`), expected(patientBtn(n, A.hn), 'ไม่มีป้าย MC'));
        expect(tags, 'ผู้ป่วย A ต้องไม่มีป้าย MC').toBe(0);
      });
      await clearSearch(n);

      // ---------- TC-008–012 ชื่อโซน ----------
      const nameTcs: [number, string, ErVisit, string, string][] = [
        [8, 'A', A, RESUS, 'โซนแดง'],
        [9, 'Y', Y, URGENCY, 'โซนเหลือง'],
        [10, 'I1', I1, ISO1, 'โซนเขียว'],
        [11, 'I2', I2, ISO2, 'โซนเขียว'],
        [12, 'O', O, OBS, 'ห้องสังเกตอาการ'],
      ];
      for (const [no, who, v, zone, old] of nameTcs) {
        await startClip(n, `TC-${pad(no)}`);
        await nsoft(`${TC(no)} ผู้ป่วย ${who} อยู่ใต้หัวกลุ่ม ${zone} · ไม่มีคำว่า ${old}`, async () => {
          await clearSearch(n);
          const zonesNow = await readSidebar(n);
          const label = zoneOf(zonesNow, v.hn);
          const labels = zonesNow.map((z) => z.label);
          const oldHit = labels.filter((l) => l.includes(old));
          nnote(`${TC(no)} หัวกลุ่มทั้งหมด`, labels.join(' · '));
          await patientBtn(n, v.hn).scrollIntoViewIfNeeded();
          await showCompareTable(n, `หัวกลุ่มของผู้ป่วย ${who}`, ['ที่เห็น', 'ที่ต้องเป็น'], [
            { label: `หัวกลุ่มของ ${who}`, values: [label || '-', zone], same: zoneName(label) === zone },
            { label: `หัวกลุ่มที่มีคำว่า ${old}`, values: [oldHit.join(', ') || 'ไม่มี', 'ไม่มี'], same: oldHit.length === 0 },
          ], { side: 'bottom' });
          await markEvidence(expected(zoneHeaderOf(n, v.hn), zone), expected(patientBtn(n, v.hn), `ผู้ป่วย ${who}`));
          expect(zoneName(label), `${who} ต้องอยู่ใต้หัวกลุ่ม ${zone}`).toBe(zone);
          expect(oldHit, `ต้องไม่มีหัวกลุ่ม ${old}`).toEqual([]);
        });
        await hideCompareTable(n).catch(() => undefined);
      }

      // ---------- TC-013–016 สีหัวโซน ----------
      const colorTcs: [number, string[], string][] = [
        [13, [RESUS], 'แดง'],
        [14, [URGENCY], 'เหลือง'],
        [15, [ISO1, ISO2], 'เขียว'],
        [16, [OBS], 'ฟ้า'],
      ];
      for (const [no, zs, color] of colorTcs) {
        await startClip(n, `TC-${pad(no)}`);
        await nsoft(`${TC(no)} Header Zone ${zs.join(' และ ')} เป็นสี${color}`, async () => {
          await clearSearch(n);
          await readSidebar(n);
          const rows: CompareRow[] = [];
          const marks = [];
          for (const z of zs) {
            const header = zoneHeader(n, z);
            await expect(header, `ต้องมีหัวโซน ${z}`).toBeVisible();
            const c = await zoneColors(n, header);
            nnote(`${TC(no)} สี ${z}`, `data-tone ${c.tone} · พื้น ${c.bg} (${c.bgName}) · เส้นขอบซ้าย ${c.border} (${c.name})`);
            rows.push({ label: z, values: [c.tone, `${c.bgName} ${c.bg}`, `${c.name} ${c.border}`], same: c.name === color && c.bgName === color });
            marks.push(expected(header, `สี${color}`));
          }
          await zoneHeader(n, zs[0]).scrollIntoViewIfNeeded();
          await showCompareTable(n, `สีหัวโซน (ต้องเป็นสี${color})`, ['data-tone', 'พื้นหลัง', 'เส้นขอบซ้าย'], rows, { side: 'bottom' });
          await markEvidence(...marks);
          expect(rows.every((r) => r.same), `หัวโซน ${zs.join(' / ')} ต้องเป็นสี${color}`).toBe(true);
        });
        await hideCompareTable(n).catch(() => undefined);
      }

      // ---------- TC-017 Bubble แดงที่เมนู ----------
      await startClip(n, 'TC-017');
      await nsoft(`${TC(17)} เมนู รายการงานพยาบาล แสดง Bubble แดง (มี Order ที่ยังไม่รับ)`, async () => {
        const auth = trackAuthorization(n);
        await refresh(n);
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
        const sum = await (await n.request.get(`/cortex-api/er/nurse-tasks/summary?date=${today}&dateBasis=task&types=SPECIMEN,MEDICATION,ACTIVITY,IMAGING`, { headers: { authorization: auth() } })).json() as { pending: number };
        await openNav(n);
        const dot = nurseDot(n);
        await expect(dot, 'เมนู รายการงานพยาบาล ต้องมี Bubble').toBeVisible({ timeout: 30_000 });
        const info = await dot.evaluate((e) => ({ title: e.getAttribute('title'), bg: getComputedStyle(e).backgroundColor, w: e.getBoundingClientRect().width, text: e.textContent }));
        const opd = opdMenuTitle(n).locator('.ant-badge-count').first();
        const opdInfo = (await opd.count()) ? await opd.evaluate((e) => ({ text: e.textContent, bg: getComputedStyle(e).backgroundColor })) : null;
        nnote(`${TC(17)} Bubble`, `จุด ${Math.round(info.w)}px สี ${info.bg} (${colorName(info.bg)}) · title ${info.title} · ข้อความ "${info.text}" · งานรอรับทั้ง ER (API summary) ${sum.pending} · Bubble ของ ผู้ป่วยนอก: ${opdInfo ? `"${opdInfo.text}" สี ${opdInfo.bg}` : 'ไม่มี'}`);
        await showCompareTable(n, 'Bubble ของเมนู', ['ที่เห็น'], [
          { label: 'Bubble ที่ รายการงานพยาบาล', values: [`จุดสี${colorName(info.bg)} (ไม่มีตัวเลข · title ${info.title})`], same: colorName(info.bg) === 'แดง' },
          { label: 'งานรอรับทั้ง ER (API)', values: [`${sum.pending} งาน`], same: sum.pending > 0 },
          { label: 'Bubble ที่ ผู้ป่วยนอก', values: [opdInfo ? `ตัวเลข "${opdInfo.text}" สี${colorName(opdInfo.bg)}` : 'ไม่มี'], same: true },
        ], { side: 'right', width: '560px' });
        const marks = [expected(nurseMenu(n), 'Bubble แดง')];
        if (opdInfo) marks.push(expected(opdMenuTitle(n), 'เทียบ ผู้ป่วยนอก'));
        await markEvidence(...marks);
        expect(colorName(info.bg), 'Bubble ต้องเป็นสีแดง').toBe('แดง');
      });
      await hideCompareTable(n).catch(() => undefined);
      await closeNav(n);

      // ---------- TC-002 ไม่แสดงโซน Triage ----------
      await startClip(n, 'TC-002');
      await nsoft(`${TC(2)} Left Panel ไม่มีกลุ่ม Triage / คัดกรอง · ค้น HN ผู้ป่วย B (ยังไม่คัดกรอง) ไม่พบ`, async () => {
        await refresh(n);
        await clearSearch(n);
        const zonesNow = await readSidebar(n);
        const labels = zonesNow.map((z) => z.label);
        const triageGroups = labels.filter((l) => /triage|คัดกรอง/i.test(l));
        nnote(`${TC(2)} หัวกลุ่มทั้งหมด`, labels.join(' · '));
        const tasksB = await (await page.request.get(`/cortex-api/er/nurse-tasks?en=${B.en}`, { headers: { authorization: authorization() } })).json() as { data: { type: string; name: string; status: string }[] };
        nnote(`${TC(2)} งานพยาบาลของ B (API)`, tasksB.data.map((t) => `${t.type} ${t.name} ${t.status}`).join(' · ') || 'ไม่มี');
        await markEvidence(expected(sidebar(n), 'ไม่มีกลุ่ม Triage'));
        await snapEvidence(n, 'หัวกลุ่มทุกกลุ่ม — ไม่มีกลุ่ม Triage');
        await clearEvidenceMarks(n);
        const found = await searchHn(n, B.hn);
        await showCompareTable(n, 'ผู้ป่วย B (ยังไม่คัดกรอง)', ['ที่เห็น'], [
          { label: 'กลุ่ม Triage / คัดกรอง', values: [triageGroups.join(', ') || 'ไม่มี'], same: triageGroups.length === 0 },
          { label: 'งานพยาบาลของ B (API)', values: [`${tasksB.data.length} งาน`], same: true },
          { label: 'ค้น HN B', values: [found ? 'พบ' : 'ไม่พบ'], same: !found },
        ], { side: 'bottom' });
        await markEvidence(filled(searchBox(n), `HN B ${B.hn}`), expected(sidebarEmpty(n), 'ไม่พบ B'));
        expect(triageGroups, 'ต้องไม่มีกลุ่ม Triage / คัดกรอง').toEqual([]);
        expect(found, 'ค้น HN ผู้ป่วย B ต้องไม่พบ').toBe(false);
      });
      await hideCompareTable(n).catch(() => undefined);
      // ตรวจเพิ่ม: เปิดสวิตช์ "แสดงผู้ป่วยที่ยังไม่มี Order" แล้ว B ก็ยังไม่ขึ้น (โซน Triage ถูกตัดไม่ว่ามี Order หรือไม่)
      await nsoft(`${TC(2)} (ตรวจเพิ่ม) เปิดสวิตช์ แสดงผู้ป่วยที่ยังไม่มี Order — ค้น HN B ยังไม่พบ`, async () => {
        const sw = withoutOrders(n);
        await sw.click();
        await expect(sw).toHaveAttribute('aria-checked', 'true');
        await n.waitForTimeout(2_000);
        const found = await searchHn(n, B.hn);
        await markEvidence(expected(sw, 'เปิด'), filled(searchBox(n), `HN B ${B.hn}`), expected(sidebarEmpty(n), 'ไม่พบ B'));
        await snapEvidence(n, 'เปิดสวิตช์ — ค้นหาผู้ป่วย B');
        await clearSearch(n);
        await sw.click();
        await expect(sw).toHaveAttribute('aria-checked', 'false');
        expect(found, 'เปิดสวิตช์แล้ว B (โซน Triage) ต้องยังไม่แสดง').toBe(false);
      });
      await clearSearch(n);

      await holdForClip(n);
      let nurseFailed: unknown;
      try {
        nfinish();
      } catch (error) {
        nurseFailed = error;
      }
      finish();
      if (nurseFailed) throw nurseFailed;
    },
  );

  // ======================= เทส 2: เรียงผู้ป่วย Fast Track → ESI → MEWS → FIFO =======================
  test(
    'เรียงผู้ป่วยในโซน Resuscitation: Fast Track บนสุด (FIFO) → ESI น้อยไปมาก → MEWS มากไปน้อย → FIFO (TC 020 · 021 · 024 · 025 · 026)',
    tagsOf('SORT', [20, 21, 24, 25, 26]),
    async ({ page, browser }) => {
      const { note, finish } = makeRunner(page);
      const authorization = trackAuthorization(page);
      const plan: [string, Prep][] = [
        ['P1', { label: 'Srt2947P1', level: 2, zone: RESUS, evidence: 'คัดกรอง P1 — ESI 2 สัญญาณชีพปกติ' }],
        ['P2', { label: 'Srt2947P2', level: 2, zone: RESUS, evidence: 'คัดกรอง P2 — ESI 2 สัญญาณชีพปกติ' }],
        ['P3', { label: 'Srt2947P3', level: 1, zone: RESUS, evidence: 'คัดกรอง P3 — ESI 1 ไม่ Fast Track' }],
        ['P4', { label: 'Srt2947P4', level: 2, zone: RESUS, vitals: VITALS_HIGH_MEWS, evidence: 'คัดกรอง P4 — ESI 2 MEWS สูง' }],
        ['P5', { label: 'Srt2947P5', level: 2, zone: RESUS, fastTrack: 'STEMI', evidence: 'คัดกรอง P5 — ESI 2 Fast Track STEMI' }],
        ['P6', { label: 'Srt2947P6', level: 2, zone: RESUS, fastTrack: 'STEMI', evidence: 'คัดกรอง P6 — ESI 2 Fast Track STEMI' }],
      ];
      const P: Record<string, ErVisit> = {};
      for (const [k, prep] of plan) {
        P[k] = await preparePatient(page, prep, note);
        await orderImaging(page, P[k]);
      }
      const hnKey = new Map(Object.entries(P).map(([k, v]) => [v.hn, k]));

      // ค่าที่ใช้เรียง (บอร์ด ER + API รายการงานพยาบาล)
      interface Facts { key: string; hn: string; esi: number | null; ft: string; mews: number | null; risk: string; arrived: string }
      const facts = async (): Promise<Facts[]> => {
        const boardRes = await page.request.get('/cortex-api/er/dashboard/encounters?scope=current_queue', { headers: { authorization: authorization() } });
        const board = (await boardRes.json()) as { en: string; hn: string; triageLevel: number | null; arrivedAt: string; clinicalDetails?: { fastTrackStatus?: string; mews?: { score?: number } | null } }[];
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
        const ntRes = await page.request.get(`/cortex-api/er/nurse-tasks/encounters?date=${today}&dateBasis=task&shift=ALL_DAY`, { headers: { authorization: authorization() } });
        const roster = ((await ntRes.json()) as { data: { en: string; mewsRisk: string | null; fastTrack: boolean }[] }).data;
        return Object.entries(P).map(([key, v]) => {
          const b = board.find((x) => x.en === v.en);
          const r = roster.find((x) => x.en === v.en);
          return { key, hn: v.hn, esi: b?.triageLevel ?? null, ft: `${b?.clinicalDetails?.fastTrackStatus ?? '-'} / ${r?.fastTrack ?? '-'}`, mews: b?.clinicalDetails?.mews?.score ?? null, risk: r?.mewsRisk ?? '-', arrived: b?.arrivedAt ?? '-' };
        });
      };
      const f0 = await facts();
      for (const f of f0) note(`ค่าที่ใช้เรียง ${f.key}`, `HN ${f.hn} · ESI ${f.esi} · Fast Track (บอร์ด / API) ${f.ft} · MEWS ${f.mews} (${f.risk}) · มาถึง ${f.arrived}`);
      const by = (k: string) => f0.find((f) => f.key === k)!;
      expect(by('P4').mews ?? 0, 'Pre-condition: MEWS ของ P4 ต้องสูงกว่า P1').toBeGreaterThan(by('P1').mews ?? 0);
      expect(by('P1').mews, 'Pre-condition: MEWS ของ P1 ต้องเท่ากับ P2').toBe(by('P2').mews);

      nurse = await openNurseWindow(browser);
      const n = nurse;
      const { note: nnote, soft: nsoft, finish: nfinish } = makeRunner(n);
      for (const v of Object.values(P)) await expect.poll(async () => { await clearSearch(n); return patientBtn(n, v.hn).isVisible(); }, { timeout: 90_000, intervals: [5_000] }).toBe(true);
      await refresh(n);
      const zonesNow = await readSidebar(n);
      const resus = zonesNow.find((z) => zoneName(z.label) === RESUS);
      const order = (resus?.patients ?? []).map((p) => p.hn);
      nnote('ลำดับในโซน Resuscitation', (resus?.patients ?? []).map((p, i) => `${i + 1}. HN ${p.hn}${hnKey.has(p.hn) ? ` (${hnKey.get(p.hn)})` : ''}`).join(' · '));
      const pos = (k: string) => order.indexOf(P[k].hn);
      const rowFor = (k: string): CompareRow => {
        const f = by(k);
        return { label: `${k} ลำดับ ${pos(k) + 1}`, values: [`ESI ${f.esi}`, f.ft.startsWith('suspected') ? 'Fast Track' : '-', `${f.mews ?? '-'} (${f.risk})`, new Date(f.arrived).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })], same: true };
      };

      const pair = async (no: number, upper: string, lower: string, why: string) => {
        await startClip(n, `TC-${pad(no)}`);
        await nsoft(`${TC(no)} ${upper} อยู่เหนือ ${lower} — ${why}`, async () => {
          await clearSearch(n);
          await patientBtn(n, P[upper].hn).scrollIntoViewIfNeeded();
          const rows = [rowFor(upper), rowFor(lower)].map((r, i) => ({ ...r, same: i === 0 ? pos(upper) < pos(lower) && pos(upper) >= 0 : pos(lower) > pos(upper) }));
          await showCompareTable(n, `${TC(no)} ${why}`, ['ESI', 'Fast Track', 'MEWS', 'มาถึง'], rows, { side: 'right', width: '640px' });
          await markEvidence(expected(zoneHeader(n, RESUS), RESUS), expected(patientBtn(n, P[upper].hn), `${upper} อยู่บน`), expected(patientBtn(n, P[lower].hn), `${lower} อยู่ล่าง`));
          expect(pos(upper), `${upper} ต้องอยู่ในโซน Resuscitation`).toBeGreaterThanOrEqual(0);
          expect(pos(lower), `${lower} ต้องอยู่ในโซน Resuscitation`).toBeGreaterThanOrEqual(0);
          expect(pos(upper), `${upper} ต้องอยู่เหนือ ${lower}`).toBeLessThan(pos(lower));
        });
        await hideCompareTable(n).catch(() => undefined);
      };
      await pair(20, 'P5', 'P3', 'Fast Track (ESI 2) ชนะ ESI 1 ที่มาก่อน');
      await pair(21, 'P3', 'P1', 'ESI 1 อยู่เหนือ ESI 2 แม้มาทีหลัง');
      await pair(24, 'P5', 'P6', 'Fast Track ทั้งคู่ → FIFO');
      await pair(25, 'P4', 'P1', 'ESI 2 เท่ากัน → MEWS สูงกว่าอยู่บน แม้มาทีหลัง');
      await pair(26, 'P1', 'P2', 'ESI 2 + MEWS เท่ากัน → FIFO');

      await holdForClip(n);
      let nurseFailed: unknown;
      try {
        nfinish();
      } catch (error) {
        nurseFailed = error;
      }
      finish();
      if (nurseFailed) throw nurseFailed;
    },
  );

  // ======================= เทส 3: ป้าย MC =======================
  test('ผู้ป่วยจาก Triage หมู่ (Mass Casualty) แสดงป้าย MC (TC 018)', tagsOf('MC', [18]), async ({ page, browser }) => {
    const { note, soft, finish } = makeRunner(page);
    const authorization = trackAuthorization(page);
    const name = `SBH2947 MC ${new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok' }).replace(/:/g, '')}`;
    const { dialog } = await openCreateIncident(page, { name, location: 'ทดสอบ SBH-2947', chiefComplaint: 'อุบัติเหตุหมู่ ทดสอบ', headcount: 2 });
    await expect(dialog).toBeVisible();
    const { id } = await submitCreateIncident(page, createDialog(page));
    let incident: MciIncident = await fetchIncident(page, authorization, id);
    await expect.poll(async () => {
      incident = await fetchIncident(page, authorization, id);
      return `${incident.registration?.status ?? '-'} ${incident.members.length}`;
    }, { timeout: 180_000, intervals: [3_000] }).toBe('FINISHED 2');
    const members = [...incident.members].sort((a, b) => (a.registrationSeq ?? 0) - (b.registrationSeq ?? 0));
    for (const m of members) {
      note(`ผู้ป่วย MC ${m.registrationSeq}`, `${m.patientName} · HN ${m.hn} · ${m.vn} · ${m.en}`);
      rememberVisit(`MC${m.registrationSeq}`, { hn: m.hn, vn: m.vn, en: m.en } as ErVisit);
    }
    await page.reload();
    for (const m of members) {
      await expect(memberRow(page, m.hn)).toBeVisible({ timeout: 60_000 });
      await selectMember(page, m.hn);
      await fillMemberTriage(page, 3, URGENCY);
      expect(await pressReady(page, 3, URGENCY, m === members[0] ? `ก่อนกด — พร้อมส่ง MC ${m.registrationSeq}` : undefined)).toBeLessThan(300);
    }
    await expect(submitAllButton(page)).toBeEnabled({ timeout: 30_000 });
    await markEvidence(...members.map((m) => expected(memberRow(page, m.hn), 'READY')), clicked(submitAllButton(page)));
    await snapEvidence(page, 'ก่อนกด — ส่ง Triage ทั้งเหตุการณ์');
    await clearEvidenceMarks(page);
    await submitAllButton(page).click();
    const refer = page.getByRole('dialog', { name: 'ส่งต่อไปคลินิก' });
    const confirm = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
    for (let i = 0; i < 3; i++) {
      if (await refer.isVisible({ timeout: 3_000 }).catch(() => false)) await refer.getByRole('button', { name: 'ภายหลัง' }).click();
      else if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) await confirm.getByRole('button', { name: /ยืนยัน/ }).last().click();
    }
    const zones = await fetchZones(page, authorization);
    await expect.poll(async () => {
      const b = await fetchBoard(page, authorization);
      return members.map((m) => zones.get(b.find((e) => e.en === m.en)?.currentLocationId ?? -1) ?? '-').join(',');
    }, { timeout: 90_000, intervals: [3_000], message: 'ผู้ป่วย MC ต้องเข้าโซน Urgency' }).toBe(members.map(() => URGENCY).join(','));
    for (const m of members) {
      await soft(`เตรียม TC-018: สั่ง Imaging ให้ผู้ป่วย MC ${m.registrationSeq}`, async () => {
        await orderImaging(page, { hn: m.hn, vn: m.vn, en: m.en } as ErVisit, true);
      });
    }

    nurse = await openNurseWindow(browser);
    const n = nurse;
    const { note: nnote, soft: nsoft, finish: nfinish } = makeRunner(n);
    const nAuth = trackAuthorization(n);
    await startClip(n, 'TC-018');
    await nsoft(`${TC(18)} ค้น HN ผู้ป่วย MC ใน Left Panel — ชื่อแสดงป้าย MC`, async () => {
      const m = members[0];
      await expect.poll(async () => { await clearSearch(n); return patientBtn(n, m.hn).isVisible(); }, { timeout: 90_000, intervals: [5_000] }).toBe(true);
      await refresh(n);
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
      const roster = ((await (await n.request.get(`/cortex-api/er/nurse-tasks/encounters?date=${today}&dateBasis=task&shift=ALL_DAY`, { headers: { authorization: nAuth() } })).json()) as { data: { en: string; isMassCasualty: boolean }[] }).data;
      const rows: CompareRow[] = [];
      for (const x of members) {
        const shown = await patientBtn(n, x.hn).isVisible();
        const tag = shown ? ((await mcTag(patientBtn(n, x.hn)).innerText().catch(() => '')) || '-') : 'ไม่อยู่ในรายชื่อ';
        rows.push({ label: `MC ${x.registrationSeq} HN ${x.hn}`, values: [tag, String(roster.find((r) => r.en === x.en)?.isMassCasualty ?? '-')], same: tag === 'MC' });
      }
      nnote(`${TC(18)} ป้ายของผู้ป่วย MC`, rows.map((r) => `${r.label}: ${r.values.join(' / ')}`).join(' · '));
      await searchHn(n, m.hn);
      await showCompareTable(n, 'ป้าย MC ของผู้ป่วย Triage หมู่', ['ป้ายบนจอ', 'isMassCasualty (API)'], rows, { side: 'bottom' });
      await markEvidence(filled(searchBox(n), `HN ${m.hn}`), expected(mcTag(patientBtn(n, m.hn)), 'ป้าย MC'));
      expect(rows[0].same, 'ผู้ป่วย MC ต้องแสดงป้าย MC').toBe(true);
    });
    await hideCompareTable(n).catch(() => undefined);
    await clearSearch(n);
    await holdForClip(n);
    let nurseFailed: unknown;
    try {
      nfinish();
    } catch (error) {
      nurseFailed = error;
    }
    finish();
    if (nurseFailed) throw nurseFailed;
  });

  // ======================= เทส 4: ไม่แสดงผู้ป่วยที่ออกจาก ER =======================
  test(
    'ไม่แสดงผู้ป่วยที่ออกจาก ER: รับเป็นผู้ป่วยใน · รอจำหน่าย · จำหน่าย · ปิด Visit ที่การเงิน · ยกเลิก Encounter (TC 003–007)',
    tagsOf('EXIT', [3, 4, 5, 6, 7]),
    async ({ page, browser }) => {
      const { note, soft, finish } = makeRunner(page);
      const authorization = trackAuthorization(page);
      // SBH2947_EXIT=C,F,G = เตรียม / ตรวจเฉพาะผู้ป่วยเหล่านี้ (รอบ 4 รันซ้ำเฉพาะ TC ที่ขั้นเตรียมล้ม)
      const who = (process.env.SBH2947_EXIT ?? 'C,D,E,F,G').split(',').map((x) => x.trim());
      if (process.env.SBH2947_EXIT) note('โหมด', `ตรวจเฉพาะผู้ป่วย ${who.join(' / ')} (SBH2947_EXIT)`);
      const V: Record<string, ErVisit> = {};
      for (const k of who) {
        V[k] = await preparePatient(page, { label: `Ext2947${k}`, level: 3, zone: URGENCY }, note);
        await orderImaging(page, V[k]);
      }
      nurse = await openNurseWindow(browser);
      const n = nurse;
      const { note: nnote, soft: nsoft, finish: nfinish } = makeRunner(n);

      const run = async (no: number, k: string, label: string, action: () => Promise<void>) => {
        if (!who.includes(k)) return;
        const v = V[k];
        await startClip(n, `TC-${pad(no)}`);
        const ok1 = await nsoft(`${TC(no)} ขั้น 1 ค้น HN ผู้ป่วย ${k} → พบในรายการ`, async () => expectFound(n, v.hn, k));
        await clearSearch(n);
        await startClip(page, `TC-${pad(no)}-staff`);
        const done = await soft(`${TC(no)} ขั้น 2 ${label}`, action);
        if (ok1 && done) {
          await nsoft(`${TC(no)} ขั้น 3 รีเฟรช → ค้น HN ผู้ป่วย ${k} → ไม่พบ`, async () => expectGone(n, v.hn, k, nnote, TC(no)));
          await clearSearch(n);
        } else nnote(`${TC(no)} ขั้น 3 ตรวจไม่ได้`, ok1 ? `${label} ไม่สำเร็จ` : `ผู้ป่วย ${k} ไม่ขึ้นในรายการตั้งแต่ขั้น 1`);
      };

      await run(3, 'C', 'แพทย์ Disposition เลือก Admit > Save → Admit Order → สร้าง AN + เตียง → IPD เพิ่มผู้ป่วยลงเตียง', async () => {
        await soft(`${TC(3)} ขั้น 2.1 Disposition เลือก รับไว้รักษาต่อIPD > บันทึกฉบับร่าง`, async () => saveAdmitDisposition(page, V.C));
        const { ward } = await admitWithBed(page, V.C, authorization, note);
        await putToBed(page, V.C, ward, note);
        await expect.poll(async () => {
          const b = (await fetchBoard(page, authorization)).find((e) => e.en === V.C.en) as (Record<string, unknown> & { patientStatus?: string; admission?: { hasBed?: boolean } }) | undefined;
          return b ? `${b.patientStatus} hasBed=${b.admission?.hasBed}` : 'ไม่อยู่บนบอร์ด (admitted)';
        }, { timeout: 60_000, intervals: [3_000], message: 'ลงเตียงแล้วผู้ป่วย C ต้องออกจากบอร์ด (admitted)' }).toBe('ไม่อยู่บนบอร์ด (admitted)');
      });
      await run(4, 'D', 'แพทย์ Disposition (จำหน่ายกลับบ้าน) > Save > ลงนาม → รอจำหน่าย', async () => {
        await signDispositionOf(page, V.D, 'D');
      });
      await run(5, 'E', 'Disposition Save + ลงนาม > กดจำหน่าย', async () => {
        await signDispositionOf(page, V.E, 'E');
        await dischargeOf(page, V.E, 'E');
      });
      await run(6, 'F', 'Disposition Save + ลงนาม > จำหน่าย > การเงินปิด Visit', async () => {
        await signDispositionOf(page, V.F, 'F');
        await dischargeOf(page, V.F, 'F');
        // ปิด Visit ที่มี order ได้ 400 ErrAccountHasUninvoicedItems → สร้างใบแจ้งหนี้ทั้งหมด + ชำระเงินสดก่อน
        // (ชำระแล้วหน้าเว็บพาไปหน้าใบแจ้งหนี้ → closeVisitAtCashier เปิดหน้าบัญชีใหม่เอง — รอบ 4 ชำระใน beforeClose แล้วหาปุ่มปิด Visit ไม่เจอ)
        await gotoCashierAccount(page, V.F.hn, V.F.vn);
        const paid = await payAllInCash(page);
        note('การเงิน F', `ใบแจ้งหนี้ ${paid.invoiceId} · ใบเสร็จ ${paid.receiptId} · ${paid.amount} บาท`);
        await snapEvidence(page, 'หลังกด — ชำระเงิน F');
        const closed = await closeVisitAtCashier(page, V.F.hn, V.F.vn, async (close) => {
          await markEvidence(clicked(close, 'ปิด Visit'));
          await snapEvidence(page, 'ก่อนกด — การเงินปิด Visit F');
          await clearEvidenceMarks(page);
        });
        note('ปิด Visit F', closed.result);
        await snapEvidence(page, 'หลังกด — การเงินปิด Visit F');
      });
      await run(7, 'G', 'ยกเลิก Encounter ของผู้ป่วย G', async () => {
        await cancelEncounter(page, V.G);
      });

      await holdForClip(n);
      let nurseFailed: unknown;
      try {
        nfinish();
      } catch (error) {
        nurseFailed = error;
      }
      finish();
      if (nurseFailed) throw nurseFailed;
    },
  );

  // ======================= เทส 8 (Retest 4 พ.ย. 2026 หลังแก้ SBH-3843): TC-017 · บั๊กข้อ 3 (โซน Triage) · บั๊กข้อ 1 (Nurse task) =======================
  // ผู้ใช้สั่ง "Retest การ์ด SBH-2947 บน Dev-X" → ขอบเขต TC-017 + TC-022 + 3 ข้อของ SBH-3843 (decisions R84 ต่อท้าย)
  // ผู้ป่วย AUTO A: ESI 2 Resuscitation + Imaging (งานรอรับ — คงไว้ให้เทส 5 / TC-022 กดรับ) · B: ไม่คัดกรอง + Imaging (ยกเลิก Encounter ท้ายเทส)
  // ตัวเลขที่ Bubble ควรแสดงคำนวณจาก API แบบเดียวกับแอปรุ่นแก้ (badgeFromApi) · รันก่อนเทส 5: --grep @SBH-2947-RETEST แล้ว --grep @SBH-2947-BUBBLE
  test('Retest หลังแก้ SBH-3843: Bubble ตัวเลข (TC 017) · ไม่นับงานผู้ป่วยโซน Triage · นับ Nurse task ที่พยาบาลเพิ่มเอง', tagsOf('RETEST', [17]), async ({ page, browser }) => {
    const { note, finish } = makeRunner(page);
    const A = await preparePatient(page, { label: 'Rt2947A', level: 2, zone: RESUS, evidence: 'คัดกรอง A — ESI 2 โซน Resuscitation' }, note);
    await orderImaging(page, A);
    const B = await preparePatient(page, { label: 'Rt2947B', triage: false }, note);
    await orderImaging(page, B, true);
    note('ผู้ป่วย B (ยังไม่คัดกรอง)', `HN ${B.hn} · สั่ง ${SETTINGS.imagingCode} แล้ว อยู่โซน Triage`);

    nurse = await openNurseWindow(browser);
    const n = nurse;
    const { note: nnote, soft: nsoft, finish: nfinish } = makeRunner(n);
    const auth = trackAuthorization(n);
    await refresh(n);
    expect(await waitPresence(n, A.hn, true, 90_000), `ผู้ป่วย A HN ${A.hn} ต้องอยู่ในรายชื่อ`).toBe(true);
    const pendingOfEn = async (en: string) =>
      ((await (await n.request.get(`/cortex-api/er/nurse-tasks?date=${todayBkk()}&dateBasis=task&shift=ALL_DAY&en=${en}&perPage=1000`, { headers: { authorization: auth() } })).json()) as { data: { id: string; type: string; status: string; name: string }[] }).data.filter((t) => t.status === 'PENDING');
    const tasksOfA = (api: Awaited<ReturnType<typeof badgeFromApi>>) => api.counted.find((e) => e.en === A.en)?.taskTotalCount ?? 0;
    const show = (s: Awaited<ReturnType<typeof readBadge>>) => (s ? (s.dot ? 'จุด (ไม่มีตัวเลข)' : `"${s.text}"`) : 'ไม่มี');

    // ---------- TC-017 (= บั๊กข้อ 2) ----------
    await startClip(n, 'TC-017');
    await nsoft(`${TC(17)} เมนู รายการงานพยาบาล แสดง Bubble แดงแบบเดียวกับ ผู้ป่วยนอก (ผู้ป่วย A มี Order ที่ยังไม่รับ)`, async () => {
      await openNav(n);
      await expect(nurseBadge(n).first(), 'เมนู รายการงานพยาบาล ต้องมี Bubble').toBeVisible({ timeout: 60_000 });
      const { api, seen } = await waitBadgeMatchesApi(n, auth);
      nnote(`${TC(17)} HTML เมนู`, await nurseMenu(n).evaluate((e) => e.outerHTML.slice(0, 1200)));
      const opd = opdMenuTitle(n).locator('.ant-badge-count').first();
      const opdInfo = (await opd.count())
        ? await opd.evaluate((e) => ({ text: (e.textContent ?? '').trim(), bg: getComputedStyle(e).backgroundColor, h: Math.round(e.getBoundingClientRect().height) }))
        : null;
      const aTasks = tasksOfA(api);
      nnote(`${TC(17)} Bubble`, `เห็น ${show(seen)} ${seen ? `สี ${seen.bg} · ${seen.w}×${seen.h}px · title ${seen.title}` : ''} · ที่ควรเป็น (API ผู้ป่วยโซนจริง) ${api.total} งาน: ${api.counted.map((e) => `HN ${e.hn} ${e.taskTotalCount}`).join(', ')} · ผู้ป่วยนอก ${opdInfo ? `"${opdInfo.text}" สี ${opdInfo.bg} สูง ${opdInfo.h}px` : 'ไม่มี'}`);
      await showCompareTable(n, 'Bubble ของเมนู รายการงานพยาบาล', ['ที่เห็น', 'ที่ควรเป็น'], [
        { label: 'รูปแบบ', values: [seen ? (seen.dot ? 'จุด ไม่มีตัวเลข' : `วงมีตัวเลข (สูง ${seen.h}px)`) : 'ไม่มี', opdInfo ? `วงมีตัวเลขแบบ ผู้ป่วยนอก (สูง ${opdInfo.h}px)` : 'วงมีตัวเลข'], same: !!seen && !seen.dot },
        { label: 'สี', values: [seen ? colorName(seen.bg) : '-', 'แดง'], same: !!seen && colorName(seen.bg) === 'แดง' },
        { label: 'ตัวเลข', values: [seen?.text ?? '-', `${badgeText(api.total)} (งานรอรับ ${api.counted.length} ราย)`], same: seen?.text === badgeText(api.total) },
        { label: 'งานรอรับของผู้ป่วย A (API)', values: [`${aTasks} งาน`, 'อย่างน้อย 1'], same: aTasks > 0 },
      ], { side: 'right', width: '640px' });
      const marks = [expected(nurseMenu(n), `Bubble แดง ${seen?.text ?? ''}`)];
      if (opdInfo) marks.push(expected(opdMenuTitle(n), `เทียบ ผู้ป่วยนอก ${opdInfo.text}`));
      await markEvidence(...marks);
      await holdForClip(n, 2_500);
      expect(seen?.dot, 'Bubble ต้องเป็นวงตัวเลข ไม่ใช่จุด').toBe(false);
      expect(colorName(seen?.bg ?? ''), 'Bubble ต้องเป็นสีแดง').toBe('แดง');
      expect(seen?.text, 'ตัวเลขต้องเท่างานรอรับของผู้ป่วยโซนจริง').toBe(badgeText(api.total));
      expect(aTasks, 'Pre-condition: ผู้ป่วย A ต้องมีงานรอรับ').toBeGreaterThan(0);
    });
    await hideCompareTable(n).catch(() => undefined);
    await closeNav(n);

    // ---------- บั๊กข้อ 3: งานของผู้ป่วยโซน Triage ไม่ทำให้ Bubble ค้าง ----------
    await startClip(n, 'BUG-3');
    await nsoft('บั๊กข้อ 3 ผู้ป่วย B (ยังไม่คัดกรอง · โซน Triage) มีงานรอรับ แต่ไม่อยู่ในรายชื่อ → Bubble ต้องไม่นับงานของ B', async () => {
      const bTasks = await pendingOfEn(B.en);
      const found = await searchHn(n, B.hn);
      await markEvidence(filled(searchBox(n), `HN B ${B.hn}`), expected(sidebarEmpty(n), 'ไม่พบ B (โซน Triage)'));
      await holdForClip(n, 1_500);
      await snapEvidence(n, 'ค้น HN ผู้ป่วย B ไม่พบ');
      await clearEvidenceMarks(n);
      await clearSearch(n);
      await openNav(n);
      const { api, seen } = await waitBadgeMatchesApi(n, auth);
      const bRow = [...api.counted, ...api.notCounted].find((e) => e.en === B.en);
      const bCounted = api.counted.some((e) => e.en === B.en);
      const ifCounted = api.total + (bRow && !bCounted ? bRow.taskTotalCount : 0);
      const want = api.total ? badgeText(api.total) : null;
      nnote('บั๊กข้อ 3', `งานรอรับของ B (API) ${bTasks.map((t) => `${t.type} ${t.name}`).join(', ') || '-'} · B ใน encounters ${bRow ? `${bRow.locationName ?? '-'} (location ${bRow.currentLocationId}) ${bRow.taskTotalCount} งาน` : 'ไม่มี'} · Bubble เห็น ${show(seen)} · นับ ${api.total} (ถ้านับ B = ${ifCounted}) · ไม่นับ: ${api.notCounted.map((e) => `HN ${e.hn} ${e.locationName ?? 'ไม่ทราบโซน'} ${e.taskTotalCount}`).join(', ') || '-'}`);
      await showCompareTable(n, 'ผู้ป่วย B (โซน Triage) มีงานรอรับ — Bubble ต้องไม่นับ', ['ที่เห็น'], [
        { label: 'งานรอรับของ B (API)', values: [`${bTasks.length} งาน (${bTasks.map((t) => t.name).join(', ') || '-'})`], same: bTasks.length > 0 },
        { label: 'ค้น HN B ในรายการงานพยาบาล', values: [found ? 'พบ' : 'ไม่พบ'], same: !found },
        { label: 'Bubble ที่เมนู', values: [show(seen)], same: (seen && !seen.dot ? seen.text : null) === want },
        { label: 'งานที่ควรนับ (ไม่รวม B)', values: [`${api.total} งาน · ถ้านับ B = ${ifCounted}`], same: !bCounted },
      ], { side: 'right', width: '640px' });
      await markEvidence(expected(nurseMenu(n), `Bubble ${seen?.text ?? 'ไม่มี'} ไม่รวมงานของ B`));
      await holdForClip(n, 3_000);
      expect(bTasks.length, 'Pre-condition: ผู้ป่วย B ต้องมีงานรอรับ').toBeGreaterThan(0);
      expect(found, 'ผู้ป่วย B (โซน Triage) ต้องไม่อยู่ในรายชื่อ').toBe(false);
      expect(bCounted, 'Bubble ต้องไม่นับงานของผู้ป่วยโซน Triage').toBe(false);
      expect(seen && !seen.dot ? seen.text : null, 'ตัวเลขที่เมนูต้องไม่รวมงานของ B').toBe(want);
    });
    await hideCompareTable(n).catch(() => undefined);
    await closeNav(n);

    // ---------- บั๊กข้อ 1: Nurse task ที่พยาบาลเพิ่มเองถูกนับใน Bubble ----------
    await startClip(n, 'BUG-1');
    const taskName = `SBH2947 retest ${A.hn}`;
    const openA = async () => {
      await clearSearch(n);
      await searchHn(n, A.hn);
      await patientBtn(n, A.hn).click();
      await expect(mainOf(n).getByText(`HN ${A.hn}`, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
      await taskRows(n).first().waitFor({ timeout: 20_000 }).catch(() => undefined);
    };
    const newRow = () => taskRows(n).filter({ hasText: taskName }).first();
    const b0 = await waitBadgeMatchesApi(n, auth);
    await nsoft('บั๊กข้อ 1 ขั้น 1 ก่อนเพิ่ม — Bubble ที่เมนู', async () => {
      await openNav(n);
      nnote('บั๊กข้อ 1 ก่อนเพิ่ม', `Bubble ${show(b0.seen)} · API ${b0.api.total} · งานรอรับของ A ${tasksOfA(b0.api)}`);
      await markEvidence(expected(nurseMenu(n), `ก่อนเพิ่ม: Bubble ${b0.seen?.text ?? 'ไม่มี'}`));
      await holdForClip(n, 2_000);
    });
    await closeNav(n);
    await nsoft('บั๊กข้อ 1 ขั้น 2 ผู้ป่วย A → + เพิ่ม Nurse task (Routine) → บันทึก', async () => {
      await openA();
      await mainOf(n).getByRole('button', { name: /เพิ่ม Nurse task/ }).click();
      const modal = n.getByRole('dialog').filter({ hasText: 'เพิ่ม Nurse task' }).first();
      await expect(modal).toBeVisible();
      await modal.locator('input#name').fill(taskName);
      await modal.locator('input#priority').click();
      await n.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Routine' }).first().click();
      await modal.locator('input#assignee').click();
      await n.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
      await markEvidence(filled(modal.locator('input#name'), taskName), clicked(modal.getByRole('button', { name: /บันทึก/ }), 'บันทึก'));
      await snapEvidence(n, 'ก่อนกด — บันทึก Nurse task');
      await clearEvidenceMarks(n);
      const created = n.waitForResponse((r) => /\/er\/nurse-tasks/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
      await modal.getByRole('button', { name: /บันทึก/ }).click();
      await expectOk(await created, `เพิ่ม Nurse task "${taskName}"`);
      await expect(modal).toBeHidden({ timeout: 15_000 });
    });
    let b1 = b0;
    await nsoft('บั๊กข้อ 1 ขั้น 3 งานใหม่ รอรับงาน → Bubble นับเพิ่ม', async () => {
      await refresh(n);
      await openA();
      await expect(newRow().locator('[data-label="สถานะ"]')).toContainText('รอรับงาน', { timeout: 30_000 });
      await expect(newRow().getByRole('button', { name: 'รับ Order', exact: true })).toBeVisible();
      b1 = await waitBadgeMatchesApi(n, auth);
      const nt = (await pendingOfEn(A.en)).filter((t) => t.type === 'NURSE_ADDED');
      nnote('บั๊กข้อ 1 หลังเพิ่ม', `Bubble ${show(b0.seen)} → ${show(b1.seen)} · API ${b0.api.total} → ${b1.api.total} · งานรอรับของ A ${tasksOfA(b0.api)} → ${tasksOfA(b1.api)} · NURSE_ADDED ของ A: ${nt.map((t) => `${t.name} ${t.status}`).join(', ')}`);
      await openNav(n);
      await showCompareTable(n, 'Nurse task ที่เพิ่ม (รอรับงาน) ต้องถูกนับใน Bubble', ['ก่อน', 'หลัง'], [
        { label: 'งานรอรับของ A (API · รวม NURSE_ADDED)', values: [`${tasksOfA(b0.api)}`, `${tasksOfA(b1.api)}`], same: tasksOfA(b1.api) === tasksOfA(b0.api) + 1 },
        { label: 'Bubble ที่เมนู', values: [show(b0.seen), show(b1.seen)], same: b1.seen?.text === badgeText(b1.api.total) },
        { label: 'งานรอรับที่ควรนับทั้ง ER', values: [`${b0.api.total}`, `${b1.api.total}`], same: true },
      ], { side: 'bottom' });
      await markEvidence(
        expected(nurseMenu(n), `Bubble ${b0.seen?.text ?? 'ไม่มี'} → ${b1.seen?.text ?? 'ไม่มี'}`),
        expected(newRow().locator('[data-label="สถานะ"]'), 'รอรับงาน'),
      );
      await holdForClip(n, 3_000);
      expect(nt.length, 'Nurse task ที่เพิ่มต้องเป็นงานรอรับ').toBeGreaterThan(0);
      expect(tasksOfA(b1.api), 'งานรอรับของ A ที่ Bubble นับต้องเพิ่ม 1 (นับ NURSE_ADDED)').toBe(tasksOfA(b0.api) + 1);
      expect(b1.seen?.text, 'ตัวเลขที่เมนูต้องเท่างานที่นับรวม Nurse task').toBe(badgeText(b1.api.total));
    });
    await hideCompareTable(n).catch(() => undefined);
    await closeNav(n);
    await nsoft('บั๊กข้อ 1 ขั้น 4 กด รับ Order ของ Nurse task → Bubble ลดลง', async () => {
      await openA();
      const btn = newRow().getByRole('button', { name: 'รับ Order', exact: true });
      await markEvidence(clicked(btn, 'รับ Order (Nurse task)'));
      await snapEvidence(n, 'ก่อนกด — รับ Order Nurse task');
      await clearEvidenceMarks(n);
      const accepted = n.waitForResponse((r) => r.request().method() === 'POST' && /\/nurse-tasks\/[^/]+\/accept/.test(r.url()), { timeout: 30_000 });
      await btn.click();
      await expectOk(await accepted, 'รับ Order Nurse task');
      await n.waitForTimeout(1_500);
      await refresh(n);
      await openA();
      const b2 = await waitBadgeMatchesApi(n, auth);
      const status = (await newRow().locator('[data-label="สถานะ"]').innerText()).trim();
      nnote('บั๊กข้อ 1 หลังรับ', `สถานะ Nurse task "${status}" · Bubble ${show(b1.seen)} → ${show(b2.seen)} · API ${b1.api.total} → ${b2.api.total} · งานรอรับของ A ${tasksOfA(b1.api)} → ${tasksOfA(b2.api)}`);
      await openNav(n);
      await showCompareTable(n, 'รับ Order ของ Nurse task แล้ว Bubble ต้องลดลง', ['ก่อนรับ', 'หลังรับ'], [
        { label: 'สถานะ Nurse task', values: ['รอรับงาน', status], same: !/รอรับงาน/.test(status) },
        { label: 'งานรอรับของ A (API)', values: [`${tasksOfA(b1.api)}`, `${tasksOfA(b2.api)}`], same: tasksOfA(b2.api) === tasksOfA(b1.api) - 1 },
        { label: 'Bubble ที่เมนู', values: [show(b1.seen), show(b2.seen)], same: (b2.seen && !b2.seen.dot ? b2.seen.text : null) === (b2.api.total ? badgeText(b2.api.total) : null) },
      ], { side: 'bottom' });
      await markEvidence(
        expected(nurseMenu(n), `Bubble ${b1.seen?.text ?? 'ไม่มี'} → ${b2.seen?.text ?? 'ไม่มี'}`),
        expected(newRow().locator('[data-label="สถานะ"]'), status),
      );
      await holdForClip(n, 3_000);
      expect(status, 'Nurse task ต้องไม่เป็น รอรับงาน หลังกดรับ').not.toMatch(/รอรับงาน/);
      expect(tasksOfA(b2.api), 'งานรอรับของ A ต้องลดลง 1').toBe(tasksOfA(b1.api) - 1);
      expect(b2.seen && !b2.seen.dot ? b2.seen.text : null, 'ตัวเลขที่เมนูต้องตรงงานรอรับที่เหลือ').toBe(b2.api.total ? badgeText(b2.api.total) : null);
    });
    await hideCompareTable(n).catch(() => undefined);
    await closeNav(n).catch(() => undefined);
    await startClip(n, 'after');

    // ---------- เก็บกวาด: ยกเลิก Encounter ของ B (A คงไว้ให้เทส 5 / TC-022 รับ Order แล้วปิด Visit) ----------
    await cancelEncounter(page, B).then(
      () => note('หลังเทส', `ยกเลิก Encounter B ${B.en} แล้ว`),
      (error: Error) => note('หลังเทส', `ยกเลิก Encounter B ไม่สำเร็จ — ${error.message.split('\n')[0]}`),
    );
    let nurseFailed: unknown;
    try {
      nfinish();
    } catch (error) {
      nurseFailed = error;
    }
    finish();
    if (nurseFailed) throw nurseFailed;
  });

  // ======================= เทส 9 (บั๊ก · 4 พ.ย. 2026): ผู้ป่วยรอเตียงต้องยังแสดงในรายการงานพยาบาล =======================
  // ผู้ใช้แจ้ง "คนไข้รอเตียงต่อแสดงในหน้า การจัดการงานพยาบาลด้วย ถือว่าเป็น 1 Zone ในนั้น" (AC 2.2.1 ซ่อนเมื่อมี Ward + เตียงแล้วเท่านั้น)
  // ผู้ป่วย AUTO 1 ราย ESI 3 Urgency + Imaging → ตรวจ 3 จังหวะ: ก่อน Admit · หลังส่ง Admit Order (bed_waiting) · หลังสร้าง AN ยังไม่ลงเตียง
  // ไม่ปิด Visit / ไม่ลงเตียง — เก็บผู้ป่วยไว้ในสถานะรอเตียงให้ dev reproduce
  test('(บั๊ก) ผู้ป่วยรอเตียงต้องยังแสดงในรายการงานพยาบาล (กลุ่ม zone: รอเตียง)', tagsOf('BUGBED', []), async ({ page, browser }) => {
    const { note, soft, finish } = makeRunner(page);
    const authorization = trackAuthorization(page);
    const v = await preparePatient(page, { label: 'Bed2947', level: 3, zone: URGENCY, evidence: 'คัดกรอง — ESI 3 โซน Urgency' }, note);
    await orderImaging(page, v);
    nurse = await openNurseWindow(browser);
    const n = nurse;
    const { note: nnote, soft: nsoft, finish: nfinish } = makeRunner(n);
    const nAuth = trackAuthorization(n);
    type BoardRow = { en: string; patientStatus?: string; admitRequestStatus?: string | null; an?: string | null; admission?: { hasBed?: boolean } | null };
    const boardOf = async () => {
      const b = (await fetchBoard(page, authorization)).find((e) => e.en === v.en) as BoardRow | undefined;
      return b ? `${b.patientStatus} · Admit Request ${b.admitRequestStatus ?? '-'} · AN ${b.an ?? '-'} · มีเตียง ${b.admission?.hasBed ?? '-'}` : 'ไม่อยู่บนบอร์ด';
    };
    const encOf = async () =>
      ((await (await n.request.get(`/cortex-api/er/nurse-tasks/encounters?date=${todayBkk()}&dateBasis=task&shift=ALL_DAY`, { headers: { authorization: nAuth() } })).json()) as { data: (PendingEnc & { patientStatus: string })[] }).data.find((e) => e.en === v.en);
    /** ค้น HN แล้วกางกลุ่มที่พับอยู่ (กลุ่ม zone: รอเตียง พับไว้ตั้งต้น — สำรวจ 4 พ.ย.) → คืน พบไหม + ชื่อกลุ่ม + กลุ่มพับอยู่ก่อนกางไหม */
    const findHn = async () => {
      await searchBox(n).fill(v.hn);
      await n.waitForTimeout(1_200);
      const headers = sidebar(n).locator('.ant-collapse-header');
      const groups: string[] = [];
      let collapsed = false;
      for (let i = 0; i < (await headers.count()); i++) {
        groups.push((await headers.nth(i).innerText()).replace(/\s+/g, ' ').trim());
        if ((await headers.nth(i).getAttribute('aria-expanded')) === 'false') {
          collapsed = true;
          await headers.nth(i).click();
          await n.waitForTimeout(500);
        }
      }
      const found = await patientBtn(n, v.hn).isVisible();
      return { found, groups, collapsed, zone: found ? zoneName(groups.find((g) => g) ?? '') : '' };
    };
    const check = async (stage: string, clip: string) => {
      await startClip(n, clip);
      await nsoft(`${stage} — ค้น HN ในรายการงานพยาบาล ต้องพบผู้ป่วย`, async () => {
        await clearSearch(n);
        await refresh(n);
        await waitPresence(n, v.hn, true, 60_000);
        const e = await encOf();
        const board = await boardOf();
        const r = await findHn();
        nnote(stage, `บอร์ด: ${board} · API รายการงานพยาบาล: ${e ? `${e.patientStatus} · ${e.locationName} · งาน ${e.taskTotalCount}` : 'ไม่มีผู้ป่วยนี้'} · ค้น HN: ${r.found ? 'พบ' : 'ไม่พบ'} · กลุ่มที่เห็น ${r.groups.join(', ') || '-'}${r.collapsed ? ' (พับอยู่ กดกาง)' : ''}`);
        await showCompareTable(n, stage, ['ที่เห็น'], [
          { label: 'สถานะบนบอร์ด ER (API)', values: [board], same: true },
          { label: 'API รายการงานพยาบาล', values: [e ? `${e.patientStatus} · ${e.locationName} · งาน ${e.taskTotalCount}` : 'ไม่มีผู้ป่วยนี้'], same: !!e },
          { label: 'ค้น HN ในรายการงานพยาบาล', values: [r.found ? `พบ · กลุ่ม ${r.groups.join(', ')}` : `ไม่พบผู้ป่วย${r.groups.length ? ` (มีหัวกลุ่ม ${r.groups.join(', ')})` : ''}`], same: r.found },
        ], { side: 'right', width: '640px' });
        await markEvidence(
          filled(searchBox(n), `HN ${v.hn}`),
          r.found ? expected(patientBtn(n, v.hn), `พบ · ${r.groups.join(', ')}`) : expected(sidebar(n), 'พบผู้ป่วย · จริง: ไม่พบ'),
        );
        await holdForClip(n, 3_000);
        expect(r.found, 'ผู้ป่วยต้องแสดงในรายการงานพยาบาล').toBe(true);
      });
      await hideCompareTable(n).catch(() => undefined);
      await clearSearch(n);
    };

    await check('ขั้น 1 ก่อน Admit (โซน Urgency)', 'BED-1');
    let req: { ward: string } | undefined;
    await soft('ขั้น 2 แพทย์ Disposition เลือก รับไว้รักษาต่อIPD > Save → ส่ง Admit Order', async () => {
      await saveAdmitDisposition(page, v);
      await gotoVisit(page, v);
      req = await createAdmitRequest(page, 'ทดสอบ SBH-2947 รอเตียง');
      await expect.poll(boardOf, { timeout: 60_000, intervals: [3_000], message: 'ส่ง Admit Order แล้วต้องเป็น bed_waiting' }).toMatch(/^bed_waiting/);
      note('ขั้น 2', `Admit Order (${req.ward}) · บอร์ด: ${await boardOf()}`);
    });
    await check('ขั้น 2 หลังส่ง Admit Order (รอเตียง)', 'BED-2');
    await soft('ขั้น 3 ศูนย์จัดการเตียง สร้าง AN (ยังไม่ลงเตียงที่ IPD)', async () => {
      const r = await admitWithBed(page, v, authorization, note, req);
      note('ขั้น 3', `AN ${r.an} · หอ ${r.ward} · บอร์ด: ${await boardOf()}`);
    });
    await check('ขั้น 3 หลังสร้าง AN ยังไม่ลงเตียง (รอเตียง)', 'BED-3');
    await startClip(n, 'after');
    note('หลังเทส', `เก็บผู้ป่วย HN ${v.hn} · EN ${v.en} ไว้ในสถานะรอเตียง (ไม่ลงเตียง / ไม่ปิด Visit)`);
    let nurseFailed: unknown;
    try {
      nfinish();
    } catch (error) {
      nurseFailed = error;
    }
    finish();
    if (nurseFailed) throw nurseFailed;
  });

  // ======================= เทส 5: Bubble หายเมื่อรับ Order ครบ =======================
  test('รับ Order ทุกงานที่ค้างทั้ง ER → เมนู รายการงานพยาบาล ไม่แสดง Bubble แดง (TC 022) + ปิด Visit ผู้ป่วยของชุดนี้', tagsOf('BUBBLE', [22]), async ({ page, browser }) => {
    const { note, finish } = makeRunner(page);
    // SBH2947_BUBBLE_PREP=1: เตรียมผู้ป่วย AUTO 1 รายที่ยังไม่คัดกรอง + สั่ง Imaging ก่อน (รอบ 10 — เก็บคลิปซ้ำของกรณีที่ Bubble ค้างเพราะงานของผู้ป่วยโซน Triage)
    let triageB: ErVisit | undefined;
    if (process.env.SBH2947_BUBBLE_PREP) {
      triageB = await preparePatient(page, { label: 'Bbl2947B', triage: false }, note);
      await orderImaging(page, triageB, true);
      note('ผู้ป่วย B (ยังไม่คัดกรอง)', `HN ${triageB.hn} · สั่ง ${SETTINGS.imagingCode} แล้ว อยู่โซน Triage`);
    }
    // SBH2947_BUBBLE_ORDER=1: เตรียมผู้ป่วย AUTO 1 รายที่คัดกรองแล้ว (ESI 3) + สั่ง Imaging — ให้มีงานรอรับ / Bubble ตอนเริ่ม
    // (Retest 3 พ.ย. 2026: งาน Order ทั้ง ER ถูกรับหมดจากรอบก่อน Bubble ไม่ขึ้นตั้งแต่ขั้น 1)
    if (process.env.SBH2947_BUBBLE_ORDER) {
      const a = await preparePatient(page, { label: 'Bbl2947A', level: 3 }, note);
      await orderImaging(page, a, true);
      note('ผู้ป่วย A (คัดกรองแล้ว)', `HN ${a.hn} · สั่ง ${SETTINGS.imagingCode} แล้ว`);
    }
    nurse = await openNurseWindow(browser);
    const n = nurse;
    const { note: nnote, soft: nsoft, finish: nfinish } = makeRunner(n);
    const auth = trackAuthorization(n);
    await refresh(n);
    if (triageB) {
      const b = triageB;
      await startClip(n, 'TC-022-B');
      await nsoft(`${TC(22)} (ข้อมูลตั้งต้น) ผู้ป่วย B ที่ยังไม่คัดกรองมี Order แต่ไม่อยู่ในรายชื่อ`, async () => {
        const found = await searchHn(n, b.hn);
        await markEvidence(filled(searchBox(n), `HN B ${b.hn}`), expected(sidebarEmpty(n), 'B ไม่อยู่ในรายชื่อ'));
        expect(found).toBe(false);
      });
      await clearSearch(n);
    }
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
    // Retest 4 พ.ย. 2026 (ตัวแก้ SBH-3843): Bubble นับงาน NURSE_ADDED ด้วย → รวมในงานรอรับ
    const TYPES = TASK_TYPES;
    const pendingTasks = async () =>
      ((await (await n.request.get(`/cortex-api/er/nurse-tasks?date=${today}&dateBasis=task&statuses=PENDING&types=${TYPES}&perPage=200`, { headers: { authorization: auth() } })).json()) as { data: { id: string; en: string; hn: string; name: string; type: string }[] }).data;
    const summary = async () => ((await (await n.request.get(`/cortex-api/er/nurse-tasks/summary?date=${today}&dateBasis=task&types=${TYPES}`, { headers: { authorization: auth() } })).json()) as { pending: number }).pending;

    await startClip(n, 'TC-022');
    const before = await pendingTasks();
    nnote(`${TC(22)} ขั้น 1 งานรอรับทั้ง ER ก่อนเริ่ม (API)`, `${before.length} งาน · ${[...new Set(before.map((t) => `HN ${t.hn}`))].join(', ')}`);
    await nsoft(`${TC(22)} ขั้น 1 ก่อนรับ — เมนู รายการงานพยาบาล มี Bubble แดง`, async () => {
      await openNav(n);
      await expect(nurseBadge(n).first()).toBeVisible({ timeout: 60_000 });
      const { api, seen } = await waitBadgeMatchesApi(n, auth);
      nnote(`${TC(22)} ขั้น 1 Bubble`, `เห็น "${seen?.text ?? '-'}" · API (ผู้ป่วยโซนจริง) ${api.total} งาน ${api.counted.map((e) => `HN ${e.hn} ${e.taskTotalCount}`).join(', ')}`);
      await markEvidence(expected(nurseMenu(n), `Bubble แดง ${seen?.text ?? ''} (มีงานรอรับ)`));
      await holdForClip(n, 2_000);
      await snapEvidence(n, 'ก่อนรับ Order — Bubble ที่เมนู');
    });
    await closeNav(n);

    const viaApi: string[] = [];
    const acceptedOf: Record<string, number> = {};
    await nsoft(`${TC(22)} ขั้น 2 กด รับ Order ทุกงานที่ยังไม่รับ ของผู้ป่วยทุกรายที่มีงานค้าง`, async () => {
      // Retest 3 พ.ย. 2026: เปิดผู้ป่วยทุกรายในรายชื่อ (ไม่ใช่เฉพาะรายที่ API ของ Bubble มีงาน) — API นับเฉพาะ SPECIMEN / MEDICATION / ACTIVITY / IMAGING
      // ส่วนงานที่พยาบาลเพิ่มเอง (NURSE_ADDED) ขึ้น "รอรับงาน" + ปุ่ม รับ Order ในหน้าเหมือนกัน รอบแรกจึงค้าง (HN 6931241 Task A / B)
      // วนรอบเดียว (รอบ 2 เคยวนซ้ำทั้งรายชื่อ คลิปยาว ~2 นาทีโดยไม่มีกรอบ) — ขั้นตรวจเพิ่มถัดไปเปิดทุกรายซ้ำอยู่แล้ว
      let shot = false;
      await clearSearch(n);
      const listed = (await readSidebar(n)).flatMap((z) => z.patients.map((p) => p.hn));
      const hns = [...new Set([...listed, ...(await pendingTasks()).map((t) => t.hn)])].filter(Boolean);
      for (const hn of hns) {
        await clearSearch(n);
        if (!(await searchHn(n, hn))) continue;
        await patientBtn(n, hn).click();
        await expect(mainOf(n).getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
        await taskRows(n).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
        await n.waitForTimeout(800);
        for (let i = 0; i < 20; i++) {
          const btn = mainOf(n).getByRole('button', { name: 'รับ Order', exact: true }).first();
          // รายการงานโหลดใหม่หลังกดรับ ปุ่มหายชั่วคราว → รอปุ่มถัดไป 8 วิ (Retest 4 พ.ย. 2026 ลูปหยุดหลังกดงานแรกของ HN 6932607 — ผู้ใช้อนุมัติ R52)
          if (!(await btn.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false))) break;
          // ทุกปุ่มที่กด ตีกรอบ "กด" ให้เห็นในคลิป (markEvidence ค้างจอ 1.2 วิ) · ภาพเก็บใบแรกใบเดียว
          await markEvidence(clicked(btn, `รับ Order HN ${hn}`));
          if (!shot) {
            shot = true;
            await snapEvidence(n, 'ก่อนกด — รับ Order');
          }
          await clearEvidenceMarks(n);
          const accepted = n.waitForResponse((r) => r.request().method() === 'POST' && /\/nurse-tasks\/[^/]+\/accept/.test(r.url()), { timeout: 30_000 });
          await btn.click();
          await expectOk(await accepted, `รับ Order HN ${hn}`);
          acceptedOf[hn] = (acceptedOf[hn] ?? 0) + 1;
          await n.waitForTimeout(1_200);
        }
      }
      await clearSearch(n);
      await refresh(n);
      nnote(`${TC(22)} ขั้น 2 กด รับ Order จากหน้าจอ`, Object.entries(acceptedOf).map(([hn, c]) => `HN ${hn} ${c} งาน`).join(' · ') || 'ไม่มีงานให้กด');
      // Retest 4 พ.ย. 2026 (ตัวแก้ SBH-3843): Bubble ไม่นับงานของผู้ป่วยโซน Triage / ไม่ทราบโซนแล้ว → ไม่รับงานผ่าน API (รอบก่อนได้ 422) · จดไว้เป็นข้อมูล
      // งานที่ Bubble นับแต่ไม่มีปุ่มบนจอ (เช่น งานยา) → รับผ่าน API แบบเดียวกับปุ่ม (POST …/accept?en=)
      const countedEns = new Set((await badgeFromApi(n, auth)).counted.map((e) => e.en));
      for (const t of (await pendingTasks()).filter((x) => countedEns.has(x.en))) {
        // ปุ่มของแอปรุ่นนี้ส่ง POST …/accept ไม่มี en (trace 4 พ.ย.) · ส่ง ?en= ได้ 422 → ลองแบบปุ่มก่อน ไม่ผ่านค่อยลอง ?en=
        let res = await n.request.post(`/cortex-api/er/nurse-tasks/${encodeURIComponent(t.id)}/accept`, { headers: { authorization: auth() } });
        if (!res.ok()) res = await n.request.post(`/cortex-api/er/nurse-tasks/${encodeURIComponent(t.id)}/accept?en=${t.en}`, { headers: { authorization: auth() } });
        viaApi.push(`รับผ่าน API HN ${t.hn} ${t.type} ${t.name} → ${res.status()}`);
      }
      const api = await badgeFromApi(n, auth);
      viaApi.push(...api.notCounted.map((e) => `ไม่นับ HN ${e.hn} ${e.locationName ?? 'ไม่ทราบโซน'} ${e.taskTotalCount} งาน`));
      nnote(`${TC(22)} ขั้น 2 รับผ่าน API / งานที่ Bubble ไม่นับ (โซน Triage / ไม่ทราบโซน)`, viaApi.join(' · ') || 'ไม่มี');
      expect(api.counted.map((e) => `HN ${e.hn} ${e.taskTotalCount}`), 'ต้องไม่เหลืองานรอรับที่ Bubble นับ').toEqual([]);
    });

    // ---------- ตรวจเพิ่ม (ผู้ใช้ขอ 3 พ.ย. 2026 "ต้องไม่มีงานที่ยังไม่ได้รับในคนไข้ทุกคน") ----------
    // เปิดผู้ป่วยทุกรายในรายชื่อทีละราย: ช่องสถานะต้องไม่มี "รอรับงาน" + ไม่มีปุ่ม รับ Order · เทียบกับ API งานรอรับรายผู้ป่วย
    // ผู้ป่วยที่มีงานรอรับใน API แต่ไม่อยู่ในรายชื่อ (โซน Triage — รอบ 31 ต.ค.) แสดงเป็นแถวแยกในตารางเทียบ
    await nsoft(`${TC(22)} ขั้น 2 (ตรวจเพิ่ม) ผู้ป่วยทุกรายในรายชื่อไม่มีงาน รอรับงาน`, async () => {
      await clearSearch(n);
      await refresh(n);
      const zones = await readSidebar(n);
      const patients = zones.flatMap((z) => z.patients.map((p) => ({ ...p, zone: zoneName(z.label) })));
      nnote(`${TC(22)} ผู้ป่วยในรายชื่อหลังรับ Order (${patients.length} ราย)`, describe(zones));
      const apiLeft = await pendingTasks();
      const acceptedHns = new Set(Object.keys(acceptedOf));
      const rows: CompareRow[] = [];
      const bad: string[] = [];
      for (const p of patients) {
        const btn = patientBtn(n, p.hn);
        await btn.scrollIntoViewIfNeeded();
        const loaded = n.waitForResponse((r) => /\/er\/nurse-tasks\?/.test(r.url()), { timeout: 20_000 }).catch(() => undefined);
        await btn.click();
        await expect(mainOf(n).getByText(`HN ${p.hn}`, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
        await loaded;
        await taskRows(n).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
        await n.waitForTimeout(800);
        // กรอบล้อมทุกแถวงาน (ทุกกลุ่ม Medication / Imaging / …) — รอบ 2 ใช้แม่ของแถวแรก ได้แค่กลุ่มแรก (ภาพ 08 / 17)
        const rowCount = await taskRows(n).count();
        const table = rowCount
          ? taskRows(n).first().locator(`xpath=ancestor::*[count(.//*[contains(@class,"_data-row_")]) >= ${rowCount}][1]`)
          : mainOf(n);
        const statuses = (await taskRows(n).locator('[data-label="สถานะ"]').allInnerTexts()).map((s) => s.trim());
        const waiting = statuses.filter((s) => /รอรับงาน/.test(s)).length;
        const acceptBtns = await mainOf(n).getByRole('button', { name: 'รับ Order', exact: true }).count();
        const api = apiLeft.filter((t) => t.hn === p.hn).length;
        const ok = waiting === 0 && acceptBtns === 0 && api === 0;
        if (!ok) bad.push(`HN ${p.hn}`);
        rows.push({ label: `HN ${p.hn} (${p.zone})`, values: [`${statuses.length} งาน · รอรับงาน ${waiting}`, `${acceptBtns}`, `${api}`], same: ok });
        nnote(`${TC(22)} ตรวจ HN ${p.hn}`, `${p.zone} · ${p.count} · สถานะ: ${statuses.join(', ')} · ปุ่ม รับ Order ${acceptBtns} · API งานรอรับ ${api}`);
        await markEvidence(clicked(btn, `HN ${p.hn}`), expected(table, `รอรับงาน ${waiting} · ปุ่ม รับ Order ${acceptBtns}`));
        // ผู้ป่วยที่เพิ่งกดรับในขั้น 2 = หลักฐานหลัก ค้างจอนานขึ้นให้อ่านทัน
        if (acceptedHns.has(p.hn)) await holdForClip(n, 2_500);
        await snapEvidence(n, `ตรวจ HN ${p.hn}`);
      }
      // ไม่อยู่ในรายชื่อแต่มีงานรอรับ: ผู้ป่วยโซน Triage / ไม่ทราบโซน = Bubble ไม่นับ (ตัวแก้ SBH-3843) แสดงเป็นข้อมูล · ถ้า Bubble นับ = ผิด
      const countedHns = new Set((await badgeFromApi(n, auth)).counted.map((e) => e.hn));
      const hidden = [...new Set(apiLeft.filter((t) => !patients.some((p) => p.hn === t.hn)).map((t) => t.hn))];
      for (const hn of hidden) {
        const counted = countedHns.has(hn);
        if (counted) bad.push(`HN ${hn} (ไม่อยู่ในรายชื่อ)`);
        rows.push({ label: `HN ${hn} (ไม่อยู่ในรายชื่อ · ${counted ? 'Bubble นับ' : 'Bubble ไม่นับ'})`, values: ['-', '-', `${apiLeft.filter((t) => t.hn === hn).length}`], same: !counted });
      }
      await showCompareTable(n, `ผู้ป่วยทุกราย (${patients.length} ราย) หลังรับ Order`, ['บนจอ', 'ปุ่ม รับ Order', 'API รอรับ'], rows, { side: 'right', width: '640px' });
      await markEvidence(expected(sidebar(n), `ผู้ป่วย ${patients.length} ราย ไม่มีงานรอรับ`));
      await holdForClip(n, 4_000);
      expect(patients.length, 'ต้องมีผู้ป่วยในรายชื่อให้ตรวจ').toBeGreaterThan(0);
      expect(bad, 'ผู้ป่วยทุกรายต้องไม่มีงาน รอรับงาน').toEqual([]);
    });
    await hideCompareTable(n).catch(() => undefined);

    await nsoft(`${TC(22)} ขั้น 3 รีเฟรช → เมนู รายการงานพยาบาล ไม่แสดง Bubble แดง`, async () => {
      await markEvidence(clicked(refreshBtn(n), 'รีเฟรช'));
      await snapEvidence(n, 'ก่อนกด — รีเฟรช');
      await clearEvidenceMarks(n);
      await refresh(n);
      await openNav(n);
      await expect.poll(async () => nurseBadge(n).count(), { timeout: 90_000, intervals: [5_000], message: 'Bubble ต้องหายเมื่อไม่มีงานรอรับ' }).toBe(0);
      const api = await badgeFromApi(n, auth);
      const pending = api.total;
      const seen = await readBadge(n);
      nnote(`${TC(22)} งานรอรับที่ Bubble นับหลังรับครบ (API encounters)`, `${pending} งาน · ไม่นับ (โซน Triage / ไม่ทราบโซน) ${api.notCounted.map((e) => `HN ${e.hn} ${e.taskTotalCount}`).join(', ') || '-'} · summary เดิม ${await summary()}`);
      await showCompareTable(n, 'Bubble หลังรับ Order ครบ', ['ที่เห็น'], [
        { label: 'Bubble ที่ รายการงานพยาบาล', values: [seen ? `มี "${seen.text}"` : 'ไม่มี'], same: !seen },
        { label: 'งานรอรับที่ Bubble นับ (API)', values: [`${pending} งาน`], same: pending === 0 },
      ], { side: 'right', width: '520px' });
      await markEvidence(expected(nurseMenu(n), 'ไม่มี Bubble'));
      await holdForClip(n, 3_000);
      expect(pending).toBe(0);
    });
    await hideCompareTable(n).catch(() => undefined);
    await closeNav(n);
    await holdForClip(n);
    await startClip(n, 'after'); // จบคลิป TC-022 ก่อนขั้นปิด Visit (กับดัก SBH-2947 TC-022 คลิปยาว / หาย)

    // ---------- ปิด Visit ผู้ป่วยของชุดนี้ ----------
    if (!process.env.SBH2947_KEEP) {
      for (const v of readVisits()) {
        // มี order ค้างออกใบแจ้งหนี้ (400 ErrAccountHasUninvoicedItems) → หน้าบัญชี → สร้างใบแจ้งหนี้ + ชำระเงินสด → ปิดอีกครั้ง
        const closeOnce = () => closeVisitAtCashier(page, v.hn, v.vn);
        const result = await closeOnce()
          .catch(async (error: Error) => {
            if (!/Uninvoiced/.test(error.message)) throw error;
            await gotoCashierAccount(page, v.hn, v.vn);
            await payAllInCash(page);
            return closeOnce();
          })
          .then(
          (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
          (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
        );
        note('หลังเทส', `${v.label} HN ${v.hn} · ${v.vn}: ${result}`);
      }
    }
    let nurseFailed: unknown;
    try {
      nfinish();
    } catch (error) {
      nurseFailed = error;
    }
    finish();
    if (nurseFailed) throw nurseFailed;
  });

  // ======================= เทส 6 (บั๊ก): Bubble ไม่นับงานที่พยาบาลเพิ่มเอง (NURSE_ADDED) =======================
  // เจอใน Retest TC-022 3 พ.ย. 2026 (HN 6931241 Task A / B) — ผู้ใช้สั่งเปิดการ์ดบั๊ก + reproduce ด้วยผู้ป่วย AUTO
  // ผู้ป่วย AUTO คัดกรองแล้วไม่มี Order → Nurse กด + เพิ่ม Nurse task → งาน "รอรับงาน" + ปุ่ม รับ Order แต่เมนูไม่มี Bubble → ปิด Visit
  // ต้องไม่มีงาน Order รอรับในทั้ง ER ก่อนเริ่ม (ไม่งั้น Bubble ขึ้นจากงานอื่น พิสูจน์ไม่ได้)
  test('(บั๊ก) งาน Nurse task ที่พยาบาลเพิ่มเอง รอรับงาน แต่เมนู รายการงานพยาบาล ไม่แสดง Bubble', tagsOf('BUGNT', []), async ({ page, browser }) => {
    const { note, finish } = makeRunner(page);
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
    const v = await preparePatient(page, { label: 'Nt2947', level: 3 }, note);
    nurse = await openNurseWindow(browser);
    const n = nurse;
    const { note: nnote, soft: nsoft, finish: nfinish } = makeRunner(n);
    const auth = trackAuthorization(n);
    const summary = async () => ((await (await n.request.get(`/cortex-api/er/nurse-tasks/summary?date=${today}&dateBasis=task&types=SPECIMEN,MEDICATION,ACTIVITY,IMAGING`, { headers: { authorization: auth() } })).json()) as { pending: number }).pending;
    const tasksOf = async () => ((await (await n.request.get(`/cortex-api/er/nurse-tasks?date=${today}&dateBasis=task&shift=ALL_DAY&en=${v.en}&perPage=1000`, { headers: { authorization: auth() } })).json()) as { data: { id: string; type: string; status: string; name: string }[] }).data;
    const taskName = `SBH2947 bug ${v.hn}`;

    // ผู้ป่วยยังไม่มี Order → เปิดสวิตช์ แสดงผู้ป่วยที่ยังไม่มี Order
    if ((await withoutOrders(n).getAttribute('aria-checked')) !== 'true') await withoutOrders(n).click();
    await refresh(n);
    expect(await searchHn(n, v.hn), `ผู้ป่วย HN ${v.hn} ต้องอยู่ในรายชื่อ`).toBe(true);
    await patientBtn(n, v.hn).click();
    await expect(mainOf(n).getByText(`HN ${v.hn}`, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    const before = await summary();
    nnote('ก่อนเพิ่มงาน', `งานรอรับทั้ง ER (API summary) ${before} งาน`);
    expect(before, 'ต้องไม่มีงาน Order รอรับในทั้ง ER ก่อนเริ่ม (Bubble จะขึ้นจากงานอื่น)').toBe(0);

    await startClip(n, 'BUG-NT');
    await nsoft('ขั้น 1 ก่อนเพิ่ม — เมนู รายการงานพยาบาล ไม่มี Bubble (ไม่มีงานรอรับ)', async () => {
      await openNav(n);
      await markEvidence(expected(nurseMenu(n), 'ไม่มี Bubble (ยังไม่มีงาน)'));
      await holdForClip(n, 1_500);
    });
    await closeNav(n);

    await nsoft('ขั้น 2 กด + เพิ่ม Nurse task (Routine) → บันทึก', async () => {
      await mainOf(n).getByRole('button', { name: /เพิ่ม Nurse task/ }).click();
      const modal = n.getByRole('dialog').filter({ hasText: 'เพิ่ม Nurse task' }).first();
      await expect(modal).toBeVisible();
      await modal.locator('input#name').fill(taskName);
      await modal.locator('input#priority').click();
      await n.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Routine' }).first().click();
      await modal.locator('input#assignee').click();
      await n.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();
      await markEvidence(filled(modal.locator('input#name'), taskName), clicked(modal.getByRole('button', { name: /บันทึก/ }), 'บันทึก'));
      await snapEvidence(n, 'ก่อนกด — บันทึก Nurse task');
      await clearEvidenceMarks(n);
      const created = n.waitForResponse((r) => /\/er\/nurse-tasks/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
      await modal.getByRole('button', { name: /บันทึก/ }).click();
      await expectOk(await created, `เพิ่ม Nurse task "${taskName}"`);
      await expect(modal).toBeHidden({ timeout: 15_000 });
    });

    await nsoft('ขั้น 3 งานใหม่ รอรับงาน + ปุ่ม รับ Order แต่รีเฟรชแล้วเมนูไม่มี Bubble (Actual)', async () => {
      await refresh(n);
      await clearSearch(n);
      await searchHn(n, v.hn);
      await patientBtn(n, v.hn).click();
      const row = taskRows(n).filter({ hasText: taskName }).first();
      await expect(row.locator('[data-label="สถานะ"]')).toContainText('รอรับงาน', { timeout: 30_000 });
      await expect(row.getByRole('button', { name: 'รับ Order', exact: true })).toBeVisible();
      const tasks = await tasksOf();
      const pending = await summary();
      await expect.poll(async () => nurseDot(n).count(), { timeout: 20_000, intervals: [5_000] }).toBe(0);
      nnote('หลังเพิ่มงาน', `งานของผู้ป่วย (API): ${tasks.map((t) => `${t.type} ${t.status} ${t.name}`).join(' · ')} · งานรอรับทั้ง ER (API summary) ${pending}`);
      await openNav(n);
      await showCompareTable(n, 'Nurse task รอรับงาน กับ Bubble', ['ที่เห็น'], [
        { label: 'สถานะงาน (หน้าจอ)', values: ['รอรับงาน + ปุ่ม รับ Order'], same: true },
        { label: 'งานของผู้ป่วย (API)', values: [tasks.map((t) => `${t.type} · ${t.status}`).join(', ')], same: true },
        { label: 'Bubble ที่ รายการงานพยาบาล', values: [`${(await nurseDot(n).count()) ? 'มี' : 'ไม่มี'} (ควรมี)`], same: false },
        { label: 'API summary pending', values: [`${pending} งาน (ไม่นับ NURSE_ADDED)`], same: false },
      ], { side: 'bottom' }); // ด้านขวาบนบังหัวคอลัมน์ สถานะ / Actions (Sub Agent 3 พ.ย.)
      // แถว (data-row) ไม่ครอบช่องสถานะ / Actions ที่ตรึงขวา → ตีกรอบแยก
      await markEvidence(
        expected(nurseMenu(n), 'มี Bubble · จริง: ไม่มี'),
        expected(row.locator('[data-label="สถานะ"]'), 'รอรับงาน'),
        expected(row.getByRole('button', { name: 'รับ Order', exact: true }), 'ปุ่ม รับ Order'),
      );
      await holdForClip(n, 3_000);
      expect(pending, 'reproduce: summary ไม่นับงาน NURSE_ADDED').toBe(0);
    });
    await hideCompareTable(n).catch(() => undefined);
    await closeNav(n).catch(() => undefined);
    await startClip(n, 'after');

    const closed = await closeVisitAtCashier(page, v.hn, v.vn).then(
      (c) => (c.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
      (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
    );
    note('หลังเทส', `HN ${v.hn} · ${v.vn}: ${closed}`);
    let nurseFailed: unknown;
    try {
      nfinish();
    } catch (error) {
      nurseFailed = error;
    }
    finish();
    if (nurseFailed) throw nurseFailed;
  });

  // ======================= เทส 7 (บั๊ก · ตรวจซ้ำ 3 พ.ย. 2026): ผู้ป่วยโซน Triage + เหตุผลยกเลิก Encounter เกิน 30 ตัวอักษร =======================
  // ผู้ใช้สั่ง "ตรวจซ้ำก่อน แล้วใส่ทั้ง 2 ข้อ" (สรุปบั๊กของ SBH-2947 ลง SBH-3843) — ผู้ป่วย AUTO 1 ราย ไม่คัดกรอง + สั่ง Imaging
  // ก. Bubble นับงานของผู้ป่วยโซน Triage แต่ผู้ป่วยไม่อยู่ในรายชื่อ → พยาบาลกดรับไม่ได้ (รับผ่าน API แบบปุ่ม = 422 รอบ 31 ต.ค.)
  // ข. ยกเลิก Encounter ด้วยเหตุผล > 30 ตัวอักษร → ERROR value too long for type character varying(30) · แล้วยกเลิกด้วยเหตุผลสั้น (เก็บกวาด)
  test('(บั๊ก) งานของผู้ป่วยโซน Triage ค้าง Bubble · เหตุผลยกเลิก Encounter เกิน 30 ตัวอักษร', tagsOf('BUGRE', []), async ({ page, browser }) => {
    const { note, soft, finish } = makeRunner(page);
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
    const TYPES = 'SPECIMEN,MEDICATION,ACTIVITY,IMAGING';
    const pauth = trackAuthorization(page);
    // SBH2947_BUGRE_ONLY=CANCEL: รันเฉพาะข้อ ข. (ไม่สั่ง Order · ไม่เปิดหน้าต่าง Nurse) — ใช้เมื่อ ER มีงานรอรับของ session อื่นค้าง
    const onlyCancel = process.env.SBH2947_BUGRE_ONLY === 'CANCEL';
    const v = await preparePatient(page, { label: 'Re2947', triage: false }, note);
    let nfinish = () => {};
    if (!onlyCancel) {
    await orderImaging(page, v, true);
    note('ผู้ป่วย (ยังไม่คัดกรอง)', `HN ${v.hn} · EN ${v.en} · สั่ง ${SETTINGS.imagingCode}`);
    nurse = await openNurseWindow(browser);
    const n = nurse;
    const { note: nnote, soft: nsoft, finish: nrunFinish } = makeRunner(n);
    nfinish = nrunFinish;
    const auth = trackAuthorization(n);
    await refresh(n);
    const pendingOf = async () => ((await (await n.request.get(`/cortex-api/er/nurse-tasks?date=${today}&dateBasis=task&statuses=PENDING&types=${TYPES}&perPage=200`, { headers: { authorization: auth() } })).json()) as { data: { id: string; en: string; hn: string; type: string; name: string }[] }).data;
    const summary = async () => ((await (await n.request.get(`/cortex-api/er/nurse-tasks/summary?date=${today}&dateBasis=task&types=${TYPES}`, { headers: { authorization: auth() } })).json()) as { pending: number }).pending;

    // ---------- ก. ผู้ป่วยโซน Triage ----------
    await startClip(n, 'BUG-TRIAGE');
    await nsoft('ก. งานของผู้ป่วยที่ยังไม่คัดกรอง ทำให้เมนูมี Bubble แต่ผู้ป่วยไม่อยู่ในรายชื่อ กดรับไม่ได้ (Actual)', async () => {
      const all = await pendingOf();
      const mine = all.filter((t) => t.hn === v.hn);
      const others = all.filter((t) => t.hn !== v.hn);
      nnote('งานรอรับทั้ง ER (API)', `${all.length} งาน · ของผู้ป่วยนี้ ${mine.length} (${mine.map((t) => `${t.type} ${t.name}`).join(', ')}) · ของคนอื่น ${others.length}`);
      expect(mine.length, 'ผู้ป่วยต้องมีงานรอรับ').toBeGreaterThan(0);
      expect(others, 'ต้องไม่มีงานรอรับของผู้ป่วยอื่น (Bubble จะขึ้นจากงานอื่น)').toEqual([]);
      const found = await searchHn(n, v.hn);
      // ลองรับงานแบบเดียวกับปุ่ม รับ Order (POST …/accept?en=) — หน้าเว็บไม่มีปุ่มให้กดเพราะไม่มีผู้ป่วยในรายชื่อ
      const tries: string[] = [];
      for (const t of mine) {
        const res = await n.request.post(`/cortex-api/er/nurse-tasks/${encodeURIComponent(t.id)}/accept?en=${t.en}`, { headers: { authorization: auth() } });
        tries.push(`${t.id} → ${res.status()} ${res.ok() ? '' : (await res.text()).slice(0, 100)}`);
      }
      nnote('รับงานผ่าน API แบบปุ่ม', tries.join(' · '));
      const pending = await summary();
      // ภาพที่ 1 (เมนูปิด): ค้น HN แล้วไม่พบในรายชื่อ — เมนูเปิดจะบังช่องค้นหา / รายชื่อ (รอบแรก 3 พ.ย. กรอบตกบนเมนู)
      await markEvidence(filled(searchBox(n), `HN ${v.hn}`), expected(sidebarEmpty(n), 'พบผู้ป่วย · จริง: ไม่พบ'));
      await holdForClip(n, 2_000);
      await snapEvidence(n, 'ค้น HN ผู้ป่วยโซน Triage ไม่พบ');
      await clearEvidenceMarks(n);
      await openNav(n);
      await showCompareTable(n, 'ผู้ป่วยโซน Triage มีงานรอรับ', ['ที่เห็น'], [
        { label: 'ผู้ป่วย (ยังไม่คัดกรอง)', values: [`HN ${v.hn} · งาน ${mine.map((t) => t.name).join(', ')}`], same: true },
        { label: 'ค้น HN ในรายการงานพยาบาล', values: [found ? 'พบ' : 'ไม่พบผู้ป่วย'], same: found },
        { label: 'Bubble ที่ รายการงานพยาบาล', values: [`${(await nurseDot(n).count()) ? 'มี' : 'ไม่มี'} · API summary pending ${pending}`], same: true },
        { label: 'รับงาน (POST accept แบบปุ่ม)', values: [tries.map((x) => x.split(' → ')[1]).join(', ')], same: false },
      ], { side: 'bottom' });
      await markEvidence(expected(nurseMenu(n), 'Bubble ขึ้นจากงานที่พยาบาลมองไม่เห็น'));
      await holdForClip(n, 3_000);
      expect(found, 'reproduce: ผู้ป่วยโซน Triage ไม่อยู่ในรายชื่อ').toBe(false);
      expect(pending, 'reproduce: Bubble ยังนับงานนี้').toBeGreaterThan(0);
    });
    await hideCompareTable(n).catch(() => undefined);
    await closeNav(n).catch(() => undefined);
    await startClip(n, 'after');
    }

    // ---------- ข. เหตุผลยกเลิก Encounter เกิน 30 ตัวอักษร ----------
    const longReason = 'ทดสอบเหตุผลการยกเลิกที่ยาวเกินสามสิบตัวอักษร SBH-2947';
    await gotoVisit(page, v);
    await startClip(page, 'BUG-CANCEL');
    await soft(`ข. ยกเลิก Encounter ด้วยเหตุผลยาว ${longReason.length} ตัวอักษร → แจ้ง value too long (Actual)`, async () => {
      const status = mainOf(page).locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
      await expect(status).toBeVisible({ timeout: 60_000 });
      await status.click();
      await options(page).filter({ hasText: /^ยกเลิก$/ }).click();
      const dialog = page.getByRole('dialog', { name: /ต้องการยกเลิก/ });
      await expect(dialog).toContainText(v.en);
      const reason = dialog.getByRole('textbox', { name: 'ระบุเหตุผลการยกเลิก' });
      await reason.fill(longReason);
      const typed = await reason.inputValue();
      const maxLen = await reason.getAttribute('maxlength');
      note('ช่องเหตุผล', `พิมพ์ได้ ${typed.length} ตัวอักษร · maxlength ${maxLen ?? '-'}`);
      const confirm = dialog.getByRole('button', { name: 'ยืนยัน' });
      await markEvidence(filled(reason, `${typed.length} ตัวอักษร`), clicked(confirm, 'ยืนยัน'));
      await snapEvidence(page, 'ก่อนกด — ยืนยัน (เหตุผลยาว)');
      await clearEvidenceMarks(page);
      const res = page.waitForResponse((r) => r.request().method() === 'POST' && /\/cortex-api\/graphql/.test(r.url()) && /cancel/i.test(r.request().postData() ?? ''), { timeout: 40_000 });
      await confirm.click();
      const body = await (await res).text();
      note('ผลคำสั่งยกเลิก', body.slice(0, 300));
      const alert = page.getByText(/value too long/).first();
      await expect(alert).toBeVisible({ timeout: 20_000 });
      // แจ้งเตือนอยู่หลังฉากเบลอของหน้าต่างยืนยัน (รอบแรก 3 พ.ย. อ่านไม่ออก) → กด ย้อนกลับ ให้หน้าต่างปิดก่อนถ่าย
      if (await dialog.isVisible().catch(() => false)) await dialog.getByRole('button', { name: 'ย้อนกลับ' }).click();
      await expect(dialog).toBeHidden({ timeout: 10_000 });
      await alert.hover({ trial: true }).catch(() => undefined);
      // กรอบทั้งกล่องแจ้งเตือน (กรอบที่ข้อความ error ป้ายทับหัว "ไม่สามารถยกเลิก Encounter นี้ได้")
      const notice = page.locator('.ant-notification-notice').filter({ hasText: /value too long/ }).first();
      const box = (await notice.count()) ? notice : alert;
      await markEvidence(alerted(box, 'ยกเลิกได้ · จริง: value too long (30)'));
      await holdForClip(page, 2_500);
      await snapEvidence(page, 'หลังกด — แจ้ง value too long');
      await clearEvidenceMarks(page);
    });
    // หน้าต่างยกเลิกปิดไปแล้ว / ขั้น ข. พัง → ยกเลิกใหม่ด้วยเหตุผลสั้น (helper เดิม)
    const left = await (await page.request.get(`/cortex-api/er/encounters/${v.en}`, { headers: { authorization: pauth() } })).json().catch(() => ({})) as { latestStatusCode?: string };
    note('สถานะ Encounter หลังขั้น ข.', left.latestStatusCode ?? '-');
    if (left.latestStatusCode && !/cancel/i.test(left.latestStatusCode)) {
      await cancelEncounter(page, v).then(
        () => note('เก็บกวาด', `ยกเลิก Encounter ${v.en} (helper) สำเร็จ`),
        (error: Error) => note('เก็บกวาด', `ยกเลิกไม่สำเร็จ — ${error.message.split('\n')[0]}`),
      );
    }
    await startClip(page, 'after');
    let nurseFailed: unknown;
    try {
      nfinish();
    } catch (error) {
      nurseFailed = error;
    }
    finish();
    if (nurseFailed) throw nurseFailed;
  });
});
