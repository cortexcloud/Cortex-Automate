import { expect, test, type Locator, type Page, type Response } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { confirmOpenErVisit, expectOk, openTriagePage, registerNewPatient, selectExistingPatient, waitForApi, type ErVisit } from '../helpers/functions/er';
import { graphqlMutation } from '../helpers/functions/er-disposition';
import { randomThaiId, type NewPatient } from '../helpers/data/test-data';
import { envName } from '../utils/env';
import { OPD_DOCTOR, openCareMenu, openOptions, pickOption } from '../helpers/functions/opd-visit';
// ย้ายไป helpers/functions/opd-visit.ts 29 ต.ค. 2026 — export ต่อให้สคริปต์เดิมเรียกได้เหมือนเดิม
export { gotoPatient, openOpdVisit, scheduleWalkInRequest } from '../helpers/functions/opd-visit';

// ส่วนใช้ร่วมของสคริปต์เตรียม Mock Data UAT ER (R31) — ลองบน dev-x ก่อน แล้วรันจริงบน SBH Prod
// locator ตรวจกับหน้าจอ dev-x v2.2.4 เมื่อ 3 ต.ค. 2026 (ขั้นที่ยังไม่ได้ตรวจบน SBH Prod มีหมายเหตุกำกับ)

/** ระบบที่กำลังรัน: 'dev-x' (npm run mock:uat-er:dev) หรือ 'sbh-prod' (npm run mock:uat-er) */
export const SYSTEM = (envName() ?? 'dev-x') as 'dev-x' | 'sbh-prod';

/** สิทธิที่ใช้เปิด Visit ER ให้ผู้ป่วย Mock (ชื่อเต็มตามตัวเลือกใน modal เปิด Visit — เหมือนกันทั้ง 2 ระบบ) */
export const COVERAGE_UC = 'H03 - สิทธิ UC';

/**
 * ค่าที่ต่างกันต่อระบบ — รหัสของ SBH Prod มาจากชีต "Mock-Data ER" (LAB0000001 / IMG0000194 สั่งและส่งคำสั่งได้จริง 3 ต.ค. 2026)
 * `extraCodes`: บน SBH Prod Order Lab ไม่เกิดงานพยาบาล (เกิดเฉพาะ Imaging) → สั่ง Imaging เพิ่มอีก 1 รายการให้ครบ 2 งาน
 */
export const SETTINGS: { labCode: string; imagingCode: string; extraCodes: string[]; opdDoctor: { search: string; name: RegExp } } = {
  'dev-x': { labCode: 'SBHLAB399', imagingCode: 'SBHIMG1', extraCodes: [], opdDoctor: OPD_DOCTOR },
  // แพทย์ของ Visit OPD (opdDoctor) ย้ายไป helpers/functions/opd-visit.ts (OPD_DOCTOR) — 29 ต.ค. 2026
  'sbh-prod': { labCode: 'LAB0000001', imagingCode: 'IMG0000194', extraCodes: ['IMG0000420'], opdDoctor: OPD_DOCTOR },
}[SYSTEM];


const VITALS = { Systolic: '120', Diastolic: '80', PR: '80', RR: '18', Temp: '37', SpO2: '98' };
const PAIN_SCORE = '3';

/** บันทึกผู้ป่วยที่สคริปต์สร้างทุกรอบ ทุกระบบ (ต่อท้ายไฟล์) — ไว้ลง HN ในชีต Mock Data */
const LOG_FILE = path.join(__dirname, 'created-patients.md');
const LOG_HEADER =
  '# ผู้ป่วย Mock Data UAT ER ที่สคริปต์สร้าง\n\n| เวลา | ระบบ | ราย | ชื่อ | HN | VN | EN | เลขบัตร | สถานะที่เตรียม |\n|---|---|---|---|---|---|---|---|---|\n';

interface SearchResult {
  data: { hn: string; firstName: string; familyName?: string | null }[];
  _metadata: { totalCount: number };
}

/** งานพยาบาล 1 งาน (GET /cortex-api/er/nurse-tasks?en=) — เกิดเองจาก Order Lab / Imaging ที่ส่งแล้ว */
export interface NurseTask {
  id: string;
  source: string;
  name: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | string;
}

const uatPrefix = (uatNo: number) => `ER${String(uatNo).padStart(2, '0')}-`;

/** เลขท้ายนามสกุลที่ผู้ป่วย Mock ชื่อ "UAT" นามสกุลขึ้นต้น `prefix` (เช่น "ER04-" / "RED-") ใช้ไปแล้วในระบบ */
async function usedNumbers(page: Page, authorization: string, prefix: string): Promise<number[]> {
  // SBH Prod ตัดการเชื่อมต่อ (ECONNRESET) / ตอบ 5xx เป็นพักๆ — อ่านอย่างเดียว ลองใหม่ได้
  let data: SearchResult['data'] = [];
  await expect(async () => {
    const res = await page.request.get(`/new-demographic-api/patients?filter[name][startsWith]=${encodeURIComponent(prefix)}&perPage=1000`, {
      headers: { authorization },
    });
    await expectOk(res, `ค้นผู้ป่วย Mock เดิม "${prefix}"`);
    ({ data } = (await res.json()) as SearchResult);
  }, `ค้นผู้ป่วย Mock เดิม "${prefix}"`).toPass({ timeout: 60_000 });
  return data
    .filter((p) => p.firstName === 'UAT' && p.familyName?.startsWith(prefix))
    .map((p) => Number(p.familyName!.slice(prefix.length)))
    .filter((n) => Number.isInteger(n));
}

/**
 * เลขชุดถัดไปที่ใช้ร่วมกันได้ทุกข้อใน `uatNos` = เลขท้ายมากสุดของทุกข้อ + 1
 * ใช้กับ env `UAT_SEQ` ให้ผู้ป่วย Mock ทั้งชุดได้เลขท้ายเดียวกัน (UAT ER04-10 / ER05-10 / ER10-10 / ER13-10)
 */
export async function nextUatSetNumber(page: Page, authorization: string, uatNos: number[]): Promise<{ next: number; latest: Record<string, number> }> {
  return nextSetNumberOf(page, authorization, uatNos.map(uatPrefix));
}

/** แบบเดียวกับ `nextUatSetNumber()` แต่ระบุคำนำหน้านามสกุลเอง (เช่น ชุดผู้ป่วยตามโซน "RED-" / "YELLOW-" …) */
export async function nextSetNumberOf(page: Page, authorization: string, prefixes: string[]): Promise<{ next: number; latest: Record<string, number> }> {
  const latest: Record<string, number> = {};
  for (const prefix of prefixes) latest[prefix] = Math.max(0, ...(await usedNumbers(page, authorization, prefix)));
  return { next: Math.max(0, ...Object.values(latest)) + 1, latest };
}

/**
 * ผู้ป่วย Mock ของ UAT ข้อ `uatNo`: ชื่อ "UAT" นามสกุล "ER<ข้อ 2 หลัก>-<ลำดับ 2 หลัก>" เช่น UAT ER04-01
 * ลำดับ = เลขท้ายมากสุดที่มีในระบบ + 1 → รันซ้ำแล้วเลขเพิ่มขึ้นเรื่อยๆ
 * ตั้ง env `UAT_SEQ=<เลข>` = ใช้เลขนั้นเป็นลำดับ (ผู้ป่วยทั้งชุดได้เลขท้ายเดียวกัน) — ชื่อนั้นมีในระบบแล้วจะหยุด ไม่สร้างชื่อซ้ำ
 */
export async function nextUatPatient(page: Page, authorization: string, uatNo: number): Promise<NewPatient> {
  return nextPrefixedPatient(page, authorization, uatPrefix(uatNo));
}

/** ผู้ป่วย Mock ชื่อ "UAT" นามสกุล `<prefix><ลำดับ 2 หลัก>` — กติกาลำดับ / `UAT_SEQ` เหมือน `nextUatPatient()` */
export async function nextPrefixedPatient(page: Page, authorization: string, prefix: string): Promise<NewPatient> {
  const used = await usedNumbers(page, authorization, prefix);
  let next = Math.max(0, ...used) + 1;
  if (process.env.UAT_SEQ) {
    next = Number(process.env.UAT_SEQ);
    if (!Number.isInteger(next) || next < 1) throw new Error(`UAT_SEQ ต้องเป็นเลขจำนวนเต็มตั้งแต่ 1 ขึ้นไป (ได้ "${process.env.UAT_SEQ}")`);
    if (used.includes(next)) {
      throw new Error(`[${SYSTEM}] มีผู้ป่วย "UAT ${prefix}${String(next).padStart(2, '0')}" ในระบบแล้ว — เปลี่ยนเลข UAT_SEQ (เลขล่าสุดของ "${prefix}" คือ ${Math.max(...used)})`);
    }
  }
  return {
    citizenId: randomThaiId(),
    firstName: 'UAT',
    familyName: `${prefix}${String(next).padStart(2, '0')}`,
    gender: 'ชาย',
    birthDate: '15/01/1990',
  };
}

/**
 * ลงทะเบียนผู้ป่วยใหม่ที่หน้าคัดกรอง ER แล้วเปิด Visit ER สิทธิ UC
 * SBH Prod: modal เปิด Visit บางครั้งค้างโหลด (query ImagingOrdersForRegistrationByHN ไม่ตอบ) ปุ่มยืนยันกดไม่ได้
 * → โหลดหน้าใหม่ ค้นผู้ป่วยด้วย HN ที่เพิ่งได้ แล้วเปิด Visit อีกครั้ง
 */
export async function registerAndOpenErVisit(page: Page, patient: NewPatient): Promise<ErVisit> {
  await openTriagePage(page);
  const { hn, dialog } = await registerMockPatient(page, patient);
  if (dialog) return confirmUcVisit(page, hn, dialog);
  await page.reload();
  return confirmUcVisit(page, hn, await selectExistingPatient(page, hn));
}

/**
 * ลงทะเบียนผู้ป่วยใหม่ที่หน้าคัดกรอง ER (อยู่หน้านั้นแล้ว) → HN + modal เปิด Visit
 * SBH Prod: ลงทะเบียนสำเร็จแล้วบางครั้ง modal เปิด Visit ไม่ขึ้น (6 ต.ค. 2026) → คืน HN อย่างเดียว ให้ผู้เรียกทำต่อกับ HN นี้ ไม่ลงทะเบียนซ้ำ
 */
export async function registerMockPatient(page: Page, patient: NewPatient): Promise<{ hn: string; dialog?: Locator }> {
  let hn: string | undefined;
  const capture = async (res: Response) => {
    if (res.request().method() !== 'POST' || !new URL(res.url()).pathname.endsWith('/cortex-api/patients/er-registration') || !res.ok()) return;
    hn = ((await res.json().catch(() => ({}))) as { patient?: { data?: { hn?: string } } }).patient?.data?.hn;
  };
  page.on('response', capture);
  try {
    return await registerNewPatient(page, patient);
  } catch (error) {
    if (!hn) throw error;
    console.log(`[${SYSTEM}] ลงทะเบียน ${patient.firstName} ${patient.familyName} ได้ HN ${hn} แล้ว แต่ modal เปิด Visit ไม่ขึ้น — ทำต่อกับ HN นี้`);
    return { hn };
  } finally {
    page.off('response', capture);
  }
}

/** เปิด Visit ER สิทธิ UC ให้ผู้ป่วยที่มี HN แล้ว (เริ่มจากหน้า ER Dashboard) — ค้างโหลดก็ลองใหม่แบบเดียวกับ `registerAndOpenErVisit()` */
export async function openErVisitForHn(page: Page, hn: string): Promise<ErVisit> {
  await openTriagePage(page);
  return confirmUcVisit(page, hn, await selectExistingPatient(page, hn));
}

async function confirmUcVisit(page: Page, hn: string, dialog: Locator): Promise<ErVisit> {
  try {
    return await confirmOpenErVisit(page, dialog, COVERAGE_UC);
  } catch (error) {
    // ลองใหม่เฉพาะตอนที่ยังกดยืนยันไม่ได้ (ยังไม่ได้ส่งคำขอเปิด Visit) — พังหลังส่งแล้วให้เทสพังตามเดิม
    if (!(await dialog.getByTestId('create-visit-submit').isDisabled().catch(() => false))) throw error;
    console.log(`[${SYSTEM}] modal เปิด Visit ของ HN ${hn} ค้างโหลด — โหลดหน้าใหม่แล้วลองอีกครั้ง`);
    await page.reload();
    return confirmOpenErVisit(page, await selectExistingPatient(page, hn), COVERAGE_UC);
  }
}

/** จดผู้ป่วยที่เตรียมเสร็จ: ลงรายงาน (annotation) + console + ต่อท้าย created-patients.md */
export function recordMockPatient(label: string, patient: NewPatient, ids: Partial<ErVisit> & { hn: string }, state: string) {
  const name = `${patient.firstName} ${patient.familyName}`;
  const numbers = [`HN ${ids.hn}`, ids.vn && `VN ${ids.vn}`, ids.en && `EN ${ids.en}`].filter(Boolean).join(' · ');
  const line = `[${SYSTEM}] ${label}: ${name} · ${numbers} · เลขบัตร ${patient.citizenId} — ${state}`;
  test.info().annotations.push({ type: 'Mock Data', description: line });
  console.log(line);

  const now = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, LOG_HEADER);
  fs.appendFileSync(LOG_FILE, `| ${now} | ${SYSTEM} | ${label} | ${name} | ${ids.hn} | ${ids.vn ?? '-'} | ${ids.en ?? '-'} | ${patient.citizenId} | ${state} |\n`);
}

/**
 * ER Physician Note: Vital Signs (ฟอร์มบังคับ) + Present Illness + Diagnosis K30 (R21) → บันทึก
 * ผู้ป่วยที่คัดกรองโดยไม่กรอกสัญญาณชีพ บันทึก Note บน dev-x ได้ 500 (3 ต.ค. 2026) → ราย A จึงกรอกสัญญาณชีพตั้งแต่ขั้นคัดกรอง
 */
/**
 * รหัส Diagnosis ที่ใช้หมุนเวียนตามเลขชุด (ผู้ใช้ขอ 8 ต.ค. 2026: Diagnosis ของแต่ละชุดไม่ซ้ำกัน) — ชุดที่เลขติดกัน 10 ชุดได้รหัสไม่ซ้ำ
 * รหัสที่ค้นไม่เจอในระบบนั้นจะข้ามไปตัวถัดไป (ดูรหัสที่ได้จริงจากค่าที่ `savePhysicianNote()` คืน)
 */
// SBH Prod (8 ต.ค. 2026): ช่องค้นหา Dx ของ Physician Note เจอเฉพาะรหัส 3 ตัวอักษร (J02.9 / R10.4 / M54.5 / N39.0 ค้นไม่เจอ) · K30 J00 R51 R42 R05 R11 ค้นเจอ — ที่เหลือยังไม่ได้ลอง
const DX_CODES = ['K30', 'J00', 'R51', 'R42', 'R05', 'R55', 'R21', 'J22', 'R17', 'R11'];

/** รหัส Dx ของชุดเลข `seq` — env `MOCK_DX` กำหนดเองได้ */
export function dxForSet(seq: number): string {
  return process.env.MOCK_DX || DX_CODES[(Number.isInteger(seq) ? seq : 0) % DX_CODES.length];
}

/** บันทึก ER Physician Note ด้วย Diagnosis `dx` (ตั้งต้น K30) → คืนข้อความ Dx ที่เลือกจริง เช่น "K30 - Functional dyspepsia" */
export async function savePhysicianNote(page: Page, dx = 'K30'): Promise<string> {
  const main = page.getByRole('main');
  const illness = main.locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]');
  await openCareMenu(page, 'ER Physician Note', main.getByRole('heading', { name: 'ER Physician Note' }));
  await expect(illness).toBeVisible();

  for (const [name, value] of Object.entries(VITALS)) await main.getByRole('spinbutton', { name }).last().fill(value);
  // SBH Prod (v2.8.1): ฟอร์มมีหัวข้อ Pain Score — เว้นว่างแล้ว API ตอบ 400 "pain_scale … Observation contains no results"
  // ช่องเป็นปุ่ม radio 0–10 หรือ <select> แล้วแต่ความกว้างของฟอร์ม · dev-x ไม่มีหัวข้อนี้
  const pain = main.locator('[data-path*="pain_scale_vas"][data-path$="overall_score"]').last();
  if (await pain.count()) {
    const select = pain.locator('select');
    if (await select.count()) await select.selectOption(PAIN_SCORE);
    else await pain.locator(`label:has(input[type="radio"][value="${PAIN_SCORE}"])`).click();
  }
  await illness.fill('ปวดท้องใต้ลิ้นปี่ 1 วัน ไม่มีไข้ (Mock Data UAT)');
  // ลองรหัสที่ขอก่อน ค้นไม่เจอ (ระบบนั้นไม่มีรหัสนี้) ค่อยไล่ตัวถัดไปใน DX_CODES
  const candidates = [dx, ...DX_CODES.filter((code) => code !== dx)];
  let chosen = '';
  // ช่องค้นหา Dx: placeholder "ค้นหา" → เลือกแล้ว placeholder เป็นรหัสที่เลือก — จับด้วย placeholder เพราะ role ต่างกันต่อเวอร์ชันฟอร์ม
  // (dev-x / SBH Prod ถึง 7 ต.ค. 2026 = textbox · SBH Prod 8 ต.ค. 2026 = combobox ทำให้ getByRole('textbox') หาไม่เจอ)
  for (const code of candidates) {
    const selected = main.getByPlaceholder(code, { exact: true });
    if (await selected.count()) {
      chosen = code; // เลือกไว้แล้วจากรอบก่อน (draft)
      break;
    }
    await main.getByPlaceholder('ค้นหา', { exact: true }).fill(code);
    const option = page.getByText(new RegExp(`^${code.replace('.', '\\.')} - `)).first();
    if (!(await option.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false))) continue;
    chosen = ((await option.textContent()) ?? code).trim();
    await option.click();
    await expect(selected).toBeVisible();
    break;
  }
  expect(chosen, `ต้องเลือก Diagnosis ได้ (ลองรหัส ${candidates.join(', ')})`).not.toBe('');

  // กดบันทึกเร็วไปหลังเลือก Dx ฟอร์มจะยังไม่ส่ง (เงียบ ไม่มีข้อความ) → กดซ้ำจนเห็น API บันทึกของฟอร์มนี้
  const save = main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).last();
  let saved: Response | undefined;
  await expect(async () => {
    const contribution = page.waitForResponse(
      (res) => res.request().method() === 'POST' && /\/contribution$/.test(new URL(res.url()).pathname) && (res.request().postData() ?? '').includes('sbh_er_physician_note'),
      { timeout: 8_000 },
    );
    await save.click();
    saved = await contribution;
  }, 'กดบันทึกแล้วฟอร์มต้องส่งข้อมูล (ถ้าไม่ส่ง ดูข้อความ "กรุณากรอกข้อมูล" ในฟอร์ม)').toPass({ timeout: 40_000 });
  await expectOk(saved!, 'บันทึก ER Physician Note');
  return chosen;
}

/**
 * One Day Order: เพิ่มรายการตามรหัสลงตะกร้า → ส่งคำสั่ง (รายการรังสีมีแบบฟอร์ม Imaging ให้บันทึกก่อน แล้วกดส่งอีกครั้ง)
 * จบแล้วทุกรายการต้องเป็น "ส่งแล้ว" — ผลยังไม่ออก จึงค้างเป็น "รอผล" และเกิดงานพยาบาลรายการละ 1 งาน
 */
/** หน้าต่างเตือนของ Order ("Drug Alert" / "Lab Alert" … เช่นรายการซ้ำ — เด้งตอนเพิ่มลงตะกร้าหรือตอนส่งคำสั่ง) */
export function orderAlert(page: Page): Locator {
  return page.getByRole('dialog', { name: /(Drug|Lab|Imaging|Order) Alert/ }).last();
}

/** หน้าต่างเตือนของ Order: ระบุเหตุผลทุกแถว → "ยืนยันการสั่งออเดอร์" */
export async function confirmOrderAlert(page: Page) {
  const alert = orderAlert(page);
  console.log(`    ${(await alert.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
  for (const reason of await alert.getByRole('textbox').all()) await reason.fill('ทดสอบระบบ (สคริปต์ UAT ER)');
  await alert.getByRole('button', { name: 'ยืนยันการสั่งออเดอร์' }).click();
  await expect(alert).toBeHidden();
}

export async function submitOrders(page: Page, codes: string[], options: { resume?: boolean } = {}) {
  const main = page.getByRole('main');
  const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  await openCareMenu(page, 'One Day Order', main.getByRole('heading', { name: 'Order', exact: true }));
  await expect(search).toBeVisible();

  // `resume` = ทำต่อจากรอบที่ส่งคำสั่งไม่สำเร็จ: รายการที่ค้างในตะกร้า / ส่งไปแล้ว ไม่เพิ่มซ้ำ (เพิ่มซ้ำจะได้รายการซ้อน + หน้าต่างเตือนรายการซ้ำ)
  const sentRow = (code: string) => main.getByRole('row', { name: new RegExp(`^(ส่งแล้ว|กำลังดำเนินการ) \\[${code}\\]`) });
  if (options.resume) {
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    if ((await Promise.all(codes.map((code) => sentRow(code).count()))).every((n) => n > 0)) return;
  }

  for (const code of codes) {
    const rows = main.getByRole('row').filter({ hasText: `[${code}]` });
    const before = await rows.count();
    if (options.resume && before) continue;
    // SBH Prod (5 ต.ค. 2026): กดเพิ่มแล้ว API ตอบสำเร็จ แต่บางครั้งแถวไม่ขึ้นในตะกร้า → ค้นแล้วเพิ่มใหม่จนแถวขึ้น
    await expect(async () => {
      if ((await rows.count()) <= before) {
        await search.fill(code);
        const option = openOptions(page).filter({ hasText: `[${code}]` }).first();
        await expect(option, `ต้องค้นเจอรายการรหัส ${code}`).toBeVisible();
        await option.click();
        // ฟอร์มของรายการยังเติมค่าตั้งต้นไม่เสร็จ กดเพิ่มแล้วเงียบ → กดซ้ำจนเห็น API เพิ่มรายการ
        let added: Response | undefined;
        await expect(async () => {
          const upserted = graphqlMutation(page, 'UpsertOpdOrder', 8_000);
          upserted.catch(() => undefined); // ปุ่มกดไม่ได้ก่อน (เช่น หน้าต่างบัง) → promise นี้หมดเวลาทีหลัง ไม่ให้กลายเป็น unhandled rejection ที่ล้มทั้งเทส
          await page.getByRole('button', { name: 'plus เพิ่มลงตะกร้า' }).click();
          added = await upserted;
        }, `กด "เพิ่มลงตะกร้า" ของ ${code} แล้วต้องมีการบันทึกรายการ`).toPass({ timeout: 40_000 });
        await expectOk(added!, `เพิ่ม ${code} ลงตะกร้า`);
        if (await orderAlert(page).isVisible()) await confirmOrderAlert(page);
      }
      await expect(rows, `รายการ ${code} ต้องขึ้นในตะกร้า`).toHaveCount(before + 1, { timeout: 15_000 });
    }).toPass({ timeout: 150_000 });
  }

  const submit = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
  const imagingForm = page.getByRole('dialog', { name: /แบบฟอร์ม Imaging/ });
  const signed = graphqlMutation(page, 'SignOPDOrders', 120_000);
  signed.catch(() => undefined); // พังก่อนถึงบรรทัดที่รอ จะได้ไม่มี unhandled rejection
  // รายการรังสีที่มีแบบฟอร์ม: กดส่งครั้งแรกเด้งแบบฟอร์ม (ไม่บังคับกรอกช่องใด) → บันทึก → กดส่งอีกครั้ง
  // กดส่งทันทีหลังเพิ่มรายการ บางครั้งค้างที่ "กำลังตรวจสอบแบบฟอร์ม Imaging" ไม่เด้งอะไร (dev-x 3 ต.ค. 2026) → กดซ้ำ
  // กดส่งแล้วอาจเด้งหน้าต่างเตือน ("Drug Alert" / "Lab Alert" เช่นรายการซ้ำ) ที่ต้องระบุเหตุผลทุกแถวก่อนกด "ยืนยันการสั่งออเดอร์"
  const drugAlert = orderAlert(page);
  const shown = (dialog: Locator, name: string) => dialog.waitFor({ state: 'visible', timeout: 10_000 }).then(() => name, () => 'nothing');
  let outcome = 'nothing';
  await submit.click();
  for (let round = 0; round < 8 && outcome !== 'signed'; round++) {
    outcome = await Promise.race([shown(imagingForm, 'form'), shown(drugAlert, 'alert'), signed.then(() => 'signed', () => 'nothing')]);
    if (outcome === 'form') {
      const formSaved = waitForApi(page, 'PUT', '/cortex-api/imaging-order-form-compositions');
      await imagingForm.getByRole('button', { name: 'save บันทึก' }).click();
      await expectOk(await formSaved, 'บันทึกแบบฟอร์ม Imaging');
      await expect(imagingForm).toBeHidden();
      // หน้าต่างถัดไป (แบบฟอร์มของรายการอื่น / Drug Alert) อาจเด้งมาบังปุ่มก่อนกดทัน → กดไม่ได้ก็วนไปดูหน้าต่างต่อ
      await submit.click({ timeout: 5_000 }).catch(() => undefined);
    } else if (outcome === 'alert') {
      await confirmOrderAlert(page);
    } else if (outcome === 'nothing') {
      await submit.click({ timeout: 5_000 }).catch(() => undefined);
    }
  }
  expect(outcome, 'กดส่งคำสั่งแล้วต้องส่งคำสั่งสำเร็จ').toBe('signed');
  const res = await signed;
  await expectOk(res, 'ส่งคำสั่ง');
  const body = (await res.json()) as { data?: { signOPDOrders?: { accepted?: boolean } }; errors?: { message: string }[] };
  expect(body.data?.signOPDOrders?.accepted, `ส่งคำสั่งไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ') ?? JSON.stringify(body)}`).toBe(true);
  // สถานะหน้ารายการหลังส่ง: dev-x "ส่งแล้ว" · SBH Prod "กำลังดำเนินการ"
  // .first(): รอบที่แถวขึ้นช้าแล้วถูกเพิ่มซ้ำ จะมี 2 แถวรหัสเดียวกัน
  for (const code of codes) await expect(sentRow(code).first()).toBeVisible({ timeout: 60_000 }); // SBH Prod: สถานะแถวเปลี่ยนช้ากว่า 20 วินาทีได้ (7 ต.ค. 2026)
}

/** งานพยาบาลของ Encounter (หน้า "รายการงานพยาบาล" ใช้ข้อมูลชุดนี้) */
export async function fetchNurseTasks(page: Page, authorization: string, en: string): Promise<NurseTask[]> {
  const res = await page.request.get(`/cortex-api/er/nurse-tasks?en=${en}`, { headers: { authorization } });
  await expectOk(res, `อ่านงานพยาบาลของ ${en}`);
  return ((await res.json()) as { data: NurseTask[] }).data;
}

/**
 * กดรับงานพยาบาล 1 งานของผู้ป่วยในหน้า "รายการงานพยาบาล" → งานนั้นเปลี่ยนจาก "รอรับงาน" เป็น "กำลังทำ"
 * ตอนนี้ไม่มีรายไหนเรียกใช้ — ผู้ใช้ให้ราย A ไม่กดรับงาน (3 ต.ค. 2026) · เก็บไว้เผื่อปรับกลับ
 * (SBH Prod 3 ต.ค. 2026: เลือกผู้ป่วยจากรายชื่อฝั่งซ้าย → ปุ่ม `รับงาน` ท้ายแถว → `POST …/nurse-tasks/<id>/accept` → `{status:"RUNNING"}` ไม่มี dialog / toast)
 */
export async function acceptNurseTask(page: Page, visit: ErVisit) {
  const main = page.getByRole('main');
  await page.goto('/cortex/er/nurse-task-list');
  await main.getByRole('button', { name: new RegExp(`HN ${visit.hn} `) }).click({ timeout: 60_000 });
  await expect(main.getByText(`HN ${visit.hn}`, { exact: true })).toBeVisible();
  const accepted = waitForApi(page, 'POST', /^\/cortex-api\/er\/nurse-tasks\/[^/]+\/accept$/);
  await main.getByRole('button', { name: 'รับงาน', exact: true }).first().click();
  const res = await accepted;
  await expectOk(res, 'รับงานพยาบาล');
  expect(((await res.json()) as { status?: string }).status, 'รับงานแล้วสถานะต้องเป็น RUNNING (กำลังทำ)').toBe('RUNNING');
}

/**
 * บันทึกประวัติแพ้ยาตัวอย่าง (paracetamol · อาการคัน · Mild · ผู้ป่วยให้ประวัติเอง) จากเมนูขวา "บันทึกการแพ้" — ไม่ต้องมี Visit
 * บันทึกแล้วแถบหัวผู้ป่วยต้องขึ้นชื่อยาที่ช่อง "แพ้:" · `drugSearch` = คำค้นชื่อยา (ตั้งต้น paracetamol)
 */
export async function recordDrugAllergy(page: Page, drugSearch = 'paracetamol'): Promise<string> {
  const drugPattern = new RegExp(drugSearch, 'i');
  const main = page.getByRole('main');
  const panel = main.getByRole('tabpanel', { name: 'แพ้ยา' });
  await openCareMenu(page, 'บันทึกการแพ้', panel.getByRole('heading', { name: 'การแพ้ยา' }));

  const drug = panel.getByRole('combobox', { name: '* ชื่อยา' });
  await drug.click();
  await drug.fill(drugSearch);
  await expect(openOptions(page).filter({ hasText: drugPattern }).first()).toBeVisible();
  // ตัวเลือกยาผสม (เช่น paracetamol + tramadol) จะบันทึกแพ้ทุกตัวยา → เลือกยาเดี่ยว
  const drugName = await pickOption(page, new RegExp(`^${drugSearch} \\(`, 'i'));
  await panel.getByRole('combobox', { name: '* ประเภทของการแพ้ยา' }).click();
  await pickOption(page, /^อาการคัน$/);
  await panel.getByRole('textbox', { name: '* สรุปอาการแพ้' }).fill('ผื่นคันหลังกินยา (Mock Data UAT)');
  await panel.locator('.ant-select').filter({ hasText: 'เลือกผลการประเมิน' }).getByRole('combobox').click();
  await pickOption(page, /^Confirmed$/);
  await panel.getByRole('combobox', { name: '* Severity' }).click();
  await pickOption(page, /^Mild$/);
  await panel.getByRole('combobox', { name: '* การแจ้งข้อมูลการแพ้ยาคนไข้' }).click();
  await pickOption(page, /^ผป\.ให้ประวัติเอง$/);

  const created = graphqlMutation(page, 'CreateMedicationAllergy');
  await panel.getByRole('button', { name: 'save บันทึก' }).click();
  const res = await created;
  await expectOk(res, 'บันทึกประวัติแพ้ยา');
  const body = (await res.json()) as { data?: { createMedicationAllergy?: { compositionUid?: string } }; errors?: { message: string }[] };
  expect(body.data?.createMedicationAllergy?.compositionUid, `บันทึกแพ้ยาไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBeTruthy();
  await expect(main.locator('div').filter({ hasText: /^แพ้:/ }).last(), 'แถบหัวผู้ป่วยต้องแสดงยาที่แพ้').toContainText(drugPattern);
  return drugName;
}

/**
 * เช็คอิน Visit OPD: หน้าผู้ป่วยของ Visit → ช่อง "สถานะ" บนแถบหัว (รอเช็คอิน / เช็คอิน / ยกเลิก) → "เช็คอิน"
 * → ผู้ป่วยย้ายจากแท็บ "รอเช็คอิน" ไปแท็บ "เช็คอิน" ของรายการผู้ป่วยนอก และได้เลขคิวตรวจ (คืนเลขคิว)
 */
export async function checkInOpdVisit(page: Page, visit: ErVisit): Promise<string> {
  await page.goto(`/cortex/next/patients/${visit.hn}?en=${visit.en}&vn=${visit.vn}`);
  // หน้าจอมีช่องสถานะซ่อนอยู่อีกตัว → ใช้ตัวที่มองเห็น
  const status = page.getByRole('main').locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
  await expect(status).toHaveText(/^(รอเช็คอิน|เช็คอิน)$/, { timeout: 60_000 });
  if ((await status.textContent()) === 'เช็คอิน') return 'เช็คอินอยู่แล้ว';
  await status.click();
  const checkedIn = graphqlMutation(page, 'CheckInEncounterStatus');
  await openOptions(page).filter({ hasText: /^เช็คอิน$/ }).click();
  const res = await checkedIn;
  await expectOk(res, 'เช็คอิน Visit OPD');
  const body = (await res.json()) as { data?: { checkInEncounterStatus?: { accepted?: boolean; queue?: { qDisplay?: string } | null } }; errors?: { message: string }[] };
  expect(body.data?.checkInEncounterStatus?.accepted, `เช็คอินไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ') ?? JSON.stringify(body).slice(0, 300)}`).toBe(true);
  await expect(status).toHaveText('เช็คอิน');
  return body.data?.checkInEncounterStatus?.queue?.qDisplay ?? '-';
}
