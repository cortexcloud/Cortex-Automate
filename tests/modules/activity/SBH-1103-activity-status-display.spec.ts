import { trackAuthorization } from '../../../helpers/functions/er-report';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence } from '../../../helpers/functions/evidence';
import {
  ACTIVITY_STATUS_LABEL,
  activityIcon,
  activityIconTone,
  activityPopover,
  activityTaskButton,
  activityTaskRow,
  activityTooltip,
  activityTrigger,
  checkInFromOpdList,
  expectedActivityTone,
  fetchActivityTasks,
  gotoActivityTaskList,
  opdListRow,
  orderFromOpdPanel,
  readActivityPopover,
  runActivityTaskAction,
  selectOpdUnit,
  thaiDateTime,
  type ActivityTaskInfo,
} from '../../../helpers/functions/opd-activity';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit } from '../../../mock-data/uat-er';
import { recordMenu } from '../../../mock-data/uat-play';

// การ์ด SBH-1103 [Activity] Display หัตถการในหน้าต่างๆ — EXE SBH-2587 → SC SBH-2588 → TC-001–004 (SBH-2589–2592)
// 1 เทส = 1 flow (R9): ผู้ป่วย AUTO ใหม่ ลงทะเบียน + Visit OPD ที่เวชระเบียน (R53) → เช็คอินจากรายการผู้ป่วยนอก → สั่งหัตถการ ECG (89.52)
//   → TC-001 ไอคอนในรายการ · TC-002 popover "สถานะหัตถการ" · TC-003 ทำหัตถการที่ห้อง Echo แล้วสถานะ "ทำแล้ว" · TC-004 หน้าประวัติ EN (เก็บภาพให้ผู้ใช้ตัดสิน — การ์ดไม่ระบุว่าแสดงอะไร)
// ต้องเช็คอิน Visit OPD ก่อนสั่ง ไม่งั้นงานหัตถการไม่มี EN หัตถการ แล้วห้องหัตถการเช็คอินไม่ได้ (500 "activity task … has no active item with an encounter (EN)")
// TC ที่ไม่ผ่านไม่หยุดเทส (soft) — เทสจบไม่ผ่านพร้อมรายการขั้น
// ทำต่อกับผู้ป่วยเดิม (เช็คอินแล้ว): SBH1103_VISIT=<HN>,<VN>,<EN> · สั่งหัตถการไว้แล้ว: เติม SBH1103_SKIP_ORDER=1
// รันบน dev-x: npx playwright test --headed --grep @SBH-1103

const CODE = '89.52'; // Electrocardiogram (ECG) — category ECG ไปห้อง Echo
const ROOM = 'ห้อง Echo';
const TC1 = 'TC-001 (SBH-2589)';
const TC2 = 'TC-002 (SBH-2590)';
const TC3 = 'TC-003 (SBH-2591)';
const TC4 = 'TC-004 (SBH-2592)';
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');

test.describe('SBH-1103 แสดงหัตถการและสถานะหัตถการนอกหน้า Order', () => {
  test.skip(() => !!process.env.BASE_URL?.includes('srbrhospital'), 'รอบนี้ผู้ใช้สั่งรันบน dev-x เท่านั้น');

  test(
    'ผู้ป่วย AUTO ใหม่: Visit OPD → สั่งหัตถการ ECG → ไอคอน / popover สถานะหัตถการในรายการผู้ป่วยนอก → ทำแล้วที่ห้อง Echo → ประวัติ EN (Super_User)',
    { tag: ['@SBH-1103', '@SBH-2589', '@SBH-2590', '@SBH-2591', '@SBH-2592'], annotation: ['SBH-1103', 'SBH-2589', 'SBH-2590', 'SBH-2591', 'SBH-2592'].map(linear) },
    async ({ page }) => {
      test.setTimeout(900_000);
      const main = page.getByRole('main');
      const authorization = trackAuthorization(page);
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

      let [hn, vn, en] = (process.env.SBH1103_VISIT ?? '').split(',');
      let tasks: ActivityTaskInfo[] = [];
      const loadTasks = async () => (tasks = await fetchActivityTasks(page, authorization(), { hn, vn }));

      if (!hn) {
        const patient = newTestPatient('Proc1103');
        await checkStep(page, 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน', async () => {
          await gotoReception(page);
          await markEvidence(clicked(newPatientButton(page)));
          await fillNewPatientForm(page, patient);
          const f = receptionFrame(page);
          const save = saveNewPatientButton(page);
          await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await markEvidence(filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), filled(f.getByTestId('birthDate')), clicked(save));
          await snapEvidence(page, 'ก่อนกด — บันทึกผู้ป่วยใหม่');
          hn = await saveNewPatient(page);
          console.log(`    ผู้ป่วย: ${patient.firstName} ${patient.familyName} · HN ${hn}`);
          await expectPatientInfo(page);
          await markEvidence(expected(main.getByText(`HN ${hn}`, { exact: true }).first()));
        });
        await checkStep(page, 'Pre-condition เปิด Visit OPD แผนกอายุรกรรม (แพทย์ นาย ทดสอบ มานะ)', async () => {
          await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          vn = opd.vn;
          en = opd.en;
          note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${hn} · ${vn} · EN (OPD) ${en} · ${opd.clinic} · ${opd.doctor}`);
          console.log(`    ทำต่อกับรายเดิม: SBH1103_VISIT=${hn},${vn},${en}`);
          await markEvidence(expected(main.getByRole('row').filter({ hasText: 'Walk-in' }).first()));
        });
        await checkStep(page, 'Pre-condition เช็คอิน Visit OPD จากรายการผู้ป่วยนอก', async () => {
          await selectOpdUnit(page);
          const row = await opdListRow(page, hn);
          await markEvidence(expected(row.getByText(`HN ${hn}`)), clicked(row.getByRole('button', { name: /เช็คอิน$/ })));
          await snapEvidence(page, 'ก่อนกด — เช็คอิน Visit OPD');
          await checkInFromOpdList(page, row);
          await markEvidence(expected(row));
        });
      } else {
        note('ผู้ป่วย', `ผู้ป่วยเดิม HN ${hn} · ${vn} · EN (OPD) ${en}`);
        // เปิดหน้าแอปก่อน ให้มี Authorization header ไว้เรียก API
        await page.goto(`/cortex/next/patients/${hn}?en=${en}&vn=${vn}`);
        await expect(main.getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
      }

      // TC-001 ขั้น 1 (ใช้ร่วมกับ TC-002 / 003 / 004): แพทย์สั่งหัตถการ 1 รายการ
      if (!process.env.SBH1103_SKIP_ORDER) {
        await checkStep(page, `${TC1} ขั้น 1 สั่งหัตถการ ECG (${CODE}) ให้ผู้ป่วย OPD ใน Visit วันนี้`, async () => {
          await page.goto(`/cortex/next/patients/${hn}?en=${en}&vn=${vn}`);
          await orderFromOpdPanel(page, CODE, async (send) => {
            await markEvidence(expected(main.getByRole('row').filter({ hasText: `[${CODE}]` }).first()), clicked(send));
            await snapEvidence(page, 'ก่อนกด — ส่งคำสั่งหัตถการ');
          });
          await expect.poll(async () => (await loadTasks()).length, { message: 'ส่งคำสั่งแล้วต้องเกิดงานหัตถการของ Visit นี้', timeout: 30_000 }).toBeGreaterThan(0);
          // งานที่สั่งจาก ER ได้ EN หัตถการ (Encounter ACTIVITY) ทันที · dev-x 15 ต.ค. 2026: สั่งจาก OPD (เช็คอินแล้ว) งานไม่ได้ EN → ห้องหัตถการเช็คอินไม่ได้ (500) — จดไว้ ไม่หยุดเทส
          const gotEn = await expect.poll(async () => (await loadTasks()).some((t) => t.en), { timeout: 20_000 }).toBe(true).then(() => true, () => false);
          if (!gotEn) note('EN หัตถการ', 'สั่งแล้ว 20 วินาที งานหัตถการยังไม่มี EN หัตถการ (en ว่าง)');
          await markEvidence(expected(main.getByRole('row').filter({ hasText: `[${CODE}]` }).first()));
        });
      }
      await loadTasks();
      const item = tasks.flatMap((t) => t.items)[0];
      note('งานหัตถการ (API)', tasks.map((t) => `task ${t.id} · vn ${t.vn} · en ${t.en ?? '-'} · ${t.latestStatusCode} · [${t.items.map((i) => `${i.name} ${i.latestStatusCode} due ${i.serviceDue} acc ${i.accessionNo}`).join(', ')}]`).join(' | '));
      await test.info().attach('งานหัตถการ (API) หลังสั่ง', { body: JSON.stringify(tasks, null, 2), contentType: 'application/json' });

      // ไอคอน + popover ในรายการผู้ป่วยนอก — ใช้ทั้ง TC-001 / 002 และตรวจซ้ำหลังทำแล้ว (TC-003)
      const listNetwork: string[] = [];
      page.on('response', async (res) => {
        const post = res.request().postData() ?? '';
        if (!res.url().endsWith('/cortex-api/graphql') || !/query ActivityTasks/.test(post)) return;
        const vars = JSON.parse(post).variables;
        if (vars?.filter?.hn !== hn) return;
        const body = (await res.json().catch(() => null)) as { data?: { activityTasks?: { metadata?: { totalCount?: number } } } } | null;
        listNetwork.push(`ActivityTasks filter=${JSON.stringify(vars.filter)} → ${body?.data?.activityTasks?.metadata?.totalCount ?? '?'} งาน`);
      });

      await soft(`${TC1} ขั้น 2-3 หน้า List ผู้ป่วย วันที่ของ Visit แถวของผู้ป่วยแสดงไอคอนสถานะหัตถการ`, async () => {
        await selectOpdUnit(page);
        const row = await opdListRow(page, hn);
        await expect(activityIcon(row)).toBeVisible();
        const icon = await activityIconTone(row);
        const want = expectedActivityTone(tasks.flatMap((t) => t.items.map((i) => i.latestStatusCode)));
        await showCompareTable(page, `${TC1} ไอคอนสถานะหัตถการของ HN ${hn}`, ['หน้าจอ', 'ที่ควรเป็น (ตามงานใน API / รูปในการ์ด)'], [
          { label: 'ไอคอน', values: ['มี (คอลัมน์ PROC)', 'มี'], same: true },
          { label: 'สีไอคอน', values: [`${icon.tone} (${icon.style || 'ไม่มีสี'})`, `${want} (งาน ${tasks.flatMap((t) => t.items.map((i) => i.latestStatusCode)).join(', ') || '-'})`], same: icon.tone === want },
        ], { side: 'left', width: '760px' });
        await markEvidence(expected(activityIcon(row)), expected(row.getByText(`HN ${hn}`)));
        await holdForClip(page, 2_000);
        expect(icon.tone, `ไอคอนต้องแสดงสถานะหัตถการของผู้ป่วย (สี ${want}) — ได้ ${icon.tone}`).toBe(want);
      });
      await hideCompareTable(page);

      const checkPopover = async (title: string, wantStatus: string) => {
        const row = await opdListRow(page, hn);
        const trigger = activityTrigger(row);
        await trigger.hover();
        await expect(activityTooltip(page)).toBeVisible();
        await markEvidence(clicked(trigger), alerted(activityTooltip(page)));
        await snapEvidence(page, `วางเมาส์ — tooltip (${title.slice(0, 6)})`);
        await trigger.click();
        const pop = await readActivityPopover(page);
        await loadTasks();
        const api = tasks.flatMap((t) => t.items)[0];
        const shown = pop.items[0];
        const rows = [
          { label: 'หัวเรื่อง', values: ['สถานะหัตถการ', 'สถานะหัตถการ'], same: true },
          { label: 'ชื่อหัตถการ', values: [shown?.name ?? (pop.empty ? '"ไม่พบรายการหัตถการ"' : '-'), api?.name ?? '-'], same: !!shown && shown.name === api?.name },
          { label: 'ป้ายสถานะ', values: [shown?.status ?? '-', `${wantStatus} (${api?.latestStatusCode ?? '-'})`], same: !!shown && shown.status === wantStatus },
          { label: 'เวลาที่ต้องทำ', values: [shown?.serviceDue ?? '-', thaiDateTime(api?.serviceDue ?? null)], same: !!shown && shown.serviceDue === thaiDateTime(api?.serviceDue ?? null) },
          { label: 'Accession no.', values: [shown?.accessionNo ?? '-', api?.accessionNo ?? '-'], same: !!shown && shown.accessionNo === (api?.accessionNo || '-') },
        ];
        await showCompareTable(page, `${title} popover "สถานะหัตถการ" ของ HN ${hn}`, ['หน้าจอ', 'หัตถการที่สั่ง (API)'], rows, { side: 'left', width: '760px' });
        await markEvidence(expected(activityPopover(page)));
        await holdForClip(page, 2_000);
        await test.info().attach(`${title} popover`, { body: JSON.stringify({ popover: pop, api: tasks, request: listNetwork }, null, 2), contentType: 'application/json' });
        expect(pop.empty, `popover ต้องแสดงหัตถการที่สั่ง — ได้ "${pop.text.replace(/\s+/g, ' ')}" · คำขอของหน้า: ${listNetwork.slice(-1)[0] ?? '-'}`).toBe(false);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'ข้อมูลใน popover ต้องตรงกับหัตถการที่สั่ง').toEqual([]);
      };

      await soft(`${TC2} ขั้น 3 วางเมาส์ / คลิกไอคอนหัตถการ ขึ้น popup "สถานะหัตถการ" ข้อมูลตรงกับหัตถการที่สั่ง`, async () => {
        await checkPopover(TC2, ACTIVITY_STATUS_LABEL[item?.latestStatusCode ?? 'INITIATED']);
      });
      await hideCompareTable(page);
      await page.keyboard.press('Escape');
      note('คำขอของไอคอนในรายการ', listNetwork.slice(-2).join(' | ') || '-');

      // TC-003 ทำหัตถการที่ห้องหัตถการ แล้วกลับมาดูรายการ
      let checkedIn = false;
      await soft(`${TC3} ขั้น 2 หน้าหัตถการ (Activity task list) ${ROOM} เช็คอินงานของผู้ป่วย`, async () => {
        await gotoActivityTaskList(page, ROOM);
        const row = activityTaskRow(page, hn);
        await expect(row, `ต้องเห็นงานของ HN ${hn} ใน ${ROOM}`).toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(row), clicked(activityTaskButton(row, 'เช็คอิน')));
        await snapEvidence(page, 'ก่อนกด — เช็คอินงานหัตถการ');
        const res = await runActivityTaskAction(page, row, 'เช็คอิน', async (dialog, confirm) => {
          await markEvidence(filled(dialog.getByRole('radio').first()), clicked(confirm));
          await snapEvidence(page, 'ก่อนกด — ยืนยันเช็คอิน (ประเภทคิว)');
        });
        const body = await res.text();
        await test.info().attach('เช็คอินงานหัตถการ (POST activity-tasks/status)', { body: `${res.status()} ${body}`, contentType: 'text/plain' });
        expect(res.status(), `เช็คอินงานหัตถการต้องสำเร็จ — ${res.status()} ${body.slice(0, 300)}`).toBeLessThan(300);
        await expect(activityTaskButton(row, 'ทำแล้ว')).toBeVisible({ timeout: 30_000 });
        await markEvidence(expected(row));
        checkedIn = true;
      });
      if (checkedIn) {
        await soft(`${TC3} ขั้น 2 บันทึกว่าทำหัตถการนั้นแล้ว (ปุ่ม ทำแล้ว)`, async () => {
          const row = activityTaskRow(page, hn);
          await markEvidence(clicked(activityTaskButton(row, 'ทำแล้ว')));
          await snapEvidence(page, 'ก่อนกด — ทำแล้ว');
          const res = await runActivityTaskAction(page, row, 'ทำแล้ว', async (dialog, confirm) => {
            await markEvidence(clicked(confirm));
            await snapEvidence(page, 'ก่อนกด — ยืนยันทำแล้ว');
          });
          const body = await res.text();
          await test.info().attach('ทำแล้ว (POST activity-tasks/status)', { body: `${res.status()} ${body}`, contentType: 'text/plain' });
          expect(res.status(), `บันทึกทำแล้วต้องสำเร็จ — ${res.status()} ${body.slice(0, 300)}`).toBeLessThan(300);
          await expect.poll(async () => (await loadTasks()).flatMap((t) => t.items).map((i) => i.latestStatusCode).join(','), { message: 'งานใน API ต้องเป็น PERFORMED', timeout: 30_000 }).toContain('PERFORMED');
          const performedTab = main.getByRole('tab', { name: /^ทำแล้ว/ });
          await markEvidence(...((await row.isVisible()) ? [expected(row)] : []), expected(performedTab));
        });
        await soft(`${TC3} ขั้น 3-4 กลับหน้า List ผู้ป่วย วางเมาส์ / คลิกไอคอน ป้ายสถานะใน popup เป็น "ทำแล้ว"`, async () => {
          await selectOpdUnit(page);
          await checkPopover(TC3, 'ทำแล้ว');
        });
        await hideCompareTable(page);
        await page.keyboard.press('Escape');
      } else {
        failures.push(`${TC3} ขั้น 2-4 ตรวจไม่ได้ — เช็คอินงานหัตถการไม่สำเร็จ`);
      }

      await soft(`${TC4} ขั้น 2 เปิดหน้าประวัติ EN (ประวัติการรับบริการ) ของผู้ป่วยรายนั้น — เก็บภาพให้ตัดสิน`, async () => {
        await loadTasks();
        const activityEn = tasks.map((t) => t.en ?? t.items.find((i) => i.en)?.en).find(Boolean) ?? '';
        await page.goto(`/cortex/next/patients/${hn}?en=${en}&vn=${vn}`);
        await recordMenu(page, 'ประวัติการรับบริการ');
        const opdRow = main.getByRole('row').filter({ hasText: en }).first();
        await expect(opdRow).toBeVisible({ timeout: 60_000 });
        const marks = [expected(opdRow)];
        let activityText = '(ไม่มี EN หัตถการ)';
        if (activityEn) {
          const actRow = main.getByRole('row').filter({ hasText: activityEn }).first();
          await expect(actRow).toBeVisible();
          activityText = (await actRow.innerText()).replace(/\s+/g, ' ');
          marks.push(expected(actRow));
        }
        note(`${TC4} หน้าประวัติ EN`, `EN (OPD) ${en}: ${(await opdRow.innerText()).replace(/\s+/g, ' ')} · EN หัตถการ ${activityEn || '-'}: ${activityText} · หน้าประวัติไม่มีชื่อหัตถการ / สถานะหัตถการ (ดูภาพ)`);
        await markEvidence(...marks);
        await holdForClip(page, 2_000);
      });

      expect(failures, 'ขั้นที่ไม่ผ่าน / ยังตรวจไม่ครบ').toEqual([]);
    },
  );
});
