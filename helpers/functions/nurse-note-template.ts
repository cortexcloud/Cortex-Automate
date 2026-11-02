import { expect, type Locator, type Page } from '@playwright/test';

// Nurse Note Template (การ์ด SBH-2629) — หน้าตั้งค่า + หน้าต่างเลือก Template ในหน้าต่าง Nurse Note / Note Template ของ ER Physician Note
// locator ตรวจกับ dev-x 31 ต.ค. 2026 · ไฟล์แอป index-DJaj9lPY.js (Sub Agent cortex-screen-explorer · ความรู้เต็มใน screens/er.md หัวข้อ Nurse Note Template)
// ปุ่มที่เขียนข้อมูล: ฟอร์ม `save บันทึก` · ปุ่ม `ลบ` ในแถวตาราง (ห้ามกด) · สวิตช์ `Active` หัวฟอร์ม (บันทึกพร้อมฟอร์ม)

export type NurseCategory = 'Assessment' | 'Intervention' | 'Evaluation';
export const CATEGORIES: NurseCategory[] = ['Assessment', 'Intervention', 'Evaluation'];
export const CATEGORY_TYPE: Record<NurseCategory, string> = {
  Assessment: 'NURSE_FOCUS_NOTE_ASSESSMENT',
  Intervention: 'NURSE_FOCUS_NOTE_INTERVENTION',
  Evaluation: 'NURSE_FOCUS_NOTE_EVALUATION',
};
export const SETTINGS_URL = '/cortex/setting/admin/note-templates';

const main = (page: Page) => page.getByRole('main');
const notice = (page: Page) => page.locator('.ant-message-notice:visible, .ant-notification-notice:visible');

// ───── หน้าตั้งค่า ─────

export function settingsTab(page: Page, name: 'Note Template' | 'Nurse Note Template' | 'Shortcut'): Locator {
  return main(page).getByRole('tab', { name, exact: true });
}

/** หัวเพจ (Note Template / Nurse Note Template / เพิ่ม Note Template / แก้ไข Note Template) */
export function settingsTitle(page: Page): Locator {
  return main(page).locator('[class*="_content-title_"]').first();
}

/** แท็บย่อย A / I / E (`.ant-segmented`) */
export function subTab(page: Page, category: NurseCategory): Locator {
  return main(page).locator('.ant-segmented-item').filter({ hasText: new RegExp(`^${category}$`) });
}

export function selectedSubTab(page: Page): Locator {
  return main(page).locator('.ant-segmented-item-selected');
}

export function columnHeaders(page: Page): Locator {
  return main(page).getByRole('columnheader');
}

export async function readColumnHeaders(page: Page): Promise<string[]> {
  return (await columnHeaders(page).allInnerTexts()).map((t) => t.trim()).filter(Boolean);
}

export function tableRows(page: Page): Locator {
  return main(page).locator('tr.ant-table-row');
}

export function rowByName(page: Page, name: string): Locator {
  return tableRows(page).filter({ has: page.locator(`td[title="${name}"]`) });
}

/** ป้ายสถานะของแถว (Active / ปิดใช้งาน) — คอลัมน์ Labels ก็เป็น .ant-tag จึงกรองตามข้อความ */
export function rowStatus(row: Locator): Locator {
  return row.locator('.ant-tag').filter({ hasText: /^(Active|ปิดใช้งาน)$/ });
}

export function tableEmpty(page: Page): Locator {
  return main(page).locator('.ant-table-placeholder');
}

export function settingsSearch(page: Page): Locator {
  return main(page).getByRole('searchbox', { name: 'ค้นหาชื่อ Note Template' });
}

/** ค้นในตารางหน้าตั้งค่า (ต้องกด Enter · คำค้นติดไปทุกแท็บผ่าน URL `searchText`) */
export async function searchSettings(page: Page, text: string) {
  const loaded = page.waitForResponse((r) => /query NoteTemplates\(/.test(r.request().postData() ?? ''), { timeout: 30_000 }).catch(() => undefined);
  await settingsSearch(page).fill(text);
  await settingsSearch(page).press('Enter');
  await loaded;
  await page.waitForTimeout(500);
}

export function addTemplateButton(page: Page): Locator {
  return main(page).getByRole('button', { name: 'plus เพิ่ม Note Template' });
}

/** เปิดหน้าตั้งค่า แท็บ Nurse Note Template ของหมวดที่ระบุ (ล้างคำค้นที่ค้างใน URL) */
export async function gotoNurseTemplates(page: Page, category: NurseCategory = 'Assessment') {
  await page.goto(`${SETTINGS_URL}?tab=nurse-note-template&type=${CATEGORY_TYPE[category]}`);
  await expect(settingsTitle(page)).toHaveText('Nurse Note Template', { timeout: 60_000 });
  await expect(columnHeaders(page).first()).toBeVisible({ timeout: 30_000 });
  await expect(selectedSubTab(page)).toHaveText(category);
  await page.waitForTimeout(800);
}

/** กดแท็บย่อยแล้วรอตารางโหลด */
export async function openSubTab(page: Page, category: NurseCategory) {
  const loaded = page.waitForResponse((r) => /query NoteTemplates\(/.test(r.request().postData() ?? ''), { timeout: 30_000 }).catch(() => undefined);
  await subTab(page, category).click();
  await expect(selectedSubTab(page)).toHaveText(category);
  await expect(page).toHaveURL(new RegExp(`type=${CATEGORY_TYPE[category]}`));
  await loaded;
  await page.waitForTimeout(500);
}

// ───── ฟอร์มเพิ่ม / แก้ไข ─────

export const form = {
  name: (page: Page) => main(page).locator('input#name'),
  template: (page: Page) => main(page).locator('.ProseMirror').first(),
  labels: (page: Page) => formItem(page, 'labels').getByRole('combobox'),
  labelChips: (page: Page) => formItem(page, 'labels').locator('.ant-tag'),
  /** ช่อง Type (Public / Personal / Clinic) — Ant Design รุ่นนี้แสดงค่าใน `.ant-select-content-value` (ไม่ใช่ `.ant-select-selection-item`) */
  scope: (page: Page) => main(page).locator('.ant-select').filter({ has: page.locator('input#scope') }).first(),
  active: (page: Page) => main(page).getByRole('switch', { name: 'Active' }),
  save: (page: Page) => main(page).getByRole('button', { name: 'save บันทึก' }),
  cancel: (page: Page) => main(page).getByRole('button', { name: 'ยกเลิก' }),
};

export function formItem(page: Page, id: 'name' | 'template' | 'labels' | 'scope'): Locator {
  return main(page).locator('.ant-form-item').filter({ has: page.locator(`label[for="${id}"]`) });
}

export function formError(page: Page, id: 'name' | 'template' | 'labels'): Locator {
  return formItem(page, id).locator('.ant-form-item-explain-error');
}

export interface TemplateInput {
  name?: string;
  template?: string;
  label?: string;
  active?: boolean;
}

/** กรอกฟอร์มเพิ่ม Note Template (ยังไม่กดบันทึก) — ช่องที่ไม่ส่งค่ามาเว้นว่าง */
export async function fillTemplateForm(page: Page, input: TemplateInput) {
  await expect(form.name(page)).toBeVisible({ timeout: 30_000 });
  if (input.name) await form.name(page).fill(input.name);
  if (input.template) {
    await form.template(page).click();
    await page.keyboard.type(input.template, { delay: 10 });
  }
  if (input.label) {
    await form.labels(page).click();
    await page.keyboard.type(input.label, { delay: 20 });
    const option = page.locator(`.ant-select-dropdown:visible .ant-select-item-option[title="${input.label}"]`);
    await option.click({ timeout: 15_000 });
    await expect(form.labelChips(page).filter({ hasText: input.label })).toBeVisible();
    await page.locator('.ant-select-dropdown:visible').waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => page.mouse.click(1500, 900));
  }
  if (input.active === false && (await form.active(page).getAttribute('aria-checked')) === 'true') await form.active(page).click();
  await page.mouse.move(1500, 950);
}

/** กดบันทึกฟอร์ม → คืนข้อความแจ้งเตือนที่ขึ้น (สำเร็จ = ได้ข้อความ + หน้ากลับไปตาราง) */
export async function saveTemplateForm(page: Page): Promise<{ notices: string[]; mutation?: number }> {
  const mutation = page.waitForResponse((r) => /mutation (Create|Update)NoteTemplate/.test(r.request().postData() ?? ''), { timeout: 30_000 }).catch(() => undefined);
  await form.save(page).click();
  const res = await mutation;
  await notice(page).first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
  const notices = await notice(page).evaluateAll((els) => els.map((el) => (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim()));
  return { notices, mutation: res?.status() };
}

export function successNotice(page: Page, text: string): Locator {
  return notice(page).filter({ hasText: text }).first();
}

// ───── หน้าต่างเลือก Template (ฝั่งพยาบาล / แพทย์ ใช้ component เดียวกัน) ─────

/** ปุ่มไอคอน Template ในหน้าต่าง Nurse Note — nth 0/1/2 = A / I / E */
export function templateButtons(noteDialog: Locator): Locator {
  return noteDialog.getByRole('button', { name: 'เลือก Nurse Note Template' });
}

export function templateButton(noteDialog: Locator, category: NurseCategory): Locator {
  return templateButtons(noteDialog).nth(CATEGORIES.indexOf(category));
}

/** ช่อง editor ของ A / I / E ในหน้าต่าง Nurse Note */
export function noteEditor(noteDialog: Locator, category: NurseCategory): Locator {
  return noteDialog.locator('.ProseMirror').nth(CATEGORIES.indexOf(category));
}

export async function editorText(editor: Locator): Promise<string> {
  return (await editor.innerText()).replace(/ /g, ' ').replace(/\n{2,}/g, '\n').trim();
}

export function nurseTemplateDialog(page: Page, category: NurseCategory): Locator {
  return page.getByRole('dialog', { name: `Nurse Note Template - ${category}` });
}

export function physicianTemplateDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Note Template', exact: true });
}

export const picker = {
  search: (d: Locator) => d.getByRole('textbox', { name: 'ค้นหาชื่อหรือข้อความ Template' }),
  clear: (d: Locator) => d.getByRole('button', { name: 'ล้างค่ากรอง' }),
  items: (d: Locator) => d.locator('button[class*="_template-item_"]'),
  item: (d: Locator, name: string) => d.locator('button[class*="_template-item_"]').filter({ hasText: name }),
  active: (d: Locator) => d.locator('[class*="_template-item-active_"]'),
  preview: (d: Locator) => d.locator('[class*="_preview_"]').first(),
  empty: (d: Locator) => d.locator('.ant-empty-description'),
  use: (d: Locator) => d.getByRole('button', { name: 'check ใช้ข้อความนี้' }),
  copy: (d: Locator) => d.getByRole('button', { name: 'copy คัดลอกข้อความ' }),
  close: (d: Locator) => d.getByRole('button', { name: 'ปิด', exact: true }),
};

const isEffective = (postData: string | null) => /query EffectiveNoteTemplates\(/.test(postData ?? '');

/** เปิดหน้าต่างเลือก Template ของช่องที่ระบุ แล้วรอรายการโหลด */
export async function openNurseTemplateDialog(page: Page, noteDialog: Locator, category: NurseCategory): Promise<Locator> {
  const loaded = page.waitForResponse((r) => isEffective(r.request().postData()), { timeout: 30_000 }).catch(() => undefined);
  await templateButton(noteDialog, category).click();
  const dialog = nurseTemplateDialog(page, category);
  await expect(dialog).toBeVisible();
  await loaded;
  await settle(dialog);
  return dialog;
}

/** รอให้รายการนิ่ง (มีรายการ หรือขึ้น "ไม่มี Template") */
async function settle(dialog: Locator) {
  await expect(picker.items(dialog).first().or(picker.empty(dialog))).toBeVisible({ timeout: 20_000 });
  await dialog.page().waitForTimeout(400);
}

/** พิมพ์คำค้นในหน้าต่างเลือก Template (debounce ~300ms → EffectiveNoteTemplates ที่มี search) */
export async function searchTemplates(dialog: Locator, text: string) {
  const page = dialog.page();
  const loaded = page
    .waitForResponse((r) => isEffective(r.request().postData()) && (r.request().postData() ?? '').includes(JSON.stringify(text).slice(1, -1)), { timeout: 30_000 })
    .catch(() => undefined);
  await picker.search(dialog).fill(text);
  await loaded;
  await settle(dialog);
}

export async function clearTemplateSearch(dialog: Locator) {
  const page = dialog.page();
  const loaded = page.waitForResponse((r) => isEffective(r.request().postData()), { timeout: 30_000 }).catch(() => undefined);
  await picker.clear(dialog).click();
  await loaded;
  await settle(dialog);
}

export async function readItems(dialog: Locator): Promise<string[]> {
  if (await picker.empty(dialog).isVisible().catch(() => false)) return [];
  return (await picker.items(dialog).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
}

export async function previewText(dialog: Locator): Promise<string> {
  return (await picker.preview(dialog).innerText()).replace(/ /g, ' ').replace(/\n{2,}/g, '\n').trim();
}

/** เลือก Template ตามชื่อ แล้วกด ใช้ข้อความนี้ (หน้าต่างปิดเอง) */
export async function applyTemplate(dialog: Locator, name: string) {
  await picker.item(dialog, name).first().click();
  await expect(picker.active(dialog)).toContainText(name);
  await picker.use(dialog).click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
}
