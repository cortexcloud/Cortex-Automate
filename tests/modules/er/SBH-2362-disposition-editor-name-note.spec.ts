import { type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, openCarePanel, openVisitDialog, trackOpenedErVisits, visitHeaderMarks, type ErVisit } from '../../../helpers/functions/er';
import {
  chooseDispositionDiagnosis,
  closeDispositionHistory,
  closeDispositionHistoryForm,
  dispositionHistoryEntries,
  dispositionTextBoxes,
  openDispositionHistory,
  openDispositionHistoryForm,
  readDispositionHistoryForm,
  reopenDisposition,
  saveDispositionDraft,
  signDisposition,
  startDisposition,
  type ErDischargeSummary,
} from '../../../helpers/functions/er-disposition';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { startClip } from '../../../helpers/functions/fixtures';
import { alerted, checkStep, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence } from '../../../helpers/functions/evidence';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, recordMockPatient, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, gotoVisit, openPatientAs } from '../../../mock-data/uat-play';

// SBH-2362 [Bug][ER][Disposition] - ไม่สามารถบันทึก รายละเอียดเพิ่มเติม และ ชื่อแสดงไม่ถูกต้อง (การ์ดบั๊ก ไม่มี Sub-Issue → ลงผลเป็น Comment)
//   ข้อ 1: หัวฟอร์ม `แก้ไขล่าสุดโดย:` ต้องเป็นชื่อแพทย์ / พยาบาลที่แก้ ไม่ใช่ UUID
//   ข้อ 2: วิธีการจำหน่าย ปฏิเสธการรักษา (SBH Prod ชื่อ `Against Advice`) + กรอก `รายละเอียดเพิ่มเติม` → บันทึกฉบับร่าง / ลงนาม แล้วข้อความต้องยังอยู่
// 1 เทส (ผู้ป่วยรายเดียว — ผู้ใช้อนุญาต 5 พ.ย. 2026: สร้าง 1 ราย แล้วปิด Visit):
//   ข้อ 2 (Super_User · คลิป clip-ITEM2): เริ่มจำหน่าย → Against Advice + รายละเอียดเพิ่มเติม → บันทึกฉบับร่าง → โหลดหน้าใหม่ ตรวจข้อความ → ลงนาม → โหลดหน้าใหม่ ตรวจ + ฟอร์มย้อนหลังฉบับลงนาม
//   ข้อ 1: หน้าต่าง Doctor เปิดแก้ไข + บันทึกฉบับร่าง → ชื่อแพทย์ · หน้าต่าง Nurse บันทึกฉบับร่าง → ชื่อพยาบาล (Nurse ไม่มีสิทธิ์ลงนาม)
//          → หน้าหลัก (Super_User) โหลดใหม่เห็นชื่อพยาบาล → Doctor ลงนามปิดท้าย (ฟอร์มจบที่ COMPLETE ก่อนปิด Visit) · คลิป video-Doctor / video-Nurse / clip-ITEM1-main
// ระบบ: SBH Prod — npm run card:prod -- --headed --grep @SBH-2362
// ทำต่อกับผู้ป่วยเดิม (พังหลังเปิด Visit): SBH2362_VISIT="<HN>,<VN>,<EN>" · ไม่ปิด Visit ตอนพัง: SBH2362_KEEP=1

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const DISPOSITION_PANEL = 'สรุปการจำหน่าย';
/** ตัวเลือก ปฏิเสธการรักษา (dev-x) = Against Advice (SBH Prod) */
const AGAINST_ADVICE = /^(Against Advice|ปฏิเสธการรักษา|ปฎิเสธการรักษา)$/;
const stamp = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const NOTE = `ทดสอบ SBH-2362 ผู้ป่วยปฏิเสธการรักษา ${stamp}`;

/** ชื่อบัญชีจาก token ที่แอปใช้ — ไม่พิมพ์ token */
function accountName(authorization: string): string {
  const payload = JSON.parse(Buffer.from(authorization.split('.')[1] ?? '', 'base64url').toString('utf8') || '{}') as { name?: string };
  return payload.name ?? '';
}

/** ข้อความ `แก้ไขล่าสุดโดย: <ชื่อ> DD/MM/YYYY, HH:mm` บนหัวฟอร์ม */
function lastEdited(page: Page): Locator {
  return page.getByRole('main').getByText(/แก้ไขล่าสุดโดย/).first();
}

async function lastEditedName(page: Page): Promise<string> {
  const text = ((await lastEdited(page).textContent()) ?? '').replace(/\s+/g, ' ').trim();
  return text.replace(/^.*แก้ไขล่าสุดโดย\s*:?\s*/, '').replace(/\s*\d{1,2}\/\d{1,2}\/\d{4}.*$/, '').trim();
}

/** ช่อง `รายละเอียดเพิ่มเติม` (ขึ้นเมื่อเลือก Against Advice) */
function noteBox(page: Page): Locator {
  return page.getByRole('main').getByPlaceholder(/รายละเอียดเพิ่มเติม/).first();
}

function radioLabel(page: Page, name: string | RegExp): Locator {
  return page.getByRole('main').getByRole('radio', { name }).first().locator('xpath=ancestor::label[1]');
}

async function openDispositionPanel(page: Page) {
  await openCarePanel(page, 'Disposition', page.getByRole('main').getByText(DISPOSITION_PANEL, { exact: true }));
  await expect(page.getByTestId('er-disposition-start').or(page.getByTestId('er-disposition-save-draft')).or(page.getByTestId('er-disposition-reopen')).first()).toBeVisible({ timeout: 60_000 });
}

/** ฟอร์มคัดกรอง ER รุ่นใหม่ (ไม่มีแท็บ Triage): กรอก ESI 3 + สัญญาณชีพ → โซนที่ระบบแนะนำ → บันทึก → หน้า Overview (แบบสเปก SBH-1038) */
async function triage(page: Page, visit: ErVisit, chiefComplaint: boolean) {
  const panel = erTriagePanel(page);
  await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL, chiefComplaint });
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
    await expect(zone, 'ต้องมีโซนที่ระบบแนะนำ').toBeVisible({ timeout: 20_000 });
    await zone.scrollIntoViewIfNeeded();
    await zone.click();
    await expect(zone).toHaveAttribute('aria-pressed', 'true');
  }
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await expect(page.getByRole('main').getByText('Clinical Summary', { exact: true }), 'บันทึกคัดกรองแล้วต้องไปหน้า Overview').toBeVisible({ timeout: 90_000 });
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
}

/** ตรวจชื่อบนหัวฟอร์ม: ไม่ใช่ UUID + ตรงกับผู้บันทึกจาก API + ตรงกับชื่อบัญชีที่ล็อกอิน · แสดงตารางเทียบก่อน expect */
async function checkEditorName(page: Page, who: string, summary: ErDischargeSummary | null, account: string, accountLabel = 'ชื่อบัญชีที่ล็อกอิน') {
  await expect(lastEdited(page)).toBeVisible();
  const shown = await lastEditedName(page);
  const api = summary?.updatedBy?.display?.trim() ?? '';
  const matchesAccount = !!account && (shown.includes(account) || account.includes(shown));
  await showCompareTable(page, `ชื่อผู้แก้ไขบนหัวฟอร์ม Disposition — ${who}`, ['บนหน้าจอ', 'อ้างอิง'], [
    { label: 'ไม่ใช่ UUID', values: [shown, '-'], same: !UUID.test(shown) && shown.length > 0 },
    ...(summary ? [{ label: 'ผู้บันทึกจาก API', values: [shown, api], same: shown === api }] : []),
    { label: accountLabel, values: [shown, account], same: matchesAccount },
  ], { side: 'bottom' });
  await markEvidence(expected(lastEdited(page), `ชื่อ${who} ไม่ใช่ UUID`));
  test.info().annotations.push({ type: `ชื่อผู้แก้ไข — ${who}`, description: `หัวฟอร์ม "${shown}" · API "${api || '-'}" · บัญชี "${account}"` });
  expect(shown, `${who}: หัวฟอร์มต้องไม่แสดง UUID`).not.toMatch(UUID);
  if (summary) expect(shown, `${who}: ชื่อบนหัวฟอร์มต้องตรงกับผู้บันทึกจาก API`).toBe(api);
  expect(matchesAccount, `${who}: ชื่อบนหัวฟอร์ม "${shown}" ต้องเป็นชื่อบัญชี "${account}"`).toBe(true);
}

test.describe(`SBH-2362 Disposition: ชื่อผู้แก้ไข + รายละเอียดเพิ่มเติม (Against Advice) (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 900_000 });

  let opened: Map<string, ErVisit>;
  let others: { role: string; page: Page }[];

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
    others = [];
  });

  test.afterEach(async ({ page }, info) => {
    for (const other of others) {
      const video = other.page.video();
      await other.page.context().close().catch(() => undefined);
      const file = await video?.path().catch(() => undefined);
      if (!file || !fs.existsSync(file)) continue;
      const target = info.outputPath(`video-${other.role}.webm`);
      fs.copyFileSync(file, target);
      await info.attach(`video-${other.role}`, { path: target, contentType: 'video/webm' });
    }
    await hideCompareTable(page);
    await startClip(page, 'after');
    if (info.status !== info.expectedStatus && process.env.SBH2362_KEEP) {
      for (const v of opened.values()) console.log(`    หลังเทส: ไม่ปิด Visit (SBH2362_KEEP) — SBH2362_VISIT="${v.hn},${v.vn},${v.en}"`);
      return;
    }
    // ผู้ใช้เลือกให้ปิด Visit หลังเก็บหลักฐาน (5 ต.ค. 2026)
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      info.annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  /** ผู้ป่วย AUTO ใหม่ → Visit ER สิทธิ UC → Triage ESI 3 (หรือใช้ Visit เดิมจาก SBH2362_VISIT) */
  async function prepareVisit(page: Page): Promise<ErVisit> {
    const resume = process.env.SBH2362_VISIT?.split(',').map((s) => s.trim());
    if (resume?.length === 3) {
      const visit = { hn: resume[0], vn: resume[1], en: resume[2] } as ErVisit;
      opened.set(visit.en, visit);
      test.info().annotations.push({ type: 'ผู้ป่วย', description: `ใช้ Visit เดิม HN ${visit.hn} · ${visit.vn} · ${visit.en}` });
      await gotoVisit(page, visit);
      const summary = page.getByRole('main').getByText('Clinical Summary', { exact: true });
      const systolic = erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first();
      await expect(summary.or(systolic).first()).toBeVisible({ timeout: 90_000 });
      if (!(await summary.isVisible())) await triage(page, visit, false);
      return visit;
    }
    await gotoErDashboard(page);
    const patient = newTestPatient('Dispo');
    const visit = await registerAndOpenErVisit(page, patient).catch(async (error: Error) => {
      const full = await openVisitDialog(page).getByText(/\(Full\)|ไม่พบเวลาที่สามารถลงได้/).first().isVisible().catch(() => false);
      if (!full) throw error;
      throw new Error(`เปิด Visit ER ไม่ได้ — ช่วงเวลาออกตรวจของแพทย์วันนี้เต็ม (${patient.firstName} ${patient.familyName} ลงทะเบียนแล้วแต่ไม่มี Visit)`);
    });
    const state = 'SBH-2362 · เปิด Visit ER สิทธิ UC + Triage ESI 3 + Disposition Against Advice (เทสการ์ด ปิด Visit ท้ายเทส)';
    if (SYSTEM === 'sbh-prod') recordMockPatient('SBH-2362', patient, visit, state);
    console.log(`    ผู้ป่วย: ${patient.firstName} ${patient.familyName} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
    test.info().annotations.push({ type: 'ผู้ป่วย', description: `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });
    await expect(page.getByRole('main').getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
    await dismissToast(page, 'สร้าง Visit สำเร็จ');
    await triage(page, visit, true);
    return visit;
  }

  test(
    'ชื่อผู้แก้ไข Disposition (Doctor / Nurse) ไม่เป็น UUID + Against Advice บันทึกรายละเอียดเพิ่มเติมได้ทั้งฉบับร่างและลงนาม',
    { tag: ['@SBH-2362'], annotation: [linear('SBH-2362')] },
    async ({ page, browser }) => {
      const authorization = trackAuthorization(page);
      let visit!: ErVisit;
      let superName = '';

      await test.step('เตรียมผู้ป่วย: Visit ER + Triage ESI 3', async () => {
        visit = await prepareVisit(page);
        superName = accountName(authorization());
      });

      // ---------------- ข้อ 2 ----------------
      await openDispositionPanel(page);
      await startClip(page, 'ITEM2');

      await checkStep(page, 'ข้อ 2 (SBH-2362) ขั้น 1 เลือก Against Advice + กรอก รายละเอียดเพิ่มเติม', async () => {
        const main = page.getByRole('main');
        if (await page.getByTestId('er-disposition-start').isVisible()) await startDisposition(page);
        else if (await page.getByTestId('er-disposition-reopen').isVisible()) await reopenDisposition(page);
        await main.getByRole('radio', { name: 'Improved', exact: true }).check();
        await main.getByRole('radio', { name: AGAINST_ADVICE }).first().check();
        await expect(noteBox(page), 'เลือก Against Advice แล้วต้องมีช่อง รายละเอียดเพิ่มเติม').toBeVisible();
        await noteBox(page).fill(NOTE);
        await markEvidence(filled(radioLabel(page, 'Improved')), filled(radioLabel(page, AGAINST_ADVICE)), filled(noteBox(page)));
        await holdForClip(page, 2_000);
        await snapEvidence(page, 'กรอก — Against Advice + รายละเอียดเพิ่มเติม');
        const diagnosis = await chooseDispositionDiagnosis(page, 'K30');
        const { clinical, finding } = dispositionTextBoxes(page);
        await clinical.fill('ทดสอบ automate SBH-2362 (Super_User)');
        await finding.fill('ทดสอบ automate SBH-2362');
        await markEvidence(filled(diagnosis), filled(clinical), filled(finding));
        await holdForClip(page);
        await snapEvidence(page, 'กรอก — ช่องบังคับอื่นของฟอร์ม');
      });

      await checkStep(page, 'ข้อ 2 (SBH-2362) ขั้น 2 กด บันทึกฉบับร่าง แล้วโหลดหน้าใหม่', async () => {
        await noteBox(page).scrollIntoViewIfNeeded();
        await markEvidence(filled(noteBox(page)), clicked(page.getByTestId('er-disposition-save-draft')));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — บันทึกฉบับร่าง');
        const draft = await saveDispositionDraft(page);
        test.info().annotations.push({ type: 'บันทึกฉบับร่าง (Super_User)', description: `dischargeTypeCode ${draft.dischargeTypeCode} · ข้อความอยู่ใน response: ${JSON.stringify(draft).includes(NOTE) ? 'ใช่' : 'ไม่เจอ (ฟิลด์อาจไม่อยู่ใน selection ของแอป)'}` });
        const toast = page.getByText('บันทึกการจำหน่ายผู้ป่วย ER แล้ว');
        await expect(toast).toBeVisible();
        await markEvidence(alerted(toast));
        await holdForClip(page);
        await snapEvidence(page, 'หลังกด — บันทึกฉบับร่างสำเร็จ');
        await clearEvidenceMarks(page);
        await gotoVisit(page, visit);
        await openDispositionPanel(page);
      });

      await checkStep(page, 'ข้อ 2 (SBH-2362) Expected ฉบับร่าง: รายละเอียดเพิ่มเติม ยังอยู่หลังโหลดหน้า', async () => {
        await expect(noteBox(page)).toBeVisible();
        await noteBox(page).scrollIntoViewIfNeeded();
        const value = await noteBox(page).inputValue();
        await showCompareTable(page, 'รายละเอียดเพิ่มเติม หลังบันทึกฉบับร่าง + โหลดหน้าใหม่', ['บนหน้าจอ', 'ที่กรอก'], [
          { label: 'วิธีการจำหน่าย', values: [(await main(page).getByRole('radio', { name: AGAINST_ADVICE }).first().isChecked()) ? 'Against Advice' : 'ไม่ได้เลือก', 'Against Advice'], same: await main(page).getByRole('radio', { name: AGAINST_ADVICE }).first().isChecked() },
          { label: 'รายละเอียดเพิ่มเติม', values: [value || '(ว่าง)', NOTE], same: value === NOTE },
        ], { side: 'bottom' });
        await markEvidence(expected(radioLabel(page, AGAINST_ADVICE)), expected(noteBox(page), 'ข้อความยังอยู่หลังบันทึกฉบับร่าง'));
        await holdForClip(page, 2_000);
        await expect(noteBox(page), 'รายละเอียดเพิ่มเติม ต้องยังอยู่หลังบันทึกฉบับร่าง').toHaveValue(NOTE);
      });
      await hideCompareTable(page);

      await checkStep(page, 'ข้อ 2 (SBH-2362) ขั้น 3 กด ลงนาม แล้วโหลดหน้าใหม่', async () => {
        await markEvidence(clicked(page.getByTestId('er-disposition-finalize')));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — ลงนาม');
        await signDisposition(page);
        const toast = page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว');
        await markEvidence(alerted(toast), expected(page.getByTestId('er-disposition-reopen')));
        await holdForClip(page);
        await snapEvidence(page, 'หลังกด — ลงนามสำเร็จ');
        await clearEvidenceMarks(page);
        await gotoVisit(page, visit);
        await openDispositionPanel(page);
      });

      await checkStep(page, 'ข้อ 2 (SBH-2362) Expected ลงนาม: รายละเอียดเพิ่มเติม ยังอยู่หลังโหลดหน้า', async () => {
        await expect(page.getByTestId('er-disposition-reopen')).toBeVisible();
        await noteBox(page).scrollIntoViewIfNeeded();
        const value = await noteBox(page).inputValue();
        await showCompareTable(page, 'รายละเอียดเพิ่มเติม หลังลงนาม + โหลดหน้าใหม่', ['บนหน้าจอ', 'ที่กรอก'], [
          { label: 'รายละเอียดเพิ่มเติม', values: [value || '(ว่าง)', NOTE], same: value === NOTE },
        ], { side: 'bottom' });
        await markEvidence(expected(noteBox(page), 'ข้อความยังอยู่หลังลงนาม'), expected(page.getByTestId('er-disposition-reopen')));
        await holdForClip(page, 2_000);
        await expect(noteBox(page), 'รายละเอียดเพิ่มเติม ต้องยังอยู่หลังลงนาม').toHaveValue(NOTE);
      });
      await hideCompareTable(page);

      await checkStep(page, 'ข้อ 2 (SBH-2362) Expected ฟอร์มย้อนหลังฉบับลงนามมี รายละเอียดเพิ่มเติม', async () => {
        const popover = await openDispositionHistory(page);
        const entry = dispositionHistoryEntries(popover).filter({ hasText: 'ฉบับที่ลงนามล่าสุด' }).first();
        await markEvidence(expected(entry, 'ฉบับที่ลงนามล่าสุด'));
        await holdForClip(page);
        await snapEvidence(page, 'ประวัติ Disposition — ฉบับที่ลงนามล่าสุด');
        const dialog = await openDispositionHistoryForm(page, entry);
        const fields = await readDispositionHistoryForm(dialog);
        fs.writeFileSync(test.info().outputPath('history-form.json'), JSON.stringify(fields, null, 2));
        const row = dialog.locator('tr.ant-descriptions-row').filter({ hasText: 'รายละเอียดเพิ่มเติม' }).first();
        await row.scrollIntoViewIfNeeded();
        await markEvidence(expected(dialog.locator('tr.ant-descriptions-row').filter({ hasText: 'วิธีการจำหน่าย' }).first()), expected(row, 'ข้อความในฉบับที่ลงนาม'));
        await holdForClip(page, 2_000);
        expect(fields['รายละเอียดเพิ่มเติม'], 'ฟอร์มย้อนหลังฉบับลงนามต้องมี รายละเอียดเพิ่มเติม').toBe(NOTE);
      });
      await closeDispositionHistoryForm(page);
      await closeDispositionHistory(page).catch(() => undefined);

      // ---------------- ข้อ 1 ----------------
      const doctor = await openPatientAs(browser, 'Doctor', visit.hn, visit);
      others.push({ role: 'Doctor', page: doctor });
      const doctorAuth = trackAuthorization(doctor);
      await openDispositionPanel(doctor);

      await checkStep(doctor, 'ข้อ 1 (SBH-2362) ขั้น 1 Doctor เปิดแก้ไข แก้ข้อความ แล้วบันทึกฉบับร่าง', async () => {
        await markEvidence(expected(lastEdited(doctor), 'ก่อนแก้: ชื่อผู้ลงนามล่าสุด'), clicked(doctor.getByTestId('er-disposition-reopen')));
        await holdForClip(doctor);
        await snapEvidence(doctor, 'ก่อนกด — Doctor เปิดแก้ไข');
        if (await doctor.getByTestId('er-disposition-reopen').isVisible()) await reopenDisposition(doctor);
        const { clinical } = dispositionTextBoxes(doctor);
        await clinical.fill('ทดสอบ automate SBH-2362 (Doctor แก้ไข)');
        await markEvidence(filled(clinical), clicked(doctor.getByTestId('er-disposition-save-draft')));
        await holdForClip(doctor);
        await snapEvidence(doctor, 'ก่อนกด — Doctor บันทึกฉบับร่าง');
        const draft = await saveDispositionDraft(doctor);
        await expect(doctor.getByText('บันทึกการจำหน่ายผู้ป่วย ER แล้ว')).toBeVisible();
        await expect(async () => expect(await lastEditedName(doctor)).toBe(draft.updatedBy?.display?.trim() ?? '')).toPass({ timeout: 20_000 }).catch(() => undefined);
        await checkEditorName(doctor, 'แพทย์ (Doctor)', draft, accountName(doctorAuth()));
        await holdForClip(doctor, 2_000);
      });
      await hideCompareTable(doctor);

      const nurse = await openPatientAs(browser, 'Nurse', visit.hn, visit);
      others.push({ role: 'Nurse', page: nurse });
      const nurseAuth = trackAuthorization(nurse);
      await openDispositionPanel(nurse);

      await checkStep(nurse, 'ข้อ 1 (SBH-2362) ขั้น 2 Nurse แก้ข้อความ แล้วบันทึกฉบับร่าง', async () => {
        await expect(nurse.getByTestId('er-disposition-save-draft')).toBeVisible();
        await markEvidence(expected(lastEdited(nurse), 'ก่อนแก้: ชื่อแพทย์ที่แก้ล่าสุด'));
        await holdForClip(nurse);
        await snapEvidence(nurse, 'Nurse เปิดฟอร์ม — ชื่อแพทย์ที่แก้ล่าสุด');
        const { clinical } = dispositionTextBoxes(nurse);
        await clinical.fill('ทดสอบ automate SBH-2362 (Nurse แก้ไข)');
        await markEvidence(filled(clinical), clicked(nurse.getByTestId('er-disposition-save-draft')));
        await holdForClip(nurse);
        await snapEvidence(nurse, 'ก่อนกด — Nurse บันทึกฉบับร่าง');
        const draft = await saveDispositionDraft(nurse);
        await expect(nurse.getByText('บันทึกการจำหน่ายผู้ป่วย ER แล้ว')).toBeVisible();
        await expect(async () => expect(await lastEditedName(nurse)).toBe(draft.updatedBy?.display?.trim() ?? '')).toPass({ timeout: 20_000 }).catch(() => undefined);
        await checkEditorName(nurse, 'พยาบาล (Nurse)', draft, accountName(nurseAuth()));
        await holdForClip(nurse, 2_000);
      });
      await hideCompareTable(nurse);
      const nurseName = accountName(nurseAuth());

      await gotoVisit(page, visit);
      await openDispositionPanel(page);
      await startClip(page, 'ITEM1-main');
      await checkStep(page, 'ข้อ 1 (SBH-2362) ขั้น 3 Super_User โหลดหน้าใหม่ เห็นชื่อพยาบาลที่แก้ล่าสุด', async () => {
        await checkEditorName(page, 'พยาบาล — มองจากบัญชี Super_User', null, nurseName, 'ชื่อพยาบาลที่แก้ล่าสุด');
        await holdForClip(page, 2_000);
        test.info().annotations.push({ type: 'บัญชีหลัก', description: superName });
      });
      await hideCompareTable(page);

      // SBH Prod 5 พ.ย. 2026: โหลดหน้าผู้ป่วยซ้ำในหน้าต่าง Doctor เดิม → "Unexpected Application Error! Minified React error #185" → เปิดหน้าต่าง Doctor ใหม่แทน
      await doctor.context().close().catch(() => undefined);
      await doctorSign(browser, visit);
    },
  );

  /** ข้อ 1 ขั้น 4: หน้าต่าง Doctor ใหม่ → ลงนามฉบับร่างของ Nurse → หัวฟอร์มเป็นชื่อแพทย์ + รายละเอียดเพิ่มเติมยังอยู่ (ฟอร์มจบที่ COMPLETE ก่อนปิด Visit) */
  async function doctorSign(browser: import('@playwright/test').Browser, visit: ErVisit) {
    const doctor = await openPatientAs(browser, 'Doctor', visit.hn, visit);
    others.push({ role: 'Doctor-sign', page: doctor });
    const doctorAuth = trackAuthorization(doctor);
    await openDispositionPanel(doctor);
    await checkStep(doctor, 'ข้อ 1 (SBH-2362) ขั้น 4 Doctor ลงนามปิดท้าย ชื่อแพทย์บนหัวฟอร์ม', async () => {
      await expect(doctor.getByTestId('er-disposition-finalize')).toBeEnabled({ timeout: 60_000 });
      const before = await lastEditedName(doctor);
      await markEvidence(expected(lastEdited(doctor), 'ก่อนลงนาม: ชื่อผู้แก้ล่าสุด'), clicked(doctor.getByTestId('er-disposition-finalize')));
      await holdForClip(doctor);
      await snapEvidence(doctor, 'ก่อนกด — Doctor ลงนาม');
      const signed = await signDisposition(doctor);
      await expect(async () => expect(await lastEditedName(doctor)).not.toBe(before)).toPass({ timeout: 20_000 }).catch(() => undefined);
      await checkEditorName(doctor, 'แพทย์ (Doctor) หลังลงนาม', null, accountName(doctorAuth()));
      await noteBox(doctor).scrollIntoViewIfNeeded();
      await markEvidence(expected(noteBox(doctor), 'ข้อความยังอยู่หลังแก้หลายบัญชี'));
      await expect(noteBox(doctor), 'รายละเอียดเพิ่มเติม ต้องยังอยู่หลัง Doctor / Nurse แก้และลงนามใหม่').toHaveValue(/^ทดสอบ SBH-2362 ผู้ป่วยปฏิเสธการรักษา/);
      test.info().annotations.push({ type: 'Doctor ลงนาม', description: `${signed.completedAt} · ${signed.completedBy?.display} · ก่อนลงนามหัวฟอร์มเป็น "${before}"` });
      await holdForClip(doctor, 2_000);
    });
    await hideCompareTable(doctor);
  }

  test(
    'ทำต่อ: Doctor ลงนามฉบับร่างที่ค้าง (ผู้ป่วยเดิมจาก SBH2362_VISIT) แล้วปิด Visit',
    { tag: ['@SBH-2362-FIN'], annotation: [linear('SBH-2362')] },
    async ({ page, browser }) => {
      test.skip(!process.env.SBH2362_VISIT, 'ต้องระบุ SBH2362_VISIT');
      const [hn, vn, en] = process.env.SBH2362_VISIT!.split(',').map((s) => s.trim());
      const visit = { hn, vn, en } as ErVisit;
      opened.set(en, visit);
      await gotoVisit(page, visit);
      await doctorSign(browser, visit);
    },
  );
});

function main(page: Page): Locator {
  return page.getByRole('main');
}
