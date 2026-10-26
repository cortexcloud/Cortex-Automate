import type { Browser, Locator, Page } from '@playwright/test';
import { trackAuthorization } from '../helpers/functions/er-report';
import { BizSim, firstLine, type StepCtx } from './bizsim';
import {
  BUGS,
  OPD,
  appointmentHistoryRow,
  cashierQueueHas,
  chargeItems,
  checkInImaging,
  amountDue,
  closeCoverageWithEndpoint,
  closeResultTabs,
  createInvoicesOnly,
  closeVisitWithCoverages,
  confirmImagingAppointment,
  createAppointment,
  createAppointmentWithFutureOrders,
  createPrescriptionAt,
  dispensePrescription,
  dischargeAndPrintQueues,
  futureOrderRows,
  imagingTaskAction,
  labWorklistStatus,
  openNurseWindow,
  saveDischarge,
  saveImagingResult,
  openEmrFromOpdList,
  openVisitFromAppointment,
  orderHomeMed,
  orderTodayInvestigation,
  pharmacyTabsWithPatient,
  saveDoctorFee,
  CONSULT_DOCTOR,
  answerConsultFromList,
  consultListRow,
  gotoEmr,
  readConsultAnswer,
  payAllInCash,
  printAppointmentSlip,
  registerBizSimPatient,
  saveOpdNote,
  savePreAssessment,
  setVisitStatus,
  viewResult,
  addSelectedDrug,
  answerOrderAlert,
  createFormMenu,
  createNedDocument,
  deleteCartRows,
  drugBadge,
  duePaForms,
  openCpoe,
  recordAllergyOpd,
  requestDue,
  selectDrug,
  signOrders,
  addStatDrug,
  addProcedure,
  openProcedurePanel,
  procedureButton,
  recordProcedure,
  openEmar,
  planRefill,
  printRefillAtDischarge,
  createCertificateFromPanel,
  createCertificateFromDocuments,
  certificateRows,
  viewDocument,
  gotoPatientNoVisit,
  openWalkInVisit,
  type Appointment,
  type PrintCapture,
} from './bizsim-opd';
import { fetchActivityTasks } from '../helpers/functions/opd-activity';

import { scheduleWalkInRequest } from './uat-er';
import { finishVideo } from '../helpers/functions/fixtures';
import { capturePrintJobs, openRoleWindow } from '../helpers/functions/print-capture';
import { expected, markEvidence, snapEvidence } from '../helpers/functions/evidence';
import { requestConsult } from './uat-play';
import { expect, test } from './fixtures';
import type { NewPatient } from '../helpers/functions/test-data';
import { SYSTEM, recordMockPatient } from './uat-er';

// เล่น Scenario ของชีต "Scenario-OPD BizSim" (ไฟล์ E2E/New file Test case OPD #2.xlsx) — 1 เทส = 1 Case_id · ขั้นที่พังไม่หยุดเทส (soft)
// ผู้ใช้สั่ง 22 ต.ค. 2026: รันบน SBH (Prod) · ผู้ป่วย AUTO ใหม่ทุก Scenario (ชื่อ UAT BIZSIM-<case>-<ลำดับ>) + เล่นจนปิด Visit · สคริปต์สร้างนัดวันนี้ให้เอง
// รัน (ทีละ Scenario · เปิดจอ):
//   npx playwright test -c playwright.sbh-prod.config.ts BizSim-OPD --headed --grep "@APM-OPD-001" --project=chrome --no-deps --output=.cache/run-bizsim
//   (ต้องมี session ของ Super_User: ถ้าหมดอายุ รัน `npx playwright test -c playwright.sbh-prod.config.ts --project=setup -g Super_User` ก่อน · บัญชี Nurse ล็อกอินเองในหน้าต่างแยก)
// ผลรัน + หลักฐาน: clips/BizSim <ระบบ> <วันที่>/<Case_id>.json + ภาพ / คลิป → ลง Excel: node mock-data/bizsim-log.mjs (ดูก่อน) แล้ว --write

/** แจ้งเตือนมุมขวาบนที่มีข้อความนี้ (ใช้ตีกรอบตอน Fail) */
const notice = (page: Page, text: RegExp) => page.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: text });

/** ขั้น "พยาบาล Discharge และปริ้นบัตรคิว" (บัญชี Nurse หน้าต่างแยก): จำหน่าย + พิมพ์บัตรคิวการเงิน / ห้องยา → บันทึก Discharge → พิมพ์ใบนัด FU ที่ประวัติการนัดหมาย */
async function dischargeStep(run: BizSim, browser: Browser, hn: string, followUp: Appointment | undefined, opts: { noPharmacy?: boolean } = {}) {
  let nurseWin: { nurse: Page; print: PrintCapture } | undefined;
  await run.step('พยาบาล Discharge และปริ้นบัตรคิว', async (s) => {
    nurseWin = await openNurseWindow(browser);
    const { nurse, print } = nurseWin;
    s.shotsOn(nurse);
    await s.point('จำหน่าย + พิมพ์บัตรคิว');
    const { queues, grid } = await dischargeAndPrintQueues(nurse, print, hn);
    for (const q of queues) s.note(`พิมพ์คิว [${q.row}] → ${q.ticket ? q.ticket.slice(0, 70) : 'ไม่มีงานพิมพ์'}`);
    const printed = queues.filter((q) => q.ticket);
    if (!queues.length) {
      // ตารางการจัดการหลังตรวจไม่มีบัตรคิวเลย (APM-OPD-005 ไม่มียา: ไม่มีทั้งคิวห้องยาและคิวการเงิน) = ไม่มีคิวการเงินให้พิมพ์
      await s.bug(BUGS.cashierQueue, 'การจัดการหลังตรวจไม่มีบัตรคิวให้พิมพ์เลย (ไม่มีคิวการเงิน)', { target: grid });
      s.unverifiable(BUGS.queueTemplate, 'ไม่มีแถวคิวห้องยาให้พิมพ์');
    } else if (printed.length === queues.length) s.fixed(BUGS.queueTemplate, `พิมพ์บัตรคิวได้ครบ ${printed.length} ใบ`);
    else await s.bug(BUGS.queueTemplate, `พิมพ์บัตรคิวได้ ${printed.length} / ${queues.length} ใบ`, { target: grid });
    const nuh = queues.find((q) => /\bNUH\b/.test(`${q.row} ${q.ticket}`));
    if (nuh) await s.bug(BUGS.cashierQueue, `ชื่อคิวการเงินยังเป็น NUH (แถว "${nuh.row}" · บัตร "${nuh.ticket.slice(0, 40)}")`, { target: grid.getByText('NUH', { exact: true }) });
    // ผู้ป่วยไม่มียา (APM-OPD-005): ระบบต้องไม่ออกบัตรคิวห้องยา
    if (opts.noPharmacy) {
      const pharmacy = queues.find((q) => /ยากลาง|ห้องยา/.test(`${q.row} ${q.ticket}`));
      if (pharmacy) await s.bug(BUGS.pharmacyQueueNoRx, `ไม่ได้สั่งยา แต่การจัดการหลังตรวจมีบัตรคิวห้องยา (แถว "${pharmacy.row}" · บัตร "${pharmacy.ticket.slice(0, 50)}")`, { target: grid });
      else s.note(`ไม่มีบัตรคิวห้องยา${queues.length ? ` (มีเฉพาะ: ${queues.map((q) => q.row).join(', ')})` : ''}`);
    }
    await s.point('บันทึก Discharge');
    const saved = await saveDischarge(nurse);
    if (saved.falseError) await s.bug(BUGS.dischargeFalseError, `บันทึกแล้ว statusCode COMPLETE แต่แจ้งเตือน "${saved.falseError}"`, { target: saved.notice });
    s.note(`Discharge COMPLETE (dischargeTypeCode ${saved.dischargeTypeCode} = With Approval)`);
    s.provide('discharged');
    // ปริ้นท์บัตรนัดที่เมนู ประวัติการนัดหมาย
    if (followUp) {
      await s.point('พิมพ์ใบนัด (ประวัติการนัดหมาย)');
      const row = await appointmentHistoryRow(nurse, followUp.start);
      const slip = await printAppointmentSlip(nurse, row, 'TH', print);
      if (slip.error) {
        await s.bug(BUGS.apptSlip404, `ประวัติการนัดหมาย → พิมพ์ใบนัด (TH) ไม่ได้ (${slip.error}) — แจ้งเตือน "ไม่สามารถพิมพ์บัตรนัดหมายได้"`, { target: notice(nurse, /บัตรนัด/) });
        s.unverifiable(BUGS.apptSlipProcedure, 'พิมพ์ใบนัดไม่ได้ จึงตรวจหมวดรายการในใบนัดไม่ได้');
      } else s.note(`พิมพ์ใบนัด (TH) ได้: ${slip.text?.slice(0, 80)}`);
    }
  }, { needs: ['examined'] });
  const win = nurseWin as { nurse: Page } | undefined;
  if (win) {
    await finishVideo(win.nurse); // คลิปหน้าต่างพยาบาล (video-Nurse + คลิปของจุดตรวจ)
    await win.nurse.context().close();
  }
}

const chargeTable = (page: Page) => page.getByRole('main').getByRole('table').filter({ hasText: 'รหัส - ชื่อ' }).last();

/**
 * ขั้นการเงิน: คิวการเงิน (บั๊กเดิม No.7) → รายการค่าใช้จ่าย → `check` ตรวจรายการที่ Scenario ต้องมี (คืนข้อความ = ไม่ผ่าน) → ปิดสิทธิ End Point → ใบแจ้งหนี้ + ชำระ
 * ลำดับเดียวกับที่เคยรันผ่านบน Prod (UAT ORDER-03): ปิดสิทธิก่อน แล้วสร้างใบแจ้งหนี้ · ยอด 0 (สิทธิครอบคลุม) = สร้างใบแจ้งหนี้อย่างเดียว
 */
async function paymentStep(
  run: BizSim,
  page: Page,
  f: Record<string, string>,
  title: string,
  check?: (s: StepCtx, has: (code: string) => boolean, items: string[]) => Promise<string | undefined>,
  needs = ['discharged'],
) {
  await run.step(title, async (s) => {
    await s.point('คิวการเงิน');
    const inQueue = await cashierQueueHas(page, f.hn);
    if (inQueue) s.fixed(BUGS.cashierQueue, 'ผู้ป่วยขึ้นคิวที่หน้าคิวการเงิน');
    else await s.bug(BUGS.cashierQueue, 'หน้าคิวการเงิน (การเงินชั้น 1) ไม่มีรายการผู้ป่วยรายนี้ — เปิดบัญชีด้วยการค้น HN แทน', { target: page.getByRole('main').getByRole('table').first() });
    await s.point('รายการค่าใช้จ่าย + ปิดสิทธิ + ชำระเงิน');
    const items = (await chargeItems(page, f.hn, f.vn)).filter((i) => !/^Encounter /.test(i));
    s.note(`รายการค่าใช้จ่าย ${items.length} รายการ${items.length ? `: ${items.map((i) => i.slice(0, 60)).join(' | ')}` : ''}`);
    const has = (code: string) => items.some((i) => i.includes(code));
    const problems = [await check?.(s, has, items)];
    if (!items.length) s.block('ไม่มีรายการค่าใช้จ่ายให้สร้างใบแจ้งหนี้ / ปิดสิทธิ');
    // ปิดสิทธิ End Point: รายการที่ UC เบิกไม่ได้ทั้งหมด (เช่น ค่าตรวจแพทย์ — APM-OPD-005) ปุ่มยืนยันกดไม่ได้ → จด แล้วไปชำระเงินต่อ
    const ep = await closeCoverageWithEndpoint(page, { cardType: '60' }).catch(async (e: Error) => {
      await page.keyboard.press('Escape');
      problems.push(`ปิดสิทธิ UC ผ่าน End Point ไม่ได้ — ${firstLine(e)}`);
      return undefined;
    });
    if (ep) s.note(`ปิดสิทธิ UC ด้วย End Point ${ep.endPoint} (Terminal ID ${ep.terminalId} · Trace ${ep.trace})`);
    else s.note(problems.at(-1)!);
    if ((await amountDue(page)) > 0) {
      const paid = await payAllInCash(page);
      f.receipt = paid.receiptId;
      s.note(`สร้างใบแจ้งหนี้ + ชำระเงินสด ${paid.amount.toFixed(2)} (${paid.invoiceId} · ${paid.receiptId})`);
    } else s.note(`ยอดต้องชำระ 0.00 (สิทธิ UC ครอบคลุม) → สร้างใบแจ้งหนี้ ${await createInvoicesOnly(page)} ไม่ต้องรับเงิน`);
    s.provide('paid');
    const failed = problems.filter(Boolean);
    if (failed.length) throw new Error(failed.join(' · '));
  }, { needs });
}

/** ขั้นห้องยา: สร้างใบยา (บั๊ก No.53) → ชำระค่ายา → จัดยา / ยืนยันรอจ่าย / เรียกคิว / จ่ายยา */
async function pharmacyStep(run: BizSim, page: Page, f: Record<string, string>, title: string, code = OPD.homeMed.code, needs = ['order']) {
  await run.step(title, async (s) => {
    await s.point('สร้างใบยา');
    const rx = await createPrescriptionAt(page, f.hn, code);
    if (rx.allergyAck) s.note(`หน้าต่างห้องยา: ${rx.allergyAck.slice(0, 160)} → กด รับทราบและสร้างใบยา`);
    if (rx.error) {
      await rxCreateBug(s, rx, code);
      return;
    }
    f.rx = rx.prescriptionId!;
    s.note(`ใบยา ${f.rx}`);
    s.provide('rx');
    await s.point('ชำระค่ายา');
    await chargeItems(page, f.hn, f.vn);
    const paid = await payAllInCash(page);
    s.note(`ชำระค่ายา ${paid.amount.toFixed(2)} (${paid.receiptId})`);
    await s.point('จัดยา + เรียกคิว + จ่ายยา');
    for (const n of await dispensePrescription(page, f.hn, f.rx)) s.note(n);
    s.note('จ่ายยาแล้ว (อยู่แท็บ จ่ายยาแล้ว)');
    s.provide('dispensed');
  }, { needs });
}

/** สร้างใบยาไม่ได้: 400 คลังยา (23 ต.ค. 2026 เป็นต้นไป) = บั๊กใหม่ rxWarehouse · อย่างอื่น = บั๊กเดิม No.53 */
async function rxCreateBug(s: StepCtx, rx: { error?: string; notice?: Locator }, code: string) {
  const def = /warehouse is not allowed/.test(rx.error ?? '') ? BUGS.rxWarehouse : BUGS.rxCreate500;
  await s.bug(def, `กด "สร้างใบยา" (${code} ${OPD.pharmacy.name}) ได้ ${rx.error} — หน้าจอขึ้น "เกิดข้อผิดพลาดในระบบ"`, { target: rx.notice });
}

/** ขั้นพยาบาลคัดกรอง + แพทย์เรียกคิว + OPD Note (APM-OPD-003 / 004) */
async function screenExamStep(run: BizSim, page: Page, f: Record<string, string>, familyName: string, title: string, after?: (s: StepCtx) => Promise<void>) {
  await run.step(title, async (s) => {
    await openEmrFromOpdList(page, f.hn, familyName);
    await savePreAssessment(page);
    s.note('บันทึกฟอร์มคัดกรอง (V/S 120/80 · PR 78 · RR 18 · BT 36.8 · SpO2 98 · Pain 2 · ESI 5)');
    await s.point('เรียกคิว + OPD Note');
    await setVisitStatus(page, 'พร้อมตรวจ');
    const note = await saveOpdNote(page);
    s.note(`เรียกคิว (พร้อมตรวจ) · Dx ${note.dx} · บันทึกใช้ ${note.seconds.toFixed(1)} วินาที`);
    if (note.seconds > 10) await s.bug(BUGS.opdNoteSlow, `บันทึก OPD Note ใช้ ${note.seconds.toFixed(1)} วินาที`);
    else s.fixed(BUGS.opdNoteSlow, `บันทึก OPD Note สำเร็จใน ${note.seconds.toFixed(1)} วินาที`);
    s.provide('note');
    await after?.(s);
  }, { needs: ['visit'] });
}

/** แพทย์สั่ง Lab / IMG ประเภทวันนี้ 1 รายการ (บั๊ก No.55) → flag เมื่อส่งคำสั่งสำเร็จ */
async function orderInvestigationPart(s: StepCtx, page: Page, item: { code: string; name: string }, flag: string) {
  const order = await orderTodayInvestigation(page, item.code);
  s.note(`${item.code} ${item.name} · ประเภท วันนี้ · ช่องวันที่ต้องการผล ${order.dueDisabled ? 'เลือกไม่ได้' : 'ยังเลือกได้'}`);
  if (order.error) {
    await s.bug(BUGS.labImgOrderFail, `${item.code}: กดเพิ่มลงตะกร้าแล้ว ${order.error} — หน้าจอขึ้นแค่ "เกิดข้อผิดพลาดในระบบ" ฟอร์มค้าง ตะกร้าว่าง`, { target: order.target });
    return;
  }
  s.note(`${item.code}: เพิ่มลงตะกร้า + ส่งคำสั่ง (Sign) แล้ว`);
  s.provide(flag);
  if (!order.dueDisabled) throw new Error(`${item.code}: เลือกประเภทวันนี้แล้ว ช่องวันที่ต้องการผลยังเลือกได้`);
}

/** ขั้นห้อง Lab / Img ของ Order วันนี้: IMG เช็คอิน → ถ่ายภาพ → บันทึกผล (บั๊ก No.54) · Lab ยังไม่รองรับ (ยังไม่เคยเห็นงาน Lab บน Prod) */
async function labImgRoomStep(run: BizSim, page: Page, f: Record<string, string>, title: string) {
  await run.step(title, async (s) => {
    if (!run.has('labOrdered') && !run.has('imgOrdered')) s.block('ไม่มี Order Lab / IMG ที่ส่งสำเร็จ — ต่อเนื่องจากขั้นแพทย์สั่ง Lab / IMG');
    let failed = false;
    const incomplete: string[] = [];
    if (run.has('imgOrdered')) {
      await s.point('ห้องรังสี: Check-in');
      // Order วันนี้ควรเข้า รอ Check-in เลย · ถ้าเป็นคำขอนัดให้ห้องรังสียืนยันก่อน
      const checkIn = await checkInImaging(page, f.hn).catch(async () => {
        await confirmImagingAppointment(page, f.hn);
        return checkInImaging(page, f.hn);
      });
      s.note(`IMG: เช็คอิน คิว ${checkIn.queue}`);
      await s.point('ห้องรังสี: ถ่ายภาพ + บันทึกผล');
      await imagingTaskAction(page, f.hn, 'IN_PROGRESS', 'เริ่มถ่ายภาพ');
      await imagingTaskAction(page, f.hn, 'PERFORMING', 'ถ่ายภาพแล้ว');
      const result = await saveImagingResult(page, f.hn);
      if (result.error) {
        failed = true;
        await s.bug(BUGS.imgResult500, `กดบันทึก "รายงานผลตรวจทางรังสี" ได้ ${result.error} — แจ้งเตือน "เกิดข้อผิดพลาดในระบบ" งานค้างแท็บ รออ่านผล`, { target: result.notice });
      } else {
        s.note(`IMG: บันทึกผลแล้ว · ${result.status}`);
        s.provide('imgResult');
      }
    } else incomplete.push('IMG ไม่มี Order');
    if (run.has('labOrdered')) incomplete.push('Lab: สคริปต์ยังไม่รองรับขั้นเช็คอิน / เก็บ Specimen / ลงผล (ยังไม่เคยเห็นหน้าจอบน Prod)');
    else incomplete.push('Lab ไม่มี Order');
    if (incomplete.length && !failed) s.block(incomplete.join(' · '));
  }, { needs: ['visit'] });
}

/** ขั้น "เปิด Visit ตามนัด" ส่วนที่เหมือนกันทุก Scenario: เปิด Visit จากนัดของวันนี้ + ตรวจปุ่มพิมพ์ใบนำทาง (บั๊กเดิม No.9) */
async function openVisitPart(s: StepCtx, page: Page, f: Record<string, string>, print: PrintCapture) {
  const visit = await openVisitFromAppointment(page, f.hn, print);
  Object.assign(f, { vn: visit.vn, en: visit.en, queue: visit.queue });
  s.note(`${visit.vn} / ${visit.en} · คิวห้องตรวจ ${visit.queue} · ผูกนัด ${visit.appointmentId ? 'ใช่' : 'ไม่'}`);
  expect(visit.queue, 'ต้องได้เลขคิวห้องตรวจ').not.toBe('');
  s.provide('visit');
  if (visit.slipApi === 'visit-slip') {
    s.note(`พิมพ์ใบนำทาง: ${visit.slipText.slice(0, 80)}`);
    s.fixed(BUGS.visitSlip, 'ปุ่มพิมพ์ใบนำทางพิมพ์ใบนำทางจุดบริการ (visit-slip/print)');
  } else {
    const what = visit.slipApi === 'queues' ? `ได้บัตรคิว (POST /cortex-api/queues/print) "${visit.slipText.slice(0, 60)}" ไม่ใช่ใบนำทางจุดบริการ` : 'ไม่มีปุ่ม / กดแล้วไม่พิมพ์';
    await s.bug(BUGS.visitSlip, `กดปุ่ม "พิมพ์ใบนำทาง" หลังสร้าง Visit → ${what} (flag reception.visit-slip.print = ${visit.visitSlipEnabled ? 'เปิด' : 'ปิด'})`, { target: visit.slipButton });
  }
}

test(`APM-OPD-001 คนไข้มีนัดเข้ารับบริการปกติ (พบแพทย์ > ทำนัด FU > การเงิน > รับยา > กลับบ้าน) (${SYSTEM})`, { tag: '@APM-OPD-001' }, async ({ page, browser }) => {
  test.setTimeout(45 * 60_000);
  const run = new BizSim('APM-OPD-001', 'คนไข้มีนัดเข้ารับบริการปกติ (พบแพทย์ > ทำนัด FU > การเงิน > รับยา > กลับบ้าน)', page);
  const authorization = trackAuthorization(page);
  const f = run.facts;
  let familyName = '';
  let registered: NewPatient | undefined;
  let followUp: Appointment | undefined;
  // ดักงานพิมพ์ของหน้าหลัก (แทน print agent ที่เครื่องเทสไม่มี) + ใช้อ่านเอกสารที่พิมพ์
  const mainPrint = await capturePrintJobs(page);
  try {
    await page.goto('/cortex/apps');
    await expect(page.getByLabel('เวชระเบียน')).toBeVisible({ timeout: 180_000 });

    // ---------- Pre-condition: ผู้ป่วยใหม่ + นัดหมายของวันนี้ (ไม่มีแถวในชีต) ----------
    await run.step('ลงทะเบียนผู้ป่วยใหม่ที่เวชระเบียน', async (s) => {
      const { patient, hn } = await registerBizSimPatient(page, authorization(), run.caseId);
      familyName = patient.familyName;
      registered = patient;
      Object.assign(f, { name: `${patient.firstName} ${patient.familyName}`, hn });
      s.note(`HN ${hn} ${f.name}`);
      s.provide('patient');
    }, { pre: true });

    await run.step(`สร้างนัดหมายวันนี้ (${OPD.clinic} · ดร. วิชัย)`, async (s) => {
      const appt = await createAppointment(page, { date: 'today' });
      f.appointmentToday = appt.start;
      s.note(`นัด ${new Date(appt.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      if (appt.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัดแล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${appt.slipError}) — แจ้งเตือน "ไม่สามารถพิมพ์บัตรนัดหมายได้"`, { target: notice(page, /บัตรนัด/) });
      s.provide('appointment');
    }, { pre: true, needs: ['patient'] });

    // ---------- ขั้นในชีต ----------
    await run.step('เปิด Visit ตามนัดหมาย', (s) => openVisitPart(s, page, f, mainPrint), { needs: ['appointment'] });

    await run.step('พยาบาลคัดกรองก่อนพบแพทย์', async (s) => {
      await openEmrFromOpdList(page, f.hn, familyName);
      await savePreAssessment(page);
      s.note('บันทึกฟอร์มคัดกรอง (V/S 120/80 · PR 78 · RR 18 · BT 36.8 · SpO2 98 · Pain 2 · ESI 5) → ค่าขึ้น Patient Banner');
      s.provide('screened');
    }, { needs: ['visit'] });

    await run.step('แพทย์เรียกคิวและลง OPD Note', async (s) => {
      await setVisitStatus(page, 'พร้อมตรวจ');
      await s.point('ลง OPD Note + Diagnosis');
      const note = await saveOpdNote(page);
      s.note(`สถานะ พร้อมตรวจ · Dx ${note.dx} · บันทึกใช้ ${note.seconds.toFixed(1)} วินาที`);
      if (note.seconds > 10) await s.bug(BUGS.opdNoteSlow, `บันทึก OPD Note ใช้ ${note.seconds.toFixed(1)} วินาที`);
      else s.fixed(BUGS.opdNoteSlow, `บันทึก OPD Note สำเร็จใน ${note.seconds.toFixed(1)} วินาที`);
      s.provide('note');
    }, { needs: ['visit'] });

    await run.step('แพทย์สั่งยากลับบ้าน (Home med)', async (s) => {
      await orderHomeMed(page);
      s.note(`${OPD.homeMed.code} ${OPD.homeMed.name} × ${OPD.homeMed.qty} (Home med) · ส่งคำสั่งแล้ว`);
      s.provide('order');
    }, { needs: ['visit'] });

    await run.step('แพทย์ทำนัดหมาย FU และกดตรวจเสร็จ', async (s) => {
      await s.point('สร้างนัด FU');
      followUp = await createAppointment(page);
      f.followUp = followUp.start;
      if (followUp.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัด FU แล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${followUp.slipError})`, { target: notice(page, /บัตรนัด/) });
      await s.point('ประวัติการนัดหมาย + ตรวจเสร็จ');
      // ตรวจประวัติการนัดหมายไม่ผ่าน → ยังกดตรวจเสร็จต่อ (ขั้นถัดไปไม่ต้อง Block เพราะเรื่องนี้) แล้วค่อยให้ขั้นนี้ Fail
      const history = await appointmentHistoryRow(page, followUp.start).then(
        async (row) => `นัด FU ${(await row.innerText()).replace(/\s+/g, ' ').slice(0, 90)}`,
        (e: Error) => e,
      );
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
      if (history instanceof Error) throw history;
      s.note(history);
    }, { needs: ['visit'] });

    await dischargeStep(run, browser, f.hn, followUp);

    await run.step('ห้องยาสร้างใบยาก่อนชำระเงิน', async (s) => {
      const rx = await createPrescriptionAt(page, f.hn);
      if (rx.error) {
        await s.bug(BUGS.rxCreate500, `กด "สร้างใบยา" (${OPD.homeMed.code} ${OPD.pharmacy.name}) ได้ ${rx.error} — หน้าจอขึ้น "เกิดข้อผิดพลาดในระบบ"`, { target: rx.notice });
        return;
      }
      f.rx = rx.prescriptionId!;
      s.note(`ใบยา ${f.rx}`);
      s.provide('rx');
    }, { needs: ['order'] });

    await run.step('คนไข้ชำระเงินที่การเงิน', async (s) => {
      await s.point('คิวการเงิน');
      const inQueue = await cashierQueueHas(page, f.hn);
      if (inQueue) s.fixed(BUGS.cashierQueue, 'ผู้ป่วยขึ้นคิวที่หน้าคิวการเงิน');
      else await s.bug(BUGS.cashierQueue, 'หน้าคิวการเงิน (การเงินชั้น 1) ไม่มีรายการผู้ป่วยรายนี้ — เปิดบัญชีด้วยการค้น HN แทน', { target: page.getByRole('main').getByRole('table').first() });
      await s.point('บัญชีการเงิน + ชำระเงิน');
      const items = await chargeItems(page, f.hn, f.vn);
      s.note(`รายการค่าใช้จ่าย ${items.length} รายการ${items.length ? `: ${items.map((i) => i.slice(0, 50)).join(' | ')}` : ''}`);
      // ยอด 0 = หน้าต่างปิดสิทธิ UC กดยืนยันไม่ได้ / ไม่มีใบแจ้งหนี้ให้สร้าง
      if (!items.length) s.block('ไม่มีรายการค่าใช้จ่ายให้สร้างใบแจ้งหนี้ / ปิดสิทธิ (ใบยายังไม่ถูกสร้าง)');
      const ep = await closeCoverageWithEndpoint(page, { cardType: '60' });
      s.note(`ปิดสิทธิ UC ด้วย End Point ${ep.endPoint} (Terminal ID ${ep.terminalId} · Trace ${ep.trace})`);
      const paid = await payAllInCash(page);
      f.receipt = paid.receiptId;
      s.note(`ชำระเงินสด ${paid.amount.toFixed(2)} (${paid.invoiceId} · ${paid.receiptId})`);
      s.provide('paid');
    }, { needs: ['discharged'] });

    await run.step('ห้องยาจัดยา เรียกคิว และจ่ายยา', async (s) => {
      const notes = await dispensePrescription(page, f.hn, f.rx);
      for (const n of notes) s.note(n);
      s.note('จ่ายยาแล้ว (อยู่แท็บ จ่ายยาแล้ว)');
    }, { needs: ['rx', 'paid'] });

    // ---------- ท้าย Scenario: ปิด Visit ที่การเงิน (ผู้ใช้สั่ง "เล่นจนปิด Visit") ----------
    await run.step('ปิด Visit ที่การเงิน', async (s) => {
      const coverages = await closeVisitWithCoverages(page, f.hn, f.vn);
      s.note(`ปิด Visit แล้ว${coverages.length ? ` (ปิดสิทธิที่ค้าง: ${coverages.join(', ')})` : ''}`);
    }, { pre: true, needs: ['visit'] });
  } finally {
    const file = await run.save();
    console.log(`  ผลรัน: ${file}`);
    // ขั้นที่ไม่ผ่านไม่หยุดเทส แต่ให้รายงานขึ้นไม่ผ่าน (ดูรายการขั้นได้ใน error)
    expect.soft(run.steps.filter((st) => st.status === 'Fail' || st.status === 'Block').map((st) => `[${st.status}] ${st.title}`), 'ขั้นที่ไม่ผ่าน').toEqual([]);
    if (f.hn && registered) recordMockPatient('BIZSIM', registered, { hn: f.hn, vn: f.vn, en: f.en }, `${run.caseId} · ${run.steps.map((st) => `${st.title}=${st.status}`).join(' · ')}`);
  }
});

// APM-OPD-002 · Order LAB / IMG "ก่อนพบแพทย์" = Order ล่วงหน้า (Order สำหรับนัดหมาย) — ผู้ใช้เลือก 22 ต.ค. 2026 (LAB0000001 + IMG0000194 · ลงผลเองใน Cortex)
// Pre-condition: Visit ครั้งก่อน (นัด + เปิด Visit) → แพทย์ทำนัดวันนี้ช่วงถัดไปพร้อม Order ล่วงหน้า → ปิด Visit ครั้งก่อน → ขั้นในชีตเริ่มที่เปิด Visit ตามนัดนั้น
// SBH Prod 22 ต.ค. 2026 (สำรวจ HN 6904461): IMG ล่วงหน้าเกิดงานหลังห้องรังสียืนยันนัด · Lab ล่วงหน้าไม่เกิดงาน (บั๊กเดิม No.10) → ผู้ใช้เลือก "IMG ล่วงหน้า + Lab ลง Fail"
test(`APM-OPD-002 คนไข้มีนัดเข้ารับบริการปกติ มีตรวจ LAB / IMG ก่อนพบแพทย์ (${SYSTEM})`, { tag: '@APM-OPD-002' }, async ({ page, browser }) => {
  test.setTimeout(60 * 60_000);
  const run = new BizSim('APM-OPD-002', 'คนไข้มีนัดเข้ารับบริการปกติ มีตรวจ LAB / IMG ก่อนพบแพทย์', page);
  const authorization = trackAuthorization(page);
  const f = run.facts;
  let familyName = '';
  let registered: NewPatient | undefined;
  let followUp: Appointment | undefined;
  const mainPrint = await capturePrintJobs(page);
  try {
    await page.goto('/cortex/apps');
    await expect(page.getByLabel('เวชระเบียน')).toBeVisible({ timeout: 180_000 });

    // ---------- Pre-condition (ไม่มีแถวในชีต) ----------
    await run.step('ลงทะเบียนผู้ป่วยใหม่ที่เวชระเบียน', async (s) => {
      const { patient, hn } = await registerBizSimPatient(page, authorization(), run.caseId);
      familyName = patient.familyName;
      registered = patient;
      Object.assign(f, { name: `${patient.firstName} ${patient.familyName}`, hn });
      s.note(`HN ${hn} ${f.name}`);
      s.provide('patient');
    }, { pre: true });

    await run.step('Visit ครั้งก่อน: นัดวันนี้ + เปิด Visit', async (s) => {
      const appt = await createAppointment(page, { date: 'today' });
      if (appt.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัดแล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${appt.slipError}) — แจ้งเตือน "ไม่สามารถพิมพ์บัตรนัดหมายได้"`, { target: notice(page, /บัตรนัด/) });
      const visit = await openVisitFromAppointment(page, f.hn, mainPrint);
      Object.assign(f, { prevVn: visit.vn, prevEn: visit.en });
      s.note(`นัด ${new Date(appt.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} · ${visit.vn} / ${visit.en}`);
      s.provide('prevVisit');
    }, { pre: true, needs: ['patient'] });

    await run.step(`Visit ครั้งก่อน: แพทย์ทำนัดวันนี้พร้อม Order ล่วงหน้า (${OPD.futureLab.code} + ${OPD.futureImg.code})`, async (s) => {
      await openEmrFromOpdList(page, f.hn, familyName);
      const appt = await createAppointmentWithFutureOrders(page);
      f.appointmentToday = appt.start;
      s.note(`นัด ${new Date(appt.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} + Order สำหรับนัดหมาย (Lab: นัด Lab Room · IMG: นัดห้องรังสี)`);
      if (appt.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัดพร้อม Order ล่วงหน้าแล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${appt.slipError})`, { target: notice(page, /บัตรนัด/) });
      await s.point('รายการ Order ล่วงหน้า');
      for (const row of await futureOrderRows(page)) s.note(`Order ล่วงหน้า: ${row.slice(0, 110)}`);
      s.provide('appointment');
    }, { pre: true, needs: ['prevVisit'] });

    await run.step('Visit ครั้งก่อน: ปิด Visit ที่การเงิน', async (s) => {
      const coverages = await closeVisitWithCoverages(page, f.hn, f.prevVn);
      s.note(`ปิด Visit ${f.prevVn}${coverages.length ? ` (ปิดสิทธิ: ${coverages.join(', ')})` : ''}`);
      s.provide('prevClosed');
    }, { pre: true, needs: ['prevVisit'] });

    // ---------- ขั้นในชีต ----------
    await run.step('เปิด Visit ตามนัด และ Check-in ห้อง Lab / Img', async (s) => {
      await s.point('เปิด Visit ตามนัด');
      await openVisitPart(s, page, f, mainPrint);
      await s.point('ห้องรังสี: คำขอนัด + Check-in');
      const request = await confirmImagingAppointment(page, f.hn);
      if (!request.requested) await s.bug(BUGS.xrayFromAppt, `ห้องรังสีแท็บคำขอนัดหมายไม่มีรายการ ${OPD.futureImg.code} ที่สั่งผ่านนัดหมาย`, { target: request.row });
      else {
        s.fixed(BUGS.xrayFromAppt, `${OPD.futureImg.code} ที่สั่งผ่านนัดหมายขึ้นแท็บคำขอนัดหมายของห้องรังสี (คำขอ ยังไม่ยืนยัน → ห้องรังสียืนยันนัด)`);
        const checkIn = await checkInImaging(page, f.hn).catch(async (e: Error) => {
          await s.bug(BUGS.imgApptCheckin, `ยืนยันนัดรังสีแล้ว แต่เช็คอินจากแท็บ รอ Check-in ไม่ได้: ${firstLine(e)}`);
          return undefined;
        });
        if (checkIn) {
          f.imgQueue = checkIn.queue;
          s.fixed(BUGS.imgApptCheckin, `หลังห้องรังสียืนยันนัด รายการไปอยู่แท็บ รอ Check-in → เช็คอินได้คิว ${checkIn.queue}`);
          s.note(`IMG: ยืนยันนัด → รอ Check-in → เช็คอิน คิว ${checkIn.queue} → Worklist แท็บ รอถ่ายภาพ`);
          s.provide('imgCheckedIn');
        }
      }
      await s.point('ห้อง Lab: นัดหมาย / รอเช็คอิน');
      const lab = await labWorklistStatus(page, f.hn);
      s.note(`Lab: แท็บนัดหมาย ${lab.appointment ? `"${lab.appointment}"` : 'ไม่มีรายการ'} · แท็บรอเช็คอิน ${lab.task ? 'มีรายการ' : 'ไม่มีรายการ'}`);
      if (lab.task) {
        s.fixed(BUGS.labApptStuck, 'นัด Lab ของ Order ล่วงหน้าขึ้นแท็บรอเช็คอินของห้อง Lab');
        s.provide('labTask');
      } else {
        await s.bug(
          BUGS.labApptStuck,
          `Order ล่วงหน้า ${OPD.futureLab.code}: ห้อง Lab แท็บนัดหมายมีนัด${lab.appointment ? ` (${lab.appointment.slice(-30)})` : ''} แต่แถวไม่มีปุ่มให้ทำต่อ และแท็บรอเช็คอินไม่มีรายการ — แผงเปิด Visit ก็ไม่แสดง Lab ให้เช็คอิน`,
          { target: lab.table },
        );
      }
    }, { needs: ['appointment', 'prevClosed'] });

    await run.step('ห้อง Lab / Img รับรายการและออกผล', async (s) => {
      let failed = false;
      const incomplete: string[] = [];
      if (run.has('imgCheckedIn')) {
        await s.point('ห้องรังสี: ถ่ายภาพ');
        const started = await imagingTaskAction(page, f.hn, 'IN_PROGRESS', 'เริ่มถ่ายภาพ');
        const performed = await imagingTaskAction(page, f.hn, 'PERFORMING', 'ถ่ายภาพแล้ว');
        s.note(`IMG: เริ่มถ่ายภาพ (${started}) → ถ่ายภาพแล้ว (${performed}) → แท็บรออ่านผล`);
        await s.point('ห้องรังสี: บันทึกผล');
        const result = await saveImagingResult(page, f.hn);
        if (result.error) {
          failed = true;
          await s.bug(BUGS.imgResult500, `กดบันทึก "รายงานผลตรวจทางรังสี" (Findings + Impression) ได้ ${result.error} — แจ้งเตือน "เกิดข้อผิดพลาดในระบบ" งานค้างแท็บ รออ่านผล`, { target: result.notice });
        } else {
          s.note(`IMG: บันทึกผลแล้ว · ${result.status}`);
          s.provide('imgResult');
        }
      } else incomplete.push('IMG ไม่ได้เช็คอิน');
      if (run.has('labTask')) incomplete.push('Lab: มีงานรอเช็คอินแล้ว แต่สคริปต์ยังไม่รองรับขั้นเก็บ Specimen / รับผล');
      else {
        s.note(`Lab: ไม่มีงาน Lab ให้เช็คอิน / เก็บ Specimen / พิมพ์ Sticker / Run Lab / รับผล — ต่อเนื่องจากบั๊กเดิม No.${BUGS.labApptStuck.known}`);
        s.unverifiable(BUGS.specimenSticker, 'ไม่มีงาน Lab ให้เก็บ Specimen / พิมพ์ Sticker');
        s.unverifiable(BUGS.labResult, 'ไม่มีงาน Lab ให้ส่งผล');
        incomplete.push('Lab ไม่มีงาน');
      }
      if (incomplete.length && !failed) s.block(incomplete.join(' · '));
    }, { needs: ['visit'] });

    await run.step('พยาบาลคัดกรองและเช็คสถานะผล Lab / Img', async (s) => {
      await openEmrFromOpdList(page, f.hn, familyName);
      await savePreAssessment(page);
      s.note('บันทึกฟอร์มคัดกรอง (V/S 120/80 · PR 78 · RR 18 · BT 36.8 · SpO2 98 · Pain 2 · ESI 5)');
      await s.point('เมนู Lab result / Imaging result');
      const lab = await viewResult(page, 'Lab result');
      const img = await viewResult(page, 'Imaging result');
      s.note(`Lab result: ${lab.empty ? 'No data' : 'มีผล'} (ห้อง Lab: ${run.has('labResult') ? 'ออกผลแล้ว' : 'ไม่มีผล'}) · Imaging result: ${img.empty ? 'No data' : 'มีผล'} (ห้องรังสี: ${run.has('imgResult') ? 'บันทึกผลแล้ว' : 'รออ่านผล'})`);
      const mismatch = [run.has('labResult') === lab.empty && 'Lab result', run.has('imgResult') === img.empty && 'Imaging result'].filter(Boolean);
      await closeResultTabs(page);
      await s.point('ส่งเข้าคิวห้องตรวจ');
      await setVisitStatus(page, 'พร้อมตรวจ');
      s.note('ส่งเข้าคิวห้องตรวจ (สถานะ พร้อมตรวจ)');
      s.provide('screened');
      if (mismatch.length) throw new Error(`สถานะผลในเมนู ${mismatch.join(' / ')} ไม่ตรงกับห้อง Lab / รังสี`);
    }, { needs: ['visit'] });

    await run.step('แพทย์ดูผล Lab / IMG แล้วตรวจ', async (s) => {
      await s.point('เรียกคิว + ดูผล Lab / IMG');
      await setVisitStatus(page, 'พร้อมตรวจ');
      const lab = await viewResult(page, 'Lab result');
      const img = await viewResult(page, 'Imaging result');
      s.note(`เรียกคิว (พร้อมตรวจ) · Lab result: ${lab.empty ? 'No data' : 'มีผล'} · Imaging result: ${img.empty ? 'No data' : 'มีผล'}`);
      await closeResultTabs(page);
      await s.point('ลง OPD Note + Diagnosis');
      const note = await saveOpdNote(page);
      s.note(`Dx ${note.dx} · บันทึกใช้ ${note.seconds.toFixed(1)} วินาที`);
      if (note.seconds > 10) await s.bug(BUGS.opdNoteSlow, `บันทึก OPD Note ใช้ ${note.seconds.toFixed(1)} วินาที`);
      else s.fixed(BUGS.opdNoteSlow, `บันทึก OPD Note สำเร็จใน ${note.seconds.toFixed(1)} วินาที`);
      s.provide('note');
      const missing = [!run.has('labResult') && 'Lab', !run.has('imgResult') && 'IMG'].filter(Boolean);
      if (missing.length) s.block(`แพทย์ไม่มีผล ${missing.join(' / ')} ให้ดู — ต่อเนื่องจากขั้นห้อง Lab / Img ออกผลไม่ได้ (ลง OPD Note + Diagnosis แล้ว)`);
    }, { needs: ['visit'] });

    await run.step('แพทย์สั่งยากลับบ้านและทำนัด FU', async (s) => {
      await s.point('สั่งยา Home med');
      await orderHomeMed(page);
      s.note(`${OPD.homeMed.code} ${OPD.homeMed.name} × ${OPD.homeMed.qty} (Home med) · ส่งคำสั่งแล้ว`);
      s.provide('order');
      await s.point('สร้างนัด FU');
      followUp = await createAppointment(page);
      f.followUp = followUp.start;
      s.note(`นัด FU ${new Date(followUp.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      if (followUp.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัด FU แล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${followUp.slipError})`, { target: notice(page, /บัตรนัด/) });
      await s.point('ตรวจเสร็จ');
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
    }, { needs: ['visit'] });

    await dischargeStep(run, browser, f.hn, followUp);

    await paymentStep(run, page, f, 'คนไข้ชำระเงิน (รวมค่า Lab / IMG)', async (s, has) => {
      if (!has(OPD.futureLab.code)) await s.bug(BUGS.labApptStuck, `ค่า Lab ${OPD.futureLab.code} ไม่อยู่ในรายการค่าใช้จ่าย (ไม่เกิดงาน Lab จาก Order ล่วงหน้า)`, { target: chargeTable(page) });
      return has(OPD.futureImg.code) ? undefined : `ค่า IMG ${OPD.futureImg.code} ไม่อยู่ในรายการค่าใช้จ่าย`;
    });
    await pharmacyStep(run, page, f, 'ห้องยาจัดยาและจ่ายยา');

    await run.step('ปิด Visit ที่การเงิน', async (s) => {
      const coverages = await closeVisitWithCoverages(page, f.hn, f.vn);
      s.note(`ปิด Visit แล้ว${coverages.length ? ` (ปิดสิทธิที่ค้าง: ${coverages.join(', ')})` : ''}`);
    }, { pre: true, needs: ['visit'] });
  } finally {
    const file = await run.save();
    console.log(`  ผลรัน: ${file}`);
    expect.soft(run.steps.filter((st) => st.status === 'Fail' || st.status === 'Block').map((st) => `[${st.status}] ${st.title}`), 'ขั้นที่ไม่ผ่าน').toEqual([]);
    if (f.hn && registered) recordMockPatient('BIZSIM', registered, { hn: f.hn, vn: f.vn, en: f.en }, `${run.caseId} · ${run.steps.map((st) => `${st.title}=${st.status}`).join(' · ')}`);
  }
});

// APM-OPD-003 · แพทย์สั่ง LAB / IMG "วันนี้" ระหว่างตรวจ แล้วอ่านผลภายในวัน — รายการเดียวกับ APM-OPD-002 (LAB0000001 + IMG0000194 · ลงผลเองใน Cortex)
// SBH Prod 22 ต.ค. 2026 บ่าย (สำรวจ HN 6904461): สั่ง Lab / IMG วันนี้ไม่ได้ — UpsertOpdOrder errors composition validation (document_metadata/location) หน้าจอเงียบ
test(`APM-OPD-003 คนไข้มีนัด เข้าพบแพทย์ แล้วแพทย์สั่งตรวจ LAB / IMG อ่านผลภายในวัน (${SYSTEM})`, { tag: '@APM-OPD-003' }, async ({ page, browser }) => {
  test.setTimeout(60 * 60_000);
  const run = new BizSim('APM-OPD-003', 'คนไข้มีนัด เข้าพบแพทย์ แล้วแพทย์สั่งตรวจ LAB / IMG อ่านผลภายในวัน', page);
  const authorization = trackAuthorization(page);
  const f = run.facts;
  let familyName = '';
  let registered: NewPatient | undefined;
  let followUp: Appointment | undefined;
  const mainPrint = await capturePrintJobs(page);
  try {
    await page.goto('/cortex/apps');
    await expect(page.getByLabel('เวชระเบียน')).toBeVisible({ timeout: 180_000 });

    // ---------- Pre-condition: ผู้ป่วยใหม่ + นัดหมายของวันนี้ ----------
    await run.step('ลงทะเบียนผู้ป่วยใหม่ที่เวชระเบียน', async (s) => {
      const { patient, hn } = await registerBizSimPatient(page, authorization(), run.caseId);
      familyName = patient.familyName;
      registered = patient;
      Object.assign(f, { name: `${patient.firstName} ${patient.familyName}`, hn });
      s.note(`HN ${hn} ${f.name}`);
      s.provide('patient');
    }, { pre: true });

    await run.step(`สร้างนัดหมายวันนี้ (${OPD.clinic} · ดร. วิชัย)`, async (s) => {
      const appt = await createAppointment(page, { date: 'today' });
      f.appointmentToday = appt.start;
      s.note(`นัด ${new Date(appt.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      if (appt.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัดแล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${appt.slipError}) — แจ้งเตือน "ไม่สามารถพิมพ์บัตรนัดหมายได้"`, { target: notice(page, /บัตรนัด/) });
      s.provide('appointment');
    }, { pre: true, needs: ['patient'] });

    // ---------- ขั้นในชีต ----------
    await run.step('เปิด Visit ตามนัดหมาย', (s) => openVisitPart(s, page, f, mainPrint), { needs: ['appointment'] });

    await screenExamStep(run, page, f, familyName, 'พยาบาลคัดกรองและแพทย์ตรวจ');

    for (const [title, item, flag] of [
      ['แพทย์สั่ง LAB ต้องการทราบผลภายในวันที่สั่ง', OPD.futureLab, 'labOrdered'],
      ['แพทย์สั่ง IMG ต้องการทราบผลภายในวันที่สั่ง', OPD.futureImg, 'imgOrdered'],
    ] as const) {
      await run.step(title, (s) => orderInvestigationPart(s, page, item, flag), { needs: ['visit'] });
    }

    await labImgRoomStep(run, page, f, 'ห้อง Lab / Img ทำรายการและส่งผลกลับ');

    await run.step('แพทย์อ่านผลและสรุปการรักษาภายในวัน', async (s) => {
      await s.point('เปิดดูผล Lab / IMG');
      await gotoEmr(page, f.hn, f.vn, f.en);
      await setVisitStatus(page, 'พร้อมตรวจ');
      const lab = await viewResult(page, 'Lab result');
      const img = await viewResult(page, 'Imaging result');
      s.note(`Lab result: ${lab.empty ? 'No data' : 'มีผล'} · Imaging result: ${img.empty ? 'No data' : 'มีผล'}`);
      await closeResultTabs(page);
      await s.point('OPD Note + ยากลับบ้าน');
      const note = await saveOpdNote(page);
      s.note(`บันทึก OPD Note อีกครั้ง (Dx ${note.dx})`);
      await orderHomeMed(page);
      s.note(`${OPD.homeMed.code} ${OPD.homeMed.name} × ${OPD.homeMed.qty} (Home med) · ส่งคำสั่งแล้ว`);
      s.provide('order');
      await s.point('นัด FU + ตรวจเสร็จ');
      followUp = await createAppointment(page);
      f.followUp = followUp.start;
      s.note(`นัด FU ${new Date(followUp.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      if (followUp.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัด FU แล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${followUp.slipError})`, { target: notice(page, /บัตรนัด/) });
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
      const missing = [!run.has('labResult') && 'Lab', !run.has('imgResult') && 'IMG'].filter(Boolean);
      if (missing.length && !run.steps.at(-1)?.notes.some((n) => n.startsWith('[บั๊ก'))) s.block(`ไม่มีผล ${missing.join(' / ')} ให้แพทย์อ่าน — ต่อเนื่องจากขั้นสั่ง / ห้อง Lab / Img (ทำ OPD Note · ยา · นัด FU · ตรวจเสร็จแล้ว)`);
    }, { needs: ['visit'] });

    await dischargeStep(run, browser, f.hn, followUp);

    await paymentStep(run, page, f, 'คนไข้ชำระเงิน', async (_s, has) => {
      const missing = [
        run.has('labOrdered') && !has(OPD.futureLab.code) && `ค่า Lab ${OPD.futureLab.code}`,
        run.has('imgOrdered') && !has(OPD.futureImg.code) && `ค่า IMG ${OPD.futureImg.code}`,
      ].filter(Boolean);
      return missing.length ? `${missing.join(' / ')} ไม่อยู่ในรายการค่าใช้จ่าย` : undefined;
    });
    await pharmacyStep(run, page, f, 'ห้องยาจัดยาและจ่ายยา');

    await run.step('ปิด Visit ที่การเงิน', async (s) => {
      const coverages = await closeVisitWithCoverages(page, f.hn, f.vn);
      s.note(`ปิด Visit แล้ว${coverages.length ? ` (ปิดสิทธิที่ค้าง: ${coverages.join(', ')})` : ''}`);
    }, { pre: true, needs: ['visit'] });
  } finally {
    const file = await run.save();
    console.log(`  ผลรัน: ${file}`);
    expect.soft(run.steps.filter((st) => st.status === 'Fail' || st.status === 'Block').map((st) => `[${st.status}] ${st.title}`), 'ขั้นที่ไม่ผ่าน').toEqual([]);
    if (f.hn && registered) recordMockPatient('BIZSIM', registered, { hn: f.hn, vn: f.vn, en: f.en }, `${run.caseId} · ${run.steps.map((st) => `${st.title}=${st.status}`).join(' · ')}`);
  }
});

// APM-OPD-004 · แพทย์สั่ง LAB / IMG วันนี้ แล้วส่ง Consult ให้แพทย์อีกท่านอ่านผล — รายการเดียวกับ 002 / 003
// Consult (สำรวจ SBH Prod 22 ต.ค. 2026 · HN 6904461): แพทย์เจ้าของไข้ = user1 (ดร. วิชัย) → ขอปรึกษา นาย กันตวิทย์ สวนทวี (บัญชี Doctor · หน้าต่างแยก) → ตอบผ่านรายการปรึกษาแพทย์
test(`APM-OPD-004 คนไข้มีนัด แพทย์สั่งตรวจ LAB / IMG อ่านผลภายในวัน (ฝากแพทย์ท่านอื่นอ่านผล) (${SYSTEM})`, { tag: '@APM-OPD-004' }, async ({ page, browser }) => {
  test.setTimeout(60 * 60_000);
  const run = new BizSim('APM-OPD-004', 'คนไข้มีนัด แพทย์สั่งตรวจ LAB / IMG อ่านผลภายในวัน (ฝากแพทย์ท่านอื่นอ่านผล)', page);
  const authorization = trackAuthorization(page);
  const f = run.facts;
  let familyName = '';
  let registered: NewPatient | undefined;
  let followUp: Appointment | undefined;
  const mainPrint = await capturePrintJobs(page);
  const CONSULT_ANSWER = 'อ่านผลแล้ว แนะนำให้รักษาตามอาการ (BizSim APM-OPD-004)';
  const problem = `BizSim APM-OPD-004 ขอปรึกษาอ่านผล ${OPD.futureLab.code} / ${OPD.futureImg.code} (${Date.now().toString(36)})`;
  try {
    await page.goto('/cortex/apps');
    await expect(page.getByLabel('เวชระเบียน')).toBeVisible({ timeout: 180_000 });

    // ---------- Pre-condition: ผู้ป่วยใหม่ + นัดหมายของวันนี้ ----------
    await run.step('ลงทะเบียนผู้ป่วยใหม่ที่เวชระเบียน', async (s) => {
      const { patient, hn } = await registerBizSimPatient(page, authorization(), run.caseId);
      familyName = patient.familyName;
      registered = patient;
      Object.assign(f, { name: `${patient.firstName} ${patient.familyName}`, hn });
      s.note(`HN ${hn} ${f.name}`);
      s.provide('patient');
    }, { pre: true });

    await run.step(`สร้างนัดหมายวันนี้ (${OPD.clinic} · ดร. วิชัย)`, async (s) => {
      const appt = await createAppointment(page, { date: 'today' });
      f.appointmentToday = appt.start;
      s.note(`นัด ${new Date(appt.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      if (appt.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัดแล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${appt.slipError}) — แจ้งเตือน "ไม่สามารถพิมพ์บัตรนัดหมายได้"`, { target: notice(page, /บัตรนัด/) });
      s.provide('appointment');
    }, { pre: true, needs: ['patient'] });

    // ---------- ขั้นในชีต ----------
    await run.step('เปิด Visit ตามนัดหมาย', (s) => openVisitPart(s, page, f, mainPrint), { needs: ['appointment'] });
    await screenExamStep(run, page, f, familyName, 'พยาบาลคัดกรองและแพทย์เจ้าของไข้ตรวจ');

    await run.step('แพทย์เจ้าของไข้สั่ง LAB / IMG อ่านผลภายในวัน', async (s) => {
      await s.point(`สั่ง ${OPD.futureLab.code}`);
      await orderInvestigationPart(s, page, OPD.futureLab, 'labOrdered');
      await s.point(`สั่ง ${OPD.futureImg.code}`);
      await orderInvestigationPart(s, page, OPD.futureImg, 'imgOrdered');
    }, { needs: ['visit'] });

    await labImgRoomStep(run, page, f, 'ห้อง Lab / Img ทำรายการและส่งผลกลับ');

    await run.step('แพทย์เจ้าของไข้ส่ง Consult ให้แพทย์ท่านอื่นอ่านผล', async (s) => {
      await gotoEmr(page, f.hn, f.vn, f.en);
      const target = await requestConsult(page, problem, { doctor: CONSULT_DOCTOR }, null);
      s.note(`ขอปรึกษา ${target} · Consult Problem "${problem}"`);
      await s.point('สถานะ รอตอบกลับ');
      const row = await consultListRow(page, f.hn, 'send', problem);
      await expect(row, 'คำขอ Consult ต้องมีสถานะ รอตอบกลับ').toContainText('รอตอบกลับ');
      await markEvidence(expected(row));
      s.note('รายการปรึกษาแพทย์ (ส่ง Consult): สถานะ รอตอบกลับ');
      s.provide('consult');
    }, { needs: ['visit'] });

    let doctorWin: Page | undefined;
    await run.step('แพทย์ท่านอื่นรับ Consult อ่านผล และตอบกลับ', async (s) => {
      doctorWin = await openRoleWindow(browser, 'Doctor');
      s.shotsOn(doctorWin);
      await s.point('เปิดดูผล Lab / IMG');
      await gotoEmr(doctorWin, f.hn, f.vn, f.en);
      const lab = await viewResult(doctorWin, 'Lab result');
      const img = await viewResult(doctorWin, 'Imaging result');
      s.note(`แพทย์ผู้รับ Consult เปิด Lab result: ${lab.empty ? 'No data' : 'มีผล'} · Imaging result: ${img.empty ? 'No data' : 'มีผล'}`);
      await s.point('ตอบกลับ Consult');
      const answer = await answerConsultFromList(doctorWin, f.hn, problem, CONSULT_ANSWER);
      s.note(`รับ Consult → ตอบกลับ (CompleteConsultRequest ${answer.status}) · สถานะ ตอบแล้ว`);
      s.provide('consultAnswered');
      const missing = [!run.has('labResult') && 'Lab', !run.has('imgResult') && 'IMG'].filter(Boolean);
      if (missing.length) s.block(`ไม่มีผล ${missing.join(' / ')} ให้แพทย์ผู้รับ Consult อ่าน — ต่อเนื่องจากขั้นสั่ง / ห้อง Lab / Img (ตอบ Consult แล้ว)`);
    }, { needs: ['consult'] });
    const win = doctorWin as Page | undefined;
    if (win) {
      await finishVideo(win);
      await win.context().close();
    }

    await run.step('แพทย์เจ้าของไข้ดูผลที่ตอบกลับและสรุปการรักษา', async (s) => {
      if (run.has('consultAnswered')) {
        await s.point('คำตอบ Consult');
        const text = await readConsultAnswer(page, f.hn, problem, CONSULT_ANSWER);
        s.note(`เห็นคำตอบ Consult: ${(text.match(/คำตอบ\s*โดย:.*?(?=ข้อแนะนำ)/)?.[0] ?? text.slice(-120)).slice(0, 120)}`);
      }
      await s.point('OPD Note + ยา + นัด FU + ตรวจเสร็จ');
      await gotoEmr(page, f.hn, f.vn, f.en);
      const note = await saveOpdNote(page);
      s.note(`บันทึก OPD Note อีกครั้ง (Dx ${note.dx})`);
      await orderHomeMed(page);
      s.note(`${OPD.homeMed.code} ${OPD.homeMed.name} × ${OPD.homeMed.qty} (Home med) · ส่งคำสั่งแล้ว`);
      s.provide('order');
      followUp = await createAppointment(page);
      f.followUp = followUp.start;
      s.note(`นัด FU ${new Date(followUp.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      if (followUp.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัด FU แล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${followUp.slipError})`, { target: notice(page, /บัตรนัด/) });
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
      if (!run.has('consultAnswered')) throw new Error('ไม่มีคำตอบ Consult ให้แพทย์เจ้าของไข้ดู');
    }, { needs: ['visit'] });

    await dischargeStep(run, browser, f.hn, followUp);

    await paymentStep(run, page, f, 'คนไข้ชำระเงิน', async (_s, has) => {
      const missing = [
        run.has('labOrdered') && !has(OPD.futureLab.code) && `ค่า Lab ${OPD.futureLab.code}`,
        run.has('imgOrdered') && !has(OPD.futureImg.code) && `ค่า IMG ${OPD.futureImg.code}`,
      ].filter(Boolean);
      return missing.length ? `${missing.join(' / ')} ไม่อยู่ในรายการค่าใช้จ่าย` : undefined;
    });
    await pharmacyStep(run, page, f, 'ห้องยาจัดยาและจ่ายยา');

    await run.step('ปิด Visit ที่การเงิน', async (s) => {
      const coverages = await closeVisitWithCoverages(page, f.hn, f.vn);
      s.note(`ปิด Visit แล้ว${coverages.length ? ` (ปิดสิทธิที่ค้าง: ${coverages.join(', ')})` : ''}`);
    }, { pre: true, needs: ['visit'] });
  } finally {
    const file = await run.save();
    console.log(`  ผลรัน: ${file}`);
    expect.soft(run.steps.filter((st) => st.status === 'Fail' || st.status === 'Block').map((st) => `[${st.status}] ${st.title}`), 'ขั้นที่ไม่ผ่าน').toEqual([]);
    if (f.hn && registered) recordMockPatient('BIZSIM', registered, { hn: f.hn, vn: f.vn, en: f.en }, `${run.caseId} · ${run.steps.map((st) => `${st.title}=${st.status}`).join(' · ')}`);
  }
});

// APM-OPD-005 · คนไข้มีนัด ไม่มียากลับบ้าน — ผู้ใช้เลือก 22 ต.ค. 2026: แพทย์บันทึกแผง "ค่าแพทย์" ตั้งต้น (ต้องการเก็บ · 200) ก่อนตรวจเสร็จ ให้การเงินมีค่าบริการ
test(`APM-OPD-005 คนไข้มีนัด ไม่มียากลับบ้าน (${SYSTEM})`, { tag: '@APM-OPD-005' }, async ({ page, browser }) => {
  test.setTimeout(45 * 60_000);
  const run = new BizSim('APM-OPD-005', 'คนไข้มีนัด ไม่มียากลับบ้าน', page);
  const authorization = trackAuthorization(page);
  const f = run.facts;
  let familyName = '';
  let registered: NewPatient | undefined;
  let followUp: Appointment | undefined;
  const mainPrint = await capturePrintJobs(page);
  try {
    await page.goto('/cortex/apps');
    await expect(page.getByLabel('เวชระเบียน')).toBeVisible({ timeout: 180_000 });

    // ---------- Pre-condition: ผู้ป่วยใหม่ + นัดหมายของวันนี้ ----------
    await run.step('ลงทะเบียนผู้ป่วยใหม่ที่เวชระเบียน', async (s) => {
      const { patient, hn } = await registerBizSimPatient(page, authorization(), run.caseId);
      familyName = patient.familyName;
      registered = patient;
      Object.assign(f, { name: `${patient.firstName} ${patient.familyName}`, hn });
      s.note(`HN ${hn} ${f.name}`);
      s.provide('patient');
    }, { pre: true });

    await run.step(`สร้างนัดหมายวันนี้ (${OPD.clinic} · ดร. วิชัย)`, async (s) => {
      const appt = await createAppointment(page, { date: 'today' });
      f.appointmentToday = appt.start;
      s.note(`นัด ${new Date(appt.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      if (appt.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัดแล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${appt.slipError}) — แจ้งเตือน "ไม่สามารถพิมพ์บัตรนัดหมายได้"`, { target: notice(page, /บัตรนัด/) });
      s.provide('appointment');
    }, { pre: true, needs: ['patient'] });

    // ---------- ขั้นในชีต ----------
    await run.step('เปิด Visit ตามนัดหมาย', (s) => openVisitPart(s, page, f, mainPrint), { needs: ['appointment'] });

    await screenExamStep(run, page, f, familyName, 'พยาบาลคัดกรองและแพทย์ตรวจ (ไม่สั่งยา)', async (s) => {
      // ไม่สั่ง Order ยา — ตะกร้าคำสั่งการรักษาต้องไม่มีแถวยา
      const meds = page.getByRole('main').getByRole('row').filter({ hasText: /\[MED\d{7}\]/ });
      expect(await meds.count(), 'ตะกร้าคำสั่งการรักษาต้องไม่มียา').toBe(0);
      s.note('ไม่สั่ง Order ยา (ตะกร้าคำสั่งการรักษาไม่มียา)');
    });

    await run.step('แพทย์ทำนัด FU และกดตรวจเสร็จ', async (s) => {
      await s.point('บันทึกค่าแพทย์');
      const fee = await saveDoctorFee(page);
      s.note(`บันทึกค่าแพทย์ (ต้องการเก็บ · ${fee} บาท)`);
      await s.point('นัด FU + ตรวจเสร็จ');
      followUp = await createAppointment(page);
      f.followUp = followUp.start;
      s.note(`นัด FU ${new Date(followUp.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      if (followUp.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัด FU แล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${followUp.slipError})`, { target: notice(page, /บัตรนัด/) });
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
    }, { needs: ['visit'] });

    await dischargeStep(run, browser, f.hn, followUp, { noPharmacy: true });

    await paymentStep(run, page, f, 'คนไข้ชำระเงินเฉพาะค่าบริการ', async (_s, has, items) => {
      const drugs = items.filter((i) => /MED\d{7}/.test(i));
      const missing = [
        !has('ค่าตรวจแพทย์') && 'ไม่มีค่าบริการ (ค่าตรวจแพทย์) ในรายการค่าใช้จ่าย',
        drugs.length && `มีค่ายาในรายการ: ${drugs.map((i) => i.slice(0, 40)).join(' | ')}`,
      ].filter(Boolean);
      return missing.length ? missing.join(' · ') : undefined;
    });

    await run.step('ตรวจสอบว่าไม่มีรายการที่ห้องยา', async (s) => {
      const pharmacy = await pharmacyTabsWithPatient(page, f.hn);
      if (pharmacy.found.length) throw new Error(`ห้องยามีรายการของ HN ${f.hn} ที่แท็บ ${pharmacy.found.join(', ')}`);
      s.note(`ห้องยา (${OPD.pharmacy.name}): ไม่มี Order / ใบยาของ HN ${f.hn} ทั้งแท็บ Order รอยืนยัน · ใบยารอจัด · ใบยาจัดแล้ว · ใบรอจ่าย · จ่ายยาแล้ว`);
    }, { needs: ['visit'] });

    await run.step('ปิด Visit ที่การเงิน', async (s) => {
      const coverages = await closeVisitWithCoverages(page, f.hn, f.vn);
      s.note(`ปิด Visit แล้ว${coverages.length ? ` (ปิดสิทธิที่ค้าง: ${coverages.join(', ')})` : ''}`);
    }, { pre: true, needs: ['visit'] });
  } finally {
    const file = await run.save();
    console.log(`  ผลรัน: ${file}`);
    expect.soft(run.steps.filter((st) => st.status === 'Fail' || st.status === 'Block').map((st) => `[${st.status}] ${st.title}`), 'ขั้นที่ไม่ผ่าน').toEqual([]);
    if (f.hn && registered) recordMockPatient('BIZSIM', registered, { hn: f.hn, vn: f.vn, en: f.en }, `${run.caseId} · ${run.steps.map((st) => `${st.title}=${st.status}`).join(' · ')}`);
  }
});

// APM-OPD-006 · คนไข้มีนัด มียานอกบัญชี (co-pay) / ยาที่ต้องมีเอกสารประกอบ (DUE) / CDSS — ผู้ใช้เลือก 22 ต.ค. 2026:
// DUE = ใช้ยาที่ตั้งไว้แล้ว (ไม่แก้ตั้งค่า Prod) · ยานอกบัญชี = ATORVASTATIN 20 (ตัวที่ติดป้าย NED จริง) · CDSS = แพ้ ibuprofen / PARACETAMOL ซ้ำ / WARFARIN + ASPIRIN · ส่งคำสั่งจริงทุกตัว
const RX_REASON = 'BizSim APM-OPD-006 แพทย์ประเมินแล้ว ยืนยันสั่ง';

test(`APM-OPD-006 คนไข้มีนัด มียา co-pay / ยาที่ต้องมีเอกสารประกอบการสั่ง / CDSS แจ้งเตือน > จ่ายเงิน > รับยา (${SYSTEM})`, { tag: '@APM-OPD-006' }, async ({ page, browser }) => {
  test.setTimeout(60 * 60_000);
  const run = new BizSim('APM-OPD-006', 'คนไข้มีนัด มียา co-pay / ยาที่ต้องมีเอกสารประกอบการสั่ง / CDSS แจ้งเตือน > จ่ายเงิน > รับยา', page);
  const authorization = trackAuthorization(page);
  const f = run.facts;
  let familyName = '';
  let registered: NewPatient | undefined;
  const mainPrint = await capturePrintJobs(page);
  try {
    await page.goto('/cortex/apps');
    await expect(page.getByLabel('เวชระเบียน')).toBeVisible({ timeout: 180_000 });

    // ---------- Pre-condition: ผู้ป่วยใหม่ + นัดหมายของวันนี้ ----------
    await run.step('ลงทะเบียนผู้ป่วยใหม่ที่เวชระเบียน', async (s) => {
      const { patient, hn } = await registerBizSimPatient(page, authorization(), run.caseId);
      familyName = patient.familyName;
      registered = patient;
      Object.assign(f, { name: `${patient.firstName} ${patient.familyName}`, hn });
      s.note(`HN ${hn} ${f.name}`);
      s.provide('patient');
    }, { pre: true });

    await run.step(`สร้างนัดหมายวันนี้ (${OPD.clinic} · ดร. วิชัย)`, async (s) => {
      const appt = await createAppointment(page, { date: 'today' });
      f.appointmentToday = appt.start;
      s.note(`นัด ${new Date(appt.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      if (appt.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัดแล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${appt.slipError}) — แจ้งเตือน "ไม่สามารถพิมพ์บัตรนัดหมายได้"`, { target: notice(page, /บัตรนัด/) });
      s.provide('appointment');
    }, { pre: true, needs: ['patient'] });

    // ---------- ขั้นในชีต ----------
    await run.step('เปิด Visit ตามนัดหมาย', (s) => openVisitPart(s, page, f, mainPrint), { needs: ['appointment'] });
    await screenExamStep(run, page, f, familyName, 'พยาบาลคัดกรองและแพทย์ตรวจ');

    // ประวัติแพ้ยาของผู้ป่วย (ใช้ทดสอบ CDSS แพ้ยา) — ไม่มีแถวในชีต
    await run.step(`บันทึกประวัติแพ้ยา ${OPD.allergy.search} (เตรียมข้อมูล CDSS)`, async (s) => {
      const allergy = await recordAllergyOpd(page, OPD.allergy.search);
      s.note(`แพ้ ${allergy.drug} · แถบหัวผู้ป่วยแสดง "${(await allergy.banner.innerText()).trim()}"`);
      s.provide('allergy');
    }, { pre: true, needs: ['visit'] });

    await run.step('สั่งยานอกบัญชียาหลัก หรือยาประเภทอื่นๆ (A-F)', async (s) => {
      const { code, name, qty } = OPD.ned;
      await openCpoe(page);
      await selectDrug(page, code);
      const ned = drugBadge(page, 'NED');
      await expect(ned, 'ฟอร์มยาต้องแสดงบัญชียา (NED)').toBeVisible();
      const reason = drugBadge(page, /^[A-F] - /);
      const reasonText = (await reason.innerText().catch(() => '')).trim();
      await markEvidence(expected(ned), expected(reason));
      await snapEvidence(page, `${code} — ป้าย NED + เหตุผลยานอกบัญชี`);
      s.note(`${code} ${name}: ฟอร์มยาแสดงบัญชียา "NED" · เหตุผลการใช้ยานอกบัญชี "${reasonText || '-'}"`);
      const added = await addSelectedDrug(page, code, qty);
      if (added.alert) s.note(`หน้าต่างเตือน: ${(await answerOrderAlert(page, RX_REASON)).text.slice(0, 120)}`);
      const text = (await added.row.innerText()).replace(/\s+/g, ' ');
      const money = text.match(/(\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})\s+(\d[\d,]*\.\d{2})\s*$/);
      expect(money, `แถวในตะกร้าต้องมี ราคาต่อหน่วย / รวม / เครดิต / ต้องชำระ: "${text}"`).toBeTruthy();
      const [unit, total, credit, pay] = money!.slice(1).map((v) => Number(v.replace(/,/g, '')));
      await markEvidence(expected(added.row));
      s.note(`ตะกร้า: ${qty} × ${unit.toFixed(2)} = ${total.toFixed(2)} · เครดิต (สิทธิ UC) ${credit.toFixed(2)} · ต้องชำระ ${pay.toFixed(2)}${pay === 0 ? ' — เพดานสิทธิ UC ของยานี้บน Prod = ราคาเต็ม จึงไม่มีส่วนร่วมจ่าย' : ''}`);
      expect(total, 'ราคารวม = ราคาต่อหน่วย × จำนวน').toBeCloseTo(unit * Number(qty), 2);
      expect(credit + pay, 'เครดิต + ต้องชำระ = ราคารวม').toBeCloseTo(total, 2);
      s.provide('nedInCart');
    }, { needs: ['note'] });

    await run.step('สั่งยาที่ต้องมีเอกสารประกอบการสั่งยา (DUE / PA)', async (s) => {
      const { code, name, qty } = OPD.due;
      await s.point('ตั้งค่า DUE / ฟอร์ม DUE/PA');
      const forms = await duePaForms(page);
      await snapEvidence(forms.other, 'ตั้งค่า ฟอร์ม DUE-PA');
      await forms.other.close();
      s.note(`${code} ${name} ตั้งค่า DUE ไว้แล้ว (นโยบาย DUE 9 — ไม่แก้ตั้งค่า Prod) · หน้าตั้งค่า "ฟอร์ม DUE/PA" มี ${forms.rows} ฟอร์ม`);
      await s.point(`เลือก ${code} + ขอ DUE`);
      await selectDrug(page, code);
      const missing = drugBadge(page, 'ไม่มี DUE');
      await expect(missing, 'ฟอร์มยาต้องเตือนว่ายังไม่มี DUE').toBeVisible();
      await markEvidence(expected(missing), expected(page.getByRole('main').getByRole('button', { name: 'ขอ DUE' })));
      await snapEvidence(page, `${code} — ป้าย ไม่มี DUE`);
      s.note('ระบบเตือน: ป้าย "ไม่มี DUE" + ปุ่ม "ขอ DUE" ในฟอร์มยา');
      const req = await requestDue(page, `${RX_REASON} — ปวดหลัง ใช้ NSAID ทั่วไปแล้วระคายเคืองกระเพาะ`);
      s.note(`ขอ DUE → ${req.httpStatus} คำขอ #${req.id ?? '-'} สถานะ ${req.status ?? '-'} · หน้าต่างมีแค่ "${req.dialogText.slice(0, 90)}" (ไม่มีลิงก์ / เอกสารประกอบให้เรียกดู พิมพ์ หรือบันทึก)`);
      await expect(req.badge, 'ป้ายต้องเปลี่ยนเป็น DUE รอตรวจสอบ').toBeVisible({ timeout: 20_000 });
      const added = await addSelectedDrug(page, code, qty);
      if (added.alert) s.note(`หน้าต่างเตือน: ${(await answerOrderAlert(page, RX_REASON)).text.slice(0, 120)}`);
      s.note(`${code} × ${qty} เข้าตะกร้า (DUE ${req.status ?? 'รอตรวจสอบ'})`);
      await s.point('ส่งคำสั่ง (ยา DUE)');
      const sign = await signOrders(page, RX_REASON);
      if (sign.accepted) {
        s.note('ส่งคำสั่งพร้อมยา DUE สำเร็จ');
        s.provide('order');
        if (!forms.rows) throw new Error('ส่งคำสั่งได้ แต่ไม่มีเอกสาร / ฟอร์ม DUE ให้เรียกดู พิมพ์ หรือบันทึก (หน้าตั้งค่า ฟอร์ม DUE/PA ว่าง)');
        return;
      }
      await s.bug(
        BUGS.dueOrderBlocked,
        `ส่งคำสั่งแล้ว signOPDOrders error "${sign.error}" — หน้าจอขึ้นแค่ "เกิดข้อผิดพลาดในระบบ" · คำขอ DUE #${req.id ?? '-'} ค้างสถานะ ${req.status ?? '-'} · หน้าตั้งค่า ฟอร์ม DUE/PA มี ${forms.rows} ฟอร์ม → เรียกดู / พิมพ์ / บันทึกเอกสาร DUE และดู Order เก่าที่มีเอกสารไม่ได้`,
        { target: sign.notice },
      );
      await deleteCartRows(page, code);
      const again = await signOrders(page, RX_REASON);
      expect(again.accepted, `ส่งคำสั่งยาที่เหลือไม่สำเร็จ: ${again.error}`).toBe(true);
      s.note(`ลบ ${code} ออกจากตะกร้า แล้วส่งคำสั่ง ${OPD.ned.code} สำเร็จ`);
      s.provide('order');
    }, { needs: ['note'] });

    await run.step('ตรวจสอบ CDSS แจ้งเตือน (แพ้ยา / ยาซ้ำ / Interaction)', async (s) => {
      const problems: string[] = [];
      const check = async (label: string, code: string, qty: string, kind: RegExp, extra?: (alert: Locator) => Promise<void>) => {
        await s.point(label);
        await selectDrug(page, code);
        const { alert } = await addSelectedDrug(page, code, qty);
        if (!alert) {
          problems.push(`${label}: ไม่มีหน้าต่างเตือน`);
          return;
        }
        const res = await answerOrderAlert(page, RX_REASON, async (a, required) => {
          await markEvidence(expected(a.getByText(kind).first()), expected(required));
          await snapEvidence(page, `${label} — ต้องระบุเหตุผล`);
          await extra?.(a);
        });
        s.note(`${label}: ${res.text.replace(/ADR List.*?เหตุผล/, '').slice(0, 170)} · ไม่ใส่เหตุผลกดยืนยัน${res.blockedWithoutReason ? 'ไม่ได้ ("กรุณาระบุเหตุผล")' : 'ได้'} → ใส่เหตุผลแล้วสั่งได้`);
        if (!kind.test(res.text)) problems.push(`${label}: หน้าต่างเตือนไม่ใช่ ${kind.source}`);
        if (!res.blockedWithoutReason) problems.push(`${label}: กดยืนยันโดยไม่ระบุเหตุผลได้`);
      };
      await check(`แพ้ยา ${OPD.allergy.code}`, OPD.allergy.code, OPD.allergy.qty, /Drug Allergy/);
      // ยาซ้ำ: PARACETAMOL ครั้งแรกไม่เตือน ครั้งที่ 2 ต้องเตือน Drug Duplication
      await selectDrug(page, OPD.homeMed.code);
      const first = await addSelectedDrug(page, OPD.homeMed.code, OPD.homeMed.qty);
      if (first.alert) s.note(`${OPD.homeMed.code} ครั้งแรกมีหน้าต่างเตือน: ${(await answerOrderAlert(page, RX_REASON)).text.slice(0, 100)}`);
      await check(`ยาซ้ำ ${OPD.homeMed.code}`, OPD.homeMed.code, OPD.homeMed.qty, /Drug Duplication/, async (a) => {
        const raw = a.getByText(/^(matchBasis|timeBasis|copyReasonToAll)$/);
        if (await raw.count()) await s.bug(BUGS.dupAlertRawKeys, `หน้าต่าง Drug Duplication แสดงคีย์ดิบ: ${[...new Set(await raw.allInnerTexts())].join(', ')}`, { target: raw.first() });
      });
      // ยาตีกัน: WARFARIN ก่อน แล้ว ASPIRIN ต้องเตือน Drug Interaction
      const [warfarin, aspirin] = OPD.interaction;
      await selectDrug(page, warfarin.code);
      const w = await addSelectedDrug(page, warfarin.code, warfarin.qty);
      if (w.alert) s.note(`${warfarin.code} มีหน้าต่างเตือน: ${(await answerOrderAlert(page, RX_REASON)).text.slice(0, 100)}`);
      await check(`ยาตีกัน ${warfarin.code} + ${aspirin.code}`, aspirin.code, aspirin.qty, /Drug Interaction/);
      await s.point('ส่งคำสั่ง');
      const tagged = page.getByRole('main').getByRole('row').filter({ hasText: /\[MED\d{7}\]/ });
      s.note(`ตะกร้า: ${(await tagged.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 45)).join(' | ')}`);
      const sign = await signOrders(page, RX_REASON);
      expect(sign.accepted, `ส่งคำสั่งไม่สำเร็จ: ${sign.error}`).toBe(true);
      await markEvidence(expected(tagged.filter({ hasText: OPD.allergy.code }).first()), expected(tagged.filter({ hasText: aspirin.code }).first()));
      s.note('ใส่เหตุผลครบ → ส่งคำสั่งสำเร็จ (ยาทุกตัวไปห้องยา)');
      s.provide('order');
      if (problems.length) throw new Error(problems.join(' · '));
    }, { needs: ['allergy'] });

    await run.step('ออกเอกสารร่วมจ่าย (Co-pay)', async (s) => {
      await s.point('สร้างฟอร์ม');
      const menu = await createFormMenu(page);
      s.note(`เมนู สร้างฟอร์ม มีฟอร์ม: ${menu.forms.join(' / ')} — ไม่มีฟอร์มร่วมจ่าย (Co-pay)`);
      if (menu.error) await s.bug(BUGS.createFormLoad, 'เปิดเมนู สร้างฟอร์ม แล้วขึ้นแถบแดง "โหลดกลุ่มแบบฟอร์มหรือร่างไม่สำเร็จ กรุณาลองโหลดใหม่"', { target: menu.error });
      await s.point('สร้างเอกสาร — แบบฟอร์มอนุมัติใช้ยานอกบัญชี');
      const doc = await createNedDocument(page, mainPrint, { name: OPD.ned.name, qty: OPD.ned.qty, unitPrice: 17.5 }, /ผู้ป่วยชำระเงินเอง ไม่นำไปเบิก/);
      s.note(
        `ใช้เมนู สร้างเอกสาร → "แบบฟอร์มอนุมัติใช้ยานอกบัญชียาหลักแห่งชาติ" (การเบิกจ่ายค่ายา: ผู้ป่วยชำระเงินเอง ไม่นำไปเบิก) · ระบบไม่ดึงข้อมูลยาจาก Order ให้ กรอกเอง · บันทึกสำเร็จ${doc.printed ? ' + พิมพ์อัตโนมัติ' : ''}`,
      );
      if (!doc.printed) throw new Error('บันทึกแบบฟอร์มแล้วไม่มีงานพิมพ์อัตโนมัติ');
    }, { needs: ['visit'] });

    await run.step('แพทย์กดตรวจเสร็จ', async (s) => {
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
    }, { pre: true, needs: ['visit'] });

    await dischargeStep(run, browser, f.hn, undefined);

    await paymentStep(run, page, f, 'คนไข้ชำระเงิน (ตรวจสอบส่วนร่วมจ่าย)', async (s, has, items) => {
      if (!has(OPD.ned.code)) return `ค่ายานอกบัญชี ${OPD.ned.code} ไม่อยู่ในรายการค่าใช้จ่าย`;
      s.note(`ยานอกบัญชี: ${items.find((i) => i.includes(OPD.ned.code))}`);
      return undefined;
    });
    await pharmacyStep(run, page, f, 'ห้องยาจัดยาและจ่ายยา');

    await run.step('ปิด Visit ที่การเงิน', async (s) => {
      const coverages = await closeVisitWithCoverages(page, f.hn, f.vn);
      s.note(`ปิด Visit แล้ว${coverages.length ? ` (ปิดสิทธิที่ค้าง: ${coverages.join(', ')})` : ''}`);
    }, { pre: true, needs: ['visit'] });
  } finally {
    const file = await run.save();
    console.log(`  ผลรัน: ${file}`);
    expect.soft(run.steps.filter((st) => st.status === 'Fail' || st.status === 'Block').map((st) => `[${st.status}] ${st.title}`), 'ขั้นที่ไม่ผ่าน').toEqual([]);
    if (f.hn && registered) recordMockPatient('BIZSIM', registered, { hn: f.hn, vn: f.vn, en: f.en }, `${run.caseId} · ${run.steps.map((st) => `${st.title}=${st.status}`).join(' · ')}`);
  }
});

// ---------- APM-OPD-007–010 (ผู้ใช้สั่ง 23 ต.ค. 2026 "เริ่ม Flow ข้อ 7-10 ต่อเลยและลงผลใน Excel ให้ด้วย" · สำรวจ SBH Prod HN 6904482) ----------

/** ขั้นเตรียมร่วม: ลงทะเบียนผู้ป่วยใหม่ + (ถ้า withAppointment) นัดวันนี้ */
async function prepareCase(run: BizSim, page: Page, withAppointment = true): Promise<{ registered?: NewPatient; familyName: string }> {
  const authorization = trackAuthorization(page);
  const f = run.facts;
  const out: { registered?: NewPatient; familyName: string } = { familyName: '' };
  await page.goto('/cortex/apps');
  await expect(page.getByLabel('เวชระเบียน')).toBeVisible({ timeout: 180_000 });
  await run.step('ลงทะเบียนผู้ป่วยใหม่ที่เวชระเบียน', async (s) => {
    const { patient, hn } = await registerBizSimPatient(page, authorization(), run.caseId);
    out.familyName = patient.familyName;
    out.registered = patient;
    Object.assign(f, { name: `${patient.firstName} ${patient.familyName}`, hn });
    s.note(`HN ${hn} ${f.name}`);
    s.provide('patient');
  }, { pre: true });
  if (!withAppointment) return out;
  await run.step(`สร้างนัดหมายวันนี้ (${OPD.clinic} · ดร. วิชัย)`, async (s) => {
    const appt = await createAppointment(page, { date: 'today' });
    f.appointmentToday = appt.start;
    s.note(`นัด ${new Date(appt.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
    if (appt.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัดแล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${appt.slipError}) — แจ้งเตือน "ไม่สามารถพิมพ์บัตรนัดหมายได้"`, { target: notice(page, /บัตรนัด/) });
    s.provide('appointment');
  }, { pre: true, needs: ['patient'] });
  return out;
}

/** ปิดท้ายทุก Scenario: เขียนผล + จดผู้ป่วย */
async function finishCase(run: BizSim, registered: NewPatient | undefined) {
  const f = run.facts;
  const file = await run.save();
  console.log(`  ผลรัน: ${file}`);
  expect.soft(run.steps.filter((st) => st.status === 'Fail' || st.status === 'Block').map((st) => `[${st.status}] ${st.title}`), 'ขั้นที่ไม่ผ่าน').toEqual([]);
  if (f.hn && registered) recordMockPatient('BIZSIM', registered, { hn: f.hn, vn: f.vn, en: f.en }, `${run.caseId} · ${run.steps.map((st) => `${st.title}=${st.status}`).join(' · ')}`);
}

async function closeVisitStep(run: BizSim, page: Page) {
  await run.step('ปิด Visit ที่การเงิน', async (s) => {
    const coverages = await closeVisitWithCoverages(page, run.facts.hn, run.facts.vn);
    s.note(`ปิด Visit แล้ว${coverages.length ? ` (ปิดสิทธิที่ค้าง: ${coverages.join(', ')})` : ''}`);
  }, { pre: true, needs: ['visit'] });
}

// APM-OPD-007 · ยา Stat (DEXAMETHASONE ฉีด) → ชำระค่ายา Stat → ห้องยาจ่าย → พยาบาลฉีด / บันทึก e-MAR → Home med → Discharge → ชำระส่วนที่เหลือ → รับยา
// ค่ายาขึ้นที่การเงินตอนห้องยาสร้างใบยา (สำรวจ: ก่อนสร้างใบยา Chart item ว่าง) → สร้างใบยา Stat ก่อนขั้นชำระ (ขั้นเตรียม)
test(`APM-OPD-007 คนไข้มีนัด หมอสั่งยา Stat > จ่ายค่ายา > ฉีดยา > จ่ายเงิน > รับยากลับบ้าน (${SYSTEM})`, { tag: '@APM-OPD-007' }, async ({ page, browser }) => {
  test.setTimeout(60 * 60_000);
  const run = new BizSim('APM-OPD-007', 'คนไข้มีนัด หมอสั่งยา Stat > จ่ายค่ายา > ฉีดยา > จ่ายเงิน > รับยากลับบ้าน', page);
  const f = run.facts;
  let prep: Awaited<ReturnType<typeof prepareCase>> = { familyName: '' };
  const mainPrint = await capturePrintJobs(page);
  try {
    prep = await prepareCase(run, page);
    await run.step('เปิด Visit ตามนัดหมาย', (s) => openVisitPart(s, page, f, mainPrint), { needs: ['appointment'] });
    await screenExamStep(run, page, f, prep.familyName, 'พยาบาลคัดกรองและแพทย์ตรวจ');

    await run.step('แพทย์สั่งยา Stat', async (s) => {
      await openCpoe(page);
      const stat = await addStatDrug(page);
      s.note(`${OPD.stat.code} ${OPD.stat.name} × ${OPD.stat.qty} · ติ๊ก STAT → วิธีใช้ "${stat.usage.slice(0, 80)}"`);
      const problems: string[] = [];
      if (!/\bstat\b/i.test(stat.text)) problems.push(`แถวในตะกร้าไม่แสดงสถานะ Stat: "${stat.text.slice(0, 120)}"`);
      if (!/In hospital/.test(stat.text)) problems.push('ประเภทการใช้ไม่ใช่ In hospital');
      s.note(`ตะกร้า: ${stat.text.slice(0, 160)}`);
      await s.point('ส่งคำสั่ง (Sign)');
      const sign = await signOrders(page, 'BizSim ยา Stat');
      expect(sign.accepted, `ส่งคำสั่งยา Stat ไม่สำเร็จ: ${sign.error}`).toBe(true);
      await markEvidence(expected(stat.row));
      s.note('ส่งคำสั่ง (Sign) สำเร็จ');
      s.provide('statOrder');
      if (problems.length) throw new Error(problems.join(' · '));
    }, { needs: ['note'] });

    await run.step('ห้องยาสร้างใบยา Stat', async (s) => {
      const rx = await createPrescriptionAt(page, f.hn, OPD.stat.code);
      if (rx.error) {
        await rxCreateBug(s, rx, OPD.stat.code);
        return;
      }
      f.statRx = rx.prescriptionId!;
      s.note(`ใบยา Stat ${f.statRx}`);
      s.provide('statRx');
    }, { pre: true, needs: ['statOrder'] });

    await run.step('คนไข้ชำระค่ายา Stat ก่อนรับบริการ', async (s) => {
      const items = (await chargeItems(page, f.hn, f.vn)).filter((i) => !/^Encounter /.test(i));
      const stat = items.find((i) => i.includes(OPD.stat.code));
      s.note(`รายการค่าใช้จ่าย: ${items.map((i) => i.slice(0, 60)).join(' | ') || '-'}`);
      if (!stat) throw new Error(`ค่ายา Stat ${OPD.stat.code} ไม่แสดงใน Chart item`);
      if ((await amountDue(page)) > 0) {
        const paid = await payAllInCash(page);
        s.note(`ชำระค่ายา Stat ${paid.amount.toFixed(2)} (${paid.receiptId})`);
      } else s.note(`ยอดต้องชำระ 0.00 (สิทธิ UC ครอบคลุมค่ายา Stat) → สร้างใบแจ้งหนี้ ${await createInvoicesOnly(page)}`);
      s.provide('statPaid');
    }, { needs: ['statRx'] });

    await run.step('ห้องยาจ่ายยา Stat', async (s) => {
      for (const n of await dispensePrescription(page, f.hn, f.statRx)) s.note(n);
      s.note(`จ่ายยา Stat แล้ว (ใบยา ${f.statRx} อยู่แท็บ จ่ายยาแล้ว)`);
      s.provide('statDispensed');
    }, { needs: ['statRx', 'statPaid'] });

    await run.step('พยาบาลฉีดยาและบันทึกการให้ยา', async (s) => {
      await gotoEmr(page, f.hn, f.vn, f.en);
      const emar = await openEmar(page);
      await markEvidence(expected(emar.panel));
      if (emar.empty) {
        if (!run.has('statDispensed')) s.block(`e-MAR ไม่มีรายการ ("ไม่พบรายการ e-MAR") — ห้องยายังจ่ายยา Stat ไม่ได้ (ต่อเนื่องจากขั้นห้องยา)`);
        throw new Error('จ่ายยา Stat แล้ว แต่ e-MAR ไม่มีรายการให้บันทึกการให้ยา');
      }
      throw new Error(`e-MAR มีรายการแล้ว แต่สคริปต์ยังไม่รองรับขั้นบันทึกการให้ยา (ยังไม่เคยเห็นหน้าจอบน Prod): ${emar.text.slice(0, 150)}`);
    }, { needs: ['statOrder'] });

    await run.step('แพทย์สั่งยากลับบ้าน (Home med)', async (s) => {
      await gotoEmr(page, f.hn, f.vn, f.en);
      await openCpoe(page);
      await orderHomeMed(page);
      s.note(`${OPD.homeMed.code} ${OPD.homeMed.name} × ${OPD.homeMed.qty} (Home med) · ส่งคำสั่งแล้ว`);
      s.provide('order');
      await s.point('ตรวจเสร็จ');
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
    }, { needs: ['visit'] });

    await dischargeStep(run, browser, f.hn, undefined);

    await run.step('ห้องยาสร้างใบยา Home med', async (s) => {
      const rx = await createPrescriptionAt(page, f.hn, OPD.homeMed.code);
      if (rx.error) {
        await rxCreateBug(s, rx, OPD.homeMed.code);
        return;
      }
      f.rx = rx.prescriptionId!;
      s.note(`ใบยา Home med ${f.rx}`);
      s.provide('rx');
    }, { pre: true, needs: ['order'] });

    await paymentStep(run, page, f, 'คนไข้ชำระเงินส่วนที่เหลือ', async (s, has, items) => {
      const stat = items.filter((i) => i.includes(OPD.stat.code));
      s.note(`ค่ายา Stat ในรายการ ${stat.length} แถว${stat.length ? `: ${stat.map((i) => i.slice(0, 60)).join(' | ')}` : ''}`);
      if (stat.length > 1) return `ค่ายา Stat ${OPD.stat.code} ถูกเรียกเก็บซ้ำ ${stat.length} แถว`;
      if (!has(OPD.homeMed.code)) return `ค่ายา Home med ${OPD.homeMed.code} ไม่อยู่ในรายการค่าใช้จ่าย`;
      return undefined;
    });

    await run.step('คนไข้รับยากลับบ้าน', async (s) => {
      for (const n of await dispensePrescription(page, f.hn, f.rx)) s.note(n);
      s.note('จ่ายยา Home med แล้ว (อยู่แท็บ จ่ายยาแล้ว)');
    }, { needs: ['rx', 'paid'] });

    await closeVisitStep(run, page);
  } finally {
    await finishCase(run, prep.registered);
  }
});

// APM-OPD-008 · หัตถการวันนี้ (ทำแผล · ส่งไปห้องทำแผล) → บันทึกการทำหัตถการ → หัตถการล่วงหน้า (ECG +7 วัน) → Discharge → ชำระค่าหัตถการ
test(`APM-OPD-008 คนไข้มีนัด พบแพทย์ ทำหัตถการ (ภายในวัน / สั่งล่วงหน้า) > การเงิน (${SYSTEM})`, { tag: '@APM-OPD-008' }, async ({ page, browser }) => {
  test.setTimeout(60 * 60_000);
  const run = new BizSim('APM-OPD-008', 'คนไข้มีนัด พบแพทย์ ทำหัตถการ (ภายในวัน / สั่งล่วงหน้า) > การเงิน', page);
  const f = run.facts;
  const authorization = trackAuthorization(page);
  let prep: Awaited<ReturnType<typeof prepareCase>> = { familyName: '' };
  const mainPrint = await capturePrintJobs(page);
  try {
    prep = await prepareCase(run, page);
    await run.step('เปิด Visit ตามนัดหมาย', (s) => openVisitPart(s, page, f, mainPrint), { needs: ['appointment'] });
    await screenExamStep(run, page, f, prep.familyName, 'พยาบาลคัดกรองและแพทย์ตรวจ');

    await run.step('แพทย์สั่งหัตถการภายในวัน', async (s) => {
      await openCpoe(page);
      const proc = await addProcedure(page, OPD.procToday.code, { location: OPD.procToday.location });
      s.note(`${OPD.procToday.code} ${OPD.procToday.name} · ฟอร์ม: ${proc.form.slice(0, 160)}`);
      const rowText = (await proc.row.innerText()).replace(/\s+/g, ' ').trim();
      s.note(`ตะกร้า: ${rowText}`);
      await s.point('ส่งคำสั่ง');
      const sign = await signOrders(page, 'BizSim หัตถการ');
      expect(sign.accepted, `ส่งคำสั่งหัตถการไม่สำเร็จ: ${sign.error}`).toBe(true);
      s.note('ส่งคำสั่งสำเร็จ');
      s.provide('procToday');
      // ข้อ 5 ของชีต: แสดง หัตถการ / จำนวน / ราคา พร้อม ICD9
      if (!/ICD/i.test(rowText) && !/\b\d{2}\.\d{1,2}\b/.test(rowText)) await s.bug(BUGS.procNoIcd9, `แถวหัตถการในตะกร้าแสดงแค่ "${rowText.slice(0, 90)}" — ไม่มีรหัส ICD9`, { target: proc.row });
    }, { needs: ['note'] });

    await run.step('บันทึกการทำหัตถการหลังทำเสร็จ', async (s) => {
      await openProcedurePanel(page, f.hn, f.vn, f.en);
      const rec = await recordProcedure(page, OPD.procToday.name);
      if (rec.error) throw new Error(`กดบันทึกการทำหัตถการแล้ว CompleteActivity error "${rec.error}" (หน้าจอไม่มีแจ้งเตือน)`);
      const ok = page.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: 'บันทึกแล้ว' }).first();
      await ok.waitFor({ timeout: 10_000 }).then(() => markEvidence(expected(ok)), () => undefined);
      s.note(`บันทึกการทำหัตถการ (ผู้ทำ ${rec.performer})`);
      const tasks = await fetchActivityTasks(page, authorization(), { hn: f.hn });
      const item = tasks.flatMap((t) => t.items).find((i) => i.name === OPD.procToday.name);
      s.note(`สถานะงานหัตถการ: ${item?.latestStatusCode ?? '-'}`);
      expect(item?.latestStatusCode, 'สถานะหัตถการต้องเปลี่ยนเป็นทำแล้ว (PERFORMED)').toBe('PERFORMED');
      s.provide('procDone');
    }, { needs: ['procToday'] });

    await run.step('แพทย์สั่งหัตถการล่วงหน้า (วันอื่น)', async (s) => {
      await gotoEmr(page, f.hn, f.vn, f.en);
      await openCpoe(page);
      const proc = await addProcedure(page, OPD.procFuture.code, { daysAhead: 7 });
      s.note(`${OPD.procFuture.code} ${OPD.procFuture.name} · ประเภท วันอื่น · วันที่ทำ ${proc.date}`);
      const sign = await signOrders(page, 'BizSim หัตถการล่วงหน้า');
      expect(sign.accepted, `ส่งคำสั่งหัตถการล่วงหน้าไม่สำเร็จ: ${sign.error}`).toBe(true);
      s.provide('procFuture');
      await s.point('รายการรอทำในวันนัด');
      const tasks = await fetchActivityTasks(page, authorization(), { hn: f.hn });
      const item = tasks.flatMap((t) => t.items).find((i) => i.name === OPD.procFuture.name);
      const due = item?.serviceDue ? new Date(item.serviceDue).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }) : '-';
      s.note(`งานหัตถการล่วงหน้า: ${item?.latestStatusCode ?? '-'} · กำหนด ${due}`);
      const [y, m, d] = proc.date.split('-');
      expect(due, 'วันที่ของงานหัตถการล่วงหน้าต้องตรงกับวันที่เลือก').toBe(`${Number(y) - 543}-${m}-${d}`);
      await openProcedurePanel(page, f.hn, f.vn, f.en);
      const group = page.getByText(`${d}/${m}/${y}`, { exact: true }).filter({ visible: true }).first();
      await expect(group, `แผงหัตถการต้องมีกลุ่มวันที่ ${d}/${m}/${y}`).toBeVisible({ timeout: 30_000 });
      const button = await procedureButton(page, OPD.procFuture.name);
      s.note(`แผงหัตถการ: ${OPD.procFuture.name} อยู่กลุ่มวันที่ ${d}/${m}/${y} · ปุ่มบันทึกหัตถการ${(await button.isEnabled()) ? 'กดได้' : 'กดไม่ได้ (ยังไม่ถึงวัน)'}`);
      await markEvidence(expected(group), expected(button));
    }, { needs: ['note'] });

    await run.step('แพทย์กดตรวจเสร็จ', async (s) => {
      await gotoEmr(page, f.hn, f.vn, f.en);
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
    }, { pre: true, needs: ['visit'] });

    await dischargeStep(run, browser, f.hn, undefined, { noPharmacy: true });

    await paymentStep(run, page, f, 'คนไข้ชำระเงิน (ค่าหัตถการ)', async (s, has) => {
      const problems = [
        !has(OPD.procToday.code) && `ค่าหัตถการที่ทำวันนี้ ${OPD.procToday.code} ไม่อยู่ในรายการค่าใช้จ่าย`,
        has(OPD.procFuture.code) && `หัตถการล่วงหน้า ${OPD.procFuture.code} ถูกเรียกเก็บในวันนี้`,
      ].filter(Boolean);
      if (!has(OPD.procFuture.code)) s.note(`หัตถการล่วงหน้า ${OPD.procFuture.code} ยังไม่ถูกเรียกเก็บ`);
      return problems.length ? problems.join(' · ') : undefined;
    });

    await closeVisitStep(run, page);
  } finally {
    await finishCase(run, prep.registered);
  }
});

// APM-OPD-009 · Refill: PARACETAMOL ยอด 30 → จ่ายครั้งนี้ 10 + เติม 2 รอบ × 10 ทุก 10 วัน → ห้องยาจ่ายงวดแรก → Discharge (+ พิมพ์ใบ Refill) → ชำระ
test(`APM-OPD-009 คนไข้มีนัด พบแพทย์ หมอสั่ง Refill ยา (${SYSTEM})`, { tag: '@APM-OPD-009' }, async ({ page, browser }) => {
  test.setTimeout(60 * 60_000);
  const run = new BizSim('APM-OPD-009', 'คนไข้มีนัด พบแพทย์ หมอสั่ง Refill ยา', page);
  const f = run.facts;
  let prep: Awaited<ReturnType<typeof prepareCase>> = { familyName: '' };
  const mainPrint = await capturePrintJobs(page);
  const drug = OPD.refill;
  try {
    prep = await prepareCase(run, page);
    await run.step('เปิด Visit ตามนัดหมาย', (s) => openVisitPart(s, page, f, mainPrint), { needs: ['appointment'] });
    await screenExamStep(run, page, f, prep.familyName, 'พยาบาลคัดกรองและแพทย์ตรวจ');

    await run.step('แพทย์สั่งยาแบบ Refill', async (s) => {
      await openCpoe(page);
      await selectDrug(page, drug.code);
      const added = await addSelectedDrug(page, drug.code, drug.total);
      if (added.alert) s.note(`หน้าต่างเตือน: ${(await answerOrderAlert(page, 'BizSim Refill')).text.slice(0, 100)}`);
      await s.point('กำหนด Refill');
      const plan = await planRefill(page, drug);
      s.note(`${drug.code} ${drug.name} ยอด ${drug.total} · Refill ${drug.rounds.length} รอบ × ${drug.rounds[0]} ทุก ${drug.everyDays} วัน → ตะกร้า tooltip "${plan.tooltip}" · ปุ่ม ${plan.button}`);
      const expectTip = `${Number(drug.total) - drug.rounds.reduce((a, b) => a + Number(b), 0)} / ${drug.total} · Refill 0 of ${drug.rounds.length}`;
      expect(plan.tooltip, 'ค่าที่กำหนดต้องแสดงในรายการยาของ Order Basket').toBe(expectTip);
      await s.point('ส่งคำสั่ง (Sign)');
      const sign = await signOrders(page, 'BizSim Refill');
      expect(sign.accepted, `ส่งคำสั่งไม่สำเร็จ: ${sign.error}`).toBe(true);
      s.note('ส่งคำสั่งสำเร็จ');
      s.provide('order');
    }, { needs: ['note'] });

    await run.step('แพทย์กดตรวจเสร็จ', async (s) => {
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
    }, { pre: true, needs: ['visit'] });

    await pharmacyStep(run, page, f, 'ห้องยาจ่ายยางวดแรก', drug.code);

    // Discharge + พิมพ์ใบค้างจ่ายยา / ใบ Refill (ใบนัดมารับยางวดถัดไป)
    let nurseWin: { nurse: Page; print: PrintCapture } | undefined;
    await run.step('พยาบาล Discharge และปริ้นบัตรคิว', async (s) => {
      nurseWin = await openNurseWindow(browser);
      const { nurse, print } = nurseWin;
      s.shotsOn(nurse);
      await s.point('จำหน่าย + พิมพ์บัตรคิว');
      const { queues, grid } = await dischargeAndPrintQueues(nurse, print, f.hn);
      for (const q of queues) s.note(`พิมพ์คิว [${q.row}] → ${q.ticket ? q.ticket.slice(0, 70) : 'ไม่มีงานพิมพ์'}`);
      const printed = queues.filter((q) => q.ticket);
      if (!queues.length) await s.bug(BUGS.cashierQueue, 'การจัดการหลังตรวจไม่มีบัตรคิวให้พิมพ์เลย (ไม่มีคิวการเงิน)', { target: grid });
      else if (printed.length === queues.length) s.fixed(BUGS.queueTemplate, `พิมพ์บัตรคิวได้ครบ ${printed.length} ใบ`);
      else await s.bug(BUGS.queueTemplate, `พิมพ์บัตรคิวได้ ${printed.length} / ${queues.length} ใบ`, { target: grid });
      const nuh = queues.find((q) => /\bNUH\b/.test(`${q.row} ${q.ticket}`));
      if (nuh) await s.bug(BUGS.cashierQueue, `ชื่อคิวการเงินยังเป็น NUH (แถว "${nuh.row}")`, { target: grid.getByText('NUH', { exact: true }) });
      await s.point('พิมพ์ใบ Refill (นัดรับยางวดถัดไป)');
      const refill = await printRefillAtDischarge(nurse, print);
      const problems: string[] = [];
      if (refill.error) problems.push(refill.error);
      else {
        const rounds = [...(refill.text ?? '').matchAll(/ครั้งที่\s*(\d+)\s*\/\s*(\d+)\s*\*?\s*วันที่ให้ยาเติม\s*:?\s*([^*]+)\*/g)].map((m) => `ครั้งที่ ${m[1]}/${m[2]} ${m[3].trim()}`);
        s.note(`ใบค้างจ่ายยา/ใบ Refill ยา: ${rounds.join(' · ') || (refill.text ?? '').slice(0, 120)}`);
        if (rounds.length !== drug.rounds.length) problems.push(`ใบ Refill มีรอบเติมยา ${rounds.length} รอบ (ควรเป็น ${drug.rounds.length})`);
      }
      await markEvidence(expected(refill.target));
      await s.point('บันทึก Discharge');
      const saved = await saveDischarge(nurse);
      if (saved.falseError) await s.bug(BUGS.dischargeFalseError, `บันทึกแล้ว statusCode COMPLETE แต่แจ้งเตือน "${saved.falseError}"`, { target: saved.notice });
      s.note(`Discharge COMPLETE (dischargeTypeCode ${saved.dischargeTypeCode} = With Approval)`);
      s.provide('discharged');
      if (problems.length) throw new Error(problems.join(' · '));
    }, { needs: ['examined'] });
    const win = nurseWin as { nurse: Page } | undefined;
    if (win) {
      await finishVideo(win.nurse);
      await win.nurse.context().close();
    }

    await paymentStep(run, page, f, 'คนไข้ชำระเงิน', async (s, has, items) => {
      const row = items.find((i) => i.includes(drug.code));
      if (!row) return `ค่ายา ${drug.code} ไม่อยู่ในรายการค่าใช้จ่าย`;
      s.note(`ค่ายา: ${row.slice(0, 90)}`);
      // ราคาเม็ดละ 1.00 — งวดแรก 10 เม็ด = 10.00 · ทั้งแผน 30 เม็ด = 30.00
      if (/\b30\.00\b/.test(row)) return `เรียกเก็บค่ายาทั้งแผน (${drug.total}) ไม่ใช่เฉพาะงวดที่จ่าย`;
      return undefined;
    });

    await closeVisitStep(run, page);
  } finally {
    await finishCase(run, prep.registered);
  }
});

// APM-OPD-010 · Visit Walk-in เพื่อขอใบรับรองแพทย์ → OPD Note → ใบรับรองแพทย์ลาป่วย (เมนูขวา) + ใบขับขี่ (เมนูเอกสาร) → พิมพ์ → ดูย้อนหลัง → ชำระค่าธรรมเนียม
test(`APM-OPD-010 คนไข้ขอใบรับรองแพทย์ชนิดต่างๆ (${SYSTEM})`, { tag: '@APM-OPD-010' }, async ({ page }) => {
  test.setTimeout(60 * 60_000);
  const run = new BizSim('APM-OPD-010', 'คนไข้ขอใบรับรองแพทย์ชนิดต่างๆ', page);
  const f = run.facts;
  let prep: Awaited<ReturnType<typeof prepareCase>> = { familyName: '' };
  const mainPrint = await capturePrintJobs(page);
  const certs: { name: string; documentId?: string }[] = [];
  try {
    prep = await prepareCase(run, page, false);

    await run.step('เปิด Visit สำหรับขอใบรับรองแพทย์', async (s) => {
      const visit = await openWalkInVisit(page, f.hn);
      Object.assign(f, { vn: visit.vn, en: visit.en });
      s.note(`${visit.vn} / ${visit.en} · ${OPD.clinic} · แถว: ${visit.row.slice(0, 80)}`);
      s.provide('visit');
      await s.point('ลงตารางแพทย์ (คำขอ Walk-in)');
      const scheduled = await scheduleWalkInRequest(page, f.hn);
      s.note(`ลงตาราง ${scheduled.doctor} ช่วง ${scheduled.slot} (= เช็คอิน)`);
    }, { needs: ['patient'] });

    await run.step('แพทย์ตรวจและลง OPD Note', async (s) => {
      await openEmrFromOpdList(page, f.hn, prep.familyName);
      await setVisitStatus(page, 'พร้อมตรวจ');
      const note = await saveOpdNote(page);
      s.note(`เรียกคิว (พร้อมตรวจ) · Dx ${note.dx} · บันทึกใช้ ${note.seconds.toFixed(1)} วินาที`);
      if (note.seconds > 10) await s.bug(BUGS.opdNoteSlow, `บันทึก OPD Note ใช้ ${note.seconds.toFixed(1)} วินาที`);
      else s.fixed(BUGS.opdNoteSlow, `บันทึก OPD Note สำเร็จใน ${note.seconds.toFixed(1)} วินาที`);
      s.provide('note');
    }, { needs: ['visit'] });

    await run.step('สร้างใบรับรองแพทย์จากหน้า ใบรับรองแพทย์', async (s) => {
      const cert = await createCertificateFromPanel(page, mainPrint);
      await markEvidence(expected(cert.notice));
      certs.push({ name: OPD.certPanel, documentId: cert.documentId });
      s.note(`${OPD.certPanel}: บันทึกสำเร็จ (เอกสาร #${cert.documentId ?? '-'}) · พิมพ์อัตโนมัติ ${cert.printed ? `"${cert.printed.slice(0, 60)}"` : 'ไม่มีงานพิมพ์'}`);
      s.provide('cert');
      if (!cert.printed) throw new Error('ติ๊ก "พิมพ์อัตโนมัติเมื่อบันทึก" ไว้ แต่บันทึกแล้วไม่มีงานพิมพ์');
    }, { needs: ['visit'] });

    await run.step('สร้างใบรับรองแพทย์จากหน้า Document (เลือกชนิดเอกสาร)', async (s) => {
      const cert = await createCertificateFromDocuments(page, mainPrint);
      await markEvidence(expected(cert.notice));
      certs.push({ name: OPD.certDocument, documentId: cert.documentId });
      s.note(`เมนูเอกสาร → สร้างเอกสาร → ประเภท ใบรับรองแพทย์ → ${OPD.certDocument}: บันทึกสำเร็จ (เอกสาร #${cert.documentId ?? '-'}) · พิมพ์อัตโนมัติ ${cert.printed ? `"${cert.printed.slice(0, 60)}"` : 'ไม่มีงานพิมพ์'}`);
      s.provide('cert');
      if (!cert.printed) throw new Error('บันทึกแล้วไม่มีงานพิมพ์อัตโนมัติ');
    }, { needs: ['visit'] });

    await run.step('พิมพ์ใบรับรองแพทย์', async (s) => {
      const { rows, table } = await certificateRows(page);
      s.note(`เมนูเอกสาร: ใบรับรองแพทย์ ${rows.length} ฉบับ — ${rows.map((r) => r.slice(0, 70)).join(' | ')}`);
      await markEvidence(expected(table));
      const doc = await viewDocument(page, table.first());
      const missing = [f.hn, f.name.split(' ').pop()!, 'วิชัย'].filter((v) => !doc.text.includes(v));
      s.note(`เปิดเอกสาร (View) → ${doc.text.slice(0, 90)} · ปุ่ม Print ของตัวแสดง PDF ${doc.hasPrint ? 'มี' : 'ไม่มี'} (ไม่ได้กด — เปิดหน้าต่างพิมพ์ของเบราว์เซอร์) · งานพิมพ์จริงตรวจจากพิมพ์อัตโนมัติตอนบันทึก`);
      if (missing.length) throw new Error(`ข้อมูลบนเอกสารไม่ตรงกับ Visit: ไม่พบ ${missing.join(', ')}`);
    }, { needs: ['cert'] });

    await run.step('แพทย์กดตรวจเสร็จ', async (s) => {
      await gotoEmr(page, f.hn, f.vn, f.en);
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
    }, { pre: true, needs: ['visit'] });

    await run.step('ออกใบรับรองแพทย์ย้อนหลัง', async (s) => {
      await gotoPatientNoVisit(page, f.hn);
      const { rows, table } = await certificateRows(page);
      s.note(`หน้าผู้ป่วย (ไม่เลือก Visit) → เอกสาร: ใบรับรองแพทย์ ${rows.length} ฉบับ`);
      const doc = await viewDocument(page, table.last());
      s.note(`เปิดเอกสารย้อนหลัง → ${doc.text.slice(0, 90)} · ปุ่ม Print ${doc.hasPrint ? 'มี' : 'ไม่มี'}`);
      if (!doc.text.includes(f.hn)) throw new Error('เอกสารย้อนหลังไม่มี HN ของผู้ป่วย');
    }, { needs: ['cert'] });

    await paymentStep(
      run,
      page,
      f,
      'คนไข้ชำระค่าธรรมเนียม',
      async (s, _has, items) => {
        const fee = items.filter((i) => /ใบรับรอง|ค่าธรรมเนียม|certificate/i.test(i));
        if (!fee.length) {
          await s.bug(BUGS.certFee, `สร้างใบรับรองแพทย์ ${certs.length} ฉบับ (${certs.map((c) => c.name).join(', ')}) แต่รายการค่าใช้จ่ายมี ${items.length} รายการ${items.length ? `: ${items.map((i) => i.slice(0, 40)).join(' | ')}` : ''} — ไม่มีค่าธรรมเนียมใบรับรองแพทย์`, {
            target: page.getByRole('main').getByRole('table').filter({ hasText: 'รหัส - ชื่อ' }).last(),
          });
        } else s.note(`ค่าธรรมเนียม: ${fee.map((i) => i.slice(0, 60)).join(' | ')}`);
        return undefined;
      },
      ['examined'],
    );

    await closeVisitStep(run, page);
  } finally {
    await finishCase(run, prep.registered);
  }
});
