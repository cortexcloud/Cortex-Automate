import { type Locator, type Page } from '@playwright/test';
import { dismissToast, expectOk, expectTriageFormOpen, gotoErDashboard, openErMenu, showDashboardCard, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import { fetchBoardEncounters, fetchWaitTimeSettings, restoreWaitTimeSettings, today, type BoardEncounter, type WaitTimeSetting } from '../../../helpers/functions/er-quality';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { ESI_BUTTON, saveButton, triageForm } from '../../../helpers/functions/er-triage';
import {
  alerted,
  checkStep,
  clicked,
  expected,
  filled,
  hideCompareTable,
  holdForClip,
  markEvidence,
  showCompareTable,
  snapEvidence,
  type CompareRow,
  type EvidenceMark,
} from '../../../helpers/functions/evidence';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, recordMockPatient, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, fillTriage, gotoVisit, saveTriageForm } from '../../../mock-data/uat-play';

// SBH-1329 [ER][Triage] Display ระยะเวลารอคอยของแต่ละระดับความรุนแรง — AC: นับเวลาตั้งแต่เปิด Visit ถึงบันทึก Triage Level · แจ้งเตือนเมื่อถึงเกณฑ์ของแต่ละระดับ (Setting)
// ชุด EXE SBH-1796 → SC-001 SBH-1797 (TC-001 SBH-1799) · SC-002 SBH-1798 (TC-002 SBH-1800 · TC-003 SBH-1801) → 1 เทส 1 flow ผู้ป่วย 2 รายเปิด Visit ต่อกัน (R9)
//   ผู้ป่วย A → Triage ESI 3 (เกณฑ์ยาว) · ผู้ป่วย B → Triage ESI 2 (เกณฑ์สั้น)
// พฤติกรรมของบอร์ดรุ่นที่ตรวจ (ไฟล์แอป Prod index--5LY8N__.js · getErWaitTime — 14 ต.ค. 2026):
//   ยังไม่ Triage → "รอคัดกรอง m:ss นาที" นับจาก arrivedAt (เปิด Visit) ไม่มี warning
//   Triage แล้ว → "รอ m:ss นาที" นับใหม่จาก triagedAt ถึง startedTreatmentAt (ยังไม่ Acknowledge = ถึงตอนนี้) · เกิน waitTimeLimitSeconds ของระดับนั้น → "เกินเป้าหมาย …"
//   ค่า เปิด Visit → บันทึก Triage (Expected ของ TC-001) จึงไม่แสดงบนบอร์ดแล้ว — ผู้ใช้ให้ลงผลตามจริง + ข้อสังเกต ไม่เปลี่ยนสถานะ TC-001 (14 ต.ค. 2026)
// ตั้งค่าเวลารอตรวจ: ปรับ ฉุกเฉิน (ESI 2) / เร่งด่วน (ESI 3) ให้สั้นชั่วคราว แล้วคืนค่าเดิมผ่านหน้าจอท้ายเทส (afterEach คืนผ่าน API ถ้าพัง) — ผู้ใช้เลือก 14 ต.ค. 2026
// ข้อมูล: ผู้ป่วย AUTO ใหม่ 2 ราย + Visit ER สิทธิ UC **ทิ้ง Visit ไว้** (ผู้ใช้เลือก 14 ต.ค. 2026)
// รัน (SBH Prod — ผู้ใช้อนุญาต 14 ต.ค. 2026): npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep @SBH-1329

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC1 = 'TC-001 (SBH-1799)';
const TC2 = 'TC-002 (SBH-1800)';
const TC3 = 'TC-003 (SBH-1801)';
/** ระดับ A (เกณฑ์ยาว) / B (เกณฑ์สั้น) และเกณฑ์ชั่วคราว (นาที) */
const LEVEL_A = 3;
const LEVEL_B = 2;
const TEMP_MINUTES: Record<number, number> = { [LEVEL_B]: 2, [LEVEL_A]: 10 };
/** TC-001 ขั้น 3: รอก่อน Triage เท่านี้ (วินาที) */
const WAIT_BEFORE_TRIAGE = 60;
/** รอให้เวลาหลัง Triage ของ B เกินเกณฑ์ไปอีกเท่านี้ (วินาที) */
const PAST_B_SECONDS = 30;
/** ลำดับแถวในหน้าตั้งค่า (กู้ชีพ → ไม่เร่งด่วน) = ESI 1–5 */
const ESI_NAMES = ['กู้ชีพ', 'ฉุกเฉิน', 'เร่งด่วน', 'กึ่งเร่งด่วน', 'ไม่เร่งด่วน'];

/** การ์ดผู้ป่วยบนบอร์ด ER (ทุกคอลัมน์) = div ชั้นในสุดที่มี HN และป้ายเวลารอ ("รอคัดกรอง m:ss นาที" / "รอ m:ss นาที") */
function boardCard(page: Page, hn: string): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByText(`HN: ${hn}`, { exact: true }) })
    .filter({ hasText: /รอ(คัดกรอง)? [\d:]+ นาที/ })
    .last();
}
const waitLabel = (card: Locator) => card.getByText(/^รอ(คัดกรอง)? [\d:]+ นาที$/);
const warning = (card: Locator) => card.getByRole('alert').filter({ hasText: /เกินเป้าหมาย|ถึงเวลาเป้าหมาย/ });

/** "รอ 2:27 นาที" → วินาที */
function labelSeconds(text: string): number {
  const [minutes, seconds] = text.match(/([\d]+):(\d{2}) นาที/)!.slice(1).map(Number);
  return minutes * 60 + seconds;
}
const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const sinceSeconds = (iso: string) => (Date.now() - Date.parse(iso)) / 1000;

test.describe(`SBH-1329 เวลารอคอยของแต่ละระดับความรุนแรง (${SYSTEM})`, () => {
  // ลงทะเบียน 2 ราย + รอก่อน Triage + Triage 2 ราย + รอเกินเกณฑ์ + ตั้งค่า 2 รอบ
  test.describe.configure({ timeout: 900_000 });

  let original: WaitTimeSetting[] | undefined;
  let settingsChanged = false;
  let restoreAuth: (() => string) | undefined;

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page);
    // ตั้งค่าเวลารอตรวจใช้ร่วมกันทั้งโรงพยาบาล — เทสพังก่อนคืนค่าผ่านหน้าจอ ให้คืนผ่าน API (R29 ข้อ 1)
    if (!settingsChanged || !original || !restoreAuth) return;
    await restoreWaitTimeSettings(page, restoreAuth(), original);
    test.info().annotations.push({ type: 'คืนค่าตั้งค่าเวลารอตรวจ', description: `คืนผ่าน API หลังเทสพัง: ${JSON.stringify(original)}` });
    console.log(`    คืนค่าตั้งค่าเวลารอตรวจผ่าน API แล้ว: ${JSON.stringify(original)}`);
    settingsChanged = false;
  });

  test(
    'ผู้ป่วย AUTO 2 ราย: นับเวลารอจากเปิด Visit · Triage ESI 3 / ESI 2 แล้วรอเกินเกณฑ์ของ ESI 2 — warning ตามเกณฑ์ของแต่ละระดับ (Super_User)',
    { tag: ['@SBH-1329', '@SBH-1799', '@SBH-1800', '@SBH-1801'], annotation: [linear('SBH-1329'), linear('SBH-1796')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      restoreAuth = authorization;
      const main = page.getByRole('main');
      const visits = {} as Record<'A' | 'B', ErVisit>;
      const enc = {} as Record<'A' | 'B', BoardEncounter>;
      const board = async (en: string): Promise<BoardEncounter> => {
        let found: BoardEncounter | undefined;
        // SBH Prod ตัดการเชื่อมต่อเป็นพักๆ → ลองอ่านซ้ำ
        await expect(async () => {
          found = (await fetchBoardEncounters(page, authorization(), today())).find((e) => e.en === en);
          expect(found, `API บอร์ดต้องมี ${en}`).toBeTruthy();
        }).toPass({ timeout: 60_000, intervals: [3_000] });
        return found!;
      };

      /** หน้า ตั้งค่าเวลารอตรวจ: ใส่นาทีของ ESI ที่ให้มา แล้วบันทึก → คืน items ที่ระบบบันทึก */
      const saveSettings = async (minutes: Record<number, number>, snapName: string): Promise<WaitTimeSetting[]> => {
        await openErMenu(page, 'ตั้งค่า', 'ตั้งค่าเวลารอตรวจ');
        await expect(page).toHaveURL(/er-triage-wait-time-targets/);
        await expect(main.getByRole('strong')).toHaveText(ESI_NAMES);
        const inputs: Locator[] = [];
        for (const [level, value] of Object.entries(minutes)) {
          const input = main.getByRole('spinbutton').nth(Number(level) - 1);
          await expect(input).toBeEnabled();
          await input.fill(String(value));
          await expect(input).toHaveValue(String(value));
          inputs.push(input);
        }
        const save = main.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' });
        await expect(save).toBeEnabled();
        await markEvidence(...inputs.map(filled), clicked(save));
        await holdForClip(page);
        await snapEvidence(page, snapName);
        const saved = waitForApi(page, 'PATCH', '/cortex-api/er/triage/wait-time-settings');
        await save.click();
        const res = await saved;
        await expectOk(res, 'บันทึกตั้งค่าเวลารอตรวจ');
        const items = ((await res.json()) as { items: WaitTimeSetting[] }).items;
        for (const [level, value] of Object.entries(minutes)) {
          expect(items.find((s) => s.level === Number(level))?.limitSeconds, `ESI ${level} ต้องบันทึกเป็น ${value} นาที`).toBe(value * 60);
        }
        const toast = page.getByText('บันทึกการตั้งค่าเวลารอตรวจแล้ว');
        const marks: EvidenceMark[] = inputs.map(expected);
        if (await toast.isVisible()) marks.push(alerted(toast));
        await markEvidence(...marks);
        await holdForClip(page);
        return items;
      };

      /** เปิดบอร์ด ER ใหม่ → เลื่อนให้เห็นการ์ดของ HN นี้ */
      const showCard = async (hn: string): Promise<Locator> => {
        await gotoErDashboard(page);
        await showDashboardCard(page, hn);
        const card = boardCard(page, hn);
        await expect(card).toBeVisible();
        return card;
      };

      /** หน้า Visit → กรอกฟอร์มคัดกรอง ระดับ `level` → บันทึก */
      const triage = async (visit: ErVisit, level: 2 | 3, label: string) => {
        await gotoVisit(page, visit);
        await expectTriageFormOpen(page, visit);
        // SBH Prod: ข้อมูล Encounter โหลดไม่สำเร็จเป็นพักๆ ปุ่ม GCS กดไม่ได้ค้างอยู่ → เปิดหน้าใหม่
        const gcs = triageForm(page).getByRole('button', { name: 'เลือกคะแนน' }).first();
        let rounds = 0;
        await expect(async () => {
          if (rounds++) {
            await gotoVisit(page, visit);
            await expectTriageFormOpen(page, visit);
          }
          if (await gcs.count()) await expect(gcs).toBeEnabled({ timeout: 10_000 });
        }, 'ฟอร์มคัดกรองต้องพร้อมให้กรอก').toPass({ timeout: 150_000 });
        await fillTriage(page, visit, { level, vitals: VITALS_NORMAL });
        await markEvidence(filled(triageForm(page).getByRole('button', { name: ESI_BUTTON[level] })), clicked(saveButton(page)));
        await holdForClip(page);
        await snapEvidence(page, `ก่อนกด — บันทึก Triage ${label} ESI ${level}`);
        await saveTriageForm(page, visit);
        await expect(main.getByText('Clinical Summary', { exact: true }), 'บันทึก Triage แล้วหน้าต้องเปลี่ยนเป็น Overview').toBeVisible({ timeout: 60_000 });
        await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
      };

      await test.step('เตรียม: เปิด ER Dashboard + จดค่าตั้งค่าเวลารอตรวจเดิม', async () => {
        await gotoErDashboard(page);
        original = await fetchWaitTimeSettings(page, authorization());
        await test.info().attach('ค่าตั้งค่าเวลารอตรวจเดิม', { body: JSON.stringify(original, null, 2), contentType: 'application/json' });
        test.info().annotations.push({ type: 'ตั้งค่าเวลารอตรวจเดิม', description: original.map((s) => `ESI ${s.level} ${s.limitSeconds === null ? 'ไม่จำกัด' : `${s.limitSeconds / 60} นาที`}`).join(' · ') });
        for (const level of [LEVEL_A, LEVEL_B]) expect(original.find((s) => s.level === level)?.limitSeconds, `ESI ${level} ต้องมีเวลาจำกัดอยู่ก่อน (เทสคืนค่าเป็นนาที)`).not.toBeNull();
      });

      await checkStep(page, `${TC2} ขั้น 1 · ${TC3} ขั้น 1 ตั้งค่าเวลารอตรวจ ฉุกเฉิน (ESI ${LEVEL_B}) ${TEMP_MINUTES[LEVEL_B]} นาที · เร่งด่วน (ESI ${LEVEL_A}) ${TEMP_MINUTES[LEVEL_A]} นาที`, async () => {
        settingsChanged = true;
        await saveSettings(TEMP_MINUTES, 'ก่อนกด — บันทึกตั้งค่าเวลารอตรวจชั่วคราว');
      });

      for (const key of ['A', 'B'] as const) {
        await checkStep(page, `${TC1} ขั้น 1 · ${TC2} ขั้น 2 · ${TC3} ขั้น 2 เปิด Visit ER ให้ผู้ป่วยรายใหม่ ${key}`, async () => {
          await gotoErDashboard(page);
          const patient = newTestPatient(`Wait1329${key}`);
          const visit = await registerAndOpenErVisit(page, patient);
          visits[key] = visit;
          const state = `SBH-1329 ผู้ป่วย ${key} · เปิด Visit ER สิทธิ UC + Triage ESI ${key === 'A' ? LEVEL_A : LEVEL_B} (ทิ้ง Visit ไว้)`;
          if (SYSTEM === 'sbh-prod') recordMockPatient('SBH-1329', patient, visit, state);
          else console.log(`    ผู้ป่วย ${key}: ${patient.firstName} ${patient.familyName} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
          test.info().annotations.push({ type: `ผู้ป่วย ${key}`, description: `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });
          await expectTriageFormOpen(page, visit);
          await markEvidence(...[`HN ${visit.hn}`, visit.en].map((text) => expected(main.getByText(text, { exact: true }).filter({ visible: true }).first())));
          await holdForClip(page);
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
        });
      }

      await checkStep(page, `${TC1} ขั้น 2 บอร์ด ER: ตัวนับ รอคัดกรอง เริ่มจากเวลาเปิด Visit (arrivedAt) · ยังไม่ Triage ไม่มี warning`, async () => {
        for (const key of ['A', 'B'] as const) {
          enc[key] = await board(visits[key].en);
          const card = await showCard(visits[key].hn);
          const text = await waitLabel(card).innerText();
          const elapsed = sinceSeconds(enc[key].arrivedAt);
          expect(text, `ผู้ป่วย ${key}: ยังไม่ Triage ต้องแสดง รอคัดกรอง`).toMatch(/^รอคัดกรอง /);
          expect(Math.abs(labelSeconds(text) - elapsed), `ผู้ป่วย ${key}: ${text} ต้องใกล้กับเวลาตั้งแต่เปิด Visit ${mmss(elapsed)}`).toBeLessThanOrEqual(15);
          await expect(warning(card), `ผู้ป่วย ${key}: ยังไม่ Triage ต้องไม่มี warning`).toHaveCount(0);
          await markEvidence(expected(card), expected(waitLabel(card)));
          await holdForClip(page);
        }
      });

      await checkStep(page, `${TC1} ขั้น 3 รอโดยยังไม่บันทึก Triage (${WAIT_BEFORE_TRIAGE} วินาทีหลังเปิด Visit ผู้ป่วย B)`, async () => {
        const until = Date.parse(enc.B.arrivedAt) + WAIT_BEFORE_TRIAGE * 1000;
        const card = boardCard(page, visits.B.hn);
        while (Date.now() < until) await page.waitForTimeout(Math.min(10_000, until - Date.now()));
        await showCard(visits.B.hn);
        await markEvidence(expected(waitLabel(card)));
        await holdForClip(page);
      });

      await checkStep(page, `${TC1} ขั้น 4 · ${TC3} บันทึก Triage ผู้ป่วย A เป็น ESI ${LEVEL_A}`, () => triage(visits.A, LEVEL_A, 'ผู้ป่วย A'));
      await checkStep(page, `${TC2} ขั้น 2 · ${TC3} บันทึก Triage ผู้ป่วย B เป็น ESI ${LEVEL_B}`, () => triage(visits.B, LEVEL_B, 'ผู้ป่วย B'));
      enc.A = await board(visits.A.en);
      enc.B = await board(visits.B.en);
      const triageWait = (key: 'A' | 'B') => (Date.parse(enc[key].triagedAt!) - Date.parse(enc[key].arrivedAt)) / 1000;
      test.info().annotations.push({
        type: 'เปิด Visit → บันทึก Triage (triagedAt − arrivedAt)',
        description: `A ESI ${enc.A.triageLevel} ${mmss(triageWait('A'))} · B ESI ${enc.B.triageLevel} ${mmss(triageWait('B'))}`,
      });

      /** แถวตารางเทียบ: ป้ายบนการ์ด / เวลาตั้งแต่ Triage / เปิด Visit → Triage / เกณฑ์ / warning */
      const compareRows = async (expectWarning: Record<'A' | 'B', boolean>): Promise<CompareRow[]> => {
        const rows: CompareRow[] = [];
        for (const key of ['A', 'B'] as const) {
          const card = boardCard(page, visits[key].hn);
          const text = await waitLabel(card).innerText();
          const sinceTriage = sinceSeconds(enc[key].triagedAt!);
          const hasWarning = (await warning(card).count()) > 0;
          rows.push({
            label: `${key} · ESI ${enc[key].triageLevel}`,
            values: [text, mmss(sinceTriage), mmss(triageWait(key)), `${(enc[key].waitTimeLimitSeconds ?? 0) / 60} นาที`, hasWarning ? (await warning(card).innerText()) : 'ไม่มี', expectWarning[key] ? 'มี' : 'ไม่มี'],
            same: Math.abs(labelSeconds(text) - sinceTriage) <= 15 && hasWarning === expectWarning[key],
          });
        }
        return rows;
      };
      const COLUMNS = ['ป้ายบนการ์ด', 'ตั้งแต่ Triage', 'เปิด Visit → Triage', 'เกณฑ์', 'warning บนการ์ด', 'warning ที่ควรเป็น'];

      await checkStep(page, `${TC1} ขั้น 5 · ${TC2} ขั้น 3 หลัง Triage: การ์ดเปลี่ยนเป็น "รอ" นับจากเวลา Triage · ยังไม่ถึงเกณฑ์ ไม่มี warning`, async () => {
        await gotoErDashboard(page);
        const rows = await compareRows({ A: false, B: false });
        await showCompareTable(page, 'SBH-1329 หลัง Triage (ก่อนถึงเกณฑ์ของ ESI 2)', COLUMNS, rows, { side: 'left', width: '900px' });
        await showDashboardCard(page, visits.B.hn);
        for (const key of ['A', 'B'] as const) {
          const card = boardCard(page, visits[key].hn);
          await expect(waitLabel(card), `ผู้ป่วย ${key}: Triage แล้วป้ายต้องเป็น "รอ" (ไม่ใช่ รอคัดกรอง)`).toHaveText(/^รอ \d/);
          await markEvidence(expected(waitLabel(card)));
        }
        await holdForClip(page, 3_000);
        expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' / ')}`), 'ป้าย "รอ" ต้องนับจากเวลา Triage และยังไม่มี warning').toEqual([]);
      });
      await hideCompareTable(page);

      await checkStep(page, `${TC2} ขั้น 4 · ${TC3} ขั้น 3 รอจนเวลาหลัง Triage ของ B เกินเกณฑ์ ESI ${LEVEL_B} (${TEMP_MINUTES[LEVEL_B]} นาที) แต่ A ยังไม่ถึงเกณฑ์ ESI ${LEVEL_A} (${TEMP_MINUTES[LEVEL_A]} นาที)`, async () => {
        const until = Date.parse(enc.B.triagedAt!) + (TEMP_MINUTES[LEVEL_B] * 60 + PAST_B_SECONDS) * 1000;
        while (Date.now() < until) await page.waitForTimeout(Math.min(15_000, until - Date.now()));
        expect(sinceSeconds(enc.A.triagedAt!), `A ต้องยังไม่ถึงเกณฑ์ ${TEMP_MINUTES[LEVEL_A]} นาที`).toBeLessThan(TEMP_MINUTES[LEVEL_A] * 60);
      });

      await gotoErDashboard(page);
      const rows = await compareRows({ A: false, B: true });
      await checkStep(page, `${TC2} ขั้น 5 ผู้ป่วย B (ESI ${LEVEL_B}) รอเกินเกณฑ์ ${TEMP_MINUTES[LEVEL_B]} นาที — การ์ดแสดง warning เกินเป้าหมาย`, async () => {
        const card = boardCard(page, visits.B.hn);
        await showDashboardCard(page, visits.B.hn);
        expect(enc.B.waitTimeLimitSeconds, `เกณฑ์ของ ESI ${LEVEL_B} ต้องเป็นค่าที่ตั้งไว้`).toBe(TEMP_MINUTES[LEVEL_B] * 60);
        await expect(warning(card), 'Expected: เวลารอถึงเกณฑ์ → แสดงการแจ้งเตือนบนผู้ป่วยรายนั้น').toBeVisible();
        await markEvidence(expected(waitLabel(card)), expected(warning(card)));
        await holdForClip(page, 2_500);
      });

      await checkStep(page, `${TC3} ขั้น 4 เวลาเดียวกัน: B (ESI ${LEVEL_B} เกณฑ์ ${TEMP_MINUTES[LEVEL_B]} นาที) มี warning · A (ESI ${LEVEL_A} เกณฑ์ ${TEMP_MINUTES[LEVEL_A]} นาที) ไม่มี`, async () => {
        await showCompareTable(page, 'SBH-1329 warning ตามเกณฑ์ของแต่ละระดับ', COLUMNS, rows, { side: 'left', width: '900px' });
        await showDashboardCard(page, visits.A.hn);
        expect(enc.A.waitTimeLimitSeconds, `เกณฑ์ของ ESI ${LEVEL_A} ต้องเป็นค่าที่ตั้งไว้`).toBe(TEMP_MINUTES[LEVEL_A] * 60);
        const cardA = boardCard(page, visits.A.hn);
        const cardB = boardCard(page, visits.B.hn);
        await expect(warning(cardB), `ผู้ป่วย B ESI ${LEVEL_B} ต้องมี warning`).toBeVisible();
        await expect(warning(cardA), `ผู้ป่วย A ESI ${LEVEL_A} ยังไม่ถึงเกณฑ์ ต้องไม่มี warning`).toHaveCount(0);
        await markEvidence(expected(waitLabel(cardA)), expected(warning(cardB)));
        await holdForClip(page, 3_000);
        expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' / ')}`), 'ทุกแถวต้องตรง').toEqual([]);
      });
      await hideCompareTable(page);

      await checkStep(page, 'คืนค่าตั้งค่าเวลารอตรวจเดิม', async () => {
        const back = Object.fromEntries([LEVEL_A, LEVEL_B].map((level) => [level, original!.find((s) => s.level === level)!.limitSeconds! / 60]));
        const items = await saveSettings(back, 'ก่อนกด — คืนค่าตั้งค่าเวลารอตรวจเดิม');
        const byLevel = (list: WaitTimeSetting[]) => [...list].sort((a, b) => a.level - b.level);
        expect(byLevel(items), 'ค่าตั้งค่าทุกระดับต้องกลับเป็นค่าเดิม').toEqual(byLevel(original!));
        settingsChanged = false;
      });
    },
  );
});
