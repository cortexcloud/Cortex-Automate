import { type Page } from '@playwright/test';
import {
  confirmOpenErVisit,
  dismissToast,
  expectOk,
  expectTriageFormOpen,
  gotoErDashboard,
  openErMenu,
  openTriagePage,
  registerNewPatient,
  waitForApi,
  type ErVisit,
} from '../../../helpers/er';
import { acknowledgeTreatment, draftDisposition, openDisposition, signDisposition, type ErDischargeSummary } from '../../../helpers/er-disposition';
import {
  addDays,
  bangkokDate,
  chooseGranularity,
  clickCalendarCell,
  dayLabel,
  daysBetween,
  esiSelect,
  exportButton,
  exportQuality,
  fetchBoardEncounters,
  fetchQuality,
  fetchWaitTimeSettings,
  granularityRadio,
  keepOptions,
  meanSum,
  minutesBetween,
  parseThaiDateTime,
  periodInputs,
  pickPeriod,
  pickerDropdown,
  qualityTable,
  restoreWaitTimeSettings,
  searchButton,
  searchQuality,
  selectBox,
  shiftSelect,
  today,
  GRANULARITY_LABEL,
  type Granularity,
  type QualityCounts,
  type QualityFilter,
  type QualityReport,
  type QualityRow,
  type WaitTimeSetting,
} from '../../../helpers/er-quality';
import {
  addMonths,
  currentMonth,
  hideSheet,
  monthLabel,
  readTable,
  readWorkbook,
  searchMonthly,
  setMonthRange,
  sheetCell,
  sheetRow,
  showSheet,
  trackAuthorization,
  type Sheet,
  type SheetValue,
} from '../../../helpers/er-report';
import { saveTriage } from '../../../helpers/er-triage';
import { alerted, checkStep, clicked, expected, filled, markEvidence, snapEvidence } from '../../../helpers/evidence';
import { expect, test } from '../../../helpers/fixtures';
import { newTestPatient } from '../../../helpers/test-data';

// SBH-1401 [ER][ER Statistics Report] 4. รายงานแสดงคุณภาพของห้องฉุกเฉิน (TOR 4.9.8.10.4)
// แปลงจากชุด Manual: EXE SBH-2338 → TC-001–008 (SBH-2343–SBH-2350) · 2 เทสตาม flow (R9):
//   1) หน้าจอ Filter · โครงไฟล์ Excel · ผลรวมข้ามระดับ · ช่วงเวลา (อ่านอย่างเดียว) — TC-001 / 002 / 006 / 008
//   2) ข้อมูลควบคุม: ESI 5 ไม่จำกัด + ผู้ป่วย AUTO ใหม่ (Triage / Acknowledge / จำหน่าย + ลงนาม) แล้วดูยอดเปลี่ยน — TC-002 (Config) / 003 / 004 / 005
// ผู้ใช้กำหนด 29 ก.ย. 2026 (R29):
// - เพิ่ม (ก) Filter ESI / เวร บางค่าแล้วตัวเลขเหลือเฉพาะที่เลือก (ข) Visit ยังไม่ Triage / ยกเลิก ไม่ถูกนับ
// - ปิด ESI 5 เป็น "ไม่จำกัด" ชั่วคราวแล้วคืนค่าเดิมท้ายเทส (afterEach คืนให้ถ้าพัง) · TC-007 (user ไม่มีสิทธิ์) ข้ามไปก่อน
// - ตารางบนหน้าจอ (dev บอกว่าไม่มี preview) ยึดตามจริง → เช็คหน้าจอ = Excel = API
// - Export ใช้ระดับเดิมถ้ายังไม่กดค้นหา → ลงข้อสังเกต ไม่ fail · เคส "รอเท่ากับ Target พอดี" ข้ามไปก่อน
// - Acknowledge / จำหน่าย / ลงนาม ให้ผู้ป่วย AUTO ได้และทิ้งไว้บน dev-x
// ข้อจำกัดบน dev-x ที่เจอตอนสำรวจ (ใช้ข้อมูลที่มีอยู่แทน):
// - ยกเลิก Encounter ไม่ได้ (API ตอบ error branch_id) → เช็ค "Visit ยกเลิกไม่ถูกนับ" ด้วยการเทียบกับรายการ Encounter ของบอร์ดทั้งเดือน
// - Encounter ที่ลงนามจำหน่ายแล้วยังค้างสถานะ in-progress (ระบบปิดให้เองตอน 22:00) → เปิด Visit ใหม่ให้คนเดิมวันเดียวกันไม่ได้
//   → คู่ Revisit เช็คจากคู่ที่มีอยู่ในเดือนนี้ · Index ใหม่เช็คจากยอด Index / Provisional ที่เพิ่ม

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const note = (description: string) => test.info().annotations.push({ type: 'ข้อสังเกต', description });

const ESI_LEVELS = [1, 2, 3, 4, 5];
const ESI_NAMES = ['กู้ชีพ', 'ฉุกเฉิน', 'เร่งด่วน', 'กึ่งเร่งด่วน', 'ไม่เร่งด่วน'];

/** ค่าบนหน้าจอ: ค่าเฉลี่ย 1 ตำแหน่ง · % 1 ตำแหน่ง · ไม่มีค่า = "-" */
const num1 = (v: number | null) => (v === null ? '-' : v.toFixed(1));
const pct1 = (v: number | null) => (v === null ? '-' : `${(v * 100).toFixed(1)}%`);
const int = (v: number) => v.toLocaleString('en-US');

/** ISO → "DD/MM/พ.ศ. HH:mm" เวลาไทย (รูปแบบในไฟล์) */
function thaiDateTime(iso: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  return `${p.day}/${p.month}/${Number(p.year) + 543} ${p.hour}:${p.minute}`;
}

/** ป้ายแถวของ bucket (วันที่ DD/MM/พ.ศ. หรือเดือน MM/พ.ศ.) */
const bucketLabel = (g: Granularity, row: QualityRow) => (g === 'month' ? monthLabel(row.date) : dayLabel(row.date));
const shiftLabel = (row: QualityRow) => (row.unassigned ? 'ไม่ระบุเวร' : row.shiftName.th.name);

// ---------- หน้าจอ ----------

const SCREEN = {
  eligible: 'Eligible',
  d2d: 'Door-to-doc เฉลี่ย (นาที)',
  d2disp: 'Door-to-disposition เฉลี่ย (นาที)',
  otCase: 'Over Target (ราย)',
  otRate: 'Over Target (%)',
  rvCase: '72h Revisit (ราย)',
  rvRate: '72h Revisit (%)',
  provisional: 'Index ที่ยังไม่ครบ 72 ชม. (Provisional)',
};

/** ค่าที่หน้าจอต้องแสดงของ 1 แถวตามหัวคอลัมน์ */
function screenValues(c: QualityCounts): Record<string, string> {
  return {
    [SCREEN.eligible]: int(c.eligible),
    [SCREEN.d2d]: num1(c.doorToDocMeanMinutes),
    [SCREEN.d2disp]: num1(c.doorToDispositionMeanMinutes),
    [SCREEN.otCase]: int(c.overTargetCase),
    [SCREEN.otRate]: pct1(c.overTargetRate),
    [SCREEN.rvCase]: int(c.revisitCase),
    [SCREEN.rvRate]: pct1(c.revisitRate),
    [SCREEN.provisional]: int(c.provisionalIndexDischarges),
  };
}

/** ตาราง "สรุปตัวชี้วัดคุณภาพ" + "Over Target ต่อ ESI (ราย / %)" บนหน้าจอ ต้องตรงกับข้อมูลที่หน้าจอโหลด (API) ทุกแถว */
async function expectScreenMatches(page: Page, g: Granularity, report: QualityReport) {
  const summary = await readTable(qualityTable(page, 'สรุปตัวชี้วัดคุณภาพ'));
  const labels = report.rows.map((row) => bucketLabel(g, row));
  expect(summary.rows.map((r) => r[0]), 'แถวบนหน้าจอ: 1 แถวต่อ 1 bucket + แถวรวม').toEqual([...labels, 'รวม']);
  const hasShift = summary.headers.includes('เวร');
  if (g === 'shift') expect(hasShift, 'รายเวรต้องมีคอลัมน์เวร').toBe(true);
  const rows: { label: string; c: QualityCounts; shift?: string }[] = [
    ...report.rows.map((row) => ({ label: bucketLabel(g, row), c: row as QualityCounts, shift: g === 'shift' ? shiftLabel(row) : undefined })),
    { label: 'รวม', c: report.total },
  ];
  for (const [i, { label, c, shift }] of rows.entries()) {
    const want = screenValues(c);
    for (const [header, value] of Object.entries(want)) {
      const col = summary.headers.indexOf(header);
      expect(col, `หน้าจอต้องมีคอลัมน์ "${header}"`).toBeGreaterThanOrEqual(0);
      expect(summary.rows[i][col], `หน้าจอ ${label}${shift ? ` ${shift}` : ''} · ${header}`).toBe(value);
    }
    if (shift) expect(summary.rows[i][summary.headers.indexOf('เวร')], `หน้าจอ ${label} · เวร`).toBe(shift);
  }
  for (const [name, pick] of [
    ['Over Target ต่อ ESI (ราย)', (c: QualityCounts, l: number) => int(c.overTargetCaseByLevel[l])],
    ['Over Target ต่อ ESI (%)', (c: QualityCounts, l: number) => pct1(c.overTargetRateByLevel[l])],
  ] as const) {
    const table = await readTable(qualityTable(page, name));
    for (const [i, { label, c }] of rows.entries()) {
      for (const l of [0, 1, 2, 3, 4]) {
        const col = table.headers.findIndex((h) => h.startsWith(`ESI ${l + 1}`));
        expect(table.rows[i][col], `หน้าจอ ${name} · ${label} · ESI ${l + 1}`).toBe(pick(c, l));
      }
    }
  }
}

// ---------- ไฟล์ Excel ----------

const EXCEL = {
  eligible: 'จำนวนผู้ป่วยที่เข้าเกณฑ์ (Eligible)',
  d2d: 'Door-to-doc เฉลี่ย (นาที)',
  d2disp: 'Door-to-disposition เฉลี่ย (นาที)',
  otCase: 'Over Target (ราย)',
  otRate: 'Over Target (%)',
  rvCase: '72h Revisit (ราย)',
  rvRate: '72h Revisit (%)',
  provisional: 'Index ที่ยังไม่ครบ 72 ชม. (Provisional)',
};

/** ตาราง 1 ชุดใน sheet: แถวหัวข้อ (ขึ้นต้นด้วย prefix) → แถวหัวคอลัมน์ → แถวข้อมูลจนถึงแถว "รวมทั้งหมด" */
interface Block {
  /** เลขแถว Excel ของหัวคอลัมน์ */
  headerRow: number;
  header: string[];
  /** เลขแถว Excel ของแถวข้อมูลแรก */
  firstRow: number;
  rows: SheetValue[][];
}

function block(sheet: Sheet, prefix: string): Block {
  const title = sheet.rows.findIndex((r) => typeof r[0] === 'string' && r[0].startsWith(prefix));
  expect(title, `sheet ${sheet.name} ต้องมีตาราง "${prefix}…"`).toBeGreaterThanOrEqual(0);
  const header = (sheet.rows[title + 1] ?? []).map((v) => String(v ?? ''));
  const rows: SheetValue[][] = [];
  for (let i = title + 2; i < sheet.rows.length; i++) {
    const row = sheet.rows[i];
    if (!row.length || row[0] === null) break;
    rows.push(Array.from({ length: header.length }, (_, c) => row[c] ?? null));
    if (String(row[0]).startsWith('รวมทั้งหมด')) break;
  }
  return { headerRow: title + 2, header, firstRow: title + 3, rows };
}

const cell = (b: Block, row: number, header: string): SheetValue => {
  const col = b.header.indexOf(header);
  expect(col, `ตารางใน Excel ต้องมีคอลัมน์ "${header}"`).toBeGreaterThanOrEqual(0);
  return b.rows[row][col];
};

/** ค่าเฉลี่ย / อัตราในไฟล์: ไม่มีตัวหารต้องเป็นช่องว่าง (ไม่ใช่ 0) */
function expectNumberCell(actual: SheetValue, want: number | null, what: string) {
  if (want === null) expect(actual, `${what} ไม่มีตัวหาร → ช่องว่าง`).toBeNull();
  else expect(actual as number, what).toBeCloseTo(want, 6);
}

/** sheet ของระดับรายงาน: Breakdown + Over Target Case/% ต่อ ESI ต้องตรงกับ API ทุกแถว */
function expectSheetMatches(sheet: Sheet, g: Granularity, report: QualityReport) {
  const breakdown = block(sheet, 'Breakdown');
  const labels = report.rows.map((row) => bucketLabel(g, row));
  expect(breakdown.rows.map((r) => r[0]), 'Breakdown: 1 แถวต่อ 1 bucket (วันที่ พ.ศ.) + แถวรวมทั้งหมด').toEqual([...labels, 'รวมทั้งหมด']);
  const rows = [...report.rows.map((row) => ({ label: bucketLabel(g, row), c: row as QualityCounts, row })), { label: 'รวมทั้งหมด', c: report.total, row: null }];
  for (const [i, { label, c, row }] of rows.entries()) {
    const at = `Excel ${label}${row && g === 'shift' ? ` ${shiftLabel(row)}` : ''}`;
    if (row && g === 'shift') expect(cell(breakdown, i, 'เวร'), `${at} · เวร`).toBe(shiftLabel(row));
    expect(cell(breakdown, i, EXCEL.eligible), `${at} · Eligible`).toBe(c.eligible);
    expectNumberCell(cell(breakdown, i, EXCEL.d2d), c.doorToDocMeanMinutes, `${at} · Door-to-doc`);
    expectNumberCell(cell(breakdown, i, EXCEL.d2disp), c.doorToDispositionMeanMinutes, `${at} · Door-to-disposition`);
    expect(cell(breakdown, i, EXCEL.otCase), `${at} · Over Target (ราย)`).toBe(c.overTargetCase);
    expectNumberCell(cell(breakdown, i, EXCEL.otRate), c.overTargetRate, `${at} · Over Target (%)`);
    expect(cell(breakdown, i, EXCEL.rvCase), `${at} · 72h Revisit (ราย)`).toBe(c.revisitCase);
    expectNumberCell(cell(breakdown, i, EXCEL.rvRate), c.revisitRate, `${at} · 72h Revisit (%)`);
    expect(cell(breakdown, i, EXCEL.provisional), `${at} · Provisional`).toBe(c.provisionalIndexDischarges);
  }
  const otCase = block(sheet, 'Over Target Case');
  const otRate = block(sheet, '% Over Target');
  for (const [i, { label, c }] of rows.entries()) {
    for (const l of [0, 1, 2, 3, 4]) {
      const header = `ESI ${l + 1} ${ESI_NAMES[l]}`;
      expect(cell(otCase, i, header), `Excel Over Target Case · ${label} · ${header}`).toBe(c.overTargetCaseByLevel[l]);
      // แถวที่ไม่มีผู้ป่วยเลยในไฟล์เว้นทั้งแถว → null เหมือนกัน
      expectNumberCell(cell(otRate, i, header), c.overTargetRateByLevel[l], `Excel % Over Target · ${label} · ${header}`);
    }
    expect(cell(otCase, i, 'รวม'), `Excel Over Target Case · ${label} · รวม`).toBe(c.overTargetCase);
    expectNumberCell(cell(otRate, i, 'รวม'), c.overTargetRate, `Excel % Over Target · ${label} · รวม`);
  }
  return { breakdown, otCase, otRate };
}

/** ค่าในตาราง Config & Assumptions ตามชื่อบรรทัด (คอลัมน์ A) */
function configValue(config: Sheet, label: string): SheetValue {
  const row = config.rows.find((r) => typeof r[0] === 'string' && r[0].startsWith(label));
  expect(row, `sheet Config & Assumptions ต้องมีบรรทัด "${label}"`).toBeTruthy();
  return row![1] ?? null;
}
const configRow = (config: Sheet, label: string) => config.rows.findIndex((r) => typeof r[0] === 'string' && r[0].startsWith(label)) + 1;

/** Target ต่อ ESI ที่ Config ต้องแสดง: นาที หรือ "ไม่จำกัด" */
const targetText = (s: WaitTimeSetting) => (s.limitSeconds === null ? 'ไม่จำกัด' : s.limitSeconds / 60);

// ---------- ข้อมูลตั้งต้นของรายงาน ----------

/** ผลต่าง (หลัง − ก่อน) ของตัวเลขที่ผู้ป่วยทดสอบเปลี่ยนได้ — เทียบทั้งก้อนเพื่อให้เห็นค่าที่ขยับผิดคาดด้วย */
function countDelta(after: QualityCounts, before: QualityCounts) {
  const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
  return {
    eligible: after.eligible - before.eligible,
    eligibleByLevel: sub(after.eligibleByLevel, before.eligibleByLevel),
    overTargetCaseByLevel: sub(after.overTargetCaseByLevel, before.overTargetCaseByLevel),
    doorToDocCount: after.doorToDocCount - before.doorToDocCount,
    doorToDispositionCount: after.doorToDispositionCount - before.doorToDispositionCount,
    indexDischarges: after.indexDischarges - before.indexDischarges,
    provisionalIndexDischarges: after.provisionalIndexDischarges - before.provisionalIndexDischarges,
    revisitCase: after.revisitCase - before.revisitCase,
  };
}
type Delta = ReturnType<typeof countDelta>;
const CONCURRENT = 'ถ้าค่าอื่นขยับด้วย อาจมีคนในทีมเปิด / Triage / จำหน่าย Visit ER พร้อมกัน หรือผู้ป่วยที่รออยู่รอเกิน Target ระหว่างเทส';

// ---------- ขั้นตอนหน้าจอที่ใช้ซ้ำ ----------

/** เลือกระดับรายงาน + ช่วงเวลา (+ Filter) แล้วกดค้นหา → ข้อมูลที่หน้าจอโหลด */
async function applyFilter(page: Page, filter: QualityFilter): Promise<QualityReport> {
  await chooseGranularity(page, filter.granularity);
  await pickPeriod(page, filter.from, filter.to);
  return searchQuality(page, filter);
}

async function openQualityReport(page: Page) {
  // หน้าเปิดแล้วยิงค่าเริ่มต้น (รายเวร วันนี้) — รอให้ตอบก่อน ไม่ให้มาทับผลค้นหาทีหลัง
  const loaded = waitForApi(page, 'GET', '/cortex-api/er/reports/quality');
  const item = await openErMenu(page, 'รายงานทางสถิติ', 'คุณภาพห้องฉุกเฉิน');
  await expect(page).toHaveURL(/\/cortex\/er\/reports\/quality/);
  await expectOk(await loaded, 'โหลดรายงานคุณภาพห้องฉุกเฉินตอนเปิดหน้า');
  await expect(qualityTable(page, 'สรุปตัวชี้วัดคุณภาพ')).toBeVisible();
  return item;
}

function recordVisit(label: string, visit: ErVisit) {
  test.info().annotations.push({ type: label, description: `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` });
  console.log(`${label}: HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
}

test.describe('SBH-1401 ER รายงานคุณภาพห้องฉุกเฉิน (ER Statistics Report 4.9.8.10.4)', () => {
  test.describe.configure({ timeout: 900_000 });

  // ---------------------------------------------------------------------------------------------
  test(
    'รายงานคุณภาพห้องฉุกเฉิน: Filter ตามระดับรายงาน · โครงไฟล์ Excel · ผลรวมรายเวร = รายวัน = รายเดือน · ช่วงเวลาไม่ถูกต้อง/ยาว (Super_User)',
    {
      tag: ['@SBH-1401', '@SBH-2343', '@SBH-2344', '@SBH-2348', '@SBH-2350'],
      annotation: [linear('SBH-1401'), linear('SBH-2338')],
    },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const main = page.getByRole('main');
      const day = today();
      const month = currentMonth();

      await test.step('เตรียม: เปิด ER Dashboard', async () => {
        await gotoErDashboard(page);
      });

      // ---------------- TC-001 ----------------
      await checkStep(page, 'TC-001 (SBH-2343) Granularity 3 ค่า เลือกได้ทีละค่า · ช่วงเวลาเปลี่ยนตามระดับ · Filter เวร / ESI', async () => {
        await checkStep(page, 'เมนูรายงานทางสถิติ → คุณภาพห้องฉุกเฉิน เปิดหน้ารายงานได้ ไม่ใช่หน้า coming soon', async () => {
          await openErMenu(page, 'รายงานทางสถิติ');
          const item = page.getByRole('menuitem', { name: 'คุณภาพห้องฉุกเฉิน' });
          await markEvidence(clicked(item));
          await snapEvidence(page, 'ก่อนกด — เมนู รายงานทางสถิติ → คุณภาพห้องฉุกเฉิน');
          const loaded = waitForApi(page, 'GET', '/cortex-api/er/reports/quality');
          await item.click();
          await expect(page).toHaveURL(/\/cortex\/er\/reports\/quality/);
          await expectOk(await loaded, 'โหลดรายงานคุณภาพห้องฉุกเฉินตอนเปิดหน้า');
          const heading = main.getByText('คุณภาพห้องฉุกเฉิน', { exact: true }).first();
          await expect(heading).toBeVisible();
          await expect(main.getByText(/coming soon|เร็ว ๆ นี้|เร็วๆ นี้/i)).toHaveCount(0);
          await expect(exportButton(page)).toBeVisible();
          await markEvidence(expected(heading), expected(main.getByRole('radiogroup')), expected(exportButton(page)));
        });

        await checkStep(page, 'ระดับรายงานมี 3 ค่า รายเวร · รายวัน · รายเดือน และเลือกได้ทีละค่าเดียว (ค่าเริ่มต้น รายเวร)', async () => {
          const radios = main.getByRole('radiogroup').getByRole('radio');
          await expect(radios).toHaveCount(3);
          await expect(granularityRadio(page, 'shift')).toBeChecked();
          for (const g of ['day', 'month', 'shift'] as Granularity[]) {
            await chooseGranularity(page, g);
            for (const other of (['shift', 'day', 'month'] as Granularity[]).filter((o) => o !== g)) {
              await expect(granularityRadio(page, other), `เลือก ${GRANULARITY_LABEL[g]} แล้ว ${GRANULARITY_LABEL[other]} ต้องไม่ถูกเลือก`).not.toBeChecked();
            }
          }
          await markEvidence(expected(main.getByRole('radiogroup')));
        });

        await checkStep(page, 'รายเวร: เลือกช่วงวันที่ได้ และมีตัวเลือกเวร เช้า · บ่าย · ดึก ค่าเริ่มต้นเลือกครบทุกเวร', async () => {
          const { from, to } = periodInputs(page);
          await expect(from).toHaveAttribute('placeholder', 'วันเริ่มต้น');
          // สลับระดับไปมาแล้วช่วงเปลี่ยนตาม (เช่น จากรายเดือนกลับมาเป็นวันที่ 1 ของเดือน) → เช็คแค่รูปแบบวันที่
          await expect(from).toHaveValue(/^\d{2}\/\d{2}\/25\d{2}$/);
          await expect(to).toHaveValue(/^\d{2}\/\d{2}\/25\d{2}$/);
          await expect(selectBox(shiftSelect(page))).toContainText('ทั้งหมด (3 เวร)');
          const dropdown = await keepOptions(page, shiftSelect(page), ['เช้า', 'บ่าย', 'ดึก']);
          const options = dropdown.locator('.ant-select-item-option');
          await expect(options).toHaveText(['เช้า', 'บ่าย', 'ดึก']);
          await expect(dropdown.locator('.ant-select-item-option-selected')).toHaveCount(3);
          await markEvidence(expected(from), expected(to), expected(selectBox(shiftSelect(page))), expected(dropdown));
        });
        await page.keyboard.press('Escape');

        await checkStep(page, 'รายวัน: ช่องช่วงเวลาเป็นช่วงวันที่ (DD/MM/พ.ศ.) และไม่มีตัวเลือกเวร', async () => {
          await chooseGranularity(page, 'day');
          const { from, to } = periodInputs(page);
          await expect(from).toHaveAttribute('placeholder', 'วันเริ่มต้น');
          await expect(to).toHaveAccessibleName('วันสิ้นสุด');
          await expect(from).toHaveValue(/^\d{2}\/\d{2}\/25\d{2}$/);
          await expect(shiftSelect(page)).toHaveCount(0);
          await markEvidence(expected(main.getByRole('radiogroup')), expected(from), expected(to));
        });

        await checkStep(page, 'รายเดือน: ช่องช่วงเวลาเป็นเดือน/ปี (MM/พ.ศ.)', async () => {
          await chooseGranularity(page, 'month');
          const { from, to } = periodInputs(page);
          await expect(from).toHaveAttribute('placeholder', 'เดือนเริ่มต้น');
          await expect(to).toHaveAccessibleName('เดือนสิ้นสุด');
          await expect(from).toHaveValue(/^\d{2}\/25\d{2}$/);
          await expect(to).toHaveValue(monthLabel(month));
          await markEvidence(expected(main.getByRole('radiogroup')), expected(from), expected(to));
        });

        await checkStep(page, 'ESI / Triage Level เลือกได้มากกว่า 1 ระดับ และค่าเริ่มต้นเลือกครบทั้ง 5 ระดับ', async () => {
          const box = selectBox(esiSelect(page));
          await expect(box).toContainText('ทั้งหมด (5 ระดับ)');
          await expect(box).toHaveClass(/ant-select-multiple/);
          const dropdown = await keepOptions(page, esiSelect(page), ESI_LEVELS.map((l) => `ESI ${l}`));
          await expect(dropdown.locator('.ant-select-item-option')).toHaveText(ESI_LEVELS.map((l) => `ESI ${l}`));
          await expect(dropdown.locator('.ant-select-item-option-selected')).toHaveCount(5);
          await markEvidence(expected(box), expected(dropdown));
        });
        await page.keyboard.press('Escape');

        await checkStep(page, 'ข้อสังเกต (R29): เปลี่ยนระดับเป็นรายเดือนแล้วกด Export Excel ทันทีโดยยังไม่กดค้นหา — ไฟล์ได้ระดับไหน', async () => {
          await expect(granularityRadio(page, 'month')).toBeChecked();
          await markEvidence(expected(main.getByRole('radiogroup')), clicked(exportButton(page)));
          await snapEvidence(page, 'ก่อนกด — เลือกรายเดือน (ยังไม่กดค้นหา) แล้วกด Export Excel');
          const file = await exportQuality(page);
          const got = file.query.get('granularity');
          note(
            got === 'month'
              ? 'เลือกรายเดือนแล้วกด Export ทันที ได้ไฟล์รายเดือนตามที่เลือก'
              : `เลือกรายเดือนแล้วกด Export ทันที (ยังไม่กดค้นหา) ได้ไฟล์ระดับ ${got} ช่วง ${file.query.get('from')} – ${file.query.get('to')} (${file.filename}) — Export ใช้ Filter ของการค้นหาครั้งล่าสุด ต้องกดค้นหาก่อน (ผู้ใช้ให้ลงเป็นข้อสังเกต)`,
          );
          await markEvidence(expected(main.getByRole('radiogroup')));
        });

        // ---------------- (ก) Filter บางค่า ----------------
        await checkStep(page, 'เพิ่ม (ก): เลือก ESI 1–2 และเวรเช้าเท่านั้น → ตัวเลขเหลือเฉพาะ ESI / เวรที่เลือก', async () => {
          const filter: QualityFilter = { granularity: 'shift', from: addDays(day, -6), to: day, shifts: ['morning'], esi: [1, 2] };
          await chooseGranularity(page, 'shift');
          await pickPeriod(page, filter.from, filter.to);
          await keepOptions(page, esiSelect(page), ['ESI 1', 'ESI 2']);
          await page.keyboard.press('Escape');
          await keepOptions(page, shiftSelect(page), ['เช้า']);
          await page.keyboard.press('Escape');
          const filtered = await searchQuality(page, filter);
          const full = await fetchQuality(page, authorization(), { granularity: 'shift', from: filter.from, to: filter.to });
          await test.info().attach('ข้อมูลไม่กรอง (ทุกเวร ทุก ESI) ช่วงเดียวกัน', { body: JSON.stringify(full, null, 2), contentType: 'application/json' });
          expect(filtered.rows.every((r) => r.shiftCode === 'morning'), 'ทุกแถวต้องเป็นเวรเช้า').toBe(true);
          for (const row of filtered.rows) {
            const same = full.rows.find((r) => r.date === row.date && r.shiftCode === 'morning');
            expect(same, `ข้อมูลไม่กรองต้องมีแถว ${row.date} เวรเช้า`).toBeTruthy();
            const at = `${dayLabel(row.date)} เช้า`;
            expect(row.eligibleByLevel.slice(2), `${at}: ESI 3–5 ต้องเป็น 0`).toEqual([0, 0, 0]);
            expect(row.eligible, `${at}: Eligible = ESI 1 + ESI 2 ของข้อมูลไม่กรอง`).toBe(same!.eligibleByLevel[0] + same!.eligibleByLevel[1]);
            expect(row.overTargetCase, `${at}: Over Target = ESI 1 + ESI 2 ของข้อมูลไม่กรอง`).toBe(same!.overTargetCaseByLevel[0] + same!.overTargetCaseByLevel[1]);
          }
          await expectScreenMatches(page, 'shift', filtered);
          const table = qualityTable(page, 'สรุปตัวชี้วัดคุณภาพ');
          await markEvidence(filled(selectBox(esiSelect(page))), filled(selectBox(shiftSelect(page))), clicked(searchButton(page)), expected(table));
        });
      });

      // ---------------- TC-002 ----------------
      const dayFilter: QualityFilter = { granularity: 'day', from: addDays(day, -13), to: day };
      let dayReport!: QualityReport;
      let daySheets!: Sheet[];
      let dayFile!: Awaited<ReturnType<typeof exportQuality>>;
      await checkStep(page, 'TC-002 (SBH-2344) Export รายวัน: โครงไฟล์ 3 sheet · KPI 4 ข้อ · Breakdown ต่อวัน · Config & Assumptions', async () => {
        await openQualityReport(page); // ล้าง Filter ESI / เวรของขั้นก่อน
        await checkStep(page, `เลือกรายวัน ${dayLabel(dayFilter.from)} – ${dayLabel(dayFilter.to)} → ค้นหา → Export Excel ได้ไฟล์ .xlsx`, async () => {
          dayReport = await applyFilter(page, dayFilter);
          await expectScreenMatches(page, 'day', dayReport);
          dayFile = await exportQuality(page);
          expect(dayFile.filename, 'ชื่อไฟล์ตามระดับและช่วง').toBe(`er-quality-report_day_${dayFilter.from}_${dayFilter.to}.xlsx`);
          daySheets = await readWorkbook(dayFile.path);
          const { from, to } = periodInputs(page);
          await markEvidence(filled(from), filled(to), clicked(exportButton(page)), expected(qualityTable(page, 'สรุปตัวชี้วัดคุณภาพ')));
        });

        await checkStep(page, 'ไฟล์มี sheet รายวัน · Config & Assumptions · 72h Revisit Detail', async () => {
          expect(daySheets.map((s) => s.name)).toEqual(['รายวัน', 'Config & Assumptions', '72h Revisit Detail']);
          const overlay = await showSheet(page, dayFile.filename, daySheets[0], `ไฟล์มี ${daySheets.length} sheet: ${daySheets.map((s) => s.name).join(' · ')}`);
          await markEvidence(expected(overlay.locator('[data-sheet-title]')));
        });
        await hideSheet(page);

        await checkStep(page, 'sheet รายวัน: หัวรายงาน + Filter · การ์ด KPI 4 ข้อ (Door-to-doc · Door-to-disposition · Over target · 72h Revisit) ตรงกับยอดทั้งช่วง', async () => {
          const sheet = daySheets[0];
          expect(sheet.rows[0][0]).toBe('4.9.8.10.4 คุณภาพห้องฉุกเฉิน — มุมมองรายวัน');
          expect(String(sheet.rows[2][0])).toContain(`ช่วงเวลา=${dayLabel(dayFilter.from)} – ${dayLabel(dayFilter.to)}`);
          expect(String(sheet.rows[2][0])).toContain('Granularity=รายวัน');
          const kpi = sheet.rows.findIndex((r) => r[0] === 'Door-to-doc (นาที)');
          expect(sheet.rows[kpi].slice(0, 4)).toEqual(['Door-to-doc (นาที)', 'Door-to-disposition (นาที)', 'Over Target Waiting (ราย / %)', '72h Revisit (ราย / %)']);
          const t = dayReport.total;
          expectNumberCell(sheet.rows[kpi + 1][0] ?? null, t.doorToDocMeanMinutes, 'KPI Door-to-doc');
          expectNumberCell(sheet.rows[kpi + 1][1] ?? null, t.doorToDispositionMeanMinutes, 'KPI Door-to-disposition');
          expect(sheet.rows[kpi + 1][2], 'KPI Over Target (ราย)').toBe(t.overTargetCase);
          expect(sheet.rows[kpi + 1][3], 'KPI 72h Revisit (ราย)').toBe(t.revisitCase);
          expectNumberCell(sheet.rows[kpi + 2][2] ?? null, t.overTargetRate, 'KPI Over Target (%)');
          expectNumberCell(sheet.rows[kpi + 2][3] ?? null, t.revisitRate, 'KPI 72h Revisit (%)');
          const overlay = await showSheet(page, dayFile.filename, sheet);
          await markEvidence(expected(sheetCell(overlay, 'A1')), expected(sheetCell(overlay, 'A3')), expected(sheetRow(overlay, kpi + 1)), expected(sheetRow(overlay, kpi + 2)), expected(sheetRow(overlay, kpi + 3)));
        });
        await hideSheet(page);

        await checkStep(page, `Breakdown 1 แถวต่อ 1 วัน (${daysBetween(dayFilter.from, dayFilter.to).length} วัน) + ตาราง Over Target แยก ESI ทั้งจำนวนและ % — ตรงกับหน้าจอและ API ทุกช่อง`, async () => {
          expect(dayReport.rows.map((r) => r.date), 'API ต้องมีครบทุกวันในช่วง แม้วันที่ไม่มีผู้ป่วย').toEqual(daysBetween(dayFilter.from, dayFilter.to));
          const { breakdown } = expectSheetMatches(daySheets[0], 'day', dayReport);
          const overlay = await showSheet(page, dayFile.filename, daySheets[0]);
          await markEvidence(expected(sheetRow(overlay, breakdown.headerRow)), ...breakdown.rows.map((_, i) => expected(sheetRow(overlay, breakdown.firstRow + i))));
        });
        await hideSheet(page);

        await checkStep(page, 'วันที่ไม่มีผู้ป่วยยังมีแถว — ค่าเฉลี่ยและ % ที่ไม่มีตัวหารเว้นว่าง ไม่ใช่ 0 · ตัวเลขทศนิยม 1 ตำแหน่ง · วันที่ พ.ศ.', async () => {
          const sheet = daySheets[0];
          const breakdown = block(sheet, 'Breakdown');
          const empty = dayReport.rows.map((r, i) => ({ r, i })).filter(({ r }) => r.eligible === 0);
          if (!empty.length) note(`ช่วง ${dayLabel(dayFilter.from)} – ${dayLabel(dayFilter.to)} มีผู้ป่วยทุกวัน — ไม่มีแถวว่างให้เช็ค`);
          for (const { r, i } of empty) {
            for (const header of [EXCEL.d2d, EXCEL.d2disp, EXCEL.otRate, EXCEL.rvRate]) {
              expect(cell(breakdown, i, header), `Excel ${dayLabel(r.date)} (ไม่มีผู้ป่วย) · ${header} ต้องเว้นว่าง`).toBeNull();
            }
          }
          const col = (header: string) => String.fromCharCode(65 + breakdown.header.indexOf(header));
          for (const [header, format] of [
            [EXCEL.d2d, /^0\.0$/],
            [EXCEL.d2disp, /^0\.0$/],
            [EXCEL.otRate, /^0\.0%$/],
            [EXCEL.rvRate, /^0\.0%$/],
          ] as const) {
            const ref = `${col(header)}${breakdown.firstRow + breakdown.rows.length - 1}`;
            expect(sheet.formats.get(ref), `รูปแบบตัวเลขของ ${header} (${ref})`).toMatch(format);
          }
          for (const label of breakdown.rows.slice(0, -1).map((r) => r[0])) expect(String(label)).toMatch(/^\d{2}\/\d{2}\/25\d{2}$/);
          const overlay = await showSheet(page, dayFile.filename, sheet, empty.length ? `วันที่ไม่มีผู้ป่วย: ${empty.map(({ r }) => dayLabel(r.date)).join(', ')}` : undefined);
          const marks = empty.length ? empty.map(({ i }) => expected(sheetRow(overlay, breakdown.firstRow + i))) : [expected(sheetRow(overlay, breakdown.firstRow))];
          await markEvidence(...marks);
        });
        await hideSheet(page);

        let settings!: WaitTimeSetting[];
        await checkStep(page, 'sheet Config & Assumptions: Filter ที่เลือก · Target ต่อ ESI ตรงกับตั้งค่าเวลารอตรวจ · เวลา Export', async () => {
          const config = daySheets[1];
          settings = await fetchWaitTimeSettings(page, authorization());
          expect(configValue(config, 'ช่วงเวลา (เริ่ม)')).toBe(dayLabel(dayFilter.from));
          expect(configValue(config, 'ช่วงเวลา (สิ้นสุด)')).toBe(dayLabel(dayFilter.to));
          expect(configValue(config, 'ระดับรายงาน (Granularity)')).toBe('รายวัน');
          expect(configValue(config, 'ESI / Triage Level')).toBe('ทั้งหมด (5 ระดับ)');
          const generated = parseThaiDateTime(String(configValue(config, 'เวลา Export (Generated At)')));
          expect(Math.abs(generated.getTime() - dayFile.clickedAt.getTime()), 'เวลา Export ต้องตรงกับเวลาที่กด (ภายใน 2 นาที)').toBeLessThan(120_000);
          expect(String(configValue(config, 'Export โดย')).trim()).not.toBe('');
          const cutoff = parseThaiDateTime(String(configValue(config, '72h Cutoff')));
          expect(generated.getTime() - cutoff.getTime(), '72h Cutoff = เวลา Export − 72 ชั่วโมง').toBe(72 * 3_600_000);
          for (const s of settings) {
            expect(configValue(config, `ESI ${s.level} ${ESI_NAMES[s.level - 1]}`), `Target ESI ${s.level}`).toBe(targetText(s));
          }
          const overlay = await showSheet(page, dayFile.filename, config);
          const rows = ['ช่วงเวลา (เริ่ม)', 'ช่วงเวลา (สิ้นสุด)', 'ระดับรายงาน (Granularity)', 'ESI / Triage Level', 'เวลา Export (Generated At)', ...settings.map((s) => `ESI ${s.level} ${ESI_NAMES[s.level - 1]}`)];
          await markEvidence(...rows.map((label) => expected(sheetRow(overlay, configRow(config, label)))));
        });
        await hideSheet(page);

        await checkStep(page, 'หน้า ตั้งค่าเวลารอตรวจ แสดง Target เดียวกับใน Config & Assumptions', async () => {
          await openErMenu(page, 'ตั้งค่า', 'ตั้งค่าเวลารอตรวจ');
          await expect(page).toHaveURL(/er-triage-wait-time-targets/);
          const spins = main.getByRole('spinbutton');
          await expect(spins).toHaveCount(5);
          for (const s of settings) {
            const toggle = main.getByRole('switch', { name: 'ไม่จำกัดเวลา' }).nth(s.level - 1);
            if (s.limitSeconds === null) await expect(toggle).toBeChecked();
            else await expect(spins.nth(s.level - 1)).toHaveValue(String(s.limitSeconds / 60));
          }
          await markEvidence(...ESI_LEVELS.map((l) => expected(spins.nth(l - 1))));
        });
      });

      // ---------------- TC-006 ----------------
      await checkStep(page, 'TC-006 (SBH-2348) ผลรวมรายเวรในวันเดียวกัน = รายวัน · ผลรวมรายวันในเดือน = รายเดือน', async () => {
        const first = `${month}-01`;
        const range: Record<Granularity, QualityFilter> = {
          shift: { granularity: 'shift', from: first, to: day },
          day: { granularity: 'day', from: first, to: day },
          month: { granularity: 'month', from: month, to: month },
        };
        const reports = {} as Record<Granularity, QualityReport>;
        const sheets = {} as Record<Granularity, { sheet: Sheet; filename: string }>;
        await openQualityReport(page);
        for (const g of ['shift', 'day', 'month'] as Granularity[]) {
          await checkStep(page, `Export ${GRANULARITY_LABEL[g]} ${g === 'month' ? monthLabel(month) : `${dayLabel(first)} – ${dayLabel(day)}`}`, async () => {
            reports[g] = await applyFilter(page, range[g]);
            const file = await exportQuality(page);
            expect(file.query.get('granularity')).toBe(g);
            sheets[g] = { sheet: (await readWorkbook(file.path))[0], filename: file.filename };
            expectSheetMatches(sheets[g].sheet, g, reports[g]);
            const { from, to } = periodInputs(page);
            await markEvidence(expected(main.getByRole('radiogroup')), filled(from), filled(to), clicked(exportButton(page)));
          });
        }

        type Sum = { eligible: number; ot: number; otByLevel: number[]; rv: number; index: number; provisional: number; d2d: number; d2dN: number; d2disp: number; d2dispN: number };
        const zero = (): Sum => ({ eligible: 0, ot: 0, otByLevel: [0, 0, 0, 0, 0], rv: 0, index: 0, provisional: 0, d2d: 0, d2dN: 0, d2disp: 0, d2dispN: 0 });
        const add = (s: Sum, c: QualityCounts) => {
          s.eligible += c.eligible;
          s.ot += c.overTargetCase;
          c.overTargetCaseByLevel.forEach((v, i) => (s.otByLevel[i] += v));
          s.rv += c.revisitCase;
          s.index += c.indexDischarges;
          s.provisional += c.provisionalIndexDischarges;
          s.d2d += meanSum(c.doorToDocMeanMinutes, c.doorToDocCount);
          s.d2dN += c.doorToDocCount;
          s.d2disp += meanSum(c.doorToDispositionMeanMinutes, c.doorToDispositionCount);
          s.d2dispN += c.doorToDispositionCount;
          return s;
        };
        const expectSame = (got: Sum, want: QualityCounts, what: string) => {
          expect({ eligible: got.eligible, ot: got.ot, otByLevel: got.otByLevel, rv: got.rv, index: got.index, provisional: got.provisional, d2dN: got.d2dN, d2dispN: got.d2dispN }, what).toEqual({
            eligible: want.eligible,
            ot: want.overTargetCase,
            otByLevel: want.overTargetCaseByLevel,
            rv: want.revisitCase,
            index: want.indexDischarges,
            provisional: want.provisionalIndexDischarges,
            d2dN: want.doorToDocCount,
            d2dispN: want.doorToDispositionCount,
          });
          expect(got.d2d, `${what} · Door-to-doc (ผลรวมนาที)`).toBeCloseTo(meanSum(want.doorToDocMeanMinutes, want.doorToDocCount), 4);
          expect(got.d2disp, `${what} · Door-to-disposition (ผลรวมนาที)`).toBeCloseTo(meanSum(want.doorToDispositionMeanMinutes, want.doorToDispositionCount), 4);
        };

        await checkStep(page, 'ทุกวัน: ผลรวมทุกเวร (รวมแถวไม่ระบุเวรถ้ามี) = ค่าของวันนั้นในรายงานรายวัน', async () => {
          const unassigned = reports.shift.rows.filter((r) => r.unassigned);
          note(unassigned.length ? `มีแถว "ไม่ระบุเวร" ${unassigned.length} แถว (${unassigned.map((r) => dayLabel(r.date)).join(', ')})` : 'ช่วงนี้ไม่มีแถว "ไม่ระบุเวร" — เวรที่ตั้งไว้ครอบคลุมทั้ง 24 ชั่วโมง / ไม่มีผู้ป่วยมานอกเวร');
          for (const dayRow of reports.day.rows) {
            const shifts = reports.shift.rows.filter((r) => r.date === dayRow.date);
            expect(shifts.length, `${dayLabel(dayRow.date)} ต้องมีแถวรายเวร`).toBeGreaterThanOrEqual(3);
            expectSame(shifts.reduce(add, zero()), dayRow, `${dayLabel(dayRow.date)}: ผลรวมรายเวร = รายวัน`);
          }
          const busiest = [...reports.day.rows].sort((a, b) => b.eligible - a.eligible)[0];
          const shiftBlock = block(sheets.shift.sheet, 'Breakdown');
          const overlay = await showSheet(page, sheets.shift.filename, sheets.shift.sheet, `ตัวอย่างวัน ${dayLabel(busiest.date)} (ผู้ป่วยมากสุด) — รายวันแถวนี้ = ${busiest.eligible} ราย`);
          const shiftRows = shiftBlock.rows.map((r, i) => ({ r, i })).filter(({ r }) => r[0] === dayLabel(busiest.date));
          await markEvidence(...shiftRows.map(({ i }) => expected(sheetRow(overlay, shiftBlock.firstRow + i))));
          await hideSheet(page);
          const dayBlock = block(sheets.day.sheet, 'Breakdown');
          const dayOverlay = await showSheet(page, sheets.day.filename, sheets.day.sheet, `วัน ${dayLabel(busiest.date)} ต้องเท่ากับผลรวมเวรในภาพก่อนหน้า`);
          await markEvidence(expected(sheetRow(dayOverlay, dayBlock.firstRow + dayBlock.rows.findIndex((r) => r[0] === dayLabel(busiest.date)))));
        });
        await hideSheet(page);

        await checkStep(page, `ผลรวมทุกวันของเดือน ${monthLabel(month)} = ค่าของเดือนในรายงานรายเดือน`, async () => {
          expect(reports.month.rows.map((r) => r.date)).toEqual([month]);
          expectSame(reports.day.rows.reduce(add, zero()), reports.month.rows[0], `${monthLabel(month)}: ผลรวมรายวัน = รายเดือน`);
          expectSame(reports.shift.rows.reduce(add, zero()), reports.month.rows[0], `${monthLabel(month)}: ผลรวมรายเวร = รายเดือน`);
          const monthBlock = block(sheets.month.sheet, 'Breakdown');
          const overlay = await showSheet(page, sheets.month.filename, sheets.month.sheet, `รายวันรวมทั้งเดือน: Eligible ${reports.day.total.eligible} · Over Target ${reports.day.total.overTargetCase} · Revisit ${reports.day.total.revisitCase}`);
          await markEvidence(expected(sheetRow(overlay, monthBlock.firstRow)), expected(overlay.locator('[data-sheet-title]')));
        });
        await hideSheet(page);
      });

      // ---------------- TC-008 ----------------
      await checkStep(page, 'TC-008 (SBH-2350) ช่วงเวลาไม่ถูกต้อง · ช่วงยาวกว่า 92 วัน / 24 เดือน ทั้งรายงานคุณภาพและรายงานเดิม', async () => {
        await openQualityReport(page);
        await checkStep(page, 'รายวัน: เลือกวันเริ่มหลังวันสิ้นสุด → หน้าจอไม่ยอมให้เป็นช่วงกลับด้าน และ API ปฏิเสธ (400)', async () => {
          await chooseGranularity(page, 'day');
          const later = day;
          const earlier = addDays(day, -5);
          await periodInputs(page).from.click();
          await markEvidence(clicked(pickerDropdown(page).locator(`td.ant-picker-cell-in-view[title="${later}"]`)));
          await snapEvidence(page, `ก่อนกด — วันเริ่ม ${dayLabel(later)} (กดก่อน) แล้วจึงกดวันสิ้นสุด ${dayLabel(earlier)}`);
          await clickCalendarCell(page, later);
          await clickCalendarCell(page, earlier);
          const { from, to } = periodInputs(page);
          const shown = [await from.inputValue(), await to.inputValue()];
          note(`เลือกวันเริ่ม ${dayLabel(later)} แล้ววันสิ้นสุด ${dayLabel(earlier)} → ช่องแสดง ${shown.join(' – ')} (ปฏิทินสลับให้เป็นช่วงที่ถูกต้องเอง จึงสั่ง Export ช่วงกลับด้านจากหน้าจอไม่ได้)`);
          expect(shown, 'หน้าจอต้องไม่แสดงช่วงกลับด้าน').toEqual([dayLabel(earlier), dayLabel(later)]);
          const res = await page.request.get(`/cortex-api/er/reports/quality/export?granularity=day&from=${later}&to=${earlier}`, { headers: { authorization: authorization() } });
          const body = await res.text();
          await test.info().attach(`GET …/quality/export?granularity=day&from=${later}&to=${earlier} → ${res.status()}`, { body, contentType: 'application/json' });
          expect(res.status(), 'API ต้องไม่ export ช่วงกลับด้าน').toBe(400);
          expect(body).toContain('to must not be before from');
          await markEvidence(expected(from), expected(to));
        });

        await checkStep(page, 'รายวัน ช่วงยาวกว่า 92 วัน (121 วัน) → Export ได้ ไม่ถูกจำกัด', async () => {
          const filter: QualityFilter = { granularity: 'day', from: addDays(day, -120), to: day };
          const report = await applyFilter(page, filter);
          expect(report.rows).toHaveLength(121);
          const file = await exportQuality(page);
          const sheet = (await readWorkbook(file.path))[0];
          expect(block(sheet, 'Breakdown').rows, 'ไฟล์ต้องมีครบ 121 วัน + แถวรวม').toHaveLength(122);
          const { from, to } = periodInputs(page);
          await markEvidence(filled(from), filled(to), clicked(exportButton(page)), expected(qualityTable(page, 'สรุปตัวชี้วัดคุณภาพ')));
        });

        await checkStep(page, 'รายเดือน ช่วงยาวกว่า 24 เดือน (31 เดือน) → Export ได้ ไม่ถูกจำกัด', async () => {
          const filter: QualityFilter = { granularity: 'month', from: addMonths(month, -30), to: month };
          const report = await applyFilter(page, filter);
          expect(report.rows).toHaveLength(31);
          const file = await exportQuality(page);
          const sheet = (await readWorkbook(file.path))[0];
          expect(block(sheet, 'Breakdown').rows, 'ไฟล์ต้องมีครบ 31 เดือน + แถวรวม').toHaveLength(32);
          const { from, to } = periodInputs(page);
          await markEvidence(filled(from), filled(to), clicked(exportButton(page)), expected(qualityTable(page, 'สรุปตัวชี้วัดคุณภาพ')));
        });

        const oldRangeError = page.locator('.ant-message-error, .ant-form-item-explain-error, .ant-notification-notice-error');
        for (const [menu, path, days] of [
          ['รายงานรายเวร', '/cortex-api/er/reports/shift', 100],
          ['รายงานรายวัน', '/cortex-api/er/reports/daily', 100],
        ] as const) {
          await checkStep(page, `${menu} (รายงานเดิม) ช่วงยาวกว่า 92 วัน (${days + 1} วัน) → ค้นหาได้ ไม่มีข้อความจำกัดช่วง`, async () => {
            const loaded = waitForApi(page, 'GET', path);
            await openErMenu(page, 'รายงานทางสถิติ', menu);
            await expectOk(await loaded, `โหลด${menu}ตอนเปิดหน้า`);
            const from = addDays(day, -days);
            const start = main.getByRole('textbox', { name: 'ช่วงวันที่' });
            const end = main.getByRole('textbox', { name: 'วันสิ้นสุด' });
            if (await start.isEditable()) {
              for (const [box, value] of [
                [start, from],
                [end, day],
              ] as const) {
                await box.click();
                await box.fill(value);
                await box.press('Enter');
              }
              if (await pickerDropdown(page).isVisible()) await page.keyboard.press('Escape');
            } else {
              await start.click();
              await clickCalendarCell(page, from);
              await clickCalendarCell(page, day);
            }
            const searched = page.waitForResponse((res) => {
              const url = new URL(res.url());
              return url.pathname === path && url.searchParams.get('from') === from && url.searchParams.get('to') === day;
            });
            await main.getByRole('button', { name: 'search ค้นหา' }).click();
            await expectOk(await searched, `${menu} ช่วง ${from} – ${day}`);
            await expect(oldRangeError).toHaveCount(0);
            await expect(main.getByText(/92 วัน|ไม่เกิน/)).toHaveCount(0);
            await markEvidence(filled(start), filled(end), clicked(main.getByRole('button', { name: 'search ค้นหา' })), expected(main.getByRole('table').first()));
          });
        }

        await checkStep(page, 'รายงานรายเดือน (รายงานเดิม) ช่วงยาวกว่า 24 เดือน (31 เดือน) → ค้นหาได้ ไม่มีข้อความจำกัดช่วง', async () => {
          const loaded = waitForApi(page, 'GET', '/cortex-api/er/reports/monthly');
          await openErMenu(page, 'รายงานทางสถิติ', 'รายงานรายเดือน');
          await expectOk(await loaded, 'โหลดรายงานรายเดือนตอนเปิดหน้า');
          const from = addMonths(month, -30);
          await setMonthRange(page, from, month);
          const report = await searchMonthly(page, from, month);
          expect(report.rows).toHaveLength(31);
          await expect(oldRangeError).toHaveCount(0);
          await markEvidence(filled(main.getByRole('textbox', { name: 'ช่วงวันที่' })), filled(main.getByRole('textbox', { name: 'เดือนสิ้นสุด' })), clicked(main.getByRole('button', { name: 'ค้นหา' })), expected(main.getByRole('table').first()));
        });
      });
    },
  );

  // ---------------------------------------------------------------------------------------------
  let originalSettings: WaitTimeSetting[] | undefined;
  let settingsChanged = false;
  let restoreAuth: (() => string) | undefined;

  test.afterEach(async ({ page }) => {
    // คืนค่าตั้งค่าเวลารอตรวจถ้าเทสพังก่อนถึงขั้นคืนค่าผ่านหน้าจอ (R29 ข้อ 1) — ค่านี้ทั้งทีมใช้ร่วมกัน
    if (!settingsChanged || !originalSettings || !restoreAuth) return;
    await restoreWaitTimeSettings(page, restoreAuth(), originalSettings);
    test.info().annotations.push({ type: 'คืนค่าตั้งค่าเวลารอตรวจ', description: `คืนผ่าน API หลังเทสพัง: ${JSON.stringify(originalSettings)}` });
    settingsChanged = false;
  });

  test(
    'ข้อมูลควบคุม: ESI 5 ไม่จำกัด · ผู้ป่วย AUTO ใหม่ (ยังไม่ Triage / ESI 1 ไม่ Acknowledge / ESI 3 Acknowledge + จำหน่าย / ESI 4 ส่งต่อ) → Door-to-doc · Door-to-disposition · Over target · 72h Revisit (Super_User)',
    {
      tag: ['@SBH-1401', '@SBH-2344', '@SBH-2345', '@SBH-2346', '@SBH-2347'],
      annotation: [linear('SBH-1401'), linear('SBH-2338')],
    },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      restoreAuth = authorization;
      const main = page.getByRole('main');
      const day = today();
      const month = currentMonth();
      const todayFilter: QualityFilter = { granularity: 'day', from: day, to: day };
      const readToday = async () => (await fetchQuality(page, authorization(), todayFilter)).rows[0];
      const attachDelta = (name: string, delta: Delta) => test.info().attach(name, { body: JSON.stringify(delta, null, 2), contentType: 'application/json' });

      await test.step('เตรียม: เปิด ER Dashboard + จดค่าตั้งค่าเวลารอตรวจเดิม', async () => {
        await gotoErDashboard(page);
        originalSettings = await fetchWaitTimeSettings(page, authorization());
        await test.info().attach('ค่าตั้งค่าเวลารอตรวจเดิม', { body: JSON.stringify(originalSettings, null, 2), contentType: 'application/json' });
        expect(originalSettings.find((s) => s.level === 5)?.limitSeconds, 'ESI 5 ต้องมีเวลาจำกัดอยู่ก่อน (เทสจะปิดเป็นไม่จำกัดชั่วคราว)').not.toBeNull();
      });

      // ---------------- TC-004: ระดับที่ไม่จำกัด ----------------
      await checkStep(page, 'TC-004 (SBH-2346) ปิด ESI 5 (ไม่เร่งด่วน) เป็นไม่จำกัดเวลา → ESI 5 ไม่มีเคสเกิน Target แต่ยังอยู่ในตัวหาร', async () => {
        const monthFilter: QualityFilter = { granularity: 'month', from: month, to: month };
        const before = (await fetchQuality(page, authorization(), monthFilter)).rows[0];
        await checkStep(page, 'หน้า ตั้งค่าเวลารอตรวจ: เปิดสวิตช์ "ไม่จำกัดเวลา" ของไม่เร่งด่วน แล้วบันทึก', async () => {
          await openErMenu(page, 'ตั้งค่า', 'ตั้งค่าเวลารอตรวจ');
          await expect(page).toHaveURL(/er-triage-wait-time-targets/);
          await expect(main.getByRole('strong')).toHaveText(ESI_NAMES);
          const toggle = main.getByRole('switch', { name: 'ไม่จำกัดเวลา' }).nth(4);
          await expect(toggle).not.toBeChecked();
          await toggle.click();
          await expect(toggle).toBeChecked();
          const save = main.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' });
          await markEvidence(clicked(toggle), clicked(save));
          await snapEvidence(page, 'ก่อนกด — สวิตช์ไม่จำกัดเวลาของไม่เร่งด่วน + ปุ่มบันทึก');
          const saved = waitForApi(page, 'PATCH', '/cortex-api/er/triage/wait-time-settings');
          settingsChanged = true;
          await save.click();
          const res = await saved;
          await expectOk(res, 'บันทึกตั้งค่าเวลารอตรวจ');
          const items = ((await res.json()) as { items: WaitTimeSetting[] }).items;
          expect(items.find((s) => s.level === 5)?.limitSeconds, 'ESI 5 ต้องเป็นไม่จำกัด (null)').toBeNull();
          await markEvidence(expected(toggle), alerted(page.getByText('บันทึกการตั้งค่าเวลารอตรวจแล้ว')));
        });

        await checkStep(page, `เดือน ${monthLabel(month)}: Over Target ของ ESI 5 = 0 · Eligible ESI 5 เท่าเดิม · % = จำนวนเกิน ÷ Eligible ทั้งหมด`, async () => {
          const after = (await fetchQuality(page, authorization(), monthFilter)).rows[0];
          await test.info().attach('ก่อน / หลังตั้ง ESI 5 ไม่จำกัด (เดือนนี้)', { body: JSON.stringify({ before, after }, null, 2), contentType: 'application/json' });
          expect(after.overTargetCaseByLevel[4], 'ESI 5 ไม่จำกัด → ไม่มีเคสเกิน Target').toBe(0);
          expect(after.eligibleByLevel[4], 'ESI 5 ยังอยู่ในตัวหาร (Eligible เท่าเดิม)').toBe(before.eligibleByLevel[4]);
          expect(after.eligible, 'Eligible ทั้งหมดเท่าเดิม').toBe(before.eligible);
          expect(after.overTargetRateByLevel[4], 'ESI 5: 0 ÷ Eligible').toBe(after.eligibleByLevel[4] ? 0 : null);
          expect(after.overTargetCase, 'Over Target รวม = ผลรวมทุก ESI').toBe(after.overTargetCaseByLevel.reduce((a, b) => a + b, 0));
          expect(after.overTargetRate!, '% Over Target = จำนวนเกิน ÷ Eligible ทั้งหมด (รวม ESI 5)').toBeCloseTo(after.overTargetCase / after.eligible, 10);
          note(`เดือน ${monthLabel(month)}: ESI 5 เกิน Target ${before.overTargetCaseByLevel[4]} → ${after.overTargetCaseByLevel[4]} ราย (Eligible ESI 5 ${after.eligibleByLevel[4]} ราย)`);
          await markEvidence(expected(main.getByRole('switch', { name: 'ไม่จำกัดเวลา' }).nth(4)));
        });
      });

      // ---------------- ผู้ป่วยทดสอบ ----------------
      let baseline!: QualityCounts;
      const visits: Record<string, ErVisit> = {};
      const arrived: Record<string, string> = {};

      /** ผู้ป่วย AUTO ใหม่ → เปิด Visit ER (อยู่หน้าฟอร์ม Triage) */
      async function openNewVisit(key: string, label: string): Promise<ErVisit> {
        await openErMenu(page, 'แดชบอร์ด / คิว');
        await expect(page).toHaveURL(/\/cortex\/er\/dashboard/);
        await openTriagePage(page);
        const { dialog } = await registerNewPatient(page, newTestPatient(`Quality${key}`));
        const visit = await confirmOpenErVisit(page, dialog);
        recordVisit(label, visit);
        await expectTriageFormOpen(page, visit);
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
        visits[key] = visit;
        return visit;
      }

      /** เวลามาถึง / เริ่มรักษาจาก API บอร์ด (ละเอียดระดับมิลลิวินาที เท่ากับที่รายงานใช้) */
      async function boardTimes(visit: ErVisit) {
        const encounters = await fetchBoardEncounters(page, authorization(), day);
        const encounter = encounters.find((e) => e.en === visit.en);
        expect(encounter, `บอร์ดวันนี้ต้องมี ${visit.en}`).toBeTruthy();
        return encounter!;
      }

      await checkStep(page, 'เพิ่ม (ข) + TC-004: ผู้ป่วย P1 เปิด Visit แล้วยังไม่ Triage → ไม่ถูกนับ · Triage ESI 1 (ไม่ Acknowledge) → นับเข้า ESI 1', async () => {
        await checkStep(page, 'P1 เปิด Visit ER (ยังไม่ Triage): Eligible วันนี้ไม่เปลี่ยน', async () => {
          await openErMenu(page, 'แดชบอร์ด / คิว');
          await openTriagePage(page);
          const { dialog } = await registerNewPatient(page, newTestPatient('QualityP1'));
          baseline = await readToday();
          await test.info().attach('ยอดวันนี้ก่อนเพิ่มผู้ป่วยทดสอบ (baseline)', { body: JSON.stringify(baseline, null, 2), contentType: 'application/json' });
          const visit = await confirmOpenErVisit(page, dialog);
          recordVisit('P1 (ESI 1 ไม่ Acknowledge)', visit);
          visits.P1 = visit;
          await expectTriageFormOpen(page, visit);
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          const delta = countDelta(await readToday(), baseline);
          await attachDelta('ผลต่างหลังเปิด Visit P1 (ยังไม่ Triage)', delta);
          expect(delta.eligible, `ยังไม่ Triage ต้องไม่ถูกนับเป็น Eligible — ${CONCURRENT}`).toBe(0);
          arrived.P1 = (await boardTimes(visit)).arrivedAt;
          await markEvidence(expected(main.getByText(visit.en, { exact: true }).filter({ visible: true }).first()), expected(main.getByRole('heading', { name: 'คัดกรอง ER' })));
        });

        await checkStep(page, 'P1 Triage ESI 1 กู้ชีพ (Target 1 นาที) ไม่ Acknowledge: Eligible +1 ที่ ESI 1', async () => {
          await saveTriage(page, visits.P1, 1);
          const delta = countDelta(await readToday(), baseline);
          await attachDelta('ผลต่างหลัง Triage P1', delta);
          expect(delta.eligibleByLevel, CONCURRENT).toEqual([1, 0, 0, 0, 0]);
          expect(delta.doorToDocCount, 'ยังไม่ Acknowledge → ไม่นับใน Door-to-doc').toBe(0);
          await markEvidence(expected(main.getByText('ESI 1', { exact: true }).filter({ visible: true }).first()));
        });
      });

      let p3Summary!: ErDischargeSummary;
      await checkStep(page, 'TC-003 (SBH-2345) ผู้ป่วย P3 ESI 3: Door-to-doc = เวลา Acknowledge − เวลามาถึง · Door-to-disposition = เวลาลงนาม − เวลามาถึง', async () => {
        const visit = await openNewVisit('P3', 'P3 (ESI 3 Acknowledge + จำหน่าย With Approval)');
        await saveTriage(page, visit, 3);

        await checkStep(page, 'Door-to-doc: กด Acknowledge แล้วค่าเฉลี่ยของวันนี้รวมเวลารอของ P3 (นาที) — ผู้ป่วยที่ไม่ Acknowledge ไม่ถูกนับ', async () => {
          const before = await readToday();
          const ackButton = main.getByRole('button', { name: 'Acknowledge' }).first();
          await ackButton.scrollIntoViewIfNeeded();
          await markEvidence(clicked(ackButton));
          await snapEvidence(page, 'ก่อนกด — ปุ่ม Acknowledge ใน ER Physician Note');
          await acknowledgeTreatment(page, visit);
          const times = await boardTimes(visit);
          arrived.P3 = times.arrivedAt;
          expect(times.startedTreatmentAt, 'บอร์ดต้องมีเวลาเริ่มรักษาหลัง Acknowledge').toBeTruthy();
          const minutes = minutesBetween(times.arrivedAt, times.startedTreatmentAt!);
          const after = await readToday();
          const added = meanSum(after.doorToDocMeanMinutes, after.doorToDocCount) - meanSum(before.doorToDocMeanMinutes, before.doorToDocCount);
          await test.info().attach('Door-to-doc ของ P3', {
            body: JSON.stringify({ arrivedAt: times.arrivedAt, startedTreatmentAt: times.startedTreatmentAt, minutes, before: [before.doorToDocMeanMinutes, before.doorToDocCount], after: [after.doorToDocMeanMinutes, after.doorToDocCount], addedMinutes: added }, null, 2),
            contentType: 'application/json',
          });
          expect(after.doorToDocCount - before.doorToDocCount, `จำนวนที่นับ Door-to-doc +1 — ${CONCURRENT}`).toBe(1);
          expect(Math.abs(added - minutes), `ค่าเฉลี่ยใหม่ × จำนวน − เดิม = ${minutes.toFixed(3)} นาที ของ P3`).toBeLessThan(0.01);
          expect(after.overTargetCaseByLevel[2] - before.overTargetCaseByLevel[2], `P3 รอ ${minutes.toFixed(1)} นาที < Target ESI 3 → ไม่เกิน`).toBe(0);
          await markEvidence(expected(main.getByText(/^Acknowledged โดย/).first()));
        });

        await checkStep(page, 'Door-to-disposition: จำหน่าย With Approval บันทึกฉบับร่าง (ยังไม่ลงนาม) → ยังไม่ถูกนับ', async () => {
          await openDisposition(page);
          const before = await readToday();
          await draftDisposition(page, 'With Approval');
          const after = await readToday();
          expect(after.doorToDispositionCount - before.doorToDispositionCount, 'ยังไม่ลงนาม → ไม่นับ Door-to-disposition').toBe(0);
          await markEvidence(expected(main.getByRole('radio', { name: 'With Approval', exact: true })), expected(page.getByTestId('er-disposition-finalize')));
        });

        await checkStep(page, 'กดปุ่มลงนาม → Door-to-disposition +1 เท่ากับเวลาลงนาม − เวลามาถึง · เป็น Index Discharge (Provisional เพราะยังไม่ครบ 72 ชม.)', async () => {
          const before = await readToday();
          await markEvidence(clicked(page.getByTestId('er-disposition-finalize')));
          await snapEvidence(page, 'ก่อนกด — ปุ่มลงนาม');
          p3Summary = await signDisposition(page);
          const minutes = minutesBetween(arrived.P3, p3Summary.completedAt!);
          const after = await readToday();
          const added = meanSum(after.doorToDispositionMeanMinutes, after.doorToDispositionCount) - meanSum(before.doorToDispositionMeanMinutes, before.doorToDispositionCount);
          await test.info().attach('Door-to-disposition ของ P3', { body: JSON.stringify({ arrivedAt: arrived.P3, completedAt: p3Summary.completedAt, dischargeTypeCode: p3Summary.dischargeTypeCode, minutes, addedMinutes: added }, null, 2), contentType: 'application/json' });
          expect(after.doorToDispositionCount - before.doorToDispositionCount, CONCURRENT).toBe(1);
          // completedAt ใน response ปัดเป็นวินาที ส่วนรายงานใช้เวลาเต็ม → ต่างได้ไม่เกิน 1 วินาที
          expect(Math.abs(added - minutes), `เพิ่มขึ้น ${minutes.toFixed(3)} นาที (± 1 วินาที)`).toBeLessThan(1 / 60 + 0.001);
          expect(after.indexDischarges - before.indexDischarges, 'With Approval เป็น Index Discharge').toBe(1);
          expect(after.provisionalIndexDischarges - before.provisionalIndexDischarges, 'เพิ่งลงนาม → ยังไม่ครบ 72 ชม. = Provisional').toBe(1);
          await markEvidence(alerted(page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว')), expected(main.getByRole('button', { name: 'เปิดแก้ไข' })));
        });
      });

      await checkStep(page, 'TC-003 / TC-005 ผู้ป่วย P4 ESI 4 จำหน่าย By Transfer ลงนาม → นับ Door-to-disposition (ทุกประเภท) แต่ไม่เป็น Index ของ 72h Revisit', async () => {
        const visit = await openNewVisit('P4', 'P4 (ESI 4 ไม่ Acknowledge · จำหน่าย By Transfer)');
        await saveTriage(page, visit, 4);
        arrived.P4 = (await boardTimes(visit)).arrivedAt;
        await openDisposition(page);
        await draftDisposition(page, 'By Transfer');
        const before = await readToday();
        await markEvidence(filled(main.getByRole('radio', { name: 'By Transfer', exact: true })), clicked(page.getByTestId('er-disposition-finalize')));
        await snapEvidence(page, 'ก่อนกด — วิธีจำหน่าย By Transfer + ปุ่มลงนาม');
        const summary = await signDisposition(page);
        const minutes = minutesBetween(arrived.P4, summary.completedAt!);
        const after = await readToday();
        const added = meanSum(after.doorToDispositionMeanMinutes, after.doorToDispositionCount) - meanSum(before.doorToDispositionMeanMinutes, before.doorToDispositionCount);
        await test.info().attach('Door-to-disposition ของ P4', { body: JSON.stringify({ arrivedAt: arrived.P4, completedAt: summary.completedAt, dischargeTypeCode: summary.dischargeTypeCode, minutes, addedMinutes: added }, null, 2), contentType: 'application/json' });
        expect(after.doorToDispositionCount - before.doorToDispositionCount, CONCURRENT).toBe(1);
        expect(Math.abs(added - minutes)).toBeLessThan(1 / 60 + 0.001);
        expect(after.indexDischarges - before.indexDischarges, 'By Transfer ไม่เป็น Index Discharge').toBe(0);
        expect(after.overTargetCaseByLevel[3] - before.overTargetCaseByLevel[3], `P4 รอถึงลงนาม ${minutes.toFixed(1)} นาที < Target ESI 4 → ไม่เกิน`).toBe(0);
        await markEvidence(alerted(page.getByText('ลงนามการจำหน่ายผู้ป่วย ER แล้ว')), expected(main.getByRole('radio', { name: 'By Transfer', exact: true })));
      });

      // ---------------- สรุปยอดวันนี้ ----------------
      let todayReport!: QualityReport;
      await checkStep(page, 'TC-004 (SBH-2346) รายงานวันนี้: ผู้ป่วยทดสอบทำให้ยอดขยับตามที่คาด · Over target นับ P1 ที่ไม่ Acknowledge แต่รอเกิน 1 นาที · % = เกิน ÷ Eligible', async () => {
        await checkStep(page, 'ยอดวันนี้เทียบก่อนเพิ่มผู้ป่วย: Eligible +3 (ESI 1/3/4) · เกิน Target +1 ที่ ESI 1 · Door-to-doc +1 · Door-to-disposition +2 · Index +1 (Provisional)', async () => {
          // P1 ต้องรอเกิน Target ESI 1 (1 นาที) นับถึงเวลาที่อ่านรายงาน — ปกติผ่านมาหลายนาทีแล้ว
          await expect.poll(() => (Date.now() - Date.parse(arrived.P1)) / 60_000, { timeout: 90_000, message: 'P1 ต้องรอเกิน 1 นาที' }).toBeGreaterThan(1.1);
          await openQualityReport(page);
          todayReport = await applyFilter(page, todayFilter);
          const delta = countDelta(todayReport.rows[0], baseline);
          await attachDelta('ผลต่างวันนี้หลังเพิ่มผู้ป่วยทดสอบ (หลัง − baseline)', delta);
          expect(delta, CONCURRENT).toEqual({
            eligible: 3,
            eligibleByLevel: [1, 0, 1, 1, 0],
            overTargetCaseByLevel: [1, 0, 0, 0, 0],
            doorToDocCount: 1,
            doorToDispositionCount: 2,
            indexDischarges: 1,
            provisionalIndexDischarges: 1,
            revisitCase: 0,
          });
          await expectScreenMatches(page, 'day', todayReport);
          const summary = qualityTable(page, 'สรุปตัวชี้วัดคุณภาพ');
          const { from, to } = periodInputs(page);
          await markEvidence(filled(from), filled(to), clicked(searchButton(page)), expected(summary), expected(qualityTable(page, 'Over Target ต่อ ESI (ราย)')));
        });

        await checkStep(page, 'สูตร % ทุกแถว: Over Target % = เกิน ÷ Eligible · % ต่อ ESI = เกินของ ESI นั้น ÷ Eligible ของ ESI นั้น · ESI 5 (ไม่จำกัด) = 0', async () => {
          const month30 = await fetchQuality(page, authorization(), { granularity: 'day', from: `${month}-01`, to: day });
          for (const c of [...month30.rows, month30.total]) {
            const label = 'date' in c ? dayLabel((c as QualityRow).date) : 'รวม';
            if (c.eligible === 0) expect(c.overTargetRate, `${label}: ไม่มีผู้ป่วย → ไม่มี %`).toBeNull();
            else expect(c.overTargetRate!, `${label}: Over Target %`).toBeCloseTo(c.overTargetCase / c.eligible, 10);
            for (const l of [0, 1, 2, 3, 4]) {
              const e = c.eligibleByLevel[l];
              if (e === 0) expect(c.overTargetRateByLevel[l], `${label} ESI ${l + 1}: ไม่มีผู้ป่วย → ไม่มี %`).toBeNull();
              else expect(c.overTargetRateByLevel[l]!, `${label} ESI ${l + 1} %`).toBeCloseTo(c.overTargetCaseByLevel[l] / e, 10);
            }
            expect(c.overTargetCaseByLevel[4], `${label}: ESI 5 ไม่จำกัด → ไม่มีเคสเกิน`).toBe(0);
            expect(c.overTargetCase, `${label}: เกินรวม = ผลรวมต่อ ESI`).toBe(c.overTargetCaseByLevel.reduce((a, b) => a + b, 0));
          }
          const table = qualityTable(page, 'Over Target ต่อ ESI (%)');
          const esi5 = table.getByRole('columnheader', { name: /^ESI 5/ });
          await expect(esi5, 'หัวคอลัมน์ ESI 5 ต้องบอกว่าไม่จำกัด').toHaveText('ESI 5 (ไม่จำกัด)');
          await markEvidence(expected(table), expected(esi5));
        });

        await checkStep(page, 'Export วันนี้: ไฟล์ตรงกับหน้าจอ · Config & Assumptions แสดง ESI 5 = ไม่จำกัด', async () => {
          const file = await exportQuality(page);
          const sheets = await readWorkbook(file.path);
          expectSheetMatches(sheets[0], 'day', todayReport);
          const config = sheets[1];
          expect(configValue(config, 'ESI 5 ไม่เร่งด่วน'), 'ESI 5 ตั้งเป็นไม่จำกัด').toBe('ไม่จำกัด');
          for (const s of originalSettings!.filter((s) => s.level !== 5)) expect(configValue(config, `ESI ${s.level} ${ESI_NAMES[s.level - 1]}`)).toBe(targetText(s));
          const overlay = await showSheet(page, file.filename, config);
          await markEvidence(...ESI_LEVELS.map((l) => expected(sheetRow(overlay, configRow(config, `ESI ${l} ${ESI_NAMES[l - 1]}`)))));
          await hideSheet(page);
          const breakdown = block(sheets[0], 'Breakdown');
          const dayOverlay = await showSheet(page, file.filename, sheets[0]);
          await markEvidence(expected(sheetRow(dayOverlay, breakdown.firstRow)));
        });
        await hideSheet(page);
      });

      // ---------------- TC-005 ----------------
      await checkStep(page, 'TC-005 (SBH-2347) 72h Revisit เดือนนี้: นับใน bucket วันที่ Visit แรกมาถึง · 1 Index นับครั้งเดียว · sheet 72h Revisit Detail มีแค่ EN · Provisional', async () => {
        const filter: QualityFilter = { granularity: 'day', from: `${month}-01`, to: day };
        let report!: QualityReport;
        let file!: Awaited<ReturnType<typeof exportQuality>>;
        let detail!: Sheet;
        await checkStep(page, `Export รายวัน ${dayLabel(filter.from)} – ${dayLabel(filter.to)} → sheet 72h Revisit Detail ตรงกับตาราง 72h Revisit Detail บนหน้าจอ`, async () => {
          report = await applyFilter(page, filter);
          file = await exportQuality(page);
          detail = (await readWorkbook(file.path))[2];
          expect(detail.name).toBe('72h Revisit Detail');
          expect(detail.rows[0], 'หัวคอลัมน์ — มีแค่ EN ไม่มี HN / ชื่อผู้ป่วย').toEqual([
            'Index EN',
            'ESI / Triage Level',
            'เวลาลงนามจำหน่าย (Index)',
            'Revisit EN',
            'เวลามาถึง (Revisit)',
            'ชั่วโมงหลังลงนามจำหน่าย',
            'Final / Provisional',
          ]);
          const lines = detail.rows.slice(1).filter((r) => r.length && r[0] !== null);
          expect(lines.map((r) => [r[0], r[3]]), 'คู่ Index / Revisit ในไฟล์ = API').toEqual(report.revisitDetails.map((d) => [d.indexEn, d.revisitEn]));
          for (const [i, d] of report.revisitDetails.entries()) {
            const r = lines[i];
            expect(r[1], `${d.indexEn} ESI`).toBe(`ESI ${d.indexLevel} ${ESI_NAMES[d.indexLevel - 1]}`);
            expect(r[2], `${d.indexEn} เวลาลงนามจำหน่าย (เวลาไทย พ.ศ.)`).toBe(thaiDateTime(d.indexSignedAt));
            expect(r[4], `${d.revisitEn} เวลามาถึง (เวลาไทย พ.ศ.)`).toBe(thaiDateTime(d.revisitArrivedAt));
            expect(r[5] as number, `${d.indexEn} ชั่วโมง`).toBeCloseTo(d.hours, 6);
            expect(r[6], `${d.indexEn} Final / Provisional`).toBe(d.provisional ? 'Provisional' : 'Final');
            for (const v of r) expect(String(v ?? ''), 'ในไฟล์ต้องไม่มี HN (เลข 7 หลัก)').not.toMatch(/^\d{7}$/);
          }
          const screen = await readTable(qualityTable(page, '72h Revisit Detail'));
          if (report.revisitDetails.length) {
            expect(screen.rows.map((r) => [r[0], r[3], r[6]]), 'หน้าจอ = API').toEqual(report.revisitDetails.map((d) => [d.indexEn, d.revisitEn, d.provisional ? 'Provisional' : 'Final']));
          }
          const overlay = await showSheet(page, file.filename, detail, `${report.revisitDetails.length} คู่ · Revisit รวม ${report.total.revisitCase} ราย จาก Index ${report.total.indexDischarges} ราย`);
          await markEvidence(expected(sheetRow(overlay, 1)), ...lines.map((_, i) => expected(sheetRow(overlay, i + 2))));
        });
        await hideSheet(page);

        if (!report.revisitDetails.length) {
          note(`เดือน ${monthLabel(month)} ยังไม่มีคู่ Revisit บน dev-x — ข้ามการเช็คการนับ bucket / Final`);
          return;
        }

        await checkStep(page, 'ทุกคู่: Visit ใหม่มาถึงภายใน 72 ชม. หลังลงนาม · ชั่วโมง = เวลามาถึง − เวลาลงนาม · Provisional = ลงนามหลัง (เวลา Export − 72 ชม.) · 1 Index นับครั้งเดียว', async () => {
          const generated = Date.parse(report.generatedAt);
          for (const d of report.revisitDetails) {
            const hours = (Date.parse(d.revisitArrivedAt) - Date.parse(d.indexSignedAt)) / 3_600_000;
            expect(hours, `${d.indexEn} → ${d.revisitEn}`).toBeGreaterThan(0);
            expect(hours, `${d.indexEn} → ${d.revisitEn} ภายใน 72 ชม.`).toBeLessThanOrEqual(72);
            expect(d.hours, `${d.indexEn} ชั่วโมง`).toBeCloseTo(hours, 6);
            expect(d.provisional, `${d.indexEn} Provisional`).toBe(Date.parse(d.indexSignedAt) + 72 * 3_600_000 > generated);
          }
          const indexes = report.revisitDetails.map((d) => d.indexEn);
          expect(new Set(indexes).size, '1 Index ต้องมีแค่ 1 คู่').toBe(indexes.length);
          expect(report.total.revisitCase, 'จำนวน Revisit = จำนวนคู่').toBe(indexes.length);
          expect(report.total.revisitRate!, '% Revisit = Revisit ÷ Index Discharge').toBeCloseTo(report.total.revisitCase / report.total.indexDischarges, 10);
          await markEvidence(expected(qualityTable(page, '72h Revisit Detail')));
        });

        await checkStep(page, 'Revisit นับใน bucket วันที่ Visit แรก (Index) มาถึง ไม่ใช่วันที่กลับมา', async () => {
          // วันที่มาถึงของ Index: หาจากรายการ Encounter ของบอร์ดทีละวัน (API บอร์ดคืนเฉพาะที่มาถึงวันนั้น)
          const indexDay = new Map<string, string>();
          for (const date of daysBetween(filter.from, filter.to)) {
            for (const e of await fetchBoardEncounters(page, authorization(), date)) indexDay.set(e.en, date);
          }
          const perDay = new Map<string, number>();
          for (const d of report.revisitDetails) {
            const date = indexDay.get(d.indexEn);
            expect(date, `ต้องหาวันที่มาถึงของ Index ${d.indexEn} เจอ`).toBeTruthy();
            perDay.set(date!, (perDay.get(date!) ?? 0) + 1);
          }
          await test.info().attach('วันที่มาถึงของ Index แต่ละคู่', {
            body: JSON.stringify(report.revisitDetails.map((d) => ({ indexEn: d.indexEn, indexArrivedDay: indexDay.get(d.indexEn), revisitDay: bangkokDate(d.revisitArrivedAt) })), null, 2),
            contentType: 'application/json',
          });
          for (const row of report.rows) expect(row.revisitCase, `${dayLabel(row.date)}: Revisit = คู่ที่ Index มาถึงวันนี้`).toBe(perDay.get(row.date) ?? 0);
          const crossDay = report.revisitDetails.find((d) => indexDay.get(d.indexEn) !== bangkokDate(d.revisitArrivedAt));
          if (!crossDay) note('คู่ Revisit เดือนนี้กลับมาวันเดียวกับ Index ทุกคู่ — ไม่มีคู่ข้ามวันให้เห็นว่าไม่ได้นับตามวันที่กลับมา');
          const sheet = (await readWorkbook(file.path))[0];
          const breakdown = block(sheet, 'Breakdown');
          const days = [...perDay.keys()];
          const overlay = await showSheet(
            page,
            file.filename,
            sheet,
            crossDay
              ? `ตัวอย่าง: Index ${crossDay.indexEn} มาถึง ${dayLabel(indexDay.get(crossDay.indexEn)!)} กลับมา ${dayLabel(bangkokDate(crossDay.revisitArrivedAt))} → นับที่ ${dayLabel(indexDay.get(crossDay.indexEn)!)}`
              : undefined,
          );
          await markEvidence(...days.map((date) => expected(sheetRow(overlay, breakdown.firstRow + breakdown.rows.findIndex((r) => r[0] === dayLabel(date))))));
        });
        await hideSheet(page);
      });

      // ---------------- เพิ่ม (ข) Visit ยกเลิก / ยังไม่ Triage ----------------
      await checkStep(page, 'เพิ่ม (ข): ทุกวันของเดือนนี้ Eligible = Encounter ที่มาถึงวันนั้น ไม่ถูกยกเลิก และ Triage แล้ว · Door-to-doc ตรงกับเวลา Acknowledge ของบอร์ด', async () => {
        const report = await fetchQuality(page, authorization(), { granularity: 'day', from: `${month}-01`, to: day });
        const summary: { date: string; board: number; cancelledTriaged: number; untriaged: number; eligible: number }[] = [];
        for (const row of report.rows) {
          const encounters = (await fetchBoardEncounters(page, authorization(), row.date)).filter((e) => bangkokDate(e.arrivedAt) === row.date);
          const eligible = encounters.filter((e) => e.triageLevel && e.latestStatusCode !== 'cancelled');
          summary.push({
            date: row.date,
            board: encounters.length,
            cancelledTriaged: encounters.filter((e) => e.triageLevel && e.latestStatusCode === 'cancelled').length,
            untriaged: encounters.filter((e) => !e.triageLevel).length,
            eligible: eligible.length,
          });
          const at = dayLabel(row.date);
          expect(row.eligible, `${at}: Eligible`).toBe(eligible.length);
          expect(row.eligibleByLevel, `${at}: Eligible ต่อ ESI`).toEqual(ESI_LEVELS.map((l) => eligible.filter((e) => e.triageLevel === l).length));
          const waits = eligible.filter((e) => e.startedTreatmentAt).map((e) => minutesBetween(e.arrivedAt, e.startedTreatmentAt!)).filter((m) => m >= 0);
          expect(row.doorToDocCount, `${at}: จำนวนที่นับ Door-to-doc (มี Acknowledge)`).toBe(waits.length);
          if (waits.length) expect(row.doorToDocMeanMinutes!, `${at}: Door-to-doc เฉลี่ย`).toBeCloseTo(waits.reduce((a, b) => a + b, 0) / waits.length, 3);
          else expect(row.doorToDocMeanMinutes, `${at}: ไม่มี Acknowledge → ว่าง`).toBeNull();
        }
        await test.info().attach('Encounter ของบอร์ดต่อวัน (เดือนนี้)', { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
        const cancelled = summary.filter((s) => s.cancelledTriaged);
        note(
          cancelled.length
            ? `เดือนนี้มี Encounter ที่ Triage แล้วถูกยกเลิก ${cancelled.reduce((a, s) => a + s.cancelledTriaged, 0)} ราย (${cancelled.map((s) => dayLabel(s.date)).join(', ')}) — ไม่ถูกนับทุกวัน`
            : 'เดือนนี้ไม่มี Encounter ที่ Triage แล้วถูกยกเลิก — เช็คได้แค่ Visit ที่ยังไม่ Triage',
        );
        await markEvidence(expected(qualityTable(page, 'สรุปตัวชี้วัดคุณภาพ')));
      });

      // ---------------- คืนค่าตั้งค่า ----------------
      await checkStep(page, 'คืนค่าตั้งค่าเวลารอตรวจ: ปิดสวิตช์ไม่จำกัดของไม่เร่งด่วน ใส่เวลาเดิม แล้วบันทึก', async () => {
        const original = originalSettings!.find((s) => s.level === 5)!;
        await openErMenu(page, 'ตั้งค่า', 'ตั้งค่าเวลารอตรวจ');
        const toggle = main.getByRole('switch', { name: 'ไม่จำกัดเวลา' }).nth(4);
        await expect(toggle).toBeChecked();
        await toggle.click();
        const minutes = main.getByRole('spinbutton').nth(4);
        await minutes.fill(String(original.limitSeconds! / 60));
        const saved = waitForApi(page, 'PATCH', '/cortex-api/er/triage/wait-time-settings');
        await main.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
        await expectOk(await saved, 'คืนค่าตั้งค่าเวลารอตรวจ');
        expect(await fetchWaitTimeSettings(page, authorization()), 'ค่าตั้งค่าต้องกลับเป็นค่าเดิมทุกระดับ').toEqual(originalSettings);
        settingsChanged = false;
        await markEvidence(filled(minutes), expected(toggle));
      });
    },
  );
});
