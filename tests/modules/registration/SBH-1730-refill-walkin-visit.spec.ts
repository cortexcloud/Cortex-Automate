import type { Page, Response } from '@playwright/test';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence } from '../../../helpers/functions/evidence';
import { finishVideo, restartVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { openNewVisitPanel, registerPatient } from '../../../helpers/functions/reception';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { gotoPatient, openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';
import { notices, recordNotices, waitNotice } from '../../../helpers/functions/notices';
import { dayPlus } from '../../../helpers/functions/dates';
import { cellByHeader, headersOf, squash } from '../../../helpers/functions/table';

// การ์ด SBH-1730 [OPD][Registration] ปรับชื่อ / ตัวเลือก Visit การรับบริการ Refill — EXE SBH-2661 → TS SBH-2662 (HPY) → TC-SBH-1730-001–006 (SBH-2663–2668)
// เทส 1 (TC-001–004): ผู้ป่วย AUTO ใหม่ (ยังไม่มี Visit วันนี้) → เวชระเบียน "Visit ใหม่" (แผงจัดการ Visit) → ช่อง "หรือรับบริการ" มี "รับยาต่อเนื่อง (Refill)" → เลือก → สร้าง → ตาราง "รายการเข้ารับบริการ"
//   หมายเหตุ dev-x 20 ต.ค. 2026: หัวตารางเป็น ประเภท | คลินิก | Location | แพทย์ | เวลานัด | ประเภทบริการ (ไม่มีคอลัมน์ชื่อ "คลินิก/ประเภทบริการ" แล้ว → TC-003 อ่านคอลัมน์ "คลินิก")
// เทส 2 (TC-005–006): ผู้ป่วย AUTO ใหม่ + Visit OPD + เช็คอิน → ประวัติการนัดหมาย (ก่อน) → แพทย์ (Doctor หน้าต่างแยก) สั่งยา A Refill 3 รอบ × 7 → ส่งคำสั่ง →
//   ประวัติการนัดหมาย (หลัง — นัดของ Visit วันนี้ที่ระบบสร้างตอนเปิด Visit ไม่นับ) · ประวัติการรับบริการ (VN มีเฉพาะ Visit วันนี้) · ห้องยา แท็บ Order เติมยา = Task 3 รอบ
// ทิ้ง Visit ไว้ (R11) · TC ที่ไม่ผ่านไม่หยุดเทส (soft) · คลิปแยกต่อ TC (R61)
// ทำต่อกับผู้ป่วยเดิม: SBH1730_P1=<HN> (ยังไม่มี Visit) · SBH1730_P2=<HN>,<VN>,<EN> (เช็คอินแล้ว ตะกร้าว่าง)
// รัน dev-x: npx playwright test --headed --grep @SBH-1730 --output=.cache/run-1730

const REFILL = 'รับยาต่อเนื่อง (Refill)';
const ROBOT = 'คิวรับยาหุ่นยนต์ (Robot)';
const DRUG_A = { code: 'med0000007', name: 'GPO-L-ONE' };
const ROUNDS = 3;
const TC = {
  '001': 'TC-001 (SBH-2663)', '002': 'TC-002 (SBH-2664)', '003': 'TC-003 (SBH-2665)',
  '004': 'TC-004 (SBH-2666)', '005': 'TC-005 (SBH-2667)', '006': 'TC-006 (SBH-2668)',
} as const;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');
const isGraphql = (r: Response, op: string) => r.request().method() === 'POST' && r.url().includes('/graphql') && (r.request().postData() ?? '').includes(op);

test.describe('SBH-1730 Visit Walk-in รับยาต่อเนื่อง (Refill)', () => {

  test(
    'เวชระเบียน: เปิด Visit Walk-in เลือกบริการ "รับยาต่อเนื่อง (Refill)" แล้วตารางรายการเข้ารับบริการแสดงประเภทบริการ Refill',
    { tag: ['@SBH-1730', '@SBH-2663', '@SBH-2664', '@SBH-2665', '@SBH-2666'], annotation: ['SBH-1730', 'SBH-2661', 'SBH-2663', 'SBH-2664', 'SBH-2665', 'SBH-2666'].map(linear) },
    async ({ page }) => {
      test.setTimeout(600_000);
      const main = page.getByRole('main');
      const failures: string[] = [];
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

      // ── Pre-condition: ผู้ป่วย AUTO ใหม่ที่ยังไม่มี Visit วันนี้ → แผงจัดการ Visit ──
      let hn = process.env.SBH1730_P1 ?? '';
      if (!hn) {
        await checkStep(page, 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน (ยังไม่มี Visit วันนี้)', async () => {
          const p = await registerPatient(page, 'Refill1730');
          hn = p.hn;
          note('ผู้ป่วย', `${p.name} · HN ${hn} (ยังไม่มี Visit) · ทำต่อ: SBH1730_P1=${hn}`);
          if (p.newVisitEnabled) await openNewVisitPanel(page);
        });
      }
      const panelTitle = main.getByText(/^รายการเข้ารับบริการ/);
      if (!(await panelTitle.isVisible().catch(() => false))) {
        await page.goto(`/cortex/next/patients/${hn}?actions=createVisit`);
        await expect(panelTitle).toBeVisible({ timeout: 90_000 });
      }
      await page.waitForTimeout(2_000);
      // ช่องถัดจากป้าย "หรือรับบริการ" (จับด้วย placeholder "เลือกบริการ" ไม่ได้ — เลือกแล้วข้อความเปลี่ยน)
      const serviceSelect = main.getByText('หรือรับบริการ', { exact: true }).locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]');
      const options = page.locator('.ant-select-dropdown:visible .ant-select-item');
      const refillOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: new RegExp(`^${REFILL.replace(/[()]/g, '\\$&')}$`) }).first();

      // ── TC-001 ตัวเลือก "รับยาต่อเนื่อง (Refill)" ในช่องเลือกบริการ ──
      await startClip(page, 'TC-001');
      await restartVideo(page);
      // ทำต่อกับ Visit Refill ที่สร้างแล้ว (ตรวจ TC-003 / 004 อย่างเดียว): SBH1730_P1=<HN> + SBH1730_CREATED=<VN>
      const createdVn = process.env.SBH1730_CREATED ?? '';
      const listed = !createdVn && await soft(`${TC['001']} ขั้น 3 ตัวเลือก Refill ในช่องหรือรับบริการ`, async () => {
        await expect(serviceSelect, 'แผงจัดการ Visit ต้องมีช่อง "หรือรับบริการ"').toBeVisible({ timeout: 30_000 });
        await markEvidence(clicked(serviceSelect));
        await snapEvidence(page, 'ก่อนกด — ช่องหรือรับบริการ');
        await serviceSelect.click();
        await expect(options.first()).toBeVisible({ timeout: 10_000 });
        // เลื่อนรายการ (virtual list) ให้กลุ่มห้องยาขึ้น → ตัวเลือกอยู่ในรายการโดยไม่ต้องพิมพ์ค้น
        const holder = page.locator('.ant-select-dropdown:visible .rc-virtual-list-holder').first();
        for (let i = 0; i < 20 && !(await refillOption.isVisible().catch(() => false)); i++) {
          await holder.evaluate((el) => { el.scrollTop += 120; });
          await page.waitForTimeout(200);
        }
        const group = page.locator('.ant-select-dropdown:visible .ant-select-item-group').filter({ hasText: /ห้องยา/ }).first();
        const robot = page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: ROBOT }).first();
        note('TC-001 ตัวเลือกกลุ่มห้องยา', squash((await options.allInnerTexts()).join(' | ')));
        await markEvidence(expected(refillOption), ...((await group.count()) ? [expected(group)] : []));
        await holdForClip(page, 2_000);
        await expect(refillOption, `รายการบริการต้องมี "${REFILL}"`).toBeVisible();
        if (await robot.isVisible().catch(() => false)) note('TC-001 ข้อสังเกต', `ตัวเลือก "${ROBOT}" ยังอยู่ในรายการ (กลุ่มเดียวกัน)`);
      });

      // ── TC-002 เลือก Refill → สร้าง → แถว Visit ประเภท Walk-in · ประเภทบริการ Refill ──
      await startClip(page, 'TC-002');
      let created = !!createdVn;
      const visitRow = main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: 'Walk-in' }).first();
      let vn = '';
      if (listed) {
        await soft(`${TC['002']} ขั้น 3-5 สร้าง Visit Refill → แถว Walk-in + ประเภทบริการ`, async () => {
          if (!(await refillOption.isVisible().catch(() => false))) {
            await serviceSelect.click();
            await page.keyboard.type('รับยาต่อเนื่อง');
            await expect(refillOption).toBeVisible({ timeout: 10_000 });
          }
          await refillOption.click();
          // เลือกแล้วระบบเพิ่มแถวร่าง (Walk-in · คลินิก = บริการที่เลือก) ลงตารางทันที และล้างช่องเลือก → ต้องกด "สร้าง" ต่อ
          await expect(visitRow, 'เลือกบริการแล้วต้องมีแถวร่าง Walk-in').toContainText(REFILL, { timeout: 10_000 });
          note('TC-002 แถวร่างก่อนกดสร้าง', squash(await visitRow.innerText()));
          const createButton = main.getByRole('button', { name: 'สร้าง', exact: true });
          await markEvidence(filled(visitRow), clicked(createButton));
          await snapEvidence(page, 'ก่อนกด — สร้าง Visit Refill');
          const res = page.waitForResponse((r) => isGraphql(r, 'CreateVisit'), { timeout: 60_000 });
          const startNotices = (await notices(page)).length;
          await createButton.click();
          const response = await res;
          await page.waitForTimeout(3_000);
          note('แจ้งเตือนหลังกดสร้าง', (await notices(page)).slice(startNotices).join(' || ') || '(ไม่มี)');
          const body = (await response.json().catch(() => ({}))) as { data?: { createVisit?: { visit?: { vn: string; encounters?: { en: string }[] } } }; errors?: { message: string }[] };
          vn = body.data?.createVisit?.visit?.vn ?? '';
          note('CreateVisit', `${response.status()} · VN ${vn || '-'} · EN ${body.data?.createVisit?.visit?.encounters?.map((e) => e.en).join(', ') || '-'}${body.errors ? ` · errors ${body.errors.map((e) => e.message).join(' · ')}` : ''}`);
          await test.info().attach('CreateVisit (Refill)', { body: JSON.stringify(body, null, 2), contentType: 'application/json' });
          expect(vn, 'สร้าง Visit ต้องได้ VN').toBeTruthy();
          await expect(visitRow, 'ตารางรายการเข้ารับบริการต้องมีแถว Walk-in').toBeVisible({ timeout: 30_000 });
          await page.waitForTimeout(1_500);
          const type = (await cellByHeader(visitRow, 'ประเภท')).text;
          const service = await cellByHeader(visitRow, 'ประเภทบริการ');
          note('TC-002 แถว Visit', `${squash(await visitRow.innerText())} · หัวคอลัมน์ ${(await headersOf(visitRow)).join(' | ')}`);
          await showCompareTable(page, 'Visit ที่สร้าง — ตารางรายการเข้ารับบริการ', ['ที่ควรเป็น', 'แถว Visit'], [
            { label: 'ประเภท', values: ['Walk-in', type], same: type === 'Walk-in' },
            { label: 'ประเภทบริการ', values: [REFILL, service.text], same: service.text === REFILL },
          ], { side: 'bottom' });
          await markEvidence(expected(visitRow));
          await holdForClip(page, 2_500);
          expect(type, 'ประเภทต้องเป็น Walk-in').toBe('Walk-in');
          expect(service.text, `ประเภทบริการต้องเป็น "${REFILL}"`).toBe(REFILL);
        });
        await hideCompareTable(page);
        created = !!vn; // TC-003 / 004 ตรวจได้เมื่อสร้าง Visit ได้ แม้ TC-002 ไม่ผ่าน
      }

      // ── TC-003 / 004 เปิดแผงจัดการ Visit ใหม่ → คอลัมน์คลินิก / ประเภทบริการ ──
      // แผง ?actions=createVisit ไม่แสดง Visit ที่สร้างแล้ว — หลังสร้างหน้าเปลี่ยนเป็นแท็บ "แก้ไข Visit" (?actions=editVisit&editVN=<VN>) ซึ่งเป็นแผงจัดการของ Visit นั้น
      const reopen = async () => {
        await page.goto(`/cortex/next/patients/${hn}?actions=editVisit&editVN=${vn || createdVn}`);
        await expect(panelTitle).toBeVisible({ timeout: 90_000 });
        await expect(visitRow, 'เปิดแผงจัดการ Visit ใหม่แล้วต้องเห็นแถว Visit Refill').toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(1_500);
        await page.mouse.move(960, 1000);
      };
      await startClip(page, 'TC-003');
      if (created) {
        await soft(`${TC['003']} ขั้น 2-3 คอลัมน์คลินิก = Refill ไม่ใช่ Robot`, async () => {
          await reopen();
          await restartVideo(page);
          const headers = await headersOf(visitRow);
          const header = headers.includes('คลินิก/ประเภทบริการ') ? 'คลินิก/ประเภทบริการ' : 'คลินิก';
          const clinic = await cellByHeader(visitRow, header);
          note('TC-003', `หัวคอลัมน์ ${headers.join(' | ')} · คอลัมน์ "${header}" = "${clinic.text}"`);
          await showCompareTable(page, `คอลัมน์ "${header}" ของ Visit Refill`, ['ที่ควรเป็น', 'แผงจัดการ Visit'], [
            { label: header, values: [REFILL, clinic.text], same: clinic.text === REFILL },
            { label: `ไม่ใช่ "${ROBOT}"`, values: ['ไม่ใช่', clinic.text.includes('Robot') ? 'ใช่ (Robot)' : 'ไม่ใช่'], same: !clinic.text.includes('Robot') },
          ], { side: 'bottom' });
          await markEvidence(expected(clinic.cell), expected(visitRow.locator('xpath=ancestor::div[contains(@class,"ant-table-wrapper")][1]').locator('thead th').filter({ hasText: new RegExp(`^${header}$`) }).first()));
          await holdForClip(page, 2_500);
          expect(clinic.text, `คอลัมน์ "${header}" ต้องเป็น "${REFILL}"`).toBe(REFILL);
        });
        await hideCompareTable(page);
      }
      await startClip(page, 'TC-004');
      if (created) {
        await soft(`${TC['004']} ขั้น 3 คอลัมน์ประเภทบริการ = Refill`, async () => {
          await reopen();
          await restartVideo(page);
          const headers = await headersOf(visitRow);
          const header = headers.includes('คลินิก/ประเภทบริการ') ? 'คลินิก/ประเภทบริการ' : 'คลินิก';
          const clinic = await cellByHeader(visitRow, header);
          const service = await cellByHeader(visitRow, 'ประเภทบริการ');
          await showCompareTable(page, 'คอลัมน์ "ประเภทบริการ" ของ Visit Refill', ['ที่ควรเป็น', 'แผงจัดการ Visit'], [
            { label: 'ประเภทบริการ', values: [REFILL, service.text], same: service.text === REFILL },
            { label: `ตรงกับคอลัมน์ "${header}"`, values: [clinic.text, service.text], same: service.text === clinic.text },
          ], { side: 'bottom' });
          await markEvidence(expected(service.cell), expected(clinic.cell));
          await holdForClip(page, 2_500);
          expect(service.text, `ประเภทบริการต้องเป็น "${REFILL}"`).toBe(REFILL);
          expect(service.text, `ประเภทบริการต้องตรงกับคอลัมน์ "${header}"`).toBe(clinic.text);
        });
        await hideCompareTable(page);
      }
      note('ผลรวม', failures.length ? `ไม่ผ่าน ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );

  test(
    'แพทย์สั่ง Order Refill 3 รอบ → ไม่มีนัดหมาย / Visit ล่วงหน้า มีแค่ Task เติมยา',
    { tag: ['@SBH-1730', '@SBH-2667', '@SBH-2668'], annotation: ['SBH-1730', 'SBH-2661', 'SBH-2667', 'SBH-2668'].map(linear) },
    async ({ page, browser }) => {
      test.setTimeout(900_000);
      const main = page.getByRole('main');
      const failures: string[] = [];
      const note = (type: string, description: string) => {
        test.info().annotations.push({ type, description });
        console.log(`    ${type}: ${description}`);
      };
      const soft = (p: Page, title: string, body: () => Promise<void>) =>
        checkStep(p, title, body).then(
          () => true,
          (error: unknown) => {
            failures.push(`${title} — ${firstLine(error)}`);
            console.log(`    ✗ ${title} — ${firstLine(error)}`);
            return false;
          },
        );

      // ── Pre-condition: ผู้ป่วย AUTO ใหม่ + Visit OPD + เช็คอิน ──
      let [hn, vn, en] = (process.env.SBH1730_P2 ?? '').split(',');
      if (!hn) {
        let newVisitEnabled = false;
        await checkStep(page, 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน', async () => {
          const p = await registerPatient(page, 'Appt1730');
          hn = p.hn;
          newVisitEnabled = p.newVisitEnabled;
          note('ผู้ป่วย', `${p.name} · HN ${hn}`);
        });
        await checkStep(page, 'Pre-condition เปิด Visit OPD แผนกอายุรกรรม', async () => {
          if (newVisitEnabled) await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          vn = opd.vn;
          en = opd.en;
          note('Visit OPD', `${vn} · EN ${en} · ${opd.clinic} · ${opd.doctor} · ทำต่อ: SBH1730_P2=${hn},${vn},${en}`);
        });
        await checkStep(page, 'Pre-condition เช็คอิน Visit OPD จากรายการผู้ป่วยนอก', async () => {
          await selectOpdUnit(page);
          const row = await opdListRow(page, hn);
          await markEvidence(expected(row.getByText(`HN ${hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
          await snapEvidence(page, 'ก่อนกด — เช็คอิน Visit OPD');
          await checkInFromOpdList(page, row);
        });
      } else note('ผู้ป่วย', `ผู้ป่วยเดิม HN ${hn} · ${vn} · EN ${en}`);

      /** นัดหมายแพทย์ของผู้ป่วยจาก graphql PhysicianAppointments ตอนเปิดเมนูซ้าย "ประวัติการนัดหมาย" */
      type Appointment = { id: string; start: string; currentStatus: string; serviceType: string; encounter?: { en: string } | null; createdAt: string };
      const left = page.getByRole('navigation', { name: 'ข้อมูลและเวชระเบียนผู้ป่วย' });
      const openLeftMenu = async (name: string) => {
        const item = left.locator('.ant-menu-title-content').filter({ hasText: new RegExp(`^${name}$`) }).first();
        await item.evaluate((el) => (el as HTMLElement).click()); // เมนูซ้ายอยู่นอกจอ (เลื่อนไม่ถึง) → คลิกผ่าน DOM
        await page.waitForTimeout(500);
        await page.mouse.move(960, 1000);
      };
      const readAppointments = async (tag: string): Promise<Appointment[]> => {
        await gotoPatient(page, hn);
        const res = page.waitForResponse((r) => isGraphql(r, 'PhysicianAppointments'), { timeout: 60_000 });
        await openLeftMenu('ประวัติการนัดหมาย');
        const body = (await (await res).json()) as { data?: { physicianAppointments?: { data?: Appointment[] } } };
        const list = body.data?.physicianAppointments?.data ?? [];
        await expect(main.getByText('วันนัด, เวลานัด')).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(1_500);
        note(`นัดหมาย (${tag})`, list.map((a) => `${a.start} ${a.currentStatus} ${a.serviceType} EN ${a.encounter?.en ?? '-'} สร้าง ${a.createdAt}`).join(' · ') || '(ไม่มี)');
        return list;
      };

      // ── TC-005 ก่อนสั่ง: รายการนัดหมาย ──
      await startClip(page, 'TC-005');
      let before: Appointment[] = [];
      const okBefore = await soft(page, `${TC['005']} ขั้น 1 ก่อนสั่ง Order Refill: รายการนัดหมายของคนไข้ (ประวัติการนัดหมาย)`, async () => {
        before = await readAppointments('ก่อนสั่ง');
        const future = before.filter((a) => a.start.slice(0, 10) > dayPlus(0).iso);
        await markEvidence(expected(main.getByText('วันนัด, เวลานัด').locator('xpath=ancestor::div[contains(@class,"ant-table-wrapper")][1]')));
        await holdForClip(page, 1_500);
        expect(future, 'ก่อนสั่งต้องยังไม่มีนัดหมายล่วงหน้า').toEqual([]);
      });

      // ── หน้าต่างแพทย์: สั่งยา A Refill 3 รอบ → ส่งคำสั่ง ──
      const context = await browser.newContext({ storageState: authFile('Doctor'), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
      await cacheAppAssets(context);
      await context.addInitScript(recordNotices);
      const doc = await context.newPage();
      await doc.goto('/cortex/');
      await trackVideo(doc, 'Doctor');
      const dm = doc.getByRole('main');
      const dialog = doc.getByRole('dialog').filter({ hasText: 'จัดการการเติมยา' });
      const basketRow = (code: string) => dm.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: `[${code}]` }).first();
      await startClip(page, 'พัก-ห้องยา'); // ตัดคลิป TC-005 หน้าหลัก ไม่ให้อัดช่วงที่รอแพทย์
      await startClip(doc, 'TC-005-แพทย์'); // ชื่อคลิปต้องไม่ซ้ำกับของหน้าหลัก (โฟลเดอร์เดียวกัน)
      let sent = false;
      if (okBefore) {
        sent = await soft(doc, `${TC['005']} ขั้น 2 Doctor สั่งยา A Refill ${ROUNDS} รอบ (จ่ายครั้งนี้ 7 / ยอดรวม 28) → ส่งคำสั่ง`, async () => {
          await selectOpdUnit(doc);
          await dm.getByPlaceholder('ค้นหา HN').waitFor({ timeout: 120_000 });
          await doc.waitForTimeout(1_500);
          await restartVideo(doc); // ตัดจอขาว / หน้าเลือกหน่วยบริการต้นคลิป
          const remove = dm.locator('.ant-select-selection-item-remove').filter({ visible: true });
          for (let i = 0; i < 3 && (await remove.count()); i++) {
            await remove.first().click();
            await doc.waitForTimeout(800);
          }
          const row = await opdListRow(doc, hn);
          const name = row.getByText(/AUTO\s/).first();
          await markEvidence(clicked(name));
          await snapEvidence(doc, 'ก่อนกด — ชื่อผู้ป่วย (Doctor)');
          await name.click();
          await expect(dm.getByText(`VN ${vn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
          for (const tab of ['OPD', 'ประวัติการรักษา']) {
            const t = doc.locator('[data-testid="patient-dockview-tab"]').filter({ hasText: new RegExp(`^\\s*${tab}\\s*$`) });
            if (await t.count()) await t.first().locator('.dv-default-tab-action').click().catch(() => undefined);
          }
          await addMedicineToCart(doc, DRUG_A.code, async () => {
            const period = dm.getByRole('spinbutton', { name: 'ระยะเวลาการใช้' });
            await period.fill('4');
            await period.press('Tab');
            const qty = dm.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
            await qty.fill('28');
            await qty.press('Tab');
            await expect(qty).toHaveValue('28');
          });
          const refillButton = dm.getByRole('button', { name: /^refill/i });
          await markEvidence(clicked(refillButton));
          await snapEvidence(doc, 'ก่อนกด — ปุ่ม refill');
          await refillButton.click();
          await expect(dialog).toBeVisible({ timeout: 20_000 });
          const drugRow = dialog.locator('tbody tr').filter({ hasText: DRUG_A.name }).first();
          await expect(drugRow).toBeVisible({ timeout: 20_000 });
          await doc.waitForTimeout(1_000);
          await dialog.getByRole('spinbutton').first().fill('7');
          const add = dialog.getByRole('button', { name: /เพิ่มครั้ง/ }).first();
          for (let i = 0; i < ROUNDS; i++) await add.click();
          await expect(dialog.getByText(/^เติมยาครั้งที่ \d+$/)).toHaveCount(ROUNDS, { timeout: 10_000 });
          const inputs = drugRow.locator('input:not([disabled])');
          const n = await inputs.count();
          for (let i = n - ROUNDS; i < n; i++) {
            await inputs.nth(i).fill('7');
            await inputs.nth(i).press('Tab');
          }
          await expect(drugRow.locator('input[disabled]').first(), 'จ่ายครั้งนี้ = 28 − 21 = 7').toHaveValue('7');
          const confirm = dialog.getByRole('button', { name: 'ยืนยัน', exact: true });
          await markEvidence(clicked(confirm));
          await snapEvidence(doc, 'ก่อนกด — ยืนยันแผน Refill');
          await confirm.click();
          await expect(dialog).toBeHidden({ timeout: 15_000 });
          await expect(basketRow(DRUG_A.code).locator('[aria-label="Remed"]'), 'ยา A ต้องเป็นรายการ Refill').toBeVisible({ timeout: 15_000 });
          const submit = dm.getByRole('button', { name: 'save ส่งคำสั่ง' });
          const start = (await notices(doc)).length;
          await markEvidence(clicked(submit));
          await snapEvidence(doc, 'ก่อนกด — ส่งคำสั่ง');
          await submit.click();
          const text = await waitNotice(doc, start, /ส่งคำสั่ง/, 60_000);
          note('แจ้งเตือนหลังส่งคำสั่ง', text || '(ไม่เห็นแจ้งเตือน)');
          expect(text, 'ส่งคำสั่งแล้วต้องขึ้นแจ้งเตือนสำเร็จ').toMatch(/สำเร็จ/);
          await expect(basketRow(DRUG_A.code).locator('[aria-label="ส่งแล้ว"]')).toHaveCount(1, { timeout: 30_000 });
          await markEvidence(expected(basketRow(DRUG_A.code)));
          await holdForClip(doc);
        });
      }
      await startClip(doc, 'พัก-แพทย์');
      await finishVideo(doc);
      await context.close();

      // ── TC-005 หลังสั่ง: รายการนัดหมาย ──
      await startClip(page, 'TC-005-หลังสั่ง');
      if (sent) {
        await soft(page, `${TC['005']} ขั้น 3 หลังสั่ง Order Refill: ไม่มีนัดหมายถูกสร้างจาก Order Refill`, async () => {
          const after = await readAppointments('หลังสั่ง');
          await restartVideo(page);
          const added = after.filter((a) => !before.some((b) => b.id === a.id));
          const future = after.filter((a) => a.start.slice(0, 10) > dayPlus(0).iso);
          await showCompareTable(page, 'นัดหมายของคนไข้ ก่อน / หลังแพทย์สั่ง Order Refill', ['ที่ควรเป็น', 'จริง'], [
            { label: 'จำนวนนัดหมาย (ก่อน → หลัง)', values: [`${before.length} → ${before.length}`, `${before.length} → ${after.length}`], same: after.length === before.length },
            { label: 'นัดหมายใหม่หลังสั่ง', values: ['ไม่มี', added.map((a) => `${a.start} ${a.serviceType}`).join(', ') || 'ไม่มี'], same: added.length === 0 },
            { label: 'นัดหมายหลังวันนี้ (รอบเติมยา)', values: ['ไม่มี', future.map((a) => a.start.slice(0, 10)).join(', ') || 'ไม่มี'], same: future.length === 0 },
          ], { side: 'bottom' });
          await markEvidence(expected(main.getByText('วันนัด, เวลานัด').locator('xpath=ancestor::div[contains(@class,"ant-table-wrapper")][1]')));
          await holdForClip(page, 2_500);
          expect(added, 'ต้องไม่มีนัดหมายใหม่จาก Order Refill').toEqual([]);
          expect(future, 'ต้องไม่มีนัดหมายของรอบเติมยา').toEqual([]);
        });
        await hideCompareTable(page);
      }

      // ── TC-006 ไม่มี Visit ล่วงหน้า + มี Task เติมยา ──
      await startClip(page, 'TC-006');
      if (sent) {
        await soft(page, `${TC['006']} ขั้น 2 ประวัติการรับบริการ: มีเฉพาะ Visit วันนี้ (${vn}) ไม่มี Visit ของรอบเติมยา`, async () => {
          await gotoPatient(page, hn);
          await restartVideo(page);
          await openLeftMenu('ประวัติการรับบริการ');
          const vnRows = main.getByText(/^VN V\d+/);
          await expect(vnRows.first()).toBeVisible({ timeout: 30_000 });
          await page.waitForTimeout(1_500);
          const vns = (await vnRows.allInnerTexts()).map(squash);
          const total = squash(await main.getByText(/^แสดง \d+ จาก \d+$/).first().innerText().catch(() => ''));
          note('TC-006 ประวัติการรับบริการ', `${vns.join(' · ')} · ${total}`);
          await showCompareTable(page, 'Visit ของคนไข้ (ประวัติการรับบริการ)', ['ที่ควรเป็น', 'จริง'], [
            { label: 'Visit', values: [`VN ${vn} (วันนี้) เท่านั้น`, vns.join(', ')], same: vns.length === 1 && vns[0] === `VN ${vn}` },
            { label: 'Visit ของรอบเติมยา (ล่วงหน้า)', values: ['ไม่มี', vns.length > 1 ? `${vns.length - 1} รายการ` : 'ไม่มี'], same: vns.length === 1 },
          ], { side: 'bottom' });
          await markEvidence(expected(vnRows.first()), ...((await main.getByText(/^แสดง \d+ จาก \d+$/).count()) ? [expected(main.getByText(/^แสดง \d+ จาก \d+$/).first())] : []));
          await holdForClip(page, 2_500);
          expect(vns, 'ต้องมีเฉพาะ Visit วันนี้').toEqual([`VN ${vn}`]);
        });
        await hideCompareTable(page);
        await soft(page, `${TC['006']} ขั้น 3 ห้องยา แท็บ Order เติมยา: มี Task เติมยา ${ROUNDS} รอบของคนไข้`, async () => {
          await page.goto('/cortex/pharmacy/select-location');
          await main.getByRole('combobox').first().click();
          await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'ห้องยาชั้น 1' }).first().click();
          await page.waitForTimeout(800);
          await main.getByRole('combobox').nth(1).click();
          await page.waitForTimeout(800);
          await page.keyboard.press('Enter');
          await page.getByRole('button', { name: 'ส่ง' }).click();
          await page.waitForURL(/\/pharmacy\/opd\/medication-orders/, { timeout: 60_000 });
          await page.getByRole('tab', { name: /Order เติมยา/ }).click();
          const end = main.getByRole('textbox', { name: 'วันที่สิ้นสุด' });
          await expect(end).toBeVisible({ timeout: 30_000 });
          const statusSelect = main.locator('.ant-select').filter({ hasText: /ยังไม่เติม|ทั้งหมด/ }).first();
          const removeChip = statusSelect.locator('.ant-select-selection-item').filter({ hasNotText: 'ทั้งหมด' }).locator('.ant-select-selection-item-remove');
          for (let i = 0; i < 5 && (await removeChip.count()); i++) {
            await removeChip.first().click();
            await page.waitForTimeout(800);
          }
          await end.click();
          await end.fill(dayPlus(60).iso);
          await end.press('Enter');
          await page.waitForTimeout(1_000);
          const search = main.getByRole('textbox', { name: /ค้นหา VN, HN/ });
          const res = page.waitForResponse((r) => r.url().includes('medication-refill-with-detail') && decodeURIComponent(r.url()).includes(`[hn][contains]=${hn}`), { timeout: 30_000 });
          await markEvidence(filled(end), filled(search));
          await search.fill(hn);
          await search.press('Enter');
          const body = (await (await res).json()) as { data?: { iteration: number; sourceCount: number; sourceVn: string; scheduledRefillDate: string; latestStatusCode: string }[] };
          await page.waitForTimeout(1_500);
          const tasks = (body.data ?? []).filter((t) => t.sourceVn === vn).sort((a, b) => a.iteration - b.iteration);
          note('TC-006 Task เติมยา', tasks.map((t) => `${t.iteration}/${t.sourceCount} ${t.scheduledRefillDate.slice(0, 10)} ${t.latestStatusCode}`).join(' · ') || '(ไม่มี)');
          const rows = main.locator('tr.ant-table-row').filter({ hasText: `HN ${hn}` });
          await showCompareTable(page, 'Task เติมยาของคนไข้ (แท็บ Order เติมยา)', ['ที่ควรเป็น', 'จริง (API)'], [
            { label: 'จำนวน Task', values: [String(ROUNDS), String(tasks.length)], same: tasks.length === ROUNDS },
            { label: 'รอบ', values: [Array.from({ length: ROUNDS }, (_, i) => `${i + 1}/${ROUNDS}`).join(', '), tasks.map((t) => `${t.iteration}/${t.sourceCount}`).join(', ')], same: tasks.map((t) => t.iteration).join() === '1,2,3' },
          ], { side: 'bottom' });
          if (await rows.count()) await markEvidence(expected(rows.first()), ...((await rows.count()) > 1 ? [expected(rows.last())] : []));
          await holdForClip(page, 2_500);
          expect(tasks.length, `ต้องมี Task เติมยา ${ROUNDS} รอบ`).toBe(ROUNDS);
        });
        await hideCompareTable(page);
      }
      note('ผลรวม', failures.length ? `ไม่ผ่าน ${failures.length} ขั้น` : 'ผ่านทุกขั้น');
      expect(failures, `ขั้นที่ไม่ผ่าน:\n${failures.join('\n')}`).toEqual([]);
    },
  );
});
