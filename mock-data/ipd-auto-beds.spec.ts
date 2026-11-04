import { type Locator, type Page } from '@playwright/test';
import { trackAuthorization } from '../helpers/functions/er-report';
import { alerted, checkStep, clearEvidenceMarks, clicked, expected, filled, markEvidence, snapEvidence } from '../helpers/functions/evidence';
import { expect, test } from './fixtures';
import { SYSTEM } from './uat-er';

// สร้างเตียง IPD สำหรับผู้ป่วย AUTO บน dev-x (ผู้ใช้สั่ง 3 พ.ย. 2026) — กดผ่านหน้า ตั้งค่า > ศูนย์จัดการเตียง > ตั้งค่าเตียง
//   หน้า /cortex/setting/admission-center/bed-setup → ปุ่ม `สร้างเตียง` → แผนก อายุรกรรม · Ward หออายุรกรรม ชาย · ห้อง 101 (M1-101)
//   · เลขเตียง SBHAUTO-xx · ประเภทเตียง สามัญ · ราคา 200 · สถานะ ว่าง · เปิดใช้งาน · หมายเหตุ → graphql CreateBed
//   ตั้งค่าเหมือนเตียง SBH001–020 · หออายุรกรรม ชาย = หอที่ createAdmitRequest() เลือก (ตัวเลือกแรก)
// เตียงที่มีชื่อนี้อยู่แล้ว (ทุกหอ รวมที่ยกเลิกใช้งาน) ข้าม · รันซ้ำได้
// รัน: npx playwright test -c playwright.mock.config.ts ipd-auto-beds --headed --project=chrome
//   เปลี่ยนช่วง: BED_FROM=11 BED_TO=20 (ตั้งต้น 1–10) · ลบเตียงทีหลังได้จากปุ่ม จัดการ ของแถว (softDeleteBed)

const PREFIX = 'SBHAUTO-';
const FROM = Number(process.env.BED_FROM ?? 1);
const TO = Number(process.env.BED_TO ?? 10);
const BED = { department: 'อายุรกรรม', ward: 'หออายุรกรรม ชาย', room: 'ห้อง 101', bedType: 'สามัญ', price: '200', status: 'ว่าง', remark: 'สำหรับผู้ป่วย AUTO (Cortex Automate)' };

interface BedRow { id: number; name: string; active: boolean; ward: { info: { th: { name: string } } }; room: { info: { th: { name: string } } } | null; bedType: { info: { th: { name: string } } }; price: number; detail: { status: string } | null }

async function fetchBeds(page: Page, auth: () => string): Promise<BedRow[]> {
  const query = `query BedSetupBeds($filter: BedSetupFilter!) { bedSetupBeds(filter: $filter) { id name active price ward { info { th { name } } } room { info { th { name } } } bedType { info { th { name } } } detail { status } } }`;
  const res = await page.request.post('/cortex-api/graphql', { headers: { authorization: auth() }, data: { operationName: 'BedSetupBeds', query, variables: { filter: { includeInactive: true } } } });
  expect(res.ok(), 'อ่านรายการเตียง (BedSetupBeds)').toBeTruthy();
  const body = (await res.json()) as { data?: { bedSetupBeds: BedRow[] }; errors?: unknown };
  expect(body.errors, 'อ่านรายการเตียงต้องไม่มี error').toBeUndefined();
  return body.data!.bedSetupBeds;
}

/** ant-select ในฟอร์ม (หาจาก id ของ input ข้างใน) */
function selectOf(dlg: Locator, id: string): Locator {
  return dlg.locator(`#${id}`).locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
}

/** ค่าที่เลือกอยู่ของ ant-select (ว่าง = ยังไม่เลือก) */
async function selectedText(sel: Locator): Promise<string> {
  return (await sel.locator('.ant-select-selection-item, .ant-select-content-value').first().innerText().catch(() => '')).trim();
}

/** เปิด dropdown แล้วเลือกตัวเลือกที่ข้อความตรง `text` (รายการเป็น virtual list → เลื่อนไล่หา) */
async function choose(page: Page, sel: Locator, text: string) {
  if ((await selectedText(sel)) === text) return;
  await sel.click();
  const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
  await expect(options.first()).toBeVisible({ timeout: 15_000 });
  const holder = page.locator('.ant-select-dropdown:visible .rc-virtual-list-holder').first();
  for (let i = 0; i < 40; i++) {
    const option = options.filter({ hasText: new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) }).first();
    if (await option.count()) {
      await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
      await expect.poll(() => selectedText(sel), { message: `เลือก ${text}` }).toBe(text);
      return;
    }
    const moved = await holder.evaluate((e) => { const before = e.scrollTop; e.scrollTop += 200; return e.scrollTop !== before; }).catch(() => false);
    if (!moved) break;
    await page.waitForTimeout(150);
  }
  throw new Error(`ไม่พบตัวเลือก "${text}"`);
}

test(`สร้างเตียง IPD ${PREFIX}${String(FROM).padStart(2, '0')}–${String(TO).padStart(2, '0')} สำหรับผู้ป่วย AUTO (${SYSTEM})`, async ({ page }) => {
  test.skip(SYSTEM !== 'dev-x', 'สร้างเตียงได้เฉพาะ dev-x (ผู้ใช้สั่ง 3 พ.ย. 2026) — ห้ามรันบน SBH Prod / SBH Dev');
  test.setTimeout(20 * 60_000);
  const auth = trackAuthorization(page);
  const names = Array.from({ length: TO - FROM + 1 }, (_, i) => `${PREFIX}${String(FROM + i).padStart(2, '0')}`);

  await page.goto('/cortex/setting/admission-center/bed-setup');
  const createButton = page.getByRole('button', { name: 'สร้างเตียง' });
  await expect(createButton).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => auth(), { message: 'รอ token ของแอป' }).toBeTruthy();

  const existing = new Map((await fetchBeds(page, auth)).map((b) => [b.name, b]));
  const results: string[] = [];

  for (const name of names) {
    const old = existing.get(name);
    if (old) {
      const line = `${name}: มีอยู่แล้ว ข้าม (id ${old.id} · ${old.ward.info.th.name} · ${old.active ? 'เปิดใช้งาน' : 'ยกเลิกใช้งาน'} · ${old.detail?.status ?? '-'})`;
      console.log(`    ${line}`);
      results.push(line);
      continue;
    }
    await checkStep(page, `สร้างเตียง ${name}`, async () => {
      await createButton.click();
      const dlg = page.locator('.ant-modal:visible').filter({ hasText: 'สร้างเตียง' }).last();
      await expect(dlg.locator('#name')).toBeVisible({ timeout: 30_000 });

      await choose(page, selectOf(dlg, 'departmentId'), BED.department);
      await choose(page, selectOf(dlg, 'wardId'), BED.ward);
      await choose(page, selectOf(dlg, 'roomId'), BED.room);
      await dlg.locator('#name').fill(name);
      await choose(page, selectOf(dlg, 'bedTypeId'), BED.bedType);
      const price = dlg.locator('#price');
      if ((await price.inputValue()).replace(/,/g, '') !== BED.price) await price.fill(BED.price);
      await choose(page, selectOf(dlg, 'status'), BED.status);
      const enabled = dlg.locator('#enabled');
      if ((await enabled.getAttribute('aria-checked')) !== 'true') await enabled.click();
      await dlg.locator('#remark').fill(BED.remark);

      const submit = dlg.getByRole('button', { name: 'สร้างเตียง' });
      await markEvidence(
        filled(selectOf(dlg, 'wardId'), BED.ward),
        filled(selectOf(dlg, 'roomId'), BED.room),
        filled(dlg.locator('#name'), name),
        filled(selectOf(dlg, 'status'), BED.status),
        clicked(submit),
      );
      await snapEvidence(page, `ก่อนกด — สร้างเตียง ${name}`);

      const created = page.waitForResponse((r) => r.url().includes('/graphql') && /mutation\s+CreateBed\b/.test(r.request().postData() ?? ''), { timeout: 30_000 });
      await submit.click();
      const res = await created;
      const body = (await res.json()) as { data?: { createBed?: { id: number; name: string } }; errors?: { message: string }[] };
      expect(body.errors, `สร้างเตียง ${name} ต้องไม่มี error: ${JSON.stringify(body.errors ?? '').slice(0, 300)}`).toBeUndefined();
      await expect(dlg, 'สร้างเสร็จแล้วหน้าต่างต้องปิด').toBeHidden({ timeout: 30_000 });

      const toast = page.locator('.ant-message-notice, .ant-notification-notice').filter({ visible: true }).first();
      const row = page.getByRole('row').filter({ hasText: name }).first();
      await row.scrollIntoViewIfNeeded().catch(() => undefined);
      await markEvidence(...((await toast.isVisible().catch(() => false)) ? [alerted(toast)] : []), expected(row, `เตียง ${name} ในรายการ`));
      await snapEvidence(page, `หลังกด — สร้างเตียง ${name}`);
      await clearEvidenceMarks(page);
      const line = `${name}: สร้างแล้ว (id ${body.data?.createBed?.id})`;
      console.log(`    ${line}`);
      results.push(line);
    });
  }

  // ตรวจจาก API อีกรอบ: ทุกชื่อต้องเป็นเตียงเปิดใช้งานในหออายุรกรรม ชาย
  const after = new Map((await fetchBeds(page, auth)).map((b) => [b.name, b]));
  const summary = names.map((n) => {
    const b = after.get(n);
    return b ? `${n} · id ${b.id} · ${b.ward.info.th.name} · ${b.room?.info.th.name ?? '-'} · ${b.bedType.info.th.name} · ${b.price} บาท · ${b.active ? 'เปิดใช้งาน' : 'ยกเลิกใช้งาน'} · ${b.detail?.status ?? '-'}` : `${n} · ไม่พบ`;
  });
  console.log(`    สรุป:\n      ${summary.join('\n      ')}`);
  await test.info().attach('สรุปเตียง', { body: [...results, '', ...summary].join('\n'), contentType: 'text/plain' });
  for (const n of names) expect(after.get(n)?.active, `เตียง ${n} ต้องมีและเปิดใช้งาน`).toBeTruthy();
});
