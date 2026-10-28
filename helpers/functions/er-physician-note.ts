import { expect, type Locator, type Page } from '@playwright/test';
import { expectOk, waitForApi, type ErVisit } from './er';

// ER Physician Note แบบใหม่ (clinical form) บนหน้า Overview ของ Visit ER — dev-x 28 ต.ค. 2026 · ไฟล์แอป index-BaNu9Hqq.js · การ์ด SBH-2355
// อยู่ใต้หัว "Clinical Information" ฝั่งขวา (ไม่ใช่ปุ่มให้กด — ฟอร์มโหลดในหน้าเอง ~20 วินาที) · ฟอร์มคัดกรองฝั่งซ้ายมีช่อง "ประวัติเจ็บป่วยปัจจุบัน" ชื่อเดียวกัน → จับในแผงนี้เท่านั้น
// แพทย์เริ่มกรอกฟอร์มครั้งแรก (onInteraction) = POST /cortex-api/er/encounters/<EN>/physician-activity → event "แพทย์เริ่มการรักษา" บน Timeline (ไม่มีปุ่ม Acknowledge แล้ว)
// กดบันทึก = บันทึกฟอร์ม + PATCH …/treatment-complete → event "แพทย์ตรวจเสร็จสิ้น"
// dev-x 28 ต.ค. 2026 ~10:45: ปุ่มบันทึก disabled + แถบ "กำลังรอการเชื่อมต่อตัวกรอกข้อมูลที่รองรับ ยังไม่สามารถบันทึกได้" + ส่วน Diagnosis general ขึ้น "ไม่สามารถแสดงฟอร์มได้"

/** แผง Clinical Information ที่มีฟอร์ม ER Physician Note */
export function physicianNotePanel(page: Page): Locator {
  return page
    .getByRole('main')
    .locator('div')
    .filter({ has: page.getByText('Clinical Information', { exact: true }) })
    .filter({ has: page.getByRole('heading', { name: 'ER Physician Note', exact: true }) })
    .last();
}

/** ช่องประวัติเจ็บป่วยปัจจุบัน (Present illness) ของฟอร์ม Physician Note */
export function physicianNoteIllness(page: Page): Locator {
  return physicianNotePanel(page).locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').first();
}

export function physicianNoteSaveButton(page: Page): Locator {
  return physicianNotePanel(page).getByRole('button', { name: 'save บันทึก' }).first();
}

/** รอฟอร์ม Physician Note บนหน้า Overview โหลดเสร็จ (ช่องประวัติเจ็บป่วยปัจจุบันขึ้น) */
export async function waitPhysicianNoteForm(page: Page) {
  await expect(physicianNoteIllness(page), 'ฟอร์ม ER Physician Note ต้องโหลดเสร็จ').toBeVisible({ timeout: 120_000 });
}

/** พิมพ์ในช่องประวัติเจ็บป่วยปัจจุบัน (ยังไม่บันทึก) → รอ POST physician-activity (การกรอกครั้งแรกของ Encounter) */
export async function startPhysicianNote(page: Page, visit: ErVisit, text: string) {
  const illness = physicianNoteIllness(page);
  const activity = waitForApi(page, 'POST', `/cortex-api/er/encounters/${visit.en}/physician-activity`, 30_000);
  await illness.click();
  await illness.pressSequentially(text, { delay: 30 });
  await expectOk(await activity, `บันทึกการเริ่มรักษาของแพทย์ (physician-activity) ${visit.en}`);
}

/** ส่วน Diagnosis general ของฟอร์ม (หัวข้อ + เนื้อหา) */
export function physicianNoteDiagnosis(page: Page): Locator {
  const panel = physicianNotePanel(page);
  return panel
    .locator('div')
    .filter({ has: page.getByText('Diagnosis general', { exact: true }) })
    .filter({ hasNot: page.getByText('Note to nurse', { exact: true }) })
    .filter({ hasNot: page.getByText('Physical examination general', { exact: true }) })
    .first();
}

/** ข้อความแจ้งในฟอร์ม (role=alert) เช่น "กำลังรอการเชื่อมต่อตัวกรอกข้อมูลที่รองรับ ยังไม่สามารถบันทึกได้" */
export async function physicianNoteAlerts(page: Page): Promise<string[]> {
  return (await physicianNotePanel(page).getByRole('alert').allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim()).filter(Boolean);
}
