import { closeVisitAtCashier } from '../../../helpers/cashier';
import { dismissToast, expectTriageFormOpen, expectVisitHeader, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/er';
import { cprForm, cprHistoryForm, cprHistoryTab, cprSavedBanner, cprTimeline, openCprForm, parseCprQuery, readCprTimeline, saveCprEvent, waitForCprQuery, type CprEvent } from '../../../helpers/er-cpr';
import { ESI_BUTTON, saveButton, triageForm } from '../../../helpers/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/evidence';
import { newTestPatient } from '../../../helpers/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, fillTriage, gotoVisit, recordMenu, saveTriageForm } from '../../../mock-data/uat-play';

// SBH-2442 [ER][Treatment Timeline] CPR progression — AC ข้อเดียว: สามารถกด Expand ดู CPR Timeline
// (แท็บ CPR Progression ของหน้าประวัติการรักษา = ฟอร์ม CPR Progression โหมดอ่านอย่างเดียว)
// ชุด EXE SBH-2511 → SC-001 SBH-2512 → TC-001 SBH-2513 → 1 เทส 1 flow (R9)
// ข้อมูล: ผู้ป่วย AUTO ใหม่ 1 ราย → Visit ER สิทธิ UC + Triage ESI 3 → บันทึก CPR 3 event → ปิด Visit ที่การเงินท้ายเทส (afterEach)
// รัน (dev-x): npx playwright test --headed --grep @SBH-2442
// SBH2442_VERIFY=<HN>,<VN>,<EN> = ตรวจขั้น 3–5 ซ้ำกับผู้ป่วยที่บันทึก CPR ไว้แล้ว (อ่านอย่างเดียว — เทียบกับ API แทนค่าที่จดในขั้น 2)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC = 'TC-001 (SBH-2513)';
const EVENTS = ['Start CPR', 'CPR Progress / Cycle Update', 'Stop CPR'];
const describeEvent = (event?: CprEvent) => (event ? `${event.action} · ${event.time}` : '(ไม่มี)');

test.describe(`SBH-2442 กด Expand ดู CPR Timeline ในแท็บ CPR Progression ของหน้าประวัติการรักษา (${SYSTEM})`, () => {
  // ลงทะเบียน + เปิด Visit + Triage + บันทึก CPR 3 ครั้ง + เปิดประวัติการรักษา + ปิด Visit ที่การเงิน และค้างหน้าจอให้คลิปอ่านทัน
  test.describe.configure({ timeout: 480_000 });

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
    'ผู้ป่วย AUTO ใหม่: บันทึก CPR 3 event แล้วกด Expand ดู CPR Timeline ในประวัติการรักษา (Super_User)',
    { tag: ['@SBH-2442', '@SBH-2513'], annotation: [linear('SBH-2442'), linear('SBH-2513')] },
    async ({ page }) => {
      const main = page.getByRole('main');
      const verifyOnly = (process.env.SBH2442_VERIFY ?? '').split(',').filter(Boolean);
      let visit!: ErVisit;
      /** ชื่อ event + วันเวลาที่จดจากแถบ Saved CPR event ตอนบันทึก (ขั้น 2) — ว่าง = โหมดตรวจซ้ำ */
      const noted: CprEvent[] = [];

      if (verifyOnly.length) {
        const [hn, vn, en] = verifyOnly;
        expect(en, 'SBH2442_VERIFY ต้องมี HN,VN,EN').toBeTruthy();
        visit = { hn, vn, en };
        test.info().annotations.push({ type: 'ตรวจซ้ำ (อ่านอย่างเดียว)', description: `HN ${hn} · ${vn} · ${en} — บันทึก CPR ไว้ในรอบก่อน · เทียบรายการกับ API แทนค่าที่จดในขั้น 2` });
        await gotoVisit(page, visit);
        await expectVisitHeader(page, visit);
      } else {
        await checkStep(page, 'Pre-condition ผู้ป่วย AUTO ใหม่ เปิด Visit ER แล้ว Triage ESI 3', async () => {
          await gotoErDashboard(page);
          const patient = newTestPatient('Cpr2442');
          visit = await registerAndOpenErVisit(page, patient);
          console.log(`    ผู้ป่วย: ${patient.firstName} ${patient.familyName} · SBH2442_VERIFY=${visit.hn},${visit.vn},${visit.en}`);
          test.info().annotations.push({ type: 'ผู้ป่วย', description: `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });
          await expectTriageFormOpen(page, visit);
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          await fillTriage(page, visit, { level: 3, vitals: VITALS_NORMAL });
          await markEvidence(filled(triageForm(page).getByRole('button', { name: ESI_BUTTON[3] })), clicked(saveButton(page)));
          await snapEvidence(page, 'ก่อนกด — ปุ่ม บันทึก ของ Form Triage');
          await saveTriageForm(page, visit);
          const summary = main.getByText('Clinical Summary', { exact: true });
          await expect(summary, 'บันทึก Triage แล้วหน้าต้องเปลี่ยนเป็น Overview ของ Visit').toBeVisible({ timeout: 60_000 });
          await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
          await markEvidence(...[`HN ${visit.hn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first())), expected(summary));
          await holdForClip(page);
        });

        await checkStep(page, `${TC} ขั้น 1 เปิดผู้ป่วย ER แล้วเปิดฟอร์ม CPR Progression`, async () => {
          const form = await openCprForm(page);
          await expect(form.getByRole('button', { name: 'Start CPR', exact: true })).toBeVisible();
          await markEvidence(expected(main.getByRole('heading', { name: 'CPR Progression' }).first()), expected(form.getByRole('heading', { name: 'CPR Event' })));
          await holdForClip(page);
        });

        await checkStep(page, `${TC} ขั้น 2 บันทึก event 3 รายการ แล้วจดชื่อ event และวันเวลา`, async () => {
          const form = cprForm(page);
          const comment = form.getByRole('textbox', { name: /Add CPR comment/ });
          const savedToast = page.getByText('บันทึก CPR progression แล้ว', { exact: true });
          const steps = [
            { button: 'Start CPR', action: EVENTS[0] },
            { button: 'Save CPR Progress', action: EVENTS[1] },
            { button: 'Stop CPR', action: EVENTS[2] },
          ] as const;
          for (const [index, { button, action }] of steps.entries()) {
            await checkStep(page, `บันทึก event ที่ ${index + 1} ${action.replace(' / ', ' - ')}`, async () => {
              // รอแจ้งเตือนของ event ก่อนหน้าหายก่อน (~4.5 วินาที) — แจ้งเตือนที่ซ้อนกันกำลังเลื่อน ตีกรอบแล้วไม่ตรง
              await expect(savedToast).toHaveCount(0, { timeout: 20_000 });
              const filledMarks = [filled(comment)];
              if (index === 0) {
                // Start CPR: เลือก Rhythm VF (ฟอร์มใส่ Defib 200 J ให้เอง)
                const rhythm = form.getByRole('button', { name: 'VF', exact: true });
                await rhythm.click();
                filledMarks.push(filled(rhythm));
              }
              await comment.fill(`SBH-2442 ${action}`);
              await markEvidence(...filledMarks, clicked(form.getByRole('button', { name: button, exact: true })));
              await snapEvidence(page, `ก่อนกด — ปุ่ม ${button}`);
              const event = await saveCprEvent(page, form, button, action);
              noted.push(event);
              console.log(`    จดไว้: ${describeEvent(event)}`);
              await markEvidence(...((await savedToast.first().isVisible()) ? [alerted(savedToast.first())] : []), expected(cprSavedBanner(form)));
              await holdForClip(page, 1_500);
            });
          }
          test.info().annotations.push({ type: 'ที่จดไว้ตอนบันทึก (ขั้น 2)', description: noted.map(describeEvent).join(' | ') });
          expect(noted.map((event) => event.action), 'บันทึกครบ 3 event ตามลำดับ').toEqual(EVENTS);
        });
      }

      const history = cprHistoryForm(page);
      const timeline = cprTimeline(history);
      const heading = timeline.locator('summary');
      const isOpen = () => timeline.evaluate((el) => (el as HTMLDetailsElement).open);
      let fromApi: CprEvent[] = [];

      await checkStep(page, `${TC} ขั้น 3 เปิดประวัติการรักษา เลือก Encounter ER แล้วกดแท็บ CPR Progression`, async () => {
        await recordMenu(page, 'ประวัติการรักษา');
        const tab = cprHistoryTab(page);
        await expect(tab).toBeVisible({ timeout: 45_000 });
        const encounterRow = main.getByText(visit.en, { exact: true }).filter({ visible: true }).last();
        await markEvidence(expected(encounterRow), clicked(tab));
        await snapEvidence(page, 'ก่อนกด — แท็บ CPR Progression ของประวัติการรักษา');
        const queried = waitForCprQuery(page, visit.en);
        await tab.click();
        await expect(history, 'แท็บ CPR Progression ต้องแสดงฟอร์มโหมดอ่านอย่างเดียว').toBeVisible({ timeout: 45_000 });
        fromApi = await parseCprQuery(await queried);
        test.info().annotations.push({ type: 'รายการ CPR จาก API', description: fromApi.map(describeEvent).join(' | ') });
        await expect(heading, 'หัวข้อ CPR Timeline ต้องบอกจำนวน event ที่บันทึก').toHaveText(`CPR Timeline (${EVENTS.length})`);
        await markEvidence(clicked(tab), expected(heading));
        await holdForClip(page, 1_500);
      });

      await checkStep(page, `${TC} ขั้น 4 กด Expand หัวข้อ CPR Timeline`, async () => {
        // คลิกแบบผู้ใช้จริง: กดเมาส์ที่ตัวหนังสือของหัวข้อ (ไม่ผ่านการเช็คของ Playwright — ถ้ามีอะไรบัง / หน้าไม่รับคลิก หัวข้อจะไม่เปลี่ยนสถานะ)
        const press = async () => {
          await heading.scrollIntoViewIfNeeded();
          const box = (await heading.boundingBox())!;
          await page.mouse.click(box.x + Math.min(40, box.width / 2), box.y + box.height / 2);
        };
        const openAtFirst = await isOpen();
        const lock = await history.evaluate((el) => `inert=${(el as HTMLElement).inert} · aria-readonly=${el.getAttribute('aria-readonly')}`);
        test.info().annotations.push({ type: 'CPR Timeline ตอนเปิดแท็บ', description: `${openAtFirst ? 'กางอยู่' : 'พับอยู่'} · ฟอร์มโหมดอ่านอย่างเดียว: ${lock}` });
        console.log(`    CPR Timeline ตอนเปิดแท็บ: ${openAtFirst ? 'กางอยู่' : 'พับอยู่'} · ${lock}`);

        if (openAtFirst) {
          // กางอยู่แล้ว (หมายเหตุของ TC: ไม่ถือเป็นบั๊ก) → กดพับก่อน แล้วค่อยกด Expand
          await checkStep(page, 'CPR Timeline กางอยู่ตั้งแต่เปิดแท็บ — กดพับก่อน', async () => {
            await markEvidence(clicked(heading));
            await snapEvidence(page, 'ก่อนกด — หัวข้อ CPR Timeline (กางอยู่)');
            await press();
            await markEvidence(expected(heading));
            await expect.poll(isOpen, { message: 'กดหัวข้อ CPR Timeline ที่กางอยู่แล้วต้องพับได้ (จะได้กด Expand ตามขั้น 4)', timeout: 10_000 }).toBe(false);
            await holdForClip(page);
          });
        }

        await markEvidence(clicked(heading));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — หัวข้อ CPR Timeline (พับอยู่)');
        await press();
        // ตีกรอบไว้ก่อนเช็ค — ภาพ Error จะเห็นว่าหัวข้อยังพับอยู่หลังกด
        await markEvidence(expected(heading));
        await holdForClip(page, 1_500);
        await expect.poll(isOpen, { message: 'Expected: กด Expand หัวข้อ CPR Timeline ได้ — หลังกดแล้วหัวข้อต้องกางออก', timeout: 10_000 }).toBe(true);
        const items = timeline.locator('li');
        await expect(items.first(), 'Expected: แสดงรายการ event ใต้หัวข้อ CPR Timeline').toBeVisible();
        await markEvidence(clicked(heading), expected(timeline.locator('ol')));
        await holdForClip(page, 2_000);
      });

      await checkStep(page, `${TC} ขั้น 5 เทียบรายการใต้ CPR Timeline กับที่จดไว้ในขั้น 2`, async () => {
        const shown = await readCprTimeline(timeline);
        const reference = noted.length ? noted : fromApi;
        const columns = [...(noted.length ? ['ที่จดไว้ตอนบันทึก (ขั้น 2)'] : []), 'ใต้ CPR Timeline (ประวัติการรักษา)', 'API ของฟอร์ม CPR'];
        const count = Math.max(reference.length, shown.length, fromApi.length);
        const rows: CompareRow[] = Array.from({ length: count }, (_, index) => {
          const values = [...(noted.length ? [describeEvent(noted[index])] : []), describeEvent(shown[index]), describeEvent(fromApi[index])];
          return { label: `รายการที่ ${index + 1}`, values, same: values.every((value) => value === values[0]) && Boolean(shown[index]) };
        });
        rows.unshift({ label: 'จำนวนรายการ', values: [...(noted.length ? [String(noted.length)] : []), String(shown.length), String(fromApi.length)], same: shown.length === EVENTS.length && fromApi.length === EVENTS.length });
        // แสดงตารางก่อน expect — ภาพ Error จะเห็นแถวที่ไม่ตรง (ตารางซ้อนครึ่งขวา ทับแผงฟอร์มที่กรอกได้ · ครึ่งซ้ายคือประวัติการรักษา)
        await showCompareTable(page, 'SBH-2513 เทียบรายการ CPR Timeline', columns, rows);
        await markEvidence(expected(timeline.locator('ol')));
        await holdForClip(page, 3_000);
        await test.info().attach('รายการ CPR Timeline ที่เทียบ', { body: JSON.stringify({ noted, shown, fromApi }, null, 2), contentType: 'application/json' });
        const items = timeline.locator('li');
        await expect(items, 'Expected: รายการที่แสดงครบ 3 รายการ').toHaveCount(EVENTS.length);
        for (let index = 0; index < EVENTS.length; index++) await expect(items.nth(index), `รายการที่ ${index + 1} ต้องมองเห็นใต้หัวข้อ`).toBeVisible();
        expect(shown.map((event) => event.action), 'Expected: ชื่อ event เรียง Start CPR, CPR Progress / Cycle Update, Stop CPR').toEqual(EVENTS);
        expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'Expected: ชื่อ event และวันเวลาตรงกับที่บันทึกในขั้นที่ 2').toEqual([]);
      });
      await hideCompareTable(page);
    },
  );
});
