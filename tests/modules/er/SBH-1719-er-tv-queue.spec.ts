import type { Locator, Page } from '@playwright/test';
import { dismissToast, expectOk, fetchBoard, gotoErDashboard, waitForApi, type ErBoardEncounter, type ErVisit } from '../../../helpers/functions/er';
import { cprButton, openCprForm, saveCprEvent } from '../../../helpers/functions/er-cpr';
import { erListRow, filterErListByHn, gotoErPatientList } from '../../../helpers/functions/er-list';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, erTriageSaveButton, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import {
  colorName,
  fetchTvBoard,
  openTvWindow,
  readAllTvPatientPages,
  readTvActiveCard,
  readTvPage,
  readTvPatientRows,
  toHex,
  tvActiveArea,
  tvActiveNumber,
  tvAnnouncement,
  tvCallSection,
  tvFullscreenButton,
  tvHeader,
  tvHistory,
  tvHistoryCards,
  tvLatestTag,
  tvPageLabel,
  tvPatientsSection,
  tvResuscitationTag,
  tvSegments,
  watchTvPaging,
  type TvPatientRow,
} from '../../../helpers/functions/er-tv-queue';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, gotoVisit } from '../../../mock-data/uat-play';

// SBH-1719 [ER][QUEUE] หน้าจอแสดง QUEUE List สำหรับผู้ป่วย (จอ ER TV สาธารณะ /cortex/public/er/tv-queue)
// ชุด EXE SBH-2978 → SC HPY SBH-2979 (TC-001…015 = SBH-2981…2995) · SC EDG SBH-2980 (TC-016…018 = SBH-2996…2998)
// ผู้ใช้ตอบ 29 ต.ค. 2026: สร้างผู้ป่วย AUTO 3 ราย + เรียกคิว + Start/Stop CPR บน dev-x · TC-014 (ไม่มีเมนูประกาศ) ลง Fail ·
//   Empty state: เอาผู้ป่วยออกทั้ง Board แล้วเทส TC-018 (TC-016 / 017 ทำไม่ได้ — คิวบนจอไม่ผูกกับผู้ป่วยและไม่มีปุ่มเคลียร์คิว)
// เทส 1 (TC-001…015): หน้าต่างเจ้าหน้าที่ (Super_User) + หน้าต่างจอ TV แยก (ไม่มี session = หน้าสาธารณะ)
//   ผู้ป่วย A = ESI 3 (เร่งด่วน) · B = ESI 4 (กึ่งเร่งด่วน) · C = ESI 5 (ไม่เร่งด่วน) → กด "เรียกคิว" ในรายการผู้ป่วย ER ทีละราย
//   คลิป: จอ TV = clip-TC-0xx.webm · ขั้นของเจ้าหน้าที่ = clip-TC-0xx-staff.webm (แบบ TC 2 หน้าต่าง)
//   ไม่ปิด Visit (R11 · ผู้ใช้ให้เคลียร์ทั้ง Board ตอนทำ TC-018 ด้วย npm run er:close-visits:dev)
// เทส 2 (TC-018): รันหลังปิด Visit ทั้ง Board แล้วเท่านั้น — ต้องใส่ SBH1719_EMPTY=1
// รัน (dev-x): npx playwright test --headed --grep @SBH-1719
// SBH1719_VISITS=<HN>,<VN>,<EN>;<HN>,<VN>,<EN>;<HN>,<VN>,<EN> = ใช้ผู้ป่วย A;B;C เดิม (คัดกรองแล้ว) · SBH1719_ONLY=1,3,… = เล่นเฉพาะ TC · SBH1719_WAIT_MS = เวลารอของ TC-002 (ตั้งต้น 120000)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ISSUE: Record<number, string> = Object.fromEntries(Array.from({ length: 18 }, (_, i) => [i + 1, `SBH-${2981 + i}`]));
const TC = (n: number) => `TC-${String(n).padStart(3, '0')} (${ISSUE[n]})`;
const CLIP = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const PAGE_MS = 15_000;
/** ตารางเทียบทับเฉพาะการ์ดฝั่งซ้าย (TC ที่ Expected อยู่ฝั่งขวา) */
const NARROW = { side: 'left' as const, width: '730px', top: '130px' };

type Patient = { key: 'A' | 'B' | 'C'; level: 3 | 4 | 5; urgency: string; color: string; visit?: ErVisit; fullName?: string; queue?: string };
type BoardRow = ErBoardEncounter & { vn?: string; an?: string | null; queueExam?: { qDisplay?: string } | null };

test.describe('SBH-1719 จอ ER TV สำหรับผู้ป่วยและญาติ (dev-x)', () => {
  test.describe.configure({ timeout: 2_700_000 });

  test(
    'TC-001…015: เรียกคิวผู้ป่วย AUTO 3 ราย (ESI 3 / 4 / 5) แล้วดูจอ TV — คิว · สี · ชื่อ mask · แบ่งหน้า · กู้ชีพ · ประกาศ · เต็มจอ',
    {
      tag: ['@SBH-1719', ...Array.from({ length: 15 }, (_, i) => `@${ISSUE[i + 1]}`)],
      annotation: [linear('SBH-1719'), ...Array.from({ length: 15 }, (_, i) => linear(ISSUE[i + 1]))],
    },
    async ({ page, browser }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const only = (process.env.SBH1719_ONLY ?? '').split(',').filter(Boolean).map(Number);
      const runs = (n: number) => !only.length || only.includes(n);
      const reuse = (process.env.SBH1719_VISITS ?? '').split(';').filter(Boolean).map((v) => v.split(','));
      const waitMs = Number(process.env.SBH1719_WAIT_MS ?? 120_000);
      const patients: Patient[] = [
        { key: 'A', level: 3, urgency: 'เร่งด่วน', color: 'ส้ม' },
        { key: 'B', level: 4, urgency: 'กึ่งเร่งด่วน', color: 'เขียว' },
        { key: 'C', level: 5, urgency: 'ไม่เร่งด่วน', color: 'เทา' },
      ];
      const [A, B, C] = patients;

      // ---------- หน้าต่างจอ TV (ไม่มี session) ----------
      const tv = await openTvWindow(browser);
      const staff = makeRunner(page);
      const screen = makeRunner(tv);
      const { note } = staff;
      try {
        // ---------- เตรียมข้อมูล: ผู้ป่วย AUTO 3 ราย + คัดกรอง ESI 3 / 4 / 5 ----------
        await gotoErDashboard(page);
        for (const [i, p] of patients.entries()) {
          if (reuse[i]?.length === 3) {
            p.visit = { hn: reuse[i][0], vn: reuse[i][1], en: reuse[i][2] };
            continue;
          }
          await checkStep(page, `เตรียมข้อมูล ผู้ป่วย ${p.key}: เปิด Visit ER + คัดกรอง ESI ${p.level} (${p.urgency})`, async () => {
            const patient = newTestPatient(`TvQ${p.key}`);
            // หลังคัดกรองรายก่อน หน้าค้างที่หน้า Visit — ปุ่ม "+ คัดกรอง" อยู่บน Dashboard
            if (!page.url().includes('/er/dashboard')) await gotoErDashboard(page);
            p.visit = await registerAndOpenErVisit(page, patient);
            await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true }), 'หลังเปิด Visit ต้องอยู่หน้าคัดกรอง ER').toBeVisible({ timeout: 60_000 });
            await dismissToast(page, 'สร้าง Visit สำเร็จ');
            await fillErTriageForm(page, { level: p.level, vitals: VITALS_NORMAL });
            await markEvidence(filled(erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }), `ESI ${p.level}`), clicked(erTriageSaveButton(page)));
            await snapEvidence(page, `ก่อนกด — คัดกรอง ${p.key} ESI ${p.level}`);
            await saveErTriageForm(page, `บันทึกคัดกรอง ${p.key} (${p.visit.en})`);
          });
        }
        // ชื่อเต็ม + เลขคิวจากบอร์ด (อ่านอย่างเดียว)
        const board = (await fetchBoard(page, authorization)) as BoardRow[];
        for (const p of patients) {
          const enc = board.find((e) => e.en === p.visit!.en);
          if (!enc) throw new Error(`ไม่เจอผู้ป่วย ${p.key} (${p.visit!.en}) บนบอร์ด ER`);
          p.fullName = [enc.patient?.firstName, enc.patient?.familyName].filter(Boolean).join(' ');
          p.queue = enc.queueExam?.qDisplay;
          note(`ผู้ป่วย ${p.key}`, `${p.fullName} · ESI ${p.level} · HN ${p.visit!.hn} · ${p.visit!.vn} · ${p.visit!.en} · คิว ${p.queue ?? '-'}`);
        }
        note('ใช้ผู้ป่วยเดิมรอบถัดไป', `SBH1719_VISITS=${patients.map((p) => `${p.visit!.hn},${p.visit!.vn},${p.visit!.en}`).join(';')}`);

        /** เจ้าหน้าที่: รายการผู้ป่วย ER → กรอง HN → กด "เรียกคิว <เลขคิว>" → แจ้งเตือน "ส่งคิว … ไปยังจอ ER แล้ว" */
        const callQueue = async (n: number, p: Patient) => {
          await checkStep(page, `${TC(n)} ขั้น เจ้าหน้าที่ ER: รายชื่อผู้ป่วย ER > กดเรียกคิวของผู้ป่วย ${p.key}`, async () => {
            await gotoErPatientList(page);
            await filterErListByHn(page, p.visit!.hn);
            const row = erListRow(page, p.visit!.en);
            await expect(row, `ต้องเห็นแถวของผู้ป่วย ${p.key} ในรายการ`).toBeVisible({ timeout: 60_000 });
            const button = row.getByRole('button', { name: /^เรียกคิว / });
            await expect(button, 'ต้องมีปุ่มเรียกคิว (สิทธิ์ queue-exam:call)').toBeVisible();
            p.queue = ((await button.getAttribute('aria-label')) ?? '').replace(/^เรียกคิว\s*/, '');
            await markEvidence(expected(row, `ผู้ป่วย ${p.key} · ESI ${p.level}`), clicked(button, `เรียกคิว ${p.queue}`));
            await snapEvidence(page, `ก่อนกด — เรียกคิว ${p.key}`);
            const called = waitForApi(page, 'POST', /\/cortex-api\/er\/encounters\/[^/]+\/queue-call$/, 30_000);
            await button.click();
            await expectOk(await called, `เรียกคิว ${p.queue}`);
            const toast = page.getByText(`ส่งคิว ${p.queue} ไปยังจอ ER แล้ว`, { exact: true }).first();
            await toast.waitFor({ state: 'visible', timeout: 10_000 });
            await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
            await markEvidence(alerted(toast));
            await snapEvidence(page, `หลังกด — เรียกคิว ${p.key}`);
          });
          note(`${TC(n)} เรียกคิว`, `ผู้ป่วย ${p.key} คิว ${p.queue}`);
        };

        /** จอ TV: รอการ์ดคิวที่กำลังเรียกเปลี่ยนเป็นคิวนี้ (จอดึงข้อมูลทุก 3 วินาที) */
        const waitActive = (queue: string) => expect.poll(async () => (await tvActiveNumber(tv).textContent())?.trim(), { message: `จอ TV ต้องขึ้นคิว ${queue} ในการ์ดกำลังเรียก`, timeout: 30_000 }).toBe(queue);

        /** ตรวจสีและคำของการ์ดที่กำลังเรียก เทียบกับ Expected (TC-003 / 004 / 005) */
        const checkUrgency = async (n: number, p: Patient) => {
          await screen.soft(`${TC(n)} ขั้น 2 ดูคิวของผู้ป่วย ${p.key} (ESI ${p.level}) บนจอ TV ฝั่ง "ดูคิวพบแพทย์"`, async () => {
            await waitActive(p.queue!);
            const card = (await readTvActiveCard(tv))!;
            const rows: CompareRow[] = [
              { label: 'เลขคิว', values: [p.queue!, card.number], same: card.number === p.queue },
              { label: 'แถบสี', values: [p.color, `${colorName(card.markColor)} (${toHex(card.markColor)})`], same: colorName(card.markColor) === p.color },
              { label: 'คำความเร่งด่วน', values: [p.urgency, card.urgency || '(ไม่มี)'], same: card.urgency === p.urgency },
              { label: 'สีตัวอักษรคำ', values: [p.color, `${colorName(card.urgencyColor)} (${toHex(card.urgencyColor)})`], same: colorName(card.urgencyColor) === p.color },
              { label: 'ระดับคัดกรอง', values: [`ESI ${p.level}`, card.triage], same: card.triage === `ESI ${p.level}` },
            ];
            await showCompareTable(tv, `${ISSUE[n]} คิวผู้ป่วย ${p.key}`, ['Expected', 'จอ TV'], rows, { side: 'right' });
            const dl = tvActiveArea(tv).locator('dl');
            // กรอบเดียวรอบแถวข้อมูล (ป้ายแยกช่องทับหัว "ความเร่งด่วน" — run 2)
            await markEvidence(expected(tvActiveNumber(tv), `คิว ${p.key}`), expected(dl, `แถบสี + คำความเร่งด่วน (Expected ${p.color} · ${p.urgency})`));
            await snapEvidence(tv, `ผล — สีคิว ${p.key} ESI ${p.level}`);
            await holdForClip(tv, 2_500);
            note(`${TC(n)} การ์ดคิว`, rows.map((r) => `${r.label}: Expected ${r.values[0]} · จอ ${r.values[1]}`).join(' | '));
            await hideCompareTable(tv);
            expect(rows.filter((r) => !r.same && r.label !== 'สีตัวอักษรคำ').map((r) => `${r.label}: จอ ${r.values[1]} (Expected ${r.values[0]})`), `Expected: คิวแสดงแถบสี${p.color} พร้อมคำว่า "${p.urgency}"`).toEqual([]);
          });
        };

        // ---------- TC-001 แสดงคิวที่กำลังเรียก 1 คิว ----------
        if (runs(1) || runs(2) || runs(3)) {
          await startClip(tv, CLIP(1));
          await checkStep(tv, `${TC(1)} ขั้น 1 เปิดจอ ER TV ค้างไว้ (ก่อนเรียกคิว)`, async () => {
            await markEvidence(expected(tvActiveArea(tv), 'คิวที่กำลังเรียกก่อนกด'));
            await snapEvidence(tv, 'ก่อนเรียกคิว — จอ TV');
          });
          await startClip(page, `${CLIP(1)}-staff`);
          await callQueue(1, A);
          await screen.soft(`${TC(1)} ขั้น 3 จอ TV: การ์ด "กำลังเรียก · คิวล่าสุด" แสดงคิวของผู้ป่วย A เพียง 1 คิว`, async () => {
            await waitActive(A.queue!);
            await expect(tvLatestTag(tv)).toBeVisible();
            await expect(tvActiveArea(tv).locator('strong'), 'การ์ดกำลังเรียกต้องมีเลขคิวเดียว').toHaveCount(1);
            await markEvidence(expected(tvLatestTag(tv), 'กำลังเรียก · คิวล่าสุด'), expected(tvActiveNumber(tv), `คิวผู้ป่วย A ${A.queue}`));
            await snapEvidence(tv, 'ผล — คิว A ขึ้นจอ');
            await holdForClip(tv, 2_000);
          });
        }

        // ---------- TC-002 คงคิวไว้ 2 นาที ----------
        if (runs(2)) {
          await startClip(tv, CLIP(2));
          await screen.soft(`${TC(2)} ขั้น 2 ไม่เรียกคิวใหม่ รอดูจอ ${Math.round(waitMs / 1000)} วินาที — คิว A ต้องค้างตลอด`, async () => {
            const start = Date.now();
            const samples: CompareRow[] = [];
            let k = 0;
            while (Date.now() - start <= waitMs) {
              const at = Math.round((Date.now() - start) / 1000);
              const shown = (await tvActiveNumber(tv).textContent())?.trim() ?? '(ไม่มี)';
              const left = await readTvPage(tvHistory(tv));
              const right = await readTvPage(tvPatientsSection(tv));
              samples.push({ label: `วินาทีที่ ${at}`, values: [shown, `ซ้าย ${left.page}/${left.total} · ขวา ${right.page}/${right.total}`], same: shown === A.queue });
              if (k % 6 === 0) {
                await markEvidence(expected(tvActiveNumber(tv), `วินาทีที่ ${at}: ${shown}`), expected(tvPageLabel(tvHistory(tv)), 'หน้าซ้าย'), expected(tvPageLabel(tvPatientsSection(tv)), 'หน้าขวา'));
                await snapEvidence(tv, `ระหว่างรอ — วินาทีที่ ${at}`);
              }
              k++;
              await tv.waitForTimeout(10_000 - ((Date.now() - start) % 10_000));
            }
            await showCompareTable(tv, `${ISSUE[2]} คิวที่กำลังเรียก (ทุก 10 วินาที)`, ['การ์ดกำลังเรียก', 'หน้าที่แสดง'], samples, { side: 'bottom' });
            await markEvidence(expected(tvActiveNumber(tv), `ยังเป็น ${A.queue}`));
            await snapEvidence(tv, 'ผล — คิว A ค้างครบเวลา');
            await holdForClip(tv, 2_500);
            await hideCompareTable(tv);
            const changes = new Set(samples.map((s) => s.values[1])).size;
            note(`${TC(2)} ผล`, `ตรวจ ${samples.length} ครั้งใน ${Math.round(waitMs / 1000)} วินาที · คิวที่เห็น ${[...new Set(samples.map((s) => s.values[0]))].join(', ')} · หน้าเปลี่ยน ${changes} แบบ`);
            expect(samples.filter((s) => !s.same).map((s) => `${s.label}: ${s.values[0]}`), `Expected: การ์ดกำลังเรียกยังแสดงคิว ${A.queue} ตลอด`).toEqual([]);
          });
        }

        // ---------- TC-003 / 004 / 005 สีตามความเร่งด่วน ----------
        if (runs(3)) {
          await startClip(tv, CLIP(3));
          note(`${TC(3)} ขั้น 1`, `ใช้การเรียกคิวของ TC-001 (ผู้ป่วย A คัดกรอง ESI 3 "เร่งด่วน")`);
          await checkUrgency(3, A);
        }
        for (const [n, p] of [[4, B], [5, C]] as const) {
          if (!runs(n)) continue;
          await startClip(tv, CLIP(n));
          await startClip(page, `${CLIP(n)}-staff`);
          await callQueue(n, p);
          await checkUrgency(n, p);
        }

        // ---------- TC-006 ตารางผู้ป่วย ----------
        if (runs(6)) {
          await startClip(tv, CLIP(6));
          await screen.soft(`${TC(6)} ขั้น 2 ฝั่ง "ดูสถานะผู้ป่วยที่รักษาอยู่": คอลัมน์ ลำดับ · ชื่อ - สกุล · สถานะการรักษา`, async () => {
            const section = tvPatientsSection(tv);
            const headers = (await section.locator('thead th').allInnerTexts()).map((t) => t.trim());
            const rows = await readTvPatientRows(tv);
            const { page: shownPage } = await readTvPage(section);
            const first = rows[0]?.seq ?? 0;
            const sequential = rows.every((r, i) => r.seq === first + i);
            const statuses = rows.every((r) => r.status.length > 0 && !r.status.includes('\n'));
            const table: CompareRow[] = [
              { label: 'คอลัมน์', values: ['ลำดับ · ชื่อ - สกุล · สถานะการรักษา', headers.join(' · ')], same: headers.join('|') === 'ลำดับ|ชื่อ - สกุล|สถานะการรักษา' },
              { label: `ลำดับ (หน้า ${shownPage})`, values: ['เรียง 1, 2, 3, …', rows.map((r) => r.seq).join(', ')], same: sequential && (shownPage > 1 || first === 1) },
              { label: 'สถานะ 1 ค่าต่อแถว', values: ['มี 1 ค่า', [...new Set(rows.map((r) => r.status))].join(' / ')], same: statuses },
            ];
            await showCompareTable(tv, `${ISSUE[6]} ตารางผู้ป่วย`, ['Expected', 'จอ TV'], table, NARROW);
            await markEvidence(expected(section.locator('thead'), 'หัวตาราง'), expected(section.locator('tbody'), 'ลำดับ + สถานะการรักษา'));
            await snapEvidence(tv, 'ผล — ตารางผู้ป่วย');
            await holdForClip(tv, 2_500);
            await hideCompareTable(tv);
            note(`${TC(6)} ผล`, table.map((r) => `${r.label}: ${r.values[1]}`).join(' | '));
            expect(table.filter((r) => !r.same).map((r) => `${r.label}: จอ "${r.values[1]}" (Expected "${r.values[0]}")`), 'Expected: ตาราง 3 คอลัมน์ · ลำดับเรียง · สถานะ 1 ค่า').toEqual([]);
          });
        }

        // ---------- TC-007 ชื่อแบบ mask ----------
        let allPages: Map<number, TvPatientRow[]> | undefined;
        const maskWord = (w: string) => {
          const chars = [...w.replace(/[ัิ-ฺ็-๎]/g, '')];
          return chars.length >= 4 ? `${[...w].slice(0, 3).join('')}xxxx` : chars.length >= 2 ? `${[...w].slice(0, -1).join('')}xxxx` : 'xxxx';
        };
        if (runs(7)) {
          await startClip(tv, CLIP(7));
          await screen.soft(`${TC(7)} ขั้น 2 หาแถวของผู้ป่วย A / B / C บนจอ TV — ชื่อต้องแสดงบางส่วนตามด้วย xxxx`, async () => {
            const table: CompareRow[] = [];
            allPages = await readAllTvPatientPages(tv, async (pg, rows) => {
              const ours = patients.filter((p) => rows.some((r) => r.queue === p.queue));
              if (!ours.length) return;
              const marks = ours.map((p) => expected(tvPatientsSection(tv).locator('tbody tr.ant-table-row').filter({ hasText: p.queue! }).locator('td').nth(2), `ผู้ป่วย ${p.key}`));
              await markEvidence(...marks, expected(tvPageLabel(tvPatientsSection(tv)), `หน้า ${pg}`));
              await snapEvidence(tv, `ชื่อ mask — หน้า ${pg}`);
            });
            const rows = [...allPages.values()].flat();
            for (const p of patients) {
              const row = rows.find((r) => r.queue === p.queue);
              const expectedMask = (p.fullName ?? '').split(/\s+/).map(maskWord).join(' ');
              table.push({ label: `ผู้ป่วย ${p.key} (${p.queue})`, values: [p.fullName ?? '', row?.name ?? '(ไม่เจอบนจอ)', expectedMask], same: !!row && row.name !== p.fullName && row.name === expectedMask });
            }
            await showCompareTable(tv, `${ISSUE[7]} ชื่อเต็ม vs จอ`, ['ชื่อเต็ม (บอร์ด ER)', 'จอ TV', 'ตามกติกา mask'], table, NARROW);
            await markEvidence(expected(tvPatientsSection(tv).locator('thead th').nth(2), 'ชื่อ - สกุล'));
            await snapEvidence(tv, 'ผล — เทียบชื่อ mask');
            await holdForClip(tv, 2_500);
            await hideCompareTable(tv);
            note(`${TC(7)} ผล`, table.map((r) => `${r.label}: "${r.values[0]}" → "${r.values[1]}"`).join(' | '));
            expect(table.filter((r) => !r.same).map((r) => `${r.label}: จอ "${r.values[1]}" (ชื่อเต็ม "${r.values[0]}")`), 'Expected: ชื่อ-สกุลแสดงบางส่วนตามด้วย xxxx ไม่แสดงชื่อเต็ม').toEqual([]);
          });
        }

        // ---------- TC-008 ไม่แสดง HN / AN / VN ----------
        if (runs(8)) {
          await startClip(tv, CLIP(8));
          await screen.soft(`${TC(8)} ขั้น 2 ดูจอทั้ง 2 ฝั่งทุกหน้า — ต้องไม่มี HN / AN / VN ของผู้ป่วย`, async () => {
            const encounters = (await fetchBoard(page, authorization)) as BoardRow[];
            const ids = [...new Set(encounters.flatMap((e) => [e.hn, e.vn ?? '', e.en, e.an ?? '']).filter((v) => v && v.length >= 5))];
            const texts = new Set<string>();
            const total = Math.max((await readTvPage(tvHistory(tv))).total, (await readTvPage(tvPatientsSection(tv))).total);
            const until = Date.now() + PAGE_MS * total + 3_000;
            const seen = new Set<string>();
            while (Date.now() < until) {
              texts.add(await tv.locator('body').innerText());
              // ถ่าย 1 ภาพต่อ 1 คู่หน้า (ซ้าย / ขวา) ที่ยังไม่เคยเห็น
              const key = `${(await readTvPage(tvHistory(tv))).page}-${(await readTvPage(tvPatientsSection(tv))).page}`;
              if (!seen.has(key)) {
                seen.add(key);
                await markEvidence(expected(tvHistoryCards(tv).first(), 'เลขบัตรคิว'), expected(tvPatientsSection(tv).locator('tbody td:nth-child(2)').first(), 'หมายเลขคิว'), expected(tvPatientsSection(tv).locator('tbody td:nth-child(3)').first(), 'ชื่อ'));
                await snapEvidence(tv, `จอ TV หน้าซ้าย-ขวา ${key}`);
              }
              await tv.waitForTimeout(1_000);
            }
            const all = [...texts].join('\n');
            const api = JSON.stringify(await fetchTvBoard(tv));
            const onScreen = ids.filter((id) => all.includes(id));
            const inApi = ids.filter((id) => api.includes(id));
            const queues = [...new Set([...(all.match(/\b[A-Za-z]{1,3}\d{4,6}\b/g) ?? [])])];
            const hns = new Set(encounters.map((e) => e.hn));
            const table: CompareRow[] = [
              { label: 'HN / VN / EN / AN บนจอ', values: [`ไม่มี (ตรวจ ${ids.length} ค่าของ ${encounters.length} ราย)`, onScreen.length ? onScreen.join(', ') : 'ไม่พบ'], same: onScreen.length === 0 },
              { label: 'ใน API สาธารณะของจอ', values: ['ไม่มี', inApi.length ? inApi.join(', ') : 'ไม่พบ'], same: inApi.length === 0 },
              { label: 'เลขคิวบนจอ', values: ['เลขบัตรคิว ไม่ใช่ HN', queues.slice(0, 12).join(', ')], same: queues.every((q) => !hns.has(q)) },
            ];
            await showCompareTable(tv, `${ISSUE[8]} ข้อมูลระบุตัวตน`, ['Expected', 'ผล'], table, { side: 'bottom' });
            await markEvidence(expected(tvActiveNumber(tv), 'เลขบัตรคิว'));
            await snapEvidence(tv, 'ผล — ไม่มี HN / VN');
            await holdForClip(tv, 2_500);
            await hideCompareTable(tv);
            note(`${TC(8)} ผล`, table.map((r) => `${r.label}: ${r.values[1]}`).join(' | '));
            expect(table.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: ไม่มี HN / AN / VN บนจอ · เลขคิวเป็นเลขบัตรคิว').toEqual([]);
          });
        }

        // ---------- TC-009 ไม่เกิน 8 รายต่อหน้า ----------
        if (runs(9)) {
          await startClip(tv, CLIP(9));
          await screen.soft(`${TC(9)} ขั้น 2 ดูฝั่ง "ดูสถานะผู้ป่วยที่รักษาอยู่" ทุกหน้า — ไม่เกิน 8 แถว · ลำดับต่อเนื่อง`, async () => {
            const count = (await tvPatientsSection(tv).locator('[class*="_count_"]').innerText()).trim();
            const pages = await readAllTvPatientPages(tv, async (pg, rows) => {
              await markEvidence(expected(tvPageLabel(tvPatientsSection(tv)), `หน้า ${pg}`), expected(tvPatientsSection(tv).locator('tbody'), `${rows.length} แถว · ลำดับ ${rows[0]?.seq}–${rows.at(-1)?.seq}`));
              await snapEvidence(tv, `ผู้ป่วยหน้า ${pg}`);
            });
            const ordered = [...pages.entries()].sort((a, b) => a[0] - b[0]);
            const seqs = ordered.flatMap(([, rows]) => rows.map((r) => r.seq));
            const total = (await readTvPage(tvPatientsSection(tv))).total;
            const table: CompareRow[] = [
              { label: 'ผู้ป่วยทั้งหมด', values: ['มากกว่า 8 ราย', count], same: Number(count.replace(/\D/g, '')) > 8 },
              ...ordered.map(([pg, rows]) => ({ label: `หน้า ${pg} / ${total}`, values: ['ไม่เกิน 8 แถว', `${rows.length} แถว (ลำดับ ${rows[0]?.seq}–${rows.at(-1)?.seq})`], same: rows.length <= 8 })),
              { label: 'จำนวนหน้า', values: ['มากกว่า 1 หน้า', `${total} หน้า`], same: total > 1 },
              { label: 'ลำดับข้ามหน้า', values: ['ต่อเนื่อง', seqs.join(', ')], same: seqs.every((s, i) => s === i + 1) },
              { label: 'หน้า 2 เริ่มที่', values: ['9', String(pages.get(2)?.[0]?.seq ?? '-')], same: pages.get(2)?.[0]?.seq === 9 },
            ];
            await showCompareTable(tv, `${ISSUE[9]} แบ่งหน้าผู้ป่วย`, ['Expected', 'จอ TV'], table, NARROW);
            await markEvidence(expected(tvPageLabel(tvPatientsSection(tv)), 'หน้า X / N'));
            await snapEvidence(tv, 'ผล — แบ่งหน้าผู้ป่วย');
            await holdForClip(tv, 2_500);
            await hideCompareTable(tv);
            note(`${TC(9)} ผล`, table.map((r) => `${r.label}: ${r.values[1]}`).join(' | '));
            expect(table.filter((r) => !r.same).map((r) => `${r.label}: จอ ${r.values[1]} (Expected ${r.values[0]})`), 'Expected: หน้าละไม่เกิน 8 แถว · มากกว่า 1 หน้า · ลำดับต่อเนื่อง (หน้า 2 เริ่มที่ 9)').toEqual([]);
          });
        }

        /** จับเวลาการเปลี่ยนหน้าของฝั่งหนึ่ง (TC-010 / 011) — ต่อหน้า ~15 วินาที และวนกลับหน้า 1 */
        const checkPaging = async (n: number, side: string, section: Locator, tableSide: 'left' | 'right') => {
          await screen.soft(`${TC(n)} ขั้น 2 จับเวลาการเปลี่ยนหน้าฝั่ง${side}`, async () => {
            const { total } = await readTvPage(section);
            expect(total, `ฝั่ง${side}ต้องมีมากกว่า 1 หน้า (Pre-condition)`).toBeGreaterThan(1);
            await markEvidence(expected(tvPageLabel(section), 'เริ่มจับเวลา'));
            await snapEvidence(tv, `เริ่มจับเวลา ฝั่ง${side}`);
            const { changes } = await watchTvPaging(section, PAGE_MS * (total + 1) + 4_000);
            const rows: CompareRow[] = changes.map((c, i) => {
              const gap = i === 0 ? null : (c.at - changes[i - 1].at) / 1000;
              const nextOk = i === 0 || c.page === (changes[i - 1].page % total) + 1;
              return { label: `${(c.at / 1000).toFixed(1)} วิ`, values: [`หน้า ${c.page} / ${c.total}`, gap === null ? 'เริ่มดู' : `${gap.toFixed(1)} วิ`], same: i < 2 || (gap !== null && Math.abs(gap - 15) <= 1.5 && nextOk) };
            });
            const wrapped = changes.some((c, i) => i > 0 && c.page === 1 && changes[i - 1].page === total);
            rows.push({ label: 'วนกลับหน้า 1', values: [`หลังหน้า ${total}`, wrapped ? 'วนกลับ' : 'ไม่เห็น'], same: wrapped });
            await showCompareTable(tv, `${ISSUE[n]} เวลาเปลี่ยนหน้าฝั่ง${side}`, ['หน้า', 'ห่างจากครั้งก่อน'], rows, { side: tableSide });
            await markEvidence(expected(tvPageLabel(section), 'หลังวนครบ'));
            await snapEvidence(tv, `ผล — เปลี่ยนหน้าฝั่ง${side}`);
            await holdForClip(tv, 2_500);
            await hideCompareTable(tv);
            note(`${TC(n)} ผล`, rows.map((r) => `${r.label} ${r.values.join(' ')}`).join(' | '));
            expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' ')}`), `Expected: ฝั่ง${side}เปลี่ยนหน้าทุก 15 วินาที และวนกลับหน้า 1`).toEqual([]);
          });
        };
        if (runs(10)) {
          await startClip(tv, CLIP(10));
          await checkPaging(10, 'ซ้าย (เรียกแล้ว)', tvHistory(tv), 'right');
        }
        if (runs(11)) {
          await startClip(tv, CLIP(11));
          await checkPaging(11, 'ขวา (สถานะผู้ป่วย)', tvPatientsSection(tv), 'left');
        }

        // ---------- TC-012 progress แบบ IG Story ----------
        if (runs(12)) {
          await startClip(tv, CLIP(12));
          await screen.soft(`${TC(12)} ขั้น 2 ดูแถบ progress ใต้ "หน้า X / N" ระหว่างเปลี่ยนหน้า`, async () => {
            const section = tvPatientsSection(tv);
            const { total } = await readTvPage(section);
            expect(total, 'ต้องมีมากกว่า 1 หน้า').toBeGreaterThan(1);
            const segments = await tvSegments(section).count();
            const { samples } = await watchTvPaging(section, PAGE_MS * 2 + 2_000);
            // ภาพ 2 จังหวะ: ระหว่างหน้า + หลังเปลี่ยนหน้า
            await markEvidence(expected(tvPageLabel(section), 'หน้าปัจจุบัน'), expected(section.locator('[class*="_segments_"]'), `${segments} ช่อง`));
            await snapEvidence(tv, 'แถบ progress');
            const rows: CompareRow[] = samples.map((s, i) => {
              const cur = s.percents[s.page - 1];
              const before = s.percents.slice(0, s.page - 1).every((p) => p === 100);
              const after = s.percents.slice(s.page).every((p) => p === 0);
              const prev = samples[i - 1];
              const grows = !prev || prev.page !== s.page || cur >= prev.percents[s.page - 1];
              return { label: `${(s.at / 1000).toFixed(1)} วิ · หน้า ${s.page}`, values: [s.percents.map((p) => `${p}%`).join(' | ')], same: before && after && grows };
            });
            rows.unshift({ label: 'จำนวนช่อง', values: [`${segments} ช่อง = ${total} หน้า`], same: segments === total });
            await showCompareTable(tv, `${ISSUE[12]} ความเต็มของแต่ละช่อง`, ['ช่อง 1 | ช่อง 2 | …'], rows, { side: 'left' });
            await markEvidence(expected(section.locator('[class*="_segments_"]'), 'ช่องหน้าปัจจุบันกำลังเต็ม'));
            await snapEvidence(tv, 'ผล — แถบ progress');
            await holdForClip(tv, 2_500);
            await hideCompareTable(tv);
            note(`${TC(12)} ผล`, rows.map((r) => `${r.label}: ${r.values[0]}`).join(' | '));
            expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[0]}`), 'Expected: แถบแบ่งช่องเท่าจำนวนหน้า · ช่องหน้าปัจจุบันค่อยๆ เต็มใน 15 วินาที แล้วไปเริ่มช่องถัดไป').toEqual([]);
          });
        }

        // ---------- TC-013 Tag กำลังกู้ชีพ ----------
        if (runs(13)) {
          await startClip(tv, CLIP(13));
          await checkStep(tv, `${TC(13)} ขั้น 1 เปิดจอ ER TV ค้างไว้ (ยังไม่มีการกู้ชีพ)`, async () => {
            const board = await fetchTvBoard(tv);
            note(`${TC(13)} ก่อนเริ่ม`, `isResuscitationActive = ${board.isResuscitationActive}`);
            await expect(tvResuscitationTag(tv), 'ก่อนเริ่ม CPR ต้องยังไม่มี Tag กำลังกู้ชีพ').toHaveCount(0);
            await markEvidence(expected(tvPatientsSection(tv).getByRole('heading', { name: 'ดูสถานะผู้ป่วยที่รักษาอยู่' }), 'ยังไม่มี Tag'), expected(tvHeader(tv), 'แถบหัวจอ'));
            await snapEvidence(tv, 'ก่อนเริ่ม CPR — จอ TV');
          });
          await startClip(page, `${CLIP(13)}-staff`);
          const cprToast = page.getByText('บันทึก CPR progression แล้ว', { exact: true });
          let started = false;
          try {
            started = await staff.soft(`${TC(13)} ขั้น 2 เจ้าหน้าที่ ER: เปิด Visit ผู้ป่วย A > CPR Progression > Start CPR`, async () => {
              await gotoVisit(page, A.visit!);
              const form = await openCprForm(page);
              const rhythm = form.getByRole('button', { name: 'VF', exact: true });
              await rhythm.click();
              await markEvidence(filled(rhythm, 'Rhythm'), clicked(cprButton(form, 'Start CPR')));
              await snapEvidence(page, 'ก่อนกด — Start CPR');
              await saveCprEvent(page, form, 'Start CPR', 'Start CPR');
              if (await cprToast.first().isVisible()) {
                await markEvidence(alerted(cprToast.first()));
                await snapEvidence(page, 'หลังกด — Start CPR');
              }
            });
            if (started) {
              await screen.soft(`${TC(13)} ขั้น 3 จอ TV: Tag สีแดงพร้อมจุดกระพริบ "กำลังกู้ชีพ · การรักษาอาจล่าช้า" ต่อท้ายหัวข้อ "ดูสถานะผู้ป่วยที่รักษาอยู่"`, async () => {
                const tag = tvResuscitationTag(tv);
                await expect(tag, 'จอ TV ต้องขึ้น Tag กำลังกู้ชีพ').toBeVisible({ timeout: 30_000 });
                const info = await tag.evaluate((el) => {
                  const dot = el.querySelector('.ant-badge-status-dot') as HTMLElement | null;
                  const s = getComputedStyle(el);
                  const heading = document.getElementById('er-tv-patients-heading');
                  return {
                    color: s.color,
                    background: s.backgroundColor,
                    hasDot: !!dot,
                    dotColor: dot ? getComputedStyle(dot).backgroundColor : '',
                    dotAnimation: dot ? getComputedStyle(dot).animationName : '',
                    dotAfterAnimation: dot ? getComputedStyle(dot, '::after').animationName : '',
                    inHeader: !!el.closest('header'),
                    afterPatientsHeading: !!heading && (heading.parentElement?.contains(el) ?? false),
                  };
                });
                const blinking = [info.dotAnimation, info.dotAfterAnimation].some((a) => a && a !== 'none');
                const rows: CompareRow[] = [
                  { label: 'ข้อความ', values: ['กำลังกู้ชีพ · การรักษาอาจล่าช้า', (await tag.innerText()).trim()], same: true },
                  { label: 'สี Tag', values: ['แดง', `ตัวอักษร ${colorName(info.color)} ${toHex(info.color)} · พื้น ${toHex(info.background)}`], same: colorName(info.color) === 'แดง' },
                  { label: 'จุดกระพริบ', values: ['มีจุด + กระพริบ', `${info.hasDot ? `มีจุด ${colorName(info.dotColor)}` : 'ไม่มีจุด'} · animation ${info.dotAnimation || '-'} / ::after ${info.dotAfterAnimation || '-'}`], same: info.hasDot && blinking },
                  { label: 'ตำแหน่ง', values: ['ต่อท้ายหัวข้อ "ดูสถานะผู้ป่วยที่รักษาอยู่"', info.afterPatientsHeading ? 'ต่อท้ายหัวข้อ' : info.inHeader ? 'แถบหัวจอ (ข้างชื่อโรงพยาบาล)' : 'ที่อื่น'], same: info.afterPatientsHeading },
                ];
                await showCompareTable(tv, `${ISSUE[13]} Tag กำลังกู้ชีพ`, ['Expected', 'จอ TV'], rows, { side: 'bottom' });
                await markEvidence(expected(tag, 'Tag กำลังกู้ชีพ'), expected(tvPatientsSection(tv).getByRole('heading', { name: 'ดูสถานะผู้ป่วยที่รักษาอยู่' }), 'หัวข้อที่ Expected อ้าง'));
                await snapEvidence(tv, 'ผล — Tag กำลังกู้ชีพ');
                await holdForClip(tv, 3_000);
                await hideCompareTable(tv);
                note(`${TC(13)} ผล`, rows.map((r) => `${r.label}: ${r.values[1]}`).join(' | '));
                expect(rows.filter((r) => !r.same).map((r) => `${r.label}: จอ ${r.values[1]} (Expected ${r.values[0]})`), 'Expected: Tag สีแดงพร้อมจุดกระพริบ ต่อท้ายหัวข้อ ดูสถานะผู้ป่วยที่รักษาอยู่').toEqual([]);
              });
            }
          } finally {
            // คืนสภาพ: Stop CPR (จอ TV ของทั้งทีมต้องไม่ค้าง Tag)
            if (started) {
              await staff.soft('คืนสภาพหลัง TC-013: Stop CPR ผู้ป่วย A แล้ว Tag บนจอ TV ต้องหาย', async () => {
                const form = await openCprForm(page);
                await markEvidence(clicked(cprButton(form, 'Stop CPR')));
                await snapEvidence(page, 'ก่อนกด — Stop CPR');
                await saveCprEvent(page, form, 'Stop CPR', 'Stop CPR');
                await expect(tvResuscitationTag(tv), 'หลัง Stop CPR Tag ต้องหายจากจอ TV').toHaveCount(0, { timeout: 30_000 });
                await markEvidence(expected(tvHeader(tv), 'Tag หายแล้ว'));
                await snapEvidence(tv, 'หลัง Stop CPR — จอ TV');
              });
            }
          }
        }

        // ---------- TC-014 Banner ประกาศ (ผู้ใช้ให้ลง Fail — ไม่มีเมนูในแอป) ----------
        if (runs(14)) {
          await startClip(tv, CLIP(14));
          await startClip(page, `${CLIP(14)}-staff`);
          await staff.soft(`${TC(14)} ขั้น 2 เจ้าหน้าที่ ER: หาเมนู "ประกาศหน้าจอผู้ป่วย"`, async () => {
            await gotoErDashboard(page);
            // กางแถบนำทาง + กลุ่ม "ห้องฉุกเฉิน" อย่างเดียว ไม่กดเมนูย่อย (กดแล้วเปลี่ยนหน้า แถบนำทางหุบ — run 3)
            const expand = page.getByRole('button', { name: 'ขยายแถบนำทาง' });
            if (await expand.isVisible()) await expand.click();
            const last = page.getByRole('menuitem', { name: 'แดชบอร์ด / คิว' });
            if (!(await last.isVisible())) await page.getByRole('menuitem', { name: /^(\S+ )?ห้องฉุกเฉิน$/ }).click();
            await expect(last).toBeVisible();
            await page.mouse.move(1500, 600);
            // กลุ่มเมนูย่อยของห้องฉุกเฉิน = ul ที่ครอบเมนู แดชบอร์ด / คิว
            const group = last.locator('xpath=ancestor::ul[1]');
            await expect(group, 'ต้องเห็นกลุ่มเมนูของห้องฉุกเฉิน').toBeVisible();
            // กางเมนูย่อย (รายงานทางสถิติ · ตั้งค่า) ให้เห็นทุกรายการ — เป็นหัวกลุ่ม กดแล้วไม่เปลี่ยนหน้า
            for (const sub of ['รายงานทางสถิติ', 'ตั้งค่า']) {
              const title = group.getByRole('menuitem', { name: sub });
              if ((await title.getAttribute('aria-expanded')) === 'false') await title.click();
            }
            await page.waitForTimeout(800);
            const items = (await group.getByRole('menuitem').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
            const announce = page.getByRole('menuitem', { name: /ประกาศ/ });
            note(`${TC(14)} เมนูห้องฉุกเฉิน`, items.join(' · '));
            await showCompareTable(page, `${ISSUE[14]} เมนูห้องฉุกเฉิน`, ['เมนูที่มี'], [{ label: 'ต้องมี "ประกาศหน้าจอผู้ป่วย"', values: [items.join(' · ')], same: (await announce.count()) > 0 }], { side: 'right' });
            await markEvidence(expected(group, 'เมนูห้องฉุกเฉิน — ไม่มีเมนูประกาศ'));
            await snapEvidence(page, 'เมนูห้องฉุกเฉิน');
            await holdForClip(page, 2_500);
            await hideCompareTable(page);
            await expect(announce, 'ไม่มีเมนู "ประกาศหน้าจอผู้ป่วย" ในแถบนำทางของห้องฉุกเฉิน').not.toHaveCount(0);
          });
          await screen.soft(`${TC(14)} ขั้น 3 จอ ER TV: ต้องแสดง Banner ประกาศ`, async () => {
            const board = await fetchTvBoard(tv);
            note(`${TC(14)} API จอ TV`, `isPatientAnnouncementActive = ${board.isPatientAnnouncementActive}`);
            await markEvidence(expected(tvHeader(tv), 'ไม่มี Banner ประกาศใต้แถบหัวจอ'));
            await snapEvidence(tv, 'ผล — ไม่มี Banner');
            await holdForClip(tv, 2_000);
            await expect(tvAnnouncement(tv), 'จอ TV ไม่มี Banner ประกาศแจ้งผู้ป่วย (isPatientAnnouncementActive = false)').toBeVisible({ timeout: 5_000 });
          });
        }

        // ---------- TC-015 Full screen ----------
        if (runs(15)) {
          await startClip(tv, CLIP(15));
          await screen.soft(`${TC(15)} ขั้น 2 กดปุ่ม Full screen มุมขวาบน — เต็มจอ และทั้ง 2 ฝั่งแสดงครบ`, async () => {
            const button = tvFullscreenButton(tv);
            await expect(button).toHaveAccessibleName('เต็มหน้าจอ');
            await markEvidence(clicked(button, 'เต็มหน้าจอ'));
            await snapEvidence(tv, 'ก่อนกด — ปุ่มเต็มหน้าจอ');
            await button.click();
            await expect.poll(() => tv.evaluate(() => !!document.fullscreenElement), { message: 'หลังกดต้องเข้าโหมดเต็มจอ (document.fullscreenElement)', timeout: 10_000 }).toBe(true);
            await expect(button).toHaveAccessibleName('ออกจากเต็มหน้าจอ');
            const fit = await tv.evaluate(() => {
              const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
              const w = window.innerWidth;
              const h = window.innerHeight;
              return ['section[aria-labelledby="er-tv-active-heading"]', 'section[aria-labelledby="er-tv-patients-heading"]'].map((sel) => {
                const b = box(sel);
                return { sel, inside: b.left >= 0 && b.top >= 0 && b.right <= w + 1 && b.bottom <= h + 1, rect: `${Math.round(b.left)},${Math.round(b.top)}–${Math.round(b.right)},${Math.round(b.bottom)} ในจอ ${w}×${h}` };
              });
            });
            note(`${TC(15)} ผล`, `fullscreenElement = มี · ${fit.map((f) => `${f.sel.includes('active') ? 'ซ้าย' : 'ขวา'} ${f.rect}`).join(' · ')}`);
            await markEvidence(expected(tvCallSection(tv), 'ฝั่งซ้ายครบ'), expected(tvPatientsSection(tv), 'ฝั่งขวาครบ'), expected(button, 'ออกจากเต็มหน้าจอ'));
            await snapEvidence(tv, 'ผล — เต็มจอ');
            await holdForClip(tv, 2_500);
            expect(fit.filter((f) => !f.inside).map((f) => f.rect), 'Expected: ทั้ง 2 ฝั่งแสดงครบไม่ถูกตัด').toEqual([]);
            await button.click();
            await expect.poll(() => tv.evaluate(() => !!document.fullscreenElement), { timeout: 10_000 }).toBe(false);
          });
        }

        // รวมขั้นที่ไม่ผ่านของทั้ง 2 หน้าต่าง
        let staffError: unknown;
        try {
          staff.finish();
        } catch (error) {
          staffError = error;
        }
        screen.finish();
        if (staffError) throw staffError;
      } finally {
        await hideCompareTable(tv).catch(() => undefined);
        await finishVideo(tv);
        await tv.context().close();
      }
    },
  );

  test(
    'TC-018: ไม่มีผู้ป่วยบน ER Board (หลังปิด Visit ทั้ง Board) — จอ TV แสดง "0 ราย" และ "ไม่มีผู้ป่วยที่กำลังรับการรักษา"',
    { tag: ['@SBH-1719', '@SBH-2998'], annotation: [linear('SBH-1719'), linear('SBH-2998')] },
    async ({ page, browser }) => {
      test.skip(!process.env.SBH1719_EMPTY, 'รันหลังปิด Visit ทั้ง Board แล้วเท่านั้น (SBH1719_EMPTY=1)');
      const authorization = trackAuthorization(page);
      const { note } = makeRunner(page);
      await gotoErDashboard(page);
      const board = await fetchBoard(page, authorization);
      note(`${TC(18)} ขั้น 1 ผู้ป่วยบน ER Board`, `${board.length} ราย${board.length ? `: ${board.map((e) => `${e.hn} ${e.patientStatus}`).join(', ')}` : ''}`);
      await checkStep(page, `${TC(18)} ขั้น 1 ER Board ไม่มีผู้ป่วยที่รักษาอยู่`, async () => {
        await markEvidence(expected(page.getByRole('main'), `บอร์ด ER ${board.length} ราย`));
        await snapEvidence(page, 'ER Board');
      });
      const tv = await openTvWindow(browser);
      try {
        await startClip(tv, CLIP(18));
        await checkStep(tv, `${TC(18)} ขั้น 2 เปิดจอ ER TV ดูฝั่ง "ดูสถานะผู้ป่วยที่รักษาอยู่"`, async () => {
          const api = await fetchTvBoard(tv);
          note(`${TC(18)} API จอ TV`, `patients ${api.patients.length} ราย${api.patients.length ? `: ${api.patients.map((p) => `${p.queueNumber} ${p.maskedName} ${p.status}`).join(', ')}` : ''}`);
          const section = tvPatientsSection(tv);
          const count = section.locator('[class*="_count_"]');
          const empty = section.getByText('ไม่มีผู้ป่วยที่กำลังรับการรักษา', { exact: true });
          await markEvidence(expected(count, 'จำนวนผู้ป่วย'), expected(section.locator('.ant-table'), 'ตาราง'));
          await snapEvidence(tv, 'จอ TV ฝั่งผู้ป่วย');
          await expect(count, 'Expected: แสดง "0 ราย"').toHaveText('0 ราย', { timeout: 15_000 });
          await expect(empty, 'Expected: แสดง "ไม่มีผู้ป่วยที่กำลังรับการรักษา"').toBeVisible();
          await markEvidence(expected(count, '0 ราย'), expected(empty, 'Empty state'));
          await holdForClip(tv, 2_500);
        });
      } finally {
        await finishVideo(tv);
        await tv.context().close();
      }
    },
  );
});
