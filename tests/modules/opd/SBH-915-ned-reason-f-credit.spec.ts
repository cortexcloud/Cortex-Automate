import type { Locator, Page } from '@playwright/test';
import { closeCoverageWithEndpoint, closeVisitAtCashier, gotoCashierAccount, payAllInCash } from '../../../helpers/functions/cashier';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { restartVideo, startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { capturePrintJobs, hidePdf, pdfLineAt, pdfPages, showPdf } from '../../../helpers/functions/print-capture';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { addCoverageFirst, openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';
import { cellByHeader, squash } from '../../../helpers/functions/table';

// การ์ด SBH-915 [Pharmacy] ปรับยอดเครดิต (เบิกได้) เป็น 0 เมื่อเลือกเหตุผลใช้ยานอกบัญชี = F (ตัวแก้ cortex-api PR #2305)
// EXE SBH-2895 → TS-HPY SBH-2896 (TC-001–006 = SBH-2898–2903) · TS-EDG SBH-2897 (TC-007–009 = SBH-2904–2906)
// 2 เทส = คนไข้ 2 ราย ตามลำดับเทสของ EXE · คลิปแยกต่อ TC (startClip · R61) · บัญชี Super_User ทั้งหมด (ผู้ใช้เลือก 23 ต.ค. 2026)
// ผู้ป่วย AUTO ใหม่ที่เวชระเบียน (R53) สิทธิ H03 UC ลำดับ 1 → Visit OPD → เช็คอิน · ยา F = med0000007 GPO-L-ONE 7 เม็ด = 33.25 (NED) · ยาเบิกได้ = med0000006 LINCOMYCIN 1 vial = 3.50 (ED)
// ตาราง CPOE ใช้โหมด "ขยาย" (คอลัมน์ บัญชียา / หมายเหตุ / รวม / เครดิต / จ่าย + แถว ราคาประมาณการรวม — ตรงคำใน TC · โหมดย่อเป็น ต้องชำระ)
// TC-006: ผู้ใช้อนุญาตรับชำระเงินสด + จ่ายยา + ปิด Visit คนไข้ 1 · Claim ของ Visit สิทธิ UC บน dev-x เป็น exportType FDH → ขึ้นหน้า "รายการ FDH OPD" (ไม่ใช่ E-Claim OPD) — ตรวจทั้ง 2 หน้า
// ทำต่อกับผู้ป่วยเดิม: SBH915_P1 / SBH915_P2=<HN>,<VN>,<EN> · SBH915_FROM=<เลข TC> (ข้าม TC ก่อนหน้า)
// รัน dev-x: npx playwright test --headed --grep @SBH-915 --project=chrome --no-deps --output=.cache/run-915

const F_DRUG = { code: 'med0000007', name: 'GPO-L-ONE', qty: 7, total: 33.25 };
const ED_DRUG = { code: 'med0000006', name: 'LINCOMYCIN', qty: 1, total: 3.5 };
const COVERAGE = 'H03 - สิทธิ UC';
const PARENTS = ['SBH-915', 'SBH-2895'];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
/** "1,234.50" → 1234.5 · "-" / ว่าง = 0 */
const money = (text: string) => (/^-?$/.test(text.trim()) ? 0 : Number(text.replace(/,/g, '')));
const baht = (n: number) => n.toFixed(2);
const options = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');
const from = Number(process.env.SBH915_FROM ?? 0);
const run = (tc: number) => tc >= from;

async function cells(row: Locator, names: string[]) {
  const out: Record<string, { cell: Locator; text: string }> = {};
  for (const n of names) out[n] = await cellByHeader(row, n);
  return out;
}

const drugRow = (page: Page, code: string) => page.getByRole('main').locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
/** แถว "ราคาประมาณการรวม: รวม เครดิต จ่าย" ใต้ตารางยาของ CPOE */
async function estimateRow(page: Page) {
  const label = page.getByRole('main').getByText(/ราคาประมาณการรวม/).first();
  const box = label.locator('xpath=ancestor::div[2]');
  const m = squash(await box.innerText()).match(/ราคาประมาณการรวม:\s*([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/);
  return { box, total: money(m?.[1] ?? 'NaN'), credit: money(m?.[2] ?? 'NaN'), pay: money(m?.[3] ?? 'NaN') };
}
/** ช่อง "* เหตุผล" ของฟอร์มสั่งยา / แก้ไขยา */
const reasonItem = (page: Page) => page.getByRole('main').locator('.ant-form-item').filter({ has: page.locator('label', { hasText: /^\s*\*?\s*เหตุผล\s*$/ }) }).first();
async function chooseReason(page: Page, code: string) {
  const item = reasonItem(page);
  await item.locator('.ant-select').first().click();
  await expect(options(page).first()).toBeVisible({ timeout: 10_000 });
  await options(page).filter({ hasText: new RegExp(`^${code} - `) }).first().click();
  await expect(item, `ช่องเหตุผลต้องเป็น ${code}`).toContainText(new RegExp(`${code} - `));
}

/** ผู้ป่วย AUTO ใหม่ที่เวชระเบียน + Visit OPD สิทธิ UC ลำดับ 1 + เช็คอิน */
async function preparePatient(page: Page, label: string, step: string, note: (t: string, d: string) => void) {
  const patient = newTestPatient(label);
  let hn = '';
  let enabled = false;
  await checkStep(page, `${step} ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน`, async () => {
    await gotoReception(page);
    await restartVideo(page);
    await markEvidence(clicked(newPatientButton(page)));
    await fillNewPatientForm(page, patient);
    const f = receptionFrame(page);
    const save = saveNewPatientButton(page);
    await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await markEvidence(filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), clicked(save));
    await snapEvidence(page, 'ก่อนกด — บันทึกผู้ป่วยใหม่');
    hn = await saveNewPatient(page);
    enabled = await expectPatientInfo(page);
  });
  let vn = '';
  let en = '';
  await checkStep(page, `${step} เปิด Visit OPD สิทธิ UC ลำดับ 1`, async () => {
    if (enabled) await openNewVisitPanel(page);
    const uc = await addCoverageFirst(page, COVERAGE);
    await markEvidence(expected(uc));
    await snapEvidence(page, 'ก่อนกด — สิทธิ UC ลำดับ 1');
    const opd = await openOpdVisit(page, { anyDoctor: true });
    vn = opd.vn;
    en = opd.en;
    note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${hn} · ${vn} · EN ${en} · ${opd.clinic} · ${opd.doctor} · สิทธิ ${COVERAGE}`);
  });
  await checkStep(page, `${step} เช็คอิน Visit OPD`, async () => {
    await selectOpdUnit(page);
    const row = await opdListRow(page, hn, { anyDoctor: true });
    await markEvidence(expected(row.getByText(`HN ${hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
    await snapEvidence(page, 'ก่อนกด — เช็คอิน');
    await checkInFromOpdList(page, row);
  });
  return { hn, vn, en };
}

/** รายการผู้ป่วยนอก → คลิกชื่อ → EMR → ปิดแผง OPD / ประวัติ → ตารางยาโหมดขยาย */
async function openEmr(page: Page, hn: string, vn: string) {
  const main = page.getByRole('main');
  await selectOpdUnit(page);
  const row = await opdListRow(page, hn, { anyDoctor: true });
  await row.getByText(/AUTO\s/).first().click();
  await expect(main.getByText(`VN ${vn}`, { exact: true }).first(), 'เปิด EMR แล้วต้องเห็นแถบ Visit').toBeVisible({ timeout: 90_000 });
  await expect(main.getByText(/สิทธิ UC/).first(), 'แถบหัว Visit ต้องเป็นสิทธิ UC').toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3_000);
  for (const tab of ['OPD', 'ประวัติการรักษา']) {
    const t = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${tab}\\s*$`) });
    if (await t.count()) await t.first().locator('.dv-default-tab-action').click().catch(() => undefined);
  }
  await page.waitForTimeout(1_000);
}
async function expandTable(page: Page) {
  const sw = page.getByRole('main').getByText('ขยาย', { exact: true }).first().locator('xpath=following::button[@role="switch"][1]');
  if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click();
  await expect(page.getByRole('main').locator('thead th').filter({ hasText: /^บัญชียา$/ }).first(), 'ตารางยาโหมดขยายต้องมีคอลัมน์ บัญชียา').toBeVisible({ timeout: 15_000 });
}
/** สั่งยา (+ เหตุผล ถ้าเป็นยา NED) */
async function orderDrug(page: Page, code: string, qty: number, reason?: string) {
  const main = page.getByRole('main');
  await addMedicineToCart(page, code, async () => {
    const q = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
    await q.fill(String(qty));
    await q.press('Tab');
    if (reason) {
      await chooseReason(page, reason);
      await markEvidence(filled(q), filled(reasonItem(page)), clicked(page.getByRole('button', { name: 'plus เพิ่มลงตะกร้า' })));
      await snapEvidence(page, `ก่อนกด — ${code} ${qty} เหตุผล ${reason}`);
    }
  });
  await expect(drugRow(page, code)).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2_500);
}
/** ✏ แก้ไขแถวยา → (เปลี่ยนเหตุผล / จำนวน) → บันทึก → รอ UpsertOpdOrder + แจ้งเตือน */
async function editDrug(page: Page, code: string, change: { reason?: string; qty?: number }, label: string) {
  const main = page.getByRole('main');
  const row = drugRow(page, code);
  const edit = row.locator('[aria-label="edit"]').first();
  await markEvidence(clicked(edit));
  await snapEvidence(page, `ก่อนกด — แก้ไข ${label}`);
  await edit.click();
  await expect(reasonItem(page)).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_500);
  if (change.reason) await chooseReason(page, change.reason);
  if (change.qty) {
    const q = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
    await q.fill(String(change.qty));
    await q.press('Tab');
  }
  const save = main.getByRole('button', { name: /^(save )?บันทึก$/ }).first();
  const marks = [clicked(save)];
  if (change.reason) marks.unshift(filled(reasonItem(page)));
  if (change.qty) marks.unshift(filled(main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ })));
  await markEvidence(...marks);
  await snapEvidence(page, `ก่อนกด — บันทึก ${label}`);
  const upsert = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /UpsertOpdOrder/.test(r.request().postData() ?? ''), { timeout: 60_000 });
  await save.click();
  const body = await (await upsert).json().catch(() => ({}));
  expect(body.errors, `บันทึกแก้ไขไม่สำเร็จ: ${JSON.stringify(body.errors ?? '').slice(0, 300)}`).toBeFalsy();
  const toast = page.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: /แก้ไข Order สำเร็จ/ }).last();
  if (await toast.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await toast.hover({ trial: true }).catch(() => undefined);
    await markEvidence(alerted(toast));
    await snapEvidence(page, `หลังกด — ${label}`);
  }
  await page.waitForTimeout(3_000);
}
/** อ่านแถวยาโหมดขยาย + ราคาประมาณการรวม */
async function readCpoe(page: Page, code: string) {
  const row = drugRow(page, code);
  const c = await cells(row, ['บัญชียา', 'หมายเหตุ', 'รวม', 'เครดิต', 'จ่าย']);
  const est = await estimateRow(page);
  return { row, c, est };
}

async function gotoPharmacy(page: Page) {
  const main = page.getByRole('main');
  await page.goto('/cortex/pharmacy/select-location');
  await main.getByRole('combobox').first().click();
  await options(page).filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
  await page.waitForTimeout(800);
  await main.getByRole('combobox').nth(1).click();
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
}

test.describe('SBH-915 ยานอกบัญชีเหตุผล F เครดิตเป็น 0 (สิทธิ UC)', () => {
  test(
    'คนไข้ 1: TC-001–006 สั่งยาเหตุผล F → ยอดท้ายตาราง → Co-pay → ห้องยา → การเงิน → เบิก',
    { tag: ['@SBH-915', '@SBH-2898', '@SBH-2899', '@SBH-2900', '@SBH-2901', '@SBH-2902', '@SBH-2903'], annotation: [...PARENTS, 'SBH-2896'].map(linear) },
    async ({ page }) => {
      test.setTimeout(1_500_000);
      const main = page.getByRole('main');
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      const printer = await capturePrintJobs(page);
      const authorization = trackAuthorization(page);

      await startClip(page, 'TC-001');
      let [hn, vn, en] = (process.env.SBH915_P1 ?? '').split(',');
      if (hn) note('ผู้ป่วย', `ผู้ป่วยเดิม HN ${hn} · ${vn} · EN ${en}`);
      else ({ hn, vn, en } = await preparePatient(page, 'Ned915A', 'TC-001 (SBH-2898) ขั้น 1', note));
      console.log(`    ทำต่อกับรายเดิม: SBH915_P1=${hn},${vn},${en}`);

      if (run(1)) {
        await checkStep(page, 'TC-001 (SBH-2898) ขั้น 2–4 CPOE สั่ง GPO-L-ONE 7 เม็ด เหตุผล F', async () => {
          await openEmr(page, hn, vn);
          await orderDrug(page, F_DRUG.code, F_DRUG.qty, 'F');
          await expandTable(page);
        });
        await checkStep(page, 'TC-001 (SBH-2898) ขั้น 5 แถวยา GPO-L-ONE', async () => {
          const { row, c } = await readCpoe(page, F_DRUG.code);
          note('TC-001 แถว GPO-L-ONE', Object.entries(c).map(([k, v]) => `${k} ${v.text}`).join(' · '));
          const rows: CompareRow[] = [
            { label: 'บัญชียา', values: [c['บัญชียา'].text, 'Non-ED (NED)'], same: /^NED$|Non-?ED/i.test(c['บัญชียา'].text) },
            { label: 'หมายเหตุ', values: [c['หมายเหตุ'].text.slice(0, 40), 'เหตุผล F'], same: /^F - /.test(c['หมายเหตุ'].text) },
            { label: 'รวม', values: [c['รวม'].text, '33.25'], same: money(c['รวม'].text) === 33.25 },
            { label: 'เครดิต', values: [c['เครดิต'].text, '0.00'], same: money(c['เครดิต'].text) === 0 },
            { label: 'จ่าย', values: [c['จ่าย'].text, '33.25'], same: money(c['จ่าย'].text) === 33.25 },
          ];
          await showCompareTable(page, 'TC-001 แถวยา GPO-L-ONE (เหตุผล F)', ['หน้าจอ', 'Expected'], rows, { side: 'bottom' });
          await markEvidence(expected(row), c['บัญชียา'].cell, c['หมายเหตุ'].cell, c['รวม'].cell, c['เครดิต'].cell, c['จ่าย'].cell);
          await holdForClip(page, 2_000);
          for (const r of rows) expect(r.same, `${r.label}: ได้ ${r.values[0]} ต้องเป็น ${r.values[1]}`).toBe(true);
        });
        await hideCompareTable(page);
      }

      if (run(2)) {
        await startClip(page, 'TC-002');
        await checkStep(page, 'TC-002 (SBH-2899) ขั้น 2 สั่ง LINCOMYCIN 1 vial เพิ่ม', async () => {
          if (from === 2) {
            await openEmr(page, hn, vn);
            await expandTable(page);
          }
          await orderDrug(page, ED_DRUG.code, ED_DRUG.qty);
          await expandTable(page);
        });
        await checkStep(page, 'TC-002 (SBH-2899) ขั้น 3 ราคาประมาณการรวม', async () => {
          const est = await estimateRow(page);
          const linco = await cells(drugRow(page, ED_DRUG.code), ['รวม', 'เครดิต', 'จ่าย']);
          const gpo = await cells(drugRow(page, F_DRUG.code), ['รวม', 'เครดิต', 'จ่าย']);
          note('TC-002', `GPO-L-ONE ${gpo['รวม'].text} / ${gpo['เครดิต'].text} / ${gpo['จ่าย'].text} · LINCOMYCIN ${linco['รวม'].text} / ${linco['เครดิต'].text} / ${linco['จ่าย'].text} · ราคาประมาณการรวม ${baht(est.total)} / ${baht(est.credit)} / ${baht(est.pay)}`);
          const rows: CompareRow[] = [
            { label: 'รวม', values: [baht(est.total), '36.75'], same: est.total === 36.75 },
            { label: 'เครดิต (เฉพาะ LINCOMYCIN)', values: [baht(est.credit), '3.50'], same: est.credit === 3.5 },
            { label: 'จ่าย (เฉพาะ GPO-L-ONE)', values: [baht(est.pay), '33.25'], same: est.pay === 33.25 },
            { label: 'แถว LINCOMYCIN เครดิต / จ่าย', values: [`${linco['เครดิต'].text} / ${linco['จ่าย'].text}`, '3.50 / 0.00'], same: money(linco['เครดิต'].text) === 3.5 && money(linco['จ่าย'].text) === 0 },
          ];
          await showCompareTable(page, 'TC-002 ราคาประมาณการรวม', ['หน้าจอ', 'Expected'], rows, { side: 'bottom' });
          await markEvidence(expected(est.box), drugRow(page, F_DRUG.code), drugRow(page, ED_DRUG.code));
          await holdForClip(page, 2_000);
          for (const r of rows) expect(r.same, `${r.label}: ได้ ${r.values[0]} ต้องเป็น ${r.values[1]}`).toBe(true);
        });
        await hideCompareTable(page);
      }

      if (run(3)) {
        await startClip(page, 'TC-003');
        let pdf: Buffer | undefined;
        await checkStep(page, 'TC-003 (SBH-2900) ขั้น 2 กดปุ่ม พิมพ์ Co-pay', async () => {
          if (from === 3) {
            await openEmr(page, hn, vn);
            await expandTable(page);
          }
          const btn = main.getByRole('button', { name: /พิมพ์ Co-pay/ });
          await btn.scrollIntoViewIfNeeded();
          await expect(btn, 'ต้องมีปุ่ม พิมพ์ Co-pay').toBeEnabled({ timeout: 20_000 });
          await markEvidence(clicked(btn));
          await snapEvidence(page, 'ก่อนกด — พิมพ์ Co-pay');
          const before = printer.jobs.length;
          const gen = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/cortex-api/documents/generate'), { timeout: 60_000 });
          await btn.click();
          const res = await gen;
          expect(res.status(), 'สร้างเอกสาร Co-pay ต้องสำเร็จ').toBeLessThan(300);
          const job = await printer.next(before, 30_000);
          expect(job, 'แอปต้องส่งเอกสาร Co-pay ไปเครื่องพิมพ์').toBeTruthy();
          pdf = job!.pdf;
          note('งานพิมพ์ Co-pay', `${new URL(job!.url).pathname} · ${pdf.length} bytes`);
          await test.info().attach('Co-pay คนไข้ 1.pdf', { body: pdf, contentType: 'application/pdf' });
        });
        await checkStep(page, 'TC-003 (SBH-2900) ขั้น 3 รายการในเอกสาร Co-pay', async () => {
          const text = (await pdfPages(pdf!)).join(' ');
          note('ข้อความ Co-pay', text);
          const gpo = text.match(/GPO-L-ONE[^]*?รวม\s*([\d,.]+)\s*บาท/);
          const rows: CompareRow[] = [
            { label: 'มีรายการ GPO-L-ONE', values: [text.includes('GPO-L-ONE') ? 'มี' : 'ไม่มี', 'มี'], same: text.includes('GPO-L-ONE') },
            { label: 'ยอด GPO-L-ONE', values: [gpo?.[1] ?? '-', '33.25'], same: money(gpo?.[1] ?? 'NaN') === 33.25 },
            { label: 'ไม่มี LINCOMYCIN', values: [/LINCOMYCIN/i.test(text) ? 'มี' : 'ไม่มี', 'ไม่มี'], same: !/LINCOMYCIN/i.test(text) },
            { label: 'HN / VN ของคนไข้', values: [`${text.includes(hn) ? hn : '-'} / ${text.includes(vn) ? vn : '-'}`, `${hn} / ${vn}`], same: text.includes(hn) && text.includes(vn) },
          ];
          const overlay = await showPdf(page, pdf!, 'เอกสาร Co-pay (คนไข้ 1)');
          await showCompareTable(page, 'TC-003 เอกสาร Co-pay', ['เอกสาร (PDF)', 'Expected'], rows, { side: 'left', width: '760px' });
          const marks = [];
          const line = (await pdfLineAt(overlay, /GPO-L-ONE/)) ?? undefined;
          if (line) marks.push(expected(line));
          const amount = await pdfLineAt(overlay, /33\.25/);
          if (amount) marks.push(amount);
          await markEvidence(...marks);
          await holdForClip(page, 2_500);
          for (const r of rows) expect(r.same, `${r.label}: ได้ ${r.values[0]} ต้องเป็น ${r.values[1]}`).toBe(true);
        });
        await hideCompareTable(page);
        await hidePdf(page);
      }

      let rxId = '';
      if (run(4)) {
        await startClip(page, 'TC-004');
        await checkStep(page, 'TC-004 (SBH-2901) ขั้น 1 แพทย์กด ส่งคำสั่ง', async () => {
          if (from === 4) await openEmr(page, hn, vn);
          const send = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
          await markEvidence(expected(drugRow(page, F_DRUG.code)), expected(drugRow(page, ED_DRUG.code)), clicked(send));
          await snapEvidence(page, 'ก่อนกด — ส่งคำสั่ง');
          const signed = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /SignOPDOrders/.test(r.request().postData() ?? ''), { timeout: 60_000 });
          await send.click();
          const body = await (await signed).json().catch(() => ({}));
          expect(body.errors, `ส่งคำสั่งไม่สำเร็จ: ${JSON.stringify(body.errors ?? '').slice(0, 300)}`).toBeFalsy();
          await page.waitForTimeout(3_000);
        });
        await checkStep(page, 'TC-004 (SBH-2901) ขั้น 2–3 ห้องยา Order รอยืนยัน → ช่องเครดิต / เบิกไม่ได้ → สร้างใบยา', async () => {
          await gotoPharmacy(page);
          const row = main.locator('tr.ant-table-row').filter({ hasText: `HN ${hn}` }).first();
          await expect(row, `ผู้ป่วย HN ${hn} ต้องอยู่แท็บ Order รอยืนยัน`).toBeVisible({ timeout: 60_000 });
          await markEvidence(clicked(row));
          await snapEvidence(page, 'ก่อนกด — Order ของคนไข้');
          await row.locator('td').nth(4).click();
          const create = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
          await expect(create).toBeVisible({ timeout: 60_000 });
          await page.waitForTimeout(3_500);
          const gpoRow = drugRow(page, F_DRUG.code);
          const c = await cells(gpoRow, ['ราคารวม', 'เครดิต', 'เบิกได้', 'เบิกไม่ได้']);
          const qty = await gpoRow.locator('input:not([type="checkbox"]):not([role="combobox"])').first().inputValue().catch(() => '?');
          note('TC-004 ห้องยา GPO-L-ONE', `จำนวน ${qty} · ${Object.entries(c).map(([k, v]) => `${k} ${v.text}`).join(' · ')}`);
          const rows: CompareRow[] = [
            { label: 'ราคารวม', values: [c['ราคารวม'].text, '33.25'], same: money(c['ราคารวม'].text) === 33.25 },
            // ผู้ใช้ตัดสิน 23 ต.ค. 2026: ช่องแสดง "-" = ไม่ผ่าน (Expected "เครดิต 0") → ตรวจตรงตัว ไม่แปลง "-" เป็น 0
            { label: 'เครดิต', values: [c['เครดิต'].text, '0'], same: /^0(\.00)?$/.test(c['เครดิต'].text) },
            { label: 'เบิกไม่ได้', values: [c['เบิกไม่ได้'].text, '33.25'], same: money(c['เบิกไม่ได้'].text) === 33.25 },
            { label: 'เบิกได้ (ข้อมูลประกอบ)', values: [c['เบิกได้'].text, '0.00'], same: money(c['เบิกได้'].text) === 0 },
          ];
          await showCompareTable(page, 'TC-004 หน้าสร้างใบยา แถว GPO-L-ONE', ['หน้าจอ', 'Expected'], rows, { side: 'bottom' });
          const print = main.getByRole('checkbox', { name: 'Print ฉลากยาอัตโนมัติ' });
          if (await print.isChecked().catch(() => false)) await print.uncheck();
          const head = (name: string) => main.locator('thead th').filter({ visible: true }).filter({ hasText: new RegExp(`^${name}$`) }).first();
          await markEvidence(c['ราคารวม'].cell, c['เครดิต'].cell, c['เบิกได้'].cell, c['เบิกไม่ได้'].cell, head('ราคารวม'), head('เครดิต'), head('เบิกไม่ได้'), clicked(create));
          await snapEvidence(page, 'ก่อนกด — สร้างใบยา');
          await hideCompareTable(page);
          for (const r of rows) expect(r.same, `${r.label}: ได้ ${r.values[0]} ต้องเป็น ${r.values[1]}`).toBe(true);
          const res = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/opd/prescriptions'), { timeout: 60_000 });
          await create.click();
          const response = await res;
          const body = await response.json().catch(() => ({}));
          expect(response.status(), `สร้างใบยาไม่สำเร็จ: ${JSON.stringify(body).slice(0, 200)}`).toBeLessThan(300);
          rxId = body.prescriptionId;
          note('ใบยา', rxId);
          const toast = page.locator('.ant-notification-notice, .ant-message-notice').last();
          if (await toast.isVisible({ timeout: 5_000 }).catch(() => false)) {
            note('แจ้งเตือน', squash(await toast.innerText()));
            await markEvidence(alerted(toast));
            await snapEvidence(page, 'หลังกด — สร้างใบยา');
          }
        });
      }

      if (run(5)) {
        await startClip(page, 'TC-005');
        await checkStep(page, 'TC-005 (SBH-2902) ขั้น 2–3 หน้าการเงิน รายการค่าใช้จ่าย GPO-L-ONE', async () => {
          await gotoCashierAccount(page, hn, vn);
          const row = drugRow(page, F_DRUG.code).or(main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `${F_DRUG.code} - ` }).first()).first();
          await expect(row).toBeVisible({ timeout: 60_000 });
          await page.waitForTimeout(2_000);
          const c = await cells(row, ['รวม', 'เครดิต', 'เบิกได้', 'เบิกไม่ได้', 'ต้องชำระ']);
          note('TC-005 การเงิน GPO-L-ONE', Object.entries(c).map(([k, v]) => `${k} ${v.text}`).join(' · '));
          const rows: CompareRow[] = [
            { label: 'เครดิต', values: [c['เครดิต'].text, '0.00'], same: money(c['เครดิต'].text) === 0 },
            { label: 'ต้องชำระ', values: [c['ต้องชำระ'].text, '33.25'], same: money(c['ต้องชำระ'].text) === 33.25 },
            { label: 'รวม (ข้อมูลประกอบ)', values: [c['รวม'].text, '33.25'], same: money(c['รวม'].text) === 33.25 },
            { label: 'เบิกไม่ได้ (ข้อมูลประกอบ)', values: [c['เบิกไม่ได้'].text, '33.25'], same: money(c['เบิกไม่ได้'].text) === 33.25 },
          ];
          await showCompareTable(page, 'TC-005 การเงิน แถว GPO-L-ONE', ['หน้าจอ', 'Expected'], rows, { side: 'bottom' });
          await markEvidence(expected((await cellByHeader(row, 'รหัส - ชื่อ')).cell), c['รวม'].cell, c['เครดิต'].cell, c['เบิกไม่ได้'].cell, c['ต้องชำระ'].cell);
          await holdForClip(page, 2_000);
          for (const r of rows) expect(r.same, `${r.label}: ได้ ${r.values[0]} ต้องเป็น ${r.values[1]}`).toBe(true);
        });
        await hideCompareTable(page);
      }

      if (run(6)) {
        await startClip(page, 'TC-006');
        // SBH915_CLAIM_ONLY=1 (+ SBH915_FROM=6) = ตรวจหน้ารายการเบิกซ้ำแบบอ่านอย่างเดียวกับ Visit ที่ปิดแล้ว
        if (!process.env.SBH915_CLAIM_ONLY) await checkStep(page, 'TC-006 (SBH-2903) ขั้น 1 การเงินรับชำระ → เภสัชจ่ายยา → ปิด Visit', async () => {
          await gotoCashierAccount(page, hn, vn);
          await page.waitForTimeout(2_000);
          if (await page.getByRole('button', { name: 'ระบุเลข End Point' }).isVisible().catch(() => false)) {
            const ep = await closeCoverageWithEndpoint(page, { cardType: '60' });
            note('ปิดสิทธิ UC', `End Point ${ep.endPoint} (สุ่ม · R62)`);
          }
          const pay = await payAllInCash(page);
          note('ชำระเงินสด', `${baht(pay.amount)} · ${pay.invoiceId} · ${pay.receiptId}`);
          expect(pay.amount, 'ยอดที่ผู้ป่วยต้องชำระ = ราคา GPO-L-ONE').toBeCloseTo(33.25, 2);
          if (!rxId) rxId = process.env.SBH915_RX ?? '';
          await gotoPharmacy(page);
          for (const [tab, button, action] of [['ใบยารอจัด', 'จัดยาแล้ว', 'pack'], ['ใบยาจัดแล้ว', 'ยืนยันรอจ่าย', 'verify'], ['ใบรอจ่าย', 'จ่ายยา', 'dispense']] as const) {
            await main.getByRole('tab', { name: new RegExp(tab) }).click();
            await page.waitForTimeout(2_000);
            const search = main.getByPlaceholder('ค้นหา VN, HN');
            await search.fill(hn);
            await search.press('Enter');
            const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: hn }).first();
            await expect(row, `ใบยาต้องอยู่แท็บ ${tab}`).toBeVisible({ timeout: 60_000 });
            await row.locator('td').nth(3).click();
            if (rxId) await page.waitForURL(new RegExp(`prescriptionId=${rxId}`), { timeout: 90_000 });
            const btn = page.getByRole('button', { name: button, exact: true }).filter({ visible: true }).first();
            await expect(btn).toBeVisible({ timeout: 60_000 });
            await page.waitForTimeout(1_500);
            if (action === 'dispense') await main.getByRole('checkbox', { name: 'เลือกยาทั้งหมด' }).check();
            await markEvidence(clicked(btn));
            await snapEvidence(page, `ก่อนกด — ${button}`);
            const done = page.waitForResponse((r) => r.request().method() === 'POST' && /\/prescriptions\/[^/]+\//.test(r.url()) && r.url().endsWith(`/${action}`), { timeout: 60_000 });
            await btn.click();
            if (action === 'dispense') {
              const review = page.getByRole('dialog', { name: /ยืนยันการทบทวนก่อนจ่ายยา/ });
              await expect(review).toBeVisible({ timeout: 20_000 });
              await review.getByRole('button', { name: /^ยืนยัน/ }).click();
            }
            expect((await done).status(), `${button} ต้องสำเร็จ`).toBeLessThan(300);
            await page.waitForTimeout(2_000);
          }
          const closed = await closeVisitAtCashier(page, hn, vn, async (close) => {
            await markEvidence(clicked(close));
            await snapEvidence(page, 'ก่อนกด — ปิด Visit');
          });
          note('ปิด Visit', JSON.stringify(closed));
        });
        await checkStep(page, 'TC-006 (SBH-2903) ขั้น 2–3 รายการเบิก OPD ของ Visit (E-Claim OPD / FDH OPD)', async () => {
          // โหมดตรวจซ้ำ (SBH915_CLAIM_ONLY) ยังไม่เคยเปิดหน้าใด → เปิดหน้ารายการก่อนให้แอปยิง cortex-api (ได้ token)
          if (!/\/cortex\//.test(page.url())) {
            await page.goto('/cortex/claim/opd-fdh-list/initialized');
            await expect(main.getByPlaceholder('ค้นหา VN')).toBeVisible({ timeout: 90_000 });
          }
          const auth = authorization();
          const claimRes = await page.request.get(`/generated-emr-api/claims?page=1&perPage=10&filter[vn][equals]=${vn}`, { headers: { authorization: auth } });
          const claim = ((await claimRes.json()) as { data: { id: number; exportType: string; totalCredit: number; credits?: { credit: number; productCategoryCode: string }[] }[] }).data?.[0];
          note('Claim (API)', JSON.stringify(claim ? { id: claim.id, exportType: claim.exportType, totalCredit: claim.totalCredit, credits: claim.credits } : null));
          const search = async (list: string) => {
            await page.goto(`/cortex/claim/${list}/initialized`);
            const box = main.getByPlaceholder('ค้นหา VN');
            await expect(box).toBeVisible({ timeout: 60_000 });
            await box.fill(vn);
            await box.press('Enter');
            await page.waitForTimeout(4_000);
            return main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: vn }).first();
          };
          const eRow = await search('opd-eclaim-list');
          const inEclaim = await eRow.isVisible().catch(() => false);
          // กรอบไม่มีป้าย — ป้ายของช่อง VN ทับชื่อแท็บ "รออุทรณ์" (R59)
          await markEvidence(main.getByPlaceholder('ค้นหา VN'), main.getByText(/รายการ E-Claim OPD/).first(), expected(main.locator('.ant-table-placeholder').first()));
          await snapEvidence(page, 'E-Claim OPD — ค้น VN ของคนไข้ 1');
          note('E-Claim OPD', inEclaim ? squash(await eRow.innerText()) : 'ไม่พบ VN นี้ในรายการ E-Claim OPD');
          const fRow = await search('opd-fdh-list');
          await expect(fRow, 'Visit ต้องอยู่ในรายการเบิก FDH OPD').toBeVisible({ timeout: 30_000 });
          const credit = await cellByHeader(fRow, 'Total Credit');
          note('FDH OPD', squash(await fRow.innerText()));
          const drugCredit = (claim?.credits ?? []).reduce((s, x) => s + x.credit, 0);
          const rows: CompareRow[] = [
            { label: 'Total Credit (หน้ารายการ FDH OPD)', values: [credit.text, '3.50 (เฉพาะ LINCOMYCIN)'], same: money(credit.text) === 3.5 },
            { label: 'totalCredit ของ Claim (API)', values: [String(claim?.totalCredit ?? '-'), '3.50'], same: claim?.totalCredit === 3.5 },
            { label: 'เครดิตหมวดยา (API credits)', values: [(claim?.credits ?? []).map((x) => `หมวด ${x.productCategoryCode} = ${x.credit}`).join(', ') || '-', '3.50 · GPO-L-ONE ไม่นับ'], same: drugCredit === 3.5 },
            // ข้อสังเกต (ไม่ใช่ Expected): TC เขียน "หน้า E-Claim OPD" แต่ Claim ของ Visit นี้เป็น exportType FDH → ขึ้นหน้า FDH OPD
            { label: 'หน้าที่พบ Claim (ข้อสังเกต)', values: [`${claim?.exportType === 'FDH' ? 'FDH OPD' : (claim?.exportType ?? '-')}${inEclaim ? ' + E-Claim OPD' : ' (E-Claim OPD ไม่พบ)'}`, 'E-Claim OPD (ตามคำใน TC)'], same: inEclaim },
          ];
          await showCompareTable(page, 'TC-006 ยอดเบิกของ Visit คนไข้ 1', ['ระบบ', 'Expected'], rows, { side: 'bottom' });
          await markEvidence(expected(fRow), credit.cell);
          await holdForClip(page, 2_500);
          expect(money(credit.text), 'Total Credit ของ Visit = LINCOMYCIN 3.50 (ไม่รวม GPO-L-ONE เหตุผล F)').toBe(3.5);
          expect(claim?.totalCredit, 'totalCredit ของ Claim').toBe(3.5);
        });
        await hideCompareTable(page);
      }
      await startClip(page, 'จบ');
    },
  );

  test(
    'คนไข้ 2: TC-007–009 เปลี่ยนเหตุผล B→F · F→E · กลับ F + แก้จำนวน',
    { tag: ['@SBH-915', '@SBH-2904', '@SBH-2905', '@SBH-2906'], annotation: [...PARENTS, 'SBH-2897'].map(linear) },
    async ({ page }) => {
      test.setTimeout(900_000);
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      await startClip(page, 'TC-007');
      let [hn, vn, en] = (process.env.SBH915_P2 ?? '').split(',');
      if (hn) note('ผู้ป่วย', `ผู้ป่วยเดิม HN ${hn} · ${vn} · EN ${en}`);
      else ({ hn, vn, en } = await preparePatient(page, 'Ned915B', 'TC-007 (SBH-2904) ขั้น 1', note));
      console.log(`    ทำต่อกับรายเดิม: SBH915_P2=${hn},${vn},${en}`);

      const check = async (tc: string, title: string, exp: { total: number; credit: number; pay: number; reason: string }) => {
        const { row, c, est } = await readCpoe(page, F_DRUG.code);
        note(`${tc} แถว`, `${Object.entries(c).map(([k, v]) => `${k} ${v.text.slice(0, 30)}`).join(' · ')} · ราคาประมาณการรวม ${baht(est.total)} / ${baht(est.credit)} / ${baht(est.pay)}`);
        const rows: CompareRow[] = [
          { label: 'หมายเหตุ (เหตุผล)', values: [c['หมายเหตุ'].text.slice(0, 30), `เหตุผล ${exp.reason}`], same: new RegExp(`^${exp.reason} - `).test(c['หมายเหตุ'].text) },
          { label: 'แถว รวม', values: [c['รวม'].text, baht(exp.total)], same: money(c['รวม'].text) === exp.total },
          { label: 'แถว เครดิต', values: [c['เครดิต'].text, baht(exp.credit)], same: money(c['เครดิต'].text) === exp.credit },
          { label: 'แถว จ่าย', values: [c['จ่าย'].text, baht(exp.pay)], same: money(c['จ่าย'].text) === exp.pay },
          { label: 'ราคาประมาณการรวม เครดิต', values: [baht(est.credit), baht(exp.credit)], same: est.credit === exp.credit },
          { label: 'ราคาประมาณการรวม จ่าย', values: [baht(est.pay), baht(exp.pay)], same: est.pay === exp.pay },
        ];
        await showCompareTable(page, `${tc} ${title}`, ['หน้าจอ', 'Expected'], rows, { side: 'bottom' });
        await markEvidence(expected(row), c['หมายเหตุ'].cell, c['รวม'].cell, c['เครดิต'].cell, c['จ่าย'].cell, expected(est.box));
        await holdForClip(page, 2_000);
        for (const r of rows) expect(r.same, `${r.label}: ได้ ${r.values[0]} ต้องเป็น ${r.values[1]}`).toBe(true);
      };

      if (run(7)) {
        await checkStep(page, 'TC-007 (SBH-2904) ขั้น 2–3 สั่ง GPO-L-ONE 7 เม็ด เหตุผล B', async () => {
          await openEmr(page, hn, vn);
          await orderDrug(page, F_DRUG.code, F_DRUG.qty, 'B');
          await expandTable(page);
          await check('TC-007', 'เหตุผล B (ก่อนแก้)', { total: 33.25, credit: 33.25, pay: 0, reason: 'B' });
        });
        await hideCompareTable(page);
        await checkStep(page, 'TC-007 (SBH-2904) ขั้น 4 แก้ไขเหตุผล B → F', async () => {
          await editDrug(page, F_DRUG.code, { reason: 'F' }, 'เหตุผล B → F');
          await check('TC-007', 'หลังเปลี่ยนเป็น F', { total: 33.25, credit: 0, pay: 33.25, reason: 'F' });
        });
        await hideCompareTable(page);
      }
      if (run(8)) {
        await startClip(page, 'TC-008');
        await checkStep(page, 'TC-008 (SBH-2905) ขั้น 2 แก้ไขเหตุผล F → E', async () => {
          if (from === 8) {
            await openEmr(page, hn, vn);
            await expandTable(page);
          }
          await editDrug(page, F_DRUG.code, { reason: 'E' }, 'เหตุผล F → E');
          await check('TC-008', 'หลังเปลี่ยนเป็น E', { total: 33.25, credit: 33.25, pay: 0, reason: 'E' });
        });
        await hideCompareTable(page);
      }
      if (run(9)) {
        await startClip(page, 'TC-009');
        await checkStep(page, 'TC-009 (SBH-2906) ขั้น 1 แก้ไขเหตุผลกลับเป็น F', async () => {
          if (from === 9) {
            await openEmr(page, hn, vn);
            await expandTable(page);
          }
          await editDrug(page, F_DRUG.code, { reason: 'F' }, 'เหตุผล E → F');
          await check('TC-009', 'เหตุผล F (จำนวน 7)', { total: 33.25, credit: 0, pay: 33.25, reason: 'F' });
        });
        await hideCompareTable(page);
        await checkStep(page, 'TC-009 (SBH-2906) ขั้น 2 แก้จำนวน 7 → 10 เม็ด', async () => {
          await editDrug(page, F_DRUG.code, { qty: 10 }, 'จำนวน 7 → 10');
          const qty = await drugRow(page, F_DRUG.code).locator('input:not([type="checkbox"])').first().inputValue().catch(() => '?');
          note('TC-009 จำนวนในแถว', qty);
          expect(qty, 'จำนวนในแถวต้องเป็น 10').toBe('10');
          await check('TC-009', 'หลังแก้จำนวนเป็น 10', { total: 47.5, credit: 0, pay: 47.5, reason: 'F' });
        });
        await hideCompareTable(page);
      }
      await startClip(page, 'จบ');
    },
  );
});
