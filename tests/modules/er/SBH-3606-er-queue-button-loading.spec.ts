import fs from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, fetchBoard, gotoErDashboard, trackOpenedErVisits, type ErBoardEncounter, type ErVisit } from '../../../helpers/functions/er';
import { erListCell, erListRow, erListTab, hnSearchBox, openErPatientListFromMenu } from '../../../helpers/functions/er-list';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { alerted, checkStep, clicked, expected, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';

// SBH-3606 ข้อ 3 (บั๊กของการ์ด SBH-3117 · ผู้ใช้พบ 2 พ.ย. 2026): รายการผู้ป่วย ER มีหลายแถว กดปุ่ม "เรียกคิว" แถวเดียว → ไอคอนหมุนทุกแถว
//   ต้นเหตุ (ไฟล์แอป dev-x index-D_SSxb-t.js · chunk รายการ index-BsQ8EIH5.js 2 พ.ย.): ปุ่มเรียกคิวทุกแถวใช้ loading / disabled = isCallingQueue (isPending ของ mutation เดียว)
//   ปุ่ม "จบคิว" ใช้ loading = isCompletingQueue แบบเดียวกัน (ไม่ disabled)
// ข้อมูล: ผู้ป่วย AUTO ใหม่ 3 ราย (A / B / C) เปิด Visit ER → เรียกคิว B, C ก่อน (ให้มีปุ่มจบคิว) → เรียกคิว A + จบคิว A → ปิด Visit ท้ายเทส
//   แถวอื่นในแท็บ "ผู้ป่วยปัจจุบันใน ER" (ของทีม) แค่ดู ไม่กด
// API ตอบเร็ว ไอคอนหมุนแค่เสี้ยววินาที → หน่วงคำขอ queue-call / queue-complete ของ A ในเบราว์เซอร์ DELAY_MS ก่อนส่งจริง ให้ถ่ายภาพทัน (เขียนบอกในผล)
// รัน (dev-x): npx playwright test --headed --grep @SBH-3606 · SBH3606_VISITS=<HN>,<VN>,<EN>;… = ใช้ผู้ป่วยเดิม · SBH3606_KEEP=1 = ไม่ปิด Visit

const DELAY_MS = 10_000;
const QUEUE_API = /\/cortex-api\/er\/encounters\/[^/]+\/queue-(call|complete)$/;

type Patient = { key: string; visit?: ErVisit; queue?: string };
type ButtonState = { label: string; loading: boolean; disabled: boolean };

/** ปุ่มในคอลัมน์คิวของทุกแถวที่เห็นในตาราง (ชื่อขึ้นต้น "เรียกคิว " / "จบคิว ") */
async function readButtons(page: Page, prefix: 'เรียกคิว' | 'จบคิว'): Promise<ButtonState[]> {
  return page
    .getByRole('main')
    .locator('tr.ant-table-row')
    .filter({ visible: true })
    .locator(`button[aria-label^="${prefix} "]`)
    .evaluateAll((els) =>
      els.map((el) => ({
        label: el.getAttribute('aria-label') ?? '',
        loading: el.classList.contains('ant-btn-loading') || !!el.querySelector('.ant-btn-loading-icon, .anticon-loading'),
        disabled: (el as HTMLButtonElement).disabled,
      })),
    );
}

test.describe('SBH-3606 ปุ่มเรียกคิว / จบคิว ในรายการผู้ป่วย ER หมุนพร้อมกันทุกแถว (dev-x)', () => {
  test.describe.configure({ timeout: 900_000 });

  let opened: Map<string, ErVisit>;
  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });
  test.afterEach(async ({ page }) => {
    await hideCompareTable(page).catch(() => undefined);
    if (process.env.SBH3606_KEEP) return;
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
    'กดเรียกคิว / จบคิว ผู้ป่วยรายเดียว — ปุ่มของแถวอื่นต้องไม่หมุน (Super_User)',
    { tag: ['@SBH-3606', '@SBH-3117'], annotation: [{ type: 'issue', description: 'https://linear.app/cortexcloud/issue/SBH-3606' }] },
    async ({ page }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const { note, soft, finish } = makeRunner(page);
      const patients: Patient[] = ['A', 'B', 'C'].map((key) => ({ key }));
      const reuse = (process.env.SBH3606_VISITS ?? '').split(';').filter(Boolean).map((v) => v.split(','));

      // ---------- เตรียมข้อมูล ----------
      await gotoErDashboard(page);
      for (const [i, p] of patients.entries()) {
        if (reuse[i]?.length === 3) {
          p.visit = { hn: reuse[i][0], vn: reuse[i][1], en: reuse[i][2] };
          opened.set(p.visit.en, p.visit);
          continue;
        }
        await checkStep(page, `เตรียมข้อมูล ผู้ป่วย ${p.key}: เปิด Visit ER`, async () => {
          if (!page.url().includes('/er/')) await gotoErDashboard(page);
          p.visit = await registerAndOpenErVisit(page, newTestPatient(`Q3606${p.key}`));
          await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
        });
      }
      const board = (await fetchBoard(page, authorization)) as (ErBoardEncounter & { queueExam?: { qDisplay?: string } | null })[];
      for (const p of patients) {
        p.queue = board.find((e) => e.en === p.visit!.en)?.queueExam?.qDisplay;
        if (!p.queue) throw new Error(`ผู้ป่วย ${p.key} (${p.visit!.en}) ไม่มีเลขคิว`);
        note(`ผู้ป่วย ${p.key}`, `HN ${p.visit!.hn} · ${p.visit!.vn} · ${p.visit!.en} · คิว ${p.queue}`);
      }
      note('ใช้ผู้ป่วยเดิมรอบถัดไป', `SBH3606_VISITS=${patients.map((p) => `${p.visit!.hn},${p.visit!.vn},${p.visit!.en}`).join(';')} SBH3606_KEEP=1`);
      const [A, B, C] = patients;

      // หน่วงคำขอเฉพาะตอน delayOn (ขั้นของ A) — เตรียมข้อมูล B / C ส่งปกติ
      let delayOn = false;
      const delayed: string[] = [];
      await page.route(QUEUE_API, async (route) => {
        if (delayOn) {
          delayed.push(new URL(route.request().url()).pathname);
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
        await route.continue().catch(() => undefined);
      });

      const row = (p: Patient) => erListRow(page, p.visit!.en);
      const cellOf = async (p: Patient) => erListCell(page, row(p), 'คิว');
      const callBtn = async (p: Patient) => (await cellOf(p)).getByRole('button', { name: `เรียกคิว ${p.queue}`, exact: true });
      const completeBtn = async (p: Patient) => (await cellOf(p)).getByRole('button', { name: `จบคิว ${p.queue}`, exact: true });

      const openList = async () => {
        await openErPatientListFromMenu(page);
        await hnSearchBox(page).clear();
        const tab = erListTab(page, 'current');
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        // Retest 3 พ.ย.: แท็บมี 26 ราย (หน้าละ 20) ผู้ป่วยใหม่ที่ยังไม่คัดกรองเรียงท้าย → อยู่หน้า 2 · เปลี่ยนขนาดหน้าเป็น 50 (ตัวเลือกบนจอ ไม่เขียนข้อมูล)
        if (!(await row(A).waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false))) {
          const size = main.getByRole('combobox', { name: 'ขนาดหน้า' });
          if (await size.isVisible().catch(() => false)) {
            // input ถูก div ค่า "20 / หน้า" บัง → กดที่กล่อง select ที่ครอบ
            await main.getByTitle(/^\d+ \/ หน้า$/).first().click();
            await page.locator('.ant-select-dropdown:visible').getByText('50 / หน้า', { exact: true }).click();
          }
        }
        for (const p of patients) await expect(row(p), `ต้องเห็นแถวผู้ป่วย ${p.key} ในหน้าแรกของรายการ`).toBeVisible({ timeout: 60_000 });
      };

      await checkStep(page, 'เตรียมข้อมูล เรียกคิว B และ C (ให้มีปุ่มจบคิว)', async () => {
        await openList();
        for (const p of [B, C]) {
          const res = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(`/er/encounters/${p.visit!.en}/queue-call`), { timeout: 30_000 });
          await (await callBtn(p)).click();
          expect((await res).ok(), `เรียกคิว ${p.queue}`).toBeTruthy();
          await page.getByText(`ส่งคิว ${p.queue} ไปยังจอ ER แล้ว`, { exact: true }).first().waitFor({ timeout: 30_000 });
          await expect.poll(async () => (await readButtons(page, 'เรียกคิว')).some((b) => b.loading), { timeout: 15_000 }).toBe(false);
        }
        await page.locator('.ant-message-notice, .ant-notification-notice').first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
        await row(A).scrollIntoViewIfNeeded();
      });

      /** กดปุ่มของ A (คำขอถูกหน่วง) → นับปุ่มที่หมุนทุกแถวระหว่างรอ */
      const pressAndCount = async (name: 'call' | 'complete') => {
        const prefix = name === 'call' ? 'เรียกคิว' : 'จบคิว';
        const own = name === 'call' ? await callBtn(A) : await completeBtn(A);
        const others = [B, C];
        const otherBtns = await Promise.all(others.map((p) => (name === 'call' ? callBtn(p) : completeBtn(p))));
        const ownLabel = `${prefix} ${A.queue}`;

        await checkStep(page, `ก่อนกด — ${prefix} ผู้ป่วย A (คิว ${A.queue})`, async () => {
          const before = await readButtons(page, prefix);
          note(`ก่อนกด ${prefix}`, `ปุ่ม ${before.length} ปุ่ม · หมุน ${before.filter((b) => b.loading).length}`);
          expect(before.filter((b) => b.loading), 'ก่อนกดต้องไม่มีปุ่มหมุน').toEqual([]);
          // แถวสูง ~39 px ป้ายของ B วางเหนือกรอบไปทับแถว A (Sub Agent ทัก 3 พ.ย.) → B / C กรอบอย่างเดียว ไม่มีป้าย
          await markEvidence(clicked(own, `${prefix} A`), ...otherBtns);
        });

        let ok = false;
        await soft(`หลังกด — ${prefix} ผู้ป่วย A: ปุ่ม ${prefix} ของแถวอื่นต้องไม่หมุน`, async () => {
          delayOn = true;
          const started = Date.now();
          const res = page.waitForResponse((r) => r.request().method() === 'POST' && QUEUE_API.test(new URL(r.url()).pathname) && r.url().includes(A.visit!.en), { timeout: DELAY_MS + 30_000 });
          await own.click();
          await page.waitForTimeout(500);
          const during = await readButtons(page, prefix);
          const spinning = during.filter((b) => b.loading);
          const spinOthers = spinning.filter((b) => b.label !== ownLabel);
          const disabledOthers = during.filter((b) => b.disabled && b.label !== ownLabel);
          note(`ระหว่างรอ ${prefix} ${A.queue}`, `ปุ่ม ${prefix} ที่เห็น ${during.length} ปุ่ม · หมุน ${spinning.length} (${spinning.map((b) => b.label).join(', ')}) · กดไม่ได้ (disabled) ${during.filter((b) => b.disabled).length}`);

          const rowsTable: CompareRow[] = [
            { label: `ปุ่ม ${prefix} ที่เห็นในตาราง`, values: ['-', `${during.length} ปุ่ม`], same: true },
            { label: 'ปุ่มที่หมุน (loading)', values: ['1 ปุ่ม (แถว A ที่กด)', `${spinning.length} ปุ่ม`], same: spinning.length <= 1 },
            { label: 'แถวอื่นที่หมุนด้วย', values: ['0', `${spinOthers.length} ปุ่ม`], same: spinOthers.length === 0 },
            ...(name === 'call' ? [{ label: 'แถวอื่นที่กดไม่ได้ (disabled)', values: ['0', `${disabledOthers.length} ปุ่ม`], same: disabledOthers.length === 0 }] : []),
          ];
          const othersState = await Promise.all(otherBtns.map(async (b) => (await b.getAttribute('class'))?.includes('ant-btn-loading') ?? false));
          const ownSpin = spinning.some((b) => b.label === ownLabel);
          // ตารางเทียบก่อน แล้วถ่ายภาพ — ให้ตารางอยู่ในภาพด้วย (คอลัมน์คิวอยู่ซ้ายสุด ตารางอยู่ขวา ไม่บัง)
          await showCompareTable(page, `SBH-3606 กด ${prefix} ผู้ป่วย A (คิว ${A.queue}) รายเดียว`, ['Expected', 'จริง'], rowsTable, { side: 'right' });
          // ป้ายเฉพาะปุ่ม A (Expected: หมุน) · B / C กรอบอย่างเดียว (แถวชิดกัน ป้ายทับกันเอง) — B / C ไม่หมุนดูจากตาราง + ภาพขยาย
          await markEvidence(expected(own, ownSpin ? `หมุน (A ที่กด)` : `หมุน (A) · จริง: ไม่หมุน`), ...otherBtns);
          // ภาพขยายคอลัมน์ "คิว" ของแถว A / B / C (spinner antd ในภาพเต็มจอเล็ก ~8 px)
          const boxes = (await Promise.all([A, B, C].map(async (p) => (await cellOf(p)).boundingBox()))).filter((b): b is NonNullable<typeof b> => !!b);
          if (boxes.length) {
            const x = Math.max(0, Math.min(...boxes.map((b) => b.x)) - 8);
            const y = Math.max(0, Math.min(...boxes.map((b) => b.y)) - 30);
            const right = Math.max(...boxes.map((b) => b.x + b.width)) + 260;
            const bottom = Math.max(...boxes.map((b) => b.y + b.height)) + 8;
            const zoom = await page.screenshot({ clip: { x, y, width: Math.min(1920, right) - x, height: Math.min(1080, bottom) - y } });
            await test.info().attach(`ขยาย — ${prefix} A คอลัมน์คิว`, { body: zoom, contentType: 'image/png' });
            fs.mkdirSync(test.info().outputPath('evidence'), { recursive: true });
            fs.writeFileSync(test.info().outputPath('evidence', `zz ขยาย ${name}.png`), zoom);
          }
          await snapEvidence(page, `ระหว่างรอ — ${prefix} A ไอคอนหมุน`);
          void othersState;
          const stillWaiting = Date.now() - started < DELAY_MS - 500;
          note(`ภาพตารางเทียบ ${prefix}`, stillWaiting ? 'ถ่ายระหว่างคำขอยังไม่ตอบ' : 'คำขออาจตอบแล้วตอนถ่าย');
          ok = true;
          try {
            expect(spinOthers.map((b) => b.label), `Expected: กด ${ownLabel} แล้วปุ่ม ${prefix} ของแถวอื่นไม่หมุน`).toEqual([]);
          } finally {
            const response = await res;
            delayOn = false;
            note(`คำขอ ${prefix} ${A.queue}`, `HTTP ${response.status()} · ตอบหลังกด ${((Date.now() - started) / 1000).toFixed(1)} วิ (หน่วง ${DELAY_MS / 1000} วิ ในเบราว์เซอร์)`);
            await hideCompareTable(page);
          }
        });
        if (!ok) delayOn = false;

        await checkStep(page, `หลังคำขอตอบ — ${prefix} ผู้ป่วย A`, async () => {
          const toast = page.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: name === 'call' ? `ส่งคิว ${A.queue}` : 'จบคิวแล้ว' }).first();
          await toast.waitFor({ state: 'visible', timeout: 30_000 });
          await expect.poll(async () => (await readButtons(page, prefix)).filter((b) => b.loading).length, { timeout: 15_000 }).toBe(0);
          await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          await markEvidence(alerted(toast), ...otherBtns.map((b, i) => expected(b, `กลับเป็นปกติ (${others[i].key})`)));
        });
      };

      await startClip(page, 'call');
      await pressAndCount('call');
      // toast "ส่งคิว …" ค้างไปถึงภาพก่อนกดจบคิว (Sub Agent ทัก 3 พ.ย.) → รอนานขึ้น
      await page.locator('.ant-message-notice, .ant-notification-notice').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => undefined);
      await startClip(page, 'complete');
      await pressAndCount('complete');
      await startClip(page, 'after');
      note('คำขอที่ถูกหน่วง', delayed.join(' · ') || '(ไม่มี — page.route ไม่เห็นคำขอ)');
      finish();
    },
  );
});
