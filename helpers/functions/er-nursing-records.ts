import { expect, type Locator, type Page } from '@playwright/test';
import { expectOk } from './er';

// หน้า Nursing Records (เมนูขวาของหน้าผู้ป่วย ER และ IPD) — locator ตรวจกับหน้าจอจริงบน dev-x 12 ต.ค. 2026 (การ์ด SBH-2441)
// ER มี 2 ประเภทบันทึก: Nurse Focus Note · Graphical Sheet Record (IPD มี 9 ประเภท) · class ของแอปมี hash ต่อท้าย → จับด้วย [class*="_ชื่อ_"]

export const NURSE_FOCUS_NOTE = 'Nurse Focus Note';
export const GRAPHICAL_SHEET_RECORD = 'Graphical Sheet Record';

const careNav = (page: Page) => page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' });
const dropdownOptions = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');

/** เมนู Nursing Records ในแถบขวา (ER: กลุ่ม ER · IPD: กลุ่ม IPD) — แถบพับเป็นไอคอน ต้องชี้เมาส์ให้กางก่อนจึงเห็นชื่อ */
export function nursingRecordsMenu(page: Page): Locator {
  return careNav(page).getByRole('menuitem', { name: /Nursing Records$/ }).first();
}

/** หัวแผง Nursing Records ในแถบแท็บของหน้าผู้ป่วย (ER = erNursingRecords · IPD = nursingRecords) — ปุ่มปิดอยู่ใน `.dv-default-tab-action` */
export function nursingRecordsTab(page: Page): Locator {
  return page.locator('[data-testid="patient-dockview-tab"][data-panel-id$="ursingRecords"]');
}

/** ช่องเลือกประเภทบันทึกทางการพยาบาล (select ของ Ant Design) */
export function nursingRecordSelector(page: Page): Locator {
  return page.locator('[data-testid="nursing-record-selector"]');
}

/** กดเมนู Nursing Records จนแผงขึ้น (หน้าที่เพิ่งโหลดเปิดแผงตั้งต้นตามหลังแล้วทับ → กดซ้ำ) แล้วหุบแถบเมนู */
export async function openNursingRecords(page: Page) {
  const selector = nursingRecordSelector(page);
  await expect(async () => {
    await nursingRecordsMenu(page).click({ force: true });
    await expect(selector).toBeVisible({ timeout: 8_000 });
  }, 'เปิดแผง Nursing Records จากเมนูขวา').toPass({ timeout: 60_000 });
  await nursingRecordsTab(page).click({ timeout: 3_000 }).catch(() => undefined);
  await page.mouse.move(700, 700);
}

/** ปิดแผง Nursing Records ด้วยปุ่มปิดบนหัวแผง */
export async function closeNursingRecords(page: Page) {
  await nursingRecordsTab(page).locator('.dv-default-tab-action').click();
  await expect(nursingRecordsTab(page)).toHaveCount(0);
}

/** เปิดรายการประเภทบันทึก แล้วคืนชื่อตัวเลือกทั้งหมด (รายการยังเปิดค้างไว้ให้ถ่ายภาพ) */
export async function openRecordTypeOptions(page: Page): Promise<string[]> {
  const options = dropdownOptions(page);
  if (!(await options.first().isVisible().catch(() => false))) await nursingRecordSelector(page).click();
  await expect(options.first()).toBeVisible();
  return options.evaluateAll((els) => els.map((el) => el.getAttribute('title') ?? (el.textContent ?? '').trim()));
}

export function recordTypeDropdown(page: Page): Locator {
  return page.locator('.ant-select-dropdown:visible');
}

export async function chooseRecordType(page: Page, type: string) {
  await openRecordTypeOptions(page);
  await dropdownOptions(page).filter({ hasText: type }).first().click();
  await expect(nursingRecordSelector(page)).toContainText(type);
  await page.mouse.move(700, 700);
}

// ───── Nurse Focus Note ─────

export function nurseNoteTitle(page: Page): Locator {
  return page.getByRole('main').locator('[class*="_title_"]').filter({ hasText: /^Nurse Note$/ }).first();
}

export function nurseNoteTab(page: Page, name: 'Focus' | 'Resolved'): Locator {
  return page.getByRole('main').getByRole('tab', { name, exact: true });
}

export function nurseNotePanel(page: Page, name: 'Focus' | 'Resolved'): Locator {
  return page.getByRole('main').getByRole('tabpanel', { name });
}

export function addNurseNoteButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: '+ เพิ่ม Nurse Note' });
}

/** หน้าต่าง Nurse Note (Focus * · Assessment / Intervention / Evaluation + Perform time) */
export function nurseNoteDialog(page: Page): Locator {
  return page.getByRole('dialog').filter({ hasText: 'Assessment (A)' });
}

/** โครงของส่วน Nurse Note ตามที่หน้าจอแสดง — ใช้เทียบหน้า ER กับหน้า IPD */
export async function readNurseNoteLayout(page: Page): Promise<Record<string, string>> {
  const main = page.getByRole('main');
  const tabs = await main.getByRole('tab').evaluateAll((els) => els.filter((el) => (el as HTMLElement).offsetParent && /^(Focus|Resolved)$/.test((el.textContent ?? '').trim())).map((el) => ({ name: (el.textContent ?? '').trim(), selected: el.getAttribute('aria-selected') === 'true' })));
  return {
    'ประเภทที่เลือก': ((await nursingRecordSelector(page).innerText().catch(() => '')) || '(ไม่มี)').trim(),
    'หัวข้อของส่วน': (await nurseNoteTitle(page).innerText().catch(() => '(ไม่มี)')).trim(),
    'แท็บ': tabs.map((tab) => tab.name).join(' · ') || '(ไม่มี)',
    'แท็บที่เปิดอยู่': tabs.find((tab) => tab.selected)?.name ?? '(ไม่มี)',
    'ปุ่มเพิ่มบันทึก': (await addNurseNoteButton(page).count()) ? '+ เพิ่ม Nurse Note' : '(ไม่มี)',
  };
}

export interface NurseNoteInput {
  focus: string;
  assessment: string;
  intervention: string;
  evaluation: string;
}

/**
 * กรอกหน้าต่าง Nurse Note: Focus (พิมพ์เอง) + ข้อความ A / I / E + Perform time ของแต่ละช่อง (กดปุ่ม ตอนนี้ — ปฏิทินปิดเอง)
 * กรอก A / I / E แล้วไม่ใส่ Perform time ระบบขึ้น "กรุณาระบุ Perform time" · **ห้ามกด Escape** (ปิดทั้งหน้าต่าง)
 * คืนค่า Perform time ที่ช่องแสดง เรียง A, I, E
 */
export async function fillNurseNote(page: Page, note: NurseNoteInput): Promise<string[]> {
  const dialog = nurseNoteDialog(page);
  await dialog.locator('input#focus').fill(note.focus);
  await dialog.getByText('Assessment (A) :').click();
  const editors = dialog.locator('.ProseMirror');
  const parts: [string, string][] = [
    ['assessment', note.assessment],
    ['intervention', note.intervention],
    ['evaluation', note.evaluation],
  ];
  for (const [index, [key, text]] of parts.entries()) {
    await editors.nth(index).click();
    await page.keyboard.type(text, { delay: 15 });
    await dialog.locator(`input#${key}PerformTime`).click();
    const picker = page.locator('.ant-picker-dropdown:visible');
    await picker.locator('.ant-picker-now-btn').click();
    await expect(picker).toBeHidden();
  }
  return dialog.locator('input[id$="PerformTime"]').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
}

export interface NurseNoteSaveResult {
  /** คำตอบของขั้นแปลงฟอร์ม Focus (`…/transform-composition/flat-to-json?templateId=nursing_focus[_v2]`) — ไม่มีคำขอ = undefined */
  status?: number;
  template?: string;
  message: string;
  /** หน้าต่างปิดหลังกดบันทึกไหม (บันทึกไม่สำเร็จหน้าต่างค้างไว้) */
  closed: boolean;
  /** ข้อความแจ้งเตือนที่ขึ้นหลังกด */
  notices: string[];
}

export function nurseNoteNotice(page: Page): Locator {
  return page.locator('.ant-notification-notice:visible, .ant-message-notice:visible');
}

/**
 * กดปุ่ม บันทึก ของหน้าต่าง Nurse Note แล้วรอผล (หน้าต่างปิด หรือมีแจ้งเตือน) — ไม่ตัดสินผ่าน / ไม่ผ่าน ผู้เรียกตรวจจากค่าที่คืน
 * Focus ใหม่ = แปลงฟอร์ม `nursing_focus_v2` (Focus) ก่อน แล้ว `nursing_focus_note` (A-I-E) · เพิ่ม A-I-E ใน Focus เดิม = `nursing_focus_note` อย่างเดียว → จับคำตอบตัวแรก
 */
export async function saveNurseNote(page: Page): Promise<NurseNoteSaveResult> {
  const dialog = nurseNoteDialog(page);
  const transformed = page.waitForResponse((res) => res.request().method() === 'POST' && /\/transform-composition\/flat-to-json\?templateId=nursing_focus(_v\d+|_note)?$/.test(res.url()), { timeout: 30_000 }).catch(() => undefined);
  await dialog.getByRole('button', { name: 'บันทึก' }).click();
  const res = await transformed;
  const notice = nurseNoteNotice(page);
  await Promise.race([dialog.waitFor({ state: 'hidden', timeout: 30_000 }), notice.first().waitFor({ state: 'visible', timeout: 30_000 })]).catch(() => undefined);
  const notices = await notice.evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim()));
  // บันทึกสำเร็จ: แจ้งเตือน "บันทึกข้อมูลสำเร็จ" ขึ้นก่อนหน้าต่างปิดเล็กน้อย → รอให้หน้าต่างปิดก่อนอ่านสถานะ
  if (res && res.status() < 400) await dialog.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => undefined);
  return {
    status: res?.status(),
    template: res ? new URL(res.url()).searchParams.get('templateId') ?? undefined : undefined,
    message: res ? (await res.text().catch(() => '')).slice(0, 300) : '',
    closed: !(await dialog.isVisible()),
    notices,
  };
}

// ───── Focus ที่บันทึกแล้ว (การ์ดในแท็บ Focus / Resolved — dev-x 14 ต.ค. 2026 หลัง upload template nursing_focus_v2) ─────
// การ์ด = `[class*="_wrapper_"]` · หัว = ปุ่ม `[class*="_header_"]` (ชื่อ `F: <Focus>` + ป้าย Focus + ไอคอน more) · กดหัวแล้วกางรายการ A-I-E (ใหม่สุดอยู่บน)
// ไอคอน more → เมนู `เพิ่มข้อมูล AIE` · `Resolved (ปิด)` · `แก้ไขชื่อ Focus`

/** การ์ด Focus ตามชื่อ (ใน tab ที่ระบุ) */
export function focusCard(page: Page, focus: string, tab: 'Focus' | 'Resolved' = 'Focus'): Locator {
  return nurseNotePanel(page, tab).locator('[class*="_wrapper_"]').filter({ has: page.locator('[class*="_focus-name_"]', { hasText: focus }) });
}

export function focusCardHeader(card: Locator): Locator {
  return card.locator('button[class*="_header_"]').first();
}

/** กางการ์ด Focus (ถ้ายังพับ) แล้วรอรายการ A-I-E ขึ้น */
export async function expandFocus(card: Locator) {
  if (!(await card.locator('[class*="_nursing-note-content_"]').first().isVisible().catch(() => false))) await focusCardHeader(card).click();
  await expect(card.locator('[class*="_nursing-note-content_"]').first()).toBeVisible({ timeout: 20_000 });
}

/** บันทึก A-I-E ทุกชุดในการ์ด (ใหม่สุดก่อน) เป็น { A, I, E } */
export async function readFocusNotes(card: Locator): Promise<{ A: string; I: string; E: string }[]> {
  return card.locator('[class*="_nursing-note_"]').evaluateAll((notes) => {
    const out: { A: string; I: string; E: string }[] = [];
    let current: Record<string, string> = {};
    for (const note of notes) {
      const label = note.querySelector('[class*="_nursing-note-label_"]')?.textContent?.trim().replace(':', '') ?? '';
      const text = note.querySelector('[class*="_nursing-note-text_"]')?.textContent?.trim() ?? '';
      if (label === 'A' && Object.keys(current).length) {
        out.push(current as { A: string; I: string; E: string });
        current = {};
      }
      current[label] = text;
    }
    if (Object.keys(current).length) out.push(current as { A: string; I: string; E: string });
    return out;
  });
}

/** เปิดเมนู more ของการ์ด Focus แล้วคืนชื่อเมนูที่กดได้ (เมนูเปิดค้างไว้) */
export async function openFocusMenu(page: Page, card: Locator): Promise<string[]> {
  const more = card.locator('[aria-label="more"]').first();
  if (!(await more.isVisible().catch(() => false))) return [];
  await more.click();
  const menu = page.locator('.ant-dropdown:visible');
  await menu.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
  return menu.locator('.ant-dropdown-menu-item').evaluateAll((els) => els.filter((el) => el.getAttribute('aria-disabled') !== 'true').map((el) => (el.textContent ?? '').trim()));
}

export function focusMenuItem(page: Page, name: string): Locator {
  return page.locator('.ant-dropdown:visible .ant-dropdown-menu-item').filter({ hasText: name });
}

/** หน้าต่าง เพิ่มข้อมูล AIE (หน้าต่าง Nurse Note เดียวกัน ช่อง Focus ว่าง) → กรอก A / I / E + Perform time (ปุ่ม ตอนนี้) */
export async function fillAie(page: Page, note: Omit<NurseNoteInput, 'focus'>): Promise<string[]> {
  const dialog = nurseNoteDialog(page);
  const editors = dialog.locator('.ProseMirror');
  const parts: [string, string][] = [
    ['assessment', note.assessment],
    ['intervention', note.intervention],
    ['evaluation', note.evaluation],
  ];
  for (const [index, [key, text]] of parts.entries()) {
    await editors.nth(index).click();
    await page.keyboard.type(text, { delay: 15 });
    await dialog.locator(`input#${key}PerformTime`).click();
    const picker = page.locator('.ant-picker-dropdown:visible');
    await picker.locator('.ant-picker-now-btn').click();
    await expect(picker).toBeHidden();
  }
  return dialog.locator('input[id$="PerformTime"]').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
}

/**
 * เมนู Resolved (ปิด) ของการ์ด Focus (เปิดเมนูไว้แล้ว) → รอ graphql `UpdateNursingFocusStatus` → คืน error ถ้ามี
 * dev-x 14 ต.ค. 2026: ไม่มีหน้าต่างยืนยัน · ตอบ `update nursing focus status: record not found` แล้วหน้าจอไม่แจ้งอะไร
 */
export async function resolveFocus(page: Page): Promise<{ status: number; error?: string }> {
  const updated = page.waitForResponse((res) => /UpdateNursingFocusStatus/.test(res.request().postData() ?? ''), { timeout: 30_000 });
  updated.catch(() => undefined);
  await focusMenuItem(page, 'Resolved (ปิด)').click();
  const confirm = page.locator('.ant-modal:visible, .ant-popconfirm:visible').filter({ hasText: /Resolve|ปิด/ }).last();
  if (await confirm.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false)) await confirm.getByRole('button', { name: /ยืนยัน|ตกลง|OK|ใช่/ }).last().click();
  const res = await updated;
  const body = (await res.json().catch(() => ({}))) as { errors?: { message: string }[] };
  return { status: res.status(), error: body.errors?.map((e) => e.message).join(' | ') };
}

// ───── Graphical Sheet Record ─────

/** ตารางรายการของ Graphic Sheet Record (หัว: วันเวลา · เวร · BT · BP · PR · RR · SpO2 · Pain · Input 24h · Output 24h · ผู้บันทึก · ผู้แก้ไข · แหล่งข้อมูล) */
export function sheetTable(page: Page): Locator {
  return page.getByRole('main').locator('.ant-table').filter({ has: page.locator('th[title="แหล่งข้อมูล"]') }).first();
}

export function sheetRows(page: Page): Locator {
  return sheetTable(page).locator('tr.ant-table-row');
}

export function sheetRecordButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'plus Record' });
}

/** ปุ่ม บันทึก ของฟอร์ม เพิ่มรายการใหม่ */
export function sheetSaveButton(page: Page): Locator {
  return page.getByRole('main').getByRole('button', { name: 'save บันทึก', exact: true });
}

export function sheetInput(page: Page, label: string): Locator {
  return page.getByRole('main').getByRole('spinbutton', { name: label, exact: true });
}

/** ทุกแถวของตาราง เป็น { หัวคอลัมน์: ค่า } */
export async function readSheetRows(page: Page): Promise<Record<string, string>[]> {
  return sheetTable(page).evaluate((table) => {
    const heads = [...table.querySelectorAll('thead th')].map((th) => th.getAttribute('title') ?? '');
    return [...table.querySelectorAll('tbody tr.ant-table-row')].map((tr) => {
      const row: Record<string, string> = {};
      [...tr.querySelectorAll('td')].forEach((td, index) => {
        if (heads[index]) row[heads[index]] = (td as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
      });
      return row;
    });
  });
}

export interface SheetInput {
  BT: string;
  SBP: string;
  DBP: string;
  PR: string;
  RR: string;
  SpO2: string;
  /** Pain score จากปุ่มหน้า (0 / 2 / 4 / 6 / 8 / 10) */
  pain: string;
  Oral: string;
  Urine: string;
  /** ระดับความรู้สึกตัว (ACVPU) — บังคับเมื่อมี Vital signs ไม่งั้นขึ้น "กรุณากรอก ACVPU เมื่อบันทึก SOS score" */
  consciousness: string;
}

export function sheetPainButton(page: Page, score: string): Locator {
  return page.getByRole('main').getByRole('button', { name: new RegExp(`^Facial pain score ${score} `) });
}

export function sheetConsciousness(page: Page): Locator {
  return page.getByRole('main').locator('.ant-form-item').filter({ has: page.locator('label[title="ระดับความรู้สึกตัว"]') }).locator('.ant-select');
}

/** กรอกฟอร์ม เพิ่มรายการใหม่ ของ Graphic Sheet Record (กดปุ่ม Record ไว้ก่อน) */
export async function fillSheetRecord(page: Page, input: SheetInput) {
  for (const label of ['BT', 'SBP', 'DBP', 'PR', 'RR', 'SpO2', 'Oral', 'Urine'] as const) await sheetInput(page, label).fill(input[label]);
  await sheetPainButton(page, input.pain).click();
  const consciousness = sheetConsciousness(page);
  await consciousness.scrollIntoViewIfNeeded();
  await consciousness.click();
  await dropdownOptions(page).filter({ hasText: new RegExp(`^${input.consciousness}$`) }).first().click();
  await expect(consciousness).toContainText(input.consciousness);
  await page.mouse.move(700, 700);
}

/** กดปุ่ม บันทึก ของฟอร์ม แล้วรอคำสั่งบันทึก (`POST …/rest/openehr/v1/ehr/<ehrId>/contribution`) — คืน status */
export async function saveSheetRecord(page: Page): Promise<number> {
  const saved = page.waitForResponse((res) => res.request().method() === 'POST' && /\/rest\/openehr\/v1\/ehr\/[^/]+\/contribution$/.test(new URL(res.url()).pathname), { timeout: 45_000 });
  saved.catch(() => undefined);
  await sheetSaveButton(page).click();
  const res = await saved;
  await expectOk(res, 'บันทึก Graphical Sheet Record');
  return res.status();
}

// ───── ผู้ป่วย IPD ที่ใช้เทียบ (อ่านอย่างเดียว) ─────

export interface IpdAdmission {
  an: string;
  hn: string;
}

/** Admission ที่ยังเปิดอยู่และมีเตียงแล้ว 1 ราย (อ่านอย่างเดียว) — `authorization` จาก trackAuthorization() */
export async function fetchOpenAdmission(page: Page, authorization: string): Promise<IpdAdmission> {
  const res = await page.request.post('/cortex-api/graphql', {
    headers: { authorization },
    data: {
      query: 'query OpenAdmissions($filter: AdmissionFilterInput, $pagination: PaginationInput) { getAdmissions(filter: $filter, pagination: $pagination) { data { an hn latestStatusCode bed { id } } } }',
      variables: { filter: { latestStatusCodes: ['in-progress'] }, pagination: { page: 1, perPage: 10 } },
    },
  });
  await expectOk(res, 'อ่านรายการ Admission ที่ยังเปิดอยู่ผ่าน API');
  const rows = ((await res.json()) as { data?: { getAdmissions?: { data?: (IpdAdmission & { bed?: { id: number } | null })[] } } }).data?.getAdmissions?.data ?? [];
  const admission = rows.find((row) => row.bed) ?? rows[0];
  expect(admission, 'ต้องมีผู้ป่วย IPD (Admission ที่ยังเปิดอยู่) อย่างน้อย 1 ราย ไว้เทียบหน้า Nursing Records').toBeTruthy();
  return { an: admission.an, hn: admission.hn };
}

/**
 * Visit ต้นทางของ Admission (อ่านอย่างเดียว) = Admit Request ที่ผูกกับ AN · ไม่มี = null — หอผู้ป่วยเห็นบันทึกจาก ER เฉพาะ AN ที่มี Visit ต้นทาง (สเปกของ dev)
 * dev-x 12 ต.ค. 2026: AN ที่สร้างจากเมนู "จัดการ Admission" ของหน้า ER ได้ `admitRequest: null` แม้ Visit มี Admit Request อยู่
 */
export async function fetchAdmissionOrigin(page: Page, authorization: string, an: string): Promise<{ requestedVn: string; requestedEn: string } | null> {
  const res = await page.request.post('/cortex-api/graphql', {
    headers: { authorization },
    data: { query: 'query Origin($an: String!) { getAdmissionByAN(an: $an) { an admitRequest { requestedEn requestedVn } } }', variables: { an } },
  });
  await expectOk(res, `อ่าน Visit ต้นทางของ AN ${an} ผ่าน API`);
  return ((await res.json()) as { data?: { getAdmissionByAN?: { admitRequest?: { requestedVn: string; requestedEn: string } | null } } }).data?.getAdmissionByAN?.admitRequest ?? null;
}

export async function gotoIpdPatient(page: Page, admission: IpdAdmission) {
  await expect(async () => {
    await page.goto(`/cortex/next/patients/${admission.hn}?an=${admission.an}&fromApp=ipd`);
    await expect(page.getByRole('main').getByText(`HN ${admission.hn}`, { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  }, `เปิดหน้า IPD ของ AN ${admission.an}`).toPass({ timeout: 150_000 });
}
