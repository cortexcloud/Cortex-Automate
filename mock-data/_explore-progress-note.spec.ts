import { expect, test } from './fixtures';
import { careMenu, gotoVisit, options, pick } from './uat-play';

// สำรวจฟอร์ม Doctor Progress Note แบบอ่านอย่างเดียว (ไม่กรอก ไม่บันทึก) — หาช่อง Perform time (UAT-ER-06 แถว 178) · 8 พ.ย. 2026
// รัน: EXPLORE_VISIT=<HN>,<VN>,<EN> npx playwright test -c playwright.sbh-prod.config.ts _explore-progress-note --headed
test('สำรวจฟอร์ม Doctor Progress Note (อ่านอย่างเดียว)', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const [hn, vn, en] = (process.env.EXPLORE_VISIT ?? '').split(',');
  if (!en) test.skip(true, 'ต้องตั้ง EXPLORE_VISIT=<HN>,<VN>,<EN>');
  await gotoVisit(page, { hn, vn, en });
  const main = page.getByRole('main');
  const heading = main.getByRole('heading', { name: 'Doctor Progress Note' });
  await careMenu(page, 'สร้างฟอร์ม', main.getByText('เลือกฟอร์ม', { exact: true }).first());
  await pick(main.locator('.ant-select').filter({ hasText: /^(เลือก|Doctor Progress Note)$/ }).last());
  await page.keyboard.type('Doctor Progress');
  await pick(options(page).filter({ hasText: /^Doctor Progress Note$/ }).first());
  await expect(heading).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(3_000);
  const form = main.locator('div').filter({ has: heading }).filter({ has: main.locator('[contenteditable="true"]') }).last();
  await form.scrollIntoViewIfNeeded();
  const fields = await form.locator('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="textbox"]').evaluateAll((els) =>
    els.map((el) => {
      const e = el as HTMLInputElement;
      const label = e.closest('label')?.textContent?.trim() || e.getAttribute('aria-label') || '';
      const prev = (e.closest('div')?.previousElementSibling?.textContent ?? '').trim().slice(0, 40);
      return `${e.tagName.toLowerCase()} type=${e.getAttribute('type') ?? '-'} name=${e.getAttribute('name') ?? '-'} ph=${e.getAttribute('placeholder') ?? '-'} label=${label.slice(0, 40)} prev=${prev} value=${(e.value ?? e.textContent ?? '').slice(0, 30)}`;
    }),
  );
  console.log(`ช่องในฟอร์ม (${fields.length}):\n  ${fields.join('\n  ')}`);
  const texts = (await form.innerText()).replace(/\s+/g, ' ').slice(0, 800);
  console.log(`ข้อความในฟอร์ม: ${texts}`);
  const perform = await form.getByText(/perform|เวลาที่ทำ|เวลาปฏิบัติ/i).allInnerTexts();
  console.log(`ข้อความที่มีคำว่า Perform: ${perform.join(' | ') || '(ไม่มี)'}`);
  await page.screenshot({ path: 'clips/UAT-ER-tor/explore-progress-note.png' });
  await form.screenshot({ path: 'clips/UAT-ER-tor/explore-progress-note-form.png' }).catch(() => undefined);
});
