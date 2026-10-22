import fs from 'node:fs';
import path from 'node:path';
import { expectVisitHeader } from '../../../helpers/functions/er';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { checkStep, clicked, expected, filled, hideCompareTable, holdForClip, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/support/evidence';
import {
  REFER_IN_PATH,
  REFER_SECTIONS,
  expectedReferFields,
  fetchBoardQueue,
  fetchReferDetail,
  fetchReferInList,
  fetchReferSnapshot,
  gotoReferInList,
  mophReferHeader,
  mophReferSection,
  preHospitalInfo,
  readReferSections,
  referDetailDialog,
  referInRow,
  referSection,
  type ReferInDetail,
  type ReferInItem,
  type ReferSectionData,
} from '../../../helpers/functions/refer-in';
import { expect, test } from '../../../mock-data/fixtures';
import { envName } from '../../../utils/env';

// SBH-2394 [ER][MOPH Refer In] เพิ่มปุ่มที่หน้า เปิด Visit — แถบ "MOPH Refer" ใต้ช่อง ข้อมูลก่อนถึงโรงพยาบาล ของหน้าผู้ป่วย ER (สเปก SBH-2425)
// แปลงจากชุด Manual: EXE SBH-2445 → SC-001 (SBH-2446) → TC-001 (SBH-2447) · 1 เทส = 1 flow (R9)
// อ่านอย่างเดียว: ไม่เปิด Visit / ไม่กดรับผู้ป่วย / ไม่กด "ยืนยันผู้ป่วยมาถึงแล้ว" / ไม่บันทึกฟอร์ม
// ใช้ Visit ER ที่เปิดจากหน้า รับ Refer เข้า ไว้แล้ว และยังอยู่ขั้น Triage (ช่อง ข้อมูลก่อนถึงโรงพยาบาล แสดงเฉพาะขั้นนี้) — เฉพาะผู้ป่วย Mock (HN ต้นทางขึ้นต้น UAT)
// รันได้เฉพาะ SBH Prod (ผู้ใช้อนุญาต 6 ต.ค. 2026): npm run card:prod -- --headed --grep @SBH-2394 · dev-x ไม่มีผู้ป่วยรับ Refer → เทสถูกข้าม
//   REFER_ORIGIN_HN=<HN ต้นทาง> = เจาะจงผู้ป่วย
// "ข้อมูล MOPH Refer ของผู้ป่วยรายนี้" ที่ใช้เทียบ: (1) หน้าต่าง รายละเอียดการส่งต่อ ของหน้า รับ Refer เข้า (2) สำเนา refer ของ Visit จาก API (3) ไฟล์ที่ชุด Mock ส่งเข้า MOPH Refer

const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const note = (description: string) => test.info().annotations.push({ type: 'ข้อสังเกต', description });
const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

const NO_ALLERGY_TEXT = 'รพ. ต้นทางไม่ได้บันทึกประวัติแพ้ยา';
const PAYLOAD_DIR = path.join(__dirname, '..', '..', '..', 'mock-data-refer', 'mock-data');

/** ไฟล์ที่ชุด Mock ส่งเข้า MOPH Refer (mock-data-refer/) ของเลขที่ใบส่งตัวนี้ — ช่องที่หน้าจอแสดงค่าตรงตัว · ไม่มีไฟล์ = undefined */
function sentPayloadFields(referOutNo: string): { file: string; fields: Record<string, ReferSectionData> } | undefined {
  if (!fs.existsSync(PAYLOAD_DIR)) return undefined;
  for (const file of fs.readdirSync(PAYLOAD_DIR).filter((name) => name.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(PAYLOAD_DIR, file), 'utf8')) as Record<string, string> & { vital_sign: Record<string, string> };
    if (data.refer_out_no !== referOutNo) continue;
    const vital = data.vital_sign;
    return {
      file,
      fields: {
        ข้อมูลการส่งต่อ: { เลขที่ใบส่งตัว: data.refer_out_no, 'เบอร์โทร รพ. ต้นทาง': data.hospital_origin_phone, เหตุผลการส่งต่อ: clean(data.reason_refer) },
        ข้อมูลทางคลินิก: {
          ประวัติการเจ็บป่วยปัจจุบัน: clean(data.record_illness_present),
          ประวัติการเจ็บป่วยในอดีต: clean(data.record_illness_past),
          ผลตรวจที่ทำมาแล้ว: clean(data.test_results),
          การวินิจฉัยเบื้องต้น: clean(data.initial_diagnosis_free_text),
          การรักษาที่ให้มาแล้ว: clean(data.treatment_provided),
          รายละเอียดเพิ่มเติม: clean(data.more_detail),
        },
        'สัญญาณชีพจาก รพ. ต้นทาง': {
          ความดันโลหิต: `${vital.systolic_bp}/${vital.diastolic_bp}`,
          ชีพจร: vital.heart_rate,
          อัตราการหายใจ: vital.respiratory_rate,
          อุณหภูมิ: vital.temperature,
          ออกซิเจนในเลือด: vital.oxygen_saturation,
          ระดับความปวด: vital.pain_score,
          'ระดับความรู้สึกตัว (GCS)': `E${vital.e} V${vital.v} M${vital.m}`,
          น้ำหนัก: vital.weight,
          ส่วนสูง: vital.height,
        },
      },
    };
  }
  return undefined;
}

test.describe('SBH-2394 ER แถบ MOPH Refer ที่หน้าคัดกรอง (MOPH Refer In)', () => {
  // SBH Prod เปิดหน้าช้าและหลุดเป็นพักๆ + ค้างหน้าจอให้คลิปอ่านทัน เกินค่าตั้งต้น 60 วินาที
  test.describe.configure({ timeout: 420_000 });

  test(
    'ผู้ป่วยรับ Refer: มีปุ่ม MOPH Refer ใต้ช่อง ข้อมูลก่อนถึงโรงพยาบาล · กดแล้วแสดงข้อมูล MOPH Refer ตรงกับข้อมูล refer ของผู้ป่วย (Super_User)',
    { tag: ['@SBH-2394', '@SBH-2447'], annotation: [linear('SBH-2394'), linear('SBH-2445')] },
    async ({ page }) => {
      const authorization = trackAuthorization(page);
      const section = mophReferSection(page);
      const header = mophReferHeader(page);

      // คำสั่งที่เขียนข้อมูล (ถ้ามี) ระหว่างเทส — เทสนี้ต้องอ่านอย่างเดียว จดไว้ให้ตรวจได้จากรายงาน
      const writes: string[] = [];
      page.on('request', (req) => {
        const url = new URL(req.url());
        if (!/api/.test(url.pathname)) return;
        const operation = (req.postData() ?? '').match(/\b(mutation)\s+(\w+)/)?.[2];
        if (['PUT', 'PATCH', 'DELETE'].includes(req.method()) || operation) writes.push(`${req.method()} ${url.pathname}${operation ? ` (mutation ${operation})` : ''}`);
      });

      let listStatus = 0;
      await test.step('เตรียม: เปิดหน้า รับ Refer เข้า', async () => {
        // API รายการตอบไม่ผ่านชั่วคราวบน SBH Prod ได้ → เปิดหน้าใหม่อีกรอบ
        for (let attempt = 1; attempt <= 3 && listStatus !== 200; attempt++) listStatus = await gotoReferInList(page).catch(() => 0);
      });
      test.skip(listStatus !== 200 && !envName(), `dev-x: รายการ รับ Refer เข้า โหลดไม่ได้ (API ตอบ ${listStatus}) และไม่มี Visit ที่ผูกกับ refer — TC นี้รันได้เฉพาะ SBH Prod`);
      expect(listStatus, 'รายการ รับ Refer เข้า ต้องโหลดได้').toBe(200);

      let refer!: ReferInItem;
      let snapshot!: ReferInDetail;
      let detail!: ReferInDetail;
      await test.step('เตรียม: หา Visit ER ที่เปิดจากหน้า รับ Refer เข้า และยังอยู่ขั้น Triage', async () => {
        const { items, problem } = await fetchReferInList(page, authorization());
        expect(items, problem).toBeTruthy();
        const queue = await fetchBoardQueue(page, authorization());
        const inTriage = new Set(queue.filter((encounter) => !encounter.triagedAt && encounter.latestStatusCode !== 'cancelled').map((encounter) => encounter.en));
        const wanted = process.env.REFER_ORIGIN_HN;
        const candidates = (items ?? []).filter(
          (item) => item.status === 'receive' && item.linkedVisit && inTriage.has(item.linkedVisit.en) && /^UAT/.test(item.originHn) && (!wanted || item.originHn === wanted),
        );
        expect(
          candidates.length,
          'ต้องมีผู้ป่วย Mock ที่เปิด Visit ER จากหน้า รับ Refer เข้า แล้วและยังไม่ได้คัดกรอง — กด "รับผู้ป่วยเข้า ER" จากรายการที่รอรับ 1 รายก่อน (ต้องได้รับอนุญาตจากผู้ใช้)',
        ).toBeGreaterThan(0);
        refer = candidates[0];
        const visit = refer.linkedVisit!;
        snapshot = await fetchReferSnapshot(page, authorization(), visit.vn);
        detail = await fetchReferDetail(page, authorization(), refer.referId);
        test.info().annotations.push(
          { type: 'ระบบ', description: envName() ?? 'dev-x' },
          { type: 'Refer', description: `${refer.referOutNo} (${refer.referId}) · ${refer.patientName} · HN ต้นทาง ${refer.originHn}` },
          { type: 'Visit', description: `HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}` },
        );
        console.log(`    Refer ${refer.referOutNo} (${refer.referId}) · HN ${visit.hn} · VN ${visit.vn} · EN ${visit.en}`);
        await test.info().attach(`GET /cortex-api/moph/refer-in/by-vn/${visit.vn} (สำเนา refer ของ Visit)`, { body: JSON.stringify(snapshot, null, 2), contentType: 'application/json' });
      });
      const visit = refer.linkedVisit!;

      // ---------------- ขั้น 1 ----------------
      let reference: Record<string, ReferSectionData> = {};
      await checkStep(page, 'TC-001 (SBH-2447) ขั้น 1 เปิดหน้าผู้ป่วย ER ของผู้ป่วยที่เปิด Visit จากหน้า รับ Refer เข้า', async () => {
        const row = referInRow(page, refer);

        await checkStep(page, 'หน้า รับ Refer เข้า มีรายการของผู้ป่วย สถานะ รับเรียบร้อย', async () => {
          const search = page.getByRole('searchbox', { name: 'ค้นหาด้วยเลขบัตรประชาชน' });
          await search.fill(refer.cid);
          await search.press('Enter');
          await expect(row).toHaveCount(1);
          const status = row.getByRole('cell', { name: 'รับเรียบร้อย', exact: true });
          await expect(status).toBeVisible();
          await expect(row.getByRole('button', { name: 'ไปที่ Visit' })).toBeVisible();
          await markEvidence(filled(search), expected(row), expected(status));
          await holdForClip(page);
        });

        await checkStep(page, 'ดูรายละเอียด แสดงข้อมูล MOPH Refer ของผู้ป่วยรายนี้ (จดไว้เทียบในขั้น 4)', async () => {
          const open = row.getByRole('button', { name: 'ดูรายละเอียด' });
          await markEvidence(clicked(open));
          await snapEvidence(page, 'ก่อนกด — ดูรายละเอียด');
          await open.click();
          const dialog = referDetailDialog(page);
          await expect(dialog).toBeVisible({ timeout: 45_000 });
          for (const title of REFER_SECTIONS) await expect(referSection(dialog, title)).toBeVisible({ timeout: 45_000 });
          reference = await readReferSections(dialog);
          expect(reference['ข้อมูลการส่งต่อ']['เลขที่ใบส่งตัว'], 'หน้าต่างรายละเอียดต้องเป็นของ refer ที่เลือก').toBe(refer.referOutNo);
          expect(reference['ข้อมูลผู้ป่วย']['เลขบัตรประชาชน']).toBe(refer.cid);
          await test.info().attach('รายละเอียดการส่งต่อ (หน้า รับ Refer เข้า)', { body: JSON.stringify(reference, null, 2), contentType: 'application/json' });

          // ภาพอ้างอิงของข้อมูล MOPH Refer ทีละช่วง (หน้าต่างสูงกว่าจอ)
          for (const titles of [['ข้อมูลผู้ป่วย', 'ข้อมูลการส่งต่อ'], ['ข้อมูลทางคลินิก'], ['สัญญาณชีพจาก รพ. ต้นทาง', 'ประวัติแพ้ยาจาก รพ. ต้นทาง']]) {
            await markEvidence(...titles.map((title) => expected(referSection(dialog, title))));
            await holdForClip(page);
            await snapEvidence(page, `รายละเอียดการส่งต่อ — ${titles.join(' · ')}`);
          }
          // ปิดด้วยปุ่ม X เท่านั้น — ปุ่ม "ยืนยันผู้ป่วยมาถึงแล้ว" ในหน้าต่างนี้เขียนข้อมูล
          await dialog.getByRole('button', { name: 'Close' }).click();
          await expect(dialog).toBeHidden();
          await markEvidence(expected(row));
        });

        await checkStep(page, 'ไปที่ Visit เปิดหน้าผู้ป่วย ER ของ Visit ที่ผูกกับ refer นี้', async () => {
          const go = row.getByRole('button', { name: 'ไปที่ Visit' });
          await markEvidence(clicked(go));
          await snapEvidence(page, 'ก่อนกด — ไปที่ Visit');
          // ถ้าระบบเปิดแท็บใหม่ คลิปของหน้าเดิมจะไม่เห็น → เปิด URL เดียวกันในหน้าเดิมแทน
          const popup = page.context().waitForEvent('page', { timeout: 6_000 }).catch(() => null);
          await go.click();
          const opened = await popup;
          if (opened) {
            await opened.waitForURL(/\/patients\//, { timeout: 60_000 });
            const url = opened.url();
            await opened.close();
            await page.goto(url);
            note('ปุ่ม "ไปที่ Visit" เปิดแท็บใหม่ — เทสเปิด URL เดียวกันในหน้าเดิมเพื่อให้คลิปเห็นต่อเนื่อง');
          }
          await expectVisitHeader(page, visit);
          await expect(preHospitalInfo(page)).toBeVisible({ timeout: 60_000 });
          const main = page.getByRole('main');
          await markEvidence(
            expected(main.getByText(`HN ${visit.hn}`, { exact: true }).filter({ visible: true }).first()),
            expected(main.getByText(`VN ${visit.vn}`, { exact: true }).filter({ visible: true }).first()),
            expected(main.getByText(visit.en, { exact: true }).filter({ visible: true }).first()),
          );
          await holdForClip(page);
        });
      });

      // ---------------- ขั้น 2 ----------------
      await checkStep(page, 'TC-001 (SBH-2447) ขั้น 2 ใต้ช่อง ข้อมูลก่อนถึงโรงพยาบาล มีปุ่ม MOPH Refer', async () => {
        const field = preHospitalInfo(page);
        await expect(field.getByText('ข้อมูลก่อนถึงโรงพยาบาล', { exact: true })).toBeVisible();
        await expect(header).toBeVisible({ timeout: 45_000 });
        await expect(header).toHaveText('MOPH Refer');
        // สเปก SBH-2425: แถบพับอยู่ตอนเปิดหน้า
        await expect(header).toHaveAttribute('aria-expanded', 'false');
        const [fieldBox, sectionBox] = [await field.boundingBox(), await section.boundingBox()];
        expect(fieldBox && sectionBox, 'อ่านตำแหน่งของช่องและแถบได้').toBeTruthy();
        const gap = sectionBox!.y - (fieldBox!.y + fieldBox!.height);
        expect(gap, `แถบ MOPH Refer ต้องอยู่ใต้ช่อง ข้อมูลก่อนถึงโรงพยาบาล ติดกัน (ระยะห่าง ${Math.round(gap)}px)`).toBeGreaterThanOrEqual(-1);
        expect(gap).toBeLessThan(60);
        await markEvidence(expected(field), expected(header));
        await holdForClip(page);
      });

      // ---------------- ขั้น 3 ----------------
      let shown: Record<string, ReferSectionData> = {};
      await checkStep(page, 'TC-001 (SBH-2447) ขั้น 3 กดปุ่ม MOPH Refer แล้วแสดงข้อมูล MOPH Refer ของผู้ป่วยรายนี้', async () => {
        await markEvidence(clicked(header));
        await holdForClip(page);
        await snapEvidence(page, 'ก่อนกด — ปุ่ม MOPH Refer (ยังพับอยู่)');
        await header.click();
        await expect(header).toHaveAttribute('aria-expanded', 'true');
        for (const title of REFER_SECTIONS) await expect(referSection(section, title)).toBeVisible({ timeout: 45_000 });
        // รอให้แถบกางสุดก่อน (ระหว่างกางตำแหน่งยังขยับ กรอบแดงจะไม่ตรง)
        await expect(section.locator('.ant-motion-collapse')).toHaveCount(0);
        shown = await readReferSections(section);
        expect(Object.keys(shown), 'แถบ MOPH Refer แสดง 4 ส่วนตามลำดับ').toEqual([...REFER_SECTIONS]);
        // "ของผู้ป่วยรายนี้": สำเนา refer ที่ผูกกับ VN ของ Visit นี้ คือ refer ใบเดียวกับที่เลือกจากหน้า รับ Refer เข้า และเป็นผู้ป่วยคนเดียวกัน
        expect(snapshot.referId).toBe(refer.referId);
        expect(snapshot.cid).toBe(refer.cid);
        expect(shown['ข้อมูลการส่งต่อ']['เลขที่ใบส่งตัว']).toBe(refer.referOutNo);
        expect(shown['ข้อมูลการส่งต่อ']['โรงพยาบาลต้นทาง']).toBe(refer.originHospitalName);
        await test.info().attach('แถบ MOPH Refer (หน้าผู้ป่วย ER)', { body: JSON.stringify(shown, null, 2), contentType: 'application/json' });
        await markEvidence(clicked(header), expected(referSection(section, 'ข้อมูลการส่งต่อ')));
        await holdForClip(page);
      });

      // ---------------- ขั้น 4 ----------------
      await checkStep(page, 'TC-001 (SBH-2447) ขั้น 4 ข้อมูลที่แสดงตรงกับข้อมูล MOPH Refer ของผู้ป่วยรายนี้', async () => {
        const fromSnapshot = expectedReferFields(snapshot);
        const fromLive = expectedReferFields(detail);
        const sent = sentPayloadFields(refer.referOutNo);
        if (!sent) note(`ไม่พบไฟล์ที่ส่งเข้า MOPH Refer ของ ${refer.referOutNo} ใน mock-data-refer/ — เทียบแค่หน้าต่างรายละเอียดการส่งต่อ และ API`);
        const columns = ['แถบ MOPH Refer', 'รายละเอียดการส่งต่อ (หน้า รับ Refer เข้า)', 'API สำเนา refer ของ Visit', ...(sent ? ['ไฟล์ที่ รพ. ต้นทางส่งเข้า MOPH'] : [])];

        for (const title of REFER_SECTIONS) {
          await checkStep(page, `${title} ตรงกับข้อมูล MOPH Refer`, async () => {
            const onScreen = shown[title];
            const onDialog = reference[title] ?? {};
            const api: ReferSectionData | undefined = (fromSnapshot as Record<string, ReferSectionData>)[title];
            const live: ReferSectionData | undefined = (fromLive as Record<string, ReferSectionData>)[title];
            const file = sent?.fields[title];
            const noAllergy = title === 'ประวัติแพ้ยาจาก รพ. ต้นทาง' && snapshot.allergies.length === 0;

            const rows: CompareRow[] = Object.keys({ ...onDialog, ...onScreen }).map((label) => {
              const others = [onDialog[label], api?.[label] ?? (noAllergy ? NO_ALLERGY_TEXT : undefined), ...(sent ? [file?.[label]] : [])];
              return {
                label,
                values: [onScreen[label] ?? '(ไม่มีช่องนี้)', ...others.map((value) => value ?? '(ไม่ได้เทียบ)')],
                same: others.every((value) => value === undefined || value === onScreen[label]),
              };
            });
            await showCompareTable(page, `เทียบ "${title}" — Refer ${refer.referOutNo} · HN ${visit.hn}`, columns, rows);
            await markEvidence(expected(referSection(section, title)));
            await holdForClip(page, 2_500);

            expect(onScreen, 'แถบ MOPH Refer ต้องแสดงเหมือนหน้าต่างรายละเอียดการส่งต่อ ทุกช่อง').toEqual(onDialog);
            if (api) expect(onScreen, 'ตรงกับสำเนา refer ที่เก็บไว้กับ Visit (API by-vn)').toMatchObject(api);
            if (live) expect(onScreen, 'ตรงกับรายละเอียด refer ล่าสุดจาก MOPH Refer (API)').toMatchObject(live);
            if (noAllergy) expect(onScreen['']).toBe(NO_ALLERGY_TEXT);
            else if (title === 'ประวัติแพ้ยาจาก รพ. ต้นทาง') {
              for (const value of snapshot.allergies.flatMap((allergy) => Object.values(allergy)).filter((value): value is string => typeof value === 'string' && value.length > 1)) {
                expect.soft(onScreen[''], `ประวัติแพ้ยาต้องมี "${value}"`).toContain(clean(value));
              }
            }
            if (file) expect(onScreen, `ตรงกับไฟล์ที่ส่งเข้า MOPH Refer (${sent!.file})`).toMatchObject(file);
          });
          await hideCompareTable(page);
        }

        // อายุใบส่งตัวแสดงเป็นข้อความ "ถึงวันที่ …" (ไม่ใช่ค่าตรงตัว) — เช็คว่ามีวันหมดอายุของ refer
        if (snapshot.validityExpireDate) expect(shown['ข้อมูลการส่งต่อ']['อายุใบส่งตัว']).toContain(snapshot.validityExpireDate);
        await markEvidence(expected(section));
        await holdForClip(page);
      });

      test.info().annotations.push({ type: 'คำสั่งเขียนข้อมูลระหว่างเทส', description: writes.length ? [...new Set(writes)].join(' · ') : 'ไม่มี (อ่านอย่างเดียว)' });
      console.log(`    คำสั่งเขียนข้อมูลระหว่างเทส: ${writes.length ? [...new Set(writes)].join(' · ') : 'ไม่มี'}`);
    },
  );
});
