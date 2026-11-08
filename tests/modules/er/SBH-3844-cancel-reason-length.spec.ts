import { type Page } from '@playwright/test';
import { gotoErDashboard, type ErVisit } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { alerted, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { gotoVisit, options } from '../../../mock-data/uat-play';

// SBH-3844 [Bug][ER][ยกเลิก Encounter] เหตุผลการยกเลิกยาวเกิน 30 ตัวอักษร ยกเลิกไม่ได้ (value too long) ทั้งที่ช่องให้พิมพ์ได้ 80
//   การ์ดบั๊ก (ไม่มี TC) — เปิดจาก SBH-2947 TC-007 · ตัวแก้ 3 PR: cortex-x VARCHAR(80) · cortex-api validate ≤ 80 · cortex-ui รับได้ 80
// Retest 7 พ.ย. 2026 (dev-x · ไฟล์แอป index-CgKmiuKR.js) — ผู้ใช้เลือกทดสอบ 53 + 80 + 81 ตัวอักษร · ผลลง Comment (ผ่าน = Done on dev-x)
//   ข้อ 1: ผู้ป่วย AUTO รายที่ 1 ยกเลิก Encounter ด้วยเหตุผล 53 ตัวอักษร (ข้อความแบบเดิมในการ์ด) → ต้องยกเลิกได้ ไม่มี value too long
//   ข้อ 2: ผู้ป่วย AUTO รายที่ 2 พิมพ์ 81 ตัวอักษร → ช่องรับแค่ 80 · ยกเลิกด้วย 80 ตัวอักษรพอดี → ต้องยกเลิกได้
//   ผู้ป่วยไม่คัดกรอง (ไม่ต้องใช้) · ยกเลิกเองในเทส = ไม่มีอะไรค้าง (R10 / R11) · คลิป 1 ไฟล์ต่อข้อ (R61)
// รัน (dev-x): npx playwright test --headed --grep "@SBH-3844( |$)"
// รัน (SBH Prod · ผู้ใช้อนุญาต 7 พ.ย. 2026 สร้างผู้ป่วย AUTO 2 ราย = เพดาน): npm run card:prod -- --headed --grep "@SBH-3844( |$)"
//   ล้มกลางทาง → รันต่อกับรายเดิมด้วย SBH3844_ONLY / SBH3844_A / SBH3844_B (ห้ามรันใหม่ที่สร้างผู้ป่วยเพิ่ม)

const REASON_53 = 'ทดสอบเหตุผลการยกเลิกที่ยาวเกินสามสิบตัวอักษร SBH-3844';
const REASON_80 = ('ทดสอบเหตุผลยกเลิก 80 ตัวอักษร SBH-3844 ' + '0123456789'.repeat(8)).slice(0, 80);
const REASON_81 = REASON_80 + 'X';

const mainOf = (p: Page) => p.getByRole('main');

interface CancelResult {
  typed: string;
  counter: string;
  maxLength: string;
  gqlStatus: number;
  gqlError: string;
  apiStatus: string;
  apiReason: string;
}

/** เปิดหน้าต่างยกเลิกจากช่องสถานะ แล้วคืน dialog + ช่องเหตุผล */
async function openCancelDialog(page: Page, v: ErVisit) {
  const status = mainOf(page).locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
  await expect(status).toBeVisible({ timeout: 60_000 });
  await markEvidence(clicked(status, 'ช่องสถานะ'));
  await holdForClip(page, 800);
  await clearEvidenceMarks(page);
  await status.click();
  await options(page).filter({ hasText: /^ยกเลิก$/ }).click();
  const dialog = page.getByRole('dialog', { name: /ต้องการยกเลิก/ });
  await expect(dialog).toContainText(v.en);
  const reason = dialog.getByRole('textbox', { name: 'ระบุเหตุผลการยกเลิก' });
  return { status, dialog, reason };
}

/** ตัวนับตัวอักษรของช่องเหตุผล (antd show-count) */
async function counterOf(page: Page) {
  const dialog = page.getByRole('dialog', { name: /ต้องการยกเลิก/ });
  // dev-x 7 พ.ย.: ตัวนับ "53 / 80" อยู่ใน suffix ของ input (.ant-input-show-count-suffix)
  const c = dialog.locator('.ant-input-show-count-suffix, .ant-input-data-count, [data-count]').first();
  if (!(await c.count())) return { loc: undefined, text: '-' };
  const text = ((await c.textContent())?.trim() || (await c.getAttribute('data-count')) || '-').trim();
  return { loc: c, text };
}

/** กดยืนยัน → ผล graphql cancelEncounter + แจ้งเตือน + สถานะจาก API */
async function confirmCancel(page: Page, v: ErVisit, auth: () => string, note: (t: string, d: string) => void, base: Pick<CancelResult, 'typed' | 'counter' | 'maxLength'>): Promise<CancelResult> {
  const dialog = page.getByRole('dialog', { name: /ต้องการยกเลิก/ });
  const confirm = dialog.getByRole('button', { name: 'ยืนยัน' });
  const res = page.waitForResponse((r) => r.request().method() === 'POST' && /\/cortex-api\/graphql/.test(r.url()) && /cancelEncounter/i.test(r.request().postData() ?? ''), { timeout: 40_000 });
  await confirm.click();
  const response = await res;
  const body = await response.text();
  note('ผลคำสั่ง cancelEncounter', `${response.status()} · ${body.slice(0, 300)}`);
  let gqlError = '';
  try {
    const json = JSON.parse(body) as { errors?: { message: string }[] };
    gqlError = (json.errors ?? []).map((e) => e.message).join(' | ');
  } catch {
    gqlError = response.ok() ? '' : body.slice(0, 200);
  }
  // แจ้งเตือนหลังกด (สำเร็จ / ไม่สำเร็จ) — ถ่ายก่อนหาย
  const notice = page.locator('.ant-notification-notice, .ant-message-notice').filter({ visible: true }).first();
  if (gqlError) {
    // ไม่ผ่าน: แจ้งเตือน error อยู่หลังฉากเบลอของหน้าต่างยืนยัน และหายเองใน ~4.5 วิ (รอบแรก 7 พ.ย. หายก่อนถ่าย)
    // → รอแจ้งเตือนขึ้น · กด ย้อนกลับ ทันที · hover แจ้งเตือนค้างไว้ (antd หยุดนับเวลาขณะ hover) แล้วตีกรอบ / ถ่าย
    const err = page.locator('.ant-notification-notice').filter({ hasText: /value too long|ไม่สามารถยกเลิก/ }).first();
    const shown = await err.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    if (await dialog.isVisible().catch(() => false)) await dialog.getByRole('button', { name: 'ย้อนกลับ' }).click().catch(() => undefined);
    if (shown && (await err.isVisible().catch(() => false))) {
      await err.hover().catch(() => undefined);
      note('แจ้งเตือนหลังกด', ((await err.textContent()) ?? '').trim().slice(0, 200));
      await markEvidence(alerted(err, 'ยกเลิกได้ · จริง: value too long (30)'));
      await holdForClip(page, 2_500);
      await snapEvidence(page, 'หลังกด — แจ้งเตือนยกเลิกไม่ได้');
      await clearEvidenceMarks(page);
    } else {
      note('แจ้งเตือนหลังกด', 'ไม่ทันเห็นแจ้งเตือนบนจอ (ดูผลคำสั่งจาก response)');
    }
    await expect(dialog).toBeHidden({ timeout: 10_000 }).catch(() => undefined);
    await page.mouse.move(960, 600);
  } else {
    if (await notice.waitFor({ timeout: 6_000 }).then(() => true, () => false)) {
      note('แจ้งเตือนหลังกด', ((await notice.textContent()) ?? '').trim().slice(0, 200));
    }
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    if (await notice.isVisible().catch(() => false)) {
      await markEvidence(alerted(notice, 'ผลหลังกดยืนยัน'));
      await snapEvidence(page, 'หลังกด — แจ้งเตือน');
      await clearEvidenceMarks(page);
    }
  }
  const enc = (await (await page.request.get(`/cortex-api/er/encounters/${v.en}`, { headers: { authorization: auth() } })).json().catch(() => ({}))) as Record<string, unknown>;
  const reasonKey = Object.keys(enc).find((k) => /cancel.*reason|reason/i.test(k));
  const apiReason = reasonKey ? String(enc[reasonKey] ?? '') : '';
  const apiStatus = String(enc.latestStatusCode ?? '-');
  note('Encounter หลังกด (API)', `latestStatusCode ${apiStatus} · ${reasonKey ?? 'ไม่มีช่องเหตุผล'}${reasonKey ? ` = "${apiReason}" (${[...apiReason].length} ตัว)` : ''}`);
  return { ...base, gqlStatus: response.status(), gqlError, apiStatus, apiReason };
}

/** ตารางเทียบ + กรอบช่องสถานะ (ผลบนจอ) */
async function showResult(page: Page, v: ErVisit, r: CancelResult, expectLen: number) {
  const ok = !r.gqlError && r.gqlStatus === 200;
  const cancelled = /cancel/i.test(r.apiStatus);
  const rows = [
    { label: 'เหตุผลที่พิมพ์ (ในช่อง)', values: [`${[...r.typed].length} ตัวอักษร`], same: [...r.typed].length === expectLen },
    { label: 'ตัวนับ / maxlength ของช่อง', values: [`${r.counter} · maxlength ${r.maxLength}`], same: r.maxLength === '80' },
    { label: 'คำสั่ง cancelEncounter', values: [ok ? `${r.gqlStatus} ไม่มี error` : `${r.gqlStatus} ${r.gqlError.slice(0, 90)}`], same: ok },
    { label: 'สถานะ Encounter (API)', values: [r.apiStatus], same: cancelled },
  ];
  if (r.apiReason) rows.push({ label: 'เหตุผลที่บันทึก (API)', values: [`${[...r.apiReason].length} ตัวอักษร`], same: r.apiReason === r.typed });
  await showCompareTable(page, `ยกเลิก Encounter ${v.en} ด้วยเหตุผล ${expectLen} ตัวอักษร`, ['ผลที่ได้'], rows, { side: 'bottom' });
  const status = mainOf(page).locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
  if (await status.isVisible().catch(() => false)) {
    const text = ((await status.textContent()) ?? '').trim();
    await markEvidence(expected(status, cancelled ? `สถานะ = ${text || '-'}` : `ยกเลิก · จริง: ${text || '-'}`));
  }
  await holdForClip(page, 2_500);
  return { ok, cancelled };
}

/** เก็บกวาด: Encounter ที่ยังไม่ถูกยกเลิก → ยกเลิกด้วยเหตุผลสั้น (≤ 30 ตัวอักษร) ไม่ให้ค้างบนบอร์ด ER */
async function cleanupCancel(page: Page, v: ErVisit, auth: () => string, note: (t: string, d: string) => void) {
  const status = async () => String(((await (await page.request.get(`/cortex-api/er/encounters/${v.en}`, { headers: { authorization: auth() } })).json().catch(() => ({}))) as { latestStatusCode?: string }).latestStatusCode ?? '-');
  if (/cancel/i.test(await status())) return;
  try {
    await gotoVisit(page, v);
    const box = mainOf(page).locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
    await expect(box).toBeVisible({ timeout: 60_000 });
    await box.click();
    await options(page).filter({ hasText: /^ยกเลิก$/ }).click();
    const dialog = page.getByRole('dialog', { name: /ต้องการยกเลิก/ });
    await expect(dialog).toContainText(v.en);
    await dialog.getByRole('textbox', { name: 'ระบุเหตุผลการยกเลิก' }).fill('เก็บกวาด SBH-3844');
    const res = page.waitForResponse((r) => r.request().method() === 'POST' && /\/cortex-api\/graphql/.test(r.url()) && /cancelEncounter/i.test(r.request().postData() ?? ''), { timeout: 40_000 });
    await dialog.getByRole('button', { name: 'ยืนยัน' }).click();
    await res;
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    note('เก็บกวาด', `ยกเลิก Encounter ${v.en} ด้วยเหตุผลสั้น → ${await status()}`);
  } catch (error) {
    note('เก็บกวาด', `ยกเลิก ${v.en} ไม่สำเร็จ — ${(error as Error).message.split('\n')[0]}`);
  }
}

test.describe('SBH-3844 Retest เหตุผลยกเลิก Encounter ยาวได้ถึง 80 ตัวอักษร', () => {
  test.describe.configure({ timeout: 900_000 });

  test('ยกเลิก Encounter ด้วยเหตุผล 53 / 80 ตัวอักษร · พิมพ์ 81 ช่องรับแค่ 80', { tag: ['@SBH-3844'], annotation: [{ type: 'issue', description: 'https://linear.app/cortexcloud/issue/SBH-3844' }] }, async ({ page }) => {
    const { note, soft, finish } = makeRunner(page);
    const auth = trackAuthorization(page);
    note('เหตุผลที่ใช้', `53 = "${REASON_53}" (${[...REASON_53].length}) · 80 = "${REASON_80}" (${[...REASON_80].length})`);

    // โหมดทำต่อ (SBH Prod — เพดาน 2 ราย): SBH3844_ONLY=1|2 รันเฉพาะข้อ · SBH3844_A / SBH3844_B="HN:VN:EN" ใช้ผู้ป่วยเดิม ไม่สร้างใหม่
    const only = process.env.SBH3844_ONLY;
    const reuse = (s?: string) => (s ? (([hn, vn, en]) => ({ hn, vn, en }) as ErVisit)(s.split(':')) : undefined);
    const prepare = async (label: string, envValue: string | undefined, who: string) => {
      await gotoErDashboard(page);
      const old = reuse(envValue);
      if (old) {
        note(who, `ใช้รายเดิม HN ${old.hn} · VN ${old.vn} · EN ${old.en}`);
        return old;
      }
      const p = newTestPatient(label);
      const v = await registerAndOpenErVisit(page, p);
      note(who, `${p.firstName} ${p.familyName} · HN ${v.hn} · VN ${v.vn} · EN ${v.en}`);
      return v;
    };

    // ---------- ข้อ 1: 53 ตัวอักษร ----------
    if (only !== '2') {
    const A = await prepare('Bug3844A', process.env.SBH3844_A, 'ผู้ป่วยข้อ 1');
    await gotoVisit(page, A);
    await startClip(page, 'CASE-53');
    await soft(`ข้อ 1 ยกเลิก Encounter ด้วยเหตุผล ${[...REASON_53].length} ตัวอักษร → ยกเลิกได้`, async () => {
      const { reason, dialog } = await openCancelDialog(page, A);
      await reason.fill(REASON_53);
      const typed = await reason.inputValue();
      const maxLength = (await reason.getAttribute('maxlength')) ?? '-';
      const c = await counterOf(page);
      note('ข้อ 1 ช่องเหตุผล', `พิมพ์ได้ ${[...typed].length} ตัว · ตัวนับ ${c.text} · maxlength ${maxLength}`);
      await markEvidence(filled(reason, `${[...typed].length} ตัวอักษร`), ...(c.loc ? [expected(c.loc, `ตัวนับ ${c.text}`)] : []), clicked(dialog.getByRole('button', { name: 'ยืนยัน' }), 'ยืนยัน'));
      await holdForClip(page, 1_500);
      await snapEvidence(page, 'ข้อ1 ก่อนกด — ยืนยัน 53 ตัว');
      await clearEvidenceMarks(page);
      const r = await confirmCancel(page, A, auth, note, { typed, counter: c.text, maxLength });
      const { ok, cancelled } = await showResult(page, A, r, [...REASON_53].length);
      expect(typed, 'ช่องต้องรับเหตุผล 53 ตัวครบ').toBe(REASON_53);
      expect(r.gqlError, 'ต้องไม่มี error (เดิม value too long (30))').toBe('');
      expect(ok, 'คำสั่งยกเลิกต้องสำเร็จ').toBe(true);
      expect(cancelled, 'สถานะ Encounter ต้องเป็นยกเลิก').toBe(true);
    });
    await hideCompareTable(page).catch(() => undefined);
    await clearEvidenceMarks(page);

    await startClip(page, 'gap');
    await cleanupCancel(page, A, auth, note);
    }

    // ---------- ข้อ 2: พิมพ์ 81 → รับ 80 · ยกเลิกด้วย 80 ----------
    if (only !== '1') {
    const B = await prepare('Bug3844B', process.env.SBH3844_B, 'ผู้ป่วยข้อ 2');
    await gotoVisit(page, B);
    await startClip(page, 'CASE-80');
    await soft('ข้อ 2 พิมพ์ 81 ตัวอักษร ช่องรับแค่ 80 → ยกเลิกด้วย 80 ตัวอักษรได้', async () => {
      const { reason, dialog } = await openCancelDialog(page, B);
      // 2.1 พิมพ์ 81 ตัว
      await reason.fill(REASON_81);
      const typed81 = await reason.inputValue();
      const maxLength = (await reason.getAttribute('maxlength')) ?? '-';
      const c81 = await counterOf(page);
      note('ข้อ 2 พิมพ์ 81', `ช่องรับ ${[...typed81].length} ตัว · ตัวนับ ${c81.text} · maxlength ${maxLength}`);
      await markEvidence(filled(reason, `พิมพ์ 81 · ช่องรับ ${[...typed81].length}`), ...(c81.loc ? [expected(c81.loc, `ไม่เกิน 80 · ตัวนับ ${c81.text}`)] : []));
      await holdForClip(page, 1_500);
      await snapEvidence(page, 'ข้อ2 พิมพ์ 81 ช่องรับ 80');
      await clearEvidenceMarks(page);
      expect([...typed81].length, 'พิมพ์ 81 ตัว ช่องต้องรับไม่เกิน 80').toBeLessThanOrEqual(80);
      // 2.2 ยกเลิกด้วย 80 ตัวพอดี
      await reason.fill(REASON_80);
      const typed = await reason.inputValue();
      const c = await counterOf(page);
      await markEvidence(filled(reason, `${[...typed].length} ตัวอักษร`), ...(c.loc ? [expected(c.loc, `ตัวนับ ${c.text}`)] : []), clicked(dialog.getByRole('button', { name: 'ยืนยัน' }), 'ยืนยัน'));
      await holdForClip(page, 1_500);
      await snapEvidence(page, 'ข้อ2 ก่อนกด — ยืนยัน 80 ตัว');
      await clearEvidenceMarks(page);
      const r = await confirmCancel(page, B, auth, note, { typed, counter: c.text, maxLength });
      const { ok, cancelled } = await showResult(page, B, r, 80);
      expect(typed, 'ช่องต้องรับเหตุผล 80 ตัวครบ').toBe(REASON_80);
      expect(r.gqlError, 'ต้องไม่มี error').toBe('');
      expect(ok, 'คำสั่งยกเลิกต้องสำเร็จ').toBe(true);
      expect(cancelled, 'สถานะ Encounter ต้องเป็นยกเลิก').toBe(true);
    });
    await hideCompareTable(page).catch(() => undefined);
    await startClip(page, 'after');
    await cleanupCancel(page, B, auth, note);
    }
    finish();
  });

  // เก็บกวาดรายที่ค้างจากรอบก่อน: SBH3844_CLEANUP="HN:VN:EN,HN:VN:EN" → ยกเลิกด้วยเหตุผลสั้น
  test('เก็บกวาด Encounter ที่ยกเลิกไม่ได้จากรอบก่อน', { tag: ['@SBH-3844-CLEANUP'] }, async ({ page }) => {
    const list = (process.env.SBH3844_CLEANUP ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    test.skip(!list.length, 'ไม่ได้ตั้ง SBH3844_CLEANUP');
    const { note } = makeRunner(page);
    const auth = trackAuthorization(page);
    await gotoErDashboard(page);
    for (const item of list) {
      const [hn, vn, en] = item.split(':');
      await cleanupCancel(page, { hn, vn, en } as ErVisit, auth, note);
    }
  });
});
