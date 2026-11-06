import type { Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, expectVisitHeader, fetchBoard, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { erTriageLevel, erTriageSaveButton, fillErTriageForm, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, checkStep, clicked, expected, filled, hideCompareTable, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { restartVideo, startClip } from '../../../helpers/functions/fixtures';
import { overlaps, readPdfLayout, type PdfBarcode, type PdfLayout, type PdfTextLine } from '../../../helpers/functions/pdf-barcode';
import { captureGeneratedDocs, capturePrintJobs, hidePdf, pdfBox, pdfLineAt, showPdf } from '../../../helpers/functions/print-capture';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { expect, test } from '../../../mock-data/fixtures';
import { SYSTEM, registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { VITALS_NORMAL } from '../../../mock-data/uat-play';

// SBH-2785 [ER][บัตรคิว] เพิ่ม Barcode HN — ตำแหน่งใต้สุดของใบ (PR cortex-api #2856 "supply raw hn for er card barcode" · cortex-testing #1519)
// ชุด EXE SBH-3109 → HPY SBH-3110 (TC-001–003 = SBH-3112–3114) · EDG SBH-3111 (TC-004–005 = SBH-3115–3116) · TC ทุกใบใช้บัตรคิวใบเดียวกัน
// 1 เทส = 1 flow (R9) · คลิป 1 ไฟล์ต่อ 1 TC (R61)
//   ผู้ป่วย AUTO ใหม่ → เปิด Visit ER → คัดกรอง ESI 3 → ปุ่ม "พิมพ์บัตรคิว" ในฟอร์มคัดกรอง
//   → จับ PDF จาก response ของ POST /cortex-api/queues/print (R77 — zip ข้างในเป็น queue-1.pdf) · ดักคำสั่งที่ส่งต่อ print agent (localhost:8081) ตอบ 200 แทน
//   → เปิด PDF ซ้อนบนจอ (showPdf fit ความสูง) · ตรวจจากโครง PDF (readPdfLayout): Barcode เป็นแท่ง vector → ถอดรหัส Code 128 ตรงจากความกว้างแท่ง
// TC-003 "สแกน Barcode" — ผู้ใช้เลือก 31 ต.ค. 2026 "ถอดรหัสจาก PDF" (ไม่มีเครื่องสแกน · ยืนยันด้วย checksum mod 103 + แท่ง Stop)
// TC-005 เทียบกับรูปบัตรคิวในการ์ด — ชื่อ รพ. เป็นค่าของแต่ละระบบ (dev-x = รพ.มหาวิทยาลัยนเรศวร · รูปในการ์ด = รพ.สระบุรี) ผู้ใช้เลือก "ผ่าน + ข้อสังเกต"
// สิ่งที่เขียน: ผู้ป่วย AUTO 1 ราย + Visit ER + คัดกรอง + คิว (พิมพ์บัตรคิว) → ปิด Visit ที่การเงิน (afterEach · SBH2785_KEEP=1 = ไม่ปิด → ปิดด้วย --grep "@SBH-2785-CLOSE" + SBH2785_VISIT=<HN>,<VN>,<EN>)
// SBH Prod (ผู้ใช้อนุญาต 6 พ.ย. 2026 "สร้างคนไข้ตามที่ต้องใช้งานได้เลย") — ชื่อ รพ. บนบัตรต้องตรงรูปในการ์ด (รพ.สระบุรี)

const ISSUE: Record<string, string> = { '001': 'SBH-3112', '002': 'SBH-3113', '003': 'SBH-3114', '004': 'SBH-3115', '005': 'SBH-3116' };
const TC = (n: string) => `TC-${n} (${ISSUE[n]})`;
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const ALL = Object.keys(ISSUE);

const main = (page: Page) => page.getByRole('main');
const printQueueButton = (page: Page) => main(page).getByRole('button', { name: 'printer พิมพ์บัตรคิว', exact: true });
const bannerHn = (page: Page, hn: string) => main(page).getByText(`HN ${hn}`, { exact: true }).filter({ visible: true }).first();

/** วันที่วันนี้แบบบนบัตร DD/MM/ค.ศ. */
const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// ข้อความบนรูปบัตรคิวเดิมในการ์ด SBH-2785 (รพ.สระบุรี · PTA29971 · 19/10/2026 13:12) — ใช้เป็นแถวอ้างอิงของ TC-005
const CARD_IMAGE = {
  hospital: 'โรงพยาบาลสระบุรี',
  department: 'แผนกฉุกเฉิน (Emergency Room)',
  room: 'ห้องตรวจ : ห้องตรวจแผนกฉุกเฉิน',
  urgency: 'ระดับความเร่งด่วน : ฉุกเฉิน',
  urgencyNote1: 'ระดับนี้ประเมินโดยพยาบาลคัดกรอง และอาจปรับเปลี่ยนได้',
  urgencyNote2: 'หากรู้สึกอาการแย่ลง กรุณาแจ้งเจ้าหน้าที่ทันที',
  queueTitle: 'หมายเลขบัตรคิวของท่าน',
  queue: 'PTA29971',
  identity: 'หมายเลขนี้ใช้เพื่อระบุตัวตนของท่านเท่านั้น',
  identity1: 'ไม่ใช่ลำดับการเข้ารับการตรวจ',
  identity2: 'ลำดับการตรวจขึ้นอยู่กับความเร่งด่วนทางการแพทย์',
  identity3: 'กรุณาเก็บบัตรนี้ไว้และรอฟังการเรียกชื่อจากเจ้าหน้าที่',
  issuedAt: 'ออกคิวเมื่อ 19/10/2026 13:12',
};

const fmt = (n: number) => n.toFixed(1);
/** ช่องผลของแถวที่ค่าต่างจากรูปในการ์ดโดยธรรมชาติ (ต่างตาม Visit / ระบบ) และเช็คแค่ว่ามีบรรทัด — ✓ ทำให้อ่านว่าค่าตรงกัน (SBH-2785 Prod) */
const HAS_LINE = 'มีบรรทัดนี้';
/** ค้างกรอบแดงท้ายคลิปทุก TC (ต่อจาก 1.2 วิของ markEvidence) */
const HOLD_MS = 3_500;

test.describe(`SBH-2785 [ER][บัตรคิว] เพิ่ม Barcode HN (${SYSTEM})`, () => {
  test.skip(SYSTEM !== 'dev-x' && SYSTEM !== 'sbh-prod', 'รันได้เฉพาะ Dev-X และ SBH Prod (อนุญาตรายการ์ด R40)');
  let opened: Map<string, ErVisit>;
  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
  });
  test.afterEach(async ({ page }) => {
    await startClip(page, 'after'); // คลิป TC สุดท้ายไม่ติดขั้นปิด Visit ที่การเงิน
    await hideCompareTable(page);
    await hidePdf(page);
    if (process.env.SBH2785_KEEP) {
      for (const visit of opened.values()) console.log(`    หลังเทส: เก็บ Visit ไว้ (SBH2785_KEEP) — SBH2785_VISIT=${visit.hn},${visit.vn},${visit.en}`);
      return;
    }
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  test(
    'บัตรคิว ER จากฟอร์มคัดกรอง — Barcode HN ใต้สุดของใบ · ถอดรหัสได้ HN · 1 หน้า · ข้อมูลเดิมครบ (Super_User)',
    { tag: ['@SBH-2785', ...ALL.map((n) => `@${ISSUE[n]}`)], annotation: ['SBH-2785', ...ALL.map((n) => ISSUE[n])].map(linear) },
    async ({ page }) => {
      test.setTimeout(10 * 60_000);
      const { note, soft, finish } = makeRunner(page);
      const authorization = trackAuthorization(page);
      const docs = captureGeneratedDocs(page);
      const printer = await capturePrintJobs(page); // ไม่มี print agent ในเครื่องเทส → ตอบ 200 แทน (ไม่ขึ้นแจ้งเตือนพิมพ์ไม่สำเร็จ)
      let visit!: ErVisit;
      let pdf!: Buffer;
      let layout!: PdfLayout;
      let barcode!: PdfBarcode;
      let queue = '';

      const line = (re: RegExp): PdfTextLine | undefined => layout.lines.find((l) => re.test(l.text));
      /** เปิดบัตรคิวซ้อนครึ่งขวาของจอ + กรอบ Barcode (โปร่งใส ไว้ตีกรอบแดง) */
      const openCard = async (caption: string): Promise<{ overlay: Locator; bar: Locator }> => {
        await hidePdf(page);
        const overlay = await showPdf(page, pdf, caption, 1, { fit: 'height', textLayer: true });
        const bar = await pdfBox(overlay, barcode.box, 'barcode');
        return { overlay, bar };
      };
      const lineBox = async (overlay: Locator, text: string | RegExp) => {
        const found = await pdfLineAt(overlay, text);
        expect(found, `หาบรรทัด ${String(text)} บนบัตรคิวไม่เจอ`).toBeTruthy();
        return found!;
      };

      // ───── TC-001 ขั้น 1: ผู้ป่วยที่มี HN → เปิด Visit ER → บันทึกคัดกรอง ─────
      await gotoErDashboard(page);
      await restartVideo(page);
      await startClip(page, 'TC-001');
      const patient = newTestPatient('Qbc2785');
      await checkStep(page, `${TC('001')} ขั้น 1 เปิด Visit ER ให้ผู้ป่วยที่มี HN > บันทึกคัดกรอง`, async () => {
        visit = await registerAndOpenErVisit(page, patient);
        note('ผู้ป่วย', `${patient.firstName} ${patient.familyName} · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
        await expectVisitHeader(page, visit);
        await expect(main(page).getByRole('heading', { name: 'คัดกรอง ER', exact: true })).toBeVisible({ timeout: 60_000 });
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
        await fillErTriageForm(page, { level: 3, vitals: VITALS_NORMAL });
        await markEvidence(filled(erTriageLevel(page, 3).locator('xpath=..'), 'ESI 3'), clicked(erTriageSaveButton(page)));
        await snapEvidence(page, 'ก่อนกด — บันทึกคัดกรอง ESI 3');
        await saveErTriageForm(page, `บันทึกคัดกรองของ ${visit.en}`);
        await expect(main(page).getByText('Clinical Summary', { exact: true })).toBeVisible({ timeout: 60_000 });
        await dismissToast(page, 'กรอกข้อมูล คัดกรอง ER สำเร็จ');
        await markEvidence(expected(bannerHn(page, visit.hn), `ผู้ป่วยมี HN ${visit.hn}`), expected(printQueueButton(page), 'คัดกรองแล้ว · ปุ่มพิมพ์บัตรคิว'));
      });

      // ───── TC-001 ขั้น 2: กดปุ่ม พิมพ์บัตรคิว → ได้ PDF จาก API ─────
      await checkStep(page, `${TC('001')} ขั้น 2 ในฟอร์มคัดกรอง กดปุ่ม พิมพ์บัตรคิว`, async () => {
        await markEvidence(clicked(printQueueButton(page), 'พิมพ์บัตรคิว'));
        await snapEvidence(page, 'ก่อนกด — พิมพ์บัตรคิว');
        const since = Date.now();
        const jobsBefore = printer.jobs.length;
        await printQueueButton(page).click();
        const doc = await docs.next(/\/cortex-api\/queues\/print(-slips)?$/, since, 60_000);
        note(`${TC('001')} คำสั่งสร้างบัตรคิว`, `POST ${doc.api} ${doc.status} · body ${doc.request} · ไฟล์ ${doc.files.map((f) => f.name).join(', ') || '-'}${doc.error ? ` · ${doc.error}` : ''}`);
        expect(doc.error, 'API สร้างบัตรคิวต้องตอบสำเร็จ').toBeUndefined();
        const file = doc.files.find((f) => f.name.toLowerCase().endsWith('.pdf'));
        expect(file, 'ต้องได้ไฟล์ PDF บัตรคิว').toBeTruthy();
        pdf = file!.data;
        const job = await printer.next(jobsBefore, 15_000);
        note(`${TC('001')} ส่งต่อเครื่องพิมพ์`, job ? `แอปส่ง PDF ${job.pdf.length} byte ไป ${job.url} (สคริปต์ดักไว้ ตอบ 200)` : 'ไม่เห็นคำสั่งส่งไป print agent ใน 15 วินาที');
        await page.waitForTimeout(1_500);
        const toast = page.locator('.ant-message-notice, .ant-notification-notice').filter({ visible: true }).last();
        if (await toast.isVisible().catch(() => false)) {
          note(`${TC('001')} แจ้งเตือนหลังกดพิมพ์`, (await toast.innerText()).replace(/\s+/g, ' '));
          await markEvidence(alerted(toast));
        } else {
          await markEvidence(expected(printQueueButton(page), `ได้ไฟล์ ${file!.name} จาก ${doc.api}`));
        }
      });

      layout = await readPdfLayout(pdf);
      note('โครงบัตรคิว', `${layout.pages} หน้า · ขนาด ${fmt(layout.width)}×${fmt(layout.height)} pt · Barcode ${layout.barcodes.length} ชุด · ${layout.lines.length} บรรทัด`);
      for (const l of layout.lines) note('บรรทัดบนบัตร', `y ${fmt(l.box.y)}–${fmt(l.box.y + l.box.height)} · ${l.text}`);
      for (const b of layout.barcodes)
        note('Barcode', `${b.symbology} ชุดเริ่ม ${b.startSet} · ค่า ${b.text} · checksum ${b.checksumOk ? 'ถูก' : 'ผิด'} · Stop ${b.stopOk ? 'ถูก' : 'ผิด'} · ${b.bars} แท่ง · y ${fmt(b.box.y)}–${fmt(b.box.y + b.box.height)} x ${fmt(b.box.x)}–${fmt(b.box.x + b.box.width)}`);
      queue = layout.lines[layout.lines.findIndex((l) => l.text === 'หมายเลขบัตรคิวของท่าน') + 1]?.text ?? '';

      // ───── TC-001 ขั้น 3: เปิดบัตรคิว → แสดง Barcode HN ─────
      await checkStep(page, `${TC('001')} ขั้น 3 เปิดบัตรคิวที่ระบบสร้าง — แสดง Barcode HN`, async () => {
        expect(layout.barcodes, 'บัตรคิวต้องมี Barcode 1 ชุด').toHaveLength(1);
        barcode = layout.barcodes[0];
        const { bar } = await openCard(`บัตรคิว ER ของ HN ${visit.hn} (${TC('001')})`);
        await markEvidence(expected(bar, 'Barcode HN'));
        await page.waitForTimeout(HOLD_MS); // กรอบ Barcode = Expected หลักของ TC-001 ค้างให้อ่านทันก่อนจบคลิป
        expect(barcode.checksumOk && barcode.stopOk && !barcode.unknownSymbol, 'Barcode ต้องอ่านเป็น Code 128 ได้ครบ').toBe(true);
        expect(barcode.text, 'ค่าใน Barcode ต้องเป็น HN ของผู้ป่วย').toBe(visit.hn);
      });

      // ───── TC-002 ตำแหน่ง ─────
      await hidePdf(page);
      await startClip(page, 'TC-002');
      await soft(`${TC('002')} Barcode HN อยู่ใต้สุดของใบ ต่อจากบรรทัด "ออกคิวเมื่อ …" ไม่มีข้อความอื่นใต้ Barcode`, async () => {
        const { overlay, bar } = await openCard(`บัตรคิว ER ของ HN ${visit.hn} (${TC('002')})`);
        const last = layout.lines.at(-1)!;
        const issued = line(/^ออกคิวเมื่อ/);
        const below = layout.lines.filter((l) => l.box.y + l.box.height > barcode.box.y);
        const rows: CompareRow[] = [
          { label: 'บรรทัดข้อความสุดท้ายเหนือ Barcode', values: ['ออกคิวเมื่อ …', last.text], same: /^ออกคิวเมื่อ/.test(last.text) },
          { label: 'Barcode อยู่ใต้บรรทัด ออกคิวเมื่อ', values: ['อยู่ใต้', issued ? `ออกคิวเมื่อ จบที่ y ${fmt(issued.box.y + issued.box.height)} · Barcode เริ่ม y ${fmt(barcode.box.y)} pt` : '(ไม่พบบรรทัด)'], same: !!issued && barcode.box.y > issued.box.y + issued.box.height },
          { label: 'ข้อความที่อยู่ใต้ Barcode', values: ['ไม่มี', below.length ? below.map((l) => l.text).join(' / ') : 'ไม่มี (0 บรรทัด)'], same: below.length === 0 },
          { label: 'ระยะจากใต้ Barcode ถึงขอบล่างของใบ', values: ['-', `${fmt(layout.height - barcode.box.y - barcode.box.height)} pt (ใบสูง ${fmt(layout.height)} pt)`], same: true, result: 'ข้อมูล' },
        ];
        await showCompareTable(page, `${TC('002')} ตำแหน่ง Barcode HN บนบัตรคิว (ตำแหน่งจาก PDF)`, ['Expected', 'บัตรคิวที่ได้'], rows, { side: 'left', width: '760px', top: '300px' });
        await markEvidence(expected(await lineBox(overlay, /^ออกคิวเมื่อ/)), expected(bar, 'Barcode ใต้สุดของใบ'));
        await page.waitForTimeout(HOLD_MS);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'Barcode ต้องอยู่ใต้สุด ต่อจากออกคิวเมื่อ').toEqual([]);
      });
      await hideCompareTable(page);

      // ───── TC-003 สแกน (ถอดรหัส) Barcode → HN ─────
      await hidePdf(page);
      await startClip(page, 'TC-003');
      await soft(`${TC('003')} ถอดรหัส Barcode บนบัตรคิว ได้ค่าตรงกับ HN ของผู้ป่วยบน Patient Banner`, async () => {
        const { bar } = await openCard(`บัตรคิว ER ของ HN ${visit.hn} (${TC('003')})`);
        const banner = (await bannerHn(page, visit.hn).innerText()).replace(/^HN\s*/, '').trim();
        const rows: CompareRow[] = [
          { label: 'HN', values: [barcode.text, banner], same: barcode.text === banner },
          { label: 'ชนิด Barcode', values: [`${barcode.symbology} (เริ่มชุด ${barcode.startSet} · ${barcode.bars} แท่ง)`, '-'], same: !barcode.unknownSymbol, result: 'ถูกต้อง' },
          { label: 'Checksum (mod 103)', values: [barcode.checksumOk ? 'ถูกต้อง' : 'ไม่ถูกต้อง', '-'], same: barcode.checksumOk, result: 'ถูกต้อง' },
          { label: 'แท่ง Stop', values: [barcode.stopOk ? 'ถูกต้อง' : 'ไม่ถูกต้อง', '-'], same: barcode.stopOk, result: 'ถูกต้อง' },
        ];
        await showCompareTable(page, `${TC('003')} ค่าที่ถอดรหัสจาก Barcode เทียบกับ HN ของผู้ป่วย`, ['ค่าจาก Barcode (ถอดรหัสจาก PDF)', 'HN บน Patient Banner'], rows, { side: 'left', width: '760px', top: '300px' });
        await markEvidence(expected(bannerHn(page, visit.hn), `HN ${banner}`), expected(bar, `ถอดรหัสได้ ${barcode.text}`));
        await page.waitForTimeout(HOLD_MS);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'ค่าที่สแกนได้ต้องตรงกับ HN ของผู้ป่วย').toEqual([]);
      });
      await hideCompareTable(page);

      // ───── TC-004 1 หน้า ─────
      await hidePdf(page);
      await startClip(page, 'TC-004');
      await soft(`${TC('004')} บัตรคิวที่มี Barcode HN มี 1 หน้า Barcode อยู่หน้าเดียวกับหมายเลขบัตรคิว`, async () => {
        const { overlay, bar } = await openCard(`บัตรคิว HN ${visit.hn} (TC-004)`); // หัวสั้น: หัวยาวเต็มแถวแล้วป้าย Expected: 1 หน้า ทับวงเล็บท้ายหัว (run2 ภาพ 08)
        const pageInfo = overlay.getByText(/หน้า 1 \/ \d+/);
        const rows: CompareRow[] = [
          { label: 'จำนวนหน้าของบัตรคิว (PDF)', values: ['1 หน้า', `${layout.pages} หน้า`], same: layout.pages === 1 },
          { label: 'หมายเลขบัตรคิวอยู่หน้า', values: ['หน้าเดียวกับ Barcode', queue ? `หน้า 1 (${queue})` : '(ไม่พบ)'], same: !!queue },
          { label: 'Barcode HN อยู่หน้า', values: ['หน้าเดียวกับหมายเลขบัตรคิว', layout.barcodes.length ? 'หน้า 1' : '(ไม่พบ)'], same: layout.barcodes.length === 1 },
          { label: 'Barcode อยู่ในขอบกระดาษ', values: ['ไม่ล้นหน้า', `ล่างสุด y ${fmt(barcode.box.y + barcode.box.height)} จาก ${fmt(layout.height)} pt`], same: barcode.box.y + barcode.box.height <= layout.height },
        ];
        await showCompareTable(page, `${TC('004')} จำนวนหน้าของบัตรคิว`, ['Expected', 'บัตรคิวที่ได้'], rows, { side: 'left', width: '760px', top: '300px' });
        await markEvidence(expected(pageInfo, `${layout.pages} หน้า`), expected(await lineBox(overlay, queue), 'เลขคิว'), expected(bar, 'Barcode หน้าเดียวกัน'));
        await page.waitForTimeout(HOLD_MS); // กรอบค้างพอให้คนดูคลิปอ่านทัน (เดิม ~2 วิ)
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'บัตรคิวต้องมี 1 หน้า').toEqual([]);
      });
      await hideCompareTable(page);

      // ───── TC-005 ข้อมูลเดิมครบ ไม่ถูก Barcode ทับ ─────
      const board = await fetchBoard(page, authorization);
      const visitQueue = (board.find((e) => e.en === visit.en) as { queueExam?: { qDisplay?: string } } | undefined)?.queueExam?.qDisplay ?? '';
      note(`${TC('005')} เลขคิวของ Visit (บอร์ด ER)`, visitQueue || '(ไม่พบ)');
      await hidePdf(page);
      await startClip(page, 'TC-005');
      await soft(`${TC('005')} ข้อมูลเดิมบนบัตรคิวแสดงครบหลังเพิ่ม Barcode HN ไม่มีข้อความใดถูก Barcode ทับ`, async () => {
        const { overlay, bar } = await openCard(`บัตรคิว ER ของ HN ${visit.hn} (${TC('005')})`);
        const deptIndex = layout.lines.findIndex((l) => l.text.startsWith('แผนกฉุกเฉิน'));
        const hospital = layout.lines.slice(0, Math.max(deptIndex, 0)).map((l) => l.text).join(' / ');
        const has = (text: string) => layout.lines.find((l) => l.text === text)?.text ?? '(ไม่พบ)';
        const urgency = line(/^ระดับความเร่งด่วน :/)?.text ?? '(ไม่พบ)';
        const issued = line(/^ออกคิวเมื่อ/)?.text ?? '(ไม่พบ)';
        const covered = layout.lines.filter((l) => overlaps(l.box, barcode.box));
        const rows: CompareRow[] = [
          { label: 'ชื่อ รพ.', values: [CARD_IMAGE.hospital, hospital || '(ไม่พบ)'], same: SYSTEM === 'sbh-prod' ? hospital === CARD_IMAGE.hospital : /^โรงพยาบาล/.test(hospital), result: SYSTEM === 'sbh-prod' ? undefined : HAS_LINE },
          { label: 'แผนก', values: [CARD_IMAGE.department, has(CARD_IMAGE.department)], same: has(CARD_IMAGE.department) === CARD_IMAGE.department },
          { label: 'ห้องตรวจ', values: [CARD_IMAGE.room, has(CARD_IMAGE.room)], same: has(CARD_IMAGE.room) === CARD_IMAGE.room },
          { label: 'ระดับความเร่งด่วน', values: [CARD_IMAGE.urgency, urgency], same: urgency.startsWith('ระดับความเร่งด่วน :') && !urgency.endsWith(':'), result: urgency === CARD_IMAGE.urgency ? undefined : HAS_LINE },
          { label: 'คำอธิบายระดับ', values: [`${CARD_IMAGE.urgencyNote1} / ${CARD_IMAGE.urgencyNote2}`, `${has(CARD_IMAGE.urgencyNote1)} / ${has(CARD_IMAGE.urgencyNote2)}`], same: has(CARD_IMAGE.urgencyNote1) !== '(ไม่พบ)' && has(CARD_IMAGE.urgencyNote2) !== '(ไม่พบ)' },
          { label: 'หมายเลขบัตรคิว', values: [`${CARD_IMAGE.queueTitle} ${CARD_IMAGE.queue}`, `${has(CARD_IMAGE.queueTitle)} ${queue || '(ไม่พบ)'} (คิวของ Visit ${visitQueue || '-'})`], same: !!queue && queue === visitQueue, result: 'ตรงคิว Visit' },
          { label: 'ข้อความระบุตัวตน', values: [CARD_IMAGE.identity, has(CARD_IMAGE.identity)], same: has(CARD_IMAGE.identity) === CARD_IMAGE.identity },
          { label: 'คำอธิบายลำดับตรวจ', values: [[CARD_IMAGE.identity1, CARD_IMAGE.identity2, CARD_IMAGE.identity3].join(' / '), [CARD_IMAGE.identity1, CARD_IMAGE.identity2, CARD_IMAGE.identity3].map(has).join(' / ')], same: [CARD_IMAGE.identity1, CARD_IMAGE.identity2, CARD_IMAGE.identity3].every((t) => has(t) === t) },
          { label: 'ออกคิวเมื่อ', values: [CARD_IMAGE.issuedAt, issued], same: new RegExp(`^ออกคิวเมื่อ ${today().replace(/\//g, '\\/')} \\d{2}:\\d{2}$`).test(issued), result: HAS_LINE },
          { label: 'ข้อความที่ถูก Barcode ทับ', values: ['ไม่มี', covered.length ? covered.map((l) => l.text).join(' / ') : 'ไม่มี (0 บรรทัด)'], same: covered.length === 0 },
        ];
        await showCompareTable(page, `${TC('005')} บัตรคิวที่ได้ เทียบกับรูปบัตรคิวเดิมในการ์ด`, ['รูปบัตรคิวเดิมในการ์ด (รพ.สระบุรี)', `บัตรคิวที่ได้ (${SYSTEM === 'sbh-prod' ? 'SBH Prod' : SYSTEM})`], rows, { side: 'left', width: '900px', top: '84px' });
        await markEvidence(
          expected(await lineBox(overlay, /^โรงพยาบาล/)),
          expected(await lineBox(overlay, CARD_IMAGE.room)),
          expected(await lineBox(overlay, /^ระดับความเร่งด่วน :/)),
          expected(await lineBox(overlay, queue)),
          expected(await lineBox(overlay, CARD_IMAGE.identity)),
          expected(await lineBox(overlay, /^ออกคิวเมื่อ/)),
          expected(bar, 'ไม่ทับข้อความ'),
        );
        await page.waitForTimeout(HOLD_MS);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'ข้อมูลเดิมบนบัตรคิวต้องแสดงครบ ไม่ถูก Barcode ทับ').toEqual([]);
      });
      await hideCompareTable(page);
      await hidePdf(page);
      finish();
    },
  );

  test('ปิด Visit ของผู้ป่วยใน SBH2785_VISIT ที่การเงิน (หลังรันด้วย SBH2785_KEEP)', { tag: ['@SBH-2785-CLOSE'] }, async ({ page }) => {
    const [hn, vn, en] = (process.env.SBH2785_VISIT ?? '').split(',');
    test.skip(!hn || !vn, 'ต้องใส่ SBH2785_VISIT=<HN>,<VN>,<EN>');
    const closed = await closeVisitAtCashier(page, hn, vn);
    console.log(`    ปิด Visit HN ${hn} · ${vn} · ${en ?? '-'}: ${closed.result}`);
  });
});
