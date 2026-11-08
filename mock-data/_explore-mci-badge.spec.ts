import { test } from './fixtures';
import { gotoVisit } from './uat-play';

// สำรวจแบบอ่านอย่างเดียว (ไม่กดบันทึก / ไม่กดพิมพ์) — หาปุ่มพิมพ์ป้ายปลายเตียงของผู้ป่วยที่มาจากเหตุการณ์หมู่ (UAT-ER-07 แถว 206) · 8 พ.ย. 2026
// รัน: EXPLORE_VISIT=<HN>,<VN>,<EN> npx playwright test -c playwright.sbh-prod.config.ts _explore-mci-badge --headed
test('สำรวจปุ่มพิมพ์ป้ายปลายเตียง ผู้ป่วยเหตุการณ์หมู่ (อ่านอย่างเดียว)', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const [hn, vn, en] = (process.env.EXPLORE_VISIT ?? '').split(',');
  if (!en) test.skip(true, 'ต้องตั้ง EXPLORE_VISIT=<HN>,<VN>,<EN>');
  await gotoVisit(page, { hn, vn, en });
  await page.waitForTimeout(8_000);
  const out = 'clips/UAT-ER-tor/explore-mci-badge';
  await page.screenshot({ path: `${out}-1-overview.png` });
  const printButtons = await page.getByRole('button').filter({ hasText: /พิมพ์|ป้าย/ }).allInnerTexts();
  console.log(`ปุ่มที่มีคำ พิมพ์ / ป้าย: ${printButtons.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | ') || '(ไม่มี)'}`);
  const named = await page.getByRole('button', { name: /พิมพ์ป้าย/ }).count();
  console.log(`ปุ่มชื่อ "พิมพ์ป้าย…" ทั้งหน้า: ${named}`);
  console.log(`มีข้อความ "ประวัติการคัดกรอง": ${await page.getByText('ประวัติการคัดกรอง').count()}`);
  // Right side menu (SBH-1025 / SBH-1785) — รวมรายการที่ซ่อนอยู่ (tooltip / title / aria-label)
  const anyBadge = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((el) => /ป้ายปลายเตียง/.test(`${el.getAttribute('title') ?? ''} ${el.getAttribute('aria-label') ?? ''} ${el.children.length === 0 ? el.textContent ?? '' : ''}`))
      .map((el) => `${el.tagName.toLowerCase()} x=${Math.round(el.getBoundingClientRect().x)} "${(el.getAttribute('title') || el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}"`),
  );
  console.log(`องค์ประกอบที่มีคำ "ป้ายปลายเตียง" (รวมที่ซ่อน): ${anyBadge.join(' | ') || '(ไม่มี)'}`);

  // ไอคอนเครื่องพิมพ์ + ลูกศรที่แถบ Visit (เปิดเมนูอย่างเดียว ไม่กดรายการ)
  const trigger = page.locator('[class*="anticon-printer"]').first().locator('xpath=following::*[contains(@class,"anticon-down")][1]');
  console.log(`ไอคอนเครื่องพิมพ์บนหน้า: ${await page.locator('[class*="anticon-printer"]').count()}`);
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
    await page.waitForTimeout(1_500);
    const items = await page.locator('.ant-dropdown:not(.ant-dropdown-hidden) li, [role="menuitem"]').allInnerTexts();
    console.log(`เมนูใต้ไอคอนเครื่องพิมพ์: ${items.map((t) => t.trim()).join(' | ') || '(ไม่มี)'}`);
    await page.screenshot({ path: `${out}-2-print-menu.png` });
    await page.keyboard.press('Escape');
  } else {
    console.log('ไม่พบลูกศรข้างไอคอนเครื่องพิมพ์ที่แถบ Visit');
    const printer = page.locator('[class*="anticon-printer"]').first();
    if (await printer.isVisible().catch(() => false)) {
      await printer.hover();
      await page.waitForTimeout(1_500);
      await page.screenshot({ path: `${out}-2-print-hover.png` });
    }
  }
});
