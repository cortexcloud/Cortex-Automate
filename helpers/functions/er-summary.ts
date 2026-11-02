import { expect, type Locator, type Page } from '@playwright/test';
import type { ErVisit } from './er';

// ER Summary (ประวัติการรักษา > แท็บ ER Summary) — dev-x 2 พ.ย. 2026 · ไฟล์แอป index-Ddss3Q8D.js (chunk index-C6FUfLz6.js) · การ์ด SBH-3182
// ทุกส่วนเป็น <section data-testid="er-summary-<id>"> · ช่อง = div[class*="_field_"] > [class*="_label_"] + [class*="_value_"] · ตาราง antd (bordered)
// ส่วน slots (อาการนำ / GCS / MEWS / Fast Track / PE / Body chart …) ไม่แสดงเมื่อไม่มีข้อมูล · ระหว่างโหลดแต่ละส่วนมี spin [data-testid$="-loading"]
// แท็บอ่านอย่างเดียว: ไม่มี input / textarea / select / button ทั้ง light + shadow DOM (สำรวจ 11 encounter)

/** ชื่อส่วนตาม testid (ตัด `er-summary-` ออก) → หัวที่แสดงบนจอ */
export const ER_SUMMARY_SECTION_TITLE: Record<string, string> = {
  treatment: 'ข้อมูลการรักษาที่ ER',
  'slots-complaint': 'อาการนำ',
  history: 'โรคประจำตัวและการแพ้',
  transport: 'การนำส่งและการดูแลระหว่างนำส่ง',
  injury: 'ข้อมูลการบาดเจ็บ',
  'slots-diagnosis': 'Diagnosis / Order & Note to nurse',
  vitals: 'Vital signs',
  rts: 'Revised Trauma Score และ Primary Survey',
  'slots-gcs': 'Glasgow Coma Scale (GCS)',
  'slots-mews': 'Modified Early Warning Score (MEWS)',
  'slots-fast-track': 'Suspect Fast Track',
  'slots-physical-examination': 'Physical Examination (PE)',
  'physical-exam-trauma': 'Physical Examination (Trauma)',
  'slots-body-chart': 'ตำแหน่งที่ปวด/ผิดปกติ',
  unplaced: 'บันทึกอื่นจากแพทย์',
  orders: 'Order ที่ได้รับ',
  consults: 'Consult',
  disposition: 'การจำหน่าย',
};

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

export function erSummaryPanel(page: Page): Locator {
  return page.getByRole('main').getByRole('tabpanel', { name: 'ER Summary' });
}

export function erSummarySection(page: Page, id: string): Locator {
  return erSummaryPanel(page).getByTestId(`er-summary-${id}`);
}

/**
 * เมนูซ้าย ประวัติการรักษา → เลือก Encounter ER ตาม EN (รายการซ้ายเลือกรายล่าสุดของ HN เอง — ผู้ป่วยที่ Admit แล้วจะไปที่ AN) → แท็บ ER Summary → รอทุกส่วนโหลดเสร็จ
 * รายการ Encounter ถูกเมนูซ้ายที่กางค้างบัง → กดด้วย dispatchEvent
 */
export async function openErSummary(page: Page, visit: ErVisit): Promise<Locator> {
  const main = page.getByRole('main');
  const encounter = main.getByRole('button', { name: new RegExp(`^ER [0-9/]{10}.*${visit.en}`) }).first();
  // หน้า Visit ที่มีฟอร์มแพทย์ (Trauma) เปิดแผงฟอร์มเป็นค่าเริ่มต้นตามหลัง — คลิกเมนูครั้งแรกไม่ติด → กดซ้ำจนรายการ Encounter ขึ้น
  await expect(async () => {
    if (!(await encounter.isVisible())) {
      await page.getByRole('navigation', { name: 'ข้อมูลและเวชระเบียนผู้ป่วย' }).getByRole('menuitem', { name: 'ประวัติการรักษา', exact: true }).first().click({ force: true });
      await page.mouse.move(960, 700);
    }
    await expect(encounter).toBeVisible({ timeout: 15_000 });
  }, `ประวัติการรักษาต้องมี Encounter ER ${visit.en}`).toPass({ timeout: 120_000 });
  await encounter.dispatchEvent('click');
  const tab = main.getByRole('tab', { name: 'ER Summary', exact: true });
  await expect(tab, 'Encounter ER ต้องมีแท็บ ER Summary').toBeVisible({ timeout: 45_000 });
  await tab.click();
  const panel = erSummaryPanel(page);
  await expect(panel).toBeVisible({ timeout: 45_000 });
  // dev-x ช้า (2 พ.ย. 2026): บางรอบทุกส่วนขึ้น "ไม่สามารถโหลดข้อมูลส่วนนี้ได้ · ลองใหม่" → กด ลองใหม่ ทุกปุ่ม (ไม่เกิน 3 รอบ)
  const failed = panel.getByRole('button', { name: /ลองใหม่/ });
  for (let attempt = 1; attempt <= 3; attempt++) {
    await expect(panel.locator('[data-testid$="-loading"]'), 'ทุกส่วนของ ER Summary ต้องโหลดเสร็จ').toHaveCount(0, { timeout: 60_000 });
    if (!(await failed.count())) break;
    console.log(`    ER Summary โหลดไม่ได้ ${await failed.count()} ส่วน → กด ลองใหม่ (รอบ ${attempt})`);
    for (const button of await failed.all()) await button.click().catch(() => undefined);
    await page.waitForTimeout(4_000);
  }
  await expect(panel.getByTestId('er-summary-treatment').getByText(visit.en, { exact: true }), 'ER Summary ต้องเป็นของ EN ที่เลือก').toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(1_500);
  return panel;
}

/** ส่วนบนหน้าเรียงตามลำดับจริง (testid ตัด er-summary- + หัวที่แสดง) — ไม่รวมป้ายหัว / ฟอร์มย่อย / ปุ่มดูทั้งหมด */
export async function erSummaryOrder(page: Page): Promise<{ id: string; title: string }[]> {
  return erSummaryPanel(page)
    .locator('section[data-testid^="er-summary-"]')
    .evaluateAll((els) =>
      els
        .filter((e) => !e.parentElement?.closest('section[data-testid^="er-summary-"]'))
        .map((e) => ({
          id: (e.getAttribute('data-testid') ?? '').replace(/^er-summary-/, ''),
          title: (e.querySelector('[class*="_title_"]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        })),
    );
}

/** ป้ายหัวของ ER Summary ("ER Physician Note" / "ER Trauma Exam") */
export function erSummaryPill(page: Page): Locator {
  return erSummaryPanel(page).getByTestId('er-summary-pill');
}

/** ช่องของส่วนเป็น { ป้าย: ค่า } (ช่องที่ป้ายซ้ำ ค่าถัดไปต่อท้ายด้วย ' ‖ ') */
export async function readFields(section: Locator): Promise<Record<string, string>> {
  const pairs = await section.locator('[class*="_field_"]').evaluateAll((els) =>
    els.map((e) => [
      (e.querySelector('[class*="_label_"]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      (e.querySelector('[class*="_value_"]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    ]),
  );
  const out: Record<string, string> = {};
  for (const [label, value] of pairs) out[label] = label in out ? `${out[label]} ‖ ${value}` : value;
  return out;
}

/** ช่องตามป้าย (ค่า) — ไว้ตีกรอบ */
export function fieldOf(section: Locator, label: string): Locator {
  return section.locator('[class*="_field_"]').filter({ has: section.page().getByText(label, { exact: true }) }).first();
}

/** ตาราง (ตารางแรกของส่วน หรือ `table`) → หัวคอลัมน์ + แถว (ข้อความต่อช่อง) */
export async function readTable(table: Locator): Promise<{ head: string[]; rows: string[][] }> {
  return table.evaluate((t) => {
    const text = (e: Element) => (e.textContent ?? '').replace(/\s+/g, ' ').trim();
    const head = Array.from(t.querySelectorAll('thead th')).map(text);
    const rows = Array.from(t.querySelectorAll('tbody tr'))
      .filter((r) => !r.classList.contains('ant-table-measure-row'))
      .map((r) => Array.from(r.querySelectorAll('td')).map(text));
    return { head, rows };
  });
}

/** แถวตาราง Order: แถวหัวกลุ่ม ("ยาและสารน้ำ (n)") + รายการ (ขีดฆ่า = รายการที่ยกเลิก) */
export interface ErSummaryOrderRow {
  group: string;
  type: string;
  item: string;
  orderedAt: string;
  status: string;
  struck: boolean;
}
export async function readOrders(page: Page): Promise<{ groups: string[]; rows: ErSummaryOrderRow[] }> {
  return erSummarySection(page, 'orders')
    .locator('table')
    .first()
    .evaluate((t) => {
      const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const groups: string[] = [];
      const rows: { group: string; type: string; item: string; orderedAt: string; status: string; struck: boolean }[] = [];
      let group = '';
      for (const tr of Array.from(t.querySelectorAll('tbody tr'))) {
        if (tr.classList.contains('ant-table-measure-row')) continue;
        if (/_group-row_/.test(tr.className)) {
          group = text(tr);
          groups.push(group);
          continue;
        }
        const td = Array.from(tr.querySelectorAll('td'));
        if (td.length < 4) continue;
        const struck = Array.from(tr.querySelectorAll('*')).some((e) => getComputedStyle(e).textDecorationLine.includes('line-through'));
        rows.push({ group, type: text(td[0]), item: text(td[1]), orderedAt: text(td[2]), status: text(td[3]), struck });
      }
      return { groups, rows };
    });
}

/** ช่องกรอก / ปุ่มในแท็บ (ทะลุ shadow DOM) — TC อ่านอย่างเดียว */
export async function interactiveInside(panel: Locator): Promise<string[]> {
  return panel.evaluate((root) => {
    const found: string[] = [];
    const sel = 'input, textarea, select, button, [contenteditable="true"], [role="button"], [role="textbox"], [role="combobox"]';
    const walk = (node: Element | ShadowRoot) => {
      for (const el of Array.from(node.querySelectorAll('*'))) {
        if (el.matches(sel)) {
          const html = el as HTMLElement;
          const visible = !!(html.offsetWidth || html.offsetHeight || html.getClientRects().length);
          if (visible) found.push(`${el.tagName.toLowerCase()}${el.getAttribute('type') ? `[${el.getAttribute('type')}]` : ''} "${(html.innerText || html.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`);
        }
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(root);
    return found;
  });
}

/** ข้อมูล ER Summary จาก API (อ่านอย่างเดียว) */
export async function fetchErSummaryApi(page: Page, authorization: string, en: string): Promise<Record<string, unknown>> {
  const res = await page.request.get(`/cortex-api/er/encounters/${encodeURIComponent(en)}/summary`, { headers: { authorization } });
  expect(res.status(), `อ่าน ER Summary ของ ${en} ผ่าน API`).toBe(200);
  return (await res.json()) as Record<string, unknown>;
}

/** ISO → "dd/MM/พ.ศ. HH:mm" เวลาไทย */
export function thaiDateTime(iso: string): string {
  const d = new Date(Date.parse(iso) + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear() + 543} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** เวลาใน ER ตามเกณฑ์การ์ด: < 60 นาที = "n นาที" · < 24 ชม. = "h ชม. m นาที" · ≥ 24 ชม. = "d วัน h ชม." */
export function erLos(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`;
  return `${Math.floor(minutes / 1440)} วัน ${Math.floor((minutes % 1440) / 60)} ชม.`;
}

export { norm as normText };
