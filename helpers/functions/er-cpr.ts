import { expect, type Locator, type Page, type Request, type Response } from '@playwright/test';
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
 * dev-x 29 ต.ค. 2026 (SBH-2530): ติ๊กยาแล้วชื่อปุ่มมีจำนวนยาต่อท้าย "บันทึก Cycle 1(3 ยา)"
 */
export function cprButton(form: Locator, button: 'Start CPR' | 'Save CPR Progress' | 'Stop CPR'): Locator {
  if (button !== 'Save CPR Progress') return form.getByRole('button', { name: button, exact: true });
  return form.getByRole('button', { name: /^(Save CPR Progress|บันทึก Cycle \d+)/ }).first();
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

// ---------- ฟอร์ม CPR Progression รุ่น SBH-2530 (dev-x 29 ต.ค. 2026 · ไฟล์ฟอร์ม sbh-er-cpr-progression-v1.js Last-Modified 26 ต.ค.) ----------
// โครง: แถบ Saved CPR event → CPR Episode Summary (pill สถานะ · ตัวเลขสรุป · ปุ่ม "CPR Timeline (N)" · filter · แถว li.row) →
// การ์ด Cycle (section.cycle-card: เลข Cycle · เริ่ม cycle · countdown · progressbar · chip เวลา 3 ตัว · ช่องวันเวลาบันทึก readonly จนกด "แก้เวลาเอง") →
// CPR Event (CPR Mark <select> · Rhythm ปุ่ม · Defib) → ยาที่ให้ใน Cycle นี้ (section.drugs) → CPR Comment → Nurse note (badge พยาบาล) → Vital Signs (หุบระหว่าง CPR) → ปุ่ม Stop CPR / บันทึก Cycle n
// หลังจบ (ROSC / Stop): banner "CPR Episode #n จบแล้ว" · Post-CPR update · เริ่ม CPR ใหม่ (กู้ชีพซ้ำ) · หน้า History = region "ประวัติ CPR" ในฟอร์มเดียวกัน (ลิงก์ "ดูประวัติ CPR ทั้งหมด (n Episode)")
// countdown นับจากเวลาของ event ล่าสุด + 120 วิ (/cortex-api/er/cpr-settings) · chip ค่าตั้งต้น = min(ครบกำหนด, ตอนนี้ + 2 นาที)
// ปุ่มที่บันทึกข้อมูล: Start CPR · บันทึก Cycle n · บันทึก ROSC (CPR Mark = ROSC) · Stop CPR · บันทึก Post-CPR update · Start CPR (กู้ชีพซ้ำ) · บันทึกการแก้ไข (หน้าต่างแก้ไข event)

/** การ์ดสรุป Episode บนหน้า CPR (ไม่ใช่การ์ดในหน้า History) */
export function cprSummary(form: Locator): Locator {
  return form.locator('section.episode-summary:not(.history)').first();
}

/** หน้า History (region "ประวัติ CPR") */
export function cprHistory(form: Locator): Locator {
  return form.getByRole('region', { name: 'ประวัติ CPR' });
}

/** การ์ด Episode ในหน้า History เรียงตามที่แสดง (ล่าสุดก่อน) */
export function cprHistoryEpisodes(form: Locator): Locator {
  return cprHistory(form).locator('section.episode-summary');
}

/** การ์ด Cycle ที่กำลังทำ */
export function cycleCard(form: Locator): Locator {
  return form.locator('section.cycle-card');
}

/** chip เวลาบันทึก: "+2 นาที (Default)" / "ตอนนี้" / "แก้เวลาเอง" */
export function timeChip(form: Locator, name: 'default' | 'ตอนนี้' | 'แก้เวลาเอง'): Locator {
  const group = cycleCard(form).getByRole('group', { name: 'เวลาบันทึก' });
  return name === 'default' ? group.getByRole('button', { name: /\(Default\)$/ }) : group.getByRole('button', { name, exact: true });
}

/** ช่อง "วันที่และเวลาบันทึก" ของการ์ด Cycle (datetime-local · readonly จนกด "แก้เวลาเอง") */
export function cycleTimeInput(form: Locator): Locator {
  return cycleCard(form).locator('input[type="datetime-local"]');
}

/** ส่วน "ยาที่ให้ใน Cycle นี้" */
export function drugSection(form: Locator): Locator {
  return form.locator('section.drugs');
}

/** ช่องของแถวยา — name = ชื่อยาตามหน้าจอ เช่น "Adrenaline 1:10,000" / "ยาอื่นๆ" */
export function drugFields(form: Locator, name: string) {
  const section = drugSection(form);
  const dose = section.getByLabel(`Dose ${name}`, { exact: true });
  return {
    // filter({ has }) ต้องใช้ locator ที่ไม่ผูกกับ section (ผูกแล้วหาแถวไม่เจอ — ค้างใน markEvidence 20 วิ)
    row: section.locator('li').filter({ has: form.page().getByLabel(`Dose ${name}`, { exact: true }) }),
    check: section.getByRole('checkbox', { name, exact: true }),
    dose,
    route: section.getByLabel(`Route ${name}`, { exact: true }),
    otherName: section.getByLabel('ชื่อยาอื่นๆ', { exact: true }),
  };
}

/** ส่วน Vital Signs (หุบ / กาง) */
export function vitalBox(form: Locator): Locator {
  return form.locator('section.vital-box');
}

/** ช่อง Nurse note ของส่วนที่แสดงอยู่ (ระหว่าง CPR / หลังจบ) */
export function nurseNoteInput(form: Locator): Locator {
  return form.locator('section.nurse-card').getByRole('textbox', { name: 'Nurse note' });
}

/** 1 แถวบน CPR Timeline */
export interface CprRow {
  overdue: boolean;
  time: string;
  iso: string;
  relative: string;
  name: string;
  tags: { text: string; tone: string }[];
  drugs: string[];
  nurse: string;
  nurseMeta: string;
  comment: string;
}

/** อ่านแถว li.row ของ CPR Timeline ในขอบเขตที่ระบุ (การ์ดสรุป / การ์ด Episode ในหน้า History) — อ่านจาก DOM แม้รายการหุบอยู่ */
export async function readCprRows(scope: Locator): Promise<CprRow[]> {
  return scope.locator('li.row').evaluateAll((items) =>
    items.map((li) => {
      const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      const time = li.querySelector('time');
      const nurse = li.querySelector('.nurse-note');
      const known = ['when', 'title', 'drug-chips', 'nurse-note'];
      const extra = [...li.querySelectorAll('.body > *')].filter((el) => !known.some((c) => el.classList.contains(c))).map((el) => text(el)).filter(Boolean);
      return {
        overdue: li.classList.contains('overdue'),
        time: text(time) || text(li.querySelector('.when')),
        iso: time?.getAttribute('datetime') ?? '',
        relative: text(li.querySelector('.relative')),
        name: text(li.querySelector('strong')) || text(li.querySelector('.body')),
        tags: [...li.querySelectorAll('.tag')].map((t) => ({ text: text(t), tone: [...t.classList].find((c) => c.startsWith('tone-')) ?? '' })),
        drugs: [...li.querySelectorAll('.drug-chip')].map((d) => text(d)),
        nurse: text(nurse?.querySelector('p')),
        nurseMeta: text(nurse?.querySelector('small')),
        comment: extra.join(' | '),
      };
    }),
  );
}

/** ตัวเลขสรุปของการ์ด Episode (Started / Ended / Duration / Cycles / Shocks / ยา (dose)) */
export async function readSummaryNumbers(summary: Locator): Promise<Record<string, string>> {
  return summary.locator('dl').first().evaluate((dl) => Object.fromEntries([...dl.querySelectorAll('div')].map((d) => [d.querySelector('dt')?.textContent?.trim() ?? '', d.querySelector('dd')?.textContent?.trim() ?? ''])));
}

/** "HH:mm:ss" / "mm:ss" → วินาที */
export function clockSeconds(text: string): number {
  return text.trim().split(':').map(Number).reduce((total, part) => total * 60 + part, 0);
}

/** เวลาเครื่องของเบราว์เซอร์ (เวลาไทยตาม config) แบบช่อง datetime-local "YYYY-MM-DDTHH:mm:ss" + offset มิลลิวินาที */
export async function browserStamp(page: Page, offsetMs = 0): Promise<string> {
  return page.evaluate((offset) => {
    const d = new Date(Date.now() + offset);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, offsetMs);
}

/** ช่อง datetime-local ตัดวินาที 00 ทิ้ง ("…T13:28") — เติมวินาทีให้ครบก่อนเทียบ */
export function fullStamp(value: string): string {
  return /T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

/** บวกวินาทีให้ค่า "YYYY-MM-DDTHH:mm:ss" (เวลาท้องถิ่น) */
export function shiftStamp(stamp: string, seconds: number): string {
  const [date, time] = fullStamp(stamp).split('T');
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi, s] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi, s) + seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`;
}

/** ส่วนเวลา "HH:mm:ss" ของค่า datetime-local */
export const stampClock = (stamp: string) => fullStamp(stamp).split('T')[1];

/** กรอกช่อง datetime-local ให้ได้วินาทีครบ (วินาที = 00 → browser ตัดเหลือ HH:mm แล้ว Playwright แจ้ง Malformed value) */
export async function fillStamp(input: Locator, stamp: string) {
  await input.fill(stamp.endsWith(':00') ? stamp.slice(0, -3) : stamp);
}

/**
 * กดปุ่มที่บันทึก event (Start CPR / บันทึก Cycle / บันทึก ROSC / Stop CPR / บันทึก Post-CPR update) → รอ contribution 201 + ฟอร์มโหลดเสร็จ
 * คืน payload ของ flat-to-json ทุกตัวระหว่างบันทึก (เช่น Vital Signs ที่ส่ง `vital_signs_v4`)
 */
export async function clickCprSave(page: Page, form: Locator, button: Locator, what: string): Promise<{ template: string; body: string }[]> {
  const sent: { template: string; body: string }[] = [];
  const onRequest = (req: Request) => {
    const match = req.url().match(/flat-to-json\?templateId=([\w.-]+)/);
    if (match) sent.push({ template: match[1], body: req.postData() ?? '' });
  };
  page.on('request', onRequest);
  try {
    const saved = waitForApi(page, 'POST', /\/contribution$/, 60_000);
    await button.click();
    await expectOk(await saved, what);
    await expect(form).toHaveAttribute('aria-busy', 'false', { timeout: 60_000 });
  } finally {
    page.off('request', onRequest);
  }
  return sent;
}

/** นับคำสั่งบันทึก (POST …/contribution) ระหว่างทำ body + รอต่อ 2 วินาที — ใช้ยืนยันว่า "ไม่บันทึก" */
export async function countCprSaves(page: Page, body: () => Promise<void>): Promise<number> {
  let count = 0;
  const onRequest = (req: Request) => {
    if (/\/contribution$/.test(req.url()) && req.method() === 'POST') count++;
  };
  page.on('request', onRequest);
  try {
    await body();
    await page.waitForTimeout(2_000);
  } finally {
    page.off('request', onRequest);
  }
  return count;
}
