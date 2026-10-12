import { type Locator, type Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/cashier';
import {
  confirmOpenErVisit,
  dismissToast,
  expectOk,
  expectTriageFormOpen,
  expectVisitHeader,
  gotoErDashboard,
  openCarePanel,
  openTriagePage,
  registerNewPatient,
  type ErVisit,
} from '../../../helpers/er';
import { createAdmitRequest } from '../../../helpers/er-admit';
import { draftDisposition, graphqlMutation, signDisposition } from '../../../helpers/er-disposition';
import {
  ER_LIST_TABS,
  bangkokToday,
  erDischargeButton,
  erDischargeConfirm,
  erListCell,
  erListEmpty,
  erListRow,
  erListTab,
  erListTabCount,
  erViewSwitch,
  fetchErEncounterState,
  filterErListByHn,
  gotoErPatientList,
  hnSearchBox,
  openErListTab,
  openErPatientListFromMenu,
  readErListTabs,
  type ErEncounterState,
} from '../../../helpers/er-list';
import { trackAuthorization } from '../../../helpers/er-report';
import { saveTriage } from '../../../helpers/er-triage';
import { alerted, checkStep, clicked, expected, filled, holdForClip, markEvidence, snapEvidence } from '../../../helpers/evidence';
import { expect, test } from '../../../helpers/fixtures';
import { newTestPatient } from '../../../helpers/test-data';

// SBH-2391 [ER] Disposition patient list — แท็บ รอจำหน่าย / ปุ่ม จำหน่าย / แท็บ เสร็จสิ้น บนหน้ารายการผู้ป่วย ER (สเปกของ dev: SBH-2396)
// แปลงจากชุด Manual: EXE SBH-2448 → SC-001 (SBH-2449) TC-001–003 (SBH-2451–2453) · SC-002 (SBH-2450) TC-004 (SBH-2454) · 2 เทสตาม flow (R9):
//   1) ผู้ป่วย A (ไม่มี Admit Request / ไม่มี ward เตียง): Disposition + ลงนาม → รอจำหน่าย → กดปุ่ม จำหน่าย → จำหน่าย → ปิด Visit ที่การเงิน → เสร็จสิ้น
//   2) ผู้ป่วย B (มี Admit Request): Disposition + ลงนาม → ไม่เข้า รอจำหน่าย (อยู่ ผู้ป่วยรอเตียง)
// ข้อมูล: ผู้ป่วย AUTO ใหม่ทุกรอบ (R10) เปิด Visit ER + Triage ESI 3 เอง · ทิ้งไว้บน dev-x (R11) — A จบที่ Visit ปิดแล้ว · B ค้างแท็บ ผู้ป่วยรอเตียง (ไม่สร้าง AN ไม่เลือกเตียง R30)
// ข้อควรรู้จากชุด EXE: "กด Save" ในการ์ด = แพทย์ลงนาม (สเปก SBH-2396) — บันทึกฉบับร่างอย่างเดียวยังไม่เข้า รอจำหน่าย ไม่ถือเป็นบั๊ก · ต้องรันจบก่อน 22:00 (ระบบปิด Visit อัตโนมัติ)
// บัญชี: Super_User ทำทั้งส่วนของแพทย์ ER และการเงิน (R6)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const note = (description: string) => test.info().annotations.push({ type: 'ข้อสังเกต', description });

const DISPOSITION_TEXT = 'ทดสอบ automate SBH-2391';

/** Pre-condition: ผู้ป่วย AUTO ใหม่ → เปิด Visit ER → Triage ESI 3 (จบที่หน้าผู้ป่วยของ Visit) */
async function openTriagedVisit(page: Page, label: string, name: string): Promise<ErVisit> {
  await gotoErDashboard(page);
  await openTriagePage(page);
  const { dialog } = await registerNewPatient(page, newTestPatient(label));
  const visit = await confirmOpenErVisit(page, dialog);
  test.info().annotations.push({ type: name, description: `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });
  console.log(`    ${name}: HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
  await expectTriageFormOpen(page, visit);
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  await saveTriage(page, visit, 3);
  return visit;
}

/** แถบหัวของหน้าผู้ป่วย: HN / VN / EN ของ Visit (ไว้ตีกรอบ) */
function visitHeaderMarks(page: Page, visit: ErVisit) {
  const main = page.getByRole('main');
  return [`HN ${visit.hn}`, `VN ${visit.vn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first()));
}

/** แท็บ Disposition (แถบขวา) → Improved + With Approval + ช่องบังคับ → บันทึกฉบับร่าง → ปุ่มลงนาม (R20) */
async function disposeAndSign(page: Page, readState: () => Promise<ErEncounterState>, statusBeforeSign: string) {
  const main = page.getByRole('main');
  await checkStep(page, 'เปิด Disposition เลือก Improved + With Approval กรอกช่องบังคับ แล้วกด บันทึกฉบับร่าง — ใบสรุปเป็น DRAFT สถานะผู้ป่วยยังไม่เปลี่ยน', async () => {
    await openCarePanel(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }));
    await draftDisposition(page, 'With Approval', DISPOSITION_TEXT);
    const state = await readState();
    await test.info().attach('สถานะจาก API หลังบันทึกฉบับร่าง', { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
    // สเปก SBH-2396: Save Draft อย่างเดียวยังไม่เข้า รอจำหน่าย (ชุด EXE จดไว้ว่าไม่ถือเป็นบั๊ก)
    expect(state.patientStatus, 'บันทึกฉบับร่างอย่างเดียว สถานะผู้ป่วยต้องยังไม่เปลี่ยน').toBe(statusBeforeSign);
    await markEvidence(
      filled(main.getByRole('radio', { name: 'Improved', exact: true }).locator('xpath=ancestor::label[1]')),
      filled(main.getByRole('radio', { name: 'With Approval', exact: true }).locator('xpath=ancestor::label[1]')),
      clicked(page.getByTestId('er-disposition-save-draft')),
    );
    await holdForClip(page);
  });

  await checkStep(page, 'กดปุ่มลงนาม — ใบสรุปการจำหน่ายเป็น COMPLETE', async () => {
    const finalize = page.getByTestId('er-disposition-finalize');
    await markEvidence(clicked(finalize));
    await holdForClip(page);
    await snapEvidence(page, 'ก่อนกด — ปุ่มลงนาม');
    const summary = await signDisposition(page);
    await test.info().attach('ใบสรุปการจำหน่ายหลังลงนาม', { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
    await markEvidence(alerted(page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว')));
    await holdForClip(page);
  });
}

/** ตัวนับของทุกแท็บหลังกรองด้วย HN — ผู้ป่วย 1 รายต้องอยู่แท็บเดียว */
async function tabsWithPatient(page: Page): Promise<string[]> {
  return (await readErListTabs(page)).filter((tab) => tab.count > 0).map((tab) => tab.label);
}

test.describe('SBH-2391 ER Disposition patient list (รอจำหน่าย · จำหน่าย · เสร็จสิ้น)', () => {
  // เปิด Visit + Triage + Disposition + การเงิน และค้างหน้าจอให้คลิปอ่านทัน เกินค่าตั้งต้น 60 วินาที
  test.describe.configure({ timeout: 600_000 });

  // ---------------------------------------------------------------------------------------------
  test(
    'ผู้ป่วย A ไม่มี Admit Request: Disposition + ลงนาม → แท็บ รอจำหน่าย → ปุ่ม จำหน่าย → แท็บ จำหน่าย → ปิด Visit ที่การเงิน → แท็บ เสร็จสิ้น (Super_User)',
    { tag: ['@SBH-2391', '@SBH-2451', '@SBH-2452', '@SBH-2453'], annotation: [linear('SBH-2391'), linear('SBH-2448')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const main = page.getByRole('main');
      const arrivalDay = bangkokToday();
      let visit!: ErVisit;
      const readState = () => fetchErEncounterState(page, authorization(), visit.en, arrivalDay);
      const attachState = async (name: string) => {
        const state = await readState();
        await test.info().attach(name, { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
        return state;
      };

      await test.step('เตรียม (Pre-condition): ผู้ป่วย A = ผู้ป่วย AUTO ใหม่ เปิด Visit ER และ Triage ESI 3', async () => {
        visit = await openTriagedVisit(page, 'DispoA', 'ผู้ป่วย A');
      });
      const row = erListRow(page, visit.en);

      // ---------------- TC-001 ----------------
      await checkStep(page, 'TC-001 (SBH-2451) ขั้น 1 เปิดผู้ป่วย A ที่ไม่มี Admit Request และไม่มี ward เตียง', async () => {
        await expectVisitHeader(page, visit);
        const state = await attachState('สถานะผู้ป่วย A จาก API ก่อนทำ Disposition');
        expect(state.patientStatus, 'ผู้ป่วย A ยังอยู่ใน ER').toBe('current_in_er');
        expect(state.admitRequestStatus, 'ผู้ป่วย A ต้องไม่มี Admit Request').toBeNull();
        expect(state.an, 'ผู้ป่วย A ต้องไม่มี AN (ไม่มี ward เตียง)').toBeNull();
        await markEvidence(...visitHeaderMarks(page, visit));
        await holdForClip(page);
      });

      await checkStep(page, 'TC-001 (SBH-2451) ขั้น 2 Patient Chart แท็บด้านขวา Disposition ทำ Disposition แล้วกด Save', async () => {
        await disposeAndSign(page, readState, 'current_in_er');
        await expect.poll(async () => (await readState()).patientStatus, { message: 'ลงนามแล้วสถานะผู้ป่วยต้องเป็น รอจำหน่าย (waiting_for_discharge)' }).toBe('waiting_for_discharge');
        const state = await attachState('สถานะผู้ป่วย A จาก API หลังลงนาม');
        expect(state.canDischargeFromEr, 'ลงนามแล้วต้องกดจำหน่ายออกจาก ER ได้').toBe(true);
        expect(state.visitClosed, 'ลงนามแล้ว Visit ยังไม่ปิด').toBe(false);
        expect(state.departedAt, 'ลงนามอย่างเดียวยังไม่ถือว่าจำหน่ายออกจาก ER').toBeNull();
      });

      await checkStep(page, 'TC-001 (SBH-2451) ขั้น 3 เปิดหน้ารายการผู้ป่วย ER แล้วดูแท็บสถานะ — มีแท็บ รอจำหน่าย', async () => {
        await openErPatientListFromMenu(page);
        const tabs = await readErListTabs(page);
        test.info().annotations.push({ type: 'แท็บสถานะของหน้ารายการผู้ป่วย ER', description: tabs.map((tab) => tab.label).join(' | ') });
        expect(tabs.map((tab) => tab.label), 'แท็บสถานะของหน้ารายการผู้ป่วย ER').toEqual(Object.values(ER_LIST_TABS));
        const tab = erListTab(page, 'waiting-for-discharge');
        await expect(tab).toContainText('รอจำหน่าย');
        await markEvidence(clicked(erViewSwitch(page, 'รายการ')), expected(tab));
        await holdForClip(page);
      });

      await checkStep(page, 'TC-001 (SBH-2451) ขั้น 4 เปิดแท็บ รอจำหน่าย — ผู้ป่วย A แสดงในแท็บ รอจำหน่าย', async () => {
        await filterErListByHn(page, visit.hn);
        await openErListTab(page, 'waiting-for-discharge');
        await expect(row).toBeVisible();
        await expect(row).toContainText(visit.hn);
        await expect(await erListCell(page, row, 'สถานะ')).toHaveText('รอจำหน่าย');
        await expect(erListTabCount(page, 'waiting-for-discharge')).toHaveText('1');
        expect(await tabsWithPatient(page), 'ค้นด้วย HN ของผู้ป่วย A แล้วต้องพบในแท็บ รอจำหน่าย แท็บเดียว').toEqual(['รอจำหน่าย']);
        await markEvidence(filled(hnSearchBox(page)), clicked(erListTab(page, 'waiting-for-discharge')), expected(row));
        await holdForClip(page);
      });

      // ---------------- TC-002 ----------------
      const dischargeButton = erDischargeButton(row);
      await checkStep(page, 'TC-002 (SBH-2452) ขั้น 1 แท็บ รอจำหน่าย แถวของผู้ป่วย A มีปุ่ม จำหน่าย', async () => {
        await expect(dischargeButton).toBeVisible();
        await expect(dischargeButton).toBeEnabled();
        const nameCell = await erListCell(page, row, 'ชื่อ-สกุล');
        const actionCell = await erListCell(page, row, 'จัดการ');
        await expect(nameCell).toContainText('AUTO');
        const [nameBox, buttonBox] = [await nameCell.boundingBox(), await dischargeButton.boundingBox()];
        expect(nameBox && buttonBox, 'อ่านตำแหน่งชื่อผู้ป่วยและปุ่มได้').toBeTruthy();
        expect(buttonBox!.x, 'ปุ่ม จำหน่าย ต้องอยู่ถัดไปทางขวาของชื่อผู้ป่วย').toBeGreaterThanOrEqual(nameBox!.x + nameBox!.width - 1);
        expect(Math.abs(buttonBox!.y + buttonBox!.height / 2 - (nameBox!.y + nameBox!.height / 2)), 'ปุ่ม จำหน่าย ต้องอยู่แถวเดียวกับชื่อผู้ป่วย').toBeLessThan(nameBox!.height / 2 + 1);
        const besideName = (await erDischargeButton(nameCell).count()) > 0;
        const inActions = (await erDischargeButton(actionCell).count()) > 0;
        expect(besideName || inActions, 'ปุ่ม จำหน่าย ต้องอยู่ในช่อง ชื่อ-สกุล หรือคอลัมน์ จัดการ ของแถวผู้ป่วย').toBe(true);
        note(
          besideName
            ? 'ปุ่ม จำหน่าย อยู่ในช่อง ชื่อ-สกุล ต่อท้ายชื่อผู้ป่วย'
            : 'ปุ่ม จำหน่าย อยู่ในคอลัมน์ "จัดการ" (คอลัมน์สุดท้าย ตรึงขวา) ท้ายแถวของผู้ป่วย ไม่ได้อยู่ติดชื่อในช่อง ชื่อ-สกุล — เป็นตำแหน่งเดียวกับปุ่ม ตรวจเสร็จ ของรายการผู้ป่วยนอก (OPD) ซึ่งอยู่ในคอลัมน์ "จัดการ" เหมือนกัน (ดูจากโค้ดหน้าเว็บของ dev-x ไม่ได้เปิดจอ OPD เทียบ) · สเปก SBH-2396 เขียนว่า immediately after the patient\'s name',
        );
        await markEvidence(expected(nameCell), expected(dischargeButton));
        await holdForClip(page);
      });

      await checkStep(page, 'TC-002 (SBH-2452) ขั้น 2 กดปุ่ม จำหน่าย ท้ายชื่อผู้ป่วย A', async () => {
        const confirm = erDischargeConfirm(page);
        const confirmButton = confirm.getByRole('button', { name: 'จำหน่าย', exact: true });
        await checkStep(page, 'กดปุ่ม จำหน่าย ในแถว — ขึ้นกล่องยืนยันการจำหน่ายผู้ป่วยออกจาก ER', async () => {
          await markEvidence(clicked(dischargeButton));
          await holdForClip(page);
          await snapEvidence(page, 'ก่อนกด — ปุ่ม จำหน่าย ในแถวของผู้ป่วย A');
          await dischargeButton.click();
          await expect(confirm).toBeVisible();
          await expect(confirm).toContainText('ยืนยันการจำหน่ายผู้ป่วยออกจาก ER หรือไม่');
          await expect(confirm.getByRole('button', { name: 'ยกเลิก', exact: true })).toBeVisible();
          await markEvidence(alerted(confirm), clicked(confirmButton));
          await holdForClip(page, 2_000);
        });

        await checkStep(page, 'กด จำหน่าย ในกล่องยืนยัน — ผู้ป่วย A ออกจากแท็บ รอจำหน่าย', async () => {
          const discharged = graphqlMutation(page, 'DischargeEncounterStatus', 40_000);
          discharged.catch(() => undefined);
          await confirmButton.click();
          const res = await discharged;
          await expectOk(res, `จำหน่ายผู้ป่วยออกจาก ER ${visit.en}`);
          const body = (await res.json()) as { data?: { dischargeEncounterStatus?: { accepted?: boolean } }; errors?: unknown };
          expect(body.data?.dischargeEncounterStatus?.accepted, `ระบบต้องรับคำสั่งจำหน่าย: ${JSON.stringify(body).slice(0, 300)}`).toBe(true);
          const toast = page.getByText('ยืนยันการจำหน่ายผู้ป่วยออกจาก ER แล้ว');
          await expect(toast).toBeVisible();
          await markEvidence(alerted(toast));
          await snapEvidence(page, 'หลังกด — แจ้งเตือน ยืนยันการจำหน่ายผู้ป่วยออกจาก ER แล้ว');
          await expect(row, 'จำหน่ายแล้วแถวของผู้ป่วย A ต้องหายจากแท็บ รอจำหน่าย').toHaveCount(0);
          await expect(erListTabCount(page, 'waiting-for-discharge')).toHaveText('0');
          await expect(erListTabCount(page, 'discharged')).toHaveText('1');
          await markEvidence(expected(erListTab(page, 'waiting-for-discharge')), expected(erListTab(page, 'discharged')));
          await holdForClip(page);
        });
      });

      await checkStep(page, 'TC-002 (SBH-2452) ขั้น 3 เปิดแท็บ จำหน่าย — ผู้ป่วย A แสดงในแท็บ จำหน่าย', async () => {
        await openErListTab(page, 'discharged');
        await expect(row).toBeVisible();
        await expect(await erListCell(page, row, 'สถานะ')).toHaveText('จำหน่าย');
        await expect(dischargeButton, 'จำหน่ายแล้วต้องไม่มีปุ่ม จำหน่าย ให้กดซ้ำ').toHaveCount(0);
        expect(await tabsWithPatient(page), 'ผู้ป่วย A ต้องอยู่แท็บ จำหน่าย แท็บเดียว').toEqual(['จำหน่าย']);
        const state = await attachState('สถานะผู้ป่วย A จาก API หลังกดจำหน่าย');
        expect(state.patientStatus).toBe('discharged');
        expect(state.departedAt, 'ต้องมีเวลาจำหน่ายออกจาก ER').toBeTruthy();
        expect(state.visitClosed, 'จำหน่ายออกจาก ER แล้ว Visit ของโรงพยาบาลยังไม่ปิด').toBe(false);
        await markEvidence(clicked(erListTab(page, 'discharged')), expected(row));
        await holdForClip(page);
      });

      // ---------------- TC-003 ----------------
      await checkStep(page, 'TC-003 (SBH-2453) ขั้น 1 ปิด Visit ของผู้ป่วย A ที่หน้าการเงิน', async () => {
        const closed = await closeVisitAtCashier(page, visit.hn, visit.vn, async (close: Locator) => {
          await markEvidence(expected(main.getByText(visit.vn, { exact: true }).first()), clicked(close));
          await holdForClip(page);
          await snapEvidence(page, 'ก่อนกด — ปุ่ม ปิด Visit ที่หน้าการเงิน');
        });
        expect(closed.result, 'Visit ของผู้ป่วย A ต้องยังเปิดอยู่ก่อนกดปิดที่การเงิน').toBe('closed');
        if (closed.outstanding) note(`ปิด Visit ทั้งที่มียอดค้างชำระ ${closed.outstanding} (ระบบถามยืนยันแล้วปิดได้)`);
        const status = main.getByText(/สถานะ Visit:\s*เสร็จสิ้น/).first();
        await expect(status).toBeVisible();
        await markEvidence(expected(status), expected(main.getByRole('button', { name: 'ปลดล็อค' })));
        await holdForClip(page);
      });

      await checkStep(page, 'TC-003 (SBH-2453) ขั้น 2 เปิดหน้ารายการผู้ป่วย ER แล้วดูแท็บสถานะ — มีแท็บ เสร็จสิ้น', async () => {
        await gotoErPatientList(page);
        const tab = erListTab(page, 'finished');
        await expect(tab).toContainText('เสร็จสิ้น');
        expect((await readErListTabs(page)).map((item) => item.label)).toContain('เสร็จสิ้น');
        await markEvidence(expected(tab));
        await holdForClip(page);
      });

      await checkStep(page, 'TC-003 (SBH-2453) ขั้น 3 เปิดแท็บ เสร็จสิ้น — ผู้ป่วย A แสดงในแท็บ เสร็จสิ้น หลังถูกปิด Visit จากการเงิน', async () => {
        await filterErListByHn(page, visit.hn);
        await openErListTab(page, 'finished');
        await expect(row).toBeVisible();
        await expect(await erListCell(page, row, 'สถานะ')).toHaveText('เสร็จสิ้น');
        await expect(erListTabCount(page, 'finished')).toHaveText('1');
        expect(await tabsWithPatient(page), 'ปิด Visit แล้วผู้ป่วย A ต้องย้ายจากแท็บ จำหน่าย มาอยู่แท็บ เสร็จสิ้น แท็บเดียว').toEqual(['เสร็จสิ้น']);
        const state = await attachState('สถานะผู้ป่วย A จาก API หลังปิด Visit ที่การเงิน');
        expect(state.patientStatus).toBe('finished');
        expect(state.visitClosed).toBe(true);
        await markEvidence(filled(hnSearchBox(page)), clicked(erListTab(page, 'finished')), expected(row), expected(erListTab(page, 'discharged')));
        await holdForClip(page);
      });
    },
  );

  // ---------------------------------------------------------------------------------------------
  test(
    'ผู้ป่วย B มี Admit Request: Disposition + ลงนาม แล้วไม่แสดงในแท็บ รอจำหน่าย (Super_User)',
    { tag: ['@SBH-2391', '@SBH-2454'], annotation: [linear('SBH-2391'), linear('SBH-2448')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const arrivalDay = bangkokToday();
      let visit!: ErVisit;
      const readState = () => fetchErEncounterState(page, authorization(), visit.en, arrivalDay);

      await test.step('เตรียม (Pre-condition): ผู้ป่วย B = ผู้ป่วย AUTO ใหม่ เปิด Visit ER + Triage ESI 3 แล้วส่ง Admit Request (ไม่สร้าง AN ไม่เลือกเตียง)', async () => {
        visit = await openTriagedVisit(page, 'DispoB', 'ผู้ป่วย B');
        const request = await createAdmitRequest(page, 'ปวดท้อง ต้องนอนโรงพยาบาล (SBH-2391)');
        test.info().annotations.push({ type: 'Admit Request ของผู้ป่วย B', description: `Pre-diagnosis ${request.diagnosis} · หอผู้ป่วย ${request.ward} · จากแผนก ${request.fromDepartment}` });
        await expect.poll(async () => (await readState()).admitRequestStatus, { message: 'ส่ง Admit Request แล้ว API ต้องมีสถานะคำขอ Admit' }).toBeTruthy();
      });
      const row = erListRow(page, visit.en);

      // ---------------- TC-004 ----------------
      await checkStep(page, 'TC-004 (SBH-2454) ขั้น 1 เปิดผู้ป่วย B ที่มี Admit Request', async () => {
        await checkStep(page, 'หน้ารายการผู้ป่วย ER: ผู้ป่วย B อยู่แท็บ ผู้ป่วยรอเตียง เพราะมี Admit Request', async () => {
          const state = await readState();
          await test.info().attach('สถานะผู้ป่วย B จาก API ก่อนทำ Disposition', { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
          expect(state.patientStatus, 'ผู้ป่วยที่มี Admit Request อยู่สถานะ รอเตียง').toBe('bed_waiting');
          expect(state.an, 'ชุดนี้ไม่สร้าง AN').toBeNull();
          await openErPatientListFromMenu(page);
          await filterErListByHn(page, visit.hn);
          await openErListTab(page, 'bed-waiting');
          await expect(row).toBeVisible();
          await markEvidence(filled(hnSearchBox(page)), clicked(erListTab(page, 'bed-waiting')), expected(row));
          await holdForClip(page);
        });

        await checkStep(page, 'กดชื่อผู้ป่วย B เปิด Patient Chart', async () => {
          const name = (await erListCell(page, row, 'ชื่อ-สกุล')).locator('a').first();
          await markEvidence(clicked(name));
          await snapEvidence(page, 'ก่อนกด — ชื่อผู้ป่วย B ในแท็บ ผู้ป่วยรอเตียง');
          await name.click();
          await expectVisitHeader(page, visit);
          await markEvidence(...visitHeaderMarks(page, visit));
          await holdForClip(page);
        });
      });

      await checkStep(page, 'TC-004 (SBH-2454) ขั้น 2 Patient Chart แท็บด้านขวา Disposition ทำ Disposition แล้วกด Save', async () => {
        await disposeAndSign(page, readState, 'bed_waiting');
      });

      await checkStep(page, 'TC-004 (SBH-2454) ขั้น 3 เปิดหน้ารายการผู้ป่วย ER แล้วเปิดแท็บ รอจำหน่าย — ผู้ป่วย B ไม่แสดงในแท็บ รอจำหน่าย', async () => {
        const state = await readState();
        await test.info().attach('สถานะผู้ป่วย B จาก API หลังลงนาม Disposition', { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
        expect(state.patientStatus, 'มี Admit Request ลงนาม Disposition แล้วต้องยังเป็น รอเตียง ไม่ใช่ รอจำหน่าย').toBe('bed_waiting');
        expect(state.canDischargeFromEr, 'ผู้ป่วยที่มี Admit Request ต้องกดจำหน่ายออกจาก ER ไม่ได้').toBe(false);

        await openErPatientListFromMenu(page);
        await filterErListByHn(page, visit.hn);
        // รอให้รายการโหลดและกรองเสร็จก่อน (เห็นผู้ป่วย B ในแท็บ ผู้ป่วยรอเตียง) แล้วค่อยสรุปว่าแท็บ รอจำหน่าย ไม่มี
        await expect(erListTabCount(page, 'bed-waiting')).toHaveText('1');
        await expect(erListTabCount(page, 'waiting-for-discharge')).toHaveText('0');

        await checkStep(page, 'แท็บ รอจำหน่าย ไม่มีผู้ป่วย B', async () => {
          await openErListTab(page, 'waiting-for-discharge');
          await expect(erListEmpty(page)).toBeVisible();
          await expect(row).toHaveCount(0);
          await markEvidence(filled(hnSearchBox(page)), clicked(erListTab(page, 'waiting-for-discharge')), expected(erListEmpty(page)));
          await holdForClip(page);
        });

        await checkStep(page, 'ผู้ป่วย B ยังอยู่แท็บ ผู้ป่วยรอเตียง และไม่มีปุ่ม จำหน่าย', async () => {
          await openErListTab(page, 'bed-waiting');
          await expect(row).toBeVisible();
          await expect(erDischargeButton(row)).toHaveCount(0);
          expect(await tabsWithPatient(page), 'ผู้ป่วย B ต้องอยู่แท็บ ผู้ป่วยรอเตียง แท็บเดียว').toEqual(['ผู้ป่วยรอเตียง']);
          await markEvidence(clicked(erListTab(page, 'bed-waiting')), expected(row), expected(erListTab(page, 'waiting-for-discharge')));
          await holdForClip(page);
        });
      });
    },
  );
});
