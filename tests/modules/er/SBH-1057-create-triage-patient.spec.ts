import { type Locator, type Page } from '@playwright/test';
import { dismissToast, expectTriageFormOpen, expectVisitHeader, gotoErDashboard, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { ESI_BUTTON, painScoreSelect, saveButton, selectArrivalDetail, triageForm, type VitalSigns } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, openErVisitForHn, recordMockPatient, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, boardEncounter, fillTriage, gotoVisit, saveTriageForm } from '../../../mock-data/uat-play';

// SBH-1057 [ER][Triage] Create new triage patient page — ชุด EXE SBH-1805 (SC-001–006 · TC-001–011 = SBH-1812–SBH-1822)
// เทส 1 ผู้ป่วย AUTO ใหม่ (A): TC-001 บริบทผู้ป่วย · TC-002 แท็บ · TC-003 วิธีการมาถึง · TC-004 Vital Signs หลายชุด · TC-006 BMI/BSA · TC-007 Chief Complaint ·
//        TC-009 เพิ่ม/ลบ Allergy · TC-010 Auto-save (draft) · TC-011 บันทึก Triage → Visit (EN) เดิม · TC-008 Allergy ที่กรอกตอน Triage แสดงที่หน้า Overview หลังบันทึก
//        (ผู้ใช้อธิบาย 14 ต.ค. 2026: Allergy ในฟอร์ม Triage เป็นการสำรวจเบื้องต้น ไม่ดึงจาก/ไม่เข้าประวัติแพ้ยาของผู้ป่วย — แพทย์บันทึกแยกทางขวา)
// เทส 2 ผู้ป่วย Mock เดิม (B) ที่มี Vital Signs ภายใน 24 ชม.: TC-005 ปุ่ม "ใช้ข้อมูลล่าสุด (ภายใน 24 ชั่วโมง)" — เปิด Visit ER ใหม่ให้ (SBH1057_B_HN · ค่าตั้งต้น HN 6904230)
// ข้อมูล: **ทิ้ง Visit ไว้ทั้ง 2 ราย** (ผู้ใช้เลือก 14 ต.ค. 2026)
// รัน (SBH Prod — ผู้ใช้อนุญาต 14 ต.ค. 2026): npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep @SBH-1057

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC = {
  1: 'TC-001 (SBH-1812)',
  2: 'TC-002 (SBH-1813)',
  3: 'TC-003 (SBH-1814)',
  4: 'TC-004 (SBH-1815)',
  5: 'TC-005 (SBH-1816)',
  6: 'TC-006 (SBH-1817)',
  7: 'TC-007 (SBH-1818)',
  8: 'TC-008 (SBH-1819)',
  9: 'TC-009 (SBH-1820)',
  10: 'TC-010 (SBH-1821)',
  11: 'TC-011 (SBH-1822)',
};
const TABS = ['Triage', 'Trauma', 'Non-Trauma', 'เด็ก', 'สัตว์มีพิษ'];
const VITAL_FIELDS: [string, keyof VitalSigns][] = [
  ['Systolic', 'systolic'],
  ['Diastolic', 'diastolic'],
  ['PR', 'pr'],
  ['RR', 'rr'],
  ['Temp', 'temp'],
  ['SpO2', 'spo2'],
];
const SET_1: VitalSigns = VITALS_NORMAL;
const SET_2: VitalSigns = { systolic: '130', diastolic: '85', pr: '92', rr: '20', temp: '37.2', spo2: '97', painScore: '4' };
const CC_CHIP = 'ปวดท้อง';
const CC_TEXT = 'มีไข้ต่ำๆ 2 วัน (AUTO SBH-1057)';
const ALLERGY_KEEP = { name: 'Penicillin', symptom: 'ผื่นคันทั้งตัว' };
const ALLERGY_DROP = { name: 'Ibuprofen', symptom: 'ตาบวม' };
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');

/** รอฟอร์มคัดกรองโหลดเสร็จ (ไม่ใช้ expectTriageFormOpen — มี Vital Signs หลายชุดแล้ว spinbutton Systolic ซ้ำ) · SBH Prod โหลดฟอร์มไม่ขึ้นเป็นพักๆ → เปิดหน้าใหม่ */
async function openTriagePageOf(page: Page, visit: ErVisit) {
  await expect(async () => {
    await gotoVisit(page, visit);
    await expect(triageForm(page).getByRole('spinbutton', { name: 'Systolic' }).first()).toBeVisible({ timeout: 30_000 });
  }, `เปิดฟอร์มคัดกรองของ ${visit.en}`).toPass({ timeout: 180_000 });
}

/** ค่าของ Vital Signs ชุดที่ index (0 = วัดครั้งที่ 1) */
async function readVitals(form: Locator, index: number): Promise<VitalSigns> {
  const out = {} as VitalSigns;
  for (const [name, key] of VITAL_FIELDS) out[key] = await form.getByRole('spinbutton', { name }).nth(index).inputValue();
  out.painScore = await form.getByRole('combobox').filter({ has: form.page().getByRole('option', { name: 'Pain score' }) }).nth(index).inputValue();
  return out;
}

async function fillVitalSet(form: Locator, index: number, v: VitalSigns) {
  for (const [name, key] of VITAL_FIELDS) await form.getByRole('spinbutton', { name }).nth(index).fill(v[key]);
  await form.getByRole('combobox').filter({ has: form.page().getByRole('option', { name: 'Pain score' }) }).nth(index).selectOption(v.painScore);
}

const vitalText = (v: VitalSigns) => `${v.systolic}/${v.diastolic} · PR ${v.pr} · RR ${v.rr} · T ${v.temp} · SpO2 ${v.spo2} · Pain ${v.painScore || '-'}`;

test.describe(`SBH-1057 หน้า Create new triage patient (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 900_000 });

  test(
    'ผู้ป่วย AUTO ใหม่: บริบทผู้ป่วย · แท็บ · วิธีการมาถึง · Vital Signs หลายชุด · BMI/BSA · Chief Complaint · Allergy · Auto-save · บันทึก Triage (Super_User)',
    {
      tag: ['@SBH-1057', '@SBH-1812', '@SBH-1813', '@SBH-1814', '@SBH-1815', '@SBH-1817', '@SBH-1818', '@SBH-1819', '@SBH-1820', '@SBH-1821', '@SBH-1822'],
      annotation: [linear('SBH-1057'), linear('SBH-1805')],
    },
    async ({ page }) => {
      const main = page.getByRole('main');
      const form = triageForm(page);
      const authorization = trackAuthorization(page);
      const failures: string[] = [];
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      /** step ของ TC ที่ไม่ผ่านแล้วเทสเล่นต่อ — ภาพ Error แนบโดย checkStep */
      const soft = (title: string, body: () => Promise<void>) =>
        checkStep(page, title, body).then(
          () => true,
          (error: unknown) => {
            failures.push(`${title} — ${firstLine(error)}`);
            console.log(`    ✗ ${title} — ${firstLine(error)}`);
            return false;
          },
        );
      const drafts: { status: number; at: number }[] = [];
      page.on('response', (res) => {
        if (res.request().method() === 'PUT' && new URL(res.url()).pathname.startsWith('/cortex-api/drafts')) drafts.push({ status: res.status(), at: Date.now() });
      });
      const ccBox = form.locator('textarea[placeholder="สรุปอาการและอื่น ๆ"]');
      const allergyName = form.getByRole('textbox', { name: 'ระบุชื่อยา/สิ่งที่แพ้' });
      const allergySymptom = form.getByRole('textbox', { name: 'ระบุอาการแพ้/สรุปอาการแพ้' });
      const allergyRows = form.getByRole('row').filter({ has: page.getByRole('textbox', { name: 'ระบุชื่อยา/สิ่งที่แพ้' }) });
      const addAllergy = form.getByRole('button', { name: '+ เพิ่มรายการ' }).last();
      const addVitals = form.getByRole('button', { name: '+ เพิ่มรายการ' }).first();
      let visit!: ErVisit;
      let fullName = '';

      await checkStep(page, `${TC[1]} ขั้น 1 ลงทะเบียนผู้ป่วยใหม่ที่หน้าคัดกรอง ER แล้วเปิด Visit → ฟอร์มคัดกรอง`, async () => {
        await gotoErDashboard(page);
        const patient = newTestPatient('Tri1057');
        fullName = `${patient.firstName} ${patient.familyName}`;
        visit = await registerAndOpenErVisit(page, patient);
        if (SYSTEM === 'sbh-prod') recordMockPatient('SBH-1057', patient, visit, 'SBH-1057 ผู้ป่วย A · เปิด Visit ER สิทธิ UC + Triage ESI 4 (ทิ้ง Visit ไว้)');
        note('ผู้ป่วย A', `${fullName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
        await expectTriageFormOpen(page, visit);
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
      });

      const headerHn = main.getByText(`HN ${visit.hn}`, { exact: true }).filter({ visible: true }).first();
      const headerName = main.getByText(new RegExp(fullName)).filter({ visible: true }).first();
      const headerEn = main.getByText(visit.en, { exact: true }).filter({ visible: true }).first();

      await soft(`${TC[1]} ขั้น 2-3 หน้าจอแสดงว่ากำลัง Triage ให้ผู้ป่วยรายใด (HN · ชื่อ · EN ตรงกับที่เลือก)`, async () => {
        await expect(headerHn).toBeVisible();
        await expect(headerName).toBeVisible();
        await expect(headerEn).toBeVisible();
        await markEvidence(expected(headerHn), expected(headerName), expected(headerEn));
        await holdForClip(page);
      });

      await soft(`${TC[1]} ขั้น 4 เลื่อนฟอร์มลงล่างสุด — ข้อมูลผู้ป่วยยังแสดงอยู่`, async () => {
        await form.getByRole('button', { name: 'Trauma Classification * ▾' }).scrollIntoViewIfNeeded();
        await expect(form.getByRole('radio', { name: 'Non-Trauma' })).toBeInViewport();
        await expect(headerHn).toBeInViewport();
        await expect(headerName).toBeInViewport();
        await markEvidence(expected(headerHn), expected(headerName), expected(form.getByRole('button', { name: 'Trauma Classification * ▾' })));
        await holdForClip(page);
      });

      await soft(`${TC[2]} ฟอร์มมีแท็บครบ 5 ประเภท และสลับเข้าได้ทุกแท็บ`, async () => {
        const tabs = main.getByRole('tablist').filter({ has: page.getByRole('tab', { name: 'สัตว์มีพิษ' }) }).getByRole('tab');
        await expect(tabs).toHaveText(TABS);
        for (const name of [...TABS.slice(1), 'Triage']) {
          const tab = main.getByRole('tab', { name, exact: true });
          await tab.click();
          await expect(tab).toHaveAttribute('aria-selected', 'true');
          if (name !== 'Triage') {
            await markEvidence(clicked(tab));
            await snapEvidence(page, `แท็บ ${name}`);
          }
        }
        await expect(form.getByRole('spinbutton', { name: 'Systolic' }).first()).toBeVisible();
        await markEvidence(expected(main.getByRole('tablist').filter({ has: page.getByRole('tab', { name: 'สัตว์มีพิษ' }) })));
      });

      await soft(`${TC[3]} ฟิลด์ Arrival (วิธีการมาถึง) · Care needs (อุปกรณ์ช่วยเหลือ) · Accompaniment (ผู้ที่มาด้วย) กรอกได้และระบบรับค่า`, async () => {
        const arrival = page.getByRole('region', { name: 'วิธีการมาถึง' });
        await expect(arrival.getByRole('radio', { name: 'Walk-in' })).toBeChecked();
        await selectArrivalDetail(page, 'อุปกรณ์ช่วยเหลือ', 'ไม่มี', visit);
        await selectArrivalDetail(page, 'ผู้ที่มาด้วย', 'ญาติ', visit);
        await expect(arrival.locator('.ant-select-content-value[title="ไม่มี"], .ant-select-selection-item[title="ไม่มี"]').first()).toBeVisible();
        await expect(arrival.locator('.ant-select-content-value[title="ญาติ"], .ant-select-selection-item[title="ญาติ"]').first()).toBeVisible();
        await markEvidence(expected(arrival.getByRole('radio', { name: 'Walk-in' })), filled(arrival.getByRole('combobox').nth(0)), filled(arrival.getByRole('combobox').nth(1)));
        await holdForClip(page);
      });

      await soft(`${TC[4]} กรอก Vital Signs ชุดที่ 1 แล้วกด + เพิ่มรายการ กรอกชุดที่ 2 — เก็บแยกกัน ชุดแรกไม่ถูกเขียนทับ`, async () => {
        await fillVitalSet(form, 0, SET_1);
        await markEvidence(filled(form.getByRole('spinbutton', { name: 'Systolic' }).first()), clicked(addVitals));
        await snapEvidence(page, 'ก่อนกด — เพิ่มรายการ Vital Signs');
        await addVitals.click();
        await expect(form.getByRole('heading', { name: 'วัดครั้งที่ 2' })).toBeVisible();
        await fillVitalSet(form, 1, SET_2);
        const one = await readVitals(form, 0);
        const two = await readVitals(form, 1);
        const rows: CompareRow[] = [
          { label: 'วัดครั้งที่ 1', values: [vitalText(SET_1), vitalText(one)], same: vitalText(one) === vitalText(SET_1) },
          { label: 'วัดครั้งที่ 2', values: [vitalText(SET_2), vitalText(two)], same: vitalText(two) === vitalText(SET_2) },
        ];
        await showCompareTable(page, 'SBH-1057 TC-004 Vital Signs 2 ชุด', ['ค่าที่กรอก', 'ค่าบนฟอร์ม'], rows, { side: 'left', width: '820px' });
        await form.getByRole('heading', { name: 'วัดครั้งที่ 1' }).scrollIntoViewIfNeeded();
        await markEvidence(expected(form.getByRole('heading', { name: 'วัดครั้งที่ 1' })), expected(form.getByRole('heading', { name: 'วัดครั้งที่ 2' })));
        await holdForClip(page, 2_500);
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' ≠ ')}`), 'ทั้ง 2 ชุดต้องเก็บค่าของตัวเอง').toEqual([]);
      });
      await hideCompareTable(page);

      await soft(`${TC[6]} มี Weight · Height · BMI · BSA — กรอก Weight/Height แล้วคำนวณ BMI/BSA ให้ และอัปเดตเมื่อแก้ Weight`, async () => {
        const weight = form.getByRole('spinbutton', { name: 'Weight' });
        const height = form.getByRole('spinbutton', { name: 'Height' });
        const bmi = form.getByRole('textbox', { name: 'BMI' });
        const bsa = form.getByRole('textbox', { name: 'BSA' });
        const rows: CompareRow[] = [];
        for (const w of [70, 80]) {
          const h = 170;
          await weight.fill(String(w));
          await height.fill(String(h));
          await height.press('Tab');
          const expBmi = w / (h / 100) ** 2;
          const mosteller = Math.sqrt((h * w) / 3600);
          const dubois = 0.007184 * w ** 0.425 * h ** 0.725;
          await expect.poll(async () => Number(await bmi.inputValue()), { message: `BMI ของ ${w} kg / ${h} cm` }).toBeCloseTo(expBmi, 1);
          const shownBsa = Number(await bsa.inputValue());
          const ok = Math.abs(shownBsa - mosteller) <= 0.02 || Math.abs(shownBsa - dubois) <= 0.02;
          rows.push({ label: `${w} kg · ${h} cm`, values: [`BMI ${await bmi.inputValue()} · BSA ${shownBsa}`, `BMI ${expBmi.toFixed(2)} · BSA ${mosteller.toFixed(2)} (Mosteller) / ${dubois.toFixed(2)} (Du Bois)`], same: ok && Math.abs(Number(await bmi.inputValue()) - expBmi) < 0.06 });
          if (w === 70) {
            await markEvidence(filled(weight), filled(height), expected(bmi), expected(bsa));
            await snapEvidence(page, 'BMI BSA ที่ 70 kg 170 cm');
          }
        }
        await showCompareTable(page, 'SBH-1057 TC-006 BMI / BSA', ['บนฟอร์ม', 'คำนวณเอง'], rows, { side: 'left', width: '900px' });
        await markEvidence(filled(weight), expected(bmi), expected(bsa));
        await holdForClip(page, 2_500);
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' ≠ ')}`), 'BMI / BSA ต้องตรงกับที่คำนวณ').toEqual([]);
      });
      await hideCompareTable(page);

      await soft(`${TC[7]} Chief Complaint: เลือก quick tag "${CC_CHIP}" และพิมพ์ในช่องสรุป — เก็บทั้ง 2 อย่าง`, async () => {
        const chip = form.getByRole('button', { name: CC_CHIP, exact: true });
        await chip.click();
        await expect(ccBox).toHaveValue(new RegExp(CC_CHIP));
        await ccBox.click();
        await ccBox.press('End');
        await ccBox.pressSequentially(` ${CC_TEXT}`);
        await expect(ccBox).toHaveValue(new RegExp(`${CC_CHIP}[\\s\\S]*${CC_TEXT.replace(/[()]/g, '\\$&')}`));
        note('Chief Complaint ในช่องสรุป', await ccBox.inputValue());
        await markEvidence(clicked(chip), filled(ccBox));
        await holdForClip(page);
      });

      await soft(`${TC[9]} เพิ่มรายการ Allergy 2 รายการ แสดงในฟอร์มทันที แล้วลบรายการที่ 2 ออก`, async () => {
        await addAllergy.scrollIntoViewIfNeeded();
        const before = await allergyRows.count();
        await addAllergy.click();
        await expect(allergyRows).toHaveCount(before + 1);
        await allergyName.nth(before).fill(ALLERGY_KEEP.name);
        await allergySymptom.nth(before).fill(ALLERGY_KEEP.symptom);
        await addAllergy.click();
        await expect(allergyRows).toHaveCount(before + 2);
        await allergyName.nth(before + 1).fill(ALLERGY_DROP.name);
        await allergySymptom.nth(before + 1).fill(ALLERGY_DROP.symptom);
        const drop = allergyRows.nth(before + 1).getByRole('button', { name: 'ลบ' });
        await markEvidence(filled(allergyName.nth(before)), filled(allergyName.nth(before + 1)), clicked(drop));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — ลบ Allergy รายการที่ 2');
        await drop.click();
        // ถ้ามีกล่องยืนยันการลบ (popconfirm / dialog) กดยืนยัน — ห้ามหาปุ่ม "ลบ" ทั้งหน้า (จะโดนปุ่มลบของแถวที่เหลือ)
        const confirm = page.locator('.ant-popover:visible, .ant-popconfirm:visible, [role="dialog"]:visible').getByRole('button', { name: /^(ยืนยัน|ตกลง|ลบ|OK|Yes)$/ });
        if (await confirm.first().waitFor({ state: 'visible', timeout: 2_000 }).then(() => true, () => false)) await confirm.first().click();
        await expect(allergyRows).toHaveCount(before + 1);
        await expect(allergyName.nth(before)).toHaveValue(ALLERGY_KEEP.name);
        const status = await allergyRows.nth(before).getByRole('cell').nth(3).innerText();
        note('Allergy ที่เหลือ', `${ALLERGY_KEEP.name} · ${ALLERGY_KEEP.symptom} · ผลการประเมิน ${status}`);
        await markEvidence(expected(allergyRows.nth(before)));
        await holdForClip(page);
      });

      await soft(`${TC[10]} ไม่กดบันทึก — ระบบเก็บ draft เอง (PUT drafts) และโหลดหน้าใหม่แล้วค่าที่กรอกยังอยู่`, async () => {
        // รอให้ draft ถูกส่งหลังการกรอกครั้งสุดท้าย
        const lastEdit = Date.now();
        await expect.poll(() => drafts.some((d) => d.at >= lastEdit - 3_000 && d.status < 300) || drafts.filter((d) => d.status < 300).length > 0, { message: 'ต้องมี PUT /cortex-api/drafts สำเร็จ', timeout: 20_000 }).toBe(true);
        await page.waitForTimeout(3_000);
        note('Auto-save', `PUT /cortex-api/drafts ${drafts.length} ครั้ง · สถานะ ${[...new Set(drafts.map((d) => d.status))].join(',')}`);
        await expect(saveButton(page), 'ยังไม่ได้กดบันทึก — ปุ่มบันทึกยังกดไม่ได้เพราะยังไม่เลือกระดับความเร่งด่วน').toBeDisabled();
        await openTriagePageOf(page, visit);
        await page.waitForTimeout(3_000);
        const one = await readVitals(form, 0);
        const two = await readVitals(form, 1).catch(() => undefined);
        const rows: CompareRow[] = [
          { label: 'Vital Signs ครั้งที่ 1', values: [vitalText(SET_1), vitalText(one)], same: vitalText(one) === vitalText(SET_1) },
          { label: 'Vital Signs ครั้งที่ 2', values: [vitalText(SET_2), two ? vitalText(two) : '(ไม่มี)'], same: !!two && vitalText(two) === vitalText(SET_2) },
          { label: 'Weight / Height', values: ['80 / 170', `${await form.getByRole('spinbutton', { name: 'Weight' }).inputValue()} / ${await form.getByRole('spinbutton', { name: 'Height' }).inputValue()}`], same: false },
          { label: 'Chief Complaint', values: [`${CC_CHIP} … ${CC_TEXT}`, await ccBox.inputValue()], same: (await ccBox.inputValue()).includes(CC_TEXT) },
          { label: 'Allergy', values: [ALLERGY_KEEP.name, (await allergyName.allInnerTexts().catch(() => [])).join(',') || (await allergyName.first().inputValue().catch(() => '(ไม่มี)'))], same: false },
        ];
        rows[2].same = rows[2].values[1] === '80 / 170';
        rows[4].values[1] = (await allergyName.count()) ? await allergyName.first().inputValue() : '(ไม่มี)';
        rows[4].same = rows[4].values[1] === ALLERGY_KEEP.name;
        await showCompareTable(page, 'SBH-1057 TC-010 หลังโหลดหน้าใหม่ (ไม่ได้กดบันทึก)', ['ค่าที่กรอก', 'ค่าบนฟอร์มหลังโหลดใหม่'], rows, { side: 'left', width: '900px' });
        await markEvidence(expected(form.getByRole('spinbutton', { name: 'Systolic' }).first()));
        await holdForClip(page, 3_000);
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' ≠ ')}`), 'ค่าที่กรอกต้องอยู่ครบหลังโหลดหน้าใหม่').toEqual([]);
      });
      await hideCompareTable(page);

      await soft(`${TC[11]} ขั้น 2-4 กรอก GCS · เลือกระดับความเร่งด่วน 4 แล้วกดบันทึก — หน้าเปลี่ยนเป็น Overview ของ Visit เดิม`, async () => {
        await fillTriage(page, visit, { level: 4, chiefComplaint: '' });
        await markEvidence(filled(form.getByRole('button', { name: ESI_BUTTON[4] })), clicked(saveButton(page)));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — บันทึก Triage ESI 4');
        await saveTriageForm(page, visit);
        const summary = main.getByText('Clinical Summary', { exact: true });
        await expect(summary, 'บันทึก Triage แล้วหน้าต้องเปลี่ยนเป็น Overview').toBeVisible({ timeout: 60_000 });
        const toast = page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true }).first();
        await expectVisitHeader(page, visit);
        await markEvidence(expected(summary), expected(main.getByText(visit.en, { exact: true }).filter({ visible: true }).first()), ...((await toast.isVisible()) ? [alerted(toast)] : []));
        await holdForClip(page, 2_000);
        await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
      });

      await soft(`${TC[11]} ขั้น 5 ข้อมูล Triage ผูกกับ Visit ที่เปิด — Clinical Summary ESI 4 และ API บอร์ดของ ${visit.en} มีเวลา Triage`, async () => {
        const level = main.getByText(/Triage Level\s*ESI 4/).filter({ visible: true }).first();
        await expect(level).toBeVisible({ timeout: 30_000 });
        let encounter: Record<string, unknown> | undefined;
        await expect(async () => {
          encounter = await boardEncounter(page, authorization(), visit.en);
        }).toPass({ timeout: 60_000, intervals: [3_000] });
        note('API บอร์ดหลังบันทึก', `${visit.en} triageLevel ${String(encounter?.triageLevel)} · triagedAt ${String(encounter?.triagedAt)} · hn ${String(encounter?.hn)}`);
        expect(encounter?.hn).toBe(visit.hn);
        expect(encounter?.triageLevel).toBe(4);
        expect(encounter?.triagedAt).toBeTruthy();
        await markEvidence(expected(level), expected(main.getByText(visit.en, { exact: true }).filter({ visible: true }).first()));
        await holdForClip(page, 2_000);
      });

      await soft(`${TC[8]} หลังบันทึก Triage หน้า Overview แสดง Allergy ที่กรอกไว้ พร้อมผลการประเมิน`, async () => {
        const nameBox = allergyName.first();
        const text = form.getByText(ALLERGY_KEEP.name, { exact: true }).first();
        let where = '';
        await expect(async () => {
          if ((await nameBox.count()) && (await nameBox.inputValue()) === ALLERGY_KEEP.name) where = 'textbox';
          else if (await text.isVisible()) where = 'text';
          expect(where, `ต้องเห็น ${ALLERGY_KEEP.name} ในส่วนประวัติแพ้ของหน้า Overview`).not.toBe('');
        }).toPass({ timeout: 30_000 });
        const row = where === 'textbox' ? allergyRows.first() : form.getByRole('row').filter({ hasText: ALLERGY_KEEP.name }).first();
        await row.scrollIntoViewIfNeeded();
        const cells = await row.getByRole('cell').allInnerTexts();
        note('Allergy หน้า Overview', `${where} · ${cells.map((c) => c.trim()).join(' | ')}`);
        await expect(row).toContainText(/Verified|Unverified|Confirmed|Unconfirmed/);
        await markEvidence(expected(row));
        await holdForClip(page, 2_500);
      });

      expect(failures, 'ขั้นที่ไม่ผ่าน').toEqual([]);
    },
  );

  test(
    'ผู้ป่วย Mock ที่มี Vital Signs ภายใน 24 ชม.: เปิด Visit ER ใหม่แล้วกด ใช้ข้อมูลล่าสุด (ภายใน 24 ชั่วโมง) (Super_User)',
    { tag: ['@SBH-1057', '@SBH-1816'], annotation: [linear('SBH-1057'), linear('SBH-1816')] },
    async ({ page }) => {
      const hn = process.env.SBH1057_B_HN ?? '6904230';
      const main = page.getByRole('main');
      const form = triageForm(page);
      let visit!: ErVisit;

      await checkStep(page, `${TC[5]} ขั้น 1-2 ผู้ป่วย HN ${hn} (บันทึก Vital Signs ไว้วันนี้) — เปิด Visit ER ใหม่ → ฟอร์มคัดกรอง`, async () => {
        await gotoErDashboard(page);
        visit = await openErVisitForHn(page, hn);
        test.info().annotations.push({ type: 'ผู้ป่วย B', description: `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en} (Visit ใหม่ · ทิ้งไว้)` });
        console.log(`    ผู้ป่วย B: HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
        await expectTriageFormOpen(page, visit);
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
        const before = await readVitals(form, 0);
        expect(before.systolic, 'ก่อนกด ใช้ข้อมูลล่าสุด ช่อง Vital Signs ต้องว่าง').toBe('');
      });

      await checkStep(page, `${TC[5]} ขั้น 3-4 กด ใช้ข้อมูลล่าสุด (ภายใน 24 ชั่วโมง) — ค่าที่ดึงมาตรงกับ Vital Signs ล่าสุดของผู้ป่วย`, async () => {
        const latest = form.getByRole('button', { name: 'ใช้ข้อมูลล่าสุด (ภายใน 24 ชั่วโมง)' }).first();
        await markEvidence(clicked(latest));
        await snapEvidence(page, 'ก่อนกด — ใช้ข้อมูลล่าสุด');
        await latest.click();
        await expect(form.getByRole('spinbutton', { name: 'Systolic' }).first()).not.toHaveValue('', { timeout: 15_000 });
        const pulled = await readVitals(form, 0);
        // ค่าที่บันทึกไว้ล่าสุด: แถบหัวผู้ป่วย (Vital Signs ล่าสุดของระบบ) + ค่าที่เทส SBH-2373 Re-Triage บันทึกไว้ 14 ต.ค. 2026 11:10 (VITALS_NORMAL)
        const banner = (await main.locator('div').filter({ hasText: /^BP/ }).first().innerText().catch(() => '')).replace(/\s+/g, ' ');
        const rows: CompareRow[] = VITAL_FIELDS.map(([name, key]) => ({ label: name, values: [VITALS_NORMAL[key], pulled[key]], same: Number(pulled[key]) === Number(VITALS_NORMAL[key]) }));
        rows.push({ label: 'Pain score', values: [VITALS_NORMAL.painScore, pulled.painScore || '(ว่าง)'], same: pulled.painScore === VITALS_NORMAL.painScore });
        test.info().annotations.push({ type: 'TC-005 ค่าที่ดึงมา', description: `${vitalText(pulled)} · แถบหัว: ${banner.slice(0, 120)}` });
        await showCompareTable(page, `SBH-1057 TC-005 ค่าที่ดึงมา เทียบค่าที่บันทึกล่าสุด (HN ${hn})`, ['บันทึกล่าสุด', 'ดึงมาในฟอร์ม'], rows, { side: 'left', width: '700px' });
        await markEvidence(expected(form.getByRole('spinbutton', { name: 'Systolic' }).first()), expected(form.getByRole('spinbutton', { name: 'SpO2' }).first()));
        await holdForClip(page, 3_000);
        const vitalsOnly = rows.filter((r) => r.label !== 'Pain score');
        expect(vitalsOnly.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' ≠ ')}`), 'ค่าที่ดึงมาต้องตรงกับที่บันทึกไว้').toEqual([]);
      });
      await hideCompareTable(page);
    },
  );
});
