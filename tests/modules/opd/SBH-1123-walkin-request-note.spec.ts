import type { Locator, Page, Request, Response } from '@playwright/test';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { openNewVisitPanel, registerPatient } from '../../../helpers/functions/reception';
import { expect, test } from '../../../mock-data/fixtures';
import { notices, recordNotices } from '../../../helpers/functions/notices';

// การ์ด SBH-1123 [Walk-in Request] Note กดไม่ได้ แก้ไขให้มี note ของการ walk-in — EXE SBH-2856 → HPY SBH-2857 (TC-001–004 = SBH-2859–2862) · UHP SBH-2858 (TC-005–006 = SBH-2863–2864)
// สิ่งที่ dev ทำ (คอมเมนต์ 28 ส.ค. 2026 + ไฟล์แอป dev-x index-Di8KCQVO.js 21 ต.ค. 2026):
//   หน้าจัดการ Visit คอลัมน์ "Note/Remark" = ช่องกรอก (aria-label "หมายเหตุ") เฉพาะแถว "คำขอ Walk-in" ที่ยังไม่สร้าง → CreateVisit ส่ง `walkInTarget.note`
//   รายการผู้ป่วยนอก แท็บ "คำขอ Walk-in" คอลัมน์ Note/Remark (td `_note-remark-cell_` ellipsis) แสดงข้อความ · ไม่กรอก = "-"
// Walk-in ไป "SBH - ห้องตรวจสระบุรี" (ไม่มีตารางแพทย์ → ได้แถว "คำขอ Walk-in") · ผู้ป่วย AUTO ใหม่ที่เวชระเบียน (R10 / R53) · ไม่ลงตาราง ไม่ปิด Visit (R11)
// 3 เทส: ผู้ป่วย A 001 → 002 → 004 → 005 · ผู้ป่วย B (Note 200 ตัวอักษร) 006 · ผู้ป่วย C (ไม่กรอก) 003 — ตามลำดับ EXE · คลิป 1 ไฟล์ต่อ TC (R61) · TC ที่ไม่ผ่านไม่หยุดเทส
// รัน dev-x: npx playwright test --headed --grep @SBH-1123 --output=.cache/run-1123   (ทีละเทส: --grep @SBH-2859 · @SBH-2864 · @SBH-2861)

const CLINIC = { search: 'SBH', name: 'SBH - ห้องตรวจสระบุรี', short: 'ห้องตรวจสระบุรี' };
const NOTE_SHORT = 'ทดสอบใส่ note';
// 200 ตัวอักษร (ไทย + อังกฤษ + ตัวเลข) ไม่มีช่องว่างยาว — ให้เห็นว่าข้อความยาวล้นคอลัมน์ไหม
const NOTE_LONG = (() => {
  const unit = 'ผู้ป่วยมาขอรับบริการเพิ่ม Walk-in ทดสอบข้อความยาว 1234567890 ';
  let s = '';
  while (s.length < 200) s += unit;
  return s.slice(0, 200);
})();
const TC = {
  '001': 'TC-001 (SBH-2859)',
  '002': 'TC-002 (SBH-2860)',
  '003': 'TC-003 (SBH-2861)',
  '004': 'TC-004 (SBH-2862)',
  '005': 'TC-005 (SBH-2863)',
  '006': 'TC-006 (SBH-2864)',
} as const;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/** แถวของตาราง "รายการเข้ารับบริการ" ในแผงจัดการ Visit ที่เป็นคำขอ Walk-in */
function visitTable(page: Page): Locator {
  return page.getByRole('main').getByRole('table').filter({ hasText: 'Note/Remark' }).filter({ hasText: 'ประเภท' }).first();
}

/**
 * หน้าจัดการ Visit: เลือก Walk-in ไป SBH - ห้องตรวจสระบุรี → แถว "คำขอ Walk-in" → กรอก Note/Remark (ถ้ามี) → สร้าง
 * คืน VN / EN + note ที่ส่งไปใน CreateVisit (`walkInTarget.note`) + ข้อความในช่อง Note/Remark ของแผงหลังสร้าง
 */
async function createWalkInRequest(page: Page, note: string | null, label: string) {
  const main = page.getByRole('main');
  const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
  const clinic = main.locator('.ant-select').filter({ hasText: /^คลินิก$/ }).getByRole('combobox');
  await clinic.fill(CLINIC.search);
  const option = options.filter({ hasText: CLINIC.name }).first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await markEvidence(filled(clinic), clicked(option));
  await snapEvidence(page, `ก่อนกด — Walk-in ไป ${CLINIC.short} (${label})`);
  await option.click();

  const row = visitTable(page).getByRole('row').filter({ hasText: 'คำขอ Walk-in' }).first();
  await expect(row, 'เลือกคลินิกแล้วต้องได้แถวประเภท "คำขอ Walk-in"').toBeVisible({ timeout: 30_000 });
  const input = row.getByRole('textbox', { name: 'หมายเหตุ' });
  await expect(input, 'แถวคำขอ Walk-in ต้องมีช่องกรอก Note/Remark').toBeVisible();
  const header = visitTable(page).getByRole('columnheader', { name: 'Note/Remark' });
  if (note !== null) {
    await input.fill(note);
    await expect(input).toHaveValue(note);
  }
  const create = main.getByRole('button', { name: 'สร้าง', exact: true });
  await markEvidence(expected(header), note !== null ? filled(input) : expected(input), clicked(create));
  await snapEvidence(page, `ก่อนกด — สร้างคำขอ Walk-in (${label})`);

  const created = page.waitForResponse((res) => res.url().endsWith('/graphql') && /mutation\s+CreateVisit/.test(res.request().postData() ?? ''), { timeout: 60_000 });
  const noticesBefore = (await notices(page)).length;
  await create.click();
  const res: Response = await created;
  expect(res.ok(), `CreateVisit ${res.status()}`).toBe(true);
  const payload = (res.request().postDataJSON() as { variables?: unknown }).variables;
  const sentNote = JSON.stringify(payload).match(/"walkInTarget":\{[^}]*"note":"((?:[^"\\]|\\.)*)"/)?.[1];
  const body = (await res.json()) as { data?: { createVisit?: { visit?: { vn: string; encounters: { en: string }[] } } }; errors?: { message: string }[] };
  const visit = body.data?.createVisit?.visit;
  expect(visit?.vn, `สร้างคำขอ Walk-in ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ') ?? ''}`).toBeTruthy();
  await test.info().attach(`CreateVisit (${label})`, { body: JSON.stringify({ variables: payload, data: body.data }, null, 2), contentType: 'application/json' });

  // หลังสร้าง แผงเปลี่ยนเป็น "แก้ไข Visit"
  const editRow = visitTable(page).getByRole('row').filter({ hasText: 'คำขอ Walk-in' }).first();
  await expect(editRow).toBeVisible({ timeout: 30_000 });
  await expect(editRow.getByRole('textbox', { name: 'หมายเหตุ' }), 'สร้างแล้วช่อง Note/Remark ต้องไม่ใช่ช่องกรอกแล้ว').toHaveCount(0, { timeout: 15_000 });
  await page.waitForTimeout(1_500);
  const headers = (await visitTable(page).locator('thead th').allInnerTexts()).map(squash);
  const cells = (await editRow.locator('td').allInnerTexts()).map(squash);
  const panelNote = cells[headers.indexOf('Note/Remark')] ?? '';
  const after = (await notices(page)).slice(noticesBefore);
  return { vn: visit!.vn, en: visit!.encounters[0]?.en ?? '', sentNote: sentNote === undefined ? null : JSON.parse(`"${sentNote}"`) as string, panelNote, editRow, headers, notices: after };
}

/** รายการผู้ป่วยนอก (แผนกอายุรกรรม) → แท็บ "คำขอ Walk-in" → ค้น HN → แถว + หัวคอลัมน์ */
async function openWalkInTab(page: Page, hn?: string) {
  const main = page.getByRole('main');
  if (!/\/opd\/patient-list/.test(page.url())) await selectOpdUnit(page);
  const tab = main.getByRole('tab', { name: /คำขอ Walk-in|walk-in-request/ });
  const search = main.getByPlaceholder('ค้นหา HN');
  const row = main.locator('tr.ant-table-row').filter({ hasText: `HN ${hn}` }).first();
  await expect(async () => {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
    await search.fill(hn ?? '');
    await search.press('Enter');
    if (hn) await expect(row).toBeVisible({ timeout: 15_000 });
    else await expect(main.locator('tr.ant-table-row').first()).toBeVisible({ timeout: 15_000 });
  }, `ต้องเห็นแถวของ HN ${hn} ในแท็บคำขอ Walk-in`).toPass({ timeout: 120_000 });
  const headers = (await main.locator('thead th').filter({ visible: true }).allInnerTexts()).map(squash);
  return { tab, row, headers, search };
}

/** เซลล์ของแถวตามชื่อหัวคอลัมน์ (หัว Refer-in ของรุ่นนี้แสดงเป็น referInLabel) */
function cellOf(row: Locator, headers: string[], name: RegExp): Locator {
  const index = headers.findIndex((h) => name.test(h));
  if (index < 0) throw new Error(`ไม่มีคอลัมน์ ${name} — หัวคอลัมน์ที่มี: ${headers.join(' | ')}`);
  return row.locator('td').nth(index);
}
const REFER_IN = /^(Refer-in|referInLabel)$/i;
const NOTE_COL = /^Note\/Remark$/;

test.describe('SBH-1123 Note/Remark ของคำขอ Walk-in', () => {
  test(
    'ผู้ป่วย A: กรอก Note ตอนสร้างคำขอ Walk-in → แท็บคำขอ Walk-in แสดง Note · คอลัมน์ต่อจาก Refer-in · ไม่มีไอคอน Note ที่กดไม่ได้',
    { tag: ['@SBH-1123', '@SBH-2859', '@SBH-2860', '@SBH-2862', '@SBH-2863'], annotation: ['SBH-1123', 'SBH-2856', 'SBH-2859', 'SBH-2860', 'SBH-2862', 'SBH-2863'].map(linear) },
    async ({ page }) => {
      test.setTimeout(900_000);
      const main = page.getByRole('main');
      const { note, soft, finish } = makeRunner(page);
      await page.addInitScript(recordNotices);
      let hn = '';
      let newVisitEnabled = true;
      let created: Awaited<ReturnType<typeof createWalkInRequest>> | undefined;

      await checkStep(page, 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน (ผู้ป่วย A)', async () => {
        const p = await registerPatient(page, 'Note1123A', { snapName: 'ก่อนกด — บันทึกผู้ป่วยใหม่ Note1123A' });
        hn = p.hn;
        newVisitEnabled = p.newVisitEnabled;
        note('ผู้ป่วย A', `${p.name} · HN ${hn}`);
      });

      // ── TC-001 ──
      await startClip(page, 'TC-001');
      await soft(`${TC['001']} ขั้น 1–3 จัดการ Visit → คำขอ Walk-in → กรอก Note/Remark → สร้าง`, async () => {
        if (newVisitEnabled) await openNewVisitPanel(page);
        else await page.goto(`/cortex/next/patients/${hn}?actions=createVisit`);
        await expect(main.getByText(/^รายการเข้ารับบริการ/)).toBeVisible({ timeout: 60_000 });
        created = await createWalkInRequest(page, NOTE_SHORT, 'ผู้ป่วย A');
        note('ผู้ป่วย A Visit', `${created.vn} · ${created.en} · คำขอ Walk-in ${CLINIC.name} · Note ที่ส่งใน CreateVisit = "${created.sentNote}"`);
        if (created.notices.length) note('แจ้งเตือนหลังสร้าง (ผู้ป่วย A)', created.notices.join(' · '));
        note('ข้อสังเกต (นอก TC) แผงแก้ไข Visit หลังสร้าง', `ช่อง Note/Remark ของแถวคำขอ Walk-in แสดง "${created.panelNote}"`);
        const rows: CompareRow[] = [
          { label: 'Note/Remark', values: [NOTE_SHORT, created.sentNote ?? '(ไม่มี)'], same: created.sentNote === NOTE_SHORT },
          { label: 'สร้างคำขอ Walk-in', values: ['สำเร็จ (ได้ VN / EN)', `${created.vn} · ${created.en}`], same: !!created.vn && !!created.en },
        ];
        await showCompareTable(page, `${TC['001']} สิ่งที่กรอก เทียบ คำสั่ง CreateVisit`, ['ที่กรอก / Expected', 'CreateVisit'], rows, { side: 'bottom' });
        await markEvidence(expected(created.editRow));
        await holdForClip(page);
        expect(created.sentNote, 'Note ที่กรอกต้องถูกส่งไปกับคำขอ Walk-in').toBe(NOTE_SHORT);
      });
      await hideCompareTable(page);

      // ── TC-002 ──
      await startClip(page, 'TC-002');
      await soft(`${TC['002']} ขั้น 1–3 รายการผู้ป่วยนอก แท็บคำขอ Walk-in → Note/Remark ตรงกับที่กรอก`, async () => {
        const { row, headers } = await openWalkInTab(page, hn);
        const cell = cellOf(row, headers, NOTE_COL);
        const shown = squash(await cell.innerText());
        const rows: CompareRow[] = [{ label: 'Note/Remark', values: [NOTE_SHORT, created?.sentNote ?? '-', shown], same: shown === NOTE_SHORT }];
        await showCompareTable(page, `${TC['002']} Note/Remark: ที่กรอก / CreateVisit / แท็บคำขอ Walk-in`, ['ที่กรอก', 'CreateVisit', 'แท็บคำขอ Walk-in'], rows, { side: 'bottom' });
        await markEvidence(expected(main.locator('thead th').filter({ hasText: NOTE_COL })), expected(row.getByText(`HN ${hn}`)), expected(cell));
        await holdForClip(page);
        expect(shown).toBe(NOTE_SHORT);
      });
      await hideCompareTable(page);

      // ── TC-004 ──
      await startClip(page, 'TC-004');
      await soft(`${TC['004']} ขั้น 1–2 แท็บคำขอ Walk-in → ลำดับหัวคอลัมน์`, async () => {
        const { headers } = await openWalkInTab(page, hn);
        const referIndex = headers.findIndex((h) => REFER_IN.test(h));
        const noteIndex = headers.findIndex((h) => NOTE_COL.test(h));
        note(`${TC['004']} หัวคอลัมน์`, headers.filter(Boolean).join(' | '));
        const referHeader = main.locator('thead th').filter({ visible: true }).nth(referIndex);
        const noteHeader = main.locator('thead th').filter({ visible: true }).nth(noteIndex);
        const rows: CompareRow[] = [
          { label: 'คอลัมน์ก่อน Note/Remark', values: ['Refer-in', headers[noteIndex - 1] ?? '-'], same: noteIndex > 0 && noteIndex === referIndex + 1 },
          { label: 'ชื่อหัวคอลัมน์ Refer-in', values: ['Refer-in', headers[referIndex] ?? '-'], same: headers[referIndex] === 'Refer-in' },
        ];
        await showCompareTable(page, `${TC['004']} ลำดับหัวคอลัมน์ (ตำแหน่ง ${referIndex + 1} → ${noteIndex + 1})`, ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(referHeader), expected(noteHeader));
        await holdForClip(page);
        expect(referIndex, 'ต้องมีคอลัมน์ Refer-in').toBeGreaterThanOrEqual(0);
        expect(noteIndex, 'คอลัมน์ Note/Remark ต้องอยู่ถัดจาก Refer-in').toBe(referIndex + 1);
        if (headers[referIndex] !== 'Refer-in') note(`ข้อสังเกต ${TC['004']}`, `หัวคอลัมน์ Refer-in แสดงเป็นคีย์ "${headers[referIndex]}" (ยังไม่แปลเป็นข้อความ)`);
      });
      await hideCompareTable(page);

      // ── TC-005 ──
      await startClip(page, 'TC-005');
      await soft(`${TC['005']} ขั้น 1–2 แท็บคำขอ Walk-in → ทุกคอลัมน์ไม่มีไอคอน Note · กดในคอลัมน์ Note/Remark ไม่มีอะไรเกิด`, async () => {
        const { row, headers, search } = await openWalkInTab(page, hn);
        const cell = cellOf(row, headers, NOTE_COL);
        const mutations: string[] = [];
        const listen = (req: Request) => {
          if (/mutation\s/.test(req.postData() ?? '')) mutations.push((req.postData() ?? '').match(/mutation\s+(\w+)/)?.[1] ?? '?');
        };
        page.on('request', listen);
        const url = page.url();
        await markEvidence(clicked(cell.locator('span').first()));
        await snapEvidence(page, `ก่อนกด — คลิกข้อความในคอลัมน์ Note/Remark`);
        await cell.locator('span').first().click();
        await page.waitForTimeout(2_000);
        page.off('request', listen);
        const dialogs = await page.getByRole('dialog').filter({ visible: true }).count();
        const popovers = await page.locator('.ant-popover:visible, .ant-dropdown:visible, .ant-modal-wrap:visible').count();
        const iconsInCell = await cell.locator('button, [role="img"], .anticon, a').count();

        // ทุกแถวในแท็บ (ไม่กรอง HN) — คอลัมน์ Note/Remark ไม่มีปุ่ม / ไอคอน · ไม่มีหัวคอลัมน์ "Note" อื่น
        await search.fill('');
        await search.press('Enter');
        await page.waitForTimeout(3_000);
        const allRows = main.locator('tr.ant-table-row').filter({ visible: true });
        const total = await allRows.count();
        let rowsWithIcon = 0;
        const sample: string[] = [];
        for (let i = 0; i < total; i++) {
          const c = allRows.nth(i).locator('td').nth(headers.findIndex((h) => NOTE_COL.test(h)));
          if (await c.locator('button, [role="img"], .anticon, a').count()) rowsWithIcon++;
          if (sample.length < 5) sample.push(squash(await c.innerText()) || '(ว่าง)');
        }
        const noteHeaders = headers.filter((h) => /note/i.test(h));
        note(`${TC['005']} ตรวจทุกแถว`, `${total} แถวในหน้าแรกของแท็บ · คอลัมน์ Note/Remark มีปุ่ม/ไอคอน ${rowsWithIcon} แถว · ตัวอย่างค่า: ${sample.join(' / ')} · หัวคอลัมน์ที่มีคำว่า Note: ${noteHeaders.join(', ')}`);
        const rows: CompareRow[] = [
          { label: 'ปุ่ม / ไอคอนในเซลล์ Note/Remark (ผู้ป่วย A)', values: ['0', String(iconsInCell)], same: iconsInCell === 0 },
          { label: `ปุ่ม / ไอคอนในคอลัมน์ Note/Remark (${total} แถว)`, values: ['0', String(rowsWithIcon)], same: rowsWithIcon === 0 },
          { label: 'หัวคอลัมน์ที่มีคำว่า Note', values: ['Note/Remark', noteHeaders.join(', ')], same: noteHeaders.length === 1 },
          { label: 'กดข้อความ Note แล้ว: หน้าต่าง / เมนูเปิด', values: ['ไม่มี', String(dialogs + popovers)], same: dialogs + popovers === 0 },
          { label: 'กดข้อความ Note แล้ว: คำสั่งเขียนข้อมูล', values: ['ไม่มี', mutations.join(', ') || 'ไม่มี'], same: mutations.length === 0 },
          { label: 'กดข้อความ Note แล้ว: URL เปลี่ยน', values: ['ไม่เปลี่ยน', page.url() === url ? 'ไม่เปลี่ยน' : page.url()], same: page.url() === url },
        ];
        await showCompareTable(page, `${TC['005']} ไม่มี Action Note ที่กดไม่ได้`, ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(main.locator('thead th').filter({ hasText: NOTE_COL })));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);
      finish();
    },
  );

  test(
    'ผู้ป่วย B: Note/Remark ยาว 200 ตัวอักษร ไม่ทับคอลัมน์คัดกรอง / จัดการ และยังกดปุ่มในแถวได้',
    { tag: ['@SBH-1123', '@SBH-2864'], annotation: ['SBH-1123', 'SBH-2856', 'SBH-2864'].map(linear) },
    async ({ page }) => {
      test.setTimeout(600_000);
      const main = page.getByRole('main');
      const { note, soft, finish } = makeRunner(page);
      await page.addInitScript(recordNotices);
      let hn = '';
      let newVisitEnabled = true;
      await checkStep(page, 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน (ผู้ป่วย B)', async () => {
        const p = await registerPatient(page, 'Note1123B', { snapName: 'ก่อนกด — บันทึกผู้ป่วยใหม่ Note1123B' });
        hn = p.hn;
        newVisitEnabled = p.newVisitEnabled;
        note('ผู้ป่วย B', `${p.name} · HN ${hn}`);
      });

      await startClip(page, 'TC-006');
      await soft(`${TC['006']} ขั้น 1 สร้างคำขอ Walk-in กรอก Note ยาว ${NOTE_LONG.length} ตัวอักษร`, async () => {
        if (newVisitEnabled) await openNewVisitPanel(page);
        else await page.goto(`/cortex/next/patients/${hn}?actions=createVisit`);
        await expect(main.getByText(/^รายการเข้ารับบริการ/)).toBeVisible({ timeout: 60_000 });
        const created = await createWalkInRequest(page, NOTE_LONG, 'ผู้ป่วย B');
        note('ผู้ป่วย B Visit', `${created.vn} · ${created.en} · Note ที่ส่ง ${created.sentNote?.length ?? 0} ตัวอักษร`);
        expect(created.sentNote, 'Note ยาวต้องถูกส่งครบ').toBe(NOTE_LONG);
      });
      await soft(`${TC['006']} ขั้น 2 แท็บคำขอ Walk-in → Note อยู่ในคอลัมน์ ไม่ทับคัดกรอง / จัดการ · ปุ่มในแถวกดได้`, async () => {
        const { row, headers } = await openWalkInTab(page, hn);
        const cell = cellOf(row, headers, NOTE_COL);
        const screening = cellOf(row, headers, /^คัดกรอง$/);
        const manage = cellOf(row, headers, /^จัดการ$/);
        const screeningButton = screening.getByRole('button').first();
        const scheduleButton = manage.getByRole('button', { name: /ลงตาราง/ });
        const fullText = squash((await cell.textContent()) ?? '');
        const geo = await cell.evaluate((td) => {
          const r = td.getBoundingClientRect();
          const s = getComputedStyle(td);
          return { right: r.right, height: r.height, truncated: td.scrollWidth > td.clientWidth, overflow: s.overflow, ellipsis: s.textOverflow, title: td.getAttribute('title') ?? '' };
        });
        const screenLeft = (await screening.boundingBox())!.x;
        // จุดกลางของปุ่ม: ต้องเป็นตัวปุ่ม (ไม่ใช่ข้อความ Note ทับ)
        const hit = async (button: Locator) =>
          button.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return !!top && (el === top || el.contains(top));
          });
        const screeningHit = await hit(screeningButton);
        const scheduleHit = await hit(scheduleButton);
        await screeningButton.click({ trial: true });
        await scheduleButton.click({ trial: true });
        const otherRowHeight = await main.locator('tr.ant-table-row').filter({ hasNotText: `HN ${hn}` }).first().evaluate((tr) => tr.getBoundingClientRect().height).catch(() => 0);
        const rowHeight = await row.evaluate((tr) => tr.getBoundingClientRect().height);
        // วางเมาส์บนข้อความ — มี tooltip / title ให้อ่านข้อความเต็มไหม (ข้อสังเกต)
        await cell.hover();
        await page.waitForTimeout(1_200);
        const tooltip = await page.locator('.ant-tooltip:visible').innerText().catch(() => '');
        note(`ข้อสังเกต ${TC['006']}`, `เซลล์ตัดข้อความด้วย … (${geo.ellipsis}) · ข้อความเต็มอยู่ใน DOM ${fullText.length} ตัวอักษร · วางเมาส์: ${tooltip ? `tooltip "${tooltip.slice(0, 40)}…"` : geo.title ? 'มี title' : 'ไม่มี tooltip / title ให้อ่านข้อความเต็ม'}`);
        await page.mouse.move(10, 600);
        const rows: CompareRow[] = [
          { label: 'Note อยู่ในคอลัมน์ Note/Remark (ตัด … ไม่ล้น)', values: ['ใช่', geo.truncated && geo.ellipsis === 'ellipsis' ? 'ตัด …' : `ไม่ตัด (${geo.ellipsis})`], same: geo.ellipsis === 'ellipsis' },
          { label: 'ขอบขวาเซลล์ Note ≤ ขอบซ้ายคอลัมน์คัดกรอง', values: ['ใช่', `${Math.round(geo.right)} ≤ ${Math.round(screenLeft)}`], same: geo.right <= screenLeft + 1 },
          { label: 'ปุ่มคัดกรองไม่ถูกทับ (กดได้)', values: ['ใช่', screeningHit ? 'ใช่' : 'ถูกทับ'], same: screeningHit },
          { label: 'ปุ่มลงตารางไม่ถูกทับ (กดได้)', values: ['ใช่', scheduleHit ? 'ใช่' : 'ถูกทับ'], same: scheduleHit },
          { label: 'ความสูงแถว (เทียบแถวอื่น)', values: [otherRowHeight ? `${Math.round(otherRowHeight)} px` : '-', `${Math.round(rowHeight)} px`], same: !otherRowHeight || Math.abs(rowHeight - otherRowHeight) < 4 },
          { label: 'ข้อความที่เก็บ = ที่กรอก', values: [`${NOTE_LONG.length} ตัวอักษร`, `${fullText.length} ตัวอักษร`], same: fullText === NOTE_LONG },
        ];
        await showCompareTable(page, `${TC['006']} Note ยาว ${NOTE_LONG.length} ตัวอักษร`, ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(cell), expected(screeningButton), expected(scheduleButton));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);
      finish();
    },
  );

  test(
    'ผู้ป่วย C: ไม่กรอก Note/Remark → แท็บคำขอ Walk-in แสดง "-"',
    { tag: ['@SBH-1123', '@SBH-2861'], annotation: ['SBH-1123', 'SBH-2856', 'SBH-2861'].map(linear) },
    async ({ page }) => {
      test.setTimeout(600_000);
      const main = page.getByRole('main');
      const { note, soft, finish } = makeRunner(page);
      await page.addInitScript(recordNotices);
      let hn = '';
      let newVisitEnabled = true;
      await checkStep(page, 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน (ผู้ป่วย C)', async () => {
        const p = await registerPatient(page, 'Note1123C', { snapName: 'ก่อนกด — บันทึกผู้ป่วยใหม่ Note1123C' });
        hn = p.hn;
        newVisitEnabled = p.newVisitEnabled;
        note('ผู้ป่วย C', `${p.name} · HN ${hn}`);
      });

      await startClip(page, 'TC-003');
      await soft(`${TC['003']} ขั้น 1 สร้างคำขอ Walk-in โดยไม่กรอก Note/Remark`, async () => {
        if (newVisitEnabled) await openNewVisitPanel(page);
        else await page.goto(`/cortex/next/patients/${hn}?actions=createVisit`);
        await expect(main.getByText(/^รายการเข้ารับบริการ/)).toBeVisible({ timeout: 60_000 });
        const created = await createWalkInRequest(page, null, 'ผู้ป่วย C');
        note('ผู้ป่วย C Visit', `${created.vn} · ${created.en} · Note ที่ส่ง = ${created.sentNote === null ? '(ไม่มี)' : `"${created.sentNote}"`}`);
      });
      await soft(`${TC['003']} ขั้น 2–3 แท็บคำขอ Walk-in → Note/Remark แสดง "-"`, async () => {
        const { row, headers } = await openWalkInTab(page, hn);
        const cell = cellOf(row, headers, NOTE_COL);
        const shown = squash(await cell.innerText());
        const iconsInCell = await cell.locator('button, [role="img"], .anticon, a').count();
        const rows: CompareRow[] = [
          { label: 'Note/Remark', values: ['-', shown || '(ว่าง)'], same: shown === '-' },
          { label: 'ปุ่ม / ไอคอนให้คลิกดู', values: ['ไม่มี', iconsInCell ? `${iconsInCell} ตัว` : 'ไม่มี'], same: iconsInCell === 0 },
        ];
        await showCompareTable(page, `${TC['003']} ไม่กรอก Note`, ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(main.locator('thead th').filter({ hasText: NOTE_COL })), expected(row.getByText(`HN ${hn}`)), expected(cell));
        await holdForClip(page);
        expect(shown).toBe('-');
      });
      await hideCompareTable(page);
      finish();
    },
  );
});
