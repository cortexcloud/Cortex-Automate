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
