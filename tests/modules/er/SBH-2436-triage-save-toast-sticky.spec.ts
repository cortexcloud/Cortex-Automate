import type { Locator, Page, Response } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, gotoErDashboard, trackOpenedErVisits, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import { physicianNoteIllness, physicianNotePanel, physicianNoteSaveButton, startPhysicianNote, waitPhysicianNoteForm } from '../../../helpers/functions/er-physician-note';
import { erTriagePanel, erTriageSaveButton, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, gotoVisit } from '../../../mock-data/uat-play';

// SBH-2436 [ER][Triage Form] บันทึกคัดกรองบนหน้า Overview แล้วต้องมีแจ้งเตือนสำเร็จ + หัวข้อ "คัดกรอง ER" / ปุ่มบันทึก fixed เวลาเลื่อนจอ (เหมือน ER Physician Note)
// ตัวแก้: SBH-2437 · ชุด EXE SBH-2535 → HPY SBH-2537 (TC-001–006 = SBH-2543–2548) · EDG SBH-2538 (TC-007–008 = SBH-2549–2550) · ERR SBH-2539 (TC-009 = SBH-2551)
// 1 เทส 1 flow (R9): ผู้ป่วย AUTO ใหม่ 1 ราย → Visit ER สิทธิ UC → คัดกรองครั้งแรก ESI 3 (หน้าเปลี่ยนเป็น Overview) → ทุก TC ทำบนหน้า Overview ของ Visit นี้ → ปิด Visit ที่การเงิน (afterEach)
// คลิป 1 ไฟล์ต่อ 1 TC (R61): startClip(page, 'TC-00x') → clip-TC-00x.webm
// ฟอร์มคัดกรองรุ่นใหม่ (clinical form · dev-x 2 พ.ย. 2026 ไฟล์แอป index-QvwAwrB-.js): บันทึก = POST /cortex-api/clinical-form-groups/<id>/saves · แจ้งเตือนสำเร็จขึ้นหลังกด ~14–17 วินาที
// หน้า Overview: ซ้าย = Clinical Summary + ประวัติการคัดกรอง + ฟอร์มคัดกรอง · ขวา = Clinical Information (ER Physician Note) — 2 ฝั่งเลื่อนแยกคอลัมน์ (`_column_`)
// TC ที่ไม่ผ่านไม่หยุดเทส (soft) — เทสจบไม่ผ่านพร้อมรายการขั้น
// รัน (dev-x): npx playwright test --headed --grep @SBH-2436 --no-deps --project=chrome --output=<โฟลเดอร์นอก OneDrive>
// SBH2436_VISIT=<HN>,<VN>,<EN> = ใช้ผู้ป่วยที่คัดกรองครั้งแรกแล้ว (ไม่สร้างใหม่)

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
const TRIAGE_FAILED = 'บันทึกคัดกรอง ER ไม่สำเร็จ';
// dev-x 2 พ.ย. 2026 รอบ 1: หลังกดบันทึก ฟอร์มโหลดใหม่ (~60 คำขอ clinical-form-sources) แล้วหน้าเว็บค้าง (main thread ไม่ตอบ) ได้ถึง ~3 นาที
// แจ้งเตือนขึ้นแล้วแต่สคริปต์จับไม่ได้จนหน้าเว็บกลับมา → รอได้ถึง 150 วินาที
const TOAST_WAIT = 150_000;
/** TC-009: รอดูว่าไม่มีแจ้งเตือนสำเร็จนานเท่านี้หลังกดบันทึกตอน Offline (แจ้งเตือนปกติขึ้น ~15 วินาที) */
const OFFLINE_WAIT = 60_000;
const firstLine = (error: unknown) => String(error instanceof Error ? error.message : error).split('\n')[0];
const SAVES = /\/cortex-api\/clinical-form-groups\/[^/]+\/saves$/;

/** แจ้งเตือนมุมขวาบน (Ant Design notification) ที่มีข้อความนี้ */
const notice = (page: Page, text: string | RegExp) => page.locator('.ant-notification-notice').filter({ hasText: text });

/** ปิดแจ้งเตือนมุมขวาบนทุกตัวที่ยังค้าง (กดปุ่ม X) */
async function closeNotices(page: Page) {
  const close = page.locator('.ant-notification-notice-close');
  for (let i = 0; i < 5 && (await close.count()); i++) await close.first().click({ timeout: 3_000 }).catch(() => undefined);
}

/** ตำแหน่งของ element บนจอ + position ของ ancestor ที่ sticky */
async function layoutOf(target: Locator) {
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    let sticky = '';
    for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (!sticky && cs.position === 'sticky') sticky = `sticky top=${cs.top}`;
    }
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), sticky: sticky || '-' };
  });
}

/** เลื่อนคอลัมน์ที่มี `over` ด้วยล้อเมาส์ (เหมือนผู้ใช้) จนถึงล่างสุด / บนสุด — คืน scrollTop สุดท้าย */
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
  for (let i = 0; i < 25; i++) {
    const { top, max } = await position();
    if (to === 'bottom' ? top >= max - 2 : top <= 0) break;
    await page.mouse.wheel(0, to === 'bottom' ? 800 : -800);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(600);
  return Math.round((await position()).top);
}

test.describe(`SBH-2436 แจ้งเตือนบันทึกคัดกรอง ER + หัวข้อ / ปุ่มบันทึก fixed บนหน้า Overview (${SYSTEM})`, () => {
  test.skip(SYSTEM !== 'dev-x', 'ผู้ใช้สั่งทดสอบบน Dev-X — SBH Prod ต้องได้รับอนุญาตเป็นรายการ์ด (R40)');
  test.describe.configure({ timeout: 1_200_000 });

  let opened: Map<string, ErVisit>;
  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });
  test.afterEach(async ({ page, context }) => {
    await context.setOffline(false);
    await startClip(page, 'after');
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
      annotation: [
        { type: 'issue', description: 'https://linear.app/cortexcloud/issue/SBH-2436' },
        { type: 'issue', description: 'https://linear.app/cortexcloud/issue/SBH-2535' },
      ],
    },
    async ({ page, context }) => {
      const main = page.getByRole('main');
      const form = erTriagePanel(page);
      const save = erTriageSaveButton(page);
      const triageTitle = main.getByRole('heading', { name: 'คัดกรอง ER', exact: true }).first();
      // filter({ has }) ต้องใช้ locator ที่เริ่มจาก page (ถ้าเริ่มจาก main จะหาไม่เจอ)
      const triageHeader = main.locator('[class*="_sticky_"]').filter({ has: page.getByRole('heading', { name: 'คัดกรอง ER', exact: true }) }).first();
      const notePanel = physicianNotePanel(page);
      const noteTitle = main.getByRole('heading', { name: 'ER Physician Note', exact: true }).first();
      const noteHeader = main.locator('[class*="_sticky_"]').filter({ has: page.getByRole('heading', { name: 'ER Physician Note', exact: true }) }).first();
      const noteSave = physicianNoteSaveButton(page);
      const history = main.locator('[class*="_triage-history-item_"]');
      const pain = form.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Pain score' }) }).first();
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
      let painValue = 3;

      // จดแจ้งเตือนทุกตัวที่ขึ้นบนหน้าเว็บพร้อมเวลา (แจ้งเตือนหายเองใน ~4.5 วินาที — ใช้ยืนยันว่าขึ้นจริงไหม แม้สคริปต์จับไม่ทัน)
      await page.addInitScript(() => {
        const w = window as unknown as { __notices: { at: number; text: string }[] };
        w.__notices = [];
        new MutationObserver(() => {
          for (const el of document.querySelectorAll('.ant-notification-notice:not([data-seen]),.ant-message-notice:not([data-seen])')) {
            el.setAttribute('data-seen', '1');
            w.__notices.push({ at: Date.now(), text: (el.textContent ?? '').trim() });
          }
        }).observe(document, { childList: true, subtree: true });
      });
      const notices = () => page.evaluate(() => (window as unknown as { __notices?: { at: number; text: string }[] }).__notices ?? []).catch(() => []);
      const noticesSince = async (since: number) => (await notices()).filter((n) => n.at >= since);
      const clock = (ms: number) => new Date(ms).toLocaleTimeString('th-TH', { hour12: false, timeZone: 'Asia/Bangkok' });
      test.info().annotations.push({ type: 'จดแจ้งเตือน', description: 'MutationObserver จดแจ้งเตือน .ant-notification-notice / .ant-message-notice ทุกตัว' });

      // นับคำสั่งบันทึกฟอร์ม (POST …/clinical-form-groups/<id>/saves) + PATCH triage-result — ใช้ใน TC-007
      const saves = { form: 0, triageResult: 0 };
      page.on('request', (req) => {
        const path = new URL(req.url()).pathname;
        if (req.method() === 'POST' && SAVES.test(path)) saves.form += 1;
        if (req.method() === 'PATCH' && /\/triage-result$/.test(path)) saves.triageResult += 1;
      });

      /** แก้ Pain score สลับ 3 ↔ 4 ให้การบันทึกมีข้อมูลเปลี่ยนจริง (selectOption เลื่อนจอไปที่ช่องเอง) */
      // คืนกล่องที่รวมชื่อช่อง "Pain score (0-10)" + select ไว้ตีกรอบ (ตีที่ select อย่างเดียวแล้วป้ายทับชื่อช่อง — รอบ 2 พ.ย.)
      const editTriage = async () => {
        painValue = painValue === 3 ? 4 : 3;
        await pain.selectOption(String(painValue));
        const box = pain.locator('xpath=ancestor::div[.//*[not(self::option)][contains(text(), "Pain score")]][1]');
        return (await box.count()) ? box : pain;
      };
      /** MEWS ยังโหลดข้อมูลต้นทาง = กดบันทึกแล้วได้ 400 INVALID_SNAPSHOT → รอให้หายก่อน */
      const waitFormReady = async () => {
        await expect(form.getByText(/กำลังโหลดข้อมูลต้นทาง|Loading sources/), 'MEWS ต้องโหลดข้อมูลต้นทางเสร็จก่อนบันทึก').toHaveCount(0, { timeout: 45_000 });
        await page.waitForTimeout(1_500);
      };

      /** กดปุ่มบันทึกของฟอร์มคัดกรอง → รอ POST saves → รอแจ้งเตือนสำเร็จ (ขึ้นช้า ~15 วินาที) แล้วถ่ายทันที · คืนแจ้งเตือนที่เห็น + เวลา */
      const saveAndSnap = async (name: string) => {
        const done = waitForApi(page, 'POST', SAVES, 90_000);
        const clickedAt = Date.now();
        await save.click();
        const res: Response = await done;
        const respondedAt = Date.now();
        await expectOk(res, 'บันทึกฟอร์มคัดกรอง ER');
        const toast = notice(page, TRIAGE_SAVED).first();
        const shown = await toast.waitFor({ state: 'visible', timeout: TOAST_WAIT }).then(() => true, () => false);
        const shownAt = Date.now();
        let style = { icon: '-', close: '-' };
        if (shown) {
          await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          style = await toastStyle(toast);
          await markEvidence(alerted(toast, TRIAGE_SAVED), expected(triageHeader, 'บันทึกจากหัวแผงคัดกรอง ER'));
          await snapEvidence(page, name);
        }
        const timing = `กดบันทึก ${clock(clickedAt)} → ระบบตอบ ${((respondedAt - clickedAt) / 1000).toFixed(1)} วิ → แจ้งเตือน ${shown ? `${((shownAt - clickedAt) / 1000).toFixed(1)} วิ หลังกด` : `ไม่ขึ้นใน ${TOAST_WAIT / 1000} วิ`}`;
        return { shown, toast, style, timing };
      };
      /** รูปแบบของแจ้งเตือน: ไอคอน + ปุ่มปิด */
      async function toastStyle(t: Locator) {
        return {
          icon: (await t.locator('.ant-notification-notice-icon-success').count()) ? 'success (ถูกสีเขียว)' : 'อื่น',
          close: (await t.locator('.ant-notification-notice-close').count()) ? 'มีปุ่มปิด' : 'ไม่มีปุ่มปิด',
        };
      }

      // ---------- เตรียมผู้ป่วย: คัดกรองครั้งแรกแล้วหน้าเปลี่ยนเป็น Overview ----------
      const reuse = (process.env.SBH2436_VISIT ?? '').split(',').filter(Boolean);
      if (reuse.length === 3) {
        visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
        note('ผู้ป่วยเดิม', `HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
        await gotoVisit(page, visit);
      } else {
        await checkStep(page, 'เตรียม — เปิด Visit ER ผู้ป่วย AUTO ใหม่ แล้วบันทึกคัดกรองครั้งแรก ESI 3', async () => {
          await gotoErDashboard(page);
          const patient = newTestPatient('Toast2436');
          visit = await registerAndOpenErVisit(page, patient);
          note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en} · SBH2436_VISIT=${visit.hn},${visit.vn},${visit.en}`);
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
          // บันทึกแล้วหน้าเว็บส่ง "ส่งเข้าโซน" (PATCH triage-result) ตามหลัง ~15 วินาที → รอก่อนทำต่อ
          const zoned = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
          await saveErTriageForm(page, `บันทึกคัดกรองครั้งแรก ${visit.en}`);
          await expectOk(await zoned, `ส่งเข้าโซน ${visit.en}`);
          await expect(main.getByText('Clinical Summary', { exact: true }).first(), 'บันทึกคัดกรองแล้วหน้าต้องเปลี่ยนเป็น Overview').toBeVisible({ timeout: 60_000 });
          await dismissToast(page, TRIAGE_SAVED);
        });
      }
      await expect(triageTitle, 'หน้า Overview ต้องมีฟอร์ม คัดกรอง ER').toBeVisible({ timeout: 60_000 });
      await expect(noteTitle, 'หน้า Overview ต้องมี ER Physician Note ฝั่งขวา').toBeVisible({ timeout: 60_000 });
      await waitPhysicianNoteForm(page);
      await expect(save, 'ปุ่มบันทึกของคัดกรอง ER ต้องกดได้').toBeEnabled({ timeout: 30_000 });
      await page.waitForTimeout(3_000);

      // ---------- TC-001 บันทึกโดยไม่เลื่อนจอ ----------
      let triageToastBox: { x: number; y: number; width: number; height: number } | null = null;
      let triageToastText = '-';
      let triageStyle = { icon: '-', close: '-' };
      // ผลของการกดบันทึก 1 ครั้ง (ฐานของ TC-007)
      const single = { form: 0, triageResult: 0, history: 0, toasts: 0 };
      await scrollPanel(page, form, 'top');
      await startClip(page, 'TC-001');
      await soft(`${TC[1]} ขั้น 3-4 แก้ข้อมูลในฟอร์มคัดกรอง ER แล้วกดบันทึกโดยไม่เลื่อนหน้าจอ`, async () => {
        const field = await editTriage();
        await markEvidence(filled(field, `Pain score = ${painValue}`));
        await snapEvidence(page, 'กรอก — แก้ Pain score');
        await scrollPanel(page, form, 'top');
        await waitFormReady();
        await markEvidence(clicked(save, 'บันทึก (ไม่เลื่อนจอ)'));
        await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรอง ไม่เลื่อนจอ');
        const before = { ...saves, history: await history.count(), at: Date.now() };
        const { shown, toast, style, timing } = await saveAndSnap('หลังกด — แจ้งเตือน ไม่เลื่อนจอ');
        triageToastBox = shown ? await toast.boundingBox() : null;
        triageToastText = shown ? (await toast.innerText()).replace(/\s+/g, ' ').trim() : '-';
        triageStyle = style;
        note('TC-001 จังหวะ', timing);
        await page.waitForTimeout(5_000);
        Object.assign(single, {
          form: saves.form - before.form,
          triageResult: saves.triageResult - before.triageResult,
          history: (await history.count()) - before.history,
          toasts: (await noticesSince(before.at)).filter((n) => n.text.includes(TRIAGE_SAVED)).length,
        });
        note('บันทึก 1 ครั้ง (TC-001)', `บันทึกฟอร์ม ${single.form} · triage-result ${single.triageResult} · ประวัติการคัดกรอง +${single.history} · แจ้งเตือนสำเร็จ ${single.toasts}`);
        expect(shown, `Expected: แสดงแจ้งเตือน "${TRIAGE_SAVED}"`).toBe(true);
        await markEvidence(alerted(toast, TRIAGE_SAVED));
      });
      await dismissToast(page, TRIAGE_SAVED);

      // ---------- TC-003 เทียบแจ้งเตือนกับ ER Physician Note ----------
      await startClip(page, 'TC-003');
      await soft(`${TC[3]} ขั้น 3-5 บันทึก ER Physician Note แล้วเทียบแจ้งเตือนกับของคัดกรอง ER`, async () => {
        // บันทึกที่แผงขวาของหน้า Overview: Present illness + Diagnosis K30 (หมอบันทึกได้ต้องมี Diagnosis — R21)
        await physicianNoteIllness(page).scrollIntoViewIfNeeded();
        await startPhysicianNote(page, visit, 'ทดสอบ SBH-2436 เทียบแจ้งเตือน');
        const dx = notePanel.locator('[data-dx-index="0"]').filter({ visible: true }).first();
        await expect(dx, 'ฟอร์ม Physician Note ต้องมีส่วน Diagnosis').toBeVisible({ timeout: 60_000 });
        const search = dx.getByRole('combobox').first();
        await search.scrollIntoViewIfNeeded();
        await search.click();
        await page.keyboard.type('K30', { delay: 60 });
        const option = page.getByRole('option').filter({ visible: true }).filter({ hasText: /^K30\.?\s*-/ }).first();
        await expect(option, 'ค้น Diagnosis K30 ต้องเจอ').toBeVisible({ timeout: 20_000 });
        await option.click();
        await page.waitForTimeout(1_500);
        await markEvidence(filled(dx, 'Diagnosis K30'), clicked(noteSave, 'บันทึก Physician Note'));
        await snapEvidence(page, 'ก่อนกด — บันทึก Physician Note');
        const startedAt = Date.now();
        const done = waitForApi(page, 'POST', SAVES, 120_000);
        await noteSave.click();
        await expectOk(await done, 'บันทึก ER Physician Note');
        const toast = page.locator('.ant-notification-notice').filter({ hasText: /Physician Note/ }).first();
        const seen = await toast.waitFor({ state: 'visible', timeout: TOAST_WAIT }).then(() => true, () => false);
        const since = await noticesSince(startedAt);
        note('TC-003 แจ้งเตือนหลังกดบันทึก Physician Note', since.length ? since.map((n) => `${clock(n.at)} (${((n.at - startedAt) / 1000).toFixed(1)} วิ) ${n.text}`).join(' | ') : `(ไม่มีแจ้งเตือนใน ${TOAST_WAIT / 1000} วินาที)`);
        note('TC-003 หัวแผง Physician Note', (await noteHeader.innerText()).replace(/\s+/g, ' ').trim().slice(0, 200));
        expect(seen, 'บันทึก Physician Note แล้วต้องมีแจ้งเตือนสำเร็จ (ตัวเทียบของ TC นี้)').toBe(true);
        await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
        await markEvidence(alerted(toast, 'แจ้งเตือน Physician Note'), expected(noteHeader, 'บันทึกจากหัวแผง Physician Note'));
        await snapEvidence(page, 'หลังกด — แจ้งเตือน Physician Note');
        const noteBox = await toast.boundingBox();
        const noteText = (await toast.innerText()).replace(/\s+/g, ' ').trim();
        const noteStyle = await toastStyle(toast);
        const pos = (b: typeof noteBox) => (b ? `x ${Math.round(b.x)} · y ${Math.round(b.y)} · ${Math.round(b.width)}×${Math.round(b.height)}` : '-');
        const samePattern = triageToastText.replace('คัดกรอง ER', '#') === noteText.replace('ER Physician Note', '#');
        const samePos = !!triageToastBox && !!noteBox && Math.abs(triageToastBox.x - noteBox.x) < 8 && Math.abs(triageToastBox.y - noteBox.y) < 8 && Math.abs(triageToastBox.width - noteBox.width) < 4;
        // ผู้ใช้ตัดสิน 2 พ.ย. 2026: ข้อความขึ้นต้นต่างกัน ("กรอกข้อมูล …" / "บันทึก …") = Pass + ข้อสังเกต → ตัดสินจากตำแหน่ง / ไอคอน / ปุ่มปิด
        note('TC-003 ข้อสังเกต ข้อความ', `คัดกรอง ER "${triageToastText}" · Physician Note "${noteText}" → ${samePattern ? 'รูปแบบเดียวกัน' : 'คำขึ้นต้นต่างกัน'}`);
        const rows: CompareRow[] = [
          { label: 'ข้อความ (ข้อสังเกต · ไม่ใช้ตัดสิน)', values: [triageToastText, noteText], same: samePattern },
          { label: 'ตำแหน่ง / ขนาด', values: [pos(triageToastBox), pos(noteBox)], same: samePos },
          { label: 'ไอคอน', values: [triageStyle.icon, noteStyle.icon], same: triageStyle.icon === noteStyle.icon },
          { label: 'ปุ่มปิด', values: [triageStyle.close, noteStyle.close], same: triageStyle.close === noteStyle.close },
        ];
        await closeNotices(page);
        const table = await showCompareTable(page, 'SBH-2545 แจ้งเตือนบันทึกสำเร็จ: คัดกรอง ER เทียบ ER Physician Note', ['คัดกรอง ER (TC-001)', 'ER Physician Note'], rows, { side: 'bottom' });
        await markEvidence(expected(table, 'ตำแหน่ง / ไอคอน / ปุ่มปิด เหมือนกัน'));
        await holdForClip(page, 2_500);
        expect(rows.slice(1).filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'Expected: แจ้งเตือนของคัดกรอง ER รูปแบบเหมือน Physician Note').toEqual([]);
      });
      await hideCompareTable(page);
      await closeNotices(page);

      // ---------- TC-004 / 005 / 006 เลื่อนจอลงแล้วหัวข้อ / ปุ่มบันทึกค้าง ----------
      await scrollPanel(page, form, 'top');
      await scrollPanel(page, notePanel, 'top');
      const top = { triage: await layoutOf(triageHeader), note: await layoutOf(noteHeader) };
      await startClip(page, 'TC-004');
      await markEvidence(expected(triageHeader, `ก่อนเลื่อน y = ${top.triage.top}`));
      await snapEvidence(page, 'ก่อนเลื่อน — หัวแผงคัดกรอง ER');
      const scrolledTo = await scrollPanel(page, form, 'bottom');
      const bottom = { triage: await layoutOf(triageHeader), title: await layoutOf(triageTitle), save: await layoutOf(save) };
      note('ตำแหน่งหัวแผงคัดกรอง ER', `ก่อนเลื่อน y=${top.triage.top} → เลื่อนลง ${scrolledTo} px: y=${bottom.triage.top} (${bottom.triage.sticky})`);
      const viewport = page.viewportSize()!;
      await soft(`${TC[4]} ขั้น 3 เลื่อนฟอร์มคัดกรอง ER ลงด้านล่าง หัวข้อ "คัดกรอง ER" ยังค้างด้านบน`, async () => {
        await markEvidence(expected(triageHeader, `หัวข้อค้างด้านบน (เลื่อนลง ${scrolledTo} px)`));
        expect(scrolledTo, 'แผงต้องเลื่อนลงได้ (ฟอร์มยาวเกินจอ)').toBeGreaterThan(500);
        await expect(triageTitle, 'Expected: หัวข้อ "คัดกรอง ER" ยังแสดงอยู่ในจอ').toBeInViewport();
        expect(bottom.title.top, 'หัวข้ออยู่แถวบนของแผง (ไม่เลื่อนหายตามจอ)').toBeLessThan(300);
      });
      await startClip(page, 'TC-005');
      await soft(`${TC[5]} ขั้น 3 เลื่อนลงด้านล่าง ปุ่มบันทึกยังค้างอยู่และกดได้`, async () => {
        await markEvidence(expected(save, 'ปุ่มบันทึกค้าง กดได้'));
        await expect(save, 'Expected: ปุ่มบันทึกยังแสดงอยู่ในจอ').toBeInViewport();
        await expect(save, 'Expected: ปุ่มบันทึกกดได้ทันที').toBeEnabled();
        expect(bottom.save.bottom, 'ปุ่มอยู่ในจอ').toBeLessThan(viewport.height);
      });
      await startClip(page, 'TC-006');
      await soft(`${TC[6]} ขั้น 3-5 เทียบตำแหน่งหัวข้อ / ปุ่มบันทึกแบบ fixed กับ ER Physician Note`, async () => {
        // 2 ฝั่งเลื่อนแยกคอลัมน์ → เลื่อน Physician Note ลงล่างสุดด้วย แล้ววัดหัวแผงทั้งคู่
        const noteScrolled = await scrollPanel(page, notePanel, 'bottom');
        const noteBottom = await layoutOf(noteHeader);
        note('ตำแหน่งหัวแผง Physician Note', `ก่อนเลื่อน y=${top.note.top} → เลื่อนลง ${noteScrolled} px: y=${noteBottom.top} (${noteBottom.sticky})`);
        const triageNow = await layoutOf(triageHeader);
        // ค่าก่อนเลื่อนต่างกันโดยธรรมชาติ (คนละตำแหน่งบนจอ) → ไว้ที่หัวตาราง ไม่ใส่เป็นแถว ✓ / ✗
        const rows: CompareRow[] = [
          { label: 'หลังเลื่อนลงล่างสุด (y)', values: [`${triageNow.top} (เลื่อน ${scrolledTo} px)`, `${noteBottom.top} (เลื่อน ${noteScrolled} px)`], same: Math.abs(triageNow.top - noteBottom.top) <= 4 },
          { label: 'แบบการค้าง (CSS)', values: [triageNow.sticky, noteBottom.sticky], same: triageNow.sticky === noteBottom.sticky && triageNow.sticky !== '-' },
          { label: 'ปุ่มบันทึกในหัวแผง', values: [(await save.isVisible()) ? 'แสดง' : 'ไม่แสดง', (await noteSave.isVisible()) ? 'แสดง' : 'ไม่แสดง'], same: (await save.isVisible()) && (await noteSave.isVisible()) },
        ];
        await showCompareTable(page, `SBH-2548 หัวแผงแบบ fixed: คัดกรอง ER เทียบ ER Physician Note (ก่อนเลื่อน: คัดกรอง ER y = ${top.triage.top} · Physician Note y = ${top.note.top})`, ['คัดกรอง ER', 'ER Physician Note'], rows, { side: 'bottom' });
        await markEvidence(expected(triageHeader, 'หัวแผงคัดกรอง ER ค้าง'), expected(noteHeader, 'หัวแผง Physician Note ค้าง'));
        await holdForClip(page, 2_500);
        expect(noteScrolled, 'แผง Physician Note ต้องเลื่อนลงได้').toBeGreaterThan(500);
        expect(rows.filter((row) => !row.same).map((row) => `${row.label}: ${row.values.join(' ≠ ')}`), 'Expected: ตำแหน่งหัวข้อและปุ่มบันทึกแบบ fixed เหมือน Physician Note').toEqual([]);
      });
      await hideCompareTable(page);
      await scrollPanel(page, notePanel, 'top');

      // ---------- TC-002 เลื่อนลงแล้วกดบันทึก ----------
      await scrollPanel(page, form, 'top');
      await startClip(page, 'TC-002');
      await soft(`${TC[2]} ขั้น 3-5 แก้ข้อมูล เลื่อนลงล่างสุดของฟอร์ม แล้วกดบันทึก`, async () => {
        const field = await editTriage();
        await markEvidence(filled(field, `Pain score = ${painValue}`));
        await snapEvidence(page, 'กรอก — แก้ Pain score');
        await scrollPanel(page, form, 'bottom');
        await waitFormReady();
        await markEvidence(clicked(save, 'บันทึก (หลังเลื่อนลงล่างสุด)'));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — บันทึกหลังเลื่อนลงล่างสุด');
        const { shown, toast, timing } = await saveAndSnap('หลังกด — แจ้งเตือน หลังเลื่อนลง');
        note('TC-002 จังหวะ', timing);
        expect(shown, `Expected: แสดงแจ้งเตือน "${TRIAGE_SAVED}" แม้กดจากตำแหน่งที่เลื่อนลงแล้ว`).toBe(true);
        await markEvidence(alerted(toast, TRIAGE_SAVED));
      });
      await dismissToast(page, TRIAGE_SAVED);

      // ---------- TC-008 เลื่อนกลับขึ้นบนสุด หัวแผงไม่ทับช่องแรก ----------
      await startClip(page, 'TC-008');
      await soft(`${TC[8]} ขั้น 3-4 เลื่อนลงล่างสุดแล้วกลับขึ้นบนสุด หัวข้อ / ปุ่มบันทึกไม่ทับช่องแรกของฟอร์ม`, async () => {
        await scrollPanel(page, form, 'bottom');
        const back = await scrollPanel(page, form, 'top');
        expect(back, 'เลื่อนกลับขึ้นบนสุดได้').toBe(0);
        const firstRow = form.getByText(/บันทึกจากแบบฟอร์มนี้/).first();
        const firstField = form.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first();
        const header = await layoutOf(triageHeader);
        const row = await layoutOf(firstRow);
        const field = await layoutOf(firstField);
        note('TC-008 ตำแหน่ง', `หัวแผงคัดกรอง y ${header.top}–${header.bottom} · แถวแรก (บันทึกจากแบบฟอร์มนี้) y ${row.top}–${row.bottom} · ช่องแรก Suspect Fast Track Type y ${field.top}–${field.bottom}`);
        // ช่องแรกตีกรอบไม่ใส่ป้าย (ป้ายจะทับชื่อช่อง "Suspect Fast Track Type" — TC นี้พิสูจน์ว่าไม่มีอะไรทับช่องแรก)
        await markEvidence(expected(triageHeader, 'หัวแผงไม่ทับช่องแรกของฟอร์ม'), firstField);
        await holdForClip(page);
        expect(header.bottom, 'Expected: หัวแผงไม่ซ้อนทับแถวแรกใต้หัวแผง').toBeLessThanOrEqual(row.top + 1);
        expect(header.bottom, 'Expected: หัวแผงไม่ซ้อนทับช่องกรอกข้อมูลแรกของแบบฟอร์ม').toBeLessThanOrEqual(field.top + 1);
      });

      // ---------- TC-007 กดบันทึกซ้ำติดกันหลายครั้ง ----------
      await startClip(page, 'TC-007');
      await soft(`${TC[7]} ขั้น 3-5 เลื่อนลงแล้วกดปุ่มบันทึกติดกัน 3 ครั้ง ไม่เกิดข้อมูลคัดกรองซ้ำ`, async () => {
        const historyBefore = await history.count();
        const field = await editTriage();
        await markEvidence(filled(field, `Pain score = ${painValue}`));
        await snapEvidence(page, 'กรอก — แก้ Pain score');
        await scrollPanel(page, form, 'bottom');
        await waitFormReady();
        const before = { ...saves, at: Date.now() };
        await markEvidence(clicked(save, 'กดติดกัน 3 ครั้ง'));
        await snapEvidence(page, 'ก่อนกด — กดบันทึกติดกัน 3 ครั้ง');
        const done = waitForApi(page, 'POST', SAVES, 90_000);
        await save.click();
        await save.click({ force: true, timeout: 2_000 }).catch(() => undefined);
        await save.click({ force: true, timeout: 2_000 }).catch(() => undefined);
        await expectOk(await done, 'บันทึกฟอร์มคัดกรอง ER');
        // รอให้คำสั่งที่อาจยิงตามมา + แจ้งเตือน (ช้า ~15 วินาที) จบ แล้วนับ
        await notice(page, TRIAGE_SAVED).first().waitFor({ state: 'visible', timeout: TOAST_WAIT }).catch(() => undefined);
        await page.waitForTimeout(10_000);
        const sent = { form: saves.form - before.form, triageResult: saves.triageResult - before.triageResult };
        const toasts = (await noticesSince(before.at)).filter((n) => n.text.includes(TRIAGE_SAVED)).length;
        await scrollPanel(page, form, 'top');
        await history.first().scrollIntoViewIfNeeded();
        const historyAfter = await history.count();
        note('TC-007 กดบันทึก 3 ครั้ง', `บันทึกฟอร์ม ${sent.form} ครั้ง · triage-result ${sent.triageResult} ครั้ง · แจ้งเตือนสำเร็จ ${toasts} · ประวัติการคัดกรอง ${historyBefore} → ${historyAfter} รายการ (บันทึก 1 ครั้งใน TC-001: บันทึกฟอร์ม ${single.form} · triage-result ${single.triageResult} · ประวัติ +${single.history} · แจ้งเตือน ${single.toasts})`);
        await showCompareTable(
          page,
          'SBH-2549 กดบันทึกติดกัน 3 ครั้ง เทียบกดบันทึก 1 ครั้ง (TC-001)',
          ['กด 3 ครั้ง (TC-007)', 'กด 1 ครั้ง (TC-001)'],
          [
            { label: 'คำสั่งบันทึกฟอร์ม (saves)', values: [String(sent.form), String(single.form)], same: sent.form === single.form },
            { label: 'บันทึกผล Triage (triage-result)', values: [String(sent.triageResult), String(single.triageResult)], same: sent.triageResult === single.triageResult },
            { label: 'รายการในประวัติการคัดกรองที่เพิ่ม', values: [`+${historyAfter - historyBefore}`, `+${single.history}`], same: historyAfter - historyBefore === single.history },
            { label: 'แจ้งเตือนสำเร็จ', values: [String(toasts), String(single.toasts)], same: toasts === single.toasts },
          ],
          { side: 'right', top: '480px' },
        );
        await markEvidence(expected(history.first(), `ประวัติการคัดกรอง ${historyAfter} รายการ`));
        await holdForClip(page, 2_500);
        expect(sent.form, 'Expected: กดบันทึกติดกันแล้วส่งบันทึกฟอร์มเท่ากับกดครั้งเดียว').toBe(single.form);
        expect(sent.triageResult, 'Expected: บันทึกผล Triage เท่ากับกดครั้งเดียว').toBe(single.triageResult);
        expect(historyAfter - historyBefore, 'Expected: ไม่เกิดรายการคัดกรองซ้ำซ้อน').toBe(single.history);
      });
      await hideCompareTable(page);
      await dismissToast(page, TRIAGE_SAVED);

      // ---------- TC-009 บันทึกไม่สำเร็จ (offline) ----------
      await scrollPanel(page, form, 'top');
      await startClip(page, 'TC-009');
      await soft(`${TC[9]} ขั้น 3-5 แก้ข้อมูล ตัดเครือข่าย (Offline) แล้วกดบันทึก ต้องไม่ขึ้นแจ้งเตือนสำเร็จ`, async () => {
        const field = await editTriage();
        await markEvidence(filled(field, `Pain score = ${painValue}`));
        await snapEvidence(page, 'กรอก — แก้ Pain score');
        await waitFormReady();
        await scrollPanel(page, form, 'top');
        await context.setOffline(true);
        note('TC-009', 'ตัดเครือข่ายของเบราว์เซอร์ด้วย context.setOffline(true) (เทียบเท่า DevTools → Network → Offline)');
        await markEvidence(clicked(save, 'บันทึกตอน Offline'));
        await snapEvidence(page, 'ก่อนกด — บันทึกตอน Offline');
        const startedAt = Date.now();
        await save.click();
        const anyNotice = page.locator('.ant-notification-notice').first();
        if (await anyNotice.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false)) {
          await anyNotice.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          await markEvidence(alerted(anyNotice, 'แจ้งเตือนตอน Offline'));
          await snapEvidence(page, 'หลังกด — แจ้งเตือนตอน Offline');
        }
        // แจ้งเตือนสำเร็จปกติขึ้น ~15 วินาที → รอครบ 60 วินาทีก่อนสรุปว่าไม่ขึ้น
        await page.waitForTimeout(Math.max(0, OFFLINE_WAIT - (Date.now() - startedAt)));
        const since = await noticesSince(startedAt);
        const formShown = await save.isVisible().catch(() => false);
        note('TC-009 แจ้งเตือนที่ขึ้น (Offline 60 วินาที)', since.length ? since.map((n) => `${clock(n.at)} (${((n.at - startedAt) / 1000).toFixed(1)} วิ) ${n.text}`).join(' | ') : '(ไม่มีแจ้งเตือน)');
        note('TC-009 หน้าจอหลังกด', formShown ? 'ฟอร์มคัดกรองยังแสดงอยู่' : 'ฟอร์มคัดกรองไม่แสดง (หน้าเว็บเป็นจอโหลด)');
        if (!since.some((n) => n.text.includes(TRIAGE_FAILED))) note('TC-009 ข้อสังเกต', `ไม่เห็นแจ้งเตือน "${TRIAGE_FAILED}" (Expected ของ TC ตรวจเฉพาะว่าไม่ขึ้นแจ้งเตือนสำเร็จ)`);
        const successes = since.filter((n) => n.text.includes(TRIAGE_SAVED));
        const table = await showCompareTable(
          page,
          `SBH-2551 กดบันทึกตอน Offline — แจ้งเตือนที่ขึ้นใน ${OFFLINE_WAIT / 1000} วินาที`,
          ['ที่เห็นจริง'],
          [
            { label: `แจ้งเตือน "${TRIAGE_SAVED}"`, values: [successes.length ? `ขึ้น ${successes.length} ครั้ง` : 'ไม่ขึ้น'], same: !successes.length },
            { label: 'แจ้งเตือนอื่น', values: [since.filter((n) => !n.text.includes(TRIAGE_SAVED)).map((n) => n.text).join(' / ') || '(ไม่มี)'], same: true },
            { label: 'หน้าจอหลังกด', values: [formShown ? 'ฟอร์มคัดกรองยังแสดง' : 'จอโหลดทั้งหน้า'], same: true },
          ],
          { side: 'bottom' },
        );
        await markEvidence(...(formShown ? [expected(triageHeader, 'ไม่ขึ้นแจ้งเตือนสำเร็จ')] : [expected(table, 'ไม่ขึ้นแจ้งเตือนสำเร็จ')]));
        await holdForClip(page, 2_500);
        expect(successes.map((n) => n.text), `Expected: ไม่แสดงแจ้งเตือน "${TRIAGE_SAVED}"`).toEqual([]);
      });
      // ตัดคลิป TC-009 ก่อนต่อเครือข่ายกลับ — ระบบส่งบันทึกที่ค้างไว้เองแล้วขึ้นแจ้งเตือนสำเร็จ (~15 วินาที) ซึ่งอยู่นอกช่วง Offline ของ TC
      await hideCompareTable(page);
      await startClip(page, 'TC-009-online');
      await context.setOffline(false);
      // หลังต่อเครือข่ายกลับ — จดว่ามีแจ้งเตือน / บันทึกตามมาไหม (ข้อสังเกต ไม่ใช่ Expected)
      const onlineAt = Date.now();
      await page.waitForTimeout(30_000);
      note('หลังต่อเครือข่ายกลับ 30 วินาที', (await noticesSince(onlineAt)).map((n) => `${((n.at - onlineAt) / 1000).toFixed(1)} วิ ${n.text}`).join(' | ') || '(ไม่มีแจ้งเตือน)');
      await snapEvidence(page, 'หลังต่อเน็ตกลับ 30 วินาที');

      const log = await notices();
      await test.info().attach('แจ้งเตือนทั้งหมดที่ขึ้นระหว่างเทส', { body: JSON.stringify(log.map((n) => ({ at: clock(n.at), text: n.text })), null, 2), contentType: 'application/json' });
      console.log(`    แจ้งเตือนทั้งหมด: ${log.map((n) => `${clock(n.at)} ${n.text}`).join(' | ')}`);
      expect(failures, 'ขั้นที่ไม่ผ่าน').toEqual([]);
    },
  );
});
