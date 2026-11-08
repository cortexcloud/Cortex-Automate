import type { Browser, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { closeVisitAtCashier, gotoCashierAccount, payAllInCash } from '../helpers/functions/cashier';
import { dismissToast, expectVisitHeader, gotoErDashboard, type ErVisit } from '../helpers/functions/er';
import { cprButton, openCprForm, saveCprEvent } from '../helpers/functions/er-cpr';
import { chooseDispositionDiagnosis, signDisposition } from '../helpers/functions/er-disposition';
import { trackAuthorization } from '../helpers/functions/er-report';
import { fetchTreatmentTimeline } from '../helpers/functions/er-timeline';
import { admitCreateAn, ipdDischarge, putToBed } from '../helpers/functions/ipd-admit';
import { erTriagePanel } from '../helpers/functions/er-triage';
import type { NewPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import {
  SYSTEM,
  checkInOpdVisit,
  fetchNurseTasks,
  gotoPatient,
  nextPrefixedPatient,
  nextUatPatient,
  openErVisitForHn,
  openOpdVisit,
  recordDrugAllergy,
  recordMockPatient,
  scheduleWalkInRequest,
  submitOrders,
  type NurseTask,
} from './uat-er';
import { careMenu, draftDischarge, gotoVisit, openPatientAs, requestConsult } from './uat-play';
import {
  GCS_FULL,
  TOR_ORDER_CODES,
  TOR_VITALS_HIGH_MEWS,
  TOR_VITALS_NORMAL,
  TorPlay,
  fillTriageFull,
  noteFilled,
  registerFull,
  saveTriageFull,
  savePhysicianNoteFull,
  type TriageFull,
} from './uat-tor';

// Mock Data ชุด TOR — คนไข้ตั้งต้นของ Scenario UAT ER "ชีตส่งมอบ" (สกิล cortex-er-tor-uat · ชีต ER Scenario Map + Mock-Data ER)
// ผู้ใช้สั่ง 8 พ.ย. 2026 "สร้างคนไข้กลุ่มนี้ทิ้งไว้ให้หน่อย" บน SBH Prod · 1 เทส = ผู้ป่วยใหม่ 1 ราย · ลงทะเบียนกรอกครบ (เบอร์ · รูป · ที่อยู่)
//
//   @TORM-01-1  ข้อ 01 กรณี 1.1 / 1.3 — รูป + แพ้ยา + U/D + ประวัติ ER 1 ครั้ง (เปิด Visit → คัดกรองพร้อม U/D → ปิด Visit ที่การเงิน) · ไม่มี Visit ค้าง
//               ผู้ใช้เลือก "สร้างคนไข้ใหม่" แทน HN 6903952 → ไม่มีประวัติ OPD / IPD
//   @TORM-01-2  ข้อ 01 กรณี 1.2 — มี HN ยังไม่มี Visit
//   @TORM-04    ข้อ 04 — คัดกรอง ESI 3 + ER Physician Note + Order LAB / IMG รอผล
//   @TORM-05-1 / -2 / -3   ข้อ 05 — เปิด Visit ER แล้ว ยังไม่คัดกรอง (กรณีละ 1 ราย)
//   @TORM-06    ข้อ 06 — คัดกรอง ESI 3 อยู่ในโซน
//   @TORM-08    ข้อ 08 — คัดกรอง ESI 4 รอตรวจในโซน (สร้างไว้ก่อน ให้เวลารอเกินเป้า)
//   @TORM-09    ข้อ 09 — คัดกรอง + Physician Note + Order จนเกิดงานพยาบาล → กดรับ 1 งาน = "กำลังทำ" 1 + "รอรับงาน" ≥ 1 (ผู้ใช้เลือก 8 พ.ย.)
//   @TORM-10    ข้อ 10 — แพ้ยา + เปิด Visit ER ยังไม่คัดกรอง (แบบราย C · R31)
//   @TORM-11-1 / -2 / -3   ข้อ 11 — เปิด Visit ER แล้ว ยังไม่คัดกรอง (ได้เลขคิว ≥ 3 ราย)
//   @TORM-Q1 … @TORM-Q5    ชุดเรียงคิว Fast track → ESI → MEWS → LOS (TOR 4.9.8.3.1 / 4.9.8.8.2) ชื่อ "UAT SORT-xx" — **รันตามลำดับ Q1 → Q5**
//               Q1 ESI 3 + Fast Track Sepsis · Q2 ESI 2 MEWS สูง · Q3 ESI 2 MEWS ต่ำ · Q4 ESI 4 (มาก่อน LOS ยาวกว่า) · Q5 ESI 4 (มาทีหลัง)
//               ลำดับที่ควรเห็นบนรายการ: Q1 → Q2 → Q3 → Q4 → Q5
//   @TORM-HX    คนไข้มีประวัติการรักษาครบ OPD + IPD + ER — Timeline ER ทุกขั้น เปิด Visit → ลงนาม Discharge → ปิด Visit (ชื่อ "UAT HX-xx" · รายละเอียดเหนือ prepareHistory)
//   ข้อ 13 / 14 ใช้สคริปต์เดิม: npm run mock:uat-er -- --headed --grep "ราย D" · --grep "ราย E"
//
// รัน (เปิดจอ ทีละราย R31): npm run mock:tor -- --grep "@TORM-01-1"
// ผู้ป่วยที่สร้างจดที่ mock-data/created-patients.md (ราย "TOR-M xx") · ภาพทุกขั้น clips/UAT-ER-tor/TORM-xx-<เวลา>/

const TEST_TIMEOUT = 20 * 60_000;

/**
 * TORM_RESUME=1 — ทำขั้นที่ค้างต่อกับผู้ป่วยรายล่าสุดของ tag นั้นใน created-patients.md (ไม่ลงทะเบียนใหม่)
 * ใช้เมื่อฟอร์มคัดกรองล็อก "ร่างถูกแก้ไขจากที่อื่น" (SBH Prod 8 พ.ย. 2026 TORM-04) — เปิดหน้า Visit ใหม่แล้วกรอก / เลือกระดับ + โซนใหม่
 * ทำต่อได้เฉพาะรายที่มี Visit ER แล้ว · ขั้นที่ทำต่อ = คัดกรอง → Physician Note → Order → งานพยาบาล ตามแผนของ tag
 */
const RESUME = process.env.TORM_RESUME === '1';
/** ทำต่อเริ่มที่ขั้นไหน: `triage` (ตั้งต้น) · `note` (คัดกรองแล้ว) · `order` (คัดกรอง + Physician Note แล้ว) */
const RESUME_FROM = RESUME ? (process.env.TORM_RESUME_FROM ?? 'triage') : 'triage';
const SKIP_TRIAGE = ['note', 'order', 'task'].includes(RESUME_FROM);
const SKIP_NOTE = ['order', 'task'].includes(RESUME_FROM);
const SKIP_ORDER = RESUME_FROM === 'task';

/**
 * กดรับงานพยาบาล 1 งานในหน้า "รายการงานพยาบาล" → "กำลังทำ"
 * SBH Prod 8 พ.ย. 2026 23:13: ปุ่มท้ายแถวชื่อ "รับ Order" (เดิม "รับงาน" — acceptNurseTask ใน uat-er.ts ยังใช้ชื่อเดิม)
 */
async function acceptOneNurseTask(page: Page, visit: ErVisit) {
  const main = page.getByRole('main');
  await page.goto('/cortex/er/nurse-task-list');
  await main.getByText(`HN ${visit.hn} VN ${visit.vn}`, { exact: true }).click({ timeout: 60_000 });
  await expect(main.getByText(`HN ${visit.hn}`, { exact: true }).first()).toBeVisible();
  const accept = main.getByRole('button', { name: /^รับ ?(Order|งาน)$/ }).first();
  await expect(accept).toBeVisible({ timeout: 30_000 });
  const accepted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/cortex-api\/er\/nurse-tasks\/[^/]+\/accept$/.test(new URL(r.url()).pathname), { timeout: 30_000 });
  await accept.click();
  const res = await accepted;
  expect(res.ok(), `รับงานพยาบาลได้ ${res.status()}`).toBe(true);
}

function lastRecorded(label: string): { patient: NewPatient; visit: ErVisit } {
  const file = path.join(__dirname, 'created-patients.md');
  const row = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter((cells) => cells[2] === SYSTEM && cells[3] === label)
    .at(-1);
  if (!row || !/^E\d/.test(row[7] ?? '')) throw new Error(`TORM_RESUME: ไม่มีผู้ป่วย "${label}" ที่มี Visit ER ใน created-patients.md`);
  const [firstName, familyName] = row[4].split(' ');
  return { patient: { citizenId: row[8], firstName, familyName, gender: 'ชาย', birthDate: '15/01/1990' }, visit: { hn: row[5], vn: row[6], en: row[7] } };
}

interface Plan {
  /** ป้ายใน created-patients.md / โฟลเดอร์ภาพ เช่น "TORM-04" */
  key: string;
  /** ข้อ UAT ที่ใช้ตั้งชื่อ "UAT ER<ข้อ>-xx" · ใส่ prefix แทนได้ (ชุดเรียงคิว "SORT-") */
  uatNo?: number;
  prefix?: string;
  /** สถานะที่ต้องการ (จดลงไฟล์) */
  goal: string;
  /** ไม่เปิด Visit ER ตอนลงทะเบียน */
  withoutVisit?: boolean;
  /** บันทึกแพ้ยาก่อนเปิด Visit (แบบราย C) แล้วค่อยเปิด Visit ER */
  allergyThenVisit?: boolean;
  triage?: TriageFull;
  physicianNote?: boolean;
  orders?: string[];
  /** กดรับงานพยาบาล 1 งาน (เหลือ "รอรับงาน" อย่างน้อย 1) */
  acceptOneTask?: boolean;
  /** บันทึกแพ้ยาหลังคัดกรอง แล้วปิด Visit ที่การเงิน (ข้อ 01 กรณี 1.1) */
  allergyThenClose?: boolean;
}

function hhmm(date: Date) {
  return date.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
}

/** หลังเปิด Visit: หน้าผู้ป่วยโหลดเสร็จ + ฟอร์มคัดกรองรุ่นใหม่ขึ้น (แบบ expectNewTriageForm ของ UAT-ER-tor-03-06) */
async function waitTriageForm(page: Page, visit: ErVisit) {
  await expect(page.getByRole('main').getByText(`VN ${visit.vn}`, { exact: true }).filter({ visible: true }).first(), 'หน้าผู้ป่วยต้องโหลดเสร็จหลังเปิด Visit').toBeVisible({ timeout: 120_000 });
  await expectVisitHeader(page, visit);
  await expect(erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรอง ER ต้องเปิดต่อทันทีหลังเปิด Visit').toBeVisible({ timeout: 90_000 });
}

async function prepare(page: Page, plan: Plan) {
  test.setTimeout(TEST_TIMEOUT);
  const play = new TorPlay(page, plan.key);
  const authorization = trackAuthorization(page);
  const done: string[] = [];
  console.log(`\n===== ${plan.key} (${SYSTEM}) — ${plan.goal} · เริ่ม ${hhmm(new Date())} =====`);

  const label = `TOR-M ${plan.key.replace('TORM-', '')}`;
  const resumed = RESUME ? lastRecorded(label) : undefined;
  await gotoErDashboard(page);
  const fresh: NewPatient = resumed?.patient ?? (plan.prefix ? await nextPrefixedPatient(page, authorization(), plan.prefix) : await nextUatPatient(page, authorization(), plan.uatNo!));
  const name = `${fresh.firstName} ${fresh.familyName}`;
  let hn = resumed?.visit.hn ?? '';
  let visit: ErVisit | undefined = resumed?.visit;
  const record = () => {
    const failed = play.results.filter((r) => !r.ok).map((r) => r.title);
    const state = `${done.join(' · ') || '-'}${play.notes.length ? ` ‖ ข้อสังเกต: ${play.notes.join(' · ')}` : ''}${failed.length ? ` ‖ ไม่สำเร็จ: ${failed.join(' · ')}` : ''}`;
    if (hn) recordMockPatient(label, fresh, visit ?? { hn }, `${resumed ? '(ทำต่อ TORM_RESUME) ' : ''}${state}`);
  };

  try {
    const withoutVisit = plan.withoutVisit || plan.allergyThenVisit;
    if (resumed) {
      await play.step(`เปิดหน้า Visit ${resumed.visit.en} ของ ${name} ใหม่ (ทำขั้นที่ค้างต่อ)`, async () => {
        await gotoVisit(page, resumed.visit);
        await expectVisitHeader(page, resumed.visit);
      });
      play.patient('ทำต่อ', { ...resumed.visit, name });
    }
    const reg = resumed ? { filled: ['(ลงทะเบียนไว้แล้ว)'], skipped: [] as string[] } : await play.step(`ลงทะเบียน ${name} ครบข้อมูล (เบอร์ · รูป · ที่อยู่)${withoutVisit ? ' ไม่เปิด Visit' : ' + เปิด Visit ER สิทธิ UC'}`, async () => {
      const r = await registerFull(page, fresh, { withoutVisit });
      hn = r.hn;
      noteFilled(play, 'ลงทะเบียน', r.filled, r.skipped);
      if (!withoutVisit) {
        if (!r.visit) throw new Error(`ลงทะเบียนได้ HN ${r.hn} แต่ไม่ได้ Visit ER`);
        visit = r.visit;
        await waitTriageForm(page, r.visit);
      }
      return r;
    });
    if (!reg) throw new Error(`${plan.key}: ลงทะเบียนไม่สำเร็จ`);
    done.push(`ลงทะเบียนครบ (${reg.filled.length} ส่วน)`);
    console.log(`  ${plan.key}: ${name} HN ${hn}${visit ? ` · ${visit.vn} · ${visit.en}` : ''}`);

    if (plan.allergyThenVisit) {
      const allergy = await play.step('บันทึกประวัติแพ้ยาตัวอย่าง (paracetamol)', async () => {
        await gotoPatient(page, hn);
        return recordDrugAllergy(page);
      });
      if (allergy) done.push(`แพ้ยา ${allergy}`);
      await play.step('เปิด Visit ER สิทธิ UC (ขึ้น Dashboard · ยังไม่คัดกรอง)', async () => {
        await gotoErDashboard(page);
        visit = await openErVisitForHn(page, hn);
        await expectVisitHeader(page, visit);
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
      });
    }
    if (visit) done.push('เปิด Visit ER สิทธิ UC');

    if (plan.triage && visit && SKIP_TRIAGE) done.push('คัดกรองไว้แล้ว (รอบก่อน)');
    if (plan.triage && visit && !SKIP_TRIAGE) {
      const zone = await play.step(`คัดกรองครบทุก Section ESI ${plan.triage.level}${plan.triage.fastTrack ? ` + Fast Track ${plan.triage.fastTrack.source}` : ''} แล้วบันทึก`, async () => {
        const r = await fillTriageFull(page, plan.triage!);
        noteFilled(play, 'คัดกรอง', r.filled, r.skipped);
        const ud = r.filled.find((f) => f.startsWith('Underlying'));
        if (plan.triage!.underlying && !ud) play.note('U/D บันทึกไม่ได้ (ดูข้อสังเกตคัดกรอง)');
        await saveTriageFull(page, visit!, `คัดกรอง ${plan.key}`);
        return { zone: r.zone, ud };
      });
      if (zone) done.push(`คัดกรอง ESI ${plan.triage.level} โซน ${zone.zone}${zone.ud ? ` · ${zone.ud}` : ''}${plan.triage.fastTrack ? ` · Fast Track ${plan.triage.fastTrack.source}` : ''}`);
    }

    if (plan.physicianNote && visit && SKIP_NOTE) done.push('ER Physician Note ไว้แล้ว (รอบก่อน)');
    if (plan.physicianNote && visit && !SKIP_NOTE) {
      const note = await play.step('แพทย์บันทึก ER Physician Note ครบ (มี Diagnosis — R21)', async () => {
        await gotoVisit(page, visit!);
        const r = await savePhysicianNoteFull(page);
        noteFilled(play, 'ER Physician Note', r.filled, r.skipped);
        return r;
      });
      if (note) done.push(`ER Physician Note (Dx ${note.dx})`);
    }

    if (plan.orders?.length && visit && SKIP_ORDER) done.push(`Order ${plan.orders.join(' + ')} ไว้แล้ว (รอบก่อน)`);
    if (plan.orders?.length && visit && !SKIP_ORDER) {
      const ok = await play.step(`สั่ง Order ${plan.orders.join(' + ')} แล้วส่งคำสั่ง (ผลยังไม่ออก)`, async () => {
        await gotoVisit(page, visit!);
        // SBH Prod 8 พ.ย. 2026 23:00: กดเมนู One Day Order แล้วแท็บเปิดที่แถบบนแต่จอยังอยู่ Overview → เปิดแท็บก่อน แล้วค่อยให้ submitOrders กดเมนู
        const orderTab = page.getByRole('main').getByText('One Day Order', { exact: true }).first();
        if (await orderTab.isVisible({ timeout: 15_000 }).catch(() => false)) await orderTab.click();
        await submitOrders(page, plan.orders!);
        return true;
      });
      if (ok) done.push(`Order ${plan.orders.join(' + ')} รอผล`);
    }

    if (plan.acceptOneTask && visit) {
      await play.step('งานพยาบาล: กดรับ 1 งาน → "กำลังทำ" 1 + "รอรับงาน" อย่างน้อย 1', async () => {
        let tasks: NurseTask[] = [];
        // งานเกิดตามหลังการส่งคำสั่งเล็กน้อย → อ่านซ้ำจนครบ 2 งาน
        await expect(async () => {
          tasks = await fetchNurseTasks(page, authorization(), visit!.en);
          expect(tasks.length).toBeGreaterThanOrEqual(2);
        })
          .toPass({ timeout: 60_000 })
          .catch(() => undefined);
        expect(tasks.length, 'Order ที่ส่งแล้วต้องเกิดงานพยาบาลอย่างน้อย 2 งาน (รับ 1 ค้างรอรับ 1)').toBeGreaterThanOrEqual(2);
        await acceptOneNurseTask(page, visit!);
        tasks = await fetchNurseTasks(page, authorization(), visit!.en);
        await test.info().attach('งานพยาบาลของผู้ป่วย', { body: JSON.stringify(tasks, null, 2), contentType: 'application/json' });
        const count = (status: string) => tasks.filter((t) => t.status === status).length;
        done.push(`งานพยาบาล: กำลังทำ ${count('RUNNING')} · รอรับงาน ${count('PENDING')}`);
        expect(count('RUNNING'), 'ต้องมีงาน "กำลังทำ" 1 งาน').toBe(1);
        expect(count('PENDING'), 'ต้องเหลืองาน "รอรับงาน" อย่างน้อย 1 งาน').toBeGreaterThanOrEqual(1);
      });
    }

    if (plan.allergyThenClose && visit) {
      const allergy = await play.step('บันทึกประวัติแพ้ยาตัวอย่าง (paracetamol)', async () => {
        await gotoPatient(page, hn);
        return recordDrugAllergy(page);
      });
      if (allergy) done.push(`แพ้ยา ${allergy}`);
      const closed = await play.step('ปิด Visit ER ที่หน้าการเงิน (ให้เหลือประวัติ ER 1 ครั้ง ไม่มี Visit ค้าง)', () => closeVisitAtCashier(page, hn, visit!.vn));
      if (closed) done.push(`ปิด Visit ${visit.vn} ที่การเงินแล้ว (ประวัติ ER 1 ครั้ง · ไม่มี Visit ค้าง)`);
    } else if (visit && !plan.triage) {
      done.push('ยังไม่คัดกรอง');
    }
    if (plan.withoutVisit) done.push('ยังไม่มี Visit');
  } finally {
    record();
    play.finish();
  }
  const failed = play.results.filter((r) => !r.ok);
  expect(failed.map((f) => `${f.title} — ${f.detail ?? ''}`), `${plan.key}: ขั้นที่เตรียมไม่สำเร็จ`).toEqual([]);
}

// ---------- รายการผู้ป่วย ----------

const ESI3: TriageFull = { level: 3, vitals: TOR_VITALS_NORMAL, gcs: GCS_FULL };
const ESI4: TriageFull = { level: 4, vitals: TOR_VITALS_NORMAL, gcs: GCS_FULL };
/** Lab บน Prod ไม่เกิดงานพยาบาล (เกิดจาก Imaging) — IMG0000420 ทำปุ่มส่งคำสั่งค้าง (3 ต.ค. 2026) → ใช้ Activity เป็นงานที่ 2 */
const TASK_ORDERS = [TOR_ORDER_CODES.lab, TOR_ORDER_CODES.img[0], ...TOR_ORDER_CODES.act];

const PLANS: (Plan & { title: string })[] = [
  { key: 'TORM-01-1', uatNo: 1, title: 'ข้อ 01 กรณี 1.1 / 1.3: รูป + แพ้ยา + U/D + ประวัติ ER 1 ครั้ง ไม่มี Visit ค้าง', goal: 'รูป · แพ้ยา · U/D · ประวัติ ER', triage: { ...ESI4, underlying: 'Hypertension' }, allergyThenClose: true },
  { key: 'TORM-01-2', uatNo: 1, title: 'ข้อ 01 กรณี 1.2: มี HN ยังไม่มี Visit', goal: 'มี HN ไม่มี Visit', withoutVisit: true },
  { key: 'TORM-04', uatNo: 4, title: 'ข้อ 04: คัดกรอง + Physician Note + Order LAB / IMG รอผล', goal: 'คัดกรอง · Note · LAB / IMG รอผล', triage: ESI3, physicianNote: true, orders: [TOR_ORDER_CODES.lab, TOR_ORDER_CODES.img[0]] },
  { key: 'TORM-05-1', uatNo: 5, title: 'ข้อ 05 กรณี 5.1: เปิด Visit ER ยังไม่คัดกรอง', goal: 'เปิด Visit ยังไม่คัดกรอง' },
  { key: 'TORM-05-2', uatNo: 5, title: 'ข้อ 05 กรณี 5.2: เปิด Visit ER ยังไม่คัดกรอง', goal: 'เปิด Visit ยังไม่คัดกรอง' },
  { key: 'TORM-05-3', uatNo: 5, title: 'ข้อ 05 กรณี 5.3: เปิด Visit ER ยังไม่คัดกรอง', goal: 'เปิด Visit ยังไม่คัดกรอง' },
  { key: 'TORM-06', uatNo: 6, title: 'ข้อ 06: คัดกรอง ESI 3 อยู่ในโซน', goal: 'คัดกรองแล้วอยู่ในโซน', triage: ESI3 },
  { key: 'TORM-08', uatNo: 8, title: 'ข้อ 08: คัดกรอง ESI 4 รอตรวจในโซน', goal: 'คัดกรองแล้วรอตรวจ (ให้เวลารอเกินเป้า)', triage: ESI4 },
  { key: 'TORM-09', uatNo: 9, title: 'ข้อ 09: งานพยาบาล "กำลังทำ" 1 + "รอรับงาน" ≥ 1', goal: 'งานพยาบาลกำลังทำ + รอรับงาน', triage: ESI3, physicianNote: true, orders: TASK_ORDERS, acceptOneTask: true },
  { key: 'TORM-10', uatNo: 10, title: 'ข้อ 10: แพ้ยา + เปิด Visit ER ยังไม่คัดกรอง', goal: 'แพ้ยา · เปิด Visit ยังไม่คัดกรอง', allergyThenVisit: true },
  { key: 'TORM-11-1', uatNo: 11, title: 'ข้อ 11 รายที่ 1: เปิด Visit ER ยังไม่คัดกรอง (มีเลขคิว)', goal: 'เปิด Visit ยังไม่คัดกรอง' },
  { key: 'TORM-11-2', uatNo: 11, title: 'ข้อ 11 รายที่ 2: เปิด Visit ER ยังไม่คัดกรอง (มีเลขคิว)', goal: 'เปิด Visit ยังไม่คัดกรอง' },
  { key: 'TORM-11-3', uatNo: 11, title: 'ข้อ 11 รายที่ 3: เปิด Visit ER ยังไม่คัดกรอง (มีเลขคิว)', goal: 'เปิด Visit ยังไม่คัดกรอง' },
  { key: 'TORM-Q1', prefix: 'SORT-', title: 'ชุดเรียงคิว Q1: ESI 3 + Suspect Fast Track Sepsis', goal: 'เรียงคิว อันดับ 1 (Fast Track)', triage: { ...ESI3, fastTrack: /Sepsis/ } },
  { key: 'TORM-Q2', prefix: 'SORT-', title: 'ชุดเรียงคิว Q2: ESI 2 MEWS สูง', goal: 'เรียงคิว อันดับ 2 (ESI 2 MEWS สูง)', triage: { level: 2, vitals: TOR_VITALS_HIGH_MEWS, gcs: GCS_FULL } },
  { key: 'TORM-Q3', prefix: 'SORT-', title: 'ชุดเรียงคิว Q3: ESI 2 MEWS ต่ำ', goal: 'เรียงคิว อันดับ 3 (ESI 2 MEWS ต่ำ)', triage: { level: 2, vitals: TOR_VITALS_NORMAL, gcs: GCS_FULL } },
  { key: 'TORM-Q4', prefix: 'SORT-', title: 'ชุดเรียงคิว Q4: ESI 4 มาก่อน (LOS ยาวกว่า)', goal: 'เรียงคิว อันดับ 4 (ESI 4 มาก่อน)', triage: ESI4 },
  { key: 'TORM-Q5', prefix: 'SORT-', title: 'ชุดเรียงคิว Q5: ESI 4 มาทีหลัง', goal: 'เรียงคิว อันดับ 5 (ESI 4 มาทีหลัง)', triage: ESI4 },
];

// ---------- TORM-HX คนไข้มีประวัติการรักษาครบ OPD + IPD + ER (ผู้ใช้สั่ง 9 พ.ย. 2026 · ยังไม่ได้รัน) ----------
// ผู้ใช้เลือก: IPD = Visit ER รอบแรก → Admit → AN → ลงเตียง SBHAUTO → Discharge ที่ IPD (คืนเตียง) → ปิด Visit
//             OPD = เปิด Visit + เช็คอิน + ปิด Visit · Timeline ER รอบ 2 = ทุก event แต่ Consult "ขอ" อย่างเดียว ไม่ตอบกลับ
// ลำดับ: ลงทะเบียน (ไม่เปิด Visit) → OPD → ER #1 (Admit) → IPD → ER #2 (Timeline ครบ → ลงนาม Discharge) → ปิด Visit ที่การเงิน
// ชื่อ "UAT HX-xx" · ทุก Visit ปิดหมด ไม่มี Visit ค้าง · สะดุดกลางทาง → TORM_RESUME=1 ทำต่อจากขั้นที่ค้าง (สถานะเก็บใน .cache/torm-hx-<ระบบ>.json)

interface HxState {
  patient?: NewPatient;
  hn?: string;
  opd?: { vn: string; en: string; clinic: string; doctor: string };
  er1?: ErVisit;
  an?: string;
  ward?: string;
  bed?: string;
  er2?: ErVisit;
  /** ขั้นที่ทำสำเร็จแล้ว (key ของ stage) */
  done: string[];
  /** สรุปที่จดลง created-patients.md */
  summary: string[];
}

const HX_FILE = path.join(__dirname, '..', '.cache', `torm-hx-${SYSTEM}.json`);
const HX_TIMEOUT = 60 * 60_000;
const HX_ADMISSION_METHOD = 'รับไว้รักษาต่อIPD';
const HX_DISCHARGE_METHOD = 'With Approval';
const HX_CONSULT = 'ขอปรึกษาอาการปวดท้องใต้ลิ้นปี่ (Mock TOR ประวัติครบ)';
const HX_CONSULT_DOCTOR = SYSTEM === 'dev-x' ? { search: 'มานะ', name: /ทดสอบ มานะ/ } : { search: 'เอื้อเฟื้อ', name: /วิชัย.*เอื้อเฟื้อ/ };
/** event ที่ Timeline ของ Visit ER รอบ 2 ต้องมี (ชื่อบนจอตาม SBH-1038) — ไม่รวม "Consult ตอบกลับแล้ว" ตามที่ผู้ใช้เลือก */
const HX_TIMELINE: Record<string, string> = {
  ER_VISIT_ARRIVED: 'เปิด ER Visit / ผู้ป่วยมาถึง',
  FIRST_TRIAGE: 'คัดกรองครั้งแรก',
  PHYSICIAN_TREATMENT_STARTED: 'แพทย์เริ่มการรักษา',
  PHYSICIAN_EXAM_COMPLETED: 'แพทย์ตรวจเสร็จสิ้น',
  ORDER_SENT: 'ส่ง Order',
  ER_REASSESSMENT: 'คัดกรองซ้ำ',
  CPR_STARTED: 'เริ่ม CPR',
  CPR_STOPPED: 'หยุด CPR',
  CONSULT_REQUESTED: 'ขอ Consult',
  DISPOSITION_DRAFT_SAVED: 'บันทึกร่างการจำหน่าย',
  DISPOSITION_COMPLETED: 'ลงนามการจำหน่าย',
};

function readHx(): HxState {
  if (!fs.existsSync(HX_FILE)) throw new Error(`TORM_RESUME: ไม่มีไฟล์สถานะ ${HX_FILE} — รันรอบแรกโดยไม่ใส่ TORM_RESUME`);
  return JSON.parse(fs.readFileSync(HX_FILE, 'utf8')) as HxState;
}

function saveHx(state: HxState) {
  fs.mkdirSync(path.dirname(HX_FILE), { recursive: true });
  fs.writeFileSync(HX_FILE, JSON.stringify(state, null, 2));
}

/** ปิด Visit ที่การเงิน · ระบบแจ้ง Uninvoiced = ชำระเงินสดก่อนแล้วปิดใหม่ (แบบเก็บกวาดของ SBH-2079) */
async function closeAtCashier(page: Page, hn: string, vn: string): Promise<string> {
  const once = () => closeVisitAtCashier(page, hn, vn);
  const closed = await once().catch(async (error: Error) => {
    if (!/Uninvoiced/.test(error.message)) throw error;
    await gotoCashierAccount(page, hn, vn);
    await payAllInCash(page);
    return once();
  });
  return closed.result === 'closed' ? `ปิด Visit ${vn} ที่การเงินแล้ว${closed.outstanding ? ` (ยอดค้าง ${closed.outstanding})` : ''}` : `Visit ${vn} ปิดอยู่ก่อนแล้ว`;
}

/** เปิด Visit ER สิทธิ UC ให้ HN เดิม → เปิดหน้า Visit รอฟอร์มคัดกรอง */
async function openErForHn(page: Page, hn: string): Promise<ErVisit> {
  await gotoErDashboard(page);
  const visit = await openErVisitForHn(page, hn);
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  await gotoVisit(page, visit);
  await waitTriageForm(page, visit);
  return visit;
}

/** เปิดแผง Disposition → เริ่มจำหน่าย + Improved + วิธีจำหน่าย → บันทึกฉบับร่าง (แบบ SBH-1038 TC-012) → คืนสถานะร่าง */
async function draftDisposition(page: Page, visit: ErVisit, method: string): Promise<string> {
  const main = page.getByRole('main');
  await gotoVisit(page, visit);
  await careMenu(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }).first());
  await main.getByText('สรุปการจำหน่าย', { exact: true }).first().click();
  await page.mouse.move(600, 600);
  const status = await draftDischarge(page, method);
  await chooseDispositionDiagnosis(page, 'K30').catch(() => undefined);
  return status;
}

/** เปิดแท็บ One Day Order แล้วส่งคำสั่ง (แบบ prepare) */
async function sendOrders(page: Page, visit: ErVisit, codes: string[]) {
  await gotoVisit(page, visit);
  const orderTab = page.getByRole('main').getByText('One Day Order', { exact: true }).first();
  if (await orderTab.isVisible({ timeout: 15_000 }).catch(() => false)) await orderTab.click();
  await submitOrders(page, codes);
}

/** CPR Progression: กด Start CPR (Rhythm VF) หรือ Stop CPR (Asystole) → คืนเวลาที่บันทึก */
async function cprEvent(page: Page, button: 'Start CPR' | 'Stop CPR'): Promise<string> {
  const form = await openCprForm(page);
  const rhythm = form.getByRole('button', { name: button === 'Start CPR' ? 'VF' : 'Asystole', exact: true });
  if (await rhythm.isVisible().catch(() => false)) await rhythm.click();
  const comment = form.getByRole('textbox', { name: /Add CPR comment/ });
  if (await comment.isVisible().catch(() => false)) await comment.fill(`${button} (Mock TOR ประวัติครบ)`);
  await expect(cprButton(form, button), `ต้องมีปุ่ม ${button}`).toBeVisible({ timeout: 30_000 });
  return (await saveCprEvent(page, form, button, button)).time;
}

async function prepareHistory(page: Page, browser: Browser) {
  test.setTimeout(HX_TIMEOUT);
  const key = 'TORM-HX';
  const play = new TorPlay(page, key);
  const authorization = trackAuthorization(page);
  const note = (t: string, d: string) => play.note(`${t}: ${d}`);
  console.log(`\n===== ${key} (${SYSTEM}) — ประวัติครบ OPD + IPD + ER · เริ่ม ${hhmm(new Date())} =====`);
  await gotoErDashboard(page);

  const st: HxState = RESUME ? readHx() : { done: [], summary: [] };
  if (!RESUME && fs.existsSync(HX_FILE)) console.log(`  ไฟล์สถานะรอบก่อนถูกเขียนทับ (รายเดิม: ${JSON.stringify(readHx().patient?.familyName ?? '-')}) — รอบนี้ลงทะเบียนผู้ป่วยใหม่`);
  st.patient ??= await nextPrefixedPatient(page, authorization(), 'HX-');
  const patient = st.patient;
  const name = `${patient.firstName} ${patient.familyName}`;
  if (RESUME) console.log(`  ทำต่อ ${name} HN ${st.hn ?? '-'} · ทำแล้ว: ${st.done.join(', ') || '-'}`);
  saveHx(st);

  /** ทำ 1 ขั้น: ข้ามถ้าทำไว้แล้ว · พัง = หยุดทั้งเส้น (ขั้นถัดไปต้องใช้ผลขั้นนี้) ยกเว้น optional */
  const stage = async (id: string, title: string, body: () => Promise<string | void>, opts: { optional?: boolean } = {}) => {
    if (st.done.includes(id)) {
      console.log(`  – ข้าม (ทำไว้แล้ว): ${title}`);
      return;
    }
    const result = await play.step(title, async () => (await body()) ?? 'ok');
    if (result === undefined) {
      if (opts.optional) return;
      throw new Error(`${key}: ขั้น "${title}" ไม่สำเร็จ — หยุด · แก้แล้วทำต่อด้วย TORM_RESUME=1`);
    }
    if (result !== 'ok') st.summary.push(result);
    st.done.push(id);
    saveHx(st);
  };

  try {
    // ---------- ลงทะเบียน ----------
    await stage('register', `ลงทะเบียน ${name} ครบข้อมูล (เบอร์ · รูป · ที่อยู่) ไม่เปิด Visit`, async () => {
      const r = await registerFull(page, patient, { withoutVisit: true });
      st.hn = r.hn;
      noteFilled(play, 'ลงทะเบียน', r.filled, r.skipped);
      return `ลงทะเบียน HN ${r.hn}`;
    });
    const hn = st.hn!;
    console.log(`  ${key}: ${name} HN ${hn}`);

    // ---------- 1) ประวัติ OPD: เปิด Visit + เช็คอิน + ปิด Visit ----------
    await stage('opd-open', 'OPD: เปิด Visit Walk-in แผนกอายุรกรรม (แพทย์ตามราย D)', async () => {
      for (let round = 1; ; round++) {
        await gotoPatient(page, hn);
        try {
          st.opd = await openOpdVisit(page);
          break;
        } catch (error) {
          // ตารางสิทธิโหลดไม่ขึ้นเป็นบางครั้ง (ราย D) — ลองใหม่เฉพาะตอนระบบปฏิเสธการสร้าง
          if (round >= 3 || !/เปิด Visit OPD ไม่สำเร็จ/.test((error as Error).message)) throw error;
        }
      }
      return `OPD ${st.opd!.vn} ${st.opd!.clinic}`;
    });
    await stage('opd-checkin', 'OPD: ลงตารางแพทย์ (ถ้าเป็นคำขอ Walk-in) + เช็คอิน', async () => {
      const opd = st.opd!;
      if (!opd.doctor) {
        const s = await scheduleWalkInRequest(page, hn);
        opd.doctor = `${s.doctor} ${s.slot}`;
      }
      const queue = await checkInOpdVisit(page, { hn, vn: opd.vn, en: opd.en });
      return `เช็คอิน (${queue}) แพทย์ ${opd.doctor}`;
    });
    await stage('opd-close', 'OPD: ปิด Visit ที่การเงิน', () => closeAtCashier(page, hn, st.opd!.vn));

    // ---------- 2) ประวัติ IPD: ER รอบแรก → Admit → AN → ลงเตียง → Discharge IPD → ปิด Visit ----------
    await stage('er1-open', 'ER #1: เปิด Visit ER สิทธิ UC', async () => {
      st.er1 = await openErForHn(page, hn);
      return `ER #1 ${st.er1.vn} · ${st.er1.en}`;
    });
    const er1 = st.er1!;
    await stage('er1-triage', 'ER #1: คัดกรองครบทุก Section ESI 3 แล้วบันทึก', async () => {
      await gotoVisit(page, er1);
      const r = await fillTriageFull(page, ESI3);
      noteFilled(play, 'ER #1 คัดกรอง', r.filled, r.skipped);
      await saveTriageFull(page, er1, 'คัดกรอง ER #1');
      return `ER #1 ESI 3 โซน ${r.zone}`;
    });
    await stage('er1-note', 'ER #1: แพทย์บันทึก ER Physician Note (Diagnosis — R21)', async () => {
      await gotoVisit(page, er1);
      const r = await savePhysicianNoteFull(page);
      noteFilled(play, 'ER #1 Physician Note', r.filled, r.skipped);
      return `ER #1 Physician Note Dx ${r.dx}`;
    });
    await stage('er1-admit', 'ER #1: สร้าง Admit Order → ศูนย์จัดการเตียง สร้าง AN', async () => {
      await gotoVisit(page, er1);
      const r = await admitCreateAn(page, er1, authorization, note, 'ปวดท้องใต้ลิ้นปี่ อาการไม่ดีขึ้น ต้องนอนโรงพยาบาล (Mock TOR ประวัติครบ)');
      st.an = r.an;
      st.ward = r.ward;
      return `AN ${r.an} หอ ${r.ward}`;
    });
    await stage('er1-dispo', `ER #1: Disposition ${HX_ADMISSION_METHOD} → บันทึกฉบับร่าง → ลงนาม`, async () => {
      await draftDisposition(page, er1, HX_ADMISSION_METHOD);
      await signDisposition(page);
      return `ER #1 ลงนาม Disposition ${HX_ADMISSION_METHOD}`;
    });
    await stage('ipd-bed', 'IPD: รับผู้ป่วยลงเตียง SBHAUTO (R97)', async () => {
      st.bed = await putToBed(page, er1, st.ward!, note);
      return `ลงเตียง ${st.bed}`;
    });
    await stage('ipd-discharge', 'IPD: Discharge ที่หอผู้ป่วย (คืนเตียง)', () => ipdDischarge(page, hn, st.ward!));
    await stage('er1-close', 'ER #1: ปิด Visit ที่การเงิน', () => closeAtCashier(page, hn, er1.vn));

    // ---------- 3) ER รอบ 2: Timeline ทุกขั้น เปิด Visit → ลงนาม Discharge → ปิด Visit ----------
    await stage('er2-open', 'ER #2: เปิด Visit ER สิทธิ UC (event เปิด ER Visit)', async () => {
      st.er2 = await openErForHn(page, hn);
      return `ER #2 ${st.er2.vn} · ${st.er2.en}`;
    });
    const er2 = st.er2!;
    await stage('er2-triage', 'ER #2: คัดกรองครบทุก Section ESI 3 (event คัดกรองครั้งแรก)', async () => {
      await gotoVisit(page, er2);
      const r = await fillTriageFull(page, ESI3);
      noteFilled(play, 'ER #2 คัดกรอง', r.filled, r.skipped);
      await saveTriageFull(page, er2, 'คัดกรอง ER #2');
      return `ER #2 ESI 3 โซน ${r.zone}`;
    });
    await stage('er2-note', 'ER #2: ER Physician Note (event แพทย์เริ่มการรักษา + แพทย์ตรวจเสร็จสิ้น)', async () => {
      await gotoVisit(page, er2);
      const r = await savePhysicianNoteFull(page);
      noteFilled(play, 'ER #2 Physician Note', r.filled, r.skipped);
      return `ER #2 Physician Note Dx ${r.dx}`;
    });
    await stage('er2-order', `ER #2: ส่ง Order ${TOR_ORDER_CODES.lab} (event ส่ง Order)`, async () => {
      await sendOrders(page, er2, [TOR_ORDER_CODES.lab]);
      return `ER #2 Order ${TOR_ORDER_CODES.lab}`;
    });
    await stage('er2-retriage', 'ER #2: คัดกรองซ้ำ ESI 2 อาการทรุด (event คัดกรองซ้ำ)', async () => {
      const main = page.getByRole('main');
      await gotoVisit(page, er2);
      const redo = main.getByRole('button', { name: /คัดกรองซ้ำ$/ }).filter({ visible: true }).first();
      await expect(redo).toBeVisible({ timeout: 60_000 });
      await redo.scrollIntoViewIfNeeded();
      await redo.click();
      await expect(main.getByText('การคัดกรองครั้งใหม่').first(), 'ต้องเปิดฟอร์ม "การคัดกรองครั้งใหม่"').toBeVisible({ timeout: 60_000 });
      const r = await fillTriageFull(page, { level: 2, vitals: TOR_VITALS_HIGH_MEWS, gcs: GCS_FULL, chiefComplaint: false, illness: 'อาการทรุดลงระหว่างรอตรวจ หายใจเร็ว ความดันต่ำ (Mock TOR ประวัติครบ)' });
      noteFilled(play, 'ER #2 คัดกรองซ้ำ', r.filled, r.skipped);
      await saveTriageFull(page, er2, 'บันทึกคัดกรองซ้ำ ER #2');
      return `ER #2 คัดกรองซ้ำ ESI 2 โซน ${r.zone}`;
    });
    await stage('er2-cpr', 'ER #2: CPR Start (VF) → รอ 1 นาที → Stop (event เริ่ม / หยุด CPR)', async () => {
      await gotoVisit(page, er2);
      const start = await cprEvent(page, 'Start CPR');
      await page.waitForTimeout(60_000);
      const stop = await cprEvent(page, 'Stop CPR');
      return `ER #2 CPR ${start} → ${stop}`;
    });
    await stage('er2-consult', 'ER #2: ขอ Consult จากหน้าต่างบัญชี Doctor (event ขอ Consult · ไม่ตอบกลับ)', async () => {
      const doctorPage = await openPatientAs(browser, 'Doctor', er2.hn, er2);
      try {
        const target = await requestConsult(doctorPage, HX_CONSULT, { doctor: HX_CONSULT_DOCTOR });
        return `ER #2 ขอ Consult → ${target} (ยังไม่ตอบ)`;
      } finally {
        await doctorPage.context().close().catch(() => undefined);
      }
    });
    await stage('er2-draft', `ER #2: Disposition ${HX_DISCHARGE_METHOD} → บันทึกฉบับร่าง (event บันทึกร่างการจำหน่าย)`, async () => {
      const status = await draftDisposition(page, er2, HX_DISCHARGE_METHOD);
      return `ER #2 ร่างการจำหน่าย (${status || '-'})`;
    });
    await stage('er2-sign', 'ER #2: ลงนาม Disposition Discharge (event ลงนามการจำหน่าย)', async () => {
      const main = page.getByRole('main');
      if (!(await page.getByTestId('er-disposition-finalize').isVisible().catch(() => false))) {
        await gotoVisit(page, er2);
        await careMenu(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }).first());
      }
      await signDisposition(page);
      return `ER #2 ลงนาม Discharge ${HX_DISCHARGE_METHOD}`;
    });
    await stage(
      'er2-timeline',
      'ER #2: Treatment Timeline มี event ครบ (อ่าน API)',
      async () => {
        const events = await fetchTreatmentTimeline(page, authorization(), er2);
        const types = new Set(events.map((e) => e.type));
        play.note(`Timeline ${events.length} event: ${events.map((e) => `${hhmm(new Date(e.occurredAt))} ${HX_TIMELINE[e.type] ?? e.type}`).join(' → ')}`);
        const missing = Object.keys(HX_TIMELINE).filter((t) => !types.has(t)).map((t) => HX_TIMELINE[t]);
        expect(missing, 'Timeline ของ ER #2 ต้องมี event ครบ').toEqual([]);
        return `Timeline ER #2 ครบ ${Object.keys(HX_TIMELINE).length} ชนิด (${events.length} event)`;
      },
      { optional: true },
    );
    await stage('er2-close', 'ER #2: ปิด Visit ที่การเงิน (ไม่มี Visit ค้าง)', async () => {
      const closed = await closeAtCashier(page, hn, er2.vn);
      const after = await fetchTreatmentTimeline(page, authorization(), er2).catch(() => []);
      const extra = after.filter((e) => !(e.type in HX_TIMELINE)).map((e) => e.type);
      if (extra.length) play.note(`Timeline หลังปิด Visit มี event อื่น: ${[...new Set(extra)].join(', ')}`);
      return closed;
    });
  } finally {
    if (st.hn) {
      const failed = play.results.filter((r) => !r.ok).map((r) => r.title);
      const ids = st.er2 ?? st.er1 ?? { hn: st.hn };
      const state = `${RESUME ? '(ทำต่อ TORM_RESUME) ' : ''}${st.summary.join(' · ') || '-'}${play.notes.length ? ` ‖ ข้อสังเกต: ${play.notes.join(' · ')}` : ''}${failed.length ? ` ‖ ไม่สำเร็จ: ${failed.join(' · ')}` : ''}`;
      recordMockPatient('TOR-M HX', patient, ids, state);
    }
    play.finish();
  }
  const failed = play.results.filter((r) => !r.ok);
  expect(failed.map((f) => `${f.title} — ${f.detail ?? ''}`), `${key}: ขั้นที่เตรียมไม่สำเร็จ`).toEqual([]);
}

test.describe(`Mock Data ชุด TOR (${SYSTEM})`, () => {
  for (const plan of PLANS) {
    test(`${plan.key} ${plan.title}`, { tag: [`@${plan.key}`] }, async ({ page }) => prepare(page, plan));
  }
  test('TORM-HX คนไข้มีประวัติการรักษาครบ OPD + IPD + ER (Timeline ER ทุกขั้น เปิด Visit → Discharge)', { tag: ['@TORM-HX'] }, async ({ page, browser }) => prepareHistory(page, browser));
});
