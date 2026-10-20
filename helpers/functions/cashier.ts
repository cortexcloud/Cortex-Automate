import { expect, type Locator, type Page } from '@playwright/test';
import { expectOk, waitForApi } from './er';

// ขั้นตอนหน้าจอโมดูลการเงิน (/cortex/cashier) — locator ตรวจกับหน้าจอจริงบน dev-x 3 ต.ค. 2026

/** ผลของการปิด Visit ที่หน้าการเงิน */
export interface ClosedVisit {
  /** 'closed' = กดปิดสำเร็จ · 'already-closed' = หน้าบัญชีไม่มีปุ่ม "ปิด Visit" แล้ว (มีปุ่ม "ปลดล็อค") */
  result: 'closed' | 'already-closed';
  /** ยอดค้างชำระที่ dialog ยืนยันแจ้ง เช่น "1,100.00" */
  outstanding?: string;
}

/**
 * ปิด Visit ที่หน้าการเงิน: ค้น HN ที่ช่องค้นหาผู้ป่วยบนแถบหัว → หน้าบัญชีของ Visit → ปุ่ม `ปิด Visit`
 * → dialog "ยืนยันการปิด Visit" (แจ้งยอดค้างชำระ) → `ปิด Visit` → `POST /cortex-api/accounts/<id>/close` (202)
 * → หน้าบัญชีขึ้น "สถานะ Visit: เสร็จสิ้น" + ปุ่ม `ปลดล็อค` · Encounter เป็น completed ผู้ป่วยหายจากบอร์ด ER
 * `beforeClose` = ทำก่อนกดปุ่ม `ปิด Visit` (เช่น ถ่ายภาพหลักฐาน "ก่อนกด") — ไม่ถูกเรียกถ้า Visit ปิดอยู่ก่อนแล้ว
 */
export async function closeVisitAtCashier(page: Page, hn: string, vn: string, beforeClose?: (close: Locator) => Promise<void>): Promise<ClosedVisit> {
  const main = page.getByRole('main');
  const accountUrl = `/cortex/cashier/patients/${hn}/accounts/${vn}/charge-items`;

  // SBH Prod โหลดหน้าการเงินไม่ขึ้นเป็นบางครั้ง (ช่องค้นหาไม่มาใน 20 วินาที) → เปิดหน้าใหม่อีกรอบก่อนถือว่าพัง
  const search = page.getByRole('combobox', { name: 'ค้นหาผู้ป่วย' });
  await expect(async () => {
    await page.goto('/cortex/cashier/patients');
    await expect(search).toBeVisible({ timeout: 30_000 });
  }).toPass({ timeout: 100_000 });
  // พิมพ์ HN แล้วระบบพาไปหน้าบัญชีของ Visit ล่าสุดเอง — ถ้าไม่ไป หรือไปคนละ VN ให้เปิดหน้าบัญชีของ VN นี้ตรงๆ
  await search.fill(hn);
  await page.waitForURL(new RegExp(`/cashier/patients/${hn}/accounts/`), { timeout: 15_000 }).catch(() => undefined);
  if (!page.url().includes(`/accounts/${vn}/`)) await page.goto(accountUrl);
  await expect(main.getByText(vn, { exact: true }).first()).toBeVisible({ timeout: 60_000 });

  const close = main.getByRole('button', { name: 'ปิด Visit' });
  const unlock = main.getByRole('button', { name: 'ปลดล็อค' });
  await expect(close.or(unlock).first()).toBeVisible();
  if (!(await close.count())) return { result: 'already-closed' };

  // บัญชีที่มียอดค้างชำระ: เด้ง dialog ยืนยันก่อน · บัญชีที่ยอดเป็น 0: ปิดทันทีไม่มี dialog
  const closed = waitForApi(page, 'POST', /^\/cortex-api\/accounts\/[^/]+\/close$/, 60_000);
  closed.catch(() => undefined); // พังก่อนถึงบรรทัดที่รอ จะได้ไม่มี unhandled rejection
  await beforeClose?.(close);
  await close.click();
  const dialog = page.locator('.ant-modal:visible').filter({ hasText: 'ยืนยันการปิด Visit' });
  const asked = await Promise.race([dialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false), closed.then(() => false, () => false)]);
  let outstanding: string | undefined;
  if (asked) {
    outstanding = (await dialog.textContent())?.match(/คงเหลือ:\s*([\d,.]+)/)?.[1];
    await dialog.getByRole('button', { name: 'ปิด Visit' }).click();
  }
  await expectOk(await closed, `ปิด Visit ${vn}`);
  await expect(unlock).toBeVisible();
  return { result: 'closed', outstanding };
}

/** เข้าหน้าบัญชีของ Visit ที่การเงิน (/cortex/cashier/patients/<HN>/accounts/<VN>/charge-items) */
export async function gotoCashierAccount(page: Page, hn: string, vn: string) {
  const main = page.getByRole('main');
  await expect(async () => {
    await page.goto(`/cortex/cashier/patients/${hn}/accounts/${vn}/charge-items`);
    await expect(main.getByText(vn, { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  }, `เปิดหน้าบัญชี ${vn}`).toPass({ timeout: 150_000 });
}

/**
 * ปิดสิทธิ UC ด้วยเลข End Point แบบระบุเอง (SBH Prod 16 ต.ค. 2026): ปุ่ม `ระบุเลข End Point` → dialog "ปิดสิทธิ UC"
 * → radio `ระบุเลข End Point ด้วยตนเอง` → `* ประเภทบัตร` (60 / 61 / 62) · `* Terminal ID` · `* Trace` · `* End Point` → `ยืนยัน`
 * → `POST /cortex-api/end-point/from-close-coverage` 204 (body: edcTerminalId / edcInvoiceNo = Trace / endPoint / txCode / isManual)
 */
export async function closeCoverageWithEndpoint(page: Page, input: { endPoint?: string; terminalId?: string; trace?: string; cardType: string }): Promise<{ endPoint: string; terminalId: string; trace: string }> {
  await page.getByRole('button', { name: 'ระบุเลข End Point' }).click();
  const dialog = page.getByRole('dialog', { name: /^ปิดสิทธิ/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: 'ระบุเลข End Point ด้วยตนเอง' }).check();
  await dialog.getByRole('combobox', { name: /ประเภทบัตร/ }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${input.cardType} - `) }).first().click();
  // ผู้ใช้ 19 ต.ค. 2026: "ตอนกดปุ่ม end point ให้สุ่มตัวเลขก่อนถึงจะกดยืนยันได้" (ใช้เลขเดิมซ้ำแล้วปุ่มยืนยันกดไม่ได้)
  // → ค่าที่ไม่ส่งมา = สุ่ม · หน้าต่างมีปุ่ม "สุ่ม" ให้กดปุ่มนั้นก่อน (ยังไม่เคยเห็นปุ่มนี้ — เผื่อไว้)
  const randomButton = dialog.getByRole('button', { name: /สุ่ม/ });
  if (!input.endPoint && (await randomButton.count())) await randomButton.first().click();
  const values = { terminalId: input.terminalId ?? randomDigits(8), trace: input.trace ?? randomDigits(6), endPoint: input.endPoint ?? randomDigits(9) };
  for (const [name, value] of [['* Terminal ID', values.terminalId], ['* Trace', values.trace], ['* End Point', values.endPoint]] as const) {
    const box = dialog.getByRole('textbox', { name });
    if (input.endPoint || !(await box.inputValue())) await box.fill(value);
  }
  const filled = {
    terminalId: await dialog.getByRole('textbox', { name: '* Terminal ID' }).inputValue(),
    trace: await dialog.getByRole('textbox', { name: '* Trace' }).inputValue(),
    endPoint: await dialog.getByRole('textbox', { name: '* End Point' }).inputValue(),
  };
  const confirm = dialog.getByRole('button', { name: 'ยืนยัน' });
  await expect(confirm, `ปุ่มยืนยันปิดสิทธิต้องกดได้ (Terminal ID ${filled.terminalId} · Trace ${filled.trace} · End Point ${filled.endPoint})`).toBeEnabled({ timeout: 10_000 });
  const saved = waitForApi(page, 'POST', '/cortex-api/end-point/from-close-coverage', 60_000);
  await confirm.click();
  await expectOk(await saved, 'ปิดสิทธิด้วย End Point');
  await expect(dialog).toBeHidden();
  return filled;
}

/** ตัวเลขสุ่ม n หลัก (หลักแรกไม่เป็น 0) */
function randomDigits(n: number): string {
  let s = String(1 + Math.floor(Math.random() * 9));
  while (s.length < n) s += Math.floor(Math.random() * 10);
  return s;
}

/**
 * สร้างใบแจ้งหนี้ทั้งหมด แล้วชำระเงินสดเต็มจำนวน (SBH Prod 16 ต.ค. 2026):
 * `สร้างใบแจ้งหนี้ทั้งหมด` → dialog ยืนยัน → `POST /cortex-api/patient-invoices` 201 {id} → ระบบเปิด dialog "ชำระเงิน" เอง
 * (วิธีชำระเงินอาจว่าง → เลือก `เงินสด` · จำนวนเงินที่ได้รับ = ยอดที่ต้องชำระ · เล่มที่ / เลขที่ เติมมาให้) → `จ่าย` → dialog "ยืนยันการพิมพ์ใบเสร็จ" → `ยืนยัน`
 * → `POST /cortex-api/invoice-payment-intents` 201 {latestStatusCode: succeeded, receiptId} · การสั่งพิมพ์ใบเสร็จ (`…/physical-print`) ตอบ 500 ได้ ไม่กระทบการชำระ
 */
export async function payAllInCash(page: Page): Promise<{ invoiceId: string; receiptId: string; amount: number }> {
  const opts = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
  const invoiced = waitForApi(page, 'POST', '/cortex-api/patient-invoices', 60_000);
  await page.getByRole('button', { name: /สร้างใบแจ้งหนี้ทั้งหมด/ }).click();
  const confirm = page.getByRole('dialog', { name: /ยืนยันการสร้างใบแจ้งหนี้/ });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'ยืนยัน' }).click();
  const invoiceRes = await invoiced;
  await expectOk(invoiceRes, 'สร้างใบแจ้งหนี้');
  const invoiceId = ((await invoiceRes.json()) as { id: string }).id;

  const dialog = page.getByRole('dialog', { name: /^ชำระเงิน/ });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  const method = dialog.getByRole('combobox', { name: /วิธีการชำระเงิน/ });
  if (!(await dialog.getByText('เงินสด', { exact: true }).count())) {
    await method.click();
    await opts.filter({ hasText: /^เงินสด$/ }).first().click();
  }
  const due = (await dialog.innerText()).match(/จำนวนเงินที่ต้องชำระ\s*([\d,.]+)/)?.[1]?.replace(/,/g, '') ?? '';
  const received = dialog.getByRole('spinbutton', { name: '* จำนวนเงินที่ได้รับ' });
  if (due) await received.fill(due);
  const paid = waitForApi(page, 'POST', '/cortex-api/invoice-payment-intents', 60_000);
  await dialog.getByRole('button', { name: 'จ่าย' }).click();
  const receipt = page.getByRole('dialog', { name: /ยืนยันการพิมพ์ใบเสร็จ/ });
  await expect(receipt).toBeVisible({ timeout: 20_000 });
  await receipt.getByRole('button', { name: /^ยืนยัน/ }).click();
  const paidRes = await paid;
  await expectOk(paidRes, 'ชำระเงิน');
  const body = (await paidRes.json()) as { latestStatusCode?: string; receiptId?: string };
  expect(body.latestStatusCode, `ชำระเงินไม่สำเร็จ: ${JSON.stringify(body)}`).toBe('succeeded');
  return { invoiceId, receiptId: body.receiptId ?? '', amount: Number(due) };
}

/**
 * เพิ่มรายการค่าใช้จ่ายที่หน้าบัญชีการเงิน (SBH Prod 19 ต.ค. 2026): ปุ่ม `เพิ่มรายการ` → dialog "เพิ่มรายการ"
 * (`* เลขที่รับบริการ` เลือก EN ของ Visit มาให้ · combobox `ค้นหาด้วยชื่อหรือรหัสรายการ` ค้นได้ทั้งรหัส LAB / IMG / ACT และชื่อ · ราคาต่อหน่วยเติมเอง · จำนวน 1 · สิทธิติ๊กมาให้)
 * → `ยืนยัน` → `POST /cortex-api/account-charge-items` 201 · หน้าต่างค้างเปิดไว้ให้เพิ่มรายการถัดไป
 */
export async function addChargeItems(page: Page, codes: string[]) {
  const dialog = page.getByRole('dialog', { name: 'เพิ่มรายการ' });
  const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
  if (!(await dialog.isVisible())) await page.getByRole('button', { name: /เพิ่มรายการ/ }).first().click();
  await expect(dialog).toBeVisible();
  for (const code of codes) {
    const search = dialog.getByRole('combobox', { name: 'ค้นหาด้วยชื่อหรือรหัสรายการ' }).or(dialog.getByRole('combobox', { name: /^[A-Z]{3}\d+ - / })).first();
    await search.fill(code);
    await options.filter({ hasText: `${code} - ` }).first().click();
    await expect(dialog.getByRole('spinbutton', { name: '* ราคาต่อหน่วย' }), `ราคาของ ${code} ต้องเติมมาให้`).not.toHaveValue('');
    const saved = waitForApi(page, 'POST', '/cortex-api/account-charge-items', 60_000);
    await dialog.getByRole('button', { name: 'ยืนยัน' }).click();
    await expectOk(await saved, `เพิ่มรายการ ${code} ที่การเงิน`);
    // หน้าต่างล้างฟอร์มรอรายการถัดไป
    await expect(dialog.getByRole('combobox', { name: 'ค้นหาด้วยชื่อหรือรหัสรายการ' })).toBeVisible({ timeout: 15_000 });
  }
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
}
