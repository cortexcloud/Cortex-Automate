import type { Page } from '@playwright/test';
import { closeVisitAtCashier } from '../helpers/functions/cashier';
import { dismissToast, expectTriageFormOpen, gotoErDashboard, type ErVisit } from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { triageForm } from '../helpers/functions/er-triage';
import { checkStep } from '../helpers/functions/evidence';
import type { NewPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { SETTINGS, SYSTEM, dxForSet, nextPrefixedPatient, recordMockPatient, registerAndOpenErVisit, savePhysicianNote, submitOrders } from './uat-er';
import { VITALS_NORMAL, addMedicineToCart, boardEncounter, careMenu, fillTriage, gotoVisit, mockPatient, saveTriageForm } from './uat-play';

// Mock Data: ผู้ป่วย ER 1 ราย สิทธิ UC → คัดกรอง ESI 3 → ER Physician Note (มี Dx — R21) → Order ยา + Lab + Imaging + หัตถการ (Activity) → ปิด Visit ที่หน้าการเงิน (R32)
// ผู้ใช้ขอ 16 ต.ค. 2026 · ชื่อ "UAT" นามสกุล ORDER-<ลำดับ> (รันซ้ำเลขเพิ่มเอง · UAT_SEQ กำหนดเลขได้)
// SBH Prod: npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-orders --headed
// dev-x:    npx playwright test -c playwright.mock.config.ts UAT-ER-orders --headed
// MOCK_RESUME=1 + MOCK_RESUME_FROM=triage|note|order|activity|close — ทำขั้นที่ค้างต่อกับผู้ป่วย ORDER รายล่าสุดใน created-patients.md

const LABEL = 'ORDER';
/** ยาที่สั่ง — dev-x ใช้เฉพาะ med0000005–8 (R25) · SBH Prod ใช้รหัสเดียวกับสคริปต์เล่น UAT-ER-01 (สั่งได้จริง 3 ต.ค. 2026) */
const MED_CODE = SYSTEM === 'dev-x' ? 'med0000005' : 'MED0000260';
/**
 * หัตถการ — env MOCK_ACTIVITY เปลี่ยนรหัสได้
 * dev-x: 89.52 ECG (การ์ด SBH-1103) · SBH Prod: ACT0000062 Biopsy of parathyroid gland (สั่ง + ส่งได้ 16 ต.ค. 2026 — 89.52 / ACT0005007 ค้นไม่เจอบน Prod)
 */
const ACTIVITY_CODE = process.env.MOCK_ACTIVITY || (SYSTEM === 'dev-x' ? '89.52' : 'ACT0000062');

const RESUME = process.env.MOCK_RESUME === '1';
const STEPS = ['triage', 'note', 'order', 'activity', 'close'] as const;
const FROM = RESUME ? STEPS.indexOf((process.env.MOCK_RESUME_FROM ?? 'triage') as (typeof STEPS)[number]) : 0;
const runs = (step: (typeof STEPS)[number]) => STEPS.indexOf(step) >= FROM;

function progress(message: string) {
  console.log(`    ผู้ป่วย Order · ${message}`);
}

/** ขั้นที่พังแล้วให้ทำขั้นถัดไปต่อ (แบบเดียวกับ UAT-ER-mock-data) — ขั้นปิด Visit ไม่ทำถ้ามีขั้นก่อนหน้าพัง */
async function attempt(page: Page, problems: string[], title: string, body: () => Promise<void>): Promise<boolean> {
  try {
    await checkStep(page, title, body);
    progress(`✓ ${title}`);
    return true;
  } catch (error) {
    problems.push(`${title} — ${(error as Error).message.split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '')}`);
    progress(`✗ ${title}`);
    return false;
  }
}

test(`Mock Data ผู้ป่วย ER สิทธิ UC + Order ยา / Lab / Imaging / หัตถการ แล้วปิด Visit (${SYSTEM})`, async ({ page }) => {
  test.setTimeout(900_000);
  const authorization = trackAuthorization(page);
  const main = page.getByRole('main');
  const problems: string[] = [];
  const done: string[] = [];

  let patient: NewPatient;
  let visit: ErVisit;
  if (RESUME) {
    const last = mockPatient(LABEL as 'A');
    const [firstName, familyName] = last.name.split(' ');
    patient = { citizenId: last.citizenId ?? '-', firstName, familyName, gender: 'ชาย', birthDate: '15/01/1990' };
    visit = { hn: last.hn, vn: last.vn, en: last.en };
    await gotoVisit(page, visit);
    progress(`ทำต่อกับ ${last.name} HN ${visit.hn} · ${visit.en} ตั้งแต่ขั้น ${STEPS[FROM]}`);
  } else {
    await gotoErDashboard(page);
    patient = await nextPrefixedPatient(page, authorization(), `${LABEL}-`);
    visit = await checkStep(page, `ลงทะเบียน ${patient.firstName} ${patient.familyName} + เปิด Visit ER สิทธิ UC`, async () => {
      const opened = await registerAndOpenErVisit(page, patient);
      await expectTriageFormOpen(page, opened);
      await dismissToast(page, 'สร้าง Visit สำเร็จ');
      return opened;
    });
    progress(`✓ ลงทะเบียน ${patient.firstName} ${patient.familyName} HN ${visit.hn} + เปิด Visit ER ${visit.en} (สิทธิ UC)`);
  }
  done.push('เปิด Visit ER สิทธิ UC');

  if (runs('triage')) {
    const ok = await attempt(page, problems, 'คัดกรอง ESI 3 พร้อมสัญญาณชีพ → โซนเหลือง', async () => {
      // SBH Prod: ข้อมูล Encounter โหลดไม่สำเร็จเป็นพักๆ ปุ่ม GCS กดไม่ได้ค้าง → เปิดหน้า Visit ใหม่
      const gcs = triageForm(page).getByRole('button', { name: 'เลือกคะแนน' }).first();
      let rounds = 0;
      await expect(async () => {
        if (rounds++) await gotoVisit(page, visit);
        await expectTriageFormOpen(page, visit);
        if (await gcs.count()) await expect(gcs).toBeEnabled({ timeout: 10_000 });
      }, 'ฟอร์มคัดกรองต้องพร้อมให้กรอก').toPass({ timeout: 150_000 });
      await fillTriage(page, visit, { level: 3, vitals: VITALS_NORMAL });
      await saveTriageForm(page, visit);
    });
    if (ok) done.push('คัดกรอง ESI 3');
  }

  if (runs('note')) {
    const dx = dxForSet(Number(patient.familyName.split('-')[1]));
    let diagnosis = '';
    const ok = await attempt(page, problems, `แพทย์บันทึก ER Physician Note (Dx ${dx})`, async () => void (diagnosis = await savePhysicianNote(page, dx)));
    if (ok) done.push(`ER Physician Note (Dx ${diagnosis})`);
  }

  if (runs('order')) {
    const codes = [SETTINGS.labCode, SETTINGS.imagingCode];
    const ok = await attempt(page, problems, `สั่งยา ${MED_CODE} + Lab ${SETTINGS.labCode} + Imaging ${SETTINGS.imagingCode} แล้วส่งคำสั่ง`, async () => {
      await careMenu(page, 'One Day Order', main.getByRole('heading', { name: 'Order', exact: true }));
      const sentMed = main.getByRole('row', { name: new RegExp(`^(ส่งแล้ว|กำลังดำเนินการ) \\[${MED_CODE}\\]`) });
      if (!(await sentMed.count())) await addMedicineToCart(page, MED_CODE);
      // ยาที่อยู่ในตะกร้าถูกส่งไปพร้อมรายการอื่นตอนกด "ส่งคำสั่ง"
      await submitOrders(page, codes, { resume: RESUME });
      await expect(sentMed.first(), `ยา ${MED_CODE} ต้องถูกส่งแล้ว`).toBeVisible({ timeout: 60_000 });
    });
    if (ok) done.push(`Order ยา ${MED_CODE} + ${codes.join(' + ')}`);
  }

  if (runs('activity')) {
    const ok = await attempt(page, problems, `สั่งหัตถการ ${ACTIVITY_CODE} แล้วส่งคำสั่ง`, () => submitOrders(page, [ACTIVITY_CODE], { resume: true }));
    if (ok) done.push(`หัตถการ ${ACTIVITY_CODE}`);
  }

  if (runs('close')) {
    if (problems.length) {
      progress('ข้ามการปิด Visit — มีขั้นก่อนหน้าไม่สำเร็จ (ทำขั้นที่ค้างต่อด้วย MOCK_RESUME แล้วค่อยปิด)');
    } else {
      await attempt(page, problems, 'ปิด Visit ที่หน้าการเงิน', async () => {
        const closed = await closeVisitAtCashier(page, visit.hn, visit.vn);
        // ยืนยันจากข้อมูลบอร์ด: Encounter ER จบแล้ว
        await expect
          .poll(async () => (await boardEncounter(page, authorization(), visit.en))?.latestStatusCode ?? '(ไม่อยู่บนบอร์ดวันนี้)', { timeout: 60_000, message: 'Encounter ER ต้องเป็น completed' })
          .toBe('completed');
        done.push(`ปิด Visit แล้ว${closed.outstanding ? ` (ยอดค้างชำระ ${closed.outstanding})` : ''}`);
      });
    }
  }

  recordMockPatient(LABEL, patient, visit, `${done.join(' · ')}${problems.length ? ` ‖ ไม่สำเร็จ: ${problems.join(' ‖ ')}` : ''}`);
  expect(problems, 'ขั้นที่เตรียมไม่สำเร็จ').toEqual([]);
});
