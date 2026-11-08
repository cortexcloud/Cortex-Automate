import { test } from './fixtures';
import { gotoVisit } from './uat-play';

// สำรวจแบบอ่านอย่างเดียว (ไม่เลือกพยาบาล / ไม่กดรับ Order) — UAT-ER-09 แถว 236 · 241 · 8 พ.ย. 2026
// รัน: EXPLORE_VISIT=<HN>,<VN>,<EN> npx playwright test -c playwright.sbh-prod.config.ts _explore-nurse-task --headed
test('สำรวจช่องพยาบาล + แถวงานพยาบาล (อ่านอย่างเดียว)', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const [hn, vn, en] = (process.env.EXPLORE_VISIT ?? '').split(',');
  if (!en) test.skip(true, 'ต้องตั้ง EXPLORE_VISIT=<HN>,<VN>,<EN>');
  const out = 'clips/UAT-ER-tor/explore-nurse';
  const main = page.getByRole('main');

  // 1) ช่อง "พยาบาล" ใน Overview — เปิด dropdown ดูรายชื่อ แล้วปิด (Esc)
  await gotoVisit(page, { hn, vn, en });
  const box = main.getByRole('combobox', { name: 'พยาบาล' }).first();
  await box.waitFor({ timeout: 60_000 });
  console.log(`combobox "พยาบาล": ${await main.getByRole('combobox', { name: 'พยาบาล' }).count()} ช่อง`);
  await box.click();
  await page.waitForTimeout(4_000);
  const dropdowns = await page.locator('.ant-select-dropdown').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const opts = [...el.querySelectorAll('.ant-select-item')].slice(0, 8).map((o) => `${(o.textContent ?? '').trim().slice(0, 40)}${o.classList.contains('ant-select-item-option-disabled') ? ' [disabled]' : ''}`);
      return `hidden=${el.classList.contains('ant-select-dropdown-hidden')} size=${Math.round(r.width)}x${Math.round(r.height)} empty=${!!el.querySelector('.ant-empty, .ant-select-item-empty')} options=${opts.join(' | ')}`;
    }),
  );
  console.log(`dropdown ทั้งหมด (${dropdowns.length}):\n  ${dropdowns.join('\n  ')}`);
  await page.screenshot({ path: `${out}-1-dropdown.png` });
  await page.keyboard.press('Escape');

  // 2) หน้ารายการงานพยาบาล — โครงสร้างแถวงาน
  await page.goto('/cortex/er/nurse-task-list');
  const patient = main.getByRole('button', { name: new RegExp(`HN ${hn} `) }).first();
  await patient.waitFor({ timeout: 60_000 });
  await patient.click();
  await page.waitForTimeout(4_000);
  const accept = main.getByRole('button', { name: /รับ/ });
  console.log(`ปุ่มที่มีคำ "รับ": ${(await accept.allInnerTexts()).map((t) => t.trim()).join(' | ')}`);
  console.log(`getByRole('row') ทั้งหมด: ${await main.getByRole('row').count()}`);
  const info = await accept.first().evaluate((btn) => {
    const chain: string[] = [];
    let node: Element | null = btn;
    for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
      chain.push(`${node.tagName.toLowerCase()}${node.getAttribute('role') ? `[role=${node.getAttribute('role')}]` : ''}.${(node.className || '').toString().split(' ').slice(0, 2).join('.')} "${(node.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)}"`);
    }
    return chain.join('\n    ← ');
  });
  console.log(`ปุ่มรับแถวแรก ← บรรพบุรุษ:\n    ${info}`);
  await page.screenshot({ path: `${out}-2-task-list.png` });
});
