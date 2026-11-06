import fs from 'node:fs';
import { dismissToast, gotoErDashboard, openCarePanel, openVisitDialog, type ErVisit } from '../helpers/functions/er';
import { startDisposition } from '../helpers/functions/er-disposition';
import { erTriagePanel, fillErTriageForm, saveErTriageForm } from '../helpers/functions/er-triage';
import { closeVisitAtCashier } from '../helpers/functions/cashier';
import { alerted, markEvidence, snapEvidence } from '../helpers/functions/evidence';
import { newTestPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { recordMockPatient, registerAndOpenErVisit, SYSTEM } from './uat-er';
import { VITALS_NORMAL } from './uat-play';

// Reproduce บั๊ก: กด "เริ่มจำหน่าย" (startDisposition) พังทั้งระบบบน SBH Prod เจอครั้งแรกระหว่างทดสอบ SBH-3884 (6 พ.ย. 2026)
//   graphql startErDischarge → errors: "create er discharge summary: ERROR: column \"cause_of_death_text\" of relation \"discharge_summary\" does not exist (SQLSTATE 42703)"
// ผู้ใช้สั่งให้ reproduce ใหม่เก็บภาพหน้าจอขณะกด (ภาพเดิมถูกทับไปแล้วตอนทดสอบ SBH-3884) — ไม่ได้เกี่ยวกับ SBH-3884
// รัน: npx playwright test -c playwright.sbh-prod.config.ts mock-data/_repro-disposition-discharge-bug.spec.ts --headed --project=chrome

test('Reproduce บั๊ก เริ่มจำหน่าย (Disposition) พังทั้งระบบ', async ({ page }) => {
  test.setTimeout(300_000);
  await gotoErDashboard(page);
  const patient = newTestPatient('ReproDispo');
  const visit: ErVisit = await registerAndOpenErVisit(page, patient).catch(async (error: Error) => {
    const full = await openVisitDialog(page).getByText(/\(Full\)|ไม่พบเวลาที่สามารถลงได้/).first().isVisible().catch(() => false);
    if (!full) throw error;
    throw new Error(`เปิด Visit ER ไม่ได้ — ช่วงเวลาออกตรวจของแพทย์วันนี้เต็ม (${patient.firstName} ${patient.familyName} ลงทะเบียนแล้วแต่ไม่มี Visit)`);
  });
  if (SYSTEM === 'sbh-prod') recordMockPatient('repro-disposition-bug', patient, visit, 'Reproduce บั๊ก เริ่มจำหน่าย พังทั้งระบบ แล้วปิด Visit ที่การเงิน');
  console.log(`    ผู้ป่วย ${patient.firstName} ${patient.familyName} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
  await dismissToast(page, 'สร้าง Visit สำเร็จ');

  const panel = erTriagePanel(page);
  await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL, chiefComplaint: true });
  await page.waitForTimeout(3_000);
  const locked = page.getByRole('main').getByText('ร่างถูกแก้ไขจากที่อื่น', { exact: false });
  for (let i = 0; i < 3 && (await locked.isVisible().catch(() => false)); i++) {
    await page.getByRole('button', { name: 'ลองเก็บร่างอีกครั้ง' }).click();
    await page.waitForTimeout(5_000);
  }
  const zones = panel.locator('[class*="er-triage-zone-options"] button');
  await expect(zones.first(), 'ฟอร์มคัดกรองต้องมีตัวเลือกโซน').toBeVisible({ timeout: 20_000 });
  if (!(await zones.and(page.locator('[aria-pressed="true"]')).count())) {
    const zone = zones.filter({ hasText: 'แนะนำ' }).first();
    await zone.scrollIntoViewIfNeeded();
    await zone.click();
  }
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await expect(page.getByRole('main').getByText('Clinical Summary', { exact: true }), 'บันทึกคัดกรองแล้วต้องไปหน้า Overview').toBeVisible({ timeout: 90_000 });
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');

  const main = page.getByRole('main');
  await openCarePanel(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }));
  const startBtn = page.getByTestId('er-disposition-start');
  await expect(startBtn, 'ต้องมีปุ่มเริ่มจำหน่าย').toBeVisible({ timeout: 30_000 });

  const mutation = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/cortex-api/graphql') && /startErDischarge/.test(r.request().postData() ?? ''),
    { timeout: 30_000 },
  );
  await markEvidence({ target: startBtn, label: 'กด' as any, note: 'ปุ่มเริ่มจำหน่าย' });
  await snapEvidence(page, 'ก่อนกด — ปุ่มเริ่มจำหน่าย (Disposition)');
  await startBtn.click();
  const res = await mutation.catch(() => null);
  const body = (await res?.text().catch(() => '')) ?? '';
  console.log(`    graphql startErDischarge → ${res?.status() ?? 'ไม่มี response'} ${body.slice(0, 500)}`);
  fs.writeFileSync(test.info().outputPath('startErDischarge-response.json'), body);

  const toast = page.locator('.ant-notification-notice, .ant-message-notice').filter({ visible: true }).last();
  const toastVisible = await toast.waitFor({ timeout: 10_000 }).then(() => true, () => false);
  if (toastVisible) await markEvidence(alerted(toast));
  await page.waitForTimeout(1_000);
  await snapEvidence(page, 'หลังกด — ผลของการกดเริ่มจำหน่าย');

  await closeVisitAtCashier(page, visit.hn, visit.vn).catch((error: Error) => {
    console.log(`    ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`);
  });

  expect(body, 'จดไว้เพื่อ reproduce บั๊ก — ไม่ fail เทส').toBeTruthy();
});
