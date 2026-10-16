import type { Page } from '@playwright/test';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence } from '../../../helpers/functions/evidence';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import {
  chooseDoctorFilter,
  consultClear,
  consultNameSearch,
  consultRows,
  consultTab,
  gotoConsultList,
  readConsultRows,
  requesterFilter,
  sendConsultFromOpd,
  typePatientName,
  waitConsultRequests,
} from '../../../helpers/functions/opd-consult';
import { expectPatientInfo, fillNewPatientForm, gotoReception, newPatientButton, openNewVisitPanel, receptionFrame, saveNewPatient, saveNewPatientButton } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { openOpdVisit } from '../../../mock-data/uat-er';
import { careMenu, openPatientAs } from '../../../mock-data/uat-play';

// การ์ดบั๊ก SBH-1117 [OPD][รายการปรึกษาแพทย์] ค้นหาชื่อคนไข้ / แพทย์ผู้ร้องขอไม่ได้ ทั้งรับ Consult และส่ง Consult (+ SBH-2066 dropdown ผู้ป่วยแสดงแค่ชื่อ)
// ไม่มี TC ใน Sub-Issue — ลงผลเป็น Comment ในการ์ด (R45) · ผู้ใช้เลือก "สร้าง Consult ใหม่ตาม Steps"
// flow: ผู้ป่วย AUTO ใหม่ ลงทะเบียน + Visit OPD ที่เวชระเบียน (แพทย์ นาย ทดสอบ มานะ = Super_User) → เช็คอิน → ส่ง Consult ถึง ดร. วิชัย (Doctor)
//   → ส่ง Consult (Super_User): ค้นชื่อคนไข้ · ค้นแพทย์ผู้ร้องขอ → รับ Consult (หน้าต่างของ Doctor): ค้นชื่อคนไข้ · ค้นแพทย์ผู้ร้องขอ
// ทำต่อกับรายเดิม (ส่ง Consult แล้ว): SBH1117_VISIT=<HN>,<VN>,<EN>,<ชื่อเต็มผู้ป่วย>
// รันบน dev-x: npx playwright test --headed --grep @SBH-1117

const REQUESTER = { search: 'มานะ', name: /ทดสอบ มานะ/ }; // Super_User (practitioner 1)
const CONSULTANT = { search: 'เอื้อเฟื้อ', name: /วิชัย/ }; // Doctor (practitioner 155)
const REQUESTER_ID = 1;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const firstLine = (error: unknown) => (error instanceof Error ? error.message : String(error)).split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '');

test.describe('SBH-1117 รายการปรึกษาแพทย์ ค้นหาชื่อคนไข้ / แพทย์ผู้ร้องขอ', () => {
  test.skip(() => !!process.env.BASE_URL?.includes('srbrhospital'), 'รอบนี้ผู้ใช้สั่งรันบน dev-x เท่านั้น');

  test(
    'ผู้ป่วย AUTO ใหม่: ส่ง Consult จาก OPD → ค้นชื่อคนไข้ / แพทย์ผู้ร้องขอ ในส่ง Consult และรับ Consult (Super_User + Doctor)',
    { tag: ['@SBH-1117', '@SBH-2066'], annotation: ['SBH-1117', 'SBH-2066'].map(linear) },
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

      let [hn, vn, en, fullName] = (process.env.SBH1117_VISIT ?? '').split(',');
      if (!hn) {
        const patient = newTestPatient('Consult1117');
        await checkStep(page, 'Pre-condition ลงทะเบียนผู้ป่วย AUTO ใหม่ที่เวชระเบียน', async () => {
          await gotoReception(page);
          await markEvidence(clicked(newPatientButton(page)));
          await fillNewPatientForm(page, patient);
          const f = receptionFrame(page);
          const save = saveNewPatientButton(page);
          await save.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
          await markEvidence(filled(f.getByTestId('firstName')), filled(f.getByTestId('familyName')), clicked(save));
          await snapEvidence(page, 'ก่อนกด — บันทึกผู้ป่วยใหม่');
          hn = await saveNewPatient(page);
          await expectPatientInfo(page);
          await markEvidence(expected(main.getByText(`HN ${hn}`, { exact: true }).first()));
        });
        await checkStep(page, 'Pre-condition เปิด Visit OPD แผนกอายุรกรรม (แพทย์ นาย ทดสอบ มานะ) แล้วเช็คอิน', async () => {
          await openNewVisitPanel(page);
          const opd = await openOpdVisit(page);
          vn = opd.vn;
          en = opd.en;
          await selectOpdUnit(page);
          const row = await opdListRow(page, hn);
          await checkInFromOpdList(page, row);
          await markEvidence(expected(row));
        });
        fullName = `นาย ${patient.firstName} ${patient.familyName}`;
        await checkStep(page, 'Steps (แพทย์เจ้าของไข้) ส่ง Consult จากเมนู Consult ของหน้าผู้ป่วย OPD ถึง ดร. วิชัย', async () => {
          await page.goto(`/cortex/next/patients/${hn}?en=${en}&vn=${vn}`);
          await expect(main.getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
          const created = await sendConsultFromOpd(page, CONSULTANT, 'ทดสอบค้นหารายการปรึกษาแพทย์ (SBH-1117)', careMenu, async (save) => {
            await markEvidence(filled(main.getByText(/แพทย์ขอปรึกษา/).first()), filled(main.locator('[contenteditable="true"]').last()), clicked(save));
            await snapEvidence(page, 'ก่อนกด — บันทึก Consult');
          });
          note('Consult', `HN ${created.hn} · sourceType ${created.sourceType} · ${created.latestStatusCode}`);
        });
        console.log(`    ทำต่อกับรายเดิม: SBH1117_VISIT=${hn},${vn},${en},${fullName}`);
      }
      note('ผู้ป่วย', `${fullName} · HN ${hn} · ${vn} · EN ${en}`);
      const query = fullName.split(' ')[2]?.slice(0, 11) ?? fullName; // นามสกุลส่วนต้น (Consult1117…)

      /** ค้นชื่อคนไข้ในแท็บที่เปิดอยู่: dropdown แสดงแค่ชื่อ (SBH-2066) → เลือก → API กรองด้วย HN → ทุกแถวเป็นผู้ป่วยรายนี้ */
      const checkNameSearch = async (p: Page, tab: string) => {
        const { option, texts } = await typePatientName(p, query, fullName);
        await markEvidence(filled(consultNameSearch(p)), expected(option));
        await snapEvidence(p, `${tab} — dropdown ชื่อผู้ป่วย`);
        const withHn = texts.filter((t) => /\d{6,}/.test(t));
        const filtered = waitConsultRequests(p, (f) => f.hn === hn);
        await option.click();
        const { filter } = await filtered;
        await expect(consultRows(p).first()).toBeVisible({ timeout: 30_000 });
        const rows = await readConsultRows(p);
        await showCompareTable(p, `${tab} — ค้นชื่อคนไข้ "${fullName}"`, ['หน้าจอ / คำขอ', 'ที่ควรเป็น'], [
          { label: 'ตัวเลือกใน dropdown', values: [texts.join(' · '), 'ชื่อผู้ป่วยอย่างเดียว ไม่มี HN (SBH-2066)'], same: withHn.length === 0 },
          { label: 'ตัวกรองที่ส่ง', values: [`hn: ${filter.hn}`, `hn: ${hn}`], same: filter.hn === hn },
          { label: 'แถวที่แสดง', values: [rows.map((r) => `${r.hn} ${r.patient} (${r.status})`).join(' · '), `เฉพาะ HN ${hn}`], same: rows.length > 0 && rows.every((r) => r.hn === hn) },
        ], { side: 'right', width: '900px' });
        await markEvidence(expected(consultRows(p).first()));
        await holdForClip(p, 2_000);
        expect(withHn, 'dropdown ชื่อผู้ป่วยต้องไม่แสดง HN').toEqual([]);
        expect(rows.length, 'ค้นชื่อคนไข้แล้วต้องเจอรายการ Consult ของผู้ป่วยรายนี้').toBeGreaterThan(0);
        expect(rows.filter((r) => r.hn !== hn).map((r) => r.hn), 'ทุกแถวต้องเป็นผู้ป่วยที่ค้น').toEqual([]);
      };

      /** ค้นแพทย์ผู้ร้องขอในแท็บที่เปิดอยู่: ล้างตัวกรองแล้วเลือกแพทย์ → API กรองด้วยแพทย์ → ทุกแถวผู้ส่งเป็นแพทย์คนนั้น และมีรายการของผู้ป่วยรายนี้ */
      const checkRequesterSearch = async (p: Page, tab: string) => {
        const cleared = waitConsultRequests(p, (f) => !f.hn && !f.dateFrom);
        await consultClear(p).click();
        await cleared;
        const filtered = waitConsultRequests(p, (f) => Object.entries(f).some(([k, v]) => k !== 'targetPractitionerIds' && Array.isArray(v) && v.includes(REQUESTER_ID)));
        const chosen = await chooseDoctorFilter(p, requesterFilter(p), REQUESTER.search, REQUESTER.name);
        const { res, filter } = await filtered;
        await expect(consultRows(p).first()).toBeVisible({ timeout: 30_000 });
        const rows = await readConsultRows(p);
        const body = (await res.json()) as { data?: { consultRequests?: { data: { hn: string }[]; metadata: { totalCount: number } } } };
        const total = body.data?.consultRequests?.metadata.totalCount ?? 0;
        const key = Object.entries(filter).find(([k, v]) => k !== 'targetPractitionerIds' && Array.isArray(v) && (v as number[]).includes(REQUESTER_ID))?.[0];
        const ours = rows.some((r) => r.hn === hn);
        await showCompareTable(p, `${tab} — ค้นแพทย์ผู้ร้องขอ "${chosen}"`, ['หน้าจอ / คำขอ', 'ที่ควรเป็น'], [
          { label: 'ตัวกรองที่ส่ง', values: [`${key}: [${REQUESTER_ID}]`, 'แพทย์ผู้ร้องขอ = นาย ทดสอบ มานะ (practitioner 1)'], same: !!key },
          { label: 'ผู้ส่งของทุกแถว', values: [[...new Set(rows.map((r) => r.sender))].join(' · '), 'นาย ทดสอบ มานะ'], same: rows.length > 0 && rows.every((r) => REQUESTER.name.test(r.sender)) },
          { label: 'จำนวน', values: [`หน้านี้ ${rows.length} · ทั้งหมด ${total}`, '≥ 1'], same: total > 0 },
          { label: `รายการของ HN ${hn}`, values: [ours ? 'อยู่ในหน้าแรก' : 'ไม่อยู่ในหน้าแรก (ดูจำนวนทั้งหมด)', 'มี'], same: true },
        ], { side: 'right', width: '900px' });
        await markEvidence(filled(requesterFilter(p)), expected(consultRows(p).first()));
        await holdForClip(p, 2_000);
        expect(key, 'ตัวกรองแพทย์ผู้ร้องขอต้องถูกส่งไปกับคำขอ').toBeTruthy();
        expect(rows.length, 'ค้นแพทย์ผู้ร้องขอแล้วต้องเจอรายการ').toBeGreaterThan(0);
        expect(rows.filter((r) => !REQUESTER.name.test(r.sender)).map((r) => r.sender), 'ทุกแถวต้องมีผู้ส่งเป็นแพทย์ที่ค้น').toEqual([]);
      };

      // ส่ง Consult (แพทย์เจ้าของไข้ · Super_User)
      await selectOpdUnit(page);
      await gotoConsultList(page);
      await consultTab(page, 'ส่ง Consult').click();
      await soft(page, 'ส่ง Consult — ค้นหาด้วยชื่อคนไข้ (dropdown แสดงแค่ชื่อ · กรองเฉพาะผู้ป่วยรายนั้น)', () => checkNameSearch(page, 'ส่ง Consult'));
      await hideCompareTable(page);
      await soft(page, 'ส่ง Consult — ค้นหาด้วยแพทย์ผู้ร้องขอ', () => checkRequesterSearch(page, 'ส่ง Consult'));
      await hideCompareTable(page);

      // รับ Consult (แพทย์ผู้รับ Consult · Doctor ในหน้าต่างแยก)
      const pageB = await openPatientAs(browser, 'Doctor', hn);
      try {
        await selectOpdUnit(pageB);
        await gotoConsultList(pageB);
        await consultTab(pageB, 'รับ Consult').click();
        await soft(pageB, 'รับ Consult — ค้นหาด้วยชื่อคนไข้ (dropdown แสดงแค่ชื่อ · กรองเฉพาะผู้ป่วยรายนั้น)', () => checkNameSearch(pageB, 'รับ Consult'));
        await hideCompareTable(pageB);
        await soft(pageB, 'รับ Consult — ค้นหาด้วยแพทย์ผู้ร้องขอ', () => checkRequesterSearch(pageB, 'รับ Consult'));
        await hideCompareTable(pageB);
      } finally {
        await pageB.context().close();
      }

      expect(failures, 'ขั้นที่ไม่ผ่าน').toEqual([]);
    },
  );
});
