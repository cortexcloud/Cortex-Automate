import type { Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, fetchBoard, gotoErDashboard, trackOpenedErVisits, waitForApi, type ErBoardEncounter, type ErVisit } from '../../../helpers/functions/er';
import { erListCell, erListRow, erListTab, filterErListByHn, hnSearchBox, openErPatientListFromMenu } from '../../../helpers/functions/er-list';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, erTriageSaveButton, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { fetchTvBoard, openTvWindow, tvActiveArea, tvActiveNumber, tvHistoryCards, tvLatestTag } from '../../../helpers/functions/er-tv-queue';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL } from '../../../mock-data/uat-play';

// SBH-1026 [ER][In ER Zone] Call Queue Menu — AC: ปุ่ม Call QUEUE ที่คอลัมน์ "คิว" (แทนเลขคิว) ของแดชบอร์ด / คิว → กดแล้วคิวขึ้นจอ ER TV (SBH-1719)
// ชุด EXE SBH-3024 → SC HPY SBH-3025 → TC-001 SBH-3026 · TC-002 SBH-3027 · TC-003 SBH-3028 → 1 เทส 1 flow (R9)
// บนจอจริง (dev-x 29 ต.ค. 2026): ปุ่มในคอลัมน์ "คิว" = ไอคอนลำโพง + เลขคิว · aria-label "เรียกคิว <เลขคิว>" · กดแล้ว POST /cortex-api/er/encounters/<EN>/queue-call
//   + toast "ส่งคิว <เลขคิว> ไปยังจอ ER แล้ว" · จอ TV (/cortex/public/er/tv-queue) ดึงข้อมูลทุก 3 วินาที
// ข้อมูล (ผู้ใช้ตอบ 29 ต.ค. 2026): ผู้ป่วย AUTO ใหม่ 2 ราย (A = ESI 3 · B = ESI 4) เปิด Visit ER + คัดกรอง → ปิด Visit ที่การเงินท้ายเทส (afterEach)
//   (บอร์ด dev-x กลับสภาพเดิม ไม่ขวางเทส empty state ของ SBH-1719)
// หน้าต่าง: เจ้าหน้าที่ (Super_User — R6) + จอ TV แยก (ไม่มี session = หน้าสาธารณะ) · คลิป: clip-TC-00x-staff.webm (เจ้าหน้าที่) + clip-TC-00x.webm (จอ TV)
// รัน (dev-x): npx playwright test --headed --grep @SBH-1026
// SBH1026_VISITS=<HN>,<VN>,<EN>;<HN>,<VN>,<EN> = ใช้ผู้ป่วย A;B เดิม (คัดกรองแล้ว) · SBH1026_KEEP=1 = ไม่ปิด Visit ท้ายเทส

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ISSUE = { 1: 'SBH-3026', 2: 'SBH-3027', 3: 'SBH-3028' } as const;
const TC = (n: 1 | 2 | 3) => `TC-00${n} (${ISSUE[n]})`;

type Patient = { key: 'A' | 'B'; level: 3 | 4; visit?: ErVisit; fullName?: string; queue?: string };
type BoardRow = ErBoardEncounter & { queueExam?: { qDisplay?: string } | null };

test.describe('SBH-1026 ปุ่ม Call QUEUE บนแดชบอร์ด ER เรียกคิวขึ้นจอ ER TV (dev-x)', () => {
  test.describe.configure({ timeout: 1_200_000 });

  let opened: Map<string, ErVisit>;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page).catch(() => undefined);
    if (process.env.SBH1026_KEEP) return;
    // ปิด Visit ของผู้ป่วยที่เทสเปิดเอง หลังเก็บหลักฐาน — ทั้งตอนผ่านและพังกลางทาง (ผู้ใช้ตอบ 29 ต.ค. 2026)
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  test(
    'TC-001…003: ผู้ป่วย AUTO 2 ราย — ปุ่ม Call QUEUE ในคอลัมน์คิว · กดผู้ป่วย A แล้ว B — จอ ER TV แสดงคิวที่กำลังเรียกตาม (Super_User)',
    { tag: ['@SBH-1026', '@SBH-3026', '@SBH-3027', '@SBH-3028'], annotation: [linear('SBH-1026'), linear(ISSUE[1]), linear(ISSUE[2]), linear(ISSUE[3])] },
    async ({ page, browser }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const reuse = (process.env.SBH1026_VISITS ?? '').split(';').filter(Boolean).map((v) => v.split(','));
      const patients: Patient[] = [
        { key: 'A', level: 3 },
        { key: 'B', level: 4 },
      ];
      const [A, B] = patients;
      const staff = makeRunner(page);
      const { note } = staff;

      // ---------- เตรียมข้อมูล: ผู้ป่วย AUTO 2 ราย + คัดกรอง (ได้เลขคิว) ----------
      await gotoErDashboard(page);
      for (const [i, p] of patients.entries()) {
        if (reuse[i]?.length === 3) {
          p.visit = { hn: reuse[i][0], vn: reuse[i][1], en: reuse[i][2] };
          continue;
        }
        await checkStep(page, `เตรียมข้อมูล ผู้ป่วย ${p.key}: เปิด Visit ER + คัดกรอง ESI ${p.level}`, async () => {
          if (!page.url().includes('/er/dashboard')) await gotoErDashboard(page);
          p.visit = await registerAndOpenErVisit(page, newTestPatient(`CallQ${p.key}`));
          await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true }), 'หลังเปิด Visit ต้องอยู่หน้าคัดกรอง ER').toBeVisible({ timeout: 60_000 });
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          await fillErTriageForm(page, { level: p.level, vitals: VITALS_NORMAL });
          await markEvidence(filled(erTriagePanel(page).getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }), `ESI ${p.level}`), clicked(erTriageSaveButton(page)));
          await snapEvidence(page, `ก่อนกด — คัดกรอง ${p.key}`);
          await saveErTriageForm(page, `บันทึกคัดกรอง ${p.key} (${p.visit.en})`);
        });
      }
      // ชื่อเต็ม + เลขคิวจากบัตรคิว (queueExam ของ Encounter บนบอร์ด — อ่านอย่างเดียว)
      const board = (await fetchBoard(page, authorization)) as BoardRow[];
      for (const p of patients) {
        const enc = board.find((e) => e.en === p.visit!.en);
        if (!enc) throw new Error(`ไม่เจอผู้ป่วย ${p.key} (${p.visit!.en}) บนบอร์ด ER`);
        p.fullName = [enc.patient?.firstName, enc.patient?.familyName].filter(Boolean).join(' ');
        p.queue = enc.queueExam?.qDisplay;
        if (!p.queue) throw new Error(`ผู้ป่วย ${p.key} (${p.visit!.en}) ยังไม่มีเลขคิว (queueExam ว่าง) — ไม่ตรง Pre-condition "มีบัตรคิวแล้ว"`);
        note(`ผู้ป่วย ${p.key}`, `${p.fullName} · ESI ${p.level} · HN ${p.visit!.hn} · ${p.visit!.vn} · ${p.visit!.en} · คิว ${p.queue} · บอร์ด ER: triageLevel ${enc.triageLevel} · triagedAt ${enc.triagedAt}`);
      }
      note('ใช้ผู้ป่วยเดิมรอบถัดไป', `SBH1026_VISITS=${patients.map((p) => `${p.visit!.hn},${p.visit!.vn},${p.visit!.en}`).join(';')} SBH1026_KEEP=1`);

      /** ปุ่มเรียกคิวในคอลัมน์ "คิว" ของแถวผู้ป่วย */
      const callButton = async (row: Locator): Promise<Locator> => (await erListCell(page, row, 'คิว')).getByRole('button');

      /** กรองรายการด้วย HN ของผู้ป่วย (แท็บผู้ป่วยปัจจุบันใน ER) แล้วคืนแถว */
      const rowOf = async (p: Patient) => {
        await expect(erListTab(page, 'current'), 'แท็บ "ผู้ป่วยปัจจุบันใน ER" ต้องถูกเลือก').toHaveAttribute('aria-selected', 'true');
        await filterErListByHn(page, p.visit!.hn);
        const row = erListRow(page, p.visit!.en);
        await expect(row, `ต้องเห็นแถวของผู้ป่วย ${p.key} ในแท็บผู้ป่วยปัจจุบันใน ER`).toBeVisible({ timeout: 60_000 });
        return row;
      };

      /** เจ้าหน้าที่กด Call QUEUE ที่แถวผู้ป่วย → API queue-call สำเร็จ + toast "ส่งคิว … ไปยังจอ ER แล้ว" */
      const callQueue = async (n: 2 | 3, step: number, p: Patient) => {
        await checkStep(page, `${TC(n)} ขั้น ${step} กด Call QUEUE ที่แถวผู้ป่วย ${p.key} (คิว ${p.queue})`, async () => {
          const row = await rowOf(p);
          const button = await callButton(row);
          await expect(button, `แถวผู้ป่วย ${p.key} ต้องมีปุ่ม Call QUEUE`).toBeVisible();
          await expect(button).toHaveAttribute('aria-label', `เรียกคิว ${p.queue}`);
          await markEvidence(expected(row, `ผู้ป่วย ${p.key} · บัตรคิว ${p.queue}`), clicked(button, `Call QUEUE ${p.queue}`));
          await snapEvidence(page, `ก่อนกด — Call QUEUE ${p.key}`);
          const called = waitForApi(page, 'POST', /\/cortex-api\/er\/encounters\/[^/]+\/queue-call$/, 30_000);
          await button.click();
          const res = await called;
          await expectOk(res, `เรียกคิว ${p.queue}`);
          expect(new URL(res.url()).pathname, 'เรียกคิวของ Encounter ผู้ป่วยรายนี้').toContain(`/er/encounters/${p.visit!.en}/queue-call`);
          const toast = page.getByText(`ส่งคิว ${p.queue} ไปยังจอ ER แล้ว`, { exact: true }).first();
          // dev-x ช้าบางรอบ toast ขึ้นเกิน 10 วินาทีหลัง API ตอบ (รอบ 3 · 29 ต.ค. 2026 — ผู้ใช้อนุมัติให้รอ 30 วินาที)
          await toast.waitFor({ state: 'visible', timeout: 30_000 });
          await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          await markEvidence(alerted(toast));
          await snapEvidence(page, `หลังกด — Call QUEUE ${p.key}`);
        });
        note(`${TC(n)} เรียกคิว`, `ผู้ป่วย ${p.key} คิว ${p.queue} · POST /er/encounters/${p.visit!.en}/queue-call สำเร็จ`);
      };

      /** จอ TV: รอการ์ด "กำลังเรียก" เปลี่ยนเป็นคิวนี้ (จอดึงข้อมูลทุก 3 วินาที) */
      const waitActive = async (tv: Page, queue: string) => {
        await expect.poll(async () => (await tvActiveNumber(tv).textContent().catch(() => null))?.trim(), { message: `จอ TV ต้องขึ้นคิว ${queue} เป็นคิวที่กำลังเรียก`, timeout: 30_000 }).toBe(queue);
        // ข้อมูลประกอบข้อสังเกต (นอก TC): ESI ที่ API จอ TV ส่งให้คิวนี้ + คิวที่เรียกแล้วที่เลขซ้ำ
        const snap = await fetchTvBoard(tv).catch(() => null);
        if (snap) note(`API จอ TV หลังเรียก ${queue}`, `activeCall ${snap.activeCall?.queueNumber} triageLevel ${snap.activeCall?.triageLevel} · calledAt ${snap.activeCall?.calledAt} · เรียกแล้วเลขเดียวกัน: ${snap.calledCalls.filter((c) => c.queueNumber === queue).map((c) => `${c.calledAt} ESI ${c.triageLevel}`).join(', ') || '-'}`);
      };
      const shownOnTv = async (tv: Page) => (await tvActiveNumber(tv).count()) ? ((await tvActiveNumber(tv).textContent()) ?? '').trim() : '(ไม่มีคิวที่กำลังเรียก)';

      // ---------- TC-001 ปุ่ม Call QUEUE ที่คอลัมน์คิว ----------
      await startClip(page, 'TC-001');
      await checkStep(page, `${TC(1)} ขั้น 1–2 เมนู แดชบอร์ด / คิว > แท็บ "ผู้ป่วยปัจจุบันใน ER"`, async () => {
        await openErPatientListFromMenu(page);
        await hnSearchBox(page).clear();
        const tab = erListTab(page, 'current');
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        await markEvidence(clicked(tab, 'ผู้ป่วยปัจจุบันใน ER'), expected(main.locator('thead').filter({ visible: true }).first().locator('th').first(), 'คอลัมน์ คิว'));
      });
      await checkStep(page, `${TC(1)} ขั้น 3 คอลัมน์ "คิว" ของผู้ป่วยที่มีบัตรคิว แสดงปุ่ม Call QUEUE แทนเลขคิว`, async () => {
        // ทุกแถวในหน้าแรกของแท็บ: ช่องคอลัมน์ "คิว" เป็นปุ่มหรือข้อความ
        const header = main.locator('thead').filter({ visible: true }).first().locator('th').first();
        await expect(header, 'คอลัมน์แรกของตารางต้องเป็น "คิว"').toHaveText('คิว');
        const cells = await main.locator('tr.ant-table-row').filter({ visible: true }).evaluateAll((rows) =>
          rows.map((row) => {
            const td = row.querySelector('td') as HTMLElement | null;
            const button = td?.querySelector('button');
            return { en: row.getAttribute('data-row-key') ?? '', text: td?.innerText.trim() ?? '', button: !!button, label: button?.getAttribute('aria-label') ?? '' };
          }),
        );
        const withQueue = cells.filter((c) => c.text && c.text !== '-');
        note(`${TC(1)} แถวในแท็บ`, `${cells.length} แถว · มีเลขคิว ${withQueue.length} แถว · เป็นปุ่ม ${withQueue.filter((c) => c.button).length} แถว · ${cells.map((c) => `${c.text || '(ว่าง)'}${c.button ? '[ปุ่ม]' : ''}`).join(', ')}`);

        const row = await rowOf(A);
        const cell = await erListCell(page, row, 'คิว');
        const button = cell.getByRole('button');
        const rows: CompareRow[] = [
          { label: 'หัวคอลัมน์', values: ['คิว', (await header.innerText()).trim()], same: (await header.innerText()).trim() === 'คิว' },
          { label: 'ในช่องคิว', values: ['ปุ่ม Call QUEUE', (await button.count()) ? 'ปุ่ม (button)' : 'ข้อความ (ไม่ใช่ปุ่ม)'], same: (await button.count()) === 1 },
          { label: 'ชื่อปุ่ม (aria-label)', values: [`เรียกคิว ${A.queue}`, (await button.getAttribute('aria-label').catch(() => null)) ?? '(ไม่มี)'], same: (await button.getAttribute('aria-label').catch(() => null)) === `เรียกคิว ${A.queue}` },
          { label: 'ข้อความบนปุ่ม', values: [`เลขคิว ${A.queue}`, (await cell.innerText()).trim()], same: (await cell.innerText()).trim() === A.queue },
          { label: 'แถวอื่นที่มีเลขคิว', values: ['เป็นปุ่มทุกแถว', `${withQueue.filter((c) => c.button).length} / ${withQueue.length} แถว`], same: withQueue.every((c) => c.button) },
        ];
        await showCompareTable(page, `${ISSUE[1]} ช่องคิวของผู้ป่วย A`, ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(header, 'คอลัมน์ คิว'), expected(button, `ปุ่ม Call QUEUE · คิว ${A.queue}`));
        await snapEvidence(page, 'ผล — ปุ่มในคอลัมน์คิว');
        await hideCompareTable(page);
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (Expected ${r.values[0]})`), 'Expected: คอลัมน์ "คิว" แสดงปุ่ม Call QUEUE ในตำแหน่งที่เคยแสดงเลขคิว').toEqual([]);
      });

      // ---------- TC-002 / 003 จอ ER TV ----------
      const tv = await openTvWindow(browser);
      const screen = makeRunner(tv);
      let staffError: unknown;
      try {
        try {
          // ---------- TC-002 กดเรียกคิวผู้ป่วย A ----------
          await startClip(tv, 'TC-002');
          let before = '';
          await checkStep(tv, `${TC(2)} ขั้น 1 เปิดจอ ER TV ค้างไว้ (ก่อนเรียกคิวผู้ป่วย A)`, async () => {
            before = await shownOnTv(tv);
            await markEvidence(expected(tvActiveArea(tv), `ก่อนเรียก: ${before}`));
            await snapEvidence(tv, 'ก่อนเรียก — จอ TV');
          });
          note(`${TC(2)} จอ TV ก่อนเรียก`, before);
          await startClip(page, 'TC-002-staff');
          await callQueue(2, 2, A);
          await screen.soft(`${TC(2)} ขั้น 4 จอ ER TV แสดงเลขคิวของผู้ป่วย A เป็นคิวที่กำลังเรียก`, async () => {
            await tv.bringToFront();
            await waitActive(tv, A.queue!);
            await expect(tvLatestTag(tv)).toBeVisible();
            const rows: CompareRow[] = [
              { label: 'ก่อนกด', values: ['-', before], same: true },
              { label: 'คิวที่กำลังเรียก', values: [`${A.queue} (ผู้ป่วย A)`, await shownOnTv(tv)], same: (await shownOnTv(tv)) === A.queue },
            ];
            await showCompareTable(tv, `${ISSUE[2]} คิวที่กำลังเรียก`, ['Expected', 'จอ TV'], rows, { side: 'right' });
            await markEvidence(expected(tvLatestTag(tv), 'กำลังเรียก · คิวล่าสุด'), expected(tvActiveNumber(tv), `คิวผู้ป่วย A ${A.queue}`));
            await snapEvidence(tv, 'ผล — คิว A ขึ้นจอ TV');
            await hideCompareTable(tv);
          });

          // ---------- TC-003 กดเรียกคิวผู้ป่วย B ต่อ ----------
          await startClip(tv, 'TC-003');
          let beforeB = '';
          await checkStep(tv, `${TC(3)} ขั้น 1 ต่อจาก TC-002 — จอ ER TV กำลังเรียกคิวของผู้ป่วย A`, async () => {
            beforeB = await shownOnTv(tv);
            expect(beforeB, 'ก่อนเรียกผู้ป่วย B จอต้องกำลังเรียกคิวของผู้ป่วย A').toBe(A.queue);
            await markEvidence(expected(tvActiveNumber(tv), `ก่อนเรียก B: คิว A ${A.queue}`));
            await snapEvidence(tv, 'ก่อนเรียก B — จอ TV');
          });
          await startClip(page, 'TC-003-staff');
          await callQueue(3, 2, B);
          await screen.soft(`${TC(3)} ขั้น 3 จอ ER TV เปลี่ยนจากคิวผู้ป่วย A เป็นคิวผู้ป่วย B`, async () => {
            await tv.bringToFront();
            await waitActive(tv, B.queue!);
            const history = tvHistoryCards(tv).filter({ hasText: A.queue! }).first();
            const inHistory = (await history.count()) > 0;
            const rows: CompareRow[] = [
              { label: 'ก่อนกด (กำลังเรียก)', values: [`${A.queue} (ผู้ป่วย A)`, beforeB], same: beforeB === A.queue },
              { label: 'หลังกด (กำลังเรียก)', values: [`${B.queue} (ผู้ป่วย B)`, await shownOnTv(tv)], same: (await shownOnTv(tv)) === B.queue },
            ];
            await showCompareTable(tv, `${ISSUE[3]} คิวที่กำลังเรียก`, ['Expected', 'จอ TV'], rows, { side: 'right' });
            await markEvidence(expected(tvLatestTag(tv), 'กำลังเรียก · คิวล่าสุด'), expected(tvActiveNumber(tv), `คิวผู้ป่วย B ${B.queue}`));
            await snapEvidence(tv, 'ผล — คิว B แทนคิว A');
            await hideCompareTable(tv);
            note(`${TC(3)} ข้อสังเกต`, `คิวผู้ป่วย A ${A.queue} ${inHistory ? 'อยู่ในส่วน "เรียกแล้ว" (หน้าที่แสดงอยู่)' : 'ไม่เห็นในส่วน "เรียกแล้ว" หน้าที่แสดงอยู่ (อาจอยู่หน้าอื่น)'}`);
            expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (Expected ${r.values[0]})`), 'Expected: จอ ER TV เปลี่ยนจากคิวของผู้ป่วย A เป็นคิวของผู้ป่วย B').toEqual([]);
          });
          // ช่วงปิด Visit ที่การเงิน (afterEach) แยกเป็นคลิปของตัวเอง — ไม่ให้หน้าการเงินโหลดช้า (จอว่าง ~20 วินาที) ไปต่อท้ายคลิป TC-003-staff
          await startClip(page, 'after-test');
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
});
