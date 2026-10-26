import type { Locator, Page } from '@playwright/test';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { capturePrintJobs, hidePdf, pdfLineAt, pdfPages, showPdf, type PrintJob } from '../../../helpers/functions/print-capture';
import { expectPatientInfo, fillNewPatientForm, gotoReception, openNewVisitPanel, saveNewPatient } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit } from '../../../mock-data/uat-er';

// การ์ด SBH-694 [OPD][Appointment] ใบนัดหมาย — สถานที่ให้บริการ / คำแนะนำการให้บริการ · EXE SBH-2907 → HPY SBH-2908 → TC-001–012 = SBH-2909–2920
// สิ่งที่ระบบทำ (ไฟล์แอป dev-x index-lxAFBBM4.js 23 ต.ค. 2026):
//   ใบนัด (formTemplateId default_appointment_slip) ดึง "สถานที่ให้บริการ" จาก locationDescription ของหน่วยบริการ (queue service unit) ที่ตารางแพทย์ของนัดผูกอยู่
//   ช่อง "คำแนะนำการให้บริการ" ในแผงสร้างนัดหมาย = editor (tiptap) แท็บ ภาษาไทย / ภาษาอังกฤษ · Shortcut `/` (label appointment-instructions) · บันทึกเป็น serviceInstruction {th, en}
//   ค่าตั้งต้นของคำแนะนำ = appointmentInstruction ของหน่วยบริการ (โหลดเมื่อคลินิกมี queueServiceUnitId) — dev-x ณ วันทดสอบช่องว่างทุกคลินิกที่ลอง
// ข้อมูลบน dev-x ไม่ตรง Expected (สถานที่ = ข้อความตัวอย่างเดียวกันทุกหน่วยบริการ ไม่ใช่ Pattern "ชื่อคลินิก, อาคาร, ชั้น") → ผู้ใช้ตอบ "รันกับข้อมูลที่มี" ตัดสินหลังเห็นผล
// TC-007–010 อ้างถึงข้อความ Default 2 บรรทัด → ช่องว่าง จึงพิมพ์ 2 บรรทัดนั้นเองก่อน (บอกในผล)
// คลินิก A = MED ห้องตรวจโรคอายุรกรรมทั่วไป (หน่วยบริการ 4 แผนกอายุรกรรม) · คลินิก B = AFI ห้องตรวจโรคอายุรกรรม - ไข้ (หน่วยบริการ 325 คลินิกไข้ ชั้น 1)
// ผู้ป่วย AUTO ใหม่ที่เวชระเบียน + Visit OPD + เช็คอิน (R10 / R53) · ไม่ปิด Visit (R11) · บัญชี Super_User (user1 = แพทย์ นาย ทดสอบ มานะ) · คลิป 1 ไฟล์ต่อ TC (R61) · TC ที่ไม่ผ่านไม่หยุดเทส
// งานพิมพ์ดักด้วย capturePrintJobs (ไม่มี print agent)
// รัน dev-x: npx playwright test --headed --grep @SBH-694 --project=chrome --no-deps --output=.cache/run-694

const CLINIC_A = { search: 'อายุรกรรมทั่วไป', name: 'ห้องตรวจโรคอายุรกรรมทั่วไป', qsu: 4 };
const CLINIC_B = { search: 'ไข้', name: 'ห้องตรวจโรคอายุรกรรม - ไข้', qsu: 325 };
const SERVICE = 'ติดตามอาการ';
const DEFAULT_LINES = ['ชั่งน้ำหนักวัดความดัน', 'นั่งรอเรียกคิวหน้าห้องตรวจ'];
const EDITED_LINE = 'ชั่งน้ำหนักวัดความดันก่อนพบแพทย์';
const ADDED_LINE = 'งดน้ำงดอาหารหลังเที่ยงคืน';
const LOCATION_PATTERN = /^[^,]+,\s*อาคาร[^,]*,\s*ชั้น\s*\S+/;
const TC = {
  '001': 'TC-001 (SBH-2909)',
  '002': 'TC-002 (SBH-2910)',
  '003': 'TC-003 (SBH-2911)',
  '004': 'TC-004 (SBH-2912)',
  '005': 'TC-005 (SBH-2913)',
  '006': 'TC-006 (SBH-2914)',
  '007': 'TC-007 (SBH-2915)',
  '008': 'TC-008 (SBH-2916)',
  '009': 'TC-009 (SBH-2917)',
  '010': 'TC-010 (SBH-2918)',
  '011': 'TC-011 (SBH-2919)',
  '012': 'TC-012 (SBH-2920)',
} as const;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();
const splitLines = (text: string | null | undefined) => (text ?? '').split(/\\n|\n/).map((s) => s.trim()).filter(Boolean);

interface Qsu {
  id: number;
  name: string;
  location: string[];
  instruction: string[];
}
/** หน่วยบริการ (อ่านอย่างเดียว · graphql queueServiceUnits) → สถานที่ให้บริการ / คำแนะนำตั้งต้น เป็นรายการบรรทัด */
async function fetchQsu(page: Page, authorization: string, ids: number[]): Promise<Record<number, Qsu>> {
  const res = await page.request.post('/cortex-api/graphql', {
    headers: { authorization, 'content-type': 'application/json' },
    data: { query: `query{ queueServiceUnits(ids:[${ids.join(',')}]){ data{ id info{ th{ name } } locationDescription locationDescriptionInfo{ th } appointmentInstruction{ th } } } }` },
  });
  const body = (await res.json()) as { data?: { queueServiceUnits?: { data: { id: number; info?: { th?: { name?: string } }; locationDescription?: string; locationDescriptionInfo?: { th?: string }; appointmentInstruction?: { th?: string } }[] } } };
  const out: Record<number, Qsu> = {};
  for (const u of body.data?.queueServiceUnits?.data ?? [])
    out[u.id] = { id: u.id, name: u.info?.th?.name ?? '', location: splitLines(u.locationDescriptionInfo?.th ?? u.locationDescription), instruction: splitLines(u.appointmentInstruction?.th) };
  return out;
}

const options = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');
/** แผงสร้างนัดหมาย (div ชั้นในสุดที่มีปุ่ม Submit + ช่องประเภทบริการ) */
const apptPanel = (page: Page) =>
  page.getByRole('main').locator('div').filter({ has: page.getByRole('button', { name: /Submit/ }) }).filter({ has: page.locator('.ant-select[name="serviceType"]') }).last();
const apptItem = (page: Page, label: string) => apptPanel(page).locator('.ant-form-item').filter({ has: page.locator(`label:text-is("${label}")`) }).first();
const instructionEditor = (page: Page) => page.getByRole('textbox', { name: 'คำแนะนำการให้บริการ: ภาษาไทย' });
/** กรอบที่มองเห็นของช่องคำแนะนำ (editor ข้างในสูงกว่ากรอบเมื่อมี scroll → กรอบหลักฐานลอยเกินช่อง) */
const editorBox = (page: Page) => instructionEditor(page).locator('xpath=ancestor::div[contains(@class,"editor-container")][1]');
const paragraphs = (editor: Locator) => editor.locator('p').evaluateAll((ps) => ps.map((p) => (p.textContent ?? '').trim()).filter(Boolean));

/** ปิดแท็บแผงสร้างนัดหมายเดิม (ถ้ามี) แล้วเปิดใหม่จากเมนูขวา */
async function openCreatePanel(page: Page) {
  const tab = page.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: /^สร้างนัดหมาย$/ });
  if (await tab.count()) {
    await tab.hover();
    await tab.locator('.dv-default-tab-action').click({ force: true });
    await expect(tab).toHaveCount(0);
  }
  await page.getByRole('menuitem', { name: /สร้างนัดหมาย$/ }).click({ force: true });
  await expect(apptPanel(page).locator('.ant-select[name="serviceType"]')).toBeVisible({ timeout: 60_000 });
  await page.mouse.move(900, 700);
  await apptPanel(page).getByText('สร้างนัดหมาย', { exact: true }).first().click();
  await expect(instructionEditor(page)).toBeVisible({ timeout: 30_000 });
}

async function chooseClinic(page: Page, clinic: typeof CLINIC_A) {
  const item = apptItem(page, 'คลินิก/หน่วยบริการ:');
  if ((await item.innerText()).includes(clinic.name)) return;
  await item.locator('.ant-select').click();
  await page.keyboard.type(clinic.search, { delay: 40 });
  const opt = options(page).filter({ hasText: new RegExp(`^${clinic.name.replace(/[-()]/g, '\\$&')}$`) }).first();
  await expect(opt).toBeVisible({ timeout: 20_000 });
  await opt.click();
  await expect(item).toContainText(clinic.name);
}

/** ประเภทบริการ + ช่วงเวลา (ช่วงที่เลือกให้ / ช่วงแรกที่กดได้) → Submit → (มีนัดวันเดียวกัน) ยืนยันทำนัดหมายซ้ำ → คืนค่าที่ส่ง / ที่ระบบคืน + งานพิมพ์ใบนัดอัตโนมัติ */
async function submitAppointment(page: Page, print: Awaited<ReturnType<typeof capturePrintJobs>>, label: string) {
  const panel = apptPanel(page);
  const service = panel.locator('.ant-select[name="serviceType"]');
  if (!(await service.innerText()).includes(SERVICE)) {
    await service.click();
    await options(page).filter({ hasText: new RegExp(`^${SERVICE}$`) }).first().click();
  }
  const slot = panel.locator('.ant-radio-wrapper').filter({ hasText: /\d\d:\d\d - \d\d:\d\d/ }).filter({ visible: true });
  await expect(slot.first(), 'ต้องมีช่วงเวลานัดของแพทย์ให้เลือก').toBeVisible({ timeout: 30_000 });
  if (!(await slot.filter({ has: page.locator('.ant-radio-checked') }).count())) await slot.filter({ hasNot: page.locator('.ant-radio-disabled') }).first().click();
  const submit = panel.getByRole('button', { name: /Submit/ });
  await markEvidence(expected(apptItem(page, 'คลินิก/หน่วยบริการ:')), filled(service), expected(slot.filter({ has: page.locator('.ant-radio-checked') }).first()), clicked(submit));
  await snapEvidence(page, `ก่อนกด — Submit ${label}`);
  const request = page.waitForRequest((r) => r.url().endsWith('/graphql') && /CreatePhysicianAppointment/.test(r.postData() ?? ''), { timeout: 60_000 });
  const response = page.waitForResponse((r) => r.url().endsWith('/graphql') && /CreatePhysicianAppointment/.test(r.request().postData() ?? ''), { timeout: 60_000 });
  const before = print.jobs.length;
  await submit.click();
  const duplicate = page.getByRole('button', { name: 'ยืนยันทำนัดหมายซ้ำ' });
  if (await duplicate.waitFor({ timeout: 6_000 }).then(() => true, () => false)) await duplicate.click();
  const sent = (JSON.parse((await request).postData() ?? '{}') as { variables?: { input?: { start?: string; serviceInstruction?: { th?: string; en?: string } } } }).variables?.input;
  const body = (await (await response).json()) as { data?: { createPhysicianAppointment?: { id: string; serviceInstruction?: { th?: string; en?: string } } }; errors?: { message: string }[] };
  const appt = body.data?.createPhysicianAppointment;
  expect(appt?.id, `สร้างนัดหมายไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ') ?? ''}`).toBeTruthy();
  const createdAt = new Date();
  const job = await print.next(before, 20_000);
  await test.info().attach(`CreatePhysicianAppointment (${label})`, { body: JSON.stringify({ input: sent, data: body.data }, null, 2), contentType: 'application/json' });
  return { id: appt!.id, start: sent?.start ?? '', sentInstruction: sent?.serviceInstruction?.th ?? '', savedInstruction: appt?.serviceInstruction?.th ?? '', createdAt, autoPrint: job };
}

/** เมนูซ้าย "ประวัติการนัดหมาย" → แถวของนัดที่สร้างเมื่อ createdAt (คอลัมน์วันที่สร้าง DD/MM/พ.ศ. HH:mm:ss) */
async function historyRow(page: Page, createdAt: Date): Promise<Locator> {
  await page.getByRole('menuitem', { name: /ประวัติการนัดหมาย$/ }).dispatchEvent('click');
  await page.mouse.move(900, 700);
  const fmt = (d: Date) => d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(' ', ' ');
  const stamps = [fmt(new Date(createdAt.getTime() - 60_000)), fmt(createdAt)].map((s) => s.replace(/[/]/g, '\\/'));
  const row = page.getByRole('main').getByRole('row').filter({ hasText: new RegExp(`(${stamps.join('|')}):\\d\\d`) }).first();
  await expect(row, `ประวัติการนัดหมายต้องมีนัดที่สร้างเมื่อ ${fmt(createdAt)}`).toBeVisible({ timeout: 60_000 });
  return row;
}

/** ปุ่มแก้ไขของแถว → หน้าต่าง "แก้ไขนัดหมาย" (ดูข้อมูลที่เก็บ ไม่บันทึก) */
async function openEditDialog(page: Page, row: Locator): Promise<Locator> {
  await row.getByRole('button').filter({ has: page.locator('[aria-label="edit"]') }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'แก้ไขนัดหมาย' });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  return dialog;
}
async function closeEditDialog(page: Page) {
  const dialog = page.getByRole('dialog').filter({ hasText: 'แก้ไขนัดหมาย' });
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: 'ยกเลิก' }).click();
    await expect(dialog).toBeHidden();
  }
}

/** ปุ่มเครื่องพิมพ์ของแถว → พิมพ์ใบนัด (TH) → PDF ที่ส่งไปเครื่องพิมพ์ */
async function reprintSlip(page: Page, row: Locator, print: Awaited<ReturnType<typeof capturePrintJobs>>): Promise<PrintJob> {
  const item = page.getByText('พิมพ์ใบนัด (TH)', { exact: true }).filter({ visible: true });
  const printer = row.getByRole('button').filter({ has: page.locator('[aria-label="printer"]') });
  await printer.click();
  await expect(item).toBeVisible({ timeout: 10_000 });
  await markEvidence(clicked(printer), clicked(item));
  await snapEvidence(page, 'ก่อนกด — พิมพ์ใบนัด (TH)');
  const before = print.jobs.length;
  await item.click();
  const job = await print.next(before, 30_000);
  expect(job, 'กดพิมพ์ใบนัดแล้วต้องมีงานพิมพ์').toBeTruthy();
  return job!;
}

/** ส่วนของใบนัด: บรรทัดใต้หัว `heading` จนถึงหัวถัดไป (รวมบรรทัดที่ถูกตัดต่อจาก bullet) */
function slipSection(lines: string[], heading: string, stops: RegExp): string[] {
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) return [];
  const out: string[] = [];
  for (const raw of lines.slice(start + 1)) {
    const l = raw.trim();
    if (stops.test(l)) break;
    if (l.startsWith('•')) out.push(l.replace(/^•\s*/, ''));
    else if (out.length) out[out.length - 1] += l;
    else out.push(l);
  }
  return out.map((s) => s.trim());
}
const SLIP_STOPS = /^(สถานที่ให้บริการ|คำแนะนำการให้บริการ|นัดหมายอื่นๆ|หมายเหตุ|ผู้ออกใบนัดหมาย|รายการที่สั่ง)/;

test.describe('SBH-694 ใบนัดหมาย — สถานที่ให้บริการ / คำแนะนำการให้บริการ', () => {
  test(
    'ผู้ป่วย AUTO: นัดที่ 1 (คลินิก A → B) สถานที่ให้บริการ · นัดที่ 2 คำแนะนำการให้บริการ (Shortcut / แก้ / เพิ่ม / ลบ) · ประวัติการนัดหมาย · ใบนัดที่พิมพ์',
    {
      tag: ['@SBH-694', ...Array.from({ length: 12 }, (_, i) => `@SBH-${2909 + i}`)],
      annotation: ['SBH-694', 'SBH-2907', ...Array.from({ length: 12 }, (_, i) => `SBH-${2909 + i}`)].map(linear),
    },
    async ({ page }) => {
      test.setTimeout(1_200_000);
      const main = page.getByRole('main');
      const { note, soft, finish } = makeRunner(page);
      const auth = trackAuthorization(page);
      const print = await capturePrintJobs(page);
      let hn = '';
      let visit = { vn: '', en: '' };
      let qsu: Record<number, Qsu> = {};

      await checkStep(page, 'Pre-condition ผู้ป่วย AUTO ใหม่ + Visit OPD + เช็คอิน', async () => {
        const patient = newTestPatient('Appt694');
        await gotoReception(page);
        await fillNewPatientForm(page, patient);
        hn = await saveNewPatient(page);
        await expectPatientInfo(page);
        await openNewVisitPanel(page);
        const v = await openOpdVisit(page);
        visit = { vn: v.vn, en: v.en };
        note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${hn} · ${v.vn} · ${v.en} · ${v.clinic} · ${v.doctor}`);
        await selectOpdUnit(page, 'แผนกอายุรกรรม', 'ก่อนตรวจ');
        await checkInFromOpdList(page, await opdListRow(page, hn));
        await page.goto(`/cortex/next/patients/${hn}?en=${v.en}&vn=${v.vn}&fromApp=opd`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('menuitem', { name: /สร้างนัดหมาย$/ })).toBeAttached({ timeout: 120_000 });
        qsu = await fetchQsu(page, auth(), [CLINIC_A.qsu, CLINIC_B.qsu]);
        note('Master data หน่วยบริการ', Object.values(qsu).map((u) => `${u.id} ${u.name}: สถานที่ ${u.location.join(' / ') || '-'} · คำแนะนำ ${u.instruction.join(' / ') || '-'}`).join(' ‖ '));
      });
      const locA = qsu[CLINIC_A.qsu]?.location ?? [];
      const locB = qsu[CLINIC_B.qsu]?.location ?? [];

      // ── TC-001 ──
      await startClip(page, 'TC-001');
      await soft(`${TC['001']} สถานที่ให้บริการ คลินิก A (หน้าสร้างนัด)`, async () => {
        await openCreatePanel(page);
        await chooseClinic(page, CLINIC_A);
        const panel = apptPanel(page);
        const section = panel.getByText('สถานที่ให้บริการ');
        const shown = await section.count();
        const rows: CompareRow[] = [
          { label: 'Section สถานที่ให้บริการ บนหน้าสร้างนัด', values: ['มี', shown ? 'มี' : 'ไม่มี'], same: shown > 0 },
          { label: `สถานที่ของ ${CLINIC_A.name} (master data)`, values: ['ชื่อคลินิก, อาคาร, ชั้น', locA.join(' / ') || '-'], same: locA.length > 0 && locA.every((l) => LOCATION_PATTERN.test(l)) },
        ];
        await showCompareTable(page, `${TC['001']} คลินิก A`, ['Expected', 'หน้าจอ / master data'], rows, { side: 'left' });
        await markEvidence(expected(apptItem(page, 'คลินิก/หน่วยบริการ:')), expected(panel));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);

      // ── TC-002 ──
      await startClip(page, 'TC-002');
      await soft(`${TC['002']} เปลี่ยนเป็นคลินิก B → สถานที่ของ B`, async () => {
        await chooseClinic(page, CLINIC_B);
        await page.waitForTimeout(2_000);
        const panel = apptPanel(page);
        const shown = await panel.getByText('สถานที่ให้บริการ').count();
        const differs = locA.join('|') !== locB.join('|');
        const rows: CompareRow[] = [
          { label: 'Section สถานที่ให้บริการ บนหน้าสร้างนัด', values: ['มี (ของคลินิก B)', shown ? 'มี' : 'ไม่มี'], same: shown > 0 },
          { label: `สถานที่ของ ${CLINIC_B.name}`, values: ['ชื่อคลินิก, อาคาร, ชั้น', locB.join(' / ') || '-'], same: locB.length > 0 && locB.every((l) => LOCATION_PATTERN.test(l)) },
          { label: 'สถานที่ของ B ต่างจาก A (master data)', values: ['ต่างกัน', differs ? 'ต่างกัน' : 'เหมือนกันทุกตัวอักษร'], same: differs },
        ];
        await showCompareTable(page, `${TC['002']} คลินิก B`, ['Expected', 'หน้าจอ / master data'], rows, { side: 'left' });
        await markEvidence(expected(apptItem(page, 'คลินิก/หน่วยบริการ:')), expected(panel));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);

      // ── TC-003 ──
      await startClip(page, 'TC-003');
      let appt1: Awaited<ReturnType<typeof submitAppointment>> | undefined;
      let row1: Locator | undefined;
      await soft(`${TC['003']} Submit นัดคลินิก B → ประวัติการนัดหมาย`, async () => {
        await chooseClinic(page, CLINIC_B);
        appt1 = await submitAppointment(page, print, 'นัดที่ 1 คลินิก B');
        note('นัดที่ 1', `${appt1.id} · ${appt1.start} · คลินิก B · พิมพ์ใบนัดอัตโนมัติ ${appt1.autoPrint ? 'มี' : 'ไม่มี'}`);
        row1 = await historyRow(page, appt1.createdAt);
        const headers = (await main.locator('table').filter({ hasText: 'วันนัด, เวลานัด' }).first().locator('thead th').allInnerTexts()).map(squash).filter(Boolean);
        await markEvidence(expected(row1));
        await snapEvidence(page, 'หลังกด — แถวนัดที่ 1 ในประวัติการนัดหมาย');
        const dialog = await openEditDialog(page, row1);
        const inDialog = await dialog.getByText('สถานที่ให้บริการ').count();
        const inTable = headers.some((h) => /สถานที่/.test(h));
        const rows: CompareRow[] = [
          { label: 'คอลัมน์สถานที่ให้บริการ ในตารางประวัติ', values: ['มี', inTable ? 'มี' : `ไม่มี (${headers.join(' | ')})`], same: inTable },
          { label: 'สถานที่ในหน้าต่างแก้ไขนัดหมาย', values: [locB.join(' / ') || '-', inDialog ? 'มี' : 'ไม่มี'], same: inDialog > 0 },
        ];
        await showCompareTable(page, `${TC['003']} สถานที่ให้บริการในประวัติการนัดหมาย`, ['Expected', 'หน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(dialog));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);
      await closeEditDialog(page);

      // ── TC-004 ──
      await startClip(page, 'TC-004');
      await soft(`${TC['004']} พิมพ์ใบนัด → สถานที่ให้บริการ`, async () => {
        expect(row1, 'ต้องมีนัดที่ 1 จาก TC-003').toBeTruthy();
        const job = await reprintSlip(page, row1!, print);
        const lines = (await pdfPages(job.pdf)).join('\n');
        const overlay = await showPdf(page, job.pdf, 'ใบนัด (TH) นัดที่ 1 คลินิก B');
        const titles = await overlay.locator('[data-pdf-line]').evaluateAll((els) => els.map((e) => (e as HTMLElement).title));
        await test.info().attach('ใบนัดที่ 1 (TH)', { body: job.pdf, contentType: 'application/pdf' });
        const loc = slipSection(titles, 'สถานที่ให้บริการ', SLIP_STOPS);
        const iClinic = titles.findIndex((t) => /คลินิก$|^คลินิก/.test(t.trim()));
        const iLoc = titles.findIndex((t) => t.trim() === 'สถานที่ให้บริการ');
        const iIns = titles.findIndex((t) => t.trim() === 'คำแนะนำการให้บริการ');
        const rows: CompareRow[] = [
          { label: 'หัวข้อสถานที่ให้บริการ', values: ['มี', iLoc >= 0 ? 'มี' : 'ไม่มี'], same: iLoc >= 0 },
          { label: 'ข้อความ', values: [`ชื่อคลินิก, อาคาร, ชั้น`, loc.join(' / ') || '-'], same: loc.length > 0 && loc.every((l) => LOCATION_PATTERN.test(l)) },
          { label: 'ตรงกับ master data ของคลินิก B', values: [locB.join(' / ') || '-', loc.join(' / ') || '-'], same: loc.join('|') === locB.join('|') },
          { label: 'อยู่ใต้บรรทัดคลินิก', values: ['ใช่', iClinic >= 0 && iLoc > iClinic ? 'ใช่' : 'ไม่ใช่'], same: iClinic >= 0 && iLoc > iClinic },
          { label: 'อยู่เหนือคำแนะนำการให้บริการ', values: ['ใช่', iIns < 0 ? 'ไม่มีหัวข้อคำแนะนำ (ช่องว่าง)' : iLoc < iIns ? 'ใช่' : 'ไม่ใช่'], same: iIns < 0 || iLoc < iIns },
        ];
        await showCompareTable(page, `${TC['004']} ใบนัด: สถานที่ให้บริการ`, ['Expected', 'ใบนัด (PDF)'], rows, { side: 'left' });
        // บรรทัดใน PDF เป็นภาพ (canvas) — ป้ายวางหลบข้อความไม่ได้ (ทับบรรทัดบน) → กรอบไม่มีป้ายทั้งหมด ตารางเทียบค่าบอกว่าอะไรคือ Expected (R59)
        const heading = await pdfLineAt(overlay, /^สถานที่ให้บริการ$/);
        const marks: Locator[] = [];
        for (const l of loc) {
          const m = await pdfLineAt(overlay, l.slice(0, 12));
          if (m) marks.push(m);
        }
        await markEvidence(...(heading ? [heading] : []), ...marks);
        await holdForClip(page);
        note(`${TC['004']} ใบนัด`, squash(lines).slice(0, 400));
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);
      await hidePdf(page);

      // ── TC-005 ──
      await startClip(page, 'TC-005');
      await soft(`${TC['005']} ช่องคำแนะนำ → ข้อความ Default`, async () => {
        await openCreatePanel(page);
        await page.waitForTimeout(3_000);
        const editor = instructionEditor(page);
        const lines = await paragraphs(editor);
        const masterA = qsu[CLINIC_A.qsu]?.instruction ?? [];
        const rows: CompareRow[] = [
          { label: 'ช่องคำแนะนำการให้บริการ (กล่องข้อความ)', values: ['มี', (await editor.isVisible()) ? 'มี (แท็บ ภาษาไทย / ภาษาอังกฤษ)' : 'ไม่มี'], same: await editor.isVisible() },
          { label: 'ข้อความ Default', values: [DEFAULT_LINES.join(' / '), lines.join(' / ') || '(ว่าง)'], same: lines.join('|') === DEFAULT_LINES.join('|') },
          { label: `คำแนะนำตั้งต้นของหน่วยบริการ (${CLINIC_A.name})`, values: ['-', masterA.join(' / ') || '-'], same: true },
        ];
        await showCompareTable(page, `${TC['005']} ข้อความ Default`, ['Expected', 'หน้าจอ / master data'], rows, { side: 'left' });
        await markEvidence(expected(apptItem(page, 'คลินิก/หน่วยบริการ:')), expected(editorBox(page)));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);
      // ช่องไม่มี Default → พิมพ์ 2 บรรทัดของ Default เองให้ TC-006–010 ทำตาม Test Step ได้
      const editor = instructionEditor(page);
      if ((await paragraphs(editor)).join('|') !== DEFAULT_LINES.join('|')) {
        await editor.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.keyboard.type(DEFAULT_LINES[0]);
        await page.keyboard.press('Enter');
        await page.keyboard.type(DEFAULT_LINES[1]);
        note('เตรียมข้อมูล TC-006–010', `ช่องคำแนะนำไม่มีข้อความ Default → พิมพ์ "${DEFAULT_LINES.join('" / "')}" เองก่อน`);
      }

      // ── TC-006 ──
      await startClip(page, 'TC-006');
      let shortcutText = '';
      // Shortcut ของ editor ใช้ allowedPrefixes [" "] (ค่าตั้งต้น tiptap) → "/" ต้องอยู่ต้นบรรทัด / หลังเว้นวรรค — ลอง 2 แบบ: ติดท้ายข้อความตาม Test Step · เว้นวรรคก่อน
      await soft(`${TC['006']} พิมพ์ / → รายการ Shortcut`, async () => {
        const list = page.locator('[data-tippy-root] [role="listbox"]').filter({ visible: true });
        await editor.locator('p').last().click();
        await page.keyboard.press('End');
        await page.keyboard.type('/');
        const direct = await list.waitFor({ timeout: 5_000 }).then(() => true, () => false);
        await markEvidence(filled(editor.locator('p').last()));
        await snapEvidence(page, `แบบ 1 — / ติดท้ายข้อความ (${direct ? 'รายการขึ้น' : 'รายการไม่ขึ้น'})`);
        if (direct) await page.keyboard.press('Escape');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(' /');
        const spaced = await list.waitFor({ timeout: 10_000 }).then(() => true, () => false);
        note(`${TC['006']} การเปิดรายการ`, `"/" ติดท้ายข้อความ: ${direct ? 'รายการขึ้น' : 'รายการไม่ขึ้น ("/" กลายเป็นตัวอักษร)'} · เว้นวรรคก่อน "/": ${spaced ? 'รายการขึ้น' : 'รายการไม่ขึ้น'}`);
        const items = list.getByRole('option');
        const names = spaced ? (await items.allInnerTexts()).map(squash) : [];
        if (spaced) shortcutText = squash((await items.first().locator('[class*="item-text"]').textContent()) ?? '');
        if (names.length) note(`${TC['006']} Shortcut ที่ขึ้น`, names.join(' · '));
        const rows: CompareRow[] = [
          { label: 'พิมพ์ / ติดท้ายข้อความ (ตาม Test Step)', values: ['แสดงรายการ Shortcut', direct ? 'แสดง' : 'ไม่แสดง'], same: direct },
          { label: 'เว้นวรรคแล้วพิมพ์ /', values: ['แสดงรายการ Shortcut', spaced ? `แสดง ${names.length} รายการ` : 'ไม่แสดง'], same: spaced },
        ];
        await showCompareTable(page, `${TC['006']} รายการ Shortcut`, ['Expected', 'ช่องคำแนะนำ'], rows, { side: 'left' });
        if (spaced) await markEvidence(filled(editorBox(page)), expected(list));
        await holdForClip(page);
        // ภาพท้าย step ถ่ายตอนจบ body → รายการ Shortcut ต้องยังเปิดอยู่ (ปิด / ล้างหลังจบ step)
        expect(spaced, 'เว้นวรรคแล้วพิมพ์ / ต้องมีรายการ Shortcut').toBe(true);
      });
      await hideCompareTable(page);
      // ล้าง " /" ที่พิมพ์ทดลอง ให้ข้อความกลับเป็น 2 บรรทัดเดิมก่อน TC-007
      if (await page.locator('[data-tippy-root] [role="listbox"]').filter({ visible: true }).count()) await page.keyboard.press('Escape');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      if ((await paragraphs(editor)).join('|') !== DEFAULT_LINES.join('|')) {
        // TC-006 พังกลางทาง → คืนข้อความ 2 บรรทัดให้ TC-007–010
        await editor.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.keyboard.type(DEFAULT_LINES[0]);
        await page.keyboard.press('Enter');
        await page.keyboard.type(DEFAULT_LINES[1]);
      }

      // ── TC-007 ──
      await startClip(page, 'TC-007');
      await soft(`${TC['007']} แทรก Shortcut ระหว่าง 2 บรรทัด`, async () => {
        await editor.locator('p').first().click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('/');
        const option = page.locator('[data-tippy-root] [role="listbox"]').filter({ visible: true }).getByRole('option').first();
        await expect(option).toBeVisible({ timeout: 15_000 });
        if (!shortcutText) shortcutText = squash((await option.locator('[class*="item-text"]').textContent()) ?? '');
        await markEvidence(expected(editorBox(page)), clicked(option));
        await snapEvidence(page, 'ก่อนกด — เลือก Shortcut');
        await option.click();
        await expect.poll(() => paragraphs(editor)).toHaveLength(3);
        const lines = await paragraphs(editor);
        const rows: CompareRow[] = [
          { label: 'บรรทัด 1', values: [DEFAULT_LINES[0], lines[0] ?? '-'], same: lines[0] === DEFAULT_LINES[0] },
          { label: 'บรรทัด 2 (ข้อความ Shortcut)', values: [shortcutText, lines[1] ?? '-'], same: lines[1] === shortcutText },
          { label: 'บรรทัด 3', values: [DEFAULT_LINES[1], lines[2] ?? '-'], same: lines[2] === DEFAULT_LINES[1] },
        ];
        await showCompareTable(page, `${TC['007']} ข้อความหลังเลือก Shortcut`, ['Expected', 'ช่องคำแนะนำ'], rows, { side: 'left' });
        await markEvidence(expected(editorBox(page)));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);

      // ── TC-008 ──
      await startClip(page, 'TC-008');
      await soft(`${TC['008']} แก้บรรทัดแรก`, async () => {
        const before = await paragraphs(editor);
        await editor.locator('p').filter({ hasText: DEFAULT_LINES[0] }).first().click();
        await page.keyboard.press('End');
        await page.keyboard.type(EDITED_LINE.slice(DEFAULT_LINES[0].length));
        const lines = await paragraphs(editor);
        const rows: CompareRow[] = [
          { label: 'บรรทัดที่แก้', values: [EDITED_LINE, lines[0] ?? '-'], same: lines[0] === EDITED_LINE },
          { label: 'บรรทัดอื่นไม่เปลี่ยน', values: [before.slice(1).join(' / '), lines.slice(1).join(' / ')], same: lines.slice(1).join('|') === before.slice(1).join('|') },
        ];
        await showCompareTable(page, `${TC['008']} แก้ข้อความ`, ['Expected', 'ช่องคำแนะนำ'], rows, { side: 'left' });
        await markEvidence(filled(editorBox(page)));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);

      // ── TC-009 ──
      await startClip(page, 'TC-009');
      await soft(`${TC['009']} เพิ่มบรรทัด Free text ท้าย`, async () => {
        const before = await paragraphs(editor);
        await editor.locator('p').last().click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type(ADDED_LINE);
        const lines = await paragraphs(editor);
        const rows: CompareRow[] = [
          { label: 'บรรทัดใหม่ท้ายสุด', values: [ADDED_LINE, lines.at(-1) ?? '-'], same: lines.at(-1) === ADDED_LINE },
          { label: 'ข้อความเดิมครบ', values: [before.join(' / '), lines.slice(0, -1).join(' / ')], same: lines.slice(0, -1).join('|') === before.join('|') },
        ];
        await showCompareTable(page, `${TC['009']} เพิ่มข้อความ`, ['Expected', 'ช่องคำแนะนำ'], rows, { side: 'left' });
        await markEvidence(filled(editorBox(page)));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);

      // ── TC-010 ──
      await startClip(page, 'TC-010');
      await soft(`${TC['010']} ลบบรรทัด นั่งรอเรียกคิว`, async () => {
        const before = await paragraphs(editor);
        const line = editor.locator('p').filter({ hasText: DEFAULT_LINES[1] }).first();
        await markEvidence(expected(line));
        await snapEvidence(page, 'ก่อนลบ — บรรทัดที่จะลบ');
        await line.click();
        await page.keyboard.press('End');
        await page.keyboard.press('Shift+Home');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');
        const lines = await paragraphs(editor);
        const want = before.filter((l) => l !== DEFAULT_LINES[1]);
        const rows: CompareRow[] = [
          { label: 'บรรทัดที่ลบหายไป', values: ['ไม่มี', lines.includes(DEFAULT_LINES[1]) ? 'ยังอยู่' : 'ไม่มี'], same: !lines.includes(DEFAULT_LINES[1]) },
          { label: 'บรรทัดอื่นยังอยู่', values: [want.join(' / '), lines.join(' / ')], same: lines.join('|') === want.join('|') },
        ];
        await showCompareTable(page, `${TC['010']} ลบข้อความ`, ['Expected', 'ช่องคำแนะนำ'], rows, { side: 'left' });
        await markEvidence(filled(editorBox(page)));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);

      // ── TC-011 ──
      await startClip(page, 'TC-011');
      let appt2: Awaited<ReturnType<typeof submitAppointment>> | undefined;
      let row2: Locator | undefined;
      const finalLines = await paragraphs(editor);
      await soft(`${TC['011']} Submit → ประวัติการนัดหมาย คำแนะนำ`, async () => {
        appt2 = await submitAppointment(page, print, 'นัดที่ 2 คำแนะนำที่แก้');
        note('นัดที่ 2', `${appt2.id} · ${appt2.start} · คำแนะนำที่ส่ง "${appt2.sentInstruction.replace(/\n/g, ' / ')}"`);
        row2 = await historyRow(page, appt2.createdAt);
        const headers = (await main.locator('table').filter({ hasText: 'วันนัด, เวลานัด' }).first().locator('thead th').allInnerTexts()).map(squash).filter(Boolean);
        await markEvidence(expected(row2));
        await snapEvidence(page, 'หลังกด — แถวนัดที่ 2 ในประวัติการนัดหมาย');
        const dialog = await openEditDialog(page, row2);
        const inDialog = await dialog.getByText('คำแนะนำการให้บริการ').count();
        const saved = splitLines(appt2.savedInstruction);
        const rows: CompareRow[] = [
          { label: 'คำแนะนำที่ระบบบันทึก (API)', values: [finalLines.join(' / '), saved.join(' / ') || '(ว่าง)'], same: saved.join('|') === finalLines.join('|') },
          { label: 'คอลัมน์คำแนะนำ ในตารางประวัติ', values: ['มี', headers.some((h) => /คำแนะนำ/.test(h)) ? 'มี' : 'ไม่มี'], same: headers.some((h) => /คำแนะนำ/.test(h)) },
          { label: 'คำแนะนำในหน้าต่างแก้ไขนัดหมาย', values: ['มี', inDialog ? 'มี' : 'ไม่มี'], same: inDialog > 0 },
        ];
        await showCompareTable(page, `${TC['011']} คำแนะนำในประวัติการนัดหมาย`, ['Expected', 'ประวัติการนัดหมาย / API'], rows, { side: 'bottom' });
        await markEvidence(expected(dialog));
        await holdForClip(page);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);
      await closeEditDialog(page);

      // ── TC-012 ──
      await startClip(page, 'TC-012');
      await soft(`${TC['012']} พิมพ์ใบนัด → คำแนะนำการให้บริการ`, async () => {
        expect(row2, 'ต้องมีนัดที่ 2 จาก TC-011').toBeTruthy();
        const job = await reprintSlip(page, row2!, print);
        await test.info().attach('ใบนัดที่ 2 (TH)', { body: job.pdf, contentType: 'application/pdf' });
        const overlay = await showPdf(page, job.pdf, 'ใบนัด (TH) นัดที่ 2 คำแนะนำที่แก้');
        const titles = await overlay.locator('[data-pdf-line]').evaluateAll((els) => els.map((e) => (e as HTMLElement).title));
        const ins = slipSection(titles, 'คำแนะนำการให้บริการ', SLIP_STOPS);
        const iLoc = titles.findIndex((t) => t.trim() === 'สถานที่ให้บริการ');
        const iIns = titles.findIndex((t) => t.trim() === 'คำแนะนำการให้บริการ');
        const loneBullet = titles.some((t) => t.trim() === '•');
        const rows: CompareRow[] = [
          { label: 'ข้อความตรงกับที่บันทึก (bullet ละบรรทัด)', values: [finalLines.join(' / '), ins.join(' / ') || '-'], same: ins.join('|') === finalLines.join('|') },
          { label: 'อยู่ใต้หัวข้อสถานที่ให้บริการ', values: ['ใช่', iLoc >= 0 && iIns > iLoc ? 'ใช่' : 'ไม่ใช่'], same: iLoc >= 0 && iIns > iLoc },
          { label: 'bullet อยู่บรรทัดเดียวกับข้อความ', values: ['ใช่', loneBullet ? 'มี bullet ว่างแยกบรรทัด' : 'ใช่'], same: !loneBullet },
        ];
        await showCompareTable(page, `${TC['012']} ใบนัด: คำแนะนำการให้บริการ`, ['Expected', 'ใบนัด (PDF)'], rows, { side: 'left' });
        const heading = await pdfLineAt(overlay, /^คำแนะนำการให้บริการ$/);
        const marks = [await pdfLineAt(overlay, /^สถานที่ให้บริการ$/)].filter(Boolean) as Locator[];
        for (const l of finalLines) {
          const m = await pdfLineAt(overlay, l.slice(0, 12));
          if (m) marks.push(m);
        }
        await markEvidence(...(heading ? [heading] : []), ...marks);
        await holdForClip(page);
        note(`${TC['012']} บรรทัดในใบนัด`, titles.join(' ‖ '));
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);
      await hidePdf(page);
      note('Visit', `ไม่ปิด Visit (R11) · HN ${hn} · ${visit.vn}`);
      finish();
    },
  );
});
