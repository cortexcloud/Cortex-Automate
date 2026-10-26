import fs from 'node:fs';
import type { Locator } from '@playwright/test';
import { closeVisitAtCashier, gotoCashierAccount, payAllInCash } from '../../../helpers/functions/cashier';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit, orderAlert } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';
import { notices, recordNotices, waitNotice } from '../../../helpers/functions/notices';
import { dayPlus } from '../../../helpers/functions/dates';

// การ์ด SBH-1734 [Pharmacy][Refill] ปรับปรุงหน้า รายการเติมยา (แท็บ Order เติมยา) — EXE SBH-2645 → TC-SBH-1734-001–013 (SBH-2648–2660)
// บัญชีเดียว Super_User (แพทย์ CPOE · เวชระเบียน · การเงิน · ห้องยาชั้น 1) · คลิป 1 ไฟล์ต่อ TC (R61) · TC ที่ไม่ผ่านไม่หยุดเทส (soft)
// คนไข้ 1: Visit OPD สั่งยา A + ยา B แผน Refill 3 รอบ (1 Task = 1 รอบ มีทั้ง 2 ยา) → ปิด Visit ที่การเงิน → Visit ใหม่ "รับยาต่อเนื่อง (Refill)"
//   (ผู้ใช้อนุญาตปิด Visit ผู้ป่วย AUTO บน dev-x เฉพาะการ์ดนี้ 20 ต.ค. 2026 — TC-002 / TC-010 ต้องมี Visit Refill วันนี้)
// คนไข้ 2: Visit OPD (ทิ้งไว้) สั่งยา A แผน Refill 3 รอบ + ยา C ยาปกติ → ส่งคำสั่ง → อยู่แท็บ Order รอยืนยัน (TC-012) · TC-011 ยกเลิกรอบ 2/3 + 3/3
// ลำดับ: 004 → 001 → 006 → 007 → 008 → 009 → 002 → 013 → 003 → 010 → 012 → 011 → 005
// ทำต่อกับผู้ป่วยเดิม: SBH1734_P1=<HN>,<VN>,<EN>,<VN Refill> · SBH1734_P2=<HN>,<VN>,<EN> · SBH1734_FROM=<เลข TC เช่น 003> (เริ่มที่ TC นั้นตามลำดับ)
// รัน dev-x: npx playwright test --headed --grep @SBH-1734 --project=chrome --no-deps --output=.cache/run-1734

const DRUG_A = { code: 'med0000007', name: 'GPO-L-ONE' };
const DRUG_B = { code: 'med0000005', name: 'BETAMED' };
const DRUG_C = { code: 'med0000008', name: 'CLINDAVID' }; // ยาปกติของคนไข้ 2 (Order รอยืนยัน)
const REFILL_SERVICE = 'รับยาต่อเนื่อง (Refill)';
const ORDER = ['004', '001', '006', '007', '008', '009', '002', '013', '003', '010', '012', '011', '005'];
const TC: Record<string, string> = Object.fromEntries(Array.from({ length: 13 }, (_, i) => {
  const n = String(i + 1).padStart(3, '0');
  return [n, `TC-${n} (SBH-${2648 + i})`];
}));
const ISSUES = ['SBH-1734', 'SBH-2645', 'SBH-2646', 'SBH-2647', ...Array.from({ length: 13 }, (_, i) => `SBH-${2648 + i}`)];
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();
const STATUS: Record<string, string> = { PENDING: 'ยังไม่เติม', IN_PROGRESS: 'กำลังเติมยา', COMPLETED: 'เติมยาแล้ว', CANCELLED: 'ยกเลิกแล้ว' };
const DUMP = '.cache/sbh1734';

/** Task เติมยาจาก API `medication-refill-with-detail` */
interface RefillTask {
  id: number; iteration: number; sourceCount: number; sourceVn: string; sourceEn: string; scheduledRefillDate: string; latestStatusCode: string; prescriptionId: string | null;
  medications: { productCode: string; name: string }[]; clinic?: { name?: string }; practitioner?: { display?: string };
}
const taskDate = (t: RefillTask) => {
  const local = new Date(new Date(t.scheduledRefillDate).getTime() + 7 * 3_600_000);
  return `${String(local.getUTCDate()).padStart(2, '0')}/${String(local.getUTCMonth() + 1).padStart(2, '0')}/${local.getUTCFullYear() + 543}`;
};
const taskText = (t: RefillTask) => `${t.iteration}/${t.sourceCount} ${taskDate(t)} ${STATUS[t.latestStatusCode] ?? t.latestStatusCode} [${t.medications.map((m) => m.productCode).join(', ')}] · ${t.practitioner?.display ?? '-'}${t.prescriptionId ? ` · ใบยา ${t.prescriptionId}` : ''}`;

interface Patient { label: string; hn: string; vn: string; en: string; vnR: string; doctor: string }

test.describe('SBH-1734 แท็บ Order เติมยา (ห้องยา)', () => {

  test(
    'ผู้ป่วย AUTO ใหม่ 2 ราย: สถานะ Task 4 แบบ · Filter หลายค่า · คอลัมน์รายการยา / แพทย์ผู้สั่ง / รอบ · Checkbox + นำไปสร้างใบยา / ยกเลิกรอบเติมยา · กันสร้างใบยาซ้ำ',
    { tag: ['@SBH-1734', ...ISSUES.slice(1).map((id) => `@${id}`)], annotation: ISSUES.map(linear) },
    async ({ page }) => {
      test.setTimeout(3_600_000);
      fs.mkdirSync(DUMP, { recursive: true });
      const main = page.getByRole('main');
      const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
      const authorization = trackAuthorization(page);
      const failures: string[] = [];
      const from = ORDER.indexOf(process.env.SBH1734_FROM ?? '004');
      const run = (tc: string) => ORDER.indexOf(tc) >= Math.max(0, from);
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
      const dump = async (name: string) => fs.writeFileSync(`${DUMP}/${name}.txt`, await main.innerText().catch(() => ''));
      await page.addInitScript(recordNotices);

      // ── API (อ่านอย่างเดียว) ──
      const fetchTasks = async (hn: string): Promise<RefillTask[]> => {
        const res = await page.request.get(`/generated-emr-api/medication-refill-with-detail?page=1&perPage=200&filter[hn][equals]=${hn}&sort=scheduledRefillDate.asc`, { headers: { authorization: authorization() } });
        expect(res.status(), 'อ่าน Task เติมยาจาก API').toBe(200);
        return (((await res.json()) as { data?: RefillTask[] }).data ?? []).sort((a, b) => a.sourceEn.localeCompare(b.sourceEn) || a.iteration - b.iteration);
      };
      const taskOf = (tasks: RefillTask[], round: number) => tasks.find((t) => t.iteration === round);

      // ── CPOE ──
      const refillButton = main.getByRole('button', { name: /^refill/i });
      const dialog = page.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' });
      const confirmButton = dialog.getByRole('button', { name: 'ยืนยัน', exact: true });
      const roundHeaders = dialog.getByText(/^เติมยาครั้งที่ \d+$/);
      const drugRowInDialog = (name: string) => dialog.locator('tbody tr').filter({ hasText: name }).first();
      const roundInputs = async (name: string): Promise<Locator[]> => {
        const rounds = await roundHeaders.count();
        const all = drugRowInDialog(name).locator('input:not([disabled])');
        const n = await all.count();
        return Array.from({ length: n }, (_, i) => all.nth(i)).slice(Math.max(0, n - rounds));
      };
      const dispenseNow = (name: string) => drugRowInDialog(name).locator('input[disabled]').first();
      const basketRow = (code: string) => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      const sendButton = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
      const doctorSelect = main.getByText('แพทย์ผู้สั่ง', { exact: true }).locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');

      const openEmr = async (p: Patient) => {
        await page.goto(`/cortex/next/patients/${p.hn}?en=${p.en}&vn=${p.vn}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await expect(main.getByText(`VN ${p.vn}`, { exact: true }).first(), 'เปิดหน้า EMR แล้วต้องเห็นแถบ Visit').toBeVisible({ timeout: 90_000 });
        await expect(main.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
        await page.waitForTimeout(2_500);
        for (const name of ['OPD', 'ประวัติการรักษา']) {
          const tab = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
          if (await tab.count()) await tab.first().locator('.dv-default-tab-action').click().catch(() => undefined);
        }
        await page.mouse.move(700, 1000);
      };
      const addDrug = async (drug: { code: string; name: string }, total: string, weeks: string) => {
        await addMedicineToCart(page, drug.code, async () => {
          const period = main.getByRole('spinbutton', { name: 'ระยะเวลาการใช้' });
          await period.fill(weeks);
          await period.press('Tab');
          const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
          await qty.fill(total);
          await qty.press('Tab');
          await expect(qty).toHaveValue(total);
          await markEvidence(filled(qty));
          await snapEvidence(page, `กรอก — ยา ${drug.code} ยอดรวม ${total}`);
        });
        await expect(basketRow(drug.code)).toBeVisible({ timeout: 30_000 });
      };
      const openRefillDialog = async (name: string) => {
        await expect(refillButton).toBeVisible({ timeout: 30_000 });
        await markEvidence(clicked(refillButton));
        await snapEvidence(page, 'ก่อนกด — ปุ่ม refill');
        await refillButton.click();
        await expect(dialog, 'กดปุ่ม refill แล้วต้องเปิดหน้าต่าง "จัดการการเติมยา (Refill)"').toBeVisible({ timeout: 20_000 });
        await expect(drugRowInDialog(name)).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(1_200);
      };
      const fillRounds = async (drug: { name: string }, values: string[], now: string) => {
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
      const sendOrders = async (tag: string) => {
        const before = (await notices(page)).length;
        await markEvidence(clicked(sendButton));
        await snapEvidence(page, `ก่อนกด — ส่งคำสั่ง (${tag})`);
        await sendButton.click();
        const alert = orderAlert(page);
        const popped = await Promise.race([
          alert.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false),
          waitNotice(page, before, /ส่งคำสั่ง/, 20_000).then(() => false),
        ]);
        if (popped) {
          note(`Drug Alert หลังส่งคำสั่ง (${tag})`, squash(await alert.innerText()).slice(0, 400));
          const reasons = await alert.getByRole('textbox').all();
          for (const reason of reasons) await reason.fill('ทดสอบระบบ SBH-1734');
          const ok = alert.getByRole('button', { name: 'ยืนยันการสั่งออเดอร์' });
          await markEvidence(alerted(alert), ...reasons.map(filled), clicked(ok));
          await snapEvidence(page, `แจ้งเตือน — Drug Alert (${tag})`);
          await ok.click();
          await expect(alert).toBeHidden({ timeout: 15_000 });
        }
        const text = await waitNotice(page, before, /ส่งคำสั่ง/, 60_000);
        note(`แจ้งเตือนหลังส่งคำสั่ง (${tag})`, text || '(ไม่เห็นแจ้งเตือน)');
        expect(text, 'ส่งคำสั่งแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/สำเร็จ/);
        await holdForClip(page);
      };

      // ── Pre-condition ──
      const register = async (p: Patient, prefix: string) => {
        const patient = newTestPatient(prefix);
        let newVisitEnabled = false;
        await checkStep(page, `Pre-condition ${p.label} ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน`, async () => {
          await gotoReception(page);
          await markEvidence(clicked(newPatientButton(page)));
          await fillNewPatientForm(page, patient);
          const f = receptionFrame(page);
          const save = saveNewPatientButton(page);
          await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await markEvidence(filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), clicked(save));
          await snapEvidence(page, `ก่อนกด — บันทึกผู้ป่วยใหม่ (${p.label})`);
          p.hn = await saveNewPatient(page);
          newVisitEnabled = await expectPatientInfo(page);
        });
        await checkStep(page, `Pre-condition ${p.label} เปิด Visit OPD แผนกอายุรกรรม`, async () => {
          if (newVisitEnabled) await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          p.vn = opd.vn;
          p.en = opd.en;
          note(p.label, `${patient.firstName} ${patient.familyName} · HN ${p.hn} · ${p.vn} · EN ${p.en} · ${opd.clinic} · ${opd.doctor}`);
        });
        await checkStep(page, `Pre-condition ${p.label} เช็คอินจากรายการผู้ป่วยนอก`, async () => {
          await selectOpdUnit(page);
          const row = await opdListRow(page, p.hn);
          await markEvidence(expected(row.getByText(`HN ${p.hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
          await snapEvidence(page, `ก่อนกด — เช็คอิน (${p.label})`);
          await checkInFromOpdList(page, row);
          console.log(`    ทำต่อ (ก่อนสั่งยา): ${p.label} HN ${p.hn} · ${p.vn} · ${p.en}`);
        });
      };
      /** CPOE: ยา Refill (ยอด 28 / 4 สัปดาห์ · 3 รอบ × 7) + ยาปกติ → ยืนยันแผน → ส่งคำสั่ง */
      const order = async (p: Patient, refill: { code: string; name: string }[], normal: { code: string; name: string }[]) => {
        await openEmr(p);
        await expect(doctorSelect).toBeVisible({ timeout: 30_000 });
        p.doctor = squash(await doctorSelect.innerText());
        note(`${p.label} แพทย์ผู้สั่ง (ช่อง CPOE)`, p.doctor);
        for (const drug of refill) await addDrug(drug, '28', '4');
        await openRefillDialog(refill[0].name);
        for (const drug of refill) await fillRounds(drug, ['7', '7', '7'], '7');
        await snapEvidence(page, `กรอก — แผน Refill 3 รอบ (${p.label})`);
        await saveRefillPlan(p.label);
        for (const drug of normal) {
          await addMedicineToCart(page, drug.code);
          await expect(basketRow(drug.code)).toBeVisible({ timeout: 30_000 });
        }
        await sendOrders(p.label);
      };
      const prepare = async (envName: string, prefix: string, label: string, refill: { code: string; name: string }[], normal: { code: string; name: string }[], refillVisit: boolean): Promise<Patient> => {
        const [hn, vn, en, vnR] = (process.env[envName] ?? '').split(',');
        const p: Patient = { label, hn: hn ?? '', vn: vn ?? '', en: en ?? '', vnR: vnR ?? '', doctor: '' };
        if (p.hn && (p.vnR || !refillVisit)) {
          note(label, `ผู้ป่วยเดิม HN ${p.hn} · ${p.vn} · EN ${p.en}${p.vnR ? ` · Visit Refill ${p.vnR}` : ''}`);
          const tasks = await fetchTasks(p.hn);
          p.doctor = tasks[0]?.practitioner?.display ?? '';
          return p;
        }
        await register(p, prefix);
        await checkStep(page, `Pre-condition ${label} CPOE สั่งยา ${refill.map((d) => d.name).join(' + ')} แผน Refill 3 รอบ${normal.length ? ` + ยาปกติ ${normal.map((d) => d.name).join(', ')}` : ''} → ส่งคำสั่ง`, async () => {
          await order(p, refill, normal);
        });
        await checkStep(page, `Pre-condition ${label} Task เติมยาหลังส่งคำสั่ง (API)`, async () => {
          const tasks = await fetchTasks(p.hn);
          note(`${label} Task เติมยา`, tasks.map(taskText).join(' || ') || '(ไม่มี)');
          expect(tasks, 'ต้องมี Task 3 รอบ').toHaveLength(3);
        });
        if (!refillVisit) {
          console.log(`    ทำต่อกับรายเดิม: ${envName}=${p.hn},${p.vn},${p.en}`);
          return p;
        }
        await checkStep(page, `Pre-condition ${label} ปิด Visit ที่การเงิน`, async () => {
          const closed = await closeVisitAtCashier(page, p.hn, p.vn, async (close) => {
            await markEvidence(clicked(close));
            await snapEvidence(page, `ก่อนกด — ปิด Visit (${label})`);
          });
          note(`${label} ปิด Visit ${p.vn}`, `${closed.result}${closed.outstanding ? ` · ค้างชำระ ${closed.outstanding}` : ''}`);
          const after = await fetchTasks(p.hn);
          expect(after.filter((t) => t.latestStatusCode === 'PENDING'), 'ปิด Visit แล้ว Task ต้องยังเป็น ยังไม่เติม ครบ 3 รอบ').toHaveLength(3);
        });
        await checkStep(page, `Pre-condition ${label} Visit ใหม่ Walk-in บริการ "${REFILL_SERVICE}"`, async () => {
          await page.goto(`/cortex/next/patients/${p.hn}?actions=createVisit`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
          await expect(main.getByText(/^รายการเข้ารับบริการ/)).toBeVisible({ timeout: 90_000 });
          await page.waitForTimeout(2_500);
          const serviceSelect = main.getByText('หรือรับบริการ', { exact: true }).locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
          await serviceSelect.click();
          await page.keyboard.type('รับยาต่อเนื่อง');
          const option = options.filter({ hasText: REFILL_SERVICE }).first();
          await expect(option).toBeVisible({ timeout: 10_000 });
          await option.click();
          const visitRow = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: 'Walk-in' }).first();
          await expect(visitRow, 'เลือกบริการแล้วต้องมีแถวร่าง Walk-in').toContainText(REFILL_SERVICE, { timeout: 10_000 });
          const create = main.getByRole('button', { name: 'สร้าง', exact: true });
          await markEvidence(filled(visitRow), clicked(create));
          await snapEvidence(page, `ก่อนกด — สร้าง Visit Refill (${label})`);
          const res = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/graphql') && (r.request().postData() ?? '').includes('CreateVisit'), { timeout: 60_000 });
          await create.click();
          const body = (await (await res).json()) as { data?: { createVisit?: { visit?: { vn: string; encounters?: { en: string }[] } } }; errors?: { message: string }[] };
          p.vnR = body.data?.createVisit?.visit?.vn ?? '';
          note(`${label} Visit Refill`, `${p.vnR || '-'} · EN ${body.data?.createVisit?.visit?.encounters?.map((e) => e.en).join(', ') || '-'}${body.errors ? ` · errors ${body.errors.map((e) => e.message).join(' · ')}` : ''}`);
          expect(p.vnR, 'สร้าง Visit Refill ต้องได้ VN').toBeTruthy();
          await page.waitForTimeout(2_000);
          console.log(`    ทำต่อกับรายเดิม: ${envName}=${p.hn},${p.vn},${p.en},${p.vnR}`);
        });
        return p;
      };

      // ── ห้องยา ──
      const createButton = page.getByRole('button', { name: 'สร้างใบยา', exact: true });
      const goButton = main.getByRole('button', { name: /นำไปสร้างใบยา/ }).first();
      const cancelRoundsButton = main.getByRole('button', { name: /ยกเลิกรอบเติมยา/ }).first();
      const statusSelect = main.locator('.ant-select').filter({ hasText: /ยังไม่เติม|ทั้งหมด|กำลังเติมยา|เติมยาแล้ว|ยกเลิกแล้ว/ }).first();
      const chips = () => statusSelect.locator('.ant-select-selection-item').allInnerTexts().then((t) => t.map(squash));
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
      const openTab = async () => {
        await gotoPharmacy();
        await page.getByRole('tab', { name: /Order เติมยา/ }).click();
        await expect(main.getByRole('textbox', { name: 'วันที่สิ้นสุด' })).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(1_500);
      };
      /** ช่วงวันที่ -30 ถึง +60 วัน · ค้น HN (หรือส่วนของ HN) → คืน URL ของ API ที่หน้าเรียก */
      const searchTasks = async (search: string): Promise<string> => {
        const start = main.getByRole('textbox', { name: 'วันที่เริ่มต้น' });
        await start.click();
        await start.fill(dayPlus(-30).iso);
        await start.press('Enter');
        await page.waitForTimeout(600);
        const end = main.getByRole('textbox', { name: 'วันที่สิ้นสุด' });
        await end.click();
        await end.fill(dayPlus(60).iso);
        await end.press('Enter');
        await page.waitForTimeout(1_000);
        const box = main.getByRole('textbox', { name: /ค้นหา VN, HN/ });
        const res = page.waitForResponse((r) => r.url().includes('medication-refill-with-detail') && decodeURIComponent(r.url()).includes(`[hn][contains]=${search}`), { timeout: 30_000 });
        await box.fill(search);
        await box.press('Enter');
        const url = decodeURIComponent((await res).url());
        await page.waitForTimeout(1_500);
        return url;
      };
      /** แท็บ Order เติมยา สถานะทั้งหมด (เอา chip ตั้งต้นออก — ระบบใส่ "ทั้งหมด" ให้เอง) + ค้น HN */
      const openRefillTab = async (search: string) => {
        await openTab();
        const removeChip = statusSelect.locator('.ant-select-selection-item').filter({ hasNotText: 'ทั้งหมด' }).locator('.ant-select-selection-item-remove');
        for (let i = 0; i < 5 && (await removeChip.count()); i++) {
          await removeChip.first().click();
          await page.waitForTimeout(800);
        }
        return searchTasks(search);
      };
      const rows = () => main.locator('tr.ant-table-row').filter({ visible: true });
      /** เซลล์ของคอลัมน์ตามหัวตาราง */
      const headerIndex = async (name: string) => {
        const heads = (await main.locator('thead th').filter({ visible: true }).allInnerTexts()).map(squash);
        const i = heads.indexOf(name);
        expect(i, `ตารางต้องมีคอลัมน์ "${name}" (หัวตาราง: ${heads.join(' | ')})`).toBeGreaterThanOrEqual(0);
        return i;
      };
      const cell = async (row: Locator, name: string) => row.locator(':scope > td').nth(await headerIndex(name));
      const cellText = async (row: Locator, name: string) => squash(await (await cell(row, name)).innerText());
      /** แถวของ Task: HN + คอลัมน์รอบเติมยา = round */
      const taskRow = async (hn: string, round: string): Promise<Locator> => {
        const list = rows().filter({ hasText: `HN ${hn}` });
        for (let i = 0; i < (await list.count()); i++) if ((await cellText(list.nth(i), 'รอบเติมยา')) === round) return list.nth(i);
        throw new Error(`ไม่เห็นแถว Task ของ HN ${hn} รอบ ${round} ในแท็บ Order เติมยา`);
      };
      const checkbox = (row: Locator) => row.locator('input[type=checkbox]').first();
      const tick = async (row: Locator) => {
        await checkbox(row).check();
        await markEvidence(filled(row.locator('.ant-checkbox').first()));
      };
      /** ตารางเทียบ + ภาพผล + expect ทุกแถว */
      const verdict = async (title: string, tag: string, columns: string[], list: CompareRow[]) => {
        await showCompareTable(page, title, columns, list, { side: 'bottom' });
        await holdForClip(page, 2_500);
        await snapEvidence(page, `${tag} ผล`);
        for (const r of list) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
      };
      /** นำไปสร้างใบยา → dialog ยืนยัน → หน้าสร้างใบยา (กางทุกรอบในส่วน "ยา Refill") */
      const roundSections = () => main.locator('.ant-collapse-item').filter({ has: page.locator(':scope > .ant-collapse-header').filter({ hasText: /เติมยาครั้งที่ \d+\/\d+/ }) });
      const openCreatePage = async (tag: string) => {
        await expect(goButton, 'ติ๊ก Task แล้วปุ่มนำไปสร้างใบยาต้องกดได้').toBeEnabled({ timeout: 10_000 });
        await markEvidence(clicked(goButton));
        await snapEvidence(page, `ก่อนกด — นำไปสร้างใบยา (${tag})`);
        await goButton.click();
        const confirm = page.getByRole('dialog').filter({ hasText: 'ยืนยันการสร้างใบยา' });
        await expect(confirm).toBeVisible({ timeout: 15_000 });
        const ok = confirm.getByRole('button', { name: /^นำไปสร้างใบยา$/ });
        await markEvidence(alerted(confirm.locator('.ant-modal-container, .ant-modal-content').first()), clicked(ok));
        await snapEvidence(page, `แจ้งเตือน — ยืนยันการสร้างใบยา (${tag})`);
        await ok.click();
        await page.waitForURL(/tab=medication-refill/, { timeout: 60_000 });
        await expect(createButton).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(3_000);
        note(`หน้าสร้างใบยา (${tag})`, page.url().replace(/^https:\/\/[^/]+/, '').slice(0, 220));
        const headers = roundSections().locator(':scope > .ant-collapse-header[aria-expanded="false"]');
        for (let i = 0; i < 8 && (await headers.count()); i++) {
          await headers.first().click({ position: { x: 15, y: 15 } });
          await page.waitForTimeout(1_000);
        }
        await dump(`create-page-${tag}`);
      };
      const readSections = async () => {
        const items = roundSections();
        const out: { item: Locator; round: string; codes: string[] }[] = [];
        for (let i = 0; i < (await items.count()); i++) {
          const text = squash(await items.nth(i).innerText());
          out.push({ item: items.nth(i), round: text.match(/เติมยาครั้งที่ (\d+\/\d+)/)?.[1] ?? '-', codes: [...text.matchAll(/\[(med\d+)\]/g)].map((m) => m[1]) });
        }
        return out;
      };
      const createPrescription = async (tag: string): Promise<string> => {
        const autoPrint = main.getByRole('checkbox', { name: 'Print ฉลากยาอัตโนมัติ' });
        if (await autoPrint.isChecked().catch(() => false)) await autoPrint.click(); // เครื่องเทสไม่มีเครื่องพิมพ์
        await markEvidence(clicked(createButton));
        await snapEvidence(page, `ก่อนกด — สร้างใบยา (${tag})`);
        const res = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/cortex-api/opd/prescriptions', { timeout: 60_000 });
        const before = (await notices(page)).length;
        await createButton.click();
        const response = await res;
        const id = ((await response.json().catch(() => ({}))) as { prescriptionId?: string }).prescriptionId ?? '';
        const text = await waitNotice(page, before, /.+/, 8_000);
        note(`สร้างใบยา (${tag})`, `POST /cortex-api/opd/prescriptions ${response.status()} · ใบยา ${id || '-'} · แจ้งเตือน ${text || '(ไม่มี)'}`);
        expect(response.status(), 'สร้างใบยาต้องสำเร็จ').toBeLessThan(300);
        await page.waitForTimeout(2_000);
        return id;
      };
      /** แสดงสถานะของแถว (หน้าจอ) เทียบ API */
      const statusRows = async (p: Patient, items: { round: string; want: string }[]): Promise<CompareRow[]> => {
        const tasks = await fetchTasks(p.hn);
        note(`${p.label} Task (API)`, tasks.map(taskText).join(' || '));
        const out: CompareRow[] = [];
        for (const x of items) {
          const row = await taskRow(p.hn, x.round);
          const shown = await cellText(row, 'สถานะ');
          const api = taskOf(tasks, Number(x.round.split('/')[0]));
          const apiText = api ? STATUS[api.latestStatusCode] ?? api.latestStatusCode : '-';
          await markEvidence(expected(await cell(row, 'สถานะ')));
          out.push({ label: `${p.label} รอบ ${x.round}`, values: [x.want, `${shown} · API ${apiText}`], same: shown === x.want && apiText === x.want });
        }
        return out;
      };
      const openPrescriptionTab = async (p: Patient, tab: RegExp) => {
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

      // ── เตรียมผู้ป่วย 2 ราย (ก่อนคลิป TC แรก) ──
      const p1 = await prepare('SBH1734_P1', 'Tab1734A', 'คนไข้ 1', [DRUG_A, DRUG_B], [], true);
      const p2 = await prepare('SBH1734_P2', 'Tab1734B', 'คนไข้ 2', [DRUG_A], [DRUG_C], false);
      note('คนไข้ 1 Task ก่อนเริ่ม TC', (await fetchTasks(p1.hn)).map(taskText).join(' || '));
      note('คนไข้ 2 Task ก่อนเริ่ม TC', (await fetchTasks(p2.hn)).map(taskText).join(' || '));

      // ── TC-004 ตัวเลือก Filter สถานะ ──
      if (run('004')) {
        await startClip(page, 'TC-004');
        await soft(`${TC['004']} ขั้น 2 เปิด Filter สถานะ → ตัวเลือกครบ 5 ตัว`, async () => {
          await openTab();
          await markEvidence(clicked(statusSelect));
          await snapEvidence(page, 'ก่อนกด — Filter สถานะ');
          await statusSelect.click();
          await page.waitForTimeout(800);
          const got = (await options.allInnerTexts()).map(squash);
          const want = ['ทั้งหมด', 'ยังไม่เติม', 'กำลังเติมยา', 'เติมยาแล้ว', 'ยกเลิกแล้ว'];
          note(`${TC['004']} ตัวเลือก`, got.join(' · '));
          await markEvidence(...(await options.all()).map(expected));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'ตัวเลือก Filter สถานะ');
          await verdict('ตัวเลือก Filter สถานะ', 'TC-004', ['ที่ควรเป็น', 'หน้าจอ'], [
            ...want.map((w) => ({ label: w, values: ['มี', got.includes(w) ? 'มี' : 'ไม่มี'], same: got.includes(w) })),
            { label: 'จำนวนตัวเลือก', values: ['5', String(got.length)], same: got.length === 5 },
          ]);
          await page.keyboard.press('Escape');
        });
        await hideCompareTable(page);
      }

      // ── TC-001 / 006 / 007 / 008 คนไข้ 1 ก่อนนำไปสร้างใบยา ──
      if (run('001')) {
        await startClip(page, 'TC-001');
        await soft(`${TC['001']} ขั้น 3-4 Task ที่ยังไม่ถูกนำไปสร้างใบยา → สถานะ "ยังไม่เติม"`, async () => {
          await openRefillTab(p1.hn);
          await holdForClip(page);
          await verdict('สถานะ Task ที่ยังไม่นำไปสร้างใบยา', 'TC-001', ['ที่ควรเป็น', 'หน้าจอ · API'],
            await statusRows(p1, ['1/3', '2/3', '3/3'].map((round) => ({ round, want: 'ยังไม่เติม' }))));
        });
        await hideCompareTable(page);
      }
      if (run('006')) {
        await startClip(page, 'TC-006');
        await soft(`${TC['006']} ขั้น 3 แถวของ Task (ยา 2 รายการ) → คอลัมน์รายการยาแสดงครบ 2 รายการในแถวเดียว`, async () => {
          await openRefillTab(p1.hn);
          const row = await taskRow(p1.hn, '1/3');
          const drugCell = await cell(row, 'รายการยา');
          const shown = squash(await drugCell.innerText());
          const t = taskOf(await fetchTasks(p1.hn), 1);
          note(`${TC['006']} คอลัมน์รายการยา (รอบ 1/3)`, `${shown} · API ${t?.medications.map((m) => `${m.productCode} ${m.name}`).join(', ') ?? '-'}`);
          const lines = rows().filter({ hasText: `HN ${p1.hn}` });
          await markEvidence(expected(drugCell));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'คอลัมน์รายการยา — Task รอบ 1/3');
          // ไอคอน (i) "แสดงรายการยาทั้งหมด" (ถ้ามี) → hover ดูรายชื่อ
          const info = drugCell.locator('[aria-label*="info"], .anticon-info-circle').first();
          let popup = '';
          if (await info.count()) {
            await info.hover();
            await page.waitForTimeout(1_000);
            const tip = page.locator('.ant-tooltip:visible, .ant-popover:visible').last();
            popup = squash(await tip.innerText().catch(() => ''));
            if (popup) await markEvidence(expected(tip));
            await snapEvidence(page, 'รายการยาทั้งหมดของ Task (hover)');
            note(`${TC['006']} hover รายการยา`, popup || '(ไม่มี)');
          }
          await verdict('คอลัมน์รายการยาของ Task รอบ 1/3', 'TC-006', ['ที่ควรเป็น', 'หน้าจอ'], [
            { label: `ยา A ${DRUG_A.name}`, values: ['แสดงในแถว', shown.includes(DRUG_A.name) ? 'แสดง' : 'ไม่แสดง'], same: shown.includes(DRUG_A.name) },
            { label: `ยา B ${DRUG_B.name}`, values: ['แสดงในแถว', shown.includes(DRUG_B.name) ? 'แสดง' : `ไม่แสดง (${shown.slice(0, 60)})`], same: shown.includes(DRUG_B.name) },
            { label: 'แถวของคนไข้ 1', values: ['3 แถว (1 แถว = 1 Task)', `${await lines.count()} แถว`], same: (await lines.count()) === 3 },
          ]);
        });
        await hideCompareTable(page);
      }
      if (run('007')) {
        await startClip(page, 'TC-007');
        await soft(`${TC['007']} ขั้น 3 คอลัมน์แพทย์ผู้สั่ง = แพทย์ที่สั่ง Order Refill`, async () => {
          await openRefillTab(p1.hn);
          const t = taskOf(await fetchTasks(p1.hn), 1);
          const list: CompareRow[] = [];
          for (const round of ['1/3', '2/3', '3/3']) {
            const row = await taskRow(p1.hn, round);
            const shown = await cellText(row, 'แพทย์ผู้สั่ง');
            await markEvidence(expected(await cell(row, 'แพทย์ผู้สั่ง')));
            list.push({ label: `รอบ ${round}`, values: [p1.doctor || '-', shown], same: !!p1.doctor && shown.includes(p1.doctor) });
          }
          list.push({ label: 'API practitioner', values: [p1.doctor || '-', t?.practitioner?.display ?? '-'], same: !!p1.doctor && (t?.practitioner?.display ?? '').includes(p1.doctor) });
          await holdForClip(page);
          await verdict('แพทย์ผู้สั่ง (ช่องแพทย์ผู้สั่งของ CPOE ตอนสั่งยา)', 'TC-007', ['CPOE', 'แท็บ Order เติมยา'], list);
        });
        await hideCompareTable(page);
      }
      if (run('008')) {
        await startClip(page, 'TC-008');
        await soft(`${TC['008']} ขั้น 3 คอลัมน์รอบเติมยาของ Task รอบแรก = "1/3"`, async () => {
          await openRefillTab(p1.hn);
          const tasks = await fetchTasks(p1.hn);
          const first = taskOf(tasks, 1)!;
          const dateCol = (await taskRow(p1.hn, '1/3'));
          const shown = await cellText(dateCol, 'รอบเติมยา');
          const date = await cellText(dateCol, 'วันที่มาเติม');
          await markEvidence(expected(await cell(dateCol, 'รอบเติมยา')));
          await holdForClip(page);
          await verdict('รอบเติมยาของ Task รอบแรก', 'TC-008', ['ที่ควรเป็น', 'หน้าจอ · API'], [
            { label: 'รอบเติมยา', values: ['1/3', `${shown} · API ${first.iteration}/${first.sourceCount}`], same: shown === '1/3' && first.iteration === 1 && first.sourceCount === 3 },
            { label: 'วันที่มาเติม', values: [taskDate(first), date], same: date.includes(taskDate(first)) },
          ]);
        });
        await hideCompareTable(page);
      }

      // ── TC-009 Checkbox เลือกหลายแถว ──
      if (run('009')) {
        await startClip(page, 'TC-009');
        await soft(`${TC['009']} ขั้น 3-4 ติ๊ก Checkbox ของ Task แถวที่ 1 และ 2 → ถูกเลือกพร้อมกัน`, async () => {
          await openRefillTab(p1.hn);
          const all = rows();
          const n = await all.count();
          let withBox = 0;
          for (let i = 0; i < n; i++) if (await all.nth(i).locator('input[type=checkbox]').count()) withBox++;
          const r1 = await taskRow(p1.hn, '1/3');
          const r2 = await taskRow(p1.hn, '2/3');
          await tick(r1);
          await tick(r2);
          const both = (await checkbox(r1).isChecked()) && (await checkbox(r2).isChecked());
          await markEvidence(expected(goButton), expected(cancelRoundsButton));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'ติ๊ก Task แถวที่ 1 และ 2');
          await verdict('Checkbox หน้าสุดของแต่ละแถว', 'TC-009', ['ที่ควรเป็น', 'หน้าจอ'], [
            { label: 'แถวที่มี Checkbox', values: [`${n} / ${n}`, `${withBox} / ${n}`], same: withBox === n && n > 0 },
            { label: 'แถว 1/3 + 2/3 ถูกเลือก', values: ['ทั้ง 2 แถว', both ? 'ทั้ง 2 แถว' : `1/3 ${await checkbox(r1).isChecked()} · 2/3 ${await checkbox(r2).isChecked()}`], same: both },
          ]);
        });
        await hideCompareTable(page);
      }

      // ── TC-002 นำ Task รอบ 1/3 ไปสร้างใบยา (Visit Refill) → กำลังเติมยา ──
      if (run('002')) {
        await startClip(page, 'TC-002');
        await soft(`${TC['002']} ขั้น 3-5 ติ๊ก Task 1/3 → นำไปสร้างใบยา → สร้างใบยา → สถานะ "กำลังเติมยา"`, async () => {
          await openRefillTab(p1.hn);
          const row = await taskRow(p1.hn, '1/3');
          await tick(row);
          await openCreatePage('TC-002');
          const visitShown = page.url().includes(p1.vnR) || (await main.getByText(p1.vnR).count()) > 0;
          note(`${TC['002']} หน้าสร้างใบยาเป็นของ Visit Refill`, `${p1.vnR} ${visitShown ? 'ใช่' : 'ไม่เห็นบนหน้า'}`);
          const sections = await readSections();
          for (const s of sections) await markEvidence(expected(s.item.locator(':scope > .ant-collapse-header')));
          await holdForClip(page);
          await snapEvidence(page, 'หน้าสร้างใบยา — Task รอบ 1/3');
          await createPrescription('TC-002');
          await openRefillTab(p1.hn);
          await holdForClip(page);
          await verdict('สถานะ Task หลังสร้างใบยา (ยังไม่จ่ายยา)', 'TC-002', ['ที่ควรเป็น', 'หน้าจอ · API'], [
            ...(await statusRows(p1, [{ round: '1/3', want: 'กำลังเติมยา' }])),
            { label: 'Visit ของหน้าสร้างใบยา', values: [`Visit Refill ${p1.vnR}`, visitShown ? p1.vnR : 'ไม่เห็น VN Refill'], same: visitShown },
          ]);
        });
        await hideCompareTable(page);
      }

      // ── TC-013 Task กำลังเติมยา นำไปสร้างใบยาซ้ำไม่ได้ ──
      if (run('013')) {
        await startClip(page, 'TC-013');
        await soft(`${TC['013']} ขั้น 2-3 ลองติ๊ก Task 1/3 (กำลังเติมยา) → นำไปสร้างใบยาซ้ำไม่ได้`, async () => {
          await openRefillTab(p1.hn);
          const row = await taskRow(p1.hn, '1/3');
          const box = checkbox(row);
          const disabled = await box.isDisabled();
          await markEvidence(expected(row.locator('.ant-checkbox').first()), expected(await cell(row, 'สถานะ')), expected(goButton));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'Task 1/3 กำลังเติมยา — ช่องติ๊ก');
          let outcome = disabled ? 'ช่องติ๊กกดไม่ได้ (disabled)' : '';
          let opened = false;
          if (!disabled) {
            await box.check({ force: true }).catch(() => undefined);
            const enabled = await goButton.isEnabled();
            outcome = `ติ๊กได้ ${await box.isChecked()} · ปุ่มนำไปสร้างใบยา ${enabled ? 'กดได้' : 'กดไม่ได้'}`;
            if (enabled) {
              const before = (await notices(page)).length;
              await goButton.click();
              const confirm = page.getByRole('dialog').filter({ hasText: 'ยืนยันการสร้างใบยา' });
              opened = await confirm.isVisible({ timeout: 5_000 }).catch(() => false);
              outcome += ` · กดแล้ว ${opened ? 'เปิด dialog ยืนยันการสร้างใบยา' : 'ไม่เปิด dialog'} · แจ้งเตือน ${(await waitNotice(page, before, /.+/, 5_000)) || '(ไม่มี)'}`;
              await snapEvidence(page, 'หลังกด — นำไปสร้างใบยา (Task กำลังเติมยา)');
              if (opened) await confirm.getByRole('button', { name: 'ปิด' }).click().catch(() => page.keyboard.press('Escape'));
            }
          }
          note(`${TC['013']} ผล`, outcome);
          await verdict('Task 1/3 สถานะกำลังเติมยา', 'TC-013', ['ที่ควรเป็น', 'หน้าจอ'], [
            { label: 'นำไปสร้างใบยาซ้ำ', values: ['ไม่ได้', outcome], same: disabled || !opened },
          ]);
        });
        await hideCompareTable(page);
      }

      // ── TC-003 จ่ายยาใบยาของ Task 1/3 → เติมยาแล้ว ──
      if (run('003')) {
        await startClip(page, 'TC-003');
        await soft(`${TC['003']} ขั้น 2-3 ใบยาของ Task 1/3: จัดยา → ยืนยันรอจ่าย → ชำระเงิน → จ่ายยา → สถานะ "เติมยาแล้ว"`, async () => {
          const before1 = taskOf(await fetchTasks(p1.hn), 1);
          note(`${TC['003']} ใบยาของ Task 1/3`, before1?.prescriptionId ?? '-');
          await openPrescriptionTab(p1, /ใบยารอจัด/);
          const pack = page.getByRole('button', { name: /จัดยาแล้ว/ }).filter({ visible: true }).first();
          await markEvidence(clicked(pack));
          await snapEvidence(page, 'ก่อนกด — จัดยาแล้ว');
          let before = (await notices(page)).length;
          await pack.click();
          note('จัดยา', (await waitNotice(page, before, /.+/, 15_000)) || '(ไม่เห็นแจ้งเตือน)');
          await openPrescriptionTab(p1, /ใบยาจัดแล้ว/);
          const verify = page.getByRole('button', { name: /ยืนยันรอจ่าย/ }).filter({ visible: true }).first();
          await markEvidence(clicked(verify));
          await snapEvidence(page, 'ก่อนกด — ยืนยันรอจ่าย');
          before = (await notices(page)).length;
          await verify.click();
          note('ยืนยันรอจ่าย', (await waitNotice(page, before, /.+/, 15_000)) || '(ไม่เห็นแจ้งเตือน)');
          await gotoCashierAccount(page, p1.hn, p1.vnR);
          await markEvidence(clicked(page.getByRole('button', { name: /สร้างใบแจ้งหนี้ทั้งหมด/ })));
          await snapEvidence(page, 'ก่อนกด — สร้างใบแจ้งหนี้ทั้งหมด (การเงิน · Visit Refill)');
          const paid = await payAllInCash(page);
          note('ชำระเงิน', `ใบแจ้งหนี้ ${paid.invoiceId} · ใบเสร็จ ${paid.receiptId} · ${paid.amount} บาท`);
          await openPrescriptionTab(p1, /ใบรอจ่าย/);
          const items = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: /\[med\d+\]/ });
          for (let i = 0; i < (await items.count()); i++) {
            await items.nth(i).locator('td').first().getByRole('button').first().click();
            await page.waitForTimeout(600);
          }
          const dispense = page.getByRole('button', { name: /^จ่ายยา$/ }).filter({ visible: true }).first();
          await expect(dispense, 'ติ๊กทบทวนรายการยาแล้วปุ่มจ่ายยาต้องกดได้').toBeEnabled({ timeout: 10_000 });
          await markEvidence(clicked(dispense));
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
          await openRefillTab(p1.hn);
          await holdForClip(page);
          await verdict('สถานะ Task หลังจ่ายยา', 'TC-003', ['ที่ควรเป็น', 'หน้าจอ · API'], await statusRows(p1, [{ round: '1/3', want: 'เติมยาแล้ว' }]));
        });
        await hideCompareTable(page);
      }

      // ── TC-010 นำ Task 2/3 + 3/3 ไปสร้างใบยาพร้อมกัน ──
      if (run('010')) {
        await startClip(page, 'TC-010');
        await soft(`${TC['010']} ขั้น 3-4 ติ๊ก Task 2/3 + 3/3 → นำไปสร้างใบยา → หน้าสร้างใบยามีรายการจากทั้ง 2 Task`, async () => {
          await openRefillTab(p1.hn);
          await tick(await taskRow(p1.hn, '2/3'));
          await tick(await taskRow(p1.hn, '3/3'));
          await snapEvidence(page, 'ติ๊ก Task 2/3 และ 3/3');
          await openCreatePage('TC-010');
          const sections = await readSections();
          note(`${TC['010']} ส่วนยา Refill`, sections.map((s) => `${s.round} [${s.codes.join(', ')}]`).join(' || ') || '(ไม่มี)');
          for (const s of sections) await markEvidence(expected(s.item.locator(':scope > .ant-collapse-header')), ...(await s.item.locator('tr.ant-table-row').filter({ visible: true }).all()).slice(0, 2).map(expected));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'หน้าสร้างใบยา — Task 2/3 + 3/3');
          const s2 = sections.find((s) => s.round === '2/3');
          const s3 = sections.find((s) => s.round === '3/3');
          const list: CompareRow[] = [
            { label: 'หน้าสร้างใบยา', values: ['เปิดได้', 'เปิดได้'], same: true },
            { label: 'Task 2/3', values: [`มี ${DRUG_A.name} + ${DRUG_B.name}`, s2 ? `มี [${s2.codes.join(', ')}]` : 'ไม่มี'], same: !!s2 && s2.codes.includes(DRUG_A.code) && s2.codes.includes(DRUG_B.code) },
            { label: 'Task 3/3', values: [`มี ${DRUG_A.name} + ${DRUG_B.name}`, s3 ? `มี [${s3.codes.join(', ')}]` : 'ไม่มี'], same: !!s3 && s3.codes.includes(DRUG_A.code) && s3.codes.includes(DRUG_B.code) },
          ];
          await verdict('รายการจาก Task ที่เลือก 2 รายการ', 'TC-010', ['ที่ควรเป็น', 'หน้าสร้างใบยา'], list);
          await hideCompareTable(page);
          // สร้างใบยา (ให้ TC-005 มี Task กำลังเติมยา) → ทั้ง 2 Task อยู่ใบยาเดียว
          const id = await createPrescription('TC-010');
          const tasks = await fetchTasks(p1.hn);
          const t2 = taskOf(tasks, 2);
          const t3 = taskOf(tasks, 3);
          note(`${TC['010']} Task หลังสร้างใบยา`, [t2, t3].map((t) => (t ? taskText(t) : '-')).join(' || '));
          await openRefillTab(p1.hn);
          await verdict('Task 2/3 + 3/3 หลังสร้างใบยา', 'TC-010 หลังสร้าง', ['ที่ควรเป็น', 'หน้าจอ · API'], [
            ...(await statusRows(p1, [{ round: '2/3', want: 'กำลังเติมยา' }, { round: '3/3', want: 'กำลังเติมยา' }])),
            { label: 'ใบยาเดียวกัน', values: [id || 'ใบเดียวกัน', `${t2?.prescriptionId ?? '-'} · ${t3?.prescriptionId ?? '-'}`], same: !!t2?.prescriptionId && t2.prescriptionId === t3?.prescriptionId },
          ]);
        });
        await hideCompareTable(page);
      }

      // ── TC-012 คนไข้ 2: Task 1/3 + Order รอยืนยัน → หน้าสร้างใบยารวมกัน (ดูอย่างเดียว ไม่กดสร้าง) ──
      if (run('012')) {
        await startClip(page, 'TC-012');
        await soft(`${TC['012']} ขั้น 1-5 คนไข้ที่มี Order รอยืนยัน → ติ๊ก Task 1/3 → นำไปสร้างใบยา → หน้าสร้างใบยามีทั้งยาของ Task และ Order รอยืนยัน`, async () => {
          await gotoPharmacy();
          const pending = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: p2.hn }).first();
          await expect(pending, `คนไข้ 2 (HN ${p2.hn}) ต้องอยู่แท็บ Order รอยืนยัน`).toBeVisible({ timeout: 60_000 });
          await markEvidence(expected(page.getByRole('tab', { name: /Order รอยืนยัน/ })), expected(pending));
          await holdForClip(page);
          await snapEvidence(page, 'แท็บ Order รอยืนยัน — คนไข้ 2');
          await openRefillTab(p2.hn);
          await tick(await taskRow(p2.hn, '1/3'));
          await snapEvidence(page, 'ติ๊ก Task 1/3 ของคนไข้ 2');
          await openCreatePage('TC-012');
          const sections = await readSections();
          const inRefill = sections.flatMap((s) => s.codes);
          const allRows = main.locator('tr.ant-table-row').filter({ visible: true });
          const outside: string[] = [];
          for (let i = 0; i < (await allRows.count()); i++) {
            const r = allRows.nth(i);
            const inside = await r.evaluate((el) => !!el.closest('.ant-collapse-item'));
            const code = (await r.innerText()).match(/\[(med\d+)\]/)?.[1];
            if (!inside && code) {
              outside.push(code);
              await markEvidence(expected(r));
            }
          }
          for (const s of sections) await markEvidence(expected(s.item.locator(':scope > .ant-collapse-header')));
          note(`${TC['012']} หน้าสร้างใบยา`, `ยาครั้งนี้ (Order รอยืนยัน) [${outside.join(', ')}] · ยา Refill ${sections.map((s) => `${s.round} [${s.codes.join(', ')}]`).join(' · ')}`);
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'หน้าสร้างใบยา — Order รอยืนยัน + Task 1/3');
          await verdict('หน้าสร้างใบยาของคนไข้ 2', 'TC-012', ['ที่ควรเป็น', 'หน้าสร้างใบยา'], [
            { label: `Order รอยืนยัน ยา ${DRUG_C.name} (ยาปกติ)`, values: ['มี', outside.includes(DRUG_C.code) ? 'มี' : 'ไม่มี'], same: outside.includes(DRUG_C.code) },
            { label: `Order รอยืนยัน ยา ${DRUG_A.name} (จ่ายครั้งนี้)`, values: ['มี', outside.includes(DRUG_A.code) ? 'มี' : 'ไม่มี'], same: outside.includes(DRUG_A.code) },
            { label: `Task 1/3 ยา ${DRUG_A.name}`, values: ['มี', sections.some((s) => s.round === '1/3' && s.codes.includes(DRUG_A.code)) ? 'มี' : `ไม่มี [${inRefill.join(', ')}]`], same: sections.some((s) => s.round === '1/3' && s.codes.includes(DRUG_A.code)) },
          ]);
        });
        await hideCompareTable(page);
      }

      // ── TC-011 คนไข้ 2: ยกเลิกรอบเติมยา 2/3 + 3/3 ──
      if (run('011')) {
        await startClip(page, 'TC-011');
        await soft(`${TC['011']} ขั้น 3-5 ติ๊ก Task 2/3 + 3/3 → ยกเลิกรอบเติมยา → ทั้ง 2 รายการ "ยกเลิกแล้ว"`, async () => {
          await openRefillTab(p2.hn);
          await tick(await taskRow(p2.hn, '2/3'));
          await tick(await taskRow(p2.hn, '3/3'));
          await markEvidence(clicked(cancelRoundsButton));
          await snapEvidence(page, 'ก่อนกด — ยกเลิกรอบเติมยา');
          const writes: string[] = [];
          const listen = (r: import('@playwright/test').Request) => {
            if (r.method() !== 'GET' && /refill/i.test(r.url() + (r.postData() ?? ''))) writes.push(`${r.method()} ${new URL(r.url()).pathname}`);
          };
          page.on('request', listen);
          await cancelRoundsButton.click();
          const confirm = page.locator('.ant-modal:visible').filter({ hasText: 'ยืนยันการยกเลิกรอบเติมยา' }).last();
          await expect(confirm).toBeVisible({ timeout: 10_000 });
          const ok = confirm.getByRole('button', { name: 'ยกเลิกรอบเติมยา' });
          note(`${TC['011']} dialog`, squash(await confirm.innerText()));
          await markEvidence(alerted(confirm.locator('.ant-modal-container, .ant-modal-content').first()), clicked(ok));
          await snapEvidence(page, 'แจ้งเตือน — ยืนยันการยกเลิกรอบเติมยา');
          const before = (await notices(page)).length;
          await ok.click();
          const text = await waitNotice(page, before, /.+/, 15_000);
          await page.waitForTimeout(2_000);
          page.off('request', listen);
          note(`${TC['011']} หลังยืนยัน`, `แจ้งเตือน ${text || '(ไม่มี)'} · คำสั่ง ${writes.join(' | ') || '(ไม่เห็น)'}`);
          await snapEvidence(page, 'หลังกด — ยกเลิกรอบเติมยา');
          await openRefillTab(p2.hn);
          await holdForClip(page);
          await verdict('สถานะ Task หลังยกเลิกรอบเติมยา', 'TC-011', ['ที่ควรเป็น', 'หน้าจอ · API'],
            await statusRows(p2, [{ round: '2/3', want: 'ยกเลิกแล้ว' }, { round: '3/3', want: 'ยกเลิกแล้ว' }, { round: '1/3', want: 'ยังไม่เติม' }]));
        });
        await hideCompareTable(page);
      }

      // ── TC-005 Filter "ยังไม่เติม" + "เติมยาแล้ว" ──
      if (run('005')) {
        await startClip(page, 'TC-005');
        await soft(`${TC['005']} ขั้น 3-5 Filter เลือก "ยังไม่เติม" + "เติมยาแล้ว" → แสดงเฉพาะ 2 สถานะนี้`, async () => {
          let prefix = '';
          while (prefix.length < p1.hn.length && p1.hn[prefix.length] === p2.hn[prefix.length]) prefix += p1.hn[prefix.length];
          const all = [...(await fetchTasks(p1.hn)).map((t) => ({ p: p1, t })), ...(await fetchTasks(p2.hn)).map((t) => ({ p: p2, t }))];
          note(`${TC['005']} Task ของคนไข้ 1 + 2 (API)`, all.map((x) => `${x.p.label} ${taskText(x.t)}`).join(' || '));
          await openTab();
          // ค่าตั้งต้น "ยังไม่เติม" → เพิ่ม "เติมยาแล้ว"
          await statusSelect.click();
          await page.waitForTimeout(800);
          const want = ['ยังไม่เติม', 'เติมยาแล้ว'];
          for (const w of want) {
            if ((await chips()).includes(w)) continue;
            const opt = options.filter({ hasText: new RegExp(`^${w}$`) }).first();
            await markEvidence(clicked(opt));
            await opt.click();
            await page.waitForTimeout(800);
          }
          await page.keyboard.press('Escape');
          const selected = await chips();
          note(`${TC['005']} ค่าที่เลือก`, selected.join(' · '));
          await markEvidence(filled(statusSelect));
          await snapEvidence(page, 'Filter สถานะ — ยังไม่เติม + เติมยาแล้ว');
          const url = await searchTasks(prefix);
          note(`${TC['005']} API ที่หน้าเรียก`, url.replace(/^https:\/\/[^/]+/, ''));
          const shown: string[] = [];
          for (let i = 0; i < (await rows().count()); i++) shown.push(await cellText(rows().nth(i), 'สถานะ'));
          const ours = async (p: Patient, round: string) => {
            const list = rows().filter({ hasText: `HN ${p.hn}` });
            for (let i = 0; i < (await list.count()); i++) if ((await cellText(list.nth(i), 'รอบเติมยา')) === round) {
              await markEvidence(expected(await cell(list.nth(i), 'สถานะ')));
              return await cellText(list.nth(i), 'สถานะ');
            }
            return 'ไม่แสดง';
          };
          const p1r1 = await ours(p1, '1/3');
          const p2r1 = await ours(p2, '1/3');
          const p1r2 = await ours(p1, '2/3');
          const p2r2 = await ours(p2, '2/3');
          const others = shown.filter((s) => !want.includes(s));
          await holdForClip(page, 2_000);
          await snapEvidence(page, 'ผลการกรอง');
          await verdict(`Filter "ยังไม่เติม" + "เติมยาแล้ว" (ค้น HN ${prefix})`, 'TC-005', ['ที่ควรเป็น', 'หน้าจอ'], [
            { label: 'ค่าที่เลือก', values: [want.join(' + '), selected.join(' + ')], same: selected.length === 2 && want.every((w) => selected.includes(w)) },
            { label: 'สถานะทุกแถว', values: [`เฉพาะ ${want.join(' / ')}`, others.length ? `มี ${[...new Set(others)].join(', ')}` : `${shown.length} แถว ผ่าน`], same: shown.length > 0 && !others.length },
            { label: `${p1.label} 1/3 (เติมยาแล้ว)`, values: ['แสดง', p1r1], same: p1r1 === 'เติมยาแล้ว' },
            { label: `${p2.label} 1/3 (ยังไม่เติม)`, values: ['แสดง', p2r1], same: p2r1 === 'ยังไม่เติม' },
            { label: `${p1.label} 2/3 (กำลังเติมยา)`, values: ['ไม่แสดง', p1r2], same: p1r2 === 'ไม่แสดง' },
            { label: `${p2.label} 2/3 (ยกเลิกแล้ว)`, values: ['ไม่แสดง', p2r2], same: p2r2 === 'ไม่แสดง' },
          ]);
        });
        await hideCompareTable(page);
      }

      note('ผู้ป่วย', `${p1.label} HN ${p1.hn} · ${p1.vn} (ปิดแล้ว) · Visit Refill ${p1.vnR} · ${p2.label} HN ${p2.hn} · ${p2.vn} (ทิ้งไว้)`);
      expect(failures, `TC ที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
