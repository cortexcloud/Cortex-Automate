import type { Locator, Page } from '@playwright/test';
import { confirmOpenErVisit, expectOk, expectVisitHeader, fetchBoard, fetchZones, gotoErDashboard, openErMenu, openVisitDialog, waitForApi, type ErVisit } from '../helpers/functions/er';
import { hideBadge, NO_PRINT_AGENT_TEXT, printBedsideBadge, readBadge, showBadge } from '../helpers/functions/er-badge';
import { erTriageLevel, erTriagePanel } from '../helpers/functions/er-triage';
import { erListRow, erListTab, gotoErPatientList, hnSearchBox, openErListTab } from '../helpers/functions/er-list';
import { esiButton, fetchIncident, fillMemberTriage, memberRow, openCreateIncident, pressReady, readyButton, selectMember, submitAllButton, submitCreateIncident, type MciIncident } from '../helpers/functions/er-mass-casualty';
import { fetchWaitTimeSettings, restoreWaitTimeSettings, type WaitTimeSetting } from '../helpers/functions/er-quality';
import { trackAuthorization } from '../helpers/functions/er-report';
import type { NewPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { COVERAGE_UC, SYSTEM, fetchNurseTasks, nextUatPatient, openErVisitForHn, recordMockPatient, submitOrders, type NurseTask } from './uat-er';
import { boardEncounter, gotoVisit, guard, nextMutation, options, pick, type Played } from './uat-play';
import { GCS_FULL, TOR_ORDER_CODES, TOR_VITALS_HIGH_MEWS, TOR_VITALS_NORMAL, TorPlay, fillTriageFull, noteFilled, registerFull, saveTriageFull, savePhysicianNoteFull, selectTriageZone, snap } from './uat-tor';

// เล่น Scenario UAT ER "ชีตส่งมอบ" (SharePoint "New file Test case OPD #2.xlsx" ชีต Scenario- ER ส่งมอบ — สกิล cortex-er-tor-uat) ข้อ 07–10
//   @UAT-ER-07  อุบัติเหตุหมู่ ผู้ป่วยมาพร้อมกันหลายราย (แถว 184–207): ลงทะเบียนครบ 2 ราย → สร้างเหตุการณ์ (ชื่อ / สถานที่ / อาการสำคัญร่วม / การมาถึง EMS) →
//               ค้น HN เพิ่มเข้าเหตุการณ์ + เปิด Visit UC → CC = อาการสำคัญร่วม → ESI 2 / ESI 4 (ต่างกัน 2 ระดับ) + Trauma + โซนรายคน → พร้อมส่ง →
//               ส่ง Triage ทั้งเหตุการณ์ (ปุ่มกดได้เมื่อทุกรายพร้อม) → ลำดับบน Dashboard ในแต่ละโซน → ป้ายปลายเตียงทุกราย (ชื่อ + EN ตรงรายคน)
//   @UAT-ER-08  ติดตามคิวและเวลารอคอย (แถว 208–225): ลงทะเบียนครบ → [216–217] ตั้งค่าเวลารอตรวจ (ลดเป้าหมายของ ESI ER08_LEVEL) → คัดกรองครบที่ระดับนั้น →
//               [219–220] ข้อมูลบนการ์ด → [221–222] รอจนเกินเป้าหมาย (รอไม่เกิน เป้าหมาย + 2 นาที) ป้ายเป็นสีแดง → คืนค่าเดิม → [224–225] มุมมองรายการ กรองโซน
//               ⛔ แถว 227–230 (เพิ่ม / ปิดโซนบริการ) ผู้ใช้ตัดออก 8 พ.ย. 2026 — ไม่ทำ (จดเป็นข้อสังเกต)
//   @UAT-ER-09  พยาบาลรับเวรและจัดการงาน (แถว 231–244): ลงทะเบียน + คัดกรอง + Physician Note + Order IMG 2 รายการ (Prod งานพยาบาลเกิดจาก Imaging เท่านั้น) →
//               Assign พยาบาล → รายการงานพยาบาล → งานที่ 1 รับงาน → เสร็จสิ้น · งานที่ 2 รับงาน → ยกเลิก (ตรวจสถานะด้วย API + แก้ต่อไม่ได้)
//   @UAT-ER-10  ลงทะเบียนผิดคน แล้วยกเลิก Encounter (แถว 245–253): ลงทะเบียนครบไม่เปิด Visit → เปิด Visit UC (= ผิดคน) → ช่องสถานะขวาบน → ยกเลิก
//               (ตรวจ EN ในหน้าต่างก่อนยืนยัน) → มุมมองรายการ: ไม่อยู่แท็บผู้ป่วยปัจจุบัน · อยู่แท็บ "ยกเลิก"
//
// รัน (SBH Prod — เปิดจอ ทีละเทส R31 · ผู้ใช้สั่งรันเอง):
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-07-10 --headed --grep "@UAT-ER-07"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-07-10 --headed --grep "@UAT-ER-08"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-07-10 --headed --grep "@UAT-ER-09"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-07-10 --headed --grep "@UAT-ER-10"
//
// ตั้งค่าเวลารอตรวจ (UAT-ER-08) — ระบบจริงของ รพ. ต้องคืนค่าเดิมเสมอ:
//   - อ่านค่าเดิมทุกระดับด้วย API ก่อนแก้ (GET /cortex-api/er/triage/wait-time-settings) → แก้ทางหน้าจอเฉพาะ 1 ระดับ
//   - คืนค่าเดิมทุกระดับด้วย API (PATCH {items}) ใน `finally` ทันทีหลังขั้นรอเกินเป้าหมาย + ตรวจซ้ำว่าค่าตรงของเดิม ·
//     `test.afterEach` คืนค่าอีกชั้นถ้ายังค้าง (เทสหมดเวลา / พังก่อนถึง finally)
//   - ระหว่างที่แก้ (~5–10 นาที) ผู้ป่วยจริงระดับนั้นจะขึ้น "เกินเป้าหมาย" เร็วกว่าปกติ → ตั้งต้นใช้ ESI 4 เป้าหมาย 2 นาที
//     เปลี่ยนได้: ER08_LEVEL=<1–5> ER08_TARGET_MIN=<นาที> · ER08_MAX_WAIT_MIN=<นาที> (เพดานเวลารอ ตั้งต้น 15)
// ข้อมูลผู้ป่วย: "UAT ER<nn>-<ลำดับ>" (nextUatPatient) · กรอกทุกช่องที่กรอกได้ (registerFull / fillTriageFull / savePhysicianNoteFull) ช่องที่กรอกไม่ได้จดเป็นข้อสังเกต ·
//   ทุกรายจดลง created-patients.md (recordMockPatient) · ขั้นพังจดไว้แล้วเล่นต่อ (TorPlay — ภาพหน้าจอทุกขั้น)
// ปัญหาที่คาดไว้ (issues-mockdata.md): Issue #4 โรคประจำตัวในฟอร์มคัดกรองบันทึกไม่ได้ · Issue #13 ปุ่มงานพยาบาลหายใน Order Summary ·
//   หน้าต่าง "บันทึกการทำงาน" ของงานพยาบาลปุ่มหมุนค้าง (บั๊กเดิม) · ส่งคำสั่งหมุนเกิน 80 วิแต่สำเร็จ · ตารางแพทย์ ER เต็มเปิด Visit ไม่ได้ (รายงาน ห้ามเลี่ยง)

const SHARED_CC = 'อุบัติเหตุรถชนหมู่ (UAT)';
const LOCATION = 'ถนนพหลโยธิน กม. 100 (UAT)';
const TRANSPORTER = 'มูลนิธิกู้ภัย UAT-ER-07';
const CANCEL_REASON = 'ลงทะเบียนผิดคน UAT-ER-10'; // ≤ 30 ตัวอักษร (SBH-3844 — Prod เกิน 30 ตัวยกเลิกไม่ได้)
const MEMBER_PLAN: { level: 2 | 4; vitals: typeof TOR_VITALS_NORMAL; fallbackZone: string }[] = [
  { level: 2, vitals: TOR_VITALS_HIGH_MEWS, fallbackZone: 'Resuscitation' },
  { level: 4, vitals: TOR_VITALS_NORMAL, fallbackZone: 'Urgency' },
];
const ER08_LEVEL = Number(process.env.ER08_LEVEL ?? 4);
const ER08_TARGET_MIN = Number(process.env.ER08_TARGET_MIN ?? 2);
const ER08_MAX_WAIT_MIN = Number(process.env.ER08_MAX_WAIT_MIN ?? 15);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
/** ชื่อโซนจากข้อความปุ่ม (ตัด "แนะนำ" / "ใช้ 9" ท้ายชื่อ) */
const zoneName = (text: string) => norm(text).replace(/\s*ใช้\s*\d+\s*$/, '').replace(/\s*แนะนำ\s*$/, '').replace(/\s*ใช้\s*\d+\s*$/, '').trim();
const fullName = (p: NewPatient) => `${p.firstName} ${p.familyName}`;
const played = (p: NewPatient, v: Partial<ErVisit> & { hn: string }): Played => ({ hn: v.hn, vn: v.vn ?? '', en: v.en ?? '', name: fullName(p), citizenId: p.citizenId });
const log = (text: string) => console.log(`    ${text}`);
/** รอให้ locator ขึ้นจอภายใน ms → true / false (locator.isVisible() ไม่รอตาม timeout) */
const shown = (target: Locator, ms: number) => target.first().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);

/** ทำ `body` แบบไม่บังคับ: สำเร็จ → `filled` · false = ไม่พบช่อง · error → `skipped` พร้อมสาเหตุ (ไม่โยน error) — สำเนาของ attempt() ใน uat-tor.ts (ไม่ได้ export) */
async function tryFill(filled: string[], skipped: string[], name: string, body: () => Promise<unknown>) {
  try {
    const result = await body();
    if (result === false) skipped.push(`${name} (ไม่พบช่องบนจอ)`);
    else filled.push(typeof result === 'string' ? `${name}: ${result}` : name);
  } catch (error) {
    skipped.push(`${name} (${(error as Error).message.split('\n')[0].slice(0, 160)})`);
  }
}

/** เลือกตัวเลือกของ <select> ที่ข้อความตรง pattern → คืนข้อความ */
async function selectByText(select: Locator, pattern: RegExp): Promise<string> {
  const label = (await select.locator('option').allTextContents()).find((t) => pattern.test(t));
  if (!label) throw new Error(`ไม่มีตัวเลือก ${pattern}`);
  await select.selectOption({ label });
  return label.trim();
}

/** สีแดงของป้าย (ตัวหนังสือ / พื้น / ขอบ ของตัวเองและกล่องแม่ 3 ชั้น) — คืนสีแดงที่พบ */
async function redOf(target: Locator): Promise<{ red?: string; all: string[] }> {
  const colors = await target.evaluate((el) => {
    const found: string[] = [];
    let node: Element | null = el;
    for (let i = 0; i < 4 && node; i++, node = node.parentElement) {
      const style = getComputedStyle(node);
      found.push(style.color, style.backgroundColor, style.borderTopColor);
    }
    return found;
  });
  const red = colors.find((color) => {
    const [r, g, b, alpha] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return r > 200 && r - g > 10 && r - b > 10 && alpha !== 0; // รวมแดงอ่อนของป้ายแจ้งเตือน (พื้น rgb(255, 242, 240))
  });
  return { red, all: [...new Set(colors)] };
}

/** การ์ดผู้ป่วยบน ER Dashboard (อ้างด้วย HN) */
const boardCard = (page: Page, hn: string) => page.getByRole('main').locator('.ant-card').filter({ hasText: `HN: ${hn}` }).first();

/** ข้อความเตือนของหน้าต่างเปิด Visit เมื่อตารางแพทย์ ER เต็ม (รายงานผู้ใช้ — ห้ามเลี่ยง) */
async function noteVisitSlot(play: TorPlay, page: Page) {
  const dialog = openVisitDialog(page);
  if (await dialog.getByText(/ไม่พบเวลาที่สามารถลงได้|\(Full\)/).first().isVisible().catch(() => false)) {
    play.note(`หน้าต่างเปิด Visit ER: ตารางแพทย์เต็ม "${norm(await dialog.innerText()).slice(0, 200)}" — ต้องให้ผู้ใช้ตัดสิน (ไม่แก้ตาราง / ไม่เลี่ยงคลินิก)`);
  }
}

// ---------- กฎเรียงคิวบน Dashboard (การ์ด SBH-1684 · แมปชื่อโซนชุดใหม่ 5 พ.ย. 2026) ----------

type BoardRow = { hn: string; esi: number; mews: number; fastTrack: boolean; wait: number };
type OrderRule = { name: string; value: (c: BoardRow) => number };
const FAST_TRACK_FIRST: OrderRule = { name: 'Fast Track อยู่บนสุด', value: (c) => (c.fastTrack ? 0 : 1) };
const ESI_ASC: OrderRule = { name: 'ESI น้อยไปมาก', value: (c) => (c.fastTrack ? 0 : c.esi || 9) };
const MEWS_DESC: OrderRule = { name: 'ESI เท่ากัน → MEWS สูงไปต่ำ', value: (c) => (c.fastTrack ? 0 : -c.mews) };
const FIFO: OrderRule = { name: 'FIFO (รอนานกว่าอยู่บน)', value: (c) => -c.wait };
/** โซนแดงเดิม = Resuscitation · โซนเหลืองเดิม = Urgency (Isolation ใช้กฎเดียวกัน — ยังไม่ยืนยันกับ BA) · ห้องสังเกตอาการ / Triage = FIFO */
function rulesOf(zone: string): OrderRule[] {
  if (/^Resuscitation$|โซนแดง/.test(zone)) return [FAST_TRACK_FIRST, ESI_ASC, MEWS_DESC, FIFO];
  if (/^(Urgency|Isolation|Zone Isolate)|โซนเหลือง|โซนเขียว/.test(zone)) return [ESI_ASC, MEWS_DESC, FIFO];
  return [FIFO];
}

/** อ่านลำดับการ์ดในแต่ละคอลัมน์ของบอร์ด (อยู่หน้า Dashboard แล้ว) → คอลัมน์ + คู่ที่ผิดกฎ (แยกคู่ที่มีผู้ป่วยของเทส) */
async function dashboardOrder(page: Page, authorization: () => string, ours: string[]) {
  const zoneNames = [...(await fetchZones(page, authorization)).values(), 'Triage', 'คัดกรอง', 'Zone Isolate', 'ED Boarding'];
  const heads = await page
    .getByRole('main')
    .locator('strong')
    .evaluateAll((els, names) => els.filter((el) => names.includes((el.textContent ?? '').trim())).map((el) => ({ name: (el.textContent ?? '').trim(), x: el.getBoundingClientRect().x })), zoneNames);
  const cards = await page.getByText(/^HN: \d+$/).evaluateAll((els) =>
    els.map((el) => {
      const box = el.getBoundingClientRect();
      let card = el as HTMLElement;
      while (card.parentElement && (card.parentElement.innerText.match(/HN: \d+/g) ?? []).length === 1) card = card.parentElement;
      return { hn: (el.textContent ?? '').replace('HN: ', '').trim(), x: box.x, y: box.y, text: card.innerText.replace(/\s+/g, ' ') };
    }),
  );
  const board = new Map((await fetchBoard(page, authorization)).map((e) => [e.hn, e]));
  const sortedHeads = [...heads].sort((a, b) => a.x - b.x);
  const columns: string[] = [];
  const ourProblems: string[] = [];
  const otherProblems: string[] = [];
  for (const head of sortedHeads) {
    const inColumn = cards
      .filter((c) => head === sortedHeads.filter((h) => h.x <= c.x + 40).sort((a, b) => b.x - a.x)[0])
      .sort((a, b) => a.y - b.y)
      .map((c): BoardRow => {
        const e = board.get(c.hn);
        const [, m = '0', s = '0'] = c.text.match(/รอ\s*(\d+):(\d+)/) ?? [];
        return {
          hn: c.hn,
          esi: e?.triagedAt ? Number(String(e.triageLevel ?? '').match(/\d/)?.[0] ?? 0) : 0,
          mews: Number(e?.clinicalDetails?.mews?.score ?? c.text.match(/MEWS\s*(\d+)/)?.[1] ?? 0),
          fastTrack: /suspect|true|yes/i.test(String(e?.clinicalDetails?.fastTrackStatus ?? '')) || /Fast Track/.test(c.text),
          wait: Number(m) * 60 + Number(s),
        };
      });
    const show = (c: BoardRow) => `${c.fastTrack ? 'FT · ' : ''}ESI ${c.esi || '-'} · MEWS ${c.mews} · รอ ${Math.floor(c.wait / 60)} นาที (HN ${c.hn}${ours.includes(c.hn) ? ' ★' : ''})`;
    columns.push(`${head.name}: ${inColumn.map(show).join(' → ') || '(ว่าง)'}`);
    const rules = rulesOf(head.name);
    for (const [i, below] of inColumn.entries()) {
      const above = inColumn[i - 1];
      if (!above) continue;
      const rule = rules.find((r) => r.value(above) !== r.value(below));
      if (rule && rule.value(above) > rule.value(below)) {
        const text = `${head.name} ผิดกฎ "${rule.name}": ${show(above)} อยู่เหนือ ${show(below)}`;
        (ours.includes(above.hn) || ours.includes(below.hn) ? ourProblems : otherProblems).push(text);
      }
    }
  }
  return { columns, ourProblems, otherProblems };
}

// ---------- เหตุการณ์หมู่ (UAT-ER-07) ----------

/** ค้น HN ในหน้าเหตุการณ์ → เลือก → หน้าต่างเปิด Visit ER (ผู้ป่วยยังไม่มี Visit) → สิทธิ UC → ได้ Visit + แถวในรายการ */
async function addMemberByHn(page: Page, hn: string): Promise<ErVisit | undefined> {
  const main = page.getByRole('main');
  const search = main.getByRole('combobox', { name: 'ค้นหาผู้ป่วยด้วย HN หรือชื่อ' });
  await search.fill(hn);
  const option = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: hn }).first();
  await expect(option, `ต้องค้นเจอ HN ${hn}`).toBeVisible({ timeout: 30_000 });
  await option.click();
  const dialog = openVisitDialog(page);
  let visit: ErVisit | undefined;
  // isVisible() ไม่รอตาม timeout → ใช้ waitFor (หน้าต่างขึ้นหลังเลือก HN ราว 1–3 วินาที · 8 พ.ย. 2026)
  if (await dialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false)) visit = await confirmOpenErVisit(page, dialog, COVERAGE_UC);
  await expect(memberRow(page, hn), `HN ${hn} ต้องขึ้นในรายการของเหตุการณ์`).toBeVisible({ timeout: 45_000 });
  return visit;
}

/** ER Arrival ระดับเหตุการณ์ใน dialog สร้างเหตุการณ์ (EMS · ALS · ผู้นำส่ง EMS · ชื่อผู้นำส่ง) — ไม่บังคับ */
async function fillIncidentArrival(page: Page, dialog: Locator): Promise<{ filled: string[]; skipped: string[] }> {
  const filled: string[] = [];
  const skipped: string[] = [];
  const opt = (name: string) => dialog.locator('label').filter({ hasText: new RegExp(`^\\s*${esc(name)}\\s*$`) }).first();
  await tryFill(filled, skipped, 'วิธีการมาถึง EMS', async () => {
    if (!(await opt('EMS').isVisible().catch(() => false))) return false;
    await opt('EMS').click();
    return 'EMS';
  });
  await tryFill(filled, skipped, 'ระดับความเร่งด่วน EMS', async () => {
    if (!(await shown(opt('ALS'), 5_000))) return false;
    await opt('ALS').click();
    return 'ALS';
  });
  await tryFill(filled, skipped, 'ผู้นำส่ง', async () => {
    const escort = dialog.locator('.ant-select').first(); // เลือกวิธีมาถึงแล้วช่องผู้นำส่งจึงกดได้ (SBH-3609)
    if (!(await escort.isVisible().catch(() => false))) return false;
    await escort.click();
    const option = options(page).filter({ hasText: /EMS/ }).first();
    await pick(option);
    return norm(await option.textContent());
  });
  await tryFill(filled, skipped, 'ชื่อผู้นำส่ง', async () => {
    const box = dialog.getByRole('textbox', { name: 'ระบุชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ' });
    if (!(await box.isVisible().catch(() => false)) || !(await box.isEditable())) return false;
    await box.fill(TRANSPORTER);
    return TRANSPORTER;
  });
  return { filled, skipped };
}

/** ช่องที่แสดงอาการสำคัญร่วมในฟอร์มของ member ที่เลือก (ค่าใน textarea / input หรือปุ่ม Chief Complaint ที่ถูกเลือก) */
async function memberChiefComplaint(page: Page): Promise<string | undefined> {
  const main = page.getByRole('main');
  const boxes = main.locator('textarea, input[type="text"]').filter({ visible: true });
  for (let i = 0; i < (await boxes.count()); i++) {
    const value = await boxes.nth(i).inputValue().catch(() => '');
    if (value.includes(SHARED_CC)) return `ช่อง "${(await boxes.nth(i).getAttribute('placeholder')) || (await boxes.nth(i).getAttribute('aria-label')) || `ที่ ${i + 1}`}" = ${norm(value).slice(0, 80)}`;
  }
  const chip = main.getByRole('group', { name: 'Common chief complaints' }).getByRole('button', { name: SHARED_CC, exact: true }).and(page.locator('[aria-pressed="true"]'));
  if (await chip.count()) return 'ปุ่ม Chief Complaint ถูกเลือก';
  return undefined;
}

/**
 * กรอกฟอร์มของ member ที่เลือก (แผงขวา) ให้ครบที่สุด ก่อนเลือก ESI / โซน:
 * Vital signs + Pain score · Present illness · Body metric · GCS · ประเภทฉุกเฉิน Trauma (บังคับของฟอร์ม member) — ช่องไหนไม่มีบนจอจดลง skipped
 */
async function fillMemberExtras(page: Page, plan: (typeof MEMBER_PLAN)[number]): Promise<{ filled: string[]; skipped: string[] }> {
  const main = page.getByRole('main');
  const filled: string[] = [];
  const skipped: string[] = [];
  const v = plan.vitals;
  await tryFill(filled, skipped, 'Vital signs', async () => {
    const systolic = main.getByRole('spinbutton', { name: 'Systolic' }).last();
    if (!(await systolic.isVisible().catch(() => false))) return false;
    for (const [name, value] of [['Systolic', v.systolic], ['Diastolic', v.diastolic], ['PR', v.pr], ['RR', v.rr], ['Temp', v.temp], ['SpO2', v.spo2]] as const) {
      await main.getByRole('spinbutton', { name }).last().fill(value);
    }
    return `${v.systolic}/${v.diastolic} PR ${v.pr} RR ${v.rr} T ${v.temp} SpO2 ${v.spo2}`;
  });
  await tryFill(filled, skipped, 'Pain score', async () => {
    const select = main.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Pain score' }) }).last();
    if (!(await select.isVisible().catch(() => false))) return false;
    await select.selectOption(v.painScore);
    return v.painScore;
  });
  await tryFill(filled, skipped, 'Present illness', async () => {
    const box = main.locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').last();
    if (!(await box.isVisible().catch(() => false))) return false;
    if (await box.inputValue()) return 'มีค่าเดิม';
    const text = 'ผู้ป่วยจากอุบัติเหตุรถชนหมู่ เจ็บหน้าอก แผลถลอกแขนขา (UAT)';
    await box.fill(text);
    return text;
  });
  await tryFill(filled, skipped, 'GCS', async () => {
    const eye = main.getByRole('combobox', { name: 'Eye Opening (E)' }).last();
    if (!(await eye.isVisible().catch(() => false))) return false;
    const [e, vv, m] = GCS_FULL;
    for (const [name, score] of [['Eye Opening (E)', e], ['Verbal Response (V)', vv], ['Motor Response (M)', m]] as const) {
      await selectByText(main.getByRole('combobox', { name }).last(), new RegExp(`^${score} `));
    }
    return `E${e}V${vv}M${m}`;
  });
  await tryFill(filled, skipped, 'ประเภทฉุกเฉิน (Trauma classification)', async () => {
    const group = main.getByRole('radiogroup', { name: 'ประเภทฉุกเฉิน' }).last();
    const option = (await group.isVisible().catch(() => false)) ? group.getByText('Trauma', { exact: true }) : main.locator('label').filter({ hasText: /^\s*Trauma\s*$/ }).last();
    if (!(await option.isVisible().catch(() => false))) return false;
    await option.click();
    return 'Trauma';
  });
  return { filled, skipped };
}

/** โซนที่ระบบแนะนำหลังเลือก ESI ในฟอร์ม member (ปุ่มชื่อ "<โซน> แนะนำ") — ไม่มี = โซนสำรองตามแผน */
async function memberSuggestedZone(page: Page, level: number, fallback: string): Promise<string> {
  const esi = esiButton(page, level);
  if ((await esi.getAttribute('aria-pressed')) !== 'true') await esi.click();
  const suggested = page.getByRole('main').getByRole('button', { name: /\sแนะนำ$/ }).last();
  if (await shown(suggested, 5_000)) return zoneName((await suggested.textContent()) ?? '') || fallback;
  return fallback;
}

// ---------- ตั้งค่าเวลารอตรวจ (UAT-ER-08) ----------

/** ช่องนาทีของระดับ `level` ในหน้าตั้งค่าเวลารอตรวจ — แถวที่มีคำ "ESI n" / "ระดับ n" ก่อน · ไม่เจอ = ช่องตามลำดับระดับ (เมื่อจำนวนช่องเท่าจำนวนระดับ) */
async function waitTimeInput(page: Page, level: number, original: WaitTimeSetting[]): Promise<Locator> {
  const main = page.getByRole('main');
  const inputs = main.getByRole('spinbutton');
  await expect(inputs.first(), 'หน้าตั้งค่าเวลารอตรวจต้องมีช่องนาที').toBeVisible({ timeout: 60_000 });
  // กล่องชั้นในสุดที่มีคำของระดับนี้และมีช่องนาทีช่องเดียว (กล่องนอกที่ครอบหลายระดับมีหลายช่อง)
  const rows = main
    .locator('tr, li, .ant-row, .ant-form-item, .ant-card, [class*="row"], [class*="item"]')
    .filter({ hasText: new RegExp(`(ESI|ระดับ)\\s*${level}(\\D|$)`) })
    .filter({ has: page.getByRole('spinbutton') });
  for (let i = (await rows.count()) - 1; i >= 0; i--) {
    if ((await rows.nth(i).getByRole('spinbutton').count()) === 1) return rows.nth(i).getByRole('spinbutton').first();
  }
  const levels = [...original].map((s) => s.level).sort((a, b) => a - b);
  if ((await inputs.count()) === levels.length) return inputs.nth(levels.indexOf(level));
  throw new Error(`หาช่องนาทีของ ESI ${level} ไม่ได้ (ช่อง ${await inputs.count()} ช่อง · ระดับจาก API ${levels.length} ระดับ) — ต้องสำรวจหน้าจอ`);
}

const showSettings = (items: WaitTimeSetting[]) => items.map((s) => `ESI ${s.level}=${s.limitSeconds === null ? 'ไม่จำกัด' : `${s.limitSeconds / 60} นาที`}`).join(' · ');
/** ค่าที่คืนยังไม่ครบ (กันลืมคืนค่า) — ใช้ใน afterEach */
let pendingRestore: { items: WaitTimeSetting[]; authorization: () => string } | undefined;

test.describe(`เล่น Scenario UAT ER ชีตส่งมอบ ข้อ 07–10 (${SYSTEM})`, () => {
  test.describe.configure({ retries: 0 }); // ห้ามรันซ้ำเอง — แต่ละรอบสร้างผู้ป่วยใหม่บน Prod

  test.afterEach(async ({ page }) => {
    if (!pendingRestore) return;
    const { items, authorization } = pendingRestore;
    try {
      await restoreWaitTimeSettings(page, authorization(), items);
      pendingRestore = undefined;
      console.log(`  ⚠ afterEach คืนค่าเวลารอตรวจเดิมแล้ว: ${showSettings(items)}`);
    } catch (error) {
      console.log(`  ✗✗ คืนค่าเวลารอตรวจเดิมไม่สำเร็จ — ต้องตั้งกลับเองที่ ห้องฉุกเฉิน > ตั้งค่า > ตั้งค่าเวลารอตรวจ: ${showSettings(items)} (${(error as Error).message.slice(0, 200)})`);
      throw error;
    }
  });

  // ================================================================================================
  test('UAT-ER-07 อุบัติเหตุหมู่ ผู้ป่วยมาพร้อมกันหลายราย (แถว 184–207)', { tag: '@UAT-ER-07' }, async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-07');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    console.log(`▶ UAT-ER-07 อุบัติเหตุหมู่ (${SYSTEM}) — ลงทะเบียน 2 ราย → เหตุการณ์ → ส่ง Triage ทั้งเหตุการณ์ → Dashboard → ป้ายปลายเตียง`);
    try {
      await gotoErDashboard(page);
      const stamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', timeStyle: 'short' }).format(new Date());
      const eventName = `UAT ER07 อุบัติเหตุหมู่ ${stamp}`;

      // ผู้ป่วย 2 ราย: ลงทะเบียนครบทุกช่องที่หน้าคัดกรองรายเดียว (ยังไม่เปิด Visit) แล้วค้น HN เพิ่มเข้าเหตุการณ์ = เปิด Visit ในเหตุการณ์
      const people: { fresh: NewPatient; hn: string; visit?: ErVisit; level: 2 | 4; zone: string }[] = [];
      for (const [i, plan] of MEMBER_PLAN.entries()) {
        await play.step(`[194–195] เตรียมผู้ป่วยรายที่ ${i + 1}: ลงทะเบียนครบทุกช่อง (ยังไม่เปิด Visit — เปิดในเหตุการณ์)`, async () => {
          await gotoErDashboard(page);
          const fresh = await nextUatPatient(page, authorization(), 7);
          const reg = await registerFull(page, fresh, { withoutVisit: true });
          noteFilled(play, `ลงทะเบียนรายที่ ${i + 1} (${fullName(fresh)} HN ${reg.hn})`, reg.filled, reg.skipped);
          people.push({ fresh, hn: reg.hn, level: plan.level, zone: plan.fallbackZone });
          log(`รายที่ ${i + 1}: ${fullName(fresh)} HN ${reg.hn}`);
        });
      }
      if (people.length < 2) throw new Error(`UAT-ER-07: ลงทะเบียนได้ ${people.length} ราย (ต้อง 2) — หยุด`);

      let incidentId = '';
      await play.step('[189–193] สร้างเหตุการณ์: แท็บ "ผู้ป่วยหลายคน" → "สร้างเหตุการณ์" ชื่อ / สถานที่ / อาการสำคัญร่วม (+ การมาถึง EMS) → "สร้าง" — เข้าหน้าสร้างผู้ป่วยหลายคน', async () => {
        const { dialog, availability } = await openCreateIncident(page, { name: eventName, location: LOCATION, chiefComplaint: SHARED_CC });
        play.note(`ลงทะเบียนตามจำนวนผู้ป่วย: available=${availability.available} reason=${availability.reason ?? '-'} (ไม่ใช้ — เพิ่มผู้ป่วยด้วย HN)`);
        const arrival = await fillIncidentArrival(page, dialog);
        noteFilled(play, 'การมาถึงระดับเหตุการณ์', arrival.filled, arrival.skipped);
        const created = await submitCreateIncident(page, dialog);
        incidentId = created.id;
        play.note(`เหตุการณ์ "${eventName}" id ${incidentId} (${created.created.displayCode}) · เข้าหน้าเหตุการณ์ใน ${created.navigateMs} ms`);
        await expect(submitAllButton(page)).toBeVisible({ timeout: 30_000 });
      });
      if (!incidentId) throw new Error('UAT-ER-07: สร้างเหตุการณ์ไม่สำเร็จ — หยุด');

      await play.step('[194–195] เพิ่มผู้ป่วยในเหตุการณ์ 2 ราย (ค้น HN → เปิด Visit ER สิทธิ UC) — ทุกรายอยู่ในรายการ เรียงตามลำดับที่เพิ่ม', async () => {
        for (const [i, p] of people.entries()) {
          if (await memberRow(page, p.hn).isVisible().catch(() => false)) continue;
          p.visit = await addMemberByHn(page, p.hn).catch(async (error: Error) => {
            await noteVisitSlot(play, page);
            throw error;
          });
          if (!p.visit) {
            const m = (await fetchIncident(page, authorization, incidentId)).members.find((x) => x.hn === p.hn);
            if (m) p.visit = { hn: m.hn, vn: m.vn, en: m.en };
          }
          play.patient(`เปิดใหม่ (เหตุการณ์หมู่ รายที่ ${i + 1})`, played(p.fresh, p.visit ?? { hn: p.hn }));
          recordMockPatient(`เล่น 07 (${i + 1})`, p.fresh, p.visit ?? { hn: p.hn }, `UAT-ER-07 เหตุการณ์ "${eventName}" (${incidentId}) · ลงทะเบียนครบ · ESI ${p.level}`);
        }
        const rows = await main.getByRole('listitem').filter({ hasText: /HN \d+ ·/ }).allInnerTexts();
        const order = people.map((p) => rows.findIndex((t) => t.includes(`HN ${p.hn} ·`)));
        log(`รายการในเหตุการณ์: ${rows.map((t) => norm(t).slice(0, 90)).join(' | ')}`);
        expect(order.every((n) => n >= 0), 'ผู้ป่วยทุกรายต้องอยู่ในรายการของเหตุการณ์').toBe(true);
        expect(order[0] < order[1], `ต้องเรียงตามลำดับที่เพิ่ม (รายที่ 1 อยู่บน) — ได้ตำแหน่ง ${order.join(', ')}`).toBe(true);
      });

      await play.step('[197–198] ตรวจอาการสำคัญร่วม — Chief Complaint ของผู้ป่วยแต่ละรายตรงกับอาการสำคัญร่วมของเหตุการณ์', async () => {
        const wrong: string[] = [];
        for (const [i, p] of people.entries()) {
          await selectMember(page, p.hn);
          let where: string | undefined;
          await expect.poll(async () => (where = await memberChiefComplaint(page)), { timeout: 30_000, message: `CC ของรายที่ ${i + 1}` }).toBeTruthy().catch(() => undefined);
          play.note(`CC รายที่ ${i + 1} (HN ${p.hn}): ${where ?? `ไม่พบ "${SHARED_CC}" ในฟอร์ม`}`);
          if (!where) wrong.push(`รายที่ ${i + 1}`);
        }
        expect(wrong, `Chief Complaint ต้องเป็น "${SHARED_CC}"`).toEqual([]);
      });

      const submitAllBefore: string[] = [];
      await play.step('[199–200] ระบุ ESI + โซนแยกรายคน (ESI 2 / ESI 4 — ต่างกัน 2 ระดับ · Trauma) กรอกฟอร์มครบ แล้ว "พร้อมส่งและไปคนถัดไป" ทีละคน — แต่ละคนอยู่โซนที่เลือก', async () => {
        for (const [i, p] of people.entries()) {
          const plan = MEMBER_PLAN[i];
          if (await memberRow(page, p.hn).filter({ hasText: 'READY' }).count()) continue; // เล่นซ้ำ: รายที่พร้อมแล้วข้าม
          await selectMember(page, p.hn);
          await expect.poll(() => memberChiefComplaint(page), { timeout: 30_000 }).toBeTruthy().catch(() => undefined); // รอฟอร์ม + ร่างของรายนี้โหลดก่อนกรอก
          let ready = false;
          for (let round = 1; round <= 3 && !ready; round++) {
            const extras = await fillMemberExtras(page, plan);
            if (round === 1) noteFilled(play, `ฟอร์มรายที่ ${i + 1}`, extras.filled, extras.skipped);
            p.zone = await memberSuggestedZone(page, plan.level, plan.fallbackZone);
            await fillMemberTriage(page, plan.level, p.zone);
            // ฟอร์มโหลดร่างตามหลังแล้วล้าง GCS / ESI ได้ → รอแล้วตรวจซ้ำก่อนกดพร้อมส่ง
            await page.waitForTimeout(3_000);
            if ((await esiButton(page, plan.level).getAttribute('aria-pressed')) !== 'true' || !(await readyButton(page).isEnabled())) {
              log(`รายที่ ${i + 1} รอบ ${round}: ร่างล้างค่า ESI — กรอกซ้ำ`);
              continue;
            }
            if (i === 1 && !submitAllBefore.length) {
              submitAllBefore.push(`ก่อนรายที่ 2 พร้อม: ปุ่มส่งทั้งเหตุการณ์ ${(await submitAllButton(page).isEnabled()) ? 'กดได้ (ผิด)' : 'กดไม่ได้'}`);
            }
            const status = await pressReady(page, plan.level, p.zone);
            ready = status < 300 && (await memberRow(page, p.hn).filter({ hasText: 'READY' }).waitFor({ timeout: 20_000 }).then(() => true, () => false));
            log(`พร้อมส่ง รายที่ ${i + 1} (ESI ${plan.level} · ${p.zone}) รอบ ${round}: HTTP ${status} · ${ready ? 'READY' : 'ยังไม่ READY'}`);
          }
          expect(ready, `รายที่ ${i + 1} ต้องเป็น READY หลังกด "พร้อมส่งและไปคนถัดไป"`).toBe(true);
        }
        const incident = await fetchIncident(page, authorization, incidentId);
        for (const [i, p] of people.entries()) {
          const m = incident.members.find((x) => x.hn === p.hn);
          play.note(`รายที่ ${i + 1} HN ${p.hn}: สถานะ ${m?.status} · ESI ${m?.triageLevel} · โซน ${p.zone} (location ${m?.targetLocationId})`);
          expect(m?.triageLevel, `ESI ของรายที่ ${i + 1}`).toBe(MEMBER_PLAN[i].level);
        }
        expect(Math.abs(people[0].level - people[1].level), 'ESI ต้องต่างกันอย่างน้อย 2 ระดับ').toBeGreaterThanOrEqual(2);
      });

      await play.step('[201–202] ส่ง Triage ทั้งเหตุการณ์ — ปุ่มกดได้เมื่อทุกคนพร้อม · ผู้ป่วยทุกรายเข้าโซนที่ระบุ', async () => {
        if (submitAllBefore.length) play.note(submitAllBefore.join(' · '));
        expect(submitAllBefore.join(' '), 'ปุ่ม "ส่ง Triage ทั้งเหตุการณ์" ต้องกดไม่ได้ก่อนทุกรายพร้อม').not.toContain('กดได้ (ผิด)');
        await expect(submitAllButton(page), 'ทุกรายพร้อมแล้ว ปุ่มต้องกดได้').toBeEnabled({ timeout: 30_000 });
        await submitAllButton(page).click();
        const refer = page.getByRole('dialog', { name: 'ส่งต่อไปคลินิก' });
        const confirm = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
        for (let i = 0; i < 3; i++) {
          if (await shown(refer, 3_000)) await refer.getByRole('button', { name: 'ภายหลัง' }).click();
          else if (await shown(confirm, 1_000)) {
            play.note(`หน้าต่างหลังกดส่ง: ${norm(await confirm.innerText()).slice(0, 200)}`);
            await confirm.getByRole('button', { name: /ยืนยัน/ }).last().click();
          }
        }
        let incident: MciIncident | undefined;
        await expect
          .poll(async () => (incident = await fetchIncident(page, authorization, incidentId)).members.filter((m) => m.status === 'COMPLETED').length, { timeout: 90_000, message: 'member ต้อง COMPLETED ครบ' })
          .toBe(people.length);
        const zones = await fetchZones(page, authorization);
        for (const [i, p] of people.entries()) {
          const enc = await boardEncounter(page, authorization(), p.visit?.en ?? '');
          const loc = Number(enc?.currentLocationId ?? 0);
          play.note(`รายที่ ${i + 1} บนบอร์ด: ESI ${String(enc?.triageLevel)} · โซน ${zones.get(loc) ?? loc} · triagedAt ${String(enc?.triagedAt ?? '-')}`);
          expect(String(enc?.triageLevel), `ระดับของรายที่ ${i + 1} บนบอร์ด`).toContain(String(p.level));
          if (zones.has(loc)) expect(zones.get(loc), `โซนของรายที่ ${i + 1}`).toBe(p.zone);
        }
        log(`member หลังส่ง: ${incident?.members.map((m) => `${m.hn} ${m.status}`).join(' · ')}`);
      });

      await play.step('[204–205] ตรวจการเรียงลำดับบน ER Dashboard — เรียงตามความรุนแรงอัตโนมัติในแต่ละโซน', async () => {
        await gotoErDashboard(page);
        for (const p of people) await expect(page.getByText(`HN: ${p.hn}`, { exact: true }), `การ์ด HN ${p.hn} ต้องอยู่บนบอร์ด`).toBeVisible({ timeout: 30_000 });
        const { columns, ourProblems, otherProblems } = await dashboardOrder(page, authorization, people.map((p) => p.hn));
        for (const column of columns) log(column);
        if (otherProblems.length) play.note(`ลำดับที่ไม่ตรงกฎของผู้ป่วยรายอื่น (ไม่ใช่ของเทส — ข้อมูลจริงบนบอร์ด): ${otherProblems.join(' · ')}`);
        await boardCard(page, people[0].hn).evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => undefined);
        expect(ourProblems, 'การ์ดของผู้ป่วยเหตุการณ์ต้องเรียงตามกฎเรียงคิว (SBH-1684) ในโซนของตัวเอง').toEqual([]);
      });

      for (const [i, p] of people.entries()) {
        await play.step(`[206–207] พิมพ์ป้ายปลายเตียง รายที่ ${i + 1} (HN ${p.hn}) — ป้ายมีชื่อ + EN ตรงรายคน`, async () => {
          await hideBadge(page);
          if (!p.visit) throw new Error(`ไม่มี Visit ของ HN ${p.hn}`);
          await gotoVisit(page, p.visit);
          const pdf = await printBedsideBadge(page, p.visit);
          if (await page.getByText(NO_PRINT_AGENT_TEXT).first().isVisible().catch(() => false)) play.note(`รายที่ ${i + 1}: แจ้ง "${NO_PRINT_AGENT_TEXT}" — เครื่องทดสอบไม่มี print agent (R18 ไม่ถือว่า fail · ตรวจจาก PDF)`);
          const { badge } = await showBadge(page, pdf, `ป้ายปลายเตียง รายที่ ${i + 1} · HN ${p.hn} · ${p.visit.en}`);
          const f = readBadge(badge);
          const text = badge.lines.map((l) => l.text).join(' | ');
          play.note(`ป้ายรายที่ ${i + 1}: ชื่อ "${f.name?.text ?? '-'}" · HN ${f.hn?.text ?? '-'} · EN ${f.en?.text ?? '-'} · วันเวลารับเข้า ${f.arrival?.text ?? '-'}`);
          expect(text, 'ป้ายต้องมีชื่อผู้ป่วยรายนี้').toContain(p.fresh.familyName);
          expect(f.en?.text ?? text, 'ป้ายต้องมี EN ของรายนี้').toContain(p.visit.en);
          expect(f.hn?.text ?? text, 'ป้ายต้องมี HN ของรายนี้').toContain(p.hn);
        });
      }
      await hideBadge(page);
    } finally {
      play.finish();
    }
  });

  // ================================================================================================
  test('UAT-ER-08 แพทย์ / พยาบาลติดตามคิวและเวลารอคอย (แถว 208–225)', { tag: '@UAT-ER-08' }, async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-08');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    console.log(`▶ UAT-ER-08 เวลารอคอย (${SYSTEM}) — ตั้งค่า ESI ${ER08_LEVEL} = ${ER08_TARGET_MIN} นาที ชั่วคราว (คืนค่าเดิมใน finally)`);
    play.note('⛔ แถว 227–230 (เพิ่ม / ปิดโซนบริการ ที่ตั้งค่าผู้ดูแลระบบ > สถานที่) ผู้ใช้ตัดออกจากรอบ Prod 8 พ.ย. 2026 — ไม่ได้เล่น');
    try {
      await gotoErDashboard(page);
      const original = await fetchWaitTimeSettings(page, authorization());
      play.note(`เวลารอตรวจเดิม (API): ${showSettings(original)}`);
      let level = ER08_LEVEL;
      if (!original.find((s) => s.level === level && s.limitSeconds !== null)) {
        level = [...original].reverse().find((s) => s.limitSeconds !== null)?.level ?? level;
        play.note(`ESI ${ER08_LEVEL} ไม่มีเวลาเป้าหมาย (ไม่จำกัด) → ใช้ ESI ${level} แทน`);
      }
      const before = original.find((s) => s.level === level)?.limitSeconds ?? null;
      const target = before !== null && before / 60 === ER08_TARGET_MIN ? ER08_TARGET_MIN + 1 : ER08_TARGET_MIN;

      // TOR08_RESUME=<HN>,<VN>,<EN>[,<นามสกุล เช่น ER08-01>] = เล่นต่อกับผู้ป่วยเดิมที่คัดกรองไม่สำเร็จ
      //   (ผู้ใช้สั่ง 8 พ.ย. 2026 หลังฟอร์มล็อก "ร่างถูกแก้ไขจากที่อื่น" — ไม่สร้างผู้ป่วยใหม่)
      const resume = process.env.TOR08_RESUME?.split(',').map((s) => s.trim());
      let visit: ErVisit | undefined;
      let familyName = resume?.[3] ?? '';
      if (resume && resume.length >= 3) {
        visit = { hn: resume[0], vn: resume[1], en: resume[2] };
        play.patient('เล่นต่อ (TOR08_RESUME — คัดกรองยังไม่ได้บันทึก)', { ...visit, name: `HN ${visit.hn}` });
      } else {
        // ลงทะเบียนก่อนแก้ค่า (ใช้เวลานาน) → ช่วงที่ค่าถูกแก้สั้นที่สุด
        const fresh = await nextUatPatient(page, authorization(), 8);
        const reg = await play.step('[เตรียม] ลงทะเบียนผู้ป่วยใหม่ครบทุกช่อง + เปิด Visit ER สิทธิ UC', async () => {
          const r = await registerFull(page, fresh).catch(async (error: Error) => {
            await noteVisitSlot(play, page);
            throw error;
          });
          noteFilled(play, `ลงทะเบียน ${fullName(fresh)} HN ${r.hn}`, r.filled, r.skipped);
          return r;
        });
        visit = reg?.visit;
        if (!visit) throw new Error(`UAT-ER-08: เปิด Visit ER ไม่สำเร็จ (${fullName(fresh)}) — หยุด`);
        familyName = fresh.familyName;
        play.patient('เปิดใหม่', played(fresh, visit));
        recordMockPatient('เล่น 08', fresh, visit, `UAT-ER-08 รอเกินเป้าหมาย ESI ${level}`);
      }

      let zone = '';
      let cc: string | undefined;
      // TOR08_ONLY_ZONE=1 (คู่กับ TOR08_RESUME) = รันเฉพาะ [224–225] กรองโซน — ไม่แตะค่าตั้งค่าเวลารอตรวจ (ผู้ใช้สั่ง 8 พ.ย. 2026 หลังขั้นอื่นผ่านแล้ว)
      const onlyZone = !!resume && process.env.TOR08_ONLY_ZONE === '1';
      if (onlyZone) play.note('TOR08_ONLY_ZONE=1 — ข้ามขั้น 216–222 (ผ่านแล้วรอบ 21:46) · รันเฉพาะกรองโซน');
      if (!onlyZone) {
      try {
        pendingRestore = { items: original, authorization };
        await play.step(`[216–217] ตั้งค่าเวลารอตรวจ: ESI ${level} ${before === null ? 'ไม่จำกัด' : `${before / 60} นาที`} → ${target} นาที → บันทึก — บันทึกได้ เปิดดูซ้ำค่าถูก`, async () => {
          await gotoErDashboard(page);
          await openErMenu(page, 'ตั้งค่า', 'ตั้งค่าเวลารอตรวจ');
          await expect(page).toHaveURL(/er-triage-wait-time-targets/, { timeout: 30_000 });
          const box = await waitTimeInput(page, level, original);
          const shown = await box.inputValue();
          if (before !== null && Number(shown) !== before / 60) throw new Error(`ช่องที่หาได้มีค่า "${shown}" ไม่ตรงค่าเดิมของ ESI ${level} (${before / 60} นาที) — ไม่แก้ กันแก้ผิดระดับ`);
          await box.fill(String(target));
          await box.press('Tab');
          const saved = guard(waitForApi(page, 'PATCH', '/cortex-api/er/triage/wait-time-settings', 30_000));
          await main.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
          await expectOk(await saved, 'บันทึกเวลารอตรวจ');
          await expect(page.getByText('บันทึกการตั้งค่าเวลารอตรวจแล้ว').first()).toBeVisible().catch(() => play.note('ไม่เห็นข้อความ "บันทึกการตั้งค่าเวลารอตรวจแล้ว"'));
          const after = await fetchWaitTimeSettings(page, authorization());
          const changed = after.filter((s) => s.limitSeconds !== original.find((o) => o.level === s.level)?.limitSeconds).map((s) => s.level);
          expect(changed, `ต้องเปลี่ยนเฉพาะ ESI ${level}`).toEqual([level]);
          expect(after.find((s) => s.level === level)?.limitSeconds, `ESI ${level} ต้องเป็น ${target} นาที`).toBe(target * 60);
          await page.reload();
          const reopened = await waitTimeInput(page, level, original);
          await expect(reopened, 'เปิดหน้าซ้ำ ค่าต้องเป็นค่าที่ตั้ง').toHaveValue(String(target), { timeout: 30_000 });
          await reopened.scrollIntoViewIfNeeded();
        });

        await play.step(`[เตรียม] คัดกรองครบทุก Section ที่ ESI ${level} — ผู้ป่วยรอตรวจในโซน`, async () => {
          await gotoVisit(page, visit);
          const systolic = erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first();
          const kept = resume ? await systolic.waitFor({ timeout: 120_000 }).then(() => systolic.inputValue(), () => '') : '';
          if (resume && kept) {
            // ร่างเดิมเก็บ V/S · GCS · ER Arrival ไว้ แต่ระดับความเร่งด่วน + โซนอาจหาย (เจอ 8 พ.ย. 18:46) → เลือกใหม่
            const locked = await shown(page.getByText(/ร่างถูกแก้ไขจากที่อื่น/), 3_000);
            const levels = erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' });
            await levels.scrollIntoViewIfNeeded();
            if (!(await erTriageLevel(page, level).isChecked().catch(() => false))) await levels.getByText(String(level), { exact: true }).click();
            await expect(erTriageLevel(page, level), `ระดับความเร่งด่วนต้องเป็น ${level}`).toBeChecked();
            zone = await selectTriageZone(page, 'suggested');
            const chosen = erTriagePanel(page).getByRole('group', { name: 'Common chief complaints' }).locator('button[aria-pressed="true"]');
            cc = (await chosen.count()) ? norm(await chosen.first().innerText()) : undefined;
            play.note(`เปิดใหม่: ร่างเก็บ Systolic "${kept}" · แถบ "ร่างถูกแก้ไขจากที่อื่น" ${locked ? 'ยังขึ้นอยู่' : 'ไม่ขึ้นแล้ว'} · เลือก ESI ${level} · โซน ${zone} · CC ${cc ?? '-'}`);
          } else {
            const t = await fillTriageFull(page, { level: level as 1 | 2 | 3 | 4 | 5, vitals: TOR_VITALS_NORMAL, illness: 'เจ็บคอ ไอ มีไข้ต่ำ 2 วัน (UAT)' });
            noteFilled(play, resume ? 'คัดกรอง (กรอกใหม่ — ร่างหาย)' : 'คัดกรอง', t.filled, t.skipped);
            zone = zoneName(t.zone);
            cc = t.chiefComplaint;
          }
          await saveTriageFull(page, visit, `คัดกรอง ESI ${level}`);
        });

        await play.step('[219–220] ดูข้อมูลบนการ์ดผู้ป่วยบน ER Dashboard — ตัวตน · สัญญาณชีพ · อาการ · ความรุนแรง · LOS', async () => {
          await gotoErDashboard(page);
          const card = boardCard(page, visit.hn);
          await expect(card, `การ์ด HN ${visit.hn} ต้องอยู่บนบอร์ด`).toBeVisible({ timeout: 60_000 });
          await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
          const text = norm(await card.innerText());
          play.note(`ข้อความบนการ์ด: ${text.slice(0, 400)}`);
          const enc = (await fetchBoard(page, authorization)).find((e) => e.en === visit.en);
          play.note(`API บอร์ด: ESI ${enc?.triageLevel} · triagedAt ${enc?.triagedAt} · waitTimeLimitSeconds ${enc?.waitTimeLimitSeconds} · MEWS ${enc?.clinicalDetails?.mews?.score ?? '-'}`);
          const checks: [string, RegExp][] = [
            ['ตัวตน: ชื่อ', familyName ? new RegExp(esc(familyName)) : new RegExp(visit.hn)],
            ['ตัวตน: HN', new RegExp(`HN: ${visit.hn}`)],
            ['สัญญาณชีพ: BP', new RegExp(`${TOR_VITALS_NORMAL.systolic}\\s*/\\s*${TOR_VITALS_NORMAL.diastolic}`)],
            ['อาการ (CC)', cc ? new RegExp(esc(cc.slice(0, 12))) : /CC/],
            ['ความรุนแรง (MEWS / ESI)', /MEWS|ESI|กู้ชีพ|ฉุกเฉิน|เร่งด่วน/],
            ['เวลา LOS / รอ', /\d+:\d+/],
          ];
          const missing = checks.filter(([, re]) => !re.test(text)).map(([name]) => name);
          expect(String(enc?.triageLevel ?? ''), 'ระดับบนบอร์ด').toContain(String(level));
          expect(missing, 'การ์ดต้องแสดงข้อมูลครบ').toEqual([]);
        });

        await play.step(`[221–222] รอจนเกินเป้าหมาย (${target} นาที) — เวลารอเป้าหมายบนการ์ดเป็นสีแดง`, async () => {
          const enc = (await fetchBoard(page, authorization)).find((e) => e.en === visit.en);
          const limit = enc?.waitTimeLimitSeconds ?? target * 60;
          const since = Date.parse(enc?.triagedAt ?? enc?.arrivedAt ?? new Date().toISOString());
          const deadline = Math.min(since + (limit + 120) * 1_000, Date.now() + ER08_MAX_WAIT_MIN * 60_000);
          log(`รอป้ายเกินเป้าหมาย: เป้าหมาย ${limit / 60} นาที · รอได้ถึง ${new Date(deadline).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
          const overdue = () => boardCard(page, visit.hn).getByText(/เกินเป้าหมาย/).first();
          let lastReload = Date.now();
          while (!(await overdue().isVisible().catch(() => false)) && Date.now() < deadline) {
            await page.waitForTimeout(15_000);
            if (Date.now() - lastReload > 90_000) {
              await gotoErDashboard(page).catch(() => undefined);
              lastReload = Date.now();
            }
            log(`  … ยังไม่ขึ้น "เกินเป้าหมาย" (${Math.round((Date.now() - since) / 60_000)} นาทีหลังคัดกรอง)`);
          }
          await boardCard(page, visit.hn).evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => undefined);
          await expect(overdue(), 'ต้องขึ้นป้าย "เกินเป้าหมาย" บนการ์ด').toBeVisible({ timeout: 5_000 });
          const { red, all } = await redOf(overdue());
          play.note(`ป้าย "${norm(await overdue().innerText())}" สีแดงที่พบ: ${red ?? '(ไม่พบ)'} จาก ${all.join(' · ')}`);
          expect(red, 'ป้ายเกินเป้าหมายต้องเป็นสีแดง').toBeTruthy();
        });
      } finally {
        // คืนค่าเดิมทันทีหลังเห็นป้าย (หรือขั้นพัง) — ไม่รอขั้นกรองโซน
        if (pendingRestore) {
          await restoreWaitTimeSettings(page, authorization(), original).then(
            () => {
              pendingRestore = undefined;
              log(`คืนค่าเวลารอตรวจเดิมแล้ว: ${showSettings(original)}`);
            },
            (error: Error) => log(`✗ คืนค่าเวลารอตรวจใน finally ไม่สำเร็จ (afterEach จะลองอีกครั้ง): ${error.message.slice(0, 200)}`),
          );
        }
      }

      await play.step('[216–217] คืนค่าเวลารอตรวจเดิม — API และหน้าตั้งค่าตรงค่าเดิมทุกระดับ', async () => {
        const now = await fetchWaitTimeSettings(page, authorization());
        play.note(`เวลารอตรวจหลังคืนค่า (API): ${showSettings(now)}`);
        const diff = original.filter((o) => now.find((s) => s.level === o.level)?.limitSeconds !== o.limitSeconds).map((o) => `ESI ${o.level}`);
        expect(diff, 'ทุกระดับต้องกลับเป็นค่าเดิม').toEqual([]);
        await openErMenu(page, 'ตั้งค่า', 'ตั้งค่าเวลารอตรวจ');
        await expect(page).toHaveURL(/er-triage-wait-time-targets/, { timeout: 30_000 });
        if (before !== null) await expect(await waitTimeInput(page, level, original), `หน้าตั้งค่า ESI ${level} ต้องเป็น ${before / 60} นาที`).toHaveValue(String(before / 60), { timeout: 30_000 });
      });
      } // จบ if (!onlyZone)

      await play.step(`[224–225] มุมมอง "รายการ" → ตัวกรองโซน "${zone || '(โซนของผู้ป่วย)'}" — เห็นเฉพาะโซนนั้น · ป้าย "โซน: ${zone}" · ตัวนับ ESI ตามโซน`, async () => {
        const zones = await fetchZones(page, authorization);
        const loc = (await fetchBoard(page, authorization)).find((e) => e.en === visit.en)?.currentLocationId;
        if (loc && zones.has(loc)) zone = zones.get(loc)!;
        expect(zone, 'ต้องรู้โซนของผู้ป่วย').toBeTruthy();
        await gotoErPatientList(page);
        // ช่อง "โซน" ในแถบกรอง (placeholder "โซน") — .ant-select ตัวแรกของหน้าเป็นตัวที่ซ่อนอยู่ คลิกไม่ได้ (รอบ 21:49)
        const byPlaceholder = main.locator('.ant-select').filter({ has: page.locator('.ant-select-selection-placeholder', { hasText: /^\s*โซน\s*$/ }) });
        const zoneSelect = (await byPlaceholder.count()) ? byPlaceholder.first() : main.locator('.ant-select').filter({ visible: true }).first();
        await zoneSelect.click();
        const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^\\s*${esc(zone)}\\s*(\\(|$)`) }).first();
        await expect(option, `ตัวกรองโซนต้องมี "${zone}"`).toBeVisible();
        log(`ตัวเลือกโซน: ${norm((await page.locator('.ant-select-dropdown:visible .ant-select-item-option').allInnerTexts()).join(' | '))}`);
        if (!/option-selected/.test((await option.getAttribute('class')) ?? '')) await option.click();
        await page.keyboard.press('Escape');
        await page.mouse.move(960, 1050);
        await expect(main.getByText(new RegExp(`^\\s*โซน:\\s*${esc(zone)}\\s*$`)).first(), `ต้องมีป้าย "โซน: ${zone}" ใต้แถบกรอง`).toBeVisible();
        await expect(erListRow(page, visit.en), 'ผู้ป่วยของเทสต้องอยู่ในรายการที่กรอง').toBeVisible({ timeout: 30_000 });
        const zoneCells = await main
          .locator('.ant-table-wrapper')
          .first()
          .evaluate((wrap) => {
            const thead = [...wrap.querySelectorAll('thead')].find((t) => (t as HTMLElement).offsetHeight > 0);
            const idx = thead ? [...thead.querySelectorAll('th')].findIndex((th) => (th as HTMLElement).innerText.trim() === 'โซน') : -1;
            return [...wrap.querySelectorAll('tr.ant-table-row')].filter((tr) => (tr as HTMLElement).offsetHeight > 0).map((tr) => ((tr.querySelectorAll(':scope > td')[idx] as HTMLElement | undefined)?.innerText ?? '?').trim());
          });
        const others = zoneCells.filter((z) => z !== zone);
        const chips = (await main.locator('button[class*="_summary-button_"]').allInnerTexts()).map(norm);
        play.note(`กรองโซน ${zone}: ${zoneCells.length} แถว (หน้าแรก) · ตัวนับ: ${chips.join(' · ') || '(ไม่พบตัวนับ)'}`);
        expect(others, `ทุกแถวต้องเป็นโซน ${zone}`).toEqual([]);
        const esiChip = chips.find((c) => new RegExp(`^${level}\\s`).test(c));
        expect(Number(esiChip?.match(/(\d+)$/)?.[1] ?? 0), `ตัวนับ ESI ${level} ของโซน ${zone} ต้องนับผู้ป่วยของเทสด้วย (≥ 1)`).toBeGreaterThanOrEqual(1);
        const total = Number(chips.find((c) => /^ทั้งหมด/.test(c))?.match(/(\d+)$/)?.[1] ?? NaN);
        if (zoneCells.length < 20 && !Number.isNaN(total)) expect(total, 'ตัวนับ "ทั้งหมด" ต้องเท่าจำนวนแถวของโซนที่กรอง').toBe(zoneCells.length);
      });
      // ล้างตัวกรองโซน (เก็บใน localStorage ของเบราว์เซอร์เทส) — ไม่นับเป็นขั้นของชีต
      const clear = main.getByRole('button', { name: /ล้าง$/ });
      if (await clear.isEnabled().catch(() => false)) await clear.click().catch(() => undefined);
    } finally {
      play.finish();
    }
  });

  // ================================================================================================
  test('UAT-ER-09 พยาบาลรับเวรและจัดการงาน (แถว 231–244)', { tag: '@UAT-ER-09' }, async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-09');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    console.log(`▶ UAT-ER-09 งานพยาบาล (${SYSTEM}) — ผู้ป่วยใหม่ + คัดกรอง + Physician Note + Order ${TOR_ORDER_CODES.img.join(' / ')} → รายการงานพยาบาล`);
    try {
      await gotoErDashboard(page);
      // TOR09_RESUME=<HN>,<VN>,<EN> = เล่นต่อกับผู้ป่วยเดิมที่คัดกรองไม่สำเร็จ (ผู้ใช้สั่ง 8 พ.ย. 2026 หลังฟอร์มล็อก "ร่างถูกแก้ไขจากที่อื่น" ครั้งที่ 4)
      const resume = process.env.TOR09_RESUME?.split(',').map((s) => s.trim());
      let visit: ErVisit | undefined;
      if (resume && resume.length >= 3) {
        visit = { hn: resume[0], vn: resume[1], en: resume[2] };
        play.patient('เล่นต่อ (TOR09_RESUME — คัดกรองยังไม่ได้บันทึก)', { ...visit, name: `HN ${visit.hn}` });
      } else {
        const fresh = await nextUatPatient(page, authorization(), 9);
        const reg = await play.step('[เตรียม] ลงทะเบียนผู้ป่วยใหม่ครบทุกช่อง + เปิด Visit ER สิทธิ UC', async () => {
          const r = await registerFull(page, fresh).catch(async (error: Error) => {
            await noteVisitSlot(play, page);
            throw error;
          });
          noteFilled(play, `ลงทะเบียน ${fullName(fresh)} HN ${r.hn}`, r.filled, r.skipped);
          return r;
        });
        visit = reg?.visit;
        if (!visit) throw new Error(`UAT-ER-09: เปิด Visit ER ไม่สำเร็จ (${fullName(fresh)}) — หยุด`);
        play.patient('เปิดใหม่', played(fresh, visit));
        recordMockPatient('เล่น 09', fresh, visit, `UAT-ER-09 งานพยาบาล (Order ${TOR_ORDER_CODES.img.join(' + ')})`);
      }

      // TOR09_FROM=assign (คู่กับ TOR09_RESUME) = ข้ามขั้นเตรียม (คัดกรอง · Physician Note · Order ทำแล้ว) → เริ่มที่ Assign พยาบาล
      //   (8 พ.ย. 22:20 Prod หน้าขาว / โหลดค้างตั้งแต่ขั้น Assign — ห้ามคัดกรอง / สั่ง Order ซ้ำ)
      const skipPrep = !!resume && process.env.TOR09_FROM === 'assign';
      let tasks: NurseTask[] = [];
      if (skipPrep) {
        tasks = await fetchNurseTasks(page, authorization(), visit.en);
        play.note(`TOR09_FROM=assign — ข้ามขั้นเตรียม · งานพยาบาลเดิม: ${tasks.map((t) => `${t.name} (${t.source}) = ${t.status}`).join(' · ') || '(ไม่มี)'}`);
        if (tasks.length < 2) throw new Error(`UAT-ER-09: งานพยาบาลเดิมมี ${tasks.length} งาน (ต้อง ≥ 2) — หยุด`);
      } else {
      await play.step('[เตรียม] คัดกรองครบทุก Section (ESI 3) + บันทึก', async () => {
        if (resume) {
          await gotoVisit(page, visit);
          const systolic = erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first();
          const kept = await systolic.waitFor({ timeout: 120_000 }).then(() => systolic.inputValue(), () => '');
          if (kept) {
            // ร่างเดิมเก็บ V/S ไว้ แต่ระดับความเร่งด่วน + โซนอาจหาย → เลือกใหม่ (แบบ UAT-ER-08)
            const locked = await shown(page.getByText(/ร่างถูกแก้ไขจากที่อื่น/), 3_000);
            const levels = erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' });
            await levels.scrollIntoViewIfNeeded();
            if (!(await erTriageLevel(page, 3).isChecked().catch(() => false))) await levels.getByText('3', { exact: true }).click();
            await expect(erTriageLevel(page, 3), 'ระดับความเร่งด่วนต้องเป็น 3').toBeChecked();
            const zone = await selectTriageZone(page, 'suggested');
            play.note(`เปิดใหม่: ร่างเก็บ Systolic "${kept}" · แถบ "ร่างถูกแก้ไขจากที่อื่น" ${locked ? 'ยังขึ้นอยู่' : 'ไม่ขึ้นแล้ว'} · เลือก ESI 3 · โซน ${zone}`);
            await saveTriageFull(page, visit, 'คัดกรอง ESI 3 (เล่นต่อ)');
            return;
          }
        }
        const t = await fillTriageFull(page, { level: 3, vitals: TOR_VITALS_NORMAL });
        noteFilled(play, resume ? 'คัดกรอง (กรอกใหม่ — ร่างหาย)' : 'คัดกรอง', t.filled, t.skipped);
        await saveTriageFull(page, visit, 'คัดกรอง ESI 3');
      });
      await play.step('[เตรียม] แพทย์บันทึก ER Physician Note ครบ (Diagnosis K30)', async () => {
        await gotoVisit(page, visit);
        const n = await savePhysicianNoteFull(page);
        noteFilled(play, `Physician Note (${n.dx})`, n.filled, n.skipped);
      });
      await play.step(`[เตรียม] สั่ง Order Imaging ${TOR_ORDER_CODES.img.join(' + ')} → ส่งคำสั่ง — เกิดงานพยาบาล ≥ 2 งาน "รอรับงาน"`, async () => {
        await submitOrders(page, TOR_ORDER_CODES.img).catch(async (error: Error) => {
          // Prod: ส่งคำสั่งหมุนนานแต่สำเร็จทีหลังได้ → ดูงานพยาบาลก่อนสรุป
          play.note(`ส่งคำสั่งไม่จบในเวลา: ${error.message.split('\n')[0].slice(0, 200)} — ตรวจงานพยาบาลต่อ`);
        });
        await expect
          .poll(async () => (tasks = await fetchNurseTasks(page, authorization(), visit.en).catch(() => tasks)).length, { timeout: 180_000, intervals: [5_000], message: 'ต้องเกิดงานพยาบาลอย่างน้อย 2 งาน' })
          .toBeGreaterThanOrEqual(2);
        play.note(`งานพยาบาล: ${tasks.map((t) => `${t.name} (${t.source}) = ${t.status}`).join(' · ')}`);
      });
      } // จบ if (!skipPrep)

      await play.step('[236–237] Assign พยาบาล: หน้า Overview ระบุช่อง "พยาบาล" — ชื่อพยาบาลแสดงในช่อง', async () => {
        await gotoVisit(page, visit);
        const box = main.getByRole('combobox', { name: 'พยาบาล' }).first();
        await expect(box).toBeVisible({ timeout: 60_000 });
        // dropdown รายชื่อเปิดแล้วปิดเองเร็วมาก (Prod 22:39) → พิมพ์ค้นแล้วกด Enter เลือกรายแรกแทนการคลิกรายชื่อ
        const openList = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
        let nurse = '';
        const saved = nextMutation(page, /care-team|assignment|nurse/i, 60_000);
        await expect(async () => {
          await box.click();
          await box.fill('พยาบาล');
          await expect(openList.first()).toBeVisible({ timeout: 5_000 });
          nurse = norm(await openList.first().innerText());
          await page.keyboard.press('Enter');
        }).toPass({ timeout: 60_000 });
        const res = await saved;
        log(`assign "${nurse}": ${res.request().method()} ${new URL(res.url()).pathname} → ${res.status()}`);
        await expectOk(res, 'บันทึกพยาบาลผู้ดูแล');
        await expect(main.getByText(nurse).first(), 'ชื่อพยาบาลต้องแสดงในช่อง').toBeVisible();
        play.note(`พยาบาลผู้ดูแล: ${nurse}`);
      });

      const patientButton = main.getByRole('button', { name: new RegExp(`HN ${visit.hn} `) }).first();
      const openTaskList = async () => {
        await openErMenu(page, 'รายการงานพยาบาล').catch(() => page.goto('/cortex/er/nurse-task-list'));
        await expect(page).toHaveURL(/\/er\/nurse-task-list/, { timeout: 30_000 });
        await expect(patientButton, `รายการงานพยาบาลต้องมีผู้ป่วย HN ${visit.hn}`).toBeVisible({ timeout: 60_000 });
        await patientButton.click();
        await expect(main.getByText(`HN ${visit.hn}`, { exact: true }).first()).toBeVisible();
      };
      /** แถวของงานในตาราง (ชื่องานจาก API) — ไม่เจอ = undefined */
      const taskRow = async (task: NurseTask): Promise<Locator | undefined> => {
        if (!task.name) return undefined;
        // แถวงานเป็นกล่อง div._data-row_ ไม่ใช่ <tr> / role=row (สำรวจ 22:39)
        const row = main.locator('div[class*="_data-row_"]').filter({ hasText: task.name }).first();
        return (await shown(row, 10_000)) ? row : undefined;
      };
      const statusOf = async (id: string) => (await fetchNurseTasks(page, authorization(), visit.en)).find((t) => t.id === id)?.status ?? '(ไม่พบ)';
      const accept = async (task: NurseTask) => {
        const row = (await taskRow(task)) ?? main;
        // ปุ่มบนจอ Prod = "รับ Order" (ชีตเขียน "รอรับงาน") — ตรวจผลจากสถานะ API แทนการรอ request ที่อาจคนละ path
        await row.getByRole('button', { name: /^รับ\s*(Order|งาน)$/ }).first().click({ timeout: 15_000 });
        await expect.poll(() => statusOf(task.id), { timeout: 60_000, message: `${task.name} ต้องเป็น RUNNING หลังกดรับ` }).toBe('RUNNING');
      };
      /** งานที่จบแล้วต้องไม่มีปุ่มเปลี่ยนสถานะในแถว */
      const expectLocked = async (task: NurseTask, what: string) => {
        await openTaskList();
        const row = await taskRow(task);
        if (!row) {
          play.note(`หาแถวของงาน "${task.name}" ในตารางไม่เจอ — ตรวจเฉพาะสถานะ API`);
          return;
        }
        await row.scrollIntoViewIfNeeded();
        play.note(`แถวงาน "${task.name}" หลัง${what}: ${norm(await row.innerText()).slice(0, 200)}`);
        const buttons = (await row.getByRole('button').allInnerTexts()).map(norm).filter((t) => /รับงาน|รับ Order|เสร็จ|ยกเลิก|แก้ไข/.test(t));
        expect(buttons, `งานที่${what}แล้วต้องแก้ไขสถานะไม่ได้ (ไม่มีปุ่ม รับงาน / เสร็จ / ยกเลิก)`).toEqual([]);
      };

      await play.step('[239–240] เปิด "รายการงานพยาบาล" (แท็บซ้าย) — แสดงผู้ป่วยทุกรายที่มีงานพยาบาล', async () => {
        await openTaskList();
        for (const t of tasks) if (!(await taskRow(t))) play.note(`ตารางไม่พบแถวชื่อ "${t.name}" (ชื่อบนจออาจต่างจาก API)`);
      });

      const [first, second] = tasks;
      await play.step(`[241–242] งานที่ 1 "${first?.name ?? '-'}": รอรับงาน → กำลังทำ → เสร็จสิ้น — เสร็จแล้วแก้ไม่ได้`, async () => {
        if (!first) throw new Error('ไม่มีงานพยาบาลงานที่ 1');
        if ((await statusOf(first.id)) === 'PENDING') await accept(first);
        const row = (await taskRow(first)) ?? main;
        await row.getByRole('button', { name: /^เสร็จ/ }).first().click({ timeout: 15_000 });
        const dialog = page.getByRole('dialog', { name: 'บันทึกการทำงาน' });
        await expect(dialog).toBeVisible();
        const doneBy = dialog.getByRole('combobox', { name: /ทำโดย/ });
        await doneBy.click();
        await pick(options(page).first());
        // ปุ่มบันทึกหมุนตั้งแต่เลือก "ทำโดย" — กดตอนหมุนไม่มีผล → รอหยุดหมุนก่อนกด
        const save = dialog.getByRole('button', { name: 'บันทึก', exact: true });
        await expect(save).not.toHaveClass(/ant-btn-loading/, { timeout: 60_000 }).catch(() => play.note('ปุ่มบันทึกยังหมุนเกิน 60 วิ — กดต่อ'));
        await save.click();
        const closed = await dialog.waitFor({ state: 'hidden', timeout: 30_000 }).then(() => true, () => false);
        await expect.poll(() => statusOf(first.id), { timeout: 60_000, message: 'งานที่ 1 ต้องเป็น DONE' }).toMatch(/DONE|COMPLET|FINISH/i);
        if (!closed) {
          play.note('หน้าต่าง "บันทึกการทำงาน" ไม่ปิดเอง ปุ่มหมุนค้าง ทั้งที่งานเป็น DONE แล้ว (บั๊กเดิมของ Prod) → ปิดหน้าต่างแล้วไปต่อ');
          await page.keyboard.press('Escape');
          await dialog.locator('xpath=ancestor::div[contains(@class,"ant-modal-wrap")]').locator('.ant-modal-close').click({ timeout: 3_000 }).catch(() => undefined);
        }
        await expectLocked(first, 'เสร็จสิ้น');
        play.note('Issue #13 (ปุ่มด้านหลังหายในหน้า Order Summary หลังงานพยาบาลเสร็จ) อยู่หน้า Order Summary — ขั้นนี้ไม่ได้เปิดดู');
      });

      await play.step(`[243–244] งานที่ 2 "${second?.name ?? '-'}": กำลังทำ → ยกเลิก — ยกเลิกแล้วแก้ไม่ได้`, async () => {
        if (!second) throw new Error('ไม่มีงานพยาบาลงานที่ 2');
        await openTaskList();
        if ((await statusOf(second.id)) === 'PENDING') await accept(second);
        const row = (await taskRow(second)) ?? main;
        const cancelled = nextMutation(page, new RegExp(`nurse-tasks/${second.id}/cancel`), 30_000).catch(() => undefined);
        await row.getByRole('button', { name: /^ยกเลิก/ }).first().click({ timeout: 15_000 });
        const confirm = page.locator('.ant-modal-content:visible, .ant-popover:visible, .ant-popconfirm:visible').last();
        if (await shown(confirm, 3_000)) {
          const reason = confirm.getByRole('textbox').first();
          if (await reason.isVisible().catch(() => false)) await reason.fill('ยกเลิกงาน (UAT-ER-09)');
          await confirm.getByRole('button', { name: /ยืนยัน|บันทึก|ตกลง|ยกเลิกงาน/ }).last().click();
        }
        const cancelRes = await cancelled;
        if (cancelRes) await expectOk(cancelRes, `ยกเลิกงาน ${second.name}`);
        await expect.poll(() => statusOf(second.id), { timeout: 30_000, message: 'งานที่ 2 ต้องเป็น CANCELLED' }).toMatch(/CANCEL/i);
        await expectLocked(second, 'ยกเลิก');
      });

      const after = await fetchNurseTasks(page, authorization(), visit.en).catch(() => []);
      play.note(`งานพยาบาลหลังเล่น: ${after.map((t) => `${t.name} = ${t.status}`).join(' · ') || '(อ่านไม่ได้)'}`);
      await snap(page, 'สรุป — รายการงานพยาบาลหลังเล่น');
    } finally {
      play.finish();
    }
  });

  // ================================================================================================
  test('UAT-ER-10 ลงทะเบียนผิดคน แล้วยกเลิก Encounter (แถว 245–253)', { tag: '@UAT-ER-10' }, async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-10');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    console.log(`▶ UAT-ER-10 ยกเลิก Encounter (${SYSTEM}) — ลงทะเบียนครบไม่เปิด Visit → เปิด Visit ผิดคน → ยกเลิกที่ช่องสถานะ → แท็บ ยกเลิก`);
    try {
      await gotoErDashboard(page);
      const fresh = await nextUatPatient(page, authorization(), 10);
      const hn = await play.step('[เตรียม] ลงทะเบียนผู้ป่วยใหม่ครบทุกช่อง ไม่เปิด Visit (ใช้เป็นคนที่เปิดผิด)', async () => {
        const r = await registerFull(page, fresh, { withoutVisit: true });
        noteFilled(play, `ลงทะเบียน ${fullName(fresh)} HN ${r.hn}`, r.filled, r.skipped);
        return r.hn;
      });
      if (!hn) throw new Error(`UAT-ER-10: ลงทะเบียนไม่สำเร็จ (${fullName(fresh)}) — หยุด`);
      play.patient('เปิดใหม่ (ยังไม่มี Visit)', played(fresh, { hn }));

      const visit = await play.step('[247–248] เปิด Visit ER ให้ผิดราย (สิทธิ UC) — ได้ EN ของผิดราย', async () => {
        await gotoErDashboard(page);
        const v = await openErVisitForHn(page, hn).catch(async (error: Error) => {
          await noteVisitSlot(play, page);
          throw error;
        });
        await gotoVisit(page, v);
        await expectVisitHeader(page, v);
        expect((await boardEncounter(page, authorization(), v.en))?.latestStatusCode, `Encounter ${v.en} ต้องเปิดอยู่`).toBe('in-progress');
        return v;
      });
      recordMockPatient('เล่น 10', fresh, visit ?? { hn }, visit ? 'UAT-ER-10 เปิด Visit ผิดคน → ยกเลิก Encounter' : 'UAT-ER-10 ลงทะเบียนแล้ว เปิด Visit ไม่สำเร็จ');
      if (!visit) throw new Error(`UAT-ER-10: เปิด Visit ER ให้ HN ${hn} ไม่สำเร็จ — หยุด`);
      play.patient('เปิด Visit ผิดคน', played(fresh, visit));

      await play.step(`[249–251] ยกเลิก Visit: Overview → ช่องสถานะ (ขวาบน) → ยกเลิก → ตรวจ EN ${visit.en} ในหน้าต่าง → เหตุผล → ยืนยัน — ยกเลิกสำเร็จ`, async () => {
        const status = main.locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
        await expect(status, 'ต้องมีช่องสถานะที่แถบหัว').toBeVisible({ timeout: 60_000 });
        play.note(`สถานะก่อนยกเลิก: ${norm(await status.innerText())}`);
        await status.click();
        await pick(options(page).filter({ hasText: /^ยกเลิก$/ }).first());
        const dialog = page.getByRole('dialog', { name: /ต้องการยกเลิก/ });
        await expect(dialog).toBeVisible();
        const title = norm(await dialog.innerText());
        play.note(`หน้าต่างยืนยัน: ${title.slice(0, 160)}`);
        // ตรวจ EN ก่อนกดยืนยัน — ไม่ตรง = ปิดหน้าต่าง ไม่ยกเลิก
        if (!title.includes(visit.en)) {
          await dialog.getByRole('button', { name: 'ย้อนกลับ' }).click().catch(() => undefined);
          throw new Error(`หน้าต่างยกเลิกไม่ได้แสดง EN ${visit.en} — ไม่กดยืนยัน`);
        }
        await dialog.getByRole('textbox', { name: 'ระบุเหตุผลการยกเลิก' }).fill(CANCEL_REASON);
        const res = guard(page.waitForResponse((r) => r.request().method() === 'POST' && /\/cortex-api\/graphql/.test(r.url()) && /cancelEncounter/i.test(r.request().postData() ?? ''), { timeout: 60_000 }));
        await dialog.getByRole('button', { name: 'ยืนยัน' }).click();
        const r = await res;
        const body = await r.text();
        log(`cancelEncounter → ${r.status()} ${body.slice(0, 200)}`);
        expect(r.ok() && !/"errors"\s*:\s*\[/.test(body), `ยกเลิก Encounter ต้องสำเร็จ: ${body.slice(0, 200)}`).toBe(true);
        await expect(dialog).toBeHidden({ timeout: 20_000 });
        await expect(async () => expect((await boardEncounter(page, authorization(), visit.en))?.latestStatusCode).toBe('cancelled')).toPass({ timeout: 30_000 });
        await expect(status).toContainText(/ยกเลิก/, { timeout: 15_000 }).catch(() => play.note('ช่องสถานะบนจอยังไม่เปลี่ยนเป็น "ยกเลิก" (API เป็น cancelled แล้ว)'));
      });

      await play.step('[252–253] รายการผู้ป่วย ER (มุมมอง "รายการ"): ไม่อยู่ในผู้ป่วยปัจจุบัน · อยู่แท็บ "ยกเลิก"', async () => {
        await gotoErPatientList(page);
        await hnSearchBox(page).fill(visit.hn);
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
        await expect(erListTab(page, 'current')).toHaveAttribute('aria-selected', 'true');
        await expect(erListRow(page, visit.en), 'แท็บผู้ป่วยปัจจุบันต้องไม่มี Encounter ที่ยกเลิก').toHaveCount(0, { timeout: 15_000 });
        await openErListTab(page, 'cancelled');
        await expect(erListRow(page, visit.en), 'แท็บ "ยกเลิก" ต้องมี Encounter นี้').toBeVisible({ timeout: 30_000 });
        play.note(`แถวในแท็บยกเลิก: ${norm(await erListRow(page, visit.en).innerText()).slice(0, 200)}`);
      });
    } finally {
      play.finish();
    }
  });
});
