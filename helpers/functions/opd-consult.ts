import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { expectOk } from './er';

// รายการปรึกษาแพทย์ของผู้ป่วยนอก — การ์ด SBH-1117 (dev-x 16 ต.ค. 2026 · ไฟล์แอป index-AcFNiQ7-.js)
// /cortex/opd/consult-request-list (ต้องเลือกหน่วยบริการผู้ป่วยนอกก่อน) · แท็บ รับ Consult / ส่ง Consult
// แถบตัวกรอง (.ant-select ตามลำดับ): 0 ค้นหา ชื่อผู้ป่วย (autocomplete — ตัวเลือกแสดงแค่ชื่อ ค่า = HN) · 1 ความเร่งด่วน · 2 คลินิก · 3 จุดบริการ · 4 แพทย์ผู้ร้องขอ · 5 ผู้รับปรึกษา
// ค่าตั้งต้น: ช่วงวันที่ = วันนี้ · รับ Consult ใส่ผู้รับปรึกษา = ตัวเอง · ส่ง Consult ใส่แพทย์ผู้ร้องขอ = ตัวเอง · ปุ่ม Clear ล้างทุกช่องรวมช่วงวันที่

const dropdownOptions = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');

/** คอลัมน์ของตาราง (ลำดับ) */
export const CONSULT_COLUMNS = ['ความเร่งด่วน', 'วันที่ต้องการผล', 'HN', 'ชื่อ-นามสกุลผู้ป่วย', 'ขอปรึกษา', 'แพทย์ผู้ให้คำปรึกษา', 'Consult Problem', 'ผู้ส่ง', 'จากแผนก', 'วันส่งปรึกษา', 'สถานะ'] as const;

export async function gotoConsultList(page: Page) {
  await page.goto('/cortex/opd/consult-request-list');
  await expect(consultNameSearch(page)).toBeVisible({ timeout: 120_000 });
}

export const consultTab = (page: Page, name: 'รับ Consult' | 'ส่ง Consult') => page.getByRole('tab', { name });
export const consultNameSearch = (page: Page) => page.getByRole('main').getByPlaceholder('ค้นหา ชื่อผู้ป่วย');
/** ช่องตัวกรองลำดับที่ n ของแถบตัวกรอง (ดูลำดับด้านบน) */
export const consultFilter = (page: Page, index: number) => page.getByRole('main').locator('.ant-select').nth(index);
export const requesterFilter = (page: Page) => consultFilter(page, 4);
export const consultRows = (page: Page) => page.getByRole('main').locator('tr.ant-table-row');
export const consultClear = (page: Page) => page.getByRole('main').getByRole('button', { name: /Clear/ });

/** รอคำตอบของ query ConsultRequests ที่ตัวกรองตรงเงื่อนไข (คืน response + ตัวกรองที่ส่ง) */
export function waitConsultRequests(page: Page, match: (filter: Record<string, unknown>) => boolean, timeout = 30_000): Promise<{ res: Response; filter: Record<string, unknown> }> {
  let filter: Record<string, unknown> = {};
  const p = page
    .waitForResponse((res) => {
      const post = res.request().postData() ?? '';
      if (!res.url().endsWith('/cortex-api/graphql') || !/query ConsultRequests\(/.test(post)) return false;
      const f = (JSON.parse(post).variables?.filter ?? {}) as Record<string, unknown>;
      if (!match(f)) return false;
      filter = f;
      return true;
    }, { timeout })
    .then(async (res) => {
      await expectOk(res, 'อ่านรายการปรึกษาแพทย์');
      return { res, filter };
    });
  p.catch(() => undefined);
  return p;
}

export interface ConsultRowInfo {
  hn: string;
  patient: string;
  consultant: string;
  sender: string;
  status: string;
}

/** อ่านแถวที่แสดงในตาราง */
export async function readConsultRows(page: Page): Promise<ConsultRowInfo[]> {
  return consultRows(page).evaluateAll((rows) =>
    rows.map((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((td) => (td as HTMLElement).innerText.replace(/\s+/g, ' ').trim());
      return { hn: cells[2] ?? '', patient: cells[3] ?? '', consultant: cells[5] ?? '', sender: cells[7] ?? '', status: cells[10] ?? '' };
    }),
  );
}

/** พิมพ์ในช่องค้นหาชื่อผู้ป่วย → รอตัวเลือก → คืน locator ของตัวเลือกที่ชื่อตรง + ข้อความของทุกตัวเลือก */
export async function typePatientName(page: Page, query: string, fullName: string): Promise<{ option: Locator; texts: string[] }> {
  const box = consultNameSearch(page);
  const option = dropdownOptions(page).filter({ hasText: fullName }).first();
  // ตัวเลือกบางครั้งขึ้นช้า (ค้นผู้ป่วยทั้งระบบ) → พิมพ์ใหม่จนขึ้น
  await expect(async () => {
    await box.click();
    await box.fill('');
    await box.pressSequentially(query, { delay: 30 });
    await expect(option).toBeVisible({ timeout: 10_000 });
  }, `ต้องมีตัวเลือก "${fullName}" หลังพิมพ์ "${query}"`).toPass({ timeout: 60_000 });
  return { option, texts: (await dropdownOptions(page).allInnerTexts()).map((t) => t.trim()) };
}

/** เลือกแพทย์ในช่องตัวกรองแบบหลายค่า (เช่น แพทย์ผู้ร้องขอ) — ล้างค่าที่มีก่อน */
export async function chooseDoctorFilter(page: Page, select: Locator, search: string, name: RegExp): Promise<string> {
  const removes = select.locator('.ant-select-selection-item-remove');
  while (await removes.count()) await removes.first().click();
  const option = dropdownOptions(page).filter({ hasText: name }).first();
  await expect(async () => {
    await select.click();
    await select.locator('input').fill(search);
    await expect(option).toBeVisible({ timeout: 8_000 });
  }, `ช่องแพทย์ต้องมีตัวเลือก ${name}`).toPass({ timeout: 45_000 });
  const text = (await option.innerText()).trim();
  await option.click();
  await page.keyboard.press('Escape');
  return text;
}

/** หน้าผู้ป่วย OPD → เมนูขวา Consult → เลือกแพทย์ขอปรึกษา → Consult Problem → บันทึก (คืนคำขอที่สร้าง) */
export async function sendConsultFromOpd(page: Page, doctor: { search: string; name: RegExp }, problem: string, careMenu: (page: Page, name: string, ready: Locator) => Promise<void>, beforeSave?: (save: Locator) => Promise<void>) {
  const main = page.getByRole('main');
  await careMenu(page, 'Consult', main.getByRole('heading', { name: 'Consult', exact: true }));
  const doctorBox = main.getByRole('combobox', { name: 'แพทย์ขอปรึกษา' });
  const option = dropdownOptions(page).filter({ hasText: doctor.name }).first();
  await expect(async () => {
    await page.keyboard.press('Escape');
    await doctorBox.click();
    await doctorBox.fill(doctor.search);
    await expect(option).toBeVisible({ timeout: 5_000 });
    await option.click();
    await expect(main).toContainText(new RegExp(`แพทย์ขอปรึกษา[\\s\\S]{0,40}${doctor.name.source}`), { timeout: 4_000 });
  }, `เลือกแพทย์ขอปรึกษา ${doctor.name}`).toPass({ timeout: 60_000 });
  // ช่อง Consult Problem เป็น editor — fill() ไม่ติด (ส่งไปเป็น <p></p>) → คลิกแล้วพิมพ์
  const editor = main.locator('[contenteditable="true"]').last();
  await editor.click();
  await page.keyboard.type(problem);
  await expect(editor).toContainText(problem);
  const save = main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).last();
  await beforeSave?.(save);
  const saved = page.waitForResponse((r) => /mutation CreateConsultRequest/.test(r.request().postData() ?? ''), { timeout: 30_000 });
  await save.click();
  const res = await saved;
  await expectOk(res, 'บันทึกคำขอ Consult');
  const body = (await res.json()) as { data?: { createConsultRequest?: { id?: number; hn?: string; sourceType?: string; latestStatusCode?: string } }; errors?: { message: string }[] };
  const created = body.data?.createConsultRequest;
  expect(created, `ส่ง Consult ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ') ?? JSON.stringify(body).slice(0, 300)}`).toBeTruthy();
  return created!;
}
