import type { Locator, Page, Response } from '@playwright/test';
import { confirmOpenErVisit, dismissToast, expectOk, expectVisitHeader, fetchBoard, fetchZones, gotoErDashboard, openErMenu, openVisitDialog, waitForApi, type ErBoardEncounter, type ErVisit } from '../helpers/functions/er';
import { erListCell, erListRow, erListTab, filterErListByHn, gotoErPatientList, hnSearchBox } from '../helpers/functions/er-list';
import { chooseGranularity, qualityTable, searchButton, type Granularity, type QualityReport } from '../helpers/functions/er-quality';
import { trackAuthorization } from '../helpers/functions/er-report';
import { ESI_BUTTON, erTriageLevel, erTriagePanel } from '../helpers/functions/er-triage';
import { colorName, fetchTvBoard, openTvWindow, readAllTvPatientPages, readTvActiveCard, tvActiveNumber, tvHistoryCards, tvPatientsSection, type TvBoard } from '../helpers/functions/er-tv-queue';
import { finishVideo } from '../helpers/functions/fixtures';
import { readPdfLayout } from '../helpers/functions/pdf-barcode';
import { captureGeneratedDocs, capturePrintJobs, hidePdf, showPdf } from '../helpers/functions/print-capture';
import {
  REFER_SECTIONS,
  expectedReferFields,
  fetchReferDetail,
  gotoReferInList,
  mophReferSection,
  preHospitalInfo,
  readReferSections,
  referDetailDialog,
  referInRow,
  referSection,
  type ReferInItem,
} from '../helpers/functions/refer-in';
import type { NewPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { COVERAGE_UC, SYSTEM, checkInOpdVisit, gotoPatient, nextUatPatient, openOpdVisit, recordMockPatient, scheduleWalkInRequest } from './uat-er';
import { gotoVisit, options, pick, recordMenu, watchMutations } from './uat-play';
import {
  TOR_VITALS_NORMAL,
  TorPlay,
  fillRegistrationExtras,
  fillTriageFull,
  noteFilled,
  registerFull,
  saveTriageFull,
  selectTriageZone,
  snap,
  type TriageFull,
} from './uat-tor';

// ───────────────────────────────────────────────────────────────────────────────────────────────
// เล่น Scenario UAT ER "ชีตส่งมอบ" (SharePoint "New file Test case OPD #2.xlsx" ชีต Scenario- ER ส่งมอบ — สกิล cortex-er-tor-uat) ข้อ 11–14
//   UAT-ER-11 คิวสำหรับผู้ป่วย (แถว 254–266): ผู้ป่วยใหม่ 3 ราย (กรอกครบ) ESI 3 / 4 / 5 → คัดกรอง → "Print บัตรคิว" ในฟอร์มคัดกรอง
//             → จับ PDF จาก POST /cortex-api/queues/print (R77) → เลขคิวเรียงตามลำดับเปิด Visit · ESI บนบัตรตรง · Issue #11 (ขาดเวลารอ / มี Barcode)
//             → จอ ER TV /cortex/public/er/tv-queue (หน้าต่างใหม่ไม่ล็อกอิน) → เรียกคิวตามลำดับ + ข้ามลำดับ จากรายการ "ผู้ป่วยปัจจุบันใน ER"
//   UAT-ER-12 ดึงรายงาน ER (แถว 267–278): รายเวร / รายวัน / รายเดือน · คุณภาพ (Door-to-doc / Door-to-disposition / Over Target / 72h Revisit) ·
//             Trauma / Non-trauma / Bed Block — อ่านอย่างเดียว จดค่าที่ได้ (ข้อมูลคุณภาพ "รอ Retest" — QA ยังไม่แน่ใจเงื่อนไข จึงจดค่า ไม่ตัดสิน)
//   UAT-ER-13 ส่งตัวจากแผนกอื่น (แถว 279–289): ผู้ป่วยใหม่ (กรอกครบ ไม่เปิด Visit ER) → Visit OPD วันนี้ (Prod: คำขอ Walk-in → ลงตารางแพทย์ → เช็คอิน)
//             → ประวัติการรับบริการ → EN ปัจจุบัน → Walk-in ไป คลินิก ER → บันทึก → ขึ้น ER Dashboard → คัดกรองครบ + โซน → คอลัมน์โซน + ESI บนหัวจอ
//   UAT-ER-14 MOPH Refer เข้า (แถว 290–298): รายการ รับ Refer เข้า เทียบ API · หน้าต่าง รายละเอียดการส่งต่อ + เปิดเอกสารใบส่งตัว
//             → "รับผู้ป่วยเข้า ER" → เปิด Visit → ได้ EN · วิธีมาถึง "รับ Refer" + ชื่อ รพ. ต้นทาง (ไม่บันทึกคัดกรองต่อ — ชีตจบที่เปิด Visit)
//
// รัน (SBH Prod — ผู้ใช้สั่งรันเอง แบบเปิดจอ ทีละข้อ R31):
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-11-14 --headed --grep "@UAT-ER-11"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-11-14 --headed --grep "@UAT-ER-12"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-11-14 --headed --grep "@UAT-ER-13"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-11-14 --headed --grep "@UAT-ER-14"
//
// ⚠ จอ ER TV ของ Prod = จอจริงของห้องฉุกเฉิน (UAT-ER-11):
//   - เรียกคิวเฉพาะผู้ป่วยทดสอบ 3 รายที่เทสสร้างเอง (ไม่กดแถวบนสุดของทั้งรายการ ซึ่งอาจเป็นผู้ป่วยจริง — "แถวบนสุด" = รายแรกของผู้ป่วยทดสอบ)
//   - `finally` จบคิว (ปุ่ม ✓ "จบคิว <เลข>" → POST …/queue-complete) ทุกคิวที่เทสเรียก แม้เทสพังกลางทาง (แบบ SBH-1026) แล้วปิดหน้าต่าง TV
//   - ห้ามรันพร้อมเทสอื่นที่เรียกคิว / นับรายการผู้ป่วย ER (SBH-1026 · SBH-3117 · SBH-3181) — คิวที่คนอื่นเรียกแทรกทำให้ขั้นตรวจจอ TV ไม่ผ่าน
//   - ผู้ป่วยทดสอบยังอยู่ในตาราง "ดูสถานะผู้ป่วยที่รักษาอยู่" ของจอ TV จนกว่าจะปิด Visit (ข้อมูล Mock ตั้งใจเก็บไว้ — ไม่ปิด Visit ในเทสนี้)
// ⚠ UAT-ER-14 ต้องมีรายการ Refer ของผู้ป่วย Mock (HN ต้นทางขึ้นต้น "UAT") สถานะ "ส่งเรียบร้อย" ส่งมาที่ รพ.สระบุรี ก่อน — ผู้ใช้ส่งเองด้วย
//   `npm run mock:refer -- --only=<เลข> --confirm` (หรือ `--unsent --confirm`) · สเปกนี้ไม่ส่งเอง · ไม่มีรายการรอรับ = จดข้อสังเกต + ข้ามเทสพร้อมวิธีส่ง
//   ไม่รับ Refer ของ รพ. จริง (HN ต้นทางไม่ขึ้นต้น UAT) · ไม่กด "ยืนยันผู้ป่วยมาถึงแล้ว" · REFER_ID=<referId> = เลือกรายการเอง
// ผล: ภาพทุกขั้น (TorPlay) · .cache/uat-play-<ระบบ>/UAT-ER-1x.json · ผู้ป่วยที่สร้างต่อท้าย mock-data/created-patients.md
// ───────────────────────────────────────────────────────────────────────────────────────────────

const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
const firstLine = (error: unknown) => clean((error as Error)?.message?.split('\n')[0] ?? String(error)).slice(0, 200);
/** ชื่อคลินิก ER ที่ค้นด้วย "ER" — ชีตเขียน "ER - ห้องตรวจนอกเวลาราชการ" · Prod / dev-x ขึ้น "ER - ห้องตรวจแผนกฉุกเฉิน" (คลินิกเดียวกัน id 6 ชื่อไม่ตรงกันตามจอ) */
const ER_CLINIC = /ห้องตรวจนอกเวลาราชการ|ห้องตรวจแผนกฉุกเฉิน/;
/** คำความเร่งด่วนของแต่ละ ESI (ตามปุ่มฟอร์มเดิม "3 เร่งด่วน") */
const ESI_WORD = (level: number) => (ESI_BUTTON[level] ?? '').replace(/^\d+\s*/, '');
/** โซนที่เลือกเองเมื่อระบบไม่แนะนำโซน (Prod ชื่อโซนชุดใหม่ 5 พ.ย. 2026 · ESI 5 → Observation ตาม Retest SBH-3883) */
const ZONE_FALLBACK: Record<number, RegExp> = { 1: /Resuscitation/, 2: /Resuscitation/, 3: /Urgency/, 4: /Urgency/, 5: /Observation/ };
/** สีป้าย ESI ที่จอ TV ควรใช้ (SBH-1719): 1–2 แดง · 3 ส้ม (warning #d48806) · 4–5 เขียว */
const TV_ESI_COLOR: Record<number, string> = { 1: 'แดง', 2: 'แดง', 3: 'ส้ม', 4: 'เขียว', 5: 'เขียว' };

type BoardRow = ErBoardEncounter & { vn?: string; queueExam?: { qDisplay?: string } | null };

const printQueueButton = (page: Page) => page.getByRole('main').getByRole('button', { name: 'printer พิมพ์บัตรคิว', exact: true }).filter({ visible: true }).first();

// ---------- คัดกรอง (ใช้ร่วม 11 / 13) ----------

/**
 * fillTriageFull + โซนสำรอง: ระดับที่ระบบไม่แนะนำโซน (เช่น ESI 5 บน Prod ก่อนแก้ SBH-3883) fillTriageFull จะหยุดที่ "ต้องมีโซนที่ระบบแนะนำ"
 * → เลือกโซนตาม ZONE_FALLBACK เอง แล้วจดว่าข้าม Underlying Disease (ส่วนท้ายของ fillTriageFull)
 */
async function fillTriageWithZoneFallback(play: TorPlay, page: Page, input: TriageFull): Promise<{ filled: string[]; skipped: string[]; zone: string }> {
  try {
    return await fillTriageFull(page, input);
  } catch (error) {
    if (!/ต้องมีโซนที่ระบบแนะนำ/.test((error as Error).message)) throw error;
    const zone = await selectTriageZone(page, ZONE_FALLBACK[input.level]);
    play.note(`ESI ${input.level}: ระบบไม่แนะนำโซน → เลือก "${zone}" เอง (ช่องก่อนหน้ากรอกแล้ว · ข้าม Underlying Disease)`);
    return { filled: [`ระดับความเร่งด่วน ${input.level}`, `โซน ${zone} (เลือกเอง)`], skipped: ['Underlying Disease (ข้าม — ระบบไม่แนะนำโซน)'], zone };
  }
}

/** กรอกฟอร์มคัดกรองครบ → บันทึก → รอ PATCH triage-result (ไม่รอ = จอ TV / บอร์ดได้ ESI ผิด — กับดัก SBH-1719) · ESI 5 ตอบ "ภายหลัง" ที่หน้าต่าง ส่งต่อไปคลินิก */
async function triageAndSave(play: TorPlay, page: Page, visit: ErVisit, input: TriageFull, label: string): Promise<{ zone: string }> {
  await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
  const t = await fillTriageWithZoneFallback(play, page, input);
  noteFilled(play, `คัดกรอง${label}`, t.filled, t.skipped);
  const zoned = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
  await saveTriageFull(page, visit, `บันทึกคัดกรอง${label}`);
  if (input.level === 5) {
    const refer = page.getByRole('dialog', { name: 'ส่งต่อไปคลินิก' });
    if (await refer.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false)) {
      await refer.getByRole('button', { name: 'ภายหลัง' }).click();
      await expect(refer).toBeHidden();
      play.note(`${label}: ESI 5 ขึ้นหน้าต่าง "ส่งต่อไปคลินิก" → กด ภายหลัง (ผู้ป่วยอยู่ ER ต่อ)`);
    }
  }
  const res = await zoned.catch(() => undefined);
  if (res) await expectOk(res, `ส่งเข้าโซน (triage-result) ${visit.en}`);
  else play.note(`${label}: ไม่เห็น PATCH triage-result ภายใน 90 วินาทีหลังบันทึก — ESI บนบอร์ด / จอ TV อาจยังไม่อัปเดต`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ').catch(() => undefined);
  return { zone: t.zone };
}

// ---------- บัตรคิว (UAT-ER-11) ----------

interface Ticket {
  queue: string;
  urgencyLine: string;
  waitLine?: string;
  barcode?: string;
  pages: number;
  pdf: Buffer;
  api: string;
  request: string;
  lines: string[];
}

/** กด "พิมพ์บัตรคิว" ในหัวแผงฟอร์มคัดกรอง → PDF จาก response ของ API (R77) → อ่านบรรทัด / Barcode */
async function printQueueTicket(page: Page, docs: ReturnType<typeof captureGeneratedDocs>): Promise<Ticket> {
  const button = printQueueButton(page);
  await expect(button, 'หัวแผงฟอร์มคัดกรองต้องมีปุ่ม พิมพ์บัตรคิว').toBeVisible({ timeout: 60_000 });
  const since = Date.now();
  await button.click();
  const doc = await docs.next(/\/cortex-api\/queues\/print(-slips)?$/, since, 60_000);
  if (doc.error) throw new Error(`API สร้างบัตรคิวตอบไม่สำเร็จ: ${doc.error}`);
  const file = doc.files.find((f) => /\.pdf$/i.test(f.name));
  if (!file) throw new Error(`ไม่ได้ไฟล์ PDF บัตรคิว (ได้ ${doc.files.map((f) => f.name).join(', ') || 'ไม่มีไฟล์'})`);
  await test.info().attach(`บัตรคิว ${file.name}`, { body: file.data, contentType: 'application/pdf' });
  const layout = await readPdfLayout(file.data);
  const lines = layout.lines.map((l) => clean(l.text));
  const titleAt = lines.findIndex((l) => /หมายเลขบัตรคิวของท่าน/.test(l));
  const queue = (titleAt >= 0 ? lines[titleAt + 1] : lines.find((l) => /^[A-Z]{1,4}\d{2,}$/.test(l))) ?? '';
  return {
    queue,
    urgencyLine: lines.find((l) => /^ระดับความเร่งด่วน/.test(l)) ?? '',
    waitLine: lines.find((l) => /เวลารอ|รอคอย|รอประมาณ|ระยะเวลา/.test(l)),
    barcode: layout.barcodes[0]?.text,
    pages: layout.pages,
    pdf: file.data,
    api: doc.api,
    request: doc.request,
    lines,
  };
}

/** ESI บนบัตรตรงกับที่คัดกรองไหม — Prod รูปในการ์ด "ระดับความเร่งด่วน : ฉุกเฉิน" · dev-x "ระดับความเร่งด่วน : ESI 3 (ภายใน 60 นาที)" */
function ticketLevelMatches(urgencyLine: string, level: number): boolean {
  const value = clean(urgencyLine.split(':').slice(1).join(':'));
  return new RegExp(`(^|\\s)ESI\\s*${level}(\\D|$)`).test(value) || value.replace(/\s*\(.*$/, '') === ESI_WORD(level);
}

// ---------- รายงาน (UAT-ER-12) ----------

/** เปิดหน้ารายงานจากเมนู → รอ API ของหน้า (ค่าตั้งต้นตอนเปิดหน้า) → แนบ JSON · คืน body + query */
async function openReport(page: Page, menu: string, api: string): Promise<{ body: Record<string, unknown>; query: string }> {
  const loaded = waitForApi(page, 'GET', `/cortex-api/er/reports/${api}`, 60_000);
  await openErMenu(page, 'รายงานทางสถิติ', menu);
  const res = await loaded;
  await expectOk(res, `โหลด${menu}`);
  const body = (await res.json()) as Record<string, unknown>;
  const url = new URL(res.url());
  await test.info().attach(`GET ${url.pathname}${url.search}`, { body: JSON.stringify(body, null, 2), contentType: 'application/json' });
  return { body, query: url.search };
}

type StatRow = { total?: number; esi?: number[]; untriaged?: number; arrival?: Record<string, number>; dispositionOutcome?: Record<string, number> };

/** รวมสถิติทุกแถวของรายงาน (รายเวร / รายวัน / รายเดือน): จำนวน · ESI 1–5 · ยังไม่ Triage · วิธีมา ER · ประเภทจำหน่าย */
function summarizeStat(body: Record<string, unknown>): string {
  const rows = (Array.isArray(body.rows) ? body.rows : []) as StatRow[];
  if (!rows.length) return `ไม่มีแถว (คีย์: ${Object.keys(body).join(', ')})`;
  const sum = (values: (number | undefined)[]) => values.reduce<number>((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  const keyed = (pick: (r: StatRow) => Record<string, number> | undefined) => {
    const keys = [...new Set(rows.flatMap((r) => Object.keys(pick(r) ?? {})))];
    return keys.map((k) => `${k} ${sum(rows.map((r) => pick(r)?.[k]))}`).join(' · ') || '-';
  };
  const esi = [0, 1, 2, 3, 4].map((i) => `ESI ${i + 1}=${sum(rows.map((r) => r.esi?.[i]))}`).join(' ');
  return `${rows.length} แถว · รวม ${sum(rows.map((r) => r.total))} ราย · ${esi} · ยังไม่ Triage ${sum(rows.map((r) => r.untriaged))} · วิธีมา: ${keyed((r) => r.arrival)} · จำหน่าย: ${keyed((r) => r.dispositionOutcome)}`;
}

const num = (value: number | null | undefined, digits = 1) => (value === null || value === undefined ? '-' : Number(value).toFixed(digits));
const pct = (value: number | null | undefined) => (value === null || value === undefined ? '-' : `${(Number(value) * 100).toFixed(1)}%`);

// ---------- Refer เข้า (UAT-ER-14) ----------

type ReferItem = ReferInItem & { canAccept?: boolean } & Record<string, unknown>;

/** รายการ รับ Refer เข้า ทุกหน้า (API ให้หน้าละ ≤ 50 แม้ขอ 100 — fetchReferInList ของ helper อ่านแค่หน้าแรก) · Prod หลุดเป็นพักๆ ลองใหม่ 4 ครั้ง */
async function fetchAllReferIn(page: Page, authorization: string): Promise<{ items: ReferItem[]; problem: string }> {
  const items: ReferItem[] = [];
  let problem = '';
  for (let p = 1, total = 1; p <= total && p <= 20; p++) {
    let body: { items?: ReferItem[]; pagination?: { totalPages?: number } } | undefined;
    for (let attempt = 1; attempt <= 4 && !body; attempt++) {
      const res = await page.request.get(`/cortex-api/moph/refer-in?page=${p}&perPage=50`, { headers: { authorization }, timeout: 45_000 }).catch((error: Error) => error);
      if (res instanceof Error) problem = firstLine(res);
      else if (res.ok()) body = (await res.json()) as typeof body;
      else problem = `${res.status()} ${(await res.text().catch(() => '')).slice(0, 200)}`;
      if (!body) await page.waitForTimeout(3_000);
    }
    if (!body) return { items, problem: `GET /cortex-api/moph/refer-in?page=${p} → ${problem}` };
    items.push(...(body.items ?? []));
    total = body.pagination?.totalPages ?? 1;
  }
  return { items, problem: '' };
}

/** ช่องของแถวตามหัวคอลัมน์ (ตารางแรกที่มองเห็นในหน้า) */
async function rowCells(page: Page, row: Locator): Promise<{ headers: string[]; cells: string[]; cell: (header: RegExp) => string }> {
  const headers = (await page.getByRole('main').locator('thead').filter({ visible: true }).first().locator('th').allInnerTexts()).map(clean);
  const cells = (await row.locator('td').allInnerTexts()).map(clean);
  return { headers, cells, cell: (header) => cells[headers.findIndex((h) => header.test(h))] ?? '' };
}

/**
 * ปุ่ม "รับผู้ป่วยเข้า ER" → เปิด Visit (ยังไม่มี helper — เขียนจากบันทึก screens/refer.md แบบ best-effort):
 * วนดูสถานะหน้าจอทีละรอบ: หน้าต่างยืนยัน (กดปุ่มหลัก) · ฟอร์มลงทะเบียนที่หน้าคัดกรอง (กรอกช่องที่ยังว่าง → ลงทะเบียนผู้ป่วย) ·
 * modal "เปิด Visit ER" (สิทธิที่ระบบเติมให้ = ใช้ตามนั้น · ไม่มีสิทธิ = เพิ่ม COVERAGE_UC) · หน้าผู้ป่วยที่มี en ใน URL — จนได้ EN
 */
async function acceptReferToEr(page: Page, row: Locator): Promise<{ visit?: ErVisit; flow: string[]; calls: string[]; filled: string[]; skipped: string[] }> {
  const flow: string[] = [];
  const filled: string[] = [];
  const skipped: string[] = [];
  let visit: ErVisit | undefined;
  const capture = async (res: Response) => {
    if (res.request().method() !== 'POST' || new URL(res.url()).pathname !== '/cortex-api/er/visits' || !res.ok()) return;
    const body = (await res.json().catch(() => ({}))) as { registration?: ErVisit };
    if (body.registration?.en) visit = { hn: body.registration.hn, vn: body.registration.vn, en: body.registration.en };
  };
  let popup: Page | undefined;
  const onPage = (opened: Page) => {
    popup = opened;
  };
  page.on('response', capture);
  page.context().on('page', onPage);
  const main = page.getByRole('main');
  const visitDialog = openVisitDialog(page);
  const registerButton = page.getByRole('button', { name: 'ลงทะเบียนผู้ป่วย' }).filter({ visible: true }).first();
  const confirmBox = page.locator('.ant-modal-confirm, .ant-popconfirm').filter({ visible: true }).first();
  const patientUrl = () => {
    const url = new URL(page.url());
    const hn = url.pathname.match(/\/cortex\/next\/patients\/(\w+)/)?.[1];
    const en = url.searchParams.get('en');
    return hn && en ? { hn, en, vn: url.searchParams.get('vn') ?? '' } : undefined;
  };
  const state = async (): Promise<string> => {
    if (visit) return 'visit';
    if (popup) return 'popup';
    if (await visitDialog.isVisible().catch(() => false)) return 'visit-dialog';
    if (await confirmBox.isVisible().catch(() => false)) return 'confirm';
    if (await registerButton.isVisible().catch(() => false)) return 'register';
    if (patientUrl()) return 'patient-page';
    return '';
  };
  try {
    const calls = await watchMutations(page, async () => {
      await row.getByRole('button', { name: 'รับผู้ป่วยเข้า ER' }).click();
      flow.push('กด รับผู้ป่วยเข้า ER');
      for (let round = 1; round <= 6 && !visit; round++) {
        let now = '';
        await expect.poll(async () => (now = await state()), { message: 'หลังกด รับผู้ป่วยเข้า ER ต้องมีหน้าต่าง / หน้าลงทะเบียน / หน้าผู้ป่วยขึ้น', timeout: 90_000 }).not.toBe('');
        if (now === 'visit') break;
        if (now === 'popup') {
          const opened = popup!;
          popup = undefined;
          await opened.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => undefined);
          const url = opened.url();
          flow.push(`เปิดแท็บใหม่ ${new URL(url).pathname} → เปิดในหน้าเดิมแทน`);
          await opened.close().catch(() => undefined);
          await page.goto(url);
        } else if (now === 'confirm') {
          const text = clean(await confirmBox.innerText().catch(() => ''));
          const primary = confirmBox.locator('.ant-modal-confirm-btns .ant-btn-primary, .ant-popconfirm-buttons .ant-btn-primary').first();
          flow.push(`หน้าต่างยืนยัน "${text.slice(0, 160)}" → กด ${clean(await primary.innerText().catch(() => '')) || 'ปุ่มหลัก'}`);
          await primary.click();
          await expect(confirmBox).toBeHidden({ timeout: 30_000 }).catch(() => undefined);
        } else if (now === 'register') {
          flow.push(`ฟอร์มลงทะเบียนที่หน้าคัดกรอง (${new URL(page.url()).pathname})`);
          // ข้อมูลที่ระบบเติมมาจาก Refer ไม่ทับ — กรอกเฉพาะช่องที่ยังว่าง
          const house = await page.locator('#officialAddress_houseNo').inputValue().catch(() => '');
          const mobile = await main.getByRole('textbox', { name: /มือถือ|โทรศัพท์/ }).first().inputValue().catch(() => '');
          const extras = await fillRegistrationExtras(page, { address: !house, mobile: !mobile });
          filled.push(...extras.filled, ...(house ? [`ที่อยู่ (ระบบเติมจาก Refer: บ้านเลขที่ ${house})`] : []), ...(mobile ? ['เบอร์มือถือ (ระบบเติมจาก Refer)'] : []));
          skipped.push(...extras.skipped);
          const registered = waitForApi(page, 'POST', '/cortex-api/patients/er-registration', 60_000);
          await registerButton.click();
          await expectOk(await registered, 'ลงทะเบียนผู้ป่วยรับ Refer');
          flow.push('กด ลงทะเบียนผู้ป่วย → สำเร็จ');
        } else if (now === 'visit-dialog') {
          const text = clean(await visitDialog.innerText().catch(() => ''));
          flow.push(`modal เปิด Visit ER: ${text.slice(0, 300)}`);
          const coverage = visitDialog.getByRole('cell', { name: /^[A-Z]\d{2,}\s*-\s*/ });
          if (await coverage.count()) {
            flow.push(`สิทธิที่ระบบเติมให้: ${(await coverage.allInnerTexts()).map(clean).join(' · ')}`);
            const created = waitForApi(page, 'POST', '/cortex-api/er/visits', 60_000);
            await visitDialog.getByTestId('create-visit-submit').click();
            const res = await created;
            await expectOk(res, 'เปิด Visit ER (รับ Refer)');
            const body = (await res.json()) as { registration?: ErVisit };
            if (body.registration?.en) visit = { hn: body.registration.hn, vn: body.registration.vn, en: body.registration.en };
          } else {
            flow.push(`ไม่มีสิทธิในหน้าต่าง → เพิ่ม ${COVERAGE_UC}`);
            visit = await confirmOpenErVisit(page, visitDialog, COVERAGE_UC);
          }
        } else if (now === 'patient-page') {
          const found = patientUrl()!;
          flow.push(`ไปหน้าผู้ป่วย HN ${found.hn} EN ${found.en} โดยไม่มี modal เปิด Visit`);
          visit = found;
        }
      }
    });
    return { visit, flow, calls, filled, skipped };
  } finally {
    page.off('response', capture);
    page.context().off('page', onPage);
  }
}

test.describe(`UAT ER ชีตส่งมอบ ข้อ 11–14 (${SYSTEM})`, () => {
  // ═══════════════════════════════════════ UAT-ER-11 ═══════════════════════════════════════
  test('UAT-ER-11 คิวสำหรับผู้ป่วย — บัตรคิว 3 ราย (ESI 3 / 4 / 5) · จอ ER TV · เรียกคิวตามลำดับและข้ามลำดับ', { tag: ['@UAT-ER-11'] }, async ({ page, browser }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-11');
    const authorization = trackAuthorization(page);
    const docs = captureGeneratedDocs(page);
    await capturePrintJobs(page); // ไม่มี print agent ในเครื่องเทส → ตอบ 200 แทน (ไม่ขึ้น "พิมพ์คิวไม่สำเร็จ")

    interface QueuePatient {
      no: number;
      level: 3 | 4 | 5;
      illness: string;
      fresh?: NewPatient;
      visit?: ErVisit;
      name: string;
      zone?: string;
      ticket?: Ticket;
      queue?: string;
    }
    const patients: QueuePatient[] = [
      { no: 1, level: 3, name: '', illness: 'ปวดท้องใต้ลิ้นปี่ 3 ชั่วโมง คลื่นไส้ อาเจียน 2 ครั้ง (UAT-ER-11 ราย 1)' },
      { no: 2, level: 4, name: '', illness: 'เจ็บคอ มีไข้ต่ำ 2 วัน กลืนลำบากเล็กน้อย (UAT-ER-11 ราย 2)' },
      { no: 3, level: 5, name: '', illness: 'แผลถลอกที่เข่าขวา หกล้ม 1 ชั่วโมงก่อนมา (UAT-ER-11 ราย 3)' },
    ];
    const VITALS: Record<3 | 4 | 5, TriageFull['vitals']> = {
      3: TOR_VITALS_NORMAL,
      4: { systolic: '122', diastolic: '78', pr: '84', rr: '18', temp: '37.6', spo2: '98', painScore: '3' },
      5: { systolic: '118', diastolic: '76', pr: '78', rr: '16', temp: '36.8', spo2: '99', painScore: '2' },
    };
    const calledByTest: QueuePatient[] = [];
    let tv: Page | undefined;

    /** แถวของผู้ป่วยในแท็บ "ผู้ป่วยปัจจุบันใน ER" (กรองด้วย HN) */
    const rowOf = async (p: QueuePatient) => {
      await expect(erListTab(page, 'current'), 'แท็บ "ผู้ป่วยปัจจุบันใน ER" ต้องถูกเลือก').toHaveAttribute('aria-selected', 'true');
      await filterErListByHn(page, p.visit!.hn);
      const row = erListRow(page, p.visit!.en);
      await expect(row, `ต้องเห็นแถวของรายที่ ${p.no} (${p.visit!.en}) ในแท็บผู้ป่วยปัจจุบันใน ER`).toBeVisible({ timeout: 60_000 });
      return row;
    };
    /** กดปุ่มเรียกคิว (ลำโพง + เลขคิว) ในคอลัมน์ "คิว" → API queue-call + toast "ส่งคิว <เลข> ไปยังจอ ER แล้ว" → คืนเวลาที่กด */
    const callQueue = async (p: QueuePatient): Promise<number> => {
      const row = await rowOf(p);
      const button = (await erListCell(page, row, 'คิว')).getByRole('button', { name: /^เรียกคิว / });
      await expect(button, `แถวรายที่ ${p.no} ต้องมีปุ่มเรียกคิว`).toBeVisible();
      await expect(button).toHaveAttribute('aria-label', `เรียกคิว ${p.queue}`);
      const called = waitForApi(page, 'POST', /\/cortex-api\/er\/encounters\/[^/]+\/queue-call$/, 30_000);
      const at = Date.now();
      await button.click();
      const res = await called;
      await expectOk(res, `เรียกคิว ${p.queue}`);
      if (!calledByTest.includes(p)) calledByTest.push(p);
      expect(new URL(res.url()).pathname, 'ต้องเรียกคิวของ Encounter รายนี้').toContain(`/er/encounters/${p.visit!.en}/queue-call`);
      const toast = page.getByText(`ส่งคิว ${p.queue} ไปยังจอ ER แล้ว`, { exact: true }).first();
      await toast.waitFor({ state: 'visible', timeout: 30_000 });
      return at;
    };
    /** จอ TV: รอการ์ด "กำลังเรียก" เป็นคิวนี้ (จอดึงข้อมูลทุก 3 วินาที) → วินาทีนับจากกดเรียก */
    const waitTvActive = async (queue: string, since: number): Promise<number> => {
      await tv!.bringToFront();
      await expect.poll(async () => clean(await tvActiveNumber(tv!).textContent().catch(() => '')), { message: `จอ TV ต้องขึ้นคิว ${queue} ในการ์ด กำลังเรียก`, timeout: 30_000 }).toBe(queue);
      return Math.round((Date.now() - since) / 100) / 10;
    };
    const activeCardNote = async (p: QueuePatient, api: TvBoard) => {
      const card = await readTvActiveCard(tv!).catch(() => null);
      const color = card ? colorName(card.urgencyColor || card.markColor) : '-';
      play.note(
        `จอ TV การ์ดกำลังเรียกของรายที่ ${p.no}: คิว ${card?.number ?? '-'} · ระดับคัดกรอง "${card?.triage ?? '-'}" · ความเร่งด่วน "${card?.urgency ?? '-'}" สี ${color} (ควรเป็น ${TV_ESI_COLOR[p.level]}) · API activeCall ${api.activeCall?.queueNumber ?? '-'} triageLevel ${api.activeCall?.triageLevel ?? '-'} (คัดกรอง ESI ${p.level})`,
      );
    };

    try {
      await gotoErDashboard(page);

      // ───── [254–260] ผู้ป่วย 3 ราย: ลงทะเบียนครบ → คัดกรองครบ → พิมพ์บัตรคิว (ทีละราย) ─────
      for (const p of patients) {
        console.log(`\n  ── UAT-ER-11 ผู้ป่วยรายที่ ${p.no}/3 (ESI ${p.level}) ──`);
        await play.step(`[254–257] รายที่ ${p.no}: ลงทะเบียนผู้ป่วยใหม่แบบกรอกครบที่หน้าคัดกรอง ER + เปิด Visit ER สิทธิ UC`, async () => {
          if (!new URL(page.url()).pathname.startsWith('/cortex/er/dashboard')) await gotoErDashboard(page);
          const fresh = await nextUatPatient(page, authorization(), 11);
          p.fresh = fresh;
          p.name = `${fresh.firstName} ${fresh.familyName}`;
          const reg = await registerFull(page, fresh);
          if (!reg.visit) throw new Error(`ลงทะเบียน HN ${reg.hn} แล้วไม่ได้ Visit ER`);
          p.visit = reg.visit;
          noteFilled(play, `ลงทะเบียนรายที่ ${p.no}`, reg.filled, reg.skipped);
          console.log(`    รายที่ ${p.no}: ${p.name} HN ${reg.visit.hn} · ${reg.visit.vn} · ${reg.visit.en}`);
        });
        if (!p.visit) continue;
        play.patient(`เปิดใหม่ รายที่ ${p.no} (ESI ${p.level})`, { ...p.visit, name: p.name, citizenId: p.fresh?.citizenId });

        await play.step(`[258–259] รายที่ ${p.no}: คัดกรองครบทุก Section — ESI ${p.level} + โซน → บันทึก`, async () => {
          const r = await triageAndSave(play, page, p.visit!, { level: p.level, vitals: VITALS[p.level], illness: p.illness }, `รายที่ ${p.no}`);
          p.zone = r.zone;
        });

        await play.step(`[258–259] รายที่ ${p.no}: กด "Print บัตรคิว" ในฟอร์มคัดกรอง — ได้บัตรคิว 1 ใบ ระดับความเร่งด่วนบนบัตรตรง ESI ${p.level}`, async () => {
          const ticket = await printQueueTicket(page, docs);
          p.ticket = ticket;
          p.queue = ticket.queue || undefined;
          play.note(
            `บัตรคิวรายที่ ${p.no}: POST ${ticket.api} ${ticket.request.slice(0, 120)} · ${ticket.pages} หน้า · คิว "${ticket.queue}" · "${ticket.urgencyLine}" · Barcode ${ticket.barcode ?? '(ไม่มี)'} · เวลารอ ${ticket.waitLine ? `"${ticket.waitLine}"` : '(ไม่มีบรรทัด)'}`,
          );
          await showPdf(page, ticket.pdf, `บัตรคิวรายที่ ${p.no} (ESI ${p.level}) — ${ticket.queue}`, 1, { fit: 'height' });
          expect(ticket.queue, 'บัตรคิวต้องมีเลขคิว').toBeTruthy();
          expect(ticketLevelMatches(ticket.urgencyLine, p.level), `ระดับความเร่งด่วนบนบัตร "${ticket.urgencyLine}" ต้องตรงกับ ESI ${p.level} (${ESI_WORD(p.level)})`).toBe(true);
        });
        await hidePdf(page);
        recordMockPatient(
          `UAT-ER-11 ราย ${p.no}`,
          p.fresh!,
          p.visit,
          `เปิด Visit ER สิทธิ UC · คัดกรอง ESI ${p.level}${p.zone ? ` · ${p.zone}` : ''}${p.queue ? ` · บัตรคิว ${p.queue}` : ' · พิมพ์บัตรคิวไม่สำเร็จ'}`,
        );
        console.log(`    ✓ รายที่ ${p.no} เสร็จ: ESI ${p.level} · โซน ${p.zone ?? '-'} · คิว ${p.queue ?? '-'}`);
      }

      await play.step('[258–260] บัตรคิวรายละใบ เลขเรียงตามลำดับเปิด Visit · ตรงกับเลขคิวบนบอร์ด · Issue #11 (ระยะเวลารอคอย / Barcode)', async () => {
        const printed = patients.filter((p) => p.ticket?.queue);
        const board = (await fetchBoard(page, authorization)) as BoardRow[];
        for (const p of printed) {
          const enc = board.find((e) => e.en === p.visit!.en);
          play.note(`รายที่ ${p.no}: บัตร ${p.ticket!.queue} · บอร์ด queueExam ${enc?.queueExam?.qDisplay ?? '-'} · triageLevel ${enc?.triageLevel ?? '-'} · triagedAt ${enc?.triagedAt ?? '-'}`);
        }
        const missingWait = printed.filter((p) => !p.ticket!.waitLine).map((p) => p.no);
        const barcodeOk = printed.filter((p) => p.ticket!.barcode === p.visit!.hn).map((p) => p.no);
        play.note(
          `Issue #11 (Partial): บรรทัดระยะเวลารอคอย ${missingWait.length ? `ไม่มีในบัตรรายที่ ${missingWait.join(', ')} — ตรง Issue #11` : 'มีครบทุกใบ (Issue #11 อาจแก้แล้ว)'} · Barcode = HN ${barcodeOk.length}/${printed.length} ใบ`,
        );
        expect(printed.length, 'ต้องมีผู้ป่วยที่มีบัตรคิว ≥ 3 ราย (แถว 260)').toBeGreaterThanOrEqual(3);
        const seq = printed.map((p) => Number(p.ticket!.queue.match(/(\d+)\s*$/)?.[1] ?? NaN));
        play.note(`ลำดับเลขคิวตามลำดับเปิด Visit: ${printed.map((p, i) => `${p.ticket!.queue} (${seq[i]})`).join(' → ')}`);
        for (let i = 1; i < seq.length; i++) expect(seq[i], `เลขคิวรายที่ ${printed[i].no} ต้องมากกว่ารายที่ ${printed[i - 1].no}`).toBeGreaterThan(seq[i - 1]);
        for (const p of printed) {
          const enc = board.find((e) => e.en === p.visit!.en);
          if (enc?.queueExam?.qDisplay) expect(p.ticket!.queue, `เลขบนบัตรรายที่ ${p.no} ต้องตรงกับเลขคิวบนบอร์ด`).toBe(enc.queueExam.qDisplay);
        }
      });

      // ───── [261–262] จอ ER TV ─────
      const ours = patients.filter((p) => p.visit && p.queue);
      await play.step('[261–262] เปิดจอ ER TV /cortex/public/er/tv-queue (หน้าต่างใหม่ ไม่ล็อกอิน) — ตาราง ลำดับ · หมายเลขคิว · ชื่อ-สกุล (ปิดบางส่วน) · สถานะ + ป้าย ESI ตามสี', async () => {
        tv = await openTvWindow(browser);
        const section = tvPatientsSection(tv);
        const headers = (await section.locator('thead th').allInnerTexts()).map(clean);
        play.note(`หัวตารางจอ TV: ${headers.join(' | ')}`);
        for (const word of [/ลำดับ/, /หมายเลขคิว|คิว/, /ชื่อ/, /สถานะ/]) expect(headers.join(' | '), `ตารางจอ TV ต้องมีคอลัมน์ ${word.source}`).toMatch(word);
        const api = await fetchTvBoard(tv);
        await test.info().attach('GET /cortex-api/public/er/tv-queue?v=2 (หลังคัดกรอง)', { body: JSON.stringify(api, null, 2), contentType: 'application/json' });
        const problems: string[] = [];
        for (const p of ours) {
          const row = api.patients.find((r) => r.queueNumber === p.queue);
          play.note(`จอ TV (API) รายที่ ${p.no}: ${row ? `คิว ${row.queueNumber} · ชื่อ "${row.maskedName}" · สถานะ "${row.status}"` : '(ไม่อยู่ในรายการผู้ป่วยของจอ)'}`);
          if (!row) problems.push(`รายที่ ${p.no} คิว ${p.queue} ไม่อยู่ในรายการผู้ป่วยของจอ TV`);
          else if (clean(row.maskedName) === p.name) problems.push(`รายที่ ${p.no} ชื่อไม่ถูกปิดบัง ("${row.maskedName}")`);
        }
        // หาแถวของผู้ป่วยทดสอบบนจอ (จอเปลี่ยนหน้าเองทุก 15 วินาที) + สีป้ายในแถว
        const found = new Set<string>();
        await readAllTvPatientPages(tv, async (pageNo, rows) => {
          for (const p of ours) {
            const r = rows.find((x) => x.queue === p.queue);
            if (!r || found.has(p.queue!)) continue;
            found.add(p.queue!);
            const colors = await section
              .locator('tbody tr.ant-table-row')
              .filter({ hasText: p.queue! })
              .first()
              .evaluate((tr) =>
                [...tr.querySelectorAll('.ant-tag, [class*="tag"], [class*="esi"], [class*="badge"], [class*="mark"]')].map((el) => {
                  const s = getComputedStyle(el as HTMLElement);
                  const label = (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
                  return `${label || '(ไม่มีข้อความ)'} ${s.backgroundColor}/${s.color}/${s.borderTopColor}`;
                }),
              )
              .catch(() => [] as string[]);
            play.note(`จอ TV หน้า ${pageNo} แถวรายที่ ${p.no}: ลำดับ ${r.seq} · คิว ${r.queue} · "${r.name}" · "${r.status}" · ป้าย/สี: ${colors.map((c) => c.replace(/rgba?\([^)]*\)/g, (m) => `${m}=${colorName(m)}`)).join(' ‖ ') || '(ไม่พบป้ายในแถว)'} (ESI ${p.level} ควรเป็น${TV_ESI_COLOR[p.level]})`);
            await snap(tv!, `จอ TV หน้า ${pageNo} — แถวรายที่ ${p.no} คิว ${p.queue}`);
          }
        });
        for (const p of ours) if (!found.has(p.queue!)) problems.push(`ไม่เห็นแถวคิว ${p.queue} (รายที่ ${p.no}) บนจอ TV ทุกหน้า`);
        await snap(tv, 'จอ TV — หลังเปิด');
        expect(problems, 'ตารางผู้ป่วยบนจอ TV ต้องมีผู้ป่วยทดสอบครบ และชื่อถูกปิดบางส่วน').toEqual([]);
      });

      // ───── [263–266] เรียกคิว ─────
      if (!tv) play.note('จอ TV ไม่เปิด — ไม่เรียกคิว (ไม่ให้คิวทดสอบขึ้นจอจริงโดยตรวจผลไม่ได้)');
      else if (ours.length < 2) play.note(`มีผู้ป่วยทดสอบที่มีเลขคิว ${ours.length} ราย — ต้องมี ≥ 2 รายจึงเรียกตามลำดับ / ข้ามลำดับได้`);
      else {
        const first = ours[0];
        const skip = ours[ours.length - 1];
        await play.step(`[263–264] เรียกคิวตามลำดับ — แดชบอร์ด / คิว มุมมองรายการ แท็บ "ผู้ป่วยปัจจุบันใน ER" คอลัมน์ "คิว" กดรายแรกของผู้ป่วยทดสอบ (คิว ${first.queue}) → toast + จอ TV กำลังเรียก`, async () => {
          await page.bringToFront();
          await gotoErPatientList(page);
          await hnSearchBox(page).clear();
          const keys = await page.getByRole('main').locator('tr.ant-table-row').filter({ visible: true }).evaluateAll((rows) => rows.map((r) => r.getAttribute('data-row-key') ?? ''));
          play.note(`ลำดับผู้ป่วยทดสอบในรายการ (หน้าแรก ${keys.length} แถว): ${ours.map((p) => `รายที่ ${p.no} คิว ${p.queue} → แถวที่ ${keys.indexOf(p.visit!.en) + 1 || '-'}`).join(' · ')} — เรียกเฉพาะผู้ป่วยทดสอบ (จอ TV ของ Prod เป็นจอจริง)`);
          const at = await callQueue(first);
          await snap(page, `หลังกด — เรียกคิว ${first.queue} (toast)`);
          const seconds = await waitTvActive(first.queue!, at);
          const api = await fetchTvBoard(tv!);
          await activeCardNote(first, api);
          play.note(`จอ TV ขึ้นคิว ${first.queue} ใน "กำลังเรียก" หลังกด ${seconds} วินาที`);
          await snap(tv!, `จอ TV — กำลังเรียก ${first.queue}`);
          await dismissToast(page, `ส่งคิว ${first.queue} ไปยังจอ ER แล้ว`).catch(() => undefined);
        });
        await play.step(`[265–266] เรียกคิวข้ามลำดับ — กดรายที่ ${skip.no} (คิว ${skip.queue} · ไม่ใช่คิวถัดไป) → จอ TV แสดงคิวใหม่ใน "กำลังเรียก" คิว ${first.queue} ย้ายไป "เรียกแล้ว"`, async () => {
          await page.bringToFront();
          const at = await callQueue(skip);
          await snap(page, `หลังกด — เรียกคิว ${skip.queue} (toast)`);
          const seconds = await waitTvActive(skip.queue!, at);
          const api = await fetchTvBoard(tv!);
          await activeCardNote(skip, api);
          const inHistoryApi = api.calledCalls.some((c) => c.queueNumber === first.queue);
          const inHistoryUi = (await tvHistoryCards(tv!).filter({ hasText: first.queue! }).count()) > 0;
          play.note(`จอ TV ขึ้นคิว ${skip.queue} หลังกด ${seconds} วินาที · คิว ${first.queue} ใน "เรียกแล้ว": API ${inHistoryApi ? 'มี' : 'ไม่มี'} · บนจอหน้าที่แสดง ${inHistoryUi ? 'มี' : 'ไม่เห็น (อาจอยู่หน้าอื่น)'}`);
          await snap(tv!, `จอ TV — กำลังเรียก ${skip.queue} · ${first.queue} ย้ายไปเรียกแล้ว`);
          await dismissToast(page, `ส่งคิว ${skip.queue} ไปยังจอ ER แล้ว`).catch(() => undefined);
          expect(inHistoryApi || inHistoryUi, `คิว ${first.queue} ต้องย้ายไปส่วน "เรียกแล้ว"`).toBe(true);
        });
      }
    } finally {
      await hidePdf(page).catch(() => undefined);
      if (tv) {
        await finishVideo(tv).catch(() => undefined);
        await tv.context().close().catch(() => undefined);
      }
      // จบคิวผู้ป่วยทดสอบที่เทสเรียกทุกราย — ไม่ให้คิวทดสอบค้าง "กำลังเรียก / เรียกแล้ว" บนจอ TV จริงของ Prod (แบบ SBH-1026)
      if (calledByTest.length) {
        await page.bringToFront().catch(() => undefined);
        await gotoErPatientList(page).catch((error) => console.log(`    หลังเทส: เปิดรายการผู้ป่วย ER ไม่ได้ — ${firstLine(error)}`));
        for (const p of calledByTest) {
          const result = await (async () => {
            const cell = await erListCell(page, await rowOf(p), 'คิว');
            const button = cell.getByRole('button', { name: `จบคิว ${p.queue}`, exact: true });
            if (!(await button.isVisible().catch(() => false))) return `ไม่มีปุ่มจบคิว (${clean(await cell.innerText().catch(() => ''))})`;
            const done = waitForApi(page, 'POST', /\/cortex-api\/er\/encounters\/[^/]+\/queue-complete$/, 30_000);
            await button.click();
            const confirm = page.locator('.ant-popconfirm-buttons .ant-btn-primary, .ant-modal-confirm-btns .ant-btn-primary').filter({ visible: true }).first();
            if (await confirm.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false)) await confirm.click();
            await expectOk(await done, `จบคิว ${p.queue}`);
            return 'จบคิวแล้ว';
          })().catch((error) => `จบคิวไม่สำเร็จ — ${firstLine(error)} → ต้องจบคิวเองที่รายการผู้ป่วย ER`);
          play.note(`หลังเทส: รายที่ ${p.no} คิว ${p.queue} — ${result}`);
        }
        const after = await fetchTvBoard(page).catch(() => undefined);
        if (after) play.note(`หลังเทส: จอ TV กำลังเรียก ${after.activeCall?.queueNumber ?? '(ไม่มี)'} · คิวทดสอบใน "เรียกแล้ว" ${after.calledCalls.filter((c) => calledByTest.some((p) => p.queue === c.queueNumber)).length} คิว`);
      }
      play.finish();
    }
  });

  // ═══════════════════════════════════════ UAT-ER-12 ═══════════════════════════════════════
  test('UAT-ER-12 แพทย์ / พยาบาลดึงรายงาน ER — สถิติรายเวร / รายวัน / รายเดือน · คุณภาพ · Trauma / Bed Block (อ่านอย่างเดียว)', { tag: ['@UAT-ER-12'] }, async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-12');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    try {
      await gotoErDashboard(page);
      void authorization; // ข้อนี้อ่านค่าจาก response ที่หน้ารายงานยิงเอง (ไม่เรียก API ตรง)
      console.log('    UAT-ER-12: อ่านรายงานอย่างเดียว — ไม่เขียนข้อมูล');

      // TOR12_ONLY=quality = รันเฉพาะ [275–276] รายงานคุณภาพ (ผู้ใช้สั่ง 9 พ.ย. 2026 หลัง 273 / 277 ผ่านแล้ว)
      const onlyQuality = process.env.TOR12_ONLY === 'quality';
      // ───── [273–274] สถิติ ─────
      const STAT_TABLES = ['จำนวนรวมและระดับ ESI', 'วิธีการมาห้องฉุกเฉิน', 'การจำหน่าย'];
      if (!onlyQuality) for (const { menu, api } of [
        { menu: 'รายงานรายเวร', api: 'shift' },
        { menu: 'รายงานรายวัน', api: 'daily' },
        { menu: 'รายงานรายเดือน', api: 'monthly' },
      ]) {
        await play.step(`[273–274] ${menu} — สถิติตามระดับ ESI · วิธีมา ER · ประเภทการจำหน่าย`, async () => {
          const { body, query } = await openReport(page, menu, api);
          await expect(main.getByRole('table').first(), `${menu} ต้องมีตาราง`).toBeVisible({ timeout: 30_000 });
          const shown: string[] = [];
          for (const name of STAT_TABLES) if (await main.getByRole('table', { name }).isVisible().catch(() => false)) shown.push(name);
          play.note(`${menu} (${query || 'ค่าตั้งต้น'}): ${summarizeStat(body)} · ตารางบนจอ: ${shown.join(' / ') || '(ไม่พบตารางชื่อ ESI / วิธีมา / จำหน่าย)'}`);
          expect(shown, `${menu} ต้องแสดงตาราง ESI · วิธีมา ER · การจำหน่าย`).toEqual(STAT_TABLES);
        });
      }

      // ───── [275–276] คุณภาพ ─────
      await play.step('[275–276] รายงานคุณภาพ — Door-to-doc · Door-to-disposition · รอเกินกำหนด (Over Target) · กลับมาซ้ำ 72 ชม. (รายเวร / รายวัน / รายเดือน)', async () => {
        const opened = await openReport(page, 'คุณภาพห้องฉุกเฉิน', 'quality');
        const text = clean(await main.innerText());
        for (const word of [/Door[- ]to[- ]doc/i, /Door[- ]to[- ]disposition/i, /Over Target/i, /72h Revisit/i]) expect(text, `หน้ารายงานคุณภาพต้องมี ${word.source}`).toMatch(word);
        const openedGranularity = new URLSearchParams(opened.query).get('granularity') ?? 'shift';
        for (const g of ['shift', 'day', 'month'] as Granularity[]) {
          let report: QualityReport;
          if (g === openedGranularity) {
            // ระดับที่เปิดหน้ามาแล้ว — กด ค้นหา ค่าเดิมระบบไม่ยิง API ใหม่ (รอบ 00:34 รอจนหมดเวลา) → ใช้ response ตอนเปิดหน้า
            report = opened.body as unknown as QualityReport;
          } else {
            await chooseGranularity(page, g);
            const loaded = page.waitForResponse((res) => {
              const url = new URL(res.url());
              return res.request().method() === 'GET' && url.pathname === '/cortex-api/er/reports/quality' && (url.searchParams.get('granularity') ?? 'shift') === g;
            }, { timeout: 60_000 });
            await searchButton(page).click();
            const res = await loaded;
            await expectOk(res, `รายงานคุณภาพ (${g})`);
            report = (await res.json()) as QualityReport;
            await test.info().attach(`GET /cortex-api/er/reports/quality${new URL(res.url()).search}`, { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
          }
          const t = report.total;
          const tables: string[] = [];
          for (const name of ['สรุปตัวชี้วัดคุณภาพ', 'Over Target ต่อ ESI (ราย)', 'Over Target ต่อ ESI (%)', '72h Revisit Detail']) if (await qualityTable(page, name).isVisible().catch(() => false)) tables.push(name);
          play.note(
            `คุณภาพ ${g} ${report.from}–${report.to} (รอ Retest — จดค่า): Eligible ${t?.eligible ?? '-'} · Door-to-doc ${num(t?.doorToDocMeanMinutes)} นาที (${t?.doorToDocCount ?? '-'} ราย) · Door-to-disposition ${num(t?.doorToDispositionMeanMinutes)} นาที (${t?.doorToDispositionCount ?? '-'} ราย) · Over Target ${t?.overTargetCase ?? '-'} ราย ${pct(t?.overTargetRate)} · 72h Revisit ${t?.revisitCase ?? '-'} ราย ${pct(t?.revisitRate)} (index ${t?.indexDischarges ?? '-'}) · ${report.rows?.length ?? 0} แถว · Target ${report.targets?.map((x) => `ESI ${x.level}=${x.minutes ?? 'ไม่จำกัด'}`).join(' ')} · ตารางบนจอ: ${tables.join(' / ') || '-'}`,
          );
          await snap(page, `รายงานคุณภาพ — ${g}`);
        }
      });

      // ───── [277–278] Trauma / Non-trauma / Bed Block ─────
      if (!onlyQuality) await play.step('[277–278] รายงาน Trauma / Non-trauma / Bed Block', async () => {
        const { body, query } = await openReport(page, 'Trauma / Bed Block', 'trauma-bed-block');
        const regions: string[] = [];
        for (const name of ['Trauma Visits', 'Non-trauma Visits', 'Mean Bed Block (MIN)', '>4h Bed Block']) {
          const region = main.getByRole('region', { name, exact: true });
          if (await region.isVisible().catch(() => false)) regions.push(`${name} = ${clean(await region.innerText()).replace(name, '').trim()}`);
        }
        const kpi = (body.kpi ?? {}) as Record<string, number | null>;
        play.note(
          `Trauma / Bed Block (${query || 'ค่าตั้งต้น'}): API kpi Trauma ${kpi.traumaVisits ?? '-'} · Non-trauma ${kpi.nonTraumaVisits ?? '-'} · Mean Bed Block ${num(kpi.meanBedBlockMinutes)} นาที · >4h ${kpi.over4hCount ?? '-'} ราย ${pct(kpi.over4hRate)} · threshold ${String(body.thresholdMinutes ?? '-')} นาที · บนจอ: ${regions.join(' · ') || '(ไม่พบการ์ด KPI)'}`,
        );
        expect(regions.length, 'ต้องเห็นการ์ด KPI Trauma / Non-trauma / Bed Block ครบ 4 การ์ด').toBe(4);
      });
    } finally {
      play.finish();
    }
  });

  // ═══════════════════════════════════════ UAT-ER-13 ═══════════════════════════════════════
  test('UAT-ER-13 ผู้ป่วยถูกส่งตัวมาจากแผนกอื่นในโรงพยาบาล — Visit OPD วันนี้ → Walk-in ไป ER → รับที่ ER → คัดกรอง + โซน', { tag: ['@UAT-ER-13'] }, async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-13');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    const ctx: { fresh?: NewPatient; hn?: string; opd?: { vn: string; en: string; clinic: string; doctor: string }; er?: ErVisit; zone?: string; problems: string[] } = { problems: [] };
    const LEVEL = 3 as const;
    try {
      await gotoErDashboard(page);
      // TOR13_RESUME=<HN>,<VN>,<EN ของ ER> = เล่นต่อที่ขั้นคัดกรองกับผู้ป่วยเดิม (ผู้ใช้สั่ง 9 พ.ย. 2026 หลังฟอร์มล็อก "ร่างถูกแก้ไขจากที่อื่น" ครั้งที่ 6)
      //   ข้ามขั้น 279–286 (ทำแล้ว — ห้ามเปิด Visit OPD / ส่งตัวซ้ำ)
      const resume13 = process.env.TOR13_RESUME?.split(',').map((s) => s.trim());
      if (resume13 && resume13.length >= 3) {
        ctx.hn = resume13[0];
        ctx.er = { hn: resume13[0], vn: resume13[1], en: resume13[2] };
        play.patient('เล่นต่อ (TOR13_RESUME — คัดกรองยังไม่ได้บันทึก)', { ...ctx.er, name: `HN ${ctx.hn}` });
        play.note('TOR13_RESUME — ข้ามขั้น 279–286 (ผ่านแล้วรอบ 00:42) · เล่นต่อที่คัดกรอง');
      } else {
      await play.step('[279–280] เตรียม: ลงทะเบียนผู้ป่วยใหม่แบบกรอกครบที่หน้าคัดกรอง ER (ยังไม่เปิด Visit ER)', async () => {
        const fresh = await nextUatPatient(page, authorization(), 13);
        ctx.fresh = fresh;
        const reg = await registerFull(page, fresh, { withoutVisit: true });
        ctx.hn = reg.hn;
        noteFilled(play, 'ลงทะเบียน', reg.filled, reg.skipped);
        console.log(`    ผู้ป่วย: ${fresh.firstName} ${fresh.familyName} HN ${reg.hn}`);
      });
      if (!ctx.hn) return;

      await play.step('[279–280] เตรียม: เปิด Visit OPD วันนี้ แผนกอายุรกรรม → (Prod: คำขอ Walk-in → ลงตารางแพทย์) → เช็คอิน', async () => {
        const hn = ctx.hn!;
        for (let round = 1; ; round++) {
          await gotoPatient(page, hn);
          try {
            ctx.opd = await openOpdVisit(page);
            break;
          } catch (error) {
            if (round >= 3 || !/เปิด Visit OPD ไม่สำเร็จ/.test((error as Error).message)) throw error;
            play.note(`เปิด Visit OPD รอบที่ ${round} ไม่สำเร็จ (${firstLine(error)}) — ลองใหม่`);
          }
        }
        const opd = ctx.opd!;
        let doctor = opd.doctor;
        if (!doctor) {
          const scheduled = await scheduleWalkInRequest(page, hn);
          doctor = `${scheduled.doctor} (${scheduled.slot})`;
        }
        const queue = await checkInOpdVisit(page, { hn, vn: opd.vn, en: opd.en });
        play.note(`Visit OPD ${opd.vn} / ${opd.en} ที่ ${opd.clinic} · แพทย์ ${doctor || '-'} · เช็คอิน ${queue}`);
      });
      if (!ctx.opd) return;
      const opd = ctx.opd;
      const hn = ctx.hn;
      const name = `${ctx.fresh!.firstName} ${ctx.fresh!.familyName}`;
      play.patient('เปิดใหม่ (Visit OPD)', { hn, vn: opd.vn, en: opd.en, name, citizenId: ctx.fresh!.citizenId });

      await play.step('[281–284] ส่งตัวจากแผนกอื่นมา ER — เลือกคนไข้ >> ประวัติการรับบริการ >> EN ปัจจุบัน >> คลินิก "ER - ห้องตรวจนอกเวลาราชการ" >> บันทึก', async () => {
        play.note('ชีตแถว 284 เลขข้อพิมพ์ซ้ำ "2." (ควรเป็น "4.")');
        if (!/\/cortex\/next\/patients\//.test(page.url())) await gotoPatient(page, hn);
        await recordMenu(page, 'ประวัติการรับบริการ');
        const row = main.getByRole('row').filter({ hasText: opd.en }).first();
        await expect(row, `ประวัติการรับบริการต้องมี EN ${opd.en}`).toBeVisible({ timeout: 45_000 });
        await row.getByRole('cell', { name: opd.en }).click();
        await expect(main.getByText(/^รายการเข้ารับบริการ/)).toBeVisible({ timeout: 45_000 });
        await expect(main.getByRole('row').filter({ hasText: 'Walk-in' }).first()).toBeVisible();
        const clinicBox = main.getByText('Walk-in ไป').first().locator('xpath=following::input[@role="combobox"][1]');
        await clinicBox.fill('ER');
        await expect(options(page).first()).toBeVisible();
        const found = (await options(page).allInnerTexts()).map(clean);
        const erOption = options(page).filter({ hasText: ER_CLINIC }).first();
        const chosen = clean(await erOption.innerText().catch(() => ''));
        play.note(`คลินิกที่ค้นด้วย "ER": ${found.join(' | ')} → เลือก "${chosen}"${/ห้องตรวจนอกเวลาราชการ/.test(chosen) ? '' : ' (ชีตเขียน "ER - ห้องตรวจนอกเวลาราชการ" — ชื่อในตัวเลือกต่างจากชีต คลินิก ER เดียวกัน)'}`);
        // แถว ER ในแผง "แก้ไข Visit" เท่านั้น — ตารางประวัติฝั่งซ้ายมีแถว ER ของ Visit เก่าได้
        const editVisit = main.locator('div').filter({ has: page.getByText(/^รายการเข้ารับบริการ/) }).filter({ has: page.getByText('Walk-in ไป') }).last();
        const erRow = editVisit.getByRole('row').filter({ hasText: ER_CLINIC }).filter({ visible: true }).first();
        const picked = await watchMutations(page, async () => {
          await pick(erOption);
          await expect(erRow, 'เลือกคลินิก ER แล้วต้องมีแถวเข้ารับบริการของ ER').toBeVisible({ timeout: 30_000 });
        });
        const save = main.getByRole('button', { name: /^(save )?บันทึก$/ }).filter({ visible: true }).last();
        const saved = await watchMutations(page, () => save.click());
        play.note(`เลือกคลินิก ER: ${picked.map((c) => c.slice(0, 200)).join(' ‖ ') || '(ไม่เห็นคำสั่ง)'} · บันทึก: ${saved.map((c) => c.slice(0, 200)).join(' ‖ ') || '(ไม่มีคำสั่งเพิ่ม)'}`);
        const savedToast = page.getByText(/Visit saved successfully|บันทึก.*สำเร็จ/).first();
        const toastShown = await savedToast.waitFor({ timeout: 15_000 }).then(() => true, () => false);
        play.note(`แถว ER ที่เพิ่ม: ${clean(await erRow.innerText().catch(() => ''))} · แจ้งเตือน: ${toastShown ? clean(await savedToast.innerText()) : '(ไม่เห็น)'}`);
        expect([...picked, ...saved].join(' '), 'ต้องไม่มี error จาก graphql').not.toMatch(/"errors":\[/);
      });

      await play.step('[285–286] รับผู้ป่วยที่ถูกส่งมาที่ห้องฉุกเฉิน — ผู้ป่วยขึ้นที่ ER และเห็นบน ER Dashboard (Prod 3 ต.ค. เคยไม่ขึ้น)', async () => {
        await gotoErDashboard(page);
        let found: BoardRow | undefined;
        await expect
          .poll(async () => {
            const board = (await fetchBoard(page, authorization).catch(() => [])) as BoardRow[];
            found = board.find((e) => e.hn === hn && e.latestStatusCode !== 'cancelled');
            return !!found;
          }, { message: `API บอร์ด ER ต้องมี Encounter ของ HN ${hn}`, timeout: 90_000 })
          .toBe(true);
        ctx.er = { hn, vn: found!.vn ?? opd.vn, en: found!.en };
        play.note(`Encounter ER บนบอร์ด: ${found!.en} · ${found!.latestStatusCode} · ${found!.patientStatus} · triagedAt ${found!.triagedAt ?? '-'}`);
        const card = page.getByText(`HN: ${hn}`, { exact: true });
        await page.reload();
        await expect(card, 'ผู้ป่วยต้องมีการ์ดบน ER Dashboard').toBeVisible({ timeout: 60_000 });
        await card.scrollIntoViewIfNeeded();
      });
      if (!ctx.er) return;
      play.patient('เปิดใหม่ (Encounter ER จาก OPD)', { ...ctx.er, name, citizenId: ctx.fresh!.citizenId });
      } // จบ else (ไม่ใช่ TOR13_RESUME)
      const hn = ctx.hn!;
      const er = ctx.er!;

      await play.step(`[288–289] คัดกรองและเลือกโซน — V/S · GCS · อาการสำคัญ · ESI ${LEVEL} + โซน (กรอกครบทุก Section) >> บันทึก`, async () => {
        if (resume13) {
          await gotoVisit(page, er);
          const systolic = erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first();
          const kept = await systolic.waitFor({ timeout: 120_000 }).then(() => systolic.inputValue(), () => '');
          if (kept) {
            // ร่างเดิมเก็บ V/S ไว้ แต่ระดับความเร่งด่วน + โซนอาจหาย → เลือกใหม่ แล้วบันทึก (แบบ UAT-ER-08 / 09)
            const locked = await page.getByText(/ร่างถูกแก้ไขจากที่อื่น/).first().waitFor({ timeout: 3_000 }).then(() => true, () => false);
            const levels = erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' });
            await levels.scrollIntoViewIfNeeded();
            if (!(await erTriageLevel(page, LEVEL).isChecked().catch(() => false))) await levels.getByText(String(LEVEL), { exact: true }).click();
            await expect(erTriageLevel(page, LEVEL), `ระดับความเร่งด่วนต้องเป็น ${LEVEL}`).toBeChecked();
            ctx.zone = await selectTriageZone(page, 'suggested');
            play.note(`เปิดใหม่: ร่างเก็บ Systolic "${kept}" · แถบ "ร่างถูกแก้ไขจากที่อื่น" ${locked ? 'ยังขึ้นอยู่' : 'ไม่ขึ้นแล้ว'} · เลือก ESI ${LEVEL} · โซน ${ctx.zone}`);
            await saveTriageFull(page, er, `คัดกรอง ESI ${LEVEL} (เล่นต่อ)`);
          } else {
            const r = await triageAndSave(play, page, er, { level: LEVEL, vitals: TOR_VITALS_NORMAL, illness: 'ส่งตัวจาก OPD อายุรกรรม: ปวดท้องรุนแรงขึ้น 1 ชั่วโมง เหงื่อออก (UAT-ER-13)' }, ' (ผู้ป่วยจาก OPD · กรอกใหม่ — ร่างหาย)');
            ctx.zone = r.zone;
          }
        } else {
        const card = page.getByText(`HN: ${hn}`, { exact: true });
        await card.click();
        await expectVisitHeader(page, er);
        const r = await triageAndSave(play, page, er, { level: LEVEL, vitals: TOR_VITALS_NORMAL, illness: 'ส่งตัวจาก OPD อายุรกรรม: ปวดท้องรุนแรงขึ้น 1 ชั่วโมง เหงื่อออก (UAT-ER-13)' }, ' (ผู้ป่วยจาก OPD)');
        ctx.zone = r.zone;
        }
        const header = main.getByText(new RegExp(`ESI\\s*${LEVEL}\\b`)).filter({ visible: true }).first();
        const shown = await header.isVisible().catch(() => false);
        play.note(`หัวจอหลังบันทึก: ${shown ? `"${clean(await header.innerText())}"` : `(ไม่เห็นข้อความ ESI ${LEVEL})`}`);
        expect(shown, `หัวจอต้องแสดงระดับ ESI ${LEVEL}`).toBe(true);
      });

      await play.step('[288–289] ER Dashboard — ผู้ป่วยขึ้นคอลัมน์โซนที่เลือก', async () => {
        await gotoErDashboard(page);
        const board = (await fetchBoard(page, authorization)) as BoardRow[];
        const enc = board.find((e) => e.en === er.en);
        const zones = await fetchZones(page, authorization).catch(() => new Map<number, string>());
        const zoneName = enc?.currentLocationId ? zones.get(enc.currentLocationId) : undefined;
        play.note(`บอร์ดหลังคัดกรอง: ESI ${enc?.triageLevel ?? '-'} · triagedAt ${enc?.triagedAt ?? '-'} · โซน ${zoneName ?? enc?.currentLocationId ?? '-'} (ที่เลือก: ${ctx.zone ?? '-'})`);
        expect(enc?.triageLevel, `บอร์ดต้องได้ triageLevel ${LEVEL}`).toBe(LEVEL);
        const card = page.getByText(`HN: ${hn}`, { exact: true });
        await expect(card).toBeVisible({ timeout: 60_000 });
        await card.scrollIntoViewIfNeeded();
        expect(zoneName, 'ต้องรู้ชื่อโซนของ Encounter').toBeTruthy();
        const column = main.locator('div').filter({ has: page.getByText(zoneName!, { exact: true }) }).filter({ has: card }).last();
        await expect(column, `การ์ดต้องอยู่คอลัมน์ ${zoneName}`).toBeVisible();
      });
    } finally {
      if (ctx.fresh && ctx.hn) {
        recordMockPatient(
          'UAT-ER-13',
          ctx.fresh,
          { hn: ctx.hn, vn: ctx.er?.vn ?? ctx.opd?.vn, en: ctx.er?.en ?? ctx.opd?.en },
          ctx.er ? `Visit OPD ${ctx.opd?.en} → Encounter ER ${ctx.er.en}${ctx.zone ? ` · คัดกรอง ESI ${LEVEL} · ${ctx.zone}` : ' · ยังไม่คัดกรอง'}` : ctx.opd ? `Visit OPD ${ctx.opd.en} · ยังไม่ขึ้น ER` : 'ลงทะเบียนแล้ว · ยังไม่มี Visit',
        );
      }
      play.finish();
    }
  });

  // ═══════════════════════════════════════ UAT-ER-14 ═══════════════════════════════════════
  test('UAT-ER-14 ส่งตัวมาจากโรงพยาบาลอื่นผ่าน MOPH Refer — รายการ · รายละเอียด · รับผู้ป่วยเข้า ER + เปิด Visit', { tag: ['@UAT-ER-14'] }, async ({ page }) => {
    test.skip(SYSTEM === 'dev-x', 'dev-x ไม่มีรายการ รับ Refer เข้า (API MOPH 502) — รันบน SBH Prod');
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-14');
    const authorization = trackAuthorization(page);
    const ctx: { refer?: ReferItem; visit?: ErVisit } = {};
    try {
      await gotoErDashboard(page);
      let pending: ReferItem[] = [];
      await play.step('[290–291] เตรียม: หารายการ Refer ของผู้ป่วย Mock ที่ส่งมา รพ.สระบุรี สถานะ "ส่งเรียบร้อย" (รอรับ)', async () => {
        let status = 0;
        for (let attempt = 1; attempt <= 3 && status !== 200; attempt++) status = await gotoReferInList(page).catch(() => 0);
        expect(status, 'หน้า รับ Refer เข้า ต้องโหลดรายการได้ (API 200)').toBe(200);
        const { items, problem } = await fetchAllReferIn(page, authorization());
        expect(problem, 'อ่านรายการ Refer เข้าทุกหน้าได้').toBe('');
        const wanted = process.env.REFER_ID;
        // เฉพาะผู้ป่วย Mock (HN ต้นทางขึ้นต้น UAT — ไฟล์ใน mock-data-refer/) · ไม่แตะ Refer ของ รพ. จริง
        pending = items.filter((i) => i.status === 'deliver' && i.canAccept !== false && !i.linkedVisit && /^UAT/.test(i.originHn) && (!wanted || i.referId === wanted));
        play.note(`รายการ Refer ทั้งหมด ${items.length} · รอรับ (deliver) ${items.filter((i) => i.status === 'deliver').length} · ของผู้ป่วย Mock ที่รับได้ ${pending.length}${wanted ? ` (REFER_ID=${wanted})` : ''}`);
      });
      if (!pending.length) {
        const message =
          'ไม่มีรายการ Refer ของผู้ป่วย Mock สถานะ "ส่งเรียบร้อย" ให้รับ — ส่ง Refer ใหม่ก่อนด้วย `npm run mock:refer` (ดูเลขที่ยังไม่ส่ง) แล้ว `npm run mock:refer -- --only=<เลข> --confirm` จากนั้นรันข้อนี้ใหม่';
        play.note(message);
        console.log(`\n  ⚠ UAT-ER-14: ${message}\n`);
        test.skip(true, message);
        return;
      }
      // รายการที่ส่งล่าสุดก่อน
      const refer = [...pending].sort((a, b) => String(b.referDate).localeCompare(String(a.referDate)))[0];
      ctx.refer = refer;
      console.log(`    Refer ${refer.referOutNo} (${refer.referId}) · ${refer.patientName} · HN ต้นทาง ${refer.originHn} · ${refer.originHospitalName} · ${refer.referDate}`);
      await test.info().attach(`รายการ Refer ที่ใช้ (${refer.referId})`, { body: JSON.stringify(refer, null, 2), contentType: 'application/json' });
      const row = referInRow(page, refer);

      await play.step('[292–293] ดูรายการผู้ป่วยที่ถูกส่งต่อมา — หน้า "รับ Refer เข้า" แถวตรงกับต้นทาง (ชื่อ · เลขบัตร · สิทธิ · รพ. ต้นทาง · วันที่ส่ง)', async () => {
        const search = page.getByRole('searchbox', { name: 'ค้นหาด้วยเลขบัตรประชาชน' });
        await search.fill(refer.cid);
        await search.press('Enter');
        await expect(row, 'ค้นด้วยเลขบัตรแล้วต้องได้แถวของ Refer นี้ 1 แถว').toHaveCount(1, { timeout: 45_000 });
        const { headers, cell } = await rowCells(page, row);
        // สิทธิของต้นทาง: ใช้ field ใน API ที่ชื่อเกี่ยวกับสิทธิ (ถ้ามี) — ตารางแปลงรหัสเป็นข้อความได้ จึงจดเทียบ ไม่ตัดสิน
        const coverageApi = Object.entries(refer)
          .filter(([k, v]) => /coverage|insur|right|medical|plan|pttype/i.test(k) && (typeof v === 'string' || typeof v === 'number'))
          .map(([k, v]) => `${k}=${v}`)
          .join(' · ');
        const checks: [string, string, string, boolean][] = [
          ['ชื่อ', refer.patientName, cell(/^ผู้ป่วย$/), cell(/^ผู้ป่วย$/).includes(clean(refer.patientName))],
          ['เลขบัตร', refer.cid, cell(/^ผู้ป่วย$/), cell(/^ผู้ป่วย$/).includes(refer.cid)],
          ['HN ต้นทาง', refer.originHn, cell(/HN ต้นทาง/), cell(/HN ต้นทาง/) === refer.originHn],
          ['รพ. ต้นทาง', `${refer.originHospitalName} (${refer.originHcode})`, cell(/รพ\.?\s*ต้นทาง|โรงพยาบาลต้นทาง/), cell(/รพ\.?\s*ต้นทาง|โรงพยาบาลต้นทาง/).includes(clean(refer.originHospitalName))],
          ['วันที่ส่งตัว', refer.referDate, cell(/วันที่ส่ง/), cell(/วันที่ส่ง/) === refer.referDate],
          ['สถานะ', 'ส่งเรียบร้อย', cell(/สถานะ/), /ส่งเรียบร้อย/.test(cell(/สถานะ/))],
        ];
        play.note(`หัวตาราง: ${headers.join(' | ')}`);
        play.note(`แถวเทียบ API: ${checks.map(([label, api, screen, ok]) => `${label} ${ok ? '✓' : '✗'} (API "${api}" · จอ "${screen}")`).join(' · ')} · สิทธิ: จอ "${cell(/สิทธิ/)}" · API ${coverageApi || '(ไม่มี field สิทธิในรายการ)'}`);
        expect(checks.filter((c) => !c[3]).map((c) => `${c[0]}: จอ "${c[2]}" (API "${c[1]}")`), 'แถวในหน้า รับ Refer เข้า ต้องตรงกับข้อมูลต้นทาง').toEqual([]);
        expect(cell(/สิทธิ/), 'คอลัมน์สิทธิต้องมีค่า').not.toBe('');
      });
      // TOR14_ONLY=list = รันเฉพาะ [292–293] ดูรายการ (อ่านอย่างเดียว — ไม่เปิดรายละเอียด / ไม่รับ Refer) · ผู้ใช้สั่ง 9 พ.ย. 2026 หลังแก้คอลัมน์ "ผู้ป่วย"
      if (process.env.TOR14_ONLY === 'list') return;

      await play.step('[294–295] ดูรายละเอียดการส่งต่อ — หน้าต่าง "รายละเอียดการส่งต่อ": ผู้ป่วย · การส่งต่อ · ข้อมูลคลินิก · V/S ต้นทาง · แพ้ยาต้นทาง · "เปิดเอกสารใบส่งตัว" ได้', async () => {
        await row.getByRole('button', { name: 'ดูรายละเอียด' }).click();
        const dialog = referDetailDialog(page);
        await expect(dialog).toBeVisible({ timeout: 45_000 });
        for (const title of ['ข้อมูลผู้ป่วย', ...REFER_SECTIONS]) await expect(referSection(dialog, title), `ต้องมีส่วน ${title}`).toBeVisible({ timeout: 45_000 });
        const shown = await readReferSections(dialog);
        await test.info().attach('รายละเอียดการส่งต่อ (หน้าจอ)', { body: JSON.stringify(shown, null, 2), contentType: 'application/json' });
        const detail = await fetchReferDetail(page, authorization(), refer.referId);
        await test.info().attach(`GET /cortex-api/moph/refer-in/${refer.referId}`, { body: JSON.stringify(detail, null, 2), contentType: 'application/json' });
        const mismatch: string[] = [];
        for (const [section, fields] of Object.entries(expectedReferFields(detail))) {
          for (const [label, value] of Object.entries(fields)) {
            const screen = shown[section]?.[label];
            if (screen === undefined) mismatch.push(`${section} / ${label}: ไม่มีช่องบนจอ`);
            else if (clean(screen) !== clean(value) && !clean(screen).includes(clean(value))) mismatch.push(`${section} / ${label}: จอ "${screen}" · API "${value}"`);
          }
        }
        play.note(`ข้อมูลผู้ป่วยบนจอ: ${Object.entries(shown['ข้อมูลผู้ป่วย'] ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}`);
        play.note(`แพ้ยาจาก รพ. ต้นทาง: ${Object.values(shown['ประวัติแพ้ยาจาก รพ. ต้นทาง'] ?? {}).join(' · ') || '-'} · API allergies ${detail.allergies?.length ?? 0} รายการ`);
        play.note(`เทียบหน้าต่างรายละเอียดกับ API: ${mismatch.length ? mismatch.join(' ‖ ') : 'ตรงทุกช่องที่แสดงค่าตรงตัว'}`);
        expect(shown['ข้อมูลการส่งต่อ']?.['เลขที่ใบส่งตัว'], 'หน้าต่างต้องเป็นของ Refer ที่เลือก').toBe(refer.referOutNo);
        expect(shown['ข้อมูลผู้ป่วย']?.['เลขบัตรประชาชน'], 'เลขบัตรในหน้าต่างต้องตรง').toBe(refer.cid);

        // เปิดเอกสารใบส่งตัว — แท็บใหม่ / ไฟล์ดาวน์โหลด / ลิงก์ (จดตามที่เกิด)
        const docLink = dialog.getByRole('link', { name: /เปิดเอกสารใบส่งตัว/ }).or(dialog.getByRole('button', { name: /เปิดเอกสารใบส่งตัว/ })).first();
        await expect(docLink, 'ต้องมีลิงก์ เปิดเอกสารใบส่งตัว').toBeVisible();
        const href = await docLink.getAttribute('href').catch(() => null);
        const popupP = page.context().waitForEvent('page', { timeout: 20_000 }).catch(() => null);
        const downloadP = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null);
        await docLink.click();
        const [popup, download] = await Promise.all([popupP, downloadP]);
        let opened = '';
        if (popup) {
          await popup.waitForLoadState('load', { timeout: 60_000 }).catch(() => undefined);
          const url = new URL(popup.url());
          opened = `แท็บใหม่ ${url.protocol === 'blob:' || url.protocol === 'data:' ? url.protocol : `${url.origin}${url.pathname}`}`;
          const shot = await popup.screenshot({ timeout: 15_000 }).catch(() => undefined);
          if (shot) await test.info().attach('เอกสารใบส่งตัว (แท็บใหม่)', { body: shot, contentType: 'image/png' });
          await popup.close().catch(() => undefined);
        } else if (download) {
          const file = test.info().outputPath(download.suggestedFilename());
          await download.saveAs(file);
          await test.info().attach(download.suggestedFilename(), { path: file });
          opened = `ดาวน์โหลดไฟล์ ${download.suggestedFilename()}`;
        }
        play.note(`เปิดเอกสารใบส่งตัว: ${opened || '(ไม่มีแท็บใหม่ / ไฟล์ภายใน 20 วินาที)'}${href ? ` · href ${href.startsWith('http') ? new URL(href).pathname : href.slice(0, 40)}` : ''}`);
        expect(opened, 'กด เปิดเอกสารใบส่งตัว แล้วต้องเปิดเอกสารได้').not.toBe('');
        await page.bringToFront();
        // ปิดด้วยปุ่ม Close เท่านั้น — ปุ่ม "ยืนยันผู้ป่วยมาถึงแล้ว" ในหน้าต่างนี้เขียนข้อมูล (ไม่ใช่ขั้นของชีต)
        await dialog.getByRole('button', { name: 'Close' }).click();
        await expect(dialog).toBeHidden();
      });

      await play.step('[297–298] รับผู้ป่วยเข้า ER + เปิด Visit — "รับผู้ป่วยเข้า ER" >> เปิด Visit → ได้ EN · วิธีการมาถึง "รับ Refer" + ชื่อ รพ. ต้นทาง', async () => {
        if (await referDetailDialog(page).isVisible().catch(() => false)) await referDetailDialog(page).getByRole('button', { name: 'Close' }).click();
        await expect(row).toHaveCount(1, { timeout: 30_000 });
        const accepted = await acceptReferToEr(page, row);
        play.note(`ขั้นตอนรับ Refer: ${accepted.flow.join(' → ')}`);
        play.note(`คำสั่งที่เขียนข้อมูลระหว่างรับ: ${accepted.calls.map((c) => c.slice(0, 220)).join(' ‖ ') || '-'}`);
        if (accepted.filled.length || accepted.skipped.length) noteFilled(play, 'ฟอร์มลงทะเบียน (รับ Refer)', accepted.filled, accepted.skipped);
        expect(accepted.visit?.en, 'รับผู้ป่วยเข้า ER แล้วต้องได้ EN').toBeTruthy();
        const visit = accepted.visit!;
        ctx.visit = visit;
        play.patient('รับ Refer เข้า', { ...visit, name: refer.patientName, citizenId: refer.cid });
        console.log(`    เปิด Visit ER จาก Refer: HN ${visit.hn} · ${visit.vn} · ${visit.en}`);

        if (!new URL(page.url()).pathname.startsWith(`/cortex/next/patients/${visit.hn}`)) await page.goto(`/cortex/next/patients/${visit.hn}?en=${visit.en}&vn=${visit.vn}&fromApp=er`);
        if (visit.vn) await expectVisitHeader(page, visit).catch((error) => play.note(`แถบหัวผู้ป่วย: ${firstLine(error)}`));
        const panel = erTriagePanel(page);
        await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'หลังเปิด Visit ต้องอยู่ฟอร์มคัดกรอง').toBeVisible({ timeout: 90_000 });
        const arrival = panel.getByRole('region', { name: 'ER Arrival' });
        const referRadio = arrival.getByRole('radio', { name: /รับ Refer/ });
        const checked = await referRadio.isChecked().catch(() => false);
        const pre = preHospitalInfo(page);
        const preText = clean(`${await pre.locator('textarea').first().inputValue().catch(() => '')} ${await pre.innerText().catch(() => '')}`);
        const hospital = clean(refer.originHospitalName);
        const hospitalShown = preText.includes(hospital) || clean(await page.getByRole('main').innerText()).includes(hospital);
        const moph = await mophReferSection(page).isVisible().catch(() => false);
        play.note(`วิธีการมาถึง: "รับ Refer" ${checked ? 'ถูกเลือก' : 'ไม่ถูกเลือก'} (ER Arrival: ${clean(await arrival.innerText().catch(() => '')).slice(0, 160)}) · ข้อมูลก่อนถึงโรงพยาบาล: "${preText.slice(0, 200)}" · ชื่อ รพ. ต้นทาง "${hospital}" ${hospitalShown ? 'แสดง' : 'ไม่แสดง'} · แถบ MOPH Refer ${moph ? 'มี' : 'ไม่มี'}`);
        play.note('ไม่บันทึกคัดกรองต่อ (ชีตข้อนี้จบที่เปิด Visit) — Visit อยู่ขั้น Triage ใช้กับสเปก SBH-2394 ได้');
        expect(checked, 'วิธีการมาถึงต้องเป็น "รับ Refer"').toBe(true);
        expect(hospitalShown, `ต้องแสดงชื่อ รพ. ต้นทาง "${hospital}"`).toBe(true);
      });

      if (ctx.visit) {
        await play.step('[297–298] หลังรับ — รายการ รับ Refer เข้า สถานะ "รับเรียบร้อย" ผูก Visit ที่เปิด', async () => {
          const { items } = await fetchAllReferIn(page, authorization());
          const after = items.find((i) => i.referId === refer.referId);
          play.note(`API หลังรับ: สถานะ ${after?.status ?? '-'} · linkedVisit ${after?.linkedVisit ? `${after.linkedVisit.hn} / ${after.linkedVisit.vn} / ${after.linkedVisit.en}` : '-'}`);
          await gotoReferInList(page).catch(() => 0);
          const search = page.getByRole('searchbox', { name: 'ค้นหาด้วยเลขบัตรประชาชน' });
          await search.fill(refer.cid);
          await search.press('Enter');
          await expect(row.getByRole('cell', { name: 'รับเรียบร้อย', exact: true }), 'แถวต้องเป็นสถานะ รับเรียบร้อย').toBeVisible({ timeout: 45_000 });
          expect(after?.linkedVisit?.en, 'Refer ต้องผูกกับ EN ที่เปิด').toBe(ctx.visit!.en);
        });
      }
    } finally {
      if (ctx.refer && ctx.visit) {
        const parts = clean(ctx.refer.patientName).split(' ');
        // NewPatient ใช้จดลง created-patients.md (ชื่อ / เลขบัตร) — เพศ / วันเกิดไม่ถูกจด
        const patient: NewPatient = { citizenId: ctx.refer.cid, firstName: parts.slice(0, -1).join(' ') || parts[0], familyName: parts.length > 1 ? parts[parts.length - 1] : '', gender: 'ชาย', birthDate: '-' };
        recordMockPatient('UAT-ER-14 (รับ Refer)', patient, ctx.visit, `รับ Refer ${ctx.refer.referOutNo} (${ctx.refer.referId}) จาก ${ctx.refer.originHospitalName} · เปิด Visit ER · ยังไม่คัดกรอง`);
      }
      play.finish();
    }
  });
});
