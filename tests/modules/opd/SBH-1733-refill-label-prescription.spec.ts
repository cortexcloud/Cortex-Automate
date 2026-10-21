import type { Browser, Locator, Page } from '@playwright/test';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence } from '../../../helpers/functions/evidence';
import { finishVideo, restartVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// การ์ด SBH-1733 [Pharmacy][ใบยา] Label แสดงการเป็น Order Refill ในหน้าใบยา — EXE SBH-2700 → TS SBH-2701 (HPY) / SBH-2702 (UHP) → TC-SBH-1733-001–008 (SBH-2703–2710)
// 1 เทส = 1 flow (R9) · ผู้ป่วย AUTO ใหม่ 1 ราย (ลงทะเบียน + Visit OPD ที่เวชระเบียน R53 → เช็คอิน) ทิ้ง Visit ไว้ (R11)
// บัญชี: แพทย์ = Doctor (หน้าต่างแยก) · ห้องยา = Super_User (หน้าหลัก — dev-x ไม่มีบัญชีเภสัช) แบบ SBH-2126
// Order 1: ยา A = med0000007 GPO-L-ONE 28 → Refill 3 รอบ × 7 (จ่ายครั้งนี้ 7 / ยอดรวม 28) · ยา B = med0000008 CLINDAVID-300 (ยาปกติ)
//   หน้าสร้างใบยา: 001 (Label ยา A) · 007 (ยา B ไม่มี Label) · 004 (จำนวน / หน่วยยา B แบบ CPOE) · 005 (จำนวน + tooltip ยา A แบบ CPOE)
//   → สร้างใบยา → หน้าใบยา: 002 (Label ยา A) · 006 (จำนวน + tooltip ยา A) · 008 (ไม่มีคอลัมน์ Refill แยก)
// TC-003 รันแยก (SBH1733_FROM=003 · ผู้ป่วยใหม่): แพทย์สั่งยา C = med0000006 ยาปกติ → เภสัชแก้จำนวนที่แถวยาเป็น 4 → หน้าต่าง "จัดการการเติมยา (Refill)"
//   ระยะ 7 วัน + เพิ่ม 3 รอบ รอบละ 1 → ยืนยัน ("อัปเดตรอบเติมยาแล้ว") → ดู Label · รอบเต็ม (ไม่ใส่ env) ไม่รัน TC-003
// คำตอบผู้ใช้ 20 ต.ค. 2026: 004 "หน่วยรวมอยู่คอลัมน์จำนวน (CPOE แยกคอลัมน์)" = ไม่ผ่าน · 007 "ยา B ไม่มี แต่ยา A ก็ไม่มี" = ไม่ผ่าน
// สิ่งที่บ่งชี้ Refill: CPOE = ไอคอน [aria-label="Remed"] · ห้องยา = ไอคอน class *refill-indicator-icon* (ปุ่ม aria-label "Refill") — tooltip "{current} / {planned} · Refill {completed} …"
// TC ที่ไม่ผ่านไม่หยุดเทส (soft) · คลิปแยกต่อ TC (R61)
// ทำต่อกับผู้ป่วยเดิม (เช็คอินแล้ว ตะกร้าว่าง): SBH1733_VISIT=<HN>,<VN>,<EN>
// รัน dev-x: npx playwright test --headed --grep @SBH-1733 --output=.cache/run-1733

const DRUG_A = { code: 'med0000007', name: 'GPO-L-ONE' };
const DRUG_B = { code: 'med0000008', name: 'CLINDAVID-300' };
const DRUG_C = { code: 'med0000006', name: 'LINCOMYCIN' }; // TC-003 รันแยกกับผู้ป่วยใหม่ (SBH1733_FROM=003 ไม่ใส่ SBH1733_VISIT) — Visit ที่มีแผน Refill ของยา A อยู่แล้ว ห้องยาเพิ่มรอบให้ยา C แล้วได้รอบซ้อน 6 รอบ (HN 6931954)
const ROUNDS = 3;
const CPOE_TOOLTIP = `7 / 28 · Refill 0 of ${ROUNDS}`;
const TC = {
  '001': 'TC-001 (SBH-2703)', '002': 'TC-002 (SBH-2704)', '003': 'TC-003 (SBH-2705)', '004': 'TC-004 (SBH-2706)',
  '005': 'TC-005 (SBH-2707)', '006': 'TC-006 (SBH-2708)', '007': 'TC-007 (SBH-2709)', '008': 'TC-008 (SBH-2710)',
} as const;
const ISSUES = ['SBH-1733', 'SBH-2700', 'SBH-2703', 'SBH-2704', 'SBH-2705', 'SBH-2706', 'SBH-2707', 'SBH-2708', 'SBH-2709', 'SBH-2710'];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/** หน้าต่างของบัญชี Doctor (context แยก) + จดแจ้งเตือน + อัดวิดีโอ */
async function openDoctorWindow(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: authFile('Doctor'), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await cacheAppAssets(context);
  await context.addInitScript(recordNotices);
  const page = await context.newPage();
  await page.goto('/cortex/');
  await trackVideo(page, 'Doctor');
  return page;
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

/** หัวคอลัมน์ที่มองเห็นของตารางแรกที่มีแถว row */
async function headersOf(row: Locator): Promise<string[]> {
  const table = row.locator('xpath=ancestor::div[contains(@class,"ant-table-wrapper")][1]');
  return (await table.locator('thead th').filter({ visible: true }).allInnerTexts()).map(squash);
}
/** ข้อความของเซลล์ในแถวตามชื่อหัวคอลัมน์ (หัว / เซลล์นับตรงกัน — ตารางเหล่านี้ไม่มี colSpan ในแถวยา) */
async function cellByHeader(row: Locator, header: string): Promise<{ cell: Locator; text: string }> {
  const headers = await headersOf(row);
  const i = headers.findIndex((h) => h === header);
  if (i < 0) return { cell: row.locator('td').first(), text: `(ไม่มีคอลัมน์ "${header}")` };
  const cell = row.locator('td').filter({ visible: true }).nth(i);
  return { cell, text: squash(await cell.innerText().catch(() => '')) };
}

test.describe('SBH-1733 Label Order Refill ในหน้าใบยาของห้องยา', () => {

  test(
    'ผู้ป่วย AUTO ใหม่: แพทย์สั่งยา A Refill + ยา B → ห้องยาหน้าสร้างใบยา / หน้าใบยา เห็น Label Refill + จำนวน / หน่วยแบบ CPOE · Order 2 เภสัชเปลี่ยนยาเป็น Refill',
    { tag: ['@SBH-1733', ...ISSUES.slice(1).map((id) => `@${id}`)], annotation: ISSUES.map(linear) },
    async ({ page, browser }) => {
      test.setTimeout(1_500_000);
      const main = page.getByRole('main');
      const failures: string[] = [];
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      const soft = (p: Page, title: string, body: () => Promise<void>) =>
        checkStep(p, title, body).then(
          () => true,
          (error: unknown) => {
            failures.push(`${title} — ${firstLine(error)}`);
            console.log(`    ✗ ${title} — ${firstLine(error)}`);
            return false;
          },
        );
      // เฉพาะ TC-003 (แพทย์สั่งยา C → ห้องยาเปลี่ยนเป็น Refill): SBH1733_FROM=003 — ไม่ใส่ SBH1733_VISIT = ผู้ป่วยใหม่ที่ยังไม่มีแผน Refill (แนะนำ)
      const resume3 = process.env.SBH1733_FROM === '003';
      const skip = (title: string, why: string) => {
        if (!resume3) failures.push(`${title} — ตรวจไม่ได้ (${why})`);
      };
      await page.addInitScript(recordNotices);

      // ── Pre-condition (Super_User): ผู้ป่วย AUTO + Visit OPD + เช็คอิน ──
      let [hn, vn, en] = (process.env.SBH1733_VISIT ?? '').split(',');
      if (!hn) {
        const patient = newTestPatient('Rx1733');
        let newVisitEnabled = false;
        await checkStep(page, 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน (Super_User)', async () => {
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
          console.log(`    ทำต่อกับรายเดิม: SBH1733_VISIT=${hn},${vn},${en}`);
        });
        await checkStep(page, 'Pre-condition เช็คอิน Visit OPD จากรายการผู้ป่วยนอก', async () => {
          await selectOpdUnit(page);
          const row = await opdListRow(page, hn);
          await markEvidence(expected(row.getByText(`HN ${hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
          await snapEvidence(page, 'ก่อนกด — เช็คอิน Visit OPD');
          await checkInFromOpdList(page, row);
          await markEvidence(expected(row));
        });
      } else {
        note('ผู้ป่วย', `ผู้ป่วยเดิม HN ${hn} · ${vn} · EN (OPD) ${en}`);
      }

      // ── หน้าต่างแพทย์ (Doctor) ──
      const doc = await openDoctorWindow(browser);
      const dm = doc.getByRole('main');
      const visitBar = dm.getByText(`VN ${vn}`, { exact: true }).first();
      const refillButton = dm.getByRole('button', { name: /^refill/i });
      const dialog = doc.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' });
      const drugRowInDialog = dialog.locator('tbody tr').filter({ hasText: DRUG_A.name }).first();
      const dispenseNow = drugRowInDialog.locator('input[disabled]').first();
      const roundInputs = async (): Promise<Locator[]> => {
        const all = drugRowInDialog.locator('input:not([disabled])');
        const n = await all.count();
        return Array.from({ length: n }, (_, i) => all.nth(i)).slice(n > ROUNDS ? n - ROUNDS : 0);
      };
      const basketRow = (code: string) => dm.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      const usageBox = dm.getByRole('textbox', { name: /^\* วิธีใช้ภาษาไทย/ });

      const closeLeftPanels = async () => {
        for (const name of ['OPD', 'ประวัติการรักษา']) {
          const tab = doc.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
          if (await tab.count()) await tab.first().locator('.dv-default-tab-action').click().catch(() => undefined);
        }
        await doc.mouse.move(700, 1000);
      };
      const openEmr = async () => {
        await selectOpdUnit(doc);
        await dm.getByPlaceholder('ค้นหา HN').waitFor({ timeout: 120_000 });
        await doc.waitForTimeout(1_500);
        await restartVideo(doc); // ตัดช่วงจอขาว / หน้าเลือกหน่วยบริการ ~30 วินาทีต้นคลิปแพทย์
        const remove = dm.locator('.ant-select-selection-item-remove').filter({ visible: true });
        for (let i = 0; i < 3 && (await remove.count()); i++) {
          await remove.first().click();
          await doc.waitForTimeout(800);
        }
        const row = await opdListRow(doc, hn);
        const name = row.getByText(/AUTO\s/).first();
        await markEvidence(clicked(name));
        await snapEvidence(doc, 'ก่อนกด — ชื่อผู้ป่วย (Doctor)');
        await name.click();
        await expect(visitBar, 'เปิดหน้า EMR แล้วต้องเห็นแถบ Visit ของผู้ป่วย').toBeVisible({ timeout: 90_000 });
        await expect(dm.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
        await closeLeftPanels();
      };
      const sendOrder = async (tag: string) => {
        const submit = dm.getByRole('button', { name: 'save ส่งคำสั่ง' });
        const before = (await notices(doc)).length;
        await markEvidence(clicked(submit));
        await snapEvidence(doc, `ก่อนกด — ส่งคำสั่ง (${tag})`);
        await submit.click();
        const text = await waitNotice(doc, before, /ส่งคำสั่ง/, 60_000);
        note(`แจ้งเตือนหลังส่งคำสั่ง (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        expect(text, 'ส่งคำสั่งแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/สำเร็จ/);
      };
      /** hover ไอคอนแล้วอ่าน tooltip (เมนูข้างซ้ายที่กางค้างบังแถว → hover แบบ force) */
      const hoverTooltip = async (p: Page, icon: Locator): Promise<string> => {
        await p.mouse.move(960, 1000);
        await p.waitForTimeout(500);
        await icon.hover({ force: true });
        const tip = p.locator('.ant-tooltip:visible').last();
        await tip.waitFor({ timeout: 5_000 }).catch(() => undefined);
        await p.waitForTimeout(500);
        return squash(await tip.innerText().catch(() => ''));
      };
      const cpoe = { aQty: '', aUnit: '', aTooltip: '', bQty: '', bUnit: '', headers: [] as string[] };

      // ── TC-001 ฝั่งแพทย์: สั่งยา A Refill + ยา B → ส่งคำสั่ง → ภาพ CPOE ตัวเทียบ ──
      await startClip(doc, 'TC-001');
      let sent = false;
      const opened = !resume3 && await soft(doc, `${TC['001']} ขั้น 1 Doctor เปิด OPD Visit → หน้า CPOE`, async () => {
        await openEmr();
        await expect(doc.getByRole('combobox', { name: /ค้นหา ยา/ })).toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(visitBar), expected(doc.getByRole('combobox', { name: /ค้นหา ยา/ })));
      });
      if (opened) {
        sent = await soft(doc, `${TC['001']} ขั้น 1 สั่งยา A Refill (จ่ายครั้งนี้ 7 / ยอดรวม 28 / ${ROUNDS} รอบ) + ยา B ยาปกติ → ส่งคำสั่ง`, async () => {
          await addMedicineToCart(doc, DRUG_A.code, async () => {
            const period = dm.getByRole('spinbutton', { name: 'ระยะเวลาการใช้' });
            await period.fill('4');
            await period.press('Tab');
            const qty = dm.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
            await qty.fill('28');
            await qty.press('Tab');
            await expect(qty).toHaveValue('28');
            await expect(usageBox).toContainText(/ถึงวันที่/);
            await markEvidence(filled(period), expected(qty));
            await snapEvidence(doc, 'กรอก — ยา A 4 สัปดาห์ (28)');
          });
          await addMedicineToCart(doc, DRUG_B.code);
          await expect(basketRow(DRUG_A.code)).toBeVisible({ timeout: 30_000 });
          await expect(basketRow(DRUG_B.code)).toBeVisible({ timeout: 30_000 });
          await expect(refillButton).toBeVisible({ timeout: 30_000 });
          await markEvidence(clicked(refillButton));
          await snapEvidence(doc, 'ก่อนกด — ปุ่ม refill');
          await refillButton.click();
          await expect(dialog, 'กดปุ่ม refill แล้วต้องเปิดหน้าต่าง "จัดการการเติมยา (Refill)"').toBeVisible({ timeout: 20_000 });
          await expect(drugRowInDialog).toBeVisible({ timeout: 20_000 });
          await doc.waitForTimeout(1_000);
          await dialog.getByRole('spinbutton').first().fill('7');
          const add = dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
          for (let i = 0; i < ROUNDS; i++) await add.click();
          await expect(dialog.getByText(/^เติมยาครั้งที่ \d+$/)).toHaveCount(ROUNDS, { timeout: 10_000 });
          for (const input of await roundInputs()) {
            await input.fill('7');
            await input.press('Tab');
          }
          await expect(dispenseNow, 'จ่ายครั้งนี้ = 28 − 21 = 7').toHaveValue('7');
          const confirm = dialog.getByRole('button', { name: 'ยืนยัน', exact: true });
          await markEvidence(...(await roundInputs()).map(filled), expected(dispenseNow), clicked(confirm));
          await snapEvidence(doc, 'ก่อนกด — ยืนยันแผน Refill');
          const before = (await notices(doc)).length;
          await confirm.click();
          const text = await waitNotice(doc, before, /refill|เติมยา|กรุณา|ผิดพลาด/i);
          note('แจ้งเตือนหลังยืนยันแผน', text || '(ไม่เห็นแจ้งเตือน)');
          await expect(dialog).toBeHidden({ timeout: 15_000 });
          await expect(basketRow(DRUG_A.code).locator('[aria-label="Remed"]'), 'ยา A ต้องเป็นรายการ Refill').toBeVisible();
          await sendOrder('Order 1');
          await expect(basketRow(DRUG_A.code).locator('[aria-label="ส่งแล้ว"]')).toHaveCount(1, { timeout: 30_000 });
        });
      }
      if (sent) {
        await soft(doc, `${TC['001']} ขั้น 2 ภาพหน้า CPOE ตัวเทียบ (ไอคอน ↻ + tooltip ยา A · จำนวน / หน่วย ยา B)`, async () => {
          await doc.reload();
          await expect(basketRow(DRUG_A.code)).toBeVisible({ timeout: 60_000 });
          await closeLeftPanels();
          cpoe.headers = await headersOf(basketRow(DRUG_A.code));
          cpoe.aQty = (await cellByHeader(basketRow(DRUG_A.code), 'จำนวน')).text;
          cpoe.aUnit = (await cellByHeader(basketRow(DRUG_A.code), 'หน่วย')).text;
          cpoe.bQty = (await cellByHeader(basketRow(DRUG_B.code), 'จำนวน')).text;
          cpoe.bUnit = (await cellByHeader(basketRow(DRUG_B.code), 'หน่วย')).text;
          const icon = basketRow(DRUG_A.code).locator('[aria-label="Remed"]');
          cpoe.aTooltip = await hoverTooltip(doc, icon);
          note('CPOE (ตัวเทียบ)', `หัวคอลัมน์ ${cpoe.headers.join(' | ')} · ยา A จำนวน "${cpoe.aQty}" หน่วย "${cpoe.aUnit}" tooltip "${cpoe.aTooltip}" · ยา B จำนวน "${cpoe.bQty}" หน่วย "${cpoe.bUnit}"`);
          await markEvidence(expected(doc.locator('.ant-tooltip:visible').last()), expected(icon), expected(basketRow(DRUG_B.code)));
          await snapEvidence(doc, 'CPOE — ยา A tooltip Refill + ยา B');
          await holdForClip(doc, 2_000);
          expect(cpoe.aTooltip, 'tooltip ของ CPOE (ตัวเทียบ)').toBe(CPOE_TOOLTIP);
        });
      } else skip(`${TC['001']} ขั้น 2`, 'ส่งคำสั่งไม่สำเร็จ');
      await startClip(doc, 'พัก-แพทย์-1'); // ปิดคลิป TC-001 ฝั่งแพทย์ — หน้าต่างแพทย์นั่งรอระหว่างห้องยาทำ 001–008

      // ── ห้องยา (Super_User): หน้าสร้างใบยา ──
      const createButton = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
      const pharmRow = (code: string) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      const refillMark = (row: Locator) => row.locator('[class*="refill-indicator-icon"], button[aria-label="Refill"]').first();
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
      const openPendingOrder = async (tag: string) => {
        await gotoPharmacy();
        const row = main.locator('tr.ant-table-row').filter({ hasText: `HN ${hn}` }).first();
        await expect(row, `ผู้ป่วย HN ${hn} ต้องอยู่แท็บ Order รอยืนยัน`).toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(page.getByRole('tab', { name: /Order รอยืนยัน/ })), clicked(row));
        await snapEvidence(page, `ก่อนกด — Order รอยืนยัน (${tag})`);
        await row.locator('td').nth(4).click();
        await expect(createButton).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(2_500);
        // เมนูข้างซ้ายกางค้างบังแถว → คลิกหัวข้อหน้าให้หุบ
        await main.getByText('รับออเดอร์', { exact: true }).first().click().catch(() => undefined);
        await page.mouse.move(960, 1000);
      };
      /** แถวยาในหน้าสร้างใบยา: ค่าในช่องจำนวน + ข้อความในคอลัมน์จำนวน (หน่วย / คงเหลือ) + มีสิ่งบ่งชี้ Refill ไหม */
      const readCreateRow = async (code: string) => {
        const row = pharmRow(code);
        const { cell, text } = await cellByHeader(row, 'จำนวน');
        const qty = await cell.locator('input').first().inputValue().catch(() => '');
        const unit = text.split(' คงเหลือ')[0].trim();
        const hasMark = (await refillMark(row).count()) > 0;
        return { row, cell, qty, unit, text, hasMark };
      };
      await startClip(page, 'TC-001-ห้องยา');
      let orderOpen = false;
      if (sent) {
        orderOpen = await soft(page, `${TC['001']} ขั้น 3 ห้องยา (Super_User) → Order รอยืนยัน → เปิด Order (หน้าสร้างใบยา)`, async () => {
          await openPendingOrder('Order 1');
          await expect(pharmRow(DRUG_A.code)).toBeVisible({ timeout: 30_000 });
          await expect(pharmRow(DRUG_B.code)).toBeVisible({ timeout: 30_000 });
        });
      } else skip(`${TC['001']} ขั้น 3-4`, 'ส่งคำสั่งไม่สำเร็จ');
      const createHeaders: string[] = [];
      if (orderOpen) {
        createHeaders.push(...(await headersOf(pharmRow(DRUG_A.code))));
        note('หน้าสร้างใบยา — หัวคอลัมน์', createHeaders.join(' | '));
        await soft(page, `${TC['001']} ขั้น 4 แถวยา A มี Label / ไอคอน Refill · ยา B ไม่มี`, async () => {
          const a = await readCreateRow(DRUG_A.code);
          const b = await readCreateRow(DRUG_B.code);
          note('หน้าสร้างใบยา — ยา A', `คอลัมน์จำนวน "${a.text}" · ช่องจำนวน ${a.qty} · สิ่งบ่งชี้ Refill: ${a.hasMark ? 'มี' : 'ไม่มี'}`);
          note('หน้าสร้างใบยา — ยา B', `คอลัมน์จำนวน "${b.text}" · ช่องจำนวน ${b.qty} · สิ่งบ่งชี้ Refill: ${b.hasMark ? 'มี' : 'ไม่มี'}`);
          await showCompareTable(page, 'หน้าสร้างใบยา — สิ่งบ่งชี้ Order Refill', ['ที่ควรเป็น', 'หน้าสร้างใบยา'], [
            { label: 'ยา A (Refill)', values: ['มี Label / ไอคอน Refill', a.hasMark ? 'มี' : `ไม่มี (${a.qty} ${a.text})`], same: a.hasMark },
            { label: 'ยา B (ยาปกติ)', values: ['ไม่มี', b.hasMark ? 'มี' : 'ไม่มี'], same: !b.hasMark },
          ], { side: 'bottom' });
          await markEvidence(expected(a.cell), expected(b.cell));
          await holdForClip(page, 2_500);
          expect(a.hasMark, 'ยา A (Refill) ต้องมี Label / ไอคอน Refill ในหน้าสร้างใบยา').toBe(true);
          expect(b.hasMark, 'ยา B (ยาปกติ) ต้องไม่มี Label Refill').toBe(false);
        });
        await hideCompareTable(page);

        // ── TC-007 ยา B ไม่มี Label (มีเฉพาะยา A) ──
        await startClip(page, 'TC-007');
        await soft(page, `${TC['007']} ขั้น 3 ยา B (ยาปกติ) ไม่มี Label / ไอคอน Refill — มีเฉพาะยา A`, async () => {
          const a = await readCreateRow(DRUG_A.code);
          const b = await readCreateRow(DRUG_B.code);
          await showCompareTable(page, 'หน้าสร้างใบยา — Label Refill มีเฉพาะยา A', ['ที่ควรเป็น', 'หน้าสร้างใบยา'], [
            { label: 'ยา B (ยาปกติ)', values: ['ไม่มี Label', b.hasMark ? 'มี Label' : 'ไม่มี Label'], same: !b.hasMark },
            { label: 'ยา A (Refill)', values: ['มี Label', a.hasMark ? 'มี Label' : 'ไม่มี Label'], same: a.hasMark },
          ], { side: 'bottom' });
          await markEvidence(expected(b.row), expected(a.cell));
          await holdForClip(page, 2_500);
          expect(b.hasMark, 'ยา B ต้องไม่มี Label Refill').toBe(false);
          expect(a.hasMark, 'Label Refill ต้องมีเฉพาะยา A (ยา A ไม่มี = ไม่ผ่าน ตามที่ผู้ใช้ตัดสิน)').toBe(true);
        });
        await hideCompareTable(page);

        // ── TC-004 จำนวน / หน่วยยา B แบบ CPOE ──
        await startClip(page, 'TC-004');
        await soft(page, `${TC['004']} ขั้น 3 จำนวน / หน่วยของยา B เทียบหน้า CPOE`, async () => {
          const b = await readCreateRow(DRUG_B.code);
          const unitColumn = createHeaders.includes('หน่วย');
          await showCompareTable(page, 'ยา B — จำนวน / หน่วย: CPOE เทียบหน้าสร้างใบยา', ['CPOE', 'หน้าสร้างใบยา'], [
            { label: 'จำนวน', values: [cpoe.bQty || '-', b.qty || '-'], same: !!cpoe.bQty && cpoe.bQty === b.qty },
            { label: 'หน่วย', values: [cpoe.bUnit || '-', b.unit || '-'], same: !!cpoe.bUnit && cpoe.bUnit === b.unit },
            { label: 'คอลัมน์ "หน่วย" แยก', values: [cpoe.headers.includes('หน่วย') ? 'มี' : 'ไม่มี', unitColumn ? 'มี' : 'ไม่มี (หน่วยอยู่ในคอลัมน์จำนวน)'], same: unitColumn },
          ], { side: 'bottom' });
          await markEvidence(expected(b.cell), expected(main.locator('thead th').filter({ visible: true }).filter({ hasText: /^จำนวน$/ }).first()));
          await holdForClip(page, 2_500);
          expect(b.qty, 'จำนวนยา B ต้องเท่ากับ CPOE').toBe(cpoe.bQty);
          expect(b.unit, 'หน่วยยา B ต้องเท่ากับ CPOE').toBe(cpoe.bUnit);
          expect(unitColumn, 'หน่วยต้องแยกคอลัมน์แบบหน้า CPOE (ผู้ใช้ตัดสิน: รวมในคอลัมน์จำนวน = ไม่ผ่าน)').toBe(true);
        });
        await hideCompareTable(page);

        // ── TC-005 จำนวน + tooltip ยา A แบบ CPOE ──
        await startClip(page, 'TC-005');
        await soft(page, `${TC['005']} ขั้น 3 จำนวน / หน่วยของยา A + hover ไอคอน Refill เทียบหน้า CPOE`, async () => {
          const a = await readCreateRow(DRUG_A.code);
          const tooltip = a.hasMark ? await hoverTooltip(page, refillMark(a.row)) : '(ไม่มีไอคอน Refill ให้ hover)';
          note('หน้าสร้างใบยา — tooltip ยา A', tooltip);
          await showCompareTable(page, 'ยา A — จำนวน / tooltip Refill: CPOE เทียบหน้าสร้างใบยา', ['CPOE', 'หน้าสร้างใบยา'], [
            { label: 'จำนวน', values: [cpoe.aQty || '-', a.qty || '-'], same: !!cpoe.aQty && cpoe.aQty === a.qty },
            { label: 'หน่วย', values: [cpoe.aUnit || '-', a.unit || '-'], same: !!cpoe.aUnit && cpoe.aUnit === a.unit },
            { label: 'tooltip Refill', values: [cpoe.aTooltip || CPOE_TOOLTIP, tooltip], same: tooltip === (cpoe.aTooltip || CPOE_TOOLTIP) },
          ], { side: 'bottom' });
          await markEvidence(expected(a.cell));
          await holdForClip(page, 2_500);
          expect(a.qty, 'จำนวนยา A ต้องเท่ากับ CPOE').toBe(cpoe.aQty);
          expect(tooltip, 'tooltip ยา A ต้องตรงกับ CPOE').toBe(cpoe.aTooltip || CPOE_TOOLTIP);
        });
        await hideCompareTable(page);
      }

      // ── TC-002 สร้างใบยา → หน้าใบยา: Label ยา A ──
      await startClip(page, 'TC-002');
      let rxOpen = false;
      if (orderOpen) {
        rxOpen = await soft(page, `${TC['002']} ขั้น 2-3 สร้างใบยา → เปิดใบยา (แท็บ ใบยารอจัด)`, async () => {
          const autoPrint = main.getByRole('checkbox', { name: 'Print ฉลากยาอัตโนมัติ' });
          if (await autoPrint.isChecked().catch(() => false)) await autoPrint.click(); // เครื่องเทสไม่มีเครื่องพิมพ์
          await markEvidence(clicked(createButton));
          await snapEvidence(page, 'ก่อนกด — สร้างใบยา');
          const res = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/cortex-api/opd/prescriptions', { timeout: 60_000 });
          await createButton.click();
          const response = await res;
          const body = (await response.json().catch(() => ({}))) as { prescriptionId?: string };
          note('สร้างใบยา', `POST /cortex-api/opd/prescriptions ${response.status()} · ใบยา ${body.prescriptionId ?? '-'}`);
          expect(response.status()).toBe(200);
          await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 }).catch(() => undefined);
          await page.getByRole('tab', { name: /ใบยารอจัด/ }).click();
          await page.waitForTimeout(2_500);
          const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: hn }).first();
          await expect(row, `ใบยาของ HN ${hn} ต้องอยู่แท็บ ใบยารอจัด`).toBeVisible({ timeout: 60_000 });
          await markEvidence(expected(page.getByRole('tab', { name: /ใบยารอจัด/ })), clicked(row));
          await snapEvidence(page, 'ก่อนกด — ใบยาในแท็บ ใบยารอจัด');
          await row.locator('td').nth(3).click();
          await page.waitForURL(/preset=pharmacyViewPrescription/, { timeout: 60_000 });
          await expect(main.getByText(/^ใบยาเลขที่/).first()).toBeVisible({ timeout: 60_000 });
          await expect(pharmRow(DRUG_A.code)).toBeVisible({ timeout: 30_000 });
          await page.waitForTimeout(2_000);
          await main.getByText(/^ใบยาเลขที่/).first().click().catch(() => undefined);
          await page.mouse.move(960, 1000);
        });
      } else skip(`${TC['002']}`, 'เปิด Order ที่ห้องยาไม่สำเร็จ');
      if (rxOpen) {
        await soft(page, `${TC['002']} ขั้น 4 หน้าใบยา: ยา A มี Label / ไอคอน Refill · ยา B ไม่มี`, async () => {
          const a = refillMark(pharmRow(DRUG_A.code));
          const b = refillMark(pharmRow(DRUG_B.code));
          const hasA = (await a.count()) > 0;
          const hasB = (await b.count()) > 0;
          await showCompareTable(page, 'หน้าใบยา — สิ่งบ่งชี้ Order Refill', ['ที่ควรเป็น', 'หน้าใบยา'], [
            { label: 'ยา A (Refill)', values: ['มี Label / ไอคอน Refill', hasA ? 'มี (ไอคอน ↻)' : 'ไม่มี'], same: hasA },
            { label: 'ยา B (ยาปกติ)', values: ['ไม่มี', hasB ? 'มี' : 'ไม่มี'], same: !hasB },
          ], { side: 'bottom' });
          await markEvidence(hasA ? expected(a) : expected(pharmRow(DRUG_A.code)), expected(pharmRow(DRUG_B.code)));
          await holdForClip(page, 2_500);
          expect(hasA, 'ยา A ต้องมี Label / ไอคอน Refill ในหน้าใบยา').toBe(true);
          expect(hasB, 'ยา B ต้องไม่มี Label Refill').toBe(false);
        });
        await hideCompareTable(page);

        // ── TC-006 จำนวน + tooltip ยา A ในหน้าใบยา ──
        await startClip(page, 'TC-006');
        await soft(page, `${TC['006']} ขั้น 3 หน้าใบยา: จำนวน / หน่วยยา A + hover ไอคอน Refill เทียบหน้า CPOE`, async () => {
          const row = pharmRow(DRUG_A.code);
          const qty = (await cellByHeader(row, 'จำนวน')).text.replace(/\s.*$/, '');
          const unit = (await cellByHeader(row, 'หน่วย')).text;
          const icon = refillMark(row);
          const tooltip = (await icon.count()) ? await hoverTooltip(page, icon) : '(ไม่มีไอคอน Refill ให้ hover)';
          note('หน้าใบยา — ยา A', `จำนวน "${qty}" หน่วย "${unit}" tooltip "${tooltip}"`);
          await showCompareTable(page, 'ยา A — จำนวน / tooltip Refill: CPOE เทียบหน้าใบยา', ['CPOE', 'หน้าใบยา'], [
            { label: 'จำนวน', values: [cpoe.aQty || '-', qty || '-'], same: !!cpoe.aQty && cpoe.aQty === qty },
            { label: 'หน่วย', values: [cpoe.aUnit || '-', unit || '-'], same: !!cpoe.aUnit && cpoe.aUnit === unit },
            { label: 'tooltip Refill', values: [cpoe.aTooltip || CPOE_TOOLTIP, tooltip], same: tooltip === (cpoe.aTooltip || CPOE_TOOLTIP) },
          ], { side: 'bottom' });
          if (await icon.count()) await markEvidence(expected(page.locator('.ant-tooltip:visible').last()), expected(icon));
          await holdForClip(page, 2_500);
          await snapEvidence(page, 'หน้าใบยา — tooltip ยา A');
          expect(qty, 'จำนวนยา A ต้องเท่ากับ CPOE').toBe(cpoe.aQty);
          expect(unit, 'หน่วยยา A ต้องเท่ากับ CPOE').toBe(cpoe.aUnit);
          expect(tooltip, 'tooltip ยา A ต้องตรงกับ CPOE').toBe(cpoe.aTooltip || CPOE_TOOLTIP);
        });
        await hideCompareTable(page);
        await page.mouse.move(960, 1000);

        // ── TC-008 ไม่มีคอลัมน์ Refill แยก ──
        await startClip(page, 'TC-008');
        await soft(page, `${TC['008']} ขั้น 3 หน้าใบยา: ไม่มีคอลัมน์ "Refill" แยก — แสดงเป็นไอคอนบนรายการยา`, async () => {
          const headers = await headersOf(pharmRow(DRUG_A.code));
          note('หน้าใบยา — หัวคอลัมน์', headers.join(' | '));
          const refillColumn = headers.some((h) => /refill/i.test(h));
          const hasA = (await refillMark(pharmRow(DRUG_A.code)).count()) > 0;
          await showCompareTable(page, 'หน้าใบยา — หัวคอลัมน์ของตารางรายการยา', ['ที่ควรเป็น', 'หน้าใบยา'], [
            { label: 'คอลัมน์ "Refill" แยก', values: ['ไม่มี', refillColumn ? 'มี' : 'ไม่มี'], same: !refillColumn },
            { label: 'ไอคอน Refill บนแถวยา A', values: ['มี', hasA ? 'มี' : 'ไม่มี'], same: hasA },
          ], { side: 'bottom' });
          await markEvidence(expected(main.locator('thead').filter({ visible: true }).first()), ...(hasA ? [expected(refillMark(pharmRow(DRUG_A.code)))] : []));
          await holdForClip(page, 2_500);
          expect(refillColumn, 'ต้องไม่มีคอลัมน์ Refill แยก').toBe(false);
          expect(hasA, 'ยา A ต้องแสดงไอคอน Refill บนรายการยาแทน').toBe(true);
        });
        await hideCompareTable(page);
      } else skip(`${TC['002']} / ${TC['006']} / ${TC['008']}`, 'สร้าง / เปิดใบยาไม่สำเร็จ');

      // ── TC-003 (เฉพาะ SBH1733_FROM=003 — ผู้ป่วยแยกที่ยังไม่มีแผน Refill): แพทย์สั่งยา C ยาปกติ → เภสัชเปลี่ยนเป็น Refill → Label ──
      // dev-x 20 ต.ค. 2026: Visit ที่มีแผน Refill ของยา A อยู่แล้ว ห้องยาเพิ่มรอบให้ยา C → ส่วน "ยา Refill" กลายเป็น 6 รอบ (รอบวันที่ซ้ำ — HN 6931954) จึงแยกผู้ป่วย
      await startClip(page, 'พัก-ห้องยา'); // ตัดคลิป TC-008 ไม่ให้อัดช่วงที่รอแพทย์
      await startClip(doc, 'TC-003');
      let sent2 = false;
      if (resume3) {
        sent2 = await soft(doc, `${TC['003']} ขั้น 1 Doctor สั่งยา C (ยาปกติ ไม่ใช่ Refill) → ส่งคำสั่ง`, async () => {
          await openEmr();
          await addMedicineToCart(doc, DRUG_C.code);
          await expect(basketRow(DRUG_C.code)).toBeVisible({ timeout: 30_000 });
          await expect(basketRow(DRUG_C.code).locator('[aria-label="Remed"]'), 'ยา C ต้องไม่ใช่ Refill').toHaveCount(0);
          await sendOrder('Order 2 ยา C');
          await markEvidence(expected(basketRow(DRUG_C.code)));
          await holdForClip(doc);
        });
      } else note(`${TC['003']}`, 'ไม่รันในรอบนี้ — รันแยกด้วย SBH1733_FROM=003 (ผู้ป่วยใหม่)');
      await startClip(doc, 'พัก-แพทย์-3');
      await startClip(page, 'TC-003-ห้องยา');
      if (sent2) {
        const opened2 = await soft(page, `${TC['003']} ขั้น 2 ห้องยา → Order รอยืนยัน → เปิด Order ยา C (หน้าสร้างใบยา)`, async () => {
          await openPendingOrder('Order 2');
          await expect(pharmRow(DRUG_C.code)).toBeVisible({ timeout: 30_000 });
          const c = await readCreateRow(DRUG_C.code);
          note('หน้าสร้างใบยา — ยา C ก่อนเปลี่ยน', `คอลัมน์จำนวน "${c.text}" · สิ่งบ่งชี้ Refill: ${c.hasMark ? 'มี' : 'ไม่มี'}`);
          await markEvidence(expected(c.row));
        });
        if (opened2) {
          const changed = await soft(page, `${TC['003']} ขั้น 3 เปลี่ยนยา C เป็น Refill (หน้าต่าง "จัดการการเติมยา" รอบละ 1) → ยืนยัน`, async () => {
            // ยา C สั่งมา 1 vial — หน้าต่าง Refill ไม่มีช่อง "จำนวนยาที่จ่ายทั้งหมด" ให้ยาที่ยังไม่เป็น Refill → รอบละ 1 × 3 เกินยอดรวม
            // ("จำนวนรอบเติมยาเกินจำนวนรวมที่จัดสรรไว้") → แก้จำนวนที่แถวรายการยาเป็น 1 + 3 รอบ = 4 ก่อน
            const qtyC = (await readCreateRow(DRUG_C.code)).cell.locator('input').first();
            await qtyC.fill(String(1 + ROUNDS));
            await qtyC.press('Tab');
            await page.waitForTimeout(1_000);
            await markEvidence(filled(qtyC));
            await snapEvidence(page, `กรอก — จำนวนยา C ${1 + ROUNDS}`);
            // หน้านี้แสดงใบยาของ Order 1 ต่อท้าย (มีปุ่ม refill ของตัวเอง) → ปุ่มแรก = ของส่วนรับออเดอร์
            const button = main.getByRole('button', { name: /^refill/i }).first();
            await markEvidence(clicked(button));
            await snapEvidence(page, 'ก่อนกด — ปุ่ม refill (ห้องยา)');
            await button.click();
            const pdialog = page.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' });
            await expect(pdialog).toBeVisible({ timeout: 20_000 });
            await page.waitForTimeout(1_500);
            const cRow = pdialog.locator('tbody tr').filter({ hasText: DRUG_C.name }).first();
            await expect(cRow, 'หน้าต่าง Refill ต้องมียา C').toBeVisible({ timeout: 10_000 });
            const all = cRow.locator('input:not([disabled])');
            if (!(await all.count())) {
              // Visit ที่ยังไม่มีแผน Refill: ตั้งระยะเวลาต่อรอบ 7 วัน แล้วเพิ่ม 3 รอบ (แบบเดียวกับฝั่ง CPOE)
              const period = pdialog.getByRole('spinbutton').first();
              await period.fill('7');
              await period.press('Tab');
              const add = pdialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
              for (let i = 0; i < ROUNDS; i++) {
                await add.click();
                await page.waitForTimeout(400);
              }
              await expect(pdialog.getByText(/^เติมยาครั้งที่ \d+$/)).toHaveCount(ROUNDS, { timeout: 10_000 });
              await markEvidence(filled(period));
            }
            const n = await all.count();
            const rounds = Array.from({ length: n }, (_, i) => all.nth(i)).slice(Math.max(0, n - ROUNDS));
            note('หน้าต่าง Refill (ห้องยา) — ยา C', `ช่องที่กรอกได้ ${n} ช่อง · ${squash(await cRow.innerText()).slice(0, 160)}`);
            for (const r of rounds) {
              await r.fill('1');
              await r.press('Tab');
            }
            const confirm = pdialog.getByRole('button', { name: 'ยืนยัน', exact: true });
            await markEvidence(...rounds.map(filled), expected(cRow.locator('input[disabled]').first()), clicked(confirm));
            await snapEvidence(page, 'ก่อนกด — ยืนยันเปลี่ยนยา C เป็น Refill');
            const before = (await notices(page)).length;
            await confirm.click();
            const text = await waitNotice(page, before, /.+/, 20_000);
            note('แจ้งเตือนหลังยืนยัน (ห้องยา)', text || '(ไม่เห็นแจ้งเตือน)');
            // ห้องยาแจ้ง "อัปเดตรอบเติมยาแล้ว" (CPOE แจ้ง "Create medication refills successfully")
            expect(text, 'ยืนยันแล้วต้องสำเร็จ').toMatch(/successfully|สำเร็จ|อัปเดตรอบเติมยาแล้ว/i);
            await expect(pdialog).toBeHidden({ timeout: 15_000 });
            await page.waitForTimeout(2_000);
          });
          if (changed) {
            await soft(page, `${TC['003']} ขั้น 4 ยา C ที่ถูกเปลี่ยนเป็น Refill แสดง Label / ไอคอน Refill`, async () => {
              await page.reload();
              await expect(pharmRow(DRUG_C.code)).toBeVisible({ timeout: 60_000 });
              await page.waitForTimeout(2_000);
              await main.getByText('รับออเดอร์', { exact: true }).first().click().catch(() => undefined);
              const c = await readCreateRow(DRUG_C.code);
              const section = main.getByText(/^เติมยาครั้งที่ \d+\/\d+$/);
              note('หน้าสร้างใบยา — ยา C หลังเปลี่ยน', `คอลัมน์จำนวน "${c.text}" · สิ่งบ่งชี้ Refill: ${c.hasMark ? 'มี' : 'ไม่มี'} · รอบในส่วน ยา Refill ${await section.count()} รอบ`);
              await showCompareTable(page, 'ยา C หลังเปลี่ยนเป็น Refill — สิ่งบ่งชี้', ['ที่ควรเป็น', 'หน้าสร้างใบยา'], [
                { label: 'ยา C Label / ไอคอน Refill', values: ['มี', c.hasMark ? 'มี' : `ไม่มี (${c.qty} ${c.text})`], same: c.hasMark },
              ], { side: 'bottom' });
              await markEvidence(expected(c.cell));
              await holdForClip(page, 2_500);
              expect(c.hasMark, 'ยา C ที่ถูกเปลี่ยนเป็น Refill ต้องมี Label / ไอคอน Refill').toBe(true);
            });
            await hideCompareTable(page);
          } else skip(`${TC['003']} ขั้น 4`, 'เปลี่ยนเป็น Refill ไม่สำเร็จ');
        }
      }

      await finishVideo(doc);
      await doc.context().close();
      note('ผลรวม', failures.length ? `ไม่ผ่าน / ตรวจไม่ได้ ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
