import { type Locator, type Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectVisitHeader, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import {
  NURSE_FOCUS_NOTE,
  addNurseNoteButton,
  chooseRecordType,
  expandFocus,
  focusCard,
  focusMenuItem,
  nurseNoteNotice,
  openFocusMenu,
  openNursingRecords,
  readFocusNotes,
  saveNurseNote,
} from '../../../helpers/functions/er-nursing-records';
import { erTriageLevel, erTriageSaveButton, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { restartVideo, startClip } from '../../../helpers/functions/fixtures';
import {
  CATEGORIES,
  addTemplateButton,
  applyTemplate,
  clearTemplateSearch,
  editorText,
  fillTemplateForm,
  form,
  formError,
  formItem,
  gotoNurseTemplates,
  noteEditor,
  openNurseTemplateDialog,
  openSubTab,
  physicianTemplateDialog,
  picker,
  previewText,
  readColumnHeaders,
  readItems,
  rowByName,
  rowStatus,
  saveTemplateForm,
  searchSettings,
  searchTemplates,
  selectedSubTab,
  settingsSearch,
  settingsTab,
  settingsTitle,
  subTab,
  successNotice,
  tableEmpty,
  tableRows,
  templateButtons,
  type NurseCategory,
} from '../../../helpers/functions/nurse-note-template';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, gotoVisit } from '../../../mock-data/uat-play';

// SBH-2629 [ER][Nurse Focus Note] เพิ่ม Feature Note template — Nurse Note Template แยก Assessment / Intervention / Evaluation
//   หน้าตั้งค่า /cortex/setting/admin/note-templates (แท็บ Nurse Note Template) · ไอคอน Template มุมขวาของช่อง A / I / E ในหน้าต่าง Nurse Note
//   กด "ใช้ข้อความนี้" แทรกข้อความที่ cursor (ต่อในบรรทัดเดียวกัน — ผู้ใช้ยืนยันไม่ใช่บั๊ก R68) · ข้อมูลแยกจาก Note Template ของแพทย์ (templateType)
// ชุด EXE SBH-3120 → HPY SBH-3121 (TC-001–022 = SBH-3124–3145) · UHP SBH-3122 (TC-023–027 = SBH-3146–3150) · EDG SBH-3123 (TC-028–030 = SBH-3151–3153)
// 1 เทส = 1 flow (R9) · คลิป 1 ไฟล์ต่อ 1 TC (R61)
//   เทส A หน้าตั้งค่า: TC-001 → 002 → 003 → 004 → 028 (ขั้น 1) → 025 → 026 → 027 → 019
//   เทส B ผู้ป่วย AUTO ใหม่ (Visit ER + คัดกรอง ESI 3): TC-005 → 006 → 009 → 014 → 016 → 015 → 024 → 028 (ขั้น 2) → 007 → 008 → 020 → 023 → 010 → 011 → 012 → 013
//         → 017 (บันทึก Focus) → 018 (แก้ Template) → 022 → 029 → 030 → 021 (ER Physician Note) → ปิด Visit ที่การเงิน (afterEach)
// ชื่อ Template ต่อท้าย SUFFIX (ผู้ใช้เลือก 31 ต.ค. 2026 — ไม่แตะ QA-2629 … #34–37 ที่สร้างไว้ตอนสำรวจ 28 ต.ค.) · ข้อความ Template ตาม TC
//   → TC-014 ค้นด้วย SUFFIX แทน "QA-2629" · TC-015 ค้น "QA-A" แล้วเห็น #34 ตัวเก่าด้วย (เนื้อหามีคำนี้) = ข้อสังเกต
// สิ่งที่เขียนบน dev-x: Template ใหม่ 4 ตัว (ทิ้งไว้) · ผู้ป่วย AUTO 1 ราย + Focus 1 รายการ · กดปุ่ม Note Template ฝั่งแพทย์ยิง physician-activity ของผู้ป่วยนี้
// SBH Prod (ผู้ใช้สั่ง 6 พ.ย. 2026): label "Test" แทน nurse-note · Template แพทย์ที่ใช้ค้น = "pneumonia" · ขั้นเตรียมสร้าง General A / I / E (ข้อความเดียวกับ dev-x ID 31–33) ถ้ายังไม่มี
//   Template ที่สร้างทิ้งไว้บน Prod (ผู้ใช้เลือก) · ผู้ป่วย AUTO 1 ราย ปิด Visit ที่การเงินท้ายเทส
//   รัน: npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep "@SBH-2629( |$)"
// รัน (dev-x): npx playwright test --headed --grep @SBH-2629
//   SBH2629_SUFFIX=3110B = ชื่อรอบใหม่ (รอบก่อนสร้างไปแล้ว — ห้ามใช้ค่าที่เป็นคำนำหน้าของรอบอื่น) · SBH2629_KEEP=1 = ไม่ปิด Visit ท้ายเทส

const ISSUE: Record<number, string> = {};
for (let n = 1; n <= 30; n++) ISSUE[n] = `SBH-${3123 + n}`;
const pad = (n: number) => String(n).padStart(3, '0');
const TC = (n: number) => `TC-${pad(n)} (${ISSUE[n]})`;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const tagsOf = (tcs: number[]) => ({ tag: ['@SBH-2629', ...tcs.map((n) => `@${ISSUE[n]}`)], annotation: ['SBH-2629', ...tcs.map((n) => ISSUE[n])].map(linear) });

const now = new Date();
const SUFFIX = process.env.SBH2629_SUFFIX ?? `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}A`;
const NAME: Record<NurseCategory | 'Inactive', string> = {
  Assessment: `QA-2629 Assessment ${SUFFIX}`,
  Intervention: `QA-2629 Intervention ${SUFFIX}`,
  Evaluation: `QA-2629 Evaluation ${SUFFIX}`,
  Inactive: `QA-2629 Inactive A ${SUFFIX}`,
};
const TEXT: Record<NurseCategory, string> = { Assessment: 'Focus/problem: QA-A', Intervention: 'Intervention: QA-I', Evaluation: 'Evaluation: QA-E' };
const GENERAL: Record<NurseCategory, string> = { Assessment: 'General Assessment', Intervention: 'General Intervention', Evaluation: 'General Evaluation' };
const COLUMNS = ['ID', 'ชื่อ', 'Labels', 'ประเภท', 'Assigned To', 'สถานะ', 'สร้างโดย', 'วันที่สร้าง', 'อัปเดตล่าสุดโดย', 'อัปเดตล่าสุดเมื่อ', 'จัดการ'];
const FOCUS = `QA-2629 Template Focus ${SUFFIX}`;
const PROD = SYSTEM === 'sbh-prod';
// Note Template ของแพทย์ (GENERAL): dev-x "nurse note" (ID 22 · label nurse-note) · SBH Prod "pneumonia" (ID 1 — Prod ไม่มี Template แพทย์ที่ติด nurse-note)
const PHYSICIAN_TEMPLATE = PROD ? 'pneumonia' : 'nurse note';
// Labels: Prod ไม่มี label nurse-note และระบบลบ label ไม่ได้ → ใช้ label เดิม "Test" (ผู้ใช้เลือก 6 พ.ย. 2026)
const LABEL = PROD ? 'Test' : 'nurse-note';
// Template General ของ dev-x (ID 31–33) — Prod ไม่มี ผู้ใช้ให้สร้างชื่อ / ข้อความเดียวกันบน Prod แล้วทิ้งไว้ (6 พ.ย. 2026)
const GENERAL_TEXT: Record<NurseCategory, string> = {
  Assessment: 'Focus/problem:\nSubjective (S):\nObjective (O): V/S …, Pain …, Others ',
  Intervention: 'Nursing care provided:\nMedications given: name, dose, route, time\nCollaboration/communication:',
  Evaluation: 'Patient response after intervention:\nV/S / Pain score after intervention:\nOngoing plan:',
};

const main = (page: Page) => page.getByRole('main');
const cmp = (label: string, want: string, got: string, same = want === got): CompareRow => ({ label, values: [want, got], same });
const bad = (rows: CompareRow[]) => rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values.join(' ≠ ')}`);

test.describe(`SBH-2629 Nurse Note Template (${SYSTEM})`, () => {
  test.skip(SYSTEM !== 'dev-x' && !PROD, 'ชุดนี้รันบน dev-x (31 ต.ค. 2026) และ SBH Prod (ผู้ใช้สั่ง 6 พ.ย. 2026)');
  test.describe.configure({ timeout: 2_700_000 });

  // ───────────────────────── เทส A หน้าตั้งค่า ─────────────────────────
  test(
    `A: หน้าตั้งค่า Nurse Note Template — แท็บย่อย A/I/E · สร้าง ${SUFFIX} · ปิดใช้งาน · โปรดระบุ · แยกจาก Note Template (Super_User)`,
    tagsOf([1, 2, 3, 4, 28, 25, 26, 27, 19]),
    async ({ page }) => {
      const { note, soft, finish } = makeRunner(page);
      note('ชื่อรอบ', `SUFFIX ${SUFFIX} · ${Object.values(NAME).join(' · ')}`);

      // ───── TC-001 ─────
      await page.goto('/cortex/setting/admin/note-templates');
      await expect(settingsTab(page, 'Nurse Note Template')).toBeVisible({ timeout: 60_000 });
      // กันชื่อซ้ำ: รอบนี้ต้องยังไม่เคยสร้าง
      await settingsTab(page, 'Nurse Note Template').click();
      await expect(settingsTitle(page)).toHaveText('Nurse Note Template');
      await searchSettings(page, SUFFIX);
      expect(await tableRows(page).count(), `มี Template ที่ลงท้าย ${SUFFIX} อยู่แล้ว — ตั้ง SBH2629_SUFFIX ใหม่`).toBe(0);
      // ขั้นเตรียม (ไม่ใช่ TC): Prod ไม่มี General Assessment / Intervention / Evaluation → สร้างตามข้อความของ dev-x ถ้ายังไม่มี
      if (PROD)
        for (const category of CATEGORIES) {
          await gotoNurseTemplates(page, category);
          await searchSettings(page, GENERAL[category]);
          if (await rowByName(page, GENERAL[category]).count()) {
            note(`เตรียม ${GENERAL[category]}`, 'มีอยู่แล้ว');
            continue;
          }
          await gotoNurseTemplates(page, category);
          await addTemplateButton(page).click();
          await expect(page).toHaveURL(new RegExp(`note-templates/create\\?type=NURSE_FOCUS_NOTE_${category.toUpperCase()}`));
          await fillTemplateForm(page, { name: GENERAL[category], template: GENERAL_TEXT[category], label: LABEL });
          const result = await saveTemplateForm(page);
          note(`เตรียม ${GENERAL[category]}`, `สร้างใหม่ HTTP ${result.mutation ?? '-'} · ${result.notices.join(' | ') || '-'}`);
          expect(result.mutation, `สร้าง ${GENERAL[category]} ไม่สำเร็จ`).toBe(200);
          await expect(settingsTitle(page)).toHaveText('Nurse Note Template', { timeout: 30_000 });
        }
      await page.goto('/cortex/setting/admin/note-templates');
      await expect(settingsTab(page, 'Nurse Note Template')).toBeVisible({ timeout: 60_000 });
      await restartVideo(page);
      await startClip(page, 'TC-001');
      await soft(`${TC(1)} ขั้น 1-2 แท็บ Nurse Note Template มีแท็บย่อย Assessment / Intervention / Evaluation`, async () => {
        await markEvidence(clicked(settingsTab(page, 'Nurse Note Template')));
        await snapEvidence(page, 'ก่อนกด — แท็บ Nurse Note Template');
        await settingsTab(page, 'Nurse Note Template').click();
        await expect(settingsTitle(page), 'Expected: หัวหน้าเป็น Nurse Note Template').toHaveText('Nurse Note Template');
        await expect(columnHeadersReady(page)).toBeVisible();
        const headers = await readColumnHeaders(page);
        const subs = await main(page).locator('.ant-segmented-item').allInnerTexts();
        const rows: CompareRow[] = [
          cmp('หัวหน้า', 'Nurse Note Template', (await settingsTitle(page).innerText()).trim()),
          cmp('แท็บย่อย', CATEGORIES.join(' · '), subs.map((s) => s.trim()).join(' · ')),
          cmp('แท็บย่อยที่เลือก', 'Assessment', (await selectedSubTab(page).innerText()).trim()),
          cmp('คอลัมน์', COLUMNS.join(' · '), headers.join(' · ')),
        ];
        await showCompareTable(page, 'SBH-3124 หน้า Nurse Note Template: Expected เทียบหน้าจอ', ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(
          expected(settingsTitle(page), 'Nurse Note Template'),
          expected(main(page).locator('.ant-segmented').first(), 'Assessment / Intervention / Evaluation'),
          expected(main(page).locator('.ant-table-thead').first(), 'คอลัมน์ครบ'),
        );
        expect(bad(rows), 'Expected: หัว · แท็บย่อย · คอลัมน์ ตาม TC').toEqual([]);
      });
      await hideCompareTable(page);

      // ───── TC-002 / 003 / 004 สร้างทีละหมวด ─────
      const created: Partial<Record<NurseCategory, boolean>> = {};
      for (const [n, category] of [[2, 'Assessment'], [3, 'Intervention'], [4, 'Evaluation']] as const) {
        await gotoNurseTemplates(page, category);
        await startClip(page, `TC-${pad(n)}`);
        await soft(`${TC(n)} ขั้น 1-2 สร้าง ${category} "${NAME[category]}"`, async () => {
          await markEvidence(clicked(subTab(page, category)), clicked(addTemplateButton(page)));
          await snapEvidence(page, `ก่อนกด — เพิ่ม Template ${category}`);
          await addTemplateButton(page).click();
          await expect(page).toHaveURL(/note-templates\/create\?type=NURSE_FOCUS_NOTE_/);
          await fillTemplateForm(page, { name: NAME[category], template: TEXT[category], label: LABEL });
          note(`TC-${pad(n)} Type`, (await form.scope(page).innerText()).trim());
          await markEvidence(filled(form.name(page)), filled(formItem(page, 'template')), filled(formItem(page, 'labels')), filled(form.scope(page), 'Type'), clicked(form.save(page)));
          await snapEvidence(page, `ก่อนกด — บันทึก ${category}`);
          const result = await saveTemplateForm(page);
          note(`TC-${pad(n)} ผลบันทึก`, `HTTP ${result.mutation ?? '-'} · ${result.notices.join(' | ') || '-'}`);
          const toast = successNotice(page, 'สร้าง Note Template สำเร็จ');
          await expect(toast, 'Expected: แจ้งเตือน สร้าง Note Template สำเร็จ').toBeVisible();
          await expect(settingsTitle(page)).toHaveText('Nurse Note Template', { timeout: 30_000 });
          await expect(selectedSubTab(page), `Expected: กลับมาแท็บย่อย ${category}`).toHaveText(category);
          const first = tableRows(page).first();
          await expect(first, `Expected: แถว ${NAME[category]} อยู่บนสุด`).toContainText(NAME[category], { timeout: 15_000 });
          await expect(rowStatus(first)).toHaveText('Active');
          await markEvidence(alerted(toast), expected(main(page).locator('.ant-segmented').first(), `กลับมาแท็บย่อย ${category}`), expected(first, 'แถวใหม่อยู่บนสุด สถานะ Active'));
          created[category] = true;
        });
        if (!created[category]) continue;
        await soft(`${TC(n)} ขั้น 3 "${NAME[category]}" ไม่ขึ้นในแท็บย่อยอื่น`, async () => {
          const found: string[] = [];
          for (const other of CATEGORIES.filter((c) => c !== category)) {
            await openSubTab(page, other);
            const count = await rowByName(page, NAME[category]).count();
            found.push(`${other}: ${count ? 'พบ' : 'ไม่พบ'}`);
            await markEvidence(expected(main(page).locator('.ant-segmented').first(), `แท็บย่อย ${other}`), expected(main(page).locator('.ant-table-tbody').first(), `ไม่มี ${NAME[category]}`));
            await snapEvidence(page, `แท็บ ${other} — ไม่มี ${category}`);
            expect(count, `Expected: ${NAME[category]} ไม่ขึ้นในแท็บย่อย ${other}`).toBe(0);
          }
          note(`TC-${pad(n)} แท็บอื่น`, found.join(' · '));
          await openSubTab(page, category);
          await markEvidence(expected(rowByName(page, NAME[category]).first(), `อยู่ในแท็บ ${category}`));
        });
      }

      // ───── TC-028 ขั้น 1 สร้าง Template ปิดใช้งาน ─────
      await gotoNurseTemplates(page, 'Assessment');
      await startClip(page, 'TC-028-step1');
      await soft(`${TC(28)} ขั้น 1 สร้าง "${NAME.Inactive}" ปิดสวิตช์ Active → สถานะ ปิดใช้งาน`, async () => {
        await addTemplateButton(page).click();
        await fillTemplateForm(page, { name: NAME.Inactive, template: 'Inactive: QA-X', label: LABEL, active: false });
        await expect(form.active(page)).toHaveAttribute('aria-checked', 'false');
        await markEvidence(filled(form.active(page), 'Active ปิด'), filled(form.name(page)), clicked(form.save(page)));
        await snapEvidence(page, 'ก่อนกด — บันทึก Template ปิดใช้งาน');
        const result = await saveTemplateForm(page);
        note('TC-028 ผลบันทึก', `HTTP ${result.mutation ?? '-'} · ${result.notices.join(' | ') || '-'}`);
        await expect(settingsTitle(page)).toHaveText('Nurse Note Template', { timeout: 30_000 });
        const row = rowByName(page, NAME.Inactive).first();
        await expect(row).toBeVisible({ timeout: 15_000 });
        await expect(rowStatus(row), 'สถานะในตาราง ปิดใช้งาน').toHaveText('ปิดใช้งาน');
        await markEvidence(expected(rowStatus(row), 'ปิดใช้งาน'), expected(row.locator(`td[title="${NAME.Inactive}"]`)));
      });

      // ───── TC-025 / 026 / 027 ฟอร์มไม่ครบ ─────
      const invalid: [number, 'name' | 'template' | 'labels', Parameters<typeof fillTemplateForm>[1]][] = [
        [25, 'name', { template: 'QA ไม่มีชื่อ', label: LABEL }],
        [26, 'template', { name: 'QA-2629 NoText', label: LABEL }],
        [27, 'labels', { name: 'QA-2629 NoLabel', template: 'QA ไม่มี label' }],
      ];
      for (const [n, field, input] of invalid) {
        await gotoNurseTemplates(page, 'Intervention');
        await startClip(page, `TC-${pad(n)}`);
        await soft(`${TC(n)} บันทึกโดยเว้นช่อง ${field} → โปรดระบุ ไม่บันทึก`, async () => {
          await addTemplateButton(page).click();
          await expect(page).toHaveURL(/note-templates\/create\?type=NURSE_FOCUS_NOTE_INTERVENTION/);
          await fillTemplateForm(page, input);
          await markEvidence(...(['name', 'template', 'labels'] as const).filter((f) => f !== field).map((f) => filled(formItem(page, f))), clicked(form.save(page)));
          await snapEvidence(page, `ก่อนกด — บันทึก เว้น ${field}`);
          let mutated = false;
          const spy = (req: { postData(): string | null }) => {
            if (/mutation CreateNoteTemplate/.test(req.postData() ?? '')) mutated = true;
          };
          page.on('request', spy);
          await form.save(page).click();
          await expect(formError(page, field), `Expected: ใต้ช่อง ${field} ขึ้น โปรดระบุ`).toHaveText('โปรดระบุ');
          await page.waitForTimeout(1_500);
          page.off('request', spy);
          await expect(page, 'Expected: ยังอยู่หน้าเพิ่ม Note Template').toHaveURL(/note-templates\/create/);
          await expect(settingsTitle(page)).toHaveText('เพิ่ม Note Template');
          note(`TC-${pad(n)}`, `ข้อความใต้ช่อง ${field}: "${(await formError(page, field).innerText()).trim()}" · ส่งคำสั่งสร้าง: ${mutated ? 'มี' : 'ไม่มี'}`);
          expect(mutated, 'Expected: ไม่บันทึก (ไม่มีคำสั่ง CreateNoteTemplate)').toBe(false);
          await markEvidence(alerted(formItem(page, field), 'โปรดระบุ'), expected(settingsTitle(page), 'ยังอยู่หน้าเพิ่ม'));
        });
        await form.cancel(page).click().catch(() => undefined);
      }

      // ───── TC-019 แท็บ Note Template ไม่มี Nurse Note Template ─────
      await page.goto('/cortex/setting/admin/note-templates?tab=note-template');
      await expect(settingsTitle(page)).toHaveText('Note Template', { timeout: 60_000 });
      await startClip(page, 'TC-019');
      for (const word of ['QA-2629', 'General']) {
        await soft(`${TC(19)} แท็บ Note Template ค้น "${word}" → ไม่มีข้อมูล`, async () => {
          await expect(settingsTab(page, 'Note Template')).toHaveAttribute('aria-selected', 'true');
          await searchSettings(page, word);
          await expect(tableEmpty(page), `Expected: ค้น ${word} แล้วตารางแสดง ไม่มีข้อมูล`).toContainText('ไม่มีข้อมูล');
          expect(await tableRows(page).count()).toBe(0);
          await markEvidence(filled(settingsSearch(page), word), expected(settingsTab(page, 'Note Template'), 'แท็บ Note Template'), expected(tableEmpty(page), 'ไม่มีข้อมูล'));
        });
      }
      await searchSettings(page, '').catch(() => undefined);
      finish();
    },
  );

  // ───────────────────────── เทส B หน้าต่าง Nurse Note ─────────────────────────
  let opened: Map<string, ErVisit>;
  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });
  test.afterEach(async ({ page }) => {
    await hideCompareTable(page).catch(() => undefined);
    if (process.env.SBH2629_KEEP) return;
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
    `B: หน้าต่าง Nurse Note ของผู้ป่วย ER — ไอคอน Template · เลือก / ค้นหา · ใช้ข้อความนี้ · บันทึก · แยกจากแพทย์ (Super_User)`,
    tagsOf([5, 6, 9, 14, 16, 15, 24, 28, 7, 8, 20, 23, 10, 11, 12, 13, 17, 18, 22, 29, 30, 21]),
    async ({ page }) => {
      const { note, soft, finish } = makeRunner(page);
      const noteDialog = page.getByRole('dialog', { name: 'Nurse Note', exact: true });
      let visit!: ErVisit;

      // ───── เตรียมผู้ป่วย ─────
      await gotoErDashboard(page);
      const patient = newTestPatient('Nnt2629');
      visit = await registerAndOpenErVisit(page, patient);
      note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
      await expectVisitHeader(page, visit);
      await expect(main(page).getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
      await dismissToast(page, 'สร้าง Visit สำเร็จ');
      await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
      await markEvidence(filled(erTriageLevel(page, 3).locator('xpath=..'), 'ESI 3'), clicked(erTriageSaveButton(page))).catch(() => undefined);
      await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
      await expect(main(page).getByText('Clinical Summary', { exact: true })).toBeVisible({ timeout: 60_000 });
      await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');

      const openPanel = async () => {
        await openNursingRecords(page);
        await chooseRecordType(page, NURSE_FOCUS_NOTE);
        await expect(addNurseNoteButton(page)).toBeVisible();
      };
      /** เปิดหน้าต่าง + เพิ่ม Nurse Note ใหม่ (ช่องว่าง) */
      const openNewNote = async () => {
        await addNurseNoteButton(page).click();
        await expect(noteDialog).toBeVisible();
        await expect(templateButtons(noteDialog)).toHaveCount(3);
      };
      /** ปิดหน้าต่าง Nurse Note โดยไม่บันทึก (ยกเลิก + ยืนยันถ้ามี) */
      const discardNote = async () => {
        if (!(await noteDialog.isVisible().catch(() => false))) return;
        await noteDialog.getByRole('button', { name: 'ยกเลิก' }).click();
        const confirm = page.locator('.ant-modal-confirm:visible, .ant-popconfirm:visible').last();
        if (await confirm.waitFor({ state: 'visible', timeout: 2_000 }).then(() => true, () => false)) {
          note('ยกเลิกหน้าต่าง Nurse Note', `มีหน้าต่างยืนยัน: ${(await confirm.innerText()).replace(/\s+/g, ' ').slice(0, 80)}`);
          await confirm.getByRole('button').filter({ hasText: /ยืนยัน|ตกลง|OK|ใช่/ }).last().click();
        }
        await expect(noteDialog).toBeHidden({ timeout: 10_000 });
      };
      const editorsText = async () => ({
        A: await editorText(noteEditor(noteDialog, 'Assessment')),
        I: await editorText(noteEditor(noteDialog, 'Intervention')),
        E: await editorText(noteEditor(noteDialog, 'Evaluation')),
      });

      // ───── TC-021 ER Physician Note (เรียกท้ายเทส · SBH2629_ONLY=TC021 = รันข้อนี้ข้อเดียวกับผู้ป่วยใหม่) ─────
      // หน้า Visit มีปุ่ม Note Template 2 ปุ่ม: ฟอร์มคัดกรอง ER (มาก่อนใน DOM) กับแผง ER Physician Note
      //   → จับปุ่มในแผงที่มีหัว "ER Physician Note" (รอบ Prod 6 พ.ย. 2026 .first() ได้ปุ่มของฟอร์มคัดกรอง — Sub Agent จับได้)
      const tc021 = async () => {
        await gotoVisit(page, visit);
        const physicianPanel = page
          .locator('div')
          .filter({ has: page.getByText('ER Physician Note', { exact: true }) })
          .filter({ has: page.locator('button[aria-label="Note Template"]') })
          .last();
        const ntButton = physicianPanel.locator('button[aria-label="Note Template"]');
        await expect(ntButton).toHaveCount(1, { timeout: 120_000 });
        await expect(ntButton).toBeVisible({ timeout: 120_000 });
        note('TC-021 ปุ่ม Note Template บนหน้า', `${await page.locator('button[aria-label="Note Template"]').count()} ปุ่ม · ใช้ปุ่มในแผง ER Physician Note`);
        await restartVideo(page);
        await startClip(page, 'TC-021');
        for (const word of ['QA-2629', 'General']) {
          await soft(`${TC(21)} Note Template ของ ER Physician Note ค้น "${word}" → ไม่มี Template`, async () => {
            const d = physicianTemplateDialog(page);
            if (!(await d.isVisible().catch(() => false))) {
              await markEvidence(expected(physicianPanel.getByText('ER Physician Note', { exact: true }), 'แผง ER Physician Note'), clicked(ntButton, 'Note Template'));
              await snapEvidence(page, 'ก่อนกด — Note Template ของแพทย์');
              await ntButton.click();
              await expect(d).toBeVisible();
              await expect(picker.items(d).first().or(picker.empty(d))).toBeVisible({ timeout: 20_000 });
            }
            await searchTemplates(d, word);
            await expect(picker.empty(d), 'Expected: ไม่มี Template').toHaveText('ไม่มี Template');
            await expect(picker.copy(d), 'หน้าต่างของแพทย์ (ปุ่ม คัดลอกข้อความ)').toBeVisible();
            await markEvidence(filled(picker.search(d), word), expected(picker.empty(d), 'ไม่มี Template'), expected(picker.copy(d), 'หน้าต่างของแพทย์'));
          });
        }
        const d = physicianTemplateDialog(page);
        if (await d.isVisible().catch(() => false)) await picker.close(d).click();
        await startClip(page, 'after'); // ไม่ให้คลิป TC-021 ยาวไปถึงขั้นปิด Visit ของ afterEach
      };

      if (process.env.SBH2629_ONLY === 'TC021') {
        await tc021();
        finish();
        return;
      }

      await openPanel();
      await restartVideo(page);

      // ───── TC-005 ไอคอน Template 3 ช่อง ─────
      await startClip(page, 'TC-005');
      await soft(`${TC(5)} หน้าต่าง Nurse Note มีไอคอน Template ที่ช่อง A / I / E`, async () => {
        await markEvidence(clicked(addNurseNoteButton(page)));
        await snapEvidence(page, 'ก่อนกด — + เพิ่ม Nurse Note');
        await openNewNote();
        for (const c of CATEGORIES) await expect(templateButtons(noteDialog).nth(CATEGORIES.indexOf(c)), `Expected: ไอคอน Template ช่อง ${c}`).toBeVisible();
        await markEvidence(...CATEGORIES.map((c, i) => expected(templateButtons(noteDialog).nth(i), `ไอคอน ${c[0]}`)));
      });

      // ───── TC-006 Assessment + ค้นหา ─────
      let assessmentAll: string[] = [];
      let aDialog: Locator | undefined;
      await startClip(page, 'TC-006');
      await soft(`${TC(6)} กดไอคอน Template ช่อง Assessment → เฉพาะ Template ของ Assessment · เลือกรายการแรก + พรีวิวอัตโนมัติ`, async () => {
        aDialog = await openNurseTemplateDialog(page, noteDialog, 'Assessment');
        assessmentAll = await readItems(aDialog);
        note('TC-006 รายการ Assessment', assessmentAll.join(' · '));
        const activeName = (await picker.active(aDialog).innerText()).trim();
        const preview = await previewText(aDialog);
        const rows: CompareRow[] = [
          cmp('หัวหน้าต่าง', 'Nurse Note Template - Assessment', 'Nurse Note Template - Assessment'),
          cmp(`มี ${NAME.Assessment}`, 'มี', assessmentAll.some((n) => n.includes(NAME.Assessment)) ? 'มี' : 'ไม่มี'),
          cmp(`มี ${GENERAL.Assessment}`, 'มี', assessmentAll.some((n) => n.includes(GENERAL.Assessment)) ? 'มี' : 'ไม่มี'),
          cmp('ของ Intervention / Evaluation', 'ไม่มี', assessmentAll.filter((n) => /Intervention|Evaluation/.test(n)).join(', ') || 'ไม่มี'),
          cmp('รายการแรกถูกเลือก', assessmentAll[0] ?? '-', activeName),
          cmp('มีพรีวิว', 'มีข้อความ', preview && preview !== '-' ? 'มีข้อความ' : `"${preview}"`),
        ];
        await showCompareTable(page, 'SBH-3129 หน้าต่าง Template ช่อง Assessment', ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(aDialog.getByText('Nurse Note Template - Assessment')), expected(picker.items(aDialog).first().locator('xpath=..'), 'เฉพาะ Assessment'), expected(picker.active(aDialog), 'เลือกอัตโนมัติ'), expected(picker.preview(aDialog), 'พรีวิว'));
        expect(bad(rows)).toEqual([]);
      });
      await hideCompareTable(page);

      if (aDialog) {
        await startClip(page, 'TC-009');
        await soft(`${TC(9)} กด General Assessment → ไฮไลต์ + พรีวิวเปลี่ยน`, async () => {
          const before = await previewText(aDialog!);
          await picker.item(aDialog!, GENERAL.Assessment).first().click();
          await expect(picker.active(aDialog!), 'Expected: แถว General Assessment ถูกไฮไลต์').toContainText(GENERAL.Assessment);
          await expect.poll(() => previewText(aDialog!)).toContain('Subjective (S):');
          const after = await previewText(aDialog!);
          note('TC-009 พรีวิว', `ก่อน: ${before.replace(/\n/g, ' / ')} → หลัง: ${after.replace(/\n/g, ' / ')}`);
          for (const part of ['Focus/problem:', 'Subjective (S):', 'Objective (O): V/S', 'Pain', 'Others']) expect(after, `Expected: พรีวิวมี ${part}`).toContain(part);
          await markEvidence(clicked(picker.active(aDialog!), GENERAL.Assessment), expected(picker.preview(aDialog!), 'ข้อความของ General Assessment'));
        });

        await startClip(page, 'TC-014');
        await soft(`${TC(14)} ค้นชื่อ "${SUFFIX}" → เหลือ ${NAME.Assessment} + พรีวิวของรายการนั้น`, async () => {
          await searchTemplates(aDialog!, SUFFIX);
          const items = await readItems(aDialog!);
          note('TC-014 ผลค้น', items.join(' · ') || '(ว่าง)');
          expect(items.length, 'Expected: เหลือ 1 รายการ').toBe(1);
          expect(items[0]).toContain(NAME.Assessment);
          await expect.poll(() => previewText(aDialog!)).toContain(TEXT.Assessment);
          await markEvidence(filled(picker.search(aDialog!), SUFFIX), expected(picker.items(aDialog!).first(), NAME.Assessment), expected(picker.preview(aDialog!), TEXT.Assessment));
        });

        await startClip(page, 'TC-016');
        await soft(`${TC(16)} กด ล้างค่ากรอง → ช่องค้นว่าง รายการกลับครบ`, async () => {
          await markEvidence(clicked(picker.clear(aDialog!)));
          await snapEvidence(page, 'ก่อนกด — ล้างค่ากรอง');
          await clearTemplateSearch(aDialog!);
          await expect(picker.search(aDialog!), 'Expected: ช่องค้นหาว่าง').toHaveValue('');
          const items = await readItems(aDialog!);
          const rows = [cmp('จำนวนรายการ', `${assessmentAll.length} (ตอนเปิดหน้าต่าง)`, `${items.length}`, items.length === assessmentAll.length), cmp('รายการ', assessmentAll.join(' · '), items.join(' · '))];
          await showCompareTable(page, 'SBH-3139 ล้างค่ากรอง: รายการตอนเปิดหน้าต่าง เทียบหลังล้าง', ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
          await markEvidence(expected(picker.search(aDialog!), 'ว่าง'), expected(picker.items(aDialog!).first().locator('xpath=..'), `ครบ ${items.length} รายการ`));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(page);

        await startClip(page, 'TC-015');
        await soft(`${TC(15)} ค้นเนื้อหา "QA-A" → มี ${NAME.Assessment} ไม่มี General Assessment`, async () => {
          await searchTemplates(aDialog!, 'QA-A');
          const items = await readItems(aDialog!);
          note('TC-015 ผลค้น', items.join(' · ') || '(ว่าง)');
          expect(items.some((n) => n.includes(NAME.Assessment)), `Expected: มี ${NAME.Assessment}`).toBe(true);
          expect(items.some((n) => n.includes(GENERAL.Assessment)), 'Expected: ไม่มี General Assessment').toBe(false);
          await markEvidence(filled(picker.search(aDialog!), 'QA-A'), expected(picker.item(aDialog!, NAME.Assessment).first(), 'ชื่อไม่มี QA-A แต่เนื้อหามี'));
        });

        await startClip(page, 'TC-024');
        await soft(`${TC(24)} ค้น "zzqa2629none" → ไม่มี Template · พรีวิว - · ใช้ข้อความนี้กดไม่ได้`, async () => {
          await searchTemplates(aDialog!, 'zzqa2629none');
          await expect(picker.empty(aDialog!), 'Expected: ไม่มี Template').toHaveText('ไม่มี Template');
          expect(await previewText(aDialog!), 'Expected: พรีวิว -').toBe('-');
          await expect(picker.use(aDialog!), 'Expected: ใช้ข้อความนี้ disabled').toBeDisabled();
          await markEvidence(filled(picker.search(aDialog!), 'zzqa2629none'), expected(picker.empty(aDialog!), 'ไม่มี Template'), expected(picker.preview(aDialog!), '-'), expected(picker.use(aDialog!), 'กดไม่ได้'));
        });

        await startClip(page, 'TC-028-step2');
        await soft(`${TC(28)} ขั้น 2 ค้น "Inactive" → ไม่มี ${NAME.Inactive}`, async () => {
          await clearTemplateSearch(aDialog!);
          const all = await readItems(aDialog!);
          expect(all.some((n) => n.includes('Inactive')), 'Expected: รายการทั้งหมดไม่มี Template ที่ปิดใช้งาน').toBe(false);
          await searchTemplates(aDialog!, 'Inactive');
          await expect(picker.empty(aDialog!), 'Expected: ค้นแล้วแสดง ไม่มี Template').toHaveText('ไม่มี Template');
          note('TC-028 รายการก่อนค้น', all.join(' · '));
          await markEvidence(filled(picker.search(aDialog!), 'Inactive'), expected(picker.empty(aDialog!), `ไม่มี ${NAME.Inactive}`));
        });
        await picker.close(aDialog).click();
        await expect(aDialog).toBeHidden();
      }

      // ───── TC-007 / 008 ─────
      for (const [n, category] of [[7, 'Intervention'], [8, 'Evaluation']] as const) {
        await startClip(page, `TC-${pad(n)}`);
        await soft(`${TC(n)} กดไอคอน Template ช่อง ${category} → เฉพาะ Template ของ ${category}`, async () => {
          const d = await openNurseTemplateDialog(page, noteDialog, category);
          const items = await readItems(d);
          note(`TC-${pad(n)} รายการ`, items.join(' · '));
          const others = CATEGORIES.filter((c) => c !== category);
          const rows: CompareRow[] = [
            cmp(`มี ${NAME[category]}`, 'มี', items.some((x) => x.includes(NAME[category])) ? 'มี' : 'ไม่มี'),
            cmp(`มี ${GENERAL[category]}`, 'มี', items.some((x) => x.includes(GENERAL[category])) ? 'มี' : 'ไม่มี'),
            cmp(`ของ ${others.join(' / ')}`, 'ไม่มี', items.filter((x) => others.some((o) => x.includes(o))).join(', ') || 'ไม่มี'),
          ];
          await showCompareTable(page, `${ISSUE[n]} หน้าต่าง Template ช่อง ${category}`, ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
          await markEvidence(expected(d.getByText(`Nurse Note Template - ${category}`), 'หัวหน้าต่าง'), expected(picker.items(d).first().locator('xpath=..'), `เฉพาะ ${category}`));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(page);
        const d = page.getByRole('dialog', { name: `Nurse Note Template - ${category}` });
        if (await d.isVisible().catch(() => false)) await picker.close(d).click();
      }

      // ───── TC-020 Template ของแพทย์ไม่ขึ้นฝั่งพยาบาล ─────
      await startClip(page, 'TC-020');
      for (const category of CATEGORIES) {
        // ปิดหน้าต่างหลังจบขั้น — ภาพ "ผ่าน" ถ่ายตอนจบ body (ปิดใน body = กรอบลอย รอบ 31 ต.ค. 15:39)
        await soft(`${TC(20)} ช่อง ${category} ค้น "${PHYSICIAN_TEMPLATE}" (Template แพทย์) → ไม่มี Template`, async () => {
          const d = await openNurseTemplateDialog(page, noteDialog, category);
          await searchTemplates(d, PHYSICIAN_TEMPLATE);
          await expect(picker.empty(d), 'Expected: ไม่มี Template').toHaveText('ไม่มี Template');
          await markEvidence(expected(d.getByText(`Nurse Note Template - ${category}`), `ช่อง ${category}`), filled(picker.search(d), PHYSICIAN_TEMPLATE), expected(picker.empty(d), 'ไม่มี Template'));
        });
        const d = page.getByRole('dialog', { name: `Nurse Note Template - ${category}` });
        if (await d.isVisible().catch(() => false)) {
          await picker.close(d).click();
          await expect(d).toBeHidden();
        }
      }

      // ───── TC-023 ปิดโดยไม่ใช้ ─────
      await startClip(page, 'TC-023');
      await soft(`${TC(23)} พิมพ์เองในช่อง A → เลือก Template แล้วกด ปิด → ข้อความไม่เปลี่ยน`, async () => {
        await noteEditor(noteDialog, 'Assessment').click();
        await page.keyboard.type('พิมพ์เอง QA', { delay: 20 });
        const d = await openNurseTemplateDialog(page, noteDialog, 'Assessment');
        await picker.item(d, NAME.Assessment).first().click();
        await expect(picker.active(d)).toContainText(NAME.Assessment);
        await markEvidence(clicked(picker.active(d), NAME.Assessment), clicked(picker.close(d)));
        await snapEvidence(page, 'ก่อนกด — ปิด');
        await picker.close(d).click();
        await expect(d, 'Expected: หน้าต่าง Template ปิด').toBeHidden();
        await expect(noteDialog, 'Expected: หน้าต่าง Nurse Note ยังเปิดอยู่').toBeVisible();
        const text = await editorText(noteEditor(noteDialog, 'Assessment'));
        note('TC-023 ช่อง A', text);
        expect(text, 'Expected: ช่อง Assessment ยังเป็น พิมพ์เอง QA').toBe('พิมพ์เอง QA');
        await markEvidence(expected(noteEditor(noteDialog, 'Assessment'), 'ยังเป็น พิมพ์เอง QA'));
      });
      await discardNote();

      // ───── TC-010 / 011 / 012 ใช้ข้อความนี้ทีละช่อง (หน้าต่างใหม่ทุกข้อ) ─────
      for (const [n, category] of [[10, 'Assessment'], [11, 'Intervention'], [12, 'Evaluation']] as const) {
        await openNewNote();
        await startClip(page, `TC-${pad(n)}`);
        await soft(`${TC(n)} ใช้ข้อความ "${NAME[category]}" → เข้าช่อง ${category} · หน้าต่าง Template ปิด`, async () => {
          const d = await openNurseTemplateDialog(page, noteDialog, category);
          await picker.item(d, NAME[category]).first().click();
          await markEvidence(clicked(picker.active(d), NAME[category]), clicked(picker.use(d)));
          await snapEvidence(page, `ก่อนกด — ใช้ข้อความนี้ ${category}`);
          await picker.use(d).click();
          await expect(d, 'Expected: หน้าต่าง Template ปิดเอง').toBeHidden({ timeout: 10_000 });
          const got = await editorsText();
          const want = { A: '', I: '', E: '' };
          want[category[0] as 'A' | 'I' | 'E'] = TEXT[category];
          const rows = (['A', 'I', 'E'] as const).map((k) => cmp(`ช่อง ${k}`, want[k] || '(ว่าง)', got[k] || '(ว่าง)'));
          await showCompareTable(page, `${ISSUE[n]} ข้อความในช่องหลังกด ใช้ข้อความนี้`, ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
          await markEvidence(expected(noteEditor(noteDialog, category), TEXT[category]));
          expect(bad(rows)).toEqual([]);
        });
        await hideCompareTable(page);
        await discardNote();
      }

      // ───── TC-013 แทรกที่ cursor ─────
      await openNewNote();
      await startClip(page, 'TC-013');
      await soft(`${TC(13)} พิมพ์ "AAA BBB" ในช่อง I วาง cursor หลัง AAA → ใช้ข้อความ → AAAIntervention: QA-I BBB`, async () => {
        await noteEditor(noteDialog, 'Intervention').click();
        await page.keyboard.type('AAA BBB', { delay: 20 });
        await page.keyboard.press('Home');
        for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
        const d = await openNurseTemplateDialog(page, noteDialog, 'Intervention');
        await picker.item(d, NAME.Intervention).first().click();
        await markEvidence(clicked(picker.use(d)));
        await snapEvidence(page, 'ก่อนกด — ใช้ข้อความนี้ (cursor หลัง AAA)');
        await picker.use(d).click();
        await expect(d).toBeHidden({ timeout: 10_000 });
        const got = await editorText(noteEditor(noteDialog, 'Intervention'));
        const rows = [cmp('ช่อง Intervention', 'AAAIntervention: QA-I BBB', got)];
        await showCompareTable(page, 'SBH-3136 แทรกข้อความที่ cursor', ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(noteEditor(noteDialog, 'Intervention'), 'AAA + Template + BBB'));
        expect(bad(rows)).toEqual([]);
      });
      await hideCompareTable(page);
      await discardNote();

      // ───── TC-017 บันทึก Focus ด้วยข้อความ Template ─────
      let saved = false;
      await openNewNote();
      await startClip(page, 'TC-017');
      await soft(`${TC(17)} ขั้น 1-2 กรอก Focus + ใช้ Template ทั้ง 3 ช่อง + Perform time → บันทึก`, async () => {
        await noteDialog.locator('input#focus').fill(FOCUS);
        for (const c of CATEGORIES) {
          await applyTemplate(await openNurseTemplateDialog(page, noteDialog, c), NAME[c]);
          const key = c.toLowerCase();
          await noteDialog.locator(`input#${key}PerformTime`).click();
          const timePicker = page.locator('.ant-picker-dropdown:visible');
          await timePicker.locator('.ant-picker-now-btn').click();
          await expect(timePicker).toBeHidden();
        }
        await page.keyboard.press('Tab').catch(() => undefined);
        const got = await editorsText();
        note('TC-017 ก่อนบันทึก', `Focus ${FOCUS} · A ${got.A} · I ${got.I} · E ${got.E}`);
        await markEvidence(filled(noteDialog.locator('input#focus'), 'Focus'), ...CATEGORIES.map((c) => filled(noteEditor(noteDialog, c))), clicked(noteDialog.getByRole('button', { name: 'บันทึก' })));
        await snapEvidence(page, 'ก่อนกด — บันทึก Nurse Note');
        const result = await saveNurseNote(page);
        note('TC-017 ผลบันทึก', `template ${result.template ?? '-'} → HTTP ${result.status ?? '-'} · หน้าต่าง${result.closed ? 'ปิด' : 'ค้าง'} · ${result.notices.join(' | ') || '-'}`);
        const toast = nurseNoteNotice(page).filter({ hasText: 'บันทึกข้อมูลสำเร็จ' }).first();
        if (await toast.isVisible().catch(() => false)) await markEvidence(alerted(toast)).catch(() => undefined);
        expect(result.notices.join(' | '), 'Expected: แจ้งเตือน บันทึกข้อมูลสำเร็จ').toContain('บันทึกข้อมูลสำเร็จ');
        expect(result.closed, 'Expected: หน้าต่างปิด').toBe(true);
        saved = true;
      });
      if (saved)
        await soft(`${TC(17)} ขั้น 3 กางการ์ด Focus → A-I-E ตรงข้อความ Template`, async () => {
          await dismissToast(page, 'บันทึกข้อมูลสำเร็จ').catch(() => undefined);
          const card = focusCard(page, FOCUS);
          await expect(card).toBeVisible({ timeout: 30_000 });
          await expandFocus(card);
          const latest = (await readFocusNotes(card))[0] ?? { A: '', I: '', E: '' };
          const rows = [cmp('A', TEXT.Assessment, latest.A), cmp('I', TEXT.Intervention, latest.I), cmp('E', TEXT.Evaluation, latest.E)];
          await showCompareTable(page, 'SBH-3140 การ์ด Focus เทียบข้อความ Template', ['Expected', 'การ์ด Focus'], rows, { side: 'bottom' });
          await markEvidence(expected(card, 'A-I-E ตรงข้อความ Template'));
          expect(bad(rows)).toEqual([]);
        });
      await hideCompareTable(page);
      await discardNote();

      // ───── TC-018 แก้ Template แล้วหน้าต่าง Template แสดงข้อความใหม่ ─────
      let edited = false;
      await gotoNurseTemplates(page, 'Assessment');
      await startClip(page, 'TC-018');
      await soft(`${TC(18)} ขั้น 1 แก้ Template Assessment เพิ่ม EDITED QA → บันทึก`, async () => {
        const row = rowByName(page, NAME.Assessment).first();
        await expect(row).toBeVisible({ timeout: 20_000 });
        await markEvidence(clicked(row.getByRole('button', { name: 'แก้ไข' })));
        await snapEvidence(page, 'ก่อนกด — แก้ไข Template');
        await row.getByRole('button', { name: 'แก้ไข' }).click();
        await expect(settingsTitle(page)).toHaveText('แก้ไข Note Template', { timeout: 30_000 });
        await expect(form.name(page)).toHaveValue(NAME.Assessment, { timeout: 20_000 });
        await form.template(page).click();
        await page.keyboard.press('Control+End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('EDITED QA', { delay: 20 });
        await markEvidence(filled(formItem(page, 'template'), 'เพิ่ม EDITED QA'), clicked(form.save(page)));
        await snapEvidence(page, 'ก่อนกด — บันทึกการแก้ไข');
        const result = await saveTemplateForm(page);
        note('TC-018 ผลบันทึก', `HTTP ${result.mutation ?? '-'} · ${result.notices.join(' | ') || '-'}`);
        expect(result.mutation, 'UpdateNoteTemplate ต้องสำเร็จ').toBe(200);
        await expect(settingsTitle(page)).toHaveText('Nurse Note Template', { timeout: 30_000 });
        const toast = successNotice(page, 'แก้ไข Note Template สำเร็จ');
        if (await toast.isVisible().catch(() => false)) await markEvidence(alerted(toast), expected(rowByName(page, NAME.Assessment).first(), 'อัปเดตล่าสุด')).catch(() => undefined);
        edited = true;
      });
      await gotoVisit(page, visit);
      await openPanel();
      if (edited)
        await soft(`${TC(18)} ขั้น 2 หน้าต่าง Template ช่อง A → พรีวิวมี EDITED QA`, async () => {
          await openNewNote();
          const d = await openNurseTemplateDialog(page, noteDialog, 'Assessment');
          await picker.item(d, NAME.Assessment).first().click();
          await expect(picker.active(d)).toContainText(NAME.Assessment);
          await expect.poll(() => previewText(d), { message: 'Expected: พรีวิวมีบรรทัด EDITED QA' }).toContain('EDITED QA');
          note('TC-018 พรีวิว', (await previewText(d)).replace(/\n/g, ' / '));
          await markEvidence(clicked(picker.active(d), NAME.Assessment), expected(picker.preview(d), 'มี EDITED QA'));
        });
      {
        const d = page.getByRole('dialog', { name: 'Nurse Note Template - Assessment' });
        if (await d.isVisible().catch(() => false)) await picker.close(d).click();
      }
      await discardNote();

      // ───── TC-022 Note ที่บันทึกแล้วไม่เปลี่ยน ─────
      await startClip(page, 'TC-022');
      if (saved)
        await soft(`${TC(22)} กางการ์ด Focus หลังแก้ Template → A ยังเป็น ${TEXT.Assessment}`, async () => {
          const card = focusCard(page, FOCUS);
          await expandFocus(card);
          const latest = (await readFocusNotes(card))[0] ?? { A: '', I: '', E: '' };
          const rows = [cmp('A ของ Focus', TEXT.Assessment, latest.A), cmp('มีบรรทัด EDITED QA', 'ไม่มี', latest.A.includes('EDITED QA') ? 'มี' : 'ไม่มี')];
          await showCompareTable(page, 'SBH-3145 Focus ที่บันทึกแล้ว หลังแก้ Template', ['Expected', 'การ์ด Focus'], rows, { side: 'bottom' });
          await markEvidence(expected(card.locator('[class*="_nursing-note_"]').first(), 'ข้อความเดิมตอนบันทึก'));
          expect(bad(rows)).toEqual([]);
        });
      await hideCompareTable(page);

      // ───── TC-029 เพิ่มข้อมูล AIE ─────
      await startClip(page, 'TC-029');
      if (saved)
        await soft(`${TC(29)} เมนู เพิ่มข้อมูล AIE → ไอคอน 3 ช่อง · ใช้ ${NAME.Assessment} ในช่อง A`, async () => {
          const card = focusCard(page, FOCUS);
          await openFocusMenu(page, card);
          await markEvidence(clicked(focusMenuItem(page, 'เพิ่มข้อมูล AIE')));
          await snapEvidence(page, 'ก่อนกด — เพิ่มข้อมูล AIE');
          await focusMenuItem(page, 'เพิ่มข้อมูล AIE').click();
          await expect(noteDialog).toBeVisible();
          await expect(templateButtons(noteDialog), 'Expected: ไอคอน Template ครบ 3 ช่อง').toHaveCount(3);
          await markEvidence(...CATEGORIES.map((c, i) => expected(templateButtons(noteDialog).nth(i), `ไอคอน ${c[0]}`)));
          await snapEvidence(page, 'หน้าต่างเพิ่มข้อมูล AIE — ไอคอน 3 ช่อง');
          await applyTemplate(await openNurseTemplateDialog(page, noteDialog, 'Assessment'), NAME.Assessment);
          const a = await editorText(noteEditor(noteDialog, 'Assessment'));
          note('TC-029 ช่อง A', a.replace(/\n/g, ' / '));
          expect(a, 'Expected: ช่อง A แสดงข้อความของ Template').toContain(TEXT.Assessment);
          expect(a).toContain('EDITED QA');
          await markEvidence(expected(noteEditor(noteDialog, 'Assessment'), `ข้อความของ ${NAME.Assessment}`));
        });
      await discardNote();

      // ───── TC-030 Edit note ─────
      await startClip(page, 'TC-030');
      if (saved)
        await soft(`${TC(30)} Edit note → ไอคอน 3 ช่อง · วาง cursor ท้ายช่อง E แล้วใช้ ${NAME.Evaluation}`, async () => {
          const card = focusCard(page, FOCUS);
          await expandFocus(card);
          const edit = card.getByRole('button', { name: 'Edit note' }).first();
          await markEvidence(clicked(edit));
          await snapEvidence(page, 'ก่อนกด — Edit note');
          await edit.click();
          await expect(noteDialog).toBeVisible();
          await expect(templateButtons(noteDialog), 'Expected: ไอคอน Template ครบ 3 ช่อง').toHaveCount(3);
          await markEvidence(...CATEGORIES.map((c, i) => expected(templateButtons(noteDialog).nth(i), `ไอคอน ${c[0]}`)));
          await snapEvidence(page, 'หน้าต่าง Edit note — ไอคอน 3 ช่อง');
          const before = await editorText(noteEditor(noteDialog, 'Evaluation'));
          await noteEditor(noteDialog, 'Evaluation').click();
          await page.keyboard.press('Control+End');
          await applyTemplate(await openNurseTemplateDialog(page, noteDialog, 'Evaluation'), NAME.Evaluation);
          const after = await editorText(noteEditor(noteDialog, 'Evaluation'));
          const rows = [cmp('ช่อง E ก่อน', TEXT.Evaluation, before), cmp('ช่อง E หลังใช้ข้อความ', `${before}${TEXT.Evaluation}`, after)];
          await showCompareTable(page, 'SBH-3153 Edit note: แทรกท้ายช่อง Evaluation', ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
          await markEvidence(expected(noteEditor(noteDialog, 'Evaluation'), 'ต่อท้ายข้อความเดิม'));
          expect(bad(rows)).toEqual([]);
        });
      await hideCompareTable(page);
      await discardNote();

      await startClip(page, 'gap');
      await tc021();
      finish();
    },
  );
});

function columnHeadersReady(page: Page): Locator {
  return page.getByRole('main').getByRole('columnheader', { name: 'ชื่อ', exact: true }).first();
}
