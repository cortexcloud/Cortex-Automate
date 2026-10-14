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
  const response = page.waitForResponse((res) => res.request().method() === method && matches(new URL(res.url()).pathname), { timeout });
  // ขั้นก่อนถึงบรรทัดที่ await พัง (เช่น กดปุ่มไม่ได้) promise นี้จะ reject ทีหลังโดยไม่มีใครรับ แล้วทำให้ทั้งเทสจบกลางคัน → รับไว้ก่อน (คนที่ await ยังได้ error ตามปกติ)
  response.catch(() => undefined);
  return response;
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
export async function registerNewPatient(page: Page, patient: NewPatient, beforeSubmit?: (submit: Locator) => Promise<void>): Promise<{ hn: string; dialog: Locator }> {
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

  const submit = page.getByRole('button', { name: 'ลงทะเบียนผู้ป่วย' });
  // ไว้เก็บภาพ "ก่อนกด" ตอนกรอกครบแล้ว (SBH-1699)
  if (beforeSubmit) await beforeSubmit(submit);
  const registered = waitForApi(page, 'POST', '/cortex-api/patients/er-registration');
  await submit.click();
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

/** ใน modal "เปิด Visit ER": เลือกสิทธิ (ค่าตั้งต้น H01 เงินสด — ใส่ชื่อเต็มตามตัวเลือก "<รหัส> - <ชื่อ>") → ยืนยันเปิด visit → คืน HN/VN/EN จาก API */
export async function confirmOpenErVisit(page: Page, dialog: Locator, coverageTitle = 'H01 - เงินสด'): Promise<ErVisit> {
  // ต้องมีสิทธิอย่างน้อย 1 รายการ ไม่งั้น API ตอบ 422 CoverageInput และหน้าจอไม่บอกสาเหตุ
  const coverage = dialog.locator('.ant-select').filter({ hasText: 'สิทธิการรักษา' }).getByRole('combobox');
  await coverage.fill(coverageTitle.split(' - ')[0]);
  await antOption(page, coverageTitle).click();
  await expect(dialog.getByRole('cell', { name: coverageTitle, exact: true })).toBeVisible();
  // dropdown สิทธิยังค้างอยู่ → คลิกหัว modal ให้ปิด (กด Esc จะปิดทั้ง modal)
  await dialog.getByText('เปิด Visit ER', { exact: true }).click();

  // SBH Prod ตอบช้าเป็นพักๆ (3 ต.ค. 2026 เกิน 20 วินาที) → รอนานกว่าค่าตั้งต้น
  const created = waitForApi(page, 'POST', '/cortex-api/er/visits', 60_000);
  created.catch(() => undefined); // ปุ่มกดไม่ได้จนหมดเวลา จะได้ไม่มี unhandled rejection ซ้อน
  await dialog.getByTestId('create-visit-submit').click();
  const res = await created;
  await expectOk(res, 'เปิด Visit ER');
  const body = (await res.json()) as { registration?: ErVisit };
  await test.info().attach('POST /cortex-api/er/visits', { body: JSON.stringify(body, null, 2), contentType: 'application/json' });
  if (!body.registration) throw new Error(`ไม่เจอ registration ใน response เปิด Visit: ${JSON.stringify(body).slice(0, 300)}`);
  const { hn, vn, en } = body.registration;

  // SBH Prod บางครั้งขึ้นแจ้งเตือนซ้อน 2 อัน: "สร้าง Visit สำเร็จ" + "สร้าง Visit สำเร็จ แต่ไม่สามารถกำหนดระดับ ESI เริ่มต้นได้"
  await expect(page.getByText('สร้าง Visit สำเร็จ').first()).toBeVisible();
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

/**
 * เมนูในแถบขวา "การดำเนินการดูแลผู้ป่วย" ของหน้าผู้ป่วย (เช่น Disposition, สร้าง Admit Order) → รอ `ready` ของแผงนั้น
 * หน้าผู้ป่วยที่เพิ่งโหลดจะเปิดแผงตั้งต้น (ER Physician Note) ตามหลัง แล้วทับแผงที่เพิ่งกด → กดซ้ำจนแผงที่ต้องการขึ้น
 * แถบเมนูกางค้างบังปุ่มมุมขวาบนของแผง → คลิกเนื้อหาให้หุบ แล้วย้ายเมาส์ออก
 */
export async function openCarePanel(page: Page, name: string, ready: Locator) {
  const item = page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: new RegExp(`${name}$`) }).first();
  await expect(async () => {
    await item.click({ force: true });
    await expect(ready).toBeVisible({ timeout: 8_000 });
  }).toPass({ timeout: 60_000 });
  await ready.click({ timeout: 3_000 }).catch(() => undefined);
  await page.mouse.move(600, 600);
}

/**
 * เปิดแถบนำทาง → เมนูห้องฉุกเฉิน → กดเมนูย่อยตามลำดับ (เช่น 'รายงานทางสถิติ', 'รายงานรายเดือน')
 * อยู่หน้าในโมดูล ER แล้วเมนู "ห้องฉุกเฉิน" กางไว้ให้ — กดซ้ำจะหุบ จึงกดเฉพาะตอนเมนูย่อยตัวแรกยังไม่ขึ้น
 * เมนูกลุ่ม (เช่น "รายงานทางสถิติ" ตอนอยู่หน้ารายงาน) ที่กางอยู่แล้วก็ไม่กดซ้ำ · แถบนำทางกางค้างอยู่แล้ว (เช่นหลังกดเมนู "ตั้งค่า") ไม่ต้องกดขยาย
 * คืน locator ของเมนูย่อยตัวสุดท้าย (ไว้ตีกรอบในภาพหลักฐาน — แถบนำทางปิดเองหลังเปลี่ยนหน้า)
 */
export async function openErMenu(page: Page, ...items: string[]): Promise<Locator> {
  const expand = page.getByRole('button', { name: 'ขยายแถบนำทาง' });
  if (await expand.isVisible()) await expand.click();
  // ชื่อจริง "alert ห้องฉุกเฉิน" (ไอคอนนำหน้า) — regex กันชนกับเมนูย่อย "คุณภาพห้องฉุกเฉิน"
  const er = page.getByRole('menuitem', { name: /^(\S+ )?ห้องฉุกเฉิน$/ });
  await expect(er).toBeVisible();
  // ชื่อเมนูบางตัวมีชื่อไอคอนนำหน้า (เช่น "bar-chart รายงานทางสถิติ") → ไม่ใช้ exact
  const menu = (name: string) => page.getByRole('menuitem', { name });
  if (!(await menu(items[0]).isVisible())) await er.click();
  for (const [i, name] of items.entries()) {
    const next = items[i + 1];
    if (next && (await menu(next).isVisible())) continue; // กลุ่มนี้กางอยู่แล้ว
    await menu(name).click();
  }
  return menu(items[items.length - 1]);
}

/** กลับหน้าแดชบอร์ด / คิว ผ่านแถบนำทาง (ไม่โหลดแอปใหม่) → คืนรายการผู้ป่วยที่บอร์ดโหลดมา */
export async function openErDashboardFromMenu(page: Page): Promise<ErDashboardEncounter[]> {
  const loaded = waitForApi(page, 'GET', '/cortex-api/er/dashboard/encounters');
  await openErMenu(page, 'แดชบอร์ด / คิว');
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
