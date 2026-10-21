import type { Locator, Page } from '@playwright/test';
import fs from 'node:fs';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { capturePrintJobs, hidePdf, pdfLineAt, pdfPages, refillRounds, showPdf, type PrintJob } from '../../../helpers/functions/print-capture';
import { expectPatientInfo, fillNewPatientForm, gotoReception, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';

// การ์ด SBH-1732 — ทดสอบซ้ำ TC-010 (SBH-2682) และ TC-011 (SBH-2683) ตามที่ผู้ใช้สั่ง 20 ต.ค. 2026 เย็น
//   TC-011: เก็บผล "ก่อนแก้" (หน้าต่าง Refill ครั้งที่ 1 = 2 + ใบ Refill ที่พิมพ์จากหน้าต่าง) → แพทย์แก้เป็น 5 → ยืนยัน → ห้องยาสร้างใบยา → "หลังแก้" (ใบ Refill จากหน้าใบยา = 5) — ตามลำดับใน TC (ผู้ใช้เลือก)
//   TC-010: หน้าใบยา → พิมพ์ใบยา ▾ → "พิมพ์ใบ Refill ยา" + รายการภาษาอังกฤษ "Print Refill Prescription" (ผู้ใช้ขอให้แคปผลใบภาษาอังกฤษด้วย)
// ผู้ป่วย AUTO ใหม่ 1 ราย Visit OPD MED · ยา GPO-L-ONE 28 เม็ด Refill 3 รอบ (2 / 7 / 7 · จ่ายครั้งนี้ 12) · บัญชี Super_User (แพทย์ + เภสัช) · ทิ้ง Visit ไว้ (R11)
// ทำต่อ: SBH1732R_P=<HN>,<VN>,<EN> (สั่งยา + แผน 2 / 7 / 7 แล้ว) · ไม่แตะ spec หลัก SBH-1732-refill-print-points.spec.ts
// รัน dev-x: npx playwright test --headed --grep @SBH-1732-retest --output=.cache/run-1732r

const DRUG_A = { code: 'med0000007', name: 'GPO-L-ONE' };
const TC = { '010': 'TC-010 (SBH-2682)', '011': 'TC-011 (SBH-2683)' } as const;
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();
const OUT = '.cache/sbh1732r';

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

test.describe('SBH-1732 ทดสอบซ้ำ TC-010 / TC-011', () => {
  test(
    'ใบ Refill ยาจากหน้าใบยา (ไทย + อังกฤษ) · ก่อน / หลังแพทย์แก้จำนวนจ่ายเติมยาครั้งที่ 1 (2 → 5)',
    { tag: ['@SBH-1732-retest', '@SBH-2682', '@SBH-2683'], annotation: ['SBH-1732', 'SBH-2682', 'SBH-2683'].map((id) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` })) },
    async ({ page }) => {
      test.setTimeout(1_800_000);
      fs.mkdirSync(OUT, { recursive: true });
      const main = page.getByRole('main');
      const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
      const failures: string[] = [];
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
      const printer = await capturePrintJobs(page);

      // ── พิมพ์ / PDF ──
      const printAndCapture = async (target: Locator, tag: string): Promise<{ pdf: Buffer; url: string }> => {
        const before = printer.jobs.length;
        const noticeBefore = (await notices(page)).length;
        const api = page.waitForResponse((r) => /medication-refills|refill.*pdf|pdf.*refill/i.test(r.url()), { timeout: 45_000 }).catch(() => undefined);
        await target.click();
        const job: PrintJob | undefined = await printer.next(before, 45_000);
        const res = await api;
        const text = await waitNotice(page, noticeBefore, /พิมพ์|Refill|ไม่สำเร็จ|print/i, 5_000);
        const pdf = job?.pdf ?? (res?.ok() ? await res.body() : undefined);
        note(`พิมพ์ (${tag})`, `${res ? `${res.status()} ${res.request().method()} ${new URL(res.url()).pathname}${new URL(res.url()).search}` : '(ไม่เห็น API)'} · ${job ? job.url.replace(/\?.*$/, '') : 'ไม่มีงานพิมพ์'} · แจ้งเตือน ${text || '(ไม่มี)'}`);
        expect(pdf, 'กดพิมพ์แล้วต้องได้เอกสาร PDF').toBeTruthy();
        fs.writeFileSync(`${OUT}/${tag}.pdf`, pdf!);
        await test.info().attach(`${tag}.pdf`, { body: pdf!, contentType: 'application/pdf' });
        return { pdf: pdf!, url: res?.url() ?? job?.url ?? '' };
      };
      /** เปิด PDF ซ้อนจอ ตีกรอบ HN / VN / ครั้งที่ n → ตารางเทียบ (ซ้าย) → ภาพ */
      const showRefillPdf = async (pdf: Buffer, title: string, want: { hn: string; vn: string; qty: string[] }) => {
        const all = (await pdfPages(pdf)).join(' ');
        const rounds = refillRounds(all, DRUG_A.name);
        note(`ใบ Refill (${title})`, `${rounds.map((r) => `ครั้งที่ ${r.round}/${r.total} ${r.date} · ${r.qty}`).join(' | ')} · ข้อความต้นเอกสาร "${all.slice(0, 160)}"`);
        const overlay = await showPdf(page, pdf, title);
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
        const rows: CompareRow[] = [
          { label: 'HN', values: [want.hn, all.includes(`HN ${want.hn}`) ? want.hn : '(ไม่พบ)'], same: all.includes(`HN ${want.hn}`) },
          { label: 'ยา', values: [DRUG_A.name, all.includes(DRUG_A.name) ? 'มี' : '(ไม่พบ)'], same: all.includes(DRUG_A.name) },
          { label: 'จำนวนรอบ', values: [String(want.qty.length), String(rounds.length)], same: rounds.length === want.qty.length },
          ...want.qty.map((q, i) => ({ label: `ครั้งที่ ${i + 1} จำนวน`, values: [q, rounds[i]?.qty ?? '(ไม่มี)'], same: rounds[i]?.qty === q })),
        ];
        await showCompareTable(page, title, ['ที่ควรเป็น', 'ใบ Refill ที่พิมพ์'], rows, { side: 'left' });
        await holdForClip(page, 3_000);
        await snapEvidence(page, title);
        await hideCompareTable(page);
        await hidePdf(page);
        return { rows, rounds, all };
      };

      // ── CPOE ──
      const refillButton = main.getByRole('button', { name: /^refill/i }).first();
      const dialog = page.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' });
      const dialogPrint = dialog.getByRole('button', { name: /พิมพ์ใบค้างจ่ายยา/ });
      const confirmButton = dialog.getByRole('button', { name: 'ยืนยัน', exact: true });
      const cancelButton = dialog.getByRole('button', { name: 'ยกเลิก', exact: true });
      const roundHeaders = dialog.getByText(/^เติมยาครั้งที่ \d+$/);
      const drugRow = dialog.locator('tbody tr').filter({ hasText: DRUG_A.name }).first();
      const roundInputs = async (): Promise<Locator[]> => {
        const rounds = await roundHeaders.count();
        const all = drugRow.locator('input:not([disabled])');
        const n = await all.count();
        return Array.from({ length: n }, (_, i) => all.nth(i)).slice(Math.max(0, n - rounds));
      };
      const dispenseNow = drugRow.locator('input[disabled]').first();
      const sendButton = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
      const openEmr = async (p: { hn: string; vn: string; en: string }) => {
        await page.goto(`/cortex/next/patients/${p.hn}?en=${p.en}&vn=${p.vn}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await expect(main.getByText(`VN ${p.vn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await expect(main.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
        await page.waitForTimeout(2_500);
        for (const name of ['OPD', 'ประวัติการรักษา']) {
          const tab = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
          if (await tab.count()) await tab.first().locator('.dv-default-tab-action').click().catch(() => undefined);
        }
        await page.mouse.move(700, 1000);
      };
      const openRefillDialog = async (tag: string) => {
        await expect(refillButton).toBeVisible({ timeout: 30_000 });
        await markEvidence(clicked(refillButton));
        await snapEvidence(page, `ก่อนกด — ปุ่ม refill (${tag})`);
        await refillButton.click();
        await expect(dialog).toBeVisible({ timeout: 20_000 });
        await expect(drugRow).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(2_000);
      };
      const saveRefillPlan = async (tag: string) => {
        const before = (await notices(page)).length;
        await markEvidence(clicked(confirmButton));
        await snapEvidence(page, `ก่อนกด — ยืนยันแผน Refill (${tag})`);
        await confirmButton.click();
        const text = await waitNotice(page, before, /refill|เติมยา|กรุณา|ผิดพลาด|Err|failed/i);
        note(`แจ้งเตือนหลังยืนยันแผน (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        expect(text, 'ยืนยันแผนแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/successfully|สำเร็จ|อัปเดตรอบเติมยาแล้ว/i);
        await expect(dialog).toBeHidden({ timeout: 15_000 });
      };
      const sendOrders = async (tag: string) => {
        const before = (await notices(page)).length;
        await markEvidence(clicked(sendButton));
        await snapEvidence(page, `ก่อนกด — ส่งคำสั่ง (${tag})`);
        await sendButton.click();
        const text = await waitNotice(page, before, /ส่งคำสั่ง/, 60_000);
        note(`แจ้งเตือนหลังส่งคำสั่ง (${tag})`, text || '(ไม่เห็น)');
        expect(text).toMatch(/สำเร็จ/);
      };

      // ── ห้องยา ──
      const createButton = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
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
      const rxPrintButton = main.getByRole('button', { name: /พิมพ์ใบยา/ }).filter({ visible: true }).last();
      const rxRefillItem = page.getByRole('menuitem', { name: 'พิมพ์ใบ Refill ยา', exact: true });
      const rxRefillEnItem = page.getByRole('menuitem', { name: /Print Refill Prescription/i });
      const openPrescription = async (hn: string) => {
        await gotoPharmacy();
        const tab = page.getByRole('tab', { name: /ใบยารอจัด/ });
        await tab.click();
        await page.waitForTimeout(2_500);
        // ใบยาวันนี้หลายหน้า → ค้น HN ก่อน
        const search = main.getByRole('textbox', { name: /ค้นหา/ }).first();
        if (await search.isVisible().catch(() => false)) {
          await search.fill(hn);
          await search.press('Enter');
          await page.waitForTimeout(2_500);
        }
        const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: hn }).first();
        await expect(row, `ใบยาของ HN ${hn} ต้องอยู่แท็บ ใบยารอจัด`).toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(tab), clicked(row));
        await snapEvidence(page, 'ก่อนกด — ใบยาในแท็บ ใบยารอจัด');
        await row.locator('td').nth(3).click();
        await page.waitForURL(/preset=pharmacyViewPrescription/, { timeout: 60_000 });
        await page.waitForTimeout(3_000);
      };
      const openRxPrintMenu = async (tag: string) => {
        await expect(rxPrintButton).toBeEnabled({ timeout: 30_000 });
        await rxPrintButton.scrollIntoViewIfNeeded();
        await markEvidence(clicked(rxPrintButton));
        await snapEvidence(page, `ก่อนกด — ปุ่มพิมพ์ใบยา (${tag})`);
        await rxPrintButton.click();
        await expect(rxRefillItem).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(1_500);
        note(`เมนูพิมพ์ใบยา (${tag})`, (await page.getByRole('menuitem').allInnerTexts()).map(squash).join(' | '));
      };

      // ── Pre-condition: ผู้ป่วย AUTO ใหม่ + Visit OPD + เช็คอิน + สั่งยา Refill 2 / 7 / 7 + ส่งคำสั่ง ──
      let [hn, vn, en] = (process.env.SBH1732R_P ?? '').split(',');
      if (!hn) {
        await checkStep(page, 'Pre-condition ผู้ป่วย AUTO ใหม่ → Visit OPD แผนกอายุรกรรม → เช็คอิน', async () => {
          const patient = newTestPatient('Rf1732R');
          await gotoReception(page);
          await fillNewPatientForm(page, patient);
          const save = saveNewPatientButton(page);
          await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await markEvidence(filled(receptionFrame(page).getByTestId('firstName')), clicked(save));
          await snapEvidence(page, 'ก่อนกด — บันทึกผู้ป่วยใหม่');
          hn = await saveNewPatient(page);
          if (await expectPatientInfo(page)) await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          vn = opd.vn;
          en = opd.en;
          await selectOpdUnit(page);
          await checkInFromOpdList(page, await opdListRow(page, hn));
          note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${hn} · ${vn} · ${en} · ${opd.clinic}`);
        });
        await checkStep(page, `Pre-condition แพทย์สั่ง ${DRUG_A.name} 28 เม็ด Refill 3 รอบ (2 / 7 / 7) → ยืนยัน → ส่งคำสั่ง`, async () => {
          await openEmr({ hn, vn, en });
          await addMedicineToCart(page, DRUG_A.code, async () => {
            const period = main.getByRole('spinbutton', { name: 'ระยะเวลาการใช้' });
            await period.fill('4');
            await period.press('Tab');
            const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
            await qty.fill('28');
            await qty.press('Tab');
            await expect(qty).toHaveValue('28');
          });
          await openRefillDialog('สั่งยา');
          const period = dialog.getByRole('spinbutton').first();
          if (!(await period.inputValue())) {
            await period.fill('7');
            await period.press('Tab');
          }
          const add = dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
          for (let i = 0; i < 6 && (await roundHeaders.count()) < 3; i++) {
            await add.click();
            await page.waitForTimeout(500);
          }
          await expect(roundHeaders).toHaveCount(3, { timeout: 5_000 });
          const inputs = await roundInputs();
          for (const [i, v] of ['2', '7', '7'].entries()) {
            await inputs[i].fill(v);
            await inputs[i].press('Tab');
          }
          await expect(dispenseNow).toHaveValue('12');
          await markEvidence(...inputs.map(filled), expected(dispenseNow));
          await snapEvidence(page, 'กรอก — แผน Refill 2 / 7 / 7 (จ่ายครั้งนี้ 12)');
          await saveRefillPlan('สั่งยา');
          await sendOrders('สั่งยา');
          console.log(`    ทำต่อ: SBH1732R_P=${hn},${vn},${en}`);
        });
      } else note('ผู้ป่วย', `ผู้ป่วยเดิม HN ${hn} · ${vn} · ${en}`);
      const P = { hn, vn, en };

      // ── TC-011 ก่อนแก้ → แพทย์แก้ 2 → 5 → ห้องยาสร้างใบยา → หลังแก้ ──
      await startClip(page, 'TC-011');
      let before: string[] = [];
      let editOk = false;
      await soft(`${TC['011']} ก่อนแก้ — หน้าต่าง "จัดการการเติมยา (Refill)" เติมยาครั้งที่ 1 = 2 + ใบ Refill ที่พิมพ์ก่อนแก้`, async () => {
        await openEmr(P);
        await openRefillDialog('ก่อนแก้');
        before = await Promise.all((await roundInputs()).map((b) => b.inputValue()));
        note(`${TC['011']} แผนก่อนแก้`, `${before.join(' / ')} · จ่ายครั้งนี้ ${await dispenseNow.inputValue()}`);
        const [first] = await roundInputs();
        await markEvidence(expected(first), expected(dialog.getByText(/^เติมยาครั้งที่ 1$/).first()));
        await holdForClip(page, 2_000);
        await snapEvidence(page, 'ก่อนแก้ — หน้าต่าง Refill เติมยาครั้งที่ 1 = 2');
        await markEvidence(clicked(dialogPrint));
        await snapEvidence(page, 'ก่อนกด — พิมพ์ใบ Refill (ก่อนแก้)');
        const { pdf } = await printAndCapture(dialogPrint, 'TC-011-before');
        const { rows } = await showRefillPdf(pdf, 'ใบ Refill ก่อนแพทย์แก้ (ครั้งที่ 1 = 2)', { ...P, qty: before });
        expect(before[0], 'ก่อนแก้ เติมยาครั้งที่ 1 ต้องเป็น 2').toBe('2');
        for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
      });
      await soft(`${TC['011']} ขั้น 1 แพทย์แก้จำนวนจ่ายเติมยาครั้งที่ 1 จาก 2 เป็น 5 → ยืนยัน → เปิดหน้าต่างอีกครั้ง = 5`, async () => {
        if (!(await dialog.isVisible().catch(() => false))) await openRefillDialog('แก้');
        const [first] = await roundInputs();
        await first.fill('5');
        await first.press('Tab');
        await markEvidence(filled(first), expected(dispenseNow));
        await holdForClip(page, 1_500);
        await snapEvidence(page, 'กรอก — เติมยาครั้งที่ 1 จาก 2 เป็น 5');
        await saveRefillPlan('แก้ 2 → 5');
        await openRefillDialog('หลังแก้');
        const after = await Promise.all((await roundInputs()).map((b) => b.inputValue()));
        note(`${TC['011']} แผนหลังแก้`, `${after.join(' / ')} · จ่ายครั้งนี้ ${await dispenseNow.inputValue()}`);
        const [firstAgain] = await roundInputs();
        await markEvidence(expected(firstAgain));
        await holdForClip(page, 1_500);
        await snapEvidence(page, 'หลังแก้ — เปิดหน้าต่าง Refill อีกครั้ง เติมยาครั้งที่ 1 = 5');
        expect(after[0]).toBe('5');
        editOk = true;
        await cancelButton.click();
        await expect(dialog).toBeHidden({ timeout: 10_000 });
        if (await sendButton.isEnabled().catch(() => false)) await sendOrders('หลังแก้แผน');
      });
      let rxReady = false;
      await soft('Pre-condition ห้องยา: Order รอยืนยัน → สร้างใบยา', async () => {
        await gotoPharmacy();
        const row = main.locator('tr.ant-table-row').filter({ hasText: `HN ${P.hn}` }).first();
        await expect(row).toBeVisible({ timeout: 60_000 });
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
        note('ใบยา', `${res.status()} · ${((await res.json().catch(() => ({}))) as { prescriptionId?: string }).prescriptionId ?? '-'}`);
        expect(res.ok()).toBe(true);
        rxReady = true;
      });
      if (rxReady) await soft(`${TC['011']} ขั้น 2-5 หลังแก้ — หน้าใบยา → พิมพ์ใบยา → พิมพ์ใบ Refill ยา → เติมยาครั้งที่ 1 = 5 (ไม่ใช่ 2)`, async () => {
        await openPrescription(P.hn);
        await openRxPrintMenu('TC-011');
        await markEvidence(clicked(rxRefillItem));
        await snapEvidence(page, 'ก่อนกด — พิมพ์ใบ Refill ยา (หลังแก้)');
        const { pdf } = await printAndCapture(rxRefillItem, 'TC-011-after');
        const { rows, rounds } = await showRefillPdf(pdf, 'ใบ Refill หลังแพทย์แก้ จากหน้าใบยา (ครั้งที่ 1 = 5)', { ...P, qty: ['5', '7', '7'] });
        note(`${TC['011']} ก่อน / หลัง`, `ก่อนแก้ ครั้งที่ 1 = ${before[0] ?? '-'} · หลังแก้ ครั้งที่ 1 = ${rounds[0]?.qty ?? '-'} · แก้แผนสำเร็จ ${editOk}`);
        for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
      });

      // ── TC-010 ใบ Refill จากหน้าใบยา (ไทย) + Print Refill Prescription (อังกฤษ) ──
      if (rxReady) {
        await startClip(page, 'TC-010');
        await soft(`${TC['010']} ขั้น 3-5 หน้าใบยา → พิมพ์ใบยา → พิมพ์ใบ Refill ยา → ใบ Refill แสดงยาและรอบเติมยาตรงกับที่สั่ง`, async () => {
          if (!page.url().includes('pharmacyViewPrescription')) await openPrescription(P.hn);
          await openRxPrintMenu('TC-010 ไทย');
          await markEvidence(clicked(rxRefillItem), expected(rxRefillEnItem));
          await snapEvidence(page, 'ก่อนกด — พิมพ์ใบ Refill ยา (ภาษาไทย) · เมนูมี Print Refill Prescription');
          const { pdf } = await printAndCapture(rxRefillItem, 'TC-010-th');
          const { rows } = await showRefillPdf(pdf, 'ใบ Refill ยา (เมนู "พิมพ์ใบ Refill ยา")', { ...P, qty: ['5', '7', '7'] });
          for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
        });
        await soft(`${TC['010']} เพิ่ม — เมนู "Print Refill Prescription" (ภาษาอังกฤษ) → ใบที่ได้`, async () => {
          await page.keyboard.press('Escape');
          await openRxPrintMenu('TC-010 อังกฤษ');
          await expect(rxRefillEnItem, 'เมนูต้องมี "Print Refill Prescription"').toBeVisible();
          await markEvidence(clicked(rxRefillEnItem));
          await snapEvidence(page, 'ก่อนกด — Print Refill Prescription (ภาษาอังกฤษ)');
          const { pdf, url } = await printAndCapture(rxRefillEnItem, 'TC-010-en');
          const all = (await pdfPages(pdf)).join(' ');
          const thai = (all.match(/[฀-๿]+/g) ?? []).length;
          const words = all.split(/\s+/).length;
          note(`${TC['010']} ใบภาษาอังกฤษ`, `${url.replace(/^https?:\/\/[^/]+/, '')} · คำภาษาไทย ${thai} จาก ~${words} คำ · "${all.slice(0, 300)}"`);
          const overlay = await showPdf(page, pdf, 'ใบที่ได้จากเมนู "Print Refill Prescription" (ภาษาอังกฤษ)');
          const marks: Locator[] = [];
          for (const t of [/ใบ.*Refill|Refill|Prescription/i, /ครั้งที่ 1\/|Refill 1|1\/3/i, `HN ${P.hn}`]) {
            const l = await pdfLineAt(overlay, t);
            if (l) marks.push(l);
          }
          await markEvidence(...marks.map(expected));
          await holdForClip(page, 3_000);
          await snapEvidence(page, 'ใบจาก Print Refill Prescription (ภาษาอังกฤษ)');
          await hidePdf(page);
        });
      }

      note('ผลรวม', failures.length ? `ไม่ผ่าน ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
