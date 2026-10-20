import type { Page } from '@playwright/test';
import { addChargeItems, closeCoverageWithEndpoint, closeVisitAtCashier, gotoCashierAccount, payAllInCash } from '../helpers/functions/cashier';
import { dismissToast, expectOk, expectTriageFormOpen, gotoErDashboard, type ErVisit } from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { triageForm } from '../helpers/functions/er-triage';
import { checkStep } from '../helpers/functions/evidence';
import type { NewPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { COVERAGE_UC, SETTINGS, SYSTEM, createPrescription, dxForSet, nextPrefixedPatient, openErVisitForHn, recordMockPatient, registerAndOpenErVisit, savePhysicianNote, submitOrders } from './uat-er';
import { openDisposition } from '../helpers/functions/er-disposition';
import { VITALS_NORMAL, addMedicineToCart, boardEncounter, careMenu, draftDischarge, fillTriage, gotoVisit, mockPatient, saveTriageForm, signDischarge } from './uat-play';

// Mock Data: ผู้ป่วย ER 1 ราย สิทธิ UC → คัดกรอง ESI 3 → ER Physician Note (มี Dx — R21) → Order ยา + Lab + Imaging + หัตถการ (Activity) → ปิด Visit ที่หน้าการเงิน (R32)
// ผู้ใช้ขอ 16 ต.ค. 2026 · ชื่อ "UAT" นามสกุล ORDER-<ลำดับ> (รันซ้ำเลขเพิ่มเอง · UAT_SEQ กำหนดเลขได้)
// SBH Prod: npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-orders --headed
// dev-x:    npx playwright test -c playwright.mock.config.ts UAT-ER-orders --headed
// MOCK_DISPOSITION=1 — ทำ Disposition (With Approval + กดปุ่มลงนาม) ก่อนปิด Visit (ผู้ใช้ขอ 16 ต.ค. 2026 ลำดับ Note → Order → Disposition → ปิด Visit)
// MOCK_RESUME=1 + MOCK_RESUME_FROM=triage|note|order|activity|disposition|close — ทำขั้นที่ค้างต่อกับผู้ป่วย ORDER รายล่าสุดใน created-patients.md

const LABEL = process.env.MOCK_HN ? 'HN' : 'ORDER';
/** ยาที่สั่ง — dev-x ใช้เฉพาะ med0000005–8 (R25) · SBH Prod ใช้รหัสเดียวกับสคริปต์เล่น UAT-ER-01 (สั่งได้จริง 3 ต.ค. 2026) */
const MED_CODE = SYSTEM === 'dev-x' ? 'med0000005' : 'MED0000260';
/** MOCK_MEDS=<รหัส,รหัส> ยาที่สั่งจาก ER (ตั้งต้น = MED_CODE ตัวเดียว) */
const MED_CODES = (process.env.MOCK_MEDS ?? MED_CODE).split(',').filter(Boolean);
/** MOCK_HN=<HN> ใช้ผู้ป่วยที่มี HN อยู่แล้ว (ไม่ลงทะเบียนใหม่) เปิด Visit ER ให้จากหน้าคัดกรอง — ผู้ใช้ให้รายชื่อ HN มา 19 ต.ค. 2026 */
const EXISTING_HN = process.env.MOCK_HN ?? '';
/**
 * หัตถการ — env MOCK_ACTIVITY เปลี่ยนรหัสได้
 * dev-x: 89.52 ECG (การ์ด SBH-1103) · SBH Prod: ACT0000062 Biopsy of parathyroid gland (สั่ง + ส่งได้ 16 ต.ค. 2026 — 89.52 / ACT0005007 ค้นไม่เจอบน Prod)
 */
const ACTIVITY_CODE = process.env.MOCK_ACTIVITY || (SYSTEM === 'dev-x' ? '89.52' : 'ACT0000062');

const RESUME = process.env.MOCK_RESUME === '1';
const DISPOSITION = process.env.MOCK_DISPOSITION === '1';
/** MOCK_NO_ACTIVITY=1 ไม่สั่งหัตถการ · MOCK_NO_CLOSE=1 ไม่ปิด Visit (ทิ้งไว้ทำขั้นห้องยา / ชำระเงินต่อ) */
const NO_ACTIVITY = process.env.MOCK_NO_ACTIVITY === '1';
const NO_CLOSE = process.env.MOCK_NO_CLOSE === '1';
/** MOCK_RX=1 สร้างใบยาที่ห้องยาชั้น 1 หลัง Disposition (ผู้ใช้ขอ 16 ต.ค. 2026) */
const RX = process.env.MOCK_RX === '1';
/** MOCK_ENDPOINT=<เลข> ปิดสิทธิ UC ด้วย End Point (บัตร 60 · Terminal ID / Trace = เลขเดียวกัน — ผู้ใช้กำหนด) แล้วชำระเงินสดยอดที่เหลือ ก่อนปิด Visit */
const ENDPOINT = process.env.MOCK_ENDPOINT ?? '';
/** MOCK_CASHIER_ITEMS=<รหัส,รหัส> เพิ่มรายการค่าใช้จ่ายที่หน้าการเงิน (ปุ่ม เพิ่มรายการ) ก่อนชำระเงิน — ผู้ใช้ 19 ต.ค. 2026 ให้ LAB / IMG / Activity เพิ่มที่การเงิน */
const CASHIER_ITEMS = (process.env.MOCK_CASHIER_ITEMS ?? '').split(',').filter(Boolean);
/** MOCK_ENDPOINT=random7 = End Point สุ่ม 7 หลัก (Terminal ID / Trace สุ่มตามตัวช่วย) */
const randomOfLength = (n: number) => Array.from({ length: n }, (_, i) => String(Math.floor(Math.random() * (i ? 10 : 9)) + (i ? 0 : 1))).join('');
const STEPS = ['triage', 'note', 'order', 'activity', 'disposition', 'rx', 'cashier-items', 'pay', 'close'] as const;
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
    // ขั้นห้องยา / การเงิน ไม่ใช้หน้า Visit ของ ER
    if (FROM < STEPS.indexOf('rx')) await gotoVisit(page, visit);
    progress(`ทำต่อกับ ${last.name} HN ${visit.hn} · ${visit.en} ตั้งแต่ขั้น ${STEPS[FROM]}`);
  } else if (EXISTING_HN) {
    await gotoErDashboard(page);
    const res = await page.request.get(`/new-demographic-api/patients?filter[hn][in]=${EXISTING_HN}&perPage=1`, { headers: { authorization: authorization() } });
    await expectOk(res, `อ่านข้อมูลผู้ป่วย HN ${EXISTING_HN}`);
    const found = ((await res.json()) as { data: { firstName?: string; familyName?: string; citizenId?: string }[] }).data[0];
    if (!found) throw new Error(`ไม่พบผู้ป่วย HN ${EXISTING_HN}`);
    patient = { citizenId: found.citizenId ?? '-', firstName: found.firstName ?? '', familyName: found.familyName ?? '', gender: 'ชาย', birthDate: '-' };
    visit = await checkStep(page, `เปิด Visit ER สิทธิ ${COVERAGE_UC} ให้ ${patient.firstName} ${patient.familyName} (HN ${EXISTING_HN})`, async () => {
      const opened = await openErVisitForHn(page, EXISTING_HN);
      await expectTriageFormOpen(page, opened);
      await dismissToast(page, 'สร้าง Visit สำเร็จ');
      return opened;
    });
    progress(`✓ เปิด Visit ER ${visit.en} ให้ ${patient.firstName} ${patient.familyName} HN ${visit.hn}`);
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
  done.push(`เปิด Visit ER สิทธิ ${COVERAGE_UC}`);

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
    // Dx ไม่ซ้ำกัน (R36): ผู้ป่วย Mock ตามเลขลำดับ · ผู้ป่วยที่มี HN ตามเลข HN
    const dx = dxForSet(EXISTING_HN ? Number(EXISTING_HN) : Number(patient.familyName.split('-')[1]));
    let diagnosis = '';
    const ok = await attempt(page, problems, `แพทย์บันทึก ER Physician Note (Dx ${dx})`, async () => void (diagnosis = await savePhysicianNote(page, dx)));
    if (ok) done.push(`ER Physician Note (Dx ${diagnosis})`);
  }

  if (runs('order')) {
    // MOCK_ER_ORDER_CODES=<รหัส,รหัส> กำหนดรายการที่สั่งจาก ER นอกจากยา (ว่าง = สั่งเฉพาะยา — ผู้ใช้ 19 ต.ค. 2026 ให้ LAB / IMG / Activity ไปเพิ่มที่หน้าการเงิน)
    const codes = process.env.MOCK_ER_ORDER_CODES !== undefined ? process.env.MOCK_ER_ORDER_CODES.split(',').filter(Boolean) : [SETTINGS.labCode, SETTINGS.imagingCode];
    const list = [...MED_CODES, ...codes].join(' + ');
    const ok = await attempt(page, problems, `สั่งยา / Order ${list} แล้วส่งคำสั่ง`, async () => {
      await careMenu(page, 'One Day Order', main.getByRole('heading', { name: 'Order', exact: true }));
      const sentMed = (code: string) => main.getByRole('row', { name: new RegExp(`^(ส่งแล้ว|กำลังดำเนินการ) \\[${code}\\]`) });
      for (const code of MED_CODES) if (!(await sentMed(code).count())) await addMedicineToCart(page, code);
      // ยาที่อยู่ในตะกร้าถูกส่งไปพร้อมรายการอื่นตอนกด "ส่งคำสั่ง"
      await submitOrders(page, codes, { resume: RESUME });
      for (const code of MED_CODES) await expect(sentMed(code).first(), `ยา ${code} ต้องถูกส่งแล้ว`).toBeVisible({ timeout: 60_000 });
    });
    if (ok) done.push(`Order ${list}`);
  }

  if (!NO_ACTIVITY && runs('activity')) {
    const ok = await attempt(page, problems, `สั่งหัตถการ ${ACTIVITY_CODE} แล้วส่งคำสั่ง`, () => submitOrders(page, [ACTIVITY_CODE], { resume: true }));
    if (ok) done.push(`หัตถการ ${ACTIVITY_CODE}`);
  }

  if (DISPOSITION && runs('disposition')) {
    // ลงนามแล้วยังสั่ง Order เพิ่มไม่ได้ทุกกรณี → ทำหลัง Order ครบ (ผู้ใช้เลือกลำดับนี้) · วิธีจำหน่ายตามตัวเลือกในฟอร์ม (R19) · Finalize = ปุ่มลงนาม (R20)
    if (problems.length) {
      progress('ข้าม Disposition — มีขั้นก่อนหน้าไม่สำเร็จ');
    } else {
      const ok = await attempt(page, problems, 'Disposition: Improved + With Approval → บันทึกฉบับร่าง → กดปุ่มลงนาม', async () => {
        await openDisposition(page);
        const status = await draftDischarge(page, 'With Approval');
        expect(status, 'บันทึกฉบับร่างแล้วสถานะต้องเป็น DRAFT').toBe('DRAFT');
        await signDischarge(page);
      });
      if (ok) done.push('Disposition With Approval ลงนามแล้ว');
    }
  }

  if (RX && runs('rx')) {
    if (problems.length) progress('ข้ามการสร้างใบยา — มีขั้นก่อนหน้าไม่สำเร็จ');
    else {
      let rx = '';
      if (await attempt(page, problems, 'ห้องยา: สร้างใบยา', async () => void (rx = await createPrescription(page, visit.hn)))) done.push(`ใบยา ${rx}`);
    }
  }

  if (CASHIER_ITEMS.length && runs('cashier-items')) {
    if (problems.length) progress('ข้ามการเพิ่มรายการที่การเงิน — มีขั้นก่อนหน้าไม่สำเร็จ');
    else {
      const ok = await attempt(page, problems, `การเงิน: เพิ่มรายการ ${CASHIER_ITEMS.join(' + ')}`, async () => {
        await gotoCashierAccount(page, visit.hn, visit.vn);
        await addChargeItems(page, CASHIER_ITEMS);
      });
      if (ok) done.push(`เพิ่มรายการที่การเงิน ${CASHIER_ITEMS.join(' + ')}`);
    }
  }

  if (ENDPOINT && runs('pay')) {
    if (problems.length) progress('ข้ามการชำระเงิน — มีขั้นก่อนหน้าไม่สำเร็จ');
    else {
      await attempt(page, problems, `การเงิน: ปิดสิทธิด้วย End Point ${ENDPOINT} แล้วชำระเงินสด`, async () => {
        await gotoCashierAccount(page, visit.hn, visit.vn);
        // MOCK_ENDPOINT=random = สุ่มเลขทั้ง 3 ช่อง (ผู้ใช้ 19 ต.ค. 2026: เลขเดิมซ้ำแล้วปุ่มยืนยันกดไม่ได้)
        const digits = ENDPOINT.match(/^random(\d+)$/)?.[1];
        const fixed = ENDPOINT === 'random' ? {} : digits ? { endPoint: randomOfLength(Number(digits)) } : { endPoint: ENDPOINT, terminalId: ENDPOINT, trace: ENDPOINT };
        const ep = await closeCoverageWithEndpoint(page, { cardType: '60', ...fixed });
        done.push(`ปิดสิทธิ End Point ${ep.endPoint} (Terminal ID ${ep.terminalId} · Trace ${ep.trace})`);
        const paid = await payAllInCash(page);
        done.push(`ชำระเงินสด ${paid.amount.toFixed(2)} (${paid.invoiceId} · ใบเสร็จ ${paid.receiptId})`);
      });
    }
  }

  if (!NO_CLOSE && runs('close')) {
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
