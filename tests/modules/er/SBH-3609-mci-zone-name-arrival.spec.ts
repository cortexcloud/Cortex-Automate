import fs from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { confirmOpenErVisit, dismissToast, expectOk, gotoErDashboard, openTriagePage, openVisitDialog, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import {
  createDialog,
  esiButton,
  fetchIncident,
  fillMemberTriage,
  memberRow,
  openCreateIncident,
  pressReady,
  selectMember,
  submitAllButton,
  submitCreateIncident,
  type MciIncident,
  type MciMember,
} from '../../../helpers/functions/er-mass-casualty';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel } from '../../../helpers/functions/er-triage';
import { checkStep, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { restartVideo, startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { gotoVisit } from '../../../mock-data/uat-play';

// SBH-3609 [ER][MC] Mass Casualty — หน้าคัดกรองผู้ป่วยหลายคน: ซ่อนโซน Isolation 1 / 2 · เลข 2 หลักนำหน้าชื่อ · ER Arrival แบบใหม่ (ระดับเหตุการณ์ + ระดับผู้ป่วย)
// EXE SBH-3845 → HPY SBH-3846 (TC-001–011) · EDG SBH-3847 (TC-012 / 013) — dev-x
// 1 เทส = 1 flow (R9) · คลิป 1 ไฟล์ต่อ 1 TC (R61) · TC ที่ไม่ผ่านไม่หยุดเทส (soft) แล้วเทสจบไม่ผ่านพร้อมรายการ
//   B  @SBH-3609-B  ผู้ป่วย AUTO ใหม่ เปิด Visit ER (TC-012 ฟอร์มรายเดียว) → เหตุการณ์ "SBH-3609 QA B" N=2 ไม่ใส่ ER Arrival:
//                   TC-001 → 003 → 002 → 004 → 005 → 006 → 007 → 013 (ค้น HN ผู้ป่วยรายแรกเพิ่มเข้าเหตุการณ์)
//   A  @SBH-3609-A  TC-008 (dialog สร้างเหตุการณ์) → 009 (สร้าง "SBH-3609 QA A" N=2 + ER Arrival EMS) → 010 (แก้รายที่ 2 + แก้เหตุการณ์) → 011 (ส่งทั้งเหตุการณ์ · ดู Visit)
// คำตอบผู้ใช้ 4 พ.ย. 2026: ลงผล + สถานะ · ลบ member MC B ท้ายงาน (ทำนอกเทส) · TC-011 ไม่เห็น ER Arrival บนหน้า Visit = Fail
// ทำต่อกับเหตุการณ์เดิม: SBH3609_B_ID=<id> (+ SBH3609_P=<HN>,<VN>,<EN> ผู้ป่วยรายเดียว) · SBH3609_A_ID=<id> · ข้าม TC: SBH3609_SKIP=001,003
// รัน: npx playwright test tests/modules/er/SBH-3609-mci-zone-name-arrival.spec.ts --headed --grep "@SBH-3609-B"
// SBH Prod (ผู้ใช้อนุญาต 5 พ.ย. 2026 — decisions R125): npm run card:prod -- --headed --grep "@SBH-3609-B( |$)" แล้ว "@SBH-3609-A( |$)" ทีละเทส
//   ข้าม TC-011 (Canceled) ด้วย SBH3609_SKIP=011 · ชื่อโซนอ่านจาก API (Prod ไม่มี Isolation — หน้า MC ซ่อน โซนเขียว ER ตามรหัส ER_GREEN_ZONE)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ISSUE: Record<number, string> = {
  1: 'SBH-3848', 2: 'SBH-3849', 3: 'SBH-3851', 4: 'SBH-3852', 5: 'SBH-3854', 6: 'SBH-3856', 7: 'SBH-3857',
  8: 'SBH-3859', 9: 'SBH-3861', 10: 'SBH-3863', 11: 'SBH-3865', 12: 'SBH-3867', 13: 'SBH-3868',
};
const tcId = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const TC = (n: number) => `${tcId(n)} (${ISSUE[n]})`;
const meta = (key: string, ...tcs: number[]) => ({ tag: ['@SBH-3609', `@SBH-3609-${key}`, ...tcs.map((n) => `@${ISSUE[n]}`)], annotation: [linear('SBH-3609'), ...tcs.map((n) => linear(ISSUE[n]))] });
const SKIP = new Set((process.env.SBH3609_SKIP ?? '').split(',').filter(Boolean));
const run = (n: number) => !SKIP.has(String(n).padStart(3, '0'));

const NAME_B = 'SBH-3609 QA B';
const NAME_A = 'SBH-3609 QA A';
const LOCATION = 'ถนนพหลโยธิน กม. 100';
const SHARED_CC = 'อุบัติเหตุรถบัสคว่ำ';
const TRANSPORTER_B = 'หน่วยกู้ภัย SBH-3609 B';
const TRANSPORTER_A = 'หน่วยกู้ภัย SBH-3609';
const TRANSPORTER_A_EDIT = 'หน่วยกู้ภัย SBH-3609 แก้';
// ชื่อโซนต่างกันตามระบบ (dev-x: Resuscitation / Urgency / Isolation 1 / Isolation 2 / Observation ·
// SBH Prod: โซนแดง ER / โซนเหลือง ER / โซนเขียว ER / ห้องสังเกตอาการ ER) → อ่านจาก API triage/zones ตอนรัน (loadZones)
// หน้า MC ซ่อนตาม "รหัส" โซน (โค้ดแอป: ER_GREEN_ZONE + ER_ISOLATION_2_ZONE) — dev-x รหัสนี้ชื่อ Isolation 1 / 2 · Prod คือ โซนเขียว ER
const HIDDEN_CODES = ['ER_GREEN_ZONE', 'ER_ISOLATION_2_ZONE'];
let ZONES_ALL = ['Resuscitation', 'Urgency', 'Isolation 1', 'Isolation 2', 'Observation'];
let ZONES_MC = ['Resuscitation', 'Urgency', 'Observation'];
let ZONES_HIDDEN = ['Isolation 1', 'Isolation 2'];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const zoneRe = () => new RegExp(`^(${ZONES_ALL.map(esc).join('|')})(\\s*แนะนำ)?$`);
const hiddenRe = () => new RegExp(`^(${ZONES_HIDDEN.map(esc).join('|')})`);
// ตัวเลือก "ผู้นำส่ง" มาจาก registration-options ของระบบ — dev-x: "EMS ขึ้นทะเบียน" / "ญาติ/ผู้พบเห็น/อื่นๆ" ·
// SBH Prod 5 พ.ย. 2026 ยังเป็นชุดเก่า (ไม่มีผู้มาด้วย / ญาติ / ผู้ดูแล / เจ้าหน้าที่ EMS) → ผู้ใช้ให้ใช้ "เจ้าหน้าที่ EMS" แทน (decisions R125)
//   SBH3609_ESCORT_EMS="เจ้าหน้าที่ EMS" SBH3609_ESCORT_RELATIVE="ญาติ"
const ESCORT_EMS_TEXT = process.env.SBH3609_ESCORT_EMS ?? 'EMS ขึ้นทะเบียน';
const ESCORT_RELATIVE_TEXT = process.env.SBH3609_ESCORT_RELATIVE ?? 'ญาติ/ผู้พบเห็น/อื่นๆ';
const ESCORT_EMS = new RegExp(ESCORT_EMS_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const ESCORT_RELATIVE = /ญาติ/;
const TAG_INHERITED = 'ตามเหตุการณ์';
const TAG_OWN = 'แก้ไขเฉพาะรายนี้';
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const two = (n: number) => String(n).padStart(2, '0');

/** จด request ที่เขียนข้อมูล (ER / เหตุการณ์ / ผู้ป่วย) ลง annotation ตอนจบ */
function trackWrites(page: Page) {
  const writes: string[] = [];
  page.on('response', (r) => {
    const m = r.request().method();
    if (m !== 'GET' && /cortex-api\/(er\/|patients\/|queues\/)/.test(r.url())) writes.push(`${m} ${new URL(r.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '…')} ${r.status()}`);
  });
  return writes;
}

/** รอการลงทะเบียนของเหตุการณ์จบ แล้วคืน member ที่ระบบสร้างเรียงตามลำดับ */
async function waitRegistration(page: Page, authorization: () => string, id: string): Promise<MciIncident> {
  let incident: MciIncident | undefined;
  // โหมดทำต่อ (ใช้ id เดิม) ยังไม่ได้เปิดหน้าไหน → ยังไม่มี token ของแอป
  if (!page.url().startsWith('http')) await gotoErDashboard(page);
  await expect
    .poll(async () => {
      incident = await fetchIncident(page, authorization, id);
      return `${incident.registration?.status ?? 'NONE'} ${incident.members.length}`;
    }, { message: 'การลงทะเบียนของเหตุการณ์ต้องจบ', timeout: 120_000, intervals: [1_000] })
    .toMatch(/^(FINISHED|FAILED|NONE) /);
  return incident!;
}
const bySeq = (members: MciMember[]) => [...members].filter((m) => m.registrationSeq !== null).sort((a, b) => (a.registrationSeq ?? 0) - (b.registrationSeq ?? 0));

/** แท็บ ผู้ป่วยหลายคน → รายการเหตุการณ์ → เปิดเหตุการณ์ตามรหัส */
async function openIncidentFromList(page: Page, displayCode: string, id: string) {
  const main = page.getByRole('main');
  // เส้นทางเต็มตาม Test Step (ปุ่ม "รายการเหตุการณ์" ในหน้าเหตุการณ์ไม่พากลับหน้ารายการทันที — 4 พ.ย. 2026)
  await gotoErDashboard(page);
  await openTriagePage(page);
  await page.getByRole('tab', { name: 'ผู้ป่วยหลายคน' }).click();
  const item = main.getByRole('listitem').filter({ hasText: displayCode }).first();
  await expect(item, `รายการเหตุการณ์ต้องมี ${displayCode}`).toBeVisible({ timeout: 30_000 });
  await restartVideo(page); // ตัดช่วงจอว่างตอนโหลดแอป / บอร์ดออกจากคลิปของ TC
  const open = item.getByRole('button', { name: 'ทำต่อ' });
  await markEvidence(expected(item.getByRole('heading').first(), displayCode), clicked(open, 'ทำต่อ'));
  await snapEvidence(page, `ก่อนกด — เปิด ${displayCode}`);
  await open.click();
  await expect(page).toHaveURL(new RegExp(`incidentId=${id}`), { timeout: 30_000 });
  await expect(main.getByRole('listitem').filter({ hasText: /HN \d+ ·/ }).first()).toBeVisible({ timeout: 60_000 });
}

/** แถบ "ส่งเข้าโซน" (div ชั้นในสุดที่มีทั้ง checkbox เลือกทั้งหมด และคำว่า ส่งเข้าโซน) */
const sendZoneBar = (page: Page) =>
  page.getByRole('main').locator('div').filter({ has: page.getByRole('checkbox', { name: 'เลือกทั้งหมด' }) }).filter({ has: page.getByText('ส่งเข้าโซน', { exact: true }) }).last();

/** ชื่อปุ่มโซนในพื้นที่ (ตัด "แนะนำ" ท้ายชื่อ) */
async function zoneNames(scope: Locator): Promise<string[]> {
  // ปุ่มโซนฟอร์มรายเดียวมีจำนวนที่ใช้ต่อท้าย ("Resuscitation ใช้ 9") · ฟอร์ม MC มี "แนะนำ" ต่อท้าย
  const texts = await scope.getByRole('button').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
  const re = zoneRe();
  return texts.map((t) => t.replace(/\s*ใช้\s*\d+\s*$/, '').replace(/\s*แนะนำ\s*$/, '').trim()).filter((t) => re.test(t));
}

/** รายชื่อโซนของระบบที่รัน จาก API triage/zones (ชื่อบนปุ่มภาษาไทย = nameTh || nameEn || code ตามโค้ดแอป) */
async function loadZones(page: Page, authorization: () => string) {
  const res = await page.request.get('/cortex-api/er/triage/zones?triageLevel=3', { headers: { authorization: authorization() } });
  await expectOk(res, 'อ่านรายชื่อโซน ER');
  const zones = ((await res.json()) as { zones: { code: string; nameTh?: string; nameEn?: string; rank: number }[] }).zones;
  const label = (z: (typeof zones)[number]) => z.nameTh || z.nameEn || z.code;
  const sorted = [...zones].sort((x, y) => x.rank - y.rank);
  ZONES_ALL = sorted.map(label);
  ZONES_MC = sorted.filter((z) => !HIDDEN_CODES.includes(z.code)).map(label);
  ZONES_HIDDEN = sorted.filter((z) => HIDDEN_CODES.includes(z.code)).map(label);
  return sorted.map((z) => `${z.code}=${label(z)}`).join(' · ');
}

/** กลุ่มปุ่มโซนในฟอร์มขวาของหน้า MC (แม่ของปุ่มโซนแรกที่หน้า MC แสดง ตัวสุดท้าย) */
const formZoneGroup = (page: Page) => page.getByRole('main').getByRole('button', { name: new RegExp(`^${esc(ZONES_MC[0])}(\\s*แนะนำ)?$`) }).last().locator('xpath=..');

/** กล่อง ER Arrival ของผู้ป่วยที่เลือก (ฟอร์มขวา) */
function arrivalBox(page: Page) {
  const main = page.getByRole('main');
  const region = main.getByRole('region', { name: 'ER Arrival' }).last();
  return {
    region,
    header: main.locator('.ant-collapse-header').filter({ hasText: 'ER Arrival' }).last(),
    // has ต้องเป็น locator ที่ไม่ผูกกับ main (ไม่งั้นหา main ซ้อนใน item → ไม่เจอ)
    panel: main.locator('.ant-collapse-item').filter({ has: page.getByRole('region', { name: 'ER Arrival' }) }).last(),
    radio: (name: string) => region.getByRole('radio', { name, exact: true }),
    option: (name: string) => region.locator('label').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).first(),
    escort: region.locator('.ant-select').first(),
    transporter: region.getByRole('textbox', { name: 'ระบุชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ' }),
    preHospital: region.locator('textarea').first(),
  };
}
type ArrivalScope = { radio: (n: string) => Locator; escort: Locator; transporter: Locator };

/** อ่านค่า ER Arrival ที่แสดง (วิธีการมาถึง · ระดับ EMS · ผู้นำส่ง · ชื่อผู้นำส่ง) */
async function readArrival(a: ArrivalScope) {
  const checked = async (names: string[]) => {
    for (const n of names) if (await a.radio(n).isChecked().catch(() => false)) return n;
    return '-';
  };
  const hasEms = (await a.radio('ALS').count()) > 0;
  return {
    method: await checked(['Walk-in', 'EMS', 'รับ Refer']),
    ems: hasEms ? await checked(['ไม่ระบุ', 'ALS', 'BLS', 'ILS', 'FR']) : '(ไม่มีช่อง)',
    escort: norm(await a.escort.innerText().catch(() => '')),
    transporter: await a.transporter.inputValue().catch(() => ''),
  };
}

/** เลือกผู้นำส่งจาก Ant Select (ตัวเลือกที่ตรง regex) */
async function pickEscort(page: Page, select: Locator, re: RegExp) {
  await select.click();
  const option = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: re }).first();
  await option.click();
  await expect(select).toContainText(re);
}

/** API ER Arrival ของ Encounter */
async function encounterArrival(page: Page, authorization: () => string, en: string) {
  const res = await page.request.get(`/cortex-api/er/encounters/${en}`, { headers: { authorization: authorization() } });
  await expectOk(res, `อ่าน Encounter ${en}`);
  const e = (await res.json()) as Record<string, unknown>;
  return { arrivalMethod: e.arrivalMethod, emsLevel: e.emsLevel, accompanyingPersonOptionId: e.accompanyingPersonOptionId, transporterName: e.transporterName, preHospitalInfo: e.preHospitalInfo };
}

test.describe('SBH-3609 Mass Casualty — โซน · เลขนำหน้าชื่อ · ER Arrival', () => {
  test.describe.configure({ timeout: 1_800_000 });
  const opened = new Map<string, ErVisit>();
  test.afterEach(async ({ page }) => {
    await hideCompareTable(page);
    // ผู้ป่วยรายเดียว (TC-012) ถูกเพิ่มเข้าเหตุการณ์ MC B ใน TC-013 → ล้างพร้อม member MC B ท้ายงาน (ไม่ปิดที่การเงินที่นี่)
    opened.clear();
  });

  // ================================================================================================
  test('MC B: TC-012 ฟอร์มรายเดียว 5 โซน · เหตุการณ์ N=2 ไม่มี ER Arrival — โซน · เลขนำหน้าชื่อ · ER Arrival รายคน · เพิ่มผู้ป่วยที่มี HN (Super_User)', meta('B', 12, 1, 3, 2, 4, 5, 6, 7, 13), async ({ page }) => {
    const main = page.getByRole('main');
    const authorization = trackAuthorization(page);
    const writes = trackWrites(page);
    const { note, soft, finish } = makeRunner(page);
    let id = process.env.SBH3609_B_ID ?? '';
    let incident: MciIncident;

    // ─── เตรียม + TC-012: ผู้ป่วย AUTO ใหม่ เปิด Visit ER ที่แท็บ ผู้ป่วยรายเดียว (ยังไม่คัดกรอง)
    let single: ErVisit;
    const reuse = process.env.SBH3609_P?.split(',');
    if (reuse?.length === 3) {
      single = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
      if (run(12)) await gotoVisit(page, single);
    } else
      single = await checkStep(page, 'เตรียมข้อมูล: ผู้ป่วย AUTO ใหม่ + เปิด Visit ER ที่แท็บ ผู้ป่วยรายเดียว (ยังไม่คัดกรอง)', async () => {
        await gotoErDashboard(page);
        const patient = newTestPatient('Mc3609');
        const v = await registerAndOpenErVisit(page, patient);
        note('ผู้ป่วยรายเดียว', `${patient.firstName} ${patient.familyName} · HN ${v.hn} · ${v.vn} · ${v.en} · ใช้ซ้ำ: SBH3609_P=${v.hn},${v.vn},${v.en}`);
        return v;
      });
    opened.set(single.en, single);
    if (!page.url().startsWith('http')) await gotoErDashboard(page);
    note('โซน ER ของระบบที่รัน (รหัส=ชื่อบนปุ่ม)', `${await loadZones(page, authorization)} · หน้า MC ต้องซ่อนรหัส ${HIDDEN_CODES.join(' / ')} = ${ZONES_HIDDEN.join(' / ') || '(ไม่มีในระบบนี้)'}`);

    if (run(12)) {
      const panel = erTriagePanel(page);
      const zones = panel.locator('[class*="er-triage-zone-options"]').first();
      await expect(zones, 'ฟอร์มคัดกรองรายเดียวต้องมีส่วนโซน').toBeVisible({ timeout: 90_000 });
      await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
      await startClip(page, tcId(12));
      // แท็บ ผู้ป่วยรายเดียว → เลือกผู้ป่วย (ลงทะเบียน + เปิด Visit) → ระบบพาไปฟอร์ม "คัดกรอง ER" ของผู้ป่วยรายนั้นเอง
      await soft(`${TC(12)} ขั้น 1-3 แท็บ ผู้ป่วยรายเดียว · ผู้ป่วย ER ยังไม่คัดกรอง (HN ${single.hn}) → ฟอร์มคัดกรอง ปุ่มโซนครบ ${ZONES_ALL.length} โซน`, async () => {
        await zones.scrollIntoViewIfNeeded();
        const names = await zoneNames(zones);
        const rows: CompareRow[] = ZONES_ALL.map((z) => ({ label: z, values: ['แสดง', names.includes(z) ? 'แสดง' : 'ไม่แสดง'], same: names.includes(z) }));
        await showCompareTable(page, `${ISSUE[12]} ${tcId(12)} ปุ่มโซน ฟอร์มรายเดียว`, ['Expected', 'หน้าจอ'], rows, { side: 'left', width: '520px' });
        await markEvidence(expected(zones, `${ZONES_ALL.length} โซน: ${names.join(' · ')}`), expected(page.getByText(`HN ${single.hn}`, { exact: true }).first(), 'ผู้ป่วยรายเดียว ยังไม่คัดกรอง'));
        expect(names, `Expected: ปุ่มโซนครบ ${ZONES_ALL.length} โซนเหมือนเดิม`).toEqual(ZONES_ALL);
      });
      await hideCompareTable(page);
      await clearEvidenceMarks(page);
    }

    // ─── สร้างเหตุการณ์ MC B (ขั้นเตรียมของ HPY)
    if (!id) {
      await startClip(page, 'prep-B');
      id = await checkStep(page, `เตรียมข้อมูล: สร้างเหตุการณ์ "${NAME_B}" · จำนวนผู้ป่วย 2 · ไม่ใส่ ER Arrival`, async () => {
        const { dialog, count } = await openCreateIncident(page, { name: NAME_B, location: LOCATION, chiefComplaint: SHARED_CC, headcount: 2 });
        await markEvidence(filled(dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ })), filled(count, 'จำนวนผู้ป่วย 2'), clicked(dialog.getByRole('button', { name: 'สร้าง', exact: true })));
        await snapEvidence(page, 'ก่อนกด — สร้างเหตุการณ์ MC B');
        const r = await submitCreateIncident(page, createDialog(page));
        return r.id;
      });
    }
    incident = await waitRegistration(page, authorization, id);
    const [m1, m2] = bySeq(incident.members);
    note('เหตุการณ์ MC B', `${incident.displayCode} · ${incident.name} · id ${id} · ลงทะเบียน ${JSON.stringify(incident.registration)} · รายที่ 1 HN ${m1?.hn} ${m1?.en} · รายที่ 2 HN ${m2?.hn} ${m2?.en} · ใช้ซ้ำ: SBH3609_B_ID=${id}`);
    expect(m1 && m2, 'เหตุการณ์ต้องมีผู้ป่วยที่ระบบสร้าง 2 ราย').toBeTruthy();
    const title = (m: MciMember) => memberRow(page, m.hn).getByRole('heading').first();

    // ─── TC-001 แถบ ส่งเข้าโซน
    if (run(1)) {
      await startClip(page, tcId(1));
      await soft(`${TC(1)} ขั้น 1-2 คัดกรอง > แท็บ ผู้ป่วยหลายคน > รายการเหตุการณ์ > เปิดเหตุการณ์ MC B (${incident.displayCode})`, async () => {
        await openIncidentFromList(page, incident.displayCode, id);
        await markEvidence(expected(main.getByText(incident.displayCode, { exact: false }).first(), 'เหตุการณ์ MC B'));
      });
      await soft(`${TC(1)} ขั้น 3 แถบ "ส่งเข้าโซน" มีเฉพาะ ${ZONES_MC.join(' · ')}`, async () => {
        const bar = sendZoneBar(page);
        await expect(bar).toBeVisible();
        const names = await zoneNames(bar);
        const rows: CompareRow[] = ZONES_ALL.map((z) => {
          const want = ZONES_MC.includes(z) ? 'แสดง' : 'ไม่แสดง';
          const got = names.includes(z) ? 'แสดง' : 'ไม่แสดง';
          return { label: z, values: [want, got], same: want === got };
        });
        await showCompareTable(page, `${ISSUE[1]} ${tcId(1)} แถบ ส่งเข้าโซน`, ['Expected', 'หน้าจอ'], rows, { side: 'right', width: '560px' });
        await markEvidence(expected(bar, `ส่งเข้าโซน: ${names.join(' · ')} (ไม่มี ${ZONES_HIDDEN.join(' / ')})`));
        expect(names, `Expected: แถบส่งเข้าโซนมีเฉพาะ ${ZONES_MC.join(' · ')}`).toEqual(ZONES_MC);
      });
      await hideCompareTable(page);
    } else await page.goto(`/cortex/er/triage?mode=mass-casualty&incidentId=${id}`);

    // ─── TC-003 เลขนำหน้าชื่อในรายการ
    if (run(3)) {
      await startClip(page, tcId(3));
      await soft(`${TC(3)} ขั้น 3 ชื่อแถว 1 ขึ้นต้น 01 · แถว 2 ขึ้นต้น 02 · ท้ายชื่อไม่มีเลขลำดับ`, async () => {
        const rows: CompareRow[] = [];
        for (const [i, m] of [m1, m2].entries()) {
          const text = norm(await title(m).innerText());
          const seq = two(i + 1);
          rows.push({ label: `แถว ${i + 1} (HN ${m.hn})`, values: [`ขึ้นต้น ${seq} · ท้ายไม่มีเลข`, text], same: text.startsWith(`${seq} `) && !/\s\d{1,2}$/.test(text) });
        }
        await showCompareTable(page, `${ISSUE[3]} ${tcId(3)} ชื่อผู้ป่วยในรายการ`, ['Expected', 'หน้าจอ'], rows, { side: 'right', width: '640px' });
        await markEvidence(expected(title(m1), `แถว 1: ${norm(await title(m1).innerText())}`), expected(title(m2), `แถว 2: ${norm(await title(m2).innerText())}`));
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: เลขลำดับนำหน้าชื่อ ไม่มีเลขท้ายชื่อ').toEqual([]);
      });
      await hideCompareTable(page);
    }

    // ─── TC-002 ปุ่มโซนในฟอร์ม (เลือกแถว 1)
    await clearEvidenceMarks(page);
    await startClip(page, tcId(run(2) ? 2 : 4));
    await checkStep(page, `${TC(2)} ขั้น 2 เลือกผู้ป่วยแถวที่ 1 (HN ${m1.hn})`, async () => {
      await selectMember(page, m1.hn);
      await markEvidence(clicked(title(m1), 'แถวที่ 1'));
    });
    if (run(2)) {
      await soft(`${TC(2)} ขั้น 3 ปุ่มโซนในฟอร์มขวามีเฉพาะ ${ZONES_MC.join(' · ')}`, async () => {
        const group = formZoneGroup(page);
        await group.scrollIntoViewIfNeeded();
        const names = await zoneNames(group);
        const all = ZONES_HIDDEN.length ? await main.getByRole('button', { name: hiddenRe() }).count() : 0;
        const rows: CompareRow[] = ZONES_ALL.map((z) => {
          const want = ZONES_MC.includes(z) ? 'แสดง' : 'ไม่แสดง';
          const got = names.includes(z) ? 'แสดง' : 'ไม่แสดง';
          return { label: z, values: [want, got], same: want === got };
        });
        note(`${TC(2)} ปุ่มโซนที่ต้องซ่อน (${ZONES_HIDDEN.join(' / ')}) ทั้งหน้า`, String(all));
        await showCompareTable(page, `${ISSUE[2]} ${tcId(2)} ปุ่มโซนในฟอร์ม`, ['Expected', 'หน้าจอ'], rows, { side: 'left', width: '520px' });
        await markEvidence(expected(group, `โซน: ${names.join(' · ')} (ไม่มี ${ZONES_HIDDEN.join(' / ')})`));
        expect(names, `Expected: ปุ่มโซนมีเฉพาะ ${ZONES_MC.join(' · ')}`).toEqual(ZONES_MC);
        expect(all, `ต้องไม่มีปุ่ม ${ZONES_HIDDEN.join(' / ')} ในหน้า`).toBe(0);
      });
      await hideCompareTable(page);
    }

    // ─── TC-004 ชื่อที่แถบข้อมูลผู้ป่วยขวา
    if (run(4)) {
      if (run(2)) await startClip(page, tcId(4));
      await soft(`${TC(4)} ขั้น 3 ชื่อที่แถบข้อมูลผู้ป่วย (ข้าง HN) ขึ้นต้นด้วย 01 ตรงกับรายการฝั่งซ้าย · ท้ายชื่อไม่มีเลข`, async () => {
        const ident = page.locator('[class*="stickyIdentity"]').first();
        await expect(ident).toContainText(`HN ${m1.hn}`, { timeout: 20_000 });
        const left = norm(await title(m1).innerText());
        const identText = norm(await ident.innerText());
        const name = norm(identText.replace(/^.*?HN \d+\s*(คัดลอก)?/, '').split(/วันเกิด/)[0]);
        const rows: CompareRow[] = [
          { label: 'ชื่อแถบขวา', values: ['ขึ้นต้น 01', name], same: name.startsWith('01 ') },
          { label: 'ตรงกับรายการซ้าย', values: [left, name], same: name === left },
          { label: 'ท้ายชื่อ', values: ['ไม่มีเลขลำดับ', name.match(/\s(\d{1,2})$/)?.[1] ?? 'ไม่มีเลข'], same: !/\s\d{1,2}$/.test(name) },
        ];
        await showCompareTable(page, `${ISSUE[4]} ${tcId(4)} ชื่อที่แถบข้อมูลผู้ป่วย`, ['Expected', 'หน้าจอ'], rows, { side: 'left', width: '560px', top: '300px' });
        await markEvidence(expected(ident.getByText(name, { exact: false }).first(), `แถบขวา: ${name}`), expected(title(m1), `ซ้าย: ${left}`));
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: ชื่อแถบขวาขึ้นต้น 01 ตรงกับรายการ').toEqual([]);
      });
      await hideCompareTable(page);
    }

    // ─── TC-005 กล่อง ER Arrival
    const a = arrivalBox(page);
    if (run(5)) {
      await startClip(page, tcId(5));
      await soft(`${TC(5)} ขั้น 3 กล่อง ER Arrival บนสุดของฟอร์มขวา: วิธีการมาถึง (Walk-in / EMS / รับ Refer) · ผู้นำส่ง · ชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ`, async () => {
        await expect(a.region).toBeVisible({ timeout: 30_000 });
        await a.header.scrollIntoViewIfNeeded();
        const has = async (l: Locator) => ((await l.count()) > 0 && (await l.first().isVisible()) ? 'แสดง' : 'ไม่แสดง');
        const rows: CompareRow[] = [
          { label: 'หัวข้อ ER Arrival', values: ['แสดง', await has(a.header)], same: false },
          { label: 'วิธีการมาถึง Walk-in', values: ['แสดง', await has(a.option('Walk-in'))], same: false },
          { label: 'วิธีการมาถึง EMS', values: ['แสดง', await has(a.option('EMS'))], same: false },
          { label: 'วิธีการมาถึง รับ Refer', values: ['แสดง', await has(a.option('รับ Refer'))], same: false },
          { label: 'ผู้นำส่ง', values: ['แสดง', await has(a.region.getByText('ผู้นำส่ง', { exact: true }))], same: false },
          { label: 'ชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ', values: ['แสดง', await has(a.transporter)], same: false },
        ].map((r) => ({ ...r, same: r.values[1] === 'แสดง' }));
        const box = await a.panel.boundingBox();
        note(`${TC(5)} ตำแหน่งกล่อง`, `y=${Math.round(box?.y ?? -1)} · ค่าเริ่มต้น ${JSON.stringify(await readArrival(a))}`);
        await showCompareTable(page, `${ISSUE[5]} ${tcId(5)} กล่อง ER Arrival`, ['Expected', 'หน้าจอ'], rows, { side: 'left', width: '520px', top: '420px' });
        await markEvidence(expected(a.panel, 'ER Arrival: วิธีการมาถึง · ผู้นำส่ง · ชื่อผู้นำส่ง'));
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'Expected: มีส่วน ER Arrival ครบ').toEqual([]);
      });
      await hideCompareTable(page);
    }

    // ─── TC-006 เลือก EMS → ช่องเพิ่ม
    if (run(6)) {
      await startClip(page, tcId(6));
      await soft(`${TC(6)} ขั้น 3-4 กด วิธีการมาถึง = EMS → แสดงช่อง ระดับความเร่งด่วน EMS และ ข้อมูลก่อนถึงโรงพยาบาล`, async () => {
        const patched = waitForApi(page, 'PATCH', /\/registration-details$/, 20_000);
        await markEvidence(clicked(a.option('EMS'), 'EMS'));
        await snapEvidence(page, 'ก่อนกด — วิธีการมาถึง EMS');
        await a.option('EMS').click();
        await expect(a.radio('EMS')).toBeChecked();
        note(`${TC(6)} บันทึกทันที`, `PATCH registration-details ${(await patched.catch(() => null))?.status() ?? 'ไม่พบ'}`);
        const emsLabel = a.region.getByText('ระดับความเร่งด่วน EMS', { exact: true });
        const preLabel = a.region.getByText('ข้อมูลก่อนถึงโรงพยาบาล', { exact: true });
        await expect(emsLabel).toBeVisible({ timeout: 10_000 });
        await expect(preLabel).toBeVisible();
        await markEvidence(filled(a.option('EMS'), 'EMS'), expected(emsLabel.locator('xpath=..'), 'ระดับความเร่งด่วน EMS'), expected(preLabel.locator('xpath=..'), 'ข้อมูลก่อนถึงโรงพยาบาล'));
      });
    }

    // ─── TC-007 ค่า ER Arrival รายคนยังอยู่หลังสลับผู้ป่วย
    if (run(7)) {
      await startClip(page, tcId(7));
      await soft(`${TC(7)} ขั้น 3 แถวที่ 1: EMS · ALS · ผู้นำส่ง ${ESCORT_EMS_TEXT} · ชื่อผู้นำส่ง ${TRANSPORTER_B}`, async () => {
        if (!(await a.radio('EMS').isChecked())) await a.option('EMS').click();
        await expect(a.radio('EMS')).toBeChecked();
        await a.option('ALS').click();
        await expect(a.radio('ALS')).toBeChecked();
        if (!ESCORT_EMS.test(norm(await a.escort.innerText()))) await pickEscort(page, a.escort, ESCORT_EMS);
        await expect(a.escort).toContainText(ESCORT_EMS, { timeout: 15_000 });
        const saved = waitForApi(page, 'PATCH', /\/registration-details$/, 20_000);
        await a.transporter.fill(TRANSPORTER_B);
        await a.transporter.press('Tab');
        note(`${TC(7)} บันทึกชื่อผู้นำส่ง`, `PATCH registration-details ${(await saved.catch(() => null))?.status() ?? 'ไม่พบ'}`);
        await page.waitForTimeout(1_500);
        await markEvidence(filled(a.option('EMS'), 'EMS'), filled(a.option('ALS'), 'ALS'), filled(a.escort, ESCORT_EMS_TEXT), filled(a.transporter, TRANSPORTER_B));
      });
      await soft(`${TC(7)} ขั้น 4 เลือกแถวที่ 2 แล้วกลับมาแถวที่ 1 → ค่า ER Arrival ของแถวที่ 1 ยังอยู่ครบ`, async () => {
        await clearEvidenceMarks(page);
        await selectMember(page, m2.hn);
        await markEvidence(clicked(title(m2), 'แถวที่ 2'), expected(a.panel, `ER Arrival แถว 2: ${(await readArrival(a)).method}`));
        await snapEvidence(page, 'หลังกด — เลือกแถวที่ 2');
        await clearEvidenceMarks(page);
        await selectMember(page, m1.hn);
        await expect(a.option('ALS')).toBeVisible({ timeout: 15_000 }); // input radio ของ antd ถูกซ่อน → เช็คที่ label
        const got = await readArrival(a);
        const api = await encounterArrival(page, authorization, m1.en);
        const rows: CompareRow[] = [
          { label: 'วิธีการมาถึง', values: ['EMS', got.method, String(api.arrivalMethod)], same: got.method === 'EMS' },
          { label: 'ระดับความเร่งด่วน EMS', values: ['ALS', got.ems, String(api.emsLevel)], same: got.ems === 'ALS' },
          { label: 'ผู้นำส่ง', values: [ESCORT_EMS_TEXT, got.escort, String(api.accompanyingPersonOptionId)], same: ESCORT_EMS.test(got.escort) },
          { label: 'ชื่อผู้นำส่ง', values: [TRANSPORTER_B, got.transporter, String(api.transporterName)], same: got.transporter === TRANSPORTER_B },
        ];
        note(`${TC(7)} API Encounter ${m1.en}`, JSON.stringify(api));
        await showCompareTable(page, `${ISSUE[7]} ${tcId(7)} ER Arrival แถวที่ 1 หลังสลับผู้ป่วย`, ['Expected', 'หน้าจอ', 'API'], rows, { side: 'left', width: '680px', top: '730px' });
        await markEvidence(clicked(title(m1), 'กลับมาแถวที่ 1'), expected(a.panel, `ยังอยู่: ${got.method} · ${got.ems} · ${got.transporter}`));
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: ค่า ER Arrival ของแถวที่ 1 ยังอยู่ครบ').toEqual([]);
      });
      await hideCompareTable(page);
    }

    // ─── TC-013 ค้น HN ผู้ป่วยที่มีชื่อจริง เพิ่มเข้าเหตุการณ์
    if (run(13)) {
      await clearEvidenceMarks(page);
      await startClip(page, tcId(13));
      let added: MciMember | undefined;
      await soft(`${TC(13)} ขั้น 3 ช่องค้นหาผู้ป่วย กรอก HN ${single.hn} (ผู้ป่วยที่มีชื่อจริง) > เพิ่มเข้าเหตุการณ์`, async () => {
        const search = main.getByRole('combobox', { name: 'ค้นหาผู้ป่วยด้วย HN หรือชื่อ' });
        await search.fill(single.hn);
        const option = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: single.hn }).first();
        await expect(option).toBeVisible({ timeout: 30_000 });
        await markEvidence(filled(search, `HN ${single.hn}`), clicked(option, 'เลือกผู้ป่วย'));
        await snapEvidence(page, 'ก่อนกด — เลือกผู้ป่วยจากผลค้นหา');
        await option.click();
        // ผู้ป่วยมี Visit ER ที่ใช้ซ้ำได้ → ระบบเพิ่มเข้าเหตุการณ์ทันที · ไม่มี → หน้าต่างเปิด Visit ER
        const visitDialog = openVisitDialog(page);
        if (await visitDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
          note(`${TC(13)} หลังเลือก`, 'ขึ้นหน้าต่าง เปิด Visit ER → ยืนยันเปิด Visit');
          await confirmOpenErVisit(page, visitDialog);
        }
        await expect(memberRow(page, single.hn)).toBeVisible({ timeout: 30_000 });
        incident = await fetchIncident(page, authorization, id);
        added = incident.members.find((m) => m.hn === single.hn);
        note(`${TC(13)} member ที่เพิ่ม`, `HN ${single.hn} · EN ${added?.en} · registrationSeq ${added?.registrationSeq} · patientName ${added?.patientName}`);
      });
      await soft(`${TC(13)} ขั้น 4 ชื่อผู้ป่วยรายนี้ในรายการซ้ายแสดงตามทะเบียน ไม่มีเลขลำดับนำหน้า`, async () => {
        const row = memberRow(page, single.hn);
        await row.scrollIntoViewIfNeeded();
        const text = norm(await row.getByRole('heading').first().innerText());
        const reg = norm(added?.patientName);
        const rows: CompareRow[] = [
          { label: 'ชื่อในรายการ', values: [reg || '(ชื่อตามทะเบียน)', text], same: !!reg && text === reg },
          { label: 'เลขนำหน้าชื่อ', values: ['ไม่มี', text.match(/^(\d{2}) /)?.[1] ?? 'ไม่มี'], same: !/^\d{2} /.test(text) },
        ];
        await showCompareTable(page, `${ISSUE[13]} ${tcId(13)} ชื่อผู้ป่วยที่เพิ่มเอง`, ['Expected', 'หน้าจอ'], rows, { side: 'right', width: '640px' });
        // ป้าย expected() เติม "Expected:" ให้เอง — ส่งแค่ <ที่ต้องการ> · จริง: <ที่เห็น> แบบสั้น
        await markEvidence(expected(row.getByRole('heading').first(), `ไม่มีเลขนำหน้า · จริง: ${text.match(/^\d{2}/)?.[0] ?? 'ไม่มี'} นำหน้า`));
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: ชื่อตามทะเบียน ไม่มีเลขลำดับนำหน้า').toEqual([]);
      });
      await hideCompareTable(page);
    }

    await startClip(page, 'after');
    note('คำสั่งที่เขียนข้อมูล', writes.join(' | ') || '(ไม่มี)');
    fs.writeFileSync(test.info().outputPath('mc-b.json'), JSON.stringify({ id, single, members: (await fetchIncident(page, authorization, id)).members }, null, 2));
    finish();
  });

  // ================================================================================================
  test('MC A: TC-008 dialog สร้างเหตุการณ์ · TC-009 ER Arrival จากเหตุการณ์ · TC-010 แก้เหตุการณ์ไม่ทับรายที่แก้เอง · TC-011 ER Arrival ใน Visit หลังส่ง (Super_User)', meta('A', 8, 9, 10, 11), async ({ page }) => {
    const main = page.getByRole('main');
    const authorization = trackAuthorization(page);
    const writes = trackWrites(page);
    const { note, soft, finish } = makeRunner(page);
    let id = process.env.SBH3609_A_ID ?? '';
    let incident: MciIncident;
    const a = arrivalBox(page);

    if (!id) {
      // ─── TC-008 dialog สร้างเหตุการณ์ — ส่วนการมาถึง
      await gotoErDashboard(page);
      await startClip(page, tcId(8));
      let dialog!: Locator;
      await soft(`${TC(8)} ขั้น 1-3 คัดกรอง > แท็บ ผู้ป่วยหลายคน > สร้างเหตุการณ์ → ส่วนการมาถึง: วิธีการมาถึง · ผู้นำส่ง · ชื่อผู้นำส่ง · ข้อความ "ใช้กับผู้ป่วยที่ยังไม่ได้แก้ไข…"`, async () => {
        await openTriagePage(page);
        await page.getByRole('tab', { name: 'ผู้ป่วยหลายคน' }).click();
        const create = page.getByRole('button', { name: /สร้างเหตุการณ์/ });
        await markEvidence(clicked(create));
        await snapEvidence(page, 'ก่อนกด — สร้างเหตุการณ์');
        await create.click();
        dialog = createDialog(page);
        await expect(dialog).toBeVisible();
        const hint = dialog.getByText('ใช้กับผู้ป่วยที่ยังไม่ได้แก้ไขข้อมูลการมาถึงเฉพาะราย', { exact: true });
        const has = async (l: Locator) => ((await l.count()) > 0 && (await l.first().isVisible()) ? 'แสดง' : 'ไม่แสดง');
        const rows: CompareRow[] = [
          // input radio ของ antd ถูกซ่อน → ดูที่ปุ่ม (label)
          { label: 'วิธีการมาถึง Walk-in', values: ['แสดง', await has(dialog.locator('label').filter({ hasText: /^\s*Walk-in\s*$/ }))], same: false },
          { label: 'วิธีการมาถึง EMS', values: ['แสดง', await has(dialog.locator('label').filter({ hasText: /^\s*EMS\s*$/ }))], same: false },
          { label: 'วิธีการมาถึง รับ Refer', values: ['แสดง', await has(dialog.locator('label').filter({ hasText: /^\s*รับ Refer\s*$/ }))], same: false },
          { label: 'ผู้นำส่ง', values: ['แสดง', await has(dialog.getByText('ผู้นำส่ง', { exact: true }))], same: false },
          { label: 'ชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ', values: ['แสดง', await has(dialog.getByRole('textbox', { name: 'ระบุชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ' }))], same: false },
          { label: 'ข้อความใช้กับผู้ป่วยที่ยังไม่แก้เฉพาะราย', values: ['แสดง', await has(hint)], same: false },
        ].map((r) => ({ ...r, same: r.values[1] === 'แสดง' }));
        await showCompareTable(page, `${ISSUE[8]} ${tcId(8)} ส่วนการมาถึงใน dialog สร้างเหตุการณ์`, ['Expected', 'หน้าจอ'], rows, { side: 'left', width: '560px' });
        const area = dialog
          .locator('div')
          .filter({ has: page.getByText('วิธีการมาถึง', { exact: true }) })
          .filter({ has: page.getByText('ใช้กับผู้ป่วยที่ยังไม่ได้แก้ไขข้อมูลการมาถึงเฉพาะราย', { exact: true }) })
          .last();
        await markEvidence(expected(area, 'ส่วนการมาถึง (ระดับเหตุการณ์)'));
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'Expected: ส่วนการมาถึงครบ').toEqual([]);
      });
      await hideCompareTable(page);
      await clearEvidenceMarks(page);
      if (!run(9)) {
        // โหมดเก็บ TC-008 อย่างเดียว: ปิด dialog ไม่สร้างเหตุการณ์
        await startClip(page, 'after');
        await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
        finish();
        return;
      }

      // ─── TC-009 สร้างเหตุการณ์ A + ER Arrival ระดับเหตุการณ์
      await startClip(page, tcId(9));
      await checkStep(page, `${TC(9)} ขั้น 2-3 ชื่อเหตุการณ์ ${NAME_A} · จำนวนผู้ป่วย 2 · การมาถึง EMS · ALS · ${ESCORT_EMS_TEXT} · ${TRANSPORTER_A} > กด สร้าง`, async () => {
        await dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ }).fill(NAME_A);
        await dialog.getByRole('textbox', { name: /สถานที่เกิดเหตุ/ }).fill(LOCATION);
        await dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ }).fill(SHARED_CC);
        await dialog.getByRole('spinbutton', { name: 'จำนวนผู้ป่วย' }).fill('2');
        await dialog.getByRole('spinbutton', { name: 'จำนวนผู้ป่วย' }).press('Tab');
        const opt = (name: string) => dialog.locator('label').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).first();
        // ใน dialog input radio ไม่ขึ้น checked (4 พ.ย. 2026) ทั้งที่ปุ่มถูกเลือกบนจอ → เช็ค class ของปุ่ม
        const on = /ant-radio-button-wrapper-checked/;
        await opt('EMS').click();
        await expect(opt('EMS')).toHaveClass(on);
        await expect(opt('ALS'), 'เลือก EMS แล้วต้องมีระดับความเร่งด่วน EMS').toBeVisible({ timeout: 10_000 });
        await opt('ALS').click();
        await expect(opt('ALS')).toHaveClass(on);
        const escort = dialog.locator('.ant-select').first();
        if (!ESCORT_EMS.test(norm(await escort.innerText()))) await pickEscort(page, escort, ESCORT_EMS);
        await dialog.getByRole('textbox', { name: 'ระบุชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ' }).fill(TRANSPORTER_A);
        await markEvidence(
          filled(dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ })),
          filled(dialog.getByRole('spinbutton', { name: 'จำนวนผู้ป่วย' }), 'จำนวน 2'),
          filled(opt('EMS'), 'EMS'),
          filled(opt('ALS'), 'ALS'),
          filled(escort, ESCORT_EMS_TEXT),
          filled(dialog.getByRole('textbox', { name: 'ระบุชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ' }), TRANSPORTER_A),
          clicked(dialog.getByRole('button', { name: 'สร้าง', exact: true })),
        );
        await snapEvidence(page, 'ก่อนกด — สร้างเหตุการณ์ MC A');
        const r = await submitCreateIncident(page, dialog);
        id = r.id;
        note(`${TC(9)} POST เหตุการณ์ (arrival)`, JSON.stringify((r.created as unknown as { arrival?: unknown }).arrival ?? null));
      });
    }
    incident = await waitRegistration(page, authorization, id);
    const [m1, m2] = bySeq(incident.members);
    note('เหตุการณ์ MC A', `${incident.displayCode} · ${incident.name} · id ${id} · รายที่ 1 HN ${m1?.hn} ${m1?.en} · รายที่ 2 HN ${m2?.hn} ${m2?.en} · ใช้ซ้ำ: SBH3609_A_ID=${id}`);
    expect(m1 && m2, 'เหตุการณ์ต้องมีผู้ป่วยที่ระบบสร้าง 2 ราย').toBeTruthy();
    const title = (m: MciMember) => memberRow(page, m.hn).getByRole('heading').first();
    const tag = () => a.header.getByText(new RegExp(`^(${TAG_INHERITED}|${TAG_OWN})$`)).first();

    if (run(9)) {
      if (process.env.SBH3609_A_ID) await startClip(page, tcId(9));
      await soft(`${TC(9)} ขั้น 4 รอลงทะเบียนครบ 2 ราย > เลือกแถวที่ 1 → ER Arrival ตรงกับค่าตอนสร้างเหตุการณ์ + ป้ายใช้ค่าจากเหตุการณ์`, async () => {
        if (!page.url().includes(id)) await page.goto(`/cortex/er/triage?mode=mass-casualty&incidentId=${id}`);
        await selectMember(page, m1.hn);
        await expect(a.region).toBeVisible({ timeout: 30_000 });
        await expect(a.radio('EMS')).toBeChecked({ timeout: 20_000 }).catch(() => undefined);
        const got = await readArrival(a);
        const tagText = (await tag().count()) ? norm(await tag().innerText()) : '(ไม่มีป้าย)';
        const api = await encounterArrival(page, authorization, m1.en);
        const rows: CompareRow[] = [
          { label: 'วิธีการมาถึง', values: ['EMS', got.method, String(api.arrivalMethod)], same: got.method === 'EMS' },
          { label: 'ระดับความเร่งด่วน EMS', values: ['ALS', got.ems, String(api.emsLevel)], same: got.ems === 'ALS' },
          { label: 'ผู้นำส่ง', values: [ESCORT_EMS_TEXT, got.escort, String(api.accompanyingPersonOptionId)], same: ESCORT_EMS.test(got.escort) },
          { label: 'ชื่อผู้นำส่ง', values: [TRANSPORTER_A, got.transporter, String(api.transporterName)], same: got.transporter === TRANSPORTER_A },
          { label: 'ป้าย', values: ['ใช้ค่าจากเหตุการณ์', tagText, ''], same: tagText === TAG_INHERITED },
        ];
        note(`${TC(9)} ข้อความบนป้าย`, tagText);
        await showCompareTable(page, `${ISSUE[9]} ${tcId(9)} ER Arrival แถวที่ 1 (ค่าจากเหตุการณ์)`, ['Expected', 'หน้าจอ', 'API'], rows, { side: 'left', width: '680px', top: '730px' });
        await markEvidence(expected(title(m1), 'แถวที่ 1'), expected(a.panel, `${got.method} · ${got.ems} · ${got.transporter}`), ...((await tag().count()) ? [expected(tag(), `ป้าย: ${tagText}`)] : []));
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: ER Arrival ตรงกับค่าตอนสร้างเหตุการณ์ + ป้าย').toEqual([]);
      });
      await hideCompareTable(page);
    }

    // ─── TC-010 แก้รายที่ 2 เอง → แก้เหตุการณ์ → รายที่ 2 ไม่เปลี่ยน
    if (run(10)) {
      await clearEvidenceMarks(page);
      await startClip(page, tcId(10));
      await soft(`${TC(10)} ขั้น 2 เลือกแถวที่ 2 > ER Arrival เปลี่ยนเป็น Walk-in · ผู้นำส่ง = ${ESCORT_RELATIVE_TEXT}`, async () => {
        await selectMember(page, m2.hn);
        await expect(a.region).toBeVisible({ timeout: 30_000 });
        let saved = waitForApi(page, 'PATCH', /\/registration-details$/, 20_000);
        await a.option('Walk-in').click();
        await expect(a.radio('Walk-in')).toBeChecked();
        note(`${TC(10)} Walk-in`, `PATCH ${(await saved.catch(() => null))?.status() ?? 'ไม่พบ'}`);
        saved = waitForApi(page, 'PATCH', /\/registration-details$/, 20_000);
        await pickEscort(page, a.escort, ESCORT_RELATIVE);
        note(`${TC(10)} ผู้นำส่ง`, `${norm(await a.escort.innerText())} · PATCH ${(await saved.catch(() => null))?.status() ?? 'ไม่พบ'}`);
        await page.waitForTimeout(1_500);
        await markEvidence(clicked(title(m2), 'แถวที่ 2'), filled(a.option('Walk-in'), 'Walk-in'), filled(a.escort, norm(await a.escort.innerText())), ...((await tag().count()) ? [expected(tag(), `ป้าย: ${norm(await tag().innerText())}`)] : []));
      });
      await soft(`${TC(10)} ขั้น 3 กดไอคอนแก้ไขเหตุการณ์ > ชื่อผู้นำส่ง = ${TRANSPORTER_A_EDIT} > กด อัปเดต`, async () => {
        await clearEvidenceMarks(page);
        const edit = main.getByRole('button', { name: /^edit$/ }).first();
        await markEvidence(clicked(edit, 'แก้ไขเหตุการณ์'));
        await snapEvidence(page, 'ก่อนกด — ไอคอนแก้ไขเหตุการณ์');
        await edit.click();
        const dlg = page.getByRole('dialog', { name: 'แก้ไขเหตุการณ์' });
        await expect(dlg).toBeVisible();
        const box = dlg.getByRole('textbox', { name: 'ระบุชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ' });
        note(`${TC(10)} ค่าเดิมใน dialog`, `ชื่อผู้นำส่ง "${await box.inputValue()}"`);
        await box.fill(TRANSPORTER_A_EDIT);
        const update = dlg.getByRole('button', { name: 'อัปเดต', exact: true });
        await markEvidence(filled(box, TRANSPORTER_A_EDIT), expected(dlg.getByText('ใช้กับผู้ป่วยที่ยังไม่ได้แก้ไขข้อมูลการมาถึงเฉพาะราย', { exact: true })), clicked(update));
        await snapEvidence(page, 'ก่อนกด — อัปเดตเหตุการณ์');
        const res = page.waitForResponse((r) => ['PUT', 'PATCH'].includes(r.request().method()) && r.url().includes(`/mass-casualty-incidents/${id}`), { timeout: 30_000 });
        await update.click();
        const r = await res;
        note(`${TC(10)} อัปเดตเหตุการณ์`, `${r.request().method()} ${r.status()}`);
        await expectOk(r, 'อัปเดตเหตุการณ์');
        await expect(dlg).toBeHidden({ timeout: 20_000 });
      });
      await soft(`${TC(10)} ขั้น 4 เลือกแถวที่ 2 → ยังเป็น Walk-in · ${ESCORT_RELATIVE_TEXT} ไม่เปลี่ยนตามเหตุการณ์ · ป้ายบอกว่าแก้เฉพาะราย`, async () => {
        await clearEvidenceMarks(page);
        await selectMember(page, m1.hn);
        await selectMember(page, m2.hn);
        await page.waitForTimeout(1_500);
        const got = await readArrival(a);
        const tagText = (await tag().count()) ? norm(await tag().innerText()) : '(ไม่มีป้าย)';
        const api = await encounterArrival(page, authorization, m2.en);
        const rows: CompareRow[] = [
          { label: 'วิธีการมาถึง', values: ['Walk-in', got.method, String(api.arrivalMethod)], same: got.method === 'Walk-in' },
          { label: 'ผู้นำส่ง', values: [ESCORT_RELATIVE_TEXT, got.escort, String(api.accompanyingPersonOptionId)], same: ESCORT_RELATIVE.test(got.escort) },
          { label: 'ชื่อผู้นำส่ง', values: [`ไม่เป็น ${TRANSPORTER_A_EDIT}`, got.transporter || '(ว่าง)', String(api.transporterName)], same: got.transporter !== TRANSPORTER_A_EDIT },
          { label: 'ป้าย', values: ['แก้เฉพาะราย', tagText, ''], same: tagText === TAG_OWN },
        ];
        await showCompareTable(page, `${ISSUE[10]} ${tcId(10)} ER Arrival แถวที่ 2 หลังแก้เหตุการณ์`, ['Expected', 'หน้าจอ', 'API'], rows, { side: 'left', width: '680px', top: '730px' });
        await markEvidence(clicked(title(m2), 'แถวที่ 2'), expected(a.panel, `${got.method} · ${got.escort}`), ...((await tag().count()) ? [expected(tag(), `ป้าย: ${tagText}`)] : []));
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: แถวที่ 2 ไม่เปลี่ยนตามเหตุการณ์ + ป้ายแก้เฉพาะราย').toEqual([]);
      });
      await hideCompareTable(page);
      // แถว 1 (ใช้ค่าจากเหตุการณ์) ควรได้ชื่อผู้นำส่งใหม่ — จดไว้ใช้ใน TC-011
      await selectMember(page, m1.hn);
      await page.waitForTimeout(1_500);
      note(`${TC(10)} แถวที่ 1 หลังแก้เหตุการณ์`, `${JSON.stringify(await readArrival(a))} · ป้าย ${(await tag().count()) ? norm(await tag().innerText()) : '-'}`);
      await snapEvidence(page, 'แถวที่ 1 หลังแก้เหตุการณ์');
    }

    // ─── TC-011 ส่ง Triage ทั้งเหตุการณ์ → ER Arrival ใน Visit
    if (run(11)) {
      await clearEvidenceMarks(page);
      await startClip(page, tcId(11));
      // ถ่ายซ้ำแบบอ่านอย่างเดียว: เหตุการณ์ที่ส่งทั้งเหตุการณ์แล้ว (member COMPLETED ครบ) → ข้ามขั้น 2–3 ไปดู Visit
      const submitted = incident.members.length > 0 && bySeq(incident.members).every((m) => m.status === 'COMPLETED');
      if (submitted) note(TC(11), 'เหตุการณ์ส่ง Triage ทั้งเหตุการณ์แล้ว → ข้ามขั้น 2–3 (ถ่ายซ้ำขั้น 4 แบบอ่านอย่างเดียว)');
      if (!submitted) await soft(`${TC(11)} ขั้น 2 แถว 1 และแถว 2: ระดับ 3 + โซน Urgency > กด พร้อมส่งและไปคนถัดไป`, async () => {
        for (const [i, m] of [m1, m2].entries()) {
          await selectMember(page, m.hn);
          await fillMemberTriage(page, 3, 'Urgency');
          const status = await pressReady(page, 3, 'Urgency', `ก่อนกด — พร้อมส่ง แถว ${i + 1}`);
          expect(status, `พร้อมส่งแถว ${i + 1}`).toBeLessThan(300);
          await expect(memberRow(page, m.hn)).toContainText('READY', { timeout: 20_000 });
        }
        await markEvidence(expected(memberRow(page, m1.hn), 'READY'), expected(memberRow(page, m2.hn), 'READY'));
      });
      if (!submitted) await soft(`${TC(11)} ขั้น 3 กด ส่ง Triage ทั้งเหตุการณ์`, async () => {
        await clearEvidenceMarks(page);
        await expect(submitAllButton(page)).toBeEnabled({ timeout: 30_000 });
        await markEvidence(clicked(submitAllButton(page)));
        await snapEvidence(page, 'ก่อนกด — ส่ง Triage ทั้งเหตุการณ์');
        await submitAllButton(page).click();
        const refer = page.getByRole('dialog', { name: 'ส่งต่อไปคลินิก' });
        const confirm = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
        for (let i = 0; i < 3; i++) {
          if (await refer.isVisible({ timeout: 3_000 }).catch(() => false)) await refer.getByRole('button', { name: 'ภายหลัง' }).click();
          else if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
            note(TC(11), `หน้าต่างหลังกดส่ง: ${norm(await confirm.innerText()).slice(0, 200)}`);
            await confirm.getByRole('button', { name: /ยืนยัน/ }).last().click();
          }
        }
        await expect.poll(async () => (await fetchIncident(page, authorization, id)).members.filter((m) => m.status === 'COMPLETED').length, { timeout: 60_000, message: 'member ต้อง COMPLETED ครบ 2 ราย' }).toBe(2);
        await snapEvidence(page, 'หลังกด — ส่ง Triage ทั้งเหตุการณ์');
      });
      const want: Record<string, { method: string; ems: string; escort: RegExp; escortText: string; transporter: string }> = {
        [m1.en]: { method: 'EMS', ems: 'ALS', escort: ESCORT_EMS, escortText: ESCORT_EMS_TEXT, transporter: TRANSPORTER_A_EDIT },
        [m2.en]: { method: 'Walk-in', ems: '-', escort: ESCORT_RELATIVE, escortText: ESCORT_RELATIVE_TEXT, transporter: '' },
      };
      for (const [i, m] of [m1, m2].entries()) {
        const w = want[m.en];
        await soft(`${TC(11)} ขั้น 4 เปิด Visit ER ผู้ป่วยแถว ${i + 1} (HN ${m.hn} ${m.en}) → ER Arrival ในข้อมูลคัดกรองตรงกับหน้าเหตุการณ์ (${w.method} · ${w.escortText}${w.transporter ? ` · ${w.transporter}` : ''})`, async () => {
          await clearEvidenceMarks(page);
          await gotoVisit(page, { hn: m.hn, vn: m.vn, en: m.en });
          // หน้าแรกของ Visit = Overview · ส่วน "คัดกรอง ER" โหลดช้า (~15 วิ) → รอ Vital signs ในส่วนนั้นก่อน
          const triage = main
            .locator('div')
            .filter({ has: page.getByText('คัดกรอง ER', { exact: true }) })
            .filter({ has: page.getByText('การจำแนกผู้ป่วย', { exact: true }) })
            .last();
          await expect(triage.getByText('Vital signs', { exact: true }).first(), 'ส่วนคัดกรอง ER ใน Overview ต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
          await page.waitForTimeout(3_000);
          // หาส่วน ER Arrival บนหน้า Visit: Overview (คัดกรอง ER) → เมนู คัดกรอง → ประวัติการคัดกรอง > ดู
          const dump: string[] = [];
          const look = async (where: string) => {
            const regions = await main.getByRole('region', { name: 'ER Arrival' }).count();
            const heads = await main.getByText('ER Arrival', { exact: true }).count();
            const txt = norm(await main.innerText());
            dump.push(`## ${where}\nregion=${regions} heading=${heads}\n${txt.slice(0, 4000)}`);
            return regions + heads;
          };
          // สำรวจอ่านอย่างเดียว 4 พ.ย. 2026: Overview / ฟอร์มคัดกรอง (OPD) / เมนูอื่นของ Visit ไม่มี ER Arrival — ดูที่ Overview ที่เดียว
          const found = await look('Overview (ส่วนคัดกรอง ER)');
          await triage.scrollIntoViewIfNeeded();
          fs.writeFileSync(test.info().outputPath(`visit-${m.hn}.txt`), dump.join('\n\n'));
          const region = main.getByRole('region', { name: 'ER Arrival' }).last();
          const got = (await region.count()) ? await readArrival({ radio: (n) => region.getByRole('radio', { name: n, exact: true }), escort: region.locator('.ant-select').first(), transporter: region.getByRole('textbox', { name: 'ระบุชื่อผู้นำส่ง, ชื่อหน่วยงาน, มูลนิธิ' }) }) : null;
          const screen = norm(await main.innerText());
          const api = await encounterArrival(page, authorization, m.en);
          void screen;
          // ไม่มีส่วน ER Arrival → ทุกช่อง "ไม่มีส่วน ER Arrival" · ป้ายวิธีการมาถึงบนแถบ Visit แยกเป็นแถวของตัวเอง (ไม่ใช่ส่วน ER Arrival)
          const none = 'ไม่มีส่วน ER Arrival';
          // ป้ายข้าง EN บนแถบ Visit (ใน main · ส่วนคัดกรอง ER ไม่มีคำเหล่านี้เพราะไม่มี ER Arrival)
          const chip = main.getByText(/^(Walk-in|EMS|รับ Refer)$/).first();
          const chipText = (await chip.count()) ? norm(await chip.innerText()) : '';
          const rows: CompareRow[] = [
            { label: 'ส่วน ER Arrival บนหน้า Visit', values: ['แสดง', found ? 'แสดง' : 'ไม่มีบนหน้าจอ', ''], same: found > 0 },
            { label: 'วิธีการมาถึง', values: [w.method, got ? got.method : none, String(api.arrivalMethod)], same: !!got && got.method === w.method },
            ...(w.ems !== '-' ? [{ label: 'ระดับความเร่งด่วน EMS', values: [w.ems, got ? got.ems : none, String(api.emsLevel)], same: !!got && got.ems === w.ems }] : []),
            { label: 'ผู้นำส่ง', values: [w.escortText, got ? got.escort : none, String(api.accompanyingPersonOptionId)], same: !!got && w.escort.test(got.escort) },
            ...(w.transporter ? [{ label: 'ชื่อผู้นำส่ง', values: [w.transporter, got ? got.transporter : none, String(api.transporterName)], same: !!got && got.transporter === w.transporter }] : []),
            { label: 'ข้อสังเกต: ป้ายแถบ Visit', values: [w.method, chipText || '(ไม่พบป้าย)', String(api.arrivalMethod)], same: chipText === w.method },
          ];
          note(`${TC(11)} API Encounter ${m.en}`, JSON.stringify(api));
          await showCompareTable(page, `${ISSUE[11]} ${tcId(11)} ER Arrival ใน Visit แถว ${i + 1} (HN ${m.hn})`, ['Expected', 'หน้าจอ', 'API'], rows, { side: 'right', width: '700px' });
          if (found && (await region.count())) await markEvidence(expected(region, `${got?.method} · ${got?.escort}`));
          else {
            // เลื่อนหัว "คัดกรอง ER" ให้นิ่งก่อนตีกรอบ (กรอบลอยเมื่อหน้ายังเลื่อน) · ป้ายสั้นไม่ทับช่องในฟอร์ม
            const pill = triage.getByText('คัดกรอง ER', { exact: true }).first();
            await pill.scrollIntoViewIfNeeded();
            // ส่วนย่อยของ Overview ยังโหลดตามหลัง หน้าขยับ → รอตำแหน่งหัว "คัดกรอง ER" ไม่เปลี่ยน 3 รอบติด (≈1.5 วิ)
            let last = -1;
            let still = 0;
            for (let k = 0; k < 40 && still < 3; k++) {
              const y = Math.round((await pill.boundingBox())?.y ?? -1);
              still = y === last ? still + 1 : 0;
              last = y;
              await page.waitForTimeout(500);
            }
            await markEvidence(
              expected(triage.getByText('คัดกรอง ER', { exact: true }).first(), 'ER Arrival · จริง: ไม่มีในคัดกรอง ER'),
              expected(triage.getByText('Vital signs', { exact: true }).first(), 'การจำแนกผู้ป่วย → Vital signs ไม่มี ER Arrival คั่น'),
              ...(chipText && chipText !== w.method ? [expected(chip, `${w.method} · จริง: ${chipText}`)] : []),
            );
          }
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (API ${r.values[2] || '-'})`), 'Expected: ER Arrival ใน Visit ตรงกับค่าในหน้าเหตุการณ์').toEqual([]);
        });
        await hideCompareTable(page);
      }
    }

    await startClip(page, 'after');
    note('คำสั่งที่เขียนข้อมูล', writes.join(' | ') || '(ไม่มี)');
    fs.writeFileSync(test.info().outputPath('mc-a.json'), JSON.stringify({ id, members: (await fetchIncident(page, authorization, id)).members }, null, 2));
    finish();
  });

  // ================================================================================================
  // หลักฐานการ์ดบั๊ก (ผู้ใช้สั่ง 3 พ.ย. 2026 "ESI 5 ไม่มีโซนแนะนำ → เปิดการ์ดบั๊ก" · นอก TC ของ EXE) — เหตุการณ์ "SBH-3609 QA BUG" N=1 · ลบ member ท้ายงานด้วยสคริปต์ API
  test('การ์ดบั๊ก: ESI 5 ในฟอร์ม MC ไม่มีโซนแนะนำ (เทียบ ESI 4) (Super_User)', { tag: ['@SBH-3609', '@SBH-3609-BUG'], annotation: [linear('SBH-3609')] }, async ({ page }) => {
    const main = page.getByRole('main');
    const authorization = trackAuthorization(page);
    const { note, soft, finish } = makeRunner(page);
    let id = process.env.SBH3609_BUG_ID ?? '';
    if (!id)
      id = await checkStep(page, 'เตรียม: สร้างเหตุการณ์ "SBH-3609 QA BUG" · จำนวนผู้ป่วย 1', async () => {
        const { dialog } = await openCreateIncident(page, { name: 'SBH-3609 QA BUG', location: LOCATION, chiefComplaint: SHARED_CC, headcount: 1 });
        return (await submitCreateIncident(page, dialog)).id;
      });
    const incident = await waitRegistration(page, authorization, id);
    const [m1] = bySeq(incident.members);
    note('เหตุการณ์', `${incident.displayCode} · id ${id} · HN ${m1.hn} ${m1.en} · ใช้ซ้ำ: SBH3609_BUG_ID=${id}`);
    if (!page.url().includes(id)) await page.goto(`/cortex/er/triage?mode=mass-casualty&incidentId=${id}`);
    await selectMember(page, m1.hn);
    const zoneGroup = formZoneGroup(page);
    const zoneState = async () =>
      zoneGroup.getByRole('button').evaluateAll((els) => els.map((e) => `${(e.textContent ?? '').replace(/\s+/g, ' ').trim()}${e.getAttribute('aria-pressed') === 'true' ? ' [เลือก]' : ''}`));
    const suggested = async (level: number) => {
      const r = await page.request.get(`/cortex-api/er/triage/zones?triageLevel=${level}`, { headers: { authorization: authorization() } });
      const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      return String(body.suggestedLocationId ?? JSON.stringify(body).slice(0, 120));
    };
    await startClip(page, 'BUG-ESI');
    for (const level of [4, 5]) {
      await soft(`BUG ขั้น ${level === 4 ? 1 : 2} กด ESI ${level} → ปุ่มโซนที่ระบบแนะนำ`, async () => {
        await clearEvidenceMarks(page);
        await esiButton(page, level).click();
        await page.waitForTimeout(2_500);
        const zones = await zoneState();
        const hasSuggest = zones.some((z) => /แนะนำ/.test(z));
        // Retest SBH-3883 (4 พ.ย. 2026 · PR "suggest Observation for ESI 5"): ESI 4 → Urgency · ESI 5 → Observation · โซนแนะนำต้องถูกเลือกให้ด้วย
        const want = level === 4 ? 'Urgency' : 'Observation';
        const sugg = zones.filter((z) => /แนะนำ/.test(z));
        const picked = zones.filter((z) => /\[เลือก\]$/.test(z)).map((z) => z.replace(/\s*\[เลือก\]$/, ''));
        const okSuggest = sugg.some((z) => z.startsWith(want));
        const okPicked = picked.some((z) => z.startsWith(want));
        const api = await suggested(level);
        note(`ESI ${level}`, `ปุ่มโซน: ${zones.join(' | ')} · API triage/zones suggestedLocationId ${api}`);
        await showCompareTable(page, `SBH-3883 Retest — ESI ${level}`, ['Expected', 'หน้าจอ', 'API แนะนำ (location id)'], [
          { label: 'โซนแนะนำ', values: [`${want} แนะนำ`, sugg.length ? sugg.map((z) => z.replace(/\s*\[เลือก\]$/, '')).join(', ') : 'ไม่มีโซนแนะนำ', api], same: okSuggest },
          { label: 'โซนที่ถูกเลือก', values: [want, picked.join(', ') || 'ไม่มีโซนถูกเลือก', ''], same: okPicked },
        ], { side: 'left', width: '680px', top: '730px' });
        await markEvidence(
          filled(esiButton(page, level), `ESI ${level}`),
          expected(zoneGroup, okSuggest && okPicked ? `${want} แนะนำ + ถูกเลือก` : `${want} แนะนำ + ถูกเลือก · จริง: ${sugg.join(', ') || 'ไม่มีโซนแนะนำ'}`),
        );
        expect(hasSuggest && okSuggest && okPicked, `ESI ${level} ต้องแนะนำและเลือก ${want}`).toBe(true);
      });
      await hideCompareTable(page);
    }
    void main;
    await startClip(page, 'after');
    finish();
  });
});
