import type { Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { cprButton, openCprForm, saveCprEvent } from '../../../helpers/functions/er-cpr';
import { chooseDispositionDiagnosis, openDisposition, signDisposition } from '../../../helpers/functions/er-disposition';
import { physicianNoteDiagnosis, physicianNoteIllness, physicianNotePanel, physicianNoteSaveButton, waitPhysicianNoteForm } from '../../../helpers/functions/er-physician-note';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { fetchTreatmentTimeline, openTimelineTab, readTimeline, timelinePanel, timelineRow, timelineTab, type TimelineEvent } from '../../../helpers/functions/er-timeline';
import { erTriageLevel, erTriagePanel, erTriageSaveButton, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SETTINGS, SYSTEM, recordMockPatient, registerAndOpenErVisit, submitOrders } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, careMenu, draftDischarge, gotoVisit, openPatientAs, recordMenu, replyConsult, requestConsult } from '../../../mock-data/uat-play';

// SBH-1038 [ER][In ER Zone] ดูประวัติการรักษา < Treatment Timeline > — หน้า ประวัติการรักษา (รายการ Encounter + Secondary tab bar ของ ER) + แท็บ Timeline (event ที่ stamp จาก flow การรักษา)
// ชุด EXE SBH-1980 → SC-001…008 (SBH-1981…1988) → TC-001…016 (SBH-1989…2004 · TC-004 SBH-1992 Canceled)
// เทส A (อ่านอย่างเดียว · ผู้ป่วยของทีมที่มีประวัติตาม Pre-condition): TC-001 / 002 / 003 / 005 / 006
// เทส B (ผู้ป่วย AUTO ใหม่ 1 ราย — ผู้ใช้อนุญาตบน SBH Prod 5 พ.ย. 2026 "สร้างไม่เกิน 2 ราย แล้วปิด Visit"):
//   TC-009 เปิด Visit + คัดกรอง → TC-013 แพทย์เริ่มการรักษา (กรอกช่อง CC — ผู้ใช้ให้แก้ TC แทนการกด Ack) → TC-010 บันทึก Physician Note → TC-007 ER Summary
//   → TC-011 CPR เริ่ม / หยุด → TC-014 ส่ง Order หลายรอบ → TC-015 คัดกรองซ้ำ 2 รอบ (ยึด Note ใน TC: แยกแถวทุกรอบ) → TC-016 Consult (หน้าต่างบัญชี Doctor ขอ · บัญชีหลักตอบ)
//   → TC-012 Disposition ลงนาม → TC-008 Timeline ทั้งหมดเรียง ascending เทียบเวลาที่จดไว้ → ปิด Visit ที่การเงิน (afterEach)
// รัน (SBH Prod): npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep "@SBH-1038-RO( |$)"   ← เทส A
//                 npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep "@SBH-1038-FLOW( |$)" ← เทส B
// SBH1038_VISIT=<HN>,<VN>,<EN> = ทำต่อกับผู้ป่วยเดิม (คัดกรองแล้ว) · SBH1038_FROM=<เลข TC> = เริ่มที่ TC นั้น (ข้าม TC ก่อนหน้าในลำดับ) · SBH1038_KEEP=1 = ไม่ปิด Visit
// SBH1038_FULL / SBH1038_OPD / SBH1038_CONVERT = HN ของผู้ป่วยเทส A (ตั้งต้น: คนไข้ A 6903601 · Jame 6903440 · UAT 6904061 — เลือกจาก API getAdmissions / encountersByHn 5 พ.ย. 2026 · เทสตรวจ Pre-condition จาก API ซ้ำทุกรอบ)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ISSUE: Record<number, string> = {
  1: 'SBH-1989', 2: 'SBH-1990', 3: 'SBH-1991', 5: 'SBH-1993', 6: 'SBH-1994', 7: 'SBH-1995', 8: 'SBH-1996', 9: 'SBH-1997',
  10: 'SBH-1998', 11: 'SBH-1999', 12: 'SBH-2000', 13: 'SBH-2001', 14: 'SBH-2002', 15: 'SBH-2003', 16: 'SBH-2004',
};
const TC = (n: number) => `TC-${String(n).padStart(3, '0')} (${ISSUE[n]})`;
const RO_TCS = [1, 2, 3, 5, 6];
const FLOW_TCS = [9, 13, 10, 7, 11, 14, 15, 16, 12, 8];
const ER_DEPARTMENT_ID = 126; // ห้องตรวจแผนกฉุกเฉิน (SBH Prod — จาก encountersByHn ของ Visit ER ที่รู้แน่)

/** ชื่อ event บน Timeline (locale er.json timeline.eventType) */
const LABEL = {
  ER_VISIT_ARRIVED: 'เปิด ER Visit / ผู้ป่วยมาถึง',
  FIRST_TRIAGE: 'คัดกรองครั้งแรก',
  PHYSICIAN_TREATMENT_STARTED: 'แพทย์เริ่มการรักษา',
  PHYSICIAN_EXAM_COMPLETED: 'แพทย์ตรวจเสร็จสิ้น',
  CPR_STARTED: 'เริ่ม CPR',
  CPR_STOPPED: 'หยุด CPR',
  ER_REASSESSMENT: 'คัดกรองซ้ำ',
  ORDER_SENT: 'ส่ง Order',
  CONSULT_REQUESTED: 'ขอ Consult',
  CONSULT_RESPONDED: 'Consult ตอบกลับแล้ว',
  DISPOSITION_DRAFT_SAVED: 'บันทึกร่างการจำหน่าย',
  DISPOSITION_COMPLETED: 'ลงนามการจำหน่าย',
} as const;
type EventType = keyof typeof LABEL;

/** เวลา HH:mm ของเขตเวลาไทย (รูปแบบเดียวกับคอลัมน์เวลาบน Timeline) */
const hhmm = (d: Date | string) => new Date(d).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false });
const hhmmss = (d: Date | string) => new Date(d).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false });

/** graphql query (อ่านอย่างเดียว) ด้วย token ของแอป */
async function gql<T>(page: Page, authorization: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await page.request.post('/cortex-api/graphql', { headers: { authorization, 'content-type': 'application/json' }, data: { query, variables } });
  await expectOk(res, 'graphql (อ่านอย่างเดียว)');
  const body = (await res.json()) as { data: T; errors?: unknown };
  expect(body.errors, `graphql error: ${JSON.stringify(body.errors)}`).toBeUndefined();
  return body.data;
}

interface Enc { en: string; vn: string; an?: string | null; latestStatusCode: string; encounterType: string; departmentId: number | null; clinic?: { name?: string } | null; startedAt?: string; createdAt?: string }
interface Adm { an: string; hn: string; latestStatusCode: string; admissionDatetime: string; admitRequestId: number | null }
const encountersOf = async (page: Page, auth: string, hn: string) =>
  (await gql<{ encountersByHn: { data: Enc[] } }>(page, auth, 'query Q($hn: String!) { encountersByHn(hn: $hn, pagination: {page: 1, perPage: 200}) { data { en vn an latestStatusCode encounterType departmentId clinic { name } startedAt createdAt } } }', { hn })).encountersByHn.data;
const admissionsOf = async (page: Page, auth: string, hn: string) =>
  (await gql<{ getAdmissions: { data: Adm[] } }>(page, auth, 'query Q($filter: AdmissionFilterInput, $pagination: PaginationInput) { getAdmissions(filter: $filter, pagination: $pagination) { data { an hn latestStatusCode admissionDatetime admitRequestId } } }', { filter: { hn }, pagination: { page: 1, perPage: 100 } })).getAdmissions.data.filter((a) => a.hn === hn);

/** 1 แถวของรายการ Encounter ฝั่งซ้ายในหน้าประวัติการรักษา ตามที่จอแสดง */
interface HistoryItem { badge: string; badgeColor: string; date: string; id: string; status: string; unit: string; doctor: string; dx: string; stripe: string; selected: boolean }

function historyItems(page: Page): Locator {
  return page.getByRole('main').locator('button[class*="_medication-history-item-clickable_"]').filter({ visible: true });
}

async function readHistory(page: Page): Promise<HistoryItem[]> {
  return historyItems(page).evaluateAll((buttons) =>
    buttons.map((button) => {
      const text = (sel: string, root: Element = button) => root.querySelector(sel)?.textContent?.trim() ?? '';
      const badge = button.querySelector('.ant-tag-solid') as HTMLElement | null;
      const row2 = button.querySelector('[class*="_medication-history-item-row-2_"]');
      const cells = row2 ? [...row2.children].map((c) => c.textContent?.trim() ?? '') : [];
      // แถบสีด้านซ้ายของแถว (Mock up 1) — ดูเส้นขอบซ้าย / เงาด้านใน ของปุ่ม และกล่องแม่
      const stripeOf = (el: Element | null) => {
        if (!el) return '';
        const cs = getComputedStyle(el as HTMLElement);
        const width = parseFloat(cs.borderLeftWidth);
        return width >= 2 && cs.borderLeftStyle !== 'none' ? `${width}px ${cs.borderLeftColor}` : cs.boxShadow !== 'none' && /inset/.test(cs.boxShadow) ? cs.boxShadow : '';
      };
      const parent = button.parentElement;
      return {
        badge: badge?.textContent?.trim() ?? '',
        badgeColor: badge ? getComputedStyle(badge).backgroundColor : '',
        date: text('.text-sm'),
        id: text('[class*="_medication-history-item-row-right_"]'),
        status: cells[0] ?? '',
        unit: cells[1] ?? '',
        doctor: cells[2] ?? '',
        dx: text('[class*="_medication-history-item-diagnosis_"]'),
        stripe: stripeOf(button) || stripeOf(parent),
        selected: /selected|active/i.test(`${button.className} ${parent?.className ?? ''}`) || getComputedStyle(parent ?? button).backgroundColor !== 'rgba(0, 0, 0, 0)',
      };
    }),
  );
}

/** แถวของรายการฝั่งซ้ายตามเลข EN / AN */
function historyItem(page: Page, id: string): Locator {
  return historyItems(page).filter({ has: page.locator('[class*="_medication-history-item-row-right_"]', { hasText: new RegExp(`^${id}$`) }) }).first();
}

/** แถบตัวกรองด้านบนของหน้าประวัติการรักษา */
function filterBar(page: Page): Locator {
  return page.getByRole('main').locator('div').filter({ has: page.getByPlaceholder('วันที่เริ่ม') }).filter({ has: page.getByText('Clear', { exact: true }) }).last();
}

async function readFilterBar(page: Page): Promise<string[]> {
  const bar = filterBar(page);
  await expect(bar.getByPlaceholder('วันที่เริ่ม')).toBeVisible({ timeout: 45_000 });
  return bar.evaluate((root) => {
    const out: string[] = [];
    root.querySelectorAll('input[placeholder]').forEach((el) => out.push(`ช่อง ${(el as HTMLInputElement).placeholder}`));
    root.querySelectorAll('.ant-select-placeholder').forEach((el) => out.push(`ช่องเลือก ${el.textContent?.trim()}`));
    root.querySelectorAll('label.ant-checkbox-wrapper, .ant-checkbox-wrapper').forEach((el) => out.push(`checkbox ${el.textContent?.trim()}`));
    root.querySelectorAll('button').forEach((el) => {
      const t = el.textContent?.trim();
      if (t) out.push(`ปุ่ม ${t}`);
    });
    return [...new Set(out)];
  });
}

/** Encounter ที่ Location เป็นแผนกฉุกเฉิน (แผนก 126 หรือคลินิก ห้องตรวจแผนกฉุกเฉิน — Visit ER รุ่นแรกบน Prod เป็นแผนก 1 แต่คลินิก ER) */
const isErEncounter = (e: Enc) => e.departmentId === ER_DEPARTMENT_ID || /ฉุกเฉิน/.test(e.clinic?.name ?? '');

/** ช่อง "โซน *" ของฟอร์มคัดกรอง: ระบบแค่แนะนำ ไม่เลือกให้ (SBH Prod 5 พ.ย. 2026 · dev-x 3 พ.ย.) — กดบันทึกโดยไม่มีโซน = ไม่ส่งคำสั่งบันทึก → กดโซนที่มีป้าย แนะนำ */
async function selectSuggestedZone(page: Page): Promise<string> {
  const zones = erTriagePanel(page).locator('[class*="er-triage-zone-options"] button');
  await expect(zones.first(), 'ฟอร์มคัดกรองต้องมีตัวเลือกโซน').toBeVisible({ timeout: 20_000 });
  const pressed = zones.and(page.locator('[aria-pressed="true"]'));
  if (await pressed.count()) return (await pressed.first().innerText()).replace(/s+/g, ' ').trim();
  const zone = zones.filter({ hasText: 'แนะนำ' }).first();
  await expect(zone, 'ต้องมีโซนที่ระบบแนะนำ').toBeVisible({ timeout: 20_000 });
  await zone.scrollIntoViewIfNeeded();
  await zone.click();
  await expect(zone, 'ต้องเลือกโซนได้').toHaveAttribute('aria-pressed', 'true');
  return (await zone.innerText()).replace(/s+/g, ' ').trim();
}

/** แถบ "ร่างถูกแก้ไขจากที่อื่น" ล็อกฟอร์มคัดกรอง — กดบันทึกแล้วไม่ส่งคำสั่ง (SBH Prod 5 พ.ย. 2026 · dev-x 3 พ.ย. SBH-3182) → กด ลองเก็บร่างอีกครั้ง ก่อนบันทึก */
async function unlockDraft(page: Page, note: (type: string, description: string) => void) {
  await page.waitForTimeout(3_000);
  const locked = page.getByRole('main').getByText('ร่างถูกแก้ไขจากที่อื่น', { exact: false });
  for (let i = 0; i < 3 && (await locked.isVisible().catch(() => false)); i++) {
    note('ฟอร์มคัดกรองล็อก', `"ร่างถูกแก้ไขจากที่อื่น" → กด ลองเก็บร่างอีกครั้ง ครั้งที่ ${i + 1}`);
    await page.getByRole('button', { name: 'ลองเก็บร่างอีกครั้ง' }).click();
    await page.waitForTimeout(5_000);
  }
  if (await locked.isVisible().catch(() => false)) throw new Error('ฟอร์มคัดกรองยังล็อก "ร่างถูกแก้ไขจากที่อื่น" หลังกด ลองเก็บร่างอีกครั้ง 3 ครั้ง');
}

/** เมนูซ้าย ประวัติการรักษา → รอรายการ Encounter → ให้เมนูซ้ายที่กางค้างหุบ (คลิกจริงที่แท็บที่เลือกอยู่ — กางค้างแล้วบังรายการฝั่งซ้ายในภาพ) */
async function openHistory(page: Page) {
  // SBH Prod: หน้า Overview ค้างวงโหลดหลังเปิดหน้าใหม่ได้ ~1 นาที (เมนูกดไม่ติด) → ลองซ้ำจนรายการขึ้น
  await expect(async () => {
    await recordMenu(page, 'ประวัติการรักษา');
    await expect(historyItems(page).first(), 'หน้าประวัติการรักษาต้องมีรายการ Encounter').toBeVisible({ timeout: 20_000 });
  }, 'เปิดหน้าประวัติการรักษา').toPass({ timeout: 180_000 });
  await collapseLeftMenu(page);
}

async function collapseLeftMenu(page: Page) {
  const tab = page.getByRole('main').getByRole('tab', { selected: true }).filter({ visible: true }).first();
  const box = await tab.boundingBox().catch(() => null);
  if (box && box.x > 360) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(1200, 700);
  await page.waitForTimeout(800);
}

/** กดแถวของรายการ / แท็บ — เมนูซ้ายที่กางค้างหลังกดเมนูบังรายการ (`click()` ค้าง) → เลื่อนเมาส์ออกแล้วส่ง click ตรงที่ element */
async function pressItem(page: Page, target: Locator) {
  await page.mouse.move(1200, 700);
  await page.waitForTimeout(500);
  await target.dispatchEvent('click');
}

/** แท็บของ Secondary tab bar (รวมแท็บที่ล้นไปอยู่ในเมนู ⋯) */
async function readTabs(page: Page): Promise<string[]> {
  const list = page.getByRole('main').getByRole('tablist').filter({ has: page.getByRole('tab', { name: /Summary/ }) }).last();
  await expect(list).toBeVisible({ timeout: 45_000 });
  return list.evaluate((root) => {
    const names: string[] = [];
    root.querySelectorAll('[role="tab"]').forEach((el) => names.push(el.textContent?.trim() ?? ''));
    return names.filter(Boolean);
  });
}

/** กดแท็บตามชื่อ — แท็บที่ล้นอยู่ในเมนู ⋯ เปิดเมนูแล้วเลือก */
async function clickTab(page: Page, name: string): Promise<Locator> {
  const main = page.getByRole('main');
  const tab = main.getByRole('tab', { name, exact: true }).first();
  if (await tab.isVisible().catch(() => false)) {
    await pressItem(page, tab);
    return tab;
  }
  const more = main.locator('.ant-tabs-nav-more').filter({ visible: true }).last();
  await more.hover();
  await more.click().catch(() => undefined);
  const item = page.locator('.ant-tabs-dropdown:visible .ant-tabs-dropdown-menu-item', { hasText: name }).first();
  await item.click();
  return more;
}

/** แท็บที่เลือกอยู่ + ข้อความ error ในแผงของแท็บนั้น */
async function activeTabState(page: Page) {
  const main = page.getByRole('main');
  const panel = main.getByRole('tabpanel').filter({ visible: true }).last();
  const errorText = await panel
    .getByText(/เกิดข้อผิดพลาด|ไม่สามารถ|Error|error/)
    .filter({ visible: true })
    .allInnerTexts()
    .catch(() => [] as string[]);
  return { panel, errors: errorText.map((t) => t.trim()).filter(Boolean) };
}

test.describe(`SBH-1038 ประวัติการรักษา / Treatment Timeline ของ ER (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 1_800_000 });

  // ---------------------------------------------------------------- เทส A: อ่านอย่างเดียว ----------------------------------------------------------------
  test(
    'A อ่านอย่างเดียว: เมนู / แถบตัวกรอง / รายการ Encounter / เงื่อนไข ER / Convert เป็น AN / แท็บของ Encounter ER',
    { tag: ['@SBH-1038', '@SBH-1038-RO', ...RO_TCS.map((n) => `@${ISSUE[n]}`)], annotation: [linear('SBH-1038'), ...RO_TCS.map((n) => linear(ISSUE[n]))] },
    async ({ page }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const { note, soft, finish } = makeRunner(page);
      // อ่านอย่างเดียว: คำสั่งที่ไม่ใช่ GET / graphql query / ehrbase query ถูกยกเลิกและจดไว้ (การเปิดหน้า Overview ส่ง PUT draft ได้เอง — screens/er.md)
      const blocked: string[] = [];
      await page.route('**/*', (route) => {
        const req = route.request();
        if (['GET', 'OPTIONS', 'HEAD'].includes(req.method())) return route.continue();
        const url = req.url();
        const body = req.postData() ?? '';
        if ((/\/graphql/.test(url) && !/\bmutation\b/.test(body)) || /\/query\/|openid-connect|\/aql/.test(url)) return route.continue();
        blocked.push(`${req.method()} ${url.replace(/^https?:\/\/[^/]+/, '')}`);
        return route.abort();
      });

      const FULL = process.env.SBH1038_FULL ?? '6903601';
      const OPD_ONLY = process.env.SBH1038_OPD ?? '6903440';
      const CONVERT = process.env.SBH1038_CONVERT ?? '6904061';

      // ---------- เตรียม: หน้าแรก (ให้แอปมี token) + ตรวจ Pre-condition ของผู้ป่วยจาก API ----------
      await page.goto(`/cortex/next/patients/${FULL}`);
      await expect(main.getByText(`HN ${FULL}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
      const fullEnc = await encountersOf(page, authorization(), FULL);
      const fullAdm = await admissionsOf(page, authorization(), FULL);
      const erEnc = fullEnc.filter((e) => isErEncounter(e) && e.latestStatusCode !== 'cancelled');
      const opdEnc = fullEnc.filter((e) => !isErEncounter(e) && ['WALK_IN', 'APPOINTMENT'].includes(e.encounterType) && e.latestStatusCode === 'completed');
      const activeAdm = fullAdm.filter((a) => a.latestStatusCode !== 'cancelled');
      note('ผู้ป่วยหลัก (Pre-condition)', `HN ${FULL}: AN ${activeAdm.map((a) => a.an).join(', ')} · EN ของ OPD ${opdEnc.length} ครั้ง · Visit ER ${erEnc.length} ครั้ง (${erEnc.map((e) => e.en).join(', ')})`);
      expect(activeAdm.length, `HN ${FULL} ต้องมี AN อย่างน้อย 2 ครั้ง`).toBeGreaterThanOrEqual(2);
      expect(erEnc.length, `HN ${FULL} ต้องมี Visit ER อย่างน้อย 2 ครั้ง`).toBeGreaterThanOrEqual(2);
      expect(opdEnc.length, `HN ${FULL} ต้องมี EN ของ OPD`).toBeGreaterThan(0);
      const er = erEnc.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];
      const erVisit: ErVisit = { hn: FULL, vn: er.vn, en: er.en };

      // ---------- TC-001 ----------
      await gotoVisit(page, erVisit);
      await page.waitForTimeout(3_000);
      await startClip(page, 'TC-001');
      let erFilters: string[] = [];
      await soft(`${TC(1)} ขั้น 1–2 เปิดผู้ป่วยที่อยู่ใน ER Zone (Visit ER) > Left Side Menu มีเมนู ประวัติการรักษา`, async () => {
        note(`${TC(1)} ผู้ป่วย`, `HN ${FULL} · ${erVisit.vn} · ${erVisit.en} (Visit ER ล่าสุด · fromApp=er)`);
        const nav = page.getByRole('navigation', { name: 'ข้อมูลและเวชระเบียนผู้ป่วย' });
        const menu = nav.getByRole('menuitem', { name: 'ประวัติการรักษา', exact: true }).first();
        await expect(menu, 'Left Side Menu ต้องมีเมนู ประวัติการรักษา').toBeAttached({ timeout: 45_000 });
        await nav.hover();
        await page.waitForTimeout(800);
        await menu.scrollIntoViewIfNeeded();
        await markEvidence(expected(menu, 'เมนู ประวัติการรักษา'));
        await snapEvidence(page, 'ก่อนกด — เมนู ประวัติการรักษา');
      });
      await soft(`${TC(1)} ขั้น 3–4 กดเมนู ประวัติการรักษา > หน้าเปิดได้ มีแถบตัวกรองครบ + รายการ Encounter ด้านซ้าย`, async () => {
        await openHistory(page);
        erFilters = await readFilterBar(page);
        await expect(historyItems(page).first(), 'ต้องมีรายการ Encounter ด้านซ้าย').toBeVisible({ timeout: 45_000 });
        const errors = await main.getByText(/เกิดข้อผิดพลาด|ระบบมีปัญหา/).filter({ visible: true }).count();
        const want = ['ช่อง วันที่เริ่ม', 'ช่อง วันที่สิ้นสุด', 'ช่องเลือก คลินิก', 'ช่องเลือก หอผู้ป่วย', 'ช่องเลือก โรค', 'ช่องเลือก แพทย์', 'checkbox OPD', 'checkbox IPD', 'checkbox การตรวจของฉัน', 'ปุ่ม Clear'];
        const rows: CompareRow[] = want.map((w) => ({ label: w.replace(/^(ช่องเลือก|ช่อง|checkbox|ปุ่ม) /, '$1 '), values: [erFilters.includes(w) ? 'มี' : 'ไม่มี'], same: erFilters.includes(w) }));
        for (const extra of erFilters.filter((f) => !want.includes(f))) rows.push({ label: `${extra} (ไม่อยู่ใน Expected)`, values: ['มี'], same: true });
        rows.push({ label: 'ข้อความ error บนหน้า', values: [errors ? `${errors} จุด` : 'ไม่มี'], same: !errors });
        await showCompareTable(page, `${ISSUE[1]} แถบตัวกรอง (Expected ของ TC)`, ['หน้าจอ'], rows, { side: 'right' });
        const bar = filterBar(page);
        await markEvidence(expected(bar, 'แถบตัวกรอง'), { target: historyItems(page).first() });
        await snapEvidence(page, 'แถบตัวกรอง + รายการ Encounter');
        note(`${TC(1)} แถบตัวกรอง (ER)`, erFilters.join(' · '));
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'แถบตัวกรองต้องมีครบตาม Expected และไม่มี error').toEqual([]);
      });
      await soft(`${TC(1)} ขั้น 5 เทียบชุดฟิลด์กับหน้า ประวัติการรักษา เดิมของ OPD และ IPD`, async () => {
        await hideCompareTable(page);
        const opd = opdEnc.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];
        await page.goto(`/cortex/next/patients/${FULL}?en=${opd.en}&vn=${opd.vn}`);
        await expect(main.getByText(`HN ${FULL}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await openHistory(page);
        const opdFilters = await readFilterBar(page);
        const ipd = activeAdm[0];
        await page.goto(`/cortex/next/patients/${FULL}?an=${ipd.an}&fromApp=ipd`);
        await expect(main.getByText(`HN ${FULL}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await openHistory(page);
        const ipdFilters = await readFilterBar(page);
        const all = [...new Set([...erFilters, ...opdFilters, ...ipdFilters])];
        const rows: CompareRow[] = all.map((f) => ({ label: f, values: [erFilters.includes(f) ? 'มี' : '-', opdFilters.includes(f) ? 'มี' : '-', ipdFilters.includes(f) ? 'มี' : '-'], same: erFilters.includes(f) === opdFilters.includes(f) && erFilters.includes(f) === ipdFilters.includes(f) }));
        await showCompareTable(page, `${ISSUE[1]} ชุดฟิลด์ ER / OPD (${opd.en}) / IPD (AN ${ipd.an})`, ['ER', 'OPD', 'IPD'], rows, { side: 'right' });
        await markEvidence(expected(filterBar(page), 'แถบตัวกรองของหน้าเดิม (IPD)'));
        await snapEvidence(page, 'เทียบชุดฟิลด์ ER OPD IPD');
        note(`${TC(1)} แถบตัวกรอง OPD`, opdFilters.join(' · '));
        note(`${TC(1)} แถบตัวกรอง IPD`, ipdFilters.join(' · '));
        const diff = rows.filter((r) => !r.same).map((r) => `${r.label}: ER ${r.values[0]} · OPD ${r.values[1]} · IPD ${r.values[2]}`);
        note(`${TC(1)} ต่างจากหน้าเดิม`, diff.join(' | ') || 'ไม่มี');
        // ชุดฟิลด์ที่ Expected ระบุต้องมีครบทั้ง 3 หน้า (ส่วนที่ต่าง ลงเป็นข้อสังเกต)
        expect(['ช่อง วันที่เริ่ม', 'ช่องเลือก คลินิก', 'checkbox OPD', 'checkbox IPD', 'ปุ่ม Clear'].filter((f) => !opdFilters.includes(f) || !ipdFilters.includes(f))).toEqual([]);
      });

      // ---------- TC-002 ----------
      await hideCompareTable(page);
      await gotoVisit(page, erVisit);
      await page.waitForTimeout(3_000);
      await startClip(page, 'TC-002');
      let fullItems: HistoryItem[] = [];
      await soft(`${TC(2)} ขั้น 1–3 เปิดประวัติการรักษาของผู้ป่วยที่มีครบ AN / OPD / ER โดยไม่ใส่ตัวกรอง > รายการเรียงตามวันที่`, async () => {
        await openHistory(page);
        await page.waitForTimeout(2_000);
        fullItems = await readHistory(page);
        await test.info().attach('รายการ Encounter ด้านซ้าย (HN หลัก)', { body: JSON.stringify(fullItems, null, 2), contentType: 'application/json' });
        const toKey = (d: string) => d.split('/').reverse().join('');
        const keys = fullItems.map((i) => toKey(i.date));
        const desc = keys.every((k, i) => i === 0 || keys[i - 1] >= k);
        const asc = keys.every((k, i) => i === 0 || keys[i - 1] <= k);
        note(`${TC(2)} รายการ`, fullItems.map((i) => `${i.badge} ${i.date} ${i.id}`).join(' | '));
        const rows: CompareRow[] = [
          { label: 'จำนวนแถว', values: [String(fullItems.length)], same: fullItems.length > 0 },
          { label: 'ลำดับวันที่', values: [desc ? 'ใหม่ → เก่า' : asc ? 'เก่า → ใหม่' : 'ไม่เรียง'], same: desc || asc },
          { label: 'วันที่ (บน → ล่าง)', values: [fullItems.map((i) => i.date).slice(0, 12).join(' · ')], same: desc || asc },
        ];
        await showCompareTable(page, `${ISSUE[2]} รายการด้านซ้าย`, ['หน้าจอ'], rows, { side: 'right' });
        await markEvidence(...(await historyItems(page).all()).slice(0, 6).map((item, i) => expected(item.locator('.text-sm').first(), i === 0 ? 'วันที่' : '')));
        await snapEvidence(page, 'รายการเรียงตามวันที่');
        expect(desc || asc, 'รายการด้านซ้ายต้องเรียงตามวันที่').toBe(true);
      });
      await soft(`${TC(2)} ขั้น 4 badge ของแถว IPD / OPD / ER`, async () => {
        await hideCompareTable(page);
        const kinds = ['I', 'O', 'ER'];
        const rows: CompareRow[] = kinds.map((k) => {
          const it = fullItems.find((i) => i.badge === k);
          const want = k === 'I' ? 'เขียว' : k === 'O' ? 'ส้ม' : 'แดงเข้ม';
          return { label: `badge ${k} (Expected สี${want})`, values: [it ? `มี · ${it.badgeColor} · ${it.id}` : 'ไม่มีแถว'], same: !!it };
        });
        await showCompareTable(page, `${ISSUE[2]} badge 3 ประเภท`, ['หน้าจอ (สีพื้น badge · เลขที่)'], rows, { side: 'right' });
        // แถว I อาจอยู่ล่างของรายการ → เลื่อนให้เห็นทีละประเภทแล้วถ่าย
        for (const k of kinds) {
          const item = historyItems(page).filter({ has: page.locator('.ant-tag-solid', { hasText: new RegExp(`^${k}$`) }) }).first();
          if (!(await item.count())) continue;
          await item.scrollIntoViewIfNeeded();
          await markEvidence({ target: item.locator('.ant-tag-solid').first() });
          await snapEvidence(page, `badge ${k}`);
        }
        note(`${TC(2)} badge`, rows.map((r) => `${r.label}: ${r.values[0]}`).join(' | '));
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'ต้องมีแถวครบทั้ง IPD / OPD / ER').toEqual([]);
      });
      await soft(`${TC(2)} ขั้น 5 เนื้อในแถว ER: badge ER แดงเข้ม + แถบแดงซ้าย · หน่วยบริการ ห้องฉุกเฉิน (ER) · ESI · สถานะ · Dx`, async () => {
        await hideCompareTable(page);
        const it = fullItems.find((i) => i.badge === 'ER');
        expect(it, 'ต้องมีแถว ER').toBeTruthy();
        const item = historyItem(page, it!.id);
        await item.scrollIntoViewIfNeeded();
        const rows: CompareRow[] = [
          { label: 'badge ER สีแดงเข้ม', values: [it!.badgeColor], same: /rgb\((1[0-9]{2}|2[0-9]{2}), ([0-4]?[0-9]), ([0-4]?[0-9])\)/.test(it!.badgeColor) },
          { label: 'แถบสีแดงด้านซ้ายของแถว', values: [it!.stripe || 'ไม่มี'], same: !!it!.stripe },
          { label: 'หน่วยบริการ "ห้องฉุกเฉิน (ER)"', values: [it!.unit || '-'], same: /ห้องฉุกเฉิน \(ER\)/.test(it!.unit) },
          { label: 'ระดับ ESI', values: [/ESI/.test(JSON.stringify(it)) ? 'มี' : 'ไม่มี'], same: /ESI/.test(JSON.stringify(it)) },
          { label: 'สถานะ', values: [it!.status || '-'], same: !!it!.status },
          { label: 'บรรทัด Dx', values: [it!.dx || '-'], same: /^Dx:/.test(it!.dx) },
        ];
        await showCompareTable(page, `${ISSUE[2]} แถว ER ${it!.id} เทียบ Mock up 1`, ['หน้าจอ'], rows, { side: 'right' });
        await markEvidence(expected(item, 'แถว ER'));
        await snapEvidence(page, 'เนื้อในแถว ER');
        await holdForClip(page, 2_000);
        note(`${TC(2)} แถว ER`, rows.map((r) => `${r.label}: ${r.values[0]}${r.same ? '' : ' ✗'}`).join(' | '));
        expect(rows.filter((r) => !r.same).map((r) => `${r.label} — จริง: ${r.values[0]}`), 'แถว ER ต้องตรง Mock up 1').toEqual([]);
      });

      // ---------- TC-003 ----------
      await hideCompareTable(page);
      await startClip(page, 'TC-003');
      await soft(`${TC(3)} ขั้น 1–2 ผู้ป่วยรายที่ 1 (มี VN + EN ที่ Location แผนกฉุกเฉิน) มีแถว ER`, async () => {
        const erIds = erEnc.map((e) => e.en);
        const shownEr = fullItems.filter((i) => i.badge === 'ER').map((i) => i.id);
        const rows: CompareRow[] = erEnc.map((e) => ({ label: `${e.vn} · ${e.en} (แผนก ${e.departmentId})`, values: [shownEr.includes(e.en) ? 'มีแถว ER' : 'ไม่มีแถว'], same: shownEr.includes(e.en) }));
        await showCompareTable(page, `${ISSUE[3]} รายที่ 1 HN ${FULL}: Visit ER จาก API`, ['หน้าจอ'], rows, { side: 'right' });
        const first = historyItem(page, erIds[0]);
        await first.scrollIntoViewIfNeeded();
        await markEvidence(...shownEr.slice(0, 3).map((id) => expected(historyItem(page, id), `ER ${id}`)));
        await snapEvidence(page, 'รายที่ 1 มีแถว ER');
        note(`${TC(3)} รายที่ 1`, `HN ${FULL} · Visit ER ใน API ${erIds.join(', ')} · แถว ER บนจอ ${shownEr.join(', ')}`);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'Visit ER ทุกครั้งต้องมีแถว ER').toEqual([]);
      });
      await soft(`${TC(3)} ขั้น 3–5 ผู้ป่วยรายที่ 2 (มี EN แต่ Location ไม่ใช่แผนกฉุกเฉิน) ไม่มีแถว ER`, async () => {
        await hideCompareTable(page);
        const enc2 = (await encountersOf(page, authorization(), OPD_ONLY)).filter((e) => e.latestStatusCode !== 'cancelled');
        const er2 = enc2.filter(isErEncounter);
        expect(er2, `HN ${OPD_ONLY} ต้องไม่มี Visit ER (Pre-condition)`).toEqual([]);
        const opd2 = enc2.filter((e) => ['WALK_IN', 'APPOINTMENT'].includes(e.encounterType)).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];
        await page.goto(`/cortex/next/patients/${OPD_ONLY}?en=${opd2.en}&vn=${opd2.vn}`);
        await expect(main.getByText(`HN ${OPD_ONLY}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
        await openHistory(page);
        await expect(historyItems(page).first()).toBeVisible({ timeout: 45_000 });
        await page.waitForTimeout(2_000);
        const items2 = await readHistory(page);
        await test.info().attach(`รายการ Encounter HN ${OPD_ONLY}`, { body: JSON.stringify(items2, null, 2), contentType: 'application/json' });
        const badges = [...new Set(items2.map((i) => i.badge))];
        const rows: CompareRow[] = [
          { label: `Encounter ใน API (แผนก)`, values: [[...new Set(enc2.map((e) => e.departmentId ?? '-'))].join(', ')], same: true },
          { label: 'แถวบนจอ (badge)', values: [`${items2.length} แถว · ${badges.join(' / ')}`], same: true },
          { label: 'แถว ER', values: [items2.some((i) => i.badge === 'ER') ? 'มี' : 'ไม่มี'], same: !items2.some((i) => i.badge === 'ER') },
        ];
        await showCompareTable(page, `${ISSUE[3]} รายที่ 2 HN ${OPD_ONLY} (ไม่มี Visit ER)`, ['หน้าจอ / API'], rows, { side: 'right' });
        await markEvidence(...(await historyItems(page).all()).slice(0, 5).map((item) => ({ target: item.locator('.ant-tag-solid').first() })));
        await snapEvidence(page, 'รายที่ 2 ไม่มีแถว ER');
        note(`${TC(3)} รายที่ 2`, `HN ${OPD_ONLY} · ${items2.length} แถว badge ${badges.join(' / ')}`);
        expect(items2.some((i) => i.badge === 'ER'), 'ผู้ป่วยรายที่ 2 ต้องไม่มีแถว ER').toBe(false);
      });

      // ---------- TC-005 ----------
      await hideCompareTable(page);
      await startClip(page, 'TC-005');
      await soft(`${TC(5)} ขั้น 1–4 ผู้ป่วยที่มี Visit ER แล้วได้ AN > เปิดประวัติการรักษา หาแถวของ Visit นั้น`, async () => {
        const encC = await encountersOf(page, authorization(), CONVERT);
        const admC = (await admissionsOf(page, authorization(), CONVERT)).filter((a) => a.latestStatusCode !== 'cancelled');
        const erC = encC.filter(isErEncounter)[0];
        expect(erC, `HN ${CONVERT} ต้องมี Visit ER`).toBeTruthy();
        expect(admC.length, `HN ${CONVERT} ต้องมี AN`).toBeGreaterThan(0);
        note(`${TC(5)} ผู้ป่วย`, `HN ${CONVERT} · VN เดิม ${erC.vn} (EN ${erC.en}) · AN ${admC.map((a) => `${a.an} (admitRequest ${a.admitRequestId ?? '-'} · ${hhmm(a.admissionDatetime)} ${a.admissionDatetime.slice(0, 10)})`).join(', ')}`);
        await gotoVisit(page, { hn: CONVERT, vn: erC.vn, en: erC.en });
        await openHistory(page);
        await expect(historyItems(page).first()).toBeVisible({ timeout: 45_000 });
        await page.waitForTimeout(2_000);
        const itemsC = await readHistory(page);
        await test.info().attach(`รายการ Encounter HN ${CONVERT}`, { body: JSON.stringify(itemsC, null, 2), contentType: 'application/json' });
        const rows: CompareRow[] = [
          ...admC.map((a) => {
            const it = itemsC.find((i) => i.id.includes(a.an));
            return { label: `AN ${a.an}`, values: [it ? `${it.badge} · ${it.date} · ${it.unit}` : 'ไม่มีแถว'], same: !!it && it.badge === 'I' };
          }),
          (() => {
            const it = itemsC.find((i) => i.id === erC.en);
            return { label: `Visit เดิม ${erC.vn} (EN ${erC.en})`, values: [it ? `${it.badge} · ${it.date} · ${it.unit}` : 'ไม่มีแถว'], same: !!it };
          })(),
        ];
        await showCompareTable(page, `${ISSUE[5]} แถวของ AN และ Visit เดิม`, ['หน้าจอ (badge · วันที่ · หน่วย)'], rows, { side: 'right' });
        const marks = [];
        for (const a of admC) {
          const it = itemsC.find((i) => i.id.includes(a.an));
          if (it) marks.push(expected(historyItem(page, it.id), `AN ${a.an}`));
        }
        if (itemsC.find((i) => i.id === erC.en)) marks.push(expected(historyItem(page, erC.en), `VN เดิม`));
        await markEvidence(...marks);
        await snapEvidence(page, 'แถว AN และ Visit เดิม');
        note(`${TC(5)} รายการ`, itemsC.map((i) => `${i.badge} ${i.date} ${i.id}`).join(' | '));
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[0]}`), 'Visit ที่ได้ AN ต้องแสดงเป็นแถว IPD (badge I + AN) และ Visit เดิมไม่หาย').toEqual([]);
      });
      await soft(`${TC(5)} ขั้น 5 กดแถว AN > Secondary tab bar เป็นชุดของ IPD`, async () => {
        await hideCompareTable(page);
        const ipdItem = historyItems(page).filter({ has: page.locator('.ant-tag-solid', { hasText: /^I$/ }) }).first();
        await ipdItem.scrollIntoViewIfNeeded();
        await markEvidence(clicked(ipdItem));
        await snapEvidence(page, 'ก่อนกด — แถว AN');
        await pressItem(page, ipdItem);
        await page.waitForTimeout(4_000);
        const tabs = await readTabs(page);
        const erSet = ['ER Summary', 'CPR Progression'];
        const rows: CompareRow[] = [{ label: 'แท็บที่แสดง', values: [tabs.join(' · ')], same: !tabs.some((t) => erSet.includes(t)) }];
        await showCompareTable(page, `${ISSUE[5]} แท็บของแถว AN (ต้องเป็นชุด IPD ไม่ใช่ชุด ER)`, ['หน้าจอ'], rows, { side: 'right' });
        await markEvidence(expected(page.getByRole('main').getByRole('tablist').filter({ has: page.getByRole('tab', { name: 'IPD Summary' }) }).first(), 'แท็บชุด IPD'));
        await holdForClip(page, 2_000);
        await snapEvidence(page, 'แท็บของแถว AN');
        note(`${TC(5)} แท็บของแถว AN`, tabs.join(' · '));
        expect(tabs.filter((t) => erSet.includes(t)), 'แถว AN ต้องไม่ใช้แท็บชุดของ ER').toEqual([]);
      });

      // ---------- TC-006 ----------
      await hideCompareTable(page);
      await gotoVisit(page, erVisit);
      await page.waitForTimeout(3_000);
      await startClip(page, 'TC-006');
      let erTabs: string[] = [];
      await soft(`${TC(6)} ขั้น 1–3 เลือกแถว ER > แท็บใน Secondary tab bar · ไม่มี OPD Pre-Assessment`, async () => {
        await openHistory(page);
        const item = historyItem(page, erVisit.en);
        await expect(item).toBeVisible({ timeout: 45_000 });
        await pressItem(page, item);
        await page.waitForTimeout(3_000);
        erTabs = await readTabs(page);
        const want = ['ER Summary', 'CPR Progression', 'Timeline', 'ประวัติ Custom Form', 'ค่าใช้จ่าย'];
        const rows: CompareRow[] = [
          ...want.map((w) => ({ label: w === 'CPR Progression' ? 'CPR Progression (Form)' : w, values: [erTabs.includes(w) ? `มี (ลำดับ ${erTabs.indexOf(w) + 1})` : 'ไม่มี'], same: erTabs.includes(w) })),
          { label: 'OPD Pre-Assessment', values: [erTabs.includes('OPD Pre-Assessment') ? 'มี' : 'ไม่มี'], same: !erTabs.includes('OPD Pre-Assessment') },
          ...erTabs.filter((t) => !want.includes(t)).map((t) => ({ label: `${t} (ไม่อยู่ใน Expected)`, values: [`มี (ลำดับ ${erTabs.indexOf(t) + 1})`], same: true })),
        ];
        await showCompareTable(page, `${ISSUE[6]} แท็บของ Encounter ER ${erVisit.en}`, ['หน้าจอ'], rows, { side: 'right' });
        await markEvidence(expected(item, 'แถว ER'), expected(page.getByRole('main').getByRole('tablist').filter({ visible: true }).last(), 'Secondary tab bar'));
        await snapEvidence(page, 'แท็บของ Encounter ER');
        note(`${TC(6)} แท็บ ER`, erTabs.join(' · '));
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'Encounter ER ต้องมีแท็บครบ และไม่มี OPD Pre-Assessment').toEqual([]);
      });
      await soft(`${TC(6)} ขั้น 4 กดเปิดทีละแท็บ ไม่มีข้อความ error`, async () => {
        await hideCompareTable(page);
        const result: CompareRow[] = [];
        for (const name of erTabs) {
          const tab = await clickTab(page, name);
          await page.waitForTimeout(4_000);
          const { errors } = await activeTabState(page);
          result.push({ label: name, values: [errors.length ? errors.join(' / ').slice(0, 80) : 'เปิดได้'], same: !errors.length });
          await markEvidence(clicked(tab, name));
          await snapEvidence(page, `แท็บ ${name}`);
        }
        await showCompareTable(page, `${ISSUE[6]} เปิดทีละแท็บ`, ['ผล'], result, { side: 'right' });
        await snapEvidence(page, 'สรุปเปิดทีละแท็บ');
        expect(result.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[0]}`), 'ทุกแท็บต้องเปิดได้ไม่มี error').toEqual([]);
      });
      await soft(`${TC(6)} ขั้น 5 เลือกแถว OPD แล้วเทียบชุดแท็บกับ ER`, async () => {
        await hideCompareTable(page);
        const opdItem = historyItems(page).filter({ has: page.locator('.ant-tag-solid', { hasText: /^O$/ }) }).first();
        await opdItem.scrollIntoViewIfNeeded();
        await pressItem(page, opdItem);
        await page.waitForTimeout(3_000);
        const opdTabs = await readTabs(page);
        const all = [...new Set([...erTabs, ...opdTabs])];
        const rows: CompareRow[] = all.map((t) => ({ label: t, values: [erTabs.includes(t) ? `${erTabs.indexOf(t) + 1}` : '-', opdTabs.includes(t) ? `${opdTabs.indexOf(t) + 1}` : '-'], same: true }));
        await showCompareTable(page, `${ISSUE[6]} ชุดแท็บ ER เทียบ OPD (ลำดับ)`, ['ER', 'OPD'], rows, { side: 'right' });
        await markEvidence(expected(opdItem, 'แถว OPD'), expected(page.getByRole('main').getByRole('tablist').filter({ visible: true }).last(), 'แท็บของ OPD'));
        await snapEvidence(page, 'แท็บของ OPD');
        note(`${TC(6)} แท็บ OPD`, opdTabs.join(' · '));
        expect(opdTabs.includes('OPD Summary') && erTabs.includes('ER Summary'), 'OPD Summary ต้องเปลี่ยนเป็น ER Summary').toBe(true);
        expect(opdTabs.includes('OPD Pre-Assessment') && erTabs.includes('CPR Progression') && !erTabs.includes('OPD Pre-Assessment'), 'OPD Pre-Assessment ต้องถูกแทนด้วย CPR Progression').toBe(true);
      });

      await hideCompareTable(page);
      await startClip(page, 'after');
      note('คำสั่งที่ถูกกันไว้ (อ่านอย่างเดียว)', blocked.join(' | ') || 'ไม่มี');
      finish();
    },
  );

  // ---------------------------------------------------------------- เทส C: หลักฐาน TC-016 ฝั่งตอบรับ (อ่านอย่างเดียว) ----------------------------------------------------------------
  // บัญชีหลัก (แพทย์ที่ถูกขอปรึกษา) เปิด ประวัติ Consult > ตอบกลับ consult ของคำขอเดิม → ถ่ายหน้าต่างที่ไม่มีช่องกรอกคำตอบ · ไม่กดบันทึก
  // SBH1038_VISIT=<HN>,<VN>,<EN> · SBH1038_CONSULT=<ปัญหา>|<เวลา>
  test(
    'C อ่านอย่างเดียว: แพทย์ที่ถูกขอปรึกษาเปิดคำขอ Consult แล้วไม่มีช่องตอบกลับ (TC-016)',
    { tag: ['@SBH-1038', '@SBH-1038-CONSULTVIEW', `@${ISSUE[16]}`], annotation: [linear(ISSUE[16])] },
    async ({ page }) => {
      const [hn, vn, en] = (process.env.SBH1038_VISIT ?? '').split(',');
      const problem = (process.env.SBH1038_CONSULT ?? '').split('|')[0];
      test.skip(!hn || !problem, 'ต้องระบุ SBH1038_VISIT และ SBH1038_CONSULT');
      const main = page.getByRole('main');
      await page.route('**/*', (route) => {
        const req = route.request();
        const body = req.postData() ?? '';
        if (['GET', 'OPTIONS', 'HEAD'].includes(req.method()) || (/\/graphql/.test(req.url()) && !/\bmutation\b/.test(body)) || /\/query\/|openid-connect/.test(req.url())) return route.continue();
        return route.abort();
      });
      await gotoVisit(page, { hn, vn, en });
      await page.waitForTimeout(3_000);
      await startClip(page, 'TC-016-reply');
      await checkStep(page, `${TC(16)} ขั้น 3 (บัญชีหลัก = แพทย์ที่ถูกขอปรึกษา) ประวัติ Consult > ตอบกลับ consult`, async () => {
        await expect(async () => {
          await recordMenu(page, 'ประวัติ Consult');
          await expect(main.getByRole('row').filter({ hasText: problem }).first()).toBeVisible({ timeout: 15_000 });
        }).toPass({ timeout: 120_000 });
        await page.mouse.move(1200, 700);
        const row = main.getByRole('row').filter({ hasText: problem }).first();
        const reply = row.getByRole('button', { name: 'ตอบกลับ consult' });
        await markEvidence(expected(row.getByText('รอตอบกลับ').first(), 'สถานะ รอตอบกลับ'), clicked(reply));
        await snapEvidence(page, 'ก่อนกด — ตอบกลับ consult');
        await reply.click();
        const dialog = page.getByRole('dialog', { name: /Consult/ });
        await expect(dialog.getByText('คำตอบ', { exact: true })).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(3_000);
        const answerBox = dialog.locator('div').filter({ has: page.getByText('คำตอบ', { exact: true }) }).filter({ has: page.getByText('ยังไม่มีการตอบกลับ') }).last();
        const editors = await dialog.locator('[contenteditable="true"]').count();
        const target = dialog.getByText(/ดร\. วิชัย/).first();
        await markEvidence(
          expected(target, 'ขอปรึกษา = บัญชีที่เปิดอยู่'),
          expected(answerBox, `ต้องมีช่องกรอกคำตอบ · จริง: ไม่มี (${editors} ช่อง)`),
          expected(dialog.getByRole('button', { name: 'ปิด', exact: true }), 'จริง: มีแค่ปุ่ม ปิด'),
          expected(page.getByText('user1 example').first(), 'บัญชีที่ล็อกอิน'),
        );
        await snapEvidence(page, 'หน้าต่าง Consult ไม่มีช่องตอบกลับ');
        await holdForClip(page, 3_000);
        test.info().annotations.push({ type: `${TC(16)} หน้าต่างตอบกลับ`, description: `editor ${editors} ช่อง · radio ตอบ Consult ${await dialog.getByRole('radio', { name: 'ตอบ Consult' }).count()}` });
        expect(editors, 'แพทย์ที่ถูกขอปรึกษาต้องมีช่องกรอกคำตอบ').toBeGreaterThan(0);
      }).catch(() => undefined);
      await startClip(page, 'after');
    },
  );

  // ---------------------------------------------------------------- เทส B: ผู้ป่วย AUTO ใหม่ ----------------------------------------------------------------
  let opened: Map<string, ErVisit>;
  test.afterEach(async ({ page }, testInfo) => {
    if (!testInfo.tags.includes('@SBH-1038-FLOW')) return;
    await hideCompareTable(page);
    if (process.env.SBH1038_KEEP) return;
    const reuse = (process.env.SBH1038_VISIT ?? '').split(',').filter(Boolean);
    const visits = [...(opened?.values() ?? []), ...(reuse.length === 3 ? [{ hn: reuse[0], vn: reuse[1], en: reuse[2] }] : [])];
    for (const visit of visits) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? `ปิด Visit ที่การเงินแล้ว${closed.outstanding ? ` (ค้างชำระ ${closed.outstanding})` : ''}` : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      testInfo.annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  test(
    'B ผู้ป่วย AUTO ใหม่: เปิด Visit → คัดกรอง → แพทย์ → CPR → Order → คัดกรองซ้ำ → Consult → Disposition แล้วตรวจ event บน Timeline',
    { tag: ['@SBH-1038', '@SBH-1038-FLOW', ...FLOW_TCS.map((n) => `@${ISSUE[n]}`)], annotation: [linear('SBH-1038'), ...FLOW_TCS.map((n) => linear(ISSUE[n]))] },
    async ({ page, browser }) => {
      opened = trackOpenedErVisits(page);
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const { note, soft, finish } = makeRunner(page);
      const reuse = (process.env.SBH1038_VISIT ?? '').split(',').filter(Boolean);
      const from = Number(process.env.SBH1038_FROM ?? 0);
      // SBH1038_SKIP=13,11 = ข้าม TC ที่ทำ / เก็บหลักฐานครบแล้วในรอบก่อน (ไม่ทำ event ซ้ำกับผู้ป่วยเดิม)
      const skip = (process.env.SBH1038_SKIP ?? '').split(',').filter(Boolean).map(Number);
      const runs = (n: number) => !skip.includes(n) && (!from || FLOW_TCS.indexOf(n) >= FLOW_TCS.indexOf(from));
      const triageToast = page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true });
      const cprToast = page.getByText('บันทึก CPR progression แล้ว', { exact: true });
      const summary = main.getByText('Clinical Summary', { exact: true });
      /** เวลาที่ "จดไว้" ของแต่ละการกระทำ (เวลาที่กด / พิมพ์) */
      const done: { what: string; type: EventType; at: Date }[] = [];
      const record = (type: EventType, what: string, at = new Date()) => {
        done.push({ what, type, at });
        note(`จดเวลา ${LABEL[type]}`, `${what} ${hhmmss(at)}`);
        return at;
      };
      // SBH1038_PREV=<TYPE>=<ISO>;… = เวลาที่จดไว้ของ event ที่ทำในรอบก่อน (ใช้เทียบใน TC-008)
      for (const pair of (process.env.SBH1038_PREV ?? '').split(';').filter(Boolean)) {
        const [type, iso] = pair.split('=');
        if (type in LABEL) record(type as EventType, 'รอบก่อน', new Date(iso));
      }
      let visit!: ErVisit;
      const MINUTE = 65_000; // เว้นให้เวลาบนจอ (HH:mm) ต่างกันอย่างน้อย 1 นาที

      const snapToast = async (toast: Locator, name: string) => {
        const shown = toast.first();
        if (!(await shown.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false))) return;
        await shown.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
        await markEvidence(alerted(shown));
        await snapEvidence(page, name);
      };
      const backToVisit = async () => {
        await hideCompareTable(page);
        await gotoVisit(page, visit);
        await expect(summary, 'หน้า Visit ต้องเป็น Overview').toBeVisible({ timeout: 90_000 });
      };
      const waitEvents = async (type: EventType, count = 1) => {
        let events: TimelineEvent[] = [];
        await expect
          .poll(async () => (events = await fetchTreatmentTimeline(page, authorization(), visit)).filter((e) => e.type === type).length, { message: `API ของ Timeline ต้องมี ${LABEL[type]} ${count} รายการ`, timeout: 60_000 })
          .toBeGreaterThanOrEqual(count);
        return events;
      };
      const openTimeline = async (n: number) => {
        await checkStep(page, `${TC(n)} ขั้น เปิดประวัติการรักษา > Encounter ER นี้ > แท็บ Timeline`, async () => {
          await openHistory(page);
          const tab = timelineTab(page);
          await expect(tab).toBeVisible({ timeout: 45_000 });
          const encounterRow = historyItem(page, visit.en);
          await markEvidence(expected(encounterRow, `Encounter ${visit.en}`), clicked(tab));
          await snapEvidence(page, 'ก่อนกด — แท็บ Timeline');
          await openTimelineTab(page);
          await page.mouse.move(700, 700);
        });
      };

      /**
       * ตรวจ event บน Timeline เทียบกับเวลาที่จดไว้: จอ (เวลา HH:mm + โดย …) · API (occurredAt + actor) · จำนวนแถว
       * `expectRows` = จำนวนแถวที่ต้องมีของ event นั้น · `pick` = แถวไหนที่ใช้เทียบ (ตั้งต้น = แถวล่าสุด)
       */
      const verifyEvents = async (n: number, checks: { type: EventType; at?: Date; actor?: RegExp; rows?: number; pick?: 'first' | 'last'; detail?: RegExp[] }[], title = 'เวลา / ผู้บันทึก') => {
        const events = await fetchTreatmentTimeline(page, authorization(), visit);
        const shown = await readTimeline(page);
        await test.info().attach(`Timeline ${TC(n)}`, { body: JSON.stringify({ shown, events, done: done.map((d) => ({ ...d, at: d.at.toISOString() })) }, null, 2), contentType: 'application/json' });
        console.log(`    Timeline: ${shown.map((r) => `${r.time} ${r.label} [${r.actor}]`).join(' | ')}`);
        const rows: CompareRow[] = [];
        const marks = [];
        const failures: string[] = [];
        for (const c of checks) {
          const onScreen = shown.filter((r) => r.label === LABEL[c.type]);
          const fromApi = events.filter((e) => e.type === c.type).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
          const idx = c.pick === 'first' ? 0 : onScreen.length - 1;
          const s = onScreen[idx];
          const a = fromApi[c.pick === 'first' ? 0 : fromApi.length - 1];
          const want = c.at ? hhmm(c.at) : '';
          const actor = (s?.actor ?? '').replace(/^โดย\s*/, '');
          const rowLocator = timelineRow(page, LABEL[c.type]);
          const detailText = s ? ((await rowLocator.nth(idx).innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ') : '';
          const okTime = !c.at || (!!s && s.time === want);
          const okApi = !c.at || (!!a && Math.abs(new Date(a.occurredAt).getTime() - c.at.getTime()) <= 120_000);
          const okActor = !c.actor || c.actor.test(actor);
          const okRows = c.rows === undefined || onScreen.length === c.rows;
          const okDetail = (c.detail ?? []).every((re) => re.test(detailText));
          const same = !!s && okTime && okApi && okActor && okRows && okDetail;
          rows.push({
            label: `${LABEL[c.type]}${onScreen.length > 1 ? ` (แถว ${idx + 1}/${onScreen.length})` : ''}`,
            values: [want ? `${want} (${hhmmss(c.at!)})` : '-', s ? `${s.time} ${s.date} · ${actor}` : '(ไม่มีแถว)', a ? `${hhmmss(a.occurredAt)} · ${a.actor?.display ?? '-'}` : '(ไม่มี)'],
            same,
          });
          if (!same) failures.push(`${LABEL[c.type]}: ${!s ? 'ไม่มีแถว' : [!okTime && `เวลาจอ ${s.time} ≠ ${want}`, !okApi && `API ${a ? hhmmss(a.occurredAt) : '-'}`, !okActor && `ผู้บันทึก "${actor}"`, !okRows && `${onScreen.length} แถว (ต้อง ${c.rows})`, !okDetail && `รายละเอียด "${detailText}"`].filter(Boolean).join(' · ')}`);
          if (s) marks.push(expected(rowLocator.nth(idx), c.detail ? `${LABEL[c.type]} + รายละเอียด` : LABEL[c.type]));
          if (c.detail) note(`${TC(n)} รายละเอียด ${LABEL[c.type]}`, detailText);
        }
        await showCompareTable(page, `${ISSUE[n]} ${title}`, ['เวลาที่จดไว้', 'หน้าจอ (เวลา วันที่ · โดย)', 'API (occurredAt · actor)'], rows, { side: 'right' });
        await markEvidence(...marks);
        await snapEvidence(page, `ผลเทียบ ${TC(n).slice(0, 6)}`);
        await holdForClip(page, 2_500);
        note(`${TC(n)} ผล`, rows.map((r) => `${r.label}: จด ${r.values[0]} · จอ ${r.values[1]} · API ${r.values[2]}`).join(' | '));
        expect(failures, `Expected ของ ${TC(n)}`).toEqual([]);
        return { shown, events };
      };

      // ---------- TC-009 เปิด Visit ER + คัดกรองครั้งแรก ----------
      // SBH1038_TRIAGE=1 + SBH1038_VISIT = ผู้ป่วยที่เปิด Visit แล้วแต่ยังไม่ได้คัดกรอง → ทำต่อตั้งแต่ TC-009 ขั้น 2 · SBH1038_ARRIVED = เวลาที่กดยืนยันเปิด Visit (ISO) จากรอบก่อน
      const resumeTriage = !!reuse.length && !!process.env.SBH1038_TRIAGE;
      if (reuse.length) {
        visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
        note('ทำต่อกับผู้ป่วยเดิม', `HN ${visit.hn} · ${visit.vn} · ${visit.en}${resumeTriage ? ' (ยังไม่ได้คัดกรอง)' : ''}`);
        await gotoVisit(page, visit);
        if (resumeTriage) {
          await startClip(page, 'TC-009');
          if (process.env.SBH1038_ARRIVED) record('ER_VISIT_ARRIVED', 'กดยืนยันเปิด Visit ER (รอบก่อน)', new Date(process.env.SBH1038_ARRIVED));
          await expect(erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
        } else await expect(summary).toBeVisible({ timeout: 90_000 });
      } else {
        await checkStep(page, `${TC(9)} ขั้น 1 เปิด Visit ER ให้ผู้ป่วยรายใหม่ (จดเวลาที่กดยืนยัน)`, async () => {
          await gotoErDashboard(page);
          await startClip(page, 'TC-009');
          const patient = newTestPatient('Tl1038');
          const before = new Date();
          visit = await registerAndOpenErVisit(page, patient);
          // เวลาที่กดยืนยันเปิด Visit อยู่ระหว่างก่อนเริ่มลงทะเบียนกับตอนได้ Visit — ใช้เวลาที่ได้ Visit (ใกล้การกดยืนยันที่สุด)
          record('ER_VISIT_ARRIVED', 'กดยืนยันเปิด Visit ER', new Date());
          note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en} · SBH1038_VISIT=${visit.hn},${visit.vn},${visit.en} (เริ่มลงทะเบียน ${hhmmss(before)})`);
          recordMockPatient('SBH-1038', patient, visit, 'SBH-1038 Treatment Timeline · Visit ER (เทสการ์ด · ปิด Visit ท้ายเทส)');
          await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true }), 'หลังเปิด Visit ต้องอยู่หน้าคัดกรอง ER').toBeVisible({ timeout: 60_000 });
          await expect(erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          await markEvidence(...[`HN ${visit.hn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first())));
          await holdForClip(page);
        });
      }
      if (!reuse.length || resumeTriage) {
        await checkStep(page, `${TC(9)} ขั้น 2 บันทึกคัดกรองครั้งที่ 1 (ESI 3) จดเวลาที่กดบันทึก`, async () => {
          await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL, chiefComplaint: !resumeTriage });
          await unlockDraft(page, note);
          const zone = await selectSuggestedZone(page);
          note('โซนตอนคัดกรองครั้งแรก', zone);
          await markEvidence(filled(erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' })), clicked(erTriageSaveButton(page)));
          await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรองครั้งแรก');
          record('FIRST_TRIAGE', 'กดบันทึกคัดกรองครั้งที่ 1');
          await saveErTriageForm(page, `บันทึกคัดกรองครั้งแรกของ ${visit.en}`);
          await snapToast(triageToast, 'หลังกด — แจ้งเตือน บันทึกคัดกรอง');
          await expect(summary, 'บันทึก Triage แล้วหน้าต้องเปลี่ยนเป็น Overview ของ Visit').toBeVisible({ timeout: 90_000 });
          await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
          await markEvidence(expected(summary));
          await holdForClip(page);
        });
        await waitEvents('FIRST_TRIAGE');
        await openTimeline(9);
        await soft(`${TC(9)} ขั้น 4–5 event เปิด Visit ER + คัดกรองครั้งแรก เวลาตรงกับที่จด + ผู้บันทึกเป็นผู้ทำรายการ`, () =>
          verifyEvents(9, [
            { type: 'ER_VISIT_ARRIVED', at: done.find((d) => d.type === 'ER_VISIT_ARRIVED')!.at, actor: /\S/ },
            { type: 'FIRST_TRIAGE', at: done.find((d) => d.type === 'FIRST_TRIAGE')!.at, actor: /\S/ },
          ]).then(() => undefined),
        );
        await backToVisit();
      }

      // ---------- TC-013 แพทย์เริ่มการรักษา = กรอกช่อง CC (ผู้ใช้ให้แก้ TC 5 พ.ย. 2026) ----------
      if (runs(13)) {
        await startClip(page, 'TC-013');
        const ccOk = await soft(`${TC(13)} ขั้น 1–2 ฟอร์ม ER Physician Note > กรอกช่อง CC (Chief Complaint) เป็นอันแรก จดเวลา`, async () => {
          await waitPhysicianNoteForm(page);
          const panel = physicianNotePanel(page);
          const ccSection = panel.locator('div').filter({ has: page.getByText(/^Chief Complaint/i) }).filter({ has: page.locator('textarea, [contenteditable="true"], input[type="text"]') }).last();
          const cc = ccSection.locator('textarea, [contenteditable="true"], input[type="text"]').first();
          await cc.scrollIntoViewIfNeeded();
          await markEvidence(expected(panel.getByText(/^Chief Complaint/i).first(), 'ช่อง CC'), filled(cc));
          await snapEvidence(page, 'ก่อนพิมพ์ — ช่อง CC');
          const activity = page.waitForResponse((res) => res.request().method() === 'POST' && res.url().includes(`/er/encounters/${visit.en}/physician-activity`), { timeout: 30_000 });
          await cc.click();
          record('PHYSICIAN_TREATMENT_STARTED', 'เริ่มพิมพ์ช่อง CC');
          await cc.pressSequentially('ปวดท้อง 1 วัน (SBH-1038)', { delay: 30 });
          await expectOk(await activity, 'บันทึกการเริ่มรักษาของแพทย์ (physician-activity)');
          await markEvidence(filled(cc, 'กรอก CC'));
          await holdForClip(page);
        });
        if (ccOk) {
          await soft(`${TC(13)} ขั้น 3–4 เว้นระยะ แล้วกรอกช่องอื่น (ประวัติเจ็บป่วยปัจจุบัน) อีกครั้ง`, async () => {
            await page.waitForTimeout(MINUTE);
            const illness = physicianNoteIllness(page);
            await illness.scrollIntoViewIfNeeded();
            const at = new Date();
            note(`${TC(13)} กรอกช่องที่ 2`, `ประวัติเจ็บป่วยปัจจุบัน ${hhmmss(at)}`);
            await illness.click();
            await illness.pressSequentially('ปวดท้องใต้ลิ้นปี่ ไม่มีไข้', { delay: 30 });
            await markEvidence(filled(illness, 'กรอกช่องที่ 2 (ภายหลัง)'));
            await holdForClip(page);
          });
          await waitEvents('PHYSICIAN_TREATMENT_STARTED');
          await openTimeline(13);
          await soft(`${TC(13)} ขั้น 5 แถว แพทย์เริ่มการรักษา = เวลาที่กรอก CC (ไม่เปลี่ยนตามการกรอกครั้งหลัง) + ผู้บันทึกเป็นแพทย์`, () =>
            verifyEvents(13, [{ type: 'PHYSICIAN_TREATMENT_STARTED', at: done.find((d) => d.type === 'PHYSICIAN_TREATMENT_STARTED')!.at, actor: /\S/, rows: 1 }]).then(() => undefined),
          );
          await backToVisit();
        }
      }

      // ---------- TC-010 แพทย์ตรวจเสร็จสิ้น (บันทึก Physician Note) ----------
      let noteDx = '';
      if (runs(10)) {
        await startClip(page, 'TC-010');
        const ok = await soft(`${TC(10)} ขั้น 2 ฟอร์ม ER Physician Note > เลือก Diagnosis > กด บันทึก (จดเวลา)`, async () => {
          await waitPhysicianNoteForm(page);
          const diagnosis = physicianNoteDiagnosis(page);
          await diagnosis.scrollIntoViewIfNeeded();
          // R21: บันทึก Physician Note ต้องเลือก Diagnosis ทุกครั้ง
          // ร่างของรอบก่อนอาจเลือก K30 ไว้แล้ว (ฟอร์มเก็บร่าง) → เลือกเฉพาะเมื่อยังไม่มี
          if (!(await diagnosis.getByText(/Functional dyspepsia/).count())) {
            const search = diagnosis.getByRole('combobox').or(diagnosis.getByPlaceholder(/ค้นหา/)).first();
            await search.click();
            await search.fill('K30');
            const option = page.getByText(/^K30\b/).filter({ visible: true }).first();
            await expect(option).toBeVisible({ timeout: 20_000 });
            noteDx = ((await option.textContent()) ?? 'K30').trim();
            await option.click();
          } else noteDx = 'K30 - Functional dyspepsia (ร่างเดิม)';
          await unlockDraft(page, note);
          const save = physicianNoteSaveButton(page);
          await expect(save).toBeEnabled({ timeout: 30_000 });
          await markEvidence(filled(diagnosis, `Diagnosis ${noteDx.slice(0, 30)}`), clicked(save));
          await snapEvidence(page, 'ก่อนกด — บันทึก Physician Note');
          // SBH Prod 5 พ.ย. 2026 รอบแรก: บันทึกได้ 503 (ระบบล้มชั่วคราว) → กดใหม่สูงสุด 3 ครั้ง · จดเวลาของครั้งที่บันทึกสำเร็จ
          let status = 0;
          for (let attempt = 1; attempt <= 3 && status !== 200; attempt++) {
            const saved = page.waitForResponse((res) => res.request().method() === 'POST' && /\/clinical-form-groups\/[^/]+\/saves$/.test(new URL(res.url()).pathname), { timeout: 60_000 });
            const at = new Date();
            await expect(save).toBeEnabled({ timeout: 60_000 });
            await save.click();
            status = (await saved).status();
            note(`${TC(10)} บันทึกครั้งที่ ${attempt}`, `${hhmmss(at)} → HTTP ${status}`);
            if (status === 200) record('PHYSICIAN_EXAM_COMPLETED', `กดบันทึก ER Physician Note (ครั้งที่ ${attempt})`, at);
            else await page.waitForTimeout(10_000);
          }
          expect(status, 'บันทึก ER Physician Note ต้องสำเร็จ (HTTP 200)').toBe(200);
          await snapToast(page.getByText(/บันทึก ER Physician Note สำเร็จ/), 'หลังกด — แจ้งเตือน บันทึก Physician Note');
          await holdForClip(page);
        });
        if (ok) {
          await waitEvents('PHYSICIAN_EXAM_COMPLETED');
          await openTimeline(10);
          await soft(`${TC(10)} ขั้น 4–5 แถว แพทย์ตรวจเสร็จสิ้น เวลาตรงกับที่กดบันทึก + ชื่อแพทย์`, () =>
            verifyEvents(10, [{ type: 'PHYSICIAN_EXAM_COMPLETED', at: done.find((d) => d.type === 'PHYSICIAN_EXAM_COMPLETED')!.at, actor: /\S/ }]).then(() => undefined),
          );
        }
      }

      // ---------- TC-007 แท็บ ER Summary เหมือนฟอร์ม ER Physician Note ----------
      if (runs(7)) {
        await startClip(page, 'TC-007');
        await soft(`${TC(7)} ขั้น 1–3 Encounter ER > แท็บ ER Summary > ไล่ดู Section และค่า`, async () => {
          await hideCompareTable(page);
          if (!(await main.getByRole('tab', { name: 'ER Summary', exact: true }).first().isVisible().catch(() => false))) await openHistory(page);
          const tab = main.getByRole('tab', { name: 'ER Summary', exact: true }).first();
          await tab.click();
          await page.waitForTimeout(5_000);
          const panel = main.getByRole('tabpanel').filter({ visible: true }).filter({ hasText: /Physician Note|ข้อมูลการรักษาที่ ER/ }).last();
          await expect(panel).toBeVisible({ timeout: 45_000 });
          const text = (await panel.innerText()).replace(/\s+/g, ' ');
          await test.info().attach('ข้อความแท็บ ER Summary', { body: text, contentType: 'text/plain' });
          const want: [string, RegExp][] = [
            ['Chief Complaint (ค่าที่กรอก)', /ปวดท้อง 1 วัน \(SBH-1038\)/],
            ['Present illness (ค่าที่กรอก)', /ปวดท้องใต้ลิ้นปี่ ไม่มีไข้/],
            ['Diagnosis (ค่าที่เลือก)', /K30/],
          ];
          const rows: CompareRow[] = want.map(([label, re]) => ({ label, values: [re.test(text) ? 'แสดงตรง' : 'ไม่พบ'], same: re.test(text) }));
          await showCompareTable(page, `${ISSUE[7]} ER Summary เทียบค่าที่บันทึกในฟอร์ม Physician Note`, ['แท็บ ER Summary'], rows, { side: 'right' });
          const marks = [];
          for (const [, re] of want) {
            const hit = panel.getByText(re).filter({ visible: true }).first();
            if (await hit.count()) marks.push(expected(hit));
          }
          await markEvidence(expected(tab, 'ER Summary'), ...marks);
          await snapEvidence(page, 'แท็บ ER Summary');
          note(`${TC(7)} ER Summary`, rows.map((r) => `${r.label}: ${r.values[0]}`).join(' | '));
          expect(rows.filter((r) => !r.same).map((r) => r.label), 'ค่าที่บันทึกในฟอร์มต้องแสดงในแท็บ ER Summary').toEqual([]);
        });
        await backToVisit();
        await soft(`${TC(7)} ขั้น 4–5 เปิดฟอร์ม ER Physician Note ของผู้ป่วยรายเดียวกันมาเทียบ`, async () => {
          await waitPhysicianNoteForm(page);
          const panel = physicianNotePanel(page);
          const sections = await panel.evaluate((root) => {
            const out: string[] = [];
            const walk = (r: Element | ShadowRoot) => {
              r.querySelectorAll('h1,h2,h3,h4,h5,[class*="title"],[class*="heading"]').forEach((el) => {
                const t = el.textContent?.trim();
                if (t && t.length < 60) out.push(t);
              });
              r.querySelectorAll('*').forEach((el) => el.shadowRoot && walk(el.shadowRoot));
            };
            walk(root);
            return [...new Set(out)];
          });
          await test.info().attach('หัวข้อในฟอร์ม ER Physician Note', { body: sections.join('\n'), contentType: 'text/plain' });
          note(`${TC(7)} หัวข้อฟอร์มแพทย์`, sections.slice(0, 40).join(' · '));
          await markEvidence(expected(panel.getByText(/^Chief Complaint/i).first(), 'ฟอร์มแพทย์ (ค่าที่บันทึก)'));
          await snapEvidence(page, 'ฟอร์ม ER Physician Note ที่บันทึก');
          await holdForClip(page);
        });
      }

      // ---------- TC-011 CPR เริ่ม / หยุด ----------
      if (runs(11)) {
        await startClip(page, 'TC-011');
        const cprStep = async (button: 'Start CPR' | 'Stop CPR', type: EventType) =>
          soft(`${TC(11)} ขั้น ${button === 'Start CPR' ? 2 : 3} ฟอร์ม CPR Progression > กด ${button} (จดเวลา)`, async () => {
            const form = await openCprForm(page);
            await expect(cprToast).toHaveCount(0, { timeout: 20_000 });
            const marks = [];
            if (button === 'Start CPR') {
              const rhythm = form.getByRole('button', { name: 'VF', exact: true });
              await rhythm.click();
              marks.push(filled(rhythm, 'Rhythm'));
            }
            const comment = form.getByRole('textbox', { name: /Add CPR comment/ });
            await comment.fill(`SBH-1038 ${button}`);
            await markEvidence(...marks, filled(comment), clicked(cprButton(form, button)));
            await snapEvidence(page, `ก่อนกด — ${button}`);
            record(type, `กด ${button}`);
            await saveCprEvent(page, form, button, button);
            await snapToast(cprToast, `หลังกด — ${button}`);
            await holdForClip(page);
          });
        if (await cprStep('Start CPR', 'CPR_STARTED')) {
          await page.waitForTimeout(MINUTE);
          if (await cprStep('Stop CPR', 'CPR_STOPPED')) {
            await waitEvents('CPR_STOPPED');
            await openTimeline(11);
            await soft(`${TC(11)} ขั้น 4–5 แถว เริ่ม CPR / หยุด CPR เวลา + ผู้บันทึก และเริ่มอยู่ก่อนหยุด`, async () => {
              const { shown } = await verifyEvents(11, [
                { type: 'CPR_STARTED', at: done.find((d) => d.type === 'CPR_STARTED')!.at, actor: /\S/, rows: 1 },
                { type: 'CPR_STOPPED', at: done.find((d) => d.type === 'CPR_STOPPED')!.at, actor: /\S/, rows: 1 },
              ]);
              const s = shown.findIndex((r) => r.label === LABEL.CPR_STARTED);
              const t = shown.findIndex((r) => r.label === LABEL.CPR_STOPPED);
              expect(s, 'เริ่ม CPR ต้องอยู่ก่อน หยุด CPR').toBeLessThan(t);
            });
          }
        }
        await backToVisit();
      }

      // ---------- TC-014 ส่ง Order หลายรอบ (One Day) ----------
      if (runs(14)) {
        await startClip(page, 'TC-014');
        // SBH Prod 5 พ.ย. 2026: ค้น IMG0000194 ใน One Day Order ไม่เจอ → ใช้ Lab รหัสอื่นที่เคยสั่งบน Prod ได้
        const codes = SYSTEM === 'dev-x' ? [SETTINGS.labCode, SETTINGS.imagingCode, SETTINGS.extraCodes[0] ?? SETTINGS.imagingCode] : [SETTINGS.labCode, 'LAB0000077', 'LAB0000092'];
        const sends: Date[] = [];
        // SBH1038_ORDER1=<เวลา ISO> = ส่งคำสั่งครั้งที่ 1 ไปแล้วรอบก่อน → เริ่มที่ครั้งที่ 2
        const startAt = process.env.SBH1038_ORDER1 ? 1 : 0;
        if (startAt) sends.push(record('ORDER_SENT', `ส่งคำสั่ง ${codes[0]} (ครั้งที่ 1 · รอบก่อน)`, new Date(process.env.SBH1038_ORDER1!)));
        for (const [i, code] of codes.entries()) {
          if (i < startAt) continue;
          if (i > 0) await page.waitForTimeout(MINUTE);
          const ok = await soft(`${TC(14)} ขั้น ${i === 0 ? 1 : i === 1 ? 2 : 5} สร้าง Order One Day (${code}) > กด ส่งคำสั่ง (จดเวลา · ครั้งที่ ${i + 1})`, async () => {
            // Order Continue ไม่มีใน Visit ER ที่ยังไม่มี AN (มีเฉพาะผู้ป่วยรอเตียง — ต้องเลือกเตียง ซึ่งทำบน Prod ไม่ได้) → ใช้ One Day ทุกครั้ง แล้วลงผลส่วน Continue ว่าตรวจไม่ได้
            const before = new Date();
            await submitOrders(page, [code]);
            const at = record('ORDER_SENT', `ส่งคำสั่ง ${code} (ครั้งที่ ${i + 1})`, new Date());
            sends.push(at);
            note(`${TC(14)} ส่งคำสั่งครั้งที่ ${i + 1}`, `${code} เริ่ม ${hhmmss(before)} · ส่งเสร็จ ${hhmmss(at)}`);
            const sent = main.getByRole('row', { name: new RegExp(`^(ส่งแล้ว|กำลังดำเนินการ) \\[${code}\\]`) }).first();
            await expect(sent, 'Order ต้องถูกส่งแล้ว').toBeVisible({ timeout: 60_000 });
            await markEvidence(expected(sent, `ส่งคำสั่งแล้ว ครั้งที่ ${i + 1}`));
            await holdForClip(page);
          });
          if (!ok) break;
          if (i === 1 || i === 2) {
            await waitEvents('ORDER_SENT');
            await openTimeline(14);
            await soft(`${TC(14)} ขั้น ${i === 1 ? '3–4' : 5} แถว ส่ง Order หลังส่งคำสั่งครั้งที่ ${i + 1} — เวลาเป็นครั้งล่าสุด`, () =>
              verifyEvents(14, [{ type: 'ORDER_SENT', at: sends[i], actor: /\S/ }], `หลังส่งคำสั่งครั้งที่ ${i + 1}`).then(() => undefined),
            );
            await backToVisit();
          }
        }
        await backToVisit();
      }

      // ---------- TC-015 คัดกรองซ้ำ 2 รอบ ----------
      if (runs(15)) {
        await startClip(page, 'TC-015');
        const retriage = async (round: number, level: 2 | 3) =>
          soft(`${TC(15)} ขั้น ${round === 1 ? 1 : 3} กด คัดกรองซ้ำ > บันทึก (รอบ ${round} · จดเวลา)`, async () => {
            const redo = main.getByRole('button', { name: /คัดกรองซ้ำ$/ }).filter({ visible: true }).first();
            await expect(redo).toBeVisible({ timeout: 60_000 });
            await redo.scrollIntoViewIfNeeded();
            await markEvidence(clicked(redo));
            await snapEvidence(page, `ก่อนกด — คัดกรองซ้ำ รอบ ${round}`);
            await redo.click();
            await fillErTriageForm(page, { level, vitals: VITALS_NORMAL, chiefComplaint: false });
            await unlockDraft(page, note);
            note(`${TC(15)} โซนคัดกรองซ้ำ รอบ ${round}`, await selectSuggestedZone(page));
            await markEvidence(filled(erTriageLevel(page, level).locator('..')), clicked(erTriageSaveButton(page)));
            await snapEvidence(page, `ก่อนกด — บันทึกคัดกรองซ้ำ รอบ ${round}`);
            record('ER_REASSESSMENT', `กดบันทึกคัดกรองซ้ำ รอบ ${round}`);
            await saveErTriageForm(page, `บันทึกคัดกรองซ้ำรอบ ${round} ของ ${visit.en}`);
            await snapToast(triageToast, `หลังกด — แจ้งเตือน คัดกรองซ้ำ รอบ ${round}`);
            await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
            await holdForClip(page);
          });
        if (await retriage(1, 3)) {
          await waitEvents('ER_REASSESSMENT');
          await openTimeline(15);
          await soft(`${TC(15)} ขั้น 2 แถว คัดกรองซ้ำ หลังรอบ 1 = เวลาครั้งที่ 1`, () =>
            verifyEvents(15, [{ type: 'ER_REASSESSMENT', at: done.filter((d) => d.type === 'ER_REASSESSMENT')[0].at, actor: /\S/ }], 'หลังคัดกรองซ้ำรอบ 1').then(() => undefined),
          );
          await backToVisit();
          await page.waitForTimeout(MINUTE);
          if (await retriage(2, 2)) {
            await waitEvents('ER_REASSESSMENT', 2);
            await openTimeline(15);
            const r = done.filter((d) => d.type === 'ER_REASSESSMENT');
            // ผู้ใช้ 5 พ.ย. 2026: ยึด Note ใน TC ("ให้สร้าง Timeline แยก") → คัดกรองซ้ำแต่ละรอบมีแถวของตัวเอง แถวล่าสุด = รอบล่าสุด
            await soft(`${TC(15)} ขั้น 4–5 หลังรอบ 2: แถวแยกทุกรอบ (ตาม Note ใน TC) แถวแรก = รอบ 1 แถวล่าสุด = รอบ 2`, () =>
              verifyEvents(15, [
                { type: 'ER_REASSESSMENT', at: r[0].at, actor: /\S/, rows: 2, pick: 'first' },
                { type: 'ER_REASSESSMENT', at: r[1].at, actor: /\S/, rows: 2, pick: 'last' },
              ], 'หลังคัดกรองซ้ำรอบ 2').then(() => undefined),
            );
            await backToVisit();
          }
        }
      }

      // ---------- TC-016 Consult ฝั่งขอ (บัญชี Doctor) + ฝั่งตอบรับ (บัญชีหลัก) ----------
      if (runs(16)) {
        await startClip(page, 'TC-016');
        // SBH1038_CONSULT=<ปัญหา>|<เวลา ISO> = คำขอ Consult ที่ส่งไว้แล้วจากรอบก่อน (ไม่ขอซ้ำ — ทำต่อที่ขั้นตรวจ + ตอบกลับ)
        const [prevProblem, prevAt] = (process.env.SBH1038_CONSULT ?? '').split('|');
        const problem = prevProblem || `SBH-1038 ขอปรึกษา ${hhmm(new Date())}`;
        const doctorName = SYSTEM === 'dev-x' ? { search: 'มานะ', name: /ทดสอบ มานะ/ } : { search: 'เอื้อเฟื้อ', name: /วิชัย.*เอื้อเฟื้อ/ };
        let target = '';
        let requester = '';
        if (prevProblem) record('CONSULT_REQUESTED', 'บันทึกคำขอ Consult (รอบก่อน · บัญชี Doctor)', new Date(prevAt));
        const doctorPage = prevProblem ? page : await openPatientAs(browser, 'Doctor', visit.hn, visit);
        const doctorRun = makeRunner(doctorPage);
        try {
          const ok = prevProblem ? true : await doctorRun.soft(`${TC(16)} ขั้น 1 (บัญชี Doctor) เมนู Consult > เลือกคลินิก + แพทย์ปลายทาง > บันทึก (จดเวลา)`, async () => {
            requester = ((await doctorPage.locator('header, [class*="header"]').getByText(/example|ดร\.|นพ\.|พญ\./).first().textContent().catch(() => '')) ?? '').trim();
            target = await requestConsult(doctorPage, problem, { clinic: 'อายุรกรรม', doctor: doctorName });
            record('CONSULT_REQUESTED', `บันทึกคำขอ Consult ถึง ${target}`);
            await markEvidence(expected(doctorPage.getByRole('main').getByText(problem).first(), 'บันทึกคำขอแล้ว'));
            await snapEvidence(doctorPage, 'หลังบันทึกคำขอ Consult');
            await holdForClip(doctorPage);
          });
          note(`${TC(16)} คำขอ`, `ผู้ขอ (บัญชี Doctor) ${requester || '-'} · ปลายทาง ${target} · ปัญหา "${problem}"`);
          if (ok) {
            await waitEvents('CONSULT_REQUESTED');
            await openTimeline(16);
            await soft(`${TC(16)} ขั้น 2 แถว ขอ Consult: เวลา + ผู้ขอ + แพทย์ที่ถูกขอปรึกษา + คลินิกปลายทาง`, () =>
              verifyEvents(16, [{ type: 'CONSULT_REQUESTED', at: done.find((d) => d.type === 'CONSULT_REQUESTED')!.at, actor: /\S/, detail: [/วิชัย|มานะ/, /อายุรกรรม/] }], 'ฝั่งขอ').then(() => undefined),
            );
            await backToVisit();
            const replied = await soft(`${TC(16)} ขั้น 3 (บัญชีหลัก = แพทย์ที่ถูก consult) ประวัติ Consult > ตอบกลับ consult > บันทึก (จดเวลา)`, async () => {
              await replyConsult(page, problem, 'รับทราบ ตอบรับ Consult (SBH-1038)');
              record('CONSULT_RESPONDED', 'บันทึกตอบกลับ Consult');
              await markEvidence(expected(main.getByRole('row').filter({ hasText: problem }).first(), 'ตอบกลับแล้ว'));
              await snapEvidence(page, 'หลังตอบกลับ Consult');
              await holdForClip(page);
            });
            if (replied) {
              await waitEvents('CONSULT_RESPONDED');
              await gotoVisit(page, visit);
              await openTimeline(16);
              await soft(`${TC(16)} ขั้น 4–5 แถว Consult ตอบกลับแล้ว: เวลา + ชื่อแพทย์ที่ตอบ · ฝั่งขออยู่ก่อนฝั่งตอบ`, async () => {
                const { shown } = await verifyEvents(16, [
                  { type: 'CONSULT_REQUESTED', at: done.find((d) => d.type === 'CONSULT_REQUESTED')!.at, actor: /\S/ },
                  { type: 'CONSULT_RESPONDED', at: done.find((d) => d.type === 'CONSULT_RESPONDED')!.at, actor: /\S/ },
                ], 'ฝั่งขอ + ฝั่งตอบรับ');
                expect(shown.findIndex((r) => r.label === LABEL.CONSULT_REQUESTED), 'ฝั่งขอต้องมาก่อนฝั่งตอบ').toBeLessThan(shown.findIndex((r) => r.label === LABEL.CONSULT_RESPONDED));
              });
              await backToVisit();
            }
          }
        } finally {
          if (doctorPage !== page) await doctorPage.context().close();
        }
        try {
          doctorRun.finish();
        } catch (error) {
          note(`${TC(16)} หน้าต่างบัญชี Doctor`, (error as Error).message.split('\n').slice(0, 3).join(' '));
          throw error;
        }
      }

      // ---------- TC-012 Disposition ----------
      if (runs(12)) {
        await startClip(page, 'TC-012');
        const method = 'With Approval';
        // SBH1038_DISPO=<เวลา ISO> = ลงนามจำหน่ายไปแล้วรอบก่อน → ตรวจ Timeline อย่างเดียว
        if (process.env.SBH1038_DISPO) record('DISPOSITION_COMPLETED', 'กดลงนามการจำหน่าย (รอบก่อน)', new Date(process.env.SBH1038_DISPO));
        const ok = process.env.SBH1038_DISPO ? true : await soft(`${TC(12)} ขั้น 2 ฟอร์ม Disposition เลือกสถานะ / วิธีการจำหน่าย > ลงนาม (จดเวลา)`, async () => {
          // เมนูขวา Disposition กดแบบ force ครั้งเดียวแล้วบางรอบไม่เปิด (SBH Prod 5 พ.ย.) → careMenu กดซ้ำจนหัว สรุปการจำหน่าย ขึ้น
          await careMenu(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }).first());
          await main.getByText('สรุปการจำหน่าย', { exact: true }).first().click();
          await page.mouse.move(600, 600);
          await draftDischarge(page, method);
          await chooseDispositionDiagnosis(page, 'K30').catch(() => undefined);
          const status = main.getByRole('radio', { name: 'Improved', exact: true });
          const how = main.getByRole('radio', { name: method, exact: true });
          await markEvidence(filled(status.locator('xpath=ancestor::label[1]'), 'สถานะ Improved'), filled(how.locator('xpath=ancestor::label[1]'), `วิธี ${method}`), clicked(page.getByTestId('er-disposition-finalize')));
          await snapEvidence(page, 'ก่อนกด — ลงนามการจำหน่าย');
          record('DISPOSITION_COMPLETED', 'กดลงนามการจำหน่าย');
          await signDisposition(page);
          await markEvidence(alerted(page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว').first()));
          await snapEvidence(page, 'หลังกด — ลงนามการจำหน่าย');
          await holdForClip(page);
        });
        if (ok) {
          await waitEvents('DISPOSITION_COMPLETED');
          await gotoVisit(page, visit);
          await openTimeline(12);
          await soft(`${TC(12)} ขั้น 4–5 แถว ลงนามการจำหน่าย: เวลา + สถานะการจำหน่าย + วิธีการจำหน่าย ตรงกับที่เลือก`, () =>
            verifyEvents(12, [{ type: 'DISPOSITION_COMPLETED', at: done.find((d) => d.type === 'DISPOSITION_COMPLETED')!.at, actor: /\S/, detail: [/Improved/, new RegExp(method)] }]).then(() => undefined),
          );
        }
      }

      // ---------- TC-008 Timeline ทั้งหมด ascending + องค์ประกอบของแต่ละแถว + เวลาตรงกับที่จด ----------
      if (runs(8)) {
        await startClip(page, 'TC-008');
        if (!(await timelinePanel(page).isVisible().catch(() => false))) {
          await gotoVisit(page, visit);
          await openTimeline(8);
        }
        await soft(`${TC(8)} ขั้น 3–5 Timeline เรียงเวลาน้อยไปมาก · ทุกแถวมี เวลา / วันที่ / ชื่อ event / ระยะเวลา / โดย … · เวลาตรงกับที่จด`, async () => {
          await hideCompareTable(page);
          const events = await fetchTreatmentTimeline(page, authorization(), visit);
          const items = await timelinePanel(page)
            .locator('[class*="_timeline-item_"]')
            .evaluateAll((els) =>
              els.map((el) => ({
                time: el.querySelector('[class*="_time_"]')?.textContent?.trim() ?? '',
                date: el.querySelector('[class*="_date_"]')?.textContent?.trim() ?? '',
                label: el.querySelector('[class*="_event-label_"]')?.textContent?.trim() ?? '',
                gap: el.querySelector('[class*="_event-gap_"]')?.textContent?.trim() ?? '',
                actor: el.querySelector('[class*="_event-actor_"]')?.textContent?.trim() ?? '',
                latest: !!el.querySelector('[class*="_dot-latest_"]'),
              })),
            );
          await test.info().attach('Timeline ทั้งหมด (TC-008)', { body: JSON.stringify({ items, events, done: done.map((d) => ({ ...d, at: d.at.toISOString() })) }, null, 2), contentType: 'application/json' });
          const key = (r: { date: string; time: string }) => `${r.date.split('/').reverse().join('')}${r.time}`;
          const ascending = items.every((r, i) => i === 0 || key(items[i - 1]) <= key(r));
          // จับคู่เวลาที่จดไว้กับแถวบนจอตามลำดับของ event ชนิดเดียวกัน
          const used: Record<string, number> = {};
          const rows: CompareRow[] = items.map((r) => {
            const type = (Object.keys(LABEL) as EventType[]).find((k) => LABEL[k] === r.label);
            const mine = type ? done.filter((d) => d.type === type) : [];
            const idx = type ? (used[type] = (used[type] ?? -1) + 1) : 0;
            const want = type === 'ORDER_SENT' ? mine[mine.length - 1] : mine[idx];
            const okParts = !!r.time && !!r.date && !!r.label && /^โดย\s*\S/.test(r.actor);
            return {
              label: `${r.time} ${r.label}`,
              values: [want ? hhmm(want.at) : '-', `${r.date} · ${r.gap || '-'} · ${r.actor}${r.latest ? ' · จุดล่าสุด' : ''}`],
              same: okParts && (!want || hhmm(want.at) === r.time),
            };
          });
          rows.push({ label: 'เรียงเวลาน้อย → มาก (ascending)', values: ['', ascending ? 'ใช่' : 'ไม่ใช่'], same: ascending });
          await showCompareTable(page, `${ISSUE[8]} Timeline ทั้งหมด ${items.length} แถว`, ['เวลาที่จดไว้', 'วันที่ · ระยะเวลา · โดย'], rows, { side: 'right' });
          await markEvidence(expected(timelinePanel(page).locator('[class*="_timeline-item_"]').first(), 'แถวแรก'), expected(timelinePanel(page).locator('[class*="_timeline-item_"]').last(), 'แถวล่าสุด'));
          await snapEvidence(page, 'Timeline ทั้งหมด');
          await holdForClip(page, 3_000);
          note(`${TC(8)} Timeline`, items.map((r) => `${r.time} ${r.label} ${r.gap} ${r.actor}`).join(' | '));
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: จด ${r.values[0]} · ${r.values[1]}`), 'Timeline ต้องเรียง ascending และแต่ละแถวมีองค์ประกอบครบ เวลาตรงกับที่จด').toEqual([]);
        });
      }

      await hideCompareTable(page);
      await startClip(page, 'after');
      finish();
    },
  );
});
