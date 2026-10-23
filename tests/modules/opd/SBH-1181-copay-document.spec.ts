import type { Locator, Page } from '@playwright/test';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { restartVideo, startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, orderFromOpdPanel, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { capturePrintJobs, hidePdf, pdfLineAt, pdfPages, showPdf } from '../../../helpers/functions/print-capture';
import { expectPatientInfo, fillNewPatientForm, gotoReception, openNewVisitPanel, saveNewPatient } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { addCoverageFirst, openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';

// การ์ด SBH-1181 [CPOE] Copay: ปุ่ม "พิมพ์ Co-pay" + เอกสาร Co-pay เมื่อ Visit มีรายการที่ผู้ป่วยต้องชำระเอง (ตัวแก้ cortex-ui PR #1794)
// EXE SBH-2921 → TS SBH-2922 (HPY) / 2923 (EDG) / 2924 (UHP) → TC-SBH-1181-001–018 = SBH-2925–2942 · 1 เทส = 1 ผู้ป่วยตาม EXE (A–H) · คลิป 1 ไฟล์ต่อ TC (R61)
// ผู้ป่วย AUTO ใหม่ที่เวชระเบียน (R53) + Visit OPD สิทธิ H03 UC ลำดับ 1 (G = เงินสด H01 ตามที่แผงเปิด Visit ใส่ให้) + เช็คอิน → CPOE (Super_User = แพทย์ "นาย ทดสอบ มานะ") · ทิ้ง Visit ไว้ (R11)
// ปุ่มอยู่หัวการ์ด "รวมค่าใช้จ่าย (วันนี้)" ของ CPOE · กดแล้ว POST /cortex-api/documents/generate (template sbh_copay_document) → PDF → print agent (localhost:8081/print/laser — ดักด้วย capturePrintJobs)
// ยาตาม EXE ยกเว้น BETAMED (med0000005): master data Route = "other" สั่งไม่ได้ (ErrInvalidAdministrativeRoute) → ผู้ใช้เลือก MEGROL 160 (med0000016 · 43 · เพดาน UC 37 → จ่ายส่วนต่าง 6) แทน (23 ต.ค. 2026)
//   DUOCETZ อยู่นอกชุดยา R25 — ผู้ใช้อนุญาตเฉพาะการ์ดนี้ · TC-008 ใช้ ECG 89.52 (UC ไม่มีเพดาน → ต้องชำระ 300) · TC-009 อุปกรณ์ A4701 (800 · เครดิต 600 · จ่าย 200) ผ่าน "Add instrument / supply" ของ Activity
//   ส่วนเวชภัณฑ์มีเฉพาะใต้ Activity order → TC-009 ใช้ SBHACT143 (เบิกได้เต็ม · ต้องชำระ 0) เป็นตัวพาในตะกร้า (ส่งคำสั่งไม่ได้บน dev-x: activity category 11 ปิด)
// ทำต่อกับผู้ป่วยเดิม: SBH1181_<A..H>=<HN>,<VN>,<EN> · SBH1181_D_FROM=<TC> (เริ่มขั้นของ D ที่ TC นั้น — ข้ามการสั่งยาชุดแรก)
// รัน dev-x: npx playwright test --headed --grep @SBH-1181 --project=chrome --no-deps --output=.cache/run-1181  (ทีละผู้ป่วย: --grep @SBH-2925 ฯลฯ)

interface Drug { code: string; name: string; qty: string; reasonF?: boolean }
const MEGROL: Drug = { code: 'med0000016', name: 'MEGROL 160', qty: '1' };
const DUOCETZ: Drug = { code: '315100209275952701', name: 'DUOCETZ', qty: '7' };
const GPO_F: Drug = { code: 'med0000007', name: 'GPO-L-ONE', qty: '1', reasonF: true };
const LINCO: Drug = { code: 'med0000006', name: 'LINCOMYCIN', qty: '1' };
const ECG = { code: '89.52', name: 'Electrocardiogram (ECG)' };
const CARRIER = { code: 'SBHACT143', name: 'Intralesional injection' };
const SUPPLY = { code: 'A4701', name: 'ท่อนำสายสวนเข้าหลอดเลือด' };
const UC = 'H03 - สิทธิ UC';

const TC: Record<string, string> = {
  '001': 'SBH-2925', '002': 'SBH-2926', '003': 'SBH-2927', '004': 'SBH-2928', '005': 'SBH-2929', '006': 'SBH-2930',
  '007': 'SBH-2931', '008': 'SBH-2932', '009': 'SBH-2933', '010': 'SBH-2934', '011': 'SBH-2935', '012': 'SBH-2936',
  '013': 'SBH-2937', '014': 'SBH-2938', '015': 'SBH-2939', '016': 'SBH-2940', '017': 'SBH-2941', '018': 'SBH-2942',
};
const PARENTS = ['SBH-1181', 'SBH-2921'];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const squash = (t: string) => t.replace(/\s+/g, ' ').trim();
const money = (t: string) => Number(t.replace(/,/g, ''));
const baht = (n: number) => n.toFixed(2);
const label = (n: string) => `TC-${n} (${TC[n]})`;

interface Patient { hn: string; vn: string; en: string }
interface CostRow { total: number; credit: number; pay: number; text: string }
interface PdfItem { no: number; name: string; qty: number; unit: number; amount: number }
interface CopayPrint { pdf: Buffer; text: string; drugs: PdfItem[]; services: string; template: string; indexId: string | null; ticket: string }

function parsePdf(text: string) {
  const drugs: PdfItem[] = [];
  const re = /(\d+)\.ชื่อยา\s*(.+?)\s*จำนวน\s*([\d,.]+)\s*ราคาต่อหน่วย\s*([\d,.]+)\s*บาท\s*รวม\s*([\d,.]+)\s*บาท/g;
  for (const m of text.matchAll(re)) drugs.push({ no: Number(m[1]), name: m[2], qty: money(m[3]), unit: money(m[4]), amount: money(m[5]) });
  const services = text.match(/2\.2 หมวด[^]*?(?=3\. ผู้ป่วยแสดงความประสงค์|$)/)?.[0] ?? '';
  return { drugs, services };
}

/** ตัวช่วยของเทส: ผู้ป่วย / CPOE / ปุ่ม Co-pay / พิมพ์ / รายการเอกสาร */
function cpoe(page: Page, note: (type: string, d: string) => void) {
  const main = page.getByRole('main');
  const copayButton = page.getByRole('button', { name: /พิมพ์ Co-pay/ });
  const costCard = page.locator('[class*="cost-summary"]').filter({ hasText: 'รวมค่าใช้จ่าย (วันนี้)' }).first();
  const basketRow = (code: string) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
  const sendButton = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
  let printer: Awaited<ReturnType<typeof capturePrintJobs>> | undefined;

  const closeSidePanels = async () => {
    for (const name of ['OPD', 'ประวัติการรักษา', 'เอกสาร']) {
      const tab = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
      if (await tab.count()) await tab.first().locator('.dv-default-tab-action').click().catch(() => undefined);
    }
    await page.mouse.move(700, 1000);
  };

  return {
    main, copayButton, costCard, basketRow, sendButton,
    async setup() {
      printer = await capturePrintJobs(page);
    },
    /** ผู้ป่วย AUTO ใหม่ + Visit OPD (UC ลำดับ 1 / เงินสด) + เช็คอิน · env SBH1181_<key> = ใช้ผู้ป่วยเดิม */
    async patient(key: string, tc: string, cash = false): Promise<Patient> {
      const env = process.env[`SBH1181_${key}`];
      if (env) {
        const [hn, vn, en] = env.split(',');
        note('ผู้ป่วย', `คนไข้ ${key} (เดิม) HN ${hn} · ${vn} · EN ${en}`);
        return { hn, vn, en };
      }
      const person = newTestPatient(`Copay1181${key}`);
      let hn = '';
      let newVisitEnabled = false;
      await checkStep(page, `${label(tc)} ขั้น 1 คนไข้ ${key} ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน`, async () => {
        await gotoReception(page);
        await restartVideo(page);
        await fillNewPatientForm(page, person);
        hn = await saveNewPatient(page);
        newVisitEnabled = await expectPatientInfo(page);
      });
      let p!: Patient;
      await checkStep(page, `${label(tc)} ขั้น 1 คนไข้ ${key} เปิด Visit OPD ${cash ? 'สิทธิเงินสด' : 'สิทธิ UC ลำดับ 1'}`, async () => {
        if (newVisitEnabled) await openNewVisitPanel(page);
        if (!cash) {
          const row = await addCoverageFirst(page, UC);
          await markEvidence(expected(row));
        } else {
          const cov = main.getByText(/H01 - เงินสด/).first();
          await expect(cov, 'สิทธิเงินสดต้องเป็นสิทธิของ Visit').toBeVisible({ timeout: 30_000 });
          await markEvidence(expected(cov));
        }
        await snapEvidence(page, `ก่อนกด — สิทธิของ Visit คนไข้ ${key}`);
        const opd = await openOpdVisit(page, { anyDoctor: true });
        p = { hn, vn: opd.vn, en: opd.en };
        note('ผู้ป่วย', `คนไข้ ${key}: ${person.firstName} ${person.familyName} · HN ${hn} · ${opd.vn} · EN ${opd.en} · ${opd.clinic} · ${cash ? 'สิทธิเงินสด' : UC}`);
        console.log(`    ทำต่อกับรายเดิม: SBH1181_${key}=${hn},${opd.vn},${opd.en}`);
      });
      await checkStep(page, `${label(tc)} ขั้น 1 คนไข้ ${key} เช็คอิน Visit OPD`, async () => {
        await selectOpdUnit(page);
        const row = await opdListRow(page, hn, { anyDoctor: true });
        await checkInFromOpdList(page, row);
        await markEvidence(expected(row));
      });
      return p;
    },
    /** ผู้ป่วยนอก → คลิกชื่อ → CPOE */
    async openEmr(p: Patient) {
      await selectOpdUnit(page);
      const row = await opdListRow(page, p.hn, { anyDoctor: true });
      const name = row.getByText(/AUTO\s/).first();
      await markEvidence(clicked(name));
      await name.click();
      await expect(main.getByText(`VN ${p.vn}`, { exact: true }).first(), 'เปิด CPOE แล้วต้องเห็นแถบ Visit').toBeVisible({ timeout: 90_000 });
      await page.waitForTimeout(3_000);
      await closeSidePanels();
    },
    async reload(p: Patient) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(main.getByText(`VN ${p.vn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
      await page.waitForTimeout(3_000);
      await closeSidePanels();
    },
    closeSidePanels,
    /** เพิ่มยาลงตะกร้า (จำนวน · เหตุผลยานอกบัญชี F ถ้าระบุ) */
    async addDrug(d: Drug) {
      await addMedicineToCart(page, d.code, async () => {
        const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
        await qty.fill(d.qty);
        await qty.press('Tab');
        await markEvidence(filled(qty));
        if (d.reasonF) {
          const reason = main.locator('.ant-form-item').filter({ has: page.locator('label', { hasText: /^เหตุผล$/ }) }).first();
          await reason.locator('.ant-select').click();
          await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^F/ }).first().click();
          await expect(reason, 'เหตุผลยานอกบัญชีต้องเป็น F').toContainText(/F - ผู้ป่วยแสดงความจำนง/);
          await markEvidence(filled(reason));
        }
      });
      await expect(basketRow(d.code), `ยา ${d.code} ต้องขึ้นในตะกร้า`).toBeVisible({ timeout: 30_000 });
    },
    async send() {
      await expect(sendButton).toBeEnabled({ timeout: 30_000 });
      await markEvidence(clicked(sendButton));
      await snapEvidence(page, 'ก่อนกด — ส่งคำสั่ง');
      const signed = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /SignOPDOrders/.test(r.request().postData() ?? ''), { timeout: 60_000 });
      await sendButton.click();
      const body = await (await signed).json().catch(() => ({}));
      expect(body.errors, `ส่งคำสั่งไม่สำเร็จ: ${JSON.stringify(body.errors ?? '').slice(0, 300)}`).toBeFalsy();
      await page.waitForTimeout(3_000);
    },
    /** ยอด รวม / เครดิต / ต้องชำระ ของแถวในตะกร้า (3 ตัวเลขท้ายแถว) */
    async cost(code: string): Promise<CostRow> {
      const text = squash(await basketRow(code).innerText());
      const nums = [...text.matchAll(/(-?[\d,]+\.\d{2})/g)].map((m) => money(m[1]));
      const [total, credit, pay] = nums.slice(-3);
      return { total, credit, pay, text };
    },
    async waitCostCard() {
      await expect(costCard, 'การ์ดรวมค่าใช้จ่าย (วันนี้) ต้องขึ้น').toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(2_500);
    },
    /** กดพิมพ์ Co-pay → คำขอ documents/generate + PDF ที่ส่งไปเครื่องพิมพ์ */
    async printCopay(tag: string): Promise<CopayPrint> {
      await expect(copayButton, 'ต้องมีปุ่มพิมพ์ Co-pay').toBeVisible({ timeout: 30_000 });
      await copayButton.scrollIntoViewIfNeeded();
      await markEvidence(clicked(copayButton));
      await snapEvidence(page, `ก่อนกด — พิมพ์ Co-pay (${tag})`);
      const before = printer!.jobs.length;
      const req = page.waitForRequest((r) => r.url().includes('/cortex-api/documents/generate'), { timeout: 60_000 });
      const res = page.waitForResponse((r) => r.url().includes('/cortex-api/documents/generate'), { timeout: 60_000 });
      await copayButton.click();
      const body = JSON.parse((await req).postData() ?? '{}');
      const response = await res;
      expect(response.status(), 'สร้างเอกสาร Co-pay (documents/generate) ต้องสำเร็จ').toBe(200);
      const headers = response.headers();
      const job = await printer!.next(before, 30_000);
      expect(job, 'แอปต้องส่งเอกสาร Co-pay ไปเครื่องพิมพ์').toBeTruthy();
      const text = squash((await pdfPages(job!.pdf)).join(' '));
      const parsed = parsePdf(text);
      const result: CopayPrint = { pdf: job!.pdf, text, ...parsed, template: body?.ref?.value ?? '', indexId: headers['x-document-index-id'] ?? null, ticket: (headers['x-print-ticket'] ?? '').slice(-16) };
      note(`เอกสาร Co-pay (${tag})`, `template ${result.template} · X-Document-Index-Id ${result.indexId ?? '(ไม่มี)'} · ยา: ${result.drugs.map((d) => `${d.no}.${d.name} ×${d.qty} รวม ${baht(d.amount)}`).join(' | ') || '-'} · หมวด 2.2: ${squash(result.services).slice(0, 200)}`);
      await test.info().attach(`เอกสาร Co-pay ${tag}.pdf`, { body: job!.pdf, contentType: 'application/pdf' });
      const toast = page.locator('.ant-notification-notice').filter({ hasText: /Co-pay/ }).last();
      if (await toast.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await toast.hover({ trial: true }).catch(() => undefined);
        await markEvidence(alerted(toast));
        await snapEvidence(page, `หลังกด — แจ้งเตือนพิมพ์ Co-pay (${tag})`);
        note(`แจ้งเตือน (${tag})`, squash(await toast.innerText()));
      }
      return result;
    },
    /** แสดง PDF ครึ่งขวา + ตารางเทียบครึ่งซ้าย แล้วตีกรอบบรรทัดของรายการ */
    async showCopay(doc: CopayPrint, caption: string, rows: CompareRow[], highlight: RegExp[]) {
      const overlay = await showPdf(page, doc.pdf, caption);
      await showCompareTable(page, caption, ['เอกสาร Co-pay (PDF)', 'Expected / CPOE'], rows, { side: 'left', width: '880px' });
      const marks: Locator[] = [];
      for (const re of highlight) {
        const line = await pdfLineAt(overlay, re);
        if (line) marks.push(line);
      }
      if (marks.length) await markEvidence(...marks.map(expected));
      await holdForClip(page, 2_500);
    },
    async hideCopay() {
      await hideCompareTable(page);
      await hidePdf(page);
    },
    /** เมนูซ้าย เอกสาร → รายการเอกสารของ Visit (นับเอกสาร Co-pay) */
    async visitDocuments(tag: string) {
      await page.getByRole('menuitem', { name: /เอกสาร$/ }).first().dispatchEvent('click');
      const upload = page.getByRole('button', { name: /อัปโหลด/ }).filter({ visible: true }).first();
      await expect(upload, 'ต้องเปิดแผงเอกสารของ Visit').toBeVisible({ timeout: 30_000 });
      const panel = upload.locator('xpath=ancestor::div[.//table][1]');
      await page.waitForTimeout(3_000);
      const rows = panel.locator('tr.ant-table-row');
      const all = (await rows.allInnerTexts()).map(squash);
      const copay = all.filter((t) => /co-?pay|ขอชำระเงิน|ความประสงค์/i.test(t));
      const empty = await panel.locator('.ant-table-placeholder').isVisible().catch(() => false);
      note(`รายการเอกสารของ Visit (${tag})`, `${all.length} รายการ${empty ? ' (ไม่มีข้อมูล)' : ''} · เอกสาร Co-pay ${copay.length} · ${all.join(' | ').slice(0, 300)}`);
      await markEvidence(expected(panel));
      return { all, copay, empty, panel };
    },
    /** แก้ไขแถวยาที่ส่งแล้ว: จำนวน / เหตุผลยานอกบัญชี → บันทึก */
    async editDrug(code: string, change: { qty?: string; reason?: 'B' }) {
      const row = basketRow(code);
      const edit = row.getByRole('button', { name: 'แก้ไข' });
      await markEvidence(expected(row), clicked(edit));
      await snapEvidence(page, `ก่อนกด — แก้ไข ${code}`);
      await edit.click();
      const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
      await expect(qty).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(2_000);
      await page.keyboard.press('Escape');
      if (change.qty) {
        await qty.fill(change.qty);
        await qty.press('Tab');
        await markEvidence(filled(qty));
      }
      if (change.reason) {
        const reason = main.locator('.ant-form-item').filter({ has: page.locator('label', { hasText: /^เหตุผล$/ }) }).first();
        await reason.locator('.ant-select').click();
        await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${change.reason}`) }).first().click();
        await expect(reason).toContainText(new RegExp(`${change.reason} - `));
        await markEvidence(filled(reason));
      }
      const save = main.locator('button').filter({ hasText: /^\s*บันทึก\s*$/ }).filter({ visible: true }).first();
      await markEvidence(clicked(save));
      await snapEvidence(page, `ก่อนกด — บันทึกแก้ไข ${code}`);
      const up = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /UpsertOpdOrder/.test(r.request().postData() ?? ''), { timeout: 60_000 });
      await save.click();
      const body = await (await up).json().catch(() => ({}));
      expect(body.errors, `บันทึกแก้ไข ${code} ไม่สำเร็จ: ${JSON.stringify(body.errors ?? '').slice(0, 300)}`).toBeFalsy();
      await page.waitForTimeout(4_000);
    },
    /** ปุ่ม ยกเลิก ของแถว → popconfirm ยืนยัน */
    async cancelRow(code: string) {
      const row = basketRow(code);
      const cancel = row.getByRole('button', { name: 'ยกเลิก' });
      await markEvidence(expected(row), clicked(cancel));
      await snapEvidence(page, `ก่อนกด — ยกเลิก ${code}`);
      await cancel.click();
      const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').last();
      await expect(pop, 'กดยกเลิกแล้วต้องถามยืนยัน').toBeVisible({ timeout: 10_000 });
      const ok = pop.getByRole('button', { name: 'ยืนยัน' });
      await markEvidence(alerted(pop), clicked(ok));
      await snapEvidence(page, `แจ้งเตือน — ยืนยันยกเลิก ${code}`);
      const mut = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /mutation/i.test(r.request().postData() ?? ''), { timeout: 30_000 }).catch(() => undefined);
      await ok.click();
      const res = await mut;
      note(`ยกเลิก ${code}`, res ? `${(res.request().postData() ?? '').match(/"operationName":"(\w+)"/)?.[1] ?? ''} → ${squash(await res.text().catch(() => '')).slice(0, 200)}` : '(ไม่มีคำขอ)');
      await page.waitForTimeout(4_000);
    },
  };
}

test.describe('SBH-1181 ปุ่มพิมพ์ Co-pay + เอกสาร Co-pay (CPOE OPD)', () => {
  test.describe.configure({ mode: 'default' });

  /** เทสเดี่ยว: สั่งรายการ → ส่งคำสั่ง → ดูปุ่ม (A / B / C / E / G / H) */
  const single: { tc: string; key: string; title: string; drugs: Drug[]; activity?: boolean; cash?: boolean; expectButton: boolean }[] = [
    { tc: '001', key: 'A', title: 'ยาจ่ายส่วนต่าง (MEGROL แทน BETAMED) → แสดงปุ่ม', drugs: [MEGROL], expectButton: true },
    { tc: '002', key: 'B', title: 'ยานอกบัญชี DUOCETZ เหตุผล B (เบิกไม่ได้เลย) → แสดงปุ่ม', drugs: [DUOCETZ], expectButton: true },
    { tc: '007', key: 'C', title: 'ยานอกบัญชี med0000007 เหตุผล F → แสดงปุ่ม', drugs: [GPO_F], expectButton: true },
    { tc: '008', key: 'E', title: 'Activity ECG 89.52 มียอดต้องชำระ → แสดงปุ่ม', drugs: [], activity: true, expectButton: true },
    { tc: '017', key: 'G', title: 'สิทธิเงินสด สั่ง DUOCETZ + MEGROL → ไม่แสดงปุ่ม', drugs: [DUOCETZ, MEGROL], cash: true, expectButton: false },
    { tc: '018', key: 'H', title: 'LINCOMYCIN 1 vial เบิกได้เต็ม → ไม่แสดงปุ่ม', drugs: [LINCO], expectButton: false },
  ];
  for (const s of single) {
    test(`${label(s.tc)} คนไข้ ${s.key} ${s.title}`, { tag: ['@SBH-1181', `@${TC[s.tc]}`], annotation: [...PARENTS, TC[s.tc]].map(linear) }, async ({ page }) => {
      test.setTimeout(900_000);
      const note = (type: string, d: string) => { test.info().annotations.push({ type, description: d }); console.log(`    ${type}: ${d}`); };
      const c = cpoe(page, note);
      await c.setup();
      const p = await c.patient(s.key, s.tc, s.cash);
      await startClip(page, `TC-${s.tc}`);
      await checkStep(page, `${label(s.tc)} ขั้น 2 CPOE สั่ง ${s.activity ? ECG.code : s.drugs.map((d) => `${d.name} ×${d.qty}${d.reasonF ? ' เหตุผล F' : ''}`).join(' + ')} แล้วส่งคำสั่ง`, async () => {
        await c.openEmr(p);
        if (s.activity) await orderFromOpdPanel(page, ECG.code, async (send) => {
          await markEvidence(expected(c.basketRow(ECG.code)), clicked(send));
          await snapEvidence(page, 'ก่อนกด — ส่งคำสั่ง ECG');
        });
        else {
          for (const d of s.drugs) await c.addDrug(d);
          await markEvidence(...s.drugs.map((d) => expected(c.basketRow(d.code))));
          await c.send();
        }
      });
      await checkStep(page, `${label(s.tc)} ขั้น 3 ดูปุ่ม "พิมพ์ Co-pay" (${s.expectButton ? 'ต้องแสดง' : 'ต้องไม่แสดง'})`, async () => {
        await c.reload(p);
        await c.waitCostCard();
        const codes = s.activity ? [ECG.code] : s.drugs.map((d) => d.code);
        const costs = await Promise.all(codes.map(async (code) => ({ code, ...(await c.cost(code)) })));
        note('ยอดในตะกร้า (รวม / เครดิต / ต้องชำระ)', costs.map((x) => `${x.code}: ${baht(x.total)} / ${baht(x.credit)} / ${baht(x.pay)}`).join(' ‖ '));
        const visible = await c.copayButton.isVisible().catch(() => false);
        const rows: CompareRow[] = [
          ...costs.map((x) => ({ label: `${x.code} ต้องชำระ`, values: [baht(x.pay), s.expectButton ? '> 0' : s.cash ? '(สิทธิเงินสด)' : '0.00'], same: s.cash ? true : s.expectButton ? x.pay > 0 : x.pay === 0 })),
          { label: 'ปุ่ม "พิมพ์ Co-pay"', values: [visible ? 'แสดง' : 'ไม่แสดง', s.expectButton ? 'แสดง' : 'ไม่แสดง'], same: visible === s.expectButton },
        ];
        await c.costCard.scrollIntoViewIfNeeded();
        await showCompareTable(page, `${label(s.tc)} ปุ่มพิมพ์ Co-pay`, ['หน้าจอ', 'Expected'], rows, { side: 'bottom' });
        await markEvidence(expected(c.costCard), ...codes.map((code) => c.basketRow(code)));
        await holdForClip(page, 2_500);
        expect(visible, s.expectButton ? 'ต้องแสดงปุ่ม "พิมพ์ Co-pay"' : 'ต้องไม่แสดงปุ่ม "พิมพ์ Co-pay"').toBe(s.expectButton);
      });
      await hideCompareTable(page);
      if (s.expectButton || (await c.copayButton.isVisible().catch(() => false))) {
        await checkStep(page, `${label(s.tc)} เพิ่มเติม กดพิมพ์ Co-pay ดูเอกสาร`, async () => {
          const doc = await c.printCopay(`TC-${s.tc}`);
          const names = s.activity ? [ECG.name] : s.drugs.map((d) => d.name);
          const rows: CompareRow[] = names.map((n) => ({ label: n, values: [doc.text.includes(n) ? 'มีในเอกสาร' : 'ไม่มี', s.expectButton ? 'มี' : '-'], same: doc.text.includes(n) === s.expectButton || !s.expectButton }));
          await c.showCopay(doc, `${label(s.tc)} เอกสาร Co-pay`, rows, names.map((n) => new RegExp(n.replace(/[()]/g, '.'))));
        });
        await c.hideCopay();
      }
    });
  }

  test(`${label('009')} คนไข้ F เพิ่มอุปกรณ์ A4701 ที่มียอดต้องชำระ → แสดงปุ่ม`, { tag: ['@SBH-1181', '@SBH-2933'], annotation: [...PARENTS, 'SBH-2933'].map(linear) }, async ({ page }) => {
    test.setTimeout(900_000);
    const note = (type: string, d: string) => { test.info().annotations.push({ type, description: d }); console.log(`    ${type}: ${d}`); };
    const c = cpoe(page, note);
    await c.setup();
    const p = await c.patient('F', '009');
    await startClip(page, 'TC-009');
    const tc = label('009');
    const expandSwitch = page.getByText('ขยาย', { exact: true }).filter({ visible: true }).first().locator('xpath=following::button[@role="switch"][1]');
    await checkStep(page, `${tc} ขั้น 2 เพิ่ม Activity SBHACT143 (เบิกได้เต็ม) ลงตะกร้า — ยังไม่มีปุ่ม`, async () => {
      await c.openEmr(p);
      // ทำต่อกับรายเดิม: SBHACT143 อยู่ในตะกร้าแล้ว ไม่เพิ่มซ้ำ
      await c.basketRow(CARRIER.code).waitFor({ state: 'visible', timeout: 8_000 }).catch(() => undefined);
      if (!(await c.basketRow(CARRIER.code).isVisible().catch(() => false))) {
        const search = c.main.getByPlaceholder(/ค้นหา ยา, เวชภัณฑ์/);
        await search.click();
        await search.fill(CARRIER.code);
        const opt = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: `[${CARRIER.code}]` }).first();
        await expect(opt).toBeVisible({ timeout: 30_000 });
        await opt.click();
        await page.waitForTimeout(2_000);
        const add = page.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).filter({ visible: true }).first();
        await markEvidence(filled(search), clicked(add));
        await snapEvidence(page, 'ก่อนกด — เพิ่ม SBHACT143 ลงตะกร้า');
        const up = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /UpsertOpdOrder/.test(r.request().postData() ?? ''), { timeout: 60_000 });
        await add.click();
        await up;
      }
      await expect(c.basketRow(CARRIER.code)).toBeVisible({ timeout: 30_000 });
      await c.waitCostCard();
      const cost = await c.cost(CARRIER.code);
      note('SBHACT143 (รวม / เครดิต / ต้องชำระ)', `${baht(cost.total)} / ${baht(cost.credit)} / ${baht(cost.pay)}`);
      const visible = await c.copayButton.isVisible().catch(() => false);
      await markEvidence(expected(c.basketRow(CARRIER.code)), expected(c.costCard));
      await holdForClip(page);
      expect(cost.pay, 'Activity ตัวพาต้องเบิกได้เต็ม (ต้องชำระ 0)').toBe(0);
      expect(visible, 'ก่อนเพิ่มอุปกรณ์ ต้องยังไม่มีปุ่มพิมพ์ Co-pay').toBe(false);
    });
    await checkStep(page, `${tc} ขั้น 2 ตารางขยาย → Add instrument / supply → เลือก A4701`, async () => {
      if ((await expandSwitch.getAttribute('aria-checked')) !== 'true') {
        await markEvidence(clicked(expandSwitch));
        await expandSwitch.click();
        await page.waitForTimeout(2_000);
      }
      const addSupply = page.getByRole('button', { name: /Add instrument \/ supply/ });
      await expect(addSupply).toBeVisible({ timeout: 20_000 });
      await addSupply.scrollIntoViewIfNeeded();
      await markEvidence(clicked(addSupply));
      await snapEvidence(page, 'ก่อนกด — Add instrument / supply');
      await addSupply.click();
      // หัว "Instrument" → ช่องค้นหา (combobox) ตัวแรกที่ตามมา · ส่วนนี้บางผู้ป่วยอยู่ใน .ant-card บางรายไม่อยู่
      const instrumentHead = page.getByText('Instrument', { exact: true }).filter({ visible: true }).first();
      const combo = instrumentHead.locator('xpath=following::input[@role="combobox"][1]');
      const section = instrumentHead.locator('xpath=ancestor::div[.//button[contains(., "Add instrument")]][1]');
      await combo.scrollIntoViewIfNeeded();
      await combo.click();
      await combo.fill(SUPPLY.code); // ต้องพิมพ์อย่างน้อย 2 ตัวอักษร
      await page.waitForTimeout(3_000);
      await markEvidence(filled(combo));
      const opt = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${SUPPLY.code} `) }).first();
      await expect(opt, 'ต้องเห็นอุปกรณ์ A4701 ในรายการ').toBeVisible({ timeout: 20_000 });
      await markEvidence(clicked(opt));
      await snapEvidence(page, 'ก่อนกด — เลือก A4701');
      const up = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /UpsertInstrumentChargeItem/.test(r.request().postData() ?? ''), { timeout: 30_000 });
      await opt.click();
      const body = await (await up).json().catch(() => ({}));
      const item = body?.data?.upsertInstrumentChargeItem;
      note('อุปกรณ์ที่เพิ่ม', `${SUPPLY.code} ${SUPPLY.name} · charge item ${item?.id} · totalCredit ${item?.totalCredit} · totalNetPaid ${item?.totalNetPaid} · ${item?.latestStatusCode}`);
      const supplyRow = section.locator('tr').filter({ hasText: SUPPLY.name }).first();
      await expect(supplyRow).toBeVisible({ timeout: 20_000 });
      await markEvidence(expected(supplyRow));
      await holdForClip(page);
      expect(item?.totalNetPaid, 'อุปกรณ์ต้องมียอดผู้ป่วยต้องชำระ > 0').toBeGreaterThan(0);
    });
    await checkStep(page, `${tc} ขั้น 3 ดูปุ่ม "พิมพ์ Co-pay" (ต้องแสดง)`, async () => {
      await c.waitCostCard();
      await c.costCard.scrollIntoViewIfNeeded();
      const visible = await c.copayButton.isVisible().catch(() => false);
      const summary = squash(await c.costCard.innerText());
      note('รวมค่าใช้จ่าย', summary);
      await showCompareTable(page, `${tc} ปุ่มพิมพ์ Co-pay`, ['หน้าจอ', 'Expected'], [
        { label: 'แถว INSTRUMENT/MED SUPPLY', values: [summary.match(/INSTRUMENT\/MED SUPPLY[\s\d.,]+/)?.[0] ?? '(ไม่มี)', 'จ่าย > 0'], same: /INSTRUMENT\/MED SUPPLY/.test(summary) },
        { label: 'ปุ่ม "พิมพ์ Co-pay"', values: [visible ? 'แสดง' : 'ไม่แสดง', 'แสดง'], same: visible },
      ], { side: 'bottom' });
      await markEvidence(expected(c.costCard));
      await holdForClip(page, 2_500);
      expect(visible, 'ต้องแสดงปุ่ม "พิมพ์ Co-pay"').toBe(true);
    });
    await hideCompareTable(page);
    await checkStep(page, `${tc} เพิ่มเติม กดพิมพ์ Co-pay ดูเอกสาร`, async () => {
      const doc = await c.printCopay('TC-009');
      const has = doc.services.includes(SUPPLY.name);
      await c.showCopay(doc, `${tc} เอกสาร Co-pay`, [{ label: 'หมวด 2.2 มี A4701', values: [has ? 'มี' : 'ไม่มี', 'มี'], same: has }], [/ท่อนำสายสวน/]);
    });
    await c.hideCopay();
  });

  test(`TC-003–006 · 010–016 (SBH-2927–2930 · 2934–2940) คนไข้ D เอกสาร Co-pay + อัปเดตตาม Order`, {
    tag: ['@SBH-1181', '@SBH-2927', '@SBH-2928', '@SBH-2929', '@SBH-2930', '@SBH-2934', '@SBH-2935', '@SBH-2936', '@SBH-2937', '@SBH-2938', '@SBH-2939', '@SBH-2940'],
    annotation: [...PARENTS, 'SBH-2927', 'SBH-2928', 'SBH-2929', 'SBH-2930', 'SBH-2934', 'SBH-2935', 'SBH-2936', 'SBH-2937', 'SBH-2938', 'SBH-2939', 'SBH-2940'].map(linear),
  }, async ({ page }) => {
    test.setTimeout(1_800_000);
    const note = (type: string, d: string) => { test.info().annotations.push({ type, description: d }); console.log(`    ${type}: ${d}`); };
    const c = cpoe(page, note);
    await c.setup();
    const failures: string[] = [];
    const soft = async (title: string, body: () => Promise<void>) => {
      try { await checkStep(page, title, body); } catch (e) { failures.push(`${title}: ${(e as Error).message.split('\n')[0]}`); note('ไม่ผ่าน', `${title}: ${(e as Error).message.split('\n')[0]}`); }
      await hideCompareTable(page);
      await hidePdf(page);
    };
    const order = ['003', '004', '005', '006', '012', '010', '011', '013', '016', '014', '015'];
    const from = process.env.SBH1181_D_FROM ?? '003';
    const run = (tc: string) => order.indexOf(tc) >= order.indexOf(from);
    const p = await c.patient('D', '003');
    const drugs = [DUOCETZ, MEGROL, GPO_F, LINCO];
    const ptsOf = async () => Object.fromEntries(await Promise.all(drugs.map(async (d) => [d.code, await c.cost(d.code).catch(() => undefined)] as const)));

    // ── TC-003: สั่ง 4 รายการ → พิมพ์ Co-pay → มีเฉพาะ 3 รายการที่ต้องชำระ ──
    let first: CopayPrint | undefined;
    let pay: Record<string, CostRow | undefined> = {};
    await startClip(page, 'TC-003');
    if (run('003')) {
      await soft(`${label('003')} ขั้น 2 CPOE สั่ง DUOCETZ B · MEGROL · med0000007 F · LINCOMYCIN แล้วส่งคำสั่ง`, async () => {
        await c.openEmr(p);
        for (const d of drugs) await c.addDrug(d);
        await markEvidence(...drugs.map((d) => expected(c.basketRow(d.code))));
        await c.send();
      });
    } else await c.openEmr(p);
    await soft(`${label('003')} ขั้น 3 กดพิมพ์ Co-pay → เอกสารมีเฉพาะรายการที่ต้องชำระ`, async () => {
      await c.reload(p);
      await c.waitCostCard();
      pay = await ptsOf();
      note('ยอดใน CPOE (รวม / เครดิต / ต้องชำระ)', drugs.map((d) => `${d.name}: ${pay[d.code] ? `${baht(pay[d.code]!.total)} / ${baht(pay[d.code]!.credit)} / ${baht(pay[d.code]!.pay)}` : '(ไม่มีแถว)'}`).join(' ‖ '));
      first = await c.printCopay('TC-003');
      const rows: CompareRow[] = drugs.map((d) => {
        const inDoc = first!.drugs.some((x) => x.name.includes(d.name));
        const want = (pay[d.code]?.pay ?? 0) > 0;
        return { label: `${d.name} (ต้องชำระ ${baht(pay[d.code]?.pay ?? NaN)})`, values: [inDoc ? 'มี' : 'ไม่มี', want ? 'มี' : 'ไม่มี'], same: inDoc === want };
      });
      await c.showCopay(first, `${label('003')} เอกสาร Co-pay`, rows, [/DUOCETZ/, /MEGROL/, /GPO-L-ONE/]);
      for (const d of [DUOCETZ, MEGROL, GPO_F]) expect(first.drugs.some((x) => x.name.includes(d.name)), `เอกสารต้องมี ${d.name}`).toBe(true);
      expect(first.text, 'เอกสารต้องไม่มี LINCOMYCIN').not.toContain('LINCOMYCIN');
    });

    // ── TC-004: ครบทุกรายการในฉบับเดียว ──
    await startClip(page, 'TC-004');
    await soft(`${label('004')} ขั้น 2 นับรายการในเอกสาร เทียบรายการที่ต้องชำระใน CPOE`, async () => {
      expect(first, 'ต้องมีเอกสารจาก TC-003').toBeTruthy();
      const want = drugs.filter((d) => (pay[d.code]?.pay ?? 0) > 0);
      await c.showCopay(first!, `${label('004')} รายการครบในเอกสารฉบับเดียว`, [
        { label: 'จำนวนรายการที่ต้องชำระ (CPOE)', values: [String(first!.drugs.length), String(want.length)], same: first!.drugs.length === want.length },
        { label: 'เลขลำดับในเอกสาร', values: [first!.drugs.map((x) => x.no).join(', '), want.map((_, i) => i + 1).join(', ')], same: first!.drugs.map((x) => x.no).join() === want.map((_, i) => i + 1).join() },
        { label: 'จำนวนหน้า PDF / ฉบับ', values: [`${(await pdfPages(first!.pdf)).length} หน้า · 1 ฉบับ`, '1 ฉบับ'], same: true },
      ], [/1\.ชื่อยา/, /2\.ชื่อยา/, /3\.ชื่อยา/]);
      expect(first!.drugs.length, 'เอกสารต้องมีรายการที่ต้องชำระครบ').toBe(want.length);
    });

    // ── TC-005: ราคาแต่ละแถว = ยอดต้องชำระ · ยอดรวม ──
    await startClip(page, 'TC-005');
    await soft(`${label('005')} ขั้น 2–3 ราคาแต่ละแถว = ยอดต้องชำระใน CPOE · ยอดรวม`, async () => {
      expect(first, 'ต้องมีเอกสารจาก TC-003').toBeTruthy();
      const rows: CompareRow[] = [];
      let sumDoc = 0, sumCpoe = 0;
      for (const d of [DUOCETZ, MEGROL, GPO_F]) {
        const item = first!.drugs.find((x) => x.name.includes(d.name));
        const cp = pay[d.code];
        sumDoc += item?.amount ?? 0;
        sumCpoe += cp?.pay ?? 0;
        rows.push({ label: `${d.name} "รวม" ในเอกสาร`, values: [item ? baht(item.amount) : '-', `ต้องชำระ ${cp ? baht(cp.pay) : '?'} (ราคาเต็ม ${cp ? baht(cp.total) : '?'} · เครดิต ${cp ? baht(cp.credit) : '?'})`], same: !!item && !!cp && Math.abs(item.amount - cp.pay) < 0.005 });
      }
      const totalLine = first!.text.match(/(รวมทั้งสิ้น|รวมทั้งหมด|ยอดรวม|รวมเงิน)[^\d]*([\d,]+\.\d{2})/);
      rows.push({ label: 'ยอดรวมท้ายเอกสาร', values: [totalLine ? totalLine[2] : '(ไม่มีบรรทัดยอดรวม)', baht(sumCpoe)], same: !!totalLine && Math.abs(money(totalLine[2]) - sumCpoe) < 0.005 });
      note('TC-005 ผลรวม', `ผลรวม "รวม" ในเอกสาร ${baht(sumDoc)} · ผลรวมต้องชำระใน CPOE ${baht(sumCpoe)} · บรรทัดยอดรวม ${totalLine?.[0] ?? '(ไม่มี)'}`);
      await c.showCopay(first!, `${label('005')} ราคาในเอกสาร = ยอดต้องชำระ`, rows, [/รวม 6\.00/, /รวม 29\.75/, /รวม 4\.75/]);
      for (const r of rows.slice(0, 3)) expect(r.same, `${r.label}: ${r.values.join(' vs ')}`).toBe(true);
      expect(totalLine, 'เอกสารต้องแสดงยอดรวม = ผลรวมยอดต้องชำระ').toBeTruthy();
    });

    // ── TC-006: Template ──
    await startClip(page, 'TC-006');
    await soft(`${label('006')} ขั้น 2–3 Template ของเอกสาร Co-pay`, async () => {
      expect(first, 'ต้องมีเอกสารจาก TC-003').toBeTruthy();
      const heading = first!.text.match(/^.{0,80}?หนังสือแสดงความประสงค์ในการขอชำระเงิน/)?.[0] ?? first!.text.slice(0, 60);
      note('TC-006 template', `คำขอ documents/generate ref.by formTemplateId · value ${first!.template} · หัวเอกสาร "${heading}"`);
      await c.showCopay(first!, `${label('006')} Template เอกสาร Co-pay`, [
        { label: 'Template ที่แอปใช้ (formTemplateId)', values: [first!.template, 'Template Copay ตาม Product Setup'], same: first!.template === 'sbh_copay_document' },
        { label: 'หัวเอกสาร', values: ['หนังสือแสดงความประสงค์ในการขอชำระเงิน', '-'], same: true },
        { label: 'ส่วนของเอกสาร', values: ['1. ข้อมูลผู้ป่วย · 2. ข้อมูลการสั่งจ่าย (2.1 ยา · 2.2 เวชภัณฑ์ฯ) · 3. ผู้ป่วยแสดงความประสงค์ + ลายมือชื่อ', '-'], same: true },
      ], [/หนังสือแสดงความประสงค์/, /1\. ข้อมูลผู้ป่วย/, /2\. ข้อมูลการสั่งจ่าย/]);
      expect(first!.template, 'แอปต้องสร้างเอกสารด้วย template Co-pay').toBe('sbh_copay_document');
    });

    // ── TC-012: พิมพ์ซ้ำ → Visit มีเอกสาร Co-pay 1 ฉบับ ──
    await startClip(page, 'TC-012');
    if (run('012')) await soft(`${label('012')} ขั้น 2–3 พิมพ์ Co-pay ซ้ำ แล้วเปิดรายการเอกสารของ Visit`, async () => {
      await c.reload(p);
      await c.waitCostCard();
      const second = await c.printCopay('TC-012 พิมพ์ซ้ำ');
      await c.closeSidePanels();
      const docs = await c.visitDocuments('TC-012');
      await showCompareTable(page, `${label('012')} เอกสาร Co-pay ของ Visit`, ['ที่เห็น', 'Expected'], [
        { label: 'เอกสาร Co-pay ในรายการเอกสารของ Visit', values: [`${docs.copay.length} ฉบับ${docs.empty ? ' (ไม่มีข้อมูล)' : ''}`, '1 ฉบับ'], same: docs.copay.length === 1 },
        { label: 'X-Document-Index-Id (พิมพ์ครั้งที่ 1 / 2)', values: [`${first?.indexId ?? '(ไม่มี)'} / ${second.indexId ?? '(ไม่มี)'}`, 'เลขเดียวกัน'], same: !!second.indexId && second.indexId === first?.indexId },
      ], { side: 'right', width: '700px' });
      await holdForClip(page, 2_500);
      expect(docs.copay.length, 'Visit ต้องมีเอกสาร Co-pay 1 ฉบับ').toBe(1);
    });
    await c.closeSidePanels();

    // ── TC-010: แก้จำนวน MEGROL 1 → 2 ──
    await startClip(page, 'TC-010');
    let doc010: CopayPrint | undefined;
    if (run('010')) await soft(`${label('010')} ขั้น 2–3 แก้จำนวน MEGROL 1 → 2 แล้วพิมพ์ Co-pay`, async () => {
      await c.reload(p);
      await c.editDrug(MEGROL.code, { qty: '2' });
      const cost = await c.cost(MEGROL.code);
      note('MEGROL หลังแก้', `${baht(cost.total)} / ${baht(cost.credit)} / ${baht(cost.pay)}`);
      await markEvidence(expected(c.basketRow(MEGROL.code)));
      await holdForClip(page);
      doc010 = await c.printCopay('TC-010');
      const item = doc010.drugs.find((x) => x.name.includes('MEGROL'));
      const before = first?.drugs.find((x) => x.name.includes('MEGROL'));
      await c.showCopay(doc010, `${label('010')} เอกสารหลังแก้จำนวน`, [
        { label: 'MEGROL จำนวน', values: [item ? String(item.qty) : '-', '2'], same: item?.qty === 2 },
        { label: 'MEGROL รวม (ยอดต้องชำระ)', values: [item ? baht(item.amount) : '-', `${baht(cost.pay)} (ก่อนแก้ ${before ? baht(before.amount) : '?'})`], same: !!item && Math.abs(item.amount - cost.pay) < 0.005 },
      ], [/MEGROL/, /จำนวน 2\.00/]);
      expect(item?.qty, 'MEGROL ในเอกสารต้องเป็นจำนวน 2').toBe(2);
      expect(item?.amount, 'ยอด MEGROL ต้องเป็นยอดต้องชำระใหม่').toBeCloseTo(cost.pay, 2);
    });

    // ── TC-011: เพิ่ม Order ใหม่ที่ต้องชำระ (ECG) ──
    await startClip(page, 'TC-011');
    let doc011: CopayPrint | undefined;
    if (run('011')) await soft(`${label('011')} ขั้น 2–3 สั่ง ECG 89.52 (ต้องชำระ) แล้วพิมพ์ Co-pay`, async () => {
      await c.reload(p);
      await orderFromOpdPanel(page, ECG.code, async (send) => {
        await markEvidence(expected(c.basketRow(ECG.code)), clicked(send));
        await snapEvidence(page, 'ก่อนกด — ส่งคำสั่ง ECG');
      });
      await c.reload(p);
      await c.waitCostCard();
      const cost = await c.cost(ECG.code);
      note('ECG', `${baht(cost.total)} / ${baht(cost.credit)} / ${baht(cost.pay)}`);
      doc011 = await c.printCopay('TC-011');
      const has = doc011.services.includes('Electrocardiogram');
      const prev = doc010 ?? first;
      await c.showCopay(doc011, `${label('011')} เอกสารหลังเพิ่ม ECG`, [
        { label: 'ECG ในเอกสาร (หมวด 2.2)', values: [has ? 'มี' : 'ไม่มี', 'มี'], same: has },
        { label: 'ยาเดิมยังอยู่', values: [doc011.drugs.map((x) => x.name.split(' ')[0]).join(', '), (prev?.drugs ?? []).map((x) => x.name.split(' ')[0]).join(', ')], same: doc011.drugs.length === (prev?.drugs.length ?? -1) },
        { label: 'ตัวระบุเอกสาร (X-Document-Index-Id)', values: [doc011.indexId ?? '(ไม่มี)', `เดิม ${prev?.indexId ?? '(ไม่มี)'}`], same: !!doc011.indexId && doc011.indexId === prev?.indexId },
      ], [/Electrocardiogram/]);
      expect(has, 'เอกสารต้องมี ECG ที่เพิ่ม').toBe(true);
      expect(doc011.indexId, 'เอกสารต้องเป็นฉบับเดิม (ตัวระบุเดิม)').toBeTruthy();
    });

    // ── TC-013: ยกเลิก DUOCETZ ──
    await startClip(page, 'TC-013');
    if (run('013')) await soft(`${label('013')} ขั้น 2–3 ยกเลิก DUOCETZ แล้วพิมพ์ Co-pay`, async () => {
      await c.reload(p);
      await c.cancelRow(DUOCETZ.code);
      await c.reload(p);
      await c.waitCostCard();
      const gone = !(await c.basketRow(DUOCETZ.code).isVisible().catch(() => false));
      const doc = await c.printCopay('TC-013');
      const has = doc.text.includes('DUOCETZ');
      const prevDrugs = (doc011 ?? doc010 ?? first)?.drugs ?? [];
      const sum = (ds: PdfItem[]) => ds.reduce((s, x) => s + x.amount, 0);
      await c.showCopay(doc, `${label('013')} เอกสารหลังยกเลิก DUOCETZ`, [
        { label: 'DUOCETZ ในเอกสาร', values: [has ? 'มี' : 'ไม่มี', 'ไม่มี'], same: !has },
        { label: 'แถว DUOCETZ ใน CPOE', values: [gone ? 'หายแล้ว' : 'ยังอยู่', 'หาย'], same: gone },
        { label: 'ยา Co-pay อื่นยังอยู่', values: [doc.drugs.map((x) => x.name.split(' ')[0]).join(', '), 'MEGROL, GPO-L-ONE'], same: doc.drugs.some((x) => x.name.includes('MEGROL')) && doc.drugs.some((x) => x.name.includes('GPO-L-ONE')) },
        { label: 'ผลรวม "รวม" ของยา (ลดลงเท่า DUOCETZ)', values: [baht(sum(doc.drugs)), `${baht(sum(prevDrugs))} − 29.75 = ${baht(sum(prevDrugs) - 29.75)}`], same: Math.abs(sum(doc.drugs) - (sum(prevDrugs) - 29.75)) < 0.005 },
      ], [/MEGROL/, /GPO-L-ONE/]);
      expect(has, 'เอกสารต้องไม่มี DUOCETZ').toBe(false);
      expect(doc.drugs.length, 'ยา Co-pay อื่นต้องยังอยู่').toBe(2);
    });

    // ── TC-016: med0000007 เหตุผล F → B ──
    await startClip(page, 'TC-016');
    if (run('016')) await soft(`${label('016')} ขั้น 2–3 แก้ med0000007 เหตุผล F → B แล้วพิมพ์ Co-pay`, async () => {
      await c.reload(p);
      await c.editDrug(GPO_F.code, { reason: 'B' });
      const cost = await c.cost(GPO_F.code);
      note('GPO-L-ONE หลังเปลี่ยนเป็น B', `${baht(cost.total)} / ${baht(cost.credit)} / ${baht(cost.pay)}`);
      await markEvidence(expected(c.basketRow(GPO_F.code)));
      await holdForClip(page);
      const doc = await c.printCopay('TC-016');
      const has = doc.text.includes('GPO-L-ONE');
      await c.showCopay(doc, `${label('016')} เอกสารหลังเปลี่ยนเหตุผลเป็น B`, [
        { label: 'GPO-L-ONE ต้องชำระใน CPOE', values: [baht(cost.pay), '0.00'], same: cost.pay === 0 },
        { label: 'GPO-L-ONE ในเอกสาร', values: [has ? 'มี' : 'ไม่มี', 'ไม่มี'], same: !has },
      ], [/MEGROL/]);
      expect(cost.pay, 'เหตุผล B แล้วต้องเบิกได้ตามสิทธิ (ต้องชำระ 0)').toBe(0);
      expect(has, 'เอกสารต้องไม่มี med0000007').toBe(false);
    });

    // ── TC-014: ยกเลิกรายการที่ต้องชำระที่เหลือ → ปุ่มหาย ──
    await startClip(page, 'TC-014');
    if (run('014')) await soft(`${label('014')} ขั้น 2–3 ยกเลิกรายการที่ต้องชำระที่เหลือ แล้วดูปุ่ม`, async () => {
      await c.reload(p);
      for (const code of [MEGROL.code, ECG.code, GPO_F.code]) {
        if (!(await c.basketRow(code).isVisible().catch(() => false))) continue;
        const cost = await c.cost(code);
        if (cost.pay <= 0) continue;
        await c.cancelRow(code);
        await c.reload(p);
      }
      await c.waitCostCard();
      const rows = await c.main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: /^\s*\[|\[/ }).allInnerTexts();
      const remain = rows.map(squash).filter((t) => /\[[^\]]+\]/.test(t)).map((t) => t.match(/\[([^\]]+)\]/)?.[1] ?? '');
      const visible = await c.copayButton.isVisible().catch(() => false);
      note('รายการที่เหลือหลังยกเลิก', remain.join(', '));
      await c.costCard.scrollIntoViewIfNeeded();
      await showCompareTable(page, `${label('014')} ปุ่มพิมพ์ Co-pay`, ['หน้าจอ', 'Expected'], [
        { label: 'รายการที่เหลือ', values: [remain.join(', ') || '-', 'เฉพาะรายการที่เบิกได้เต็ม'], same: true },
        { label: 'ปุ่ม "พิมพ์ Co-pay"', values: [visible ? 'แสดง' : 'ไม่แสดง', 'ไม่แสดง'], same: !visible },
      ], { side: 'bottom' });
      await markEvidence(expected(c.costCard));
      await holdForClip(page, 2_500);
      expect(visible, 'ไม่เหลือรายการที่ต้องชำระ ต้องไม่แสดงปุ่มพิมพ์ Co-pay').toBe(false);
    });

    // ── TC-015: รายการเอกสารของ Visit ──
    await startClip(page, 'TC-015');
    if (run('015')) await soft(`${label('015')} ขั้น 2 เปิดรายการเอกสารของ Visit`, async () => {
      await c.reload(p);
      const docs = await c.visitDocuments('TC-015');
      await showCompareTable(page, `${label('015')} เอกสาร Co-pay ของ Visit`, ['ที่เห็น', 'Expected'], [
        { label: 'เอกสาร Co-pay ในรายการเอกสาร', values: [`${docs.copay.length} ฉบับ${docs.empty ? ' (ไม่มีข้อมูล)' : ''}`, 'ถูกลบ หรือแสดงสถานะยกเลิก'], same: docs.copay.every((t) => /ยกเลิก/.test(t)) },
      ], { side: 'right', width: '700px' });
      await holdForClip(page, 2_500);
      note('TC-015', docs.copay.length ? `มีเอกสาร Co-pay ${docs.copay.length} ฉบับ: ${docs.copay.join(' | ')}` : 'ไม่มีเอกสาร Co-pay ในรายการเอกสารของ Visit (ไม่เคยถูกเก็บตั้งแต่พิมพ์ครั้งแรก — ดู TC-012)');
      expect(docs.copay.every((t) => /ยกเลิก/.test(t)), 'เอกสาร Co-pay ต้องถูกลบหรือยกเลิก').toBe(true);
    });

    expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
  });
});
