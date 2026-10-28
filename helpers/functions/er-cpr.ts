import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { expectOk, openCarePanel, waitForApi } from './er';

// ฟอร์ม CPR Progression ของ ER (custom element ของ cortex-form — เนื้อหาอยู่ใน shadow DOM) — locator ตรวจกับหน้าจอจริงบน dev-x 12 ต.ค. 2026
// ฟอร์มเดียวกันถูกใช้ 2 ที่: แผงขวา (เมนู CPR Progression — กรอกได้) และแท็บ CPR Progression ของหน้าประวัติการรักษา (อ่านอย่างเดียว)

export const CPR_FORM_TAG = 'sbh-er-cpr-progression-v1';

/** ชื่อ event ที่ CPR Timeline แสดง ของรหัส action ใน API */
export const CPR_ACTION_LABEL: Record<string, string> = { start: 'Start CPR', cycle_update: 'CPR Progress / Cycle Update', stop: 'Stop CPR' };

/** 1 รายการของ CPR: ชื่อ event + วันเวลาแบบที่หน้าจอแสดง (DD/MM/พ.ศ. HH:mm:ss) */
export interface CprEvent {
  action: string;
  time: string;
}

/** ฟอร์มที่กรอกได้ (แผงขวา) */
export function cprForm(page: Page): Locator {
  return page.getByRole('main').locator(`${CPR_FORM_TAG} .cpr-form[aria-readonly="false"]`);
}

/** ฟอร์มโหมดอ่านอย่างเดียว (แท็บ CPR Progression ของหน้าประวัติการรักษา) */
export function cprHistoryForm(page: Page): Locator {
  return page.getByRole('main').locator(`${CPR_FORM_TAG} .cpr-form[aria-readonly="true"]`);
}

/** หัวข้อ CPR Timeline (`<details>` — หัว `summary` "CPR Timeline (n)" · รายการ `li`) ของฟอร์มที่ระบุ */
export function cprTimeline(form: Locator): Locator {
  return form.locator('details.timeline-details');
}

/** แท็บ CPR Progression ของหน้าประวัติการรักษา (แผงขวาก็มีแท็บชื่อเดียวกัน — แยกด้วยแถบที่มีแท็บ Timeline) */
export function cprHistoryTab(page: Page): Locator {
  const main = page.getByRole('main');
  return main
    .getByRole('tablist')
    .filter({ has: page.getByRole('tab', { name: 'Timeline', exact: true }) })
    .getByRole('tab', { name: 'CPR Progression', exact: true });
}

/** เมนูขวา CPR Progression → รอฟอร์มที่กรอกได้โหลดเสร็จ */
export async function openCprForm(page: Page): Promise<Locator> {
  const main = page.getByRole('main');
  await openCarePanel(page, 'CPR Progression', main.getByRole('heading', { name: 'CPR Progression' }).first());
  const form = cprForm(page);
  await expect(form.getByRole('heading', { name: 'CPR Event' })).toBeVisible({ timeout: 45_000 });
  await expect(form).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
  return form;
}

/** แถบ "Saved CPR event" ที่ฟอร์มแสดงหลังบันทึกแต่ละครั้ง — บรรทัดแรก "<ชื่อ event> · DD/MM/พ.ศ. HH:mm:ss" */
export function cprSavedBanner(form: Locator): Locator {
  return form.locator('section[aria-label="Saved CPR event"]');
}

/**
 * ปุ่มบันทึก event ของฟอร์ม — dev-x 28 ต.ค. 2026 (SBH-2355): ปุ่ม "Save CPR Progress" เปลี่ยนชื่อเป็น "บันทึก Cycle <n>" (n = รอบถัดไป) → รับได้ทั้ง 2 แบบ
 */
export function cprButton(form: Locator, button: 'Start CPR' | 'Save CPR Progress' | 'Stop CPR'): Locator {
  if (button !== 'Save CPR Progress') return form.getByRole('button', { name: button, exact: true });
  return form.getByRole('button', { name: /^(Save CPR Progress|บันทึก Cycle \d+)$/ }).first();
}

/**
 * กดปุ่มบันทึก event ของฟอร์ม (`Start CPR` / `Save CPR Progress` / `Stop CPR`) → รอคำสั่งบันทึก (POST …/contribution) สำเร็จ
 * → คืนชื่อ event + วันเวลาที่แถบ "Saved CPR event" แสดง (ใช้เป็นค่าที่ "จดไว้" ตอนบันทึก)
 */
export async function saveCprEvent(page: Page, form: Locator, button: 'Start CPR' | 'Save CPR Progress' | 'Stop CPR', action: string): Promise<CprEvent> {
  const saved = waitForApi(page, 'POST', /\/contribution$/, 60_000);
  await cprButton(form, button).click();
  await expectOk(await saved, `บันทึก CPR event ${action}`);
  const line = cprSavedBanner(form).locator('span').first();
  const pattern = new RegExp(`^${action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} · `);
  if (button === 'Save CPR Progress') {
    // ฟอร์มรุ่นใหม่ (dev-x 28 ต.ค. 2026 · SBH-2355): บันทึกรอบแล้วไม่ขึ้นแถบ Saved CPR event — ยืนยันจากคำสั่งบันทึก (contribution) ที่ผ่านแล้ว + ปุ่มขึ้นรอบถัดไป
    const shown = await expect(line).toHaveText(pattern, { timeout: 8_000 }).then(() => true, () => false);
    await expect(form).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
    if (!shown) return { action, time: '' };
  } else {
    await expect(line, `แถบ Saved CPR event ต้องแสดง ${action}`).toHaveText(pattern, { timeout: 30_000 });
    await expect(form).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
  }
  const [name, time] = ((await line.textContent()) ?? '').split(' · ');
  return { action: name.trim(), time: time.trim() };
}

/** รายการใต้ CPR Timeline ตามลำดับที่แสดง (อ่านจาก DOM — ใช้ได้แม้หัวข้อพับอยู่ จึงต้องเช็คว่ามองเห็นแยกต่างหาก) */
export async function readCprTimeline(timeline: Locator): Promise<CprEvent[]> {
  return timeline.locator('li').evaluateAll((items) => items.map((item) => ({ action: item.querySelector('strong')?.textContent?.trim() ?? '', time: item.querySelector('time')?.textContent?.trim() ?? '' })));
}

/** เวลา ISO → "DD/MM/พ.ศ. HH:mm:ss" เวลาไทย (รูปแบบเดียวกับที่ฟอร์ม CPR แสดง) */
export function cprDisplayTime(iso: string): string {
  const [date, time] = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso)).split(' ');
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${Number(year) + 543} ${time}`;
}

/** response ของ query `get_er_cpr_progression_by_encounter` (ฟอร์มยิงเองตอนโหลด — อ่านอย่างเดียว) ของ Encounter นี้ — เริ่มรอก่อนเปิดฟอร์ม */
export function waitForCprQuery(page: Page, en: string, timeout = 60_000): Promise<Response> {
  const response = page.waitForResponse((res) => res.url().includes('get_er_cpr_progression_by_encounter') && (res.request().postData() ?? '').includes(en), { timeout });
  response.catch(() => undefined);
  return response;
}

/** แปลงคำตอบของ query เป็นรายการ event เรียงตามเวลา (ชื่อ event ตามที่ Timeline แสดง) */
export async function parseCprQuery(res: Response): Promise<CprEvent[]> {
  await expectOk(res, 'อ่านรายการ CPR ของ Encounter');
  const { columns, rows } = (await res.json()) as { columns: { name: string }[]; rows: (string | null)[][] };
  const at = (name: string) => columns.findIndex((column) => column.name === name);
  return rows
    .map((row) => ({ code: row[at('action')] ?? '', iso: row[at('clinical_time')] ?? '' }))
    .sort((a, b) => a.iso.localeCompare(b.iso))
    .map(({ code, iso }) => ({ action: CPR_ACTION_LABEL[code] ?? code, time: cprDisplayTime(iso) }));
}
