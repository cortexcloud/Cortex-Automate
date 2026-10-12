import { type Page } from '@playwright/test';
import {
  cancelErEncounter,
  confirmOpenErVisit,
  dashboardCard,
  dismissToast,
  expectTriageFormOpen,
  expectVisitHeader,
  gotoErDashboard,
  openErDashboardFromMenu,
  openTriagePage,
  pickTeamPatient,
  registerNewPatient,
  searchPatients,
  selectExistingPatient,
  showDashboardCard,
  trackOpenedErVisits,
  type ErVisit,
  type FoundPatient,
} from '../../../helpers/functions/er';
import { checkStep, markEvidence } from '../../../helpers/functions/evidence';
import { expect, test } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';

// SBH-1013 [ER][Registration] Open Visit for ER
// แปลงจากชุด Manual: EXE SBH-1702 → TC-001–006 (SBH-1707–SBH-1712)
// 1 เทส = 1 flow ตามที่มาของผู้ป่วย · step ตั้งชื่อตามเลข TC · tag = เลขการ์ด (R9)
// ผู้ป่วยใหม่: สร้างใหม่ทุกรอบ ต้องไม่เคยมีในระบบมาก่อน และทิ้งไว้บน dev-x ได้ (R10, R11, R15)
// ผู้ป่วยมี HN: สุ่มผู้ป่วยทดสอบของทีมที่มีอยู่ในระบบแล้วและไม่มี Visit / Admission ค้าง · ยกเลิก Visit ที่เทสเปิดทุกครั้ง (R15)
// step ของ TC ใช้ checkStep → รายงานมีภาพตอนผ่าน Expected / ตอน Error ใต้ step นั้น · markEvidence() ตีกรอบจุดที่เช็คในภาพ (R13)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });

/** เหตุผลตอนยกเลิก Visit ที่เทสเปิดให้ผู้ป่วยของทีม (ช่องรับได้ไม่เกิน 30 ตัวอักษร) */
const CANCEL_REASON = 'ล้างข้อมูล Automate SBH-1013';

/** เก็บทุก URL ที่หน้าเปลี่ยนไป — ไว้เช็คว่าไม่ได้ออกไปหน้า Registration */
function trackUrls(page: Page): string[] {
  const urls: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) urls.push(frame.url());
  });
  return urls;
}

/** AC: เปิดที่ ER โดยตรง ไม่ต้องผ่าน Registration · Experience goal: ไม่ต้องเปิดหลายหน้า */
function expectStayedInEr(page: Page, urls: string[]) {
  expect(urls.filter((url) => url.includes('/cortex/reception')), 'ต้องไม่ออกไปหน้า Registration (เวชระเบียน)').toEqual([]);
  expect(page.context().pages(), 'ต้องทำจบในแท็บเดียว').toHaveLength(1);
}

/** EN บนแถบหัวหน้าผู้ป่วย — จุดที่ภาพหลักฐานต้องชี้ */
function headerEn(page: Page, visit: ErVisit) {
  return page.getByRole('main').getByText(visit.en, { exact: true }).filter({ visible: true }).first();
}

/** แสดงเลขผู้ป่วย/Visit ที่เทสสร้างไว้ในรายงานและ terminal — ใช้ตามหาข้อมูลบน dev-x */
function recordVisit(visit: ErVisit) {
  test.info().annotations.push(
    { type: 'HN', description: visit.hn },
    { type: 'VN', description: visit.vn },
    { type: 'EN', description: visit.en },
  );
  console.log(`HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
}

/** ผู้ป่วยของทีมที่สุ่มได้รอบนี้ — ไว้ดูในรายงานว่าเทสใช้ใคร */
function recordTeamPatient(patient: FoundPatient) {
  const name = `${patient.firstName} ${patient.familyName ?? ''}`.trim();
  test.info().annotations.push({ type: 'ผู้ป่วยทดสอบของทีม (สุ่ม)', description: `${patient.hn} ${name}` });
  console.log(`ผู้ป่วยทดสอบของทีม: ${patient.hn} ${name}`);
}

/** ยกเลิกทุก Visit ที่เทสเปิดให้ผู้ป่วยของทีม — ต้องอยู่หน้า ER Dashboard */
async function cancelOpenedVisits(page: Page, opened: Map<string, ErVisit>) {
  for (const visit of [...opened.values()]) {
    await checkStep(page, `ยกเลิก Encounter ${visit.en} (HN ${visit.hn}) แล้วการ์ดหายจากบอร์ด`, () =>
      cancelErEncounter(page, visit, CANCEL_REASON),
    );
    opened.delete(visit.en);
  }
}

test.describe('SBH-1013 เปิด Visit ER ที่หน้า ER', () => {
  // ทั้ง flow โหลดแอป + เปิดหน้าผู้ป่วยหลายรอบ เกินค่าตั้งต้น 60 วินาที
  test.describe.configure({ timeout: 180_000 });

  test(
    'สร้าง HN ใหม่ที่หน้า ER แล้วเปิด Visit ER ได้ EN ผูกกับ HN ใหม่ และเข้าฟอร์ม Triage ต่อ (Super_User)',
    {
      tag: ['@SBH-1013', '@SBH-1709', '@SBH-1710', '@SBH-1711'],
      annotation: [linear('SBH-1013'), linear('SBH-1702')],
    },
    async ({ page }) => {
      const urls = trackUrls(page);
      const patient = newTestPatient('NewHN');
      const fullName = `${patient.firstName} ${patient.familyName}`;
      await gotoErDashboard(page);
      await openTriagePage(page);

      const { hn, dialog } = await checkStep(page, 'TC-003 (SBH-1709) สร้าง HN ใหม่จากหน้า ER โดยไม่ผ่าน Registration', async () => {
        // TC-003 ขั้น 3 + R15: ผู้ป่วยใหม่ต้องไม่เคยมีในระบบมาก่อน
        await checkStep(page, `ค้นชื่อ "${fullName}" ก่อนลงทะเบียน: ต้องไม่พบในระบบ`, async () => {
          const found = await searchPatients(page, fullName);
          expect(found.totalCount, 'ผู้ป่วยใหม่ต้องไม่เคยมีในระบบมาก่อน').toBe(0);
          const notFound = page.getByRole('listbox').filter({ hasText: 'ไม่พบผู้ป่วย' });
          await expect(notFound).toBeVisible();
          await markEvidence(page.getByRole('combobox', { name: 'ค้นหาผู้ป่วยด้วย HN หรือชื่อ' }), notFound);
        });
        const registered = await registerNewPatient(page, patient);
        await expect(page).toHaveURL(/\/cortex\/er\/triage/);
        expectStayedInEr(page, urls);
        await expect(registered.dialog.getByText(fullName)).toBeVisible();
        await markEvidence(registered.dialog.getByText(`HN ${registered.hn}`, { exact: true }), registered.dialog.getByText(fullName));
        return registered;
      });

      const visit = await checkStep(page, 'TC-004 (SBH-1710) เปิด Visit ER ได้ EN ใหม่ผูกกับ HN ที่เพิ่งสร้าง', async () => {
        const visit = await confirmOpenErVisit(page, dialog);
        expect(visit.hn, 'EN ต้องผูกกับ HN ที่เพิ่งสร้าง ไม่ข้ามไป HN อื่น').toBe(hn);
        expect(visit.en).toMatch(/^E\d+$/);
        await expectVisitHeader(page, visit);
        await markEvidence(headerEn(page, visit), page.getByText('สร้าง Visit สำเร็จ'));
        return visit;
      });
      recordVisit(visit);
      await dismissToast(page, 'สร้าง Visit สำเร็จ');

      await checkStep(page, 'TC-005 (SBH-1711) ระบบเปิดฟอร์ม Triage ต่อทันที และแสดง HN/EN ของผู้ป่วยรายนี้', async () => {
        expectStayedInEr(page, urls);
        await expectTriageFormOpen(page, visit);
        await markEvidence(headerEn(page, visit), page.getByRole('main').getByRole('heading', { name: 'คัดกรอง ER' }));
      });
    },
  );

  test.describe('ผู้ป่วยมี HN (ผู้ป่วยทดสอบของทีม)', () => {
    let opened = new Map<string, ErVisit>();
    test.beforeEach(({ page }) => {
      opened = trackOpenedErVisits(page);
    });
    // ผู้ป่วยเป็นของทีม ห้ามทิ้ง Visit ค้างบนบอร์ด — ถ้าเทสพังก่อนถึงขั้นยกเลิก ก็ยกเลิกให้ตรงนี้ (R15)
    test.afterEach(async ({ page }) => {
      if (!opened.size) return;
      await gotoErDashboard(page);
      await cancelOpenedVisits(page, opened);
    });

    test(
      'เปิด Visit ER ที่หน้า ER ให้ผู้ป่วยที่มี HN อยู่แล้ว ได้ EN ขึ้นบน ER Dashboard และกลับเข้าฟอร์ม Triage ได้ (Super_User)',
      {
        tag: ['@SBH-1013', '@SBH-1707', '@SBH-1708', '@SBH-1711', '@SBH-1712'],
        annotation: [linear('SBH-1013'), linear('SBH-1702')],
      },
      async ({ page }) => {
        const urls = trackUrls(page);
        const encountersBefore = await gotoErDashboard(page);
        await openTriagePage(page);

        const { patient, visit } = await checkStep(page, 'TC-001 (SBH-1707) ค้นหาผู้ป่วยที่มี HN อยู่แล้ว แล้วเปิด Visit ER จากหน้า ER ได้ โดยไม่ผ่าน Registration', async () => {
          const patient = await checkStep(page, 'ค้น "คนไข้" แล้วสุ่มผู้ป่วยทดสอบของทีมที่ไม่มี Visit / Admission ค้าง', () => pickTeamPatient(page));
          recordTeamPatient(patient);
          const dialog = await selectExistingPatient(page, patient.hn);
          const visit = await confirmOpenErVisit(page, dialog);
          expectStayedInEr(page, urls);
          await expectVisitHeader(page, visit);
          await markEvidence(headerEn(page, visit), page.getByText('สร้าง Visit สำเร็จ'));
          return { patient, visit };
        });
        recordVisit(visit);
        await dismissToast(page, 'สร้าง Visit สำเร็จ');

        await checkStep(page, 'TC-002 (SBH-1708) ระบบ Generate EN ใหม่ผูกกับ HN เดิม และแสดงบนหน้าผู้ป่วย', async () => {
          expect(visit.hn, 'EN ต้องผูกกับ HN ของผู้ป่วยที่เลือก').toBe(patient.hn);
          expect(visit.en).toMatch(/^E\d+$/);
          expect(encountersBefore.map((e) => e.en), 'ต้องเป็น EN ใหม่ ไม่ซ้ำกับที่มีอยู่ก่อนเปิด Visit').not.toContain(visit.en);
          await expectVisitHeader(page, visit);
          await markEvidence(headerEn(page, visit), page.getByRole('main').getByText(`HN ${visit.hn}`, { exact: true }).filter({ visible: true }).first());
        });

        await checkStep(page, 'TC-005 (SBH-1711) ระบบเปิดฟอร์ม Triage ต่อทันที และแสดง HN/EN ของผู้ป่วยรายนี้', async () => {
          await expectTriageFormOpen(page, visit);
          await markEvidence(headerEn(page, visit), page.getByRole('main').getByRole('heading', { name: 'คัดกรอง ER' }));
        });

        await test.step('กลับไปหน้า ER Dashboard ผ่านแถบนำทาง', async () => {
          const encounters = await openErDashboardFromMenu(page);
          const onBoard = encounters.filter((e) => e.hn === visit.hn && e.latestStatusCode !== 'cancelled');

          // ผู้ใช้กำหนด 26 ก.ย. 2026: "ผูกกับหน่วยบริการ ER Room" ตอนนี้เช็คแค่ได้ EN + ขึ้นบน ER Dashboard (R12)
          await checkStep(page, 'TC-001 (SBH-1707) Visit ผูกกับห้อง ER: ผู้ป่วยขึ้นบน ER Dashboard', async () => {
            expect(onBoard.length, 'ผู้ป่วยต้องอยู่ในข้อมูลที่ ER Dashboard โหลดมา').toBeGreaterThan(0);
            await showDashboardCard(page, visit.hn);
            await markEvidence(dashboardCard(page, visit.hn));
          });

          // บอร์ดและมุมมองรายการไม่แสดง EN บนจอ → เช็คจากข้อมูลที่บอร์ดโหลดมาแทน (ภาพเป็นบอร์ดที่มีการ์ดผู้ป่วยรายนี้)
          await checkStep(page, 'TC-002 (SBH-1708) EN ในรายการผู้ป่วย ER ตรงกับที่เปิด Visit', async () => {
            expect(onBoard.map((e) => e.en), 'ผู้ป่วยรายนี้ต้องมี EN เดียวบนบอร์ด คือ EN ที่เพิ่งเปิด').toEqual([visit.en]);
            // EN ไม่มีบนจอ → แนบข้อมูลที่บอร์ดโหลดมาของผู้ป่วยรายนี้เป็นหลักฐานคู่กับภาพการ์ด
            await test.info().attach(`ข้อมูลบอร์ดของ HN ${visit.hn}`, {
              body: JSON.stringify(onBoard.map(({ hn, vn, en, latestStatusCode }) => ({ hn, vn, en, latestStatusCode })), null, 2),
              contentType: 'application/json',
            });
            await showDashboardCard(page, visit.hn);
            await markEvidence(dashboardCard(page, visit.hn));
          });

          await checkStep(page, 'TC-006 (SBH-1712) เลือกผู้ป่วยจากรายการ ER แล้วกลับเข้าหน้า Triage ได้ด้วย HN/EN เดิม', async () => {
            await (await showDashboardCard(page, visit.hn)).click();
            await expectTriageFormOpen(page, visit);
            await markEvidence(headerEn(page, visit), page.getByRole('main').getByRole('heading', { name: 'คัดกรอง ER' }));
          });
        });

        await test.step('ล้างข้อมูล: ยกเลิก Visit ที่เปิดให้ผู้ป่วยของทีม (R15)', async () => {
          await openErDashboardFromMenu(page);
          await cancelOpenedVisits(page, opened);
        });
      },
    );
  });
});
