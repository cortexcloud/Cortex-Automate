import fs from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { dismissToast, expectOk, gotoErDashboard, openCarePanel, waitForApi, type ErVisit } from '../helpers/functions/er';
import { createAdmitRequest } from '../helpers/functions/er-admit';
import { chooseDispositionDiagnosis, dispositionTextBoxes, saveDispositionDraft, startDisposition } from '../helpers/functions/er-disposition';
import { trackAuthorization } from '../helpers/functions/er-report';
import { fillErTriageForm, saveErTriageForm } from '../helpers/functions/er-triage';
import { alerted, clearEvidenceMarks, clicked, filled, markEvidence, snapEvidence, type EvidenceLabel, type EvidenceMark } from '../helpers/functions/evidence';
import { startClip } from '../helpers/functions/fixtures';
import { newTestPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { registerAndOpenErVisit } from './uat-er';
import { VITALS_NORMAL, careMenu, gotoVisit } from './uat-play';

// Reproduce บั๊ก: ผู้ป่วย ER ที่ Admit แล้ว (มี AN · รอเตียง) สั่ง Physician Order แบบ Continue Order ไม่ได้ทั้งยาและหัตถการ
//   toast "บริบทของคำสั่งยาไม่ถูกต้อง" · graphql upsertIpdOrder → ErrMedicationOrderInvalidContext (ผู้ใช้เจอ 4 พ.ย. 2026 กับ HN 6932747)
// dev-x เท่านั้น · ผู้ป่วย AUTO · ยา R25 (med0000006 ตามรูปของผู้ใช้) · หัตถการ 89.52 ECG
// รัน: npx playwright test -c playwright.mock.config.ts mock-data/_repro-continue-order.spec.ts --headed --project=chrome --grep @existing   (REPRO_HN=… เปลี่ยนผู้ป่วย)
//      npx playwright test -c playwright.mock.config.ts mock-data/_repro-continue-order.spec.ts --headed --project=chrome --grep @fresh

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const opts = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');
const log = (t: string) => console.log(`    ${t}`);
const VIA = process.env.REPRO_VIA ?? 'menu';
/** ป้ายกรอบแดงแบบกำหนดเอง (การ์ดบั๊ก: ชี้ Actual ไม่ใช่ Expected) */
const note = (target: Locator, label: string, text: string): EvidenceMark => ({ target, label: label as EvidenceLabel, note: text });

interface Item { code: string; kind: 'MED' | 'ACT'; type: 'Continue Order' | 'One Day Order' }

async function encounterInfo(page: Page, auth: () => string, en: string) {
  const r = await page.request.get(`/cortex-api/er/encounters/${en}`, { headers: { authorization: auth() } });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { an: j.an ?? null, status: j.patientStatus ?? j.status ?? null };
}

async function openUrl(page: Page, visit: ErVisit, url: string) {
  await expect(async () => {
    await page.goto(url);
    await expect(page.getByRole('main').getByText(`HN ${visit.hn}`, { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  }, `เปิด ${url}`).toPass({ timeout: 150_000 });
}

async function openPhysicianOrder(page: Page) {
  const main = page.getByRole('main');
  const nav = page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' });
  await page.waitForTimeout(3_000);
  const menus = (await nav.getByRole('menuitem').allInnerTexts()).map(norm).filter(Boolean);
  log(`เมนูขวา: ${menus.join(' · ')}`);
  const ready = main.getByText('ประเภท Order', { exact: true }).first();
  if (VIA === 'summary') {
    // context ER ที่มี AN: Order Summary → ปุ่ม + ท้ายหัว ORDER FOR CONTINUE → เปิดแท็บ Physician Order
    const head = main.getByText(/^ORDER FOR CONTINUE/).filter({ visible: true }).first();
    await expect(async () => {
      await nav.getByRole('menuitem', { name: /Order Summary$/ }).first().click({ force: true });
      await expect(head).toBeVisible({ timeout: 8_000 });
    }, 'เปิด Order Summary').toPass({ timeout: 90_000 });
    await head.click().catch(() => undefined); // ให้แถบเมนูขวาหุบ
    await page.mouse.move(700, 700);
    await page.waitForTimeout(3_000);
    const plus = head.locator('xpath=following::button[1]');
    const banner = main.getByText(/^สั่งบน AN/).filter({ visible: true }).first();
    await markEvidence(note(banner.locator('xpath=..'), 'บริบท', 'ผู้ป่วยมี AN · รอเตียง'), clicked(plus, '+ ORDER FOR CONTINUE'));
    await snapEvidence(page, 'ก่อนกด — Order Summary (context ER) ปุ่ม + ORDER FOR CONTINUE');
    await clearEvidenceMarks(page);
    await plus.click();
    await expect(ready).toBeVisible({ timeout: 30_000 });
    const tabs = (await main.getByRole('tab').allInnerTexts()).map(norm).filter(Boolean);
    log(`แท็บที่เปิด: ${tabs.join(' · ')}`);
  } else {
    const name = (await nav.getByRole('menuitem', { name: /Physician Order$/ }).count()) ? 'Physician Order' : 'One Day Order';
    await careMenu(page, name, ready);
  }
  await page.waitForTimeout(2_000);
}

/** สั่ง 1 รายการใน Physician Order (context ER) → บันทึก → คืนผลจาก graphql + toast */
async function tryOrder(page: Page, visit: ErVisit, item: Item, tag: string, url?: string): Promise<string> {
  const main = page.getByRole('main');
  if (url) await openUrl(page, visit, url);
  else await gotoVisit(page, visit);
  await page.waitForTimeout(3_000);
  await startClip(page, tag);
  await openPhysicianOrder(page);
  const typeBtn = main.getByText(item.type, { exact: true }).filter({ visible: true }).last();
  if (!(await typeBtn.isVisible().catch(() => false))) {
    await page.screenshot({ path: test.info().outputPath(`${tag}-no-button.png`) });
    return `ไม่มีปุ่ม ${item.type}`;
  }
  const cart = (await main.getByRole('row').allInnerTexts()).map(norm).filter((t) => /med0|89\.52|CONTINUE|ONE DAY/i.test(t));
  if (cart.length) log(`[${tag}] ตะกร้าก่อนเริ่ม: ${cart.join(' || ')}`);
  await typeBtn.click();
  if (item.type === 'One Day Order') {
    // หน้าต่างลอยเตี้ย — ตอนถ่ายก่อนบันทึกปุ่มประเภทหลุดจอ → ถ่ายแยกตอนเลือกประเภท
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
      // Drug Alert (ยาซ้ำกับที่สั่งไว้) → กรอกเหตุผล → ยืนยันการสั่งออเดอร์
      const alert = page.locator('.ant-modal:visible').filter({ hasText: 'Drug Alert' }).first();
      if (await alert.waitFor({ timeout: 2_500 }).then(() => true, () => false)) {
        await alert.getByPlaceholder('ระบุเหตุผล').first().fill('ทดสอบ Reproduce');
        await alert.getByRole('button', { name: 'ยืนยันการสั่งออเดอร์' }).click();
        await expect(alert).toBeHidden();
      }
      await expect(save).toBeEnabled({ timeout: 6_000 });
    }).toPass({ timeout: 45_000 });
  } catch (e) {
    fs.writeFileSync(test.info().outputPath(`${tag}-aria.yml`), await main.ariaSnapshot().catch(() => ''));
    await page.screenshot({ path: test.info().outputPath(`${tag}-add-fail.png`) });
    return `เพิ่มออเดอร์ไม่ได้ (${name})`;
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
  const toast = page.locator('.ant-notification-notice, .ant-message-notice').filter({ visible: true }).last();
  const toastText = await toast.waitFor({ timeout: 8_000 }).then(() => toast.innerText(), () => '');
  if (toastText) await markEvidence(alerted(toast));
  if (await cell.isVisible().catch(() => false)) await markEvidence(note(cell, 'Actual', 'ยังค้างในตะกร้า บันทึกไม่ได้'));
  await snapEvidence(page, `หลังกด — ${tag} บันทึก ${item.type} ${item.code}`);
  await clearEvidenceMarks(page);
  const err = body.match(/"message"\s*:\s*"([^"]+)"/)?.[1];
  return `${name} → ${op} ${res?.status() ?? 'ไม่มี response'} ${err ? `errors: ${err}` : 'ไม่มี errors'} · toast: ${norm(toastText) || '(ไม่มี)'}`;
}

async function admitDisposition(page: Page, visit: ErVisit) {
  const main = page.getByRole('main');
  await gotoVisit(page, visit);
  await openCarePanel(page, 'Disposition', main.getByText('สรุปการจำหน่าย', { exact: true }));
  await startDisposition(page);
  await main.getByRole('radio', { name: 'Improved', exact: true }).check();
  await main.getByRole('radio', { name: 'รับไว้รักษาต่อIPD', exact: true }).check();
  await chooseDispositionDiagnosis(page, 'K30');
  const { clinical, finding } = dispositionTextBoxes(page);
  await clinical.fill('ทดสอบ Reproduce Continue Order');
  await finding.fill('ทดสอบ Reproduce Continue Order');
  await saveDispositionDraft(page);
}

const CASES: Item[] = [
  { code: 'med0000006', kind: 'MED', type: 'Continue Order' },
  { code: '89.52', kind: 'ACT', type: 'Continue Order' },
];

test('Reproduce Continue Order กับผู้ป่วยเดิม @existing', async ({ page }) => {
  test.setTimeout(900_000);
  const auth = trackAuthorization(page);
  const hn = process.env.REPRO_HN ?? '6932747';
  await gotoErDashboard(page);
  const r = await page.request.get(`/generated-emr-api/encounters?filter[hn][equals]=${hn}&perPage=20`, { headers: { authorization: auth() } });
  const { data } = (await r.json()) as { data: Record<string, unknown>[] };
  for (const e of data) log(`  encounter ${e.en} vn=${e.vn} clinic=${e.clinicId} status=${e.latestStatusCode}`);
  const wantEn = process.env.REPRO_EN ?? (hn === '6932747' ? 'E69110433431' : '');
  const er = data.find((e) => e.en === wantEn) ?? data.find((e) => String(e.en).startsWith('E') && e.vn) ?? data[0];
  const visit: ErVisit = { hn, en: String(er.en), vn: String(er.vn) } as ErVisit;
  log(`HN ${hn} · EN ${visit.en} · VN ${visit.vn} · ${JSON.stringify(await encounterInfo(page, auth, visit.en))}`);
  const { an } = await encounterInfo(page, auth, visit.en);
  const url = process.env.REPRO_URL ?? (VIA === 'summary' ? `/cortex/next/patients/${hn}?en=${visit.en}&vn=${visit.vn}&fromApp=er` : `/cortex/next/patients/${hn}?an=${an}&fromApp=ipd`);
  log(`URL ${url}`);
  for (const [i, c] of CASES.entries()) log(`ผล ${c.type} ${c.code}: ${await tryOrder(page, visit, c, `old-${i + 1}-${c.kind}`, url)}`);
});

/** ศูนย์จัดการเตียง: Admit Request ของ HN นี้ → สร้าง AN (ไม่ลงเตียง) — ส่วนหลังของ admitCreateAn (ไม่สร้าง Admit Order ซ้ำ) */
async function createAn(page: Page, visit: ErVisit, auth: () => string): Promise<string> {
  const main = page.getByRole('main');
  await page.goto('/cortex/admission-center/admission-management?tab=admit-request-list');
  const row = main.getByRole('row').filter({ hasText: visit.hn }).first();
  await row.waitFor({ timeout: 90_000 });
  await row.getByRole('button', { name: 'สร้าง AN' }).click();
  await page.waitForURL(/admitRequestId=/, { timeout: 60_000 });
  await main.getByText('รายละเอียด Admit').first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(3_000);
  const sticker = main.getByRole('checkbox', { name: 'พิมพ์สติ๊กเกอร์ AN เมื่อบันทึก' });
  if (await sticker.isChecked().catch(() => false)) await sticker.uncheck();
  for (const label of [/^เลขเตียง :/, /^ประเภทการรับ Admit :/, /^รับ Admit จาก :/]) {
    const sel = main.getByText(label).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
    const current = norm(await sel.innerText());
    if (current && current !== 'เลือก') continue;
    await sel.click();
    await expect(opts(page).first()).toBeVisible({ timeout: 15_000 });
    // เลขเตียง: เลือก SBHAUTO-xx ที่ว่างก่อน (R97)
    const auto = opts(page).filter({ hasText: /SBHAUTO-/ }).first();
    const pick = /เลขเตียง/.test(String(label)) && (await auto.count()) ? auto : opts(page).first();
    await pick.click({ timeout: 4_000 }).catch(() => pick.click({ force: true }));
    await page.waitForTimeout(800);
  }
  const submit = main.getByRole('button', { name: 'check ส่งข้อมูล' });
  await expect(submit).toBeEnabled();
  await submit.click();
  const dialog = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
  if (await dialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false)) await dialog.getByRole('button', { name: /ยืนยัน/ }).first().click();
  let an = '';
  await expect.poll(async () => {
    an = String((await encounterInfo(page, auth, visit.en)).an ?? '');
    return an;
  }, { timeout: 120_000, intervals: [3_000], message: 'Encounter ER ต้องได้ AN หลังสร้าง AN' }).not.toBe('');
  await snapEvidence(page, `หลังกด — สร้าง AN ${an}`);
  return an;
}

test('Reproduce Continue Order ผู้ป่วยใหม่ ER → Admit → AN (รอเตียง) @fresh', async ({ page }) => {
  test.setTimeout(1_500_000);
  const auth = trackAuthorization(page);
  await gotoErDashboard(page);
  let visit: ErVisit;
  if (process.env.REPRO_RESUME_HN) {
    // ทำต่อกับผู้ป่วยที่ส่ง Admit Order แล้ว (รอบก่อนพังที่ขั้นสร้าง AN)
    visit = { hn: process.env.REPRO_RESUME_HN, en: process.env.REPRO_RESUME_EN!, vn: process.env.REPRO_RESUME_VN! } as ErVisit;
    log(`ทำต่อ HN ${visit.hn} · EN ${visit.en} · VN ${visit.vn}`);
  } else {
    const patient = newTestPatient('ContOrd');
    visit = await registerAndOpenErVisit(page, patient);
    log(`ผู้ป่วย ${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
    await dismissToast(page, 'สร้าง Visit สำเร็จ');
    await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
    const zoned = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`, 90_000);
    await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
    await expectOk(await zoned, 'ส่งผู้ป่วยเข้าโซน');
    await gotoVisit(page, visit);
    await page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByRole('menuitem', { name: /Order Summary$/ }).first().click({ force: true });
    await page.mouse.move(700, 700);
    await page.waitForTimeout(8_000);
    log(`ก่อน Admit: หัว ORDER FOR CONTINUE ใน Order Summary ${(await page.getByRole('main').getByText(/^ORDER FOR CONTINUE/).filter({ visible: true }).count()) ? 'มี' : 'ไม่มี'}`);
    await snapEvidence(page, 'ก่อน Admit — Order Summary');
    await admitDisposition(page, visit);
    await gotoVisit(page, visit);
    const req = await createAdmitRequest(page, 'ทดสอบ Reproduce Continue Order');
    log(`ส่ง Admit Order (${req.ward})`);
  }
  const had = process.env.REPRO_RESUME_AN ?? String((await encounterInfo(page, auth, visit.en)).an ?? '');
  const an = had || (await createAn(page, visit, auth));
  log(`หลังสร้าง AN: ${JSON.stringify(await encounterInfo(page, auth, visit.en))} (AN ${an})`);

  const all: Item[] = [...CASES, { code: 'med0000008', kind: 'MED', type: 'One Day Order' }];
  for (const [i, c] of all.entries()) log(`ผล ${c.type} ${c.code}: ${await tryOrder(page, visit, c, `new-${i + 1}-${c.kind}-${c.type === 'Continue Order' ? 'CONT' : 'ONEDAY'}`)}`);
});
