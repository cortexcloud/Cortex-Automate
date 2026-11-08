import { expect } from '@playwright/test';
import { test } from './fixtures';

// สำรวจชั่วคราว (อ่านอย่างเดียว · ไม่กดยืนยันใดๆ): หน้า IPD หออายุรกรรม ชาย ของผู้ป่วยรอเตียงที่มี AN (8 พ.ย. 2026 เคลียร์ ER Board)
const OUT = process.env.EXPLORE_OUT ?? 'clips/_explore-ipd';
const options = (page: import('@playwright/test').Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');

test('สำรวจหน้า IPD ก่อน Discharge', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const main = page.getByRole('main');
  const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}.png` });
  await page.goto('/cortex/ipd/select-ward');
  const sel = main.locator('.ant-select').first();
  const t0 = Date.now();
  await sel.waitFor({ timeout: 120_000 }).catch(() => undefined);
  console.log(`หน้าเลือกหอขึ้นใน ${Math.round((Date.now() - t0) / 1000)} วิ`);
  await shot('01-select-ward');
  console.log('URL หลังเปิด select-ward:', page.url());
  if (await sel.isVisible().catch(() => false)) {
    await sel.click();
    await expect(options(page).first()).toBeVisible({ timeout: 30_000 });
    console.log('หอที่เลือกได้:', (await options(page).allInnerTexts()).join(' | '));
    await options(page).filter({ hasText: 'หออายุรกรรม ชาย' }).first().click();
    await main.getByRole('button', { name: 'ส่ง' }).click();
  }
  await page.waitForURL(/ipd\/bed-list/, { timeout: 60_000 });
  await page.waitForTimeout(5_000);
  await shot('02-bed-list');
  console.log('แท็บ:', (await main.getByRole('tab').allInnerTexts()).join(' | '));
  for (const hn of ['6904649', '6904708']) console.log(`HN ${hn} ในหน้า bed-list:`, await main.getByText(hn).count());
  await page.goto('/cortex/ipd/bed-list?tab=waiting-list');
  await page.waitForTimeout(6_000);
  const clear = main.getByRole('button', { name: /ล้างตัวกรอง/ });
  if (await clear.isVisible().catch(() => false)) await clear.click();
  await page.waitForTimeout(4_000);
  await shot('03-waiting-list');
  for (const hn of ['6904708', '6904656', '6904613']) console.log(`HN ${hn} ในแท็บ waiting-list:`, await main.getByText(hn).count());
  // แท็บ เตียงทั้งหมด → ล้างตัวกรองแพทย์ → HN 6904649 → ⋮ → Discharge → ดูหน้าต่าง แล้วกดยกเลิก (ไม่ยืนยัน)
  await main.getByRole('tab', { name: /เตียงทั้งหมด/ }).first().click();
  await page.waitForTimeout(4_000);
  const docSel = main.locator('[class*="_physician-select_"]').filter({ hasText: /\S/ }).first();
  if (await docSel.waitFor({ timeout: 10_000 }).then(() => true, () => false)) {
    await docSel.hover().catch(() => undefined);
    const x = docSel.locator('.ant-select-clear');
    if (await x.count()) await x.first().click({ force: true });
    await page.waitForTimeout(3_000);
  }
  const row = main.getByRole('row').filter({ hasText: '6904649' }).first();
  console.log('แถว 6904649 ในแท็บ เตียงทั้งหมด:', await row.count());
  if (!(await row.count())) return;
  console.log('ข้อความแถว:', (await row.innerText()).replace(/\s+/g, ' '));
  const kebab = row.locator('[data-testid^="admission-bed-actions-"]').first();
  const discharge = page.locator('.ant-dropdown:visible').getByText('Discharge', { exact: true }).first();
  await expect(async () => {
    await kebab.click();
    await expect(discharge).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 40_000 });
  await discharge.click();
  const dlg = page.locator('.ant-modal:visible').filter({ hasText: 'ยืนยันการจำหน่ายผู้ป่วย' }).first();
  await expect(dlg).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3_000);
  await shot('04-discharge-dialog');
  console.log('ข้อความหน้าต่าง Discharge:', (await dlg.innerText()).replace(/\s+/g, ' ').slice(0, 2500));
  await dlg.getByRole('button', { name: /ยกเลิก/ }).first().click().catch(() => page.keyboard.press('Escape'));
});
