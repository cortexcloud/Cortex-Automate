import type { Locator, Page, Response } from '@playwright/test';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit, orderAlert } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';

// การ์ดบั๊ก SBH-1717 [Pharmacy][สร้างใบยา] สร้าง / ย้อนกลับ / ยกเลิก ใบยาไม่ได้ — EXE SBH-2846 → HPY SBH-2847 / EDG SBH-2848 → TC-SBH-1717-001–007 (SBH-2849–2855)
// ส่วน A คนไข้ Refill (Visit Walk-in รับยาต่อเนื่อง ของวันนี้): 001 สร้างใบยาจาก Task → 002 ย้อนกลับไปแก้ไข → 004 สร้างใหม่ (ยาไม่ซ้ำ) → 003 ยกเลิกใบยา
// ส่วน B คนไข้ OPD ปกติ (ผู้ป่วย AUTO ใหม่ สั่งยาปกติ): 005 สร้างใบยา → 006 ย้อนกลับไปแก้ไข → 007 สร้างใหม่แล้วยกเลิก
// dev-x 21 ต.ค. 2026 (ไฟล์แอป index-Dq4SviXG.js): สร้างใบยาจากรอบเติมยาต้องมี Visit ของวันนี้ ไม่งั้นหน้าสร้างใบยาขึ้น "กรุณาเลือกการเข้ารับบริการปัจจุบัน…" และปุ่มปิด
// ย้อนกลับ = POST /prescriptions/<id>/decompose · ยกเลิก = หน้าต่างเหตุผล → POST /prescriptions/<id>/cancel → Task กลับเป็น ยังไม่เติม
// คนไข้ Refill ตั้งต้น = HN 6931990 (คนไข้ 3 ของ SBH-1738 · Task ยา A GPO-L-ONE 2/3 คลินิก MED) — `SBH1717_REFILL=<HN>[,<VN Refill วันนี้>]` (ไม่ใส่ VN = เปิด Visit Refill ของวันนี้ให้)
// คนไข้ OPD ปกติเดิม: `SBH1717_NORMAL=<HN>,<VN>,<EN>` (ส่งคำสั่งแล้ว) · ข้ามส่วน: `SBH1717_SKIP=A` / `B`
// รัน dev-x: npx playwright test --headed --grep @SBH-1717 --project=chrome --no-deps --output=.cache/run-1717

const DRUG_REFILL = { code: 'med0000007', name: 'GPO-L-ONE' };
const DRUG_NORMAL = { code: 'med0000008', name: 'CLINDAVID' };
const REFILL_CLINIC = 'ห้องตรวจโรคอายุรกรรมทั่วไป';
const REFILL_SERVICE = 'รับยาต่อเนื่อง (Refill)';
const TC = {
  '001': 'TC-001 (SBH-2849)', '002': 'TC-002 (SBH-2850)', '003': 'TC-003 (SBH-2851)', '004': 'TC-004 (SBH-2852)',
  '005': 'TC-005 (SBH-2853)', '006': 'TC-006 (SBH-2854)', '007': 'TC-007 (SBH-2855)',
} as const;
const ISSUES = ['SBH-1717', 'SBH-2846', 'SBH-2847', 'SBH-2848', 'SBH-2849', 'SBH-2850', 'SBH-2851', 'SBH-2852', 'SBH-2853', 'SBH-2854', 'SBH-2855'];
const BUG_TEXT = /encounter EN is required|Failed to (create|decompose|cancel)|ไม่สำเร็จ|ผิดพลาด|InternalServerError/i;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/** วันที่ปี พ.ศ. (YYYY-MM-DD) — ช่องวันที่ของแท็บ Order เติมยารับปี พ.ศ. */
function beDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear() + 543}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** init script: จดแจ้งเตือนทุกตัว (หายเองใน ~4.5 วินาที) */
function recordNotices() {
  const w = window as unknown as { __notices: string[] };
  w.__notices = [];
  new MutationObserver(() => {
    for (const el of document.querySelectorAll('.ant-notification-notice:not([data-seen]), .ant-message-notice:not([data-seen])')) {
      el.setAttribute('data-seen', '1');
      w.__notices.push((el.textContent ?? '').trim());
    }
  }).observe(document, { childList: true, subtree: true });
}
const notices = (page: Page) => page.evaluate(() => (window as unknown as { __notices?: string[] }).__notices ?? []).catch(() => [] as string[]);

test.describe('SBH-1717 ห้องยา สร้าง / ย้อนกลับ / ยกเลิก ใบยา', () => {
  test(
    'คนไข้ Refill + คนไข้ OPD ปกติ: สร้างใบยา → ย้อนกลับไปแก้ไข → สร้างใหม่ (ยาไม่ซ้ำ) → ยกเลิกใบยา ไม่ขึ้น Error',
    { tag: ['@SBH-1717', ...ISSUES.slice(1).map((id) => `@${id}`)], annotation: ISSUES.map(linear) },
    async ({ page }) => {
      test.setTimeout(2_400_000);
      const main = page.getByRole('main');
      const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
      trackAuthorization(page);
      const failures: string[] = [];
      const skip = (process.env.SBH1717_SKIP ?? '').split(',').filter(Boolean);
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      const soft = (title: string, body: () => Promise<void>) =>
        checkStep(page, title, body).then(
          () => true,
          (error: unknown) => {
            failures.push(`${title} — ${firstLine(error)}`);
            console.log(`    ✗ ${title} — ${firstLine(error)}`);
            return false;
          },
        );
      await page.addInitScript(recordNotices);
      const createButton = page.getByRole('button', { name: 'สร้างใบยา', exact: true });

      // ── ห้องยา ──
      const gotoPharmacy = async () => {
        await page.goto('/cortex/pharmacy/select-location', { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await main.getByRole('combobox').first().click();
        await options.filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
        await page.waitForTimeout(800);
        await main.getByRole('combobox').nth(1).click();
        await page.waitForTimeout(800);
        await page.keyboard.press('Enter');
        await page.getByRole('button', { name: 'ส่ง' }).click();
        await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
      };
      const openTab = async (name: RegExp, hn: string) => {
        if (!/\/pharmacy\/opd\/medication-orders/.test(page.url())) await gotoPharmacy();
        const tab = page.getByRole('tab', { name });
        await tab.click();
        await page.waitForTimeout(2_500);
        const search = main.getByPlaceholder('ค้นหา VN, HN');
        await search.fill(hn);
        await search.press('Enter');
        await page.waitForTimeout(3_000);
        return tab;
      };
      /** แจ้งเตือน / หน้าต่าง error ที่ขึ้นหลังกด (ต้องไม่มีข้อความของบั๊ก) */
      const errorsSince = async (before: number) => {
        const list = (await notices(page)).slice(before).filter((t) => BUG_TEXT.test(t));
        const modal = page.locator('.ant-modal:visible').filter({ hasText: BUG_TEXT });
        if (await modal.count()) list.push(squash(await modal.first().innerText()));
        return list;
      };
      /** หน้าสร้างใบยา: ติ๊กออก Print ฉลากยาอัตโนมัติ → สร้างใบยา → POST /opd/prescriptions → เลขใบยา */
      const pressCreate = async (tag: string, marks: Parameters<typeof markEvidence>) => {
        const autoPrint = main.getByRole('checkbox', { name: 'Print ฉลากยาอัตโนมัติ' });
        if (await autoPrint.isChecked().catch(() => false)) await autoPrint.click();
        await expect(createButton, 'ปุ่มสร้างใบยาต้องกดได้').toBeEnabled({ timeout: 30_000 });
        await markEvidence(...marks, clicked(createButton));
        await snapEvidence(page, `ก่อนกด — สร้างใบยา (${tag})`);
        const before = (await notices(page)).length;
        const res = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/cortex-api/opd/prescriptions', { timeout: 60_000 });
        await createButton.click();
        const response = await res;
        const text = await response.text().catch(() => '');
        const id = (() => { try { return (JSON.parse(text) as { prescriptionId?: string }).prescriptionId ?? ''; } catch { return ''; } })();
        await page.waitForTimeout(3_000);
        const errs = await errorsSince(before);
        note(`สร้างใบยา (${tag})`, `POST /opd/prescriptions ${response.status()} · ${id || text.slice(0, 200)} · body ${(response.request().postData() ?? '').slice(0, 160)} · แจ้งเตือน error ${errs.join(' | ') || '(ไม่มี)'}`);
        return { id, status: response.status(), errors: errs, body: text };
      };
      /** ใบยารอจัด → ค้น HN → แถวใบยา → หน้า Prescription → หัว "ใบยาเลขที่ …" + แถวยาในใบนี้ */
      const openRx = async (hn: string, id: string, tag: string) => {
        const no = id.split('-').pop() ?? '';
        const tab = await openTab(/ใบยารอจัด/, hn);
        const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: hn }).filter({ hasText: no }).first();
        await expect(row, `ใบยา ${id} ต้องอยู่แท็บใบยารอจัด`).toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(tab), clicked(row));
        await snapEvidence(page, `ก่อนกด — ใบยา ${no} ในแท็บใบยารอจัด (${tag})`);
        await row.locator('td').nth(3).click();
        await page.waitForURL(/preset=pharmacyViewPrescription/, { timeout: 60_000 });
        const title = main.getByText(new RegExp(`ใบยาเลขที่\\s*${no}`)).first();
        await expect(title).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(2_500);
        await title.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        const section = title.locator('xpath=ancestor::div[.//tr[contains(@class,"ant-table-row")]][1]');
        const rows = section.locator('tr.ant-table-row').filter({ visible: true });
        const back = title.locator('xpath=following::button[contains(., "ย้อนกลับ")][1]');
        return { no, title, section, rows, back };
      };
      /** ปุ่ม ย้อนกลับ ▾ ของใบยา → เมนู */
      const backMenu = async (rx: Awaited<ReturnType<typeof openRx>>, item: 'ย้อนกลับ ไปแก้ไข' | 'ยกเลิกใบยา') => {
        await rx.back.scrollIntoViewIfNeeded();
        await rx.back.click();
        const menuItem = page.locator('.ant-dropdown:visible [role=menuitem]').filter({ hasText: item }).first();
        await expect(menuItem).toBeVisible({ timeout: 10_000 });
        return menuItem;
      };
      /** ย้อนกลับ ไปแก้ไข → decompose → หน้าสร้างใบยา */
      const revert = async (rx: Awaited<ReturnType<typeof openRx>>, id: string, tag: string) => {
        const item = await backMenu(rx, 'ย้อนกลับ ไปแก้ไข');
        await markEvidence(expected(rx.title), clicked(rx.back), clicked(item));
        await snapEvidence(page, `ก่อนกด — ย้อนกลับ ไปแก้ไข (${tag})`);
        const before = (await notices(page)).length;
        const res = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === `/cortex-api/prescriptions/${id}/decompose`, { timeout: 60_000 });
        await item.click();
        const response = await res;
        await page.waitForURL(/preset=pharmacyCreatePrescription/, { timeout: 60_000 }).catch(() => undefined);
        await expect(createButton).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(3_000);
        const errs = await errorsSince(before);
        note(`ย้อนกลับไปแก้ไข (${tag})`, `POST /prescriptions/${id}/decompose ${response.status()} · ${(await response.text().catch(() => '')).slice(0, 160) || '(ว่าง)'} · URL ${page.url().split('?')[1]?.slice(0, 120)} · แจ้งเตือน error ${errs.join(' | ') || '(ไม่มี)'}`);
        return { status: response.status(), errors: errs };
      };
      /** ยกเลิกใบยา → เลือกเหตุผล → ยืนยัน → cancel → แท็บยกเลิกใบยา */
      const cancelRx = async (rx: Awaited<ReturnType<typeof openRx>>, hn: string, id: string, tag: string) => {
        const item = await backMenu(rx, 'ยกเลิกใบยา');
        await markEvidence(expected(rx.title), clicked(rx.back), clicked(item));
        await snapEvidence(page, `ก่อนกด — ยกเลิกใบยา (${tag})`);
        await item.click();
        const dialog = page.locator('.ant-modal:visible').filter({ hasText: 'เหตุผลที่ยกเลิก' });
        await expect(dialog, 'ต้องมีหน้าต่างเหตุผลที่ยกเลิก').toBeVisible({ timeout: 15_000 });
        await dialog.locator('.ant-select').first().click();
        const reason = options.filter({ hasText: 'เปลี่ยนแปลงคำสั่งการรักษา' }).first();
        await expect(reason).toBeVisible({ timeout: 10_000 });
        await reason.click();
        const confirm = dialog.getByRole('button', { name: 'ยืนยัน' });
        await markEvidence(filled(dialog.locator('.ant-select').first()), clicked(confirm));
        await snapEvidence(page, `ก่อนกด — ยืนยันยกเลิกใบยา (${tag})`);
        const before = (await notices(page)).length;
        const res = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === `/cortex-api/prescriptions/${id}/cancel`, { timeout: 60_000 });
        await confirm.click();
        const response = await res;
        await page.waitForTimeout(3_000);
        const errs = await errorsSince(before);
        note(`ยกเลิกใบยา (${tag})`, `POST /prescriptions/${id}/cancel ${response.status()} · body ${response.request().postData() ?? '-'} · แจ้งเตือน error ${errs.join(' | ') || '(ไม่มี)'}`);
        const tab = await openTab(/ยกเลิกใบยา/, hn);
        const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: hn }).filter({ hasText: rx.no }).first();
        const inTab = await row.isVisible({ timeout: 30_000 }).catch(() => false);
        if (inTab) {
          await markEvidence(expected(tab), expected(row));
          await holdForClip(page, 2_000);
          await snapEvidence(page, `ใบยา ${rx.no} ในแท็บยกเลิกใบยา (${tag})`);
        }
        note(`แท็บยกเลิกใบยา (${tag})`, inTab ? squash(await row.innerText()).slice(0, 180) : 'ไม่พบใบยา');
        return { status: response.status(), errors: errs, inTab };
      };
      const verdict = async (title: string, tag: string, rows: CompareRow[]) => {
        await showCompareTable(page, title, ['ที่ควรเป็น', 'ที่เห็นจริง'], rows, { side: 'bottom' });
        await holdForClip(page, 2_500);
        await snapEvidence(page, `${tag} ผล`);
        await hideCompareTable(page);
        for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
      };
      const noError = (errs: string[]): CompareRow => ({ label: 'ข้อความ Error', values: ['ไม่ขึ้น', errs.join(' | ') || 'ไม่ขึ้น'], same: errs.length === 0 });

      // ═════════ ส่วน A คนไข้ Refill ═════════
      if (!skip.includes('A')) {
        let [rHn, rVn] = (process.env.SBH1717_REFILL ?? '6931990').split(',');
        /** แถว Task ยังไม่เติมรอบแรกสุดของยา / คลินิก */
        const openRefillTab = async () => {
          await gotoPharmacy();
          await page.getByRole('tab', { name: /Order เติมยา/ }).click();
          const boxes = main.locator('.ant-picker-range input');
          await expect(boxes.nth(1)).toBeVisible({ timeout: 30_000 });
          await boxes.nth(0).click();
          await boxes.nth(0).fill(beDate(-30));
          await boxes.nth(0).press('Enter');
          await page.waitForTimeout(500);
          await boxes.nth(1).click();
          await boxes.nth(1).fill(beDate(60));
          await boxes.nth(1).press('Enter');
          await page.waitForTimeout(1_000);
          const box = main.getByRole('textbox', { name: /ค้นหา VN, HN/ });
          await box.fill(rHn);
          await box.press('Enter');
          await page.waitForTimeout(4_000);
        };
        const pendingTask = async () => {
          const rows = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `HN ${rHn}` }).filter({ hasText: DRUG_REFILL.name }).filter({ hasText: REFILL_CLINIC }).filter({ hasText: 'ยังไม่เติม' });
          let best: { row: Locator; round: string; n: number } | undefined;
          for (let i = 0; i < (await rows.count()); i++) {
            const round = (await rows.nth(i).innerText()).split(/[\n\t]/).map((s) => s.trim()).find((s) => /^\d+\/\d+$/.test(s)) ?? '';
            const n = Number(round.split('/')[0] || 99);
            if (!best || n < best.n) best = { row: rows.nth(i), round, n };
          }
          if (!best) throw new Error(`ไม่มี Task ยังไม่เติมของ ${DRUG_REFILL.name} HN ${rHn}`);
          return best;
        };
        /** รอบเติมยาในหน้าสร้างใบยา (ส่วน ยา Refill) ของคลินิก MED + รอบที่ใช้ */
        const roundItem = (round: string) => main.locator('.ant-collapse-item').filter({ hasText: `เติมยาครั้งที่ ${round}` });
        const expandRound = async (round: string): Promise<Locator> => {
          const items = roundItem(round);
          for (let i = 0; i < (await items.count()); i++) {
            const it = items.nth(i);
            const head = it.locator('.ant-collapse-header');
            if ((await head.getAttribute('aria-expanded')) !== 'true') {
              const box = await head.boundingBox();
              if (box) await page.mouse.click(box.x + 15, box.y + box.height / 2);
              await page.waitForTimeout(1_000);
            }
            if (/ห้องตรวจโรคอายุรกรรม/.test(await it.innerText())) return it;
          }
          throw new Error(`ไม่พบรอบเติมยา ${round} ของคลินิก ${REFILL_CLINIC} ในหน้าสร้างใบยา`);
        };
        const drugRowsIn = (scope: Locator, name: string) => scope.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: name });

        let round = '';
        let rx1 = '';
        let rx2 = '';
        // ── Pre-condition: Visit Walk-in รับยาต่อเนื่อง (Refill) ของวันนี้ ──
        await startClip(page, 'TC-001');
        const ready = await soft(`${TC['001']} ขั้น 1 คนไข้ Refill HN ${rHn} มี Visit Walk-in "${REFILL_SERVICE}" ของวันนี้`, async () => {
          if (!rVn) {
            await page.goto(`/cortex/next/patients/${rHn}?actions=createVisit`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
            await expect(main.getByText(/^รายการเข้ารับบริการ/)).toBeVisible({ timeout: 90_000 });
            await page.waitForTimeout(2_500);
            const serviceSelect = main.getByText('หรือรับบริการ', { exact: true }).locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
            await serviceSelect.click();
            await page.keyboard.type('รับยาต่อเนื่อง');
            const option = options.filter({ hasText: REFILL_SERVICE }).first();
            await expect(option).toBeVisible({ timeout: 10_000 });
            await option.click();
            const visitRow = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: 'Walk-in' }).first();
            await expect(visitRow).toContainText(REFILL_SERVICE, { timeout: 10_000 });
            const create = main.getByRole('button', { name: 'สร้าง', exact: true });
            await markEvidence(filled(visitRow), clicked(create));
            await snapEvidence(page, 'ก่อนกด — สร้าง Visit Refill วันนี้');
            const res = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/graphql') && (r.request().postData() ?? '').includes('CreateVisit'), { timeout: 60_000 });
            await create.click();
            const body = (await (await res).json()) as { data?: { createVisit?: { visit?: { vn: string } } } };
            rVn = body.data?.createVisit?.visit?.vn ?? '';
            expect(rVn, 'สร้าง Visit Refill ต้องได้ VN').toBeTruthy();
            await page.waitForTimeout(2_000);
          }
          note('คนไข้ Refill', `HN ${rHn} · Visit Walk-in ${REFILL_SERVICE} วันนี้ ${rVn} · ทำต่อ: SBH1717_REFILL=${rHn},${rVn}`);
        });

        // ── TC-001 สร้างใบยาจาก Task ──
        const created = ready && await soft(`${TC['001']} ขั้น 2-3 Order เติมยา → Task ${DRUG_REFILL.name} → นำไปสร้างใบยา → สร้างใบยา ไม่ขึ้น Error`, async () => {
          await openRefillTab();
          const task = await pendingTask();
          round = task.round;
          const goButton = main.getByRole('button', { name: /นำไปสร้างใบยา/ }).first();
          await task.row.locator('input[type=checkbox]').check();
          await markEvidence(filled(task.row.locator('.ant-checkbox').first()), clicked(goButton));
          await snapEvidence(page, `ก่อนกด — นำไปสร้างใบยา (Task ${round})`);
          await goButton.click();
          const confirm = page.getByRole('dialog').filter({ hasText: 'ยืนยันการสร้างใบยา' });
          await expect(confirm).toBeVisible({ timeout: 15_000 });
          await confirm.getByRole('button', { name: /^นำไปสร้างใบยา$/ }).click();
          await page.waitForURL(/tab=medication-refill/, { timeout: 60_000 });
          await expect(createButton).toBeVisible({ timeout: 60_000 });
          await page.waitForTimeout(4_000);
          const needVisit = await main.getByText(/กรุณาเลือกการเข้ารับบริการปัจจุบัน/).count();
          note(`${TC['001']} หน้าสร้างใบยา`, `URL ${page.url().split('?')[1]?.slice(0, 200)} · ข้อความต้องเลือก Visit ${needVisit ? 'ขึ้น' : 'ไม่ขึ้น'}`);
          const item = await expandRound(round);
          const r = await pressCreate('TC-001', [expected(item.locator('.ant-collapse-header'))]);
          rx1 = r.id;
          let rows: string[] = [];
          if (rx1) {
            const rx = await openRx(rHn, rx1, 'TC-001');
            rows = (await drugRowsIn(rx.section, DRUG_REFILL.name).allInnerTexts()).map(squash);
            await markEvidence(expected(rx.title), expected(rx.rows.first()));
            await holdForClip(page, 2_000);
            await snapEvidence(page, `หน้า Prescription ใบยา ${rx.no} (TC-001)`);
          }
          await verdict('สร้างใบยาจาก Task เติมยา (คนไข้ Refill)', 'TC-001', [
            noError(r.errors),
            { label: 'POST /opd/prescriptions', values: ['สำเร็จ (2xx)', String(r.status)], same: r.status >= 200 && r.status < 300 },
            { label: 'ใบยาเลขที่', values: ['ได้เลขใบยา', rx1 || '-'], same: !!rx1 },
            { label: `รายการยา Refill ${DRUG_REFILL.name}`, values: ['แสดงในใบยา', rows.length ? `${rows.length} แถว` : 'ไม่มี'], same: rows.length > 0 },
          ]);
        });

        // ── TC-002 ย้อนกลับไปแก้ไข ──
        let reverted = false;
        if (created && rx1) {
          await startClip(page, 'TC-002');
          reverted = await soft(`${TC['002']} ขั้น 1-2 หน้า Prescription → ย้อนกลับ ▾ → ย้อนกลับ ไปแก้ไข ไม่ขึ้น Error`, async () => {
            const rx = await openRx(rHn, rx1, 'TC-002');
            const r = await revert(rx, rx1, 'TC-002');
            const item = await expandRound(round).catch(() => undefined);
            const drug = item ? await drugRowsIn(item, DRUG_REFILL.name).count() : 0;
            if (item) await markEvidence(expected(item.locator('.ant-collapse-header')), ...(drug ? [expected(drugRowsIn(item, DRUG_REFILL.name).first())] : []), expected(createButton));
            await holdForClip(page, 2_000);
            await snapEvidence(page, 'หลังย้อนกลับ — หน้าสร้างใบยา (TC-002)');
            await verdict('ย้อนกลับไปแก้ไขใบยา (คนไข้ Refill)', 'TC-002', [
              noError(r.errors),
              { label: `POST decompose ${rx1}`, values: ['สำเร็จ (2xx)', String(r.status)], same: r.status >= 200 && r.status < 300 },
              { label: 'กลับหน้าสร้างใบยา', values: ['ใช่', /pharmacyCreatePrescription/.test(page.url()) ? 'ใช่' : page.url().slice(0, 80)], same: /pharmacyCreatePrescription/.test(page.url()) },
              { label: `รายการยาเดิม (รอบ ${round})`, values: [DRUG_REFILL.name, drug ? `${DRUG_REFILL.name} ${drug} แถว` : 'ไม่พบ'], same: drug > 0 },
              { label: 'ปุ่มสร้างใบยา', values: ['กดได้', (await createButton.isEnabled()) ? 'กดได้' : 'กดไม่ได้'], same: await createButton.isEnabled() },
            ]);
          });
        }

        // ── TC-004 สร้างใบยาใหม่หลังย้อนกลับ (ยาไม่ซ้ำ) ──
        if (reverted) {
          await startClip(page, 'TC-004');
          await soft(`${TC['004']} ขั้น 1-3 สร้างใบยาใหม่หลังย้อนกลับ → รายการยาไม่ซ้ำ`, async () => {
            const item = await expandRound(round);
            const beforeRows = (await drugRowsIn(item, DRUG_REFILL.name).allInnerTexts()).map(squash);
            const allBefore = await item.locator('tr.ant-table-row').filter({ visible: true }).count();
            await markEvidence(expected(item.locator('.ant-collapse-header')), expected(drugRowsIn(item, DRUG_REFILL.name).first()));
            await snapEvidence(page, `ก่อนติ๊ก — รายการยาของรอบ ${round} (TC-004)`);
            // ติ๊กแล้วหน้าวาดใหม่ (รอบพับหมด + ช่องคลังยาโผล่) → จับหัวรอบที่ติ๊กใหม่ทุกครั้ง
            const checkedHead = () => main.locator('.ant-collapse-item').filter({ has: page.locator('.ant-checkbox-checked') }).filter({ hasText: `เติมยาครั้งที่ ${round}` }).locator('.ant-collapse-header').first();
            for (let i = 0; i < 4 && !(await checkedHead().count()); i++) {
              const target = await expandRound(round);
              await target.locator('.ant-collapse-header .ant-checkbox').first().click();
              await page.waitForTimeout(2_000);
            }
            expect(await checkedHead().count(), 'ติ๊กรอบเติมยาไม่ติด').toBeGreaterThan(0);
            note(`${TC['004']} ก่อนสร้าง`, `รอบ ${round} · แถวยา ${allBefore} · ${beforeRows.join(' ‖ ').slice(0, 200)}`);
            const r = await pressCreate('TC-004', [filled(checkedHead())]);
            rx2 = r.id;
            let after: string[] = [];
            let allAfter = 0;
            if (rx2) {
              const rx = await openRx(rHn, rx2, 'TC-004');
              after = (await drugRowsIn(rx.section, DRUG_REFILL.name).allInnerTexts()).map(squash);
              allAfter = await rx.rows.count();
              await markEvidence(expected(rx.title), ...(await rx.rows.all()).map((row) => expected(row)));
              await holdForClip(page, 2_000);
              await snapEvidence(page, `หน้า Prescription ใบยาใหม่ ${rx.no} (TC-004)`);
            }
            // จำนวน = เลขก่อนไอคอน Refill → ข้อความแถว "… 7 1 คลัง: 0 …" (หน้าสร้างใบยา) / "… 7 1 tablet …" (หน้าใบยา)
            const qty = (t: string) => t.match(/\s(\d+)\s+\d+\s+(?:คลัง|[A-Za-z]+)/)?.[1] ?? '';
            await verdict('ใบยาใหม่หลังย้อนกลับไปแก้ไข', 'TC-004', [
              noError(r.errors),
              { label: 'ใบยาใหม่', values: ['ได้เลขใบยา', rx2 || '-'], same: !!rx2 },
              { label: `แถว ${DRUG_REFILL.name}`, values: ['1 แถว (ไม่ซ้ำ)', `${after.length} แถว`], same: after.length === 1 },
              { label: 'จำนวนแถวยาในใบยา', values: [`${allBefore} (เท่าก่อนสร้าง)`, String(allAfter)], same: allAfter === allBefore },
              { label: 'จำนวนยา', values: [qty(beforeRows[0] ?? '') || 'เท่าก่อนสร้าง', qty(after[0] ?? '') || '-'], same: !!after[0] && qty(after[0]) === qty(beforeRows[0] ?? '') },
            ]);
          });
        }

        // ── TC-003 ยกเลิกใบยา ──
        if (rx2) {
          await startClip(page, 'TC-003');
          await soft(`${TC['003']} ขั้น 1-3 ใบยาใหม่จาก TC-004 → ย้อนกลับ ▾ → ยกเลิกใบยา → แท็บยกเลิกใบยา ไม่ขึ้น Error`, async () => {
            const rx = await openRx(rHn, rx2, 'TC-003');
            const r = await cancelRx(rx, rHn, rx2, 'TC-003');
            await verdict('ยกเลิกใบยา (คนไข้ Refill)', 'TC-003', [
              noError(r.errors),
              { label: `POST cancel ${rx2}`, values: ['สำเร็จ (2xx)', String(r.status)], same: r.status >= 200 && r.status < 300 },
              { label: 'แท็บยกเลิกใบยา', values: [`มีใบยา ${rx.no}`, r.inTab ? `มีใบยา ${rx.no}` : 'ไม่พบ'], same: r.inTab },
            ]);
          });
        }
      }

      // ═════════ ส่วน B คนไข้ OPD ปกติ ═════════
      if (!skip.includes('B')) {
        let [nHn, nVn, nEn] = (process.env.SBH1717_NORMAL ?? '').split(',');
        let rx5 = '';
        let rx7 = '';
        await startClip(page, 'TC-005');
        const sent = await soft(`${TC['005']} ขั้น 1 คนไข้ OPD ปกติ สั่งยา ${DRUG_NORMAL.name} (ไม่ใช่ Refill) → ส่งคำสั่ง`, async () => {
          if (nHn) return note('คนไข้ OPD ปกติ', `ใช้ผู้ป่วยเดิม HN ${nHn} · ${nVn} · ${nEn}`);
          const patient = newTestPatient('Rx1717N');
          await gotoReception(page);
          await fillNewPatientForm(page, patient);
          const save = saveNewPatientButton(page);
          await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await markEvidence(filled(receptionFrame(page).getByTestId('firstName')), clicked(save));
          await snapEvidence(page, 'ก่อนกด — บันทึกผู้ป่วยใหม่ (คนไข้ OPD ปกติ)');
          nHn = await saveNewPatient(page);
          if (await expectPatientInfo(page)) await openNewVisitPanel(page);
          const opd = await openOpdVisit(page, { anyDoctor: true });
          nVn = opd.vn;
          nEn = opd.en;
          await selectOpdUnit(page);
          await checkInFromOpdList(page, await opdListRow(page, nHn, { anyDoctor: true }));
          note('คนไข้ OPD ปกติ', `${patient.firstName} ${patient.familyName} · HN ${nHn} · ${nVn} · ${nEn} · ${opd.clinic} · ${opd.doctor}`);
          await page.goto(`/cortex/next/patients/${nHn}?en=${nEn}&vn=${nVn}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
          await expect(main.getByText(`VN ${nVn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
          await page.waitForTimeout(3_000);
          await addMedicineToCart(page, DRUG_NORMAL.code);
          const send = main.getByRole('button', { name: 'save ส่งคำสั่ง' });
          await markEvidence(expected(main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${DRUG_NORMAL.code}]` }).first()), clicked(send));
          await snapEvidence(page, 'ก่อนกด — ส่งคำสั่งยาปกติ');
          const signed = page.waitForResponse((r: Response) => r.url().endsWith('/cortex-api/graphql') && /SignOPDOrders/.test(r.request().postData() ?? ''), { timeout: 60_000 });
          await send.click();
          const alert = orderAlert(page);
          if (await alert.waitFor({ state: 'visible', timeout: 6_000 }).then(() => true, () => false)) {
            for (const reason of await alert.getByRole('textbox').all()) await reason.fill('ทดสอบระบบ SBH-1717');
            await alert.getByRole('button', { name: 'ยืนยันการสั่งออเดอร์' }).click();
          }
          const body = await (await signed).json().catch(() => ({}));
          expect(body.errors, `ส่งคำสั่งไม่สำเร็จ: ${JSON.stringify(body.errors ?? '').slice(0, 300)}`).toBeFalsy();
          console.log(`    ทำต่อ: SBH1717_NORMAL=${nHn},${nVn},${nEn}`);
          await page.waitForTimeout(3_000);
        });

        const created = sent && await soft(`${TC['005']} ขั้น 2-3 ห้องยา Order รอยืนยัน → คลิกชื่อคนไข้ → สร้างใบยา ไม่ขึ้น Error`, async () => {
          const tab = await openTab(/Order รอยืนยัน/, nHn);
          const row = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `HN ${nHn}` }).first();
          await expect(row, `ผู้ป่วย HN ${nHn} ต้องอยู่แท็บ Order รอยืนยัน`).toBeVisible({ timeout: 60_000 });
          await markEvidence(expected(tab), clicked(row));
          await snapEvidence(page, 'ก่อนกด — Order ของคนไข้ OPD ปกติ');
          await row.locator('td').nth(4).click();
          await expect(createButton).toBeVisible({ timeout: 60_000 });
          await page.waitForTimeout(3_000);
          const drugRow = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${DRUG_NORMAL.code}]` }).first();
          const r = await pressCreate('TC-005', [expected(drugRow)]);
          rx5 = r.id;
          let rows = 0;
          if (rx5) {
            const rx = await openRx(nHn, rx5, 'TC-005');
            rows = await rx.rows.filter({ hasText: DRUG_NORMAL.name }).count();
            await markEvidence(expected(rx.title), expected(rx.rows.first()));
            await holdForClip(page, 2_000);
            await snapEvidence(page, `หน้า Prescription ใบยา ${rx.no} (TC-005)`);
          }
          await verdict('สร้างใบยา OPD ปกติ', 'TC-005', [
            noError(r.errors),
            { label: 'POST /opd/prescriptions', values: ['สำเร็จ (2xx)', String(r.status)], same: r.status >= 200 && r.status < 300 },
            { label: 'ใบยาเลขที่', values: ['ได้เลขใบยา', rx5 || '-'], same: !!rx5 },
            { label: `รายการยา ${DRUG_NORMAL.name}`, values: ['แสดงในใบยา', rows ? `${rows} แถว` : 'ไม่มี'], same: rows > 0 },
          ]);
        });

        let reverted = false;
        if (created && rx5) {
          await startClip(page, 'TC-006');
          reverted = await soft(`${TC['006']} ขั้น 1-2 หน้า Prescription → ย้อนกลับ ▾ → ย้อนกลับ ไปแก้ไข ไม่ขึ้น Error`, async () => {
            const rx = await openRx(nHn, rx5, 'TC-006');
            const r = await revert(rx, rx5, 'TC-006');
            const drugRow = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${DRUG_NORMAL.code}]` }).first();
            const has = await drugRow.isVisible().catch(() => false);
            await markEvidence(...(has ? [expected(drugRow)] : []), expected(createButton));
            await holdForClip(page, 2_000);
            await snapEvidence(page, 'หลังย้อนกลับ — หน้าสร้างใบยา (TC-006)');
            await verdict('ย้อนกลับไปแก้ไขใบยา OPD ปกติ', 'TC-006', [
              noError(r.errors),
              { label: `POST decompose ${rx5}`, values: ['สำเร็จ (2xx)', String(r.status)], same: r.status >= 200 && r.status < 300 },
              { label: 'กลับหน้าสร้างใบยา', values: ['ใช่', /pharmacyCreatePrescription/.test(page.url()) ? 'ใช่' : page.url().slice(0, 80)], same: /pharmacyCreatePrescription/.test(page.url()) },
              { label: 'รายการยาเดิม', values: [DRUG_NORMAL.name, has ? DRUG_NORMAL.name : 'ไม่พบ'], same: has },
              { label: 'ปุ่มสร้างใบยา', values: ['กดได้', (await createButton.isEnabled()) ? 'กดได้' : 'กดไม่ได้'], same: await createButton.isEnabled() },
            ]);
          });
        }

        if (reverted) {
          await startClip(page, 'TC-007');
          await soft(`${TC['007']} ขั้น 1-3 สร้างใบยาอีกครั้ง → ย้อนกลับ ▾ → ยกเลิกใบยา → แท็บยกเลิกใบยา ไม่ขึ้น Error`, async () => {
            const drugRow = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${DRUG_NORMAL.code}]` }).first();
            const c = await pressCreate('TC-007', [expected(drugRow)]);
            rx7 = c.id;
            expect(rx7, `สร้างใบยาอีกครั้งไม่สำเร็จ (${c.status}) ${c.body.slice(0, 120)}`).toBeTruthy();
            const rx = await openRx(nHn, rx7, 'TC-007');
            const r = await cancelRx(rx, nHn, rx7, 'TC-007');
            await verdict('ยกเลิกใบยา OPD ปกติ', 'TC-007', [
              noError([...c.errors, ...r.errors]),
              { label: `POST cancel ${rx7}`, values: ['สำเร็จ (2xx)', String(r.status)], same: r.status >= 200 && r.status < 300 },
              { label: 'แท็บยกเลิกใบยา', values: [`มีใบยา ${rx.no}`, r.inTab ? `มีใบยา ${rx.no}` : 'ไม่พบ'], same: r.inTab },
            ]);
          });
        }
      }

      const list = await notices(page);
      note('แจ้งเตือนทั้งหมดระหว่างเทส', list.join(' | ').slice(0, 800) || '(ไม่มี)');
      note('ผลรวม', failures.length ? `ไม่ผ่าน ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
