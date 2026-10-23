import type { Locator, Response } from '@playwright/test';
import { gotoCashierAccount, payAllInCash } from '../../../helpers/functions/cashier';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { saveWithRegeneratedUsage, setDose } from '../../../helpers/functions/cpoe-usage';
import { startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';
import { notices, recordNotices, waitNotice } from '../../../helpers/functions/notices';
import { dayPlus } from '../../../helpers/functions/dates';

// การ์ด SBH-2127 [CPOE][Pharmacy] Sync Order Refill (CPOE) กับ Task เติมยา (Pharmacy) — EXE SBH-2769 → TS SBH-2770 (HPY) / SBH-2771 (UHP) → TC-SBH-2127-001–009 (SBH-2772–2780)
// 1 เทส = 1 flow (R9) ตามลำดับใน EXE · ผู้ป่วย AUTO ใหม่ 4 ราย (ลงทะเบียน + Visit OPD ที่เวชระเบียน R53 → เช็คอิน · เตรียมทั้งหมดก่อนคลิป TC-001) ทิ้ง Visit ไว้ (R11)
// บัญชีเดียว Super_User ทำทั้งฝั่งแพทย์ (CPOE) และเภสัช (ห้องยาชั้น 1) — dev-x ไม่มีบัญชีเภสัช · คลิป 1 ไฟล์ต่อ TC (R61)
// คนไข้ 1: ยา A = med0000007 GPO-L-ONE 1 เม็ด/วัน 4 สัปดาห์ = 28 → Refill 3 รอบ รอบละ 7 → TC-002 แก้ไขยาหลายช่อง (ขนาดยา 1 → 2 = วิธีกินใหม่ · วิธีใช้เพิ่มเติม · หมายเหตุ) →
//   TC-003 จำนวนยาที่จ่ายทั้งหมด 28 → 35 รอบละ 8 → TC-004 เพิ่มรอบ 4 → TC-005 ลบรอบ 4 · ขั้นเพิ่มของ TC-006 / 007 (ผู้ใช้สั่ง 19 ต.ค. 2026): เพิ่มยา C / D เข้าแผนเดิมแล้วยกเลิก → ตรวจทีละรอบว่าไม่มียาที่ยกเลิก (ยังมี A)
//   แผน Refill ของ Visit เดียวกันใช้คอลัมน์รอบร่วมกัน → ยา C / D ใส่จำนวนในรอบ 1–2 และ 0 ในรอบ 3 · Task เติมยา 1 แถว = 1 รอบ มีรายการยาหลายตัว → "Task ของยา X" = รอบที่มียา X (API + ไอคอน (i))
// คนไข้ 3: ยา C = med0000006 UTO LINCOMYCIN เป็นยา Refill ตัวเดียว (TC-006 แพทย์ยกเลิกที่ CPOE) · คนไข้ 4: ยา D = med0000005 BETAMED ตัวเดียว (TC-007 เภสัชยกเลิกที่หน้ารับออเดอร์) → Task ทุกรอบต้องถูกยกเลิก
// คนไข้ 2: ยา E = med0000005 BETAMED 28 → Refill 3 รอบ รอบละ 7 · TC-009 รับชำระ + จ่ายยาจริง (ผู้ใช้อนุญาต 19 ต.ค. 2026 เฉพาะผู้ป่วย AUTO)
// รายละเอียดของ Task (วิธีกิน / วิธีใช้เพิ่มเติม / จำนวนต่อรอบ): แท็บ Order เติมยาไม่มีคอลัมน์นี้ → อ่านจากหน้ารับออเดอร์ (Order รอยืนยัน) ส่วน "ยา Refill" กางทีละรอบ · หมายเหตุถึงพยาบาลห้องยาไม่แสดง
// TC ที่ไม่ผ่านไม่หยุดเทส (soft) · ทำต่อกับผู้ป่วยเดิม: SBH2127_P1..P4=<HN>,<VN>,<EN> · SBH2127_FROM=<n> (เริ่มที่ TC-00n) · SBH2127_ORDERED=C3,C1,D4,D1,E (ยาที่สั่งแล้ว ข้ามขั้นสั่ง)
// รัน dev-x: npx playwright test --headed --grep @SBH-2127 --output=.cache/run-2127

const DRUG_A = { code: 'med0000007', name: 'GPO-L-ONE' };
const DRUG_C = { code: 'med0000006', name: 'UTO LINCOMYCIN' };
const DRUG_D = { code: 'med0000005', name: 'BETAMED' };
const DRUG_E = { code: 'med0000005', name: 'BETAMED' };
const TC = {
  '001': 'TC-001 (SBH-2772)', '002': 'TC-002 (SBH-2773)', '003': 'TC-003 (SBH-2774)', '004': 'TC-004 (SBH-2775)', '005': 'TC-005 (SBH-2776)',
  '006': 'TC-006 (SBH-2777)', '007': 'TC-007 (SBH-2778)', '008': 'TC-008 (SBH-2779)', '009': 'TC-009 (SBH-2780)',
} as const;
const ISSUES = ['SBH-2127', 'SBH-2769', 'SBH-2770', 'SBH-2771', 'SBH-2772', 'SBH-2773', 'SBH-2774', 'SBH-2775', 'SBH-2776', 'SBH-2777', 'SBH-2778', 'SBH-2779', 'SBH-2780'];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();
const isGraphql = (r: Response, op: string) => r.request().method() === 'POST' && r.url().includes('/graphql') && (r.request().postData() ?? '').includes(op);
const STATUS: Record<string, string> = { PENDING: 'ยังไม่เติม', IN_PROGRESS: 'กำลังเติมยา', COMPLETED: 'เติมยาแล้ว', CANCELLED: 'ยกเลิกแล้ว' };

/** Task เติมยาจาก API `medication-refill-with-detail` */
interface RefillTask { id: number; iteration: number; sourceCount: number; sourceVn: string; scheduledRefillDate: string; latestStatusCode: string; medications: { productCode: string; name: string }[] }
const taskDate = (t: RefillTask) => {
  const d = new Date(t.scheduledRefillDate);
  const local = new Date(d.getTime() + 7 * 3_600_000); // เวลาไทย
  return `${String(local.getUTCDate()).padStart(2, '0')}/${String(local.getUTCMonth() + 1).padStart(2, '0')}/${local.getUTCFullYear() + 543}`;
};
const hasDrug = (t: RefillTask, code: string) => t.medications.some((m) => m.productCode === code);

test.describe('SBH-2127 Sync Order Refill กับ Task เติมยา', () => {

  test(
    'ผู้ป่วย AUTO ใหม่ 2 ราย: สร้าง / แก้ไข / ลบ Order Refill ที่ CPOE + ลบยาที่หน้ารับออเดอร์ → Task เติมยา sync ตาม · Task ที่กำลังเติม / เติมแล้วไม่ถูกทับ',
    { tag: ['@SBH-2127', ...ISSUES.slice(1).map((id) => `@${id}`)], annotation: ISSUES.map(linear) },
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
      const skip = (title: string, why: string) => {
        failures.push(`${title} — ตรวจไม่ได้ (${why})`);
        note('ตรวจไม่ได้', `${title} — ${why}`);
      };
      await page.addInitScript(recordNotices);

      // ── ตัวช่วยฝั่ง CPOE ──
      const refillButton = main.getByRole('button', { name: /^refill/i });
      const dialog = page.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' });
      const confirmButton = dialog.getByRole('button', { name: 'ยืนยัน', exact: true });
      const cancelButton = dialog.getByRole('button', { name: 'ยกเลิก', exact: true });
      const roundHeaders = dialog.getByText(/^เติมยาครั้งที่ \d+$/);
      const drugRowInDialog = (name: string) => dialog.locator('tbody tr').filter({ hasText: name }).first();
      /** ช่องจำนวนของแต่ละรอบ (ยาที่มีแผนแล้วมีช่อง "จำนวนยาที่จ่ายทั้งหมด" นำหน้า → เอาเฉพาะท้ายสุดเท่าจำนวนรอบ) */
      const roundInputs = async (name: string): Promise<Locator[]> => {
        const rounds = await roundHeaders.count();
        const all = drugRowInDialog(name).locator('input:not([disabled])');
        const n = await all.count();
        return Array.from({ length: n }, (_, i) => all.nth(i)).slice(Math.max(0, n - rounds));
      };
      const dispenseNow = (name: string) => drugRowInDialog(name).locator('input[disabled]').first();
      const basketRow = (code: string) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      const editButton = (code: string) => basketRow(code).getByRole('button', { name: 'แก้ไข' });
      const usageBox = main.getByRole('textbox', { name: /^\* วิธีใช้ภาษาไทย/ });
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
      const openRefillDialog = async (name: string) => {
        await expect(refillButton).toBeVisible({ timeout: 30_000 });
        await markEvidence(clicked(refillButton));
        await snapEvidence(page, 'ก่อนกด — ปุ่ม refill');
        await refillButton.click();
        await expect(dialog, 'กดปุ่ม refill แล้วต้องเปิดหน้าต่าง "จัดการการเติมยา (Refill)"').toBeVisible({ timeout: 20_000 });
        await expect(drugRowInDialog(name)).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(1_200); // ค่าของแผนเดิมเติมตามหลัง
      };
      const saveRefillPlan = async (tag: string) => {
        const before = (await notices(page)).length;
        await markEvidence(clicked(confirmButton));
        await snapEvidence(page, `ก่อนกด — ยืนยันแผน Refill (${tag})`);
        await confirmButton.click();
        const text = await waitNotice(page, before, /refill|เติมยา|กรุณา|ผิดพลาด|Err/i);
        note(`แจ้งเตือนหลังยืนยันแผน (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        expect(text, 'ยืนยันแผนแล้วต้องขึ้นแจ้งเตือนสร้างแผนเติมยาสำเร็จ').toMatch(/successfully|สำเร็จ/i);
        await expect(dialog).toBeHidden({ timeout: 15_000 });
      };
      /** เพิ่มยาลงตะกร้า (ยอดรวม total · ระยะเวลา weeks สัปดาห์ถ้าระบุ) */
      const addDrug = async (drug: { code: string; name: string }, total: string, weeks?: string) => {
        await addMedicineToCart(page, drug.code, async () => {
          if (weeks) {
            const period = main.getByRole('spinbutton', { name: 'ระยะเวลาการใช้' });
            await period.fill(weeks);
            await period.press('Tab');
          }
          const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
          await qty.fill(total);
          await qty.press('Tab');
          await expect(qty).toHaveValue(total);
          await markEvidence(filled(qty));
          await snapEvidence(page, `กรอก — ยา ${drug.code} ยอดรวม ${total}`);
        });
        await expect(basketRow(drug.code)).toBeVisible({ timeout: 30_000 });
      };
      /** ตั้งจำนวนของแต่ละรอบให้ยา (สร้างรอบใหม่ถ้ายังไม่มี) → ตรวจจ่ายครั้งนี้ */
      const fillRounds = async (drug: { name: string }, values: string[], now: string) => {
        // ช่องระยะเวลาต่อรอบไม่ถูกจำ (เปิดหน้าต่างซ้ำว่าง) → ว่างแล้วกดเพิ่มครั้งไม่เกิดรอบใหม่ → เติม 7 วันก่อนเพิ่มรอบ
        const period = dialog.getByRole('spinbutton').first();
        if ((await roundHeaders.count()) < values.length && !(await period.inputValue())) {
          await period.fill('7');
          await period.press('Tab');
          await markEvidence(filled(period));
        }
        const add = dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
        for (let i = 0; i < 6 && (await roundHeaders.count()) < values.length; i++) {
          await add.click();
          await page.waitForTimeout(500);
        }
        await expect(roundHeaders, `ต้องมี ${values.length} รอบ`).toHaveCount(values.length, { timeout: 5_000 });
        const inputs = await roundInputs(drug.name);
        for (let i = 0; i < values.length; i++) {
          await inputs[i].fill(values[i]);
          await inputs[i].press('Tab');
        }
        await expect(dispenseNow(drug.name), `จ่ายครั้งนี้ของ ${drug.name} ต้องเป็น ${now}`).toHaveValue(now);
        await markEvidence(...inputs.map(filled), expected(dispenseNow(drug.name)));
        await holdForClip(page);
      };
      const sendOrders = async (tag: string) => {
        const before = (await notices(page)).length;
        await markEvidence(clicked(sendButton));
        await snapEvidence(page, `ก่อนกด — ส่งคำสั่ง (${tag})`);
        await sendButton.click();
        const text = await waitNotice(page, before, /ส่งคำสั่ง/, 60_000);
        note(`แจ้งเตือนหลังส่งคำสั่ง (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        expect(text, 'ส่งคำสั่งแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/สำเร็จ/);
        await holdForClip(page);
      };
      /**
       * แก้ไขยา (ดินสอ) หลายช่อง: ขนาดยา → วิธีกินสร้างใหม่ · วิธีใช้เพิ่มเติม · หมายเหตุถึงพยาบาล → บันทึก
       * → กล่องเตือน "ตรวจสอบข้อความวิธีใช้…" กด "ใช้ข้อความที่สร้างใหม่" → บันทึก (saveWithRegeneratedUsage) → แถวยาแสดงวิธีกินใหม่ + วิธีใช้เพิ่มเติม
       */
      const editDrugDetails = async (code: string, tag: string, dose: string) => {
        const edit = editButton(code);
        await expect(edit, 'ปุ่มแก้ไขของแถวยาต้องกดได้').toBeEnabled({ timeout: 10_000 });
        await markEvidence(expected(basketRow(code)), clicked(edit));
        await snapEvidence(page, `ก่อนกด — แก้ไขยา ${code} (${tag})`);
        await edit.click();
        await expect(usageBox).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(1_500); // ฟอร์มเติมค่าเดิมตามหลัง
        await page.keyboard.press('Escape'); // ป๊อปอัปคำย่อของช่องวิธีการใช้บังฟอร์ม
        const before = { usage: await usageBox.inputValue() };
        const doseBox = await setDose(page, dose);
        const extraBox = main.locator('#additionalDirectionDescription');
        const remarkBox = main.locator('#remark');
        const extra = `วิธีใช้เพิ่มเติม ${tag}`;
        const remark = `หมายเหตุ ${tag}`;
        await extraBox.fill(extra);
        await remarkBox.fill(remark);
        await markEvidence(filled(doseBox), filled(extraBox), filled(remarkBox));
        await snapEvidence(page, `กรอก — ขนาดยา ${dose} · วิธีใช้เพิ่มเติม · หมายเหตุ (${tag})`);
        const startNotices = (await notices(page)).length;
        const usage = await saveWithRegeneratedUsage(page, async (box, button) => {
          await markEvidence(alerted(box), clicked(button));
          await snapEvidence(page, `แจ้งเตือน — ใช้ข้อความที่สร้างใหม่ (${tag})`);
        });
        const toastText = await waitNotice(page, startNotices, /สำเร็จ|ผิดพลาด|ไม่สามารถ/, 20_000);
        note(`แก้ไขยา ${code} (${tag})`, `วิธีกิน "${before.usage}" → "${usage}" · ${extra} · ${remark} · แจ้งเตือน: ${toastText || '(ไม่เห็น)'}`);
        expect(toastText, 'บันทึกแก้ไขแล้วต้องสำเร็จ').toMatch(/สำเร็จ/);
        expect(usage, 'วิธีกินต้องเปลี่ยนตามขนาดยาใหม่').not.toBe(before.usage);
        await expect(basketRow(code), 'แถวยาต้องแสดงวิธีกินใหม่').toContainText(usage, { timeout: 15_000 });
        await expect(basketRow(code), 'แถวยาต้องแสดงวิธีใช้เพิ่มเติม').toContainText(extra);
        await markEvidence(expected(basketRow(code)));
        await holdForClip(page);
        return { usage, extra, remark };
      };
      /** หน้าต่าง Refill: แก้ "จำนวนยาที่จ่ายทั้งหมด" → กล่องยืนยัน (ล้างจำนวนรอบที่ยังไม่จ่ายเป็น 0) → ยืนยัน */
      const changeTotal = async (drug: { name: string }, total: string) => {
        const box = drugRowInDialog(drug.name).locator('input:not([disabled])').first(); // ช่องแรกที่แก้ได้ = จำนวนยาที่จ่ายทั้งหมด (ตามด้วยช่องของแต่ละรอบ)
        await box.fill(total);
        await box.press('Tab');
        const confirm = page.locator('.ant-modal:visible').filter({ hasText: 'ยืนยันการเปลี่ยนจำนวนยาที่จ่ายทั้งหมด' }).last();
        await expect(confirm, 'แก้จำนวนยาที่จ่ายทั้งหมดแล้วต้องถามยืนยัน').toBeVisible({ timeout: 10_000 });
        const ok = confirm.getByRole('button', { name: 'ยืนยัน' });
        await markEvidence(filled(box), alerted(confirm.locator('.ant-modal-container, .ant-modal-content').first()), clicked(ok));
        await snapEvidence(page, `แจ้งเตือน — ยืนยันการเปลี่ยนจำนวนยาที่จ่ายทั้งหมด (${total})`);
        await ok.click();
        await expect(confirm).toBeHidden({ timeout: 10_000 });
        await expect(box).toHaveValue(total);
      };
      /** CPOE: ปุ่ม ยกเลิก ของแถวยา → "ยกเลิกรายการนี้?" ยืนยัน → โหลดหน้าใหม่ → แถวยาต้องหาย */
      const cancelInCpoe = async (p: { hn: string; vn: string }, drug: { code: string }, tag: string) => {
        await openEmr(p);
        const row = basketRow(drug.code);
        await expect(row).toBeVisible({ timeout: 60_000 });
        const cancel = row.getByRole('button', { name: 'ยกเลิก' });
        await markEvidence(expected(row), clicked(cancel));
        await snapEvidence(page, `ก่อนกด — ยกเลิก Order ยา ${drug.code} (${tag})`);
        await cancel.click();
        const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').last();
        await expect(pop, 'กดยกเลิกแล้วต้องถามยืนยัน').toBeVisible({ timeout: 10_000 });
        const ok = pop.getByRole('button', { name: 'ยืนยัน' });
        await markEvidence(alerted(pop), clicked(ok));
        await snapEvidence(page, `แจ้งเตือน — ยกเลิกรายการนี้? (${tag})`);
        const before = (await notices(page)).length;
        const gql = page.waitForResponse((r) => r.url().includes('/graphql') && r.request().method() === 'POST' && /mutation/i.test(r.request().postData() ?? ''), { timeout: 15_000 }).catch(() => undefined);
        await ok.click();
        const res = await gql;
        const body = res ? squash(await res.text().catch(() => '')).slice(0, 400) : '(ไม่มีคำขอ)';
        const op = (res?.request().postData() ?? '').match(/"operationName":"(\w+)"/)?.[1] ?? '';
        const text = await waitNotice(page, before, /.+/, 6_000);
        note(`ยกเลิก Order ยา ${drug.code} ที่ CPOE (${tag})`, `${op} → ${body} · แจ้งเตือน: ${text || '(ไม่มี)'}`);
        await page.waitForTimeout(2_000);
        await page.reload();
        await expect(main.getByText(`VN ${p.vn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await page.waitForTimeout(4_000);
        await closeLeftPanels();
        const still = await basketRow(drug.code).isVisible().catch(() => false);
        if (still) await markEvidence(expected(basketRow(drug.code)));
        await holdForClip(page, 2_000);
        await snapEvidence(page, `หลังยกเลิก Order ยา ${drug.code} (โหลดหน้าใหม่ · ${tag})`);
        expect(still, `ยกเลิก Order ยา ${drug.code} ไม่สำเร็จ — แถวยายังอยู่ (${op}: ${body.slice(0, 200)})`).toBe(false);
      };
      /** ห้องยา: Order รอยืนยัน → หน้ารับออเดอร์ → "ยกเลิกรายการยา" ของยา → ยืนยัน → แถวยาต้องหาย */
      const cancelAtPharmacy = async (p: { hn: string }, drug: { code: string }, tag: string) => {
        await openPendingOrder(p);
        const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${drug.code}]` }).first();
        await expect(row).toBeVisible({ timeout: 30_000 });
        const del = row.getByRole('button', { name: 'ยกเลิกรายการยา' });
        await markEvidence(expected(row), clicked(del));
        await snapEvidence(page, `ก่อนกด — ยกเลิกรายการยา ${drug.code} (${tag})`);
        await del.click();
        const confirm = page.locator('.ant-modal:visible').filter({ hasText: 'ยืนยันการยกเลิกรายการยา' }).last();
        await expect(confirm).toBeVisible({ timeout: 10_000 });
        const ok = confirm.getByRole('button', { name: 'ยืนยัน' });
        await markEvidence(alerted(confirm.locator('.ant-modal-container, .ant-modal-content').first()), clicked(ok));
        await snapEvidence(page, `แจ้งเตือน — ยืนยันการยกเลิกรายการยา (${tag})`);
        const res = page.waitForResponse((r) => isGraphql(r, 'cancelOpdMedicationRequest') || isGraphql(r, 'CancelOpdMedicationRequest'), { timeout: 20_000 }).catch(() => undefined);
        await ok.click();
        const response = await res;
        note(`ยกเลิกรายการยา ${drug.code} ที่หน้ารับออเดอร์ (${tag})`, response ? squash(await response.text().catch(() => '')).slice(0, 300) : '(ไม่เห็นคำขอ)');
        await expect(row, 'ยกเลิกแล้วแถวยาต้องหายจากหน้ารับออเดอร์').toBeHidden({ timeout: 15_000 });
        await holdForClip(page, 1_500);
        await snapEvidence(page, `หลังยกเลิกรายการยา ${drug.code} (${tag})`);
      };
      /** ยกเลิกยา Refill ตัวเดียวของ Visit → Task ทุกรอบต้องถูกยกเลิก (หรือไม่มียานั้นเหลือ) */
      const checkAllCancelled = async (p: { hn: string; vn: string }, drug: { code: string; name: string }, title: string) => {
        const tasks = await refillTasks(p, title);
        const rows: CompareRow[] = tasks.length
          ? tasks.map((t) => ({
              label: `รอบ ${t.iteration}/${t.sourceCount} ${taskDate(t)}`,
              values: [`ยกเลิกแล้ว (ไม่มี ${drug.name})`, `${STATUS[t.latestStatusCode] ?? t.latestStatusCode} · ${t.medications.map((m) => m.productCode).join(', ') || '-'}`],
              same: t.latestStatusCode === 'CANCELLED' || !hasDrug(t, drug.code),
            }))
          : [{ label: 'Task ของ Visit', values: ['ไม่มี / ยกเลิกแล้วทั้งหมด', '(ไม่มี Task)'], same: true }];
        await compareTasks(title, rows);
      };
      /** ยกเลิกบางรายการ: Task ทุกรอบที่ยังไม่ยกเลิกต้องไม่มียา drug และยังมียา keep (API + ไอคอน (i) แต่ละแถว) */
      const checkPartial = async (p: { hn: string; vn: string }, drug: { code: string; name: string }, keep: { code: string; name: string }, title: string) => {
        const tasks = (await refillTasks(p, title)).filter((t) => t.latestStatusCode !== 'CANCELLED');
        // ไอคอน (i) "แสดงรายการยาทั้งหมด" ของแต่ละแถว → รายชื่อยาในรอบนั้น (หลักฐานบนจอ)
        const popup: Record<string, string> = {};
        const rows = main.locator('tr.ant-table-row').filter({ hasText: `HN ${p.hn}` });
        for (let i = 0; i < (await rows.count()); i++) {
          const row = rows.nth(i);
          const round = (await row.innerText()).split(/[\n\t]/).map((s) => s.trim()).find((s) => /^\d+\/\d+$/.test(s)) ?? `แถว ${i + 1}`;
          const icon = row.getByRole('img', { name: 'แสดงรายการยาทั้งหมด' });
          if (!(await icon.count())) continue;
          await icon.hover();
          const tip = page.locator('.ant-popover:visible, .ant-tooltip:visible').last();
          await tip.waitFor({ timeout: 3_000 }).catch(() => undefined);
          popup[round] = squash(await tip.innerText().catch(() => ''));
          if (i === 0) {
            await markEvidence(expected(tip));
            await snapEvidence(page, `${title} — รายการยาในรอบ ${round} (ไอคอน i)`);
          }
          await page.mouse.move(700, 900);
          await page.waitForTimeout(300);
        }
        note(`${title} — รายการยาจากไอคอน (i)`, Object.entries(popup).map(([k, v]) => `${k}: ${v}`).join(' || ') || '(ไม่มี)');
        await compareTasks(title, tasks.map((t) => {
          const key = `${t.iteration}/${t.sourceCount}`;
          const shown = popup[key] ?? '';
          return {
            label: `รอบ ${key} ${taskDate(t)}`,
            values: [`มี ${keep.name} · ไม่มี ${drug.name}`, `${t.medications.map((m) => m.productCode).join(', ')}${shown ? ` (i: ${shown.slice(0, 70)})` : ''}`],
            same: !hasDrug(t, drug.code) && hasDrug(t, keep.code) && !shown.includes(drug.name),
          };
        }));
      };
      /** หน้ารับออเดอร์ ส่วนยา Refill: ทุกรอบต้องไม่มียา drug */
      const checkPartialOrderPage = async (p: { hn: string }, drug: { code: string; name: string }, keep: { code: string }, title: string) => {
        await openPendingOrder(p);
        const gone = await readOrderRounds(drug.code);
        const kept = await readOrderRounds(keep.code);
        await showCompareTable(page, title, ['ที่ควรเป็น', 'หน้ารับออเดอร์ (ยา Refill)'], gone.map((r, i) => ({
          label: r.title.replace(/ยังไม่ถึงวันนัดเติมยา/, '').trim(),
          values: [`ไม่มี ${drug.name}`, `${r.found ? `มี ${drug.name}` : `ไม่มี ${drug.name}`}${kept[i]?.found ? ' · มียาเดิม' : ''}`],
          same: !r.found,
        })), { side: 'bottom' });
        await holdForClip(page, 2_500);
        await snapEvidence(page, title);
        for (const r of gone) expect(r.found, `${r.title}: ยังมียา ${drug.name}`).toBe(false);
      };
      /** CPOE ผู้ป่วย p: เพิ่มยา → แผน Refill รอบละ rounds → ยืนยัน → ส่งคำสั่ง */
      const orderRefill = async (p: { hn: string; vn: string }, drug: { code: string; name: string }, total: string, rounds: string[], now: string, tag: string, weeks?: string) => {
        await openEmr(p);
        await addDrug(drug, total, weeks);
        await openRefillDialog(drug.name);
        await fillRounds(drug, rounds, now);
        await saveRefillPlan(tag);
        await sendOrders(tag);
      };

      // ── ตัวช่วยฝั่งห้องยา ──
      const createButton = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
      const gotoPharmacy = async () => {
        await page.goto('/cortex/pharmacy/select-location');
        await main.getByRole('combobox').first().click();
        await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
        await page.waitForTimeout(800);
        await main.getByRole('combobox').nth(1).click();
        await page.waitForTimeout(800);
        await page.keyboard.press('Enter'); // ช่องบริการตัวแรก (dev-x มี 5 / 4)
        await page.getByRole('button', { name: 'ส่ง' }).click();
        await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
      };
      /** แท็บ Order เติมยา → สถานะทั้งหมด · วันที่สิ้นสุด +60 วัน · ค้น HN → Task ของ Visit นี้ (API) + แถวบนจอ */
      const refillTasks = async (p: { hn: string; vn: string }, tag: string): Promise<RefillTask[]> => {
        await gotoPharmacy();
        await page.getByRole('tab', { name: /Order เติมยา/ }).click();
        const end = main.getByRole('textbox', { name: 'วันที่สิ้นสุด' });
        await expect(end).toBeVisible({ timeout: 30_000 });
        const statusSelect = main.locator('.ant-select').filter({ hasText: /ยังไม่เติม|ทั้งหมด/ }).first();
        // เอาสถานะที่เลือกไว้ออก → ระบบใส่ chip "ทั้งหมด" ให้เอง (อย่าเอาตัวนั้นออก)
        const removeChip = statusSelect.locator('.ant-select-selection-item').filter({ hasNotText: 'ทั้งหมด' }).locator('.ant-select-selection-item-remove');
        for (let i = 0; i < 5 && (await removeChip.count()); i++) {
          await removeChip.first().click();
          await page.waitForTimeout(800);
        }
        await end.click();
        await end.fill(dayPlus(60).iso);
        await end.press('Enter');
        await page.waitForTimeout(1_000);
        const search = main.getByRole('textbox', { name: /ค้นหา VN, HN/ });
        const res = page.waitForResponse((r) => r.url().includes('medication-refill-with-detail') && decodeURIComponent(r.url()).includes(`[hn][contains]=${p.hn}`), { timeout: 30_000 });
        await search.fill(p.hn);
        await search.press('Enter');
        const body = (await (await res).json()) as { data?: RefillTask[] };
        await page.waitForTimeout(1_500);
        const tasks = (body.data ?? []).filter((t) => t.sourceVn === p.vn).sort((a, b) => a.iteration - b.iteration);
        const rows = main.locator('tr.ant-table-row').filter({ hasText: `HN ${p.hn}` });
        note(`Task เติมยา (${tag})`, tasks.map((t) => `${t.iteration}/${t.sourceCount} ${taskDate(t)} ${STATUS[t.latestStatusCode] ?? t.latestStatusCode} [${t.medications.map((m) => m.productCode).join(', ')}]`).join(' · ') || '(ไม่มี)');
        if (await rows.count()) await markEvidence(expected(rows.first()), ...(await rows.count()) > 1 ? [expected(rows.last())] : []);
        else await markEvidence(expected(main.locator('.ant-table-placeholder').first()));
        await holdForClip(page);
        return tasks;
      };
      /** ตารางเทียบ Task (API) กับที่ควรเป็น → แสดงบนจอแล้วคืนแถว */
      const compareTasks = async (title: string, rows: CompareRow[]) => {
        await showCompareTable(page, title, ['ที่ควรเป็น', 'Task เติมยา'], rows, { side: 'bottom' });
        await holdForClip(page, 2_500);
        await snapEvidence(page, title);
        for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
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
        await page.waitForTimeout(2_000);
      };
      /** หน้ารับออเดอร์ ส่วน "ยา Refill": กางทุกรอบ → วิธีใช้ / จำนวนของยา code ในแต่ละรอบ */
      const readOrderRounds = async (code: string) => {
        const items = main.locator('.ant-collapse-item').filter({ has: page.locator(':scope > .ant-collapse-header').filter({ hasText: /เติมยาครั้งที่ \d+\/\d+/ }) });
        const out: { title: string; usage: string; qty: string; found: boolean; text: string }[] = [];
        for (let i = 0; i < (await items.count()); i++) {
          const item = items.nth(i);
          if (!((await item.getAttribute('class')) ?? '').includes('ant-collapse-item-active')) {
            await item.locator('.ant-collapse-header').first().click();
            await page.waitForTimeout(1_000);
          }
          const title = squash(await item.locator('.ant-collapse-header').first().innerText());
          const drug = item.locator('tr.ant-table-row').filter({ hasText: `[${code}]` }).first();
          const lines = (await drug.innerText().catch(() => '')).split(/[\n\t]/).map((s) => s.trim()).filter(Boolean);
          const k = lines.findIndex((l) => l.includes(`[${code}]`));
          const qty = k >= 0 ? lines.slice(k + 2).find((l) => /^\d+$/.test(l)) ?? (await drug.locator('input').first().inputValue().catch(() => '')) : '';
          out.push({ title, usage: k >= 0 ? lines[k + 1] ?? '' : '', qty, found: k >= 0, text: lines.join(' ') });
          if (k >= 0) await markEvidence(expected(drug));
        }
        note(`หน้ารับออเดอร์ — ยา Refill ${code}`, out.map((r) => `${r.title}: ${r.found ? `${r.usage} · จำนวน ${r.qty}` : '(ไม่มียานี้)'}`).join(' || ') || '(ไม่มีรอบ)');
        await holdForClip(page);
        return out;
      };
      /** แท็บใบยา (ใบยารอจัด / ใบยาจัดแล้ว / ใบรอจ่าย) → คลิกแถวผู้ป่วย → หน้าใบยา */
      const openPrescriptionTab = async (p: { hn: string }, tab: RegExp) => {
        await gotoPharmacy();
        await page.getByRole('tab', { name: tab }).click();
        await page.waitForTimeout(2_500);
        const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: p.hn }).first();
        await expect(row, `ใบยาของ HN ${p.hn} ต้องอยู่แท็บ ${tab.source}`).toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(page.getByRole('tab', { name: tab })), clicked(row));
        await snapEvidence(page, `ก่อนกด — ใบยาในแท็บ ${tab.source}`);
        await row.locator('td').nth(3).click();
        await page.waitForURL(/preset=pharmacyViewPrescription/, { timeout: 60_000 });
        await page.waitForTimeout(2_500);
      };

      // ── Pre-condition: ผู้ป่วย AUTO ใหม่ + Visit OPD + เช็คอิน ──
      const prepare = async (envName: string, prefix: string, label: string) => {
        let [hn, vn, en] = (process.env[envName] ?? '').split(',');
        if (hn) {
          note(label, `ผู้ป่วยเดิม HN ${hn} · ${vn} · EN (OPD) ${en}`);
          return { hn, vn, en };
        }
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
          hn = await saveNewPatient(page);
          newVisitEnabled = await expectPatientInfo(page);
        });
        await checkStep(page, `Pre-condition ${label} เปิด Visit OPD แผนกอายุรกรรม`, async () => {
          if (newVisitEnabled) await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          vn = opd.vn;
          en = opd.en;
          note(label, `${patient.firstName} ${patient.familyName} · HN ${hn} · ${vn} · EN (OPD) ${en} · ${opd.clinic} · ${opd.doctor}`);
          console.log(`    ทำต่อกับรายเดิม: ${envName}=${hn},${vn},${en}`);
        });
        await checkStep(page, `Pre-condition ${label} เช็คอิน Visit OPD จากรายการผู้ป่วยนอก`, async () => {
          await selectOpdUnit(page);
          const row = await opdListRow(page, hn);
          await markEvidence(expected(row.getByText(`HN ${hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
          await snapEvidence(page, `ก่อนกด — เช็คอิน Visit OPD (${label})`);
          await checkInFromOpdList(page, row);
          await markEvidence(expected(row));
        });
        return { hn, vn, en };
      };

      const from = Number(process.env.SBH2127_FROM ?? '1'); // ทำต่อจาก TC ที่ระบุ (ผู้ป่วยเดิม · TC ก่อนหน้าทำไปแล้ว)
      // ทำต่อ: ยาที่สั่ง + ส่งคำสั่งไปแล้ว → ข้ามขั้นสั่งยา · C3 = ยา C คนไข้ 3 · C1 = ยา C คนไข้ 1 · D4 · D1 · E = ยา E คนไข้ 2
      const ordered = (process.env.SBH2127_ORDERED ?? '').split(',');
      const none = { hn: '', vn: '', en: '' };
      // ผู้ป่วยทั้งหมดเตรียมก่อนเริ่มคลิป TC-001 (ภาพลงทะเบียนอยู่ใน video.webm ไม่ปนคลิปของ TC)
      const p1 = from <= 7 ? await prepare('SBH2127_P1', 'Sync2127A', 'คนไข้ 1') : none;
      const p3 = from <= 6 ? await prepare('SBH2127_P3', 'Sync2127C', 'คนไข้ 3') : none;
      const p4 = from <= 7 ? await prepare('SBH2127_P4', 'Sync2127D', 'คนไข้ 4') : none;
      const p2 = await prepare('SBH2127_P2', 'Sync2127B', 'คนไข้ 2');
      const days = [7, 14, 21, 28].map((n) => dayPlus(n).th);
      let sent = from > 1;
      let usageA = { usage: '', extra: '', remark: '' };

      // ── TC-001 สร้าง Order Refill → Task ครบตามรอบ ──
      if (from <= 1) {
        await startClip(page, 'TC-001');
        const planned = await soft(`${TC['001']} ขั้น 1-2 CPOE คนไข้ 1: สั่งยา A Refill 3 รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28) → ยืนยันแผน`, async () => {
          await openEmr(p1);
          await addDrug(DRUG_A, '28', '4');
          await openRefillDialog(DRUG_A.name);
          await fillRounds(DRUG_A, ['7', '7', '7'], '7');
          await saveRefillPlan('TC-001');
        });
        if (planned) {
          // ข้อสังเกต BR1: Task ควรเกิดหลังส่งคำสั่ง — ดูห้องยาก่อนส่ง
          await soft(`${TC['001']} ข้อสังเกต Task เติมยาก่อนกดส่งคำสั่ง (BR1 — สร้างเมื่อส่งคำสั่งแล้ว)`, async () => {
            const before = await refillTasks(p1, 'ก่อนส่งคำสั่ง');
            await snapEvidence(page, 'ข้อสังเกต — Task เติมยาก่อนส่งคำสั่ง');
            note(`${TC['001']} ข้อสังเกต`, before.length ? `Task เกิดแล้ว ${before.length} รอบตั้งแต่ยืนยันแผน ขณะออเดอร์ยังไม่ส่ง (ขัด BR1)` : 'ยังไม่มี Task ก่อนส่งคำสั่ง (ตาม BR1)');
          });
          sent = await soft(`${TC['001']} ขั้น 2 ส่งคำสั่ง`, async () => {
            await openEmr(p1);
            await expect(basketRow(DRUG_A.code)).toBeVisible({ timeout: 60_000 });
            await sendOrders('TC-001');
          });
        } else skip(`${TC['001']} ขั้น 2-3`, 'สั่งยา Refill ไม่สำเร็จ');
        if (sent) {
          await soft(`${TC['001']} ขั้น 3 ห้องยา แท็บ Order เติมยา → Task ยา A สถานะ "ยังไม่เติม" ครบ 3 รอบ วันที่ตรง`, async () => {
            const tasks = (await refillTasks(p1, 'TC-001')).filter((t) => hasDrug(t, DRUG_A.code));
            await compareTasks('Task เติมยาของยา A หลังส่งคำสั่ง', [
              { label: 'จำนวน Task', values: ['3', String(tasks.length)], same: tasks.length === 3 },
              ...[0, 1, 2].map((i) => ({
                label: `รอบ ${i + 1}/3`,
                values: [`${days[i]} ยังไม่เติม`, tasks[i] ? `${taskDate(tasks[i])} ${STATUS[tasks[i].latestStatusCode] ?? tasks[i].latestStatusCode}` : '(ไม่มี)'],
                same: !!tasks[i] && taskDate(tasks[i]) === days[i] && tasks[i].latestStatusCode === 'PENDING' && tasks[i].iteration === i + 1,
              })),
            ]);
          });
          await hideCompareTable(page);
          await soft(`${TC['001']} ขั้น 3 จำนวนจ่ายแต่ละรอบของ Task ยา A = 7 (หน้ารับออเดอร์ ส่วนยา Refill)`, async () => {
            await openPendingOrder(p1);
            const rounds = await readOrderRounds(DRUG_A.code);
            await compareTasks('จำนวนจ่ายแต่ละรอบของยา A (ห้องยา)', [0, 1, 2].map((i) => ({ label: `รอบ ${i + 1}/3`, values: ['7', rounds[i]?.qty || '(ไม่มี)'], same: rounds[i]?.qty === '7' })));
          });
          await hideCompareTable(page);
        } else skip(`${TC['001']} ขั้น 3`, 'ส่งคำสั่งไม่สำเร็จ');
      }

      // ── TC-002 แก้รายละเอียดยา A (ขนาดยา → วิธีกิน · วิธีใช้เพิ่มเติม · หมายเหตุ) → Task อัปเดต ไม่สร้างซ้ำ ──
      if (from <= 2) {
        await startClip(page, 'TC-002');
        if (sent) {
          const edited = await soft(`${TC['002']} ขั้น 2 CPOE แก้ไขยา A: ขนาดยา 1 → 2 (วิธีกินสร้างใหม่) + วิธีใช้เพิ่มเติม + หมายเหตุ → บันทึก`, async () => {
            await openEmr(p1);
            await expect(basketRow(DRUG_A.code)).toBeVisible({ timeout: 60_000 });
            usageA = await editDrugDetails(DRUG_A.code, 'TC-002', '2');
          });
          if (edited) {
            await soft(`${TC['002']} ขั้น 3 Task ยา A ยังมี 3 รอบ (ไม่สร้างซ้ำ)`, async () => {
              const tasks = (await refillTasks(p1, 'TC-002')).filter((t) => hasDrug(t, DRUG_A.code));
              const iters = tasks.map((t) => t.iteration).join(', ');
              await compareTasks('Task ยา A หลังแก้ไขยา', [
                { label: 'จำนวน Task', values: ['3', String(tasks.length)], same: tasks.length === 3 },
                { label: 'รอบ', values: ['1, 2, 3', iters], same: iters === '1, 2, 3' },
              ]);
            });
            await hideCompareTable(page);
            await soft(`${TC['002']} ขั้น 3 Task ยา A ทุกรอบแสดงวิธีกินใหม่ + วิธีใช้เพิ่มเติม (หน้ารับออเดอร์ ส่วนยา Refill)`, async () => {
              await openPendingOrder(p1);
              const rounds = await readOrderRounds(DRUG_A.code);
              note(`${TC['002']} หมายเหตุถึงพยาบาล`, `"${usageA.remark}" — ห้องยาไม่แสดงช่องนี้ทั้งแถวยาครั้งนี้และรอบเติมยา จึงตรวจใน Task ไม่ได้`);
              await compareTasks('วิธีกิน / วิธีใช้เพิ่มเติมของยา A ในแต่ละรอบ (ห้องยา)', [0, 1, 2].flatMap((i) => [
                { label: `รอบ ${i + 1}/3 วิธีกิน`, values: [usageA.usage, rounds[i]?.usage || '(ไม่มี)'], same: rounds[i]?.usage === usageA.usage },
                { label: `รอบ ${i + 1}/3 วิธีใช้เพิ่มเติม`, values: [usageA.extra, rounds[i]?.text.includes(usageA.extra) ? usageA.extra : '(ไม่มี)'], same: !!rounds[i]?.text.includes(usageA.extra) },
              ]));
            });
            await hideCompareTable(page);
          } else skip(`${TC['002']} ขั้น 3`, 'แก้ไขยาไม่สำเร็จ');
        } else skip(TC['002'], 'TC-001 ส่งคำสั่งไม่สำเร็จ');
      }

      // ── TC-003 แก้จำนวนยาของยา A (หน้าต่าง Refill: ยอดรวม 28 → 35 · รอบละ 8 · จ่ายครั้งนี้ 11) ──
      if (from <= 3) {
        await startClip(page, 'TC-003');
        if (sent) {
          const edited = await soft(`${TC['003']} ขั้น 2 CPOE หน้าต่าง Refill แก้จำนวนยาที่จ่ายทั้งหมด 28 → 35 · รอบละ 8 (จ่ายครั้งนี้ 11) → ยืนยัน`, async () => {
            await openEmr(p1);
            await openRefillDialog(DRUG_A.name);
            note(`${TC['003']} วิธีแก้`, 'ช่องจำนวนในหน้าแก้ไขยาล็อกสำหรับยา Refill (SBH-841 TC-014) → แก้ "จำนวนยาที่จ่ายทั้งหมด" และจำนวนของแต่ละรอบในหน้าต่าง Refill');
            await changeTotal(DRUG_A, '35');
            await fillRounds(DRUG_A, ['8', '8', '8'], '11');
            await saveRefillPlan('TC-003');
            await page.waitForTimeout(2_000);
            note(`${TC['003']} แถวยา A ใน CPOE หลังแก้`, squash(await basketRow(DRUG_A.code).innerText().catch(() => '')).slice(0, 200));
          });
          if (edited) {
            await soft(`${TC['003']} ขั้น 3 Task ยา A ยังมี 3 รอบ (ไม่สร้างซ้ำ)`, async () => {
              const tasks = (await refillTasks(p1, 'TC-003')).filter((t) => hasDrug(t, DRUG_A.code));
              const iters = tasks.map((t) => t.iteration).join(', ');
              await compareTasks('Task ยา A หลังแก้จำนวน', [
                { label: 'จำนวน Task', values: ['3', String(tasks.length)], same: tasks.length === 3 },
                { label: 'รอบ', values: ['1, 2, 3', iters], same: iters === '1, 2, 3' },
              ]);
            });
            await hideCompareTable(page);
            await soft(`${TC['003']} ขั้น 3 Task ยา A แสดงจำนวนใหม่ 8 ทุกรอบ (หน้ารับออเดอร์ ส่วนยา Refill)`, async () => {
              await openPendingOrder(p1);
              const rounds = await readOrderRounds(DRUG_A.code);
              await compareTasks('จำนวนจ่ายแต่ละรอบของยา A หลังแก้ (ห้องยา)', [0, 1, 2].map((i) => ({ label: `รอบ ${i + 1}/3`, values: ['8', rounds[i]?.qty || '(ไม่มี)'], same: rounds[i]?.qty === '8' })));
            });
            await hideCompareTable(page);
          } else skip(`${TC['003']} ขั้น 3`, 'แก้จำนวนไม่สำเร็จ');
        } else skip(TC['003'], 'TC-001 ส่งคำสั่งไม่สำเร็จ');
      }

      // ── TC-004 เพิ่มรอบ Refill เป็น 4 รอบ ──
      if (from <= 4) {
        await startClip(page, 'TC-004');
        if (sent) {
          const edited = await soft(`${TC['004']} ขั้น 2 CPOE หน้าต่าง Refill เพิ่มรอบที่ 4 (จำนวน 3 · จ่ายครั้งนี้ 8) → ยืนยัน`, async () => {
            await openEmr(p1);
            await openRefillDialog(DRUG_A.name);
            await markEvidence(clicked(dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first()));
            await snapEvidence(page, 'ก่อนกด — เพิ่มครั้ง');
            await fillRounds(DRUG_A, ['8', '8', '8', '3'], '8');
            await expect(roundHeaders).toHaveCount(4);
            await saveRefillPlan('TC-004');
          });
          if (edited) {
            await soft(`${TC['004']} ขั้น 3 Task ยา A มีครบ 4 รอบ รอบเดิมไม่ซ้ำ`, async () => {
              const tasks = (await refillTasks(p1, 'TC-004')).filter((t) => hasDrug(t, DRUG_A.code));
              const iters = tasks.map((t) => t.iteration).join(', ');
              const ids = new Set(tasks.map((t) => t.iteration));
              await compareTasks('Task ยา A หลังเพิ่มรอบที่ 4', [
                { label: 'จำนวน Task', values: ['4', String(tasks.length)], same: tasks.length === 4 },
                { label: 'รอบ', values: ['1, 2, 3, 4', iters], same: iters === '1, 2, 3, 4' && ids.size === tasks.length },
                { label: 'รอบที่ 4', values: [`${days[3]} ยังไม่เติม`, tasks[3] ? `${taskDate(tasks[3])} ${STATUS[tasks[3].latestStatusCode] ?? tasks[3].latestStatusCode}` : '(ไม่มี)'], same: !!tasks[3] && taskDate(tasks[3]) === days[3] && tasks[3].latestStatusCode === 'PENDING' },
              ]);
            });
            await hideCompareTable(page);
          } else skip(`${TC['004']} ขั้น 3`, 'เพิ่มรอบไม่สำเร็จ');
        } else skip(TC['004'], 'TC-001 ส่งคำสั่งไม่สำเร็จ');
      }

      // ── TC-005 ลบรอบสุดท้าย เหลือ 3 รอบ ──
      if (from <= 5) {
        await startClip(page, 'TC-005');
        if (sent) {
          const edited = await soft(`${TC['005']} ขั้น 2 CPOE หน้าต่าง Refill ลบรอบที่ 4 (ปุ่มถังขยะ) เหลือ 3 รอบ → ยืนยัน`, async () => {
            await openEmr(p1);
            await openRefillDialog(DRUG_A.name);
            await expect(roundHeaders).toHaveCount(4);
            // ปุ่มถังขยะอยู่ที่หัวของแต่ละรอบเรียงตามลำดับ → ตัวสุดท้าย = รอบที่ 4
            const trash = dialog.locator('[aria-label="delete"]').last();
            await markEvidence(clicked(trash));
            await snapEvidence(page, 'ก่อนกด — ลบรอบที่ 4');
            await trash.click();
            const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').last();
            if (await pop.waitFor({ timeout: 2_000 }).then(() => true, () => false)) await pop.getByRole('button', { name: /^(ยืนยัน|ตกลง|ใช่|OK)$/ }).first().click();
            await expect(roundHeaders, 'ลบแล้วต้องเหลือ 3 รอบ').toHaveCount(3, { timeout: 10_000 });
            await expect(dispenseNow(DRUG_A.name), 'จ่ายครั้งนี้ = 35 − 24 = 11').toHaveValue('11');
            await markEvidence(expected(roundHeaders.last()), expected(dispenseNow(DRUG_A.name)));
            await holdForClip(page);
            await saveRefillPlan('TC-005');
          });
          if (edited) {
            await soft(`${TC['005']} ขั้น 3 Task รอบที่ 4 หายไป เหลือ Task ยา A 3 รอบ (แสดง /3)`, async () => {
              const all = await refillTasks(p1, 'TC-005');
              const withA = all.filter((t) => hasDrug(t, DRUG_A.code));
              const r4 = all.filter((t) => t.iteration === 4);
              await compareTasks('Task ยา A หลังลบรอบที่ 4', [
                { label: 'Task รอบที่ 4', values: ['(ไม่มี)', r4.map((t) => `${STATUS[t.latestStatusCode] ?? t.latestStatusCode} · ${t.medications.length ? t.medications.map((m) => m.productCode).join(', ') : 'ไม่มียา'}`).join(' / ') || '(ไม่มี)'], same: r4.length === 0 },
                { label: 'จำนวน Task ยา A', values: ['3', String(withA.length)], same: withA.length === 3 },
                { label: 'รอบที่แสดง', values: ['1/3, 2/3, 3/3', withA.map((t) => `${t.iteration}/${t.sourceCount}`).join(', ')], same: withA.map((t) => `${t.iteration}/${t.sourceCount}`).join(', ') === '1/3, 2/3, 3/3' },
              ]);
            });
            await hideCompareTable(page);
          } else skip(`${TC['005']} ขั้น 3`, 'ลบรอบไม่สำเร็จ');
        } else skip(TC['005'], 'TC-001 ส่งคำสั่งไม่สำเร็จ');
      }

      // ── TC-006 แพทย์ลบ Order Refill ที่ CPOE ──
      //   ก) คนไข้ 3 ยา C เป็นยา Refill ตัวเดียว → Task ทุกรอบต้องถูกยกเลิก · ข) คนไข้ 1 แผนมียา A + C → ยกเลิก C → ทุกรอบต้องไม่มี C (ยังมี A)
      if (from <= 6) {
        await startClip(page, 'TC-006');
        const cSent3 = ordered.includes('C3') || await soft(`${TC['006']} ขั้น 1 CPOE คนไข้ 3: สั่งยา C เป็นยา Refill ตัวเดียว 2 รอบ (ยอด 21 · รอบละ 7 · จ่ายครั้งนี้ 7) → ส่งคำสั่ง`, async () => {
          await orderRefill(p3, DRUG_C, '21', ['7', '7'], '7', 'TC-006 คนไข้ 3');
        });
        if (cSent3) {
          await soft(`${TC['006']} ขั้น 2 ห้องยา แท็บ Order เติมยา มี Task ของยา C 2 รอบ (คนไข้ 3)`, async () => {
            const withC = (await refillTasks(p3, 'TC-006 คนไข้ 3 ก่อนลบ')).filter((t) => hasDrug(t, DRUG_C.code));
            await compareTasks('Task ของยา C ก่อนลบ Order (คนไข้ 3)', [{ label: 'รอบที่มียา C', values: ['1, 2', withC.map((t) => t.iteration).join(', ') || '(ไม่มี)'], same: withC.map((t) => t.iteration).join(', ') === '1, 2' }]);
          });
          await hideCompareTable(page);
          await soft(`${TC['006']} ขั้น 3 CPOE ลบ (ยกเลิก) Order ยา C ของคนไข้ 3`, async () => {
            await cancelInCpoe(p3, DRUG_C, 'คนไข้ 3');
          });
          await soft(`${TC['006']} ขั้น 4 Task เติมยาทุกรอบของคนไข้ 3 ต้องถูกยกเลิกทั้งหมด`, async () => {
            await checkAllCancelled(p3, DRUG_C, 'Task ทุกรอบหลังลบยา C (ยา Refill ตัวเดียว · คนไข้ 3)');
          });
          await hideCompareTable(page);
        } else skip(`${TC['006']} ขั้น 2-4 (คนไข้ 3)`, 'สั่งยา C ไม่สำเร็จ');
        // ข) ยกเลิกบางรายการ
        const cSent1 = sent && (ordered.includes('C1') || await soft(`${TC['006']} ขั้นเพิ่ม (ยกเลิกบางรายการ) คนไข้ 1: เพิ่มยา C เข้าแผน Refill เดิม (รอบ 1–2 รอบละ 7 · รอบ 3 = 0) → ส่งคำสั่ง`, async () => {
          await orderRefill(p1, DRUG_C, '21', ['7', '7', '0'], '7', 'TC-006 คนไข้ 1');
        }));
        if (cSent1) {
          await soft(`${TC['006']} ขั้นเพิ่ม Task รอบ 1–2 ของคนไข้ 1 มียา A + C`, async () => {
            const withC = (await refillTasks(p1, 'TC-006 คนไข้ 1 ก่อนลบ')).filter((t) => hasDrug(t, DRUG_C.code));
            await compareTasks('Task ที่มียา C ก่อนลบ Order (คนไข้ 1)', [{ label: 'รอบที่มียา C', values: ['1, 2', withC.map((t) => t.iteration).join(', ') || '(ไม่มี)'], same: withC.map((t) => t.iteration).join(', ') === '1, 2' }]);
          });
          await hideCompareTable(page);
          await soft(`${TC['006']} ขั้นเพิ่ม CPOE ลบ (ยกเลิก) Order ยา C ของคนไข้ 1`, async () => {
            await cancelInCpoe(p1, DRUG_C, 'คนไข้ 1');
          });
          await soft(`${TC['006']} ขั้นเพิ่ม Task แต่ละรอบของคนไข้ 1 ต้องไม่มียา C (ยังมียา A)`, async () => {
            await checkPartial(p1, DRUG_C, DRUG_A, 'รายการยาในแต่ละรอบหลังลบยา C (คนไข้ 1)');
          });
          await hideCompareTable(page);
          await soft(`${TC['006']} ขั้นเพิ่ม หน้ารับออเดอร์ ส่วนยา Refill ทุกรอบต้องไม่มียา C (คนไข้ 1)`, async () => {
            await checkPartialOrderPage(p1, DRUG_C, DRUG_A, 'ยา Refill แต่ละรอบหลังลบยา C (หน้ารับออเดอร์ · คนไข้ 1)');
          });
          await hideCompareTable(page);
        } else if (sent) skip(`${TC['006']} ขั้นเพิ่ม (คนไข้ 1)`, 'สั่งยา C ไม่สำเร็จ');
      }

      // ── TC-007 เภสัชลบยาที่หน้าสร้างใบยา ──
      //   ก) คนไข้ 4 ยา D เป็นยา Refill ตัวเดียว → Task ทุกรอบต้องถูกยกเลิก · ข) คนไข้ 1 แผนมียา A + D → ยกเลิก D → ทุกรอบต้องไม่มี D (ยังมี A)
      if (from <= 7) {
        await startClip(page, 'TC-007');
        const dSent4 = ordered.includes('D4') || await soft(`${TC['007']} ขั้น 1 CPOE คนไข้ 4: สั่งยา D เป็นยา Refill ตัวเดียว 2 รอบ (ยอด 21 · รอบละ 7 · จ่ายครั้งนี้ 7) → ส่งคำสั่ง`, async () => {
          await orderRefill(p4, DRUG_D, '21', ['7', '7'], '7', 'TC-007 คนไข้ 4');
        });
        if (dSent4) {
          await soft(`${TC['007']} ขั้น 2 ห้องยา แท็บ Order เติมยา มี Task ของยา D 2 รอบ (คนไข้ 4)`, async () => {
            const withD = (await refillTasks(p4, 'TC-007 คนไข้ 4 ก่อนลบ')).filter((t) => hasDrug(t, DRUG_D.code));
            await compareTasks('Task ของยา D ก่อนลบ (คนไข้ 4)', [{ label: 'รอบที่มียา D', values: ['1, 2', withD.map((t) => t.iteration).join(', ') || '(ไม่มี)'], same: withD.map((t) => t.iteration).join(', ') === '1, 2' }]);
          });
          await hideCompareTable(page);
          const removed = await soft(`${TC['007']} ขั้น 3 Order รอยืนยัน → เปิด Order คนไข้ 4 → ลบ (ยกเลิกรายการ) ยา D ก่อนสร้างใบยา`, async () => {
            await cancelAtPharmacy(p4, DRUG_D, 'คนไข้ 4');
          });
          if (removed) {
            await soft(`${TC['007']} ขั้น 4 Task เติมยาทุกรอบของคนไข้ 4 ต้องถูกยกเลิกทั้งหมด`, async () => {
              await checkAllCancelled(p4, DRUG_D, 'Task ทุกรอบหลังลบยา D ที่หน้าสร้างใบยา (ยา Refill ตัวเดียว · คนไข้ 4)');
            });
            await hideCompareTable(page);
          } else skip(`${TC['007']} ขั้น 4 (คนไข้ 4)`, 'ลบยา D ที่หน้าสร้างใบยาไม่สำเร็จ');
        } else skip(`${TC['007']} ขั้น 2-4 (คนไข้ 4)`, 'สั่งยา D ไม่สำเร็จ');
        // ข) ยกเลิกบางรายการ
        const dSent1 = sent && (ordered.includes('D1') || await soft(`${TC['007']} ขั้นเพิ่ม (ยกเลิกบางรายการ) คนไข้ 1: เพิ่มยา D เข้าแผน Refill เดิม (รอบ 1–2 รอบละ 7 · รอบ 3 = 0) → ส่งคำสั่ง`, async () => {
          await orderRefill(p1, DRUG_D, '21', ['7', '7', '0'], '7', 'TC-007 คนไข้ 1');
        }));
        if (dSent1) {
          await soft(`${TC['007']} ขั้นเพิ่ม Task รอบ 1–2 ของคนไข้ 1 มียา D`, async () => {
            const withD = (await refillTasks(p1, 'TC-007 คนไข้ 1 ก่อนลบ')).filter((t) => hasDrug(t, DRUG_D.code));
            await compareTasks('Task ที่มียา D ก่อนลบ (คนไข้ 1)', [{ label: 'รอบที่มียา D', values: ['1, 2', withD.map((t) => t.iteration).join(', ') || '(ไม่มี)'], same: withD.map((t) => t.iteration).join(', ') === '1, 2' }]);
          });
          await hideCompareTable(page);
          const removed = await soft(`${TC['007']} ขั้นเพิ่ม หน้ารับออเดอร์คนไข้ 1 → ลบ (ยกเลิกรายการ) ยา D ก่อนสร้างใบยา`, async () => {
            await cancelAtPharmacy(p1, DRUG_D, 'คนไข้ 1');
          });
          if (removed) {
            await soft(`${TC['007']} ขั้นเพิ่ม Task แต่ละรอบของคนไข้ 1 ต้องไม่มียา D (ยังมียา A)`, async () => {
              await checkPartial(p1, DRUG_D, DRUG_A, 'รายการยาในแต่ละรอบหลังลบยา D (คนไข้ 1)');
            });
            await hideCompareTable(page);
            await soft(`${TC['007']} ขั้นเพิ่ม หน้ารับออเดอร์ ส่วนยา Refill ทุกรอบต้องไม่มียา D (คนไข้ 1)`, async () => {
              await checkPartialOrderPage(p1, DRUG_D, DRUG_A, 'ยา Refill แต่ละรอบหลังลบยา D (หน้ารับออเดอร์ · คนไข้ 1)');
            });
            await hideCompareTable(page);
          } else skip(`${TC['007']} ขั้นเพิ่ม (คนไข้ 1)`, 'ลบยา D ที่หน้าสร้างใบยาไม่สำเร็จ');
        } else if (sent) skip(`${TC['007']} ขั้นเพิ่ม (คนไข้ 1)`, 'สั่งยา D ไม่สำเร็จ');
      }

      // ── คนไข้ 2: TC-008 / TC-009 ── (SBH2127_FROM=9 = ทำต่อเฉพาะ TC-009 ขั้น 2-3 · คนไข้ 2 จ่ายยารอบที่ 1 แล้ว)
      if (from < 9) await startClip(page, 'TC-008');
      let eSent = ordered.includes('E') || from >= 9;
      if (from < 9 && !eSent) eSent = await soft(`${TC['008']} ขั้น 1 CPOE คนไข้ 2: สั่งยา E Refill 3 รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28) → ส่งคำสั่ง`, async () => {
        await orderRefill(p2, DRUG_E, '28', ['7', '7', '7'], '7', 'TC-008', '4');
      });
      let inProgress = from >= 9;
      let prescriptionId = '';
      if (eSent && from < 9) {
        inProgress = await soft(`${TC['008']} ขั้น 2 ห้องยา แท็บ Order เติมยา → ติ๊ก Task รอบที่ 1 → นำไปสร้างใบยา → สร้างใบยา → สถานะ "กำลังเติมยา"`, async () => {
          const tasks = await refillTasks(p2, 'TC-008 ก่อนสร้างใบยา');
          expect(tasks.length, 'ต้องมี Task ของยา E 3 รอบ').toBe(3);
          const row1 = main.locator('tr.ant-table-row').filter({ hasText: `HN ${p2.hn}` }).filter({ hasText: new RegExp(`1/3${days[0]}`) }).first();
          const box = row1.locator('input[type=checkbox]');
          await box.check();
          const go = main.getByRole('button', { name: /นำไปสร้างใบยา/ }).first();
          await markEvidence(filled(row1.locator('.ant-checkbox').first()), clicked(go));
          await snapEvidence(page, 'ก่อนกด — นำไปสร้างใบยา (Task รอบที่ 1)');
          await go.click();
          const confirm = page.getByRole('dialog').filter({ hasText: 'ยืนยันการสร้างใบยา' });
          await expect(confirm).toBeVisible({ timeout: 15_000 });
          const ok = confirm.getByRole('button', { name: /^นำไปสร้างใบยา$/ });
          await markEvidence(alerted(confirm.locator('.ant-modal-container, .ant-modal-content').first()), clicked(ok));
          await snapEvidence(page, 'แจ้งเตือน — ยืนยันการสร้างใบยา');
          await ok.click();
          await page.waitForURL(/tab=medication-refill/, { timeout: 60_000 });
          await expect(createButton).toBeVisible({ timeout: 60_000 });
          await page.waitForTimeout(2_500);
          note(`${TC['008']} หน้าสร้างใบยา`, `${page.url().replace(/^https:\/\/[^/]+/, '').slice(0, 200)} (Visit เดิม — มียา E ของครั้งนี้ + รอบที่ 1)`);
          const autoPrint = main.getByRole('checkbox', { name: 'Print ฉลากยาอัตโนมัติ' });
          if (await autoPrint.isChecked().catch(() => false)) await autoPrint.click(); // เครื่องเทสไม่มีเครื่องพิมพ์
          await markEvidence(expected(main.getByText(/เติมยาครั้งที่ 1\/3/).first()), clicked(createButton));
          await snapEvidence(page, 'ก่อนกด — สร้างใบยา (รอบที่ 1)');
          const res = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/cortex-api/opd/prescriptions', { timeout: 60_000 });
          await createButton.click();
          const response = await res;
          prescriptionId = ((await response.json().catch(() => ({}))) as { prescriptionId?: string }).prescriptionId ?? '';
          note(`${TC['008']} สร้างใบยา`, `POST /cortex-api/opd/prescriptions ${response.status()} · ใบยา ${prescriptionId || '-'}`);
          expect(response.status()).toBe(200);
          const after = await refillTasks(p2, 'TC-008 หลังสร้างใบยา');
          expect(after[0]?.latestStatusCode, 'Task รอบที่ 1 ต้องเป็น กำลังเติมยา').toBe('IN_PROGRESS');
          await markEvidence(expected(main.locator('tr.ant-table-row').filter({ hasText: 'กำลังเติมยา' }).first()));
          await holdForClip(page);
          await snapEvidence(page, 'Task รอบที่ 1 กำลังเติมยา');
        });
      } else if (!eSent) skip(`${TC['008']} ขั้น 2-4`, 'สั่งยา E ไม่สำเร็จ');
      if (inProgress && from < 9) {
        await soft(`${TC['008']} ขั้น 3 CPOE แก้วิธีกินของยา E → บันทึก`, async () => {
          await openEmr(p2);
          await expect(basketRow(DRUG_E.code)).toBeVisible({ timeout: 60_000 });
          const edit = editButton(DRUG_E.code);
          const enabled = await edit.isEnabled();
          await markEvidence(expected(edit), expected(basketRow(DRUG_E.code).getByRole('button', { name: 'ยกเลิก' })));
          await holdForClip(page, 1_500);
          await snapEvidence(page, 'CPOE ยา E หลังเภสัชสร้างใบยา');
          if (!enabled) {
            note(`${TC['008']} ขั้น 3`, 'ปุ่มแก้ไขยา E ใน CPOE กดไม่ได้หลังเภสัชสร้างใบยา (Order ต้นทางถูกสร้างใบยาพร้อมรอบที่ 1 — กฎ SBH-2126) → แก้วิธีกินไม่ได้');
            throw new Error('แก้วิธีกินของยา E ไม่ได้ — ปุ่มแก้ไขถูกปิดหลังสร้างใบยา (ตรวจขั้นนี้ไม่ได้)');
          }
          await editDrugDetails(DRUG_E.code, 'TC-008', '2');
        });
        await soft(`${TC['008']} ขั้น 4 Task รอบที่ 1 ยังอยู่ 1 รายการ สถานะ "กำลังเติมยา" ไม่ซ้ำ`, async () => {
          const tasks = await refillTasks(p2, 'TC-008 ตรวจ');
          const r1 = tasks.filter((t) => t.iteration === 1);
          await compareTasks('Task รอบที่ 1 ของยา E', [
            { label: 'จำนวน Task รอบที่ 1', values: ['1', String(r1.length)], same: r1.length === 1 },
            { label: 'สถานะรอบที่ 1', values: ['กำลังเติมยา', r1.map((t) => STATUS[t.latestStatusCode] ?? t.latestStatusCode).join(', ') || '(ไม่มี)'], same: r1.length === 1 && r1[0].latestStatusCode === 'IN_PROGRESS' },
            { label: 'จำนวน Task ทั้งหมด', values: ['3', String(tasks.length)], same: tasks.length === 3 },
          ]);
        });
        await hideCompareTable(page);
      } else if (eSent && from < 9) skip(`${TC['008']} ขั้น 3-4`, 'สร้างใบยาจาก Task รอบที่ 1 ไม่สำเร็จ');

      // ── TC-009 จ่ายยารอบที่ 1 → เติมยาแล้ว → แพทย์แก้จำนวน ──
      await startClip(page, 'TC-009');
      let completed = from >= 9;
      if (inProgress && from < 9) {
        completed = await soft(`${TC['009']} ขั้น 1 เภสัชดำเนินการใบยา ${prescriptionId}: จัดยา → ยืนยันรอจ่าย → ชำระเงิน → จ่ายยา → Task รอบที่ 1 "เติมยาแล้ว"`, async () => {
          await openPrescriptionTab(p2, /ใบยารอจัด/);
          const pack = page.getByRole('button', { name: /จัดยาแล้ว/ }).filter({ visible: true }).first();
          await markEvidence(clicked(pack));
          await snapEvidence(page, 'ก่อนกด — จัดยาแล้ว');
          let before = (await notices(page)).length;
          await pack.click();
          note('จัดยา', (await waitNotice(page, before, /.+/, 15_000)) || '(ไม่เห็นแจ้งเตือน)');
          await openPrescriptionTab(p2, /ใบยาจัดแล้ว/);
          const verify = page.getByRole('button', { name: /ยืนยันรอจ่าย/ }).filter({ visible: true }).first();
          await markEvidence(clicked(verify));
          await snapEvidence(page, 'ก่อนกด — ยืนยันรอจ่าย');
          before = (await notices(page)).length;
          await verify.click();
          note('ยืนยันรอจ่าย', (await waitNotice(page, before, /.+/, 15_000)) || '(ไม่เห็นแจ้งเตือน)');
          await gotoCashierAccount(page, p2.hn, p2.vn);
          await markEvidence(clicked(page.getByRole('button', { name: /สร้างใบแจ้งหนี้ทั้งหมด/ })));
          await snapEvidence(page, 'ก่อนกด — สร้างใบแจ้งหนี้ทั้งหมด (การเงิน)');
          const paid = await payAllInCash(page);
          note('ชำระเงิน', `ใบแจ้งหนี้ ${paid.invoiceId} · ใบเสร็จ ${paid.receiptId} · ${paid.amount} บาท`);
          await openPrescriptionTab(p2, /ใบรอจ่าย/);
          const items = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${DRUG_E.code}]` });
          for (let i = 0; i < (await items.count()); i++) {
            await items.nth(i).locator('td').first().getByRole('button').first().click();
            await page.waitForTimeout(600);
          }
          const dispense = page.getByRole('button', { name: /^จ่ายยา$/ }).filter({ visible: true }).first();
          await expect(dispense, 'ติ๊กทบทวนรายการยาแล้วปุ่มจ่ายยาต้องกดได้').toBeEnabled({ timeout: 10_000 });
          await markEvidence(...Array.from({ length: await items.count() }, (_, i) => expected(items.nth(i).locator('td').first())), clicked(dispense));
          await snapEvidence(page, 'ก่อนกด — จ่ายยา');
          await dispense.click();
          const review = page.locator('.ant-modal:visible').filter({ hasText: 'ยืนยันการทบทวนก่อนจ่ายยา' }).last();
          await expect(review).toBeVisible({ timeout: 10_000 });
          const ok = review.getByRole('button', { name: 'ยืนยัน' });
          await markEvidence(alerted(review.locator('.ant-modal-container, .ant-modal-content').first()), clicked(ok));
          await snapEvidence(page, 'แจ้งเตือน — ยืนยันการทบทวนก่อนจ่ายยา');
          before = (await notices(page)).length;
          const res = page.waitForResponse((r) => r.request().method() === 'POST' && /\/prescriptions\/[^/]+\/dispense$/.test(new URL(r.url()).pathname), { timeout: 30_000 });
          await ok.click();
          expect((await res).status(), 'จ่ายยาต้องสำเร็จ').toBeLessThan(300);
          note('จ่ายยา', (await waitNotice(page, before, /จ่ายยา/, 15_000)) || '(ไม่เห็นแจ้งเตือน)');
          const tasks = await refillTasks(p2, 'TC-009 หลังจ่ายยา');
          expect(tasks[0]?.latestStatusCode, 'Task รอบที่ 1 ต้องเป็น เติมยาแล้ว').toBe('COMPLETED');
          await markEvidence(expected(main.locator('tr.ant-table-row').filter({ hasText: 'เติมยาแล้ว' }).first()));
          await holdForClip(page);
          await snapEvidence(page, 'Task รอบที่ 1 เติมยาแล้ว');
        });
      } else if (!inProgress) skip(TC['009'], 'TC-008 สร้างใบยารอบที่ 1 ไม่สำเร็จ');
      if (completed) {
        await soft(`${TC['009']} ขั้น 2 CPOE แก้จำนวนจ่ายของยา E → บันทึก`, async () => {
          await openEmr(p2);
          await expect(basketRow(DRUG_E.code)).toBeVisible({ timeout: 60_000 });
          const enabled = await editButton(DRUG_E.code).isEnabled();
          note(`${TC['009']} ปุ่มแก้ไขยา E`, enabled ? 'กดได้' : 'กดไม่ได้ (ใบยาออกแล้ว — กฎ SBH-2126)');
          await markEvidence(expected(editButton(DRUG_E.code)));
          await holdForClip(page, 1_200);
          // จำนวนจ่ายของยา Refill แก้ในหน้าต่าง Refill (ช่องจำนวนในหน้าแก้ไขยาล็อก) → ลองแก้รอบที่ 2: 7 → 5
          await openRefillDialog(DRUG_E.name);
          // หลังสร้างใบยา หน้าต่างมีแถว BETAMED 2 แถว (แถวใบยารอบ 1 + แถวแผนต้นทาง) ลำดับสลับได้ → ใช้แถวที่มีช่อง "จำนวนยาที่จ่ายทั้งหมด"
          const planRow = dialog.locator('tbody tr').filter({ hasText: DRUG_E.name }).filter({ hasText: 'จำนวนยาที่จ่ายทั้งหมด' }).first();
          const editableInputs = planRow.locator('input:not([disabled])');
          const inputs = Array.from({ length: await editableInputs.count() }, (_, i) => editableInputs.nth(i));
          const r2 = inputs.length >= 3 ? inputs[inputs.length - 2] : undefined;
          const editable = !!r2 && (await r2.isEditable().catch(() => false));
          if (!editable || !r2) {
            await markEvidence(expected(planRow));
            await holdForClip(page);
            throw new Error('แก้จำนวนจ่ายของยา E ไม่ได้ — ช่องจำนวนในหน้าต่าง Refill ถูกล็อก (ตรวจขั้นนี้ไม่ได้)');
          }
          await r2.fill('5');
          await r2.press('Tab');
          await markEvidence(filled(r2), clicked(confirmButton));
          await snapEvidence(page, 'ก่อนกด — ยืนยัน (แก้จำนวนรอบที่ 2 หลังจ่ายรอบที่ 1)');
          const before = (await notices(page)).length;
          const res = page.waitForResponse((r) => isGraphql(r, 'CreateMedicationRefills'), { timeout: 20_000 }).catch(() => undefined);
          await confirmButton.click();
          const response = await res;
          const body = response ? squash(await response.text().catch(() => '')).slice(0, 300) : '(ไม่มีคำขอ)';
          const text = await waitNotice(page, before, /.+/, 6_000);
          note(`${TC['009']} ยืนยันแก้จำนวน`, `CreateMedicationRefills → ${body} · แจ้งเตือน: ${text || '(ไม่มี)'} · หน้าต่าง${(await dialog.isVisible()) ? 'ยังเปิดอยู่' : 'ปิด'}`);
          await markEvidence(expected(dialog.locator('.ant-modal-title, .ant-modal-header').first()));
          await holdForClip(page, 2_000);
          if (await dialog.isVisible().catch(() => false)) await cancelButton.click().catch(() => undefined);
          expect(body, 'ระบบต้องบันทึกการแก้จำนวนได้').not.toMatch(/"errors"/);
        });
        await soft(`${TC['009']} ขั้น 3 Task รอบที่ 1 ยังอยู่ 1 รายการ สถานะ "เติมยาแล้ว" ไม่ซ้ำ`, async () => {
          const tasks = await refillTasks(p2, 'TC-009 ตรวจ');
          const r1 = tasks.filter((t) => t.iteration === 1);
          await compareTasks('Task รอบที่ 1 ของยา E', [
            { label: 'จำนวน Task รอบที่ 1', values: ['1', String(r1.length)], same: r1.length === 1 },
            { label: 'สถานะรอบที่ 1', values: ['เติมยาแล้ว', r1.map((t) => STATUS[t.latestStatusCode] ?? t.latestStatusCode).join(', ') || '(ไม่มี)'], same: r1.length === 1 && r1[0].latestStatusCode === 'COMPLETED' },
            { label: 'จำนวน Task ทั้งหมด', values: ['3', String(tasks.length)], same: tasks.length === 3 },
          ]);
        });
        await hideCompareTable(page);
      }

      note('ผลรวม', failures.length ? `ไม่ผ่าน / ตรวจไม่ได้ ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
