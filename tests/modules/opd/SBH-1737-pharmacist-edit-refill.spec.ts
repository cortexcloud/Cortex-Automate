import type { Locator } from '@playwright/test';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';
import { notices, recordNotices, waitNotice } from '../../../helpers/functions/notices';
import { dayPlus } from '../../../helpers/functions/dates';

// การ์ด SBH-1737 [Pharmacy][Order Refill] เภสัชต้องสามารถแก้ไข Order/Order Refill ที่หน้าใบยาได้ — EXE SBH-2711 → TS SBH-2712 (HPY) / SBH-2713 (UHP) → TC-SBH-1737-001–015 (SBH-2714–2728)
// 1 เทส = 1 flow (R9) ตามลำดับใน EXE: 001 → 002 → 010 → 003 → 004 → 011 → 005 → 012 → 006 → 007 → 013 → 008 → 014 → 015 → 009 · คลิป 1 ไฟล์ต่อ TC (R61)
// ผู้ป่วย AUTO ใหม่ 1 ราย (ลงทะเบียน + Visit OPD ที่เวชระเบียน R53 → เช็คอิน) ทิ้ง Visit ไว้ (R11) · บัญชี Super_User ทั้งฝั่งแพทย์ (CPOE) และเภสัช (ห้องยาชั้น 1) — ผู้ใช้เลือก 20 ต.ค. 2026 (BR6 master user)
// ยา A = med0000007 GPO-L-ONE 1 เม็ด/วัน 4 สัปดาห์ = 28 → Refill 3 รอบ รอบละ 7 · ยา B = med0000008 CLINDAVID-300 ยาปกติ
// TC ที่ไม่ผ่านไม่หยุดเทส (soft) · ทำต่อกับผู้ป่วยเดิม: SBH1737_P=<HN>,<VN>,<EN> · SBH1737_FROM=<เลข TC> (เริ่มที่ TC นั้นตามลำดับข้างบน)
// รัน dev-x: npx playwright test --headed --grep @SBH-1737 --output=.cache/run-1737

const DRUG_A = { code: 'med0000007', name: 'GPO-L-ONE' };
const DRUG_B = { code: 'med0000008', name: 'CLINDAVID' };
const ORDER = ['001', '002', '010', '003', '004', '011', '005', '012', '006', '007', '013', '008', '014', '015', '009'] as const;
type TcNo = (typeof ORDER)[number];
const ISSUE: Record<TcNo, string> = {
  '001': 'SBH-2714', '002': 'SBH-2715', '003': 'SBH-2716', '004': 'SBH-2717', '005': 'SBH-2718', '006': 'SBH-2719', '007': 'SBH-2720', '008': 'SBH-2721',
  '009': 'SBH-2722', '010': 'SBH-2723', '011': 'SBH-2724', '012': 'SBH-2725', '013': 'SBH-2726', '014': 'SBH-2727', '015': 'SBH-2728',
};
const TC = (n: TcNo) => `TC-${n} (${ISSUE[n]})`;
const ISSUES = ['SBH-1737', 'SBH-2711', 'SBH-2712', 'SBH-2713', ...ORDER.map((n) => ISSUE[n])];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();
/** field ของฟอร์มแก้ไขยาที่ต้องมีทั้งฝั่งแพทย์และเภสัช (AC1) */
const FIELDS: { label: string; text: RegExp; control?: (scope: Locator) => Locator }[] = [
  { label: 'ขนาดยา', text: /^ขนาดยา/, control: (s) => s.getByRole('spinbutton', { name: /^ขนาดยา/ }).first() },
  { label: 'STAT', text: /^STAT$/, control: (s) => s.getByRole('checkbox', { name: 'STAT' }) },
  { label: 'เวลาใช้ยา: ครั้งต่อวัน', text: /^ครั้งต่อวัน$/, control: (s) => s.getByRole('radio', { name: 'ครั้งต่อวัน' }) },
  { label: 'เวลาใช้ยา: มื้ออาหาร', text: /^มื้ออาหาร$/, control: (s) => s.getByRole('radio', { name: 'มื้ออาหาร' }) },
  { label: 'เวลาใช้ยา: เมื่อมีอาการ', text: /^เมื่อมีอาการ$/ },
  { label: 'ระยะเวลาการใช้', text: /^ระยะเวลาการใช้$/, control: (s) => s.getByRole('spinbutton', { name: 'ระยะเวลาการใช้' }) },
  { label: 'จำนวนที่จ่าย', text: /จำนวนที่จ่าย/, control: (s) => s.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ }) },
  { label: 'หน่วยจ่าย', text: /หน่วยจ่าย/ },
  { label: 'ราคาต่อหน่วย', text: /^ราคาต่อหน่วย$/ },
  { label: 'วิธีใช้ภาษาไทย', text: /วิธีใช้ภาษาไทย/, control: (s) => s.getByRole('textbox', { name: /วิธีใช้ภาษาไทย/ }) },
  { label: 'วิธีใช้ภาษาอังกฤษ', text: /^วิธีใช้ภาษาอังกฤษ$/, control: (s) => s.getByRole('textbox', { name: 'วิธีใช้ภาษาอังกฤษ' }) },
  { label: 'วิธีใช้เพิ่มเติม', text: /^วิธีใช้เพิ่มเติม$/, control: (s) => s.locator('#additionalDirectionDescription') },
  { label: 'ประเภทการใช้', text: /^ประเภทการใช้$/, control: (s) => s.getByText('In hospital', { exact: true }) },
  { label: 'หมายเหตุ', text: /^หมายเหตุ$/, control: (s) => s.locator('#remark') },
];

test.describe('SBH-1737 เภสัชแก้ไข Order / Order Refill ที่หน้า Order รอยืนยัน', () => {

  test(
    'ผู้ป่วย AUTO ใหม่ 1 ราย: เภสัชแก้ไขคำสั่งยา + จัดการรอบเติมยา + เปลี่ยนยาปกติเป็น Refill → CPOE อัปเดตตาม · ล็อกหลังสร้างใบยา · แก้ได้อีกหลังย้อนกลับ',
    { tag: ['@SBH-1737', ...ISSUES.slice(1).map((id) => `@${id}`)], annotation: ISSUES.map(linear) },
    async ({ page }) => {
      test.setTimeout(3_600_000);
      const main = page.getByRole('main');
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

      // ── หน้าต่าง "จัดการการเติมยา (Refill)" — ฝั่งแพทย์และเภสัชเป็นตัวเดียวกัน ──
      const refillButton = main.getByRole('button', { name: /^refill/i });
      const dialog = page.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' });
      const confirmButton = dialog.getByRole('button', { name: 'ยืนยัน', exact: true });
      const cancelButton = dialog.getByRole('button', { name: 'ยกเลิก', exact: true });
      const roundHeaders = dialog.getByText(/^เติมยาครั้งที่ \d+$/);
      const drugRowInDialog = (name: string) => dialog.locator('tbody tr').filter({ hasText: name }).first();
      /** ช่องจำนวนของแต่ละรอบ (ยา Refill มีช่อง "จำนวนยาที่จ่ายทั้งหมด" นำหน้า → เอาเฉพาะท้ายสุดเท่าจำนวนรอบ) */
      const roundInputs = async (name: string): Promise<Locator[]> => {
        const rounds = await roundHeaders.count();
        const all = drugRowInDialog(name).locator('input:not([disabled])');
        const n = await all.count();
        return Array.from({ length: n }, (_, i) => all.nth(i)).slice(Math.max(0, n - rounds));
      };
      const dispenseNow = (name: string) => drugRowInDialog(name).locator('input[disabled]').first();
      /** ช่องวันที่ของแต่ละรอบ (ตัวแรกคือ "จ่ายครั้งนี้" ที่ล็อก) */
      const roundDates = () => dialog.locator('.ant-picker input');
      /** อ่านแผนของยา: วันที่ทุกรอบ + จำนวนต่อรอบ + จ่ายครั้งนี้ */
      const readPlan = async (name: string) => {
        const rounds = await roundHeaders.count();
        const dates: string[] = [];
        for (let i = 1; i <= rounds; i++) dates.push(await roundDates().nth(i).inputValue().catch(() => ''));
        const qty = await Promise.all((await roundInputs(name)).map((box) => box.inputValue()));
        const now = await dispenseNow(name).inputValue().catch(() => '');
        return { rounds, dates, qty, now };
      };
      const openRefillDialog = async (tag: string) => {
        await expect(refillButton).toBeVisible({ timeout: 30_000 });
        await markEvidence(clicked(refillButton));
        await snapEvidence(page, `ก่อนกด — ปุ่ม refill (${tag})`);
        await refillButton.click();
        await expect(dialog, 'กดปุ่ม refill แล้วต้องเปิดหน้าต่าง "จัดการการเติมยา (Refill)"').toBeVisible({ timeout: 20_000 });
        await expect(drugRowInDialog(DRUG_A.name)).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(1_500); // ค่าของแผนเดิมเติมตามหลัง
      };
      const saveRefillPlan = async (tag: string) => {
        const before = (await notices(page)).length;
        await markEvidence(clicked(confirmButton));
        await snapEvidence(page, `ก่อนกด — ยืนยันแผน Refill (${tag})`);
        await confirmButton.click();
        const text = await waitNotice(page, before, /refill|เติมยา|กรุณา|ผิดพลาด|Err|failed/i);
        note(`แจ้งเตือนหลังยืนยันแผน (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        // ฝั่งแพทย์: "Create medication refills successfully" · ฝั่งเภสัช: "อัปเดตรอบเติมยาแล้ว"
        expect(text, 'ยืนยันแผนแล้วต้องขึ้นแจ้งเตือนบันทึกแผนเติมยาสำเร็จ').toMatch(/successfully|สำเร็จ|อัปเดตรอบเติมยาแล้ว/i);
        await expect(dialog).toBeHidden({ timeout: 15_000 });
      };
      const closeRefillDialog = async () => {
        if (await dialog.isVisible().catch(() => false)) await cancelButton.click().catch(() => undefined);
        await expect(dialog).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
      };
      /** ตั้งจำนวนของแต่ละรอบ (สร้างรอบใหม่ถ้ายังไม่มี) */
      const fillRounds = async (name: string, values: string[]) => {
        const period = dialog.getByRole('spinbutton').first();
        if ((await roundHeaders.count()) < values.length && !(await period.inputValue())) {
          await period.fill('7'); // ช่องระยะเวลาต่อรอบไม่ถูกจำ — ว่างแล้วกดเพิ่มครั้งไม่เกิดรอบใหม่
          await period.press('Tab');
          await markEvidence(filled(period));
        }
        const add = dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
        for (let i = 0; i < 6 && (await roundHeaders.count()) < values.length; i++) {
          await add.click();
          await page.waitForTimeout(500);
        }
        await expect(roundHeaders, `ต้องมี ${values.length} รอบ`).toHaveCount(values.length, { timeout: 5_000 });
        const inputs = await roundInputs(name);
        for (let i = 0; i < values.length; i++) {
          await inputs[i].fill(values[i]);
          await inputs[i].press('Tab');
        }
        return inputs;
      };
      /** เลือกวันที่ของรอบ i (1 = เติมยาครั้งที่ 1) จากปฏิทิน — พิมพ์เองไม่บันทึก */
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
      /** ตารางเทียบแผนของยากับที่ควรเป็น */
      const comparePlan = async (title: string, plan: Awaited<ReturnType<typeof readPlan>>, want: { dates: string[]; qty: string[]; now?: string }, side = 'bottom' as const) => {
        const rows: CompareRow[] = [{ label: 'จำนวนรอบ', values: [String(want.qty.length), String(plan.rounds)], same: plan.rounds === want.qty.length }];
        want.qty.forEach((q, i) => rows.push({ label: `รอบ ${i + 1}`, values: [`${want.dates[i] ?? '-'} · ${q}`, `${plan.dates[i] ?? '(ไม่มี)'} · ${plan.qty[i] ?? '(ไม่มี)'}`], same: plan.dates[i] === want.dates[i] && plan.qty[i] === q }));
        if (want.now) rows.push({ label: 'จ่ายครั้งนี้', values: [want.now, plan.now], same: plan.now === want.now });
        await showCompareTable(page, title, ['ที่ควรเป็น', 'หน้าต่าง Refill'], rows, { side });
        await holdForClip(page, 2_500);
        await snapEvidence(page, title);
        await hideCompareTable(page);
        for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
      };

      // ── ฝั่งแพทย์ (CPOE) ──
      const basketRow = (code: string) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      const sendButton = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
      const closeLeftPanels = async () => {
        for (const name of ['OPD', 'ประวัติการรักษา']) {
          const tab = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
          if (await tab.count()) await tab.first().locator('.dv-default-tab-action').click().catch(() => undefined);
        }
        await page.mouse.move(700, 1000);
      };
      /** ผู้ป่วยนอก → คลิกชื่อผู้ป่วย → หน้า EMR (CPOE) */
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
      /** ฟอร์มแก้ไขยาของแพทย์ (ดินสอในตะกร้า) — เปิดแล้วอ่าน · ปิดด้วยการโหลดหน้าใหม่ (ห้าม Escape / ปุ่มยกเลิกของแถว) */
      const openCpoeEdit = async (code: string) => {
        const edit = basketRow(code).getByRole('button', { name: 'แก้ไข' });
        await expect(edit).toBeEnabled({ timeout: 15_000 });
        await markEvidence(expected(basketRow(code)), clicked(edit));
        await snapEvidence(page, `ก่อนกด — แก้ไขยา ${code} (CPOE)`);
        await edit.click();
        await expect(main.getByRole('textbox', { name: /^\* วิธีใช้ภาษาไทย/ })).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(1_500);
        await main.getByText('วิธีใช้ภาษาอังกฤษ', { exact: true }).first().click(); // ป๊อปอัปคำย่อบังฟอร์ม → คลิกป้ายให้หลุดโฟกัส
      };
      const reloadEmr = async (p: { vn: string }) => {
        await page.reload();
        await expect(main.getByText(`VN ${p.vn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await page.waitForTimeout(4_000);
        await closeLeftPanels();
      };
      /** tooltip ของไอคอน Refill ในแถวตะกร้า เช่น "7 / 28 · Refill 0 of 3" */
      const refillTooltip = async (code: string) => {
        const icon = basketRow(code).locator('[aria-label="Remed"]').first();
        if (!(await icon.count())) return { icon, text: '' };
        await icon.hover();
        const tip = page.locator('.ant-tooltip:visible, .ant-popover:visible').last();
        await tip.waitFor({ timeout: 5_000 }).catch(() => undefined);
        const text = squash(await tip.innerText().catch(() => ''));
        if (text) await markEvidence(expected(icon), expected(tip));
        await holdForClip(page);
        await page.mouse.move(700, 1000);
        return { icon, text };
      };

      // ── ฝั่งห้องยา ──
      const createButton = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
      const orderRow = (code: string) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      const editDialog = page.getByRole('dialog').filter({ hasText: 'แก้ไขข้อมูลยา' });
      const gotoPharmacy = async () => {
        await page.goto('/cortex/pharmacy/select-location');
        await main.getByRole('combobox').first().click();
        await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
        await page.waitForTimeout(800);
        await main.getByRole('combobox').nth(1).click();
        await page.waitForTimeout(800);
        await page.keyboard.press('Enter'); // ช่องบริการตัวแรก
        await page.getByRole('button', { name: 'ส่ง' }).click();
        await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
      };
      /** Order รอยืนยัน → เปิด Order ของผู้ป่วย (หน้ารับออเดอร์) */
      const openPendingOrder = async (p: { hn: string }) => {
        await gotoPharmacy();
        const row = main.locator('tr.ant-table-row').filter({ hasText: `HN ${p.hn}` }).first();
        await expect(row, `ผู้ป่วย HN ${p.hn} ต้องอยู่แท็บ Order รอยืนยัน`).toBeVisible({ timeout: 60_000 });
        await markEvidence(clicked(row));
        await snapEvidence(page, 'ก่อนกด — Order ของผู้ป่วย (Order รอยืนยัน)');
        await row.locator('td').nth(4).click();
        await expect(createButton).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(2_500);
      };
      /** ดินสอ (แก้ไขข้อมูลยา) ของแถวยา → หน้าต่าง "แก้ไขข้อมูลยา" */
      const openPharmacyEdit = async (code: string, tag: string) => {
        const pencil = orderRow(code).getByRole('button', { name: 'แก้ไขข้อมูลยา' });
        await expect(pencil, 'แถวยาต้องมีปุ่มแก้ไขข้อมูลยา').toBeEnabled({ timeout: 15_000 });
        await markEvidence(expected(orderRow(code)), clicked(pencil));
        await snapEvidence(page, `ก่อนกด — แก้ไขข้อมูลยา ${code} (${tag})`);
        await pencil.click();
        await expect(editDialog, 'กดดินสอแล้วต้องเปิดหน้าต่าง "แก้ไขข้อมูลยา"').toBeVisible({ timeout: 20_000 });
        await expect(editDialog.getByRole('textbox', { name: /วิธีใช้ภาษาไทย/ })).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(1_500); // ฟอร์มเติมค่าเดิมตามหลัง
        await editDialog.getByText('วิธีใช้ภาษาอังกฤษ', { exact: true }).first().click(); // ป๊อปอัปคำย่อบังฟอร์ม
      };
      const closePharmacyEdit = async () => {
        if (await editDialog.isVisible().catch(() => false)) await editDialog.getByRole('button', { name: 'Close' }).click().catch(() => undefined);
        await expect(editDialog).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
      };
      /** มี field นี้ไหม (ป้ายมองเห็น) + แก้ได้ไหม */
      const readFields = async (scope: Locator) => {
        const out: Record<string, string> = {};
        for (const f of FIELDS) {
          const seen = await scope.getByText(f.text).first().isVisible().catch(() => false);
          let editable = '';
          if (f.control) {
            const c = f.control(scope);
            editable = (await c.count()) ? ((await c.isEnabled().catch(() => false)) ? 'แก้ได้' : 'ล็อก') : 'ไม่เจอช่อง';
          }
          out[f.label] = seen ? `มี${editable ? ` · ${editable}` : ''}` : 'ไม่มี';
        }
        return out;
      };
      /** แท็บใบยา (ใบยารอจัด) → คลิกแถวผู้ป่วย → หน้าใบยา */
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

      // ── Pre-condition: ผู้ป่วย AUTO ใหม่ + Visit OPD + เช็คอิน ──
      let [hn, vn, en] = (process.env.SBH1737_P ?? '').split(',');
      if (hn) note('ผู้ป่วย', `ผู้ป่วยเดิม HN ${hn} · ${vn} · EN (OPD) ${en}`);
      else {
        const patient = newTestPatient('Rx1737');
        let newVisitEnabled = false;
        await checkStep(page, 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน', async () => {
          await gotoReception(page);
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
        await checkStep(page, 'Pre-condition เปิด Visit OPD แผนกอายุรกรรม', async () => {
          if (newVisitEnabled) await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          vn = opd.vn;
          en = opd.en;
          note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${hn} · ${vn} · EN (OPD) ${en} · ${opd.clinic} · ${opd.doctor}`);
          console.log(`    ทำต่อกับรายเดิม: SBH1737_P=${hn},${vn},${en}`);
        });
        await checkStep(page, 'Pre-condition เช็คอิน Visit OPD จากรายการผู้ป่วยนอก', async () => {
          await selectOpdUnit(page);
          const row = await opdListRow(page, hn);
          await markEvidence(expected(row.getByText(`HN ${hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
          await snapEvidence(page, 'ก่อนกด — เช็คอิน Visit OPD');
          await checkInFromOpdList(page, row);
          await markEvidence(expected(row));
        });
      }
      const p = { hn, vn, en };
      const from = ORDER.indexOf((process.env.SBH1737_FROM ?? '001') as TcNo);
      const run = (n: TcNo) => ORDER.indexOf(n) >= from;
      const D = [7, 14, 21, 28].map((n) => dayPlus(n));
      // ค่าที่แต่ละ TC จดไว้ให้ TC ถัดไป (ทำต่อกลางทาง: ใช้ค่าตามแผน)
      const v = {
        doctorFields: {} as Record<string, string>,
        pharmacyFields: {} as Record<string, string>,
        bUsage: '', bQty: '8',
        aDates: [D[0].be, D[1].be, D[2].be], aQty: ['7', '7', '7'], aNow: '7',
      };

      // ── TC-001 เภสัชเปิดฟอร์มแก้ไขยา B → field ครบเหมือนแพทย์ ──
      if (run('001')) {
        await startClip(page, 'TC-001');
        const sent = await soft(`${TC('001')} ขั้น 1 CPOE: ยา A Refill 3 รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28) + ยา B ยาปกติ → จด field ฟอร์มแก้ไขยาของแพทย์ → ส่งคำสั่ง`, async () => {
          await openEmr(p);
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
          const inputs = await fillRounds(DRUG_A.name, ['7', '7', '7']);
          await expect(dispenseNow(DRUG_A.name)).toHaveValue('7');
          await markEvidence(...inputs.map(filled), expected(dispenseNow(DRUG_A.name)));
          await holdForClip(page);
          await saveRefillPlan('TC-001');
          await addMedicineToCart(page, DRUG_B.code);
          await expect(basketRow(DRUG_B.code)).toBeVisible({ timeout: 30_000 });
          await openCpoeEdit(DRUG_B.code);
          v.doctorFields = await readFields(main);
          note('ฟอร์มแก้ไขยาของแพทย์ (ยา B)', Object.entries(v.doctorFields).map(([k, x]) => `${k}: ${x}`).join(' · '));
          await markEvidence(expected(main.getByRole('textbox', { name: /^\* วิธีใช้ภาษาไทย/ })), expected(main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ })));
          await holdForClip(page);
          await snapEvidence(page, 'ฟอร์มแก้ไขยาของแพทย์ (ยา B)');
          await reloadEmr(p);
          const before = (await notices(page)).length;
          await markEvidence(clicked(sendButton));
          await snapEvidence(page, 'ก่อนกด — ส่งคำสั่ง');
          await sendButton.click();
          const text = await waitNotice(page, before, /ส่งคำสั่ง/, 60_000);
          note('แจ้งเตือนหลังส่งคำสั่ง', text || '(ไม่เห็น)');
          expect(text, 'ส่งคำสั่งแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/สำเร็จ/);
          await holdForClip(page);
        });
        if (sent) {
          await soft(`${TC('001')} ขั้น 2-4 ห้องยา Order รอยืนยัน → ดินสอแถวยา B → ฟอร์มมี field ครบเท่าแพทย์และแก้ได้`, async () => {
            await openPendingOrder(p);
            await openPharmacyEdit(DRUG_B.code, 'TC-001');
            const pharmacy = await readFields(editDialog);
            v.pharmacyFields = pharmacy;
            note('ฟอร์มแก้ไขยาของเภสัช (ยา B)', Object.entries(pharmacy).map(([k, x]) => `${k}: ${x}`).join(' · '));
            const extra = (await editDialog.getByText('ฉลากช่วย', { exact: true }).count()) ? 'มีเพิ่ม: ฉลากช่วย (ข้อมูลอื่นๆ บนฉลากยา)' : '';
            if (extra) note(`${TC('001')} ฟอร์มของเภสัช`, extra);
            const rows: CompareRow[] = FIELDS.map((f) => ({
              label: f.label,
              values: [v.doctorFields[f.label] ?? '(ไม่ได้จด)', pharmacy[f.label]],
              // AC1: field ใดที่แพทย์แก้ได้ เภสัชต้องแก้ได้ → สถานะของเภสัชต้องเท่าของแพทย์ (ไม่ได้จดของแพทย์ = ต้องมีและแก้ได้)
              same: pharmacy[f.label].startsWith('มี') && (v.doctorFields[f.label] ? v.doctorFields[f.label] === pharmacy[f.label] : !/ล็อก|ไม่เจอช่อง/.test(pharmacy[f.label])),
            }));
            await markEvidence(expected(editDialog.getByRole('spinbutton', { name: /^ขนาดยา/ }).first()), expected(editDialog.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ })), expected(editDialog.getByRole('textbox', { name: /วิธีใช้ภาษาไทย/ })));
            await holdForClip(page);
            await snapEvidence(page, 'ฟอร์มแก้ไขข้อมูลยาของเภสัช (ยา B)');
            await showCompareTable(page, 'field ฟอร์มแก้ไขยา: แพทย์ (CPOE) เทียบเภสัช', ['แพทย์ (CPOE)', 'เภสัช (Order รอยืนยัน)'], rows, { side: 'left', width: '470px' });
            await holdForClip(page, 2_500);
            await snapEvidence(page, 'ตารางเทียบ field แพทย์ - เภสัช');
            await hideCompareTable(page);
            for (const r of rows) expect(r.same, `${r.label}: แพทย์ ${r.values[0]} · เภสัช ${r.values[1]}`).toBe(true);
          });
          await closePharmacyEdit();
        }
      }

      // ── TC-002 เภสัชแก้วิธีใช้ (ขนาดยา 1 → 2) + จำนวนจ่าย (→ 8) ของยา B → บันทึก ──
      if (run('002')) {
        await startClip(page, 'TC-002');
        await soft(`${TC('002')} ขั้น 2-4 เภสัชแก้ขนาดยา B 1 → 2 (วิธีใช้สร้างใหม่) + จำนวนที่จ่าย ${v.bQty} → บันทึก → แถวยา B แสดงค่าใหม่`, async () => {
          if (!(await editDialog.isVisible().catch(() => false))) {
            if (!page.url().includes('pharmacyCreatePrescription')) await openPendingOrder(p);
            await openPharmacyEdit(DRUG_B.code, 'TC-002');
          }
          const usage = editDialog.getByRole('textbox', { name: /วิธีใช้ภาษาไทย/ });
          const before = await usage.inputValue();
          const dose = editDialog.getByRole('spinbutton', { name: /^ขนาดยา/ }).first();
          await dose.focus();
          await dose.fill('2');
          await page.keyboard.press('Tab');
          await expect(dose).toHaveValue('2');
          const qty = editDialog.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
          await qty.fill(v.bQty);
          await qty.press('Tab');
          await expect(qty).toHaveValue(v.bQty);
          await markEvidence(filled(dose), filled(qty));
          await snapEvidence(page, `กรอก — ขนาดยา 2 · จำนวนที่จ่าย ${v.bQty} (TC-002)`);
          const save = editDialog.getByRole('button', { name: /บันทึก$/ }).first();
          const startNotices = (await notices(page)).length;
          await markEvidence(clicked(save));
          await save.click();
          const regen = editDialog.getByRole('button', { name: 'ใช้ข้อความที่สร้างใหม่' });
          if (await regen.waitFor({ timeout: 5_000 }).then(() => true, () => false)) {
            await markEvidence(alerted(regen.locator('xpath=ancestor::*[contains(@class,"ant-alert") and not(contains(@class,"ant-alert-action"))][1]')), clicked(regen));
            await snapEvidence(page, 'แจ้งเตือน — ใช้ข้อความที่สร้างใหม่ (TC-002)');
            await regen.click();
            await expect(usage, 'กด "ใช้ข้อความที่สร้างใหม่" แล้ววิธีใช้ต้องเปลี่ยนตามขนาดยา').not.toHaveValue(before, { timeout: 5_000 });
            v.bUsage = await usage.inputValue();
            await expect(qty).toHaveValue(v.bQty).catch(async () => {
              await qty.fill(v.bQty); // สร้างข้อความใหม่แล้วจำนวนถูกคำนวณทับ → ใส่กลับ
              await qty.press('Tab');
            });
            await markEvidence(filled(usage), filled(qty), clicked(save));
            await snapEvidence(page, 'ก่อนกด — บันทึก (TC-002)');
            await save.click();
          } else v.bUsage = await usage.inputValue();
          const text = await waitNotice(page, startNotices, /สำเร็จ|ผิดพลาด|ไม่สามารถ|failed/i, 20_000);
          note(`${TC('002')} แก้ยา B`, `วิธีใช้ "${before}" → "${v.bUsage}" · จำนวน ${v.bQty} · แจ้งเตือน: ${text || '(ไม่เห็น)'}`);
          expect(text, 'บันทึกแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/สำเร็จ/);
          await expect(editDialog).toBeHidden({ timeout: 15_000 });
          const row = orderRow(DRUG_B.code);
          await expect(row, 'แถวยา B ต้องแสดงวิธีใช้ใหม่').toContainText(v.bUsage, { timeout: 15_000 });
          const qtyShown = await row.locator('input:not([type="checkbox"]):not([role="combobox"])').first().inputValue().catch(() => '(ไม่มีช่องจำนวน)'); // ช่องแรกของแถวคือ checkbox เลือกรายการ
          await markEvidence(expected(row));
          await holdForClip(page);
          await snapEvidence(page, 'หลังบันทึก — แถวยา B (TC-002)');
          expect(qtyShown, `แถวยา B ต้องแสดงจำนวน ${v.bQty}`).toBe(v.bQty);
        });
        await closePharmacyEdit();
      }

      // ── TC-010 CPOE แสดงวิธีใช้และจำนวนจ่ายของยา B ตามที่เภสัชแก้ ──
      if (run('010')) {
        await startClip(page, 'TC-010');
        await soft(`${TC('010')} ขั้น 2-3 CPOE แถวยา B + รายละเอียดคำสั่งยา ตรงกับที่เภสัชแก้`, async () => {
          await openEmr(p);
          const row = basketRow(DRUG_B.code);
          await expect(row).toBeVisible({ timeout: 30_000 });
          const rowText = squash(await row.innerText());
          await openCpoeEdit(DRUG_B.code);
          const usage = await main.getByRole('textbox', { name: /^\* วิธีใช้ภาษาไทย/ }).inputValue();
          const qtyBox = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
          const qty = await qtyBox.inputValue();
          note(`${TC('010')} CPOE ยา B`, `แถว: ${rowText.slice(0, 160)} · ฟอร์ม: ${usage} · จำนวน ${qty}`);
          const rows: CompareRow[] = [
            { label: 'วิธีใช้ (แถวยา)', values: [v.bUsage || '(ไม่ได้จด)', rowText.includes(v.bUsage) ? v.bUsage : rowText.slice(0, 80)], same: !!v.bUsage && rowText.includes(v.bUsage) },
            { label: 'วิธีใช้ (ฟอร์ม)', values: [v.bUsage || '(ไม่ได้จด)', usage], same: usage === v.bUsage },
            { label: 'จำนวนจ่าย (ฟอร์ม)', values: [v.bQty, qty], same: qty === v.bQty },
          ];
          await markEvidence(expected(main.getByRole('textbox', { name: /^\* วิธีใช้ภาษาไทย/ })), expected(qtyBox));
          await showCompareTable(page, 'CPOE ยา B เทียบค่าที่เภสัชแก้ (TC-002)', ['เภสัชแก้', 'CPOE'], rows, { side: 'bottom' });
          await holdForClip(page, 2_500);
          await snapEvidence(page, 'CPOE ยา B หลังเภสัชแก้');
          await hideCompareTable(page);
          await reloadEmr(p);
          for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
        });
      }

      // ── TC-003 เภสัชเปิดหน้าต่าง Refill ของยา A → ตรงกับที่แพทย์ตั้ง ──
      if (run('003')) {
        await startClip(page, 'TC-003');
        await soft(`${TC('003')} ขั้น 2-3 ห้องยา Order รอยืนยัน → ปุ่ม refill → หน้าต่าง "จัดการการเติมยา (Refill)" แสดงรอบ / วันที่ / จำนวนของยา A ตามที่แพทย์ตั้ง`, async () => {
          await openPendingOrder(p);
          await openRefillDialog('TC-003');
          const plan = await readPlan(DRUG_A.name);
          note(`${TC('003')} แผนยา A (เภสัช)`, JSON.stringify(plan));
          await markEvidence(expected(dialog.getByText('จัดการการเติมยา (Refill)')), expected(drugRowInDialog(DRUG_A.name)));
          await comparePlan('แผน Refill ยา A ที่เภสัชเห็น เทียบที่แพทย์ตั้ง', plan, { dates: v.aDates, qty: v.aQty, now: v.aNow });
        });
      }

      // ── TC-004 เภสัชแก้วันที่ (+7 วัน) และจำนวนของเติมยาครั้งที่ 1 ──
      if (run('004')) {
        await startClip(page, 'TC-004');
        await soft(`${TC('004')} ขั้น 2-4 เภสัชเลื่อนวันที่เติมยาครั้งที่ 1 ออกไป 7 วัน + จำนวน 7 → 5 → ยืนยัน → เปิดหน้าต่างอีกครั้ง`, async () => {
          if (!(await dialog.isVisible().catch(() => false))) {
            await openPendingOrder(p);
            await openRefillDialog('TC-004');
          }
          const newDate = D[1].be; // 7 + 7 วัน
          const box = await pickRoundDate(1, newDate);
          const inputs = await roundInputs(DRUG_A.name);
          await inputs[0].fill('5');
          await inputs[0].press('Tab');
          await expect(dispenseNow(DRUG_A.name), 'จ่ายครั้งนี้ = 28 − (5 + 7 + 7) = 9').toHaveValue('9');
          await markEvidence(filled(box), filled(inputs[0]), expected(dispenseNow(DRUG_A.name)));
          await holdForClip(page);
          await saveRefillPlan('TC-004');
          v.aDates = [newDate, D[1].be, D[2].be];
          v.aQty = ['5', '7', '7'];
          v.aNow = '9';
          await openRefillDialog('TC-004 เปิดอีกครั้ง');
          const plan = await readPlan(DRUG_A.name);
          note(`${TC('004')} แผนยา A หลังแก้`, JSON.stringify(plan));
          await markEvidence(expected(roundDates().nth(1)), expected((await roundInputs(DRUG_A.name))[0]));
          await comparePlan('เติมยาครั้งที่ 1 หลังเภสัชแก้', plan, { dates: v.aDates, qty: v.aQty, now: v.aNow });
        });
        await closeRefillDialog();
      }

      // ── TC-011 CPOE หน้าต่าง Refill ของยา A แสดงวันที่ / จำนวนของรอบ 1 ตามที่เภสัชแก้ ──
      if (run('011')) {
        await startClip(page, 'TC-011');
        await soft(`${TC('011')} ขั้น 2-3 CPOE หน้าต่าง Refill ยา A: เติมยาครั้งที่ 1 วันที่ / จำนวนตามที่เภสัชแก้`, async () => {
          await openEmr(p);
          await openRefillDialog('TC-011');
          const plan = await readPlan(DRUG_A.name);
          note(`${TC('011')} แผนยา A (CPOE)`, JSON.stringify(plan));
          await markEvidence(expected(roundDates().nth(1)), expected((await roundInputs(DRUG_A.name))[0]));
          await comparePlan('CPOE: แผน Refill ยา A หลังเภสัชแก้ (TC-004)', plan, { dates: v.aDates, qty: v.aQty, now: v.aNow });
        });
        await closeRefillDialog();
      }

      // ── TC-005 เภสัชแทรกรอบเติมยาเพิ่ม 1 รอบ (รอบ 4) ──
      if (run('005')) {
        await startClip(page, 'TC-005');
        await soft(`${TC('005')} ขั้น 2-4 เภสัชเพิ่มรอบที่ 4 (ระยะ 7 วัน · จำนวน 3) → ยืนยัน → เปิดหน้าต่างอีกครั้ง มี 4 รอบ`, async () => {
          await openPendingOrder(p);
          await openRefillDialog('TC-005');
          const datesBefore = [...v.aDates];
          const inputs = await fillRounds(DRUG_A.name, [...v.aQty, '3']);
          const date4 = await roundDates().nth(4).inputValue();
          await expect(dispenseNow(DRUG_A.name), 'จ่ายครั้งนี้ = 28 − (5 + 7 + 7 + 3) = 6').toHaveValue('6');
          // ข้อสังเกต (dev-x 20 ต.ค. 2026): กรอก "ระยะเวลาต่อรอบ" (ต้องกรอกก่อนกดเพิ่มครั้ง) แล้วระบบคำนวณวันที่ทุกรอบใหม่ — วันที่ที่เภสัชแก้ใน TC-004 หาย
          const datesNow: string[] = [];
          for (let i = 1; i <= 3; i++) datesNow.push(await roundDates().nth(i).inputValue());
          const changed = datesBefore.map((d, i) => (d !== datesNow[i] ? `รอบ ${i + 1}: ${d} → ${datesNow[i]}` : '')).filter(Boolean);
          if (changed.length) {
            note(`${TC('005')} ข้อสังเกต`, `กรอกระยะเวลาต่อรอบ 7 วันแล้ววันที่รอบเดิมถูกคำนวณใหม่ (ไม่มีแจ้งเตือน): ${changed.join(' · ')}`);
            await markEvidence(filled(dialog.getByRole('spinbutton').first()), expected(roundDates().nth(1)));
            await holdForClip(page, 2_000);
            await snapEvidence(page, 'ข้อสังเกต — วันที่รอบ 1 ถูกคำนวณใหม่หลังกรอกระยะเวลา');
          }
          await markEvidence(filled(roundDates().nth(4)), filled(inputs[3]), expected(dispenseNow(DRUG_A.name)));
          await holdForClip(page);
          await saveRefillPlan('TC-005');
          v.aDates = [...datesNow, date4]; // ใช้วันที่ที่บันทึกจริง (TC-005 Expected = มี 4 รอบตามที่แทรก)
          v.aQty = [...v.aQty, '3'];
          v.aNow = '6';
          note(`${TC('005')} รอบที่แทรก`, `เติมยาครั้งที่ 4 ${date4} · จำนวน 3`);
          await openRefillDialog('TC-005 เปิดอีกครั้ง');
          const plan = await readPlan(DRUG_A.name);
          await markEvidence(expected(roundHeaders.last()), expected((await roundInputs(DRUG_A.name))[3]));
          await comparePlan('แผน Refill ยา A หลังแทรกรอบที่ 4', plan, { dates: v.aDates, qty: v.aQty, now: v.aNow });
        });
        await closeRefillDialog();
      }

      // ── TC-012 CPOE แสดงยา A 4 รอบ ──
      if (run('012')) {
        await startClip(page, 'TC-012');
        await soft(`${TC('012')} ขั้น 2-3 CPOE: tooltip Refill ของยา A เป็น 4 รอบ + หน้าต่าง Refill มีรอบที่ 4 ตามที่เภสัชแทรก`, async () => {
          await openEmr(p);
          const tip = await refillTooltip(DRUG_A.code);
          note(`${TC('012')} tooltip ยา A`, `${tip.text || '(ไม่มี)'} · จ่ายครั้งนี้ตามแผนที่เภสัชแก้ = ${v.aNow} / 28`);
          await snapEvidence(page, 'CPOE tooltip Refill ของยา A');
          expect(tip.text, 'tooltip ต้องเป็น "… of 4"').toMatch(/of 4/);
          await openRefillDialog('TC-012');
          const plan = await readPlan(DRUG_A.name);
          await markEvidence(expected(roundHeaders.last()), expected((await roundInputs(DRUG_A.name))[3]));
          await comparePlan('CPOE: แผน Refill ยา A หลังเภสัชแทรกรอบ (TC-005)', plan, { dates: v.aDates, qty: v.aQty, now: v.aNow });
        });
        await closeRefillDialog();
      }

      // ── TC-006 เภสัชลบรอบเติมยาสุดท้าย ──
      if (run('006')) {
        await startClip(page, 'TC-006');
        await soft(`${TC('006')} ขั้น 2-4 เภสัชลบรอบสุดท้าย (ถังขยะ) → ยืนยัน → เปิดหน้าต่างอีกครั้ง เหลือ 3 รอบ`, async () => {
          await openPendingOrder(p);
          await openRefillDialog('TC-006');
          const rounds = await roundHeaders.count();
          const del = dialog.locator('[aria-label="delete"]').last();
          await markEvidence(clicked(del), expected(roundHeaders.last()));
          await snapEvidence(page, `ก่อนกด — ลบเติมยาครั้งที่ ${rounds}`);
          await del.click();
          const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').last();
          if (await pop.isVisible({ timeout: 2_000 }).catch(() => false)) {
            const ok = pop.getByRole('button', { name: /ยืนยัน|ตกลง|ใช่|OK/ }).first();
            await markEvidence(alerted(pop), clicked(ok));
            await snapEvidence(page, 'แจ้งเตือน — ยืนยันการลบรอบ');
            await ok.click();
          }
          await expect(roundHeaders, 'ลบแล้วต้องเหลือ 3 รอบในหน้าต่าง').toHaveCount(rounds - 1, { timeout: 5_000 });
          v.aDates = v.aDates.slice(0, rounds - 1);
          v.aQty = v.aQty.slice(0, rounds - 1);
          v.aNow = '9';
          await expect(dispenseNow(DRUG_A.name), 'จ่ายครั้งนี้กลับเป็น 9').toHaveValue(v.aNow);
          await markEvidence(expected(dispenseNow(DRUG_A.name)));
          await saveRefillPlan('TC-006');
          await openRefillDialog('TC-006 เปิดอีกครั้ง');
          const plan = await readPlan(DRUG_A.name);
          await markEvidence(expected(roundHeaders.last()));
          await comparePlan('แผน Refill ยา A หลังลบรอบสุดท้าย', plan, { dates: v.aDates, qty: v.aQty, now: v.aNow });
        });
        await closeRefillDialog();
      }

      // ── TC-007 เภสัชเปลี่ยนยา B (ยาปกติ) เป็น Order Refill 3 รอบ ──
      if (run('007')) {
        await startClip(page, 'TC-007');
        await soft(`${TC('007')} ขั้น 2-4 เภสัชใส่จำนวนรอบให้ยา B 2 / 2 / 2 (จำนวนจ่าย ${v.bQty} → จ่ายครั้งนี้ 2) → ยืนยัน → ยา B เป็น Refill 3 รอบ`, async () => {
          await openPendingOrder(p);
          const buttonBefore = squash(await refillButton.innerText());
          await openRefillDialog('TC-007');
          await expect(drugRowInDialog(DRUG_B.name), 'หน้าต่าง Refill ต้องมีแถวยา B (ยาปกติ) ให้ตั้งรอบ').toBeVisible();
          const inputs = await roundInputs(DRUG_B.name);
          expect(inputs.length, 'ยา B ต้องมีช่องจำนวนครบ 3 รอบ').toBe(3);
          for (const box of inputs) {
            await box.fill('2');
            await box.press('Tab');
          }
          await expect(dispenseNow(DRUG_B.name), `จ่ายครั้งนี้ของยา B = ${v.bQty} − 6 = 2`).toHaveValue('2');
          await markEvidence(...inputs.map(filled), expected(dispenseNow(DRUG_B.name)));
          await holdForClip(page);
          await saveRefillPlan('TC-007');
          await page.waitForTimeout(2_000);
          const buttonAfter = squash(await refillButton.innerText());
          note(`${TC('007')} ปุ่ม refill`, `${buttonBefore} → ${buttonAfter}`);
          // ส่วน "ยา Refill" ของหน้ารับออเดอร์: ทุกรอบต้องมียา B
          const items = main.locator('.ant-collapse-item').filter({ has: page.locator(':scope > .ant-collapse-header').filter({ hasText: /เติมยาครั้งที่ \d+\/\d+/ }) });
          const found: string[] = [];
          for (let i = 0; i < (await items.count()); i++) {
            const item = items.nth(i);
            if (!((await item.getAttribute('class')) ?? '').includes('ant-collapse-item-active')) {
              await item.locator('.ant-collapse-header').first().click();
              await page.waitForTimeout(1_000);
            }
            const drug = item.locator('tr.ant-table-row').filter({ hasText: `[${DRUG_B.code}]` }).first();
            const title = squash(await item.locator('.ant-collapse-header').first().innerText());
            if (await drug.isVisible().catch(() => false)) {
              found.push(title);
              if (i === 0) await markEvidence(expected(drug));
            }
          }
          const label = await orderRow(DRUG_B.code).getByText(/refill/i).count();
          note(`${TC('007')} ยา B ในส่วนยา Refill`, `${found.join(' · ') || '(ไม่มี)'} · ป้าย Refill ที่แถวยา B: ${label ? 'มี' : 'ไม่มี'}`);
          await markEvidence(expected(refillButton), expected(orderRow(DRUG_B.code)));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'หลังเปลี่ยนยา B เป็น Refill (หน้ารับออเดอร์)');
          expect(buttonAfter, 'ปุ่ม refill ต้องนับยา Refill เพิ่มเป็น 2').toMatch(/\(2\)/);
          expect(found.length, 'ส่วน "ยา Refill" ต้องมียา B ครบ 3 รอบ').toBe(3);
        });
      }

      // ── TC-013 CPOE แสดงยา B เป็น Refill 3 รอบ ──
      if (run('013')) {
        await startClip(page, 'TC-013');
        await soft(`${TC('013')} ขั้น 2-3 CPOE: ยา B มีไอคอน Refill + tooltip "… of 3" + หน้าต่าง Refill ยา B รอบละ 2`, async () => {
          await openEmr(p);
          const tip = await refillTooltip(DRUG_B.code);
          note(`${TC('013')} tooltip ยา B`, `${tip.text || '(ไม่มีไอคอน Refill)'} · จ่ายครั้งนี้ตามแผนที่เภสัชตั้ง = 2 / ${v.bQty}`);
          await snapEvidence(page, 'CPOE ยา B หลังเภสัชเปลี่ยนเป็น Refill');
          expect(tip.text, 'ยา B ต้องมีไอคอน Refill และ tooltip "… of 3"').toMatch(/of 3/);
          await openRefillDialog('TC-013');
          const plan = await readPlan(DRUG_B.name);
          await markEvidence(expected(drugRowInDialog(DRUG_B.name)));
          await comparePlan('CPOE: แผน Refill ยา B ที่เภสัชตั้ง', plan, { dates: v.aDates, qty: ['2', '2', '2'], now: '2' });
        });
        await closeRefillDialog();
      }

      // ── TC-008 สร้างใบยาได้ทันที ไม่ต้องรอแพทย์อนุมัติ ──
      let created = !run('008');
      if (run('008')) {
        await startClip(page, 'TC-008');
        created = await soft(`${TC('008')} ขั้น 2-3 ห้องยา กดสร้างใบยา → สร้างได้ทันที ไม่มีขั้นรอแพทย์อนุมัติ`, async () => {
          await openPendingOrder(p);
          const print = main.getByRole('checkbox', { name: 'Print ฉลากยาอัตโนมัติ' });
          if (await print.isChecked().catch(() => false)) await print.uncheck();
          const before = (await notices(page)).length;
          await markEvidence(clicked(createButton));
          await snapEvidence(page, 'ก่อนกด — สร้างใบยา (TC-008)');
          const res = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/opd/prescriptions'), { timeout: 60_000 });
          await createButton.click();
          const modal = page.locator('.ant-modal:visible').last();
          const popped = await modal.isVisible({ timeout: 3_000 }).catch(() => false);
          const modalText = popped ? squash(await modal.innerText()) : '';
          if (popped) {
            await markEvidence(alerted(modal.locator('.ant-modal-container, .ant-modal-content').first()));
            await snapEvidence(page, 'แจ้งเตือน — หน้าต่างหลังกดสร้างใบยา');
          }
          const response = await res;
          const body = squash(await response.text().catch(() => '')).slice(0, 200);
          const text = await waitNotice(page, before, /.+/, 15_000);
          note(`${TC('008')} สร้างใบยา`, `POST /opd/prescriptions ${response.status()} ${body} · หน้าต่าง: ${modalText || '(ไม่มี)'} · แจ้งเตือน: ${text || '(ไม่มี)'}`);
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'หลังกดสร้างใบยา (TC-008)');
          expect(response.status(), 'สร้างใบยาต้องสำเร็จ').toBeLessThan(300);
          expect(`${modalText} ${text}`, 'ต้องไม่มีขั้นรอ / แจ้งให้แพทย์อนุมัติ').not.toMatch(/อนุมัติ|approve|รอแพทย์/i);
        });
      }

      // ── TC-014 / 015 หลังยืนยัน (สร้างใบยา) แก้ไขคำสั่ง / รอบเติมยาไม่ได้ ──
      if (created && run('014')) {
        await startClip(page, 'TC-014');
        await soft(`${TC('014')} ขั้น 2-3 เปิดใบยา (ใบยารอจัด) → ลองแก้ไขรายละเอียดคำสั่งของยา B → แก้ไม่ได้`, async () => {
          await openPrescription(p);
          const row = orderRow(DRUG_B.code);
          await expect(row).toBeVisible({ timeout: 30_000 });
          const buttons = await row.locator('button').evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label') ?? (e.textContent ?? '').trim()}${(e as HTMLButtonElement).disabled ? '(disabled)' : ''}`));
          note(`${TC('014')} ปุ่มในแถวยา B (หน้าใบยา)`, buttons.join(' · ') || '(ไม่มี)');
          const pencil = row.getByRole('button', { name: 'แก้ไขข้อมูลยา' });
          let verdict = 'ไม่มีปุ่มแก้ไขข้อมูลยา';
          if (await pencil.count()) {
            if (await pencil.isEnabled()) {
              await markEvidence(clicked(pencil));
              await snapEvidence(page, 'ก่อนกด — แก้ไขข้อมูลยา B (หน้าใบยา)');
              await pencil.click();
              await editDialog.waitFor({ timeout: 10_000 }).catch(() => undefined);
              if (await editDialog.isVisible().catch(() => false)) {
                const qty = editDialog.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
                const dose = editDialog.getByRole('spinbutton', { name: /^ขนาดยา/ }).first();
                const locked = !(await qty.isEnabled().catch(() => false)) && !(await dose.isEnabled().catch(() => false));
                verdict = locked ? 'เปิดหน้าต่างได้แต่ช่องล็อก' : 'เปิดหน้าต่างและแก้ได้';
                await markEvidence(expected(dose), expected(qty));
                await holdForClip(page);
                await snapEvidence(page, 'หน้าต่างแก้ไขข้อมูลยา B (หน้าใบยา)');
                await closePharmacyEdit();
              } else verdict = 'กดแล้วไม่เปิดหน้าต่าง';
            } else {
              verdict = 'ปุ่มแก้ไขข้อมูลยา disabled';
              await markEvidence(expected(pencil));
            }
          } else await markEvidence(expected(row));
          note(`${TC('014')} ผล`, verdict);
          await holdForClip(page);
          await snapEvidence(page, `หน้าใบยา แถวยา B — ${verdict}`);
          expect(verdict, 'หลังยืนยันแล้วต้องแก้ไขรายละเอียดคำสั่งยาไม่ได้').not.toBe('เปิดหน้าต่างและแก้ได้');
        });
      }
      if (created && run('015')) {
        await startClip(page, 'TC-015');
        await soft(`${TC('015')} ขั้น 2-3 หน้าใบยา → ลองเปิดหน้าต่าง Refill ของยา A แล้วแก้รอบ → แก้ไม่ได้`, async () => {
          if (!page.url().includes('pharmacyViewPrescription')) await openPrescription(p);
          // หน้าใบยามีปุ่ม "Refill" ในแถวยาแต่ละแถว (ไม่ใช่ปุ่ม refill (n) หัวตาราง) → ใช้ปุ่มของแถวยา A
          const rowRefill = orderRow(DRUG_A.code).getByRole('button', { name: /^refill/i }).first();
          const button = (await rowRefill.count()) ? rowRefill : refillButton.first();
          let verdict = 'ไม่มีปุ่ม refill';
          if (await button.count()) {
            if (await button.isEnabled()) {
              await markEvidence(clicked(button));
              await snapEvidence(page, 'ก่อนกด — ปุ่ม Refill ของยา A (หน้าใบยา)');
              await button.click();
              await dialog.waitFor({ timeout: 10_000 }).catch(() => undefined);
              if (await dialog.isVisible().catch(() => false)) {
                await page.waitForTimeout(1_500);
                const editable = await drugRowInDialog(DRUG_A.name).locator('input:not([disabled])').count();
                const confirmOn = await confirmButton.isEnabled().catch(() => false);
                verdict = editable || confirmOn ? `เปิดหน้าต่างได้ ช่องแก้ได้ ${editable} ช่อง · ปุ่มยืนยัน ${confirmOn ? 'กดได้' : 'กดไม่ได้'}` : 'เปิดหน้าต่างแบบอ่านอย่างเดียว';
                await markEvidence(expected(drugRowInDialog(DRUG_A.name)), expected(confirmButton));
                await holdForClip(page);
                await snapEvidence(page, 'หน้าต่าง Refill (หน้าใบยา)');
                await closeRefillDialog();
              } else verdict = 'กดแล้วไม่เปิดหน้าต่าง';
            } else {
              verdict = 'ปุ่ม refill disabled';
              await markEvidence(expected(button));
            }
          }
          note(`${TC('015')} ผล`, verdict);
          await holdForClip(page);
          await snapEvidence(page, `หน้าใบยา ปุ่ม refill — ${verdict}`);
          expect(verdict, 'หลังยืนยันแล้วต้องแก้ไขรอบเติมยาไม่ได้').not.toMatch(/ช่องแก้ได้ [1-9]|ปุ่มยืนยัน กดได้/);
        });
      }

      // ── TC-009 ย้อนกลับไปก่อนสร้างใบยา → แก้ไขคำสั่ง / รอบเติมยาได้อีกครั้ง ──
      if (created && run('009')) {
        await startClip(page, 'TC-009');
        await soft(`${TC('009')} ขั้น 2-3 หน้าใบยา "ย้อนกลับ ไปแก้ไข" → หน้ารับออเดอร์ → ดินสอยา B แก้ได้ + หน้าต่าง Refill แก้ได้`, async () => {
          if (!page.url().includes('pharmacyViewPrescription')) await openPrescription(p);
          const back = main.getByRole('button', { name: /ย้อนกลับ/ }).first();
          await markEvidence(clicked(back));
          await snapEvidence(page, 'ก่อนกด — ย้อนกลับ');
          await back.click();
          const item = page.locator('.ant-dropdown:visible').getByText(/ย้อนกลับ ไปแก้ไข/).first();
          await expect(item, 'เมนูย้อนกลับต้องมี "ย้อนกลับ ไปแก้ไข"').toBeVisible({ timeout: 10_000 });
          await markEvidence(clicked(item));
          await snapEvidence(page, 'ก่อนกด — ย้อนกลับ ไปแก้ไข');
          await item.click();
          const confirm = page.locator('.ant-modal:visible, .ant-popover:visible').last();
          if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
            const ok = confirm.getByRole('button', { name: /ยืนยัน|ตกลง|OK/ }).first();
            if (await ok.count()) {
              await markEvidence(alerted(confirm), clicked(ok));
              await snapEvidence(page, 'แจ้งเตือน — ยืนยันย้อนกลับ');
              await ok.click();
            }
          }
          await page.waitForURL(/pharmacyCreatePrescription/, { timeout: 60_000 });
          await expect(createButton).toBeVisible({ timeout: 60_000 });
          await page.waitForTimeout(2_500);
          await markEvidence(expected(createButton));
          await snapEvidence(page, 'หลังย้อนกลับ — หน้ารับออเดอร์');
          await openPharmacyEdit(DRUG_B.code, 'TC-009');
          const fields = await readFields(editDialog);
          // เทียบกับสถานะของฟอร์มก่อนสร้างใบยา (TC-001) — ช่อง "ครั้งต่อวัน" ล็อกอยู่แล้วทั้งฟอร์มของแพทย์และเภสัช
          const baseline = Object.keys(v.pharmacyFields).length ? v.pharmacyFields : { 'เวลาใช้ยา: ครั้งต่อวัน': 'มี · ล็อก' } as Record<string, string>;
          const locked = Object.entries(fields).filter(([k, x]) => x.includes('ล็อก') && !(baseline[k] ?? '').includes('ล็อก')).map(([k]) => k);
          note(`${TC('009')} ฟอร์มยา B หลังย้อนกลับ`, Object.entries(fields).map(([k, x]) => `${k}: ${x}`).join(' · '));
          await markEvidence(expected(editDialog.getByRole('spinbutton', { name: /^ขนาดยา/ }).first()), expected(editDialog.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ })));
          await holdForClip(page);
          await snapEvidence(page, 'หลังย้อนกลับ — หน้าต่างแก้ไขข้อมูลยา B');
          await closePharmacyEdit();
          await openRefillDialog('TC-009');
          const editable = await drugRowInDialog(DRUG_A.name).locator('input:not([disabled])').count();
          const confirmOn = await confirmButton.isEnabled();
          await markEvidence(expected(drugRowInDialog(DRUG_A.name)), expected(confirmButton));
          await holdForClip(page);
          await snapEvidence(page, 'หลังย้อนกลับ — หน้าต่าง Refill');
          await closeRefillDialog();
          note(`${TC('009')} ผล`, `ฟอร์มยา B ช่องที่ล็อก: ${locked.join(', ') || '(ไม่มี)'} · หน้าต่าง Refill ช่องแก้ได้ ${editable} · ปุ่มยืนยัน ${confirmOn ? 'กดได้' : 'กดไม่ได้'}`);
          expect(locked, 'ฟอร์มแก้ไขยาต้องแก้ได้ทุกช่องอีกครั้ง').toEqual([]);
          expect(editable, 'หน้าต่าง Refill ต้องแก้รอบได้อีกครั้ง').toBeGreaterThan(0);
          expect(confirmOn, 'ปุ่มยืนยันของหน้าต่าง Refill ต้องกดได้').toBe(true);
        });
      }

      note('ผลรวม', failures.length ? `ไม่ผ่าน / ตรวจไม่ได้ ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
