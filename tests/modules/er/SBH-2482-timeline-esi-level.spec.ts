import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, expectTriageFormOpen, expectVisitHeader, gotoErDashboard, trackOpenedErVisits, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import {
  TIMELINE_TRIAGE_LABEL,
  fetchTreatmentTimeline,
  openTimelineTab,
  readTimeline,
  timelineEsiTag,
  timelineEventEsi,
  timelineEventLine,
  timelineRow,
  timelineTab,
  type TimelineEvent,
  type TimelineRow,
} from '../../../helpers/functions/er-timeline';
import { ESI_BUTTON, saveButton, triageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, fillTriage, gotoVisit, recordMenu } from '../../../mock-data/uat-play';

// SBH-2482 [ER][Treatment Timeline] แสดงความรุนแรงของ ESI Level — AC: Triage ครั้งแรก ระบุ → ความรุนแรง · Re-Triage ระบุ → ความรุนแรง
// (แท็บ Timeline ของหน้าประวัติการรักษา: ป้าย `ESI n` ต่อท้ายชื่อ event คัดกรองครั้งแรก / คัดกรองซ้ำ)
// ชุด EXE SBH-2483 → SC-001 SBH-2484 → TC-001 SBH-2485 · TC-002 SBH-2487 (ผู้ป่วยรายเดียวรันต่อเนื่อง) → 1 เทส 1 flow (R9)
// ข้อมูล: ผู้ป่วย AUTO ใหม่ 1 ราย → Visit ER สิทธิ UC → Triage ESI 3 → คัดกรองซ้ำ ESI 2 → ปิด Visit ที่การเงินท้ายเทส (afterEach)
// รัน (dev-x): npx playwright test --headed --grep @SBH-2482
// รัน (SBH Prod — ผู้ใช้อนุญาต 12 ต.ค. 2026): npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep @SBH-2482
// SBH2482_VERIFY=<HN>,<VN>,<EN> = ตรวจ TC-002 ขั้น 3–5 ซ้ำกับผู้ป่วยที่ Triage ESI 3 + คัดกรองซ้ำ ESI 2 ไว้แล้ว (อ่านอย่างเดียว)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC1 = 'TC-001 (SBH-2485)';
const TC2 = 'TC-002 (SBH-2487)';
const FIRST_LEVEL = 3;
const RETRIAGE_LEVEL = 2;
const FIRST = TIMELINE_TRIAGE_LABEL.FIRST_TRIAGE;
const RETRIAGE = TIMELINE_TRIAGE_LABEL.ER_REASSESSMENT;
const describeRow = (row?: TimelineRow) => (row ? `${row.esi || '(ไม่มีป้าย)'}` : '(ไม่มีแถว)');

test.describe(`SBH-2482 Timeline แสดงความรุนแรง (ESI Level) ของการคัดกรองครั้งแรกและคัดกรองซ้ำ (${SYSTEM})`, () => {
  // ลงทะเบียน + เปิด Visit + Triage + คัดกรองซ้ำ + เปิดประวัติการรักษา 2 รอบ + ปิด Visit ที่การเงิน และค้างหน้าจอให้คลิปอ่านทัน
  test.describe.configure({ timeout: 600_000 });

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
    'ผู้ป่วย AUTO ใหม่: Triage ครั้งแรก ESI 3 แล้วคัดกรองซ้ำ ESI 2 — Timeline แสดงความรุนแรงของแต่ละรอบ (Super_User)',
    { tag: ['@SBH-2482', '@SBH-2485', '@SBH-2487'], annotation: [linear('SBH-2482'), linear('SBH-2485'), linear('SBH-2487')] },
    async ({ page }) => {
      const main = page.getByRole('main');
      const form = triageForm(page);
      const authorization = trackAuthorization(page);
      const verifyOnly = (process.env.SBH2482_VERIFY ?? '').split(',').filter(Boolean);
      const summary = main.getByText('Clinical Summary', { exact: true });
      const savedToast = page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true });
      /** ช่อง Triage Level ของ Clinical Summary (หน้า Overview) ที่แสดงระดับนี้ */
      const summaryLevel = (level: number) => main.getByText(new RegExp(`Triage Level\\s*ESI ${level}`)).filter({ visible: true }).first();
      const firstRow = timelineRow(page, FIRST);
      const retriageRow = timelineRow(page, RETRIAGE);
      let visit!: ErVisit;

      /** กดบันทึกฟอร์มคัดกรอง → รอผล PATCH triage-result (SBH Prod ตอบช้าเกิน 20 วินาทีเป็นพักๆ → รอได้ถึง 90 วินาที) */
      const saveTriageForm = async () => {
        const saved = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
        await saveButton(page).click();
        await expectOk(await saved, `บันทึกผล Triage ของ ${visit.en}`);
      };

      /** ถ่ายแจ้งเตือน "กรอกข้อมูล คัดกรอง ER สำเร็จ" ทันทีที่ขึ้น (หายเองใน ~4.5 วินาที) — ไม่ขึ้นใน 10 วินาทีก็ไปต่อ (ผลบันทึกยืนยันจาก API แล้ว) */
      const snapSavedToast = async (name: string) => {
        const toast = savedToast.first();
        if (!(await toast.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false))) return;
        // รอให้แจ้งเตือนเลื่อนเข้าที่ก่อนตีกรอบ (trial = เช็คว่านิ่งแล้วเท่านั้น ไม่ได้ชี้เมาส์จริง)
        await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
        await markEvidence(alerted(toast));
        await snapEvidence(page, name);
      };

      /** เมนูซ้าย ประวัติการรักษา → ตีกรอบ Encounter + แท็บ Timeline → กดแท็บ → รอรายการขึ้น */
      const openTimeline = async () => {
        await recordMenu(page, 'ประวัติการรักษา');
        const tab = timelineTab(page);
        await expect(tab).toBeVisible({ timeout: 45_000 });
        // แถบเมนูซ้ายกางค้างบังรายการ Encounter (ย้ายเมาส์ออกอย่างเดียวไม่หุบ) → คลิกแท็บ ER Summary ที่เปิดอยู่แล้วให้เมนูหุบก่อนถ่ายภาพ
        await main.getByRole('tab', { name: 'ER Summary', exact: true }).first().click();
        await page.mouse.move(700, 700);
        const encounterRow = main.getByText(visit.en, { exact: true }).filter({ visible: true }).last();
        await markEvidence(expected(encounterRow), clicked(tab));
        await snapEvidence(page, 'ก่อนกด — แท็บ Timeline ของประวัติการรักษา');
        await openTimelineTab(page);
        await page.mouse.move(700, 700);
      };

      /** ตารางเทียบ: ระดับที่เลือกตอนคัดกรอง / ป้ายบน Timeline / API ของ Timeline — แสดงก่อน expect (ภาพ Error จะเห็นแถวที่ไม่ตรง) */
      const compare = async (title: string, lines: { label: string; chosen: number; shown?: TimelineRow; fromApi?: TimelineEvent }[]) => {
        const rows: CompareRow[] = lines.map(({ label, chosen, shown, fromApi }) => {
          const values = [`ESI ${chosen}`, describeRow(shown), timelineEventEsi(fromApi)];
          return { label, values, same: values.every((value) => value === values[0]) };
        });
        await showCompareTable(page, title, ['ระดับที่เลือกตอนคัดกรอง', 'ป้ายบน Timeline (หน้าจอ)', 'API ของ Timeline'], rows);
        return rows;
      };

      if (verifyOnly.length) {
        const [hn, vn, en] = verifyOnly;
        expect(en, 'SBH2482_VERIFY ต้องมี HN,VN,EN').toBeTruthy();
        visit = { hn, vn, en };
        test.info().annotations.push({ type: 'ตรวจซ้ำ (อ่านอย่างเดียว)', description: `HN ${hn} · ${vn} · ${en} — Triage ESI ${FIRST_LEVEL} + คัดกรองซ้ำ ESI ${RETRIAGE_LEVEL} ไว้ในรอบก่อน` });
        await gotoVisit(page, visit);
        await expectVisitHeader(page, visit);
      } else {
        await checkStep(page, `${TC1} ขั้น 1 เปิด Visit ER ให้ผู้ป่วยรายใหม่`, async () => {
          await gotoErDashboard(page);
          const patient = newTestPatient('Esi2482');
          visit = await registerAndOpenErVisit(page, patient);
          console.log(`    ผู้ป่วย: ${patient.firstName} ${patient.familyName} · SBH2482_VERIFY=${visit.hn},${visit.vn},${visit.en}`);
          test.info().annotations.push({ type: 'ผู้ป่วย', description: `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });
          await expectTriageFormOpen(page, visit);
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          await markEvidence(...[`HN ${visit.hn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first())), expected(main.getByRole('heading', { name: 'คัดกรอง ER' })));
          await holdForClip(page);
        });

        await checkStep(page, `${TC1} ขั้น 2 บันทึก Triage ครั้งแรก เลือก ESI ${FIRST_LEVEL}`, async () => {
          await fillTriage(page, visit, { level: FIRST_LEVEL, vitals: VITALS_NORMAL });
          await markEvidence(filled(form.getByRole('button', { name: ESI_BUTTON[FIRST_LEVEL] })), clicked(saveButton(page)));
          await holdForClip(page);
          await snapEvidence(page, `ก่อนกด — บันทึก Triage ครั้งแรก ESI ${FIRST_LEVEL}`);
          await saveTriageForm();
          await snapSavedToast('หลังกด — แจ้งเตือน บันทึก Triage ครั้งแรก');
          await expect(summary, 'บันทึก Triage แล้วหน้าต้องเปลี่ยนเป็น Overview ของ Visit').toBeVisible({ timeout: 60_000 });
          await expect(summaryLevel(FIRST_LEVEL), `Clinical Summary ต้องแสดง Triage Level ESI ${FIRST_LEVEL}`).toBeVisible({ timeout: 30_000 });
          console.log(`    จดไว้: Triage ครั้งแรก ESI ${FIRST_LEVEL}`);
          await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
          await markEvidence(expected(summaryLevel(FIRST_LEVEL)));
          await holdForClip(page, 1_500);
        });

        await checkStep(page, `${TC1} ขั้น 3 เปิด Encounter ER แล้วกดแท็บ Timeline`, async () => {
          await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
          await openTimeline();
          await markEvidence(clicked(timelineTab(page)), expected(timelineEventLine(firstRow)));
          await holdForClip(page);
        });

        await checkStep(page, `${TC1} ขั้น 4 event คัดกรองครั้งแรก แสดงความรุนแรง ESI ${FIRST_LEVEL}`, async () => {
          const shown = await readTimeline(page);
          const events = await fetchTreatmentTimeline(page, authorization(), visit);
          console.log(`    Timeline: ${shown.map((row) => `${row.time} ${row.label}${row.esi ? ` [${row.esi} · ${row.tone}]` : ''} ${row.actor}`).join(' | ')}`);
          await test.info().attach('Timeline หลัง Triage ครั้งแรก', { body: JSON.stringify({ shown, events }, null, 2), contentType: 'application/json' });
          const rows = await compare('SBH-2485 ความรุนแรงของ event คัดกรองครั้งแรก', [
            { label: FIRST, chosen: FIRST_LEVEL, shown: shown.find((row) => row.label === FIRST), fromApi: events.find((event) => event.type === 'FIRST_TRIAGE') },
          ]);
          await markEvidence(expected(timelineEventLine(firstRow)));
          await holdForClip(page, 3_000);
          await expect(firstRow, 'Timeline ต้องมี event คัดกรองครั้งแรก 1 แถว').toHaveCount(1);
          await expect(timelineEsiTag(firstRow), 'Expected: event คัดกรองครั้งแรก แสดงความรุนแรง (ESI Level) ของการ Triage ครั้งแรก').toBeVisible();
          await expect(timelineEsiTag(firstRow), `Expected: ระดับที่แสดงตรงกับที่เลือกในขั้นที่ 2 (ESI ${FIRST_LEVEL})`).toHaveText(`ESI ${FIRST_LEVEL}`);
          expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'ระดับที่เลือก = ป้ายบน Timeline = API').toEqual([]);
        });
        await hideCompareTable(page);

        await checkStep(page, `${TC2} ขั้น 1-2 ผู้ป่วยจาก TC-001 กดคัดกรองซ้ำ เลือก ESI ${RETRIAGE_LEVEL} แล้วบันทึก`, async () => {
          // ปุ่ม คัดกรองซ้ำ อยู่ในแท็บ Triage ของหน้า Overview (หน้าประวัติการรักษาที่เปิดอยู่เบียดจอ) → เปิดหน้า Visit ใหม่
          await gotoVisit(page, visit);
          const redo = form.getByRole('button', { name: 'redo คัดกรองซ้ำ' });
          await expect(redo).toBeVisible({ timeout: 45_000 });
          await expect(summaryLevel(FIRST_LEVEL), `ก่อนคัดกรองซ้ำ Clinical Summary ยังเป็น ESI ${FIRST_LEVEL}`).toBeVisible();
          await markEvidence(expected(summaryLevel(FIRST_LEVEL)), clicked(redo));
          await holdForClip(page);
          await snapEvidence(page, 'ก่อนกด — ปุ่ม คัดกรองซ้ำ');
          await redo.click();
          await expect(form.getByRole('heading', { name: 'การคัดกรองครั้งใหม่' })).toBeVisible();
          // ฟอร์มคัดกรองครั้งใหม่เป็นฟอร์มเปล่า — กรอกสัญญาณชีพ / GCS / อาการ ใหม่ แล้วเลือกระดับ
          await fillTriage(page, visit, { level: RETRIAGE_LEVEL, vitals: VITALS_NORMAL });
          await markEvidence(filled(form.getByRole('button', { name: ESI_BUTTON[RETRIAGE_LEVEL] })), clicked(saveButton(page)));
          await holdForClip(page);
          await snapEvidence(page, `ก่อนกด — บันทึก คัดกรองซ้ำ ESI ${RETRIAGE_LEVEL}`);
          await saveTriageForm();
          await snapSavedToast('หลังกด — แจ้งเตือน บันทึก คัดกรองซ้ำ');
          // หลังบันทึกหน้า Overview วาดใหม่ 1 รอบ — รอจนประวัติการคัดกรองมี 2 รอบ และ Clinical Summary เป็นระดับใหม่พร้อมกัน
          const history = form.getByRole('listitem').filter({ hasText: /โดย/ });
          await expect(async () => {
            await expect(history).toHaveCount(2, { timeout: 5_000 });
            await expect(summaryLevel(RETRIAGE_LEVEL)).toBeVisible({ timeout: 5_000 });
          }, `บันทึกคัดกรองซ้ำแล้ว Clinical Summary ต้องเป็น ESI ${RETRIAGE_LEVEL} และประวัติการคัดกรองมี 2 รอบ`).toPass({ timeout: 60_000 });
          console.log(`    จดไว้: คัดกรองซ้ำ ESI ${RETRIAGE_LEVEL}`);
          await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
          await markEvidence(expected(summaryLevel(RETRIAGE_LEVEL)), expected(history.first()));
          await holdForClip(page, 1_500);
        });
      }

      let events: TimelineEvent[] = [];
      await checkStep(page, `${TC2} ขั้น 3 เปิด Encounter ER แล้วกดแท็บ Timeline`, async () => {
        await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
        // อ่าน API ก่อนเปิดแท็บ (อ่านอย่างเดียว): จดว่า event คัดกรองซ้ำ มาถึง API หลังบันทึกกี่วินาที — หน้าจอโหลดรายการครั้งเดียวตอนกดแท็บ
        const startedAt = Date.now();
        await expect
          .poll(async () => (events = await fetchTreatmentTimeline(page, authorization(), visit)).some((event) => event.type === 'ER_REASSESSMENT'), { message: 'API ของ Timeline ต้องมี event คัดกรองซ้ำ', timeout: 30_000 })
          .toBe(true);
        test.info().annotations.push({ type: 'API ของ Timeline', description: `มี event คัดกรองซ้ำ หลังเริ่มอ่าน ${Math.round((Date.now() - startedAt) / 1000)} วินาที` });
        await openTimeline();
        await expect(retriageRow.first(), 'Timeline ต้องมี event คัดกรองซ้ำ').toBeVisible({ timeout: 30_000 });
        await markEvidence(clicked(timelineTab(page)), expected(timelineEventLine(retriageRow.last())));
        await holdForClip(page);
      });

      const shown = await readTimeline(page);
      const firstShown = shown.find((row) => row.label === FIRST);
      const retriageShown = shown.filter((row) => row.label === RETRIAGE).at(-1);
      console.log(`    Timeline: ${shown.map((row) => `${row.time} ${row.label}${row.esi ? ` [${row.esi} · ${row.tone}]` : ''} ${row.actor}`).join(' | ')}`);
      await test.info().attach('Timeline หลังคัดกรองซ้ำ', { body: JSON.stringify({ shown, events }, null, 2), contentType: 'application/json' });
      test.info().annotations.push({ type: 'โทนสีของป้าย (นอก TC)', description: `${FIRST}: ${firstShown?.tone ?? '-'} · ${RETRIAGE}: ${retriageShown?.tone ?? '-'}` });
      const rows = await compare('SBH-2487 ความรุนแรงของ event คัดกรองซ้ำ / คัดกรองครั้งแรก', [
        { label: RETRIAGE, chosen: RETRIAGE_LEVEL, shown: retriageShown, fromApi: events.filter((event) => event.type === 'ER_REASSESSMENT').at(-1) },
        { label: FIRST, chosen: FIRST_LEVEL, shown: firstShown, fromApi: events.find((event) => event.type === 'FIRST_TRIAGE') },
      ]);

      await checkStep(page, `${TC2} ขั้น 4 event คัดกรองซ้ำ แสดงความรุนแรง ESI ${RETRIAGE_LEVEL}`, async () => {
        await markEvidence(expected(timelineEventLine(retriageRow.last())));
        await holdForClip(page, 3_000);
        await expect(retriageRow, 'Timeline ต้องมี event คัดกรองซ้ำ 1 แถว').toHaveCount(1);
        await expect(timelineEsiTag(retriageRow), `Expected: event ของการคัดกรองซ้ำ แสดงความรุนแรงตรงกับที่เลือกตอนคัดกรองซ้ำ (ESI ${RETRIAGE_LEVEL})`).toHaveText(`ESI ${RETRIAGE_LEVEL}`);
        expect(rows[0].same, `${RETRIAGE}: ${rows[0].values.join(' ≠ ')}`).toBe(true);
      });

      await checkStep(page, `${TC2} ขั้น 5 event คัดกรองครั้งแรก ยังแสดงความรุนแรง ESI ${FIRST_LEVEL}`, async () => {
        await markEvidence(expected(timelineEventLine(firstRow)));
        await holdForClip(page, 3_000);
        await expect(firstRow, 'Timeline ต้องมี event คัดกรองครั้งแรก 1 แถว').toHaveCount(1);
        await expect(timelineEsiTag(firstRow), `Expected: event คัดกรองครั้งแรก ยังแสดงความรุนแรงของการ Triage ครั้งแรก (ESI ${FIRST_LEVEL})`).toHaveText(`ESI ${FIRST_LEVEL}`);
        expect(rows[1].same, `${FIRST}: ${rows[1].values.join(' ≠ ')}`).toBe(true);
      });
      await hideCompareTable(page);
    },
  );
});
