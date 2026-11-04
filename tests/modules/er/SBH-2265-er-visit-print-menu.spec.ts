import { type Browser, type Locator, type Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { clearEvidenceMarks, clicked, expected, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { captureGeneratedDocs, capturePrintJobs, hidePdf, pdfLineAt, pdfPages, showPdf } from '../../../helpers/functions/print-capture';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit, submitOrders } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, addMedicineToCart, careMenu, gotoVisit } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// SBH-2265 [ER][QUEUE] ปุ่มเมนูพิมพ์บัตรคิว รับยา และการเงิน / ใบนำทางไปแต่ละ Service — ปุ่ม "พิมพ์บัตรคิวและใบนำทาง ER" บน Order Summary
// ชุด EXE SBH-3332 → HPY SBH-3333 (TC-001…012 = SBH-3335…3346) · EDG SBH-3334 (TC-013…015 = SBH-3347…3349) · 1 เทสต่อผู้ป่วย (R9) · คลิปแยกต่อ TC (R61)
//   ผู้ป่วย A (ยา + Lab + X-ray + หัตถการ) = TC 001–012 · ผู้ป่วย B (ยาอย่างเดียว) = TC 013–015
// บัญชี: Super_User (user1) ลงทะเบียน / คัดกรอง / สั่ง One Day Order · Nurse (x-nurse) เปิด Order Summary + หน้าต่างพิมพ์ (TC: "user พยาบาล ER")
// สำรวจ dev-x 3 พ.ย. 2026 (ไฟล์แอป index-D-2VfyUS.js · flag reception.visit-slip.print = true):
//   หน้าต่างเรียก GET /visits/<VN>/visit-slip/destinations?en=<EN ของ ER> → [] ทุก Visit ER (สแกน 32 Visit) · ไม่ส่ง en ได้ปลายทาง
//   (Order ที่สั่งจาก ER ได้ Encounter LAB / IMAGING / ACTIVITY ของตัวเอง ไม่ใช่ EN ของ ER) → ส่วนใบนำทางขึ้น "ไม่มีจุดบริการถัดไปสำหรับ Visit นี้"
//   รหัสหน่วยบริการ dev-x: 23 = QSU 344 ห้องปฏิบัติการ ชั้น 6 · q-img = QSU 23 ห้อง(X-ray) · 100 = QSU 347 ห้องหัตถการ
// หัตถการ: ผู้ใช้ให้ Claude หาเอง (ลองไม่เกิน 3 ตัว) → PROCS · บัตรคิว OPD (TC-005): ผู้ป่วย OPD เดิมของ SBH-2233 ที่จำหน่ายแล้ว (SBH2265_OPD)
// รัน (dev-x): npx playwright test --headed --grep @SBH-2265   ·  เฉพาะผู้ป่วย: --grep "@SBH-2265-A( |$)" / B
// SBH2265_KEEP=1 = ไม่ปิด Visit ท้ายเทส · SBH2265_A / SBH2265_B=<HN>,<VN>,<EN> = ทำต่อกับผู้ป่วยเดิมที่สั่ง Order แล้ว

const ISSUE: Record<number, string> = {};
for (let n = 1; n <= 15; n++) ISSUE[n] = `SBH-${3334 + n}`;
const pad = (n: number) => String(n).padStart(3, '0');
const TC = (n: number) => `TC-${pad(n)} (${ISSUE[n]})`;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const tags = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `@${ISSUE[from + i]}`);
const notes = (from: number, to: number) => [linear('SBH-2265'), ...Array.from({ length: to - from + 1 }, (_, i) => linear(ISSUE[from + i]))];

const MED = 'med0000006'; // R25
const LAB = 'SBHLAB5'; // Glucose · Chemistry
const XRAY = 'SBHIMG1'; // CHEST (X-ray)
const PROCS = ['NUH-OS-ACT-019', 'NUH-OS-ACT-024', 'PROC1']; // ผู้ใช้ให้ลองไม่เกิน 3 ตัว (ECG 89.52 ไปห้อง Echo)
const OPD_VISIT = (process.env.SBH2265_OPD ?? '6932033,V69102227538,E69102232287').split(',');

interface Dest { label: string; kind: string; name: RegExp; text: string; code: string }
const DESTS: Dest[] = [
  { label: 'Lab', kind: 'lab', name: /ห้องปฏิบัติการ ชั้น 6/, text: 'ห้องปฏิบัติการ ชั้น 6', code: '23' },
  { label: 'X-Ray', kind: 'imaging', name: /ห้อง\(X-ray\)/, text: 'ห้อง(X-ray)', code: 'q-img' },
  { label: 'หัตถการ', kind: 'activity', name: /ห้องหัตถการ/, text: 'ห้องหัตถการ', code: '100' },
];

const squash = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * ค้างจอให้คนดูคลิปอ่านทัน + กระตุ้นให้ screencast ส่งเฟรม (จุด 2px มุมจอสลับสีทุก 150 ms)
 * dev-x 3 พ.ย. 2026: ตีกรอบในหน้าต่าง modal แล้วจอนิ่ง → คลิปไม่มีเฟรมที่มีกรอบเลย (ภาพนิ่งมี)
 */
async function hold(p: Page, ms = 2_500) {
  await p.evaluate((ms) => {
    const dot = document.createElement('div');
    Object.assign(dot.style, { position: 'fixed', right: '0', bottom: '0', width: '2px', height: '2px', zIndex: '2147483647', pointerEvents: 'none' });
    document.body.appendChild(dot);
    let on = false;
    const t = setInterval(() => { on = !on; dot.style.background = on ? '#fefefe' : '#fdfdfd'; }, 150);
    setTimeout(() => { clearInterval(t); dot.remove(); }, ms);
  }, ms);
  await p.waitForTimeout(ms);
}
const mainOf = (p: Page) => p.getByRole('main');
const printMenuButton = (p: Page) => mainOf(p).getByRole('button', { name: 'พิมพ์บัตรคิวและใบนำทาง ER', exact: true });
const printDialog = (p: Page) => p.getByRole('dialog', { name: 'พิมพ์บัตรคิวและใบนำทาง ER' });
const queueRows = (d: Locator) => d.locator('div.ant-flex-justify-space-between').filter({ has: d.page().getByRole('button', { name: /^พิมพ์บัตรคิว/ }) });
const slipSection = (d: Locator) => d.locator('section[aria-label="ใบนำทางไปจุดบริการอื่น"]');
const slipRows = (d: Locator) => slipSection(d).locator('[class*="visit-slip-destination-row"]');

interface ApiDest { destinationKind: string; serviceUnitName: string; locationName: string; queueServiceUnitId: number; orderNames: string[]; isPrintable: boolean; incompleteReason?: string }
const destText = (d: ApiDest) => `${d.destinationKind}: ${d.serviceUnitName || '-'} / ${d.locationName || '-'}${d.isPrintable ? '' : ' (พิมพ์ไม่ได้)'}`;

/** ผู้ป่วย AUTO ใหม่ → Visit ER → คัดกรอง ESI 3 → One Day Order (แพทย์ส่งคำสั่ง) · หัตถการส่งทีละตัว ไม่ผ่าน = หยุดตัวที่เหลือ */
async function preparePatient(page: Page, label: string, orders: string[], procs: string[], envKey: string, note: (t: string, d: string) => void): Promise<ErVisit> {
  const reuse = (process.env[envKey] ?? '').split(',').filter(Boolean);
  if (reuse.length === 3) {
    const visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
    // SBH2265_ORDER=1 = รายเดิมคัดกรองแล้วแต่ยังไม่สั่ง Order
    if (!process.env.SBH2265_ORDER) {
      note(`ผู้ป่วย ${label} (ทำต่อกับรายเดิม — สั่ง Order ไว้แล้ว)`, `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
      await gotoVisit(page, visit); // ให้แอปยิง cortex-api (ได้ token ไว้เรียก API)
      return visit;
    }
    // SBH2265_ORDER=procs = สั่งยา / Lab / X-ray ไว้แล้ว ลองเฉพาะหัตถการใน SBH2265_PROCS
    const onlyProcs = process.env.SBH2265_ORDER === 'procs';
    note(`ผู้ป่วย ${label} (ทำต่อกับรายเดิม — ${onlyProcs ? 'สั่งยา / Lab / X-ray ไว้แล้ว' : 'คัดกรองแล้ว'})`, `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
    await gotoVisit(page, visit);
    if (onlyProcs) await tryProcedures(page, visit, (process.env.SBH2265_PROCS ?? procs.join(',')).split(',').filter(Boolean), note);
    else await placeOrders(page, visit, label, orders, procs, note);
    return visit;
  }
  await gotoErDashboard(page);
  const patient = newTestPatient(label);
  const visit = await registerAndOpenErVisit(page, patient);
  note(`ผู้ป่วย ${label}`, `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
  console.log(`    ผู้ป่วย ${label}: HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
  await expect(mainOf(page).getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first()).toBeVisible({ timeout: 90_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
  // dev-x 3 พ.ย. 2026: ช่อง "โซน *" บังคับ ระบบไม่เลือกค่าแนะนำให้ → กดปุ่มโซนที่มีป้าย "แนะนำ" (ไม่มีป้าย = Urgency)
  const zones = erTriagePanel(page).locator('[class*="er-triage-zone-options"] button');
  if ((await zones.count()) && !(await zones.evaluateAll((b) => b.some((x) => x.getAttribute('aria-pressed') === 'true')))) {
    const zone = zones.filter({ hasText: 'แนะนำ' }).or(zones.filter({ hasText: /^\s*Urgency/ })).first();
    await zone.scrollIntoViewIfNeeded();
    await zone.click();
    await expect(zone, 'ต้องเลือกโซนได้').toHaveAttribute('aria-pressed', 'true');
    note(`โซนตอนคัดกรอง ${label}`, squash(await zone.innerText()));
  }
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
  await placeOrders(page, visit, label, orders, procs, note);
  return visit;
}

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

/** Route ต้องเป็น OralRoute — addMedicineToCart บางรอบเลือก OticRoute แล้ว "เกิดข้อผิดพลาดในระบบ" (SBH-2593 dev-x 31 ต.ค.) */
async function forceOralRoute(page: Page) {
  const route = mainOf(page).getByText('Route / Mode', { exact: true }).locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
  if (/OralRoute/.test(await route.innerText())) return;
  await route.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^OralRoute$/ }).first().click();
  await page.waitForTimeout(1_000);
}

async function placeOrders(page: Page, visit: ErVisit, label: string, orders: string[], procs: string[], note: (t: string, d: string) => void) {
  // ยาต้องกรอกฟอร์ม (ขนาด / Route / ความถี่ / จำนวน) → addMedicineToCart · Lab / X-ray → submitOrders (ส่งคำสั่งยาในตะกร้าไปด้วย)
  // หลังคัดกรองแผง Overview โหลดตามหลังแล้วทับ One Day Order (ช่องค้นหายาหาย) → โหลดหน้าผู้ป่วยใหม่ + ลองซ้ำ
  await gotoVisit(page, visit);
  for (const med of orders.filter((c) => /^med/i.test(c))) {
    for (let round = 1; ; round++) {
      await openOneDayOrder(page);
      const ok = await addMedicineToCart(page, med, () => forceOralRoute(page)).then(() => true, (e: Error) => (round >= 3 ? Promise.reject(e) : false));
      if (ok) break;
      console.log(`    เพิ่มยา ${med} รอบ ${round} ไม่ผ่าน → โหลดหน้าใหม่แล้วลองอีกครั้ง`);
      await gotoVisit(page, visit);
    }
  }
  await openOneDayOrder(page);
  await submitOrders(page, orders.filter((c) => !/^med/i.test(c)));
  note(`สั่ง One Day Order ผู้ป่วย ${label} (ส่งคำสั่งแล้ว)`, orders.join(' · '));
  await tryProcedures(page, visit, procs, note);
}

/** ลองสั่งหัตถการทีละตัว (ผู้ใช้ให้ลองไม่เกิน 3 ตัว) — ตัวที่เพิ่มลงตะกร้า / ส่งคำสั่งไม่ผ่าน จดไว้แล้วลองตัวถัดไป */
async function tryProcedures(page: Page, visit: ErVisit, procs: string[], note: (t: string, d: string) => void) {
  for (const code of procs) {
    await openOneDayOrder(page);
    const ok = await submitOrders(page, [code]).then(
      () => true,
      async (e: Error) => {
        await page.screenshot({ path: test.info().outputPath(`หัตถการ-${code}-ไม่ผ่าน.png`) }).catch(() => undefined);
        note(`หัตถการ ${code}`, `สั่งไม่ผ่าน — ${e.message.split('\n')[0]}`);
        return false;
      },
    );
    if (ok) note(`หัตถการ ${code}`, 'ส่งคำสั่งแล้ว');
    else await gotoVisit(page, visit);
  }
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

/** เมนูขวา Order Summary จนปุ่มพิมพ์ขึ้นและอยู่ต่อ 3 วินาที (แผง Overview ที่โหลดตามหลังทับได้) */
async function openOrderSummary(n: Page) {
  const item = n.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: /Order Summary$/ }).first();
  await expect(async () => {
    if (!(await printMenuButton(n).isVisible())) await item.click({ force: true });
    await expect(printMenuButton(n)).toBeVisible({ timeout: 10_000 });
    await n.waitForTimeout(3_000);
    await expect(printMenuButton(n)).toBeVisible({ timeout: 1_000 });
  }, 'เปิด Order Summary').toPass({ timeout: 120_000 });
  // แถบเมนูขวากางค้างหลังกด → คลิกพื้นที่ว่างของแถบแท็บ + ย้ายเมาส์ออก
  await n.mouse.click(1100, 166);
  await n.mouse.move(960, 1050);
  await n.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
}

/** กดปุ่มเมนูพิมพ์ → หน้าต่าง (คืน response ของ destinations ที่หน้าต่างเรียก) */
async function openPrintDialog(n: Page, shot?: string): Promise<{ dialog: Locator; uiDest: ApiDest[]; uiUrl: string }> {
  const dialog = printDialog(n);
  if (shot) {
    await markEvidence(clicked(printMenuButton(n), 'ปุ่มเมนูพิมพ์'));
    await snapEvidence(n, shot);
    await clearEvidenceMarks(n);
  }
  const destRes = n.waitForResponse((r) => r.url().includes('/visit-slip/destinations') && r.request().method() === 'GET', { timeout: 30_000 });
  destRes.catch(() => undefined);
  await printMenuButton(n).click();
  await expect(dialog, 'กดปุ่มเมนูแล้วต้องมีหน้าต่าง "พิมพ์บัตรคิวและใบนำทาง ER"').toBeVisible({ timeout: 20_000 });
  const res = await destRes.catch(() => undefined);
  const uiDest = res ? ((await res.json().catch(() => [])) as ApiDest[]) : [];
  await expect(slipSection(dialog).getByText(/ไม่มีจุดบริการถัดไป/).or(slipRows(dialog).first())).toBeVisible({ timeout: 20_000 });
  // แถวคิวโหลดตามหลัง (queue-with-details) — รอให้มีแถวและจำนวนนิ่ง (ไม่มีภายใน 20 วินาที = ปล่อยให้ step ตัดสิน)
  await expect.poll(() => queueRows(dialog).count(), { timeout: 20_000 }).toBeGreaterThan(0).catch(() => undefined);
  await n.waitForTimeout(1_500);
  return { dialog, uiDest, uiUrl: res ? new URL(res.url()).pathname + new URL(res.url()).search : '(หน้าต่างไม่ได้เรียก API)' };
}

async function closePrintDialog(n: Page) {
  const dialog = printDialog(n);
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  }
}

/** แถวคิวในหน้าต่าง → { ชื่อคิว, เลขคิว, ปุ่ม } */
async function readQueueRows(dialog: Locator) {
  const rows = queueRows(dialog);
  const out: { row: Locator; name: string; no: string; button: Locator; buttonText: string }[] = [];
  for (let i = 0; i < (await rows.count()); i++) {
    const row = rows.nth(i);
    const label = squash(await row.locator('span.ant-typography').first().innerText());
    const [name, no] = label.split(' · ');
    const button = row.getByRole('button', { name: /^พิมพ์บัตรคิว/ });
    out.push({ row, name: name ?? label, no: no ?? '', button, buttonText: squash(await button.innerText()) });
  }
  return out;
}

/** แถวใบนำทางบนหน้าต่าง → { หน่วยบริการ, สถานที่, Order, ปุ่มพิมพ์ } */
async function readSlip(dialog: Locator) {
  return slipRows(dialog).evaluateAll((rows) =>
    rows.map((r) => {
      const texts = [...r.querySelectorAll('[class*="destination-details"] > *')].map((e) => (e.textContent ?? '').trim());
      return { unit: texts[0] ?? '', location: texts[1] ?? '', orders: texts[2] ?? '', printable: !!r.querySelector('button[aria-label="พิมพ์"]'), text: (r.textContent ?? '').replace(/\s+/g, ' ').trim() };
    }),
  );
}

async function fetchDestinations(page: Page, authorization: string, vn: string, en?: string): Promise<ApiDest[]> {
  const res = await page.request.get(`/cortex-api/visits/${vn}/visit-slip/destinations${en ? `?en=${en}` : ''}`, { headers: { authorization } });
  expect(res.ok(), `API destinations ตอบ ${res.status()}`).toBe(true);
  return (await res.json()) as ApiDest[];
}

/** แสดง PDF ชิดซ้าย (ย้าย overlay ของ showPdf ไปซ้าย ให้แสดงใบที่ 2 ทางขวาได้) */
async function moveOverlayLeft(p: Page) {
  await p.evaluate(() => {
    const el = document.querySelector('[data-pdf-overlay]') as HTMLElement | null;
    if (!el) return;
    el.removeAttribute('data-pdf-overlay');
    el.setAttribute('data-pdf-overlay-left', '');
    Object.assign(el.style, { right: 'auto', left: '12px' });
  });
}
async function hideAllPdf(p: Page) {
  await hidePdf(p);
  await p.evaluate(() => document.querySelector('[data-pdf-overlay-left]')?.remove()).catch(() => undefined);
}

async function closeVisits(page: Page, opened: Map<string, ErVisit>) {
  if (process.env.SBH2265_KEEP) return;
  for (const visit of opened.values()) {
    const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
      (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
      (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
    );
    test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
    console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
  }
}

test.describe('SBH-2265 ER: ปุ่มเมนูพิมพ์บัตรคิว (การเงิน / รับยา) + ใบนำทางไปจุดบริการ บน Order Summary (dev-x)', () => {
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

  // ================= ผู้ป่วย A: TC 001–012 =================
  test(
    'ผู้ป่วย A (ยา + Lab + X-ray + หัตถการ): ปุ่มเมนู · บัตรคิวการเงิน / รับยา · ใบนำทาง Lab / X-Ray / หัตถการ (TC 001–012)',
    { tag: ['@SBH-2265', '@SBH-2265-A', ...tags(1, 12)], annotation: notes(1, 12) },
    async ({ page, browser }) => {
      const { note, finish } = makeRunner(page);
      const authorization = trackAuthorization(page);
      const visit = await preparePatient(page, 'Pq2265A', [MED, LAB, XRAY], PROCS, 'SBH2265_A', note);
      const apiAll = await fetchDestinations(page, authorization(), visit.vn);
      note('ปลายทางจาก API (ไม่ส่ง en)', apiAll.map(destText).join(' · ') || '(ไม่มี)');
      await test.info().attach('API destinations ผู้ป่วย A (ไม่ส่ง en)', { body: JSON.stringify(apiAll, null, 2), contentType: 'application/json' });

      nurse = await openNurseWindow(browser, visit);
      const n = nurse;
      const run = makeRunner(n);
      const docs = captureGeneratedDocs(n);
      const prints = await capturePrintJobs(n);
      await openOrderSummary(n);

      // ---- TC-001 ----
      await startClip(n, 'TC-001');
      await run.soft(`${TC(1)} Order Summary มีปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง`, async () => {
        await expect(printMenuButton(n), 'ต้องมีปุ่ม "พิมพ์บัตรคิวและใบนำทาง ER"').toBeVisible();
        await markEvidence(expected(mainOf(n).getByText('ORDER FOR ONE DAY', { exact: true }).first(), 'หน้า Order Summary'), expected(printMenuButton(n), 'ปุ่มเมนูพิมพ์บัตรคิวและใบนำทาง'));
        await hold(n, 2_000);
      });

      // ---- TC-002 ----
      await startClip(n, 'TC-002');
      let dialog = printDialog(n);
      let uiDest: ApiDest[] = [];
      let uiUrl = '';
      let queues: Awaited<ReturnType<typeof readQueueRows>> = [];
      await run.soft(`${TC(2)} หน้าต่าง "พิมพ์บัตรคิวและใบนำทาง ER" มีคิวการเงิน + คิวรับยา พร้อมเลขคิวและปุ่มพิมพ์บัตรคิว`, async () => {
        ({ dialog, uiDest, uiUrl } = await openPrintDialog(n, 'ก่อนกด — ปุ่มเมนูพิมพ์'));
        queues = await readQueueRows(dialog);
        note(`${TC(2)} แถวคิว`, queues.map((q) => `${q.name} · ${q.no} [${q.buttonText}]`).join(' | ') || '(ไม่มี)');
        const fin = queues.find((q) => /การเงิน/.test(q.name));
        const phar = queues.find((q) => /รับยา/.test(q.name));
        const marks = [expected(dialog.locator('.ant-modal-title'), 'หน้าต่าง พิมพ์บัตรคิวและใบนำทาง ER'), expected(dialog.getByText('คิวรับยา การเงิน และบริการ', { exact: true }), 'section คิวรับยา การเงิน และบริการ')];
        for (const q of queues) marks.push(expected(q.row, `${q.name} · ${q.no} + ปุ่ม ${q.buttonText}`));
        await markEvidence(...marks);
        await hold(n, 2_000);
        expect(fin, 'ต้องมีแถวคิวการเงิน').toBeTruthy();
        expect(phar, 'ต้องมีแถวคิวรับยา').toBeTruthy();
        for (const q of [fin!, phar!]) {
          expect(q.no, `${q.name}: ต้องมีเลขคิว`).toMatch(/^[A-Z]+\d+$/);
          expect(q.buttonText, `${q.name}: ปุ่มต้องเป็น "พิมพ์บัตรคิว ${q.no}"`).toBe(`พิมพ์บัตรคิว ${q.no}`);
        }
      });

      // ---- TC-003 / TC-004 ----
      const cards: Record<string, Buffer | undefined> = {};
      for (const [no, re, label] of [[3, /การเงิน/, 'การเงิน'], [4, /รับยา/, 'รับยา']] as const) {
        await startClip(n, `TC-${pad(no)}`);
        await run.soft(`${TC(no)} กด พิมพ์บัตรคิว แถวคิว${label} → บัตรคิว${label} เลขคิวตรงกับหน้าต่าง`, async () => {
          if (!(await dialog.isVisible())) ({ dialog } = await openPrintDialog(n));
          const q = (await readQueueRows(dialog)).find((r) => re.test(r.name));
          expect(q, `ต้องมีแถวคิว${label}`).toBeTruthy();
          await markEvidence(expected(q!.row, `${q!.name} · ${q!.no}`), clicked(q!.button));
          await snapEvidence(n, `ก่อนกด — พิมพ์บัตรคิว${label}`);
          await clearEvidenceMarks(n);
          const since = Date.now();
          const jobsBefore = prints.jobs.length;
          await q!.button.click();
          const doc = await docs.next(/queues\/print/, since, 30_000);
          note(`${TC(no)} API`, `${doc.api} ${doc.status} · body ${doc.request} · ไฟล์ ${doc.files.map((f) => f.name).join(', ')}${doc.error ? ` · ${doc.error}` : ''}`);
          expect(doc.error, `API พิมพ์บัตรคิวต้องสำเร็จ`).toBeUndefined();
          const pdf = doc.files.find((f) => /\.pdf$/i.test(f.name))?.data ?? doc.files[0]?.data;
          expect(pdf, 'ต้องได้ไฟล์บัตรคิว').toBeTruthy();
          cards[label] = pdf;
          const job = await prints.next(jobsBefore, 15_000);
          note(`${TC(no)} งานพิมพ์ที่ส่งเครื่องพิมพ์`, job ? `${job.url.replace(/^https?:\/\/[^/]+/, '')} ${job.pdf.length} bytes` : '(ไม่มีงานพิมพ์ส่งเครื่องพิมพ์ใน 15 วินาที)');
          const text = (await pdfPages(pdf!)).join(' | ');
          note(`${TC(no)} ข้อความบนบัตร`, text.slice(0, 400));
          const overlay = await showPdf(n, pdf!, `บัตรคิว${label} (ER) — ${q!.no}`, 1, { fit: 'height', textLayer: true });
          const line = await pdfLineAt(overlay, q!.no);
          await markEvidence(expected(q!.row, `เลขคิวในหน้าต่าง ${q!.no}`), ...(line ? [expected(line, `เลขคิวบนบัตร ${q!.no}`)] : [expected(overlay, `${q!.no} · จริง: ไม่พบบนบัตร`)]));
          await hold(n, 2_500);
          await snapEvidence(n, `ผล — บัตรคิว${label}`);
          expect(text, `บัตรคิว${label}ต้องมีเลขคิว ${q!.no}`).toContain(q!.no);
          await clearEvidenceMarks(n);
          await hidePdf(n);
        });
      }

      // ---- TC-006 / 008 / 010 · TC-007 / 009 / 011 ----
      const slipPdf: Record<string, Buffer | undefined> = {};
      if (!(await dialog.isVisible())) ({ dialog, uiDest, uiUrl } = await openPrintDialog(n));
      const slip = await readSlip(dialog);
      note('ใบนำทางในหน้าต่าง', slip.map((s) => `${s.unit} / ${s.location} · ${s.orders}${s.printable ? '' : ' (ไม่มีปุ่มพิมพ์)'}`).join(' | ') || `(ไม่มี — ${squash(await slipSection(dialog).innerText())})`);
      note('API ที่หน้าต่างเรียก', `${uiUrl} → ${uiDest.map(destText).join(' · ') || '[]'}`);
      for (const [i, d] of DESTS.entries()) {
        const showNo = 6 + i * 2;
        const printNo = showNo + 1;
        await startClip(n, `TC-${pad(showNo)}`);
        let found: (typeof slip)[number] | undefined;
        await run.soft(`${TC(showNo)} หน้าต่างมีรายการใบนำทางไป${d.text} พร้อมปุ่มพิมพ์ (มี Order ${d.label})`, async () => {
          found = slip.find((s) => d.name.test(`${s.unit} ${s.location}`));
          const section = slipSection(dialog);
          await section.scrollIntoViewIfNeeded();
          const apiHit = apiAll.filter((a) => a.destinationKind === d.kind);
          const rows: CompareRow[] = [
            { label: `Order ${d.label} ของผู้ป่วย A`, values: ['มี', apiHit.length ? apiHit.flatMap((a) => a.orderNames).join(', ') : 'ไม่มีใน API'], same: true },
            { label: `ใบนำทาง ${d.text} ในหน้าต่าง`, values: ['มี + ปุ่มพิมพ์', found ? `${found.unit} / ${found.location}${found.printable ? ' + ปุ่มพิมพ์' : ' (ไม่มีปุ่มพิมพ์)'}` : 'ไม่มี'], same: !!found?.printable },
            { label: 'API ที่หน้าต่างเรียก (ส่ง en ของ ER)', values: ['มีปลายทาง', uiDest.map(destText).join(' · ') || '[] (ว่าง)'], same: uiDest.some((a) => a.destinationKind === d.kind) },
            { label: 'API เดียวกันไม่ส่ง en', values: ['-', apiHit.map(destText).join(' · ') || '[] (ว่าง)'], same: true },
          ];
          await showCompareTable(n, `${TC(showNo)} ใบนำทาง ${d.label}`, ['ที่ควรเป็น', 'ที่เห็น'], rows, { side: 'left', width: '560px' });
          if (found) {
            const row = slipRows(dialog).filter({ hasText: d.name }).first();
            await markEvidence(expected(row, `ใบนำทาง ${d.text}${found.printable ? ' + ปุ่มพิมพ์' : ''}`));
          } else {
            const empty = section.getByText(/ไม่มีจุดบริการถัดไป/);
            await markEvidence(expected((await empty.isVisible()) ? section : section, `ใบนำทาง ${d.text} · จริง: ไม่มี`));
          }
          await hold(n, 2_500);
          expect(found, `ต้องมีรายการใบนำทางไป ${d.text}`).toBeTruthy();
          expect(found!.printable, `ใบนำทาง ${d.text} ต้องมีปุ่มพิมพ์`).toBe(true);
        });
        await hideCompareTable(n);
        await clearEvidenceMarks(n);

        if (!found?.printable) {
          note(`${TC(printNo)}`, `ตรวจไม่ได้ — ไม่มีรายการใบนำทาง ${d.text} ในหน้าต่าง (${TC(showNo)} ไม่ผ่าน)`);
          continue;
        }
        await startClip(n, `TC-${pad(printNo)}`);
        await run.soft(`${TC(printNo)} พิมพ์ใบนำทาง ${d.label} → หน่วยบริการ / สถานที่ = ${d.text}`, async () => {
          const row = slipRows(dialog).filter({ hasText: d.name }).first();
          const btn = row.locator('button[aria-label="พิมพ์"]');
          await markEvidence(clicked(btn));
          await snapEvidence(n, `ก่อนกด — พิมพ์ใบนำทาง ${d.label}`);
          await clearEvidenceMarks(n);
          const before = prints.jobs.length;
          await btn.click();
          const job = await prints.next(before, 30_000);
          expect(job, 'กดพิมพ์แล้วต้องมีงานพิมพ์ใบนำทาง').toBeTruthy();
          slipPdf[d.label] = job!.pdf;
          const text = (await pdfPages(job!.pdf)).join(' | ');
          note(`${TC(printNo)} ข้อความบนใบนำทาง`, text.slice(0, 400));
          const overlay = await showPdf(n, job!.pdf, `ใบนำทาง ${d.label} (ER)`, 1, { fit: 'height', textLayer: true });
          const unit = await pdfLineAt(overlay, /หน่วยบริการ/);
          const place = await pdfLineAt(overlay, /สถานที่/);
          await markEvidence(...[unit, place].filter((x): x is Locator => !!x).map((l) => expected(l, d.text)));
          await hold(n, 2_500);
          await snapEvidence(n, `ผล — ใบนำทาง ${d.label}`);
          expect(text, `หน่วยบริการต้องเป็น ${d.text}`).toMatch(new RegExp(`หน่วยบริการ\\s*:\\s*${d.text.replace(/[()]/g, '\\$&')}`));
          expect(text, `สถานที่ต้องเป็น ${d.text}`).toMatch(new RegExp(`สถานที่\\s*:\\s*${d.text.replace(/[()]/g, '\\$&')}`));
          await clearEvidenceMarks(n);
          await hidePdf(n);
        });
      }

      // ---- TC-012 ----
      if (slipPdf.Lab) {
        await startClip(n, 'TC-012');
        await run.soft(`${TC(12)} ใบนำทาง Lab: หัว "ใบนำทาง" + บาร์โค้ด + ข้อมูลผู้ป่วยตรงกับ Patient Banner`, async () => {
          const text = (await pdfPages(slipPdf.Lab!)).join(' | ');
          const banner = squash(await n.locator('body').innerText()).slice(0, 2000);
          note(`${TC(12)} ข้อความใบนำทาง`, text.slice(0, 400));
          expect(text).toContain('ใบนำทาง');
          expect(text).toContain(visit.hn);
          expect(text).toContain(visit.vn);
          expect(banner).toContain(visit.hn);
        });
      } else {
        note(TC(12), 'ตรวจไม่ได้ — ไม่มีใบนำทาง Lab ให้พิมพ์ (TC-006 / 007 ไม่ผ่าน)');
      }
      await closePrintDialog(n);

      // ---- TC-005 ----
      await run.soft(`${TC(5)} บัตรคิวการเงินจาก ER มีหัวข้อและการจัดวางเหมือนบัตรคิวการเงินจาก OPD`, async () => {
        expect(cards['การเงิน'], 'ต้องมีบัตรคิวการเงินจาก TC-003').toBeTruthy();
        const [hn, vn, en] = OPD_VISIT;
        await n.goto(`/cortex/next/patients/${hn}?en=${en}&vn=${vn}&fromApp=opd&actions=dischargeForm&preset=opdDischargedV2`, { waitUntil: 'domcontentloaded' });
        await expect(mainOf(n).getByText('การจัดการหลังตรวจ', { exact: true })).toBeVisible({ timeout: 120_000 });
        const grid = mainOf(n).locator('[class*="discharge-display-queue-grid"]').first();
        await expect(grid).toBeVisible({ timeout: 60_000 });
        await grid.scrollIntoViewIfNeeded();
        await n.waitForTimeout(2_000);
        await startClip(n, 'TC-005');
        const finText = grid.getByText(/การเงิน|NUH/).first();
        const btn = finText.locator('xpath=following::button[1]');
        note(`${TC(5)} ตารางคิว OPD (HN ${hn})`, squash(await grid.innerText()));
        await markEvidence(expected(finText, 'คิวการเงิน OPD'), clicked(btn));
        await snapEvidence(n, 'ก่อนกด — พิมพ์บัตรคิวการเงิน OPD');
        await clearEvidenceMarks(n);
        const since = Date.now();
        await btn.click();
        const doc = await docs.next(/queues\/print/, since, 30_000);
        expect(doc.error, 'API พิมพ์บัตรคิว OPD ต้องสำเร็จ').toBeUndefined();
        const opdPdf = doc.files.find((f) => /\.pdf$/i.test(f.name))?.data ?? doc.files[0]?.data;
        expect(opdPdf, 'ต้องได้ไฟล์บัตรคิว OPD').toBeTruthy();
        const erLines = (await pdfPages(cards['การเงิน']!)).join(' ');
        const opdLines = (await pdfPages(opdPdf!)).join(' ');
        note(`${TC(5)} ข้อความบัตร ER`, erLines.slice(0, 400));
        note(`${TC(5)} ข้อความบัตร OPD`, opdLines.slice(0, 400));
        const left = await showPdf(n, cards['การเงิน']!, 'บัตรคิวการเงิน — ER (TC-003)', 1, { fit: 'height', textLayer: true });
        const erTitles = await left.locator('[data-pdf-line]').evaluateAll((els) => els.map((e) => (e as HTMLElement).title));
        await moveOverlayLeft(n);
        const right = await showPdf(n, opdPdf!, `บัตรคิวการเงิน — OPD (HN ${hn})`, 1, { fit: 'height', textLayer: true });
        const opdTitles = await right.locator('[data-pdf-line]').evaluateAll((els) => els.map((e) => (e as HTMLElement).title));
        // เทียบ "หัวข้อ" ทีละบรรทัด: ตัดตัวเลข / ชื่อ ออก (ค่าที่ต่างตามผู้ป่วย / เวลา)
        const shape = (s: string) => s.replace(/AUTO\s+\S+/g, '<ชื่อ>').replace(/^(สิทธิ\s*:).*/, '$1 <สิทธิ>').replace(/[A-Z]*\d[\d/:.,-]*/g, '#').replace(/\s+/g, ' ').trim();
        const rows: CompareRow[] = Array.from({ length: Math.max(erTitles.length, opdTitles.length) }, (_, i) => ({
          label: `บรรทัด ${i + 1}`,
          values: [erTitles[i] ?? '(ไม่มี)', opdTitles[i] ?? '(ไม่มี)'],
          same: shape(erTitles[i] ?? '') === shape(opdTitles[i] ?? ''),
        }));
        note(`${TC(5)} เทียบบรรทัด`, rows.map((r) => `${r.same ? '✓' : '✗'} ${r.values.join(' ⇄ ')}`).join(' | '));
        // หลัง moveOverlayLeft แผงซ้ายเปลี่ยน attribute เป็น data-pdf-overlay-left → `left` เดิมชี้แผงขวาแทน
        const leftPanel = n.locator('[data-pdf-overlay-left] [data-pdf-page]');
        await markEvidence(expected(leftPanel, 'บัตร ER'), expected(right.locator('[data-pdf-page]'), 'บัตร OPD'));
        await hold(n, 3_000);
        await snapEvidence(n, 'ผล — บัตรคิว ER เทียบ OPD');
        await clearEvidenceMarks(n);
        await showCompareTable(n, `${TC(5)} หัวข้อบนบัตรคิวการเงิน ER ⇄ OPD (ตัดตัวเลข / ชื่อออกก่อนเทียบ)`, ['ER', 'OPD'], rows, { side: 'bottom' });
        await hold(n, 3_000);
        await snapEvidence(n, 'ผล — ตารางเทียบหัวข้อ ER ⇄ OPD');
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' ⇄ ')}`), 'หัวข้อและการจัดวางต้องเหมือนกัน').toEqual([]);
      });
      await hideCompareTable(n);
      await hideAllPdf(n);

      run.finish();
      finish();
    },
  );

  // ================= ผู้ป่วย B: TC 013–015 =================
  test(
    'ผู้ป่วย B (ยาอย่างเดียว): ไม่มีใบนำทาง Lab / X-Ray / หัตถการ (TC 013–015)',
    { tag: ['@SBH-2265', '@SBH-2265-B', ...tags(13, 15)], annotation: notes(13, 15) },
    async ({ page, browser }) => {
      const { note, finish } = makeRunner(page);
      const authorization = trackAuthorization(page);
      const visit = await preparePatient(page, 'Pq2265B', [MED], [], 'SBH2265_B', note);
      const apiAll = await fetchDestinations(page, authorization(), visit.vn);
      note('ปลายทางจาก API (ไม่ส่ง en)', apiAll.map(destText).join(' · ') || '(ไม่มี)');

      nurse = await openNurseWindow(browser, visit);
      const n = nurse;
      const run = makeRunner(n);
      await openOrderSummary(n);
      for (const [i, d] of DESTS.entries()) {
        const no = 13 + i;
        await startClip(n, `TC-${pad(no)}`);
        await run.soft(`${TC(no)} ผู้ป่วยไม่มี Order ${d.label} → หน้าต่างไม่มีใบนำทางไป${d.text}`, async () => {
          const { dialog, uiDest, uiUrl } = await openPrintDialog(n, `ก่อนกด — ปุ่มเมนูพิมพ์ (ผู้ป่วย B)`);
          const slip = await readSlip(dialog);
          const hit = slip.find((s) => d.name.test(`${s.unit} ${s.location}`));
          note(`${TC(no)} ใบนำทางในหน้าต่าง`, slip.map((s) => `${s.unit} / ${s.location}`).join(' | ') || `(ไม่มี — ${squash(await slipSection(dialog).innerText())})`);
          note(`${TC(no)} API ที่หน้าต่างเรียก`, `${uiUrl} → ${uiDest.map(destText).join(' · ') || '[]'}`);
          const section = slipSection(dialog);
          await showCompareTable(n, `${TC(no)} ไม่มี Order ${d.label}`, ['ที่ควรเป็น', 'ที่เห็น'], [
            { label: `Order ${d.label} ของผู้ป่วย B (API ไม่ส่ง en)`, values: ['ไม่มี', apiAll.filter((a) => a.destinationKind === d.kind).map(destText).join(' · ') || 'ไม่มี'], same: !apiAll.some((a) => a.destinationKind === d.kind) },
            { label: `ใบนำทาง ${d.text} ในหน้าต่าง`, values: ['ไม่มี', hit ? `${hit.unit} / ${hit.location}` : 'ไม่มี'], same: !hit },
          ], { side: 'left', width: '560px' });
          await markEvidence(expected(section, hit ? `ไม่มี ${d.text} · จริง: มี` : `ไม่มีใบนำทาง ${d.text}`));
          await hold(n, 2_500);
          expect(hit, `ต้องไม่มีใบนำทางไป ${d.text}`).toBeUndefined();
        });
        await hideCompareTable(n);
        await clearEvidenceMarks(n);
        await closePrintDialog(n);
      }
      run.finish();
      finish();
    },
  );
});
