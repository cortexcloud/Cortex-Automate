import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { expectOk } from './er';
import { graphqlMutation } from './er-disposition';

// หัตถการ (Activity) ของผู้ป่วยนอก — การ์ด SBH-1103 (dev-x 15 ต.ค. 2026 · ไฟล์แอป index-CXpiAxVc.js)
// รายการผู้ป่วยนอก: คอลัมน์ PROC = ไอคอนสถานะหัตถการ (component ActivityTaskItemStatus) · วางเมาส์ขึ้น tooltip "สถานะหัตถการ / คลิกเพื่อดูรายละเอียด"
// คลิกแล้วขึ้น popover "สถานะหัตถการ": ชื่อหัตถการ + ป้ายสถานะ + "เวลาที่ต้องทำ: …" + "Accession no.: …" (ไม่มีรายการ = "ไม่พบรายการหัตถการ")
// หน้าหัตถการ: /cortex/activity/select-location (เลือกห้อง) → /cortex/activity/task-list · ปุ่มในแถว เช็คอิน / ปฏิเสธ → (หลังเช็คอิน) ทำแล้ว

const dropdownOptions = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');

/** ป้ายสถานะของงานหัตถการ (locale activity.json `taskStatus.*`) */
export const ACTIVITY_STATUS_LABEL: Record<string, string> = {
  INITIATED: 'รอ Check-in',
  IN_PROGRESS: 'กำลังดำเนินการ',
  PERFORMED: 'ทำแล้ว',
  REPORTED: 'รายงานผลแล้ว',
  HOLD: 'พักไว้',
  CANCELLED: 'ยกเลิก',
};

/** สีไอคอนที่ควรเป็นตามสถานะงาน (resolveActivityTaskSummaryTone ของไฟล์แอป): มีงานค้าง = ส้ม · ทำแล้ว = เหลือง · รายงานผลครบ = เขียว · ไม่มีงาน = เทา */
export function expectedActivityTone(statuses: string[]): 'orange' | 'yellow' | 'green' | 'gray' {
  const s = statuses.map((x) => x.toUpperCase());
  if (s.length && s.every((x) => x === 'REPORTED')) return 'green';
  if (s.some((x) => ['INITIATED', 'IN_PROGRESS', 'HOLD'].includes(x))) return 'orange';
  if (s.includes('PERFORMED')) return 'yellow';
  return 'gray';
}

/** หน้าเลือกสถานที่ผู้ป่วยนอก: หน่วยบริการ + ช่องบริการ → ส่ง (ค่าเก็บใน localStorage — เบราว์เซอร์ของเทสต้องเลือกใหม่ทุกครั้ง) */
export async function selectOpdUnit(page: Page, unit = 'แผนกอายุรกรรม', counter = 'ก่อนตรวจ') {
  const main = page.getByRole('main');
  await page.goto('/cortex/opd/select-service-unit');
  await main.getByRole('combobox').first().fill(unit);
  await dropdownOptions(page).filter({ hasText: new RegExp(`^${unit}$`) }).click();
  // ช่องที่ 2 เปิดเร็วไป (dropdown ของช่องแรกยังปิดไม่สนิท) ตัวเลือกไม่ติด → เลือกซ้ำจนปุ่ม "ส่ง" กดได้
  await expect(async () => {
    await main.locator('.ant-select').nth(1).click();
    await dropdownOptions(page).filter({ hasText: new RegExp(`^${counter}$`) }).click({ timeout: 3_000 });
    await expect(page.getByRole('button', { name: 'ส่ง' })).toBeEnabled({ timeout: 3_000 });
  }, `เลือกหน่วยบริการ ${unit} / ${counter}`).toPass({ timeout: 40_000 });
  await page.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/\/opd\/patient-list/);
}

/** รายการผู้ป่วยนอก แท็บ "ทั้งหมด" ค้นด้วย HN (วันที่ตั้งต้น = วันนี้ · ตัวกรองแพทย์ตั้งต้น = ผู้ที่ล็อกอิน) → แถวของผู้ป่วย */
export async function opdListRow(page: Page, hn: string, opts: { anyDoctor?: boolean } = {}): Promise<Locator> {
  const main = page.getByRole('main');
  if (!/\/opd\/patient-list/.test(page.url())) await selectOpdUnit(page);
  const search = main.getByPlaceholder('ค้นหา HN');
  await search.waitFor({ timeout: 120_000 });
  const row = main.locator('tr.ant-table-row').filter({ hasText: `HN ${hn}` }).first();
  await expect(async () => {
    // Visit ที่แพทย์ไม่ใช่ผู้ที่ล็อกอิน (openOpdVisit anyDoctor) → เอา chip ตัวกรองแพทย์ตั้งต้นออก (ขึ้นช้ากว่าหน้า · ปุ่มลบมีตัวซ่อนซ้อน — ใช้ตัวที่มองเห็น)
    if (opts.anyDoctor) {
      const remove = main.locator('.ant-select-selection-item-remove').filter({ visible: true });
      await remove.first().waitFor({ timeout: 5_000 }).catch(() => undefined);
      for (let i = 0; i < 3 && (await remove.count()); i++) {
        await remove.first().click();
        await page.waitForTimeout(800);
      }
    }
    await main.getByRole('tab', { name: /^ทั้งหมด/ }).click();
    await search.fill(hn);
    await search.press('Enter');
    await expect(row).toBeVisible({ timeout: 15_000 });
  }, `ต้องเห็นแถวของ HN ${hn} ในรายการผู้ป่วยนอก`).toPass({ timeout: 90_000 });
  return row;
}

/** ปุ่ม "เช็คอิน" ในคอลัมน์จัดการของแถว (ช่องสถานะบนแถบหัวของหน้าผู้ป่วยถูกปิดไว้บน dev-x รุ่นนี้) */
export async function checkInFromOpdList(page: Page, row: Locator): Promise<Response> {
  const button = row.getByRole('button', { name: /เช็คอิน$/ });
  const mutated = page.waitForResponse((res) => res.url().endsWith('/cortex-api/graphql') && /mutation\s+\w*CheckIn/i.test(res.request().postData() ?? ''), { timeout: 60_000 });
  mutated.catch(() => undefined);
  await button.click();
  const dialog = page.getByRole('dialog').filter({ visible: true });
  if (await dialog.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    const radio = dialog.first().getByRole('radio');
    if (await radio.count()) await radio.first().check();
    await dialog.first().getByRole('button', { name: /^(ยืนยัน|ตกลง|เช็คอิน)$/ }).click();
  }
  const res = await mutated;
  await expectOk(res, 'เช็คอิน Visit OPD');
  const body = (await res.json()) as { errors?: { message: string }[] };
  expect(body.errors, `เช็คอิน Visit OPD ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBeUndefined();
  // ปุ่มหมุนอยู่ชั่วครู่ แล้วสถานะในแถวเปลี่ยนจาก "รอเช็คอิน" เป็น "เช็คอิน"
  await expect(row, 'เช็คอินแล้วสถานะในแถวต้องไม่ใช่ "รอเช็คอิน"').not.toContainText('รอเช็คอิน', { timeout: 30_000 });
  return res;
}

export const activityIcon = (row: Locator) => row.getByTestId('activity-task-item-status-icon');
export const activityTrigger = (row: Locator) => row.getByRole('button', { name: 'สถานะหัตถการ' });
export const activityTooltip = (page: Page) => page.locator('.ant-tooltip:visible').filter({ hasText: 'สถานะหัตถการ' }).last();
export const activityPopover = (page: Page) => page.locator('.ant-popover:visible').filter({ hasText: 'สถานะหัตถการ' }).last();

/** สีพื้นของไอคอน → ชื่อโทน (CSS variable ของแอป: --cx-orange-5 / --cx-yellow-5 / --cx-color-success · ไม่มีงาน = fill-secondary) */
export async function activityIconTone(row: Locator): Promise<{ tone: string; style: string }> {
  return activityIcon(row).evaluate((el) => {
    const style = (el as HTMLElement).style.backgroundColor;
    const tone = /orange/.test(style) ? 'orange' : /yellow/.test(style) ? 'yellow' : /success|green/.test(style) ? 'green' : 'gray';
    return { tone, style };
  });
}

export interface ActivityPopoverItem {
  name: string;
  status: string;
  serviceDue: string;
  accessionNo: string;
}

/** อ่าน popover "สถานะหัตถการ" ที่เปิดอยู่: ทีละรายการ (ชื่อ · ป้ายสถานะ · เวลาที่ต้องทำ · Accession no.) */
export async function readActivityPopover(page: Page): Promise<{ empty: boolean; items: ActivityPopoverItem[]; text: string }> {
  const pop = activityPopover(page);
  await expect(pop).toBeVisible();
  // รอให้โหลดจบ (Spin หาย) ก่อนอ่าน
  await expect(pop.locator('.ant-spin')).toHaveCount(0, { timeout: 20_000 });
  const text = (await pop.innerText()).trim();
  const items = await pop.locator('.ant-tag').evaluateAll((tags) =>
    tags.map((tag) => {
      // tag อยู่ในแถวบนของรายการ → ขึ้นไป 2 ชั้นถึงกล่องของรายการ
      const item = tag.parentElement?.parentElement as HTMLElement;
      const lines = item.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
      const after = (label: string) => lines.find((l) => l.startsWith(label))?.split(':').slice(1).join(':').trim() ?? '';
      return { name: tag.previousElementSibling?.textContent?.trim() ?? lines[0], status: tag.textContent?.trim() ?? '', serviceDue: after('เวลาที่ต้องทำ'), accessionNo: after('Accession no.') };
    }),
  );
  return { empty: /ไม่พบรายการหัตถการ/.test(text), items, text };
}

/** แผงคำสั่งการรักษาของหน้าผู้ป่วย OPD: ค้นรหัส → เลือก → เพิ่มลงตะกร้า → ส่งคำสั่ง (คืนคำตอบของ SignOPDOrders) */
export async function orderFromOpdPanel(page: Page, code: string, beforeSend?: (send: Locator) => Promise<void>): Promise<Response> {
  const main = page.getByRole('main');
  const search = main.getByPlaceholder(/ค้นหา ยา, เวชภัณฑ์/);
  await search.waitFor({ timeout: 90_000 });
  const cartRow = main.getByRole('row').filter({ hasText: `[${code}]` }).first();
  if (!(await cartRow.isVisible().catch(() => false))) {
    await search.click();
    await search.fill(code);
    // dropdown มี role=option ขนาด 0px ซ่อนอยู่ (ค่า order-<รหัส>) → กดตัวที่มองเห็น (.ant-select-item-option)
    const option = dropdownOptions(page).filter({ hasText: `[${code}]` }).first();
    await expect(option, `ต้องค้นเจอรายการรหัส ${code}`).toBeVisible({ timeout: 30_000 });
    await option.click();
    let added: Response | undefined;
    await expect(async () => {
      const upserted = graphqlMutation(page, 'UpsertOpdOrder', 8_000);
      upserted.catch(() => undefined);
      await page.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).filter({ visible: true }).first().click();
      added = await upserted;
    }, `กด "เพิ่มลงตะกร้า" ของ ${code} แล้วต้องมีการบันทึกรายการ`).toPass({ timeout: 40_000 });
    await expectOk(added!, `เพิ่ม ${code} ลงตะกร้า`);
  }
  // หลังเพิ่ม แผงคำสั่งโหลดใหม่ 1 รอบ → รอแถวในตะกร้าขึ้นก่อนกดส่ง
  await expect(cartRow, `รายการ ${code} ต้องขึ้นในตะกร้า`).toBeVisible({ timeout: 60_000 });
  const send = main.getByRole('button', { name: /ส่งคำสั่ง/ }).first();
  await expect(send).toBeEnabled({ timeout: 30_000 });
  await beforeSend?.(send);
  const signed = graphqlMutation(page, 'SignOPDOrders', 60_000);
  await send.click();
  const res = await signed;
  await expectOk(res, 'ส่งคำสั่ง');
  const body = (await res.json()) as { data?: { signOPDOrders?: { accepted?: boolean } }; errors?: { message: string }[] };
  expect(body.data?.signOPDOrders?.accepted, `ส่งคำสั่งไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ') ?? JSON.stringify(body)}`).toBe(true);
  return res;
}

/** หน้าหัตถการ (Activity task list) ของห้องที่เลือก */
export async function gotoActivityTaskList(page: Page, room: string) {
  const main = page.getByRole('main');
  await page.goto('/cortex/activity/select-location');
  const combo = main.getByRole('combobox').first();
  await combo.waitFor({ timeout: 120_000 });
  await combo.click();
  await dropdownOptions(page).filter({ hasText: new RegExp(`^${room}$`) }).click();
  await page.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/\/activity\/task-list/, { timeout: 60_000 });
}

export function activityTaskRow(page: Page, hn: string): Locator {
  return page.getByRole('main').locator('tr.ant-table-row').filter({ hasText: hn }).first();
}

/** ปุ่มในแถวของหน้าหัตถการ — ชื่อมีชื่อไอคอนนำหน้า (เช่น "check-circle เช็คอิน") จึงจับด้วยคำท้าย */
export function activityTaskButton(row: Locator, action: string): Locator {
  return row.getByRole('button', { name: new RegExp(`${action}$`) });
}

/**
 * กดปุ่มทำงานในแถวของหน้าหัตถการ (เช่น "เช็คอิน" · "ทำแล้ว") → หน้าต่างชื่อเดียวกับปุ่ม (เช็คอินต้องเลือก "ประเภทคิว" ก่อน ปุ่มยืนยันถึงกดได้)
 * → คืนคำตอบของ POST /cortex-api/activity-tasks/status · `beforeConfirm` ไว้ถ่ายภาพ "ก่อนกด"
 */
export async function runActivityTaskAction(page: Page, row: Locator, action: string, beforeConfirm?: (dialog: Locator, confirm: Locator) => Promise<void>): Promise<Response> {
  const updated = page.waitForResponse((res) => res.request().method() === 'POST' && new URL(res.url()).pathname.endsWith('/activity-tasks/status'), { timeout: 60_000 });
  updated.catch(() => undefined);
  await activityTaskButton(row, action).click();
  const dialog = page.getByRole('dialog', { name: action });
  if (await dialog.isVisible({ timeout: 4_000 }).catch(() => false)) {
    const radio = dialog.getByRole('radio');
    if (await radio.count()) await radio.first().check();
    const confirm = dialog.getByRole('button', { name: /^(ยืนยัน|ตกลง|บันทึก|ทำแล้ว)$/ }).last();
    await expect(confirm).toBeEnabled({ timeout: 10_000 });
    await beforeConfirm?.(dialog, confirm);
    await confirm.click();
  }
  return updated;
}

export interface ActivityTaskInfo {
  id: number;
  vn: string;
  en: string | null;
  latestStatusCode: string;
  items: { name: string; latestStatusCode: string; serviceDue: string | null; accessionNo: string | null; en: string | null }[];
}

/** งานหัตถการของผู้ป่วยตาม HN / VN (graphql query activityTasks — อ่านอย่างเดียว) */
export async function fetchActivityTasks(page: Page, authorization: string, filter: { hn: string; vn?: string; en?: string }): Promise<ActivityTaskInfo[]> {
  const res = await page.request.post('/cortex-api/graphql', {
    headers: { authorization },
    data: {
      query: 'query($f: ActivityTaskFilterInput, $p: PaginationInput){ activityTasks(filter:$f, pagination:$p){ data{ id vn en latestStatusCode items{ name latestStatusCode serviceDue accessionNo en } } } }',
      variables: { f: filter, p: { page: 1, perPage: 100 } },
    },
  });
  await expectOk(res, 'อ่านงานหัตถการ');
  const body = (await res.json()) as { data?: { activityTasks?: { data: ActivityTaskInfo[] } }; errors?: { message: string }[] };
  if (body.errors) throw new Error(`อ่านงานหัตถการไม่สำเร็จ: ${body.errors.map((e) => e.message).join(' · ')}`);
  return body.data?.activityTasks?.data ?? [];
}

/** เวลาแบบที่ popover แสดง (DD/MM/พ.ศ. HH:mm — formatDateTimeISOToDefaultTHDateTimeCompact) */
export function thaiDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear() + 543} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
