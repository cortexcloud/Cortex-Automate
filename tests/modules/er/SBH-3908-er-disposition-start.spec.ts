import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, openCarePanel, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { erTriagePanel, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, makeRunner, markEvidence, snapEvidence } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { recordMockPatient, registerAndOpenErVisit, SYSTEM } from '../../../mock-data/uat-er';
import { VITALS_NORMAL } from '../../../mock-data/uat-play';

// SBH-3908 [Bug][ER][Disposition] Retest บน SBH Prod — การ์ดบั๊กแบบ 1 ไม่มี TC Sub-Issue
// บั๊กเดิม (6 พ.ย. 2026 เช้า): กด "เริ่มจำหน่าย" แล้วขึ้น "เกิดข้อผิดพลาดในระบบ" ทุกราย — graphql startErDischarge ตอบ data null +
//   errors "column \"cause_of_death_text\" of relation \"discharge_summary\" does not exist (SQLSTATE 42703)"
// รีเทส: ผู้ป่วย AUTO ใหม่ → Visit ER → คัดกรอง ESI 3 → แผง Disposition → กด "เริ่มจำหน่าย"
//   Expected: startErDischarge ไม่มี errors (ได้ใบสรุปการจำหน่าย) · ไม่มีแจ้งเตือน "เกิดข้อผิดพลาดในระบบ" · ฟอร์มการจำหน่ายเปิดให้กรอกต่อได้
// ไม่กรอก / ไม่ลงนามฟอร์มการจำหน่าย (นอกบั๊ก) · ปิด Visit ที่การเงินท้ายเทส (SBH3908_KEEP=1 = ไม่ปิด)
// ผู้ใช้อนุญาต 6 พ.ย. 2026 "ทดสอบการ์ด SBH-3908 บน Prod … สามารถสร้างคนไข้ตามที่ต้องใช้งานได้เลย"
// รัน (SBH Prod): npm run card:prod -- --headed --grep "@SBH-3908( |$)"

test.describe('SBH-3908 Retest: เริ่มจำหน่าย (Disposition) ผู้ป่วย ER (SBH Prod)', () => {
  test.describe.configure({ timeout: 600_000 });

  let opened: Map<string, ErVisit>;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });

  test.afterEach(async ({ page }) => {
    if (process.env.SBH3908_KEEP) return;
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  test('Retest SBH-3908: กดเริ่มจำหน่ายแล้วเปิดฟอร์มการจำหน่ายได้ ไม่ขึ้น เกิดข้อผิดพลาดในระบบ (Super_User)', { tag: ['@SBH-3908'], annotation: [{ type: 'issue', description: 'https://linear.app/cortexcloud/issue/SBH-3908' }] }, async ({ page }) => {
    const run = makeRunner(page);
    const { note } = run;
    const main = page.getByRole('main');

    const visit = await checkStep(page, 'เตรียมข้อมูล: ผู้ป่วย AUTO ใหม่ + เปิด Visit ER', async () => {
      await gotoErDashboard(page);
      const patient = newTestPatient('SBH3908');
      const v = await registerAndOpenErVisit(page, patient);
      if (SYSTEM === 'sbh-prod') recordMockPatient('SBH-3908', patient, v, 'SBH-3908 Retest · Visit ER + คัดกรอง ESI 3 + กดเริ่มจำหน่าย (ไม่ลงนาม) แล้วปิด Visit ที่การเงิน');
      note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${v.hn} · ${v.vn} · ${v.en}`);
      console.log(`    ผู้ป่วย ${patient.firstName} ${patient.familyName} · HN ${v.hn} · ${v.vn} · ${v.en}`);
      return v;
    });
    await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);

    await checkStep(page, 'เตรียมข้อมูล: บันทึกคัดกรอง ER ESI 3', async () => {
      const panel = erTriagePanel(page);
      await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
      await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL, chiefComplaint: true });
      await page.waitForTimeout(3_000);
      const locked = main.getByText('ร่างถูกแก้ไขจากที่อื่น', { exact: false });
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
      await expect(main.getByText('Clinical Summary', { exact: true }), 'บันทึกคัดกรองแล้วต้องไปหน้า Overview').toBeVisible({ timeout: 90_000 });
      await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ').catch(() => undefined);
    });

    const startBtn = page.getByTestId('er-disposition-start');
    // คลิปของการรีเทส (R61): เริ่มที่หน้า Overview ของผู้ป่วยหลังคัดกรองแล้ว → จบก่อนขั้นปิด Visit ที่การเงิน
    await page.waitForTimeout(1_000);
    await startClip(page, 'RETEST');
    await checkStep(page, 'ขั้น 1 เปิดแผง Disposition ก่อนกดเริ่มจำหน่าย', async () => {
      await openCarePanel(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }));
      await expect(startBtn, 'ต้องมีปุ่มเริ่มจำหน่าย').toBeVisible({ timeout: 30_000 });
      await startBtn.hover({ trial: true }).catch(() => undefined);
      await markEvidence(clicked(startBtn, 'เริ่มจำหน่าย'));
      await snapEvidence(page, 'ก่อนกด — ปุ่มเริ่มจำหน่าย');
    });

    await checkStep(page, 'ขั้น 2 (Expected) กดเริ่มจำหน่ายแล้วเปิดฟอร์มได้', async () => {
      const errorToasts: string[] = [];
      const errorToast = page.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: 'เกิดข้อผิดพลาดในระบบ' });
      const mutation = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().endsWith('/cortex-api/graphql') && /startErDischarge/i.test(r.request().postData() ?? ''),
        { timeout: 30_000 },
      );
      await startBtn.click();
      const res = await mutation;
      const body = (await res.json().catch(() => ({}))) as { data?: { startErDischarge?: { statusCode?: string; createdAt?: string } | null }; errors?: { message?: string }[] };
      const summary = body.data?.startErDischarge ?? null;
      const errors = (body.errors ?? []).map((e) => e.message ?? '').join(' | ');
      note('graphql startErDischarge', `${res.status()} · ${summary ? `statusCode ${summary.statusCode ?? '-'} · createdAt ${summary.createdAt ?? '-'}` : 'data null'}${errors ? ` · errors: ${errors}` : ' · ไม่มี errors'}`);
      console.log(`    startErDischarge → ${res.status()} ${JSON.stringify(body).slice(0, 300)}`);

      const improved = main.getByRole('radio', { name: 'Improved', exact: true });
      const formOpened = await expect(improved).toBeEnabled({ timeout: 30_000 }).then(() => true, () => false);
      await page.waitForTimeout(1_500);
      if (await errorToast.count()) errorToasts.push(...(await errorToast.allInnerTexts()));
      note('แจ้งเตือน "เกิดข้อผิดพลาดในระบบ"', errorToasts.length ? `มี (${errorToasts.length})` : 'ไม่มี');
      note('ฟอร์มการจำหน่าย', formOpened ? 'เปิดแล้ว (ตัวเลือกสภาพผู้ป่วย Improved กดได้)' : 'ไม่เปิด');

      // กรอบ: แจ้งเตือนสำเร็จ (มุมขวาบน) · ส่วน สถานะ / วิธีการจำหน่าย ที่กดเลือกได้ · ปุ่มบันทึกฉบับร่าง (แทนปุ่มเริ่มจำหน่าย)
      if (formOpened) {
        const okToast = page.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: /เริ่มฉบับร่างการจำหน่าย/ }).first();
        const section = main.locator('div').filter({ hasText: 'สถานะการจำหน่าย' }).filter({ hasText: 'วิธีการจำหน่าย' }).filter({ hasNotText: 'ข้อมูล Visit' }).last();
        const draftBtn = main.getByRole('button', { name: /บันทึกฉบับร่าง/ }).first();
        const marks = [expected(section, 'ฟอร์มการจำหน่ายเปิดให้เลือก สถานะ / วิธีการจำหน่าย ได้')];
        if (await draftBtn.isVisible().catch(() => false)) marks.push(expected(draftBtn, 'ปุ่มบันทึกฉบับร่าง'));
        if (await okToast.isVisible().catch(() => false)) {
          note('แจ้งเตือนหลังกด', (await okToast.innerText()).replace(/\s+/g, ' ').trim());
          await okToast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          marks.push(alerted(okToast));
        }
        await markEvidence(...marks);
      } else if (errorToasts.length) {
        await markEvidence(expected(errorToast.first(), 'เปิดฟอร์มการจำหน่ายได้ · จริง: เกิดข้อผิดพลาดในระบบ'));
      }
      await snapEvidence(page, 'หลังกด — ฟอร์มการจำหน่าย');

      expect(errors, 'Expected: startErDischarge ต้องไม่มี errors').toBe('');
      expect(summary, 'Expected: startErDischarge ต้องคืนใบสรุปการจำหน่าย').not.toBeNull();
      expect(errorToasts, 'Expected: ต้องไม่มีแจ้งเตือน เกิดข้อผิดพลาดในระบบ').toHaveLength(0);
      expect(formOpened, 'Expected: ฟอร์มการจำหน่ายต้องเปิดให้กรอกต่อได้').toBe(true);
    });
    await startClip(page, 'after'); // คลิป RETEST ไม่ติดขั้นปิด Visit ที่การเงิน
  });
});
