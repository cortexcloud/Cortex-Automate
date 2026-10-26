import fs from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { dismissToast, expectTriageFormOpen, fetchBoard, fetchZones, gotoErDashboard, openVisitDialog, type ErVisit } from '../../../helpers/functions/er';
import { erViewSwitch } from '../../../helpers/functions/er-list';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { labelledBox, triageForm, type VitalSigns } from '../../../helpers/functions/er-triage';
import { checkStep, expected, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { newTestPatient, type NewPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, openErVisitForHn, recordMockPatient, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_HIGH_MEWS, VITALS_NORMAL, fillTriage, gotoVisit, saveTriageForm } from '../../../mock-data/uat-play';

// SBH-1684 [ER][QUEUE] Priority ER Patient — AC: logic การเรียงคิวแยกตาม Zone ใช้ทั้งหน้า Dashboard และหน้าแสดงรายการ
// ชุด EXE SBH-1859 (VERSION 2.8.0): TC-001 SBH-1864 ห้องคัดกรอง FIFO · TC-002 SBH-1865 Fast Track บนสุด · TC-003 SBH-1866 โซนแดง ESI → MEWS → FIFO
//   · TC-005 SBH-1868 โซนเหลือง ESI → MEWS → FIFO · TC-007 SBH-1870 ห้องสังเกตอาการ / โซนเขียว FIFO (TC-004 / 006 / 008 ถูก Canceled — รอ BA ยืนยันข้อ เกินเป้าหมาย / Time Stop)
// 3 เทส = 3 flow (R9): (1) ห้องคัดกรอง + โซนแดง (2) โซนเหลือง (3) โซนเขียว + ห้องสังเกตอาการ — แต่ละรายลงทะเบียน AUTO ใหม่ + Visit ER สิทธิ UC + Triage ตามที่ TC กำหนด
// ไม่กด Acknowledge ใดๆ (Acknowledge = Time Stop · Fast Track ที่ Acknowledge แล้วไม่ถูกนับเป็น Fast Track — โค้ดเรียงคิวดู fastTrackStatus === 'suspected')
// ลำดับตรวจ 3 แหล่ง: การ์ดบน ER Dashboard (บน → ล่างในคอลัมน์) · แถวในหน้ารายการ (กรองชื่อด้วยแท็กของรอบ) · ค่าจาก API บอร์ด (ESI / MEWS / Fast Track / โซน)
// ผู้ป่วยทิ้ง Visit ไว้บนบอร์ด (ผู้ใช้เลือก 14 ต.ค. 2026) · จดผู้ป่วยลง .cache/sbh-1684-<ระบบ>.json — SBH1684_RESUME=1 ทำต่อกับผู้ป่วยชุดเดิมของเทสนั้น (ไม่สร้างใหม่)
// รัน (dev-x):    npx playwright test --headed --grep "@SBH-1864" --output=test-results-sbh-1684   (เทส 1) · "@SBH-1868" (เทส 2) · "@SBH-1870" (เทส 3)
// รัน (SBH Prod): npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep "@SBH-1864" --output=test-results-sbh-1684  (ทีละเทส คัดลอกหลักฐานก่อนรันเทสถัดไป)
// --output แยกโฟลเดอร์ผล: session อื่นที่รันเทสพร้อมกันล้าง test-results ตั้งต้นทับกลางเทสได้ (dev-x 14 ต.ค. 2026)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC1 = 'TC-001 (SBH-1864)';
const TC2 = 'TC-002 (SBH-1865)';
const TC3 = 'TC-003 (SBH-1866)';
const TC5 = 'TC-005 (SBH-1868)';
const TC7 = 'TC-007 (SBH-1870)';

/** MEWS 6: Temp 39 (2) + Systolic 120 (0) + PR 115 (2) + RR 25 (2) + AVPU A (0) — ตารางคะแนนเดียวกับ calculateMewsScore ในไฟล์แอป */
const VITALS_MEWS_6: VitalSigns = { systolic: '120', diastolic: '80', pr: '115', rr: '25', temp: '39', spo2: '97', painScore: '3' };
/** MEWS ที่คาดของชุดสัญญาณชีพ (ยืนยันกับ clinicalDetails.mews.score ของ API บอร์ดหลังบันทึก) */
const MEWS_OF = new Map<VitalSigns, number>([
  [VITALS_NORMAL, 1],
  [VITALS_MEWS_6, 6],
  [VITALS_HIGH_MEWS, 9],
]);

type ZoneName = 'คัดกรอง' | 'โซนแดง ER' | 'โซนเหลือง ER' | 'โซนเขียว ER' | 'ห้องสังเกตอาการ ER';
/** ชื่อโซนในหน้ารายการ / API (หัวคอลัมน์ห้องคัดกรองบนบอร์ดเขียนว่า "คัดกรอง") */
const LIST_ZONE: Record<ZoneName, string> = {
  คัดกรอง: 'ห้องคัดกรอง ER',
  'โซนแดง ER': 'โซนแดง ER',
  'โซนเหลือง ER': 'โซนเหลือง ER',
  'โซนเขียว ER': 'โซนเขียว ER',
  'ห้องสังเกตอาการ ER': 'ห้องสังเกตอาการ ER',
};

interface Role {
  /** ชื่อผู้ป่วยตาม TC เช่น D (N1) */
  key: string;
  level: 1 | 2 | 3 | 4 | 5;
  vitals: VitalSigns;
  fastTrack?: boolean;
  /** โซนที่ต้องกดเลือกเอง (ระบบไม่ได้แนะนำตาม ESI) */
  manualZone?: ZoneName;
}

interface Patient extends ErVisit {
  key: string;
  name: string;
  citizenId: string;
}

const STORE = `.cache/sbh-1684-${SYSTEM}.json`;
const RESUME = process.env.SBH1684_RESUME === '1';

function loadStore(): Record<string, { tag: string; patients: Patient[] }> {
  return fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, 'utf8')) : {};
}

function saveStore(flow: string, tag: string, patients: Patient[]) {
  fs.mkdirSync('.cache', { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify({ ...loadStore(), [flow]: { tag, patients } }, null, 2));
}

/** แท็กของรอบ = ส่วนต้นของนามสกุลผู้ป่วยทุกรายในเทสนั้น (ใช้กรองหน้ารายการ) เช่น Q1684R1612 */
function runTag(flow: string): string {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).replace(':', '');
  return `Q1684${flow}${time}`;
}

const show = (p: Patient, roles: Role[]) => {
  const role = roles.find((r) => r.key === p.key)!;
  return `${p.key} · ${role.fastTrack ? 'Fast Track · ' : ''}ESI ${role.level} · MEWS ${MEWS_OF.get(role.vitals)} (HN ${p.hn})`;
};

/**
 * เปิด ER Dashboard (โหลดแอปใหม่) — ลองซ้ำเมื่ออ่านผลบอร์ดไม่ได้
 * หน้ารายการที่เปิดค้างอยู่ยิง API บอร์ดซ้ำเป็นระยะ → gotoErDashboard() อาจจับ response ของหน้าเดิมที่ถูกเปลี่ยนหน้าไปแล้ว (body อ่านไม่ได้ — dev-x 14 ต.ค. 2026)
 */
async function openDashboard(page: Page) {
  await expect(async () => {
    await gotoErDashboard(page);
  }, 'เปิด ER Dashboard').toPass({ timeout: 180_000 });
}

function progress(message: string) {
  console.log(`    ${message}`);
}

/** ลงทะเบียนผู้ป่วย AUTO ใหม่ + เปิด Visit ER สิทธิ UC (เริ่มจาก ER Dashboard) — จบที่ฟอร์มคัดกรองของ Visit นั้น */
async function openPatient(page: Page, tag: string, key: string): Promise<Patient> {
  await openDashboard(page);
  // SBH1684_EXISTING=<key>:<HN>:<นามสกุล> — ผู้ป่วยที่ลงทะเบียนไว้แล้วแต่ยังไม่มี Visit (รอบก่อนหยุดกลางหน้าต่างเปิด Visit) → เปิด Visit ให้ HN นั้น ไม่ลงทะเบียนใหม่
  const existing = (process.env.SBH1684_EXISTING ?? '').split(',').map((s) => s.split(':')).find(([k]) => k === key);
  const patient: NewPatient = existing
    ? { citizenId: '-', firstName: 'AUTO', familyName: existing[2], gender: 'ชาย', birthDate: '15/01/1990' }
    : newTestPatient(`${tag}${key.replace(/\W/g, '')}`);
  const open = existing ? openErVisitForHn(page, existing[1]) : registerAndOpenErVisit(page, patient);
  const visit = await open.catch(async (error: Error) => {
    // SBH Prod: ช่วงเวลาออกตรวจของแพทย์ ER วันนั้นถูกใช้หมด → แพทย์ขึ้น "(Full)" กดยืนยันแล้วระบบไม่ส่งคำสั่ง — ไม่แก้ตารางแพทย์ หยุดพร้อมบอกสาเหตุ
    const full = await openVisitDialog(page).getByText(/\(Full\)|ไม่พบเวลาที่สามารถลงได้/).first().isVisible().catch(() => false);
    if (!full) throw error;
    throw new Error(`เปิด Visit ER ให้ ${patient.firstName} ${patient.familyName} ไม่ได้ — ช่วงเวลาออกตรวจของแพทย์วันนี้เต็ม · ผู้ป่วยถูกลงทะเบียนแล้วแต่ไม่มี Visit`);
  });
  await expectTriageFormOpen(page, visit);
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  const name = `${patient.firstName} ${patient.familyName}`;
  recordMockPatient(`SBH-1684 ${key}`, patient, visit, 'SBH-1684 · เปิด Visit ER สิทธิ UC (เทสการ์ด ทิ้ง Visit ไว้)');
  return { ...visit, key, name, citizenId: patient.citizenId };
}

/** กรอกฟอร์มคัดกรองตาม role แล้วบันทึก (อยู่หน้าฟอร์มคัดกรองของ Visit แล้ว) */
async function triage(page: Page, patient: Patient, role: Role) {
  const form = triageForm(page);
  // SBH Prod: ข้อมูล Encounter โหลดไม่สำเร็จเป็นพักๆ ปุ่ม GCS กดไม่ได้ค้างอยู่ → เปิดหน้า Visit ใหม่
  const gcs = form.getByRole('button', { name: 'เลือกคะแนน' }).first();
  let rounds = 0;
  await expect(async () => {
    if (rounds++) {
      await gotoVisit(page, patient);
      await expectTriageFormOpen(page, patient);
    }
    if (await gcs.count()) await expect(gcs).toBeEnabled({ timeout: 10_000 });
  }, 'ฟอร์มคัดกรองต้องพร้อมให้กรอก').toPass({ timeout: 150_000 });

  await fillTriage(page, patient, { level: role.level, vitals: role.vitals, fastTrack: role.fastTrack ? 'Sepsis' : undefined });
  if (role.manualZone) {
    await form.getByRole('button', { name: new RegExp(`^${role.manualZone}`) }).click();
    const confirm = page.getByRole('dialog', { name: /workflow สังเกตอาการ/ });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'ยืนยัน' }).click();
    await expect(confirm).toBeHidden();
  }
  // ฟอร์มคิด MEWS หลังตั้ง AVPU จาก GCS ให้เอง — กดบันทึกเร็วไป (2 วินาทีหลังเลือก GCS) MEWS ไม่ถูกบันทึก (API บอร์ด mews.score = null)
  // ซึ่งทำให้ลำดับคิวผิดจากที่ TC ตั้งใจ (dev-x 14 ต.ค. 2026 ผู้ป่วย D / B) → รอให้กล่อง Total MEWS แสดงค่าที่คาดก่อนบันทึก
  await expect(labelledBox(form, 'Total MEWS'), `Total MEWS ของ ${role.key}`).toHaveText(new RegExp(`Total MEWS\\s*${MEWS_OF.get(role.vitals)}\\s*/`));
  await saveTriageForm(page, patient);
  if (role.level === 5) {
    // ESI 5: ระบบถามคลินิกปลายทาง → "ภายหลัง" ผู้ป่วยค้างอยู่โซนเขียว
    const refer = page.getByRole('dialog', { name: 'ส่งต่อไปคลินิก' });
    await expect(refer).toBeVisible();
    await refer.getByRole('button', { name: 'ภายหลัง' }).click();
    await expect(refer).toBeHidden();
  }
}

/**
 * ผู้ป่วยของ role ตามลำดับเปิด Visit: สร้างใหม่ หรือ (SBH1684_RESUME=1) ใช้รายเดิมที่จดไว้ · `triageNow` = คัดกรองต่อทันทีหลังเปิด Visit
 * รายที่คัดกรองแล้ว (ดูจาก API) ไม่คัดกรองซ้ำ
 */
async function ensurePatients(page: Page, authorization: () => string, flow: string, roles: Role[], state: { tag: string; patients: Patient[] }, triageNow: boolean) {
  for (const role of roles) {
    let patient = state.patients.find((p) => p.key === role.key);
    await checkStep(page, `เตรียมผู้ป่วย ${role.key}: Visit ER สิทธิ UC${triageNow ? ` + คัดกรอง ESI ${role.level} · MEWS ${MEWS_OF.get(role.vitals)}${role.fastTrack ? ' · Suspect Fast Track' : ''}${role.manualZone ? ` · ${role.manualZone}` : ''}` : ' (ยังไม่คัดกรอง)'}`, async () => {
      if (!patient) {
        patient = await openPatient(page, state.tag, role.key);
        state.patients.push(patient);
        saveStore(flow, state.tag, state.patients);
        progress(`✓ ${role.key}: ${patient.name} · HN ${patient.hn} · ${patient.vn} · ${patient.en}`);
      }
      if (!triageNow) return;
      const encounter = (await fetchBoard(page, authorization)).find((e) => e.en === patient!.en);
      if (encounter?.triagedAt) return;
      if (!(await triageForm(page).isVisible())) {
        await gotoVisit(page, patient);
        await expectTriageFormOpen(page, patient);
      }
      await triage(page, patient, role);
      progress(`✓ ${role.key}: คัดกรอง ESI ${role.level}`);
    });
  }
}

/** คัดกรองผู้ป่วยที่เปิด Visit ไว้แล้ว (ตามลำดับ roles) */
async function triageExisting(page: Page, authorization: () => string, roles: Role[], patients: Patient[]) {
  for (const role of roles) {
    const patient = patients.find((p) => p.key === role.key)!;
    await checkStep(page, `คัดกรอง ${role.key}: ESI ${role.level} · MEWS ${MEWS_OF.get(role.vitals)}`, async () => {
      const encounter = (await fetchBoard(page, authorization)).find((e) => e.en === patient.en);
      if (encounter?.triagedAt) return;
      await gotoVisit(page, patient);
      await expectTriageFormOpen(page, patient);
      await triage(page, patient, role);
      progress(`✓ ${role.key}: คัดกรอง ESI ${role.level}`);
    });
  }
}

/** ยืนยันจาก API บอร์ดว่าผู้ป่วยทุกรายได้ ESI / MEWS / Fast Track / โซน ตามที่ TC กำหนด (เงื่อนไขก่อนดูลำดับ) */
async function expectSetup(page: Page, authorization: () => string, roles: Role[], patients: Patient[], zone: ZoneName) {
  const zones = await fetchZones(page, authorization);
  let rows: CompareRow[] = [];
  await expect(async () => {
    const board = await fetchBoard(page, authorization);
    rows = roles.map((role) => {
      const p = patients.find((x) => x.key === role.key)!;
      const e = board.find((x) => x.en === p.en);
      const actual = e
        ? `ESI ${e.triageLevel ?? '-'} · MEWS ${e.clinicalDetails?.mews?.score ?? '-'} · Fast Track ${e.clinicalDetails?.fastTrackStatus ?? '-'} · ${zones.get(e.currentLocationId ?? -1) ?? e.currentLocationId}`
        : '(ไม่อยู่บนบอร์ด)';
      const wanted = zone === 'คัดกรอง' ? `ยังไม่คัดกรอง · ${LIST_ZONE[zone]}` : `ESI ${role.level} · MEWS ${MEWS_OF.get(role.vitals)} · Fast Track ${role.fastTrack ? 'suspected' : 'none'} · ${LIST_ZONE[zone]}`;
      const same =
        !!e &&
        e.latestStatusCode !== 'cancelled' &&
        !e.startedTreatmentAt &&
        (zone === 'คัดกรอง'
          ? !e.triagedAt && zones.get(e.currentLocationId ?? -1) === LIST_ZONE[zone]
          : e.triageLevel === role.level && e.clinicalDetails?.mews?.score === MEWS_OF.get(role.vitals) && (e.clinicalDetails?.fastTrackStatus === 'suspected') === !!role.fastTrack && zones.get(e.currentLocationId ?? -1) === LIST_ZONE[zone]);
      return { label: `${role.key} (HN ${p.hn})`, values: [wanted, zone === 'คัดกรอง' ? `${e?.triagedAt ? 'คัดกรองแล้ว' : 'ยังไม่คัดกรอง'} · ${zones.get(e?.currentLocationId ?? -1) ?? '-'}` : actual], same };
    });
    expect(rows.filter((r) => !r.same).map((r) => r.label), 'ผู้ป่วยต้องมีค่าตามที่ TC กำหนด').toEqual([]);
  }).toPass({ timeout: 60_000 });
  await test.info().attach(`ข้อมูลผู้ป่วยจาก API บอร์ด (${zone})`, { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });
}

/** ตำแหน่งการ์ดบน ER Dashboard: คอลัมน์ (หัวคอลัมน์ที่อยู่ซ้ายสุดที่ใกล้ที่สุด) + y */
async function boardOrder(page: Page, zone: ZoneName, patients: Patient[]): Promise<Patient[]> {
  const headers = await page.getByRole('main').locator('strong').evaluateAll((els, names) =>
    els.filter((el) => names.includes(el.textContent!.trim())).map((el) => ({ name: el.textContent!.trim(), x: el.getBoundingClientRect().x })),
  ['คัดกรอง', 'โซนแดง ER', 'โซนเหลือง ER', 'โซนเขียว ER', 'ห้องสังเกตอาการ ER', 'รอเตียง']);
  const placed: { p: Patient; column: string; y: number }[] = [];
  for (const p of patients) {
    const box = await page.getByText(`HN: ${p.hn}`, { exact: true }).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y + window.scrollY };
    });
    const column = [...headers].filter((h) => h.x <= box.x + 40).sort((a, b) => b.x - a.x)[0]?.name ?? '(ไม่รู้คอลัมน์)';
    placed.push({ p, column, y: box.y });
  }
  return placed.filter((c) => c.column === zone).sort((a, b) => a.y - b.y).map((c) => c.p);
}

const cardOf = (page: Page, hn: string): Locator => page.locator('.ant-card').filter({ has: page.getByText(`HN: ${hn}`, { exact: true }) }).last();
const columnHeader = (page: Page, zone: ZoneName): Locator => page.getByRole('main').locator('strong').filter({ hasText: new RegExp(`^${zone}$`) }).first();

/** ภาพหลักฐานของคอลัมน์: หัวคอลัมน์ + การ์ดของผู้ป่วยรายนี้เท่านั้น (R53) — คอลัมน์ยาวเกินจอแยกเป็นหลายภาพ */
async function snapColumn(page: Page, zone: ZoneName, ordered: Patient[], title: string) {
  let index = 0;
  let part = 1;
  while (index < ordered.length) {
    const first = cardOf(page, ordered[index].hn);
    if (index === 0) await page.evaluate(() => window.scrollTo(0, 0));
    await first.evaluate((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < 120 || r.bottom > window.innerHeight - 20) el.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    const marks = [];
    if (index === 0 && (await columnHeader(page, zone).evaluate((el) => el.getBoundingClientRect().top >= 0))) marks.push(expected(columnHeader(page, zone)));
    let taken = 0;
    for (let i = index; i < ordered.length; i++) {
      const fits = await cardOf(page, ordered[i].hn).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      });
      if (!fits && taken) break;
      marks.push(expected(cardOf(page, ordered[i].hn)));
      taken++;
    }
    await markEvidence(...marks);
    await holdForClip(page);
    await snapEvidence(page, `${title} (${part++})`);
    index += taken;
  }
}

/** หน้ารายการ (แท็บผู้ป่วยปัจจุบันใน ER) กรองชื่อด้วยแท็กของรอบ → ลำดับแถวของผู้ป่วยในโซนนั้น */
async function listOrder(page: Page, tag: string, zone: ZoneName, patients: Patient[]): Promise<Patient[]> {
  const main = page.getByRole('main');
  await erViewSwitch(page, 'รายการ').click();
  const nameBox = main.getByPlaceholder('ค้นหาชื่อผู้ป่วย');
  await expect(nameBox).toBeVisible({ timeout: 45_000 });
  await nameBox.fill(tag);
  const rows = main.locator('tr.ant-table-row');
  // รอให้แถวของผู้ป่วยทุกรายในเทสนี้ขึ้นครบ (หน้ารายการโหลดช้ากว่าบอร์ดเป็นพักๆ)
  await expect(async () => {
    const keys = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-row-key')));
    expect(patients.filter((p) => !keys.includes(p.en)).map((p) => p.key), 'แถวของผู้ป่วยในหน้ารายการ').toEqual([]);
  }).toPass({ timeout: 60_000 });
  const read = await rows.evaluateAll((els) => els.map((e) => ({ en: e.getAttribute('data-row-key') ?? '', text: (e as HTMLElement).innerText.replace(/\s+/g, ' ') })));
  return read.filter((r) => r.text.includes(LIST_ZONE[zone])).map((r) => patients.find((p) => p.en === r.en)).filter((p): p is Patient => !!p);
}

/**
 * ตรวจลำดับคิวของโซน: Dashboard → หน้ารายการ แล้วเทียบกับลำดับที่ TC กำหนด (ตารางเทียบ 3 คอลัมน์ ขึ้นก่อน expect ให้ภาพ Error เห็นแถวที่ไม่ตรง)
 * เทียบเฉพาะผู้ป่วยของเทสนี้ — ผู้ป่วยรายอื่นบนบอร์ดเรียงแทรกได้ตามกฎของการ์ด
 */
async function checkQueue(page: Page, tc: string, zone: ZoneName, roles: Role[], patients: Patient[], expectedKeys: string[], tag: string) {
  const inZone = expectedKeys.map((k) => patients.find((p) => p.key === k)!);
  // ห้องคัดกรอง: ผู้ป่วยยังไม่มี ESI / MEWS — แสดงแค่ชื่อตาม TC + HN
  const names = (list: Patient[]) => list.map((p) => (zone === 'คัดกรอง' ? `${p.key} · ยังไม่คัดกรอง (HN ${p.hn})` : show(p, roles)));
  const want = names(inZone);
  let board: string[] = [];
  let list: string[] = [];

  await checkStep(page, `${tc} ขั้น 2 ER Dashboard — ลำดับใน${zone === 'คัดกรอง' ? 'ห้องคัดกรอง' : zone}จากบนลงล่าง`, async () => {
    await openDashboard(page);
    await expect(async () => {
      board = names(await boardOrder(page, zone, inZone));
      expect(board.length, `การ์ดของผู้ป่วยในคอลัมน์ ${zone}`).toBe(inZone.length);
    }).toPass({ timeout: 60_000 });
    progress(`${tc} Dashboard ${zone}: ${board.join(' → ')}`);
    await snapColumn(page, zone, inZone, `${tc} Dashboard ${zone}`);
  });

  await checkStep(page, `${tc} ขั้น 3 หน้าแสดงรายการ — ลำดับของ${LIST_ZONE[zone]}จากบนลงล่าง (กรองชื่อ ${tag})`, async () => {
    list = names(await listOrder(page, tag, zone, patients));
    progress(`${tc} รายการ ${zone}: ${list.join(' → ')}`);
    const rowsOf = inZone.map((p) => page.getByRole('main').locator(`tr.ant-table-row[data-row-key="${p.en}"]`));
    await markEvidence(...rowsOf.map((r) => expected(r)));
    await holdForClip(page);
  });

  await checkStep(page, `${tc} ขั้น 4 เทียบลำดับจากทั้งสองหน้ากับ Expected`, async () => {
    const rows: CompareRow[] = want.map((w, i) => ({ label: `ลำดับ ${i + 1}`, values: [w, board[i] ?? '-', list[i] ?? '-'], same: w === board[i] && w === list[i] }));
    await showCompareTable(page, `${tc} ลำดับคิว ${LIST_ZONE[zone]}`, ['Expected (TC)', 'ER Dashboard', 'หน้ารายการ'], rows, { width: '900px' });
    await holdForClip(page, 2_500);
    await test.info().attach(`${tc} ลำดับคิว`, { body: JSON.stringify({ expected: want, board, list }, null, 2), contentType: 'application/json' });
    expect(board, 'ลำดับบน ER Dashboard').toEqual(want);
    expect(list, 'ลำดับในหน้าแสดงรายการ').toEqual(want);
  });
  await hideCompareTable(page);
}

test.describe(`SBH-1684 ER Queue Priority — เรียงคิวแยกตาม Zone ทั้งหน้า Dashboard และหน้าแสดงรายการ (${SYSTEM})`, () => {
  // ผู้ป่วยหลายราย (ลงทะเบียน + Visit + Triage รายละ ~1–2 นาทีบน Prod) + เปิดบอร์ด / หน้ารายการหลายรอบ
  test.describe.configure({ timeout: 2_400_000 });

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page);
  });

  // ─── เทส 1: ห้องคัดกรอง (TC-001) → โซนแดง (TC-003) → เพิ่ม Fast Track (TC-002)
  // ผู้ป่วยของ TC-003: D = ESI 1 MEWS 6 (เปิดก่อน A) · B = ESI 1 MEWS 1 · C = ESI 2 MEWS 9 · A = ESI 1 MEWS 6 (เปิดช้าสุด) → คาด D, A, B, C
  // TC-001 ใช้ D, B, C ตอนเปิด Visit แล้วยังไม่คัดกรอง (เปิดตามลำดับ D → B → C) → คาด D, B, C
  // TC-002 เพิ่ม F1 → F2 (Suspect Fast Track Sepsis · ESI 2 · MEWS 1) ใช้ D / A ของ TC-003 เป็น N1 / N2 (ไม่มี Fast Track · ESI 1 · MEWS เท่ากัน) → คาด F1, F2, D, A, B, C
  const RED: Role[] = [
    { key: 'D', level: 1, vitals: VITALS_MEWS_6 },
    { key: 'B', level: 1, vitals: VITALS_NORMAL },
    { key: 'C', level: 2, vitals: VITALS_HIGH_MEWS },
    { key: 'A', level: 1, vitals: VITALS_MEWS_6 },
    { key: 'F1', level: 2, vitals: VITALS_NORMAL, fastTrack: true },
    { key: 'F2', level: 2, vitals: VITALS_NORMAL, fastTrack: true },
  ];

  test(
    'ห้องคัดกรอง FIFO → โซนแดง ESI / MEWS / FIFO → ผู้ป่วย Fast Track อยู่บนสุด (Super_User)',
    { tag: ['@SBH-1684', '@SBH-1864', '@SBH-1866', '@SBH-1865'], annotation: [linear('SBH-1864'), linear('SBH-1866'), linear('SBH-1865')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const state = RESUME && loadStore().red ? loadStore().red : { tag: runTag('R'), patients: [] as Patient[] };
      test.info().annotations.push({ type: 'แท็กผู้ป่วยของรอบ', description: state.tag });
      await openDashboard(page);

      // TC-001
      const screening = RED.slice(0, 3);
      await ensurePatients(page, authorization, 'red', screening, state, false);
      const screeningPending = (await fetchBoard(page, authorization)).filter((e) => state.patients.slice(0, 3).some((p) => p.en === e.en) && !e.triagedAt).length === 3;
      if (screeningPending) {
        await checkStep(page, `${TC1} ขั้น 1 ผู้ป่วยยังไม่ประเมิน ESI 3 ราย เปิด Visit ตามลำดับ D → B → C`, async () => {
          await expectSetup(page, authorization, screening, state.patients, 'คัดกรอง');
          const board = await fetchBoard(page, authorization);
          const arrived = screening.map((r) => board.find((e) => e.en === state.patients.find((p) => p.key === r.key)!.en)!.arrivedAt);
          test.info().annotations.push({ type: TC1, description: `เวลาเปิด Visit (arrivedAt): ${screening.map((r, i) => `${r.key} ${arrived[i]}`).join(' · ')}` });
          expect([...arrived].sort(), 'เวลาเปิด Visit ต้องเรียง D → B → C').toEqual(arrived);
        });
        await checkQueue(page, TC1, 'คัดกรอง', RED, state.patients.slice(0, 3), ['D', 'B', 'C'], state.tag);
      } else {
        test.info().annotations.push({ type: TC1, description: 'ข้าม — ผู้ป่วยชุดเดิมคัดกรองไปแล้ว (SBH1684_RESUME)' });
      }

      // TC-003
      await triageExisting(page, authorization, screening, state.patients);
      await ensurePatients(page, authorization, 'red', RED.slice(3, 4), state, true);
      const tc3 = RED.slice(0, 4);
      await checkStep(page, `${TC3} ขั้น 1 ผู้ป่วยโซนแดง 4 ราย ไม่มี Fast Track: D (ESI 1 MEWS 6) · B (ESI 1 MEWS 1) · C (ESI 2 MEWS 9) · A (ESI 1 MEWS 6 เปิดช้าสุด)`, async () => {
        await expectSetup(page, authorization, tc3, state.patients, 'โซนแดง ER');
      });
      await checkQueue(page, TC3, 'โซนแดง ER', RED, state.patients.filter((p) => tc3.some((r) => r.key === p.key)), ['D', 'A', 'B', 'C'], state.tag);

      // TC-002
      await ensurePatients(page, authorization, 'red', RED.slice(4), state, true);
      await checkStep(page, `${TC2} ขั้น 1 เพิ่มผู้ป่วย Fast Track F1 → F2 (ESI 2) · N1 / N2 = D / A (ไม่มี Fast Track ESI 1)`, async () => {
        await expectSetup(page, authorization, RED, state.patients, 'โซนแดง ER');
      });
      await checkQueue(page, TC2, 'โซนแดง ER', RED, state.patients, ['F1', 'F2', 'D', 'A', 'B', 'C'], state.tag);
    },
  );

  // ─── เทส 2: โซนเหลือง (TC-005) — เปิด Visit ตามลำดับ Y1 → Y2 → Y3 → Y4 → คาด Y1, Y4, Y3, Y2
  const YELLOW: Role[] = [
    { key: 'Y1', level: 3, vitals: VITALS_MEWS_6 },
    { key: 'Y2', level: 4, vitals: VITALS_HIGH_MEWS },
    { key: 'Y3', level: 3, vitals: VITALS_NORMAL },
    { key: 'Y4', level: 3, vitals: VITALS_MEWS_6 },
  ];

  test(
    'โซนเหลือง ESI → MEWS → FIFO (Super_User)',
    { tag: ['@SBH-1684', '@SBH-1868'], annotation: [linear('SBH-1868')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const state = RESUME && loadStore().yellow ? loadStore().yellow : { tag: runTag('Y'), patients: [] as Patient[] };
      test.info().annotations.push({ type: 'แท็กผู้ป่วยของรอบ', description: state.tag });
      await openDashboard(page);
      await ensurePatients(page, authorization, 'yellow', YELLOW, state, true);
      await checkStep(page, `${TC5} ขั้น 1 ผู้ป่วยโซนเหลือง 4 ราย: Y1 (ESI 3 MEWS 6) · Y2 (ESI 4 MEWS 9) · Y3 (ESI 3 MEWS 1) · Y4 (ESI 3 MEWS 6 เปิดช้าสุด)`, async () => {
        await expectSetup(page, authorization, YELLOW, state.patients, 'โซนเหลือง ER');
      });
      await checkQueue(page, TC5, 'โซนเหลือง ER', YELLOW, state.patients, ['Y1', 'Y4', 'Y3', 'Y2'], state.tag);
    },
  );

  // ─── เทส 3: TC-007 ทั้งโซนเขียว (ESI 5 ตอบ "ภายหลัง") และห้องสังเกตอาการ (ESI 4 กดเลือกห้องเอง) — เปิด Visit ตามลำดับ 1 → 2 → 3 → คาด FIFO
  const GREEN: Role[] = [
    { key: 'G1', level: 5, vitals: VITALS_NORMAL },
    { key: 'G2', level: 5, vitals: VITALS_NORMAL },
    { key: 'G3', level: 5, vitals: VITALS_NORMAL },
  ];
  const OBSERVE: Role[] = [
    { key: 'O1', level: 4, vitals: VITALS_NORMAL, manualZone: 'ห้องสังเกตอาการ ER' },
    { key: 'O2', level: 4, vitals: VITALS_NORMAL, manualZone: 'ห้องสังเกตอาการ ER' },
    { key: 'O3', level: 4, vitals: VITALS_NORMAL, manualZone: 'ห้องสังเกตอาการ ER' },
  ];

  test(
    'โซนเขียว และห้องสังเกตอาการ เรียง FIFO (Super_User)',
    { tag: ['@SBH-1684', '@SBH-1870'], annotation: [linear('SBH-1870')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const state = RESUME && loadStore().observe ? loadStore().observe : { tag: runTag('O'), patients: [] as Patient[] };
      test.info().annotations.push({ type: 'แท็กผู้ป่วยของรอบ', description: state.tag });
      await openDashboard(page);
      await ensurePatients(page, authorization, 'observe', GREEN, state, true);
      await checkStep(page, `${TC7} ขั้น 1 ผู้ป่วย ESI 5 ในโซนเขียว 3 ราย เปิด Visit ตามลำดับ G1 → G2 → G3`, async () => {
        await expectSetup(page, authorization, GREEN, state.patients, 'โซนเขียว ER');
      });
      await checkQueue(page, `${TC7} โซนเขียว`, 'โซนเขียว ER', GREEN, state.patients.filter((p) => p.key.startsWith('G')), ['G1', 'G2', 'G3'], state.tag);

      await ensurePatients(page, authorization, 'observe', OBSERVE, state, true);
      await checkStep(page, `${TC7} ขั้น 1 ผู้ป่วย ESI 4 ในห้องสังเกตอาการ 3 ราย เปิด Visit ตามลำดับ O1 → O2 → O3`, async () => {
        await expectSetup(page, authorization, OBSERVE, state.patients, 'ห้องสังเกตอาการ ER');
      });
      await checkQueue(page, `${TC7} ห้องสังเกตอาการ`, 'ห้องสังเกตอาการ ER', OBSERVE, state.patients.filter((p) => p.key.startsWith('O')), ['O1', 'O2', 'O3'], state.tag);
    },
  );
});
