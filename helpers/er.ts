import { expect, test, type APIResponse, type Locator, type Page, type Response } from '@playwright/test';
import type { NewPatient } from './test-data';

// ขั้นตอนหน้าจอโมดูลห้องฉุกเฉิน (ER) ที่ใช้ซ้ำหลายการ์ด — locator ตรวจกับหน้าจอจริงบน dev-x 26 ก.ย. 2026

/** เลขที่ได้จากการเปิด Visit ER (response ของ POST /cortex-api/er/visits) */
export interface ErVisit {
  hn: string;
  vn: string;
  en: string;
}

/**
 * Encounter 1 รายการในข้อมูลที่ ER Dashboard โหลด (GET /cortex-api/er/dashboard/encounters?date=YYYY-MM-DD)
 * มี Encounter ที่ยกเลิกแล้วของวันนั้นปนมาด้วย (latestStatusCode 'cancelled') แต่ไม่แสดงบนบอร์ด
 */
export interface ErDashboardEncounter {
  hn: string;
  vn: string;
  en: string;
  latestStatusCode: string;
  patientStatus: string;
}

/** ผู้ป่วย 1 รายจากผลค้นหา (GET /new-demographic-api/patients?filter[name][startsWith]=...) */
export interface FoundPatient {
  hn: string;
  firstName: string;
  familyName?: string | null;
  deceased?: boolean;
}

/** ผู้ป่วยทดสอบของทีม = ชื่อขึ้นต้น "คนไข้" (ทีมใช้ร่วมกันตอนเทสมือ) */
const TEAM_PATIENT_PREFIX = 'คนไข้';

/** latestStatusCode ของ Encounter / Admission ที่ถือว่าจบแล้ว — ค่าอื่น (เช่น in-progress) = ยังค้างอยู่ */
const FINISHED_STATUSES = ['completed', 'cancelled', 'entered-in-error'];

/** API ต้องตอบ 2xx — ถ้าไม่ใช่ ข้อความ error จะมี status + body ไว้ดูสาเหตุ (response จากหน้าเว็บ หรือจาก page.request) */
export async function expectOk(res: Response | APIResponse, what: string) {
  const detail = res.ok() ? '' : ` ${(await res.text().catch(() => '')).slice(0, 500)}`;
  const method = 'request' in res ? `${res.request().method()} ` : '';
  expect(res.ok(), `${what}: ${method}${new URL(res.url()).pathname} → ${res.status()}${detail}`).toBe(true);
}

/** รอ response ของ API ตาม method + path (ตรงทั้ง path หรือ RegExp สำหรับ path ที่มีเลขเปลี่ยนไป) — เริ่มรอก่อนกดปุ่มที่ยิง API */
export function waitForApi(page: Page, method: string, path: string | RegExp, timeout?: number) {
  const matches = (pathname: string) => (typeof path === 'string' ? pathname === path : path.test(pathname));
  return page.waitForResponse((res) => res.request().method() === method && matches(new URL(res.url()).pathname), { timeout });
}

async function readDashboardEncounters(res: Response): Promise<ErDashboardEncounter[]> {
  await expectOk(res, 'โหลดรายการผู้ป่วย ER Dashboard');
  return (await res.json()) as ErDashboardEncounter[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** ตัวเลือกใน dropdown ของ Ant Design — แต่ละตัวมี title เป็นข้อความเต็ม */
function antOption(page: Page, title: string, match: '=' | '^=' = '='): Locator {
  return page.locator(`.ant-select-item-option[title${match}"${title}"]`);
}

export function openVisitDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'เปิด Visit ER' });
}

/** เปิดหน้าแดชบอร์ด / คิว ของ ER (โหลดแอปใหม่ ~11 วินาที — ใช้ครั้งเดียวตอนเริ่มเทส) → คืนรายการที่บอร์ดโหลดมา */
export async function gotoErDashboard(page: Page): Promise<ErDashboardEncounter[]> {
  // บอร์ดยิง API หลังโหลดแอปเสร็จ → รอนานกว่าค่าตั้งต้น 20 วินาที
  const loaded = waitForApi(page, 'GET', '/cortex-api/er/dashboard/encounters', 45_000);
  await page.goto('/cortex/er/dashboard');
  await expect(page.getByRole('main').getByText('แดชบอร์ด / คิว')).toBeVisible();
  return readDashboardEncounters(await loaded);
}

/** ปุ่ม "+ คัดกรอง" บน Dashboard → หน้าคัดกรอง (ข้อมูลผู้ป่วย 3 แบบ + ฟอร์ม) */
export async function openTriagePage(page: Page) {
  await page.getByRole('button', { name: 'plus คัดกรอง' }).click();
  await expect(page).toHaveURL(/\/cortex\/er\/triage/);
}

/** "ผู้ป่วยใหม่" → กรอกเฉพาะช่องบังคับ → ลงทะเบียน → ระบบเปิด modal "เปิด Visit ER" ให้เองพร้อม HN ใหม่ */
export async function registerNewPatient(page: Page, patient: NewPatient): Promise<{ hn: string; dialog: Locator }> {
  await page.locator('label').filter({ hasText: 'ผู้ป่วยใหม่' }).click();
  await page.getByRole('textbox', { name: '* เลขบัตรประชาชน', exact: true }).fill(patient.citizenId);
  await page.getByRole('textbox', { name: '* ชื่อ', exact: true }).fill(patient.firstName);
  await page.getByRole('textbox', { name: '* นามสกุล', exact: true }).fill(patient.familyName);
  await page.getByRole('combobox', { name: '* เพศ', exact: true }).click();
  await antOption(page, patient.gender).click();
  const birthDate = page.getByRole('textbox', { name: '* วัน/เดือน/ปีเกิด', exact: true });
  await birthDate.fill(patient.birthDate);
  // ห้ามกด Enter: ถ้าช่องบังคับครบแล้ว Enter จะส่งฟอร์มลงทะเบียนทันที (ไม่ได้ผ่านปุ่ม)
  await birthDate.press('Tab');
  await expect(birthDate).toHaveValue(patient.birthDate);

  const registered = waitForApi(page, 'POST', '/cortex-api/patients/er-registration');
  await page.getByRole('button', { name: 'ลงทะเบียนผู้ป่วย' }).click();
  const res = await registered;
  await expectOk(res, 'ลงทะเบียนผู้ป่วยใหม่ที่ ER');
  const body = (await res.json()) as { patient?: { data?: { hn?: string } } };
  const hn = body.patient?.data?.hn;
  if (!hn) throw new Error(`ไม่เจอ patient.data.hn ใน response ลงทะเบียน: ${JSON.stringify(body).slice(0, 300)}`);

  const dialog = openVisitDialog(page);
  await expect(dialog.getByText(`HN ${hn}`, { exact: true })).toBeVisible();
  return { hn, dialog };
}

/**
 * "ผู้ป่วยมี HN" → พิมพ์ในช่องค้นหา → ผลค้นหาตามชื่อจาก API (หน้าแรก 10 คน)
 * ระบบจับข้อความที่ชื่อหรือนามสกุลขึ้นต้นด้วยคำนั้น และใส่ชื่อเต็ม "ชื่อ นามสกุล" ก็ได้
 */
export async function searchPatients(page: Page, text: string): Promise<{ data: FoundPatient[]; totalCount: number }> {
  const res = await searchByName(page, text);
  const body = (await res.json()) as { data: FoundPatient[]; _metadata: { totalCount: number } };
  return { data: body.data, totalCount: body._metadata.totalCount };
}

async function searchByName(page: Page, text: string): Promise<Response> {
  await page.locator('label').filter({ hasText: 'ผู้ป่วยมี HN' }).click();
  const searched = page.waitForResponse((res) => {
    const url = new URL(res.url());
    return url.pathname === '/new-demographic-api/patients' && url.searchParams.get('filter[name][startsWith]') === text;
  });
  await page.getByRole('combobox', { name: 'ค้นหาผู้ป่วยด้วย HN หรือชื่อ' }).fill(text);
  const res = await searched;
  await expectOk(res, `ค้นหาผู้ป่วย "${text}"`);
  return res;
}

/**
 * ผู้ป่วยมี HN สำหรับเทส (R15): ค้น "คนไข้" แล้วสุ่มคนที่ไม่มี Encounter / Admission ค้าง
 * บอร์ด ER แสดงแค่ของวันนี้ แต่มีผู้ป่วยทีมที่ Visit ER ค้างข้ามวัน และที่ Admit อยู่ (เปิด Visit ไม่ได้: 400 ErrVisitBlockedByActiveAdmission)
 * ใช้แค่หน้าแรกของผลค้นหา (10 คน) เท่าที่หน้าจอแสดง
 */
export async function pickTeamPatient(page: Page): Promise<FoundPatient> {
  const res = await searchByName(page, TEAM_PATIENT_PREFIX);
  // แอปไม่ได้เช็คให้ก่อนเปิด modal → ถามข้อมูลเองด้วย token เดียวกับที่แอปใช้ตอนค้นหา
  const authorization = res.request().headers()['authorization'];
  const { data } = (await res.json()) as { data: FoundPatient[] };
  // ผลค้นหาจับนามสกุลด้วย (เช่น "Jame คนไข้ER01") → เอาเฉพาะคนที่ชื่อขึ้นต้นด้วย "คนไข้"
  const candidates = data.filter((p) => p.firstName.startsWith(TEAM_PATIENT_PREFIX) && !p.deceased);

  const skipped: string[] = [];
  for (const patient of shuffle(candidates)) {
    const unfinished = await unfinishedCare(page, patient.hn, authorization);
    if (!unfinished.length) {
      if (skipped.length) test.info().annotations.push({ type: 'ข้ามผู้ป่วยที่มีงานค้าง', description: skipped.join(' · ') });
      return patient;
    }
    skipped.push(`${patient.hn} (${unfinished.join(', ')})`);
  }
  throw new Error(`ไม่มีผู้ป่วยทดสอบ "${TEAM_PATIENT_PREFIX}…" ที่ว่าง (ผลค้นหาหน้าแรก) — ${skipped.join(' · ') || 'ไม่พบผู้ป่วย'}`);
}

/** Encounter / Admission ของผู้ป่วยที่ยังไม่จบ (อ่านจาก generated-emr-api ชุดเดียวกับที่แอปใช้) */
async function unfinishedCare(page: Page, hn: string, authorization: string): Promise<string[]> {
  const unfinished: string[] = [];
  for (const [table, idKey, label] of [['encounters', 'en', 'Encounter'], ['admissions', 'an', 'Admission']] as const) {
    const res = await page.request.get(`/generated-emr-api/${table}?filter[hn][equals]=${hn}&perPage=1000`, { headers: { authorization } });
    await expectOk(res, `ดู ${label} ของ HN ${hn}`);
    const { data } = (await res.json()) as { data: Record<string, string>[] };
    for (const row of data) {
      if (!FINISHED_STATUSES.includes(row.latestStatusCode)) unfinished.push(`${label} ${row[idKey]} ${row.latestStatusCode}`);
    }
  }
  return unfinished;
}

/** "ผู้ป่วยมี HN" → ค้นด้วย HN แล้วเลือกจากผลค้นหา → ระบบเปิด modal "เปิด Visit ER" */
export async function selectExistingPatient(page: Page, hn: string): Promise<Locator> {
  await page.locator('label').filter({ hasText: 'ผู้ป่วยมี HN' }).click();
  await page.getByRole('combobox', { name: 'ค้นหาผู้ป่วยด้วย HN หรือชื่อ' }).fill(hn);
  await antOption(page, `${hn} - `, '^=').click(); // title = "<HN> - <คำนำหน้า ชื่อ นามสกุล>"

  const dialog = openVisitDialog(page);
  await expect(dialog.getByText(`HN ${hn}`, { exact: true })).toBeVisible();
  return dialog;
}

/** ใน modal "เปิด Visit ER": เลือกสิทธิ H01 เงินสด → ยืนยันเปิด visit → คืน HN/VN/EN จาก API */
export async function confirmOpenErVisit(page: Page, dialog: Locator): Promise<ErVisit> {
  // ต้องมีสิทธิอย่างน้อย 1 รายการ ไม่งั้น API ตอบ 422 CoverageInput และหน้าจอไม่บอกสาเหตุ
  const coverage = dialog.locator('.ant-select').filter({ hasText: 'สิทธิการรักษา' }).getByRole('combobox');
  await coverage.fill('H01');
  await antOption(page, 'H01 - เงินสด').click();
  await expect(dialog.getByRole('cell', { name: 'H01 - เงินสด', exact: true })).toBeVisible();
  // dropdown สิทธิยังค้างอยู่ → คลิกหัว modal ให้ปิด (กด Esc จะปิดทั้ง modal)
  await dialog.getByText('เปิด Visit ER', { exact: true }).click();

  const created = waitForApi(page, 'POST', '/cortex-api/er/visits');
  await dialog.getByTestId('create-visit-submit').click();
  const res = await created;
  await expectOk(res, 'เปิด Visit ER');
  const body = (await res.json()) as { registration?: ErVisit };
  await test.info().attach('POST /cortex-api/er/visits', { body: JSON.stringify(body, null, 2), contentType: 'application/json' });
  if (!body.registration) throw new Error(`ไม่เจอ registration ใน response เปิด Visit: ${JSON.stringify(body).slice(0, 300)}`);
  const { hn, vn, en } = body.registration;

  await expect(page.getByText('สร้าง Visit สำเร็จ')).toBeVisible();
  return { hn, vn, en };
}

/** ปิดข้อความแจ้งเตือนมุมขวาบน (เช่น "สร้าง Visit สำเร็จ") ไม่ให้บังแถบหัวในภาพหลักฐานของ step ถัดไป */
export async function dismissToast(page: Page, text: string) {
  const toast = page.getByText(text, { exact: true });
  if (!(await toast.isVisible())) return;
  // ปุ่ม X ของ notification — กดไม่ได้ก็รอให้หายเอง (~4.5 วินาที)
  const notice = page.locator('.ant-notification-notice, .ant-message-notice').filter({ has: toast });
  await notice.locator('.ant-notification-notice-close').click({ timeout: 2_000 }).catch(() => undefined);
  await expect(toast).toBeHidden();
  // เมาส์ค้างมุมขวาบนหลังกด X จะชี้โดนไอคอนสถานะบัญชีแล้วขึ้น tooltip ทับภาพ → ย้ายไปที่ว่างฝั่งซ้ายล่าง
  await page.mouse.move(400, 900);
}

/** จด Visit ER ที่เปิดสำเร็จทันทีที่ API ตอบ — ยกเลิกทีหลังได้แม้เทสพังก่อนได้เลขกลับมา */
export function trackOpenedErVisits(page: Page): Map<string, ErVisit> {
  const opened = new Map<string, ErVisit>();
  page.on('response', async (res) => {
    if (res.request().method() !== 'POST' || new URL(res.url()).pathname !== '/cortex-api/er/visits' || !res.ok()) return;
    const { registration } = (await res.json().catch(() => ({}))) as { registration?: ErVisit };
    if (registration?.en) opened.set(registration.en, { hn: registration.hn, vn: registration.vn, en: registration.en });
  });
  return opened;
}

/** อยู่หน้าผู้ป่วยของ Visit นี้: URL ตรง และแถบหัวแสดง HN / VN / EN ของ Visit นี้ */
export async function expectVisitHeader(page: Page, visit: ErVisit) {
  await page.waitForURL((url) => url.pathname === `/cortex/next/patients/${visit.hn}` && url.searchParams.get('en') === visit.en);
  const main = page.getByRole('main');
  await expect(main.getByText(`HN ${visit.hn}`, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(main.getByText(`VN ${visit.vn}`, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(main.getByText(visit.en, { exact: true }).filter({ visible: true }).first()).toBeVisible();
}

/** อยู่หน้าผู้ป่วยของ Visit นี้ที่ขั้น Triage: แถบหัวถูกคน และฟอร์ม "คัดกรอง ER" โหลดเสร็จ */
export async function expectTriageFormOpen(page: Page, visit: ErVisit) {
  await expectVisitHeader(page, visit);
  const main = page.getByRole('main');
  await expect(main.getByRole('tab', { name: 'Triage', exact: true, selected: true })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'คัดกรอง ER' })).toBeVisible();
  // หัวข้อขึ้นก่อนตัวฟอร์ม (ระหว่างนั้นขึ้น "Loading sbh-general-er-triage-v1...") → รอช่อง Vital Signs ด้วย
  await expect(main.getByRole('spinbutton', { name: 'Systolic' })).toBeVisible();
}

/** การ์ดผู้ป่วยบน ER Dashboard (อ้างด้วย HN) — เลื่อนให้อยู่ในจอ ภาพหลักฐานจะได้เห็นการ์ดนี้ */
export async function showDashboardCard(page: Page, hn: string): Promise<Locator> {
  const card = page.getByText(`HN: ${hn}`, { exact: true });
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeInViewport();
  return card;
}

/**
 * การ์ดผู้ป่วยทั้งใบในคอลัมน์ "คัดกรอง" (ยังไม่ Triage) = div ชั้นในสุดที่มีทั้ง HN (บนสุดของการ์ด) และเวลารอคัดกรอง (ล่างสุด)
 * ใช้ตีกรอบในภาพหลักฐาน
 */
export function dashboardCard(page: Page, hn: string): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByText(`HN: ${hn}`, { exact: true }) })
    .filter({ hasText: 'รอคัดกรอง' })
    .last();
}

/** กลับหน้าแดชบอร์ด / คิว ผ่านแถบนำทาง (ไม่โหลดแอปใหม่) → คืนรายการผู้ป่วยที่บอร์ดโหลดมา */
export async function openErDashboardFromMenu(page: Page): Promise<ErDashboardEncounter[]> {
  const loaded = waitForApi(page, 'GET', '/cortex-api/er/dashboard/encounters');
  await page.getByRole('button', { name: 'ขยายแถบนำทาง' }).click();
  await page.getByRole('menuitem', { name: 'ห้องฉุกเฉิน' }).click();
  await page.getByRole('menuitem', { name: 'แดชบอร์ด / คิว' }).click();
  await expect(page).toHaveURL(/\/cortex\/er\/dashboard/);
  return readDashboardEncounters(await loaded);
}

/**
 * บน ER Dashboard: ปุ่ม "ยกเลิก Encounter" บนการ์ด (มีเฉพาะการ์ดในคอลัมน์คัดกรอง) → ใส่เหตุผล → ยืนยัน
 * เช็คเลข EN ใน modal ก่อนกดยืนยัน — ยกเลิกได้เฉพาะ Encounter ที่ส่งเข้ามา
 */
export async function cancelErEncounter(page: Page, visit: ErVisit, reason: string) {
  expect(reason.length, 'เหตุผลที่ยกเลิกยาวได้ไม่เกิน 30 ตัวอักษร').toBeLessThanOrEqual(30);
  const hnText = await showDashboardCard(page, visit.hn);
  const card = page.locator('div').filter({ has: hnText }).filter({ has: page.getByRole('button', { name: 'ยกเลิก Encounter' }) }).last();
  await card.getByRole('button', { name: 'ยกเลิก Encounter' }).click();

  const dialog = page.getByRole('dialog', { name: 'ยกเลิก Encounter ER' });
  await expect(dialog.getByText(`ยืนยันยกเลิก Encounter ${visit.en} หรือไม่`)).toBeVisible();
  await dialog.getByRole('textbox', { name: '* เหตุผลที่ยกเลิก' }).fill(reason);
  const cancelled = waitForApi(page, 'POST', `/cortex-api/er/encounters/${visit.en}/cancel`);
  await dialog.getByRole('button', { name: 'ยกเลิก Encounter' }).click();
  const res = await cancelled;
  await expectOk(res, `ยกเลิก Encounter ${visit.en}`);
  expect(((await res.json()) as { latestStatusCode?: string }).latestStatusCode).toBe('cancelled');
  await expect(page.getByText('ยกเลิก Encounter สำเร็จ')).toBeVisible();
  await expect(hnText, 'ยกเลิกแล้วการ์ดต้องหายจากบอร์ด').toBeHidden();
}
