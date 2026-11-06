import type { Page } from '@playwright/test';
import { confirmOpenErVisit, dismissToast, expectOk, fetchBoard, fetchZones, gotoErDashboard, openVisitDialog, waitForApi, type ErBoardEncounter } from '../../../helpers/functions/er';
import {
  choose,
  createDialog,
  esiButton,
  fetchIncident,
  fillMemberTriage,
  memberRow,
  mciUrl,
  openCreateIncident,
  pressReady,
  printAllButton,
  readyButton,
  selectMember,
  submitAllButton,
  submitCreateIncident,
  zoneButton,
  type MciIncident,
  type MciMember,
} from '../../../helpers/functions/er-mass-casualty';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, erTriageSaveButton, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { captureGeneratedDocs, hidePdf, pdfLineAt, pdfPages, showPdf } from '../../../helpers/functions/print-capture';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { VITALS_NORMAL, pick } from '../../../mock-data/uat-play';

// SBH-2470 [ER][Triage หมู่] กรอกจำนวนผู้ป่วยตอนสร้างเหตุการณ์ → ระบบลงทะเบียนผู้ป่วยนิรนาม + เปิด ER Visit ให้ — EXE SBH-2561 (dev-x)
// TC-001 SBH-2565 … TC-014 SBH-2578 · ไม่รัน: TC-017 (ต้องปิดตารางแพทย์ ER) · TC-019 / 020 (ต้องให้ Dev ทำให้ล้มกลางทาง) — ผู้ใช้เลือก 31 ต.ค. 2026
// 3 เทส (R9 1 flow ต่อเทส) · คลิป 1 ไฟล์ต่อ 1 TC (startClip) · ผู้ป่วยที่ระบบสร้างเป็นผู้ป่วยของเทส (ชื่อเหตุการณ์มี AUTO)
//   A  @SBH-2470-B5   เหตุการณ์ N=5: TC-002 → 003 → 004 → 005 → 012 (พิมพ์ก่อนลบ) → 014 (รายที่ 02) → 008 (รายที่ 03) → 011 (ลบรายที่ 05) → 009 (คัดกรองรายที่ 01 จากบอร์ด) → 010 (ส่งทั้งเหตุการณ์ — ล็อกเหตุการณ์ จึงอยู่ท้าย)
//   B  @SBH-2565     เหตุการณ์ไม่กรอกจำนวน + เพิ่มผู้ป่วย AUTO 1 ราย (TC-001)
//   C  @SBH-2470-N50 เหตุการณ์ N=50: TC-013 (ส่งไม่ได้ระหว่างลงทะเบียน) → TC-007 (พร้อมส่งรายที่ 01 ระหว่างลงทะเบียน) → TC-006 (progress จนครบ)
// ข้อสังเกตจากการสำรวจ 31 ต.ค. 2026: ชื่อผู้ป่วยที่ระบบสร้าง = "MCI" / นามสกุล "<ชื่อเหตุการณ์> 01" · ไม่มีส่วนยืนยันอายุ/เพศ · ลบ member ได้ 500 · คัดกรองรายคนแล้ว member ยัง DRAFT
// → step ที่เช็คเรื่องเหล่านี้ใช้ soft() เล่น TC อื่นต่อ แล้วจบเทสด้วยรายการขั้นที่ไม่ผ่าน
// ทำต่อกับเหตุการณ์ N=5 เดิม (ไม่สร้างใหม่): SBH2470_B5_ID=<incidentId>
// รัน: npx playwright test tests/modules/er/SBH-2470-mci-headcount-registration.spec.ts --headed --grep "@SBH-2470-B5"

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC = {
  '001': 'TC-001 (SBH-2565)',
  '002': 'TC-002 (SBH-2566)',
  '003': 'TC-003 (SBH-2567)',
  '004': 'TC-004 (SBH-2568)',
  '005': 'TC-005 (SBH-2569)',
  '006': 'TC-006 (SBH-2570)',
  '007': 'TC-007 (SBH-2571)',
  '008': 'TC-008 (SBH-2572)',
  '009': 'TC-009 (SBH-2573)',
  '010': 'TC-010 (SBH-2574)',
  '011': 'TC-011 (SBH-2575)',
  '012': 'TC-012 (SBH-2576)',
  '013': 'TC-013 (SBH-2577)',
  '014': 'TC-014 (SBH-2578)',
};
// ข้าม TC ที่เก็บหลักฐานแล้ว (ทำต่อกับเหตุการณ์เดิม): SBH2470_SKIP=003,004,005,012
const SKIP = new Set((process.env.SBH2470_SKIP ?? "").split(",").filter(Boolean));
const SHARED_CC = 'อุบัติเหตุรถบัสคว่ำ';
const LOCATION = 'ถนนพหลโยธิน กม. 100';
const ZONE = 'Urgency';
const stamp = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).replace(':', '');
const two = (n: number) => String(n).padStart(2, '0');
const time = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }) : '-');

/** จด request ที่เขียนข้อมูลของ ER / เหตุการณ์ / คิว ลง annotation ตอนจบ (ยืนยันว่าเขียนอะไรไปบ้าง) */
function trackWrites(page: Page) {
  const writes: string[] = [];
  page.on('response', (r) => {
    const m = r.request().method();
    if (m !== 'GET' && /cortex-api\/(er\/|queues\/|clinical-form-groups\/[^/]+\/saves)/.test(r.url())) writes.push(`${m} ${new URL(r.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '…')} ${r.status()}`);
  });
  return writes;
}

/** ผู้ป่วยตามระเบียน (new-demographic-api) — ชื่อ / นามสกุล / เพศ / วันเกิด / โหมดตัวตน */
async function readPatient(page: Page, authorization: () => string, hn: string) {
  const res = await page.request.get(`/new-demographic-api/patients/${hn}`, { headers: { authorization: authorization() } });
  await expectOk(res, `อ่านผู้ป่วย HN ${hn}`);
  const { data } = (await res.json()) as { data: { hn: string; firstName: string; familyName: string; gender?: string; birthDate?: string; identityVerificationMode?: { display?: string } } };
  return data;
}

/** รอการลงทะเบียนของเหตุการณ์จบ (FINISHED / FAILED) */
async function waitRegistration(page: Page, authorization: () => string, id: string, timeout = 120_000): Promise<MciIncident> {
  let incident: MciIncident | undefined;
  await expect
    .poll(
      async () => {
        incident = await fetchIncident(page, authorization, id);
        return incident.registration?.status ?? 'NONE';
      },
      { message: 'การลงทะเบียนของเหตุการณ์ต้องจบ', timeout, intervals: [1_000] },
    )
    .not.toBe('RUNNING');
  return incident!;
}

test.describe('SBH-2470 Triage หมู่ — ลงทะเบียนผู้ป่วยตามจำนวน (dev-x)', () => {
  test.describe.configure({ timeout: 2_400_000 });
  test.afterEach(async ({ page }) => {
    await hideCompareTable(page);
    await hidePdf(page);
  });

  test(
    'เหตุการณ์ N=5: member ครบ · ชื่อ · HN · Visit ในห้อง Triage · พิมพ์บัตรคิว · ยืนยันอายุ/เพศ · ลบ · คัดกรองรายคน · ส่งทั้งเหตุการณ์ (Super_User)',
    {
      tag: ['@SBH-2470', '@SBH-2470-B5', '@SBH-2566', '@SBH-2567', '@SBH-2568', '@SBH-2569', '@SBH-2576', '@SBH-2578', '@SBH-2572', '@SBH-2575', '@SBH-2573', '@SBH-2574'],
      annotation: ['SBH-2566', 'SBH-2567', 'SBH-2568', 'SBH-2569', 'SBH-2576', 'SBH-2578', 'SBH-2572', 'SBH-2575', 'SBH-2573', 'SBH-2574'].map(linear),
    },
    async ({ page }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const writes = trackWrites(page);
      const docs = captureGeneratedDocs(page);
      const { note, soft, finish } = makeRunner(page);
      const name = `รถบัสคว่ำ AUTO${stamp()}`;
      let id = process.env.SBH2470_B5_ID ?? '';
      let incident: MciIncident;

      // ─── TC-002: สร้างเหตุการณ์ N=5
      if (!id) {
        await gotoErDashboard(page);
        await startClip(page, 'TC-002');
        await checkStep(page, `${TC['002']} ขั้น 2-3 สร้างเหตุการณ์ — ช่องจำนวนผู้ป่วยกดได้ · ชื่อ "${name}" · จำนวนผู้ป่วย 5`, async () => {
          const { dialog, count, availability } = await openCreateIncident(page, { name, location: LOCATION, chiefComplaint: SHARED_CC, headcount: 5 });
          note('registration-availability ตอนเปิด dialog', JSON.stringify(availability));
          await expect(count).toHaveValue('5');
          await markEvidence(filled(dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ })), filled(count, 'จำนวนผู้ป่วย 5'), clicked(dialog.getByRole('button', { name: 'สร้าง', exact: true })));
          await snapEvidence(page, 'ก่อนกด — สร้างเหตุการณ์ N=5');
        });
        await checkStep(page, `${TC['002']} ขั้น 4 กดสร้าง → ระบบพาเข้าหน้าเหตุการณ์ทันที`, async () => {
          const r = await submitCreateIncident(page, createDialog(page));
          id = r.id;
          note('เหตุการณ์ N=5', `${r.created.displayCode} · ${name} · id ${id} · กดสร้าง → หน้าเหตุการณ์ ${(r.navigateMs / 1000).toFixed(1)} วินาที · registration ตอนสร้าง ${JSON.stringify(r.created.registration)}`);
          await expect(main.getByText(r.created.displayCode, { exact: false }).first()).toBeVisible();
          await markEvidence(expected(main.getByText(r.created.displayCode, { exact: false }).first(), 'หน้าเหตุการณ์'));
        });
      } else {
        const loaded = waitForApi(page, 'GET', `/cortex-api/er/mass-casualty-incidents/${id}`, 90_000);
        await page.goto(mciUrl(id));
        await loaded;
        note('ทำต่อกับเหตุการณ์เดิม', id);
      }
      await checkStep(page, `${TC['002']} ขั้น 5 รอลงทะเบียนเสร็จ — member ที่ระบบสร้างครบ 5 คน`, async () => {
        incident = await waitRegistration(page, authorization, id);
        const sys = incident.members.filter((m) => m.registrationSeq !== null).sort((a, b) => a.registrationSeq! - b.registrationSeq!);
        note('ผลลงทะเบียน', `${JSON.stringify(incident.registration)} · member ${incident.members.length} ราย`);
        for (const m of sys) await expect(memberRow(page, m.hn)).toBeVisible({ timeout: 30_000 });
        const rows: CompareRow[] = sys.map((m) => ({ label: `ลำดับ ${two(m.registrationSeq!)}`, values: [m.patientName, `HN ${m.hn}`, m.status], same: true }));
        await markEvidence(...sys.map((m) => expected(memberRow(page, m.hn))), expected(main.getByText(/สำเร็จ \d+ จาก \d+ ราย/).first(), 'จาก 5 ราย'));
        await showCompareTable(page, `${TC['002']} member ที่ระบบสร้าง (API)`, ['ชื่อในรายการ', 'HN', 'สถานะ'], rows, { side: 'right', width: '640px' });
        expect(incident.registration?.status, 'การลงทะเบียนต้องสำเร็จ').toBe('FINISHED');
        expect(sys.map((m) => m.registrationSeq), 'member ที่ระบบสร้างต้องครบ 5 คน').toEqual([1, 2, 3, 4, 5]);
      });
      await hideCompareTable(page);
      const sys = () => incident.members.filter((m) => m.registrationSeq !== null).sort((a, b) => a.registrationSeq! - b.registrationSeq!);
      const bySeq = (n: number) => sys().find((m) => m.registrationSeq === n)!;
      for (const m of sys()) note(`ผู้ป่วยลำดับ ${two(m.registrationSeq!)}`, `${m.patientName} · HN ${m.hn} · ${m.vn} · ${m.en}`);

      // ─── TC-003: ชื่อ-นามสกุล
      if (!SKIP.has("003")) {
      await startClip(page, 'TC-003');
      const people = new Map<string, Awaited<ReturnType<typeof readPatient>>>();
      for (const m of sys()) people.set(m.hn, await readPatient(page, authorization, m.hn));
      // Expected แก้ 4 พ.ย. 2026 ตาม SBH-3609: ชื่อ "01 MCI" … "05 MCI" · นามสกุล = ชื่อเหตุการณ์
      await soft(`${TC['003']} ขั้น 3 ชื่อ "01 MCI" ถึง "05 MCI" เรียงต่อเนื่อง ไม่ซ้ำ ไม่ข้าม`, async () => {
        const firsts = sys().map((m) => people.get(m.hn)!.firstName);
        const rows: CompareRow[] = sys().map((m, i) => ({ label: `ลำดับ ${two(m.registrationSeq!)}`, values: [`${two(i + 1)} MCI`, firsts[i]], same: firsts[i] === `${two(i + 1)} MCI` }));
        await markEvidence(...sys().map((m) => expected(memberRow(page, m.hn).getByRole('heading'))));
        await showCompareTable(page, `${TC['003']} ชื่อ (ระเบียนผู้ป่วย)`, ['Expected', 'ในระบบ'], rows, { side: 'right', width: '620px' });
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
        expect(new Set(firsts).size).toBe(5);
      });
      await hideCompareTable(page);
      await soft(`${TC['003']} ขั้น 3 นามสกุล = ชื่อเหตุการณ์ "${name}" ทั้ง 5 คน`, async () => {
        const rows: CompareRow[] = sys().map((m) => {
          const p = people.get(m.hn)!;
          return { label: `ลำดับ ${two(m.registrationSeq!)}`, values: [`${two(m.registrationSeq!)} MCI / ${name}`, m.patientName, `${p.firstName} / ${p.familyName}`], same: p.firstName === `${two(m.registrationSeq!)} MCI` && p.familyName === name };
        });
        await markEvidence(...sys().map((m) => expected(memberRow(page, m.hn).getByRole('heading'))));
        await showCompareTable(page, `${TC['003']} ชื่อ / นามสกุล`, ['Expected (TC)', 'ชื่อในรายการ', 'ระเบียนผู้ป่วย ชื่อ / นามสกุล'], rows, { side: 'right', width: '900px' });
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'นามสกุลต้องเป็นชื่อเหตุการณ์').toEqual([]);
      });
      await hideCompareTable(page);
      for (const m of sys()) {
        const p = people.get(m.hn)!;
        note(`ระเบียนผู้ป่วย HN ${m.hn}`, `ชื่อ "${p.firstName}" · นามสกุล "${p.familyName}" · เพศ ${p.gender ?? '(ไม่ระบุ)'} · วันเกิด ${p.birthDate ?? '-'} · โหมดตัวตน ${p.identityVerificationMode?.display ?? '-'}`);
      }

      }
      // ─── TC-004: HN จริง ไม่ซ้ำ ค้นเจอ
      if (!SKIP.has("004")) {
      await startClip(page, 'TC-004');
      await checkStep(page, `${TC['004']} ขั้น 2 HN ของ member ทั้ง 5 คนไม่ซ้ำกัน`, async () => {
        const hns = sys().map((m) => m.hn);
        await markEvidence(...sys().map((m) => expected(memberRow(page, m.hn).getByText(`HN ${m.hn}`, { exact: false }))));
        expect(new Set(hns).size, 'HN ต้องไม่ซ้ำ').toBe(5);
        expect(hns.every((h) => /^\d+$/.test(h))).toBe(true);
      });
      const found: CompareRow[] = [];
      for (const m of sys()) {
        await checkStep(page, `${TC['004']} ขั้น 3 ค้นหาผู้ป่วย HN ${m.hn} (ลำดับ ${two(m.registrationSeq!)}) ที่ช่องค้นหาผู้ป่วย → เจอเป็นผู้ป่วยในระบบ`, async () => {
          const box = page.getByPlaceholder('ค้นหาผู้ป่วย').first();
          await box.fill(m.hn);
          await page.waitForURL(new RegExp(`/patients/${m.hn}\\b`), { timeout: 15_000 }).catch(async () => {
            await box.press('Enter');
            await page.waitForURL(new RegExp(`/patients/${m.hn}\\b`), { timeout: 30_000 });
          });
          const header = page.getByText(`HN ${m.hn}`, { exact: true }).first();
          const title = page.getByText(m.patientName, { exact: true }).first();
          await expect(header).toBeVisible({ timeout: 60_000 });
          await expect(title).toBeVisible();
          const vnRow = page.getByText(m.en, { exact: true }).first();
          await expect(vnRow).toBeVisible({ timeout: 60_000 });
          found.push({ label: `ลำดับ ${two(m.registrationSeq!)}`, values: [m.hn, 'เจอ', m.patientName], same: true });
          await markEvidence(filled(box, `ค้น ${m.hn}`), expected(header), expected(title), expected(vnRow, 'Visit ER'));
        });
      }
      await page.goto(mciUrl(id));
      await expect(memberRow(page, bySeq(1).hn)).toBeVisible({ timeout: 90_000 });
      await checkStep(page, `${TC['004']} สรุป — ค้นเจอครบ 5 HN`, async () => {
        await markEvidence(...sys().map((m) => expected(memberRow(page, m.hn))));
        await showCompareTable(page, `${TC['004']} ผลค้นหาผู้ป่วยด้วย HN`, ['HN', 'ช่องค้นหาผู้ป่วย', 'ชื่อ'], found, { side: 'right', width: '640px' });
        expect(found).toHaveLength(5);
      });
      await hideCompareTable(page);

      }
      // ─── TC-005: VN + ER encounter ในห้อง Triage
      if (!SKIP.has("005")) {
      await gotoErDashboard(page);
      await startClip(page, 'TC-005');
      await checkStep(page, `${TC['005']} ขั้น 2-3 ER Dashboard — ผู้ป่วยทั้ง 5 คนมี VN และเป็น ER encounter ในคอลัมน์ Triage (รอคัดกรอง)`, async () => {
        const zones = await fetchZones(page, authorization);
        let board: ErBoardEncounter[] = [];
        const columns = ['Triage', 'Resuscitation', 'Urgency', 'Isolation 1', 'Isolation 2', 'Observation', 'ED Boarding'];
        let placed: string[] = [];
        await expect(async () => {
          board = await fetchBoard(page, authorization);
          const headers = await main.locator('strong').evaluateAll((els, names) => els.filter((el) => names.includes(el.textContent!.trim())).map((el) => ({ name: el.textContent!.trim(), x: el.getBoundingClientRect().x })), columns);
          placed = await Promise.all(
            sys().map(async (m) => {
              const x = await page.getByText(`HN: ${m.hn}`, { exact: true }).first().evaluate((el) => el.getBoundingClientRect().x, undefined, { timeout: 10_000 });
              return [...headers].filter((h) => h.x <= x + 40).sort((a, b) => b.x - a.x)[0]?.name ?? '-';
            }),
          );
        }).toPass({ timeout: 90_000 });
        const rows: CompareRow[] = sys().map((m, i) => {
          const e = board.find((x) => x.en === m.en) as (ErBoardEncounter & { vn?: string }) | undefined;
          const loc = e ? (zones.get(e.currentLocationId ?? -1) ?? `id ${e.currentLocationId}`) : '-';
          return {
            label: `ลำดับ ${two(m.registrationSeq!)} HN ${m.hn}`,
            values: [e?.vn ?? '(ไม่อยู่บนบอร์ด)', m.en, `${placed[i]} · ${e?.triagedAt ? 'คัดกรองแล้ว' : 'รอคัดกรอง'} · ${loc}`],
            same: !!e?.vn && e.vn === m.vn && placed[i] === 'Triage' && !e.triagedAt,
          };
        });
        const triageHeader = main.locator('strong').filter({ hasText: /^Triage$/ }).first();
        await page.getByText(`HN: ${bySeq(1).hn}`, { exact: true }).first().scrollIntoViewIfNeeded();
        await markEvidence(expected(triageHeader, 'คอลัมน์ Triage'), ...sys().map((m) => expected(page.getByText(`HN: ${m.hn}`, { exact: true }).first())));
        await snapEvidence(page, `${TC['005']} บอร์ด ER คอลัมน์ Triage`);
        await showCompareTable(page, `${TC['005']} Visit / Encounter บนบอร์ด ER`, ['VN', 'EN', 'คอลัมน์บนบอร์ด · สถานะ · location (API)'], rows, { side: 'right', width: '900px' });
        // ภาพ "ผ่าน" ท้าย step ไม่ถูกบันทึกเมื่อชื่อ step ยาว (Prod 6 พ.ย.) — ถ่ายภาพตารางเองให้มีภาพนิ่งเป็นหลักฐาน
        await snapEvidence(page, `${TC['005']} ตารางเทียบบอร์ด`);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);

      }
      // ─── TC-012: พิมพ์บัตรคิวทั้งหมด (ก่อนลบรายที่ 05)
      if (!SKIP.has("012")) {
      await page.goto(mciUrl(id));
      await expect(memberRow(page, bySeq(5).hn)).toBeVisible({ timeout: 90_000 });
      await startClip(page, 'TC-012');
      const board = await fetchBoard(page, authorization);
      const queueOf = (m: MciMember) => (board.find((e) => e.en === m.en) as { queueExam?: { id: number; qDisplay: string } } | undefined)?.queueExam;
      let pdfs: { name: string; data: Buffer; queue: string }[] = [];
      await checkStep(page, `${TC['012']} ขั้น 3 กดปุ่ม พิมพ์บัตรคิวทั้งหมด`, async () => {
        await markEvidence(clicked(printAllButton(page)), ...sys().map((m) => expected(memberRow(page, m.hn))));
        await snapEvidence(page, 'ก่อนกด — พิมพ์บัตรคิวทั้งหมด');
        const since = Date.now();
        await printAllButton(page).click();
        const doc = await docs.next(/\/cortex-api\/queues\/print$/, since, 60_000);
        note(`${TC['012']} คำสั่งพิมพ์`, `POST ${doc.api} ${doc.status} · body ${doc.request} · ไฟล์ ${doc.files.map((f) => f.name).join(', ')}`);
        pdfs = await Promise.all(doc.files.filter((f) => f.name.endsWith('.pdf')).map(async (f) => ({ ...f, queue: (await pdfPages(f.data)).join(' ').match(/หมายเลขบัตรคิวของท่าน\s*(\S+)/)?.[1] ?? '-' })));
        // Retest 4 พ.ย. 2026: toast หายระหว่างตีกรอบ → markEvidence ค้าง 20 วิ — จับทันทีที่ขึ้น และไม่ให้ toast ทำขั้นนี้พัง
        const toast = page.locator('.ant-message-notice, .ant-notification-notice').last();
        if (await toast.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false)) {
          note(`${TC['012']} แจ้งเตือนหลังกดพิมพ์`, (await toast.innerText().catch(() => '(หายก่อนอ่าน)')).replace(/\s+/g, ' '));
          try {
            await toast.hover({ trial: true, timeout: 2_000 });
            await markEvidence(alerted(toast));
            await snapEvidence(page, 'หลังกด — แจ้งเตือนพิมพ์บัตรคิว');
          } catch {
            note(`${TC['012']} แจ้งเตือนหลังกดพิมพ์`, 'หายก่อนตีกรอบ (ดูในคลิป)');
          }
        }
      });
      await checkStep(page, `${TC['012']} ขั้น 4 ไฟล์ที่ได้ — บัตรคิว 5 ใบ ครบทุก member (เทียบเลขคิวของแต่ละ Visit)`, async () => {
        const rows: CompareRow[] = sys().map((m) => {
          const q = queueOf(m);
          const card = pdfs.find((p) => p.queue === q?.qDisplay);
          return { label: `ลำดับ ${two(m.registrationSeq!)} HN ${m.hn}`, values: [q?.qDisplay ?? '-', card ? `${card.name} · ${card.queue}` : '(ไม่มีบัตร)'], same: !!card };
        });
        const pdfText = (await pdfPages(pdfs[0].data)).join(' ');
        note(`${TC['012']} ข้อความบนบัตรใบแรก`, pdfText);
        note(`${TC['012']} ชื่อ / HN บนบัตร`, `บนบัตรมีชื่อผู้ป่วย: ${sys().some((m) => pdfText.includes(m.patientName)) ? 'มี' : 'ไม่มี'} · มี HN: ${sys().some((m) => pdfText.includes(m.hn)) ? 'มี' : 'ไม่มี'} (เทียบด้วยเลขคิวของ Visit แทน)`);
        const overlay = await showPdf(page, pdfs[0].data, `บัตรคิว ${pdfs[0].name} (1 จาก ${pdfs.length} ใบ)`);
        const qLine = await pdfLineAt(overlay, pdfs[0].queue);
        await markEvidence(...[qLine ? expected(qLine, `เลขคิว ${pdfs[0].queue}`) : expected(overlay)]);
        await snapEvidence(page, `${TC['012']} บัตรคิวใบแรก`);
        await hidePdf(page);
        await showCompareTable(page, `${TC['012']} บัตรคิวจาก "พิมพ์บัตรคิวทั้งหมด" (${pdfs.length} ไฟล์)`, ['เลขคิวของ Visit (บอร์ด ER)', 'บัตรในไฟล์ที่ได้'], rows, { side: 'right', width: '760px' });
        await markEvidence(...sys().map((m) => expected(memberRow(page, m.hn))));
        expect(pdfs, 'ต้องได้บัตรคิว 5 ใบ').toHaveLength(5);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'ทุก member ต้องมีบัตรคิวของตัวเอง').toEqual([]);
      });
      await hideCompareTable(page);

      }
      // ─── TC-014: รายที่ 02 ยังไม่ยืนยันอายุ/เพศ → mark ready ต้องไม่ได้
      // Retest 4 พ.ย. 2026: TC-014 / 008 / 009 / 010 ถูก Canceled (Dev แยกเรื่องยืนยันอายุ/เพศ ไปการ์ดใหม่) → SBH2470_SKIP=014,008,009,010
      const confirmAction = main.getByRole('button', { name: /ยืนยัน.*(อายุ|เพศ)|ยืนยันข้อมูล/ });
      const m2 = bySeq(2);
      const m3 = bySeq(3);
      if (!SKIP.has('014')) {
      await startClip(page, 'TC-014');
      await checkStep(page, `${TC['014']} ขั้น 2 เปิดการ์ด member "${m2.patientName}" — ไม่ยืนยันอายุ/เพศ`, async () => {
        await selectMember(page, m2.hn);
        note(`${TC['014']} ปุ่ม / ข้อความยืนยันอายุ-เพศบนหน้าจอ`, `${await confirmAction.count()} ปุ่ม · ข้อความ "ยืนยันอายุ" ${await main.getByText(/ยืนยันอายุ|ยืนยันเพศ/).count()} จุด`);
        await markEvidence(expected(memberRow(page, m2.hn), 'DRAFT'), expected(main.getByText(`HN ${m2.hn}`, { exact: true }).last(), 'ยังไม่ยืนยันอายุ/เพศ'));
      });
      await soft(`${TC['014']} ขั้น 3 ลองกด mark ready (เลือก ESI 3 + ${ZONE}) → ปุ่ม ready ต้อง disable หรือระบบปฏิเสธ · member ไม่เป็น READY`, async () => {
        await esiButton3(page);
        const enabled = await readyButton(page).isEnabled();
        note(`${TC['014']} ปุ่มพร้อมส่ง หลังเลือก ESI + โซน`, enabled ? 'กดได้' : 'กดไม่ได้');
        if (enabled) {
          const status = await pressReady(page, 3, ZONE, 'ก่อนกด — พร้อมส่ง รายที่ 02 (ยังไม่ยืนยันอายุ/เพศ)');
          note(`${TC['014']} POST ready`, String(status));
          await page.waitForTimeout(2_000);
        }
        const after = (await fetchIncident(page, authorization, id)).members.find((m) => m.id === m2.id)!;
        note(`${TC['014']} สถานะหลังกด`, after.status);
        await markEvidence(expected(memberRow(page, m2.hn), `สถานะ ${after.status}`), ...(enabled ? [] : [expected(readyButton(page), 'กดไม่ได้')]));
        expect(after.status, 'member ที่ยังไม่ยืนยันอายุ/เพศต้องไม่เป็น READY').not.toBe('READY');
      });
      }

      // ─── TC-008: รายที่ 03 ยืนยันอายุ/เพศ → ready
      if (!SKIP.has('008')) {
      await startClip(page, 'TC-008');
      await checkStep(page, `${TC['008']} ขั้น 1 เปิดการ์ด member "${m3.patientName}" (ระบบสร้าง ยังไม่ยืนยันอายุ/เพศ)`, async () => {
        await selectMember(page, m3.hn);
        await markEvidence(expected(memberRow(page, m3.hn)), expected(main.getByText(`HN ${m3.hn}`, { exact: true }).last()));
      });
      await soft(`${TC['008']} ขั้น 2-3 ที่การ์ด member กดยืนยันอายุ/เพศ (45 ปี / ชาย)`, async () => {
        await markEvidence(expected(memberRow(page, m3.hn), 'การ์ด member'), expected(main.getByText(`HN ${m3.hn}`, { exact: true }).last(), 'ฟอร์มของรายนี้'));
        await expect(confirmAction.first(), 'ต้องมีปุ่มยืนยันอายุ/เพศที่การ์ด member').toBeVisible({ timeout: 5_000 });
      });
      await checkStep(page, `${TC['008']} ขั้น 4 กด mark ready (ESI 3 + ${ZONE}) → member เป็น READY`, async () => {
        await fillMemberTriage(page, 3, ZONE);
        const status = await pressReady(page, 3, ZONE, 'ก่อนกด — พร้อมส่ง รายที่ 03');
        note(`${TC['008']} POST ready`, String(status));
        await expect(memberRow(page, m3.hn)).toContainText('READY', { timeout: 20_000 });
        await markEvidence(expected(memberRow(page, m3.hn), 'READY'), expected(main.getByText(/พร้อมส่ง \d+ ราย/).first()));
      });
      }

      // ─── TC-011: ลบรายที่ 05 (ยังไม่มีใครแตะ) → ER visit ต้องถูกยกเลิก
      const m5 = bySeq(5);
      if (!/\/mass-casualty/.test(page.url()) || !(await memberRow(page, m5.hn).isVisible().catch(() => false))) {
        await page.goto(mciUrl(id));
        await expect(memberRow(page, m5.hn)).toBeVisible({ timeout: 90_000 });
      }
      await startClip(page, 'TC-011');
      let deleted = false;
      await soft(`${TC['011']} ขั้น 2 ลบ member "${m5.patientName}" ออกจากเหตุการณ์`, async () => {
        const del = memberRow(page, m5.hn).getByRole('button', { name: 'delete' });
        await markEvidence(clicked(del), expected(memberRow(page, m5.hn), 'ยังไม่มีใครแตะ'));
        await snapEvidence(page, 'ก่อนกด — ลบ member รายที่ 05');
        const res = waitForApi(page, 'DELETE', new RegExp(`/members/${m5.id}$`), 30_000);
        await del.click();
        const confirm = page.locator('.ant-popconfirm:visible, .ant-modal-confirm:visible').last();
        if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
          note(`${TC['011']} หน้าต่างยืนยันลบ`, (await confirm.innerText()).replace(/\s+/g, ' '));
          await confirm.getByRole('button').last().click();
        }
        const r = await res;
        const body = await r.text();
        note(`${TC['011']} DELETE member`, `${r.status()} ${body.slice(0, 200)}`);
        // ลบสำเร็จ = แถวรายที่ 05 หายไป → ตีกรอบแถวที่เหลือแทน (ตีกรอบ locator ที่ไม่อยู่บนจอจะค้าง)
        if (r.ok()) await expect(memberRow(page, m5.hn)).toBeHidden({ timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(1_000);
        const toast = page.locator('.ant-message-notice, .ant-notification-notice').last();
        const gone = !(await memberRow(page, m5.hn).isVisible().catch(() => false));
        const marks = gone
          ? sys().filter((m) => m.id !== m5.id).map((m, i) => expected(memberRow(page, m.hn), i === 0 ? `เหลือ ${sys().length - 1} ราย ไม่มีรายที่ 05` : undefined))
          : [expected(memberRow(page, m5.hn), 'หลังกดลบ — ยังอยู่')];
        if (await toast.isVisible().catch(() => false)) {
          note(`${TC['011']} แจ้งเตือนหลังกดลบ`, (await toast.innerText()).replace(/\s+/g, ' '));
          marks.push(alerted(toast));
        }
        await markEvidence(...marks);
        await snapEvidence(page, 'หลังกด — ลบ member รายที่ 05');
        expect(r.status(), 'ลบ member ต้องสำเร็จ').toBeLessThan(300);
        await expect(memberRow(page, m5.hn), 'member ต้องหายจากรายการ').toBeHidden({ timeout: 20_000 });
        deleted = true;
      });
      await gotoErDashboard(page);
      await soft(`${TC['011']} ขั้น 3-4 ER board — Visit / Encounter ของ HN ${m5.hn} ถูกยกเลิก ไม่แสดงบนบอร์ด`, async () => {
        const onBoard = (await fetchBoard(page, authorization)).find((e) => e.en === m5.en);
        note(`${TC['011']} บอร์ด ER หลังลบ`, onBoard ? `ยังอยู่ · ${onBoard.latestStatusCode} · ${onBoard.patientStatus}` : 'ไม่อยู่บนบอร์ด');
        const card = page.getByText(`HN: ${m5.hn}`, { exact: true });
        if (await card.count()) {
          await card.first().scrollIntoViewIfNeeded();
          await markEvidence(expected(card.first(), 'ยังอยู่บนบอร์ด'));
        } else await markEvidence(expected(main.locator('strong').filter({ hasText: /^Triage$/ }).first(), `ไม่มี HN ${m5.hn}`));
        await snapEvidence(page, `${TC['011']} บอร์ด ER หลังลบ`);
        // Retest 4 พ.ย. 2026: สถานะ Encounter จาก API รายวันของบอร์ด (มี Encounter ที่ยกเลิกแล้วปนมาด้วย)
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
        const dayRes = await page.request.get(`/cortex-api/er/dashboard/encounters?date=${today}`, { headers: { authorization: authorization() } });
        const day = (await dayRes.json()) as { en: string; latestStatusCode: string; patientStatus: string }[];
        const enc = day.find((e) => e.en === m5.en);
        note(`${TC['011']} Encounter ${m5.en} (API รายวัน)`, enc ? `${enc.latestStatusCode} · ${enc.patientStatus}` : 'ไม่พบ');
        const rows: CompareRow[] = [
          { label: 'บอร์ด ER (current_queue)', values: ['ไม่อยู่บนบอร์ด', onBoard ? `ยังอยู่ · ${onBoard.latestStatusCode}` : 'ไม่อยู่บนบอร์ด'], same: !onBoard },
          { label: `Encounter ${m5.en}`, values: ['cancelled', enc ? `${enc.latestStatusCode} · ${enc.patientStatus}` : 'ไม่พบ'], same: enc?.latestStatusCode === 'cancelled' },
        ];
        await showCompareTable(page, `${TC['011']} HN ${m5.hn} หลังลบ member (API)`, ['Expected', 'ในระบบ'], rows, { side: 'right', width: '640px' });
        await snapEvidence(page, `${TC['011']} ตารางเทียบหลังลบ`);
        expect(onBoard, 'Visit ของ member ที่ลบต้องไม่อยู่บนบอร์ด ER').toBeUndefined();
        await expect(card).toHaveCount(0);
        expect(enc?.latestStatusCode, 'Encounter ของ member ที่ลบต้องถูกยกเลิก').toBe('cancelled');
      });
      await hideCompareTable(page);
      note(`${TC['011']} ลบสำเร็จ`, String(deleted));

      // ─── TC-009: คัดกรองรายที่ 01 จาก ER Dashboard → member เป็น "triage แยกแล้ว"
      if (!SKIP.has('009')) {
      const m1 = bySeq(1);
      await startClip(page, 'TC-009');
      await checkStep(page, `${TC['009']} ขั้น 2-3 ER Dashboard → คัดกรองผู้ป่วย "${m1.patientName}" รายคน (ESI 2) จนบันทึกสำเร็จ`, async () => {
        const card = page.getByText(`HN: ${m1.hn}`, { exact: true }).first();
        await card.scrollIntoViewIfNeeded();
        await markEvidence(clicked(card));
        await snapEvidence(page, 'ก่อนกด — การ์ดผู้ป่วยรายที่ 01 บนบอร์ด');
        await card.click();
        await expect(page).toHaveURL(new RegExp(`/patients/${m1.hn}`), { timeout: 30_000 });
        await expect(erTriagePanel(page).getByRole('spinbutton', { name: 'Systolic' }).first()).toBeVisible({ timeout: 120_000 });
        await fillErTriageForm(page, { level: 2, vitals: VITALS_NORMAL });
        await markEvidence(filled(erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }), 'ESI 2'), clicked(erTriageSaveButton(page)));
        await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรองรายที่ 01');
        await saveErTriageForm(page, `บันทึกคัดกรองรายที่ 01 (${m1.en})`);
        await expect(page.getByText(/ESI 2/).first()).toBeVisible({ timeout: 30_000 });
        await markEvidence(expected(page.getByText(/ESI 2/).first(), 'Triage ESI 2'));
      });
      let m1Board = (await fetchBoard(page, authorization)).find((e) => e.en === m1.en);
      note(`${TC['009']} บอร์ด ER หลังคัดกรองรายคน`, m1Board ? `triagedAt ${m1Board.triagedAt ?? '-'} · ESI ${m1Board.triageLevel ?? '-'} · location ${m1Board.currentLocationId}` : 'ไม่อยู่บนบอร์ด');
      await page.goto(mciUrl(id));
      await expect(memberRow(page, m1.hn)).toBeVisible({ timeout: 90_000 });
      await soft(`${TC['009']} ขั้น 4 หน้าเหตุการณ์ — member ยังอยู่ และแสดงสถานะ "triage แยกแล้ว"`, async () => {
        let status = '';
        await expect
          .poll(
            async () => {
              status = (await fetchIncident(page, authorization, id)).members.find((m) => m.id === m1.id)?.status ?? '(ไม่อยู่ในเหตุการณ์)';
              return status;
            },
            { timeout: 60_000, intervals: [3_000] },
          )
          .toBe('TRIAGED_SEPARATELY')
          .catch(() => undefined);
        await page.reload();
        await expect(memberRow(page, m1.hn)).toBeVisible({ timeout: 90_000 });
        note(`${TC['009']} สถานะ member (API)`, status);
        await markEvidence(expected(memberRow(page, m1.hn), `สถานะ ${status}`), expected(main.getByText(/triage แยกแล้ว \d+ ราย/).first()));
        await snapEvidence(page, `${TC['009']} หน้าเหตุการณ์หลังคัดกรองรายคน`);
        await expect(memberRow(page, m1.hn)).toContainText('triage แยกแล้ว', { timeout: 5_000 });
        expect(status).toBe('TRIAGED_SEPARATELY');
      });

      // ─── TC-010: ส่งทั้งเหตุการณ์ → รายที่ 01 ไม่ถูก triage ซ้ำ
      await startClip(page, 'TC-010');
      const zones = await fetchZones(page, authorization);
      const m4 = bySeq(4);
      await checkStep(page, `${TC['010']} ขั้น 2 member อื่น READY อย่างน้อย 2 คน (รายที่ 02 / 03 จาก TC-014 / TC-008 · รายที่ 04 กดพร้อมส่งเพิ่ม)`, async () => {
        incident = await fetchIncident(page, authorization, id);
        if (incident.members.find((m) => m.id === m4.id)?.status !== 'READY') {
          await selectMember(page, m4.hn);
          await fillMemberTriage(page, 3, ZONE);
          await pressReady(page, 3, ZONE);
          await expect(memberRow(page, m4.hn)).toContainText('READY', { timeout: 20_000 });
        }
        incident = await fetchIncident(page, authorization, id);
        const ready = incident.members.filter((m) => m.status === 'READY');
        note(`${TC['010']} สถานะ member ก่อนส่ง`, incident.members.map((m) => `${two(m.registrationSeq ?? 0)} ${m.status}`).join(' · '));
        await markEvidence(...ready.map((m) => expected(memberRow(page, m.hn), 'READY')));
        expect(ready.length).toBeGreaterThanOrEqual(2);
      });
      m1Board = (await fetchBoard(page, authorization)).find((e) => e.en === m1.en);
      const before = { triagedAt: m1Board?.triagedAt ?? null, level: m1Board?.triageLevel ?? null, loc: m1Board?.currentLocationId ?? null };
      note(`${TC['010']} ขั้น 3 ผล triage / ตำแหน่งของรายที่ 01 ก่อนส่ง`, `triagedAt ${before.triagedAt ?? '-'} · ESI ${before.level ?? '-'} · ${zones.get(before.loc ?? -1) ?? before.loc}`);
      await checkStep(page, `${TC['010']} ขั้น 4 กด ส่ง Triage ทั้งเหตุการณ์`, async () => {
        await expect(submitAllButton(page)).toBeEnabled({ timeout: 30_000 });
        await markEvidence(expected(memberRow(page, m1.hn), 'รายที่ 01'), clicked(submitAllButton(page)));
        await snapEvidence(page, 'ก่อนกด — ส่ง Triage ทั้งเหตุการณ์');
        await submitAllButton(page).click();
        const refer = page.getByRole('dialog', { name: 'ส่งต่อไปคลินิก' });
        const confirm = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
        for (let i = 0; i < 3; i++) {
          if (await refer.isVisible({ timeout: 3_000 }).catch(() => false)) {
            note(TC['010'], 'หลังกดส่งมีหน้าต่าง ส่งต่อไปคลินิก → ภายหลัง');
            await refer.getByRole('button', { name: 'ภายหลัง' }).click();
          } else if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
            note(TC['010'], `หน้าต่างหลังกดส่ง: ${(await confirm.innerText()).replace(/\s+/g, ' ').slice(0, 200)}`);
            await markEvidence(clicked(confirm.getByRole('button', { name: /ยืนยัน/ }).last()));
            await snapEvidence(page, 'หน้าต่างยืนยันส่งทั้งเหตุการณ์');
            await confirm.getByRole('button', { name: /ยืนยัน/ }).last().click();
          }
        }
        await snapEvidence(page, 'หลังกด — ส่ง Triage ทั้งเหตุการณ์');
      });
      await checkStep(page, `${TC['010']} ขั้น 5 หลังส่ง — รายที่ 01 ผล triage / ตำแหน่งเท่าเดิม · รายที่ READY ถูก triage ตามปกติ`, async () => {
        let rows: CompareRow[] = [];
        await expect(async () => {
          incident = await fetchIncident(page, authorization, id);
          const board = await fetchBoard(page, authorization);
          const e1 = board.find((e) => e.en === m1.en);
          rows = [
            {
              label: `รายที่ 01 (${incident.members.find((m) => m.id === m1.id)?.status ?? '-'})`,
              values: [`${time(before.triagedAt)} · ESI ${before.level ?? '-'} · ${zones.get(before.loc ?? -1) ?? before.loc}`, `${time(e1?.triagedAt)} · ESI ${e1?.triageLevel ?? '-'} · ${zones.get(e1?.currentLocationId ?? -1) ?? e1?.currentLocationId}`],
              same: (e1?.triagedAt ?? null) === before.triagedAt && (e1?.triageLevel ?? null) === before.level && (e1?.currentLocationId ?? null) === before.loc,
            },
            ...[bySeq(2), m3, m4].map((m) => {
              const e = board.find((x) => x.en === m.en);
              const st = incident.members.find((x) => x.id === m.id)?.status ?? '-';
              return { label: `รายที่ ${two(m.registrationSeq!)} (${st})`, values: ['READY → ESI 3 · Urgency', `${time(e?.triagedAt)} · ESI ${e?.triageLevel ?? '-'} · ${zones.get(e?.currentLocationId ?? -1) ?? e?.currentLocationId}`], same: !!e?.triagedAt && e.triageLevel === 3 && zones.get(e.currentLocationId ?? -1) === ZONE };
            }),
          ];
          expect(rows.slice(1).every((r) => r.same), 'รายที่ READY ต้องถูก triage').toBe(true);
        }).toPass({ timeout: 120_000 });
        note(`${TC['010']} สถานะเหตุการณ์หลังส่ง`, `${incident.status} · ${JSON.stringify(incident.counts)}`);
        await page.reload();
        await expect(memberRow(page, m1.hn)).toBeVisible({ timeout: 90_000 });
        await markEvidence(expected(memberRow(page, m1.hn), 'รายที่ 01'), ...[bySeq(2), m3, m4].map((m) => expected(memberRow(page, m.hn))));
        await showCompareTable(page, `${TC['010']} ผล triage ก่อน / หลังส่งทั้งเหตุการณ์ (API บอร์ด ER)`, ['ก่อนส่ง / ที่ควรเป็น', 'หลังส่ง'], rows, { side: 'right', width: '860px' });
        expect(rows[0].same, 'รายที่ 01 ต้องมีผล triage และตำแหน่งเท่าเดิม').toBe(true);
      });
      await hideCompareTable(page);
      }
      test.info().annotations.push({ type: 'คำสั่งที่เขียนข้อมูล', description: writes.join(' | ') });
      finish();
    },
  );

  test(
    'เหตุการณ์ไม่กรอกจำนวนผู้ป่วย ทำงานเหมือนเดิม + เพิ่มผู้ป่วยใหม่ตาม flow ลงทะเบียนหมู่ (Super_User)',
    { tag: ['@SBH-2470', '@SBH-2565'], annotation: [linear('SBH-2565')] },
    async ({ page }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const writes = trackWrites(page);
      const { note } = makeRunner(page);
      const name = `ไม่กรอกจำนวน AUTO${stamp()}`;
      await gotoErDashboard(page);
      await startClip(page, 'TC-001');
      await checkStep(page, `${TC['001']} ขั้น 2-3 สร้างเหตุการณ์ กรอกชื่อ / เวลา / สถานที่ / อาการสำคัญร่วม — เว้นช่องจำนวนผู้ป่วยว่าง`, async () => {
        const { dialog, count } = await openCreateIncident(page, { name, location: LOCATION, chiefComplaint: SHARED_CC });
        await expect(count).toHaveValue('');
        await markEvidence(filled(dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ })), filled(dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ })), expected(count, 'เว้นว่าง'), clicked(dialog.getByRole('button', { name: 'สร้าง', exact: true })));
        await snapEvidence(page, 'ก่อนกด — สร้างเหตุการณ์ไม่กรอกจำนวน');
      });
      let id = '';
      await checkStep(page, `${TC['001']} ขั้น 4 กดสร้าง → สร้างสำเร็จ ไม่มีผู้ป่วยถูกลงทะเบียน ไม่มี progress "กำลังลงทะเบียน"`, async () => {
        const r = await submitCreateIncident(page, createDialog(page));
        id = r.id;
        note('เหตุการณ์ไม่กรอกจำนวน', `${r.created.displayCode} · ${name} · registration ${JSON.stringify(r.created.registration)}`);
        await page.waitForTimeout(5_000);
        const incident = await fetchIncident(page, authorization, id);
        note('หลังสร้าง 5 วินาที', `registration ${JSON.stringify(incident.registration)} · member ${incident.members.length} ราย`);
        await expect(main.getByText(/กำลังลงทะเบียน/)).toHaveCount(0);
        await markEvidence(expected(main.getByText(r.created.displayCode, { exact: false }).first(), 'สร้างสำเร็จ'), expected(main.getByText(/สำเร็จ \d+ จาก \d+ ราย/).first(), 'ไม่มีผู้ป่วย'));
        expect(incident.registration, 'ไม่กรอกจำนวน = ไม่มีการลงทะเบียนอัตโนมัติ').toBeNull();
        expect(incident.members).toHaveLength(0);
      });
      await checkStep(page, `${TC['001']} เพิ่ม member ตาม flow ลงทะเบียนหมู่ปัจจุบัน — ผู้ป่วยใหม่ (AUTO) → เปิด Visit ER → อยู่ในรายการของเหตุการณ์`, async () => {
        const patient = newTestPatient('Mci2470');
        await main.getByRole('button', { name: 'plus ผู้ป่วยใหม่' }).click();
        await expect(page.getByRole('textbox', { name: '* ชื่อ', exact: true })).toBeVisible({ timeout: 15_000 });
        const prefix = page.getByRole('combobox', { name: '* คำนำหน้าชื่อ', exact: true });
        if (await prefix.count()) {
          await prefix.click();
          await pick(page.locator('.ant-select-dropdown:visible .ant-select-item-option').first());
        }
        await page.getByRole('textbox', { name: '* เลขบัตรประชาชน', exact: true }).fill(patient.citizenId);
        await page.getByRole('textbox', { name: '* ชื่อ', exact: true }).fill(patient.firstName);
        await page.getByRole('textbox', { name: '* นามสกุล', exact: true }).fill(patient.familyName);
        await page.getByRole('combobox', { name: '* เพศ', exact: true }).click();
        await pick(page.locator('.ant-select-dropdown:visible .ant-select-item-option[title="ชาย"]'));
        const birth = page.getByRole('textbox', { name: '* วัน/เดือน/ปีเกิด', exact: true });
        await birth.fill(patient.birthDate);
        await birth.press('Tab');
        const submit = page.getByRole('button', { name: 'ลงทะเบียนผู้ป่วย' });
        await markEvidence(filled(page.getByRole('textbox', { name: '* ชื่อ', exact: true })), filled(page.getByRole('textbox', { name: '* นามสกุล', exact: true })), clicked(submit));
        await snapEvidence(page, 'ก่อนกด — ลงทะเบียนผู้ป่วยใหม่ในเหตุการณ์');
        await submit.click();
        const visit = await confirmOpenErVisit(page, openVisitDialog(page));
        note('ผู้ป่วยที่เพิ่ม', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
        await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
        await expect(memberRow(page, visit.hn)).toBeVisible({ timeout: 30_000 });
        const incident = await fetchIncident(page, authorization, id);
        note('member หลังเพิ่ม', incident.members.map((m) => `${m.patientName} · HN ${m.hn} · registrationSeq ${m.registrationSeq ?? '-'} · ${m.status}`).join(' | '));
        await markEvidence(expected(memberRow(page, visit.hn), 'เพิ่มเป็น member'));
        expect(incident.members.map((m) => m.hn)).toEqual([visit.hn]);
      });
      test.info().annotations.push({ type: 'คำสั่งที่เขียนข้อมูล', description: writes.join(' | ') });
    },
  );

  test(
    'เหตุการณ์ N=50: ส่งไม่ได้ระหว่างลงทะเบียน · พร้อมส่งรายที่เสร็จแล้วได้ทันที · progress กำลังลงทะเบียน x/50 (Super_User)',
    { tag: ['@SBH-2470', '@SBH-2470-N50', '@SBH-2577', '@SBH-2571', '@SBH-2570'], annotation: ['SBH-2577', 'SBH-2571', 'SBH-2570'].map(linear) },
    async ({ page }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const writes = trackWrites(page);
      const { note, soft, finish } = makeRunner(page);
      const name = `ชนหมู่50 AUTO${stamp()}`;
      const banner = main.getByText(/กำลังลงทะเบียน \d+\/50/).first();
      await gotoErDashboard(page);
      await startClip(page, 'TC-013');
      const { dialog, count } = await openCreateIncident(page, { name, location: LOCATION, chiefComplaint: SHARED_CC, headcount: 50 });
      await markEvidence(filled(count, 'จำนวนผู้ป่วย 50'), clicked(dialog.getByRole('button', { name: 'สร้าง', exact: true })));
      await snapEvidence(page, 'ก่อนกด — สร้างเหตุการณ์ N=50');
      // ตัวเก็บ progress บนจอ (ในเบราว์เซอร์ ทุก 250 ms) — หน้าเปลี่ยนแบบ SPA จึงอยู่ต่อหลังกดสร้าง
      await page.evaluate(() => {
        const w = window as unknown as { __mci: [number, string, number][] };
        w.__mci = [];
        setInterval(() => {
          const t = document.querySelector('main')?.textContent ?? '';
          w.__mci.push([Date.now(), t.match(/กำลังลงทะเบียน \d+\/\d+/)?.[0] ?? '', document.querySelectorAll('main li.ant-list-item h4').length]);
        }, 250);
      });
      const r = await submitCreateIncident(page, dialog);
      const id = r.id;
      const t0 = Date.now();
      note('เหตุการณ์ N=50', `${r.created.displayCode} · ${name} · id ${id} · กดสร้าง → หน้าเหตุการณ์ ${(r.navigateMs / 1000).toFixed(1)} วินาที`);
      // ตัวเก็บสถานะจาก API ขนานกัน (ทุก 1 วินาที จนจบ)
      const apiLog: [number, string, number, number][] = [];
      const apiPoll = (async () => {
        for (let i = 0; i < 240; i++) {
          const inc = await fetchIncident(page, authorization, id).catch(() => undefined);
          if (inc) apiLog.push([Date.now() - t0, inc.registration?.status ?? '-', inc.registration?.done ?? 0, inc.members.length]);
          if (inc && inc.registration?.status !== 'RUNNING') return inc;
          await page.waitForTimeout(1_000);
        }
        return undefined;
      })();
      const running = () => apiLog.at(-1)?.[1] === 'RUNNING';

      // ─── TC-013 (รอบเก็บ TC-007 ซ้ำ: SBH2470_SKIP=013 — ขั้นนี้กินเวลา ~6 วินาที ระบบลงทะเบียน 50 รายเสร็จใน ~19 วินาที)
      if (!SKIP.has('013')) await soft(`${TC['013']} ขั้น 3 ระหว่างที่ยังแสดง "กำลังลงทะเบียน" ลองกด ส่ง Triage ทั้งเหตุการณ์ → ปุ่มถูก disable กดไม่ได้`, async () => {
        await expect(banner).toBeVisible({ timeout: 15_000 });
        const submitCalls: string[] = [];
        const onReq = (req: { method(): string; url(): string }) => {
          if (req.method() === 'POST' && /\/submit$/.test(req.url())) submitCalls.push(req.url());
        };
        page.on('request', onReq);
        const text = await banner.textContent();
        // รายการ member ยาวขึ้นระหว่างลงทะเบียน → ปุ่มเลื่อนลงนอกจอ กรอบไปตกที่แถว member (Prod 6 พ.ย.)
        await submitAllButton(page).scrollIntoViewIfNeeded();
        await markEvidence(expected(banner, 'กำลังลงทะเบียน'), expected(submitAllButton(page), 'disable'));
        await snapEvidence(page, `${TC['013']} ระหว่างลงทะเบียน ${text}`);
        await submitAllButton(page).click({ force: true, timeout: 3_000 }).catch(() => undefined);
        await page.waitForTimeout(1_000);
        page.off('request', onReq);
        note(`${TC['013']} ตอนลองกด`, `${text} · ปุ่ม disabled=${await submitAllButton(page).isDisabled()} · POST submit ${submitCalls.length} ครั้ง · พร้อมส่ง ${(await main.getByText(/พร้อมส่ง \d+ ราย/).first().textContent())?.match(/พร้อมส่ง \d+ ราย/)?.[0]}`);
        await expect(submitAllButton(page)).toBeDisabled();
        expect(submitCalls).toEqual([]);
      });

      // ─── TC-007
      await startClip(page, 'TC-007');
      const first = page.getByRole('main').getByRole('listitem').filter({ has: page.getByRole('heading', { name: /^(1\.|01) / }) }).first(); // หัวแถว "1. …" (31 ต.ค.) → "01 …" (SBH-3609 · 4 พ.ย.)
      await soft(`${TC['007']} ขั้น 3-4 ระหว่าง "กำลังลงทะเบียน" เลือก member คนแรกที่สร้างเสร็จ → triage (ESI 3 + ${ZONE}) → พร้อมส่ง ได้ทันที`, async () => {
        await expect(first).toBeVisible({ timeout: 30_000 });
        const hn = ((await first.innerText()).match(/HN (\d+)/) ?? [])[1];
        const atSelect = `${(await banner.textContent().catch(() => '')) || '(ไม่มีป้าย)'} · API ${apiLog.at(-1)?.slice(1).join(' / ')}`;
        await selectMember(page, hn);
        await fillMemberTriage(page, 3, ZONE);
        const bannerText = (await banner.textContent().catch(() => '')) || '(ป้ายหายแล้ว)';
        const status = await pressReady(page, 3, ZONE, `ก่อนกด — พร้อมส่ง รายที่ 1 ระหว่าง ${bannerText}`);
        await expect(memberRow(page, hn)).toContainText('READY', { timeout: 20_000 });
        const atReady = `${(await banner.textContent().catch(() => '')) || '(ป้ายหายแล้ว)'} · API ${apiLog.at(-1)?.slice(1).join(' / ')}`;
        note(`${TC['007']} จังหวะ`, `เลือกรายที่ 1 (HN ${hn}) ตอน ${atSelect} · POST ready ${status} · READY ตอน ${atReady}`);
        await markEvidence(expected(memberRow(page, hn), 'READY'), ...(await banner.isVisible() ? [expected(banner, 'ยังลงทะเบียนอยู่')] : []));
        await snapEvidence(page, `${TC['007']} รายที่ 1 READY`);
        expect(running() || /กำลังลงทะเบียน/.test(atReady), 'ตอนรายที่ 1 เป็น READY ระบบต้องยังลงทะเบียนอยู่').toBe(true);
      });

      // ─── TC-006
      await startClip(page, 'TC-006');
      await soft(`${TC['006']} ขั้น 3 ดูหน้าเหตุการณ์จนลงทะเบียนเสร็จ — "กำลังลงทะเบียน x/50" x เพิ่มขึ้นเรื่อยๆ และ member โผล่ในรายการระหว่างนั้น`, async () => {
        if (await banner.isVisible()) {
          await markEvidence(expected(banner, 'x/50'));
          await snapEvidence(page, `${TC['006']} ระหว่างลงทะเบียน ${await banner.textContent()}`);
        }
        const final = await apiPoll;
        await expect(banner).toBeHidden({ timeout: 60_000 });
        const ui = await page.evaluate(() => (window as unknown as { __mci: [number, string, number][] }).__mci);
        const seen: { t: number; text: string; rows: number }[] = [];
        for (const [t, text, rows] of ui) if (text && seen.at(-1)?.text !== text) seen.push({ t: t - t0, text, rows });
        const done = ui.filter(([, text]) => text).at(-1);
        note(`${TC['006']} progress บนจอ (ค่าที่เปลี่ยน)`, seen.map((s) => `${(s.t / 1000).toFixed(1)}s ${s.text} (รายการ ${s.rows})`).join(' · ') || '(ไม่เห็นป้าย)');
        note(`${TC['006']} API`, apiLog.map(([t, st, d, n]) => `${(t / 1000).toFixed(0)}s ${st} ${d}/${n}`).join(' · '));
        note(`${TC['006']} ผลลงทะเบียน`, `${JSON.stringify(final?.registration)} · member ${final?.members.length} ราย · ป้ายหายที่ ${done ? ((done[0] - t0) / 1000).toFixed(1) : '-'} วินาที`);
        const picks = [seen[0], seen[Math.floor(seen.length / 2)], seen.at(-1)].filter((s, i, a) => s && a.indexOf(s) === i);
        const rows: CompareRow[] = picks.map((s) => ({ label: `${(s!.t / 1000).toFixed(1)} วินาที`, values: [s!.text, `${s!.rows} ราย`], same: true }));
        rows.push({ label: 'จบ', values: [final?.registration?.status ?? '-', `${final?.members.length ?? 0} ราย`], same: final?.registration?.status === 'FINISHED' && final?.members.length === 50 });
        await markEvidence(expected(main.getByText(/สำเร็จ \d+ จาก \d+ ราย/).first(), 'จาก 50 ราย'));
        await showCompareTable(page, `${TC['006']} ป้าย "กำลังลงทะเบียน" ที่เห็นบนจอ (${seen.length} ค่า)`, ['ข้อความบนจอ', 'member ในรายการ'], rows, { side: 'right', width: '700px' });
        const xs = seen.map((s) => Number(s.text.match(/(\d+)\/50/)![1]));
        expect(xs.length, 'ต้องเห็นค่า x อย่างน้อย 2 ค่า').toBeGreaterThanOrEqual(2);
        expect(xs, 'x ต้องเพิ่มขึ้นเรื่อยๆ').toEqual([...xs].sort((a, b) => a - b));
        expect(seen.at(-1)!.rows, 'member ต้องโผล่ในรายการระหว่างลงทะเบียน').toBeGreaterThan(seen[0].rows);
        expect(final?.registration?.status).toBe('FINISHED');
        expect(final?.members).toHaveLength(50);
      });
      await hideCompareTable(page);
      test.info().annotations.push({ type: 'คำสั่งที่เขียนข้อมูล', description: writes.join(' | ') });
      finish();
    },
  );
});

/** ESI 3 + โซน ในฟอร์มของ member ที่เลือกอยู่ (ใช้ในเคสที่ต้องดูว่าปุ่มพร้อมส่งกดได้ไหม — ไม่บังคับให้ปุ่มกดได้) */
async function esiButton3(page: Page) {
  await choose(esiButton(page, 3));
  await choose(zoneButton(page, ZONE));
  await page.waitForTimeout(1_500);
}
