import { expect, test, type Locator, type Page, type TestStepInfo } from '@playwright/test';

/** หน้าที่มีกรอบจาก markEvidence() รอลบหลังถ่ายภาพของ checkStep */
const marked = new WeakSet<Page>();
/** จำนวนภาพที่ถ่ายแล้วของแต่ละหน้า — ใช้รู้ว่า step นี้มี checkStep ย่อยถ่ายภาพไปแล้ว */
const shotCount = new WeakMap<Page, number>();
/** error ที่ step ลูกถ่ายภาพไปแล้ว — step แม่ไม่ต้องถ่ายซ้ำ */
const captured = new WeakSet<object>();

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
      const rect = el.getBoundingClientRect();
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
      // ป้ายอยู่เหนือมุมขวาของกรอบ (ไม่ทับชื่อช่องที่อยู่มุมซ้าย) — ถ้าชิดขอบบนจอให้ลงไปอยู่ใต้กรอบแทน
      const above = rect.top - 3 >= 22;
      Object.assign(tag.style, {
        position: 'fixed',
        right: `${Math.max(0, window.innerWidth - rect.right - 3)}px`,
        top: above ? `${rect.top - 3 - 20}px` : `${rect.bottom + 3}px`,
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
  await test.info().attach(name, { body, contentType: 'image/png' });
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

async function clearMarks(page: Page) {
  if (!marked.has(page)) return;
  marked.delete(page);
  // หน้าอาจเปลี่ยน/ปิดไปแล้ว — กรอบหายไปกับหน้าเดิมอยู่แล้ว
  await page.evaluate(() => document.querySelectorAll('[data-evidence-mark]').forEach((box) => box.remove())).catch(() => undefined);
}

async function attachScreenshot(page: Page, step: TestStepInfo, name: string) {
  // หน้าอาจถูกปิดไปแล้ว (เช่น เทสหมดเวลา) — ข้ามไป ภาพตอน fail ของ Playwright (screenshot: only-on-failure) ยังมีอยู่
  const body = await page.screenshot().catch(() => undefined);
  await clearMarks(page);
  if (!body) return;
  shotCount.set(page, (shotCount.get(page) ?? 0) + 1);
  await step.attach(name, { body, contentType: 'image/png' });
}
