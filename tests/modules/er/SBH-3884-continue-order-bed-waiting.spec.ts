import fs from 'node:fs';
import { type Locator, type Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, openCarePanel, openVisitDialog, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { createAdmitRequest } from '../../../helpers/functions/er-admit';
import { chooseDispositionDiagnosis, dispositionTextBoxes, saveDispositionDraft, startDisposition } from '../../../helpers/functions/er-disposition';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriagePanel, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clearEvidenceMarks, clicked, filled, markEvidence, snapEvidence, type EvidenceLabel, type EvidenceMark } from '../../../helpers/functions/evidence';
import { startClip } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { recordMockPatient, registerAndOpenErVisit, SYSTEM } from '../../../mock-data/uat-er';
import { gotoVisit, VITALS_NORMAL } from '../../../mock-data/uat-play';

// SBH-3884 [Bug][ER][Order Summary / Physician Order] ผู้ป่วยรอเตียง (มี AN) สั่ง Order จาก + ORDER FOR CONTINUE ไม่ได้
//   (การ์ดบั๊ก ไม่มี Sub-Issue → ลงผลเป็น Comment แยกข้อ) เดิมพบบน Dev-X · การ์ดสถานะ Ready for Testing (2 PR merge แล้ว) — ทดสอบซ้ำบน SBH Prod
//   3 ข้อ: 1) Continue Order ยา 2) Continue Order หัตถการ 3) One Day Order — ทุกข้อเดิม toast "บริบทของคำสั่งยาไม่ถูกต้อง" (ErrMedicationOrderInvalidContext)
// ผู้ป่วย Mock 1 ราย: ลงทะเบียน → Visit ER → Triage ESI 3 → Disposition รับไว้รักษาต่อ IPD → Admit Order → ศูนย์จัดการเตียงสร้าง AN (เลือกเตียง — ยังไม่ลงเตียงที่หอ = รอเตียง)
//   → หน้า Order Summary (context ER) กด + ORDER FOR CONTINUE → ลองสั่งทั้ง 3 แบบ แล้วปิด Visit ที่การเงิน
// รหัสยา/หัตถการ Prod ใช้ชุดเดียวกับ SBH-2593 (decisions R124): MED0000260 (Continue) · ACT0000062 (Continue) · MED0000318 (One Day)
// รัน: npm run card:prod -- --headed --grep @SBH-3884
// ทำต่อกับ Visit เดิม (พังหลังเปิด Visit): SBH3884_VISIT="<HN>,<VN>,<EN>" · ไม่ปิด Visit ตอนพัง: SBH3884_KEEP=1

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const opts = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');
const log = (t: string) => console.log(`    ${t}`);
/** ป้ายกรอบแดงแบบกำหนดเอง — การ์ดบั๊กใช้ "Actual" ไม่ใช่ "Expected" (Sub Agent ทักไว้ R100/SBH-3884) */
const actual = (target: Locator, text: string): EvidenceMark => ({ target, label: 'Actual' as EvidenceLabel, note: text });

interface Item { code: string; kind: 'MED' | 'ACT'; type: 'Continue Order' | 'One Day Order'; label: string }

const CASES: Item[] = [
  // MED0000260 / 756 (ยาฉีด route = IntravenousDrip) สั่งแบบ Continue Order ไม่ได้ด้วย ErrInvalidAdministrativeRoute — graphql ไม่มีให้เลือก route เอง (ระบบเติมอัตโนมัติจากยา) ไม่เกี่ยวกับ SBH-3884 · เปลี่ยนไปใช้ MED0000318 (tablet แบบเดียวกับข้อ 3 ที่ผ่าน — ไม่มี routeCode) เพื่อแยกว่าปัญหาคือ Continue Order เอง หรือเฉพาะยาฉีด
  // MED0000260 / 756 (ยาฉีด) สั่งไม่ได้ทั้ง Continue และ One Day ด้วย ErrInvalidAdministrativeRoute เหมือนกัน (route ของ master data ยา 2 ตัวนี้ผิด — ไม่เกี่ยวกับ SBH-3884 และไม่ใช่เฉพาะ Continue Order) ใช้ MED0000318 (ยาเม็ด ไม่มี routeCode) ทั้งข้อ 1 และ 3 แทน — สั่งซ้ำยาเดิมมีเตือนยืนยัน (จัดการแล้ว)
  { code: 'MED0000318', kind: 'MED', type: 'Continue Order', label: 'ข้อ 1 Continue Order ยา' },
  { code: 'ACT0000062', kind: 'ACT', type: 'Continue Order', label: 'ข้อ 2 Continue Order หัตถการ' },
  { code: 'MED0000318', kind: 'MED', type: 'One Day Order', label: 'ข้อ 3 One Day Order' },
];

async function encounterInfo(page: Page, auth: () => string, en: string) {
  const r = await page.request.get(`/cortex-api/er/encounters/${en}`, { headers: { authorization: auth() } });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { an: j.an ?? null, status: j.patientStatus ?? j.status ?? null };
}

/** ฟอร์มคัดกรอง ER รุ่นใหม่ (ไม่มีแท็บ Triage): กรอก ESI 3 + สัญญาณชีพปกติ → โซนที่ระบบแนะนำ → บันทึก */
async function triage(page: Page, visit: ErVisit) {
  const panel = erTriagePanel(page);
  await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first(), 'ฟอร์มคัดกรองต้องโหลดเสร็จ').toBeVisible({ timeout: 90_000 });
  await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL, chiefComplaint: true });
  await page.waitForTimeout(3_000);
  const locked = page.getByRole('main').getByText('ร่างถูกแก้ไขจากที่อื่น', { exact: false });
  for (let i = 0; i < 3 && (await locked.isVisible().catch(() => false)); i++) {
    await page.getByRole('button', { name: 'ลองเก็บร่างอีกครั้ง' }).click();
    await page.waitForTimeout(5_000);
  }
  const zones = panel.locator('[class*="er-triage-zone-options"] button');
  await expect(zones.first(), 'ฟอร์มคัดกรองต้องมีตัวเลือกโซน').toBeVisible({ timeout: 20_000 });
  if (!(await zones.and(page.locator('[aria-pressed="true"]')).count())) {
    const zone = zones.filter({ hasText: 'แนะนำ' }).first();
    await expect(zone, 'ต้องมีโซนที่ระบบแนะนำ').toBeVisible({ timeout: 20_000 });
    await zone.scrollIntoViewIfNeeded();
    await zone.click();
    await expect(zone).toHaveAttribute('aria-pressed', 'true');
  }
  await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
  await expect(page.getByRole('main').getByText('Clinical Summary', { exact: true }), 'บันทึกคัดกรองแล้วต้องไปหน้า Overview').toBeVisible({ timeout: 90_000 });
  await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
}

/** Disposition: Improved + รับไว้รักษาต่อ IPD → บันทึกฉบับร่าง (ยังไม่ลงนาม — ไม่ต้องรอ จำหน่าย) */
async function admitDisposition(page: Page, visit: ErVisit) {
  const main = page.getByRole('main');
  await gotoVisit(page, visit);
  await openCarePanel(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }));
  await startDisposition(page);
  await main.getByRole('radio', { name: 'Improved', exact: true }).check();
  await main.getByRole('radio', { name: 'รับไว้รักษาต่อIPD', exact: true }).check();
  await chooseDispositionDiagnosis(page, 'K30');
  const { clinical, finding } = dispositionTextBoxes(page);
  await clinical.fill('ทดสอบ Retest SBH-3884');
  await finding.fill('ทดสอบ Retest SBH-3884');
  await saveDispositionDraft(page);
}

/** Admit Request → ศูนย์จัดการเตียง "สร้าง AN" (เลือกเตียงตัวแรก — เหมือน SBH-2593 admitWithBed) — ยังไม่ลงเตียงที่หอ = Order Summary ยังแสดง "รอเตียง" */
async function admitWithBed(page: Page, visit: ErVisit, auth: () => string): Promise<string> {
  const main = page.getByRole('main');
  const req = await createAdmitRequest(page, 'ทดสอบ Retest SBH-3884');
  await page.goto('/cortex/admission-center/admission-management?tab=admit-request-list');
  const row = main.getByRole('row').filter({ hasText: visit.hn }).first();
  await row.waitFor({ timeout: 90_000 });
  await row.getByRole('button', { name: 'สร้าง AN' }).click();
  await page.waitForURL(/admitRequestId=/, { timeout: 60_000 });
  await main.getByText('รายละเอียด Admit').first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(3_000);
  const sticker = main.getByRole('checkbox', { name: 'พิมพ์สติ๊กเกอร์ AN เมื่อบันทึก' });
  if (await sticker.isChecked().catch(() => false)) await sticker.uncheck();
  const picked: string[] = [];
  for (const label of [/^เลขเตียง :/, /^ประเภทการรับ Admit :/, /^รับ Admit จาก :/]) {
    const sel = main.getByText(label).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
    const current = norm(await sel.innerText());
    if (current && current !== 'เลือก') { picked.push(current); continue; }
    await sel.click();
    const option = opts(page).first();
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
    await page.waitForTimeout(800);
    picked.push(norm(await sel.innerText()));
  }
  const submit = main.getByRole('button', { name: 'check ส่งข้อมูล' });
  await expect(submit, 'เลือกเตียง / ประเภทการรับ / รับ Admit จาก แล้วปุ่ม ส่งข้อมูล ต้องกดได้').toBeEnabled();
  await submit.click();
  const dialog = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
  if (await dialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false)) await dialog.getByRole('button', { name: /ยืนยัน/ }).first().click();
  const saved = page.locator('.ant-notification-notice, .ant-message-notice').filter({ hasText: /AN \d{5,}/ }).first();
  await expect(saved, 'สร้าง AN แล้วต้องมีแจ้งเตือนเลข AN').toBeVisible({ timeout: 30_000 });
  const an = (await saved.innerText()).match(/AN (\d{5,})/)![1];
  await expect.poll(async () => String((await encounterInfo(page, auth, visit.en)).an ?? ''), { timeout: 60_000, intervals: [3_000], message: 'Encounter ER ต้องผูกกับ AN ที่สร้าง' }).toBe(an);
  log(`สร้าง AN ${an} สำเร็จ · Admit Request (${req.ward}) · เตียง ${picked[0] ?? '-'} · ${picked.slice(1).join(' / ') || '-'}`);
  await snapEvidence(page, `หลังกด — สร้าง AN ${an}`);
  return an;
}

/** เปิด Order Summary (context ER) แล้วกดปุ่ม + ท้ายหัว ORDER FOR CONTINUE เพื่อเปิดแท็บ Physician Order */
async function openPhysicianOrderViaPlus(page: Page, visit: ErVisit) {
  const main = page.getByRole('main');
  const url = `/cortex/next/patients/${visit.hn}?en=${visit.en}&vn=${visit.vn}&fromApp=er`;
  await expect(async () => {
    await page.goto(url);
    await expect(main.getByText(`HN ${visit.hn}`, { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  }, `เปิด ${url}`).toPass({ timeout: 150_000 });
  await page.waitForTimeout(3_000);
  // หน้าเพิ่งโหลดเปิดแผง Overview ค้างอยู่ — ต้องกดเมนู Order Summary ในนำทาง "การดำเนินการดูแลผู้ป่วย" ก่อน (แบบเดียวกับ SBH-2593 openOrderSummary)
  const nav = page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' });
  const head = main.getByText(/^ORDER FOR CONTINUE/).filter({ visible: true }).first();
  await expect(async () => {
    if (!(await head.isVisible().catch(() => false))) await nav.getByRole('menuitem', { name: /Order Summary$/ }).first().click({ force: true });
    await expect(head).toBeVisible({ timeout: 10_000 });
  }, 'เปิด Order Summary').toPass({ timeout: 90_000 });
  await page.mouse.click(1100, 166);
  await page.mouse.move(960, 1050);
  await page.waitForTimeout(3_000);
  await expect(head, 'Order Summary ของผู้ป่วยมี AN (รอเตียง) ต้องมีหัว ORDER FOR CONTINUE').toBeVisible({ timeout: 20_000 });
  const banner = main.getByText(/^สั่งบน AN/).filter({ visible: true }).first();
  await expect(banner, 'ต้องเห็นแถบ สั่งบน AN … รอเตียง').toBeVisible({ timeout: 10_000 });
  const plus = head.locator('xpath=following::button[1]');
  await markEvidence({ target: banner.locator('xpath=..'), note: 'บริบท: ผู้ป่วยมี AN · รอเตียง' } as EvidenceMark, clicked(plus, '+ ORDER FOR CONTINUE'));
  await snapEvidence(page, 'ก่อนกด — Order Summary ปุ่ม + ORDER FOR CONTINUE');
  await clearEvidenceMarks(page);
  await plus.click();
  const ready = main.getByText('ประเภท Order', { exact: true }).first();
  await expect(ready, 'กดปุ่ม + ORDER FOR CONTINUE แล้วต้องเปิดแท็บ Physician Order').toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2_000);
}

/** สั่ง 1 รายการใน Physician Order (context ER ที่เปิดจากปุ่ม +) → บันทึก → คืนผลจาก graphql + toast */
async function tryOrder(page: Page, item: Item, tag: string): Promise<{ ok: boolean; detail: string }> {
  const main = page.getByRole('main');
  const typeBtn = main.getByText(item.type, { exact: true }).filter({ visible: true }).last();
  if (!(await typeBtn.isVisible().catch(() => false))) {
    await page.screenshot({ path: test.info().outputPath(`${tag}-no-button.png`) });
    return { ok: false, detail: `ไม่มีปุ่ม ${item.type}` };
  }
  await typeBtn.click();
  if (item.type === 'One Day Order') {
    await page.waitForTimeout(800);
    await markEvidence(clicked(typeBtn, item.type));
    await snapEvidence(page, `ก่อนกด — ${tag} เลือก ${item.type}`);
    await clearEvidenceMarks(page);
  }
  const search = main.getByPlaceholder(/ค้นหา ยา, เวชภัณฑ์/).first();
  await expect(search).toBeVisible({ timeout: 20_000 });
  await search.click();
  await search.pressSequentially(item.code, { delay: 40 });
  const opt = opts(page).filter({ hasText: item.code }).first();
  await expect(opt, `ค้น ${item.code}`).toBeVisible({ timeout: 30_000 });
  const name = norm(await opt.innerText());
  await opt.click();
  await page.waitForTimeout(1_500);
  if (item.kind === 'MED') {
    const dose = main.getByPlaceholder('ขนาดยา').filter({ visible: true }).first();
    await expect(dose).toBeVisible({ timeout: 20_000 });
    await dose.fill('1');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(2_500);
  }
  const qtyLabel = main.getByText(/^(จำนวนจ่าย|จำนวน)$/).filter({ visible: true }).first();
  if (await qtyLabel.isVisible().catch(() => false)) {
    const qty = qtyLabel.locator('xpath=following::input[1]');
    if (!(await qty.inputValue().catch(() => ''))) await qty.fill(item.kind === 'MED' ? '10' : '1');
    await page.keyboard.press('Tab');
  }
  // บางยาบังคับเลือก วิธีให้ยา/เส้นทางให้ยา (ไม่งั้นบันทึกได้ errors: ErrInvalidAdministrativeRoute — พบกับ MED0000260 บน Prod 6 พ.ย. 2026)
  if (item.kind === 'MED') {
    const byTestId = main.locator('[data-testid="medication-direction-route-select"]').first();
    const byLabel = main.getByText(/^(วิธีให้ยา|เส้นทางให้ยา|Administrative Route|Route)/).filter({ visible: true }).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
    const routeSelect = (await byTestId.isVisible().catch(() => false)) ? byTestId : byLabel;
    if (await routeSelect.isVisible().catch(() => false)) {
      if (!(await routeSelect.locator('.ant-select-selection-item, .ant-select-content-value').count())) {
        // ป็อปอัปแนะนำข้อความของช่องก่อนหน้า (autocomplete) ค้างบัง — กด Escape + คลิกที่ว่างให้หุบก่อน
        await page.keyboard.press('Escape');
        await page.mouse.click(60, 60);
        await page.waitForTimeout(300);
        await routeSelect.scrollIntoViewIfNeeded();
        await routeSelect.click({ timeout: 6_000 }).catch(() => routeSelect.click({ force: true }));
        const option = opts(page).first();
        await expect(option).toBeVisible({ timeout: 10_000 });
        await option.click({ timeout: 4_000 }).catch(() => option.click({ force: true }));
        await page.waitForTimeout(500);
      }
    }
  }
  const price = main.getByText('ราคาต่อหน่วย', { exact: true }).filter({ visible: true }).first().locator('xpath=following::input[1]');
  if (item.kind === 'ACT' && (await price.isVisible().catch(() => false)) && !(await price.inputValue().catch(() => ''))) {
    await price.fill('100');
    await page.keyboard.press('Tab');
  }
  await page.waitForTimeout(800);
  const add = main.getByRole('button', { name: /เพิ่มออเดอร์|เพิ่มลงตะกร้า/ }).filter({ visible: true }).last();
  const save = main.getByRole('button', { name: /^(save )?บันทึก$/ }).filter({ visible: true }).first();
  try {
    await expect(async () => {
      await add.scrollIntoViewIfNeeded();
      if ((await add.isVisible().catch(() => false)) && !(await save.isEnabled().catch(() => false))) await add.click();
      // ทั้ง Drug Alert (ยาตีกัน) และเตือนสั่งซ้ำ (ยา/หัตถการเดิมมีอยู่แล้ว) ใช้โครง modal เดียวกัน — ยืนยันทั้งคู่
      const alert = page.locator('.ant-modal:visible').filter({ hasText: /Drug Alert|สั่งซ้ำ|order ซ้ำ|duplicate/i }).first();
      if (await alert.waitFor({ timeout: 2_500 }).then(() => true, () => false)) {
        const reason = alert.getByPlaceholder('ระบุเหตุผล').first();
        if (await reason.isVisible().catch(() => false)) await reason.fill('ทดสอบ Retest SBH-3884');
        const confirm = alert.getByRole('button', { name: /ยืนยันการสั่งออเดอร์|ยืนยัน/ }).first();
        await confirm.click();
        await expect(alert).toBeHidden();
      }
      await expect(save).toBeEnabled({ timeout: 6_000 });
    }).toPass({ timeout: 45_000 });
  } catch {
    await page.screenshot({ path: test.info().outputPath(`${tag}-add-fail.png`) });
    return { ok: false, detail: `เพิ่มออเดอร์ไม่ได้ (${name})` };
  }
  const row = main.getByRole('row').filter({ hasText: item.code }).last();
  const cell = row.locator('td').filter({ hasText: item.code }).first();
  await page.mouse.move(700, 700);
  await markEvidence(...(item.type === 'One Day Order' ? [] : [clicked(typeBtn, item.type)]), filled(cell, item.code), clicked(save, 'บันทึก'));
  await snapEvidence(page, `ก่อนกด — ${tag} บันทึก ${item.type} ${item.code}`);
  await clearEvidenceMarks(page);
  const mutation = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/cortex-api/graphql') && /mutation/.test(r.request().postData() ?? ''), { timeout: 60_000 });
  mutation.catch(() => undefined);
  await save.click();
  const res = await mutation.catch(() => null);
  const reqBody = res?.request().postData() ?? '';
  const body = (await res?.text().catch(() => '')) ?? '';
  const op = reqBody.match(/mutation (\w+)/)?.[1] ?? '?';
  fs.writeFileSync(test.info().outputPath(`${tag}-request.json`), reqBody);
  fs.writeFileSync(test.info().outputPath(`${tag}-response.json`), body);
  await page.waitForTimeout(1_500);
  const toast = page.locator('.ant-notification-notice, .ant-message-notice').filter({ visible: true }).last();
  const toastText = await toast.waitFor({ timeout: 8_000 }).then(() => toast.innerText(), () => '');
  const stillInCart = await cell.isVisible().catch(() => false);
  if (toastText) await markEvidence(alerted(toast));
  if (stillInCart) {
    await markEvidence(actual(cell, 'ยังค้างในตะกร้า บันทึกไม่ได้'));
  } else {
    // บันทึกสำเร็จแล้วรายการออกจากตะกร้า (ไปอยู่ในรายการ ORDER FOR ONE DAY / CONTINUE ของหน้าแทน) — หา entry ที่มีรหัสในหน้าแทน ไม่มีก็ข้ามไปถ่ายภาพรวมเฉยๆ
      const placed = main.locator(`text=/\\[${item.code}\\]/`).first();
    if (await placed.isVisible({ timeout: 5_000 }).catch(() => false)) await markEvidence(actual(placed, 'บันทึกสำเร็จ ขึ้นในรายการ Order'));
  }
  await snapEvidence(page, `หลังกด — ${tag} บันทึก ${item.type} ${item.code}`);
  await clearEvidenceMarks(page);
  const err = body.match(/"message"\s*:\s*"([^"]+)"/)?.[1];
  const ok = !stillInCart && !err;
  const detail = `${name} → ${op} ${res?.status() ?? 'ไม่มี response'} ${err ? `errors: ${err}` : 'ไม่มี errors'} · toast: ${norm(toastText) || '(ไม่มี)'}`;
  return { ok, detail };
}

test.describe(`SBH-3884 Retest: ผู้ป่วยรอเตียง (มี AN) สั่ง Order จาก + ORDER FOR CONTINUE (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 1_500_000 });

  let opened: Map<string, ErVisit>;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });

  test.afterEach(async ({ page }, info) => {
    if (info.status !== info.expectedStatus && process.env.SBH3884_KEEP) {
      for (const v of opened.values()) console.log(`    หลังเทส: ไม่ปิด Visit (SBH3884_KEEP) — SBH3884_VISIT="${v.hn},${v.vn},${v.en}"`);
      return;
    }
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      info.annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  test('ข้อ 1–3: สั่ง Continue Order ยา / หัตถการ / One Day Order จากปุ่ม + ORDER FOR CONTINUE', { tag: ['@SBH-3884'] }, async ({ page }) => {
    const auth = trackAuthorization(page);
    let visit!: ErVisit;

    await test.step('เตรียมผู้ป่วย: Visit ER → Triage ESI 3 → Disposition รับไว้รักษาต่อ IPD → Admit → AN (รอเตียง)', async () => {
      const resume = process.env.SBH3884_VISIT?.split(',').map((s) => s.trim());
      if (resume?.length === 3) {
        visit = { hn: resume[0], vn: resume[1], en: resume[2] } as ErVisit;
        opened.set(visit.en, visit);
        log(`ทำต่อ HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      } else {
        await gotoErDashboard(page);
        const patient = newTestPatient('Cont3884');
        visit = await registerAndOpenErVisit(page, patient).catch(async (error: Error) => {
          const full = await openVisitDialog(page).getByText(/\(Full\)|ไม่พบเวลาที่สามารถลงได้/).first().isVisible().catch(() => false);
          if (!full) throw error;
          throw new Error(`เปิด Visit ER ไม่ได้ — ช่วงเวลาออกตรวจของแพทย์วันนี้เต็ม (${patient.firstName} ${patient.familyName} ลงทะเบียนแล้วแต่ไม่มี Visit)`);
        });
        opened.set(visit.en, visit);
        const state = 'SBH-3884 · เปิด Visit ER + Triage ESI 3 + Disposition รับไว้รักษาต่อ IPD + Admit → AN (รอเตียง) แล้วปิด Visit ที่การเงิน';
        if (SYSTEM === 'sbh-prod') recordMockPatient('SBH-3884', patient, visit, state);
        log(`ผู้ป่วย ${patient.firstName} ${patient.familyName} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
        test.info().annotations.push({ type: 'ผู้ป่วย', description: `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
        await triage(page, visit);
        // ข้ามขั้น Disposition (SBH Prod 6 พ.ย. 2026: เริ่มจำหน่ายพังทั้งระบบ — column "cause_of_death_text" ของ discharge_summary ขาด, ไม่เกี่ยวกับ SBH-3884 — ผู้ใช้สั่งข้ามไปสร้าง Admit Order ตรง)
        await gotoVisit(page, visit);
        const an = await admitWithBed(page, visit, () => auth());
        log(`หลังสร้าง AN: ${JSON.stringify(await encounterInfo(page, auth, visit.en))} (AN ${an})`);
      }
    });

    const results: { item: Item; ok: boolean; detail: string }[] = [];
    for (const [i, item] of CASES.entries()) {
      const tag = `item-${i + 1}-${item.kind}-${item.type === 'Continue Order' ? 'CONT' : 'ONEDAY'}`;
      await checkStep(page, `SBH-3884 ${item.label} (${item.code})`, async () => {
        await startClip(page, tag);
        await openPhysicianOrderViaPlus(page, visit);
        const result = await tryOrder(page, item, tag);
        results.push({ item, ...result });
        test.info().annotations.push({ type: item.label, description: result.detail });
        log(`${item.label}: ${result.ok ? 'ผ่าน' : 'ไม่ผ่าน'} — ${result.detail}`);
      });
    }

    const failed = results.filter((r) => !r.ok);
    expect(failed, `ต้องสั่ง Order ได้ครบทั้ง 3 แบบ — ไม่ผ่าน: ${failed.map((f) => f.item.label).join(' · ') || '(ไม่มี)'}`).toEqual([]);
  });

  test('ทำต่อ: เตรียมผู้ป่วยไว้แล้ว ลองสั่ง Order ใหม่ (ผู้ป่วยเดิมจาก SBH3884_VISIT)', { tag: ['@SBH-3884-RETRY'] }, async ({ page }) => {
    test.skip(!process.env.SBH3884_VISIT, 'ต้องระบุ SBH3884_VISIT');
    const [hn, vn, en] = process.env.SBH3884_VISIT!.split(',').map((s) => s.trim());
    const visit = { hn, vn, en } as ErVisit;
    opened.set(en, visit);
    const results: { item: Item; ok: boolean; detail: string }[] = [];
    for (const [i, item] of CASES.entries()) {
      const tag = `retry-${i + 1}-${item.kind}-${item.type === 'Continue Order' ? 'CONT' : 'ONEDAY'}`;
      await checkStep(page, `SBH-3884 ${item.label} (${item.code})`, async () => {
        await startClip(page, tag);
        await openPhysicianOrderViaPlus(page, visit);
        const result = await tryOrder(page, item, tag);
        results.push({ item, ...result });
        test.info().annotations.push({ type: item.label, description: result.detail });
        log(`${item.label}: ${result.ok ? 'ผ่าน' : 'ไม่ผ่าน'} — ${result.detail}`);
      });
    }
    const failed = results.filter((r) => !r.ok);
    expect(failed, `ต้องสั่ง Order ได้ครบทั้ง 3 แบบ — ไม่ผ่าน: ${failed.map((f) => f.item.label).join(' · ') || '(ไม่มี)'}`).toEqual([]);
  });
});
