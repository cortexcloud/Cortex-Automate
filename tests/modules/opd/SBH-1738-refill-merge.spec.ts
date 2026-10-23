import fs from 'node:fs';
import type { Browser, Locator, Page, Response } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { checkInOpdVisit, openOpdVisit, orderAlert, scheduleWalkInRequest } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// การ์ด SBH-1738 [Pharmacy][สร้างใบยา] ปรับเงื่อนไข การสร้าง/Merge ใบยา Refill — EXE SBH-2632 → TC-SBH-1738-001–010 (SBH-2635–2644)
// Task เติมยา 1 แถว = Encounter 1 ตัว × รอบ 1 รอบ (แพทย์ผู้สั่ง / คลินิก ของ Encounter) → "Task ยา A" กับ "Task ยา B" แยกกันต้องมาจากคนละ Encounter
// Pre-condition ต่อผู้ป่วย (ผู้ใช้เลือก 20 ต.ค. 2026 "ปิด Visit แล้วเปิด Visit Refill ใหม่"): ผู้ป่วย AUTO ใหม่ → Visit OPD MED (EN1) + เช็คอิน → แก้ไข Visit Walk-in ไป SBH - ห้องตรวจสระบุรี (EN2) → ลงตารางแพทย์ + เช็คอิน →
//   CPOE แต่ละ EN สั่งยา + แผน Refill 3 รอบ → ส่งคำสั่ง → ปิด Visit ที่การเงิน (Task ยังอยู่ — ตรวจแล้ว) → Visit ใหม่ บริการ "รับยาต่อเนื่อง (Refill)"
// คนไข้ 1: EN1 ยา A (แพทย์ 1) · EN2 ยา B (แพทย์ผู้สั่ง = แพทย์ 2 · รอบที่ 1 ตั้งเป็นเมื่อวาน = Task เลยกำหนด)
// คนไข้ 2: EN1 ยา A · EN2 ยา A (ยาเดียวกันจาก Order Refill คนละใบ — TC-008)
// ลำดับ (ไม่หยิบรอบหลังก่อนรอบก่อนของ Encounter เดียวกัน): 002 B 1/3 → 004 / 007 A 1/3 + B 2/3 (ดูหน้าสร้างใบยา ไม่กดสร้าง) → 001 สร้าง → 005 → 006 → 010 → 003 A 2/3 → 008 (คนไข้ 2 ดูอย่างเดียว) → 009
// TC-002: ตั้งรอบย้อนหลังไม่ได้ → ใช้ Task ที่เลยกำหนดของ HN 6904101 (ผู้ใช้อนุญาต 20 ต.ค. 2026)
// บัญชีเดียว Super_User ทำทั้งฝั่งแพทย์ / เวชระเบียน / การเงิน / ห้องยา · คลิป 1 ไฟล์ต่อ TC (R61) · TC ที่ไม่ผ่านไม่หยุดเทส (soft)
// ทำต่อกับผู้ป่วยเดิม: SBH1738_P1 / SBH1738_P2 = <HN>,<VN OPD>,<EN1>,<EN2>,<VN Refill> (ไม่มี VN Refill = ทำต่อจากขั้นสั่งยา) · SBH1738_ORDERED=P1EN1 (ข้ามขั้นสั่งยา) · SBH1738_SKIP=002,004 (ข้าม TC)
// รัน dev-x: npx playwright test --headed --grep @SBH-1738 --output=.cache/run-1738

const DRUG_A = { code: 'med0000007', name: 'GPO-L-ONE' };
const DRUG_B = { code: 'med0000005', name: 'BETAMED' };
const CLINIC1 = 'ห้องตรวจโรคอายุรกรรมทั่วไป';
const CLINIC2 = { search: 'SBH', name: 'SBH - ห้องตรวจสระบุรี', short: 'ห้องตรวจสระบุรี' };
const DOCTOR1 = 'นาย ทดสอบ มานะ';
const DOCTOR2 = 'ดร. วิชัย รัตน์ เอื้อเฟื้อ'; // บัญชี Doctor — ช่อง "แพทย์ผู้สั่ง" ของ CPOE เปลี่ยนแพทย์ของ Order ไม่ได้ (Task ยังเป็นผู้ที่ล็อกอิน) → สั่งจากหน้าต่างบัญชี Doctor
const REFILL_SERVICE = 'รับยาต่อเนื่อง (Refill)';
const PAST_DUE_HN = '6904101';
const TC = {
  '001': 'TC-001 (SBH-2635)', '002': 'TC-002 (SBH-2636)', '003': 'TC-003 (SBH-2637)', '004': 'TC-004 (SBH-2638)', '005': 'TC-005 (SBH-2639)',
  '006': 'TC-006 (SBH-2640)', '007': 'TC-007 (SBH-2641)', '008': 'TC-008 (SBH-2642)', '009': 'TC-009 (SBH-2643)', '010': 'TC-010 (SBH-2644)',
} as const;
const ISSUES = ['SBH-1738', 'SBH-2632', ...Array.from({ length: 10 }, (_, i) => `SBH-${2635 + i}`)];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();
const isGraphql = (r: Response, op: string) => r.request().method() === 'POST' && r.url().includes('/graphql') && (r.request().postData() ?? '').includes(op);
const STATUS: Record<string, string> = { PENDING: 'ยังไม่เติม', IN_PROGRESS: 'กำลังเติมยา', COMPLETED: 'เติมยาแล้ว', CANCELLED: 'ยกเลิกแล้ว' };
const DUMP = '.cache/sbh-1738';

/** วันที่ (เวลาเครื่อง) + n วัน → iso 2026-10-26 (ช่องวันที่ของห้องยา) · be 2569-10-26 (ปฏิทินหน้าต่าง Refill) · th 26/10/2569 */
function dayPlus(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return { iso: `${d.getFullYear()}-${mm}-${dd}`, be: `${d.getFullYear() + 543}-${mm}-${dd}`, th: `${dd}/${mm}/${d.getFullYear() + 543}`, month: d.getMonth() };
}

/** Task เติมยาจาก API `medication-refill-with-detail` */
interface RefillTask {
  id: number; iteration: number; sourceCount: number; sourceVn: string; sourceEn: string; scheduledRefillDate: string; latestStatusCode: string; prescriptionId: string | null;
  medications: { productCode: string; name: string }[]; clinic?: { name?: string }; practitioner?: { display?: string };
}
const taskDate = (t: RefillTask) => {
  const local = new Date(new Date(t.scheduledRefillDate).getTime() + 7 * 3_600_000); // เวลาไทย
  return `${String(local.getUTCDate()).padStart(2, '0')}/${String(local.getUTCMonth() + 1).padStart(2, '0')}/${local.getUTCFullYear() + 543}`;
};
const isPast = (t: RefillTask) => taskDate(t) !== dayPlus(0).th && new Date(t.scheduledRefillDate).getTime() < Date.now();
const taskText = (t: RefillTask) => `${t.sourceEn} ${t.iteration}/${t.sourceCount} ${taskDate(t)} ${STATUS[t.latestStatusCode] ?? t.latestStatusCode} [${t.medications.map((m) => m.productCode).join(', ')}] ${t.clinic?.name ?? '-'} · ${t.practitioner?.display ?? '-'}${t.prescriptionId ? ` · ใบยา ${t.prescriptionId}` : ''}`;

/** ผู้ป่วยของการ์ด: Visit OPD (EN1 คลินิก MED · EN2 คลินิก SBH) ที่ปิดแล้ว + Visit Refill วันนี้ */
interface Patient { label: string; hn: string; vn: string; en1: string; en2: string; vnR: string }

/** init script: จดแจ้งเตือนทุกตัว (หายเองใน ~4.5 วินาที) */
function recordNotices() {
  const w = window as unknown as { __notices: string[] };
  w.__notices = [];
  new MutationObserver(() => {
    for (const el of document.querySelectorAll('.ant-notification-notice:not([data-seen]), .ant-message-notice:not([data-seen])')) {
      el.setAttribute('data-seen', '1');
      w.__notices.push((el.textContent ?? '').trim());
    }
  }).observe(document, { childList: true, subtree: true });
}
const notices = (page: Page) => page.evaluate(() => (window as unknown as { __notices?: string[] }).__notices ?? []).catch(() => [] as string[]);
async function waitNotice(page: Page, before: number, pattern: RegExp, timeout = 20_000): Promise<string> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const found = (await notices(page)).slice(before).find((text) => pattern.test(text));
    if (found) return found;
    await page.waitForTimeout(250);
  }
  return '';
}

/** หน้าต่างบัญชี Doctor (ดร. วิชัย) — คลิป video-Doctor.webm · ปิดด้วย finishVideo + ปิด context */
async function openDoctorWindow(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: authFile('Doctor'), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await cacheAppAssets(context);
  await context.addInitScript(recordNotices);
  const page = await context.newPage();
  await page.goto('/cortex/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await trackVideo(page, 'Doctor');
  return page;
}

test.describe('SBH-1738 สร้าง / Merge ใบยา Refill หลาย Task', () => {

  test(
    'ผู้ป่วย AUTO ใหม่ 2 ราย (2 Encounter · Visit Refill): Merge Task เติมยาเป็นใบยาเดียว · รอบ / แพทย์ / คลินิก ของแต่ละรายการ · กันการ Merge ข้ามคนไข้ / ซ้ำ',
    { tag: ['@SBH-1738', ...ISSUES.slice(1).map((id) => `@${id}`)], annotation: ISSUES.map(linear) },
    async ({ page, browser }) => {
      test.setTimeout(3_600_000);
      fs.mkdirSync(DUMP, { recursive: true });
      const main = page.getByRole('main');
      const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
      const authorization = trackAuthorization(page);
      const failures: string[] = [];
      const skipTc = (process.env.SBH1738_SKIP ?? '').split(',').filter(Boolean);
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      const soft = (title: string, body: () => Promise<void>) =>
        checkStep(page, title, body).then(
          () => true,
          (error: unknown) => {
            failures.push(`${title} — ${firstLine(error)}`);
            console.log(`    ✗ ${title} — ${firstLine(error)}`);
            return false;
          },
        );
      const skip = (title: string, why: string) => {
        failures.push(`${title} — ตรวจไม่ได้ (${why})`);
        note('ตรวจไม่ได้', `${title} — ${why}`);
      };
      const dump = async (name: string) => fs.writeFileSync(`${DUMP}/${name}.txt`, await main.innerText().catch(() => ''));
      await page.addInitScript(recordNotices);

      // ── API (อ่านอย่างเดียว) ──
      const fetchTasks = async (hn: string): Promise<RefillTask[]> => {
        // ยังไม่เคยเปิดหน้าแอป (ทำต่อกับผู้ป่วยเดิมทุกราย) = ยังไม่มี token ให้ยืม → เปิดหน้าห้องยาก่อน
        if (!(() => { try { return !!authorization(); } catch { return false; } })()) {
          const seen = page.waitForRequest((r) => r.url().includes('/cortex-api/') && !!r.headers()['authorization'], { timeout: 90_000 });
          await page.goto('/cortex/pharmacy/select-location', { waitUntil: 'domcontentloaded', timeout: 90_000 });
          await seen;
        }
        const res = await page.request.get(`/generated-emr-api/medication-refill-with-detail?page=1&perPage=200&filter[hn][equals]=${hn}&sort=scheduledRefillDate.asc`, { headers: { authorization: authorization() } });
        expect(res.status(), 'อ่าน Task เติมยาจาก API').toBe(200);
        return (((await res.json()) as { data?: RefillTask[] }).data ?? []).sort((a, b) => a.sourceEn.localeCompare(b.sourceEn) || a.iteration - b.iteration);
      };
      const taskOf = (tasks: RefillTask[], en: string, iteration: number) => tasks.find((t) => t.sourceEn === en && t.iteration === iteration);

      // ── ตัวช่วยฝั่ง CPOE ──
      const makeCpoe = (pg: Page) => {
        const main = pg.getByRole('main');
        const options = pg.locator('.ant-select-dropdown:visible .ant-select-item-option');
      const refillButton = main.getByRole('button', { name: /^refill/i });
      const dialog = pg.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' });
      const confirmButton = dialog.getByRole('button', { name: 'ยืนยัน', exact: true });
      const cancelButton = dialog.getByRole('button', { name: 'ยกเลิก', exact: true });
      const roundHeaders = dialog.getByText(/^เติมยาครั้งที่ \d+$/);
      const drugRowInDialog = (name: string) => dialog.locator('tbody tr').filter({ hasText: name }).first();
      const roundInputs = async (name: string): Promise<Locator[]> => {
        const rounds = await roundHeaders.count();
        const all = drugRowInDialog(name).locator('input:not([disabled])');
        const n = await all.count();
        return Array.from({ length: n }, (_, i) => all.nth(i)).slice(Math.max(0, n - rounds));
      };
      const dispenseNow = (name: string) => drugRowInDialog(name).locator('input[disabled]').first();
      const basketRow = (code: string) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      const sendButton = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
      const doctorSelect = main.getByText('แพทย์ผู้สั่ง', { exact: true }).locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');

      const closeLeftPanels = async () => {
        for (const name of ['OPD', 'ประวัติการรักษา']) {
          const tab = pg.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
          if (await tab.count()) await tab.first().locator('.dv-default-tab-action').click().catch(() => undefined);
        }
        await pg.mouse.move(700, 1000);
      };
      /** หน้า EMR (CPOE) ของ Encounter ที่ระบุ — เปิดด้วย URL (?en=&vn=) */
      const openEmr = async (p: Patient, en: string) => {
        await pg.goto(`/cortex/next/patients/${p.hn}?en=${en}&vn=${p.vn}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await expect(main.getByText(`VN ${p.vn}`, { exact: true }).first(), 'เปิดหน้า EMR แล้วต้องเห็นแถบ Visit').toBeVisible({ timeout: 90_000 });
        await expect(main.getByText(en, { exact: true }).first(), `แถบ Visit ต้องเป็น Encounter ${en}`).toBeVisible({ timeout: 30_000 });
        await expect(main.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
        await pg.waitForTimeout(2_500);
        await closeLeftPanels();
      };
      /** ช่อง "แพทย์ผู้สั่ง" ของ CPOE → เลือกแพทย์ + เอาคนอื่นออก */
      const setOrderingDoctor = async (doctor: string) => {
        await expect(doctorSelect).toBeVisible({ timeout: 30_000 });
        const before = squash(await doctorSelect.innerText());
        if (before === doctor) {
          note('แพทย์ผู้สั่ง (CPOE)', `เป็น ${doctor} อยู่แล้ว`);
          return;
        }
        await doctorSelect.click();
        const option = options.filter({ hasText: doctor }).first();
        await expect(option).toBeVisible({ timeout: 10_000 });
        await option.click();
        await pg.keyboard.press('Escape');
        const others = doctorSelect.locator('.ant-select-selection-item').filter({ hasNotText: doctor });
        for (let i = 0; i < 3 && (await others.count()); i++) {
          await others.first().locator('.ant-select-selection-item-remove').click();
          await pg.waitForTimeout(500);
        }
        await expect(doctorSelect).toContainText(doctor);
        note('แพทย์ผู้สั่ง (CPOE)', `${before} → ${squash(await doctorSelect.innerText())}`);
        await markEvidence(filled(doctorSelect));
        await snapEvidence(pg, `กรอก — แพทย์ผู้สั่ง ${doctor}`);
      };
      const addDrug = async (drug: { code: string; name: string }, total: string, weeks: string) => {
        await addMedicineToCart(pg, drug.code, async () => {
          const period = main.getByRole('spinbutton', { name: 'ระยะเวลาการใช้' });
          await period.fill(weeks);
          await period.press('Tab');
          const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
          await qty.fill(total);
          await qty.press('Tab');
          await expect(qty).toHaveValue(total);
          await markEvidence(filled(qty));
          await snapEvidence(pg, `กรอก — ยา ${drug.code} ยอดรวม ${total}`);
        });
        await expect(basketRow(drug.code)).toBeVisible({ timeout: 30_000 });
      };
      const openRefillDialog = async (name: string) => {
        await expect(refillButton).toBeVisible({ timeout: 30_000 });
        await markEvidence(clicked(refillButton));
        await snapEvidence(pg, 'ก่อนกด — ปุ่ม refill');
        await refillButton.click();
        await expect(dialog, 'กดปุ่ม refill แล้วต้องเปิดหน้าต่าง "จัดการการเติมยา (Refill)"').toBeVisible({ timeout: 20_000 });
        await expect(drugRowInDialog(name)).toBeVisible({ timeout: 20_000 });
        await pg.waitForTimeout(1_200);
      };
      const fillRounds = async (drug: { name: string }, values: string[], now: string) => {
        const period = dialog.getByRole('spinbutton').first();
        if ((await roundHeaders.count()) < values.length && !(await period.inputValue())) {
          await period.fill('7');
          await period.press('Tab');
          await markEvidence(filled(period));
        }
        const add = dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
        for (let i = 0; i < 6 && (await roundHeaders.count()) < values.length; i++) {
          await add.click();
          await pg.waitForTimeout(500);
        }
        await expect(roundHeaders, `ต้องมี ${values.length} รอบ`).toHaveCount(values.length, { timeout: 5_000 });
        const inputs = await roundInputs(drug.name);
        for (let i = 0; i < values.length; i++) {
          await inputs[i].fill(values[i]);
          await inputs[i].press('Tab');
        }
        await expect(dispenseNow(drug.name), `จ่ายครั้งนี้ของ ${drug.name} ต้องเป็น ${now}`).toHaveValue(now);
        await markEvidence(...inputs.map(filled), expected(dispenseNow(drug.name)));
        await holdForClip(pg);
      };
      const roundDates = async () => (await dialog.locator('.ant-picker input').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value))).join(' · ');
      /** ปฏิทินรอบที่ 1 → เลือกเมื่อวาน (Task เลยกำหนดสำหรับ TC-002) */
      const setFirstRoundYesterday = async () => {
        const y = dayPlus(-1);
        const box = dialog.locator('.ant-picker input:not([disabled])').first();
        const before = await roundDates();
        await box.click();
        const picker = pg.locator('.ant-picker-dropdown:visible');
        await expect(picker).toBeVisible({ timeout: 5_000 });
        const cell = picker.locator(`td[title="${y.be}"]`).first();
        if (!(await cell.isVisible().catch(() => false))) await picker.locator('.ant-picker-header-prev-btn').first().click();
        await expect(cell, `ปฏิทินต้องมีวันที่ ${y.be}`).toBeVisible({ timeout: 5_000 });
        await markEvidence(clicked(cell));
        await snapEvidence(pg, `กด — รอบที่ 1 วันที่ ${y.th} (เมื่อวาน)`);
        await cell.click();
        await pg.waitForTimeout(800);
        note('วันที่ของแต่ละรอบ (ตั้งรอบที่ 1 เป็นเมื่อวาน)', `${before} → ${await roundDates()}`);
        await markEvidence(filled(box));
        await holdForClip(pg);
      };
      const saveRefillPlan = async (tag: string) => {
        const before = (await notices(pg)).length;
        await markEvidence(clicked(confirmButton));
        await snapEvidence(pg, `ก่อนกด — ยืนยันแผน Refill (${tag})`);
        await confirmButton.click();
        const text = await waitNotice(pg, before, /refill|เติมยา|กรุณา|ผิดพลาด|Err|วันที่/i);
        note(`แจ้งเตือนหลังยืนยันแผน (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        expect(text, 'ยืนยันแผนแล้วต้องขึ้นแจ้งเตือนสร้างแผนเติมยาสำเร็จ').toMatch(/successfully|สำเร็จ/i);
        await expect(dialog).toBeHidden({ timeout: 15_000 });
      };
      const sendOrders = async (tag: string) => {
        const before = (await notices(pg)).length;
        await markEvidence(clicked(sendButton));
        await snapEvidence(pg, `ก่อนกด — ส่งคำสั่ง (${tag})`);
        await sendButton.click();
        // ยาที่มีรอบเติมยาวันก่อน (รอบที่ 1 = เมื่อวาน) เด้ง Drug Alert "Drug Duplication" (ยาตัวเดียวกัน · MED_REFILL) → ระบุเหตุผล → ยืนยันการสั่งออเดอร์
        const alert = orderAlert(pg);
        const popped = await Promise.race([
          alert.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false),
          waitNotice(pg, before, /ส่งคำสั่ง/, 20_000).then(() => false),
        ]);
        if (popped) {
          note(`Drug Alert หลังส่งคำสั่ง (${tag})`, squash(await alert.innerText()).slice(0, 400));
          const reasons = await alert.getByRole('textbox').all();
          for (const reason of reasons) await reason.fill('ทดสอบระบบ SBH-1738');
          const ok = alert.getByRole('button', { name: 'ยืนยันการสั่งออเดอร์' });
          await markEvidence(alerted(alert), ...reasons.map(filled), clicked(ok));
          await snapEvidence(pg, `แจ้งเตือน — Drug Alert (${tag})`);
          await ok.click();
          await expect(alert).toBeHidden({ timeout: 15_000 });
        }
        const text = await waitNotice(pg, before, /ส่งคำสั่ง/, 60_000);
        note(`แจ้งเตือนหลังส่งคำสั่ง (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        expect(text, 'ส่งคำสั่งแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/สำเร็จ/);
        await holdForClip(pg);
      };
      /** CPOE ของ Encounter: (แพทย์ผู้สั่ง) → ยา + แผน Refill 3 รอบ รอบละ 7 (ยอด 28 / 4 สัปดาห์) → (รอบที่ 1 = เมื่อวาน) → ยืนยัน → ส่งคำสั่ง · คืน true ถ้าตั้งรอบย้อนหลังได้ */
      const orderRefill = async (p: Patient, en: string, drug: { code: string; name: string }, tag: string, opts: { doctor?: string; pastFirst?: boolean } = {}) => {
        await openEmr(p, en);
        if (opts.doctor) await setOrderingDoctor(opts.doctor);
        await addDrug(drug, '28', '4');
        await openRefillDialog(drug.name);
        await fillRounds(drug, ['7', '7', '7'], '7');
        let past = false;
        if (opts.pastFirst) {
          try {
            await setFirstRoundYesterday();
            await saveRefillPlan(`${tag} รอบที่ 1 เมื่อวาน`);
            past = true;
          } catch (error) {
            note(`${tag} ตั้งรอบที่ 1 เป็นเมื่อวานไม่ได้`, firstLine(error));
            await snapEvidence(pg, `ตั้งรอบที่ 1 ย้อนหลังไม่ได้ (${tag})`);
            if (await dialog.isVisible()) await cancelButton.click();
            await expect(dialog).toBeHidden({ timeout: 10_000 });
            await openRefillDialog(drug.name);
            await fillRounds(drug, ['7', '7', '7'], '7');
          }
        }
        if (!past) await saveRefillPlan(tag);
        await sendOrders(tag);
        return past;
      };
        return { orderRefill, openEmr };
      };
      const cpoe = makeCpoe(page);

      // ── Pre-condition: ผู้ป่วย + 2 Encounter + สั่งยา + ปิด Visit + Visit Refill ──
      /** opts.twoClinics = เพิ่ม EN2 (Walk-in คลินิก SBH) · opts.tasks = จำนวน Task ที่ต้องเกิดหลังสั่งยา */
      const prepare = async (envName: string, prefix: string, label: string, plan: (p: Patient) => Promise<void>, opts = { twoClinics: true, tasks: 6 }): Promise<Patient> => {
        const [hn0, vn0, en10, en20, vnR0] = (process.env[envName] ?? '').split(',');
        if (vnR0) {
          note(label, `ผู้ป่วยเดิม HN ${hn0} · ${vn0} · EN1 ${en10} · EN2 ${en20 || '-'} · Visit Refill ${vnR0}`);
          return { label, hn: hn0, vn: vn0, en1: en10, en2: en20, vnR: vnR0 };
        }
        const p: Patient = { label, hn: hn0 ?? '', vn: vn0 ?? '', en1: en10 ?? '', en2: en20 ?? '', vnR: '' };
        // ทำต่อจากขั้นสั่งยา: <HN>,<VN>,<EN1>,<EN2> (ลงทะเบียน + Encounter + เช็คอินแล้ว · ผู้ป่วย Encounter เดียวใส่ EN2 ว่าง)
        if (p.en1) note(label, `ผู้ป่วยเดิม (ยังไม่สั่งยา) HN ${p.hn} · ${p.vn} · EN1 ${p.en1} · EN2 ${p.en2 || '-'}`);
        else await registerWithTwoClinics(p, prefix, label, opts.twoClinics);
        await plan(p);
        return finishPrepare(p, envName, label, opts.tasks);
      };
      const registerWithTwoClinics = async (p: Patient, prefix: string, label: string, twoClinics: boolean) => {
        const patient = newTestPatient(prefix);
        let newVisitEnabled = false;
        await checkStep(page, `Pre-condition ${label} ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน`, async () => {
          await gotoReception(page);
          await markEvidence(clicked(newPatientButton(page)));
          await fillNewPatientForm(page, patient);
          const f = receptionFrame(page);
          const save = saveNewPatientButton(page);
          await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await markEvidence(filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), clicked(save));
          await snapEvidence(page, `ก่อนกด — บันทึกผู้ป่วยใหม่ (${label})`);
          p.hn = await saveNewPatient(page);
          newVisitEnabled = await expectPatientInfo(page);
        });
        await checkStep(page, `Pre-condition ${label} เปิด Visit OPD แผนกอายุรกรรม (EN1)`, async () => {
          if (newVisitEnabled) await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          p.vn = opd.vn;
          p.en1 = opd.en;
          note(label, `${patient.firstName} ${patient.familyName} · HN ${p.hn} · ${p.vn} · EN1 ${p.en1} · ${opd.clinic} · ${opd.doctor}`);
        });
        await checkStep(page, `Pre-condition ${label} เช็คอิน EN1 จากรายการผู้ป่วยนอก`, async () => {
          await selectOpdUnit(page);
          const row = await opdListRow(page, p.hn);
          await markEvidence(expected(row.getByText(`HN ${p.hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
          await snapEvidence(page, `ก่อนกด — เช็คอิน EN1 (${label})`);
          await checkInFromOpdList(page, row);
        });
        if (!twoClinics) return;
        await checkStep(page, `Pre-condition ${label} แก้ไข Visit → Walk-in ไป ${CLINIC2.name} (EN2) → ลงตารางแพทย์ → เช็คอิน`, async () => {
          const bodies: string[] = [];
          const listen = async (r: Response) => {
            if (isGraphql(r, 'UpdateVisitWithAttendance')) bodies.push(await r.text().catch(() => ''));
          };
          page.on('response', listen);
          await page.goto(`/cortex/next/patients/${p.hn}?actions=editVisit&editVN=${p.vn}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
          await expect(main.getByText(/^รายการเข้ารับบริการ/)).toBeVisible({ timeout: 90_000 });
          await page.waitForTimeout(2_500);
          const panel = main.locator('div').filter({ has: page.getByText(/^รายการเข้ารับบริการ/) }).filter({ has: page.getByText('Walk-in ไป') }).last();
          const clinicBox = main.getByText('Walk-in ไป').first().locator('xpath=following::input[@role="combobox"][1]');
          await clinicBox.fill(CLINIC2.search);
          const option = options.filter({ hasText: CLINIC2.name }).first();
          await expect(option).toBeVisible({ timeout: 15_000 });
          await markEvidence(filled(clinicBox), clicked(option));
          await snapEvidence(page, `ก่อนกด — Walk-in ไป ${CLINIC2.name} (${label})`);
          await option.click();
          const row = panel.getByRole('row').filter({ hasText: CLINIC2.name }).filter({ visible: true }).first();
          await expect(row, 'ต้องมีแถวเข้ารับบริการของคลินิกที่ 2').toBeVisible({ timeout: 30_000 });
          await page.mouse.move(700, 700);
          const save = main.getByRole('button', { name: /^(save )?บันทึก$/ }).filter({ visible: true }).last();
          await markEvidence(expected(row), clicked(save));
          await snapEvidence(page, `ก่อนกด — บันทึก Visit (คลินิกที่ 2 · ${label})`);
          await save.click();
          await expect.poll(() => bodies.join(' ').match(/"en":"(E\d+)"/)?.[1] ?? '', { message: 'บันทึกแล้วต้องได้ EN ของคลินิกที่ 2', timeout: 30_000 }).not.toBe('');
          page.off('response', listen);
          p.en2 = bodies.join(' ').match(/"en":"(E\d+)"/)![1];
          const scheduled = await scheduleWalkInRequest(page, p.hn);
          const queue = await checkInOpdVisit(page, { hn: p.hn, vn: p.vn, en: p.en2 } as never);
          note(`${label} EN2`, `${p.en2} · ${CLINIC2.name} · ลงตาราง ${scheduled.doctor} ${scheduled.slot} · เช็คอิน ${queue}`);
          console.log(`    ทำต่อ (ก่อนสั่งยา): ${label} HN ${p.hn} · ${p.vn} · EN1 ${p.en1} · EN2 ${p.en2}`);
        });
      };
      const finishPrepare = async (p: Patient, envName: string, label: string, total: number): Promise<Patient> => {
        await checkStep(page, `Pre-condition ${label} Task เติมยาหลังสั่งยา (API)`, async () => {
          const tasks = await fetchTasks(p.hn);
          note(`${label} Task เติมยา`, tasks.map(taskText).join(' || ') || '(ไม่มี)');
          expect(tasks, `ต้องมี Task ${total} รายการ`).toHaveLength(total);
          if (p.en2) expect(tasks.filter((t) => t.sourceEn === p.en2), 'EN2 ต้องมี Task 3 รอบ').toHaveLength(3);
        });
        await checkStep(page, `Pre-condition ${label} ปิด Visit ที่การเงิน`, async () => {
          const closed = await closeVisitAtCashier(page, p.hn, p.vn, async (close) => {
            await markEvidence(clicked(close));
            await snapEvidence(page, `ก่อนกด — ปิด Visit (${label})`);
          });
          note(`${label} ปิด Visit ${p.vn}`, `${closed.result}${closed.outstanding ? ` · ค้างชำระ ${closed.outstanding}` : ''}`);
          const after = await fetchTasks(p.hn);
          expect(after.filter((t) => t.latestStatusCode === 'PENDING'), `ปิด Visit แล้ว Task ต้องยังเป็น ยังไม่เติม ครบ ${total} รายการ`).toHaveLength(total);
        });
        await checkStep(page, `Pre-condition ${label} Visit ใหม่ Walk-in บริการ "${REFILL_SERVICE}"`, async () => {
          await page.goto(`/cortex/next/patients/${p.hn}?actions=createVisit`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
          await expect(main.getByText(/^รายการเข้ารับบริการ/)).toBeVisible({ timeout: 90_000 });
          await page.waitForTimeout(2_500);
          const serviceSelect = main.getByText('หรือรับบริการ', { exact: true }).locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
          await serviceSelect.click();
          await page.keyboard.type('รับยาต่อเนื่อง');
          const option = options.filter({ hasText: REFILL_SERVICE }).first();
          await expect(option).toBeVisible({ timeout: 10_000 });
          await option.click();
          const visitRow = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: 'Walk-in' }).first();
          await expect(visitRow, 'เลือกบริการแล้วต้องมีแถวร่าง Walk-in').toContainText(REFILL_SERVICE, { timeout: 10_000 });
          const create = main.getByRole('button', { name: 'สร้าง', exact: true });
          await markEvidence(filled(visitRow), clicked(create));
          await snapEvidence(page, `ก่อนกด — สร้าง Visit Refill (${label})`);
          const res = page.waitForResponse((r) => isGraphql(r, 'CreateVisit'), { timeout: 60_000 });
          await create.click();
          const body = (await (await res).json()) as { data?: { createVisit?: { visit?: { vn: string; encounters?: { en: string }[] } } }; errors?: { message: string }[] };
          p.vnR = body.data?.createVisit?.visit?.vn ?? '';
          note(`${label} Visit Refill`, `${p.vnR || '-'} · EN ${body.data?.createVisit?.visit?.encounters?.map((e) => e.en).join(', ') || '-'}${body.errors ? ` · errors ${body.errors.map((e) => e.message).join(' · ')}` : ''}`);
          expect(p.vnR, 'สร้าง Visit Refill ต้องได้ VN').toBeTruthy();
          await page.waitForTimeout(2_000);
          console.log(`    ทำต่อกับรายเดิม: ${envName}=${p.hn},${p.vn},${p.en1},${p.en2},${p.vnR}`);
        });
        return p;
      };

      // ── ตัวช่วยฝั่งห้องยา ──
      const createButton = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
      const goButton = main.getByRole('button', { name: /นำไปสร้างใบยา/ }).first();
      const gotoPharmacy = async () => {
        await page.goto('/cortex/pharmacy/select-location', { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await main.getByRole('combobox').first().click();
        await options.filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
        await page.waitForTimeout(800);
        await main.getByRole('combobox').nth(1).click();
        await page.waitForTimeout(800);
        await page.keyboard.press('Enter'); // ช่องบริการตัวแรก
        await page.getByRole('button', { name: 'ส่ง' }).click();
        await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
      };
      /** แท็บ Order เติมยา → สถานะทั้งหมด · ช่วงวันที่ -30 ถึง +60 วัน · ค้น HN (หรือส่วนของ HN) */
      const openRefillTab = async (search: string) => {
        await gotoPharmacy();
        await page.getByRole('tab', { name: /Order เติมยา/ }).click();
        const end = main.getByRole('textbox', { name: 'วันที่สิ้นสุด' });
        await expect(end).toBeVisible({ timeout: 30_000 });
        const statusSelect = main.locator('.ant-select').filter({ hasText: /ยังไม่เติม|ทั้งหมด/ }).first();
        const removeChip = statusSelect.locator('.ant-select-selection-item').filter({ hasNotText: 'ทั้งหมด' }).locator('.ant-select-selection-item-remove');
        for (let i = 0; i < 5 && (await removeChip.count()); i++) {
          await removeChip.first().click();
          await page.waitForTimeout(800);
        }
        const start = main.getByRole('textbox', { name: 'วันที่เริ่มต้น' });
        if (await start.count()) {
          await start.click();
          await start.fill(dayPlus(-30).be); // ช่องวันที่ของแท็บ Order เติมยารับปี พ.ศ. (dev-x 21 ต.ค. 2026 — พิมพ์ ค.ศ. แล้วกลายเป็นปี 1483)
          await start.press('Enter');
          await page.waitForTimeout(600);
        }
        await end.click();
        await end.fill(dayPlus(60).be);
        await end.press('Enter');
        await page.waitForTimeout(1_000);
        const box = main.getByRole('textbox', { name: /ค้นหา VN, HN/ });
        const res = page.waitForResponse((r) => r.url().includes('medication-refill-with-detail') && decodeURIComponent(r.url()).includes(`[hn][contains]=${search}`), { timeout: 30_000 }).catch(() => undefined);
        await box.fill(search);
        await box.press('Enter');
        await res;
        await page.waitForTimeout(1_500);
      };
      /** แถวของ Task: HN + คลินิก + รอบ (ข้อความในเซลล์ = "<รอบ>/<ทั้งหมด>") */
      const taskRow = async (hn: string, clinic: string, round: string, extra?: string): Promise<Locator> => {
        const rows = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `HN ${hn}` }).filter({ hasText: clinic }).filter({ hasText: extra ?? '' });
        for (let i = 0; i < (await rows.count()); i++) {
          const cells = (await rows.nth(i).innerText()).split(/[\n\t]/).map((s) => s.trim());
          if (cells.includes(round)) return rows.nth(i);
        }
        throw new Error(`ไม่เห็นแถว Task ของ HN ${hn} · ${clinic} · รอบ ${round} ในแท็บ Order เติมยา`);
      };
      const tick = async (row: Locator) => {
        await row.locator('input[type=checkbox]').check();
        await markEvidence(filled(row.locator('.ant-checkbox').first()));
      };
      /** นำไปสร้างใบยา → dialog ยืนยัน → หน้า "สร้างใบยา (Refill)" */
      let lastCreateUrl = '';
      const openCreatePage = async (tag: string) => {
        await expect(goButton, 'ติ๊ก Task แล้วปุ่มนำไปสร้างใบยาต้องกดได้').toBeEnabled({ timeout: 10_000 });
        await markEvidence(clicked(goButton));
        await snapEvidence(page, `ก่อนกด — นำไปสร้างใบยา (${tag})`);
        await goButton.click();
        const confirm = page.getByRole('dialog').filter({ hasText: 'ยืนยันการสร้างใบยา' });
        await expect(confirm).toBeVisible({ timeout: 15_000 });
        const ok = confirm.getByRole('button', { name: /^นำไปสร้างใบยา$/ });
        await markEvidence(alerted(confirm.locator('.ant-modal-container, .ant-modal-content').first()), clicked(ok));
        await snapEvidence(page, `แจ้งเตือน — ยืนยันการสร้างใบยา (${tag})`);
        await ok.click();
        await page.waitForURL(/tab=medication-refill/, { timeout: 60_000 });
        lastCreateUrl = page.url();
        await expect(createButton).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(3_000);
        note(`หน้าสร้างใบยา (${tag})`, page.url().replace(/^https:\/\/[^/]+/, '').slice(0, 220));
        // ส่วน "ยา Refill": 1 Task = 1 แถวพับ "เติมยาครั้งที่ n/N" → กางทุกแถว (คลิกต้นแถว — กลางแถวมีช่องติ๊ก)
        const headers = roundSections().locator(':scope > .ant-collapse-header[aria-expanded="false"]');
        for (let i = 0; i < 8 && (await headers.count()); i++) {
          await headers.first().click({ position: { x: 15, y: 15 } });
          await page.waitForTimeout(1_000);
        }
        await dump(`create-page-${tag}`);
        note(`ส่วนยา Refill (${tag})`, (await readSections()).map((s) => `${s.round} · แพทย์ ${s.doctor} · คลินิก ${s.clinic} · ยา ${s.drugs.join(', ')}`).join(' || ') || '(ไม่มี)');
      };
      /** แถวพับของแต่ละ Task ในหน้าสร้างใบยา */
      const roundSections = () => main.locator('.ant-collapse-item').filter({ has: page.locator(':scope > .ant-collapse-header').filter({ hasText: /เติมยาครั้งที่ \d+\/\d+/ }) });
      /** อ่านแต่ละ Task: รอบ · "แพทย์ผู้สั่ง:" · "คลินิก:" · รหัสยาในตาราง */
      const readSections = async () => {
        const items = roundSections();
        const out: { item: Locator; round: string; doctor: string; clinic: string; drugs: string[]; codes: string[] }[] = [];
        for (let i = 0; i < (await items.count()); i++) {
          const item = items.nth(i);
          const text = squash(await item.innerText());
          const codes = [...text.matchAll(/\[(med\d+)\]/g)].map((m) => m[1]);
          out.push({
            item,
            round: text.match(/เติมยาครั้งที่ (\d+\/\d+)/)?.[1] ?? '-',
            doctor: text.match(/แพทย์ผู้สั่ง:\s*(.+?)\s+คลินิก:/)?.[1] ?? '-',
            clinic: text.match(/คลินิก:\s*(.+?)\s+วันและเวลาที่สั่ง/)?.[1] ?? '-',
            drugs: [...text.matchAll(/\[med\d+\]\s*(\S+)/g)].map((m) => m[1]),
            codes,
          });
        }
        return out;
      };
      const sectionOf = async (code: string, round?: string) => (await readSections()).filter((s) => s.codes.includes(code) && (!round || s.round === round));
      const createPrescription = async (tag: string): Promise<string> => {
        const autoPrint = main.getByRole('checkbox', { name: 'Print ฉลากยาอัตโนมัติ' });
        if (await autoPrint.isChecked().catch(() => false)) await autoPrint.click(); // เครื่องเทสไม่มีเครื่องพิมพ์
        await markEvidence(clicked(createButton));
        await snapEvidence(page, `ก่อนกด — สร้างใบยา (${tag})`);
        const res = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/cortex-api/opd/prescriptions', { timeout: 60_000 });
        const before = (await notices(page)).length;
        await createButton.click();
        const response = await res;
        const id = ((await response.json().catch(() => ({}))) as { prescriptionId?: string }).prescriptionId ?? '';
        const text = await waitNotice(page, before, /.+/, 8_000);
        note(`สร้างใบยา (${tag})`, `POST /cortex-api/opd/prescriptions ${response.status()} · ใบยา ${id || '-'} · แจ้งเตือน ${text || '(ไม่มี)'}`);
        expect(response.status(), 'สร้างใบยาต้องสำเร็จ').toBeLessThan(300);
        await page.waitForTimeout(2_000);
        await snapEvidence(page, `หลังกด — สร้างใบยา (${tag})`);
        return id;
      };
      /** ส่วนของหน้าที่มีข้อความ text (กลุ่ม / การ์ด / ตาราง) ตัวที่เล็กที่สุด */
      /**
       * ใบยาที่เพิ่งสร้าง: กดสร้างแล้วแอปกลับไปแท็บ Order เติมยา → เปิดหน้าผู้ป่วยของ Visit Refill อีกครั้ง (URL หน้าสร้างใบยาเดิม ตัด refillId)
       * → ส่วน "ใบยาเลขที่ <เลขท้าย>" (รายการยา · แถวหัว Encounter "แพทย์: / คลินิก:") → คืนข้อความส่วนนั้น
       */
      const prescriptionView = async (hn: string, id: string, tag: string): Promise<string> => {
        const no = id.split('-').pop() ?? '';
        if (!no) return '';
        await gotoPharmacy();
        await page.getByRole('tab', { name: /ใบยารอจัด/ }).click();
        await page.waitForTimeout(2_500);
        const search = main.getByRole('textbox', { name: /ค้นหา/ }).first();
        if (await search.isVisible().catch(() => false)) {
          await search.fill(hn);
          await search.press('Enter');
          await page.waitForTimeout(2_500);
        }
        const rows = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: hn });
        note(`แท็บใบยารอจัด (${tag})`, (await rows.allInnerTexts()).map(squash).join(' || ').slice(0, 500) || '(ไม่มีแถว)');
        const row = rows.filter({ hasText: no }).first();
        const target = (await row.count()) ? row : rows.first();
        await expect(target, `ใบยาของ HN ${hn} ต้องอยู่แท็บใบยารอจัด`).toBeVisible({ timeout: 60_000 });
        await markEvidence(clicked(target));
        await snapEvidence(page, `ก่อนกด — ใบยา ${no} ในแท็บใบยารอจัด (${tag})`);
        await target.locator('td').nth(3).click();
        await page.waitForURL(/preset=pharmacyViewPrescription/, { timeout: 60_000 });
        const title = main.getByText(new RegExp(`ใบยาเลขที่\\s*${no}`)).first();
        await expect(title, `หน้าใบยาต้องแสดงใบยาเลขที่ ${no}`).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(2_500);
        const text = await main.innerText();
        const start = text.search(new RegExp(`ใบยาเลขที่\\s*${no}`));
        const next = text.indexOf('ใบยาเลขที่', start + 10);
        const seg = squash(text.slice(start, next > 0 ? next : undefined));
        // หน้าใบยาแสดงทุกใบของ Visit → กรอบเฉพาะแถวยาในส่วนของใบนี้ (บรรพบุรุษตัวแรกของหัวใบยาที่มีตารางยา) · เลื่อนหัวใบยาขึ้นบนสุด
        await title.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.waitForTimeout(800);
        const section = title.locator('xpath=ancestor::div[.//tr[contains(@class,"ant-table-row")]][1]');
        const drugRows = section.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: new RegExp(`${DRUG_A.code}|${DRUG_B.code}`) });
        await markEvidence(expected(title), ...(await drugRows.all()).map(expected));
        await holdForClip(page, 2_000);
        await snapEvidence(page, `ใบยาเลขที่ ${no} (${tag})`);
        fs.writeFileSync(`${DUMP}/prescription-${tag}.txt`, seg);
        return seg;
      };
      // ── เตรียมผู้ป่วย 3 ราย (ก่อนคลิป TC แรก) ──
      let pastSet = false;
      const ordered = (process.env.SBH1738_ORDERED ?? '').split(','); // ทำต่อ: Encounter ที่ส่งคำสั่งแล้ว เช่น P1EN1,P1EN2
      const p1 = await prepare('SBH1738_P1', 'Merge1738A', 'คนไข้ 1', async (p) => {
        await checkStep(page, `Pre-condition คนไข้ 1 EN1 (${CLINIC1}) แพทย์ 1 สั่งยา A ${DRUG_A.name} Refill 3 รอบ → ส่งคำสั่ง`, async () => {
          if (!ordered.includes('P1EN1')) await cpoe.orderRefill(p, p.en1, DRUG_A, 'คนไข้ 1 EN1 ยา A');
        });
        await checkStep(page, `Pre-condition คนไข้ 1 EN2 (${CLINIC2.short}) สั่งยา B ${DRUG_B.name} Refill 3 รอบ (รอบที่ 1 = เมื่อวาน) → ส่งคำสั่ง`, async () => {
          if (!ordered.includes('P1EN2')) pastSet = await cpoe.orderRefill(p, p.en2, DRUG_B, 'คนไข้ 1 EN2 ยา B', { pastFirst: true });
        });
      });
      const p2 = await prepare('SBH1738_P2', 'Merge1738B', 'คนไข้ 2', async (p) => {
        await checkStep(page, `Pre-condition คนไข้ 2 EN1 สั่งยา A Refill 3 รอบ → ส่งคำสั่ง`, async () => {
          if (!ordered.includes('P2EN1')) await cpoe.orderRefill(p, p.en1, DRUG_A, 'คนไข้ 2 EN1 ยา A');
        });
        await checkStep(page, `Pre-condition คนไข้ 2 EN2 สั่งยา A (Order Refill ใบที่ 2) Refill 3 รอบ → ส่งคำสั่ง`, async () => {
          if (!ordered.includes('P2EN2')) await cpoe.orderRefill(p, p.en2, DRUG_A, 'คนไข้ 2 EN2 ยา A');
        });
      });
      // คนไข้ 3 (TC-005): EN1 (MED) ยา A สั่งโดยบัญชี Super_User (แพทย์ 1) · EN2 (SBH) ยา B สั่งโดยบัญชี Doctor (แพทย์ 2 — หน้าต่างแยก)
      // (Encounter เดียวกันใช้ไม่ได้: บัญชี Doctor กดยืนยันแผน Refill แล้วแผนของยา A ถูกบันทึกเป็นของแพทย์ 2 ด้วย → Task เดียวมีทั้ง 2 ยา · แพทย์ 2 — HN 6931989 20 ต.ค. 2026)
      const p3 = skipTc.includes('005') ? undefined : await prepare('SBH1738_P3', 'Merge1738D', 'คนไข้ 3', async (p) => {
        await checkStep(page, `Pre-condition คนไข้ 3 แพทย์ 1 (${DOCTOR1} · บัญชี Super_User) สั่งยา A Refill 3 รอบ → ส่งคำสั่ง`, async () => {
          if (!ordered.includes('P3A')) await cpoe.orderRefill(p, p.en1, DRUG_A, 'คนไข้ 3 EN1 ยา A (แพทย์ 1)');
        });
        await checkStep(page, `Pre-condition คนไข้ 3 แพทย์ 2 (${DOCTOR2} · บัญชี Doctor หน้าต่างแยก) สั่งยา B Refill 3 รอบ → ส่งคำสั่ง`, async () => {
          if (ordered.includes('P3B')) return;
          const doc = await openDoctorWindow(browser);
          try {
            await makeCpoe(doc).orderRefill(p, p.en2, DRUG_B, 'คนไข้ 3 EN2 ยา B (แพทย์ 2)');
          } finally {
            await finishVideo(doc);
            await doc.context().close();
          }
        });
      }, { twoClinics: true, tasks: 6 });
      let t1 = await fetchTasks(p1.hn);
      note('คนไข้ 1 Task ก่อนเริ่ม TC', t1.map(taskText).join(' || '));
      if (!pastSet) pastSet = !!taskOf(t1, p1.en2, 1) && isPast(taskOf(t1, p1.en2, 1)!);

      // ── TC-002 Task เลยวันนัดเติมยา สร้างใบยาได้ ──
      if (!skipTc.includes('002')) {
        await startClip(page, 'TC-002');
        await soft(`${TC['002']} ขั้น 1-5 Task ที่เลยวันนัดเติมยา → นำไปสร้างใบยา → สร้างใบยาได้`, async () => {
          let target: { hn: string; clinic: string; round: string; task: RefillTask };
          if (pastSet) {
            const t = taskOf(t1, p1.en2, 1)!;
            target = { hn: p1.hn, clinic: CLINIC2.short, round: '1/3', task: t };
            note(`${TC['002']} Task`, `คนไข้ 1 ยา B รอบ 1/3 วันนัด ${taskDate(t)} (วันนี้ ${dayPlus(0).th})`);
          } else {
            // ตั้งรอบย้อนหลังไม่ได้ → Task เลยกำหนดของ HN 6904101 (ผู้ใช้อนุญาต) · รอบแรกสุดที่ยังไม่เติมของ Encounter นั้น
            const old = (await fetchTasks(PAST_DUE_HN)).filter((t) => t.latestStatusCode === 'PENDING' && isPast(t));
            expect(old.length, `HN ${PAST_DUE_HN} ต้องมี Task ยังไม่เติมที่เลยกำหนด`).toBeGreaterThan(0);
            const t = old.sort((a, b) => a.sourceEn.localeCompare(b.sourceEn) || a.iteration - b.iteration)[0];
            target = { hn: PAST_DUE_HN, clinic: (t.clinic?.name ?? '').replace(/^.* - /, ''), round: `${t.iteration}/${t.sourceCount}`, task: t };
            note(`${TC['002']} Task (HN ${PAST_DUE_HN})`, taskText(t));
          }
          await openRefillTab(target.hn);
          const row = await taskRow(target.hn, target.clinic, target.round);
          await markEvidence(expected(row));
          await holdForClip(page);
          await snapEvidence(page, `Task ที่เลยวันนัด ${taskDate(target.task)} (ยังไม่เติม)`);
          await tick(row);
          await openCreatePage('TC-002');
          await createPrescription('TC-002');
          const after = (await fetchTasks(target.hn)).find((t) => t.id === target.task.id);
          note(`${TC['002']} Task หลังสร้างใบยา`, after ? taskText(after) : '(ไม่เห็น)');
          await showCompareTable(page, 'Task ที่เลยวันนัด — หลังสร้างใบยา', ['ที่ควรเป็น', 'Task (API)'], [
            { label: 'วันนัดเติมยา', values: [`ก่อนวันนี้ (${dayPlus(0).th})`, taskDate(target.task)], same: isPast(target.task) },
            { label: 'สถานะ', values: ['กำลังเติมยา', after ? STATUS[after.latestStatusCode] ?? after.latestStatusCode : '-'], same: after?.latestStatusCode === 'IN_PROGRESS' },
            { label: 'ใบยา', values: ['มี', after?.prescriptionId ?? '-'], same: !!after?.prescriptionId },
          ], { side: 'bottom' });
          await holdForClip(page, 2_500);
          await snapEvidence(page, 'TC-002 ผล');
          expect(after?.latestStatusCode, 'Task ต้องเป็น กำลังเติมยา').toBe('IN_PROGRESS');
        });
        await hideCompareTable(page);
      }

      // ── TC-004 / TC-007 หน้าสร้างใบยา: A 1/3 (คลินิก 1) + B 2/3 (คลินิก 2) — ดูอย่างเดียว ──
      const openMergePage = async (tag: string) => {
        await openRefillTab(p1.hn);
        const rowA = await taskRow(p1.hn, CLINIC1, '1/3');
        const rowB = await taskRow(p1.hn, CLINIC2.short, '2/3');
        await tick(rowA);
        await tick(rowB);
        await markEvidence(expected(rowA), expected(rowB));
        await snapEvidence(page, `ติ๊ก Task ยา A รอบ 1/3 + ยา B รอบ 2/3 (${tag})`);
        await openCreatePage(tag);
      };
      /** ตารางเทียบ + ภาพผล + expect ทุกแถว */
      const verdict = async (title: string, tag: string, columns: string[], rows: CompareRow[]) => {
        await showCompareTable(page, title, columns, rows, { side: 'bottom' });
        await holdForClip(page, 2_500);
        await snapEvidence(page, `${tag} ผล`);
        for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
      };
      const sectionText = (s: { round: string; doctor: string; clinic: string } | undefined) => (s ? `รอบ ${s.round} · ${s.clinic} · ${s.doctor}` : 'ไม่มีบนหน้า');
      if (!skipTc.includes('004')) {
        await startClip(page, 'TC-004');
        await soft(`${TC['004']} ขั้น 1-5 หน้าสร้างใบยา (Refill): ยา A แสดงรอบ 1/3 · ยา B แสดงรอบ 2/3`, async () => {
          await openMergePage('TC-004');
          const [a] = await sectionOf(DRUG_A.code);
          const [b] = await sectionOf(DRUG_B.code);
          for (const s of [a, b]) if (s) await markEvidence(expected(s.item.locator(':scope > .ant-collapse-header')), expected(s.item.locator('tr.ant-table-row').first()));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'หน้าสร้างใบยา — รอบของแต่ละรายการ');
          await verdict('รอบเติมยาของแต่ละรายการ', 'TC-004', ['ที่ควรเป็น', 'หน้าสร้างใบยา'], [
            { label: `ยา A ${DRUG_A.name}`, values: ['รอบ 1/3', a ? `รอบ ${a.round}` : 'ไม่มีบนหน้า'], same: a?.round === '1/3' },
            { label: `ยา B ${DRUG_B.name}`, values: ['รอบ 2/3', b ? `รอบ ${b.round}` : 'ไม่มีบนหน้า'], same: b?.round === '2/3' },
          ]);
        });
        await hideCompareTable(page);
      }
      if (!skipTc.includes('007')) {
        await startClip(page, 'TC-007');
        await soft(`${TC['007']} ขั้น 1-5 หน้าสร้างใบยา (Refill): รายการยาแยก Section ตามคลินิก`, async () => {
          await openMergePage('TC-007');
          const [a] = await sectionOf(DRUG_A.code);
          const [b] = await sectionOf(DRUG_B.code);
          for (const s of [a, b]) if (s) await markEvidence(expected(s.item.getByText(/^คลินิก:/).first()), expected(s.item.locator('tr.ant-table-row').first()));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'หน้าสร้างใบยา — คลินิกของแต่ละ Section');
          const apart = !!a && !!b && !(await a.item.evaluate((el, other) => el === other, await b.item.elementHandle()));
          await verdict('Section คลินิกของแต่ละรายการ', 'TC-007', ['ที่ควรเป็น', 'หน้าสร้างใบยา'], [
            { label: `ยา A ${DRUG_A.name}`, values: [`Section ${CLINIC1}`, sectionText(a)], same: !!a?.clinic.includes(CLINIC1) },
            { label: `ยา B ${DRUG_B.name}`, values: [`Section ${CLINIC2.short}`, sectionText(b)], same: !!b?.clinic.includes(CLINIC2.short) },
            { label: 'แยกคนละ Section', values: ['ใช่', apart ? 'ใช่' : 'ไม่ใช่'], same: apart },
          ]);
        });
        await hideCompareTable(page);
      }

      // ── TC-001 Merge A + B → สร้างใบยา 1 ใบ ──
      let mergedId = '';
      if (!skipTc.includes('001')) {
        await startClip(page, 'TC-001');
        await soft(`${TC['001']} ขั้น 1-6 ติ๊ก Task ยา A + ยา B → นำไปสร้างใบยา → สร้างใบยา → ได้ใบยา 1 ใบที่มีทั้ง 2 ยา`, async () => {
          // SBH1738_RX_001=<เลขใบยา> = สร้างใบยาไปแล้ว (คลิปรอบก่อน) → ตรวจหน้าใบยาอย่างเดียว
          mergedId = process.env.SBH1738_RX_001 ?? '';
          if (!mergedId) {
            await openMergePage('TC-001');
            for (const s of await readSections()) await markEvidence(expected(s.item.locator('tr.ant-table-row').first()));
            await holdForClip(page);
            mergedId = await createPrescription('TC-001');
          }
          t1 = await fetchTasks(p1.hn);
          const a = taskOf(t1, p1.en1, 1);
          const b = taskOf(t1, p1.en2, 2);
          note(`${TC['001']} Task หลังสร้าง`, [a, b].map((t) => (t ? taskText(t) : '-')).join(' || '));
          const view = await prescriptionView(p1.hn, mergedId, 'TC-001');
          if (a?.prescriptionId) mergedId = a.prescriptionId;
          await verdict('ใบยาที่สร้างจาก Task ยา A + ยา B', 'TC-001', ['ที่ควรเป็น', 'Task (API) · หน้าใบยา'], [
            { label: 'ใบยาของ Task ยา A 1/3', values: [mergedId || 'ใบเดียวกัน', a?.prescriptionId ?? '-'], same: !!a?.prescriptionId && a.prescriptionId === b?.prescriptionId },
            { label: 'ใบยาของ Task ยา B 2/3', values: [mergedId || 'ใบเดียวกัน', b?.prescriptionId ?? '-'], same: !!b?.prescriptionId && a?.prescriptionId === b.prescriptionId },
            { label: `ใบยา ${mergedId.split('-').pop()} มียา A + ยา B`, values: ['มีทั้ง 2', `${view.includes(DRUG_A.code) ? 'มียา A' : 'ไม่มียา A'} · ${view.includes(DRUG_B.code) ? 'มียา B' : 'ไม่มียา B'}`], same: view.includes(DRUG_A.code) && view.includes(DRUG_B.code) },
          ]);
        });
        await hideCompareTable(page);
      }

      // ── TC-005 คนไข้ 3: ยา A (แพทย์ 1) + ยา B (แพทย์ 2) → ใบยาเดียว · แพทย์ผู้สั่งของแต่ละรายการ ──
      if (p3) {
        await startClip(page, 'TC-005');
        await soft(`${TC['005']} ขั้น 1-5 ติ๊ก Task ยา A (${DOCTOR1}) + ยา B (${DOCTOR2}) → สร้างใบยา → แพทย์ผู้สั่งของแต่ละรายการ`, async () => {
          // SBH1738_RX_005=<เลขใบยา> = สร้างใบยาไปแล้ว (คลิปรอบก่อน) → ตรวจหน้าใบยา + Task อย่างเดียว
          const rx = process.env.SBH1738_RX_005 ?? '';
          let a: Awaited<ReturnType<typeof sectionOf>>[number] | undefined;
          let b: typeof a;
          let id = rx;
          if (!rx) {
          await openRefillTab(p3.hn);
          const rowA = await taskRow(p3.hn, CLINIC1, '1/3');
          const rowB = await taskRow(p3.hn, CLINIC2.short, '1/3');
          await tick(rowA);
          await tick(rowB);
          await markEvidence(expected(rowA), expected(rowB));
          await snapEvidence(page, 'ติ๊ก Task ยา A (แพทย์ 1) + ยา B (แพทย์ 2)');
          await openCreatePage('TC-005');
          [a] = await sectionOf(DRUG_A.code);
          [b] = await sectionOf(DRUG_B.code);
          for (const s of [a, b]) if (s) await markEvidence(expected(s.item.getByText(/^แพทย์ผู้สั่ง:/).first()), expected(s.item.locator('tr.ant-table-row').first()));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'หน้าสร้างใบยา — แพทย์ผู้สั่งของแต่ละรายการ');
          id = await createPrescription('TC-005');
          }
          const view = await prescriptionView(p3.hn, id, 'TC-005');
          const inView = (name: string) => (view.includes(name) ? 'มีชื่อในหน้าใบยา' : 'ไม่มีชื่อในหน้าใบยา');
          const tasks = (await fetchTasks(p3.hn)).filter((t) => t.prescriptionId && t.prescriptionId === id);
          const api = (code: string) => tasks.find((t) => t.medications.some((m) => m.productCode === code))?.practitioner?.display ?? '-';
          note(`${TC['005']} Task หลังสร้าง`, tasks.map(taskText).join(' || ') || '(ไม่มี)');
          note(`${TC['005']} ส่วนใบยาหลังสร้าง`, view.slice(0, 600));
          await verdict('แพทย์ผู้สั่งของแต่ละรายการ', 'TC-005', ['ที่ควรเป็น', 'หน้าสร้างใบยา · Task (API)'], [
            { label: 'ใบยาเดียว (Task ยา A + B)', values: ['1 ใบ', `${tasks.length} Task ในใบยา ${id || '-'}`], same: tasks.length === 2 },
            { label: `ยา A ${DRUG_A.name}`, values: [DOCTOR1, `${a ? `หน้าสร้างใบยา ${a.doctor} · ` : ''}Task ${api(DRUG_A.code)} · ${inView('ทดสอบ มานะ')}`], same: (!a || a.doctor.includes(DOCTOR1)) && api(DRUG_A.code).includes(DOCTOR1) },
            { label: `ยา B ${DRUG_B.name}`, values: [DOCTOR2, `${b ? `หน้าสร้างใบยา ${b.doctor} · ` : ''}Task ${api(DRUG_B.code)} · ${inView('วิชัย')}`], same: (!b || b.doctor.includes('วิชัย')) && api(DRUG_B.code).includes('วิชัย') },
          ]);
        });
        await hideCompareTable(page);
      }

      // ── TC-006 Task ทั้ง 2 → กำลังเติมยา ──
      if (!skipTc.includes('006')) {
        await startClip(page, 'TC-006');
        await soft(`${TC['006']} ขั้น 1-3 หลัง TC-001 Task ยา A และยา B สถานะ "กำลังเติมยา"`, async () => {
          await openRefillTab(p1.hn);
          const rowA = await taskRow(p1.hn, CLINIC1, '1/3');
          const rowB = await taskRow(p1.hn, CLINIC2.short, '2/3');
          await markEvidence(expected(rowA), expected(rowB));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'แท็บ Order เติมยา — Task ยา A 1/3 และยา B 2/3');
          t1 = await fetchTasks(p1.hn);
          const pairs = [
            { label: `ยา A 1/3 (${CLINIC1})`, row: rowA, t: taskOf(t1, p1.en1, 1) },
            { label: `ยา B 2/3 (${CLINIC2.short})`, row: rowB, t: taskOf(t1, p1.en2, 2) },
          ];
          const rows: CompareRow[] = [];
          for (const x of pairs) {
            const shown = (await x.row.innerText()).includes('กำลังเติมยา') ? 'กำลังเติมยา' : squash((await x.row.innerText()).split(/[\n\t]/)[0] || '-');
            const api = x.t ? STATUS[x.t.latestStatusCode] ?? x.t.latestStatusCode : '-';
            rows.push({ label: x.label, values: ['กำลังเติมยา', `${shown} · API ${api}`], same: shown === 'กำลังเติมยา' && x.t?.latestStatusCode === 'IN_PROGRESS' });
          }
          await showCompareTable(page, 'สถานะ Task หลังสร้างใบยา', ['ที่ควรเป็น', 'หน้าจอ · API'], rows, { side: 'bottom' });
          await holdForClip(page, 2_500);
          await snapEvidence(page, 'TC-006 ผล');
          for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
        });
        await hideCompareTable(page);
      }

      // ── TC-010 Task กำลังเติมยา เลือกไป Merge ซ้ำไม่ได้ ──
      if (!skipTc.includes('010')) {
        await startClip(page, 'TC-010');
        await soft(`${TC['010']} ขั้น 1-3 ลองติ๊ก Task ยา A (กำลังเติมยา) → นำไปสร้างใบยาไม่ได้`, async () => {
          await openRefillTab(p1.hn);
          const rowA = await taskRow(p1.hn, CLINIC1, '1/3');
          const box = rowA.locator('input[type=checkbox]');
          const disabled = await box.isDisabled();
          await markEvidence(expected(rowA.locator('.ant-checkbox').first()), expected(rowA));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'Task ยา A กำลังเติมยา — ช่องติ๊ก');
          let outcome = disabled ? 'ช่องติ๊กกดไม่ได้ (disabled)' : '';
          if (!disabled) {
            await box.check({ force: true }).catch(() => undefined);
            const checked = await box.isChecked();
            const enabled = await goButton.isEnabled();
            outcome = `ติ๊กได้ ${checked} · ปุ่มนำไปสร้างใบยา ${enabled ? 'กดได้' : 'กดไม่ได้'}`;
            if (checked && enabled) {
              const before = (await notices(page)).length;
              await markEvidence(clicked(goButton));
              await snapEvidence(page, 'ก่อนกด — นำไปสร้างใบยา (Task กำลังเติมยา)');
              await goButton.click();
              const confirm = page.getByRole('dialog').filter({ hasText: 'ยืนยันการสร้างใบยา' });
              const opened = await confirm.isVisible({ timeout: 5_000 }).catch(() => false);
              const text = await waitNotice(page, before, /.+/, 5_000);
              outcome += ` · กดแล้ว: ${opened ? 'เปิด dialog ยืนยันการสร้างใบยา' : 'ไม่เปิด dialog'} · แจ้งเตือน ${text || '(ไม่มี)'}`;
              await snapEvidence(page, 'หลังกด — นำไปสร้างใบยา (Task กำลังเติมยา)');
              if (opened) await confirm.getByRole('button', { name: 'ปิด' }).click().catch(() => page.keyboard.press('Escape'));
              expect(opened, 'Task กำลังเติมยาต้องนำไปสร้างใบยาใหม่ไม่ได้').toBe(false);
            }
          }
          note(`${TC['010']} ผล`, outcome);
          await showCompareTable(page, 'Task ยา A สถานะกำลังเติมยา', ['ที่ควรเป็น', 'หน้าจอ'], [
            { label: 'เลือกไป Merge ใหม่', values: ['ไม่ได้', outcome], same: disabled || !(await goButton.isEnabled()) },
          ], { side: 'bottom' });
          await holdForClip(page, 2_500);
          await snapEvidence(page, 'TC-010 ผล');
        });
        await hideCompareTable(page);
      }

      // ── TC-003 Task ยังไม่ถึงวันนัด สร้างใบยาได้ (ยา A รอบ 2/3) ──
      if (!skipTc.includes('003')) {
        await startClip(page, 'TC-003');
        await soft(`${TC['003']} ขั้น 1-5 Task ยา A รอบ 2/3 (ยังไม่ถึงวันนัด) → นำไปสร้างใบยา → สร้างใบยาได้`, async () => {
          const t = taskOf(await fetchTasks(p1.hn), p1.en1, 2)!;
          note(`${TC['003']} Task`, taskText(t));
          await openRefillTab(p1.hn);
          const row = await taskRow(p1.hn, CLINIC1, '2/3');
          await markEvidence(expected(row));
          await holdForClip(page);
          await snapEvidence(page, `Task ยังไม่ถึงวันนัด ${taskDate(t)}`);
          await tick(row);
          await openCreatePage('TC-003');
          await createPrescription('TC-003');
          const after = (await fetchTasks(p1.hn)).find((x) => x.id === t.id);
          note(`${TC['003']} Task หลังสร้างใบยา`, after ? taskText(after) : '(ไม่เห็น)');
          const future = new Date(t.scheduledRefillDate).getTime() > Date.now() && taskDate(t) !== dayPlus(0).th;
          await showCompareTable(page, 'Task ที่ยังไม่ถึงวันนัด — หลังสร้างใบยา', ['ที่ควรเป็น', 'Task (API)'], [
            { label: 'วันนัดเติมยา', values: [`หลังวันนี้ (${dayPlus(0).th})`, taskDate(t)], same: future },
            { label: 'สถานะ', values: ['กำลังเติมยา', after ? STATUS[after.latestStatusCode] ?? after.latestStatusCode : '-'], same: after?.latestStatusCode === 'IN_PROGRESS' },
            { label: 'ใบยา', values: ['มี', after?.prescriptionId ?? '-'], same: !!after?.prescriptionId },
          ], { side: 'bottom' });
          await holdForClip(page, 2_500);
          await snapEvidence(page, 'TC-003 ผล');
          expect(after?.latestStatusCode, 'Task ต้องเป็น กำลังเติมยา').toBe('IN_PROGRESS');
        });
        await hideCompareTable(page);
      }

      // ── TC-008 คนไข้ 2: ยา A จาก 2 Order Refill → หน้าสร้างใบยา 2 บรรทัด (ไม่กดสร้าง) ──
      if (!skipTc.includes('008')) {
        await startClip(page, 'TC-008');
        await soft(`${TC['008']} ขั้น 1-5 ติ๊ก Task ยา A ทั้ง 2 Task (คนละ Order) → หน้าสร้างใบยา: ยา A 2 บรรทัด`, async () => {
          await openRefillTab(p2.hn);
          const r1 = await taskRow(p2.hn, CLINIC1, '1/3');
          const r2 = await taskRow(p2.hn, CLINIC2.short, '1/3');
          await tick(r1);
          await tick(r2);
          await markEvidence(expected(r1), expected(r2));
          await snapEvidence(page, 'ติ๊ก Task ยา A ของ Order 1 และ Order 2');
          await openCreatePage('TC-008');
          const lines = roundSections().locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${DRUG_A.code}]` }); // บรรทัดยา A ในส่วนยา Refill (ทุก Task)
          const n = await lines.count();
          for (let i = 0; i < n; i++) await markEvidence(expected(lines.nth(i)));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'หน้าสร้างใบยา — บรรทัดของยา A');
          await showCompareTable(page, `ยา A ${DRUG_A.name} จาก 2 Task`, ['ที่ควรเป็น', 'หน้าสร้างใบยา'], [
            { label: 'จำนวนบรรทัดของยา A', values: ['2 บรรทัดแยกกัน', `${n} บรรทัด`], same: n === 2 },
          ], { side: 'bottom' });
          await holdForClip(page, 2_500);
          await snapEvidence(page, 'TC-008 ผล');
          expect(n, 'ยา A ต้องแสดง 2 บรรทัด').toBe(2);
        });
        await hideCompareTable(page);
      }

      // ── TC-009 Task ของคนไข้ต่างคน Merge ไม่ได้ ──
      if (!skipTc.includes('009')) {
        await startClip(page, 'TC-009');
        await soft(`${TC['009']} ขั้น 1-4 ติ๊ก Task ของคนไข้ 1 และคนไข้ 2 → นำไปสร้างใบยาไม่ได้`, async () => {
          let prefix = '';
          while (prefix.length < p1.hn.length && p1.hn[prefix.length] === p2.hn[prefix.length]) prefix += p1.hn[prefix.length];
          note(`${TC['009']} ค้นด้วย HN ร่วม`, `"${prefix}" (HN ${p1.hn} · ${p2.hn})`);
          await openRefillTab(prefix);
          const x = await taskRow(p1.hn, CLINIC1, '3/3');
          const y = await taskRow(p2.hn, CLINIC1, '2/3');
          await tick(x);
          await tick(y);
          const both = (await x.locator('input[type=checkbox]').isChecked()) && (await y.locator('input[type=checkbox]').isChecked());
          const enabled = await goButton.isEnabled();
          let outcome = `ติ๊กได้ทั้ง 2 แถว ${both} · ปุ่มนำไปสร้างใบยา ${enabled ? 'กดได้' : 'กดไม่ได้'}`;
          await markEvidence(expected(x), expected(y), expected(goButton));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'ติ๊ก Task ของคนไข้ X และ Y — ปุ่มนำไปสร้างใบยา');
          if (enabled) {
            const before = (await notices(page)).length;
            await goButton.click();
            const confirm = page.getByRole('dialog').filter({ hasText: 'ยืนยันการสร้างใบยา' });
            const opened = await confirm.isVisible({ timeout: 5_000 }).catch(() => false);
            const text = await waitNotice(page, before, /.+/, 5_000);
            outcome += ` · กดแล้ว: ${opened ? 'เปิด dialog ยืนยันการสร้างใบยา' : 'ไม่เปิด dialog'} · แจ้งเตือน ${text || '(ไม่มี)'}`;
            await snapEvidence(page, 'หลังกด — นำไปสร้างใบยา (คนไข้ต่างคน)');
            if (opened) await confirm.getByRole('button', { name: 'ปิด' }).click().catch(() => page.keyboard.press('Escape'));
            expect(opened, 'Task ของคนไข้ต่างคนต้อง Merge ไม่ได้').toBe(false);
          }
          note(`${TC['009']} ผล`, outcome);
          await showCompareTable(page, 'Task ของคนไข้ต่างคน', ['ที่ควรเป็น', 'หน้าจอ'], [
            { label: 'Merge เป็นใบยาเดียว', values: ['ไม่ได้', outcome], same: !enabled || outcome.includes('ไม่เปิด dialog') },
          ], { side: 'bottom' });
          await holdForClip(page, 2_500);
          await snapEvidence(page, 'TC-009 ผล');
        });
        await hideCompareTable(page);
      }

      note('ผู้ป่วย', `คนไข้ 1 SBH1738_P1=${p1.hn},${p1.vn},${p1.en1},${p1.en2},${p1.vnR} · คนไข้ 2 SBH1738_P2=${p2.hn},${p2.vn},${p2.en1},${p2.en2},${p2.vnR}`);
      note('ผลรวม', failures.length ? `ไม่ผ่าน / ตรวจไม่ได้ ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
