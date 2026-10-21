import type { Locator, Page, Response } from '@playwright/test';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { capturePrintJobs, hidePdf, pdfLineAt, pdfPages, showPdf } from '../../../helpers/functions/print-capture';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit, orderAlert } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';

// การ์ด SBH-1731 [OPD][Pharmacy] เพิ่มปุ่ม Print queue รับยา — EXE SBH-2802 → TS SBH-2803 (HPY) / SBH-2804 (UHP) → TC-SBH-1731-001–004 (SBH-2805–2808)
// ปุ่ม = ไอคอนเครื่องพิมพ์ข้าง "ช่อง:" ในหัวใบยา (aria-label "พิมพ์คิวรับยา") → POST /cortex-api/queues/print (queueFifoIds ของคิวใบยา) → print agent thermal A5 (ดัก PDF ด้วย capturePrintJobs)
// dev-x 20 ต.ค. 2026: เลขคิวของใบยา Refill ออกตั้งแต่กด "สร้างใบยา" (คิวรับยาปกติ · running number เดียวกับคิวสั่งยาปกติ) — ปุ่มพิมพ์คิวเดิมของใบยา
// คนไข้ Refill = คนไข้ 2 ของ SBH-1738 (HN 6931983 · Visit Refill V69102027459 · Task ยา A GPO-L-ONE ยังไม่เติม 2 Encounter) — `SBH1731_REFILL=<HN>,<VN Refill>`
// TC-003: ผู้ป่วย AUTO ใหม่ Visit OPD สั่งยาปกติ (ไม่มีแผน Refill) → ส่งคำสั่ง → เลขคิวจากแท็บ Order รอยืนยัน → สร้างใบยา Refill ของคนไข้ Refill ทันที → พิมพ์คิว (`SBH1731_NORMAL=<HN>,<VN>,<EN>` = ผู้ป่วยเดิมที่ส่งคำสั่งแล้ว)
// ลำดับตาม EXE: 001 → 002 → 004 (ใบยาจาก TC-002 — ผู้ใช้เลือก) → 003 · บัญชี Super_User ทั้งฝั่งแพทย์และห้องยา · คลิป 1 ไฟล์ต่อ TC (R61) · TC ที่ไม่ผ่านไม่หยุดเทส
// รัน dev-x: npx playwright test --headed --grep @SBH-1731 --output=.cache/run-1731

const DRUG_A = { code: 'med0000007', name: 'GPO-L-ONE' };
const CLINIC1 = 'ห้องตรวจโรคอายุรกรรมทั่วไป';
const CLINIC2 = 'ห้องตรวจสระบุรี';
const TC = { '001': 'TC-001 (SBH-2805)', '002': 'TC-002 (SBH-2806)', '003': 'TC-003 (SBH-2807)', '004': 'TC-004 (SBH-2808)' } as const;
const ISSUES = ['SBH-1731', 'SBH-2802', 'SBH-2803', 'SBH-2804', 'SBH-2805', 'SBH-2806', 'SBH-2807', 'SBH-2808'];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();
const queueOf = (text: string) => text.match(/\b([A-Z])(\d{3})\b/)?.[0] ?? '';
const queueNo = (q: string) => Number(q.slice(1));

function dayPlus(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

test.describe('SBH-1731 ปุ่มพิมพ์คิวรับยา หน้า Prescription ห้องยา', () => {

  test(
    'คนไข้ Refill (Visit Walk-in รับยาต่อเนื่อง): สร้างใบยาจาก Task → tooltip / พิมพ์คิวรับยา (Prefix S M L ไม่ใช่ R) · running number ต่อจากคิวสั่งยาปกติ',
    { tag: ['@SBH-1731', ...ISSUES.slice(1).map((id) => `@${id}`)], annotation: ISSUES.map(linear) },
    async ({ page }) => {
      test.setTimeout(1_800_000);
      const main = page.getByRole('main');
      const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
      trackAuthorization(page);
      const printer = await capturePrintJobs(page);
      const failures: string[] = [];
      const skipTc = (process.env.SBH1731_SKIP ?? '').split(',').filter(Boolean);
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
      await page.addInitScript(recordNotices);
      const [refillHn, refillVn] = (process.env.SBH1731_REFILL ?? '6931983,V69102027459').split(',');

      // ── ห้องยา ──
      const createButton = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
      const goButton = main.getByRole('button', { name: /นำไปสร้างใบยา/ }).first();
      const gotoPharmacy = async () => {
        await page.goto('/cortex/pharmacy/select-location', { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await main.getByRole('combobox').first().click();
        await options.filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
        await page.waitForTimeout(800);
        await main.getByRole('combobox').nth(1).click();
        await page.waitForTimeout(800);
        await page.keyboard.press('Enter');
        await page.getByRole('button', { name: 'ส่ง' }).click();
        await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
      };
      /** แท็บ Order เติมยา → สถานะทั้งหมด · วันที่สิ้นสุด +60 วัน · ค้น HN */
      const openRefillTab = async (hn: string) => {
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
        await end.click();
        await end.fill(dayPlus(60));
        await end.press('Enter');
        await page.waitForTimeout(1_000);
        const box = main.getByRole('textbox', { name: /ค้นหา VN, HN/ });
        const res = page.waitForResponse((r) => r.url().includes('medication-refill-with-detail') && decodeURIComponent(r.url()).includes(`[hn][contains]=${hn}`), { timeout: 30_000 }).catch(() => undefined);
        await box.fill(hn);
        await box.press('Enter');
        await res;
        await page.waitForTimeout(1_500);
      };
      /** แถว Task ที่ยังไม่เติม: HN + คลินิก + รอบแรกสุดที่ยังไม่เติม */
      const pendingTaskRow = async (hn: string, clinic: string): Promise<{ row: Locator; round: string }> => {
        const rows = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `HN ${hn}` }).filter({ hasText: clinic }).filter({ hasText: 'ยังไม่เติม' });
        let best: { row: Locator; round: string; n: number } | undefined;
        for (let i = 0; i < (await rows.count()); i++) {
          const round = (await rows.nth(i).innerText()).split(/[\n\t]/).map((s) => s.trim()).find((s) => /^\d+\/\d+$/.test(s)) ?? '';
          const n = Number(round.split('/')[0] || 99);
          if (!best || n < best.n) best = { row: rows.nth(i), round, n };
        }
        if (!best) throw new Error(`ไม่มี Task ยังไม่เติมของ HN ${hn} · ${clinic}`);
        return best;
      };
      /** ติ๊ก Task → นำไปสร้างใบยา → ยืนยัน → สร้างใบยา → คืนเลขใบยา */
      const createFromTask = async (hn: string, clinic: string, tag: string): Promise<string> => {
        await openRefillTab(hn);
        const { row, round } = await pendingTaskRow(hn, clinic);
        await row.locator('input[type=checkbox]').check();
        await markEvidence(filled(row.locator('.ant-checkbox').first()), clicked(goButton));
        await snapEvidence(page, `ก่อนกด — นำไปสร้างใบยา (Task ${clinic} ${round} · ${tag})`);
        await goButton.click();
        const confirm = page.getByRole('dialog').filter({ hasText: 'ยืนยันการสร้างใบยา' });
        await expect(confirm).toBeVisible({ timeout: 15_000 });
        await confirm.getByRole('button', { name: /^นำไปสร้างใบยา$/ }).click();
        await page.waitForURL(/tab=medication-refill/, { timeout: 60_000 });
        await expect(createButton).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(2_500);
        const autoPrint = main.getByRole('checkbox', { name: 'Print ฉลากยาอัตโนมัติ' });
        if (await autoPrint.isChecked().catch(() => false)) await autoPrint.click();
        await markEvidence(clicked(createButton));
        await snapEvidence(page, `ก่อนกด — สร้างใบยา (${tag})`);
        const res = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/cortex-api/opd/prescriptions', { timeout: 60_000 });
        await createButton.click();
        const response = await res;
        const id = ((await response.json().catch(() => ({}))) as { prescriptionId?: string }).prescriptionId ?? '';
        note(`สร้างใบยา (${tag})`, `Task ${clinic} ${round} · POST ${response.status()} · ใบยา ${id || '-'}`);
        expect(response.status(), 'สร้างใบยาต้องสำเร็จ').toBeLessThan(300);
        await page.waitForTimeout(2_000);
        return id;
      };
      /** ใบยารอจัด → แถวใบยา → หน้า Prescription → ส่วนของใบยานี้ (หัว + ปุ่มพิมพ์คิว) */
      const openPrescription = async (hn: string, id: string) => {
        const no = id.split('-').pop() ?? '';
        await gotoPharmacy();
        await page.getByRole('tab', { name: /ใบยารอจัด/ }).click();
        await page.waitForTimeout(2_000);
        const search = main.getByRole('textbox', { name: /ค้นหา/ }).first();
        await search.fill(hn);
        await search.press('Enter');
        await page.waitForTimeout(2_500);
        const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: hn }).filter({ hasText: no }).first();
        await expect(row, `ใบยา ${no} ต้องอยู่แท็บใบยารอจัด`).toBeVisible({ timeout: 60_000 });
        const listQueue = queueOf(await row.innerText());
        await markEvidence(clicked(row));
        await snapEvidence(page, `ก่อนกด — ใบยา ${no} ในแท็บใบยารอจัด`);
        await row.locator('td').nth(3).click();
        await page.waitForURL(/preset=pharmacyViewPrescription/, { timeout: 60_000 });
        const title = main.getByText(new RegExp(`ใบยาเลขที่\\s*${no}`)).first();
        await expect(title).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(2_500);
        await title.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        const section = title.locator('xpath=ancestor::div[.//tr[contains(@class,"ant-table-row")]][1]');
        const header = section.locator('div').filter({ hasText: /คิว:/ }).filter({ hasText: /ช่อง:/ }).last();
        const queueLabel = header.locator('[class*="_queue-text_"]').filter({ visible: true }).first(); // "คิว: M018" (ป้าย + เลข)
        const button = header.getByRole('button', { name: 'พิมพ์คิวรับยา' });
        await expect(button, 'หัวใบยาต้องมีปุ่มพิมพ์คิวรับยา').toBeVisible({ timeout: 15_000 });
        const headerQueue = queueOf(await header.innerText());
        note(`ใบยา ${no}`, `แถวใบยารอจัด คิว ${listQueue || '-'} · หัวใบยา "${squash(await header.innerText())}"`);
        return { no, title, header, queueLabel, button, headerQueue, listQueue };
      };
      /** กดปุ่มพิมพ์คิวรับยา → PDF บัตรคิว (ดักจาก print agent) + คำขอ queues/print + แจ้งเตือน */
      const pressPrint = async (rx: Awaited<ReturnType<typeof openPrescription>>, tag: string) => {
        await markEvidence(clicked(rx.button), expected(rx.queueLabel));
        await snapEvidence(page, `ก่อนกด — พิมพ์คิวรับยา (${tag})`);
        const before = printer.jobs.length;
        const beforeNotice = (await notices(page)).length;
        const req = page.waitForResponse((r: Response) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/cortex-api/queues/print', { timeout: 30_000 }).catch(() => undefined);
        await rx.button.click();
        const res = await req;
        const job = await printer.next(before, 20_000);
        const toast = await waitNotice(page, beforeNotice, /พิมพ์|คิว|ผิดพลาด|ไม่สำเร็จ/, 8_000);
        const text = job ? (await pdfPages(job.pdf)).join(' ') : '';
        const ticket = queueOf(text.replace(/HN \d+/g, ''));
        const after = queueOf(await rx.header.innerText());
        if (job) await test.info().attach(`บัตรคิว ${tag}.pdf`, { body: job.pdf, contentType: 'application/pdf' });
        note(`พิมพ์คิว (${tag})`, `POST queues/print ${res?.status() ?? '-'} · req ${(res?.request().postData() ?? '-').slice(0, 120)} · ${job ? job.url.split('?')[0] : 'ไม่มีงานพิมพ์'} · บัตร "${text.slice(0, 160)}" · หัวใบยาหลังกด ${after} · แจ้งเตือน ${toast || '(ไม่มี)'}`);
        let overlay: Locator | undefined;
        if (job) {
          overlay = await showPdf(page, job.pdf, `บัตรคิวรับยาที่ส่งไปพิมพ์ (${tag}) — ภาพที่สคริปต์เปิดจาก PDF`);
          const line = await pdfLineAt(overlay, /^[A-Z]\d{3}$/);
          const toastEl = page.locator('.ant-message-notice, .ant-notification-notice').filter({ visible: true }).last();
          await markEvidence(...(line ? [expected(line)] : []), expected(rx.queueLabel), ...((await toastEl.count()) ? [alerted(toastEl)] : []));
          await holdForClip(page, 2_500);
          await snapEvidence(page, `บัตรคิวรับยา + หัวใบยา (${tag})`);
        }
        return { job, text, ticket, after, toast, status: res?.status() ?? 0 };
      };
      const verdict = async (title: string, tag: string, rows: CompareRow[]) => {
        await showCompareTable(page, title, ['ที่ควรเป็น', 'ที่เห็นจริง'], rows, { side: 'bottom' });
        await holdForClip(page, 2_500);
        await snapEvidence(page, `${tag} ผล`);
        await hideCompareTable(page);
        for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
      };

      // ── TC-001 tooltip ──
      let rx: Awaited<ReturnType<typeof openPrescription>> | undefined;
      let ticket2 = '';
      const rxId = process.env.SBH1731_RX ?? '';
      if (!skipTc.includes('001') || !skipTc.includes('002') || !skipTc.includes('004')) {
        await startClip(page, 'TC-001');
        await soft(`${TC['001']} ขั้น 1-3 คนไข้ Refill → สร้างใบยาจาก Task → หน้า Prescription → hover ไอคอนเครื่องพิมพ์ข้าง "ช่อง:" → tooltip "พิมพ์คิวรับยา"`, async () => {
          note('คนไข้ Refill', `HN ${refillHn} · Visit Walk-in รับยาต่อเนื่อง (Refill) ${refillVn}`);
          const id = rxId || (await createFromTask(refillHn, CLINIC1, 'TC-001'));
          rx = await openPrescription(refillHn, id);
          await rx.button.hover();
          const tip = page.locator('.ant-tooltip:visible').last();
          await expect(tip).toBeVisible({ timeout: 5_000 });
          const text = squash(await tip.innerText());
          note(`${TC['001']} tooltip`, text);
          await markEvidence(expected(tip), expected(rx.button));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'hover ปุ่มพิมพ์คิวรับยา — tooltip');
          expect(text, 'tooltip ต้องเป็น "พิมพ์คิวรับยา"').toBe('พิมพ์คิวรับยา');
          await page.mouse.move(700, 900);
        });
      }

      // ── TC-002 กดพิมพ์ → Prefix S / M / L · หัวใบยาเลขเดียวกัน ──
      if (!skipTc.includes('002') && rx) {
        await startClip(page, 'TC-002');
        await soft(`${TC['002']} ขั้น 1-3 กดไอคอนพิมพ์คิวรับยา → บัตรคิวขึ้นต้น S / M / L · "คิว:" หัวใบยาเลขเดียวกัน`, async () => {
          const r = await pressPrint(rx!, 'TC-002');
          ticket2 = r.ticket;
          await hidePdf(page);
          await verdict('บัตรคิวรับยาจากปุ่ม', 'TC-002', [
            { label: 'ได้บัตรคิวรับยา', values: ['มีงานพิมพ์', r.job ? `มี (${r.text.match(/คิว\S*/)?.[0] ?? 'บัตรคิว'})` : 'ไม่มี'], same: !!r.job },
            { label: 'Prefix เลขคิวบนบัตร', values: ['S / M / L', r.ticket || '-'], same: /^[SML]\d{3}$/.test(r.ticket) },
            { label: '"คิว:" หัวใบยา', values: [r.ticket || 'เลขเดียวกับบัตร', r.after || '-'], same: !!r.ticket && r.after === r.ticket },
          ]);
        });
      }

      // ── TC-004 กดพิมพ์ซ้ำ (ใบยาจาก TC-002) → ไม่ขึ้นต้นด้วย R ──
      if (!skipTc.includes('004') && rx) {
        await startClip(page, 'TC-004');
        await soft(`${TC['004']} ขั้น 1-3 ใบยาจาก TC-002 → กดไอคอนพิมพ์คิวรับยา → เลขคิวไม่ขึ้นต้นด้วย R`, async () => {
          rx = await openPrescription(refillHn, rxId || `-${rx!.no}`);
          const r = await pressPrint(rx, 'TC-004');
          await hidePdf(page);
          await verdict('เลขคิวจากปุ่ม (ใบยาเดิมของ TC-002)', 'TC-004', [
            { label: 'บัตรคิว', values: ['ไม่ขึ้นต้นด้วย R', r.ticket || '-'], same: !!r.ticket && !r.ticket.startsWith('R') },
            { label: '"คิว:" หัวใบยา', values: ['ไม่ขึ้นต้นด้วย R', r.after || '-'], same: !!r.after && !r.after.startsWith('R') },
            { label: 'เทียบกับ TC-002', values: [ticket2 || '-', r.ticket || '-'], same: !ticket2 || ticket2 === r.ticket },
          ]);
        });
      }

      // ── TC-003 คิวสั่งยาปกติ → คิวใบยา Refill ต่อ running number เดียวกัน ──
      if (!skipTc.includes('003')) {
        await startClip(page, 'TC-003');
        let [nHn, nVn, nEn] = (process.env.SBH1731_NORMAL ?? '').split(',');
        let normalQueue = '';
        const sent = await soft(`${TC['003']} ขั้น 1 คนไข้ OPD ปกติ สั่งยา ${DRUG_A.name} (ไม่ใช่ Refill) → ส่งคำสั่ง → จดเลขคิวที่ระบบสร้าง`, async () => {
          if (!nHn) {
            const patient = newTestPatient('Q1731N');
            await gotoReception(page);
            await fillNewPatientForm(page, patient);
            const save = saveNewPatientButton(page);
            await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
            await markEvidence(filled(receptionFrame(page).getByTestId('firstName')), clicked(save));
            await snapEvidence(page, 'ก่อนกด — บันทึกผู้ป่วยใหม่ (คนไข้ OPD ปกติ)');
            nHn = await saveNewPatient(page);
            if (await expectPatientInfo(page)) await openNewVisitPanel(page);
            const opd = await openOpdVisit(page);
            nVn = opd.vn;
            nEn = opd.en;
            await selectOpdUnit(page);
            await checkInFromOpdList(page, await opdListRow(page, nHn));
            note('คนไข้ OPD ปกติ', `${patient.firstName} ${patient.familyName} · HN ${nHn} · ${nVn} · ${nEn}`);
            await page.goto(`/cortex/next/patients/${nHn}?en=${nEn}&vn=${nVn}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
            await expect(main.getByText(`VN ${nVn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
            await page.waitForTimeout(3_000);
            await addMedicineToCart(page, DRUG_A.code);
            const send = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
            const beforeNotice = (await notices(page)).length;
            await markEvidence(expected(main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${DRUG_A.code}]` }).first()), clicked(send));
            await snapEvidence(page, 'ก่อนกด — ส่งคำสั่งยาปกติ (ไม่มีแผน Refill)');
            await send.click();
            const alert = orderAlert(page);
            if (await alert.waitFor({ state: 'visible', timeout: 6_000 }).then(() => true, () => false)) {
              for (const reason of await alert.getByRole('textbox').all()) await reason.fill('ทดสอบระบบ SBH-1731');
              await alert.getByRole('button', { name: 'ยืนยันการสั่งออเดอร์' }).click();
            }
            const toast = await waitNotice(page, beforeNotice, /ส่งคำสั่ง/, 60_000);
            note('ส่งคำสั่งยาปกติ', toast || '(ไม่เห็นแจ้งเตือน)');
            expect(toast).toMatch(/สำเร็จ/);
            console.log(`    ทำต่อ: SBH1731_NORMAL=${nHn},${nVn},${nEn}`);
          }
          await gotoPharmacy();
          const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `HN ${nHn}` }).first();
          await expect(row, 'Order ของคนไข้ OPD ปกติต้องอยู่แท็บ Order รอยืนยัน').toBeVisible({ timeout: 60_000 });
          normalQueue = queueOf(await row.innerText());
          note(`${TC['003']} คิวสั่งยาปกติ`, `${normalQueue || '-'} · ${squash(await row.innerText()).slice(0, 160)}`);
          await markEvidence(expected(row.locator('td').first()), expected(row));
          await holdForClip(page, 2_000);
          await snapEvidence(page, `คิวสั่งยาปกติ ${normalQueue} (Order รอยืนยัน)`);
          expect(normalQueue, 'Order สั่งยาปกติต้องมีเลขคิว').toMatch(/^[A-Z]\d{3}$/);
        });
        if (sent) await soft(`${TC['003']} ขั้น 2-3 สร้างใบยา Refill ของคนไข้อีกราย → กดพิมพ์คิวรับยา → เลขต่อจาก ${normalQueue}`, async () => {
          const id = await createFromTask(refillHn, CLINIC2, 'TC-003');
          const r3 = await openPrescription(refillHn, id);
          const r = await pressPrint(r3, 'TC-003');
          await hidePdf(page);
          // คิวที่ออกระหว่างนั้น (session อื่นบน dev-x) — แท็บ Order รอยืนยัน + ใบยารอจัด
          const between: string[] = [];
          if (r.ticket && normalQueue && queueNo(r.ticket) - queueNo(normalQueue) > 1) {
            await gotoPharmacy();
            for (const tab of [/Order รอยืนยัน/, /ใบยารอจัด/, /จ่ายยาแล้ว/]) {
              await page.getByRole('tab', { name: tab }).click();
              await page.waitForTimeout(2_500);
              for (const t of await main.locator('tr.ant-table-row').filter({ visible: true }).allInnerTexts()) {
                const q = queueOf(t);
                if (q && q[0] === normalQueue[0] && queueNo(q) > queueNo(normalQueue) && queueNo(q) < queueNo(r.ticket)) between.push(`${q} ${squash(t).slice(5, 90)}`);
              }
            }
            note(`${TC['003']} คิวที่ออกระหว่าง ${normalQueue} กับ ${r.ticket}`, between.join(' || ') || '(ไม่เห็นในแท็บห้องยา)');
          }
          const expectedNext = normalQueue ? `${normalQueue[0]}${String(queueNo(normalQueue) + 1).padStart(3, '0')}` : '-';
          await verdict('เลขคิวจากปุ่ม เทียบคิวสั่งยาปกติ', 'TC-003', [
            { label: 'คิวสั่งยาปกติ (ล่าสุด)', values: [normalQueue || '-', normalQueue || '-'], same: !!normalQueue },
            { label: 'Prefix เดียวกัน', values: [normalQueue[0] ?? '-', r.ticket[0] ?? '-'], same: !!r.ticket && r.ticket[0] === normalQueue[0] },
            { label: 'เลขถัดไป (ไม่ซ้ำ / ไม่เริ่มใหม่)', values: [`${expectedNext}${between.length ? ` (มีคิวอื่นแทรก ${between.length})` : ''}`, r.ticket || '-'], same: !!r.ticket && queueNo(r.ticket) === queueNo(normalQueue) + 1 + between.length },
          ]);
        });
      }

      note('ผลรวม', failures.length ? `ไม่ผ่าน ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
