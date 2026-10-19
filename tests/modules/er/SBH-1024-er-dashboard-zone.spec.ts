import type { Locator, Page } from '@playwright/test';
import { dismissToast, expectOk, gotoErDashboard, waitForApi, type ErVisit } from '../../../helpers/functions/er';
import { erViewSwitch } from '../../../helpers/functions/er-list';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { ESI_BUTTON, labelledBox, saveButton, triageForm } from '../../../helpers/functions/er-triage';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM } from '../../../mock-data/uat-er';
import { VITALS_NORMAL, fillTriage, gotoVisit } from '../../../mock-data/uat-play';

// SBH-1024 [ER][Triage] ER Dashboard / Manage Queue — ชุด EXE SBH-1788 (VERSION 2.7.0) ยึด Note to QA: Dashboard · แยกผู้ป่วยตาม Zone · Zone ปรับตาม ESI · Time Count
// TC-001 SBH-1792 คอลัมน์ Zone ครบ · TC-002 SBH-1793 ผู้ป่วยอยู่ถูกคอลัมน์ · TC-003 SBH-1794 เปลี่ยน ESI แล้วย้ายคอลัมน์ · TC-004 SBH-1795 Time Count ตามค่าใน Setting
// เทส 1 (อ่านอย่างเดียว): TC-001 คอลัมน์ Zone — แยกไว้ให้รันบน Prod ได้เดี่ยวๆ (`--grep @SBH-1792` · ผู้ใช้สั่ง 16 ต.ค. 2026)
// เทส 2 (อ่านอย่างเดียว — ไม่กดปุ่มที่เขียนข้อมูล): TC-002 → TC-004 กับผู้ป่วยที่อยู่บนบอร์ดตอนรัน
// เทส 3 (เขียนข้อมูล): TC-003 คัดกรองซ้ำผู้ป่วย AUTO ที่ระบุใน SBH1024_RETRIAGE=<HN>,<VN>,<EN> ให้เป็น ESI 3 (ผู้ใช้เลือกใช้ผู้ป่วย AUTO ของ SBH-1684 · 15 ต.ค. 2026) · ทิ้ง Visit ไว้
// รัน (dev-x):    npx playwright test --headed --grep "@SBH-1792" --output=test-results-sbh-1024  ·  SBH1024_RETRIAGE=<HN>,<VN>,<EN> npx playwright test --headed --grep "@SBH-1794" --output=test-results-sbh-1024
// รัน (SBH Prod): เติม -c playwright.sbh-prod.cards.config.ts

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const TC1 = 'TC-001 (SBH-1792)';
const TC2 = 'TC-002 (SBH-1793)';
const TC3 = 'TC-003 (SBH-1794)';
const TC4 = 'TC-004 (SBH-1795)';

/** หัวคอลัมน์บนบอร์ด (คอลัมน์ห้องคัดกรองเขียนว่า "คัดกรอง") — โซนเขียวซ่อนเมื่อไม่มีผู้ป่วย */
const COLUMNS = ['คัดกรอง', 'โซนแดง ER', 'โซนเหลือง ER', 'โซนเขียว ER', 'ห้องสังเกตอาการ ER', 'รอเตียง'] as const;
/** คอลัมน์ที่ TC-001 กำหนด: รอคัดกรอง · Zone แดง · Zone เหลือง · ห้องสังเกตุการณ์ */
const REQUIRED = ['คัดกรอง', 'โซนแดง ER', 'โซนเหลือง ER', 'ห้องสังเกตอาการ ER'];
const RETRIAGE_LEVEL = 3;

interface BoardEncounter {
  en: string;
  hn: string;
  arrivedAt: string;
  triagedAt: string | null;
  triageLevel: number | null;
  waitTimeLimitSeconds: number | null;
  currentLocationId: number | null;
  latestStatusCode: string;
  patientStatus: string;
  startedTreatmentAt: string | null;
  patient?: { firstName?: string; familyName?: string };
}

async function fetchBoard(page: Page, authorization: () => string): Promise<BoardEncounter[]> {
  let list: BoardEncounter[] = [];
  await expect(async () => {
    const res = await page.request.get('/cortex-api/er/dashboard/encounters?scope=current_queue', { headers: { authorization: authorization() } });
    await expectOk(res, 'อ่านข้อมูลบอร์ด ER');
    list = (await res.json()) as BoardEncounter[];
  }).toPass({ timeout: 60_000 });
  return list;
}

async function fetchZones(page: Page, authorization: () => string): Promise<Map<number, string>> {
  const res = await page.request.get('/cortex-api/er/triage/zones', { headers: { authorization: authorization() } });
  await expectOk(res, 'อ่านรายชื่อโซน ER');
  const { boardLocations } = (await res.json()) as { boardLocations: { id: number; nameTh: string }[] };
  return new Map(boardLocations.map((z) => [z.id, z.nameTh]));
}

/** คอลัมน์ที่ผู้ป่วยควรอยู่ตามข้อมูลในระบบ: รอเตียง → รอเตียง · ยังไม่คัดกรอง → คัดกรอง · อื่นๆ = ชื่อโซนของ currentLocationId */
function expectedColumn(e: BoardEncounter, zones: Map<number, string>): string {
  if (e.patientStatus === 'bed_waiting') return 'รอเตียง';
  if (!e.triagedAt) return 'คัดกรอง';
  const zone = zones.get(e.currentLocationId ?? -1) ?? `location ${e.currentLocationId}`;
  return zone === 'ห้องคัดกรอง ER' ? 'คัดกรอง' : zone;
}

const columnHeader = (page: Page, name: string): Locator => page.getByRole('main').locator('strong').filter({ hasText: new RegExp(`^${name}$`) }).first();
/** แถบหัวคอลัมน์ทั้งแถบ (ชื่อ + badge จำนวน) */
const columnBar = (page: Page, name: string): Locator => columnHeader(page, name).locator('xpath=..');
const cardOf = (page: Page, hn: string): Locator => page.locator('.ant-card').filter({ has: page.getByText(`HN: ${hn}`, { exact: true }) }).last();

/** อ่านบอร์ด: หัวคอลัมน์ที่แสดง + badge + การ์ดทุกใบ (HN → คอลัมน์ตามตำแหน่งบนจอ) */
async function readBoard(page: Page) {
  const headers = await page.getByRole('main').locator('strong').evaluateAll(
    (els, names) =>
      els
        .filter((el) => names.includes(el.textContent!.trim()))
        .map((el) => {
          // badge จำนวนอยู่ในแถบหัวคอลัมน์ชั้นที่สูงกว่า <strong> — ไล่ขึ้นจนเจอตัวเลขในแถบ (ไม่เกิน 4 ชั้น)
          let bar: HTMLElement | null = el.parentElement;
          let count: RegExpMatchArray | null = null;
          for (let i = 0; bar && i < 4 && !count; i++, bar = bar.parentElement) count = bar.innerText.replace(el.textContent!, '').match(/^\s*\D{0,3}(\d+)\s*$/);
          return { name: el.textContent!.trim(), x: el.getBoundingClientRect().x, badge: count ? Number(count[1]) : -1 };
        }),
    [...COLUMNS] as string[],
  );
  const cards = await page.getByText(/^HN: \d+$/).evaluateAll((els) => els.map((el) => ({ hn: el.textContent!.replace('HN: ', ''), x: el.getBoundingClientRect().x })));
  const placed = cards.map((c) => ({ hn: c.hn, column: [...headers].filter((h) => h.x <= c.x + 40).sort((a, b) => b.x - a.x)[0]?.name ?? '(ไม่รู้คอลัมน์)' }));
  return { headers, placed };
}

/** หน้ารายการ (แท็บ ผู้ป่วยปัจจุบันใน ER) ทุกแถว — ขยายเป็น 50 แถว / หน้า ถ้ามีหลายหน้า */
async function readList(page: Page): Promise<{ en: string; text: string }[]> {
  const main = page.getByRole('main');
  await erViewSwitch(page, 'รายการ').click();
  const rows = main.locator('tr.ant-table-row');
  await expect(rows.first()).toBeVisible({ timeout: 45_000 });
  const size = main.locator('[aria-label="ขนาดหน้า"]').first();
  if ((await size.count()) && !(await size.innerText()).includes('50')) {
    await size.click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: '50' }).first().click();
  }
  await expect(rows.first()).toBeVisible({ timeout: 45_000 });
  return rows.evaluateAll((els) => els.map((e) => ({ en: e.getAttribute('data-row-key') ?? '', text: (e as HTMLElement).innerText.replace(/\s+/g, ' ') })));
}

/** ข้อความเวลารอบนการ์ด: "รอ m:ss นาที" (คัดกรองแล้ว) / "รอคัดกรอง m:ss นาที" → วินาที */
function waitSeconds(text: string): number | null {
  const m = text.match(/รอ(?:คัดกรอง)?\s*(\d+):(\d+)\s*นาที/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const mmss = (s: number | null) => (s == null ? '-' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
const name = (e: BoardEncounter) => `${e.patient?.firstName ?? ''} ${e.patient?.familyName ?? ''}`.trim();

/** จดคำสั่งที่เขียนข้อมูล (PUT / PATCH / DELETE / graphql mutation) ไว้ยืนยันว่าเทสอ่านอย่างเดียว */
function watchMutations(page: Page): string[] {
  const mutations: string[] = [];
  page.on('request', (req) => {
    const body = req.postData() ?? '';
    if (['PUT', 'PATCH', 'DELETE'].includes(req.method()) || (req.method() === 'POST' && /\bmutation\b/.test(body))) mutations.push(`${req.method()} ${new URL(req.url()).pathname}`);
  });
  return mutations;
}

function expectNoMutations(mutations: string[]) {
  test.info().annotations.push({ type: 'คำสั่งเขียนข้อมูล', description: mutations.length ? mutations.join(' · ') : 'ไม่มี' });
  expect(mutations, 'เทสอ่านอย่างเดียวต้องไม่ยิงคำสั่งเขียนข้อมูล').toEqual([]);
}

test.describe(`SBH-1024 ER Dashboard แยกผู้ป่วยตาม Zone + Time Count (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 900_000 });

  test.afterEach(async ({ page }) => {
    await hideCompareTable(page);
  });

  test(
    'ER Dashboard: คอลัมน์ Zone ครบตามที่กำหนด — อ่านอย่างเดียว (Super_User)',
    { tag: ['@SBH-1024', '@SBH-1792'], annotation: [linear('SBH-1792')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const mutations = watchMutations(page);
      let zones = new Map<number, string>();

      await checkStep(page, `${TC1} ขั้น 1-2 เปิดหน้า ER Dashboard โดยไม่มี error`, async () => {
        await gotoErDashboard(page);
        zones = await fetchZones(page, authorization);
        await expect(page.getByRole('main').getByText(/เกิดข้อผิดพลาด|Unexpected Application Error/)).toHaveCount(0);
        await markEvidence(expected(page.getByRole('main').getByText('แดชบอร์ด / คิว').first()));
        await holdForClip(page);
      });

      await checkStep(page, `${TC1} ขั้น 3-4 คอลัมน์ Zone บนกระดานครบ และตรงกับ Zone ที่ตั้งค่าไว้`, async () => {
        const { headers } = await readBoard(page);
        const shown = headers.map((h) => h.name);
        const configured = [...zones.values()].map((z) => (z === 'ห้องคัดกรอง ER' ? 'คัดกรอง' : z));
        test.info().annotations.push({ type: TC1, description: `คอลัมน์บนบอร์ด (ซ้าย → ขวา): ${shown.join(' · ')} · โซนที่ตั้งค่าไว้ (API /er/triage/zones): ${[...zones.values()].join(' · ')}` });
        const badge = (col: string) => headers.find((h) => h.name === col)?.badge;
        const rows: CompareRow[] = REQUIRED.map((col) => ({
          label: col === 'คัดกรอง' ? 'รอคัดกรอง' : col,
          values: ['ต้องมี', configured.includes(col) ? 'มี' : 'ไม่มี', shown.includes(col) ? `มี (${badge(col)} ราย)` : 'ไม่มี'],
          same: shown.includes(col) && configured.includes(col),
        }));
        for (const extra of [...new Set([...configured, ...shown])].filter((c) => !REQUIRED.includes(c))) {
          rows.push({ label: extra, values: ['(นอก TC)', configured.includes(extra) ? 'มี' : 'ไม่มี', shown.includes(extra) ? `มี (${badge(extra)} ราย)` : 'ไม่แสดง'], same: true });
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await markEvidence(...shown.map((c) => expected(columnBar(page, c))));
        // ตารางไว้ครึ่งล่าง ให้หัวคอลัมน์ทุกตัว (Expected) อยู่นอกตาราง
        await showCompareTable(page, `${TC1} คอลัมน์ Zone บน ER Dashboard`, ['Expected', 'Zone ที่ตั้งค่าไว้', 'บนกระดาน'], rows, { width: '640px', top: '560px' });
        await holdForClip(page, 2_500);
        expect(REQUIRED.filter((c) => !shown.includes(c)), 'คอลัมน์ Zone ที่ต้องมีบนกระดาน').toEqual([]);
        expect(REQUIRED.filter((c) => !configured.includes(c)), 'คอลัมน์ที่ต้องมีต้องตรงกับ Zone ที่ตั้งค่าไว้').toEqual([]);
      });
      await hideCompareTable(page);
      expectNoMutations(mutations);
    },
  );

  test(
    'ER Dashboard: ผู้ป่วยอยู่ถูกคอลัมน์ · Time Count ตามค่าใน Setting — อ่านอย่างเดียว (Super_User)',
    { tag: ['@SBH-1024', '@SBH-1793', '@SBH-1795'], annotation: [linear('SBH-1793'), linear('SBH-1795')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const mutations = watchMutations(page);
      let board: BoardEncounter[] = [];
      await gotoErDashboard(page);
      const zones = await fetchZones(page, authorization);

      // ─── TC-002
      let listRows: { en: string; text: string }[] = [];
      await checkStep(page, `${TC2} ขั้น 2-4 ผู้ป่วยทุกรายบนกระดานอยู่ใต้คอลัมน์ตรงกับ Zone ในระบบ ไม่มีรายใดผิดคอลัมน์หรือซ้ำ`, async () => {
        board = await fetchBoard(page, authorization);
        const { headers, placed } = await readBoard(page);
        const active = board.filter((e) => e.latestStatusCode !== 'cancelled');
        const want = new Map(active.map((e) => [e.hn, expectedColumn(e, zones)]));
        const seen = new Map<string, string[]>();
        for (const p of placed) seen.set(p.hn, [...(seen.get(p.hn) ?? []), p.column]);
        const wrong = [...want].filter(([hn, col]) => (seen.get(hn) ?? []).join(',') !== col).map(([hn, col]) => `HN ${hn}: ระบบ ${col} · บนจอ ${(seen.get(hn) ?? ['(ไม่พบการ์ด)']).join(' + ')}`);
        const dup = [...seen].filter(([, cols]) => cols.length > 1).map(([hn, cols]) => `HN ${hn} ซ้ำ ${cols.join(' + ')}`);
        const rows: CompareRow[] = headers.map((h) => {
          const fromApi = [...want].filter(([, col]) => col === h.name).map(([hn]) => hn).sort();
          const onBoard = placed.filter((p) => p.column === h.name).map((p) => p.hn).sort();
          return { label: h.name, values: [`${fromApi.length} ราย`, `${onBoard.length} ราย (badge ${h.badge})`], same: fromApi.join() === onBoard.join() && h.badge === onBoard.length };
        });
        await test.info().attach(`${TC2} ผู้ป่วยบนกระดาน`, { body: JSON.stringify(active.map((e) => ({ hn: e.hn, name: name(e), esi: e.triageLevel, system: want.get(e.hn), board: seen.get(e.hn) })), null, 2), contentType: 'application/json' });
        await page.evaluate(() => window.scrollTo(0, 0));
        await markEvidence(...headers.map((h) => expected(columnBar(page, h.name))));
        await showCompareTable(page, `${TC2} จำนวนผู้ป่วยต่อคอลัมน์ — Zone ในระบบ (API) / บนกระดาน`, ['Zone ในระบบ', 'บนกระดาน'], rows, { side: 'bottom' });
        await holdForClip(page, 2_500);
        test.info().annotations.push({ type: TC2, description: `ผู้ป่วย ${active.length} ราย · ผิดคอลัมน์ ${wrong.length} · ซ้ำ ${dup.length}` });
        expect([...wrong, ...dup], 'ผู้ป่วยที่อยู่ผิดคอลัมน์ / ซ้ำ').toEqual([]);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'badge จำนวนต้องตรงกับการ์ดในคอลัมน์').toEqual([]);
      });
      await hideCompareTable(page);

      await checkStep(page, `${TC2} หน้าแสดงรายการ — โซนของแต่ละแถวตรงกับ Zone ในระบบ`, async () => {
        listRows = await readList(page);
        const listZones = ['ห้องคัดกรอง ER', 'โซนแดง ER', 'โซนเหลือง ER', 'โซนเขียว ER', 'ห้องสังเกตอาการ ER'];
        const current = board.filter((e) => e.patientStatus === 'current_in_er' && e.latestStatusCode !== 'cancelled');
        const zoneOf = (e: BoardEncounter) => (e.triagedAt ? zones.get(e.currentLocationId ?? -1) ?? '' : 'ห้องคัดกรอง ER');
        const rows: CompareRow[] = listZones.map((z) => {
          const want = current.filter((e) => zoneOf(e) === z).map((e) => e.en).sort();
          const got = listRows.filter((r) => r.text.includes(z)).map((r) => r.en).sort();
          return { label: z, values: [`${want.length} ราย`, `${got.length} ราย`], same: want.join() === got.join() };
        });
        // กรอบเดียวรอบตารางทั้งหมด — กรอบรายแถวทำให้ป้ายไปทับคอลัมน์เวลารอ (R59)
        await markEvidence(expected(page.getByRole('main').locator('.ant-table-tbody').first()));
        await showCompareTable(page, `${TC2} หน้ารายการ — จำนวนแถวต่อโซน`, ['Zone ในระบบ (ผู้ป่วยปัจจุบันใน ER)', 'หน้ารายการ'], rows, { side: 'bottom' });
        await holdForClip(page, 2_000);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'แถวในหน้ารายการต้องอยู่โซนตรงกับระบบ').toEqual([]);
      });
      await hideCompareTable(page);

      // ─── TC-004
      let limits: { level: number; limitSeconds: number | null }[] = [];
      await checkStep(page, `${TC4} ขั้น 1 ค่าเวลารอตรวจที่ตั้งไว้ใน ER Setting (เปิดดูอย่างเดียว)`, async () => {
        const res = await page.request.get('/cortex-api/er/triage/wait-time-settings', { headers: { authorization: authorization() } });
        await expectOk(res, 'อ่านตั้งค่าเวลารอตรวจ');
        limits = ((await res.json()) as { items: { level: number; limitSeconds: number | null }[] }).items;
        test.info().annotations.push({ type: TC4, description: `ตั้งค่าเวลารอตรวจ: ${limits.map((l) => `ESI ${l.level} ${l.limitSeconds == null ? 'ไม่จำกัด' : `${l.limitSeconds / 60} นาที`}`).join(' · ')}` });
        await page.goto('/cortex/setting/admin/er-triage-wait-time-targets');
        const fields = page.getByRole('spinbutton');
        await expect(fields.first()).toBeVisible({ timeout: 45_000 });
        // กรอบทั้งแถว (ชื่อระดับ + สวิตช์ไม่จำกัดเวลา + ช่องนาที) — ป้ายไม่ทับสวิตช์ (R59)
        await markEvidence(...(await fields.all()).map((f) => expected(f.locator('xpath=ancestor::*[.//strong][1]'))));
        await holdForClip(page, 1_500);
      });

      await checkStep(page, `${TC4} ขั้น 2-4 ตัวนับเวลาบนการ์ดเดินต่อเนื่อง และเตือนเกินเป้าหมายตามค่าใน Setting`, async () => {
        await gotoErDashboard(page);
        board = await fetchBoard(page, authorization);
        // ตัวอย่างระดับละ 1 ราย (ยังไม่ Acknowledge · ไม่รอเตียง) — ห้องคัดกรองถ้ามีผู้ป่วย
        const pool = board.filter((e) => e.latestStatusCode !== 'cancelled' && e.patientStatus === 'current_in_er' && !e.startedTreatmentAt);
        const samples: BoardEncounter[] = [];
        const untriaged = pool.find((e) => !e.triagedAt);
        if (untriaged) samples.push(untriaged);
        for (const level of [1, 2, 3, 4, 5]) {
          const e = pool.filter((x) => x.triagedAt && x.triageLevel === level).sort((a, b) => Date.parse(b.triagedAt!) - Date.parse(a.triagedAt!))[0];
          if (e) samples.push(e);
        }
        const read = async () => Promise.all(samples.map(async (e) => {
          const text = (await cardOf(page, e.hn).innerText()).replace(/\s+/g, ' ');
          return { seconds: waitSeconds(text), overdue: /เกินเป้าหมาย|ถึงเวลาเป้าหมาย/.test(text) };
        }));
        await expect(cardOf(page, samples[0].hn)).toBeVisible({ timeout: 45_000 });
        const first = await read();
        const startedAt = Date.now();
        // ถ่ายการ์ดตัวอย่างทีละใบ (เวลารอ + ป้ายเกินเป้าหมาย) ระหว่างรอให้ตัวนับเดิน
        for (const e of samples) {
          const card = cardOf(page, e.hn);
          const marks = [expected(card.getByText(/รอ(คัดกรอง)?\s*\d+:\d+/).first())];
          if (await card.getByRole('alert').count()) marks.push(expected(card.getByRole('alert').first()));
          await markEvidence(...marks);
          await snapEvidence(page, `${TC4} การ์ด ESI ${e.triageLevel ?? '-'} HN ${e.hn}`);
        }
        await expect.poll(() => Date.now() - startedAt, { timeout: 30_000 }).toBeGreaterThan(15_000);
        const second = await read();
        const elapsed = Math.round((Date.now() - startedAt) / 1000);
        const now = Date.now();
        const rows: CompareRow[] = samples.map((e, i) => {
          const limit = e.triagedAt ? limits.find((l) => l.level === e.triageLevel)?.limitSeconds ?? null : null;
          const since = e.triagedAt ? Date.parse(e.triagedAt) : Date.parse(e.arrivedAt);
          const shouldOverdue = limit != null && (now - since) / 1000 > limit;
          const ticking = first[i].seconds != null && second[i].seconds != null && second[i].seconds! > first[i].seconds!;
          return {
            label: `${e.triagedAt ? `ESI ${e.triageLevel}` : 'รอคัดกรอง'} HN ${e.hn}`,
            values: [limit == null ? 'ไม่จำกัด' : `${limit / 60} นาที`, `${mmss(first[i].seconds)} → ${mmss(second[i].seconds)}`, shouldOverdue ? 'ต้องเตือน' : 'ไม่เตือน', second[i].overdue ? 'เตือน' : 'ไม่เตือน'],
            same: ticking && shouldOverdue === second[i].overdue,
          };
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        await showCompareTable(page, `${TC4} Time Count บนการ์ด (อ่าน 2 ครั้งห่าง ${elapsed} วินาที)`, ['เป้าหมายใน Setting', 'เวลารอ (ครั้งที่ 1 → 2)', 'คาดจาก Setting', 'บนการ์ด'], rows, { side: 'bottom' });
        await snapEvidence(page, `${TC4} ตารางเทียบ Time Count`);
        await holdForClip(page, 3_000);
        await test.info().attach(`${TC4} Time Count`, { body: JSON.stringify(rows, null, 2), contentType: 'application/json' });
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'ตัวนับต้องเดินและเตือนตรงกับ Setting').toEqual([]);
      });
      await hideCompareTable(page);
      expectNoMutations(mutations);
    },
  );

  test(
    'ER Dashboard: คัดกรองซ้ำเปลี่ยน ESI แล้วผู้ป่วยย้ายคอลัมน์ Zone (Super_User)',
    { tag: ['@SBH-1024', '@SBH-1794'], annotation: [linear('SBH-1794')] },
    async ({ page }) => {
      const [hn, vn, en] = (process.env.SBH1024_RETRIAGE ?? '').split(',');
      expect(hn && vn && en, 'ต้องระบุ SBH1024_RETRIAGE=<HN>,<VN>,<EN> (ผู้ป่วย AUTO ที่ยังเปิด Visit)').toBeTruthy();
      const visit: ErVisit = { hn, vn, en };
      const authorization = trackAuthorization(page);
      const form = triageForm(page);
      let zones = new Map<number, string>();
      // SBH1024_VERIFY_BEFORE=<คอลัมน์เดิม> = คัดกรองซ้ำไปแล้ว → ข้ามขั้น 1-3 ตรวจขั้น 4 + หน้ารายการซ้ำแบบอ่านอย่างเดียว (ไม่คัดกรองซ้ำอีกรอบ)
      const verifyBefore = process.env.SBH1024_VERIFY_BEFORE;
      let before = verifyBefore ?? '';
      if (verifyBefore) {
        await gotoErDashboard(page);
        zones = await fetchZones(page, authorization);
        test.info().annotations.push({ type: TC3, description: `ตรวจซ้ำแบบอ่านอย่างเดียว — คัดกรองซ้ำไปแล้วในรอบก่อน · คอลัมน์เดิม ${verifyBefore}` });
      }

      if (!verifyBefore) await checkStep(page, `${TC3} ขั้น 1 จดคอลัมน์ Zone เดิมของผู้ป่วยบน ER Dashboard`, async () => {
        await gotoErDashboard(page);
        zones = await fetchZones(page, authorization);
        const e = (await fetchBoard(page, authorization)).find((x) => x.en === en);
        expect(e, `Encounter ${en} ต้องอยู่บนบอร์ด`).toBeTruthy();
        expect(e!.triageLevel, `ผู้ป่วยต้องยังไม่ใช่ ESI ${RETRIAGE_LEVEL}`).not.toBe(RETRIAGE_LEVEL);
        before = expectedColumn(e!, zones);
        const { placed } = await readBoard(page);
        expect(placed.filter((p) => p.hn === hn).map((p) => p.column), `การ์ด HN ${hn} อยู่คอลัมน์เดิม`).toEqual([before]);
        test.info().annotations.push({ type: TC3, description: `ก่อน: HN ${hn} ESI ${e!.triageLevel} · ${before}` });
        await page.evaluate(() => window.scrollTo(0, 0));
        await markEvidence(expected(columnBar(page, before)));
        await snapEvidence(page, `${TC3} หัวคอลัมน์เดิม ${before}`);
        await markEvidence(expected(cardOf(page, hn)));
        await holdForClip(page);
      });

      if (!verifyBefore) await checkStep(page, `${TC3} ขั้น 2-3 คัดกรองซ้ำ เปลี่ยนเป็น ESI ${RETRIAGE_LEVEL} แล้วบันทึก`, async () => {
        await gotoVisit(page, visit);
        const redo = form.getByRole('button', { name: 'redo คัดกรองซ้ำ' });
        await expect(redo).toBeVisible({ timeout: 45_000 });
        await markEvidence(clicked(redo));
        await snapEvidence(page, 'ก่อนกด — ปุ่ม คัดกรองซ้ำ');
        await redo.click();
        await expect(form.getByRole('heading', { name: 'การคัดกรองครั้งใหม่' })).toBeVisible({ timeout: 30_000 });
        await fillTriage(page, visit, { level: RETRIAGE_LEVEL, vitals: VITALS_NORMAL });
        // ฟอร์มคิด MEWS หลังตั้ง AVPU จาก GCS — บันทึกเร็วไป MEWS ไม่ถูกบันทึก (SBH-1684) → รอกล่อง Total MEWS ก่อน
        await expect(labelledBox(form, 'Total MEWS')).toHaveText(/Total MEWS\s*1\s*\//);
        const zoneButton = form.getByRole('button', { name: /^โซนเหลือง ER/ });
        const marks = [filled(form.getByRole('button', { name: ESI_BUTTON[RETRIAGE_LEVEL] })), clicked(saveButton(page))];
        if (await zoneButton.count()) marks.push(expected(zoneButton.first()));
        await markEvidence(...marks);
        await holdForClip(page);
        await snapEvidence(page, `ก่อนกด — บันทึก คัดกรองซ้ำ ESI ${RETRIAGE_LEVEL}`);
        const saved = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${en}/triage-result`, 90_000);
        await saveButton(page).click();
        await expectOk(await saved, `บันทึกคัดกรองซ้ำของ ${en}`);
        await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ').catch(() => undefined);
      });

      let after = '';
      await checkStep(page, `${TC3} ขั้น 4 ER Dashboard — ผู้ป่วยหายจากคอลัมน์เดิม และไปอยู่คอลัมน์ใหม่ตาม ESI ${RETRIAGE_LEVEL}`, async () => {
        await gotoErDashboard(page);
        let placedCols: string[] = [];
        await expect(async () => {
          const e = (await fetchBoard(page, authorization)).find((x) => x.en === en)!;
          after = expectedColumn(e, zones);
          expect(e.triageLevel, 'ESI ในระบบหลังบันทึก').toBe(RETRIAGE_LEVEL);
          placedCols = (await readBoard(page)).placed.filter((p) => p.hn === hn).map((p) => p.column);
          expect(placedCols, 'การ์ดต้องอยู่คอลัมน์ใหม่คอลัมน์เดียว').toEqual([after]);
        }).toPass({ timeout: 90_000 });
        // คอลัมน์ที่ไม่มีผู้ป่วยเหลือ (เช่น โซนเขียว) ถูกซ่อนจากบอร์ด — ไม่มีหัวคอลัมน์ให้ตีกรอบ
        const beforeShown = (await columnBar(page, before).count()) > 0;
        const rows: CompareRow[] = [
          { label: 'คอลัมน์เดิม', values: [before, placedCols.includes(before) ? 'ยังอยู่' : beforeShown ? 'ไม่อยู่แล้ว' : 'ไม่อยู่แล้ว (คอลัมน์ซ่อนเพราะไม่มีผู้ป่วยเหลือ)'], same: !placedCols.includes(before) },
          { label: 'คอลัมน์ใหม่', values: [after, placedCols.join(' + ') || '(ไม่พบการ์ด)'], same: placedCols.length === 1 && placedCols[0] === after && after !== before },
        ];
        test.info().annotations.push({ type: TC3, description: `หลัง: HN ${hn} ESI ${RETRIAGE_LEVEL} · ${after} · บนจอ ${placedCols.join(' + ')}` });
        await page.evaluate(() => window.scrollTo(0, 0));
        await markEvidence(...(beforeShown ? [expected(columnBar(page, before))] : []), expected(columnBar(page, after)));
        await snapEvidence(page, `${TC3} หัวคอลัมน์เดิม + ใหม่`);
        await markEvidence(expected(cardOf(page, hn)));
        await showCompareTable(page, `${TC3} คอลัมน์ของ HN ${hn} หลังเปลี่ยน ESI`, ['ระบบ (API)', 'บนกระดาน'], rows, { side: 'bottom' });
        await holdForClip(page, 2_500);
        expect(rows.filter((r) => !r.same).map((r) => r.label)).toEqual([]);
      });
      await hideCompareTable(page);

      await checkStep(page, `${TC3} หน้าแสดงรายการ — แถวของผู้ป่วยแสดงโซนใหม่`, async () => {
        await readList(page);
        const nameBox = page.getByRole('main').getByPlaceholder('ค้นหา HN');
        await nameBox.fill(hn);
        const row = page.getByRole('main').locator(`tr.ant-table-row[data-row-key="${en}"]`);
        await expect(row).toContainText(after, { timeout: 30_000 });
        await expect(row).not.toContainText(before);
        await markEvidence(expected(row));
        await holdForClip(page);
      });
    },
  );
});
