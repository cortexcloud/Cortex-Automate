import type { Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, expectTriageFormOpen, gotoErDashboard, trackOpenedErVisits, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import { painScoreSelect, saveButton, triageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, registerAndOpenErVisit, savePhysicianNote } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, fillTriage, gotoVisit } from '../../../mock-data/uat-play';

// SBH-2436 [ER][Triage Form] บันทึกคัดกรองบนหน้า Overview แล้วต้องมีแจ้งเตือนสำเร็จ + หัวข้อ "คัดกรอง ER" / ปุ่มบันทึก fixed เวลาเลื่อนจอ (เหมือน ER Physician Note)
// ตัวแก้: SBH-2437 · ชุด EXE SBH-2535 → HPY SBH-2537 (TC-001–006 = SBH-2543–2548) · EDG SBH-2538 (TC-007–008 = SBH-2549–2550) · ERR SBH-2539 (TC-009 = SBH-2551)
// 1 เทส 1 flow (R9): ผู้ป่วย AUTO ใหม่ 1 ราย → Visit ER สิทธิ UC → Triage ครั้งแรก ESI 3 (หน้าเปลี่ยนเป็น Overview) → ทุก TC ทำบนหน้า Overview ของ Visit นี้ → ปิด Visit ที่การเงิน (afterEach)
// ฟอร์มคัดกรองบน Overview: หัวแผง `คัดกรอง ER` (+ บันทึก / คัดกรองซ้ำ / พิมพ์บัตรคิว / พิมพ์ป้ายปลายเตียง) อยู่ซ้าย · ER Physician Note อยู่ขวา · ทั้งแผง Overview เลื่อนด้วย scroll container เดียว
// TC ที่ไม่ผ่านไม่หยุดเทส (soft) — เทสจบไม่ผ่านพร้อมรายการขั้น
// รัน (dev-x): npx playwright test --headed --grep @SBH-2436 --output=.cache/run-2436
// SBH2436_VISIT=<HN>,<VN>,<EN> = ใช้ผู้ป่วยที่ Triage ครั้งแรกแล้ว (ไม่สร้างใหม่)

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC = {
  1: 'TC-001 (SBH-2543)',
  2: 'TC-002 (SBH-2544)',
  3: 'TC-003 (SBH-2545)',
  4: 'TC-004 (SBH-2546)',
  5: 'TC-005 (SBH-2547)',
  6: 'TC-006 (SBH-2548)',
  7: 'TC-007 (SBH-2549)',
  8: 'TC-008 (SBH-2550)',
  9: 'TC-009 (SBH-2551)',
} as const;
const TRIAGE_SAVED = 'กรอกข้อมูล คัดกรอง ER สำเร็จ';
const TRIAGE_FAILED = 'กรอกข้อมูล คัดกรอง ER ไม่สำเร็จ';
const NOTE_SAVED = 'กรอกข้อมูล ER Physician Note สำเร็จ';
const firstLine = (error: unknown) => String(error instanceof Error ? error.message : error).split('\n')[0];

/** แจ้งเตือนมุมขวาบน (Ant Design notification) ที่มีข้อความนี้ */
const notice = (page: Page, text: string) => page.locator('.ant-notification-notice').filter({ hasText: text });

/** ตำแหน่งของ element บนจอ + scrollTop ของแผงที่เลื่อน + position ของ ancestor ที่ sticky */
async function layoutOf(target: Locator) {
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    let sticky = '';
    let scrollTop = -1;
    for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (!sticky && cs.position === 'sticky') sticky = `sticky top=${cs.top}`;
      if (scrollTop < 0 && /(auto|scroll)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight + 2) scrollTop = Math.round(node.scrollTop);
    }
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), sticky: sticky || '-', scrollTop };
  });
}

/** เลื่อนแผง Overview ด้วยล้อเมาส์ (เหมือนผู้ใช้) จนถึงล่างสุด / บนสุด — คืน scrollTop สุดท้าย */
async function scrollPanel(page: Page, over: Locator, to: 'bottom' | 'top') {
  const box = await over.boundingBox();
  await page.mouse.move((box?.x ?? 400) + 200, 600);
  const position = () =>
    over.evaluate((el) => {
      for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
        const cs = getComputedStyle(node);
        if (/(auto|scroll)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight + 2) return { top: node.scrollTop, max: node.scrollHeight - node.clientHeight };
      }
      return { top: 0, max: 0 };
    });
  for (let i = 0; i < 20; i++) {
    const { top, max } = await position();
    if (to === 'bottom' ? top >= max - 2 : top <= 0) break;
    await page.mouse.wheel(0, to === 'bottom' ? 800 : -800);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(500);
  return Math.round((await position()).top);
}

test.describe(`SBH-2436 แจ้งเตือนบันทึกคัดกรอง ER + หัวข้อ / ปุ่มบันทึก fixed บนหน้า Overview (${SYSTEM})`, () => {
  test.skip(SYSTEM !== 'dev-x', 'รอบนี้ผู้ใช้สั่งทดสอบบน Dev-X — SBH Prod ต้องได้รับอนุญาตเป็นรายการ์ด (R40)');
  test.describe.configure({ timeout: 600_000 });

  let opened: Map<string, ErVisit>;
  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });
  test.afterEach(async ({ page, context }) => {
    await context.setOffline(false);
    await hideCompareTable(page);
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${firstLine(error)}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  test(
    'ผู้ป่วย AUTO ใหม่: บันทึกคัดกรอง ER บนหน้า Overview มีแจ้งเตือน และหัวข้อ / ปุ่มบันทึกค้างเมื่อเลื่อนจอ (Super_User)',
    {
      tag: ['@SBH-2436', '@SBH-2543', '@SBH-2544', '@SBH-2545', '@SBH-2546', '@SBH-2547', '@SBH-2548', '@SBH-2549', '@SBH-2550', '@SBH-2551'],
      annotation: [linear('SBH-2436'), linear('SBH-2535')],
    },
    async ({ page, context }) => {
      const main = page.getByRole('main');
      const form = triageForm(page);
      const save = saveButton(page);
      const triageTitle = main.getByRole('heading', { name: 'คัดกรอง ER', exact: true }).first();
      // filter({ has }) ต้องใช้ locator ที่เริ่มจาก page (ถ้าเริ่มจาก main จะหาไม่เจอ)
      const triageHeader = main.locator('[class*="_sticky_"]').filter({ has: page.getByRole('heading', { name: 'คัดกรอง ER', exact: true }) }).first();
      const noteTitle = main.getByRole('heading', { name: 'ER Physician Note', exact: true }).first();
      const noteHeader = main.locator('[class*="_sticky_"]').filter({ has: page.getByRole('heading', { name: 'ER Physician Note', exact: true }) }).first();
      const noteSave = noteHeader.getByRole('button', { name: 'save บันทึก' });
      const history = form.getByRole('listitem').filter({ hasText: /โดย/ });
      const failures: string[] = [];
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      const soft = (title: string, body: () => Promise<void>) =>
        checkStep(page, title, body).then(
          () => true,
          (error: unknown) => {
            failures.push(`${title} — ${firstLine(error)}`);
            console.log(`    ✗ ${title} — ${firstLine(error)}`);
            return false;
          },
        );
      let visit!: ErVisit;
      let pain = 3;

      // จดแจ้งเตือนทุกตัวที่ขึ้นบนหน้าเว็บพร้อมเวลา (แจ้งเตือนหายเองใน ~4.5 วินาที — ใช้ยืนยันว่าขึ้นจริงไหม แม้สคริปต์จับไม่ทัน)
      await page.addInitScript(() => {
        const w = window as unknown as { __notices: { at: string; text: string }[] };
        w.__notices = [];
        new MutationObserver(() => {
          for (const el of document.querySelectorAll('.ant-notification-notice:not([data-seen])')) {
            el.setAttribute('data-seen', '1');
            w.__notices.push({ at: new Date().toISOString(), text: (el.textContent ?? '').trim() });
          }
        }).observe(document, { childList: true, subtree: true });
      });
      const notices = () => page.evaluate(() => (window as unknown as { __notices?: { at: string; text: string }[] }).__notices ?? []).catch(() => []);
      test.info().annotations.push({ type: 'จดแจ้งเตือน', description: 'MutationObserver จดแจ้งเตือน .ant-notification-notice ทุกตัว (เริ่มจดตั้งแต่โหลดหน้าครั้งถัดไป)' });

      // นับคำสั่งบันทึกของฟอร์มคัดกรอง (contribution ของ template คัดกรอง + PATCH triage-result) — ใช้ใน TC-007
      const saves = { contribution: 0, triageResult: 0 };
      page.on('request', (req) => {
        const path = new URL(req.url()).pathname;
        if (req.method() === 'POST' && /\/contribution$/.test(path) && /triage/i.test(req.postData() ?? '') && !/physician_note/.test(req.postData() ?? '')) saves.contribution += 1;
        if (req.method() === 'PATCH' && /\/triage-result$/.test(path)) saves.triageResult += 1;
      });

      /** แก้ค่าในฟอร์ม (Pain score สลับ 3 ↔ 4) ให้การบันทึกมีข้อมูลเปลี่ยนจริง */
      const editTriage = async () => {
        pain = pain === 3 ? 4 : 3;
        await painScoreSelect(page).selectOption(String(pain));
        return painScoreSelect(page);
      };

      /** กดปุ่มบันทึกของฟอร์มคัดกรอง → รอ PATCH triage-result → ถ่ายแจ้งเตือนทันทีที่ขึ้น (หายเองใน ~4.5 วินาที) · คืนแจ้งเตือนที่เห็น */
      const saveAndSnap = async (name: string) => {
        const done = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
        await save.click();
        await expectOk(await done, `บันทึกผล Triage ของ ${visit.en}`);
        const toast = notice(page, TRIAGE_SAVED).first();
        const shown = await toast.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false);
        let style = { icon: '-', close: '-' };
        if (shown) {
          await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          style = await toastStyle(toast);
          await markEvidence(alerted(toast), expected(triageHeader));
          await snapEvidence(page, name);
        }
        return { shown, toast, style };
      };
      /** รูปแบบของแจ้งเตือน: ไอคอน + ปุ่มปิด */
      async function toastStyle(t: Locator) {
        return {
          icon: (await t.locator('.ant-notification-notice-icon-success').count()) ? 'success (ถูกสีเขียว)' : 'อื่น',
          close: (await t.locator('.ant-notification-notice-close').count()) ? 'มีปุ่มปิด' : 'ไม่มีปุ่มปิด',
        };
      }

      // ---------- เตรียมผู้ป่วย: Triage ครั้งแรกแล้วหน้าเปลี่ยนเป็น Overview ----------
      const reuse = (process.env.SBH2436_VISIT ?? '').split(',').filter(Boolean);
      if (reuse.length === 3) {
        visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
        note('ผู้ป่วยเดิม', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
        await gotoVisit(page, visit);
      } else {
        await checkStep(page, 'เตรียม — เปิด Visit ER ผู้ป่วย AUTO ใหม่ แล้วบันทึก Triage ครั้งแรก ESI 3', async () => {
          await gotoErDashboard(page);
          const patient = newTestPatient('Toast2436');
          visit = await registerAndOpenErVisit(page, patient);
          note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en} · SBH2436_VISIT=${visit.hn},${visit.vn},${visit.en}`);
          await expectTriageFormOpen(page, visit);
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          await fillTriage(page, visit, { level: 3, vitals: VITALS_NORMAL });
          const done = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
          await save.click();
          await expectOk(await done, `บันทึก Triage ครั้งแรกของ ${visit.en}`);
          await expect(main.getByText('Clinical Summary', { exact: true }), 'บันทึก Triage แล้วหน้าต้องเปลี่ยนเป็น Overview').toBeVisible({ timeout: 60_000 });
          await dismissToast(page, TRIAGE_SAVED);
        });
      }
      await expect(triageTitle, 'หน้า Overview ต้องมีฟอร์ม คัดกรอง ER').toBeVisible({ timeout: 60_000 });
      await expect(noteTitle, 'หน้า Overview ต้องมี ER Physician Note ฝั่งขวา').toBeVisible({ timeout: 60_000 });
      await expect(save, 'ปุ่มบันทึกของคัดกรอง ER ต้องกดได้').toBeEnabled({ timeout: 30_000 });
      // หน้า Overview โหลด Physician Note ตามหลัง (Loading…) — รอให้ฟอร์มขึ้นก่อนเลื่อนจอ
      await expect(main.locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').first()).toBeVisible({ timeout: 60_000 });

      // ---------- TC-001 บันทึกโดยไม่เลื่อนจอ ----------
      let triageToastBox: { x: number; y: number; width: number; height: number } | null = null;
      let triageStyle = { icon: '-', close: '-' };
      // ผลของการกดบันทึก 1 ครั้ง (ฐานของ TC-007)
      const single = { contribution: 0, triageResult: 0, history: 0 };
      await soft(`${TC[1]} ขั้น 2-4 แก้ข้อมูลในฟอร์มคัดกรอง ER แล้วกดบันทึกโดยไม่เลื่อนหน้าจอ`, async () => {
        await scrollPanel(page, form, 'top');
        await triageHeader.scrollIntoViewIfNeeded();
        const field = await editTriage();
        await markEvidence(filled(field), clicked(save));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรอง ไม่เลื่อนจอ');
        const before = { ...saves, history: await history.count() };
        const { shown, toast, style } = await saveAndSnap('หลังกด — แจ้งเตือน ไม่เลื่อนจอ');
        triageToastBox = shown ? await toast.boundingBox() : null;
        triageStyle = style;
        await page.waitForTimeout(4_000);
        Object.assign(single, { contribution: saves.contribution - before.contribution, triageResult: saves.triageResult - before.triageResult, history: (await history.count()) - before.history });
        note('บันทึก 1 ครั้ง (TC-001)', `contribution ${single.contribution} · triage-result ${single.triageResult} · ประวัติการคัดกรอง +${single.history}`);
        expect(shown, `Expected: แสดงแจ้งเตือน "${TRIAGE_SAVED}"`).toBe(true);
        await markEvidence(alerted(toast));
      });
      await dismissToast(page, TRIAGE_SAVED);

      // ---------- TC-003 เทียบแจ้งเตือนกับ ER Physician Note ----------
      await soft(`${TC[3]} ขั้น 3-5 บันทึก ER Physician Note แล้วเทียบแจ้งเตือนกับของคัดกรอง ER`, async () => {
        // บันทึกที่แผงขวาของหน้า Overview (div ชั้นในสุดที่มีทั้งหัวแผง ER Physician Note และช่อง Present Illness)
        const notePanel = main
          .locator('div')
          .filter({ has: page.getByRole('heading', { name: 'ER Physician Note', exact: true }) })
          .filter({ has: page.locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]') })
          .last();
        const startedAt = new Date().toISOString();
        await savePhysicianNote(page, 'K30', { panel: notePanel });
        await expect(page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: 'ER Physician Note' }), 'บันทึกบนหน้า Overview (ไม่ได้เปิดแท็บ ER Physician Note แยก)').toHaveCount(0);
        const toast = notice(page, NOTE_SAVED).first();
        const seen = await toast.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false);
        const since = (await notices()).filter((n) => n.at >= startedAt);
        note('TC-003 แจ้งเตือนหลังกดบันทึก Physician Note', since.length ? since.map((n) => `${n.at.slice(11, 19)} ${n.text}`).join(' | ') : '(ไม่มีแจ้งเตือน)');
        note('TC-003 สถานะหัวแผง Physician Note', ((await noteHeader.innerText()).replace(/\s+/g, ' ').trim()).slice(0, 200));
        expect(seen, `บันทึก Physician Note แล้วต้องมีแจ้งเตือน "${NOTE_SAVED}"`).toBe(true);
        await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
        await markEvidence(alerted(toast), clicked(noteSave));
        await snapEvidence(page, 'หลังกด — แจ้งเตือน Physician Note');
        const noteBox = await toast.boundingBox();
        const noteStyle = await toastStyle(toast);
        const pos = (b: typeof noteBox) => (b ? `x ${Math.round(b.x)} · y ${Math.round(b.y)} · ${Math.round(b.width)}×${Math.round(b.height)}` : '-');
        const rows: CompareRow[] = [
          ['ข้อความ', `กรอกข้อมูล คัดกรอง ER สำเร็จ`, NOTE_SAVED, 'รูปแบบ "กรอกข้อมูล <ชื่อฟอร์ม> สำเร็จ"'],
          ['ตำแหน่ง / ขนาด', pos(triageToastBox), pos(noteBox), 'มุมขวาบน ขนาดเท่ากัน'],
          ['ไอคอน', triageStyle.icon, noteStyle.icon, 'เหมือนกัน'],
          ['ปุ่มปิด', triageStyle.close, noteStyle.close, 'เหมือนกัน'],
        ].map(([label, a, b]) => ({
          label,
          values: [a, b],
          same: label === 'ข้อความ' ? a.replace('คัดกรอง ER', '#') === b.replace('ER Physician Note', '#') : label === 'ตำแหน่ง / ขนาด' ? !!triageToastBox && !!noteBox && Math.abs(triageToastBox.x - noteBox.x) < 8 && Math.abs(triageToastBox.y - noteBox.y) < 8 && Math.abs(triageToastBox.width - noteBox.width) < 4 : a === b,
        }));
        await dismissToast(page, NOTE_SAVED);
        await scrollPanel(page, form, 'top');
        await showCompareTable(page, 'SBH-2545 แจ้งเตือนบันทึกสำเร็จ: คัดกรอง ER เทียบ ER Physician Note', ['คัดกรอง ER (TC-001)', 'ER Physician Note'], rows, { side: 'bottom' });
        await markEvidence(expected(noteHeader));
        await holdForClip(page, 2_500);
        expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'Expected: แจ้งเตือนของคัดกรอง ER รูปแบบเหมือน Physician Note').toEqual([]);
      });
      await hideCompareTable(page);
      await dismissToast(page, NOTE_SAVED);

      // ---------- TC-004 / 005 / 006 เลื่อนจอลงแล้วหัวข้อ / ปุ่มบันทึกค้าง ----------
      // วัดตำแหน่งตอนแผงอยู่บนสุดก่อน (ขั้นบันทึก Physician Note ทำให้แผงเลื่อนค้างไว้)
      await scrollPanel(page, form, 'top');
      const top = { triage: await layoutOf(triageHeader), note: await layoutOf(noteHeader) };
      const scrolledTo = await scrollPanel(page, form, 'bottom');
      const bottom = { triage: await layoutOf(triageHeader), note: await layoutOf(noteHeader), title: await layoutOf(triageTitle), save: await layoutOf(save) };
      note('ตำแหน่งหัวแผง', `ก่อนเลื่อน: คัดกรอง ER y=${top.triage.top} · Physician Note y=${top.note.top} → เลื่อนลง ${scrolledTo} px: คัดกรอง ER y=${bottom.triage.top} · Physician Note y=${bottom.note.top} (${bottom.triage.sticky})`);
      const viewport = page.viewportSize()!;
      await soft(`${TC[4]} ขั้น 3 เลื่อนฟอร์มคัดกรอง ER ลงด้านล่าง หัวข้อ "คัดกรอง ER" ยังค้างด้านบน`, async () => {
        await markEvidence(expected(triageHeader));
        await holdForClip(page);
        expect(scrolledTo, 'แผงต้องเลื่อนลงได้ (ฟอร์มยาวเกินจอ)').toBeGreaterThan(500);
        await expect(triageTitle, 'Expected: หัวข้อ "คัดกรอง ER" ยังแสดงอยู่ในจอ').toBeInViewport();
        expect(bottom.title.top, 'หัวข้ออยู่แถวบนของแผง (ไม่เลื่อนหายตามจอ)').toBeLessThan(260);
      });
      await soft(`${TC[5]} ขั้น 3 เลื่อนลงด้านล่าง ปุ่มบันทึกยังค้างอยู่และกดได้`, async () => {
        await markEvidence(expected(save));
        await holdForClip(page);
        await expect(save, 'Expected: ปุ่มบันทึกยังแสดงอยู่ในจอ').toBeInViewport();
        await expect(save, 'Expected: ปุ่มบันทึกกดได้ทันที').toBeEnabled();
        expect(bottom.save.bottom, 'ปุ่มอยู่ในจอ').toBeLessThan(viewport.height);
      });
      await soft(`${TC[6]} ขั้น 3-5 เทียบตำแหน่งหัวข้อ / ปุ่มบันทึกแบบ fixed กับ ER Physician Note`, async () => {
        const rows: CompareRow[] = [
          { label: 'ก่อนเลื่อน (y)', values: [String(top.triage.top), String(top.note.top)], same: true },
          { label: `หลังเลื่อนลง ${scrolledTo} px (y)`, values: [String(bottom.triage.top), String(bottom.note.top)], same: Math.abs(bottom.triage.top - bottom.note.top) <= 2 },
          { label: 'แบบการค้าง (CSS)', values: [bottom.triage.sticky, bottom.note.sticky], same: bottom.triage.sticky === bottom.note.sticky && bottom.triage.sticky !== '-' },
          { label: 'ปุ่มบันทึกในหัวแผง', values: [(await save.isVisible()) ? 'แสดง' : 'ไม่แสดง', (await noteSave.isVisible()) ? 'แสดง' : 'ไม่แสดง'], same: (await save.isVisible()) && (await noteSave.isVisible()) },
        ];
        await showCompareTable(page, 'SBH-2548 หัวแผงแบบ fixed: คัดกรอง ER เทียบ ER Physician Note', ['คัดกรอง ER', 'ER Physician Note'], rows, { side: 'bottom' });
        await markEvidence(expected(triageHeader), expected(noteHeader));
        await holdForClip(page, 2_500);
        expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'Expected: ตำแหน่งหัวข้อและปุ่มบันทึกแบบ fixed เหมือน Physician Note').toEqual([]);
      });
      await hideCompareTable(page);

      // ---------- TC-002 เลื่อนลงแล้วกดบันทึก ----------
      await soft(`${TC[2]} ขั้น 3-5 แก้ข้อมูล เลื่อนลงล่างสุดของฟอร์ม แล้วกดบันทึก`, async () => {
        await scrollPanel(page, form, 'top');
        await triageHeader.scrollIntoViewIfNeeded();
        const field = await editTriage();
        await markEvidence(filled(field));
        await snapEvidence(page, 'กรอก — แก้ Pain score');
        await scrollPanel(page, form, 'bottom');
        await markEvidence(clicked(save));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — บันทึกหลังเลื่อนลงล่างสุด');
        const { shown, toast } = await saveAndSnap('หลังกด — แจ้งเตือน หลังเลื่อนลง');
        expect(shown, `Expected: แสดงแจ้งเตือน "${TRIAGE_SAVED}" แม้กดจากตำแหน่งที่เลื่อนลงแล้ว`).toBe(true);
        await markEvidence(alerted(toast));
      });
      await dismissToast(page, TRIAGE_SAVED);

      // ---------- TC-008 เลื่อนกลับขึ้นบนสุด หัวแผงไม่ทับช่องแรก ----------
      await soft(`${TC[8]} ขั้น 3-4 เลื่อนลงล่างสุดแล้วกลับขึ้นบนสุด หัวข้อ / ปุ่มบันทึกไม่ทับช่องแรกของฟอร์ม`, async () => {
        await scrollPanel(page, form, 'bottom');
        const back = await scrollPanel(page, form, 'top');
        expect(back, 'เลื่อนกลับขึ้นบนสุดได้').toBe(0);
        const firstSection = form.getByRole('button', { name: /^Vital Signs/ }).first();
        await triageHeader.scrollIntoViewIfNeeded();
        const header = await layoutOf(triageHeader);
        const first = await layoutOf(firstSection);
        note('TC-008 ตำแหน่ง', `หัวแผงคัดกรอง y ${header.top}–${header.bottom} · ส่วน Vital Signs y ${first.top}–${first.bottom}`);
        // ช่องแรกตีกรอบไม่ใส่ป้าย (ป้ายจะทับลิงก์ แสดงคำอธิบายเพิ่มเติม)
        await markEvidence(expected(triageHeader), firstSection);
        await holdForClip(page);
        expect(header.bottom, 'Expected: หัวแผงไม่ซ้อนทับช่องกรอกข้อมูลแรกของแบบฟอร์ม').toBeLessThanOrEqual(first.top + 1);
      });

      // ---------- TC-007 กดบันทึกซ้ำติดกันหลายครั้ง ----------
      await soft(`${TC[7]} ขั้น 3-5 เลื่อนลงแล้วกดปุ่มบันทึกติดกัน 3 ครั้ง ไม่เกิดข้อมูลคัดกรองซ้ำ`, async () => {
        const historyBefore = await history.count();
        const field = await editTriage();
        await markEvidence(filled(field));
        await scrollPanel(page, form, 'bottom');
        const before = { ...saves };
        await markEvidence(clicked(save));
        await snapEvidence(page, 'ก่อนกด — กดบันทึกติดกัน 3 ครั้ง');
        const done = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
        await save.click({ clickCount: 1 });
        await save.click({ force: true, timeout: 2_000 }).catch(() => undefined);
        await save.click({ force: true, timeout: 2_000 }).catch(() => undefined);
        await expectOk(await done, 'บันทึกผล Triage');
        // รอให้คำสั่งที่อาจยิงตามมาจบ แล้วนับ
        await page.waitForTimeout(8_000);
        const sent = { contribution: saves.contribution - before.contribution, triageResult: saves.triageResult - before.triageResult };
        const toasts = await notice(page, TRIAGE_SAVED).count();
        await scrollPanel(page, form, 'top');
        await triageHeader.scrollIntoViewIfNeeded();
        const historyAfter = await history.count();
        note('TC-007 กดบันทึก 3 ครั้ง', `contribution ${sent.contribution} ครั้ง · triage-result ${sent.triageResult} ครั้ง · แจ้งเตือนสำเร็จที่ยังเห็น ${toasts} · ประวัติการคัดกรอง ${historyBefore} → ${historyAfter} รายการ (บันทึก 1 ครั้งใน TC-001: contribution ${single.contribution} · triage-result ${single.triageResult} · ประวัติ +${single.history})`);
        await showCompareTable(
          page,
          'SBH-2549 กดบันทึกติดกัน 3 ครั้ง เทียบกดบันทึก 1 ครั้ง (TC-001)',
          ['กด 3 ครั้ง (TC-007)', 'กด 1 ครั้ง (TC-001)'],
          [
            { label: 'คำสั่งบันทึกฟอร์ม (contribution)', values: [String(sent.contribution), String(single.contribution)], same: sent.contribution === single.contribution },
            { label: 'บันทึกผล Triage (triage-result)', values: [String(sent.triageResult), String(single.triageResult)], same: sent.triageResult === single.triageResult },
            { label: 'รายการในประวัติการคัดกรองที่เพิ่ม', values: [`+${historyAfter - historyBefore}`, `+${single.history}`], same: historyAfter - historyBefore === single.history },
          ],
          { side: 'right', top: '480px' },
        );
        await markEvidence(expected(history.first()));
        await holdForClip(page, 2_500);
        expect(sent.contribution, 'Expected: กดบันทึกติดกันแล้วส่งบันทึกฟอร์มเท่ากับกดครั้งเดียว').toBe(single.contribution);
        expect(sent.triageResult, 'Expected: บันทึกผล Triage เท่ากับกดครั้งเดียว').toBe(single.triageResult);
        expect(historyAfter - historyBefore, 'Expected: ไม่เกิดรายการคัดกรองซ้ำซ้อน').toBe(single.history);
      });
      await hideCompareTable(page);
      await dismissToast(page, TRIAGE_SAVED);

      // ---------- TC-009 บันทึกไม่สำเร็จ (offline) ----------
      await soft(`${TC[9]} ขั้น 3-5 แก้ข้อมูล ตัดเครือข่าย (Offline) แล้วกดบันทึก ต้องไม่ขึ้นแจ้งเตือนสำเร็จ`, async () => {
        await scrollPanel(page, form, 'top');
        await triageHeader.scrollIntoViewIfNeeded();
        const field = await editTriage();
        await context.setOffline(true);
        note('TC-009', 'ตัดเครือข่ายของเบราว์เซอร์ด้วย context.setOffline(true) (เทียบเท่า DevTools → Network → Offline)');
        await markEvidence(filled(field), clicked(save));
        await snapEvidence(page, 'ก่อนกด — บันทึกตอน Offline');
        await save.click();
        const failed = notice(page, TRIAGE_FAILED).first();
        const anyNotice = page.locator('.ant-notification-notice').first();
        await anyNotice.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
        const texts = await page.locator('.ant-notification-notice').allInnerTexts();
        note('TC-009 แจ้งเตือนที่ขึ้น', texts.length ? texts.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | ') : '(ไม่มีแจ้งเตือนใน 15 วินาที)');
        if (texts.length) {
          await anyNotice.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          await markEvidence(alerted(anyNotice));
          await snapEvidence(page, 'หลังกด — แจ้งเตือนตอน Offline');
        }
        await expect(notice(page, TRIAGE_SAVED), `Expected: ไม่แสดงแจ้งเตือน "${TRIAGE_SAVED}"`).toHaveCount(0);
        if (!(await failed.count())) note('TC-009 ข้อสังเกต', `ไม่เห็นแจ้งเตือน "${TRIAGE_FAILED}" (Expected ของ TC ตรวจเฉพาะว่าไม่ขึ้นแจ้งเตือนสำเร็จ)`);
        await markEvidence(...(texts.length ? [alerted(anyNotice)] : []), expected(triageHeader));
      });
      await context.setOffline(false);

      const log = await notices();
      await test.info().attach('แจ้งเตือนทั้งหมดที่ขึ้นระหว่างเทส', { body: JSON.stringify(log, null, 2), contentType: 'application/json' });
      console.log(`    แจ้งเตือนทั้งหมด: ${log.map((n) => `${n.at.slice(11, 19)} ${n.text}`).join(' | ')}`);
      expect(failures, 'ขั้นที่ไม่ผ่าน').toEqual([]);
    },
  );
});
