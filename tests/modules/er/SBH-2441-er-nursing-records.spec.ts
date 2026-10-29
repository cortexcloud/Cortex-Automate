import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { createAdmissionWithoutBed, createAdmitRequest } from '../../../helpers/functions/er-admit';
import { dismissToast, expectVisitHeader, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import {
  GRAPHICAL_SHEET_RECORD,
  NURSE_FOCUS_NOTE,
  addNurseNoteButton,
  chooseRecordType,
  closeNursingRecords,
  expandFocus,
  fillAie,
  focusCard,
  focusMenuItem,
  openFocusMenu,
  readFocusNotes,
  resolveFocus,
  fetchAdmissionOrigin,
  fetchOpenAdmission,
  fillNurseNote,
  fillSheetRecord,
  gotoIpdPatient,
  nurseNoteDialog,
  nurseNoteNotice,
  nurseNotePanel,
  nurseNoteTab,
  nurseNoteTitle,
  nursingRecordSelector,
  nursingRecordsMenu,
  nursingRecordsTab,
  openNursingRecords,
  openRecordTypeOptions,
  readNurseNoteLayout,
  readSheetRows,
  recordTypeDropdown,
  saveNurseNote,
  saveSheetRecord,
  sheetConsciousness,
  sheetInput,
  sheetPainButton,
  sheetRecordButton,
  sheetRows,
  sheetSaveButton,
  sheetTable,
  type NurseNoteInput,
  type SheetInput,
} from '../../../helpers/functions/er-nursing-records';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriageLevel, erTriageSaveButton, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, gotoVisit } from '../../../mock-data/uat-play';

// SBH-2441 [ER] Nursing Record — AC: Copy and Apply → Nursing Record · Fixed Bug → Nurse Focus Save ไม่ได้
// (เมนู Nursing Records ในแถบขวาของหน้าผู้ป่วย ER: Nurse Focus Note + Graphical Sheet Record — สเปกของ dev อยู่ในคอมเมนต์ของการ์ด)
// ชุด EXE SBH-2514 → TC-001 SBH-2520 · TC-002 SBH-2521 · TC-003 SBH-2522 · TC-004 SBH-2523 · TC-006 SBH-2525 ใช้ผู้ป่วย A รันต่อเนื่อง → 1 เทส 1 flow (R9)
// TC ที่ไม่ผ่านกลางทางไม่หยุดเทส: จดไว้แล้วเล่น TC ถัดไปที่ไม่ขึ้นกับมัน (TC-004 ไม่ขึ้นกับ Focus) แล้วเทสจบเป็นไม่ผ่านพร้อมรายการขั้นที่ไม่ผ่าน
// TC-005 SBH-2524 (หอผู้ป่วย) เป็นเทสที่ 2 (ผู้ป่วย B · --grep @SBH-2524) · หน้าจอ Focus ที่บันทึกแล้ว / เพิ่ม A-I-E / Resolve ตรวจกับ dev-x 14 ต.ค. 2026 (หลัง upload template nursing_focus_v2)
//   Resolve ไม่สำเร็จ (UpdateNursingFocusStatus ตอบ record not found) → TC-006 ตรวจ Focus ที่ค้างในแท็บ Focus แทน
// 28 ต.ค. 2026 (รอบ 3 · ไฟล์แอป index-DRZUQ-Et.js): ฟอร์มคัดกรอง ER แบบใหม่ (fillErTriageForm) · คลิป 1 ไฟล์ต่อ 1 TC (R61 — startClip ต้นช่วงของแต่ละ TC) · retest TC-003 Resolve หลังแก้ SBH-2531
// ข้อมูล: ผู้ป่วย AUTO ใหม่ 1 ราย → Visit ER สิทธิ UC → Triage ESI 3 → ปิด Visit ที่การเงิน (ขั้นของ TC-006 · afterEach ปิดให้ถ้าพังก่อนถึง)
// รัน (dev-x): npx playwright test --headed --grep @SBH-2441

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC1 = 'TC-001 (SBH-2520)';
const TC2 = 'TC-002 (SBH-2521)';
const TC3 = 'TC-003 (SBH-2522)';
const TC4 = 'TC-004 (SBH-2523)';
const TC6 = 'TC-006 (SBH-2525)';
const TRIAGE_LEVEL = 3;
const SHEET: SheetInput = { BT: '37.2', SBP: '124', DBP: '78', PR: '82', RR: '18', SpO2: '97', pain: '2', Oral: '200', Urine: '150', consciousness: 'Alert' };
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');

test.describe(`SBH-2441 Nursing Records ของผู้ป่วย ER (${SYSTEM})`, () => {
  // ลงทะเบียน + เปิด Visit + Triage + เปิดหน้า IPD มาเทียบ + บันทึก 2 แบบ + ปิด Visit ที่การเงิน และค้างหน้าจอให้คลิปอ่านทัน
  test.describe.configure({ timeout: 720_000 });

  let opened: Map<string, ErVisit>;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page);
    // ปิด Visit ของผู้ป่วยที่เทสเปิดเอง หลังเก็บหลักฐาน — ทำทั้งตอนผ่านและตอนพังกลางทาง (บอร์ด ER ไม่มีรายค้างจากเทส)
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  test(
    'ผู้ป่วย A: เปิด Nursing Records จากหน้าผู้ป่วย ER → บันทึก Nurse Focus → บันทึก Graphical Sheet Record → ปิด Visit แล้วอ่านอย่างเดียว (Super_User)',
    { tag: ['@SBH-2441', '@SBH-2520', '@SBH-2521', '@SBH-2522', '@SBH-2523', '@SBH-2525'], annotation: ['SBH-2441', 'SBH-2520', 'SBH-2521', 'SBH-2522', 'SBH-2523', 'SBH-2525'].map(linear) },
    async ({ page }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const failures: string[] = [];
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      /** step ของ TC ที่ไม่ผ่านแล้วเทสเล่นต่อ — ภาพ Error ถูกแนบโดย checkStep · คืน false เมื่อไม่ผ่าน */
      const soft = (title: string, body: () => Promise<void>) =>
        checkStep(page, title, body).then(
          () => true,
          (error: unknown) => {
            failures.push(`${title} — ${firstLine(error)}`);
            console.log(`    ✗ ${title} — ${firstLine(error)}`);
            return false;
          },
        );
      let visit!: ErVisit;

      // คำตอบของเซิร์ฟเวอร์ฟอร์มทุกตัวที่เกี่ยวกับ Nursing Records (แปลงฟอร์ม / บันทึก / อ่านประวัติ) — แนบท้ายเทสไว้ดูสาเหตุ
      const formCalls: string[] = [];
      page.on('response', (res) => {
        const url = new URL(res.url());
        if (res.request().method() !== 'POST' || !/transform-composition|\/contribution$|history\/patient-data-record/.test(url.pathname)) return;
        res.text().then(
          (text) => formCalls.push(`${url.pathname.replace(/\/ehr\/[^/]+\//, '/ehr/<ehrId>/')}${url.search} → ${res.status()}${res.status() >= 400 ? ` ${text.slice(0, 200)}` : ''}`),
          () => formCalls.push(`${url.pathname}${url.search} → ${res.status()}`),
        );
      });

      // ───── TC-001 เมนู Nursing Records บนหน้าผู้ป่วย ER ─────
      await checkStep(page, `${TC1} ขั้น 1 เปิดหน้าผู้ป่วย ER ของผู้ป่วย A (Visit เปิดอยู่ ยังไม่มี Admission)`, async () => {
        await gotoErDashboard(page);
        const patient = newTestPatient('Nrec2441');
        visit = await registerAndOpenErVisit(page, patient);
        note('ผู้ป่วย A', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
        // หน้าคัดกรองแบบใหม่ (dev-x 28 ต.ค. 2026) ไม่มีแท็บ Triage → helper ฟอร์มใหม่ (แบบเดียวกับ SBH-2528 / SBH-2355)
        await expectVisitHeader(page, visit);
        await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true }), 'หลังเปิด Visit ต้องอยู่หน้าคัดกรอง ER').toBeVisible({ timeout: 60_000 });
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
        // หน้าผู้ป่วย ER มีแถบเมนูขวาหลังคัดกรองแล้ว → บันทึกคัดกรองก่อน
        await fillErTriageForm(page, { level: TRIAGE_LEVEL, vitals: VITALS_NORMAL });
        await markEvidence(filled(erTriageLevel(page, TRIAGE_LEVEL).locator('xpath=..'), `ESI ${TRIAGE_LEVEL}`), clicked(erTriageSaveButton(page)));
        await snapEvidence(page, `ก่อนกด — บันทึกคัดกรอง ESI ${TRIAGE_LEVEL}`);
        await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
        await expect(main.getByText('Clinical Summary', { exact: true }), 'บันทึกคัดกรองแล้วหน้าต้องเปลี่ยนเป็น Overview ของ Visit').toBeVisible({ timeout: 60_000 });
        await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
        await expectVisitHeader(page, visit);
        await markEvidence(...[`HN ${visit.hn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first(), 'ผู้ป่วย A (Visit เปิดอยู่)')));
        await holdForClip(page);
      });

      // คลิป TC-001 เริ่มที่หน้า Overview ของผู้ป่วย A (ช่วงลงทะเบียน + คัดกรองอยู่ใน video.webm)
      await startClip(page, 'TC-001');
      await checkStep(page, `${TC1} ขั้น 2 แถบด้านขวามีเมนู Nursing Records`, async () => {
        const menu = nursingRecordsMenu(page);
        // แถบขวาพับเป็นไอคอน — ชี้เมาส์ให้กางจะเห็นชื่อเมนู
        await menu.hover({ force: true });
        await expect(menu, 'Expected: มีเมนู Nursing Records บนแท็บด้านขวาของหน้าผู้ป่วย ER').toBeVisible();
        await expect(menu).toContainText('Nursing Records');
        await markEvidence(expected(menu));
        await holdForClip(page);
      });

      await checkStep(page, `${TC1} ขั้น 3 กดเมนู Nursing Records แล้วเปิดหน้า Nursing Records ได้`, async () => {
        await openNursingRecords(page);
        await expect(nursingRecordsTab(page), 'Expected: กดแล้วเปิดหน้า Nursing Records ได้').toBeVisible();
        await expect(nursingRecordSelector(page)).toBeVisible();
        await markEvidence(expected(nursingRecordsTab(page)), expected(nursingRecordSelector(page)));
        await holdForClip(page);
      });

      let erLayout: Record<string, string> = {};
      let erTypes: string[] = [];
      await checkStep(page, `${TC1} ขั้น 4 ช่องเลือกประเภทบันทึก แล้วเลือก Nurse Focus Note`, async () => {
        erTypes = await openRecordTypeOptions(page);
        note('ตัวเลือกประเภทบันทึก (ER)', erTypes.join(' · '));
        await markEvidence(clicked(nursingRecordSelector(page)), expected(recordTypeDropdown(page)));
        await holdForClip(page);
        await snapEvidence(page, 'ตัวเลือกประเภทบันทึกของ ER');
        await chooseRecordType(page, NURSE_FOCUS_NOTE);
        await expect(nurseNoteTitle(page), 'Expected: เลือก Nurse Focus Note แล้วแสดงส่วน Nurse Note').toBeVisible();
        await expect(nurseNoteTab(page, 'Focus'), 'Expected: มีแท็บ Focus').toBeVisible();
        await expect(nurseNoteTab(page, 'Resolved'), 'Expected: มีแท็บ Resolved').toBeVisible();
        expect(erTypes, 'ที่ ER มี 2 ประเภท (สเปกของ dev)').toEqual([NURSE_FOCUS_NOTE, GRAPHICAL_SHEET_RECORD]);
        erLayout = await readNurseNoteLayout(page);
        await markEvidence(filled(nursingRecordSelector(page)), expected(nurseNoteTitle(page)), expected(nurseNoteTab(page, 'Focus')), expected(nurseNoteTab(page, 'Resolved')));
        await holdForClip(page);
      });

      await checkStep(page, `${TC1} ขั้น 5 เทียบกับหน้า Nursing Records ของผู้ป่วย IPD`, async () => {
        const admission = await fetchOpenAdmission(page, authorization());
        note('ผู้ป่วย IPD ที่ใช้เทียบ (เปิดดูอย่างเดียว)', `HN ${admission.hn} · AN ${admission.an}`);
        await gotoIpdPatient(page, admission);
        await openNursingRecords(page);
        const ipdTypes = await openRecordTypeOptions(page);
        note('ตัวเลือกประเภทบันทึก (IPD)', ipdTypes.join(' · '));
        await chooseRecordType(page, NURSE_FOCUS_NOTE);
        await expect(nurseNoteTitle(page)).toBeVisible();
        const ipdLayout = await readNurseNoteLayout(page);
        const rows: CompareRow[] = Object.keys(erLayout).map((label) => ({ label, values: [erLayout[label], ipdLayout[label]], same: erLayout[label] === ipdLayout[label] }));
        rows.push({ label: 'จำนวนประเภทบันทึก (ต่างกันได้ตามหมายเหตุของ TC)', values: [`${erTypes.length} ประเภท`, `${ipdTypes.length} ประเภท`], same: true });
        await showCompareTable(page, `SBH-2520 ส่วน Nurse Note: หน้า ER (${visit.en}) เทียบหน้า IPD (AN ${admission.an})`, ['หน้า ER', 'หน้า IPD (หน้าจอนี้)'], rows, { side: 'left', width: '760px' });
        await markEvidence(expected(nurseNoteTitle(page)), expected(nurseNoteTab(page, 'Focus')), expected(nurseNoteTab(page, 'Resolved')));
        await holdForClip(page, 3_000);
        expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'Expected: ส่วน Nurse Note ของ ER เป็นแบบเดียวกับหน้า Nursing Records ของ IPD').toEqual([]);
      });
      await hideCompareTable(page);

      // ───── TC-002 บันทึก Nurse Focus ─────
      const focusNote: NurseNoteInput = {
        focus: `AUTO ปวดท้อง ${new Date().toTimeString().slice(0, 8)}`,
        assessment: 'ผู้ป่วยบอกปวดท้อง pain score 5',
        intervention: 'จัดท่านอนศีรษะสูง ประเมินอาการซ้ำ',
        evaluation: 'pain score ลดเหลือ 3',
      };
      let focusSaved = false;
      await gotoVisit(page, visit);
      await startClip(page, 'TC-002');
      await soft(`${TC2} ขั้น 1-3 เปิด Nurse Focus Note แล้วสร้าง Focus ใหม่ กรอกข้อมูล`, async () => {
        await openNursingRecords(page);
        await chooseRecordType(page, NURSE_FOCUS_NOTE);
        await markEvidence(clicked(addNurseNoteButton(page)));
        await snapEvidence(page, 'ก่อนกด — ปุ่ม เพิ่ม Nurse Note');
        await addNurseNoteButton(page).click();
        const dialog = nurseNoteDialog(page);
        await expect(dialog).toBeVisible();
        const times = await fillNurseNote(page, focusNote);
        note('จดไว้ (Nurse Focus)', `Focus "${focusNote.focus}" · ${focusNote.assessment} · ${focusNote.intervention} · ${focusNote.evaluation} · Perform time ${times.join(' / ')}`);
        await markEvidence(filled(dialog.locator('#focus').first()), ...[0, 1, 2].map((index) => filled(dialog.locator('.ProseMirror').nth(index))), clicked(dialog.getByRole('button', { name: 'บันทึก' })));
        await holdForClip(page, 2_000);
      });

      await soft(`${TC2} ขั้น 4 กดบันทึก Nurse Focus ได้ ไม่ขึ้น error`, async () => {
        const dialog = nurseNoteDialog(page);
        await expect(dialog, 'ต้องเปิดหน้าต่าง Nurse Note ไว้จากขั้นก่อน').toBeVisible();
        const result = await saveNurseNote(page);
        const failedMessage = (result.status ?? 0) >= 400 ? ` ${result.message}` : '';
        note('ผลกดบันทึก Nurse Focus', `template ${result.template ?? '-'} → HTTP ${result.status ?? '(ไม่มีคำขอ)'}${failedMessage} · หน้าต่าง${result.closed ? 'ปิด' : 'ยังเปิดค้าง'} · แจ้งเตือน: ${result.notices.join(' | ') || '-'}`);
        // ถ่ายแจ้งเตือนถ้ายังอยู่บนจอ (หายเองใน ~4.5 วินาที — หายแล้วก็ข้าม)
        const notice = nurseNoteNotice(page).first();
        if (await notice.isVisible().catch(() => false)) {
          await markEvidence(alerted(notice), ...((await dialog.isVisible()) ? [clicked(dialog.getByRole('button', { name: 'บันทึก' }))] : [])).catch(() => undefined);
          await snapEvidence(page, 'หลังกด — แจ้งเตือน บันทึก Nurse Focus');
        }
        await holdForClip(page, 1_500);
        expect(`HTTP ${result.status}${failedMessage}`, `Expected: กดบันทึก Nurse Focus ได้ ไม่ขึ้น error — หน้าจอแจ้ง: ${result.notices.join(' | ') || '-'}`).toBe('HTTP 200');
        expect(result.closed, 'บันทึกสำเร็จแล้วหน้าต่าง Nurse Note ต้องปิด').toBe(true);
        focusSaved = true;
      });

      /** เทียบ Focus + A-I-E ชุดล่าสุดในการ์ด กับที่กรอก — แสดงตารางก่อน expect */
      const compareFocus = async (title: string, card: ReturnType<typeof focusCard>, want: NurseNoteInput) => {
        await expandFocus(card);
        const name = (await card.locator('[class*="_focus-name_"]').first().innerText()).trim();
        const latest = (await readFocusNotes(card))[0] ?? { A: '(ไม่มี)', I: '(ไม่มี)', E: '(ไม่มี)' };
        const rows: CompareRow[] = [
          { label: 'Focus', values: [`F: ${want.focus}`, name], same: name === `F: ${want.focus}` },
          { label: 'Assessment (A)', values: [want.assessment, latest.A], same: want.assessment === latest.A },
          { label: 'Intervention (I)', values: [want.intervention, latest.I], same: want.intervention === latest.I },
          { label: 'Evaluation (E)', values: [want.evaluation, latest.E], same: want.evaluation === latest.E },
        ];
        await showCompareTable(page, title, ['ที่กรอก', 'การ์ด Focus (หน้าจอ · A-I-E ชุดล่าสุด)'], rows, { side: 'left', width: '760px' });
        return rows;
      };
      const mismatches = (rows: CompareRow[]) => rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`);

      let resolved = false;
      if (focusSaved) {
        await soft(`${TC2} ขั้น 5 Focus ที่บันทึกแสดงในแท็บ Focus`, async () => {
          await dismissToast(page, 'บันทึกข้อมูลสำเร็จ');
          const card = focusCard(page, focusNote.focus);
          await expect(card, 'Expected: Focus ที่บันทึกแสดงในแท็บ Focus').toBeVisible({ timeout: 30_000 });
          const rows = await compareFocus('SBH-2521 Focus ที่บันทึก: ที่กรอก เทียบการ์ดในแท็บ Focus', card, focusNote);
          await markEvidence(expected(card));
          await holdForClip(page, 3_000);
          expect(mismatches(rows), 'Expected: Focus ที่บันทึกแสดงในแท็บ Focus ข้อมูลตรงกับที่กรอกในขั้นที่ 3').toEqual([]);
        });
        await hideCompareTable(page);
        await soft(`${TC2} ขั้น 6 ปิดหน้า Nursing Records แล้วเปิดใหม่ Focus ยังอยู่`, async () => {
          await closeNursingRecords(page);
          await openNursingRecords(page);
          await chooseRecordType(page, NURSE_FOCUS_NOTE);
          const card = focusCard(page, focusNote.focus);
          await expect(card, 'Expected: เปิดหน้า Nursing Records ใหม่แล้ว Focus ที่บันทึกยังอยู่').toBeVisible({ timeout: 30_000 });
          const rows = await compareFocus('SBH-2521 เปิดหน้าใหม่: ที่กรอก เทียบการ์ดในแท็บ Focus', card, focusNote);
          await markEvidence(expected(card));
          await holdForClip(page, 3_000);
          expect(mismatches(rows), 'เปิดใหม่แล้วข้อมูลของ Focus ยังตรงกับที่กรอก').toEqual([]);
        });
        await hideCompareTable(page);

        // ───── TC-003 เพิ่ม A-I-E และ Resolve Focus (Focus จาก TC-002) ─────
        const aie2: Omit<NurseNoteInput, 'focus'> = {
          assessment: 'ปวดท้องลดลง pain score 3 ไม่มีไข้',
          intervention: 'ให้ยาตามแผนการรักษา เฝ้าระวังอาการ',
          evaluation: 'pain score 1 ผู้ป่วยพักได้',
        };
        let aieSaved = false;
        await startClip(page, 'TC-003');
        await soft(`${TC3} ขั้น 2-3 เปิด Focus จาก TC-002 แล้วเพิ่มบันทึก A-I-E`, async () => {
          const card = focusCard(page, focusNote.focus);
          await expandFocus(card);
          const items = await openFocusMenu(page, card);
          note('เมนูของการ์ด Focus', items.join(' · '));
          await markEvidence(clicked(focusMenuItem(page, 'เพิ่มข้อมูล AIE')));
          await snapEvidence(page, 'ก่อนกด — เมนู เพิ่มข้อมูล AIE');
          await focusMenuItem(page, 'เพิ่มข้อมูล AIE').click();
          const dialog = nurseNoteDialog(page);
          await expect(dialog).toBeVisible();
          const times = await fillAie(page, aie2);
          note('จดไว้ (A-I-E ชุดที่ 2)', `${aie2.assessment} · ${aie2.intervention} · ${aie2.evaluation} · Perform time ${times.join(' / ')}`);
          await markEvidence(...[0, 1, 2].map((index) => filled(dialog.locator('.ProseMirror').nth(index))), clicked(dialog.getByRole('button', { name: 'บันทึก' })));
          await holdForClip(page, 1_500);
          await snapEvidence(page, 'ก่อนกด — บันทึก A-I-E ชุดที่ 2');
          const result = await saveNurseNote(page);
          note('ผลกดบันทึก A-I-E', `template ${result.template ?? '-'} → HTTP ${result.status ?? '(ไม่มีคำขอ)'} · หน้าต่าง${result.closed ? 'ปิด' : 'ยังเปิดค้าง'} · แจ้งเตือน: ${result.notices.join(' | ') || '-'}`);
          if (await nurseNoteNotice(page).first().isVisible().catch(() => false)) {
            await markEvidence(alerted(nurseNoteNotice(page).first())).catch(() => undefined);
            await snapEvidence(page, 'หลังกด — แจ้งเตือน บันทึก A-I-E');
          }
          expect(result.status, `Expected: บันทึก A-I-E ได้ ไม่ขึ้น error — ${result.message.slice(0, 160)}`).toBe(200);
          expect(result.closed, 'บันทึกสำเร็จแล้วหน้าต่างต้องปิด').toBe(true);
          aieSaved = true;
        });
        if (aieSaved)
          await soft(`${TC3} ขั้น 4 บันทึก A-I-E แสดงใต้ Focus นั้น`, async () => {
            await dismissToast(page, 'บันทึกข้อมูลสำเร็จ');
            const card = focusCard(page, focusNote.focus);
            await expect.poll(async () => (await readFocusNotes(card)).length, { message: 'การ์ดต้องมี A-I-E 2 ชุด', timeout: 30_000 }).toBe(2);
            const rows = await compareFocus('SBH-2522 A-I-E ชุดที่ 2: ที่กรอก เทียบชุดล่าสุดใต้ Focus', card, { focus: focusNote.focus, ...aie2 });
            await markEvidence(expected(card.locator('[class*="_nursing-note_"]').first()));
            await holdForClip(page, 3_000);
            expect(mismatches(rows), 'Expected: บันทึก A-I-E แสดงใต้ Focus นั้น ข้อมูลตรงกับที่กรอกในขั้นที่ 3').toEqual([]);
          });
        await hideCompareTable(page);

        await soft(`${TC3} ขั้น 5 กด Resolve Focus`, async () => {
          const card = focusCard(page, focusNote.focus);
          await openFocusMenu(page, card);
          await markEvidence(clicked(focusMenuItem(page, 'Resolved (ปิด)')));
          await holdForClip(page);
          await snapEvidence(page, 'ก่อนกด — เมนู Resolved (ปิด)');
          const result = await resolveFocus(page);
          // แจ้งเตือนผลของ Resolve หายเองใน ~4.5 วินาที → ถ่ายทันทีที่ขึ้น
          const resolveNotice = nurseNoteNotice(page).first();
          if (await resolveNotice.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false)) {
            await resolveNotice.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
            await markEvidence(alerted(resolveNotice)).catch(() => undefined);
            await snapEvidence(page, 'หลังกด — แจ้งเตือน Resolved (ปิด)');
          }
          const notices = await nurseNoteNotice(page).evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim()));
          note('ผลกด Resolved (ปิด)', `UpdateNursingFocusStatus → HTTP ${result.status}${result.error ? ` · errors: ${result.error}` : ' · ไม่มี error'} · แจ้งเตือนบนจอ: ${notices.join(' | ') || '-'}`);
          await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
          await page.mouse.move(700, 700);
          await holdForClip(page, 2_000);
          expect(result.error ?? '', 'Expected: Resolve Focus ได้ ไม่ขึ้น error (คำตอบของ UpdateNursingFocusStatus)').toBe('');
          resolved = true;
        });

        await soft(`${TC3} ขั้น 6 Focus อยู่แท็บ Resolved และไม่อยู่ในแท็บ Focus`, async () => {
          const inFocus = await focusCard(page, focusNote.focus, 'Focus').count();
          await markEvidence(expected(nurseNoteTab(page, 'Focus')), ...(inFocus ? [expected(focusCard(page, focusNote.focus, 'Focus'))] : []));
          await snapEvidence(page, 'แท็บ Focus หลังกด Resolved');
          await nurseNoteTab(page, 'Resolved').click();
          const inResolved = focusCard(page, focusNote.focus, 'Resolved');
          const resolvedShown = await inResolved.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false);
          note('หลัง Resolve', `แท็บ Focus: ${inFocus ? 'ยังมี Focus นี้' : 'ไม่มีแล้ว'} · แท็บ Resolved: ${resolvedShown ? 'มี Focus นี้' : 'ไม่มี'}`);
          await markEvidence(expected(nurseNoteTab(page, 'Resolved')), ...(resolvedShown ? [expected(inResolved)] : [expected(nurseNotePanel(page, 'Resolved'))]));
          await holdForClip(page, 2_000);
          expect({ แท็บFocus: inFocus ? 'ยังมี' : 'ไม่มี', แท็บResolved: resolvedShown ? 'มี' : 'ไม่มี' }, 'Expected: Resolve แล้ว Focus นั้นแสดงในแท็บ Resolved และไม่อยู่ในแท็บ Focus').toEqual({ แท็บFocus: 'ไม่มี', แท็บResolved: 'มี' });
        });
        await nurseNoteTab(page, 'Focus').click().catch(() => undefined);
      } else {
        // หน้าต่างที่ค้างจากการบันทึกไม่สำเร็จ: ปิดก่อนไปต่อ (ปุ่ม ยกเลิก)
        const dialog = nurseNoteDialog(page);
        if (await dialog.isVisible().catch(() => false)) {
          await dialog.getByRole('button', { name: 'ยกเลิก' }).click();
          await page.getByRole('button', { name: /^(ยืนยัน|ตกลง|ใช่)$/ }).click({ timeout: 2_000 }).catch(() => undefined);
          await expect(dialog).toBeHidden();
        }
        note(`${TC2} ขั้น 5-6`, 'ตรวจไม่ได้ — บันทึก Focus ไม่สำเร็จในขั้น 4');
        note(TC3, 'ตรวจไม่ได้ — ต้องใช้ Focus ที่บันทึกจาก TC-002');
      }

      // ───── TC-004 บันทึก Graphical Sheet Record ─────
      let sheetSaved = false;
      await startClip(page, 'TC-004');
      await soft(`${TC4} ขั้น 1-2 เปิด Nursing Records แล้วเลือก Graphical Sheet Record`, async () => {
        if (!(await nursingRecordSelector(page).isVisible().catch(() => false))) await openNursingRecords(page);
        await chooseRecordType(page, GRAPHICAL_SHEET_RECORD);
        await expect(sheetRecordButton(page), 'Expected: เลือก Graphical Sheet Record ได้').toBeVisible({ timeout: 30_000 });
        await expect(sheetTable(page)).toBeVisible();
        await markEvidence(filled(nursingRecordSelector(page)), expected(sheetRecordButton(page)), expected(sheetTable(page)));
        await holdForClip(page);
      });

      await soft(`${TC4} ขั้น 3 กรอกค่าแล้วกดบันทึก ไม่ขึ้น error`, async () => {
        await sheetRecordButton(page).click();
        await expect(sheetSaveButton(page)).toBeVisible();
        await fillSheetRecord(page, SHEET);
        note('จดไว้ (Graphical Sheet Record)', `BT ${SHEET.BT} · BP ${SHEET.SBP}/${SHEET.DBP} · PR ${SHEET.PR} · RR ${SHEET.RR} · SpO2 ${SHEET.SpO2} · Pain ${SHEET.pain} · Oral ${SHEET.Oral} ml · Urine ${SHEET.Urine} ml · ระดับความรู้สึกตัว ${SHEET.consciousness}`);
        await markEvidence(...(['BT', 'SBP', 'DBP', 'PR', 'RR', 'SpO2'] as const).map((label) => filled(sheetInput(page, label))), filled(sheetPainButton(page, SHEET.pain)), clicked(sheetSaveButton(page)));
        await holdForClip(page, 1_500);
        await snapEvidence(page, 'ก่อนกด — บันทึก Graphical Sheet (Vital signs)');
        await markEvidence(filled(sheetInput(page, 'Oral')), filled(sheetInput(page, 'Urine')), filled(sheetConsciousness(page)));
        await snapEvidence(page, 'ก่อนกด — บันทึก Graphical Sheet (Input Output)');
        const status = await saveSheetRecord(page);
        const toast = page.getByText('บันทึก Patient Data Record แล้ว').first();
        if (await toast.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false)) {
          await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          await markEvidence(alerted(toast));
          await snapEvidence(page, 'หลังกด — แจ้งเตือน บันทึก Graphical Sheet');
        }
        expect(status, 'Expected: กดบันทึกได้ ไม่ขึ้น error').toBeLessThan(300);
        await expect(sheetRows(page).first(), 'บันทึกแล้วต้องมีแถวในตาราง').toBeVisible({ timeout: 30_000 });
        sheetSaved = true;
        await markEvidence(expected(sheetRows(page).first()));
      });

      /** เทียบค่าที่กรอกกับแถวล่าสุดในตาราง — คืนแถวที่อ่านได้ */
      const compareSheet = async (title: string) => {
        const shown = (await readSheetRows(page))[0] ?? {};
        const want: Record<string, string> = { BT: SHEET.BT, BP: `${SHEET.SBP}/${SHEET.DBP}`, PR: SHEET.PR, RR: SHEET.RR, SpO2: `${SHEET.SpO2}%`, Pain: SHEET.pain, 'Input 24h': `${SHEET.Oral} ml`, 'Output 24h': `${SHEET.Urine} ml` };
        const rows: CompareRow[] = Object.entries(want).map(([label, value]) => ({ label, values: [value, shown[label] ?? '(ไม่มี)'], same: value === shown[label] }));
        // ตารางเทียบไว้ด้านล่าง — มุมขวาบนบังคอลัมน์ SpO2–Output ของแถวที่เป็นหลักฐาน (28 ต.ค. 2026 · R59)
        await showCompareTable(page, title, ['ค่าที่กรอก (ขั้น 3)', 'แถวในตาราง (หน้าจอ)'], rows, { side: 'bottom' });
        return { shown, rows };
      };

      if (sheetSaved) {
        await soft(`${TC4} ขั้น 4 รายการที่บันทึกแสดงในตาราง ค่าตรงกับที่กรอก`, async () => {
          await dismissToast(page, 'บันทึก Patient Data Record แล้ว');
          const { shown, rows } = await compareSheet('SBH-2523 Graphical Sheet Record: ค่าที่กรอก เทียบแถวในตาราง');
          note('แถวในตาราง Graphic Sheet Record', Object.entries(shown).map(([key, value]) => `${key}: ${value}`).join(' · '));
          await markEvidence(expected(sheetRows(page).first()));
          await holdForClip(page, 3_000);
          await expect(sheetRows(page), 'ตารางต้องมี 1 แถว (รายการที่เพิ่งบันทึก)').toHaveCount(1);
          expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'Expected: รายการที่บันทึกแสดงในหน้า Graphical Sheet Record ค่าตรงกับที่กรอก').toEqual([]);
        });
        await hideCompareTable(page);

        await soft(`${TC4} ขั้น 5 ปิดหน้า Nursing Records แล้วเปิดใหม่ รายการยังอยู่`, async () => {
          await closeNursingRecords(page);
          await markEvidence(expected(nursingRecordsMenu(page)));
          await snapEvidence(page, 'ปิดหน้า Nursing Records แล้ว');
          await openNursingRecords(page);
          await chooseRecordType(page, GRAPHICAL_SHEET_RECORD);
          await expect(sheetRows(page).first(), 'Expected: เปิดหน้า Nursing Records ใหม่แล้วรายการยังอยู่').toBeVisible({ timeout: 30_000 });
          const { rows } = await compareSheet('SBH-2523 เปิดหน้าใหม่: ค่าที่กรอก เทียบแถวในตาราง');
          await markEvidence(expected(sheetRows(page).first()));
          await holdForClip(page, 3_000);
          expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'เปิดใหม่แล้วค่าของรายการยังตรงกับที่กรอก').toEqual([]);
        });
        await hideCompareTable(page);
      }

      // ───── TC-006 ปิด Visit แล้วหน้าเป็นอ่านอย่างเดียว ─────
      const pendingFocus: NurseNoteInput = {
        focus: `AUTO Focus ค้าง ${new Date().toTimeString().slice(0, 8)}`,
        assessment: 'เวียนศีรษะเล็กน้อย',
        intervention: 'ให้นอนพัก วัดสัญญาณชีพซ้ำ',
        evaluation: 'อาการคงที่',
      };
      let pendingSaved = false;
      await startClip(page, 'TC-006');
      if (focusSaved)
        await soft(`${TC6} ขั้น 2 บันทึก Focus ใหม่อีก 1 รายการ ไม่ Resolve`, async () => {
          if (!(await nursingRecordSelector(page).isVisible().catch(() => false))) await openNursingRecords(page);
          await chooseRecordType(page, NURSE_FOCUS_NOTE);
          await addNurseNoteButton(page).click();
          await expect(nurseNoteDialog(page)).toBeVisible();
          await fillNurseNote(page, pendingFocus);
          const result = await saveNurseNote(page);
          note('Focus ใหม่ที่ไม่ Resolve', `"${pendingFocus.focus}" → HTTP ${result.status ?? '-'} · หน้าต่าง${result.closed ? 'ปิด' : 'ค้าง'}`);
          expect(result.status).toBe(200);
          await expect(focusCard(page, pendingFocus.focus)).toBeVisible({ timeout: 30_000 });
          pendingSaved = true;
          await dismissToast(page, 'บันทึกข้อมูลสำเร็จ');
          await markEvidence(expected(focusCard(page, pendingFocus.focus)));
          await holdForClip(page);
        });
      else note(`${TC6} ขั้น 1-2`, 'ข้าม — บันทึก Focus ไม่ได้ จึงไม่มี Focus ที่ Resolve แล้ว / Focus ที่ค้างอยู่ ให้ตรวจ');
      if (focusSaved && !resolved) note(`${TC6} ขั้น 1`, 'Focus จาก TC-002 Resolve ไม่สำเร็จ (TC-003) — จึงยังอยู่แท็บ Focus แทนที่จะอยู่แท็บ Resolved');
      let closed = false;
      await soft(`${TC6} ขั้น 3 ปิด Visit ของผู้ป่วย A ที่การเงิน`, async () => {
        const result = await closeVisitAtCashier(page, visit.hn, visit.vn, async (close) => {
          await markEvidence(expected(main.getByText(visit.vn, { exact: true }).first()), clicked(close));
          await holdForClip(page);
          await snapEvidence(page, 'ก่อนกด — ปิด Visit ที่การเงิน');
        });
        note('ปิด Visit ที่การเงิน', `${result.result}${result.outstanding ? ` · ยอดค้างชำระ ${result.outstanding}` : ''}`);
        closed = true;
        await markEvidence(expected(main.getByRole('button', { name: 'ปลดล็อค' })));
        await holdForClip(page);
      });

      if (closed) {
        await soft(`${TC6} ขั้น 4 เปิดหน้าผู้ป่วย ER ของ Visit ที่ปิดแล้ว แล้วเปิด Nursing Records`, async () => {
          await gotoVisit(page, visit);
          await openNursingRecords(page);
          await page.mouse.move(700, 700);
          // หน้า Visit ที่ปิดแล้ว (dev-x 28 ต.ค. 2026): แท็บ Nursing Records ที่ระบบเปิดคืนให้เองไม่ตรง locator แท็บ · เลข EN ก็หาไม่เจอ (ตีกรอบแล้วค้าง 20 วิ ทั้ง 2 แบบ)
          // → ตีกรอบช่องเลือกประเภทบันทึก (openNursingRecords ตรวจแล้วว่าเห็น) + หัวข้อ Nurse Note
          await expect(nurseNoteTitle(page), 'Expected: เปิดหน้า Nursing Records ของ Visit ที่ปิดแล้วได้').toBeVisible({ timeout: 30_000 });
          await markEvidence(expected(nursingRecordSelector(page), 'เปิด Nursing Records ของ Visit ที่ปิดแล้ว'), expected(nurseNoteTitle(page)));
          await holdForClip(page);
        });

        await soft(`${TC6} ขั้น 5 Nurse Focus Note: สร้าง Focus ใหม่ไม่ได้`, async () => {
          await chooseRecordType(page, NURSE_FOCUS_NOTE);
          await expect(nurseNoteTitle(page)).toBeVisible();
          await expect(nurseNoteTab(page, 'Focus')).toBeVisible();
          const add = addNurseNoteButton(page);
          const state = !(await add.count()) ? 'ไม่มีปุ่ม' : (await add.isDisabled()) ? 'ปุ่มกดไม่ได้ (disabled)' : 'ปุ่มยังกดได้';
          note('ปุ่ม + เพิ่ม Nurse Note หลังปิด Visit', state);
          await markEvidence(expected(nurseNoteTitle(page).locator('xpath=..'), `${state} + เพิ่ม Nurse Note`), expected(nurseNoteTab(page, 'Focus')));
          await holdForClip(page, 2_000);
          expect(state, 'Expected: ปิด Visit แล้วสร้าง Focus ใหม่ไม่ได้').not.toBe('ปุ่มยังกดได้');
        });

        if (focusSaved)
          await soft(`${TC6} ขั้น 5 Nurse Focus Note: บันทึกเดิมยังแสดง และเพิ่ม A-I-E / Resolve ไม่ได้`, async () => {
            // Focus ที่ยังค้างในแท็บ Focus (Focus ใหม่ของขั้น 2 + Focus ของ TC-002 ถ้า Resolve ไม่สำเร็จ)
            const pendingNames = [...(pendingSaved ? [pendingFocus.focus] : []), ...(resolved ? [] : [focusNote.focus])];
            const shown: string[] = [];
            for (const name of pendingNames) if (await focusCard(page, name).waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false)) shown.push(name);
            const menus: string[] = [];
            for (const name of shown) {
              const items = await openFocusMenu(page, focusCard(page, name));
              menus.push(`${name}: ${items.join(' · ') || '(ไม่มีเมนู)'}`);
              await page.keyboard.press('Escape');
            }
            note('การ์ด Focus หลังปิด Visit', `แท็บ Focus แสดง ${shown.length}/${pendingNames.length} รายการ · เมนู: ${menus.join(' | ') || '-'}`);
            if (shown.length) {
              await openFocusMenu(page, focusCard(page, shown[0]));
              const hasMenu = (await page.locator('.ant-dropdown:visible').count()) > 0;
              await markEvidence(expected(focusCard(page, shown[0]), hasMenu ? 'การ์ด Focus ที่ค้าง' : 'การ์ด Focus ที่ค้าง — ไม่มีปุ่มเมนู ⋮ (เพิ่ม A-I-E / Resolve ไม่ได้)'), ...(hasMenu ? [expected(page.locator('.ant-dropdown:visible'))] : []));
              await holdForClip(page, 2_000);
              await snapEvidence(page, 'หลังปิด Visit — เมนูของการ์ด Focus');
              await page.keyboard.press('Escape');
            }
            if (resolved) {
              await nurseNoteTab(page, 'Resolved').click();
              const resolvedCard = focusCard(page, focusNote.focus, 'Resolved');
              await expect(resolvedCard, 'Expected: Focus ที่ Resolve แล้วยังแสดงในแท็บ Resolved หลังปิด Visit').toBeVisible({ timeout: 20_000 });
              const resolvedMenu = await openFocusMenu(page, resolvedCard).catch(() => [] as string[]);
              note('การ์ด Focus ในแท็บ Resolved หลังปิด Visit', `${focusNote.focus}: เมนู ${resolvedMenu.join(' · ') || '(ไม่มีเมนู)'}`);
              await markEvidence(expected(nurseNoteTab(page, 'Resolved'), 'แท็บ Resolved'), expected(resolvedCard, 'Focus ที่ Resolve แล้วยังแสดง'));
              await snapEvidence(page, 'หลังปิด Visit — แท็บ Resolved');
              await page.keyboard.press('Escape');
              await nurseNoteTab(page, 'Focus').click();
              expect(resolvedMenu.filter((m) => /เพิ่มข้อมูล AIE|Resolved \(ปิด\)|แก้ไข/.test(m)), 'ปิด Visit แล้วการ์ดในแท็บ Resolved แก้ไม่ได้').toEqual([]);
            }
            expect(shown, 'Expected: บันทึกเดิมของ Nurse Focus Note ยังแสดงครบ').toEqual(pendingNames);
            expect(menus.filter((m) => /เพิ่มข้อมูล AIE|Resolved \(ปิด\)/.test(m)), 'Expected: ปิด Visit แล้วเพิ่ม A-I-E และ Resolve ไม่ได้').toEqual([]);
          });

        await soft(`${TC6} ขั้น 6 Graphical Sheet Record: รายการเดิมยังแสดง และบันทึกใหม่ไม่ได้`, async () => {
          await chooseRecordType(page, GRAPHICAL_SHEET_RECORD);
          await expect(sheetTable(page)).toBeVisible({ timeout: 30_000 });
          if (sheetSaved) await expect(sheetRows(page).first(), 'Expected: บันทึกเดิมของ Graphical Sheet Record ยังแสดงครบ').toBeVisible({ timeout: 30_000 });
          const { rows } = sheetSaved ? await compareSheet('SBH-2525 หลังปิด Visit: ค่าที่กรอก เทียบแถวในตาราง') : { rows: [] as CompareRow[] };
          const record = sheetRecordButton(page);
          const state = !(await record.count()) ? 'ไม่มีปุ่ม' : (await record.isDisabled()) ? 'ปุ่มกดไม่ได้ (disabled)' : 'ปุ่มยังกดได้';
          note('ปุ่ม + Record หลังปิด Visit', state);
          const readOnly = main.getByText(/บันทึกการพยาบาลเป็นแบบอ่านอย่างเดียว/).filter({ visible: true }).first();
          const readOnlyShown = await readOnly.isVisible().catch(() => false);
          note('แถบแจ้งอ่านอย่างเดียว (Graphical Sheet)', readOnlyShown ? (await readOnly.innerText()).trim() : 'ไม่เห็น');
          await markEvidence(
            ...(sheetSaved ? [expected(sheetRows(page).first(), 'รายการเดิมยังแสดง')] : [expected(sheetTable(page))]),
            ...(readOnlyShown ? [alerted(readOnly)] : []),
            ...((await record.count()) ? [expected(record, state)] : []),
          );
          await holdForClip(page, 3_000);
          expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'หลังปิด Visit ค่าของรายการเดิมยังตรงกับที่กรอก').toEqual([]);
          expect(state, 'Expected: ปิด Visit แล้วบันทึก Graphical Sheet Record ใหม่ไม่ได้').not.toBe('ปุ่มยังกดได้');
        });
        await hideCompareTable(page);
      }

      await test.info().attach('คำตอบของเซิร์ฟเวอร์ฟอร์ม', { body: formCalls.join('\n'), contentType: 'text/plain' });
      console.log(`    เซิร์ฟเวอร์ฟอร์ม:\n      ${formCalls.join('\n      ')}`);
      expect(failures, 'ขั้นที่ไม่ผ่าน / ยังตรวจไม่ครบ').toEqual([]);
    },
  );

  test(
    'ผู้ป่วย B: บันทึก Graphical Sheet Record ที่ ER → Admit Request + AN (ไม่เลือกเตียง) → หน้า Nursing Records ของ AN เห็นรายการจาก ER (Super_User)',
    { tag: ['@SBH-2441', '@SBH-2524'], annotation: ['SBH-2441', 'SBH-2524'].map(linear) },
    async ({ page }) => {
      const main = page.getByRole('main');
      const TC5 = 'TC-005 (SBH-2524)';
      const authorization = trackAuthorization(page);
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      let visit!: ErVisit;
      let an = '';
      // SBH2441_B=<HN>,<VN>,<EN>[,admission] = ทำต่อกับผู้ป่วย B เดิมที่บันทึก Graphical Sheet ที่ ER ไว้แล้ว (ข้ามขั้น 1-2 · ใส่ admission = มี Admit Request แล้ว ทำต่อที่สร้าง AN)
      const [resumeHn, resumeVn, resumeEn, resumeStage] = (process.env.SBH2441_B ?? '').split(',');

      if (resumeEn) {
        visit = { hn: resumeHn, vn: resumeVn, en: resumeEn };
        note('ทำต่อกับผู้ป่วย B เดิม', `HN ${visit.hn} · ${visit.vn} · ${visit.en}${resumeStage ? ` · ต่อที่ขั้น ${resumeStage}` : ''} (บันทึก Graphical Sheet ที่ ER ไว้ในรอบก่อน)`);
      } else await checkStep(page, `${TC5} ขั้น 1 เปิดหน้าผู้ป่วย ER ของผู้ป่วย B (Visit เปิดอยู่ ยังไม่มี Admission)`, async () => {
        await gotoErDashboard(page);
        const patient = newTestPatient('NrecB2441');
        visit = await registerAndOpenErVisit(page, patient);
        note('ผู้ป่วย B', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
        await expectVisitHeader(page, visit);
        await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
        await fillErTriageForm(page, { level: TRIAGE_LEVEL, vitals: VITALS_NORMAL });
        await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
        await expect(main.getByText('Clinical Summary', { exact: true })).toBeVisible({ timeout: 60_000 });
        await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
        await expectVisitHeader(page, visit);
        await markEvidence(...[`HN ${visit.hn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first())));
        await holdForClip(page);
      });

      note(`${TC5} ขั้น 2 ส่วน Focus`, 'ไม่ได้บันทึก — บันทึก Nurse Focus บน dev-x ไม่ได้ (template nursing_focus_v2 ยังไม่ขึ้น · ดู TC-002)');
      if (!resumeEn) await checkStep(page, `${TC5} ขั้น 2 บันทึก Graphical Sheet Record ที่ ER 1 รายการ`, async () => {
        await openNursingRecords(page);
        await chooseRecordType(page, GRAPHICAL_SHEET_RECORD);
        await sheetRecordButton(page).click();
        await expect(sheetSaveButton(page)).toBeVisible();
        await fillSheetRecord(page, SHEET);
        note('จดไว้ (Graphical Sheet Record ที่ ER)', `BT ${SHEET.BT} · BP ${SHEET.SBP}/${SHEET.DBP} · PR ${SHEET.PR} · RR ${SHEET.RR} · SpO2 ${SHEET.SpO2} · Pain ${SHEET.pain} · Oral ${SHEET.Oral} ml · Urine ${SHEET.Urine} ml`);
        await markEvidence(...(['BT', 'SBP', 'DBP', 'PR', 'RR', 'SpO2'] as const).map((label) => filled(sheetInput(page, label))), clicked(sheetSaveButton(page)));
        await snapEvidence(page, 'ก่อนกด — บันทึก Graphical Sheet ที่ ER');
        expect(await saveSheetRecord(page), 'บันทึก Graphical Sheet Record ที่ ER ได้').toBeLessThan(300);
        await expect(sheetRows(page).first()).toBeVisible({ timeout: 30_000 });
        await dismissToast(page, 'บันทึก Patient Data Record แล้ว');
        await markEvidence(expected(sheetRows(page).first()));
        await holdForClip(page);
      });

      // ตั้งแต่ขั้นนี้ไม่ปิด Visit ท้ายเทส (จะได้ทำต่อกับรายเดิมด้วย SBH2441_B ถ้าพังกลางทาง · Admission ค้างไว้ได้บน dev-x — R30)
      opened.delete(visit.en);
      await checkStep(page, `${TC5} ขั้น 3 สร้าง Admit Request จาก Visit นี้ แล้วสร้าง AN (ไม่เลือกเตียง)`, async () => {
        await gotoVisit(page, visit);
        if (resumeStage !== 'admission') {
          const request = await createAdmitRequest(page, 'ปวดท้อง ต้องนอนโรงพยาบาล (SBH-2524)');
          note('Admit Request', `Dx ${request.diagnosis} · หอผู้ป่วย ${request.ward} · จากแผนก ${request.fromDepartment}`);
          await gotoVisit(page, visit);
        }
        an = await createAdmissionWithoutBed(page);
        note('Admission', `AN ${an} (ไม่เลือกเตียง — R30 · TC ต้องการรับเข้าหอจนมีเตียง)`);
        await markEvidence(alerted(page.getByText(new RegExp(`AN ${an}`)).first()));
        await holdForClip(page, 2_000);
      });

      await checkStep(page, `${TC5} ขั้น 4-5 เปิดหน้า IPD ของ AN แล้วดู Graphical Sheet Record`, async () => {
        await gotoIpdPatient(page, { hn: visit.hn, an });
        // หอผู้ป่วยเห็นบันทึกจาก ER เฉพาะ AN ที่ผูกกับ Admit Request ของ Visit นั้น (หมายเหตุของ TC) — ไม่ผูก = ตรวจด้วย AN นี้ไม่ได้ ไม่ใช่บั๊ก
        const origin = await fetchAdmissionOrigin(page, authorization(), an);
        note('Visit ต้นทางของ AN (API)', origin ? `${origin.requestedVn} · ${origin.requestedEn}` : 'ไม่มี (admitRequest: null)');
        expect(origin?.requestedVn, `ตรวจไม่ได้ — AN ${an} ไม่ผูกกับ Admit Request ของ ${visit.vn} (สร้างจากเมนู จัดการ Admission โดยไม่เลือกเตียง) · TC ต้องใช้ AN ที่รับจาก Admit Request จนมีเตียง`).toBe(visit.vn);
        await expect(main.getByText(`AN ${an}`).first()).toBeVisible({ timeout: 30_000 });
        await openNursingRecords(page);
        await chooseRecordType(page, GRAPHICAL_SHEET_RECORD);
        await expect(sheetTable(page)).toBeVisible({ timeout: 30_000 });
        await expect(sheetRows(page).first(), 'Expected: หน้า Nursing Records ของ AN แสดงรายการ Graphical Sheet Record ที่บันทึกจาก ER').toBeVisible({ timeout: 30_000 });
        const shown = (await readSheetRows(page))[0] ?? {};
        note('แถวในตาราง (หน้า IPD ของ AN)', Object.entries(shown).map(([key, value]) => `${key}: ${value}`).join(' · '));
        const want: Record<string, string> = { BT: SHEET.BT, BP: `${SHEET.SBP}/${SHEET.DBP}`, PR: SHEET.PR, RR: SHEET.RR, SpO2: `${SHEET.SpO2}%`, Pain: SHEET.pain, 'Input 24h': `${SHEET.Oral} ml`, 'Output 24h': `${SHEET.Urine} ml` };
        const rows: CompareRow[] = Object.entries(want).map(([label, value]) => ({ label, values: [value, shown[label] ?? '(ไม่มี)'], same: value === shown[label] }));
        await showCompareTable(page, `SBH-2524 ค่าที่บันทึกที่ ER (${visit.vn}) เทียบแถวในหน้า IPD (AN ${an})`, ['ค่าที่บันทึกที่ ER', 'แถวในตาราง (หน้า IPD)'], rows);
        await markEvidence(expected(main.getByText(`AN ${an}`).first()), expected(sheetRows(page).first()));
        await holdForClip(page, 3_000);
        expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'ค่าของรายการจาก ER ที่หน้า IPD ตรงกับที่บันทึก').toEqual([]);
      });
      await hideCompareTable(page);
      note(`${TC5} ขั้น 5-7 ส่วน Focus (เห็น Focus จาก ER · เพิ่ม A-I-E · Resolve)`, 'ตรวจไม่ได้ — ไม่มี Focus ที่บันทึกจาก ER');
      // ผู้ป่วยที่มี Admission แล้ว: ไม่ปิด Visit (Admission ค้างไว้ได้บน dev-x — R30) — afterEach ข้ามรายนี้
      opened.delete(visit.en);
      note('หลังเทส', `HN ${visit.hn} · ${visit.vn} · AN ${an}: ไม่ปิด Visit (มี Admission แล้ว ไม่มีเตียง)`);
    },
  );
});
