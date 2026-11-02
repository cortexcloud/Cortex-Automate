import path from 'node:path';
import { pathToFileURL } from 'node:url';

// อ่าน Barcode + ตำแหน่งข้อความจาก PDF ที่แอปสร้าง (การ์ด SBH-2785 บัตรคิว ER เพิ่ม Barcode HN · dev-x 31 ต.ค. 2026)
// Barcode ในบัตรคิวเป็นแท่ง vector (path สี่เหลี่ยม) ใน form XObject ไม่ใช่ภาพ → ถอดรหัส Code 128 จากความกว้างแท่งได้ตรงๆ
//   แทนการสแกนด้วยเครื่อง (ผู้ใช้เลือก 31 ต.ค. 2026 "ถอดรหัสจาก PDF") · ผลยืนยันด้วย checksum mod 103 + แท่ง Stop ของ Code 128
// ตำแหน่งทั้งหมดเป็นหน่วย point ของหน้า (scale 1) มุมซ้ายบน y ลง — ใช้กับ pdfBox() ใน print-capture.ts ได้ตรงๆ

export interface PdfBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfBarcode {
  /** ข้อความที่ถอดได้ */
  text: string;
  symbology: 'Code 128';
  /** ชุดอักขระตอนเริ่ม (A / B / C) */
  startSet: string;
  /** ค่าของแต่ละ symbol ระหว่าง Start กับ checksum */
  values: number[];
  checksumOk: boolean;
  stopOk: boolean;
  /** symbol ที่ไม่ตรงตาราง Code 128 (ควรเป็น false) */
  unknownSymbol: boolean;
  bars: number;
  /** ความกว้าง 1 module (point) */
  module: number;
  box: PdfBox;
}

export interface PdfTextLine {
  text: string;
  box: PdfBox;
}

export interface PdfLayout {
  pages: number;
  width: number;
  height: number;
  barcodes: PdfBarcode[];
  /** บรรทัดข้อความ เรียงบน → ล่าง */
  lines: PdfTextLine[];
}

// ตาราง Code 128 ค่า 0–105 (ความกว้าง แท่ง / ช่อง / แท่ง / ช่อง / แท่ง / ช่อง เป็น module) · Stop = 2331112
const CODE128 = (
  '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
  '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
  '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
  '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
  '114131 311141 411131 211412 211214 211232'
).split(' ');
const STOP = '2331112';

/** ถอดรหัส Code 128 จากช่วง x ของแท่ง (เรียงซ้าย → ขวา) */
export function decodeCode128(bars: [number, number][]): Omit<PdfBarcode, 'box' | 'symbology'> {
  const widths: number[] = [];
  bars.forEach(([a, b], i) => {
    if (i > 0) widths.push(a - bars[i - 1][1]);
    widths.push(b - a);
  });
  const symbols = (widths.length - 7) / 6;
  const module = (bars.at(-1)![1] - bars[0][0]) / (symbols * 11 + 13);
  const mods = widths.map((w) => Math.round(w / module));
  const all: number[] = [];
  for (let i = 0; i + 6 <= widths.length - 7; i += 6) all.push(CODE128.indexOf(mods.slice(i, i + 6).join('')));
  const [start, ...rest] = all;
  const check = rest.pop()!;
  const sum = (start + rest.reduce((s, v, i) => s + v * (i + 1), 0)) % 103;
  const startSet = ({ 103: 'A', 104: 'B', 105: 'C' } as Record<number, string>)[start] ?? '?';
  let set = startSet;
  let text = '';
  for (const v of rest) {
    if (set === 'C') {
      if (v < 100) text += String(v).padStart(2, '0');
      else set = v === 100 ? 'B' : 'A';
    } else if (set === 'B') {
      if (v < 96) text += String.fromCharCode(v + 32);
      else if (v === 99) set = 'C';
      else if (v === 101) set = 'A';
    } else {
      if (v < 64) text += String.fromCharCode(v + 32);
      else if (v < 96) text += String.fromCharCode(v - 64);
      else if (v === 99) set = 'C';
      else if (v === 100) set = 'B';
    }
  }
  return {
    text,
    startSet,
    values: rest,
    checksumOk: Number.isInteger(symbols) && check === sum,
    stopOk: mods.slice(-7).join('') === STOP,
    unknownSymbol: all.includes(-1),
    bars: bars.length,
    module,
  };
}

let pdfjsNode: Promise<any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
// โฟลเดอร์โปรเจกต์: ใน Playwright ไฟล์ถูกแปลงเป็น CommonJS (มี __dirname) · รันด้วย node ตรงๆ (ESM) ใช้โฟลเดอร์ที่รัน
const projectRoot = () => (typeof __dirname === 'undefined' ? process.cwd() : path.join(__dirname, '..', '..'));
const loadPdfjs = () => (pdfjsNode ??= import(pathToFileURL(path.join(projectRoot(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href));

/** คูณ matrix แบบ PDF [a b c d e f] (m1 × m2 — แบบเดียวกับ canvas.transform) · pdfjs 6 เปลี่ยน Util.applyTransform เป็นแก้ค่าในที่ จึงคิดเอง */
const mul = (m1: ArrayLike<number>, m2: ArrayLike<number>): number[] => [
  m1[0] * m2[0] + m1[2] * m2[1],
  m1[1] * m2[0] + m1[3] * m2[1],
  m1[0] * m2[2] + m1[2] * m2[3],
  m1[1] * m2[2] + m1[3] * m2[3],
  m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
  m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
];
const apply = ([x, y]: number[], m: ArrayLike<number>) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];

/** โครงหน้า `pageNo` ของ PDF: จำนวนหน้า · ขนาด · Barcode (ถอดรหัสแล้ว) · บรรทัดข้อความพร้อมตำแหน่ง */
export async function readPdfLayout(pdf: Buffer, pageNo = 1): Promise<PdfLayout> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), disableFontFace: true }).promise;
  const page = await doc.getPage(pageNo);
  const vp = page.getViewport({ scale: 1 });
  const { OPS } = pdfjs;

  // ---- path สี่เหลี่ยมทั้งหมด (แปลงเป็นพิกัดหน้า) ----
  const names: Record<number, string> = Object.fromEntries(Object.entries(OPS as Record<string, number>).map(([k, v]) => [v, k]));
  const ops = await page.getOperatorList();
  let ctm: number[] = Array.from(vp.transform as ArrayLike<number>);
  const stack: number[][] = [];
  const rects: PdfBox[] = [];
  ops.fnArray.forEach((fn: number, i: number) => {
    const args = ops.argsArray[i];
    switch (names[fn]) {
      case 'save':
        stack.push(ctm);
        break;
      case 'restore':
        ctm = stack.pop() ?? ctm;
        break;
      case 'transform':
        ctm = mul(ctm, Array.from(args as ArrayLike<number>));
        break;
      case 'paintFormXObjectBegin':
        stack.push(ctm);
        if (args?.[0]) ctm = mul(ctm, Array.from(args[0] as ArrayLike<number>));
        break;
      case 'paintFormXObjectEnd':
        ctm = stack.pop() ?? ctm;
        break;
      case 'constructPath': {
        const mm = args?.[2];
        if (!mm) break;
        const [x0, y0] = apply([mm[0], mm[1]], ctm);
        const [x1, y1] = apply([mm[2], mm[3]], ctm);
        rects.push({ x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) });
        break;
      }
    }
  });

  // ---- แท่ง Barcode: สูงกว่ากว้างมาก แถวเดียวกัน (y / ความสูงเท่ากัน) ----
  const bars = rects.filter((r) => r.height > 15 && r.width > 0.2 && r.height / r.width > 3);
  const groups = new Map<string, PdfBox[]>();
  for (const bar of bars) {
    const key = `${Math.round(bar.y)}:${Math.round(bar.height)}`;
    groups.set(key, [...(groups.get(key) ?? []), bar]);
  }
  const barcodes: PdfBarcode[] = [];
  for (const group of groups.values()) {
    if (group.length < 10) continue; // เส้นตั้งของกรอบอื่น (เช่น กรอบเลขคิว)
    group.sort((a, b) => a.x - b.x);
    const decoded = decodeCode128(group.map((b) => [b.x, b.x + b.width]));
    const x = group[0].x;
    const right = group.at(-1)!.x + group.at(-1)!.width;
    barcodes.push({ ...decoded, symbology: 'Code 128', box: { x, y: group[0].y, width: right - x, height: group[0].height } });
  }

  // ---- บรรทัดข้อความ (รวมชิ้นบนเส้นฐานเดียวกันที่อยู่ติดกัน — แบบเดียวกับ showPdf) ----
  const content = await page.getTextContent();
  const pieces: { text: string; size: number; x: number; base: number; width: number }[] = [];
  for (const item of content.items as { str?: string; transform: number[]; width: number }[]) {
    if (!item.str?.trim()) continue;
    const tx = mul(vp.transform, item.transform);
    pieces.push({ text: item.str, size: Math.hypot(tx[2], tx[3]), x: tx[4], base: tx[5], width: item.width });
  }
  pieces.sort((a, b) => a.base - b.base || a.x - b.x);
  const merged: typeof pieces = [];
  for (const p of pieces) {
    const last = merged.at(-1);
    if (last && Math.abs(last.base - p.base) < 1 && p.x - (last.x + last.width) < last.size * 1.5) {
      last.text += ` ${p.text}`;
      last.width = p.x + p.width - last.x;
      continue;
    }
    merged.push({ ...p });
  }
  const lines = merged.map((l) => ({
    text: l.text.replace(/\s+/g, ' ').trim(),
    box: { x: l.x, y: l.base - l.size * 0.85, width: l.width, height: l.size * 1.15 },
  }));

  return { pages: doc.numPages, width: vp.width, height: vp.height, barcodes, lines };
}

/** กล่อง 2 กล่องซ้อนทับกันไหม */
export const overlaps = (a: PdfBox, b: PdfBox) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
