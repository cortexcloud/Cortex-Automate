import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { cancelMedication, disposeByTransfer, gotoDisposition, newErVisit, physicianNote, reTriage, triageEr, waitNextMinute } from '../helpers/functions/refer-out-prep';
import { expect, test } from './fixtures';
import { recordDrugAllergy, submitOrders } from './uat-er';
import { gotoVisit } from './uat-play';

// สำรวจชั่วคราว SBH-1016 (MoPH Refer Out) บน dev-x — สร้างผู้ป่วย AUTO 1 ราย (ER By Transfer) แล้ว dump หน้า Worklist / คำขอ / แผงฝั่ง ER
// ไม่กดปุ่มพิจารณา (อนุมัติ / ไม่อนุมัติ / รอผู้อำนวยการลงนาม / บันทึกร่าง / ส่ง) · ลบเมื่อเขียน spec จริงเสร็จ
// ใช้ผู้ป่วยเดิม: SBH1016_EXPLORE=HN,VN,EN
const OUT = '.cache/explore-1016';
fs.mkdirSync(OUT, { recursive: true });
const log = (s: string) => {
  fs.appendFileSync(`${OUT}/log.txt`, s + '\n');
  console.log(s);
};

async function dump(page: Page, tag: string) {
  await page.waitForTimeout(2_500);
  fs.writeFileSync(`${OUT}/${tag}.txt`, await page.getByRole('main').innerText().catch(() => page.locator('body').innerText()));
  fs.writeFileSync(`${OUT}/${tag}.html`, await page.locator('body').evaluate((b) => b.outerHTML));
  await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: true });
  const buttons = await page.getByRole('button').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).map((e) => `${(e.textContent ?? '').trim()}${(e as HTMLButtonElement).disabled ? ' [disabled]' : ''}`));
  log(`--- ${tag} buttons: ${buttons.filter(Boolean).join(' | ')}`);
}

test('สำรวจ SBH-1016 Refer Out', async ({ page }) => {
  test.setTimeout(30 * 60_000);
  page.on('request', (r) => {
    if (/moph\/refer-out/.test(r.url())) log(`REQ ${r.method()} ${r.url().replace(/^https:\/\/[^/]+/, '')}`);
  });
  let visit: { hn: string; vn: string; en: string };
  if (process.env.SBH1016_EXPLORE) {
    const [hn, vn, en] = process.env.SBH1016_EXPLORE.split(',');
    visit = { hn, vn, en };
  } else {
    const v = await newErVisit(page, 'X1016E');
    visit = v;
    log(`ผู้ป่วย ${v.name} HN ${v.hn} VN ${v.vn} EN ${v.en}`);
    fs.writeFileSync(`${OUT}/visit.json`, JSON.stringify(v));
    await triageEr(page, v, 2, { systolic: '138', diastolic: '88', pr: '96', rr: '22', temp: '38.1', spo2: '96', painScore: '5' });
    log('คัดกรอง ESI 2 แล้ว');
    log(`Dx: ${(await physicianNote(page, ['K30', 'I10'])).join(' / ')}`);
    await waitNextMinute(page);
    await reTriage(page, v, 2, { systolic: '124', diastolic: '78', pr: '84', rr: '18', temp: '37.4', spo2: '98', painScore: '3' });
    log('คัดกรองซ้ำ (สัญญาณชีพชุดที่ 2) แล้ว');
    log(`แพ้ยา: ${await recordDrugAllergy(page)}`);
    await submitOrders(page, ['med0000006', 'med0000007', 'med0000008']);
    await cancelMedication(page, 'med0000008');
    log('สั่งยา 3 รายการ ยกเลิก med0000008 แล้ว');
    const d = await disposeByTransfer(page, v);
    log(`Disposition By Transfer → ${d.hospital} · ลงนาม ${d.summary.completedAt}`);
  }

  // Worklist
  await page.goto('/cortex/refer/refer-out');
  await expect(page.getByRole('main').getByText(visit.hn).first(), 'Worklist ต้องมีแถวของผู้ป่วย').toBeVisible({ timeout: 90_000 });
  await dump(page, '01-worklist');
  const row = page.getByRole('main').getByRole('row').filter({ hasText: visit.hn }).first();
  log(`แถว: ${(await row.innerText()).replace(/\s+/g, ' ')}`);
  fs.writeFileSync(`${OUT}/01-row.html`, await row.evaluate((r) => r.outerHTML));

  // หน้าคำขอ (กดจากแถว — ดูว่ากดแล้วยิง POST /open ไหม)
  await row.click();
  await page.waitForTimeout(5_000);
  log(`URL หลังกดแถว: ${page.url()}`);
  await dump(page, '02-detail');

  // แผงฝั่ง ER (หน้าหลังตรวจ = Disposition)
  await gotoVisit(page, visit as never);
  await page.waitForTimeout(5_000);
  await dump(page, '03-er-overview');
  await gotoDisposition(page, visit as never);
  await dump(page, '04-er-disposition');
});
