import { expect, type Locator, type Page } from '@playwright/test';
import { waitForApi, type ErVisit } from './er';

// หน้า "รับ Refer เข้า" (เมนู ส่งต่อผู้ป่วย) + ข้อมูล MOPH Refer บนหน้าผู้ป่วย ER — locator ตรวจกับ SBH Prod v2.8.1 เมื่อ 6 ต.ค. 2026
// dev-x: API รายการตอบ 502 "การเชื่อมต่อระบบ MoPH Refer หมดอายุ" และไม่มี Visit ที่ผูกกับ refer (ตรวจ 6 ต.ค. 2026)

export const REFER_IN_PATH = '/cortex/refer/refer-in';
const REFER_IN_API = '/cortex-api/moph/refer-in';

/** 4 ส่วนของข้อมูล MOPH Refer ที่แถบ MOPH Refer / แท็บข้อมูล Refer จาก MoPH / หน้าต่างรายละเอียดการส่งต่อ แสดงเหมือนกัน */
export const REFER_SECTIONS = ['ข้อมูลการส่งต่อ', 'ข้อมูลทางคลินิก', 'สัญญาณชีพจาก รพ. ต้นทาง', 'ประวัติแพ้ยาจาก รพ. ต้นทาง'] as const;
export type ReferSectionTitle = (typeof REFER_SECTIONS)[number];
/** ชื่อช่อง → ค่าที่แสดง · ส่วนที่ไม่มีชื่อช่อง (ประวัติแพ้ยา) เก็บข้อความทั้งส่วนไว้ที่ key '' */
export type ReferSectionData = Record<string, string>;

/** 1 รายการใน GET /cortex-api/moph/refer-in — `linkedVisit` มีเมื่อเปิด Visit จากรายการนี้แล้ว */
export interface ReferInItem {
  referId: string;
  referOutNo: string;
  referDate: string;
  patientName: string;
  originHn: string;
  cid: string;
  originHospitalName: string;
  originHcode: string;
  status: 'deliver' | 'receive' | string;
  linkedVisit?: ErVisit | null;
}

/** รายละเอียด refer (GET …/refer-in/<referId>) และสำเนาที่เก็บไว้ตอนเปิด Visit (GET …/refer-in/by-vn/<VN> — มี snapshotAt) */
export interface ReferInDetail extends ReferInItem {
  originHospitalPhone: string;
  destinationHospitalName: string;
  departmentName: string;
  doctorName: string;
  doctorLicenseId: string;
  validityExpireDate: string;
  requestTypeName: string;
  reasonRefer: string;
  moreDetail: string;
  infectiveDisease: string;
  recordIllnessPast: string;
  recordIllnessPresent: string;
  testResults: string;
  initialDiagnosisFreeText: string;
  treatmentProvided: string;
  remark: string;
  vitalSign: Record<
    'systolicBp' | 'diastolicBp' | 'heartRate' | 'respiratoryRate' | 'temperature' | 'oxygenSaturation' | 'painScore' | 'eyeOpening' | 'verbalResponse' | 'motorResponse' | 'weight' | 'height' | 'entryDatetime',
    string
  >;
  allergies: Record<string, unknown>[];
  snapshotAt?: string;
}

/** SBH Prod ตอบ 5xx / ตัดการเชื่อมต่อเป็นพักๆ — GET อ่านอย่างเดียว ลองใหม่ได้ · คืน undefined เมื่อ API ตอบไม่ผ่านทุกรอบ (ข้อความล่าสุดอยู่ใน `problem`) */
async function getJson<T>(page: Page, authorization: string, path: string): Promise<{ data?: T; problem: string }> {
  let problem = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await page.request.get(path, { headers: { authorization }, timeout: 45_000 }).catch((error: Error) => error);
    if (res instanceof Error) problem = res.message.split('\n')[0];
    else if (res.ok()) return { data: (await res.json()) as T, problem: '' };
    else {
      problem = `${res.status()} ${(await res.text().catch(() => '')).slice(0, 200)}`;
      // 4xx ที่ไม่ใช่ token หลุดชั่วคราว = ลองใหม่ก็ได้ผลเดิม
      if (res.status() < 500 && res.status() !== 403) break;
    }
  }
  return { problem: `GET ${path} → ${problem}` };
}

/** รายการ "รับ Refer เข้า" ทั้งหมดที่ Cortex เห็น (อ่านอย่างเดียว) */
export async function fetchReferInList(page: Page, authorization: string): Promise<{ items?: ReferInItem[]; problem: string }> {
  const { data, problem } = await getJson<{ items: ReferInItem[] }>(page, authorization, `${REFER_IN_API}?page=1&perPage=100`);
  return { items: data?.items, problem };
}

/** รายละเอียด refer ล่าสุดจาก MOPH Refer (ผ่าน Cortex) */
export async function fetchReferDetail(page: Page, authorization: string, referId: string): Promise<ReferInDetail> {
  const { data, problem } = await getJson<ReferInDetail>(page, authorization, `${REFER_IN_API}/${encodeURIComponent(referId)}`);
  expect(data, problem).toBeTruthy();
  return data as ReferInDetail;
}

/** สำเนา refer ที่ผูกกับ Visit (ตัวเดียวกับที่แถบ MOPH Refer อ่าน) — Visit ที่ไม่ได้ผูก refer ได้ 404 */
export async function fetchReferSnapshot(page: Page, authorization: string, vn: string): Promise<ReferInDetail> {
  const { data, problem } = await getJson<ReferInDetail>(page, authorization, `${REFER_IN_API}/by-vn/${encodeURIComponent(vn)}`);
  expect(data, problem).toBeTruthy();
  return data as ReferInDetail;
}

interface BoardEncounter {
  en: string;
  latestStatusCode: string;
  triagedAt: string | null;
}

/** Encounter บนบอร์ด ER ตอนนี้ (รวมค้างข้ามวัน) — ใช้ดูว่า Visit ไหนยังอยู่ขั้น Triage */
export async function fetchBoardQueue(page: Page, authorization: string): Promise<BoardEncounter[]> {
  const { data, problem } = await getJson<BoardEncounter[]>(page, authorization, '/cortex-api/er/dashboard/encounters?scope=current_queue');
  expect(data, problem).toBeTruthy();
  return data ?? [];
}

/** เปิดหน้า รับ Refer เข้า (โหลดแอปใหม่) แล้วรอให้หน้ายิง API รายการเอง — คืนสถานะของ API นั้น (dev-x ได้ 502) */
export async function gotoReferInList(page: Page): Promise<number> {
  const loaded = waitForApi(page, 'GET', REFER_IN_API, 90_000);
  await page.goto(REFER_IN_PATH);
  return (await loaded).status();
}

/** แถวของ refer ในตาราง — อ้างด้วย HN ต้นทาง + วันที่ส่งตัว (ตารางไม่แสดงเลขที่ใบส่งตัว และผู้ป่วยคนเดียวมีได้หลายใบ) */
export function referInRow(page: Page, refer: Pick<ReferInItem, 'originHn' | 'referDate'>): Locator {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: refer.originHn, exact: true }) })
    .filter({ has: page.getByRole('cell', { name: refer.referDate, exact: true }) });
}

/** หน้าต่าง "รายละเอียดการส่งต่อ" (ปุ่ม ดูรายละเอียด) — มีปุ่ม "ยืนยันผู้ป่วยมาถึงแล้ว" ที่เขียนข้อมูล ห้ามกดในเทสอ่านอย่างเดียว */
export function referDetailDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'รายละเอียดการส่งต่อ' });
}

/** แถบ "MOPH Refer" ใต้ช่อง ข้อมูลก่อนถึงโรงพยาบาล ของหน้าผู้ป่วย ER (การ์ด SBH-2394) — Collapse ของ Ant Design พับอยู่ตอนเปิดหน้า */
export function mophReferSection(page: Page): Locator {
  return page.locator('[class*="er-moph-refer-section"]');
}

/** หัวแถบที่กดกาง / พับ (aria-expanded บอกสถานะ) */
export function mophReferHeader(page: Page): Locator {
  return mophReferSection(page).locator('.ant-collapse-header');
}

/** กล่องช่อง "ข้อมูลก่อนถึงโรงพยาบาล" (ป้าย + textarea) */
export function preHospitalInfo(page: Page): Locator {
  return page.locator('[class*="er-pre-hospital-info"]').first();
}

/** กล่องของส่วนข้อมูล 1 ส่วน (Descriptions ของ Ant Design) ใน `root` — ใช้ตีกรอบภาพหลักฐาน */
export function referSection(root: Locator, title: string): Locator {
  return root.locator('.ant-descriptions').filter({ has: root.page().locator('.ant-descriptions-title').getByText(title, { exact: true }) });
}

/** อ่านข้อมูลทุกส่วนที่มีหัวข้อใน `root` (แถบ MOPH Refer หรือหน้าต่างรายละเอียดการส่งต่อ) เป็น หัวข้อ → { ชื่อช่อง: ค่า } */
export async function readReferSections(root: Locator): Promise<Record<string, ReferSectionData>> {
  await expect(root.locator('.ant-skeleton')).toHaveCount(0);
  return root.evaluate((el) => {
    const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
    const sections: Record<string, Record<string, string>> = {};
    for (const block of el.querySelectorAll('.ant-descriptions')) {
      const title = clean(block.querySelector('.ant-descriptions-title')?.textContent);
      if (!title) continue;
      const fields: Record<string, string> = {};
      const labels = block.querySelectorAll('th.ant-descriptions-item-label');
      for (const label of labels) fields[clean(label.textContent)] = clean((label.nextElementSibling as HTMLElement | null)?.innerText);
      if (!labels.length) fields[''] = clean((block.querySelector('.ant-descriptions-view') as HTMLElement | null)?.innerText);
      sections[title] = fields;
    }
    return sections;
  });
}

/** ค่าที่หน้าจอควรแสดงตามข้อมูล refer จาก API — เฉพาะช่องที่แสดงค่าตรงตัว (ช่องที่แปลงรหัสเป็นข้อความ เช่น ประเภทผู้ป่วย / ความเร่งด่วน ไม่รวม) · ค่าว่างแสดง "-" */
export function expectedReferFields(refer: ReferInDetail): Record<Exclude<ReferSectionTitle, 'ประวัติแพ้ยาจาก รพ. ต้นทาง'>, ReferSectionData> {
  const show = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim() || '-';
  const vital = refer.vitalSign;
  return {
    ข้อมูลการส่งต่อ: {
      เลขที่ใบส่งตัว: show(refer.referOutNo),
      วันที่ส่งตัว: show(refer.referDate),
      โรงพยาบาลต้นทาง: show(refer.originHospitalName),
      'เบอร์โทร รพ. ต้นทาง': show(refer.originHospitalPhone),
      โรงพยาบาลปลายทาง: show(refer.destinationHospitalName),
      แผนกต้นทาง: show(refer.departmentName),
      แพทย์ผู้ส่งต่อ: show(refer.doctorName),
      เลขที่ใบประกอบวิชาชีพ: show(refer.doctorLicenseId),
      บริการที่ขอรับ: show(refer.requestTypeName),
      เหตุผลการส่งต่อ: show(refer.reasonRefer),
    },
    ข้อมูลทางคลินิก: {
      ประวัติการเจ็บป่วยปัจจุบัน: show(refer.recordIllnessPresent),
      ประวัติการเจ็บป่วยในอดีต: show(refer.recordIllnessPast),
      ผลตรวจที่ทำมาแล้ว: show(refer.testResults),
      การวินิจฉัยเบื้องต้น: show(refer.initialDiagnosisFreeText),
      การรักษาที่ให้มาแล้ว: show(refer.treatmentProvided),
      โรคติดต่อ: show(refer.infectiveDisease),
      รายละเอียดเพิ่มเติม: show(refer.moreDetail),
      หมายเหตุ: show(refer.remark),
    },
    'สัญญาณชีพจาก รพ. ต้นทาง': {
      ความดันโลหิต: `${vital.systolicBp}/${vital.diastolicBp}`,
      ชีพจร: show(vital.heartRate),
      อัตราการหายใจ: show(vital.respiratoryRate),
      อุณหภูมิ: show(vital.temperature),
      ออกซิเจนในเลือด: show(vital.oxygenSaturation),
      ระดับความปวด: show(vital.painScore),
      'ระดับความรู้สึกตัว (GCS)': `E${vital.eyeOpening} V${vital.verbalResponse} M${vital.motorResponse}`,
      น้ำหนัก: show(vital.weight),
      ส่วนสูง: show(vital.height),
      บันทึกเมื่อ: show(vital.entryDatetime),
    },
  };
}
