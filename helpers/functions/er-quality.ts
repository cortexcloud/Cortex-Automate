import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectOk } from './er';

// หน้า "คุณภาพห้องฉุกเฉิน" ของรายงานทางสถิติ ER (/cortex/er/reports/quality) — ตรวจกับ dev-x 29 ก.ย. 2026 (การ์ด SBH-1401)
// ช่องช่วงเวลาเป็น readonly (พิมพ์ไม่ได้) → เลือกจากปฏิทิน · Filter เข้า URL ตอนกด "ค้นหา" และ Export ใช้ Filter ของการค้นหาครั้งล่าสุด

export type Granularity = 'shift' | 'day' | 'month';
export const GRANULARITY_LABEL: Record<Granularity, string> = { shift: 'รายเวร', day: 'รายวัน', month: 'รายเดือน' };

/** ค่าของ 1 bucket (หรือแถวรวม) — ค่าเฉลี่ยเป็นนาที · อัตราเป็นสัดส่วน (0.6 = 60%) · null = ไม่มีตัวหาร */
export interface QualityCounts {
  eligible: number;
  doorToDocMeanMinutes: number | null;
  doorToDocCount: number;
  doorToDispositionMeanMinutes: number | null;
  doorToDispositionCount: number;
  overTargetCase: number;
  overTargetRate: number | null;
  /** ESI 1–5 ตามลำดับ */
  eligibleByLevel: number[];
  overTargetCaseByLevel: number[];
  overTargetRateByLevel: (number | null)[];
  indexDischarges: number;
  revisitCase: number;
  revisitRate: number | null;
  provisionalIndexDischarges: number;
}

export interface QualityRow extends QualityCounts {
  /** YYYY-MM-DD (รายเวร / รายวัน) หรือ YYYY-MM (รายเดือน) */
  date: string;
  shiftCode?: string;
  shiftName: { th: { name: string } };
  /** แถว "ไม่ระบุเวร" */
  unassigned: boolean;
}

export interface RevisitDetail {
  indexEn: string;
  indexLevel: number;
  indexSignedAt: string;
  revisitEn: string;
  revisitArrivedAt: string;
  hours: number;
  provisional: boolean;
}

/** GET /cortex-api/er/reports/quality */
export interface QualityReport {
  granularity: Granularity;
  from: string;
  to: string;
  generatedAt: string;
  targets: { level: number; minutes: number | null }[];
  rows: QualityRow[];
  total: QualityCounts;
  revisitDetails: RevisitDetail[];
}

export interface QualityFilter {
  granularity: Granularity;
  from: string;
  to: string;
  /** รหัสเวร เช่น morning — ไม่ใส่ = ทุกเวร */
  shifts?: string[];
  /** ไม่ใส่ = ทุกระดับ */
  esi?: number[];
}

/** GET /cortex-api/er/triage/wait-time-settings — limitSeconds null = ไม่จำกัดเวลา */
export interface WaitTimeSetting {
  level: number;
  limitSeconds: number | null;
}

/** Encounter จาก API ของ ER Dashboard (GET /cortex-api/er/dashboard/encounters?date=) — เวลาละเอียดระดับมิลลิวินาที */
export interface BoardEncounter {
  en: string;
  hn: string;
  triageLevel: number | null;
  latestStatusCode: string;
  arrivedAt: string;
  startedTreatmentAt: string | null;
}

// ---------- วันที่ ----------

/** วันนี้ตามเวลาไทย YYYY-MM-DD */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): string[] {
  const days = [from];
  while (days[days.length - 1] < to) days.push(addDays(days[days.length - 1], 1));
  return days;
}

/** YYYY-MM-DD → DD/MM/พ.ศ. (รูปแบบบนหน้าจอและในไฟล์) */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${Number(y) + 543}`;
}

/** ISO → วันที่ตามเวลาไทย YYYY-MM-DD */
export function bangkokDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date(iso));
}

/** "29/09/2569 18:03" (เวลาไทย) → Date */
export function parseThaiDateTime(text: string): Date {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(text.trim());
  if (!match) throw new Error(`รูปแบบวันเวลาไม่ใช่ DD/MM/พ.ศ. HH:mm: "${text}"`);
  const [, d, m, y, hh, mm] = match;
  return new Date(`${Number(y) - 543}-${m}-${d}T${hh}:${mm}:00+07:00`);
}

// ---------- หน้าจอ ----------

export function qualityMain(page: Page): Locator {
  return page.getByRole('main');
}

export function granularityRadio(page: Page, granularity: Granularity): Locator {
  return qualityMain(page).getByRole('radio', { name: GRANULARITY_LABEL[granularity] });
}

/** เลือกระดับรายงาน (segmented control — คลิกที่ข้อความ เพราะ radio ถูกซ่อน) */
export async function chooseGranularity(page: Page, granularity: Granularity) {
  await qualityMain(page).getByRole('radiogroup').getByText(GRANULARITY_LABEL[granularity], { exact: true }).click();
  await expect(granularityRadio(page, granularity)).toBeChecked();
}

/** ช่องช่วงเวลา: เริ่ม (ชื่อ "ช่วงเวลา") / สิ้นสุด ("วันสิ้นสุด" หรือ "เดือนสิ้นสุด") */
export function periodInputs(page: Page): { from: Locator; to: Locator } {
  const main = qualityMain(page);
  return { from: main.getByRole('textbox', { name: 'ช่วงเวลา' }), to: main.getByRole('textbox', { name: /^(วัน|เดือน)สิ้นสุด$/ }) };
}

export function shiftSelect(page: Page): Locator {
  return qualityMain(page).getByRole('combobox', { name: 'เวร' });
}

export function esiSelect(page: Page): Locator {
  return qualityMain(page).getByRole('combobox', { name: 'ESI / Triage Level' });
}

/** กล่องของ select (ไว้ตีกรอบ — combobox จริงเป็น input เล็กๆ) */
export function selectBox(select: Locator): Locator {
  return select.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
}

function openDropdown(page: Page): Locator {
  return page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
}

export function pickerDropdown(page: Page): Locator {
  return page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)');
}

/**
 * เลือกช่วงจากปฏิทิน (ช่องพิมพ์ไม่ได้): คลิกวัน/เดือนเริ่ม แล้ววัน/เดือนสิ้นสุด — ย้อนเดือน/ปีด้วยปุ่มหัวปฏิทินจนเจอช่องที่ต้องการ
 * ช่องในปฏิทินมี title = YYYY-MM-DD (หรือ YYYY-MM ในโหมดรายเดือน) · ต้องระบุ in-view เพราะวันของเดือนข้างเคียงแสดงซ้ำ
 */
export async function pickPeriod(page: Page, from: string, to: string) {
  const { from: start } = periodInputs(page);
  await start.click();
  const dropdown = pickerDropdown(page);
  await expect(dropdown).toBeVisible();
  await clickCalendarCell(page, from);
  await clickCalendarCell(page, to);
  await expect(dropdown).toBeHidden();
}

export async function clickCalendarCell(page: Page, title: string) {
  const dropdown = pickerDropdown(page);
  const cell = dropdown.locator(`td.ant-picker-cell-in-view[title="${title}"]`);
  // เลื่อนปฏิทินไปทางเดือน/ปีของช่องที่ต้องการ (เทียบกับช่องแรกที่แสดงอยู่ — title เรียงตามตัวอักษรได้)
  const step = title.length === 7 ? 'ปี' : 'เดือน';
  const prev = dropdown.getByRole('button', { name: new RegExp(`^${step}ก่อนหน้า`) }).first();
  const next = dropdown.getByRole('button', { name: new RegExp(`^${step}ถัดไป`) }).last();
  const shown = dropdown.locator('td.ant-picker-cell-in-view');
  for (let i = 0; i < 120 && !(await cell.isVisible()); i++) {
    const first = (await shown.first().getAttribute('title')) ?? '';
    await (title < first ? prev : next).click();
  }
  await cell.click();
}

/**
 * multi-select ของ Ant Design (เวร / ESI): ให้เหลือเลือกเฉพาะ keep — กดสลับเฉพาะตัวที่สถานะไม่ตรง
 * ตัวเลือกดูสถานะจาก class ant-select-item-option-selected
 */
export async function keepOptions(page: Page, select: Locator, keep: string[]) {
  await select.click();
  const dropdown = openDropdown(page);
  const options = dropdown.locator('.ant-select-item-option');
  await expect(options.first()).toBeVisible();
  for (const label of await options.allInnerTexts()) {
    const option = options.filter({ hasText: new RegExp(`^${label.trim()}$`) });
    const selected = (await option.getAttribute('class'))?.includes('ant-select-item-option-selected');
    if (selected !== keep.includes(label.trim())) await option.click();
  }
  return dropdown;
}

/** ปุ่มค้นหา / Export Excel */
export function searchButton(page: Page): Locator {
  return qualityMain(page).getByRole('button', { name: 'search ค้นหา' });
}

export function exportButton(page: Page): Locator {
  return qualityMain(page).getByRole('button', { name: 'download Export Excel' });
}

/** query string ที่หน้าจอส่ง (ไม่ใส่ shifts / esi = ทั้งหมด) */
export function qualityQuery(filter: QualityFilter): string {
  const params = new URLSearchParams({ granularity: filter.granularity, from: filter.from, to: filter.to });
  if (filter.shifts) params.set('shifts', filter.shifts.join(','));
  if (filter.esi) params.set('esi', filter.esi.join(','));
  return params.toString();
}

function matchesFilter(url: URL, filter: QualityFilter): boolean {
  const p = url.searchParams;
  return (
    p.get('granularity') === filter.granularity &&
    p.get('from') === filter.from &&
    p.get('to') === filter.to &&
    (p.get('shifts') ?? '') === (filter.shifts?.join(',') ?? '') &&
    (p.get('esi') ?? '') === (filter.esi?.join(',') ?? '')
  );
}

/** กด "ค้นหา" → คืนข้อมูลที่หน้าจอโหลด (เช็คว่าขอด้วย Filter ตามที่เลือก) + แนบ JSON ลงรายงาน */
export async function searchQuality(page: Page, filter: QualityFilter): Promise<QualityReport> {
  const loaded = page.waitForResponse((res) => {
    const url = new URL(res.url());
    return res.request().method() === 'GET' && url.pathname === '/cortex-api/er/reports/quality' && matchesFilter(url, filter);
  });
  await searchButton(page).click();
  const res = await loaded;
  await expectOk(res, 'โหลดรายงานคุณภาพห้องฉุกเฉิน');
  const report = (await res.json()) as QualityReport;
  await test.info().attach(`GET /cortex-api/er/reports/quality?${qualityQuery(filter)}`, {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
  return report;
}

/** กด "Export Excel" → เก็บไฟล์ + แนบลงรายงาน · คืน path ไฟล์ ชื่อไฟล์ และ query ที่หน้าจอส่งไป export จริง */
export async function exportQuality(page: Page): Promise<{ path: string; filename: string; query: URLSearchParams; clickedAt: Date }> {
  const exported = page.waitForResponse(
    (res) => res.request().method() === 'GET' && new URL(res.url()).pathname === '/cortex-api/er/reports/quality/export',
    { timeout: 120_000 },
  );
  const download = page.waitForEvent('download', { timeout: 120_000 });
  const clickedAt = new Date();
  await exportButton(page).click();
  const res = await exported;
  await expectOk(res, 'Export รายงานคุณภาพห้องฉุกเฉิน');
  const file = await download;
  const filename = file.suggestedFilename();
  const path = test.info().outputPath(filename);
  await file.saveAs(path);
  await test.info().attach(filename, { path, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { path, filename, query: new URL(res.url()).searchParams, clickedAt };
}

/** ตารางบนหน้าจอ: 'สรุปตัวชี้วัดคุณภาพ' · 'Over Target ต่อ ESI (ราย)' · 'Over Target ต่อ ESI (%)' · '72h Revisit Detail' */
export function qualityTable(page: Page, name: string): Locator {
  return qualityMain(page).getByRole('table', { name });
}

// ---------- API (อ่านอย่างเดียว ยกเว้นคืนค่าตั้งค่าเวลารอตรวจ) ----------

export async function fetchQuality(page: Page, authorization: string, filter: QualityFilter): Promise<QualityReport> {
  const res = await page.request.get(`/cortex-api/er/reports/quality?${qualityQuery(filter)}`, { headers: { authorization } });
  await expectOk(res, 'อ่านรายงานคุณภาพห้องฉุกเฉินผ่าน API');
  return (await res.json()) as QualityReport;
}

export async function fetchWaitTimeSettings(page: Page, authorization: string): Promise<WaitTimeSetting[]> {
  const res = await page.request.get('/cortex-api/er/triage/wait-time-settings', { headers: { authorization } });
  await expectOk(res, 'อ่านค่าตั้งค่าเวลารอตรวจ');
  return ((await res.json()) as { items: WaitTimeSetting[] }).items;
}

/**
 * คืนค่าตั้งค่าเวลารอตรวจเดิม — ใช้ใน afterEach เมื่อเทสพังก่อนถึงขั้นคืนค่าผ่านหน้าจอ (R29 ข้อ 1)
 * body เดียวกับที่หน้าตั้งค่าส่ง (PATCH {items})
 */
export async function restoreWaitTimeSettings(page: Page, authorization: string, items: WaitTimeSetting[]) {
  const res = await page.request.patch('/cortex-api/er/triage/wait-time-settings', { headers: { authorization }, data: { items } });
  await expectOk(res, 'คืนค่าตั้งค่าเวลารอตรวจ');
}

export async function fetchBoardEncounters(page: Page, authorization: string, date: string): Promise<BoardEncounter[]> {
  const res = await page.request.get(`/cortex-api/er/dashboard/encounters?date=${date}`, { headers: { authorization } });
  await expectOk(res, `อ่านรายการผู้ป่วย ER วันที่ ${date}`);
  return (await res.json()) as BoardEncounter[];
}

// ---------- ค่าที่คิดเอง ----------

/** ผลรวมของค่าเฉลี่ย × จำนวน (ใช้เทียบผลรวมข้าม bucket และหาผลต่างก่อน/หลัง) */
export function meanSum(mean: number | null, count: number): number {
  return mean === null ? 0 : mean * count;
}

export const minutesBetween = (fromIso: string, toIso: string) => (Date.parse(toIso) - Date.parse(fromIso)) / 60_000;
