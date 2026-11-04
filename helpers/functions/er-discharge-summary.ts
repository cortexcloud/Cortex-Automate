import { expect, type Locator, type Page } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ErVisit } from './er';
import { markEvidence } from './evidence';
import { showPdf } from './print-capture';

// ER Discharge Summary (สรุปการจำหน่ายผู้ป่วยฉุกเฉิน) — dev-x 4 พ.ย. 2026 · ไฟล์แอป index-DABLTrDz.js · การ์ด SBH-2079
// - ประวัติการรักษา > Encounter ER > แท็บ "สรุปการจำหน่าย" (ลำดับ ER Summary · สรุปการจำหน่าย · Timeline · CPR Progression · ประวัติ Custom Form · ค่าใช้จ่าย)
//   เปิดแท็บ = POST /cortex-api/er/encounters/<EN>/discharge-summary/pdf?intent=view → ตัวดู PDF ในหน้า (ปุ่ม พิมพ์ · ซูม · หน้า x/y)
//   ยังไม่ลงนาม = ข้อความ "ยังไม่มีสรุปการจำหน่ายเพราะยังไม่ลงนามการจำหน่าย" (ไม่มีตัวดู PDF)
// - เมนู Disposition หัวฟอร์ม: ปุ่ม "printer พิมพ์สรุปการจำหน่าย" (disabled จนกว่าลงนาม)
// - ปุ่มพิมพ์ทั้ง 2 ที่ = POST …/discharge-summary/pdf?intent=print → แอปส่ง PDF ต่อให้ print agent localhost:8081/print/laser?size=A4&orientation=portrait
//   (ไม่มีหน้าต่างพิมพ์ของ Chrome) → เก็บ PDF ด้วย captureGeneratedDocs (R77)
// - ข้อความไทยที่ดึงจาก PDF วรรณยุกต์ / สระบนล่าง / ำ เพี้ยน (ToUnicode ของฟอนต์ เช่น "แพ้" → "แพู" · "จำหน่าย" → "จĺาหน่าย") → เทียบด้วย thaiKey()

export const DS_PDF_API = /\/cortex-api\/er\/encounters\/[^/]+\/discharge-summary\/pdf$/;
export const DS_TAB = 'สรุปการจำหน่าย';
export const DS_NOT_SIGNED = 'ยังไม่มีสรุปการจำหน่ายเพราะยังไม่ลงนามการจำหน่าย';

/** ตัดวรรณยุกต์ / สระบน-ล่าง / อักษรเพี้ยนจาก ToUnicode ออก (ำ → า) + ยุบช่องว่าง — ใช้เทียบข้อความใน PDF กับค่าที่บันทึก */
export function thaiKey(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/ำ/g, 'า')
    .replace(/[ัิ-ฺ็-๎Ā-ſ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface DsLine {
  page: number;
  /** พิกัดจากขอบบน (point) */
  y: number;
  text: string;
  key: string;
}
export interface DsPdf {
  pages: number;
  size: { width: number; height: number }[];
  lines: DsLine[];
}

let pdfjsNode: Promise<any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
/** อ่าน PDF เป็นบรรทัด (รวมชิ้นที่ y ต่างกัน ≤ 2pt เรียงซ้าย → ขวา) */
export async function readDsPdf(pdf: Buffer): Promise<DsPdf> {
  pdfjsNode ??= import(pathToFileURL(path.join(__dirname, '..', '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href);
  const pdfjs = await pdfjsNode;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), disableFontFace: true }).promise;
  const out: DsPdf = { pages: doc.numPages, size: [], lines: [] };
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p);
    const vp = pg.getViewport({ scale: 1 });
    out.size.push({ width: vp.width, height: vp.height });
    const rows = new Map<number, [number, string][]>();
    for (const it of (await pg.getTextContent()).items as { str?: string; transform: number[] }[]) {
      if (!it.str?.trim()) continue;
      const y = Math.round(vp.height - it.transform[5]);
      const k = [...rows.keys()].find((yy) => Math.abs(yy - y) <= 2) ?? y;
      rows.set(k, [...(rows.get(k) ?? []), [it.transform[4], it.str]]);
    }
    for (const y of [...rows.keys()].sort((a, b) => a - b)) {
      const text = rows.get(y)!.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join(' ').replace(/\s+/g, ' ').trim();
      out.lines.push({ page: p, y, text, key: thaiKey(text) });
    }
  }
  return out;
}

/** บรรทัดแรกที่มีข้อความ (เทียบแบบ thaiKey) · `after` = ต้องอยู่หลังบรรทัดนี้ */
export function dsFind(pdf: DsPdf, text: string | RegExp, after?: DsLine): DsLine | undefined {
  const start = after ? pdf.lines.indexOf(after) + 1 : 0;
  return pdf.lines.slice(start).find((l) => (typeof text === 'string' ? l.key.includes(thaiKey(text)) : text.test(l.key)));
}
export function dsFindAll(pdf: DsPdf, text: string | RegExp): DsLine[] {
  return pdf.lines.filter((l) => (typeof text === 'string' ? l.key.includes(thaiKey(text)) : text.test(l.key)));
}
/** บรรทัดระหว่างหัวส่วน `from` ถึงหัวส่วน `to` (ไม่รวม) — ข้ามหัว / ท้ายกระดาษที่ซ้ำทุกหน้า */
export function dsSection(pdf: DsPdf, from: string | RegExp, to?: string | RegExp): DsLine[] {
  const a = dsFind(pdf, from);
  if (!a) return [];
  const b = to ? dsFind(pdf, to, a) : undefined;
  const lines = pdf.lines.slice(pdf.lines.indexOf(a) + 1, b ? pdf.lines.indexOf(b) : undefined);
  return lines.filter((l) => !isRunningHeader(l));
}
/** หัวกระดาษ / ท้ายกระดาษที่แสดงซ้ำทุกหน้า */
export function isRunningHeader(l: DsLine): boolean {
  return l.y < 105 || l.y > 800;
}
export const dsText = (lines: DsLine[]) => lines.map((l) => l.text).join(' / ');
export const dsKey = (lines: DsLine[]) => lines.map((l) => l.key).join(' ');

/** ผลตัวเลือกแบบ [X] / [ ] ในบรรทัดของส่วนหนึ่ง: { ชื่อตัวเลือก: ติ๊กไหม } */
export function dsCheckboxes(lines: DsLine[]): { label: string; checked: boolean }[] {
  const text = lines.map((l) => l.text).join(' ');
  return [...text.matchAll(/\[( |X)\]\s*([^[]+)/g)].map((m) => ({ label: m[2].trim(), checked: m[1] === 'X' }));
}

// ------------------------------------------------------------------------------------------------
// หน้าจอ
/** เมนูซ้าย ประวัติการรักษา → Encounter ER → แท็บ สรุปการจำหน่าย · คืน PDF ที่แท็บโหลด (intent=view) หรือ undefined เมื่อยังไม่ลงนาม */
export async function openDsTab(page: Page, visit: ErVisit, opts: { expectPdf?: boolean } = {}): Promise<{ panel: Locator; pdf?: Buffer }> {
  const main = page.getByRole('main');
  const encounter = main.getByRole('button', { name: new RegExp(`^ER [0-9/]{10}.*${visit.en}`) }).first();
  await expect(async () => {
    if (!(await encounter.isVisible())) {
      await page.getByRole('navigation', { name: 'ข้อมูลและเวชระเบียนผู้ป่วย' }).getByRole('menuitem', { name: 'ประวัติการรักษา', exact: true }).first().click({ force: true });
      await page.mouse.move(960, 700);
    }
    await expect(encounter).toBeVisible({ timeout: 15_000 });
  }, `ประวัติการรักษาต้องมี Encounter ER ${visit.en}`).toPass({ timeout: 120_000 });
  await encounter.dispatchEvent('click');
  const tab = main.getByRole('tab', { name: DS_TAB, exact: true });
  await expect(tab, `Encounter ER ต้องมีแท็บ ${DS_TAB}`).toBeVisible({ timeout: 45_000 });
  const viewed = opts.expectPdf === false ? undefined : page.waitForResponse((r) => r.request().method() === 'POST' && DS_PDF_API.test(new URL(r.url()).pathname) && /intent=view/.test(r.url()), { timeout: 60_000 });
  await tab.click();
  const panel = dsPanel(page);
  await expect(panel).toBeVisible({ timeout: 30_000 });
  if (!viewed) return { panel };
  const res = await viewed;
  expect(res.status(), 'เปิดแท็บ: โหลด PDF ต้องได้ 200').toBe(200);
  const pdf = await res.body();
  await page.waitForTimeout(2_500); // ตัวดู PDF วาดหน้าแรก
  return { panel, pdf };
}

/** แผงของแท็บที่เลือกอยู่ในประวัติการรักษา */
export function dsPanel(page: Page): Locator {
  return page.getByRole('main').getByRole('tabpanel').filter({ visible: true }).last();
}
export function dsTabPrintButton(page: Page): Locator {
  return dsPanel(page).getByRole('button', { name: /พิมพ์/ }).first();
}
/** ปุ่ม "พิมพ์สรุปการจำหน่าย" ที่หัวฟอร์ม Disposition */
export function dsDispositionPrintButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: /พิมพ์สรุปการจำหน่าย/ }).first();
}

/**
 * แสดง PDF ซ้อนครึ่งขวาของจอ (showPdf) แล้วเลื่อนให้บรรทัด `focus` อยู่ในจอ · `textLayer` ให้ป้ายกรอบแดงหลบตัวอักษร
 * คืน overlay — ตีกรอบบรรทัดด้วย dsLineBox()
 */
export async function showDs(page: Page, pdf: Buffer, caption: string, pageNo: number, focus?: DsLine | number): Promise<Locator> {
  const overlay = await showPdf(page, pdf, caption, pageNo, { textLayer: true });
  await page.locator('[data-pdf-overlay] [data-pdf-page]').evaluate((sheet) => {
    // ความกว้างจาก pdf.js แคบกว่าตัวอักษรที่วาดจริง (ฟอนต์ไทย / ตัวเอียง) → กรอบแดงผ่ากลางข้อความ: ขยายกรอบบรรทัด
    sheet.querySelectorAll('[data-pdf-line]').forEach((e) => {
      const s = (e as HTMLElement).style;
      s.left = `${parseFloat(s.left) - 3}px`;
      s.width = `${parseFloat(s.width) * 1.15 + 12}px`;
      s.top = `${parseFloat(s.top) - 2}px`;
      s.height = `${parseFloat(s.height) + 4}px`;
    });
  });
  const y = typeof focus === 'number' ? focus : focus?.y;
  if (y !== undefined) {
    await overlay.evaluate((el, y) => {
      const sheet = el.querySelector('[data-pdf-page]') as HTMLElement;
      const scale = Number(sheet.dataset.scale);
      el.scrollTop = Math.max(0, sheet.offsetTop + y * scale - 260);
    }, y);
  }
  await page.waitForTimeout(400);
  return overlay;
}

/** กรอบโปร่งใสของบรรทัดบน PDF ที่ showDs() วาด (เทียบแบบ thaiKey) — `nth` = บรรทัดที่เท่าไรที่ตรง · ไม่เจอ = undefined */
export async function dsLineBox(overlay: Locator, text: string | RegExp, nth = 0): Promise<Locator | undefined> {
  const titles = await overlay.locator('[data-pdf-line]').evaluateAll((els) => els.map((e) => (e as HTMLElement).title));
  const hits = titles.map((t, i) => ({ i, k: thaiKey(t) })).filter(({ k }) => (typeof text === 'string' ? k.includes(thaiKey(text)) : text.test(k)));
  const hit = hits[nth];
  return hit ? overlay.locator(`[data-pdf-line="${hit.i}"]`) : undefined;
}

/** กรอบรอบช่วง y (point) ทั้งความกว้างหน้า — ใช้วงทั้งส่วน / ตาราง */
export async function dsBand(overlay: Locator, top: number, bottom: number, name: string, x0 = 18, x1 = 578): Promise<Locator> {
  await overlay.locator('[data-pdf-page]').evaluate(
    (sheet, { top, bottom, name, x0, x1 }) => {
      const scale = Number((sheet as HTMLElement).dataset.scale);
      sheet.querySelector(`[data-pdf-box="${name}"]`)?.remove();
      const el = document.createElement('span');
      el.setAttribute('data-pdf-box', name);
      Object.assign(el.style, { position: 'absolute', left: `${x0 * scale}px`, top: `${top * scale}px`, width: `${(x1 - x0) * scale}px`, height: `${(bottom - top) * scale}px` });
      sheet.appendChild(el);
    },
    { top, bottom, name, x0, x1 },
  );
  return overlay.locator(`[data-pdf-box="${name}"]`);
}

/**
 * ตีกรอบแดงบน PDF แบบไม่มีป้าย (ข้อความบน PDF แน่น ป้ายหาที่ว่างไม่ได้แล้วทับบรรทัดข้างเคียง — R59) ·
 * ความหมายของกรอบเขียนต่อท้ายหัวของภาพ PDF: "กรอบแดง = Expected: a · b"
 */
export async function markPdf(overlay: Locator, items: [Locator | undefined, string][]) {
  const found = items.filter((i): i is [Locator, string] => !!i[0]);
  if (!found.length) return;
  await overlay.evaluate((el, text) => {
    const head = el.firstElementChild as HTMLElement;
    // หัวภาพตรึงด้านบน (showDs เลื่อน PDF ลงไปที่บรรทัดเป้าหมาย — หัวต้องยังเห็นคำอธิบายกรอบ)
    Object.assign(head.style, { position: 'sticky', top: '-8px', background: '#fff', zIndex: '3', paddingBottom: '4px', borderBottom: '1px solid #ddd' });
    head.querySelector('[data-pdf-legend]')?.remove();
    const legend = document.createElement('div');
    legend.setAttribute('data-pdf-legend', '');
    legend.textContent = `กรอบแดง = Expected: ${text}`;
    Object.assign(legend.style, { color: '#cf1322', font: '600 14px sans-serif', marginTop: '2px' });
    head.appendChild(legend);
  }, found.map((f) => f[1]).join(' · '));
  await markEvidence(...found.map((f) => f[0]));
}

/** สีพื้นของ canvas ที่จุด (point ของหน้า) บน PDF ที่ showDs() วาด → [r, g, b] */
export async function dsPixel(overlay: Locator, x: number, y: number): Promise<[number, number, number]> {
  return overlay.locator('[data-pdf-page]').evaluate(
    (sheet, { x, y }) => {
      const scale = Number((sheet as HTMLElement).dataset.scale);
      const canvas = sheet.querySelector('canvas') as HTMLCanvasElement;
      const k = canvas.width / (sheet as HTMLElement).clientWidth;
      const d = canvas.getContext('2d')!.getImageData(Math.round(x * scale * k), Math.round(y * scale * k), 1, 1).data;
      return [d[0], d[1], d[2]] as [number, number, number];
    },
    { x, y },
  );
}
