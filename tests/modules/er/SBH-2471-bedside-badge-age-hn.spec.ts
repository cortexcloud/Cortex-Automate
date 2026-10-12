import { type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, expectTriageFormOpen, gotoErDashboard, openErDashboardFromMenu, openVisitDialog, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import {
  NO_PRINT_AGENT_TEXT,
  ageOn,
  badgeDateTime,
  badgeLine,
  badgePage,
  bangkokDate,
  formatThaiAge,
  hideBadge,
  insidePage,
  overlaps,
  parseThaiAge,
  printBadgeButton,
  printBedsideBadge,
  readBadge,
  showBadge,
  type Age,
  type BadgeFields,
  type BadgeLine,
  type BadgePdf,
} from '../../../helpers/functions/er-badge';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { triageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { newTestPatient, type NewPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, recordMockPatient, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, fillTriage, gotoVisit, saveTriageForm } from '../../../mock-data/uat-play';

// SBH-2471 [ER][Triage] Add patient age and HN to bedside name badge — ป้ายปลายเตียง (ปุ่ม `พิมพ์ป้ายปลายเตียง`) เพิ่มบรรทัดอายุ + แถว HN
// แปลงจากชุด Manual: EXE SBH-2493 → SC-001 (SBH-2494) TC-001–002 (SBH-2497–2498) · SC-002 (SBH-2495) TC-003 (SBH-2499) · SC-003 (SBH-2496) TC-004 (SBH-2500) · 2 เทสตาม flow (R9):
//   1) ผู้ป่วย A (ผู้ใหญ่) + B (เด็ก): ป้ายมีอายุ + HN ร่วมกับข้อมูลเดิม · ขนาดหน้า / ไม่ล้น ไม่ทับ · อายุตรงกับที่คำนวณ + รูปแบบเดียวกับที่ระบบแสดง
//   2) ผู้ป่วย C (วันเกิดตรงกับวันเปิด Visit) + D (วันเกิดเป็นวันถัดไป): นับครบปี / ยังไม่ครบปี
// ป้ายตรวจจาก PDF ที่ระบบส่งให้เครื่องพิมพ์ (R18) — เครื่องทดสอบไม่มี print agent จึงขึ้นแจ้งเตือนพิมพ์ไม่ได้ (ไม่ถือว่า fail)
// TC-002 ขั้น 5–6 (พิมพ์กระดาษจริง · อ่านจากระยะไกล) automate ทำไม่ได้ — ตรวจเฉพาะขนาดหน้า ตำแหน่ง และขนาดตัวอักษรใน PDF
// ข้อมูล: ผู้ป่วย AUTO ใหม่ทุกรอบ วันเกิดคิดจากวันที่รัน → เปิด Visit ER สิทธิ UC + Triage ESI 3 → ปิด Visit ที่การเงินท้ายเทส (afterEach)
// ระบบ: SBH Prod มี template ป้ายตัวใหม่แล้ว (ผู้ใช้อนุญาตให้สร้างผู้ป่วย 4 ราย 7 ต.ค. 2026): npm run card:prod -- --headed --grep @SBH-2471
//        dev-x ยังเป็น template เดิม (7 ต.ค. 2026) — เทสจะไม่ผ่านที่ TC-001 ขั้น 5 จนกว่า template ใหม่จะขึ้น
// ช่วง 00:00–06:59 อายุที่ระบบแสดง (แถบหัว / API ผู้ป่วย) ช้าไป 1 วัน (เห็นบน SBH Prod 8 ต.ค. 2026 — ป้ายคิดตามวันที่ไทยถูกต้อง) → TC-003 ขั้น 10 (เทสที่ 1) จะไม่ผ่านถ้ารันช่วงนั้น · เทสที่ 2 ไม่กระทบ (เทียบป้ายกับที่คาดตาม TC)
// ห้ามรันคร่อมเที่ยงคืน: วันเกิดของผู้ป่วยผูกกับวันที่รัน (เทสหยุดเองถ้าเหลือไม่ถึง 12 นาทีก่อนเที่ยงคืน) · บัญชี: Super_User (R6)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const note = (description: string) => test.info().annotations.push({ type: 'ข้อสังเกต', description });

type SubjectKey = 'A' | 'B' | 'C' | 'D';

/** ข้อมูลของผู้ป่วยที่อ่านจากระบบ (แถบหัวของหน้าผู้ป่วย + API) — "ที่จดไว้" ใน TC */
interface SystemRecord {
  name: string;
  /** วันเกิดตามที่แถบหัวแสดง เช่น "7 ต.ค. 2559" */
  birthText: string;
  /** อายุที่แถบหัวแสดง (ไม่รวมวงเล็บ) */
  headerAge: string;
  /** วันเกิดจาก API ผู้ป่วย YYYY-MM-DD */
  birthDate: string;
  apiAge: string;
  /** เวลารับเข้าของ Encounter จาก API บอร์ด (ISO) */
  arrivedAt: string;
  /** วันเวลาที่แถบ Visit แสดง (ถ้ามี) */
  arrivalText?: string;
}

interface Subject {
  key: SubjectKey;
  label: string;
  /** วันเกิด YYYY-MM-DD */
  birth: string;
  patient: NewPatient;
  visit: ErVisit;
  record: SystemRecord;
}

interface ShownBadge {
  overlay: Locator;
  badge: BadgePdf;
  fields: BadgeFields;
}

/** เลื่อนวันที่ YYYY-MM-DD (ปี / เดือนก่อน แล้วค่อยวัน) */
function shiftDate(date: string, { years = 0, months = 0, days = 0 }: { years?: number; months?: number; days?: number }): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y + years, m - 1 + months, d) + days * 86_400_000).toISOString().slice(0, 10);
}

/** YYYY-MM-DD → DD/MM/YYYY (ค.ศ.) แบบที่พิมพ์ลงช่องวันเกิดของฟอร์มลงทะเบียน */
const toInputDate = (date: string) => date.split('-').reverse().join('/');
/** YYYY-MM-DD → DD/MM/พ.ศ. */
const toThaiDate = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}/${Number(date.slice(0, 4)) + 543}`;
const ageText = (line: BadgeLine | undefined) => (line?.text ?? '(ไม่มีบรรทัดอายุ)').replace(/^อายุ\s*/, '');

/** วันเกิดที่ทำให้อายุ ณ วันที่รัน มีทั้งเดือนและวันไม่เป็น 0 (การ์ดไม่ได้บอกว่าเดือน / วันที่เป็น 0 แสดงอย่างไร) */
function birthForAge(runDate: string, age: Age): string {
  let birth = shiftDate(runDate, { years: -age.years, months: -age.months, days: -age.days });
  while (!ageOn(birth, runDate).months || !ageOn(birth, runDate).days) birth = shiftDate(birth, { days: -1 });
  return birth;
}

function header(page: Page, subject: Pick<Subject, 'patient' | 'visit'>) {
  const main = page.getByRole('main');
  const visible = (locator: Locator) => locator.filter({ visible: true }).first();
  return {
    hn: visible(main.getByText(`HN ${subject.visit.hn}`, { exact: true })),
    name: visible(main.getByText(`${subject.patient.firstName} ${subject.patient.familyName}`)),
    /** กล่อง "วันเกิด <วันที่> (<อายุ>)" ของแถบหัว */
    birth: visible(main.getByText('วันเกิด', { exact: true })).locator('xpath=../..'),
    /** กล่องรวม HN + ชื่อ + วันเกิด (อายุ) + เพศ ของแถบหัว */
    info: visible(main.getByText('วันเกิด', { exact: true })).locator('xpath=../../../..'),
    en: visible(main.getByText(subject.visit.en, { exact: true })),
    /** "<คลินิก> · DD/MM/พ.ศ., HH:mm" ในแถบ Visit */
    arrival: visible(main.getByText(/·\s*\d{2}\/\d{2}\/\d{4},?\s+\d{2}:\d{2}/)),
  };
}

test.describe(`SBH-2471 ป้ายปลายเตียง ER แสดงอายุและ HN (${SYSTEM})`, () => {
  // แต่ละเทส: ลงทะเบียน + เปิด Visit + Triage + พิมพ์ป้าย 2 ราย และค้างหน้าจอให้คลิปอ่านทัน · SBH Prod ช้าเป็นพักๆ
  test.describe.configure({ timeout: 720_000 });

  let opened: Map<string, ErVisit>;
  let runDate: string;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
    const now = new Date();
    runDate = bangkokDate(now);
    const minutesLeft = (new Date(`${shiftDate(runDate, { days: 1 })}T00:00:00+07:00`).getTime() - now.getTime()) / 60_000;
    expect(minutesLeft, 'ใกล้เที่ยงคืนเกินไป — วันเกิดของผู้ป่วยผูกกับวันที่รัน ให้รันใหม่หลัง 00:00').toBeGreaterThan(12);
  });

  // ผู้ใช้เลือกให้ปิด Visit ของผู้ป่วยที่เทสเปิด หลังเก็บหลักฐาน (7 ต.ค. 2026) — ทำทั้งตอนผ่านและตอนพังกลางทาง
  test.afterEach(async ({ page }) => {
    await hideBadge(page);
    await hideCompareTable(page);
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  /** ผู้ป่วย AUTO ใหม่ (วันเกิดตามเคส) → เปิด Visit ER สิทธิ UC → Triage ESI 3 พร้อมสัญญาณชีพ → หน้า Overview ของ Visit */
  async function openTriagedVisit(page: Page, key: SubjectKey, label: string, birth: string): Promise<Pick<Subject, 'key' | 'label' | 'birth' | 'patient' | 'visit'>> {
    const patient: NewPatient = { ...newTestPatient(`Badge${key}`), birthDate: toInputDate(birth) };
    const visit = await registerAndOpenErVisit(page, patient).catch(async (error: Error) => {
      // SBH Prod: ช่วงเวลาออกตรวจของแพทย์ ER วันนั้นถูกใช้หมด (ช่วงค่ำ) → แพทย์ขึ้น "(Full)" กดยืนยันแล้วระบบไม่ส่งคำสั่ง ไม่มีข้อความบอก
      // ไม่แก้ตารางแพทย์ / ไม่เลี่ยงไปคลินิกอื่น — หยุดพร้อมบอกสาเหตุ (ผู้ป่วยถูกลงทะเบียนแล้ว ไม่มี Visit) · เปิดได้อีกเมื่อขึ้นวันใหม่
      const dialog = openVisitDialog(page);
      const full = await dialog.getByText(/\(Full\)|ไม่พบเวลาที่สามารถลงได้/).first().isVisible().catch(() => false);
      if (!full) throw error;
      const row = (await dialog.getByRole('row').filter({ hasText: 'Walk-in' }).first().innerText()).replace(/\s+/g, ' ');
      throw new Error(`เปิด Visit ER ให้${label} (${patient.firstName} ${patient.familyName}) ไม่ได้ — ช่วงเวลาออกตรวจของแพทย์วันนี้เต็ม: "${row}" · ผู้ป่วยถูกลงทะเบียนแล้วแต่ไม่มี Visit · รันใหม่เมื่อขึ้นวันใหม่`);
    });
    const state = `SBH-2471 ${label} เกิด ${toThaiDate(birth)} · เปิด Visit ER สิทธิ UC + Triage ESI 3 (เทสการ์ด ปิด Visit ท้ายเทส)`;
    if (SYSTEM === 'sbh-prod') recordMockPatient(`SBH-2471 ${key}`, patient, visit, state);
    else console.log(`    ${label}: ${patient.firstName} ${patient.familyName} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
    test.info().annotations.push({ type: label, description: `${patient.firstName} ${patient.familyName} เกิด ${toThaiDate(birth)} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });

    await expectTriageFormOpen(page, visit);
    await dismissToast(page, 'สร้าง Visit สำเร็จ');
    // SBH Prod: ข้อมูล Encounter โหลดไม่สำเร็จเป็นพักๆ ปุ่ม GCS จะกดไม่ได้ค้างอยู่ → เปิดหน้า Visit ใหม่ (แบบเดียวกับสคริปต์ Mock)
    const gcs = triageForm(page).getByRole('button', { name: 'เลือกคะแนน' }).first();
    let rounds = 0;
    await expect(async () => {
      if (rounds++) {
        await gotoVisit(page, visit);
        await expectTriageFormOpen(page, visit);
      }
      if (await gcs.count()) await expect(gcs).toBeEnabled({ timeout: 10_000 });
    }, 'ฟอร์มคัดกรองต้องพร้อมให้กรอก').toPass({ timeout: 150_000 });
    await fillTriage(page, visit, { level: 3, vitals: VITALS_NORMAL });
    await saveTriageForm(page, visit);
    // บันทึกแล้วหน้าเปลี่ยนเป็น Overview (Clinical Summary + แท็บ Triage ที่มีปุ่มพิมพ์ป้าย)
    await expect(page.getByRole('main').getByText('Clinical Summary', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(printBadgeButton(page)).toBeVisible();
    return { key, label, birth, patient, visit };
  }

  /** อ่านข้อมูลของผู้ป่วยจากระบบ: แถบหัวของหน้าผู้ป่วย + API ผู้ป่วย (วันเกิด / อายุ) + API บอร์ด ER (เวลารับเข้า) */
  async function readSystemRecord(page: Page, authorization: () => string, subject: Pick<Subject, 'patient' | 'visit' | 'label'>): Promise<SystemRecord> {
    const head = header(page, subject);
    await expect(head.birth).toBeVisible();
    const birthBox = (await head.birth.innerText()).replace(/\s+/g, ' ').trim();
    const name = (await head.name.innerText()).replace(/\s+/g, ' ').trim();
    const arrivalText = (await head.arrival.count()) ? (await head.arrival.innerText()).replace(/\s+/g, ' ').trim() : undefined;

    let person: { birthDate?: string; age?: string } | undefined;
    let encounter: { arrivedAt?: string } | undefined;
    // SBH Prod ตอบ 403 / 5xx เป็นพักๆ → ลองใหม่
    await expect(async () => {
      const headers = { authorization: authorization() };
      const people = await page.request.get(`/new-demographic-api/patients?filter[hn][equals]=${subject.visit.hn}`, { headers });
      await expectOk(people, `อ่านข้อมูลผู้ป่วย HN ${subject.visit.hn}`);
      person = ((await people.json()) as { data: { hn: string; birthDate?: string; age?: string }[] }).data.find((p) => p.hn === subject.visit.hn);
      const board = await page.request.get(`/cortex-api/er/dashboard/encounters?date=${runDate}`, { headers });
      await expectOk(board, 'อ่านข้อมูลบอร์ด ER');
      encounter = ((await board.json()) as { en: string; arrivedAt?: string }[]).find((e) => e.en === subject.visit.en);
      expect(person?.birthDate, 'API ผู้ป่วยต้องมีวันเกิด').toBeTruthy();
      expect(encounter?.arrivedAt, `API บอร์ดของวันที่ ${runDate} ต้องมี Encounter ${subject.visit.en}`).toBeTruthy();
    }).toPass({ timeout: 90_000 });

    const record: SystemRecord = {
      name,
      birthText: birthBox.replace('วันเกิด', '').replace(/\(.*\)/, '').trim(),
      headerAge: /\(([^)]*)\)/.exec(birthBox)?.[1].trim() ?? '',
      birthDate: person!.birthDate!,
      apiAge: person!.age ?? '',
      arrivedAt: encounter!.arrivedAt!,
      arrivalText,
    };
    await test.info().attach(`ข้อมูลของ${subject.label}จากระบบ`, { body: JSON.stringify({ ...subject.visit, ...record }, null, 2), contentType: 'application/json' });
    return record;
  }

  /** กดปุ่ม พิมพ์ป้ายปลายเตียง → เก็บ PDF → แสดงป้ายซ้อนครึ่งซ้ายของจอ */
  async function printAndShow(page: Page, subject: Subject): Promise<ShownBadge> {
    const button = printBadgeButton(page);
    await markEvidence(clicked(button));
    await holdForClip(page);
    await snapEvidence(page, `ก่อนกด — ปุ่ม พิมพ์ป้ายปลายเตียง ${subject.key}`);
    const pdf = await printBedsideBadge(page, subject.visit);
    // เก็บ PDF ทั้งในรายงาน และเป็นไฟล์ในโฟลเดอร์ผลของเทส (ไว้แนบที่อื่น)
    await test.info().attach(`ป้ายปลายเตียง ${subject.label} ${subject.visit.en}.pdf`, { body: pdf, contentType: 'application/pdf' });
    fs.writeFileSync(test.info().outputPath(`badge-${subject.key}-${subject.visit.en}.pdf`), pdf);

    // เครื่องทดสอบไม่มี print agent (localhost:8081) → แจ้งเตือนพิมพ์ไม่ได้ ไม่ถือว่า fail (R18)
    const toast = page.getByText(NO_PRINT_AGENT_TEXT, { exact: true });
    if (await toast.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false)) {
      await markEvidence(alerted(toast));
      await snapEvidence(page, `หลังกด — แจ้งเตือนพิมพ์ไม่ได้ (ไม่มี print agent) ${subject.key}`);
      await dismissToast(page, NO_PRINT_AGENT_TEXT);
    }
    const { overlay, badge } = await showBadge(page, pdf, `ป้ายปลายเตียงของ${subject.label} — HN ${subject.visit.hn} · ${subject.visit.en}`);
    return { overlay, badge, fields: readBadge(badge) };
  }

  const arrivalDay = (subject: Subject) => bangkokDate(subject.record.arrivedAt);

  /** วันที่เปิด Visit ต้องเป็นวันเดียวกับวันที่ใช้ตั้งวันเกิด และระบบเก็บวันเกิดตามที่ลงทะเบียน */
  function expectSubjectDates(subject: Subject) {
    expect(arrivalDay(subject), `${subject.label}: วันที่เปิด Visit ต้องเป็นวันที่รัน`).toBe(runDate);
    expect(subject.record.birthDate, `${subject.label}: วันเกิดในระบบต้องตรงกับที่ลงทะเบียน`).toBe(subject.birth);
  }

  // ---------------------------------------------------------------------------------------------
  test(
    'ผู้ป่วย A (ผู้ใหญ่) + B (เด็ก): ป้ายปลายเตียงแสดงอายุและ HN ร่วมกับข้อมูลเดิม · พอดีครึ่ง A4 · อายุตรงกับที่คำนวณจากวันเกิดถึงวันเปิด Visit (Super_User)',
    { tag: ['@SBH-2471', '@SBH-2497', '@SBH-2498', '@SBH-2499'], annotation: [linear('SBH-2471'), linear('SBH-2493')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const main = page.getByRole('main');
      let a!: Subject;
      let b!: Subject;
      let shownA!: ShownBadge;
      let shownB!: ShownBadge;

      // ---------------- TC-001 ----------------
      await checkStep(page, 'TC-001 (SBH-2497) ขั้น 1 Login แล้วเข้า ห้องฉุกเฉิน', async () => {
        await gotoErDashboard(page);
        await markEvidence(expected(main.getByText('แดชบอร์ด / คิว')));
      });

      await checkStep(page, 'TC-001 (SBH-2497) ขั้น 2 เปิด Visit ER ให้ผู้ป่วย A (ผู้ใหญ่) แล้วประเมิน Triage จนบันทึกเสร็จ', async () => {
        const prepared = await openTriagedVisit(page, 'A', 'ผู้ป่วย A (ผู้ใหญ่)', birthForAge(runDate, { years: 36, months: 8, days: 22 }));
        a = { ...prepared, record: await readSystemRecord(page, authorization, prepared) };
        expectSubjectDates(a);
        await markEvidence(expected(header(page, a).name), expected(main.getByText('ประวัติการคัดกรอง', { exact: true })), expected(printBadgeButton(page)));
        await holdForClip(page);
      });

      await checkStep(page, 'TC-001 (SBH-2497) ขั้น 3 จด ชื่อผู้ป่วย HN EN วันเกิด และวันเวลารับเข้าของผู้ป่วย A จากระบบ', async () => {
        const head = header(page, a);
        await expect(head.hn).toBeVisible();
        await expect(head.en).toBeVisible();
        test.info().annotations.push({
          type: 'ที่จดจากระบบ (ผู้ป่วย A)',
          description: `${a.record.name} · HN ${a.visit.hn} · ${a.visit.en} · วันเกิด ${a.record.birthText} (${a.record.headerAge}) · รับเข้า ${badgeDateTime(a.record.arrivedAt)}`,
        });
        // ป้ายของกรอบ HN / ชื่อ / วันเกิด ที่อยู่ชิดกันจะทับข้อความกันเอง → ตีกรอบรวมกล่องเดียว
        const marks = [head.info, head.en];
        if (a.record.arrivalText) marks.push(head.arrival);
        await markEvidence(...marks.map(expected));
        await holdForClip(page, 2_000);
      });

      await checkStep(page, 'TC-001 (SBH-2497) ขั้น 4 หน้า Overview ของผู้ป่วย A กด พิมพ์ป้ายปลายเตียง — ได้ป้ายปลายเตียง', async () => {
        shownA = await printAndShow(page, a);
        expect(shownA.fields.title, 'ป้ายต้องมีหัว "ป้ายชื่อผู้ป่วยห้องฉุกเฉิน"').toBeTruthy();
        await markEvidence(expected(badgePage(shownA.overlay)));
        await holdForClip(page, 2_000);
      });

      await checkStep(page, 'TC-001 (SBH-2497) ขั้น 5 ป้ายมีบรรทัดอายุ และมีแถว HN', async () => {
        const { fields, overlay } = shownA;
        // ตีกรอบเท่าที่มีก่อน ให้ภาพ Error เห็นป้ายจริง
        await markEvidence(...[fields.age, fields.hnLabel, fields.hn].filter((line): line is BadgeLine => !!line).map((line) => expected(badgeLine(overlay, line))), badgePage(overlay));
        await holdForClip(page, 2_000);
        expect(fields.age?.text ?? '', `ป้ายต้องมีบรรทัดอายุ (ข้อความบนป้าย: ${shownA.badge.lines.map((line) => line.text).join(' | ')})`).toMatch(/^อายุ\s*\d+\s*ปี/);
        expect(fields.hnLabel && fields.hn, 'ป้ายต้องมีแถว HN (ป้ายชื่อช่อง HN + ค่า)').toBeTruthy();
        // หมายเหตุของ TC (Final mockup): อายุอยู่ใต้ชื่อ · HN อยู่ระหว่างอายุกับ EN — ต่างจาก mockup ลงเป็นข้อสังเกต
        const order = [fields.name, fields.age, fields.hn, fields.en].map((line) => line?.baseline ?? NaN);
        if (!order.every((value, i) => i === 0 || value > order[i - 1])) note(`ลำดับบรรทัดบนป้ายต่างจาก Final mockup (ชื่อ → อายุ → HN → EN): เส้นฐาน ${order.map((value) => value.toFixed(0)).join(' / ')} pt`);
      });

      await checkStep(page, 'TC-001 (SBH-2497) ขั้น 6 เทียบ HN บนป้ายกับ HN ที่จดไว้ — ตรงกัน เป็นตัวเลขล้วนไม่มีตัวคั่น', async () => {
        const { fields, overlay } = shownA;
        const onBadge = fields.hn?.text ?? '(ไม่มี)';
        const rows: CompareRow[] = [
          { label: 'HN', values: [onBadge, a.visit.hn], same: onBadge === a.visit.hn },
          { label: 'รูปแบบ HN', values: [onBadge, 'ตัวเลขล้วน ไม่มีตัวคั่น'], same: /^\d+$/.test(onBadge) },
        ];
        await showCompareTable(page, `เทียบ HN บนป้าย — ผู้ป่วย A HN ${a.visit.hn}`, ['บนป้าย (PDF)', 'ในระบบ'], rows);
        await markEvidence(expected(badgeLine(overlay, fields.hn!)), header(page, a).hn);
        await holdForClip(page, 2_500);
        expect(onBadge, 'HN บนป้ายต้องตรงกับ HN ของผู้ป่วยในระบบ').toBe(a.visit.hn);
        expect(onBadge, 'HN บนป้ายต้องเป็นตัวเลขล้วนไม่มีตัวคั่น').toMatch(/^\d+$/);
      });

      await checkStep(page, 'TC-001 (SBH-2497) ขั้น 7 ชื่อผู้ป่วย EN และวันเวลารับเข้าบนป้าย ตรงกับที่จดไว้', async () => {
        const { fields, overlay } = shownA;
        const arrivalOnBadge = (fields.arrival?.text ?? '(ไม่มี)').replace(',', '');
        const arrivalInSystem = badgeDateTime(a.record.arrivedAt);
        const rows: CompareRow[] = [
          { label: 'ชื่อผู้ป่วย', values: [fields.name?.text ?? '(ไม่มี)', a.record.name], same: fields.name?.text === a.record.name },
          { label: 'EN', values: [fields.en?.text ?? '(ไม่มี)', a.visit.en], same: fields.en?.text === a.visit.en },
          { label: 'วันเวลารับเข้า', values: [fields.arrival?.text ?? '(ไม่มี)', `${arrivalInSystem}${a.record.arrivalText ? ` (แถบ Visit: ${a.record.arrivalText})` : ''}`], same: arrivalOnBadge === arrivalInSystem },
        ];
        await showCompareTable(page, `เทียบข้อมูลเดิมบนป้าย — ผู้ป่วย A HN ${a.visit.hn}`, ['บนป้าย (PDF)', 'ในระบบ'], rows);
        await markEvidence(...[fields.name, fields.enLabel, fields.en, fields.arrivalLabel, fields.arrival].filter((line): line is BadgeLine => !!line).map((line) => expected(badgeLine(overlay, line))));
        await holdForClip(page, 2_500);
        expect(fields.name?.text, 'ชื่อผู้ป่วยบนป้ายต้องตรงกับในระบบ').toBe(a.record.name);
        expect(fields.en?.text, 'EN บนป้ายต้องตรงกับในระบบ').toBe(a.visit.en);
        expect(arrivalOnBadge, 'วันเวลารับเข้าบนป้ายต้องตรงกับเวลารับเข้าของ Encounter').toBe(arrivalInSystem);
        if (fields.arrival?.text.includes(',')) note('วันเวลารับเข้าบนป้ายมี "," คั่นวันที่กับเวลา (Final mockup ไม่มี) — เหมือนป้ายเดิมก่อนการ์ดนี้');
      });
      await hideCompareTable(page);

      // ---------------- TC-002 ----------------
      await checkStep(page, 'TC-002 (SBH-2498) ขั้น 2–3 เปิดป้ายของผู้ป่วย A ดูขนาดกระดาษ — ป้ายยังเป็นครึ่งหนึ่งของกระดาษ A4', async () => {
        const { badge, overlay } = shownA;
        test.info().annotations.push({ type: 'ขนาดหน้าของป้าย', description: `${badge.widthMm.toFixed(1)} × ${badge.heightMm.toFixed(1)} มม. (${badge.widthPt} × ${badge.heightPt} pt) — A4 = 210 × 297 มม. ครึ่งหนึ่ง = 210 × 148.5 มม.` });
        await markEvidence(expected(overlay.locator('[data-badge-size]')), expected(badgePage(overlay)));
        await holdForClip(page, 2_000);
        expect(Math.abs(badge.widthMm - 210), `ด้านยาวของป้ายต้องเท่าด้านกว้างของ A4 (210 มม.) — ได้ ${badge.widthMm.toFixed(1)}`).toBeLessThanOrEqual(1);
        expect(Math.abs(badge.heightMm - 148.5), `ด้านสั้นของป้ายต้องเท่าครึ่งหนึ่งของด้านยาว A4 (148.5 มม.) — ได้ ${badge.heightMm.toFixed(1)}`).toBeLessThanOrEqual(1);
      });

      await checkStep(page, 'TC-002 (SBH-2498) ขั้น 4 บรรทัดอายุและแถว HN ไม่ทับ ไม่ล้น และไม่ถูกตัดขอบ', async () => {
        const { badge, fields, overlay } = shownA;
        const named: [string, BadgeLine | undefined][] = [
          ['หัวป้าย', fields.title],
          ['ชื่อผู้ป่วย', fields.name],
          ['อายุ', fields.age],
          ['HN (ชื่อช่อง)', fields.hnLabel],
          ['HN', fields.hn],
          ['EN (ชื่อช่อง)', fields.enLabel],
          ['EN', fields.en],
          ['วันเวลารับเข้า (ชื่อช่อง)', fields.arrivalLabel],
          ['วันเวลารับเข้า', fields.arrival],
        ];
        const lines = named.filter((item): item is [string, BadgeLine] => !!item[1]);
        const problems = (line: BadgeLine) => [
          ...(insidePage(badge, line) ? [] : ['ล้นขอบกระดาษ']),
          ...lines.filter(([, other]) => other !== line && overlaps(line, other)).map(([name]) => `ทับ ${name}`),
        ];
        const rows: CompareRow[] = lines.map(([label, line]) => ({
          label,
          values: [line.text, `${line.size.toFixed(0)} pt`, `ซ้าย ${line.x.toFixed(0)} – ${(line.x + line.width).toFixed(0)} · บน ${line.y.toFixed(0)} – ${(line.y + line.height).toFixed(0)}`, problems(line).join(' · ') || 'อยู่ในหน้า ไม่ทับบรรทัดอื่น'],
          same: !problems(line).length,
        }));
        await showCompareTable(page, `ตำแหน่งข้อความบนป้าย (หน้า ${badge.widthPt} × ${badge.heightPt} pt) — ผู้ป่วย A`, ['ข้อความ', 'ขนาดตัวอักษร', 'ตำแหน่ง (pt)', 'ผลตรวจ'], rows);
        await markEvidence(...[fields.age, fields.hnLabel, fields.hn].filter((line): line is BadgeLine => !!line).map((line) => expected(badgeLine(overlay, line))));
        await holdForClip(page, 3_000);
        for (const [label, line] of lines) expect(problems(line), `${label} "${line.text}" ต้องอยู่ในพื้นที่ป้ายและไม่ทับบรรทัดอื่น`).toEqual([]);
        // หมายเหตุของ TC: Final mockup กำหนดอายุและ HN 32 pt (ชื่อและ EN 48 pt) — ใช้เทียบสัดส่วน ต่างจาก mockup ลงเป็นข้อสังเกต
        const sizes = `อายุ ${fields.age?.size.toFixed(0)} pt · HN ${fields.hn?.size.toFixed(0)} pt · ชื่อ ${fields.name?.size.toFixed(0)} pt · EN ${fields.en?.size.toFixed(0)} pt · วันเวลารับเข้า ${fields.arrival?.size.toFixed(0)} pt`;
        test.info().annotations.push({ type: 'ขนาดตัวอักษรบนป้าย', description: sizes });
        if (fields.age?.size.toFixed(0) !== '32' || fields.hn?.size.toFixed(0) !== '32') note(`ขนาดตัวอักษรของอายุ / HN ต่างจาก Final mockup (32 pt): ${sizes}`);
        expect(fields.age!.size, 'อายุต้องตัวใหญ่กว่าบรรทัดวันเวลารับเข้า (อ่านได้จากระยะไกล)').toBeGreaterThan(fields.arrival!.size);
        expect(fields.hn!.size, 'HN ต้องตัวใหญ่กว่าบรรทัดวันเวลารับเข้า (อ่านได้จากระยะไกล)').toBeGreaterThan(fields.arrival!.size);
      });
      await test.step('TC-002 (SBH-2498) ขั้น 5–6 พิมพ์ออกกระดาษจริงและอ่านจากระยะห่าง — automate ทำไม่ได้ ไม่ได้ตรวจ', async () => {
        test.info().annotations.push({ type: 'ไม่ได้ตรวจ', description: 'TC-002 ขั้น 5–6: พิมพ์ป้ายออกกระดาษจริง เทียบกับกระดาษ A4 และอ่านอายุ / HN จากระยะห่าง (เครื่องทดสอบไม่มีเครื่องพิมพ์)' });
      });
      await hideCompareTable(page);

      // ---------------- TC-003 ----------------
      const checkAge = async (subject: Subject, shown: ShownBadge, title: string) =>
        checkStep(page, title, async () => {
          const expectedAge = ageOn(subject.birth, arrivalDay(subject));
          const rows: CompareRow[] = [
            { label: 'วันเกิด', values: ['-', `${toThaiDate(subject.record.birthDate)} (แถบหัว: ${subject.record.birthText})`], same: subject.record.birthDate === subject.birth },
            { label: 'วันที่เปิด Visit', values: [(shown.fields.arrival?.text ?? '').split(/[ ,]/)[0], toThaiDate(arrivalDay(subject))], same: (shown.fields.arrival?.text ?? '').startsWith(toThaiDate(arrivalDay(subject))) },
            { label: 'อายุ', values: [ageText(shown.fields.age), `${formatThaiAge(expectedAge)} (คำนวณเองจากวันเกิดถึงวันที่เปิด Visit)`], same: ageText(shown.fields.age) === formatThaiAge(expectedAge) },
          ];
          await showCompareTable(page, `เทียบอายุบนป้าย — ${subject.label} HN ${subject.visit.hn}`, ['บนป้าย (PDF)', 'ที่จด / คำนวณเอง'], rows);
          await markEvidence(expected(badgeLine(shown.overlay, shown.fields.age!)), header(page, subject).birth); // กรอบวันเกิดบนแถบหัวไม่ใส่ป้าย (ป้ายจะทับชื่อผู้ป่วยบรรทัดบน)
          await holdForClip(page, 3_000);
          expect(parseThaiAge(shown.fields.age!.text), `อายุบนป้ายของ${subject.label} ("${shown.fields.age!.text}") ต้องตรงกับอายุที่คำนวณจากวันเกิด ${subject.birth} ถึงวันที่เปิด Visit ${arrivalDay(subject)}`).toEqual(expectedAge);
        });

      await checkAge(a, shownA, 'TC-003 (SBH-2499) ขั้น 2–5 ผู้ป่วยผู้ใหญ่: อายุบนป้ายของผู้ป่วย A ตรงกับอายุที่คำนวณจากวันเกิดถึงวันที่เปิด Visit');
      await hideCompareTable(page);
      await hideBadge(page);

      await checkStep(page, 'TC-003 (SBH-2499) ขั้น 6 เปิด Visit ER ให้ผู้ป่วย B (เด็ก) แล้วประเมิน Triage จนบันทึกเสร็จ', async () => {
        await openErDashboardFromMenu(page);
        const prepared = await openTriagedVisit(page, 'B', 'ผู้ป่วย B (เด็ก)', birthForAge(runDate, { years: 7, months: 6, days: 18 }));
        b = { ...prepared, record: await readSystemRecord(page, authorization, prepared) };
        expectSubjectDates(b);
        const head = header(page, b);
        await markEvidence(expected(head.info), expected(printBadgeButton(page)));
        await holdForClip(page, 2_000);
      });

      await checkStep(page, 'TC-003 (SBH-2499) ขั้น 9 หน้า Overview ของผู้ป่วย B กด พิมพ์ป้ายปลายเตียง แล้วอ่านอายุบนป้าย', async () => {
        shownB = await printAndShow(page, b);
        expect(shownB.fields.age?.text ?? '', 'ป้ายของผู้ป่วย B ต้องมีบรรทัดอายุ').toMatch(/^อายุ\s*\d+\s*ปี/);
        expect(shownB.fields.hn?.text, 'HN บนป้ายของผู้ป่วย B ต้องตรงกับในระบบ').toBe(b.visit.hn);
        await markEvidence(expected(badgeLine(shownB.overlay, shownB.fields.age!)), expected(badgeLine(shownB.overlay, shownB.fields.hn!)));
        await holdForClip(page, 2_000);
      });
      await checkAge(b, shownB, 'TC-003 (SBH-2499) ขั้น 7–9 ผู้ป่วยเด็ก: อายุบนป้ายของผู้ป่วย B ตรงกับอายุที่คำนวณจากวันเกิดถึงวันที่เปิด Visit');

      await checkStep(page, 'TC-003 (SBH-2499) ขั้น 10 รูปแบบอายุบนป้ายของทั้งสองราย เหมือนอายุที่ระบบแสดงให้ผู้ป่วยรายนั้น', async () => {
        const pairs: [Subject, ShownBadge][] = [
          [a, shownA],
          [b, shownB],
        ];
        const rows: CompareRow[] = pairs.map(([subject, shown]) => {
          const values = [ageText(shown.fields.age), subject.record.headerAge, subject.record.apiAge];
          return { label: subject.label, values, same: values.every((value) => value === values[0]) };
        });
        await showCompareTable(page, 'เทียบรูปแบบอายุบนป้ายกับอายุที่ระบบแสดง', ['บนป้าย (PDF)', 'แถบหัวของหน้าผู้ป่วย', 'API ผู้ป่วย'], rows);
        await markEvidence(expected(badgeLine(shownB.overlay, shownB.fields.age!)), header(page, b).birth);
        await holdForClip(page, 3_000);
        for (const row of rows) expect(row.values[0], `${row.label}: อายุบนป้ายต้องใช้รูปแบบเดียวกับที่ระบบแสดง (แถบหัว "${row.values[1]}")`).toBe(row.values[1]);
      });
    },
  );

  // ---------------------------------------------------------------------------------------------
  test(
    'ผู้ป่วย C (วันเกิดตรงกับวันเปิด Visit) + D (วันเกิดเป็นวันถัดไป): อายุบนป้ายปลายเตียงนับครบปี / ยังไม่ครบปี (Super_User)',
    { tag: ['@SBH-2471', '@SBH-2500'], annotation: [linear('SBH-2471'), linear('SBH-2493')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const main = page.getByRole('main');
      const YEARS = 10;

      await checkStep(page, 'TC-004 (SBH-2500) ขั้น 1 Login แล้วเข้า ห้องฉุกเฉิน', async () => {
        await gotoErDashboard(page);
        await markEvidence(expected(main.getByText('แดชบอร์ด / คิว')));
      });

      /** เปิด Visit + Triage ให้ผู้ป่วยที่วันเกิดคร่อมวันที่รัน → พิมพ์ป้าย → เทียบจำนวนปี (และเดือน ถ้าระบุ) */
      const boundaryCase = async (key: 'C' | 'D', label: string, birth: string, steps: { open: string; print: string }, want: { years: number; months?: number; text: string }) => {
        let subject!: Subject;
        await checkStep(page, steps.open, async () => {
          if (key !== 'C') await openErDashboardFromMenu(page);
          const prepared = await openTriagedVisit(page, key, label, birth);
          subject = { ...prepared, record: await readSystemRecord(page, authorization, prepared) };
          expectSubjectDates(subject);
          const head = header(page, subject);
          await markEvidence(expected(head.info), expected(printBadgeButton(page)));
          await holdForClip(page, 2_000);
        });

        await checkStep(page, steps.print, async () => {
          const shown = await printAndShow(page, subject);
          const onBadge = parseThaiAge(shown.fields.age?.text ?? '');
          const same = onBadge?.years === want.years && (want.months === undefined || onBadge?.months === want.months);
          const rows: CompareRow[] = [
            { label: 'วันเกิด', values: ['-', `${toThaiDate(subject.record.birthDate)} (แถบหัว: ${subject.record.birthText})`, '-'], same: subject.record.birthDate === birth },
            { label: 'วันที่เปิด Visit', values: [(shown.fields.arrival?.text ?? '').split(/[ ,]/)[0], toThaiDate(arrivalDay(subject)), '-'], same: (shown.fields.arrival?.text ?? '').startsWith(toThaiDate(arrivalDay(subject))) },
            { label: 'อายุ', values: [ageText(shown.fields.age), want.text, `${subject.record.headerAge} (แถบหัว)`], same },
          ];
          await showCompareTable(page, `เทียบอายุบนป้าย — ${label} HN ${subject.visit.hn}`, ['บนป้าย (PDF)', 'ที่คาดตาม TC', 'ที่ระบบแสดง'], rows);
          await markEvidence(...[shown.fields.age, shown.fields.hn].filter((line): line is BadgeLine => !!line).map((line) => expected(badgeLine(shown.overlay, line))), header(page, subject).birth);
          await holdForClip(page, 3_500);
          test.info().annotations.push({ type: `อายุบนป้ายของ${label}`, description: `"${shown.fields.age?.text ?? '(ไม่มีบรรทัดอายุ)'}" · ระบบแสดง "${subject.record.headerAge}" · วันเกิด ${toThaiDate(birth)} · เปิด Visit ${badgeDateTime(subject.record.arrivedAt)}` });
          expect(shown.fields.hn?.text, `HN บนป้ายของ${label} ต้องตรงกับในระบบ`).toBe(subject.visit.hn);
          expect(onBadge?.years, `${label}: อายุบนป้าย ("${shown.fields.age?.text}") ต้องเป็น ${want.text}`).toBe(want.years);
          if (want.months !== undefined) expect(onBadge?.months, `${label}: อายุบนป้าย ("${shown.fields.age?.text}") ต้องเป็น ${want.text}`).toBe(want.months);
          // การ์ดไม่ได้บอกว่าเดือน / วันที่เป็น 0 แสดงอย่างไร (หมายเหตุของ TC) — รูปแบบต่างจากที่ระบบแสดง ลงเป็นข้อสังเกต
          if (ageText(shown.fields.age) !== subject.record.headerAge) note(`${label}: อายุบนป้าย "${ageText(shown.fields.age)}" เขียนต่างจากที่ระบบแสดงบนแถบหัว "${subject.record.headerAge}" (จำนวนปีตรงกัน)`);
        });
        await hideCompareTable(page);
        await hideBadge(page);
      };

      await boundaryCase(
        'C',
        'ผู้ป่วย C (วันเกิดตรงกับวันเปิด Visit)',
        shiftDate(runDate, { years: -YEARS }),
        {
          open: 'TC-004 (SBH-2500) ขั้น 2 · 4 เตรียมผู้ป่วย C ให้วันเกิด (วัน/เดือน) ตรงกับวันที่รัน แล้วเปิด Visit ER + Triage จนบันทึกเสร็จ',
          print: 'TC-004 (SBH-2500) ขั้น 5 หน้า Overview ของผู้ป่วย C กด พิมพ์ป้ายปลายเตียง — อายุบนป้ายนับครบปีแล้ว',
        },
        { years: YEARS, text: `ครบ ${YEARS} ปี (ไม่ใช่ ${YEARS - 1} ปี 11 เดือน)` },
      );
      await boundaryCase(
        'D',
        'ผู้ป่วย D (วันเกิดเป็นวันถัดจากวันเปิด Visit)',
        shiftDate(shiftDate(runDate, { days: 1 }), { years: -YEARS }),
        {
          open: 'TC-004 (SBH-2500) ขั้น 3 · 6 เตรียมผู้ป่วย D ให้วันเกิดเป็นวันถัดจากวันที่รัน แล้วเปิด Visit ER + Triage จนบันทึกเสร็จ',
          print: 'TC-004 (SBH-2500) ขั้น 7 หน้า Overview ของผู้ป่วย D กด พิมพ์ป้ายปลายเตียง — อายุบนป้ายยังไม่ครบปี',
        },
        { years: YEARS - 1, months: 11, text: `${YEARS - 1} ปี 11 เดือน กับจำนวนวันที่เหลือ (ไม่ใช่ ${YEARS} ปี)` },
      );
    },
  );
});
