import type { Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dashboardCard, dismissToast, expectOk, expectTriageFormOpen, gotoErDashboard, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { ESI_BUTTON, saveButton, triageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, holdForClip, markEvidence, snapEvidence } from '../../../helpers/functions/evidence';
import { expectPatientInfo, fillNewPatientForm, gotoReception, lockStatusError, newPatientButton, newVisitButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, checkInOpdVisit, openOpdVisit, scheduleWalkInRequest } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, fillTriage, options, pick, recordMenu, watchMutations } from '../../../mock-data/uat-play';

// SBH-2085 [Bug][ER][Registration] Reopen visit from Clinic To ER — การ์ดบั๊ก ไม่มี TC ใน Sub-Issue (ลงผลเป็น Comment ในการ์ด — R45)
// AC 1 ต้องเปิด Visit จาก Clinic อื่นมา ER ได้ · AC 2 รายชื่อผู้ป่วยต้องมาแสดงที่โซนคัดกรอง (รอประเมิน Triage)
// flow ตามคลิปผลบน Dev-X ของผู้ใช้ (5 ต.ค. 2026): Visit OPD แผนกอายุรกรรม → ประวัติการรับบริการ → คลิก EN → แก้ไข Visit → Walk-in ไป คลินิก ER → ER Dashboard คอลัมน์คัดกรอง → คัดกรอง
// ข้อมูล: ผู้ป่วย AUTO ใหม่ 1 ราย → Visit OPD (+ ลงตารางแพทย์ / เช็คอิน) → Encounter ER ใน VN เดิม → คัดกรอง ESI 3 → ปิด Visit ที่การเงินท้ายเทส (afterEach)
// ลงทะเบียน + เปิด Visit OPD ที่เวชระเบียน (ผู้ใช้ขอ 14 ต.ค. 2026: ปกติเปิด Visit จากเวชระเบียน — เปิดที่ ER เฉพาะผู้ป่วยที่มา ER โดยตรง) ไม่ใช่หน้าคัดกรอง ER
// รัน (SBH Prod — ผู้ใช้อนุญาต 14 ต.ค. 2026: สร้าง 1 ราย + คัดกรองต่อ แล้วปิด Visit): npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep @SBH-2085
// SBH2085_VERIFY=<HN>,<VN> = ตรวจขั้นบอร์ด ER ซ้ำกับผู้ป่วยเดิม (อ่านอย่างเดียว)
// SBH2085_HN=<HN> = ใช้ผู้ป่วยที่ลงทะเบียนที่เวชระเบียนไว้แล้ว (ยังไม่มี Visit) ไม่สร้างรายใหม่ — รอบที่พังหลังบันทึกผู้ป่วย

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ER_CLINIC = /ห้องตรวจแผนกฉุกเฉิน|ห้องตรวจนอกเวลาราชการ/;

interface BoardEncounter extends ErVisit {
  latestStatusCode: string;
  patientStatus?: string;
  triagedAt?: string | null;
  triageLevel?: number | null;
  currentLocationId?: number | null;
}

/** Encounter ของผู้ป่วยบนบอร์ด ER (รายการเดียวกับที่บอร์ดแสดง — scope=current_queue) ที่ยังไม่ยกเลิก */
async function boardEncounter(page: Page, authorization: string, hn: string): Promise<BoardEncounter | undefined> {
  const res = await page.request.get('/cortex-api/er/dashboard/encounters?scope=current_queue', { headers: { authorization } });
  if (!res.ok()) return undefined;
  return ((await res.json()) as BoardEncounter[]).find((encounter) => encounter.hn === hn && encounter.latestStatusCode !== 'cancelled');
}

/** Encounter ทั้งหมดของผู้ป่วย (generated-emr-api) — ไว้ดูว่า Encounter ที่ ER ถูกสร้างจริงไหม */
async function patientEncounters(page: Page, authorization: string, hn: string): Promise<string> {
  const res = await page.request.get(`/generated-emr-api/encounters?filter[hn][equals]=${hn}&perPage=100`, { headers: { authorization } });
  if (!res.ok()) return `อ่านไม่ได้ (${res.status()})`;
  const { data } = (await res.json()) as { data: Record<string, unknown>[] };
  return data.map((encounter) => `${encounter.en} clinic ${encounter.clinicId} ${encounter.latestStatusCode}`).join(' | ');
}

/** คอลัมน์ของบอร์ด ER ที่การ์ดอยู่ = div ชั้นในสุดที่มีทั้งหัวคอลัมน์และการ์ด */
function boardColumn(page: Page, header: string, card: Locator): Locator {
  return page.getByRole('main').locator('div').filter({ has: page.getByText(header, { exact: true }) }).filter({ has: card }).last();
}

test.describe(`SBH-2085 เปิด Visit จากคลินิกอื่นมา ER แล้วผู้ป่วยขึ้นโซนคัดกรอง (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 720_000 });

  let visit: (ErVisit & { erEn?: string }) | undefined;

  test.afterEach(async ({ page }) => {
    if (!visit || process.env.SBH2085_VERIFY) return;
    // ปิด Visit (VN เดียวรวม Encounter OPD + ER) หลังเก็บหลักฐาน — ทำทั้งตอนผ่านและตอนพังกลางทาง
    const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
      (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
      (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
    );
    test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn}: ${result}` });
    console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn}: ${result}`);
  });

  test(
    'ผู้ป่วย AUTO ใหม่: Visit OPD แผนกอายุรกรรม → Walk-in ไป ER → ขึ้นคอลัมน์คัดกรองบน ER Dashboard → คัดกรองได้ (Super_User)',
    { tag: ['@SBH-2085'], annotation: [linear('SBH-2085')] },
    async ({ page }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const verify = (process.env.SBH2085_VERIFY ?? '').split(',').filter(Boolean);

      if (verify.length) {
        visit = { hn: verify[0], vn: verify[1], en: '' };
        await gotoErDashboard(page);
      } else {
        let hn = '';
        const patient = newTestPatient('Clinic2085');
        const resumeHn = process.env.SBH2085_HN;
        let viaNewVisit = false;
        await checkStep(page, resumeHn ? `Pre-condition ผู้ป่วย AUTO ที่ลงทะเบียนที่เวชระเบียนไว้แล้ว (HN ${resumeHn})` : 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน', async () => {
          if (resumeHn) {
            hn = resumeHn;
            await page.goto(`/cortex/next/patients/${hn}?views=patientInfo`);
          } else {
            await gotoReception(page);
            await markEvidence(clicked(newPatientButton(page)));
            await snapEvidence(page, 'ก่อนกด — สร้างผู้ป่วยใหม่ (เวชระเบียน)');
            await fillNewPatientForm(page, patient);
            const f = receptionFrame(page);
            const save = saveNewPatientButton(page);
            await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
            await markEvidence(filled(f.getByTestId('identifyVerification.identify')), filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), filled(f.getByTestId('birthDate')), clicked(save));
            await snapEvidence(page, 'ก่อนกด — บันทึกผู้ป่วยใหม่ (เวชระเบียน)');
            hn = await saveNewPatient(page);
            console.log(`    ผู้ป่วย: ${patient.firstName} ${patient.familyName} · HN ${hn} (ลงทะเบียนที่เวชระเบียน) · ถ้าพังต่อจากนี้รันซ้ำด้วย SBH2085_HN=${hn}`);
          }
          viaNewVisit = await expectPatientInfo(page);
          const hnText = page.getByRole('main').getByText(`HN ${hn}`, { exact: true }).first();
          if (viaNewVisit) {
            await markEvidence(expected(hnText), clicked(newVisitButton(page)));
          } else {
            // ปุ่ม "Visit ใหม่" disabled เพราะตรวจสถานะล็อกผู้ป่วยไม่ได้ → เปิดจากเมนู "จัดการ Visit" ของหน้าผู้ป่วยเดียวกัน (openOpdVisit)
            const note = `ปุ่ม Visit ใหม่ disabled${(await lockStatusError(page).count()) ? ' — "ไม่สามารถตรวจสอบสถานะล็อกผู้ป่วยได้" (lock-status ล้ม)' : ''} → เปิด Visit จากเมนูจัดการ Visit ของหน้าผู้ป่วยแทน`;
            console.log(`    ${note}`);
            test.info().annotations.push({ type: 'เปิด Visit', description: note });
            await markEvidence(expected(hnText), ...((await lockStatusError(page).count()) ? [alerted(lockStatusError(page))] : []), expected(newVisitButton(page)));
          }
          await holdForClip(page);
        });

        await checkStep(page, 'Pre-condition เปิด Visit OPD แผนกอายุรกรรมที่เวชระเบียน (Visit ใหม่)', async () => {
          if (viaNewVisit) await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          visit = { hn, vn: opd.vn, en: opd.en };
          console.log(`    SBH2085_VERIFY=${hn},${opd.vn} · OPD ${opd.en} ที่ ${opd.clinic}`);
          test.info().annotations.push({ type: 'ผู้ป่วย', description: `${resumeHn ? 'ผู้ป่วย AUTO จากรอบก่อน' : `${patient.firstName} ${patient.familyName}`} · HN ${hn} · VN ${opd.vn} · EN (OPD) ${opd.en} · ${opd.clinic}` });
          // SBH Prod: Visit เป็น "คำขอ Walk-in" → ลงตารางแพทย์ (ระบบเช็คอินให้) · dev-x: เลือกแพทย์ในแถวแล้ว → เช็คอินเอง
          if (!opd.doctor) {
            const scheduled = await scheduleWalkInRequest(page, hn);
            test.info().annotations.push({ type: 'ลงตารางแพทย์', description: `${scheduled.doctor} · ${scheduled.slot}` });
          }
          const queue = await checkInOpdVisit(page, visit);
          console.log(`    Visit OPD เช็คอินแล้ว (${queue})`);
          const status = main.locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
          await markEvidence(expected(main.getByText(`VN ${opd.vn}`, { exact: true }).filter({ visible: true }).first()), expected(main.getByText(opd.en, { exact: true }).filter({ visible: true }).first()), expected(status));
          await holdForClip(page);
        });

        await checkStep(page, 'AC 1 เปิด Visit จากคลินิก OPD มา ER (แก้ไข Visit → Walk-in ไป คลินิก ER)', async () => {
          const v = visit!;
          await recordMenu(page, 'ประวัติการรับบริการ');
          const row = main.getByRole('row').filter({ hasText: v.en }).first();
          await expect(row).toBeVisible({ timeout: 45_000 });
          const enCell = row.getByRole('cell', { name: v.en });
          await markEvidence(clicked(enCell));
          await snapEvidence(page, 'ก่อนกด — EN ของ Visit OPD ในประวัติการรับบริการ');
          await enCell.click();
          await expect(main.getByText(/^รายการเข้ารับบริการ/)).toBeVisible({ timeout: 45_000 });
          await expect(main.getByRole('row').filter({ hasText: 'Walk-in' }).first()).toBeVisible();
          const clinicBox = main.getByText('Walk-in ไป').first().locator('xpath=following::input[@role="combobox"][1]');
          await clinicBox.fill('ER');
          await expect(options(page).first()).toBeVisible();
          const erOption = options(page).filter({ hasText: ER_CLINIC }).first();
          console.log(`    คลินิกที่ค้นด้วย "ER": ${(await options(page).allInnerTexts()).map((text) => text.trim()).join(' | ')}`);
          await markEvidence(filled(clinicBox), clicked(erOption));
          await snapEvidence(page, 'ก่อนกด — Walk-in ไป คลินิก ER');
          // แถว ER ในแผง "แก้ไข Visit" (ขวา) เท่านั้น — ตาราง "ประวัติการรับบริการ" (ซ้าย) มีแถว ER ของ Visit ก่อนๆ ด้วย
          // (SBH Prod 14 ต.ค. 2026 ผู้ป่วยที่เคยมา ER แล้ว: แถวแรกที่เจอเป็น ER ของ Visit เก่าฝั่งซ้าย → กรอบผิดที่ ผู้ใช้ทักมา)
          const editVisit = main.locator('div').filter({ has: page.getByText(/^รายการเข้ารับบริการ/) }).filter({ has: page.getByText('Walk-in ไป') }).last();
          const erRow = editVisit.getByRole('row').filter({ hasText: ER_CLINIC }).filter({ visible: true }).first();
          const calls = await watchMutations(page, async () => {
            await pick(erOption);
            await expect(erRow, 'เลือกคลินิก ER แล้วต้องมีแถวเข้ารับบริการของ ER ในรายการ').toBeVisible({ timeout: 30_000 });
          });
          console.log(`    เลือกคลินิก ER: ${calls.map((call) => call.slice(0, 260)).join(' ‖ ') || '(ไม่เห็นคำสั่ง)'}`);
          expect(calls.join(' '), 'ต้องไม่มี error จาก graphql').not.toMatch(/"errors":\[/);
          await page.mouse.move(700, 700);
          const save = main.getByRole('button', { name: /^(save )?บันทึก$/ }).filter({ visible: true }).last();
          await markEvidence(expected(erRow), clicked(save));
          await snapEvidence(page, 'ก่อนกด — บันทึก หลังเพิ่มแถว ER');
          const saved = await watchMutations(page, () => save.click());
          console.log(`    บันทึก: ${saved.map((call) => call.slice(0, 260)).join(' ‖ ') || '(ไม่มีคำสั่งเพิ่ม)'}`);
          expect(saved.join(' '), 'ต้องไม่มี error จาก graphql').not.toMatch(/"errors":\[/);
          const encounters = await patientEncounters(page, authorization(), v.hn);
          console.log(`    Encounter ของ HN ${v.hn}: ${encounters}`);
          test.info().annotations.push({ type: 'Encounter ของผู้ป่วย', description: encounters });
          // รอ toast "Visit saved successfully" เลื่อนเข้าจอให้นิ่งก่อนตีกรอบ (ตีตอนกำลังเลื่อน กรอบไปอยู่นอกจอ)
          const savedToast = page.getByText('Visit saved successfully', { exact: true });
          const toastShown = await savedToast.waitFor({ timeout: 15_000 }).then(() => true, () => false);
          if (toastShown) await savedToast.hover({ trial: true });
          await expect(erRow).toBeVisible();
          console.log(`    กรอบหลังบันทึก: toast ${JSON.stringify(toastShown ? await savedToast.boundingBox() : null)} · แถว ER ${JSON.stringify(await erRow.boundingBox())} "${(await erRow.innerText()).replace(/\s+/g, ' ').slice(0, 80)}"`);
          await markEvidence(...(toastShown ? [alerted(savedToast)] : []), expected(erRow));
          await holdForClip(page, 1_500);
        });
      }

      const v = visit!;
      const card = page.getByText(`HN: ${v.hn}`, { exact: true });
      await checkStep(page, 'AC 2 ผู้ป่วยขึ้นที่โซนคัดกรองบน ER Dashboard (รอประเมิน Triage)', async () => {
        await gotoErDashboard(page);
        let found: BoardEncounter | undefined;
        await expect
          .poll(async () => (found = await boardEncounter(page, authorization(), v.hn)) !== undefined, { message: `API บอร์ด ER ต้องมี Encounter ของ HN ${v.hn}`, timeout: 60_000 })
          .toBe(true);
        visit = { ...v, erEn: found!.en };
        const encounters = await patientEncounters(page, authorization(), v.hn);
        console.log(`    Encounter ของ HN ${v.hn} (ตอนเปิดบอร์ด): ${encounters}`);
        test.info().annotations.push({ type: 'Encounter ของผู้ป่วย (ตอนเปิดบอร์ด)', description: encounters });
        console.log(`    API บอร์ด ER: ${found!.en} ${found!.latestStatusCode} ${found!.patientStatus ?? ''} · triagedAt ${found!.triagedAt ?? '-'}`);
        test.info().annotations.push({ type: 'Encounter ER บนบอร์ด', description: `${found!.en} · ${found!.latestStatusCode} · ${found!.patientStatus ?? '-'} · triagedAt ${found!.triagedAt ?? '-'}` });
        await expect(card, 'ผู้ป่วยต้องมีการ์ดบน ER Dashboard').toBeVisible({ timeout: 30_000 });
        await card.scrollIntoViewIfNeeded();
        const column = boardColumn(page, 'คัดกรอง', card);
        await expect(column, 'การ์ดต้องอยู่คอลัมน์คัดกรอง').not.toContainText('โซนแดง ER');
        expect(found!.triagedAt ?? null, 'ยังไม่ถูกคัดกรอง (triagedAt ว่าง)').toBeNull();
        // กรอบเฉพาะหัวคอลัมน์ + การ์ดของผู้ป่วยรายนี้ (คอลัมน์มีผู้ป่วยรายอื่นที่รอคัดกรองอยู่ด้วย)
        // คอลัมน์ยาวเกินจอ (ผู้ป่วยรอคัดกรองหลายราย) หัวคอลัมน์กับการ์ดอยู่ในจอเดียวกันไม่ได้ → แยกภาพ: หัวคอลัมน์ก่อน แล้วการ์ด
        const header = column.getByText('คัดกรอง', { exact: true }).first();
        const ourCard = dashboardCard(page, v.hn);
        await ourCard.evaluate((el) => el.scrollIntoView({ block: 'end', behavior: 'instant' }));
        const fits = await expect(header).toBeInViewport({ ratio: 1, timeout: 1_000 }).then(() => true, () => false);
        if (!fits) {
          await header.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await markEvidence(expected(header));
          await snapEvidence(page, 'คอลัมน์คัดกรอง (การ์ดของผู้ป่วยอยู่ด้านล่าง — ภาพถัดไป)');
          await ourCard.evaluate((el) => el.scrollIntoView({ block: 'end', behavior: 'instant' }));
        }
        await markEvidence(...(fits ? [expected(header)] : []), expected(ourCard));
        await holdForClip(page, 2_000);
      });

      if (verify.length) return;

      await checkStep(page, 'คัดกรอง ESI 3 จากการ์ดบนบอร์ด — ผู้ป่วยย้ายไปโซนเหลือง', async () => {
        const er: ErVisit = { hn: v.hn, vn: v.vn, en: visit!.erEn! };
        await markEvidence(clicked(card));
        await snapEvidence(page, 'ก่อนกด — การ์ดผู้ป่วยในคอลัมน์คัดกรอง');
        await card.click();
        await expectTriageFormOpen(page, er);
        await fillTriage(page, er, { level: 3, vitals: VITALS_NORMAL });
        await markEvidence(filled(triageForm(page).getByRole('button', { name: ESI_BUTTON[3] })), clicked(saveButton(page)));
        await snapEvidence(page, 'ก่อนกด — บันทึก Triage ESI 3');
        // SBH Prod ตอบบันทึก Triage ช้ากว่า 20 วินาทีของ saveTriageForm() (14 ต.ค. 2026) → รอ 90 วินาทีเหมือน SBH-2482
        const saved = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${er.en}/triage-result`, 90_000);
        await saveButton(page).click();
        await expectOk(await saved, `บันทึกผล Triage ของ ${er.en}`);
        await expect(main.getByText(/Triage Zone\s*โซนเหลือง ER/).first()).toBeVisible({ timeout: 60_000 });
        await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
        await markEvidence(expected(main.getByText(/Triage Level\s*ESI 3/).filter({ visible: true }).first()), expected(main.getByText(/Triage Zone\s*โซนเหลือง ER/).filter({ visible: true }).first()));
        await holdForClip(page, 1_500);
      });

      await checkStep(page, 'ER Dashboard — การ์ดย้ายจากคอลัมน์คัดกรองไปโซนเหลือง ER', async () => {
        await gotoErDashboard(page);
        await expect(card).toBeVisible({ timeout: 30_000 });
        await card.scrollIntoViewIfNeeded();
        const column = boardColumn(page, 'โซนเหลือง ER', card);
        await expect(column, 'การ์ดต้องอยู่คอลัมน์โซนเหลือง ER').not.toContainText('ห้องสังเกตอาการ ER');
        const after = await boardEncounter(page, authorization(), v.hn);
        console.log(`    หลังคัดกรอง API บอร์ด: ${after?.en} ESI ${after?.triageLevel ?? '-'} · triagedAt ${after?.triagedAt ?? '-'}`);
        // การ์ดที่คัดกรองแล้ว = div ชั้นในสุดที่มีทั้ง HN และเวลารอ ("รอ 0:12 นาที") — dashboardCard() ใช้ไม่ได้เพราะไม่มีคำว่า "รอคัดกรอง" แล้ว
        const triagedCard = column.locator('div').filter({ has: card }).filter({ hasText: /รอ\S*\s*[\d:]+\s*นาที/ }).last();
        await markEvidence(expected(column.getByText('โซนเหลือง ER', { exact: true }).first()), expected(triagedCard));
        await holdForClip(page, 2_000);
      });
    },
  );
});
