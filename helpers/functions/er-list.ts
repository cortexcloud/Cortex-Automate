import { expect, type Locator, type Page } from '@playwright/test';
import { expectOk, openErMenu } from './er';

// หน้ารายการผู้ป่วย ER (แดชบอร์ด / คิว มุมมอง "รายการ" — /cortex/er/dashboard?view=list) — ตรวจกับ dev-x 7 ต.ค. 2026 (การ์ด SBH-2391)

/** แท็บสถานะของหน้ารายการ: key (ค่าใน URL `tab=`) → ชื่อบนจอ เรียงตามลำดับบนจอ */
export const ER_LIST_TABS = {
  current: 'ผู้ป่วยปัจจุบันใน ER',
  'refer-in': 'ผู้ป่วยรับ Refer',
  'sent-to-clinic': 'ส่งคลินิกอื่น',
  'bed-waiting': 'ผู้ป่วยรอเตียง',
  admitted: 'รับเป็นผู้ป่วยใน',
  'waiting-for-discharge': 'รอจำหน่าย',
  discharged: 'จำหน่าย',
  finished: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
} as const;
export type ErListTabKey = keyof typeof ER_LIST_TABS;

/** สถานะของ Encounter ที่ API บอร์ดคืน (เฉพาะช่องที่เกี่ยวกับการจำหน่าย) */
export interface ErEncounterState {
  en: string;
  latestStatusCode: string;
  /** current_in_er · bed_waiting · waiting_for_discharge · discharged · finished · admitted · sent_to_clinic · cancelled */
  patientStatus: string;
  canDischargeFromEr: boolean;
  visitClosed: boolean;
  departedAt: string | null;
  departedBy: string | null;
  admitRequestStatus: string | null;
  an: string | null;
}

const STATE_KEYS: (keyof ErEncounterState)[] = ['en', 'latestStatusCode', 'patientStatus', 'canDischargeFromEr', 'visitClosed', 'departedAt', 'departedBy', 'admitRequestStatus', 'an'];

/** วันที่ไทยวันนี้ YYYY-MM-DD (วันที่มาถึงของ Visit ที่เพิ่งเปิด) */
export function bangkokToday(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

/** สถานะปัจจุบันของ Encounter จาก API บอร์ด — `?date=<วันที่มาถึง>` คืนทุกสถานะของวันนั้น (รวมที่จำหน่าย / เสร็จสิ้นแล้ว) */
export async function fetchErEncounterState(page: Page, authorization: string, en: string, arrivalDay: string): Promise<ErEncounterState> {
  const res = await page.request.get(`/cortex-api/er/dashboard/encounters?date=${arrivalDay}`, { headers: { authorization } });
  await expectOk(res, `อ่านสถานะ Encounter ${en} จาก API บอร์ด`);
  const encounter = ((await res.json()) as ErEncounterState[]).find((item) => item.en === en);
  if (!encounter) throw new Error(`API บอร์ดของวันที่ ${arrivalDay} ไม่มี Encounter ${en}`);
  return Object.fromEntries(STATE_KEYS.map((key) => [key, encounter[key] ?? null])) as unknown as ErEncounterState;
}

/** ตัวสลับมุมมอง บอร์ด / รายการ บนหน้าแดชบอร์ด */
export function erViewSwitch(page: Page, view: 'บอร์ด' | 'รายการ'): Locator {
  return page.getByRole('main').locator('label.ant-segmented-item').filter({ has: page.locator(`.ant-segmented-item-label[title="${view}"]`) });
}

export function erListTab(page: Page, key: ErListTabKey): Locator {
  return page.getByRole('main').locator(`[role="tab"][id$="-tab-${key}"]`);
}

/** ตัวนับบนแท็บ (นับตามตัวกรองที่ใส่อยู่) */
export function erListTabCount(page: Page, key: ErListTabKey): Locator {
  return erListTab(page, key).locator('[class*="tab-count"]');
}

/** แท็บทั้งหมดตามลำดับบนจอ: ชื่อ + ตัวนับ */
export async function readErListTabs(page: Page): Promise<{ label: string; count: number }[]> {
  return page.getByRole('main').getByRole('tab').evaluateAll((tabs) =>
    tabs.map((tab) => {
      const count = tab.querySelector('[class*="tab-count"]')?.textContent ?? '';
      const label = (tab.querySelector('[class*="tab-label"] > span')?.textContent ?? tab.textContent ?? '').trim();
      return { label, count: Number(count) };
    }),
  );
}

async function expectListReady(page: Page) {
  await expect(page).toHaveURL(/\/cortex\/er\/dashboard\?.*view=list/);
  await expect(erListTab(page, 'current')).toBeVisible({ timeout: 60_000 });
  await expect(hnSearchBox(page)).toBeVisible();
}

/** เปิดหน้ารายการผู้ป่วย ER ผ่านแถบนำทาง (ไม่โหลดแอปใหม่): เมนู แดชบอร์ด / คิว → ตัวสลับ "รายการ" */
export async function openErPatientListFromMenu(page: Page) {
  await openErMenu(page, 'แดชบอร์ด / คิว');
  await expect(page).toHaveURL(/\/cortex\/er\/dashboard/);
  await erViewSwitch(page, 'รายการ').click();
  await expectListReady(page);
}

/** เปิดหน้ารายการผู้ป่วย ER ด้วย URL (โหลดแอปใหม่ — ใช้ตอนมาจากโมดูลอื่น เช่น การเงิน) */
export async function gotoErPatientList(page: Page) {
  await page.goto('/cortex/er/dashboard?view=list');
  await expectListReady(page);
}

export function hnSearchBox(page: Page): Locator {
  return page.getByRole('main').getByPlaceholder('ค้นหา HN');
}

/** กรองรายการด้วย HN — ตัวนับบนทุกแท็บเปลี่ยนตาม (เหลือเฉพาะแท็บที่มีผู้ป่วยรายนี้) */
export async function filterErListByHn(page: Page, hn: string) {
  await hnSearchBox(page).fill(hn);
  await expect(hnSearchBox(page)).toHaveValue(hn);
}

/** กดแท็บสถานะ → แท็บถูกเลือก และ URL มี `tab=<key>` */
export async function openErListTab(page: Page, key: ErListTabKey) {
  const tab = erListTab(page, key);
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  if (key !== 'current') await expect(page).toHaveURL(new RegExp(`[?&]tab=${key}(&|$)`));
}

/** แถวของ Encounter ในตารางของแท็บที่เปิดอยู่ (แถวมี data-row-key = EN) */
export function erListRow(page: Page, en: string): Locator {
  return page.getByRole('main').locator(`tr.ant-table-row[data-row-key="${en}"]`).filter({ visible: true });
}

/** ช่องของแถวตามชื่อหัวคอลัมน์ (เช่น "ชื่อ-สกุล", "สถานะ", "จัดการ") */
export async function erListCell(page: Page, row: Locator, header: string): Promise<Locator> {
  const headers = (await page.getByRole('main').locator('thead').filter({ visible: true }).first().locator('th').allInnerTexts()).map((text) => text.trim());
  const index = headers.indexOf(header);
  if (index < 0) throw new Error(`ตารางรายการผู้ป่วย ER ไม่มีคอลัมน์ "${header}" (มี: ${headers.join(' | ')})`);
  return row.locator('td').nth(index);
}

/** ข้อความ "ไม่มีข้อมูล" ของตารางที่ไม่มีแถว */
export function erListEmpty(page: Page): Locator {
  return page.getByRole('main').locator('.ant-table-placeholder').filter({ visible: true });
}

/** ปุ่ม `จำหน่าย` ในแถว (คอลัมน์ จัดการ) — มีเฉพาะผู้ป่วยในแท็บ รอจำหน่าย · กดแล้วขึ้นกล่องยืนยัน ยังไม่จำหน่ายทันที */
export function erDischargeButton(row: Locator): Locator {
  return row.getByRole('button', { name: 'จำหน่าย', exact: true });
}

/** กล่องยืนยัน "ยืนยันการจำหน่ายผู้ป่วยออกจาก ER หรือไม่" (ปุ่ม `ยกเลิก` / `จำหน่าย`) — กด `จำหน่าย` = ยิง graphql DischargeEncounterStatus */
export function erDischargeConfirm(page: Page): Locator {
  return page.locator('.ant-popconfirm').filter({ visible: true });
}
