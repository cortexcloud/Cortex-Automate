import { expect, type Locator, type Page } from '@playwright/test';
import { expectOk, waitForApi } from './er';

// ขั้นตอนหน้าจอโมดูลการเงิน (/cortex/cashier) — locator ตรวจกับหน้าจอจริงบน dev-x 3 ต.ค. 2026

/** ผลของการปิด Visit ที่หน้าการเงิน */
export interface ClosedVisit {
  /** 'closed' = กดปิดสำเร็จ · 'already-closed' = หน้าบัญชีไม่มีปุ่ม "ปิด Visit" แล้ว (มีปุ่ม "ปลดล็อค") */
  result: 'closed' | 'already-closed';
  /** ยอดค้างชำระที่ dialog ยืนยันแจ้ง เช่น "1,100.00" */
  outstanding?: string;
  /** จำนวนสิทธิที่ปิดก่อนปิด Visit (0 = ไม่มีสิทธิที่ต้องปิด หรือหน้าไม่มีขั้นปิดสิทธิ) */
  coverages?: number;
}

/**
 * ปิด Visit ที่หน้าการเงิน: ค้น HN ที่ช่องค้นหาผู้ป่วยบนแถบหัว → หน้าบัญชีของ Visit → ปิดทุกสิทธิที่ยังเปิด (`ปิดสิทธิ`) → ปุ่ม `ปิด Visit`
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

  const coverages = await closeOpenCoverages(page);

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
  return { result: 'closed', outstanding, coverages };
}

/** ปุ่ม `ปิดสิทธิ` ในแถวสิทธิ — regex กันชนกับ `เปิดสิทธิ` (มีคำว่า "ปิดสิทธิ" อยู่ข้างใน) */
const CLOSE_COVERAGE = /(^|\s)ปิดสิทธิ$/;
const OPEN_COVERAGE = /(^|\s)เปิดสิทธิ$/;

/**
 * ปิดทุกสิทธิที่ยังเปิดอยู่ในตารางสิทธิของบัญชี — dev-x (22 ต.ค. 2026) ปิด Visit ไม่ได้ถ้าสิทธิยังเปิด
 * (400 `ErrCoverageMustBeClosed` ทั้งเงินสดและ UC) · ปุ่ม `ปิดสิทธิ` → `POST /cortex-api/coverage-usages/lock` (204)
 * ไม่มี dialog / toast แล้วปุ่มเปลี่ยนเป็น `เปิดสิทธิ` · หน้าที่ไม่มีปุ่มนี้ (ระบบรุ่นเก่า) ข้ามไป
 * คืนจำนวนสิทธิที่ปิด
 */
async function closeOpenCoverages(page: Page): Promise<number> {
  const main = page.getByRole('main');
  const closeButtons = main.getByRole('button', { name: CLOSE_COVERAGE });
  // แถวสิทธิขึ้นช้ากว่าหัวบัญชี (รอ remaining-budgets) — รอปุ่มปิด/เปิดสิทธิสักพัก ไม่เจอ = หน้านี้ไม่มีขั้นปิดสิทธิ
  const hasCoverageButtons = await closeButtons
    .or(main.getByRole('button', { name: OPEN_COVERAGE }))
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true, () => false);
  if (!hasCoverageButtons) return 0;

  let closed = 0;
  for (let remaining = await closeButtons.count(); remaining > 0; remaining = await closeButtons.count()) {
    const locked = waitForApi(page, 'POST', '/cortex-api/coverage-usages/lock', 30_000);
    locked.catch(() => undefined);
    await closeButtons.first().click();
    await expectOk(await locked, 'ปิดสิทธิ');
    await expect(closeButtons).toHaveCount(remaining - 1);
    closed++;
  }
  return closed;
}
