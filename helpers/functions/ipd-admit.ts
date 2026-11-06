import { expect, type Locator, type Page } from '@playwright/test';
import type { ErVisit } from './er';
import { createAdmitRequest } from './er-admit';
import { graphqlMutation } from './er-disposition';
import { clearEvidenceMarks, clicked, filled, markEvidence, snapEvidence } from './evidence';

// ผู้ป่วย ER → Admit Order → ศูนย์จัดการเตียง สร้าง AN → IPD ลงเตียง → Physician Order (Continue) ฝั่งหอผู้ป่วย
// รวมจาก spec SBH-2947 (admitWithBed / putToBed) + cortex-automate screens/ipd-bed.md (3 พ.ย. 2026) · ใช้กับผู้ป่วย AUTO เท่านั้น (R97: เตียง SBHAUTO-xx)

const options = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
type Note = (t: string, d: string) => void;

/** dropdown เตียงที่เปิดอยู่: เลือก SBHAUTO-xx ที่ว่างก่อน (R97) ไม่มีค่อยเลือกเตียงว่างตัวแรก */
export async function pickFreeBed(page: Page): Promise<string> {
  const holder = page.locator('.ant-select-dropdown:visible .rc-virtual-list-holder').first();
  await expect(options(page).first()).toBeVisible({ timeout: 15_000 });
  let fallback = -1;
  for (let i = 0; i < 60; i++) {
    const texts = (await options(page).allInnerTexts()).map(norm);
    // SBH Prod 6 พ.ย. 21:12 (สร้าง AN): ตัวเลือกเลขเตียงแสดงแค่ชื่อ ("SBHAUTO-20") ไม่มีคำสถานะ → ชื่อ SBHAUTO เปล่าๆ นับว่าว่าง
    const free = (t: string) => !/ไม่ว่าง|จองแล้ว/.test(t) && (/ว่าง/.test(t) || /^SBHAUTO-\d+$/.test(t));
    const idx = texts.findIndex((t) => /SBHAUTO-/.test(t) && free(t));
    if (idx < 0 && fallback < 0) fallback = texts.findIndex(free) >= 0 ? i : -1;
    if (idx >= 0) {
      await options(page).nth(idx).click({ timeout: 4_000 }).catch(() => options(page).nth(idx).click({ force: true }));
      return texts[idx];
    }
    await holder.evaluate((e) => { e.scrollTop += 200; }).catch(() => undefined);
    await page.waitForTimeout(150);
  }
  await holder.evaluate((e) => { e.scrollTop = 0; }).catch(() => undefined);
  const texts = (await options(page).allInnerTexts()).map(norm);
  const idx = texts.findIndex((t) => /ว่าง/.test(t) && !/ไม่ว่าง|จองแล้ว/.test(t));
  if (idx < 0) throw new Error('ไม่พบเตียงที่ว่าง');
  await options(page).nth(idx).click({ force: true });
  return texts[idx];
}

/** อยู่หน้าผู้ป่วยของ Visit ER: Admit Order → ศูนย์จัดการเตียง สร้าง AN (ใช้ค่าตั้งต้นของเตียง / ประเภท / รับจาก) → คืน AN + หอ */
export async function admitCreateAn(page: Page, visit: ErVisit, auth: () => string, note: Note, chiefComplaint = 'ทดสอบ automate'): Promise<{ an: string; ward: string }> {
  const req = await createAdmitRequest(page, chiefComplaint);
  const an = await createAnFromAdmitRequest(page, visit, auth);
  note('Admit', `Admit Order (${req.ward}) → สร้าง AN ${an}`);
  return { an, ward: req.ward };
}

/** ผู้ป่วยที่ส่ง Admit Request ไว้แล้ว → ศูนย์จัดการเตียง สร้าง AN (ค่าตั้งต้นของเตียง / ประเภท / รับจาก — เตียง SBHAUTO ว่างก่อน) → คืน AN */
export async function createAnFromAdmitRequest(page: Page, visit: ErVisit, auth: () => string): Promise<string> {
  const main = page.getByRole('main');
  const onProd = new URL(page.url() || 'about:blank', 'https://x').hostname === 'cortex.srbrhospital.com' || /cortex\.srbrhospital\.com/.test(process.env.BASE_URL ?? '');
  await page.goto('/cortex/admission-center/admission-management?tab=admit-request-list');
  const row = main.getByRole('row').filter({ hasText: visit.hn }).first();
  await row.waitFor({ timeout: 90_000 });
  await row.getByRole('button', { name: 'สร้าง AN' }).click();
  await page.waitForURL(/admitRequestId=/, { timeout: 60_000 });
  await main.getByText('รายละเอียด Admit').first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(3_000);
  const sticker = main.getByRole('checkbox', { name: 'พิมพ์สติ๊กเกอร์ AN เมื่อบันทึก' });
  if (await sticker.isChecked().catch(() => false)) await sticker.uncheck();
  for (const label of [/^เลขเตียง :/, /^ประเภทการรับ Admit :/, /^รับ Admit จาก :/]) {
    const sel = main.getByText(label).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
    const current = norm(await sel.innerText());
    // SBH Prod: เตียงตอนสร้าง AN ต้องเป็น SBHAUTO-xx ที่ว่าง (ห้ามจองเตียงจริง — แบบ SBH-2947 6 พ.ย. 2026)
    if (onProd && /เลขเตียง/.test(label.source) && !/SBHAUTO-/.test(current)) {
      await sel.click();
      const bed = await pickFreeBed(page);
      if (!/SBHAUTO-/.test(bed)) throw new Error(`SBH Prod ไม่มีเตียง SBHAUTO ว่าง (ได้ ${bed}) — หยุดก่อนจองเตียงจริง`);
      await page.waitForTimeout(800);
      continue;
    }
    if (current && current !== 'เลือก') continue;
    await sel.click();
    await expect(options(page).first()).toBeVisible({ timeout: 15_000 });
    await options(page).first().click({ timeout: 4_000 }).catch(() => options(page).first().click({ force: true }));
    await page.waitForTimeout(800);
  }
  const submit = main.getByRole('button', { name: 'check ส่งข้อมูล' });
  await expect(submit).toBeEnabled();
  await submit.click();
  const dialog = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
  if (await dialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false)) await dialog.getByRole('button', { name: /ยืนยัน/ }).first().click();
  const retry = main.getByRole('button', { name: /ลองส่งคำขอเดิมอีกครั้ง/ });
  let an = '';
  await expect.poll(async () => {
    if (await retry.isVisible().catch(() => false)) await retry.click().catch(() => undefined);
    const r = await page.request.get(`/cortex-api/er/encounters/${visit.en}`, { headers: { authorization: auth() } });
    an = ((await r.json()) as { an: string | null }).an ?? '';
    return an;
  }, { timeout: 120_000, intervals: [3_000], message: 'Encounter ER ต้องได้ AN หลังสร้าง AN' }).not.toBe('');
  await snapEvidence(page, `หลังกด — สร้าง AN ${an}`);
  return an;
}

/** IPD: เลือกหอ → รายการเตียง แท็บ ผู้ป่วยเตรียมเข้า → เพิ่มผู้ป่วยลงเตียง (เตียง SBHAUTO ที่ว่าง · แพทย์ · เบอร์โทร · ผู้ติดต่อ) → ยืนยัน */
export async function putToBed(page: Page, visit: ErVisit, ward: string, note: Note): Promise<string> {
  const main = page.getByRole('main');
  await page.goto('/cortex/ipd/select-ward');
  await main.locator('.ant-select').first().click();
  await expect(options(page).first()).toBeVisible({ timeout: 30_000 });
  const wardOpt = options(page).filter({ hasText: ward }).first();
  await ((await wardOpt.count()) ? wardOpt : options(page).first()).click();
  await main.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/ipd\/bed-list/, { timeout: 60_000 });
  await page.goto('/cortex/ipd/bed-list?tab=waiting-list');
  const clear = main.getByRole('button', { name: /ล้างตัวกรอง/ });
  await expect(clear).toBeVisible({ timeout: 60_000 });
  await clear.click();
  const card = main.locator('div').filter({ hasText: `HN ${visit.hn}` }).filter({ has: page.getByRole('button', { name: 'เพิ่มผู้ป่วยลงเตียง' }) }).last();
  await expect(card, `ผู้ป่วย HN ${visit.hn} ต้องอยู่ในแท็บ ผู้ป่วยเตรียมเข้า`).toBeVisible({ timeout: 60_000 });
  await card.scrollIntoViewIfNeeded();
  const dlg = page.locator('.ant-modal:visible').filter({ hasText: 'จัดการข้อมูลผู้ป่วย' }).first();
  const selectAfter = (label: RegExp) => dlg.getByText(label).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
  let bed = '';
  for (let attempt = 1; ; attempt++) {
    await card.getByRole('button', { name: 'เพิ่มผู้ป่วยลงเตียง' }).click();
    await expect(dlg).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2_000);
    await selectAfter(/เตียง :/).click();
    bed = await pickFreeBed(page);
    await page.waitForTimeout(800);
    const doctor = selectAfter(/แพทย์เจ้าของไข้/);
    if (/^\s*เลือก\s*$/.test(await doctor.innerText())) {
      await doctor.click();
      await expect(options(page).first()).toBeVisible({ timeout: 15_000 });
      await options(page).first().click();
    }
    const phone = dlg.getByPlaceholder(/0900000000/).first();
    if (!(await phone.inputValue())) await phone.fill('0812345678');
    const contact = dlg.getByPlaceholder(/คำนำหน้า/).first();
    if (!(await contact.inputValue())) await contact.fill('นาย ทดสอบ ญาติ, บุตร, 0812345679');
    const confirm = dlg.getByRole('button', { name: 'ยืนยัน' });
    await markEvidence(filled(selectAfter(/เตียง :/), bed), clicked(confirm));
    await snapEvidence(page, `ก่อนกด — ยืนยันลงเตียง ${attempt}`);
    await clearEvidenceMarks(page);
    await confirm.click();
    if (await dlg.waitFor({ state: 'hidden', timeout: 30_000 }).then(() => true, () => false)) break;
    const msg = norm(await dlg.innerText().catch(() => '')).slice(0, 200);
    note(`ลงเตียง ครั้งที่ ${attempt}`, `หน้าต่างไม่ปิด: ${msg}`);
    if (attempt >= 4) throw new Error(`ลงเตียงไม่สำเร็จ: ${msg}`);
    // ทำทันทีหลังสร้าง AN ถูกปฏิเสธ (ระบบยังประมวลผล AN) → ปิด รอ 30 วิ แล้วลองใหม่ (SBH-2947)
    await dlg.getByRole('button', { name: 'ยกเลิก' }).click().catch(() => page.keyboard.press('Escape'));
    await page.waitForTimeout(30_000);
    await page.reload();
    await expect(clear).toBeVisible({ timeout: 60_000 });
    await clear.click();
    await expect(card).toBeVisible({ timeout: 60_000 });
  }
  await snapEvidence(page, 'หลังกด — ยืนยันลงเตียง');
  note('ลงเตียง', `IPD ${ward} · ${bed}`);
  return bed;
}

/**
 * context IPD (/cortex/next/patients/<HN>?an=<AN>&fromApp=ipd) → เมนูขวา Physician Order → Continue Order → ยา `code` (ขนาด 1 · ทุก 8 ชม.)
 * → + เพิ่มออเดอร์ → บันทึก (UpsertIpdOrder) → Sign (SignIPDOrdersByIds) — ยา R25 ใช้ med0000008 (Route OralRoute เติมให้ · screens/ipd-bed.md)
 */
export async function ipdContinueOrder(page: Page, visit: ErVisit, an: string, code = 'med0000008'): Promise<string> {
  const main = page.getByRole('main');
  await page.goto(`/cortex/next/patients/${visit.hn}?an=${an}&fromApp=ipd`);
  await expect(main.getByText(`HN ${visit.hn}`, { exact: true }).first()).toBeVisible({ timeout: 60_000 });
  const menu = page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: /Physician Order$/ }).first();
  const search = main.getByPlaceholder(/ค้นหา ยา, เวชภัณฑ์/).first();
  await expect(async () => {
    await menu.click({ force: true });
    await page.mouse.move(700, 700);
    const cont = main.getByText('Continue Order', { exact: true }).filter({ visible: true }).last();
    await cont.click({ timeout: 8_000 });
    await expect(search).toBeVisible({ timeout: 8_000 });
  }, 'เปิด Physician Order → Continue Order').toPass({ timeout: 120_000 });
  await search.click();
  await search.pressSequentially(code, { delay: 40 });
  const opt = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: `[${code}]` }).first();
  await expect(opt, `ค้นยา ${code}`).toBeVisible({ timeout: 20_000 });
  const drug = norm(await opt.innerText());
  await opt.click();
  const dose = main.getByPlaceholder('ขนาดยา').filter({ visible: true }).first();
  await expect(dose).toBeVisible({ timeout: 20_000 });
  await dose.fill('1');
  // ช่องบังคับ "จำนวนจ่าย" (placeholder ระบุ · ไม่กรอก = เพิ่มออเดอร์ไม่ได้ · dev-x 4 พ.ย. 2026)
  const qty = main.getByText('จำนวนจ่าย', { exact: true }).first().locator('xpath=following::input[1]');
  await qty.scrollIntoViewIfNeeded();
  await qty.fill('10');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(800);
  const add = main.getByRole('button', { name: /เพิ่มออเดอร์/ }).filter({ visible: true }).last();
  const save = main.getByRole('button', { name: /^(save )?บันทึก$/ }).filter({ visible: true }).first();
  // กดเพิ่มออเดอร์แล้วรายการต้องเข้าตะกร้า (ปุ่มบันทึกหัวแผงกดได้) — dev-x 4 พ.ย.: กดครั้งแรกบางทีไม่ติด → กดซ้ำ
  await expect(async () => {
    await add.scrollIntoViewIfNeeded();
    await add.click();
    await expect(save).toBeEnabled({ timeout: 6_000 });
  }, 'เพิ่มออเดอร์แล้วปุ่มบันทึกต้องกดได้').toPass({ timeout: 45_000 }).catch(async (e) => {
    const fs = await import('node:fs');
    fs.mkdirSync('.cache/ipd-order', { recursive: true });
    fs.writeFileSync('.cache/ipd-order/aria.yml', await main.ariaSnapshot().catch(() => ''));
    await page.screenshot({ path: '.cache/ipd-order/after-add.png' });
    throw e;
  });
  const saved = graphqlMutation(page, 'UpsertIpdOrder', 60_000);
  await save.click();
  const res = await saved;
  const body = await res.text();
  if (!res.ok() || /"errors"/.test(body)) throw new Error(`บันทึก Continue Order ไม่สำเร็จ: ${body.slice(0, 200)}`);
  const sign: Locator = main.getByRole('button', { name: /^Sign$/ }).filter({ visible: true }).first();
  await expect(sign).toBeVisible({ timeout: 30_000 });
  const signed = graphqlMutation(page, 'SignIPDOrdersByIds', 60_000);
  await sign.dispatchEvent('click');
  const s = await signed;
  if (!s.ok()) throw new Error(`Sign Continue Order ไม่สำเร็จ (${s.status()})`);
  await snapEvidence(page, `หลังกด — Sign Continue Order ${code}`);
  return drug;
}

/**
 * IPD Discharge คืนเตียง (คัดจาก spec SBH-2947 — SBH Prod 6 พ.ย. 2026 "ใช้ SBHAUTO 1 เตียง แล้วคืน" · screens/ipd-bed.md):
 * เลือกหอ → รายการเตียง แท็บ เตียงทั้งหมด → แถว HN → ปุ่ม ⋮ ท้ายแถว → Discharge (เมนูไม่ใช่ role menuitem) →
 * "ยืนยันการจำหน่ายผู้ป่วย" → ยืนยันรายการที่ทบทวนแล้ว → DischargeAdmission 200 → เตียงว่าง → ปิด Visit ER ที่การเงินได้
 */
export async function ipdDischarge(page: Page, hn: string, ward: string): Promise<string> {
  const main = page.getByRole('main');
  await page.goto('/cortex/ipd/select-ward');
  await main.locator('.ant-select').first().click();
  await expect(options(page).first()).toBeVisible({ timeout: 30_000 });
  const wardOpt = options(page).filter({ hasText: ward }).first();
  await ((await wardOpt.count()) ? wardOpt : options(page).first()).click();
  await main.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/ipd\/bed-list/, { timeout: 60_000 });
  await main.getByRole('tab', { name: /เตียงทั้งหมด/ }).first().click().catch(() => main.getByText('เตียงทั้งหมด', { exact: true }).first().click());
  await page.waitForLoadState('networkidle').catch(() => undefined);
  // SBH Prod 6 พ.ย. 22:23: หน้ารายการเตียงตั้งตัวกรองแพทย์เจ้าของไข้ = แพทย์ของบัญชีที่ login เอง → ผู้ป่วยของแพทย์อื่นไม่ขึ้น → ล้างตัวกรองก่อน
  // ปุ่ม "ล้างตัวกรอง" ไม่ล้างช่องแพทย์ → hover ช่องเลือกแพทย์แล้วกด × (.ant-select-clear) — สำรวจแล้ว 22:30
  // ค่าแพทย์ตั้งต้นถูกเติมหลังตารางโหลด (~2–3 วิ) → รอให้ช่องมีชื่อก่อน
  const docSel = main.locator('[class*="_physician-select_"]').filter({ hasText: /\S/ }).first();
  if (await docSel.waitFor({ timeout: 10_000 }).then(() => true, () => false)) {
    await docSel.hover().catch(() => undefined);
    const x = docSel.locator('.ant-select-clear');
    if (await x.count()) {
      await x.first().click({ force: true });
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await page.waitForTimeout(2_000);
    }
  }
  const row = main.getByRole('row').filter({ hasText: hn }).first();
  await expect(row, `แถวผู้ป่วย HN ${hn} ในแท็บ เตียงทั้งหมด`).toBeVisible({ timeout: 60_000 });
  const discharge = page.locator('.ant-dropdown:visible').getByText('Discharge', { exact: true }).first();
  // ปุ่ม ⋮ ของแถว = data-testid "admission-bed-actions-<AN>" (Prod 6 พ.ย. 22:50: ปุ่มสุดท้ายในแถวไม่ใช่ปุ่มนี้ → กดแล้วเมนูไม่เปิด)
  const kebab = row.locator('[data-testid^="admission-bed-actions-"]').first();
  const menuBtn = (await kebab.count()) ? kebab : row.getByRole('button').last();
  await menuBtn.scrollIntoViewIfNeeded().catch(() => undefined);
  await expect(async () => {
    await menuBtn.click();
    await expect(discharge).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 40_000 });
  await discharge.click();
  const dlg = page.locator('.ant-modal:visible').filter({ hasText: 'ยืนยันการจำหน่ายผู้ป่วย' }).first();
  await expect(dlg).toBeVisible({ timeout: 30_000 });
  const ok = dlg.getByRole('button', { name: 'ยืนยันรายการที่ทบทวนแล้ว' });
  // SBH Prod 6 พ.ย. 2026 22:44 (SBH-3182 เก็บกวาด): หน้าต่างมีช่องบังคับ "สถานะจำหน่ายโดยพยาบาล" / "ประเภทจำหน่ายโดยพยาบาล" — ว่างอยู่ปุ่มยืนยัน disabled → เลือกตัวเลือกแรก
  // ช่อง = data-testid "nurse-discharge-status" / "nurse-discharge-type" · ตัวเลือกแรกของ options(page) อาจเป็นของ dropdown อื่นที่เปิดค้าง ("1" "2")
  // → เลือกตามชื่อ (Improved / With Approval) ใน dropdown ที่ id ตรง aria-controls ของช่อง · ไม่เจอชื่อใช้ตัวแรกของ dropdown นั้น · ตรวจค่าแล้วลองซ้ำ
  // เลือกประเภทแล้วช่องสถานะถูกล้าง (Prod 22:58) → เลือกประเภทก่อน แล้วสถานะ · วนตรวจทั้ง 2 ช่องซ้ำอีกรอบ
  for (const [testId, want] of [['nurse-discharge-type', /^With Approval$/], ['nurse-discharge-status', /^Improved$/], ['nurse-discharge-type', /^With Approval$/], ['nurse-discharge-status', /^Improved$/]] as const) {
    const sel = dlg.getByTestId(testId).first();
    if (!(await sel.count())) continue;
    // ไม่กด Escape (ปิดหน้าต่าง modal) · dropdown ของช่องก่อนหน้าค้างบังช่องถัดไป → รอ dropdown ปิด แล้วกดแบบ force
    const chosen = async () => !!norm(await sel.locator('.ant-select-selection-item').first().innerText({ timeout: 1_000 }).catch(() => ''));
    for (let i = 0; i < 4 && !(await chosen()); i++) {
      await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0, { timeout: 5_000 }).catch(() => dlg.getByText('ข้อมูลจำหน่ายโดยพยาบาล').first().click({ force: true }).catch(() => undefined));
      await sel.click({ force: true });
      const id = await sel.getByRole('combobox').first().getAttribute('aria-controls').catch(() => null);
      const own = id ? page.locator(`.ant-select-dropdown:visible:has([id="${id}"]) .ant-select-item-option`) : options(page);
      await expect(own.first()).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(500);
      const named = own.filter({ hasText: want }).first();
      await ((await named.count()) ? named : own.first()).click();
      await page.waitForTimeout(800);
    }
  }
  await expect(ok, 'ปุ่ม ยืนยันรายการที่ทบทวนแล้ว ต้องกดได้').toBeEnabled({ timeout: 10_000 });
  const done = page.waitForResponse((r) => r.request().method() === 'POST' && /\/cortex-api\/graphql/.test(r.url()) && /DischargeAdmission/.test(r.request().postData() ?? ''), { timeout: 60_000 });
  await ok.click();
  const res = await done;
  const body = (await res.json().catch(() => ({}))) as { errors?: { message: string }[] };
  if (!res.ok() || body.errors?.length) throw new Error(`DischargeAdmission ${res.status()} ${body.errors?.map((e) => e.message).join(' / ') ?? ''}`);
  await expect(dlg).toBeHidden({ timeout: 30_000 });
  return 'Discharge ที่ IPD แล้ว (คืนเตียง)';
}
