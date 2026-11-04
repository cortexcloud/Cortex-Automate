import { expect, type Locator, type Page, type Response } from '@playwright/test';

// หน้าจอ MoPH Refer Out ของศูนย์ Refer (แอป Refer > "ส่ง Refer ออก") — SBH Prod 3 พ.ย. 2026 · v2.8.1 · การ์ด SBH-1016
// ความรู้หน้าจอ: cortex-automate references/screens/refer.md หัวข้อ "MoPH Refer Out — ศูนย์ Refer"
// ปุ่มที่เขียนข้อมูล (POST /cortex-api/moph/refer-out/by-vn/<VN>/…): เปิดคำขอ · รอผู้อำนวยการลงนาม · ส่งกลับไปตรวจสอบ · อนุมัติ · ไม่อนุมัติ ·
//   ยกเลิกการอนุมัติ · กำหนดปลายทาง · บันทึกร่าง (PUT draft) · บันทึกและตรวจ · ส่งไปยัง MoPH · ยกเลิกใบส่งตัว · รับทราบการเปลี่ยนแปลง

export const REFER_OUT_API = '/cortex-api/moph/refer-out';

export interface ReferOutItem {
  requestId: string | null;
  vn: string;
  en: string;
  hn: string;
  patientName: string;
  sourceKind: 'er' | 'opd';
  signedAt: string;
  destinationHcode: string | null;
  destinationName: string;
  summarizedByName: string;
  status: string;
  referOutNo: string | null;
  submissionState: string | null;
  sourceChanged: boolean;
  reviewReason: string | null;
  number?: { number?: string; status?: string } | null;
  submission?: { state?: string; referId?: string | null } | null;
  liveStatus?: Record<string, unknown> | null;
  events?: { action: string; actorName?: string; reason?: string | null; createdAt?: string }[];
  lastAttempt?: { action: string; failureKind?: string | null; mophMessageTh?: string | null } | null;
}

/** สถานะ (code → คำบนหน้าจอ) จาก locale `referOutStatus…` */
export const STATUS_TEXT: Record<string, string> = {
  pending_review: 'รอตรวจสอบ',
  awaiting_director_signature: 'รอผู้อำนวยการลงนาม',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
  sent: 'ส่งแล้ว',
};

export async function apiGet<T>(page: Page, authorization: string, path: string): Promise<T> {
  const res = await page.request.get(`${REFER_OUT_API}${path}`, { headers: { authorization } });
  expect(res.status(), `GET ${path}`).toBe(200);
  return (await res.json()) as T;
}
export const fetchDetail = (page: Page, auth: string, vn: string) => apiGet<ReferOutItem>(page, auth, `/by-vn/${vn}`);
export const fetchPrefill = (page: Page, auth: string, vn: string) => apiGet<Record<string, unknown> & { validation: { field: string; code: string }[] }>(page, auth, `/by-vn/${vn}/prefill`);
export async function fetchListItem(page: Page, auth: string, vn: string): Promise<ReferOutItem | undefined> {
  const list = await apiGet<{ items: ReferOutItem[] }>(page, auth, '?page=1&perPage=100');
  return list.items.find((i) => i.vn === vn);
}

/** รอ POST …/by-vn/<VN>/<action> (เริ่มรอก่อนกด) */
export function referOutAction(page: Page, vn: string, action: string, timeout = 60_000): Promise<Response> {
  return page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(`${REFER_OUT_API}/by-vn/${vn}/${action}`), { timeout });
}

export async function gotoWorklist(page: Page) {
  await expect(async () => {
    await page.goto('/cortex/refer/refer-out');
    await expect(page.getByRole('main').getByRole('columnheader', { name: 'ผู้ป่วย' }).first()).toBeVisible({ timeout: 60_000 });
  }, 'เปิดหน้า ส่ง Refer ออก').toPass({ timeout: 180_000 });
}

export function worklistRow(page: Page, hn: string): Locator {
  return page.getByRole('main').getByRole('row').filter({ hasText: hn }).first();
}

/** หัวตาราง Worklist (แถวหัวของตารางจริง — antd มีตารางหัวซ้ำสำหรับ sticky) */
export function worklistHeader(page: Page): Locator {
  return page.getByRole('main').locator('thead').filter({ visible: true }).first();
}

/** หน้าคำขอ (/refer/refer-out/<VN>) · `open: true` = กด "เปิดคำขอ" ถ้ายังไม่เปิด (POST …/open) */
export async function gotoRequest(page: Page, vn: string, options: { open?: boolean } = {}) {
  await expect(async () => {
    await page.goto(`/cortex/refer/refer-out/${vn}`);
    await expect(page.getByRole('main').getByText('คำขอส่งต่อผู้ป่วยออก', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(reviewCard(page)).toBeVisible({ timeout: 30_000 });
  }, `เปิดคำขอส่งต่อของ ${vn}`).toPass({ timeout: 180_000 });
  const open = page.getByRole('main').getByRole('button', { name: 'เปิดคำขอ' });
  if (options.open && (await open.isVisible())) {
    const opened = referOutAction(page, vn, 'open');
    await open.click();
    expect((await opened).status(), 'POST open').toBe(200);
  }
  if (options.open) await expect(formCard(page, 'ผู้ป่วย')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1_500);
}

/** การ์ดในหน้าคำขอตามหัวการ์ด (การตรวจสอบ · สิทธิการรักษา · แพทย์ผู้ส่งต่อ · ผู้ป่วย · การจัดประเภท · การวินิจฉัย · สรุปทางคลินิก · สัญญาณชีพ · การแพ้ · ยา · การส่งไปยัง MoPH) */
export function formCard(page: Page, title: string): Locator {
  return page.getByRole('main').locator('.ant-card').filter({ has: page.locator('.ant-card-head-title', { hasText: new RegExp(`^${title}$`) }) }).last();
}
export const reviewCard = (page: Page) => formCard(page, 'การตรวจสอบ');

/** ส่วนหัวคำขอ (descriptions) ตามป้าย เช่น "HN / VN" · "สถานะ" · "โรงพยาบาลปลายทาง" */
export function headerItem(page: Page, label: string): Locator {
  return page
    .getByRole('main')
    .locator('.ant-descriptions-item-container')
    .filter({ has: page.locator('.ant-descriptions-item-label', { hasText: new RegExp(`^${label}$`) }) })
    .first();
}
export async function headerValue(page: Page, label: string): Promise<string> {
  return norm(await headerItem(page, label).locator('.ant-descriptions-item-content').innerText());
}

/** ช่องในฟอร์ม (ant-form-item ที่ป้ายตรงชื่อ) — `nth` สำหรับชื่อซ้ำ (เช่น ประเภทการวินิจฉัย ของการวินิจฉัย / การแพ้) */
export function formItem(scope: Page | Locator, label: string, nth = 0): Locator {
  const page = 'page' in scope && typeof scope.page === 'function' ? (scope as Locator).page() : (scope as Page);
  const root = scope === page ? page.getByRole('main') : (scope as Locator);
  return root.locator('.ant-form-item').filter({ has: page.locator(`label[title="${label}"]`) }).nth(nth);
}

/** ค่าที่แสดงในช่อง (input / textarea / select) */
export async function fieldValue(item: Locator): Promise<string> {
  return item.evaluate((el) => {
    const input = el.querySelector('input:not([type="search"]):not([type="hidden"]), textarea') as HTMLInputElement | null;
    const select = el.querySelector('.ant-select-content-value, .ant-select-selection-item') as HTMLElement | null;
    if (select) return (select.getAttribute('title') || select.textContent || '').trim();
    return (input?.value ?? '').trim();
  });
}

export const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** ปุ่มในการ์ด การตรวจสอบ */
export function reviewButton(page: Page, name: string): Locator {
  return reviewCard(page).getByRole('button', { name, exact: true });
}

/** หน้าต่าง (modal) ที่เปิดอยู่ตามหัว */
export function modal(page: Page, title: string | RegExp): Locator {
  return page.locator('.ant-modal-wrap:visible, .ant-modal-confirm:visible').filter({ hasText: title }).last();
}

/** แถบข้อความรายการที่ต้องแก้ไข ("ยังมี n รายการที่ต้องแก้ไข") */
export function validationAlert(page: Page): Locator {
  return page.getByRole('main').locator('.ant-alert').filter({ hasText: /ยังมี \d+ รายการที่ต้องแก้ไข|แบบฟอร์มครบถ้วนพร้อมส่ง/ }).first();
}

/** ส่วน "การส่งตัว MoPH" ในหน้า Disposition ของ ER (แสดงสถานะอย่างเดียว) */
export function erReferOutPanel(page: Page): Locator {
  return page
    .getByRole('main')
    .locator('div')
    .filter({ has: page.getByText('การส่งตัว MoPH', { exact: true }) })
    .filter({ has: page.getByText('เลขที่ส่งต่อ', { exact: true }) })
    .last();
}
