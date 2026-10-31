// เทสสำรวจชั่วคราวของการ์ด SBH-1117 (dev-x) — ลบเมื่อเขียน spec จริงเสร็จ
// EXP_VISIT=<HN>,<VN>,<EN> ทำต่อกับรายเดิม · EXP_FROM=consult|list
import fs from 'node:fs';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, openNewVisitPanel, saveNewPatient } from '../helpers/functions/reception';
import { newTestPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { openOpdVisit } from './uat-er';
import { careMenu, options } from './uat-play';

const OUT = '.cache/explore-1117';
const STEPS = ['visit', 'consult', 'list'];

test('สำรวจ SBH-1117', async ({ page }) => {
  test.setTimeout(600_000);
  fs.mkdirSync(OUT, { recursive: true });
  const dump = (n: string, t: string) => fs.writeFileSync(`${OUT}/${n}`, t);
  const shot = (n: string) => page.screenshot({ path: `${OUT}/${n}.png` });
  const net: string[] = [];
  page.on('response', async (res) => {
    const post = res.request().postData() ?? '';
    const op = post.match(/(query|mutation)\s+(\w+)/)?.[2];
    if (op && /Consult|Practitioner|Patient/i.test(op)) {
      let vars = '';
      try { vars = JSON.stringify(JSON.parse(post).variables); } catch {}
      net.push(`${res.status()} ${op} vars=${vars.slice(0, 300)} → ${(await res.text().catch(() => '')).slice(0, 300)}`);
    }
  });
  const main = page.getByRole('main');
  const from = STEPS.indexOf(process.env.EXP_FROM ?? 'visit');
  let [hn, vn, en] = (process.env.EXP_VISIT ?? '').split(',');

  if (from <= 0 && !hn) {
    const patient = newTestPatient('Consult1117');
    await gotoReception(page);
    await fillNewPatientForm(page, patient);
    hn = await saveNewPatient(page);
    console.log(`ผู้ป่วย ${patient.firstName} ${patient.familyName} HN ${hn}`);
    if (await expectPatientInfo(page)) await openNewVisitPanel(page);
    const opd = await openOpdVisit(page);
    vn = opd.vn;
    en = opd.en;
    console.log(`EXP_VISIT=${hn},${vn},${en}`);
    await selectOpdUnit(page);
    await checkInFromOpdList(page, await opdListRow(page, hn));
    console.log('เช็คอินแล้ว');
  }

  if (from <= 1) {
    await page.goto(`/cortex/next/patients/${hn}?en=${en}&vn=${vn}`);
    await expect(main.getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(4000);
    try {
      await careMenu(page, 'Consult', main.getByRole('heading', { name: 'Consult', exact: true }));
      await page.waitForTimeout(2000);
      await shot('10-consult-form');
      await dump('10-consult-form.txt', await main.innerText());
      const doctorBox = main.getByRole('combobox', { name: 'แพทย์ขอปรึกษา' });
      console.log('ช่องแพทย์ขอปรึกษา', await doctorBox.count());
      await doctorBox.click();
      await doctorBox.fill('เอื้อเฟื้อ');
      await expect(options(page).first()).toBeVisible();
      console.log('ตัวเลือกแพทย์', (await options(page).allInnerTexts()).join(' | '));
      await options(page).filter({ hasText: /วิชัย/ }).first().click();
      await page.waitForTimeout(1000);
      await main.locator('[contenteditable="true"]').last().fill('ทดสอบค้นหารายการปรึกษาแพทย์ (SBH-1117)');
      await shot('11-before-save');
      const saved = page.waitForResponse((r) => /mutation CreateConsultRequest/.test(r.request().postData() ?? ''), { timeout: 30_000 });
      await main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).last().click();
      const r = await saved;
      console.log('CreateConsultRequest', r.status(), (await r.text()).slice(0, 400));
      await page.waitForTimeout(2000);
      await shot('12-after-save');
    } finally {
      await dump('10-dialogs.txt', (await page.getByRole('dialog').allInnerTexts()).join('\n---\n'));
    }
  }

  if (from <= 2) {
    await page.goto('/cortex/opd/consult-request-list');
    const nameBox = main.getByPlaceholder('ค้นหา ชื่อผู้ป่วย');
    await nameBox.waitFor({ timeout: 120_000 });
    await page.waitForTimeout(3000);
    for (const tab of ['ส่ง Consult', 'รับ Consult']) {
      await page.getByRole('tab', { name: new RegExp(tab) }).click();
      await page.waitForTimeout(4000);
      const key = tab === 'ส่ง Consult' ? 'send' : 'receive';
      await shot(`20-${key}`);
      await dump(`20-${key}.txt`, await main.innerText());
      const filters = await main.locator('.ant-select').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim() || e.querySelector('input')?.getAttribute('placeholder') || '?'));
      console.log(`[${key}] select ทั้งหมด:`, filters.join(' | '));
      // พิมพ์ชื่อผู้ป่วย (ส่วนของชื่อ AUTO)
      await nameBox.click();
      await nameBox.fill('Consult1117');
      await page.waitForTimeout(3000);
      await shot(`21-${key}-name-dropdown`);
      await expect(options(page).first()).toBeVisible({ timeout: 15_000 }).catch(() => undefined);
      console.log(`[${key}] ตัวเลือกชื่อผู้ป่วย:`, (await options(page).allInnerTexts()).join(' | ').slice(0, 500));
      if (await options(page).count()) {
        await options(page).first().click();
        await page.waitForTimeout(4000);
        await shot(`22-${key}-after-pick`);
        console.log(`[${key}] แถวหลังเลือก:`, (await main.locator('tr.ant-table-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').slice(0, 160)).join(' || '));
      }
      await dump(`23-${key}-selects.html`, (await main.locator('.ant-select').evaluateAll((els) => els.map((e) => e.outerHTML.slice(0, 1500)))).join('\n====\n'));
      await dump(`21-${key}-dropdown.html`, (await page.locator('.ant-select-dropdown:visible, .ant-dropdown:visible').evaluateAll((els) => els.map((e) => e.outerHTML.slice(0, 3000)))).join('\n====\n'));
      await page.getByRole('button', { name: /Clear/ }).click();
      await page.waitForTimeout(3000);
    }
  }
  await dump('net.txt', net.join('\n'));
});
