import type { Locator, Page } from '@playwright/test';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';

// การ์ด SBH-841 OPD Order Refill — EXE SBH-1602 (VERSION 2.7.0) → SC-001–008 → TC ที่ยังเปิดอยู่ 17 ใบ (TC-011 / 015–020 / 022 Canceled)
// 1 เทส = 1 flow (R9) ผู้ป่วย AUTO ใหม่ 1 ราย: ลงทะเบียน + Visit OPD ที่เวชระเบียน (R53) → เช็คอินจากรายการผู้ป่วยนอก → หน้า EMR (คลิกชื่อในรายการ)
// ยา (R25): med0000005 BETAMED (วิธีใช้ 1 ขวด/วัน 1 สัปดาห์ = ยอด 7 → ยา Refill หลัก) · med0000006 UTO LINCOMYCIN (ยาปกติ) · med0000007 GPO-L-ONE (ยอด 1 → ยา Refill ตัวที่ 2)
// ลำดับ: ก่อนส่งคำสั่ง TC-001 → 002 → 004 → 005 → 006 → 025 → 007 → 013 → 014 → 024 · ส่งคำสั่ง TC-003 · หลังส่ง TC-021 → 008 → 009 → 010 → 012 · ห้องยา TC-023 (อ่านอย่างเดียว)
// หน้าต่าง "จัดการการเติมยา (Refill)" (dev-x 19 ต.ค. 2026): ครอบยาทุกตัวในตะกร้า · จ่ายครั้งนี้ = ยอดรวม − ผลรวมรอบ (ล็อก) · ยาที่มีแผนแล้วมีช่อง "จำนวนยาที่จ่ายทั้งหมด" นำหน้าช่องรอบ
// TC-021 / TC-023 ตีความตามที่ผู้ใช้เลือก (19 ต.ค. 2026): ระบบไม่สร้างนัดหมาย → TC-021 = หน้าต่างแสดงรอบเติมยาพร้อมวันที่ · TC-023 = แท็บ Order เติมยาของห้องยามี Task แต่ละรอบผูกกับออเดอร์นี้ (ไม่กดปุ่มในแถว)
// TC ที่ไม่ผ่านไม่หยุดเทส (soft) — เทสจบไม่ผ่านพร้อมรายการขั้น · ไม่ปิด Visit (R11) · คลิปแยกต่อ TC (R61)
// ทำต่อกับผู้ป่วยเดิม (เช็คอินแล้ว ตะกร้ายังว่าง): SBH841_VISIT=<HN>,<VN>,<EN>
// รัน dev-x: npx playwright test --headed --grep @SBH-841 --output=.cache/run-841

const MED_REFILL = { code: 'med0000005', name: 'BETAMED' };
const MED_NORMAL = { code: 'med0000006', name: 'LINCOMYCIN' };
const MED_REFILL2 = { code: 'med0000007', name: 'GPO-L-ONE' };
const ROUNDS = 3;
const PERIOD_DAYS = 7;
const TC = {
  '001': 'TC-001 (SBH-1611)', '002': 'TC-002 (SBH-1612)', '003': 'TC-003 (SBH-1613)', '004': 'TC-004 (SBH-1614)', '005': 'TC-005 (SBH-1615)',
  '006': 'TC-006 (SBH-1616)', '007': 'TC-007 (SBH-1617)', '008': 'TC-008 (SBH-1618)', '009': 'TC-009 (SBH-1619)', '010': 'TC-010 (SBH-1620)',
  '012': 'TC-012 (SBH-1622)', '013': 'TC-013 (SBH-1623)', '014': 'TC-014 (SBH-1624)', '021': 'TC-021 (SBH-1631)', '023': 'TC-023 (SBH-1633)',
  '024': 'TC-024 (SBH-1634)', '025': 'TC-025 (SBH-1635)',
} as const;
const ISSUES = ['SBH-841', 'SBH-1602', 'SBH-1611', 'SBH-1612', 'SBH-1613', 'SBH-1614', 'SBH-1615', 'SBH-1616', 'SBH-1617', 'SBH-1618', 'SBH-1619', 'SBH-1620', 'SBH-1622', 'SBH-1623', 'SBH-1624', 'SBH-1631', 'SBH-1633', 'SBH-1634', 'SBH-1635'];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/** วันที่ (เวลาเครื่อง) + n วัน → { be: '2569-10-26' (ช่องวันที่ในหน้าต่าง Refill), th: '26/10/2569' (ห้องยา), iso: '2026-10-26' } */
function dayPlus(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return { be: `${d.getFullYear() + 543}-${mm}-${dd}`, th: `${dd}/${mm}/${d.getFullYear() + 543}`, iso: `${d.getFullYear()}-${mm}-${dd}` };
}

test.describe('SBH-841 OPD Order Refill', () => {

  test(
    'ผู้ป่วย AUTO ใหม่: สั่งยา Refill 3 รอบ → ตะกร้า / tooltip / ตัวนับ → ส่งคำสั่ง → แก้แผน → ห้องยา Order เติมยา (Super_User)',
    { tag: ['@SBH-841', ...ISSUES.slice(1).map((id) => `@${id}`)], annotation: ISSUES.map(linear) },
    async ({ page }) => {
      test.setTimeout(1_500_000);
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
      const skip = (title: string, why: string) => failures.push(`${title} — ตรวจไม่ได้ (${why})`);

      // จดแจ้งเตือนทุกตัว (หายเองใน ~4.5 วินาที)
      await page.addInitScript(() => {
        const w = window as unknown as { __notices: string[] };
        w.__notices = [];
        new MutationObserver(() => {
          for (const el of document.querySelectorAll('.ant-notification-notice:not([data-seen]), .ant-message-notice:not([data-seen])')) {
            el.setAttribute('data-seen', '1');
            w.__notices.push((el.textContent ?? '').trim());
          }
        }).observe(document, { childList: true, subtree: true });
      });
      const notices = () => page.evaluate(() => (window as unknown as { __notices?: string[] }).__notices ?? []).catch(() => [] as string[]);
      /** รอแจ้งเตือนที่ตรง pattern ตัวใหม่ (นับจากจำนวนก่อนกด) → ข้อความ หรือ '' ถ้าไม่ขึ้น */
      const waitNotice = async (before: number, pattern: RegExp, timeout = 20_000): Promise<string> => {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
          const found = (await notices()).slice(before).find((text) => pattern.test(text));
          if (found) return found;
          await page.waitForTimeout(250);
        }
        return '';
      };
      const toast = (pattern: RegExp) => page.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: pattern }).last();

      // ── Pre-condition ──
      let [hn, vn, en] = (process.env.SBH841_VISIT ?? '').split(',');
      let clinic = '';
      if (!hn) {
        const patient = newTestPatient('Refill841');
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
          await markEvidence(expected(main.getByText(`HN ${hn}`, { exact: true }).first()));
        });
        await checkStep(page, 'Pre-condition เปิด Visit OPD แผนกอายุรกรรม', async () => {
          if (newVisitEnabled) await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          vn = opd.vn;
          en = opd.en;
          clinic = opd.clinic;
          note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${hn} · ${vn} · EN (OPD) ${en} · ${opd.clinic} · ${opd.doctor}`);
          console.log(`    ทำต่อกับรายเดิม: SBH841_VISIT=${hn},${vn},${en}`);
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
        await selectOpdUnit(page);
      }

      const visitBar = main.getByText(`VN ${vn}`, { exact: true }).first();
      const refillButton = main.getByRole('button', { name: /^refill/i });
      const dialog = page.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' });
      const confirmButton = dialog.getByRole('button', { name: 'ยืนยัน', exact: true });
      const cancelButton = dialog.getByRole('button', { name: 'ยกเลิก', exact: true });
      const drugRow = (name: string) => dialog.locator('tbody tr').filter({ hasText: name }).first();
      /** ช่องที่แก้ได้ของแถวยา: [จำนวนยาที่จ่ายทั้งหมด (มีเมื่อยามีแผนแล้ว), รอบ 1, รอบ 2, …] */
      const editable = (name: string) => drugRow(name).locator('input:not([disabled])');
      const dispenseNow = (name: string) => drugRow(name).locator('input[disabled]').first();
      const roundInputs = async (name: string): Promise<Locator[]> => {
        const all = editable(name);
        const n = await all.count();
        return Array.from({ length: n }, (_, i) => all.nth(i)).slice(n > ROUNDS ? n - ROUNDS : 0);
      };
      const totalInput = (name: string) => editable(name).first();
      const values = (inputs: Locator[]) => Promise.all(inputs.map((input) => input.inputValue()));
      const roundHeaders = dialog.getByText(/^เติมยาครั้งที่ \d+$/);
      const roundDates = dialog.locator('.ant-picker input:not([disabled])');
      // .filter({ visible: true }): สลับสวิตช์ ขยาย แล้วตารางอีกแบบยังค้างใน DOM (ซ่อน) — แถวแรกที่เจอเป็นของตารางที่ซ่อนได้
      const basketRow = (code: string) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      const remedIcon = (code: string) => basketRow(code).locator('[aria-label="Remed"]').first();
      const qtyCell = (code: string) => basketRow(code).locator('td').filter({ has: page.locator('[aria-label="Remed"]') }).first();
      const tooltip = page.locator('.ant-tooltip:visible').last();

      /** เปิดหน้า EMR จากรายการผู้ป่วยนอก (คลิกชื่อในแถว) แบบที่ผู้ใช้ทำจริง แล้วปิดแผงซ้าย (OPD Note) ให้ตารางยากว้างพอ */
      const openEmrFromOpdList = async () => {
        if (!/\/opd\/patient-list/.test(page.url())) await selectOpdUnit(page);
        const row = await opdListRow(page, hn);
        const name = row.getByText(/AUTO\s/).first();
        await markEvidence(clicked(name));
        await snapEvidence(page, 'ก่อนกด — ชื่อผู้ป่วยในรายการผู้ป่วยนอก');
        await name.click();
        await expect(visitBar, 'เปิดหน้า EMR แล้วต้องเห็นแถบ Visit ของผู้ป่วย').toBeVisible({ timeout: 90_000 });
        await expect(main.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
        await closeLeftPanels();
        note('URL หน้า EMR', page.url());
      };
      /** ปิดแท็บแผงซ้าย (ประวัติการรักษา / OPD Note) — ไม่ใช่ขั้นของ TC (ตารางยากว้างเกินแผง) */
      const closeLeftPanels = async () => {
        for (const name of ['OPD', 'ประวัติการรักษา']) {
          const tab = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
          if (await tab.count()) await tab.first().locator('.dv-default-tab-action').click().catch(() => undefined);
        }
        await page.mouse.move(700, 1000);
      };
      const openRefillDialog = async () => {
        await expect(refillButton).toBeVisible({ timeout: 30_000 });
        await markEvidence(clicked(refillButton));
        await snapEvidence(page, 'ก่อนกด — ปุ่ม refill');
        await refillButton.click();
        await expect(dialog, 'กดปุ่ม refill แล้วต้องเปิดหน้าต่าง "จัดการการเติมยา (Refill)"').toBeVisible({ timeout: 20_000 });
        await expect(drugRow(MED_REFILL.name)).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(1_000); // ค่าของแผนเดิมเติมตามหลัง
      };
      /** กดยืนยันแผน → แจ้งเตือนสำเร็จ + หน้าต่างปิด */
      const saveRefillPlan = async (tag: string) => {
        const before = (await notices()).length;
        await markEvidence(clicked(confirmButton));
        await snapEvidence(page, `ก่อนกด — ยืนยันแผน Refill (${tag})`);
        await confirmButton.click();
        const text = await waitNotice(before, /refill|เติมยา|กรุณา/i);
        note(`แจ้งเตือนหลังยืนยันแผน (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        expect(text, 'ยืนยันแผนแล้วต้องขึ้นแจ้งเตือนสร้างแผนเติมยาสำเร็จ').toMatch(/successfully|สำเร็จ/i);
        await expect(dialog).toBeHidden({ timeout: 15_000 });
      };
      const closeDialog = async () => {
        if (await dialog.isVisible().catch(() => false)) {
          await cancelButton.click();
          await expect(dialog).toBeHidden({ timeout: 10_000 });
        }
      };
      const hoverTooltip = async (code: string): Promise<string> => {
        await remedIcon(code).hover();
        await expect(tooltip).toBeVisible({ timeout: 10_000 });
        return squash(await tooltip.innerText());
      };

      // ── TC-001 เปิดหน้าจัดการการเติมยา + กำหนดจำนวนครั้ง 3 ครั้ง ──
      await startClip(page, 'TC-001');
      const opened = await soft(`${TC['001']} ขั้น 1 เปิดหน้า EMR → แผงคำสั่งการรักษา`, async () => {
        await openEmrFromOpdList();
        await expect(page.getByRole('combobox', { name: /ค้นหา ยา/ })).toBeVisible({ timeout: 60_000 });
        if (!clinic) clinic = squash((await main.getByText(/ห้องตรวจ/).first().innerText().catch(() => '')) || '');
        await markEvidence(expected(visitBar), expected(page.getByRole('combobox', { name: /ค้นหา ยา/ })));
      });
      let dialogOk = false;
      if (opened) {
        await soft(`${TC['001']} ขั้น 2 ค้นหาและเพิ่มยา ${MED_REFILL.code} + ${MED_NORMAL.code} ลงตะกร้า`, async () => {
          for (const med of [MED_REFILL, MED_NORMAL]) {
            await addMedicineToCart(page, med.code);
            await expect(basketRow(med.code), `ยา ${med.code} ต้องขึ้นในตะกร้า`).toBeVisible({ timeout: 30_000 });
          }
          await markEvidence(expected(basketRow(MED_REFILL.code)), expected(basketRow(MED_NORMAL.code)));
          await holdForClip(page);
        });
        dialogOk = await soft(`${TC['001']} ขั้น 3-4 กดปุ่ม Refill → ระยะเวลาต่อรอบ ${PERIOD_DAYS} วัน → เพิ่มครั้ง ${ROUNDS} ครั้ง`, async () => {
          note('ปุ่ม refill ก่อนกำหนดแผน', squash(await refillButton.innerText()));
          await openRefillDialog();
          const period = dialog.getByRole('spinbutton').first();
          await period.fill(String(PERIOD_DAYS));
          const add = dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
          for (let i = 0; i < ROUNDS; i++) {
            await add.click();
            await expect(roundHeaders).toHaveCount(i + 1, { timeout: 10_000 });
          }
          await markEvidence(filled(period), clicked(add), expected(roundHeaders.last()), expected(dialog.getByText('จัดการการเติมยา (Refill)')));
          await holdForClip(page);
          await expect(roundHeaders, `ต้องกำหนดจำนวนครั้งที่เติมยาได้ ${ROUNDS} ครั้ง`).toHaveCount(ROUNDS);
          note('TC-001 ข้อสังเกต', `ช่อง "จำนวนยาทั้งหมดตามแผน" ไม่มีตอนสร้างแผนครั้งแรก — ใช้จำนวนที่สั่งในตะกร้า (${MED_REFILL.name} 7 ขวด) · ช่องนี้ขึ้นเมื่อเปิดหน้าต่างอีกครั้งหลังบันทึกแผน`);
        });
      }

      // ── TC-002 กำหนดจำนวนจ่ายรายงวด → ยืนยัน → ค่าแสดงในตะกร้า ──
      await startClip(page, 'TC-002');
      let planSaved = false;
      const plan = { total: '', now: '', rounds: [] as string[], dates: [] as string[] };
      if (dialogOk) {
        planSaved = await soft(`${TC['002']} ขั้น 1-4 กำหนดรอบละ 1 (จ่ายครั้งนี้คำนวณเอง) → ยืนยัน → ตะกร้าแสดงจำนวนจ่ายครั้งนี้`, async () => {
          const rounds = await roundInputs(MED_REFILL.name);
          expect(rounds.length, 'แถวยาต้องมีช่องจำนวนครบทุกรอบ').toBe(ROUNDS);
          const before = await dispenseNow(MED_REFILL.name).inputValue();
          for (const input of rounds) {
            await input.fill('1');
            await input.press('Tab');
          }
          await expect(dispenseNow(MED_REFILL.name), 'จ่ายครั้งนี้ = ยอดรวม − ผลรวมรอบ').toHaveValue(String(Number(before) - ROUNDS));
          plan.total = before;
          plan.now = await dispenseNow(MED_REFILL.name).inputValue();
          plan.rounds = await values(rounds);
          plan.dates = await roundDates.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
          note('แผนที่กำหนด', `${MED_REFILL.name} ยอด ${plan.total} · จ่ายครั้งนี้ ${plan.now} · รอบ ${plan.rounds.join(' / ')} · วันที่รอบ ${plan.dates.join(' / ')}`);
          await markEvidence(...rounds.map(filled), expected(dispenseNow(MED_REFILL.name)));
          await holdForClip(page);
          await saveRefillPlan('TC-002');
          await expect(qtyCell(MED_REFILL.code), 'ตะกร้าต้องแสดงจำนวนจ่ายครั้งนี้ของยา Refill').toContainText(plan.now, { timeout: 15_000 });
          await markEvidence(expected(qtyCell(MED_REFILL.code)), expected(remedIcon(MED_REFILL.code)));
          await holdForClip(page);
        });
      } else skip(`${TC['002']}`, 'เปิดหน้าต่าง Refill ไม่สำเร็จ');

      // ── TC-004 / TC-005 จำนวน x / y และ Refill x of y ──
      let tip = '';
      await startClip(page, 'TC-004');
      if (planSaved) {
        await soft(`${TC['004']} ขั้น 1-3 คอลัมน์จำนวนของยา Refill แสดงจ่ายครั้งนี้ / ทั้งหมด`, async () => {
          tip = await hoverTooltip(MED_REFILL.code);
          note('tooltip จำนวนยา Refill', tip);
          await markEvidence(expected(qtyCell(MED_REFILL.code)), expected(tooltip));
          await holdForClip(page, 1_800);
          expect(tip, `ต้องแสดง ${plan.now} / ${plan.total}`).toContain(`${plan.now} / ${plan.total}`);
          note('TC-004 ข้อสังเกต', `คอลัมน์จำนวนแสดงไอคอน Refill + "${plan.now}" · รูปแบบ "${plan.now} / ${plan.total}" อยู่ใน tooltip เมื่อวางเมาส์ที่ไอคอน`);
        });
      } else skip(`${TC['004']}`, 'บันทึกแผน Refill ไม่สำเร็จ');
      await page.mouse.move(700, 1000);
      await startClip(page, 'TC-005');
      if (planSaved) {
        await soft(`${TC['005']} ขั้น 1-3 Badge Refill 0 of ${ROUNDS}`, async () => {
          tip = await hoverTooltip(MED_REFILL.code);
          await markEvidence(expected(remedIcon(MED_REFILL.code)), expected(tooltip));
          await holdForClip(page, 1_800);
          expect(tip, `ต้องแสดง Refill 0 of ${ROUNDS}`).toContain(`Refill 0 of ${ROUNDS}`);
          note('TC-005 ข้อสังเกต', `"Refill 0 of ${ROUNDS}" อยู่ใน tooltip ของไอคอน Refill (ไม่มีป้าย Badge แสดงค้างในตาราง)`);
        });
      } else skip(`${TC['005']}`, 'บันทึกแผน Refill ไม่สำเร็จ');
      await page.mouse.move(700, 1000);

      // ── TC-006 ตัวนับ Refill (n) ที่หัวตาราง ──
      await startClip(page, 'TC-006');
      let secondRefill = false;
      if (planSaved) {
        secondRefill = await soft(`${TC['006']} ขั้น 1-4 Refill (1) → เพิ่ม ${MED_REFILL2.code} เปิด Refill → Refill (2) (ยาปกติไม่นับ)`, async () => {
          await expect(refillButton, 'ยา Refill 1 ตัว + ยาปกติ 1 ตัว → refill (1)').toHaveText(/refill\s*\(1\)/i);
          await markEvidence(expected(refillButton), expected(basketRow(MED_NORMAL.code)));
          await snapEvidence(page, 'ขั้น 2 หัวตาราง refill (1)');
          await addMedicineToCart(page, MED_REFILL2.code);
          await expect(basketRow(MED_REFILL2.code)).toBeVisible({ timeout: 30_000 });
          await openRefillDialog();
          const first = (await roundInputs(MED_REFILL2.name))[0];
          await first.fill('1');
          await first.press('Tab');
          await markEvidence(filled(first));
          await holdForClip(page);
          await saveRefillPlan('TC-006');
          await expect(refillButton, 'เพิ่มยา Refill อีก 1 ตัว → refill (2)').toHaveText(/refill\s*\(2\)/i, { timeout: 15_000 });
          await markEvidence(expected(refillButton), expected(remedIcon(MED_REFILL2.code)));
          await holdForClip(page);
        });
      } else skip(`${TC['006']}`, 'บันทึกแผน Refill ไม่สำเร็จ');

      // ── TC-025 ยาปกติไม่แสดง x / y / Badge และไม่ถูกนับ ──
      await startClip(page, 'TC-025');
      if (planSaved) {
        await soft(`${TC['025']} ขั้น 1-3 ยาปกติไม่มีไอคอน Refill / ไม่แสดง x / y และไม่ถูกนับ`, async () => {
          const normal = basketRow(MED_NORMAL.code);
          await expect(normal.locator('[aria-label="Remed"]'), 'ยาปกติต้องไม่มีไอคอน Refill (tooltip x / y · Refill x of y)').toHaveCount(0);
          expect(squash(await normal.innerText()), 'ยาปกติต้องไม่แสดงรูปแบบ x / y').not.toMatch(/\d+\s*\/\s*\d+/);
          const count = Number((await refillButton.innerText()).match(/\((\d+)\)/)?.[1] ?? NaN);
          const refillRows = await main.locator('tr.ant-table-row').filter({ has: page.locator('[aria-label="Remed"]') }).count();
          await showCompareTable(page, 'ตัวนับ refill (n) เทียบจำนวนแถวที่มีไอคอน Refill', ['ค่า', 'ผล'], [
            { label: 'ตัวเลขในปุ่ม refill (n)', values: [String(count), ''], same: true },
            { label: 'แถวยาในตะกร้าที่มีไอคอน Refill', values: [String(refillRows), refillRows === count ? 'ตรงกัน' : 'ไม่ตรง'], same: refillRows === count },
            { label: `ยาปกติ ${MED_NORMAL.code}`, values: ['ไม่มีไอคอน Refill', 'ไม่ถูกนับ'], same: true },
          ], { side: 'bottom' });
          await markEvidence(expected(normal), expected(refillButton));
          await holdForClip(page, 1_800);
          expect(count, 'refill (n) ต้องเท่ากับจำนวนยาที่เปิด Refill (ไม่รวมยาปกติ)').toBe(refillRows);
        });
        await hideCompareTable(page);
      } else skip(`${TC['025']}`, 'บันทึกแผน Refill ไม่สำเร็จ');

      // ── TC-007 หน้าจัดการการเติมยาแสดงจ่ายครั้งนี้ / ทั้งหมด / รายงวด ──
      await startClip(page, 'TC-007');
      if (planSaved) {
        await soft(`${TC['007']} ขั้น 1-2 เปิดหน้าต่างอีกครั้ง → จำนวนตรงกับที่กำหนด`, async () => {
          await openRefillDialog();
          const shown = { total: await totalInput(MED_REFILL.name).inputValue(), now: await dispenseNow(MED_REFILL.name).inputValue(), rounds: await values(await roundInputs(MED_REFILL.name)) };
          await showCompareTable(page, `${MED_REFILL.name} — ค่าที่กำหนดตอนสั่งยา เทียบหน้าต่างที่เปิดใหม่`, ['ตอนกำหนด', 'เปิดใหม่'], [
            { label: 'จำนวนยาที่จ่ายทั้งหมด', values: [plan.total, shown.total], same: plan.total === shown.total },
            { label: 'จ่ายครั้งนี้', values: [plan.now, shown.now], same: plan.now === shown.now },
            ...plan.rounds.map((v, i) => ({ label: `เติมยาครั้งที่ ${i + 1}`, values: [v, shown.rounds[i] ?? '-'], same: v === shown.rounds[i] })),
          ], { side: 'bottom' });
          await markEvidence(expected(dispenseNow(MED_REFILL.name)), expected(totalInput(MED_REFILL.name)), ...(await roundInputs(MED_REFILL.name)).map(expected));
          await holdForClip(page, 2_000);
          expect(shown).toEqual({ total: plan.total, now: plan.now, rounds: plan.rounds });
          note('TC-007 ข้อสังเกต', 'หน้าต่างไม่มีช่อง "จำนวนคงเหลือ" แยกของแต่ละงวด — แสดงจ่ายครั้งนี้ + จำนวนยาที่จ่ายทั้งหมด + จำนวนของแต่ละรอบ');
        });
        await hideCompareTable(page);
        await closeDialog().catch(() => undefined);
      } else skip(`${TC['007']}`, 'บันทึกแผน Refill ไม่สำเร็จ');

      // ── TC-013 ช่องจำนวนใน Order Table (โหมดขยาย) ──
      await startClip(page, 'TC-013');
      const expand = main.getByText('ขยาย', { exact: true }).locator('xpath=ancestor::*[.//*[@role="switch"]][1]').getByRole('switch').first();
      /** ปิดโหมดขยาย (ตารางแบบย่อมีเซลล์จำนวน + ไอคอน Refill ที่ TC อื่นใช้) */
      const collapse = async () => {
        if ((await expand.getAttribute('aria-checked').catch(() => 'false')) === 'true') await expand.click().catch(() => undefined);
        await page.waitForTimeout(800);
      };
      if (planSaved) {
        await soft(`${TC['013']} ขั้น 1-3 เปิดสวิตช์ ขยาย → ยา Refill ไม่มีช่องแก้จำนวน (ยาปกติมี)`, async () => {
          await markEvidence(clicked(expand));
          await snapEvidence(page, 'ก่อนกด — สวิตช์ ขยาย');
          if ((await expand.getAttribute('aria-checked')) !== 'true') await expand.click();
          const normalQty = basketRow(MED_NORMAL.code).locator('input:not([type="checkbox"])');
          await expect(normalQty, 'โหมดขยาย: ยาปกติต้องมีช่องแก้จำนวน').toBeVisible({ timeout: 10_000 });
          const refillInputs = basketRow(MED_REFILL.code).locator('input:not([type="checkbox"])');
          await expect(refillInputs, 'ยา Refill ต้องไม่มีช่องแก้จำนวนในตาราง').toHaveCount(0);
          // คลิกที่จำนวนของยา Refill — เป็นข้อความ ไม่มีช่องให้พิมพ์
          const refillQty = basketRow(MED_REFILL.code).locator('td').filter({ hasText: new RegExp(`^\\s*${plan.now}\\s*$`) }).first();
          await refillQty.click();
          await expect(basketRow(MED_REFILL.code).locator('input:focus'), 'คลิกแล้วต้องไม่มีช่องรับการพิมพ์').toHaveCount(0);
          await markEvidence(expected(refillQty), expected(normalQty));
          await holdForClip(page, 1_800);
        });
        await collapse();
      } else skip(`${TC['013']}`, 'บันทึกแผน Refill ไม่สำเร็จ');

      // ── TC-014 หน้าแก้ไขยาปกติ: ช่องจำนวน Disable · แก้ได้เฉพาะหน้าต่าง Refill ──
      await startClip(page, 'TC-014');
      if (planSaved) {
        await soft(`${TC['014']} ขั้น 1-3 แก้ไขยา (ดินสอ) → จำนวนที่จ่าย Disable → หน้าต่าง Refill แก้ได้`, async () => {
          const edit = basketRow(MED_REFILL.code).getByRole('button', { name: 'แก้ไข' });
          await markEvidence(clicked(edit));
          await snapEvidence(page, 'ก่อนกด — แก้ไขยา Refill');
          await edit.click();
          const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
          await expect(qty).toBeVisible({ timeout: 20_000 });
          await qty.scrollIntoViewIfNeeded();
          await markEvidence(expected(qty));
          await holdForClip(page, 1_800);
          await expect(qty, 'ช่องจำนวนที่จ่ายของยา Refill ต้องถูก Disable').toBeDisabled();
          // ปิดหน้าแก้ไข: โหลดหน้าใหม่ (ปุ่ม "ยกเลิก" ของแถวในตะกร้า = ยกเลิกรายการยา ห้ามกด)
          await page.reload();
          await expect(visitBar).toBeVisible({ timeout: 90_000 });
          await expect(basketRow(MED_REFILL.code)).toBeVisible({ timeout: 60_000 });
          await closeLeftPanels();
          await openRefillDialog();
          const round = (await roundInputs(MED_REFILL.name))[0];
          await expect(round, 'ช่องจำนวนรอบในหน้าต่าง Refill ต้องแก้ได้').toBeEditable();
          await round.fill('2');
          await expect(dispenseNow(MED_REFILL.name)).toHaveValue(String(Number(plan.total) - Number(plan.rounds.reduce((a, b) => a + Number(b), 0)) - 1));
          await markEvidence(filled(round), expected(dispenseNow(MED_REFILL.name)));
          await holdForClip(page, 1_500);
          await closeDialog(); // ไม่บันทึก — คงแผนเดิมไว้ให้ TC ถัดไป
        });
      } else skip(`${TC['014']}`, 'บันทึกแผน Refill ไม่สำเร็จ');

      // ── TC-024 ยาปกติแก้จำนวนใน Order Table ได้ตามเดิม (ส่งคำสั่งใน TC-003) ──
      await startClip(page, 'TC-024');
      let normalEdited = false;
      if (opened) {
        normalEdited = await soft(`${TC['024']} ขั้น 1-2 ยาปกติ: แก้จำนวนในตาราง (โหมดขยาย) 1 → 2`, async () => {
          if ((await expand.getAttribute('aria-checked')) !== 'true') await expand.click();
          const qty = basketRow(MED_NORMAL.code).locator('input:not([type="checkbox"])');
          await expect(qty, 'ยาปกติต้องมีช่องแก้จำนวน').toBeEditable({ timeout: 10_000 });
          await qty.fill('2');
          await qty.press('Enter');
          await page.waitForTimeout(2_000);
          await markEvidence(filled(qty), expected(basketRow(MED_NORMAL.code)));
          await holdForClip(page);
          await collapse();
          await expect(basketRow(MED_NORMAL.code), 'จำนวนยาปกติในตะกร้าต้องเป็น 2 (ราคา 2 × 3.50 = 7.00)').toContainText('7.00', { timeout: 15_000 });
          await markEvidence(expected(basketRow(MED_NORMAL.code)));
          await holdForClip(page);
        });
      }

      await collapse();

      // ── TC-003 ส่งคำสั่ง → เปิดหน้าต่างอีกครั้ง ค่าครบ ──
      await startClip(page, 'TC-003');
      let sent = false;
      if (planSaved) {
        sent = await soft(`${TC['003']} ขั้น 2 กดส่งคำสั่ง (Sign Order)`, async () => {
          await page.keyboard.press('Escape');
          const submit = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
          const before = (await notices()).length;
          await markEvidence(clicked(submit));
          await snapEvidence(page, 'ก่อนกด — ส่งคำสั่ง');
          await submit.click();
          const text = await waitNotice(before, /ส่งคำสั่ง/, 60_000);
          note('แจ้งเตือนหลังส่งคำสั่ง', text || '(ไม่เห็นแจ้งเตือน)');
          expect(text, 'ส่งคำสั่งแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/สำเร็จ/);
          if (await toast(/ส่งคำสั่ง/).isVisible().catch(() => false)) await markEvidence(alerted(toast(/ส่งคำสั่ง/)));
          await holdForClip(page);
        });
        if (sent) {
          if (normalEdited) {
            await soft(`${TC['024']} ขั้น 3 ส่งคำสั่งยาปกติที่แก้จำนวนแล้ว (ใน TC-003)`, async () => {
              await expect(basketRow(MED_NORMAL.code)).toContainText('7.00');
              note('TC-024 ขั้น 3', 'ส่งคำสั่งพร้อมยา Refill ในขั้น TC-003 ขั้น 2 — แจ้งเตือน "ส่งคำสั่งสำเร็จ"');
            });
          }
          await soft(`${TC['003']} ขั้น 3 เปิดหน้าต่าง Refill อีกครั้ง → ค่าตรงกับที่กำหนดก่อนบันทึก`, async () => {
            await openRefillDialog();
            const rows = [
              { label: 'จำนวนครั้งที่เติมยา (Refill Number)', before: String(ROUNDS), after: String(await roundHeaders.count()) },
              { label: `${MED_REFILL.name} จำนวนยาที่จ่ายทั้งหมด`, before: plan.total, after: await totalInput(MED_REFILL.name).inputValue() },
              { label: `${MED_REFILL.name} จ่ายครั้งนี้`, before: plan.now, after: await dispenseNow(MED_REFILL.name).inputValue() },
              ...(await values(await roundInputs(MED_REFILL.name))).map((v, i) => ({ label: `${MED_REFILL.name} เติมยาครั้งที่ ${i + 1}`, before: plan.rounds[i], after: v })),
              { label: `${MED_REFILL2.name} เติมยาครั้งที่ 1`, before: '1', after: (await values(await roundInputs(MED_REFILL2.name)))[0] ?? '-' },
            ];
            await showCompareTable(page, 'ค่าที่กำหนดก่อนส่งคำสั่ง เทียบหน้าต่างที่เปิดหลังส่ง', ['ก่อนส่ง', 'หลังส่ง'], rows.map((r) => ({ label: r.label, values: [r.before, r.after], same: r.before === r.after })), { side: 'bottom' });
            await markEvidence(expected(roundHeaders.last()), expected(totalInput(MED_REFILL.name)), expected(dispenseNow(MED_REFILL.name)));
            await holdForClip(page, 2_000);
            for (const r of rows) expect(r.after, r.label).toBe(r.before);
          });
          await hideCompareTable(page);
        }
      } else skip(`${TC['003']}`, 'บันทึกแผน Refill ไม่สำเร็จ');

      // ── TC-021 ส่วนรอบเติมยา (วันที่) ในหน้าจัดการการเติมยา ──
      await startClip(page, 'TC-021');
      if (planSaved) {
        await soft(`${TC['021']} ขั้น 1-3 หน้าต่างแสดงรอบเติมยาพร้อมวันที่ (ระยะ ${PERIOD_DAYS} วัน)`, async () => {
          if (!(await dialog.isVisible())) await openRefillDialog();
          const dates = await roundDates.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
          const want = Array.from({ length: ROUNDS }, (_, i) => dayPlus(PERIOD_DAYS * (i + 1)).be);
          await showCompareTable(page, 'วันที่ของรอบเติมยา (ระยะเวลาต่อรอบ 7 วัน นับจากวันนี้)', ['ที่ควรเป็น', 'บนหน้าต่าง'], want.map((w, i) => ({ label: `เติมยาครั้งที่ ${i + 1}`, values: [w, dates[i] ?? '-'], same: w === dates[i] })), { side: 'bottom' });
          await markEvidence(...Array.from({ length: ROUNDS }, (_, i) => expected(roundDates.nth(i))), expected(roundHeaders.first()));
          await holdForClip(page, 2_000);
          expect(dates.slice(0, ROUNDS)).toEqual(want);
          note('TC-021 ตีความ', 'ระบบไม่สร้างนัดหมาย (Appointment) — ตรวจส่วนรอบเติมยา "เติมยาครั้งที่ n" + วันที่ของแต่ละรอบแทน (ผู้ใช้เลือก 19 ต.ค. 2026)');
        });
        await hideCompareTable(page);
        await closeDialog().catch(() => undefined);
      } else skip(`${TC['021']}`, 'บันทึกแผน Refill ไม่สำเร็จ');

      // ── TC-008 แก้จำนวนรายงวดหลังส่งคำสั่ง → ตารางอัปเดต ──
      await startClip(page, 'TC-008');
      const edited = { now: '' };
      if (sent) {
        await soft(`${TC['008']} ขั้น 1-4 แก้รอบ 1 เป็น 2 → ยืนยัน → ตะกร้าแสดงจ่ายครั้งนี้ใหม่`, async () => {
          await openRefillDialog();
          const round = (await roundInputs(MED_REFILL.name))[0];
          await round.fill('2');
          await round.press('Tab');
          edited.now = String(Number(plan.now) - 1);
          await expect(dispenseNow(MED_REFILL.name), 'หน้าต่างคำนวณจ่ายครั้งนี้ใหม่').toHaveValue(edited.now);
          await markEvidence(filled(round), expected(dispenseNow(MED_REFILL.name)));
          await holdForClip(page);
          await saveRefillPlan('TC-008');
          // รอตารางอัปเดตได้ถึง 20 วินาที (Retest 19 ต.ค. 2026: ผู้ใช้ทำมือแล้วตารางเปลี่ยนตาม) — ยังไม่เปลี่ยนค่อยโหลดหน้าใหม่ดูซ้ำ
          const started = Date.now();
          const updated = await expect(qtyCell(MED_REFILL.code)).toHaveText(new RegExp(`^\\s*${edited.now}\\s*$`), { timeout: 20_000 }).then(() => true, () => false);
          note('TC-008 ตะกร้าหลังยืนยัน', updated ? `อัปเดตเป็น ${edited.now} ภายใน ${((Date.now() - started) / 1000).toFixed(1)} วินาที (ไม่ต้องโหลดหน้าใหม่)` : `ไม่อัปเดตภายใน 20 วินาที (ยัง ${squash(await qtyCell(MED_REFILL.code).innerText())})`);
          if (!updated) {
            await page.reload();
            await expect(basketRow(MED_REFILL.code)).toBeVisible({ timeout: 90_000 });
            await expect(main.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
            await closeLeftPanels();
            await page.waitForTimeout(2_000);
            note('TC-008 ตะกร้าหลังโหลดหน้าใหม่', squash(await qtyCell(MED_REFILL.code).innerText()));
          }
          const cell = squash(await qtyCell(MED_REFILL.code).innerText());
          tip = await hoverTooltip(MED_REFILL.code);
          await showCompareTable(page, `${MED_REFILL.name} หลังแก้รอบ 1 (1 → 2)`, ['ที่ควรเป็น', 'ตะกร้า'], [
            { label: 'จำนวน (จ่ายครั้งนี้)', values: [edited.now, cell], same: cell === edited.now },
            { label: 'tooltip', values: [`${edited.now} / ${plan.total}`, tip], same: tip.includes(`${edited.now} / ${plan.total}`) },
          ], { side: 'bottom' });
          await markEvidence(expected(qtyCell(MED_REFILL.code)), expected(tooltip));
          await holdForClip(page, 2_000);
          expect(cell, 'ตะกร้าต้องแสดงจ่ายครั้งนี้ตามแผนที่แก้').toBe(edited.now);
        });
        await hideCompareTable(page);
        await page.mouse.move(700, 1000);
      } else skip(`${TC['008']}`, 'ส่งคำสั่งไม่สำเร็จ');

      // ── TC-009 / TC-010 / TC-012 เปลี่ยนยอดรวมตามแผน · รีเซ็ต · ยอดไม่ตรง ──
      const newTotal = String(Number(plan.total) + 3);
      const confirmModal = page.getByRole('dialog').filter({ hasText: 'ยืนยันการเปลี่ยนจำนวนยาที่จ่ายทั้งหมด' });
      await startClip(page, 'TC-009');
      let warned = false;
      if (planSaved) {
        warned = await soft(`${TC['009']} ขั้น 1-3 แก้จำนวนยาทั้งหมดตามแผน ${plan.total} → ${newTotal} → ข้อความยืนยันการรีเซ็ต`, async () => {
          await openRefillDialog();
          const total = totalInput(MED_REFILL.name);
          await total.fill(newTotal);
          await total.press('Tab');
          await expect(confirmModal, 'ต้องมีหน้าต่างให้ยืนยันก่อนเปลี่ยนแผน').toBeVisible({ timeout: 10_000 });
          const text = squash(await confirmModal.innerText());
          note('ข้อความยืนยันเปลี่ยนแผน', text);
          await markEvidence(filled(total), alerted(confirmModal.locator('.ant-modal-confirm-body, .ant-modal-body').first()));
          await holdForClip(page, 2_000);
          expect(text, 'ข้อความต้องบอกว่าจะรีเซ็ตจำนวนของรอบที่ยังไม่จ่ายเป็น 0').toMatch(/ยังไม่จ่าย.*0|0.*ยังไม่จ่าย/);
        });
      } else skip(`${TC['009']}`, 'บันทึกแผน Refill ไม่สำเร็จ');

      await startClip(page, 'TC-010');
      if (warned) {
        await soft(`${TC['010']} ขั้น 1-3 ยืนยันเปลี่ยนแผน → รอบที่ยังไม่จ่ายเป็น 0 → บันทึกไม่ได้จนกว่าแบ่งใหม่`, async () => {
          const ok = confirmModal.getByRole('button', { name: 'ยืนยัน', exact: true });
          await markEvidence(clicked(ok));
          await snapEvidence(page, 'ก่อนกด — ยืนยันเปลี่ยนแผน');
          await ok.click();
          await expect(confirmModal).toBeHidden({ timeout: 10_000 });
          const rounds = await roundInputs(MED_REFILL.name);
          const after = await values(rounds);
          await markEvidence(...rounds.map(expected), expected(dispenseNow(MED_REFILL.name)));
          await holdForClip(page, 1_500);
          expect(after, 'รอบที่ยังไม่จ่ายต้องเป็น 0 ทุกรอบ').toEqual(Array(ROUNDS).fill('0'));
          const before = (await notices()).length;
          await markEvidence(clicked(confirmButton));
          await snapEvidence(page, 'ก่อนกด — ยืนยัน (ยังไม่แบ่งใหม่)');
          await confirmButton.click();
          const text = await waitNotice(before, /กรุณา|refill|เติมยา/i, 10_000);
          note('แจ้งเตือนเมื่อยังไม่แบ่งใหม่', text || '(ไม่เห็นแจ้งเตือน)');
          if (text) await markEvidence(alerted(toast(/กรุณา/)));
          await holdForClip(page, 1_500);
          await expect(dialog, 'ยังไม่แบ่งจำนวนใหม่ ต้องบันทึกไม่ได้ (หน้าต่างยังเปิด)').toBeVisible();
          expect(text, 'ต้องมีแจ้งเตือนให้แบ่งจำนวนก่อนบันทึก').toMatch(/กรุณา/);
        });
      } else skip(`${TC['010']}`, 'ไม่ได้หน้าต่างยืนยันเปลี่ยนแผนจาก TC-009');

      await startClip(page, 'TC-012');
      if (planSaved) {
        await soft(`${TC['012']} ขั้น 1-3 แบ่งรอบรวมเกินยอดตามแผน → บันทึกไม่ได้ + ข้อความเตือน`, async () => {
          if (!(await dialog.isVisible())) await openRefillDialog();
          const total = Number(await totalInput(MED_REFILL.name).inputValue());
          const each = String(Math.ceil(total / ROUNDS) + 1);
          const rounds = await roundInputs(MED_REFILL.name);
          for (const input of rounds) {
            await input.fill(each);
            await input.press('Tab');
          }
          const alert = dialog.locator('.ant-alert-error').filter({ hasText: /เกิน/ }).first();
          await expect(alert, 'ต้องมีข้อความเตือนว่าจำนวนรอบเกินยอดรวม').toBeVisible({ timeout: 10_000 });
          note('ข้อความเตือนยอดไม่ตรง', `รอบละ ${each} × ${ROUNDS} = ${Number(each) * ROUNDS} > ยอด ${total} → จ่ายครั้งนี้ ${await dispenseNow(MED_REFILL.name).inputValue()} · "${squash(await alert.innerText())}"`);
          await alert.scrollIntoViewIfNeeded();
          await markEvidence(...rounds.map(filled), alerted(alert), expected(dispenseNow(MED_REFILL.name)), expected(confirmButton));
          await holdForClip(page, 2_000);
          await expect(confirmButton, 'ปุ่มยืนยันต้องกดไม่ได้').toBeDisabled();
          note('TC-012 ข้อสังเกต', 'ผลรวมรอบน้อยกว่ายอดทำให้ยอดไม่ตรงไม่ได้ — ส่วนต่างไปอยู่ที่ "จ่ายครั้งนี้" เอง (Note ใน TC: ให้ระบบหักเอง) จึงตรวจกรณีรวมเกินยอด');
        });
      } else skip(`${TC['012']}`, 'บันทึกแผน Refill ไม่สำเร็จ');
      await closeDialog().catch(() => undefined); // ไม่บันทึก — แผนคงตาม TC-008

      // ── TC-023 ห้องยา → แท็บ Order เติมยา: Task แต่ละรอบผูกกับออเดอร์นี้ (อ่านอย่างเดียว) ──
      await startClip(page, 'TC-023');
      if (planSaved) {
        await soft(`${TC['023']} ขั้น 1-3 ห้องยา → Order เติมยา → Task แต่ละรอบของผู้ป่วยรายนี้`, async () => {
          await page.goto('/cortex/pharmacy/select-location');
          await main.getByRole('combobox').first().click();
          await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
          await page.waitForTimeout(800);
          await main.getByRole('combobox').nth(1).click();
          await page.waitForTimeout(800);
          await page.keyboard.press('Enter'); // ช่องบริการตัวแรก (dev-x มี 5 / 4)
          await page.getByRole('button', { name: 'ส่ง' }).click();
          await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
          const tab = page.getByRole('tab', { name: /Order เติมยา/ });
          await tab.click();
          const end = main.getByRole('textbox', { name: 'วันที่สิ้นสุด' });
          await expect(end).toBeVisible({ timeout: 30_000 });
          await end.click();
          await end.fill(dayPlus(PERIOD_DAYS * ROUNDS + 7).iso);
          await end.press('Enter');
          const search = main.getByRole('textbox', { name: /ค้นหา VN, HN/ });
          await search.fill(hn);
          await search.press('Enter');
          const rows = main.locator('tr.ant-table-row').filter({ hasText: `HN ${hn}` });
          await expect(rows, `ต้องมี Task เติมยา ${ROUNDS} รอบของ HN ${hn}`).toHaveCount(ROUNDS, { timeout: 30_000 });
          const texts = await rows.evaluateAll((els) => els.map((el) => (el.textContent ?? '').replace(/\s+/g, ' ')));
          const want = Array.from({ length: ROUNDS }, (_, i) => ({ round: `${i + 1}/${ROUNDS}`, date: dayPlus(PERIOD_DAYS * (i + 1)).th }));
          const compare = want.map((w) => {
            const hit = texts.find((t) => t.includes(w.round) && t.includes(w.date)) ?? '';
            const drug = hit.includes(MED_REFILL.name) || /\+\d/.test(hit);
            return { label: `รอบ ${w.round} · ${w.date}`, values: [`${MED_REFILL.name} · ${clinic || 'คลินิกของ Visit'}`, hit ? `${drug ? MED_REFILL.name : '(ไม่พบยา)'} · ${hit.match(/MED - S+/)?.[0] ?? '-'}` : '(ไม่พบ Task)'], same: !!hit && drug };
          });
          await showCompareTable(page, 'แผน Refill (CPOE) เทียบ Task ในแท็บ Order เติมยา', ['แผน', 'ห้องยา'], compare, { side: 'bottom' });
          await markEvidence(expected(tab), ...Array.from({ length: ROUNDS }, (_, i) => expected(rows.nth(i))));
          await holdForClip(page, 2_000);
          note('Task ในแท็บ Order เติมยา', texts.map(squash).join(' || '));
          for (const c of compare) expect(c.same, c.label).toBe(true);
          note('TC-023 ตีความ', 'ระบบไม่สร้างนัดหมาย — ตรวจ Task เติมยาแต่ละรอบในแท็บ "Order เติมยา" ของห้องยา (ผู้ป่วย / ยา / รอบ / วันที่มาเติม / คลินิก / แพทย์ผู้สั่ง ของออเดอร์นี้) · ไม่กดปุ่มในแถว');
        });
        await hideCompareTable(page);
      } else skip(`${TC['023']}`, 'บันทึกแผน Refill ไม่สำเร็จ');

      note('ผลรวม', failures.length ? `ไม่ผ่าน / ตรวจไม่ได้ ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
