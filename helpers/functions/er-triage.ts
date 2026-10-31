import { expect, type Locator, type Page } from '@playwright/test';
import { expectOk, waitForApi, type ErVisit } from './er';

// ฟอร์ม "คัดกรอง ER" (sbh_general_er_triage_v1) ในหน้าผู้ป่วย — ตรวจกับหน้าจอจริงบน dev-x 26 ก.ย. 2026
// ฟอร์มอยู่ใน shadow DOM แต่ getByRole ทะลุได้ · ทุกช่องที่กรอกถูกเก็บเป็น draft (PUT /cortex-api/drafts) จนกว่าจะบันทึก

export interface VitalSigns {
  systolic: string;
  diastolic: string;
  pr: string;
  rr: string;
  temp: string;
  spo2: string;
  /** 0–10 */
  painScore: string;
}

/** แท็บ Triage ของหน้าผู้ป่วย (ทั้งตอนยังไม่บันทึก และหลังบันทึกที่หน้าเปลี่ยนเป็น Overview) */
export function triageForm(page: Page): Locator {
  return page.getByRole('tabpanel', { name: 'Triage' });
}

export function saveButton(page: Page): Locator {
  return triageForm(page).getByRole('button', { name: 'save บันทึก' });
}

/** ช่อง Pain score เป็น <select> ธรรมดาไม่มีชื่อ → หาจากตัวเลือกแรก "Pain score" */
export function painScoreSelect(page: Page): Locator {
  return triageForm(page).getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Pain score' }) });
}

/** แถวในตาราง MEWS เช่น "Respiratory rate" → [ชื่อ, ช่วงค่า, คะแนน] */
export function mewsRow(page: Page, name: string): Locator {
  return triageForm(page).getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) });
}

/**
 * กล่องที่มีหัวข้อนี้ (div ชั้นในสุดที่มีข้อความนั้น) เช่น "Total MEWS" → ข้อความทั้งกล่อง "Total MEWS 1 / 14 Low Risk"
 * ใช้แทน toContainText บนทั้งฟอร์ม เพราะ textContent ของ tabpanel ไม่รวมข้อความใน shadow DOM ของฟอร์ม
 */
export function labelledBox(scope: Locator, label: string): Locator {
  // locator ใน has ต้องสร้างจาก page (ถูกค้นใต้ div แต่ละตัว) ไม่ใช่จาก scope
  return scope.locator('div').filter({ has: scope.page().getByText(label, { exact: true }) }).last();
}

export async function fillVitalSigns(page: Page, v: VitalSigns) {
  const form = triageForm(page);
  const fields: [string, string][] = [
    ['Systolic', v.systolic],
    ['Diastolic', v.diastolic],
    ['PR', v.pr],
    ['RR', v.rr],
    ['Temp', v.temp],
    ['SpO2', v.spo2],
  ];
  for (const [name, value] of fields) await form.getByRole('spinbutton', { name }).fill(value);
  await painScoreSelect(page).selectOption(v.painScore);
}

/** ช่องบังคับฝั่งซ้าย (อุปกรณ์ช่วยเหลือ / ผู้ที่มาด้วย) — เลือกแล้วระบบบันทึกเข้า Encounter ทันที (PATCH registration-details) */
export async function selectArrivalDetail(page: Page, field: 'อุปกรณ์ช่วยเหลือ' | 'ผู้ที่มาด้วย', option: string, visit: ErVisit) {
  const index = field === 'อุปกรณ์ช่วยเหลือ' ? 0 : 1; // select ไม่มีชื่อ เรียงตามหน้าจอ
  await page.getByRole('region', { name: 'วิธีการมาถึง' }).getByRole('combobox').nth(index).click();
  const saved = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/registration-details`);
  // exact: "ไม่มี" ชนกับ "ไม่มีผู้มาด้วย"
  await page.getByTitle(option, { exact: true }).click();
  await expectOk(await saved, `บันทึก${field}`);
}

/**
 * GCS: เปิด dropdown แล้วเลือกคะแนน — ช่องที่ยังไม่เลือกชื่อ "เลือกคะแนน" (เรียง E, V, M) · ช่องที่เลือกแล้วชื่อ = ตัวเลือกปัจจุบัน
 * @param current ชื่อปุ่มตอนนี้ (ค่าเดิม) หรือไม่ใส่ = ช่องว่างช่องแรก
 */
export async function chooseGcs(page: Page, option: string, current?: string) {
  const form = triageForm(page);
  const field = current ? form.getByRole('button', { name: current, exact: true }) : form.getByRole('button', { name: 'เลือกคะแนน' }).first();
  await field.click();
  await form.getByRole('button', { name: option, exact: true }).click();
  await expect(form.getByRole('button', { name: option, exact: true }), `GCS ต้องแสดง "${option}"`).toHaveCount(1);
}

/** ชื่อปุ่มระดับความเร่งด่วนตาม ESI (ชื่อปุ่มจริงมีเลขนำหน้า เช่น "1 กู้ชีพ") */
export const ESI_BUTTON: Record<number, string> = { 1: '1 กู้ชีพ', 2: '2 ฉุกเฉิน', 3: '3 เร่งด่วน', 4: '4 กึ่งเร่งด่วน', 5: '5 ไม่เร่งด่วน' };

/**
 * กรอกเฉพาะช่องบังคับของฟอร์มคัดกรอง (ไม่มี / ญาติ · GCS E4V5M6 · CC ปวดท้อง) → เลือกระดับ ESI → บันทึก
 * ใช้กับ ESI 1–4 (ESI 5 มี modal "ส่งต่อไปคลินิก" ตามมา) · โซนใช้ค่าที่ระบบแนะนำ
 */
export async function saveTriage(page: Page, visit: ErVisit, level: 1 | 2 | 3 | 4) {
  const form = triageForm(page);
  await selectArrivalDetail(page, 'อุปกรณ์ช่วยเหลือ', 'ไม่มี', visit);
  await selectArrivalDetail(page, 'ผู้ที่มาด้วย', 'ญาติ', visit);
  await chooseGcs(page, '4 — ลืมตาได้เอง (Spontaneous)');
  await chooseGcs(page, '5 — พูดคุยรู้เรื่อง ตอบคำถามถูกต้อง (Oriented)');
  await chooseGcs(page, '6 — ทำตามคำสั่งได้ (Obeys commands)');
  await form.getByRole('button', { name: 'ปวดท้อง', exact: true }).click();
  await form.getByRole('button', { name: ESI_BUTTON[level] }).click();
  const saved = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`);
  await saveButton(page).click();
  await expectOk(await saved, `บันทึกผล Triage ESI ${level} ของ ${visit.en}`);
}

// ---------- ฟอร์มคัดกรอง ER แบบใหม่ (clinical form) — dev-x 28 ต.ค. 2026 · ไฟล์แอป index-BaNu9Hqq.js · การ์ด SBH-2355 ----------
// แท็บ "คัดกรอง ER" (ไม่มี tabpanel ชื่อ Triage แล้ว) · ระดับความเร่งด่วนเป็น radio ซ่อน (กดที่ตัวเลข) · GCS เป็น <select> 3 ช่อง ·
// Chief Complaint เป็นปุ่มในกลุ่ม "Common chief complaints" · กดบันทึก = POST /cortex-api/clinical-form-groups/<id>/saves (ไม่ใช่ PATCH triage-result)

/** แผงฟอร์มคัดกรอง (ครั้งแรก "คัดกรอง ER" / คัดกรองซ้ำ) — div ชั้นในสุดที่มีหัวแผงและระดับความเร่งด่วน */
export function erTriagePanel(page: Page): Locator {
  return page
    .getByRole('main')
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: /คัดกรอง ER|การคัดกรองครั้งใหม่/ }) })
    .filter({ has: page.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }) })
    .last();
}

/** ปุ่มบันทึกที่หัวแผงคัดกรอง (ปุ่มแรกของแผง — ส่วน Underlying Disease ในฟอร์มมีปุ่มบันทึกของตัวเองอีกปุ่ม) */
export function erTriageSaveButton(page: Page): Locator {
  return erTriagePanel(page).getByRole('button', { name: 'save บันทึก' }).first();
}

/** ช่องระดับความเร่งด่วน (radio ของระดับ) */
export function erTriageLevel(page: Page, level: number): Locator {
  return erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }).getByRole('radio', { name: new RegExp(`^${level} `) });
}

/**
 * กรอกฟอร์มคัดกรองแบบใหม่ (ยังไม่บันทึก): สัญญาณชีพ + Pain score · Chief Complaint ปุ่มแรก (`chiefComplaint: false` = ไม่กด — คัดกรองซ้ำมีค่าเดิมมาให้) ·
 * GCS E4 V5 M6 · ระดับความเร่งด่วน
 */
export async function fillErTriageForm(page: Page, input: { level: 1 | 2 | 3 | 4 | 5; vitals: VitalSigns; chiefComplaint?: boolean }) {
  const panel = erTriagePanel(page);
  await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
  const v = input.vitals;
  const fields: [string, string][] = [['Systolic', v.systolic], ['Diastolic', v.diastolic], ['PR', v.pr], ['RR', v.rr], ['Temp', v.temp], ['SpO2', v.spo2]];
  for (const [name, value] of fields) await panel.getByRole('spinbutton', { name }).first().fill(value);
  await panel.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Pain score' }) }).first().selectOption(v.painScore);
  if (input.chiefComplaint !== false) await panel.getByRole('group', { name: 'Common chief complaints' }).getByRole('button').first().click();
  for (const [name, score] of [['Eye Opening (E)', '4'], ['Verbal Response (V)', '5'], ['Motor Response (M)', '6']]) {
    const select = panel.getByRole('combobox', { name }).first();
    const label = (await select.locator('option').allTextContents()).find((text) => text.startsWith(`${score} `));
    if (!label) throw new Error(`ไม่เจอตัวเลือก GCS ${name} คะแนน ${score}`);
    await select.selectOption({ label });
  }
  const levels = panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' });
  await levels.scrollIntoViewIfNeeded();
  await levels.getByText(String(input.level), { exact: true }).click();
  await expect(erTriageLevel(page, input.level), `ระดับความเร่งด่วนต้องเป็น ${input.level}`).toBeChecked();
}

/**
 * กดบันทึกฟอร์มคัดกรองแบบใหม่ → รอ POST …/clinical-form-groups/<id>/saves สำเร็จ
 * dev-x 28 ต.ค. 2026 (SBH-2355 run 4): กดตอนส่วน MEWS ยัง "กำลังโหลดข้อมูลต้นทาง / Loading sources…" → 400 INVALID_SNAPSHOT + แจ้ง "บันทึกคัดกรอง ER ไม่สำเร็จ"
 * → รอข้อความโหลดหายก่อนกด · ยังได้ INVALID_SNAPSHOT ให้รอ 5 วินาทีแล้วกดใหม่ 1 ครั้ง
 */
export async function saveErTriageForm(page: Page, what = 'บันทึกฟอร์มคัดกรอง ER') {
  const panel = erTriagePanel(page);
  for (let attempt = 1; ; attempt++) {
    await expect(panel.getByText(/กำลังโหลดข้อมูลต้นทาง|Loading sources/), 'MEWS ต้องโหลดข้อมูลต้นทางเสร็จก่อนบันทึก').toHaveCount(0, { timeout: 45_000 });
    await page.waitForTimeout(1_500); // ให้ร่างของช่องที่เพิ่งกรอกเก็บเสร็จ (PUT …/draft/occurrences)
    const saved = waitForApi(page, 'POST', /\/cortex-api\/clinical-form-groups\/[^/]+\/saves$/, 90_000);
    await erTriageSaveButton(page).click();
    const res = await saved;
    if (attempt === 1 && res.status() === 400 && (await res.text()).includes('INVALID_SNAPSHOT')) {
      console.log(`    ${what}: 400 INVALID_SNAPSHOT → รอ 5 วินาทีแล้วบันทึกใหม่`);
      await page.waitForTimeout(5_000);
      continue;
    }
    await expectOk(res, what);
    return;
  }
}
