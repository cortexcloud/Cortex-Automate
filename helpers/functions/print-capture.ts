import { expect, type Browser, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { cacheAppAssets } from '../../mock-data/fixtures';
import { getCredentials } from '../../utils/env';
import { loadPdfJs } from './er-badge';
import { test, trackVideo } from './fixtures';

// เอกสารที่แอปส่งให้ print agent ในเครื่อง (`PRINTER_PROXY_URL` = http://localhost:8081 → POST /print/laser?size=A4… body = PDF)
// เครื่องทดสอบไม่มี print agent → ดักคำสั่งพิมพ์ใน browser ของเทส (page.route) เก็บ PDF ไว้ตรวจ แล้วตอบ 200 แทน (R18 — ตรวจจาก PDF ไม่ใช่กระดาษ)
// การ์ด SBH-1732 (พิมพ์ใบ Refill ยา) · ตรวจ 20 ต.ค. 2026

export const PRINT_PROXY = 'http://localhost:8081';

export interface PrintJob {
  url: string;
  pdf: Buffer;
  at: number;
}

/** เริ่มดักคำสั่งพิมพ์ของหน้านี้ — คืนรายการงานพิมพ์ (เพิ่มเองเมื่อแอปสั่งพิมพ์) + ตัวรองานถัดไป */
export async function capturePrintJobs(page: Page) {
  const jobs: PrintJob[] = [];
  await page.route(`${PRINT_PROXY}/**`, async (route) => {
    const body = route.request().postDataBuffer();
    if (route.request().method() === 'POST' && body?.length) jobs.push({ url: route.request().url(), pdf: body, at: Date.now() });
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  /** รองานพิมพ์ใหม่หลังจากมีอยู่ `before` งาน — ไม่มาในเวลา = undefined */
  const next = async (before: number, timeout = 30_000): Promise<PrintJob | undefined> => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (jobs.length > before) return jobs[jobs.length - 1];
      await page.waitForTimeout(250);
    }
    return undefined;
  };
  return { jobs, next };
}

// ---------- จับเอกสารจาก response ของ API Generate (ผู้ใช้สอน 29 ต.ค. 2026) ----------
// "เคสพิมพ์บัตรคิวหรือเอกสารให้จับจาก API Generate แล้ว Copy Response ไปวางในลิงค์จะได้ไฟล์คิวมา"
// ตรวจบน SBH Dev 29 ต.ค. 2026: แอปขอไฟล์จาก API ก่อน แล้วค่อยส่งต่อให้ print agent — response = ไฟล์จริง
//   POST /cortex-api/queues/print            {queueFifoIds}  → zip "queue.zip" ข้างในเป็น queue-1.pdf (บัตรคิวการเงิน / ห้องยา ตอนจำหน่าย)
//   POST /cortex-api/queues/print-slips      {queueExamIds}  → zip "queue_slips.zip" → queue_slip_1.pdf (บัตรคิวห้องตรวจ ตอนเช็คอิน)
//   POST /cortex-api/encounters/navigation-slips/print {ens} → zip "navigation_slips.zip" → navigation_slip-1.pdf (ใบนำทาง)
//   POST /cortex-api/receipts/<เลข>/physical-print          → text/plain คำสั่งเครื่องพิมพ์ dot-matrix (ESC/P) ไม่ใช่ PDF
//   POST /cortex-api/documents/generate      (บัตรนัด default_appointment_slip) → SBH Dev / Prod 404 ReportNotFound
//   POST …/pdf (เช่น ป้ายปลายเตียง R18)                      → application/pdf ตรงๆ

/** API ที่สร้างไฟล์เอกสาร / บัตรคิว (POST) */
export const DOCUMENT_API = /\/cortex-api\/(queues\/print(-slips)?|encounters\/navigation-slips\/print|documents\/generate|reports\/generate|receipts\/[^/]+\/physical-print|.+\/pdf)$/;

export interface GeneratedDoc {
  /** path ของ API เช่น /cortex-api/queues/print */
  api: string;
  status: number;
  /** body ที่แอปส่งไป (JSON) เช่น {queueFifoIds:[4934]} */
  request: string;
  /** ไฟล์ใน response — zip แตกเป็นไฟล์ข้างใน · PDF / ข้อความ = 1 ไฟล์ · error = ว่าง */
  files: { name: string; data: Buffer }[];
  /** response ไม่ใช่ 2xx: "404 {...}" */
  error?: string;
  at: number;
}

/** แตกไฟล์ zip (stored / deflate) ด้วย zlib ของ Node — ไม่ต้องลง package เพิ่ม */
export function unzipFiles(zip: Buffer): { name: string; data: Buffer }[] {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('response ไม่ใช่ไฟล์ zip');
  const files: { name: string; data: Buffer }[] = [];
  let p = zip.readUInt32LE(eocd + 16);
  for (let i = 0, count = zip.readUInt16LE(eocd + 10); i < count; i++) {
    const method = zip.readUInt16LE(p + 10);
    const size = zip.readUInt32LE(p + 20);
    const [nameLen, extraLen, commentLen] = [zip.readUInt16LE(p + 28), zip.readUInt16LE(p + 30), zip.readUInt16LE(p + 32)];
    const local = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const raw = zip.subarray(start, start + size);
    files.push({ name, data: method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/**
 * เริ่มเก็บเอกสารที่ API Generate ตอบกลับของหน้านี้ (บัตรคิว / ใบนำทาง / ใบเสร็จ / PDF) — ใช้คู่หรือแทน capturePrintJobs ได้
 * ไฟล์ที่ได้บันทึกลงโฟลเดอร์ผลของเทส `docs/` ด้วย (เปิดดูเองได้) · อ่านข้อความ PDF ด้วย pdfPages() · แสดงบนจอเป็นหลักฐานด้วย showPdf()
 */
export function captureGeneratedDocs(page: Page) {
  const docs: GeneratedDoc[] = [];
  page.on('response', async (res) => {
    const api = new URL(res.url()).pathname;
    if (res.request().method() !== 'POST' || !DOCUMENT_API.test(api)) return;
    const body = await res.body().catch(() => Buffer.alloc(0));
    const type = res.headers()['content-type'] ?? '';
    const doc: GeneratedDoc = { api, status: res.status(), request: res.request().postData() ?? '', files: [], at: Date.now() };
    if (!res.ok()) doc.error = `${res.status()} ${body.toString('utf8').slice(0, 200)}`;
    else if (/zip/.test(type) || body.subarray(0, 2).toString() === 'PK') doc.files = unzipFiles(body);
    else doc.files = [{ name: /pdf/.test(type) ? 'document.pdf' : 'document.txt', data: body }];
    const dir = test.info().outputPath('docs');
    fs.mkdirSync(dir, { recursive: true });
    // นับต่อจากไฟล์ที่มีในโฟลเดอร์ (หลายหน้าต่างเขียนโฟลเดอร์เดียวกัน เช่น หน้าหลัก + Nurse) กันชื่อซ้ำทับกัน
    for (const file of doc.files) {
      const n = String(fs.readdirSync(dir).length + 1).padStart(2, '0');
      fs.writeFileSync(path.join(dir, `${n} ${file.name}`), file.data);
    }
    docs.push(doc);
  });
  /** รอเอกสารจาก API ที่ตรง `api` ซึ่งมาหลังเวลา `since` (Date.now() ก่อนกดปุ่มพิมพ์) */
  const next = async (api: RegExp, since: number, timeout = 30_000): Promise<GeneratedDoc> => {
    await expect.poll(() => docs.some((d) => api.test(d.api) && d.at >= since), { message: `รอเอกสารจาก ${api.source}`, timeout }).toBe(true);
    return docs.filter((d) => api.test(d.api) && d.at >= since).at(-1)!;
  };
  return { docs, next };
}

let pdfjsNode: Promise<any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
/** ข้อความของแต่ละหน้าใน PDF (อ่านฝั่ง node ด้วย pdfjs-dist — ภาษาไทยตรงตัว) */
export async function pdfPages(pdf: Buffer): Promise<string[]> {
  pdfjsNode ??= import(pathToFileURL(path.join(__dirname, '..', '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href);
  const pdfjs = await pdfjsNode;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), disableFontFace: true }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push((tc.items as { str?: string }[]).map((i) => i.str ?? '').join(' ').replace(/\s+/g, ' ').trim());
  }
  return pages;
}

export interface RefillRound {
  round: number;
  total: number;
  /** วันที่ให้ยาเติม ตามที่พิมพ์ เช่น "6 พ.ย. 2569" */
  date: string;
  /** จำนวนของยาที่ระบุ ("" = ไม่มียานี้ในรอบ) */
  qty: string;
}

/** แยกรอบเติมยาจากข้อความใบ Refill ยา: "ครั้งที่ 1/3 * วันที่ให้ยาเติม: 27 ต.ค. 2569 * … <ชื่อยา> … [5 1 tablet]" */
export function refillRounds(text: string, drug: string): RefillRound[] {
  const parts = text.split(/(?=ครั้งที่ \d+\/\d+)/).filter((s) => /^ครั้งที่ \d+\/\d+/.test(s));
  return parts.map((s) => {
    const [, round, total] = s.match(/^ครั้งที่ (\d+)\/(\d+)/)!;
    const date = s.match(/วันที่ให้ยาเติม:\s*(.+?)\s*\*/)?.[1] ?? '';
    const at = s.indexOf(drug);
    const qty = at >= 0 ? (s.slice(at).match(/\[(\d+)\s/)?.[1] ?? '') : '';
    return { round: Number(round), total: Number(total), date, qty };
  });
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
/** "2569-11-06" (ช่องวันที่ในหน้าต่าง Refill) → "6 พ.ย. 2569" (รูปแบบในใบ Refill) */
export function thaiShortDate(be: string): string {
  const [y, m, d] = be.split('-').map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${y}`;
}

/**
 * วาดหน้า `pageNo` ของ PDF ซ้อนครึ่งขวาของจอ (ภาพหลักฐาน / คลิปเห็นเอกสารที่ถูกส่งไปพิมพ์) — กล่องบอกชัดว่าเป็นภาพที่สคริปต์เปิด
 * แต่ละบรรทัดมีกรอบโปร่งใส `[data-pdf-line]` (title = ข้อความ) ไว้ตีกรอบแดงด้วย pdfLine() · ลบด้วย hidePdf()
 */
export async function showPdf(page: Page, pdf: Buffer, caption: string, pageNo = 1): Promise<Locator> {
  await loadPdfJs(page);
  await page.evaluate(
    async ({ base64, caption, pageNo }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjs = (globalThis as any).__pdfjs;
      const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const doc = await pdfjs.getDocument({ data, disableFontFace: true, useSystemFonts: false }).promise;
      const pdfPage = await doc.getPage(pageNo);
      const flat = pdfPage.getViewport({ scale: 1 });
      // ขยายเต็มความกว้างครึ่งจอ (A4 ทั้งหน้าในความสูงจอตัวเล็กเกินอ่าน) — ส่วนล่างของหน้าที่เกินจอถูกตัด (หัวเอกสาร + รอบเติมยาอยู่ครึ่งบน)
      const scale = (window.innerWidth / 2 - 40) / flat.width;
      const viewport = pdfPage.getViewport({ scale });
      document.querySelector('[data-pdf-overlay]')?.remove();
      const overlay = document.createElement('div');
      overlay.setAttribute('data-pdf-overlay', '');
      Object.assign(overlay.style, {
        position: 'fixed', right: '12px', top: '60px', background: '#fff', border: '2px solid #1f6f43', borderRadius: '6px',
        boxShadow: '0 4px 16px rgba(0,0,0,.25)', zIndex: '2147483000', padding: '8px 10px', font: '13px/1.35 sans-serif', color: '#000',
        maxHeight: `${window.innerHeight - 72}px`, overflow: 'hidden',
      });
      const head = document.createElement('div');
      head.textContent = caption;
      Object.assign(head.style, { font: '600 15px sans-serif', color: '#1f6f43' });
      const sub = document.createElement('div');
      sub.textContent = `PDF ที่แอปส่งให้เครื่องพิมพ์ (หน้า ${pageNo} / ${doc.numPages}) — สคริปต์ทดสอบเปิดซ้อนบนจอ ไม่ใช่หน้าจอของระบบ`;
      Object.assign(sub.style, { color: '#666', fontSize: '12px', marginBottom: '4px' });
      const sheet = document.createElement('div');
      sheet.setAttribute('data-pdf-page', '');
      Object.assign(sheet.style, { position: 'relative', width: `${viewport.width}px`, height: `${viewport.height}px`, border: '1px solid #999' });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width * 2);
      canvas.height = Math.round(viewport.height * 2);
      Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
      sheet.appendChild(canvas);
      // บรรทัดข้อความ: รวมชิ้นบนเส้นฐานเดียวกันที่ต่อกัน
      const content = await pdfPage.getTextContent();
      const pieces: { text: string; size: number; x: number; base: number; width: number }[] = [];
      for (const item of content.items as { str?: string; transform: number[]; width: number }[]) {
        if (!item.str?.trim()) continue;
        const tx = pdfjs.Util.transform(flat.transform, item.transform) as number[];
        pieces.push({ text: item.str, size: Math.hypot(tx[2], tx[3]), x: tx[4], base: tx[5], width: item.width });
      }
      pieces.sort((a, b) => a.base - b.base || a.x - b.x);
      const lines: typeof pieces = [];
      for (const p of pieces) {
        const last = lines[lines.length - 1];
        if (last && Math.abs(last.base - p.base) < 1 && p.x - (last.x + last.width) < last.size * 1.5) {
          last.text += ` ${p.text}`;
          last.width = p.x + p.width - last.x;
          continue;
        }
        lines.push({ ...p });
      }
      lines.forEach((l, i) => {
        const box = document.createElement('span');
        box.setAttribute('data-pdf-line', String(i));
        box.title = l.text.replace(/\s+/g, ' ').trim();
        Object.assign(box.style, { position: 'absolute', left: `${l.x * scale - 2}px`, top: `${(l.base - l.size * 0.85) * scale}px`, width: `${l.width * scale + 4}px`, height: `${l.size * 1.15 * scale}px` });
        sheet.appendChild(box);
      });
      overlay.append(head, sub, sheet);
      document.body.appendChild(overlay);
      await pdfPage.render({ canvas, canvasContext: canvas.getContext('2d'), viewport: pdfPage.getViewport({ scale: scale * 2 }) }).promise;
    },
    { base64: pdf.toString('base64'), caption, pageNo },
  );
  const overlay = page.locator('[data-pdf-overlay]');
  await expect(overlay).toBeVisible();
  return overlay;
}

/** กรอบบรรทัดบนหน้า PDF ที่ showPdf() วาด: บรรทัดที่ nth ที่ข้อความตรง `text` (ไม่เจอ = undefined) */
export async function pdfLineAt(overlay: Locator, text: string | RegExp, nth = 0): Promise<Locator | undefined> {
  const source = typeof text === 'string' ? text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : text.source;
  const idx = await overlay.locator('[data-pdf-line]').evaluateAll(
    (els, { source, nth }) => els.map((e, i) => (new RegExp(source).test((e as HTMLElement).title) ? i : -1)).filter((i) => i >= 0)[nth] ?? -1,
    { source, nth },
  );
  return idx >= 0 ? overlay.locator(`[data-pdf-line="${idx}"]`) : undefined;
}

export async function hidePdf(page: Page) {
  await page.evaluate(() => document.querySelector('[data-pdf-overlay]')?.remove()).catch(() => undefined);
}

/** หน้าต่างแยกของบัญชีอื่น (เช่น Nurse) — ล็อกอินเอง (role นี้ไม่อยู่ใน ROLES_IN_USE ของ setup) + อัดวิดีโอ `video-<role>.webm` */
export async function openRoleWindow(browser: Browser, role: string): Promise<Page> {
  const { username, password } = getCredentials(role);
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1920, height: 1080 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  });
  await cacheAppAssets(context);
  const page = await context.newPage();
  await page.goto('/cortex/apps', { timeout: 180_000 });
  const welcome = page.getByRole('button', { name: 'ลงชื่อเข้าใช้' });
  const user = page.locator('#username');
  await welcome.or(user).first().waitFor({ timeout: 180_000 });
  if (await welcome.isVisible()) await welcome.click();
  await user.fill(username);
  await page.locator('#password').evaluate((el, value) => {
    (el as HTMLInputElement).value = value;
  }, password);
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => url.host === new URL(test.info().project.use.baseURL!).host, { timeout: 60_000 });
  await trackVideo(page, role);
  return page;
}
