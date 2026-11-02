import { expect, type Locator, type Page } from '@playwright/test';
import { expectOk, gotoErDashboard, openTriagePage, waitForApi } from './er';
import { clicked, filled, markEvidence, snapEvidence } from './evidence';

// Triage หมู่ (mass casualty incident) — dev-x 31 ต.ค. 2026 · ไฟล์แอป index-CAlFiC-E.js · การ์ด SBH-2470 (ลงทะเบียนตามจำนวนผู้ป่วย)
// หน้า /cortex/er/triage?mode=mass-casualty&incidentId=<id> · ซ้าย = หัวเหตุการณ์ + เพิ่มผู้ป่วย + รายการ member + ปุ่มท้าย · ขวา = ฟอร์มของ member ที่เลือก
// ปุ่มที่เขียนข้อมูล: สร้าง (dialog) · พร้อมส่งและไปคนถัดไป · ไอคอน delete ของแถว (ไม่มีหน้าต่างยืนยัน — กดแล้วยิง DELETE ทันที) · ส่ง Triage ทั้งเหตุการณ์ · ยกเลิกเหตุการณ์ ·
// เลือก ESI / โซน ในฟอร์ม = PUT …/members/<id>/draft · พิมพ์บัตรคิวทั้งหมด = POST /cortex-api/queues/print {queueExamIds} → zip queue-<n>.pdf (บนบัตรมีแค่เลขคิว ไม่มีชื่อ / HN)

export interface MciMember {
  id: string;
  en: string;
  vn: string;
  hn: string;
  version: number;
  status: string;
  registrationSeq: number | null;
  patientName: string;
  triageLevel: number | null;
  targetLocationId: number | null;
}
export interface MciIncident {
  id: string;
  displayCode: string;
  name: string;
  status: string;
  counts: Record<string, number>;
  registration: { headcount: number; status: string; done: number; failed: number; error: string | null } | null;
  members: MciMember[];
}

export const mciUrl = (id: string) => `/cortex/er/triage?mode=mass-casualty&incidentId=${id}`;

/** GET เหตุการณ์ (อ่านอย่างเดียว) */
export async function fetchIncident(page: Page, authorization: () => string, id: string): Promise<MciIncident> {
  const res = await page.request.get(`/cortex-api/er/mass-casualty-incidents/${id}`, { headers: { authorization: authorization() } });
  await expectOk(res, `อ่านเหตุการณ์ ${id}`);
  return (await res.json()) as MciIncident;
}

/** dialog "สร้างเหตุการณ์" */
export const createDialog = (page: Page) => page.getByRole('dialog', { name: 'สร้างเหตุการณ์' });

/** ER Dashboard → คัดกรอง → แท็บ ผู้ป่วยหลายคน → สร้างเหตุการณ์ → กรอกช่องบังคับ (+ จำนวนผู้ป่วย ถ้าให้) — ยังไม่กดสร้าง */
export async function openCreateIncident(page: Page, input: { name: string; location: string; chiefComplaint: string; headcount?: number }) {
  await gotoErDashboard(page);
  await openTriagePage(page);
  await page.getByRole('tab', { name: 'ผู้ป่วยหลายคน' }).click();
  // availability ของช่องจำนวนผู้ป่วยมาพร้อมเปิด dialog
  const availability = waitForApi(page, 'GET', '/cortex-api/er/mass-casualty-incidents/registration-availability', 30_000);
  await page.getByRole('button', { name: /สร้างเหตุการณ์/ }).click();
  const dialog = createDialog(page);
  await expect(dialog).toBeVisible();
  const avail = (await (await availability).json()) as { available: boolean; reason: string | null };
  await dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ }).fill(input.name);
  await dialog.getByRole('textbox', { name: /สถานที่เกิดเหตุ/ }).fill(input.location);
  await dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ }).fill(input.chiefComplaint);
  await dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ }).press('Tab');
  const count = dialog.getByRole('spinbutton');
  if (input.headcount !== undefined) {
    await expect(count, 'ช่องจำนวนผู้ป่วยต้องกดได้').toBeEnabled();
    await count.fill(String(input.headcount));
    await count.press('Tab');
  }
  return { dialog, count, availability: avail };
}

/** กดสร้างใน dialog → คืน id เหตุการณ์ + เวลาที่ใช้จนหน้าเหตุการณ์ขึ้น (ms) */
export async function submitCreateIncident(page: Page, dialog: Locator): Promise<{ id: string; created: MciIncident; navigateMs: number }> {
  const res = waitForApi(page, 'POST', /\/cortex-api\/er\/mass-casualty-incidents$/, 60_000);
  const t0 = Date.now();
  await dialog.getByRole('button', { name: 'สร้าง', exact: true }).click();
  const r = await res;
  await expectOk(r, 'สร้างเหตุการณ์');
  const created = (await r.json()) as MciIncident;
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(page).toHaveURL(new RegExp(`incidentId=${created.id}`), { timeout: 30_000 });
  return { id: created.id, created, navigateMs: Date.now() - t0 };
}

/** แถว member ในรายการของเหตุการณ์ (อ้างด้วย HN — เลขลำดับในรายการเลื่อนได้หลังลบ) */
export function memberRow(page: Page, hn: string): Locator {
  return page.getByRole('main').getByRole('listitem').filter({ hasText: `HN ${hn} ·` }).first();
}

/** ฟอร์มของ member ที่เลือกอยู่ (แผงขวา) — รอให้แถบหัวเป็น HN ของรายนั้น */
export async function selectMember(page: Page, hn: string) {
  const main = page.getByRole('main');
  await expect(async () => {
    await memberRow(page, hn).getByRole('heading').click();
    await expect(main.getByText(`HN ${hn}`, { exact: true }).last()).toBeVisible({ timeout: 10_000 });
  }).toPass({ timeout: 60_000 });
  await expect(readyButton(page)).toBeVisible({ timeout: 30_000 });
}

export const readyButton = (page: Page) => page.getByRole('main').getByRole('button', { name: 'พร้อมส่งและไปคนถัดไป' });
export const submitAllButton = (page: Page) => page.getByRole('main').getByRole('button', { name: 'ส่ง Triage ทั้งเหตุการณ์' });
export const printAllButton = (page: Page) => page.getByRole('main').getByRole('button', { name: /พิมพ์บัตรคิวทั้งหมด/ });
/** ปุ่มระดับ ESI ในฟอร์มของ member (ข้อความปุ่ม "3เร่งด่วน") */
export const esiButton = (page: Page, level: number) => page.getByRole('main').getByRole('button', { name: new RegExp(`^${level}\\s*\\D`) }).last();
/**
 * ปุ่มโซนในฟอร์ม (ชุดบน "ส่งเข้าโซน" เป็นปุ่มแบบเลือกหลายรายที่ disabled → ใช้ตัวสุดท้าย)
 * หลังเลือก ESI โซนที่ระบบแนะนำชื่อปุ่มเป็น "Urgency แนะนำ" และถูกเลือกให้เอง (31 ต.ค. 2026) → ชื่อไม่ตรงตัว
 */
export const zoneButton = (page: Page, zone: string) => page.getByRole('main').getByRole('button', { name: new RegExp(`^${zone}(\\s*แนะนำ)?$`) }).last();

/** กดปุ่มตัวเลือก (ESI / โซน) เฉพาะเมื่อยังไม่ถูกเลือก (aria-pressed) — กดซ้ำตัวที่เลือกอยู่อาจเป็นการยกเลิก */
export async function choose(button: Locator) {
  if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
}

/** เลือก ESI + โซน ในฟอร์มของ member ที่เลือกอยู่ จนปุ่มพร้อมส่งกดได้ (ฟอร์มโหลด draft ตามหลังแล้วล้างค่าได้ → เลือกซ้ำ) */
export async function fillMemberTriage(page: Page, level: number, zone: string) {
  await expect(async () => {
    await choose(esiButton(page, level));
    await choose(zoneButton(page, zone));
    await expect(readyButton(page)).toBeEnabled({ timeout: 4_000 });
  }, `เลือก ESI ${level} + ${zone} จนปุ่มพร้อมส่งกดได้`).toPass({ timeout: 90_000 });
}

/** ภาพก่อนกดพร้อมส่ง + กด → รอ POST …/ready (คืน status) */
export async function pressReady(page: Page, level: number, zone: string, evidenceName?: string): Promise<number> {
  if (evidenceName) {
    await markEvidence(filled(esiButton(page, level), `ESI ${level}`), filled(zoneButton(page, zone)), clicked(readyButton(page)));
    await snapEvidence(page, evidenceName);
  }
  const res = waitForApi(page, 'POST', /\/members\/[^/]+\/ready$/, 30_000);
  await readyButton(page).click();
  return (await res).status();
}
