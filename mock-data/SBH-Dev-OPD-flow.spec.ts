import type { Page } from '@playwright/test';
import { expectOk, waitForApi } from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { finishVideo } from '../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../helpers/functions/opd-activity';
import { expected, markEvidence } from '../helpers/functions/evidence';
import { capturePrintJobs, captureGeneratedDocs, hidePdf, pdfPages, showPdf, type GeneratedDoc } from '../helpers/functions/print-capture';
import type { NewPatient } from '../helpers/functions/test-data';
import { BizSim } from './bizsim';
import {
  BUGS,
  OPD,
  amountDue,
  appointmentHistoryRow,
  cashierQueueHas,
  chargeItems,
  closeCoverageWithEndpoint,
  closeVisitWithCoverages,
  createAppointment,
  createInvoicesOnly,
  createPrescriptionAt,
  dischargeAndPrintQueues,
  gotoPharmacy,
  openEmrFromOpdList,
  openNurseWindow,
  openVisitFromAppointment,
  orderHomeMed,
  payAllInCash,
  registerBizSimPatient,
  saveDischarge,
  saveOpdNote,
  savePreAssessment,
  setVisitStatus,
  type Appointment,
} from './bizsim-opd';
import { expect, test } from './fixtures';
import { SYSTEM, recordMockPatient } from './uat-er';

// OPD ครบวงบน SBH Dev (clone ของ SBH Prod) — ผู้ใช้สั่ง 29 ต.ค. 2026 "ให้ทำสคริปแยกออกมา" หลัง BizSim APM-OPD-001 บน SBH Dev
// หยุดที่ขั้นเปิด Visit ตามนัด (Encounter ค้าง pending-check-in · ไม่มีคิวห้องตรวจ — Prod เช็คอินให้เองพร้อมคิว)
// ขั้นเหมือน APM-OPD-001 (ใช้ helper ชุดเดียวกัน ไม่แก้ BizSim-OPD.spec.ts) + ขั้นสำรอง: ไม่ได้คิว → เช็คอินเองที่รายการผู้ป่วยนอก แล้วเล่นต่อจนปิด Visit
// ผู้ป่วยใหม่ "UAT BIZSIM-SBHDEV001-<ลำดับ>" · ผล: clips/BizSim sbh-dev <วันที่>/SBHDEV-OPD-001/ + created-patients.md
// รัน (เฉพาะ SBH Dev · เปิดจอ):
//   npx playwright test -c playwright.sbh-dev.mock.config.ts SBH-Dev-OPD-flow --headed

/** คิวห้องตรวจ / สถานะของ Encounter จาก API (อ่านอย่างเดียว) */
async function encounterQueue(page: Page, authorization: string, en: string) {
  const res = await page.request.get(`/generated-emr-api/encounters?filter[en][equals]=${en}&perPage=1`, { headers: { authorization } });
  const row = ((await res.json()) as { data?: { latestStatusCode?: string; queueExamId?: number | null }[] }).data?.[0];
  return { status: row?.latestStatusCode ?? '?', queueExamId: row?.queueExamId ?? null };
}

/**
 * ห้องยา: จัดยา → ยืนยันรอจ่าย → เรียกคิว → จ่ายยา — ขั้นเดียวกับ dispensePrescription() ใน bizsim-opd.ts
 * ต่างแค่ชื่อแท็บ: SBH Dev (29 ต.ค. 2026) แท็บชื่อ "ใบยารอจ่าย" · dev-x / Prod เดิม "ใบรอจ่าย" → รับทั้ง 2 ชื่อ
 */
async function dispenseRx(page: Page, hn: string, prescription: string): Promise<string[]> {
  const main = page.getByRole('main');
  const notes: string[] = [];
  await gotoPharmacy(page);
  const steps: [RegExp, string, string][] = [
    [/ใบยารอจัด/, 'จัดยาแล้ว', 'pack'],
    [/ใบยาจัดแล้ว/, 'ยืนยันรอจ่าย', 'verify'],
    [/ใบ(ยา)?รอจ่าย/, 'จ่ายยา', 'dispense'],
  ];
  for (const [tab, button, action] of steps) {
    const tabEl = main.getByRole('tab', { name: tab });
    await tabEl.click();
    notes.push(`แท็บ "${(await tabEl.innerText()).trim()}" → ${button}`);
    const row = main.getByRole('row').filter({ hasText: `HN ${hn}` }).first();
    await expect(row, `ใบยา ${prescription} ต้องอยู่แท็บ ${tab.source}`).toBeVisible({ timeout: 60_000 });
    if (action === 'dispense') {
      const call = row.getByRole('button', { name: /เรียกคิว/ });
      if (await call.count()) {
        await call.first().click();
        notes.push('เรียกคิวที่ห้องยาแล้ว');
      } else notes.push('ไม่พบปุ่มเรียกคิวในแถวใบรอจ่าย');
    }
    await row.locator('td').filter({ hasText: /^\d{5} - / }).first().click();
    await page.waitForURL(new RegExp(`prescriptionId=${prescription}`), { timeout: 90_000 });
    const btn = page.getByRole('button', { name: button, exact: true }).filter({ visible: true }).first();
    await expect(btn).toBeVisible({ timeout: 60_000 });
    if (action === 'dispense') await main.getByRole('checkbox', { name: 'เลือกยาทั้งหมด' }).check();
    const done = waitForApi(page, 'POST', `/cortex-api/prescriptions/${prescription}/${action}`, 60_000);
    await btn.click();
    if (action === 'dispense') {
      const review = page.getByRole('dialog', { name: /ยืนยันการทบทวนก่อนจ่ายยา/ });
      await expect(review).toBeVisible({ timeout: 20_000 });
      await review.getByRole('button', { name: /^ยืนยัน/ }).click();
    }
    await expectOk(await done, `${button} (${action})`);
  }
  await main.getByRole('tab', { name: /จ่าย(ยา)?แล้ว/ }).click(); // SBH Dev: "ใบยาจ่ายแล้ว" · เดิม "จ่ายยาแล้ว"
  const row = main.getByRole('row').filter({ hasText: `HN ${hn}` }).first();
  await expect(row, 'ใบยาต้องอยู่แท็บ จ่ายยาแล้ว').toBeVisible({ timeout: 60_000 });
  await markEvidence(expected(row));
  return notes;
}

/** ข้อความทุกหน้าของ PDF ทุกไฟล์ในเอกสาร (บัตรคิว / ใบนำทาง) */
async function docText(doc: GeneratedDoc): Promise<string> {
  const texts: string[] = [];
  for (const file of doc.files.filter((x) => x.name.endsWith('.pdf'))) texts.push((await pdfPages(file.data)).join(' / '));
  return texts.join(' | ');
}

test('SBHDEV-OPD-001 OPD มีนัด: เปิด Visit → คัดกรอง → แพทย์ → ยา → นัด FU → จำหน่าย → ห้องยา → การเงิน → ปิด Visit (SBH Dev)', { tag: '@SBHDEV-OPD-001' }, async ({ page, browser }) => {
  test.skip(SYSTEM !== 'sbh-dev', 'สคริปต์นี้ทำไว้ทดสอบ SBH Dev เท่านั้น');
  test.setTimeout(45 * 60_000);
  const run = new BizSim('SBHDEV-OPD-001', 'OPD มีนัดเข้ารับบริการปกติ ครบวงจนปิด Visit (SBH Dev + ขั้นสำรองเช็คอินเอง)', page);
  const authorization = trackAuthorization(page);
  const f = run.facts;
  let familyName = '';
  let registered: NewPatient | undefined;
  let followUp: Appointment | undefined;
  const mainPrint = await capturePrintJobs(page);
  // เอกสาร / บัตรคิว จับจาก response ของ API Generate (ผู้ใช้สอน 29 ต.ค. 2026) — ไฟล์อยู่โฟลเดอร์ผลของเทส docs/
  const mainDocs = captureGeneratedDocs(page);
  try {
    await page.goto('/cortex/apps');
    await expect(page.getByLabel('เวชระเบียน')).toBeVisible({ timeout: 180_000 });

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
      s.note(`นัด ${new Date(appt.start).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
      if (appt.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัดแล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${appt.slipError})`);
      s.provide('appointment');
    }, { pre: true, needs: ['patient'] });

    await run.step('เปิด Visit ตามนัดหมาย', async (s) => {
      const since = Date.now();
      const visit = await openVisitFromAppointment(page, f.hn, mainPrint);
      const slip = await mainDocs.next(/navigation-slips\/print|queues\/print$/, since, 15_000).catch(() => undefined);
      if (slip) s.note(`เอกสารจากปุ่มพิมพ์ใบนำทาง (${slip.api}): ${(await docText(slip)).slice(0, 140)}`);
      Object.assign(f, { vn: visit.vn, en: visit.en, queue: visit.queue });
      const enc = await encounterQueue(page, authorization(), visit.en);
      s.note(`${visit.vn} / ${visit.en} · ผูกนัด ${visit.appointmentId ? 'ใช่' : 'ไม่'} · คิวห้องตรวจ ${visit.queue || '-'} · สถานะ ${enc.status} · queueExamId ${enc.queueExamId ?? 'null'}`);
      s.provide('visit');
      // Prod: เช็คอินให้ทันที (in-progress) + ได้คิว → SBH Dev ไม่ได้ = Fail ของขั้นนี้ (ขั้นถัดไปยังเล่นต่อได้ด้วยขั้นสำรอง)
      if (!visit.queue) throw new Error(`ไม่ได้เลขคิวห้องตรวจ — Encounter ${enc.status} (Prod เช็คอินให้ทันทีพร้อมคิว)`);
    }, { needs: ['appointment'] });

    await run.step('ขั้นสำรอง: เช็คอินที่รายการผู้ป่วยนอก', async (s) => {
      if (f.queue) s.na(`เปิด Visit แล้วได้คิว ${f.queue} — ไม่ต้องเช็คอินเอง`);
      await selectOpdUnit(page, OPD.unit, 'ก่อนตรวจ');
      const row = await opdListRow(page, f.hn);
      await s.point('กดเช็คอิน');
      f.checkInAt = String(Date.now());
      await checkInFromOpdList(page, row);
      const enc = await encounterQueue(page, authorization(), f.en);
      const rowText = (await row.innerText()).replace(/\s+/g, ' ').slice(0, 160);
      s.note(`เช็คอินแล้ว · สถานะ ${enc.status} · queueExamId ${enc.queueExamId ?? 'null'} · แถว: ${rowText}`);
      if (!enc.queueExamId) s.note('เช็คอินแล้วก็ยังไม่มีคิวห้องตรวจ');
      s.provide('checkedIn');
    }, { needs: ['visit'] });

    await run.step('ตรวจบัตรคิวพบแพทย์ที่พิมพ์ตอนเช็คอิน (PDF จาก API)', async (s) => {
      if (!run.has('checkedIn')) s.na('ไม่ได้เช็คอินเอง (เปิด Visit แล้วได้คิว)');
      const doc = await mainDocs.next(/queues\/print(-slips)?$/, Number(f.checkInAt), 20_000);
      if (doc.error) throw new Error(`${doc.api} ตอบ ${doc.error}`);
      const pdf = doc.files.find((x) => x.name.endsWith('.pdf'));
      if (!pdf) throw new Error(`${doc.api} ไม่มีไฟล์ PDF (${doc.files.map((x) => x.name).join(', ')})`);
      const text = await docText(doc);
      s.note(`${doc.api} ${doc.request} → ${pdf.name}: ${text.slice(0, 200)}`);
      await showPdf(page, pdf.data, `บัตรคิวพบแพทย์ — ${doc.api} (${pdf.name})`);
      const problems: string[] = [];
      if (!text.includes(f.hn)) problems.push(`ไม่มี HN ${f.hn}`);
      const nulls = text.match(/null/g)?.length ?? 0;
      if (nulls) problems.push(`มีคำว่า "null" ${nulls} จุด (เลขคิว / หัวข้อไม่แสดง)`);
      if (!/MED\d+/.test(text)) problems.push('ไม่มีเลขคิว (MEDxxx)');
      if (problems.length) throw new Error(`บัตรคิวพบแพทย์: ${problems.join(' · ')}`);
    }, { needs: ['visit'] });

    await run.step('พยาบาลคัดกรองก่อนพบแพทย์', async (s) => {
      await hidePdf(page);
      await openEmrFromOpdList(page, f.hn, familyName);
      await savePreAssessment(page);
      s.note('บันทึกฟอร์มคัดกรอง (V/S 120/80 · PR 78 · RR 18 · BT 36.8 · SpO2 98 · Pain 2 · ESI 5)');
      s.provide('screened');
    }, { needs: ['visit'] });

    await run.step('แพทย์เรียกคิวและลง OPD Note', async (s) => {
      await setVisitStatus(page, 'พร้อมตรวจ');
      await s.point('ลง OPD Note + Diagnosis');
      const note = await saveOpdNote(page);
      s.note(`สถานะ พร้อมตรวจ · Dx ${note.dx} · บันทึกใช้ ${note.seconds.toFixed(1)} วินาที`);
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
      if (followUp.slipError) await s.bug(BUGS.apptSlip404, `สร้างนัด FU แล้วพิมพ์บัตรนัดอัตโนมัติไม่ได้ (${followUp.slipError})`);
      await s.point('ประวัติการนัดหมาย + ตรวจเสร็จ');
      const history = await appointmentHistoryRow(page, followUp.start).then(
        async (row) => `นัด FU ${(await row.innerText()).replace(/\s+/g, ' ').slice(0, 90)}`,
        (e: Error) => e,
      );
      await setVisitStatus(page, 'ตรวจเสร็จ');
      s.provide('examined');
      if (history instanceof Error) throw history;
      s.note(history);
    }, { needs: ['visit'] });

    let nurseWin: { nurse: Page } | undefined;
    await run.step('พยาบาล Discharge และปริ้นบัตรคิว', async (s) => {
      const win = await openNurseWindow(browser);
      nurseWin = win;
      const nurseDocs = captureGeneratedDocs(win.nurse);
      s.shotsOn(win.nurse);
      await s.point('จำหน่าย + พิมพ์บัตรคิว');
      const { queues } = await dischargeAndPrintQueues(win.nurse, win.print, f.hn);
      for (const q of queues) s.note(`พิมพ์คิว [${q.row}] → ${q.ticket ? q.ticket.slice(0, 70) : 'ไม่มีงานพิมพ์'}`);
      // เทียบกับไฟล์ที่ API Generate ตอบกลับ (queues/print → zip → queue-1.pdf)
      for (const doc of nurseDocs.docs.filter((d) => /queues\/print/.test(d.api))) {
        const text = doc.error ? `ตอบ ${doc.error}` : await docText(doc);
        s.note(`${doc.api} ${doc.request} → ${text.slice(0, 110)}`);
        if (!doc.error && !text.includes(f.hn)) throw new Error(`บัตรคิวจาก ${doc.api} ไม่มี HN ${f.hn}`);
      }
      await s.point('บันทึก Discharge');
      const saved = await saveDischarge(win.nurse);
      s.note(`Discharge COMPLETE (dischargeTypeCode ${saved.dischargeTypeCode})${saved.falseError ? ` · แจ้งเตือน "${saved.falseError}"` : ''}`);
      s.provide('discharged');
    }, { needs: ['examined'] });
    if (nurseWin) {
      await finishVideo(nurseWin.nurse);
      await nurseWin.nurse.context().close();
    }

    await run.step('ห้องยาสร้างใบยาก่อนชำระเงิน', async (s) => {
      const rx = await createPrescriptionAt(page, f.hn);
      if (rx.error) {
        await s.bug(BUGS.rxCreate500, `กด "สร้างใบยา" (${OPD.homeMed.code} ${OPD.pharmacy.name}) ได้ ${rx.error}`, { target: rx.notice });
        return;
      }
      f.rx = rx.prescriptionId!;
      s.note(`ใบยา ${f.rx}`);
      s.provide('rx');
    }, { needs: ['order'] });

    await run.step('คนไข้ชำระเงินที่การเงิน', async (s) => {
      await s.point('คิวการเงิน');
      s.note((await cashierQueueHas(page, f.hn)) ? 'ผู้ป่วยขึ้นคิวที่หน้าคิวการเงิน' : 'หน้าคิวการเงินไม่มีรายการผู้ป่วยรายนี้ (เปิดบัญชีด้วยการค้น HN แทน)');
      await s.point('บัญชีการเงิน + ปิดสิทธิ + ชำระเงิน');
      const items = await chargeItems(page, f.hn, f.vn);
      s.note(`รายการค่าใช้จ่าย ${items.length} รายการ${items.length ? `: ${items.map((i) => i.slice(0, 50)).join(' | ')}` : ''}`);
      if (!items.length) s.block('ไม่มีรายการค่าใช้จ่ายให้สร้างใบแจ้งหนี้ / ปิดสิทธิ');
      const ep = await closeCoverageWithEndpoint(page, { cardType: '60' });
      s.note(`ปิดสิทธิ UC ด้วย End Point ${ep.endPoint} (Terminal ID ${ep.terminalId} · Trace ${ep.trace})`);
      if ((await amountDue(page)) > 0) {
        const paid = await payAllInCash(page);
        f.receipt = paid.receiptId;
        s.note(`ชำระเงินสด ${paid.amount.toFixed(2)} (${paid.invoiceId} · ${paid.receiptId})`);
      } else s.note(`ยอดต้องชำระ 0.00 → สร้างใบแจ้งหนี้ ${await createInvoicesOnly(page)} ไม่ต้องรับเงิน`);
      s.provide('paid');
    }, { needs: ['discharged'] });

    await run.step('ห้องยาจัดยา เรียกคิว และจ่ายยา', async (s) => {
      for (const n of await dispenseRx(page, f.hn, f.rx)) s.note(n);
      s.note('จ่ายยาแล้ว (อยู่แท็บ จ่ายยาแล้ว)');
    }, { needs: ['rx', 'paid'] });

    await run.step('ปิด Visit ที่การเงิน', async (s) => {
      const coverages = await closeVisitWithCoverages(page, f.hn, f.vn);
      const enc = await encounterQueue(page, authorization(), f.en);
      s.note(`ปิด Visit แล้ว${coverages.length ? ` (ปิดสิทธิที่ค้าง: ${coverages.join(', ')})` : ''} · Encounter ${enc.status}`);
    }, { pre: true, needs: ['visit'] });
  } finally {
    const file = await run.save();
    console.log(`  ผลรัน: ${file}`);
    expect.soft(run.steps.filter((st) => st.status === 'Fail' || st.status === 'Block').map((st) => `[${st.status}] ${st.title}`), 'ขั้นที่ไม่ผ่าน').toEqual([]);
    if (f.hn && registered) recordMockPatient('BIZSIM', registered, { hn: f.hn, vn: f.vn, en: f.en }, `${run.caseId} · ${run.steps.map((st) => `${st.title}=${st.status}`).join(' · ')}`);
  }
});
