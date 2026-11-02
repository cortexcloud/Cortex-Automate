import type { BrowserContext, Locator, Page } from '@playwright/test';
import { confirmOpenErVisit, dismissToast, gotoErDashboard, openTriagePage, openVisitDialog } from '../../../helpers/functions/er';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient, type NewPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { COVERAGE_UC } from '../../../mock-data/uat-er';

// SBH-2371 [ER][Registration] เพิ่ม Field คำนำหน้าชื่อ (+ รูป Profile จากบัตร — Dev ไม่ได้ทำ ผู้ใช้ให้ไม่แตะ TC-005)
// ชุด EXE SBH-3193 → HPY SBH-3194 (TC-001 SBH-3196 · TC-002 SBH-3197 · TC-003 SBH-3198 · TC-004 SBH-3199) · UHP SBH-3195 (TC-006 SBH-3201 · TC-007 SBH-3202)
// 1 เทสต่อ flow (R9) · คลิปแยกต่อ TC (R61)
//   เทส 1 แท็บผู้ป่วยรายเดียว: TC-001 → TC-006 → TC-002 · เทส 2 แท็บผู้ป่วยหลายคน: TC-003 → TC-007 → TC-004
// สิ่งที่เจอตอนสำรวจ (dev-x 31 ต.ค. 2026 · ไฟล์แอป index-CAlFiC-E.js):
//   - ช่องคำนำหน้าว่างแล้วเลือกเพศ → ระบบเติมให้เอง (หญิง → น.ส.) ลบออกไม่ได้ · เลือกเองก่อนแล้วไม่ถูกทับ
//     → TC-006 / 007 ผู้ใช้ให้ "เล่น 2 แบบ ลงตามจริง": แบบ 1 กดลงทะเบียนก่อนเลือกเพศ (ข้อความแดง + ไม่ส่งคำสั่ง) · แบบ 2 ทำตาม Step ตรงๆ (ระบบเติม น.ส. แล้วได้ HN)
//   - ช่องวันเกิดตีความปีที่พิมพ์เป็น พ.ศ. (พิมพ์ 1990 → เก็บ ค.ศ. 1447) → พิมพ์ 2533 ให้อายุ ≥ 20 ปีตาม TC
// ข้อมูล: ผู้ป่วย AUTO หญิงใหม่ 4 ราย (2 รายต่อเทส) · เหตุการณ์ AUTO 1 รายการ · เปิด Visit ER สิทธิ UC เฉพาะผู้ป่วย TC-004 (ต้องเปิดจึงเข้ารายการของเหตุการณ์) — ทิ้งไว้ตาม R11
// รัน (dev-x): npx playwright test --headed --grep @SBH-2371

const ISSUE = { 1: 'SBH-3196', 2: 'SBH-3197', 3: 'SBH-3198', 4: 'SBH-3199', 6: 'SBH-3201', 7: 'SBH-3202' } as const;
const TC = (n: keyof typeof ISSUE) => `TC-00${n} (${ISSUE[n]})`;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const BIRTH_BE = '15/01/2533'; // = 15 ม.ค. 1990 (ช่องวันเกิดรับปี พ.ศ.)
const REQUIRED_TEXT = 'กรุณาเลือกคำนำหน้าชื่อ';

test.use({ serviceWorkers: 'block' }); // ให้ทุกคำสั่งผ่าน context (นับคำสั่งลงทะเบียนได้ครบ)

const female = (label: string): NewPatient => ({ ...newTestPatient(label), gender: 'หญิง', birthDate: BIRTH_BE });

// ---------- ฟอร์มลงทะเบียนผู้ป่วยใหม่ (root = main ของแท็บรายเดียว / dialog "ผู้ป่วยใหม่" ของแท็บหลายคน) ----------
const prefixBox = (root: Locator) => root.getByRole('combobox', { name: '* คำนำหน้าชื่อ', exact: true });
// กล่อง .ant-form-item ชั้นในสุดของช่อง (มี .ant-form-item ชั้นนอกครอบทั้งส่วนอยู่ด้วย)
const formItemOf = (field: Locator) => field.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " ant-form-item ")][1]');
const prefixItem = (root: Locator) => formItemOf(prefixBox(root));
const prefixValue = (root: Locator) => prefixItem(root).locator('.ant-select-content-value, .ant-select-placeholder').first();
const genderItem = (root: Locator) => formItemOf(root.getByRole('combobox', { name: '* เพศ', exact: true }));
const dropdown = (page: Page) => page.locator('.ant-select-dropdown:visible').first();
const submitButton = (root: Locator) => root.getByRole('button', { name: 'ลงทะเบียนผู้ป่วย' });

async function waitPrefixReady(root: Locator) {
  await expect(prefixBox(root)).toBeVisible({ timeout: 30_000 });
  // ตัวเลือกโหลดจาก API — ระหว่างโหลดมีไอคอนหมุน
  await expect(prefixItem(root).locator('.ant-select-loading')).toHaveCount(0, { timeout: 30_000 });
}

async function fillExceptPrefixAndGender(root: Locator, p: NewPatient) {
  await root.getByRole('textbox', { name: '* เลขบัตรประชาชน', exact: true }).fill(p.citizenId);
  await root.getByRole('textbox', { name: '* ชื่อ', exact: true }).fill(p.firstName);
  await root.getByRole('textbox', { name: '* นามสกุล', exact: true }).fill(p.familyName);
  const birth = root.getByRole('textbox', { name: '* วัน/เดือน/ปีเกิด', exact: true });
  await birth.fill(p.birthDate);
  await birth.press('Tab'); // ห้าม Enter — ฟอร์มครบแล้ว Enter = ส่งลงทะเบียน
  await expect(birth).toHaveValue(p.birthDate);
}

async function pickGender(page: Page, root: Locator, gender: 'ชาย' | 'หญิง') {
  await root.getByRole('combobox', { name: '* เพศ', exact: true }).click();
  await page.locator(`.ant-select-dropdown:visible .ant-select-item-option[title="${gender}"]`).first().click();
  await expect(genderItem(root).locator('.ant-select-content-value')).toHaveAttribute('title', gender);
}

async function pickPrefix(page: Page, root: Locator, title: string) {
  await prefixBox(root).click();
  await prefixBox(root).fill(title).catch(() => undefined);
  await page.locator(`.ant-select-dropdown:visible .ant-select-item-option[title="${title}"]`).first().click();
  await expect(prefixValue(root)).toHaveText(title);
}

/** จดคำสั่งเขียนที่ยิงออกไป (ไม่นับ graphql query) — ไว้ยืนยันว่าตอนข้อความแดงขึ้น ระบบไม่ได้ส่งคำสั่งลงทะเบียน */
function trackWrites(context: BrowserContext) {
  const writes: string[] = [];
  context.on('request', (r) => {
    if (r.method() === 'GET' || !/cortex-api|demographic/.test(r.url())) return;
    if (/graphql/.test(r.url()) && !/\bmutation\b/.test(r.postData() ?? '')) return;
    writes.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });
  return writes;
}

/** หลังกดลงทะเบียนสำเร็จ ระบบเปิดหน้าต่าง "เปิด Visit ER" → อ่าน HN / ชื่อ / อายุ จากหน้าต่าง */
async function readVisitDialog(page: Page) {
  const dialog = openVisitDialog(page);
  await expect(dialog).toContainText(/HN\s*\d{5,}/, { timeout: 60_000 });
  const hn = ((await dialog.innerText()).match(/HN\s*(\d{5,})/) ?? [])[1] ?? '';
  await expect(dialog.getByText(`HN ${hn}`, { exact: true })).toBeVisible();
  const nameLine = dialog.getByText(/^\S+ AUTO \S+$/).first();
  const name = (await nameLine.innerText()).trim();
  const ageLine = dialog.getByText(/^\(\d+ ปี/).first();
  const age = Number(((await ageLine.innerText()).match(/\((\d+) ปี/) ?? [])[1]);
  return { dialog, hn, name, nameLine, ageLine, age };
}

/** แท็บผู้ป่วยรายเดียว → ผู้ป่วยมี HN → ค้นด้วย HN → ตัวเลือกในผลค้นหา "<HN> - <คำนำหน้า ชื่อ นามสกุล>" */
async function searchByHn(page: Page, hn: string) {
  const main = page.getByRole('main');
  await main.locator('label').filter({ hasText: 'ผู้ป่วยมี HN' }).click();
  const search = page.getByRole('combobox', { name: 'ค้นหาผู้ป่วยด้วย HN หรือชื่อ' });
  await search.fill(hn);
  const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${hn} - `) }).first();
  await expect(option).toBeVisible({ timeout: 30_000 });
  return { search, option, text: ((await option.getAttribute('title')) ?? (await option.innerText())).trim() };
}

test.describe('SBH-2371 คำนำหน้าชื่อ ในหน้าผู้ป่วยใหม่ ER (dev-x)', () => {
  test.describe.configure({ timeout: 600_000 });

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page);
  });

  test(
    'แท็บผู้ป่วยรายเดียว: ช่องคำนำหน้าบังคับ → ไม่เลือก → เลือก "นาง" ลงทะเบียน + ค้นด้วย HN (Super_User)',
    { tag: ['@SBH-2371', `@${ISSUE[1]}`, `@${ISSUE[6]}`, `@${ISSUE[2]}`], annotation: [linear('SBH-2371'), linear(ISSUE[1]), linear(ISSUE[6]), linear(ISSUE[2])] },
    async ({ page, context }) => {
      const main = page.getByRole('main');
      const writes = trackWrites(context);
      const freshForm = async () => {
        await main.locator('label').filter({ hasText: 'ผู้ป่วยมี HN' }).click();
        await main.locator('label').filter({ hasText: 'ผู้ป่วยใหม่' }).click();
        await waitPrefixReady(main);
        await expect(prefixValue(main)).toHaveText('เลือก');
      };

      await gotoErDashboard(page);
      await openTriagePage(page);
      await main.locator('label').filter({ hasText: 'ผู้ป่วยใหม่' }).click();
      await waitPrefixReady(main);

      // ─── TC-001
      await startClip(page, 'TC-001');
      await checkStep(page, `${TC(1)} ขั้น 1-3 ผู้ป่วยใหม่ (ไม่อ่านบัตร) — ช่อง คำนำหน้าชื่อ มี * เป็นช่องบังคับ`, async () => {
        const label = prefixItem(main).locator('label[for="namePrefixCode"]');
        await expect(label).toHaveText('คำนำหน้าชื่อ');
        await expect(label).toHaveClass(/ant-form-item-required/);
        await expect(prefixBox(main)).toHaveAttribute('aria-required', 'true');
        await expect(prefixValue(main)).toHaveText('เลือก');
        await markEvidence(expected(prefixItem(main), '* คำนำหน้าชื่อ ช่องบังคับ'));
      });
      let options: string[] = [];
      await checkStep(page, `${TC(1)} ขั้น 3 กดช่อง คำนำหน้าชื่อ — เปิดรายการให้เลือกได้`, async () => {
        await markEvidence(clicked(prefixBox(main)));
        await snapEvidence(page, 'ก่อนกด — ช่องคำนำหน้าชื่อ');
        await prefixBox(main).click();
        await expect(dropdown(page)).toBeVisible();
        options = await dropdown(page).locator('.ant-select-item-option').evaluateAll((els) => els.map((e) => e.getAttribute('title') ?? ''));
        expect(options).toEqual(expect.arrayContaining(['นาย', 'น.ส.', 'นาง']));
        await markEvidence(expected(prefixItem(main)), expected(dropdown(page), 'เปิดเลือกคำนำหน้าได้'));
      });
      test.info().annotations.push({ type: `${TC(1)} ตัวเลือกช่วงแรกของรายการ`, description: options.join(' · ') });
      await page.keyboard.press('Escape');
      await expect(dropdown(page)).toBeHidden();

      // ─── TC-006 แบบ 1: กดลงทะเบียนตอนคำนำหน้ายังว่าง (ยังไม่เลือกเพศ)
      await startClip(page, 'TC-006');
      const p6 = female('Ttl2371S');
      await checkStep(page, `${TC(6)} แบบ 1 ขั้น 2-3 กรอก เลขบัตร · ชื่อ · นามสกุล · วันเกิด (ยังไม่เลือกเพศ คำนำหน้าว่าง) → กด ลงทะเบียนผู้ป่วย`, async () => {
        await fillExceptPrefixAndGender(main, p6);
        await expect(prefixValue(main)).toHaveText('เลือก');
        const before = writes.length;
        await markEvidence(
          expected(prefixItem(main), 'คำนำหน้าว่าง'),
          filled(main.getByRole('textbox', { name: '* เลขบัตรประชาชน', exact: true })),
          filled(main.getByRole('textbox', { name: '* ชื่อ', exact: true })),
          filled(main.getByRole('textbox', { name: '* นามสกุล', exact: true })),
          filled(main.getByRole('textbox', { name: '* วัน/เดือน/ปีเกิด', exact: true })),
          clicked(submitButton(main)),
        );
        await snapEvidence(page, 'ก่อนกด — ลงทะเบียน คำนำหน้าว่าง');
        await submitButton(main).click();
        const error = prefixItem(main).locator('.ant-form-item-explain-error');
        await expect(error).toHaveText(REQUIRED_TEXT);
        await page.waitForTimeout(2_000); // เผื่อคำสั่งที่ส่งช้า
        expect(writes.slice(before), 'ต้องไม่มีคำสั่งลงทะเบียนถูกส่ง').toEqual([]);
        await expect(openVisitDialog(page)).toBeHidden();
        const genderError = genderItem(main).locator('.ant-form-item-explain-error');
        // ตีกรอบที่ข้อความแดงโดยตรง (กรอบทั้งกล่องช่อง เส้นล่างผ่ากลางข้อความแดง)
        // ป้ายสั้น — ป้ายยาวหาที่ว่างไม่ได้ ไปทับช่องคำนำหน้า (แท็บรายเดียวช่องแคบกว่าในหน้าต่างของแท็บหลายคน)
        await markEvidence(expected(error, 'ข้อความแดง'), alerted(genderError), expected(submitButton(main), 'ไม่ลงทะเบียน (ไม่มีคำสั่งส่ง)'));
        test.info().annotations.push({ type: `${TC(6)} แบบ 1`, description: `ข้อความแดงที่ช่องคำนำหน้า "${await error.innerText()}" · ช่องเพศ "${(await genderError.allInnerTexts()).join(' ')}" · คำสั่งเขียนหลังกด ${writes.length - before} รายการ` });
      });

      // ─── TC-006 แบบ 2: ทำตาม Test Step ตรงๆ (เลือกเพศครบ ไม่แตะคำนำหน้า)
      let hn6 = '';
      await checkStep(page, `${TC(6)} แบบ 2 ขั้น 2 เลือกเพศ หญิง (ไม่แตะคำนำหน้า) — ระบบเติมคำนำหน้า "น.ส." ให้เอง`, async () => {
        await pickGender(page, main, 'หญิง');
        await expect(prefixValue(main)).toHaveText('น.ส.');
        await expect(prefixItem(main).locator('.ant-form-item-explain-error')).toHaveCount(0);
        await markEvidence(filled(genderItem(main), 'เลือก หญิง'), expected(prefixItem(main), 'ระบบเติม น.ส. เอง (ไม่ได้เลือก)'), clicked(submitButton(main)));
        await snapEvidence(page, 'ก่อนกด — ลงทะเบียน คำนำหน้าเติมเอง');
      });
      await checkStep(page, `${TC(6)} แบบ 2 ขั้น 3 กด ลงทะเบียนผู้ป่วย — ระบบลงทะเบียนได้ HN (ไม่ตรง Expected: คำนำหน้าถูกเติมแทนการแจ้งเตือน)`, async () => {
        await submitButton(main).click();
        const v = await readVisitDialog(page);
        hn6 = v.hn;
        expect(v.name).toBe(`น.ส. ${p6.firstName} ${p6.familyName}`);
        await markEvidence(expected(v.dialog.getByText(`HN ${v.hn}`, { exact: true }), 'ได้ HN'), expected(v.nameLine, 'คำนำหน้า น.ส.'));
        test.info().annotations.push({ type: `${TC(6)} แบบ 2`, description: `ระบบเติม น.ส. หลังเลือกเพศ → ลงทะเบียนได้ HN ${v.hn} (${v.name})` });
      });
      await checkStep(page, `${TC(6)} แบบ 2 ปิดหน้าต่าง เปิด Visit ER (ยกเลิก — ไม่เปิด Visit)`, async () => {
        const dialog = openVisitDialog(page);
        await markEvidence(clicked(dialog.getByRole('button', { name: 'ยกเลิก', exact: true }), 'ไม่เปิด Visit'));
        await snapEvidence(page, 'ก่อนกด — ยกเลิก เปิด Visit');
        await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
        await expect(dialog).toBeHidden();
      });
      console.log(`    TC-006 แบบ 2: HN ${hn6}`);

      // ─── TC-002
      await freshForm();
      await startClip(page, 'TC-002');
      const p2 = female('Ttl2371N');
      await checkStep(page, `${TC(2)} ขั้น 1-2 ผู้ป่วยใหม่ → เลือกคำนำหน้า "นาง" → กรอก เลขบัตร · ชื่อ · นามสกุล · เพศ หญิง · วันเกิด (อายุ 36 ปี)`, async () => {
        await pickPrefix(page, main, 'นาง');
        await fillExceptPrefixAndGender(main, p2);
        await pickGender(page, main, 'หญิง');
        await expect(prefixValue(main)).toHaveText('นาง'); // ไม่ถูกเติมทับเป็น น.ส.
        await markEvidence(
          filled(prefixItem(main), 'เลือก นาง'),
          filled(main.getByRole('textbox', { name: '* ชื่อ', exact: true })),
          filled(main.getByRole('textbox', { name: '* นามสกุล', exact: true })),
          filled(genderItem(main)),
          filled(main.getByRole('textbox', { name: '* วัน/เดือน/ปีเกิด', exact: true })),
          clicked(submitButton(main)),
        );
        await snapEvidence(page, 'ก่อนกด — ลงทะเบียน นาง');
      });
      let hn2 = '';
      let dialogName = '';
      await checkStep(page, `${TC(2)} ขั้น 3 กด ลงทะเบียนผู้ป่วย — ลงทะเบียนสำเร็จได้ HN ชื่อมีคำนำหน้า "นาง"`, async () => {
        await submitButton(main).click();
        const v = await readVisitDialog(page);
        hn2 = v.hn;
        dialogName = v.name;
        expect(v.name).toBe(`นาง ${p2.firstName} ${p2.familyName}`);
        expect(v.age, 'อายุ 20 ปีขึ้นไป').toBeGreaterThanOrEqual(20);
        expect(v.age).toBeLessThan(120);
        await markEvidence(expected(v.dialog.getByText(`HN ${v.hn}`, { exact: true }), 'ได้ HN'), expected(v.nameLine, 'นาง …'), expected(v.ageLine, `อายุ ${v.age} ปี`));
      });
      await checkStep(page, `${TC(2)} ปิดหน้าต่าง เปิด Visit ER (ยกเลิก — TC ไม่ต้องเปิด Visit)`, async () => {
        const dialog = openVisitDialog(page);
        await markEvidence(clicked(dialog.getByRole('button', { name: 'ยกเลิก', exact: true }), 'ไม่เปิด Visit'));
        await snapEvidence(page, 'ก่อนกด — ยกเลิก เปิด Visit');
        await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
        await expect(dialog).toBeHidden();
      });
      await checkStep(page, `${TC(2)} ขั้น 4 ค้นหาผู้ป่วยด้วย HN ในช่อง ค้นหาผู้ป่วยด้วย HN หรือชื่อ — ชื่อแสดงคำนำหน้า "นาง"`, async () => {
        const found = await searchByHn(page, hn2);
        expect(found.text).toBe(`${hn2} - นาง ${p2.firstName} ${p2.familyName}`);
        const rows: CompareRow[] = [
          { label: 'คำนำหน้าที่เลือก', values: ['นาง'], same: true },
          { label: 'หน้าต่างเปิด Visit', values: [dialogName], same: dialogName.startsWith('นาง ') },
          { label: 'ผลค้นหาด้วย HN', values: [found.text], same: found.text.includes(' - นาง ') },
        ];
        await markEvidence(filled(found.search, `HN ${hn2}`), expected(found.option, 'นาง …'));
        await showCompareTable(page, `${TC(2)} คำนำหน้าของ HN ${hn2}`, ['ค่า'], rows, { width: '640px' });
      });
      await hideCompareTable(page);
      await page.keyboard.press('Escape');
      test.info().annotations.push({ type: 'ผู้ป่วยที่สร้าง', description: `TC-006 แบบ 2: HN ${hn6} (น.ส.) · TC-002: HN ${hn2} (นาง) — ไม่ได้เปิด Visit` });
      console.log(`    TC-002: HN ${hn2}`);
    },
  );

  test(
    'แท็บผู้ป่วยหลายคน: สร้างเหตุการณ์ → ช่องคำนำหน้าบังคับ → ไม่เลือก → เลือก "นาง" ลงทะเบียน + รายการเหตุการณ์ + ค้นด้วย HN (Super_User)',
    { tag: ['@SBH-2371', `@${ISSUE[3]}`, `@${ISSUE[7]}`, `@${ISSUE[4]}`], annotation: [linear('SBH-2371'), linear(ISSUE[3]), linear(ISSUE[7]), linear(ISSUE[4])] },
    async ({ page, context }) => {
      const main = page.getByRole('main');
      const writes = trackWrites(context);
      const form = page.getByRole('dialog', { name: 'ผู้ป่วยใหม่' });
      const openNewPatient = async () => {
        await main.getByRole('button', { name: 'plus ผู้ป่วยใหม่' }).click();
        await expect(form).toBeVisible({ timeout: 15_000 });
        await waitPrefixReady(form);
      };
      const stamp = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
      const eventName = `AUTO SBH-2371 ${stamp}`;

      await gotoErDashboard(page);
      await openTriagePage(page);
      await page.getByRole('tab', { name: 'ผู้ป่วยหลายคน' }).click();
      await expect(main.getByRole('button', { name: /สร้างเหตุการณ์/ }).first()).toBeVisible();

      // ─── TC-003
      await startClip(page, 'TC-003');
      await checkStep(page, `${TC(3)} ขั้น 2 สร้างเหตุการณ์ (ชื่อ · สถานที่ · อาการสำคัญร่วม) → บันทึก`, async () => {
        await main.getByRole('button', { name: /สร้างเหตุการณ์/ }).first().click();
        const dialog = page.getByRole('dialog', { name: 'สร้างเหตุการณ์' });
        await dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ }).fill(eventName);
        await dialog.getByRole('textbox', { name: /สถานที่เกิดเหตุ/ }).fill('ถนนพหลโยธิน กม. 100');
        await dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ }).fill('อุบัติเหตุรถชนหมู่');
        await dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ }).press('Tab');
        const create = dialog.getByRole('button', { name: 'สร้าง', exact: true });
        await markEvidence(filled(dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ })), filled(dialog.getByRole('textbox', { name: /สถานที่เกิดเหตุ/ })), filled(dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ })), clicked(create));
        await snapEvidence(page, 'ก่อนกด — สร้างเหตุการณ์');
        await create.click();
        await expect(dialog).toBeHidden({ timeout: 30_000 });
        await expect(page).toHaveURL(/mode=mass-casualty&incidentId=/);
        await expect(main.getByRole('button', { name: 'plus ผู้ป่วยใหม่' })).toBeVisible();
        await markEvidence(expected(main.getByText(eventName).first(), 'สร้างเหตุการณ์แล้ว'));
      });
      test.info().annotations.push({ type: 'เหตุการณ์', description: `${eventName} · ${page.url()}` });
      await checkStep(page, `${TC(3)} ขั้น 3-4 กด + ผู้ป่วยใหม่ — ฟอร์มลงทะเบียนมีช่อง คำนำหน้าชื่อ มี * เป็นช่องบังคับ`, async () => {
        await markEvidence(clicked(main.getByRole('button', { name: 'plus ผู้ป่วยใหม่' })));
        await snapEvidence(page, 'ก่อนกด — ผู้ป่วยใหม่ ในเหตุการณ์');
        await openNewPatient();
        const label = prefixItem(form).locator('label').first();
        await expect(label).toHaveText('คำนำหน้าชื่อ');
        await expect(label).toHaveClass(/ant-form-item-required/);
        await expect(prefixBox(form)).toHaveAttribute('aria-required', 'true');
        await expect(prefixValue(form)).toHaveText('เลือก');
        await markEvidence(expected(prefixItem(form), '* คำนำหน้าชื่อ ช่องบังคับ'));
      });
      await checkStep(page, `${TC(3)} ขั้น 4 กดช่อง คำนำหน้าชื่อ — เปิดรายการให้เลือกได้`, async () => {
        await prefixBox(form).click();
        await expect(dropdown(page)).toBeVisible();
        const options = await dropdown(page).locator('.ant-select-item-option').evaluateAll((els) => els.map((e) => e.getAttribute('title') ?? ''));
        expect(options).toEqual(expect.arrayContaining(['นาย', 'น.ส.', 'นาง']));
        await markEvidence(expected(prefixItem(form)), expected(dropdown(page), 'เปิดเลือกคำนำหน้าได้'));
      });
      await page.keyboard.press('Escape');
      await expect(dropdown(page)).toBeHidden();
      await expect(form).toBeVisible(); // Esc ปิดแค่รายการ ไม่ปิดฟอร์ม

      // ─── TC-007 แบบ 1
      await startClip(page, 'TC-007');
      const p7 = female('Ttl2371M');
      await checkStep(page, `${TC(7)} แบบ 1 ขั้น 2-3 กรอก เลขบัตร · ชื่อ · นามสกุล · วันเกิด (ยังไม่เลือกเพศ คำนำหน้าว่าง) → กด ลงทะเบียนผู้ป่วย`, async () => {
        await fillExceptPrefixAndGender(form, p7);
        await expect(prefixValue(form)).toHaveText('เลือก');
        const before = writes.length;
        await markEvidence(
          expected(prefixItem(form), 'คำนำหน้าว่าง'),
          filled(form.getByRole('textbox', { name: '* เลขบัตรประชาชน', exact: true })),
          filled(form.getByRole('textbox', { name: '* ชื่อ', exact: true })),
          filled(form.getByRole('textbox', { name: '* นามสกุล', exact: true })),
          filled(form.getByRole('textbox', { name: '* วัน/เดือน/ปีเกิด', exact: true })),
          clicked(submitButton(form)),
        );
        await snapEvidence(page, 'ก่อนกด — ลงทะเบียน คำนำหน้าว่าง');
        await submitButton(form).click();
        const error = prefixItem(form).locator('.ant-form-item-explain-error');
        await expect(error).toHaveText(REQUIRED_TEXT);
        await page.waitForTimeout(2_000);
        expect(writes.slice(before), 'ต้องไม่มีคำสั่งลงทะเบียนถูกส่ง').toEqual([]);
        await expect(openVisitDialog(page)).toBeHidden();
        const genderError = genderItem(form).locator('.ant-form-item-explain-error');
        await markEvidence(expected(error, `แดง "${REQUIRED_TEXT}"`), alerted(genderError), expected(submitButton(form), 'ไม่ลงทะเบียน (ไม่มีคำสั่งส่ง)'));
        test.info().annotations.push({ type: `${TC(7)} แบบ 1`, description: `ข้อความแดงที่ช่องคำนำหน้า "${await error.innerText()}" · ช่องเพศ "${(await genderError.allInnerTexts()).join(' ')}" · คำสั่งเขียนหลังกด ${writes.length - before} รายการ` });
      });
      // ─── TC-007 แบบ 2
      let hn7 = '';
      await checkStep(page, `${TC(7)} แบบ 2 ขั้น 2 เลือกเพศ หญิง (ไม่แตะคำนำหน้า) — ระบบเติมคำนำหน้า "น.ส." ให้เอง`, async () => {
        await pickGender(page, form, 'หญิง');
        await expect(prefixValue(form)).toHaveText('น.ส.');
        await expect(prefixItem(form).locator('.ant-form-item-explain-error')).toHaveCount(0);
        await markEvidence(filled(genderItem(form), 'เลือก หญิง'), expected(prefixItem(form), 'ระบบเติม น.ส. เอง (ไม่ได้เลือก)'), clicked(submitButton(form)));
        await snapEvidence(page, 'ก่อนกด — ลงทะเบียน คำนำหน้าเติมเอง');
      });
      await checkStep(page, `${TC(7)} แบบ 2 ขั้น 3 กด ลงทะเบียนผู้ป่วย — ระบบลงทะเบียนได้ HN (ไม่ตรง Expected: คำนำหน้าถูกเติมแทนการแจ้งเตือน)`, async () => {
        await submitButton(form).click();
        const v = await readVisitDialog(page);
        hn7 = v.hn;
        expect(v.name).toBe(`น.ส. ${p7.firstName} ${p7.familyName}`);
        await markEvidence(expected(v.dialog.getByText(`HN ${v.hn}`, { exact: true }), 'ได้ HN'), expected(v.nameLine, 'คำนำหน้า น.ส.'));
        test.info().annotations.push({ type: `${TC(7)} แบบ 2`, description: `ระบบเติม น.ส. หลังเลือกเพศ → ลงทะเบียนได้ HN ${v.hn} (${v.name})` });
      });
      await checkStep(page, `${TC(7)} แบบ 2 ปิดหน้าต่าง เปิด Visit ER (ยกเลิก — ไม่เพิ่มรายนี้เข้าเหตุการณ์)`, async () => {
        const dialog = openVisitDialog(page);
        await markEvidence(clicked(dialog.getByRole('button', { name: 'ยกเลิก', exact: true }), 'ไม่เปิด Visit'));
        await snapEvidence(page, 'ก่อนกด — ยกเลิก เปิด Visit');
        await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
        await expect(dialog).toBeHidden();
        await expect(form).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
        test.info().annotations.push({ type: `${TC(7)} แบบ 2 หลังยกเลิก Visit`, description: `ฟอร์มผู้ป่วยใหม่ ${(await form.isVisible()) ? 'ยังเปิดอยู่' : 'ปิดแล้ว'} · รายการเหตุการณ์มี HN ${hn7}: ${(await main.getByText(`HN ${hn7}`).count()) > 0}` });
      });
      console.log(`    TC-007 แบบ 2: HN ${hn7}`);
      if (await form.isVisible()) await form.getByRole('button', { name: /ยกเลิก|Close|ปิด/ }).first().click().catch(() => page.keyboard.press('Escape'));
      await expect(form).toBeHidden();

      // ─── TC-004
      await startClip(page, 'TC-004');
      const p4 = female('Ttl2371P');
      await checkStep(page, `${TC(4)} ขั้น 1-2 เหตุการณ์จาก TC-003 → + ผู้ป่วยใหม่ → เลือกคำนำหน้า "นาง" → กรอก เลขบัตร · ชื่อ · นามสกุล · เพศ หญิง · วันเกิด (อายุ 36 ปี)`, async () => {
        await openNewPatient();
        await expect(prefixValue(form)).toHaveText('เลือก');
        await pickPrefix(page, form, 'นาง');
        await fillExceptPrefixAndGender(form, p4);
        await pickGender(page, form, 'หญิง');
        await expect(prefixValue(form)).toHaveText('นาง');
        await markEvidence(
          filled(prefixItem(form), 'เลือก นาง'),
          filled(form.getByRole('textbox', { name: '* ชื่อ', exact: true })),
          filled(form.getByRole('textbox', { name: '* นามสกุล', exact: true })),
          filled(genderItem(form)),
          filled(form.getByRole('textbox', { name: '* วัน/เดือน/ปีเกิด', exact: true })),
          clicked(submitButton(form)),
        );
        await snapEvidence(page, 'ก่อนกด — ลงทะเบียน นาง ในเหตุการณ์');
      });
      let hn4 = '';
      let dialogName = '';
      await checkStep(page, `${TC(4)} ขั้น 3 กด ลงทะเบียนผู้ป่วย — ลงทะเบียนสำเร็จได้ HN ชื่อมีคำนำหน้า "นาง"`, async () => {
        await submitButton(form).click();
        const v = await readVisitDialog(page);
        hn4 = v.hn;
        dialogName = v.name;
        expect(v.name).toBe(`นาง ${p4.firstName} ${p4.familyName}`);
        expect(v.age, 'อายุ 20 ปีขึ้นไป').toBeGreaterThanOrEqual(20);
        expect(v.age).toBeLessThan(120);
        await markEvidence(expected(v.dialog.getByText(`HN ${v.hn}`, { exact: true }), 'ได้ HN'), expected(v.nameLine, 'นาง …'), expected(v.ageLine, `อายุ ${v.age} ปี`));
      });
      await checkStep(page, `${TC(4)} เปิด Visit ER สิทธิ UC (ให้ผู้ป่วยเข้ารายการของเหตุการณ์)`, async () => {
        const visit = await confirmOpenErVisit(page, openVisitDialog(page), COVERAGE_UC);
        expect(visit.hn).toBe(hn4);
        test.info().annotations.push({ type: `${TC(4)} Visit`, description: `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en} (ทิ้งไว้ตาม R11)` });
        await markEvidence(alerted(page.getByText('สร้าง Visit สำเร็จ').first()));
        await snapEvidence(page, 'หลังกด — เปิด Visit');
        await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
      });
      let rowText = '';
      await checkStep(page, `${TC(4)} ขั้น 4 ชื่อผู้ป่วยในรายการของเหตุการณ์แสดงคำนำหน้า "นาง"`, async () => {
        const row = main.getByRole('listitem').filter({ hasText: `HN ${hn4}` }).first();
        await expect(row).toBeVisible({ timeout: 30_000 });
        rowText = (await row.innerText()).replace(/\s+/g, ' ').trim();
        await expect(row).toContainText(`นาง ${p4.firstName} ${p4.familyName}`);
        await markEvidence(expected(row, 'นาง …'));
      });
      await checkStep(page, `${TC(4)} ขั้น 4 ค้นหาผู้ป่วยด้วย HN ที่ได้ (แท็บผู้ป่วยรายเดียว) — ชื่อแสดงคำนำหน้า "นาง"`, async () => {
        await page.getByRole('tab', { name: 'ผู้ป่วยรายเดียว' }).click();
        const found = await searchByHn(page, hn4);
        expect(found.text).toBe(`${hn4} - นาง ${p4.firstName} ${p4.familyName}`);
        const rows: CompareRow[] = [
          { label: 'คำนำหน้าที่เลือก', values: ['นาง'], same: true },
          { label: 'หน้าต่างเปิด Visit', values: [dialogName], same: dialogName.startsWith('นาง ') },
          { label: 'รายการของเหตุการณ์', values: [rowText.slice(0, 80)], same: rowText.includes(`นาง ${p4.firstName}`) },
          { label: 'ผลค้นหาด้วย HN', values: [found.text], same: found.text.includes(' - นาง ') },
        ];
        await markEvidence(filled(found.search, `HN ${hn4}`), expected(found.option, 'นาง …'));
        await showCompareTable(page, `${TC(4)} คำนำหน้าของ HN ${hn4}`, ['ค่า'], rows, { width: '700px' });
      });
      await hideCompareTable(page);
      await page.keyboard.press('Escape');
      test.info().annotations.push({ type: 'ผู้ป่วยที่สร้าง', description: `TC-007 แบบ 2: HN ${hn7} (น.ส. ไม่ได้เปิด Visit) · TC-004: HN ${hn4} (นาง · Visit ER สิทธิ UC ในเหตุการณ์ ${eventName})` });
      console.log(`    TC-004: HN ${hn4}`);
    },
  );
});
