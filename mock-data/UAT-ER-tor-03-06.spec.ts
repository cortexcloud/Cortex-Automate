import type { Locator, Page } from '@playwright/test';
import {
  confirmOpenErVisit,
  expectOk,
  expectVisitHeader,
  fetchBoard,
  gotoErDashboard,
  showDashboardCard,
  type ErBoardEncounter,
  type ErVisit,
} from '../helpers/functions/er';
import { createAdmissionWithoutBed, createAdmitRequest } from '../helpers/functions/er-admit';
import { cprButton, cprTimeline, openCprForm, readCprTimeline, saveCprEvent } from '../helpers/functions/er-cpr';
import { chooseDispositionDiagnosis, dispositionTextBoxes, openDisposition, signDisposition, startDisposition } from '../helpers/functions/er-disposition';
import { bangkokToday, erListRow, erListTab, fetchErEncounterState, filterErListByHn, gotoErPatientList, openErListTab, type ErListTabKey } from '../helpers/functions/er-list';
import { physicianNotePanel, waitPhysicianNoteForm } from '../helpers/functions/er-physician-note';
import { trackAuthorization } from '../helpers/functions/er-report';
import { fetchTreatmentTimeline, openTimelineTab, readTimeline } from '../helpers/functions/er-timeline';
import { erTriageLevel, erTriagePanel } from '../helpers/functions/er-triage';
import type { VitalSigns } from '../helpers/functions/er-triage';
import type { NewPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { COVERAGE_UC, SYSTEM, nextUatPatient, recordMockPatient, submitOrders } from './uat-er';
import { careMenu, gotoVisit, guard, loadPatients, nextMutation, options, pick, recordMenu, savePatient, type Played } from './uat-play';
import {
  GCS_COMA,
  GCS_FULL,
  TOR_ORDER_CODES,
  TOR_VITALS_CRITICAL,
  TOR_VITALS_HIGH_MEWS,
  TOR_VITALS_NORMAL,
  TorPlay,
  fillTriageFull,
  noteFilled,
  registerFull,
  registerUnidentifiedFull,
  saveTriageFull,
  selectTriageZone,
  savePhysicianNoteFull,
  type TriageFull,
} from './uat-tor';

// เล่น Scenario UAT ER "ชีตส่งมอบ" (SharePoint "New file Test case OPD #2.xlsx" ชีต Scenario- ER ส่งมอบ — สกิล cortex-er-tor-uat)
// ข้อ UAT-ER-03 ถึง 06 · เลข [xx–yy] ในชื่อขั้น = แถวของชีต · ผู้ใช้สั่ง 8 พ.ย. 2026: รันบน SBH Prod · กรอกข้อมูลคนไข้ทุกส่วนให้ครบที่สุด
//
//   @UAT-ER-03   แถว 90–112  ผู้ป่วยระบุตัวตนไม่ได้ หมดสติ → คัดกรอง ESI 1 (GCS E1V1M1) → CPR เริ่ม / หยุด → Doctor Progress Note → Disposition Admission + ลงนาม
//                ⛔ แถว 114–121 (เชื่อมโยง / Merge HN · ปิด Visit ที่การเงิน) ผู้ใช้ตัดออกจากรอบนี้ — ไม่ได้เขียนขั้นเหล่านี้
//   @UAT-ER-04   แถว 122–139 ผู้ป่วยใหม่ครบข้อมูล (เตรียมเอง: คัดกรอง + Physician Note + Order LAB / IMG รอผล ตาม Mock-Data ข้อ 4)
//                → Disposition Admission + ลงนาม → Admit Request → แท็บ ผู้ป่วยรอเตียง → สร้าง AN ไม่เลือกเตียง (R30 / R97) → Treatment Timeline → สถานะ Lab / IMG
//   @UAT-ER-05-1 แถว 147–151 ESI 5 → โซน Isolation 1 (ชีตเขียน "โซนเขียว") → ส่งต่อ OPD
//   @UAT-ER-05-2 แถว 152–164 คัดกรองแรก MEWS สูง ESI 2 → แจ้งเตือน MEWS → รับทราบ (ไม่พิมพ์ / พิมพ์ข้อความ) → คัดกรองซ้ำ ESI 1 → ประวัติการคัดกรอง → ลำดับบน Dashboard
//   @UAT-ER-05-3 แถว 165–174 Suspect Fast Track Sepsis + Trauma → การ์ดบน Dashboard → Section รับทราบใน ER Physician Note → รับทราบ (ไม่กด Reject)
//                (ทั้ง 3 กรณีมี tag @UAT-ER-05 ด้วย — แต่ละกรณีใช้ผู้ป่วยของตัวเอง)
//   @UAT-ER-06   แถว 175–183 Doctor Progress Note 3 รอบ คนละ Perform time → ประวัติ Custom Form
//                ใช้ผู้ป่วยของกรณี 5.2 (.cache/uat-play-<ระบบ>/patients.json คีย์ tor05-2) → **รัน @UAT-ER-05-2 ก่อน** · ไม่มีคีย์นี้ = สร้างผู้ป่วยใหม่ + คัดกรองเอง
//
// รัน (SBH Prod — ผู้ใช้รันเอง เปิดจอ ทีละเทส R31):
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-03-06 --headed --grep "@UAT-ER-03"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-03-06 --headed --grep "@UAT-ER-04"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-03-06 --headed --grep "@UAT-ER-05-1"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-03-06 --headed --grep "@UAT-ER-05-2"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-03-06 --headed --grep "@UAT-ER-05-3"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-03-06 --headed --grep "@UAT-ER-06"
//
// ขั้นที่คาดว่าไม่ผ่านตาม "ER Issue ส่งมอบ": #4 บันทึกโรคประจำตัว 400 · #7 Triage View · #8 ไม่มีชื่อผู้บันทึกคัดกรอง · #12 CPR ฟอร์มเก่า · #14 พิมพ์ใบสรุป · #15 บันทึกแบบร่าง Disposition
// ขั้นเป็นแบบ soft (TorPlay): พังแล้วจดไว้ เล่นขั้นถัดไปต่อ · ขั้นที่ขั้นหลังต้องใช้ผล (เช่น ไม่ได้ Visit) พัง = จบเทสพร้อมผลที่มี

const TEST_TIMEOUT = 30 * 60_000;
/** คลินิกปลายทางของกรณี 5.1 — SBH Prod "ห้องตรวจโรคอายุรกรรมทั่วไป" (R34) · dev-x ใช้ตัวแรกที่มีคำว่า อายุรกรรม */
const REFER_CLINIC = SYSTEM === 'dev-x' ? 'อายุรกรรม' : 'ห้องตรวจโรคอายุรกรรมทั่วไป';
/** รหัสโซน (ชื่อโซนบน Prod เปลี่ยน 5 พ.ย. 2026: ER_RED_ZONE = Resuscitation · ER_GREEN_ZONE = Isolation 1) */
const ZONE = { red: 'ER_RED_ZONE', green: 'ER_GREEN_ZONE' } as const;
/** วิธีจำหน่ายแบบ Admission บน SBH Prod / dev-x */
const ADMISSION_METHOD = 'รับไว้รักษาต่อIPD';
/** สัญญาณชีพผู้ป่วยสงสัยติดเชื้อในกระแสเลือด (กรณี 5.3) */
const VITALS_SEPSIS: VitalSigns = { systolic: '96', diastolic: '58', pr: '118', rr: '24', temp: '38.9', spo2: '95', painScore: '5' };
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i;
const DATE_TIME = /\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}[,\s]+\d{1,2}:\d{2}/;

const norm = (text: string) => text.replace(/\s+/g, ' ').trim();
const hhmm = (d: Date) => d.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

function banner(scenario: string, what: string) {
  console.log(`\n===== ${scenario} (${SYSTEM}) — ${what} · เริ่ม ${hhmm(new Date())} =====`);
}

function played(visit: ErVisit, patient: NewPatient): Played {
  return { ...visit, name: `${patient.firstName} ${patient.familyName}`, citizenId: patient.citizenId };
}

// ---------- ฟังก์ชันในสเปกนี้ ----------

/** หลังเปิด Visit: อยู่หน้าผู้ป่วยของ Visit นี้ และฟอร์มคัดกรองรุ่นใหม่ (clinical form) โหลดเสร็จ — `expectTriageFormOpen` เดิมรอแท็บ Triage ที่ฟอร์มรุ่นใหม่ไม่มีแล้ว */
/**
 * [136–137] Treatment Timeline ของ Visit ER
 * SBH Prod 8 พ.ย. 2026 19:07: ผู้ป่วยได้ AN แล้ว หน้า "ประวัติการรักษา" เปิดรายการ AN (IPD Summary) เป็นค่าเริ่มต้น → ไม่มีแท็บ Timeline ของ ER
 * → เลือกแถว Encounter ER (EN) ในรายการฝั่งซ้ายก่อนกดแท็บ Timeline
 */
async function timelineStep(play: TorPlay, page: Page, authorization: () => string, visit: ErVisit) {
  await play.step('[136–137] Treatment Timeline (ประวัติการรักษา → Timeline) — กิจกรรมครบ เปิด Visit → Disposition เรียงตามเวลา + ชื่อผู้บันทึก', async () => {
    await gotoVisit(page, visit);
    await recordMenu(page, 'ประวัติการรักษา');
    const erItem = page.getByRole('main').locator('button[class*="_medication-history-item-clickable_"]').filter({ visible: true }).filter({ hasText: visit.en }).first();
    await expect(erItem, `รายการประวัติต้องมี Encounter ER ${visit.en}`).toBeVisible({ timeout: 90_000 });
    // เมนูซ้ายกางค้างทับรายการ (8 พ.ย. 19:10 — คลิกไม่ได้ "not stable") → ย้ายเมาส์ออกให้หุบ · ยังทับอยู่ให้สั่ง click ที่ปุ่มของแถวโดยตรง
    await page.mouse.move(1200, 700);
    await page.waitForTimeout(1_500);
    await erItem.click({ timeout: 5_000 }).catch(() => erItem.evaluate((el) => (el as HTMLElement).click()));
    await page.mouse.move(1200, 700);
    await expect(page.getByRole('main').getByRole('tab', { name: 'Timeline', exact: true }), 'เลือก Encounter ER แล้วต้องมีแท็บ Timeline').toBeVisible({ timeout: 30_000 });
    await openTimelineTab(page);
    const rows = await readTimeline(page);
    console.log(`    Timeline (${rows.length} แถว): ${rows.map((r) => `${r.date} ${r.time} ${r.label}${r.esi ? ` [${r.esi}]` : ''} · ${r.actor || '-'}`).join(' ‖ ')}`);
    play.note(`Timeline ${rows.length} แถว: ${rows.map((r) => `${r.time} ${r.label} (${r.actor || 'ไม่มีชื่อ'})`).join(' → ').slice(0, 900)}`);
    const labels = rows.map((r) => r.label).join(' | ');
    const missing = (
      [
        ['เปิด Visit', /เปิด|มาถึง|ลงทะเบียน|Visit/i],
        ['คัดกรองครั้งแรก', /คัดกรองครั้งแรก/],
        ['แพทย์ (เริ่มรักษา / ตรวจเสร็จ)', /แพทย์/],
        ['ส่ง Order', /Order|สั่ง/i],
        ['Disposition / จำหน่าย', /จำหน่าย|Disposition/i],
      ] as [string, RegExp][]
    ).filter(([, re]) => !re.test(labels)).map(([name]) => name);
    const noActor = rows.filter((r) => !r.actor).map((r) => r.label);
    if (noActor.length) play.note(`แถวที่ไม่มีชื่อผู้บันทึก: ${noActor.join(', ')}`);
    const events = await fetchTreatmentTimeline(page, authorization(), visit);
    const order = direction(events.map((e) => e.occurredAt));
    play.note(`API Timeline ${events.length} event · ลำดับ ${order}`);
    expect(missing, 'Timeline ต้องมีกิจกรรมครบ').toEqual([]);
    expect(rows.filter((r) => UUID.test(r.actor)).map((r) => r.label), 'ชื่อผู้บันทึกต้องเป็นชื่อคน ไม่ใช่รหัส').toEqual([]);
    expect(noActor, 'ทุกแถวต้องมีชื่อผู้บันทึก').toEqual([]);
    expect(order, 'event ต้องเรียงตามเวลา').toBe('เก่า → ใหม่');
  });
}

async function expectNewTriageForm(page: Page, visit: ErVisit) {
  // SBH Prod 8 พ.ย. 2026 18:12: เปิด Visit สำเร็จแต่หน้าผู้ป่วยหมุนโหลดเกิน 20 วินาที (expectVisitHeader รอแค่ค่าตั้งต้น) → รอหัวจอโหลดก่อนนานขึ้น
  await expect(page.getByRole('main').getByText(`VN ${visit.vn}`, { exact: true }).filter({ visible: true }).first(), 'หน้าผู้ป่วยต้องโหลดเสร็จหลังเปิด Visit').toBeVisible({ timeout: 120_000 });
  await expectVisitHeader(page, visit);
  await expect(erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรอง ER ต้องเปิดต่อทันทีหลังเปิด Visit').toBeVisible({ timeout: 90_000 });
}

/** ข้อความ MEWS ที่ฟอร์มคัดกรองแสดง (ค่าอยู่ใน web component — getByText ทะลุ shadow DOM ได้) */
async function triageMewsText(page: Page): Promise<string> {
  const texts = (await erTriagePanel(page).getByText(/MEWS/i).allInnerTexts().catch(() => [] as string[])).map(norm).filter(Boolean);
  return [...new Set(texts)].slice(0, 6).join(' | ');
}

/** Encounter บนบอร์ด (API) + โซนปัจจุบัน (id / code / ชื่อ) — รอจนคัดกรองแล้ว */
async function boardState(page: Page, authorization: () => string, en: string): Promise<{ enc: ErBoardEncounter; zoneCode: string; zoneName: string }> {
  let enc: ErBoardEncounter | undefined;
  await expect(async () => {
    enc = (await fetchBoard(page, authorization)).find((e) => e.en === en);
    expect(enc, `บอร์ด ER ต้องมี ${en}`).toBeTruthy();
    expect(enc!.triagedAt, `${en} ต้องคัดกรองแล้ว (triagedAt)`).toBeTruthy();
  }, `อ่านสถานะ ${en} จาก API บอร์ด`).toPass({ timeout: 90_000 });
  const res = await page.request.get('/cortex-api/er/triage/zones', { headers: { authorization: authorization() } });
  await expectOk(res, 'อ่านรายชื่อโซน ER');
  const { boardLocations } = (await res.json()) as { boardLocations: { id: number; code?: string; nameTh?: string; nameEn?: string }[] };
  const zone = boardLocations.find((z) => z.id === enc!.currentLocationId);
  return { enc: enc!, zoneCode: zone?.code ?? '', zoneName: zone?.nameTh || zone?.nameEn || String(enc!.currentLocationId) };
}

/** ข้อความทั้งใบของการ์ดผู้ป่วยบน ER Dashboard (อยู่หน้า Dashboard แล้ว) */
async function boardCardText(page: Page, hn: string): Promise<string> {
  const hnText = await showDashboardCard(page, hn);
  return hnText.evaluate((el) => {
    let card = el as HTMLElement;
    while (card.parentElement && (card.parentElement.innerText.match(/HN: \d+/g) ?? []).length === 1) card = card.parentElement;
    return card.innerText.replace(/\s+/g, ' ').trim();
  });
}

/** ตำแหน่งการ์ดในคอลัมน์ของตัวเองบน ER Dashboard (บน → ล่าง) — คอลัมน์ = การ์ดที่ x ใกล้กัน */
async function boardColumn(page: Page, hn: string): Promise<{ index: number; hns: string[] }> {
  await showDashboardCard(page, hn);
  const cards = await page.getByText(/^HN: \d+$/).evaluateAll((els) =>
    els.map((el) => {
      const box = el.getBoundingClientRect();
      return { hn: (el.textContent ?? '').replace('HN:', '').trim(), x: box.x, y: box.y + window.scrollY };
    }),
  );
  const me = cards.find((c) => c.hn === hn);
  if (!me) throw new Error(`ไม่เจอการ์ด HN ${hn} บน ER Dashboard`);
  const hns = cards.filter((c) => Math.abs(c.x - me.x) < 60).sort((a, b) => a.y - b.y).map((c) => c.hn);
  return { index: hns.indexOf(hn), hns };
}

/**
 * Doctor Progress Note (เมนูขวา "สร้างฟอร์ม") — แบบเดียวกับ `saveProgressNoteFull` ใน uat-tor.ts แต่หาช่อง Perform time **เฉพาะในกล่องของฟอร์ม Progress Note**
 * (ของเดิมหาใน main ทั้งหน้า → หน้า Overview มีฟอร์มคัดกรองฝั่งซ้ายที่มีช่องวันเวลา (Onset ของ Chief Complaint) → อาจไปกรอกช่องของฟอร์มคัดกรองแทน = ร่างคัดกรองของผู้ป่วยเปลี่ยนบน Prod)
 */
async function saveProgressNoteScoped(page: Page, label: string, performAt: Date): Promise<{ performTime: string | false; text: string; stamp: string }> {
  const main = page.getByRole('main');
  const heading = main.getByRole('heading', { name: 'Doctor Progress Note' });
  await careMenu(page, 'สร้างฟอร์ม', main.getByText('เลือกฟอร์ม', { exact: true }).first());
  await pick(main.locator('.ant-select').filter({ hasText: /^(เลือก|Doctor Progress Note)$/ }).last());
  await page.keyboard.type('Doctor Progress');
  await pick(options(page).filter({ hasText: /^Doctor Progress Note$/ }).first());
  await expect(heading).toBeVisible();

  const scope = main.locator('div').filter({ has: page.getByRole('heading', { name: 'Doctor Progress Note' }) }).filter({ has: page.locator('[contenteditable="true"]') }).last();
  const stamp = performAt.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 16); // YYYY-MM-DD HH:mm
  let performTime: string | false = false;
  // SBH Prod 8 พ.ย. 2026 20:50 (สำรวจ _explore-progress-note): ช่อง "Perform time:" เป็น <input type="datetime-local"> อยู่เหนือช่อง S บนแท็บ "สร้างฟอร์ม"
  // แต่ไม่อยู่ใน div เดียวกับ contenteditable (scope ข้างบนหาไม่เจอ) → หา datetime-local ที่มองเห็นในแท็บนี้ (Overview ซ่อนอยู่ ไม่โดนช่องวันที่ของฟอร์มคัดกรอง)
  void scope;
  const perform = main.locator('input[type="datetime-local"]').filter({ visible: true }).first();
  await expect(main.getByText(/Perform time/i).first(), 'ฟอร์ม Doctor Progress Note ต้องมีช่อง Perform time').toBeVisible({ timeout: 10_000 }).catch(() => undefined);
  if (await perform.isVisible().catch(() => false)) {
    const type = await perform.getAttribute('type');
    await perform.fill(type === 'datetime-local' ? stamp.replace(' ', 'T') : stamp).catch(() => undefined);
    if (type !== 'datetime-local') await perform.press('Tab').catch(() => undefined);
    performTime = (await perform.inputValue().catch(() => '')) || false;
  }

  const text = `${label} (${stamp})`;
  const scoped = scope.locator('[contenteditable="true"]');
  const editors = (await scoped.count()) >= 4 ? scoped : main.locator('[contenteditable="true"]');
  await expect(editors.nth(3)).toBeVisible();
  const count = await editors.count();
  const soap = [
    `ผู้ป่วยบอกอาการดีขึ้น ${text}`,
    `BP 120/80 PR 82 RR 18 รู้สึกตัวดี ${text}`,
    `อาการคงที่ ${text}`,
    `ให้การรักษาต่อ สังเกตอาการ 2 ชม. ${text}`,
  ];
  for (const [i, value] of soap.entries()) await editors.nth(count - 4 + i).fill(value);
  const save = main.getByRole('button', { name: 'save บันทึก' }).filter({ visible: true }).last();
  await expect(save, 'กรอก S O A P แล้วปุ่มบันทึกต้องกดได้').toBeEnabled();
  const saved = nextMutation(page, /contribution|composition|\/saves/, 30_000);
  await save.click();
  await expectOk(await saved, `บันทึก Doctor Progress Note ${text}`);
  return { performTime, text, stamp };
}

/** หน้าประวัติการรักษา → แท็บ `name` (แท็บที่ล้นอยู่ในเมนู "…" ก็กดได้) → คืน tabpanel */
async function openRecordTab(page: Page, name: string): Promise<Locator> {
  const main = page.getByRole('main');
  await recordMenu(page, 'ประวัติการรักษา');
  const tab = main.getByRole('tab', { name, exact: true });
  await expect(async () => {
    if (!(await tab.isVisible().catch(() => false))) {
      await main.locator('.ant-tabs-nav-more').first().click({ timeout: 3_000 }).catch(() => undefined);
      const item = page.locator('.ant-tabs-dropdown-menu-item').filter({ hasText: name }).first();
      if (await item.isVisible().catch(() => false)) {
        await item.click();
        return;
      }
    }
    await tab.click({ timeout: 5_000 });
  }, `เปิดแท็บ ${name} ของหน้าประวัติการรักษา`).toPass({ timeout: 60_000 });
  const panel = main.getByRole('tabpanel', { name });
  await expect(panel).toBeVisible({ timeout: 45_000 });
  return panel;
}

/** ข้อความของแท็บ ประวัติ Custom Form (รอให้มีข้อความ `mustHave` ก่อนอ่าน) */
async function customFormHistory(page: Page, mustHave: string): Promise<string> {
  const panel = await openRecordTab(page, 'ประวัติ Custom Form');
  await expect(panel.getByText(mustHave).first(), `ประวัติ Custom Form ต้องมี "${mustHave}"`).toBeVisible({ timeout: 45_000 });
  return norm(await panel.innerText());
}

/** ชื่อผู้บันทึกที่อยู่หลังคำว่า โดย / สร้าง / ผู้บันทึก (คืน '' ถ้าไม่เจอ) */
function recorderName(text: string): string {
  return text.match(/(?:โดย|สร้าง(?:โดย)?|ผู้บันทึก|บันทึกโดย)\s*:?\s*([^\s\d·|:][^·|\n]{2,40}?)(?=\s*(?:·|\||\d{1,2}[/:]|$))/)?.[1]?.trim() ?? '';
}

/**
 * Disposition แบบ Admission (รับไว้รักษาต่อIPD) กรอกครบที่สุด แล้วลงนาม (ไม่กดบันทึกฉบับร่างแยก — Issue #15)
 * สถานะ Improved · วิธีจำหน่าย · การวินิจฉัย (ใช้รหัสที่แนะนำ / K30) · ข้อมูลทางคลินิก · ผลตรวจเพิ่มเติม · คำแนะนำผู้ป่วย · นัดติดตาม (ช่องที่มีบนจอ)
 * คืนผู้ลงนาม / เวลา และว่าเด้งหน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" (ลงนามต่อ) ไหม
 */
async function disposeAdmission(page: Page, visit: ErVisit, text: string): Promise<{ filled: string[]; skipped: string[]; askedAddress: boolean; signedBy: string; signedAt: string }> {
  const main = page.getByRole('main');
  const filled: string[] = [];
  const skipped: string[] = [];
  await gotoVisit(page, visit);
  await careMenu(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }).first());
  await page.waitForTimeout(3_000);
  if (!(await main.getByText('สรุปการจำหน่าย', { exact: true }).first().isVisible())) await openDisposition(page);
  await page.mouse.move(600, 600);
  if (await page.getByTestId('er-disposition-start').isVisible().catch(() => false)) {
    await startDisposition(page);
    filled.push('เริ่มจำหน่าย');
  }
  await main.getByRole('radio', { name: 'Improved', exact: true }).check();
  filled.push('สถานะ Improved');
  await main.getByRole('radio', { name: ADMISSION_METHOD, exact: true }).check();
  filled.push(`วิธีจำหน่าย ${ADMISSION_METHOD}`);
  const suggested = main.getByRole('button', { name: 'ใช้รหัสโรคที่แนะนำ' });
  if (await suggested.isVisible().catch(() => false)) {
    await suggested.click();
    filled.push('การวินิจฉัย: ใช้รหัสโรคที่แนะนำ');
  }
  await chooseDispositionDiagnosis(page, 'K30').then(
    () => filled.push('การวินิจฉัย K30 (ถ้ายังว่าง)'),
    (error: Error) => skipped.push(`การวินิจฉัย (${error.message.split('\n')[0].slice(0, 120)})`),
  );
  const { clinical, finding } = dispositionTextBoxes(page);
  const boxes: [string, Locator, string][] = [
    ['ข้อมูลทางคลินิกและการดำเนินโรค', clinical, `${text} — ผู้ป่วยต้องรับไว้รักษาต่อในโรงพยาบาล`],
    ['ผลการตรวจเพิ่มเติม', finding, `${text} — รอผล Lab / Imaging`],
    ['คำแนะนำผู้ป่วย', main.getByPlaceholder('สรุปอาการผู้ป่วย คำแนะนำ และการติดตามอาการ').or(main.getByPlaceholder('ระบุคำแนะนำผู้ป่วย')).first(), `${text} — แจ้งญาติเรื่องการนอนโรงพยาบาล`],
    ['นัดติดตาม / Follow-up', main.getByPlaceholder(/ระบุแผนการติดตามอาการ/).first(), `${text} — ติดตามที่หอผู้ป่วย`],
  ];
  for (const [name, box, value] of boxes) {
    if (!(await box.isVisible().catch(() => false))) {
      skipped.push(`${name} (ไม่พบช่องบนจอ)`);
      continue;
    }
    if (await box.inputValue().catch(() => '')) {
      filled.push(`${name} (มีค่าเดิม)`);
      continue;
    }
    await box.fill(value);
    filled.push(name);
  }
  const proceed = page.getByRole('button', { name: 'ลงนามต่อ' });
  const asked = guard(proceed.waitFor({ state: 'visible', timeout: 45_000 }).then(() => true, () => false));
  const summary = await signDisposition(page);
  return { filled, skipped, askedAddress: await asked, signedBy: summary.completedBy?.display ?? '', signedAt: summary.completedAt ?? '' };
}

/** แถวของ Encounter ในหน้ารายการ ER — ไล่แท็บตามลำดับที่ให้ จนเจอ → คืนชื่อแท็บ + แถว */
async function findListRow(page: Page, visit: ErVisit, tabs: ErListTabKey[]): Promise<{ tab: ErListTabKey; row: Locator }> {
  await gotoErPatientList(page);
  await filterErListByHn(page, visit.hn);
  let found: ErListTabKey | undefined;
  await expect(async () => {
    for (const key of tabs) {
      await erListTab(page, key).click();
      if (await erListRow(page, visit.en).first().waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) {
        found = key;
        return;
      }
    }
    throw new Error(`ไม่เจอ ${visit.en} ในแท็บ ${tabs.join(' / ')} ของหน้ารายการ ER`);
  }).toPass({ timeout: 90_000 });
  return { tab: found!, row: erListRow(page, visit.en).first() };
}

/** หัวคอลัมน์ของตารางหน้ารายการ ER ที่มองเห็น */
async function listHeaders(page: Page): Promise<string[]> {
  return (await page.getByRole('main').locator('thead').filter({ visible: true }).first().locator('th').allInnerTexts()).map(norm);
}

/** วันเวลาแบบ "DD/MM/YYYY HH:mm:ss" (ฟอร์ม CPR) → คีย์เรียงได้ */
function sortableStamp(time: string): string {
  const m = time.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')} ${m[4].padStart(8, '0')}` : time;
}

/** ลำดับ `keys` เรียงขึ้น / ลง / ไม่เรียง */
function direction(keys: string[]): 'เก่า → ใหม่' | 'ใหม่ → เก่า' | 'ไม่เรียง' {
  if (keys.every((k, i) => i === 0 || keys[i - 1] <= k)) return 'เก่า → ใหม่';
  if (keys.every((k, i) => i === 0 || keys[i - 1] >= k)) return 'ใหม่ → เก่า';
  return 'ไม่เรียง';
}

/** แถวรับทราบ (การรับทราบของแพทย์) ใน ER Physician Note · `kind` = ส่วนท้ายของ data-testid (fast_track / mews) */
function ackRow(page: Page, kind: string): Locator {
  return physicianNotePanel(page).locator(`[data-testid="ack-row-${kind}"]`);
}

/** data-testid ของแถวรับทราบทั้งหมดในหน้า (ไว้จดว่าระบบมีแถวไหนบ้าง) */
async function ackRowIds(page: Page): Promise<string> {
  return (await page.getByRole('main').locator('[data-testid^="ack-row-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid') ?? ''))).join(', ') || '(ไม่มี)';
}

/** response ของคำสั่งรับทราบ (POST clinical-acknowledgements / treatment-start) ตัวถัดไป */
function nextAck(page: Page, timeout = 30_000) {
  return guard(page.waitForResponse((r) => r.request().method() !== 'GET' && /clinical-acknowledgements|treatment-start|acknowledg/i.test(r.url()), { timeout }));
}

/** ลงทะเบียนผู้ป่วยใหม่ครบข้อมูล + เปิด Visit ER (ขั้นของสเปก) → คืนผู้ป่วยที่จดแล้ว */
async function newFullPatient(play: TorPlay, page: Page, authorization: () => string, uatNo: number, title: string, label: string, state: string): Promise<Played | undefined> {
  const fresh = await play.step(`[เตรียม] ชื่อผู้ป่วย Mock ข้อ ${uatNo}`, () => nextUatPatient(page, authorization(), uatNo));
  if (!fresh) return undefined;
  return play.step(title, async () => {
    const reg = await registerFull(page, fresh);
    noteFilled(play, 'ลงทะเบียน', reg.filled, reg.skipped);
    if (!reg.visit) throw new Error(`ลงทะเบียนได้ HN ${reg.hn} แต่ไม่ได้ Visit ER`);
    await expectNewTriageForm(page, reg.visit);
    const p = played(reg.visit, fresh);
    play.patient('เปิดใหม่', p);
    recordMockPatient(label, fresh, reg.visit, state);
    return p;
  });
}

/** คัดกรองครบทุก Section แล้วบันทึก (ขั้นเดียว) → คืนโซนที่เลือก */
async function triageAndSave(play: TorPlay, page: Page, visit: ErVisit, input: TriageFull, what: string): Promise<string> {
  const r = await fillTriageFull(page, input);
  noteFilled(play, what, r.filled, r.skipped);
  await saveTriageFull(page, visit, what);
  return r.zone;
}

// ---------- เทส ----------

test.describe(`เล่น Scenario UAT ER ชีตส่งมอบ ข้อ 03–06 (${SYSTEM})`, () => {
  test('UAT-ER-03 ผู้ป่วยไม่ทราบตัวตน หมดสติ ต้องกู้ชีพ (แถว 90–112)', { tag: ['@UAT-ER-03'] }, async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const play = new TorPlay(page, 'UAT-ER-03');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    banner('UAT-ER-03', 'ผู้ป่วยระบุตัวตนไม่ได้ ESI 1 · CPR · Progress Note · Admission');
    try {
      // TOR03_RESUME=<HN>,<VN>,<EN> = ลองบันทึกคัดกรองซ้ำกับผู้ป่วยเดิม (ผู้ใช้สั่ง 8 พ.ย. 2026 หลังฟอร์มล็อก "ร่างถูกแก้ไขจากที่อื่น") — ไม่สร้างผู้ป่วยใหม่
      const resume = process.env.TOR03_RESUME?.split(',').map((s) => s.trim());
      if (resume?.length === 3) {
        const visit: ErVisit = { hn: resume[0], vn: resume[1], en: resume[2] };
        play.patient('เล่นต่อ (TOR03_RESUME — คัดกรองยังไม่ได้บันทึก)', { ...visit, name: `HN ${visit.hn}` });
        await play.step('[103–104 ลองซ้ำ] เปิดหน้าผู้ป่วยใหม่ → ฟอร์มคัดกรองยังมีข้อมูล → กดบันทึก — ผู้ป่วยขึ้นคอลัมน์ Resuscitation (โซนแดง)', async () => {
          await gotoVisit(page, visit);
          const systolic = erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first();
          await expect(systolic, 'ฟอร์มคัดกรองต้องเปิดอยู่ (ยังไม่ได้บันทึก)').toBeVisible({ timeout: 120_000 });
          const kept = await systolic.inputValue();
          const locked = await page.getByText(/ร่างถูกแก้ไขจากที่อื่น/).first().isVisible().catch(() => false);
          play.note(`เปิดใหม่: ค่า Systolic ในร่าง = "${kept || '(ว่าง)'}" · แถบ "ร่างถูกแก้ไขจากที่อื่น" ${locked ? 'ยังขึ้นอยู่' : 'ไม่ขึ้นแล้ว'}`);
          if (!kept) {
            const r = await fillTriageFull(page, { level: 1, vitals: TOR_VITALS_CRITICAL, gcs: GCS_COMA, arrival: 'EMS', underlying: '', zone: 'suggested' });
            noteFilled(play, 'คัดกรอง (กรอกใหม่ — ร่างหาย)', r.filled, r.skipped);
          } else {
            // SBH Prod 8 พ.ย. 18:46: ร่างเก็บ V/S · GCS · ER Arrival ไว้ แต่ระดับความเร่งด่วน + โซนหาย ("กรุณาระบุ …") → เลือกใหม่
            const levels = erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' });
            await levels.scrollIntoViewIfNeeded();
            await levels.getByText('1', { exact: true }).click();
            await expect(erTriageLevel(page, 1), 'ระดับความเร่งด่วนต้องเป็น 1').toBeChecked();
            const zone = await selectTriageZone(page, 'suggested');
            play.note(`ร่างไม่เก็บระดับ / โซน → เลือกใหม่: ESI 1 · โซน ${zone}`);
          }
          await saveTriageFull(page, visit, 'บันทึกคัดกรอง UAT-ER-03 (ลองซ้ำ)');
          const { enc, zoneCode, zoneName } = await boardState(page, authorization, visit.en);
          play.note(`API บอร์ด: ESI ${enc.triageLevel} · โซน ${zoneName} (${zoneCode}) · MEWS ${enc.clinicalDetails?.mews?.score ?? '-'}`);
          expect(enc.triageLevel, 'ระดับความเร่งด่วนต้องเป็น 1').toBe(1);
          expect(zoneCode, 'โซนต้องเป็น ER_RED_ZONE (Resuscitation — ชีตเขียน "โซนแดง")').toBe(ZONE.red);
        });
        return;
      }
      await gotoErDashboard(page);
      play.note('แถว 114–121 (เชื่อมโยงผู้ป่วย / Merge HN Dummy เข้ากับ HN จริง · ปิด Visit ที่การเงิน) ผู้ใช้ตัดออกจากรอบรันนี้ (8 พ.ย. 2026) — ไม่ได้เล่น (เกี่ยวกับ Issue #5)');
      const fresh = await nextUatPatient(page, authorization(), 3);

      const reg = await play.step('[96–97] ลงทะเบียนผู้ป่วยระบุตัวตนไม่ได้ (ชื่อสมมติ · เพศ · อายุโดยประมาณ · รูปภาพ) — ได้ HN ชั่วคราว + ชื่อสมมติบนหัวจอ', async () => {
        const r = await registerUnidentifiedFull(page, fresh, '40');
        noteFilled(play, 'ลงทะเบียน (ระบุตัวตนไม่ได้)', r.filled, r.skipped);
        play.note('ผู้ป่วยหมดสติ: ไม่กรอกเบอร์ / ที่อยู่ (ไม่ทราบข้อมูล) — กรอกชื่อสมมติ เพศ อายุโดยประมาณ และรูป');
        await expect(r.dialog, 'หน้าต่างเปิด Visit ต้องแสดงชื่อสมมติ').toContainText(fresh.firstName);
        const header = norm(await r.dialog.innerText());
        play.note(`หน้าต่างเปิด Visit: ${header.slice(0, 200)}`);
        if (!/Dummy|ชั่วคราว|ไม่ระบุตัวตน|ระบุตัวตนไม่ได้/.test(header)) play.note(`HN ${r.hn} เป็นเลขปกติ ไม่มีป้ายบอกว่าเป็น HN ชั่วคราว / Dummy`);
        return r;
      });
      const visit = reg
        ? await play.step('[98–99] เปิด Visit ER — ได้ EN และระบบเปิดฟอร์มคัดกรองต่อทันที', async () => {
            const opened = await confirmOpenErVisit(page, reg.dialog, COVERAGE_UC);
            await expectNewTriageForm(page, opened);
            return opened;
          })
        : undefined;
      if (!visit) throw new Error('UAT-ER-03: ไม่ได้ Visit ER (ลงทะเบียน / เปิด Visit ไม่สำเร็จ — ถ้าขึ้น "ไม่พบเวลาที่สามารถลงได้" = ช่วงตรวจของแพทย์วันนี้เต็ม รายงานผู้ใช้)');
      const patient = played(visit, { ...fresh, citizenId: '(ไม่ระบุตัวตน)' });
      play.patient('เปิดใหม่ (ระบุตัวตนไม่ได้)', patient);
      savePatient('tor03', patient);
      recordMockPatient('TOR 03', { ...fresh, citizenId: '(ไม่ระบุตัวตน)' }, visit, 'UAT-ER-03 ชีตส่งมอบ ผู้ป่วยระบุตัวตนไม่ได้ ESI 1 · CPR · Admission');

      const zone = await play.step('[101–102] คัดกรอง ESI 1 พร้อม GCS (E1 V1 M1) + สัญญาณชีพวิกฤต — MEWS คำนวณอัตโนมัติ + ระบบแนะนำโซน Resuscitation (ชีตเขียน "โซนแดง")', async () => {
        const r = await fillTriageFull(page, {
          level: 1,
          vitals: TOR_VITALS_CRITICAL,
          gcs: GCS_COMA,
          arrival: 'EMS',
          transporter: 'หน่วยกู้ภัย (EMS) — UAT',
          illness: 'พบหมดสติข้างถนน ไม่ทราบระยะเวลา ไม่มีญาติมาด้วย ไม่ตอบสนองต่อการเรียก (UAT-ER-03)',
          weight: '60',
          height: '165',
          underlying: '',
        });
        noteFilled(play, 'คัดกรอง', r.filled, r.skipped);
        play.note('Underlying Disease: ไม่กรอก (ผู้ป่วยไม่ทราบตัวตน ไม่ทราบโรคประจำตัว)');
        const mews = await triageMewsText(page);
        play.note(`MEWS บนฟอร์มคัดกรอง: ${mews || '(ไม่พบข้อความ MEWS)'}`);
        expect(mews, 'ฟอร์มคัดกรองต้องแสดง MEWS ที่ระบบคำนวณ').toMatch(/MEWS/i);
        expect(r.zone, 'ESI 1 ระบบต้องแนะนำโซน Resuscitation (= โซนแดง)').toMatch(/Resuscitation/);
        return r.zone;
      });

      await play.step('[103–104] ตรวจโซนและบันทึกคัดกรอง — ผู้ป่วยขึ้นคอลัมน์ Resuscitation (โซนแดง) บน ER Dashboard', async () => {
        await saveTriageFull(page, visit, 'บันทึกคัดกรอง UAT-ER-03');
        const { enc, zoneCode, zoneName } = await boardState(page, authorization, visit.en);
        play.note(`API บอร์ด: ESI ${enc.triageLevel} · โซน ${zoneName} (${zoneCode}) · MEWS ${enc.clinicalDetails?.mews?.score ?? '-'} · โซนที่เลือกในฟอร์ม ${zone ?? '-'}`);
        expect(enc.triageLevel, 'ระดับความเร่งด่วนต้องเป็น 1').toBe(1);
        expect(zoneCode, 'โซนต้องเป็น ER_RED_ZONE (Resuscitation — ชีตเขียน "โซนแดง")').toBe(ZONE.red);
        await gotoErDashboard(page);
        const card = await boardCardText(page, visit.hn);
        play.note(`การ์ดบน Dashboard: ${card.slice(0, 300)}`);
      });

      await play.step('[106–107 ก] CPR Progression: วันเวลา · Rhythm (VF) · กด Start CPR — บันทึกได้ (Issue #12: Prod ยังเป็นฟอร์ม CPR รุ่นเก่า)', async () => {
        await gotoVisit(page, visit);
        const form = await openCprForm(page);
        const time = form.locator('input[type="datetime-local"], input[placeholder*="เวลา"], input[placeholder*="Time" i]').first();
        play.note(`ช่องวันเวลาของ CPR: ${(await time.isVisible().catch(() => false)) ? `มี (ค่าตั้งต้น ${await time.inputValue().catch(() => '-')}) — ใช้เวลาปัจจุบันตามค่าตั้งต้น` : 'ไม่พบช่องให้กรอก (ระบบใช้เวลาที่กดบันทึก)'}`);
        const rhythm = form.getByRole('button', { name: 'VF', exact: true });
        if (await rhythm.isVisible().catch(() => false)) {
          await rhythm.click();
          play.note('Rhythm: VF');
        } else play.note('ไม่พบปุ่ม Rhythm VF');
        const comment = form.getByRole('textbox', { name: /Add CPR comment/ });
        if (await comment.isVisible().catch(() => false)) await comment.fill('เริ่ม CPR ผู้ป่วยหมดสติ VF (UAT-ER-03)');
        const started = await saveCprEvent(page, form, 'Start CPR', 'Start CPR');
        play.note(`Start CPR บันทึกเวลา ${started.time}`);
      });

      await play.step('[106–107 ข] CPR Progression: รอ 1 นาที → Rhythm + กด Stop CPR — บันทึกได้ และย้อนดูรายการเรียงตามเวลา', async () => {
        await page.waitForTimeout(60_000);
        const form = await openCprForm(page);
        for (const name of ['Asystole', 'PEA']) {
          const rhythm = form.getByRole('button', { name, exact: true });
          if (await rhythm.isVisible().catch(() => false)) {
            await rhythm.click();
            play.note(`Rhythm ตอนหยุด: ${name}`);
            break;
          }
        }
        const comment = form.getByRole('textbox', { name: /Add CPR comment/ });
        if (await comment.isVisible().catch(() => false)) await comment.fill('หยุด CPR (UAT-ER-03)');
        await expect(cprButton(form, 'Stop CPR'), 'ต้องมีปุ่ม Stop CPR หลังเริ่ม CPR').toBeVisible();
        const stopped = await saveCprEvent(page, form, 'Stop CPR', 'Stop CPR');
        play.note(`Stop CPR บันทึกเวลา ${stopped.time}`);
        const events = await readCprTimeline(cprTimeline(form));
        play.note(`CPR Timeline: ${events.map((e) => `${e.action} ${e.time}`).join(' → ') || '(ว่าง)'}`);
        expect(events.map((e) => e.action), 'CPR Timeline ต้องมี Start CPR และ Stop CPR').toEqual(expect.arrayContaining(['Start CPR', 'Stop CPR']));
        const order = direction(events.map((e) => sortableStamp(e.time)));
        play.note(`ลำดับรายการ CPR: ${order}`);
        expect(order, 'รายการ CPR ต้องเรียงตามเวลา').not.toBe('ไม่เรียง');
      });

      const progress = await play.step('[108–109] บันทึก Doctor Progress Note (Perform time + S O A P) — บันทึกสำเร็จ', async () => {
        await gotoVisit(page, visit);
        const r = await saveProgressNoteScoped(page, 'หลังกู้ชีพ UAT-ER-03', new Date());
        play.note(`Perform time: ${r.performTime || 'หาช่องไม่เจอ / กรอกไม่ได้ (ใช้ค่าตั้งต้นของฟอร์ม)'}`);
        return r;
      });
      if (progress) {
        await play.step('[108–109] Doctor Progress Note ที่บันทึก แสดงวันเวลา + ชื่อผู้บันทึก (ประวัติ Custom Form)', async () => {
          const text = await customFormHistory(page, progress.text);
          const at = text.indexOf(progress.text);
          const around = text.slice(Math.max(0, at - 250), at + 250);
          play.note(`ประวัติ Custom Form (รอบนี้): ${around}`);
          const name = recorderName(around);
          expect(name, 'ต้องแสดงชื่อผู้บันทึก').not.toBe('');
          expect(name, 'ชื่อผู้บันทึกต้องเป็นชื่อคน ไม่ใช่รหัส').not.toMatch(UUID);
          expect(around, 'ต้องแสดงวันเวลาที่บันทึก').toMatch(DATE_TIME);
        });
      }

      await play.step('[เตรียม] แพทย์บันทึก ER Physician Note ครบ (ไม่อยู่ในชีต — ให้ Disposition มีการวินิจฉัย R21)', async () => {
        await gotoVisit(page, visit);
        const r = await savePhysicianNoteFull(page, { illness: 'หมดสติ ไม่ทราบสาเหตุ ได้รับการกู้ชีพ (CPR) ที่ ER หลังกู้ชีพสัญญาณชีพยังไม่คงที่ (UAT-ER-03)' });
        noteFilled(play, 'ER Physician Note', r.filled, r.skipped);
      });

      await play.step('[111–112] Disposition แบบ Admission (รับไว้รักษาต่อIPD) + ลงนาม — ลงนามได้ · ถ้าขึ้น "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" กด "ลงนามต่อ"', async () => {
        const r = await disposeAdmission(page, visit, 'UAT-ER-03 ผู้ป่วยหมดสติหลังกู้ชีพ');
        noteFilled(play, 'Disposition', r.filled, r.skipped);
        play.note(`ลงนามโดย ${r.signedBy || '-'} เวลา ${r.signedAt || '-'} · หน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่": ${r.askedAddress ? 'ขึ้น → กด ลงนามต่อ' : 'ไม่ขึ้น'}`);
        await expect(main.getByText(/ลงนาม/).first()).toBeVisible();
      });
    } finally {
      play.finish();
    }
  });

  test('UAT-ER-04 ผู้ป่วย ER ต้องนอนโรงพยาบาล รอเตียง (แถว 122–139)', { tag: ['@UAT-ER-04'] }, async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const play = new TorPlay(page, 'UAT-ER-04');
    const authorization = trackAuthorization(page);
    banner('UAT-ER-04', 'Admission → Admit Request → รอเตียง → AN (ไม่เลือกเตียง) → Timeline → Lab / IMG');
    try {
      // TOR04_RESUME=<HN>,<VN>,<EN> = เล่นเฉพาะ Treatment Timeline กับผู้ป่วยเดิม (ได้ AN แล้ว) — ไม่สร้างผู้ป่วยใหม่
      const resume = process.env.TOR04_RESUME?.split(',').map((s) => s.trim());
      if (resume?.length === 3) {
        const visit: ErVisit = { hn: resume[0], vn: resume[1], en: resume[2] };
        play.patient('เล่นต่อ (TOR04_RESUME — Timeline)', { ...visit, name: `HN ${visit.hn}` });
        await timelineStep(play, page, authorization, visit);
        return;
      }
      await gotoErDashboard(page);
      const visit = await newFullPatient(play, page, authorization, 4, '[เตรียม] ลงทะเบียนผู้ป่วยใหม่ครบข้อมูล + เปิด Visit ER สิทธิ UC', 'TOR 04', 'UAT-ER-04 ชีตส่งมอบ Admission รอเตียง · AN ไม่เลือกเตียง');
      if (!visit) throw new Error('UAT-ER-04: ไม่ได้ Visit ER — ถ้าขึ้น "ไม่พบเวลาที่สามารถลงได้" = ช่วงตรวจของแพทย์วันนี้เต็ม รายงานผู้ใช้');

      await play.step('[เตรียม] คัดกรองครบทุก Section ESI 3 แล้วบันทึก', async () => {
        const zone = await triageAndSave(play, page, visit, { level: 3, vitals: TOR_VITALS_NORMAL, gcs: GCS_FULL }, 'คัดกรอง');
        play.note(`โซน: ${zone}`);
      });
      await play.step('[เตรียม] แพทย์บันทึก ER Physician Note ครบ (Diagnosis K30)', async () => {
        const r = await savePhysicianNoteFull(page);
        noteFilled(play, 'ER Physician Note', r.filled, r.skipped);
        if (r.chip) play.note(`Common chief complaints ที่กด: ${r.chip} → แสดงที่ ${r.chipShownIn ?? '-'}`);
      });
      const codes = [TOR_ORDER_CODES.lab, TOR_ORDER_CODES.img[0]];
      await play.step(`[เตรียม] สั่ง Order LAB + IMG (${codes.join(' + ')}) ให้มีผลรอ (Mock-Data ข้อ 4)`, async () => {
        if (TOR_ORDER_CODES.img.length > 1) play.note(`ไม่สั่ง ${TOR_ORDER_CODES.img.slice(1).join(', ')} — IMG0000420 ทำให้ปุ่ม "ส่งคำสั่ง" ค้างบน Prod (เจอ 3 ต.ค. 2026)`);
        await submitOrders(page, codes);
      });

      await play.step('[126–127] Disposition แบบ Admission (รับไว้รักษาต่อIPD) + ลงนาม — ลงนามสำเร็จ', async () => {
        const r = await disposeAdmission(page, visit, 'UAT-ER-04 ต้องนอนโรงพยาบาล');
        noteFilled(play, 'Disposition', r.filled, r.skipped);
        play.note(`ลงนามโดย ${r.signedBy || '-'} เวลา ${r.signedAt || '-'} · หน้าต่างที่อยู่: ${r.askedAddress ? 'ขึ้น (กด ลงนามต่อ)' : 'ไม่ขึ้น'}`);
      });

      const admit = await play.step('[129–130] สร้าง Admit Request ส่งไปศูนย์จัดการเตียง (เมนู "สร้าง Admit Order") — ส่งคำขอสำเร็จ', async () => {
        await gotoVisit(page, visit);
        const r = await createAdmitRequest(page, 'ปวดท้องใต้ลิ้นปี่ อาการไม่ดีขึ้นหลังให้ยา ต้องนอนโรงพยาบาล (UAT-ER-04)');
        play.note(`Admit Request: การวินิจฉัยเบื้องต้น ${r.diagnosis} · หอผู้ป่วย ${r.ward} · จากแผนก ${r.fromDepartment}`);
        play.note('ศูนย์จัดการเตียงเห็นคำขอ: ตรวจจากแท็บ ผู้ป่วยรอเตียง ของ ER (ไม่ได้เปิดหน้าศูนย์จัดการเตียง)');
        return r;
      });

      if (admit) {
        await play.step('[131–132] ผู้ป่วยอยู่แท็บ "ผู้ป่วยรอเตียง" ของหน้ารายการ ER', async () => {
          const { tab, row } = await findListRow(page, visit, ['bed-waiting']);
          await openErListTab(page, tab);
          play.note(`แถวในแท็บผู้ป่วยรอเตียง: ${norm(await row.innerText()).slice(0, 300)}`);
        });
      }

      await play.step('[133–134] สร้าง AN (Convert EN → AN) ที่ "จัดการ Admission" โดยไม่เลือกเตียง (R30 / R97) — ได้เลข AN', async () => {
        await gotoVisit(page, visit);
        const an = await createAdmissionWithoutBed(page);
        play.note(`AN ที่ได้: ${an} (ไม่เลือกเตียง)`);
        const state = await fetchErEncounterState(page, authorization(), visit.en, bangkokToday()).catch(() => undefined);
        if (state) play.note(`สถานะ Encounter หลังได้ AN: ${state.patientStatus} · admitRequest ${state.admitRequestStatus ?? '-'} · AN ${state.an ?? '-'}`);
      });

      await timelineStep(play, page, authorization, visit);

      await play.step('[138–139] ติดตามสถานะ Lab / IMG ในมุมมอง "รายการ" — คอลัมน์ Lab / IMG ขึ้นสถานะรอผลหลังสั่ง', async () => {
        const { tab, row } = await findListRow(page, visit, ['bed-waiting', 'admitted', 'current', 'waiting-for-discharge', 'discharged', 'finished']);
        const headers = await listHeaders(page);
        const cells = (await row.locator('td').allInnerTexts()).map(norm);
        const icons = await row.getByRole('img').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')).filter(Boolean));
        const lab = headers.findIndex((h) => /lab/i.test(h));
        const img = headers.findIndex((h) => /img|imaging|x-?ray|รังสี/i.test(h));
        play.note(`แท็บ ${tab} · หัวคอลัมน์: ${headers.join(' | ')}`);
        play.note(`Lab: ${lab >= 0 ? cells[lab] || '(ว่าง)' : 'ไม่มีคอลัมน์'} · IMG: ${img >= 0 ? cells[img] || '(ว่าง)' : 'ไม่มีคอลัมน์'} · ไอคอนในแถว: ${icons.join(', ') || '-'}`);
        play.note('ผล Lab / IMG ยังไม่ถูกส่งกลับ — ตรวจได้แค่สถานะหลังสั่ง ยังไม่เห็นการเปลี่ยนเมื่อผลออก');
        expect(lab >= 0 || icons.some((i) => /lab/i.test(String(i))), 'ต้องมีคอลัมน์ / ไอคอนสถานะ Lab').toBe(true);
        expect(img >= 0 || icons.some((i) => /img|imaging|x-?ray/i.test(String(i))), 'ต้องมีคอลัมน์ / ไอคอนสถานะ IMG').toBe(true);
      });
    } finally {
      play.finish();
    }
  });

  test('UAT-ER-05 กรณี 5.1 ESI 5 ไม่ฉุกเฉิน ส่งต่อ OPD (แถว 147–151)', { tag: ['@UAT-ER-05', '@UAT-ER-05-1'] }, async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const play = new TorPlay(page, 'UAT-ER-05-1');
    const authorization = trackAuthorization(page);
    banner('UAT-ER-05-1', 'ESI 5 → Isolation 1 → ส่งต่อ OPD');
    try {
      await gotoErDashboard(page);
      const p1 = await newFullPatient(play, page, authorization, 5, '[เตรียม] ลงทะเบียนผู้ป่วยใหม่ครบข้อมูล + เปิด Visit ER (ยังไม่คัดกรอง)', 'TOR 05 (5.1)', 'UAT-ER-05 กรณี 5.1 ESI 5 ส่งต่อ OPD');
      if (!p1) throw new Error('UAT-ER-05-1: ไม่ได้ Visit ER — ถ้าขึ้น "ไม่พบเวลาที่สามารถลงได้" = ช่วงตรวจของแพทย์วันนี้เต็ม รายงานผู้ใช้');

      const zone = await play.step('[148–149] คัดกรองครบทุก Section เลือก ESI 5 — ระบบเสนอโซน Isolation 1 (ชีตเขียน "โซนเขียว")', async () => {
        const r = await fillTriageFull(page, {
          level: 5,
          vitals: { ...TOR_VITALS_NORMAL, painScore: '2' },
          gcs: GCS_FULL,
          illness: 'ไอ มีน้ำมูก เจ็บคอเล็กน้อย 2 วัน ไม่มีไข้ ไม่หอบ (UAT-ER-05 กรณี 5.1)',
        });
        noteFilled(play, 'คัดกรอง', r.filled, r.skipped);
        play.note(`โซนที่ระบบแนะนำ / เลือก: ${r.zone}`);
        expect(r.zone, 'ESI 5 ระบบต้องเสนอโซน Isolation 1 (= โซนเขียว ER_GREEN_ZONE)').toMatch(/Isolation 1/);
        return r.zone;
      });

      await play.step('[150–151] บันทึกคัดกรอง → ส่งต่อผู้ป่วยไป OPD (หน้าต่าง "ส่งต่อไปคลินิก") — ผู้ป่วยอยู่แท็บ "ส่งคลินิกอื่น"', async () => {
        play.note('ชีตแถว 151 ผลที่ควรเห็นเขียนไม่ชัด ("ผู้ป่วยในหน้า ER Dashboard") — ตรวจว่าผู้ป่วยไปอยู่แท็บ "ส่งคลินิกอื่น" พร้อมคลินิกปลายทาง (ควรขึ้นที่คลินิก OPD ปลายทาง — ยังไม่ได้เปิดหน้า OPD ดู)');
        await saveTriageFull(page, p1, 'บันทึกคัดกรอง ESI 5');
        const dialog = page.getByRole('dialog', { name: 'ส่งต่อไปคลินิก' });
        await expect(dialog, 'บันทึก ESI 5 แล้วต้องขึ้นหน้าต่าง "ส่งต่อไปคลินิก"').toBeVisible({ timeout: 45_000 });
        await dialog.getByRole('combobox').first().click();
        await page.keyboard.type(REFER_CLINIC);
        await expect(options(page).first()).toBeVisible();
        const choices = (await options(page).allInnerTexts()).map(norm);
        play.note(`คลินิกปลายทางที่เลือกได้ (พิมพ์ "${REFER_CLINIC}"): ${choices.join(' | ')}`);
        const target = SYSTEM === 'dev-x' ? options(page).filter({ hasText: REFER_CLINIC }).first() : options(page).filter({ hasText: new RegExp(`^${REFER_CLINIC}$`) }).first();
        await expect(target, `ต้องมีคลินิกปลายทาง "${REFER_CLINIC}" (R34)`).toBeVisible();
        const clinic = norm(await target.innerText());
        await pick(target);
        const sent = guard(page.waitForResponse((r) => r.request().method() === 'PATCH' && /\/er\/encounters\/[^/]+\/opd-referral$/.test(new URL(r.url()).pathname), { timeout: 45_000 }));
        await dialog.getByRole('button', { name: 'ส่งต่อ', exact: true }).click();
        await expectOk(await sent, `ส่งต่อไปคลินิก ${clinic}`);
        const { row } = await findListRow(page, p1, ['sent-to-clinic']);
        const text = norm(await row.innerText());
        play.note(`โซนก่อนส่งต่อ: ${zone ?? '-'} · ส่งต่อ → ${clinic} · แถวในแท็บส่งคลินิกอื่น: ${text.slice(0, 300)}`);
        const state = await fetchErEncounterState(page, authorization(), p1.en, bangkokToday()).catch(() => undefined);
        if (state) play.note(`สถานะ Encounter: ${state.patientStatus} (${state.latestStatusCode})`);
      });
    } finally {
      play.finish();
    }
  });

  test('UAT-ER-05 กรณี 5.2 อาการทรุดระหว่างรอตรวจ → แจ้งเตือน MEWS → คัดกรองซ้ำ (แถว 152–164)', { tag: ['@UAT-ER-05', '@UAT-ER-05-2'] }, async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const play = new TorPlay(page, 'UAT-ER-05-2');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    banner('UAT-ER-05-2', 'MEWS สูง ESI 2 → รับทราบ MEWS → คัดกรองซ้ำ ESI 1 (ผู้ป่วยรายนี้ใช้ต่อใน UAT-ER-06)');
    try {
      // TOR052_RESUME=<HN>,<VN>,<EN> = ใช้ผู้ป่วยเดิมที่คัดกรองรอบแรกไม่สำเร็จ (ฟอร์มล็อก "ร่างถูกแก้ไขจากที่อื่น" — 8 พ.ย. 19:21) → เปิดใหม่ เลือก ESI 2 + โซน บันทึก แล้วเล่นต่อ
      const resume = process.env.TOR052_RESUME?.split(',').map((s) => s.trim());
      await gotoErDashboard(page);
      const p2 = resume?.length === 3
        ? ({ hn: resume[0], vn: resume[1], en: resume[2], name: `HN ${resume[0]}` } as Played)
        : await newFullPatient(play, page, authorization, 5, '[เตรียม] ลงทะเบียนผู้ป่วยใหม่ครบข้อมูล + เปิด Visit ER (ยังไม่คัดกรอง)', 'TOR 05 (5.2)', 'UAT-ER-05 กรณี 5.2 คัดกรองซ้ำ · ใช้ต่อ UAT-ER-06');
      if (!p2) throw new Error('UAT-ER-05-2: ไม่ได้ Visit ER — ถ้าขึ้น "ไม่พบเวลาที่สามารถลงได้" = ช่วงตรวจของแพทย์วันนี้เต็ม รายงานผู้ใช้');
      if (resume) play.patient('เล่นต่อ (TOR052_RESUME — คัดกรองรอบแรกยังไม่ได้บันทึก)', p2);
      savePatient('tor05-2', p2);

      const first = await play.step('[153–154] คัดกรองรอบแรก สัญญาณชีพทำให้ MEWS สูง ระดับ ESI 2 — แสดงข้อมูลคัดกรองรอบแรก', async () => {
        if (resume) {
          await gotoVisit(page, p2);
          const systolic = erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first();
          await expect(systolic, 'ฟอร์มคัดกรองต้องเปิดอยู่ (ยังไม่ได้บันทึก)').toBeVisible({ timeout: 120_000 });
          const kept = await systolic.inputValue();
          play.note(`เปิดใหม่: ค่า Systolic ในร่าง = "${kept || '(ว่าง)'}" · แถบ "ร่างถูกแก้ไขจากที่อื่น" ${(await page.getByText(/ร่างถูกแก้ไขจากที่อื่น/).first().isVisible().catch(() => false)) ? 'ยังขึ้นอยู่' : 'ไม่ขึ้นแล้ว'}`);
          if (!kept) {
            const r = await fillTriageFull(page, { level: 2, vitals: TOR_VITALS_HIGH_MEWS, gcs: GCS_FULL, chiefComplaint: false, underlying: '' });
            noteFilled(play, 'คัดกรองรอบแรก (กรอกใหม่ — ร่างหาย)', r.filled, r.skipped);
          } else {
            const levels = erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' });
            await levels.scrollIntoViewIfNeeded();
            await levels.getByText('2', { exact: true }).click();
            await expect(erTriageLevel(page, 2), 'ระดับความเร่งด่วนต้องเป็น 2').toBeChecked();
            play.note(`ร่างไม่เก็บระดับ / โซน → เลือกใหม่: ESI 2 · โซน ${await selectTriageZone(page, 'suggested')}`);
          }
          play.note(`MEWS บนฟอร์ม: ${(await triageMewsText(page)) || '-'}`);
          await saveTriageFull(page, p2, 'บันทึกคัดกรองรอบแรก (ลองซ้ำ)');
          const s = await boardState(page, authorization, p2.en);
          play.note(`รอบแรก: ESI ${s.enc.triageLevel} · โซน ${s.zoneName} (${s.zoneCode}) · MEWS ${s.enc.clinicalDetails?.mews?.score ?? '-'}`);
          expect(s.enc.triageLevel, 'ระดับรอบแรกต้องเป็น 2').toBe(2);
          return s;
        }
        const r = await fillTriageFull(page, {
          level: 2,
          vitals: TOR_VITALS_HIGH_MEWS,
          gcs: GCS_FULL,
          illness: 'ไข้สูง หอบเหนื่อย 1 วัน ไอมีเสมหะ (UAT-ER-05 กรณี 5.2)',
        });
        noteFilled(play, 'คัดกรองรอบแรก', r.filled, r.skipped);
        play.note(`MEWS บนฟอร์ม: ${(await triageMewsText(page)) || '-'}`);
        await saveTriageFull(page, p2, 'บันทึกคัดกรองรอบแรก');
        const s = await boardState(page, authorization, p2.en);
        play.note(`รอบแรก: ESI ${s.enc.triageLevel} · โซน ${s.zoneName} (${s.zoneCode}) · MEWS ${s.enc.clinicalDetails?.mews?.score ?? '-'}`);
        expect(s.enc.triageLevel, 'ระดับรอบแรกต้องเป็น 2').toBe(2);
        return s;
      });

      await play.step('[155–156] ดูแจ้งเตือน MEWS ที่หน้า EMR ของผู้ป่วย และหน้า Patient list', async () => {
        await gotoVisit(page, p2);
        const emr = (await main.getByText(/MEWS\s*:?\s*\d+/).allInnerTexts().catch(() => [] as string[])).map(norm).filter(Boolean);
        play.note(`หน้า EMR: ${[...new Set(emr)].slice(0, 5).join(' | ') || '(ไม่พบ MEWS)'}`);
        const { row } = await findListRow(page, p2, ['current']);
        const text = norm(await row.innerText());
        play.note(`แถวใน Patient list: ${text.slice(0, 300)}`);
        expect(emr.length, 'หน้า EMR ต้องแสดงแจ้งเตือน MEWS').toBeGreaterThan(0);
        expect(text, 'Patient list ต้องแสดงแจ้งเตือน MEWS / รอการรับทราบ').toMatch(/MEWS|รอการรับทราบ/);
      });

      // แถวรับทราบ MEWS (ถ้ามี) — SBH-2058 (ฟอร์มแพทย์รุ่นใหม่) AC ระบุว่ามีแถวรับทราบเฉพาะ Fast Track → อาจไม่พบ = จดผล
      const findMewsAck = async (): Promise<Locator> => {
        await gotoVisit(page, p2);
        await waitPhysicianNoteForm(page);
        const byId = main.locator('[data-testid^="ack-row-mews"]').first();
        if (await byId.isVisible().catch(() => false)) return byId;
        const byText = main
          .locator('div')
          .filter({ hasText: /MEWS/ })
          .filter({ has: page.getByRole('button', { name: /^(Acknowledge|รับทราบ)$/ }) })
          .last();
        if (await byText.isVisible().catch(() => false)) return byText;
        throw new Error(`ไม่พบปุ่มรับทราบ (Acknowledge) ของ MEWS ทั้งในหน้าคัดกรองและ ER Physician Note — แถวรับทราบที่มี: ${await ackRowIds(page)}`);
      };
      const ackButton = (row: Locator) => row.getByRole('button', { name: /^(Acknowledge|รับทราบ)$/ }).first();

      const blocked = await play.step('[157–158 ก] รับทราบแจ้งเตือน MEWS โดยไม่พิมพ์ข้อความ — ต้องกดไม่ได้ (สถานะยัง "รอการรับทราบ")', async () => {
        const row = await findMewsAck();
        play.note(`แถวรับทราบ MEWS ก่อนกด: ${norm(await row.innerText()).slice(0, 200)}`);
        const comment = row.locator('textarea').first();
        if (await comment.isVisible().catch(() => false)) await comment.fill('');
        const button = ackButton(row);
        if (await button.isDisabled()) {
          play.note('ไม่พิมพ์ข้อความ: ปุ่มรับทราบกดไม่ได้ (disabled) — ตรงตามชีต');
          return true;
        }
        const posted = nextAck(page, 10_000);
        await button.click();
        const res = await posted.catch(() => undefined);
        if (!res) {
          const message = norm((await row.innerText().catch(() => '')) ?? '');
          play.note(`ไม่พิมพ์ข้อความ: กดแล้วไม่ส่งคำสั่งรับทราบ — ข้อความในแถว: ${message.slice(0, 200)}`);
          return true;
        }
        throw new Error(`กดรับทราบ MEWS ได้โดยไม่พิมพ์ข้อความ (ชีตคาดว่ากดไม่ได้) — ${res.request().method()} ${new URL(res.url()).pathname} → ${res.status()}`);
      });

      await play.step('[157–158 ข] รับทราบแจ้งเตือน MEWS โดยพิมพ์ข้อความ — เป็น "รับทราบแล้ว" พร้อมชื่อผู้กดและเวลา', async () => {
        const row = await findMewsAck();
        if (!blocked && /รับทราบ\s*·|Acknowledged|ถอนการตอบรับ/.test(norm(await row.innerText()))) {
          // ขั้นก่อนหน้ารับทราบไปแล้วโดยไม่มีข้อความ → ถอนการตอบรับก่อน แล้วรับทราบใหม่พร้อมข้อความ
          const undo = row.getByRole('button', { name: /ถอนการตอบรับ/ }).first();
          if (await undo.isVisible().catch(() => false)) {
            const undone = nextAck(page);
            await undo.click();
            await undone.catch(() => undefined);
            play.note('กด ถอนการตอบรับ (ของรอบที่ไม่มีข้อความ) แล้วรับทราบใหม่พร้อมข้อความ');
          }
        }
        const comment = row.locator('textarea').first();
        await expect(comment, 'แถวรับทราบ MEWS ต้องมีช่องพิมพ์ข้อความ').toBeVisible();
        await comment.fill('รับทราบ MEWS สูง ให้ O2 และเฝ้าระวังอาการ (UAT-ER-05 กรณี 5.2)');
        const button = ackButton(row);
        await expect(button, 'พิมพ์ข้อความแล้วปุ่มรับทราบต้องกดได้').toBeEnabled();
        const posted = nextAck(page);
        await button.click();
        await expectOk(await posted, 'รับทราบแจ้งเตือน MEWS');
        await expect(row, 'ต้องแสดงสถานะรับทราบพร้อมวันเวลา').toContainText(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/, { timeout: 20_000 });
        const after = norm(await row.innerText());
        play.note(`หลังรับทราบ: ${after.slice(0, 200)}`);
        expect(after, 'ต้องเป็นสถานะรับทราบแล้ว').toMatch(/รับทราบ|Acknowledged/);
        expect(after.replace(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/g, ''), 'ต้องแสดงชื่อผู้รับทราบ (ไม่ใช่รหัส)').not.toMatch(UUID);
      });

      const before = await play.step('[เตรียม] จดตำแหน่งการ์ดบน ER Dashboard ก่อนคัดกรองซ้ำ', async () => {
        await gotoErDashboard(page);
        const col = await boardColumn(page, p2.hn);
        play.note(`ก่อนคัดกรองซ้ำ: โซน ${first?.zoneName ?? '-'} ลำดับที่ ${col.index + 1}/${col.hns.length} ของคอลัมน์`);
        return col;
      });

      const retriage = await play.step('[159–160] คัดกรองซ้ำ (Re-triage) เลือก ESI 1 แล้วบันทึก — ESI ใหม่ และย้ายโซนตามระดับ', async () => {
        await gotoVisit(page, p2);
        const redo = main.getByRole('button', { name: /คัดกรองซ้ำ$/ }).filter({ visible: true }).first();
        await expect(redo).toBeVisible({ timeout: 60_000 });
        await redo.scrollIntoViewIfNeeded();
        await redo.click();
        await expect(main.getByText('การคัดกรองครั้งใหม่').first(), 'ต้องเปิดฟอร์ม "การคัดกรองครั้งใหม่"').toBeVisible({ timeout: 60_000 });
        // โซน: บังคับเลือก Resuscitation — selectTriageZone('suggested') คงโซนที่กดค้างไว้ (ถ้าฟอร์มคัดกรองซ้ำดึงโซนรอบก่อนมา) ไม่ย้ายตามคำแนะนำ
        const r = await fillTriageFull(page, {
          level: 1,
          vitals: TOR_VITALS_CRITICAL,
          gcs: [2, 2, 4],
          chiefComplaint: false,
          illness: 'อาการทรุดลงระหว่างรอตรวจ ซึมลง หายใจเร็ว ความดันต่ำ (UAT-ER-05 กรณี 5.2 คัดกรองซ้ำ)',
          zone: /Resuscitation/,
        });
        noteFilled(play, 'คัดกรองซ้ำ', r.filled, r.skipped);
        const suggested = norm((await erTriagePanel(page).locator('[class*="er-triage-zone-options"] button').filter({ hasText: 'แนะนำ' }).first().innerText().catch(() => '')) ?? '');
        play.note(`คัดกรองซ้ำ: ระบบแนะนำโซน ${suggested || '(ไม่พบป้าย แนะนำ)'} · เลือก ${r.zone}`);
        await saveTriageFull(page, p2, 'บันทึกคัดกรองซ้ำ');
        const s = await boardState(page, authorization, p2.en);
        play.note(`หลังคัดกรองซ้ำ: ESI ${s.enc.triageLevel} · โซน ${s.zoneName} (${s.zoneCode}) · รอบแรกโซน ${first?.zoneName ?? '-'}`);
        if (first && first.zoneCode === s.zoneCode) play.note('โซนไม่เปลี่ยน — ESI 2 รอบแรกก็อยู่โซนเดียวกับ ESI 1 แล้ว');
        expect(s.enc.triageLevel, 'ระดับหลังคัดกรองซ้ำต้องเป็น 1').toBe(1);
        expect(s.zoneCode, 'ESI 1 ต้องอยู่โซน Resuscitation (ER_RED_ZONE)').toBe(ZONE.red);
        expect(suggested, 'ESI 1 ระบบต้องแนะนำโซน Resuscitation').toMatch(/Resuscitation/);
        return s;
      });

      await play.step('[161–162] ประวัติการคัดกรอง ที่ Overview — ครบทุกรอบ มีเวลา + ชื่อคน (ไม่ใช่รหัส) รอบล่าสุดมีป้าย "ปัจจุบัน" (Issue #8 ชื่อผู้คัดกรอง)', async () => {
        await gotoVisit(page, p2);
        const items = main.locator('[class*="_triage-history-item_"]');
        await expect(items.first(), 'ต้องมีรายการประวัติการคัดกรอง').toBeVisible({ timeout: 60_000 });
        const texts = (await items.allInnerTexts()).map(norm);
        play.note(`ประวัติการคัดกรอง (${texts.length} รายการ): ${texts.join(' ‖ ')}`);
        expect(texts.length, 'ต้องมีครบ 2 รอบ (คัดกรองแรก + คัดกรองซ้ำ)').toBeGreaterThanOrEqual(2);
        expect(texts.filter((t) => t.includes('ปัจจุบัน')), 'ต้องมีรอบเดียวที่เป็น "ปัจจุบัน"').toHaveLength(1);
        const current = texts.findIndex((t) => t.includes('ปัจจุบัน'));
        expect([0, texts.length - 1], 'ป้าย "ปัจจุบัน" ต้องอยู่รอบล่าสุด').toContain(current);
        for (const t of texts) {
          expect(t, 'ทุกรอบต้องมีเวลา').toMatch(/\d{1,2}:\d{2}/);
          expect(t, 'ชื่อผู้คัดกรองต้องไม่ใช่รหัส').not.toMatch(UUID);
        }
        const unnamed = texts.filter((t) => !/โดย\s*\S+/.test(t));
        expect(unnamed, 'ทุกรอบต้องมีชื่อผู้คัดกรอง (ตรง Issue #8 ถ้าไม่มี)').toEqual([]);
      });

      await play.step('[163–164] ตรวจลำดับเร่งด่วนบน ER Dashboard — ลำดับเปลี่ยนตามความรุนแรงใหม่', async () => {
        await gotoErDashboard(page);
        const after = await boardColumn(page, p2.hn);
        const board = await fetchBoard(page, authorization);
        const show = (hn: string) => {
          const e = board.find((b) => b.hn === hn);
          return `HN ${hn} ESI ${e?.triageLevel ?? '-'}${e?.clinicalDetails?.fastTrackStatus && !/not/i.test(e.clinicalDetails.fastTrackStatus) ? ' FT' : ''}`;
        };
        play.note(`ก่อน: ลำดับที่ ${before ? `${before.index + 1}/${before.hns.length}` : '-'} · หลัง: ลำดับที่ ${after.index + 1}/${after.hns.length} (${retriage?.zoneName ?? '-'})`);
        play.note(`คอลัมน์หลังคัดกรองซ้ำ (บน → ล่าง): ${after.hns.map(show).join(' → ')}`);
        const above = after.hns.slice(0, after.index).map((hn) => board.find((b) => b.hn === hn)).filter(Boolean) as ErBoardEncounter[];
        const wrong = above.filter((e) => (e.triageLevel ?? 9) > 1 && !(e.clinicalDetails?.fastTrackStatus && !/not/i.test(e.clinicalDetails.fastTrackStatus))).map((e) => show(e.hn));
        expect(wrong, 'การ์ดที่อยู่เหนือผู้ป่วย ESI 1 ต้องเป็น Fast Track หรือ ESI 1 เท่านั้น (กฎเรียงคิว SBH-1684)').toEqual([]);
        if (before && retriage && first && first.zoneCode === retriage.zoneCode) expect(after.index, 'โซนเดิม — ลำดับต้องขยับขึ้นหรือคงที่').toBeLessThanOrEqual(before.index);
      });
    } finally {
      play.finish();
    }
  });

  test('UAT-ER-05 กรณี 5.3 Suspect Fast Track (Sepsis) + Trauma (แถว 165–174)', { tag: ['@UAT-ER-05', '@UAT-ER-05-3'] }, async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const play = new TorPlay(page, 'UAT-ER-05-3');
    const authorization = trackAuthorization(page);
    banner('UAT-ER-05-3', 'Suspect Fast Track Sepsis + Trauma → Dashboard → รับทราบใน ER Physician Note');
    try {
      await gotoErDashboard(page);
      const p3 = await newFullPatient(play, page, authorization, 5, '[เตรียม] ลงทะเบียนผู้ป่วยใหม่ครบข้อมูล + เปิด Visit ER (ยังไม่คัดกรอง)', 'TOR 05 (5.3)', 'UAT-ER-05 กรณี 5.3 Suspect Fast Track Sepsis + Trauma');
      if (!p3) throw new Error('UAT-ER-05-3: ไม่ได้ Visit ER — ถ้าขึ้น "ไม่พบเวลาที่สามารถลงได้" = ช่วงตรวจของแพทย์วันนี้เต็ม รายงานผู้ใช้');
      savePatient('tor05-3', p3);

      await play.step('[166–168] คัดกรอง Suspect Fast Track: Not Suspect → Sepsis · ประเภทฉุกเฉิน Trauma · GCS ครบ · ESI + โซน แล้วบันทึก — ผู้ป่วยขึ้นโซนบน Dashboard', async () => {
        const r = await fillTriageFull(page, {
          level: 2,
          vitals: VITALS_SEPSIS,
          gcs: GCS_FULL,
          fastTrack: /Sepsis/,
          trauma: true,
          arrival: 'EMS',
          transporter: 'หน่วยกู้ภัย (EMS) — UAT',
          illness: 'รถจักรยานยนต์ล้มเอง แผลถลอกขาขวาติดเชื้อ 3 วัน มีไข้สูง หนาวสั่น (UAT-ER-05 กรณี 5.3)',
        });
        noteFilled(play, 'คัดกรอง', r.filled, r.skipped);
        expect(r.filled.join(' '), 'ต้องเลือก Suspect Fast Track เป็น Sepsis ได้').toMatch(/Suspect Fast Track Type: .*Sepsis/i);
        expect(r.filled.join(' '), 'ต้องเลือกประเภทฉุกเฉิน Trauma ได้').toMatch(/ประเภทฉุกเฉิน: Trauma/);
        await saveTriageFull(page, p3, 'บันทึกคัดกรอง Fast Track');
        const s = await boardState(page, authorization, p3.en);
        play.note(`API บอร์ด: ESI ${s.enc.triageLevel} · โซน ${s.zoneName} (${s.zoneCode}) · fastTrackStatus ${s.enc.clinicalDetails?.fastTrackStatus ?? '-'}`);
      });

      await play.step('[169–170] การ์ดผู้ป่วยบน ER Dashboard — เห็น Suspect Fast Track + Trauma', async () => {
        await gotoErDashboard(page);
        const card = await boardCardText(page, p3.hn);
        play.note(`การ์ด: ${card.slice(0, 400)}`);
        expect(card, 'การ์ดต้องบอกว่าเป็น Suspect Fast Track (Sepsis)').toMatch(/Fast Track|Sepsis/i);
        expect(card, 'การ์ดต้องบอกว่าเป็น Trauma').toMatch(/(^|[^-])Trauma/);
      });

      const row = await play.step('[171–172] ER Physician Note มี Section Suspect Fast Track พร้อมปุ่มรับทราบ (Acknowledge) / ปฏิเสธ (Reject)', async () => {
        await gotoVisit(page, p3);
        await waitPhysicianNoteForm(page);
        const ack = ackRow(page, 'fast_track');
        await expect(ack, `ต้องมีแถวรับทราบ Fast Track (แถวที่มี: ${await ackRowIds(page)})`).toBeVisible({ timeout: 60_000 });
        await ack.scrollIntoViewIfNeeded();
        const text = norm(await ack.innerText());
        play.note(`Section รับทราบ Fast Track: ${text.slice(0, 200)}`);
        await expect(ack.getByRole('button', { name: /รับทราบ|Acknowledge/ }).first(), 'ต้องมีปุ่มรับทราบ (Acknowledge)').toBeVisible();
        await expect(ack.getByRole('button', { name: /ปฏิเสธ|Reject/ }).first(), 'ต้องมีปุ่มปฏิเสธ (Reject)').toBeVisible();
        return ack;
      });

      if (row) {
        await play.step('[173–174] กด รับทราบ (Acknowledge) Suspect Fast Track — มีข้อความยืนยันใน Section (ชื่อแพทย์ + เวลา)', async () => {
          play.note('ไม่กด ปฏิเสธ (Reject) — ชีตบอกว่า Reject = ค่า Fast Track ถูกล้าง · ผู้ใช้ให้ทดสอบ Acknowledge อย่างเดียวเพื่อไม่ให้ข้อมูลคัดกรองหาย');
          const comment = row.locator('textarea').first();
          if (await comment.isVisible().catch(() => false)) await comment.fill('รับทราบ Suspect Sepsis เริ่ม Sepsis bundle (UAT-ER-05 กรณี 5.3)');
          const posted = nextAck(page);
          await row.getByRole('button', { name: /รับทราบ|Acknowledge/ }).first().click();
          await expectOk(await posted, 'รับทราบ Suspect Fast Track');
          await expect(row, 'ต้องแสดงข้อความยืนยันพร้อมวันเวลา').toContainText(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/, { timeout: 20_000 });
          const after = norm(await row.innerText());
          play.note(`หลังรับทราบ: ${after.replace(/\s*ถอนการตอบรับ.*$/, '').slice(0, 200)}`);
          expect(after, 'ต้องแสดงสถานะรับทราบ').toMatch(/รับทราบ|Acknowledged/);
        });
      }

      await play.step('[เตรียม] แพทย์บันทึก ER Physician Note ครบ (ส่วนที่ผ่านในข้อนี้ — กรอกครบตามที่ผู้ใช้สั่ง)', async () => {
        const r = await savePhysicianNoteFull(page, { illness: 'ไข้สูง หนาวสั่น แผลถลอกขาขวาบวมแดง สงสัย Sepsis จากแผลติดเชื้อ (UAT-ER-05 กรณี 5.3)' });
        noteFilled(play, 'ER Physician Note', r.filled, r.skipped);
      });
    } finally {
      play.finish();
    }
  });

  test('UAT-ER-06 แพทย์บันทึกการรักษาต่อเนื่องหลายรอบ (แถว 175–183)', { tag: ['@UAT-ER-06'] }, async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    const play = new TorPlay(page, 'UAT-ER-06');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    banner('UAT-ER-06', 'Doctor Progress Note 3 รอบ คนละเวลา → ประวัติ Custom Form');
    try {
      await gotoErDashboard(page);
      let patient: Played | undefined = loadPatients()['tor05-2'];
      if (patient) {
        play.patient('ผู้ป่วยกรณี 5.2 (tor05-2) — คัดกรองแล้ว อยู่ในโซน', patient);
        const onBoard = (await fetchBoard(page, authorization)).find((e) => e.en === patient!.en);
        if (!onBoard) play.note(`EN ${patient.en} ของ tor05-2 ไม่อยู่บนบอร์ดปัจจุบันแล้ว — ยังเล่นต่อกับ Visit นี้`);
      } else {
        play.note('ไม่มีผู้ป่วย tor05-2 (ยังไม่ได้รัน @UAT-ER-05-2) → สร้างผู้ป่วยใหม่ครบข้อมูล + คัดกรองเอง');
        patient = await newFullPatient(play, page, authorization, 6, '[เตรียม] ลงทะเบียนผู้ป่วยใหม่ครบข้อมูล + เปิด Visit ER', 'TOR 06', 'UAT-ER-06 Progress Note หลายรอบ');
        if (patient) {
          const p = patient;
          const ok = await play.step('[เตรียม] คัดกรองครบทุก Section ESI 3 แล้วบันทึก (ผู้ป่วยอยู่ในโซน)', () => triageAndSave(play, page, p, { level: 3, vitals: TOR_VITALS_NORMAL, gcs: GCS_FULL }, 'คัดกรอง'));
          if (!ok) patient = undefined;
        }
      }
      if (!patient) throw new Error('UAT-ER-06: ไม่มีผู้ป่วยที่คัดกรองแล้ว (สร้าง / คัดกรองไม่สำเร็จ)');
      const visit = patient;

      // Perform time ไม่เรียงตามลำดับที่บันทึก (รอบ 1 = 10 นาทีก่อน · รอบ 2 = 30 นาทีก่อน · รอบ 3 = 20 นาทีก่อน) → ตรวจได้ว่าประวัติเรียงตามเวลา ไม่ใช่ตามลำดับที่กดบันทึก
      const rounds = [
        { round: 1, at: minutesAgo(10) },
        { round: 2, at: minutesAgo(30) },
        { round: 3, at: minutesAgo(20) },
      ];
      const notes: { round: number; text: string; stamp: string; performTime: string | false }[] = [];
      const saveRound = async ({ round, at }: { round: number; at: Date }) => {
        await gotoVisit(page, visit);
        const r = await saveProgressNoteScoped(page, `Progress รอบที่ ${round} UAT-ER-06`, at);
        notes.push({ round, ...r });
        play.note(`รอบที่ ${round}: Perform time ${r.performTime || 'กรอกไม่ได้ (หาช่องไม่เจอ)'} (ตั้งใจ ${r.stamp})`);
      };

      await play.step('[178–179] บันทึก Doctor Progress Note: Perform time + S O A P — บันทึกสำเร็จ', () => saveRound(rounds[0]));
      await play.step('[180–181] บันทึก Progress Note เพิ่มอีก 2 รอบ คนละ Perform time — บันทึกสำเร็จครบทุกรอบ', async () => {
        for (const r of rounds.slice(1)) await saveRound(r);
      });

      await play.step('[178–179 / 182–183] ประวัติ Custom Form — ครบทุกรอบ · S O A P ครบ (P ไม่ขึ้น none) · หัวรายการมีวันเวลา + ชื่อผู้บันทึก (ไม่ใช่รหัส) · เรียงตามเวลา', async () => {
        expect(notes.length, 'ต้องบันทึก Progress Note ได้ครบ 3 รอบก่อนตรวจประวัติ').toBe(3);
        await gotoVisit(page, visit);
        const text = await customFormHistory(page, notes[0].text);
        console.log(`    ประวัติ Custom Form: ${text.slice(0, 1200)}`);
        // รายการประวัติเลื่อนดูทีละส่วน — innerText ของแผงไม่ครบทุกรายการ (8 พ.ย. 20:46 บนจอมีครบ 3 รอบแต่หาไม่เจอ) → นับ element ที่มีข้อความของแต่ละรอบแทน
        const historyPanel = page.getByRole('main').getByRole('tabpanel').filter({ visible: true }).last();
        const missing: string[] = [];
        for (const n of notes) if (!(await historyPanel.getByText(n.text).count()) && !text.includes(n.text)) missing.push(`รอบที่ ${n.round}`);
        expect(missing, 'ประวัติ Custom Form ต้องมี Progress Note ครบทุกรอบ').toEqual([]);
        for (const n of notes) {
          const at = text.indexOf(n.text);
          const around = text.slice(Math.max(0, at - 250), at + 400);
          const name = recorderName(around);
          play.note(`รอบที่ ${n.round}: ผู้บันทึก "${name || '-'}" · ${around.match(DATE_TIME)?.[0] ?? 'ไม่พบวันเวลา'}`);
          expect(name, `รอบที่ ${n.round} ต้องแสดงชื่อผู้บันทึก`).not.toBe('');
          expect(name, `รอบที่ ${n.round} ชื่อผู้บันทึกต้องไม่ใช่รหัส`).not.toMatch(UUID);
          expect(around, `รอบที่ ${n.round} ต้องแสดงวันเวลา`).toMatch(DATE_TIME);
          expect(around, `รอบที่ ${n.round} ต้องมี P (Plan) ที่กรอก`).toContain(`ให้การรักษาต่อ สังเกตอาการ 2 ชม. ${n.text}`);
        }
        expect(text, 'ช่อง P ต้องไม่ขึ้นเป็น none').not.toMatch(/\bP\s*:?\s*none\b/i);
        // ลำดับที่แสดงเทียบกับ Perform time (กรอกไม่ได้ทุกรอบ = เทียบกับลำดับที่บันทึกแทน)
        const shown = [...notes].sort((a, b) => text.indexOf(a.text) - text.indexOf(b.text)).map((n) => n.round);
        const allPerform = notes.every((n) => n.performTime);
        const byTime = [...notes].sort((a, b) => a.stamp.localeCompare(b.stamp)).map((n) => n.round);
        const expectedOrders = allPerform ? [byTime, [...byTime].reverse()] : [[1, 2, 3], [3, 2, 1]];
        play.note(`ลำดับที่แสดง (บน → ล่าง): รอบ ${shown.join(', ')} · ${allPerform ? `ตาม Perform time เก่า → ใหม่ = รอบ ${byTime.join(', ')}` : 'กรอก Perform time ไม่ได้ครบ — เทียบกับลำดับที่บันทึก'}`);
        expect(expectedOrders.map((o) => o.join(',')), 'Progress Note ต้องเรียงตามเวลา').toContain(shown.join(','));
      });

      await play.step('[ตรวจ] หัวรายการ Progress Note บนหน้าผู้ป่วย (ถ้ามีรายการในแผงฟอร์ม) แสดงชื่อ ไม่ใช่รหัส', async () => {
        await gotoVisit(page, visit);
        const header = main.getByText(/สร้าง\s*:|สร้างโดย|บันทึกโดย/).filter({ visible: true });
        const texts = (await header.allInnerTexts().catch(() => [] as string[])).map(norm).slice(0, 5);
        play.note(`ข้อความผู้บันทึกบนหน้าผู้ป่วย: ${texts.join(' | ') || '(ไม่แสดงบนหน้า Overview — ตรวจจากประวัติ Custom Form แล้ว)'}`);
        for (const t of texts) expect(t, 'ชื่อผู้บันทึกต้องไม่ใช่รหัส').not.toMatch(UUID);
      });
    } finally {
      play.finish();
    }
  });
});
