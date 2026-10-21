import type { Browser, Locator, Page } from '@playwright/test';
import fs from 'node:fs';
import { graphqlMutation } from '../../../helpers/functions/er-disposition';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { capturePrintJobs, hidePdf, openRoleWindow, pdfLineAt, pdfPages, refillRounds, showPdf, thaiShortDate, type PrintJob } from '../../../helpers/functions/print-capture';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { gotoPatient, openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart, createMedicalCertificate, options, recordMenu } from '../../../mock-data/uat-play';

// การ์ด SBH-1732 [OPD][Pharmacy] เพิ่มปุ่ม/จุด Print ใบ Refill ยา — EXE SBH-2670 → TS SBH-2671 (HPY) / SBH-2672 (UHP) → TC-SBH-1732-001–015 (SBH-2673–2687)
// 1 เทส = 1 flow (R9) · คลิป 1 ไฟล์ต่อ TC (R61) · บัญชี Super_User ทุก TC ยกเว้น TC-006 (ผู้ใช้ที่ไม่ใช่เภสัช = Nurse) — ผู้ใช้เลือก 20 ต.ค. 2026
// ผู้ป่วย AUTO ใหม่ 2 ราย (ลงทะเบียน + Visit OPD ที่เวชระเบียน R53 → เช็คอิน) จำหน่ายแล้วทิ้ง Visit ไว้ (R11 · ผู้ใช้อนุญาตจำหน่าย + สร้างใบรับรองแพทย์)
//   P1 = ยา A med0000007 GPO-L-ONE 28 เม็ด → Refill 3 รอบ ระยะ 10 วัน รอบละ 7 + ใบรับรองแพทย์ · P2 = ยา B med0000008 CLINDAVID-300 ยาปกติ
// TC-005 Visit เก่า = HN 6931942 · V69101927406 (19 ต.ค. 2026 · มียา Refill · อ่านอย่างเดียว — ผู้ใช้เลือก)
// เอกสาร: แอปส่ง PDF ให้ print agent ในเครื่อง (localhost:8081) → ดักคำสั่งพิมพ์เก็บ PDF แล้วอ่านเทียบ (R18 · helpers/functions/print-capture.ts)
// ทำต่อ: SBH1732_P1=<HN>,<VN>,<EN> · SBH1732_P2=<HN>,<VN>,<EN> · SBH1732_FROM=<เลข TC ตามลำดับ ORDER> · SBH1732_OLD=<HN>,<VN>
// รัน dev-x: npx playwright test --headed --grep @SBH-1732 --project=chrome --no-deps --output=.cache/run-1732

const DRUG_A = { code: 'med0000007', name: 'GPO-L-ONE' };
const DRUG_B = { code: 'med0000008', name: 'CLINDAVID' };
const ORDER = ['001', '002', '007', '008', '010', '011', '003', '004', '009', '005', '006', '012', '015', '013', '014'] as const;
type TcNo = (typeof ORDER)[number];
const ISSUE: Record<TcNo, string> = {
  '001': 'SBH-2673', '002': 'SBH-2674', '003': 'SBH-2675', '004': 'SBH-2676', '005': 'SBH-2677', '006': 'SBH-2678', '007': 'SBH-2679', '008': 'SBH-2680',
  '009': 'SBH-2681', '010': 'SBH-2682', '011': 'SBH-2683', '012': 'SBH-2684', '013': 'SBH-2685', '014': 'SBH-2686', '015': 'SBH-2687',
};
const TC = (n: TcNo) => `TC-${n} (${ISSUE[n]})`;
const ISSUES = ['SBH-1732', 'SBH-2670', 'SBH-2671', 'SBH-2672', ...ORDER.map((n) => ISSUE[n])];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const PRINT_LABEL = /พิมพ์ใบค้างจ่ายยา\/ใบ Refill ยา/;
const OUT = '.cache/sbh1732';

/** "2569-10-30" + n วัน → "2569-11-06" */
function addDays(be: string, n: number) {
  const [y, m, d] = be.split('-').map(Number);
  const date = new Date(y - 543, m - 1, d + n);
  return `${date.getFullYear() + 543}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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

/** สถานะ Visit ในแถบหัวของหน้า EMR (เช็คอิน → พร้อมตรวจ → ตรวจเสร็จ) */
async function setVisitStatus(page: Page, name: string) {
  const status = page.getByRole('main').locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
  await expect(status).toBeVisible({ timeout: 120_000 });
  if ((await status.textContent())?.trim() === name) return;
  const option = options(page).filter({ hasText: new RegExp(`^${name}$`) });
  await expect(async () => {
    await page.keyboard.press('Escape');
    await status.click();
    await expect(option).toBeVisible({ timeout: 5_000 });
  }, `เปิดตัวเลือกสถานะเพื่อเลือก ${name}`).toPass({ timeout: 60_000 });
  const moved = graphqlMutation(page, 'TransitionEncounterStatus', 60_000);
  await option.click();
  const body = (await (await moved).json()) as { data?: { transitionEncounterStatus?: { accepted?: boolean } }; errors?: { message: string }[] };
  expect(body.data?.transitionEncounterStatus?.accepted, `เปลี่ยนสถานะเป็น ${name} ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
}

test.describe('SBH-1732 พิมพ์ใบ Refill ยา (CPOE · Discharge · ประวัติการรักษา · หน้าใบยา)', () => {
  test(
    'ผู้ป่วย AUTO ใหม่ 2 ราย (มี / ไม่มียา Refill) + Visit เก่า: พิมพ์ใบ Refill ยาจาก 4 จุด · ข้อมูลล่าสุดหลังแก้ · รวมเอกสารอื่นที่ Discharge · ปุ่ม disable เมื่อไม่มียา Refill',
    { tag: ['@SBH-1732', ...ISSUES.slice(1).map((id) => `@${id}`)], annotation: ISSUES.map(linear) },
    async ({ page, browser }) => {
      test.setTimeout(3_600_000);
      fs.mkdirSync(OUT, { recursive: true });
      const failures: string[] = [];
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      const soft = (pg: Page, title: string, body: () => Promise<void>) =>
        checkStep(pg, title, body).then(
          () => true,
          (error: unknown) => {
            failures.push(`${title} — ${firstLine(error)}`);
            console.log(`    ✗ ${title} — ${firstLine(error)}`);
            return false;
          },
        );
      await page.addInitScript(recordNotices);
      const printer = new Map<Page, Awaited<ReturnType<typeof capturePrintJobs>>>();
      printer.set(page, await capturePrintJobs(page));

      // ── หน้าต่างบัญชี Nurse (TC-006 · และจำหน่ายถ้า Super_User จำหน่ายไม่ได้) ──
      let nurse: Page | undefined;
      const nursePage = async (b: Browser) => {
        if (!nurse) {
          nurse = await openRoleWindow(b, 'Nurse');
          await nurse.context().addInitScript(recordNotices);
          printer.set(nurse, await capturePrintJobs(nurse));
          // หน้าต่างใหม่โหลดไฟล์แอปครั้งแรกช้า (รอบ 1: กรอกหน่วยบริการไม่ทันใน 20 วินาที) → รอหน้าเลือกหน่วยบริการขึ้นก่อน
          await nurse.goto('/cortex/opd/select-service-unit', { timeout: 180_000 });
          await nurse.getByRole('main').getByRole('combobox').first().waitFor({ timeout: 180_000 });
        }
        return nurse;
      };

      /** กดปุ่ม / เมนูพิมพ์ → PDF ที่แอปส่งให้เครื่องพิมพ์ (สำรอง: PDF จาก API ของใบ Refill) */
      const printAndCapture = async (pg: Page, target: Locator, tag: string): Promise<Buffer> => {
        const jobs = printer.get(pg)!;
        const before = jobs.jobs.length;
        const noticeBefore = (await notices(pg)).length;
        const api = pg.waitForResponse((r) => /medication-refills\/.*\/pdf|prescriptions\/[^/]+\/medication-refills/.test(r.url()), { timeout: 60_000 }).catch(() => undefined);
        await target.click();
        const job: PrintJob | undefined = await jobs.next(before, 45_000);
        const res = await api;
        if (res) note(`API ของใบ Refill (${tag})`, `${res.status()} ${res.request().method()} ${new URL(res.url()).pathname}`);
        const text = await waitNotice(pg, noticeBefore, /พิมพ์|Refill|ไม่สำเร็จ/i, 5_000);
        if (text) note(`แจ้งเตือนหลังกดพิมพ์ (${tag})`, text);
        const pdf = job?.pdf ?? (res?.ok() ? await res.body() : undefined);
        expect(pdf, 'กดพิมพ์แล้วต้องได้เอกสาร PDF ที่ส่งให้เครื่องพิมพ์').toBeTruthy();
        note(`งานพิมพ์ (${tag})`, job ? `${job.url.replace(/\?.*$/, '')} · ${job.pdf.length} byte` : `(ไม่ผ่านเครื่องพิมพ์ ใช้ PDF จาก API ${pdf!.length} byte)`);
        fs.writeFileSync(`${OUT}/${tag}.pdf`, pdf!);
        return pdf!;
      };

      /** เปิด PDF ซ้อนจอ ตีกรอบ HN / VN + รอบเติมยา แล้วเทียบกับแผน (ตารางเทียบวางซ้าย) */
      const checkRefillPdf = async (pg: Page, pdf: Buffer, title: string, want: { hn: string; vn: string; drug: string; dates?: string[]; qty?: string[] }, pageNo = 1) => {
        const pages = await pdfPages(pdf);
        const all = pages.join(' ');
        const rounds = refillRounds(all, want.drug);
        const rows: CompareRow[] = [
          { label: 'HN', values: [want.hn, all.includes(`HN ${want.hn}`) ? want.hn : '(ไม่พบ)'], same: all.includes(`HN ${want.hn}`) },
          { label: 'VN', values: [want.vn, all.includes(want.vn) ? want.vn : '(ไม่พบ)'], same: all.includes(want.vn) },
          { label: 'ยา', values: [want.drug, all.includes(want.drug) ? 'มี' : '(ไม่พบ)'], same: all.includes(want.drug) },
        ];
        if (want.dates && want.qty) {
          rows.push({ label: 'จำนวนรอบ', values: [String(want.qty.length), String(rounds.length)], same: rounds.length === want.qty.length });
          want.qty.forEach((q, i) => {
            const r = rounds[i];
            const dt = thaiShortDate(want.dates![i]);
            rows.push({ label: `ครั้งที่ ${i + 1}`, values: [`${dt} · ${q}`, r ? `${r.date} · ${r.qty}` : '(ไม่มี)'], same: !!r && r.date === dt && r.qty === q });
          });
        } else rows.push({ label: 'รอบเติมยา', values: ['มี', rounds.length ? `${rounds.length} รอบ` : '(ไม่พบ)'], same: rounds.length > 0 });
        note(`ใบ Refill (${title})`, `${pages.length} หน้า · ${rounds.map((r) => `ครั้งที่ ${r.round}/${r.total} ${r.date} · ${r.qty}`).join(' | ')}`);
        const overlay = await showPdf(pg, pdf, title, pageNo);
        const marks: Locator[] = [];
        for (const t of [`HN ${want.hn}`, want.vn]) {
          const l = await pdfLineAt(overlay, t);
          if (l) marks.push(l);
        }
        for (let i = 1; i <= Math.min(rounds.length, 3); i++) {
          const l = await pdfLineAt(overlay, new RegExp(`ครั้งที่ ${i}/`));
          if (l) marks.push(l);
        }
        await markEvidence(...marks.map(expected));
        await showCompareTable(pg, title, ['ที่ควรเป็น', 'ใบ Refill ที่พิมพ์'], rows, { side: 'left' });
        await holdForClip(pg, 2_500);
        await snapEvidence(pg, title);
        await hideCompareTable(pg);
        await hidePdf(pg);
        for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
        return { pages, rounds };
      };

      // ── CPOE ──
      const mainOf = (pg: Page) => pg.getByRole('main');
      const main = mainOf(page);
      const refillButton = main.getByRole('button', { name: /^refill/i }).first();
      const cpoePrint = main.getByRole('button', { name: PRINT_LABEL }).first();
      const dialog = page.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' });
      const dialogPrint = dialog.getByRole('button', { name: /พิมพ์ใบค้างจ่ายยา/ });
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
      const roundDates = () => dialog.locator('.ant-picker input');
      const readPlan = async (name: string) => {
        const rounds = await roundHeaders.count();
        const dates: string[] = [];
        for (let i = 1; i <= rounds; i++) dates.push(await roundDates().nth(i).inputValue().catch(() => ''));
        const qty = await Promise.all((await roundInputs(name)).map((box) => box.inputValue()));
        const now = await dispenseNow(name).inputValue().catch(() => '');
        return { rounds, dates, qty, now };
      };
      const openRefillDialog = async (tag: string, drug = DRUG_A.name) => {
        await expect(refillButton).toBeVisible({ timeout: 30_000 });
        await markEvidence(clicked(refillButton));
        await snapEvidence(page, `ก่อนกด — ปุ่ม refill (${tag})`);
        await refillButton.click();
        await expect(dialog, 'กดปุ่ม refill แล้วต้องเปิดหน้าต่าง "จัดการการเติมยา (Refill)"').toBeVisible({ timeout: 20_000 });
        await expect(drugRowInDialog(drug)).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(2_000); // ค่าของแผนเดิมเติมตามหลัง
      };
      const saveRefillPlan = async (tag: string) => {
        const before = (await notices(page)).length;
        await markEvidence(clicked(confirmButton));
        await snapEvidence(page, `ก่อนกด — ยืนยันแผน Refill (${tag})`);
        await confirmButton.click();
        const text = await waitNotice(page, before, /refill|เติมยา|กรุณา|ผิดพลาด|Err|failed/i);
        note(`แจ้งเตือนหลังยืนยันแผน (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        expect(text, 'ยืนยันแผนแล้วต้องขึ้นแจ้งเตือนบันทึกแผนเติมยาสำเร็จ').toMatch(/successfully|สำเร็จ|อัปเดตรอบเติมยาแล้ว/i);
        await expect(dialog).toBeHidden({ timeout: 15_000 });
      };
      const closeRefillDialog = async () => {
        if (await dialog.isVisible().catch(() => false)) await cancelButton.click().catch(() => undefined);
        await expect(dialog).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
      };
      const pickRoundDate = async (round: number, be: string) => {
        const box = roundDates().nth(round);
        await box.click();
        const panel = page.locator('.ant-picker-dropdown:visible').last();
        await expect(panel).toBeVisible({ timeout: 5_000 });
        const cell = panel.locator(`td[title="${be}"]`);
        for (let i = 0; i < 3 && !(await cell.isVisible().catch(() => false)); i++) {
          await panel.locator('.ant-picker-header-next-btn').first().click();
          await page.waitForTimeout(300);
        }
        await cell.click();
        await expect(box).toHaveValue(be, { timeout: 5_000 });
        return box;
      };
      const basketRow = (code: string) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      const sendButton = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
      const closeLeftPanels = async () => {
        for (const name of ['OPD', 'ประวัติการรักษา']) {
          const tab = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
          if (await tab.count()) await tab.first().locator('.dv-default-tab-action').click().catch(() => undefined);
        }
        await page.mouse.move(700, 1000);
      };
      const openEmr = async (p: { hn: string; vn: string }) => {
        await selectOpdUnit(page);
        const row = await opdListRow(page, p.hn);
        const name = row.getByText(/AUTO\s/).first();
        await markEvidence(clicked(name));
        await snapEvidence(page, 'ก่อนกด — ชื่อผู้ป่วยในรายการผู้ป่วยนอก');
        await name.click();
        await expect(main.getByText(`VN ${p.vn}`, { exact: true }).first(), 'เปิดหน้า EMR แล้วต้องเห็นแถบ Visit ของผู้ป่วย').toBeVisible({ timeout: 90_000 });
        await expect(main.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
        await page.waitForTimeout(2_000);
        await closeLeftPanels();
      };
      const sendOrders = async () => {
        const before = (await notices(page)).length;
        await markEvidence(clicked(sendButton));
        await snapEvidence(page, 'ก่อนกด — ส่งคำสั่ง');
        await sendButton.click();
        const text = await waitNotice(page, before, /ส่งคำสั่ง/, 60_000);
        note('แจ้งเตือนหลังส่งคำสั่ง', text || '(ไม่เห็น)');
        expect(text, 'ส่งคำสั่งแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/สำเร็จ/);
      };

      // ── ห้องยา ──
      const createButton = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
      const gotoPharmacy = async () => {
        await page.goto('/cortex/pharmacy/select-location');
        await main.getByRole('combobox').first().click();
        await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
        await page.waitForTimeout(800);
        await main.getByRole('combobox').nth(1).click();
        await page.waitForTimeout(800);
        await page.keyboard.press('Enter');
        await page.getByRole('button', { name: 'ส่ง' }).click();
        await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
      };
      /** Order รอยืนยัน → เปิด Order → เอา Print ฉลากอัตโนมัติออก → สร้างใบยา */
      const createPrescription = async (p: { hn: string }) => {
        await gotoPharmacy();
        const row = main.locator('tr.ant-table-row').filter({ hasText: `HN ${p.hn}` }).first();
        await expect(row, `ผู้ป่วย HN ${p.hn} ต้องอยู่แท็บ Order รอยืนยัน`).toBeVisible({ timeout: 60_000 });
        await row.locator('td').nth(4).click();
        await expect(createButton).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(2_500);
        const auto = main.getByRole('checkbox', { name: /Print ฉลากยาอัตโนมัติ/ });
        if (await auto.isChecked().catch(() => false)) await auto.uncheck();
        const created = page.waitForResponse((r) => r.request().method() === 'POST' && /\/opd\/prescriptions$/.test(new URL(r.url()).pathname), { timeout: 60_000 });
        await markEvidence(clicked(createButton));
        await snapEvidence(page, 'ก่อนกด — สร้างใบยา');
        await createButton.click();
        const res = await created;
        const body = (await res.json().catch(() => ({}))) as { prescriptionId?: string };
        expect(res.ok(), `สร้างใบยาไม่สำเร็จ (${res.status()})`).toBe(true);
        note(`ใบยาของ HN ${p.hn}`, body.prescriptionId ?? '(ไม่ทราบเลข)');
        return body.prescriptionId ?? '';
      };
      const openPrescription = async (p: { hn: string }) => {
        await gotoPharmacy();
        const tab = page.getByRole('tab', { name: /ใบยารอจัด/ });
        await tab.click();
        await page.waitForTimeout(2_500);
        const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: p.hn }).first();
        await expect(row, `ใบยาของ HN ${p.hn} ต้องอยู่แท็บ ใบยารอจัด`).toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(tab), clicked(row));
        await snapEvidence(page, 'ก่อนกด — ใบยาในแท็บ ใบยารอจัด');
        await row.locator('td').nth(3).click();
        await page.waitForURL(/preset=pharmacyViewPrescription/, { timeout: 60_000 });
        await page.waitForTimeout(3_000);
      };
      const rxPrintButton = main.getByRole('button', { name: /พิมพ์ใบยา/ }).filter({ visible: true }).last();
      const rxRefillItem = page.getByRole('menuitem', { name: 'พิมพ์ใบ Refill ยา', exact: true });
      const openRxPrintMenu = async () => {
        await expect(rxPrintButton).toBeEnabled({ timeout: 30_000 });
        await markEvidence(clicked(rxPrintButton));
        await snapEvidence(page, 'ก่อนกด — ปุ่มพิมพ์ใบยา');
        await rxPrintButton.click();
        await expect(rxRefillItem, 'เมนูพิมพ์ใบยาต้องมีรายการ "พิมพ์ใบ Refill ยา"').toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(1_500); // สิทธิ์การพิมพ์ (print-eligibility) โหลดตามหลัง
      };

      // ── Discharge: Visit ตรวจเสร็จ → รายการผู้ป่วยนอก (หลังตรวจ) → ปุ่มจำหน่าย (Super_User ก่อน · กดไม่ได้ใช้ Nurse) ──
      const discharge = async (p: { hn: string; vn: string }, tag: string): Promise<Page> => {
        await openEmr(p);
        const status = main.locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
        if (!/ตรวจเสร็จ|จำหน่าย/.test((await status.textContent().catch(() => '')) ?? '')) {
          await setVisitStatus(page, 'พร้อมตรวจ');
          await setVisitStatus(page, 'ตรวจเสร็จ');
        }
        let pg = page;
        await selectOpdUnit(pg, 'แผนกอายุรกรรม', 'หลังตรวจ');
        let row = await opdListRow(pg, p.hn);
        let button = row.getByRole('button', { name: 'จำหน่าย', exact: true });
        if (!(await button.isVisible().catch(() => false)) || !(await button.isEnabled().catch(() => false))) {
          await markEvidence(expected(row));
          await snapEvidence(page, `Super_User — แถวผู้ป่วยไม่มีปุ่มจำหน่ายที่กดได้ (${tag})`);
          note(`จำหน่าย (${tag})`, 'Super_User ไม่มีปุ่มจำหน่ายที่กดได้ → ใช้บัญชี Nurse (หน้าต่างแยก)');
          pg = await nursePage(browser);
          await selectOpdUnit(pg, 'แผนกอายุรกรรม', 'หลังตรวจ');
          row = await opdListRow(pg, p.hn);
          button = row.getByRole('button', { name: 'จำหน่าย', exact: true });
        } else note(`จำหน่าย (${tag})`, 'Super_User');
        await expect(button, 'แถวผู้ป่วยต้องมีปุ่มจำหน่าย').toBeEnabled({ timeout: 30_000 });
        await markEvidence(clicked(button));
        await snapEvidence(pg, `ก่อนกด — จำหน่าย (${tag})`);
        const done = graphqlMutation(pg, 'DischargeEncounterStatus', 60_000);
        await button.click();
        const body = (await (await done).json()) as { data?: { dischargeEncounterStatus?: { accepted?: boolean } }; errors?: { message: string }[] };
        expect(body.data?.dischargeEncounterStatus?.accepted, `จำหน่ายไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
        await pg.waitForURL(/actions=dischargeForm/, { timeout: 90_000 });
        await expect(pg.getByRole('heading', { name: 'Discharge', level: 3 })).toBeVisible({ timeout: 90_000 });
        await expect(mainOf(pg).getByText('การจัดการหลังตรวจ', { exact: true })).toBeVisible({ timeout: 60_000 });
        await pg.waitForTimeout(3_000);
        return pg;
      };
      const refillAlert = (pg: Page) => mainOf(pg).getByRole('alert').filter({ hasText: 'การตรวจรักษาครั้งนี้มียา Refill' });

      // ── ประวัติการรักษา → Visit → แท็บ OPD Summary ──
      const openHistory = async (pg: Page, p: { hn: string; vn: string }, visitDate?: RegExp) => {
        await gotoPatient(pg, p.hn);
        await pg.waitForTimeout(4_000);
        await recordMenu(pg, 'ประวัติการรักษา');
        const m = mainOf(pg);
        const item = visitDate ? m.getByText(visitDate).first() : undefined;
        if (item) {
          await expect(item, 'รายการ Encounter ฝั่งซ้ายต้องมี Visit ที่เลือก').toBeVisible({ timeout: 60_000 });
          await pg.mouse.move(900, 700); // เมนูซ้ายที่กางค้างบังรายการ Encounter
          await markEvidence(clicked(item));
          await snapEvidence(pg, 'ก่อนกด — Visit ในประวัติการรักษา');
          await item.dispatchEvent('click'); // คลิกเมาส์ผ่านแถบเมนูซ้ายแล้วเมนูกางทับ (รอบ 1)
          await pg.waitForTimeout(3_000);
        }
        const tab = m.getByRole('tab', { name: 'OPD Summary' }).first();
        await expect(tab).toBeVisible({ timeout: 60_000 });
        await tab.click();
        await expect(m.getByRole('button', { name: PRINT_LABEL }).first(), 'แท็บ OPD Summary ต้องมีปุ่มพิมพ์ใบ Refill ยา').toBeVisible({ timeout: 60_000 });
        await pg.waitForTimeout(3_000); // ความคืบหน้า Refill โหลดตามหลัง
        return m.getByRole('button', { name: PRINT_LABEL }).first();
      };

      // ── Pre-condition ──
      const newPatient = async (label: string) => {
        const patient = newTestPatient(label);
        let hn = '';
        let vn = '';
        let en = '';
        let newVisitEnabled = false;
        await checkStep(page, `Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ (${label})`, async () => {
          await gotoReception(page);
          await markEvidence(clicked(newPatientButton(page)));
          await fillNewPatientForm(page, patient);
          const f = receptionFrame(page);
          const save = saveNewPatientButton(page);
          await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await markEvidence(filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), clicked(save));
          await snapEvidence(page, `ก่อนกด — บันทึกผู้ป่วยใหม่ (${label})`);
          hn = await saveNewPatient(page);
          newVisitEnabled = await expectPatientInfo(page);
        });
        await checkStep(page, `Pre-condition เปิด Visit OPD แผนกอายุรกรรม (${label})`, async () => {
          if (newVisitEnabled) await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          vn = opd.vn;
          en = opd.en;
          note(`ผู้ป่วย ${label}`, `${patient.firstName} ${patient.familyName} · HN ${hn} · ${vn} · EN (OPD) ${en} · ${opd.clinic} · ${opd.doctor}`);
        });
        await checkStep(page, `Pre-condition เช็คอิน Visit OPD (${label})`, async () => {
          await selectOpdUnit(page);
          const row = await opdListRow(page, hn);
          await markEvidence(expected(row.getByText(`HN ${hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
          await snapEvidence(page, `ก่อนกด — เช็คอิน Visit OPD (${label})`);
          await checkInFromOpdList(page, row);
        });
        console.log(`    ทำต่อกับรายเดิม: SBH1732_${label}=${hn},${vn},${en}`);
        return { hn, vn, en };
      };
      const fromEnv = (name: string) => {
        const [hn, vn, en] = (process.env[name] ?? '').split(',');
        return hn ? { hn, vn, en } : undefined;
      };
      const from = ORDER.indexOf((process.env.SBH1732_FROM ?? '001') as TcNo);
      const run = (n: TcNo) => ORDER.indexOf(n) >= from;
      const [oldHn, oldVn] = (process.env.SBH1732_OLD ?? '6931942,V69101927406').split(',');
      const OLD = { hn: oldHn, vn: oldVn };

      let P1 = fromEnv('SBH1732_P1');
      if (run('001') || ORDER.slice(0, 11).some(run)) {
        if (!P1) P1 = await newPatient('P1');
        else note('ผู้ป่วย P1', `ผู้ป่วยเดิม HN ${P1.hn} · ${P1.vn} · EN ${P1.en}`);
      }
      // แผนของยา A ที่แต่ละ TC จดให้ TC ถัดไป (ทำต่อกลางทาง: อ่านจากหน้าต่าง Refill ใหม่)
      const plan = { dates: [] as string[], qty: ['7', '7', '7'] };
      const readCurrentPlan = async () => {
        await openRefillDialog('อ่านแผนปัจจุบัน');
        const now = await readPlan(DRUG_A.name);
        plan.dates = now.dates;
        plan.qty = now.qty;
        await closeRefillDialog();
      };

      // ── TC-001 ชื่อปุ่มใน modal จัดการการเติมยา ──
      if (P1 && run('001')) {
        await startClip(page, 'TC-001');
        await soft(page, `${TC('001')} ขั้น 1-4 CPOE สั่งยา A Refill 3 รอบ → modal จัดการการเติมยา → ปุ่มพิมพ์มุมขวาบนชื่อ "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา"`, async () => {
          await openEmr(P1!);
          await addMedicineToCart(page, DRUG_A.code, async () => {
            const period = main.getByRole('spinbutton', { name: 'ระยะเวลาการใช้' });
            await period.fill('4');
            await period.press('Tab');
            const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
            await qty.fill('28');
            await qty.press('Tab');
            await expect(qty).toHaveValue('28');
            await markEvidence(filled(period), filled(qty));
            await snapEvidence(page, 'กรอก — ยา A ระยะเวลา 4 สัปดาห์ ยอดรวม 28');
          });
          await expect(basketRow(DRUG_A.code)).toBeVisible({ timeout: 30_000 });
          await openRefillDialog('TC-001');
          const period = dialog.getByRole('spinbutton').first();
          await period.fill('10');
          await period.press('Tab');
          const add = dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
          for (let i = 0; i < 6 && (await roundHeaders.count()) < 3; i++) {
            await add.click();
            await page.waitForTimeout(500);
          }
          await expect(roundHeaders, 'ต้องมี 3 รอบ').toHaveCount(3, { timeout: 5_000 });
          const inputs = await roundInputs(DRUG_A.name);
          for (const box of inputs) {
            await box.fill('7');
            await box.press('Tab');
          }
          await expect(dispenseNow(DRUG_A.name)).toHaveValue('7');
          note('ปุ่มพิมพ์ในหน้าต่างก่อนยืนยันแผน', (await dialogPrint.isEnabled().catch(() => false)) ? 'กดได้' : 'disable (ยังไม่บันทึกแผน)');
          await markEvidence(filled(period), ...inputs.map(filled), expected(dialogPrint));
          await holdForClip(page);
          await snapEvidence(page, 'ตั้งแผน Refill 3 รอบ รอบละ 7 (ก่อนยืนยัน)');
          await saveRefillPlan('TC-001');
          await openRefillDialog('TC-001 เปิดอีกครั้ง');
          await expect(dialogPrint, 'ปุ่มพิมพ์มุมขวาบนของหน้าต่างต้องชื่อ "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา"').toHaveText(/^\s*พิมพ์ใบค้างจ่ายยา\/ใบ Refill ยา\s*$/);
          note('ชื่อปุ่มในหน้าต่าง Refill', (await dialogPrint.innerText()).trim());
          await markEvidence(expected(dialogPrint));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'ปุ่มพิมพ์ในหน้าต่างจัดการการเติมยา');
          const p = await readPlan(DRUG_A.name);
          plan.dates = p.dates;
          plan.qty = p.qty;
          note('แผนยา A', JSON.stringify(p));
        });
      }

      // ── TC-002 พิมพ์จากปุ่มใน modal ──
      if (P1 && run('002')) {
        await startClip(page, 'TC-002');
        await soft(page, `${TC('002')} ขั้น 4-5 กดปุ่ม "พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา" ในหน้าต่าง → ใบ Refill แสดงยาและรอบเติมยาตรงกับที่สั่ง`, async () => {
          if (!(await dialog.isVisible().catch(() => false))) {
            if (!run('001')) await openEmr(P1!);
            await openRefillDialog('TC-002');
            const p = await readPlan(DRUG_A.name);
            plan.dates = p.dates;
            plan.qty = p.qty;
          }
          await expect(dialogPrint).toBeEnabled({ timeout: 15_000 });
          await markEvidence(clicked(dialogPrint));
          await snapEvidence(page, 'ก่อนกด — พิมพ์ใบค้างจ่ายยา/ใบ Refill ยา (หน้าต่าง Refill)');
          const pdf = await printAndCapture(page, dialogPrint, 'TC-002');
          await checkRefillPdf(page, pdf, 'ใบ Refill ที่พิมพ์จากหน้าต่างจัดการการเติมยา (TC-002)', { ...P1!, drug: DRUG_A.name, ...plan });
        });
        await closeRefillDialog();
      }

      // ── TC-007 แก้จำนวนจ่ายรอบ 1 แล้วพิมพ์ ──
      if (P1 && run('007')) {
        await startClip(page, 'TC-007');
        await soft(page, `${TC('007')} ขั้น 1-4 แก้จำนวนจ่ายเติมยาครั้งที่ 1 จาก 7 เป็น 5 → ยืนยัน → พิมพ์ → ใบ Refill แสดง 5`, async () => {
          if (!run('002')) await openEmr(P1!);
          if (!plan.dates.length) await readCurrentPlan();
          await openRefillDialog('TC-007');
          const [first] = await roundInputs(DRUG_A.name);
          note('จำนวนจ่ายครั้งที่ 1 ก่อนแก้', await first.inputValue());
          await first.fill('5');
          await first.press('Tab');
          await markEvidence(filled(first), expected(dispenseNow(DRUG_A.name)));
          await holdForClip(page);
          await snapEvidence(page, 'กรอก — เติมยาครั้งที่ 1 จำนวน 5');
          await saveRefillPlan('TC-007');
          await openRefillDialog('TC-007 เปิดอีกครั้ง');
          const p = await readPlan(DRUG_A.name);
          plan.dates = p.dates;
          plan.qty = p.qty;
          note('แผนยา A หลังแก้จำนวน', JSON.stringify(p));
          expect(p.qty[0], 'เปิดหน้าต่างอีกครั้ง เติมยาครั้งที่ 1 ต้องเป็น 5').toBe('5');
          await markEvidence(clicked(dialogPrint));
          await snapEvidence(page, 'ก่อนกด — พิมพ์ใบ Refill หลังแก้จำนวน');
          const pdf = await printAndCapture(page, dialogPrint, 'TC-007');
          const { rounds } = await checkRefillPdf(page, pdf, 'ใบ Refill หลังแก้จำนวนจ่ายครั้งที่ 1 (TC-007)', { ...P1!, drug: DRUG_A.name, ...plan });
          expect(rounds[0]?.qty, 'ใบ Refill ครั้งที่ 1 ต้องเป็น 5').toBe('5');
        });
        await closeRefillDialog();
      }

      // ── TC-008 เลื่อนวันที่รอบ 1 ออกไป 7 วัน แล้วพิมพ์ ──
      if (P1 && run('008')) {
        await startClip(page, 'TC-008');
        await soft(page, `${TC('008')} ขั้น 1-4 เลื่อนวันที่เติมยาครั้งที่ 1 ออกไป 7 วัน → ยืนยัน → พิมพ์ → ใบ Refill แสดงวันที่ใหม่`, async () => {
          if (!run('007')) await openEmr(P1!);
          if (!plan.dates.length) await readCurrentPlan();
          await openRefillDialog('TC-008');
          const old = await roundDates().nth(1).inputValue();
          const target = addDays(old, 7);
          note('วันที่เติมยาครั้งที่ 1', `${old} → ${target}`);
          const box = await pickRoundDate(1, target);
          await markEvidence(filled(box));
          await holdForClip(page);
          await snapEvidence(page, `กรอก — วันที่เติมยาครั้งที่ 1 = ${target}`);
          await saveRefillPlan('TC-008');
          await openRefillDialog('TC-008 เปิดอีกครั้ง');
          const p = await readPlan(DRUG_A.name);
          plan.dates = p.dates;
          plan.qty = p.qty;
          note('แผนยา A หลังแก้วันที่', JSON.stringify(p));
          expect(p.dates[0], `เปิดหน้าต่างอีกครั้ง วันที่เติมยาครั้งที่ 1 ต้องเป็น ${target}`).toBe(target);
          await markEvidence(expected(roundDates().nth(1)), clicked(dialogPrint));
          await snapEvidence(page, 'ก่อนกด — พิมพ์ใบ Refill หลังแก้วันที่ (วันที่บนจอ)');
          const pdf = await printAndCapture(page, dialogPrint, 'TC-008');
          const { rounds } = await checkRefillPdf(page, pdf, 'ใบ Refill หลังเลื่อนวันที่ครั้งที่ 1 (TC-008)', { ...P1!, drug: DRUG_A.name, ...plan });
          note('รูปแบบวันที่', `บนจอ ${target} (ปี พ.ศ. แบบ YYYY-MM-DD) · ใบ Refill "${rounds[0]?.date}" (ปี พ.ศ.)`);
          expect(rounds[0]?.date, 'ใบ Refill ครั้งที่ 1 ต้องเป็นวันที่ที่แก้ล่าสุด (ปี พ.ศ. เหมือนบนจอ)').toBe(thaiShortDate(target));
        });
        await closeRefillDialog();
      }

      // ── Pre-condition ของ TC-010 / 011 / 009: ส่งคำสั่ง + ใบรับรองแพทย์ใน VN เดียวกัน ──
      if (P1 && ORDER.slice(ORDER.indexOf('010'), ORDER.indexOf('009') + 1).some(run) && from <= ORDER.indexOf('010')) {
        await soft(page, 'Pre-condition ส่งคำสั่ง (P1) + ออกใบรับรองแพทย์ใน VN เดียวกัน (TC-009)', async () => {
          if (!(await sendButton.isVisible().catch(() => false))) await openEmr(P1!);
          if (await sendButton.isEnabled().catch(() => false)) await sendOrders();
          const cert = await createMedicalCertificate(page).catch(async (error: unknown) => {
            // ใบรับรองแพทย์ (ภาษาไทย) ของ OPD dev-x บังคับ ความเห็นแพทย์ + ลาพักตั้งแต่ / ถึงวันที่ (helper เดิมกรอกไม่ครบ) → กรอกที่เหลือแล้วบันทึกใหม่
            note('ใบรับรองแพทย์ รอบแรกบันทึกไม่ได้', firstLine(error));
            const opinion = main.getByPlaceholder('ความเห็นแพทย์');
            if (await opinion.isVisible().catch(() => false)) await opinion.fill('ไม่มีอาการผิดปกติ (ทดสอบ SBH-1732)');
            const dates = main.getByPlaceholder('เลือกวันที่').filter({ visible: true });
            for (let i = 0; i < (await dates.count()); i++) {
              await dates.nth(i).click();
              await page.locator('.ant-picker-dropdown:visible .ant-picker-now-btn, .ant-picker-dropdown:visible .ant-picker-today-btn').first().click();
              await page.waitForTimeout(400);
            }
            await markEvidence(filled(opinion), ...(await dates.all()).map(filled));
            const save = main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).last();
            await save.click();
            await expect(main.getByText(/^สร้างโดย:/).last(), 'บันทึกใบรับรองแพทย์แล้วต้องแสดงผู้สร้างเอกสาร').toBeVisible({ timeout: 30_000 });
            return 'ใบรับรองแพทย์ (ภาษาไทย)';
          });
          note('ใบรับรองแพทย์ (P1)', cert);
          await snapEvidence(page, 'ใบรับรองแพทย์ที่สร้างใน VN เดียวกัน');
        });
      }

      // ── TC-010 / 011 หน้าใบยา ห้องยา ──
      if (P1 && run('010')) {
        await soft(page, 'Pre-condition ห้องยา: สร้างใบยาของ P1', async () => {
          await createPrescription(P1!);
        });
        await startClip(page, 'TC-010');
        await soft(page, `${TC('010')} ขั้น 3-5 หน้าใบยา → พิมพ์ใบยา → พิมพ์ใบ Refill ยา → ใบ Refill แสดงยาและรอบเติมยาตรงกับที่สั่ง`, async () => {
          if (!plan.dates.length) {
            await openEmr(P1!);
            await readCurrentPlan();
          }
          await openPrescription(P1!);
          await openRxPrintMenu();
          await expect(rxRefillItem, 'เมนูพิมพ์ใบ Refill ยาต้องกดได้').not.toHaveAttribute('aria-disabled', 'true');
          await markEvidence(clicked(rxRefillItem));
          await snapEvidence(page, 'ก่อนกด — พิมพ์ใบ Refill ยา (หน้าใบยา)');
          const pdf = await printAndCapture(page, rxRefillItem, 'TC-010');
          await checkRefillPdf(page, pdf, 'ใบ Refill ที่พิมพ์จากหน้าใบยา ห้องยา (TC-010)', { ...P1!, drug: DRUG_A.name, ...plan });
        });
      }
      if (P1 && run('011')) {
        await startClip(page, 'TC-011');
        await soft(page, `${TC('011')} ขั้น 3-5 หน้าใบยา → พิมพ์ใบ Refill ยา → จำนวนจ่ายเติมยาครั้งที่ 1 = 5 (ค่าที่แพทย์แก้ใน TC-007)`, async () => {
          if (!page.url().includes('pharmacyViewPrescription')) await openPrescription(P1!);
          await openRxPrintMenu();
          await markEvidence(clicked(rxRefillItem));
          await snapEvidence(page, 'ก่อนกด — พิมพ์ใบ Refill ยา (TC-011)');
          const pdf = await printAndCapture(page, rxRefillItem, 'TC-011');
          const { rounds } = await checkRefillPdf(page, pdf, 'ใบ Refill จากหน้าใบยา หลังแพทย์แก้จำนวน (TC-011)', { ...P1!, drug: DRUG_A.name, ...plan });
          expect(rounds[0]?.qty, 'ใบ Refill ครั้งที่ 1 ต้องเป็น 5').toBe('5');
        });
      }

      // ── TC-003 / 004 / 009 หน้า Discharge ──
      let dp: Page | undefined;
      if (P1 && (run('003') || run('004') || run('009'))) {
        await soft(page, 'Pre-condition Visit ตรวจเสร็จ → จำหน่าย (P1) → หน้า Discharge', async () => {
          if (!plan.dates.length) {
            await openEmr(P1!);
            await readCurrentPlan();
          }
          dp = await discharge(P1!, 'P1');
        });
      }
      if (P1 && dp && run('003')) {
        await startClip(dp, 'TC-003');
        await soft(dp, `${TC('003')} ขั้น 3-4 หน้า Discharge → ตำแหน่งปุ่มพิมพ์ใบ Refill ยา เทียบส่วนพิมพ์คิวยา`, async () => {
          const alert = refillAlert(dp!);
          await expect(alert, 'หน้า Discharge ต้องมีแถบ "การตรวจรักษาครั้งนี้มียา Refill / ยาค้างจ่าย"').toBeVisible({ timeout: 30_000 });
          await alert.evaluate((el) => el.scrollIntoView({ block: 'center' })); // รอบ 2: แถบเลื่อนไปอยู่ใต้หัวแผง Discharge ภาพเห็นไม่ครบ
          const button = alert.getByRole('button', { name: PRINT_LABEL });
          const queue = mainOf(dp!).getByText('การจัดการหลังตรวจ', { exact: true });
          const grid = mainOf(dp!).locator('[class*="discharge-display-queue-grid"]').first();
          // แถวคิวยา (เช่น "คิวรับยาปกติ") — ปุ่มพิมพ์ของแถวอยู่บรรทัดเดียวกับชื่อคิว
          const drugQueue = grid.getByText(/คิว.*ยา/).first();
          await expect(button).toBeVisible();
          const b = (await button.boundingBox())!;
          const q = (await drugQueue.boundingBox().catch(() => null)) ?? (await queue.boundingBox())!;
          const gridText = (await grid.innerText().catch(() => '')).replace(/\s+/g, ' ');
          note('ปุ่มพิมพ์ใบ Refill (Discharge)', `ชื่อ "${(await button.innerText()).trim()}" · y=${Math.round(b.y)} · ปุ่มพิมพ์คิวแรก y=${Math.round(q.y)} · ตารางคิว: ${gridText.slice(0, 200)}`);
          await markEvidence(expected(button), expected(grid));
          await holdForClip(dp!, 2_500);
          await snapEvidence(dp!, 'หน้า Discharge — ปุ่มพิมพ์ใบ Refill และส่วนพิมพ์คิว');
          expect(b.y, 'ปุ่มพิมพ์ใบ Refill ยาต้องอยู่ใต้ปุ่มพิมพ์คิวยา').toBeGreaterThan(q.y);
        });
      }
      if (P1 && dp && run('004')) {
        await startClip(dp, 'TC-004');
        await soft(dp, `${TC('004')} ขั้น 4-5 หน้า Discharge กดพิมพ์ใบ Refill ยา → ใบ Refill แสดงยาและรอบเติมยาตรงกับที่แพทย์สั่ง`, async () => {
          const button = refillAlert(dp!).getByRole('button', { name: PRINT_LABEL });
          await markEvidence(clicked(button));
          await snapEvidence(dp!, 'ก่อนกด — พิมพ์ใบ Refill ยา (Discharge)');
          const pdf = await printAndCapture(dp!, button, 'TC-004');
          await checkRefillPdf(dp!, pdf, 'ใบ Refill ที่พิมพ์จากหน้า Discharge (TC-004)', { ...P1!, drug: DRUG_A.name, ...plan });
        });
      }
      if (P1 && dp && run('009')) {
        await startClip(dp, 'TC-009');
        await soft(dp, `${TC('009')} ขั้น 4-5 เอกสารประกอบการรับบริการครั้งนี้ → พิมพ์จากจุดเดียว → ใบ Refill + ใบรับรองแพทย์ของ VN เดียวกัน`, async () => {
          const docs = mainOf(dp!).getByText(/^เอกสารประกอบการรับบริการครั้งนี้:/).first();
          await expect(docs).toBeVisible({ timeout: 30_000 });
          note('เอกสารประกอบการรับบริการ', (await docs.innerText()).trim());
          const button = refillAlert(dp!).getByRole('button', { name: PRINT_LABEL });
          await markEvidence(expected(docs), clicked(button));
          await snapEvidence(dp!, 'ก่อนกด — พิมพ์ (เอกสารประกอบการรับบริการครั้งนี้)');
          const pdf = await printAndCapture(dp!, button, 'TC-009');
          const pages = await pdfPages(pdf);
          const refillPages = pages.map((t, i) => (/ครั้งที่ \d+\/\d+/.test(t) ? i + 1 : 0)).filter(Boolean);
          const certPages = pages.map((t, i) => (/ใบรับรองแพทย์|รับรองว่า|Medical Certificate/i.test(t) && !/ครั้งที่ \d+\/\d+/.test(t) ? i + 1 : 0)).filter(Boolean);
          note('เอกสารที่พิมพ์รวม', `${pages.length} หน้า · ใบ Refill หน้า ${refillPages.join(', ') || '-'} · ใบรับรองแพทย์หน้า ${certPages.join(', ') || '-'} · ${pages.map((t, i) => `[${i + 1}] ${t.slice(0, 80)}`).join(' | ')}`);
          const rows: CompareRow[] = [
            { label: 'งานพิมพ์', values: ['1 งาน (ไฟล์เดียว)', `1 งาน · ${pages.length} หน้า`], same: true },
            { label: 'ใบ Refill ยา', values: ['มี', refillPages.length ? `หน้า ${refillPages.join(', ')}` : '(ไม่พบ)'], same: refillPages.length > 0 },
            { label: 'ใบรับรองแพทย์ (VN เดียวกัน)', values: ['มี', certPages.length ? `หน้า ${certPages.join(', ')}` : '(ไม่พบ)'], same: certPages.length > 0 },
          ];
          const overlay = await showPdf(dp!, pdf, 'เอกสารที่พิมพ์รวม — หน้าใบรับรองแพทย์ (TC-009)', certPages[0] ?? pages.length);
          const head = await pdfLineAt(overlay, /ใบรับรองแพทย์|รับรอง/);
          if (head) await markEvidence(expected(head));
          await showCompareTable(dp!, 'พิมพ์ใบ Refill รวมกับเอกสารอื่นใน VN เดียวกัน', ['ที่ควรเป็น', 'PDF ที่ส่งไปพิมพ์'], rows, { side: 'left' });
          await holdForClip(dp!, 2_500);
          await snapEvidence(dp!, 'เอกสารที่พิมพ์รวม (ใบรับรองแพทย์)');
          await hideCompareTable(dp!);
          await hidePdf(dp!);
          for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
        });
      }

      // ── TC-005 ประวัติการรักษา Visit เก่า (Super_User) ──
      if (run('005')) {
        await startClip(page, 'TC-005');
        await soft(page, `${TC('005')} ขั้น 3-4 ประวัติการรักษา → Visit เก่า ${OLD.vn} → OPD Summary → พิมพ์ใบ Refill ยา → ได้ใบ Refill ของ Visit นั้น`, async () => {
          const button = await openHistory(page, OLD, /19\/10\/2569/);
          await expect(button, 'ปุ่มพิมพ์ใบ Refill ยาต้องกดได้').toBeEnabled({ timeout: 30_000 });
          await markEvidence(expected(main.getByText(/^EN E\d+/).first()), clicked(button));
          await snapEvidence(page, 'ก่อนกด — พิมพ์ใบ Refill ยา (ประวัติการรักษา Visit เก่า)');
          const pdf = await printAndCapture(page, button, 'TC-005');
          await checkRefillPdf(page, pdf, `ใบ Refill ของ Visit เก่า ${OLD.vn} (TC-005)`, { ...OLD, drug: DRUG_A.name });
        });
      }

      // ── TC-006 ประวัติการรักษา ด้วย Nurse ──
      if (P1 && run('006')) {
        const nu = await nursePage(browser);
        await startClip(nu, 'TC-006');
        await soft(nu, `${TC('006')} ขั้น 2-4 บัญชี Nurse → ประวัติการรักษา → Visit ที่มียา Refill → OPD Summary → ปุ่มกดได้ + ได้ใบ Refill`, async () => {
          const button = await openHistory(nu, P1!);
          await expect(button, 'บัญชี Nurse ต้องกดปุ่มพิมพ์ใบ Refill ยาได้').toBeEnabled({ timeout: 30_000 });
          await markEvidence(clicked(button));
          await snapEvidence(nu, 'ก่อนกด — พิมพ์ใบ Refill ยา (Nurse · ประวัติการรักษา)');
          const pdf = await printAndCapture(nu, button, 'TC-006');
          await checkRefillPdf(nu, pdf, 'ใบ Refill ที่พิมพ์ด้วยบัญชี Nurse (TC-006)', { ...P1!, drug: DRUG_A.name, ...(plan.dates.length ? plan : {}) });
        });
      }

      // ── P2 ไม่มียา Refill: TC-012 / 015 / 013 / 014 ──
      let P2 = fromEnv('SBH1732_P2');
      if (['012', '015', '013', '014'].some((n) => run(n as TcNo))) {
        if (!P2) P2 = await newPatient('P2');
        else note('ผู้ป่วย P2', `ผู้ป่วยเดิม HN ${P2.hn} · ${P2.vn} · EN ${P2.en}`);
      }
      if (P2 && run('012')) {
        await startClip(page, 'TC-012');
        await soft(page, `${TC('012')} ขั้น 1-4 CPOE สั่งยาที่ไม่ได้ตั้งรอบ Refill → ปุ่มพิมพ์ใบค้างจ่ายยา/ใบ Refill ยา disable`, async () => {
          await openEmr(P2!);
          await addMedicineToCart(page, DRUG_B.code);
          await expect(basketRow(DRUG_B.code)).toBeVisible({ timeout: 30_000 });
          await page.waitForTimeout(2_000);
          const header = (await cpoePrint.count()) ? `${(await cpoePrint.isEnabled()) ? 'กดได้' : 'disable'}` : 'ไม่มีปุ่ม';
          note('ปุ่มพิมพ์ใบ Refill หัวตารางยา (CPOE ไม่มียา Refill)', header);
          if (await cpoePrint.count()) await markEvidence(expected(cpoePrint));
          await markEvidence(clicked(refillButton));
          await snapEvidence(page, 'CPOE ยาปกติ — ปุ่มพิมพ์หัวตาราง + ปุ่ม refill');
          await refillButton.click();
          await expect(dialog, 'กดปุ่ม refill แล้วต้องเปิดหน้าต่าง "จัดการการเติมยา (Refill)"').toBeVisible({ timeout: 20_000 });
          await page.waitForTimeout(2_000);
          note('ปุ่มพิมพ์ในหน้าต่าง Refill (ยาไม่ได้ตั้งรอบ)', (await dialogPrint.isEnabled()) ? 'กดได้' : 'disable');
          await markEvidence(expected(dialogPrint));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'หน้าต่างจัดการการเติมยาของยาที่ไม่ได้ตั้งรอบ — ปุ่มพิมพ์');
          await expect(dialogPrint, 'ปุ่มพิมพ์ใบค้างจ่ายยา/ใบ Refill ยา ต้อง disable').toBeDisabled();
          if (await cpoePrint.count()) await expect(cpoePrint, 'ปุ่มพิมพ์ใบ Refill หัวตารางยาต้อง disable').toBeDisabled();
        });
        await closeRefillDialog();
      }
      if (P2 && ['015', '013', '014'].some((n) => run(n as TcNo))) {
        await soft(page, 'Pre-condition ส่งคำสั่ง (P2) + ห้องยาสร้างใบยา', async () => {
          if (!(await sendButton.isVisible().catch(() => false))) await openEmr(P2!);
          if (await sendButton.isEnabled().catch(() => false)) await sendOrders();
          await createPrescription(P2!);
        });
      }
      if (P2 && run('015')) {
        await startClip(page, 'TC-015');
        await soft(page, `${TC('015')} ขั้น 3-4 หน้าใบยาที่ไม่มียา Refill → พิมพ์ใบยา → เมนู "พิมพ์ใบ Refill ยา" disable`, async () => {
          await openPrescription(P2!);
          await openRxPrintMenu();
          const state = await rxRefillItem.getAttribute('aria-disabled');
          note('เมนูพิมพ์ใบ Refill ยา (ใบยาไม่มียา Refill)', state === 'true' ? 'disable' : `กดได้ (aria-disabled=${state})`);
          await markEvidence(expected(rxRefillItem));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'เมนูพิมพ์ใบยา — พิมพ์ใบ Refill ยา (ไม่มียา Refill)');
          await expect(rxRefillItem, 'เมนูพิมพ์ใบ Refill ยาต้อง disable').toHaveAttribute('aria-disabled', 'true');
          await page.keyboard.press('Escape');
        });
      }
      let dp2: Page | undefined;
      if (P2 && run('013')) {
        await soft(page, 'Pre-condition Visit ตรวจเสร็จ → จำหน่าย (P2) → หน้า Discharge', async () => {
          dp2 = await discharge(P2!, 'P2');
        });
        if (dp2) {
          await startClip(dp2, 'TC-013');
          await soft(dp2, `${TC('013')} ขั้น 3-4 หน้า Discharge ของ Visit ที่ไม่มียา Refill → ปุ่มพิมพ์ใบ Refill ยา disable`, async () => {
            // หน้าจอแบ่ง 2 แผง: บน = คำสั่งการรักษา (CPOE มีปุ่มพิมพ์หัวตารางยาของตัวเอง) · ล่าง = Discharge → นับเฉพาะปุ่มที่อยู่ใต้หัว Discharge
            const heading = dp2!.getByRole('heading', { name: 'Discharge', level: 3 });
            const top = (await heading.boundingBox())?.y ?? 0;
            const all = await mainOf(dp2!).getByRole('button', { name: PRINT_LABEL }).all();
            const inDischarge: Locator[] = [];
            for (const btn of all) if (((await btn.boundingBox())?.y ?? -1) > top) inDischarge.push(btn);
            const alertShown = (await refillAlert(dp2!).count()) > 0;
            const state = inDischarge.length ? ((await inDischarge[0].isEnabled()) ? 'กดได้' : 'disable') : `ไม่แสดงปุ่ม${alertShown ? '' : ' (ไม่มีแถบ "การตรวจรักษาครั้งนี้มียา Refill")'}`;
            note('ปุ่มพิมพ์ใบ Refill ในแผง Discharge (ไม่มียา Refill)', state);
            const queue = mainOf(dp2!).getByText('การจัดการหลังตรวจ', { exact: true });
            const grid = mainOf(dp2!).locator('[class*="discharge-display-queue-grid"]').first();
            await markEvidence(expected(heading), expected(queue), expected(grid), ...inDischarge.map(expected));
            await holdForClip(dp2!, 2_500);
            await snapEvidence(dp2!, 'หน้า Discharge ไม่มียา Refill — ส่วนพิมพ์');
            expect(inDischarge.length, 'แผง Discharge ต้องแสดงปุ่ม "พิมพ์ใบ Refill ยา" (สถานะ disable)').toBeGreaterThan(0);
            await expect(inDischarge[0], 'ปุ่ม "พิมพ์ใบ Refill ยา" ต้องแสดงเป็น disable').toBeDisabled();
          });
        }
      }
      if (P2 && run('014')) {
        await startClip(page, 'TC-014');
        await soft(page, `${TC('014')} ขั้น 3-4 ประวัติการรักษา → Visit ที่ไม่มียา Refill → OPD Summary → ปุ่มพิมพ์ใบ Refill ยา disable`, async () => {
          const button = await openHistory(page, P2!);
          note('ปุ่มพิมพ์ใบ Refill (ประวัติการรักษา · ไม่มียา Refill)', (await button.isEnabled()) ? 'กดได้' : 'disable');
          await markEvidence(expected(button));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'ประวัติการรักษา OPD Summary — ปุ่มพิมพ์ใบ Refill (ไม่มียา Refill)');
          await expect(button, 'ปุ่มพิมพ์ใบ Refill ยาต้อง disable').toBeDisabled();
        });
      }

      if (nurse) {
        await finishVideo(nurse);
        await nurse.context().close();
      }
      note('ผลรวม', failures.length ? `ไม่ผ่าน ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
