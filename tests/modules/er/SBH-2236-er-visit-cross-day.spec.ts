import { type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { closeVisitAtCashier, gotoCashierAccount } from '../../../helpers/functions/cashier';
import { dismissToast, expectVisitHeader, gotoErDashboard, openCarePanel, type ErVisit } from '../../../helpers/functions/er';
import { createAdmitRequest } from '../../../helpers/functions/er-admit';
import { chooseDispositionDiagnosis, dispositionTextBoxes, graphqlMutation, saveDispositionDraft, signDisposition, startDisposition } from '../../../helpers/functions/er-disposition';
import {
  bangkokToday,
  erDischargeButton,
  erDischargeConfirm,
  erListCell,
  erListRow,
  erListTab,
  erListTabCount,
  erViewSwitch,
  fetchErEncounterState,
  filterErListByHn,
  gotoErPatientList,
  hnSearchBox,
  openErListTab,
  readErListTabs,
  type ErListTabKey,
} from '../../../helpers/functions/er-list';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, holdForClip, makeRunner, markEvidence, snapEvidence } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { expectPatientInfo, newVisitButton, openNewVisitPanel } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, checkInOpdVisit, openOpdVisit, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL } from '../../../mock-data/uat-play';

// SBH-2236 [ER][Patient list] ผู้ป่วยรายชื่อหายไปหลังเที่ยงคืน — AC 1 Task ปิด Visit อัตโนมัติ 22:00 ไม่ปิด Visit ER (OPD ยังปิด) · AC 2 รายชื่อไม่หายหลังเที่ยงคืน
// ตัวแก้: cortex-api PR #2775 "preserve active er visits during automatic closure" · สเปกคิวข้ามวัน SBH-2396
// ชุด Manual: EXE SBH-3321 → HPY SBH-3322 (TC-001 3324 · 002 3325 · 003 3326 · 008 3327) → EDG SBH-3323 (TC-004 3328 · 005 3329 · 006 3330 · 007 3331)
// ผู้ใช้ยืนยัน 29 ต.ค. 2026: Visit ER ที่ยังไม่ปิดที่การเงิน = Active ทุกสถานะ (รวมรอจำหน่าย / จำหน่ายออกจาก ER แล้ว) → Task 22:00 ต้องไม่ปิด
//
// ผูกกับเวลาจริง 3 ช่วง (วัน D = วันที่เตรียม) — แต่ละเทสเช็คเวลาเอง ไม่ถึงเวลา = skip · รันทีละช่วงด้วย tag:
//   1) เตรียม (วัน D ก่อน 21:30) `--grep @SBH-2236-prep` — ผู้ป่วย AUTO ใหม่ 5 ราย เทสละราย จด HN / VN / EN ลง .cache/SBH-2236/state.json
//      A ER คัดกรองแล้ว (001 002 004 005) · B Visit OPD เช็คอิน (003) · C ER + Admit Request ไม่มีเตียง (006) · D ER + ลงนาม Disposition (007) · E เหมือน D + กดจำหน่าย (008)
//   2) หลัง 22:05 วัน D `--grep @SBH-2236-night` — TC-001 / 008 / 002 / 003 + API ว่าคืนนี้ system ปิด Visit อะไรไปบ้าง
//   3) หลัง 00:05 วัน D+1 `--grep @SBH-2236-midnight` — TC-004 / 005 / 006 / 007 แล้วปิด Visit A B D E ที่การเงิน (C รอเตียง ปิดแล้วก็ยังค้างบอร์ด — ทิ้งไว้แบบ SBH-2391)
// ข้อมูลตั้งต้นต่างจาก TC: ไม่ทำ ER Physician Note ก่อน Disposition ของ D / E (ฟอร์มแพทย์แบบใหม่ยังบันทึกด้วย automate ไม่ได้ — SBH-2355) ใช้ Diagnosis K30 ในฟอร์ม Disposition แทน
// SBH2236_DRYRUN=1 = ไม่เช็คเวลา (ซ้อม locator ของช่วง 2 / 3 ก่อนถึงเวลา — ผลใช้ลง Linear ไม่ได้)
// คลิป 1 ไฟล์ต่อ 1 TC (R61): ช่วงเตรียม clip-prep-<ราย> · ช่วงตรวจ clip-TC-00x
// ระบบ: dev-x เท่านั้น: npx playwright test --headed --grep @SBH-2236-prep

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC = { 1: 'TC-001 (SBH-3324)', 2: 'TC-002 (SBH-3325)', 3: 'TC-003 (SBH-3326)', 4: 'TC-004 (SBH-3328)', 5: 'TC-005 (SBH-3329)', 6: 'TC-006 (SBH-3330)', 7: 'TC-007 (SBH-3331)', 8: 'TC-008 (SBH-3327)' } as const;
const STATE_FILE = path.join(__dirname, '..', '..', '..', '.cache', 'SBH-2236', 'state.json');
const DRYRUN = process.env.SBH2236_DRYRUN === '1';
const DISPOSITION_TEXT = 'ทดสอบ automate SBH-2236';

type Key = 'A' | 'B' | 'C' | 'D' | 'E';
interface Prepared {
  hn: string;
  vn: string;
  en: string;
  name: string;
  /** วันที่เตรียม (เวลาไทย) = วัน D */
  day: string;
  preparedAt: string;
  /** คอลัมน์บนบอร์ดตอนเตรียม (ผู้ป่วย A — TC-005 โซนเดิม) */
  column?: string;
}

const readState = (): Partial<Record<Key, Prepared>> => (fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {});
function saveState(key: Key, value: Prepared) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...readState(), [key]: value }, null, 2));
  test.info().annotations.push({ type: `ผู้ป่วย ${key}`, description: `${value.name} · HN ${value.hn} · VN ${value.vn} · EN ${value.en} · เตรียม ${value.preparedAt}` });
  console.log(`    ผู้ป่วย ${key}: ${value.name} · HN ${value.hn} · ${value.vn} · ${value.en}`);
}

/** เวลาไทยตอนนี้ */
function bangkokNow(): { day: string; time: string; text: string } {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
  const [day, time] = parts.split(' ');
  return { day, time, text: parts };
}
const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** ผู้ป่วยที่เตรียมไว้ตามช่วงเวลา — ไม่ครบ / ผิดวัน / ไม่ถึงเวลา = skip พร้อมเหตุผล */
function preparedFor(keys: Key[], window: 'night' | 'midnight'): Record<Key, Prepared> {
  const state = readState();
  const missing = keys.filter((key) => !state[key]);
  test.skip(missing.length > 0, `ยังไม่ได้เตรียมผู้ป่วย ${missing.join(' ')} (${STATE_FILE})`);
  const now = bangkokNow();
  for (const key of keys) {
    const day = state[key]!.day;
    if (DRYRUN) continue;
    if (window === 'night') test.skip(now.day !== day || now.time < '22:05', `ช่วงตรวจหลัง Task 22:00 = ${day} 22:05–23:59 (ตอนนี้ ${now.text}) · ผู้ป่วย ${key}`);
    else test.skip(now.day !== nextDay(day) || now.time < '00:05', `ช่วงตรวจหลังเที่ยงคืน = ${nextDay(day)} ตั้งแต่ 00:05 (ตอนนี้ ${now.text}) · ผู้ป่วย ${key}`);
  }
  if (DRYRUN) test.info().annotations.push({ type: 'DRYRUN', description: `ไม่เช็คเวลา (${now.text}) — ผลใช้ลง Linear ไม่ได้` });
  return state as Record<Key, Prepared>;
}

function prepGuard() {
  const now = bangkokNow();
  test.skip(now.time >= '21:30', `เตรียมข้อมูลต้องจบก่อน Task 22:00 (ตอนนี้ ${now.text})`);
  return now;
}

// ---------- ขั้นที่ใช้ซ้ำ ----------

/** ผู้ป่วย AUTO ใหม่ → เปิด Visit ER → คัดกรองฟอร์มใหม่ ESI 3 → หน้า Overview ของ Visit */
async function openTriagedVisit(page: Page, key: Key): Promise<ErVisit & { name: string }> {
  const patient = newTestPatient(`X2236${key}`);
  await gotoErDashboard(page);
  const visit = await registerAndOpenErVisit(page, patient);
  const main = page.getByRole('main');
  await expectVisitHeader(page, visit);
  await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true }), 'หลังเปิด Visit ต้องอยู่หน้าคัดกรอง ER').toBeVisible({ timeout: 60_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await expect(main.getByText('Clinical Summary', { exact: true }), 'บันทึกคัดกรองแล้วหน้าต้องเปลี่ยนเป็น Overview ของ Visit').toBeVisible({ timeout: 60_000 });
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
  return { ...visit, name: `${patient.firstName} ${patient.familyName}` };
}

/** Disposition: เริ่มจำหน่าย → Improved + With Approval + K30 + ช่องข้อความ → บันทึกฉบับร่าง → ลงนาม */
async function signNonAdmitDisposition(page: Page) {
  const main = page.getByRole('main');
  await openCarePanel(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }));
  await startDisposition(page);
  const status = main.getByRole('radio', { name: 'Improved', exact: true });
  const method = main.getByRole('radio', { name: 'With Approval', exact: true });
  await status.check();
  await method.check();
  const diagnosis = await chooseDispositionDiagnosis(page, 'K30');
  const { clinical, finding } = dispositionTextBoxes(page);
  await clinical.fill(DISPOSITION_TEXT);
  await finding.fill(DISPOSITION_TEXT);
  await saveDispositionDraft(page);
  await markEvidence(filled(status.locator('xpath=ancestor::label[1]'), 'Improved'), filled(method.locator('xpath=ancestor::label[1]'), 'With Approval (ไม่ Admit)'), filled(diagnosis, 'K30'), clicked(page.getByTestId('er-disposition-finalize'), 'ลงนาม'));
  await snapEvidence(page, 'ก่อนกด — ลงนาม Disposition');
  await signDisposition(page);
  await markEvidence(alerted(page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว')), expected(page.getByTestId('er-disposition-reopen'), 'ลงนามแล้ว'));
}

/** คลิปช่วงโหลดหน้าระหว่าง TC (จอขาว) — ไม่แนบ Linear */
const GAP_CLIP = 'zz-gap-loading';

/**
 * เปิดหน้ารายการ ER (ไม่เลือกวันที่) → กรอง HN → เปิดแท็บ → แถวของ EN
 * clip = ตัดคลิปของ TC ก่อนหน้าทิ้งก่อนเปิดหน้า (ช่วงโหลดไปลง GAP_CLIP) แล้วเริ่มคลิปของ TC หลังหน้าโหลดเสร็จ (ไม่ติดจอขาวตอนโหลดแอป 6–14 วินาที — cortex-evidence-checker จับได้ 31 ต.ค. 2026)
 */
/** หน้ารายการ ER โหลดครบจริง: ช่องค้นหา HN กดได้ (ไม่มีชั้นเบลอ + วงโหลดของแอปบังอยู่) — กันคลิป TC เริ่มตอนจอยังโหลด */
async function gotoErListInteractive(page: Page) {
  await gotoErPatientList(page);
  await hnSearchBox(page).click({ trial: true, timeout: 60_000 });
}

async function showInListTab(page: Page, visit: Prepared, tab: ErListTabKey, clip?: string): Promise<Locator> {
  if (clip) await startClip(page, GAP_CLIP);
  await gotoErListInteractive(page);
  if (clip) await startClip(page, clip);
  await filterErListByHn(page, visit.hn);
  await expect(erListTabCount(page, tab), `กรอง HN ${visit.hn} แล้วแท็บต้องมีผู้ป่วย 1 ราย`).toHaveText('1', { timeout: 30_000 });
  await openErListTab(page, tab);
  const row = erListRow(page, visit.en);
  await expect(row).toBeVisible();
  return row;
}

/** แท็บที่ผู้ป่วยอยู่หลังกรอง HN (ผู้ป่วย 1 รายต้องอยู่แท็บเดียว) */
async function tabsWithPatient(page: Page): Promise<string[]> {
  return (await readErListTabs(page)).filter((tab) => tab.count > 0).map((tab) => tab.label);
}

/** คอลัมน์บนบอร์ดที่การ์ดของ HN อยู่ = หัวคอลัมน์ (แถวเดียวกับหัว "Triage") ที่ x ใกล้ที่สุดทางซ้ายของการ์ด */
async function boardColumnOf(page: Page, hn: string): Promise<{ card: Locator; header: Locator; column: string }> {
  const main = page.getByRole('main');
  const hnTag = page.getByText(`HN: ${hn}`, { exact: true });
  await expect(hnTag, `บอร์ดต้องมีการ์ดของ HN ${hn}`).toBeVisible({ timeout: 60_000 });
  await hnTag.scrollIntoViewIfNeeded();
  const card = page.locator('.ant-card').filter({ has: hnTag }).last();
  const column = await main.evaluate(
    (root, hnText) => {
      const leaves = [...root.querySelectorAll('*')].filter((el) => el.children.length === 0 && (el.textContent ?? '').trim());
      const triage = leaves.find((el) => el.textContent!.trim() === 'Triage');
      const tag = leaves.find((el) => el.textContent!.trim() === hnText);
      if (!triage || !tag) return '';
      const top = triage.getBoundingClientRect().top;
      const x = tag.getBoundingClientRect().x;
      const headers = leaves
        .filter((el) => Math.abs(el.getBoundingClientRect().top - top) < 6 && !/^\d+$/.test(el.textContent!.trim()))
        .map((el) => ({ name: el.textContent!.trim(), x: el.getBoundingClientRect().x }))
        .filter((h) => h.x <= x + 40)
        .sort((a, b) => b.x - a.x);
      return headers[0]?.name ?? '';
    },
    `HN: ${hn}`,
  );
  return { card, header: main.getByText(column, { exact: true }).first(), column };
}

/** สถานะ Visit บนหน้าบัญชีการเงิน ("สถานะ Visit: กำลังรักษา" / "เสร็จสิ้น") + ป้ายสถานะบัญชี (เปิด / …) */
async function readCashierVisit(page: Page, visit: Prepared, clip?: string) {
  if (clip) await startClip(page, GAP_CLIP);
  await gotoCashierAccount(page, visit.hn, visit.vn);
  const main = page.getByRole('main');
  // <span><span>สถานะ Visit: </span><span class="…visit-status-tag…">กำลังรักษา</span></span> — ป้ายค่าอยู่แยก element
  const value = main.locator('[class*="visit-status-tag"]').first();
  await expect(value).toBeVisible({ timeout: 30_000 });
  if (clip) await startClip(page, clip);
  const status = value.locator('xpath=..');
  const tag = main.locator('[class*="account-status-tag"]').first();
  /** กลุ่มซ้ายของแถบข้อมูล Visit (VN · ป้ายบัญชี · วันที่รับบริการ · สถานะ Visit) — ตีกรอบเดียว ป้ายไม่ชนกัน */
  const bar = status.locator('xpath=..');
  return { status, tag, bar, statusText: (await status.innerText()).replace(/\s+/g, ' ').trim(), tagText: (await tag.innerText().catch(() => '')).trim() };
}

/**
 * ผู้ป่วย AUTO รายเดิม (ของเทส — R10 / R11) ที่ไม่มี Encounter / Admission ค้าง: ไล่จาก ER ที่ เสร็จสิ้น แล้วย้อนหลังทีละวัน (ไม่เกิน 7 วัน)
 * env SBH2236_B_HN = ระบุ HN เอง
 */
async function pickIdleAutoPatient(page: Page, authorization: () => string): Promise<{ hn: string; name: string }> {
  const get = async <T,>(url: string): Promise<T> => {
    const res = await page.request.get(url, { headers: { authorization: authorization() } });
    expect(res.ok(), `GET ${url} → ${res.status()}`).toBe(true);
    return (await res.json()) as T;
  };
  const idle = async (hn: string) => {
    const enc = await get<{ data: { latestStatusCode: string }[] }>(`/generated-emr-api/encounters?filter[hn][equals]=${hn}&perPage=1000`);
    const adm = await get<{ data: { latestStatusCode: string }[] }>(`/generated-emr-api/admissions?filter[hn][equals]=${hn}&perPage=1000`);
    const done = ['completed', 'cancelled', 'entered-in-error'];
    return [...enc.data, ...adm.data].every((e) => done.includes(e.latestStatusCode));
  };
  const fixed = process.env.SBH2236_B_HN;
  if (fixed) return { hn: fixed, name: `HN ${fixed}` };
  for (let back = 1; back <= 7; back++) {
    const day = new Date(Date.parse(`${bangkokToday()}T00:00:00Z`) - back * 86_400_000).toISOString().slice(0, 10);
    const list = await get<{ hn: string; patientStatus: string; patient?: { firstName?: string; familyName?: string } }[]>(`/cortex-api/er/dashboard/encounters?date=${day}`);
    const candidates = [...new Map(list.filter((e) => e.patientStatus === 'finished' && e.patient?.firstName === 'AUTO').map((e) => [e.hn, e])).values()];
    for (const e of candidates.slice(0, 15)) if (await idle(e.hn)) return { hn: e.hn, name: `${e.patient?.firstName} ${e.patient?.familyName}` };
  }
  throw new Error('ไม่เจอผู้ป่วย AUTO ที่ไม่มีงานค้างใน 7 วันย้อนหลัง');
}

/** Encounter จาก generated-emr-api (สถานะ + ใครปิด เมื่อไร) */
async function encounterRecord(page: Page, authorization: () => string, visit: Prepared) {
  const res = await page.request.get(`/generated-emr-api/encounters?filter[hn][equals]=${visit.hn}&perPage=100`, { headers: { authorization: authorization() } });
  const { data } = (await res.json()) as { data: { en: string; vn: string; latestStatusCode: string; completedAt: string | null; completedBy: string | null; clinicId: number | null; encounterType: string }[] };
  return data.find((e) => e.en === visit.en) ?? null;
}

test.describe(`SBH-2236 ผู้ป่วย ER ไม่หายหลัง Task ปิด Visit 22:00 และหลังเที่ยงคืน (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 900_000 });
  test.skip(SYSTEM !== 'dev-x', 'การ์ดนี้รันบน dev-x เท่านั้น (SBH Prod ยังไม่ได้รับอนุญาต — R40)');

  // =============================== 1) เตรียม (วัน D ก่อน 21:30) ===============================
  test('เตรียม ผู้ป่วย A: เปิด Visit ER + คัดกรอง อยู่แท็บ ผู้ป่วยปัจจุบันใน ER (Super_User)', { tag: ['@SBH-2236', '@SBH-2236-prep', '@SBH-3324'], annotation: [linear('SBH-3322')] }, async ({ page }) => {
    const now = prepGuard();
    const authorization = trackAuthorization(page);
    const { soft, finish } = makeRunner(page);
    const visit = await checkStep(page, 'เตรียม ผู้ป่วย A ขั้น 1 ผู้ป่วย AUTO ใหม่ เปิด Visit ER + คัดกรอง ESI 3', async () => {
      const opened = await openTriagedVisit(page, 'A');
      await markEvidence(expected(page.getByRole('main').getByText('Clinical Summary', { exact: true }), 'คัดกรองแล้ว'));
      return opened;
    });
    const prepared: Prepared = { hn: visit.hn, vn: visit.vn, en: visit.en, name: visit.name, day: now.day, preparedAt: bangkokNow().text };
    saveState('A', prepared);
    await startClip(page, 'prep-A');
    await soft('เตรียม ผู้ป่วย A ขั้น 2 รายการ ER: อยู่แท็บ ผู้ป่วยปัจจุบันใน ER', async () => {
      const state = await fetchErEncounterState(page, authorization(), visit.en, bangkokToday());
      expect(state.patientStatus).toBe('current_in_er');
      const row = await showInListTab(page, prepared, 'current');
      await markEvidence(filled(hnSearchBox(page)), expected(erListTab(page, 'current'), 'ผู้ป่วยปัจจุบันใน ER'), expected(row, `ผู้ป่วย A มาถึง ${now.day}`));
    });
    await soft('เตรียม ผู้ป่วย A ขั้น 3 บอร์ด ER: การ์ดของผู้ป่วย A อยู่คอลัมน์ไหน (ไว้เทียบโซนเดิมหลังเที่ยงคืน)', async () => {
      await erViewSwitch(page, 'บอร์ด').click();
      const { card, header, column } = await boardColumnOf(page, visit.hn);
      expect(column, 'อ่านหัวคอลัมน์ของการ์ดได้').not.toBe('');
      saveState('A', { ...prepared, column });
      await markEvidence(expected(header, `คอลัมน์ ${column}`), expected(card, 'ผู้ป่วย A'));
    });
    finish();
  });

  test('เตรียม ผู้ป่วย B: เปิด Visit OPD + เช็คอิน ไม่ปิด Visit (Super_User)', { tag: ['@SBH-2236', '@SBH-2236-prep', '@SBH-3326'], annotation: [linear('SBH-3322')] }, async ({ page }) => {
    const now = prepGuard();
    const main = page.getByRole('main');
    const authorization = trackAuthorization(page);
    // dev-x 31 ต.ค. 2026: ฟอร์มผู้ป่วยใหม่ของเวชระเบียนกดบันทึกแล้วไม่ส่งคำสั่งสร้าง (registerPatient พัง) → ใช้ผู้ป่วย AUTO รายเดิมที่ไม่มีงานค้าง
    await gotoErDashboard(page);
    const { hn, name } = await pickIdleAutoPatient(page, authorization);
    test.info().annotations.push({ type: 'ผู้ป่วย B', description: `ผู้ป่วย AUTO รายเดิม ${name} HN ${hn} (ไม่มี Encounter / Admission ค้าง)` });
    await page.goto(`/cortex/next/patients/${hn}?views=patientInfo`);
    const newVisitEnabled = await expectPatientInfo(page);
    await startClip(page, 'prep-B');
    if (newVisitEnabled) {
      await markEvidence(expected(main.getByText(`HN ${hn}`, { exact: true }).first(), 'ผู้ป่วย B'), clicked(newVisitButton(page), 'Visit ใหม่'));
      await snapEvidence(page, 'ก่อนกด — Visit ใหม่ ของผู้ป่วย B');
      await openNewVisitPanel(page);
    }
    const opd = await openOpdVisit(page, { anyDoctor: true });
    const prepared: Prepared = { hn, vn: opd.vn, en: opd.en, name, day: now.day, preparedAt: bangkokNow().text };
    saveState('B', prepared);
    await checkInOpdVisitStep(page, prepared, opd.clinic);
  });

  test('เตรียม ผู้ป่วย C: เปิด Visit ER + คัดกรอง + Admit Request ไม่มีเตียง อยู่แท็บ ผู้ป่วยรอเตียง (Super_User)', { tag: ['@SBH-2236', '@SBH-2236-prep', '@SBH-3330'], annotation: [linear('SBH-3323')] }, async ({ page }) => {
    const now = prepGuard();
    const authorization = trackAuthorization(page);
    const visit = await openTriagedVisit(page, 'C');
    const prepared: Prepared = { hn: visit.hn, vn: visit.vn, en: visit.en, name: visit.name, day: now.day, preparedAt: bangkokNow().text };
    saveState('C', prepared);
    await startClip(page, 'prep-C');
    const { soft, finish, note } = makeRunner(page);
    await soft('เตรียม ผู้ป่วย C ขั้น 1 ส่ง Admit Request (ไม่สร้าง AN ไม่เลือกเตียง)', async () => {
      const request = await createAdmitRequest(page, 'ปวดท้อง ต้องนอนโรงพยาบาล (SBH-2236)');
      note('Admit Request ของผู้ป่วย C', `Pre-diagnosis ${request.diagnosis} · หอผู้ป่วย ${request.ward} · จากแผนก ${request.fromDepartment}`);
      await expect.poll(async () => (await fetchErEncounterState(page, authorization(), visit.en, bangkokToday())).patientStatus, { message: 'ส่ง Admit Request แล้วสถานะต้องเป็น รอเตียง' }).toBe('bed_waiting');
      await markEvidence(expected(page.getByRole('main').getByText(/รายละเอียดการรับไว้รักษา|Admit Request Form/).first(), 'ส่ง Admit Request แล้ว'));
    });
    await soft('เตรียม ผู้ป่วย C ขั้น 2 รายการ ER: อยู่แท็บ ผู้ป่วยรอเตียง', async () => {
      const state = await fetchErEncounterState(page, authorization(), visit.en, bangkokToday());
      expect(state.an, 'ไม่มี AN').toBeNull();
      const row = await showInListTab(page, prepared, 'bed-waiting');
      await markEvidence(filled(hnSearchBox(page)), expected(erListTab(page, 'bed-waiting'), 'ผู้ป่วยรอเตียง'), expected(row, `ผู้ป่วย C มาถึง ${now.day}`));
    });
    finish();
  });

  test('เตรียม ผู้ป่วย D: เปิด Visit ER + คัดกรอง + ลงนาม Disposition ไม่ Admit อยู่แท็บ รอจำหน่าย (Super_User)', { tag: ['@SBH-2236', '@SBH-2236-prep', '@SBH-3331'], annotation: [linear('SBH-3323')] }, async ({ page }) => {
    const now = prepGuard();
    const authorization = trackAuthorization(page);
    const visit = await openTriagedVisit(page, 'D');
    const prepared: Prepared = { hn: visit.hn, vn: visit.vn, en: visit.en, name: visit.name, day: now.day, preparedAt: bangkokNow().text };
    saveState('D', prepared);
    await startClip(page, 'prep-D');
    const { soft, finish } = makeRunner(page);
    await soft('เตรียม ผู้ป่วย D ขั้น 1 Disposition แบบไม่ Admit แล้วลงนาม', async () => {
      await signNonAdmitDisposition(page);
      await expect.poll(async () => (await fetchErEncounterState(page, authorization(), visit.en, bangkokToday())).patientStatus, { message: 'ลงนามแล้วต้องเป็น รอจำหน่าย' }).toBe('waiting_for_discharge');
    });
    await soft('เตรียม ผู้ป่วย D ขั้น 2 รายการ ER: อยู่แท็บ รอจำหน่าย มีปุ่ม จำหน่าย (ไม่กด)', async () => {
      const row = await showInListTab(page, prepared, 'waiting-for-discharge');
      await expect(erDischargeButton(row)).toBeVisible();
      await markEvidence(filled(hnSearchBox(page)), expected(erListTab(page, 'waiting-for-discharge'), 'รอจำหน่าย'), expected(row, `ผู้ป่วย D มาถึง ${now.day}`));
    });
    finish();
  });

  test('เตรียม ผู้ป่วย E: ลงนาม Disposition ไม่ Admit แล้วกด จำหน่าย ไม่ปิด Visit ที่การเงิน (Super_User)', { tag: ['@SBH-2236', '@SBH-2236-prep', '@SBH-3327'], annotation: [linear('SBH-3322')] }, async ({ page }) => {
    const now = prepGuard();
    const authorization = trackAuthorization(page);
    const visit = await openTriagedVisit(page, 'E');
    const prepared: Prepared = { hn: visit.hn, vn: visit.vn, en: visit.en, name: visit.name, day: now.day, preparedAt: bangkokNow().text };
    saveState('E', prepared);
    await startClip(page, 'prep-E');
    const { soft, finish } = makeRunner(page);
    const ok = await soft(`${TC[8]} ขั้น 1 เตรียมผู้ป่วย E: Disposition แบบไม่ Admit แล้วลงนาม`, async () => {
      await signNonAdmitDisposition(page);
      await expect.poll(async () => (await fetchErEncounterState(page, authorization(), visit.en, bangkokToday())).patientStatus, { message: 'ลงนามแล้วต้องเป็น รอจำหน่าย' }).toBe('waiting_for_discharge');
    });
    if (ok)
      await soft(`${TC[8]} ขั้น 2 รายการ ER แท็บ รอจำหน่าย กดปุ่ม จำหน่าย ของผู้ป่วย E แล้วยืนยัน`, async () => {
        const row = await showInListTab(page, prepared, 'waiting-for-discharge');
        const button = erDischargeButton(row);
        await markEvidence(filled(hnSearchBox(page)), expected(row, 'ผู้ป่วย E รอจำหน่าย'), clicked(button, 'จำหน่าย'));
        await snapEvidence(page, 'ก่อนกด — ปุ่ม จำหน่าย ของผู้ป่วย E');
        await button.click();
        const confirm = erDischargeConfirm(page);
        const confirmButton = confirm.getByRole('button', { name: 'จำหน่าย', exact: true });
        await expect(confirm).toBeVisible();
        await markEvidence(alerted(confirm), clicked(confirmButton, 'ยืนยัน'));
        await snapEvidence(page, 'ก่อนกด — ยืนยันจำหน่าย');
        const discharged = graphqlMutation(page, 'DischargeEncounterStatus', 40_000);
        await confirmButton.click();
        const body = (await (await discharged).json()) as { data?: { dischargeEncounterStatus?: { accepted?: boolean } } };
        expect(body.data?.dischargeEncounterStatus?.accepted, 'ระบบต้องรับคำสั่งจำหน่าย').toBe(true);
        await expect(erListTabCount(page, 'discharged')).toHaveText('1');
        const state = await fetchErEncounterState(page, authorization(), visit.en, bangkokToday());
        await test.info().attach('สถานะผู้ป่วย E หลังกดจำหน่าย', { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
        expect(state.patientStatus).toBe('discharged');
        expect(state.visitClosed, 'จำหน่ายออกจาก ER แล้ว Visit ยังไม่ปิด').toBe(false);
        await openErListTab(page, 'discharged');
        await markEvidence(alerted(page.getByText('ยืนยันการจำหน่ายผู้ป่วยออกจาก ER แล้ว').first()), expected(erListTab(page, 'discharged'), 'จำหน่าย'), expected(erListRow(page, visit.en), 'ผู้ป่วย E'));
      });
    finish();
  });

  // =============================== 2) หลัง Task 22:00 ของวัน D ===============================
  test('ตรวจหลัง Task ปิด Visit 22:00: ER ไม่ถูกปิด (A · E) · OPD ถูกปิด (B) (Super_User)', { tag: ['@SBH-2236', '@SBH-2236-night', '@SBH-3324', '@SBH-3325', '@SBH-3326', '@SBH-3327'], annotation: [linear('SBH-3322')] }, async ({ page }) => {
    const p = preparedFor(['A', 'B', 'E'], 'night');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    const { soft, finish, note } = makeRunner(page);
    const checkedAt = bangkokNow().text;
    note('เวลาตรวจ', checkedAt);

    await soft('ข้อมูลประกอบ: คืนนี้ system ปิด Encounter อะไรไปบ้าง (generated-emr-api completedBy = system)', async () => {
      await gotoErListInteractive(page);
      const since = new Date(Date.parse(`${p.A.day}T00:00:00+07:00`) - 3 * 86_400_000).toISOString();
      const res = await page.request.get(`/generated-emr-api/encounters?filter[completedBy][equals]=system&filter[createdAt][gte]=${since}&perPage=1000`, { headers: { authorization: authorization() } });
      const { data } = (await res.json()) as { data: { en: string; completedAt: string; clinicId: number | null; encounterType: string }[] };
      const tonight = data.filter((e) => e.completedAt >= new Date(Date.parse(`${p.A.day}T21:55:00+07:00`)).toISOString());
      await test.info().attach('Encounter ที่ system ปิดคืนนี้', { body: JSON.stringify(tonight, null, 2), contentType: 'application/json' });
      note('Task ปิด Visit คืนนี้', `system ปิด ${tonight.length} Encounter ตั้งแต่ 21:55 (${tonight.slice(0, 8).map((e) => `${e.en} ${e.encounterType}`).join(' · ')}${tonight.length > 8 ? ' …' : ''})`);
      for (const key of ['A', 'B', 'E'] as Key[]) {
        const record = await encounterRecord(page, authorization, p[key]);
        note(`Encounter ผู้ป่วย ${key}`, `${p[key].en} ${record?.encounterType ?? '-'} ${record?.latestStatusCode ?? 'ไม่พบ'} · ปิดโดย ${record?.completedBy ?? '-'} ${record?.completedAt ?? ''}`);
      }
      await markEvidence(expected(erListTab(page, 'current'), 'หน้ารายการ ER'));
    });

    await soft(`${TC[1]} ขั้น 3–4 หลัง 22:00 รายการ ER ค้น HN ของผู้ป่วย A — อยู่แท็บ ผู้ป่วยปัจจุบันใน ER ไม่ไปแท็บ เสร็จสิ้น`, async () => {
      const row = await showInListTab(page, p.A, 'current', 'TC-001');
      expect(await tabsWithPatient(page), 'ผู้ป่วย A ต้องอยู่แท็บ ผู้ป่วยปัจจุบันใน ER แท็บเดียว').toEqual(['ผู้ป่วยปัจจุบันใน ER']);
      await expect(erListTabCount(page, 'finished')).toHaveText('0');
      await markEvidence(filled(hnSearchBox(page)), expected(row, 'ผู้ป่วย A ยังอยู่แท็บ ผู้ป่วยปัจจุบันใน ER (1)'), erListTab(page, 'current'), expected(erListTab(page, 'finished'), 'เสร็จสิ้น 0'));
    });

    await soft(`${TC[8]} ขั้น 4–5 หลัง 22:00 หน้าการเงิน VN ของผู้ป่วย E (จำหน่ายออกจาก ER แล้ว) — Visit ยังเปิด`, async () => {
      const visit = await readCashierVisit(page, p.E, 'TC-008');
      note('สถานะ Visit ผู้ป่วย E', `${visit.statusText} · บัญชี ${visit.tagText}`);
      await markEvidence(expected(visit.bar, `${p.E.vn} · ${visit.statusText} (ต้องยังไม่ปิด)`));
      expect(visit.statusText, 'Visit ER ของผู้ป่วย E ต้องยังไม่ปิด').not.toContain('เสร็จสิ้น');
      await expect(main.getByRole('button', { name: 'ปิด Visit' })).toBeVisible();
    });

    await soft(`${TC[2]} ขั้น 2–3 หลัง 22:00 หน้าการเงิน VN ของผู้ป่วย A — Visit ER ยังเปิด`, async () => {
      const visit = await readCashierVisit(page, p.A, 'TC-002');
      note('สถานะ Visit ผู้ป่วย A', `${visit.statusText} · บัญชี ${visit.tagText}`);
      await markEvidence(expected(visit.bar, `${p.A.vn} · ${visit.statusText} (ต้องยังไม่ปิด)`));
      expect(visit.statusText, 'Visit ER ของผู้ป่วย A ต้องยังไม่ปิด').not.toContain('เสร็จสิ้น');
      await expect(main.getByRole('button', { name: 'ปิด Visit' })).toBeVisible();
    });

    await soft(`${TC[3]} ขั้น 3–4 หลัง 22:00 หน้าการเงิน VN ของผู้ป่วย B (OPD) — Visit ถูกปิดโดย Task`, async () => {
      const visit = await readCashierVisit(page, p.B, 'TC-003');
      const record = await encounterRecord(page, authorization, p.B);
      note('สถานะ Visit ผู้ป่วย B', `${visit.statusText} · บัญชี ${visit.tagText} · Encounter ${record?.latestStatusCode} ปิดโดย ${record?.completedBy ?? '-'}`);
      await markEvidence(expected(visit.bar, `${p.B.vn} (OPD) · ต้องเป็น เสร็จสิ้น`));
      await holdForClip(page, 2_000); // กรอบค้างในคลิปก่อน expect ที่อาจไม่ผ่าน (ภาพ Error ลบกรอบทิ้ง)
      expect(visit.statusText, 'Visit OPD ของผู้ป่วย B ต้องถูกปิด (เสร็จสิ้น)').toContain('เสร็จสิ้น');
      expect(record?.completedBy, 'ต้องปิดโดย Task (system)').toBe('system');
    });
    finish();
  });

  // =============================== 3) หลังเที่ยงคืน (วัน D+1) ===============================
  test('ตรวจหลังเที่ยงคืน: ผู้ป่วยที่มาถึงเมื่อวานยังแสดงในรายการ / บอร์ด (A · C · D) แล้วปิด Visit ที่การเงิน (Super_User)', { tag: ['@SBH-2236', '@SBH-2236-midnight', '@SBH-3328', '@SBH-3329', '@SBH-3330', '@SBH-3331'], annotation: [linear('SBH-3323')] }, async ({ page }) => {
    const p = preparedFor(['A', 'C', 'D'], 'midnight');
    const main = page.getByRole('main');
    const { soft, finish, note } = makeRunner(page);
    note('เวลาตรวจ', bangkokNow().text);

    /** ตัวกรองวันที่ของหน้ารายการต้องว่าง (ไม่เลือกวันที่) */
    const noDatePicked = async () => {
      expect(new URL(page.url()).searchParams.get('date'), 'URL ต้องไม่มีวันที่ที่เลือก').toBeNull();
    };

    await soft(`${TC[4]} ขั้น 2–3 หลังเที่ยงคืน รายการ ER (ไม่เลือกวันที่) ค้น HN ของผู้ป่วย A — อยู่แท็บ ผู้ป่วยปัจจุบันใน ER แม้มาถึงวันก่อนหน้า`, async () => {
      const row = await showInListTab(page, p.A, 'current', 'TC-004');
      await noDatePicked();
      const arrival = await erListCell(page, row, 'เวลารับเข้า');
      note('ผู้ป่วย A', `มาถึง ${p.A.day} (เตรียม ${p.A.preparedAt}) · เวลารับเข้าในรายการ ${await arrival.innerText()}`);
      expect(await tabsWithPatient(page)).toEqual(['ผู้ป่วยปัจจุบันใน ER']);
      await markEvidence(filled(hnSearchBox(page)), erListTab(page, 'current'), expected(row, `ผู้ป่วย A แท็บ ผู้ป่วยปัจจุบันใน ER · มาถึง ${p.A.day}`));
    });

    await soft(`${TC[5]} ขั้น 2–3 หลังเที่ยงคืน บอร์ด ER — การ์ดของผู้ป่วย A อยู่โซนเดิม (${p.A.column ?? '?'})`, async () => {
      await startClip(page, GAP_CLIP);
      await page.goto('/cortex/er/dashboard');
      await expect(main.getByText('แดชบอร์ด / คิว').first()).toBeVisible({ timeout: 60_000 });
      await startClip(page, 'TC-005');
      const { card, header, column } = await boardColumnOf(page, p.A.hn);
      note('คอลัมน์ของผู้ป่วย A', `ตอนเตรียม ${p.A.column ?? '-'} · หลังเที่ยงคืน ${column}`);
      // เลื่อนบอร์ดให้เห็นหัวคอลัมน์ก่อน (เลื่อนไปที่การ์ดอย่างเดียวหัวคอลัมน์หลุดขอบบน — evidence-checker / dry run 31 ต.ค.)
      await header.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const fullyVisible = (target: Locator) => target.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 90 && r.bottom <= innerHeight - 4; });
      if ((await fullyVisible(header)) && (await fullyVisible(card))) {
        await markEvidence(expected(header, `โซน ${column} (เดิม ${p.A.column ?? '-'})`), expected(card, 'ผู้ป่วย A'));
      } else {
        // การ์ดอยู่ต่ำกว่าจอ: ภาพ 1 หัวคอลัมน์ · ภาพ 2 การ์ด (ป้ายบอกโซน)
        await markEvidence(expected(header, `โซน ${column} (เดิม ${p.A.column ?? '-'})`));
        await snapEvidence(page, `บอร์ด ER — หัวคอลัมน์ ${column}`);
        await card.scrollIntoViewIfNeeded();
        await markEvidence(expected(card, `ผู้ป่วย A · คอลัมน์ ${column}`));
      }
      expect(column, 'การ์ดของผู้ป่วย A ต้องอยู่โซนเดิม').toBe(p.A.column);
    });

    await soft(`${TC[6]} ขั้น 2–3 หลังเที่ยงคืน รายการ ER (ไม่เลือกวันที่) ค้น HN ของผู้ป่วย C — อยู่แท็บ ผู้ป่วยรอเตียง`, async () => {
      const row = await showInListTab(page, p.C, 'bed-waiting', 'TC-006');
      await noDatePicked();
      expect(await tabsWithPatient(page)).toEqual(['ผู้ป่วยรอเตียง']);
      await markEvidence(filled(hnSearchBox(page)), erListTab(page, 'bed-waiting'), expected(row, `ผู้ป่วย C แท็บ ผู้ป่วยรอเตียง · มาถึง ${p.C.day}`));
    });

    await soft(`${TC[7]} ขั้น 2–3 หลังเที่ยงคืน รายการ ER (ไม่เลือกวันที่) ค้น HN ของผู้ป่วย D — อยู่แท็บ รอจำหน่าย มีปุ่ม จำหน่าย`, async () => {
      const row = await showInListTab(page, p.D, 'waiting-for-discharge', 'TC-007');
      await noDatePicked();
      expect(await tabsWithPatient(page)).toEqual(['รอจำหน่าย']);
      const button = erDischargeButton(row);
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      await markEvidence(filled(hnSearchBox(page)), erListTab(page, 'waiting-for-discharge'), expected(row, `ผู้ป่วย D แท็บ รอจำหน่าย · มาถึง ${p.D.day}`), expected(button, 'ปุ่ม จำหน่าย'));
    });

    // หลังเก็บหลักฐาน: ปิด Visit ของผู้ป่วยที่เตรียม (ไม่ใช่ TC) — C รอเตียง ปิดแล้วก็ยังค้างบอร์ด ทิ้งไว้
    if (!DRYRUN) {
      await startClip(page, 'cleanup');
      const all = readState();
      for (const key of ['A', 'B', 'D', 'E'] as Key[]) {
        const visit = all[key];
        if (!visit) continue;
        const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
          (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
          (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
        );
        note('หลังเทส', `ผู้ป่วย ${key} HN ${visit.hn} · ${visit.vn}: ${result}`);
      }
    }
    finish();
  });
});

/** ผู้ป่วย B: เช็คอิน Visit OPD → หน้าการเงินแสดง Visit ยังเปิด (สถานะตั้งต้นก่อน Task) */
async function checkInOpdVisitStep(page: Page, visit: Prepared, clinic: string) {
  const main = page.getByRole('main');
  const queue = await checkInOpdVisit(page, visit);
  test.info().annotations.push({ type: 'Visit OPD ผู้ป่วย B', description: `${clinic} · เช็คอินแล้ว (คิว ${queue})` });
  const status = main.locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
  await markEvidence(expected(main.getByText(`VN ${visit.vn}`, { exact: true }).filter({ visible: true }).first(), 'Visit OPD'), expected(status, 'เช็คอิน (ยังไม่ปิด)'));
  await holdForClip(page);
  const cashier = await readCashierVisit(page, visit);
  test.info().annotations.push({ type: 'สถานะ Visit ผู้ป่วย B ก่อน Task', description: `${cashier.statusText} · บัญชี ${cashier.tagText}` });
  await markEvidence(expected(cashier.bar, `${visit.vn} · ${cashier.statusText} (ก่อน 22:00)`));
  await snapEvidence(page, 'ผู้ป่วย B — หน้าการเงินก่อน Task 22:00');
}
