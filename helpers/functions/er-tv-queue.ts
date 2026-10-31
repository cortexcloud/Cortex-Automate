import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { cacheAppAssets } from '../../mock-data/fixtures';
import { trackVideo } from './fixtures';

// จอ ER TV สำหรับผู้ป่วยและญาติ (SBH-1719) — หน้าสาธารณะ /cortex/public/er/tv-queue ไม่ต้องล็อกอิน
// ไฟล์แอป dev-x 29 ต.ค. 2026 (index-CEoVaHfB.js · chunk index-DNLvzRrx.js · locale /cortex/locale/th/er-tv-queue.json):
//   ดึง GET <CORTEX_SERVER_URL>/public/er/tv-queue ทุก 3 วินาที (credentials: omit) · เปลี่ยนหน้าทุก 15 วินาที (แยกซ้าย / ขวา)
//   ซ้าย section[aria-labelledby=er-tv-active-heading] "คิวเรียกในห้องฉุกเฉิน" — การ์ดคิวที่กำลังเรียก (div[aria-live]) + "เรียกแล้ว" (grid 2 คอลัมน์ · จำนวนต่อหน้าตามความสูงจอ: 1080 = 4)
//   ขวา section[aria-labelledby=er-tv-patients-heading] "ดูสถานะผู้ป่วยที่รักษาอยู่" — ตาราง ลำดับ / หมายเลขคิว / ชื่อ - สกุล / สถานะการรักษา ·
//     แถวต่อหน้า = min(ที่จอสูงพอ, 8) แล้วเฉลี่ยให้ทุกหน้าเท่ากัน: ceil(n / ceil(n / cap))
//   สี ESI: 1–2 แดง (--cx-color-error) · 3 warning (#d48806) · 4–5 เขียว (--cx-color-success) · ไม่มีระดับ = เทา (text-quaternary)
//   Tag "กำลังกู้ชีพ · การรักษาอาจล่าช้า" อยู่ในแถบหัวจอ (header) · Banner "ประกาศแจ้งผู้ป่วย" = Alert warning เมื่อ isPatientAnnouncementActive
//   ปุ่มเต็มจอ aria-label "เต็มหน้าจอ" / "ออกจากเต็มหน้าจอ"

export const TV_PATH = '/cortex/public/er/tv-queue';

export interface TvCall { publicQueueId: string; queueNumber: string; calledAt: string; triageLevel: number | null }
export interface TvBoard {
  generatedAt: string;
  activeCall: TvCall | null;
  calledCalls: TvCall[];
  patients: { publicId: string; queueNumber: string | null; maskedName: string; status: string }[];
  isResuscitationActive: boolean;
  isPatientAnnouncementActive: boolean;
}

/** URL ของ API สาธารณะ (CORTEX_SERVER_URL = <origin>/cortex-api ทั้ง dev-x และ Prod) */
export const tvApiUrl = (page: Page) => `${new URL(page.url()).origin}/cortex-api/public/er/tv-queue`;

/** อ่าน snapshot เดียวกับที่จอใช้ (ไม่ส่ง token — หน้าสาธารณะ) */
export async function fetchTvBoard(page: Page): Promise<TvBoard> {
  const res = await page.request.get(tvApiUrl(page), { headers: { Accept: 'application/json' } });
  expect(res.ok(), `GET ${tvApiUrl(page)} ต้องสำเร็จ (ได้ ${res.status()})`).toBeTruthy();
  return res.json();
}

/**
 * เปิดจอ TV ในหน้าต่างใหม่ที่ไม่มี session (ยืนยันว่าเป็นหน้าสาธารณะ) + อัดวิดีโอ `video-TV.webm`
 * ปิดด้วย finishVideo(tv) แล้ว tv.context().close()
 */
export async function openTvWindow(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await cacheAppAssets(context);
  const tv = await context.newPage();
  await tv.goto(TV_PATH);
  await expect(tvPatientsSection(tv).getByRole('heading', { name: 'ดูสถานะผู้ป่วยที่รักษาอยู่' }), 'จอ TV ต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
  await trackVideo(tv, 'TV');
  return tv;
}

export const tvHeader = (tv: Page) => tv.locator('header').first();
export const tvCallSection = (tv: Page) => tv.locator('section[aria-labelledby="er-tv-active-heading"]');
export const tvPatientsSection = (tv: Page) => tv.locator('section[aria-labelledby="er-tv-patients-heading"]');
/** พื้นที่คิวที่กำลังเรียก (มีการ์ด หรือข้อความ "กรุณารอเรียกคิว") */
export const tvActiveArea = (tv: Page) => tvCallSection(tv).locator('[aria-live="polite"]');
/** เลขคิวตัวใหญ่ของการ์ดที่กำลังเรียก */
export const tvActiveNumber = (tv: Page) => tvActiveArea(tv).locator('strong').first();
/** ป้าย "กำลังเรียก · คิวล่าสุด" บนหัวการ์ด */
export const tvLatestTag = (tv: Page) => tvCallSection(tv).getByText('กำลังเรียก · คิวล่าสุด', { exact: true });
/** ส่วน "เรียกแล้ว" (หัว + จำนวนคิว + รายการ + แถบหน้า) */
export const tvHistory = (tv: Page) => tvCallSection(tv).locator('[class*="_stub_"]');
export const tvHistoryCards = (tv: Page) => tvCallSection(tv).locator('[class*="_historyGrid_"] > [class*="_card_"]');
/** ป้าย "หน้า X / N" ของแต่ละฝั่ง (มีเมื่อเกิน 1 หน้า) */
export const tvPageLabel = (section: Locator) => section.locator('[class*="_labels_"]');
/** ปุ่มช่องของแถบ progress (1 ปุ่มต่อ 1 หน้า) */
export const tvSegments = (section: Locator) => section.locator('[class*="_segments_"] > button');
export const tvResuscitationTag = (tv: Page) => tv.getByText('กำลังกู้ชีพ · การรักษาอาจล่าช้า', { exact: true });
export const tvAnnouncement = (tv: Page) => tv.locator('.ant-alert').filter({ hasText: 'ประกาศแจ้งผู้ป่วย' });
export const tvFullscreenButton = (tv: Page) => tv.getByRole('button', { name: /^(เต็มหน้าจอ|ออกจากเต็มหน้าจอ)$/ });

/** "หน้า X / N" → { page, total } · ไม่มีป้าย = 1 / 1 */
export async function readTvPage(section: Locator): Promise<{ page: number; total: number }> {
  const label = tvPageLabel(section);
  if (!(await label.count())) return { page: 1, total: 1 };
  const m = (await label.innerText()).match(/หน้า\s*(\d+)\s*\/\s*(\d+)/);
  return m ? { page: Number(m[1]), total: Number(m[2]) } : { page: 1, total: 1 };
}

export interface TvPatientRow { seq: number; queue: string; name: string; status: string }

/** แถวของตารางผู้ป่วยในหน้าที่แสดงอยู่ */
export async function readTvPatientRows(tv: Page): Promise<TvPatientRow[]> {
  return tvPatientsSection(tv).locator('tbody tr.ant-table-row').evaluateAll((rows) =>
    rows.map((row) => {
      const cells = [...row.querySelectorAll('td')].map((td) => (td as HTMLElement).innerText.trim());
      return { seq: Number(cells[0]), queue: cells[1] ?? '', name: cells[2] ?? '', status: (cells[3] ?? '').replace(/\s*เพิ่งอัปเดต$/, '') };
    }),
  );
}

/**
 * อ่านตารางผู้ป่วยทุกหน้า: รอให้จอเปลี่ยนหน้าเองจนครบทุกหน้า (สูงสุด 15 วินาที × จำนวนหน้า + 10)
 * คืนแถวตามหน้า · ไม่กดเปลี่ยนหน้าเอง (ให้เห็นการเปลี่ยนหน้าอัตโนมัติจริง)
 */
export async function readAllTvPatientPages(tv: Page, onPage?: (page: number, rows: TvPatientRow[]) => Promise<void>): Promise<Map<number, TvPatientRow[]>> {
  const section = tvPatientsSection(tv);
  const pages = new Map<number, TvPatientRow[]>();
  const { total } = await readTvPage(section);
  const deadline = Date.now() + (15_000 * total + 10_000);
  while (pages.size < total && Date.now() < deadline) {
    const { page } = await readTvPage(section);
    if (!pages.has(page)) {
      await tv.waitForTimeout(400); // ให้แถวของหน้าใหม่ render ครบ
      const rows = await readTvPatientRows(tv);
      pages.set(page, rows);
      if (onPage) await onPage(page, rows);
    }
    await tv.waitForTimeout(250);
  }
  return pages;
}

/**
 * จดเวลาที่ป้าย "หน้า X / N" เปลี่ยน (ทุก 200 ms) เป็นเวลา `ms` — คืนรายการ { page, at } (at = ms นับจากเริ่มดู)
 * พร้อมความคืบหน้าของช่องหน้าปัจจุบัน (aria-valuenow ของ progress) ที่อ่านได้ตอนนั้น
 */
export async function watchTvPaging(section: Locator, ms: number): Promise<{ changes: { page: number; total: number; at: number }[]; samples: { at: number; page: number; percents: number[] }[] }> {
  const tv = section.page();
  const start = Date.now();
  const changes: { page: number; total: number; at: number }[] = [];
  const samples: { at: number; page: number; percents: number[] }[] = [];
  let last = -1;
  let lastSample = -10_000;
  while (Date.now() - start < ms) {
    const at = Date.now() - start;
    const { page, total } = await readTvPage(section);
    if (page !== last) {
      changes.push({ page, total, at });
      last = page;
    }
    if (at - lastSample >= 2_500) {
      samples.push({ at, page, percents: await readTvSegmentPercents(section) });
      lastSample = at;
    }
    await tv.waitForTimeout(200);
  }
  return { changes, samples };
}

/** ความเต็มของแต่ละช่องในแถบ progress (%) — อ่านจาก aria-valuenow หรือความกว้างของแถบสี */
export async function readTvSegmentPercents(section: Locator): Promise<number[]> {
  return tvSegments(section).evaluateAll((buttons) =>
    buttons.map((button) => {
      const bar = button.querySelector('[role="progressbar"]');
      const now = bar?.getAttribute('aria-valuenow');
      if (now != null) return Math.round(Number(now));
      const bg = button.querySelector('.ant-progress-bg') as HTMLElement | null;
      return bg ? Math.round(Number.parseFloat(bg.style.width) || 0) : -1;
    }),
  );
}

/** ชื่อสีคร่าวๆ จาก rgb(...) — ใช้เทียบกับคำใน Expected (ส้ม / เขียว / เทา / แดง) */
export function colorName(css: string): string {
  const m = css.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!m) return css;
  const [r, g, b] = [m[1], m[2], m[3]].map((v) => Number(v) / 255);
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  if (alpha < 0.6 || s < 0.15) return 'เทา';
  let h = 0;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 345) return 'แดง';
  if (h < 45) return 'ส้ม';
  if (h < 70) return 'เหลือง';
  if (h < 170) return 'เขียว';
  return 'อื่น';
}

/** rgb(...) → #rrggbb */
export function toHex(css: string): string {
  const m = css.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  return m ? `#${[m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('')}` : css;
}

/** ข้อมูลการ์ดคิวที่กำลังเรียก: เลขคิว · ระดับคัดกรอง · ความเร่งด่วน (คำ + สี) · สีของแถบ (mark) */
export async function readTvActiveCard(tv: Page): Promise<{ number: string; triage: string; urgency: string; urgencyColor: string; markColor: string } | null> {
  const area = tvActiveArea(tv);
  if (!(await area.locator('strong').count())) return null;
  return area.evaluate((el) => {
    const dds = [...el.querySelectorAll('dl > div')].map((div) => ({ dt: div.querySelector('dt')?.textContent?.trim() ?? '', dd: div.querySelector('dd') as HTMLElement | null }));
    const triage = dds.find((d) => d.dt === 'ระดับคัดกรอง')?.dd;
    const urgency = dds.find((d) => d.dt === 'ความเร่งด่วน')?.dd;
    const mark = el.querySelector('[class*="_mark_"]') as HTMLElement | null;
    return {
      number: el.querySelector('strong')?.textContent?.trim() ?? '',
      triage: triage?.innerText.trim() ?? '',
      urgency: urgency?.innerText.trim() ?? '',
      urgencyColor: urgency ? getComputedStyle(urgency).color : '',
      markColor: mark ? getComputedStyle(mark).backgroundColor : '',
    };
  });
}
