import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { cprButton, openCprForm, saveCprEvent } from '../../../helpers/functions/er-cpr';
import {
  physicianNoteAlerts,
  physicianNoteDiagnosis,
  physicianNoteIllness,
  physicianNotePanel,
  physicianNoteSaveButton,
  startPhysicianNote,
  waitPhysicianNoteForm,
} from '../../../helpers/functions/er-physician-note';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { fetchTreatmentTimeline, openTimelineTab, readTimeline, timelineRow, timelineTab, type TimelineEvent, type TimelineRow } from '../../../helpers/functions/er-timeline';
import { erTriageLevel, erTriagePanel, erTriageSaveButton, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SETTINGS, SYSTEM, registerAndOpenErVisit, submitOrders } from '../../../mock-data/uat-er';
import { VITALS_HIGH_MEWS, VITALS_NORMAL, gotoVisit, recordMenu } from '../../../mock-data/uat-play';

// SBH-2355 [Bug][ER][Treatment Timeline] Event บางรายการแสดงชื่อ Account แทนชื่อ User — Expected: แสดงชื่อผู้ใช้งานได้ถูกต้อง
// ชุด EXE SBH-2969 → SC SBH-2970 → TC-001…007 = SBH-2971…2977 (ผู้ป่วยรายเดียวต่อเนื่อง) → 1 เทส 1 flow (R9) · คลิปแยกต่อ TC (R61)
// ลำดับรัน: TC-001 → TC-003 → 004 → 005 → 006 → 007 → TC-002 ท้ายสุด (ผู้ใช้สั่ง 28 ต.ค. 2026: บันทึก Physician Note บน dev-x ยังไม่ได้ ให้ลองท้ายงาน)
// "ชื่อผู้ใช้งานที่ถูกต้อง" = ชื่อที่แถว "เปิด ER Visit / ผู้ป่วยมาถึง" แสดง (ทำด้วยบัญชีเดียวกัน — Super_User = user1)
// ข้อมูล: ผู้ป่วย AUTO ใหม่ 1 ราย → Visit ER → Triage ESI 2 (MEWS สูง) → ... → ปิด Visit ที่การเงินท้ายเทส (afterEach)
// รัน (dev-x): npx playwright test --headed --grep @SBH-2355
// SBH2355_VISIT=<HN>,<VN>,<EN> = ทำต่อกับผู้ป่วยเดิม (Triage แล้ว) · SBH2355_ONLY=1,3,… = เล่นเฉพาะ TC ที่ระบุ · SBH2355_KEEP=1 = ไม่ปิด Visit ท้ายเทส

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ISSUE: Record<number, string> = { 1: 'SBH-2971', 2: 'SBH-2972', 3: 'SBH-2973', 4: 'SBH-2974', 5: 'SBH-2975', 6: 'SBH-2976', 7: 'SBH-2977' };
const TC = (n: number) => `TC-00${n} (${ISSUE[n]})`;
const ARRIVED = 'เปิด ER Visit / ผู้ป่วยมาถึง';
const ACCOUNT_NAME = /example/i;

/** ชื่อ event บน Timeline (locale er.json timeline.eventType) */
const LABEL: Record<string, string> = {
  ER_VISIT_ARRIVED: ARRIVED,
  FIRST_TRIAGE: 'คัดกรองครั้งแรก',
  PHYSICIAN_TREATMENT_STARTED: 'แพทย์เริ่มการรักษา',
  PHYSICIAN_EXAM_COMPLETED: 'แพทย์ตรวจเสร็จสิ้น',
  CPR_STARTED: 'เริ่ม CPR',
  CPR_CYCLE_UPDATED: 'บันทึกรอบ CPR',
  CPR_STOPPED: 'หยุด CPR',
  ER_REASSESSMENT: 'คัดกรองซ้ำ',
  ORDER_SENT: 'ส่ง Order',
};

test.describe(`SBH-2355 Timeline แสดงชื่อผู้ใช้งานที่ทำรายการ ไม่ใช่ชื่อ Account (${SYSTEM})`, () => {
  // ลงทะเบียน + Triage + Physician Note + CPR 4 ครั้ง + คัดกรองซ้ำ + Order + เปิด Timeline 7 รอบ + ปิด Visit
  test.describe.configure({ timeout: 1_500_000 });

  let opened: Map<string, ErVisit>;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page);
    if (process.env.SBH2355_KEEP) return;
    const reuse = (process.env.SBH2355_VISIT ?? '').split(',').filter(Boolean);
    const visits = [...opened.values(), ...(reuse.length === 3 ? [{ hn: reuse[0], vn: reuse[1], en: reuse[2] }] : [])];
    for (const visit of visits) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  test(
    'ผู้ป่วย AUTO ใหม่: ทำ 6 Event ของการ์ด + Event เดิม แล้วดูชื่อผู้ทำบน Timeline (Super_User = user1)',
    { tag: ['@SBH-2355', ...Object.values(ISSUE).map((id) => `@${id}`)], annotation: [linear('SBH-2355'), ...Object.values(ISSUE).map(linear)] },
    async ({ page }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const { note, soft, finish } = makeRunner(page);
      const only = (process.env.SBH2355_ONLY ?? '').split(',').filter(Boolean).map(Number);
      const runs = (n: number) => !only.length || only.includes(n);
      const reuse = (process.env.SBH2355_VISIT ?? '').split(',').filter(Boolean);
      const triageToast = page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true });
      const cprToast = page.getByText('บันทึก CPR progression แล้ว', { exact: true });
      const summary = main.getByText('Clinical Summary', { exact: true });
      let visit!: ErVisit;
      let arrivedName = '';

      /** ถ่ายแจ้งเตือนทันทีที่ขึ้น (หายเองใน ~4.5 วินาที) — ไม่ขึ้นใน 10 วินาทีก็ไปต่อ (ผลบันทึกยืนยันจาก API แล้ว) */
      const snapToast = async (toast: ReturnType<typeof page.getByText>, name: string) => {
        const shown = toast.first();
        if (!(await shown.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false))) return;
        await shown.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
        await markEvidence(alerted(shown));
        await snapEvidence(page, name);
      };

      /** กลับหน้า Overview ของ Visit (หน้าประวัติการรักษาที่เปิดอยู่เบียดจอ) */
      const backToVisit = async () => {
        await hideCompareTable(page);
        await gotoVisit(page, visit);
        await expect(summary, 'หน้า Visit ต้องเป็น Overview').toBeVisible({ timeout: 60_000 });
      };

      /** รอจน API ของ Timeline มี event ชนิดนี้ครบจำนวน (อ่านอย่างเดียว) */
      const waitEvents = async (type: string, count = 1) => {
        let events: TimelineEvent[] = [];
        await expect
          .poll(async () => (events = await fetchTreatmentTimeline(page, authorization(), visit)).filter((event) => event.type === type).length, { message: `API ของ Timeline ต้องมี ${LABEL[type]} ${count} รายการ`, timeout: 45_000 })
          .toBeGreaterThanOrEqual(count);
        return events;
      };

      /** เมนูซ้าย ประวัติการรักษา → ตีกรอบ Encounter + แท็บ Timeline → กดแท็บ → รอรายการขึ้น */
      const openTimeline = async (n: number) => {
        await checkStep(page, `${TC(n)} ขั้น เปิดประวัติการรักษา > Encounter ER นี้ > แท็บ Timeline`, async () => {
          await recordMenu(page, 'ประวัติการรักษา');
          const tab = timelineTab(page);
          await expect(tab).toBeVisible({ timeout: 45_000 });
          // แถบเมนูซ้ายกางค้างบังรายการ Encounter → คลิกแท็บ ER Summary ที่เปิดอยู่แล้วให้หุบก่อนถ่าย
          await main.getByRole('tab', { name: 'ER Summary', exact: true }).first().click();
          await page.mouse.move(700, 700);
          const encounterRow = main.getByText(visit.en, { exact: true }).filter({ visible: true }).last();
          await markEvidence(expected(encounterRow, `Encounter ${visit.en}`), clicked(tab));
          await snapEvidence(page, 'ก่อนกด — แท็บ Timeline');
          await openTimelineTab(page);
          await page.mouse.move(700, 700);
        });
      };

      /** บรรทัด "โดย …" ของแถว */
      const actorLine = (row: ReturnType<typeof timelineRow>) => row.locator('[class*="_event-actor_"]');

      /**
       * ตรวจชื่อผู้ทำของ event: หน้าจอ (ทุกแถวของ event นั้น) = API = ชื่อของแถว เปิด ER Visit / ผู้ป่วยมาถึง และไม่ใช่ชื่อ Account
       * แสดงตารางเทียบก่อน expect (ภาพ Error เห็นแถวที่ไม่ตรง)
       */
      const verifyActors = async (n: number, types: string[], counts: Record<string, number> = {}) => {
        const events = await fetchTreatmentTimeline(page, authorization(), visit);
        const shown = await readTimeline(page);
        console.log(`    Timeline: ${shown.map((row) => `${row.time} ${row.label} [${row.actor}]`).join(' | ')}`);
        await test.info().attach(`Timeline ${TC(n)}`, { body: JSON.stringify({ shown, events }, null, 2), contentType: 'application/json' });
        const arrived = shown.find((row) => row.label === ARRIVED);
        arrivedName = (arrived?.actor ?? '').replace(/^โดย\s*/, '');
        const rows: CompareRow[] = [];
        for (const type of types) {
          const onScreen = shown.filter((row) => row.label === LABEL[type]);
          const fromApi = events.filter((event) => event.type === type);
          const expectedCount = counts[type] ?? 1;
          for (let i = 0; i < Math.max(expectedCount, onScreen.length, fromApi.length); i++) {
            const screen = (onScreen[i]?.actor ?? '(ไม่มีแถว)').replace(/^โดย\s*/, '');
            const api = fromApi[i]?.actor?.display ?? '(ไม่มีใน API)';
            const label = `${LABEL[type]}${expectedCount > 1 ? ` (แถว ${i + 1})` : ''} ${onScreen[i]?.time ?? ''}`.trim();
            rows.push({ label, values: [screen, api, arrivedName || '(ไม่มีแถว)'], same: screen === arrivedName && api === arrivedName && !ACCOUNT_NAME.test(screen) });
          }
        }
        await showCompareTable(page, `${ISSUE[n]} ชื่อผู้ทำบน Timeline`, ['หน้าจอ (โดย …)', 'API (actor.display)', `ชื่อของแถว "${ARRIVED}"`], rows, { side: 'left' });
        // ตีกรอบเฉพาะแถวที่มีบนจอ (แถวที่ไม่มี เช่น คัดกรองซ้ำ ที่ไม่เข้า Timeline — ตารางเทียบแสดง "ไม่มีแถว" แทน)
        const marks = [];
        // แถว เปิด ER Visit ตีกรอบเป็น "ชื่อที่ใช้เทียบ" แล้ว — ไม่ตีซ้ำ (กรอบซ้อนทำให้ป้ายเลื่อนไปลอยข้างแถวอื่น · TC-007 run 6)
        for (const type of types.filter((t) => t !== 'ER_VISIT_ARRIVED')) {
          const line = actorLine(timelineRow(page, LABEL[type]));
          const count = await line.count();
          for (let i = 0; i < count; i++) marks.push(expected(line.nth(i), count > 1 ? `ชื่อผู้ทำ แถว ${i + 1}` : 'ชื่อผู้ทำ'));
        }
        await markEvidence(expected(actorLine(timelineRow(page, ARRIVED)).first(), 'ชื่อที่ใช้เทียบ'), ...marks);
        await snapEvidence(page, `ผลเทียบชื่อ ${TC(n).slice(0, 6)}`);
        await holdForClip(page, 2_500);
        note(`${TC(n)} ชื่อผู้ทำ`, rows.map((row) => `${row.label}: จอ "${row.values[0]}" · API "${row.values[1]}"`).join(' | '));
        expect(arrivedName, `แถว "${ARRIVED}" ต้องแสดงชื่อผู้ใช้งาน (ใช้เป็นชื่อที่ถูกต้อง)`).toMatch(/\S/);
        expect(arrivedName, `แถว "${ARRIVED}" ต้องไม่ใช่ชื่อ Account`).not.toMatch(ACCOUNT_NAME);
        for (const type of types) {
          await expect(timelineRow(page, LABEL[type]), `Timeline ต้องมีแถว "${LABEL[type]}" ${counts[type] ?? 1} แถว`).toHaveCount(counts[type] ?? 1);
        }
        expect(rows.filter((row) => !row.same).map((row) => `${row.label}: จอ "${row.values[0]}" · API "${row.values[1]}" (ต้องเป็น "${arrivedName}")`), `Expected: แสดง "โดย ${arrivedName}" ไม่แสดงชื่อ Account`).toEqual([]);
      };

      // ---------- Pre-condition / TC-001 ขั้น 1: ผู้ป่วยใหม่ เปิด Visit ER + คัดกรองครั้งแรก ----------
      // คลิปแยก TC เริ่มได้หลังหน้าแรกโหลด (fixture เริ่มอัดหลังโหลดแอป) → startClip หลัง goto ครั้งแรก
      if (reuse.length) {
        visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
        note('ทำต่อกับผู้ป่วยเดิม', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
        await gotoVisit(page, visit);
        await expect(summary).toBeVisible({ timeout: 60_000 });
        await startClip(page, 'TC-001');
      } else {
        await checkStep(page, `${TC(1)} ขั้น 1 เปิด Visit ER ให้ผู้ป่วยรายใหม่`, async () => {
          await gotoErDashboard(page);
          await startClip(page, 'TC-001');
          const patient = newTestPatient('Actor2355');
          visit = await registerAndOpenErVisit(page, patient);
          note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en} · SBH2355_VISIT=${visit.hn},${visit.vn},${visit.en}`);
          // หน้าคัดกรองแบบใหม่ (dev-x 28 ต.ค. 2026) ไม่มีแท็บ Triage → expectTriageFormOpen() ของรุ่นเก่าใช้ไม่ได้
          await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true }), 'หลังเปิด Visit ต้องอยู่หน้าคัดกรอง ER').toBeVisible({ timeout: 60_000 });
          await expect(erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          await markEvidence(...[`HN ${visit.hn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first())));
          await holdForClip(page);
        });

        await checkStep(page, `${TC(1)} ขั้น 1 บันทึกคัดกรองครั้งแรก (ESI 2 · MEWS สูง)`, async () => {
          await fillErTriageForm(page, { level: 2, vitals: VITALS_HIGH_MEWS });
          await markEvidence(filled(erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' })), clicked(erTriageSaveButton(page)));
          await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรองครั้งแรก');
          await saveErTriageForm(page, `บันทึกคัดกรองครั้งแรกของ ${visit.en}`);
          await snapToast(triageToast, 'หลังกด — แจ้งเตือน บันทึกคัดกรอง');
          await expect(summary, 'บันทึก Triage แล้วหน้าต้องเปลี่ยนเป็น Overview ของ Visit').toBeVisible({ timeout: 60_000 });
          await expect(main.getByText(/Triage Level|TRIAGE LEVEL/i).first()).toBeVisible();
          await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
          await markEvidence(expected(summary));
          await holdForClip(page);
        });
      }

      // ---------- TC-001 แพทย์เริ่มการรักษา ----------
      if (runs(1)) {
        const ok = await soft(`${TC(1)} ขั้น 2 รอฟอร์ม ER Physician Note โหลด แล้วพิมพ์ในช่องประวัติเจ็บป่วยปัจจุบัน`, async () => {
          await waitPhysicianNoteForm(page);
          const illness = physicianNoteIllness(page);
          await illness.scrollIntoViewIfNeeded();
          await markEvidence(expected(physicianNotePanel(page).getByRole('heading', { name: 'ER Physician Note', exact: true }), 'ฟอร์มแพทย์'), filled(illness));
          await snapEvidence(page, 'ก่อนพิมพ์ — ER Physician Note');
          await startPhysicianNote(page, visit, 'ทดสอบ SBH-2355 แพทย์เริ่มการรักษา');
          await markEvidence(filled(illness, 'แพทย์เริ่มบันทึก'));
          await holdForClip(page);
          await waitEvents('PHYSICIAN_TREATMENT_STARTED');
        });
        if (ok) {
          await openTimeline(1);
          await soft(`${TC(1)} ขั้น 4 แถว แพทย์เริ่มการรักษา แสดงชื่อผู้ใช้งาน`, () => verifyActors(1, ['PHYSICIAN_TREATMENT_STARTED']));
          await backToVisit();
        }
      }

      // ---------- TC-003 / 004 / 005 CPR ----------
      const cprStep = async (n: number, button: 'Start CPR' | 'Save CPR Progress' | 'Stop CPR', action: string, round = '') =>
        soft(`${TC(n)} ขั้น 2 เปิด CPR Progression แล้วกด ${button}${round}`, async () => {
          const form = await openCprForm(page);
          await expect(cprToast).toHaveCount(0, { timeout: 20_000 });
          const marks = [];
          if (button === 'Start CPR') {
            const rhythm = form.getByRole('button', { name: 'VF', exact: true });
            await rhythm.click();
            marks.push(filled(rhythm, 'Rhythm'));
          }
          const comment = form.getByRole('textbox', { name: /Add CPR comment/ });
          await comment.fill(`SBH-2355 ${action}${round}`);
          await markEvidence(...marks, filled(comment), clicked(cprButton(form, button)));
          await snapEvidence(page, `ก่อนกด — ${button}${round}`);
          await saveCprEvent(page, form, button, action);
          await snapToast(cprToast, `หลังกด — ${button}${round}`);
          await holdForClip(page);
        });

      if (runs(3)) {
        await startClip(page, 'TC-003');
        if (await cprStep(3, 'Start CPR', 'Start CPR')) {
          await waitEvents('CPR_STARTED');
          await openTimeline(3);
          await soft(`${TC(3)} ขั้น 4 แถว เริ่ม CPR แสดงชื่อผู้ใช้งาน`, () => verifyActors(3, ['CPR_STARTED']));
          await backToVisit();
        }
      }
      if (runs(4)) {
        await startClip(page, 'TC-004');
        const first = await cprStep(4, 'Save CPR Progress', 'CPR Progress / Cycle Update', ' รอบ 1');
        const second = first && (await cprStep(4, 'Save CPR Progress', 'CPR Progress / Cycle Update', ' รอบ 2'));
        if (second) {
          await waitEvents('CPR_CYCLE_UPDATED', 2);
          await openTimeline(4);
          await soft(`${TC(4)} ขั้น 4 แถว บันทึกรอบ CPR ทั้ง 2 แถว แสดงชื่อผู้ใช้งาน`, () => verifyActors(4, ['CPR_CYCLE_UPDATED'], { CPR_CYCLE_UPDATED: 2 }));
          await backToVisit();
        }
      }
      if (runs(5)) {
        await startClip(page, 'TC-005');
        if (await cprStep(5, 'Stop CPR', 'Stop CPR')) {
          await waitEvents('CPR_STOPPED');
          await openTimeline(5);
          await soft(`${TC(5)} ขั้น 4 แถว หยุด CPR แสดงชื่อผู้ใช้งาน`, () => verifyActors(5, ['CPR_STOPPED']));
          await backToVisit();
        }
      }

      // ---------- TC-006 คัดกรองซ้ำ ----------
      if (runs(6)) {
        await startClip(page, 'TC-006');
        const ok = await soft(`${TC(6)} ขั้น 2 กด คัดกรองซ้ำ > เลือกระดับ + GCS > บันทึก`, async () => {
          const redo = main.getByRole('button', { name: 'redo คัดกรองซ้ำ' });
          await expect(redo).toBeVisible({ timeout: 60_000 });
          await redo.scrollIntoViewIfNeeded();
          await markEvidence(clicked(redo));
          await snapEvidence(page, 'ก่อนกด — คัดกรองซ้ำ');
          await redo.click();
          await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL, chiefComplaint: false });
          await markEvidence(filled(erTriageLevel(page, 3).locator('..')), clicked(erTriageSaveButton(page)));
          await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรองซ้ำ');
          await saveErTriageForm(page, `บันทึกคัดกรองซ้ำของ ${visit.en}`);
          await snapToast(triageToast, 'หลังกด — แจ้งเตือน คัดกรองซ้ำ');
          await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
          // ประวัติการคัดกรองต้องมีรอบประเมินซ้ำ (ยืนยันว่าบันทึกเป็นการคัดกรองครั้งใหม่ ไม่ใช่แก้รอบเดิม)
          const reassessed = main.getByText('การประเมินซ้ำ', { exact: true }).first();
          await expect(reassessed, 'ประวัติการคัดกรองต้องมีรอบ การประเมินซ้ำ').toBeVisible({ timeout: 60_000 });
          await reassessed.scrollIntoViewIfNeeded();
          await markEvidence(expected(reassessed, 'บันทึกคัดกรองซ้ำแล้ว'));
          await holdForClip(page);
        });
        // dev-x 28 ต.ค. 2026 run 2: event คัดกรองซ้ำ ไม่เข้า API ของ Timeline (รอ 4 นาทีก็ไม่มา) → รอ 45 วินาทีแล้วเปิด Timeline เก็บหลักฐานต่อ (ตารางเทียบจะแสดง "ไม่มีแถว")
        if (ok) {
          const arrived = await waitEvents('ER_REASSESSMENT').then(() => true, () => false);
          note(`${TC(6)} API ของ Timeline`, arrived ? 'มี event คัดกรองซ้ำ' : 'ไม่มี event คัดกรองซ้ำ หลังบันทึก 45 วินาที');
          await openTimeline(6);
          await soft(`${TC(6)} ขั้น 4 แถว คัดกรองซ้ำ แสดงชื่อผู้ใช้งาน`, () => verifyActors(6, ['ER_REASSESSMENT']));
          await backToVisit();
        }
      }

      // ---------- TC-007 Event ที่เคยแสดงถูก: เปิด ER Visit · คัดกรองครั้งแรก · ส่ง Order ----------
      if (runs(7)) {
        await startClip(page, 'TC-007');
        const ok = await soft(`${TC(7)} ขั้น 1 สั่ง Order 1 รายการ (Lab ${SETTINGS.labCode}) > กด ส่งคำสั่ง`, async () => {
          await submitOrders(page, [SETTINGS.labCode]);
          const sent = main.getByRole('row', { name: new RegExp(`^(ส่งแล้ว|กำลังดำเนินการ) \\[${SETTINGS.labCode}\\]`) }).first();
          await expect(sent, 'Order ต้องถูกส่งแล้ว').toBeVisible({ timeout: 60_000 });
          await markEvidence(expected(sent, 'ส่งคำสั่งแล้ว'));
          await holdForClip(page);
          await waitEvents('ORDER_SENT');
        });
        if (ok) {
          await openTimeline(7);
          await soft(`${TC(7)} ขั้น 3 แถว เปิด ER Visit · คัดกรองครั้งแรก · ส่ง Order แสดงชื่อผู้ใช้งาน`, () => verifyActors(7, ['ER_VISIT_ARRIVED', 'FIRST_TRIAGE', 'ORDER_SENT']));
          await backToVisit();
        }
      }

      // ---------- TC-002 แพทย์ตรวจเสร็จสิ้น (ท้ายสุด) ----------
      if (runs(2)) {
        await startClip(page, 'TC-002');
        const ok = await soft(`${TC(2)} ขั้น 2 ฟอร์ม ER Physician Note > Diagnosis > กด บันทึก`, async () => {
          await waitPhysicianNoteForm(page);
          const diagnosis = physicianNoteDiagnosis(page);
          // ส่วน Diagnosis ขึ้น "ไม่สามารถแสดงฟอร์มได้" → กดดาวน์โหลดอีกครั้ง (สูงสุด 3 รอบ)
          for (let i = 0; i < 3 && (await diagnosis.getByText('ไม่สามารถแสดงฟอร์มได้').count()); i++) {
            note(`${TC(2)} Diagnosis`, `ไม่สามารถแสดงฟอร์มได้ → กดดาวน์โหลดอีกครั้ง (รอบ ${i + 1})`);
            await diagnosis.getByRole('button', { name: /ดาวน์โหลดอีกครั้ง/ }).click();
            await page.waitForTimeout(15_000);
          }
          await diagnosis.scrollIntoViewIfNeeded();
          const save = physicianNoteSaveButton(page);
          const alerts = await physicianNoteAlerts(page);
          const broken = await diagnosis.getByText('ไม่สามารถแสดงฟอร์มได้').count();
          note(`${TC(2)} สภาพฟอร์ม`, `ปุ่มบันทึก ${(await save.isEnabled()) ? 'กดได้' : 'กดไม่ได้'} · Diagnosis ${broken ? 'ไม่สามารถแสดงฟอร์มได้' : 'แสดงได้'} · แจ้ง: ${alerts.join(' / ') || '-'}`);
          await markEvidence(
            expected(save, 'ปุ่มบันทึก'),
            expected(diagnosis, broken ? 'Diagnosis แสดงไม่ได้' : 'Diagnosis'),
            ...(alerts.length ? [alerted(physicianNotePanel(page).getByRole('alert').first())] : []),
          );
          await snapEvidence(page, 'ฟอร์ม Physician Note ก่อนบันทึก');
          await holdForClip(page, 2_000);
          expect(broken, 'ส่วน Diagnosis ของ ER Physician Note ต้องแสดงได้ (เลือก Diagnosis ก่อนบันทึก)').toBe(0);
          await expect(save, `ปุ่มบันทึก ER Physician Note ต้องกดได้ (${alerts.join(' / ')})`).toBeEnabled({ timeout: 30_000 });
          // ส่วนนี้ยังไม่เคยรันจริง (dev-x 28 ต.ค. 10:45 บันทึกไม่ได้) — เลือก Diagnosis ตามหน้าจอจริงเมื่อฟอร์มใช้ได้
          const search = diagnosis.getByRole('combobox').or(diagnosis.getByPlaceholder(/ค้นหา/)).first();
          await search.click();
          await search.fill('K30');
          await page.getByText(/^K30\b/).first().click();
          await markEvidence(filled(diagnosis, 'Diagnosis'), clicked(save));
          await snapEvidence(page, 'ก่อนกด — บันทึก Physician Note');
          await save.click();
          await waitEvents('PHYSICIAN_EXAM_COMPLETED');
        });
        if (ok) {
          await openTimeline(2);
          await soft(`${TC(2)} ขั้น 4 แถว แพทย์ตรวจเสร็จสิ้น แสดงชื่อผู้ใช้งาน`, () => verifyActors(2, ['PHYSICIAN_EXAM_COMPLETED']));
        }
      }

      note('ชื่อที่ใช้เทียบ (แถว เปิด ER Visit / ผู้ป่วยมาถึง)', arrivedName || '-');
      finish();
    },
  );
});
