import fs from 'node:fs';
import path from 'node:path';
import { type Browser, type Locator, type Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, fetchBoard, fetchZones, gotoErDashboard, openCarePanel, openErMenu, trackOpenedErVisits, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import { chooseDispositionDiagnosis, dispositionTextBoxes, graphqlMutation, signDisposition, startDisposition } from '../../../helpers/functions/er-disposition';
import { erDischargeButton, erDischargeConfirm, erListCell, erListRow, erViewSwitch, filterErListByHn, gotoErPatientList, openErListTab, openErPatientListFromMenu } from '../../../helpers/functions/er-list';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, erTriageSaveButton, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, restartVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { fetchNurseTasks, registerAndOpenErVisit, SETTINGS, submitOrders } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, careMenu, gotoVisit } from '../../../mock-data/uat-play';
import { authFile, envName } from '../../../utils/env';

// SBH-2618 [ER][Nurse Task list] Redesign — หน้า ER "รายการงานพยาบาล" (/cortex/er/nurse-task-list)
//   AC: ไม่แสดงผู้ป่วยที่ออกจาก ER · แสดงเฉพาะผู้ป่วยที่มี order · ตัดคอลัมน์ ประเภท / ผู้รับผิดชอบ / Note · แยกผู้ป่วยตามโซน
// ชุด EXE SBH-3097 → HPY SBH-3098 (TC-001–006 = SBH-3100–3105) · EDG SBH-3099 (TC-007–009 = SBH-3106–3108) · 1 เทส = 1 flow (R9) · คลิปต่อ TC (R61)
// ผู้ป่วย AUTO 3 ราย (dev-x · R10 / R11 / R17):
//   A = ESI 2 โซน Resuscitation (แทน "โซนแดง") + รังสี → TC-002 / 004 / 005 / 006 → คัดกรองซ้ำย้ายไป Urgency (TC-009) → จำหน่าย (TC-008)
//   B = ESI 3 โซน Urgency ไม่มี order → TC-003 · (ร่าง TC-010 สวิตช์ "แสดงผู้ป่วยที่ยังไม่มี Order") → สั่ง Lab (TC-007)
//   C = ESI 3 โซน Urgency + รังสี → TC-006 (โซนที่ 2) → จำหน่ายออกจาก ER → TC-001
// บัญชี: Super_User (user1 · แพทย์ในระบบ) ลงทะเบียน / คัดกรอง / สั่ง order / Disposition / จำหน่าย · Nurse (x-nurse) ดูหน้ารายการงานพยาบาล (หน้าต่างแยก)
// สิ่งที่รู้ก่อนเขียน (dev-x 31 ต.ค. 2026 · ไฟล์แอป index-CAlFiC-E.js · chunk หน้า index-CNaWDFje.js · decisions R81):
//   - ตัวเลขหลังชื่อโซน = ช่วง ESI ไม่ใช่จำนวนผู้ป่วย → ผู้ใช้ให้ "ผ่าน + ข้อสังเกต" (นับชื่อใต้โซนเทียบบอร์ดแทน)
//   - Lab บน dev-x ไม่สร้างงานพยาบาล → ผู้ใช้ให้ TC-007 "สั่ง Lab อย่างเดียว" (ไม่ขึ้นรายชื่อ = Fail)
//   - บอร์ด ER ไม่มีปุ่มย้ายโซน → ย้ายด้วย "คัดกรองซ้ำ" คง ESI เดิม แล้วเลือกโซน Urgency เอง
//   - ผู้ป่วยในโซน Triage (ยังไม่คัดกรอง) ไม่ขึ้นในหน้านี้เลย · รายชื่อโหลดซ้ำเองทุก ~10 วิ
// รัน (dev-x): npx playwright test --headed --grep @SBH-2618   ·  SBH2618_KEEP=1 = ไม่ปิด Visit ท้ายเทส · SBH2618_TC010=0 = ไม่เล่นร่าง TC-010

const ISSUE: Record<number, string> = {};
for (let n = 1; n <= 9; n++) ISSUE[n] = `SBH-${3099 + n}`;
ISSUE[10] = 'SBH-3453'; // TC-010 สร้างทีหลัง (31 ต.ค.) เลข Issue ไม่ต่อกัน
const pad = (n: number) => String(n).padStart(3, '0');
const TC = (n: number) => (ISSUE[n] ? `TC-${pad(n)} (${ISSUE[n]})` : `TC-${pad(n)} (ร่าง)`);
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TYPE_TAGS = ['Imaging', 'Specimen', 'Nurse added', 'Medication', 'Activity'];
const RESUS = 'Resuscitation';
const URGENCY = 'Urgency';

// ---------- หน้า รายการงานพยาบาล (หน้าต่าง Nurse) ----------

const mainOf = (p: Page) => p.getByRole('main');
const searchBox = (p: Page) => mainOf(p).getByPlaceholder('HN / ชื่อ-นามสกุล');
// filter has: ต้องใช้ locator ที่ไม่ผูกกับ main (locator ที่ผูกแล้วจับไม่ได้ — รอบซ้อม 31 ต.ค.)
const sidebar = (p: Page) => mainOf(p).locator('[class*="_sidebar_"]').filter({ has: p.locator('input[placeholder="HN / ชื่อ-นามสกุล"]') }).last();
const patientBtn = (p: Page, hn: string) => sidebar(p).getByRole('button', { name: new RegExp(`HN ${hn}\\s`) }).first();
const zoneItems = (p: Page) => sidebar(p).locator('.ant-collapse-item');
const zoneHeaderOf = (p: Page, hn: string) =>
  zoneItems(p).filter({ has: p.getByRole('button', { name: new RegExp(`HN ${hn}\\s`) }) }).locator('.ant-collapse-header').first();
const zoneHeader = (p: Page, zone: string) => sidebar(p).locator('.ant-collapse-header').filter({ hasText: `zone: ${zone}` }).first();
const sidebarEmpty = (p: Page) => sidebar(p).getByText('ไม่พบผู้ป่วย', { exact: true });
const withoutOrders = (p: Page) => mainOf(p).getByRole('switch').first();
const headerRow = (p: Page) => mainOf(p).locator('[class*="_table-row-header_"]').first();
const headerCells = (p: Page) => headerRow(p).locator('[class*="_table-header-cell_"]');
const taskRows = (p: Page) => mainOf(p).locator('[class*="_data-row_"]');
const summaryLine = (p: Page) => mainOf(p).getByText(/^รายการงาน \d+ active/).first();
const refreshBtn = (p: Page) => mainOf(p).getByRole('button', { name: 'reload รีเฟรช' }).first();
const isEncounters = (url: string) => /\/er\/nurse-tasks\/encounters\?/.test(url);

interface SidebarZone { label: string; patients: { name: string; count: string; hn: string }[] }

async function openTaskList(n: Page) {
  const loaded = n.waitForResponse((r) => isEncounters(r.url()), { timeout: 90_000 });
  loaded.catch(() => undefined);
  await n.goto('/cortex/er/nurse-task-list');
  await expectOk(await loaded, 'รายชื่อผู้ป่วยของหน้ารายการงานพยาบาล');
  await expect(searchBox(n)).toBeVisible({ timeout: 60_000 });
  await n.mouse.move(960, 1000);
}

/** กด รีเฟรช บนแถบตัวกรอง → รอรายชื่อผู้ป่วยโหลดใหม่ */
async function refresh(n: Page) {
  // dev-x ตอบ 502 เป็นพักๆ (รอบ 4 31 ต.ค. ล้ม TC-007 กลางขั้น) → ลองใหม่ไม่เกิน 3 ครั้ง
  for (let attempt = 1; ; attempt++) {
    const loaded = n.waitForResponse((r) => isEncounters(r.url()), { timeout: 30_000 });
    loaded.catch(() => undefined);
    await refreshBtn(n).click();
    const res = await loaded;
    if (res.ok() || attempt >= 3) {
      await expectOk(res, 'รีเฟรชรายชื่อผู้ป่วย');
      break;
    }
    console.log(`    รีเฟรชได้ ${res.status()} → ลองใหม่ (ครั้งที่ ${attempt + 1})`);
    await n.waitForTimeout(5_000);
  }
  await n.waitForTimeout(800);
}

/** สวิตช์ "แสดงผู้ป่วยที่ยังไม่มี Order" ให้อยู่สถานะที่ต้องการ — Prod รอบ 1: TC-010 ล้มแล้วสวิตช์ค้างเปิด ทำให้ TC-007 / 009 / 008 เห็นผู้ป่วย 0/0 */
async function setWithoutOrders(n: Page, on: boolean) {
  const sw = withoutOrders(n);
  if (((await sw.getAttribute('aria-checked')) === 'true') !== on) await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', String(on));
  await n.waitForTimeout(800);
}

async function clearSearch(n: Page) {
  if ((await searchBox(n).inputValue()) !== '') await searchBox(n).fill('');
}

/** กางทุกโซนแล้วอ่าน ป้ายโซน + ผู้ป่วยใต้โซน */
async function readSidebar(n: Page): Promise<SidebarZone[]> {
  const headers = sidebar(n).locator('.ant-collapse-header');
  for (let i = 0; i < (await headers.count()); i++) {
    if ((await headers.nth(i).getAttribute('aria-expanded')) === 'false') await headers.nth(i).click();
  }
  return zoneItems(n).evaluateAll((items) =>
    items.map((item) => ({
      label: (item.querySelector('.ant-collapse-header')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      patients: [...item.querySelectorAll('[class*="_patient-meta_"]')].map((meta) => {
        const row = meta.closest('[role="button"], button') ?? meta.parentElement!;
        return {
          name: (row.querySelector('[class*="_patient-name_"]')?.textContent ?? '').trim(),
          count: (row.querySelector('[class*="_task-count_"]')?.textContent ?? '').trim(),
          hn: (meta.textContent ?? '').match(/HN\s*(\d+)/)?.[1] ?? '',
        };
      }),
    })),
  );
}

const zoneOf = (zones: SidebarZone[], hn: string) => zones.find((z) => z.patients.some((p) => p.hn === hn))?.label ?? '';
const describe = (zones: SidebarZone[]) => zones.map((z) => `${z.label}: ${z.patients.map((p) => `HN ${p.hn} ${p.count}`).join(', ') || '-'}`).join(' | ') || 'ไม่พบผู้ป่วย';

/** ค้นหา HN ในช่องค้นหาฝั่งซ้าย (กรองบนหน้าเว็บ) → คืนว่าพบหรือไม่ */
async function searchHn(n: Page, hn: string): Promise<boolean> {
  await searchBox(n).fill(hn);
  await expect(searchBox(n)).toHaveValue(hn);
  await n.waitForTimeout(600);
  return patientBtn(n, hn).isVisible();
}

/** รอจนผู้ป่วยขึ้น / หายจากรายชื่อ (กดรีเฟรชซ้ำ) — คืนผลสุดท้าย */
async function waitPresence(n: Page, hn: string, present: boolean, timeout = 60_000): Promise<boolean> {
  const until = Date.now() + timeout;
  for (;;) {
    await clearSearch(n);
    const now = await patientBtn(n, hn).isVisible();
    if (now === present || Date.now() > until) return now;
    await refresh(n);
  }
}

/** รอจนผู้ป่วยอยู่ใต้โซนที่ต้องการ (กดรีเฟรชซ้ำ) */
async function waitZone(n: Page, hn: string, zone: string, timeout = 60_000): Promise<SidebarZone[]> {
  const until = Date.now() + timeout;
  for (;;) {
    await clearSearch(n);
    const zones = await readSidebar(n);
    if (zoneOf(zones, hn).startsWith(`zone: ${zone}`) || Date.now() > until) return zones;
    await refresh(n);
  }
}

// ---------- หน้าต่าง Super_User (แพทย์ / เจ้าหน้าที่) ----------

/** เปิด One Day Order จนช่องค้นหาอยู่ต่อ 3 วินาที — หน้าที่เพิ่งโหลดเด้งกลับแท็บ Overview เองได้ (แบบเดียวกับ SBH-3158) */
async function openOneDayOrder(page: Page) {
  const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
  await expect(async () => {
    if (!(await search.isVisible())) await careMenu(page, 'One Day Order', mainOf(page).getByRole('heading', { name: 'Order', exact: true }));
    await expect(search).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(3_000);
    await expect(search).toBeVisible({ timeout: 1_000 });
  }, 'เปิด One Day Order').toPass({ timeout: 120_000 });
}

/** ผู้ป่วย AUTO ใหม่ → Visit ER → คัดกรอง ESI ที่กำหนด (ระบบเลือกโซนแนะนำให้) → สั่ง order (ถ้ามี) */
async function preparePatient(page: Page, label: string, level: 2 | 3, orders: string[], note: (t: string, d: string) => void): Promise<ErVisit> {
  await gotoErDashboard(page);
  const patient = newTestPatient(label);
  const visit = await registerAndOpenErVisit(page, patient);
  note(`ผู้ป่วย ${label}`, `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
  await expect(mainOf(page).getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
  await dismissToast(page, 'สร้าง Visit สำเร็จ');
  await fillErTriageForm(page, { level, vitals: VITALS_NORMAL });
  // บันทึกฟอร์มแล้วหน้าเว็บยิง "ส่งเข้าโซน" (PATCH triage-result) ตามหลัง — เปลี่ยนหน้าเร็วไปผู้ป่วยค้างโซน Triage (รอบ 2 31 ต.ค. ผู้ป่วย B)
  const zoned = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await expectOk(await zoned, `ส่งผู้ป่วย ${label} เข้าโซน`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
  if (orders.length) {
    await openOneDayOrder(page);
    await submitOrders(page, orders);
    note(`ผู้ป่วย ${label} order`, `ส่งคำสั่ง ${orders.join(' · ')}`);
  }
  return visit;
}

/** หน้าต่างของ Nurse (x-nurse) ที่หน้ารายการงานพยาบาล — คลิปเริ่มหลังหน้าโหลดเสร็จ */
async function openNurseWindow(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    storageState: authFile('Nurse'),
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1920, height: 1080 },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  });
  await cacheAppAssets(context);
  const nurse = await context.newPage();
  await openTaskList(nurse);
  await trackVideo(nurse, 'Nurse');
  return nurse;
}

/** Disposition (Improved · With Approval · K30) → ลงนาม → รายการ ER แท็บ รอจำหน่าย → จำหน่าย */
async function dischargeFromEr(page: Page, visit: ErVisit, who: string) {
  const main = mainOf(page);
  // SBH Prod 6 พ.ย. รอบ 1: แท็บ Disposition ของ C หมุนค้าง 60 วิ (ของ A โหลดปกติ) → โหลดหน้า Visit ใหม่แล้วลองอีก 1 ครั้ง
  for (let attempt = 1; ; attempt++) {
    await gotoVisit(page, visit);
    try {
      await openCarePanel(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }));
      break;
    } catch (error) {
      if (attempt >= 2) throw error;
      console.log(`    Disposition ของ ${who} โหลดไม่ขึ้น → โหลดหน้า Visit ใหม่ (ครั้งที่ 2)`);
    }
  }
  await restartVideo(page); // ตัดจอขาวตอนหน้าผู้ป่วยโหลดออกจากคลิป -staff (Retest 3 พ.ย.)
  await startDisposition(page);
  await main.getByRole('radio', { name: 'Improved', exact: true }).check();
  await main.getByRole('radio', { name: 'With Approval', exact: true }).check();
  await chooseDispositionDiagnosis(page, 'K30');
  const { clinical, finding } = dispositionTextBoxes(page);
  await clinical.fill(`ทดสอบ SBH-2618 จำหน่ายผู้ป่วย ${who}`);
  await finding.fill(`ทดสอบ SBH-2618 จำหน่ายผู้ป่วย ${who}`);
  await markEvidence(clicked(page.getByTestId('er-disposition-finalize'), 'ลงนาม'));
  await snapEvidence(page, `ก่อนกด — ลงนาม Disposition ${who}`);
  await signDisposition(page);
  await markEvidence(alerted(page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว')));

  // เปลี่ยนหน้าในแอปผ่านเมนู (ไม่โหลดแอปใหม่ → คลิปไม่มีจอขาว ~8 วิ) · ไม่ได้ค่อยโหลดด้วย URL
  // ล้างกรอบ toast ลงนามก่อน — เปลี่ยนหน้าในแอปแล้วกรอบไม่หายเอง ไปค้างในภาพ "ก่อนกด — จำหน่าย" (Retest 3 พ.ย. ภาพ 13 / 31)
  await holdForClip(page);
  await clearEvidenceMarks(page);
  await openErPatientListFromMenu(page).catch(() => gotoErPatientList(page));
  await filterErListByHn(page, visit.hn);
  await openErListTab(page, 'waiting-for-discharge');
  const row = erListRow(page, visit.en);
  await expect(row, `ผู้ป่วย ${who} ต้องอยู่แท็บ รอจำหน่าย`).toBeVisible({ timeout: 30_000 });
  const button = erDischargeButton(row);
  await markEvidence(expected(row, 'รอจำหน่าย'), clicked(button));
  await snapEvidence(page, `ก่อนกด — จำหน่าย ${who}`);
  await button.click();
  const confirm = erDischargeConfirm(page);
  await expect(confirm).toContainText('ยืนยันการจำหน่ายผู้ป่วยออกจาก ER หรือไม่');
  const discharged = graphqlMutation(page, 'DischargeEncounterStatus', 40_000);
  await confirm.getByRole('button', { name: 'จำหน่าย', exact: true }).click();
  const res = await discharged;
  await expectOk(res, `จำหน่ายผู้ป่วย ${who} ออกจาก ER`);
  const body = (await res.json()) as { data?: { dischargeEncounterStatus?: { accepted?: boolean } } };
  expect(body.data?.dischargeEncounterStatus?.accepted, 'ระบบต้องรับคำสั่งจำหน่าย').toBe(true);
  const toast = page.getByText('ยืนยันการจำหน่ายผู้ป่วยออกจาก ER แล้ว');
  await expect(toast).toBeVisible();
  await markEvidence(alerted(toast));
  await snapEvidence(page, `หลังกด — จำหน่าย ${who} ออกจาก ER แล้ว`);
}

/** ย้ายโซน: หน้า Visit → คัดกรอง ER → คัดกรองซ้ำ (คง ESI เดิม) → เลือกโซนใหม่ → บันทึก (บอร์ดไม่มีปุ่มย้ายโซน) */
async function moveZone(page: Page, visit: ErVisit, level: 2 | 3, zone: string) {
  // ใช้ปุ่มในแผง Overview อย่างเดียว — เปิดเมนูซ้าย "คัดกรอง ER" ด้วยแล้วมีฟอร์ม 2 ชุด กรอกผิดฟอร์ม (รอบ 3 31 ต.ค.)
  await gotoVisit(page, visit);
  const redo = mainOf(page).getByRole('button', { name: 'redo คัดกรองซ้ำ' }).first();
  await expect(redo).toBeVisible({ timeout: 60_000 });
  await restartVideo(page); // ตัดจอขาวตอนหน้าผู้ป่วยโหลดออกจากคลิป -staff
  // Prod รอบ 1: ตีกรอบตอนหน้ายังโหลด กรอบ "กด" ล้อมพื้นที่ว่าง → รอปุ่มนิ่งก่อน
  await expect(async () => {
    const a = await redo.boundingBox();
    await page.waitForTimeout(1_500);
    const b = await redo.boundingBox();
    expect(a && b && Math.abs(a.y - b.y) < 2 && Math.abs(a.x - b.x) < 2).toBe(true);
  }, 'รอปุ่มคัดกรองซ้ำนิ่ง').toPass({ timeout: 30_000 });
  await redo.scrollIntoViewIfNeeded();
  await markEvidence(clicked(redo));
  await snapEvidence(page, 'ก่อนกด — คัดกรองซ้ำ');
  await redo.click();
  await fillErTriageForm(page, { level, vitals: VITALS_NORMAL, chiefComplaint: false });
  const zoneButton = erTriagePanel(page).locator('[class*="er-triage-zone-options"] button').filter({ hasText: new RegExp(`^\\s*${zone}`) }).last();
  await zoneButton.scrollIntoViewIfNeeded();
  await zoneButton.click();
  await expect(zoneButton, `ต้องเลือกโซน ${zone} ได้`).toHaveAttribute('aria-pressed', 'true');
  await markEvidence(filled(zoneButton, `โซน ${zone}`), clicked(erTriageSaveButton(page)));
  await snapEvidence(page, `ก่อนกด — บันทึกคัดกรองซ้ำ โซน ${zone}`);
  const zoned = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
  await saveErTriageForm(page, `บันทึกคัดกรองซ้ำ (ย้ายโซน) ของ ${visit.en}`);
  await expectOk(await zoned, `ย้ายโซน ${visit.en}`);
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
}

/** การ์ดผู้ป่วยบนบอร์ด ER + หัวคอลัมน์โซน */
const boardCard = (page: Page, hn: string) => page.locator('[class*="er-patient-card"]').filter({ hasText: `HN: ${hn}` }).first();
const boardColumn = (page: Page, zone: string) => mainOf(page).locator('strong').filter({ hasText: new RegExp(`^${zone}$`) }).first();

// ไฟล์จด Visit ที่เทสเปิด แยกระบบ — รันด้วย SBH2618_KEEP=1 แล้วปิดทีหลังด้วย --grep @SBH-2618-CLOSE (ปิดเฉพาะรายในไฟล์ ไม่แตะผู้ป่วยของ session อื่นบน Prod)
const STATE_FILE = path.join('.cache', 'SBH-2618', `visits-${envName() ?? 'dev-x'}.json`);
const readState = (): ErVisit[] => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as ErVisit[]; } catch { return []; } };
const writeState = (visits: ErVisit[]) => { fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(visits, null, 2)); };

async function closeVisits(page: Page, opened: Map<string, ErVisit>) {
  if (process.env.SBH2618_KEEP) {
    const all = [...readState().filter((v) => !opened.has(v.en)), ...opened.values()];
    writeState(all);
    test.info().annotations.push({ type: 'หลังเทส', description: `SBH2618_KEEP — ไม่ปิด Visit · จดลง ${STATE_FILE} (${all.length} ราย)` });
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
}

test.describe('SBH-2618 ER รายการงานพยาบาล Redesign (dev-x)', () => {
  test.describe.configure({ timeout: 2_400_000 });

  let opened: Map<string, ErVisit>;
  let nurse: Page | undefined;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
    nurse = undefined;
  });

  test.afterEach(async ({ page }) => {
    if (nurse) {
      await finishVideo(nurse).catch(() => undefined);
      await nurse.context().close().catch(() => undefined);
    }
    await closeVisits(page, opened);
  });

  test(
    'รายชื่อผู้ป่วยแสดงเฉพาะผู้ป่วยใน ER ที่มี order แยกตามโซน + ตารางงานไม่มีคอลัมน์ที่ตัดออก + เปลี่ยนตามสถานะผู้ป่วย (TC 001–010)',
    { tag: ['@SBH-2618', ...Object.values(ISSUE).map((id) => `@${id}`)], annotation: [linear('SBH-2618'), ...Object.values(ISSUE).map(linear)] },
    async ({ page, browser }) => {
      const { note, soft, finish } = makeRunner(page);
      const authorization = trackAuthorization(page);
      const tc010 = process.env.SBH2618_TC010 !== '0';
      // SBH2618_ONLY=TC007 = รันเฉพาะ TC-007 กับผู้ป่วย B รายใหม่ (รอบ 4 ล้มเพราะ dev-x ตอบ 502)
      const only7 = process.env.SBH2618_ONLY === 'TC007';
      if (only7) note('โหมด', 'รันเฉพาะ TC-007 (SBH2618_ONLY=TC007)');
      // SBH2618_ONLY=RERUN + SBH2618_C_HN=<HN> = ใช้ผู้ป่วย C เดิมจากไฟล์ state (ยังอยู่ ER มีรังสี) + B ใหม่ 1 ราย
      //   → จำหน่าย C → TC-001 → TC-010 → TC-007 (Prod 6 พ.ย. รอบ 1: Disposition ของ C หมุนค้าง · ผู้ใช้เลือก "C เดิม + ผู้ป่วยใหม่ 1 ราย")
      const rerun = process.env.SBH2618_ONLY === 'RERUN';
      // SBH2618_ONLY=A98 = ผู้ป่วย A ใหม่รายเดียว → TC-009 → TC-008 (Prod 6 พ.ย. รอบ 1 สวิตช์ค้างเปิด ภาพไม่สะอาด · ผู้ใช้เลือก "รันใหม่ผู้ป่วยใหม่ 1 ราย")
      const onlyA = process.env.SBH2618_ONLY === 'A98';
      if (onlyA) note('โหมด', 'รันเฉพาะ TC-009 / TC-008 กับผู้ป่วย A รายใหม่ (SBH2618_ONLY=A98)');
      const full = !only7 && !rerun && !onlyA;
      let reusedC: ErVisit | undefined;
      if (rerun) {
        reusedC = readState().find((v) => v.hn === process.env.SBH2618_C_HN);
        expect(reusedC, `SBH2618_C_HN=${process.env.SBH2618_C_HN} ต้องอยู่ในไฟล์ state ${STATE_FILE}`).toBeTruthy();
        note('โหมด', `รันซ้ำ TC-001 / 010 / 007 (SBH2618_ONLY=RERUN) · ผู้ป่วย C เดิม HN ${reusedC!.hn} · VN ${reusedC!.vn} · EN ${reusedC!.en}`);
      }

      // ---------- เตรียมผู้ป่วย (Super_User) ----------
      const A = full || onlyA ? await preparePatient(page, 'Ntl2618A', 2, [SETTINGS.imagingCode], note) : ({} as ErVisit);
      const B = onlyA ? ({} as ErVisit) : await preparePatient(page, 'Ntl2618B', 3, [], note);
      const C = reusedC ?? (only7 || onlyA ? ({} as ErVisit) : await preparePatient(page, 'Ntl2618C', 3, [SETTINGS.imagingCode], note));
      const zones = await fetchZones(page, authorization);
      const boardZone = async (hn: string) => {
        const e = (await fetchBoard(page, authorization)).find((x) => x.hn === hn);
        if (!e) return 'ไม่อยู่บนบอร์ด';
        return e.patientStatus === 'bed_waiting' ? 'รอเตียง' : zones.get(e.currentLocationId ?? -1) ?? `location ${e.currentLocationId}`;
      };
      const wantZone = { A: RESUS, B: URGENCY, C: URGENCY };
      for (const [k, v] of [['A', A], ['B', B], ['C', C]] as const) {
        if (!v.hn) continue;
        const z = await boardZone(v.hn);
        note(`โซนบนบอร์ดหลังเตรียม ${k}`, z);
        expect(z, `Pre-condition: ผู้ป่วย ${k} ต้องอยู่โซน ${wantZone[k]} บนบอร์ด`).toBe(wantZone[k]);
      }
      const tasksA = full ? await fetchNurseTasks(page, authorization(), A.en) : [];
      if (full) note('งานพยาบาลของ A (API)', tasksA.map((t) => `${t.type} ${t.name} ${t.status}`).join(' · ') || 'ไม่มี');
      if (full) expect(tasksA.length, 'ผู้ป่วย A ต้องมีงานพยาบาลจาก order รังสี (Pre-condition)').toBeGreaterThan(0);

      nurse = await openNurseWindow(browser);
      const n = nurse;
      // ขั้นที่ดูหน้าจอ Nurse ต้องใช้ runner ของหน้าต่าง Nurse — ภาพ ผ่าน / Error ของ checkStep ถ่ายจากหน้าที่ผูกกับ runner (รอบ 3 ถ่ายผิดหน้าต่าง)
      const { soft: nsoft, finish: nfinish } = makeRunner(n);
      if (full || onlyA) await expect.poll(async () => { await clearSearch(n); return patientBtn(n, A.hn).isVisible(); }, { timeout: 60_000, intervals: [3_000] }).toBe(true);
      if (rerun) await expect.poll(async () => { await clearSearch(n); return patientBtn(n, C.hn).isVisible(); }, { timeout: 60_000, intervals: [3_000] }).toBe(true);

      if (full) {
      // ---------- TC-002 ผู้ป่วย A (มี order) แสดง + ตารางงาน ----------
      await startClip(n, 'TC-002');
      await nsoft(`${TC(2)} พบผู้ป่วย A ใต้โซน ${RESUS} · กดแล้วเห็นงานจาก order`, async () => {
        const btn = patientBtn(n, A.hn);
        await expect(btn).toBeVisible();
        await btn.scrollIntoViewIfNeeded();
        await markEvidence(expected(zoneHeaderOf(n, A.hn), `โซนของ A`), clicked(btn, 'ผู้ป่วย A'));
        await snapEvidence(n, 'ก่อนกด — ผู้ป่วย A ในรายชื่อ');
        await btn.click();
        await expect(mainOf(n).getByText(`HN ${A.hn}`, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
        await expect(taskRows(n).first()).toBeVisible({ timeout: 60_000 });
        const shown = (await taskRows(n).allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
        note(`${TC(2)} แถวงานบนจอ`, shown.join(' | '));
        const rows: CompareRow[] = tasksA.map((t) => {
          const hit = shown.some((s) => s.includes(t.name));
          return { label: t.name, values: [t.type, t.status, hit ? 'มีแถว' : 'ไม่มีแถว'], same: hit };
        });
        await showCompareTable(n, `งานพยาบาลของ A: API เทียบหน้าจอ`, ['ประเภท (API)', 'สถานะ (API)', 'บนจอ'], rows, { side: 'bottom' });
        await markEvidence(expected(taskRows(n).first(), 'งานจาก order ของ A'), expected(summaryLine(n)));
        expect(rows.every((r) => r.same), 'ทุกงานจาก order ของ A ต้องแสดงในตาราง').toBe(true);
      });
      await hideCompareTable(n).catch(() => undefined);

      // ---------- TC-004 ไม่มีคอลัมน์ ประเภท ----------
      await startClip(n, 'TC-004');
      await nsoft(`${TC(4)} ตารางงานไม่มีคอลัมน์ ประเภท และไม่มีป้ายประเภทในแถว`, async () => {
        const headers = (await headerCells(n).allInnerTexts()).map((t) => t.trim());
        note(`${TC(4)} หัวตาราง`, headers.join(' / '));
        const tags = (await taskRows(n).locator('.ant-tag').allInnerTexts()).map((t) => t.trim());
        note(`${TC(4)} ป้ายในแถว`, tags.join(' / ') || '-');
        const typeTags = tags.filter((t) => TYPE_TAGS.includes(t));
        await showCompareTable(n, 'หัวตาราง / ป้ายในแถว', ['ที่เห็น'], [
          { label: 'คอลัมน์ ประเภท', values: [headers.includes('ประเภท') ? 'มี' : 'ไม่มี'], same: !headers.includes('ประเภท') },
          { label: 'ป้ายประเภทในแถว', values: [typeTags.join(', ') || 'ไม่มี'], same: typeTags.length === 0 },
        ], { side: 'bottom' });
        await markEvidence(expected(headerRow(n), 'ไม่มีคอลัมน์ ประเภท'), expected(taskRows(n).first(), 'ไม่มีป้ายประเภท'));
        expect(headers, 'หัวตารางต้องไม่มี ประเภท').not.toContain('ประเภท');
        expect(typeTags, 'แถวงานต้องไม่มีป้ายประเภท').toEqual([]);
      });
      await hideCompareTable(n).catch(() => undefined);

      // ---------- TC-005 ไม่มีคอลัมน์ ผู้รับผิดชอบ / Note ----------
      await startClip(n, 'TC-005');
      await nsoft(`${TC(5)} ตารางงานไม่มีคอลัมน์ ผู้รับผิดชอบ และ Note`, async () => {
        const headers = (await headerCells(n).allInnerTexts()).map((t) => t.trim());
        const selects = await taskRows(n).locator('.ant-select').count();
        const addNote = await taskRows(n).getByText('เพิ่ม Note', { exact: true }).count();
        await showCompareTable(n, 'คอลัมน์ที่ต้องถูกตัด', ['ที่เห็น'], [
          { label: 'คอลัมน์ ผู้รับผิดชอบ', values: [headers.includes('ผู้รับผิดชอบ') ? 'มี' : 'ไม่มี'], same: !headers.includes('ผู้รับผิดชอบ') },
          { label: 'dropdown ผู้รับผิดชอบในแถว', values: [`${selects} ช่อง`], same: selects === 0 },
          { label: 'คอลัมน์ Note', values: [headers.includes('Note') ? 'มี' : 'ไม่มี'], same: !headers.includes('Note') },
          { label: 'ลิงก์ "เพิ่ม Note" ในแถว', values: [`${addNote} ลิงก์`], same: addNote === 0 },
        ], { side: 'bottom' });
        await markEvidence(expected(headerRow(n), 'ไม่มี ผู้รับผิดชอบ / Note'), expected(taskRows(n).first(), 'ไม่มี dropdown / เพิ่ม Note'));
        expect(headers).not.toContain('ผู้รับผิดชอบ');
        expect(headers).not.toContain('Note');
        expect(selects, 'แถวงานต้องไม่มี dropdown ผู้รับผิดชอบ').toBe(0);
        expect(addNote, 'แถวงานต้องไม่มีลิงก์ เพิ่ม Note').toBe(0);
      });
      await hideCompareTable(n).catch(() => undefined);

      // ---------- TC-006 แยกตามโซน (A Resuscitation · C Urgency) เทียบบอร์ด ----------
      await startClip(n, '_wait-006'); // ช่วงที่ user1 ดูแดชบอร์ด ไม่ให้ต่อท้ายคลิป TC-005
      await nsoft(`${TC(6)} ผู้ป่วยอยู่ใต้โซนที่ตรงกับบอร์ด ER (A ${RESUS} · C ${URGENCY})`, async () => {
        // โซนบนแดชบอร์ด ER: ใช้มุมมอง "รายการ" ของหน้าเดียวกัน (มีคอลัมน์ โซน) ค้น HN ทีละราย
        // — มุมมองบอร์ดเลื่อนในกล่องภายใน คอลัมน์ Urgency ยาว วงการ์ดแล้วหัวคอลัมน์หลุดจอ (Retest 3 พ.ย. ภาพ 05 / 06)
        await gotoErPatientList(page);
        await openErListTab(page, 'current');
        await startClip(page, 'TC-006-staff');
        for (const [who, v, zone] of [['A', A, RESUS], ['C', C, URGENCY]] as const) {
          await filterErListByHn(page, v.hn);
          const row = erListRow(page, v.en);
          await expect(row, `ผู้ป่วย ${who} ต้องอยู่แท็บ ผู้ป่วยปัจจุบันใน ER`).toBeVisible({ timeout: 30_000 });
          const zoneCell = await erListCell(page, row, 'โซน');
          const nameCell = await erListCell(page, row, 'ชื่อ-สกุล');
          await expect(zoneCell, `โซนของ ${who} บนแดชบอร์ด`).toContainText(zone);
          await markEvidence(expected(nameCell, `ผู้ป่วย ${who} HN ${v.hn}`), expected(zoneCell, `โซน ${zone}`));
          await snapEvidence(page, `แดชบอร์ด ER (รายการ) — ${who} โซน ${zone}`);
          await clearEvidenceMarks(page);
        }
        // ข้อสังเกต (Retest 3 พ.ย.): ผู้ป่วยใน location "Isolation 1" (269) บอร์ดแสดงใต้คอลัมน์ "Zone Isolate" — เก็บภาพไว้เทียบ ไม่ใช่ Expected
        await (async () => {
          const others = (await fetchBoard(page, authorization)).filter((e) => e.patientStatus === 'current_in_er' && /isolat/i.test(zones.get(e.currentLocationId ?? -1) ?? ''));
          if (!others.length) return;
          await erViewSwitch(page, 'บอร์ด').click();
          const card = boardCard(page, others[0].hn);
          await expect(card).toBeVisible({ timeout: 30_000 });
          const header = mainOf(page).locator('strong').filter({ hasText: /isolat/i }).first();
          await header.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await markEvidence(expected(header, 'หัวคอลัมน์บนบอร์ด'), expected(card, `HN ${others[0].hn} (${zones.get(others[0].currentLocationId ?? -1)})`));
          await snapEvidence(page, 'ข้อสังเกต — บอร์ด ER คอลัมน์ Isolation');
          await clearEvidenceMarks(page);
        })().catch((error: Error) => note('ข้อสังเกต บอร์ด Isolation', `ถ่ายภาพไม่ได้ — ${error.message.split('\n')[0]}`));
        await startClip(page, '_idle-006');

        await startClip(n, 'TC-006');
        await refresh(n);
        const sidebarZones = await waitZone(n, C.hn, URGENCY, 30_000);
        note(`${TC(6)} รายชื่อฝั่งซ้าย`, describe(sidebarZones));
        const board = await fetchBoard(page, authorization);
        const rows: CompareRow[] = [];
        for (const z of sidebarZones) {
          for (const p of z.patients) {
            const e = board.find((x) => x.hn === p.hn);
            const want = !e ? 'ไม่อยู่บนบอร์ด' : e.patientStatus === 'bed_waiting' ? 'รอเตียง' : zones.get(e.currentLocationId ?? -1) ?? '?';
            const mark = p.hn === A.hn ? ' (A)' : p.hn === C.hn ? ' (C)' : '';
            // โซนที่ไม่มีช่วง ESI (เช่น Isolation 1) ป้ายไม่มีคำนำหน้า "zone:" (dev-x 3 พ.ย. 2026) → เทียบชื่อตรงตัวด้วย
            rows.push({ label: `HN ${p.hn}${mark}`, values: [z.label, want], same: z.label.startsWith(`zone: ${want}`) || z.label === want });
          }
        }
        const counts = sidebarZones.map((z) => `${z.label} → ${z.patients.length} ราย`).join(' · ');
        note(`${TC(6)} ป้ายโซน / จำนวนชื่อใต้โซน`, counts);
        // ตารางไว้ด้านขวา (TC นี้ดูรายชื่อฝั่งซ้าย) — ไว้ด้านล่างแล้วบังแถวของ C เมื่อโซน Urgency ยาว (Retest 3 พ.ย. รอบ 4)
        await showCompareTable(n, 'โซนในรายชื่อ เทียบบอร์ด ER (API · ชื่อ location)', ['โซนในรายการงานพยาบาล', 'โซนบนบอร์ด'], rows, { side: 'right' });
        await markEvidence(expected(zoneHeaderOf(n, A.hn), 'A'), expected(patientBtn(n, A.hn)), expected(zoneHeaderOf(n, C.hn), 'C'), expected(patientBtn(n, C.hn)));
        expect(zoneOf(sidebarZones, A.hn), 'A ต้องอยู่ใต้โซน Resuscitation').toMatch(new RegExp(`^zone: ${RESUS}`));
        expect(zoneOf(sidebarZones, C.hn), 'C ต้องอยู่ใต้โซน Urgency').toMatch(new RegExp(`^zone: ${URGENCY}`));
        expect(rows.every((r) => r.same), 'ผู้ป่วยทุกรายต้องอยู่ใต้โซนเดียวกับบอร์ด').toBe(true);
      });
      await hideCompareTable(n).catch(() => undefined);
      // ข้อสังเกต: หัวกลุ่มที่ไม่มีคำนำหน้า "zone:" (เช่น Isolation 1) — ภาพแยกจาก Expected
      await (async () => {
        const plain = sidebar(n).locator('.ant-collapse-header').filter({ hasNotText: /zone:/ }).first();
        if (!(await plain.isVisible())) return;
        const item = zoneItems(n).filter({ has: n.locator('.ant-collapse-header').filter({ hasNotText: /zone:/ }) }).first();
        await markEvidence(expected(plain, 'หัวกลุ่มไม่มี zone: / ช่วง ESI'), expected(item.locator('[class*="_patient-meta_"]').first(), 'ผู้ป่วยใต้กลุ่ม'));
        await snapEvidence(n, 'ข้อสังเกต — หัวกลุ่ม Isolation ในรายการงานพยาบาล');
        await clearEvidenceMarks(n);
      })().catch((error: Error) => note('ข้อสังเกต หัวกลุ่ม Isolation', `ถ่ายภาพไม่ได้ — ${error.message.split('\n')[0]}`));

      // ---------- TC-003 ผู้ป่วย B (ยังไม่มี order) ไม่แสดง ----------
      await startClip(n, 'TC-003');
      await nsoft(`${TC(3)} ไม่พบผู้ป่วย B (ยังไม่มี order) ทุกโซน + ค้นหา HN ไม่พบ`, async () => {
        await clearSearch(n);
        const all = await readSidebar(n);
        note(`${TC(3)} รายชื่อทุกโซน`, describe(all));
        note(`${TC(3)} โซนของ B บนบอร์ด`, await boardZone(B.hn));
        expect(zoneOf(all, B.hn), 'ผู้ป่วย B ต้องไม่อยู่ในโซนใด').toBe('');
        await markEvidence(expected(sidebar(n), `ไม่มี B (HN ${B.hn})`));
        await snapEvidence(n, 'รายชื่อทุกโซน — ไม่มีผู้ป่วย B');
        const found = await searchHn(n, B.hn);
        await markEvidence(filled(searchBox(n), `HN B ${B.hn}`), expected(sidebarEmpty(n), 'ไม่พบผู้ป่วย B'));
        expect(found, 'ค้นหา HN ของ B ต้องไม่พบ').toBe(false);
        await expect(sidebarEmpty(n)).toBeVisible();
      });
      await clearSearch(n);
      }

      if (!only7 && !onlyA) {
      await startClip(n, '_wait-001'); // ช่วงรอจำหน่าย C ไม่ให้ต่อท้ายคลิป TC-003

      // ---------- จำหน่าย C แล้ว TC-001 ----------
      await startClip(page, 'TC-001-staff');
      let cDischarged = false;
      await soft('เตรียม TC-001: จำหน่ายผู้ป่วย C ออกจาก ER (Disposition ลงนาม → จำหน่าย)', async () => {
        await dischargeFromEr(page, C, 'C');
        cDischarged = true;
      });
      await startClip(page, '_idle-001');
      await startClip(n, 'TC-001');
      if (cDischarged) {
        await nsoft(`${TC(1)} ไม่มีกลุ่ม "ออกจาก ER" · ไม่พบผู้ป่วย C ที่จำหน่ายแล้ว`, async () => {
          const still = await waitPresence(n, C.hn, false);
          const all = await readSidebar(n);
          note(`${TC(1)} ป้ายกลุ่มทุกกลุ่ม`, all.map((z) => z.label).join(' · ') || 'ไม่พบผู้ป่วย');
          const leftGroup = all.filter((z) => z.label.includes('ออกจาก ER'));
          await markEvidence(expected(sidebar(n), 'ไม่มีกลุ่ม ออกจาก ER'));
          await snapEvidence(n, 'รายชื่อทุกกลุ่ม — ไม่มีกลุ่ม ออกจาก ER');
          expect(leftGroup, 'ต้องไม่มีกลุ่ม ออกจาก ER').toEqual([]);
          expect(still, 'ผู้ป่วย C ต้องไม่อยู่ในรายชื่อ').toBe(false);
          const found = await searchHn(n, C.hn);
          await markEvidence(filled(searchBox(n), `HN C ${C.hn}`), expected(sidebarEmpty(n), 'ไม่พบผู้ป่วย C'));
          expect(found, 'ค้นหา HN ของ C ต้องไม่พบ').toBe(false);
        });
        await clearSearch(n);
      } else note(`${TC(1)} ตรวจไม่ได้`, 'จำหน่ายผู้ป่วย C ไม่สำเร็จ (Pre-condition ไม่ครบ)');

      // ---------- TC-010 (SBH-3453) สวิตช์ "แสดงผู้ป่วยที่ยังไม่มี Order" ----------
      if (tc010) {
        await startClip(n, 'TC-010');
        await nsoft(`${TC(10)} สวิตช์ แสดงผู้ป่วยที่ยังไม่มี Order: เปิดเห็น B · C ยังไม่แสดง · ปิด B หาย`, async () => {
          const sw = withoutOrders(n);
          await expect(sw).toHaveAttribute('aria-checked', 'false');
          await markEvidence(expected(sw, 'ตั้งต้นปิด'), clicked(sw));
          await snapEvidence(n, 'ก่อนกด — สวิตช์ แสดงผู้ป่วยที่ยังไม่มี Order');
          await sw.click();
          await expect(sw).toHaveAttribute('aria-checked', 'true');
          await expect(patientBtn(n, B.hn), 'เปิดสวิตช์แล้วต้องพบ B').toBeVisible({ timeout: 30_000 });
          const on = await readSidebar(n);
          note(`${TC(10)} เปิดสวิตช์`, describe(on));
          const bZone = zoneOf(on, B.hn);
          const bCount = on.flatMap((z) => z.patients).find((p) => p.hn === B.hn)?.count ?? '';
          await patientBtn(n, B.hn).scrollIntoViewIfNeeded();
          await markEvidence(expected(sw, 'เปิด'), expected(patientBtn(n, B.hn), `B ${bCount} ใต้ Urgency`));
          await snapEvidence(n, 'เปิดสวิตช์ — พบผู้ป่วย B');
          expect(bZone, 'B ต้องอยู่ใต้โซน Urgency').toMatch(new RegExp(`^zone: ${URGENCY}`));
          expect(bCount).toBe('0/0');
          const cFound = await searchHn(n, C.hn);
          note(`${TC(10)} ค้นหา C (จำหน่ายแล้ว) ตอนเปิดสวิตช์`, cFound ? 'พบ' : 'ไม่พบ');
          // พบ C แล้วไม่มีข้อความ "ไม่พบผู้ป่วย" ให้วง — Prod รอบ 1 ตีกรอบ sidebarEmpty แล้วค้าง 20 วิ
          await markEvidence(filled(searchBox(n), `HN C ${C.hn}`), cFound ? expected(patientBtn(n, C.hn), 'ไม่พบ C · จริง: ยังพบ C') : expected(sidebarEmpty(n), 'ไม่พบ C'));
          await snapEvidence(n, 'เปิดสวิตช์ — ค้นหาผู้ป่วย C');
          expect(cFound, 'ผู้ป่วย C ที่จำหน่ายแล้วต้องไม่แสดงแม้เปิดสวิตช์').toBe(false);
          await clearSearch(n);
          await markEvidence(clicked(sw));
          await sw.click();
          await expect(sw).toHaveAttribute('aria-checked', 'false');
          await expect(patientBtn(n, B.hn), 'ปิดสวิตช์แล้ว B ต้องหาย').toBeHidden({ timeout: 30_000 });
          await markEvidence(expected(sw, 'ปิด'), expected(sidebar(n), `ไม่มี B (HN ${B.hn})`));
        });
        await clearSearch(n);
        await setWithoutOrders(n, false); // TC-010 ล้มกลางทางแล้วสวิตช์ต้องไม่ค้างเปิดไปถึง TC-007
      }

      }

      if (!onlyA) {
      // ---------- TC-007 B ได้ order แรก (Lab) ----------
      await startClip(n, 'TC-007');
      await nsoft(`${TC(7)} ขั้น 1 ยืนยันว่าไม่พบผู้ป่วย B ก่อนสั่ง Lab`, async () => {
        await setWithoutOrders(n, false);
        await refresh(n);
        const found = await searchHn(n, B.hn);
        // แสดงสถานะสวิตช์ในตารางเทียบ — พิสูจน์ว่า "ไม่พบ" ไม่ได้มาจากสวิตช์ (Sub Agent ทัก Prod รอบ 1)
        await showCompareTable(n, 'ก่อนสั่ง Lab', ['ที่เห็น'], [
          { label: 'สวิตช์ แสดงผู้ป่วยที่ยังไม่มี Order', values: ['ปิด'], same: true },
          { label: `ค้นหา HN B ${B.hn}`, values: [found ? 'พบ' : 'ไม่พบ'], same: !found },
        ], { side: 'bottom' });
        await markEvidence(filled(searchBox(n), `HN B ${B.hn}`), found ? expected(patientBtn(n, B.hn), 'ยังไม่พบ B · จริง: พบ B') : expected(sidebarEmpty(n), 'ยังไม่พบ B'), expected(withoutOrders(n), 'สวิตช์ปิด'));
        expect(found).toBe(false);
      });
      await hideCompareTable(n).catch(() => undefined);
      await clearSearch(n);
      await startClip(page, 'TC-007-staff');
      let labSent = false;
      await soft(`${TC(7)} ขั้น 2 แพทย์สั่ง Lab ${SETTINGS.labCode} ให้ผู้ป่วย B > ส่ง order`, async () => {
        await gotoVisit(page, B);
        await restartVideo(page); // ตัดจอขาวตอนหน้าผู้ป่วยโหลด
        await openOneDayOrder(page);
        await submitOrders(page, [SETTINGS.labCode]);
        const sent = mainOf(page).getByRole('row', { name: new RegExp(`^(ส่งแล้ว|กำลังดำเนินการ) \\[${SETTINGS.labCode}\\]`) }).first();
        await expect(sent, 'Lab ต้องถูกส่งแล้ว').toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(sent, 'ส่ง Lab แล้ว'));
        await snapEvidence(page, 'หลังกด — ส่ง Lab ให้ผู้ป่วย B');
        labSent = true;
      });
      await startClip(page, '_idle-007');
      if (labSent) {
        await nsoft(`${TC(7)} ขั้น 3 รีเฟรช — ผู้ป่วย B แสดงใต้โซน ${URGENCY} + เห็นงาน Lab`, async () => {
          const present = await waitPresence(n, B.hn, true, 60_000);
          const tasksB = await fetchNurseTasks(page, authorization(), B.en);
          note(`${TC(7)} งานพยาบาลของ B (API) หลังสั่ง Lab 60 วิ`, tasksB.map((t) => `${t.type} ${t.name} ${t.status}`).join(' · ') || 'ไม่มี');
          if (!present) {
            const found = await searchHn(n, B.hn);
            await markEvidence(filled(searchBox(n), `HN B ${B.hn}`), expected(sidebarEmpty(n), 'ยังไม่พบ B'));
            await showCompareTable(n, 'ผู้ป่วย B หลังสั่ง Lab', ['ที่เห็น'], [
              { label: 'B ในรายชื่อ', values: [found ? 'พบ' : 'ไม่พบ'], same: found },
              { label: 'งานพยาบาลของ B (API)', values: [`${tasksB.length} งาน`], same: tasksB.length > 0 },
            ], { side: 'bottom' });
            expect(found, 'สั่ง Lab แล้วผู้ป่วย B ต้องแสดงในรายชื่อ').toBe(true);
          }
          // ตัวนับ x/y ของแถวผู้ป่วยอัปเดตช้ากว่าแผงงาน (Prod รอบ 1 B ยัง 0/0) → รีเฟรชจนตัวนับไม่ใช่ 0/0 ก่อนถ่าย
          let all = await readSidebar(n);
          const countOf = (zs: SidebarZone[]) => zs.flatMap((z) => z.patients).find((p) => p.hn === B.hn)?.count ?? '';
          for (let i = 0; i < 6 && countOf(all) === '0/0'; i++) { await refresh(n); all = await readSidebar(n); }
          note(`${TC(7)} ขั้น 3 ตัวนับของ B`, countOf(all) || '-');
          expect(zoneOf(all, B.hn), 'B ต้องอยู่ใต้โซน Urgency').toMatch(new RegExp(`^zone: ${URGENCY}`));
          await showCompareTable(n, 'ผู้ป่วย B หลังสั่ง Lab', ['ที่เห็น'], [
            { label: 'สวิตช์ แสดงผู้ป่วยที่ยังไม่มี Order', values: [(await withoutOrders(n).getAttribute('aria-checked')) === 'true' ? 'เปิด' : 'ปิด'], same: (await withoutOrders(n).getAttribute('aria-checked')) !== 'true' },
            { label: 'โซนของ B', values: [zoneOf(all, B.hn)], same: zoneOf(all, B.hn).startsWith(`zone: ${URGENCY}`) },
            { label: 'ตัวนับงานของ B', values: [countOf(all)], same: countOf(all) !== '0/0' },
          ], { side: 'right' });
          await patientBtn(n, B.hn).click();
          await expect(taskRows(n).first()).toBeVisible({ timeout: 30_000 });
          await markEvidence(expected(zoneHeaderOf(n, B.hn), 'โซนของ B'), expected(patientBtn(n, B.hn)), expected(taskRows(n).first(), 'งาน Lab'));
        });
        await hideCompareTable(n).catch(() => undefined);
        await clearSearch(n);
      } else note(`${TC(7)} ขั้น 3 ตรวจไม่ได้`, 'ส่ง Lab ไม่สำเร็จ');
      }

      if (full || onlyA) {
      // ---------- TC-009 ย้าย A จาก Resuscitation ไป Urgency ----------
      await startClip(n, 'TC-009');
      await nsoft(`${TC(9)} ขั้น 1 ผู้ป่วย A อยู่ใต้โซน ${RESUS}`, async () => {
        await setWithoutOrders(n, false);
        const all = await waitZone(n, A.hn, RESUS, 10_000);
        note(`${TC(9)} ก่อนย้าย`, describe(all));
        await patientBtn(n, A.hn).scrollIntoViewIfNeeded();
        await markEvidence(expected(zoneHeaderOf(n, A.hn), 'ก่อนย้าย'), expected(patientBtn(n, A.hn), 'ผู้ป่วย A'));
        await holdForClip(n); // คลิป Nurse ถัดจากนี้เป็นช่วงรอ user1 ย้ายโซน — ให้กรอบขั้น 1 อยู่นานพอ
        expect(zoneOf(all, A.hn)).toMatch(new RegExp(`^zone: ${RESUS}`));
      });
      await startClip(page, 'TC-009-staff');
      let moved = false;
      await soft(`${TC(9)} ขั้น 2 ย้ายผู้ป่วย A ไปโซน ${URGENCY} (คัดกรองซ้ำ เลือกโซน)`, async () => {
        await moveZone(page, A, 2, URGENCY);
        await expect.poll(() => boardZone(A.hn), { timeout: 60_000, message: 'บอร์ดต้องย้าย A ไป Urgency' }).toBe(URGENCY);
        // ไปแดชบอร์ดผ่านเมนู (ไม่โหลดแอปใหม่ → คลิปไม่มีจอขาว) · มุมมองบอร์ด
        await openErMenu(page, 'แดชบอร์ด / คิว').catch(() => gotoErDashboard(page));
        const boardView = erViewSwitch(page, 'บอร์ด');
        if (await boardView.isVisible() && !((await boardView.getAttribute('class')) ?? '').includes('selected')) await boardView.click();
        await expect(boardCard(page, A.hn)).toBeVisible({ timeout: 60_000 });
        await boardColumn(page, URGENCY).evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await markEvidence(expected(boardColumn(page, URGENCY)), expected(boardCard(page, A.hn), 'A อยู่ Urgency'));
        await snapEvidence(page, 'บอร์ด ER — A ย้ายไป Urgency');
        moved = true;
      });
      await startClip(page, '_idle-009');
      if (moved) {
        await nsoft(`${TC(9)} ขั้น 3 รีเฟรช — A อยู่ใต้ ${URGENCY} ไม่อยู่ใต้ ${RESUS}`, async () => {
          const all = await waitZone(n, A.hn, URGENCY, 60_000);
          // รอบ 4: หลังย้ายโซนแผงขวาขึ้น 'ไม่สามารถโหลดรายการงานได้' (ผู้ป่วยที่เลือกอยู่คือ A) — จดไว้ดูว่าเกิดซ้ำไหม
          const paneError = await mainOf(n).getByText('ไม่สามารถโหลดรายการงานได้').isVisible();
          note(`${TC(9)} แผงขวาหลังย้ายโซน`, paneError ? 'ขึ้น เกิดข้อผิดพลาด ไม่สามารถโหลดรายการงานได้' : 'แสดงปกติ');
          note(`${TC(9)} หลังย้าย`, describe(all));
          const inResus = all.filter((z) => z.label.startsWith(`zone: ${RESUS}`)).some((z) => z.patients.some((p) => p.hn === A.hn));
          // เลือก A ให้แผงขวาเป็นของ A (Prod รอบ 1 แผงขวาค้างเป็น B) + ตารางยืนยันทุกกลุ่ม (Sub Agent ทัก: "ไม่อยู่ใต้ Resuscitation" เห็นแค่ทางอ้อม)
          await patientBtn(n, A.hn).click();
          await expect(mainOf(n).getByText(`HN ${A.hn}`, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
          await showCompareTable(n, 'กลุ่มของผู้ป่วย A หลังย้ายโซน', ['ที่เห็น'], [
            { label: 'สวิตช์ แสดงผู้ป่วยที่ยังไม่มี Order', values: [(await withoutOrders(n).getAttribute('aria-checked')) === 'true' ? 'เปิด' : 'ปิด'], same: true },
            { label: 'กลุ่มทั้งหมดในรายชื่อ', values: [all.map((z) => z.label).join(' · ') || '-'], same: true },
            { label: `กลุ่มที่มี HN ${A.hn}`, values: [zoneOf(all, A.hn) || 'ไม่พบ'], same: zoneOf(all, A.hn).startsWith(`zone: ${URGENCY}`) },
            { label: `HN ${A.hn} ใต้ ${RESUS}`, values: [inResus ? 'มี' : 'ไม่มี'], same: !inResus },
          ], { side: 'bottom' });
          await patientBtn(n, A.hn).scrollIntoViewIfNeeded();
          const marks = [expected(zoneHeaderOf(n, A.hn), 'หลังย้าย'), expected(patientBtn(n, A.hn), 'ผู้ป่วย A')];
          if (await zoneHeader(n, RESUS).isVisible()) marks.push(expected(zoneHeader(n, RESUS), `ไม่มี A (HN ${A.hn})`));
          await markEvidence(...marks);
          expect(zoneOf(all, A.hn), 'A ต้องอยู่ใต้โซน Urgency').toMatch(new RegExp(`^zone: ${URGENCY}`));
          expect(inResus, 'A ต้องไม่อยู่ใต้โซน Resuscitation แล้ว').toBe(false);
        });
      } else note(`${TC(9)} ขั้น 3 ตรวจไม่ได้`, 'ย้ายโซนไม่สำเร็จ');

      await hideCompareTable(n).catch(() => undefined);
      // ---------- TC-008 จำหน่าย A ----------
      await startClip(n, 'TC-008');
      await nsoft(`${TC(8)} ขั้น 1 พบผู้ป่วย A (มี order) ในรายชื่อ`, async () => {
        await clearSearch(n);
        await expect(patientBtn(n, A.hn)).toBeVisible({ timeout: 30_000 });
        await patientBtn(n, A.hn).scrollIntoViewIfNeeded();
        await markEvidence(expected(patientBtn(n, A.hn), 'ผู้ป่วย A'));
        await holdForClip(n); // คลิป Nurse ถัดจากนี้เป็นช่วงรอ user1 จำหน่าย A
        await snapEvidence(n, 'ก่อนจำหน่าย — พบผู้ป่วย A');
      });
      await startClip(page, 'TC-008-staff');
      let aDischarged = false;
      await soft(`${TC(8)} ขั้น 2 จำหน่ายผู้ป่วย A ออกจาก ER`, async () => {
        await dischargeFromEr(page, A, 'A');
        aDischarged = true;
      });
      await startClip(page, '_cleanup'); // ขั้นปิด Visit ที่การเงินของ afterEach ไม่ให้ติดคลิป TC-008-staff
      if (aDischarged) {
        await nsoft(`${TC(8)} ขั้น 3 รีเฟรช — ไม่พบ A ทุกโซน · ไม่มีกลุ่ม ออกจาก ER`, async () => {
          const still = await waitPresence(n, A.hn, false);
          const all = await readSidebar(n);
          note(`${TC(8)} หลังจำหน่าย`, describe(all));
          // ตารางยืนยันกลุ่มทั้งหมด (ภาพเห็นกลุ่มไม่ครบจอเมื่อรายชื่อยาว — Sub Agent ทัก Prod รอบ 1)
          const leftGroups = all.filter((z) => z.label.includes('ออกจาก ER'));
          await showCompareTable(n, 'รายชื่อทุกกลุ่มหลังจำหน่าย A', ['ที่เห็น'], [
            { label: 'สวิตช์ แสดงผู้ป่วยที่ยังไม่มี Order', values: [(await withoutOrders(n).getAttribute('aria-checked')) === 'true' ? 'เปิด' : 'ปิด'], same: true },
            { label: 'กลุ่มทั้งหมดในรายชื่อ', values: [all.map((z) => z.label).join(' · ') || 'ไม่มีผู้ป่วย'], same: true },
            { label: 'กลุ่ม ออกจาก ER', values: [leftGroups.length ? 'มี' : 'ไม่มี'], same: leftGroups.length === 0 },
            { label: `HN ${A.hn} ในรายชื่อ`, values: [still ? 'มี' : 'ไม่มี'], same: !still },
          ], { side: 'right' });
          await markEvidence(expected(sidebar(n), `ไม่มี A (HN ${A.hn}) · ไม่มีกลุ่ม ออกจาก ER`));
          await snapEvidence(n, 'หลังจำหน่าย — รายชื่อทุกกลุ่ม');
          expect(all.filter((z) => z.label.includes('ออกจาก ER')), 'ต้องไม่มีกลุ่ม ออกจาก ER').toEqual([]);
          expect(still, 'A ต้องไม่อยู่ในรายชื่อแล้ว').toBe(false);
          const found = await searchHn(n, A.hn);
          await markEvidence(filled(searchBox(n), `HN A ${A.hn}`), expected(sidebarEmpty(n), 'ไม่พบผู้ป่วย A'));
          expect(found, 'ค้นหา HN ของ A ต้องไม่พบ').toBe(false);
        });
      } else note(`${TC(8)} ขั้น 3 ตรวจไม่ได้`, 'จำหน่ายผู้ป่วย A ไม่สำเร็จ');

      }

      await holdForClip(n);
      let nurseFailed: unknown;
      try {
        nfinish();
      } catch (error) {
        nurseFailed = error;
      }
      finish();
      if (nurseFailed) throw nurseFailed;
    },
  );

  test('ปิด Visit ผู้ป่วยที่รอบ KEEP จดไว้ (เฉพาะรายในไฟล์ state)', { tag: ['@SBH-2618-CLOSE'] }, async ({ page }) => {
    test.setTimeout(900_000);
    const visits = readState();
    test.info().annotations.push({ type: 'ไฟล์ state', description: `${STATE_FILE} · ${visits.length} ราย` });
    const left: ErVisit[] = [];
    for (const visit of visits) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => { left.push(visit); return `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`; },
      );
      test.info().annotations.push({ type: 'ปิด Visit', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
    writeState(left);
    expect(left.map((v) => v.hn), 'ปิด Visit ครบทุกราย').toEqual([]);
  });
});
