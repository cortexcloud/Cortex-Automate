import { expect, test, type Browser, type Locator, type Page, type Response } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { expectOk, openTriagePage, openVisitDialog, registerNewPatient, waitForApi, type ErVisit } from '../helpers/functions/er';
import { ESI_BUTTON, chooseGcs, fillVitalSigns, saveButton, selectArrivalDetail, triageForm, type VitalSigns } from '../helpers/functions/er-triage';
import type { NewPatient } from '../helpers/functions/test-data';
import { authFile } from '../utils/env';
import { cacheAppAssets } from './fixtures';
import { SYSTEM, confirmOrderAlert, orderAlert } from './uat-er';

// ส่วนใช้ร่วมของสคริปต์เล่น Scenario UAT ER (ชีต "Scenario- ER") — ขั้นที่พังจดไว้แล้วเล่นขั้นถัดไปต่อ ไม่เก็บภาพหลักฐาน
// ผลของแต่ละข้อ: .cache/uat-play-<ระบบ>/<ข้อ>.json · ผู้ป่วยที่ใช้ร่วมข้ามข้อ: .cache/uat-play-<ระบบ>/patients.json

const DIR = path.join(__dirname, '..', '.cache', `uat-play-${SYSTEM}`);
const PATIENTS = path.join(DIR, 'patients.json');
const CREATED = path.join(__dirname, 'created-patients.md');

export interface Played extends ErVisit {
  name: string;
  citizenId?: string;
}

/** ผู้ป่วย Mock รายล่าสุดของระบบนี้จาก created-patients.md (ราย A / B / C / D) */
export function mockPatient(label: 'A' | 'B' | 'C' | 'D'): Played {
  const rows = fs
    .readFileSync(CREATED, 'utf8')
    .split('\n')
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter((cells) => cells[2] === SYSTEM && cells[3] === label);
  const row = rows.at(-1);
  if (!row) throw new Error(`ไม่มีผู้ป่วย Mock ราย ${label} ของระบบ ${SYSTEM} ใน created-patients.md — รันสคริปต์ Mock Data ก่อน`);
  return { name: row[4], hn: row[5], vn: row[6], en: row[7], citizenId: row[8] };
}

export function loadPatients(): Record<string, Played> {
  return fs.existsSync(PATIENTS) ? (JSON.parse(fs.readFileSync(PATIENTS, 'utf8')) as Record<string, Played>) : {};
}

/** จดผู้ป่วยที่ข้ออื่นจะใช้ต่อ (เช่น ผู้ป่วยของกรณี 5.2 ใช้เล่น UAT-ER-06) */
export function savePatient(key: string, patient: Played) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(PATIENTS, JSON.stringify({ ...loadPatients(), [key]: patient }, null, 2));
}

interface StepResult {
  title: string;
  ok: boolean;
  detail?: string;
}

/** API ที่ตอบไม่สำเร็จแต่เป็นเรื่องปกติของหน้าจอ (ไม่นับเป็นปัญหาของขั้น) */
const NOISE = /get_present_illness_history|\/drafts\/|localhost:8081|print-slips/;

/**
 * ตัวเล่น 1 ข้อ: `step()` = ขั้นในชีต (พังแล้วจดไว้ เล่นต่อ) · `note()` = ข้อสังเกต · `finish()` = เขียนผลลงไฟล์ + พิมพ์สรุป
 * API ที่ตอบ ≥ 400 ระหว่างขั้นถูกจดพ่วงไว้กับขั้นนั้น (หน้าจอ Cortex มักเงียบเมื่อ API พัง)
 */
export class Play {
  readonly results: StepResult[] = [];
  readonly notes: string[] = [];
  readonly patients: string[] = [];
  private failedApis: string[] = [];
  private count = 0;

  constructor(
    private readonly page: Page,
    readonly scenario: string,
  ) {
    page.on('response', async (res) => {
      if (res.status() < 400) return;
      const url = new URL(res.url());
      if (!/cortex-api|emr-api|demographic|ehrbase|clinical-form/.test(url.pathname) || NOISE.test(res.url())) return;
      const gql = (res.request().postData() ?? '').match(/(mutation|query)\s+(\w+)/)?.[2] ?? '';
      const body = (await res.text().catch(() => '')).slice(0, 260);
      this.failedApis.push(`${res.request().method()} ${url.pathname} ${gql} → ${res.status()} ${body}`);
    });
  }

  async step<T>(title: string, body: () => Promise<T>): Promise<T | undefined> {
    this.failedApis = [];
    const no = ++this.count;
    try {
      const value = await test.step(title, body);
      const api = this.failedApis.length ? ` (API: ${[...new Set(this.failedApis)].join(' ‖ ')})` : '';
      this.results.push({ title, ok: true, detail: api || undefined });
      console.log(`  ✓ ${this.scenario} ${no}. ${title}${api}`);
      return value;
    } catch (error) {
      const message = (error as Error).message
        .replace(/\u001b\[[0-9;]*m/g, '')
        .split('\n')
        .filter((line) => line.trim() && !/^\s*(Call log|- )/.test(line))
        .slice(0, 4)
        .join(' ')
        .slice(0, 420);
      const dialog = (await this.page.locator('.ant-modal-content:visible, .ant-notification-notice:visible, .ant-message-notice:visible').allInnerTexts().catch(() => []))
        .join(' ⏎ ')
        .replace(/\s+/g, ' ')
        .slice(0, 400);
      const detail = [message, this.failedApis.length && `API: ${[...new Set(this.failedApis)].join(' ‖ ')}`, dialog && `บนจอ: ${dialog}`].filter(Boolean).join(' | ');
      this.results.push({ title, ok: false, detail });
      console.log(`  ✗ ${this.scenario} ${no}. ${title} — ${detail}`);
      if (process.env.PLAY_OUT) {
        const snapshot = await this.page.locator('body').ariaSnapshot({ timeout: 10_000 }).catch(() => '');
        fs.writeFileSync(path.join(process.env.PLAY_OUT, `${this.scenario}-${String(no).padStart(2, '0')}.yml`), snapshot);
      }
      // ปิด dialog / dropdown ที่ค้าง ไม่ให้บังขั้นถัดไป
      for (let i = 0; i < 2; i++) await this.page.keyboard.press('Escape').catch(() => undefined);
      await this.page.locator('.ant-modal-wrap:visible .ant-modal-close').first().click({ timeout: 1_500 }).catch(() => undefined);
      await this.page.mouse.move(600, 600).catch(() => undefined);
      return undefined;
    }
  }

  /** เก็บ aria snapshot ของหน้าปัจจุบันลง PLAY_OUT (ไว้ดูหน้าจอที่ยังไม่รู้จักตอนพัฒนาสคริปต์) */
  async dump(name: string, page: Page = this.page) {
    if (!process.env.PLAY_OUT) return;
    const snapshot = await page.locator('body').ariaSnapshot({ timeout: 10_000 }).catch(() => '');
    fs.writeFileSync(path.join(process.env.PLAY_OUT, `${this.scenario}-${name}.yml`), snapshot);
  }

  note(text: string) {
    this.notes.push(text);
    console.log(`  • ${this.scenario} ข้อสังเกต: ${text}`);
  }

  /** ผู้ป่วยที่ข้อนี้ใช้ — `source` = 'Mock ราย A' / 'เปิดใหม่' */
  patient(source: string, p: Played) {
    this.patients.push(`${source}: ${p.name} HN ${p.hn}${p.en ? ` ${p.en}` : ''}`);
  }

  finish() {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(path.join(DIR, `${this.scenario}.json`), JSON.stringify({ scenario: this.scenario, patients: this.patients, results: this.results, notes: this.notes }, null, 2));
    const failed = this.results.filter((r) => !r.ok);
    console.log(`  == ${this.scenario}: ผ่าน ${this.results.length - failed.length}/${this.results.length} ขั้น${failed.length ? ` · ไม่ผ่าน: ${failed.map((f) => f.title).join(' · ')}` : ''}`);
    test.info().annotations.push({ type: this.scenario, description: `ผ่าน ${this.results.length - failed.length}/${this.results.length}` });
  }
}

/** promise ที่เริ่มรอไว้ก่อนกดปุ่ม — ถ้าขั้นพังก่อนถึงบรรทัดที่ await จะได้ไม่มี unhandled rejection ทำเทสล้ม */
export function guard<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => undefined);
  return promise;
}

/** response นี้เป็นคำสั่งที่เปลี่ยนข้อมูลไหม (ไม่ใช่ GET / graphql query / draft / preview) */
function isMutation(res: Response): boolean {
  const req = res.request();
  if (req.method() === 'GET' || /\/drafts|\/query\/|preview$|transform-composition/.test(res.url())) return false;
  return !/"query":"(\\n|\s)*query\s/.test(req.postData() ?? '');
}

/** response ของคำสั่งที่เปลี่ยนข้อมูลตัวถัดไปที่ url หรือ body ตรง `pattern` */
export function nextMutation(page: Page, pattern: RegExp, timeout = 20_000) {
  return guard(page.waitForResponse((res) => isMutation(res) && pattern.test(`${res.url()} ${(res.request().postData() ?? '').slice(0, 300)}`), { timeout }));
}

/** ทำ `body` แล้วคืนรายการคำสั่งที่เปลี่ยนข้อมูลทั้งหมดที่หน้าจอยิงระหว่างนั้น (ไว้ดูว่าปุ่มที่ยังไม่รู้จักยิงอะไร) */
export async function watchMutations(page: Page, body: () => Promise<unknown>): Promise<string[]> {
  const calls: Promise<string>[] = [];
  const listener = (res: Response) => {
    if (!isMutation(res) || !/cortex-api|emr-api|ehrbase|clinical-form/.test(res.url())) return;
    const post = res.request().postData() ?? '';
    const name = post.match(/mutation\s+(\w+)/)?.[1] ?? post.slice(0, 120);
    calls.push(
      res.text().then(
        (text) => `${res.request().method()} ${new URL(res.url()).pathname} ${name} → ${res.status()} ${text.slice(0, 260)}`,
        () => `${res.url()} → ${res.status()}`,
      ),
    );
  };
  page.on('response', listener);
  try {
    await body();
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  } finally {
    page.off('response', listener);
  }
  return Promise.all(calls);
}

/** ลงทะเบียนผู้ป่วยใหม่ที่หน้าคัดกรอง ER (เริ่มจาก ER Dashboard) แล้วปิด modal เปิด Visit — ได้ HN ที่ไม่มี Visit (R24) */
export async function registerWithoutVisit(page: Page, patient: NewPatient): Promise<string> {
  await openTriagePage(page);
  const { hn, dialog } = await registerNewPatient(page, patient);
  await dialog.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(openVisitDialog(page)).toBeHidden();
  return hn;
}

/** เปิดหน้าผู้ป่วยของ Visit ER (โหลดแอปใหม่) */
export async function gotoVisit(page: Page, visit: ErVisit) {
  // SBH Prod: หน้าผู้ป่วยบางครั้งโหลดไม่ขึ้น (API ตอบ 500 / 502 เป็นพักๆ) → เปิดใหม่อีกรอบ
  await expect(async () => {
    await page.goto(`/cortex/next/patients/${visit.hn}?en=${visit.en}&vn=${visit.vn}&fromApp=er`);
    await expect(page.getByRole('main').getByText(`HN ${visit.hn}`, { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  }, `เปิดหน้า Visit ${visit.en} ของ HN ${visit.hn}`).toPass({ timeout: 150_000 });
}

/** เมนูในแถบขวา "การดำเนินการดูแลผู้ป่วย" → รอ `ready` แล้วคลิกมันให้แถบเมนูหุบ */
export async function careMenu(page: Page, name: string, ready: Locator) {
  const item = page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: new RegExp(`${name}$`) }).first();
  // หน้าผู้ป่วยที่เพิ่งโหลดจะเปิดแผงตั้งต้น (เช่น ER Physician Note) ตามหลัง แล้วทับแผงที่เพิ่งกด → กดซ้ำจนแผงที่ต้องการขึ้น
  await expect(async () => {
    await item.click({ force: true });
    await expect(ready).toBeVisible({ timeout: 8_000 });
  }).toPass({ timeout: 60_000 });
  // คลิกเนื้อหาให้แถบเมนูหุบ — บางแผงข้อความนี้กดไม่ได้ (ถูกบัง) ก็ข้าม แล้วย้ายเมาส์ออกอย่างเดียว
  await ready.click({ timeout: 3_000 }).catch(() => undefined);
  await page.mouse.move(600, 600);
}

/** เมนูในแถบซ้าย "ข้อมูลและเวชระเบียนผู้ป่วย" */
export async function recordMenu(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'ข้อมูลและเวชระเบียนผู้ป่วย' }).getByRole('menuitem', { name, exact: true }).first().click({ force: true });
  await page.mouse.move(700, 700);
}

/** กดตัวเลือกใน dropdown — dropdown ที่อยู่ชิดขอบล่างของจอขยับตามการเลื่อนหน้า ตัวเลือกไม่นิ่งให้กด จึงกดแบบไม่รอให้นิ่งเป็นทางสำรอง */
export async function pick(option: Locator) {
  await expect(option).toBeVisible();
  await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
}

/** ตัวเลือกของ dropdown (Ant Design) ที่เปิดอยู่ */
export function options(page: Page): Locator {
  return page.locator('.ant-select-dropdown:visible .ant-select-item-option');
}

export interface TriageInput {
  /** ไม่ใส่ = ยังไม่เลือกระดับ (ผู้เรียกเลือกเอง) */
  level?: 1 | 2 | 3 | 4 | 5;
  vitals?: VitalSigns;
  /** ชื่อชิป Chief Complaint (ตั้งต้น "ปวดท้อง") — ใส่ '' = ไม่กด (เช่น เหตุการณ์หมู่ที่มีอาการสำคัญร่วมมาให้) */
  chiefComplaint?: string;
  /** ชื่อปุ่มตัวเลือก GCS เรียง E, V, M (ตั้งต้น E4V5M6) */
  gcs?: [string, string, string];
  /** ประเภท Fast Track (เช่น "Sepsis") — ใส่แล้วกดเปลี่ยนเป็น Suspect Fast Track */
  fastTrack?: string;
  trauma?: boolean;
}

/** วิธีจำหน่าย "ปฏิเสธการรักษา" ตามตัวเลือกในฟอร์มของแต่ละระบบ (R19) */
export const DISCHARGE_AGAINST_ADVICE = SYSTEM === 'dev-x' ? 'ปฎิเสธการรักษา' : 'Against Advice';

export const GCS_15: [string, string, string] = ['4 — ลืมตาได้เอง (Spontaneous)', '5 — พูดคุยรู้เรื่อง ตอบคำถามถูกต้อง (Oriented)', '6 — ทำตามคำสั่งได้ (Obeys commands)'];
export const GCS_3: [string, string, string] = ['1 — ไม่ลืมตาเลย (None)', '1 — ไม่ส่งเสียงเลย (None)', '1 — ไม่ตอบสนองเลย (None)'];
export const VITALS_NORMAL: VitalSigns = { systolic: '120', diastolic: '80', pr: '80', rr: '18', temp: '37', spo2: '98', painScore: '3' };
/** สัญญาณชีพที่ทำให้ MEWS สูง (กรณี 5.2) */
export const VITALS_HIGH_MEWS: VitalSigns = { systolic: '85', diastolic: '50', pr: '135', rr: '32', temp: '39.5', spo2: '88', painScore: '8' };

/** กรอกฟอร์มคัดกรอง (ยังไม่บันทึก): ช่องบังคับฝั่งซ้าย · สัญญาณชีพ · GCS · CC · Fast Track / Trauma · ระดับความเร่งด่วน */
export async function fillTriage(page: Page, visit: ErVisit, input: TriageInput) {
  const form = triageForm(page);
  // ช่องที่กรอกไว้แล้ว (คัดกรองซ้ำ / เล่นซ้ำกับผู้ป่วยที่มี draft) ข้ามได้ — เลือกซ้ำแล้ว locator ชนกับค่าที่แสดงอยู่
  const arrival = page.getByRole('region', { name: 'วิธีการมาถึง' });
  // ส่วน "วิธีการมาถึง" มีเฉพาะหน้าขั้น Triage (คัดกรองซ้ำจากหน้า Overview ไม่มี)
  if (await arrival.isVisible()) {
    if (!(await arrival.locator('.ant-select-content-value[title="ไม่มี"]').count())) await selectArrivalDetail(page, 'อุปกรณ์ช่วยเหลือ', 'ไม่มี', visit);
    if (!(await arrival.locator('.ant-select-content-value[title="ญาติ"]').count())) await selectArrivalDetail(page, 'ผู้ที่มาด้วย', 'ญาติ', visit);
  }
  if (input.vitals) await fillVitalSigns(page, input.vitals);
  for (const option of input.gcs ?? GCS_15) {
    // ช่องที่มีค่านี้อยู่แล้ว (draft ค้างจากรอบก่อน) ข้าม — ช่องว่างช่องแรกจะเป็นของหัวข้อถัดไป
    if (await form.getByRole('button', { name: option, exact: true }).count()) continue;
    if (await form.getByRole('button', { name: 'เลือกคะแนน' }).count()) await chooseGcs(page, option);
  }
  const cc = input.chiefComplaint ?? 'ปวดท้อง';
  if (cc) await form.getByRole('button', { name: cc, exact: true }).click();
  if (input.fastTrack) {
    const notSuspect = form.getByRole('button', { name: 'Not Suspect Fast Track' });
    if (await notSuspect.count()) await notSuspect.click();
    // Fast Track Type เป็น combobox ของฟอร์ม (ไม่ใช่ <select>) — เปิดแล้วเลือกตัวเลือกตามชื่อ
    await form.getByRole('combobox').filter({ hasText: /fast-track type/i }).click();
    await form.getByRole('menuitem', { name: new RegExp(input.fastTrack, 'i') }).first().click();
  }
  if (input.trauma) await form.getByRole('radio', { name: 'Trauma', exact: true }).check();
  if (input.level) await form.getByRole('button', { name: ESI_BUTTON[input.level] }).click();
}

/** ในแท็บจำหน่าย: เริ่มจำหน่าย → สถานะ Improved + วิธีจำหน่าย (ชื่อ radio ตามฟอร์มจริง R19) → ช่องบังคับ → บันทึกฉบับร่าง → คืน statusCode */
export async function draftDischarge(page: Page, method: string, detail?: string): Promise<string> {
  const main = page.getByRole('main');
  // เล่นซ้ำกับผู้ป่วยที่กด "เริ่มจำหน่าย" ไปแล้ว (ฟอร์มเปิดให้กรอกอยู่) ไม่ต้องกดเริ่มอีก
  if (!(await main.getByRole('radio', { name: 'Improved', exact: true }).isEnabled())) {
    const started = nextMutation(page, /mutation StartErDischarge/);
    await page.getByTestId('er-disposition-start').click();
    await expectOk(await started, 'เริ่มจำหน่าย');
  }
  await main.getByRole('radio', { name: 'Improved', exact: true }).check();
  await main.getByRole('radio', { name: method, exact: true }).check();
  // ช่อง "รายละเอียดเพิ่มเติม" มีเฉพาะบางวิธีจำหน่าย / บางระบบ
  const detailBox = main.getByRole('textbox', { name: 'ระบุรายละเอียดเพิ่มเติม' });
  if (detail && (await detailBox.isVisible())) await detailBox.fill(detail);
  await main.getByRole('textbox', { name: 'ระบุข้อมูลทางคลินิกและการดำเนินโรค' }).fill('เล่น Scenario UAT ER');
  await main.getByRole('textbox', { name: 'ระบุผลการตรวจเพิ่มเติม' }).fill('เล่น Scenario UAT ER');
  // SBH Prod (เจอ 5 ต.ค. 2026): ฟอร์มมีหัวข้อ "การวินิจฉัย" (ค้นหา ICD10) — เว้นว่างแล้วปุ่มลงนามกดไม่ได้
  // → กด "ใช้รหัสโรคที่แนะนำ" (รหัสที่แพทย์วินิจฉัยไว้ใน ER Physician Note) เมื่อช่อง ICD10 ยังว่าง
  const suggested = main.getByRole('button', { name: 'ใช้รหัสโรคที่แนะนำ' });
  if ((await suggested.isVisible()) && (await main.getByText('ค้นหา ICD10', { exact: true }).first().isVisible())) {
    await suggested.click();
    console.log('    Disposition: กด "ใช้รหัสโรคที่แนะนำ" ในหัวข้อการวินิจฉัย');
  }
  const saved = nextMutation(page, /mutation SaveErDischargeDraft/);
  await main.getByRole('button', { name: 'บันทึกฉบับร่าง' }).click();
  const res = await saved;
  await expectOk(res, 'บันทึกฉบับร่างการจำหน่าย');
  const body = (await res.json()) as { data?: { saveErDischargeDraft?: { statusCode?: string } }; errors?: { message: string }[] };
  if (!body.data?.saveErDischargeDraft) throw new Error(`บันทึกฉบับร่างไม่สำเร็จ: ${JSON.stringify(body).slice(0, 300)}`);
  return body.data.saveErDischargeDraft.statusCode ?? '';
}

/** กดบันทึกฟอร์มคัดกรอง → รอผล PATCH triage-result · ESI 5 จะมี dialog "ส่งต่อไปคลินิก" ตามมา (ผู้เรียกจัดการเอง) */
export async function saveTriageForm(page: Page, visit: ErVisit) {
  const saved = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`);
  await saveButton(page).click();
  await expectOk(await saved, `บันทึกผล Triage ของ ${visit.en}`);
}

/** ข้อมูล Encounter ของวันนี้จาก API บอร์ด (รวมที่ยกเลิก) */
export async function boardEncounter(page: Page, authorization: string, en: string): Promise<Record<string, unknown> | undefined> {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date());
  const res = await page.request.get(`/cortex-api/er/dashboard/encounters?date=${today}`, { headers: { authorization } });
  await expectOk(res, 'อ่านข้อมูลบอร์ด ER');
  return ((await res.json()) as Record<string, unknown>[]).find((e) => e.en === en);
}

/** ปุ่มลงนามของ Disposition (R20) → ถ้าเด้ง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" กด "ลงนามต่อ" → ใบสรุปต้องเป็น COMPLETE */
export async function signDischarge(page: Page): Promise<{ askedAddress: boolean }> {
  // แถบเมนูขวากางทับปุ่มลงนามตอนเมาส์อยู่ฝั่งขวา → คลิกเนื้อหาให้หุบ แล้วย้ายเมาส์ออกก่อน
  await page.getByRole('main').getByText('สรุปการจำหน่าย', { exact: true }).click();
  await page.mouse.move(600, 600);
  const finalized = nextMutation(page, /mutation FinalizeErDischarge/, 40_000);
  await page.getByTestId('er-disposition-finalize').click();
  const proceed = page.getByRole('button', { name: 'ลงนามต่อ' });
  await Promise.race([finalized, proceed.waitFor({ state: 'visible', timeout: 15_000 })]).catch(() => undefined);
  const askedAddress = await proceed.isVisible();
  if (askedAddress) await proceed.click();
  const res = await finalized;
  await expectOk(res, 'ลงนามการจำหน่าย');
  const body = (await res.json()) as { data?: { finalizeErDischarge?: { statusCode?: string } } };
  expect(body.data?.finalizeErDischarge?.statusCode, `ลงนามแล้วใบสรุปต้องเป็น COMPLETE: ${JSON.stringify(body).slice(0, 300)}`).toBe('COMPLETE');
  return { askedAddress };
}

/** เมนูขวา "สร้างฟอร์ม" → Doctor Progress Note → กรอก S O A P → บันทึก */
export async function saveProgressNote(page: Page, label: string) {
  const main = page.getByRole('main');
  const heading = main.getByRole('heading', { name: 'Doctor Progress Note' });
  // แผง "สร้างฟอร์ม": dev-x มีช่องกลุ่ม / ชุดแบบฟอร์มด้วย · SBH Prod มีแค่ช่อง "เลือกฟอร์ม"
  await careMenu(page, 'สร้างฟอร์ม', main.getByText('เลือกฟอร์ม', { exact: true }).first());
  await pick(main.locator('.ant-select').filter({ hasText: /^(เลือก|Doctor Progress Note)$/ }).last());
  await page.keyboard.type('Doctor Progress');
  await pick(options(page).filter({ hasText: /^Doctor Progress Note$/ }).first());
  await expect(heading).toBeVisible();
  const editors = main.locator('[contenteditable="true"]');
  await expect(editors.nth(3)).toBeVisible();
  const count = await editors.count();
  for (const [i, key] of ['S', 'O', 'A', 'P'].entries()) await editors.nth(count - 4 + i).fill(`${key}: ${label}`);
  // ช่อง Perform time: ยังหา input ของช่องนี้ไม่ได้ (ไม่ใช่ input ธรรมดาใน root เดียวกับช่อง S) — เว้นไว้ตามค่าตั้งต้นของฟอร์ม
  const save = main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).last();
  await expect(save, 'กรอก S O A P แล้วปุ่มบันทึกต้องกดได้').toBeEnabled();
  const saved = nextMutation(page, /contribution|composition/, 30_000);
  await save.click();
  await expectOk(await saved, 'บันทึก Doctor Progress Note');
}

/** select ของ Ant Design ในแถวฟอร์มที่มีป้าย `label` → เลือกตัวแรก (พิมพ์ `search` ก่อนถ้าใส่) → คืนข้อความที่เลือก */
export async function chooseFirst(page: Page, scope: Locator, label: string | RegExp, search?: string): Promise<string> {
  // select ตัวแรกที่อยู่ถัดจากป้าย (ฟอร์มบางตัวไม่ได้ใช้ .ant-form-item)
  await scope.getByText(label).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]').click();
  if (search) await page.keyboard.type(search);
  await expect(options(page).first()).toBeVisible();
  const text = (await options(page).first().innerText()).trim();
  await pick(options(page).first());
  return text;
}

/** One Day Order (เปิดอยู่แล้ว): เพิ่มยาตามรหัสลงตะกร้า — ขนาดยา 1 · Route ตัวแรก · วันละ 1 ครั้ง · จำนวนจ่าย 1 */
export async function addMedicineToCart(page: Page, code: string, beforeAdd?: () => Promise<void>) {
  const main = page.getByRole('main');
  // เล่นซ้ำ: ยาตัวนี้ค้างในตะกร้า (ยังไม่ส่ง) อยู่แล้ว ไม่เพิ่มซ้ำ — รอรายการในตะกร้าโหลดก่อนนับ
  await main.getByRole('row', { name: /^ยังไม่ส่ง/ }).first().waitFor({ state: 'visible', timeout: 6_000 }).catch(() => undefined);
  const waiting = main.getByRole('row', { name: /^ยังไม่ส่ง/ }).filter({ hasText: `[${code}]` });
  if (await waiting.count()) {
    console.log(`    ยา ${code} ค้างในตะกร้าอยู่แล้ว ไม่เพิ่มซ้ำ`);
    return;
  }
  await page.getByRole('combobox', { name: /ค้นหา ยา/ }).fill(code);
  await options(page).filter({ hasText: `[${code}]` }).filter({ hasNotText: 'แพ็กเกจ' }).first().click();
  const usage = main.getByRole('textbox', { name: /^\* วิธีใช้/ });
  await expect(usage).toBeVisible();
  if (!(await usage.inputValue())) {
    await main.getByRole('spinbutton', { name: 'ขนาดยา' }).fill('1');
    // Route: เลือกตัวแรกถ้าเลือกได้ (ยาบางตัวกำหนด Route มาแล้ว)
    // ช่อง Route ไม่มีชื่อ = combobox ตัวที่ 2 ถัดจากช่องขนาดยา (ตัวแรกคือหน่วย) — คลิกที่กรอบ select (คลิก input ตรงๆ โดนข้อความบัง)
    const routeInput = main.getByRole('spinbutton', { name: 'ขนาดยา' }).locator('xpath=following::input[@role="combobox"][2]');
    const route = routeInput.locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " ant-select")][1]');
    // คลิกกรอบ Route แล้ว dropdown ไม่เปิด (คลิกไม่ถึงตัว select) → โฟกัสช่องแล้วกดลูกศรลงเปิดรายการแทน
    await route.click({ timeout: 3_000 }).catch(() => undefined);
    if (!(await options(page).first().isVisible())) {
      await routeInput.focus();
      await page.keyboard.press('ArrowDown');
    }
    // เลือก Route แบบรับประทานถ้ามี (Route แบบฉีดมีช่องอัตรา / ระยะเวลาให้ยาเพิ่ม) ไม่มีก็ตัวแรก
    await expect(options(page).first()).toBeVisible();
    console.log(`    Route ที่เลือกได้: ${(await options(page).allInnerTexts()).map((text) => text.trim()).join(' | ')}`);
    const oral = options(page).filter({ hasText: /รับประทาน|Oral/i }).first();
    await pick((await oral.count()) ? oral : options(page).first());
    // ยาบางตัวกำหนดความถี่มาแล้ว (ช่อง disabled — dev-x บัญชี Doctor 19 ต.ค. 2026: GPO-L-ONE) → กรอกเฉพาะเมื่อแก้ได้
    const frequency = main.getByText('ความถี่', { exact: true }).locator('xpath=following::input[@role="spinbutton"][1]');
    if (await frequency.isEnabled()) await frequency.fill('1');
    await expect(usage, 'ช่อง "วิธีใช้" ต้องถูกสร้างจากขนาดยา / Route / ความถี่').not.toHaveValue('');
  }
  const quantity = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
  if (!(await quantity.inputValue())) await quantity.fill('1');
  // ยาที่ต้องระบุเหตุผลการใช้ (SBH Prod): มีช่อง "ระบุการวินิจฉัยโรค" (ไม่มีดอกจัน) → เลือกตัวแรกถ้ามีตัวเลือก
  const diagnosis = main.getByRole('combobox', { name: 'ระบุการวินิจฉัยโรค' });
  if (await diagnosis.isVisible()) {
    await diagnosis.click({ timeout: 3_000 }).catch(() => diagnosis.focus());
    if (!(await options(page).first().isVisible())) await page.keyboard.press('ArrowDown');
    if (await options(page).first().waitFor({ state: 'visible', timeout: 4_000 }).then(() => true, () => false)) {
      console.log(`    ระบุการวินิจฉัยโรค: ${(await options(page).allInnerTexts()).map((text) => text.trim()).slice(0, 6).join(' | ')}`);
      await pick(options(page).first());
    } else {
      console.log('    ระบุการวินิจฉัยโรค: ไม่มีตัวเลือก');
      await page.keyboard.press('Escape');
    }
  }
  // ปรับค่าในฟอร์มเพิ่มก่อนกดเพิ่ม (เช่น SBH-2126: ระยะเวลาการใช้ 4 สัปดาห์ + จำนวนที่จ่าย 28)
  if (beforeAdd) await beforeAdd();
  console.log(`    ยา ${code}: วิธีใช้ = "${await usage.inputValue()}"`);
  // SBH Prod: กดเพิ่มลงตะกร้าครั้งแรกบางครั้งเงียบ ไม่มีแถวขึ้น (3 ต.ค. 2026) → ยังไม่มีแถวค่อยกดซ้ำ
  const row = main.getByRole('row').filter({ hasText: `[${code}]` }).first();
  await expect(async () => {
    // Drug Alert (ยาซ้ำกับออเดอร์อื่นของ Visit — CURRENT_ORDER) ขึ้นช้ากว่าการกด → รอบก่อนเห็นไม่ทัน หน้าต่างค้างบังปุ่ม → ยืนยันก่อน
    if (await orderAlert(page).isVisible()) await confirmOrderAlert(page);
    if (!(await row.isVisible())) {
      const calls = await watchMutations(page, () => page.getByRole('button', { name: 'plus เพิ่มลงตะกร้า' }).click());
      console.log(`    เพิ่มยา ${code} ลงตะกร้า: ${calls.map((call) => call.slice(0, 200)).join(' ‖ ') || '(ไม่เห็นคำสั่งผ่าน API ที่ดักได้)'}`);
      await orderAlert(page).waitFor({ state: 'visible', timeout: 3_000 }).catch(() => undefined);
      if (await orderAlert(page).isVisible()) await confirmOrderAlert(page);
    }
    await expect(row, `ยา ${code} ต้องขึ้นในตะกร้า`).toBeVisible({ timeout: 15_000 });
  }).toPass({ timeout: 90_000 });
}

/** เมนูขวา "ใบรับรองแพทย์": เลือกเอกสาร → บันทึก → คืนชื่อเอกสารที่สร้าง */
export async function createMedicalCertificate(page: Page, prefer = /^ใบรับรองแพทย์ 5 โรค \(ภาษาไทย\)$/): Promise<string> {
  const main = page.getByRole('main');
  await careMenu(page, 'ใบรับรองแพทย์', main.getByRole('heading', { name: 'เอกสาร', exact: true }));
  // รายการเอกสารโหลดตามหลังเล็กน้อย — เปิด dropdown เร็วไปจะว่างค้าง → ปิดแล้วเปิดใหม่จนมีตัวเลือก
  await expect(async () => {
    await page.keyboard.press('Escape');
    await main.locator('.ant-select').filter({ hasText: 'ค้นหาเอกสารที่ต้องการสร้าง' }).last().click();
    await expect(options(page).first()).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  // รายการเอกสารต่างกันต่อระบบ → เลือกตัวที่ตรง `prefer` ก่อน ไม่มีก็ใบรับรองแพทย์ทั่วไป (แบบฟอร์มสั้น) แล้วค่อยตัวแรกที่เป็นใบรับรองแพทย์
  console.log(`    เอกสารที่เลือกได้: ${(await options(page).allInnerTexts()).map((text) => text.trim()).join(' | ')}`);
  let target = options(page).filter({ hasText: /ใบรับรองแพทย์/ }).first();
  for (const pattern of [prefer, /^ใบรับรองแพทย์(ทั่วไป)?( \(ภาษาไทย\))?$/, /ใบรับรองแพทย์.*ทั่วไป/, /^ใบรับรองแพทย์ \(/]) {
    const option = options(page).filter({ hasText: pattern }).first();
    if (await option.count()) {
      target = option;
      break;
    }
  }
  const name = (await target.innerText()).trim();
  await pick(target);
  // ช่องบังคับของแบบฟอร์มใบรับรองแพทย์ + ไม่สั่งพิมพ์ (เครื่องที่รันไม่มี print agent)
  // ช่องบังคับต่างกันตามแบบฟอร์ม: "สรุปความเห็นของแพทย์" (ใบรับรอง 5 โรค — dev-x) · "อาการ / การวินิจฉัยโรค" (ใบรับรองแพทย์ — SBH Prod)
  await expect(main.getByRole('checkbox', { name: 'พิมพ์อัตโนมัติเมื่อบันทึก' })).toBeVisible();
  for (const [field, value] of [
    ['สรุปความเห็นของแพทย์', 'สุขภาพแข็งแรง (เล่น Scenario UAT ER)'],
    ['อาการ / การวินิจฉัยโรค', 'ปวดท้อง Functional dyspepsia (เล่น Scenario UAT ER)'],
    ['Diagnosis', 'Functional dyspepsia (เล่น Scenario UAT ER)'],
  ]) {
    const box = main.getByRole('textbox', { name: field, exact: true });
    if (await box.isVisible()) await box.fill(value);
  }
  // ใบรับรองแพทย์ของ SBH Prod มีตัวเลือก "ได้มาตรวจที่โรงพยาบาล… วันนี้จริง" → ติ๊กให้ใบรับรองมีเนื้อหา
  const visited = main.getByRole('checkbox', { name: /ได้มาตรวจที่.*วันนี้จริง/ });
  if (await visited.isVisible()) await visited.check();
  await main.getByRole('checkbox', { name: 'พิมพ์อัตโนมัติเมื่อบันทึก' }).uncheck().catch(() => undefined);
  const save = main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).last();
  await expect(save, `เลือก "${name}" แล้วปุ่มบันทึกต้องกดได้`).toBeEnabled();
  const saved = nextMutation(page, /document|certificate|composition|contribution/i, 30_000);
  await save.click();
  await expectOk(await saved, `บันทึก ${name}`);
  await expect(main.getByText(/^สร้างโดย:/).last(), 'บันทึกแล้วต้องแสดงผู้สร้างเอกสารและเวลา').toBeVisible();
  return name;
}

/** ปลายทางของคำขอ Consult: คลินิก (คำค้น) และ/หรือ แพทย์ (คำค้น + ชื่อที่ต้องตรง) — ต้องมีอย่างน้อย 1 อย่าง */
export interface ConsultTarget {
  clinic?: string;
  doctor?: { search: string; name: RegExp };
}

/**
 * ฟอร์ม Consult (เมนูขวา): ขอปรึกษาไปยังคลินิก และ/หรือ แพทย์ → บันทึก → คืนชื่อปลายทางที่เลือก
 * `source` = sourceType ที่คำขอต้องได้ (ตั้งต้น 'er' · Visit OPD ส่ง `null` = ไม่ตรวจ แค่จด — SBH-1117)
 */
export async function requestConsult(page: Page, problem: string, to: ConsultTarget = { clinic: 'อายุรกรรม' }, source: string | null = 'er'): Promise<string> {
  const main = page.getByRole('main');
  await careMenu(page, 'Consult', main.getByRole('heading', { name: 'Consult', exact: true }));
  const targets: string[] = [];
  if (to.clinic) {
    await main.getByRole('combobox', { name: 'ขอปรึกษาไปยังคลินิก' }).click();
    await page.keyboard.type(to.clinic);
    await expect(options(page).first()).toBeVisible();
    targets.push((await options(page).first().innerText()).trim());
    await pick(options(page).first());
  }
  if (to.doctor) {
    // ไม่เลือกคลินิก รายชื่อแพทย์ไม่ถูกจำกัดตามคลินิก (เลือกคลินิกอายุรกรรมแล้วไม่มี "ทดสอบ มานะ" ให้เลือก — dev-x 3 ต.ค. 2026)
    // SBH Prod (5 ต.ค. 2026): เลือกแล้วช่องยังเป็น "เลือก" (ค่าไม่ติด) → เลือกซ้ำจนช่องแสดงชื่อแพทย์
    const doctor = to.doctor;
    const doctorBox = main.getByRole('combobox', { name: 'แพทย์ขอปรึกษา' });
    let chosen = '';
    await expect(async () => {
      await page.keyboard.press('Escape');
      await doctorBox.click();
      await doctorBox.fill(doctor.search);
      await expect(options(page).first()).toBeVisible();
      const available = (await options(page).allInnerTexts()).map((text) => text.trim());
      const option = options(page).filter({ hasText: doctor.name }).first();
      await expect(option, `ไม่มีแพทย์ ${doctor.name} ให้เลือกในช่อง "แพทย์ขอปรึกษา" — ที่มี: ${available.join(' · ')}`).toBeVisible({ timeout: 5_000 });
      chosen = (await option.innerText()).trim();
      await pick(option);
      // ค่าที่เลือกแสดงต่อจากป้ายชื่อช่องในเนื้อหาของ main (รายการตัวเลือกอยู่นอก main)
      // ตัดตัวยึดต้น / ท้ายของชื่อออก (ชื่อที่ผู้เรียกยึด ^ $ ไว้กันชื่อคล้ายกัน — ต่อเป็น pattern ของทั้ง main แล้วไม่ตรง)
      const nameSource = doctor.name.source.replace(/^\(\^\|\\s\)|^\^|\$$/g, '');
      await expect(main, 'ช่อง "แพทย์ขอปรึกษา" ต้องแสดงแพทย์ที่เลือก').toContainText(new RegExp(`แพทย์ขอปรึกษา[\\s\\S]{0,40}${nameSource}`), { timeout: 4_000 });
    }).toPass({ timeout: 60_000 });
    targets.push(chosen);
  }
  // ช่อง Consult Problem = editor ถัดจากป้าย "Consult Problem" — หน้า Visit OPD มี editor ของแผงอื่น (OPD Note "Note to Nurse" / Order "Note to nurse")
  // editor ตัวสุดท้ายของ main จึงไม่ใช่ช่องนี้ (SBH-1117 dev-x 16 ต.ค. 2026 ข้อความไปลง Note to Nurse) · ไม่มีป้ายนี้ (ฟอร์มของ ER) ใช้ editor ตัวสุดท้ายแบบเดิม
  const problemLabel = main.getByText('Consult Problem', { exact: true }).filter({ visible: true });
  const problemBox = (await problemLabel.count())
    ? problemLabel.last().locator('xpath=following::*[@contenteditable="true"][1]')
    : main.locator('[contenteditable="true"]').last();
  await problemBox.scrollIntoViewIfNeeded();
  await problemBox.fill(problem);
  await expect(problemBox).toContainText(problem);
  const saved = nextMutation(page, /mutation CreateConsultRequest/);
  await main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).last().click();
  const res = await saved;
  await expectOk(res, 'บันทึกคำขอ Consult');
  const body = (await res.json()) as { data?: { createConsultRequest?: { sourceType?: string } }; errors?: { message: string }[] };
  expect(body.errors, `บันทึกคำขอ Consult ไม่สำเร็จ: ${JSON.stringify(body).slice(0, 300)}`).toBeUndefined();
  if (source) expect(body.data?.createConsultRequest?.sourceType, `คำขอ Consult ต้องมาจาก ${source}: ${JSON.stringify(body).slice(0, 300)}`).toBe(source);
  else console.log(`    คำขอ Consult: sourceType ${body.data?.createConsultRequest?.sourceType ?? '-'}`);
  return targets.join(' / ');
}

/** เปิดหน้าผู้ป่วยด้วย session ของ role อื่น ใน context ใหม่ (ใส่ `visit` = หน้าของ Visit ER นั้น) — ผู้เรียกปิด context เอง */
export async function openPatientAs(browser: Browser, role: string, hn: string, visit?: ErVisit): Promise<Page> {
  // หน้าต่างของอีกบัญชีอัดวิดีโอแยกไฟล์ (วิดีโอหลักของเทสอัดเฉพาะหน้าของบัญชีหลัก) → <โฟลเดอร์ผลเทส>/video-<role>/
  const context = await browser.newContext({
    storageState: authFile(role),
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1920, height: 1080 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    recordVideo: { dir: test.info().outputPath(`video-${role}`), size: { width: 1920, height: 1080 } },
  });
  // context ที่สร้างเองไม่ผ่าน fixture ของ mock-data → ดักไฟล์แอปเอง (SBH Prod โหลดไฟล์ 15 MB ช้า / หลุดเป็นพักๆ)
  await cacheAppAssets(context);
  const page = await context.newPage();
  await page.goto(`/cortex/next/patients/${hn}${visit ? `?en=${visit.en}&vn=${visit.vn}&fromApp=er` : ''}`);
  await expect(page.getByRole('main').getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
  return page;
}

/** ประวัติ Consult → "ตอบกลับ consult" ของคำขอที่มี `problem` → กรอก "คำตอบ" → บันทึก */
export async function replyConsult(page: Page, problem: string, answer: string) {
  const main = page.getByRole('main');
  await recordMenu(page, 'ประวัติ Consult');
  // คำขอที่ยังรอตอบ (เล่นซ้ำกับผู้ป่วยรายเดิมจะมีคำขอข้อความเดียวกันที่ตอบไปแล้วปนอยู่)
  const pending = main.getByRole('row').filter({ hasText: problem }).filter({ hasText: 'รอตอบกลับ' });
  const pendingBefore = await pending.count();
  await pending.first().getByRole('button', { name: 'ตอบกลับ consult' }).click();
  const dialog = page.getByRole('dialog', { name: /Consult/ });
  await expect(dialog.getByText('คำตอบ', { exact: true })).toBeVisible();
  // ช่อง "คำตอบ *" = editor ตัวแรก · ตัวที่ 2 = "ข้อแนะนำ/แผนการรักษา…" (ไม่บังคับ) — มีเฉพาะเมื่อผู้เปิดเป็นแพทย์ที่ถูกขอปรึกษา
  const editors = dialog.locator('[contenteditable="true"]');
  await expect(editors.first(), 'หน้าต่าง Consult ต้องมีช่อง "คำตอบ" ให้กรอก').toBeVisible({ timeout: 8_000 });
  await expect(dialog.getByRole('radio', { name: 'ตอบ Consult', exact: true })).toBeChecked();
  await editors.first().fill(answer);
  await dialog.getByRole('checkbox', { name: 'Print ใบนัดอัตโนมัติ' }).uncheck().catch(() => undefined);
  const save = dialog.getByRole('button', { name: 'บันทึก', exact: true });
  await expect(save, 'กรอกคำตอบแล้วปุ่มบันทึกต้องกดได้').toBeEnabled();
  // กดบันทึกแล้วมีหน้าต่างยืนยัน "ยืนยันการบันทึกข้อมูลหรือไม่? หากบันทึกแล้วจะไม่สามารถกลับมาแก้…" → ยืนยัน
  const calls = await watchMutations(page, async () => {
    await save.click();
    await page.getByRole('dialog', { name: /ยืนยันการบันทึกข้อมูล/ }).getByRole('button', { name: 'ยืนยัน' }).click();
  });
  console.log(`    บันทึกคำตอบ Consult: ${calls.map((call) => call.slice(0, 420)).join(' ‖ ') || '(ไม่มีคำสั่งถูกส่ง)'}`);
  // คำสั่งบันทึกคำตอบไม่ผ่าน API ชุดที่ watchMutations ดู (dev-x 3 ต.ค. 2026 ได้รายการว่าง) → ยืนยันผลจากหน้าจอ: หน้าต่างปิด และคำขอที่รอตอบลดลง 1
  await expect(dialog).toBeHidden();
  await expect(pending, 'ตอบแล้วคำขอต้องเปลี่ยนสถานะจาก "รอตอบกลับ" เป็น "ตอบแล้ว"').toHaveCount(pendingBefore - 1);
}
