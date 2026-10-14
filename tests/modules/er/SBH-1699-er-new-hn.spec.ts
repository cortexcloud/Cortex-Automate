import {
  confirmOpenErVisit,
  dismissToast,
  expectTriageFormOpen,
  expectVisitHeader,
  gotoErDashboard,
  openTriagePage,
  searchPatients,
  selectExistingPatient,
  type ErVisit,
} from '../../../helpers/functions/er';
import { checkStep, clicked, expected, filled, holdForClip, markEvidence, snapEvidence } from '../../../helpers/functions/evidence';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { COVERAGE_UC, SYSTEM, recordMockPatient, registerMockPatient } from '../../../mock-data/uat-er';

// SBH-1699 [ER] [BUG] Created NEW HN ที่ ER — เดิมลงทะเบียน "ผู้ป่วยใหม่" ที่หน้าคัดกรอง ER ไม่ได้ (แก้ใน PR cortex-ui #1807 master-data codes)
// การ์ดบั๊กไม่มี Sub-Issue · TC ที่ตรงกันคือ TC-003 SBH-1709 ของชุด SBH-1013 → เทสนี้เล่นตามขั้นของ TC-003 + เปิด Visit ER ต่อแบบคลิป Dev-X ของผู้ใช้ (1 ก.ย. 2026)
// ข้อมูล: ผู้ป่วย AUTO ใหม่ 1 ราย + Visit ER สิทธิ UC **ทิ้ง Visit ไว้** (ผู้ใช้เลือก 14 ต.ค. 2026 — ไม่ปิด Visit)
// รัน (SBH Prod — ผู้ใช้อนุญาต 14 ต.ค. 2026): npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep @SBH-1699
// รัน (dev-x): npx playwright test --headed --grep @SBH-1699

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });

test.describe(`SBH-1699 สร้าง HN ใหม่ที่หน้า ER (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 300_000 });

  test(
    'ผู้ป่วยใหม่ที่ไม่เคยมีในระบบ: ลงทะเบียนที่หน้าคัดกรอง ER ได้ HN ใหม่ แล้วเปิด Visit ER ต่อได้ (Super_User)',
    { tag: ['@SBH-1699', '@SBH-1709'], annotation: [linear('SBH-1699'), linear('SBH-1709')] },
    async ({ page }) => {
      const main = page.getByRole('main');
      const patient = newTestPatient('NewHN');
      const fullName = `${patient.firstName} ${patient.familyName}`;
      const urls: string[] = [];
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) urls.push(frame.url());
      });

      await checkStep(page, 'ขั้น 1-2 เข้า ER Dashboard แล้วกด + คัดกรอง', async () => {
        await gotoErDashboard(page);
        await openTriagePage(page);
        await expect(main.getByRole('heading', { name: '1. ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 60_000 });
      });

      await checkStep(page, `ขั้น 3 ค้นชื่อ "${fullName}" ต้องไม่พบในระบบ`, async () => {
        const found = await searchPatients(page, fullName);
        expect(found.totalCount, 'ผู้ป่วยใหม่ต้องไม่เคยมีในระบบมาก่อน').toBe(0);
        const notFound = page.getByRole('listbox').filter({ hasText: 'ไม่พบผู้ป่วย' });
        await expect(notFound).toBeVisible();
        await markEvidence(filled(page.getByRole('combobox', { name: 'ค้นหาผู้ป่วยด้วย HN หรือชื่อ' })), expected(notFound));
        await holdForClip(page);
      });

      const registered = await checkStep(page, 'ขั้น 4-5 เลือก ผู้ป่วยใหม่ กรอกช่องบังคับ แล้วกด ลงทะเบียนผู้ป่วย — ได้ HN ใหม่', async () => {
        const result = await registerMockPatient(page, patient, async (submit) => {
          const fields = ['* เลขบัตรประชาชน', '* ชื่อ', '* นามสกุล', '* วัน/เดือน/ปีเกิด'].map((name) => filled(page.getByRole('textbox', { name, exact: true })));
          await markEvidence(...fields, filled(page.getByRole('combobox', { name: '* เพศ', exact: true })), clicked(submit));
          await holdForClip(page);
          await snapEvidence(page, 'ก่อนกด ลงทะเบียนผู้ป่วย');
        });
        expect(result.hn, 'ลงทะเบียนแล้วต้องได้ HN ใหม่').toMatch(/^\d+$/);
        expect(urls.filter((url) => url.includes('/cortex/reception')), 'ต้องไม่ออกไปหน้า Registration (เวชระเบียน)').toEqual([]);
        await expect(page).toHaveURL(/\/cortex\/er\/triage/);
        if (result.dialog) {
          await markEvidence(expected(result.dialog.getByText(`HN ${result.hn}`, { exact: true })), expected(result.dialog.getByText(fullName)));
          await holdForClip(page, 2_000);
        }
        return result;
      });

      const visit: ErVisit = await checkStep(page, `ขั้น 6 เปิด Visit ER สิทธิ ${COVERAGE_UC} ให้ HN ${registered.hn}`, async () => {
        let dialog = registered.dialog;
        if (!dialog) {
          // SBH Prod: ลงทะเบียนสำเร็จแต่บางครั้ง modal เปิด Visit ไม่ขึ้น → ค้น HN ที่เพิ่งได้แล้วเปิด Visit (ไม่ลงทะเบียนซ้ำ)
          await page.reload();
          await expect(main.getByRole('heading', { name: '1. ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 60_000 });
          dialog = await selectExistingPatient(page, registered.hn);
        }
        const visit = await confirmOpenErVisit(page, dialog, COVERAGE_UC);
        expect(visit.hn, 'EN ต้องผูกกับ HN ที่เพิ่งสร้าง').toBe(registered.hn);
        await expectVisitHeader(page, visit);
        await markEvidence(expected(page.getByText('สร้าง Visit สำเร็จ').first()), expected(main.getByText(visit.en, { exact: true }).filter({ visible: true }).first()));
        await holdForClip(page);
        return visit;
      });
      recordMockPatient('SBH-1699', patient, visit, 'ลงทะเบียน HN ใหม่ที่ ER + เปิด Visit ER (ทิ้ง Visit ไว้)');
      await dismissToast(page, 'สร้าง Visit สำเร็จ');

      await checkStep(page, 'ขั้น 7 ระบบเปิดฟอร์มคัดกรอง ER ของผู้ป่วยรายนี้ต่อทันที', async () => {
        await expectTriageFormOpen(page, visit);
        await markEvidence(
          expected(main.getByText(`HN ${visit.hn}`, { exact: true }).filter({ visible: true }).first()),
          expected(main.getByText(visit.en, { exact: true }).filter({ visible: true }).first()),
          expected(main.getByRole('heading', { name: 'คัดกรอง ER' })),
        );
        await holdForClip(page, 2_000);
      });
    },
  );
});
