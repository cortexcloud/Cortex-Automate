import { openTvWindow, readAllTvPatientPages, tvPatientsSection } from '../helpers/functions/er-tv-queue';
import { test } from './fixtures';

// สำรวจจอ ER TV แบบอ่านอย่างเดียว (ไม่เรียกคิว) — ป้าย ESI ตามสีในตาราง (UAT-ER-11 แถว 261) · 8 พ.ย. 2026
// รัน: TV_QUEUES=PTB53973,PTB53974,PTB53975 npx playwright test -c playwright.sbh-prod.config.ts _explore-tv --headed
test('สำรวจตารางจอ ER TV (อ่านอย่างเดียว)', async ({ browser }) => {
  test.setTimeout(5 * 60_000);
  const queues = (process.env.TV_QUEUES ?? '').split(',').filter(Boolean);
  const tv = await openTvWindow(browser);
  const section = tvPatientsSection(tv);
  await tv.screenshot({ path: 'clips/UAT-ER-tor/explore-tv-0.png' });
  const found = new Set<string>();
  await readAllTvPatientPages(tv, async (pageNo, rows) => {
    for (const q of queues) {
      if (found.has(q) || !rows.find((r) => r.queue === q)) continue;
      found.add(q);
      const html = await section.locator('tbody tr.ant-table-row').filter({ hasText: q }).first().evaluate((tr) =>
        [...tr.querySelectorAll('td')].map((td) => {
          const inner = [...td.querySelectorAll('*')].map((el) => {
            const s = getComputedStyle(el as HTMLElement);
            return `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).split(' ')[0]} "${(el as HTMLElement).innerText?.trim().slice(0, 20) ?? ''}" bg=${s.backgroundColor} color=${s.color}`;
          });
          return `[td "${td.innerText.trim().slice(0, 30)}"] ${inner.slice(0, 4).join(' · ')}`;
        }).join('\n    '),
      );
      console.log(`หน้า ${pageNo} คิว ${q}:\n    ${html}`);
      await tv.screenshot({ path: `clips/UAT-ER-tor/explore-tv-${q}.png` });
    }
  });
  console.log(`หัวตาราง: ${(await section.locator('thead th').allInnerTexts()).join(' | ')}`);
  await tv.context().close();
});
