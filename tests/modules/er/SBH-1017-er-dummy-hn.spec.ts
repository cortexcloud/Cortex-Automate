import {
  confirmOpenErVisit,
  dismissToast,
  expectOk,
  expectTriageFormOpen,
  gotoErDashboard,
  openTriagePage,
  openVisitDialog,
  selectExistingPatient,
  waitForApi,
  type ErVisit,
} from '../../../helpers/functions/er';
import { checkStep, clicked, expected, filled, holdForClip, markEvidence, snapEvidence } from '../../../helpers/functions/evidence';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { COVERAGE_UC, SYSTEM, recordMockPatient } from '../../../mock-data/uat-er';

// SBH-1017 [ER][Registration] Create HN / Dummy — สร้าง Dummy HN ให้ผู้ป่วยระบุตัวตนไม่ได้ที่หน้าคัดกรอง ER โดยไม่ผ่าน Registration → Generate EN → เปิดฟอร์มคัดกรอง
// step ตาม TC-001–004 ของชุด EXE SBH-1722 (SBH-1725 · SBH-1726 · SBH-1727 · SBH-1728) — 1 เทส 1 flow ผู้ป่วยรายเดียว
// ข้อมูล: ผู้ป่วยระบุตัวตนไม่ได้ 1 ราย (ชื่อชั่วคราว AUTO + นามสกุล Dummy1017<เวลา> · อายุโดยประมาณ 40) + Visit ER สิทธิ UC · ไม่บันทึก Triage · **ทิ้ง Visit ไว้** (ผู้ใช้เลือก 14 ต.ค. 2026)
// ผู้ป่วยมา ER โดยตรง (หมดสติ / ไม่มีเอกสาร) จึงลงทะเบียนที่หน้าคัดกรอง ER ตามการ์ด — ไม่ใช่เวชระเบียน (R53)
// รัน (SBH Prod — ผู้ใช้อนุญาต 14 ต.ค. 2026): npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep @SBH-1017
// รัน (dev-x): npx playwright test --headed --grep @SBH-1017

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ESTIMATED_AGE = '40';

interface ErRegistrationResponse {
  patient?: { data?: { hn?: string; identityVerificationMode?: { code?: string; display?: string } | null } };
}

test.describe(`SBH-1017 สร้าง Dummy HN ที่หน้า ER (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 300_000 });

  test(
    'ผู้ป่วยระบุตัวตนไม่ได้: สร้าง Dummy HN ที่หน้าคัดกรอง ER → เปิด Visit ER ได้ EN → เปิดฟอร์มคัดกรองต่อทันที (Super_User)',
    {
      tag: ['@SBH-1017', '@SBH-1725', '@SBH-1726', '@SBH-1727', '@SBH-1728'],
      annotation: [linear('SBH-1017'), linear('SBH-1725'), linear('SBH-1726'), linear('SBH-1727'), linear('SBH-1728')],
    },
    async ({ page }) => {
      const main = page.getByRole('main');
      const patient = newTestPatient('Dummy1017');
      const fullName = `${patient.firstName} ${patient.familyName}`;
      const urls: string[] = [];
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) urls.push(frame.url());
      });
      const dummyRadio = page.locator('label').filter({ hasText: 'ผู้ป่วยระบุตัวตนไม่ได้' });
      const tempName = page.getByRole('textbox', { name: 'ชื่อชั่วคราว' });
      const tempFamily = page.getByRole('textbox', { name: /นามสกุล/ });
      const age = page.getByLabel(/อายุโดยประมาณ/);
      const submit = page.getByRole('button', { name: 'ลงทะเบียนผู้ป่วยไม่ทราบชื่อ' });

      await checkStep(page, 'TC-001 (SBH-1725) ขั้น 1-2 เข้า ER Dashboard แล้วเปิดหน้าเปิดผู้ป่วยใหม่ (+ คัดกรอง)', async () => {
        await gotoErDashboard(page);
        await openTriagePage(page);
        await expect(main.getByRole('heading', { name: '1. ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 60_000 });
      });

      await checkStep(page, 'TC-001 (SBH-1725) ขั้น 3 หน้าจอแสดงตัวเลือก ผู้ป่วยระบุตัวตนไม่ได้', async () => {
        for (const option of ['ผู้ป่วยมี HN', 'ผู้ป่วยใหม่', 'ผู้ป่วยระบุตัวตนไม่ได้']) await expect(page.locator('label').filter({ hasText: option }).first()).toBeVisible();
        await markEvidence(clicked(dummyRadio));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด ผู้ป่วยระบุตัวตนไม่ได้');
      });

      await checkStep(page, 'TC-001 (SBH-1725) ขั้น 4 กดเลือก ผู้ป่วยระบุตัวตนไม่ได้ — ระบบเปิดฟอร์มสร้าง Dummy HN', async () => {
        await dummyRadio.click();
        await expect(tempName).toBeVisible();
        await expect(age).toBeVisible();
        await expect(submit).toBeVisible();
        await markEvidence(expected(dummyRadio), expected(tempName), expected(age), expected(submit));
        await holdForClip(page, 2_000);
      });

      const hn = await checkStep(page, 'TC-002 (SBH-1726) ขั้น 3-4 กรอกเฉพาะช่องที่จำเป็น (ไม่ระบุตัวตน) แล้วกดบันทึก — ได้ Dummy HN', async () => {
        // ช่องบังคับมีแค่ อายุโดยประมาณ · ใส่ชื่อชั่วคราว AUTO ให้ทีมรู้ว่าเป็นผู้ป่วยของ automate (R10) · ไม่กรอกเลขบัตร / เพศ / ที่อยู่
        await tempName.fill(patient.firstName);
        await tempFamily.fill(patient.familyName);
        await age.fill(ESTIMATED_AGE);
        await markEvidence(filled(tempName), filled(tempFamily), filled(age), clicked(submit));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด ลงทะเบียนผู้ป่วยไม่ทราบชื่อ');
        const registered = waitForApi(page, 'POST', '/cortex-api/patients/er-registration', 60_000);
        await submit.click();
        const res = await registered;
        await expectOk(res, 'ลงทะเบียนผู้ป่วยระบุตัวตนไม่ได้');
        const data = ((await res.json()) as ErRegistrationResponse).patient?.data;
        const hn = data?.hn ?? '';
        expect(hn, 'ลงทะเบียนแล้วต้องได้ HN').toMatch(/^\d+$/);
        const mode = data?.identityVerificationMode;
        console.log(`    ผู้ป่วย: ${fullName} · HN ${hn} · ประเภทการยืนยันตัวตน ${mode?.code ?? '-'} (${mode?.display ?? '-'})`);
        test.info().annotations.push({ type: 'ผู้ป่วย', description: `${fullName} · HN ${hn} · identityVerificationMode ${mode?.code ?? '-'} (${mode?.display ?? '-'})` });
        expect(urls.filter((url) => url.includes('/cortex/reception')), 'ต้องไม่ออกไปหน้า Registration (เวชระเบียน)').toEqual([]);
        await expect(page).toHaveURL(/\/cortex\/er\/triage/);
        const dialog = openVisitDialog(page);
        const shown = await expect(dialog.getByText(`HN ${hn}`, { exact: true })).toBeVisible({ timeout: 30_000 }).then(() => true, () => false);
        if (shown) {
          // หน้าต่างกำลังเลื่อนเข้า → รอให้นิ่งก่อนตีกรอบ (SBH Prod 14 ต.ค. 2026: กรอบ HN ลอยไปอยู่เหนือหน้าต่าง)
          await dialog.getByText(`HN ${hn}`, { exact: true }).hover({ trial: true });
          await markEvidence(expected(dialog.getByText(`HN ${hn}`, { exact: true })), expected(dialog.getByText(fullName).first()));
          await holdForClip(page, 2_000);
        }
        return hn;
      });

      const visit: ErVisit = await checkStep(page, `TC-003 (SBH-1727) ขั้น 2-4 เปิด Visit ER สิทธิ ${COVERAGE_UC} — ได้ EN ใหม่ผูกกับ Dummy HN ${hn}`, async () => {
        let dialog = openVisitDialog(page);
        if (!(await dialog.getByText(`HN ${hn}`, { exact: true }).isVisible().catch(() => false))) {
          // SBH Prod: ลงทะเบียนสำเร็จแต่บางครั้งหน้าต่างเปิด Visit ไม่ขึ้น → ค้น HN ที่เพิ่งได้แล้วเปิด Visit (ไม่ลงทะเบียนซ้ำ)
          await page.reload();
          await expect(main.getByRole('heading', { name: '1. ข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 60_000 });
          dialog = await selectExistingPatient(page, hn);
        }
        const opened = await confirmOpenErVisit(page, dialog, COVERAGE_UC);
        expect(opened.en, 'ต้องได้เลข EN').toMatch(/^E\d+$/);
        expect(opened.hn, 'EN ต้องผูกกับ Dummy HN ที่เพิ่งสร้าง').toBe(hn);
        await markEvidence(expected(page.getByText('สร้าง Visit สำเร็จ').first()), expected(main.getByText(opened.en, { exact: true }).filter({ visible: true }).first()));
        await holdForClip(page);
        return opened;
      });
      console.log(`    Visit: VN ${visit.vn} · EN ${visit.en}`);
      test.info().annotations.push({ type: 'Visit', description: `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en} (ทิ้ง Visit ไว้)` });
      recordMockPatient('SBH-1017', { ...patient, citizenId: '(ไม่ระบุตัวตน)' }, visit, 'Dummy HN (ผู้ป่วยระบุตัวตนไม่ได้) ที่หน้าคัดกรอง ER + เปิด Visit ER (ทิ้ง Visit ไว้)');
      await dismissToast(page, 'สร้าง Visit สำเร็จ');

      await checkStep(page, 'TC-004 (SBH-1728) ขั้น 2-3 ระบบเปิดฟอร์มคัดกรอง ER ต่อทันที — หัวจอแสดง Dummy HN และ EN ของรายนี้', async () => {
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
