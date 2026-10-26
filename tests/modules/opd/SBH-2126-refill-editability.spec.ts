import type { Locator, Page, Response } from '@playwright/test';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence } from '../../../helpers/functions/evidence';
import { finishVideo, startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';
import { saveWithRegeneratedUsage, setMealTiming } from '../../../helpers/functions/cpoe-usage';
import { notices, recordNotices, waitNotice } from '../../../helpers/functions/notices';
import { dayPlus } from '../../../helpers/functions/dates';
import { openDoctorWindow } from '../../../helpers/functions/windows';

// การ์ด SBH-2126 [CPOE][Pharmacy] กฎ Editability ของคำสั่ง Refill ให้เหมือน Order ปกติ — EXE SBH-2759 → TS SBH-2760 (HPY) / SBH-2761 (UHP) → TC-SBH-2126-001–007 (SBH-2762–2768)
// 1 เทส = 1 flow (R9) ใช้ Order เดียวกันต่อเนื่องตามลำดับใน EXE · ผู้ป่วย AUTO ใหม่ 1 ราย (ลงทะเบียน + Visit OPD ที่เวชระเบียน R53 → เช็คอิน) ทิ้ง Visit ไว้ (R11)
// บัญชี (ผู้ใช้เลือก 19 ต.ค. 2026): แพทย์ = Doctor (หน้าต่างแยก — ดร. วิชัย รัตน์ เอื้อเฟื้อ) · ห้องยา = Super_User (หน้าหลัก — dev-x ไม่มีบัญชีเภสัช)
// ยา A = med0000007 GPO-L-ONE 1 เม็ด/วัน 4 สัปดาห์ = 28 → Refill 3 รอบ รอบละ 7 (จ่ายครั้งนี้ 7 / ยอดรวม 28) · ยา B = med0000008 CLINDAVID-300 (ยาปกติ)
//   (ไม่ใช้ BETAMED: helper เลือก Route รับประทานให้ยาทาภายนอก → แก้ไขแล้ว UpsertOpdOrder ตอบ ErrInvalidAdministrationMode · ไม่ใช้ med0000006 ยาฉีดที่ตั้ง Route รับประทาน: เลือกมื้ออาหารแล้ว "สร้างวิธีใช้ได้ไม่ครบ" — ปัญหาข้อมูลยา)
// "เปลี่ยนวิธีใช้" (Retest 19 ต.ค. 2026 บ่าย — ผู้ใช้ให้แก้รายละเอียดการใช้ยา): เวลาใช้ยา = มื้ออาหาร (TC-001 A ก่อนอาหารเช้า · TC-002 A หลังอาหารเย็น · TC-004 B ก่อนอาหารเช้า) → บันทึก →
//   กล่องเตือน "ตรวจสอบข้อความวิธีใช้…" → ใช้ข้อความที่สร้างใหม่ → บันทึก (helpers/functions/cpoe-usage.ts — คีย์บอร์ดทั้งหมด หัวฟอร์มบังเมาส์)
// TC-002 จำนวนจ่ายครั้งนี้: ช่องในหน้าแก้ไขยาล็อกสำหรับยา Refill (SBH-841 TC-014) → ผู้ใช้เลือกให้แก้ผ่านหน้าต่าง Refill (รอบ 3: 7 → 5 = จ่ายครั้งนี้ 9)
// TC ที่ไม่ผ่านไม่หยุดเทส (soft) · คลิปแยกต่อ TC (R61): ฝั่งแพทย์ clip-TC-00x · ฝั่งห้องยา clip-TC-005 / clip-TC-006-ห้องยา
// ทำต่อกับผู้ป่วยเดิม (เช็คอินแล้ว ตะกร้าว่าง): SBH2126_VISIT=<HN>,<VN>,<EN>
// รัน dev-x: npx playwright test --headed --grep @SBH-2126 --output=.cache/run-2126

const DRUG_A = { code: 'med0000007', name: 'GPO-L-ONE' };
const DRUG_B = { code: 'med0000008', name: 'CLINDAVID-300' };
const ROUNDS = 3;
const TC = {
  '001': 'TC-001 (SBH-2762)', '002': 'TC-002 (SBH-2763)', '003': 'TC-003 (SBH-2764)', '004': 'TC-004 (SBH-2765)',
  '005': 'TC-005 (SBH-2766)', '006': 'TC-006 (SBH-2767)', '007': 'TC-007 (SBH-2768)',
} as const;
const ISSUES = ['SBH-2126', 'SBH-2759', 'SBH-2762', 'SBH-2763', 'SBH-2764', 'SBH-2765', 'SBH-2766', 'SBH-2767', 'SBH-2768'];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();
const isGraphql = (r: Response, op: string) => r.request().method() === 'POST' && r.url().includes('/graphql') && (r.request().postData() ?? '').includes(op);

test.describe('SBH-2126 Editability ของ Order Refill', () => {

  test(
    'ผู้ป่วย AUTO ใหม่: แพทย์ (Doctor) แก้ Order Refill / ปกติ ในตะกร้า → หลังส่งคำสั่ง → ห้องยาเห็นค่าใหม่ → สร้างใบยา → แพทย์แก้ไม่ได้',
    { tag: ['@SBH-2126', ...ISSUES.slice(1).map((id) => `@${id}`)], annotation: ISSUES.map(linear) },
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
      const skip = (title: string, why: string) => failures.push(`${title} — ตรวจไม่ได้ (${why})`);
      await page.addInitScript(recordNotices);

      // ── Pre-condition (Super_User): ผู้ป่วย AUTO + Visit OPD + เช็คอิน ──
      let [hn, vn, en] = (process.env.SBH2126_VISIT ?? '').split(',');
      if (!hn) {
        const patient = newTestPatient('Edit2126');
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
          console.log(`    ทำต่อกับรายเดิม: SBH2126_VISIT=${hn},${vn},${en}`);
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
      const confirmButton = dialog.getByRole('button', { name: 'ยืนยัน', exact: true });
      const cancelButton = dialog.getByRole('button', { name: 'ยกเลิก', exact: true });
      const drugRowInDialog = dialog.locator('tbody tr').filter({ hasText: DRUG_A.name }).first();
      const dispenseNow = drugRowInDialog.locator('input[disabled]').first();
      /** ช่องจำนวนของรอบ 1..3 (ยาที่มีแผนแล้วมีช่อง "จำนวนยาที่จ่ายทั้งหมด" นำหน้า) */
      const roundInputs = async (): Promise<Locator[]> => {
        const all = drugRowInDialog.locator('input:not([disabled])');
        const n = await all.count();
        return Array.from({ length: n }, (_, i) => all.nth(i)).slice(n > ROUNDS ? n - ROUNDS : 0);
      };
      const roundDates = dialog.locator('.ant-picker input:not([disabled])');
      const basketRow = (code: string) => dm.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      const editButton = (code: string) => basketRow(code).getByRole('button', { name: 'แก้ไข' });
      const usageBox = dm.getByRole('textbox', { name: /^\* วิธีใช้ภาษาไทย/ });
      let userName = '';

      const closeLeftPanels = async () => {
        for (const name of ['OPD', 'ประวัติการรักษา']) {
          const tab = doc.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
          if (await tab.count()) await tab.first().locator('.dv-default-tab-action').click().catch(() => undefined);
        }
        await doc.mouse.move(700, 1000);
      };
      /** รายการผู้ป่วยนอกของแพทย์ (กรองแพทย์ = ผู้ที่ล็อกอินไว้ให้ — Visit ของผู้ป่วย AUTO เป็นของแพทย์อื่น → เอาตัวกรองออก) → คลิกชื่อเข้า EMR */
      const openEmr = async () => {
        await selectOpdUnit(doc);
        await dm.getByPlaceholder('ค้นหา HN').waitFor({ timeout: 120_000 });
        await doc.waitForTimeout(1_500);
        const chips = dm.locator('.ant-select-selection-item').filter({ visible: true });
        if (await chips.count()) note('รายการผู้ป่วยนอก (Doctor)', `ตัวกรองตั้งต้น "${squash((await chips.allInnerTexts()).join(', '))}" — เอาออกเพื่อหาผู้ป่วย (ไม่ใช่ขั้นของ TC)`);
        const remove = dm.locator('.ant-select-selection-item-remove').filter({ visible: true });
        for (let i = 0; i < 3 && (await remove.count()); i++) {
          await remove.first().click();
          await doc.waitForTimeout(800);
        }
        const row = await opdListRow(doc, hn);
        const name = row.getByText(/AUTO\s/).first();
        await markEvidence(clicked(name));
        await snapEvidence(doc, 'ก่อนกด — ชื่อผู้ป่วยในรายการผู้ป่วยนอก (Doctor)');
        await name.click();
        await expect(visitBar, 'เปิดหน้า EMR แล้วต้องเห็นแถบ Visit ของผู้ป่วย').toBeVisible({ timeout: 90_000 });
        await expect(dm.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
        await closeLeftPanels();
        userName = squash(await doc.locator('header').getByText(/\S+ \S+$/).last().innerText().catch(() => ''));
      };
      const openRefillDialog = async () => {
        await expect(refillButton).toBeVisible({ timeout: 30_000 });
        await markEvidence(clicked(refillButton));
        await snapEvidence(doc, 'ก่อนกด — ปุ่ม refill');
        await refillButton.click();
        await expect(dialog, 'กดปุ่ม refill แล้วต้องเปิดหน้าต่าง "จัดการการเติมยา (Refill)"').toBeVisible({ timeout: 20_000 });
        await expect(drugRowInDialog).toBeVisible({ timeout: 20_000 });
        await doc.waitForTimeout(1_000); // ค่าของแผนเดิมเติมตามหลัง
      };
      const saveRefillPlan = async (tag: string) => {
        const before = (await notices(doc)).length;
        await markEvidence(clicked(confirmButton));
        await snapEvidence(doc, `ก่อนกด — ยืนยันแผน Refill (${tag})`);
        await confirmButton.click();
        const text = await waitNotice(doc, before, /refill|เติมยา|กรุณา|ผิดพลาด/i);
        note(`แจ้งเตือนหลังยืนยันแผน (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        expect(text, 'ยืนยันแผนแล้วต้องขึ้นแจ้งเตือนสร้างแผนเติมยาสำเร็จ').toMatch(/successfully|สำเร็จ/i);
        await expect(dialog).toBeHidden({ timeout: 15_000 });
      };
      /**
       * แก้ไขยา (ดินสอ) → เปลี่ยนรายละเอียดการใช้ยา "เวลาใช้ยา" = มื้ออาหาร (meal + slot) → บันทึก →
       * กล่องเตือน "ตรวจสอบข้อความวิธีใช้…" → ใช้ข้อความที่สร้างใหม่ → บันทึก → แจ้งเตือนสำเร็จ + แถวแสดงวิธีใช้ใหม่ (ผู้ใช้สั่ง 19 ต.ค. 2026 บ่าย)
       */
      const editUsage = async (code: string, tag: string, meal: 'ก่อนอาหาร' | 'หลังอาหาร', slot: 'เช้า' | 'เย็น') => {
        const edit = editButton(code);
        await expect(edit, 'ปุ่มแก้ไขของแถวยาต้องกดได้').toBeEnabled({ timeout: 10_000 });
        const before = squash(await basketRow(code).innerText());
        await markEvidence(expected(basketRow(code)), clicked(edit));
        await snapEvidence(doc, `ก่อนกด — แก้ไขยา ${code} (${tag})`);
        await edit.click();
        await expect(usageBox).toBeVisible({ timeout: 20_000 });
        await doc.waitForTimeout(1_500); // ฟอร์มเติมค่าเดิมตามหลัง
        await doc.keyboard.press('Escape'); // ป๊อปอัปคำย่อของช่องวิธีการใช้บังฟอร์ม
        const usageBefore = await usageBox.inputValue();
        const { select, slotBox } = await setMealTiming(doc, meal, slot);
        // ป๊อปอัปคำย่อของช่อง "วิธีการใช้" เด้งกลับมาบังช่องมื้ออาหาร → คลิกป้ายที่อยู่นอกป๊อปอัป ("วิธีใช้ภาษาอังกฤษ") ให้หลุดโฟกัส
        // (ห้ามกด Escape หลังแก้ค่า — ปิดฟอร์มแก้ไขทิ้ง)
        await dm.getByText('วิธีใช้ภาษาอังกฤษ', { exact: true }).first().click().catch(() => undefined);
        await expect(dm.getByText('As needed', { exact: true })).toBeHidden({ timeout: 5_000 }).catch(() => undefined);
        await select.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await markEvidence(filled(select), filled(slotBox.locator('xpath=ancestor::label[1]')));
        await snapEvidence(doc, `กรอก — เวลาใช้ยา ${meal}${slot} (${tag})`);
        const startNotices = (await notices(doc)).length;
        const text = await saveWithRegeneratedUsage(doc, async (box, button) => {
          await markEvidence(alerted(box), clicked(button));
          await snapEvidence(doc, `แจ้งเตือน — ตรวจสอบข้อความวิธีใช้ → ใช้ข้อความที่สร้างใหม่ (${tag})`);
        });
        note(`วิธีใช้ ${code} (${tag})`, `"${usageBefore}" → "${text}"`);
        expect(text, `วิธีใช้ใหม่ต้องมี "${meal}${slot}"`).toContain(`${meal}${slot}`);
        const toastText = await waitNotice(doc, startNotices, /สำเร็จ|ผิดพลาด|ไม่สามารถ/, 20_000);
        note(`แจ้งเตือนหลังบันทึกแก้ไข ${code} (${tag})`, toastText || '(ไม่เห็นแจ้งเตือน)');
        expect(toastText, 'บันทึกแก้ไขแล้วต้องสำเร็จ').toMatch(/สำเร็จ/);
        await expect(basketRow(code), `แถวยาต้องแสดงวิธีใช้ใหม่ "${text}"`).toContainText(text, { timeout: 15_000 });
        expect(squash(await basketRow(code).innerText()), 'แถวยาต้องเปลี่ยนจากเดิม').not.toBe(before);
        await markEvidence(expected(basketRow(code).getByText(`${meal}${slot}`).first()));
        await holdForClip(doc);
        return text;
      };

      // ── TC-001 แก้ไขยา A (Refill) ในตะกร้า ──
      await startClip(doc, 'TC-001');
      const usage = { a: '', b: '' };
      const opened = await soft(doc, `${TC['001']} ขั้น 1 Doctor เปิด OPD Visit → หน้า CPOE`, async () => {
        await openEmr();
        await expect(doc.getByRole('combobox', { name: /ค้นหา ยา/ })).toBeVisible({ timeout: 60_000 });
        note('บัญชีแพทย์ (Doctor)', userName || '(อ่านชื่อจากหัวหน้าไม่ได้)');
        await markEvidence(expected(visitBar), expected(doc.getByRole('combobox', { name: /ค้นหา ยา/ })));
      });
      let planned = false;
      const plan = { total: '', now: '', rounds: [] as string[] };
      if (opened) {
        planned = await soft(doc, `${TC['001']} ขั้น 2 สั่งยา A Refill 3 รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28) + ยา B ยาปกติ ลงตะกร้า`, async () => {
          await addMedicineToCart(doc, DRUG_A.code, async () => {
            // 1 เม็ด/วัน × 4 สัปดาห์ = 28
            const period = dm.getByRole('spinbutton', { name: 'ระยะเวลาการใช้' });
            await period.fill('4');
            await period.press('Tab');
            // helper กรอกจำนวน 1 ไว้ก่อน (ช่องว่าง) → ระบบไม่คำนวณทับ → กรอก 28 เอง
            const qty = dm.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
            await qty.fill('28');
            await qty.press('Tab');
            await expect(qty).toHaveValue('28');
            await expect(usageBox, 'วิธีใช้ต้องเป็นช่วง 4 สัปดาห์').toContainText(/ถึงวันที่/);
            await markEvidence(filled(period), expected(qty));
            await snapEvidence(doc, 'กรอก — ยา A 4 สัปดาห์ (28)');
          });
          await addMedicineToCart(doc, DRUG_B.code);
          await expect(basketRow(DRUG_A.code)).toBeVisible({ timeout: 30_000 });
          await expect(basketRow(DRUG_B.code)).toBeVisible({ timeout: 30_000 });
          await openRefillDialog();
          await dialog.getByRole('spinbutton').first().fill('7');
          const add = dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
          for (let i = 0; i < ROUNDS; i++) await add.click();
          await expect(dialog.getByText(/^เติมยาครั้งที่ \d+$/)).toHaveCount(ROUNDS, { timeout: 10_000 });
          for (const input of await roundInputs()) {
            await input.fill('7');
            await input.press('Tab');
          }
          await expect(dispenseNow, 'จ่ายครั้งนี้ = 28 − 21 = 7').toHaveValue('7');
          plan.total = '28';
          plan.now = '7';
          plan.rounds = ['7', '7', '7'];
          await markEvidence(...(await roundInputs()).map(filled), expected(dispenseNow));
          await holdForClip(doc);
          await saveRefillPlan('TC-001');
          await expect(refillButton).toHaveText(/refill\s*\(1\)/i, { timeout: 15_000 });
          await expect(basketRow(DRUG_A.code).locator('[aria-label="Remed"]'), 'ยา A ต้องเป็นรายการ Refill').toBeVisible();
          await markEvidence(expected(basketRow(DRUG_A.code)), expected(basketRow(DRUG_B.code)), expected(refillButton));
          await holdForClip(doc);
        });
      }
      if (planned) {
        await soft(doc, `${TC['001']} ขั้น 3 แก้ไขยา A ในตะกร้า → เปลี่ยนวิธีใช้ → บันทึก`, async () => {
          usage.a = await editUsage(DRUG_A.code, 'TC-001', 'ก่อนอาหาร', 'เช้า');
        });
      } else skip(`${TC['001']} ขั้น 3`, 'สั่งยา Refill ไม่สำเร็จ');

      // ── TC-002 ส่งคำสั่ง → แก้ไขยา A (วิธีใช้ + จำนวนจ่ายครั้งนี้) ──
      await startClip(doc, 'TC-002');
      let sent = false;
      if (planned) {
        sent = await soft(doc, `${TC['002']} ขั้น 1 ส่งคำสั่ง / Sign Order`, async () => {
          const submit = dm.getByRole('button', { name: 'save ส่งคำสั่ง' });
          const before = (await notices(doc)).length;
          await markEvidence(clicked(submit));
          await snapEvidence(doc, 'ก่อนกด — ส่งคำสั่ง');
          await submit.click();
          const text = await waitNotice(doc, before, /ส่งคำสั่ง/, 60_000);
          note('แจ้งเตือนหลังส่งคำสั่ง', text || '(ไม่เห็นแจ้งเตือน)');
          expect(text, 'ส่งคำสั่งแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/สำเร็จ/);
          await expect(basketRow(DRUG_A.code).locator('[aria-label="ส่งแล้ว"]'), 'แถวยา A ต้องเป็นสถานะส่งแล้ว').toHaveCount(1, { timeout: 30_000 });
          await markEvidence(expected(basketRow(DRUG_A.code)), expected(basketRow(DRUG_B.code)));
          await holdForClip(doc);
        });
      }
      if (sent) {
        await soft(doc, `${TC['002']} ขั้น 2 แก้ไขยา A หลังส่งคำสั่ง → เปลี่ยนวิธีใช้ → บันทึก`, async () => {
          usage.a = await editUsage(DRUG_A.code, 'TC-002', 'หลังอาหาร', 'เย็น');
          const qty = dm.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
          if (await qty.isVisible().catch(() => false)) note('TC-002 ข้อสังเกต', `ช่อง "จำนวนที่จ่าย" ในหน้าแก้ไขยาของยา Refill ${(await qty.isDisabled()) ? 'ล็อก (ตามการออกแบบ SBH-841 TC-014)' : 'แก้ได้'}`);
        });
        await soft(doc, `${TC['002']} ขั้น 2 เปลี่ยนจำนวนจ่ายครั้งนี้ผ่านหน้าต่าง Refill (รอบ 3: 7 → 5 = จ่ายครั้งนี้ 9) → แถวยา A แสดงจำนวนใหม่`, async () => {
          await openRefillDialog();
          const r3 = (await roundInputs())[2];
          await r3.fill('5');
          await r3.press('Tab');
          await expect(dispenseNow, 'จ่ายครั้งนี้ = 28 − (7 + 7 + 5) = 9').toHaveValue('9');
          plan.rounds = ['7', '7', '5'];
          plan.now = '9';
          await markEvidence(filled(r3), expected(dispenseNow));
          await holdForClip(doc);
          await saveRefillPlan('TC-002');
          await doc.waitForTimeout(2_000);
          const qtyCell = basketRow(DRUG_A.code).locator('td').filter({ has: doc.locator('[aria-label="Remed"]') }).first();
          const shown = squash(await qtyCell.innerText());
          await showCompareTable(doc, 'ยา A หลังแก้จำนวนจ่ายครั้งนี้ (7 → 9)', ['ที่ควรเป็น', 'แถวยา A'], [
            { label: 'วิธีใช้', values: [usage.a, (await basketRow(DRUG_A.code).innerText()).includes(usage.a) ? usage.a : '(ไม่พบ)'], same: (await basketRow(DRUG_A.code).innerText()).includes(usage.a) },
            { label: 'จำนวน (จ่ายครั้งนี้)', values: [plan.now, shown], same: shown === plan.now },
          ], { side: 'bottom' });
          await markEvidence(expected(qtyCell));
          await holdForClip(doc, 2_000);
          expect(shown, 'แถวยา A ต้องแสดงจำนวนจ่ายครั้งนี้ใหม่').toBe(plan.now);
        });
        await hideCompareTable(doc);
      } else skip(`${TC['002']} ขั้น 2`, 'ส่งคำสั่งไม่สำเร็จ');

      // ── TC-003 แก้รอบเติมยาครั้งที่ 1 (วันที่ + จำนวน) หลังส่งคำสั่ง ──
      await startClip(doc, 'TC-003');
      const round1 = { date: dayPlus(9), qty: '6' };
      if (sent) {
        await soft(doc, `${TC['003']} ขั้น 2 หน้าต่าง Refill → เติมยาครั้งที่ 1: วันที่ → ${round1.date.th} · จำนวน 7 → ${round1.qty} → ยืนยัน → เปิดใหม่ค่าตรง`, async () => {
          await openRefillDialog();
          const dateInput = roundDates.nth(0);
          await dateInput.click();
          const cell = doc.locator('.ant-picker-dropdown:visible').locator(`td[title="${round1.date.be}"]`).first();
          await expect(cell, `ปฏิทินต้องมีวันที่ ${round1.date.be}`).toBeVisible({ timeout: 10_000 });
          await cell.click();
          await expect(dateInput).toHaveValue(round1.date.be);
          const r1 = (await roundInputs())[0];
          await r1.fill(round1.qty);
          await r1.press('Tab');
          plan.rounds = [round1.qty, '7', '5'];
          plan.now = '10';
          await expect(dispenseNow, 'จ่ายครั้งนี้ = 28 − (6 + 7 + 5) = 10').toHaveValue(plan.now);
          await markEvidence(filled(dateInput), filled(r1), expected(dispenseNow));
          await holdForClip(doc);
          await saveRefillPlan('TC-003');
          await openRefillDialog();
          const shown = { date: await roundDates.nth(0).inputValue(), qty: await (await roundInputs())[0].inputValue() };
          await showCompareTable(doc, 'เติมยาครั้งที่ 1 — ค่าที่แก้ เทียบหน้าต่างที่เปิดใหม่', ['ที่แก้', 'เปิดใหม่'], [
            { label: 'วันที่', values: [round1.date.be, shown.date], same: shown.date === round1.date.be },
            { label: 'จำนวนจ่าย', values: [round1.qty, shown.qty], same: shown.qty === round1.qty },
          ], { side: 'bottom' });
          await markEvidence(expected(roundDates.nth(0)), expected((await roundInputs())[0]));
          await holdForClip(doc, 2_000);
          expect(shown).toEqual({ date: round1.date.be, qty: round1.qty });
        });
        await hideCompareTable(doc);
        if (await dialog.isVisible().catch(() => false)) await cancelButton.click();
      } else skip(`${TC['003']}`, 'ส่งคำสั่งไม่สำเร็จ');

      // ── TC-004 แก้ไขยา B (ปกติ) หลังส่งคำสั่ง ──
      await startClip(doc, 'TC-004');
      if (sent) {
        await soft(doc, `${TC['004']} ขั้น 2 แก้ไขยา B → เปลี่ยนวิธีใช้ → บันทึก`, async () => {
          usage.b = await editUsage(DRUG_B.code, 'TC-004', 'ก่อนอาหาร', 'เช้า');
        });
      } else skip(`${TC['004']}`, 'ส่งคำสั่งไม่สำเร็จ');
      const cpoe = { aRow: squash(await basketRow(DRUG_A.code).innerText().catch(() => '')), bRow: squash(await basketRow(DRUG_B.code).innerText().catch(() => '')) };

      // ── TC-005 ห้องยา (Super_User) Order รอยืนยัน → ค่าตรงกับที่แพทย์แก้ล่าสุด ──
      await startClip(page, 'TC-005');
      let orderOpen = false;
      const createButton = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
      if (sent) {
        orderOpen = await soft(page, `${TC['005']} ขั้น 2 ห้องยา (Super_User) → Order รอยืนยัน → เปิด Order ของผู้ป่วย`, async () => {
          await page.goto('/cortex/pharmacy/select-location');
          await main.getByRole('combobox').first().click();
          await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
          await page.waitForTimeout(800);
          await main.getByRole('combobox').nth(1).click();
          await page.waitForTimeout(800);
          await page.keyboard.press('Enter'); // ช่องบริการตัวแรก (dev-x มี 5 / 4)
          await page.getByRole('button', { name: 'ส่ง' }).click();
          await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
          const row = main.locator('tr.ant-table-row').filter({ hasText: `HN ${hn}` }).first();
          await expect(row, `ผู้ป่วย HN ${hn} ต้องอยู่แท็บ Order รอยืนยัน`).toBeVisible({ timeout: 60_000 });
          await markEvidence(expected(page.getByRole('tab', { name: /Order รอยืนยัน/ })), clicked(row));
          await snapEvidence(page, 'ก่อนกด — Order ของผู้ป่วย (Order รอยืนยัน)');
          await row.locator('td').nth(4).click();
          await expect(createButton).toBeVisible({ timeout: 60_000 });
          await page.waitForTimeout(2_000);
        });
      } else skip(`${TC['005']}`, 'ส่งคำสั่งไม่สำเร็จ');
      if (orderOpen) {
        await soft(page, `${TC['005']} ขั้น 3 วิธีใช้ / จำนวนจ่าย / รอบเติมยาของยา A และวิธีใช้ของยา B ตรงกับที่แพทย์แก้ล่าสุด`, async () => {
          const rowA = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${DRUG_A.code}]` }).first();
          const rowB = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${DRUG_B.code}]` }).first();
          const textA = squash(await rowA.innerText());
          const textB = squash(await rowB.innerText());
          const qtyA = await rowA.locator('input:not([type="checkbox"])').first().inputValue().catch(() => '');
          const refillCount = await main.getByText(new RegExp(`^เติมยาครั้งที่ \\d/${ROUNDS}$`)).count();
          const round1Row = main.getByText(`เติมยาครั้งที่ 1/${ROUNDS}`, { exact: true }).locator('xpath=ancestor::*[.//*[contains(@class,"ant-checkbox")]][1]');
          const round1Text = squash(await round1Row.innerText().catch(() => ''));
          // กางรอบ 1 ดูจำนวน
          await round1Row.locator('[aria-label="right"], .anticon-right').first().click().catch(() => undefined);
          await page.waitForTimeout(1_000);
          const round1Detail = squash(await round1Row.locator('xpath=..').innerText().catch(() => ''));
          note('ห้องยา — ยา A', `${textA.slice(0, 200)} · จำนวน ${qtyA}`);
          note('ห้องยา — เติมยาครั้งที่ 1', round1Detail.slice(0, 300));
          note('ห้องยา — ยา B', textB.slice(0, 200));
          const rows = [
            { label: 'ยา A วิธีใช้', values: [usage.a, textA.includes(usage.a) ? usage.a : '(ไม่พบ)'], same: !!usage.a && textA.includes(usage.a) },
            { label: 'ยา A จำนวนจ่าย (ครั้งนี้)', values: [plan.now, qtyA || '-'], same: qtyA === plan.now },
            { label: 'ยา A เติมยาครั้งที่ 1 วันที่', values: [round1.date.th, round1Text.includes(round1.date.th) ? round1.date.th : round1Text.slice(0, 40)], same: round1Text.includes(round1.date.th) },
            { label: 'ยา A จำนวนรอบเติมยา', values: [String(ROUNDS), String(refillCount)], same: refillCount === ROUNDS },
            { label: 'ยา B วิธีใช้', values: [usage.b, textB.includes(usage.b) ? usage.b : '(ไม่พบ)'], same: !!usage.b && textB.includes(usage.b) },
          ];
          await showCompareTable(page, 'ค่าที่แพทย์แก้ล่าสุด (CPOE) เทียบหน้า Order รอยืนยัน ห้องยา', ['CPOE (แก้ล่าสุด)', 'ห้องยา'], rows, { side: 'bottom' });
          await markEvidence(expected(rowA), expected(rowB), expected(main.getByText(`เติมยาครั้งที่ 1/${ROUNDS}`, { exact: true })));
          await holdForClip(page, 2_500);
          note('CPOE ตอนจบ TC-004', `A: ${cpoe.aRow.slice(0, 160)} || B: ${cpoe.bRow.slice(0, 160)}`);
          for (const r of rows) expect(r.same, r.label).toBe(true);
        });
        await hideCompareTable(page);
      }

      // ── TC-006 เภสัชสร้างใบยา → แพทย์แก้ยา A ไม่ได้ (รายละเอียด + รอบเติมยา) ──
      await startClip(page, 'TC-006-ห้องยา');
      let created = false;
      if (orderOpen) {
        created = await soft(page, `${TC['006']} ขั้น 1 Super_User (เภสัช) กดสร้างใบยาจาก Order`, async () => {
          const autoPrint = main.getByRole('checkbox', { name: 'Print ฉลากยาอัตโนมัติ' });
          if (await autoPrint.isChecked().catch(() => false)) await autoPrint.click(); // เครื่องเทสไม่มีเครื่องพิมพ์
          await markEvidence(clicked(createButton));
          await snapEvidence(page, 'ก่อนกด — สร้างใบยา');
          const before = (await notices(page)).length;
          const res = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/cortex-api/opd/prescriptions', { timeout: 60_000 });
          await createButton.click();
          const response = await res;
          const body = (await response.json().catch(() => ({}))) as { prescriptionId?: string };
          note('สร้างใบยา', `POST /cortex-api/opd/prescriptions ${response.status()} · ใบยา ${body.prescriptionId ?? '-'}`);
          expect(response.status()).toBe(200);
          const text = await waitNotice(page, before, /สำเร็จ|ผิดพลาด/, 15_000);
          note('แจ้งเตือนหลังสร้างใบยา', text || '(ไม่เห็นแจ้งเตือน)');
          await holdForClip(page);
        });
      } else skip(`${TC['006']} ขั้น 1`, 'เปิด Order ที่ห้องยาไม่สำเร็จ');

      await startClip(doc, 'TC-006');
      if (created) {
        await soft(doc, `${TC['006']} ขั้น 2-3 Doctor เปิด CPOE ใหม่ → แก้รายละเอียดยา A ไม่ได้`, async () => {
          await doc.reload();
          await expect(visitBar).toBeVisible({ timeout: 90_000 });
          await expect(basketRow(DRUG_A.code)).toBeVisible({ timeout: 60_000 });
          await closeLeftPanels();
          await markEvidence(expected(editButton(DRUG_A.code)), expected(basketRow(DRUG_A.code).getByRole('button', { name: 'ยกเลิก' })));
          await holdForClip(doc, 1_500);
          await expect(editButton(DRUG_A.code), 'ปุ่มแก้ไขยา A ต้องกดไม่ได้หลังสร้างใบยา').toBeDisabled();
        });
        await soft(doc, `${TC['006']} ขั้น 3 หน้าต่าง Refill → แก้รอบเติมยาของยา A ไม่ได้`, async () => {
          await openRefillDialog();
          const r1 = (await roundInputs())[0];
          const editable = (await r1.count()) > 0 && (await r1.isEditable().catch(() => false));
          note('TC-006 หน้าต่าง Refill', `ช่องรอบของยา A ${editable ? 'แก้ได้' : 'แก้ไม่ได้'} · ปุ่มยืนยัน ${(await confirmButton.isEnabled()) ? 'กดได้' : 'กดไม่ได้'}`);
          if (editable) {
            // ลองแก้จริง: รอบ 1 → 5 แล้วยืนยัน — ดูคำตอบของระบบ
            await r1.fill('5');
            await r1.press('Tab');
            await markEvidence(filled(r1), clicked(confirmButton));
            await snapEvidence(doc, 'ก่อนกด — ยืนยัน (แก้รอบหลังสร้างใบยา)');
            const before = (await notices(doc)).length;
            const res = doc.waitForResponse((r) => isGraphql(r, 'CreateMedicationRefills'), { timeout: 20_000 }).catch(() => undefined);
            await confirmButton.click();
            const response = await res;
            const body = response ? squash(await response.text().catch(() => '')).slice(0, 300) : '(ไม่มีคำขอ)';
            const text = await waitNotice(doc, before, /.+/, 6_000);
            note('TC-006 ยืนยันแก้รอบหลังสร้างใบยา', `CreateMedicationRefills → ${body} · แจ้งเตือน: ${text || '(ไม่มี)'} · หน้าต่าง${(await dialog.isVisible()) ? 'ยังเปิดอยู่' : 'ปิด'}`);
            await markEvidence(expected(dialog.locator('.ant-modal-header, .ant-modal-title').first()), expected(r1));
            await holdForClip(doc, 2_000);
          } else {
            await markEvidence(expected(drugRowInDialog));
            await holdForClip(doc, 1_500);
          }
          expect(editable, 'หลังสร้างใบยา ช่องรอบเติมยาของยา A ต้องแก้ไม่ได้').toBe(false);
        });
        if (await dialog.isVisible().catch(() => false)) await cancelButton.click().catch(() => undefined);
      } else skip(`${TC['006']} ขั้น 2-3`, 'สร้างใบยาไม่สำเร็จ');

      // ── TC-007 แพทย์แก้ยา B (ปกติ) ไม่ได้หลังสร้างใบยา ──
      await startClip(doc, 'TC-007');
      if (created) {
        await soft(doc, `${TC['007']} ขั้น 2 แก้ไขยา B ไม่ได้`, async () => {
          await doc.reload();
          await expect(basketRow(DRUG_B.code)).toBeVisible({ timeout: 60_000 });
          await closeLeftPanels();
          await markEvidence(expected(editButton(DRUG_B.code)), expected(basketRow(DRUG_B.code)));
          await holdForClip(doc, 1_500);
          await expect(editButton(DRUG_B.code), 'ปุ่มแก้ไขยา B ต้องกดไม่ได้หลังสร้างใบยา').toBeDisabled();
        });
      } else skip(`${TC['007']}`, 'สร้างใบยาไม่สำเร็จ');

      await finishVideo(doc);
      await doc.context().close();
      note('ผลรวม', failures.length ? `ไม่ผ่าน / ตรวจไม่ได้ ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
