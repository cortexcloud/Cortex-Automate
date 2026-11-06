import fs from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { confirmOpenErVisit, dismissToast, expectOk, waitForApi, gotoErDashboard, openTriagePage, openVisitDialog, type ErVisit } from '../../../helpers/functions/er';
import { ER_LIST_TABS, erListCell, erListRow, erListTab, erListTabCount, gotoErPatientList, openErListTab, openErPatientListFromMenu, type ErListTabKey } from '../../../helpers/functions/er-list';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { authFile, getCredentials } from '../../../utils/env';
import { erTriagePanel, fillErTriageForm, saveErTriageForm, type VitalSigns } from '../../../helpers/functions/er-triage';
import { newTestPatient, type NewPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, registerAndOpenErVisit, submitOrders } from '../../../mock-data/uat-er';
import { amountDue, answerConsultFromList, chargeItems, createInvoicesOnly, createPrescriptionAt, dispensePrescription, gotoPharmacy } from '../../../mock-data/bizsim-opd';
import { payAllInCash } from '../../../helpers/functions/cashier';
import { selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { VITALS_HIGH_MEWS, VITALS_NORMAL, addMedicineToCart, careMenu, gotoVisit, openPatientAs, replyConsult, requestConsult } from '../../../mock-data/uat-play';

// SBH-3181 [ER][Dashboard][Patientlist] ปรับปรุงเงื่อนไขการแสดงผล — EXE SBH-3751 · TC-SBH-3181-001 … 066 · dev-x + SBH Prod (playwright.sbh-prod.cards.config.ts)
// หน้า: แดชบอร์ด / คิว มุมมอง "รายการ" (/cortex/er/dashboard?view=list) — สำรวจ 3 พ.ย. 2026 (ไฟล์แอป index-wF045BWX.js / index-DGTxGbMW.js)
//
// ข้อมูล: ผู้ป่วยบน dev-x ใช้ร่วมกันทั้งทีม → ทุก TC นับ / เทียบจากตารางตอนรัน ไม่ฝังตัวเลข
// ผู้ป่วย AUTO ที่เทสเตรียมเอง (เทส "เตรียมข้อมูล" @P3181-prep · จดไว้ที่ .cache/SBH-3181/patients.json ให้เทส TC ใช้ต่อ):
//   A ESI 1 Resuscitation · MEWS สูง · Consult Emergency ยังไม่ตอบ (ชิป Consult แดง)
//   B ESI 4 Isolation 2
//   C ESI 5 Observation
//   D ESI 3 Urgency · อายุ 11 เดือน · Consult จากบัญชี Doctor ที่บัญชีหลักตอบแล้ว (ชิป Consult เขียว)
//   E ESI 4 Isolation 1 · อายุ 1 ปีพอดี (วันเกิด = วันนี้ปีก่อน — ห้ามรันคร่อมเที่ยงคืน)
//   F เปิด Visit ไม่คัดกรอง (โซน Triage · รอคัดกรอง)
// ผู้ใช้ตอบ 3 พ.ย. 2026: Order เขียว / แดง "ลองสร้างให้ครบ" · ผู้ป่วยที่สร้าง "ปิด Visit ตอนจบงาน" (เทส "เก็บกวาด" @P3181-cleanup)
//
// ฟอร์มลงทะเบียนผู้ป่วยใหม่ของ ER (dev-x ตั้งแต่ ~23 ต.ค. 2026) รับปีเกิดเป็น พ.ศ. — newTestPatient() พิมพ์ 1990 จึงได้วันเกิด 1447 (อายุ 579 ปี)
// → ที่นี่พิมพ์วันเกิดเป็น พ.ศ. แล้วยืนยันจาก API ว่าได้ ค.ศ. ที่ตั้งใจ

// SBH Prod (6 พ.ย. 2026 · ผู้ใช้สั่ง "ทดสอบการ์ด SBH-3181 บน Prod"): ผู้ใช้เลือก "สร้าง 5 ราย แล้วปิด Visit" → เตรียมเฉพาะ A–E
//   (F ยังไม่คัดกรอง / G ไม่ระบุเพศ ใช้ผู้ป่วยทดสอบที่มีอยู่บน Prod — TC หาจาก API ตอนรัน) · แพทย์ของบัญชีหลักบน Prod = ดร. วิชัย … เอื้อเฟื้อ
//   TC-007 / 041 / 042 เป็น Canceled ใน Linear แล้ว → ไม่รัน
const PROD = SYSTEM !== 'dev-x';
const STATE_DIR = '.cache/SBH-3181';
const STATE_FILE = PROD ? `${STATE_DIR}/patients-${SYSTEM}.json` : `${STATE_DIR}/patients.json`;
const TRIAGE_SAVED = 'กรอกข้อมูล คัดกรอง ER สำเร็จ';
/** แพทย์ของบัญชีหลัก (รับ Consult ของผู้ป่วย D · ตัวกรองแพทย์ TC-010) */
const CONSULT_DOCTOR = PROD ? { search: 'เอื้อเฟื้อ', name: /วิชัย.*เอื้อเฟื้อ/ } : { search: 'มานะ', name: /ทดสอบ มานะ/ };
/** แพทย์อีกคนของ TC-010 (dev-x ไม่มีผู้ป่วย · Prod = แพทย์ placeholder ของผู้ป่วยอุบัติเหตุหมู่) */
const OTHER_DOCTOR = PROD ? { search: 'ไม่ระบุแพทย์', name: /ไม่ระบุแพทย์/ } : { search: 'มานะ2', name: /ทดสอบ2 มานะ2/ };
const PREP_KEYS = PROD ? 'ABCDE' : 'ABCDEF';
const CANCELED_TC = new Set([7, 41, 42]);

type Key = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
interface Prep {
  level?: 1 | 2 | 3 | 4 | 5;
  zone?: string;
  vitals?: VitalSigns;
  gender?: 'ชาย' | 'หญิง';
  /** วันเกิด ค.ศ. YYYY-MM-DD (ไม่ใส่ = 15 ม.ค. 1990) */
  birth?: string;
  consult?: 'emergency-open' | 'answered';
}
export interface PreparedPatient extends ErVisit {
  key: Key;
  name: string;
  birth: string;
  level: number | null;
  zone: string;
}

/** วันที่ไทยวันนี้ YYYY-MM-DD */
function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date());
}
function shiftDate(iso: string, years: number, months: number, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years, d.getUTCMonth() + months, d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
/** ค.ศ. YYYY-MM-DD → ข้อความที่พิมพ์ในฟอร์มลงทะเบียน ER (DD/MM/พ.ศ.) */
function beInput(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${Number(y) + 543}`;
}

const PREPS: Record<Key, Prep> = {
  A: { level: 1, zone: 'Resuscitation', vitals: VITALS_HIGH_MEWS, consult: 'emergency-open' },
  B: { level: 4, zone: 'Isolation 2', vitals: VITALS_NORMAL },
  C: { level: 5, zone: 'Observation', vitals: VITALS_NORMAL },
  D: { level: 3, zone: 'Urgency', vitals: VITALS_NORMAL, birth: shiftDate(today(), 0, -11, -14), consult: 'answered' },
  E: { level: 4, zone: 'Isolation 1', vitals: VITALS_NORMAL, birth: shiftDate(today(), -1, 0, 0) },
  F: {},
  G: {},
};

export function readPrepared(): PreparedPatient[] {
  if (!fs.existsSync(STATE_FILE)) return [];
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as PreparedPatient[];
}
function savePrepared(list: PreparedPatient[]) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(list, null, 2));
}

/** ปุ่มโซนในฟอร์มคัดกรอง (ชุดล่าง — ชุดบน "ส่งเข้าโซน" ชื่อเดียวกันแต่ disabled) */
function zoneButton(page: Page, zone: string) {
  return erTriagePanel(page).locator('[class*="er-triage-zone-options"] button').filter({ hasText: new RegExp(`^\\s*${zone}`) }).last();
}

async function triage(page: Page, key: Key, prep: Prep) {
  const panel = erTriagePanel(page);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const ok = await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first()).toBeEditable({ timeout: 90_000 }).then(() => true, () => false);
    if (ok && (await page.getByRole('main').getByText('ไม่สามารถแสดงฟอร์มได้').count()) === 0) break;
    console.log(`    ผู้ป่วย ${key}: ฟอร์มคัดกรองโหลดไม่ครบ รอบ ${attempt} → โหลดหน้าใหม่`);
    await page.reload();
  }
  await fillErTriageForm(page, { level: prep.level!, vitals: prep.vitals ?? VITALS_NORMAL });
  const zone = zoneButton(page, prep.zone!);
  await zone.scrollIntoViewIfNeeded();
  if ((await zone.getAttribute('aria-pressed')) !== 'true') await zone.click();
  if (prep.zone === 'Observation') {
    const confirm = page.getByRole('dialog').filter({ hasText: /สังเกตอาการ/ }).getByRole('button', { name: /ยืนยัน/ });
    if (await confirm.isVisible({ timeout: 5_000 }).catch(() => false)) await confirm.click();
  }
  await expect(zone, `โซน ${prep.zone} ต้องถูกเลือก`).toHaveAttribute('aria-pressed', 'true');
  await saveErTriageForm(page, `บันทึกคัดกรอง ผู้ป่วย ${key}`);
  // toast ขึ้นแล้วหายเร็ว (dev-x 3 พ.ย. 2026 ผู้ป่วย A ไม่ทันเห็นใน 30 วินาที ทั้งที่บันทึกสำเร็จ) — API ตอบสำเร็จแล้วถือว่าผ่าน
  await page.getByText(TRIAGE_SAVED, { exact: true }).first().waitFor({ timeout: 10_000 }).catch(() => undefined);
}

test.describe(`SBH-3181 ER Patient List — เตรียม / เก็บกวาดข้อมูล (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 3_600_000 });

  test('เตรียมข้อมูล: ผู้ป่วย AUTO A–F (ESI 1 / 4 / 5 · Isolation 1 / 2 · Observation · อายุ 11 เดือน / 1 ปี · Consult แดง / เขียว)', { tag: ['@P3181-prep'] }, async ({ page, browser }) => {
    const auth = trackAuthorization(page);
    const only = (process.env.SBH3181_PREP ?? PREP_KEYS).split('') as Key[];
    if (PROD && only.some((k) => !PREP_KEYS.includes(k))) throw new Error(`บน ${SYSTEM} ผู้ใช้อนุญาตสร้างเฉพาะ ${PREP_KEYS} (5 ราย)`);
    const list = readPrepared().filter((p) => !only.includes(p.key));
    for (const key of only) {
      const prep = PREPS[key];
      const birth = prep.birth ?? '1990-01-15';
      const patient: NewPatient = { ...newTestPatient(`Pl3181${key}`), gender: prep.gender ?? 'ชาย', birthDate: beInput(birth) };
      // SBH3181_<key>=HN,VN,EN,ชื่อ = ใช้รายเดิมที่ลงทะเบียน + คัดกรองแล้ว (ทำต่อเฉพาะขั้น Consult)
      const reuse = process.env[`SBH3181_${key}`]?.split(',');
      let visit: ErVisit;
      if (key === 'G') {
        // G: แท็บ "ผู้ป่วยระบุตัวตนไม่ได้" (เพศไม่บังคับ — ไม่เลือก) ลงทะเบียน + เปิด Visit ด้วยบัญชี Nurse (ไม่ใช่แพทย์ → ยังไม่มีแพทย์)
        const nurse = await browser.newContext({ storageState: authFile('Nurse'), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
        const np = await nurse.newPage();
        try {
          visit = await test.step('ผู้ป่วย G: ผู้ป่วยระบุตัวตนไม่ได้ (ไม่ระบุเพศ) + เปิด Visit ER ด้วยบัญชี Nurse', async () => {
            await np.goto('/cortex/er/dashboard');
            await openTriagePage(np);
            await np.locator('label').filter({ hasText: 'ผู้ป่วยระบุตัวตนไม่ได้' }).click();
            await np.getByRole('textbox', { name: /ชื่อชั่วคราว/ }).fill(`AUTO ${patient.familyName}`);
            await np.getByRole('spinbutton', { name: /อายุโดยประมาณ/ }).or(np.getByRole('textbox', { name: /อายุโดยประมาณ/ })).first().fill('30');
            const registered = np.waitForResponse((r) => r.request().method() === 'POST' && /registration/.test(r.url()), { timeout: 60_000 });
            await np.getByRole('button', { name: /ลงทะเบียนผู้ป่วย/ }).click();
            const res = await registered;
            await expectOk(res, 'ลงทะเบียนผู้ป่วยระบุตัวตนไม่ได้');
            return confirmOpenErVisit(np, openVisitDialog(np));
          });
        } finally {
          await nurse.close();
        }
        patient.firstName = 'AUTO';
        console.log(`    ผู้ป่วย G: HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      } else if (reuse && reuse.length >= 3) {
        visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
        if (reuse[3]) [patient.firstName, patient.familyName] = reuse[3].split(' ');
        console.log(`    ผู้ป่วย ${key}: ใช้รายเดิม HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      } else {
        visit = await test.step(`ผู้ป่วย ${key}: ลงทะเบียน (วันเกิด ${birth}) + เปิด Visit ER`, async () => {
          await gotoErDashboard(page);
          return registerAndOpenErVisit(page, patient);
        });
        await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
        const res = await page.request.get(`/new-demographic-api/patients?filter[name][startsWith]=${encodeURIComponent(`AUTO ${patient.familyName}`)}`, { headers: { authorization: auth() } });
        const stored = ((await res.json()) as { data?: { birthDate?: string; age?: string }[] }).data?.[0];
        console.log(`    ผู้ป่วย ${key}: HN ${visit.hn} · ${visit.vn} · ${visit.en} · วันเกิดที่บันทึก ${stored?.birthDate} (${stored?.age})`);
        expect.soft(stored?.birthDate, `วันเกิดของผู้ป่วย ${key} ต้องเป็น ${birth}`).toBe(birth);
        if (prep.level) await test.step(`ผู้ป่วย ${key}: คัดกรอง ESI ${prep.level} โซน ${prep.zone}`, () => triage(page, key, prep));
      }
      if (prep.consult === 'emergency-open') {
        await test.step(`ผู้ป่วย ${key}: ส่ง Consult ความเร่งด่วน Emergency (ไม่ตอบ)`, async () => {
          await gotoVisit(page, visit);
          await requestConsult(page, `SBH-3181 Consult Emergency ผู้ป่วย ${key}`, { clinic: 'อายุรกรรม' }, 'er', 'Emergency');
        });
      }
      if (prep.consult === 'answered') {
        await test.step(`ผู้ป่วย ${key}: บัญชี Doctor ส่ง Consult ถึงแพทย์บัญชีหลัก → บัญชีหลักตอบ`, async () => {
          const problem = `SBH-3181 Consult ผู้ป่วย ${key}`;
          const doctor = await openPatientAs(browser, 'Doctor', visit.hn, visit);
          try {
            await requestConsult(doctor, problem, PROD ? { clinic: 'อายุรกรรม', doctor: CONSULT_DOCTOR } : { doctor: CONSULT_DOCTOR });
          } finally {
            await doctor.context().close();
          }
          await gotoVisit(page, visit);
          await replyConsult(page, problem, `ตอบ Consult SBH-3181 ผู้ป่วย ${key}`);
        });
      }
      list.push({ key, ...visit, name: `${patient.firstName} ${patient.familyName}`, birth, level: prep.level ?? null, zone: prep.zone ?? 'Triage' });
      savePrepared(list);
    }
    test.info().annotations.push({ type: 'ผู้ป่วยที่เตรียม', description: list.map((p) => `${p.key} ${p.name} HN ${p.hn} ${p.vn} ${p.en}`).join(' · ') });
  });

  // SBH Prod 6 พ.ย. 2026 — ผู้ใช้ตอบหลังเตรียม A–E: TC-044 / 047 / 048 "สั่ง Lab ให้ผู้ป่วย B" (ไม่ส่งตรวจ / ไม่ลงผล)
  // TC-045: บัญชีหลักตอบ Consult จากหน้าผู้ป่วยไม่ได้ (หน้าต่างไม่มีช่องคำตอบ) → "ให้ใช้ Function ใน OPD ในการตอบกลับ Consult → ผู้ป่วยนอก → รายการปรึกษาแพทย์"
  //   = ตอบคำขอที่บัญชี Doctor ส่งถึง ดร. วิชัย ของผู้ป่วย D (ค้าง รอตอบกลับ ตั้งแต่เทสเตรียม) ด้วย answerConsultFromList
  test('เตรียมข้อมูลเพิ่ม (Prod): ผู้ป่วย B สั่ง Lab · ผู้ป่วย D ตอบ Consult ผ่านรายการปรึกษาแพทย์ OPD', { tag: ['@P3181-prep2'] }, async ({ page }) => {
    test.skip(!PROD, 'เฉพาะ SBH Prod');
    const P = readPrepared();
    const get = (key: Key) => P.find((p) => p.key === key) ?? (() => { throw new Error(`ไม่มีผู้ป่วย ${key} ใน ${STATE_FILE}`); })();
    const steps = (process.env.SBH3181_PREP2 ?? 'BD').split('');
    if (steps.includes('B')) {
      await test.step('ผู้ป่วย B: สั่ง Lab LAB0000001 (ไม่ส่งตรวจ)', async () => {
        await gotoVisit(page, get('B'));
        await submitOrders(page, ['LAB0000001']);
      });
    }
    if (steps.includes('D')) {
      await test.step('ผู้ป่วย D: ตอบ Consult ผ่าน ผู้ป่วยนอก › รายการปรึกษาแพทย์', async () => {
        const d = get('D');
        // แท็บ "รับ Consult" กรองตามหน่วยบริการ OPD ที่เลือกไว้ (graphql targetLocations) — ค่าตั้งต้นของบัญชีหลักไม่ใช่คลินิกอายุรกรรม → ไม่เห็นคำขอ (Prod 6 พ.ย. 2026)
        await selectOpdUnit(page, 'แผนกอายุรกรรม', 'ก่อนตรวจ');
        const { status } = await answerConsultFromList(page, d.hn, `SBH-3181 Consult ผู้ป่วย D`, `ตอบ Consult SBH-3181 ผู้ป่วย D`);
        console.log(`    ผู้ป่วย D: ตอบ Consult แล้ว สถานะ ${status}`);
        expect(status).toBe('completed');
      });
    }
    // ผลรอบแรก: คำขอของ D (ระบุคลินิก + แพทย์ → targetType clinic · targetLocation ว่าง) ไม่ขึ้นในแท็บรับ Consult เลย (กรอง targetLocations [37] ตายตัว)
    // ผู้ใช้ตอบ: "ให้ลองเอา Doctor คนอื่นปรึกษาแพทย์วิชัยรัต แล้วให้แพทย์วิชัยรัต ตอบ Consult โดยไปที่ ผู้ป่วยนอก → รายการแพทย์ปรึกษา → รับ Consult"
    //   → ผู้ป่วย E (ยังไม่มี Consult — ชิปเขียวไม่ปนกับคำขอที่ค้างของ D): บัญชี Doctor ส่งถึง ดร. วิชัย แบบระบุแพทย์อย่างเดียว (แบบ BizSim APM-OPD-004 ที่ตอบผ่านหน้านี้ได้)
    if (steps.includes('E')) {
      const e = get('E');
      const problem = 'SBH-3181 Consult ผู้ป่วย E';
      await test.step('ผู้ป่วย E: บัญชี Doctor ส่ง Consult ถึง ดร. วิชัย (ระบุแพทย์อย่างเดียว)', async () => {
        const doctor = await openPatientAs(page.context().browser()!, 'Doctor', e.hn, e);
        try {
          await requestConsult(doctor, problem, { doctor: CONSULT_DOCTOR });
        } finally {
          await doctor.context().close();
        }
      });
      await test.step('ผู้ป่วย E: ดร. วิชัย ตอบ Consult ที่ ผู้ป่วยนอก › รายการปรึกษาแพทย์ › รับ Consult', async () => {
        const { status } = await answerConsultFromList(page, e.hn, problem, `ตอบ Consult SBH-3181 ผู้ป่วย E`);
        console.log(`    ผู้ป่วย E: ตอบ Consult แล้ว สถานะ ${status}`);
        expect(status).toBe('completed');
      });
    }
  });

  // SBH Prod 6 พ.ย. 2026 — TC-045 รอบ 2: ผู้ใช้ถาม "ใช้ Order ยา สร้างใบยาได้ไหม" → Claude ตรวจโค้ดหน้า: ชิปยาเขียวเมื่อไม่มีรายการค้างห้องยา
  //   (WAITING_RECEIVE / WAITING_REVIEW) และ completedItemCount > 0 — ใบยาที่ยังไม่จ่าย = ส้ม → ผู้ใช้ "ทำเลย 1 ราย"
  //   ผู้ป่วย F (รายที่ 6 · A–E ปิด Visit แล้ว): ลงทะเบียน + Visit ER + คัดกรอง ESI 4 Urgency → One Day Order MED0000619 (ส่งคำสั่ง)
  //   → ห้องยาชั้น 1 สร้างใบยา → การเงินสร้างใบแจ้งหนี้ / รับชำระ → จัดยา → ยืนยันรอจ่าย → จ่ายยา (ขั้นของ BizSim OPD บน Prod)
  //   ทำต่อ: SBH3181_F=HN,VN,EN · SBH3181_MED_FROM=order|rx|pay|dispense · SBH3181_RX=<เลขใบยา>
  test('เตรียมข้อมูล TC-045 (Prod): ผู้ป่วย F สั่งยา → ห้องยาสร้างใบยา → ชำระ → จ่ายยา', { tag: ['@P3181-med'] }, async ({ page }) => {
    test.skip(!PROD, 'เฉพาะ SBH Prod');
    test.setTimeout(1_800_000);
    const MED = 'MED0000619';
    const steps = ['visit', 'order', 'rx', 'pay', 'dispense', 'handout'];
    const from = steps.indexOf(process.env.SBH3181_MED_FROM ?? 'visit');
    const doing = (s: string) => steps.indexOf(s) >= from;
    const list = readPrepared().filter((p) => p.key !== 'F');
    let f = readPrepared().find((p) => p.key === 'F');
    const reuse = process.env.SBH3181_F?.split(',');
    if (reuse && reuse.length >= 3) f = { key: 'F', hn: reuse[0], vn: reuse[1], en: reuse[2], name: f?.name ?? '', birth: '1990-01-15', level: 4, zone: 'Urgency' };
    if (doing('visit') && !(reuse && reuse.length >= 3)) {
      const patient: NewPatient = { ...newTestPatient('Pl3181F'), gender: 'ชาย', birthDate: beInput('1990-01-15') };
      const visit = await test.step('ผู้ป่วย F: ลงทะเบียน + เปิด Visit ER', async () => {
        await gotoErDashboard(page);
        return registerAndOpenErVisit(page, patient);
      });
      f = { key: 'F', ...visit, name: `${patient.firstName} ${patient.familyName}`, birth: '1990-01-15', level: 4, zone: 'Urgency' };
      savePrepared([...list, f]);
      console.log(`    ผู้ป่วย F: HN ${f.hn} · ${f.vn} · ${f.en}`);
      await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
      await test.step('ผู้ป่วย F: คัดกรอง ESI 4 โซน Urgency', () => triage(page, 'F', { level: 4, zone: 'Urgency', vitals: VITALS_NORMAL }));
    }
    if (!f) throw new Error('ไม่มีผู้ป่วย F — ใส่ SBH3181_F=HN,VN,EN');
    savePrepared([...list, f]);
    if (doing('order')) {
      await test.step(`ผู้ป่วย F: One Day Order ${MED} + ส่งคำสั่ง`, async () => {
        await gotoVisit(page, f!);
        const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
        await expect(async () => {
          if (!(await search.isVisible())) await careMenu(page, 'One Day Order', page.getByRole('main').getByRole('heading', { name: 'Order', exact: true }));
          await expect(search).toBeVisible({ timeout: 15_000 });
          await page.waitForTimeout(3_000);
          await expect(search).toBeVisible({ timeout: 1_000 });
        }, 'เปิด One Day Order').toPass({ timeout: 120_000 });
        await addMedicineToCart(page, MED);
        await submitOrders(page, []);
        console.log(`    ผู้ป่วย F: ส่งคำสั่งยา ${MED} แล้ว`);
      });
    }
    let rx = process.env.SBH3181_RX ?? '';
    if (doing('rx')) {
      await test.step('ห้องยาชั้น 1: สร้างใบยา', async () => {
        const res = await createPrescriptionAt(page, f!.hn, MED);
        if (res.allergyAck) console.log(`    หน้าต่างแพ้ยา: ${res.allergyAck.slice(0, 120)}`);
        expect(res.error, `สร้างใบยาไม่สำเร็จ: ${res.error}`).toBeUndefined();
        rx = res.prescriptionId!;
        console.log(`    ผู้ป่วย F: ใบยา ${rx}`);
      });
    }
    expect(rx, 'ต้องมีเลขใบยา (SBH3181_RX)').toBeTruthy();
    if (doing('pay')) {
      await test.step('การเงิน: สร้างใบแจ้งหนี้ / รับชำระค่ายา (ผู้ป่วย Mock)', async () => {
        const items = await chargeItems(page, f!.hn, f!.vn);
        console.log(`    รายการค่าใช้จ่าย: ${items.join(' | ').slice(0, 300)}`);
        if ((await amountDue(page)) > 0) {
          const paid = await payAllInCash(page);
          console.log(`    ชำระเงินสด ${paid.amount.toFixed(2)} (${paid.invoiceId} · ${paid.receiptId})`);
        } else console.log(`    ยอดต้องชำระ 0 → สร้างใบแจ้งหนี้ ${await createInvoicesOnly(page)}`);
      });
    }
    // SBH3181_MED_FROM=handout: จัดยา + ยืนยันรอจ่าย ผ่านแล้ว (Prod 6 พ.ย. 15:53) — แท็บใบรอจ่ายช่องเลขใบยาเป็น "01001" (ไม่มี " - ชื่อ")
    //   ตัวคลิกของ dispensePrescription หาไม่เจอ → จ่ายยาเองจากแท็บนั้น (คลิกช่องเลขที่ใบยา)
    if (doing('dispense') && process.env.SBH3181_MED_FROM !== 'handout') {
      await test.step('ห้องยาชั้น 1: จัดยา → ยืนยันรอจ่าย → จ่ายยา', async () => {
        for (const n of await dispensePrescription(page, f!.hn, rx)) console.log(`    ${n}`);
        console.log(`    ผู้ป่วย F: จ่ายยาใบ ${rx} แล้ว`);
      });
    }
    if (process.env.SBH3181_MED_FROM === 'handout') {
      await test.step('ห้องยาชั้น 1: จัดยาแล้ว → ยืนยันรอจ่าย → จ่ายยา (คลิกช่องเลขที่ใบยา)', async () => {
        const main = page.getByRole('main');
        await gotoPharmacy(page);
        const flow: [RegExp, string, string][] = [
          [/ใบยารอจัด/, 'จัดยาแล้ว', 'pack'],
          [/ใบยาจัดแล้ว/, 'ยืนยันรอจ่าย', 'verify'],
          [/รอจ่าย/, 'จ่ายยา', 'dispense'],
        ];
        for (const [tab, button, action] of flow) {
          if (!/medication-orders|pharmacy/.test(page.url())) await gotoPharmacy(page);
          await main.getByRole('tab', { name: tab }).first().click();
          const row = main.getByRole('row').filter({ hasText: `HN ${f!.hn}` }).first();
          if (!(await row.waitFor({ timeout: 15_000 }).then(() => true, () => false))) {
            console.log(`    แท็บ ${tab.source}: ไม่มีใบยาของ F (ผ่านขั้นนี้ไปแล้ว)`);
            continue;
          }
          await row.locator('td').nth(1).click();
          await page.waitForURL(new RegExp(`prescriptionId=${rx}`), { timeout: 90_000 });
          const btn = page.getByRole('button', { name: button, exact: true }).filter({ visible: true }).first();
          await expect(btn).toBeVisible({ timeout: 60_000 });
          if (action === 'dispense') await main.getByRole('checkbox', { name: 'เลือกยาทั้งหมด' }).check();
          const done = waitForApi(page, 'POST', `/cortex-api/prescriptions/${rx}/${action}`, 60_000);
          await btn.click();
          if (action === 'dispense') {
            const review = page.getByRole('dialog', { name: /ยืนยันการทบทวนก่อนจ่ายยา/ });
            if (await review.waitFor({ timeout: 20_000 }).then(() => true, () => false)) await review.getByRole('button', { name: /^ยืนยัน/ }).click();
          }
          await expectOk(await done, `${button} (${action})`);
          console.log(`    ผู้ป่วย F: ${button} สำเร็จ`);
          await gotoPharmacy(page);
        }
        await main.getByRole('tab', { name: /จ่ายยาแล้ว/ }).click();
        await expect(main.getByRole('row').filter({ hasText: `HN ${f!.hn}` }).first(), 'ใบยาต้องอยู่แท็บ จ่ายยาแล้ว').toBeVisible({ timeout: 60_000 });
        console.log(`    ผู้ป่วย F: จ่ายยาใบ ${rx} แล้ว`);
      });
    }
    await test.step('ตรวจชิปยาในหน้ารายการ (อ่านอย่างเดียว)', async () => {
      await gotoErPatientList(page);
      const row = erListRow(page, f!.en);
      await expect(row).toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(5_000);
      const tone = await row.getByRole('button', { name: 'รายการยาที่ต้องดำเนินการ' }).first().locator('[data-tone]').getAttribute('data-tone');
      console.log(`    ผู้ป่วย F: ชิปยา tone = ${tone}`);
    });
  });

  test('เก็บกวาด: ปิด Visit ผู้ป่วย AUTO A–F ที่การเงิน', { tag: ['@P3181-cleanup'] }, async ({ page }) => {
    for (const p of readPrepared()) {
      const result = await closeVisitAtCashier(page, p.hn, p.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      console.log(`    ${p.key} HN ${p.hn} · ${p.vn} · ${p.en}: ${result}`);
      test.info().annotations.push({ type: 'เก็บกวาด', description: `${p.key} HN ${p.hn} ${p.vn}: ${result}` });
    }
  });
});

// ================================================================================================
// TC — อ่านอย่างเดียวกับข้อมูลผู้ป่วย ยกเว้นการตั้งค่าคอลัมน์ / ตัวกรองโซน (เก็บใน localStorage ของเบราว์เซอร์เทส — คืนค่าเริ่มต้น / ล้าง ท้ายเทส)
// ================================================================================================

/** เลข TC → เลข Issue ของ TC ใน Linear */
const TC_ISSUE: Record<number, number> = {
  1: 3755, 2: 3758, 3: 3761, 4: 3764, 5: 3767, 6: 3770, 7: 3773, 8: 3776, 9: 3779, 10: 3783, 11: 3785, 12: 3788, 13: 3791, 14: 3794, 15: 3797,
  16: 3800, 17: 3804, 18: 3805, 19: 3810, 20: 3811, 21: 3815, 22: 3818, 23: 3756, 24: 3759, 25: 3762, 26: 3766, 27: 3769, 28: 3772, 29: 3775,
  30: 3778, 31: 3781, 32: 3784, 33: 3789, 34: 3790, 35: 3792, 36: 3795, 37: 3801, 38: 3802, 39: 3807, 40: 3809, 41: 3813, 42: 3814, 43: 3817,
  44: 3820, 45: 3757, 46: 3760, 47: 3763, 48: 3765, 49: 3768, 50: 3771, 51: 3774, 52: 3777, 53: 3780, 54: 3782, 55: 3786, 56: 3787, 57: 3793,
  58: 3796, 59: 3798, 60: 3799, 61: 3803, 62: 3806, 63: 3808, 64: 3812, 65: 3816, 66: 3819,
};
const pad = (n: number) => String(n).padStart(3, '0');
const T = (n: number) => `TC-${pad(n)} (SBH-${TC_ISSUE[n]})`;
const tags = (...ns: number[]) => ['@SBH-3181', ...ns.map((n) => `@SBH-${TC_ISSUE[n]}`)];
const clip = (page: Page, n: number) => startClip(page, `TC-${pad(n)}`);

const ZONES = ['Triage', 'Resuscitation', 'Urgency', 'Isolation 1', 'Isolation 2', 'Observation', 'ED Boarding'];
const ESI_CHIPS = ['1 กู้ชีพ', '2 ฉุกเฉิน', '3 เร่งด่วน', '4 กึ่งเร่งด่วน', '5 ไม่เร่งด่วน'];
const ALL_COLUMNS = ['คิว', 'ESI', 'HN', 'AN', 'VN', 'ชื่อ-สกุล', 'อายุ', 'เพศ', 'โซน', 'อาการสำคัญ (CC)', 'Diagnosis', 'Trauma/Non-Trauma', 'MEWS', 'GCS', 'Order', 'ชำระเงิน', 'สิทธิ', 'แพทย์', 'สถานะ'];
const DEFAULT_COLUMNS = ['คิว', 'ESI', 'HN', 'ชื่อ-สกุล', 'อายุ', 'เพศ', 'โซน', 'MEWS', 'GCS', 'Order', 'ชำระเงิน', 'แพทย์', 'สถานะ'];
const ORDER_CHIPS: [string, string][] = [['Lab', 'แจ้งเตือนผล LAB'], ['ยา', 'รายการยาที่ต้องดำเนินการ'], ['IMG', 'รายการ Imaging'], ['หัตถการ', 'สถานะหัตถการ'], ['Consult', 'รายการ Consult']];
const ESI_COLOR: Record<number, string> = { 1: 'แดง', 2: 'ม่วงแดง', 3: 'เหลืองอำพัน', 4: 'เขียว', 5: 'เทา' };
const STATUS_TAB: Record<string, ErListTabKey> = { current_in_er: 'current', bed_waiting: 'bed-waiting', waiting_for_discharge: 'waiting-for-discharge' };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mainOf = (page: Page) => page.getByRole('main');
const summaryButtons = (page: Page) => mainOf(page).locator('button[class*="_summary-button_"]');
const summaryChip = (page: Page, label: string) => summaryButtons(page).filter({ hasText: new RegExp(`^\\s*${esc(label)}`) }).first();
const zoneSelect = (page: Page) => mainOf(page).locator('.ant-select').nth(0);
const doctorSelect = (page: Page) => mainOf(page).locator('.ant-select').nth(1);
const dropdownOptions = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');
const clearAllButton = (page: Page) => mainOf(page).getByRole('button', { name: /ล้าง$/ });
/** ปุ่ม "ล้าง" — ไม่มีตัวกรองค้าง ปุ่ม disabled = ข้าม (ไม่ให้เทสค้างทั้งชุด) */
const clearAll = async (page: Page) => {
  if (await clearAllButton(page).isEnabled()) await clearAllButton(page).click();
};
const clearFiltersButton = (page: Page) => mainOf(page).getByRole('button', { name: 'ล้างตัวกรอง' });
const moreFiltersButton = (page: Page) => mainOf(page).getByRole('button', { name: /ตัวกรองเพิ่มเติม/ });
const columnsButton = (page: Page) => mainOf(page).getByRole('button', { name: /คอลัมน์$/ });
const columnsPanel = (page: Page) => page.locator('.ant-popover:visible').filter({ hasText: 'เลือกและเรียงคอลัมน์' });
const searchBox = (page: Page) => mainOf(page).getByPlaceholder('ค้นหา HN หรือชื่อ');
const tableWrap = (page: Page) => mainOf(page).locator('.ant-table-wrapper').first();
const headerCell = (page: Page, name: string) =>
  tableWrap(page).locator('thead th').filter({ visible: true }).filter({ hasText: new RegExp(`^\\s*${esc(name)}\\s*$`) }).first();
const emptyText = (page: Page) => mainOf(page).locator('.ant-table-placeholder .ant-empty-description').filter({ visible: true });
const boardCard = (page: Page, hn: string) => mainOf(page).locator('.ant-card').filter({ hasText: `HN: ${hn}` }).first();
/** ตารางเทียบในหน้ารายการ: ครึ่งล่างฝั่งขวา (คอลัมน์ Order / ชำระเงิน / แพทย์) — ไม่บังคอลัมน์ ESI / ชื่อ / อายุ / โซน และไม่บังแถวท้ายตาราง */
const LIST_TABLE = { side: 'right' as const, top: '560px', width: '600px' };
/** เลื่อนการ์ดบนบอร์ดมากลางจอ (บอร์ดเลื่อนในกล่องของตัวเอง — window.scrollTo ไม่มีผล) แล้วรอให้นิ่ง */
async function showOnBoard(page: Page, hn: string) {
  await boardCard(page, hn).evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await page.waitForTimeout(600);
}
const panelRow = (page: Page, name: string) => columnsPanel(page).locator('[class*="_row_"]').filter({ has: page.locator('.ant-checkbox-label', { hasText: new RegExp(`^${esc(name)}$`) }) });
const panelCheckbox = (page: Page, name: string) => panelRow(page, name).locator('input[type=checkbox]');

interface Row {
  en: string;
  cells: Record<string, string>;
}
/**
 * ทุกแถวของตาราง — ตารางแบ่งหน้าละ 20 (SBH Prod 6 พ.ย. 2026 มี 32 แถว · หน้าจอบอก "แสดง 32 ราย" แต่ DOM มีแค่หน้าปัจจุบัน)
 * → อ่านหน้าแรก แล้วไล่ปุ่มเลขหน้าจนครบ และกลับไปหน้า 1 (แถวผู้ป่วย A–E อยู่หน้า 1 เพราะเรียงตาม ESI)
 */
/** ไปหน้าที่ n ของตาราง (1 = หน้าแรก) — ไม่มีเลขหน้า / อยู่หน้านั้นแล้ว = ไม่ทำอะไร */
async function gotoTablePage(page: Page, n: number) {
  const item = tableWrap(page).locator('.ant-pagination .ant-pagination-item').nth(Math.max(0, n - 1));
  if (!(await item.count()) || /ant-pagination-item-active/.test((await item.getAttribute('class')) ?? '')) return;
  await item.click();
  await expect(item).toHaveClass(/ant-pagination-item-active/);
  await page.waitForTimeout(400);
}
async function readTable(page: Page): Promise<{ headers: string[]; rows: Row[] }> {
  const items = tableWrap(page).locator('.ant-pagination .ant-pagination-item');
  const n = await items.count();
  if (n > 1) await gotoTablePage(page, 1);
  const first = await readTablePage(page);
  if (n <= 1) return first;
  const rows = [...first.rows];
  for (let i = 1; i < n; i++) {
    await items.nth(i).click();
    await expect(items.nth(i)).toHaveClass(/ant-pagination-item-active/);
    await page.waitForTimeout(400);
    rows.push(...(await readTablePage(page)).rows);
  }
  await items.nth(0).click();
  await expect(items.nth(0)).toHaveClass(/ant-pagination-item-active/);
  await page.waitForTimeout(400);
  return { headers: first.headers, rows };
}
async function readTablePage(page: Page): Promise<{ headers: string[]; rows: Row[] }> {
  return tableWrap(page).evaluate((wrap) => {
    const shown = (el: Element) => (el as HTMLElement).offsetHeight > 0;
    const thead = [...wrap.querySelectorAll('thead')].find(shown);
    const headers = thead ? [...thead.querySelectorAll('th')].filter((th) => !th.classList.contains('ant-table-cell-scrollbar')).map((th) => (th as HTMLElement).innerText.trim()) : [];
    const rows = [...wrap.querySelectorAll('tr.ant-table-row')].filter(shown).map((tr) => {
      const tds = [...tr.querySelectorAll(':scope > td')];
      const cells: Record<string, string> = {};
      headers.forEach((h, i) => {
        cells[h] = ((tds[i] as HTMLElement | undefined)?.innerText ?? '').replace(/\s+/g, ' ').trim();
      });
      return { en: tr.getAttribute('data-row-key') ?? '', cells };
    });
    return { headers, rows };
  });
}
async function readChips(page: Page): Promise<{ label: string; count: number; text: string }[]> {
  return (await summaryButtons(page).allInnerTexts()).map((t) => {
    const text = t.replace(/\s+/g, ' ').trim();
    const m = text.match(/^(.*?)\s*(-|\d+)$/);
    return { label: m?.[1] ?? text, count: m ? Number(m[2]) : NaN, text };
  });
}
const chipCount = async (page: Page, label: string) => (await readChips(page)).find((c) => c.label === label)?.count ?? NaN;
async function tabCount(page: Page, key: ErListTabKey): Promise<number> {
  return Number((await erListTabCount(page, key).innerText()).trim());
}
/** แท็บสถานะอื่น (ไม่ใช่ผู้ป่วยปัจจุบันใน ER) ที่มีผู้ป่วย — ตั้งต้น ผู้ป่วยรอเตียง */
async function otherTab(page: Page): Promise<ErListTabKey> {
  for (const key of ['bed-waiting', 'waiting-for-discharge', 'refer-in', 'sent-to-clinic', 'admitted', 'discharged', 'finished'] as ErListTabKey[]) if ((await tabCount(page, key)) > 0) return key;
  return 'bed-waiting';
}

/** รายการ "Urgency (3)" ของ dropdown โซน */
async function openZoneOptions(page: Page): Promise<{ name: string; count: number }[]> {
  if (!(await dropdownOptions(page).first().isVisible().catch(() => false))) await zoneSelect(page).click();
  await expect(dropdownOptions(page).first()).toBeVisible();
  return (await dropdownOptions(page).allInnerTexts()).map((t) => {
    const m = t.trim().match(/^(.*?)\s*\((\d+)\)$/);
    return { name: m?.[1] ?? t.trim(), count: m ? Number(m[2]) : NaN };
  });
}
async function pickZone(page: Page, zone: string) {
  await openZoneOptions(page);
  const option = dropdownOptions(page).filter({ hasText: new RegExp(`^\\s*${esc(zone)}\\s*\\(`) }).first();
  // ตัวเลือกที่เลือกแล้วมี class ...-option-selected + เครื่องหมายถูก (ไม่มี aria-selected บน div ที่มองเห็น)
  if (!/option-selected/.test((await option.getAttribute('class')) ?? '')) await option.click();
  await expect(option).toHaveClass(/ant-select-item-option-selected/);
}
async function closeDropdown(page: Page) {
  await page.keyboard.press('Escape');
  await page.mouse.move(960, 1050);
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
}
/** ชิปตัวกรองใต้แถบ เช่น "โซน: Urgency ×" (ช่องโซนเองแสดงแค่ "โซน (n)") */
const zoneChip = (page: Page, zone: string) => mainOf(page).getByText(new RegExp(`^\\s*โซน:\\s*${esc(zone)}\\s*$`)).first();
async function selectedZones(page: Page): Promise<string[]> {
  return (await mainOf(page).getByText(/^\s*โซน:\s/).allInnerTexts()).map((t) => t.replace(/^\s*โซน:\s*/, '').trim()).filter(Boolean);
}
/** ปุ่ม × ของชิปตัวกรอง (อยู่ในชิปเอง หรือเป็นพี่น้องถัดไป) */
const chipClose = (chip: Locator) => chip.locator('xpath=ancestor-or-self::*[contains(@class,"tag") or contains(@class,"chip")][1]//*[contains(@class,"close") or @aria-label="close"]').first();

async function switchView(page: Page, view: 'บอร์ด' | 'รายการ') {
  await mainOf(page).locator('label.ant-segmented-item').filter({ hasText: new RegExp(`^\\s*${view}\\s*$`) }).click();
  if (view === 'บอร์ด') await expect(mainOf(page).locator('strong').filter({ hasText: /^Resuscitation$/ }).first()).toBeVisible({ timeout: 60_000 });
  else await expect(erListTab(page, 'current')).toBeVisible({ timeout: 60_000 });
}

/** คอลัมน์ของการ์ดบนบอร์ด = หัวคอลัมน์ที่อยู่ซ้ายสุดใกล้การ์ด (หัวเป็น <strong>) */
async function boardColumnOf(page: Page, hn: string): Promise<string> {
  const card = boardCard(page, hn);
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  const heads = await mainOf(page)
    .locator('strong')
    .evaluateAll((els) => els.map((el) => ({ text: (el as HTMLElement).innerText.trim(), x: el.getBoundingClientRect().left })));
  const names = new Set(['Triage', 'Resuscitation', 'Urgency', 'Zone Isolate', 'Isolation', 'Isolation 1', 'Isolation 2', 'Observation', 'ED Boarding']);
  let found = '-';
  for (const h of heads.filter((x) => names.has(x.text)).sort((a, b) => a.x - b.x)) if (box && h.x <= box.x + 40) found = h.text;
  return found;
}

function rgbOf(c: string) {
  const m = c.match(/[\d.]+/g)?.map(Number) ?? [];
  return { r: m[0] ?? 0, g: m[1] ?? 0, b: m[2] ?? 0, a: m[3] ?? 1 };
}
function colorName(c: string): string {
  const { r, g, b, a } = rgbOf(c);
  if (a === 0) return 'โปร่งใส';
  if (a < 0.9 || (Math.abs(r - g) < 25 && Math.abs(g - b) < 25)) return 'เทา';
  if (r > 200 && g < 90 && b > 110) return 'ม่วงแดง';
  if (r > 200 && g < 110 && b < 110) return 'แดง';
  if (r > 180 && g >= 110 && b < 100) return 'เหลืองอำพัน';
  if (r > 180 && g >= 80 && g < 110 && b < 60) return 'ส้ม';
  if (g > r && g > b) return 'เขียว';
  return c;
}
const css = (target: Locator, prop: string) => target.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

interface QueueEncounter {
  en: string;
  hn: string;
  patientStatus: string;
  triageLevel: number | null;
  practitioner: { id: number; display: string } | null;
  patient: { gender: string | null; firstName: string; familyName: string; age: string };
  clinicalDetails?: { mews?: { score: number | null; riskLevel: string | null } };
}
async function fetchQueue(page: Page, authorization: string): Promise<QueueEncounter[]> {
  const res = await page.request.get('/cortex-api/er/dashboard/encounters?scope=current_queue', { headers: { authorization } });
  await expectOk(res, 'อ่านคิว ER จาก API');
  return (await res.json()) as QueueEncounter[];
}

/** อายุบนตารางเป็นเดือน (เรียงตามอายุ) */
function ageMonths(text: string): number {
  const y = text.match(/(\d+)\s*ปี/);
  const m = text.match(/(\d+)\s*เดือน/);
  if (/<\s*1\s*ปี/.test(text)) return 0.5;
  return (y ? Number(y[1]) * 12 : 0) + (m ? Number(m[1]) : 0);
}
const yearsBetween = (birth: string, on: string) => {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = on.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
};
function isSorted<T>(values: T[], cmp: (a: T, b: T) => number): boolean {
  for (let i = 1; i < values.length; i++) if (cmp(values[i - 1], values[i]) > 0) return false;
  return true;
}

async function logout(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: /^user / }).click();
  await page.getByText(/^(ลงชื่อออก|ออกจากระบบ)$/).filter({ visible: true }).first().click();
  await page.getByRole('button', { name: 'ลงชื่อเข้าใช้' }).or(page.locator('#username')).first().waitFor({ timeout: 60_000 });
}
async function login(page: Page, role: string) {
  const { username, password } = getCredentials(role);
  await page.goto('/cortex/apps');
  const welcome = page.getByRole('button', { name: 'ลงชื่อเข้าใช้' });
  const user = page.locator('#username');
  const inApp = page.getByRole('banner').getByRole('button', { name: /^user / });
  await welcome.or(user).or(inApp).first().waitFor({ timeout: 60_000 });
  if (await inApp.isVisible()) throw new Error(`ยังอยู่ในระบบ (ไม่ได้ Logout) — Login ${role} ไม่ได้`);
  if (await welcome.isVisible()) await welcome.click();
  await user.fill(username);
  await page.locator('#password').evaluate((el, value) => {
    (el as HTMLInputElement).value = value;
  }, password);
  await page.locator('#kc-login').click();
  await page.waitForURL(/\/cortex\//, { timeout: 60_000 });
}

test.describe(`SBH-3181 ER Patient List — TC (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 1_800_000 });
  let P: PreparedPatient[] = [];
  const pat = (key: Key) => {
    const p = P.find((x) => x.key === key);
    if (!p) throw new Error(`ไม่มีผู้ป่วย ${key} ใน ${STATE_FILE}`);
    return p;
  };

  test.beforeEach(async () => {
    P = readPrepared();
    test.skip(P.length < PREP_KEYS.length, `ยังไม่ได้เตรียมผู้ป่วย ${PREP_KEYS} (${STATE_FILE}) — รัน --grep @P3181-prep ก่อน`);
  });

  /** เปิดหน้ารายการ + รอแถวผู้ป่วย A */
  async function openList(page: Page) {
    await gotoErPatientList(page);
    // SBH3181_ANCHOR=F: ผู้ป่วย A–E ปิด Visit แล้ว (Prod 6 พ.ย. — รันซ้ำเฉพาะ TC-045 กับผู้ป่วย F)
    await expect(erListRow(page, pat((process.env.SBH3181_ANCHOR as Key) ?? 'A').en)).toBeVisible({ timeout: 60_000 });
  }

  // ----------------------------------------------------------------------------------------------
  test('แสดงผล / คำเรียกตรงกับบอร์ด: ESI · โซน · เพศ · แพทย์ · สถานะ · อายุ · MEWS', { tag: tags(1, 2, 3, 4, 5, 6, 7, 8, 33, 34, 49, 65, 66) }, async ({ page }) => {
    const { note, soft, finish } = makeRunner(page);
    const auth = trackAuthorization(page);
    await openList(page);
    const queue = await fetchQueue(page, auth());
    // ESI 2 ไม่ได้สร้างเอง — ใช้ผู้ป่วยในคิว (Prod 6 พ.ย. มีเฉพาะในแท็บรอเตียง → อ่านแถวในแท็บของรายนั้น)
    const esi2 = queue.find((e) => e.triageLevel === 2 && e.patientStatus === 'current_in_er') ?? queue.find((e) => e.triageLevel === 2 && STATUS_TAB[e.patientStatus]);
    const esiSet: { hn: string; en: string; level: number; tab?: ErListTabKey }[] = [
      { hn: pat('A').hn, en: pat('A').en, level: 1 },
      ...(esi2 ? [{ hn: esi2.hn, en: esi2.en, level: 2, tab: STATUS_TAB[esi2.patientStatus] }] : []),
      { hn: pat('D').hn, en: pat('D').en, level: 3 },
      { hn: pat('B').hn, en: pat('B').en, level: 4 },
      { hn: pat('C').hn, en: pat('C').en, level: 5 },
    ];

    // TC-001
    await switchView(page, 'บอร์ด');
    await clip(page, 1);
    const boardColor = new Map<string, string>();
    await soft(`${T(1)} ขั้น 1–2 บอร์ด: ป้าย ESI บนการ์ด ESI 1–5`, async () => {
      for (const [i, p] of esiSet.entries()) {
        const badge = boardCard(page, p.hn).locator('[class*="_triage-badge-esi-"]').first();
        await expect(badge, `การ์ด HN ${p.hn} ต้องมีป้าย ESI`).toBeVisible({ timeout: 30_000 });
        boardColor.set(p.hn, await css(badge, 'background-color'));
        await showOnBoard(page, p.hn);
        await markEvidence(expected(boardCard(page, p.hn), `HN ${p.hn}`), expected(badge, `ESI ${p.level} ${colorName(boardColor.get(p.hn)!)}`));
        if (i < esiSet.length - 1) await snapEvidence(page, `บอร์ด — ป้าย ESI ${p.level}`);
      }
    });
    await soft(`${T(1)} ขั้น 3–4 รายการ: คอลัมน์ ESI เป็นป้ายสีตรงกับบอร์ด`, async () => {
      await switchView(page, 'รายการ');
      const rows: CompareRow[] = [];
      const marks = [];
      for (const p of esiSet.filter((x) => !x.tab || x.tab === 'current')) {
        const badge = erListRow(page, p.en).locator('[class*="_esi-badge_"]').first();
        await expect(badge).toBeVisible();
        const bg = await css(badge, 'background-color');
        const text = (await badge.innerText()).trim();
        const board = boardColor.get(p.hn) ?? '-';
        rows.push({ label: `HN ${p.hn}`, values: [`ESI ${text}`, colorName(board), `${colorName(bg)} (${bg})`, ESI_COLOR[p.level]], same: bg === board && colorName(bg) === ESI_COLOR[p.level] && text === String(p.level) });
        marks.push(expected(badge, `ป้าย ESI ${p.level} ${ESI_COLOR[p.level]}`));
      }
      await showCompareTable(page, 'TC-001 ป้าย ESI: บอร์ด / รายการ / สีตาม AC', ['ระดับ', 'สีบนบอร์ด', 'สีในรายการ', 'สีตาม AC'], rows, LIST_TABLE);
      await markEvidence(...marks);
      expect(rows.filter((r) => !r.same).map((r) => r.label), 'ป้าย ESI ทุกระดับต้องเป็นสีเดียวกับบอร์ดและตาม AC').toEqual([]);
    });
    await hideCompareTable(page);
    for (const p of esiSet.filter((x) => x.tab && x.tab !== 'current')) {
      await soft(`${T(1)} ขั้น 3–4 รายการ แท็บ ${ER_LIST_TABS[p.tab!]}: ESI ${p.level} ป้ายสีตรงกับบอร์ด`, async () => {
        await openErListTab(page, p.tab!);
        const badge = erListRow(page, p.en).locator('[class*="_esi-badge_"]').first();
        await expect(badge).toBeVisible({ timeout: 30_000 });
        const bg = await css(badge, 'background-color');
        const text = (await badge.innerText()).trim();
        const board = boardColor.get(p.hn) ?? '-';
        const same = bg === board && colorName(bg) === ESI_COLOR[p.level] && text === String(p.level);
        await showCompareTable(page, `TC-001 ป้าย ESI ${p.level} (แท็บ ${ER_LIST_TABS[p.tab!]})`, ['ระดับ', 'สีบนบอร์ด', 'สีในรายการ', 'สีตาม AC'], [{ label: `HN ${p.hn}`, values: [`ESI ${text}`, colorName(board), `${colorName(bg)} (${bg})`, ESI_COLOR[p.level]], same }], LIST_TABLE);
        await markEvidence(expected(badge, `ป้าย ESI ${p.level} ${ESI_COLOR[p.level]}`));
        expect(same, `ป้าย ESI ${p.level} ต้องเป็นสีเดียวกับบอร์ดและตาม AC`).toBe(true);
      });
      await hideCompareTable(page);
      await openErListTab(page, 'current');
    }

    // TC-002
    await clip(page, 2);
    await soft(`${T(2)} หัวคอลัมน์ระดับคัดกรองชื่อ "ESI"`, async () => {
      const head = headerCell(page, 'ESI');
      await expect(head).toBeVisible();
      await markEvidence(expected(head, 'หัวคอลัมน์ ESI'));
    });

    // TC-003
    await clip(page, 3);
    const listZone = new Map<string, string>();
    await soft(`${T(3)} ขั้น 1–2 คอลัมน์โซนใช้ชื่อมาตรฐาน 7 ชื่อ`, async () => {
      const { rows } = await readTable(page);
      const unknown = rows.filter((r) => !ZONES.includes(r.cells['โซน'])).map((r) => `${r.cells['HN']}: "${r.cells['โซน']}"`);
      for (const p of P) listZone.set(p.hn, rows.find((r) => r.en === p.en)?.cells['โซน'] ?? '(ไม่พบแถว)');
      const compare: CompareRow[] = P.map((p) => ({ label: `${p.key} HN ${p.hn}`, values: [p.zone, listZone.get(p.hn)!], same: listZone.get(p.hn) === p.zone }));
      compare.push({ label: 'ทุกแถว', values: [ZONES.join(' · '), unknown.length ? `ชื่ออื่น: ${unknown.join(' · ')}` : `${rows.length} แถว อยู่ใน 7 ชื่อ`], same: unknown.length === 0 });
      await showCompareTable(page, 'TC-003 คอลัมน์โซน', ['โซนที่คัดกรอง / ชื่อมาตรฐาน', 'คอลัมน์โซนในรายการ'], compare, LIST_TABLE);
      await markEvidence(...P.map((p) => expected(erListRow(page, p.en).locator('[class*="_zone-tag_"]').first(), p.zone)));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);
    await soft(`${T(3)} ขั้น 3 บอร์ด: โซนของ D / E / B ตรงกับรายการ`, async () => {
      await switchView(page, 'บอร์ด');
      const compare: CompareRow[] = [];
      const marks: ReturnType<typeof expected>[] = [];
      for (const key of ['D', 'E', 'B'] as Key[]) {
        const p = pat(key);
        const column = await boardColumnOf(page, p.hn);
        const badge = (await boardCard(page, p.hn).locator('[title="Zone Isolate"]').first().innerText().catch(() => '')).trim();
        const board = column === 'Zone Isolate' ? `Zone Isolate เลข ${badge || '-'}` : column;
        const list = listZone.get(p.hn) ?? '-';
        const same = board === list || (column === 'Zone Isolate' && list === `Isolation ${badge}`);
        compare.push({ label: `${key} HN ${p.hn}`, values: [list, board], same });
        await showOnBoard(page, p.hn);
        await markEvidence(expected(boardCard(page, p.hn), `${key}: คอลัมน์ ${board} · รายการ ${list}`));
        if (key !== 'B') await snapEvidence(page, `บอร์ด — การ์ดผู้ป่วย ${key}`);
        marks.length = 0;
      }
      await showCompareTable(page, 'TC-003 โซน: รายการ / บอร์ด', ['รายการ', 'บอร์ด'], compare, { side: 'left', top: '520px', width: '360px' });
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);

    // TC-004 (อยู่หน้าบอร์ดแล้ว)
    await clip(page, 4);
    await soft(`${T(4)} ขั้น 1–2 บอร์ดไม่ใช้คำ "Zone Isolate"`, async () => {
      await mainOf(page).locator('strong').filter({ hasText: /^Resuscitation$/ }).first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(600);
      const head = mainOf(page).locator('strong').filter({ hasText: /^Zone Isolate$/ });
      const n = await head.count();
      if (n) await markEvidence(expected(head.first(), 'ต้องไม่มีคำ "Zone Isolate" · จริง: ยังแสดงเป็นหัวคอลัมน์'));
      else await markEvidence(expected(mainOf(page).locator('strong').filter({ hasText: /^Isolation/ }).first(), 'ไม่มี Zone Isolate'));
      expect(n, 'บอร์ดต้องไม่มีหัวคอลัมน์ "Zone Isolate"').toBe(0);
    });
    await soft(`${T(4)} ขั้น 3 รายการ: โซนของผู้ป่วย Isolation 1 / 2`, async () => {
      await switchView(page, 'รายการ');
      const e = erListRow(page, pat('E').en).locator('[class*="_zone-tag_"]').first();
      const b = erListRow(page, pat('B').en).locator('[class*="_zone-tag_"]').first();
      await expect(e).toHaveText('Isolation 1');
      await expect(b).toHaveText('Isolation 2');
      await markEvidence(expected(e, 'Isolation 1'), expected(b, 'Isolation 2'));
    });

    // TC-005 / 006 — ผู้ป่วยที่ไม่ทราบเพศ (หาจาก API ตอนรัน)
    const unknownGender = queue.find((e) => !e.patient?.gender && STATUS_TAB[e.patientStatus]);
    if (!unknownGender) {
      note('TC-005 / 006', 'ตรวจไม่ได้ — คิว ER ตอนรันไม่มีผู้ป่วยที่ไม่ระบุเพศ');
    } else {
      note('ผู้ป่วยไม่ระบุเพศ', `HN ${unknownGender.hn} · ${unknownGender.en} · แท็บ ${ER_LIST_TABS[STATUS_TAB[unknownGender.patientStatus]]}`);
      await clip(page, 5);
      await soft(`${T(5)} รายการ: คอลัมน์เพศ "ไม่ระบุเพศ"`, async () => {
        await openErListTab(page, STATUS_TAB[unknownGender.patientStatus]);
        const cell = await erListCell(page, erListRow(page, unknownGender.en), 'เพศ');
        await markEvidence(expected(cell, 'ไม่ระบุเพศ'));
        await expect(cell).toHaveText(/^\s*\S*\s*ไม่ระบุเพศ\s*$/);
      });
      await clip(page, 6);
      await soft(`${T(6)} บอร์ด: การ์ดแสดง "ไม่ระบุเพศ"`, async () => {
        await switchView(page, 'บอร์ด');
        const text = boardCard(page, unknownGender.hn).getByText(/ไม่ระบุเพศ/).first();
        await showOnBoard(page, unknownGender.hn);
        await markEvidence(expected(text, 'ไม่ระบุเพศ'));
        await expect(text).toBeVisible();
      });
      await switchView(page, 'รายการ');
    }

    // TC-007 — ยังไม่มีแพทย์ (practitioner ว่าง) + แถวที่แพทย์ชื่อ "ไม่ระบุแพทย์ ไม่ระบุแพทย์" (Canceled ใน Linear แล้ว → ข้าม)
    if (!CANCELED_TC.has(7)) {
    await clip(page, 7);
    const noDoctor = queue.filter((e) => !e.practitioner?.display?.trim() && STATUS_TAB[e.patientStatus]);
    const placeholderDoctor = queue.filter((e) => /ไม่ระบุแพทย์/.test(e.practitioner?.display ?? '') && STATUS_TAB[e.patientStatus]);
    note('TC-007 ข้อมูล', `practitioner ว่าง ${noDoctor.length} ราย (${noDoctor.map((e) => e.hn).join(', ') || '-'}) · แพทย์ชื่อ "ไม่ระบุแพทย์ ไม่ระบุแพทย์" ${placeholderDoctor.length} ราย (${placeholderDoctor.map((e) => e.hn).join(', ') || '-'})`);
    for (const e of [...noDoctor, ...placeholderDoctor].slice(0, 3)) {
      await soft(`${T(7)} แพทย์ของ HN ${e.hn}: "ยังไม่ระบุแพทย์" 1 ครั้ง สีเทา`, async () => {
        await openErListTab(page, STATUS_TAB[e.patientStatus]);
        const cell = await erListCell(page, erListRow(page, e.en), 'แพทย์');
        const text = (await cell.innerText()).replace(/\s+/g, ' ').trim();
        const color = await cell.locator('*').last().evaluate((el) => getComputedStyle(el).color);
        await markEvidence(expected(cell, `ยังไม่ระบุแพทย์ สีเทา · จริง: ${text} (${colorName(color)})`));
        expect(text, 'คอลัมน์แพทย์ต้องแสดง "ยังไม่ระบุแพทย์" ครั้งเดียว').toBe('ยังไม่ระบุแพทย์');
        expect(colorName(color), 'ตัวอักษรต้องเป็นสีเทา').toBe('เทา');
      });
    }
    if (!noDoctor.length && !placeholderDoctor.length) note('TC-007', 'ตรวจไม่ได้ — ไม่มีผู้ป่วยที่ยังไม่มีแพทย์');
    }

    // TC-008
    await clip(page, 8);
    for (const key of ['current', await otherTab(page)] as ErListTabKey[]) {
      await soft(`${T(8)} แท็บ ${ER_LIST_TABS[key]}: คอลัมน์สถานะไม่มีชื่อโซน`, async () => {
        await openErListTab(page, key);
        await page.waitForTimeout(800);
        const { rows } = await readTable(page);
        const statuses = [...new Set(rows.map((r) => r.cells['สถานะ']))];
        const bad = statuses.filter((s) => ZONES.some((z) => s.includes(z)) || /Zone Isolate|Isolation/.test(s));
        await showCompareTable(page, `TC-008 สถานะในแท็บ ${ER_LIST_TABS[key]}`, ['ค่าที่พบในคอลัมน์สถานะ'], [{ label: `${rows.length} แถว`, values: [statuses.join(' · ') || '(ไม่มีแถว)'], same: bad.length === 0 }], { side: 'left', top: '560px', width: '560px' });
        const head = headerCell(page, 'สถานะ');
        await markEvidence(expected(head, `สถานะ: ${statuses.join(' · ')}`));
        expect(bad).toEqual([]);
      });
      await hideCompareTable(page);
    }
    await openErListTab(page, 'current');

    // TC-033 / 065 / 066 — อายุ
    const day = today();
    await clip(page, 33);
    await soft(`${T(33)} อายุแสดงเป็นปีอย่างเดียว`, async () => {
      const { rows } = await readTable(page);
      const compare: CompareRow[] = [];
      for (const key of ['A', 'B', 'C'] as Key[]) {
        const p = pat(key);
        const shown = rows.find((r) => r.en === p.en)?.cells['อายุ'] ?? '-';
        const want = `${yearsBetween(p.birth, day)} ปี`;
        compare.push({ label: `${key} HN ${p.hn} (เกิด ${p.birth})`, values: [want, shown], same: shown === want });
      }
      const bad = rows.filter((r) => /เดือน|วัน/.test(r.cells['อายุ']) && !/^\d+ เดือน$/.test(r.cells['อายุ']));
      compare.push({ label: 'ทุกแถว (≥ 1 ปี)', values: ['"<ปี> ปี"', bad.length ? bad.map((r) => r.cells['อายุ']).join(' · ') : 'ไม่มีเดือน / วันต่อท้าย'], same: bad.length === 0 });
      await showCompareTable(page, 'TC-033 อายุ (ปีอย่างเดียว)', ['ควรแสดง', 'แสดงจริง'], compare, LIST_TABLE);
      await markEvidence(...(['A', 'B', 'C'] as Key[]).map((k) => expected(erListRow(page, pat(k).en).locator('td').nth(0), '')).slice(0, 0), expected(await erListCell(page, erListRow(page, pat('A').en), 'อายุ'), `A ${compare[0].values[1]}`));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);
    await clip(page, 65);
    await soft(`${T(65)} อายุต่ำกว่า 1 ปีแสดงเป็นเดือน (ผู้ป่วย D)`, async () => {
      const row = erListRow(page, pat('D').en);
      await row.scrollIntoViewIfNeeded();
      const cell = await erListCell(page, row, 'อายุ');
      const text = (await cell.innerText()).trim();
      await markEvidence(expected(row.locator('td').nth(2), `D (เกิด ${pat('D').birth})`), expected(cell, text === '11 เดือน' ? '11 เดือน' : `11 เดือน · จริง: ${text}`));
      expect(text).toBe('11 เดือน');
    });
    await clip(page, 66);
    await soft(`${T(66)} อายุครบ 1 ปีพอดีแสดง "1 ปี" (ผู้ป่วย E)`, async () => {
      expect(pat('E').birth, 'ผู้ป่วย E ต้องเกิดวันนี้ปีก่อน (ห้ามรันคร่อมวัน)').toBe(shiftDate(day, -1, 0, 0));
      const cell = await erListCell(page, erListRow(page, pat('E').en), 'อายุ');
      const text = (await cell.innerText()).trim();
      await markEvidence(expected(cell, text === '1 ปี' ? `1 ปี (เกิด ${pat('E').birth})` : `1 ปี · จริง: ${text}`));
      expect(text).toBe('1 ปี');
    });

    // TC-034 — ทุกแท็บที่มีผู้ป่วย
    await clip(page, 34);
    const ageRows: CompareRow[] = [];
    for (const key of Object.keys(ER_LIST_TABS) as ErListTabKey[]) {
      if ((await tabCount(page, key)) === 0) continue;
      await openErListTab(page, key);
      await page.waitForTimeout(800);
      const { rows } = await readTable(page);
      const bad = rows.filter((r) => /x\s*เดือน|เดือน.*วัน|ปี.*เดือน/.test(r.cells['อายุ']));
      ageRows.push({ label: ER_LIST_TABS[key], values: [`${rows.length} แถว`, bad.length ? bad.map((r) => r.cells['อายุ']).join(' · ') : [...new Set(rows.map((r) => r.cells['อายุ']))].join(' · ')], same: bad.length === 0 });
    }
    await soft(`${T(34)} ทุกแท็บที่มีผู้ป่วย: อายุไม่มี "x เดือน x วัน"`, async () => {
      await showCompareTable(page, 'TC-034 คอลัมน์อายุทุกแท็บที่มีผู้ป่วย', ['จำนวนแถว', 'ค่าอายุที่พบ'], ageRows, LIST_TABLE);
      await markEvidence(expected(headerCell(page, 'อายุ'), 'ไม่มี x เดือน x วัน'));
      expect(ageRows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);
    await openErListTab(page, 'current');

    // TC-049 — MEWS เทียบบอร์ด (A สูง · D ต่ำ)
    await clip(page, 49);
    const mewsList = new Map<string, { text: string; color: string; cls: string }>();
    await soft(`${T(49)} ขั้น 1 รายการ: MEWS ของ A / D`, async () => {
      const marks = [];
      for (const key of ['A', 'D'] as Key[]) {
        const tag = erListRow(page, pat(key).en).locator('[class*="_mews-badge_"] .ant-tag').first();
        await expect(tag).toBeVisible();
        mewsList.set(key, { text: (await tag.innerText()).trim(), color: await css(tag, 'color'), cls: (await tag.getAttribute('class')) ?? '' });
        marks.push(expected(tag, `${key} MEWS ${(await tag.innerText()).trim()}`));
      }
      await markEvidence(...marks);
    });
    await soft(`${T(49)} ขั้น 2 บอร์ด: คะแนน / สี MEWS ตรงกับรายการ`, async () => {
      await switchView(page, 'บอร์ด');
      const compare: CompareRow[] = [];
      const marks = [];
      for (const key of ['A', 'D'] as Key[]) {
        const tag = boardCard(page, pat(key).hn).locator('.ant-tag').filter({ hasText: /^\s*MEWS/ }).first();
        await showOnBoard(page, pat(key).hn);
        const text = (await tag.innerText()).replace(/\s+/g, ' ').trim();
        const color = await css(tag, 'color');
        const list = mewsList.get(key)!;
        const score = text.match(/MEWS\s*(\d+)/)?.[1] ?? '-';
        compare.push({ label: `${key} HN ${pat(key).hn}`, values: [`${list.text} · ${colorName(list.color)}`, `${text} · ${colorName(color)}`], same: score === list.text && color === list.color });
        await markEvidence(expected(tag, `${key} ${text}`));
        if (key === 'A') await snapEvidence(page, 'บอร์ด — MEWS ผู้ป่วย A');
      }
      await showCompareTable(page, 'TC-049 MEWS: รายการ / บอร์ด', ['รายการ', 'บอร์ด'], compare, { side: 'left', top: '520px', width: '360px' });
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);
    finish();
  });

  // ----------------------------------------------------------------------------------------------
  test('ตัวนับด้านบน + ชิป ESI + ตัวเลขแท็บ', { tag: tags(9, 10, 11, 12, 13, 14, 15, 60, 64) }, async ({ page }) => {
    const { soft, finish } = makeRunner(page);
    await openList(page);

    await clip(page, 9);
    for (const key of ['current', await otherTab(page)] as ErListTabKey[]) {
      await soft(`${T(9)} แท็บ ${ER_LIST_TABS[key]}: "ทั้งหมด" = จำนวนแถว`, async () => {
        await openErListTab(page, key);
        await page.waitForTimeout(800);
        const { rows } = await readTable(page);
        const total = await chipCount(page, 'ทั้งหมด');
        const tab = await tabCount(page, key);
        await showCompareTable(page, `TC-009 แท็บ ${ER_LIST_TABS[key]}`, ['ทั้งหมด', 'แถวในตาราง', 'ตัวเลขแท็บ'], [{ label: 'จำนวน', values: [String(total), String(rows.length), String(tab)], same: total === rows.length && tab === rows.length }], { side: 'bottom' });
        await markEvidence(expected(summaryChip(page, 'ทั้งหมด'), `ทั้งหมด ${total}`), expected(erListTab(page, key), `${rows.length} แถว`));
        expect(total).toBe(rows.length);
      });
      await hideCompareTable(page);
    }
    await openErListTab(page, 'current');

    await clip(page, 11);
    await soft(`${T(11)} ชื่อชิป ESI ตามฟอร์มคัดกรอง`, async () => {
      const labels = (await readChips(page)).map((c) => c.label);
      const compare: CompareRow[] = ESI_CHIPS.map((l) => ({ label: l, values: [labels.includes(l) ? l : '(ไม่มี)'], same: labels.includes(l) }));
      compare.push({ label: 'ชิปทั้งหมดบนจอ', values: [labels.join(' · ')], same: true });
      await showCompareTable(page, 'TC-011 ชื่อชิปตัวนับ ESI', ['บนจอ'], compare, { side: 'bottom' });
      await markEvidence(expected(summaryButtons(page).first().locator('xpath=..'), ESI_CHIPS.join(' · ')));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);

    await clip(page, 12);
    await soft(`${T(12)} ไม่มีชิปชื่อ "สังเกตอาการ"`, async () => {
      const texts = (await readChips(page)).map((c) => c.text);
      await markEvidence(expected(summaryButtons(page).first().locator('xpath=..'), texts.some((t) => t.includes('สังเกตอาการ')) ? 'ไม่มีชิป สังเกตอาการ · จริง: มี' : 'ไม่มีชิป "สังเกตอาการ"'));
      expect(texts.filter((t) => t.includes('สังเกตอาการ'))).toEqual([]);
    });

    await clip(page, 13);
    await soft(`${T(13)} ตัวเลขชิป ESI = จำนวนแถวแต่ละระดับ`, async () => {
      const { rows } = await readTable(page);
      const chips = await readChips(page);
      const compare: CompareRow[] = ESI_CHIPS.map((l, i) => {
        const n = rows.filter((r) => r.cells['ESI'] === String(i + 1)).length;
        const c = chips.find((x) => x.label === l)?.count ?? NaN;
        return { label: l, values: [String(c), String(n)], same: c === n };
      });
      await showCompareTable(page, 'TC-013 ชิป ESI vs แถวในตาราง (ผู้ป่วยปัจจุบันใน ER)', ['ตัวเลขบนชิป', 'แถวที่มี ESI นั้น'], compare, { side: 'bottom' });
      await markEvidence(...ESI_CHIPS.map((l) => expected(summaryChip(page, l), '')).slice(0, 0), expected(summaryButtons(page).first().locator('xpath=..'), 'ตัวเลขชิป ESI'), expected(headerCell(page, 'ESI'), ''));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);

    await clip(page, 14);
    const allRows = (await readTable(page)).rows.length;
    await soft(`${T(14)} กดชิป "3 เร่งด่วน" → ตารางเหลือ ESI 3`, async () => {
      const chip = summaryChip(page, '3 เร่งด่วน');
      await markEvidence(clicked(chip, '3 เร่งด่วน'));
      await snapEvidence(page, 'ก่อนกด — ชิป 3 เร่งด่วน');
      await chip.click();
      await expect(chip).toHaveAttribute('aria-pressed', 'true');
      await page.waitForTimeout(800);
      const { rows } = await readTable(page);
      const others = rows.filter((r) => r.cells['ESI'] !== '3');
      await markEvidence(expected(chip, 'ถูกเลือก'), expected(headerCell(page, 'ESI'), `${rows.length} แถว ESI 3 ทั้งหมด`));
      expect(rows.length).toBeGreaterThan(0);
      expect(others.map((r) => r.cells['HN'])).toEqual([]);
    });
    await clip(page, 15);
    await soft(`${T(15)} กดชิป "3 เร่งด่วน" ซ้ำ → ยกเลิกการกรอง`, async () => {
      const chip = summaryChip(page, '3 เร่งด่วน');
      await markEvidence(clicked(chip, 'กดซ้ำ'));
      await snapEvidence(page, 'ก่อนกด — ชิป 3 เร่งด่วน ซ้ำ');
      await chip.click();
      await expect(chip).toHaveAttribute('aria-pressed', 'false');
      await page.waitForTimeout(800);
      const { rows } = await readTable(page);
      const levels = [...new Set(rows.map((r) => r.cells['ESI']))].sort();
      await markEvidence(expected(chip, 'ไม่ถูกเลือก'), expected(headerCell(page, 'ESI'), `${rows.length} แถว ESI ${levels.join(', ')}`));
      expect(rows.length).toBe(allRows);
    });

    await clip(page, 10);
    await soft(`${T(10)} ตัวกรองแพทย์ → ตัวนับเปลี่ยนตาม`, async () => {
      await doctorSelect(page).click();
      await page.keyboard.type(CONSULT_DOCTOR.search);
      const option = dropdownOptions(page).filter({ hasText: CONSULT_DOCTOR.name }).first();
      await expect(option).toBeVisible({ timeout: 20_000 });
      const doctorName = (await option.innerText()).trim();
      await option.click();
      await closeDropdown(page);
      await page.waitForTimeout(1_000);
      const { rows } = await readTable(page);
      const chips = await readChips(page);
      const compare: CompareRow[] = [{ label: 'ทั้งหมด', values: [String(chips.find((c) => c.label === 'ทั้งหมด')?.count), String(rows.length)], same: chips.find((c) => c.label === 'ทั้งหมด')?.count === rows.length }];
      for (const [i, l] of ESI_CHIPS.entries()) {
        const n = rows.filter((r) => r.cells['ESI'] === String(i + 1)).length;
        const c = chips.find((x) => x.label === l)?.count;
        compare.push({ label: l, values: [String(c), String(n)], same: c === n });
      }
      const otherDoctor = rows.filter((r) => !CONSULT_DOCTOR.name.test(r.cells['แพทย์']));
      compare.push({ label: 'แพทย์ในตาราง', values: [doctorName, otherDoctor.length ? `แพทย์อื่น ${otherDoctor.length} แถว` : 'ทุกแถว'], same: otherDoctor.length === 0 });
      await showCompareTable(page, `TC-010 ตัวกรองแพทย์ "${doctorName}"`, ['ตัวนับ', 'แถวในตาราง'], compare, { side: 'bottom' });
      await markEvidence(filled(doctorSelect(page), doctorName), expected(summaryButtons(page).first().locator('xpath=..'), 'ตัวนับตามแพทย์'));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);
    await clearAll(page);
    // ผู้ป่วยทุกรายบน dev-x ตอนรันเป็นของแพทย์คนเดียว → เลือกแพทย์อีกคน (ไม่มีผู้ป่วย) ให้เห็นว่าตัวนับเปลี่ยนตามจริง
    await soft(`${T(10)} ตัวกรองแพทย์คนอื่น → ตัวนับเป็น 0 ตามตาราง`, async () => {
      const before = await chipCount(page, 'ทั้งหมด');
      await doctorSelect(page).click();
      if (PROD) {
        // ช่องแพทย์จำคำค้นของขั้นก่อน ("เอื้อเฟื้อ") — ล้างก่อนพิมพ์ ไม่งั้นคำค้นต่อกันแล้วไม่เจอใคร (Prod 6 พ.ย. 2026 เลือกไม่ติด)
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(OTHER_DOCTOR.search); // virtual list ~250 คน — พิมพ์ค้นก่อน
      }
      const other = dropdownOptions(page).filter({ hasText: OTHER_DOCTOR.name }).first();
      await expect(other).toBeVisible({ timeout: 20_000 });
      const name = (await other.innerText()).trim();
      await other.click();
      await closeDropdown(page);
      await expect(doctorSelect(page), `ตัวกรองแพทย์ต้องเลือก "${name}" ติด`).toContainText(name.split(' ').pop()!);
      await page.waitForTimeout(1_000);
      const { rows } = await readTable(page);
      const total = await chipCount(page, 'ทั้งหมด');
      await showCompareTable(page, `TC-010 ตัวกรองแพทย์ "${name}"`, ['ก่อนกรอง', 'หลังกรอง', 'แถวในตาราง'], [{ label: 'ทั้งหมด', values: [String(before), String(total), String(rows.length)], same: total === rows.length && total !== before }], LIST_TABLE);
      await markEvidence(filled(doctorSelect(page), name), expected(summaryChip(page, 'ทั้งหมด'), `ทั้งหมด ${total}`));
      expect(total).toBe(rows.length);
      expect(total).not.toBe(before);
    });
    await hideCompareTable(page);
    await clearAll(page);

    await clip(page, 60);
    await soft(`${T(60)} ตัวเลขแท็บ 0 ราย สีเทา · มีผู้ป่วยตัวเลขเด่น`, async () => {
      const compare: CompareRow[] = [];
      const marks = [];
      for (const key of Object.keys(ER_LIST_TABS) as ErListTabKey[]) {
        const count = erListTabCount(page, key);
        const n = await tabCount(page, key);
        const color = await css(count, 'color');
        const bg = await css(count, 'background-color');
        const name = colorName(color);
        const same = n === 0 ? name === 'เทา' : name !== 'เทา';
        compare.push({ label: ER_LIST_TABS[key], values: [String(n), `${name} (${color}) พื้น ${colorName(bg)}`], same });
        if (marks.length < 4 && (n === 0 ? marks.length < 2 : true)) marks.push(expected(count, n === 0 ? '0 เทา' : `${n} เด่น`));
      }
      await showCompareTable(page, 'TC-060 สีตัวเลขแท็บ', ['ตัวเลข', 'สีตัวเลข'], compare, { side: 'bottom' });
      await markEvidence(...marks);
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);

    await clip(page, 64);
    await soft(`${T(64)} แท็บที่ไม่มีผู้ป่วย: "ทั้งหมด 0" ชิป ESI เป็น 0`, async () => {
      let zero: ErListTabKey | undefined;
      for (const key of Object.keys(ER_LIST_TABS) as ErListTabKey[]) if ((await tabCount(page, key)) === 0) zero = zero ?? key;
      expect(zero, 'ต้องมีแท็บที่ 0 ราย').toBeTruthy();
      await openErListTab(page, zero!);
      await page.waitForTimeout(800);
      const chips = await readChips(page);
      const compare: CompareRow[] = ['ทั้งหมด', ...ESI_CHIPS].map((l) => ({ label: l, values: [String(chips.find((c) => c.label === l)?.count)], same: chips.find((c) => c.label === l)?.count === 0 }));
      await showCompareTable(page, `TC-064 แท็บ ${ER_LIST_TABS[zero!]} (0 ราย)`, ['ตัวนับ'], compare, { side: 'bottom' });
      await markEvidence(expected(erListTab(page, zero!), 'แท็บ 0 ราย'), expected(summaryButtons(page).first().locator('xpath=..'), 'ทั้งหมด 0 · ESI 0'));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);
    finish();
  });

  // ----------------------------------------------------------------------------------------------
  test('ตัวกรองโซน + ตารางว่าง', { tag: tags(16, 17, 18, 19, 20, 21, 22, 61, 62, 63) }, async ({ page }) => {
    const { soft, finish } = makeRunner(page);
    await openList(page);

    await clip(page, 16);
    await soft(`${T(16)} ขั้น 2 ตัวกรองโซนมี 7 โซน`, async () => {
      const options = await openZoneOptions(page);
      const names = options.map((o) => o.name);
      const compare: CompareRow[] = ZONES.map((z) => ({ label: z, values: [names.includes(z) ? options.find((o) => o.name === z)!.name : '(ไม่มี)'], same: names.includes(z) }));
      compare.push({ label: 'ตัวเลือกทั้งหมด', values: [names.join(' · ')], same: names.length === ZONES.length });
      await showCompareTable(page, 'TC-016 ตัวเลือกโซน', ['ตัวเลือกบนจอ'], compare, { side: 'right', width: '560px', top: '300px' });
      await markEvidence(expected(page.locator('.ant-select-dropdown:visible').first(), '7 โซน'));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);
    await soft(`${T(16)} ขั้น 3 ติ๊ก Urgency + Observation ได้พร้อมกัน`, async () => {
      await pickZone(page, 'Urgency');
      await pickZone(page, 'Observation');
      await closeDropdown(page);
      const selected = await selectedZones(page);
      await markEvidence(expected(zoneSelect(page), `โซน (${selected.length})`), expected(zoneChip(page, 'Urgency'), 'Urgency'), expected(zoneChip(page, 'Observation'), 'Observation'));
      expect(selected).toEqual(expect.arrayContaining(['Urgency', 'Observation']));
    });
    await clearAll(page);
    await expect.poll(() => selectedZones(page)).toEqual([]);

    await clip(page, 17);
    for (const key of ['current', await otherTab(page)] as ErListTabKey[]) {
      await soft(`${T(17)} แท็บ ${ER_LIST_TABS[key]}: ตัวเลขข้างโซน = จำนวนแถว`, async () => {
        await openErListTab(page, key);
        await page.waitForTimeout(800);
        const { rows } = await readTable(page);
        const options = await openZoneOptions(page);
        const compare: CompareRow[] = options.map((o) => {
          const n = rows.filter((r) => r.cells['โซน'] === o.name).length;
          return { label: o.name, values: [String(o.count), String(n)], same: o.count === n };
        });
        await showCompareTable(page, `TC-017 แท็บ ${ER_LIST_TABS[key]}`, ['ตัวเลขในตัวกรอง', 'แถวในตาราง'], compare, { side: 'right', width: '560px', top: '300px' });
        await markEvidence(expected(page.locator('.ant-select-dropdown:visible').first(), 'จำนวนต่อโซน'), expected(erListTab(page, key), ''));
        expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);
      await closeDropdown(page).catch(() => undefined);
    }
    await openErListTab(page, 'current');

    await clip(page, 18);
    await soft(`${T(18)} เลือก Urgency + Isolation 1 → ตารางเฉพาะ 2 โซน`, async () => {
      await pickZone(page, 'Urgency');
      await pickZone(page, 'Isolation 1');
      await closeDropdown(page);
      await page.waitForTimeout(800);
      const { rows } = await readTable(page);
      const zones = [...new Set(rows.map((r) => r.cells['โซน']))];
      await showCompareTable(page, 'TC-018 โซนในตารางหลังกรอง', ['โซนที่พบ'], [{ label: `${rows.length} แถว`, values: [zones.join(' · ')], same: zones.every((z) => ['Urgency', 'Isolation 1'].includes(z)) }], { side: 'bottom' });
      await markEvidence(filled(zoneSelect(page), 'Urgency + Isolation 1'), expected(headerCell(page, 'โซน'), zones.join(' · ')));
      expect(rows.length).toBeGreaterThan(0);
      expect(zones.filter((z) => !['Urgency', 'Isolation 1'].includes(z))).toEqual([]);
    });
    await hideCompareTable(page);
    await clip(page, 19);
    await soft(`${T(19)} ตัวนับด้านบนเปลี่ยนตามโซนที่เลือก`, async () => {
      const { rows } = await readTable(page);
      const chips = await readChips(page);
      const compare: CompareRow[] = [{ label: 'ทั้งหมด', values: [String(chips.find((c) => c.label === 'ทั้งหมด')?.count), String(rows.length)], same: chips.find((c) => c.label === 'ทั้งหมด')?.count === rows.length }];
      for (const [i, l] of ESI_CHIPS.entries()) {
        const n = rows.filter((r) => r.cells['ESI'] === String(i + 1)).length;
        const c = chips.find((x) => x.label === l)?.count;
        compare.push({ label: l, values: [String(c), String(n)], same: c === n });
      }
      await showCompareTable(page, 'TC-019 ตัวนับ (Urgency + Isolation 1)', ['ตัวนับ', 'แถวในตาราง'], compare, { side: 'bottom' });
      await markEvidence(expected(summaryButtons(page).first().locator('xpath=..'), 'นับเฉพาะ 2 โซน'));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);

    await clip(page, 20);
    await soft(`${T(20)} ชิปโซนใต้แถบตัวกรอง ลบทีละอัน`, async () => {
      const urgency = zoneChip(page, 'Urgency');
      const iso = zoneChip(page, 'Isolation 1');
      await expect(urgency).toBeVisible();
      await expect(iso).toBeVisible();
      // Test Step ข้อ 3: ดูชิปทั้ง 2 อัน · ข้อ 4: กด × ที่ชิป Isolation 1 → เหลือ Urgency
      await markEvidence(expected(urgency, (await urgency.innerText()).trim()), expected(iso, (await iso.innerText()).trim()));
      await snapEvidence(page, 'ชิป 2 อันใต้แถบตัวกรอง');
      await markEvidence(clicked(chipClose(iso), 'ลบชิป Isolation 1'));
      await snapEvidence(page, 'ก่อนกด — ลบชิป Isolation 1');
      await chipClose(iso).click();
      await expect(iso).toBeHidden();
      await expect.poll(async () => [...new Set((await readTable(page)).rows.map((r) => r.cells['โซน']))], { timeout: 20_000 }).toEqual(['Urgency']);
      const { rows } = await readTable(page);
      const zones = [...new Set(rows.map((r) => r.cells['โซน']))];
      await markEvidence(expected(urgency, 'เหลือชิป Urgency'), expected(headerCell(page, 'โซน'), `${rows.length} แถว: ${zones.join(' · ')}`));
      expect(zones).toEqual(['Urgency']);
    });

    await clip(page, 21);
    await soft(`${T(21)} ปุ่ม "ล้าง" ลบตัวกรองทั้งหมด`, async () => {
      await pickZone(page, 'Urgency');
      await closeDropdown(page);
      const button = clearAllButton(page);
      await markEvidence(clicked(button, 'ล้าง'));
      await snapEvidence(page, 'ก่อนกด — ล้าง');
      await button.click();
      await expect.poll(() => selectedZones(page)).toEqual([]);
      await page.waitForTimeout(800);
      const { rows } = await readTable(page);
      const tab = await tabCount(page, 'current');
      await markEvidence(expected(zoneSelect(page), 'ไม่มีโซนที่เลือก'), expected(erListTab(page, 'current'), `${rows.length} แถว = ${tab}`));
      expect(rows.length).toBe(tab);
    });

    await clip(page, 61);
    let emptyZone = '';
    await soft(`${T(61)} เลือกโซนที่ 0 ราย → ข้อความ + ปุ่มล้างตัวกรอง`, async () => {
      const options = await openZoneOptions(page);
      emptyZone = options.find((o) => o.count === 0)?.name ?? '';
      expect(emptyZone, 'ต้องมีโซนที่ 0 ราย').not.toBe('');
      await pickZone(page, emptyZone);
      await closeDropdown(page);
      await expect(emptyText(page)).toBeVisible();
      await markEvidence(filled(zoneSelect(page), emptyZone), expected(emptyText(page), (await emptyText(page).innerText()).trim()), expected(clearFiltersButton(page), 'ล้างตัวกรอง'));
      await expect(emptyText(page)).toHaveText('ไม่มีผู้ป่วยในโซนที่เลือก');
      await expect(clearFiltersButton(page)).toBeVisible();
    });
    await clip(page, 62);
    await soft(`${T(62)} กด "ล้างตัวกรอง" ในตารางว่าง`, async () => {
      await markEvidence(clicked(clearFiltersButton(page), 'ล้างตัวกรอง'));
      await snapEvidence(page, 'ก่อนกด — ล้างตัวกรอง');
      await clearFiltersButton(page).click();
      await expect.poll(() => selectedZones(page)).toEqual([]);
      await page.waitForTimeout(800);
      const { rows } = await readTable(page);
      const tab = await tabCount(page, 'current');
      await markEvidence(expected(zoneSelect(page), 'ไม่มีโซนที่เลือก'), expected(erListTab(page, 'current'), `${rows.length} แถว`));
      expect(rows.length).toBe(tab);
    });
    await clearAllButton(page).click().catch(() => undefined);

    await clip(page, 63);
    await soft(`${T(63)} ค้นหา HN ที่ไม่มีในแท็บ → ข้อความตามบริบท`, async () => {
      await searchBox(page).fill('0000001');
      await expect(emptyText(page)).toBeVisible();
      const text = (await emptyText(page).innerText()).trim();
      await markEvidence(filled(searchBox(page), '0000001'), expected(emptyText(page), text), expected(clearFiltersButton(page), 'ล้างตัวกรอง'));
      expect(text).not.toBe('ไม่มีผู้ป่วยในโซนที่เลือก');
      await expect(clearFiltersButton(page)).toBeVisible();
    });
    await searchBox(page).fill('');

    await clip(page, 22);
    await soft(`${T(22)} ขั้น 2 เลือกโซน Urgency`, async () => {
      await pickZone(page, 'Urgency');
      await closeDropdown(page);
      await markEvidence(filled(zoneSelect(page), 'Urgency'));
    });
    await soft(`${T(22)} ขั้น 3 เปิดหน้าผู้ป่วย แล้วกลับเมนูแดชบอร์ด → ยังกรอง Urgency`, async () => {
      await gotoVisit(page, pat('D'));
      await page.waitForTimeout(2_000);
      await markEvidence(expected(mainOf(page).getByText(`HN ${pat('D').hn}`, { exact: true }).first(), 'ไปหน้าผู้ป่วยอื่นแล้ว'));
      await snapEvidence(page, 'ระหว่างทาง — หน้าผู้ป่วย D');
      await openErPatientListFromMenu(page);
      await expect.poll(() => selectedZones(page), { timeout: 30_000 }).toEqual(['Urgency']);
      await expect.poll(async () => [...new Set((await readTable(page)).rows.map((r) => r.cells['โซน']))], { timeout: 30_000 }).toEqual(['Urgency']);
      const { rows } = await readTable(page);
      const zones = [...new Set(rows.map((r) => r.cells['โซน']))];
      await markEvidence(expected(zoneChip(page, 'Urgency'), 'ยังเลือก Urgency'), expected(headerCell(page, 'โซน'), zones.join(' · ')));
      expect(zones).toEqual(['Urgency']);
    });
    await clearAllButton(page).click().catch(() => undefined);
    finish();
  });

  // ----------------------------------------------------------------------------------------------
  test('ค้นหา · ตัวกรองหลัก · เรียงลำดับ · คลิกแถว', { tag: tags(36, 37, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59) }, async ({ page }) => {
    const { soft, finish } = makeRunner(page);
    await openList(page);
    const bar = mainOf(page).locator('div').filter({ has: page.getByPlaceholder('ค้นหา HN หรือชื่อ') }).filter({ has: page.getByRole('button', { name: /ตัวกรองเพิ่มเติม/ }) }).last();

    await clip(page, 52);
    await soft(`${T(52)} แถบตัวกรองหลัก: ค้นหา · โซน · แพทย์ · ตัวกรองเพิ่มเติม`, async () => {
      const selects = await bar.locator('.ant-select').count();
      const text = (await bar.innerText()).replace(/\s+/g, ' ');
      const compare: CompareRow[] = [
        { label: 'ช่องค้นหา', values: [(await searchBox(page).getAttribute('placeholder')) ?? '-'], same: await searchBox(page).isVisible() },
        { label: 'ตัวเลือก (select)', values: [`${selects} ช่อง: ${text.includes('โซน') ? 'โซน' : ''} ${text.includes('แพทย์') ? 'แพทย์' : ''}`], same: selects === 2 && text.includes('โซน') && text.includes('แพทย์') },
        { label: 'ตัวกรองเพิ่มเติม', values: [(await moreFiltersButton(page).innerText()).trim()], same: true },
        { label: 'ตัวกรอง ESI ในแถบ', values: [/ESI|ระดับ/.test(text) ? 'มี' : 'ไม่มี'], same: !/ESI|ระดับ/.test(text) },
      ];
      await showCompareTable(page, 'TC-052 แถบตัวกรองหลัก', ['ที่พบ'], compare, { side: 'bottom' });
      await markEvidence(expected(bar, 'ค้นหา · โซน · แพทย์ · ตัวกรองเพิ่มเติม · ล้าง'));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);

    await clip(page, 36);
    await soft(`${T(36)} แถบหลักไม่มีช่อง "เวลาเริ่ม → ถึง"`, async () => {
      const n = await bar.getByPlaceholder(/เวลาเริ่ม|ถึง/).filter({ visible: true }).count();
      await markEvidence(expected(bar, 'ไม่มีช่องเวลาเริ่ม → ถึง'));
      expect(n).toBe(0);
    });
    await clip(page, 37);
    await soft(`${T(37)} ปุ่ม "ตัวกรองเพิ่มเติม" มีวันที่ + เวลา`, async () => {
      await markEvidence(clicked(moreFiltersButton(page), 'ตัวกรองเพิ่มเติม'));
      await snapEvidence(page, 'ก่อนกด — ตัวกรองเพิ่มเติม');
      await moreFiltersButton(page).click();
      const pop = page.locator('.ant-popover:visible').last();
      await expect(pop).toBeVisible();
      const start = pop.getByPlaceholder(/เวลาเริ่ม/).first();
      await expect(start).toBeVisible();
      await markEvidence(expected(pop, 'วันที่ + เวลาเริ่ม → ถึง'));
    });
    await page.keyboard.press('Escape');
    await mainOf(page).getByText('แดชบอร์ด / คิว').first().click().catch(() => undefined);

    await clip(page, 50);
    await soft(`${T(50)} ค้นหาด้วย HN ของผู้ป่วย A`, async () => {
      await markEvidence(expected(searchBox(page), 'ช่องเดียว "ค้นหา HN หรือชื่อ"'));
      await snapEvidence(page, 'ก่อนกรอก — ช่องค้นหา');
      await searchBox(page).fill(pat('A').hn);
      await expect(mainOf(page).locator('tr.ant-table-row').filter({ visible: true })).toHaveCount(1, { timeout: 15_000 });
      const { rows } = await readTable(page);
      await markEvidence(filled(searchBox(page), pat('A').hn), expected(erListRow(page, pat('A').en), `HN ${rows[0]?.cells['HN']}`));
      expect(rows.map((r) => r.en)).toEqual([pat('A').en]);
    });
    await clip(page, 51);
    await soft(`${T(51)} ค้นหาด้วยชื่อผู้ป่วย B`, async () => {
      const family = pat('B').name.split(' ')[1];
      await searchBox(page).fill(family);
      await expect(mainOf(page).locator('tr.ant-table-row').filter({ visible: true })).toHaveCount(1, { timeout: 15_000 });
      const { rows } = await readTable(page);
      await markEvidence(filled(searchBox(page), family), expected(erListRow(page, pat('B').en), rows[0]?.cells['ชื่อ-สกุล'] ?? ''));
      expect(rows.map((r) => r.en)).toEqual([pat('B').en]);
    });
    await searchBox(page).fill('');
    await page.waitForTimeout(1_000);

    await clip(page, 53);
    await soft(`${T(53)} เรียงเริ่มต้น ESI 1 → 5 แล้วตามคิว`, async () => {
      const { rows } = await readTable(page);
      const keyOf = (r: Row) => [Number(r.cells['ESI']) || 99, r.cells['คิว']] as const;
      const ok = isSorted(rows, (a, b) => keyOf(a)[0] - keyOf(b)[0] || keyOf(a)[1].localeCompare(keyOf(b)[1]));
      await showCompareTable(page, 'TC-053 ลำดับแถวเริ่มต้น', ['ESI · คิว ตามลำดับแถว'], [{ label: `${rows.length} แถว`, values: [rows.map((r) => `${r.cells['ESI'] || '-'}·${r.cells['คิว']}`).join('  ')], same: ok }], { side: 'bottom' });
      await markEvidence(expected(headerCell(page, 'คิว').locator('xpath=..'), 'ESI 1 → 5 แล้วตามคิว'));
      expect(ok).toBe(true);
    });
    await hideCompareTable(page);

    const sorters: [number, string, (r: Row) => number | string | null, (a: never, b: never) => number][] = [
      [54, 'ESI', (r) => (r.cells['ESI'] ? Number(r.cells['ESI']) : null), ((a: number, b: number) => a - b) as never],
      [55, 'ชื่อ-สกุล', (r) => r.cells['ชื่อ-สกุล'], ((a: string, b: string) => a.localeCompare(b, 'th')) as never],
      // Prod: อายุต่ำกว่า 1 ปีแสดง "-" อยู่ท้ายทั้ง 2 ทิศ — BA ยืนยัน 4/11/2569 ให้แสดงได้ (ผู้ใช้ให้ลงผ่านตาม dev-x) → ไม่นับแถว "-" ในการเช็คลำดับ
      [56, 'อายุ', (r) => (PROD && r.cells['อายุ'].trim() === '-' ? null : ageMonths(r.cells['อายุ'])), ((a: number, b: number) => a - b) as never],
      [57, 'MEWS', (r) => (r.cells['MEWS'] ? Number(r.cells['MEWS']) : null), ((a: number, b: number) => a - b) as never],
      [58, 'โซน', (r) => r.cells['โซน'], ((a: string, b: string) => ZONES.indexOf(a) - ZONES.indexOf(b)) as never],
    ];
    for (const [idx, [n, column, value, cmp]] of sorters.entries()) {
      // กลับเป็นค่าเริ่มต้น (เรียงตาม ESI) ก่อนคอลัมน์ถัดไป — โหลดก่อนเริ่มคลิป ไม่ให้คลิปติดจอโหลด
      if (idx > 0) {
        await gotoErPatientList(page);
        await expect(erListRow(page, pat('A').en)).toBeVisible({ timeout: 60_000 });
      }
      await clip(page, n);
      const seen: string[] = [];
      for (let i = 1; i <= 2; i++) {
        await soft(`${T(n)} คลิกหัวคอลัมน์ ${column} ครั้งที่ ${i}`, async () => {
          const head = headerCell(page, column);
          await markEvidence(clicked(head, `${column} ครั้งที่ ${i}`));
          await snapEvidence(page, `ก่อนกด — หัว ${column} ครั้งที่ ${i}`);
          await head.click();
          await page.mouse.move(960, 700); // tooltip ของปุ่มเรียงบังป้าย
          await page.waitForTimeout(800);
          const sort = (await head.getAttribute('aria-sort')) ?? 'none';
          const { rows } = await readTable(page);
          const vals = rows.map(value).filter((v) => v !== null) as never[];
          const alt = column === 'โซน' ? (a: string, b: string) => a.localeCompare(b) : null;
          const dir = sort === 'descending' ? -1 : 1;
          const okMain = isSorted(vals, (a, b) => dir * cmp(a, b));
          const okAlt = alt ? isSorted(vals as string[], (a, b) => dir * alt(a, b)) : false;
          seen.push(sort);
          // TC-056: ไปหน้าที่มีผู้ป่วย D ก่อนขึ้นตารางเทียบ (ตารางเทียบล่างจอบังปุ่มเลขหน้า — Prod 6 พ.ย.)
          if (column === 'อายุ') await gotoTablePage(page, Math.ceil((rows.findIndex((r) => r.en === pat('D').en) + 1) / 20));
          await showCompareTable(page, `TC-${pad(n)} เรียงตาม ${column} (aria-sort ${sort})`, ['ค่าตามลำดับแถว'], [{ label: `ครั้งที่ ${i}`, values: [rows.map((r) => r.cells[column] || '-').join(' · ')], same: (okMain || okAlt) && sort !== 'none' }], { side: 'bottom' });
          const marks = [expected(head, `เรียง ${sort === 'descending' ? 'มาก → น้อย' : 'น้อย → มาก'}`)];
          // TC-056: ชี้แถวผู้ป่วยอายุ 11 เดือน (D) ว่าอยู่ตรงไหนของลำดับ
          if (column === 'อายุ') {
            const pos = rows.findIndex((r) => r.en === pat('D').en) + 1;
            marks.push(expected(await erListCell(page, erListRow(page, pat('D').en), 'อายุ'), `D อายุ 11 เดือน · แสดง "${rows[pos - 1]?.cells['อายุ']}" · แถวที่ ${pos}/${rows.length}`));
          }
          await markEvidence(...marks);
          expect(sort, 'หัวคอลัมน์ต้องอยู่ในสถานะเรียง').not.toBe('none');
          expect(okMain || okAlt, `ตารางต้องเรียงตาม ${column} (${sort})`).toBe(true);
        });
        await hideCompareTable(page);
      }
      await soft(`${T(n)} คลิกซ้ำแล้วสลับทิศ`, async () => {
        await markEvidence(expected(headerCell(page, column), `ครั้งที่ 1: ${seen[0]} · ครั้งที่ 2: ${seen[1]}`));
        expect(new Set(seen).size, 'คลิกครั้งที่ 2 ต้องสลับทิศ').toBe(2);
      });
    }
    await gotoErPatientList(page);
    await expect(erListRow(page, pat('A').en)).toBeVisible({ timeout: 60_000 });
    await clip(page, 59);
    await soft(`${T(59)} คลิกเซลล์อายุของแถว A → เปิดหน้าผู้ป่วย`, async () => {
      await expect(erListRow(page, pat('A').en)).toBeVisible({ timeout: 60_000 });
      const cell = await erListCell(page, erListRow(page, pat('A').en), 'อายุ');
      await markEvidence(clicked(cell, 'คลิกเซลล์อายุ (ไม่ใช่ชื่อ)'));
      await snapEvidence(page, 'ก่อนกด — คลิกแถวผู้ป่วย A');
      await cell.click();
      await expect(page).toHaveURL(new RegExp(`/patients/${pat('A').hn}.*en=${pat('A').en}`), { timeout: 60_000 });
      const hn = mainOf(page).getByText(`HN ${pat('A').hn}`, { exact: true }).first();
      await expect(hn).toBeVisible({ timeout: 90_000 });
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
      await page.waitForTimeout(2_000);
      await markEvidence(expected(hn, `HN ${pat('A').hn}`), expected(mainOf(page).getByText(pat('A').en, { exact: true }).first(), pat('A').en));
    });
    finish();
  });

  // ----------------------------------------------------------------------------------------------
  test('คอลัมน์ Order (ชิป · สี · tooltip · รายละเอียด)', { tag: tags(41, 42, 43, 44, 45, 46, 47, 48) }, async ({ page }) => {
    const { note, soft, finish } = makeRunner(page);
    await openList(page);
    await page.waitForTimeout(3_000); // ชิป Order โหลดตามหลัง (tone "unavailable/loading" ก่อน)

    async function chip(en: string, aria: string) {
      const button = erListRow(page, en).getByRole('button', { name: aria }).first();
      const info = await button.evaluate((btn) => {
        const toned = btn.querySelector('[data-tone]') as HTMLElement | null;
        const all = [toned, ...(toned ? [...toned.querySelectorAll('*')] : [])].filter(Boolean) as HTMLElement[];
        const painted = all.map((el) => getComputedStyle(el)).find((s) => s.backgroundColor !== 'rgba(0, 0, 0, 0)');
        const bordered = all.map((el) => getComputedStyle(el)).find((s) => s.borderStyle !== 'none' && s.borderWidth !== '0px');
        return { tone: toned?.dataset.tone ?? '', detail: toned?.dataset.detail ?? '', bg: painted?.backgroundColor ?? 'rgba(0, 0, 0, 0)', border: bordered ? `${bordered.borderStyle} ${bordered.borderColor}` : '-', text: (btn as HTMLElement).innerText.trim() };
      });
      return { button, ...info };
    }
    const { rows } = await readTablePage(page); // แถวที่อยู่บนจอ (หน้า 1) — ชิปของแถวหน้าอื่นไม่อยู่ใน DOM

    // TC-041 / 042 Canceled ใน Linear แล้ว → ข้าม
    if (!CANCELED_TC.has(41)) {
    await clip(page, 41);
    await soft(`${T(41)} ทุกแถวมีชิป Order 5 ชนิด`, async () => {
      const compare: CompareRow[] = [];
      for (const r of rows) {
        const found: string[] = [];
        for (const [name, aria] of ORDER_CHIPS) if ((await erListRow(page, r.en).getByRole('button', { name: aria }).count()) > 0) found.push(name);
        compare.push({ label: `HN ${r.cells['HN']}`, values: [found.join(' · '), r.cells['Order'] || '(ไม่มีตัวอักษร)'], same: found.length === 5 });
      }
      await showCompareTable(page, 'TC-041 ชิป Order ต่อแถว', ['ชิปที่พบ (aria-label)', 'ตัวอักษรบนชิป'], compare, { side: 'bottom' });
      await markEvidence(expected(headerCell(page, 'Order'), '5 ชิปต่อแถว'), expected(await erListCell(page, erListRow(page, pat('A').en), 'Order'), 'Lab · ยา · IMG · หัตถการ · Consult'));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);
    note('TC-041 ข้อสังเกต', `ชิป Order บนจอเป็นไอคอน ตัวอักษรในเซลล์ Order: "${rows[0]?.cells['Order'] ?? ''}"`);
    }

    if (!CANCELED_TC.has(42)) {
    await clip(page, 42);
    await soft(`${T(42)} มีคำอธิบายสี (legend) ใต้ตาราง`, async () => {
      const text = await mainOf(page).evaluate((el) => {
        const table = el.querySelector('.ant-table-wrapper') as HTMLElement | null;
        return (el as HTMLElement).innerText.replace(table?.innerText ?? '', '');
      });
      const words = ['ไม่มีรายการ', 'รอดำเนินการ', 'เสร็จแล้ว'];
      const missing = words.filter((w) => !text.includes(w));
      await mainOf(page).locator('.ant-pagination').first().scrollIntoViewIfNeeded().catch(() => undefined);
      await markEvidence(expected(mainOf(page).locator('.ant-pagination').first(), `ต้องมี legend ใต้ตาราง · จริง: ${missing.length ? 'ไม่มี' : 'มี'}`));
      expect(missing, 'ใต้ตารางต้องมีคำอธิบายสีชิป Order').toEqual([]);
    });
    }

    // หาแถวตามสถานะชิป
    const findChip = async (aria: string, tone: string) => {
      for (const r of rows) {
        const c = await chip(r.en, aria);
        if (c.tone === tone) return { row: r, ...c };
      }
      return undefined;
    };

    await clip(page, 43);
    await soft(`${T(43)} ชิป IMG ที่ไม่มีรายการเป็นเส้นขอบเทา`, async () => {
      const c = await findChip('รายการ Imaging', 'none');
      expect(c, 'ต้องมีแถวที่ชิป IMG ไม่มีรายการ').toBeTruthy();
      await c!.button.hover();
      const tip = page.locator('.ant-tooltip:visible').last();
      await markEvidence(expected(c!.button, `IMG ไม่มีรายการ · พื้น ${colorName(c!.bg)} · ขอบ ${c!.border}`));
      note('TC-043 ค่าจริง', `HN ${c!.row.cells['HN']} · tone ${c!.tone} · พื้น ${c!.bg} · ขอบ ${c!.border} · tooltip "${(await tip.innerText().catch(() => '')).replace(/\s+/g, ' ')}"`);
      expect(['เทา', 'โปร่งใส']).toContain(colorName(c!.bg));
    });

    await clip(page, 44);
    await page.mouse.move(960, 1050); // ให้ tooltip ของขั้นก่อนหาย
    await page.waitForTimeout(500);
    let pendingLab: Awaited<ReturnType<typeof findChip>>;
    await soft(`${T(44)} ชิป Lab รอดำเนินการเป็นสีส้ม`, async () => {
      pendingLab = await findChip('แจ้งเตือนผล LAB', 'pending');
      expect(pendingLab, 'ต้องมีแถวที่ Lab รอดำเนินการ').toBeTruthy();
      await markEvidence(expected(pendingLab!.button, `Lab รอดำเนินการ · ${colorName(pendingLab!.bg)} (${pendingLab!.bg})`));
      expect(['ส้ม', 'เหลืองอำพัน']).toContain(colorName(pendingLab!.bg));
    });

    await clip(page, 45);
    await page.mouse.move(960, 1050); // ให้ tooltip ของขั้นก่อนหาย
    await page.waitForTimeout(500);
    // Prod: Consult ตอบไม่ได้ (SBH-3914) → ใช้ชิปยาของผู้ป่วย F ที่ห้องยาจ่ายยาแล้ว (@P3181-med) · dev-x: Consult ที่ตอบแล้วของ D
    const greenKey: Key = PROD ? 'F' : 'D';
    const greenChip = PROD ? { aria: 'รายการยาที่ต้องดำเนินการ', what: 'ยา (ห้องยาจ่ายแล้ว)' } : { aria: 'รายการ Consult', what: 'Consult ตอบแล้ว' };
    await soft(`${T(45)} ชิป ${greenChip.what} เป็นสีเขียว (ผู้ป่วย ${greenKey})`, async () => {
      const c = await chip(pat(greenKey).en, greenChip.aria);
      await c.button.hover();
      const tip = page.locator('.ant-tooltip:visible').last();
      await tip.waitFor({ timeout: 5_000 }).catch(() => undefined);
      note('TC-045 ค่าจริง', `ผู้ป่วย ${greenKey} · ${greenChip.aria} · tone ${c.tone} · พื้น ${c.bg} · tooltip "${(await tip.innerText().catch(() => '')).replace(/\s+/g, ' ')}"`);
      await markEvidence(expected(c.button, `${greenChip.what} · ${colorName(c.bg)}`));
      expect(c.tone).toBe('done');
      expect(colorName(c.bg)).toBe('เขียว');
    });

    await clip(page, 46);
    await page.mouse.move(960, 1050); // ให้ tooltip ของขั้นก่อนหาย
    await page.waitForTimeout(500);
    await soft(`${T(46)} ชิป Consult Emergency เป็นสีแดง (ผู้ป่วย A)`, async () => {
      const c = await chip(pat('A').en, 'รายการ Consult');
      const lab = await findChip('แจ้งเตือนผล LAB', 'critical');
      note('TC-046 ข้อมูล', `Lab ผลผิดปกติ (tone critical) ในตาราง: ${lab ? `HN ${lab.row.cells['HN']}` : 'ไม่มี'} → ใช้ Consult ความเร่งด่วน Emergency ของผู้ป่วย A แทน`);
      await markEvidence(expected(c.button, `Consult Emergency · ${colorName(c.bg)} (${c.bg})`));
      expect(c.tone).toBe('critical');
      expect(colorName(c.bg)).toBe('แดง');
    });

    await clip(page, 47);
    await page.mouse.move(960, 1050); // ให้ tooltip ของขั้นก่อนหาย
    await page.waitForTimeout(500);
    await soft(`${T(47)} Hover ชิป Lab → tooltip ชื่อ order + สถานะ`, async () => {
      expect(pendingLab, 'ต้องมีแถวที่ Lab รอดำเนินการ').toBeTruthy();
      await pendingLab!.button.hover();
      const tip = page.locator('.ant-tooltip:visible').last();
      await expect(tip).toBeVisible();
      const text = (await tip.innerText()).replace(/\s+/g, ' ').trim();
      await markEvidence(expected(tip, text), expected(pendingLab!.button, ''));
      expect(text).toMatch(/Lab/);
      expect(text).toMatch(/รอดำเนินการ/);
    });

    await clip(page, 48);
    await page.mouse.move(960, 1050); // ให้ tooltip ของขั้นก่อนหาย
    await page.waitForTimeout(500);
    await soft(`${T(48)} คลิกชิป Lab → เปิดรายละเอียด`, async () => {
      expect(pendingLab, 'ต้องมีแถวที่ Lab รอดำเนินการ').toBeTruthy();
      await markEvidence(clicked(pendingLab!.button, 'ชิป Lab'));
      await snapEvidence(page, 'ก่อนกด — ชิป Lab');
      await pendingLab!.button.click();
      const detail = page.locator('.ant-popover:visible, .ant-modal:visible, .ant-drawer-open').last();
      await expect(detail).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(1_500);
      await markEvidence(expected(detail, 'รายละเอียด Lab'));
      await expect(page).toHaveURL(/view=list/);
    });
    await page.keyboard.press('Escape');
    finish();
  });

  // ----------------------------------------------------------------------------------------------
  test('ตั้งค่าคอลัมน์ + 1366 px + หัวตาราง / คอลัมน์ค้าง + บันทึกต่อผู้ใช้', { tag: tags(23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 35, 38, 39, 40) }, async ({ page }) => {
    const { note, soft, finish } = makeRunner(page);
    await openList(page);
    const headers = async () => (await readTablePage(page)).headers.filter(Boolean); // หัวตารางอย่างเดียว — อ่านทุกหน้า (กดเลขหน้า) จะปิดแผงคอลัมน์ที่เปิดอยู่
    const openPanel = async () => {
      if (!(await columnsPanel(page).isVisible().catch(() => false))) await columnsButton(page).click();
      await expect(columnsPanel(page)).toBeVisible();
    };
    const closePanel = async () => {
      // แผงเป็น popover แบบคลิก — คลิกพื้นที่ว่าง (หัวหน้า "แดชบอร์ด / คิว") ให้ปิด · กดปุ่มซ้ำตอนกำลังปิดจะเปิดกลับ
      await expect(async () => {
        if (await columnsPanel(page).isVisible().catch(() => false)) await mainOf(page).getByText('แดชบอร์ด / คิว').first().click();
        await expect(columnsPanel(page)).toBeHidden({ timeout: 3_000 });
      }).toPass({ timeout: 20_000 });
      await page.mouse.move(960, 1050);
    };
    const panelNames = async () => (await columnsPanel(page).locator('.ant-checkbox-label').allInnerTexts()).map((t) => t.trim());
    const setColumn = async (name: string, on: boolean) => {
      const box = panelCheckbox(page, name);
      if ((await box.isChecked()) !== on) await panelRow(page, name).locator('label').click();
      if (on) await expect(box).toBeChecked();
      else await expect(box).not.toBeChecked();
    };

    await clip(page, 23);
    await soft(`${T(23)} ปุ่ม "คอลัมน์" ไอคอนเฟือง มุมขวาบนของตาราง`, async () => {
      const button = columnsButton(page);
      await expect(button).toBeVisible();
      const b = (await button.boundingBox())!;
      const t = (await tableWrap(page).boundingBox())!;
      const gear = await button.locator('[aria-label="setting"], .anticon-setting').count();
      await markEvidence(expected(button, `คอลัมน์ ${gear ? '+ เฟือง' : '(ไม่เห็นไอคอนเฟือง)'}`));
      expect(gear, 'ต้องมีไอคอนเฟือง').toBeGreaterThan(0);
      expect(b.x + b.width, 'อยู่ชิดขวาของตาราง').toBeGreaterThan(t.x + t.width - 120);
      expect(b.y, 'อยู่เหนือตาราง').toBeLessThan(t.y + 10);
    });

    await clip(page, 31);
    await soft(`${T(31)} แผงคอลัมน์มี 19 รายการตาม AC`, async () => {
      await openPanel();
      const names = await panelNames();
      const compare: CompareRow[] = ALL_COLUMNS.map((c) => ({ label: c, values: [names.includes(c) ? '✓ มี' : '(ไม่มี)'], same: names.includes(c) }));
      const extra = names.filter((n) => !ALL_COLUMNS.includes(n));
      compare.push({ label: 'รวม', values: [`${names.length} รายการ${extra.length ? ` · เกิน: ${extra.join(', ')}` : ''}`], same: names.length === 19 && !extra.length });
      await showCompareTable(page, 'TC-031 รายการคอลัมน์ในแผง', ['ในแผง'], compare, { side: 'left', width: '620px' });
      await markEvidence(expected(columnsPanel(page), `${names.length} รายการ`));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);

    await clip(page, 26);
    await soft(`${T(26)} คิว / ESI / ชื่อ-สกุล ล็อก ซ่อนไม่ได้`, async () => {
      await openPanel();
      const marks = [];
      for (const name of ['คิว', 'ESI', 'ชื่อ-สกุล']) {
        const box = panelCheckbox(page, name);
        await expect(box).toBeChecked();
        await expect(box).toBeDisabled();
        await expect(panelRow(page, name).getByText('ล็อก', { exact: true })).toBeVisible();
        marks.push(expected(panelRow(page, name), `${name} ติ๊ก + ล็อก`));
      }
      await markEvidence(...marks);
    });

    await clip(page, 35);
    await soft(`${T(35)} ไม่มีคอลัมน์ "เวลารอ" / "เวลารับเข้า" (แผง + ตาราง)`, async () => {
      await openPanel();
      const names = await panelNames();
      const heads = await headers();
      const bad = [...names, ...heads].filter((n) => /เวลารอ|เวลารับเข้า/.test(n));
      await markEvidence(expected(columnsPanel(page), 'ไม่มีเวลารอ / เวลารับเข้า'), tableWrap(page).locator('thead').filter({ visible: true }).first() /* หัวตาราง: กรอบไม่มีป้าย — ป้าย 2 อันทับกัน (Prod 6 พ.ย.) */);
      expect(bad).toEqual([]);
    });
    await closePanel();

    await clip(page, 32);
    const initial = await headers();
    await soft(`${T(32)} คอลัมน์เริ่มต้น 13 คอลัมน์`, async () => {
      const compare: CompareRow[] = DEFAULT_COLUMNS.map((c) => ({ label: c, values: [initial.includes(c) ? `ลำดับที่ ${initial.indexOf(c) + 1}` : '(ไม่มี)'], same: initial.includes(c) }));
      const extra = initial.filter((h) => !DEFAULT_COLUMNS.includes(h));
      compare.push({ label: 'หัวตารางจริง', values: [`${initial.length}: ${initial.join(' · ')}${extra.length ? ` · เกิน ${extra.join(', ')}` : ''}`], same: initial.length === 13 && !extra.length });
      await showCompareTable(page, 'TC-032 คอลัมน์เริ่มต้น', ['ในตาราง'], compare, { side: 'bottom' });
      await markEvidence(expected(tableWrap(page).locator('thead').filter({ visible: true }).first(), `${initial.length} คอลัมน์`));
      expect(compare.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
    });
    await hideCompareTable(page);

    await clip(page, 24);
    await soft(`${T(24)} เอาเครื่องหมาย "เพศ" ออก → คอลัมน์หาย`, async () => {
      await openPanel();
      await markEvidence(clicked(panelRow(page, 'เพศ'), 'เอาออก'));
      await snapEvidence(page, 'ก่อนกด — เอาเพศออก');
      await setColumn('เพศ', false);
      await expect(headerCell(page, 'เพศ')).toBeHidden();
      await markEvidence(expected(panelRow(page, 'เพศ'), 'ไม่ติ๊ก'), expected(tableWrap(page).locator('thead').filter({ visible: true }).first(), 'ไม่มีคอลัมน์เพศ'));
    });
    await soft(`${T(24)} ติ๊ก "เพศ" กลับ → คอลัมน์กลับมา`, async () => {
      await setColumn('เพศ', true);
      await expect(headerCell(page, 'เพศ')).toBeVisible();
      await markEvidence(expected(panelRow(page, 'เพศ'), 'ติ๊ก'), expected(headerCell(page, 'เพศ'), 'เพศกลับมา'));
    });

    await clip(page, 25);
    await soft(`${T(25)} เลื่อน "โซน" ขึ้น 1 ครั้ง`, async () => {
      await openPanel();
      const before = await panelNames();
      const up = columnsPanel(page).getByRole('button', { name: 'เลื่อน โซน ขึ้น' });
      await markEvidence(clicked(up, 'เลื่อนโซนขึ้น'));
      await snapEvidence(page, 'ก่อนกด — เลื่อนโซนขึ้น');
      await up.click();
      const after = await panelNames();
      const heads = await headers();
      const i = before.indexOf('โซน');
      const wantPanel = [...before];
      [wantPanel[i - 1], wantPanel[i]] = [wantPanel[i], wantPanel[i - 1]];
      const shownBefore = wantPanel.filter((n) => heads.includes(n));
      await showCompareTable(page, 'TC-025 ลำดับหลังเลื่อนโซนขึ้น', ['ลำดับ'], [
        { label: 'แผง', values: [after.join(' · ')], same: after.join() === wantPanel.join() },
        { label: 'ตาราง', values: [heads.join(' · ')], same: heads.indexOf('โซน') < heads.indexOf(before[i - 1]) || !heads.includes(before[i - 1]) },
      ], { side: 'left', width: '620px' });
      await markEvidence(expected(panelRow(page, 'โซน'), `โซนขึ้นเหนือ ${before[i - 1]}`), expected(headerCell(page, 'โซน'), ''));
      expect(after).toEqual(wantPanel);
      expect(heads.filter((h) => shownBefore.includes(h))).toEqual(shownBefore.filter((h) => heads.includes(h)));
    });
    await hideCompareTable(page);
    await soft(`${T(25)} เลื่อน "โซน" ลง 1 ครั้ง (กลับที่เดิม)`, async () => {
      const down = columnsPanel(page).getByRole('button', { name: 'เลื่อน โซน ลง' });
      await markEvidence(clicked(down, 'เลื่อนโซนลง'));
      await snapEvidence(page, 'ก่อนกด — เลื่อนโซนลง');
      await down.click();
      const heads = await headers();
      await markEvidence(expected(panelRow(page, 'โซน'), 'กลับที่เดิม'), expected(headerCell(page, 'โซน'), ''));
      expect(heads).toEqual(initial);
    });

    await clip(page, 27);
    await soft(`${T(27)} ขั้น 2 เอาเพศออก · ติ๊ก VN · เลื่อนโซนขึ้น`, async () => {
      await openPanel();
      await setColumn('เพศ', false);
      await setColumn('VN', true);
      await columnsPanel(page).getByRole('button', { name: 'เลื่อน โซน ขึ้น' }).click();
      const reset = columnsPanel(page).getByRole('button', { name: /คืนค่าเริ่มต้น/ });
      await markEvidence(expected(tableWrap(page).locator('thead').filter({ visible: true }).first(), 'ตั้งค่าแล้ว'), clicked(reset, 'คืนค่าเริ่มต้น'));
      await snapEvidence(page, 'ก่อนกด — คืนค่าเริ่มต้น');
      expect(await headers()).not.toEqual(initial);
    });
    await soft(`${T(27)} ขั้น 3 กด "คืนค่าเริ่มต้น" → 13 คอลัมน์เดิม`, async () => {
      await columnsPanel(page).getByRole('button', { name: /คืนค่าเริ่มต้น/ }).click();
      await expect.poll(headers).toEqual(initial);
      await markEvidence(expected(tableWrap(page).locator('thead').filter({ visible: true }).first(), 'คอลัมน์เริ่มต้น 13 คอลัมน์'));
    });

    await clip(page, 30);
    await soft(`${T(30)} ขั้น 2 ติ๊ก AN · เอาเพศออก`, async () => {
      await openPanel();
      await setColumn('AN', true);
      await setColumn('เพศ', false);
      await closePanel();
      await markEvidence(expected(headerCell(page, 'AN'), 'มี AN'));
    });
    for (const key of ['bed-waiting', 'waiting-for-discharge', 'finished'] as ErListTabKey[]) {
      await soft(`${T(30)} แท็บ ${ER_LIST_TABS[key]}: คอลัมน์ตามที่ตั้ง`, async () => {
        await openErListTab(page, key);
        await page.waitForTimeout(800);
        const heads = (await headers()).filter((h) => h !== 'จัดการ');
        await markEvidence(expected(tableWrap(page).locator('thead').filter({ visible: true }).first(), `${ER_LIST_TABS[key]}: มี AN · ไม่มีเพศ`));
        expect(heads).toContain('AN');
        expect(heads).not.toContain('เพศ');
      });
    }
    await openErListTab(page, 'current');
    await openPanel();
    await columnsPanel(page).getByRole('button', { name: /คืนค่าเริ่มต้น/ }).click();
    await closePanel();

    await clip(page, 40);
    await soft(`${T(40)} ขั้น 2 เพิ่มคอลัมน์จนตารางกว้างกว่าจอ`, async () => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await openPanel();
      for (const name of ['AN', 'VN', 'อาการสำคัญ (CC)', 'Diagnosis', 'Trauma/Non-Trauma', 'สิทธิ']) await setColumn(name, true);
      await closePanel();
      const scroller = tableWrap(page).locator('.ant-table-content, .ant-table-body').first();
      const size = await scroller.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
      await markEvidence(expected(tableWrap(page).locator('thead').filter({ visible: true }).first(), `ตารางกว้าง ${size.sw} > จอ ${size.cw}`));
      expect(size.sw).toBeGreaterThan(size.cw);
    });
    await soft(`${T(40)} ขั้น 3 เลื่อนขวาสุด → คิว / ESI / ชื่อ-สกุล ค้างซ้าย`, async () => {
      const scroller = tableWrap(page).locator('.ant-table-content, .ant-table-body').first();
      const xs = async () => Promise.all(['คิว', 'ESI', 'ชื่อ-สกุล', 'HN'].map(async (h) => (await headerCell(page, h).boundingBox())?.x ?? -1));
      const before = await xs();
      await scroller.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
      await page.waitForTimeout(800);
      const after = await xs();
      await showCompareTable(page, 'TC-040 ตำแหน่ง x ของหัวคอลัมน์ ก่อน / หลังเลื่อนขวาสุด', ['ก่อน', 'หลัง'], ['คิว', 'ESI', 'ชื่อ-สกุล', 'HN (ไม่ตรึง)'].map((h, i) => ({ label: h, values: [String(Math.round(before[i])), String(Math.round(after[i]))], same: i < 3 ? Math.abs(before[i] - after[i]) < 2 : after[i] !== before[i] })), { side: 'right', width: '520px', top: '420px' });
      await markEvidence(expected(headerCell(page, 'คิว'), 'ค้าง'), expected(headerCell(page, 'ESI'), 'ค้าง'), expected(headerCell(page, 'ชื่อ-สกุล'), 'ค้าง'));
      for (let i = 0; i < 3; i++) expect(Math.abs(before[i] - after[i])).toBeLessThan(2);
    });
    await hideCompareTable(page);
    await openPanel();
    await columnsPanel(page).getByRole('button', { name: /คืนค่าเริ่มต้น/ }).click();
    await closePanel();

    await clip(page, 38);
    await soft(`${T(38)} จอ 1366 px: 13 คอลัมน์ ไม่มีเลื่อนแนวนอน`, async () => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(1_000);
      const scroller = tableWrap(page).locator('.ant-table-content, .ant-table-body').first();
      const size = await scroller.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
      const heads = await headers();
      const right = (await headerCell(page, 'สถานะ').boundingBox()) ?? { x: 9999, width: 0 };
      await showCompareTable(page, 'TC-038 จอกว้าง 1366 px', ['ค่า'], [
        { label: 'คอลัมน์', values: [`${heads.length}: ${heads.join(' · ')}`], same: heads.length === 13 },
        { label: 'ความกว้างตาราง', values: [`scrollWidth ${size.sw} / clientWidth ${size.cw}`], same: size.sw <= size.cw },
        { label: 'ขอบขวาคอลัมน์สถานะ', values: [`${Math.round(right.x + right.width)} px (จอ 1366)`], same: right.x + right.width <= 1366 },
      ], { side: 'bottom' });
      await markEvidence(expected(tableWrap(page).locator('thead').filter({ visible: true }).first(), '13 คอลัมน์พอดีจอ'));
      expect(heads.length).toBe(13);
      expect(size.sw).toBeLessThanOrEqual(size.cw);
    });
    await hideCompareTable(page);

    await clip(page, 39);
    await soft(`${T(39)} เลื่อนลง → หัวตารางค้างด้านบน`, async () => {
      await page.setViewportSize({ width: 1366, height: 520 });
      await page.waitForTimeout(800);
      const head = tableWrap(page).locator('thead').filter({ visible: true }).first();
      const firstRow = mainOf(page).locator('tr.ant-table-row').filter({ visible: true }).first();
      const hb = (await head.boundingBox())!;
      const rb = (await firstRow.boundingBox())!;
      await page.mouse.move(600, 420);
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(1_000);
      const ha = (await head.boundingBox())!;
      const ra = (await firstRow.boundingBox())!;
      await showCompareTable(page, 'TC-039 ตำแหน่ง y ก่อน / หลังเลื่อนลง', ['ก่อน', 'หลัง'], [
        { label: 'หัวตาราง', values: [String(Math.round(hb.y)), String(Math.round(ha.y))], same: ha.y >= 0 && ha.y < 520 },
        { label: 'แถวแรก', values: [String(Math.round(rb.y)), String(Math.round(ra.y))], same: ra.y < rb.y },
      ], { side: 'right', width: '420px', top: '200px' });
      await markEvidence(expected(head, 'หัวตารางยังอยู่บนจอ'));
      expect(ra.y, 'ตารางต้องเลื่อนลงได้').toBeLessThan(rb.y);
      expect(ha.y).toBeGreaterThanOrEqual(0);
    });
    await hideCompareTable(page);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.mouse.wheel(0, -3000);

    // TC-028 / 029 — Logout / Login (การตั้งค่าเก็บใน localStorage ต่อผู้ใช้ของเบราว์เซอร์)
    await clip(page, 28);
    await soft(`${T(28)} ขั้น 2 ติ๊ก Diagnosis · เอา GCS ออก`, async () => {
      await openPanel();
      await setColumn('Diagnosis', true);
      await setColumn('GCS', false);
      await closePanel();
      await markEvidence(expected(headerCell(page, 'Diagnosis'), 'มี Diagnosis · ไม่มี GCS'));
    });
    const prefs = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('er-patient-list-prefs')));
    note('ที่เก็บการตั้งค่า', `localStorage: ${prefs.join(', ') || '(ไม่พบ key)'}`);
    await soft(`${T(28)} ขั้น 3 Logout → Login ผู้ใช้เดิม → ยังเป็นค่าที่ตั้ง`, async () => {
      await logout(page);
      await login(page, 'Super_User');
      await gotoErPatientList(page);
      await expect(erListRow(page, pat('A').en)).toBeVisible({ timeout: 60_000 }); // หลัง Login แอปโหลดใหม่ ~20 วิ — รอตารางขึ้นก่อนตีกรอบ (Prod 6 พ.ย. ภาพจอขาว)
      await page.waitForTimeout(1_500);
      const heads = await headers();
      await markEvidence(expected(tableWrap(page).locator('thead').filter({ visible: true }).first(), 'หลัง Login ใหม่: มี Diagnosis · ไม่มี GCS'));
      expect(heads).toContain('Diagnosis');
      expect(heads).not.toContain('GCS');
    });

    await clip(page, 29);
    await soft(`${T(29)} Logout → Login ผู้ใช้ B (Doctor) → คอลัมน์เริ่มต้น`, async () => {
      await logout(page);
      await login(page, 'Doctor');
      await gotoErPatientList(page);
      await expect(erListRow(page, pat('A').en)).toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(1_500);
      const user = (await page.getByRole('banner').getByRole('button', { name: /^user / }).innerText()).replace(/\s+/g, ' ').trim();
      const heads = await headers();
      await markEvidence(expected(page.getByRole('banner').getByRole('button', { name: /^user / }), `ผู้ใช้ B: ${user}`), expected(tableWrap(page).locator('thead').filter({ visible: true }).first(), 'คอลัมน์เริ่มต้น'));
      expect(heads).toEqual(initial);
    });

    // กลับเป็น Super_User + คืนค่าเริ่มต้น + เก็บ session ใหม่ (session เดิมถูก Logout แล้ว)
    await logout(page).catch(() => undefined);
    await login(page, 'Super_User');
    await gotoErPatientList(page);
    await openPanel();
    await columnsPanel(page).getByRole('button', { name: /คืนค่าเริ่มต้น/ }).click();
    await closePanel();
    await page.context().storageState({ path: authFile('Super_User') });
    finish();
  });
});
