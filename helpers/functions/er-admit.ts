import { expect, type Locator, type Page } from '@playwright/test';
import { expectOk, openCarePanel } from './er';
import { graphqlMutation } from './er-disposition';

// Admit Request จากหน้าผู้ป่วย ER (เมนูขวา "สร้าง Admit Order") — ตรวจกับ dev-x 7 ต.ค. 2026 (การ์ด SBH-2391)
// ทำถึงส่งคำขอ Admit เท่านั้น ไม่สร้าง AN และไม่เลือกเตียง (R30)

export interface AdmitRequest {
  diagnosis: string;
  ward: string;
  fromDepartment: string;
}

/** ตัวเลือกของ dropdown (Ant Design) ที่เปิดอยู่ */
function options(page: Page): Locator {
  return page.locator('.ant-select-dropdown:visible .ant-select-item-option');
}

/** dropdown ที่อยู่ชิดขอบล่างของจอขยับตามการเลื่อนหน้า ตัวเลือกไม่นิ่งให้กด → กดแบบไม่รอให้นิ่งเป็นทางสำรอง */
async function pick(option: Locator): Promise<string> {
  await expect(option).toBeVisible();
  const text = (await option.innerText()).trim();
  await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
  return text;
}

/** select ตัวแรกที่อยู่ถัดจากป้าย `label` (ฟอร์มนี้ไม่ได้ใช้ .ant-form-item) */
function selectAfter(scope: Locator, label: RegExp): Locator {
  return scope.getByText(label).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
}

/**
 * อยู่หน้าผู้ป่วยของ Visit ER: เมนูขวา "สร้าง Admit Order" → การวินิจฉัยเบื้องต้น + อาการสำคัญ → หอผู้ป่วย + จากแผนก
 * (จากแผนก ไม่มีดอกจันแต่ต้องเลือก ไม่งั้นปุ่มส่งคำขอกดไม่ได้) → ปุ่ม `ส่งคำขอ` หัวแผง → ถ้ามี dialog ยืนยัน กดยืนยัน
 * → graphql CreatePatientAdmitRequest · ผู้ป่วยไปอยู่แท็บ ผู้ป่วยรอเตียง
 * ฟอร์มมี 2 หน้าตา: แบบใหม่ป้ายภาษาไทย (dev-x 7 ต.ค. 2026) · แบบเดิมป้ายอังกฤษ + ต้องกด "แบบฟอร์ม" ให้กางก่อน (3 ต.ค. 2026)
 */
export async function createAdmitRequest(page: Page, chiefComplaint: string): Promise<AdmitRequest> {
  const main = page.getByRole('main');
  await openCarePanel(page, 'สร้าง Admit Order', main.getByText(/^(รายละเอียดการรับไว้รักษา|Admit Request Form)$/).first());

  await selectAfter(main, /การวินิจฉัยเบื้องต้น|Pre-diagnosis/).click();
  await page.keyboard.type('K30');
  const diagnosis = await pick(options(page).first());
  await main.getByText(/อาการสำคัญ :|Chief Complaint :/).first().locator('xpath=following::*[self::input or self::textarea][1]').fill(chiefComplaint);

  const expand = main.getByRole('button', { name: 'plus แบบฟอร์ม' });
  if (await expand.isVisible()) await expand.click();
  await selectAfter(main, /หอผู้ป่วย :/).click();
  const ward = await pick(options(page).first());
  await selectAfter(main, /จากแผนก :/).click();
  await expect(options(page).first()).toBeVisible();
  const emergency = options(page).filter({ hasText: /ฉุกเฉิน|ER|Emergency/i }).first();
  const fromDepartment = await pick((await emergency.count()) ? emergency : options(page).first());
  const submit = main.getByRole('button', { name: /^check( ส่งคำขอ)?$/ }).first();
  await expect(submit, 'กรอก การวินิจฉัยเบื้องต้น + อาการสำคัญ + หอผู้ป่วย + จากแผนก แล้วปุ่มส่งคำขอต้องกดได้').toBeEnabled();

  const dialog = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
  const created = graphqlMutation(page, 'CreatePatientAdmitRequest', 40_000);
  created.catch(() => undefined);
  await submit.click();
  const asked = await Promise.race([dialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false), created.then(() => false, () => false)]);
  if (asked) await dialog.getByRole('button', { name: /ยืนยัน/ }).click();
  const res = await created;
  await expectOk(res, 'ส่ง Admit Request');
  const body = (await res.json()) as { data?: Record<string, unknown> | null; errors?: { message: string }[] };
  expect(body.errors, `ส่ง Admit Request ต้องไม่มี error: ${JSON.stringify(body).slice(0, 400)}`).toBeUndefined();
  await expect(dialog).toBeHidden();
  return { diagnosis, ward, fromDepartment };
}
