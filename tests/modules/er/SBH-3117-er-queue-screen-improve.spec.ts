import type { Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, fetchBoard, gotoErDashboard, trackOpenedErVisits, waitForApi, type ErBoardEncounter, type ErVisit } from '../../../helpers/functions/er';
import { erListCell, erListRow, erListTab, filterErListByHn, hnSearchBox, openErPatientListFromMenu } from '../../../helpers/functions/er-list';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import {
  fetchTvBoard,
  openTvWindow,
  readTvPage,
  tvActiveArea,
  tvActiveNumber,
  tvHeader,
  tvHistory,
  tvHistoryCards,
  tvLatestTag,
  tvPageLabel,
  tvSegments,
  type TvBoard,
} from '../../../helpers/functions/er-tv-queue';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';

// SBH-3117 [ER][QUEUE] ปรับปรุงหน้าจอ QUEUE — AC 1 Banner ข้อความแจ้งผู้ป่วยบนจอ ER TV (ตั้งค่า เปิด / ปิด + แก้ข้อความ · Default ตามการ์ด)
//   AC 2 "เรียกแล้ว" หน้าละ 4 รายการ · AC 3 คอลัมน์ "คิว" ในรายการผู้ป่วย ER: เลขคิว + ปุ่ม เรียกคิว / จบคิว (ไม่มี พักไว้)
// ชุด EXE SBH-3457 → HPY SBH-3458 (TC-001…010) · EDG SBH-3460 (TC-011) → 2 เทส 2 flow (R9)
// หน้าจอจริง (dev-x 31 ต.ค. 2026 · ไฟล์แอป index-DJaj9lPY.js · จอ TV chunk index-C-KdrOcF.js · หน้าตั้งค่า chunk index-BgUeugtD.js):
//   เมนู ห้องฉุกเฉิน > ตั้งค่า > "ตั้งค่าข้อความจอคิว ER" (/cortex/setting/admin/er-tv-queue) — Switch "เปิดแสดงข้อความ" · textarea "ข้อความสำหรับผู้ป่วย" (ต้องมี 1–200 ตัวอักษร)
//     · ปุ่ม "บันทึก" (disabled จนกว่าจะแก้) → PATCH /cortex-api/er/tv-queue/settings {enabled, text} → toast "บันทึกการตั้งค่าแล้ว"
//     · หน้าไม่ได้ยิง GET /er/tv-queue/settings ตอนเปิด (สำรวจ 3 รอบ) → ช่องข้อความว่างทั้งที่ API คืนข้อความ Default
//   จอ TV: Banner = Tag ใน <header> ([class*=_resuscitation_]) แสดงเมื่อ API สาธารณะส่ง banner.show (ไม่มี field banner = ใช้ isResuscitationActive แบบเดิม)
//     · "เรียกแล้ว" หน้าละ 4 ตายตัว · หัว "n คิว" · ป้าย "หน้า X / N" มีเมื่อเกิน 1 หน้า · เปลี่ยนหน้าทุก 15 วินาที
//   คอลัมน์ "คิว": ปุ่ม "เรียกคิว <เลข>" (ไอคอนลำโพง + เลข) + ปุ่มไอคอน "จบคิว <เลข>" → POST /er/encounters/<EN>/queue-call | queue-complete
// ข้อมูล (ผู้ใช้ตอบ 31 ต.ค. 2026): ผู้ป่วย AUTO ใหม่ 6 ราย เปิด Visit ER (ไม่คัดกรอง — เลขคิวได้ตั้งแต่เปิด Visit) → ปิด Visit ที่การเงินท้ายเทส
//   ค่าตั้งค่าข้อความจอคิว: คืน "เปิด + ข้อความ Default" ท้ายเทส 1 (31 ต.ค. = ค่าที่เจอ · Retest 3 พ.ย. ผู้ใช้เลือก "คืนเป็น Default" แม้เจอข้อความอื่น)
// Retest 3 พ.ย. 2026 (ตัวแก้ SBH-3606 · ไฟล์แอป index-DyRN9hyS.js · จอ TV chunk index-DKyHEsfV.js): หน้าตั้งค่าอ่านค่าที่บันทึกมาใส่ฟอร์ม · API จอ ?v=2 ส่ง banner
//   TC-002: ถ้าข้อความที่บันทึกไม่ใช่ Default → บันทึกข้อความ Default ก่อน แล้วโหลดหน้าใหม่ค่อยดูช่อง (ผู้ใช้เลือก 3 พ.ย.)
// ลำดับเทส 2: TC-007 / 008 → TC-009 (เรียกรายที่ 1) → เรียกต่อจน "เรียกแล้ว" = 4 คิว → TC-011 → อีก 1 ราย = 5 คิว → TC-006 → TC-010 (จบคิวรายที่ 1)
// หน้าต่าง: เจ้าหน้าที่ (Super_User — R6) + จอ TV แยก (ไม่มี session) · คลิป clip-TC-00x-staff.webm (เจ้าหน้าที่) + clip-TC-00x.webm (จอ TV)
// รัน (dev-x): npx playwright test --headed --grep @SBH-3117   · เทส 1: --grep @SBH-3462 · เทส 2: --grep @SBH-3471
// SBH3117_VISITS=<HN>,<VN>,<EN>;… (6 ราย) = ใช้ผู้ป่วยเดิม · SBH3117_KEEP=1 = ไม่ปิด Visit ท้ายเทส
// SBH Prod (ผู้ใช้อนุญาต 6 พ.ย. 2026 — decisions R134): npm run card:prod -- --headed --grep "@SBH-3462( |$)" (เทส 1) · "@SBH-3471( |$)" (เทส 2 + SBH3117_KEEP=1)
//   → ปิด Visit: SBH3117_VISITS=… npm run card:prod -- --headed --grep "@SBH-3117-CLOSE"
//   Prod มีคิวผู้ป่วยจริงเรียกอยู่ระหว่างเทส: "เรียกแล้ว" ไม่ใช่ 4 / 5 คิวพอดี หรือ API เปลี่ยนระหว่างดู = TC-011 / 006 "ตรวจไม่ได้" (ไม่จบคิวของผู้ป่วยจริง)
//   ท้ายเทส 2 จบคิวผู้ป่วย AUTO ที่เทสเรียกทุกราย — ไม่ให้คิวทดสอบค้างบนจอ TV จริง

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ISSUE = { 1: 'SBH-3462', 2: 'SBH-3463', 3: 'SBH-3465', 4: 'SBH-3466', 5: 'SBH-3467', 6: 'SBH-3469', 7: 'SBH-3471', 8: 'SBH-3473', 9: 'SBH-3475', 10: 'SBH-3477', 11: 'SBH-3478' } as const;
type TcNo = keyof typeof ISSUE;
const TC = (n: TcNo) => `TC-${String(n).padStart(3, '0')} (${ISSUE[n]})`;
const CLIP = (n: TcNo) => `TC-${String(n).padStart(3, '0')}`;

const DEFAULT_TEXT = 'ขณะนี้มีผู้ป่วยฉุกเฉินจำนวนมาก การรักษาอาจล่าช้ากว่าปกติ ขออภัยในความไม่สะดวก';
const CUSTOM_TEXT = 'ทดสอบ SBH3117 แจ้งผู้ป่วย';
const OLD_TAG = 'กำลังกู้ชีพ · การรักษาอาจล่าช้า';
const SETTINGS_API = '/cortex-api/er/tv-queue/settings';
/** ชื่อเมนู: 31 ต.ค. "ตั้งค่าข้อความจอคิว ER" · 3 พ.ย. "ประกาศหน้าจอผู้ป่วย" */
const SETTINGS_MENU = /^(ตั้งค่าข้อความจอคิว ER|ประกาศหน้าจอผู้ป่วย)$/;

type TvBoardWithBanner = TvBoard & { banner?: { show: boolean; text: string } };

// ---------- ตัวช่วยหน้าตั้งค่า ----------
const settingsMain = (page: Page) => page.getByRole('main');
const settingsTitle = (page: Page) => settingsMain(page).getByText('ตั้งค่าข้อความจอคิว ER', { exact: true }).first();
const bannerSwitch = (page: Page) => settingsMain(page).getByRole('switch');
const bannerText = (page: Page) => settingsMain(page).locator('textarea');
const saveButton = (page: Page) => settingsMain(page).getByRole('button', { name: 'บันทึก' });
const switchItem = (page: Page) => settingsMain(page).locator('.ant-form-item').filter({ hasText: 'เปิดแสดงข้อความ' });
const textItem = (page: Page) => settingsMain(page).locator('.ant-form-item').filter({ hasText: 'ข้อความสำหรับผู้ป่วย' });
const isOn = async (page: Page) => (await bannerSwitch(page).getAttribute('aria-checked')) === 'true';

/** ค่าที่บันทึกไว้จริง (GET ด้วย token ของแอป — อ่านอย่างเดียว) */
async function readSavedSettings(page: Page, authorization: () => string): Promise<{ enabled: boolean; text: string }> {
  const res = await page.request.get(SETTINGS_API, { headers: { authorization: authorization() } });
  await expectOk(res, 'อ่านค่าตั้งค่าข้อความจอคิว ER');
  return res.json();
}

/** Banner บนแถบหัวจอ TV (ไม่มี = null) */
const tvBanner = (tv: Page) => tvHeader(tv).locator('[class*="_resuscitation_"]');
const bannerOnTv = async (tv: Page) => ((await tvBanner(tv).count()) ? ((await tvBanner(tv).first().innerText()) || '').trim() : null);

/** Prod มีคิวจริงแทรก → จดว่า TC ตรวจไม่ได้ (ไม่ใช่ไม่ผ่าน) */
function untestable(tc: string, reason: string) {
  test.info().annotations.push({ type: 'ตรวจไม่ได้', description: `${tc}: ${reason}` });
  console.log(`    ⚠ ตรวจไม่ได้ — ${tc}: ${reason}`);
}
const sameQueues = (a: { queueNumber: string }[], b: { queueNumber: string }[]) => a.map((c) => c.queueNumber).join(',') === b.map((c) => c.queueNumber).join(',');

test.describe('SBH-3117 ปรับปรุงหน้าจอ QUEUE ของ ER (dev-x / SBH Prod)', () => {
  test.describe.configure({ timeout: 1_800_000 });

  let opened: Map<string, ErVisit>;
  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });
  test.afterEach(async ({ page }) => {
    await hideCompareTable(page).catch(() => undefined);
    if (process.env.SBH3117_KEEP) return;
    // ปิด Visit ของผู้ป่วยที่เทสเปิดเอง หลังเก็บหลักฐาน — ทั้งตอนผ่านและพังกลางทาง (ผู้ใช้ตอบ 31 ต.ค. 2026)
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  // =====================================================================================
  // เทส 1: ตั้งค่าข้อความจอคิว ER + Banner บนจอ TV (TC-001…005)
  // =====================================================================================
  test(
    'TC-001…005: ตั้งค่าข้อความจอคิว ER (Switch + ข้อความ) และ Banner บนจอ ER TV เปิด / ปิด / ข้อความที่แก้เอง (Super_User)',
    { tag: ['@SBH-3117', '@SBH-3462', '@SBH-3463', '@SBH-3465', '@SBH-3466', '@SBH-3467'], annotation: [linear('SBH-3117'), ...([1, 2, 3, 4, 5] as const).map((n) => linear(ISSUE[n]))] },
    async ({ page, browser }) => {
      const authorization = trackAuthorization(page);
      const staff = makeRunner(page);
      const { note, soft } = staff;
      const before = { enabled: true, text: DEFAULT_TEXT };

      await gotoErDashboard(page);
      Object.assign(before, await readSavedSettings(page, authorization));
      note('ค่าตั้งค่าก่อนเทส (API)', `enabled ${before.enabled} · text "${before.text}"`);

      /** แก้ค่าในฟอร์มแล้วกดบันทึก (ถ้ามีอะไรเปลี่ยน) → PATCH สำเร็จ + toast · คืน false ถ้าไม่มีอะไรให้บันทึก */
      const applySettings = async (want: { enabled?: boolean; text?: string }, evidenceName?: string) => {
        if (want.text !== undefined && (await bannerText(page).inputValue()) !== want.text) await bannerText(page).fill(want.text);
        if (want.enabled !== undefined && (await isOn(page)) !== want.enabled) await bannerSwitch(page).click();
        if (want.enabled !== undefined) await expect(bannerSwitch(page)).toHaveAttribute('aria-checked', String(want.enabled));
        if (await saveButton(page).isDisabled()) return false;
        // toast ของการบันทึกครั้งก่อนยังค้าง → ภาพ "ก่อนกด" ดูเหมือนบันทึกแล้ว (Sub Agent ทัก 31 ต.ค.) → รอให้หายก่อน
        await page.getByText('บันทึกการตั้งค่าแล้ว', { exact: true }).first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
        if (evidenceName) {
          const marks = [clicked(saveButton(page))];
          if (want.text !== undefined) marks.unshift(filled(bannerText(page), want.text === DEFAULT_TEXT ? 'ข้อความ Default' : `"${want.text}"`));
          if (want.enabled !== undefined) marks.unshift(filled(bannerSwitch(page), want.enabled ? 'เปิด' : 'ปิด'));
          await markEvidence(...marks);
          await snapEvidence(page, `ก่อนกด — ${evidenceName}`);
        }
        const saved = waitForApi(page, 'PATCH', SETTINGS_API, 30_000);
        await saveButton(page).click();
        const res = await saved;
        await expectOk(res, 'บันทึกค่าตั้งค่าข้อความจอคิว ER');
        const toast = page.getByText('บันทึกการตั้งค่าแล้ว', { exact: true }).first();
        await toast.waitFor({ state: 'visible', timeout: 30_000 });
        if (evidenceName) {
          await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          await markEvidence(alerted(toast), expected(bannerSwitch(page), (await isOn(page)) ? 'เปิด' : 'ปิด'));
          await snapEvidence(page, `หลังกด — ${evidenceName}`);
        }
        note('บันทึกค่าตั้งค่า', `PATCH ${SETTINGS_API} ${res.status()} → ${JSON.stringify(await res.json().catch(() => null))}`);
        await expect(saveButton(page)).toBeDisabled();
        return true;
      };

      /** จอ TV: รอ Banner เป็นค่าที่ต้องการ (null = ไม่มี Banner) — จอดึงข้อมูลทุก 3 วินาที */
      const waitBanner = async (tv: Page, want: string | null) => {
        await expect.poll(() => bannerOnTv(tv), { message: want ? `จอ TV ต้องแสดง Banner "${want}"` : 'จอ TV ต้องไม่แสดง Banner', timeout: 30_000, intervals: [1_000] }).toBe(want);
      };
      const tvApiNote = async (tv: Page, label: string) => {
        const snap = (await fetchTvBoard(tv).catch(() => null)) as TvBoardWithBanner | null;
        const text = snap ? `banner ${snap.banner ? JSON.stringify(snap.banner) : '(ไม่มี field banner)'} · isResuscitationActive ${snap.isResuscitationActive} · isPatientAnnouncementActive ${snap.isPatientAnnouncementActive}` : 'อ่าน API ไม่ได้';
        note(`API จอ TV ${label}`, text);
        return text;
      };

      // ---------- TC-001 เมนู + หน้าตั้งค่า ----------
      await startClip(page, CLIP(1));
      let menuName = '';
      await checkStep(page, `${TC(1)} ขั้น 2 เมนู ห้องฉุกเฉิน > ตั้งค่า`, async () => {
        // "ตั้งค่า" ตรงกับเมนูย่อยที่ขึ้นต้นเหมือนกันด้วย → จับชื่อเต็ม (ไอคอนนำหน้าได้) ไม่ใช้ openErMenu
        const expand = page.getByRole('button', { name: 'ขยายแถบนำทาง' });
        if (await expand.isVisible()) await expand.click();
        const er = page.getByRole('menuitem', { name: /^(\S+ )?ห้องฉุกเฉิน$/ });
        const item = page.getByRole('menuitem', { name: /^(\S+ )?ตั้งค่า$/ }).first();
        if (!(await item.isVisible())) await er.click();
        await expect(item).toBeVisible();
        // dev-x 3 พ.ย. (index-DyRN9hyS.js) ชื่อเมนูเปลี่ยนเป็น "ประกาศหน้าจอผู้ป่วย" (หัวหน้ายังเป็น "ตั้งค่าข้อความจอคิว ER")
        const settingsItem = page.getByRole('menuitem', { name: SETTINGS_MENU });
        if (!(await settingsItem.isVisible())) await item.click();
        await expect(settingsItem, 'ใต้ ห้องฉุกเฉิน > ตั้งค่า ต้องมีเมนูตั้งค่าข้อความของจอคิว').toBeVisible();
        menuName = (await settingsItem.innerText()).trim();
        // แถบเมนูแคบ + บอร์ดด้านหลังมีข้อความเต็ม → ป้ายยาวหาที่ว่างไม่ได้ ไปทับชื่อเมนู (รอบแรก 31 ต.ค.) → ป้ายสั้นไม่มีคำต่อท้าย
        await markEvidence(clicked(item), expected(settingsItem));
      });
      await checkStep(page, `${TC(1)} ขั้น 3 เปิดหน้าตั้งค่าข้อความ — มี Slider Switch และช่องข้อความ`, async () => {
        await page.getByRole('menuitem', { name: SETTINGS_MENU }).click();
        await expect(page).toHaveURL(/\/setting\/admin\/er-tv-queue/);
        await expect(settingsTitle(page)).toBeVisible({ timeout: 60_000 });
        await expect(bannerSwitch(page)).toBeVisible();
        await expect(bannerText(page)).toBeVisible();
        const rows: CompareRow[] = [
          { label: 'เมนู', values: ['ตั้งค่าข้อความแสดงผลสำหรับผู้ป่วย', `${menuName} (ชื่อต่างจาก TC)`], same: true },
          { label: 'Slider Switch', values: ['เปิด / ปิด', `มี (${(await isOn(page)) ? 'เปิด' : 'ปิด'}) · ป้าย "เปิดแสดงข้อความ"`], same: (await bannerSwitch(page).count()) === 1 },
          { label: 'Free Text Box', values: ['มีช่องข้อความ', `มี textarea · ป้าย "ข้อความสำหรับผู้ป่วย"`], same: (await bannerText(page).count()) === 1 },
        ];
        await showCompareTable(page, `${ISSUE[1]} หน้าตั้งค่า`, ['Expected', 'หน้าจอ'], rows, { side: 'right' });
        await markEvidence(expected(settingsTitle(page), 'หน้าตั้งค่าข้อความจอคิว ER'), expected(switchItem(page), 'Slider Switch'), expected(textItem(page), 'Free Text Box'));
        await snapEvidence(page, 'ผล — หน้าตั้งค่า');
        await hideCompareTable(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });

      // ---------- TC-002 ข้อความ Default ----------
      await startClip(page, CLIP(2));
      let shownText = '';
      const textBeforeTest = before.text;
      if (before.text !== DEFAULT_TEXT) {
        // Retest 3 พ.ย.: ก่อนเทสข้อความถูกแก้เป็นค่าอื่น → บันทึก Default ก่อน แล้วโหลดหน้าใหม่ (ผู้ใช้เลือก)
        await checkStep(page, `${TC(2)} เตรียม: บันทึกข้อความ Default (ก่อนเทสเป็น "${before.text}")`, async () => {
          await expect(bannerText(page)).toHaveValue(before.text, { timeout: 15_000 });
          await applySettings({ text: DEFAULT_TEXT, enabled: before.enabled }, 'บันทึกข้อความ Default');
          await markEvidence(expected(bannerText(page), 'ข้อความ Default'));
        });
        await page.reload();
        await expect(settingsTitle(page)).toBeVisible({ timeout: 60_000 });
        await expect(bannerText(page)).toBeVisible();
      }
      const savedForTc2 = await readSavedSettings(page, authorization);
      await soft(`${TC(2)} ขั้น 3 ช่องข้อความแสดงข้อความ Default`, async () => {
        // ให้ฟอร์มเติมค่าที่โหลดมา — รอได้ถึง 10 วินาที
        await expect.poll(() => bannerText(page).inputValue(), { timeout: 10_000, intervals: [500] }).toBe(DEFAULT_TEXT).catch(() => undefined);
        shownText = await bannerText(page).inputValue();
        const rows: CompareRow[] = [
          { label: 'ข้อความในช่อง', values: [DEFAULT_TEXT, shownText || '(ว่าง)'], same: shownText === DEFAULT_TEXT },
          { label: 'ค่าที่บันทึกไว้ (API)', values: ['-', `"${savedForTc2.text}" · enabled ${savedForTc2.enabled}`], same: true },
          ...(textBeforeTest !== DEFAULT_TEXT ? [{ label: 'ก่อนเทส', values: ['-', `"${textBeforeTest}" → บันทึก Default แล้วโหลดหน้าใหม่`], same: true }] : []),
        ];
        await showCompareTable(page, `${ISSUE[2]} ข้อความ Default`, ['Expected', 'หน้าจอ'], rows, { side: 'right' });
        // ป้ายต้องบอก Expected + ผลจริง ไม่ใช่เขียนผลจริงต่อท้าย "Expected:" (Sub Agent ทัก 31 ต.ค. — อ่านกลับความหมาย)
        await markEvidence(expected(bannerText(page), shownText === DEFAULT_TEXT ? 'ข้อความ Default' : `ข้อความ Default · จริง: ${shownText ? 'ข้อความอื่น' : 'ช่องว่าง'}`));
        await snapEvidence(page, 'ผล — ข้อความในช่อง');
        await holdForClip(page, 2_000);
        await hideCompareTable(page);
        expect(shownText, 'Expected: ช่องข้อความแสดงข้อความ Default').toBe(DEFAULT_TEXT);
      });
      note(`${TC(2)} ข้อความในช่องตอนเปิดหน้า`, shownText || '(ว่าง)');
      await startClip(page, 'idle-open-tv'); // ช่วงเปิดหน้าต่างจอ TV ไม่ใช่ของ TC-002

      // ---------- จอ TV ----------
      const tv = await openTvWindow(browser);
      const screen = makeRunner(tv);
      try {
        // ---------- TC-003 Switch ปิด → เปิด ----------
        await startClip(page, `${CLIP(3)}-staff`);
        await checkStep(page, `${TC(3)} ขั้น 1 เตรียม: ข้อความ Default + Switch ปิด แล้วบันทึก (ตั้งต้นของ State ปิด → เปิด)`, async () => {
          // ช่องข้อความว่าง (TC-002) และต้องมีข้อความถึงบันทึกได้ → ใส่ข้อความ Default เอง
          await applySettings({ text: DEFAULT_TEXT, enabled: false }, 'เตรียม Switch ปิด');
          await markEvidence(expected(bannerSwitch(page), 'ปิด'), expected(bannerText(page), 'ข้อความ Default'));
        });
        await startClip(tv, CLIP(3));
        await screen.soft(`${TC(3)} ก่อนเปิด Switch — จอ TV ไม่มี Banner`, async () => {
          await tv.bringToFront();
          await waitBanner(tv, null);
          await tvApiNote(tv, 'ตอน Switch ปิด');
          await markEvidence(expected(tvHeader(tv), 'ไม่มี Banner (Switch ปิด)'));
        });
        await page.bringToFront();
        await checkStep(page, `${TC(3)} ขั้น 2 กด Slider Switch เป็น เปิด แล้วบันทึก`, async () => {
          await applySettings({ enabled: true }, 'Switch เปิด');
          await markEvidence(expected(bannerSwitch(page), 'เปิด'), expected(bannerText(page), 'ข้อความ Default'));
        });
        await startClip(page, 'idle-3'); // หน้าต่างเจ้าหน้าที่นิ่งระหว่างดูจอ TV — ไม่ให้ต่อท้ายคลิป TC-003-staff
        let bannerSeen = false;
        await screen.soft(`${TC(3)} ขั้น 3 จอ TV แสดง Banner ข้อความ Default · ไม่แสดงข้อความเดิม`, async () => {
          await tv.bringToFront();
          // จอดึงข้อมูลทุก 3 วินาที → 15 วินาทีพอ (30 วินาทีทำให้คลิปนิ่งยาว)
          const shown = await expect
            .poll(() => bannerOnTv(tv), { timeout: 15_000, intervals: [1_000] })
            .toBe(DEFAULT_TEXT)
            .then(
              () => DEFAULT_TEXT,
              async () => bannerOnTv(tv),
            );
          const api = await tvApiNote(tv, 'หลัง Switch เปิด');
          const oldTag = await tv.getByText(OLD_TAG, { exact: true }).count();
          const rows: CompareRow[] = [
            { label: 'Banner', values: [DEFAULT_TEXT, shown ?? '(ไม่มี Banner)'], same: shown === DEFAULT_TEXT },
            { label: 'ข้อความเดิม', values: ['ไม่แสดง', oldTag ? `แสดง "${OLD_TAG}"` : 'ไม่แสดง'], same: oldTag === 0 },
            { label: 'API จอ TV', values: ['-', api], same: true },
          ];
          await showCompareTable(tv, `${ISSUE[3]} Banner หลังเปิด Switch`, ['Expected', 'จอ TV'], rows, { side: 'bottom' });
          bannerSeen = shown === DEFAULT_TEXT;
          await markEvidence(expected(shown ? tvBanner(tv).first() : tvHeader(tv), shown ? 'Banner ข้อความ Default' : 'Banner ข้อความ Default · จริง: ไม่มี Banner'));
          await snapEvidence(tv, 'ผล — Banner หลังเปิด');
          await holdForClip(tv, 3_000);
          await hideCompareTable(tv);
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: Banner ข้อความ Default และไม่มีข้อความเดิม').toEqual([]);
        });

        // ---------- TC-004 Switch เปิด → ปิด ----------
        await startClip(page, `${CLIP(4)}-staff`);
        await page.bringToFront();
        await checkStep(page, `${TC(4)} ขั้น 2 กด Slider Switch เป็น ปิด แล้วบันทึก`, async () => {
          await applySettings({ enabled: false }, 'Switch ปิด');
          await markEvidence(expected(bannerSwitch(page), 'ปิด'));
        });
        await startClip(page, 'idle-4');
        await startClip(tv, CLIP(4));
        await screen.soft(`${TC(4)} ขั้น 3 จอ TV ไม่แสดง Banner`, async () => {
          await tv.bringToFront();
          await waitBanner(tv, null).catch(() => undefined);
          const shown = await bannerOnTv(tv);
          const api = await tvApiNote(tv, 'หลัง Switch ปิด');
          // TC-004 ต่อจาก TC-003 (Switch เปิด · จอ TV แสดง Banner) — Banner ไม่เคยขึ้น = ยังพิสูจน์การปิดไม่ได้ → ผู้ใช้ตอบ 31 ต.ค. "ลง Fail"
          const rows: CompareRow[] = [
            { label: 'ก่อนปิด (TC-003)', values: ['จอ TV แสดง Banner', bannerSeen ? 'แสดง Banner' : 'ไม่เคยแสดง Banner'], same: bannerSeen },
            { label: 'หลังปิด Banner', values: ['ไม่แสดง', shown ?? 'ไม่แสดง'], same: shown === null },
            { label: 'API จอ TV', values: ['-', api], same: true },
          ];
          await showCompareTable(tv, `${ISSUE[4]} Banner หลังปิด Switch`, ['Expected', 'จอ TV'], rows, { side: 'bottom' });
          await markEvidence(expected(tvHeader(tv), shown ? `ไม่มี Banner · จริง: ยังแสดง` : 'ไม่มี Banner'));
          await snapEvidence(tv, 'ผล — ไม่มี Banner');
          await holdForClip(tv, 3_000);
          await hideCompareTable(tv);
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: ต่อจาก Banner ที่แสดงอยู่ ปิด Switch แล้วจอ TV ไม่แสดง Banner').toEqual([]);
        });

        // ---------- TC-005 ข้อความที่แก้เอง ----------
        await startClip(page, `${CLIP(5)}-staff`);
        await page.bringToFront();
        await checkStep(page, `${TC(5)} ขั้น 2–3 แก้ข้อความเป็น "${CUSTOM_TEXT}" + Switch เปิด แล้วบันทึก`, async () => {
          await applySettings({ text: CUSTOM_TEXT, enabled: true }, 'ข้อความที่แก้เอง');
          await expect(bannerText(page)).toHaveValue(CUSTOM_TEXT);
          await markEvidence(expected(bannerText(page), `"${CUSTOM_TEXT}"`), expected(bannerSwitch(page), 'เปิด'));
        });
        const saved5 = await readSavedSettings(page, authorization);
        note(`${TC(5)} ค่าที่บันทึก (API)`, JSON.stringify(saved5));
        await startClip(page, 'idle-5');
        await startClip(tv, CLIP(5));
        await screen.soft(`${TC(5)} ขั้น 4 จอ TV แสดง Banner ข้อความที่แก้ตรงทุกตัวอักษร · ไม่แสดงข้อความ Default`, async () => {
          await tv.bringToFront();
          await expect.poll(() => bannerOnTv(tv), { timeout: 15_000, intervals: [1_000] }).toBe(CUSTOM_TEXT).catch(() => undefined);
          const shown = await bannerOnTv(tv);
          const api = await tvApiNote(tv, 'หลังแก้ข้อความ');
          const defaultShown = await tv.getByText(DEFAULT_TEXT, { exact: true }).count();
          const rows: CompareRow[] = [
            { label: 'Banner', values: [CUSTOM_TEXT, shown ?? '(ไม่มี Banner)'], same: shown === CUSTOM_TEXT },
            { label: 'ข้อความ Default', values: ['ไม่แสดง', defaultShown ? 'แสดง' : 'ไม่แสดง'], same: defaultShown === 0 },
            { label: 'ค่าที่บันทึก (API)', values: ['-', `enabled ${saved5.enabled} · "${saved5.text}"`], same: true },
            { label: 'API จอ TV', values: ['-', api], same: true },
          ];
          await showCompareTable(tv, `${ISSUE[5]} Banner ข้อความที่แก้`, ['Expected', 'จอ TV'], rows, { side: 'bottom' });
          await markEvidence(expected(shown ? tvBanner(tv).first() : tvHeader(tv), shown === CUSTOM_TEXT ? `Banner "${CUSTOM_TEXT}"` : `Banner "${CUSTOM_TEXT}" · จริง: ${shown ? 'ข้อความอื่น' : 'ไม่มี Banner'}`));
          await snapEvidence(tv, 'ผล — Banner ข้อความที่แก้');
          await holdForClip(tv, 3_000);
          await hideCompareTable(tv);
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: Banner แสดงข้อความที่แก้ตรงทุกตัวอักษร').toEqual([]);
        });
        await startClip(page, 'after-test');
        await startClip(tv, 'after-test');
      } finally {
        // คืนค่า เปิด + ข้อความ Default (31 ต.ค. = ค่าที่เจอ · Retest 3 พ.ย. ผู้ใช้เลือก "คืนเป็น Default")
        await hideCompareTable(tv).catch(() => undefined);
        await page.bringToFront();
        const restored = await (async () => {
          if (!/er-tv-queue/.test(page.url())) {
            await page.goto('/cortex/setting/admin/er-tv-queue');
            await expect(bannerText(page)).toBeVisible({ timeout: 60_000 });
          }
          await applySettings({ text: DEFAULT_TEXT, enabled: true });
          return JSON.stringify(await readSavedSettings(page, authorization));
        })().catch((error: Error) => `คืนค่าไม่สำเร็จ — ${error.message.split('\n')[0]}`);
        note('หลังเทส: คืนค่าตั้งค่าข้อความจอคิว ER', restored);
        await finishVideo(tv);
        await tv.context().close();
      }
      screen.finish();
      staff.finish();
    },
  );

  // =====================================================================================
  // เทส 2: คอลัมน์คิว + เรียกคิว / จบคิว + "เรียกแล้ว" หน้าละ 4 (TC-007 · 008 · 009 · 011 · 006 · 010)
  // =====================================================================================
  test(
    'TC-006…011: ผู้ป่วย AUTO 6 ราย — คอลัมน์คิว (เลขคิว + เรียกคิว / จบคิว) · เรียกคิวขึ้นจอ TV · "เรียกแล้ว" 4 / 5 คิว · จบคิวแล้วหายจาก "เรียกแล้ว" (Super_User)',
    { tag: ['@SBH-3117', '@SBH-3469', '@SBH-3471', '@SBH-3473', '@SBH-3475', '@SBH-3477', '@SBH-3478'], annotation: [linear('SBH-3117'), ...([6, 7, 8, 9, 10, 11] as const).map((n) => linear(ISSUE[n]))] },
    async ({ page, browser }) => {
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
      const staff = makeRunner(page);
      const { note, soft } = staff;
      type Patient = { key: string; visit?: ErVisit; queue?: string; fullName?: string };
      const patients: Patient[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((key) => ({ key }));
      const reuse = (process.env.SBH3117_VISITS ?? '').split(';').filter(Boolean).map((v) => v.split(','));

      // ---------- เตรียมข้อมูล: ผู้ป่วย AUTO 6 ราย เปิด Visit ER (ได้เลขคิว) ----------
      await gotoErDashboard(page);
      for (const [i, p] of patients.entries()) {
        if (reuse[i]?.length === 3) {
          p.visit = { hn: reuse[i][0], vn: reuse[i][1], en: reuse[i][2] };
          continue;
        }
        await checkStep(page, `เตรียมข้อมูล ผู้ป่วย ${p.key}: เปิด Visit ER`, async () => {
          if (!page.url().includes('/er/')) await gotoErDashboard(page);
          p.visit = await registerAndOpenErVisit(page, newTestPatient(`Q3117${p.key}`));
          await expect(main.getByRole('heading', { name: 'คัดกรอง ER', exact: true }), 'หลังเปิด Visit ต้องอยู่หน้าคัดกรอง ER').toBeVisible({ timeout: 60_000 });
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
        });
      }
      const board = (await fetchBoard(page, authorization)) as (ErBoardEncounter & { queueExam?: { qDisplay?: string } | null })[];
      for (const p of patients) {
        const enc = board.find((e) => e.en === p.visit!.en);
        if (!enc) throw new Error(`ไม่เจอผู้ป่วย ${p.key} (${p.visit!.en}) บนบอร์ด ER`);
        p.fullName = [enc.patient?.firstName, enc.patient?.familyName].filter(Boolean).join(' ');
        p.queue = enc.queueExam?.qDisplay;
        if (!p.queue) throw new Error(`ผู้ป่วย ${p.key} (${p.visit!.en}) ยังไม่มีเลขคิว (queueExam ว่าง)`);
        note(`ผู้ป่วย ${p.key}`, `${p.fullName} · HN ${p.visit!.hn} · ${p.visit!.vn} · ${p.visit!.en} · คิว ${p.queue}`);
      }
      note('ใช้ผู้ป่วยเดิมรอบถัดไป', `SBH3117_VISITS=${patients.map((p) => `${p.visit!.hn},${p.visit!.vn},${p.visit!.en}`).join(';')} SBH3117_KEEP=1`);
      const [A] = patients;

      const rowOf = async (p: Patient) => {
        if (!/view=list/.test(page.url()) && !(await erListTab(page, 'current').isVisible().catch(() => false))) await openErPatientListFromMenu(page);
        await expect(erListTab(page, 'current'), 'แท็บ "ผู้ป่วยปัจจุบันใน ER" ต้องถูกเลือก').toHaveAttribute('aria-selected', 'true');
        await filterErListByHn(page, p.visit!.hn);
        const row = erListRow(page, p.visit!.en);
        await expect(row, `ต้องเห็นแถวของผู้ป่วย ${p.key} ในแท็บผู้ป่วยปัจจุบันใน ER`).toBeVisible({ timeout: 60_000 });
        return row;
      };
      const queueCell = async (row: Locator) => erListCell(page, row, 'คิว');
      const callButton = (cell: Locator, p: Patient) => cell.getByRole('button', { name: `เรียกคิว ${p.queue}`, exact: true });
      const completeButton = (cell: Locator, p: Patient) => cell.getByRole('button', { name: `จบคิว ${p.queue}`, exact: true });

      /** ผู้ป่วยที่เทสกดเรียกคิว (ท้ายเทสจบคิวให้ทุกราย) */
      const calledByTest = new Set<Patient>();
      /** กดเรียกคิวที่แถวผู้ป่วย → POST queue-call สำเร็จ + toast "ส่งคิว … ไปยังจอ ER แล้ว" */
      const callQueue = async (title: string, p: Patient, full: boolean) => {
        await checkStep(page, title, async () => {
          await page.bringToFront();
          const cell = await queueCell(await rowOf(p));
          const button = callButton(cell, p);
          await expect(button, `แถวผู้ป่วย ${p.key} ต้องมีปุ่มเรียกคิว`).toBeVisible();
          if (full) {
            await markEvidence(clicked(button, `เรียกคิว ${p.queue}`));
            await snapEvidence(page, `ก่อนกด — เรียกคิว ${p.key}`);
          }
          const called = waitForApi(page, 'POST', /\/cortex-api\/er\/encounters\/[^/]+\/queue-call$/, 30_000);
          await button.click();
          const res = await called;
          await expectOk(res, `เรียกคิว ${p.queue}`);
          calledByTest.add(p);
          expect(new URL(res.url()).pathname).toContain(`/er/encounters/${p.visit!.en}/queue-call`);
          const toast = page.getByText(`ส่งคิว ${p.queue} ไปยังจอ ER แล้ว`, { exact: true }).first();
          await toast.waitFor({ state: 'visible', timeout: 30_000 });
          await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          await markEvidence(alerted(toast));
          if (full) await holdForClip(page, 2_000); // กรอบ toast อยู่บนคลิปแค่ 0.8 วิ (Sub Agent ทัก 31 ต.ค.)
        });
      };

      /** จอ TV: รอคิวที่กำลังเรียก = queue · คืน snapshot API */
      const waitActive = async (tv: Page, queue: string) => {
        await expect.poll(async () => (await tvActiveNumber(tv).textContent().catch(() => null))?.trim(), { message: `จอ TV ต้องขึ้นคิว ${queue} เป็นคิวที่กำลังเรียก`, timeout: 30_000 }).toBe(queue);
        return fetchTvBoard(tv);
      };
      const historyCount = (tv: Page) => tvHistory(tv).locator('[class*="_stubHeading_"] span').first();
      const readHistory = async (tv: Page) => ({
        countLabel: ((await historyCount(tv).textContent().catch(() => '')) ?? '').trim(),
        cards: (await tvHistoryCards(tv).locator('strong').allTextContents()).map((t) => t.trim()),
        ...(await readTvPage(tvHistory(tv))),
        segments: await tvSegments(tvHistory(tv)).count(),
      });
      /** รอให้ "เรียกแล้ว" บนจอมีจำนวนตาม API (จอดึงทุก 3 วินาที) */
      const waitHistoryCount = async (tv: Page, n: number) => {
        await expect.poll(async () => (await readHistory(tv)).countLabel, { message: `หัว "เรียกแล้ว" ต้องเป็น ${n} คิว`, timeout: 30_000 }).toBe(`${n} คิว`);
      };

      // ---------- TC-007 เลขคิวในคอลัมน์คิว ----------
      await startClip(page, CLIP(7));
      await checkStep(page, `${TC(7)} ขั้น 2 เมนู แดชบอร์ด / คิว > มุมมองรายการ > แท็บ "ผู้ป่วยปัจจุบันใน ER"`, async () => {
        await openErPatientListFromMenu(page);
        await hnSearchBox(page).clear();
        const tab = erListTab(page, 'current');
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        // ป้ายยาวทับชื่อแท็บ / ช่องค้น HN (รอบแรก 31 ต.ค.) → ป้ายสั้น
        await markEvidence(clicked(tab), expected(main.locator('thead').filter({ visible: true }).first().locator('th').first()));
      });
      await soft(`${TC(7)} ขั้น 3 คอลัมน์ "คิว" ของผู้ป่วย A แสดงเลขคิวตรงกับเลขคิวของ Visit`, async () => {
        const row = await rowOf(A);
        const cell = await queueCell(row);
        const shown = (await callButton(cell, A).innerText().catch(() => (cell.innerText()))).trim();
        const rows: CompareRow[] = [
          { label: 'เลขคิวในคอลัมน์', values: [`${A.queue} (เลขคิวของ Visit)`, shown], same: shown === A.queue },
          { label: 'ที่มา Expected', values: ['queueExam.qDisplay', `${A.visit!.en} · API บอร์ด ER`], same: true },
        ];
        await showCompareTable(page, `${ISSUE[7]} เลขคิวของผู้ป่วย A`, ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(callButton(cell, A), `คิว ${A.queue}`), expected(await erListCell(page, row, 'HN').catch(() => row), `ผู้ป่วย A`));
        await snapEvidence(page, 'ผล — เลขคิวในคอลัมน์');
        await hideCompareTable(page);
        expect(shown, 'Expected: คอลัมน์ คิว แสดง Queue number ของผู้ป่วย A').toBe(A.queue);
      });

      // ---------- TC-008 ปุ่มเรียกคิว + จบคิว ไม่มีพักไว้ ----------
      await startClip(page, CLIP(8));
      await soft(`${TC(8)} ขั้น 2 คอลัมน์ "คิว" มีปุ่ม เรียกคิว และ จบคิว · ไม่มีปุ่ม พักไว้`, async () => {
        const cell = await queueCell(await rowOf(A));
        const buttons = await cell.getByRole('button').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') || (el as HTMLElement).innerText.trim()));
        const hasCall = await callButton(cell, A).count();
        const hasComplete = await completeButton(cell, A).count();
        const hasHold = await cell.getByRole('button', { name: /พัก/ }).count();
        const rows: CompareRow[] = [
          { label: 'ปุ่ม เรียกคิว', values: ['มี', hasCall ? `มี (ไอคอนลำโพง + เลขคิว · "เรียกคิว ${A.queue}")` : 'ไม่มี'], same: hasCall === 1 },
          { label: 'ปุ่ม จบคิว', values: ['มี', hasComplete ? `มี (ไอคอนเครื่องหมายถูก · "จบคิว ${A.queue}")` : 'ไม่มี'], same: hasComplete === 1 },
          { label: 'ปุ่ม พักไว้', values: ['ไม่มี', hasHold ? 'มี' : 'ไม่มี'], same: hasHold === 0 },
          { label: 'ปุ่มทั้งหมดในช่อง', values: ['-', buttons.join(' · ')], same: true },
        ];
        await showCompareTable(page, `${ISSUE[8]} ปุ่มในคอลัมน์คิว`, ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(callButton(cell, A), 'เรียกคิว'), expected(completeButton(cell, A), 'จบคิว'));
        await snapEvidence(page, 'ผล — ปุ่มในคอลัมน์คิว');
        await holdForClip(page, 2_000);
        await hideCompareTable(page);
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: มีปุ่ม เรียกคิว และ จบคิว ไม่มี พักไว้').toEqual([]);
      });

      // ---------- จอ TV ----------
      const tv = await openTvWindow(browser);
      const screen = makeRunner(tv);
      try {
        const start = await fetchTvBoard(tv);
        note('จอ TV ก่อนเรียกคิว (API)', `activeCall ${start.activeCall?.queueNumber ?? '-'} · calledCalls ${start.calledCalls.length} (${start.calledCalls.map((c) => c.queueNumber).join(', ') || '-'})`);

        // ---------- TC-009 เรียกคิวผู้ป่วย A ----------
        await startClip(tv, CLIP(9));
        let beforeActive = '';
        await checkStep(tv, `${TC(9)} ขั้น 1 เปิดจอ ER TV ค้างไว้ (ก่อนเรียกคิวผู้ป่วย A)`, async () => {
          beforeActive = (await tvActiveNumber(tv).count()) ? ((await tvActiveNumber(tv).textContent()) ?? '').trim() : '(ไม่มีคิวที่กำลังเรียก)';
          await markEvidence(expected(tvActiveArea(tv), `ก่อนเรียก: ${beforeActive}`));
          await snapEvidence(tv, 'ก่อนเรียก — จอ TV');
        });
        await startClip(page, `${CLIP(9)}-staff`);
        await callQueue(`${TC(9)} ขั้น 3 กดปุ่ม เรียกคิว ในแถวผู้ป่วย A (คิว ${A.queue})`, A, true);
        await screen.soft(`${TC(9)} ขั้น 4 การ์ด กำลังเรียก บนจอ TV แสดงเลขคิวของผู้ป่วย A`, async () => {
          await tv.bringToFront();
          await waitActive(tv, A.queue!);
          const shown = ((await tvActiveNumber(tv).textContent()) ?? '').trim();
          const rows: CompareRow[] = [
            { label: 'ก่อนกด', values: ['-', beforeActive], same: true },
            { label: 'กำลังเรียก', values: [`${A.queue} (ผู้ป่วย A)`, shown], same: shown === A.queue },
          ];
          await showCompareTable(tv, `${ISSUE[9]} คิวที่กำลังเรียก`, ['Expected', 'จอ TV'], rows, { side: 'right' });
          await markEvidence(expected(tvLatestTag(tv), 'กำลังเรียก'), expected(tvActiveNumber(tv), `คิวผู้ป่วย A ${A.queue}`));
          await snapEvidence(tv, 'ผล — คิว A กำลังเรียก');
          await hideCompareTable(tv);
          expect(shown).toBe(A.queue);
        });

        // ---------- เรียกคิวรายถัดไปจน "เรียกแล้ว" = 4 คิว ----------
        await startClip(page, 'prepare-4-staff');
        await startClip(tv, 'prepare-4');
        let next = 1;
        const callUntil = async (count: number) => {
          for (;;) {
            const snap = await fetchTvBoard(tv);
            if (snap.calledCalls.length >= count) return snap;
            const p = patients[next];
            if (!p) throw new Error(`ผู้ป่วยไม่พอให้ "เรียกแล้ว" ถึง ${count} คิว (ตอนนี้ ${snap.calledCalls.length})`);
            next += 1;
            await callQueue(`เตรียมข้อมูล เรียกคิวผู้ป่วย ${p.key} (คิว ${p.queue}) — ให้ "เรียกแล้ว" มี ${count} คิว`, p, false);
            await waitActive(tv, p.queue!);
          }
        };
        const snap4 = await callUntil(4);
        note('API จอ TV ตอน "เรียกแล้ว" 4 คิว', `activeCall ${snap4.activeCall?.queueNumber} · calledCalls ${snap4.calledCalls.map((c) => c.queueNumber).join(', ')}`);

        // ---------- TC-011 "เรียกแล้ว" 4 คิว = หน้าเดียว ----------
        await startClip(tv, CLIP(11));
        await screen.soft(`${TC(11)} ขั้น 2–3 กล่อง เรียกแล้ว 4 คิว แสดงครบในหน้าเดียว (รอ 1 รอบเปลี่ยนหน้า 15 วินาที)`, async () => {
          await tv.bringToFront();
          await waitHistoryCount(tv, snap4.calledCalls.length);
          const first = await readHistory(tv);
          if (snap4.calledCalls.length !== 4) {
            // Prod: คิวจริงมีอยู่ก่อนแล้วเกิน 4 — ต้องจบคิวผู้ป่วยจริงถึงจะได้ 4 พอดี ซึ่งไม่ทำ
            await markEvidence(expected(tvHistory(tv), `ต้องการ 4 คิว · จริง: ${first.countLabel} (มีคิวจริงอยู่ก่อน)`));
            await snapEvidence(tv, 'TC-011 ตรวจไม่ได้');
            untestable(TC(11), `"เรียกแล้ว" มี ${snap4.calledCalls.length} คิว (${snap4.calledCalls.map((c) => c.queueNumber).join(', ')}) ไม่ใช่ 4 พอดี`);
            return;
          }
          await markEvidence(expected(tvHistory(tv), `${first.countLabel} · หน้าเดียว`));
          await snapEvidence(tv, 'TC-011 ตอนเริ่มดู');
          await tv.waitForTimeout(17_000); // เลยรอบเปลี่ยนหน้า 15 วินาที
          const after = await readHistory(tv);
          const afterApi = await fetchTvBoard(tv);
          if (!sameQueues(afterApi.calledCalls, snap4.calledCalls)) {
            untestable(TC(11), `ระหว่างรอ 17 วินาที "เรียกแล้ว" เปลี่ยนจากคิวจริง (API ${snap4.calledCalls.map((c) => c.queueNumber).join(', ')} → ${afterApi.calledCalls.map((c) => c.queueNumber).join(', ')})`);
            await markEvidence(expected(tvHistory(tv), `ต้องการ 4 คิวชุดเดิม · จริง: ${after.countLabel} (คิวจริงแทรก)`));
            await snapEvidence(tv, 'TC-011 ตรวจไม่ได้');
            return;
          }
          const apiQueues = snap4.calledCalls.map((c) => c.queueNumber);
          const rows: CompareRow[] = [
            { label: 'หัวกล่อง', values: ['4 คิว', after.countLabel], same: after.countLabel === '4 คิว' },
            { label: 'คิวที่แสดง', values: [apiQueues.join(', '), after.cards.join(', ')], same: after.cards.length === 4 && apiQueues.every((q) => after.cards.includes(q)) },
            { label: 'หน้า', values: ['1 / 1 (ไม่มีหน้า 2)', `${after.page} / ${after.total} · ป้ายหน้า ${(await tvPageLabel(tvHistory(tv)).count()) ? 'มี' : 'ไม่มี'} · แถบหน้า ${after.segments} ช่อง`], same: after.total === 1 && after.segments <= 1 },
            { label: 'หลังรอ 17 วินาที', values: ['ยังเป็นชุดเดิม', after.cards.join(', ') === first.cards.join(', ') ? 'ชุดเดิม' : `เปลี่ยน (ก่อน ${first.cards.join(', ')})`], same: after.cards.join(',') === first.cards.join(',') },
          ];
          await showCompareTable(tv, `${ISSUE[11]} เรียกแล้ว 4 คิว`, ['Expected', 'จอ TV'], rows, { side: 'right' });
          await markEvidence(expected(historyCount(tv), after.countLabel), expected(tvHistory(tv).locator('[class*="_historyGrid_"]'), `${after.cards.length} คิว หน้าเดียว`));
          await snapEvidence(tv, 'ผล — เรียกแล้ว 4 คิว หน้าเดียว');
          await hideCompareTable(tv);
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: 4 คิว หน้าเดียว').toEqual([]);
        });

        // ---------- TC-006 "เรียกแล้ว" 5 คิว = 2 หน้า (4 + 1) ----------
        await startClip(page, 'prepare-5-staff');
        await startClip(tv, 'prepare-5');
        const snap5 = await callUntil(5);
        note('API จอ TV ตอน "เรียกแล้ว" 5 คิว', `activeCall ${snap5.activeCall?.queueNumber} · calledCalls ${snap5.calledCalls.map((c) => c.queueNumber).join(', ')}`);
        await startClip(tv, CLIP(6));
        await screen.soft(`${TC(6)} ขั้น 2–3 กล่อง เรียกแล้ว 5 คิว — หน้า 1 / 2 แสดง 4 คิว · หน้า 2 / 2 แสดง 1 คิว`, async () => {
          await tv.bringToFront();
          await waitHistoryCount(tv, snap5.calledCalls.length);
          if (snap5.calledCalls.length !== 5) {
            const h = await readHistory(tv);
            await markEvidence(expected(tvHistory(tv), `ต้องการ 5 คิว · จริง: ${h.countLabel} (มีคิวจริงอยู่ก่อน)`));
            await snapEvidence(tv, 'TC-006 ตรวจไม่ได้');
            untestable(TC(6), `"เรียกแล้ว" มี ${snap5.calledCalls.length} คิว (${snap5.calledCalls.map((c) => c.queueNumber).join(', ')}) ไม่ใช่ 5 พอดี`);
            return;
          }
          const pages = new Map<number, string[]>();
          const deadline = Date.now() + 40_000;
          let total = 0;
          while (Date.now() < deadline && (pages.size < 2 || !pages.has(1))) {
            const h = await readHistory(tv);
            total = h.total;
            if (!pages.has(h.page)) {
              await tv.waitForTimeout(500);
              const settled = await readHistory(tv);
              pages.set(settled.page, settled.cards);
              // กรอบเดียวรอบกล่อง "เรียกแล้ว" (หัว + รายการ + ป้ายหน้า) — 2 กรอบชิดกันทำให้ป้ายเบียดอ่านไม่ออก (รอบแรก 31 ต.ค.)
              await markEvidence(expected(tvHistory(tv), `หน้า ${settled.page} / ${settled.total} แสดง ${settled.cards.length} คิว`));
              await snapEvidence(tv, `TC-006 หน้า ${settled.page}`);
            }
            await tv.waitForTimeout(300);
          }
          const afterApi = await fetchTvBoard(tv);
          if (!sameQueues(afterApi.calledCalls, snap5.calledCalls)) {
            untestable(TC(6), `ระหว่างดู 2 หน้า "เรียกแล้ว" เปลี่ยนจากคิวจริง (API ${snap5.calledCalls.map((c) => c.queueNumber).join(', ')} → ${afterApi.calledCalls.map((c) => c.queueNumber).join(', ')})`);
            return;
          }
          const p1 = pages.get(1) ?? [];
          const p2 = pages.get(2) ?? [];
          const all = [...p1, ...p2];
          const apiQueues = snap5.calledCalls.map((c) => c.queueNumber);
          const label = await readHistory(tv);
          const rows: CompareRow[] = [
            { label: 'หัวกล่อง', values: ['5 คิว', label.countLabel], same: label.countLabel === '5 คิว' },
            { label: 'จำนวนหน้า', values: ['2', String(total)], same: total === 2 },
            { label: 'หน้า 1 / 2', values: ['4 คิว', `${p1.length} คิว: ${p1.join(', ')}`], same: p1.length === 4 },
            { label: 'หน้า 2 / 2', values: ['1 คิว', `${p2.length} คิว: ${p2.join(', ')}`], same: p2.length === 1 },
            { label: 'ครบ ไม่ซ้ำ', values: [apiQueues.join(', '), `${new Set(all).size} คิวไม่ซ้ำ จาก ${all.length}`], same: new Set(all).size === 5 && all.length === 5 && apiQueues.every((q) => all.includes(q)) },
          ];
          await showCompareTable(tv, `${ISSUE[6]} เรียกแล้ว 5 คิว`, ['Expected', 'จอ TV'], rows, { side: 'right' });
          await markEvidence(expected(historyCount(tv), label.countLabel), expected(tvHistory(tv).locator('[class*="_historyGrid_"]'), `หน้า ${label.page}`));
          await snapEvidence(tv, 'ผล — เรียกแล้ว 5 คิว 2 หน้า');
          await hideCompareTable(tv);
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: หน้าละ 4 คิว (4 + 1)').toEqual([]);
        });

        // ---------- TC-010 จบคิวผู้ป่วย A → หายจาก "เรียกแล้ว" ----------
        const before10 = await fetchTvBoard(tv);
        const others = before10.calledCalls.map((c) => c.queueNumber).filter((q) => q !== A.queue);
        // คลิปจอ TV ของ TC-010 เริ่มตอนกดจบคิว (รอบแรกเริ่มตรงนี้ คลิปยาว 177 วิ / 17 MB) — ภาพก่อนจบคิวใช้ภาพนิ่ง
        await startClip(tv, 'idle-10');
        let countBefore = '';
        await screen.soft(`${TC(10)} ขั้น 1–2 คิวผู้ป่วย A อยู่ใน เรียกแล้ว · จดจำนวน "n คิว"`, async () => {
          await tv.bringToFront();
          countBefore = (await readHistory(tv)).countLabel;
          expect(before10.calledCalls.map((c) => c.queueNumber), `คิวผู้ป่วย A ${A.queue} ต้องอยู่ใน "เรียกแล้ว" (API)`).toContain(A.queue);
          const cardA = tvHistoryCards(tv).filter({ hasText: A.queue! });
          // คิว A อาจอยู่หน้า 2 — รอให้จอวนมาถึง
          await expect(cardA, `จอต้องแสดงคิว A ${A.queue} ในหน้าใดหน้าหนึ่ง`).toBeVisible({ timeout: 35_000 });
          await markEvidence(expected(historyCount(tv), `ก่อนจบคิว: ${countBefore}`), expected(cardA.first(), `คิว A ${A.queue}`));
          await snapEvidence(tv, 'ก่อนจบคิว — จอ TV');
        });
        await startClip(page, `${CLIP(10)}-staff`);
        await checkStep(page, `${TC(10)} ขั้น 3 กดปุ่ม จบคิว ในแถวผู้ป่วย A (คิว ${A.queue})`, async () => {
          await page.bringToFront();
          const cell = await queueCell(await rowOf(A));
          const button = completeButton(cell, A);
          await expect(button).toBeVisible();
          // toast "ส่งคิว …" ของการเรียกคิวก่อนหน้ายังค้าง → รอให้หายก่อนถ่าย "ก่อนกด"
          await page.getByText(/^ส่งคิว .+ ไปยังจอ ER แล้ว$/).first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
          await markEvidence(clicked(button, `จบคิว ${A.queue}`));
          await snapEvidence(page, 'ก่อนกด — จบคิว A');
          const done = waitForApi(page, 'POST', /\/cortex-api\/er\/encounters\/[^/]+\/queue-complete$/, 30_000);
          await startClip(tv, CLIP(10));
          await button.click();
          // ถ้ามีกล่องยืนยัน (Popconfirm / Modal) กดยืนยัน
          const confirm = page.locator('.ant-popconfirm-buttons .ant-btn-primary, .ant-modal-confirm-btns .ant-btn-primary').filter({ visible: true }).first();
          if (await confirm.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false)) {
            note(`${TC(10)} กล่องยืนยัน`, (await page.locator('.ant-popover, .ant-modal').filter({ visible: true }).first().innerText().catch(() => '')).replace(/\s+/g, ' '));
            await markEvidence(clicked(confirm));
            await snapEvidence(page, 'กล่องยืนยันจบคิว');
            await confirm.click();
          }
          const res = await done;
          await expectOk(res, `จบคิว ${A.queue}`);
          expect(new URL(res.url()).pathname).toContain(`/er/encounters/${A.visit!.en}/queue-complete`);
          // toast อยู่มุมขวาบน (ช่องคิวก็ขึ้นคำ "จบคิวแล้ว" — getByText เคยไปจับช่องคิวแทน toast)
          const toast = page.locator('.ant-message-notice, .ant-notification-notice').filter({ hasText: 'จบคิวแล้ว' }).first();
          await toast.waitFor({ state: 'visible', timeout: 30_000 });
          await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
          const cellAfter = await queueCell(await rowOf(A));
          // ช่องคิว re-render ช้ากว่า toast → รอให้เปลี่ยนเป็น "<เลขคิว> จบคิวแล้ว"
          await expect(cellAfter).toContainText('จบคิวแล้ว', { timeout: 15_000 }).catch(() => undefined);
          note(`${TC(10)} คอลัมน์คิวของผู้ป่วย A หลังจบคิว`, (await cellAfter.innerText()).replace(/\s+/g, ' ').trim() || '(ว่าง)');
          await markEvidence(alerted(toast), expected(cellAfter, 'จบคิวแล้ว'));
          await snapEvidence(page, 'หลังกด — จบคิว A');
        });
        await screen.soft(`${TC(10)} ขั้น 4 คิวผู้ป่วย A หายจาก เรียกแล้ว · จำนวนลด 1 · คิวอื่นยังอยู่`, async () => {
          await tv.bringToFront();
          await waitHistoryCount(tv, before10.calledCalls.length - 1).catch(() => undefined);
          const after = await fetchTvBoard(tv);
          const h = await readHistory(tv);
          const othersNow = after.calledCalls.map((c) => c.queueNumber).filter((q) => q !== A.queue);
          if (othersNow.join(',') !== others.join(',')) {
            // Prod: เจ้าหน้าที่เรียก / จบคิวจริงระหว่างนี้ — จำนวน "ลด 1" พิสูจน์ไม่ได้ แต่ยังดูว่าคิว A หายได้
            untestable(`${TC(10)} (เฉพาะจำนวนลด 1 / คิวอื่นยังอยู่)`, `คิวอื่นใน API เปลี่ยนระหว่างจบคิว (${others.join(', ')} → ${othersNow.join(', ')})`);
            const gone = !h.cards.includes(A.queue!) && !after.calledCalls.some((c) => c.queueNumber === A.queue);
            await markEvidence(expected(tvHistory(tv).locator('[class*="_historyGrid_"]'), gone ? `ไม่มีคิว ${A.queue}` : `ไม่มีคิว ${A.queue} · จริง: ยังแสดง`));
            await snapEvidence(tv, 'ผล — คิว A หายจากเรียกแล้ว');
            expect(gone, `Expected: คิว A ${A.queue} หายจาก "เรียกแล้ว"`).toBeTruthy();
            return;
          }
          // ไม่เกิน 4 คิว = หน้าเดียว อ่านครบจากจอได้เลย
          const rows: CompareRow[] = [
            { label: 'หัวกล่อง', values: [`${before10.calledCalls.length - 1} คิว (ก่อน ${countBefore})`, h.countLabel], same: h.countLabel === `${before10.calledCalls.length - 1} คิว` },
            { label: `คิว A ${A.queue}`, values: ['ไม่แสดง', h.cards.includes(A.queue!) || after.calledCalls.some((c) => c.queueNumber === A.queue) ? 'ยังแสดง' : 'ไม่แสดง'], same: !h.cards.includes(A.queue!) && !after.calledCalls.some((c) => c.queueNumber === A.queue) },
            { label: 'คิวอื่น', values: [others.join(', '), h.cards.join(', ')], same: others.every((q) => h.cards.includes(q)) && h.total === 1 },
          ];
          await showCompareTable(tv, `${ISSUE[10]} หลังจบคิว A`, ['Expected', 'จอ TV'], rows, { side: 'right' });
          await markEvidence(expected(historyCount(tv), h.countLabel), expected(tvHistory(tv).locator('[class*="_historyGrid_"]'), `ไม่มีคิว ${A.queue}`));
          await snapEvidence(tv, 'ผล — คิว A หายจากเรียกแล้ว');
          await hideCompareTable(tv);
          expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'Expected: คิว A หาย จำนวนลด 1 คิวอื่นอยู่ครบ').toEqual([]);
        });
        await startClip(page, 'after-test');
        await startClip(tv, 'after-test');
      } finally {
        await hideCompareTable(tv).catch(() => undefined);
        await finishVideo(tv);
        await tv.context().close();
        // จบคิวผู้ป่วย AUTO ที่เทสเรียกทุกราย — ไม่ให้คิวทดสอบค้างที่ "กำลังเรียก / เรียกแล้ว" ของจอ TV จริง (SBH Prod 6 พ.ย. 2026)
        await hideCompareTable(page).catch(() => undefined);
        for (const p of calledByTest) {
          const result = await (async () => {
            const cell = await queueCell(await rowOf(p));
            const button = completeButton(cell, p);
            if (!(await button.isVisible().catch(() => false))) return `ไม่มีปุ่มจบคิว (${((await cell.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim()})`;
            const done = waitForApi(page, 'POST', /\/cortex-api\/er\/encounters\/[^/]+\/queue-complete$/, 30_000);
            await button.click();
            const confirm = page.locator('.ant-popconfirm-buttons .ant-btn-primary, .ant-modal-confirm-btns .ant-btn-primary').filter({ visible: true }).first();
            if (await confirm.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false)) await confirm.click();
            await expectOk(await done, `จบคิว ${p.queue}`);
            return 'จบคิวแล้ว';
          })().catch((error: Error) => `จบคิวไม่สำเร็จ — ${error.message.split('\n')[0]}`);
          note(`หลังเทส: ผู้ป่วย ${p.key} คิว ${p.queue}`, result);
          console.log(`    หลังเทส: ผู้ป่วย ${p.key} คิว ${p.queue}: ${result}`);
        }
      }
      screen.finish();
      staff.finish();
    },
  );

  // ปิด Visit ผู้ป่วยของเทส 2 ที่รันด้วย SBH3117_KEEP=1 (SBH Prod รอบแรก — กันเสียโควตาผู้ป่วยถ้าเทสล้มกลางทาง)
  test('ปิด Visit ผู้ป่วย AUTO ของ SBH-3117 ที่การเงิน (SBH3117_VISITS)', { tag: ['@SBH-3117-CLOSE'] }, async ({ page }) => {
    const visits = (process.env.SBH3117_VISITS ?? '').split(';').filter(Boolean).map((v) => v.split(','));
    test.skip(!visits.length, 'ต้องใส่ SBH3117_VISITS=<HN>,<VN>,<EN>;…');
    for (const [hn, vn, en] of visits) {
      const result = await closeVisitAtCashier(page, hn, vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'ปิด Visit', description: `HN ${hn} · ${vn} · ${en}: ${result}` });
      console.log(`    HN ${hn} · ${vn} · ${en}: ${result}`);
    }
  });
});
