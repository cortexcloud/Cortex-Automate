import type { Page } from '@playwright/test';
import { graphqlMutation } from '../helpers/functions/er-disposition';
import { checkStep, expected, markEvidence, snapEvidence } from '../helpers/functions/evidence';
import { expectPatientInfo, fillNewPatientForm, gotoReception, openNewVisitPanel, saveNewPatient } from '../helpers/functions/reception';
import { newTestPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { addCoverageFirst, checkInOpdVisit, gotoPatient, openOpdVisit, recordMockPatient, scheduleWalkInRequest, SYSTEM } from './uat-er';
import { addMedicineToCart, options } from './uat-play';

// Mock Data (22 ต.ค. 2026 ผู้ใช้สั่ง "Mock Data คนไข้ 1 คนที่มี Order MED LAB IMAG Activity")
// ผู้ใช้เลือก: Dev-X · OPD คลินิก "SBH - ห้องตรวจสระบุรี" · สิทธิ H35 - UC ER คุณภาพ → dev-x ไม่มีสิทธินี้ (H35 บน dev-x = ครูเอกชน) ผู้ใช้เลือกแทนด้วย **H03 - สิทธิ UC** · สั่ง Order ครบแล้วทิ้ง Visit ไว้ (ไม่ตรวจเสร็จ / ไม่จำหน่าย / ไม่ปิด Visit)
// ขั้น: ลงทะเบียน AUTO ที่เวชระเบียน → Visit ใหม่ (สิทธิ H03 ลำดับ 1) → Visit OPD คลินิกสระบุรี → ลงตารางแพทย์ให้คำขอ Walk-in → เช็คอิน → แพทย์ (Super_User) สั่ง Order 4 ประเภท + ส่งคำสั่ง
// รัน: npx playwright test -c playwright.mock.config.ts UAT-OPD-orders --headed
// เปลี่ยนรหัส Order: MOCK_OPD_ORDERS="med0000008,SBHLAB76,SBHIMG1,89.52" · สิทธิ: MOCK_COVERAGE="H03 - สิทธิ UC" · ใช้ผู้ป่วยที่ลงทะเบียนแล้ว (ยังไม่มี Visit): MOCK_HN=<HN>

const CLINIC = { search: 'SBH', prefer: /^SBH - ห้องตรวจสระบุรี$/, name: 'SBH - ห้องตรวจสระบุรี' };
const COVERAGE = process.env.MOCK_COVERAGE || 'H03 - สิทธิ UC';
// dev-x (ตรวจ master data 21–22 ต.ค. 2026): ยา CLINDAVID-300 · Lab HbA1c · X-ray CHEST · Activity ECG
const ORDERS = (process.env.MOCK_OPD_ORDERS || 'med0000008,SBHLAB76,SBHIMG1,89.52').split(',').map((s) => s.trim()).filter(Boolean);

/** เพิ่ม Order ทีละรายการลงตะกร้า แล้วส่งคำสั่งจนทุกแถวเป็น "ส่งแล้ว" (บันทึกแบบฟอร์ม Imaging ให้) — แบบเดียวกับสเปก SBH-2233 */
async function orderAll(page: Page, codes: string[]) {
  const main = page.getByRole('main');
  const rows = () => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: /\[[^\]]+\]/ });
  const row = (code: string) => rows().filter({ hasText: `[${code}]` }).first();
  const sent = async (code: string) => /status-dot-sent/.test((await row(code).locator('[class*="status-dot"]').first().getAttribute('class').catch(() => '')) ?? '');
  const search = main.getByPlaceholder(/ค้นหา ยา, เวชภัณฑ์/);
  await search.waitFor({ timeout: 120_000 });
  await expect(main.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 60_000 }).catch(() => undefined);
  for (const code of codes) {
    if (await row(code).isVisible().catch(() => false)) continue;
    if (/^med/i.test(code)) {
      await addMedicineToCart(page, code);
    } else {
      await search.click();
      await search.fill(code);
      const option = options(page).filter({ hasText: `[${code}]` }).first();
      await expect(option, `ต้องค้นเจอรายการ ${code}`).toBeVisible({ timeout: 30_000 });
      await option.click();
      await expect(async () => {
        const up = graphqlMutation(page, 'UpsertOpdOrder', 8_000);
        up.catch(() => undefined);
        await page.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).filter({ visible: true }).first().click();
        await up;
      }, `เพิ่ม ${code} ลงตะกร้า`).toPass({ timeout: 45_000 });
    }
    await expect(row(code), `รายการ ${code} ต้องขึ้นในตะกร้า`).toBeVisible({ timeout: 60_000 });
  }
  const errors: string[] = [];
  const watch = async (res: import('@playwright/test').Response) => {
    if (!(res.request().postData() ?? '').includes('mutation SignOPDOrders')) return;
    const body = (await res.json().catch(() => ({}))) as { errors?: { message: string }[] };
    for (const e of body.errors ?? []) errors.push(e.message);
  };
  page.on('response', watch);
  try {
    for (let i = 0; i < 10; i++) {
      let all = true;
      for (const c of codes) if (!(await sent(c))) all = false;
      if (all) break;
      const form = page.getByRole('dialog').filter({ visible: true }).filter({ hasText: 'แบบฟอร์ม Imaging' }).first();
      if (await form.isVisible().catch(() => false)) {
        await form.getByRole('button', { name: /บันทึก/ }).click();
        await page.waitForTimeout(4_000);
        continue;
      }
      const signed = graphqlMutation(page, 'SignOPDOrders', 90_000);
      signed.catch(() => undefined);
      await main.getByRole('button', { name: /ส่งคำสั่ง/ }).first().click();
      await Promise.race([signed, form.waitFor({ timeout: 90_000 })]).catch(() => undefined);
      await page.waitForTimeout(4_000);
    }
  } finally {
    page.off('response', watch);
  }
  for (const c of codes) expect(await sent(c), `${c} ต้องส่งคำสั่งแล้ว${errors.length ? ` (${errors.join(' · ')})` : ''}`).toBe(true);
  await markEvidence(...codes.map((c) => expected(row(c))));
  return (await rows().allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
}

test('Mock Data OPD: ผู้ป่วย 1 ราย Order ยา + Lab + Imaging + Activity (ทิ้ง Visit)', async ({ page }) => {
  test.skip(SYSTEM !== 'dev-x', 'ผู้ใช้สั่งให้สร้างบน Dev-X (รหัส Order / คลินิกเป็นของ dev-x)');
  test.setTimeout(20 * 60_000);
  const main = page.getByRole('main');
  const p = newTestPatient('MockOrder');
  let hn = '';
  let vn = '';
  let en = '';

  const existing = process.env.MOCK_HN?.trim();
  if (existing) {
    await checkStep(page, `ผู้ป่วยที่ลงทะเบียนแล้ว HN ${existing} → จัดการ Visit`, async () => {
      hn = existing;
      await gotoPatient(page, hn);
      const name = (await main.getByText(/AUTO \S+/).first().textContent())?.match(/AUTO (\S+)/);
      if (name) p.familyName = name[1];
      p.citizenId = '-';
      await page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: 'จัดการ Visit' }).click({ force: true });
      await main.getByText(/^รายการเข้ารับบริการ/).waitFor({ timeout: 60_000 });
      console.log(`    ใช้ผู้ป่วยเดิม ${p.firstName} ${p.familyName} HN ${hn}`);
    });
  } else {
    await checkStep(page, 'ลงทะเบียนผู้ป่วยใหม่ที่เวชระเบียน', async () => {
      await gotoReception(page);
      await fillNewPatientForm(page, p);
      hn = await saveNewPatient(page);
      console.log(`    ลงทะเบียน ${p.firstName} ${p.familyName} ได้ HN ${hn}`);
    });
  }

  try {
    await checkStep(page, `Visit OPD ${CLINIC.name} สิทธิ ${COVERAGE} + เช็คอิน`, async () => {
      if (!existing && (await expectPatientInfo(page))) await openNewVisitPanel(page);
      await addCoverageFirst(page, COVERAGE);
      const opd = await openOpdVisit(page, { anyDoctor: true, clinic: CLINIC });
      expect(opd.clinic, 'Visit ต้องเปิดที่คลินิกสระบุรี').toBe(CLINIC.name);
      vn = opd.vn;
      en = opd.en;
      if (!opd.doctor) await scheduleWalkInRequest(page, hn);
      const queue = await checkInOpdVisit(page, { hn, vn, en } as never);
      console.log(`    Visit ${vn} · EN ${en} · เช็คอิน ${queue}`);
    });
  } catch (error) {
    recordMockPatient('OPD ORDER', p, { hn, vn, en }, `ลงทะเบียนแล้ว · เปิด Visit / เช็คอินไม่สำเร็จ (${String((error as Error).message).split('\n')[0].slice(0, 150)})`);
    throw error;
  }

  let cart: string[] = [];
  try {
    await checkStep(page, `แพทย์สั่ง ${ORDERS.join(' + ')} แล้วส่งคำสั่ง`, async () => {
      await page.goto(`/cortex/next/patients/${hn}?en=${en}&vn=${vn}&fromApp=opd&preset=opdV2`, { waitUntil: 'domcontentloaded' });
      await expect(main.getByText(`VN ${vn}`, { exact: true }).first(), 'เปิดหน้า EMR แล้วต้องเห็นแถบ Visit').toBeVisible({ timeout: 120_000 });
      await page.waitForTimeout(3_000);
      cart = await orderAll(page, ORDERS);
      await snapEvidence(page, 'ตะกร้าหลังส่งคำสั่งครบ');
    });
  } catch (error) {
    recordMockPatient('OPD ORDER', p, { hn, vn, en }, `Visit OPD ${CLINIC.name} สิทธิ ${COVERAGE} · เช็คอินแล้ว · สั่ง Order ไม่ครบ (${String((error as Error).message).split('\n')[0].slice(0, 150)})`);
    throw error;
  }

  recordMockPatient('OPD ORDER', p, { hn, vn, en }, `Visit OPD ${CLINIC.name} สิทธิ ${COVERAGE} · เช็คอินแล้ว · ส่งคำสั่ง ${cart.map((t) => t.match(/\[[^\]]+\][^|]*/)?.[0]?.slice(0, 60) ?? t.slice(0, 60)).join(' / ')} · ทิ้ง Visit ไว้`);
});
