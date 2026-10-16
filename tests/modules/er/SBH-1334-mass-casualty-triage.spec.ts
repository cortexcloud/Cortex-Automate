import fs from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { confirmOpenErVisit, dismissToast, expectOk, gotoErDashboard, openTriagePage, openVisitDialog, type ErVisit } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { ESI_BUTTON, triageForm } from '../../../helpers/functions/er-triage';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { newTestPatient, type NewPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { COVERAGE_UC, SYSTEM, recordMockPatient } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, fillTriage, pick } from '../../../mock-data/uat-play';

// SBH-1334 [ER][Triage] Triage ผู้ป่วยหลายคน / อุบัติเหตุหมู่ — ชุด EXE SBH-1823: TC-001 SBH-1828 … TC-007 SBH-1834 (flow ต่อเนื่อง 1 เทส R9)
// เหตุการณ์ 1 รายการ · ผู้ป่วย 3 ราย: P1 ผู้ป่วยใหม่ไม่มี HN (ESI 2 → โซนแดง) · P2 ผู้ป่วยระบุตัวตนไม่ได้ (ESI 3 → โซนเหลือง) · P3 ผู้ป่วยใหม่ไม่มี HN (ESI 5 → โซนเขียว)
// Visit ER สิทธิ UC ทิ้งไว้ (ผู้ใช้เลือก 16 ต.ค. 2026) · จดเหตุการณ์ + ผู้ป่วยลง .cache/sbh-1334-<ระบบ>.json → SBH1334_RESUME=1 ทำต่อกับชุดเดิม (ไม่สร้างผู้ป่วยเพิ่ม)
// ฟอร์มของสมาชิกในเหตุการณ์โหลด draft ตามหลังแล้วล้างค่าที่เพิ่งกรอก (dev-x 16 ต.ค. 2026) → กรอกซ้ำจนปุ่มพร้อมส่งกดได้ และตรวจ READY หลังกดทุกครั้ง (จดจำนวนรอบเป็นข้อสังเกต)
// รัน (SBH Prod): npx playwright test -c playwright.sbh-prod.cards.config.ts --headed --grep "@SBH-1334" --output=test-results-sbh-1334

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC = {
  1: 'TC-001 (SBH-1828)',
  2: 'TC-002 (SBH-1829)',
  3: 'TC-003 (SBH-1830)',
  4: 'TC-004 (SBH-1831)',
  5: 'TC-005 (SBH-1832)',
  6: 'TC-006 (SBH-1833)',
  7: 'TC-007 (SBH-1834)',
};
const SHARED_CC = 'อุบัติเหตุรถชนหมู่';
const STORE = `.cache/sbh-1334-${SYSTEM}.json`;
const RESUME = process.env.SBH1334_RESUME === '1';

type Kind = 'new' | 'dummy';
interface Plan {
  n: 1 | 2 | 3;
  kind: Kind;
  level: 2 | 3 | 5;
  zone: string;
}
const PLAN: Plan[] = [
  { n: 1, kind: 'new', level: 2, zone: 'โซนแดง ER' },
  { n: 2, kind: 'dummy', level: 3, zone: 'โซนเหลือง ER' },
  { n: 3, kind: 'new', level: 5, zone: 'โซนเขียว ER' },
];
interface Member extends ErVisit {
  n: number;
  kind: Kind;
  name: string;
  /** หลังเปิด Visit ระบบเปิดหน้า Triage ของรายนี้ให้เองไหม (TC-001) */
  autoOpened?: boolean;
}
interface Store {
  url: string;
  eventName: string;
  members: Member[];
}

const loadStore = (): Store | undefined => (RESUME && fs.existsSync(STORE) ? (JSON.parse(fs.readFileSync(STORE, 'utf8')) as Store) : undefined);
const saveStore = (store: Store) => {
  fs.mkdirSync('.cache', { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(store, null, 2));
};
const bangkokTime = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());

test.describe(`SBH-1334 Triage ผู้ป่วยหลายคน / อุบัติเหตุหมู่ (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 1_800_000 });

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page);
  });

  test(
    'เหตุการณ์อุบัติเหตุหมู่ 3 ราย: เพิ่มผู้ป่วย → CC ใช้ร่วม → ESI / Zone รายคน → Ready / Draft → ส่ง Triage ทั้งเหตุการณ์ (Super_User)',
    { tag: ['@SBH-1334', '@SBH-1828', '@SBH-1829', '@SBH-1830', '@SBH-1831', '@SBH-1832', '@SBH-1833', '@SBH-1834'], annotation: Object.values(TC).map((t) => linear(t.match(/SBH-\d+/)![0])) },
    async ({ page }) => {
      const main = page.getByRole('main');
      const form = triageForm(page);
      const authorization = trackAuthorization(page);
      const writes: string[] = [];
      page.on('response', (r) => {
        const m = r.request().method();
        if (m !== 'GET' && /cortex-api\/er\/(mass-casualty|visits|encounters)/.test(r.url())) writes.push(`${m} ${new URL(r.url()).pathname.replace(/[0-9a-f-]{36}/g, '…')} ${r.status()}`);
      });
      const store: Store = loadStore() ?? { url: '', eventName: `AUTO SBH-1334 ${bangkokTime()}`, members: [] };
      const submitButton = main.getByRole('button', { name: 'ส่ง Triage ทั้งเหตุการณ์' });
      const readyButton = main.getByRole('button', { name: 'พร้อมส่งและไปคนถัดไป' });
      const heading = (n: number) => main.getByRole('heading', { name: new RegExp(`^${n}\\. `) });
      const row = (n: number): Locator => main.getByRole('listitem').filter({ has: page.getByRole('heading', { name: new RegExp(`^${n}\\. `) }) }).first();
      const ccBox = form.locator('textarea[placeholder="สรุปอาการและอื่น ๆ"]');
      const readyTries: Record<number, number> = {};

      /** เลือกสมาชิกรายที่ n ในรายการ → รอฟอร์มของรายนั้น (แถบหัวแสดง HN + CC ถูกเติม) */
      const selectMember = async (m: Member) => {
        await heading(m.n).click();
        await expect(main.getByText(`HN ${m.hn}`, { exact: true }).last()).toBeVisible({ timeout: 30_000 });
        await expect(ccBox).toHaveValue(new RegExp(SHARED_CC), { timeout: 45_000 });
      };

      /** กรอกช่องบังคับของฟอร์ม + ระดับ — ฟอร์มล้างค่าที่เพิ่งกรอกเป็นพักๆ → กรอกซ้ำจนปุ่มพร้อมส่งกดได้ */
      const fillMember = async (m: Member, level: number) => {
        await expect(async () => {
          for (const [nth, title] of [
            [1, 'ไม่มี'],
            [2, 'ญาติ'],
          ] as const) {
            const box = main.getByText('วิธีการมาถึง', { exact: true }).last().locator(`xpath=following::input[@role="combobox"][${nth}]/ancestor::div[contains(concat(" ", @class, " "), " ant-select ")][1]`);
            if (await box.locator(`.ant-select-content-value[title="${title}"]`).count()) continue;
            await box.click();
            await pick(page.locator(`.ant-select-dropdown:visible .ant-select-item-option[title="${title}"]`));
          }
          await fillTriage(page, m, { level: level as 2 | 3 | 5, vitals: VITALS_NORMAL, chiefComplaint: '' });
          await expect(form.getByRole('button', { name: new RegExp(`^${PLAN[m.n - 1].zone}.*แนะนำ`) })).toBeVisible({ timeout: 5_000 });
          await expect(readyButton).toBeEnabled({ timeout: 5_000 });
        }, `ฟอร์มของรายที่ ${m.n} ต้องกรอกครบจนปุ่มพร้อมส่งกดได้`).toPass({ timeout: 180_000 });
      };

      /** กดพร้อมส่งและไปคนถัดไป → รายนั้นต้องเป็น READY (ไม่เป็น = ฟอร์มถูกล้าง → กรอกแล้วกดซ้ำ) */
      const makeReady = async (m: Member, evidence: boolean) => {
        const plan = PLAN[m.n - 1];
        let tries = 0;
        await expect(async () => {
          tries++;
          if (!(await row(m.n).getByText('READY', { exact: true }).count())) {
            await selectMember(m);
            await fillMember(m, plan.level);
            if (evidence && tries === 1) {
              await markEvidence(filled(form.getByRole('button', { name: ESI_BUTTON[plan.level] })), expected(form.getByRole('button', { name: new RegExp(`^${plan.zone}`) })), clicked(readyButton));
              await snapEvidence(page, `ก่อนกด — พร้อมส่ง รายที่ ${m.n} ESI ${plan.level}`);
            }
            await readyButton.click();
          }
          await expect(row(m.n)).toContainText('READY', { timeout: 10_000 });
        }, `รายที่ ${m.n} ต้องเป็น READY หลังกดพร้อมส่ง`).toPass({ timeout: 300_000 });
        readyTries[m.n] = (readyTries[m.n] ?? 0) + tries;
        console.log(`    รายที่ ${m.n}: READY (กดพร้อมส่ง ${tries} ครั้ง)`);
      };

      // ─── TC-001: สร้างเหตุการณ์ + เพิ่มผู้ป่วย 3 ราย
      await checkStep(page, `${TC[1]} ขั้น 1 เริ่ม Triage แบบผู้ป่วยหลายคน — สร้างเหตุการณ์ (ชื่อ · สถานที่ · อาการสำคัญร่วม)`, async () => {
        if (store.url) {
          await page.goto(store.url);
          await expect(main.getByRole('button', { name: 'plus ผู้ป่วยใหม่' })).toBeVisible({ timeout: 90_000 });
          return;
        }
        await gotoErDashboard(page);
        await openTriagePage(page);
        await page.getByRole('tab', { name: 'ผู้ป่วยหลายคน' }).click();
        await page.getByRole('button', { name: /สร้างเหตุการณ์/ }).click();
        const dialog = page.getByRole('dialog', { name: 'สร้างเหตุการณ์' });
        await dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ }).fill(store.eventName);
        await dialog.getByRole('textbox', { name: /สถานที่เกิดเหตุ/ }).fill('ถนนพหลโยธิน กม. 100');
        await dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ }).fill(SHARED_CC);
        await dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ }).press('Tab');
        await markEvidence(filled(dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ })), clicked(dialog.getByRole('button', { name: 'สร้าง', exact: true })));
        await snapEvidence(page, 'ก่อนกด — สร้างเหตุการณ์');
        await dialog.getByRole('button', { name: 'สร้าง', exact: true }).click();
        await expect(dialog).toBeHidden({ timeout: 30_000 });
        await expect(page).toHaveURL(/mode=mass-casualty&incidentId=/);
        store.url = page.url();
        saveStore(store);
        await expect(main.getByRole('button', { name: 'plus ผู้ป่วยใหม่' })).toBeVisible();
        await markEvidence(expected(main.getByText(store.eventName).first()), expected(main.getByText(SHARED_CC).first()));
        await holdForClip(page);
      });

      for (const plan of PLAN) {
        if (store.members.some((m) => m.n === plan.n)) continue;
        const label = plan.kind === 'new' ? 'ผู้ป่วยใหม่ไม่มี HN' : 'ผู้ป่วยระบุตัวตนไม่ได้';
        await checkStep(page, `${TC[1]} ขั้น ${plan.n + 1} เพิ่มผู้ป่วยคนที่ ${plan.n} แบบ${label} → เปิด Visit ER สิทธิ UC → ระบบเปิดหน้า Triage ของรายนั้น`, async () => {
          let patient: NewPatient;
          if (plan.kind === 'new') {
            patient = newTestPatient(`Mci1334P${plan.n}`);
            await main.getByRole('button', { name: 'plus ผู้ป่วยใหม่' }).click();
            await expect(page.getByRole('textbox', { name: '* ชื่อ', exact: true })).toBeVisible({ timeout: 15_000 });
            await page.getByRole('combobox', { name: '* คำนำหน้าชื่อ', exact: true }).click();
            await pick(page.locator('.ant-select-dropdown:visible .ant-select-item-option').first());
            await page.getByRole('textbox', { name: '* เลขบัตรประชาชน', exact: true }).fill(patient.citizenId);
            await page.getByRole('textbox', { name: '* ชื่อ', exact: true }).fill(patient.firstName);
            await page.getByRole('textbox', { name: '* นามสกุล', exact: true }).fill(patient.familyName);
            await page.getByRole('combobox', { name: '* เพศ', exact: true }).click();
            await pick(page.locator('.ant-select-dropdown:visible .ant-select-item-option[title="ชาย"]'));
            const birth = page.getByRole('textbox', { name: '* วัน/เดือน/ปีเกิด', exact: true });
            await birth.fill(patient.birthDate);
            await birth.press('Tab');
            const submit = page.getByRole('button', { name: 'ลงทะเบียนผู้ป่วย' });
            await markEvidence(filled(page.getByRole('textbox', { name: '* ชื่อ', exact: true })), filled(page.getByRole('textbox', { name: '* นามสกุล', exact: true })), clicked(submit));
            await snapEvidence(page, `ก่อนกด — ลงทะเบียนผู้ป่วยคนที่ ${plan.n}`);
            await submit.click();
          } else {
            patient = { citizenId: '(ไม่ระบุตัวตน)', firstName: `ไม่ทราบชื่อ1334${bangkokTime().replace(':', '')}`, familyName: '', gender: 'ชาย', birthDate: '-' };
            await main.getByRole('button', { name: 'plus ผู้ป่วยระบุตัวตนไม่ได้' }).click();
            const dialog = page.getByRole('dialog', { name: 'ผู้ป่วยระบุตัวตนไม่ได้' });
            await dialog.getByRole('textbox', { name: 'ชื่อชั่วคราว' }).fill(patient.firstName);
            await dialog.getByRole('textbox', { name: '* อายุโดยประมาณ' }).fill('40');
            const submit = dialog.getByRole('button', { name: /ลงทะเบียน/ });
            await markEvidence(filled(dialog.getByRole('textbox', { name: 'ชื่อชั่วคราว' })), filled(dialog.getByRole('textbox', { name: '* อายุโดยประมาณ' })), clicked(submit));
            await snapEvidence(page, `ก่อนกด — ลงทะเบียนผู้ป่วยคนที่ ${plan.n}`);
            await submit.click();
          }
          const visit = await confirmOpenErVisit(page, openVisitDialog(page), COVERAGE_UC);
          const member: Member = { ...visit, n: plan.n, kind: plan.kind, name: `${patient.firstName} ${patient.familyName}`.trim() };
          store.members.push(member);
          saveStore(store);
          if (SYSTEM === 'sbh-prod') recordMockPatient(`SBH-1334 P${plan.n}`, patient, visit, `SBH-1334 · เหตุการณ์ ${store.eventName} · ${label} · Visit ER สิทธิ UC (เทสการ์ด ทิ้ง Visit ไว้)`);
          console.log(`    P${plan.n} ${label}: ${member.name} · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
          await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
          // ผู้ป่วยขึ้นในรายการของเหตุการณ์ + หน้า Triage ของรายนั้นเปิดให้ต่อ
          await expect(row(plan.n)).toContainText(`HN ${visit.hn}`, { timeout: 30_000 });
          // Prod / dev-x 16 ต.ค. 2026: ระบบเปิดฟอร์มให้เฉพาะรายแรก — รายถัดไปฟอร์มยังเป็นรายที่เลือกอยู่ → จดผลรายคน (ถามผู้ใช้เรื่องลงผล) แล้วเลือกเอง
          const header = main.getByText(`HN ${visit.hn}`, { exact: true }).last();
          const autoOpened = await header.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false);
          store.members[store.members.length - 1].autoOpened = autoOpened;
          saveStore(store);
          test.info().annotations.push({ type: `${TC[1]} รายที่ ${plan.n}`, description: autoOpened ? 'ระบบเปิดหน้า Triage ของรายนี้ให้ต่อ' : 'ระบบไม่ได้เปิดหน้า Triage ของรายนี้ให้ (ฟอร์มยังเป็นรายที่เลือกอยู่)' });
          console.log(`    P${plan.n}: เปิดหน้า Triage ให้เอง = ${autoOpened}`);
          await markEvidence(expected(row(plan.n)));
          await snapEvidence(page, `หลังเปิด Visit รายที่ ${plan.n} — ฟอร์มที่ระบบเปิด`);
          if (!autoOpened) await selectMember(member);
          await expect(form.getByRole('spinbutton', { name: 'Systolic' })).toBeVisible({ timeout: 45_000 });
          await markEvidence(expected(row(plan.n)), expected(header));
          await holdForClip(page);
        });
      }
      const members = [1, 2, 3].map((n) => store.members.find((m) => m.n === n)!);
      test.info().annotations.push({ type: 'เหตุการณ์', description: `${store.eventName} · ${store.url}` });
      for (const m of members) test.info().annotations.push({ type: `ผู้ป่วยรายที่ ${m.n}`, description: `${m.kind === 'new' ? 'ผู้ป่วยใหม่ไม่มี HN' : 'ผู้ป่วยระบุตัวตนไม่ได้'} · ${m.name} · HN ${m.hn} · VN ${m.vn} · EN ${m.en} · เปิดหน้า Triage ให้เองหลังเปิด Visit: ${m.autoOpened === undefined ? '-' : m.autoOpened ? 'ใช่' : 'ไม่'}` });

      // ─── TC-002: ลำดับรายชื่อ = ลำดับการเปิด Visit
      const readOrder = async () => (await main.getByRole('listitem').getByRole('heading').allInnerTexts()).filter((t) => /^\d+\. /.test(t));
      await checkStep(page, `${TC[2]} ขั้น 3-4 รายชื่อผู้ป่วยเรียงตามลำดับการเปิด Visit`, async () => {
        const res = await page.request.get('/cortex-api/er/dashboard/encounters?scope=current_queue', { headers: { authorization: authorization() } });
        await expectOk(res, 'อ่านข้อมูลบอร์ด ER');
        const board = (await res.json()) as { en: string; arrivedAt: string }[];
        const arrived = members.map((m) => board.find((e) => e.en === m.en)?.arrivedAt ?? '');
        const shown = await readOrder();
        const rows: CompareRow[] = members.map((m, i) => ({
          label: `ลำดับ ${i + 1}`,
          values: [`P${m.n} (HN ${m.hn})`, arrived[i] ? new Date(arrived[i]).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }) : '-', shown[i] ?? '-'],
          same: !!shown[i]?.includes(m.name.split(' ')[0]) && (i === 0 || arrived[i - 1] <= arrived[i]),
        }));
        await markEvidence(...members.map((m) => expected(row(m.n))));
        await showCompareTable(page, `${TC[2]} ลำดับรายชื่อในเหตุการณ์`, ['ลำดับที่เพิ่ม', 'เวลาเปิด Visit', 'รายการบนจอ'], rows, { width: '900px' });
        await holdForClip(page, 2_500);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'รายชื่อต้องเรียงตามลำดับการเปิด Visit').toEqual([]);
      });
      await hideCompareTable(page);

      // ─── TC-003: CC ใช้ร่วม
      for (const m of members) {
        await checkStep(page, `${TC[3]} ขั้น ${m.n + 2} ฟอร์ม Triage ของผู้ป่วยคนที่ ${m.n} — Chief Complaint ถูก Prefill จากอาการสำคัญร่วม`, async () => {
          await selectMember(m);
          await expect(ccBox).toHaveValue(new RegExp(SHARED_CC));
          await markEvidence(expected(row(m.n)), expected(ccBox));
          await holdForClip(page);
        });
      }

      // ─── TC-004 / TC-005 / TC-006: ระดับ / Zone รายคน + Ready / Draft + ปุ่มส่ง
      await checkStep(page, `${TC[4]} ขั้น 2 ผู้ป่วยคนที่ 1 เลือก ESI 2 (โซนแดง) → ${TC[5]} ขั้น 2 กด พร้อมส่งและไปคนถัดไป`, async () => {
        await makeReady(members[0], true);
        await markEvidence(expected(row(1)));
        await holdForClip(page);
      });
      await checkStep(page, `${TC[4]} ขั้น 3 ผู้ป่วยคนที่ 2 เลือก ESI 3 (โซนเหลือง) คนละระดับกับคนที่ 1 → พร้อมส่ง`, async () => {
        await makeReady(members[1], true);
        await markEvidence(expected(row(1)), expected(row(2)));
        await holdForClip(page);
      });
      await checkStep(page, `${TC[4]} ขั้น 4 ระดับและ Zone ของทั้งสองคนแยกกัน — คนที่ 1 โซนแดง ER · คนที่ 2 โซนเหลือง ER`, async () => {
        await expect(row(1)).toContainText('โซนแดง ER');
        await expect(row(2)).toContainText('โซนเหลือง ER');
        await markEvidence(expected(row(1)), expected(row(2)));
        await holdForClip(page);
      });
      await checkStep(page, `${TC[6]} ขั้น 2-3 ผู้ป่วย READY 2 ราย เหลือ 1 รายเป็น DRAFT — ปุ่ม ส่ง Triage ทั้งเหตุการณ์ ยังกดไม่ได้`, async () => {
        await expect(row(3)).toContainText('DRAFT');
        await expect(submitButton).toBeDisabled();
        await markEvidence(expected(row(3)), expected(submitButton));
        await holdForClip(page);
      });

      const orderBefore = await readOrder();
      await checkStep(page, `${TC[5]} ขั้น 3-4 สถานะผู้ป่วยคนที่ 1 เป็น READY → คลิกที่ Patient Status`, async () => {
        const status = row(1).getByText('READY', { exact: true });
        await expect(status).toBeVisible();
        await markEvidence(clicked(status));
        await snapEvidence(page, 'ก่อนกด — สถานะ READY ของคนที่ 1');
        await status.click();
      });
      await checkStep(page, `${TC[5]} ขั้น 5-6 สถานะกลับเป็น DRAFT แก้ไขข้อมูลได้ · ลำดับรายชื่อไม่เปลี่ยน`, async () => {
        await expect(row(1)).toContainText('DRAFT', { timeout: 30_000 });
        await selectMember(members[0]);
        await expect(form.getByRole('button', { name: ESI_BUTTON[3] })).toBeEnabled();
        const orderAfter = await readOrder();
        const rows: CompareRow[] = orderBefore.map((t, i) => ({ label: `ลำดับ ${i + 1}`, values: [t, orderAfter[i] ?? '-'], same: t === orderAfter[i] }));
        await markEvidence(expected(row(1)), expected(form.getByRole('button', { name: ESI_BUTTON[2] })));
        await showCompareTable(page, `${TC[5]} ลำดับรายชื่อก่อน / หลังเปลี่ยนสถานะ`, ['ก่อนคลิกสถานะ', 'หลังคลิกสถานะ'], rows, { width: '760px' });
        await holdForClip(page, 2_000);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'ลำดับรายชื่อต้องไม่เปลี่ยน').toEqual([]);
      });
      await hideCompareTable(page);
      await checkStep(page, `${TC[5]} ผู้ป่วยคนที่ 1 กลับมาพร้อมส่งอีกครั้ง (READY)`, async () => {
        await makeReady(members[0], false);
        await markEvidence(expected(row(1)));
      });

      await checkStep(page, `${TC[6]} ขั้น 4-5 ผู้ป่วยคนที่ 3 เลือก ESI 5 (โซนเขียว) → พร้อมส่ง ครบทุกคน — ปุ่ม ส่ง Triage ทั้งเหตุการณ์ กดได้`, async () => {
        await makeReady(members[2], true);
        for (const m of members) await expect(row(m.n)).toContainText('READY');
        await expect(submitButton).toBeEnabled({ timeout: 30_000 });
        await markEvidence(...members.map((m) => expected(row(m.n))), expected(submitButton));
        await holdForClip(page);
      });
      test.info().annotations.push({ type: 'จำนวนครั้งที่กดพร้อมส่งจนเป็น READY', description: Object.entries(readyTries).map(([n, t]) => `รายที่ ${n}: ${t}`).join(' · ') });

      // ─── TC-007: ส่งทั้งเหตุการณ์ → ผู้ป่วยเข้า Zone ที่ระบุรายคน
      await checkStep(page, `${TC[7]} ขั้น 2-3 จด Zone ปลายทางรายคน แล้วกด ส่ง Triage ทั้งเหตุการณ์`, async () => {
        await markEvidence(...members.map((m) => expected(row(m.n))), clicked(submitButton));
        await snapEvidence(page, 'ก่อนกด — ส่ง Triage ทั้งเหตุการณ์');
        await submitButton.click();
        // ESI 5 อาจถามคลินิกปลายทาง → "ภายหลัง" ให้ค้างโซนเขียว · หน้าต่างยืนยันอื่น → จดไว้แล้วกดยืนยัน
        const refer = page.getByRole('dialog', { name: 'ส่งต่อไปคลินิก' });
        const confirm = page.getByRole('dialog').filter({ hasText: /ยืนยัน/ });
        for (let i = 0; i < 3; i++) {
          if (await refer.isVisible({ timeout: 3_000 }).catch(() => false)) {
            test.info().annotations.push({ type: TC[7], description: 'หลังกดส่งมีหน้าต่าง ส่งต่อไปคลินิก → ภายหลัง' });
            await refer.getByRole('button', { name: 'ภายหลัง' }).click();
          } else if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) {
            test.info().annotations.push({ type: TC[7], description: `หลังกดส่งมีหน้าต่าง: ${(await confirm.innerText()).replace(/\s+/g, ' ').slice(0, 200)}` });
            await snapEvidence(page, 'หน้าต่างหลังกดส่ง');
            await confirm.getByRole('button', { name: /ยืนยัน/ }).last().click();
          }
        }
        await snapEvidence(page, 'หลังกด — ส่ง Triage ทั้งเหตุการณ์');
      });

      const zones = new Map<number, string>();
      await checkStep(page, `${TC[7]} ส่งสำเร็จ — ข้อมูลในระบบ: ผู้ป่วยทุกรายคัดกรองแล้ว ระดับ / Zone ตรงกับที่ระบุรายคน`, async () => {
        const zRes = await page.request.get('/cortex-api/er/triage/zones', { headers: { authorization: authorization() } });
        await expectOk(zRes, 'อ่านรายชื่อโซน ER');
        for (const z of ((await zRes.json()) as { boardLocations: { id: number; nameTh: string }[] }).boardLocations) zones.set(z.id, z.nameTh);
        let rows: CompareRow[] = [];
        await expect(async () => {
          const res = await page.request.get('/cortex-api/er/dashboard/encounters?scope=current_queue', { headers: { authorization: authorization() } });
          await expectOk(res, 'อ่านข้อมูลบอร์ด ER');
          const board = (await res.json()) as { en: string; triagedAt: string | null; triageLevel: number | null; currentLocationId: number | null }[];
          rows = members.map((m) => {
            const e = board.find((x) => x.en === m.en);
            const plan = PLAN[m.n - 1];
            const zone = zones.get(e?.currentLocationId ?? -1) ?? '-';
            return { label: `P${m.n} HN ${m.hn}`, values: [`ESI ${plan.level} · ${plan.zone}`, e ? `${e.triagedAt ? 'คัดกรองแล้ว' : 'ยังไม่คัดกรอง'} · ESI ${e.triageLevel ?? '-'} · ${zone}` : '(ไม่อยู่บนบอร์ด)'], same: !!e?.triagedAt && e.triageLevel === plan.level && zone === plan.zone };
          });
          expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
        }, 'ผู้ป่วยทุกรายต้องคัดกรองแล้วและอยู่ Zone ที่ระบุ').toPass({ timeout: 120_000 });
        await showCompareTable(page, `${TC[7]} ระดับ / Zone ในระบบหลังส่งทั้งเหตุการณ์`, ['ที่ระบุรายคน', 'ในระบบ (API บอร์ด)'], rows, { width: '820px' });
        await holdForClip(page, 2_500);
      });
      await hideCompareTable(page);

      await checkStep(page, `${TC[7]} ขั้น 4-5 ER Dashboard — ผู้ป่วยแต่ละรายอยู่ใต้ Zone ที่ระบุ ไม่ตกหล่น ไม่ผิด Zone`, async () => {
        await gotoErDashboard(page);
        const columnNames = ['คัดกรอง', 'โซนแดง ER', 'โซนเหลือง ER', 'โซนเขียว ER', 'ห้องสังเกตอาการ ER', 'รอเตียง'];
        let placed: { hn: string; column: string }[] = [];
        await expect(async () => {
          const headers = await main.locator('strong').evaluateAll((els, names) => els.filter((el) => names.includes(el.textContent!.trim())).map((el) => ({ name: el.textContent!.trim(), x: el.getBoundingClientRect().x })), columnNames);
          placed = await Promise.all(
            members.map(async (m) => {
              const x = await page.getByText(`HN: ${m.hn}`, { exact: true }).first().evaluate((el) => el.getBoundingClientRect().x, undefined, { timeout: 10_000 });
              return { hn: m.hn, column: [...headers].filter((h) => h.x <= x + 40).sort((a, b) => b.x - a.x)[0]?.name ?? '-' };
            }),
          );
          expect(placed.map((p, i) => p.column === PLAN[i].zone)).toEqual([true, true, true]);
        }).toPass({ timeout: 90_000 });
        const rows: CompareRow[] = members.map((m, i) => ({ label: `P${m.n} HN ${m.hn}`, values: [PLAN[i].zone, placed[i].column], same: placed[i].column === PLAN[i].zone }));
        for (const m of members) {
          const card = page.locator('.ant-card').filter({ has: page.getByText(`HN: ${m.hn}`, { exact: true }) }).last();
          await markEvidence(expected(main.locator('strong').filter({ hasText: new RegExp(`^${PLAN[m.n - 1].zone}$`) }).first()), expected(card));
          await snapEvidence(page, `${TC[7]} Dashboard รายที่ ${m.n} ${PLAN[m.n - 1].zone}`);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await showCompareTable(page, `${TC[7]} คอลัมน์ของผู้ป่วยบน ER Dashboard`, ['Zone ที่ระบุ', 'บนกระดาน'], rows, { width: '620px' });
        await holdForClip(page, 2_500);
      });
      await hideCompareTable(page);
      await test.info().attach('คำสั่งที่ยิงระหว่างเทส', { body: writes.join('\n'), contentType: 'text/plain' });
    },
  );
});
