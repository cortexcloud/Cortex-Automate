import type { Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { erTriagePanel, saveErTriageForm, type VitalSigns } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, makeRunner, markEvidence, snapEvidence } from '../../../helpers/functions/evidence';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { gotoVisit } from '../../../mock-data/uat-play';

// SBH-3892 [Bug][คัดกรอง ER/ER Physician Note][MEWS] Retest บน SBH Prod — การ์ดบั๊กไม่มี TC Sub-Issue (แบบ 1)
// บั๊กเดิม: กรอก GCS ครบแล้วระบบแนะนำ AVPU ให้เอง (select "คำนวณ GCS (n)") แต่แถบผล MEWS ยังค้าง "Incomplete - AVPU" +
//   "Partial score alert (incomplete)" ไม่คิดคะแนนรวมให้ — แก้แล้วด้วย 3 PR (keep triage save working while sources/zones load ·
//   wait for zone suggestion + late MEWS · keep MEWS source revisions current before save)
// รีเทส: กรอกสัญญาณชีพ + GCS ครบ (AVPU ได้ค่าจาก GCS เอง) แล้วดูว่าแถบผล MEWS คิดคะแนนรวมให้ (ไม่ใช่ Incomplete / ไม่มี Partial score alert) · บันทึกคัดกรองได้ตามปกติ
// ผู้ใช้อนุญาต 6 พ.ย. 2026: สร้างผู้ป่วย AUTO ใหม่ 1 ราย บน SBH Prod แล้วปิด Visit ที่การเงิน · ลงผล Retest เป็น Comment (ไม่มี TC/Comment เดิมให้อ้างรูปแบบ)
// รัน (SBH Prod): npm run card:prod -- --headed --grep @SBH-3892

const VITALS: VitalSigns = { systolic: '120', diastolic: '80', pr: '80', rr: '16', temp: '37', spo2: '98', painScore: '0' };
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

test.describe('SBH-3892 Retest: MEWS คิดคะแนนเมื่อ AVPU ได้ค่าจาก GCS (SBH Prod)', () => {
  test.describe.configure({ timeout: 900_000 });

  let opened: Map<string, ErVisit>;

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });

  test.afterEach(async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { page },
  ) => {
    if (process.env.SBH3892_KEEP) return;
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  async function waitFormReady(page: Page, visit: ErVisit) {
    const main = page.getByRole('main');
    for (let attempt = 1; attempt <= 4; attempt++) {
      const ready = await expect(erTriagePanel(page).getByRole('combobox', { name: 'Eye Opening (E)' }).first())
        .toBeVisible({ timeout: 60_000 })
        .then(() => true, () => false);
      if (ready && (await main.getByText('ไม่สามารถแสดงฟอร์มได้').count()) === 0) return;
      const retry = main.getByRole('button', { name: /ดาวน์โหลดอีกครั้ง/ });
      if (await retry.count()) {
        for (const button of await retry.all()) await button.click().catch(() => undefined);
        await page.waitForTimeout(5_000);
      } else {
        await gotoVisit(page, visit);
      }
    }
    throw new Error('ฟอร์มคัดกรอง ER โหลดไม่ครบหลังลอง 4 รอบ (ไม่สามารถแสดงฟอร์มได้)');
  }

  test('Retest SBH-3892: MEWS ไม่ค้าง Incomplete - AVPU หลัง GCS ตั้ง AVPU ให้เอง + บันทึกคัดกรองได้ (Super_User)', { tag: ['@SBH-3892'], annotation: [{ type: 'issue', description: 'https://linear.app/cortexcloud/issue/SBH-3892' }] }, async ({ page }) => {
    const run = makeRunner(page);
    const { note } = run;

    const visit = await checkStep(page, 'เตรียมข้อมูล: ผู้ป่วย AUTO ใหม่ + เปิด Visit ER', async () => {
      await gotoErDashboard(page);
      const patient = newTestPatient('SBH3892');
      const v = await registerAndOpenErVisit(page, patient);
      note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${v.hn} · ${v.vn} · ${v.en}`);
      return v;
    });
    await waitFormReady(page, visit);
    await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);

    const panel = erTriagePanel(page);
    // ช่อง AVPU เป็น <select> ไม่มีชื่อ (ป้าย "AVPU :" อยู่ข้างๆ ไม่ได้ผูกเป็น accessible name) — หาจาก select ตัวแรกหลังป้าย
    const avpu = panel.getByText('AVPU', { exact: false }).first().locator('xpath=following::select[1]');
    // แถบผล MEWS (กล่องสีเขียว/เหลือง/แดง "MEWS = n (...) ... Risk" หรือ "Incomplete - ...")
    const mewsStatus = panel.getByText(/^MEWS = \d|^Incomplete\s*-/).first();

    await checkStep(page, 'ขั้น 1 กรอกสัญญาณชีพให้ครบ (SBP 120 · PR 80 · RR 16 · Temp 37)', async () => {
      const fields: [string, string][] = [['Systolic', VITALS.systolic], ['Diastolic', VITALS.diastolic], ['PR', VITALS.pr], ['RR', VITALS.rr], ['Temp', VITALS.temp], ['SpO2', VITALS.spo2]];
      for (const [fieldName, value] of fields) await panel.getByRole('spinbutton', { name: fieldName }).first().fill(value);
      await markEvidence(filled(panel.getByRole('spinbutton', { name: 'RR' }).first(), `RR ${VITALS.rr}`));
    });

    const before = await avpu.evaluate((el) => {
      const s = el as HTMLSelectElement;
      return s.options[s.selectedIndex]?.text ?? '';
    });

    await checkStep(page, 'ขั้น 2 กรอก GCS E4 V5 M6 (15) — ดูว่า AVPU ได้ค่าจาก GCS เอง', async () => {
      for (const [gcsName, score] of [['Eye Opening (E)', '4'], ['Verbal Response (V)', '5'], ['Motor Response (M)', '6']] as const) {
        const select = panel.getByRole('combobox', { name: gcsName }).first();
        const label = (await select.locator('option').allTextContents()).find((t) => t.startsWith(`${score} `));
        if (!label) throw new Error(`ไม่เจอตัวเลือก GCS ${gcsName} คะแนน ${score}`);
        await select.selectOption({ label });
      }
      await expect.poll(async () => norm(await avpu.evaluate((el) => {
        const s = el as HTMLSelectElement;
        return s.options[s.selectedIndex]?.text ?? '';
      })), { timeout: 15_000 }).not.toBe(norm(before));
      const after = norm(await avpu.evaluate((el) => {
        const s = el as HTMLSelectElement;
        return s.options[s.selectedIndex]?.text ?? '';
      }));
      await markEvidence(expected(avpu, `AVPU ได้ค่าจาก GCS เอง = ${after}`));
    });

    await checkStep(page, 'ขั้น 3 (Expected) แถบผล MEWS ต้องคิดคะแนนรวมให้ — ไม่ค้าง Incomplete - AVPU / ไม่มี Partial score alert', async () => {
      await page.waitForTimeout(2_000);
      await expect(mewsStatus, 'ต้องมีแถบผล MEWS บนจอ').toBeVisible({ timeout: 15_000 });
      let text = norm(await mewsStatus.innerText());
      // SBH-1678 TC-019 (dev-x): บางรอบต้องเลือก "ชุดข้อมูลสัญญาณชีพ" (ฉบับร่าง) ก่อนคิดคะแนน — ลองเผื่อไว้
      const round = panel.locator('select').filter({ has: page.locator('option', { hasText: /Select a round|ฉบับร่าง|Draft/ }) }).first();
      if (/Incomplete/.test(text) && (await round.count())) {
        const label = (await round.locator('option').allTextContents()).find((t) => /ฉบับร่าง|Draft/.test(t));
        if (label) {
          await round.selectOption({ label });
          await expect.poll(async () => norm(await mewsStatus.innerText()), { timeout: 15_000 }).not.toMatch(/Incomplete/).catch(() => undefined);
          text = norm(await mewsStatus.innerText());
        }
      }
      const partialAlert = await page.getByText(/Partial score alert/i).count();
      note('แถบผล MEWS หลังกรอกครบ', text);
      note('Partial score alert (incomplete)', partialAlert ? 'ยังมี' : 'ไม่มี');
      await markEvidence(expected(mewsStatus, text));
      await snapEvidence(page, 'หลังกรอก GCS — แถบผล MEWS');
      expect(text, 'Expected: MEWS ต้องคิดคะแนนรวมให้ ไม่ค้าง Incomplete - AVPU').not.toMatch(/Incomplete.*AVPU|AVPU.*Incomplete/);
      expect(text, 'Expected: แถบผล MEWS ต้องมีคะแนนรวม (MEWS = …)').toMatch(/MEWS = \d/);
      expect(partialAlert, 'Expected: ต้องไม่มี Partial score alert (incomplete) ค้างอยู่').toBe(0);
    });

    await checkStep(page, 'ขั้น 4 เลือกระดับความเร่งด่วนแล้วบันทึกคัดกรอง — ต้องบันทึกได้ตามปกติ', async () => {
      const levels = panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }).first();
      await levels.scrollIntoViewIfNeeded();
      await levels.getByText('3', { exact: true }).click();
      const zones = panel.locator('[class*="er-triage-zone-options"] button');
      await expect(zones.and(page.locator('[aria-pressed="true"]')), 'ต้องมีโซนถูกเลือก').toHaveCount(1);
      const saveBtn = panel.getByRole('button', { name: 'save บันทึก' }).first();
      await markEvidence(clicked(saveBtn, 'บันทึกคัดกรอง ER'));
      await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรอง');
      await saveErTriageForm(page, 'บันทึกคัดกรอง ER');
      const toast = page.getByText('กรอกข้อมูล คัดกรอง ER สำเร็จ', { exact: true }).first();
      await toast.waitFor({ state: 'visible', timeout: 30_000 });
      await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
      await markEvidence(alerted(toast));
      await snapEvidence(page, 'หลังกด — บันทึกคัดกรองสำเร็จ');
      await expect(page.getByRole('main').getByText('Clinical Summary', { exact: true }), 'บันทึกแล้วหน้าต้องเปลี่ยนเป็น Overview').toBeVisible({ timeout: 60_000 });
    });
  });
});
