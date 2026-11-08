import fs from 'node:fs';
import type { Browser, Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectOk, gotoErDashboard, openTriagePage, type ErVisit } from '../../../helpers/functions/er';
import { createDialog, esiButton, fetchIncident, memberRow, openCreateIncident, selectMember, submitCreateIncident, type MciIncident, type MciMember } from '../../../helpers/functions/er-mass-casualty';
import { physicianNotePanel } from '../../../helpers/functions/er-physician-note';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriageLevel, erTriagePanel, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { checkStep, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, restartVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { recordNotices } from '../../../helpers/functions/notices';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { gotoVisit } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// SBH-3896 [Bug][ER] ER Form + ชื่อ Zone — AC 1 เอากรอบนอก "Diagnosis general" ออก คงกล่อง "Diagnosis" ด้านใน (ผู้ใช้ยืนยัน 8 พ.ย. — Prod รอบนี้ทำกลับด้าน = TC-001 Fail) · AC 2 ชื่อโซนคัดกรอง ER / Mass Casualty เหมือน Dev-X
// EXE SBH-3952 → HPY SBH-3953 (TC-001–006 = SBH-3954–3959) · SBH Prod (ผู้ใช้สั่ง 8 พ.ย. 2026 "ทดสอบบน Prod … สร้างคนไข้ตามที่ต้องใช้งานได้เลย" + ลงผล + ปรับสถานะ)
// 1 เทส = 1 flow (R9) · คลิป 1 ไฟล์ต่อ 1 TC (R61) · TC ที่ไม่ผ่านไม่หยุดเทส (soft)
//   A  @SBH-3896-A  ผู้ป่วย AUTO ใหม่ 1 ราย + Visit ER (Super_User แทนพยาบาล): TC-002 ปุ่มโซนฟอร์มคัดกรอง → TC-003 ESI 4 โซนแนะนำ (ยังไม่บันทึก)
//                   → บันทึกคัดกรอง ESI 4 (= ผู้ป่วย ER A) → TC-001 หน้าต่าง Doctor กด Patient Card → ER Physician Note ส่วน Diagnosis general (ไม่กรอก ไม่บันทึก)
//                   หลังเทสปิด Visit ที่การเงิน · SBH3896_KEEP=1 = ไม่ปิด · SBH3896_P=HN,VN,EN = ใช้ผู้ป่วยเดิม (คัดกรองแล้ว → เล่นแค่ TC-001)
//   B  @SBH-3896-B  เหตุการณ์ "SBH-3896 QA" จำนวนผู้ป่วย 2 (ระบบสร้างผู้ป่วยนิรนาม · ไม่ส่ง Triage): TC-004 แถบ ส่งเข้าโซน → TC-005 ทำต่อ > แถว 01 ปุ่มโซน
//                   → TC-006 ESI 4 → ป้ายโซนในแถว 01 · ท้ายเทสลบ member ทั้ง 2 ราย (DELETE …/members/<id>?expectedVersion= — แบบ SBH-2470 / 3609 บน Prod)
//                   SBH3896_MC_ID=<id> = ใช้เหตุการณ์เดิม · SBH3896_MC_KEEP=1 = ไม่ลบ member
// ชื่อโซน Dev-X (= Expected): ฟอร์มรายเดียว 5 โซน · หน้า MC ซ่อน Isolation 1 / 2 (SBH-3609) · Prod เปลี่ยนชื่อเป็นชุดนี้ตั้งแต่ 5 พ.ย. 2026 บ่าย (screens/sbh-prod.md)
// รัน: npm run card:prod -- --headed --grep "@SBH-3896-A( |$)"  แล้ว  "@SBH-3896-B( |$)"

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ISSUE = (n: number) => `SBH-${3953 + n}`;
const tcId = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const TC = (n: number) => `${tcId(n)} (${ISSUE(n)})`;
const meta = (key: string, ...tcs: number[]) => ({ tag: ['@SBH-3896', `@SBH-3896-${key}`, ...tcs.map((n) => `@${ISSUE(n)}`)], annotation: [linear('SBH-3896'), ...tcs.map((n) => linear(ISSUE(n)))] });

const ZONES_ALL = ['Resuscitation', 'Urgency', 'Isolation 1', 'Isolation 2', 'Observation'];
const ZONES_MC = ['Resuscitation', 'Urgency', 'Observation'];
const OLD_ALL = ['โซนแดง ER', 'โซนเหลือง ER', 'โซนเขียว ER', 'ห้องสังเกตอาการ ER'];
const OLD_MC = ['โซนแดง ER', 'โซนเหลือง ER', 'ห้องสังเกตอาการ ER'];
const OLD_RE = /โซนแดง ER|โซนเหลือง ER|โซนเขียว ER|ห้องสังเกตอาการ ER/;
const KNOWN = [...ZONES_ALL, ...OLD_ALL];
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const bad = (rows: CompareRow[]) => rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (Expected ${r.values[0]})`);
const TRIAGE_SAVED = 'กรอกข้อมูล คัดกรอง ER สำเร็จ';
const MC_NAME = 'SBH-3896 QA';

/** ข้อความปุ่มโซนในพื้นที่ → [{ name (ตัด "ใช้ n" / "แนะนำ"), raw }] เฉพาะปุ่มที่เป็นชื่อโซน (ชุดใหม่ + ชุดเก่า) */
async function zoneButtons(scope: Locator) {
  const texts = await scope.getByRole('button').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
  return texts
    .map((raw) => ({ raw, name: raw.replace(/\s*ใช้\s*\d+\s*$/, '').replace(/\s*แนะนำ\s*$/, '').replace(/\s*แนะนำ\s*/, ' ').trim() }))
    .filter((z) => KNOWN.includes(z.name));
}

/** ตารางเทียบ: ชื่อที่ต้องแสดง + ชื่อเก่าที่ต้องไม่แสดง */
function zoneRows(want: string[], old: string[], names: string[]): CompareRow[] {
  return [
    ...want.map((z) => ({ label: z, values: ['แสดง', names.includes(z) ? 'แสดง' : 'ไม่แสดง'], same: names.includes(z) })),
    ...old.map((z) => ({ label: z, values: ['ไม่แสดง', names.includes(z) ? 'แสดง' : 'ไม่แสดง'], same: !names.includes(z) })),
  ];
}

// หน้าต่างของบัญชีอื่น (context แยก · session .auth/<Role>.json · อัดวิดีโอ video-<Role>.webm) — แบบ SBH-2058
async function openRoleWindow(browser: Browser, role: 'Doctor'): Promise<Page> {
  const context = await browser.newContext({ storageState: authFile(role), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await cacheAppAssets(context);
  await context.addInitScript(recordNotices);
  const page = await context.newPage();
  await page.goto('/cortex/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await trackVideo(page, role);
  return page;
}

/** ER Dashboard → กด Patient Card (ข้อความ HN บนการ์ด) → รอหน้าผู้ป่วย */
async function clickPatientCard(page: Page, hn: string) {
  await gotoErDashboard(page);
  const target = page.getByRole('main').getByText(`HN: ${hn}`, { exact: true }).first();
  await expect(target, `ต้องเห็นการ์ดผู้ป่วย HN ${hn} บน ER Dashboard`).toBeVisible({ timeout: 60_000 });
  await target.scrollIntoViewIfNeeded();
  await restartVideo(page); // ตัดช่วงจอขาวตอนโหลดบอร์ดออกจากคลิป
  await markEvidence(clicked(target, 'Patient Card'));
  await snapEvidence(page, `ก่อนกด — Patient Card ${hn}`);
  await clearEvidenceMarks(page);
  await target.click();
  await expect(page.getByRole('main').getByText(`HN ${hn}`, { exact: true }).first(), 'ต้องเปิดหน้าผู้ป่วย').toBeVisible({ timeout: 90_000 });
}

/** แถบ "ส่งเข้าโซน" ของหน้า MC (div ชั้นในสุดที่มีทั้ง checkbox เลือกทั้งหมด และคำว่า ส่งเข้าโซน) — จาก spec SBH-3609 */
const sendZoneBar = (page: Page) =>
  page.getByRole('main').locator('div').filter({ has: page.getByRole('checkbox', { name: 'เลือกทั้งหมด' }) }).filter({ has: page.getByText('ส่งเข้าโซน', { exact: true }) }).last();
/** กลุ่มปุ่มโซนในฟอร์มขวาของหน้า MC (แม่ของปุ่ม Resuscitation ตัวสุดท้าย) */
const formZoneGroup = (page: Page) => page.getByRole('main').getByRole('button', { name: /^(Resuscitation|โซนแดง ER)(\s*แนะนำ)?$/ }).last().locator('xpath=..');

/** รอการลงทะเบียนของเหตุการณ์จบ แล้วคืน member เรียงตามลำดับ */
async function waitRegistration(page: Page, authorization: () => string, id: string): Promise<MciIncident> {
  let incident: MciIncident | undefined;
  if (!page.url().startsWith('http')) await gotoErDashboard(page);
  await expect
    .poll(async () => {
      incident = await fetchIncident(page, authorization, id);
      return `${incident.registration?.status ?? 'NONE'} ${incident.members.length}`;
    }, { message: 'การลงทะเบียนของเหตุการณ์ต้องจบ', timeout: 120_000, intervals: [1_000] })
    .toMatch(/^(FINISHED|FAILED|NONE) /);
  return incident!;
}
const bySeq = (members: MciMember[]) => [...members].filter((m) => m.registrationSeq !== null).sort((a, b) => (a.registrationSeq ?? 0) - (b.registrationSeq ?? 0));

test.describe('SBH-3896 ER Form + ชื่อ Zone (SBH Prod)', () => {
  test.describe.configure({ timeout: 1_800_000 });

  // ================================================================================================
  test('A: TC-002 ปุ่มโซนฟอร์มคัดกรอง · TC-003 โซนแนะนำ ESI 4 · TC-001 ER Physician Note ไม่มีกรอบ Diagnosis ซ้อน (Super_User + Doctor)', meta('A', 2, 3, 1), async ({ page, browser }) => {
    const { note, soft, finish } = makeRunner(page);
    const windows: Page[] = [];
    const reuse = process.env.SBH3896_P?.split(',');
    let visit: ErVisit;
    let made: ErVisit | undefined; // ผู้ป่วยที่ต้องปิด Visit ท้ายเทส
    let closeAtEnd = !process.env.SBH3896_KEEP;
    try {
      if (reuse?.length === 3) {
        visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] } as ErVisit;
        closeAtEnd = closeAtEnd && !!process.env.SBH3896_CLOSE_REUSED;
        made = visit;
        note('ผู้ป่วย', `ใช้รายเดิม HN ${visit.hn} · ${visit.vn} · ${visit.en} (คัดกรองแล้ว → เล่น TC-001)`);
      } else {
        visit = await checkStep(page, 'เตรียมข้อมูล: ผู้ป่วย AUTO ใหม่ + เปิด Visit ER (ยังไม่คัดกรอง = ผู้ป่วย ER B)', async () => {
          await gotoErDashboard(page);
          const patient = newTestPatient('Zn3896');
          const v = await registerAndOpenErVisit(page, patient);
          note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${v.hn} · ${v.vn} · ${v.en} · ใช้ซ้ำ: SBH3896_P=${v.hn},${v.vn},${v.en}`);
          console.log(`    ผู้ป่วย: HN ${v.hn} · ${v.vn} · ${v.en}`);
          made = v;
          return v;
        });
        await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);

        // ─── TC-002 ปุ่มโซนในฟอร์มคัดกรอง ER (Test Step: ER Dashboard > Patient Card > แท็บ คัดกรอง ER > ส่วนโซน)
        const panel = erTriagePanel(page);
        const zones = panel.locator('[class*="er-triage-zone-options"]').first();
        await startClip(page, tcId(2));
        await soft(`${TC(2)} ขั้น 1-2 ห้องฉุกเฉิน > กด Patient Card ของผู้ป่วยที่ยังไม่คัดกรอง (HN ${visit.hn}) > ฟอร์ม "คัดกรอง ER"`, async () => {
          await clickPatientCard(page, visit.hn);
          // Prod 8 พ.ย. 2026: ฟอร์มคัดกรองโหลดเกิน 30 วิ (ระบบเปิดแท็บ คัดกรอง ER ให้เอง) → รอเฉยๆ ไม่กดแท็บซ้ำ
          await expect(zones, 'ฟอร์มคัดกรอง ER ต้องมีส่วนโซน').toBeVisible({ timeout: 150_000 });
          await page.waitForTimeout(2_000);
          await markEvidence(expected(page.getByRole('main').getByRole('heading', { name: /คัดกรอง ER/ }).first(), 'ฟอร์มคัดกรอง ER'));
        });
        await soft(`${TC(2)} ขั้น 3 ส่วน "โซน" ใต้ระดับความเร่งด่วน: ${ZONES_ALL.join(' · ')} (มี "ใช้ n") · ไม่มีชื่อโซนแบบเดิม`, async () => {
          await clearEvidenceMarks(page);
          await zones.scrollIntoViewIfNeeded();
          const btns = await zoneButtons(zones);
          const names = btns.map((b) => b.name);
          const oldInPanel = await panel.getByText(OLD_RE).count();
          const rows: CompareRow[] = [
            ...zoneRows(ZONES_ALL, OLD_ALL, names),
            { label: 'ลำดับปุ่ม', values: [ZONES_ALL.join(' · '), names.join(' · ')], same: names.join('|') === ZONES_ALL.join('|') },
            { label: 'มี "ใช้ n" ต่อท้าย', values: ['ทุกปุ่ม', btns.filter((b) => /ใช้\s*\d+$/.test(b.raw)).length + '/' + btns.length], same: btns.length > 0 && btns.every((b) => /ใช้\s*\d+$/.test(b.raw)) },
          ];
          note(`${TC(2)} ข้อความปุ่มโซน`, btns.map((b) => b.raw).join(' | ') + ` · ชื่อเก่าในฟอร์ม ${oldInPanel}`);
          await showCompareTable(page, `${ISSUE(2)} ${tcId(2)} ปุ่มโซน ฟอร์มคัดกรอง ER`, ['Expected', 'หน้าจอ'], rows, { side: 'left', width: '560px' });
          await markEvidence(expected(zones, `โซน: ${names.join(' · ')}`));
          expect(bad(rows), `Expected: ปุ่มโซน ${ZONES_ALL.join(' · ')} ไม่มีชื่อเดิม`).toEqual([]);
          expect(oldInPanel, 'ฟอร์มคัดกรองต้องไม่มีชื่อโซนแบบเดิม').toBe(0);
        });
        await hideCompareTable(page);

        // ─── TC-003 เลือก ESI 4 → โซนแนะนำ
        await clearEvidenceMarks(page);
        await startClip(page, tcId(3));
        const levels = panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }).first();
        await soft(`${TC(3)} ขั้น 3 ระดับความเร่งด่วน เลือก 4 กึ่งเร่งด่วน`, async () => {
          await levels.scrollIntoViewIfNeeded();
          const four = levels.getByText('4', { exact: true });
          await markEvidence(clicked(four, '4 กึ่งเร่งด่วน'));
          await snapEvidence(page, 'ก่อนกด — ระดับความเร่งด่วน 4');
          await clearEvidenceMarks(page);
          await four.click();
          await expect(erTriageLevel(page, 4), 'ระดับความเร่งด่วนต้องเป็น 4').toBeChecked();
          await markEvidence(filled(levels.getByText('4', { exact: true }), '4 กึ่งเร่งด่วน'));
        });
        await soft(`${TC(3)} ขั้น 4 ปุ่ม Urgency มีป้าย "แนะนำ" · ข้อความใต้ปุ่มโซน "แนะนำ: Urgency"`, async () => {
          await clearEvidenceMarks(page);
          const hint = panel.getByText(/^\s*แนะนำ\s*:/).first();
          await expect(hint, 'ต้องมีข้อความ แนะนำ: … ใต้ปุ่มโซน').toBeVisible({ timeout: 20_000 });
          await zones.scrollIntoViewIfNeeded();
          const hintText = norm(await hint.innerText());
          const btns = await zoneButtons(zones);
          const recommended = btns.filter((b) => /แนะนำ/.test(b.raw)).map((b) => b.name);
          const rows: CompareRow[] = [
            { label: 'ปุ่มที่มีป้าย แนะนำ', values: ['Urgency', recommended.join(' · ') || '(ไม่มี)'], same: recommended.length === 1 && recommended[0] === 'Urgency' },
            { label: 'ข้อความใต้ปุ่มโซน', values: ['แนะนำ: Urgency', hintText], same: /^แนะนำ\s*:\s*Urgency$/.test(hintText) },
            { label: 'ชื่อเดิม โซนเหลือง ER', values: ['ไม่แสดง', (await panel.getByText(OLD_RE).count()) ? 'แสดง' : 'ไม่แสดง'], same: (await panel.getByText(OLD_RE).count()) === 0 },
          ];
          note(`${TC(3)} ข้อความปุ่มโซนหลังเลือก ESI 4`, btns.map((b) => b.raw).join(' | ') + ` · ${hintText}`);
          await showCompareTable(page, `${ISSUE(3)} ${tcId(3)} โซนแนะนำ ESI 4`, ['Expected', 'หน้าจอ'], rows, { side: 'left', width: '560px' });
          const urgency = zones.getByRole('button', { name: /^Urgency/ }).first();
          await markEvidence(expected(urgency, 'Urgency แนะนำ'), expected(hint, hintText));
          expect(bad(rows), 'Expected: Urgency แนะนำ · แนะนำ: Urgency').toEqual([]);
        });
        await hideCompareTable(page);
        await clearEvidenceMarks(page);

        // ─── เตรียมผู้ป่วย ER A: บันทึกคัดกรอง ESI 4
        await startClip(page, 'prep-triage');
        await checkStep(page, 'เตรียมข้อมูล: บันทึกคัดกรอง ESI 4 (ผู้ป่วยรายนี้ = ผู้ป่วย ER A ของ TC-001)', async () => {
          await fillErTriageForm(page, { level: 4, vitals: { systolic: '120', diastolic: '80', pr: '80', rr: '20', temp: '37', spo2: '98', painScore: '0' } });
          await saveErTriageForm(page, 'บันทึกคัดกรอง ER');
          await expect(page.getByText(TRIAGE_SAVED, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
        });
      }

      // ─── TC-001 หน้าต่าง Doctor: ER Physician Note ส่วน Diagnosis general
      const doc = await openRoleWindow(browser, 'Doctor');
      windows.push(doc);
      const d = makeRunner(doc);
      await startClip(doc, tcId(1));
      const pn = physicianNotePanel(doc);
      const dxTitle = pn.getByText('Diagnosis general', { exact: true }).first();
      const dxRow = pn.locator('[data-dx-index="0"]').filter({ visible: true }).first();
      await d.soft(`${TC(1)} ขั้น 1-3 แพทย์ (Doctor) ห้องฉุกเฉิน > กด Patient Card HN ${visit.hn} > ฟอร์ม ER Physician Note`, async () => {
        await clickPatientCard(doc, visit.hn);
        await expect(pn.getByRole('heading', { name: 'ER Physician Note', exact: true }), 'แผงขวาต้องมีหัว ER Physician Note').toBeVisible({ timeout: 120_000 });
        await expect(dxTitle, 'ต้องมีส่วน Diagnosis general').toBeVisible({ timeout: 120_000 });
        await expect(dxRow, 'ส่วน Diagnosis general ต้องโหลดแถวรายการ').toBeVisible({ timeout: 120_000 });
        await doc.waitForTimeout(3_000);
        await markEvidence(expected(pn.getByRole('heading', { name: 'ER Physician Note', exact: true }), 'ER Physician Note'));
      });
      await d.soft(`${TC(1)} ขั้น 4 ส่วน "Diagnosis general": รายการอยู่ใต้หัวโดยตรง ไม่มีกล่อง "Diagnosis" ครอบอีกชั้น · ช่องในแถว / ปุ่มลบ / + เพิ่มรายการ ครบ`, async () => {
        await clearEvidenceMarks(doc);
        await dxTitle.scrollIntoViewIfNeeded();
        await doc.mouse.wheel(0, 120);
        await doc.waitForTimeout(800);
        // ส่วน = div ชั้นในสุดที่มีทั้งหัว Diagnosis general และแถวรายการ
        const section = pn.locator('div').filter({ has: doc.getByText('Diagnosis general', { exact: true }) }).filter({ has: doc.locator('[data-dx-index="0"]') }).last();
        fs.writeFileSync(test.info().outputPath('dx-section.html'), await section.evaluate((el) => el.outerHTML).catch((e) => String(e)));
        // หัวกล่องชั้นใน (รูป 1 ในการ์ด: แถบเทา "Diagnosis" เหนือแถว) = ข้อความตรง "Diagnosis" ที่อยู่นอกแถวรายการ
        // (Prod 8 พ.ย. 2026: ในแถวมีป้ายคอลัมน์ "Diagnosis *" เหนือช่องกรอก — ไม่ใช่กล่องครอบ ไม่นับ)
        const innerCount = await section.evaluate((root) => {
          let n = 0;
          const walk = (scope: Element | ShadowRoot) => {
            for (const el of Array.from(scope.querySelectorAll('*'))) {
              const own = Array.from(el.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent ?? '').join('').trim();
              const box = (el as HTMLElement).getBoundingClientRect?.();
              if (own === 'Diagnosis' && box && box.width > 0 && !el.closest('[data-dx-index]')) n++;
              if ((el as HTMLElement).shadowRoot) walk((el as HTMLElement).shadowRoot!);
            }
          };
          walk(root);
          return n;
        });
        // ชั้นของกรอบ: ไล่จากแถว ขึ้นไปจนถึงส่วน นับ element ที่มีเส้นขอบรอบด้าน
        const frames = await dxRow.evaluate((row) => {
          const out: string[] = [];
          let el: Element | null = row.parentElement;
          for (let i = 0; el && i < 15; i++) {
            const text = el.textContent ?? '';
            const cs = getComputedStyle(el);
            const bordered = ['Top', 'Right', 'Bottom', 'Left'].every((s) => parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) > 0 && cs.getPropertyValue(`border-${s.toLowerCase()}-style`) !== 'none');
            if (bordered) out.push(`${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(/\s+/).slice(0, 2).join('.')}${text.includes('Diagnosis general') ? ' [มีหัว Diagnosis general]' : ''}`);
            if (text.includes('Diagnosis general')) break;
            el = el.parentElement ?? ((el.getRootNode() as ShadowRoot).host ?? null);
          }
          return out;
        });
        const labels = await section.evaluate((root) => {
          const got = new Set<string>();
          const walk = (n: Element | ShadowRoot) => {
            for (const el of Array.from(n.querySelectorAll('*'))) {
              for (const a of ['placeholder', 'aria-label', 'title']) if (el.getAttribute(a)) got.add(el.getAttribute(a)!.trim());
              if (el.children.length === 0 && el.textContent?.trim()) got.add(el.textContent.trim());
              if ((el as HTMLElement).shadowRoot) walk((el as HTMLElement).shadowRoot!);
            }
          };
          walk(root);
          return [...got];
        });
        const has = (re: RegExp) => labels.some((l) => re.test(l));
        const del = dxRow.getByRole('button', { name: /remove diagnosis/ });
        const add = section.getByText(/เพิ่มรายการ/).filter({ visible: true }).first();
        // Expected ฉบับแก้ 8 พ.ย. 2026 (ผู้ใช้ยืนยัน): ต้องเอา "กรอบนอก Diagnosis general" ออก (ant-collapse-item ของ occurrence ฟอร์ม: หัว + ⋮ / ยุบ-ขยาย)
        // และคงกล่อง "Diagnosis" ด้านใน (หัว "Diagnosis" เหนือแถวรายการ) · ช่องในแถวรุ่นปัจจุบัน = ค้นหา ICD-10 / Diagnosis / Principal / Confirm / Severity / Onset — ไม่มี Category
        // Prod 8 พ.ย. (index-BVfsMIKN.js) ทำกลับด้าน → TC-001 Fail + การ์ดบั๊ก Sub-Issue ใต้ SBH-3896 (decisions R176)
        const outerFrame = await pn.locator('.ant-collapse-item').filter({ has: doc.getByText('Diagnosis general', { exact: true }) }).count();
        d.note(`${TC(1)} กรอบซ้อนระหว่างหัวกับแถว`, frames.filter((f) => !f.includes('[มีหัว Diagnosis general]')).join(' › ') || '(ไม่มี)');
        const rows: CompareRow[] = [
          { label: 'กรอบนอก "Diagnosis general" (หัว + ⋮ / ยุบ-ขยาย)', values: ['ไม่มี', outerFrame ? 'มี' : 'ไม่มี'], same: outerFrame === 0 },
          { label: 'กล่อง "Diagnosis" ด้านใน (หัว Diagnosis)', values: ['มี', innerCount ? 'มี' : 'ไม่มี'], same: innerCount > 0 },
          { label: 'ค้นหา ICD-10', values: ['แสดง', has(/^ค้นหา ICD-10/) ? 'แสดง' : 'ไม่แสดง'], same: false },
          { label: 'Diagnosis', values: ['แสดง', has(/^Diagnosis$/) ? 'แสดง' : 'ไม่แสดง'], same: false },
          { label: 'Principal (ประเภท)', values: ['แสดง', has(/^Principal$/) && has(/^ประเภท$/) ? 'แสดง' : 'ไม่แสดง'], same: false },
          { label: 'Confirm (Status)', values: ['แสดง', has(/^Confirm$/) && has(/^Status$/) ? 'แสดง' : 'ไม่แสดง'], same: false },
          { label: 'Severity', values: ['แสดง', has(/^Severity$/) ? 'แสดง' : 'ไม่แสดง'], same: false },
          { label: 'Onset', values: ['แสดง', has(/^Onset$/) ? 'แสดง' : 'ไม่แสดง'], same: false },
          { label: 'ปุ่มลบในแถว', values: ['แสดง', (await del.count()) > 0 ? 'แสดง' : 'ไม่แสดง'], same: false },
          { label: '+ เพิ่มรายการ', values: ['แสดง', (await add.count()) > 0 ? 'แสดง' : 'ไม่แสดง'], same: false },
        ].map((r, i) => ({ ...r, same: i <= 1 ? r.same : r.values[1] === 'แสดง' }));
        d.note(`${TC(1)} กรอบรอบแถว Diagnosis (จากแถวขึ้นไปถึงส่วน)`, frames.join(' › ') || '(ไม่มี)');
        d.note(`${TC(1)} ข้อความ / placeholder ในส่วน`, labels.slice(0, 60).join(' | '));
        await showCompareTable(doc, `${ISSUE(1)} ${tcId(1)} ส่วน Diagnosis general`, ['Expected', 'หน้าจอ'], rows, { side: 'left', width: '560px' });
        // ป้ายแบบ <ที่ต้องการ> · จริง: <ที่เห็น> (expected() เติม "Expected:" ให้เอง)
        await markEvidence(
          expected(dxTitle, `ไม่มีกรอบนอก Diagnosis general · จริง: ${outerFrame ? 'ยังมี' : 'ไม่มี'}`),
          expected(dxRow, `คงกล่อง Diagnosis · จริง: ${innerCount ? 'มีหัว Diagnosis' : 'ไม่มีหัว Diagnosis'}`),
          ...((await add.count()) ? [expected(add)] : []),
        );
        expect(bad(rows), 'Expected: ไม่มีกรอบนอก Diagnosis general · คงกล่อง Diagnosis ด้านใน · ช่อง / ปุ่มครบ').toEqual([]);
      });
      await hideCompareTable(doc);
      await startClip(doc, 'after');
      d.finish();
      finish();
    } finally {
      for (const w of windows) {
        await finishVideo(w).catch(() => undefined);
        await w.context().close().catch(() => undefined);
      }
      await hideCompareTable(page).catch(() => undefined);
      const v = made;
      if (v && closeAtEnd) {
        await startClip(page, 'cleanup').catch(() => undefined);
        const result = await closeVisitAtCashier(page, v.hn, v.vn).then(
          (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
          (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
        );
        test.info().annotations.push({ type: 'หลังเทส', description: `HN ${v.hn} · ${v.vn} · ${v.en}: ${result}` });
        console.log(`    หลังเทส: HN ${v.hn} · ${v.vn} · ${v.en}: ${result}`);
      } else if (v) console.log(`    หลังเทส: ไม่ปิด Visit (KEEP / ใช้รายเดิม) — SBH3896_P=${v.hn},${v.vn},${v.en}`);
    }
  });

  // ================================================================================================
  // เก็บกวาดแยก: SBH3896_CLOSE="HN,VN;HN,VN" = ปิด Visit ที่การเงิน · SBH3896_MC_DEL=<id> = ลบ member ทุกรายของเหตุการณ์
  test('CLOSE: ปิด Visit ผู้ป่วย AUTO / ลบ member เหตุการณ์ของรอบก่อน (Super_User)', { tag: ['@SBH-3896-CLOSE'] }, async ({ page }) => {
    const authorization = trackAuthorization(page);
    for (const pair of (process.env.SBH3896_CLOSE ?? '').split(';').filter(Boolean)) {
      const [hn, vn] = pair.split(',');
      const result = await closeVisitAtCashier(page, hn, vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      console.log(`    HN ${hn} · ${vn}: ${result}`);
      test.info().annotations.push({ type: 'เก็บกวาด', description: `HN ${hn} · ${vn}: ${result}` });
    }
    const id = process.env.SBH3896_MC_DEL;
    if (id) {
      await gotoErDashboard(page);
      const now = await fetchIncident(page, authorization, id);
      for (const m of now.members) {
        const res = await page.request.delete(`/cortex-api/er/mass-casualty-incidents/${id}/members/${m.id}?expectedVersion=${m.version}`, { headers: { authorization: authorization() } });
        console.log(`    ลบ member HN ${m.hn} · ${m.en}: ${res.status()}`);
        test.info().annotations.push({ type: 'เก็บกวาด', description: `ลบ member HN ${m.hn} · ${m.en}: ${res.status()}` });
      }
    }
  });

  // ================================================================================================
  test('B: TC-004 แถบ ส่งเข้าโซน · TC-005 ปุ่มโซนฟอร์มผู้ป่วย MC · TC-006 ป้ายโซนในแถวผู้ป่วย (Super_User)', meta('B', 4, 5, 6), async ({ page }) => {
    const main = page.getByRole('main');
    const authorization = trackAuthorization(page);
    const { note, soft, finish } = makeRunner(page);
    let id = process.env.SBH3896_MC_ID ?? '';
    let incident: MciIncident | undefined;
    try {
      // ─── TC-004 สร้างเหตุการณ์ N=2 → แถบ ส่งเข้าโซน
      await startClip(page, tcId(4));
      if (!id) {
        id = await checkStep(page, `${TC(4)} ขั้น 1-2 คัดกรอง > แท็บ ผู้ป่วยหลายคน > สร้างเหตุการณ์ "${MC_NAME}" จำนวนผู้ป่วย 2 > เข้าหน้าเหตุการณ์`, async () => {
          const { dialog, count } = await openCreateIncident(page, { name: MC_NAME, location: 'ถนนพหลโยธิน กม. 108', chiefComplaint: 'อุบัติเหตุรถชน (ทดสอบ)', headcount: 2 });
          await markEvidence(filled(dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ }), MC_NAME), filled(count, 'จำนวนผู้ป่วย 2'), clicked(dialog.getByRole('button', { name: 'สร้าง', exact: true })));
          await snapEvidence(page, 'ก่อนกด — สร้างเหตุการณ์');
          await clearEvidenceMarks(page);
          const r = await submitCreateIncident(page, createDialog(page));
          return r.id;
        });
      } else await page.goto(`/cortex/er/triage?mode=mass-casualty&incidentId=${id}`);
      incident = await waitRegistration(page, authorization, id);
      const [m1, m2] = bySeq(incident.members);
      note('เหตุการณ์', `${incident.displayCode} · ${incident.name} · id ${id} · รายที่ 1 HN ${m1?.hn} ${m1?.en} · รายที่ 2 HN ${m2?.hn} ${m2?.en} · ใช้ซ้ำ: SBH3896_MC_ID=${id}`);
      console.log(`    เหตุการณ์ ${incident.displayCode} id ${id} · HN ${m1?.hn} / ${m2?.hn}`);
      expect(m1 && m2, 'เหตุการณ์ต้องมีผู้ป่วยที่ระบบสร้าง 2 ราย').toBeTruthy();
      await expect(memberRow(page, m2.hn)).toBeVisible({ timeout: 60_000 });

      await soft(`${TC(4)} ขั้น 3 แถบ "ส่งเข้าโซน" ใต้ "เลือกทั้งหมด" = ${ZONES_MC.join(' · ')} · ไม่มีชื่อโซนแบบเดิม`, async () => {
        const bar = sendZoneBar(page);
        await expect(bar).toBeVisible({ timeout: 30_000 });
        const names = (await zoneButtons(bar)).map((b) => b.name);
        const rows: CompareRow[] = [...zoneRows(ZONES_MC, OLD_MC, names), { label: 'ลำดับปุ่ม', values: [ZONES_MC.join(' · '), names.join(' · ')], same: names.join('|') === ZONES_MC.join('|') }];
        note(`${TC(4)} ปุ่มในแถบ ส่งเข้าโซน`, names.join(' · '));
        await showCompareTable(page, `${ISSUE(4)} ${tcId(4)} แถบ ส่งเข้าโซน`, ['Expected', 'หน้าจอ'], rows, { side: 'right', width: '560px' });
        await markEvidence(expected(bar, `ส่งเข้าโซน: ${names.join(' · ')}`));
        expect(bad(rows), `Expected: แถบส่งเข้าโซน ${ZONES_MC.join(' · ')}`).toEqual([]);
      });
      await hideCompareTable(page);
      await clearEvidenceMarks(page);

      // ─── TC-005 รายการเหตุการณ์ > ทำต่อ > แถว 01 > ปุ่มโซนในฟอร์มขวา
      await startClip(page, tcId(5));
      await soft(`${TC(5)} ขั้น 1-2 คัดกรอง > แท็บ ผู้ป่วยหลายคน > เหตุการณ์ ${incident.displayCode} กด "ทำต่อ"`, async () => {
        await gotoErDashboard(page);
        await openTriagePage(page);
        await page.getByRole('tab', { name: 'ผู้ป่วยหลายคน' }).click();
        const item = main.getByRole('listitem').filter({ hasText: incident!.displayCode }).first();
        await expect(item, `รายการเหตุการณ์ต้องมี ${incident!.displayCode}`).toBeVisible({ timeout: 30_000 });
        await restartVideo(page);
        const open = item.getByRole('button', { name: 'ทำต่อ' });
        await markEvidence(expected(item.getByRole('heading').first(), incident!.displayCode), clicked(open, 'ทำต่อ'));
        await snapEvidence(page, `ก่อนกด — ทำต่อ ${incident!.displayCode}`);
        await clearEvidenceMarks(page);
        await open.click();
        await expect(page).toHaveURL(new RegExp(`incidentId=${id}`), { timeout: 30_000 });
        await expect(memberRow(page, m1.hn)).toBeVisible({ timeout: 60_000 });
        await markEvidence(expected(main.getByText(incident!.displayCode, { exact: false }).first(), 'เหตุการณ์จาก TC-004'));
      });
      await soft(`${TC(5)} ขั้น 3 กดแถวผู้ป่วยรายที่ 01 (HN ${m1.hn}) > ฟอร์มผู้ป่วยด้านขวา`, async () => {
        await clearEvidenceMarks(page);
        await selectMember(page, m1.hn);
        await markEvidence(clicked(memberRow(page, m1.hn).getByRole('heading').first(), 'แถว 01'), expected(main.getByText(`HN ${m1.hn}`, { exact: true }).last(), 'ฟอร์มรายที่ 01'));
      });
      await soft(`${TC(5)} ขั้น 4 ส่วน "โซน" ในฟอร์มผู้ป่วย = ${ZONES_MC.join(' · ')} · ไม่มีชื่อโซนแบบเดิม`, async () => {
        await clearEvidenceMarks(page);
        const group = formZoneGroup(page);
        await group.scrollIntoViewIfNeeded();
        const names = (await zoneButtons(group)).map((b) => b.name);
        const oldAll = await main.getByRole('button', { name: OLD_RE }).count();
        const rows: CompareRow[] = [...zoneRows(ZONES_MC, OLD_MC, names), { label: 'ลำดับปุ่ม', values: [ZONES_MC.join(' · '), names.join(' · ')], same: names.join('|') === ZONES_MC.join('|') }];
        note(`${TC(5)} ปุ่มโซนในฟอร์ม`, `${names.join(' · ')} · ปุ่มชื่อเดิมทั้งหน้า ${oldAll}`);
        await showCompareTable(page, `${ISSUE(5)} ${tcId(5)} ปุ่มโซนในฟอร์มผู้ป่วย`, ['Expected', 'หน้าจอ'], rows, { side: 'left', width: '520px' });
        await markEvidence(expected(group, `โซน: ${names.join(' · ')}`));
        expect(bad(rows), `Expected: ปุ่มโซน ${ZONES_MC.join(' · ')}`).toEqual([]);
        expect(oldAll, 'หน้าเหตุการณ์ต้องไม่มีปุ่มชื่อโซนแบบเดิม').toBe(0);
      });
      await hideCompareTable(page);
      await clearEvidenceMarks(page);

      // ─── TC-006 ESI 4 → ป้ายโซนในแถว 01
      await startClip(page, tcId(6));
      await soft(`${TC(6)} ขั้น 2 ระดับความเร่งด่วน เลือก 4 กึ่งเร่งด่วน (ฟอร์มรายที่ 01)`, async () => {
        const four = esiButton(page, 4);
        await four.scrollIntoViewIfNeeded();
        await markEvidence(clicked(four, '4 กึ่งเร่งด่วน'));
        await snapEvidence(page, 'ก่อนกด — ESI 4 รายที่ 01');
        await clearEvidenceMarks(page);
        if ((await four.getAttribute('aria-pressed')) !== 'true') await four.click();
        await expect(four).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });
        await markEvidence(filled(four, '4 กึ่งเร่งด่วน'));
      });
      await soft(`${TC(6)} ขั้น 3 ป้ายโซนในแถวผู้ป่วยรายที่ 01 ด้านซ้าย = "Urgency" (ไม่ใช่ "โซนเหลือง ER")`, async () => {
        await clearEvidenceMarks(page);
        const row = memberRow(page, m1.hn);
        await row.scrollIntoViewIfNeeded();
        const badge = row.getByText(new RegExp(`^(${KNOWN.map((z) => z.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`)).first();
        await expect(badge, 'แถวรายที่ 01 ต้องมีป้ายโซน').toBeVisible({ timeout: 30_000 });
        await expect.poll(async () => norm(await badge.innerText()), { timeout: 20_000 }).not.toBe('');
        await page.waitForTimeout(1_500);
        const text = norm(await badge.innerText());
        const rowText = norm(await row.innerText());
        const rows: CompareRow[] = [
          { label: 'ป้ายโซนแถว 01', values: ['Urgency', text], same: text === 'Urgency' },
          { label: 'ชื่อเดิม โซนเหลือง ER ในแถว', values: ['ไม่แสดง', OLD_RE.test(rowText) ? 'แสดง' : 'ไม่แสดง'], same: !OLD_RE.test(rowText) },
        ];
        note(`${TC(6)} ข้อความแถว 01`, rowText);
        await showCompareTable(page, `${ISSUE(6)} ${tcId(6)} ป้ายโซนในแถวผู้ป่วย`, ['Expected', 'หน้าจอ'], rows, { side: 'right', width: '560px' });
        await markEvidence(expected(badge, `ป้ายโซน ${text}`));
        expect(bad(rows), 'Expected: ป้ายโซนแถว 01 = Urgency').toEqual([]);
      });
      await hideCompareTable(page);
      await startClip(page, 'after');
      finish();
    } finally {
      await hideCompareTable(page).catch(() => undefined);
      // ล้างผู้ป่วยนิรนามของเหตุการณ์ (แบบ SBH-2470 / 3609 บน Prod) · เหตุการณ์ค้างในรายการเป็น DRAFT ไม่มีผู้ป่วย
      if (id && !process.env.SBH3896_MC_KEEP) {
        const now = await fetchIncident(page, authorization, id).catch(() => undefined);
        for (const m of now?.members ?? []) {
          const res = await page.request.delete(`/cortex-api/er/mass-casualty-incidents/${id}/members/${m.id}?expectedVersion=${m.version}`, { headers: { authorization: authorization() } });
          const line = `ลบ member HN ${m.hn} · ${m.en}: ${res.status()}`;
          test.info().annotations.push({ type: 'หลังเทส', description: line });
          console.log(`    หลังเทส: ${line}`);
        }
      }
    }
  });
});
