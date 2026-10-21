import type { Browser, Locator, Page } from '@playwright/test';
import fs from 'node:fs';
import { graphqlMutation } from '../../../helpers/functions/er-disposition';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, startClip } from '../../../helpers/functions/fixtures';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { capturePrintJobs, hidePdf, openRoleWindow, pdfLineAt, pdfPages, showPdf } from '../../../helpers/functions/print-capture';
import { expectPatientInfo, fillNewPatientForm, gotoReception, openNewVisitPanel, saveNewPatient } from '../../../helpers/functions/reception';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { addCoverageFirst, openOpdVisit } from '../../../mock-data/uat-er';
import { addMedicineToCart, options } from '../../../mock-data/uat-play';

// การ์ด SBH-2233 [OPD] [Queue] Queue Improvement (การ์ดย่อย SBH-2385 / 2386) · EXE SBH-2729 → HPY SBH-2730 (TC-001–019, 023, 024) · UHP SBH-2731 (TC-020–022)
// 1 เทส = 1 กลุ่มผู้ป่วย (R9) · คลิป 1 ไฟล์ต่อ TC (R61 — startClip) · ขั้นที่ไม่ผ่านไม่หยุดเทส (soft) แล้วเทสจบไม่ผ่านพร้อมรายการ
// ผู้ป่วย AUTO ใหม่ (ลงทะเบียน + Visit OPD ที่เวชระเบียน R53 → เช็คอิน) · แพทย์สั่งด้วย Super_User · จำหน่ายด้วยบัญชี Nurse (Super_User จำหน่ายไม่ได้) · ทิ้ง Visit ไว้ (R11)
// ใบนำทาง: ส่วน "ใบนำทางไปจุดบริการอื่น" ในหน้า Discharge ต้องเปิด flag reception.visit-slip.print · API GET /visits/<VN>/visit-slip/destinations · พิมพ์ = POST …/visit-slip/print (zip) → print agent (ดัก PDF)
// คิวการเงิน: ผู้ใช้เลือก (21 ต.ค. 2026) ตรวจคิวอัตโนมัติจาก API (graphql queueWithDetails ตาม QSU) + หน้าจอเท่าที่เห็น — คิวอัตโนมัติอยู่ QSU 327 แต่ห้องการเงินของ user1 (การเงินทดสอบ) = QSU 18
// TC-022: Order ที่ Category ไม่มี location (TEST-IMG-OTHER) ระบบกันตั้งแต่ส่งคำสั่ง → ลอง + จดผล (ผู้ใช้เลือก: ใช้ข้อมูลที่มี ไม่ได้ลง (-))
// ทำต่อกับผู้ป่วยชุดเดิม: SBH2233_RESUME=1 (อ่าน .cache/sbh-2233-dev-x.json — ข้ามขั้นที่ทำแล้วของแต่ละราย)
// รัน dev-x: npx playwright test --headed --grep @SBH-2233 --output=.cache/run-2233  (ทีละเทสด้วย --grep @SBH-2732 / @SBH-2733 / @SBH-2735 / @SBH-2736 / @SBH-2751)

const STATE_FILE = '.cache/sbh-2233-dev-x.json';
const PARENTS = ['SBH-2233', 'SBH-2729'];
const TCID: Record<string, string> = {
  '001': 'SBH-2732', '002': 'SBH-2733', '003': 'SBH-2734', '004': 'SBH-2735', '005': 'SBH-2736', '006': 'SBH-2737', '007': 'SBH-2738', '008': 'SBH-2739',
  '009': 'SBH-2740', '010': 'SBH-2741', '011': 'SBH-2742', '012': 'SBH-2743', '013': 'SBH-2744', '014': 'SBH-2745', '015': 'SBH-2746', '016': 'SBH-2747',
  '017': 'SBH-2748', '018': 'SBH-2749', '019': 'SBH-2750', '020': 'SBH-2751', '021': 'SBH-2752', '022': 'SBH-2753', '023': 'SBH-2841', '024': 'SBH-2842',
};
const TC = (n: string) => `TC-${n} (${TCID[n]})`;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const meta = (tcs: string[]) => ({ tag: ['@SBH-2233', ...tcs.map((n) => `@${TCID[n]}`)], annotation: [...PARENTS, ...tcs.map((n) => TCID[n])].map(linear) });
const squash = (t: string) => t.replace(/\s+/g, ' ').trim();
const firstLine = (e: unknown) => String((e as Error)?.message ?? e).split('\n')[0].slice(0, 300);

// รายการ Order (dev-x · ตรวจ master data 21 ต.ค. 2026)
const LAB_CBC = 'SBHLAB399'; // CBC · hematology — dev-x 21 ต.ค. 2026 ส่งคำสั่งแล้วไม่เกิดงาน Lab (ไม่มีจุดบริการ) → ไม่ใช้ในเทส (ข้อสังเกต)
const LAB_MALB = 'SBHLAB4'; // Microalbumin · chemistry → loc 1
const LAB_GLU = 'SBHLAB5'; // Glucose · chemistry → loc 1
const LAB_HBA1C = 'SBHLAB76'; // HbA1c · chemistry → loc 1
const LAB_HBTYPE = 'SBHLAB402'; // Hb Typing · LTH → ห้องปฏิบัติการ (LAB) (loc 105 · QSU 2)
const XRAY = 'SBHIMG1'; // CHEST (X-ray)
const US = 'SBHIMG501'; // US : Hernia (Image ที่ไม่ใช่ X-ray)
const ECG = '89.52'; // Activity ECG
const NO_LOCATION = 'TEST-IMG-OTHER'; // Imaging category TEST-OTHER ไม่มี default location
const DRUG = 'med0000008'; // CLINDAVID-300 (R25)
const COVERAGE_MAIN = 'H03 - สิทธิ UC';
const CASHIER_AUTO_QSU = '327'; // คิวการเงินอัตโนมัติ (ประเภทคิว C)
const CASHIER_ROOM_QSU = '18'; // ห้องการเงินทดสอบของ user1 (ประเภทคิว ทดสอบ)
const LAB_ROOM = 'ห้องปฏิบัติการ ชั้น 6';

interface Patient { key: string; hn: string; vn: string; en: string; name: string; birth: string; orders: string[]; ordered?: boolean; discharged?: boolean; coverages?: string[] }
type Store = Record<string, Patient>;
const readStore = (): Store => {
  try { return process.env.SBH2233_RESUME ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {}; } catch { return {}; }
};
const saveStore = (s: Store) => { fs.mkdirSync('.cache', { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 1)); };
const loadAny = (): Store => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; } };

/** ตัดเฉพาะไฟล์ PDF จากงานพิมพ์ที่ส่งให้ print agent (thermal = multipart/form-data) */
function extractPdf(buf: Buffer): Buffer {
  const s = buf.indexOf('%PDF');
  const e = buf.lastIndexOf('%%EOF');
  return s >= 0 && e > s ? buf.subarray(s, e + 5) : buf;
}

/** ทั้งเทส: ตัวจดผล + ตัวช่วยของแต่ละหน้าจอ */
function harness(page: Page, browser: Browser) {
  const failures: string[] = [];
  const main = page.getByRole('main');
  const note = (type: string, description: string) => {
    test.info().annotations.push({ type, description });
    console.log(`    ${type}: ${description}`);
  };
  // SBH2233_ONLY=017,024 = รันเฉพาะ TC ที่ระบุ (ใช้คู่กับ SBH2233_RESUME=1 — ตรวจซ้ำกับผู้ป่วยเดิม)
  const only = process.env.SBH2233_ONLY?.split(',').map((s) => s.trim());
  const soft = async (pg: Page, title: string, body: () => Promise<void>) => {
    const n = title.match(/^TC-(\d{3})/)?.[1];
    if (only && n && !only.includes(n)) return true;
    return checkStep(pg, title, body).then(
      () => true,
      (error: unknown) => {
        failures.push(`${title} — ${firstLine(error)}`);
        console.log(`    ✗ ${title} — ${firstLine(error)}`);
        return false;
      },
    );
  };
  const auth = trackAuthorization(page);
  const store = { ...loadAny(), ...readStore() };
  const resume = !!process.env.SBH2233_RESUME;

  /** ลงทะเบียน AUTO ที่เวชระเบียน + Visit OPD (ใส่สิทธิ์รองเมื่อระบุ) + เช็คอิน */
  const register = async (key: string, label: string, orders: string[], withSecondCoverage = false): Promise<Patient> => {
    if (resume && store[key]) {
      note(`ผู้ป่วย ${key}`, `ผู้ป่วยเดิม HN ${store[key].hn} · ${store[key].vn} · EN ${store[key].en}`);
      return store[key];
    }
    const p = newTestPatient(label);
    let hn = '';
    let vn = '';
    let en = '';
    const coverages: string[] = [];
    await checkStep(page, `Pre-condition ผู้ป่วย ${key}: ลงทะเบียน + Visit OPD + เช็คอิน`, async () => {
      await gotoReception(page);
      await fillNewPatientForm(page, p);
      hn = await saveNewPatient(page);
      if (await expectPatientInfo(page)) await openNewVisitPanel(page);
      if (withSecondCoverage) {
        // สิทธิ์หลัก = UC (ลำดับ 1) · สิทธิ์รอง = เงินสดที่ระบบใส่มาให้ (ลำดับ 2)
        await addCoverageFirst(page, COVERAGE_MAIN);
      }
      const rows = await main.locator('tr').filter({ hasText: /^\s*\d*\s*H\d{2} - / }).allInnerTexts().catch(() => []);
      for (const r of rows) {
        const m = r.match(/H\d{2} - [^\t\n]+/);
        if (m) coverages.push(squash(m[0]));
      }
      const opd = await openOpdVisit(page, { anyDoctor: true });
      vn = opd.vn;
      en = opd.en;
      await selectOpdUnit(page);
      await checkInFromOpdList(page, await opdListRow(page, hn, { anyDoctor: true }));
      note(`ผู้ป่วย ${key}`, `${p.firstName} ${p.familyName} · HN ${hn} · ${vn} · EN ${en} · ${opd.clinic} · ${opd.doctor}${coverages.length ? ` · สิทธิ ${coverages.join(' / ')}` : ''}`);
    });
    const [d, m, y] = p.birthDate.split('/');
    store[key] = { key, hn, vn, en, name: `${p.firstName} ${p.familyName}`, birth: `${d}/${m}/${Number(y) + 543}`, orders, coverages };
    saveStore(store);
    return store[key];
  };

  const gotoEmr = async (pg: Page, p: Patient) => {
    const m = pg.getByRole('main');
    await pg.goto(`/cortex/next/patients/${p.hn}?en=${p.en}&vn=${p.vn}&fromApp=opd&preset=opdV2`, { waitUntil: 'domcontentloaded' });
    await expect(m.getByText(`VN ${p.vn}`, { exact: true }).first(), 'เปิดหน้า EMR แล้วต้องเห็นแถบ Visit').toBeVisible({ timeout: 120_000 });
    await pg.waitForTimeout(3_000);
  };
  const cartRows = () => main.locator('tr.ant-table-row').filter({ visible: true }).filter({ hasText: /\[[^\]]+\]/ });
  const cartRow = (code: string) => cartRows().filter({ hasText: `[${code}]` }).first();
  const rowSent = async (code: string) => /status-dot-sent/.test((await cartRow(code).locator('[class*="status-dot"]').first().getAttribute('class').catch(() => '')) ?? '');

  /** เพิ่ม Order ทีละรายการลงตะกร้า แล้วส่งคำสั่งจนทุกแถวเป็น "ส่งแล้ว" (บันทึกแบบฟอร์ม Imaging ให้) — คืน error ของ SignOPDOrders */
  const order = async (codes: string[], allowFail = false): Promise<string[]> => {
    const search = main.getByPlaceholder(/ค้นหา ยา, เวชภัณฑ์/);
    await search.waitFor({ timeout: 120_000 });
    await expect(main.locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 60_000 }).catch(() => undefined);
    for (const code of codes) {
      if (await cartRow(code).isVisible().catch(() => false)) continue;
      if (code.startsWith('med')) {
        await addMedicineToCart(page, code);
      } else {
        await search.click();
        await search.fill(code);
        const option = options(page).filter({ hasText: `[${code}]` }).first();
        await expect(option, `ต้องค้นเจอรายการ ${code}`).toBeVisible({ timeout: 30_000 });
        await option.click();
        await expect(async () => {
          const up = graphqlMutation(page, 'UpsertOpdOrder', 8_000);
          up.catch(() => undefined);
          await page.getByRole('button', { name: /เพิ่มลงตะกร้า/ }).filter({ visible: true }).first().click();
          await up;
        }, `เพิ่ม ${code} ลงตะกร้า`).toPass({ timeout: 45_000 });
      }
      await expect(cartRow(code), `รายการ ${code} ต้องขึ้นในตะกร้า`).toBeVisible({ timeout: 60_000 });
    }
    const errors: string[] = [];
    const watch = async (res: import('@playwright/test').Response) => {
      const post = res.request().postData() ?? '';
      if (!post.includes('mutation SignOPDOrders')) return;
      const body = (await res.json().catch(() => ({}))) as { errors?: { message: string }[] };
      for (const e of body.errors ?? []) errors.push(e.message);
    };
    page.on('response', watch);
    try {
      for (let i = 0; i < 10; i++) {
        let all = true;
        for (const c of codes) if (!(await rowSent(c))) all = false;
        if (all) break;
        const form = page.getByRole('dialog').filter({ visible: true }).filter({ hasText: 'แบบฟอร์ม Imaging' }).first();
        if (await form.isVisible().catch(() => false)) {
          await form.getByRole('button', { name: /บันทึก/ }).click();
          await page.waitForTimeout(4_000);
          continue;
        }
        if (errors.length && allowFail) break;
        const signed = graphqlMutation(page, 'SignOPDOrders', 90_000);
        signed.catch(() => undefined);
        await main.getByRole('button', { name: /ส่งคำสั่ง/ }).first().click();
        await Promise.race([signed, page.getByRole('dialog').filter({ visible: true }).filter({ hasText: 'แบบฟอร์ม Imaging' }).first().waitFor({ timeout: 90_000 })]).catch(() => undefined);
        await page.waitForTimeout(4_000);
      }
    } finally {
      page.off('response', watch);
    }
    if (!allowFail) for (const c of codes) expect(await rowSent(c), `${c} ต้องส่งคำสั่งแล้ว${errors.length ? ` (${errors.join(' · ')})` : ''}`).toBe(true);
    return errors;
  };

  const setVisitStatus = async (name: string) => {
    const status = main.locator('.ant-select[class*="status-select"]').filter({ visible: true }).first();
    await expect(status).toBeVisible({ timeout: 120_000 });
    if ((await status.textContent())?.trim() === name) return;
    const option = options(page).filter({ hasText: new RegExp(`^${name}$`) });
    await expect(async () => {
      await page.keyboard.press('Escape');
      await status.click();
      await expect(option).toBeVisible({ timeout: 5_000 });
    }, `เปิดตัวเลือกสถานะเพื่อเลือก ${name}`).toPass({ timeout: 60_000 });
    const moved = graphqlMutation(page, 'TransitionEncounterStatus', 60_000);
    await option.click();
    const body = (await (await moved).json()) as { data?: { transitionEncounterStatus?: { accepted?: boolean } }; errors?: { message: string }[] };
    expect(body.data?.transitionEncounterStatus?.accepted, `เปลี่ยนสถานะเป็น ${name} ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
  };

  /** แพทย์สั่ง Order → ตรวจเสร็จ */
  const prepareOrders = async (p: Patient, allowFail = false) => {
    if (p.ordered) return [];
    let errors: string[] = [];
    await checkStep(page, `Pre-condition ผู้ป่วย ${p.key}: สั่ง ${p.orders.join(' + ') || '(ไม่มี Order)'} → ตรวจเสร็จ`, async () => {
      await gotoEmr(page, p);
      if (p.orders.length) {
        errors = await order(p.orders, allowFail);
        await markEvidence(...(await Promise.all(p.orders.map(async (c) => expected(cartRow(c))))));
        await snapEvidence(page, `ผู้ป่วย ${p.key} — ตะกร้าหลังส่งคำสั่ง`);
      }
      await setVisitStatus('พร้อมตรวจ');
      await setVisitStatus('ตรวจเสร็จ');
    });
    p.ordered = true;
    saveStore(store);
    return errors;
  };

  // ── หน้าต่างบัญชี Nurse (จำหน่าย / หน้า Discharge) ──
  let nurse: Page | undefined;
  let nurseAuth: (() => string) | undefined;
  let printer: Awaited<ReturnType<typeof capturePrintJobs>> | undefined;
  const nursePage = async () => {
    if (!nurse) {
      nurse = await openRoleWindow(browser, 'Nurse');
      nurseAuth = trackAuthorization(nurse);
      printer = await capturePrintJobs(nurse);
      await nurse.goto('/cortex/opd/select-service-unit', { timeout: 180_000 });
      await nurse.getByRole('main').getByRole('combobox').first().waitFor({ timeout: 180_000 });
    }
    return nurse;
  };
  /** จำหน่ายจากรายการผู้ป่วยนอก (หลังตรวจ) ด้วยบัญชี Nurse → หน้า Discharge · จำหน่ายแล้วเปิดหน้า Discharge ตรง */
  const openDischarge = async (p: Patient): Promise<Page> => {
    const pg = await nursePage();
    if (!p.discharged) {
      await selectOpdUnit(pg, 'แผนกอายุรกรรม', 'หลังตรวจ');
      const row = await opdListRow(pg, p.hn, { anyDoctor: true });
      const button = row.getByRole('button', { name: 'จำหน่าย', exact: true });
      await expect(button, 'แถวผู้ป่วยต้องมีปุ่มจำหน่าย (บัญชี Nurse)').toBeEnabled({ timeout: 30_000 });
      await markEvidence(clicked(button));
      await snapEvidence(pg, `ก่อนกด — จำหน่าย (ผู้ป่วย ${p.key})`);
      const done = graphqlMutation(pg, 'DischargeEncounterStatus', 60_000);
      await button.click();
      const body = (await (await done).json()) as { data?: { dischargeEncounterStatus?: { accepted?: boolean } }; errors?: { message: string }[] };
      expect(body.data?.dischargeEncounterStatus?.accepted, `จำหน่ายไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ')}`).toBe(true);
      p.discharged = true;
      saveStore(store);
    } else {
      await pg.goto(`/cortex/next/patients/${p.hn}?en=${p.en}&vn=${p.vn}&fromApp=opd&actions=dischargeForm&preset=opdDischargedV2`, { waitUntil: 'domcontentloaded' });
    }
    await pg.waitForURL(/actions=dischargeForm/, { timeout: 90_000 });
    await expect(pg.getByRole('main').getByText('การจัดการหลังตรวจ', { exact: true })).toBeVisible({ timeout: 90_000 });
    await pg.waitForTimeout(5_000);
    // แผงซ้าย (OPD Note / คำสั่งการรักษา) บังหน้า Discharge → เลื่อนไปที่ส่วนใบนำทาง
    return pg;
  };
  const slipSection = (pg: Page) => pg.locator('section[aria-label="ใบนำทางไปจุดบริการอื่น"]');
  const slipRows = (pg: Page) => slipSection(pg).locator('[class*="visit-slip-destination-row"]');
  /** แถวของส่วนใบนำทางบนจอ → { จุดบริการ, สถานที่, Order, พิมพ์ได้ } */
  const readSlip = async (pg: Page) =>
    slipRows(pg).evaluateAll((rows) =>
      rows.map((r) => {
        const texts = [...r.querySelectorAll('[class*="destination-details"] > *')].map((e) => (e.textContent ?? '').trim());
        return { unit: texts[0] ?? '', location: texts[1] ?? '', orders: texts[2] ?? '', printable: !!r.querySelector('button[aria-label="พิมพ์"]'), incomplete: /ข้อมูลปลายทางไม่ครบ/.test(r.textContent ?? '') };
      }),
    );
  interface Destination { destinationId: string; queueServiceUnitId: number; locationId: number; destinationKind: string; serviceUnitName: string; locationName: string; orderNames: string[]; isPrintable: boolean }
  const fetchDestinations = async (pg: Page, vn: string): Promise<Destination[]> => {
    const a = pg === nurse && nurseAuth ? nurseAuth() : auth();
    const res = await pg.request.get(`/cortex-api/visits/${vn}/visit-slip/destinations`, { headers: { authorization: a } });
    expect(res.ok(), `API destinations ตอบ ${res.status()}`).toBe(true);
    return (await res.json()) as Destination[];
  };
  const showSlip = async (pg: Page) => {
    const section = slipSection(pg);
    await expect(section, 'หน้า Discharge ต้องมีส่วน "ใบนำทางไปจุดบริการอื่น"').toBeVisible({ timeout: 30_000 });
    await section.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await pg.waitForTimeout(800);
    return section;
  };

  /** ดักงานพิมพ์ใบนำทางของปุ่มที่กด → PDF ทุกใบ + คำสั่ง print ที่หน้าเว็บส่ง */
  const printSlip = async (pg: Page, button: Locator, tag: string) => {
    const before = printer!.jobs.length;
    const req = pg.waitForRequest((r) => r.method() === 'POST' && /\/visit-slip\/print$/.test(new URL(r.url()).pathname), { timeout: 60_000 });
    await button.click();
    const sent = (await req).postData() ?? '';
    await printer!.next(before, 45_000);
    await pg.waitForTimeout(3_000);
    const pdfs = printer!.jobs.slice(before).map((j) => extractPdf(j.pdf));
    pdfs.forEach((pdf, i) => fs.writeFileSync(test.info().outputPath(`slip-${tag}-${i + 1}.pdf`), pdf));
    const texts = await Promise.all(pdfs.map(async (pdf) => (await pdfPages(pdf)).join(' ')));
    note(`ใบนำทาง (${tag})`, `${pdfs.length} ใบ · คำสั่งพิมพ์ ${sent.slice(0, 300)} · ${texts.map((t) => t.slice(0, 400)).join(' || ')}`);
    return { pdfs, texts, sent };
  };

  // ── คิวการเงิน (API) ──
  interface QueueRow { id: string; qDisplay: string; latestStatusCode: string; hn: string; vn: string; createdAt: string; hasMedication: boolean; queueType: { id: string; code: string } }
  const fetchQueues = async (qsu: string): Promise<QueueRow[]> => {
    const q = `query Q($filter: QueueWithDetailFilterInput, $pagination: PaginationInput) { queueWithDetails(filter: $filter, pagination: $pagination) { data { id qDisplay latestStatusCode hn vn createdAt hasMedication queueType { id code } } } }`;
    const date = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    const res = await page.request.post('/cortex-api/graphql', { headers: { authorization: auth(), 'content-type': 'application/json' }, data: { query: q, variables: { filter: { queueServiceUnitId: qsu, date }, pagination: { page: 1, perPage: 200 } } } });
    const body = (await res.json()) as { data?: { queueWithDetails?: { data?: QueueRow[] } }; errors?: { message: string }[] };
    expect(body.errors, `API คิว QSU ${qsu}: ${body.errors?.map((e) => e.message).join(' · ')}`).toBeFalsy();
    return body.data?.queueWithDetails?.data ?? [];
  };
  const gotoQueueList = async () => {
    await page.goto('/cortex/cashier/queue-list', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /สร้างคิว/ })).toBeVisible({ timeout: 120_000 });
    await page.waitForTimeout(3_000);
  };
  const searchQueueHn = async (hn: string) => {
    const box = page.getByPlaceholder('ค้นหา HN').first();
    await box.fill(hn);
    await box.press('Enter');
    await page.waitForTimeout(6_000);
    return box;
  };

  return { failures, main, note, soft, auth, store, register, gotoEmr, cartRow, order, prepareOrders, setVisitStatus, nursePage, openDischarge, slipSection, slipRows, readSlip, fetchDestinations, showSlip, printSlip, fetchQueues, gotoQueueList, searchQueueHn, nurseOf: () => nurse };
}

/** ตรวจส่วนใบนำทางบนจอเทียบกับ API (จุดบริการ / สถานที่ / Order) */
function compareSlip(screen: { unit: string; location: string; orders: string }[], api: { serviceUnitName: string; locationName: string; orderNames: string[] }[]): CompareRow[] {
  const rows: CompareRow[] = [{ label: 'จำนวนจุดบริการ', values: [String(api.length), String(screen.length)], same: api.length === screen.length }];
  api.forEach((d, i) => {
    const s = screen[i];
    const want = `${d.serviceUnitName} · ${d.locationName} · ${d.orderNames.join(', ')}`;
    const got = s ? `${s.unit} · ${s.location} · ${s.orders}` : '(ไม่มี)';
    rows.push({ label: `จุดที่ ${i + 1}`, values: [want, got], same: !!s && squash(want) === squash(got) });
  });
  return rows;
}

test.describe('SBH-2233 ใบนำทางไปจุดบริการอื่น + คิวการเงิน / คิวจุดบริการ (OPD Discharge)', () => {
  test.describe.configure({ mode: 'default' });

  test('ผู้ป่วย A มียา: คิวการเงินอัตโนมัติ + tab หน้ารายการคิวการเงิน', meta(['001', '019']), async ({ page, browser }) => {
    test.setTimeout(1_800_000);
    const h = harness(page, browser);
    const A = await h.register('A', 'SlipA2233', [DRUG]);
    await h.prepareOrders(A);
    const beforeDischarge = (await h.fetchQueues(CASHIER_AUTO_QSU)).filter((q) => q.hn === A.hn);
    h.note('คิวการเงินของ A ก่อนจำหน่าย', beforeDischarge.map((q) => `${q.qDisplay} ${q.queueType.code} ${q.createdAt}`).join(' · ') || '(ไม่มี)');

    const nu = await h.nursePage();
    await startClip(nu, 'TC-001-จำหน่าย');
    await h.soft(nu, `${TC('001')} ขั้น 2 พยาบาลจำหน่ายผู้ป่วย A (มียา) → บันทึก Discharge`, async () => {
      const pg = await h.openDischarge(A);
      const save = pg.getByRole('main').getByRole('button', { name: /บันทึก/ }).filter({ visible: true }).last();
      await markEvidence(clicked(save));
      await snapEvidence(pg, 'ก่อนกด — บันทึก Discharge (A)');
      const saved = pg.waitForResponse((r) => r.request().method() === 'POST' && /graphql/.test(r.url()) && /mutation (UpsertOpdDischargeSummary|SaveOpdDischarge)/.test(r.request().postData() ?? ''), { timeout: 30_000 }).catch(() => undefined);
      await save.click();
      const res = await saved;
      h.note('บันทึก Discharge (A)', res ? `${res.status()} ${(await res.text()).slice(0, 200)}` : '(ไม่เห็นคำสั่งบันทึก)');
      await pg.waitForTimeout(3_000);
      await snapEvidence(pg, 'หลังกด — บันทึก Discharge (A)');
    });
    await startClip(page, 'TC-001');
    await h.soft(page, `${TC('001')} ขั้น 3 การเงิน → Cashier queue list ค้นหาผู้ป่วย A + คิวอัตโนมัติจาก API`, async () => {
      await h.gotoQueueList();
      const box = await h.searchQueueHn(A.hn);
      const list = (await page.getByRole('row').filter({ hasText: A.hn }).count()) > 0;
      const queues = (await h.fetchQueues(CASHIER_AUTO_QSU)).filter((q) => q.hn === A.hn);
      const room = (await h.fetchQueues(CASHIER_ROOM_QSU)).filter((q) => q.hn === A.hn);
      h.note('คิวการเงินของ A (API)', `QSU ${CASHIER_AUTO_QSU}: ${queues.map((q) => `${q.qDisplay} ${q.queueType.code} ${q.latestStatusCode} med=${q.hasMedication} ${q.createdAt}`).join(' · ') || '(ไม่มี)'} · QSU ${CASHIER_ROOM_QSU} (ห้องการเงินทดสอบ): ${room.length}`);
      await markEvidence(filled(box));
      await showCompareTable(page, 'TC-001 คิวการเงินอัตโนมัติของผู้ป่วยที่มียา', ['ที่ควรเป็น', 'ที่เห็น'], [
        { label: 'คิวใน API (QSU 327 การเงินอาคารราชนครินทร์)', values: ['มี 1 คิว', queues.length ? queues.map((q) => `${q.qDisplay} (${q.queueType.code}) ${q.latestStatusCode}`).join(', ') : 'ไม่มี'], same: queues.length > 0 },
        { label: 'คิวมียา (hasMedication)', values: ['true', String(queues[0]?.hasMedication ?? '-')], same: !!queues[0]?.hasMedication },
        { label: 'รายการคิวบนจอ (ห้องการเงินทดสอบ · QSU 18)', values: ['(ห้องนี้ไม่ใช่ QSU ของคิวอัตโนมัติ)', list ? 'มีแถวของ HN' : 'ไม่มีแถว'], same: true },
      ], { side: 'bottom' });
      await holdForClip(page, 2_500);
      await snapEvidence(page, 'TC-001 คิวการเงินอัตโนมัติ (API + จอ)');
      await hideCompareTable(page);
      expect(queues.length, 'ต้องมี Cashier Queue อัตโนมัติของผู้ป่วยที่มียา').toBeGreaterThan(0);
    });

    await startClip(page, 'TC-019');
    await h.soft(page, `${TC('019')} หน้า Cashier queue list มี tab OPD และ IPD`, async () => {
      await h.gotoQueueList();
      const tabs = (await page.getByRole('tab').filter({ visible: true }).allInnerTexts()).map(squash);
      h.note('tab ของหน้ารายการคิวการเงิน', tabs.join(' · '));
      await markEvidence(...(await page.getByRole('tab').filter({ visible: true }).all()).map(expected));
      await showCompareTable(page, 'TC-019 tab ของรายการคิว', ['ที่ควรเป็น', 'ที่เห็น'], [
        { label: 'tab OPD', values: ['มี', tabs.some((t) => /OPD/.test(t)) ? 'มี' : 'ไม่มี'], same: tabs.some((t) => /OPD/.test(t)) },
        { label: 'tab IPD', values: ['มี', tabs.some((t) => /IPD/.test(t)) ? 'มี' : 'ไม่มี'], same: tabs.some((t) => /IPD/.test(t)) },
        { label: 'tab ที่มีจริง', values: ['-', tabs.join(' / ')], same: true },
      ], { side: 'bottom' });
      await holdForClip(page, 2_500);
      await snapEvidence(page, 'TC-019 tab ของหน้ารายการคิวการเงิน');
      await hideCompareTable(page);
      expect(tabs.some((t) => /OPD/.test(t)) && tabs.some((t) => /IPD/.test(t)), `ต้องมี tab OPD และ IPD (ที่มี: ${tabs.join(' / ')})`).toBe(true);
    });
    if (h.nurseOf()) await finishVideo(h.nurseOf()!);
    expect(h.failures, h.failures.join('\n')).toEqual([]);
  });

  test('ผู้ป่วย B ไม่มียา (Lab + X-ray + Activity): ใบนำทาง · พิมพ์แยกจุด · ไม่มีคิวการเงิน · คิว Manual · คิวจุดบริการ', meta(['002', '003', '008', '011', '012', '013', '014', '015', '021', '016', '023', '017', '024']), async ({ page, browser }) => {
    test.setTimeout(3_000_000);
    const h = harness(page, browser);
    const B = await h.register('B', 'SlipB2233', [LAB_HBA1C, XRAY, ECG], true);
    await h.prepareOrders(B);
    const nu = await h.nursePage();
    let api: Awaited<ReturnType<typeof h.fetchDestinations>> = [];
    let screen: Awaited<ReturnType<typeof h.readSlip>> = [];

    await startClip(nu, 'TC-002');
    await h.soft(nu, `${TC('002')} พยาบาลจำหน่าย → การจัดการหลังตรวจ แสดงส่วนใบนำทางไปจุดบริการอื่น`, async () => {
      await h.openDischarge(B);
      const section = await h.showSlip(nu);
      await markEvidence(expected(section.getByText('ใบนำทางไปจุดบริการอื่น', { exact: true })));
      await holdForClip(nu, 1_500);
      await snapEvidence(nu, 'TC-002 ส่วนใบนำทางไปจุดบริการอื่น');
    });

    await startClip(nu, 'TC-008');
    await h.soft(nu, `${TC('008')} แสดง 3 จุดบริการ (Lab · X-ray · Activity) พร้อมชื่อจุดบริการ สถานที่ และรายการ Order`, async () => {
      const section = await h.showSlip(nu);
      screen = await h.readSlip(nu);
      api = await h.fetchDestinations(nu, B.vn);
      h.note('ใบนำทาง B (API)', JSON.stringify(api.map((d) => [d.destinationKind, d.queueServiceUnitId, d.locationId, d.serviceUnitName, d.locationName, d.orderNames, d.isPrintable])));
      const kinds = new Set(api.map((d) => d.destinationKind));
      const rows = compareSlip(screen, api);
      rows.unshift(
        { label: 'มีจุด Lab', values: ['มี', kinds.has('lab') ? 'มี' : 'ไม่มี'], same: kinds.has('lab') },
        { label: 'มีจุด X-ray', values: ['มี', kinds.has('imaging') ? 'มี' : 'ไม่มี'], same: kinds.has('imaging') },
        { label: 'มีจุด Activity', values: ['มี', [...kinds].some((k) => /activ/i.test(k)) ? 'มี' : 'ไม่มี'], same: [...kinds].some((k) => /activ/i.test(k)) },
        { label: 'จำนวนจุด (ควรเป็น 3)', values: ['3', String(screen.length)], same: screen.length === 3 },
      );
      await markEvidence(...(await h.slipRows(nu).all()).map(expected));
      await showCompareTable(nu, 'TC-008 จุดบริการของผู้ป่วย B (Lab + X-ray + Activity)', ['ที่ควรเป็น', 'บนจอ'], rows, { side: 'right', top: '160px', width: '760px' });
      await holdForClip(nu, 3_000);
      await snapEvidence(nu, 'TC-008 จุดบริการ สถานที่ Order');
      await hideCompareTable(nu);
      for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
      void section;
    });

    await startClip(nu, 'TC-021');
    await h.soft(nu, `${TC('021')} ส่วนใบนำทางไม่มีปุ่มพิมพ์บัตรคิวการเงิน (มีเฉพาะปุ่มพิมพ์ใบนำทาง)`, async () => {
      const section = await h.showSlip(nu);
      const buttons = (await section.getByRole('button').filter({ visible: true }).allInnerTexts()).map(squash).filter(Boolean);
      // นอกส่วนใบนำทาง: ปุ่มอื่นในหน้าที่มีคำว่า บัตรคิว / คิว (จดไว้เป็นข้อมูล — Expected พูดถึงส่วนใบนำทาง)
      const pageQueue = (await nu.getByRole('main').getByRole('button').filter({ visible: true }).filter({ hasText: /บัตรคิว|คิวการเงิน/ }).allInnerTexts()).map(squash);
      const ariaQueue = await nu.getByRole('main').locator('button[aria-label*="คิว"]').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? ''));
      h.note('ปุ่มในส่วนใบนำทาง (B)', `${buttons.join(' · ')} · ปุ่มเกี่ยวกับคิวในหน้า Discharge (นอกส่วนนี้): ${[...pageQueue, ...ariaQueue].join(' · ') || 'ไม่มี'}`);
      await markEvidence(...(await section.getByRole('button').filter({ visible: true }).filter({ hasText: /พิมพ์/ }).all()).map(expected));
      await snapEvidence(nu, 'TC-021 ปุ่มในส่วนใบนำทาง');
      expect(buttons.every((b) => /^พิมพ์(ใบนำทาง)?$/.test(b)), `ปุ่มในส่วนใบนำทางต้องมีแค่ พิมพ์ / พิมพ์ใบนำทาง (เห็น: ${buttons.join(' · ')})`).toBe(true);
    });

    let slip: { pdfs: Buffer[]; texts: string[]; sent: string } | undefined;
    await startClip(nu, 'TC-011');
    await h.soft(nu, `${TC('011')} กดพิมพ์ที่แถว X-ray → ได้ใบนำทาง 1 ใบ เฉพาะ X-ray`, async () => {
      await h.showSlip(nu);
      const row = h.slipRows(nu).filter({ hasText: /X-?ray|รังสี/i }).first();
      await expect(row, 'ต้องมีแถวจุดบริการ X-ray').toBeVisible({ timeout: 10_000 });
      const button = row.getByRole('button', { name: 'พิมพ์', exact: true });
      await markEvidence(clicked(button), expected(row));
      await snapEvidence(nu, 'ก่อนกด — พิมพ์ใบนำทาง X-ray');
      slip = await h.printSlip(nu, button, 'xray');
      const text = slip.texts.join(' ');
      const others = api.filter((d) => d.destinationKind !== 'imaging');
      const leaked = others.flatMap((d) => [...d.orderNames, d.locationName]).filter((t) => text.includes(t));
      const overlay = await showPdf(nu, slip.pdfs[0], 'ใบนำทาง X-ray ที่ส่งให้เครื่องพิมพ์');
      const marks: Locator[] = [];
      for (const t of [/หน่วยบริการ/, /สถานที่/, /รายการ/]) { const l = await pdfLineAt(overlay, t); if (l) marks.push(l); }
      await markEvidence(...marks.map(expected));
      await showCompareTable(nu, 'TC-011 พิมพ์ 1 จุดบริการ = 1 ใบ', ['ที่ควรเป็น', 'ที่ได้'], [
        { label: 'จำนวนใบ', values: ['1', String(slip.pdfs.length)], same: slip.pdfs.length === 1 },
        { label: 'Order ของ X-ray', values: ['CHEST', /CHEST/.test(text) ? 'มี' : 'ไม่มี'], same: /CHEST/.test(text) },
        { label: 'Order / สถานที่ของจุดอื่น', values: ['ไม่มี', leaked.join(', ') || 'ไม่มี'], same: leaked.length === 0 },
      ], { side: 'left' });
      await holdForClip(nu, 3_000);
      await snapEvidence(nu, 'TC-011 ใบนำทาง X-ray');
      await hideCompareTable(nu);
      await hidePdf(nu);
      expect(slip.pdfs.length, 'กดพิมพ์ 1 จุดต้องได้ใบนำทาง 1 ใบ').toBe(1);
      expect(leaked, 'ใบนำทาง X-ray ต้องไม่มี Order / สถานที่ของจุดอื่น').toEqual([]);
    });

    /** แสดงใบนำทางที่พิมพ์ซ้อนจอ + ตีกรอบบรรทัดที่ TC พูดถึง + ตารางเทียบ */
    const slipCheck = async (n: string, title: string, rows: CompareRow[], lines: (string | RegExp)[]) => {
      expect(slip, 'ต้องมีใบนำทางจาก TC-011').toBeTruthy();
      const overlay = await showPdf(nu, slip!.pdfs[0], 'ใบนำทาง X-ray (จาก TC-011)');
      const marks: Locator[] = [];
      for (const t of lines) { const l = await pdfLineAt(overlay, t); if (l) marks.push(l); }
      await markEvidence(...marks.map(expected));
      await showCompareTable(nu, `TC-${n} ${title}`, ['ที่ควรเป็น', 'ในใบนำทาง'], rows, { side: 'left' });
      await holdForClip(nu, 3_000);
      await snapEvidence(nu, `TC-${n} ${title}`);
      await hideCompareTable(nu);
      await hidePdf(nu);
      for (const r of rows) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
    };
    const t = () => slip?.texts.join(' ') ?? '';
    const [bd, bm, by] = B.birth.split('/');
    const birthForms = [B.birth, `${Number(bd)} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][Number(bm) - 1]} ${by}`];

    await startClip(nu, 'TC-012');
    await h.soft(nu, `${TC('012')} ใบนำทางมี Logo โรงพยาบาลสระบุรี · Barcode HN · HN · ชื่อ · วันเกิด · VN`, async () => {
      const head = t().slice(0, 60);
      await slipCheck('012', 'ข้อมูลผู้ป่วยในใบนำทาง', [
        { label: 'ชื่อโรงพยาบาล / Logo', values: ['โรงพยาบาลสระบุรี', /สระบุรี/.test(head) ? 'สระบุรี' : head.split(' ')[0]], same: /สระบุรี/.test(head) },
        { label: 'HN', values: [B.hn, t().includes(`HN ${B.hn}`) ? B.hn : '(ไม่พบ)'], same: t().includes(`HN ${B.hn}`) },
        { label: 'ชื่อ–นามสกุล', values: [B.name, t().includes(B.name) ? 'ตรง' : '(ไม่พบ)'], same: t().includes(B.name) },
        { label: 'วันเดือนปีเกิด', values: [birthForms.join(' / '), birthForms.find((f) => t().includes(f)) ?? (t().match(/อายุ[^|]*/)?.[0] ?? '(ไม่พบ)')], same: birthForms.some((f) => t().includes(f)) },
        { label: 'VN', values: [B.vn, t().includes(B.vn) ? B.vn : '(ไม่พบ)'], same: t().includes(B.vn) },
        { label: 'Barcode HN', values: ['มี', '(ดูจากภาพ)'], same: true },
      ], [/^HN /, /โรงพยาบาล/, /อายุ|เกิด/, /^VN /]);
    });

    await startClip(nu, 'TC-013');
    await h.soft(nu, `${TC('013')} ใบนำทางมีหน่วยบริการ สถานที่ รายการ Order และแพทย์ผู้สั่ง`, async () => {
      const x = api.find((d) => d.destinationKind === 'imaging');
      const doctor = (t().match(/แพทย์\s*:\s*(.*?)\s*(?:รายการ|สิทธิ|Check-in|$)/)?.[1] ?? '').trim();
      await slipCheck('013', 'ข้อมูลปลายทางในใบนำทาง', [
        { label: 'หน่วยบริการ', values: [x?.serviceUnitName ?? '-', t().includes(`หน่วยบริการ : ${x?.serviceUnitName}`) ? 'ตรง' : '(ไม่ตรง)'], same: !!x && t().includes(`หน่วยบริการ : ${x.serviceUnitName}`) },
        { label: 'สถานที่', values: [x?.locationName ?? '-', t().includes(`สถานที่ : ${x?.locationName}`) ? 'ตรง' : '(ไม่ตรง)'], same: !!x && t().includes(`สถานที่ : ${x.locationName}`) },
        { label: 'รายการ Order', values: [x?.orderNames.join(', ') ?? '-', /CHEST/.test(t()) ? 'มี' : 'ไม่มี'], same: /CHEST/.test(t()) },
        { label: 'แพทย์ผู้สั่ง Order', values: ['ชื่อแพทย์ผู้สั่ง', doctor || '(ไม่พบ)'], same: !!doctor && doctor !== '-' },
      ], [/หน่วยบริการ/, /สถานที่/, /แพทย์/, /รายการ/]);
    });

    await startClip(nu, 'TC-014');
    await h.soft(nu, `${TC('014')} ใบนำทางแสดงสิทธิ์หลักและสิทธิ์รองตรงกับ Visit`, async () => {
      const main = t().match(/สิทธิ[์]?หลัก\s*:\s*([^:]+?)(?=สิทธิ|$)/)?.[1]?.trim() ?? '';
      const second = t().match(/สิทธิ[์]?รอง\s*:\s*([^:]+?)(?=Check|Print|รายการ|$)/)?.[1]?.trim() ?? '';
      const cov = B.coverages ?? [];
      await slipCheck('014', 'สิทธิ์ในใบนำทาง', [
        { label: 'สิทธิ์หลัก', values: [cov[0] ?? COVERAGE_MAIN, main || '(ไม่พบ)'], same: !!main && main.includes((cov[0] ?? COVERAGE_MAIN).split(' - ')[0]) },
        { label: 'สิทธิ์รอง', values: [cov[1] ?? '(สิทธิ์ลำดับ 2)', second || '(ไม่พบ)'], same: !!second && second !== '-' },
      ], [/สิทธิ/]);
    });

    await startClip(nu, 'TC-015');
    await h.soft(nu, `${TC('015')} ใบนำทางไม่มีบรรทัดเวลานัดหมาย`, async () => {
      await slipCheck('015', 'ไม่มีเวลานัดหมาย', [{ label: 'บรรทัด "เวลานัดหมาย"', values: ['ไม่มี', /เวลานัดหมาย/.test(t()) ? `มี (${t().match(/เวลานัดหมาย\s*:\s*\S*/)?.[0]})` : 'ไม่มี'], same: !/เวลานัดหมาย/.test(t()) }], [/เวลานัดหมาย/]);
    });

    await startClip(nu, 'พัก-หลัง-TC-015'); // ปิดคลิป TC-015 ของหน้าต่าง Nurse (ไม่ให้ยาวถึงจบเทส)
    await startClip(page, 'TC-003');
    await h.soft(page, `${TC('003')} การเงิน → Cashier queue list ค้นหาผู้ป่วย B — ไม่มีคิวการเงินอัตโนมัติ`, async () => {
      await h.gotoQueueList();
      const box = await h.searchQueueHn(B.hn);
      const auto = (await h.fetchQueues(CASHIER_AUTO_QSU)).filter((q) => q.hn === B.hn);
      const room = (await h.fetchQueues(CASHIER_ROOM_QSU)).filter((q) => q.hn === B.hn);
      const list = await page.getByRole('row').filter({ hasText: B.hn }).count();
      h.note('คิวการเงินของ B (API)', `QSU ${CASHIER_AUTO_QSU}: ${auto.length} · QSU ${CASHIER_ROOM_QSU}: ${room.length} · แถวบนจอ ${list}`);
      await markEvidence(filled(box));
      await showCompareTable(page, 'TC-003 ไม่มีคิวการเงินอัตโนมัติ (ไม่มียา)', ['ที่ควรเป็น', 'ที่เห็น'], [
        { label: 'คิวใน API (QSU 327 — คิวอัตโนมัติ)', values: ['ไม่มี', auto.length ? auto.map((q) => q.qDisplay).join(', ') : 'ไม่มี'], same: auto.length === 0 },
        { label: 'คิวใน API (QSU 18 — ห้องการเงินทดสอบ)', values: ['ไม่มี', room.length ? room.map((q) => q.qDisplay).join(', ') : 'ไม่มี'], same: room.length === 0 },
        { label: 'แถวบนรายการคิว', values: ['ไม่มี', list ? `${list} แถว` : 'ไม่มี'], same: list === 0 },
      ], { side: 'bottom' });
      await holdForClip(page, 2_500);
      await snapEvidence(page, 'TC-003 ไม่มีคิวการเงินของผู้ป่วย B');
      await hideCompareTable(page);
      expect(auto.length + room.length, 'ผู้ป่วยไม่มียาต้องไม่มีคิวการเงินอัตโนมัติ').toBe(0);
    });

    let manual: { qDisplay: string; createdAt: string } | undefined;
    await startClip(page, 'TC-016');
    await h.soft(page, `${TC('016')} ปุ่มสร้างคิว → กรอก HN + ประเภทคิว → คิวของผู้ป่วย B แสดงในรายการคิว`, async () => {
      await h.gotoQueueList();
      const create = page.getByRole('button', { name: /สร้างคิว/ }).first();
      await markEvidence(clicked(create));
      await snapEvidence(page, 'ก่อนกด — สร้างคิว');
      await create.click();
      const dialog = page.getByRole('dialog').filter({ hasText: 'สร้างคิวการเงิน' });
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      const hnBox = dialog.getByRole('textbox').first();
      await hnBox.fill(B.hn);
      const type = dialog.getByRole('combobox').last();
      await type.click();
      const first = options(page).first();
      await expect(first, 'ต้องมีประเภทคิวให้เลือก').toBeVisible({ timeout: 10_000 });
      const typeName = squash(await first.innerText());
      await first.click();
      const submit = dialog.getByRole('button', { name: 'สร้างคิว', exact: true });
      await markEvidence(filled(hnBox), filled(dialog.locator('.ant-select').last()), clicked(submit));
      await snapEvidence(page, 'ก่อนกด — ยืนยันสร้างคิว');
      const created = page.waitForResponse((r) => r.request().method() === 'POST' && /\/queues$/.test(new URL(r.url()).pathname), { timeout: 30_000 });
      await submit.click();
      const res = await created;
      const body = (await res.json().catch(() => ({}))) as { qDisplay?: string; data?: { qDisplay?: string } };
      h.note('สร้างคิว Manual (B)', `${res.status()} ประเภทคิว ${typeName} · ${JSON.stringify(body).slice(0, 300)}`);
      expect(res.ok(), `สร้างคิวไม่สำเร็จ (${res.status()})`).toBe(true);
      const toast = page.locator('.ant-message-notice').filter({ hasText: /สร้างคิว/ }).first();
      await toast.waitFor({ timeout: 10_000 }).catch(() => undefined);
      if (await toast.isVisible().catch(() => false)) { await markEvidence(expected(toast)); await snapEvidence(page, 'หลังกด — สร้างคิวสำเร็จ'); }
      await h.searchQueueHn(B.hn);
      const row = page.getByRole('row').filter({ hasText: B.hn }).first();
      await expect(row, 'คิวของผู้ป่วย B ต้องแสดงในรายการคิวการเงิน').toBeVisible({ timeout: 30_000 });
      await markEvidence(expected(row));
      await holdForClip(page, 2_000);
      await snapEvidence(page, 'TC-016 คิวของผู้ป่วย B ในรายการคิว');
      const room = (await h.fetchQueues(CASHIER_ROOM_QSU)).filter((q) => q.hn === B.hn);
      manual = room[0];
    });

    await startClip(page, 'TC-023');
    await h.soft(page, `${TC('023')} ลำดับคิวการเงิน: ผู้ป่วย A (คิวอัตโนมัติ) อยู่ก่อน B (คิว Manual)`, async () => {
      const A = loadAny().A;
      expect(A, 'ต้องรันเทสผู้ป่วย A (@SBH-2732) ก่อน').toBeTruthy();
      const auto = (await h.fetchQueues(CASHIER_AUTO_QSU)).filter((q) => q.hn === A.hn);
      const room = await h.fetchQueues(CASHIER_ROOM_QSU);
      const a = auto[0];
      const b = manual ?? room.find((q) => q.hn === B.hn);
      await h.gotoQueueList();
      const rows = page.getByRole('row').filter({ hasText: new RegExp(`${A.hn}|${B.hn}`) });
      const onScreen = (await rows.allInnerTexts()).map((r) => (r.includes(A.hn) ? 'A' : 'B'));
      h.note('ลำดับคิว (A / B)', `A ${a?.qDisplay} QSU ${CASHIER_AUTO_QSU} ${a?.createdAt} · B ${b?.qDisplay} QSU ${CASHIER_ROOM_QSU} ${b?.createdAt} · บนจอ ${onScreen.join(' → ') || '-'}`);
      for (const r of await rows.all()) await markEvidence(expected(r));
      await showCompareTable(page, 'TC-023 ลำดับคิว A (อัตโนมัติ) / B (Manual)', ['ที่ควรเป็น', 'ที่เห็น'], [
        { label: 'คิว A', values: ['เกิดก่อน', a ? `${a.qDisplay} · ${a.createdAt} (QSU 327)` : 'ไม่มี'], same: !!a },
        { label: 'คิว B', values: ['เกิดทีหลัง', b ? `${b.qDisplay} · ${b.createdAt} (QSU 18)` : 'ไม่มี'], same: !!b },
        { label: 'A ก่อน B (เวลาเกิดคิว)', values: ['ใช่', a && b ? (a.createdAt < b.createdAt ? 'ใช่' : 'ไม่ใช่') : '-'], same: !!a && !!b && a.createdAt < b.createdAt },
        { label: 'อยู่ในรายการคิวเดียวกัน', values: ['ใช่', onScreen.length === 2 ? 'ใช่' : `ไม่ใช่ (บนจอ ${onScreen.join(', ') || 'ไม่มี'})`], same: onScreen.length === 2 },
      ], { side: 'bottom' });
      await holdForClip(page, 3_000);
      await snapEvidence(page, 'TC-023 ลำดับคิวการเงิน A / B');
      await hideCompareTable(page);
      expect(onScreen, 'A ต้องอยู่ลำดับก่อน B ในรายการคิวการเงิน').toEqual(['A', 'B']);
    });

    await startClip(page, 'TC-017');
    await h.soft(page, `${TC('017')} ห้อง Lab เช็คอินผู้ป่วย B ตามใบนำทาง → เกิดคิว`, async () => {
      const q = await labCheckIn(page, B.hn, h.note);
      expect(q, 'เช็คอินแล้วต้องได้หมายเลขคิว').toBeTruthy();
    });

    await startClip(page, 'TC-024');
    await h.soft(page, `${TC('024')} ห้อง X-ray เช็คอินผู้ป่วย B ตามใบนำทาง → เกิดคิว`, async () => {
      const x = api.find((d) => d.destinationKind === 'imaging');
      const q = await imagingCheckIn(page, B.hn, x?.serviceUnitName ?? 'ห้อง(X-ray)', h.note);
      expect(q, 'เช็คอินแล้วต้องได้หมายเลขคิว').toBeTruthy();
    });

    await finishVideo(nu);
    expect(h.failures, h.failures.join('\n')).toEqual([]);
  });

  test('ผู้ป่วย C (Lab 3 รายการห้องเดียวกัน) + G (Lab QSU เดียวกันคนละห้อง): ปุ่มใบนำทาง Lab · รวม / แยกจุด · คิว Lab FIFO', meta(['004', '009', '010', '018']), async ({ page, browser }) => {
    test.setTimeout(2_400_000);
    const h = harness(page, browser);
    const C = await h.register('C', 'SlipC2233', [LAB_HBA1C, LAB_GLU, LAB_MALB]);
    const G = await h.register('G', 'SlipG2233', [LAB_GLU, LAB_HBTYPE]);
    await h.prepareOrders(C);
    await h.prepareOrders(G);
    const nu = await h.nursePage();

    await startClip(nu, 'TC-004');
    await h.soft(nu, `${TC('004')} Visit มีเฉพาะ Lab → แสดงจุดบริการ Lab พร้อมปุ่มพิมพ์ใบนำทาง`, async () => {
      await h.openDischarge(C);
      await h.showSlip(nu);
      const screen = await h.readSlip(nu);
      const api = await h.fetchDestinations(nu, C.vn);
      h.note('ใบนำทาง C (API)', JSON.stringify(api.map((d) => [d.destinationKind, d.queueServiceUnitId, d.locationId, d.serviceUnitName, d.locationName, d.orderNames])));
      const lab = api.filter((d) => d.destinationKind === 'lab');
      const printOne = h.slipRows(nu).getByRole('button', { name: 'พิมพ์', exact: true });
      await markEvidence(...(await h.slipRows(nu).all()).map(expected), ...(await printOne.all()).map(clicked));
      await showCompareTable(nu, 'TC-004 จุดบริการ Lab', ['ที่ควรเป็น', 'บนจอ'], [
        { label: 'จุดบริการ Lab', values: ['มี', lab.length ? lab.map((d) => d.serviceUnitName).join(', ') : 'ไม่มี'], same: lab.length > 0 },
        { label: 'ปุ่มพิมพ์ใบนำทาง', values: ['มี', screen.some((s) => s.printable) ? 'มี' : 'ไม่มี'], same: screen.some((s) => s.printable) },
      ], { side: 'right', top: '160px', width: '760px' });
      await holdForClip(nu, 2_500);
      await snapEvidence(nu, 'TC-004 จุดบริการ Lab + ปุ่มพิมพ์');
      await hideCompareTable(nu);
      expect(lab.length && screen.some((s) => s.printable), 'ต้องมีจุดบริการ Lab พร้อมปุ่มพิมพ์').toBeTruthy();
    });

    await startClip(nu, 'TC-009');
    await h.soft(nu, `${TC('009')} Lab 3 รายการที่ไปห้องเดียวกัน → 1 จุดบริการ มีทั้ง 3 รายการ`, async () => {
      await h.showSlip(nu);
      const screen = await h.readSlip(nu);
      const api = await h.fetchDestinations(nu, C.vn);
      const rows = compareSlip(screen, api);
      rows.unshift({ label: 'จำนวนจุด (ควรเป็น 1)', values: ['1', String(screen.length)], same: screen.length === 1 }, { label: 'Order ในจุดเดียว (ควรเป็น 3)', values: ['3', String(api[0]?.orderNames.length ?? 0)], same: api.length === 1 && api[0].orderNames.length === 3 });
      await markEvidence(...(await h.slipRows(nu).all()).map(expected));
      await showCompareTable(nu, 'TC-009 รวม Order ที่ไปห้องเดียวกัน', ['ที่ควรเป็น', 'บนจอ'], rows, { side: 'right', top: '160px', width: '760px' });
      await holdForClip(nu, 3_000);
      await snapEvidence(nu, 'TC-009 1 จุดบริการ 3 Order');
      await hideCompareTable(nu);
      for (const r of rows.slice(0, 2)) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
    });

    await startClip(nu, 'TC-010');
    await h.soft(nu, `${TC('010')} Lab QSU เดียวกันคนละห้อง → แสดง 2 จุดบริการแยกตามสถานที่`, async () => {
      await h.openDischarge(G);
      await h.showSlip(nu);
      const screen = await h.readSlip(nu);
      const api = await h.fetchDestinations(nu, G.vn);
      h.note('ใบนำทาง G (API)', JSON.stringify(api.map((d) => [d.destinationKind, d.queueServiceUnitId, d.locationId, d.serviceUnitName, d.locationName, d.orderNames])));
      const lab = api.filter((d) => d.destinationKind === 'lab');
      const sameQsu = lab.length === 2 && lab[0].queueServiceUnitId === lab[1].queueServiceUnitId;
      const diffLoc = lab.length === 2 && lab[0].locationId !== lab[1].locationId;
      const rows = compareSlip(screen, api);
      rows.unshift(
        { label: 'จำนวนจุด (ควรเป็น 2)', values: ['2', String(screen.length)], same: screen.length === 2 },
        { label: 'QSU เดียวกัน', values: ['ใช่', lab.map((d) => d.queueServiceUnitId).join(' / ') || '-'], same: sameQsu },
        { label: 'สถานที่ต่างกัน', values: ['ใช่', lab.map((d) => d.locationName).join(' / ') || '-'], same: diffLoc },
      );
      await markEvidence(...(await h.slipRows(nu).all()).map(expected));
      await showCompareTable(nu, 'TC-010 แยกจุดตามสถานที่ (QSU เดียวกัน)', ['ที่ควรเป็น', 'บนจอ / API'], rows, { side: 'right', top: '160px', width: '760px' });
      await holdForClip(nu, 3_000);
      await snapEvidence(nu, 'TC-010 2 จุดบริการ คนละสถานที่');
      await hideCompareTable(nu);
      for (const r of rows.slice(0, 3)) expect(r.same, `${r.label}: ควรเป็น ${r.values[0]} แต่เป็น ${r.values[1]}`).toBe(true);
    });

    await startClip(page, 'TC-018');
    await h.soft(page, `${TC('018')} ห้อง Lab เช็คอิน C แล้ว G → ลำดับคิว C ก่อน G (FIFO)`, async () => {
      const qc = await labCheckIn(page, C.hn, h.note);
      const qg = await labCheckIn(page, G.hn, h.note);
      const queues = await h.fetchQueues('2');
      const ic = queues.findIndex((q) => q.hn === C.hn);
      const ig = queues.findIndex((q) => q.hn === G.hn);
      const c = queues[ic];
      const g = queues[ig];
      h.note('คิว Lab (QSU 2)', `C ${qc} ${c?.createdAt} · G ${qg} ${g?.createdAt} · ลำดับใน API ${ic} / ${ig}`);
      await showCompareTable(page, 'TC-018 ลำดับคิว Lab (FIFO)', ['ที่ควรเป็น', 'ที่ได้'], [
        { label: 'คิว C (เช็คอินก่อน)', values: ['ลำดับก่อน', `${qc ?? '-'} · ${c?.createdAt ?? '-'}`], same: !!qc },
        { label: 'คิว G (เช็คอินทีหลัง)', values: ['ลำดับหลัง', `${qg ?? '-'} · ${g?.createdAt ?? '-'}`], same: !!qg },
        { label: 'C ก่อน G', values: ['ใช่', c && g ? (c.createdAt < g.createdAt && (qc ?? '') < (qg ?? '') ? 'ใช่' : 'ไม่ใช่') : '-'], same: !!c && !!g && c.createdAt < g.createdAt && (qc ?? '') < (qg ?? '') },
      ], { side: 'bottom' });
      await holdForClip(page, 3_000);
      await snapEvidence(page, 'TC-018 ลำดับคิว Lab');
      await hideCompareTable(page);
      expect(!!c && !!g && c.createdAt < g.createdAt, 'คิว C ต้องอยู่ก่อนคิว G').toBe(true);
    });
    await finishVideo(nu);
    expect(h.failures, h.failures.join('\n')).toEqual([]);
  });

  test('ผู้ป่วย D (X-ray) · E (Ultrasound) · F (Activity): ปุ่มพิมพ์ใบนำทางแยกตามประเภท Order', meta(['005', '006', '007']), async ({ page, browser }) => {
    test.setTimeout(2_400_000);
    const h = harness(page, browser);
    const cases = [
      { n: '005', key: 'D', label: 'SlipD2233', code: XRAY, kind: 'imaging', title: 'X-ray' },
      { n: '006', key: 'E', label: 'SlipE2233', code: US, kind: 'imaging', title: 'Image (Ultrasound)' },
      { n: '007', key: 'F', label: 'SlipF2233', code: ECG, kind: 'activity', title: 'Activity (ECG)' },
    ];
    const patients = [];
    for (const c of cases) patients.push(await h.register(c.key, c.label, [c.code]));
    for (const p of patients) await h.prepareOrders(p);
    const nu = await h.nursePage();
    for (const [i, c] of cases.entries()) {
      const p = patients[i];
      await startClip(nu, `TC-${c.n}`);
      await h.soft(nu, `${TC(c.n)} Visit มีเฉพาะ ${c.title} → แสดงจุดบริการพร้อมปุ่มพิมพ์ใบนำทาง`, async () => {
        await h.openDischarge(p);
        const section = await h.showSlip(nu);
        const screen = await h.readSlip(nu);
        const api = await h.fetchDestinations(nu, p.vn);
        h.note(`ใบนำทาง ${p.key} (API)`, JSON.stringify(api.map((d) => [d.destinationKind, d.queueServiceUnitId, d.locationId, d.serviceUnitName, d.locationName, d.orderNames])) || '[]');
        const hit = api.filter((d) => (c.kind === 'activity' ? /activ/i.test(d.destinationKind) : d.destinationKind === c.kind));
        const empty = await section.getByText(/ไม่มีจุดบริการถัดไป/).count();
        const rowsL = await h.slipRows(nu).all();
        await markEvidence(...(rowsL.length ? rowsL.map(expected) : [expected(section)]));
        await showCompareTable(nu, `TC-${c.n} จุดบริการของ ${c.title}`, ['ที่ควรเป็น', 'บนจอ / API'], [
          { label: `จุดบริการ ${c.title}`, values: ['มี', hit.length ? hit.map((d) => `${d.serviceUnitName} · ${d.locationName}`).join(', ') : empty ? 'ไม่มี ("ไม่มีจุดบริการถัดไป")' : 'ไม่มี'], same: hit.length > 0 },
          { label: 'สถานที่', values: ['มี', hit[0]?.locationName ?? '-'], same: !!hit[0]?.locationName },
          { label: 'ปุ่มพิมพ์', values: ['มี', screen.some((s) => s.printable) ? 'มี' : 'ไม่มี'], same: screen.some((s) => s.printable) },
        ], { side: 'right', top: '160px', width: '760px' });
        await holdForClip(nu, 3_000);
        await snapEvidence(nu, `TC-${c.n} จุดบริการ ${c.title}`);
        await hideCompareTable(nu);
        expect(hit.length && screen.some((s) => s.printable), `ต้องมีจุดบริการของ ${c.title} พร้อมปุ่มพิมพ์`).toBeTruthy();
      });
    }
    await finishVideo(nu);
    expect(h.failures, h.failures.join('\n')).toEqual([]);
  });

  test('ผู้ป่วย H ไม่มี Order ที่รองรับ: Order ที่หาสถานที่ไม่ได้ · ไม่แสดงปุ่มพิมพ์ใบนำทาง', meta(['022', '020']), async ({ page, browser }) => {
    test.setTimeout(1_800_000);
    const h = harness(page, browser);
    const H = await h.register('H', 'SlipH2233', []);
    await startClip(page, 'TC-022');
    await h.soft(page, `${TC('022')} สั่ง Order ที่ Category ไม่มีสถานที่ (TEST-IMG-OTHER) → ระบบไม่เดาห้องปลายทาง`, async () => {
      await h.gotoEmr(page, H);
      const errors = await h.order([NO_LOCATION], true);
      const row = h.cartRow(NO_LOCATION);
      h.note('ส่งคำสั่ง TEST-IMG-OTHER', errors.join(' · ') || '(ไม่มี error)');
      const notice = page.locator('.ant-notification-notice, .ant-message-notice').filter({ visible: true }).first();
      await markEvidence(expected(row), ...((await notice.isVisible().catch(() => false)) ? [expected(notice)] : []));
      const api = await h.fetchDestinations(page, H.vn);
      await showCompareTable(page, 'TC-022 Order ที่หาสถานที่ไม่ได้', ['ที่ควรเป็น', 'ที่ได้'], [
        { label: 'ห้องปลายทางที่เดาเอง', values: ['ไม่มี', api.length ? api.map((d) => d.locationName).join(', ') : 'ไม่มี'], same: api.every((d) => !d.isPrintable) },
        { label: 'แจ้งข้อมูลสถานที่ไม่ครบ', values: ['แจ้ง', errors.length ? errors.join(' · ').slice(0, 160) : 'ไม่มี'], same: errors.length > 0 },
        { label: 'สถานะ Order', values: ['-', (await row.locator('[class*="status-dot"]').first().getAttribute('class').catch(() => ''))?.match(/status-dot-[a-z-]+/)?.[0] ?? '-'], same: true },
      ], { side: 'bottom' });
      await holdForClip(page, 3_000);
      await snapEvidence(page, 'TC-022 ส่งคำสั่ง Order ที่ไม่มีสถานที่');
      await hideCompareTable(page);
      // เอารายการออกจากตะกร้า — ผู้ป่วย H ต้องไม่มี Order ที่รองรับสำหรับ TC-020
      if (await row.isVisible().catch(() => false)) {
        await row.getByRole('button', { name: 'ยกเลิก' }).click();
        await page.locator('.ant-popover:visible, .ant-popconfirm:visible').getByRole('button', { name: 'ยืนยัน' }).click();
        await page.waitForTimeout(3_000);
      }
    });
    await h.prepareOrders({ ...H, orders: [] });
    const nu = await h.nursePage();
    await startClip(nu, 'TC-020');
    await h.soft(nu, `${TC('020')} Visit ไม่มี Order ที่รองรับ → ไม่แสดงปุ่มพิมพ์ใบนำทาง`, async () => {
      await h.openDischarge(H);
      const section = h.slipSection(nu);
      const has = await section.isVisible().catch(() => false);
      if (has) await section.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      const printAll = section.getByRole('button', { name: /พิมพ์ใบนำทาง/ });
      const visible = has && (await printAll.isVisible().catch(() => false));
      const enabled = visible && (await printAll.isEnabled().catch(() => false));
      const empty = has ? squash((await section.innerText().catch(() => '')).replace('ใบนำทางไปจุดบริการอื่น', '').replace('พิมพ์ใบนำทาง', '')) : '';
      h.note('ส่วนใบนำทาง (H)', `แสดงส่วน: ${has} · ปุ่มพิมพ์ใบนำทาง: ${visible ? (enabled ? 'กดได้' : 'แสดงแต่กดไม่ได้') : 'ไม่แสดง'} · ข้อความ: ${empty}`);
      await markEvidence(...(has ? [expected(section), ...(visible ? [expected(printAll)] : [])] : [expected(nu.getByRole('main').getByText('การจัดการหลังตรวจ', { exact: true }))]));
      await showCompareTable(nu, 'TC-020 ไม่มี Order ที่รองรับ', ['ที่ควรเป็น', 'บนจอ'], [
        { label: 'ปุ่มพิมพ์ใบนำทาง', values: ['ไม่แสดง', visible ? (enabled ? 'แสดง · กดได้' : 'แสดง · กดไม่ได้ (disabled)') : 'ไม่แสดง'], same: !visible },
        { label: 'ข้อความในส่วนใบนำทาง', values: ['-', empty || (has ? '(ว่าง)' : 'ไม่มีส่วนใบนำทาง')], same: true },
      ], { side: 'right', top: '160px', width: '760px' });
      await holdForClip(nu, 3_000);
      await snapEvidence(nu, 'TC-020 ไม่มีปุ่มพิมพ์ใบนำทาง');
      await hideCompareTable(nu);
      expect(visible, 'Visit ที่ไม่มี Order ที่รองรับต้องไม่แสดงปุ่มพิมพ์ใบนำทาง').toBe(false);
    });
    await finishVideo(nu);
    expect(h.failures, h.failures.join('\n')).toEqual([]);
  });
});

/** ห้อง Lab: เลือกห้อง → รายการงานแล็บ (รอเช็คอิน) → ค้น HN → เช็คอิน (ประเภทคิว) → คืนหมายเลขคิว */
async function labCheckIn(page: Page, hn: string, note: (t: string, d: string) => void): Promise<string | undefined> {
  if (!/\/lab\/task-list/.test(page.url())) {
    await page.goto('/cortex/lab/select-location', { waitUntil: 'domcontentloaded' });
    const main = page.getByRole('main');
    const room = main.getByRole('combobox').first();
    await room.waitFor({ timeout: 120_000 });
    await room.click();
    await options(page).filter({ hasText: new RegExp(`^${LAB_ROOM}$`) }).first().click();
    if ((await main.getByRole('combobox').count()) > 1) {
      await main.getByRole('combobox').nth(1).click();
      await page.waitForTimeout(800);
      await page.keyboard.press('Enter');
    }
    await page.getByRole('button', { name: 'ส่ง' }).click();
    await page.waitForURL(/\/lab\/task-list/, { timeout: 60_000 });
  }
  await page.getByRole('tab', { name: /รอเช็คอิน/ }).click().catch(() => undefined);
  const search = page.getByPlaceholder('ค้นหา HN').first();
  await search.fill(hn);
  await search.press('Enter');
  // ตารางของหน้านี้ไม่มี role row — ค้น HN แล้วเหลือแถวของผู้ป่วยรายนี้ → ปุ่มเช็คอินตัวแรก
  const row = page.getByText(hn, { exact: true }).filter({ visible: true }).first();
  await expect(row, `งาน Lab ของ HN ${hn} ต้องอยู่แท็บรอเช็คอิน`).toBeVisible({ timeout: 60_000 });
  const button = page.getByRole('button', { name: 'เช็คอิน', exact: true }).filter({ visible: true }).first();
  await markEvidence(expected(row), clicked(button));
  await snapEvidence(page, `ก่อนกด — เช็คอิน Lab (HN ${hn})`);
  await button.click();
  const dialog = page.getByRole('dialog').filter({ visible: true }).filter({ hasText: 'ประเภทคิว' });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  // ต้องเลือกประเภทคิวก่อน ปุ่มยืนยันจึงกดได้
  const type = dialog.getByRole('radio').first();
  await type.check({ force: true });
  const typeName = squash((await dialog.locator('.ant-radio-wrapper').first().innerText().catch(() => '')) || '');
  const confirm = dialog.getByRole('button', { name: 'ยืนยัน' });
  await expect(confirm).toBeEnabled({ timeout: 10_000 });
  await markEvidence(filled(dialog.locator('.ant-radio-wrapper').first()), clicked(confirm));
  note(`ประเภทคิว Lab (HN ${hn})`, typeName);
  await snapEvidence(page, `ก่อนกด — ยืนยันประเภทคิว Lab (HN ${hn})`);
  const res = page.waitForResponse((r) => r.request().method() === 'POST' && /lab-tasks\/check-in/.test(r.url()), { timeout: 60_000 });
  await confirm.click();
  const body = (await (await res).json().catch(() => ({}))) as { qDisplay?: string; queueServiceUnitId?: number; queueTypeId?: number };
  note(`เช็คอิน Lab HN ${hn}`, JSON.stringify(body).slice(0, 300));
  await page.waitForTimeout(3_000);
  await snapEvidence(page, `หลังกด — เช็คอิน Lab ได้คิว ${body.qDisplay ?? '-'} (HN ${hn})`);
  return body.qDisplay;
}

/** ห้องรังสี: เลือกห้องตามสถานที่ในใบนำทาง → รายการงาน → ค้น HN → เช็คอิน → คืนหมายเลขคิว */
async function imagingCheckIn(page: Page, hn: string, room: string, note: (t: string, d: string) => void): Promise<string | undefined> {
  await page.goto('/cortex/imaging/select-location', { waitUntil: 'domcontentloaded' });
  const main = page.getByRole('main');
  const combo = main.getByRole('combobox').first();
  await combo.waitFor({ timeout: 120_000 });
  await combo.click();
  await page.waitForTimeout(1_000);
  const all = (await options(page).allInnerTexts()).map(squash);
  note('ห้องรังสีที่เลือกได้', all.join(' · '));
  const pick = all.find((o) => o === room) ?? all.find((o) => o.includes(room)) ?? all.find((o) => /^ห้อง\(X-?ray\)$/i.test(o)) ?? all[0];
  await options(page).filter({ hasText: pick }).first().click();
  if ((await main.getByRole('combobox').count()) > 1) {
    await main.getByRole('combobox').nth(1).click();
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
  }
  await page.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/\/imaging\/task-list/, { timeout: 60_000 });
  // หน้ารายการงานรังสีตั้งตัวกรอง "แพทย์ผู้อ่าน" = ผู้ที่ล็อกอินไว้ให้ (radiologistPractitionerId ใน URL) → เปิดใหม่โดยล้างตัวกรองนี้ + ค้นด้วย HN (แท็บ รอ Check-in)
  const url = new URL(page.url());
  note('ตัวกรองของหน้ารายการงานรังสี', `radiologistPractitionerId=${url.searchParams.get('radiologistPractitionerId') ?? '-'} → ล้างออก`);
  url.searchParams.set('radiologistPractitionerId', '');
  url.searchParams.set('hn', hn);
  url.searchParams.set('tab', 'INITIATED');
  await page.goto(url.pathname + url.search, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6_000);
  const search = page.getByPlaceholder('HN', { exact: true });
  const row = page.getByText(hn, { exact: true }).filter({ visible: true }).first();
  await expect(row, `งาน X-ray ของ HN ${hn} ต้องอยู่ในรายการ (ห้อง ${pick})`).toBeVisible({ timeout: 60_000 });
  const button = page.getByRole('button', { name: /เช็คอิน|Check-in/i }).filter({ visible: true }).first();
  await markEvidence(filled(search), expected(row), clicked(button));
  await snapEvidence(page, `ก่อนกด — เช็คอิน X-ray (HN ${hn})`);
  const res = page.waitForResponse((r) => r.request().method() === 'POST' && /imaging-tasks\/status|check-in/i.test(new URL(r.url()).pathname), { timeout: 60_000 });
  await button.click();
  const dialog = page.getByRole('dialog').filter({ visible: true }).first();
  if (await dialog.isVisible({ timeout: 8_000 }).catch(() => false)) {
    // ต้องเลือกประเภทคิว (คิวรังสี) ก่อน ปุ่มยืนยันจึงกดได้
    const option = dialog.locator('[class*="queue-option"], .ant-radio-wrapper, label:has(input[type=radio])').first();
    await option.click({ force: true });
    await dialog.locator('input[type=radio]').first().check({ force: true }).catch(() => undefined);
    const confirm = dialog.getByRole('button', { name: /ยืนยัน|ตกลง/ }).first();
    await expect(confirm).toBeEnabled({ timeout: 10_000 });
    note(`ประเภทคิวรังสี (HN ${hn})`, squash(await option.innerText().catch(() => '')));
    await markEvidence(filled(option), clicked(confirm));
    await snapEvidence(page, `ก่อนกด — ยืนยันเช็คอิน X-ray (HN ${hn})`);
    await confirm.click();
  }
  const r = await res;
  const text = await r.text().catch(() => '');
  const q = text.match(/"qDisplay":"([^"]+)"/)?.[1];
  note(`เช็คอิน X-ray HN ${hn}`, `${r.status()} ${new URL(r.url()).pathname} ${text.slice(0, 300)}`);
  await page.waitForTimeout(3_000);
  await snapEvidence(page, `หลังกด — เช็คอิน X-ray ได้คิว ${q ?? '-'} (HN ${hn})`);
  return q;
}
