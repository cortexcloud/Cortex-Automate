import type { Browser, Page } from '@playwright/test';
import {
  confirmOpenErVisit,
  expectOk,
  expectVisitHeader,
  fetchBoard,
  fetchZones,
  gotoErDashboard,
  openErDashboardFromMenu,
  openTriagePage,
  openVisitDialog,
  selectExistingPatient,
  showDashboardCard,
  type ErVisit,
} from '../helpers/functions/er';
import {
  DISPOSITION_HISTORY_ACTIONS,
  chooseDispositionDiagnosis,
  closeDispositionHistory,
  describeDispositionHistoryRow,
  dispositionHistoryTime,
  dispositionTextBoxes,
  fetchDispositionHistory,
  graphqlMutation,
  openDisposition,
  openDispositionHistory,
  readDispositionHistory,
  reopenDisposition,
  saveDispositionDraft,
} from '../helpers/functions/er-disposition';
import { physicianNoteDiagnosis, physicianNoteIllness, waitPhysicianNoteForm } from '../helpers/functions/er-physician-note';
import { trackAuthorization } from '../helpers/functions/er-report';
import { erTriageLevel, erTriagePanel } from '../helpers/functions/er-triage';
import { hidePdf, pdfPages, showPdf } from '../helpers/functions/print-capture';
import { receptionFrame } from '../helpers/functions/reception';
import { ADDRESS_BLOCKS, SARABURI_PAKPHRIAO, fillAddress, textField } from '../helpers/functions/reception-address';
import type { NewPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { COVERAGE_UC, SYSTEM, nextUatPatient, recordDrugAllergy, recordMockPatient, submitOrders } from './uat-er';
import {
  DISCHARGE_AGAINST_ADVICE,
  addMedicineToCart,
  careMenu,
  createMedicalCertificate,
  gotoVisit,
  guard,
  openPatientAs,
  options,
  pick,
  recordMenu,
  replyConsult,
  requestConsult,
  savePatient,
  signDischarge,
  type Played,
} from './uat-play';
import {
  GCS_FULL,
  TOR_CONTACT,
  TOR_ORDER_CODES,
  TOR_VITALS_NORMAL,
  TorPlay,
  fillTriageFull,
  noteFilled,
  registerFull,
  savePhysicianNoteFull,
  saveTriageFull,
  snap,
  type TriageFull,
} from './uat-tor';

// ─────────────────────────────────────────────────────────────────────────────────────────────
// เล่น Scenario UAT ER "ชีตส่งมอบ" — SharePoint "New file Test case OPD #2.xlsx" ชีต **Scenario- ER ส่งมอบ** (สกิล cortex-er-tor-uat)
//   • UAT-ER-01 ผู้ป่วยมี HN เดิม ตรวจแล้วจำหน่าย แยกตามประเภท Disposition (แถว 3–67)
//       - รายที่ 1 (@UAT-ER-01-1): กรณี 1.1 กลับบ้านปกติ (With Approval) + ใบรับรองแพทย์ + กรณี 1.3 Reopen → แก้ → ลงนามใหม่ → ดูผู้ทำ / เวลา
//         ลงทะเบียนผู้ป่วยกรอกครบก่อนแล้วกดยกเลิกที่หน้าต่างเปิด Visit (R24) แล้วเล่นแบบ "ผู้ป่วยมี HN" ตามชีต
//       - รายที่ 2 (@UAT-ER-01-2): กรณี 1.2 ปฏิเสธการรักษา (Against Advice) — ขั้นร่วม (ลงทะเบียน / คัดกรอง / Physician Note) ทำครบแบบไม่มีเลขแถว
//   • UAT-ER-02 ผู้ป่วยใหม่ไม่มี HN มา ER ครั้งแรก (แถว 68–89) (@UAT-ER-02)
// ผู้ใช้สั่ง 8 พ.ย. 2026: รันบน SBH Prod · "กรอกข้อมูลของคนไข้ทั้งหมดเท่าที่จะเป็นไปได้" → ลงทะเบียน (เบอร์ / รูป / ที่อยู่) · คัดกรองทุก Section ·
//   Physician Note · Disposition (คำแนะนำ / นัดติดตาม / ICD) กรอกครบ — ช่องที่กรอกไม่ได้จดเป็นข้อสังเกต ไม่ทำให้ขั้นพัง
// ชื่อขั้น = "[แถวชีต] ขั้นตอน — ผลที่ควรเห็น" · ขั้นพังแล้วจด + เล่นต่อ (TorPlay) · ภาพหน้าจอทุกขั้น + คลิปต่อเทส (fixtures)
// ผู้ป่วย: "UAT ER01-<ลำดับ>" (ข้อ 01 ทั้ง 2 ราย) · "UAT ER02-<ลำดับ>" — ลำดับ = เลขท้ายมากสุดในระบบ + 1 (UAT_SEQ=<เลข> กำหนดเอง) · จดลง mock-data/created-patients.md
//   ผู้ป่วยที่ข้ออื่นใช้ต่อ: .cache/uat-play-<ระบบ>/patients.json key tor01-1 / tor01-2 / tor02
//
// รัน (SBH Prod — เปิดจอ ทีละเทส ตาม R31):
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-01-02 --headed --grep "@UAT-ER-01-1"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-01-02 --headed --grep "@UAT-ER-01-2"
//   npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-tor-01-02 --headed --grep "@UAT-ER-02"
//   (--grep "@UAT-ER-01" อย่างเดียวจะได้ทั้ง 01-1 และ 01-2)
//
// ที่ไม่ได้ทำ / ข้อจำกัด:
//   - ไม่เลือก "แพทย์ร่วมทำ" ใน Disposition (ต้องเป็นแพทย์จริงอีกท่าน — ไม่ผูกชื่อแพทย์จริงกับข้อมูลทดสอบ) · จดเป็นข้อสังเกต
//   - ไม่แก้ทางอ้อมเมื่อห้องตรวจ ER ไม่มีเวลาให้ลง ("ไม่พบเวลาที่สามารถลงได้") — หยุดและรายงาน
//   - แพ้ยาในขั้นคัดกรอง (ชีตแถว 22) ไม่ได้กรอกในฟอร์มคัดกรอง — บันทึกที่เมนู "บันทึกการแพ้" ตามแถว 36–37
//   - ปัญหาที่รู้แล้ว (ชีต ER Issue ส่งมอบ): #4 โรคประจำตัวบันทึกไม่ได้ · #15 บันทึกฉบับร่าง Disposition error · #16 ตอบ Consult ไม่ได้ → จด "ตรง Issue #n" ไม่เปิดบั๊กเอง
//   - ไม่ assert ชื่อโซนชุดเก่า (โซนแดง / เหลือง ER) — ใช้โซนที่ระบบแนะนำ แล้วเทียบกับโซนบนบอร์ดจาก API
// ─────────────────────────────────────────────────────────────────────────────────────────────

const CONSULT_PROBLEM = 'ขอปรึกษาอาการปวดท้องใต้ลิ้นปี่ จากแพทย์ ER (UAT-ER-01 ชีตส่งมอบ)';
/** แพทย์ที่ถูกขอปรึกษา = แพทย์ของบัญชีหลัก (ผู้ขอ = บัญชี role Doctor) — เหมือนสเปกรุ่นเก่า */
const CONSULT_DOCTOR = SYSTEM === 'dev-x' ? { search: 'มานะ', name: /ทดสอบ มานะ/ } : { search: 'เอื้อเฟื้อ', name: /วิชัย.*เอื้อเฟื้อ/ };
const CONSULT_ANSWER = 'แนะนำให้ยาลดกรด สังเกตอาการ และนัดติดตามที่ OPD อายุรกรรม (คำตอบ Consult UAT-ER-01)';
/** ใบรับรองแพทย์: SBH Prod ใช้ได้เฉพาะแบบลาป่วย · dev-x ใช้แบบตั้งต้นของ helper */
const CERTIFICATE = SYSTEM === 'dev-x' ? undefined : /ลาป่วย/;
/** Diagnosis ต่อผู้ป่วย (ไม่ซ้ำกันต่อชุด — รหัสที่ค้นเจอบน Prod) */
const DX = { tor011: 'K30', tor012: 'R51', tor02: 'J00' } as const;

const IMG = 'img[src^="blob:"], img[src^="data:image"], img[src^="http"]';

// ---------- ตัวช่วยของไฟล์นี้ ----------

/** จด HN จาก response ลงทะเบียน (ไว้จดผู้ป่วยลง created-patients.md แม้ขั้นลงทะเบียน / เปิด Visit พังกลางทาง) */
function watchRegistration(page: Page): () => string | undefined {
  let hn: string | undefined;
  page.on('response', async (res) => {
    if (res.request().method() !== 'POST' || !new URL(res.url()).pathname.endsWith('/cortex-api/patients/er-registration') || !res.ok()) return;
    hn = ((await res.json().catch(() => ({}))) as { patient?: { data?: { hn?: string } } }).patient?.data?.hn ?? hn;
  });
  return () => hn;
}

/** ทำ `body` แบบไม่บังคับ: สำเร็จ → จดลง `filled` · ไม่สำเร็จ / ไม่มีช่อง (false) → จดลง `skipped` (แบบเดียวกับใน uat-tor.ts ที่ไม่ได้ export) */
async function attempt(filled: string[], skipped: string[], name: string, body: () => Promise<unknown>) {
  try {
    const result = await body();
    if (result === false) skipped.push(`${name} (ไม่พบช่องบนจอ)`);
    else filled.push(typeof result === 'string' ? `${name}: ${result}` : name);
  } catch (error) {
    skipped.push(`${name} (${(error as Error).message.split('\n')[0].slice(0, 160)})`);
  }
}

/** เวลาไทยสั้น HH:mm (ใส่ในข้อความทดสอบให้แยกรอบได้) */
function stamp(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 16);
}

/** ไม่ได้อยู่หน้าผู้ป่วยของ Visit นี้ → เปิดหน้าใหม่ */
async function ensureOnVisit(page: Page, visit: ErVisit) {
  const url = new URL(page.url());
  if (url.pathname !== `/cortex/next/patients/${visit.hn}` || url.searchParams.get('en') !== visit.en) await gotoVisit(page, visit);
}

/**
 * คัดกรอง 3 ขั้น: กรอกครบทุก Section + ESI + โซนที่แนะนำ → บันทึก (Overview แสดง ESI + โซน) → ผู้ป่วยขึ้นโซนบน ER Dashboard
 * คืนชื่อโซนที่เลือก (ไม่สำเร็จคืน undefined)
 */
async function triageSteps(
  play: TorPlay,
  page: Page,
  authorization: () => string,
  visit: ErVisit,
  input: TriageFull,
  rows: { fill: string; save: string; board: string },
): Promise<string | undefined> {
  const main = page.getByRole('main');
  const filled = await play.step(
    `[${rows.fill}] กรอกฟอร์มคัดกรอง ER ครบทุก Section (Fast Track · ประเภทฉุกเฉิน · ER Arrival · V/S + Pain · อาการนำ · Body metric · GCS · AVPU · Underlying Disease) + เลือก ESI ${input.level} + โซนที่ระบบแนะนำ — MEWS คำนวณเอง`,
    async () => {
      await ensureOnVisit(page, visit);
      const result = await fillTriageFull(page, input);
      noteFilled(play, 'ฟอร์มคัดกรอง', result.filled, result.skipped);
      if (result.skipped.some((s) => s.startsWith('Underlying Disease'))) play.note('Underlying Disease บันทึกไม่ได้ — ตรง Issue #4 (ชีต ER Issue ส่งมอบ)');
      const panel = erTriagePanel(page);
      const panelText = (await panel.innerText().catch(() => '')).replace(/\s+/g, ' ');
      const mews = panelText.match(/(Total )?MEWS[^0-9]{0,20}\d+/i)?.[0];
      play.note(mews ? `MEWS ที่ระบบคำนวณ: "${mews}"` : 'ไม่เห็นค่า MEWS ในฟอร์มคัดกรอง');
      const levelText = (await panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }).locator('xpath=..').innerText().catch(() => '')).replace(/\s+/g, ' ');
      const suggestion = levelText.match(/[^·]{0,40}แนะนำ[^·]{0,60}/)?.[0]?.trim();
      play.note(suggestion ? `ESI ที่ระบบแนะนำ (ข้อความรอบช่องระดับ): "${suggestion}"` : `ไม่เห็นข้อความ ESI ที่ระบบแนะนำรอบช่องระดับความเร่งด่วน (${levelText.slice(0, 120) || '-'})`);
      play.note(`โซนที่เลือก (ป้ายแนะนำของระบบ): ${result.zone}`);
      return result;
    },
  );
  if (!filled) return undefined;
  const zone = filled.zone.replace(/แนะนำ/g, '').replace(/\s+/g, ' ').trim();

  await play.step(`[${rows.save}] บันทึกคัดกรอง — หน้าเปลี่ยนเป็น Overview แสดง ESI ${input.level} + โซน ${zone}`, async () => {
    await saveTriageFull(page, visit, 'บันทึกคัดกรอง');
    // ปุ่มโซนที่เลือกค้างสถานะกด (aria-pressed) ในฟอร์มบน Overview · ไม่มีปุ่มก็ต้องเห็นชื่อโซนเป็นข้อความ
    const pressedZone = erTriagePanel(page).locator('[class*="er-triage-zone-options"] button[aria-pressed="true"]');
    await expect(pressedZone.or(main.getByText(zone)).first(), `Overview ต้องแสดงโซน ${zone}`).toBeVisible({ timeout: 45_000 });
    const overview = main.getByRole('tab', { name: 'Overview', selected: true });
    if (!(await overview.isVisible().catch(() => false))) play.note('หลังบันทึกคัดกรอง ไม่เห็นแท็บ Overview ถูกเลือก');
    if (!(await erTriageLevel(page, input.level).isChecked().catch(() => false))) play.note(`หน้า Overview ไม่เห็นระดับ ESI ${input.level} ถูกเลือกในฟอร์ม — ตรวจ ESI จาก API บอร์ดในขั้นถัดไป`);
  });

  await play.step(`[${rows.board}] ER Dashboard — ผู้ป่วยขึ้นคอลัมน์โซน ${zone} และแสดง ESI ${input.level}`, async () => {
    let encounter: Awaited<ReturnType<typeof fetchBoard>>[number] | undefined;
    await expect(async () => {
      encounter = (await fetchBoard(page, authorization)).find((e) => e.en === visit.en);
      expect(encounter?.triagedAt, `Encounter ${visit.en} ต้องคัดกรองแล้วบนบอร์ด`).toBeTruthy();
    }).toPass({ timeout: 60_000 });
    expect(encounter!.triageLevel, 'ESI บนบอร์ด').toBe(input.level);
    const zones = await fetchZones(page, authorization);
    const boardZone = zones.get(encounter!.currentLocationId ?? -1) ?? `location ${encounter!.currentLocationId}`;
    play.note(`บอร์ด (API): ESI ${encounter!.triageLevel} · โซน ${boardZone} · MEWS ${encounter!.clinicalDetails?.mews?.score ?? '-'}`);
    const same = (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
    if (!same(zone, boardZone)) play.note(`ชื่อโซนบนบอร์ด "${boardZone}" ไม่ตรงตัวอักษรกับปุ่มที่เลือก "${zone}" — ตรวจจากภาพ`);
    await openErDashboardFromMenu(page).catch(() => gotoErDashboard(page));
    await showDashboardCard(page, visit.hn);
    if (!(await page.getByRole('main').getByText(boardZone).first().isVisible().catch(() => false))) play.note(`ไม่เห็นหัวคอลัมน์ "${boardZone}" บน Dashboard`);
  });
  return zone;
}

/** คลิกการ์ดผู้ป่วยบน ER Dashboard → เข้าหน้าผู้ป่วยของ Visit นั้น */
function openFromBoard(play: TorPlay, page: Page, visit: ErVisit, title: string) {
  return play.step(title, async () => {
    if (!/\/cortex\/er\/dashboard/.test(page.url())) await openErDashboardFromMenu(page).catch(() => gotoErDashboard(page));
    const card = await showDashboardCard(page, visit.hn);
    await card.click();
    await expectVisitHeader(page, visit);
    return true;
  });
}

/** ER Physician Note กรอกครบ → บันทึก → (ตรวจปุ่ม Common chief complaints) → เปิดหน้าใหม่แล้วข้อมูลยังอยู่ */
async function physicianNoteSteps(play: TorPlay, page: Page, visit: ErVisit, dx: string, rows: { save: string; chip?: string; reopen: string }) {
  const saved = await play.step(
    `[${rows.save}] ER Physician Note กรอกครบ (Common chief complaints · Present illness · ช่องข้อความ · Pain score · Diagnosis ${dx}) → บันทึก — บันทึกสำเร็จ`,
    async () => {
      await ensureOnVisit(page, visit);
      const result = await savePhysicianNoteFull(page, { dx });
      noteFilled(play, 'ER Physician Note', result.filled, result.skipped);
      play.note(`อาการที่กดจาก Common chief complaints: "${result.chip ?? '-'}" → แสดงที่: ${result.chipShownIn ?? '-'}`);
      return result;
    },
  );
  if (rows.chip) {
    await play.step(`[${rows.chip}] เลือกอาการนำจาก Common chief complaints — แสดงรายการอาการที่พบบ่อย อาการที่กดถูกเลือกในบันทึก [ต้องยืนยัน]`, async () => {
      if (!saved) throw new Error('ขั้นบันทึก ER Physician Note ไม่สำเร็จ — ตรวจปุ่มอาการไม่ได้');
      expect(saved.chip, 'ต้องมีปุ่ม Common chief complaints ให้กดอย่างน้อย 1 ปุ่ม').toBeTruthy();
      play.note(`[31–33 ต้องยืนยัน] อาการ "${saved.chip}" ไปแสดงที่: ${saved.chipShownIn} — ให้ทีม QA เติมในชีต`);
    });
  }
  await play.step(`[${rows.reopen}] เปิดหน้าผู้ป่วยใหม่ — ข้อมูล ER Physician Note ที่บันทึกยังอยู่ (Present illness + Diagnosis ${dx})`, async () => {
    await gotoVisit(page, visit);
    await waitPhysicianNoteForm(page);
    await expect(physicianNoteIllness(page), 'Present illness ต้องยังมีข้อความ').not.toHaveValue('', { timeout: 30_000 });
    // SBH Prod 8 พ.ย. 2026: ส่วน Diagnosis general อยู่ใต้จอ — locator ของส่วนนี้ไม่เจอข้อความ แต่ Clinical Summary แสดง "การวินิจฉัยหลัก K30 - …" ครบ
    // → ยอมรับได้ทั้ง 2 ที่ (ส่วน Diagnosis ของฟอร์ม หรือช่องการวินิจฉัยหลักของ Clinical Summary)
    const dxPattern = new RegExp(`\\b${dx}\\b`);
    const summaryDx = page.getByRole('main').locator('div').filter({ has: page.getByText(/การวินิจฉัยหลัก/) }).filter({ hasText: dxPattern }).last();
    await expect(physicianNoteDiagnosis(page).filter({ hasText: dxPattern }).or(summaryDx).first(), `Diagnosis ต้องยังเป็น ${dx}`).toBeVisible({ timeout: 30_000 });
    const edited = page.getByRole('main').getByText(/แก้ไขล่าสุดโดย|บันทึกล่าสุด/).first();
    if (await edited.isVisible().catch(() => false)) play.note(`Physician Note: ${(await edited.innerText()).replace(/\s+/g, ' ').slice(0, 120)}`);
  });
  return saved;
}

/**
 * ฟอร์ม Disposition (แท็บเปิดอยู่): เริ่มจำหน่าย (ถ้ายังไม่เริ่ม) → Improved + วิธีจำหน่าย → รายละเอียดเพิ่มเติม → ข้อมูลทางคลินิก / ผลตรวจ (บังคับ) →
 * แพทย์ผู้สั่งจำหน่าย → คำแนะนำผู้ป่วย → นัดติดตาม / Follow-up → (Clinical Summary — dev-x) → การวินิจฉัย ICD (บังคับบน Prod) — ยังไม่บันทึก
 */
async function fillDispositionFull(page: Page, input: { method: string; dx: string; label: string; detail?: string }): Promise<{ filled: string[]; skipped: string[] }> {
  const main = page.getByRole('main');
  const filled: string[] = [];
  const skipped: string[] = [];
  const improved = main.getByRole('radio', { name: 'Improved', exact: true });
  if (!(await improved.isEnabled({ timeout: 10_000 }).catch(() => false))) {
    const started = graphqlMutation(page, 'StartErDischarge', 60_000);
    await page.getByTestId('er-disposition-start').click();
    await expectOk(await started, 'เริ่มจำหน่าย');
    await expect(improved, 'กดเริ่มจำหน่ายแล้วฟอร์มต้องกรอกได้').toBeEnabled({ timeout: 30_000 });
  }
  await improved.check();
  filled.push('สถานะการจำหน่าย: Improved');
  await main.getByRole('radio', { name: input.method, exact: true }).check();
  filled.push(`วิธีการจำหน่าย: ${input.method}`);
  if (input.detail) {
    const detail = input.detail;
    await attempt(filled, skipped, 'รายละเอียดเพิ่มเติม', async () => {
      const box = main.getByRole('textbox', { name: 'ระบุรายละเอียดเพิ่มเติม' });
      if (!(await box.isVisible().catch(() => false))) return false;
      await box.fill(detail);
      return detail;
    });
  }
  const { clinical, finding } = dispositionTextBoxes(page);
  const clinicalText = `ผู้ป่วยปวดท้องใต้ลิ้นปี่ ได้ยาลดกรดที่ ER อาการดีขึ้น V/S ปกติ (${input.label})`;
  const findingText = `CBC ปกติ · Film ไม่พบความผิดปกติ (${input.label})`;
  await clinical.fill(clinicalText);
  await finding.fill(findingText);
  filled.push('ข้อมูลทางคลินิกและการดำเนินโรค', 'การตรวจเพิ่มเติมและผลการตรวจ');

  await attempt(filled, skipped, 'แพทย์ผู้สั่งจำหน่าย', async () => {
    const label = main.getByText(/แพทย์ผู้สั่งจำหน่าย/).first();
    if (!(await label.isVisible().catch(() => false))) return false;
    const select = label.locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
    const current = (await select.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (current && !/^เลือก/.test(current)) return `มีค่าเดิม "${current}"`;
    await select.click();
    await pick(options(page).first());
    return (await select.innerText()).replace(/\s+/g, ' ').trim();
  });
  skipped.push('แพทย์ร่วมทำ (ไม่เลือก — ต้องเป็นแพทย์จริงอีกท่าน ไม่ผูกชื่อแพทย์จริงกับข้อมูลทดสอบ)');
  for (const [name, placeholder, value] of [
    ['คำแนะนำผู้ป่วย', /ระบุคำแนะนำผู้ป่วย/, 'รับประทานยาตามแพทย์สั่ง งดอาหารรสจัด หากปวดมากขึ้น อาเจียน ถ่ายดำ ให้กลับมาพบแพทย์ทันที (UAT)'],
    ['นัดติดตาม / Follow-up', /ระบุแผนการติดตามอาการ/, 'นัดติดตามอาการที่ OPD อายุรกรรม 1 สัปดาห์ (UAT)'],
    ['Clinical Summary', /สรุปอาการผู้ป่วย คำแนะนำ/, 'อาการดีขึ้น ให้คำแนะนำและนัดติดตาม (UAT)'],
  ] as [string, RegExp, string][]) {
    await attempt(filled, skipped, name, async () => {
      const box = main.getByPlaceholder(placeholder).first();
      if (!(await box.isVisible().catch(() => false))) return false;
      await box.fill(value);
      return true;
    });
  }

  // การวินิจฉัย (Prod: ว่างแล้วปุ่มลงนามกดไม่ได้) — ใช้รหัสที่แนะนำจาก Physician Note ก่อน ไม่มีค่อยค้นรหัสเอง
  const suggested = main.getByRole('button', { name: 'ใช้รหัสโรคที่แนะนำ' });
  const empty = main.getByText('ค้นหา ICD10', { exact: true }).first();
  if ((await suggested.isVisible().catch(() => false)) && (await empty.isVisible().catch(() => false))) {
    await suggested.click();
    await page.waitForTimeout(1_500);
  }
  const anyDx = main.locator('.ant-select').filter({ hasText: /^[A-Z]\d{2}(\.\d+)? - / }).first();
  const chosen = (await anyDx.isVisible().catch(() => false)) ? anyDx : await chooseDispositionDiagnosis(page, input.dx);
  filled.push(`การวินิจฉัย: ${(await chosen.innerText()).replace(/\s+/g, ' ').trim()}`);
  return { filled, skipped };
}

/** ขั้น DRAFT + ขั้นลงนามของ Disposition · คืน true เมื่อลงนามสำเร็จ */
async function dispositionSteps(
  play: TorPlay,
  page: Page,
  visit: ErVisit,
  input: { method: string; dx: string; label: string; detail?: string },
  rows: { draft: string; sign: string; title: string },
): Promise<{ signed: boolean; askedAddress?: boolean }> {
  const main = page.getByRole('main');
  await play.step(`[${rows.draft}] ${rows.title} เริ่ม Disposition → ${input.method} กรอกทุกช่อง (Required + คำแนะนำ / นัดติดตาม + ICD) → บันทึกฉบับร่าง — สถานะ DRAFT`, async () => {
    await ensureOnVisit(page, visit);
    await openDisposition(page);
    const result = await fillDispositionFull(page, input);
    noteFilled(play, 'Disposition', result.filled, result.skipped);
    const draft = await saveDispositionDraft(page).catch((error: Error) => {
      play.note('บันทึกฉบับร่าง Disposition ไม่สำเร็จ — ตรง Issue #15 (กดบันทึกแบบร่างมี Error) · ขั้นลงนามยังลองต่อ (ลงนาม = บันทึกร่างอัตโนมัติก่อน)');
      throw error;
    });
    expect(draft.statusCode, 'บันทึกฉบับร่างแล้วต้องเป็น DRAFT').toBe('DRAFT');
    if (input.detail) {
      const detail = main.getByRole('textbox', { name: 'ระบุรายละเอียดเพิ่มเติม' });
      if (await detail.isVisible().catch(() => false)) await expect(detail, 'รายละเอียดเพิ่มเติมต้องยังอยู่หลังบันทึกฉบับร่าง').toHaveValue(input.detail, { timeout: 10_000 });
    }
    await expect(page.getByTestId('er-disposition-finalize'), 'ปุ่มลงนามต้องกดได้หลังบันทึกฉบับร่าง').toBeEnabled({ timeout: 10_000 });
  });

  const signed = await play.step(`[${rows.sign}] ${rows.title} กดปุ่มลงนาม Disposition — สถานะลงนามแล้ว (COMPLETE)`, async () => {
    if (!(await page.getByTestId('er-disposition-finalize').isVisible().catch(() => false))) {
      await ensureOnVisit(page, visit);
      await openDisposition(page);
    }
    const { clinical } = dispositionTextBoxes(page);
    // ขั้น DRAFT พังก่อนกรอก (ฟอร์มยังว่าง) → กรอกใหม่ก่อนลงนาม
    if (!(await clinical.inputValue().catch(() => ''))) {
      const refill = await fillDispositionFull(page, input);
      noteFilled(play, 'Disposition (กรอกใหม่ก่อนลงนาม)', refill.filled, refill.skipped);
    }
    const { askedAddress } = await signDischarge(page);
    await expect(page.getByTestId('er-disposition-reopen'), 'ลงนามแล้วต้องมีปุ่มเปิดแก้ไข').toBeVisible({ timeout: 30_000 });
    const by = main.getByText(/แก้ไขล่าสุดโดย/).first();
    if (await by.isVisible().catch(() => false)) play.note(`Disposition ${(await by.innerText()).replace(/\s+/g, ' ').slice(0, 120)}`);
    return { askedAddress };
  });
  return { signed: !!signed, askedAddress: signed?.askedAddress };
}

/** ขอ Consult (บัญชี Doctor) → ตอบ (บัญชีหลัก) → ดูคำตอบ (บัญชี Doctor) — ตรรกะเดียวกับสเปกรุ่นเก่า + จด Issue #16 */
async function consultSteps(play: TorPlay, page: Page, browser: Browser, visit: ErVisit) {
  let doctorPage: Page | undefined;
  try {
    const requested = await play.step('[38–39] ขอ Consult แพทย์เฉพาะทาง (แพทย์ ER อีกท่าน → แพทย์ของบัญชีหลัก) — คำขอถูกส่ง แสดงในรายการ Consult ว่ามาจาก ER', async () => {
      doctorPage = await openPatientAs(browser, 'Doctor', visit.hn, visit);
      console.log(`    ผู้ขอ Consult: ${(await doctorPage.getByRole('banner').getByRole('button', { name: /^user / }).innerText().catch(() => '-')).replace(/\s+/g, ' ')}`);
      const target = await requestConsult(doctorPage, CONSULT_PROBLEM, { doctor: CONSULT_DOCTOR });
      await recordMenu(doctorPage, 'ประวัติ Consult');
      const pending = doctorPage.getByRole('main').getByRole('row').filter({ hasText: CONSULT_PROBLEM }).filter({ hasText: 'รอตอบกลับ' }).first();
      await expect(pending, 'ประวัติ Consult ต้องมีคำขอจาก ER สถานะ "รอตอบกลับ"').toContainText(CONSULT_DOCTOR.name);
      await snap(doctorPage, 'ประวัติ Consult ของแพทย์ผู้ขอ (รอตอบกลับ)');
      play.note(`Consult → ${target}: ${(await pending.innerText()).replace(/\s+/g, ' ').slice(0, 200)}`);
      return true;
    });
    const answered = await play.step('[40–41] ตอบ Consult — แพทย์ที่ถูกขอปรึกษา (บัญชีหลัก) ตอบในช่อง "คำตอบ" บันทึกได้', async () => {
      if (!requested) throw new Error('ขั้นขอ Consult ไม่สำเร็จ — ไม่มีคำขอให้ตอบ');
      await gotoVisit(page, visit);
      await replyConsult(page, CONSULT_PROBLEM, CONSULT_ANSWER);
      return true;
    });
    if (!answered) play.note('ตอบ Consult ไม่สำเร็จ — ตรง Issue #16 (ไม่สามารถตอบ Consult แพทย์ได้)');
    await play.step('[42–43] ดูคำตอบ Consult ที่หน้าผู้ป่วย ER — แพทย์ผู้ขอเห็นคำตอบจากแพทย์เฉพาะทาง', async () => {
      if (!doctorPage) throw new Error('ไม่มีหน้าของแพทย์ผู้ขอ (ขั้นขอ Consult ไม่สำเร็จ)');
      if (!answered) throw new Error('ขั้นตอบ Consult ไม่สำเร็จ (Issue #16) — ไม่มีคำตอบให้ดู');
      await doctorPage.reload();
      await expect(doctorPage.getByRole('main').getByText(`HN ${visit.hn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
      await recordMenu(doctorPage, 'ประวัติ Consult');
      const row = doctorPage.getByRole('main').getByRole('row').filter({ hasText: CONSULT_PROBLEM }).filter({ hasText: 'ตอบแล้ว' }).first();
      await expect(row).toBeVisible({ timeout: 30_000 });
      await row.getByRole('button').last().click();
      await expect(doctorPage.getByRole('dialog', { name: /Consult/ })).toContainText(CONSULT_ANSWER);
      await snap(doctorPage, 'คำตอบ Consult ที่แพทย์ผู้ขอเห็น');
    });
  } finally {
    await doctorPage?.context().close().catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
  }
}

/** เปิดแผง Order Summary (เมนูขวา) — หน้าเพิ่งโหลดเปิด Overview ตามหลัง → ต้องเห็นแผงต่อเนื่อง */
async function openOrderSummary(page: Page) {
  const main = page.getByRole('main');
  const header = main.getByRole('button').filter({ hasText: 'Progress Note (แพทย์)' }).filter({ hasNotText: 'เพิ่ม' }).first();
  const item = page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: /Order Summary$/ }).first();
  await expect(async () => {
    if (!(await header.isVisible())) await item.click({ force: true });
    await expect(header).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3_000);
    await expect(header).toBeVisible({ timeout: 1_000 });
  }, 'เปิด Order Summary').toPass({ timeout: 120_000 });
  await page.mouse.click(1100, 166);
  await page.mouse.move(960, 1050);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
}

/** One Day Order: ยา + Lab + Imaging + Activity → ส่งคำสั่ง → รายการแสดงที่ Order Summary */
async function orderSteps(play: TorPlay, page: Page, visit: ErVisit) {
  const main = page.getByRole('main');
  const codes = [TOR_ORDER_CODES.lab, ...TOR_ORDER_CODES.img, ...TOR_ORDER_CODES.act];
  let medicine = false;
  const sent = await play.step(
    `[44–46] สั่ง One Day Order (ยา ${TOR_ORDER_CODES.med} · Lab ${TOR_ORDER_CODES.lab} · Imaging ${TOR_ORDER_CODES.img.join(' / ')}${TOR_ORDER_CODES.act.length ? ` · Activity ${TOR_ORDER_CODES.act.join(' / ')}` : ''}) → ตะกร้า → ส่งคำสั่ง`,
    async () => {
      await ensureOnVisit(page, visit);
      await careMenu(page, 'One Day Order', main.getByRole('heading', { name: 'Order', exact: true }));
      medicine = await addMedicineToCart(page, TOR_ORDER_CODES.med).then(
        () => true,
        (error: Error) => {
          play.note(`เพิ่มยา ${TOR_ORDER_CODES.med} ลงตะกร้าไม่สำเร็จ: ${error.message.split('\n')[0].slice(0, 200)} — สั่งรายการอื่นต่อ`);
          return false;
        },
      );
      // ส่งคำสั่งบน Prod หมุนนานเกิน 80 วิได้แต่สำเร็จ — submitOrders รอ SignOPDOrders ได้ถึง 300 วิ
      await submitOrders(page, codes);
      if (medicine) {
        await expect(main.getByRole('row', { name: new RegExp(`^(ส่งแล้ว|กำลังดำเนินการ) \\[${TOR_ORDER_CODES.med}\\]`) }).first(), 'ยาต้องถูกส่งคำสั่งแล้ว').toBeVisible({ timeout: 60_000 });
      }
      if (!TOR_ORDER_CODES.act.length) play.note(`Activity ไม่ได้สั่งบน ${SYSTEM} (ไม่มีรหัสที่ใช้ได้)`);
      expect(medicine, 'ต้องสั่งยาได้ด้วย (Lab / Imaging / Activity ส่งคำสั่งแล้ว)').toBe(true);
      return true;
    },
  );
  await play.step('[44–46] เปิด Order Summary — แสดงรายการที่สั่ง', async () => {
    if (!sent && !medicine) throw new Error('ขั้นส่งคำสั่งไม่สำเร็จ — ไม่มีรายการให้ตรวจ');
    await openOrderSummary(page);
    const all = [TOR_ORDER_CODES.med, ...codes];
    await expect(main.getByText(new RegExp(all.join('|'))).first(), 'Order Summary ต้องมีรายการที่สั่ง').toBeVisible({ timeout: 45_000 });
    const text = await main.innerText();
    const found = all.filter((code) => text.includes(code));
    const missing = all.filter((code) => !text.includes(code));
    play.note(`Order Summary พบรหัส: ${found.join(' · ') || '-'}${missing.length ? ` · ไม่พบรหัสบนจอ (อาจแสดงเป็นชื่อรายการ): ${missing.join(' · ')}` : ''}`);
    expect(found.length, 'Order Summary ต้องแสดงรายการที่สั่งอย่างน้อย 1 รายการ').toBeGreaterThan(0);
  });
}

/** เปิด Visit ER จาก modal "เปิด Visit ER" ที่เปิดอยู่ (หรือค้นผู้ป่วยใหม่ถ้า modal ถูกปิดไปแล้ว) — ไม่แก้ทางอ้อมเมื่อไม่มีเวลาให้ลง */
async function openVisitFromDialog(page: Page, hn: string): Promise<ErVisit> {
  let dialog = openVisitDialog(page);
  if (!(await dialog.isVisible().catch(() => false))) dialog = await selectExistingPatient(page, hn);
  const noSlot = dialog.getByText('ไม่พบเวลาที่สามารถลงได้');
  if (await noSlot.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) {
    throw new Error('ระบบแจ้ง "ไม่พบเวลาที่สามารถลงได้" ที่ห้องตรวจแผนกฉุกเฉิน — เปิด Visit ER ไม่ได้ (ไม่แก้ทางอ้อม รายงานผู้ใช้)');
  }
  const visit = await confirmOpenErVisit(page, dialog, COVERAGE_UC);
  await expectVisitHeader(page, visit);
  return visit;
}

const fullName = (p: NewPatient) => `${p.firstName} ${p.familyName}`;

/**
 * เปิดแผง Disposition: ถ้ามีแท็บ "Disposition" บนแถบแท็บของหน้าผู้ป่วยอยู่แล้ว (เปิดค้างจากขั้นก่อน) ให้กดแท็บนั้น
 * SBH Prod 8 พ.ย. 2026: กดเมนูขวา Disposition ซ้ำตอนมีแท็บอยู่แล้ว → แถบเมนูกางค้าง แผงยังเป็น Overview ("สรุปการจำหน่าย" ไม่ขึ้น)
 */
async function showDisposition(page: Page) {
  const main = page.getByRole('main');
  const heading = main.getByText('สรุปการจำหน่าย', { exact: true });
  if (await heading.isVisible().catch(() => false)) return;
  // แถบแท็บของหน้าผู้ป่วย (Disposition | Overview × | Order Summary) — role tab ไม่ตรงบน Prod 8 พ.ย. → จับข้อความ "Disposition" ที่ไม่อยู่ในเมนูขวา (navigation)
  // หน้าเพิ่งโหลด แถบแท็บขึ้นช้า (8 พ.ย. 18:29 แถว 88 เช็กก่อนแท็บขึ้น → ไปกดเมนูขวา เมนูกางค้าง) → วนลองจนแผงขึ้น
  const tab = page
    .getByRole('tab', { name: /^Disposition/ })
    .or(page.getByText('Disposition', { exact: true }).and(page.locator(':not([role="navigation"] *)')))
    .filter({ visible: true })
    .first();
  await expect(async () => {
    await page.mouse.move(600, 600);
    if (await tab.isVisible().catch(() => false)) await tab.click();
    else await openDisposition(page);
    await expect(heading).toBeVisible({ timeout: 8_000 });
  }, 'กดแท็บ Disposition แล้วต้องเห็นแผงสรุปการจำหน่าย').toPass({ timeout: 90_000 });
  await page.mouse.move(600, 600);
}

/** กรณี 1.3 (แถว 62–67): Reopen → แก้ข้อมูล → ลงนามใหม่ → ประวัติ Disposition (ผู้ทำ + เวลา) */
async function reopenCaseSteps(play: TorPlay, page: Page, authorization: () => string, visit: ErVisit) {
  const main = page.getByRole('main');
  const edited = `แก้ไขหลัง Reopen — ผู้ป่วยอาการดีขึ้น กลับบ้านได้ (UAT-ER-01 กรณี 1.3 ${stamp()})`;
  const reopened = await play.step('[62–63] กรณี 1.3 Reopen Disposition ที่ลงนามแล้ว (ปุ่ม "เปิดแก้ไข") — แก้ไขข้อมูลได้', async () => {
    await gotoVisit(page, visit);
    await showDisposition(page);
    const { at } = await reopenDisposition(page);
    play.note(`Reopen เมื่อ ${dispositionHistoryTime(at)}`);
    return true;
  });
  await play.step('[64–65] กรณี 1.3 แก้ข้อมูล (ข้อมูลทางคลินิก + คำแนะนำผู้ป่วย) แล้วกดปุ่มลงนามใหม่ — ลงนามสำเร็จ ข้อมูลเป็นค่าที่แก้', async () => {
    if (!reopened) throw new Error('ขั้น Reopen ไม่สำเร็จ — แก้ข้อมูลไม่ได้');
    const { clinical } = dispositionTextBoxes(page);
    await clinical.fill(edited);
    const advice = main.getByPlaceholder(/ระบุคำแนะนำผู้ป่วย/).first();
    if (await advice.isVisible().catch(() => false)) await advice.fill(`${edited} · งดอาหารรสจัด`);
    await signDischarge(page);
    await expect(page.getByTestId('er-disposition-reopen'), 'ลงนามใหม่แล้วต้องมีปุ่มเปิดแก้ไข').toBeVisible({ timeout: 30_000 });
    await gotoVisit(page, visit);
    await showDisposition(page);
    await expect(dispositionTextBoxes(page).clinical, 'เปิดใหม่แล้วข้อมูลทางคลินิกต้องเป็นค่าที่แก้').toHaveValue(edited, { timeout: 30_000 });
  });
  await play.step('[66–67] กรณี 1.3 ดูข้อมูลการ Disposition — ระบบเก็บชื่อผู้ทำและเวลา (ประวัติ Disposition)', async () => {
    await ensureOnVisit(page, visit);
    if (!(await page.getByTestId('er-disposition-history').isVisible().catch(() => false))) await showDisposition(page);
    const popover = await openDispositionHistory(page);
    const rows = await readDispositionHistory(popover);
    play.note(`ประวัติ Disposition บนจอ (ใหม่ → เก่า): ${rows.map(describeDispositionHistoryRow).join(' | ')}`);
    await snap(page, 'ประวัติ Disposition (popover)');
    await closeDispositionHistory(page);
    const records = await fetchDispositionHistory(page, authorization, visit.en);
    play.note(`ประวัติ Disposition จาก API: ${records.map((r) => `${DISPOSITION_HISTORY_ACTIONS[r.action] ?? r.action} · ${r.actor?.display ?? '-'} · ${dispositionHistoryTime(r.occurredAt)}`).join(' | ')}`);
    expect(rows.length, 'popover ต้องมีรายการประวัติ').toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.actor, `รายการ "${row.action}" ต้องมีชื่อผู้ทำ`).toBeTruthy();
      expect(row.actor, 'ชื่อผู้ทำต้องเป็นชื่อ ไม่ใช่รหัส (UUID)').not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
      expect(row.time, `รายการ "${row.action}" ต้องมีวันเวลา`).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
    }
    const actions = records.map((r) => r.action);
    expect(actions, 'ประวัติต้องมีการลงนาม').toContain('SIGNED');
    expect(actions, 'ประวัติต้องมีการเปิดแก้ไข').toContain('REOPENED');
  });
}

// ---------- เทส ----------

test.describe(`เล่น Scenario UAT ER ชีตส่งมอบ — UAT-ER-01 / 02 (${SYSTEM})`, () => {
  test('UAT-ER-01 กรณี 1.1 + 1.3 ผู้ป่วยมี HN เดิม → กลับบ้านปกติ → Reopen (รายที่ 1)', { tag: ['@UAT-ER-01', '@UAT-ER-01-1'] }, async ({ page, browser }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-01-1');
    const authorization = trackAuthorization(page);
    const registeredHn = watchRegistration(page);
    const main = page.getByRole('main');
    try {
      // TOR01_RESUME=<HN>,<VN>,<EN> = เล่นเฉพาะกรณี 1.3 (แถว 62–67) กับผู้ป่วยที่ลงนาม Disposition กรณี 1.1 แล้ว (ผู้ใช้อนุมัติ 8 พ.ย. 2026 — ไม่สร้างผู้ป่วยใหม่)
      const resume = process.env.TOR01_RESUME?.split(',').map((s) => s.trim());
      if (resume?.length === 3) {
        const visit: ErVisit = { hn: resume[0], vn: resume[1], en: resume[2] };
        console.log(`▶ UAT-ER-01-1 (${SYSTEM}) เล่นต่อเฉพาะกรณี 1.3 กับ HN ${visit.hn} ${visit.en}`);
        play.patient('เล่นต่อ (TOR01_RESUME — ลงนามกรณี 1.1 แล้ว)', { ...visit, name: `HN ${visit.hn}` });
        await reopenCaseSteps(play, page, authorization, visit);
        return;
      }
      await gotoErDashboard(page);
      const fresh = await nextUatPatient(page, authorization(), 1);
      const name = fullName(fresh);
      console.log(`▶ UAT-ER-01-1 (${SYSTEM}) ผู้ป่วย ${name} — ลงทะเบียนกรอกครบแล้วเล่นแบบ "ผู้ป่วยมี HN"`);

      const reg = await play.step('[R24 เตรียม] ลงทะเบียนผู้ป่วยกรอกครบ (ช่องบังคับ + เบอร์มือถือ + รูป + ที่อยู่) แล้วกดยกเลิกที่หน้าต่างเปิด Visit — ได้ HN ที่ยังไม่มี Visit', async () => {
        const result = await registerFull(page, fresh, { withoutVisit: true });
        noteFilled(play, 'ลงทะเบียน', result.filled, result.skipped);
        return result;
      });
      const hn = reg?.hn ?? registeredHn();
      if (!hn) throw new Error('UAT-ER-01-1: ลงทะเบียนผู้ป่วยไม่สำเร็จ — เล่นขั้นที่เหลือไม่ได้');
      const photoUploaded = !!reg?.filled.some((f) => f.startsWith('รูปโปรไฟล์'));
      console.log(`    รายที่ 1: ${name} HN ${hn}`);

      await play.step('[15–16] ค้นหาผู้ป่วยด้วย HN / ชื่อ-สกุล / เลขบัตรประชาชน (แดชบอร์ด >> + คัดกรอง >> ผู้ป่วยมี HN) — ทุกวิธีพบผู้ป่วยรายเดียวกัน', async () => {
        await openErDashboardFromMenu(page).catch(() => gotoErDashboard(page));
        await openTriagePage(page);
        await page.locator('label').filter({ hasText: 'ผู้ป่วยมี HN' }).click();
        const search = page.getByRole('combobox', { name: 'ค้นหาผู้ป่วยด้วย HN หรือชื่อ' });
        const found: string[] = [];
        for (const [how, text] of [
          ['HN', hn],
          ['ชื่อ-สกุล', name],
          ['เลขบัตรประชาชน', fresh.citizenId],
        ] as const) {
          await search.fill(text);
          await expect(page.locator(`.ant-select-item-option[title^="${hn} - "]`), `ค้นด้วย${how} "${text}" ต้องพบ HN ${hn}`).toBeVisible({ timeout: 20_000 });
          found.push(`${how} → ${await page.locator('.ant-select-dropdown:visible .ant-select-item-option').count()} รายการ`);
          await snap(page, `ค้นหาด้วย${how}`);
          await search.fill('');
        }
        play.note(`ผลค้นหา: ${found.join(' · ')}`);
      });

      await play.step('[17–18] เลือกผู้ป่วย ตรวจข้อมูลก่อนเปิด Visit — เห็นชื่อ-สกุล และรูปถ่าย', async () => {
        const dialog = await selectExistingPatient(page, hn);
        await expect(dialog, 'หน้าต่างเปิด Visit ต้องแสดงชื่อ-สกุล').toContainText(name);
        // หน้าต่างเปิด Visit: รูปจาก URL ใดก็ได้ · หน้าคัดกรอง: เฉพาะรูปที่โหลดเป็น blob / data (กันไอคอนของแอป)
        const photo = dialog.locator(IMG).filter({ visible: true }).or(main.locator('img[src^="blob:"], img[src^="data:image"]').filter({ visible: true }));
        const hasPhoto = (await photo.count()) > 0;
        if (!photoUploaded) play.note(`ตอนลงทะเบียนอัปโหลดรูปไม่สำเร็จ — ${hasPhoto ? 'แต่มีรูปบนจอ' : 'ไม่มีรูปบนจอ'}`);
        else expect(hasPhoto, 'อัปโหลดรูปตอนลงทะเบียนแล้ว ต้องเห็นรูปถ่ายของผู้ป่วยก่อนเปิด Visit').toBe(true);
        if (!(await dialog.getByText(/แพ้/).count())) play.note('หน้าต่างเปิด Visit ไม่มีส่วนแสดงประวัติแพ้ยา');
      });

      const visit = await play.step('[19–20] เปิด Visit ER เลือกสิทธิ UC >> ยืนยันเปิด visit — ขึ้น "สร้าง Visit สำเร็จ" และหัวจอแสดงเลข EN', () => openVisitFromDialog(page, hn));
      recordMockPatient('TOR 01 (1.1/1.3)', fresh, visit ?? { hn }, visit ? 'UAT-ER-01 กรณี 1.1 + 1.3 (ชีตส่งมอบ)' : 'ลงทะเบียนกรอกครบแล้ว เปิด Visit ไม่สำเร็จ');
      if (!visit) throw new Error(`UAT-ER-01-1: เปิด Visit ER ให้ HN ${hn} ไม่สำเร็จ — เล่นขั้นที่เหลือไม่ได้`);
      const p1: Played = { ...visit, name, citizenId: fresh.citizenId };
      play.patient('เปิดใหม่ (R24 ลงทะเบียนก่อน แล้วเล่นแบบผู้ป่วยมี HN)', p1);
      savePatient('tor01-1', p1);

      await triageSteps(play, page, authorization, visit, { level: 3, vitals: TOR_VITALS_NORMAL, gcs: GCS_FULL, arrival: 'Walk-in', underlying: 'Hypertension', zone: 'suggested' }, { fill: '22–25', save: '26–27', board: '26–27' });

      await openFromBoard(play, page, visit, '[29–30] เปิดผู้ป่วยจาก ER Dashboard (คลิกการ์ดบน Whiteboard) — เข้าหน้าการรับบริการของรายนั้น');

      await physicianNoteSteps(play, page, visit, DX.tor011, { save: '31–35', chip: '31–33', reopen: '34–35' });

      await play.step('[36–37] บันทึกประวัติแพ้ยา (แท็บขวา >> บันทึกการแพ้) — แพ้ยาแสดงที่ Banner', async () => {
        await ensureOnVisit(page, visit);
        play.note(`แพ้ยาที่บันทึก: ${await recordDrugAllergy(page, 'paracetamol')}`);
      });

      await consultSteps(play, page, browser, visit);

      await orderSteps(play, page, visit);

      const { signed } = await dispositionSteps(
        play,
        page,
        visit,
        { method: 'With Approval', dx: DX.tor011, label: 'UAT-ER-01 กรณี 1.1' },
        { draft: '48–50', sign: '51–52', title: 'กรณี 1.1' },
      );

      await play.step('[53–54] ออกใบรับรองแพทย์ — ออกเอกสารได้', async () => {
        await ensureOnVisit(page, visit);
        play.note(`ใบรับรองแพทย์ที่สร้าง: ${await createMedicalCertificate(page, CERTIFICATE)}`);
      });

      if (!signed) {
        play.note('ข้ามกรณี 1.3 (แถว 62–67) เพราะลงนาม Disposition กรณี 1.1 ไม่สำเร็จ');
      } else {
        await reopenCaseSteps(play, page, authorization, visit);
      }
    } finally {
      play.finish();
    }
  });

  test('UAT-ER-01 กรณี 1.2 ปฏิเสธการรักษา (รายที่ 2)', { tag: ['@UAT-ER-01-2'] }, async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-01-2');
    const authorization = trackAuthorization(page);
    const registeredHn = watchRegistration(page);
    try {
      await gotoErDashboard(page);
      const fresh = await nextUatPatient(page, authorization(), 1);
      const name = fullName(fresh);
      console.log(`▶ UAT-ER-01-2 (${SYSTEM}) ผู้ป่วย ${name} — กรณี 1.2 ปฏิเสธการรักษา`);

      const reg = await play.step('[ขั้นร่วม] ลงทะเบียนผู้ป่วยกรอกครบ (ช่องบังคับ + เบอร์มือถือ + รูป + ที่อยู่) → เปิด Visit ER สิทธิ UC — ได้ HN + EN', async () => {
        const result = await registerFull(page, fresh);
        noteFilled(play, 'ลงทะเบียน', result.filled, result.skipped);
        if (!result.visit) throw new Error(`ลงทะเบียนได้ HN ${result.hn} แต่ไม่ได้ Visit`);
        await expectVisitHeader(page, result.visit);
        return result;
      });
      const visit = reg?.visit;
      recordMockPatient('TOR 01 (1.2)', fresh, visit ?? { hn: reg?.hn ?? registeredHn() ?? '-' }, visit ? 'UAT-ER-01 กรณี 1.2 ปฏิเสธการรักษา (ชีตส่งมอบ)' : 'ลงทะเบียน / เปิด Visit ไม่สำเร็จ');
      if (!visit) throw new Error('UAT-ER-01-2: ลงทะเบียน / เปิด Visit ER ไม่สำเร็จ — เล่นขั้นที่เหลือไม่ได้');
      const p2: Played = { ...visit, name, citizenId: fresh.citizenId };
      play.patient('เปิดใหม่ (กรณี 1.2)', p2);
      savePatient('tor01-2', p2);

      await triageSteps(play, page, authorization, visit, { level: 4, vitals: TOR_VITALS_NORMAL, gcs: GCS_FULL, arrival: 'Walk-in', underlying: 'Hypertension', zone: 'suggested' }, { fill: 'ขั้นร่วม', save: 'ขั้นร่วม', board: 'ขั้นร่วม' });
      await openFromBoard(play, page, visit, '[ขั้นร่วม] เปิดผู้ป่วยจาก ER Dashboard — เข้าหน้าการรับบริการของรายนั้น');
      await physicianNoteSteps(play, page, visit, DX.tor012, { save: 'ขั้นร่วม', reopen: 'ขั้นร่วม' });

      await dispositionSteps(
        play,
        page,
        visit,
        { method: DISCHARGE_AGAINST_ADVICE, dx: DX.tor012, label: 'UAT-ER-01 กรณี 1.2', detail: 'ผู้ป่วยปฏิเสธการรักษาต่อ ขอกลับบ้านเอง แพทย์อธิบายความเสี่ยงแล้ว ผู้ป่วยลงนามรับทราบ (UAT-ER-01 กรณี 1.2)' },
        { draft: '56–58', sign: '59–60', title: `กรณี 1.2 (${DISCHARGE_AGAINST_ADVICE})` },
      );
    } finally {
      play.finish();
    }
  });

  test('UAT-ER-02 ผู้ป่วยใหม่ไม่มี HN มา ER ครั้งแรก', { tag: ['@UAT-ER-02'] }, async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-02');
    const authorization = trackAuthorization(page);
    const registeredHn = watchRegistration(page);
    const main = page.getByRole('main');
    try {
      await gotoErDashboard(page);
      const fresh = await nextUatPatient(page, authorization(), 2);
      const name = fullName(fresh);
      console.log(`▶ UAT-ER-02 (${SYSTEM}) ผู้ป่วยใหม่ ${name}`);

      const reg = await play.step('[70–73] + คัดกรอง >> ผู้ป่วยใหม่ กรอกเลขบัตร · ชื่อ · นามสกุล · เพศ · วันเกิด · รูปภาพ (+ เบอร์ · ที่อยู่) >> ลงทะเบียน >> เปิด Visit สิทธิ UC — ได้ HN ใหม่ + "สร้าง Visit สำเร็จ" + EN', async () => {
        const result = await registerFull(page, fresh);
        noteFilled(play, 'ลงทะเบียน', result.filled, result.skipped);
        if (!result.filled.some((f) => f.startsWith('รูปโปรไฟล์'))) play.note('บันทึกรูปภาพตอนลงทะเบียนไม่สำเร็จ (ชีตแถว 70 ให้บันทึกรูป)');
        expect(result.hn, 'ต้องได้ HN ใหม่').toBeTruthy();
        if (!result.visit) throw new Error(`ลงทะเบียนได้ HN ${result.hn} แต่ไม่ได้ Visit`);
        await expectVisitHeader(page, result.visit);
        return result;
      });
      const visit = reg?.visit;
      const addressFilled = !!reg?.filled.some((f) => f.startsWith('ตำบล'));
      recordMockPatient('TOR 02', fresh, visit ?? { hn: reg?.hn ?? registeredHn() ?? '-' }, visit ? 'UAT-ER-02 ผู้ป่วยใหม่ (ชีตส่งมอบ)' : 'ลงทะเบียน / เปิด Visit ไม่สำเร็จ');
      if (!visit) throw new Error('UAT-ER-02: ลงทะเบียน / เปิด Visit ER ไม่สำเร็จ — เล่นขั้นที่เหลือไม่ได้');
      const p: Played = { ...visit, name, citizenId: fresh.citizenId };
      play.patient('เปิดใหม่ (ผู้ป่วยใหม่ไม่มี HN)', p);
      savePatient('tor02', p);

      await triageSteps(play, page, authorization, visit, { level: 3, vitals: TOR_VITALS_NORMAL, gcs: GCS_FULL, arrival: 'Walk-in', underlying: 'Hypertension', zone: 'suggested' }, { fill: '75–76', save: '75–76', board: '75–76' });
      await openFromBoard(play, page, visit, '[75–76] เปิดผู้ป่วยจาก ER Dashboard (คลิกการ์ด) — เข้าหน้า Overview ของรายนั้น');

      await play.step('[77–78] Overview >> พิมพ์ป้ายปลายเตียง — ป้าย (PDF) มีชื่อผู้ป่วย เลข EN และวันเวลา', async () => {
        await ensureOnVisit(page, visit);
        const button = main.getByRole('button', { name: 'พิมพ์ป้ายปลายเตียง' }).first();
        await expect(button, 'ต้องมีปุ่มพิมพ์ป้ายปลายเตียง').toBeVisible({ timeout: 60_000 });
        const pdf = guard(page.waitForResponse((res) => res.url().includes('/bedside-name-badge/pdf'), { timeout: 60_000 }));
        await button.click();
        const res = await pdf;
        await expectOk(res, 'ขอ PDF ป้ายปลายเตียง');
        expect(res.headers()['content-type'] ?? '', 'ต้องได้ไฟล์ PDF').toContain('application/pdf');
        const body = await res.body();
        expect(body.length, 'ไฟล์ PDF ต้องมีเนื้อหา').toBeGreaterThan(5_000);
        await test.info().attach('ป้ายปลายเตียง.pdf', { body, contentType: 'application/pdf' });
        // R18: เครื่องที่รันไม่มี print agent → แจ้งเตือนนี้ไม่ใช่ fail (ตรวจจาก PDF ที่ระบบสร้างแทน)
        if (await page.getByText('ไม่สามารถพิมพ์ป้ายชื่อผู้ป่วยได้').first().isVisible({ timeout: 5_000 }).catch(() => false)) {
          play.note('ขึ้น "ไม่สามารถพิมพ์ป้ายชื่อผู้ป่วยได้" — เครื่องที่รันไม่มี print agent (R18 ไม่นับเป็น fail) · ตรวจจาก PDF ที่ระบบสร้าง');
        }
        const text = (await pdfPages(body).catch(() => [] as string[])).join(' ');
        const flat = text.replace(/\s+/g, '');
        if (flat.length < 10) {
          play.note('อ่านข้อความใน PDF ป้ายปลายเตียงไม่ได้ (ฟอนต์ฝัง / รูปภาพ) — ตรวจจากภาพ PDF ที่แสดงบนจอ');
        } else {
          play.note(`ข้อความบนป้าย: ${text.slice(0, 240)}`);
          expect(flat, `ป้ายต้องมีเลข EN ${visit.en}`).toContain(visit.en);
          expect(flat, `ป้ายต้องมีชื่อผู้ป่วย (${fresh.familyName})`).toContain(fresh.familyName.replace(/\s+/g, ''));
          if (!/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}:\d{2}/.test(text)) play.note('ไม่พบวันที่ / เวลาในข้อความของป้าย — ตรวจจากภาพ');
        }
        try {
          await showPdf(page, body, `ป้ายปลายเตียง ${visit.en}`);
          await snap(page, 'ป้ายปลายเตียง (PDF ที่ระบบสร้าง)');
        } finally {
          await hidePdf(page).catch(() => undefined);
        }
      });

      await physicianNoteSteps(play, page, visit, DX.tor02, { save: '80–81', reopen: '80–81' });

      const { signed, askedAddress } = await dispositionSteps(
        play,
        page,
        visit,
        { method: 'With Approval', dx: DX.tor02, label: 'UAT-ER-02' },
        { draft: '83–85', sign: '86–87', title: 'ผู้ป่วยใหม่' },
      );

      await play.step('[88–89] ยืนยันกรณีไม่มีที่อยู่ ("ลงนามต่อ") — ลงนามสำเร็จ', async () => {
        if (!signed) throw new Error('ขั้นลงนาม Disposition ไม่สำเร็จ');
        if (askedAddress) play.note(`ขึ้นหน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" → กด "ลงนามต่อ" แล้วลงนามสำเร็จ${addressFilled ? ' (ทั้งที่กรอกที่อยู่ตอนลงทะเบียนแล้ว — ข้อสังเกต)' : ''}`);
        else play.note(addressFilled
          ? 'ไม่ขึ้นหน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" เพราะกรอกที่อยู่ตอนลงทะเบียนแล้ว (ผู้ใช้ให้กรอกข้อมูลครบ) — ชีตแถว 88–89 ใช้กับผู้ป่วยที่ไม่มีที่อยู่'
          : 'ไม่ขึ้นหน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" ทั้งที่กรอกที่อยู่ไม่สำเร็จ — ข้อสังเกต');
        await expect(page.getByTestId('er-disposition-reopen'), 'สถานะลงนามแล้ว (มีปุ่มเปิดแก้ไข)').toBeVisible({ timeout: 30_000 });
      });
    } finally {
      play.finish();
    }
  });

  // แถว 88–89 แบบผู้ป่วยไม่มีที่อยู่ — ผู้ใช้สั่ง 8 พ.ย. 2026: "ข้อ 88 ให้ไปกรอกที่อยู่ผู้ป่วยในหน้าทะเบียนคนไข้"
  // → เลือก "ไม่กรอกที่อยู่ตอนลงทะเบียน → เจอหน้าต่าง → ไปกรอกที่เวชระเบียน": ลงทะเบียนไม่กรอกที่อยู่ → ร่าง Disposition → กดลงนาม
  //   → ต้องขึ้นหน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" (ไม่กด ลงนามต่อ) → เวชระเบียน แก้ไขข้อมูลผู้ป่วย กรอกที่อยู่ทะเบียนบ้าน + ปัจจุบัน → บันทึก
  //   → กลับมากดลงนาม ต้องไม่ถามที่อยู่อีก และลงนามสำเร็จ
  test('UAT-ER-02 แถว 88–89 ผู้ป่วยไม่มีที่อยู่ → ไปกรอกที่อยู่ที่เวชระเบียน → ลงนาม', { tag: ['@UAT-ER-02-88'] }, async ({ page }) => {
    test.setTimeout(30 * 60_000);
    const play = new TorPlay(page, 'UAT-ER-02-88');
    const authorization = trackAuthorization(page);
    const registeredHn = watchRegistration(page);
    const main = page.getByRole('main');
    try {
      // TOR0288_RESUME=<HN>,<VN>,<EN> = เล่นต่อเฉพาะขั้นสุดท้าย (กรอกที่อยู่ที่เวชระเบียนแล้ว · Disposition ยังเป็น DRAFT) — ไม่สร้างผู้ป่วยใหม่
      const resume = process.env.TOR0288_RESUME?.split(',').map((s) => s.trim());
      if (resume?.length === 3) {
        const visit: ErVisit = { hn: resume[0], vn: resume[1], en: resume[2] };
        console.log(`▶ UAT-ER-02-88 (${SYSTEM}) เล่นต่อขั้นลงนามกับ HN ${visit.hn} ${visit.en}`);
        play.patient('เล่นต่อ (TOR0288_RESUME — กรอกที่อยู่ที่เวชระเบียนแล้ว)', { ...visit, name: `HN ${visit.hn}` });
        await play.step('[88–89] กลับมากดปุ่มลงนาม Disposition — ไม่ถามที่อยู่อีก และลงนามสำเร็จ', async () => {
          await gotoVisit(page, visit);
          await showDisposition(page);
          const { askedAddress } = await signDischarge(page);
          expect(askedAddress, 'กรอกที่อยู่แล้ว ต้องไม่ขึ้นหน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" อีก').toBe(false);
          await expect(page.getByTestId('er-disposition-reopen'), 'สถานะลงนามแล้ว (มีปุ่มเปิดแก้ไข)').toBeVisible({ timeout: 30_000 });
        });
        return;
      }
      await gotoErDashboard(page);
      const fresh = await nextUatPatient(page, authorization(), 2);
      const name = fullName(fresh);
      console.log(`▶ UAT-ER-02-88 (${SYSTEM}) ผู้ป่วยใหม่ไม่มีที่อยู่ ${name}`);

      const reg = await play.step('[70–73] ลงทะเบียนผู้ป่วยใหม่ (เลขบัตร · ชื่อ · เพศ · วันเกิด · รูป · เบอร์) **ไม่กรอกที่อยู่** >> เปิด Visit สิทธิ UC — ได้ HN + EN', async () => {
        const result = await registerFull(page, fresh, { extras: { address: false } });
        noteFilled(play, 'ลงทะเบียน (ไม่กรอกที่อยู่ — แถว 88)', result.filled, result.skipped);
        if (!result.visit) throw new Error(`ลงทะเบียนได้ HN ${result.hn} แต่ไม่ได้ Visit`);
        await expectVisitHeader(page, result.visit);
        return result;
      });
      const visit = reg?.visit;
      recordMockPatient('TOR 02-88', fresh, visit ?? { hn: reg?.hn ?? registeredHn() ?? '-' }, visit ? 'UAT-ER-02 แถว 88 ผู้ป่วยไม่มีที่อยู่ → กรอกที่เวชระเบียน (ชีตส่งมอบ)' : 'ลงทะเบียน / เปิด Visit ไม่สำเร็จ');
      if (!visit) throw new Error('UAT-ER-02-88: ลงทะเบียน / เปิด Visit ER ไม่สำเร็จ — เล่นขั้นที่เหลือไม่ได้');
      play.patient('เปิดใหม่ (ไม่มีที่อยู่)', { ...visit, name, citizenId: fresh.citizenId });

      await triageSteps(play, page, authorization, visit, { level: 3, vitals: TOR_VITALS_NORMAL, gcs: GCS_FULL, arrival: 'Walk-in', underlying: 'Hypertension', zone: 'suggested' }, { fill: 'ขั้นร่วม 75–76', save: 'ขั้นร่วม 75–76', board: 'ขั้นร่วม 75–76' });
      await physicianNoteSteps(play, page, visit, DX.tor02, { save: 'ขั้นร่วม 80–81', reopen: 'ขั้นร่วม 80–81' });

      const input = { method: 'With Approval', dx: DX.tor02, label: 'UAT-ER-02 แถว 88' };
      await play.step('[83–85] เริ่ม Disposition → With Approval กรอกทุกช่อง → บันทึกฉบับร่าง — สถานะ DRAFT', async () => {
        await ensureOnVisit(page, visit);
        await openDisposition(page);
        const result = await fillDispositionFull(page, input);
        noteFilled(play, 'Disposition', result.filled, result.skipped);
        const draft = await saveDispositionDraft(page);
        expect(draft.statusCode, 'บันทึกฉบับร่างแล้วต้องเป็น DRAFT').toBe('DRAFT');
      });

      const asked = await play.step('[86–88] กดปุ่มลงนาม (ผู้ป่วยไม่มีที่อยู่) — ขึ้นหน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" (ยังไม่กด ลงนามต่อ)', async () => {
        if (!(await page.getByTestId('er-disposition-finalize').isVisible().catch(() => false))) await showDisposition(page);
        await main.getByText('สรุปการจำหน่าย', { exact: true }).click();
        await page.mouse.move(600, 600);
        await page.getByTestId('er-disposition-finalize').click();
        const proceed = page.getByRole('button', { name: 'ลงนามต่อ' });
        await expect(proceed, 'ผู้ป่วยไม่มีที่อยู่ ต้องขึ้นหน้าต่างถามก่อนลงนาม').toBeVisible({ timeout: 20_000 });
        const dialog = page.getByRole('dialog').filter({ has: proceed }).or(page.locator('.ant-modal-content').filter({ has: proceed })).first();
        const text = (await dialog.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        const buttons = (await dialog.getByRole('button').allInnerTexts().catch(() => [] as string[])).map((b) => b.replace(/\s+/g, ' ').trim()).filter(Boolean);
        play.note(`หน้าต่างก่อนลงนาม: "${text.slice(0, 200)}" · ปุ่ม: ${buttons.join(' / ')}`);
        await snap(page, 'หน้าต่าง ผู้ป่วยยังไม่มีข้อมูลที่อยู่');
        // ไม่ลงนาม — ปิดหน้าต่างไปกรอกที่อยู่ก่อน
        const cancel = dialog.getByRole('button', { name: /ยกเลิก|ปิด|Cancel|Close/ }).first();
        if (await cancel.isVisible().catch(() => false)) await cancel.click();
        else await page.keyboard.press('Escape');
        await expect(proceed, 'ปิดหน้าต่างแล้ว').toBeHidden({ timeout: 10_000 });
        await expect(page.getByTestId('er-disposition-reopen'), 'ยังไม่ลงนาม (ไม่มีปุ่มเปิดแก้ไข)').toBeHidden();
        return true;
      });

      const addressSaved = await play.step('[88] ไปหน้าเวชระเบียน (ทะเบียนคนไข้) >> แก้ไขข้อมูลผู้ป่วย กรอกที่อยู่ทะเบียนบ้าน + ที่อยู่ปัจจุบัน >> บันทึก — บันทึกสำเร็จ', async () => {
        if (!asked) throw new Error('ขั้นก่อนหน้าไม่ขึ้นหน้าต่างถามที่อยู่ — ไม่ได้ทดสอบแถว 88 ตามเงื่อนไข');
        const f = receptionFrame(page);
        await page.goto(`/cortex/next/patients/${visit.hn}?views=patientInfo`);
        await expect(f.getByRole('heading', { name: 'ข้อมูลผู้ป่วย' }), 'หน้าข้อมูลผู้ป่วย (เวชระเบียน) ต้องโหลดขึ้น').toBeVisible({ timeout: 120_000 });
        const edit = f.getByRole('button', { name: 'แก้ไขข้อมูลผู้ป่วย' });
        await expect(edit).toBeVisible({ timeout: 90_000 });
        await edit.click();
        await page.waitForURL(/actions=patientEdit/, { timeout: 60_000 });
        const address = { houseNo: TOR_CONTACT.houseNo, villageNo: '1', road: 'พหลโยธิน', location: SARABURI_PAKPHRIAO };
        await expect(textField(f, ADDRESS_BLOCKS.official, 'houseNo'), 'ฟอร์มแก้ไขต้องมีช่องบ้านเลขที่ (ทะเบียนบ้าน)').toBeVisible({ timeout: 60_000 });
        await fillAddress(f, ADDRESS_BLOCKS.official, address);
        if (await textField(f, ADDRESS_BLOCKS.current, 'houseNo').isVisible().catch(() => false)) await fillAddress(f, ADDRESS_BLOCKS.current, address);
        await snap(page, 'เวชระเบียน — กรอกที่อยู่แล้ว (ก่อนกดบันทึก)');
        const submit = f.getByTestId('submit-button');
        await submit.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        const updated = guard(page.waitForResponse((res) => res.request().method() !== 'GET' && /\/new-demographic-api\/patients\/[^/?]+$/.test(new URL(res.url()).pathname), { timeout: 60_000 }));
        await submit.click();
        const res = await updated;
        expect(res.ok(), `บันทึกที่อยู่ที่เวชระเบียน → ${res.status()} ${(await res.text().catch(() => '')).slice(0, 300)}`).toBeTruthy();
        await expect(f.getByRole('heading', { name: 'ข้อมูลผู้ป่วย' }), 'บันทึกแล้วกลับหน้าข้อมูลผู้ป่วย').toBeVisible({ timeout: 60_000 });
        play.note(`กรอกที่อยู่ที่เวชระเบียน: ${address.houseNo} หมู่ ${address.villageNo} ถ.${address.road} ต.ปากเพรียว อ.เมืองสระบุรี จ.สระบุรี 18000 (ทะเบียนบ้าน + ปัจจุบัน)`);
        return true;
      });

      await play.step('[88–89] กลับมากดปุ่มลงนาม Disposition — ไม่ถามที่อยู่อีก และลงนามสำเร็จ', async () => {
        if (!addressSaved) throw new Error('กรอกที่อยู่ที่เวชระเบียนไม่สำเร็จ');
        await gotoVisit(page, visit);
        await showDisposition(page);
        const { askedAddress } = await signDischarge(page);
        expect(askedAddress, 'กรอกที่อยู่แล้ว ต้องไม่ขึ้นหน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" อีก').toBe(false);
        await expect(page.getByTestId('er-disposition-reopen'), 'สถานะลงนามแล้ว (มีปุ่มเปิดแก้ไข)').toBeVisible({ timeout: 30_000 });
      });
    } finally {
      play.finish();
    }
  });
});
