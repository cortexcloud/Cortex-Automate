import type { Locator, Page, Response } from '@playwright/test';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit, scheduleWalkInRequest } from '../../../mock-data/uat-er';
import { recordMenu } from '../../../mock-data/uat-play';

// การ์ดบั๊ก SBH-1384 [OPD][EMR] แก้ไขข้อมูลคนไข้แล้วสร้างเอกสาร Refer Out ไม่สำเร็จ (+ ตัวแก้ SBH-2353) — EXE SBH-2619 → TS SBH-2620 → TC-001–003 (SBH-2621–2623)
// 1 เทส = 1 flow (R9) ผู้ป่วย AUTO ใหม่ 1 ราย (ลงทะเบียน + Visit OPD ที่เวชระเบียน R53 → เช็คอินจากรายการผู้ป่วยนอก) แล้วเล่น TC-001 → 002 → 003 ต่อกัน · คลิปแยกต่อ TC (R61 · startClip)
// เข้าหน้า EMR จากรายการผู้ป่วยนอก (URL มี en / vn / fromApp=opd) แบบที่ผู้ใช้ทำจริง
// dev-x 18 ต.ค. 2026 (index-DCWqWjoW.js): แก้ไขข้อมูลผู้ป่วยแล้ว URL เหลือ ?actions=patientEdit → ?views=patientInfo (ไม่มี en / vn) แถบ Visit หาย
//   ปุ่ม สร้างเอกสาร disabled + tooltip "กรุณาเปิด Visit ก่อนสร้างเอกสาร" · แก้ไข Visit จากประวัติการรับบริการ URL ยังมี en / vn
// TC-002 ใช้เอกสารจาก TC-001 — TC-001 สร้างไม่ได้ ใช้ทางเลี่ยงตามการ์ด (ออกจาก EMR แล้วเข้าใหม่จากรายการผู้ป่วยนอก) สร้างเอกสารแล้วกด View · จดเป็นหมายเหตุ
//   ผู้ใช้ตัดสิน 18 ต.ค. 2026: ผลจากทางเลี่ยง = (-) ตรวจไม่ได้ (Pre-condition ไม่ครบ) ไม่ใช่ Pass
// TC ที่ไม่ผ่านไม่หยุดเทส (soft) — เทสจบไม่ผ่านพร้อมรายการขั้น · ไม่ปิด Visit (R11)
// ทำต่อกับผู้ป่วยเดิม (เช็คอินแล้ว): SBH1384_VISIT=<HN>,<VN>,<EN>
// รัน dev-x: npx playwright test --headed --grep @SBH-1384 --output=.cache/run-1384
// รัน SBH Prod (ผู้ใช้อนุญาต 18 ต.ค. 2026: สร้าง 1 ราย ทิ้ง Visit ไว้): npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep @SBH-1384 --output=.cache/run-1384-prod
//   Prod: Visit อายุรกรรมเป็น "คำขอ Walk-in" → ลงตารางแพทย์ (เช็คอินให้เอง) · ลงทะเบียนแล้วพังก่อนได้ Visit → SBH1384_HN=<HN> (ห้ามสร้างรายใหม่)

const DOC = 'แบบสำหรับส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อ';
const FAIL_TOAST = `สร้าง${DOC}ไม่สำเร็จ`;
const TC1 = 'TC-001 (SBH-2621)';
const TC2 = 'TC-002 (SBH-2622)';
const TC3 = 'TC-003 (SBH-2623)';
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');

/** ค่าที่กรอกในเอกสารส่งต่อ (ช่องบังคับ) */
interface ReferInput {
  hospital: string;
  type: string;
  dx: string;
  reason: string;
}

/** ข้อความทุกบรรทัดของ PDF (pdf.js ฝั่ง node) */
async function pdfText(body: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(body), useSystemFonts: false, isEvalSupported: false }).promise;
  const lines: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    lines.push(content.items.map((item: { str?: string }) => item.str ?? '').join(' '));
  }
  return lines.join('\n').replace(/\s+/g, ' ');
}

test.describe('SBH-1384 สร้างเอกสาร Refer Out หลังแก้ไขข้อมูลผู้ป่วย / แก้ไข Visit ในหน้า EMR', () => {

  test(
    'ผู้ป่วย AUTO ใหม่: Visit OPD → แก้ไขข้อมูลผู้ป่วย → สร้างเอกสารส่งต่อ → View → แก้ไข Visit → สร้างเอกสารส่งต่อ (Super_User)',
    { tag: ['@SBH-1384', '@SBH-2621', '@SBH-2622', '@SBH-2623'], annotation: ['SBH-1384', 'SBH-2621', 'SBH-2622', 'SBH-2623'].map(linear) },
    async ({ page }) => {
      test.setTimeout(900_000);
      const main = page.getByRole('main');
      const failures: string[] = [];
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      const soft = (title: string, body: () => Promise<void>) =>
        checkStep(page, title, body).then(
          () => true,
          (error: unknown) => {
            failures.push(`${title} — ${firstLine(error)}`);
            console.log(`    ✗ ${title} — ${firstLine(error)}`);
            return false;
          },
        );

      // จดแจ้งเตือนทุกตัว (หายเองใน ~4.5 วินาที)
      await page.addInitScript(() => {
        const w = window as unknown as { __notices: string[] };
        w.__notices = [];
        new MutationObserver(() => {
          for (const el of document.querySelectorAll('.ant-notification-notice:not([data-seen]), .ant-message-notice:not([data-seen])')) {
            el.setAttribute('data-seen', '1');
            w.__notices.push((el.textContent ?? '').trim());
          }
        }).observe(document, { childList: true, subtree: true });
      });
      const notices = () => page.evaluate(() => (window as unknown as { __notices?: string[] }).__notices ?? []).catch(() => [] as string[]);

      let [hn, vn, en] = (process.env.SBH1384_VISIT ?? '').split(',');
      const resumeHn = process.env.SBH1384_HN;
      let walkInRequest = false;
      let newVisitEnabled = false;
      if (!hn) {
        const patient = newTestPatient('Refer1384');
        await checkStep(page, resumeHn ? `Pre-condition ผู้ป่วย AUTO ที่ลงทะเบียนไว้แล้ว (HN ${resumeHn})` : 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน', async () => {
          if (resumeHn) {
            hn = resumeHn;
            await page.goto(`/cortex/next/patients/${hn}?views=patientInfo`);
            newVisitEnabled = await expectPatientInfo(page);
            return;
          }
          await gotoReception(page);
          await markEvidence(clicked(newPatientButton(page)));
          await fillNewPatientForm(page, patient);
          const f = receptionFrame(page);
          const save = saveNewPatientButton(page);
          await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await markEvidence(filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), filled(f.getByTestId('birthDate')), clicked(save));
          await snapEvidence(page, 'ก่อนกด — บันทึกผู้ป่วยใหม่');
          hn = await saveNewPatient(page);
          console.log(`    ผู้ป่วย: ${patient.firstName} ${patient.familyName} · HN ${hn} · ถ้าพังก่อนได้ Visit รันซ้ำด้วย SBH1384_HN=${hn}`);
          newVisitEnabled = await expectPatientInfo(page);
          await markEvidence(expected(main.getByText(`HN ${hn}`, { exact: true }).first()));
        });
        await checkStep(page, 'Pre-condition เปิด Visit OPD แผนกอายุรกรรม', async () => {
          // ปุ่ม Visit ใหม่ disabled (SBH Prod: lock-status ล้มเป็นพักๆ) → openOpdVisit เปิดจากเมนูจัดการ Visit ของหน้าผู้ป่วยเอง
          if (newVisitEnabled) await openNewVisitPanel(page);
          else note('เปิด Visit', 'ปุ่ม Visit ใหม่ disabled → เปิดจากเมนูจัดการ Visit');
          const opd = await openOpdVisit(page);
          vn = opd.vn;
          en = opd.en;
          note('ผู้ป่วย', `${resumeHn ? 'ผู้ป่วย AUTO รอบก่อน' : `${patient.firstName} ${patient.familyName}`} · HN ${hn} · ${vn} · EN (OPD) ${en} · ${opd.clinic} · ${opd.doctor || 'คำขอ Walk-in'}`);
          console.log(`    ทำต่อกับรายเดิม: SBH1384_VISIT=${hn},${vn},${en}`);
          await markEvidence(expected(main.getByRole('row').filter({ hasText: 'Walk-in' }).first()));
          walkInRequest = !opd.doctor;
        });
        if (walkInRequest) {
          // SBH Prod: Visit อายุรกรรมเป็น "คำขอ Walk-in" → ลงตารางแพทย์ (ระบบเช็คอินให้เอง)
          await checkStep(page, 'Pre-condition ลงตารางแพทย์ (คำขอ Walk-in) เช็คอินอัตโนมัติ', async () => {
            const scheduled = await scheduleWalkInRequest(page, hn);
            note('ลงตารางแพทย์', `${scheduled.doctor} · ${scheduled.slot}`);
          });
        } else {
          await checkStep(page, 'Pre-condition เช็คอิน Visit OPD จากรายการผู้ป่วยนอก', async () => {
            await selectOpdUnit(page);
            const row = await opdListRow(page, hn);
            await markEvidence(expected(row.getByText(`HN ${hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
            await snapEvidence(page, 'ก่อนกด — เช็คอิน Visit OPD');
            await checkInFromOpdList(page, row);
            await markEvidence(expected(row));
          });
        }
      } else {
        note('ผู้ป่วย', `ผู้ป่วยเดิม HN ${hn} · ${vn} · EN (OPD) ${en}`);
        // เปิดหน้าแรกก่อน startClip — คลิปเริ่มอัดเมื่อหน้าแรกโหลด (Prod 19 ต.ค. รอบทำต่อ: ไม่มีไฟล์ clip-TC-001 ช่วงนั้นไปอยู่ใน video.webm)
        await selectOpdUnit(page);
      }

      const visitBar = main.getByText(`VN ${vn}`, { exact: true }).first();
      const createButton = main.getByRole('button', { name: /สร้างเอกสาร/ });
      const docsPanel = main.locator('div').filter({ has: page.getByRole('button', { name: /ตรวจสอบเอกสาร ORS/ }) }).filter({ has: page.locator('table') }).last();
      const docRows = docsPanel.locator('tr.ant-table-row');
      const createPanel = main.locator('div').filter({ has: page.getByText('เอกสารที่สร้างแล้ว') }).filter({ has: page.getByRole('button', { name: /บันทึก$/ }) }).last();

      /** เปิดหน้า EMR ของผู้ป่วยจากรายการผู้ป่วยนอก (คลิกชื่อในแถว) แบบที่ผู้ใช้ทำจริง */
      const openEmrFromOpdList = async () => {
        if (!/\/opd\/patient-list/.test(page.url())) await selectOpdUnit(page);
        const row = await opdListRow(page, hn);
        const name = row.getByText(/AUTO\s/).first();
        await markEvidence(clicked(name));
        await snapEvidence(page, 'ก่อนกด — ชื่อผู้ป่วยในรายการผู้ป่วยนอก');
        await name.click();
        await expect(visitBar, 'เปิดหน้า EMR แล้วต้องเห็นแถบ Visit ของผู้ป่วย').toBeVisible({ timeout: 90_000 });
        // รอแผง OPD Note / คำสั่งการรักษา โหลดเสร็จก่อนถ่าย (ไม่ใช่ Expected — ไม่โหลดก็ทำต่อ)
        await expect(main.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
        const error = page.getByText('เกิดข้อผิดพลาดในระบบ', { exact: true });
        if (await error.isVisible().catch(() => false)) note('ข้อสังเกต', 'เปิดหน้า EMR แล้วมีแจ้งเตือน "เกิดข้อผิดพลาดในระบบ" (ไม่กระทบขั้นของ TC)');
        note('URL หน้า EMR', page.url());
      };

      /** เมนูซ้ายกางค้างหลังกดเมนู (บังรายการ) → คลิกที่ว่างของเนื้อหาให้หุบ */
      const collapseMenu = async () => {
        await page.mouse.click(420, 760);
        await page.mouse.move(700, 900);
      };

      /** ปิดแท็บแผงขวา (สร้างเอกสาร / คำสั่งการรักษา) ให้แผงเอกสารกว้างพอเห็นทั้งแถวและปุ่ม View — ไม่ใช่ขั้นของ TC */
      const closeSidePanels = async () => {
        for (const name of ['สร้างเอกสาร', 'คำสั่งการรักษา']) {
          const tab = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
          if (await tab.count()) await tab.first().locator('.dv-default-tab-action').click().catch(() => undefined);
        }
      };

      /** เมนูซ้าย "เอกสาร" → จำนวนแถวในรายการเอกสาร (รอรายการโหลด) */
      const openDocuments = async (clearDoctor = true): Promise<number> => {
        await recordMenu(page, 'เอกสาร');
        await expect(createButton).toBeVisible({ timeout: 60_000 });
        await expect(docRows.first().or(docsPanel.locator('.ant-table-placeholder'))).toBeVisible({ timeout: 30_000 });
        await collapseMenu();
        // SBH Prod 19 ต.ค. 2026: เอกสารส่งต่อที่สร้างไม่มีชื่อแพทย์ ("-") แต่รายการกรอง "แพทย์ = ผู้ที่ล็อกอิน" ไว้ให้ตั้งแต่เปิด → ไม่เห็นเอกสาร
        // ผู้ใช้ให้ลง "ผ่าน + ข้อสังเกต" → ตรวจ Expected กับรายการที่เอาตัวกรองแพทย์ออกแล้ว (เปลี่ยนแค่ตัวกรองบนจอ ไม่เขียนข้อมูล)
        if (clearDoctor) {
          const remove = docsPanel.locator('.ant-select-selection-item-remove');
          if (await remove.count()) {
            // รอคำขอรายการชุดใหม่ที่ไม่มีตัวกรองแพทย์ตอบกลับ ก่อนนับแถว (รอบ 2 บน Prod นับก่อนรายการโหลดใหม่ได้ 0)
            const reloaded = page.waitForResponse((r) => /\/document-with-types\?/.test(r.url()) && !/documentIndexPractitionerId/.test(decodeURIComponent(r.url())), { timeout: 30_000 });
            reloaded.catch(() => undefined);
            for (let i = 0; i < 3 && (await remove.count()); i++) await remove.first().click();
            await reloaded.catch(() => undefined);
            await expect(docRows.first().or(docsPanel.locator('.ant-table-placeholder'))).toBeVisible({ timeout: 30_000 });
            await page.waitForTimeout(1_000); // ให้ตารางวาดแถวชุดใหม่เสร็จ
          }
        }
        return docRows.count();
      };

      /** กรอบของแถวเอกสาร: เฉพาะช่องประเภท + วันที่สร้าง (ทั้งแถวกว้างเกินแผง กรอบลากทับแผงข้างๆ) */
      const docRowMarks = (row: Locator) => [expected(row.getByRole('cell').nth(1)), expected(row.getByRole('cell').filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ }).first())];

      /** กดสร้างเอกสาร → เลือกแบบส่งต่อ → กรอกช่องบังคับ → บันทึก → คืน response ของการบันทึก + ค่าที่กรอก */
      const createReferral = async (tag: string): Promise<{ res: Response; input: ReferInput }> => {
        await createButton.click();
        const search = createPanel.locator('.ant-select').filter({ hasText: 'ค้นหาเอกสารที่ต้องการสร้าง' }).last();
        await expect(search).toBeVisible({ timeout: 30_000 });
        await search.click();
        await search.getByRole('combobox').fill('ส่งผู้ป่วย');
        const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: DOC }).first();
        await expect(option).toBeVisible({ timeout: 20_000 });
        await option.click();
        const form = createPanel.locator('div').filter({ has: page.getByText('สาเหตุการส่งต่อ', { exact: true }) }).filter({ has: page.getByText('สถานพยาบาลปลายทาง', { exact: true }) }).last();
        await expect(form.getByPlaceholder('สาเหตุการส่งต่อ')).toBeVisible({ timeout: 30_000 });
        // พิมพ์อัตโนมัติเมื่อบันทึก — เอาออก (เครื่องเทสไม่มีเครื่องพิมพ์ / print agent)
        const autoPrint = createPanel.getByRole('checkbox', { name: 'พิมพ์อัตโนมัติเมื่อบันทึก' });
        if (await autoPrint.isChecked().catch(() => false)) await autoPrint.click();
        const input: ReferInput = { hospital: 'โรงพยาบาลห้วยเกิ้ง', type: 'รับไว้รักษาต่อ', dx: 'Functional dyspepsia', reason: `ส่งตรวจต่อ AUTO ${tag}` };
        const dropdown = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
        const hospital = form.getByPlaceholder('สถานพยาบาลปลายทาง');
        await hospital.click();
        await hospital.fill(input.hospital);
        // รายชื่อ รพ. / ICD ของ SBH Prod อาจไม่มีตัวเดียวกับ dev-x → ใช้ตัวแรกของผลค้นทั่วไปแล้วจดค่าที่เลือกจริง
        const hospitalOption = dropdown.filter({ hasText: new RegExp(`^${input.hospital}$`) }).first();
        if (!(await hospitalOption.isVisible({ timeout: 5_000 }).catch(() => false))) {
          await hospital.fill('โรงพยาบาล');
          await expect(dropdown.first()).toBeVisible({ timeout: 15_000 });
          input.hospital = (await dropdown.first().innerText()).trim();
          await dropdown.first().click();
        } else await hospitalOption.click();
        await form.getByRole('radio', { name: input.type }).check();
        const dx = form.getByPlaceholder('การวินิจฉัยโรคขั้นต้น');
        await dx.click();
        await dx.fill('K30');
        await expect(dropdown.first()).toBeVisible({ timeout: 15_000 });
        const dxOption = dropdown.filter({ hasText: input.dx }).first();
        if (!(await dxOption.count())) input.dx = (await dropdown.first().innerText()).trim();
        await dropdown.filter({ hasText: input.dx }).first().click();
        note(`ค่าที่กรอก (${tag})`, `${input.hospital} · ${input.type} · ${input.dx} · ${input.reason}`);
        const reason = form.getByPlaceholder('สาเหตุการส่งต่อ');
        await reason.fill(input.reason);
        const save = createPanel.getByRole('button', { name: /บันทึก$/ }).first();
        await expect(form).toContainText(input.dx);
        await markEvidence(filled(hospital), filled(form.getByRole('radio', { name: input.type })), filled(dx), filled(reason), clicked(save));
        await snapEvidence(page, `ก่อนกด — บันทึกเอกสารส่งต่อ (${tag})`);
        const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/cortex-api\/reports\/generate$/.test(new URL(r.url()).pathname), { timeout: 60_000 });
        await save.click();
        const res = await saved;
        // แจ้งเตือนผลการบันทึก (หายเองใน ~4.5 วินาที) — ถ่ายทันทีที่ขึ้น
        const toast = page.getByText(/^สร้างแบบสำหรับส่งผู้ป่วยไปรับการตรวจหรือรักษาต่อ\s*(ไม่)?สำเร็จ$/).first();
        const toastText = await toast.waitFor({ timeout: 15_000 }).then(async () => (await toast.innerText()).replace(/\s+/g, ' '), () => '');
        note(`แจ้งเตือนหลังบันทึก (${tag})`, toastText || '(ไม่เห็นแจ้งเตือน)');
        if (toastText) {
          await toast.hover({ trial: true });
          await markEvidence(alerted(toast));
          await snapEvidence(page, `หลังกด — บันทึกเอกสาร (${tag})`);
        }
        expect(toastText, 'บันทึกแล้วต้องขึ้นแจ้งเตือนสร้างเอกสารสำเร็จ').toMatch(/สำเร็จ$/);
        expect(toastText, `ต้องไม่มีแจ้งเตือน "${FAIL_TOAST}"`).not.toContain('ไม่สำเร็จ');
        const payload = JSON.parse(res.request().postData() ?? '{}') as { id?: number; documentIndexParams?: Record<string, unknown> };
        note(`บันทึกเอกสาร (${tag})`, `POST /cortex-api/reports/generate ${res.status()} ${res.headers()['content-type'] ?? ''} · report ${payload.id} · documentIndexParams ${JSON.stringify(payload.documentIndexParams)} · x-document-index-id ${res.headers()['x-document-index-id'] ?? '-'} · x-document-id ${res.headers()['x-document-id'] ?? '-'}`);
        return { res, input };
      };

      /** หลังบันทึก: ไม่มีแจ้งเตือนไม่สำเร็จ + เอกสารขึ้นในรายการ (จำนวนเพิ่ม 1) */
      const expectSaved = async (res: Response, before: number, tag: string) => {
        const seen = await notices();
        if (seen.some((text) => text.includes('ไม่สำเร็จ'))) note(`แจ้งเตือนไม่สำเร็จ (${tag})`, seen.join(' | '));
        expect(res.status(), 'คำสั่งบันทึกเอกสารต้องสำเร็จ').toBe(200);
        expect(seen.join(' | '), `ต้องไม่มีแจ้งเตือน "${FAIL_TOAST}"`).not.toContain(FAIL_TOAST);
        await closeSidePanels();
        // รายการตั้งต้น (ตัวกรองที่ระบบใส่ให้) — เห็นเอกสารที่เพิ่งสร้างไหม
        const defaultCount = await openDocuments(false);
        const doctorFilter = docsPanel.locator('.ant-select').filter({ has: page.locator('.ant-select-selection-item-remove') }).first();
        const hasDoctorFilter = (await doctorFilter.count()) > 0;
        await expect(async () => {
          expect(await openDocuments()).toBe(before + 1);
        }, `เอกสารต้องแสดงในรายการเอกสาร (จาก ${before} เป็น ${before + 1} รายการ)`).toPass({ timeout: 60_000 });
        const row = docRows.first();
        if (hasDoctorFilter && defaultCount < before + 1) {
          note(`ข้อสังเกต (${tag})`, `รายการเอกสารตั้งต้น (ตัวกรองแพทย์ = ผู้ที่ล็อกอิน) แสดง ${defaultCount} รายการ — เอกสารที่เพิ่งสร้างไม่มีชื่อแพทย์ จึงเห็นเมื่อเอาตัวกรองแพทย์ออก (${before + 1} รายการ)`);
          // ภาพข้อสังเกต: กลับไปรายการตั้งต้นที่ไม่เห็นเอกสาร แล้วค่อยเอาตัวกรองออก
          await openDocuments(false);
          await markEvidence(expected(doctorFilter), expected(docsPanel.locator('.ant-table-placeholder, tr.ant-table-row').first()));
          await snapEvidence(page, `ข้อสังเกต — ตัวกรองแพทย์ตั้งต้น ไม่เห็นเอกสาร (${tag})`);
          await openDocuments();
          await markEvidence(...docRowMarks(row), expected(row.getByRole('cell').filter({ hasText: /^\s*-\s*$/ }).first()));
          await snapEvidence(page, `เอาตัวกรองแพทย์ออก — เอกสาร ช่องแพทย์ว่าง (${tag})`);
        }
        await markEvidence(...docRowMarks(row));
        await holdForClip(page);
        return row;
      };

      // ── TC-001 แก้ไขข้อมูลผู้ป่วย → สร้างเอกสารส่งต่อโดยไม่ออกจาก EMR ──
      let tc1Doc = false;
      let tc1Input: ReferInput | undefined;
      await startClip(page, 'TC-001');
      const docsBefore = { count: 0 };
      await soft(`${TC1} ขั้น 1 เปิดหน้า EMR จากรายการผู้ป่วยนอก`, async () => {
        await openEmrFromOpdList();
        await markEvidence(expected(visitBar), expected(main.getByText(en, { exact: true }).first()));
      });
      const email = `auto1384.${Date.now() % 1_000_000}@example.com`;
      const edited = await soft(`${TC1} ขั้น 2-3 ทะเบียนผู้ป่วย แก้ Email แล้วบันทึก`, async () => {
        await recordMenu(page, 'ทะเบียนผู้ป่วย');
        const f = receptionFrame(page);
        const edit = f.getByRole('button', { name: 'แก้ไขข้อมูลผู้ป่วย' });
        await expect(edit).toBeVisible({ timeout: 90_000 });
        await markEvidence(clicked(edit));
        await snapEvidence(page, 'ก่อนกด — แก้ไขข้อมูลผู้ป่วย');
        await edit.click();
        const field = f.getByTestId('email');
        await expect(field).toBeVisible({ timeout: 90_000 });
        // ฟอร์มโหลดค่าเดิมตามหลังแล้วล้างค่าที่เพิ่งกรอก (รอบแรก 18 ต.ค. บันทึกแล้ว Email ยังเป็น "-") → กรอกจนค่านิ่ง 2 วินาที
        await expect(async () => {
          if ((await field.inputValue()) !== email) await field.fill(email);
          await page.waitForTimeout(2_000);
          await expect(field).toHaveValue(email, { timeout: 1_000 });
        }, 'ช่อง Email ต้องคงค่าที่กรอก').toPass({ timeout: 60_000 });
        const submit = f.getByTestId('submit-button');
        // ช่อง Email อยู่ห่างจากปุ่มบันทึกเกินจอ → แยกภาพ
        await markEvidence(filled(field));
        await snapEvidence(page, 'กรอก — แก้ Email');
        await markEvidence(clicked(submit));
        await snapEvidence(page, 'ก่อนกด — บันทึกข้อมูลผู้ป่วย');
        note('URL ขณะแก้ไขข้อมูลผู้ป่วย', page.url());
        await submit.click();
        await expect(f.getByRole('button', { name: 'แก้ไขข้อมูลผู้ป่วย' })).toBeVisible({ timeout: 90_000 });
        await expect(f.getByText(email, { exact: true }), 'หน้าข้อมูลผู้ป่วยต้องแสดง Email ที่แก้').toBeVisible({ timeout: 30_000 });
        note('URL หลังบันทึกข้อมูลผู้ป่วย', page.url());
        await markEvidence(expected(f.getByText(email, { exact: true })));
        await holdForClip(page);
      });
      if (edited) {
        await soft(`${TC1} ขั้น 4-5 เมนูเอกสาร กดสร้างเอกสาร`, async () => {
          docsBefore.count = await openDocuments();
          note('URL หน้าเอกสาร (หลังแก้ข้อมูลผู้ป่วย)', `${page.url()} · แถบ Visit ${(await visitBar.isVisible()) ? 'แสดง' : 'ไม่แสดง'}`);
          if (!(await createButton.isEnabled())) {
            await createButton.hover({ force: true });
            const tip = page.locator('.ant-tooltip:visible').last();
            const tipText = (await tip.innerText({ timeout: 5_000 }).catch(() => '')).trim();
            note('ปุ่มสร้างเอกสาร', `disabled · tooltip "${tipText}"`);
            await markEvidence(expected(createButton), ...(tipText ? [alerted(tip)] : []));
            await holdForClip(page, 1_800);
          }
          await expect(createButton, 'หลังแก้ไขข้อมูลผู้ป่วย ปุ่มสร้างเอกสารต้องกดได้ (ไม่ต้องออกจากหน้า EMR)').toBeEnabled({ timeout: 5_000 });
        });
        if (await createButton.isEnabled().catch(() => false)) {
          await soft(`${TC1} ขั้น 5-6 กรอกเอกสารส่งต่อ บันทึก แสดงในรายการ`, async () => {
            const { res, input } = await createReferral('TC-001');
            tc1Input = input;
            await expectSaved(res, docsBefore.count, 'TC-001');
            tc1Doc = true;
          });
        } else {
          failures.push(`${TC1} ขั้น 5-6 บันทึกเอกสาร — ตรวจไม่ได้ (ปุ่มสร้างเอกสาร disabled)`);
        }
      }
      await page.mouse.move(700, 700);

      // ── TC-002 กด View เปิดดูเอกสารส่งต่อ ──
      await startClip(page, 'TC-002');
      let viewInput = tc1Input;
      if (!tc1Doc) {
        await soft(`${TC2} ขั้น 1 ทางเลี่ยง เข้า EMR ใหม่แล้วสร้างเอกสาร`, async () => {
          note('TC-002 หมายเหตุ', 'TC-001 สร้างเอกสารไม่ได้ จึงสร้างเอกสารหลังออกจาก EMR แล้วเข้าใหม่ (ทางเลี่ยงตามการ์ด) เพื่อทดสอบปุ่ม View');
          await openEmrFromOpdList();
          const before = await openDocuments();
          await expect(createButton).toBeEnabled({ timeout: 10_000 });
          const { res, input } = await createReferral('TC-002');
          viewInput = input;
          await expectSaved(res, before, 'TC-002');
        });
      }
      if (viewInput) {
        await soft(`${TC2} ขั้น 2 กด View เอกสารแสดงข้อมูลตามที่กรอก`, async () => {
          await closeSidePanels();
          await openDocuments();
          const row = docRows.first();
          const view = row.getByRole('button', { name: /View/i });
          await markEvidence(...docRowMarks(row), clicked(view));
          await snapEvidence(page, 'ก่อนกด — View เอกสารส่งต่อ');
          const pdfRes = page.waitForResponse((r) => r.request().method() === 'GET' && (r.headers()['content-type'] ?? '').includes('pdf'), { timeout: 60_000 });
          await view.click();
          const res = await pdfRes;
          note('เปิดเอกสาร (View)', `GET ${new URL(res.url()).pathname} ${res.status()} ${res.headers()['content-type']}`);
          expect(res.status()).toBe(200);
          // ตัวแสดง PDF = dialog class `_pdf-viewer-modal_` (กล่องเนื้อหา .ant-modal-container)
          const viewer = page.getByRole('dialog').filter({ visible: true }).locator('.ant-modal-container').last();
          await expect(viewer, 'กด View แล้วต้องเปิดหน้าต่างเอกสาร').toBeVisible({ timeout: 30_000 });
          const text = await pdfText(await res.body());
          // ชื่อผู้ป่วยจากแถบหัวของหน้า (AUTO <นามสกุล>)
          const patientName = ((await main.textContent()) ?? '').match(/AUTO Refer1384\d+/)?.[0] ?? '';
          await test.info().attach('ข้อความในเอกสาร (PDF)', { body: text, contentType: 'text/plain' });
          const input = viewInput!;
          const rows = [
            // หัวเอกสารต่างกันตามระบบ (dev-x "แบบสำหรับส่งผู้ป่วย…" · SBH Prod "ใบส่งต่อผู้ป่วยไปรักษาต่อ (Refer-out)") → เทียบชื่อผู้ป่วยแทน
            { label: 'ชื่อผู้ป่วย', values: [patientName, text.includes(patientName) ? patientName : '(ไม่พบ)'], same: !!patientName && text.includes(patientName) },
            { label: 'ถึง (สถานพยาบาลปลายทาง)', values: [input.hospital, text.includes(input.hospital) ? input.hospital : '(ไม่พบ)'], same: text.includes(input.hospital) },
            { label: 'ประเภทการส่งต่อ', values: [input.type, text.includes(input.type) ? `${input.type} (มีในเอกสาร — ช่องติ๊กดูจากภาพ)` : '(ไม่พบ)'], same: text.includes(input.type) },
            { label: 'การวินิจฉัยโรคขั้นต้น', values: [input.dx, text.includes(input.dx) ? input.dx : '(ไม่พบ)'], same: text.includes(input.dx) },
            { label: 'สาเหตุการส่งต่อ', values: [input.reason, text.includes(input.reason) ? input.reason : '(ไม่พบ)'], same: text.includes(input.reason) },
          ];
          await page.waitForTimeout(2_000); // ให้ตัวแสดง PDF วาดหน้าเสร็จก่อนถ่าย (จังหวะคลิป)
          await showCompareTable(page, 'เอกสารที่เปิด (View) เทียบค่าที่กรอก', ['ค่าที่กรอก', 'ข้อความใน PDF ที่เปิด'], rows, { side: 'left', width: '480px' });
          await markEvidence(expected(viewer));
          await holdForClip(page, 2_000);
          for (const r of rows) expect(r.same, `เอกสารต้องแสดง ${r.label}: ${r.values[0]}`).toBe(true);
        });
        await hideCompareTable(page);
        await page.keyboard.press('Escape');
      } else {
        failures.push(`${TC2} — ตรวจไม่ได้ (ไม่มีเอกสารให้กด View)`);
      }

      // ── TC-003 แก้ไข Visit จากประวัติการรับบริการ → สร้างเอกสารส่งต่อ ──
      await startClip(page, 'TC-003');
      const visitEdited = await soft(`${TC3} ขั้น 1-3 ประวัติรับบริการ แก้ไข Visit แล้วบันทึก`, async () => {
        await openEmrFromOpdList();
        await recordMenu(page, 'ประวัติการรับบริการ');
        const row = main.getByRole('row').filter({ hasText: en }).first();
        await expect(row).toBeVisible({ timeout: 45_000 });
        const enCell = row.getByRole('cell', { name: en });
        await markEvidence(clicked(enCell));
        await snapEvidence(page, 'ก่อนกด — EN ในประวัติการรับบริการ');
        await enCell.click();
        const mail = main.getByRole('checkbox', { name: 'ต้องการรับยาทางไปรษณีย์' });
        await expect(mail).toBeVisible({ timeout: 45_000 });
        // อ่านค่าตั้งต้นหลังฟอร์มโหลดค่าเดิมเสร็จ (แถวสิทธิขึ้น + รอนิ่ง) — อ่านเร็วไปได้ค่าก่อนโหลด แล้วสลับไม่ติด (SBH Prod รอบ 2)
        await expect(main.getByText(/^H\d{2} - /).first()).toBeVisible({ timeout: 45_000 });
        await page.waitForTimeout(2_000);
        const save = main.getByRole('button', { name: /^(save )?บันทึก$/ }).filter({ visible: true }).last();
        // ฟอร์มโหลดค่าตามหลังแล้วล้างค่าที่เพิ่งติ๊ก → ติ๊กซ้ำจนปุ่มบันทึกกดได้
        const target = !(await mail.isChecked());
        await expect(async () => {
          if ((await mail.isChecked()) !== target) await mail.click({ force: true });
          await page.waitForTimeout(2_000);
          expect(await mail.isChecked()).toBe(target);
          await expect(save).toBeEnabled({ timeout: 1_000 });
        }, 'แก้ไขข้อมูล Visit แล้วปุ่มบันทึกต้องกดได้').toPass({ timeout: 60_000 });
        await markEvidence(filled(mail), clicked(save));
        await snapEvidence(page, 'ก่อนกด — บันทึก Visit');
        await save.click();
        const saved = page.getByText('Visit saved successfully', { exact: true });
        const shown = await saved.waitFor({ timeout: 15_000 }).then(() => true, () => false);
        if (shown) await saved.hover({ trial: true });
        await expect(save, 'บันทึกแล้วปุ่มบันทึกกลับเป็นกดไม่ได้').toBeDisabled({ timeout: 30_000 });
        note('URL หลังบันทึก Visit', page.url());
        await markEvidence(...(shown ? [alerted(saved)] : []), expected(mail), expected(visitBar));
        await holdForClip(page);
      });
      if (visitEdited) {
        await soft(`${TC3} ขั้น 4-5 สร้างเอกสารส่งต่อ บันทึก แสดงในรายการ`, async () => {
          const before = await openDocuments();
          note('URL หน้าเอกสาร (หลังแก้ไข Visit)', `${page.url()} · แถบ Visit ${(await visitBar.isVisible()) ? 'แสดง' : 'ไม่แสดง'}`);
          await expect(createButton, 'หลังแก้ไข Visit ปุ่มสร้างเอกสารต้องกดได้').toBeEnabled({ timeout: 10_000 });
          const { res } = await createReferral('TC-003');
          await expectSaved(res, before, 'TC-003');
        });
      } else {
        failures.push(`${TC3} ขั้น 4-5 — ตรวจไม่ได้ (แก้ไข Visit ไม่สำเร็จ)`);
      }

      note('ผลรวม', failures.length ? `ไม่ผ่าน / ตรวจไม่ได้ ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
