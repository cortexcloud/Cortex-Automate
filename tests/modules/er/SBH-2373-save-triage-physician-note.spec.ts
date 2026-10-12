import { type Page, type Response } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/cashier';
import { dismissToast, expectTriageFormOpen, expectVisitHeader, gotoErDashboard, openCarePanel, openVisitDialog, trackOpenedErVisits, type ErVisit } from '../../../helpers/er';
import { trackAuthorization } from '../../../helpers/er-report';
import { ESI_BUTTON, saveButton, triageForm } from '../../../helpers/er-triage';
import { alerted, checkStep, clicked, expected, filled, holdForClip, markEvidence, snapEvidence } from '../../../helpers/evidence';
import { newTestPatient } from '../../../helpers/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, recordMockPatient, registerAndOpenErVisit, savePhysicianNote } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, boardEncounter, fillTriage, gotoVisit, saveTriageForm } from '../../../mock-data/uat-play';

// SBH-2373 [Bug][ER][Triage] ไม่สามารถบันทึก Form Triage, Physician Note ได้ — กดบันทึกแล้ว API ฟอร์มตอบ 403 {"message":"clinical form access denied"}
// (V2.9.0: POST /cortex-api/clinical-form-legacy/rest/openehr/v1/ehr/<ehrId>/contribution เช็กสิทธิ์ตาม document_type แล้วไม่มี er_triage / er_physician_note — แก้ใน PR cortex-api #2551)
// การ์ดไม่มีชุด TC ใน Sub-Issue — Expected ของการ์ดข้อเดียว: ระบบต้องบันทึก Form Triage และ Physician Note ได้ → 1 เทส 1 flow (R9)
// ข้อมูล: ผู้ป่วย AUTO ใหม่ 1 ราย → เปิด Visit ER สิทธิ UC → ปิด Visit ที่การเงินท้ายเทส (afterEach — ผู้ใช้เลือก 12 ต.ค. 2026)
// ระบบ: SBH Prod (ผู้ใช้สั่ง + อนุญาตสร้างผู้ป่วย 1 ราย 12 ต.ค. 2026): npm run card:prod -- --headed --grep @SBH-2373
//        SBH Prod ณ 12 ต.ค. 2026 ฟอร์มยังบันทึกผ่าน /ehrbase โดยตรง (ยังไม่ใช่เส้นทาง clinical-form-legacy ของ V2.9.0) · dev-x ผู้ใช้เทสมือผ่านแล้ว 1 ต.ค. 2026
// SBH2373_VERIFY=<HN>,<VN>,<EN>,<รหัส Dx> = ตรวจขั้นสุดท้ายซ้ำกับผู้ป่วยที่บันทึกไว้แล้วในรอบก่อน (อ่านอย่างเดียว ไม่สร้างข้อมูล)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });

interface FormSave {
  path: string;
  status: number;
  body: string;
}

/** จดคำตอบของคำสั่งบันทึกฟอร์ม (POST …/contribution — ทั้งเส้นทาง /ehrbase และ /cortex-api/clinical-form-legacy) ไว้ดูว่ามีตัวไหนถูกปฏิเสธ */
function trackFormSaves(page: Page): FormSave[] {
  const saves: FormSave[] = [];
  page.on('response', async (res: Response) => {
    const { pathname } = new URL(res.url());
    if (res.request().method() !== 'POST' || !/\/contribution$/.test(pathname)) return;
    saves.push({ path: pathname.replace(/\/ehr\/[^/]+\//, '/ehr/<ehrId>/'), status: res.status(), body: res.ok() ? '' : (await res.text().catch(() => '')).slice(0, 300) });
  });
  return saves;
}

/** คำสั่งบันทึกฟอร์มที่เกิดตั้งแต่ลำดับ `from` ต้องไม่มีตัวไหนถูกปฏิเสธ (บั๊กของการ์ด = 403 clinical form access denied) */
function expectFormSavesOk(saves: FormSave[], from: number, what: string) {
  const mine = saves.slice(from);
  test.info().annotations.push({ type: `คำสั่งบันทึกฟอร์ม — ${what}`, description: mine.length ? mine.map((save) => `POST ${save.path} → ${save.status}${save.body ? ` ${save.body}` : ''}`).join(' | ') : 'ไม่เห็นคำสั่ง …/contribution ระหว่างขั้นนี้' });
  for (const save of mine) {
    expect(save.body, `${what}: ต้องไม่ถูกปฏิเสธด้วย clinical form access denied`).not.toContain('clinical form access denied');
    expect(save.status, `${what}: POST ${save.path} ต้องสำเร็จ ${save.body}`).toBeLessThan(300);
  }
}

test.describe(`SBH-2373 บันทึก Form Triage และ ER Physician Note ได้ (${SYSTEM})`, () => {
  // ลงทะเบียน + เปิด Visit + Triage + Physician Note + โหลดหน้าใหม่ + ปิด Visit ที่การเงิน และค้างหน้าจอให้คลิปอ่านทัน · SBH Prod ช้าเป็นพักๆ
  test.describe.configure({ timeout: 600_000 });

  let opened: Map<string, ErVisit>;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });

  test.afterEach(async ({ page }) => {
    // ผู้ใช้เลือกให้ปิด Visit ของผู้ป่วยที่เทสเปิด หลังเก็บหลักฐาน (12 ต.ค. 2026) — ทำทั้งตอนผ่านและตอนพังกลางทาง
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
    'ผู้ป่วย AUTO ใหม่: เปิด Visit ER แล้วบันทึก Form Triage และ ER Physician Note ได้ ไม่ถูกปฏิเสธ (Super_User)',
    { tag: ['@SBH-2373'], annotation: [linear('SBH-2373')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const saves = trackFormSaves(page);
      const main = page.getByRole('main');
      const verifyOnly = (process.env.SBH2373_VERIFY ?? '').split(',').filter(Boolean);
      let visit!: ErVisit;
      let dx = '';

      if (verifyOnly.length) {
        const [hn, vn, en, code] = verifyOnly;
        expect(code, 'SBH2373_VERIFY ต้องมี HN,VN,EN,รหัส Dx').toBeTruthy();
        visit = { hn, vn, en };
        dx = code;
        test.info().annotations.push({ type: 'ตรวจซ้ำ (อ่านอย่างเดียว)', description: `HN ${hn} · ${vn} · ${en} — บันทึก Triage + Physician Note (Dx ${code}) ไว้ในรอบก่อน` });
        await gotoErDashboard(page);
      } else {
        await checkStep(page, 'ขั้น 1 Login ด้วย User1 ลงทะเบียนผู้ป่วยใหม่ แล้วเปิด Visit ER', async () => {
          await gotoErDashboard(page);
          const patient = newTestPatient('Save2373');
          visit = await registerAndOpenErVisit(page, patient).catch(async (error: Error) => {
            // SBH Prod: ช่วงเวลาออกตรวจของแพทย์ ER วันนั้นถูกใช้หมด → แพทย์ขึ้น "(Full)" กดยืนยันแล้วระบบไม่ส่งคำสั่ง — ไม่แก้ตารางแพทย์ หยุดพร้อมบอกสาเหตุ
            const full = await openVisitDialog(page).getByText(/\(Full\)|ไม่พบเวลาที่สามารถลงได้/).first().isVisible().catch(() => false);
            if (!full) throw error;
            throw new Error(`เปิด Visit ER ให้ ${patient.firstName} ${patient.familyName} ไม่ได้ — ช่วงเวลาออกตรวจของแพทย์วันนี้เต็ม · ผู้ป่วยถูกลงทะเบียนแล้วแต่ไม่มี Visit`);
          });
          const state = 'SBH-2373 · เปิด Visit ER สิทธิ UC + Triage ESI 3 + ER Physician Note (เทสการ์ด ปิด Visit ท้ายเทส)';
          if (SYSTEM === 'sbh-prod') recordMockPatient('SBH-2373', patient, visit, state);
          else console.log(`    ผู้ป่วย: ${patient.firstName} ${patient.familyName} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
          test.info().annotations.push({ type: 'ผู้ป่วย', description: `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });
          await expectTriageFormOpen(page, visit);
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          await markEvidence(...[`HN ${visit.hn}`, `VN ${visit.vn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first())));
          await holdForClip(page);
        });

        await checkStep(page, 'ขั้น 2 กรอก Form Triage แล้วกด บันทึก — ต้องบันทึกได้', async () => {
          // SBH Prod: ข้อมูล Encounter โหลดไม่สำเร็จเป็นพักๆ ปุ่ม GCS จะกดไม่ได้ค้างอยู่ → เปิดหน้า Visit ใหม่ (แบบเดียวกับสคริปต์ Mock)
          const gcs = triageForm(page).getByRole('button', { name: 'เลือกคะแนน' }).first();
          let rounds = 0;
          await expect(async () => {
            if (rounds++) {
              await gotoVisit(page, visit);
              await expectTriageFormOpen(page, visit);
            }
            if (await gcs.count()) await expect(gcs).toBeEnabled({ timeout: 10_000 });
          }, 'ฟอร์มคัดกรองต้องพร้อมให้กรอก').toPass({ timeout: 150_000 });
          await fillTriage(page, visit, { level: 3, vitals: VITALS_NORMAL });
          await markEvidence(filled(triageForm(page).getByRole('button', { name: ESI_BUTTON[3] })), clicked(saveButton(page)));
          await holdForClip(page);
          await snapEvidence(page, 'ก่อนกด — ปุ่ม บันทึก ของ Form Triage');

          const before = saves.length;
          await saveTriageForm(page, visit);
          const toast = page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true });
          const summary = main.getByText('Clinical Summary', { exact: true });
          await expect(summary, 'บันทึก Triage แล้วหน้าต้องเปลี่ยนเป็น Overview ของ Visit').toBeVisible({ timeout: 60_000 });
          expectFormSavesOk(saves, before, 'Form Triage');
          await expect(page.getByText('clinical form access denied')).toHaveCount(0);
          if (await toast.isVisible()) await markEvidence(alerted(toast), expected(summary));
          else await markEvidence(expected(summary));
          await holdForClip(page, 2_000);
        });

        await checkStep(page, 'ขั้น 3 กรอก ER Physician Note แล้วกด บันทึก — ต้องบันทึกได้', async () => {
          await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
          const before = saves.length;
          const chosen = await savePhysicianNote(page, 'K30'); // เลือก Diagnosis ทุกครั้ง (R21) · ข้างในตรวจว่าคำสั่งบันทึกของฟอร์มนี้ตอบสำเร็จ
          dx = chosen.split(' ')[0];
          test.info().annotations.push({ type: 'ER Physician Note', description: `Diagnosis ที่เลือก: ${chosen}` });
          expectFormSavesOk(saves, before, 'ER Physician Note');
          await expect(page.getByText('clinical form access denied')).toHaveCount(0);
          // หลังบันทึก: ตีกรอบเฉพาะสิ่งที่ยังอยู่บนจอ (ฟอร์มอาจถูกโหลดใหม่หลังบันทึก)
          const heading = main.getByRole('heading', { name: 'ER Physician Note' }).filter({ visible: true }).first();
          const diagnosis = main.getByPlaceholder(dx, { exact: true }).filter({ visible: true }).first();
          const toast = page.getByText('กรอกข้อมูล ER Physician Note สำเร็จ', { exact: true });
          const marks = [...((await toast.isVisible()) ? [alerted(toast)] : []), ...((await heading.count()) ? [expected(heading)] : []), ...((await diagnosis.count()) ? [filled(diagnosis)] : [])];
          if (marks.length) await markEvidence(...marks);
          await holdForClip(page, 2_000);
        });
      }

      await checkStep(page, 'ขั้น 4 โหลดหน้าผู้ป่วยใหม่ — ข้อมูลที่บันทึกยังอยู่ทั้ง 2 ฟอร์ม', async () => {
        await gotoVisit(page, visit);
        await expectVisitHeader(page, visit);

        await checkStep(page, 'Expected Form Triage ถูกบันทึก — Visit ผ่านขั้นคัดกรองแล้ว', async () => {
          const summary = main.getByText('Clinical Summary', { exact: true });
          // SBH Prod: ข้อมูล Encounter โหลดไม่สำเร็จเป็นพักๆ (หน้าขึ้น "ไม่สามารถโหลดข้อมูลการมา ER ได้") → จด response ที่พัง แล้วเปิดหน้าใหม่
          const failedLoads: string[] = [];
          const watch = (res: Response) => {
            const { pathname } = new URL(res.url());
            if (!res.ok() && pathname.includes(visit.en)) failedLoads.push(`${res.request().method()} ${pathname} → ${res.status()}`);
          };
          page.on('response', watch);
          let rounds = 0;
          await expect(async () => {
            if (rounds++) await gotoVisit(page, visit);
            await expect(summary, `Visit ที่บันทึก Triage แล้วต้องเปิดเป็นหน้า Overview (ไม่กลับไปขั้นคัดกรอง) — API ที่ตอบไม่สำเร็จ: ${failedLoads.join(' | ') || '-'}`).toBeVisible({ timeout: 30_000 });
          }).toPass({ timeout: 150_000 });
          page.off('response', watch);
          if (failedLoads.length) test.info().annotations.push({ type: 'API ที่ตอบไม่สำเร็จระหว่างเปิดหน้า Visit', description: failedLoads.join(' | ') });
          // SBH Prod ตัดการเชื่อมต่อเป็นพักๆ (ECONNRESET / 502) → ลองอ่านซ้ำ
          let encounter: Record<string, unknown> | undefined;
          await expect(async () => {
            encounter = await boardEncounter(page, authorization(), visit.en);
          }, 'อ่านข้อมูลบอร์ด ER').toPass({ timeout: 60_000, intervals: [3_000] });
          await test.info().attach(`ข้อมูลบอร์ด ER — ${visit.en}`, { body: JSON.stringify(encounter ?? null, null, 2), contentType: 'application/json' });
          expect(encounter?.triagedAt, 'API บอร์ด ER ต้องมีเวลาคัดกรองของ Encounter นี้').toBeTruthy();
          test.info().annotations.push({ type: 'Triage ที่บันทึก', description: `triageLevel ${JSON.stringify(encounter?.triageLevel)} · triagedAt ${String(encounter?.triagedAt)}` });
          await markEvidence(expected(summary), expected(main.getByText(visit.en, { exact: true }).filter({ visible: true }).first()));
          await holdForClip(page, 2_000);
        });

        await checkStep(page, 'Expected ER Physician Note ถูกบันทึก — เปิดฟอร์มแล้วเห็น Diagnosis ที่บันทึกไว้', async () => {
          await openCarePanel(page, 'ER Physician Note', main.getByRole('heading', { name: 'ER Physician Note' }));
          const diagnosis = main.getByPlaceholder(dx, { exact: true });
          await expect(diagnosis, `ช่อง Diagnosis ของ ER Physician Note ต้องแสดงรหัส ${dx} ที่บันทึกไว้`).toBeVisible({ timeout: 45_000 });
          await markEvidence(expected(main.getByRole('heading', { name: 'ER Physician Note' })), expected(diagnosis));
          await holdForClip(page, 2_500);
        });
      });
    },
  );
});
