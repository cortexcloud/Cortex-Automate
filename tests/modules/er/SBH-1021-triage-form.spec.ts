import { type Page } from '@playwright/test';
import {
  confirmOpenErVisit,
  dismissToast,
  expectOk,
  expectTriageFormOpen,
  gotoErDashboard,
  openTriagePage,
  registerNewPatient,
  waitForApi,
  type ErVisit,
} from '../../../helpers/er';
import {
  chooseGcs,
  fillVitalSigns,
  labelledBox,
  mewsRow,
  painScoreSelect,
  saveButton,
  selectArrivalDetail,
  triageForm,
  type VitalSigns,
} from '../../../helpers/er-triage';
import { checkStep, markEvidence } from '../../../helpers/evidence';
import { expect, test } from '../../../helpers/fixtures';
import { newTestPatient } from '../../../helpers/test-data';

// SBH-1021 [ER][Triage] Triage Form
// แปลงจากชุด Manual: EXE SBH-1739 → TC-001–008 (SBH-1746–SBH-1753) · 1 เทส = 1 flow กรอกฟอร์มจนบันทึก (R9)
// ไม่ทำ: TC-009 (SBH-1754) ถูก Cancel ในชุด Manual (ระบบตั้ง Non-Trauma ให้เอง) · TC-010 (SBH-1755) เวลา 10 วินาที — ผู้ใช้ให้ข้าม
// ผู้ใช้กำหนด 26 ก.ย. 2026: Vital Signs ไม่บังคับแล้ว · บันทึก Triage กับผู้ป่วย AUTO ได้ และทิ้งไว้บน dev-x (R17)
// ผู้ป่วยใหม่ AUTO ทุกรอบ (R10) — หลังบันทึก ผู้ป่วยย้ายจากคอลัมน์คัดกรองไปโซนเหลือง ER
// ภาพหลักฐาน: TC ที่เช็คหลายสถานะแยก checkStep ย่อยทีละสถานะ + markEvidence() ตีกรอบจุดที่เช็ค (R13)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });

/** ค่าที่กรอก — ได้ MEWS: RR 18 → 1 · อื่นๆ 0 · AVPU A 0 → รวม 1 */
const VITALS: VitalSigns = { systolic: '120', diastolic: '80', pr: '80', rr: '18', temp: '37', spo2: '98', painScore: '3' };
const VITAL_FIELDS: [string, keyof VitalSigns][] = [
  ['Systolic', 'systolic'],
  ['Diastolic', 'diastolic'],
  ['PR', 'pr'],
  ['RR', 'rr'],
  ['Temp', 'temp'],
  ['SpO2', 'spo2'],
];
/** MEWS ที่ระบบต้องดึงจาก VITALS: [แถว, ช่วงค่า, คะแนน] */
const MEWS_FROM_VITALS: [string, string, string][] = [
  ['Respiratory rate', '15-20', '1'],
  ['Heart rate', '51-100', '0'],
  ['Systolic BP', '101-199', '0'],
  ['Temperature', '35.0-38.4', '0'],
];
const AVPU_OPTIONS = ['A (0)', 'V (1)', 'P (2)', 'U (3)'];
const GCS_E4 = '4 — ลืมตาได้เอง (Spontaneous)';
const GCS_E3 = '3 — ลืมตาเมื่อเรียก/สั่ง (To verbal command)';
const GCS_V5 = '5 — พูดคุยรู้เรื่อง ตอบคำถามถูกต้อง (Oriented)';
const GCS_M6 = '6 — ทำตามคำสั่งได้ (Obeys commands)';
const CHIEF_COMPLAINT = 'ปวดท้อง';

/** เนื้อหาในตาราง MEWS / ช่อง Total ใช้ regex ยอมช่องว่างระหว่าง span */
const TOTAL_MEWS_1 = /Total MEWS\s*1\s*\/\s*14\s*Low Risk/;
const totalGcs = (code: string, score: number) => new RegExp(`Total GCS\\s*${code}\\s*${score}\\s*/\\s*15`);

function recordVisit(visit: ErVisit) {
  test.info().annotations.push(
    { type: 'HN', description: visit.hn },
    { type: 'VN', description: visit.vn },
    { type: 'EN', description: visit.en },
  );
  console.log(`HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
}

/** นับการส่งฟอร์มเข้า openEHR (POST .../ehr/<ehrId>/contribution) — ใช้เช็คว่า "ไม่บันทึก" จริง */
function trackContributions(page: Page): string[] {
  const sent: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/ehr\/[^/]+\/contribution$/.test(new URL(req.url()).pathname)) sent.push(req.url());
  });
  return sent;
}

/** ช่อง Vital Signs ทั้ง 7 ช่อง (BP 2 ช่อง, PR, RR, Temp, SpO2, Pain score) */
function vitalInputs(page: Page) {
  const form = triageForm(page);
  return [...VITAL_FIELDS.map(([name]) => form.getByRole('spinbutton', { name })), painScoreSelect(page)];
}

/** ตาราง MEWS (5 แถว) */
function mewsTable(page: Page) {
  // locator ใน has ต้องสร้างจาก page (ถูกค้นใต้ table) ไม่ใช่จาก triageForm
  return triageForm(page).getByRole('table').filter({ has: page.getByRole('cell', { name: 'AVPU', exact: true }) });
}

/** ช่องเลือก GCS ตามค่าที่เลือกอยู่ */
function gcsFields(page: Page, ...options: string[]) {
  return options.map((option) => triageForm(page).getByRole('button', { name: option, exact: true }));
}

/** กดบันทึกแล้วยังไม่บันทึก: ช่อง GCS ที่ยังว่างขึ้น "กรุณาเลือก …" และยังไม่มีประวัติการคัดกรอง */
async function expectGcsRequired(page: Page, fields: string[]) {
  const form = triageForm(page);
  const warnings = fields.map((field) => form.getByText(`กรุณาเลือก ${field}`));
  for (const [index, warning] of warnings.entries()) await expect(warning, `ต้องเตือนที่ช่อง ${fields[index]}`).toBeVisible();
  await expect(form.getByRole('listitem').filter({ hasText: 'ปัจจุบัน' }), 'ต้องยังไม่มีประวัติการคัดกรอง').toHaveCount(0);
  await markEvidence(...warnings, saveButton(page));
}

test.describe('SBH-1021 ฟอร์ม Triage (คัดกรอง ER)', () => {
  // สร้างผู้ป่วย + เปิด Visit + กรอกทั้งฟอร์ม + โหลดหน้าใหม่หลังบันทึก เกินค่าตั้งต้น 60 วินาที
  test.describe.configure({ timeout: 180_000 });

  test(
    'กรอกฟอร์ม Triage: MEWS ดึงจาก Vital Signs · GCS บังคับ · บันทึกครบแล้วข้อมูลผูกกับ EN (Super_User)',
    {
      tag: ['@SBH-1021', '@SBH-1746', '@SBH-1747', '@SBH-1748', '@SBH-1749', '@SBH-1750', '@SBH-1751', '@SBH-1752', '@SBH-1753'],
      annotation: [linear('SBH-1021'), linear('SBH-1739')],
    },
    async ({ page }) => {
      const form = triageForm(page);
      const contributions = trackContributions(page);

      const visit = await test.step('เตรียมข้อมูล: ผู้ป่วยใหม่ AUTO + เปิด Visit ER → หน้า Triage', async () => {
        await gotoErDashboard(page);
        await openTriagePage(page);
        const { dialog } = await registerNewPatient(page, newTestPatient('Triage'));
        const visit = await confirmOpenErVisit(page, dialog);
        await expectTriageFormOpen(page, visit);
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
        return visit;
      });
      recordVisit(visit);

      await checkStep(page, 'TC-002 / TC-003 ขั้น 2 ก่อนกรอก Vital Signs: MEWS ยังว่าง และ AVPU ยังไม่ถูกเลือก', async () => {
        for (const [row] of MEWS_FROM_VITALS) await expect(mewsRow(page, row)).toHaveText(new RegExp(`^${row}\\s*—\\s*—$`));
        const avpu = form.getByRole('button', { name: 'เลือกระดับความรู้สึกตัว' });
        const incomplete = form.getByText('Incomplete — ยังไม่ได้บันทึก Respiratory rate, Heart rate, Systolic BP, Temperature, AVPU');
        await expect(avpu).toBeVisible();
        await expect(incomplete).toBeVisible();
        await markEvidence(mewsTable(page), avpu, incomplete);
      });

      await checkStep(page, 'TC-001 (SBH-1746) Section Vital Signs มีช่อง BP, PR, RR, Temp, SpO2, Pain score ครบ และกรอกได้ทุกช่อง', async () => {
        await checkStep(page, 'มีช่อง Vital Signs ครบ 6 รายการ (BP บน/ล่าง, PR, RR, Temp, SpO2, Pain score) และพร้อมกรอก', async () => {
          await expect(form.getByRole('button', { name: /^Vital Signs/ })).toBeVisible();
          for (const [name] of VITAL_FIELDS) await expect(form.getByRole('spinbutton', { name })).toBeEditable();
          await expect(painScoreSelect(page)).toBeEnabled();
          await markEvidence(...vitalInputs(page));
        });
        await checkStep(page, 'กรอกครบทุกช่อง ระบบรับค่าไว้', async () => {
          await fillVitalSigns(page, VITALS);
          for (const [name, key] of VITAL_FIELDS) await expect(form.getByRole('spinbutton', { name })).toHaveValue(VITALS[key]);
          await expect(painScoreSelect(page)).toHaveValue(VITALS.painScore);
          await markEvidence(...vitalInputs(page));
        });
      });

      await checkStep(page, 'TC-002 (SBH-1747) ระบบ Prefill ค่า MEWS จาก Vital Signs ให้เอง (RR, HR, SBP, Temp)', async () => {
        for (const [row, range, score] of MEWS_FROM_VITALS) {
          await expect(mewsRow(page, row), `MEWS ${row}`).toHaveText(new RegExp(`^${row}\\s*${range}\\s*${score}$`));
        }
        const incomplete = form.getByText('Incomplete — ยังไม่ได้บันทึก AVPU');
        await expect(incomplete).toBeVisible();
        await markEvidence(mewsTable(page), incomplete);
      });

      await checkStep(page, 'TC-003 (SBH-1748) AVPU ไม่ถูก Prefill ต้องเลือกเอง → เลือกแล้วแสดง MEWS Total Score', async () => {
        await checkStep(page, 'หลังกรอก Vital Signs ช่อง AVPU ยังว่าง เปิดดูมีตัวเลือก A / V / P / U', async () => {
          const avpu = form.getByRole('button', { name: 'เลือกระดับความรู้สึกตัว' });
          await expect(avpu, 'AVPU ต้องยังว่างหลังกรอก Vital Signs').toBeVisible();
          await expect(mewsRow(page, 'AVPU')).toHaveText(/^AVPU\s*—\s*—$/);
          await avpu.click();
          const options = AVPU_OPTIONS.map((name) => form.getByRole('button', { name }));
          for (const option of options) await expect(option).toBeVisible();
          await markEvidence(avpu, ...options);
        });
        await checkStep(page, 'เลือก A แล้ว MEWS รวมทุกค่า: Total MEWS 1 / 14 Low Risk', async () => {
          await form.getByRole('button', { name: 'A (0)' }).click();
          await expect(mewsRow(page, 'AVPU')).toHaveText(/^AVPU\s*A\s*0$/);
          const total = labelledBox(form, 'Total MEWS');
          await expect(total, 'RR 1 + HR 0 + SBP 0 + Temp 0 + AVPU 0').toHaveText(TOTAL_MEWS_1);
          await markEvidence(total, mewsRow(page, 'AVPU'));
        });
      });

      await checkStep(page, 'TC-005 (SBH-1750) Trauma Classification เลือกได้ทีละค่า Trauma / Non-Trauma และเก็บค่าล่าสุด', async () => {
        const trauma = form.getByRole('radio', { name: 'Trauma', exact: true });
        const nonTrauma = form.getByRole('radio', { name: 'Non-Trauma' });
        const choices = form.getByRole('radiogroup').filter({ has: page.getByRole('radio', { name: 'Non-Trauma' }) });
        await checkStep(page, 'เป็นช่องบังคับ (*) และตั้งเป็น Non-Trauma ให้ตั้งแต่เปิดฟอร์ม', async () => {
          const heading = form.getByRole('button', { name: /^Trauma Classification \*/ });
          await expect(heading, 'ต้องเป็นช่องบังคับ (*)').toBeVisible();
          // ค่าเริ่มต้นนี้เป็นเหตุผลที่ TC-009 ถูก Cancel
          await expect(nonTrauma).toBeChecked();
          await markEvidence(choices, heading);
        });
        await checkStep(page, 'เลือก Trauma: Trauma ถูกเลือก Non-Trauma ถูกยกเลิก', async () => {
          await trauma.click();
          await expect(trauma).toBeChecked();
          await expect(nonTrauma).not.toBeChecked();
          await markEvidence(choices);
        });
        await checkStep(page, 'เปลี่ยนกลับเป็น Non-Trauma: เก็บค่าล่าสุด', async () => {
          await nonTrauma.click();
          await expect(nonTrauma).toBeChecked();
          await expect(trauma).not.toBeChecked();
          await markEvidence(choices);
        });
      });

      await checkStep(page, 'TC-006 (SBH-1751) Suspect Fast Track ไม่บังคับ เลือกแล้วยกเลิกกลับเป็นว่างได้', async () => {
        const heading = form.getByRole('button', { name: 'Suspect Fast Track ▾' });
        const notSuspect = form.getByRole('button', { name: 'Not Suspect Fast Track' });
        const suspect = form.getByRole('button', { name: 'Suspect Fast Track', exact: true, pressed: true });
        const fastTrackType = form.getByText('Fast Track Type');
        await checkStep(page, 'หัวข้อไม่มี * (ไม่บังคับ) และเริ่มต้นเป็นว่าง (Not Suspect Fast Track)', async () => {
          await expect(heading, 'หัวข้อต้องไม่มี *').toBeVisible();
          await expect(notSuspect).toBeVisible();
          await markEvidence(notSuspect, heading);
        });
        await checkStep(page, 'เลือก Suspect Fast Track: ปุ่มถูกเลือก และมีช่อง Fast Track Type ให้ระบุ', async () => {
          await notSuspect.click();
          await expect(suspect).toBeVisible();
          await expect(fastTrackType).toBeVisible();
          await markEvidence(suspect, fastTrackType);
        });
        await checkStep(page, 'ยกเลิกการเลือก: กลับเป็นว่าง (Not Suspect Fast Track)', async () => {
          await suspect.click();
          await expect(notSuspect).toBeVisible();
          await expect(fastTrackType).toBeHidden();
          await markEvidence(notSuspect);
        });
      });

      await test.step('กรอกช่องบังคับอื่น: อุปกรณ์ช่วยเหลือ · ผู้ที่มาด้วย · Chief Complaint · ระดับความเร่งด่วน ESI 4', async () => {
        await selectArrivalDetail(page, 'อุปกรณ์ช่วยเหลือ', 'ไม่มี', visit);
        await selectArrivalDetail(page, 'ผู้ที่มาด้วย', 'ญาติ', visit);
        await form.getByRole('button', { name: CHIEF_COMPLAINT, exact: true }).click();
        // ช่องสรุปอาการซ้อน 3 ชั้น (mb-input → sl-textarea → textarea) → ระบุ textarea ตรงๆ
        await expect(form.locator('textarea[placeholder="สรุปอาการและอื่น ๆ"]')).toHaveValue(CHIEF_COMPLAINT);
        // ESI 4 → ระบบเลือกโซนเหลืองให้ (ESI 5 จะเด้ง modal ส่งต่อคลินิก)
        await form.getByRole('button', { name: '4 กึ่งเร่งด่วน' }).click();
        await expect(form.getByRole('button', { name: /^โซนเหลือง ER แนะนำ/, pressed: true })).toBeVisible();
      });

      await checkStep(page, 'TC-008 (SBH-1753) เว้น GCS ว่าง: บันทึกไม่ได้ และระบบชี้ช่อง GCS ที่ยังไม่ได้ระบุ', async () => {
        // ปุ่มบันทึกกดได้ตั้งแต่เลือกระดับความเร่งด่วน — ระบบเช็คช่องบังคับตอนกดบันทึก
        await checkStep(page, 'GCS ว่างทั้งหมด กดบันทึก: ไม่บันทึก และขึ้น "กรุณาเลือก" ที่ช่อง E / V / M', async () => {
          await expect(form.getByText('Incomplete — ยังไม่ได้บันทึก Eye Opening (E), Verbal Response (V), Motor Response (M)')).toBeVisible();
          await saveButton(page).click();
          await expectGcsRequired(page, ['Eye Opening (E)', 'Verbal Response (V)', 'Motor Response (M)']);
          expect(contributions, 'ต้องไม่มีการส่งฟอร์มไปบันทึก').toEqual([]);
        });
        await checkStep(page, 'เลือกแค่ Eye Opening แล้วกดบันทึก: ยังไม่บันทึก และเตือนเฉพาะช่อง V / M', async () => {
          await chooseGcs(page, GCS_E4);
          await saveButton(page).click();
          await expectGcsRequired(page, ['Verbal Response (V)', 'Motor Response (M)']);
          await expect(form.getByText('กรุณาเลือก Eye Opening (E)'), 'ช่อง E เลือกแล้ว ต้องไม่เตือน').toBeHidden();
          expect(contributions, 'ต้องไม่มีการส่งฟอร์มไปบันทึก').toEqual([]);
        });
      });

      await checkStep(page, 'TC-004 (SBH-1749) เลือก GCS ครบ E/V/M แสดง Total Score และอัปเดตตามเมื่อเปลี่ยนค่า', async () => {
        const total = labelledBox(form, 'Total GCS');
        await checkStep(page, 'เลือกครบ E4 V5 M6: Total GCS 15', async () => {
          await chooseGcs(page, GCS_V5);
          await chooseGcs(page, GCS_M6);
          await expect(total).toHaveText(totalGcs('E4V5M6', 15));
          await markEvidence(total, ...gcsFields(page, GCS_E4, GCS_V5, GCS_M6));
        });
        await checkStep(page, 'เปลี่ยน Eye Opening เป็น 3: Total GCS อัปเดตเป็น 14', async () => {
          await chooseGcs(page, GCS_E3, GCS_E4);
          await expect(total).toHaveText(totalGcs('E3V5M6', 14));
          await markEvidence(total, ...gcsFields(page, GCS_E3));
        });
        await checkStep(page, 'เปลี่ยนกลับเป็น 4: Total GCS กลับเป็น 15', async () => {
          await chooseGcs(page, GCS_E4, GCS_E3);
          await expect(total).toHaveText(totalGcs('E4V5M6', 15));
          await markEvidence(total, ...gcsFields(page, GCS_E4));
        });
      });

      await checkStep(page, 'TC-007 (SBH-1752) กรอก Mandatory ครบ (เว้น Suspect Fast Track) กดบันทึกสำเร็จ และข้อมูลผูกกับ EN', async () => {
        await checkStep(page, 'กดบันทึก: บันทึกสำเร็จ หน้าเปลี่ยนเป็น Overview แสดงผล Triage และประวัติการคัดกรอง', async () => {
          const contributed = waitForApi(page, 'POST', /^\/ehrbase\/rest\/openehr\/v1\/ehr\/[^/]+\/contribution$/);
          const triageResult = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`);
          await saveButton(page).click();
          await expectOk(await contributed, 'บันทึกฟอร์ม Triage');
          const res = await triageResult;
          await expectOk(res, 'บันทึกผล Triage ของ Encounter');
          expect(((await res.json()) as { en?: string }).en, 'ผล Triage ต้องผูกกับ EN ของ Visit นี้').toBe(visit.en);

          const main = page.getByRole('main');
          const level = labelledBox(main, 'Triage Level');
          const zone = labelledBox(main, 'Triage Zone');
          const history = form.getByRole('listitem').filter({ hasText: 'ปัจจุบัน' });
          await expect(level).toHaveText(/Triage Level\s*ESI 4/);
          await expect(zone).toHaveText(/Triage Zone\s*โซนเหลือง ER/);
          await expect(history).toBeVisible();
          // ฟอร์มโหลดค่าที่บันทึกใหม่หลังเปลี่ยนเป็น Overview (ระหว่างนั้นขึ้น "Loading...") → รอให้เสร็จก่อนถ่ายภาพ
          await expect(form.getByRole('spinbutton', { name: 'Systolic' })).toBeVisible();
          await markEvidence(level, zone, history);
        });

        await test.step('โหลดหน้าใหม่: ฟอร์มดึงข้อมูลที่บันทึกของ EN นี้กลับมา', async () => {
          const loaded = page.waitForResponse((r) => r.url().includes('get_er_triage_composition_by_encounter'));
          await page.reload();
          const query = await loaded;
          await expectOk(query, 'โหลดฟอร์ม Triage ที่บันทึกของ Encounter');
          expect(query.request().postData() ?? '', 'ต้องดึงด้วย EN ของ Visit นี้').toContain(visit.en);
          await expect(form.getByRole('listitem').filter({ hasText: 'ปัจจุบัน' })).toBeVisible();
        });
        // ค่าที่บันทึกอยู่หลายส่วนของฟอร์ม เกินหนึ่งหน้าจอ → ภาพแยกตามส่วน
        await checkStep(page, 'หลังโหลดใหม่ Vital Signs ครบตามที่กรอก', async () => {
          for (const [name, key] of VITAL_FIELDS) await expect(form.getByRole('spinbutton', { name }), `Vital Signs ${name}`).toHaveValue(VITALS[key]);
          await expect(painScoreSelect(page), 'Pain score').toHaveValue(VITALS.painScore);
          await markEvidence(...vitalInputs(page));
        });
        await checkStep(page, 'หลังโหลดใหม่ MEWS (AVPU A · Total 1) และ GCS (E4V5M6 · Total 15) ครบ', async () => {
          const totalMews = labelledBox(form, 'Total MEWS');
          const totalGcsBox = labelledBox(form, 'Total GCS');
          await expect(form.getByRole('button', { name: 'A (0)' }), 'AVPU').toBeVisible();
          await expect(totalMews).toHaveText(TOTAL_MEWS_1);
          for (const field of gcsFields(page, GCS_E4, GCS_V5, GCS_M6)) await expect(field).toBeVisible();
          await expect(totalGcsBox).toHaveText(totalGcs('E4V5M6', 15));
          await markEvidence(totalMews, totalGcsBox, ...gcsFields(page, GCS_E4, GCS_V5, GCS_M6));
        });
        await checkStep(page, 'หลังโหลดใหม่ Fast Track ว่าง · Non-Trauma · ระดับความเร่งด่วน 4 ครบ', async () => {
          const notSuspect = form.getByRole('button', { name: 'Not Suspect Fast Track' });
          const nonTrauma = form.getByRole('radio', { name: 'Non-Trauma' });
          const esi4 = form.getByRole('button', { name: '4 กึ่งเร่งด่วน', pressed: true });
          await expect(notSuspect, 'Suspect Fast Track ว่างไว้').toBeVisible();
          await expect(nonTrauma, 'Trauma Classification').toBeChecked();
          await expect(esi4).toBeVisible();
          await markEvidence(nonTrauma, notSuspect, esi4);
        });
      });
    },
  );
});
