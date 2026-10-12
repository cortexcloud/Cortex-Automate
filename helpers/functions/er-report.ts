import { expect, test, type Locator, type Page } from '@playwright/test';
import ExcelJS from 'exceljs';
import { expectOk, waitForApi } from './er';

// หน้ารายงานทางสถิติของ ER (เมนู ห้องฉุกเฉิน → รายงานทางสถิติ) — ตรวจกับ dev-x 29 ก.ย. 2026 (การ์ด SBH-1400 รายเดือน)

/** จำนวนผู้ป่วยของช่วงหนึ่ง (1 เดือน / 1 วัน / แถวรวม) ในข้อมูลรายงาน — อัตราเป็นสัดส่วน (0.05 = 5%) null = ไม่มีค่า */
export interface ErReportCounts {
  total: number;
  /** ESI 1–5 ตามลำดับ */
  esi: number[];
  untriaged: number;
  arrival: { walkIn: number; ems: number; referral: number; unspecified: number };
  dispositionOutcome: {
    withApproval: number;
    againstAdvice: number;
    escape: number;
    transfer: number;
    admit: number;
    lwbs: number;
    death: number;
    doa: number;
    other: number;
    pending: number;
  };
}

/** แถวเดือนของ GET /cortex-api/er/reports/monthly */
export interface MonthlyRow extends ErReportCounts {
  month: string; // YYYY-MM
  highAcuityRate: number | null;
  admitRate: number | null;
  momChange: number | null;
}

export interface MonthlyReport {
  from: string;
  to: string;
  rows: MonthlyRow[];
  total: ErReportCounts & { highAcuityRate: number | null; admitRate: number | null; momChange: number | null };
}

/** GET /cortex-api/er/reports/daily — ใช้แค่ยอดรวมของช่วงวันที่ */
export interface DailyReport {
  from: string;
  to: string;
  total: ErReportCounts;
}

/** ค่าในเซลล์ Excel หลังแปลง (สูตรใช้ผลที่คำนวณไว้) */
export type SheetValue = string | number | null;
/**
 * 1 sheet ของไฟล์ที่ Export — rows[แถว Excel - 1][คอลัมน์ Excel - 1] · percent = คอลัมน์ที่ตั้งรูปแบบเป็น % ·
 * formats = รูปแบบตัวเลขของเซลล์ที่ตั้งไว้ (key แบบ Excel เช่น 'D11' → '0.0')
 */
export interface Sheet {
  name: string;
  rows: SheetValue[][];
  percentColumns: Set<number>;
  formats: Map<string, string>;
}

// ---------- เดือน ----------

/** เดือนปัจจุบันตามเวลาไทย YYYY-MM */
export function currentMonth(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).format(new Date());
}

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** เดือนที่อยู่ในช่วง from–to (รวมหัวท้าย) */
export function monthsBetween(from: string, to: string): string[] {
  const months = [from];
  while (months[months.length - 1] < to) months.push(addMonths(months[months.length - 1], 1));
  return months;
}

/** YYYY-MM → รูปแบบที่รายงานแสดง MM/พ.ศ. */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${m}/${Number(y) + 543}`;
}

/** วันแรก / วันสุดท้ายของเดือน YYYY-MM-DD */
export function monthDays(ym: string): { first: string; last: string } {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { first: `${ym}-01`, last: `${ym}-${String(last).padStart(2, '0')}` };
}

// ---------- หน้าจอ ----------

/** ตารางพรีวิวบนหน้ารายงาน: 'จำนวนรวมและระดับ ESI' · 'วิธีการมาห้องฉุกเฉิน' · 'การจำหน่าย' */
export function reportTable(page: Page, name: string): Locator {
  return page.getByRole('main').getByRole('table', { name });
}

/** เซลล์บนตารางหน้าจอ: แถวข้อมูลลำดับ row (0 = เดือนแรก) · คอลัมน์ col (0 = เดือน) */
export function tableCell(table: Locator, row: number, col: number): Locator {
  return table.getByRole('rowgroup').nth(1).getByRole('row').nth(row).getByRole('cell').nth(col);
}

/** อ่านตารางบนหน้าจอเป็นข้อความ: หัวคอลัมน์ + แถวข้อมูล (รวมแถว "รวม") */
export async function readTable(table: Locator): Promise<{ headers: string[]; rows: string[][] }> {
  await expect(table.getByRole('columnheader').first()).toBeVisible();
  const headers = (await table.getByRole('columnheader').allInnerTexts()).map((text) => text.trim());
  const rows = await table
    .getByRole('rowgroup')
    .nth(1)
    .getByRole('row')
    .evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.textContent ?? '').trim())));
  // Ant Design ใส่แถววัดความกว้าง (ช่องว่างทั้งแถว) ไว้ใน tbody
  return { headers, rows: rows.filter((cells) => cells.some(Boolean)) };
}

/** ช่องเลือกช่วงเดือน (เดือนเริ่มต้น / เดือนสิ้นสุด) */
export function monthRangeInputs(page: Page): { from: Locator; to: Locator } {
  const main = page.getByRole('main');
  return { from: main.getByRole('textbox', { name: 'ช่วงวันที่' }), to: main.getByRole('textbox', { name: 'เดือนสิ้นสุด' }) };
}

/** เลือกช่วงเดือนด้วยการพิมพ์ YYYY-MM ลงช่อง (ปฏิทินของ picker แสดงปี ค.ศ. ตรงกับค่าที่พิมพ์) */
export async function setMonthRange(page: Page, from: string, to: string) {
  const inputs = monthRangeInputs(page);
  await inputs.from.click();
  await inputs.from.fill(from);
  await inputs.from.press('Enter');
  await inputs.to.click();
  await inputs.to.fill(to);
  await inputs.to.press('Enter');
  // ปฏิทินที่ค้างอยู่บังตาราง → Escape ปิด (อย่าคลิกป้าย "ช่วงวันที่" — ผูกกับช่องเดือนเริ่ม กดแล้วปฏิทินเปิดอีก)
  const calendar = page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)');
  if (await calendar.isVisible()) await page.keyboard.press('Escape');
  await expect(calendar).toBeHidden();
  await expect(inputs.from).toHaveValue(from);
  await expect(inputs.to).toHaveValue(to);
}

/** กด "ค้นหา" → คืนข้อมูลที่หน้ารายงานโหลด (เช็คว่าขอช่วงเดือนตามที่เลือก) */
export async function searchMonthly(page: Page, from: string, to: string): Promise<MonthlyReport> {
  // จับเฉพาะ response ของช่วงที่เลือก — หน้าเพิ่งเปิดจะมี request ค่าเริ่มต้น (6 เดือนล่าสุด) ตอบตามมาทีหลังได้
  const loaded = page.waitForResponse((res) => {
    const url = new URL(res.url());
    return (
      res.request().method() === 'GET' &&
      url.pathname === '/cortex-api/er/reports/monthly' &&
      url.searchParams.get('from') === from &&
      url.searchParams.get('to') === to
    );
  });
  await page.getByRole('main').getByRole('button', { name: 'ค้นหา' }).click();
  const res = await loaded;
  await expectOk(res, 'โหลดรายงานรายเดือน');
  const report = (await res.json()) as MonthlyReport;
  await test.info().attach(`GET /cortex-api/er/reports/monthly?from=${from}&to=${to}`, {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
  return report;
}

/** กด "Export Excel" → เก็บไฟล์ใน test-results + แนบลงรายงาน · คืน path ไฟล์และชื่อที่ระบบตั้ง */
export async function exportExcel(page: Page, from: string, to: string): Promise<{ path: string; filename: string }> {
  const exported = waitForApi(page, 'GET', '/cortex-api/er/reports/monthly/export');
  const download = page.waitForEvent('download');
  await page.getByRole('main').getByRole('button', { name: 'Export Excel' }).click();
  const res = await exported;
  await expectOk(res, 'Export รายงานรายเดือน');
  const url = new URL(res.url());
  expect([url.searchParams.get('from'), url.searchParams.get('to')], 'ช่วงเดือนที่ขอ Export').toEqual([from, to]);
  const file = await download;
  const filename = file.suggestedFilename();
  const path = test.info().outputPath(filename);
  await file.saveAs(path);
  await test.info().attach(filename, { path, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { path, filename };
}

// ---------- API (อ่านอย่างเดียว) ----------

/**
 * จด header Authorization ล่าสุดที่แอปส่งไป cortex-api — page.request ส่งแค่ cookie แต่ API ใช้ Bearer token
 * แอปต่ออายุ token เองระหว่างเทส จึงเก็บตัวล่าสุดไว้เสมอ · ใช้กับ GET เท่านั้น
 */
export function trackAuthorization(page: Page): () => string {
  let latest = '';
  page.on('request', (req) => {
    const auth = req.headers()['authorization'];
    if (auth && req.url().includes('/cortex-api/')) latest = auth;
  });
  return () => {
    if (!latest) throw new Error('ยังไม่เห็น Authorization header จากแอป — เปิดหน้าที่ยิง cortex-api ก่อน');
    return latest;
  };
}

export async function fetchMonthly(page: Page, authorization: string, from: string, to: string): Promise<MonthlyReport> {
  const res = await page.request.get(`/cortex-api/er/reports/monthly?from=${from}&to=${to}`, { headers: { authorization } });
  await expectOk(res, 'อ่านรายงานรายเดือนผ่าน API');
  return (await res.json()) as MonthlyReport;
}

export async function fetchDaily(page: Page, authorization: string, from: string, to: string): Promise<DailyReport> {
  const res = await page.request.get(`/cortex-api/er/reports/daily?from=${from}&to=${to}`, { headers: { authorization } });
  await expectOk(res, 'อ่านรายงานรายวันผ่าน API');
  return (await res.json()) as DailyReport;
}

// ---------- ไฟล์ Excel ----------

export async function readWorkbook(path: string): Promise<Sheet[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  return workbook.worksheets.map((ws) => {
    const rows: SheetValue[][] = [];
    const percentColumns = new Set<number>();
    const formats = new Map<string, string>();
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const values: SheetValue[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        values[colNumber - 1] = cellValue(cell.value);
        if (cell.numFmt?.includes('%')) percentColumns.add(colNumber - 1);
        if (cell.numFmt) formats.set(`${colLetter(colNumber - 1)}${rowNumber}`, cell.numFmt);
      });
      rows[rowNumber - 1] = Array.from(values, (v) => v ?? null);
    });
    return { name: ws.name, rows: Array.from(rows, (r) => r ?? []), percentColumns, formats };
  });
}

function cellValue(value: ExcelJS.CellValue): SheetValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'object' && 'result' in value) return cellValue(value.result as ExcelJS.CellValue);
  if (typeof value === 'object' && 'richText' in value) return value.richText.map((part) => part.text).join('');
  return String(value);
}

/** ตัวอักษรคอลัมน์ Excel (0 → A) */
export function colLetter(col: number): string {
  return String.fromCharCode(65 + col);
}

// ---------- ภาพหลักฐานของไฟล์ Excel ----------

/**
 * แสดงเนื้อหา sheet เป็นตารางซ้อนทับหน้าเดิม (ติดทั้งภาพหลักฐานและวิดีโอ) — ไฟล์ Excel ไม่ได้เปิดบนจอ
 * แต่ละเซลล์มี data-ref แบบ Excel (เช่น B6) ไว้ตีกรอบด้วย sheetCell() · ปิดด้วย hideSheet() หลังถ่ายภาพ
 */
export async function showSheet(page: Page, filename: string, sheet: Sheet, caption?: string): Promise<Locator> {
  await page.evaluate(
    ({ filename, name, rows, formats, caption }) => {
      document.querySelector('[data-sheet-overlay]')?.remove();
      const overlay = document.createElement('div');
      overlay.setAttribute('data-sheet-overlay', '');
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        background: '#fff',
        zIndex: '2147483000',
        padding: '24px 32px',
        overflow: 'auto',
        font: '14px/1.4 sans-serif',
        color: '#000',
      });
      const title = document.createElement('div');
      title.setAttribute('data-sheet-title', '');
      title.textContent = `ไฟล์ ${filename} · sheet "${name}"${caption ? ` · ${caption}` : ''} (แสดงค่าในไฟล์ตามรูปแบบตัวเลขของแต่ละช่อง เช่น % / ทศนิยม)`;
      Object.assign(title.style, { display: 'inline-block', font: '600 16px sans-serif', marginBottom: '12px', color: '#1f6f43' });
      overlay.appendChild(title);
      const table = document.createElement('table');
      Object.assign(table.style, { borderCollapse: 'collapse' });
      const width = Math.max(...rows.map((r) => r.length));
      const head = table.insertRow();
      head.insertCell().textContent = '';
      for (let c = 0; c < width; c++) head.insertCell().textContent = String.fromCharCode(65 + c);
      for (const cell of head.cells) Object.assign(cell.style, { background: '#eee', color: '#666', padding: '2px 8px', border: '1px solid #ccc', textAlign: 'center' });
      rows.forEach((values, r) => {
        const tr = table.insertRow();
        tr.setAttribute('data-row', String(r + 1));
        const num = tr.insertCell();
        num.textContent = String(r + 1);
        Object.assign(num.style, { background: '#eee', color: '#666', padding: '2px 8px', border: '1px solid #ccc' });
        for (let c = 0; c < width; c++) {
          const td = tr.insertCell();
          const v = values[c];
          td.setAttribute('data-ref', `${String.fromCharCode(65 + c)}${r + 1}`);
          const fmt = formats[`${String.fromCharCode(65 + c)}${r + 1}`] ?? '';
          const decimals = /\.(0+)/.exec(fmt)?.[1].length ?? 0;
          td.textContent =
            v === null || v === undefined
              ? ''
              : typeof v !== 'number'
                ? String(v)
                : fmt.includes('%')
                  ? `${(v * 100).toFixed(decimals)}%`
                  : /0\.0/.test(fmt)
                    ? v.toFixed(decimals)
                    : String(v);
          Object.assign(td.style, { padding: '4px 10px', border: '1px solid #ccc', whiteSpace: 'nowrap', textAlign: typeof v === 'number' ? 'right' : 'left' });
        }
      });
      overlay.appendChild(table);
      document.body.appendChild(overlay);
    },
    { filename, name: sheet.name, rows: sheet.rows, formats: Object.fromEntries(sheet.formats), caption },
  );
  const overlay = page.locator('[data-sheet-overlay]');
  await expect(overlay).toBeVisible();
  return overlay;
}

/** เซลล์ในตารางที่ showSheet() แสดง — ref แบบ Excel เช่น 'A2' */
export function sheetCell(overlay: Locator, ref: string): Locator {
  return overlay.locator(`[data-ref="${ref}"]`);
}

/** ทั้งแถวในตารางที่ showSheet() แสดง — เลขแถวแบบ Excel (เริ่ม 1) */
export function sheetRow(overlay: Locator, row: number): Locator {
  return overlay.locator(`tr[data-row="${row}"]`);
}

export async function hideSheet(page: Page) {
  await page.evaluate(() => document.querySelector('[data-sheet-overlay]')?.remove()).catch(() => undefined);
}
