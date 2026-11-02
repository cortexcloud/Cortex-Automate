import { expect, type Locator, type Page } from '@playwright/test';
import { dismissToast, expectOk, gotoErDashboard, type ErVisit } from './er';
import { graphqlMutation, openDisposition, signDisposition, startDisposition, dispositionTextBoxes, type ErDischargeSummary } from './er-disposition';
import { erTriagePanel, fillErTriageForm, saveErTriageForm, type VitalSigns } from './er-triage';
import { newTestPatient } from './test-data';
import { registerAndOpenErVisit } from '../../mock-data/uat-er';
import { careMenu, gotoVisit } from '../../mock-data/uat-play';

// ขั้นเตรียมผู้ป่วย ER สำหรับการ์ด SBH-1016 (MoPH Refer Out) — คัดลอก / ย่อจาก spec SBH-3182 (dev-x 2 พ.ย. 2026)
// ผู้ป่วย AUTO ใหม่ → คัดกรอง (ESI + สัญญาณชีพ) → ER Physician Note (Dx หลายรหัส) → คัดกรองซ้ำ (สัญญาณชีพชุดที่ 2)
// → สั่งยา / ยกเลิกยา → Disposition (By Transfer + โรงพยาบาลปลายทาง หรือไม่ระบุปลายทาง) → ลงนาม
// บัญชีที่ใช้ลงนาม = Super_User (user1 = แพทย์ "ทดสอบ มานะ" มีเลขบัตรประชาชน)

export const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** ผู้ป่วย AUTO ใหม่ → เปิด Visit ER → รอฟอร์มคัดกรองพร้อม */
export async function newErVisit(page: Page, prefix: string): Promise<ErVisit & { name: string }> {
  await expect(async () => {
    await gotoErDashboard(page);
  }, 'เปิด ER Dashboard').toPass({ timeout: 180_000 });
  const patient = newTestPatient(prefix);
  const visit = await registerAndOpenErVisit(page, patient);
  await expect(page.getByRole('main').getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(erTriagePanel(page).getByRole('combobox', { name: 'Eye Opening (E)' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 120_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
  return { ...visit, name: `${patient.firstName} ${patient.familyName}` };
}

/** คัดกรองครั้งแรก (ฟอร์มที่เปิดอยู่หลังเปิด Visit) → บันทึก */
export async function triageEr(page: Page, visit: ErVisit, level: 1 | 2 | 3 | 4 | 5, vitals: VitalSigns) {
  await fillErTriageForm(page, { level, vitals });
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await expect(page.getByRole('main').getByText('Clinical Summary', { exact: true }), 'บันทึกคัดกรองแล้วต้องอยู่หน้า Overview').toBeVisible({ timeout: 60_000 });
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ').catch(() => undefined);
}

/** รอให้นาทีของนาฬิกาเปลี่ยน (สัญญาณชีพแต่ละชุดต้องต่างนาทีกัน) */
export async function waitNextMinute(page: Page) {
  const minute = new Date().getMinutes();
  while (new Date().getMinutes() === minute) await page.waitForTimeout(2_000);
  await page.waitForTimeout(2_000);
}

/** คัดกรองซ้ำบนหน้า Overview (ปุ่ม redo คัดกรองซ้ำ) = สัญญาณชีพชุดใหม่ */
export async function reTriage(page: Page, visit: ErVisit, level: 1 | 2 | 3 | 4 | 5, vitals: VitalSigns) {
  await gotoVisit(page, visit);
  const redo = page.getByRole('main').getByRole('button', { name: 'redo คัดกรองซ้ำ' });
  await expect(redo).toBeVisible({ timeout: 90_000 });
  await redo.scrollIntoViewIfNeeded();
  await redo.click();
  await fillErTriageForm(page, { level, vitals, chiefComplaint: false });
  await saveErTriageForm(page, `บันทึกคัดกรองซ้ำของ ${visit.en}`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ').catch(() => undefined);
}

function noteScope(page: Page) {
  const main = page.getByRole('main');
  return {
    main,
    illness: main.locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').filter({ visible: true }).last(),
    dxRow: (i: number) => main.locator(`[data-dx-index="${i}"]`).filter({ visible: true }).first(),
    dxAdd: main.locator('[data-dx-index="0"]').locator('xpath=ancestor::*[.//button[normalize-space()="+ เพิ่มรายการ"]][1]').getByRole('button', { name: '+ เพิ่มรายการ' }).last(),
    save: main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).first(),
  };
}

/** Diagnosis แถว i: ค้น ICD → เลือก (แถวแรก = Principal · ถัดไป = Comorbid อัตโนมัติ) */
async function chooseDx(page: Page, i: number, code: string): Promise<string> {
  const n = noteScope(page);
  if (i > 0 && !(await n.dxRow(i).count())) await n.dxAdd.click();
  const search = n.dxRow(i).getByRole('combobox').first();
  await search.scrollIntoViewIfNeeded();
  await search.click();
  await page.keyboard.type(code.replace('.', ''), { delay: 60 });
  const option = page.getByRole('option').filter({ visible: true }).filter({ hasText: new RegExp(`^${code.replace('.', '\\.?')} - `) }).first();
  await expect(option, `ค้น Diagnosis ${code} ต้องเจอ`).toBeVisible({ timeout: 20_000 });
  const text = norm(await option.innerText());
  await option.click();
  await page.waitForTimeout(800);
  return text;
}

/** ER Physician Note — Present illness + Diagnosis หลายรหัส → บันทึก · คืน Diagnosis ที่เลือก ("K30 - Functional dyspepsia") */
export async function physicianNote(page: Page, dx: string[], illness = 'ปวดท้อง 1 วัน (ทดสอบ SBH-1016)'): Promise<string[]> {
  const n = noteScope(page);
  await careMenu(page, 'ER Physician Note', n.main.getByRole('heading', { name: 'ER Physician Note' }).first());
  await expect(n.dxRow(0), 'ฟอร์มแพทย์ต้องโหลดส่วน Diagnosis').toBeVisible({ timeout: 180_000 });
  await page.waitForTimeout(3_000);
  if (await n.illness.count()) await n.illness.fill(illness);
  const chosen: string[] = [];
  for (const [i, code] of dx.entries()) chosen.push(await chooseDx(page, i, code));
  await n.save.scrollIntoViewIfNeeded();
  await expect(n.save, 'ปุ่มบันทึกฟอร์มแพทย์ต้องกดได้').toBeEnabled();
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/clinical-form-groups\/[^/]+\/saves$/.test(r.url()), { timeout: 120_000 });
  await n.save.click();
  await expectOk(await saved, 'บันทึก ER Physician Note');
  return chosen;
}

/** เปิด One Day Order (แผง Overview โหลดตามหลังแล้วทับ — รอช่องค้นหายานิ่ง 3 วินาที) */
async function openOneDayOrder(page: Page) {
  const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  await expect(async () => {
    if (!(await search.isVisible())) await careMenu(page, 'One Day Order', page.getByRole('main').getByRole('heading', { name: 'Order', exact: true }));
    await expect(search).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(3_000);
    await expect(search).toBeVisible({ timeout: 1_000 });
  }, 'เปิด One Day Order').toPass({ timeout: 180_000 });
  await page.mouse.move(700, 700);
}

/** ยกเลิกยาที่ส่งแล้วจากรายการ One Day Order (ปุ่ม ยกเลิก ท้ายแถว → ยืนยัน) */
export async function cancelMedication(page: Page, code: string) {
  await openOneDayOrder(page);
  const line = page.getByRole('main').getByRole('row').filter({ hasText: `[${code}]` }).first();
  await expect(line).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1_500);
  await line.getByRole('button', { name: 'ยกเลิก' }).dispatchEvent('click');
  const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').filter({ hasText: 'ยกเลิกรายการนี้?' }).last();
  await expect(pop).toBeVisible();
  const cancelled = graphqlMutation(page, 'CancelOpdMedicationRequestById', 30_000);
  await pop.getByRole('button', { name: 'ยืนยัน' }).click();
  await expectOk(await cancelled, `ยกเลิกยา ${code}`);
}

/** ช่อง โรงพยาบาลปลายทาง (By Transfer) → ค้นด้วยคำ → เลือกตัวเลือกแรก → คืนชื่อ */
export async function chooseReferHospital(page: Page, keywords = ['สระบุรี', 'โรงพยาบาล', '']): Promise<string> {
  const label = page.getByRole('main').getByText('โรงพยาบาลปลายทาง', { exact: true }).first();
  await expect(label, 'เลือก By Transfer แล้วต้องมีช่อง โรงพยาบาลปลายทาง').toBeVisible();
  const select = label.locator('xpath=following::input[1]').locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]');
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
  for (const keyword of keywords) {
    await select.click({ force: true });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    if (keyword) await page.keyboard.type(keyword, { delay: 60 });
    if (await option.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false)) break;
  }
  const value = norm((await option.getAttribute('title')) ?? (await option.innerText()));
  await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
  return value;
}

/** เปิดแท็บ Disposition ของ Visit (แผง Overview โหลดตามหลังแล้วทับ → กดซ้ำจนหัว สรุปการจำหน่าย ขึ้น) */
export async function gotoDisposition(page: Page, visit: ErVisit) {
  await gotoVisit(page, visit);
  await careMenu(page, 'Disposition', page.getByRole('main').getByText('สรุปการจำหน่าย', { exact: true }));
  await page.waitForTimeout(3_000);
  if (!(await page.getByRole('main').getByText('สรุปการจำหน่าย', { exact: true }).isVisible())) await openDisposition(page);
  await page.mouse.move(600, 600);
}

export interface DisposeOptions {
  /** By Transfer: คำค้นโรงพยาบาลปลายทาง · null = ไม่ระบุปลายทาง (Transfer ภายใน — TC-049) */
  hospital?: string[] | null;
  text?: string;
  /** เรียกก่อนกดลงนาม (ไว้ตีกรอบ / ถ่ายภาพ) */
  beforeSign?: (method: Locator) => Promise<void>;
}

/** Disposition: เริ่ม → Improved + By Transfer (+ โรงพยาบาลปลายทาง) → ช่องบังคับ → ลงนาม */
export async function disposeByTransfer(page: Page, visit: ErVisit, options: DisposeOptions = {}): Promise<{ hospital?: string; summary: ErDischargeSummary }> {
  await gotoDisposition(page, visit);
  if (await page.getByTestId('er-disposition-start').isVisible().catch(() => false)) await startDisposition(page);
  const main = page.getByRole('main');
  await main.getByRole('radio', { name: 'Improved', exact: true }).check();
  const method = main.getByRole('radio', { name: 'By Transfer', exact: true });
  await method.check();
  const hospital = options.hospital === null ? undefined : await chooseReferHospital(page, options.hospital);
  const suggested = main.getByRole('button', { name: 'ใช้รหัสโรคที่แนะนำ' });
  if (await suggested.isVisible().catch(() => false)) await suggested.click();
  const { clinical, finding } = dispositionTextBoxes(page);
  const text = options.text ?? 'ทดสอบ SBH-1016 Refer Out';
  await clinical.fill(text);
  await finding.fill(text);
  if (options.beforeSign) await options.beforeSign(method.locator('xpath=ancestor::label[1]'));
  const summary = await signDisposition(page);
  return { hospital, summary };
}
