// เทสสำรวจชั่วคราว SBH-1117 (อ่านอย่างเดียว · dev-x): ตัวกรองแพทย์ผู้ร้องขอ ส่งคำขออะไร / กรองจริงไหม — ลบเมื่อเสร็จ
import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { selectOpdUnit } from '../helpers/functions/opd-activity';
import { consultClear, consultTab, gotoConsultList, readConsultRows, requesterFilter } from '../helpers/functions/opd-consult';
import { test } from './fixtures';
import { openPatientAs, options } from './uat-play';

const OUT = '.cache/explore-1117b';

test('สำรวจตัวกรองแพทย์ผู้ร้องขอ', async ({ page, browser }) => {
  test.setTimeout(400_000);
  fs.mkdirSync(OUT, { recursive: true });
  const log: string[] = [];
  const watch = (p: Page, who: string) =>
    p.on('request', (req) => {
      const post = req.postData() ?? '';
      if (/query ConsultRequests\(/.test(post)) log.push(`${who} ${new Date().toISOString().slice(11, 19)} ${JSON.stringify(JSON.parse(post).variables?.filter)}`);
    });

  const run = async (p: Page, who: string, tab: 'รับ Consult' | 'ส่ง Consult') => {
    await selectOpdUnit(p);
    await gotoConsultList(p);
    await consultTab(p, tab).click();
    await p.waitForTimeout(3000);
    await consultClear(p).click();
    await p.waitForTimeout(4000);
    const sel = requesterFilter(p);
    console.log(`[${who}/${tab}] ช่องแพทย์ผู้ร้องขอก่อนเลือก:`, (await sel.innerText()).replace(/\s+/g, ' '));
    const before = await readConsultRows(p);
    console.log(`[${who}/${tab}] ก่อนเลือก ${before.length} แถว ผู้ส่ง:`, [...new Set(before.map((r) => r.sender))].join(' · '));
    // ล้างค่าเดิม แล้วเปิดดูตัวเลือกทั้งหมด
    const removes = sel.locator('.ant-select-selection-item-remove');
    while (await removes.count()) await removes.first().click();
    await p.waitForTimeout(2500);
    await sel.click();
    await p.waitForTimeout(2000);
    const all = (await options(p).allInnerTexts()).map((t) => t.trim());
    console.log(`[${who}/${tab}] ตัวเลือกแพทย์ผู้ร้องขอ (${all.length}):`, all.slice(0, 15).join(' | '));
    // เลือกแพทย์ที่ไม่ใช่ นาย ทดสอบ มานะ
    const other = options(p).filter({ hasNotText: /ทดสอบ มานะ/ }).first();
    const otherName = (await other.innerText()).trim();
    await other.click();
    await p.keyboard.press('Escape');
    await p.waitForTimeout(5000);
    await p.screenshot({ path: `${OUT}/${who}-${tab === 'รับ Consult' ? 'receive' : 'send'}.png` });
    const after = await readConsultRows(p);
    console.log(`[${who}/${tab}] เลือก "${otherName}" แล้ว ${after.length} แถว ผู้ส่ง:`, [...new Set(after.map((r) => r.sender))].join(' · '));
  };

  watch(page, 'Super_User');
  await run(page, 'Super_User', 'ส่ง Consult');
  const pageB = await openPatientAs(browser, 'Doctor', '6931884');
  watch(pageB, 'Doctor');
  await run(pageB, 'Doctor', 'รับ Consult');
  await pageB.context().close();
  fs.writeFileSync(`${OUT}/requests.txt`, log.join('\n'));
  console.log(log.join('\n'));
});
