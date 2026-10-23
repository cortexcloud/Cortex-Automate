import { type Locator } from '@playwright/test';
import {
  confirmOpenErVisit,
  dismissToast,
  expectOk,
  expectTriageFormOpen,
  gotoErDashboard,
  openErMenu,
  openTriagePage,
  recordVisit,
  registerNewPatient,
  waitForApi,
  type ErVisit,
} from '../../../helpers/functions/er';
import {
  addMonths,
  colLetter,
  currentMonth,
  exportExcel,
  fetchDaily,
  fetchMonthly,
  hideSheet,
  monthDays,
  monthLabel,
  monthRangeInputs,
  monthsBetween,
  readTable,
  readWorkbook,
  reportTable,
  searchMonthly,
  setMonthRange,
  sheetCell,
  sheetRow,
  showSheet,
  tableCell,
  trackAuthorization,
  type ErReportCounts,
  type MonthlyReport,
  type MonthlyRow,
  type Sheet,
} from '../../../helpers/functions/er-report';
import { chooseGcs, labelledBox, saveButton, selectArrivalDetail, triageForm } from '../../../helpers/functions/er-triage';
import { checkStep, clicked, expected, filled, markEvidence, snapEvidence } from '../../../helpers/functions/evidence';
import { expect, test } from '../../../helpers/functions/fixtures';
import { newTestPatient } from '../../../helpers/functions/test-data';

// SBH-1400 [ER][ER Statistics Report] 3. รายงานรายเดือน (TOR 4.9.8.10.3)
// แปลงจากชุด Manual: EXE SBH-2313 → TC-001–004 (SBH-2316–SBH-2319) · 1 เทส = 1 flow (R9)
// ผู้ใช้กำหนด 29 ก.ย. 2026:
// - ยึดหน้าจอจริงแทน Mock Up: ช่วงเดือน (เริ่ม–สิ้นสุด) ไม่มี Filter ESI / Compare · MoM % แสดงทุกแถว · ชื่อ sheet Total-ESI / Arrival / Disposition
// - "ตรงกับ Visit ER จริง" เช็คสองทาง: (1) เทียบยอดรวมของรายงานรายวันทั้งเดือน (2) เปิด Visit ผู้ป่วย AUTO ใหม่ + Triage ESI 2 แล้วยอดเดือนนี้ต้องเพิ่มตาม
//   (สร้างผู้ป่วยใหม่ทุกรอบ R10 · บันทึก Triage ได้และทิ้งไว้บน dev-x R11/R17 — ผู้ป่วยไปอยู่โซนแดง ER)
// ภาพหลักฐาน (R13/R23): ตีกรอบ กรอก / กด / Expected บนหน้าจอ · ค่าในไฟล์ Excel แสดงเป็นตารางซ้อนหน้าเดิมแล้วตีกรอบเซลล์ที่เช็ค

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const note = (description: string) => test.info().annotations.push({ type: 'ข้อสังเกต', description });

const REPORT_TITLE = 'รายงานสถิติการเข้ารับบริการของผู้ป่วย รายเดือน';

/** ตัวเลขทุกช่องของ 1 แถว แบนเป็น key เดียว — ใช้เทียบหน้าจอ / Excel / API / รายงานรายวัน และหาผลต่าง */
type CountKey =
  | 'total'
  | 'esi1'
  | 'esi2'
  | 'esi3'
  | 'esi4'
  | 'esi5'
  | 'untriaged'
  | keyof ErReportCounts['arrival']
  | keyof ErReportCounts['dispositionOutcome'];
type RateKey = 'highAcuityRate' | 'admitRate' | 'momChange';

function flatCounts(c: ErReportCounts): Record<CountKey, number> {
  const [esi1, esi2, esi3, esi4, esi5] = c.esi;
  return { total: c.total, esi1, esi2, esi3, esi4, esi5, untriaged: c.untriaged, ...c.arrival, ...c.dispositionOutcome };
}

/** คอลัมน์ของตาราง: หัวบนหน้าจอ · หัวในไฟล์ Excel · ค่าจาก API (จำนวน หรือ อัตรา) */
interface Column {
  screen: string;
  excel: string;
  count?: CountKey;
  rate?: RateKey;
}
const col = (header: string, key: CountKey, excel = header): Column => ({ screen: header, excel, count: key });
const rate = (header: string, key: RateKey): Column => ({ screen: header, excel: header, rate: key });

interface ReportSheet {
  table: string; // ชื่อตารางบนหน้าจอ
  sheet: string; // ชื่อ sheet ในไฟล์
  columns: Column[]; // ไม่รวมคอลัมน์ "เดือน"
  /** คอลัมน์ที่รวมกันแล้วต้องเท่ากับ "รวม" (ทุกผู้ป่วยต้องอยู่ในคอลัมน์ใดคอลัมน์หนึ่ง) */
  parts: CountKey[];
}

const SHEETS: ReportSheet[] = [
  {
    table: 'จำนวนรวมและระดับ ESI',
    sheet: 'Total-ESI',
    columns: [
      col('รวม', 'total'),
      col('ESI 1', 'esi1'),
      col('ESI 2', 'esi2'),
      col('ESI 3', 'esi3'),
      col('ESI 4', 'esi4'),
      col('ESI 5', 'esi5'),
      col('ยังไม่ triage', 'untriaged'),
      rate('High Acuity %', 'highAcuityRate'),
      rate('MoM %', 'momChange'),
    ],
    parts: ['esi1', 'esi2', 'esi3', 'esi4', 'esi5', 'untriaged'],
  },
  {
    table: 'วิธีการมาห้องฉุกเฉิน',
    sheet: 'Arrival',
    // หน้าจอเขียน "รับ Refer" แต่ในไฟล์เขียน "Refer" — ผู้ใช้ให้ยึดตามจริง (ลงเป็นข้อสังเกต)
    columns: [col('รวม', 'total'), col('Walk-in', 'walkIn'), col('EMS', 'ems'), col('รับ Refer', 'referral', 'Refer'), col('ไม่ระบุ', 'unspecified')],
    parts: ['walkIn', 'ems', 'referral', 'unspecified'],
  },
  {
    table: 'การจำหน่าย',
    sheet: 'Disposition',
    columns: [
      col('รวม', 'total'),
      col('จำหน่ายปกติ', 'withApproval'),
      col('ไม่สมัครใจอยู่', 'againstAdvice'),
      col('หนีกลับ', 'escape'),
      col('ส่งต่อ', 'transfer'),
      col('Admit', 'admit'),
      col('LWBS', 'lwbs'),
      col('เสียชีวิต', 'death'),
      col('DOA', 'doa'),
      col('อื่นๆ', 'other'),
      col('Pending', 'pending'),
      rate('Admit Rate %', 'admitRate'),
    ],
    parts: ['withApproval', 'againstAdvice', 'escape', 'transfer', 'admit', 'lwbs', 'death', 'doa', 'other', 'pending'],
  },
];

/** อัตรา (สัดส่วน) → ข้อความบนหน้าจอ เช่น 0.0675 → "6.75%" · ไม่มีค่า → "-" */
const percentText = (value: number | null) => (value === null ? '-' : `${(value * 100).toFixed(2)}%`);
const numberText = (value: number) => value.toLocaleString('en-US');

/** แถวข้อมูลของรายงาน: เดือนตามลำดับ + แถวรวม (label "รวม") */
function reportRows(report: MonthlyReport): { label: string; counts: Record<CountKey, number>; row: MonthlyRow | null }[] {
  return [
    ...report.rows.map((row) => ({ label: monthLabel(row.month), counts: flatCounts(row), row })),
    { label: 'รวม', counts: flatCounts(report.total), row: null },
  ];
}

/** แถวหัวตารางใน sheet = แถวที่คอลัมน์ A เป็น "เดือน" (ด้านบนเป็นหัวรายงาน 3 บรรทัด) */
function sheetHeaderRow(sheet: Sheet): number {
  const index = sheet.rows.findIndex((row) => row[0] === 'เดือน');
  expect(index, `sheet ${sheet.name} ต้องมีแถวหัวตารางที่ขึ้นต้นด้วย "เดือน"`).toBeGreaterThanOrEqual(0);
  return index;
}

/** ผลต่างของตัวเลขทุกช่อง (หลัง − ก่อน) เฉพาะช่องที่เปลี่ยน */
function countDiff(after: ErReportCounts, before: ErReportCounts): Partial<Record<CountKey, number>> {
  const a = flatCounts(after);
  const b = flatCounts(before);
  const diff: Partial<Record<CountKey, number>> = {};
  for (const key of Object.keys(a) as CountKey[]) if (a[key] !== b[key]) diff[key] = a[key] - b[key];
  return diff;
}

test.describe('SBH-1400 ER รายงานรายเดือน (ER Statistics Report 4.9.8.10.3)', () => {
  // เปิดรายงานหลายรอบ + Export + สร้างผู้ป่วย / เปิด Visit / Triage เกินค่าตั้งต้น 60 วินาที
  test.describe.configure({ timeout: 300_000 });

  test(
    'รายงานรายเดือน: เมนู + ช่วงเดือน · Export Excel 3 sheet · ตัวเลขตรงกับ Visit ER จริง · High Acuity / Admit Rate / MoM ตามสูตร (Super_User)',
    {
      tag: ['@SBH-1400', '@SBH-2316', '@SBH-2317', '@SBH-2318', '@SBH-2319'],
      annotation: [linear('SBH-1400'), linear('SBH-2313')],
    },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const main = page.getByRole('main');
      const thisMonth = currentMonth();
      const lastMonth = addMonths(thisMonth, -1);
      const months = [lastMonth, thisMonth];

      /** ยอดรวมของรายงานรายวันทั้งเดือน (อ่านครั้งเดียวต่อเดือน) — ใช้เป็น "จำนวน Visit ER จริง" ของเดือนนั้น */
      const dailyTotals = new Map<string, Record<CountKey, number>>();
      async function dailyOfMonth(month: string): Promise<Record<CountKey, number>> {
        const cached = dailyTotals.get(month);
        if (cached) return cached;
        const { first, last } = monthDays(month);
        const daily = await fetchDaily(page, authorization(), first, last);
        await test.info().attach(`GET /cortex-api/er/reports/daily?from=${first}&to=${last} (ยอดรวม)`, {
          body: JSON.stringify(daily.total, null, 2),
          contentType: 'application/json',
        });
        const counts = flatCounts(daily.total);
        dailyTotals.set(month, counts);
        return counts;
      }

      await test.step('เตรียม: เปิด ER Dashboard', async () => {
        await gotoErDashboard(page);
      });

      // ---------------- TC-001 ----------------
      await checkStep(page, 'TC-001 (SBH-2316) เข้าเมนูรายงานรายเดือน · Filter เดือน/ปี · แบ่งข้อมูลเป็นรายเดือน', async () => {
        await checkStep(page, 'เมนูรายงานทางสถิติ → รายงานรายเดือน เปิดหน้ารายงานได้', async () => {
          await openErMenu(page, 'รายงานทางสถิติ');
          const item = page.getByRole('menuitem', { name: 'รายงานรายเดือน' });
          await markEvidence(clicked(item));
          await snapEvidence(page, 'ก่อนกด — เมนู รายงานทางสถิติ → รายงานรายเดือน');
          const loaded = waitForApi(page, 'GET', '/cortex-api/er/reports/monthly');
          await item.click();
          await expect(page).toHaveURL(/\/cortex\/er\/reports\/monthly/);
          await expectOk(await loaded, 'โหลดรายงานรายเดือนตอนเปิดหน้า');
          const heading = main.getByText('รายงานรายเดือน', { exact: true });
          await expect(heading).toBeVisible();
          await expect(reportTable(page, SHEETS[0].table)).toBeVisible();
          await markEvidence(expected(heading), expected(reportTable(page, SHEETS[0].table)));
        });

        await checkStep(page, 'มี Filter ช่วงเดือน/ปี (เดือนเริ่มต้น – เดือนสิ้นสุด) พร้อมปุ่มค้นหา และ Export Excel', async () => {
          const { from, to } = monthRangeInputs(page);
          await expect(from).toHaveValue(/^\d{4}-\d{2}$/);
          await expect(to).toHaveValue(/^\d{4}-\d{2}$/);
          const search = main.getByRole('button', { name: 'ค้นหา' });
          const exportButton = main.getByRole('button', { name: 'Export Excel' });
          await expect(search).toBeVisible();
          await expect(exportButton).toBeVisible();
          const esiFilter = await main.getByText(/ESI LEVEL/i).count();
          const compare = await main.getByText(/Compare/i).count();
          note(
            `Filter บนหน้าจอ: ช่วงเดือน ${await from.inputValue()} – ${await to.inputValue()} (ค่าเริ่มต้น) · ` +
              `Filter ESI LEVEL: ${esiFilter ? 'มี' : 'ไม่มี'} · ตัวเลือก Compare: ${compare ? 'มี' : 'ไม่มี'} (MoM % แสดงทุกแถว) — ผู้ใช้ให้ยึดตามจริง`,
          );
          await markEvidence(expected(from), expected(to), expected(search), expected(exportButton));
        });

        for (const [index, month] of [thisMonth, lastMonth].entries()) {
          const title =
            index === 0
              ? `เลือกเดือน ${monthLabel(month)}: ได้ 1 แถว ${monthLabel(month)} และยอดรวมตรงกับจำนวน Visit ER ที่มาถึงในเดือนนั้น`
              : `เปลี่ยนเป็นเดือน ${monthLabel(month)}: ข้อมูลเปลี่ยนตามเดือนที่เลือก และยอดรวมตรงกับ Visit ER ของเดือนนั้น`;
          await checkStep(page, title, async () => {
            await setMonthRange(page, month, month);
            const report = await searchMonthly(page, month, month);
            expect(report.rows.map((row) => row.month), 'ข้อมูลต้องเป็นเดือนที่เลือกเดือนเดียว').toEqual([month]);
            const daily = await dailyOfMonth(month);
            expect(report.rows[0].total, `ยอดรวม ${monthLabel(month)} = ยอดรวมของรายงานรายวันทั้งเดือน`).toBe(daily.total);

            const table = reportTable(page, SHEETS[0].table);
            const { rows } = await readTable(table);
            expect(rows.map((row) => row[0]), 'แถวบนหน้าจอ: เดือนที่เลือก (MM/พ.ศ.) + แถวรวม').toEqual([monthLabel(month), 'รวม']);
            expect(rows[0][1], 'ยอดรวมบนหน้าจอ').toBe(numberText(daily.total));
            const { from, to } = monthRangeInputs(page);
            await markEvidence(
              filled(from),
              filled(to),
              clicked(main.getByRole('button', { name: 'ค้นหา' })),
              expected(tableCell(table, 0, 0)),
              expected(tableCell(table, 0, 1)),
            );
          });
        }
      });

      // ---------------- TC-002 ----------------
      let report!: MonthlyReport;
      let sheets!: Sheet[];
      let filename = '';
      await checkStep(page, 'TC-002 (SBH-2317) Export Excel ได้ไฟล์ .xlsx 3 sheet หัวรายงานระบุช่วงเดือน และคอลัมน์แรกเป็นปี-เดือน', async () => {
        await checkStep(page, `เลือกช่วง ${monthLabel(lastMonth)} – ${monthLabel(thisMonth)} แล้วกด Export Excel: ดาวน์โหลดได้ไฟล์ Excel นามสกุล xlsx`, async () => {
          await setMonthRange(page, lastMonth, thisMonth);
          report = await searchMonthly(page, lastMonth, thisMonth);
          expect(report.rows.map((row) => row.month)).toEqual(monthsBetween(lastMonth, thisMonth));
          const file = await exportExcel(page, lastMonth, thisMonth);
          filename = file.filename;
          expect(filename, 'ต้องเป็นไฟล์ .xlsx').toMatch(/\.xlsx$/);
          sheets = await readWorkbook(file.path);
          const { from, to } = monthRangeInputs(page);
          await markEvidence(filled(from), filled(to), clicked(main.getByRole('button', { name: 'Export Excel' })));
        });

        await checkStep(page, `ไฟล์มี 3 sheet: ${SHEETS.map((s) => s.sheet).join(' · ')}`, async () => {
          expect(sheets.map((sheet) => sheet.name)).toEqual(SHEETS.map((s) => s.sheet));
          note(`ชื่อ sheet ในไฟล์เป็นภาษาอังกฤษ ${sheets.map((s) => s.name).join(' / ')} (TC-002 เขียนเป็นชื่อไทย) — ผู้ใช้ให้ยึดตามจริง`);
          const overlay = await showSheet(page, filename, sheets[0], `ไฟล์มี ${sheets.length} sheet: ${sheets.map((s) => s.name).join(' · ')}`);
          await markEvidence(expected(overlay.locator('[data-sheet-title]')));
        });
        await hideSheet(page);

        for (const [index, spec] of SHEETS.entries()) {
          await checkStep(page, `Sheet ${spec.sheet}: หัวรายงานระบุช่วงเดือนที่เลือก · คอลัมน์แรกเป็นปี-เดือน 1 แถวต่อ 1 เดือน`, async () => {
            const sheet = sheets[index];
            expect(sheet.rows[0][0], 'หัวรายงานบรรทัดแรก').toBe(REPORT_TITLE);
            expect(sheet.rows[1][0], 'หัวรายงานต้องระบุช่วงเดือนที่เลือก').toBe(`ช่วงเดือน ${monthLabel(lastMonth)} – ${monthLabel(thisMonth)}`);
            const header = sheetHeaderRow(sheet);
            const firstColumn = sheet.rows.slice(header + 1).map((row) => row[0]);
            expect(firstColumn, 'คอลัมน์แรก: เดือนละ 1 แถว (MM/พ.ศ.) + แถวรวม').toEqual([...months.map(monthLabel), 'รวม']);
            const overlay = await showSheet(page, filename, sheet);
            const monthCells = months.map((_, i) => expected(sheetCell(overlay, `A${header + 2 + i}`)));
            await markEvidence(expected(sheetCell(overlay, 'A2')), expected(sheetCell(overlay, `A${header + 1}`)), ...monthCells);
          });
          await hideSheet(page);
        }
      });

      // ---------------- TC-003 ----------------
      await checkStep(page, 'TC-003 (SBH-2318) ตัวเลขรายเดือนแต่ละ Sheet ตรงกับ Visit ER จริง และตรงกับหน้าจอ', async () => {
        const rows = reportRows(report);
        for (const [index, spec] of SHEETS.entries()) {
          await checkStep(page, `${spec.table} — หน้าจอ: รวมทุกคอลัมน์ = ยอดรวม · แถวรวม = ผลรวมทุกเดือน · ตรงกับรายงานรายวันของแต่ละเดือน`, async () => {
            const table = reportTable(page, spec.table);
            const screen = await readTable(table);
            expect(screen.headers, 'หัวคอลัมน์บนหน้าจอ').toEqual(['เดือน', ...spec.columns.map((c) => c.screen)]);
            expect(screen.rows.map((row) => row[0]), 'แถวบนหน้าจอ').toEqual(rows.map((r) => r.label));

            for (const [r, { label, counts }] of rows.entries()) {
              const sum = spec.parts.reduce((total, key) => total + counts[key], 0);
              expect(sum, `${label}: ${spec.parts.join(' + ')} ต้องเท่ากับยอดรวม`).toBe(counts.total);
              for (const [c, column] of spec.columns.entries()) {
                if (!column.count) continue;
                expect(screen.rows[r][c + 1], `หน้าจอ ${label} · ${column.screen}`).toBe(numberText(counts[column.count]));
              }
            }
            const totalRow = rows[rows.length - 1].counts;
            for (const column of spec.columns.filter((c) => c.count)) {
              const key = column.count!;
              const sum = rows.slice(0, -1).reduce((total, r) => total + r.counts[key], 0);
              expect(totalRow[key], `แถวรวม · ${column.screen} = ผลรวมทุกเดือน`).toBe(sum);
            }
            for (const [m, month] of months.entries()) {
              const daily = await dailyOfMonth(month);
              for (const column of spec.columns.filter((c) => c.count)) {
                expect(rows[m].counts[column.count!], `${monthLabel(month)} · ${column.screen} = รายงานรายวันทั้งเดือน`).toBe(daily[column.count!]);
              }
            }
            await markEvidence(expected(table));
          });

          await checkStep(page, `${spec.table} — ไฟล์ Excel sheet ${spec.sheet} ตรงกับหน้าจอทุกช่อง`, async () => {
            const sheet = sheets[index];
            const header = sheetHeaderRow(sheet);
            expect(sheet.rows[header], `หัวคอลัมน์ใน sheet ${spec.sheet}`).toEqual(['เดือน', ...spec.columns.map((c) => c.excel)]);
            const renamed = spec.columns.filter((c) => c.excel !== c.screen);
            if (renamed.length) note(`sheet ${spec.sheet}: หัวคอลัมน์ต่างจากหน้าจอ — ${renamed.map((c) => `หน้าจอ "${c.screen}" / Excel "${c.excel}"`).join(', ')}`);
            for (const [r, { label, counts, row }] of rows.entries()) {
              const values = sheet.rows[header + 1 + r];
              for (const [c, column] of spec.columns.entries()) {
                const cell = `${colLetter(c + 1)}${header + 2 + r} (${label} · ${column.excel})`;
                if (column.count) {
                  expect(values[c + 1], `Excel ${cell}`).toBe(counts[column.count]);
                } else {
                  const value = row ? row[column.rate!] : report.total[column.rate!];
                  if (value === null) expect(values[c + 1], `Excel ${cell} ไม่มีค่า`).toBe('-');
                  else expect(values[c + 1] as number, `Excel ${cell}`).toBeCloseTo(value, 10);
                }
              }
            }
            const overlay = await showSheet(page, filename, sheet);
            const dataRows = rows.map((_, r) => expected(sheetRow(overlay, header + 2 + r)));
            await markEvidence(expected(sheetRow(overlay, header + 1)), ...dataRows);
          });
          await hideSheet(page);
        }
      });

      // ---------------- TC-004 ----------------
      /**
       * เช็คค่าสรุป 1 ตัวทุกแถว (หน้าจอ + Excel) กับค่าที่คิดเองจากสูตร · คืนเซลล์บนหน้าจอไว้ตีกรอบ
       * formula คืนสัดส่วน · null = ต้องแสดง "-" · 'skip' = ไม่เช็คแถวนั้น
       */
      async function checkRate(spec: ReportSheet, key: RateKey, formula: (r: number) => number | null | 'skip'): Promise<Locator[]> {
        const rows = reportRows(report);
        const c = spec.columns.findIndex((column) => column.rate === key);
        const table = reportTable(page, spec.table);
        const screen = await readTable(table);
        const sheet = sheets[SHEETS.indexOf(spec)];
        const header = sheetHeaderRow(sheet);
        const cells: Locator[] = [];
        for (const [r, { label }] of rows.entries()) {
          const want = formula(r);
          if (want === 'skip') continue;
          const shown = screen.rows[r][c + 1];
          const inFile = sheet.rows[header + 1 + r][c + 1];
          expect(shown, `หน้าจอ ${label} · ${spec.columns[c].screen}`).toBe(percentText(want));
          if (want === null) expect(inFile, `Excel ${label} · ${spec.columns[c].excel}`).toBe('-');
          else expect(inFile as number, `Excel ${label} · ${spec.columns[c].excel}`).toBeCloseTo(want, 10);
          cells.push(tableCell(table, r, c + 1));
        }
        return cells;
      }

      await checkStep(page, 'TC-004 (SBH-2319) ค่าสรุป High Acuity % · Admit Rate % · MoM Change % ตรงตามสูตรของแต่ละเดือน', async () => {
        const rows = reportRows(report);
        const [esiSheet, , dispositionSheet] = SHEETS;
        const ratio = (part: number, total: number) => (total === 0 ? null : part / total);

        await checkStep(page, 'High Acuity % = (ESI 1 + ESI 2) ÷ รวม × 100', async () => {
          const cells = await checkRate(esiSheet, 'highAcuityRate', (r) => ratio(rows[r].counts.esi1 + rows[r].counts.esi2, rows[r].counts.total));
          await markEvidence(...cells.map(expected));
        });
        await checkStep(page, 'Admit Rate % = จำนวน Admit ÷ รวม × 100', async () => {
          const cells = await checkRate(dispositionSheet, 'admitRate', (r) => ratio(rows[r].counts.admit, rows[r].counts.total));
          await markEvidence(...cells.map(expected));
        });
        await checkStep(page, 'MoM Change % = (รวมเดือนนี้ − รวมเดือนก่อน) ÷ รวมเดือนก่อน × 100', async () => {
          // เดือนแรกของช่วง: เดือนก่อนหน้าอยู่นอกช่วงที่เลือก — อ่านยอดจาก API · แถวรวมไม่มี MoM
          const before = (await fetchMonthly(page, authorization(), addMonths(lastMonth, -1), addMonths(lastMonth, -1))).rows[0].total;
          const totals = [before, ...rows.slice(0, -1).map((r) => r.counts.total)];
          const firstShown = report.rows[0].momChange;
          if (firstShown === null) note(`MoM % ของเดือนแรกในช่วง (${monthLabel(lastMonth)}) แสดง "-" — เดือนก่อนหน้ามี ${before} ราย`);
          const cells = await checkRate(esiSheet, 'momChange', (r) => {
            if (r === rows.length - 1) return null; // แถวรวม
            if (r === 0 && firstShown === null) return 'skip'; // การ์ดไม่ได้กำหนด MoM ของเดือนแรกในช่วง
            return ratio(totals[r + 1] - totals[r], totals[r]);
          });
          await markEvidence(...cells.map(expected));
        });
      });

      // ---------------- เพิ่ม Visit ER ใหม่แล้วดูยอดเปลี่ยน (TC-003 / TC-004 ข้อ "นับตาม Visit จริง" และ "ค่าเปลี่ยนตาม") ----------------
      let visit!: ErVisit;
      let before!: MonthlyReport;
      await checkStep(page, `TC-003 / TC-004 เพิ่ม Visit ER ใหม่ 1 ราย (Walk-in · ESI 2) → ยอดเดือน ${monthLabel(thisMonth)} เพิ่มตามทุก Sheet`, async () => {
        await checkStep(page, 'เปิด Visit ER ผู้ป่วย AUTO ใหม่ (ยังไม่ Triage): รวม +1 · ยังไม่ triage +1 · Walk-in +1 · Pending +1', async () => {
          await openErMenu(page, 'แดชบอร์ด / คิว');
          await expect(page).toHaveURL(/\/cortex\/er\/dashboard/);
          await openTriagePage(page);
          const { dialog } = await registerNewPatient(page, newTestPatient('Report'));
          // อ่านยอดก่อนหน้าให้ใกล้จังหวะเปิด Visit ที่สุด — ลดโอกาสที่คนในทีมเปิด Visit ER แทรกระหว่างนั้น
          before = await fetchMonthly(page, authorization(), thisMonth, thisMonth);
          visit = await confirmOpenErVisit(page, dialog);
          recordVisit(visit);
          await expectTriageFormOpen(page, visit);
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          const after = await fetchMonthly(page, authorization(), thisMonth, thisMonth);
          const diff = countDiff(after.rows[0], before.rows[0]);
          await test.info().attach('ผลต่างหลังเปิด Visit (หลัง − ก่อน)', { body: JSON.stringify(diff, null, 2), contentType: 'application/json' });
          expect(diff, 'ถ้าเกินกว่านี้ อาจมีคนในทีมเปิด/จำหน่าย Visit ER พร้อมกัน').toEqual({ total: 1, untriaged: 1, walkIn: 1, pending: 1 });
          await markEvidence(
            expected(main.getByText(visit.en, { exact: true }).filter({ visible: true }).first()),
            expected(page.getByRole('region', { name: 'วิธีการมาถึง' }).getByText('Walk-in', { exact: true })),
          );
        });

        await test.step('Triage ESI 2 (ฉุกเฉิน) แล้วบันทึก', async () => {
          const form = triageForm(page);
          await selectArrivalDetail(page, 'อุปกรณ์ช่วยเหลือ', 'ไม่มี', visit);
          await selectArrivalDetail(page, 'ผู้ที่มาด้วย', 'ญาติ', visit);
          await chooseGcs(page, '4 — ลืมตาได้เอง (Spontaneous)');
          await chooseGcs(page, '5 — พูดคุยรู้เรื่อง ตอบคำถามถูกต้อง (Oriented)');
          await chooseGcs(page, '6 — ทำตามคำสั่งได้ (Obeys commands)');
          await form.getByRole('button', { name: 'ปวดท้อง', exact: true }).click();
          await form.getByRole('button', { name: '2 ฉุกเฉิน' }).click();
          await expect(form.getByRole('button', { name: /^โซนแดง ER แนะนำ/, pressed: true })).toBeVisible();
          const saved = waitForApi(page, 'PATCH', `/cortex-api/er/encounters/${visit.en}/triage-result`);
          await saveButton(page).click();
          await expectOk(await saved, 'บันทึกผล Triage ของ Encounter');
        });

        await checkStep(page, 'หลัง Triage ESI 2: เทียบกับก่อนเปิด Visit → รวม +1 · ESI 2 +1 · Walk-in +1 · Pending +1 (ยังไม่ triage กลับเท่าเดิม)', async () => {
          const after = await fetchMonthly(page, authorization(), thisMonth, thisMonth);
          const diff = countDiff(after.rows[0], before.rows[0]);
          await test.info().attach('ผลต่างหลัง Triage (หลัง − ก่อนเปิด Visit)', { body: JSON.stringify(diff, null, 2), contentType: 'application/json' });
          expect(diff, 'ถ้าเกินกว่านี้ อาจมีคนในทีมเปิด/จำหน่าย Visit ER พร้อมกัน').toEqual({ total: 1, esi2: 1, walkIn: 1, pending: 1 });
          const level = labelledBox(main, 'Triage Level');
          await expect(level).toHaveText(/Triage Level\s*ESI 2/);
          await markEvidence(expected(level), expected(labelledBox(main, 'Triage Zone')));
        });

        await checkStep(page, `กลับหน้ารายงาน: แถว ${monthLabel(thisMonth)} แสดงยอดใหม่ และค่าสรุปคำนวณใหม่ตามสูตร`, async () => {
          const loaded = waitForApi(page, 'GET', '/cortex-api/er/reports/monthly');
          await openErMenu(page, 'รายงานทางสถิติ', 'รายงานรายเดือน');
          await expect(page).toHaveURL(/\/cortex\/er\/reports\/monthly/);
          // รอข้อมูลค่าเริ่มต้นตอนเปิดหน้าก่อน ไม่ให้มาทับตารางหลังกดค้นหา
          await expectOk(await loaded, 'โหลดรายงานรายเดือนตอนเปิดหน้า');
          await setMonthRange(page, thisMonth, thisMonth);
          const now = await searchMonthly(page, thisMonth, thisMonth);
          const counts = flatCounts(now.rows[0]);
          expect(counts.total, 'ยอดรวมต้องมากกว่าก่อนเปิด Visit').toBeGreaterThan(before.rows[0].total);
          const cells: Locator[] = [];
          for (const [key, spec] of [
            ['highAcuityRate', SHEETS[0]],
            ['admitRate', SHEETS[2]],
          ] as const) {
            const table = reportTable(page, spec.table);
            const screen = await readTable(table);
            const c = spec.columns.findIndex((column) => column.rate === key);
            const want = key === 'highAcuityRate' ? (counts.esi1 + counts.esi2) / counts.total : counts.admit / counts.total;
            expect(screen.rows[0][1], `${spec.table} · ยอดรวมบนหน้าจอ`).toBe(numberText(counts.total));
            expect(screen.rows[0][c + 1], `${spec.table} · ${spec.columns[c].screen}`).toBe(percentText(want));
            cells.push(tableCell(table, 0, 1), tableCell(table, 0, c + 1));
          }
          const esi = await readTable(reportTable(page, SHEETS[0].table));
          expect(esi.rows[0][3], 'ESI 2 บนหน้าจอ').toBe(numberText(counts.esi2));
          const { from, to } = monthRangeInputs(page);
          await markEvidence(
            filled(from),
            filled(to),
            clicked(main.getByRole('button', { name: 'ค้นหา' })),
            ...cells.map(expected),
            expected(tableCell(reportTable(page, SHEETS[0].table), 0, 3)),
          );
        });
      });
    },
  );
});
