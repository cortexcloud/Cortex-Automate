import { type Browser, type Locator, type Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { erTriagePanel, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { recordMockPatient, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { careMenu, gotoVisit, options, recordMenu } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// SBH-2952 [ER][Trauma] Trauma Detail Form — Custom Form "Trauma Detail For Pher Plus" (บันทึกข้อมูล PHER+)
// ชุด EXE SBH-3506 → HPY SBH-3508 (TC-001–016) · EDG SBH-3510 (TC-017–021) — เลข Issue ใน ISSUE ด้านล่าง
// 1 เทส = 1 flow (R9) · ผู้ป่วย AUTO ใหม่ 1 ราย (R10) คัดกรองเป็น Trauma ด้วย Super_User (R17) แล้วเล่นทุก TC ในหน้าต่างบัญชี Nurse (TC ระบุ user พยาบาล ER)
// คลิป 1 ไฟล์ต่อ 1 TC (R61 — startClip ของหน้าต่าง Nurse) · TC ที่ไม่ผ่านไม่หยุดเทส (soft)
// คำตอบผู้ใช้ 31 ต.ค. 2026: TC-016 แก้ Test Step ไปดูแท็บ ER Summary (ฟอร์มนี้ไม่แสดงในแท็บ ประวัติ Custom Form) ·
//   TC-019 ครบ 6 แล้วปุ่ม + เพิ่มรายการ ยังแสดง = Fail ตาม Expected เดิม
// หน้าจอ (dev-x 31 ต.ค. 2026 · index-DJaj9lPY.js · concept er-trauma-detail-pher-plus · allowMultiplePerEncounter false):
//   ฟอร์มเป็น web component er-trauma-detail-pher-plus-v1 (shadow DOM — getByRole / CSS ทะลุได้) · dropdown = input role=combobox + listbox ตาม aria-controls ·
//   แก้ฟอร์มแล้วระบบเก็บร่างเอง (PUT /clinical-form-groups/<id>/draft) · กด บันทึก = POST …/saves · ข้อมูลที่บันทึกแสดงใน ER Summary (er-trauma-detail-pher-plus-v1-viewer)
// หลังเทส: ปิด Visit ที่การเงิน (afterEach) · SBH2952_KEEP=1 = ไม่ปิด → ปิดด้วย --grep "@SBH-2952-CLOSE" + SBH2952_VISIT=<HN>,<VN>,<EN>
// รัน (dev-x): npx playwright test --headed --grep "@SBH-2952( |$)"
// SBH Prod (ผู้ใช้อนุญาต 6 พ.ย. 2026 "สามารถสร้างคนไข้ตามที่ต้องใช้งานได้เลย" · Prod มี concept er-trauma-detail-pher-plus id 73 · ไฟล์แอป index-B30_rCX7.js):
//   SBH2952_KEEP=1 npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep "@SBH-2952( |$)" แล้วปิด Visit ด้วย @SBH-2952-CLOSE

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ISSUE: Record<number, string> = {
  1: 'SBH-3513', 2: 'SBH-3514', 3: 'SBH-3516', 4: 'SBH-3518', 5: 'SBH-3520', 6: 'SBH-3522', 7: 'SBH-3523', 8: 'SBH-3525', 9: 'SBH-3527', 10: 'SBH-3529',
  11: 'SBH-3530', 12: 'SBH-3532', 13: 'SBH-3534', 14: 'SBH-3536', 15: 'SBH-3538', 16: 'SBH-3540', 17: 'SBH-3542', 18: 'SBH-3544', 19: 'SBH-3545', 20: 'SBH-3547',
  21: 'SBH-3548',
};
const ALL = Object.keys(ISSUE).map(Number);
const tcId = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const TC = (n: number) => `${tcId(n)} (${ISSUE[n]})`;

const FORM_NAME = 'Trauma Detail For Pher Plus';
const CARE_ITEMS = ['ดูแลการหายใจ', 'ห้ามเลือด', 'Splint/Slap C-Spine', 'Splint/Slap อื่นๆ', 'IV Fluid'];
const CARE_OPTIONS = ['0 - ไม่มี', '1 - มี-เหมาะสม', '2 - มี-ไม่เหมาะสม', '3 - ไม่จำเป็น', 'N - ไม่ระบุ'];
const CARE_PLACEHOLDER = 'เลือกการดูแลระหว่างนำส่ง';
const SECTIONS = ['การดูแลระหว่างนำส่ง', 'Trauma Detail', 'การวินิจฉัยสาเหตุภายนอกและความรุนแรงของการบาดเจ็บ (ICD10 / BR / AIS)'];
/** ฟิลด์ของส่วน Trauma Detail ตาม Expected ของ TC-006 (บรรทัดละกลุ่ม) */
const TRAUMA_FIELDS: { line: string; labels: string[]; choices?: Record<string, string[]> }[] = [
  { line: 'วันเวลาเกิดเหตุ / มาถึง / ขนส่ง', labels: ['วันที่และเวลาที่เกิดเหตุ', 'วันที่และเวลาที่มาถึง รพ.', 'อุบัติเหตุจากการขนส่ง'] },
  { line: 'จุดเกิดเหตุ', labels: ['จังหวัดที่เกิดเหตุ', 'อำเภอ', 'ตำบล', 'ชื่อหมู่บ้านที่เกิดเหตุ', 'ประเภทจุดเกิดเหตุ', 'ชื่อถนน/แยก/บริเวณ'] },
  { line: 'บาดเจ็บจากการทำงาน', labels: ['บาดเจ็บจากการทำงาน'], choices: { บาดเจ็บจากการทำงาน: ['ไม่ทราบ', 'ใช่', 'ไม่ใช่'] } },
  { line: 'ผู้บาดเจ็บ / ยานพาหนะ', labels: ['ประเภทผู้บาดเจ็บ', 'ยานพาหนะผู้ป่วย', 'ทะเบียนรถ', 'ยานพาหนะคู่กรณี'] },
  { line: 'แอลกอฮอล์', labels: ['ส่งตรวจแอลกอฮอล์', 'แอลกอฮอล์ผู้บาดเจ็บ', 'ปริมาณที่พบในผู้บาดเจ็บ', 'mg%'], choices: { แอลกอฮอล์ผู้บาดเจ็บ: ['ไม่ทราบ', 'ไม่ใช้', 'ใช้'] } },
  {
    line: 'ยา / หมวก / โทรศัพท์ / ความเสี่ยง',
    labels: ['ยา/วัตถุออกฤทธิ์ต่อจิตประสาท', 'หมวกนิรภัย', 'โทรศัพท์', 'ความเสี่ยงอื่นๆ'],
    choices: { 'ยา/วัตถุออกฤทธิ์ต่อจิตประสาท': ['ไม่ทราบ', 'ไม่ใช้', 'ใช้'], หมวกนิรภัย: ['ไม่ทราบ', 'ไม่ใช้', 'ใช้'], โทรศัพท์: ['ไม่ทราบ', 'ไม่ใช้', 'ใช้'] },
  },
  { line: 'กลไก / เหตุการณ์ / ลักษณะ', labels: ['กลไกการบาดเจ็บ', 'เหตุการณ์และกิจกรรมขณะเกิดเหตุ', 'ลักษณะการบาดเจ็บ'] },
  { line: 'ประวัติสลบ + ชั่วโมง / นาที', labels: ['ประวัติสลบตั้งแต่เกิดเหตุ', 'ชั่วโมง', 'นาที'], choices: { ประวัติสลบตั้งแต่เกิดเหตุ: ['ไม่สลบ', 'สลบ', 'ไม่ทราบ'] } },
];
const DEFAULT_CHOICES: [string, string][] = [
  ['บาดเจ็บจากการทำงาน', 'ไม่ทราบ'],
  ['แอลกอฮอล์ผู้บาดเจ็บ', 'ไม่ทราบ'],
  ['ยา/วัตถุออกฤทธิ์ต่อจิตประสาท', 'ไม่ทราบ'],
  ['หมวกนิรภัย', 'ไม่ทราบ'],
  ['โทรศัพท์', 'ไม่ทราบ'],
  ['ประวัติสลบตั้งแต่เกิดเหตุ', 'ไม่สลบ'],
];
const LIMIT_TEXT = /สูงสุด 6 รายการตามโครงสร้าง/;
const SAVED_BANNER = 'บันทึกข้อมูลทางคลินิกและเชื่อมโยงกลุ่มแล้ว';
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** locator ของฟอร์ม Trauma Detail For Pher Plus (ใน shadow DOM) */
function traumaForm(page: Page) {
  const root = page.locator('er-trauma-detail-pher-plus-v1').first();
  const group = (name: string) => root.getByRole('radiogroup', { name, exact: true });
  return {
    root,
    transport: root.locator('details[data-card="transport"]'),
    trauma: root.locator('details[data-card="trauma"]'),
    diagnosis: root.locator('details[data-card="diagnosis"]'),
    summary: (card: 'transport' | 'trauma' | 'diagnosis') => root.locator(`details[data-card="${card}"] > summary`),
    combo: (name: string) => root.getByRole('combobox', { name, exact: true }),
    detail: (name: string) => root.getByRole('textbox', { name: `${name} รายละเอียด`, exact: true }),
    text: (name: string) => root.getByRole('textbox', { name, exact: true }),
    group,
    choice: (name: string, label: string) => group(name).locator('label').filter({ hasText: new RegExp(`^\\s*${esc(label)}\\s*$`) }).first(),
    checkedLabel: (name: string) => group(name).locator('label').filter({ has: page.locator('input:checked') }).first(),
    path: (suffix: string) => root.locator(`[data-path$="${suffix}"]`).first(),
    hours: root.locator('[data-path$="loss_of_consciousness_hours"]').first(),
    minutes: root.locator('[data-path$="loss_of_consciousness_minutes"]').first(),
    badge: root.locator('.pher__badge').first(),
    add: root.getByRole('button', { name: /เพิ่มรายการ/ }),
    rows: root.locator('.pher__injury'),
    rowNumbers: root.locator('.pher__row-number'),
    remove: (n: number) => root.getByRole('button', { name: `ลบรายการ ${n}`, exact: true }),
    limit: root.getByText(LIMIT_TEXT),
  };
}
type TraumaForm = ReturnType<typeof traumaForm>;

/** รายการตัวเลือกของ combobox ในฟอร์ม (listbox ตาม aria-controls) */
async function optionsOf(f: TraumaForm, combo: Locator): Promise<Locator> {
  const id = await combo.getAttribute('aria-controls');
  return f.root.locator(`[id="${id}"] [role=option]`);
}

/** เปิด combobox (พิมพ์ค้นถ้าใส่) แล้วคืนรายการตัวเลือก — ช่อง ICD ต้องพิมพ์ก่อนรายการถึงขึ้น */
async function openCombo(page: Page, f: TraumaForm, combo: Locator, query?: string): Promise<Locator> {
  await combo.scrollIntoViewIfNeeded();
  await combo.click();
  if (query !== undefined) {
    const searched = query ? page.waitForResponse((r) => /diagnosis-search/.test(r.url()) && r.url().includes(encodeURIComponent(query)), { timeout: 20_000 }).catch(() => undefined) : undefined;
    await combo.fill(query);
    await searched;
  }
  await page.waitForTimeout(800);
  return optionsOf(f, combo);
}

/** เลือกตัวเลือกที่ขึ้นต้นด้วย `prefix` → คืนค่าที่แสดงในช่อง */
async function choose(page: Page, f: TraumaForm, combo: Locator, prefix: string, query?: string): Promise<string> {
  const list = await openCombo(page, f, combo, query);
  const option = list.filter({ hasText: new RegExp(`^\\s*${esc(prefix)}`) }).first();
  await expect(option, `ต้องมีตัวเลือก "${prefix}"`).toBeVisible({ timeout: 20_000 });
  await option.click();
  await page.waitForTimeout(500);
  return combo.inputValue();
}

/** ค่าในแถว ICD10 / BR / AIS ทั้งหมด */
async function readRows(f: TraumaForm): Promise<{ no: string; icd: string; br: string; ais: string }[]> {
  const numbers = (await f.rowNumbers.allInnerTexts()).map(norm);
  const rows = [];
  for (const [i, no] of numbers.entries()) {
    const n = i + 1;
    rows.push({ no, icd: await f.combo(`ICD10 ${n}`).inputValue(), br: await f.combo(`BR ${n}`).inputValue(), ais: await f.combo(`AIS ${n}`).inputValue() });
  }
  return rows;
}

/** ลบแถวท้ายจนเหลือ `count` แถว (เตรียมสถานะก่อนเริ่มคลิปของ TC) */
async function keepRows(page: Page, f: TraumaForm, count: number) {
  for (let n = await f.rows.count(); n > count; n--) {
    await f.remove(n).click();
    await page.waitForTimeout(400);
  }
  await expect(f.rows).toHaveCount(count);
}

/** หน้าต่างของ Nurse ที่หน้าผู้ป่วย — คลิปเริ่มหลังหน้าโหลดเสร็จ */
async function openNurseWindow(browser: Browser, visit: ErVisit): Promise<Page> {
  const context = await browser.newContext({
    storageState: authFile('Nurse'),
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1920, height: 1080 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  });
  await cacheAppAssets(context);
  const nurse = await context.newPage();
  await gotoVisit(nurse, visit);
  await nurse.waitForTimeout(3_000);
  await trackVideo(nurse, 'Nurse');
  return nurse;
}

test.describe('SBH-2952 Trauma Detail Form', () => {
  test.describe.configure({ timeout: 2_400_000 });

  let opened: Map<string, ErVisit>;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });

  test.afterEach(async ({ page }) => {
    if (process.env.SBH2952_KEEP) {
      for (const visit of opened.values()) console.log(`    หลังเทส: เก็บ Visit ไว้ (SBH2952_KEEP) — SBH2952_VISIT=${visit.hn},${visit.vn},${visit.en}`);
      return;
    }
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
    'TC-001…021: พยาบาลเปิด กรอก บันทึก ฟอร์ม Trauma Detail For Pher Plus + ดูผลใน ER Summary (Nurse)',
    { tag: ['@SBH-2952', ...ALL.map((n) => `@${ISSUE[n]}`)], annotation: [linear('SBH-2952'), ...ALL.map((n) => linear(ISSUE[n]))] },
    async ({ page, browser }) => {
      // ---------- เตรียมข้อมูล: ผู้ป่วย AUTO ใหม่ + Visit ER + คัดกรอง Trauma (Super_User) ----------
      const setup = makeRunner(page);
      let visit: ErVisit | undefined;
      // ทำต่อกับผู้ป่วยเดิม (SBH Prod 6 พ.ย.: TC-015 บันทึกได้ 503 → รันซ้ำเฉพาะ TC-015 / 016): SBH2952_VISIT=<HN>,<VN>,<EN> + SBH2952_ONLY=015,016
      const resume = process.env.SBH2952_ONLY && process.env.SBH2952_VISIT ? process.env.SBH2952_VISIT.split(',') : undefined;
      if (resume) {
        visit = { hn: resume[0], vn: resume[1], en: resume[2] } as ErVisit;
        setup.note('ผู้ป่วย (ทำต่อ)', `HN ${visit.hn} · ${visit.vn} · ${visit.en} — ไม่สร้างผู้ป่วยใหม่`);
      } else await setup.soft('เตรียมข้อมูล: ผู้ป่วย AUTO ใหม่ + เปิด Visit ER + คัดกรอง Trauma', async () => {
        await gotoErDashboard(page);
        const patient = newTestPatient('Trauma2952');
        const v = await registerAndOpenErVisit(page, patient);
        visit = v;
        recordMockPatient('SBH-2952', patient, v, 'SBH-2952 · ผู้ป่วย AUTO · Visit ER + คัดกรอง Trauma ESI 3 + ฟอร์ม Trauma Detail For Pher Plus (Nurse)');
        setup.note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${v.hn} · ${v.vn} · ${v.en}`);
        const panel = erTriagePanel(page);
        await expect(panel.getByRole('combobox', { name: 'Eye Opening (E)' }).first()).toBeVisible({ timeout: 90_000 });
        await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
        const emergency = panel.getByRole('radiogroup', { name: 'ประเภทฉุกเฉิน' }).first();
        await emergency.getByText('Trauma', { exact: true }).click();
        await expect(emergency.getByRole('radio', { name: 'Trauma', exact: true })).toBeChecked();
        const levels = panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }).first();
        await levels.scrollIntoViewIfNeeded();
        await levels.getByText('3', { exact: true }).click();
        await markEvidence(filled(emergency, 'ประเภทฉุกเฉิน = Trauma'), filled(levels, 'ระดับ 3'));
        await saveErTriageForm(page, 'คัดกรอง Trauma');
        await page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true }).first().waitFor({ state: 'visible', timeout: 30_000 });
      });
      expect(visit, 'เตรียมผู้ป่วยไม่สำเร็จ — รัน TC ไม่ได้').toBeTruthy();
      if (!visit) return;

      const nurse = await openNurseWindow(browser, visit);
      const runner = makeRunner(nurse);
      const { note, finish } = runner;
      // SBH2952_ONLY=015,016 → เล่นเฉพาะ TC ที่ระบุ (TC-001 / 002 เล่นเสมอเพื่อเปิดฟอร์ม)
      const only = process.env.SBH2952_ONLY?.split(',').map((s) => s.trim().padStart(3, '0'));
      const soft = (title: string, body: () => Promise<void>) =>
        only && !/^TC-00[12] /.test(title) && !only.some((o) => title.startsWith(`TC-${o} `)) ? Promise.resolve(false) : runner.soft(title, body);
      note('ผู้ป่วยที่ใช้', `HN ${visit.hn} · ${visit.vn} · ${visit.en} (คัดกรอง Trauma) · หน้าต่าง TC = บัญชี Nurse`);
      const main = nurse.getByRole('main');
      const f = traumaForm(nurse);
      const compare = (n: number, rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'right') => showCompareTable(nurse, `${ISSUE[n]} ${tcId(n)}`, ['Expected', 'หน้าจอ'], rows, { side });
      const bad = (rows: CompareRow[]) => rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (Expected ${r.values[0]})`);

      try {
        // ---------- TC-001 ช่อง เลือกฟอร์ม มีตัวเลือก ----------
        await startClip(nurse, tcId(1));
        const formSelect = main.getByText('เลือกฟอร์ม', { exact: true }).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
        let formOption: Locator | undefined;
        await soft(`${TC(1)} ขั้น 3–4 สร้างฟอร์ม → ช่อง เลือกฟอร์ม มี ${FORM_NAME}`, async () => {
          await careMenu(nurse, 'สร้างฟอร์ม', main.getByText('เลือกฟอร์ม', { exact: true }).first());
          await markEvidence(clicked(formSelect, 'เลือกฟอร์ม'));
          await snapEvidence(nurse, 'ก่อนกด — ช่อง เลือกฟอร์ม');
          await formSelect.click();
          await expect(options(nurse).first()).toBeVisible();
          // รายการเป็น virtual list (Nurse ~70 ฟอร์ม) — เลื่อนลงทีละครึ่งกรอบจนเจอ หรือจนสุดรายการ
          const option = options(nurse).filter({ hasText: new RegExp(`^${esc(FORM_NAME)}$`) });
          const holder = nurse.locator('.ant-select-dropdown:visible .rc-virtual-list-holder').first();
          // dev-x 31 ต.ค.: ~10 วินาทีแรกรายการมีแค่ 5 ฟอร์ม (เลื่อนไม่ได้) แล้วค่อยโหลดครบ ~67 รายการ → รอให้รายการยาวก่อน
          await expect.poll(() => holder.evaluate((el) => el.scrollHeight - el.clientHeight), { message: 'รายการฟอร์มต้องโหลดครบ', timeout: 45_000 }).toBeGreaterThan(400);
          let last = -1;
          for (let i = 0; i < 80 && !(await option.first().isVisible().catch(() => false)); i++) {
            const top = await holder.evaluate((el) => {
              el.scrollTop += Math.max(60, el.clientHeight / 2);
              return el.scrollTop;
            });
            await nurse.waitForTimeout(350);
            if (top === last && i > 3) {
              await nurse.waitForTimeout(1_500); // อาจกำลังโหลดหน้าถัดไป
              if ((await holder.evaluate((el) => el.scrollTop)) === top && !(await option.first().isVisible().catch(() => false))) break;
            }
            last = top;
          }
          await option.first().scrollIntoViewIfNeeded().catch(() => undefined);
          await expect(option.first(), `ช่อง เลือกฟอร์ม ต้องมีตัวเลือก ${FORM_NAME}`).toBeVisible();
          formOption = option.first();
          await markEvidence(expected(formOption, `มีตัวเลือก ${FORM_NAME}`));
        });

        // ---------- TC-002 เลือกแล้วแสดง 3 ส่วน ----------
        await startClip(nurse, tcId(2));
        const formOpened = await soft(`${TC(2)} ขั้น 3 เลือก ${FORM_NAME} → แสดงฟอร์ม 3 ส่วน`, async () => {
          expect(formOption, 'TC-001 หาตัวเลือกไม่เจอ').toBeTruthy();
          await clearEvidenceMarks(nurse);
          await markEvidence(clicked(formOption!, FORM_NAME));
          await snapEvidence(nurse, `ก่อนกด — เลือก ${FORM_NAME}`);
          await formOption!.click();
          await expect(f.combo('ดูแลการหายใจ'), 'ฟอร์มต้องโหลดขึ้น').toBeVisible({ timeout: 60_000 });
          const titles = [norm(await f.summary('transport').innerText()), norm(await f.summary('trauma').innerText()), norm(await f.summary('diagnosis').locator('span').first().innerText())];
          const rows: CompareRow[] = SECTIONS.map((s, i) => ({ label: `ส่วนที่ ${i + 1}`, values: [s, titles[i] ?? '(ไม่มี)'], same: titles[i] === s }));
          await f.summary('transport').scrollIntoViewIfNeeded();
          await markEvidence(expected(f.summary('transport'), SECTIONS[0]), expected(f.summary('trauma'), SECTIONS[1]));
          await snapEvidence(nurse, 'หลังกด — ส่วนที่ 1–2');
          await f.diagnosis.scrollIntoViewIfNeeded();
          await compare(2, rows, 'bottom');
          await markEvidence(expected(f.summary('diagnosis').locator('span').first(), 'ส่วนที่ 3 ICD10 / BR / AIS'));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);
        if (!formOpened && !(await f.combo('ดูแลการหายใจ').isVisible().catch(() => false))) throw new Error('เปิดฟอร์มไม่ได้ — TC-003…021 ตรวจไม่ได้');

        // ---------- TC-003 หัวข้อในส่วน การดูแลระหว่างนำส่ง ----------
        await startClip(nurse, tcId(3));
        await soft(`${TC(3)} ขั้น 3 การดูแลระหว่างนำส่ง: 5 หัวข้อ · Dropdown + ระบุรายละเอียด`, async () => {
          await f.summary('transport').evaluate((el) => el.scrollIntoView({ block: 'start' }));
          const labels = (await f.transport.locator('.pher__care-label').allInnerTexts()).map(norm);
          const rows: CompareRow[] = [];
          for (const [i, name] of CARE_ITEMS.entries()) {
            const hasCombo = await f.combo(name).isVisible();
            const hasDetail = await f.detail(name).isVisible();
            const placeholder = await f.detail(name).getAttribute('placeholder');
            rows.push({ label: `หัวข้อ ${i + 1}`, values: [`${name} · Dropdown + ระบุรายละเอียด`, `${labels[i] ?? '(ไม่มี)'} · ${hasCombo ? 'Dropdown' : 'ไม่มี Dropdown'} + ${hasDetail ? placeholder : 'ไม่มีช่องรายละเอียด'}`], same: labels[i] === name && hasCombo && hasDetail && placeholder === 'ระบุรายละเอียด' });
          }
          rows.push({ label: 'จำนวนหัวข้อ', values: ['5', String(labels.length)], same: labels.length === 5 });
          await compare(3, rows, 'bottom');
          await markEvidence(expected(f.transport, '5 หัวข้อ · Dropdown + ระบุรายละเอียด'));
          await holdForClip(nurse, 2_000);
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-005 ค่าเริ่มต้นว่าง (ตรวจก่อนเปิด dropdown ของ TC-004) ----------
        // ---------- TC-004 ตัวเลือก dropdown ----------
        await startClip(nurse, tcId(4));
        await soft(`${TC(4)} ขั้น 3–4 Dropdown ทั้ง 5 หัวข้อมีตัวเลือก 0 / 1 / 2 / 3 / N`, async () => {
          const rows: CompareRow[] = [];
          for (const name of CARE_ITEMS) {
            const list = await openCombo(nurse, f, f.combo(name));
            await expect(list.first()).toBeVisible();
            const got = (await list.allInnerTexts()).map(norm);
            rows.push({ label: name, values: [CARE_OPTIONS.join(' · '), got.join(' · ')], same: got.join('|') === CARE_OPTIONS.join('|') });
            await nurse.keyboard.press('Escape');
            await nurse.waitForTimeout(300);
          }
          // ภาพ: เปิด dropdown หัวข้อแรกค้างไว้ (ส่วนการดูแลระหว่างนำส่งชิดบน ให้พ้นตารางเทียบด้านล่าง)
          await f.summary('transport').evaluate((el) => el.scrollIntoView({ block: 'start' }));
          const list = await openCombo(nurse, f, f.combo(CARE_ITEMS[0]));
          await compare(4, rows, 'bottom');
          await markEvidence(clicked(f.combo(CARE_ITEMS[0]), CARE_ITEMS[0]), expected(list.first().locator('xpath=..'), '5 ตัวเลือก 0 / 1 / 2 / 3 / N'));
          expect(bad(rows)).toEqual([]);
        });
        await nurse.keyboard.press('Escape');
        await hideCompareTable(nurse);
        await clearEvidenceMarks(nurse);

        await startClip(nurse, tcId(5));
        await soft(`${TC(5)} ขั้น 3 ค่าเริ่มต้น Dropdown ทั้ง 5 หัวข้อว่าง`, async () => {
          await f.summary('transport').evaluate((el) => el.scrollIntoView({ block: 'start' }));
          const rows: CompareRow[] = [];
          for (const name of CARE_ITEMS) {
            const value = await f.combo(name).inputValue();
            const placeholder = await f.combo(name).getAttribute('placeholder');
            rows.push({ label: name, values: [`ว่าง (${CARE_PLACEHOLDER})`, value ? value : `ว่าง (${placeholder})`], same: value === '' && placeholder === CARE_PLACEHOLDER });
          }
          await compare(5, rows, 'bottom');
          // กรอบเดียวรอบทั้งส่วน — ป้ายไม่ทับข้อความ placeholder ในช่อง (ผลตรวจภาพรอบ 3)
          await markEvidence(expected(f.transport, 'Dropdown ทั้ง 5 ว่าง (เลือกการดูแลระหว่างนำส่ง)'));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-006 ฟิลด์ในส่วน Trauma Detail ----------
        await startClip(nurse, tcId(6));
        await soft(`${TC(6)} ขั้น 3 ส่วน Trauma Detail มีฟิลด์ครบ`, async () => {
          const text = norm(await f.trauma.innerText());
          const rows: CompareRow[] = [];
          for (const g of TRAUMA_FIELDS) {
            const missing = g.labels.filter((l) => !text.includes(l));
            const choiceMiss: string[] = [];
            for (const [group, labels] of Object.entries(g.choices ?? {})) {
              const got = (await f.group(group).locator('label').allInnerTexts()).map(norm);
              if (got.join('|') !== labels.join('|')) choiceMiss.push(`${group}: ${got.join(' / ') || '(ไม่มีปุ่ม)'}`);
            }
            const expectText = g.labels.join(' · ') + (g.choices ? ` (${Object.values(g.choices)[0].join(' / ')})` : '');
            rows.push({ label: g.line, values: [expectText, missing.length || choiceMiss.length ? `ขาด: ${[...missing, ...choiceMiss].join(' · ')}` : 'ครบ'], same: !missing.length && !choiceMiss.length });
          }
          await f.summary('trauma').scrollIntoViewIfNeeded();
          await f.summary('trauma').evaluate((el) => el.scrollIntoView({ block: 'start' }));
          // SBH Prod 6 พ.ย.: ภาพเดิมตารางเทียบ bottom บังแถวล่าง (หน้าเลื่อนสุดแล้ว) + ป้ายทับชื่อช่อง (ฟอร์มอยู่ใน shadow DOM ตัววางป้ายมองไม่เห็นชื่อช่อง)
          // → ภาพทั้งส่วนก่อนขึ้นตาราง: ป้ายเดียวที่หัวส่วน · ปุ่มประวัติสลบ / ชั่วโมง / นาที เป็นกรอบไม่มีป้าย
          await markEvidence(expected(f.summary('trauma'), 'ส่วน Trauma Detail มีฟิลด์ครบ 8 กลุ่ม (ดูตารางเทียบภาพถัดไป)'), f.group('ประวัติสลบตั้งแต่เกิดเหตุ'), f.hours, f.minutes);
          await snapEvidence(nurse, 'ส่วน Trauma Detail — ทั้งส่วน');
          await clearEvidenceMarks(nurse);
          await compare(6, rows, 'bottom');
          await markEvidence(expected(f.summary('trauma'), 'ฟิลด์ครบ 8 กลุ่มตามตารางเทียบ'));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-007 ค่าเริ่มต้นของปุ่มเลือก ----------
        await startClip(nurse, tcId(7));
        await soft(`${TC(7)} ขั้น 3 ค่าเริ่มต้นปุ่มเลือก = ไม่ทราบ · ประวัติสลบ = ไม่สลบ`, async () => {
          const rows: CompareRow[] = [];
          for (const [group, want] of DEFAULT_CHOICES) {
            const got = norm(await f.checkedLabel(group).innerText().catch(() => '(ไม่ได้เลือก)'));
            rows.push({ label: group, values: [want, got], same: got === want });
          }
          await f.summary('trauma').evaluate((el) => el.scrollIntoView({ block: 'start' }));
          await compare(7, rows, 'bottom');
          // ป้ายต่อปุ่มทับชื่อช่อง (shadow DOM) → ป้ายเดียวที่หัวส่วน + กรอบไม่มีป้ายรอบปุ่มที่ถูกเลือก
          await markEvidence(expected(f.summary('trauma'), 'ค่าเริ่มต้น ไม่ทราบ ×5 · ประวัติสลบ = ไม่สลบ (กรอบในฟอร์ม)'), ...DEFAULT_CHOICES.map(([group]) => f.checkedLabel(group)));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-008 สลบ → กรอกชั่วโมง / นาที ----------
        await startClip(nurse, tcId(8));
        await soft(`${TC(8)} ขั้น 3–4 ประวัติสลบ = สลบ → กรอก ชั่วโมง 1 · นาที 30`, async () => {
          const loc = f.choice('ประวัติสลบตั้งแต่เกิดเหตุ', 'สลบ');
          await loc.scrollIntoViewIfNeeded();
          await markEvidence(clicked(loc, 'สลบ'), expected(f.hours, 'ก่อนกด: กรอกไม่ได้'), expected(f.minutes, 'ก่อนกด: กรอกไม่ได้'));
          await snapEvidence(nurse, 'ก่อนกด — สลบ');
          await clearEvidenceMarks(nurse);
          await loc.click();
          await expect(f.hours, 'เลือก สลบ แล้วช่องชั่วโมงต้องกรอกได้').toBeEnabled();
          await expect(f.minutes, 'เลือก สลบ แล้วช่องนาทีต้องกรอกได้').toBeEnabled();
          await f.hours.fill('1');
          await f.minutes.fill('30');
          await expect(f.hours).toHaveValue('1');
          await expect(f.minutes).toHaveValue('30');
          await markEvidence(filled(loc, 'สลบ'), expected(f.hours, 'ชั่วโมง 1'), expected(f.minutes, 'นาที 30'));
        });

        // ---------- TC-017 สลบ → ไม่สลบ ----------
        await startClip(nurse, tcId(17));
        await soft(`${TC(17)} ขั้น 3–4 สลบ (1 ชม. 30 นาที) → ไม่สลบ: ช่องถูกล้างและกรอกไม่ได้`, async () => {
          const on = f.choice('ประวัติสลบตั้งแต่เกิดเหตุ', 'สลบ');
          const off = f.choice('ประวัติสลบตั้งแต่เกิดเหตุ', 'ไม่สลบ');
          await on.scrollIntoViewIfNeeded();
          await on.click();
          await f.hours.fill('1');
          await f.minutes.fill('30');
          await markEvidence(filled(on, 'สลบ'), filled(f.hours, '1'), filled(f.minutes, '30'), clicked(off, 'ไม่สลบ'));
          await snapEvidence(nurse, 'ก่อนกด — ไม่สลบ');
          await clearEvidenceMarks(nurse);
          await off.click();
          await nurse.waitForTimeout(500);
          const rows: CompareRow[] = [
            { label: 'ชั่วโมง', values: ['ว่าง · กรอกไม่ได้', `${(await f.hours.inputValue()) || 'ว่าง'} · ${(await f.hours.isDisabled()) ? 'กรอกไม่ได้' : 'กรอกได้'}`], same: (await f.hours.inputValue()) === '' && (await f.hours.isDisabled()) },
            { label: 'นาที', values: ['ว่าง · กรอกไม่ได้', `${(await f.minutes.inputValue()) || 'ว่าง'} · ${(await f.minutes.isDisabled()) ? 'กรอกไม่ได้' : 'กรอกได้'}`], same: (await f.minutes.inputValue()) === '' && (await f.minutes.isDisabled()) },
          ];
          await compare(17, rows, 'bottom');
          await markEvidence(filled(off, 'ไม่สลบ'), expected(f.hours, 'ว่าง · กรอกไม่ได้'), expected(f.minutes, 'ว่าง · กรอกไม่ได้'));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-009 ส่วน ICD10 / BR / AIS ----------
        await startClip(nurse, tcId(9));
        await soft(`${TC(9)} ขั้น 3 ส่วน ICD10 / BR / AIS: สาเหตุ · แถว #1 · ตัวนับ 1 / 6 · ปุ่มเพิ่ม`, async () => {
          await f.summary('diagnosis').evaluate((el) => el.scrollIntoView({ block: 'start' }));
          const diagText = norm(await f.diagnosis.innerText());
          const rows: CompareRow[] = [
            { label: 'ICD10 สาเหตุ', values: ['ICD10 สาเหตุ (V, W, X, Y)', (await f.combo('ICD10 สาเหตุ (V, W, X, Y)').isVisible()) ? 'มีช่อง ICD10 สาเหตุ (V, W, X, Y)' : 'ไม่มี'], same: await f.combo('ICD10 สาเหตุ (V, W, X, Y)').isVisible() },
            { label: 'แถว #1', values: ['#1 · ICD10 1 · BR 1 (Body Region) · AIS 1 (ความรุนแรง)', `${norm(await f.rowNumbers.first().innerText())} · ${['ICD10 1', 'BR 1 (Body Region)', 'AIS 1 (ความรุนแรง)'].filter((t) => diagText.includes(t)).join(' · ')}`], same: (await f.rows.count()) === 1 && ['ICD10 1', 'BR 1 (Body Region)', 'AIS 1 (ความรุนแรง)'].every((t) => diagText.includes(t)) },
            { label: 'ตัวนับ', values: ['รายการวินิจฉัย 1 / 6', norm(await f.badge.innerText())], same: norm(await f.badge.innerText()) === 'รายการวินิจฉัย 1 / 6' },
            { label: 'ปุ่มเพิ่ม', values: ['+ เพิ่มรายการ (ICD10, BR, AIS)', (await f.add.isVisible()) ? norm(await f.add.innerText()) : '(ไม่มี)'], same: norm(await f.add.innerText().catch(() => '')) === '+ เพิ่มรายการ (ICD10, BR, AIS)' },
          ];
          await compare(9, rows, 'right');
          await markEvidence(expected(f.combo('ICD10 สาเหตุ (V, W, X, Y)'), 'ICD10 สาเหตุ'), expected(f.rows.first(), 'แถว #1 ICD10 / BR / AIS'), expected(f.badge, '1 / 6'), expected(f.add, 'ปุ่มเพิ่มรายการ'));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-010 ICD10 สาเหตุ เฉพาะ V W X Y ----------
        await startClip(nurse, tcId(10));
        await soft(`${TC(10)} ขั้น 3–4 ICD10 สาเหตุ: ทุกรายการเป็น V W X Y · เลือก V23.4`, async () => {
          const cause = f.combo('ICD10 สาเหตุ (V, W, X, Y)');
          const rows: CompareRow[] = [];
          for (const query of ['V23.4', 'W01', 'X40', 'Y04', 'S22', 'fracture']) {
            const list = await openCombo(nurse, f, cause, query);
            const got = (await list.allInnerTexts()).map(norm);
            const wrong = got.filter((t) => !/^[VWXY]/.test(t));
            const allowed = /^[VWXY]/i.test(query);
            rows.push({
              label: `ค้น "${query}"`,
              values: [allowed ? 'พบ · ขึ้นต้น V / W / X / Y ทุกรายการ' : 'ไม่มีรหัสนอกหมวด V W X Y', `${got.length} รายการ${got.length ? ` · ${got[0].slice(0, 26)}…` : ''}${wrong.length ? ` · นอกหมวด ${wrong.length}` : ''}`],
              same: wrong.length === 0 && (allowed ? got.length > 0 : true),
            });
            if (query === 'V23.4') {
              await markEvidence(filled(cause, 'V23.4'), expected(list.first().locator('xpath=..'), 'รายการขึ้นต้น V'));
              await snapEvidence(nurse, 'ค้น V23.4 — รายการ');
              await clearEvidenceMarks(nurse);
            }
            if (query === 'S22') {
              const none = f.root.getByText(/ไม่พบ/).filter({ visible: true }).first();
              const hasNone = await none.isVisible().catch(() => false);
              await markEvidence(filled(cause, 'S22 (รหัสการบาดเจ็บ)'), ...(hasNone ? [expected(none, 'ไม่มีรหัสหมวด S')] : []));
              await snapEvidence(nurse, 'ค้น S22 — ไม่มีรายการ');
              await clearEvidenceMarks(nurse);
            }
            await nurse.keyboard.press('Escape');
          }
          const value = await choose(nurse, f, cause, 'V234 - ', 'V23.4');
          rows.push({ label: 'เลือก V23.4', values: ['V23.4 + ชื่อรหัส', value], same: /^V234 - Motorcycle rider/.test(value) });
          note(`${TC(10)} รหัสที่แสดง`, `${value} (ระบบแสดงรหัสแบบไม่มีจุด)`);
          await compare(10, rows, 'right');
          await markEvidence(expected(cause, 'V234 - Motorcycle rider …'));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-011 / TC-012 / TC-018 BR auto-map ----------
        const brCases: [number, string, string, string, string][] = [
          [11, 'S22.3', 'S223 - ', 'Fracture of rib', '3 - Thorax (ทรวงอก)'],
          [12, 'T00.9', 'T009 - ', 'Multiple superficial injuries, unspecified', '6 - External & body surface (ผิวหนังภายนอกและพื้นผิวกาย)'],
          [18, 'T07', 'T07 - ', 'Unspecified multiple injuries', '9 - Unknown (ไม่ทราบ / ระบุไม่ได้)'],
        ];
        for (const [n, code, prefix, name, br] of brCases) {
          await startClip(nurse, tcId(n));
          await soft(`${TC(n)} ขั้น 3–4 ICD10 1 = ${code} → BR 1 = ${br.split(' (')[0]}`, async () => {
            const icd = f.combo('ICD10 1');
            const list = await openCombo(nurse, f, icd, code);
            const option = list.filter({ hasText: new RegExp(`^\\s*${esc(prefix)}`) }).first();
            await expect(option).toBeVisible({ timeout: 20_000 });
            await markEvidence(filled(icd, code), clicked(option, `${prefix}${name}`));
            await snapEvidence(nurse, `ก่อนกด — เลือก ${code}`);
            await clearEvidenceMarks(nurse);
            await option.click();
            await nurse.waitForTimeout(800);
            const rows: CompareRow[] = [
              { label: 'ICD10 1', values: [`${code} (${name})`, await icd.inputValue()], same: (await icd.inputValue()).startsWith(prefix) },
              { label: 'BR 1', values: [br, (await f.combo('BR 1').inputValue()) || '(ว่าง)'], same: (await f.combo('BR 1').inputValue()) === br },
            ];
            await compare(n, rows, 'right');
            await markEvidence(filled(icd, code), expected(f.combo('BR 1'), br.split(' (')[0]));
            expect(bad(rows)).toEqual([]);
          });
          await hideCompareTable(nurse);
        }

        // ---------- TC-013 เพิ่มรายการ ----------
        await keepRows(nurse, f, 1);
        await startClip(nurse, tcId(13));
        await soft(`${TC(13)} ขั้น 3 กด + เพิ่มรายการ 1 ครั้ง → แถว #2 · ตัวนับ 2 / 6`, async () => {
          await f.add.scrollIntoViewIfNeeded();
          await markEvidence(clicked(f.add, '+ เพิ่มรายการ'), expected(f.badge, 'ก่อนกด 1 / 6'));
          await snapEvidence(nurse, 'ก่อนกด — เพิ่มรายการ');
          await clearEvidenceMarks(nurse);
          await f.add.click();
          await nurse.waitForTimeout(600);
          const numbers = (await f.rowNumbers.allInnerTexts()).map(norm);
          const rows: CompareRow[] = [
            { label: 'แถว', values: ['#1 · #2', numbers.join(' · ')], same: numbers.join('|') === '#1|#2' },
            { label: 'ช่องแถว #2', values: ['ICD10 2 · BR 2 · AIS 2', ['ICD10 2', 'BR 2', 'AIS 2'].join(' · ')], same: (await f.combo('ICD10 2').isVisible()) && (await f.combo('BR 2').isVisible()) && (await f.combo('AIS 2').isVisible()) },
            { label: 'ตัวนับ', values: ['รายการวินิจฉัย 2 / 6', norm(await f.badge.innerText())], same: norm(await f.badge.innerText()) === 'รายการวินิจฉัย 2 / 6' },
          ];
          await compare(13, rows, 'right');
          await markEvidence(expected(f.rows.nth(1), 'แถว #2 ICD10 2 · BR 2 · AIS 2'), expected(f.badge, '2 / 6'));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-014 ลบแถวกลาง ----------
        await keepRows(nurse, f, 1);
        await startClip(nurse, tcId(14));
        await soft(`${TC(14)} ขั้น 3–4 3 แถว · #3 = S06.0 → ลบ #2 → เรียงเลขใหม่ · 2 / 6`, async () => {
          await f.add.scrollIntoViewIfNeeded();
          await f.add.click();
          await f.add.click();
          await nurse.waitForTimeout(500);
          await expect(f.rows).toHaveCount(3);
          await choose(nurse, f, f.combo('ICD10 3'), 'S060 - ', 'S06.0');
          await markEvidence(filled(f.combo('ICD10 3'), 'แถว #3 = S06.0'), clicked(f.remove(2), 'ลบแถว #2'));
          await snapEvidence(nurse, 'ก่อนกด — ลบแถว #2');
          await clearEvidenceMarks(nurse);
          await f.remove(2).click();
          await nurse.waitForTimeout(600);
          const rowsNow = await readRows(f);
          note(`${TC(14)} แถวหลังลบ`, rowsNow.map((r) => `${r.no} ${r.icd || '-'}`).join(' · '));
          const rows: CompareRow[] = [
            { label: 'แถว', values: ['#1 · #2', rowsNow.map((r) => r.no).join(' · ')], same: rowsNow.map((r) => r.no).join('|') === '#1|#2' },
            { label: 'แถว S06.0', values: ['เลื่อนขึ้นเป็น #2', rowsNow.find((r) => r.icd.startsWith('S060'))?.no ?? '(ไม่พบ)'], same: rowsNow[1]?.icd.startsWith('S060') ?? false },
            { label: 'ตัวนับ', values: ['รายการวินิจฉัย 2 / 6', norm(await f.badge.innerText())], same: norm(await f.badge.innerText()) === 'รายการวินิจฉัย 2 / 6' },
          ];
          await compare(14, rows, 'right');
          await markEvidence(expected(f.rows.nth(1), '#2 = S06.0 (เดิม #3)'), expected(f.badge, '2 / 6'));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-019 ครบ 6 รายการ ----------
        await keepRows(nurse, f, 1);
        await startClip(nurse, tcId(19));
        await soft(`${TC(19)} ขั้น 3 กด + เพิ่มรายการ 5 ครั้ง → #1–#6 · 6 / 6 · ไม่แสดงปุ่ม`, async () => {
          await f.add.scrollIntoViewIfNeeded();
          for (let i = 0; i < 5; i++) {
            await f.add.click();
            await nurse.waitForTimeout(400);
          }
          await f.add.scrollIntoViewIfNeeded();
          const numbers = (await f.rowNumbers.allInnerTexts()).map(norm);
          const addShown = await f.add.isVisible();
          note(`${TC(19)} ข้อความเพดาน`, (await f.limit.isVisible()) ? `ขึ้นตั้งแต่ครบ 6 (ยังไม่กดครั้งที่ 7): ${norm(await f.limit.innerText())}` : 'ยังไม่ขึ้นตอนครบ 6');
          const rows: CompareRow[] = [
            { label: 'แถว', values: ['#1 – #6', numbers.join(' ')], same: numbers.join('|') === '#1|#2|#3|#4|#5|#6' },
            { label: 'ตัวนับ', values: ['รายการวินิจฉัย 6 / 6', norm(await f.badge.innerText())], same: norm(await f.badge.innerText()) === 'รายการวินิจฉัย 6 / 6' },
            { label: 'ปุ่ม + เพิ่มรายการ', values: ['ไม่แสดง', addShown ? `ยังแสดง (${norm(await f.add.innerText())})` : 'ไม่แสดง'], same: !addShown },
          ];
          await compare(19, rows, 'right');
          await markEvidence(
            expected(f.rows.last(), 'แถว #6'),
            expected(f.badge, '6 / 6'),
            ...(addShown ? [expected(f.add, 'ไม่แสดงปุ่ม · จริง: ยังแสดง')] : []),
          );
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-020 รายการที่ 7 ----------
        await startClip(nurse, tcId(20));
        await soft(`${TC(20)} ขั้น 4 เพิ่มรายการที่ 7 ไม่ได้ · ไม่มี #7 · 6 / 6`, async () => {
          await expect(f.rows).toHaveCount(6);
          const addShown = await f.add.isVisible();
          if (addShown) {
            await f.add.scrollIntoViewIfNeeded();
            await markEvidence(clicked(f.add, 'กดเพิ่มรายการที่ 7'));
            await snapEvidence(nurse, 'ก่อนกด — เพิ่มรายการที่ 7');
            await clearEvidenceMarks(nurse);
            await f.add.click();
            await nurse.waitForTimeout(800);
          } else note(`${TC(20)} ปุ่ม`, 'ไม่มีปุ่ม + เพิ่มรายการ ให้กด');
          const numbers = (await f.rowNumbers.allInnerTexts()).map(norm);
          const limitShown = await f.limit.isVisible();
          note(`${TC(20)} ข้อความหลังกด`, limitShown ? norm(await f.limit.innerText()) : '(ไม่มีข้อความ)');
          const rows: CompareRow[] = [
            { label: 'แถว #7', values: ['ไม่มี', numbers.includes('#7') ? 'มี' : 'ไม่มี'], same: !numbers.includes('#7') && numbers.length === 6 },
            { label: 'ตัวนับ', values: ['รายการวินิจฉัย 6 / 6', norm(await f.badge.innerText())], same: norm(await f.badge.innerText()) === 'รายการวินิจฉัย 6 / 6' },
            { label: 'ข้อความแจ้ง (ข้อสังเกต)', values: ['-', limitShown ? norm(await f.limit.innerText()) : '(ไม่มี)'], same: true },
          ];
          await compare(20, rows, 'right');
          await markEvidence(expected(f.rowNumbers.last(), 'แถวสุดท้าย #6 (ไม่มี #7)'), expected(f.badge, '6 / 6'), ...(limitShown ? [alerted(f.limit, 'แจ้งเพดาน 6 รายการ')] : []));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-021 ลบเมื่อเหลือแถวเดียว ----------
        await keepRows(nurse, f, 1);
        await startClip(nurse, tcId(21));
        await soft(`${TC(21)} ขั้น 3–4 แถวเดียว (S06.0 · AIS 2) กด × → แถวยังอยู่ ค่าถูกล้าง`, async () => {
          await choose(nurse, f, f.combo('ICD10 1'), 'S060 - ', 'S06.0');
          await choose(nurse, f, f.combo('AIS 1'), '2 - ');
          await markEvidence(filled(f.combo('ICD10 1'), 'S06.0'), filled(f.combo('AIS 1'), 'AIS 2'), clicked(f.remove(1), 'ลบแถว #1'));
          await snapEvidence(nurse, 'ก่อนกด — ลบแถว #1');
          await clearEvidenceMarks(nurse);
          await f.remove(1).click();
          await nurse.waitForTimeout(700);
          const rowsNow = await readRows(f);
          const r1 = rowsNow[0];
          const rows: CompareRow[] = [
            { label: 'แถว #1', values: ['ยังอยู่ (มีแถวเดียว)', rowsNow.map((r) => r.no).join(' ') || '(ไม่มี)'], same: rowsNow.length === 1 && r1?.no === '#1' },
            { label: 'ICD10 1 / BR 1 / AIS 1', values: ['ว่างทั้งหมด', r1 ? [r1.icd, r1.br, r1.ais].map((v) => v || 'ว่าง').join(' / ') : '-'], same: !!r1 && !r1.icd && !r1.br && !r1.ais },
            { label: 'ตัวนับ', values: ['รายการวินิจฉัย 1 / 6', norm(await f.badge.innerText())], same: norm(await f.badge.innerText()) === 'รายการวินิจฉัย 1 / 6' },
          ];
          await compare(21, rows, 'right');
          await markEvidence(expected(f.rows.first(), 'แถว #1 ค่าว่าง'), expected(f.badge, '1 / 6'));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);

        // ---------- TC-015 กรอกครบทุกส่วน + บันทึก ----------
        await startClip(nurse, tcId(15));
        const saved = await soft(`${TC(15)} ขั้น 3–4 กรอกครบทุกส่วน → บันทึก สำเร็จ`, async () => {
          // SBH Prod 6 พ.ย.: บันทึกรอบก่อนได้ 503 → หน้าจอค้าง "ยังไม่ทราบผลการบันทึก" + ปุ่ม ตรวจสอบผลการบันทึก (ระบบห้ามส่งซ้ำก่อนตรวจ)
          const unknown = main.getByText(/ยังไม่ทราบผลการบันทึก/).first();
          if (await unknown.isVisible().catch(() => false)) {
            const check = main.getByRole('button', { name: 'ตรวจสอบผลการบันทึก', exact: true }).first();
            await markEvidence(alerted(unknown, 'ค้างจากบันทึกรอบก่อน (503)'), clicked(check, 'ตรวจสอบผลการบันทึก'));
            await snapEvidence(nurse, 'ก่อนกด — ตรวจสอบผลการบันทึก');
            await clearEvidenceMarks(nurse);
            await check.click();
            await nurse.waitForTimeout(3_000);
            note(`${TC(15)} ตรวจผลบันทึกรอบก่อน`, norm(await main.locator('.ant-alert, [role="alert"]').allInnerTexts().then((t) => t.join(' | '))).slice(0, 400));
            await snapEvidence(nurse, 'หลังกด — ตรวจสอบผลการบันทึก');
          }
          // การดูแลระหว่างนำส่ง
          const care: [string, string][] = [['ดูแลการหายใจ', '1 - '], ['ห้ามเลือด', '2 - '], ['Splint/Slap C-Spine', '0 - '], ['Splint/Slap อื่นๆ', '3 - '], ['IV Fluid', 'N - ']];
          for (const [name, prefix] of care) await choose(nurse, f, f.combo(name), prefix);
          await f.detail('ดูแลการหายใจ').fill('O2 mask');
          await f.summary('transport').scrollIntoViewIfNeeded();
          await markEvidence(...care.map(([name]) => filled(f.combo(name))), filled(f.detail('ดูแลการหายใจ'), 'O2 mask'));
          await snapEvidence(nurse, 'กรอก — การดูแลระหว่างนำส่ง');
          await clearEvidenceMarks(nurse);
          // Trauma Detail
          await f.path('date_and_time_of_injury').fill('2026-10-16T08:30');
          await f.path('date_and_time_of_hospital_arrival').fill('2026-10-16T09:00');
          await f.path('transport_accident').check();
          await choose(nurse, f, f.combo('จังหวัดที่เกิดเหตุ'), 'สระบุรี', 'สระบุรี');
          await expect(f.combo('อำเภอ')).toBeEnabled();
          await choose(nurse, f, f.combo('อำเภอ'), 'เมืองสระบุรี', 'เมืองสระบุรี');
          await expect(f.combo('ตำบล')).toBeEnabled();
          await choose(nurse, f, f.combo('ตำบล'), 'ปากเพรียว', 'ปากเพรียว');
          await choose(nurse, f, f.combo('ประเภทจุดเกิดเหตุ'), '5 - ');
          await f.choice('บาดเจ็บจากการทำงาน', 'ไม่ใช่').click();
          await choose(nurse, f, f.combo('ประเภทผู้บาดเจ็บ'), '2 - ');
          await choose(nurse, f, f.combo('ยานพาหนะผู้ป่วย'), '02 - ');
          await choose(nurse, f, f.combo('ยานพาหนะคู่กรณี'), '05 - ');
          await choose(nurse, f, f.combo('ส่งตรวจแอลกอฮอล์'), '2 - ');
          await f.choice('แอลกอฮอล์ผู้บาดเจ็บ', 'ใช้').click();
          await f.path('blood_alcohol_level').fill('80');
          await f.choice('หมวกนิรภัย', 'ไม่ใช้').click();
          await choose(nurse, f, f.combo('กลไกการบาดเจ็บ'), '05 - ');
          await choose(nurse, f, f.combo('เหตุการณ์และกิจกรรมขณะเกิดเหตุ'), '1 - ');
          await choose(nurse, f, f.combo('ลักษณะการบาดเจ็บ'), '1 - ');
          await f.choice('ประวัติสลบตั้งแต่เกิดเหตุ', 'สลบ').click();
          await f.hours.fill('0');
          await f.minutes.fill('10');
          await f.summary('trauma').evaluate((el) => el.scrollIntoView({ block: 'start' }));
          await markEvidence(filled(f.path('date_and_time_of_injury'), '16/10/2026 08:30'), filled(f.path('date_and_time_of_hospital_arrival'), '16/10/2026 09:00'), filled(f.combo('จังหวัดที่เกิดเหตุ')), filled(f.combo('อำเภอ')), filled(f.combo('ตำบล')), filled(f.combo('ประเภทจุดเกิดเหตุ')));
          await snapEvidence(nurse, 'กรอก — Trauma Detail ครึ่งบน');
          await clearEvidenceMarks(nurse);
          await f.group('ประวัติสลบตั้งแต่เกิดเหตุ').scrollIntoViewIfNeeded();
          await markEvidence(filled(f.combo('ประเภทผู้บาดเจ็บ')), filled(f.combo('ยานพาหนะผู้ป่วย')), filled(f.combo('ยานพาหนะคู่กรณี')), filled(f.path('blood_alcohol_level'), '80 mg%'), filled(f.combo('กลไกการบาดเจ็บ')), filled(f.combo('ลักษณะการบาดเจ็บ')), filled(f.hours, '0'), filled(f.minutes, '10'));
          await snapEvidence(nurse, 'กรอก — Trauma Detail ครึ่งล่าง');
          await clearEvidenceMarks(nurse);
          // ICD10
          await choose(nurse, f, f.combo('ICD10 สาเหตุ (V, W, X, Y)'), 'V234 - ', 'V23.4');
          await keepRows(nurse, f, 1);
          await choose(nurse, f, f.combo('ICD10 1'), 'S060 - ', 'S06.0');
          await choose(nurse, f, f.combo('AIS 1'), '2 - ');
          await f.add.click();
          await choose(nurse, f, f.combo('ICD10 2'), 'S223 - ', 'S22.3');
          await choose(nurse, f, f.combo('AIS 2'), '3 - ');
          await f.summary('diagnosis').evaluate((el) => el.scrollIntoView({ block: 'start' }));
          const save = main.getByRole('button', { name: /^(save )?บันทึก$/ }).filter({ visible: true }).first();
          await markEvidence(filled(f.combo('ICD10 สาเหตุ (V, W, X, Y)'), 'V23.4'), filled(f.rows.nth(0), '#1 S06.0 · BR 1 · AIS 2'), filled(f.rows.nth(1), '#2 S22.3 · BR 3 · AIS 3'));
          await snapEvidence(nurse, 'กรอก — ICD10 / BR / AIS');
          await clearEvidenceMarks(nurse);
          // บันทึก
          await save.scrollIntoViewIfNeeded();
          await markEvidence(clicked(save, 'บันทึก'));
          await snapEvidence(nurse, 'ก่อนกด — บันทึก');
          await clearEvidenceMarks(nurse);
          const response = nurse.waitForResponse((r) => r.request().method() === 'POST' && /\/clinical-form-groups\/[^/]+\/saves$/.test(r.url()), { timeout: 60_000 });
          await save.click();
          const res = await response;
          note(`${TC(15)} คำสั่งบันทึก`, `POST …/clinical-form-groups/…/saves → ${res.status()} · x-request-id ${res.headers()['x-request-id'] ?? '-'}`);
          if (res.status() !== 200) note(`${TC(15)} คำตอบของคำสั่งบันทึก`, (await res.text().catch((e: Error) => `(อ่านไม่ได้: ${e.message.split('\n')[0]})`)).slice(0, 600));
          expect(res.status(), 'คำสั่งบันทึกต้องสำเร็จ').toBe(200);
          const banner = main.getByText(SAVED_BANNER, { exact: true }).first();
          await expect(banner, `ต้องขึ้น "${SAVED_BANNER}"`).toBeVisible({ timeout: 30_000 });
          const savedBy = main.getByText(/บันทึกจากแบบฟอร์มนี้/).first();
          await expect(main.getByText(/ไม่สำเร็จ|ผิดพลาด|Error/).filter({ visible: true }), 'ต้องไม่มีข้อความ error').toHaveCount(0);
          await banner.scrollIntoViewIfNeeded();
          await markEvidence(alerted(banner, 'บันทึกสำเร็จ'), expected(savedBy, 'บันทึกจากแบบฟอร์มนี้ · ไม่มี error'));
        });

        // ---------- TC-016 ดูข้อมูลที่บันทึกในแท็บ ER Summary ----------
        await startClip(nurse, tcId(16));
        await soft(`${TC(16)} ขั้น 2–3 ประวัติการรักษา → ER Summary: ค่าตรงกับที่บันทึก`, async () => {
          expect(saved, 'TC-015 บันทึกไม่สำเร็จ — ตรวจไม่ได้').toBe(true);
          await recordMenu(nurse, 'ประวัติการรักษา');
          const tab = main.getByRole('tab', { name: 'ER Summary' }).first();
          await expect(tab).toBeVisible({ timeout: 30_000 });
          await tab.click();
          const viewer = nurse.locator('er-trauma-detail-pher-plus-v1-viewer').first();
          await expect(viewer.locator('dt').first(), 'ER Summary ต้องแสดงส่วนข้อมูลการบาดเจ็บ').toBeVisible({ timeout: 60_000 });
          const data = await viewer.evaluate((el) => {
            const root = el.shadowRoot ?? el;
            const pairs = [...root.querySelectorAll('dt')].map((dt) => [dt.textContent?.trim() ?? '', dt.nextElementSibling?.textContent?.trim() ?? ''] as [string, string]);
            const table = [...root.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? ''));
            return { pairs, table };
          });
          const value = (label: string) => norm(data.pairs.find(([k]) => norm(k) === label)?.[1]);
          const want: [string, string][] = [
            ['ดูแลการหายใจ', '1 - มี-เหมาะสม · O2 mask'],
            ['ห้ามเลือด', '2 - มี-ไม่เหมาะสม'],
            ['Splint/Slap C-Spine', '0 - ไม่มี'],
            ['Splint/Slap อื่นๆ', '3 - ไม่จำเป็น'],
            ['IV Fluid', 'N - ไม่ระบุ'],
            ['วันที่และเวลาที่เกิดเหตุ', '16/10/2569 08:30'],
            ['วันที่และเวลาที่มาถึง รพ.', '16/10/2569 09:00'],
            ['อุบัติเหตุจากการขนส่ง', 'ใช่'],
            ['จังหวัดที่เกิดเหตุ', 'สระบุรี'],
            ['อำเภอ', 'เมืองสระบุรี'],
            ['ตำบล', 'ปากเพรียว'],
            ['ประเภทจุดเกิดเหตุ', '5 - ถนนหรือทางหลวง'],
            ['บาดเจ็บจากการทำงาน', '0 - ไม่ใช่'],
            ['ประเภทผู้บาดเจ็บ', '2 - คนขับขี่'],
            ['ยานพาหนะผู้ป่วย', '02 - จักรยานยนต์'],
            ['ยานพาหนะคู่กรณี', '05 - รถปิกอัพ'],
            ['ส่งตรวจแอลกอฮอล์', '2 - ส่งตรวจผู้บาดเจ็บ'],
            ['แอลกอฮอล์ผู้บาดเจ็บ', '1 - ใช้'],
            ['ปริมาณที่พบในผู้บาดเจ็บ', '80 mg%'],
            ['หมวกนิรภัย', '0 - ไม่ใช้'],
            ['กลไกการบาดเจ็บ', '05 - ถูกชนหรือชนกับรถปิกอัพ'],
            ['เหตุการณ์และกิจกรรมขณะเกิดเหตุ', '1 - ขณะทำกิจกรรมยามว่าง'],
            ['ลักษณะการบาดเจ็บ', '1 - Blunt'],
            ['ประวัติสลบตั้งแต่เกิดเหตุ', '2 - สลบ · 0 ชั่วโมง 10 นาที'],
            ['ICD10 สาเหตุ (V, W, X, Y)', 'V234 - Motorcycle rider injured in collision with car, pick-up truck or van, driver injured in traffic accident'],
          ];
          const rows: CompareRow[] = want.map(([label, v]) => ({ label, values: [v, value(label) || '(ไม่มี)'], same: value(label) === v }));
          const wantTable = [
            ['1', 'S060 - Concussion', '1 - Head / Neck (ศีรษะและลำคอ)', '2 - Moderate (ปานกลาง)'],
            ['2', 'S223 - Fracture of rib', '3 - Thorax (ทรวงอก)', '3 - Serious : Not life-threatening (รุนแรง ไม่คุกคามชีวิต)'],
          ];
          for (const [i, w] of wantTable.entries()) {
            const got = (data.table[i] ?? []).map(norm);
            rows.push({ label: `ICD #${i + 1}`, values: [w.slice(1).map((t) => t.split(' (')[0]).join(' · '), got.slice(1).map((t) => t.split(' (')[0]).join(' · ') || '(ไม่มี)'], same: got.join('|') === w.join('|') });
          }
          rows.push({ label: 'จำนวนแถว ICD', values: ['2', String(data.table.length)], same: data.table.length === 2 });
          note(`${TC(16)} ค่าใน ER Summary`, data.pairs.map(([k, v]) => `${k}=${v}`).join(' | '));
          const sections = ['transport', 'trauma', 'diagnosis'];
          const section = (key: string) => viewer.locator(`section[data-section="${key}"]`).first();
          const sectionKeys = await viewer.evaluate((el) => [...(el.shadowRoot ?? el).querySelectorAll('section[data-section]')].map((s) => s.getAttribute('data-section') ?? ''));
          note(`${TC(16)} ส่วนใน ER Summary`, sectionKeys.join(' · '));
          // ภาพ: ส่วนการดูแลระหว่างนำส่ง + Trauma Detail ครึ่งบน
          await viewer.evaluate((el) => el.scrollIntoView({ block: 'start' }));
          await markEvidence(...sectionKeys.slice(0, 1).map((k) => expected(section(k), 'การดูแลระหว่างนำส่ง ตรงกับที่บันทึก')));
          await snapEvidence(nurse, 'ER Summary — การดูแลระหว่างนำส่ง');
          await clearEvidenceMarks(nurse);
          if (sectionKeys[1]) {
            await section(sectionKeys[1]).evaluate((el) => el.scrollIntoView({ block: 'start' }));
            await markEvidence(expected(section(sectionKeys[1]), 'Trauma Detail ตรงกับที่บันทึก'));
            await snapEvidence(nurse, 'ER Summary — Trauma Detail');
            await clearEvidenceMarks(nurse);
          }
          const last = sectionKeys.includes('diagnosis') ? 'diagnosis' : sections[2];
          await section(last).evaluate((el) => el.scrollIntoView({ block: 'center' }));
          await compare(16, rows, 'right');
          await markEvidence(expected(section(last), 'ICD10 สาเหตุ + ICD / BR / AIS 2 แถว'));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(nurse);
        await startClip(nurse, 'after');
      } finally {
        await finishVideo(nurse).catch(() => undefined);
        await nurse.context().close().catch(() => undefined);
      }
      setup.finish();
      finish();
    },
  );

  test('ปิด Visit ของผู้ป่วยใน SBH2952_VISIT ที่การเงิน (หลังรันด้วย SBH2952_KEEP)', { tag: ['@SBH-2952-CLOSE'] }, async ({ page }) => {
    const [hn, vn, en] = (process.env.SBH2952_VISIT ?? '').split(',');
    test.skip(!hn || !vn, 'ต้องใส่ SBH2952_VISIT=<HN>,<VN>,<EN>');
    const closed = await closeVisitAtCashier(page, hn, vn);
    console.log(`    ปิด Visit HN ${hn} · ${vn} · ${en ?? '-'}: ${closed.result}`);
  });
});
