import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { expectOk, waitForApi, type ErVisit } from './er';

// หลัง Triage: แพทย์ Acknowledge (เริ่มรักษา) และจำหน่ายผู้ป่วย ER (Disposition → ลงนาม) — ตรวจกับ dev-x 29 ก.ย. 2026 (การ์ด SBH-1401)

/**
 * ปุ่ม Acknowledge ตัวแรกใน ER Physician Note (ส่วน MEWS — มีอีกหลายปุ่มของ GCS / Fast Track)
 * กดแล้วระบบบันทึกเวลาเริ่มรักษา = Treatment_at ของ Door-to-doc
 */
export function acknowledgeButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'Acknowledge' }).first();
}

/** กด Acknowledge → PATCH …/treatment-start · คืน startedTreatmentAt (ละเอียดระดับวินาที) */
export async function acknowledgeTreatment(page: Page, visit: ErVisit): Promise<string> {
  const button = acknowledgeButton(page);
  await expect(button).toBeVisible();
  const started = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/treatment-start`);
  await button.click();
  const res = await started;
  await expectOk(res, `Acknowledge (เริ่มรักษา) ${visit.en}`);
  const body = (await res.json()) as { startedTreatmentAt: string };
  await expect(page.getByRole('main').getByText(/^Acknowledged โดย/).first()).toBeVisible();
  return body.startedTreatmentAt;
}

export type DispositionMethod = 'With Approval' | 'By Transfer';

/** ข้อมูลใบสรุปจำหน่าย ER จาก graphql (ErDischargeSummaryFields) */
export interface ErDischargeSummary {
  en: string;
  statusCode: 'DRAFT' | 'COMPLETE' | string;
  dischargeTypeCode: string | null;
  completedAt: string | null;
  completedBy?: { id: string; display: string } | null;
  /** เวลาที่บันทึกล่าสุด (ละเอียดระดับวินาที) และผู้บันทึก */
  updatedAt?: string;
  updatedBy?: { id: string; display: string } | null;
}

/** รอ response ของ graphql mutation ตามชื่อ — เริ่มรอก่อนกดปุ่มที่ยิง */
export function graphqlMutation(page: Page, name: string, timeout?: number): Promise<Response> {
  return page.waitForResponse(
    (res) => res.request().method() === 'POST' && res.url().endsWith('/cortex-api/graphql') && (res.request().postData() ?? '').includes(`mutation ${name}`),
    { timeout },
  );
}

async function summaryOf(res: Response, field: string, what: string): Promise<ErDischargeSummary> {
  await expectOk(res, what);
  const body = (await res.json()) as { data?: Record<string, ErDischargeSummary>; errors?: unknown };
  const summary = body.data?.[field];
  if (!summary) throw new Error(`${what}: ไม่เจอ ${field} ใน response ${JSON.stringify(body).slice(0, 400)}`);
  return summary;
}

/** แท็บ "การจำหน่ายผู้ป่วย ER" (เมนู Disposition ในแถบขวา) */
export async function openDisposition(page: Page) {
  // แถบเมนูขวากางทับกันเองตอนเมาส์ชี้ → force
  await page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: 'Disposition' }).click({ force: true });
  const main = page.getByRole('main');
  const heading = main.getByText('สรุปการจำหน่าย', { exact: true });
  await expect(heading).toBeVisible();
  // แถบเมนูขวากางค้างบังปุ่ม "เริ่มจำหน่าย" มุมขวาบน → คลิกเนื้อหาให้หุบ แล้วย้ายเมาส์ออก
  await heading.click();
  await page.mouse.move(600, 600);
}

/**
 * ในแท็บจำหน่าย: เริ่มจำหน่าย → สถานะ Improved + วิธีจำหน่ายที่เลือก → ช่องบังคับ → บันทึกฉบับร่าง
 * คืนใบสรุปสถานะ DRAFT (ยังไม่ลงนาม)
 */
export async function draftDisposition(page: Page, method: DispositionMethod, text = 'ทดสอบ automate SBH-1401'): Promise<ErDischargeSummary> {
  const main = page.getByRole('main');
  const started = graphqlMutation(page, 'StartErDischarge');
  await page.getByTestId('er-disposition-start').click();
  await summaryOf(await started, 'startErDischarge', 'เริ่มจำหน่าย');
  await main.getByRole('radio', { name: 'Improved', exact: true }).check();
  await main.getByRole('radio', { name: method, exact: true }).check();
  await main.getByRole('textbox', { name: 'ระบุข้อมูลทางคลินิกและการดำเนินโรค' }).fill(text);
  await main.getByRole('textbox', { name: 'ระบุผลการตรวจเพิ่มเติม' }).fill(text);
  const draft = await saveDispositionDraft(page);
  await expect(page.getByTestId('er-disposition-finalize')).toBeEnabled();
  return draft;
}

/** ช่องข้อความยาว 2 ช่องของฟอร์ม Disposition (บังคับทั้งคู่ก่อนลงนาม) */
export function dispositionTextBoxes(page: Page) {
  const main = page.getByRole('main');
  return {
    clinical: main.getByRole('textbox', { name: 'ระบุข้อมูลทางคลินิกและการดำเนินโรค' }),
    finding: main.getByRole('textbox', { name: 'ระบุผลการตรวจเพิ่มเติม' }),
  };
}

/** กด `เริ่มจำหน่าย` (ฟอร์มที่ยังไม่เคยเริ่ม) → ใบสรุปสถานะ DRAFT ฉบับแรก */
export async function startDisposition(page: Page): Promise<ErDischargeSummary> {
  const started = graphqlMutation(page, 'StartErDischarge');
  await page.getByTestId('er-disposition-start').click();
  const summary = await summaryOf(await started, 'startErDischarge', 'เริ่มจำหน่าย');
  await expect(page.getByRole('main').getByRole('radio', { name: 'Improved', exact: true })).toBeEnabled();
  return summary;
}

/**
 * หัวข้อ การวินิจฉัย ของฟอร์ม Disposition: แถวที่ยังว่าง (ค้นหา ICD10) → พิมพ์รหัสแล้วเลือก · มีรหัสอยู่แล้วไม่ทำอะไร
 * SBH Prod (5 ต.ค. 2026): ช่อง ICD10 ว่างแล้วปุ่มลงนามกดไม่ได้ · คืน locator ของแถวรหัสที่เลือก (ไว้ตีกรอบ)
 */
export async function chooseDispositionDiagnosis(page: Page, code = 'K30'): Promise<Locator> {
  const main = page.getByRole('main');
  const chosen = main.locator('.ant-select').filter({ hasText: new RegExp(`^${code} - `) }).first();
  const empty = main.getByText('ค้นหา ICD10', { exact: true }).first();
  if (!(await chosen.count()) && (await empty.isVisible())) {
    // ข้อความ placeholder ทับช่องพิมพ์ → คลิกแบบ force แล้วพิมพ์ทีละตัวให้ระบบค้น
    await empty.click({ force: true });
    await page.keyboard.type(code, { delay: 60 });
    const option = page.locator(`.ant-select-dropdown:visible .ant-select-item-option[title^="${code} - "]`).first();
    await expect(option).toBeVisible();
    await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
  }
  await expect(chosen, `หัวข้อ การวินิจฉัย ต้องมีรหัส ${code}`).toBeVisible();
  return chosen;
}

/** ปุ่ม `บันทึกฉบับร่าง` → ใบสรุปสถานะ DRAFT (มี updatedAt / updatedBy ของการบันทึกครั้งนี้) */
export async function saveDispositionDraft(page: Page): Promise<ErDischargeSummary> {
  const saved = graphqlMutation(page, 'SaveErDischargeDraft', 60_000);
  saved.catch(() => undefined);
  await page.getByTestId('er-disposition-save-draft').click();
  const draft = await summaryOf(await saved, 'saveErDischargeDraft', 'บันทึกฉบับร่างการจำหน่าย');
  expect(draft.statusCode).toBe('DRAFT');
  return draft;
}

/** ปุ่มลงนาม (R20) → ถ้าเด้ง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" กด "ลงนามต่อ" → คืนใบสรุปสถานะ COMPLETE พร้อม completedAt */
export async function signDisposition(page: Page): Promise<ErDischargeSummary> {
  // กดลงนามแล้วหน้าเว็บบันทึกฉบับร่างก่อน แล้วค่อยส่งคำสั่งลงนาม (SBH Prod ช้าเป็นพักๆ) → รอนานกว่าค่าตั้งต้น
  const finalized = graphqlMutation(page, 'FinalizeErDischarge', 90_000);
  finalized.catch(() => undefined);
  await page.getByTestId('er-disposition-finalize').click();
  const proceed = page.getByRole('button', { name: 'ลงนามต่อ' });
  await Promise.race([finalized, proceed.waitFor({ state: 'visible', timeout: 30_000 })]).catch(() => undefined);
  if (await proceed.isVisible()) await proceed.click();
  const summary = await summaryOf(await finalized, 'finalizeErDischarge', 'ลงนามการจำหน่าย');
  expect(summary.statusCode, 'ลงนามแล้วใบสรุปต้องเป็น COMPLETE').toBe('COMPLETE');
  await expect(page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว')).toBeVisible();
  return summary;
}

// ---------------------------------------------------------------------------------------------
// ประวัติ Disposition (การ์ด SBH-2462) — ปุ่มไอคอนบนหัวฟอร์ม → popover รายการ เริ่มบันทึก / บันทึกฉบับร่าง / ลงนาม / เปิดแก้ไข (ใหม่สุดอยู่บน)
// ตรวจกับ SBH Prod 8 ต.ค. 2026 · dev-x มีปุ่มแล้วแต่ API ยังไม่มี query erDischargeSummaryHistory (popover ขึ้น "ไม่สามารถโหลดประวัติ Disposition ได้")

/** ป้ายการกระทำที่ popover แสดง ตามรหัส action ของ API */
export const DISPOSITION_HISTORY_ACTIONS: Record<string, string> = { STARTED: 'เริ่มบันทึก', SAVED_DRAFT: 'บันทึกฉบับร่าง', SIGNED: 'ลงนาม', REOPENED: 'เปิดแก้ไข' };
export const DISPOSITION_LATEST_SIGNED = 'ฉบับที่ลงนามล่าสุด';

/** 1 รายการในประวัติจาก API (query erDischargeSummaryHistory) */
export interface DispositionHistoryRecord {
  id: string;
  action: string;
  actor: { id: string; display: string } | null;
  occurredAt: string;
  sourceRevisionRefs: string[];
  isLatestSigned: boolean;
  /** ค่าของฟอร์มที่บันทึกไว้ในฉบับนี้ (ที่หน้าต่าง ดูฟอร์ม แสดง) */
  snapshot?: {
    version: number;
    hn: string;
    statusCode: string;
    dischargeStatusCode: string | null;
    dischargeTypeCode: string | null;
    clinicInformation: string | null;
    investigationFinding: string | null;
  } | null;
}

/** 1 รายการในประวัติตามที่ popover แสดง */
export interface DispositionHistoryRow {
  /** ป้ายการกระทำ เช่น "ลงนาม" */
  action: string;
  /** มีป้าย "ฉบับที่ลงนามล่าสุด" */
  latestSigned: boolean;
  actor: string;
  /** วันเวลาที่แสดง "DD/MM/พ.ศ., HH:mm" */
  time: string;
}

/** ปุ่มไอคอน `ดูประวัติ Disposition` บนหัวฟอร์ม (อยู่หน้าปุ่ม บันทึกฉบับร่าง / ลงนาม / เปิดแก้ไข — ยังไม่กดเริ่มจำหน่ายจะไม่มีปุ่มนี้) */
export function dispositionHistoryButton(page: Page): Locator {
  return page.getByTestId('er-disposition-history');
}

/** popover `ประวัติ Disposition` ที่เปิดอยู่ */
export function dispositionHistoryPopover(page: Page): Locator {
  return page.locator('.ant-popover:visible').getByRole('dialog', { name: 'ประวัติ Disposition' });
}

/** แต่ละรายการใน popover (เรียงตามที่แสดง — ใหม่สุดอยู่บน) */
export function dispositionHistoryEntries(popover: Locator): Locator {
  return popover.locator('[class*="_entry_"]');
}

/** กดปุ่มประวัติ → popover โหลดเสร็จ (ไม่ค้างที่ "กำลังโหลดประวัติ…") */
export async function openDispositionHistory(page: Page): Promise<Locator> {
  const popover = dispositionHistoryPopover(page);
  // dev-x (12 ต.ค. 2026): เปิด popover ทันทีหลังปิดหน้าต่างฟอร์มย้อนหลัง แล้ว popover หุบเองภายใน ~1 วินาที → เปิดซ้ำจนอยู่นิ่ง
  await expect(async () => {
    if (!(await popover.isVisible())) await dispositionHistoryButton(page).click();
    await expect(popover).toBeVisible({ timeout: 5_000 });
    await expect(popover.getByText('กำลังโหลดประวัติ…')).toBeHidden({ timeout: 45_000 });
    const closedItself = await expect(popover).toBeHidden({ timeout: 1_500 }).then(() => true, () => false);
    expect(closedItself, 'popover ประวัติ Disposition ต้องเปิดค้างอยู่').toBe(false);
  }, 'เปิด popover ประวัติ Disposition').toPass({ timeout: 90_000 });
  return popover;
}

export async function closeDispositionHistory(page: Page) {
  const popover = dispositionHistoryPopover(page);
  // dev-x (12 ต.ค. 2026): ปิดหน้าต่างฟอร์มย้อนหลังแล้ว popover ประวัติเด้งกลับมาเปิดเอง (ช้ากว่าหน้าต่างปิดเล็กน้อย) → ปิดซ้ำจนไม่กลับมา
  await expect(async () => {
    if (await popover.isVisible()) await popover.getByRole('button', { name: 'ปิดประวัติ' }).click();
    await expect(popover).toBeHidden({ timeout: 5_000 });
    const reopened = await expect(popover).toBeVisible({ timeout: 1_500 }).then(() => true, () => false);
    expect(reopened, 'popover ประวัติ Disposition ต้องปิดค้างอยู่').toBe(false);
  }, 'ปิด popover ประวัติ Disposition').toPass({ timeout: 60_000 });
}

/** อ่านรายการทั้งหมดใน popover */
export async function readDispositionHistory(popover: Locator): Promise<DispositionHistoryRow[]> {
  return dispositionHistoryEntries(popover).evaluateAll((entries, latest) =>
    entries.map((entry) => {
      const tags = [...entry.querySelectorAll('.ant-tag')].map((tag) => (tag.textContent ?? '').trim());
      return {
        action: tags.find((tag) => tag !== latest) ?? '',
        latestSigned: tags.includes(latest),
        actor: (entry.querySelector('[class*="_actor_"]')?.textContent ?? '').trim(),
        time: (entry.querySelector('[class*="_time_"]')?.textContent ?? '').trim(),
      };
    }), DISPOSITION_LATEST_SIGNED);
}

/** ประวัติของ Encounter จาก API (query อ่านอย่างเดียว) — ลองใหม่เมื่อระบบตอบพลาดชั่วคราว */
export async function fetchDispositionHistory(page: Page, authorization: () => string, en: string): Promise<DispositionHistoryRecord[]> {
  const query =
    'query ErDischargeSummaryHistory($en: String!) { erDischargeSummaryHistory(en: $en) { id action actor { id display } occurredAt sourceRevisionRefs isLatestSigned ' +
    'snapshot { version hn statusCode dischargeStatusCode dischargeTypeCode clinicInformation investigationFinding } } }';
  let records: DispositionHistoryRecord[] | undefined;
  await expect(async () => {
    const res = await page.request.post('/cortex-api/graphql', { headers: { authorization: authorization() }, data: { operationName: 'ErDischargeSummaryHistory', query, variables: { en } } });
    const body = (await res.json().catch(() => ({}))) as { data?: { erDischargeSummaryHistory?: DispositionHistoryRecord[] }; errors?: { message: string }[] };
    expect(body.data?.erDischargeSummaryHistory, `อ่านประวัติ Disposition ของ ${en} จาก API: HTTP ${res.status()} ${JSON.stringify(body.errors ?? '').slice(0, 300)}`).toBeTruthy();
    records = body.data!.erDischargeSummaryHistory!;
  }).toPass({ timeout: 60_000, intervals: [2_000, 4_000, 8_000] });
  return records!;
}

/** เวลา ISO → รูปแบบที่ popover แสดง "DD/MM/พ.ศ., HH:mm" (เวลาไทย ตัดวินาทีทิ้ง) */
export function dispositionHistoryTime(iso: string): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month}/${Number(parts.year) + 543}, ${parts.hour}:${parts.minute}`;
}

/** รายการจาก API → แถวที่หน้าจอควรแสดง */
export function expectedDispositionHistoryRow(record: DispositionHistoryRecord): DispositionHistoryRow {
  return {
    action: DISPOSITION_HISTORY_ACTIONS[record.action] ?? 'บันทึกข้อมูล',
    latestSigned: record.isLatestSigned,
    actor: record.actor?.display?.trim() || 'ไม่ระบุผู้ทำ',
    time: dispositionHistoryTime(record.occurredAt),
  };
}

/** ข้อความสั้นของ 1 รายการ (ไว้แสดงในตารางเทียบ / ข้อความ error) */
export function describeDispositionHistoryRow(row: DispositionHistoryRow): string {
  return `${row.action}${row.latestSigned ? ` [${DISPOSITION_LATEST_SIGNED}]` : ''} · ${row.actor} · ${row.time}`;
}

// ลิงก์ `ดูฟอร์ม` ใต้แต่ละรายการ → หน้าต่าง "ฟอร์ม Disposition ย้อนหลัง (อ่านอย่างเดียว)" แสดงค่าของฟอร์มที่บันทึกไว้ในฉบับนั้น (SBH Prod 8 ต.ค. 2026 รุ่น index-Dnpo7rk7)
// กดแล้ว popover ประวัติปิดเอง · ไม่รวม การวินิจฉัย / หัตถการ / นัดหมาย (หน้าต่างเขียนบอกไว้) · ช่องที่ว่างแสดง "ไม่ได้บันทึก"

/** หน้าต่างฟอร์มย้อนหลังที่เปิดอยู่ */
export function dispositionHistoryForm(page: Page): Locator {
  return page.getByRole('dialog', { name: 'ฟอร์ม Disposition ย้อนหลัง (อ่านอย่างเดียว)' });
}

/** ลิงก์ `ดูฟอร์ม` ของรายการในประวัติ */
export function dispositionHistoryFormLink(entry: Locator): Locator {
  return entry.getByRole('button', { name: 'ดูฟอร์ม' });
}

/** กด `ดูฟอร์ม` ของรายการ → หน้าต่างฟอร์มย้อนหลังโหลดเสร็จ */
export async function openDispositionHistoryForm(page: Page, entry: Locator): Promise<Locator> {
  const dialog = dispositionHistoryForm(page);
  // popover หุบไปก่อนกด (dev-x) → เปิดใหม่แล้วกดอีกครั้ง
  await expect(async () => {
    await openDispositionHistory(page);
    await dispositionHistoryFormLink(entry).click({ timeout: 5_000 });
    await expect(dialog.locator('.ant-descriptions')).toBeVisible({ timeout: 15_000 });
  }, 'กด ดูฟอร์ม ของรายการในประวัติ').toPass({ timeout: 90_000 });
  await expect(dialog.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 30_000 });
  return dialog;
}

/** อ่านทุกช่องของหน้าต่างฟอร์มย้อนหลัง → { ชื่อช่อง: ค่า } (ชื่อช่องซ้ำใช้ตัวแรก) */
export async function readDispositionHistoryForm(dialog: Locator): Promise<Record<string, string>> {
  const pairs = await dialog.locator('tr.ant-descriptions-row').evaluateAll((rows) =>
    rows.map((row) => [(row.querySelector('th')?.textContent ?? '').trim(), (row.querySelector('td')?.textContent ?? '').trim()] as [string, string]),
  );
  const fields: Record<string, string> = {};
  for (const [label, value] of pairs) if (label && !(label in fields)) fields[label] = value;
  return fields;
}

export async function closeDispositionHistoryForm(page: Page) {
  const dialog = dispositionHistoryForm(page);
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.ant-modal-wrap:visible')).toHaveCount(0); // รอ animation ปิดจบ ก่อนเปิด popover ประวัติอีกครั้ง
}
