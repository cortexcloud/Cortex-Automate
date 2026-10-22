import { expect, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { expectOk, type ErVisit } from './er';

// ป้ายปลายเตียงของ ER (ปุ่ม `พิมพ์ป้ายปลายเตียง` ในแท็บ Triage ของหน้าผู้ป่วย) — การ์ด SBH-1025 / SBH-2471
// แอปขอ PDF จาก `POST /cortex-api/er/encounters/<EN>/bedside-name-badge/pdf` แล้วส่งให้ print agent ในเครื่อง (localhost:8081)
// เครื่องที่ไม่มี print agent ขึ้นแจ้งเตือน "ไม่สามารถพิมพ์ป้ายผู้ป่วยได้" — ไม่ถือว่า fail ตรวจจาก PDF แทน (R18)
// PDF: JasperReports 1 หน้า 421 × 595 pt หมุน 90° = A5 แนวนอน 210 × 148.5 มม. (ครึ่ง A4) — ตรวจ 7 ต.ค. 2026

/** 1 บรรทัดข้อความบนป้าย — ตำแหน่งเป็น pt นับจากมุมซ้ายบนของหน้าที่หมุนตั้งตรงแล้ว */
export interface BadgeLine {
  /** ลำดับใน lines ของป้าย (ใช้กับ badgeLine() ตอนตีกรอบ) */
  index: number;
  text: string;
  /** ขนาดตัวอักษร (pt) */
  size: number;
  x: number;
  /** ขอบบนของกล่องข้อความโดยประมาณ: เหนือเส้นฐาน 0.75 เท่าของขนาดตัวอักษร · กล่องสูงเท่าขนาดตัวอักษร (เผื่อสระล่าง 0.25 เท่า) */
  y: number;
  width: number;
  height: number;
  /** เส้นฐานของบรรทัด — ป้ายชื่อช่องกับค่าของแถวเดียวกันมีเส้นฐานใกล้กัน */
  baseline: number;
}

export interface BadgePdf {
  /** ขนาดหน้าที่หมุนตั้งตรงแล้ว (pt) */
  widthPt: number;
  heightPt: number;
  widthMm: number;
  heightMm: number;
  lines: BadgeLine[];
}

/** ช่องบนป้ายที่อ่านได้ — ไม่มีบรรทัดนั้น = undefined */
export interface BadgeFields {
  title?: BadgeLine;
  name?: BadgeLine;
  age?: BadgeLine;
  hnLabel?: BadgeLine;
  hn?: BadgeLine;
  enLabel?: BadgeLine;
  en?: BadgeLine;
  arrivalLabel?: BadgeLine;
  arrival?: BadgeLine;
}

export const BADGE_TITLE = 'ป้ายชื่อผู้ป่วยห้องฉุกเฉิน';
export const BADGE_PDF_PATH = (en: string) => `/cortex-api/er/encounters/${en}/bedside-name-badge/pdf`;
/** แจ้งเตือนเมื่อเครื่องไม่มี print agent (R18 — ไม่ถือว่า fail) */
export const NO_PRINT_AGENT_TEXT = 'ไม่สามารถพิมพ์ป้ายชื่อผู้ป่วยได้';

const PDFJS_DIR = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build');
const PDFJS_ROUTE = '/__pdfjs__/';
const routed = new WeakSet<Page>();

export function printBadgeButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'พิมพ์ป้ายปลายเตียง' }).first();
}

/** กดปุ่ม `พิมพ์ป้ายปลายเตียง` → คืน PDF ที่ระบบสร้าง (ตัวเดียวกับที่แอปส่งให้เครื่องพิมพ์) */
export async function printBedsideBadge(page: Page, visit: ErVisit): Promise<Buffer> {
  const requested = page.waitForResponse((res) => res.request().method() === 'POST' && new URL(res.url()).pathname === BADGE_PDF_PATH(visit.en), { timeout: 60_000 });
  requested.catch(() => undefined);
  await printBadgeButton(page).click();
  const res = await requested;
  await expectOk(res, `ขอ PDF ป้ายปลายเตียงของ ${visit.en}`);
  expect(res.headers()['content-type'], 'ป้ายปลายเตียงต้องเป็นไฟล์ PDF').toContain('application/pdf');
  return res.body();
}

/** โหลด pdf.js (pdfjs-dist ในเครื่อง) เข้าหน้าปัจจุบัน — ใช้อ่านข้อความและวาดหน้า PDF ลง canvas */
async function loadPdfJs(page: Page) {
  if (!routed.has(page)) {
    routed.add(page);
    await page.route(`**${PDFJS_ROUTE}*`, async (route) => {
      const name = path.basename(new URL(route.request().url()).pathname);
      if (name === 'loader.mjs') {
        // pdf.js ทำงานบน thread หลัก (ไม่เปิด worker แยก) — เอกสารหน้าเดียว ไม่ต้องใช้
        const body = `import * as pdfjs from '${PDFJS_ROUTE}pdf.min.mjs'; import * as worker from '${PDFJS_ROUTE}pdf.worker.min.mjs'; globalThis.pdfjsWorker = worker; globalThis.__pdfjs = pdfjs;`;
        return route.fulfill({ body, contentType: 'text/javascript' });
      }
      const file = path.join(PDFJS_DIR, name);
      if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: `ไม่พบ ${name} ใน pdfjs-dist/build` });
      return route.fulfill({ path: file, contentType: 'text/javascript' });
    });
  }
  if (await page.evaluate(() => '__pdfjs' in globalThis)) return;
  await page.addScriptTag({ url: `${PDFJS_ROUTE}loader.mjs`, type: 'module' });
  await page.waitForFunction(() => '__pdfjs' in globalThis, undefined, { timeout: 30_000 });
}

/**
 * แสดงป้ายปลายเตียง (PDF) ซ้อนครึ่งซ้ายของหน้าเดิม ให้ภาพหลักฐานและคลิปเห็นป้าย — ไฟล์ PDF ไม่ได้เปิดบนจอ (เครื่องทดสอบไม่มี print agent)
 * คืนขนาดหน้า + ข้อความทุกบรรทัดพร้อมตำแหน่งและขนาดตัวอักษร · แต่ละบรรทัดมีกรอบโปร่งใสไว้ตีกรอบแดงด้วย badgeLine()
 * หัวของกล่องบอกชัดว่าเป็นภาพที่สคริปต์ทดสอบเปิด ไม่ใช่หน้าจอของระบบ · ลบด้วย hideBadge()
 */
export async function showBadge(page: Page, pdf: Buffer, caption: string): Promise<{ overlay: Locator; badge: BadgePdf }> {
  await loadPdfJs(page);
  const badge = await page.evaluate(
    async ({ base64, caption }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjs = (globalThis as any).__pdfjs;
      const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const doc = await pdfjs.getDocument({ data, disableFontFace: true, useSystemFonts: false }).promise;
      const pdfPage = await doc.getPage(1);
      const flat = pdfPage.getViewport({ scale: 1 });
      const MM = 25.4 / 72;

      // ข้อความ: แปลงตำแหน่งเป็นพิกัดของหน้าที่หมุนตั้งตรงแล้ว (pt) แล้วรวมชิ้นที่ต่อกันบนเส้นฐานเดียวกันเป็นบรรทัดเดียว
      const content = await pdfPage.getTextContent();
      const pieces: { text: string; size: number; x: number; baseline: number; width: number }[] = [];
      for (const item of content.items as { str?: string; transform: number[]; width: number }[]) {
        if (!item.str?.trim()) continue;
        const tx = pdfjs.Util.transform(flat.transform, item.transform) as number[];
        pieces.push({ text: item.str, size: Math.hypot(tx[2], tx[3]), x: tx[4], baseline: tx[5], width: item.width });
      }
      pieces.sort((a, b) => a.baseline - b.baseline || a.x - b.x);
      const lines: { index: number; text: string; size: number; x: number; y: number; width: number; height: number; baseline: number }[] = [];
      for (const piece of pieces) {
        const last = lines[lines.length - 1];
        const gap = last ? piece.x - (last.x + last.width) : Infinity;
        if (last && Math.abs(last.baseline - piece.baseline) < 1 && Math.abs(last.size - piece.size) < 0.5 && gap > -1 && gap < last.size * 0.6) {
          last.text += piece.text;
          last.width = piece.x + piece.width - last.x;
          continue;
        }
        lines.push({ index: lines.length, text: piece.text, size: piece.size, x: piece.x, y: piece.baseline - piece.size * 0.75, width: piece.width, height: piece.size, baseline: piece.baseline });
      }
      for (const line of lines) line.text = line.text.replace(/\s+/g, ' ').trim();

      // วาดหน้า PDF ลง canvas ครึ่งซ้ายของจอ
      const scale = Math.min((window.innerWidth / 2 - 60) / flat.width, (window.innerHeight - 190) / flat.height);
      const viewport = pdfPage.getViewport({ scale });
      document.querySelector('[data-badge-overlay]')?.remove();
      const overlay = document.createElement('div');
      overlay.setAttribute('data-badge-overlay', '');
      Object.assign(overlay.style, {
        position: 'fixed',
        left: '12px',
        top: '84px',
        background: '#fff',
        border: '2px solid #1f6f43',
        borderRadius: '6px',
        boxShadow: '0 4px 16px rgba(0,0,0,.25)',
        zIndex: '2147483000',
        padding: '10px 12px',
        font: '13px/1.35 sans-serif',
        color: '#000',
      });
      const head = document.createElement('div');
      head.setAttribute('data-badge-title', '');
      head.textContent = caption;
      Object.assign(head.style, { font: '600 15px sans-serif', color: '#1f6f43' });
      const sub = document.createElement('div');
      sub.setAttribute('data-badge-size', '');
      sub.textContent = `ไฟล์ PDF ที่ระบบส่งให้เครื่องพิมพ์ — สคริปต์ทดสอบเปิดซ้อนบนจอ (ไม่ใช่หน้าจอของระบบ) · ขนาดหน้า ${(flat.width * MM).toFixed(1)} × ${(flat.height * MM).toFixed(1)} มม.`;
      Object.assign(sub.style, { display: 'inline-block', color: '#666', fontSize: '12px', marginBottom: '6px' });
      const sheet = document.createElement('div');
      sheet.setAttribute('data-badge-page', '');
      Object.assign(sheet.style, { position: 'relative', width: `${viewport.width}px`, height: `${viewport.height}px`, border: '1px solid #999', background: '#fff' });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width * 2);
      canvas.height = Math.round(viewport.height * 2);
      Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
      sheet.appendChild(canvas);
      for (const line of lines) {
        const box = document.createElement('span');
        box.setAttribute('data-badge-line', String(line.index));
        box.title = line.text;
        Object.assign(box.style, { position: 'absolute', left: `${line.x * scale}px`, top: `${line.y * scale}px`, width: `${line.width * scale}px`, height: `${line.height * scale}px` });
        sheet.appendChild(box);
      }
      const subRow = document.createElement('div');
      subRow.appendChild(sub);
      overlay.append(head, subRow, sheet);
      document.body.appendChild(overlay);
      await pdfPage.render({ canvas, canvasContext: canvas.getContext('2d'), viewport: pdfPage.getViewport({ scale: scale * 2 }) }).promise;
      return { widthPt: flat.width, heightPt: flat.height, widthMm: flat.width * MM, heightMm: flat.height * MM, lines };
    },
    { base64: pdf.toString('base64'), caption },
  );
  const overlay = page.locator('[data-badge-overlay]');
  await expect(overlay).toBeVisible();
  return { overlay, badge };
}

/** กรอบของบรรทัดบนป้ายที่ showBadge() แสดง (ไว้ตีกรอบแดง) */
export function badgeLine(overlay: Locator, line: BadgeLine): Locator {
  return overlay.locator(`[data-badge-line="${line.index}"]`);
}

/** หน้ากระดาษของป้ายที่ showBadge() แสดง */
export function badgePage(overlay: Locator): Locator {
  return overlay.locator('[data-badge-page]');
}

export async function hideBadge(page: Page) {
  await page.evaluate(() => document.querySelector('[data-badge-overlay]')?.remove()).catch(() => undefined);
}

/** ค่าของแถวที่มีป้ายชื่อช่องนี้ (เช่น HN / EN) = บรรทัดบนเส้นฐานเดียวกันที่อยู่ถัดไปทางขวา */
function rowValue(lines: BadgeLine[], label: BadgeLine | undefined): BadgeLine | undefined {
  if (!label) return undefined;
  return lines
    .filter((line) => line !== label && line.x > label.x && Math.abs(line.baseline - label.baseline) < Math.max(line.size, label.size) * 0.6)
    .sort((a, b) => a.x - b.x)[0];
}

/** แยกช่องบนป้าย: หัวป้าย · ชื่อผู้ป่วย · อายุ · แถว HN · แถว EN · วันเวลารับเข้า */
export function readBadge(badge: BadgePdf): BadgeFields {
  const { lines } = badge;
  const exact = (text: string) => lines.find((line) => line.text === text);
  const title = exact(BADGE_TITLE);
  const age = lines.find((line) => /^อายุ/.test(line.text));
  const hnLabel = exact('HN');
  const enLabel = exact('EN');
  const arrivalLabel = exact('วันเวลารับเข้า');
  const hn = rowValue(lines, hnLabel);
  const en = rowValue(lines, enLabel);
  const arrival = rowValue(lines, arrivalLabel);
  // ชื่อผู้ป่วย = บรรทัดบนสุดที่ไม่ใช่ช่องอื่น (อยู่ใต้หัวป้าย)
  const known = new Set([title, age, hnLabel, hn, enLabel, en, arrivalLabel, arrival]);
  const name = lines.filter((line) => !known.has(line)).sort((a, b) => a.baseline - b.baseline)[0];
  return { title, name, age, hnLabel, hn, enLabel, en, arrivalLabel, arrival };
}

/** บรรทัดอยู่ในพื้นที่หน้ากระดาษทั้งบรรทัดไหม */
export function insidePage(badge: BadgePdf, line: BadgeLine): boolean {
  return line.x >= 0 && line.y >= 0 && line.x + line.width <= badge.widthPt && line.y + line.height <= badge.heightPt;
}

/** กล่องข้อความ 2 บรรทัดซ้อนทับกันไหม (เผื่อระยะ 1 pt) */
export function overlaps(a: BadgeLine, b: BadgeLine): boolean {
  return a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;
}

export interface Age {
  years: number;
  months: number;
  days: number;
}

/** อายุ ปี / เดือน / วัน จากวันเกิดถึงวันที่ระบุ (ทั้งคู่ YYYY-MM-DD) — วันไม่พอให้ยืมจากเดือนก่อนหน้าของวันที่ระบุ */
export function ageOn(birth: string, on: string): Age {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [oy, om, od] = on.split('-').map(Number);
  let [years, months, days] = [oy - by, om - bm, od - bd];
  if (days < 0) {
    months -= 1;
    days += new Date(Date.UTC(oy, om - 1, 0)).getUTCDate(); // จำนวนวันของเดือนก่อนหน้า
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/** อ่านอายุจากข้อความแบบ "36 ปี 8 เดือน 22 วัน" (ส่วนที่ไม่แสดงถือเป็น 0) — ไม่ใช่รูปแบบนี้ = undefined */
export function parseThaiAge(text: string): Age | undefined {
  const match = /(?:(\d+)\s*ปี)?\s*(?:(\d+)\s*เดือน)?\s*(?:(\d+)\s*วัน)?/.exec(text.replace(/^อายุ\s*/, '').trim());
  if (!match || match.slice(1).every((part) => part === undefined)) return undefined;
  return { years: Number(match[1] ?? 0), months: Number(match[2] ?? 0), days: Number(match[3] ?? 0) };
}

export function formatThaiAge(age: Age): string {
  return `${age.years} ปี ${age.months} เดือน ${age.days} วัน`;
}

/** วันเวลาแบบที่ป้ายแสดง: DD/MM/พ.ศ. HH:mm ตามเวลาไทย (ป้ายจริงมี "," คั่นวันที่กับเวลา — ตัดออกก่อนเทียบ) */
export function badgeDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${Number(part('year')) + 543} ${part('hour')}:${part('minute')}`;
}

/** วันที่ไทย YYYY-MM-DD ของเวลา ISO */
export function bangkokDate(iso: string | Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date(iso));
}
