import { expect, test, type Locator, type Page, type TestStepInfo } from '@playwright/test';
import fs from 'node:fs';

/** หน้าที่มีกรอบจาก markEvidence() รอลบหลังถ่ายภาพของ checkStep */
const marked = new WeakSet<Page>();
/** จำนวนภาพที่ถ่ายแล้วของแต่ละหน้า — ใช้รู้ว่า step นี้มี checkStep ย่อยถ่ายภาพไปแล้ว */
const shotCount = new WeakMap<Page, number>();
/** error ที่ step ลูกถ่ายภาพไปแล้ว — step แม่ไม่ต้องถ่ายซ้ำ */
const captured = new WeakSet<object>();
/** ลำดับไฟล์ภาพหลักฐานของแต่ละเทส (key = test.info()) */
const fileOrder = new WeakMap<object, number>();

/**
 * test.step ที่แนบภาพหน้าจอเป็นหลักฐานไว้ใต้ step นั้นในรายงาน (R13)
 * - เช็คผ่านครบ → ภาพ "ผ่าน — <ชื่อ step>" ณ จุดที่เช็ค Expected เสร็จ
 * - เกิด Error → ภาพ "Error — <ชื่อ step>" ณ จุดที่พัง แล้วโยน error ต่อ (เทสยัง fail ตามปกติ)
 * ภาพถ่ายเฉพาะส่วนที่อยู่ในจอ → ปิดท้าย body ด้วย markEvidence(<สิ่งที่เช็ค>) ให้ภาพเห็นจุดนั้นพร้อมกรอบแดง
 * step ที่เช็คหลายสถานะต่อกัน (เช่น เลือก → ยกเลิก) ให้แยกเป็น checkStep ย่อยทีละสถานะ ภาพจะได้ตรงกับแต่ละ Expected
 * step ที่มี checkStep ย่อย: ไม่ถ่ายภาพ "ผ่าน" ของตัวเองซ้ำกับภาพย่อย — ยกเว้นเรียก markEvidence() หลัง step ย่อยตัวสุดท้าย
 */
export function checkStep<T>(page: Page, title: string, body: () => Promise<T>): Promise<T> {
  return test.step(title, async (step) => {
    let result: T;
    const shotsBefore = shotCount.get(page) ?? 0;
    try {
      result = await body();
    } catch (error) {
      if (!(error instanceof Object) || !captured.has(error)) await attachScreenshot(page, step, `Error — ${title}`);
      if (error instanceof Object) captured.add(error);
      throw error;
    }
    const hasChildShots = (shotCount.get(page) ?? 0) > shotsBefore;
    if (!hasChildShots || marked.has(page)) await attachScreenshot(page, step, `ผ่าน — ${title}`);
    return result;
  });
}

/** ป้ายบนกรอบแดง (R23): ข้อมูลที่กรอก · ปุ่มที่กด · ข้อความแจ้งเตือนหลังกด · Expected Result */
export type EvidenceLabel = 'กรอก' | 'กด' | 'แจ้งเตือน' | 'Expected';
export type EvidenceMark = { target: Locator; label?: EvidenceLabel };

export const filled = (target: Locator): EvidenceMark => ({ target, label: 'กรอก' });
export const clicked = (target: Locator): EvidenceMark => ({ target, label: 'กด' });
export const alerted = (target: Locator): EvidenceMark => ({ target, label: 'แจ้งเตือน' });
export const expected = (target: Locator): EvidenceMark => ({ target, label: 'Expected' });

/**
 * ชี้จุดในภาพหลักฐาน: ตีกรอบแดงทุกตัว + ป้ายบอกว่าเป็นอะไร (R23 — กรอก / กด / แจ้งเตือน / Expected)
 * ถ้ามีตัวไหนอยู่นอกจอ เลื่อนตัวแรกไว้กลางจอ (พ้นแถบที่ลอยทับขอบล่าง/บนของหน้า) — ตัวที่ยังอยู่นอกจอจะไม่มีกรอบในภาพ
 * กรอบเป็น div ลอยทับตำแหน่งของ element (position: fixed ใน body) — ไม่แก้ style ของแอป ไม่โดนกรอบแม่ที่ overflow ตัดทิ้ง
 * และไม่รับคลิก · ถูกลบเองหลังถ่ายภาพ (จบ checkStep หรือ snapEvidence) · ต้องเรียกใน checkStep
 * ปุ่มที่กดแล้วหายไป (เช่นปุ่มใน modal) → กรอบ "กด" + snapEvidence("ก่อนกด …") ก่อนคลิก
 */
export async function markEvidence(...items: (Locator | EvidenceMark)[]) {
  const marks = items.map((item) => ('target' in item ? item : { target: item }));
  if (!marks.length) return;
  const page = marks[0].target.page();
  const allInView = await Promise.all(marks.map((m) => m.target.first().evaluate(isFullyInViewport)));
  if (!allInView.every(Boolean)) {
    // เลื่อนตัวแรกที่ถูกบัง/อยู่นอกจอไว้กลางจอ — ตัวที่เห็นอยู่แล้วส่วนใหญ่ยังอยู่ในจอ
    const first = marks[allInView.indexOf(false)].target.first();
    await first.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(first).toBeInViewport();
  }
  for (const { target, label } of marks) {
    await target.first().evaluate((el, text) => {
      const full = el.getBoundingClientRect();
      const rect = { left: full.left, top: full.top, right: full.right, bottom: full.bottom, width: full.width, height: full.height };
      // กรอบของ element ในหน้าจอ ห้ามลากทะลุเข้าไปในตารางเทียบค่าที่สคริปต์วาดซ้อน (SBH-1117 16 ต.ค. 2026 ผู้ใช้ทัก "กรอบมันบังข้อมูล")
      // → ตัดกรอบให้หยุดที่ขอบตาราง (เฉพาะ element ที่ไม่ได้อยู่ในตารางเอง)
      const overlay = document.querySelector('[data-compare-overlay]');
      if (overlay && !overlay.contains(el)) {
        const o = overlay.getBoundingClientRect();
        const overlapsY = rect.top < o.bottom && rect.bottom > o.top;
        const overlapsX = rect.left < o.right && rect.right > o.left;
        if (overlapsX && overlapsY) {
          if (rect.left < o.left) rect.right = Math.min(rect.right, o.left - 8);
          else if (rect.right > o.right) rect.left = Math.max(rect.left, o.right + 8);
          else if (rect.top < o.top) rect.bottom = Math.min(rect.bottom, o.top - 8);
          else if (rect.bottom > o.bottom) rect.top = Math.max(rect.top, o.bottom + 8);
          rect.width = Math.max(0, rect.right - rect.left);
          rect.height = Math.max(0, rect.bottom - rect.top);
        }
      }
      // element ที่กว้าง / สูงเกินจอ (เช่นแถวตารางที่เลื่อนแนวนอนได้) → ตัดกรอบที่ขอบจอให้เห็นครบ 4 ด้าน
      rect.left = Math.max(rect.left, 6);
      rect.top = Math.max(rect.top, 6);
      rect.right = Math.min(rect.right, window.innerWidth - 6);
      rect.bottom = Math.min(rect.bottom, window.innerHeight - 6);
      rect.width = Math.max(0, rect.right - rect.left);
      rect.height = Math.max(0, rect.bottom - rect.top);
      const box = document.createElement('div');
      box.setAttribute('data-evidence-mark', '');
      Object.assign(box.style, {
        position: 'fixed',
        left: `${rect.left - 3}px`,
        top: `${rect.top - 3}px`,
        width: `${rect.width + 6}px`,
        height: `${rect.height + 6}px`,
        border: '3px solid #ff4d4f',
        borderRadius: '4px',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex: '2147483647',
      });
      document.body.appendChild(box);
      if (!text) return;
      const tag = document.createElement('div');
      tag.setAttribute('data-evidence-mark', '');
      tag.textContent = text;
      // ป้ายต้องไม่ทับข้อความของหน้าจอ / ตารางเทียบค่า / ป้ายอื่น (ผู้ใช้ทัก 16 ต.ค. 2026) → ลองตำแหน่งรอบกรอบตามลำดับ
      // เหนือขวา → เหนือซ้าย → ใต้ขวา → ใต้ซ้าย → ขวานอกกรอบ → ซ้ายนอกกรอบ · ไม่มีที่ว่างเลยใช้เหนือขวา (แบบเดิม)
      const tagWidth = text.length * 8 + 14;
      const tagHeight = 20;
      const taken = [...document.querySelectorAll('[data-evidence-mark]')].filter((node) => node.textContent).map((node) => node.getBoundingClientRect());
      const covers = (l: number, t: number) => {
        const r = { left: l, top: t, right: l + tagWidth, bottom: t + tagHeight };
        if (r.left < 0 || r.top < 0 || r.right > window.innerWidth || r.bottom > window.innerHeight) return true;
        const hit = (b: { left: number; top: number; right: number; bottom: number }) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
        if (taken.some(hit)) return true;
        const o = document.querySelector('[data-compare-overlay]')?.getBoundingClientRect();
        if (o && !document.querySelector('[data-compare-overlay]')?.contains(el) && hit(o)) return true;
        // ข้อความของหน้าจอใต้ป้าย (เว้นระยะ 4px ไม่ให้ป้ายชิดขอบตัวอักษร): ไล่ text node ของ element ใต้จุดกระจายทั่วป้าย + ตัวแม่ 2 ชั้น
        const pad = { left: r.left - 4, top: r.top - 4, right: r.right + 4, bottom: r.bottom + 4 };
        const near = (b: DOMRect) => pad.left < b.right && pad.right > b.left && pad.top < b.bottom && pad.bottom > b.top;
        // ช่องกรอก / select: เว้นแค่ 1px (เว้น 4px แล้วตำแหน่งข้างตัวเลือกของ dropdown ถูกตัดทิ้งหมด ป้ายไปตกที่ตำแหน่งสำรองซึ่งทับไอคอนในช่อง)
        const touches = (b: DOMRect) => r.left - 1 < b.right && r.right + 1 > b.left && r.top - 1 < b.bottom && r.bottom + 1 > b.top;
        const xs = [pad.left, (pad.left + pad.right) / 2, pad.right];
        const ys = [pad.top, (pad.top + pad.bottom) / 2, pad.bottom];
        const seen = new Set<Element>();
        for (const x of xs)
          for (const y of ys) {
            let under = document.elementFromPoint(Math.min(Math.max(x, 0), window.innerWidth - 1), Math.min(Math.max(y, 0), window.innerHeight - 1));
            for (let depth = 0; under && depth < 3; depth++, under = under.parentElement) {
              if (seen.has(under)) continue;
              seen.add(under);
              // ค่าที่พิมพ์ในช่องกรอกไม่ใช่ text node — นับทั้งช่องเป็นข้อความ (ป้าย "กด" เคยทับคำค้นในช่องค้นหา)
              const fields = [under, ...under.querySelectorAll('input, textarea')].filter(
                (node): node is HTMLInputElement | HTMLTextAreaElement => (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) && !!(node.value || node.placeholder),
              );
              if (fields.some((field) => !el.contains(field) && !field.contains(el) && touches(field.getBoundingClientRect()))) return true;
              // ช่องกรอก / select ของ Ant Design ทั้งกล่อง (มีคำค้น ไอคอนล้างค่า ลูกศร) — ห้ามวางป้ายทับ
              const control = under.closest('.ant-select, .ant-input-affix-wrapper, .ant-picker, input, textarea');
              if (control && !el.contains(control) && !control.contains(el) && touches(control.getBoundingClientRect())) return true;
              const walker = document.createTreeWalker(under, NodeFilter.SHOW_TEXT);
              for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                if (!node.textContent?.trim() || node.parentElement?.closest('[data-evidence-mark]') || el.contains(node)) continue;
                const range = document.createRange();
                range.selectNodeContents(node);
                if ([...range.getClientRects()].some(near)) return true;
              }
            }
          }
        return false;
      };
      const candidates: [number, number][] = [
        [rect.right + 3 - tagWidth, rect.top - 3 - tagHeight],
        [rect.left - 3, rect.top - 3 - tagHeight],
        [rect.right + 3 - tagWidth, rect.bottom + 3],
        [rect.left - 3, rect.bottom + 3],
        [rect.right + 6, rect.top - 3],
        [rect.left - 6 - tagWidth, rect.top - 3],
      ];
      const [tagLeft, tagTop] = candidates.find(([l, t]) => !covers(l, t)) ?? [Math.max(0, rect.right + 3 - tagWidth), Math.max(0, rect.top - 3 - tagHeight)];
      Object.assign(tag.style, {
        position: 'fixed',
        left: `${tagLeft}px`,
        top: `${tagTop}px`,
        padding: '1px 6px',
        background: '#ff4d4f',
        color: '#fff',
        font: '600 12px/18px sans-serif',
        borderRadius: '3px',
        pointerEvents: 'none',
        zIndex: '2147483647',
        whiteSpace: 'nowrap',
      });
      document.body.appendChild(tag);
    }, label);
  }
  marked.add(page);
}

/** ถ่ายภาพหลักฐานกลาง step (เช่น "ก่อนกด" ตอนปุ่มยังอยู่) พร้อมกรอบที่ mark ไว้ แล้วล้างกรอบ — แนบใต้ step ปัจจุบัน */
export async function snapEvidence(page: Page, name: string) {
  const body = await page.screenshot();
  await clearMarks(page);
  shotCount.set(page, (shotCount.get(page) ?? 0) + 1);
  saveEvidenceFile(name, body);
  await test.info().attach(name, { body, contentType: 'image/png' });
}

/**
 * เก็บภาพหลักฐานเป็นไฟล์เรียงลำดับด้วย: <โฟลเดอร์ผลของเทส>/evidence/01 <ชื่อ>.png
 * (ภาพที่ attach แบบ body อยู่ในรายงาน HTML เท่านั้น — ไฟล์ชุดนี้ไว้แนบที่อื่น เช่น Test Result ของ TC ใน Linear)
 * โฟลเดอร์ผลรันถูกล้างทุกรอบ → คัดลอกออกก่อนรันรอบถัดไป
 */
function saveEvidenceFile(name: string, body: Buffer) {
  // ลำดับนับต่อเทส (ไม่ใช่ต่อหน้า) — เทสที่ใช้ 2 หน้าต่าง (2 บัญชี) ภาพจะเรียงตามเวลาที่ถ่ายจริง ไม่ชนเลขกัน
  const info = test.info();
  fileOrder.set(info, (fileOrder.get(info) ?? 0) + 1);
  const order = String(fileOrder.get(info)).padStart(2, '0');
  const file = test.info().outputPath('evidence', `${order} ${name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 120)}.png`);
  fs.mkdirSync(test.info().outputPath('evidence'), { recursive: true });
  fs.writeFileSync(file, body);
}

/** อยู่ในจอเต็มตัว และจุดกลางไม่ถูกแถบที่ลอยทับ (เช่นแถบระดับความเร่งด่วนของฟอร์ม Triage) บัง */
function isFullyInViewport(el: Element) {
  const r = el.getBoundingClientRect();
  if (!(r.width > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth)) return false;
  let hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  // ฟอร์มบางส่วนอยู่ใน shadow DOM — ไล่ลงไปหา element จริงที่จุดนั้น
  while (hit?.shadowRoot) {
    const inner = hit.shadowRoot.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!inner || inner === hit) break;
    hit = inner;
  }
  if (!hit) return false;
  const root = el.getRootNode();
  return el === hit || el.contains(hit) || hit.contains(el) || (root instanceof ShadowRoot && root.host.contains(hit));
}

/** ล้างกรอบหลักฐานที่ค้างบนหน้า (ไม่สนว่า mark ผ่าน Page ตัวไหน) — ตัวเล่นที่ส่ง Page แบบ Proxy ให้ checkStep ต้องเรียกเองหลังจบขั้น */
export async function clearEvidenceMarks(page: Page) {
  marked.add(page);
  await clearMarks(page);
}

async function clearMarks(page: Page) {
  if (!marked.has(page)) return;
  marked.delete(page);
  // หน้าอาจเปลี่ยน/ปิดไปแล้ว — กรอบหายไปกับหน้าเดิมอยู่แล้ว · กรอบของ element ใน iframe (เช่น เวชระเบียน) ถูกวาดใน iframe นั้น → ลบทุก frame
  await Promise.all(
    page.frames().map((frame) => frame.evaluate(() => document.querySelectorAll('[data-evidence-mark]').forEach((box) => box.remove())).catch(() => undefined)),
  );
}

async function attachScreenshot(page: Page, step: TestStepInfo, name: string) {
  // หน้าอาจถูกปิดไปแล้ว (เช่น เทสหมดเวลา) — ข้ามไป ภาพตอน fail ของ Playwright (screenshot: only-on-failure) ยังมีอยู่
  const body = await page.screenshot().catch(() => undefined);
  await clearMarks(page);
  if (!body) return;
  shotCount.set(page, (shotCount.get(page) ?? 0) + 1);
  saveEvidenceFile(name, body);
  await step.attach(name, { body, contentType: 'image/png' });
}

/** 1 แถวของตารางเทียบค่า: ชื่อช่อง + ค่าจากแต่ละแหล่ง (เรียงตาม columns) + ตรงกันไหม */
export interface CompareRow {
  label: string;
  values: string[];
  same: boolean;
}

/**
 * แสดงตารางเทียบค่า (เช่น ค่าบนหน้าจอ / ค่าจากหน้าอ้างอิง / ค่าจาก API) ซ้อนครึ่งขวาของหน้าเดิม ให้ภาพหลักฐานและคลิปเห็นทั้งหน้าจอจริง (ครึ่งซ้าย) และผลเทียบพร้อมกัน
 * หัวตารางบอกชัดว่าเป็นตารางที่สคริปต์ทดสอบสร้าง ไม่ใช่หน้าจอของระบบ · แสดงก่อน expect เพื่อให้ภาพ Error เห็นแถวที่ไม่ตรง · ลบด้วย hideCompareTable()
 * `side: 'bottom'` = ครึ่งล่างเต็มความกว้าง (หน้ารายการ — ไม่บังคอลัมน์ที่เป็น Expected) · `side: 'left'` = ซ้อนครึ่งซ้ายแทน (สิ่งที่ต้องเห็นคู่กับตารางอยู่ฝั่งขวาของจอ เช่น popover ใต้ปุ่มมุมขวาบน) · `width` = ความกว้าง (เช่น '530px' ให้พ้นหน้าต่างกลางจอ) ·
 * `top` = ระยะจากขอบบน (ตั้งต้น '84px' · เช่น '520px' ให้พ้นหัวคอลัมน์ของบอร์ด ER · ไม่ใช้กับ 'bottom')
 */
export async function showCompareTable(page: Page, title: string, columns: string[], rows: CompareRow[], options: { side?: 'left' | 'right' | 'bottom'; width?: string; top?: string } = {}): Promise<Locator> {
  await page.evaluate(
    ({ title, columns, rows, side, width, top }) => {
      document.querySelector('[data-compare-overlay]')?.remove();
      const overlay = document.createElement('div');
      overlay.setAttribute('data-compare-overlay', '');
      // 'bottom' = เต็มความกว้างครึ่งล่างของจอ — หน้ารายการที่ Expected อยู่หลายคอลัมน์ (ซ้อนครึ่งขวาแล้วบังคอลัมน์ผู้ส่ง / สถานะ — SBH-1117)
      const place: Record<string, string> =
        side === 'bottom' ? { left: '12px', right: '12px', bottom: '12px', maxHeight: '46vh' } : { [side]: '12px', top, width, maxHeight: `calc(100vh - ${top} - 16px)` };
      Object.assign(overlay.style, {
        position: 'fixed',
        ...place,
        overflow: 'auto',
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
      head.textContent = title;
      Object.assign(head.style, { font: '600 15px sans-serif', color: '#1f6f43' });
      const caption = document.createElement('div');
      caption.textContent = 'ตารางเทียบค่าที่สคริปต์ทดสอบสร้างขึ้น (ไม่ใช่หน้าจอของระบบ)';
      Object.assign(caption.style, { color: '#666', fontSize: '12px', marginBottom: '6px' });
      const table = document.createElement('table');
      Object.assign(table.style, { borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' });
      const addRow = (cells: string[], header: boolean, same?: boolean) => {
        const tr = table.insertRow();
        cells.forEach((text, index) => {
          const cell = tr.insertCell();
          cell.textContent = text;
          Object.assign(cell.style, { border: '1px solid #ccc', padding: '3px 6px', verticalAlign: 'top', wordBreak: 'break-word' });
          if (header) Object.assign(cell.style, { background: '#eef5f0', fontWeight: '600' });
          else if (index === 0) Object.assign(cell.style, { background: '#fafafa' });
          if (index === 0) cell.style.width = '17%';
          if (index === cells.length - 1) {
            Object.assign(cell.style, { width: '64px', textAlign: 'center', fontWeight: '600' });
            if (!header) cell.style.color = same ? '#1f6f43' : '#cf1322';
          }
        });
        if (!header && !same) tr.style.background = '#fff1f0';
      };
      addRow(['ช่อง', ...columns, 'ผล'], true);
      for (const row of rows) addRow([row.label || '(ทั้งส่วน)', ...row.values, row.same ? '✓ ตรง' : '✗ ไม่ตรง'], false, row.same);
      overlay.append(head, caption, table);
      document.body.appendChild(overlay);
    },
    { title, columns, rows, side: options.side ?? 'right', width: options.width ?? 'calc(50vw - 24px)', top: options.top ?? '84px' },
  );
  return page.locator('[data-compare-overlay]');
}

export async function hideCompareTable(page: Page) {
  await page.evaluate(() => document.querySelector('[data-compare-overlay]')?.remove()).catch(() => undefined);
}

/**
 * ค้างหน้าจอไว้ครู่หนึ่งให้คนดูคลิปอ่านทัน (กรอบแดง / ตารางเทียบค่า ขึ้นแล้วหายเร็วเกินไปถ้าไม่ค้าง)
 * ใช้เฉพาะเพื่อจังหวะของคลิป — ห้ามใช้แทนการรอเงื่อนไข (รอด้วย expect เสมอ)
 */
export async function holdForClip(page: Page, ms = 1_200) {
  await page.waitForTimeout(ms);
}

/** บรรทัดแรกของข้อความ error (ตัดสี ANSI ออก) — ไว้สรุปในรายการขั้นที่ไม่ผ่าน */
export const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');

/**
 * ตัวช่วยต่อเทส: บันทึก annotation + soft step (ไม่ผ่านแล้วเล่นต่อ จบเทสค่อย fail พร้อมรายการ)
 * `note(type, description)` ลง annotation + terminal · `soft(title, body)` = checkStep ที่ไม่โยน error (คืน true / false) · `finish()` fail ถ้ามีขั้นที่ไม่ผ่าน
 */
export function makeRunner(page: Page) {
  const failures: string[] = [];
  const note = (type: string, description: string) => {
    test.info().annotations.push({ type, description });
    console.log(`    ${type}: ${description}`);
  };
  const soft = (title: string, body: () => Promise<void>) =>
    checkStep(page, title, body).then(
      () => true,
      (error: unknown) => {
        failures.push(`${title} — ${firstLine(error)}`);
        console.log(`    ✗ ${title} — ${firstLine(error)}`);
        return false;
      },
    );
  const finish = () => expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
  return { note, soft, finish };
}
