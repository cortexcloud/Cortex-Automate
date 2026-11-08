import { type Locator, type Page } from '@playwright/test';
import { closeVisitAtCashier, gotoCashierAccount } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, showDashboardCard, type ErVisit } from '../../../helpers/functions/er';
import { erTriagePanel, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, recordMockPatient, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, gotoVisit } from '../../../mock-data/uat-play';

// SBH-3909 [ER] [ER Note] เพิ่ม Section Doctor Free — แผง "ค่าแพทย์" ของผู้ป่วย ER เปิดจากเมนูขวา "ค่าตรวจแพทย์" (อ้างอิงแผงของ OPD)
//   EXE SBH-3937 · TC-001–007 (HPY SBH-3938) · TC-008–009 (EDG SBH-3939) · TC-010–011 (UHP SBH-3940) · TC 001–011 = SBH-3941–3951
// 1 เทสต่อผู้ป่วย (R9): A = TC-001–006 (ทำต่อกันตามลำดับ) · B = TC-007 · C = TC-008–011 (ตามลำดับ)
//   ผู้ป่วย AUTO ใหม่ + Visit ER + คัดกรอง ESI 3 · บัญชี user1 (Super_User — ใช้ทั้งขั้นแพทย์และการเงิน) · คลิป 1 ไฟล์ต่อ TC (R61)
//   หน้าการเงิน = /cortex/cashier/patients/<HN>/accounts/<VN>/charge-items (ตาราง "รหัส - ชื่อ")
// ระบบ: SBH Prod (ผู้ใช้สั่ง 8 พ.ย. 2026 "ทดสอบบน Prod … สร้างคนไข้ตามที่ต้องใช้ได้เลย")
//   npm run card:prod -- --headed --grep "@SBH-3909-A( |$)"   (B / C เหมือนกัน)
//   ใช้ผู้ป่วยเดิม: SBH3909_A / SBH3909_B / SBH3909_C = "HN,VN,EN" · เทสผ่าน = ปิด Visit ที่การเงิน · ไม่ผ่าน = เก็บ Visit ไว้รันต่อ
//   ปิด Visit ทีหลัง: SBH3909_CLOSE="HN,VN;HN,VN" --grep @SBH-3909-CLOSE

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const mainOf = (p: Page) => p.getByRole('main');
const FEE_ROW = /ค่าตรวจแพทย์|ค่าแพทย์/;

// ---------- แผงค่าแพทย์ ----------
const careNav = (page: Page) => page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' });
const feeMenu = (page: Page) => careNav(page).getByRole('menuitem', { name: /ค่าตรวจแพทย์$/ }).first();
const feePanel = (page: Page) => page.locator('[class*="doctor-fee-form"]').filter({ visible: true }).first();
const feeTitle = (page: Page) => feePanel(page).getByRole('heading', { name: 'ค่าแพทย์' }).first();
const feeHeader = (page: Page) => feePanel(page).locator('[class*="_container_"]').first();
const saveState = (page: Page) => feePanel(page).locator('[class*="saveStateText"]').first();
const saveButton = (page: Page) => feePanel(page).locator('[class*="rightSection"]').getByRole('button', { name: /บันทึก/ }).first();
const radio = (page: Page, name: 'ต้องการเก็บ' | 'ไม่ต้องการเก็บ') => feePanel(page).getByRole('radio', { name, exact: true });
const radioLabel = (page: Page, name: 'ต้องการเก็บ' | 'ไม่ต้องการเก็บ') => radio(page, name).locator('xpath=ancestor::label[1]');
const amountBox = (page: Page) => feePanel(page).getByRole('spinbutton').first();
const amountHelp = (page: Page) => feePanel(page).locator('#amount_help, .ant-form-item-explain').first();
const quickTag = (page: Page, value: string) => feePanel(page).locator('[class*="option-tag"]').filter({ hasText: new RegExp(`^${value}$`) }).first();
const coverageButton = (page: Page) => feePanel(page).getByRole('button', { name: 'คิดค่าธรรมเนียมแพทย์ตามสิทธิการรักษา' });
/** ปุ่มปิด (X) มุมขวาของหัวแผง (ปุ่มไอคอน close ถัดจากปุ่มบันทึก — SBH Prod 8 พ.ย. 2026) */
const feeTabClose = (page: Page) => feePanel(page).locator('[class*="rightSection"] button').filter({ has: page.locator('[aria-label="close"]') }).first();
const NOTICE = '.ant-message-notice-content, .ant-notification-notice';

interface FeeState {
  collect: boolean;
  notCollect: boolean;
  amount: string;
  status: string;
  amountDisabled: boolean;
  help: string;
}

async function readFee(page: Page): Promise<FeeState> {
  return {
    collect: await radio(page, 'ต้องการเก็บ').isChecked(),
    notCollect: await radio(page, 'ไม่ต้องการเก็บ').isChecked(),
    amount: await amountBox(page).inputValue().catch(() => '-'),
    status: ((await saveState(page).textContent().catch(() => '')) ?? '').trim(),
    amountDisabled: await amountBox(page).isDisabled().catch(() => false),
    help: ((await amountHelp(page).textContent().catch(() => '')) ?? '').trim(),
  };
}

/** แถบเมนูขวากางค้างบังปุ่มบันทึกมุมขวาของแผง → คลิกหัวแผงให้หุบ แล้วย้ายเมาส์ออก */
async function collapseMenu(page: Page) {
  await feeTitle(page).click({ timeout: 3_000 }).catch(() => undefined);
  await page.mouse.move(700, 650);
  await page.waitForTimeout(800);
}

/** กดเมนู "ค่าตรวจแพทย์" (กดซ้ำจนแผงขึ้น — หน้าที่เพิ่งโหลดเปิดแผงตั้งต้นตามหลัง) */
async function openFeePanel(page: Page, opts: { snapBefore?: string } = {}) {
  const item = feeMenu(page);
  await expect(item).toBeAttached({ timeout: 60_000 });
  if (opts.snapBefore) {
    await careNav(page).hover().catch(() => undefined);
    await item.scrollIntoViewIfNeeded().catch(() => undefined);
    await item.hover({ force: true }).catch(() => undefined);
    await page.waitForTimeout(800);
    await markEvidence(clicked(item, 'ค่าตรวจแพทย์'));
    await holdForClip(page, 800);
    await snapEvidence(page, opts.snapBefore);
    await clearEvidenceMarks(page);
  }
  await expect(async () => {
    await item.click({ force: true });
    await expect(feeTitle(page)).toBeVisible({ timeout: 8_000 });
  }).toPass({ timeout: 60_000 });
  await collapseMenu(page);
  await expect(amountBox(page)).toBeVisible({ timeout: 20_000 });
}

interface SaveResult {
  sent: boolean;
  accepted?: boolean;
  errors: string;
  variables: string;
  buttonEnabled: boolean;
  notice: string;
}

/** กดปุ่มบันทึกของแผง → ผล graphql UpsertDoctorFee (ไม่ส่งภายใน 12 วิ = sent false) */
async function clickSave(page: Page, note: (t: string, d: string) => void, label: string): Promise<SaveResult> {
  const btn = saveButton(page);
  const buttonEnabled = await btn.isEnabled().catch(() => false);
  const resP = page
    .waitForResponse((r) => r.request().method() === 'POST' && /\/graphql/.test(r.url()) && /UpsertDoctorFee/.test(r.request().postData() ?? ''), { timeout: 12_000 })
    .catch(() => undefined);
  await btn.click({ timeout: 5_000 }).catch(() => undefined);
  const notice = page.locator(NOTICE).filter({ visible: true }).first();
  const res = await resP;
  let accepted: boolean | undefined;
  let errors = '';
  let variables = '';
  if (res) {
    const body = (await res.json().catch(() => ({}))) as { data?: { upsertDoctorFee?: { accepted?: boolean } }; errors?: { message: string }[] };
    accepted = body.data?.upsertDoctorFee?.accepted;
    errors = (body.errors ?? []).map((e) => e.message).join(' | ');
    try {
      variables = JSON.stringify((JSON.parse(res.request().postData() ?? '{}') as { variables?: unknown }).variables ?? {}).slice(0, 300);
    } catch {
      variables = '';
    }
  }
  const noticeText = (await notice.waitFor({ timeout: 4_000 }).then(() => notice.textContent(), () => '')) ?? '';
  const r: SaveResult = { sent: !!res, accepted, errors, variables, buttonEnabled, notice: noticeText.replace(/\s+/g, ' ').trim() };
  note(`${label} — ผลกดบันทึก`, `ปุ่มกดได้ ${buttonEnabled} · ส่ง UpsertDoctorFee ${r.sent ? `แล้ว accepted=${accepted}${errors ? ` errors=${errors}` : ''} · variables ${variables}` : 'ไม่ส่ง'} · แจ้งเตือน "${r.notice || '-'}"`);
  return r;
}

/** กรอบแจ้งเตือน (ถ้ายังอยู่บนจอ) — ไม่ตีกรอบสิ่งที่หายไปแล้ว (markEvidence จะค้าง 20 วิ) */
async function visibleNotice(page: Page, text: string) {
  const n = page.locator(NOTICE).filter({ visible: true }).first();
  if (!text || !(await n.isVisible().catch(() => false))) return [];
  await n.hover().catch(() => undefined);
  return [alerted(n, text.slice(0, 40))];
}

// ---------- หน้าการเงิน ----------
interface Cashier {
  rows: string[];
  feeRows: string[];
  due: number;
  total: number;
  table: Locator;
  feeRow: Locator;
}

const chargeTable = (page: Page) => mainOf(page).getByRole('table').filter({ hasText: 'รหัส - ชื่อ' }).last();
const money = (text: string, label: string) => Number((text.match(new RegExp(`${label}\\s*([-\\d,.]+)`))?.[1] ?? 'NaN').replace(/,/g, ''));

async function readCashier(page: Page, v: ErVisit): Promise<Cashier> {
  const table = chargeTable(page);
  await expect(table).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2_500);
  const rows = (await table.locator('tbody tr').allInnerTexts())
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s && s !== 'ไม่พบรายการค่าใช้จ่าย' && !s.startsWith('รหัส - ชื่อ'));
  const text = await mainOf(page).innerText();
  return {
    rows,
    feeRows: rows.filter((r) => FEE_ROW.test(r)),
    due: money(text, 'ที่ต้องชำระ'),
    total: money(text, 'ราคารวม'),
    table,
    feeRow: table.locator('tbody tr').filter({ hasText: FEE_ROW }).first(),
  };
}

/** เปิดหน้าบัญชีของ Visit ที่การเงิน แล้วอ่านรายการ · `until` = รอ (โหลดหน้าใหม่) จนเงื่อนไขเป็นจริง สูงสุด ~60 วิ */
async function openCashier(page: Page, v: ErVisit, until?: (c: Cashier) => boolean): Promise<Cashier> {
  await gotoCashierAccount(page, v.hn, v.vn);
  let c = await readCashier(page, v);
  for (let i = 0; i < 4 && until && !until(c); i++) {
    await page.waitForTimeout(8_000);
    await gotoCashierAccount(page, v.hn, v.vn);
    c = await readCashier(page, v);
  }
  return c;
}

const feeAmountIn = (row: string) => row.match(/(-?[\d,]+\.\d{2})\s*$/)?.[1] ?? row.match(/(-?[\d,]+\.\d{2})/g)?.pop() ?? '';

// ---------- เตรียมผู้ป่วย ----------
async function triage(page: Page, visit: ErVisit) {
  const panel = erTriagePanel(page);
  await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL, chiefComplaint: true });
  await page.waitForTimeout(3_000);
  const locked = mainOf(page).getByText('ร่างถูกแก้ไขจากที่อื่น', { exact: false });
  for (let i = 0; i < 3 && (await locked.isVisible().catch(() => false)); i++) {
    await page.getByRole('button', { name: 'ลองเก็บร่างอีกครั้ง' }).click();
    await page.waitForTimeout(5_000);
  }
  const zones = panel.locator('[class*="er-triage-zone-options"] button');
  await expect(zones.first(), 'ฟอร์มคัดกรองต้องมีตัวเลือกโซน').toBeVisible({ timeout: 20_000 });
  if (!(await zones.and(page.locator('[aria-pressed="true"]')).count())) {
    const zone = zones.filter({ hasText: 'แนะนำ' }).first();
    await zone.scrollIntoViewIfNeeded();
    await zone.click();
    await expect(zone).toHaveAttribute('aria-pressed', 'true');
  }
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await expect(mainOf(page).getByText('Clinical Summary', { exact: true }), 'บันทึกคัดกรองแล้วต้องไปหน้า Overview').toBeVisible({ timeout: 90_000 });
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
}

async function prepare(page: Page, key: 'A' | 'B' | 'C', note: (t: string, d: string) => void): Promise<ErVisit> {
  const resume = process.env[`SBH3909_${key}`]?.split(',').map((s) => s.trim());
  if (resume?.length === 3) {
    const v = { hn: resume[0], vn: resume[1], en: resume[2] } as ErVisit;
    note(`ผู้ป่วย ${key}`, `ใช้รายเดิม HN ${v.hn} · VN ${v.vn} · EN ${v.en}`);
    return v;
  }
  await gotoErDashboard(page);
  const p = newTestPatient(`Fee3909${key}`);
  const v = await registerAndOpenErVisit(page, p);
  if (SYSTEM === 'sbh-prod') recordMockPatient(`SBH-3909 ${key}`, p, v, 'SBH-3909 Prod · เปิด Visit ER + คัดกรอง ESI 3 · บันทึกค่าแพทย์ (เทสการ์ด ปิด Visit ท้ายเทส)');
  note(`ผู้ป่วย ${key}`, `${p.firstName} ${p.familyName} · HN ${v.hn} · VN ${v.vn} · EN ${v.en} · ทำต่อ: SBH3909_${key}="${v.hn},${v.vn},${v.en}"`);
  await expect(mainOf(page).getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  await triage(page, v);
  return v;
}

/** หน้าผู้ป่วยจาก ER Dashboard (กด HN บนการ์ดผู้ป่วย) — ไม่ไปหน้า Visit ใน 40 วิ = เปิดจาก URL แทน */
async function openFromBoard(page: Page, v: ErVisit, note: (t: string, d: string) => void, snap?: string) {
  await gotoErDashboard(page);
  try {
    const card = await showDashboardCard(page, v.hn);
    if (snap) {
      await markEvidence(clicked(card, `การ์ดผู้ป่วย HN ${v.hn}`));
      await holdForClip(page, 800);
      await snapEvidence(page, snap);
      await clearEvidenceMarks(page);
    }
    await card.click();
    await expect(mainOf(page).getByText(`HN ${v.hn}`, { exact: true }).first()).toBeVisible({ timeout: 40_000 });
  } catch (error) {
    note('เปิดหน้าผู้ป่วย', `กดการ์ดบน ER Dashboard ไม่สำเร็จ (${(error as Error).message.split('\n')[0]}) → เปิดหน้า Visit จาก URL`);
    await gotoVisit(page, v);
  }
  await page.waitForTimeout(4_000);
}

/** ตั้งค่าแผง (การเรียกเก็บ + จำนวนเงิน) แล้วถ่าย "ก่อนกด" */
async function fillFee(page: Page, collect: 'ต้องการเก็บ' | 'ไม่ต้องการเก็บ', amount: string | undefined, snap: string) {
  if (!(await radio(page, collect).isChecked())) await radioLabel(page, collect).click();
  await expect(radio(page, collect)).toBeChecked();
  if (amount !== undefined) {
    await amountBox(page).fill(amount);
    await page.waitForTimeout(500);
  }
  await markEvidence(clicked(radioLabel(page, collect), collect), ...(amount !== undefined ? [filled(amountBox(page), `จำนวนเงิน ${amount}`)] : []), clicked(saveButton(page), 'บันทึก'));
  await holdForClip(page, 1_200);
  await snapEvidence(page, snap);
  await clearEvidenceMarks(page);
}

test.describe(`SBH-3909 แผงค่าแพทย์ของผู้ป่วย ER (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 900_000 });

  let opened: ErVisit[] = [];
  test.beforeEach(() => {
    opened = [];
  });

  test.afterEach(async ({ page }, info) => {
    await hideCompareTable(page).catch(() => undefined);
    await startClip(page, 'after');
    for (const v of opened) {
      if (info.status !== info.expectedStatus || process.env.SBH3909_KEEP) {
        console.log(`    หลังเทส: ไม่ปิด Visit (ไม่ผ่าน / KEEP) — HN ${v.hn} · ${v.vn} · ${v.en}`);
        continue;
      }
      const result = await closeVisitAtCashier(page, v.hn, v.vn).then(
        (c) => (c.result === 'closed' ? `ปิด Visit ที่การเงินแล้ว${c.outstanding ? ` (คงเหลือ ${c.outstanding})` : ''}` : 'Visit ปิดอยู่ก่อนแล้ว'),
        (e: Error) => `ปิด Visit ไม่สำเร็จ — ${e.message.split('\n')[0]}`,
      );
      info.annotations.push({ type: 'หลังเทส', description: `HN ${v.hn} · ${v.vn} · ${v.en}: ${result}` });
      console.log(`    หลังเทส: HN ${v.hn} · ${v.vn} · ${v.en}: ${result}`);
    }
  });

  test(
    'ผู้ป่วย A: เปิดแผงค่าแพทย์ · องค์ประกอบ · ค่าตั้งต้น · ปุ่มลัด 400 · บันทึก → การเงิน 400 · เปิดใหม่ค่ายังอยู่ (TC-001–006)',
    { tag: ['@SBH-3909', '@SBH-3909-A', '@SBH-3941', '@SBH-3942', '@SBH-3943', '@SBH-3944', '@SBH-3945', '@SBH-3946'], annotation: [linear('SBH-3909')] },
    async ({ page }) => {
      const { note, soft, finish } = makeRunner(page);
      const A = await prepare(page, 'A', note);
      opened.push(A);

      // TC-001: เมนูห้องฉุกเฉิน → การ์ดผู้ป่วย A → เมนู ค่าตรวจแพทย์ → แผง "ค่าแพทย์" ของผู้ป่วยที่เลือก
      await startClip(page, 'TC-001');
      const tc1 = await soft('TC-001 (SBH-3941) กดเมนูค่าตรวจแพทย์ของผู้ป่วย ER → แสดงแผง "ค่าแพทย์" ของผู้ป่วยที่เลือก', async () => {
        await openFromBoard(page, A, note, 'TC-001 ก่อนกด — การ์ดผู้ป่วย A');
        await openFeePanel(page, { snapBefore: 'TC-001 ก่อนกด — เมนูค่าตรวจแพทย์' });
        const hn = mainOf(page).getByText(`HN ${A.hn}`, { exact: true }).first();
        // แถบ Encounter แสดง "VN V69…" เป็นข้อความเดียว (exact กับเลขเปล่าหาไม่เจอ — SBH-3909 Prod 8 พ.ย.)
        const vn = mainOf(page).getByText(`VN ${A.vn}`).first();
        await showCompareTable(page, 'TC-001 แผงค่าแพทย์ของผู้ป่วยที่เลือก', ['บนหน้าจอ', 'ผู้ป่วย A'], [
          { label: 'หัวแผง', values: [((await feeTitle(page).textContent()) ?? '').trim(), 'ค่าแพทย์'], same: (await feeTitle(page).isVisible()) },
          { label: 'HN บนหัวผู้ป่วย', values: [(await hn.isVisible()) ? A.hn : '-', A.hn], same: await hn.isVisible() },
          { label: 'VN', values: [(await vn.isVisible()) ? A.vn : '-', A.vn], same: await vn.isVisible() },
        ], { side: 'bottom' });
        await markEvidence(expected(feeHeader(page), 'แผง ค่าแพทย์'), expected(hn, `HN ${A.hn}`));
        await expect(feeTitle(page)).toBeVisible();
        await expect(hn).toBeVisible();
      });
      await hideCompareTable(page).catch(() => undefined);
      if (!tc1) {
        finish();
        return;
      }

      // TC-002: องค์ประกอบของแผงตรงกับ OPD (รูปในการ์ด)
      await startClip(page, 'TC-002');
      await soft('TC-002 (SBH-3942) องค์ประกอบของแผงค่าแพทย์ครบตาม OPD', async () => {
        await collapseMenu(page);
        const parts: [string, Locator][] = [
          ['การเรียกเก็บ: ต้องการเก็บ', radioLabel(page, 'ต้องการเก็บ')],
          ['การเรียกเก็บ: ไม่ต้องการเก็บ', radioLabel(page, 'ไม่ต้องการเก็บ')],
          ['ปุ่ม คิดค่าธรรมเนียมแพทย์ตามสิทธิการรักษา', coverageButton(page)],
          ['ช่องจำนวนเงิน', amountBox(page)],
          ['ข้อความ ราคาที่กำหนด 0 - 800', feePanel(page).getByText('ราคาที่กำหนด 0 - 800', { exact: true })],
          ['ปุ่มลัด 200', quickTag(page, '200')],
          ['ปุ่มลัด 400', quickTag(page, '400')],
          ['ปุ่มลัด 600', quickTag(page, '600')],
          ['สถานะ ยังไม่ได้บันทึก', feePanel(page).getByText('ยังไม่ได้บันทึก', { exact: true })],
          ['ปุ่ม บันทึก', saveButton(page)],
          ['ปุ่มปิด (X) ของแท็บ ค่าตรวจแพทย์', feeTabClose(page)],
        ];
        const rows: CompareRow[] = [];
        for (const [label, loc] of parts) {
          const seen = await loc.isVisible().catch(() => false);
          rows.push({ label, values: [seen ? 'มี' : 'ไม่มี'], same: seen, result: seen ? '✓ มี' : undefined });
        }
        note('TC-002 องค์ประกอบ', rows.map((r) => `${r.label}: ${r.values[0]}`).join(' · '));
        await showCompareTable(page, 'TC-002 องค์ประกอบของแผงค่าแพทย์ (เทียบรูป OPD ในการ์ด)', ['บนหน้าจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(feePanel(page), 'องค์ประกอบครบตาม OPD'), ...((await feeTabClose(page).isVisible().catch(() => false)) ? [feeTabClose(page)] : []));
        await holdForClip(page, 2_500);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'องค์ประกอบที่ขาด').toEqual([]);
      });
      await hideCompareTable(page).catch(() => undefined);
      await clearEvidenceMarks(page);

      // TC-003: ค่าตั้งต้น (ยังไม่เคยบันทึก) — ต้องการเก็บ + 200
      await startClip(page, 'TC-003');
      await soft('TC-003 (SBH-3943) ค่าตั้งต้นเมื่อยังไม่เคยบันทึก = ต้องการเก็บ · 200', async () => {
        const s = await readFee(page);
        note('TC-003 ค่าตั้งต้น', JSON.stringify(s));
        await showCompareTable(page, 'TC-003 ค่าตั้งต้นของแผงค่าแพทย์', ['บนหน้าจอ', 'Expected'], [
          { label: 'การเรียกเก็บ', values: [s.collect ? 'ต้องการเก็บ' : s.notCollect ? 'ไม่ต้องการเก็บ' : '-', 'ต้องการเก็บ'], same: s.collect },
          { label: 'จำนวนเงิน', values: [s.amount, '200'], same: s.amount === '200' },
          { label: 'สถานะ (ยังไม่เคยบันทึก)', values: [s.status, 'ยังไม่ได้บันทึก'], same: s.status === 'ยังไม่ได้บันทึก', result: s.status === 'ยังไม่ได้บันทึก' ? '✓ ยังไม่เคยบันทึก' : undefined },
        ], { side: 'bottom' });
        await markEvidence(expected(radioLabel(page, 'ต้องการเก็บ'), 'ต้องการเก็บ'), expected(amountBox(page), 'จำนวนเงิน 200'));
        await holdForClip(page, 2_000);
        expect(s.collect, 'การเรียกเก็บต้องเป็น ต้องการเก็บ').toBe(true);
        expect(s.amount, 'จำนวนเงินตั้งต้นต้องเป็น 200').toBe('200');
      });
      await hideCompareTable(page).catch(() => undefined);
      await clearEvidenceMarks(page);

      // TC-004: กดปุ่มลัด 400
      await startClip(page, 'TC-004');
      await soft('TC-004 (SBH-3944) กดปุ่มลัด 400 → ช่องจำนวนเงินเป็น 400', async () => {
        const before = await amountBox(page).inputValue();
        await markEvidence(clicked(quickTag(page, '400'), '400'), filled(amountBox(page), `ก่อนกด ${before}`));
        await holdForClip(page, 1_000);
        await snapEvidence(page, 'TC-004 ก่อนกด — ปุ่มลัด 400');
        await clearEvidenceMarks(page);
        await quickTag(page, '400').click();
        await expect(amountBox(page)).toHaveValue('400', { timeout: 5_000 }).catch(() => undefined);
        const after = await amountBox(page).inputValue();
        await showCompareTable(page, 'TC-004 ปุ่มลัด 400', ['ก่อนกด', 'หลังกด', 'Expected'], [{ label: 'จำนวนเงิน', values: [before, after, '400'], same: after === '400' }], { side: 'bottom' });
        await markEvidence(expected(amountBox(page), 'จำนวนเงิน 400'), quickTag(page, '400'));
        expect(after, 'ช่องจำนวนเงินต้องเป็น 400').toBe('400');
      });
      await hideCompareTable(page).catch(() => undefined);
      await clearEvidenceMarks(page);

      // TC-005: ต้องการเก็บ 400 → บันทึก → การเงินมีค่าตรวจแพทย์ 400
      await startClip(page, 'TC-005');
      let saved5 = false;
      await soft('TC-005 (SBH-3945) บันทึกค่าแพทย์ ต้องการเก็บ 400 → หน้าการเงินมีรายการค่าตรวจแพทย์ 400', async () => {
        await fillFee(page, 'ต้องการเก็บ', '400', 'TC-005 ก่อนกด — ต้องการเก็บ 400 + บันทึก');
        const r = await clickSave(page, note, 'TC-005');
        await expect(saveState(page)).toHaveText('บันทึกแล้ว', { timeout: 20_000 }).catch(() => undefined);
        const s = await readFee(page);
        await markEvidence(expected(saveState(page), `สถานะ ${s.status}`), ...(await visibleNotice(page, r.notice)));
        await holdForClip(page, 1_500);
        await snapEvidence(page, 'TC-005 หลังกด — บันทึกแล้ว');
        await clearEvidenceMarks(page);
        expect(r.accepted, `บันทึกค่าแพทย์ต้องสำเร็จ (${r.errors || (r.sent ? 'accepted false' : 'ไม่ส่งคำสั่ง')})`).toBe(true);
        saved5 = true;
        const c = await openCashier(page, A, (x) => x.feeRows.length > 0);
        note('TC-005 การเงิน', `รายการ ${c.rows.length}: ${c.rows.join(' | ') || '-'} · ราคารวม ${c.total} · ที่ต้องชำระ ${c.due}`);
        const amt = c.feeRows.map(feeAmountIn).join(', ');
        await showCompareTable(page, `TC-005 หน้าการเงิน ${A.vn}`, ['หน้าการเงิน', 'Expected'], [
          { label: 'รายการค่าตรวจแพทย์', values: [c.feeRows.map((r) => r.slice(0, 50)).join(' / ') || 'ไม่มี', 'มี 1 รายการ'], same: c.feeRows.length === 1 },
          { label: 'จำนวนเงิน (รวม)', values: [amt || '-', '400.00'], same: amt === '400.00' },
        ], { side: 'bottom' });
        await markEvidence(c.feeRows.length ? expected(c.feeRow, 'ค่าตรวจแพทย์ 400') : expected(c.table, 'มีค่าตรวจแพทย์ 400 · จริง: ไม่มี'));
        await holdForClip(page, 2_500);
        expect(c.feeRows.length, 'หน้าการเงินต้องมีรายการค่าตรวจแพทย์ 1 รายการ').toBe(1);
        expect(amt, 'จำนวนเงินค่าตรวจแพทย์ต้องเป็น 400.00').toBe('400.00');
      });
      await hideCompareTable(page).catch(() => undefined);
      await clearEvidenceMarks(page);

      // TC-006: เปิดเมนูค่าตรวจแพทย์อีกครั้ง → ต้องการเก็บ · 400 · บันทึกแล้ว
      await startClip(page, 'TC-006');
      await soft('TC-006 (SBH-3946) เปิดเมนูค่าตรวจแพทย์อีกครั้ง → ต้องการเก็บ · 400 · บันทึกแล้ว', async () => {
        expect(saved5, 'ต้องบันทึกใน TC-005 ได้ก่อน').toBe(true);
        await openFromBoard(page, A, note);
        await openFeePanel(page, { snapBefore: 'TC-006 ก่อนกด — เมนูค่าตรวจแพทย์' });
        await expect(saveState(page)).toHaveText(/บันทึกแล้ว|ยังไม่ได้บันทึก/, { timeout: 20_000 });
        await page.waitForTimeout(2_000);
        const s = await readFee(page);
        note('TC-006 ค่าในแผง', JSON.stringify(s));
        await showCompareTable(page, 'TC-006 ค่าที่บันทึกไว้เมื่อเปิดแผงอีกครั้ง', ['บนหน้าจอ', 'Expected'], [
          { label: 'การเรียกเก็บ', values: [s.collect ? 'ต้องการเก็บ' : s.notCollect ? 'ไม่ต้องการเก็บ' : '-', 'ต้องการเก็บ'], same: s.collect },
          { label: 'จำนวนเงิน', values: [s.amount, '400'], same: s.amount === '400' },
          { label: 'สถานะ', values: [s.status, 'บันทึกแล้ว'], same: s.status === 'บันทึกแล้ว' },
        ], { side: 'bottom' });
        await markEvidence(expected(radioLabel(page, 'ต้องการเก็บ'), 'ต้องการเก็บ'), expected(amountBox(page), 'จำนวนเงิน 400'), expected(saveState(page), s.status === 'บันทึกแล้ว' ? 'บันทึกแล้ว' : `บันทึกแล้ว · จริง: ${s.status}`));
        await holdForClip(page, 2_000);
        expect(s.collect, 'การเรียกเก็บต้องเป็น ต้องการเก็บ').toBe(true);
        expect(s.amount, 'จำนวนเงินต้องเป็น 400').toBe('400');
        expect(s.status, 'สถานะต้องเป็น บันทึกแล้ว').toBe('บันทึกแล้ว');
      });
      await hideCompareTable(page).catch(() => undefined);
      await clearEvidenceMarks(page);
      finish();
    },
  );

  test(
    'ผู้ป่วย B: บันทึกค่าแพทย์แบบไม่ต้องการเก็บ → หน้าการเงินไม่มีรายการค่าตรวจแพทย์ (TC-007)',
    { tag: ['@SBH-3909', '@SBH-3909-B', '@SBH-3947'], annotation: [linear('SBH-3909')] },
    async ({ page }) => {
      const { note, soft, finish } = makeRunner(page);
      // ค่าตั้งคลินิกของ Encounter (clinic.doctorFeeProductCode / noDoctorFeeProductCode) จาก graphql ที่หน้าเว็บโหลดเอง
      const clinicConfig = { value: '' };
      page.on('response', async (res) => {
        if (!/\/graphql/.test(res.url())) return;
        const body = await res.text().catch(() => '');
        const m = body.match(/"allowDoctorFee":[^,}]*,"doctorFeeProductCode":[^,}]*,"noDoctorFeeProductCode":[^,}]*/);
        if (m) clinicConfig.value = m[0].replace(/"/g, '');
      });
      const B = await prepare(page, 'B', note);
      opened.push(B);
      await startClip(page, 'TC-007');
      await soft('TC-007 (SBH-3947) บันทึกแบบไม่ต้องการเก็บ → หน้าการเงินไม่มีรายการค่าตรวจแพทย์', async () => {
        await openFromBoard(page, B, note, 'TC-007 ก่อนกด — การ์ดผู้ป่วย B');
        await openFeePanel(page, { snapBefore: 'TC-007 ก่อนกด — เมนูค่าตรวจแพทย์' });
        await fillFee(page, 'ไม่ต้องการเก็บ', undefined, 'TC-007 ก่อนกด — ไม่ต้องการเก็บ + บันทึก');
        const filledState = await readFee(page);
        note('TC-007 แผงก่อนบันทึก', JSON.stringify(filledState));
        const r = await clickSave(page, note, 'TC-007');
        await expect(saveState(page)).toHaveText('บันทึกแล้ว', { timeout: r.sent ? 20_000 : 3_000 }).catch(() => undefined);
        const s = await readFee(page);
        note('TC-007 ค่าตั้งคลินิกของ Encounter (จาก response ของหน้าเว็บ)', clinicConfig.value || 'ไม่พบใน response');
        await showCompareTable(page, 'TC-007 กดบันทึกแบบไม่ต้องการเก็บ', ['ผลที่ได้', 'Expected'], [
          { label: 'ปุ่มบันทึก', values: [r.buttonEnabled ? 'กดได้' : 'กดไม่ได้ (disabled)', 'กดได้'], same: r.buttonEnabled },
          { label: 'คำสั่งบันทึก (UpsertDoctorFee)', values: [r.sent ? `ส่ง · accepted ${r.accepted}` : 'ไม่ส่ง', 'บันทึกสำเร็จ'], same: r.accepted === true },
          { label: 'สถานะแผง', values: [s.status, 'บันทึกแล้ว'], same: s.status === 'บันทึกแล้ว' },
          { label: 'ตั้งค่าคลินิก (API)', values: [clinicConfig.value.slice(0, 90) || '-', '-'], same: true, result: 'ข้อมูล' },
        ], { side: 'bottom' });
        await markEvidence(
          expected(saveButton(page), r.buttonEnabled ? 'กดบันทึกได้' : 'กดบันทึกได้ · จริง: ปุ่มกดไม่ได้'),
          expected(radioLabel(page, 'ไม่ต้องการเก็บ'), 'ไม่ต้องการเก็บ'),
        );
        await holdForClip(page, 2_500);
        await snapEvidence(page, 'TC-007 หลังกด — บันทึก');
        await hideCompareTable(page).catch(() => undefined);
        await clearEvidenceMarks(page);
        await page.waitForTimeout(r.sent ? 10_000 : 1_000);
        const c = await openCashier(page, B);
        note('TC-007 การเงิน', `รายการ ${c.rows.length}: ${c.rows.join(' | ') || '-'} · ราคารวม ${c.total} · ที่ต้องชำระ ${c.due}`);
        await showCompareTable(page, `TC-007 หน้าการเงิน ${B.vn}`, ['หน้าการเงิน', 'Expected'], [
          { label: 'รายการค่าตรวจแพทย์', values: [c.feeRows.map((x) => x.slice(0, 50)).join(' / ') || 'ไม่มี', 'ไม่มี'], same: c.feeRows.length === 0 },
          { label: 'บันทึกจากแผงค่าแพทย์', values: [r.accepted ? 'บันทึกแล้ว' : 'บันทึกไม่ได้ (ปุ่มกดไม่ได้)', 'บันทึกแล้ว'], same: r.accepted === true },
        ], { side: 'bottom' });
        await markEvidence(c.feeRows.length ? expected(c.feeRow, 'ไม่มีค่าตรวจแพทย์ · จริง: มี') : expected(c.table, 'ไม่มีรายการค่าตรวจแพทย์'));
        await holdForClip(page, 2_500);
        expect(c.feeRows, 'หน้าการเงินต้องไม่มีรายการค่าตรวจแพทย์').toEqual([]);
        expect(r.buttonEnabled, 'ปุ่มบันทึกต้องกดได้เมื่อเลือก ไม่ต้องการเก็บ').toBe(true);
        expect(r.accepted, `บันทึกค่าแพทย์ต้องสำเร็จ (${r.errors || (r.sent ? 'accepted false' : 'ไม่ส่งคำสั่ง')})`).toBe(true);
      });
      await hideCompareTable(page).catch(() => undefined);
      await clearEvidenceMarks(page);
      finish();
    },
  );

  test(
    'ผู้ป่วย C: บันทึก 0 / 800 ได้ · 801 / -1 บันทึกไม่ได้ ตรวจที่หน้าการเงิน (TC-008–011)',
    { tag: ['@SBH-3909', '@SBH-3909-C', '@SBH-3948', '@SBH-3949', '@SBH-3950', '@SBH-3951'], annotation: [linear('SBH-3909')] },
    async ({ page }) => {
      const { note, soft, finish } = makeRunner(page);
      const C = await prepare(page, 'C', note);
      opened.push(C);
      const only = (process.env.SBH3909_ONLY ?? '').split(',').filter(Boolean);
      const run = (tc: string) => !only.length || only.includes(tc);

      /** บันทึก (ต้องการเก็บ) ด้วยจำนวนเงินที่กำหนด → ผล + แผงหลังกด */
      const saveAmount = async (tc: string, amount: string) => {
        await openFromBoard(page, C, note);
        await openFeePanel(page, { snapBefore: `${tc} ก่อนกด — เมนูค่าตรวจแพทย์` });
        await fillFee(page, 'ต้องการเก็บ', amount, `${tc} ก่อนกด — ต้องการเก็บ ${amount} + บันทึก`);
        const typed = await readFee(page);
        note(`${tc} แผงก่อนบันทึก`, JSON.stringify(typed));
        const r = await clickSave(page, note, tc);
        await page.waitForTimeout(2_000);
        const s = await readFee(page);
        note(`${tc} แผงหลังกด`, JSON.stringify(s));
        return { typed, r, s };
      };

      // TC-008: ขอบล่าง 0
      if (run('TC-008')) {
        await startClip(page, 'TC-008');
        await soft('TC-008 (SBH-3948) บันทึกค่าแพทย์ 0 → บันทึกได้ · การเงินไม่มียอดค่าตรวจแพทย์ที่ต้องชำระ', async () => {
          const { r, s } = await saveAmount('TC-008', '0');
          await markEvidence(expected(saveState(page), s.status === 'บันทึกแล้ว' ? 'บันทึกแล้ว' : `บันทึกแล้ว · จริง: ${s.status}`), filled(amountBox(page), `กรอก ${s.amount}`), ...(await visibleNotice(page, r.notice)));
          await holdForClip(page, 1_500);
          await snapEvidence(page, 'TC-008 หลังกด — บันทึก 0');
          await clearEvidenceMarks(page);
          expect(r.accepted, `บันทึก 0 ต้องสำเร็จ (${r.errors || (r.sent ? 'accepted false' : 'ไม่ส่งคำสั่ง')})`).toBe(true);
          await page.waitForTimeout(8_000);
          const c = await openCashier(page, C);
          note('TC-008 การเงิน', `รายการ ${c.rows.length}: ${c.rows.join(' | ') || '-'} · ราคารวม ${c.total} · ที่ต้องชำระ ${c.due}`);
          const amt = c.feeRows.map(feeAmountIn).join(', ');
          const noDue = c.feeRows.every((x) => /^0\.00$/.test(feeAmountIn(x)));
          await showCompareTable(page, `TC-008 หน้าการเงิน ${C.vn}`, ['หน้าการเงิน', 'Expected'], [
            { label: 'สถานะแผง', values: [s.status, 'บันทึกแล้ว'], same: s.status === 'บันทึกแล้ว' },
            { label: 'ค่าตรวจแพทย์ที่ต้องชำระ', values: [c.feeRows.length ? `${c.feeRows.length} แถว · ${amt}` : 'ไม่มีแถว', '0 บาท / ไม่มียอด'], same: noDue },
            { label: 'ที่ต้องชำระ (สรุปบัญชี)', values: [String(c.due), '0'], same: c.due === 0 },
          ], { side: 'bottom' });
          await markEvidence(c.feeRows.length ? expected(c.feeRow, `ค่าตรวจแพทย์ ${amt}`) : expected(c.table, 'ไม่มียอดค่าตรวจแพทย์'));
          await holdForClip(page, 2_500);
          expect(s.status, 'หัวแผงต้องเป็น บันทึกแล้ว').toBe('บันทึกแล้ว');
          expect(noDue, 'ค่าตรวจแพทย์ต้องไม่มียอดที่ต้องชำระ').toBe(true);
        });
        await hideCompareTable(page).catch(() => undefined);
        await clearEvidenceMarks(page);
      }

      // TC-009: ขอบบน 800
      if (run('TC-009')) {
        await startClip(page, 'TC-009');
        await soft('TC-009 (SBH-3949) บันทึกค่าแพทย์ 800 → บันทึกได้ · การเงินมีค่าตรวจแพทย์ 800', async () => {
          const { r, s } = await saveAmount('TC-009', '800');
          await expect(saveState(page)).toHaveText('บันทึกแล้ว', { timeout: 15_000 }).catch(() => undefined);
          await markEvidence(expected(saveState(page), `สถานะ ${(await readFee(page)).status}`), expected(amountBox(page), `จำนวนเงิน ${s.amount}`));
          await holdForClip(page, 1_500);
          await snapEvidence(page, 'TC-009 หลังกด — บันทึก 800');
          await clearEvidenceMarks(page);
          expect(r.accepted, `บันทึก 800 ต้องสำเร็จ (${r.errors || (r.sent ? 'accepted false' : 'ไม่ส่งคำสั่ง')})`).toBe(true);
          const c = await openCashier(page, C, (x) => x.feeRows.some((f) => feeAmountIn(f) === '800.00'));
          note('TC-009 การเงิน', `รายการ ${c.rows.length}: ${c.rows.join(' | ') || '-'} · ราคารวม ${c.total} · ที่ต้องชำระ ${c.due}`);
          const amt = c.feeRows.map(feeAmountIn).join(', ');
          await showCompareTable(page, `TC-009 หน้าการเงิน ${C.vn}`, ['หน้าการเงิน', 'Expected'], [
            { label: 'สถานะแผง', values: [(await readFee(page).catch(() => s)).status || s.status, 'บันทึกแล้ว'], same: true, result: 'ดูภาพก่อนหน้า' },
            { label: 'รายการค่าตรวจแพทย์', values: [c.feeRows.map((x) => x.slice(0, 50)).join(' / ') || 'ไม่มี', 'มี 1 รายการ'], same: c.feeRows.length === 1 },
            { label: 'จำนวนเงิน', values: [amt || '-', '800.00'], same: amt === '800.00' },
          ], { side: 'bottom' });
          await markEvidence(c.feeRows.length ? expected(c.feeRow, 'ค่าตรวจแพทย์ 800') : expected(c.table, 'มีค่าตรวจแพทย์ 800 · จริง: ไม่มี'));
          await holdForClip(page, 2_500);
          expect(c.feeRows.length, 'ต้องมีรายการค่าตรวจแพทย์ 1 รายการ').toBe(1);
          expect(amt, 'จำนวนเงินต้องเป็น 800.00').toBe('800.00');
        });
        await hideCompareTable(page).catch(() => undefined);
        await clearEvidenceMarks(page);
      }

      // TC-010 / TC-011: นอกช่วง → บันทึกไม่ได้ · การเงินยังเป็น 800
      for (const [tc, issue, amount] of [['TC-010', 'SBH-3950', '801'], ['TC-011', 'SBH-3951', '-1']] as const) {
        if (!run(tc)) continue;
        await startClip(page, tc);
        await soft(`${tc} (${issue}) กรอก ${amount} แล้วกดบันทึก → บันทึกไม่ได้ · การเงินไม่มีค่าตรวจแพทย์ ${amount} (ยังเป็น 800)`, async () => {
          await openFromBoard(page, C, note);
          await openFeePanel(page, { snapBefore: `${tc} ก่อนกด — เมนูค่าตรวจแพทย์` });
          await fillFee(page, 'ต้องการเก็บ', amount, `${tc} ก่อนกด — กรอก ${amount} + บันทึก`);
          const typed = await readFee(page);
          note(`${tc} แผงก่อนบันทึก`, JSON.stringify(typed));
          const r = await clickSave(page, note, tc);
          await page.waitForTimeout(1_500);
          const s = await readFee(page);
          note(`${tc} แผงหลังกด`, JSON.stringify(s));
          const blocked = !r.sent || r.accepted === false || !!r.errors;
          const helpLoc = amountHelp(page);
          await markEvidence(
            expected(amountBox(page), `จำนวนเงิน ${s.amount}`),
            ...(s.help && s.help !== 'ราคาที่กำหนด 0 - 800' ? [alerted(helpLoc, s.help.slice(0, 40))] : []),
            ...(await visibleNotice(page, r.notice)),
            expected(saveState(page), blocked ? `บันทึกไม่ได้ · สถานะ ${s.status}` : `บันทึกไม่ได้ · จริง: ส่งบันทึก ${s.amount}`),
          );
          await holdForClip(page, 2_000);
          await snapEvidence(page, `${tc} หลังกด — กรอก ${amount}`);
          await clearEvidenceMarks(page);
          await page.waitForTimeout(8_000);
          const c = await openCashier(page, C);
          note(`${tc} การเงิน`, `รายการ ${c.rows.length}: ${c.rows.join(' | ') || '-'} · ราคารวม ${c.total} · ที่ต้องชำระ ${c.due}`);
          const amt = c.feeRows.map(feeAmountIn).join(', ');
          const wrong = c.feeRows.some((x) => x.includes(amount === '801' ? '801' : '-1'));
          await showCompareTable(page, `${tc} กรอก ${amount} แล้วกดบันทึก — ${C.vn}`, ['ผลที่ได้', 'Expected'], [
            { label: 'ค่าในช่องหลังกด', values: [`${typed.amount} → ${s.amount}`, '-'], same: true, result: 'ข้อมูล' },
            { label: 'ข้อความใต้ช่อง', values: [s.help || '-', '-'], same: true, result: 'ข้อมูล' },
            { label: 'คำสั่งบันทึก (UpsertDoctorFee)', values: [r.sent ? `ส่ง · ${r.variables.match(/"amount":(-?[\d.]+)/)?.[0] ?? r.variables.slice(0, 60)} · accepted ${r.accepted}` : 'ไม่ส่ง', 'บันทึกไม่ได้'], same: blocked },
            { label: 'ค่าตรวจแพทย์ที่การเงิน', values: [amt || 'ไม่มี', '800.00 (ไม่มี ' + amount + ')'], same: amt === '800.00' && !wrong },
          ], { side: 'bottom' });
          await markEvidence(c.feeRows.length ? expected(c.feeRow, amt === '800.00' ? 'ยังเป็น 800' : `ยังเป็น 800 · จริง: ${amt}`) : expected(c.table, 'ยังเป็น 800 · จริง: ไม่มี'));
          await holdForClip(page, 2_500);
          expect(blocked, `กรอก ${amount} ต้องบันทึกไม่ได้`).toBe(true);
          expect(amt, 'การเงินต้องยังเป็นค่าตรวจแพทย์ 800.00').toBe('800.00');
        });
        await hideCompareTable(page).catch(() => undefined);
        await clearEvidenceMarks(page);
      }
      finish();
    },
  );

  // ปิด Visit ที่ค้างจากรอบที่ไม่ผ่าน: SBH3909_CLOSE="HN,VN;HN,VN"
  test('ปิด Visit ที่ค้าง', { tag: ['@SBH-3909-CLOSE'] }, async ({ page }) => {
    const list = (process.env.SBH3909_CLOSE ?? '').split(';').map((x) => x.trim()).filter(Boolean);
    test.skip(!list.length, 'ไม่ได้ตั้ง SBH3909_CLOSE');
    for (const item of list) {
      const [hn, vn] = item.split(',');
      const result = await closeVisitAtCashier(page, hn, vn).then((c) => `${c.result}${c.outstanding ? ` คงเหลือ ${c.outstanding}` : ''}`, (e: Error) => `ไม่สำเร็จ — ${e.message.split('\n')[0]}`);
      console.log(`    ปิด Visit HN ${hn} · ${vn}: ${result}`);
    }
  });
});
