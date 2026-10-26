import type { Locator, Page } from '@playwright/test';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { restartVideo } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { capturePrintJobs, hidePdf, pdfLineAt, pdfPages, showPdf } from '../../../helpers/functions/print-capture';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { addCoverageFirst, openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';
import { cellByHeader, squash } from '../../../helpers/functions/table';

// การ์ดบั๊ก SBH-1566 [EMR] เอกสาร "ข้อมูลใบยา" แสดงยอดเบิกได้ / เบิกไม่ได้ไม่ถูกต้อง (ตัวแก้ PR cortex-testing #1118 "fix prescription non-benefit total")
// EXE SBH-2797 → TS SBH-2798 → TC-SBH-1566-001 / 002 / 003 (SBH-2799 / 2800 / 2801) · 1 เทส = 1 TC (EXE: คนไข้ / ใบยาแยกกัน) → คลิป 1 ไฟล์ต่อ TC (R61)
// ผู้ป่วย AUTO ใหม่ต่อ TC: ลงทะเบียน + Visit OPD ที่เวชระเบียน (R53) สิทธิ H03 UC เป็นลำดับ 1 → เช็คอิน → CPOE สั่งยา → ห้องยาชั้น 1 สร้างใบยา → ใบยารอจัด → พิมพ์ใบยา ▾ → พิมพ์ใบยา
// เอกสารพิมพ์ตรวจจาก PDF ที่แอปส่งให้ print agent (R18 · `GET /prescriptions/<id>/pdf` → `localhost:8081/print/ink-jet`) · ทิ้ง Visit ไว้ (R11)
// ยาเบิกได้ = med0000006 LINCOMYCIN (เพดาน UC 4.63 ≥ ราคา 3.50) · ยาเบิกไม่ได้ = DUOCETZ 315100209275952701 (ยานอกบัญชี NED ไม่มีเพดาน UC · ไม่ติด DUE / PA)
//   DUOCETZ อยู่นอกชุดยา R25 — ผู้ใช้อนุญาตเฉพาะการ์ดนี้ (20 ต.ค. 2026 · GPO MOX ติด PA · AUXIB ติด DUE จึงสั่งไม่ได้)
// ทำต่อกับผู้ป่วยเดิม (รันทีละ TC ด้วย --grep): SBH1566_P=<HN>,<VN>,<EN> · SBH1566_SKIP_ORDER=1 (สั่งยาแล้ว) · SBH1566_RX=<เลขใบยา> (สร้างใบยาแล้ว — พิมพ์อย่างเดียว)
// รัน dev-x: npx playwright test --headed --grep @SBH-1566 --output=.cache/run-1566

interface Drug { code: string; name: string; qty: number; claimable: boolean }
// LINCOMYCIN 1 vial: ระบบคิดเงิน (charge item) ใช้เพดาน UC 4.63 กับทั้งรายการ → 7 vial (24.50) เบิกได้แค่ 4.63 ทั้งที่ CPOE ประมาณการเต็ม
//   ผู้ใช้เลือก (20 ต.ค. 2026): ผลหลักใช้ 1 vial (เบิกได้เต็มทุกแหล่ง) + 7 vial เป็นข้อสังเกต (HN 6931996 · ใบยา 691020-01035)
const LINCO: Drug = { code: 'med0000006', name: 'UTO LINCOMYCIN', qty: 1, claimable: true };
const DUOCETZ: Drug = { code: '315100209275952701', name: 'DUOCETZ', qty: 7, claimable: false };
const COVERAGE = 'H03 - สิทธิ UC';

const CASES = [
  { tc: '001', issue: 'SBH-2799', title: 'ยาทุกรายการเบิกได้ → เบิกไม่ได้ 0.00', drugs: [LINCO] },
  { tc: '002', issue: 'SBH-2800', title: 'ยาทุกรายการเบิกไม่ได้ (ยานอกบัญชี) → เบิกได้ 0.00', drugs: [DUOCETZ] },
  { tc: '003', issue: 'SBH-2801', title: 'ยาเบิกได้ + ยานอกบัญชี → แยกยอดเบิกได้ / เบิกไม่ได้', drugs: [LINCO, DUOCETZ] },
] as const;
const PARENTS = ['SBH-1566', 'SBH-2797', 'SBH-2798'];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
/** "1,234.50" → 1234.5 · "-" / ว่าง = 0 (ช่องเครดิตของยานอกบัญชีที่หน้าห้องยาแสดง "-") */
const money = (text: string) => (/^-?$/.test(text.trim()) ? 0 : Number(text.replace(/,/g, '')));
const baht = (n: number) => n.toFixed(2);
const options = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');

/** ข้อความ PDF ข้อมูลใบยา → จำนวนเงินของแต่ละยา + ยอดท้ายเอกสาร */
function readRxInfo(text: string, drugs: readonly Drug[]) {
  const amounts = drugs.map((d) => {
    const at = text.indexOf(d.name);
    return at < 0 ? NaN : money(text.slice(at).match(/\]\s*([\d,]+\.\d{2})/)?.[1] ?? 'NaN');
  });
  const total = text.match(/รวม\s*(\d+)\s*รายการ\s*เบิกได้\s*([\d,]+\.\d{2})\s*เบิกไม่ได้\s*([\d,]+\.\d{2})/);
  return { amounts, count: Number(total?.[1] ?? NaN), claim: money(total?.[2] ?? 'NaN'), nonClaim: money(total?.[3] ?? 'NaN') };
}

test.describe('SBH-1566 เอกสารข้อมูลใบยา แสดงยอดเบิกได้ / เบิกไม่ได้ถูกต้อง (สิทธิ UC)', () => {
  for (const c of CASES) {
    test(
      `TC-${c.tc} (${c.issue}) ${c.title}`,
      { tag: ['@SBH-1566', `@${c.issue}`], annotation: [...PARENTS, c.issue].map(linear) },
      async ({ page }) => {
        test.setTimeout(900_000);
        const main = page.getByRole('main');
        const TC = `TC-${c.tc} (${c.issue})`;
        const note = (type: string, description: string) => {
          test.info().annotations.push({ type, description });
          console.log(`    ${type}: ${description}`);
        };
        const printer = await capturePrintJobs(page);

        // ── Pre-condition (TC ขั้น 1): ผู้ป่วย AUTO ใหม่ สิทธิ UC + Visit OPD + เช็คอิน ──
        let [hn, vn, en] = (process.env.SBH1566_P ?? '').split(',');
        if (hn) note('ผู้ป่วย', `ผู้ป่วยเดิม HN ${hn} · ${vn} · EN ${en}`);
        else {
          const patient = newTestPatient(`Rx1566-${c.tc}`);
          let newVisitEnabled = false;
          await checkStep(page, `${TC} ขั้น 1 ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน`, async () => {
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
            newVisitEnabled = await expectPatientInfo(page);
          });
          await checkStep(page, `${TC} ขั้น 1 เปิด Visit OPD อายุรกรรม สิทธิ UC เป็นลำดับ 1`, async () => {
            if (newVisitEnabled) await openNewVisitPanel(page);
            const ucRow = await addCoverageFirst(page, COVERAGE);
            await markEvidence(expected(ucRow));
            await snapEvidence(page, 'ก่อนกด — สิทธิ UC ลำดับ 1');
            // การ์ดนี้ไม่ขึ้นกับแพทย์ — ใช้แพทย์ที่ระบบเลือกให้ (แพทย์ใน SETTINGS ตารางเต็มช่วงบ่าย)
            const opd = await openOpdVisit(page, { anyDoctor: true });
            vn = opd.vn;
            en = opd.en;
            note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${hn} · ${vn} · EN ${en} · ${opd.clinic} · ${opd.doctor} · สิทธิ ${COVERAGE}`);
            console.log(`    ทำต่อกับรายเดิม: SBH1566_P=${hn},${vn},${en}`);
          });
          await checkStep(page, `${TC} ขั้น 1 เช็คอิน Visit OPD จากรายการผู้ป่วยนอก`, async () => {
            await selectOpdUnit(page);
            const row = await opdListRow(page, hn, { anyDoctor: true });
            await markEvidence(expected(row.getByText(`HN ${hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
            await snapEvidence(page, 'ก่อนกด — เช็คอิน Visit OPD');
            await checkInFromOpdList(page, row);
            await markEvidence(expected(row));
          });
        }

        // ── TC ขั้น 1: แพทย์สั่งยาใน CPOE แล้วส่งคำสั่ง ──
        if (!process.env.SBH1566_SKIP_ORDER && !process.env.SBH1566_RX) {
          await checkStep(page, `${TC} ขั้น 1 CPOE สั่ง ${c.drugs.map((d) => `${d.name} ${d.qty}`).join(' + ')} แล้วส่งคำสั่ง`, async () => {
            await selectOpdUnit(page);
            const row = await opdListRow(page, hn, { anyDoctor: true });
            const name = row.getByText(/AUTO\s/).first();
            await markEvidence(clicked(name));
            await name.click();
            await expect(main.getByText(`VN ${vn}`, { exact: true }).first(), 'เปิดหน้า EMR แล้วต้องเห็นแถบ Visit').toBeVisible({ timeout: 90_000 });
            await expect(main.getByText(/สิทธิ UC/).first(), 'แถบหัว Visit ต้องเป็นสิทธิ UC').toBeVisible({ timeout: 30_000 });
            await page.waitForTimeout(3_000);
            for (const tab of ['OPD', 'ประวัติการรักษา']) {
              const t = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${tab}\\s*$`) });
              if (await t.count()) await t.first().locator('.dv-default-tab-action').click().catch(() => undefined);
            }
            for (const d of c.drugs) {
              await addMedicineToCart(page, d.code, async () => {
                const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
                await qty.fill(String(d.qty));
                await qty.press('Tab');
                // ยานอกบัญชี: ช่อง * เหตุผล เติม B มาให้ · ระบุการวินิจฉัยโรคไม่บังคับ
                await expect(page.getByRole('button', { name: 'plus เพิ่มลงตะกร้า' }), `ยา ${d.code} ต้องกดเพิ่มลงตะกร้าได้`).toBeEnabled({ timeout: 15_000 });
              });
            }
            const basket = (d: Drug) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${d.code}]` }).first();
            const send = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
            await markEvidence(...c.drugs.map((d) => expected(basket(d))), clicked(send));
            await snapEvidence(page, 'ก่อนกด — ส่งคำสั่ง');
            const signed = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /SignOPDOrders/.test(r.request().postData() ?? ''), { timeout: 60_000 });
            await send.click();
            const res = await signed;
            const body = await res.json().catch(() => ({}));
            expect(body.errors, `ส่งคำสั่งไม่สำเร็จ: ${JSON.stringify(body.errors ?? '').slice(0, 300)}`).toBeFalsy();
            await page.waitForTimeout(3_000);
            note('ตะกร้าหลังส่งคำสั่ง', (await Promise.all(c.drugs.map(async (d) => squash(await basket(d).innerText())))).join(' ‖ '));
            await markEvidence(...c.drugs.map((d) => expected(basket(d))));
          });
        }

        // ── TC ขั้น 2: ห้องยาชั้น 1 → Order รอยืนยัน → สร้างใบยา ──
        const gotoPharmacy = async () => {
          await page.goto('/cortex/pharmacy/select-location');
          await main.getByRole('combobox').first().click();
          await options(page).filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
          await page.waitForTimeout(800);
          await main.getByRole('combobox').nth(1).click();
          await page.waitForTimeout(800);
          await page.keyboard.press('Enter'); // ช่องบริการตัวแรก
          await page.getByRole('button', { name: 'ส่ง' }).click();
          await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
        };
        const pharmacy = { claim: NaN, nonClaim: NaN, total: NaN, rows: [] as string[] };
        let rxId = process.env.SBH1566_RX ?? '';
        if (!rxId) {
          await checkStep(page, `${TC} ขั้น 2 ห้องยา Order รอยืนยัน → เปิด Order ของผู้ป่วย → สร้างใบยา`, async () => {
            await gotoPharmacy();
            const row = main.locator('tr.ant-table-row').filter({ hasText: `HN ${hn}` }).first();
            await expect(row, `ผู้ป่วย HN ${hn} ต้องอยู่แท็บ Order รอยืนยัน`).toBeVisible({ timeout: 60_000 });
            await markEvidence(clicked(row));
            await snapEvidence(page, 'ก่อนกด — Order ของผู้ป่วย');
            await row.locator('td').nth(4).click();
            const create = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
            await expect(create).toBeVisible({ timeout: 60_000 });
            await page.waitForTimeout(3_000);
            // ยอดตามสิทธิของแต่ละแถว (อ้างอิงเทียบกับเอกสาร): คอลัมน์ ราคารวม / เครดิต (= ส่วนที่สิทธิจ่าย) / เบิกไม่ได้
            const drugRow = (d: Drug) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${d.code}]` }).first();
            let claim = 0, non = 0, total = 0;
            const cells: Locator[] = [];
            for (const d of c.drugs) {
              const r = drugRow(d);
              const t = await cellByHeader(r, 'ราคารวม');
              const cr = await cellByHeader(r, 'เครดิต');
              const nc = await cellByHeader(r, 'เบิกไม่ได้');
              pharmacy.rows.push(`${d.name}: ราคารวม ${t.text} · เครดิต ${cr.text} · เบิกไม่ได้ ${nc.text}`);
              total += money(t.text);
              claim += money(cr.text);
              non += money(nc.text);
              cells.push(t.cell, cr.cell, nc.cell);
            }
            Object.assign(pharmacy, { claim, nonClaim: non, total });
            note('หน้ารับออเดอร์ (ห้องยา)', pharmacy.rows.join(' ‖ '));
            const print = main.getByRole('checkbox', { name: 'Print ฉลากยาอัตโนมัติ' });
            if (await print.isChecked().catch(() => false)) await print.uncheck();
            // เซลล์ใช้กรอบไม่มีป้าย — แถวเดียวป้ายไปทับหัวคอลัมน์ ราคารวม / เครดิต / เบิกไม่ได้ (R59) · ตีกรอบหัวคอลัมน์ให้เห็นว่าเป็นช่องไหน
            const head = (name: string) => main.locator('thead th').filter({ visible: true }).filter({ hasText: new RegExp(`^${name}$`) }).first();
            await markEvidence(...cells, head('ราคารวม'), head('เครดิต'), head('เบิกไม่ได้'), clicked(create));
            await snapEvidence(page, 'ก่อนกด — สร้างใบยา (ยอดตามสิทธิ)');
            const res = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/opd/prescriptions'), { timeout: 60_000 });
            await create.click();
            const response = await res;
            const body = await response.json().catch(() => ({}));
            expect(response.status(), `สร้างใบยาไม่สำเร็จ: ${JSON.stringify(body).slice(0, 200)}`).toBeLessThan(300);
            rxId = body.prescriptionId;
            note('ใบยา', `${rxId} · ทำต่อ (พิมพ์อย่างเดียว): SBH1566_P=${hn},${vn},${en} SBH1566_RX=${rxId}`);
          });
        }

        // ── TC ขั้น 3: ใบยารอจัด → หน้าใบยา → พิมพ์ใบยา ▾ → พิมพ์ใบยา ──
        let pdf: Buffer | undefined;
        await checkStep(page, `${TC} ขั้น 3 หน้าใบยา กดพิมพ์ใบยา ▾ → พิมพ์ใบยา`, async () => {
          if (!/\/pharmacy\/opd\/medication-orders/.test(page.url())) await gotoPharmacy();
          const tab = page.getByRole('tab', { name: /ใบยารอจัด/ });
          await tab.click();
          await page.waitForTimeout(2_500);
          // รายการทั้งวันมีหลายสิบใบ → ค้นด้วย HN ก่อน
          const search = main.getByPlaceholder('ค้นหา VN, HN');
          await search.fill(hn);
          await search.press('Enter');
          await page.waitForTimeout(2_000);
          const row =main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: hn }).filter({ hasText: rxId.slice(-5) }).first();
          await expect(row, `ใบยา ${rxId} ต้องอยู่แท็บ ใบยารอจัด`).toBeVisible({ timeout: 60_000 });
          await markEvidence(expected(tab), clicked(row));
          await snapEvidence(page, 'ก่อนกด — ใบยาในแท็บ ใบยารอจัด');
          await row.locator('td').nth(3).click();
          await page.waitForURL(new RegExp(`prescriptionId=${rxId}`), { timeout: 60_000 });
          const printButton = main.getByRole('button', { name: /พิมพ์ใบยา/ }).filter({ visible: true }).last();
          await expect(printButton).toBeVisible({ timeout: 60_000 });
          await page.waitForTimeout(2_000);
          await printButton.click();
          const item = page.getByRole('menuitem', { name: 'พิมพ์ใบยา', exact: true });
          await expect(item).toBeVisible({ timeout: 10_000 });
          await markEvidence(clicked(printButton), clicked(item));
          await snapEvidence(page, 'ก่อนกด — พิมพ์ใบยา ▾ › พิมพ์ใบยา');
          const before = printer.jobs.length;
          const pdfRes = page.waitForResponse((r) => /\/cortex-api\/prescriptions\/[^/]+\/pdf/.test(r.url()), { timeout: 60_000 });
          await item.click();
          const r = await pdfRes;
          expect(r.status(), 'ขอ PDF ใบยาต้องสำเร็จ').toBe(200);
          expect(r.url(), 'ต้องพิมพ์ใบยาของใบที่สร้าง').toContain(`/prescriptions/${rxId}/pdf`);
          const job = await printer.next(before, 30_000);
          expect(job, 'แอปต้องส่งเอกสารไปเครื่องพิมพ์').toBeTruthy();
          pdf = job!.pdf;
          note('งานพิมพ์', `${new URL(job!.url).pathname} · ${pdf.length} bytes · จาก GET ${new URL(r.url()).pathname}`);
          await test.info().attach(`ข้อมูลใบยา ${rxId}.pdf`, { body: pdf, contentType: 'application/pdf' });
          const toast = page.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: /พิมพ์/ }).last();
          if (await toast.isVisible({ timeout: 5_000 }).catch(() => false)) {
            note('แจ้งเตือน', squash(await toast.innerText()));
            await markEvidence(alerted(toast));
            await snapEvidence(page, 'หลังกด — แจ้งเตือนพิมพ์ใบยา');
          }
        });

        // ── TC ขั้น 4: ยอดเบิกได้ / เบิกไม่ได้ท้ายเอกสารข้อมูลใบยา ──
        await checkStep(page, `${TC} ขั้น 4 ยอดเบิกได้ / เบิกไม่ได้ท้ายเอกสารข้อมูลใบยา`, async () => {
          const text = (await pdfPages(pdf!)).join(' ');
          note('ข้อความ PDF', text);
          expect(text, 'เอกสารต้องเป็น "ข้อมูลใบยา" ของใบยาที่สร้าง').toContain('ข้อมูลใบยา');
          expect(text).toContain(rxId);
          const info = readRxInfo(text, c.drugs);
          const sum = (pick: (d: Drug) => boolean) => c.drugs.reduce((s, d, i) => s + (pick(d) ? info.amounts[i] : 0), 0);
          const expectClaim = sum((d) => d.claimable);
          const expectNon = sum((d) => !d.claimable);
          const total = sum(() => true);
          const hasPharmacy = !Number.isNaN(pharmacy.total);
          const rows: CompareRow[] = [
            ...c.drugs.map((d, i) => ({ label: `จำนวนเงิน ${d.name} (${d.claimable ? 'เบิกได้' : 'นอกบัญชี'})`, values: [baht(info.amounts[i]), '-', hasPharmacy ? (pharmacy.rows[i]?.match(/ราคารวม ([\d,.]+)/)?.[1] ?? '?') : '(ไม่ได้อ่าน)'], same: !Number.isNaN(info.amounts[i]) })),
            { label: 'เบิกได้', values: [baht(info.claim), baht(expectClaim), hasPharmacy ? baht(pharmacy.claim) : '(ไม่ได้อ่าน)'], same: info.claim === expectClaim && (!hasPharmacy || info.claim === pharmacy.claim) },
            { label: 'เบิกไม่ได้', values: [baht(info.nonClaim), baht(expectNon), hasPharmacy ? baht(pharmacy.nonClaim) : '(ไม่ได้อ่าน)'], same: info.nonClaim === expectNon && (!hasPharmacy || info.nonClaim === pharmacy.nonClaim) },
            { label: 'เบิกได้ + เบิกไม่ได้ = ยอดรวม', values: [baht(info.claim + info.nonClaim), baht(total), hasPharmacy ? baht(pharmacy.total) : '(ไม่ได้อ่าน)'], same: Math.abs(info.claim + info.nonClaim - total) < 0.005 },
          ];
          const overlay = await showPdf(page, pdf!, `ข้อมูลใบยา ${rxId} (${TC})`);
          await showCompareTable(page, `${TC} ยอดท้ายเอกสารข้อมูลใบยา`, ['เอกสาร (PDF)', 'Expected (จากจำนวนเงินของยา)', 'หน้าห้องยา (เครดิต / เบิกไม่ได้)'], rows, { side: 'left', width: '900px' });
          const marks: (Locator | ReturnType<typeof expected>)[] = [];
          // จำนวนเงินของแต่ละยา: กรอบไม่มีป้าย (ป้ายบังหัวคอลัมน์ "จำนวนเงิน" — R59)
          for (const d of c.drugs) {
            const line = await pdfLineAt(overlay, /^\d[\d,]*\.\d{2}$/, c.drugs.indexOf(d));
            if (line) marks.push(line);
          }
          const totalLine = (await pdfLineAt(overlay, /เบิกไม่ได้/)) ?? (await pdfLineAt(overlay, /เบิกได้/));
          if (totalLine) marks.push(expected(totalLine));
          await markEvidence(...marks);
          await holdForClip(page, 2_500);
          note('ผล', `เอกสาร: เบิกได้ ${baht(info.claim)} · เบิกไม่ได้ ${baht(info.nonClaim)} · Expected: เบิกได้ ${baht(expectClaim)} · เบิกไม่ได้ ${baht(expectNon)} · ยอดรวม ${baht(total)}`);
          expect(info.count, 'จำนวนรายการในเอกสาร').toBe(c.drugs.length);
          expect(info.claim, 'ยอดเบิกได้ท้ายเอกสาร').toBeCloseTo(expectClaim, 2);
          expect(info.nonClaim, 'ยอดเบิกไม่ได้ท้ายเอกสาร').toBeCloseTo(expectNon, 2);
          expect(info.claim + info.nonClaim, 'เบิกได้ + เบิกไม่ได้ = ยอดรวมของใบยา').toBeCloseTo(total, 2);
          if (hasPharmacy) {
            expect(info.claim, 'เบิกได้ในเอกสาร = เครดิตตามสิทธิที่หน้าห้องยา').toBeCloseTo(pharmacy.claim, 2);
            expect(info.nonClaim, 'เบิกไม่ได้ในเอกสาร = เบิกไม่ได้ที่หน้าห้องยา').toBeCloseTo(pharmacy.nonClaim, 2);
          }
        });
        await hideCompareTable(page);
        await hidePdf(page);
      },
    );
  }
});
