import type { Locator, Page, Response } from '@playwright/test';
import { checkInFromOpdList, opdListRow, selectOpdUnit } from '../../../helpers/functions/opd-activity';
import { trackAuthorization } from '../../../helpers/functions/er-report';
import { alerted, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { restartVideo, startClip } from '../../../helpers/functions/fixtures';
import { expectPatientInfo, openNewVisitPanel } from '../../../helpers/functions/reception';
import { expect, test } from '../../../mock-data/fixtures';
import { confirmOrderAlert, openOpdVisit, orderAlert } from '../../../mock-data/uat-er';
import { envName } from '../../../utils/env';

// การ์ดบั๊ก SBH-2529 [OPD][order set] Refactor Order set — แยก Order Set (ชุดคำสั่ง) ออกจาก Package (ราคา)
// เดิมสร้าง / แก้ไข Order Set แล้วได้ ErrPriceModificationNotPermitted · ตัวแก้ cortex-ui #2511 · cortex-x #8862 · cortex-api #2909
// ไม่มี Sub-Issue / TC → ผู้ใช้สั่ง 3 ข้อ (2 พ.ย. 2026) แล้วลงผลเป็น Comment (R45) · 1 เทส = 1 flow · คลิป 1 ไฟล์ต่อข้อ (R61)
//   ข้อ 1 Create New Order Set (ยา · LAB · IMAGING · ACTIVITY) — ผู้ใช้เลือก "My + Clinic สร้าง + แก้ไข" · ยาผสม (Drug Compound) "ข้าม"
//   ข้อ 2 Create New Package
//   ข้อ 3 สั่งได้ที่หน้า Order (Order Set + Package)
// ข้อมูลที่สร้างทิ้งไว้ Active (ผู้ใช้เลือก) · ยาใช้ med0000005–8 เท่านั้น (R25) · ผู้ป่วย = AUTO รายเดิมที่ไม่มี Encounter / Admission ค้าง
//   (ฟอร์มผู้ป่วยใหม่ของเวชระเบียนบน dev-x กดบันทึกแล้วไม่ส่งคำสั่งสร้าง — กับดักเดียวกับ SBH-2236)
// หัตถการเลือกในฟอร์ม Order Set ได้ แต่ไม่มีฟอร์ม / ปุ่ม "เพิ่มลง Basket" (สำรวจ 2 พ.ย. 2026) → ขั้นนั้นเป็น soft step เก็บหลักฐานตามจริง
// รัน dev-x: npx playwright test --headed --grep @SBH-2529 --output=<โฟลเดอร์นอก OneDrive>
// ทำต่อกับผู้ป่วยเดิม: SBH2529_P=<HN>,<VN>,<EN> · ข้ามข้อ: SBH2529_SKIP=1,2 (ใช้ชุดที่สร้างแล้ว: SBH2529_STAMP=<เลขต่อท้าย>)

const SYSTEM = envName() ?? 'dev-x';
const PAD = (n: number) => String(n).padStart(2, '0');
const bkk = new Date(Date.now() + 7 * 3_600_000);
const STAMP = process.env.SBH2529_STAMP ?? `${String(bkk.getUTCFullYear()).slice(2)}${PAD(bkk.getUTCMonth() + 1)}${PAD(bkk.getUTCDate())}${PAD(bkk.getUTCHours())}${PAD(bkk.getUTCMinutes())}`;
const SKIP = (process.env.SBH2529_SKIP ?? '').split(',').filter(Boolean);

type ItemType = 'ยา' | 'Lab' | 'รังสี' | 'หัตถการ';
interface Item { type: ItemType; code: string; label: string; usage?: string }
const MED5: Item = { type: 'ยา', code: 'med0000005', label: 'BETAMED SOLUTION', usage: 'ทาแผลวันละ 2 ครั้ง เช้า เย็น' };
const MED7: Item = { type: 'ยา', code: 'med0000007', label: 'med0000007', usage: 'ใช้ตามแพทย์สั่ง วันละ 1 ครั้ง' };
const CBC: Item = { type: 'Lab', code: '1446_1', label: 'CBC' };
const CHEST: Item = { type: 'รังสี', code: 'SBHIMG1', label: 'CHEST (41003)' };
const CHEST_R: Item = { type: 'รังสี', code: 'SBHIMG3', label: 'CHEST (RIGHT LATERAL)' };
const ACT: Item = { type: 'หัตถการ', code: 'SBHACT72', label: 'Ablation' };
const PKG_ITEMS = [{ code: 'med0000006', label: 'med0000006' }, { code: 'SBHLAB5', label: 'SBHLAB5' }];

const MY = { code: `AUTO2529-MY-${STAMP}`, th: `ทดสอบ SBH-2529 My Order Set ${STAMP}`, en: `Test SBH-2529 My Order Set ${STAMP}` };
const CLINIC = { code: `AUTO2529-CL-${STAMP}`, th: `ทดสอบ SBH-2529 Clinic Order Set ${STAMP}`, en: `Test SBH-2529 Clinic Order Set ${STAMP}` };
const PKG = { code: `AUTO2529-PK-${STAMP}`, th: `ทดสอบ SBH-2529 แพ็กเกจ ${STAMP}`, en: `Test SBH-2529 Package ${STAMP}` };
const EDITED = ' (แก้ไข)';

const opts = (page: Page) => page.locator('.ant-select-dropdown:visible .ant-select-item-option');
const visibleModal = (page: Page) => page.locator('.ant-modal-wrap:visible .ant-modal').last();

/** response ของ API ที่เขียน (POST / PUT) ตาม path */
const writeResponse = (page: Page, path: RegExp, method: 'POST' | 'PUT') =>
  page.waitForResponse((r) => path.test(new URL(r.url()).pathname) && r.request().method() === method, { timeout: 60_000 });

async function expectSaved(res: Response, what: string) {
  const text = await res.text().catch(() => '');
  test.info().attach(`${what} (${res.request().method()} ${res.status()})`, { body: text.slice(0, 20_000), contentType: 'application/json' });
  expect(text, `${what}: ต้องไม่ได้ ErrPriceModificationNotPermitted`).not.toContain('ErrPriceModificationNotPermitted');
  expect(res.status(), `${what}: ${res.status()} ${text.slice(0, 300)}`).toBeLessThan(300);
  return text;
}

/** ฟอร์มสร้าง / แก้ไข Order Set: เลือกประเภท → ค้นรหัส → เลือก → (ยา: กรอกวิธีใช้ + จำนวน) → เพิ่มลง Basket */
async function addOrderSetItem(page: Page, modal: Locator, item: Item) {
  await modal.locator('.ant-select').first().click();
  await page.locator('.ant-select-dropdown:visible').getByText(item.type, { exact: true }).click();
  const box = modal.getByPlaceholder(/ค้นหา ยา/);
  await box.fill(item.code);
  const option = opts(page).filter({ hasText: `[${item.code}]` }).first();
  await expect(option, `ต้องค้นเจอ ${item.code}`).toBeVisible({ timeout: 30_000 });
  await option.click();
  const add = modal.getByRole('button', { name: /เพิ่มลง Basket/ });
  if (item.type === 'ยา') {
    await modal.getByPlaceholder(/กินครั้งละ/).fill(item.usage ?? 'ใช้ตามแพทย์สั่ง');
    await modal.locator('#dispenseQuantity').fill('1');
    // หน่วยจ่ายมีค่าตั้งต้นจากยา (BOT) — เลือกเองเฉพาะเมื่อว่าง (class ของค่าที่เลือกต่างตามรุ่น antd → ดูจากข้อความ)
    const unit = modal.locator('.ant-select:has(#dispenseUnit)').first();
    if (!(await unit.innerText({ timeout: 5_000 }).catch(() => 'ไม่พบช่อง')).trim()) {
      await unit.click();
      await opts(page).first().click();
    }
  }
  await expect(add, `เลือก ${item.code} แล้วต้องมีปุ่ม "เพิ่มลง Basket"`).toBeVisible({ timeout: 15_000 });
  return { box, add };
}

/** แถวของรายการใน Basket ของฟอร์ม Order Set (ตารางแยกตามประเภท) */
const basketRow = (modal: Locator, text: string) => modal.locator('tr.ant-table-row').filter({ hasText: text }).first();

/** ผู้ป่วย AUTO ที่จบงานแล้ว ไม่มี Encounter / Admission ค้าง (จากรายการ ER ย้อนหลัง 7 วัน) */
async function pickIdleAutoPatient(page: Page, authorization: () => string, exclude: string[]): Promise<{ hn: string; name: string }> {
  const get = async <T,>(url: string): Promise<T> => {
    const res = await page.request.get(url, { headers: { authorization: authorization() } });
    expect(res.ok(), `GET ${url} → ${res.status()}`).toBe(true);
    return (await res.json()) as T;
  };
  const done = ['completed', 'cancelled', 'entered-in-error'];
  for (let back = 1; back <= 7; back++) {
    const day = new Date(Date.now() + 7 * 3_600_000 - back * 86_400_000).toISOString().slice(0, 10);
    const list = await get<{ hn: string; patientStatus: string; patient?: { firstName?: string; familyName?: string } }[]>(`/cortex-api/er/dashboard/encounters?date=${day}`);
    const candidates = [...new Map(list.filter((e) => e.patientStatus === 'finished' && e.patient?.firstName === 'AUTO' && !exclude.includes(e.hn)).map((e) => [e.hn, e])).values()];
    for (const e of candidates.slice(0, 15)) {
      const enc = await get<{ data: { latestStatusCode: string }[] }>(`/generated-emr-api/encounters?filter[hn][equals]=${e.hn}&perPage=1000`);
      const adm = await get<{ data: { latestStatusCode: string }[] }>(`/generated-emr-api/admissions?filter[hn][equals]=${e.hn}&perPage=1000`);
      if ([...enc.data, ...adm.data].every((x) => done.includes(x.latestStatusCode))) return { hn: e.hn, name: `${e.patient?.firstName} ${e.patient?.familyName}` };
    }
  }
  throw new Error('ไม่เจอผู้ป่วย AUTO ที่ไม่มีงานค้างใน 7 วันย้อนหลัง');
}

interface SavedOrderSet { id: number; code: string; name: string; isPublic: boolean; medicationRequests: { productId: number; product?: { code: string } }[]; labRequests: { productId: number; product?: { code: string } }[]; imagingRequests: { productId: number; product?: { code: string } }[]; activityRequests: { productId: number; product?: { code: string } }[] }

async function fetchOrderSet(page: Page, authorization: () => string, code: string, isPublic: boolean): Promise<SavedOrderSet | undefined> {
  const res = await page.request.get(`/emr-api/order-sets?isPublic=${isPublic}&page=1&perPage=200`, { headers: { authorization: authorization() } });
  const body = (await res.json()) as { data: SavedOrderSet[] };
  return body.data.find((o) => o.code === code);
}

/** ตารางเทียบ: รายการที่ใส่ในฟอร์ม vs ที่บันทึกใน Order Set (API) */
function orderSetRows(saved: SavedOrderSet | undefined, items: Item[]): CompareRow[] {
  const codes = (list: { productId: number; product?: { code: string } }[] = []) => list.map((x) => x.product?.code ?? String(x.productId));
  const savedCodes = saved ? [...codes(saved.medicationRequests), ...codes(saved.labRequests), ...codes(saved.imagingRequests), ...codes(saved.activityRequests)] : [];
  return items.map((i) => ({ label: `${i.type} ${i.label}`, values: [i.code, savedCodes.includes(i.code) ? i.code : 'ไม่พบ'], same: savedCodes.includes(i.code) }));
}

test.describe(`SBH-2529 Order Set แยกจาก Package — สร้าง / แก้ไข / สั่งที่หน้า Order (${SYSTEM})`, () => {
  test.describe.configure({ timeout: 1_200_000 });
  test.skip(SYSTEM !== 'dev-x', 'การ์ดนี้รันบน dev-x เท่านั้น (ผู้ใช้สั่ง 2 พ.ย. 2026)');

  test('Order Set (My + Clinic) · Package · สั่งที่หน้า Order (Super_User)', { tag: ['@SBH-2529'], annotation: [{ type: 'issue', description: 'https://linear.app/cortexcloud/issue/SBH-2529' }] }, async ({ page }) => {
    const authorization = trackAuthorization(page);
    const { soft, finish, note } = makeRunner(page);
    const main = page.getByRole('main');
    note('ชุดข้อมูล', `Order Set ${MY.code} / ${CLINIC.code} · Package ${PKG.code}`);

    // ═════════ ข้อ 1 Order Set ═════════
    // อยู่หน้าตั้งค่า Order Set อยู่แล้วไม่โหลดหน้าใหม่ (dev-x โหลดหน้านี้ 8–25 วิ = จอ spinner ในคลิป) — สลับเมนู My / Clinic ทางซ้ายแทน
    const orderSetPage = async (tab: 'My Order Set' | 'Clinic Order Set') => {
      if (!/\/setting\/admin\/order-set/.test(page.url())) {
        await page.goto('/cortex/setting/admin/order-set');
        await expect(page.getByRole('button', { name: 'สร้าง My Order Set' })).toBeVisible({ timeout: 90_000 });
      }
      await page.getByText(tab, { exact: true }).first().click();
      await expect(page.getByRole('button', { name: `สร้าง ${tab}` })).toBeVisible({ timeout: 30_000 });
      await page.locator('tr.ant-table-row').first().waitFor({ timeout: 60_000 });
    };
    /** toast "…สำเร็จ" ที่ขึ้นหลังกดบันทึก — ตีกรอบ + ถ่ายทันทีก่อนหาย (ตีกรอบ toast ที่กำลังหายแล้วกรอบไปล้อมที่ว่าง) */
    const snapSuccessToast = async (name: string) => {
      const t = page.locator('.ant-message-notice, .ant-notification-notice').filter({ visible: true }).filter({ hasText: /สำเร็จ/ }).last();
      if (!(await t.waitFor({ timeout: 4_000 }).then(() => true, () => false))) return;
      await markEvidence(alerted(t, (await t.innerText()).trim())).catch(() => undefined);
      await snapEvidence(page, `หลังกด — ${name}`);
    };
    const listRow = (name: string) => page.locator('tr.ant-table-row').filter({ hasText: name }).first();

    const createOrderSet = async (tab: 'My Order Set' | 'Clinic Order Set', set: typeof MY, items: Item[], tryActivity: boolean) => {
      const isPublic = tab === 'Clinic Order Set';
      await soft(`ข้อ 1 ${tab} ขั้น 1 กด "สร้าง ${tab}" กรอกรหัส / ชื่อ`, async () => {
        await orderSetPage(tab);
        const btn = page.getByRole('button', { name: `สร้าง ${tab}` });
        await markEvidence(clicked(btn, `สร้าง ${tab}`));
        await snapEvidence(page, `ก่อนกด — สร้าง ${tab}`);
        await btn.click();
        const modal = visibleModal(page);
        await expect(modal.getByText('สร้าง Order Set').first()).toBeVisible();
        await modal.locator('#code').fill(set.code);
        await modal.locator('#thName').fill(set.th);
        await modal.locator('#enName').fill(set.en);
        await markEvidence(filled(modal.locator('#code')), filled(modal.locator('#thName')), filled(modal.locator('#enName')));
      });
      const modal = visibleModal(page);
      for (const item of items) {
        await soft(`ข้อ 1 ${tab} ขั้น 2 เพิ่ม${item.type} ${item.code} ลง Basket`, async () => {
          const { box, add } = await addOrderSetItem(page, modal, item);
          await markEvidence(filled(box, `${item.type} ${item.code}`), clicked(add, 'เพิ่มลง Basket'));
          await snapEvidence(page, `ก่อนกด — เพิ่ม ${item.code}`);
          await add.click();
          const row = basketRow(modal, item.type === 'ยา' ? (item.usage ?? item.code) : item.label);
          await expect(row, `${item.code} ต้องขึ้นในตาราง Basket ของฟอร์ม`).toBeVisible({ timeout: 15_000 });
          await markEvidence(expected(row, `${item.type} ${item.code} อยู่ใน Basket`));
        });
      }
      if (tryActivity) {
        await soft(`ข้อ 1 ${tab} ขั้น 3 เพิ่มหัตถการ ${ACT.code} ลง Basket`, async () => {
          await modal.locator('.ant-select').first().click();
          await page.locator('.ant-select-dropdown:visible').getByText('หัตถการ', { exact: true }).click();
          const box = modal.getByPlaceholder(/ค้นหา ยา/);
          await box.fill(ACT.code);
          const option = opts(page).filter({ hasText: `[${ACT.code}]` }).first();
          await expect(option, `ต้องค้นเจอ ${ACT.code}`).toBeVisible({ timeout: 30_000 });
          await option.click();
          await page.waitForTimeout(5_000);
          const add = modal.getByRole('button', { name: /เพิ่มลง Basket/ });
          const shown = await add.isVisible();
          await showCompareTable(page, `เลือกหัตถการ ${ACT.code} ในฟอร์ม Order Set`, ['ต้องการ', 'จริง'], [
            { label: 'ฟอร์มรายละเอียดใต้ช่องค้นหา', values: ['มี (แบบเดียวกับยา / Lab / รังสี)', shown ? 'มี' : 'ไม่มี'], same: shown },
            { label: 'ปุ่ม "เพิ่มลง Basket"', values: ['มี', shown ? 'มี' : 'ไม่มี'], same: shown },
          ], { side: 'bottom' });
          await markEvidence(expected(box, shown ? 'มีปุ่มเพิ่มลง Basket' : 'ฟอร์ม + ปุ่มเพิ่มลง Basket ใต้ช่องนี้ · จริง: ไม่มี'));
          await holdForClip(page, 2_000);
          expect(shown, `เลือกหัตถการ ${ACT.code} แล้วไม่มีฟอร์ม / ปุ่ม "เพิ่มลง Basket" (เพิ่มหัตถการลง Order Set ไม่ได้)`).toBe(true);
          await add.click();
          await expect(basketRow(modal, ACT.label)).toBeVisible({ timeout: 15_000 });
        });
        await hideCompareTable(page);
      }
      let saved: SavedOrderSet | undefined;
      await soft(`ข้อ 1 ${tab} ขั้น 4 กด "สร้าง" → บันทึกได้ ไม่ขึ้น ErrPriceModificationNotPermitted`, async () => {
        const create = modal.locator('.ant-modal-footer').getByRole('button', { name: 'สร้าง', exact: true });
        await modal.locator('.ant-modal-body').evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
        await markEvidence(clicked(create, 'สร้าง'));
        await snapEvidence(page, `ก่อนกด — สร้าง ${set.code}`);
        const res = writeResponse(page, /\/emr-api\/order-sets$/, 'POST');
        await create.click();
        await expectSaved(await res, `สร้าง ${tab}`);
        await snapSuccessToast(`สร้าง ${set.code}`);
        await expect(modal).toBeHidden({ timeout: 15_000 });
        const row = listRow(set.th);
        await expect(row, `ชุด ${set.th} ต้องขึ้นในรายการ ${tab}`).toBeVisible({ timeout: 30_000 });
        saved = await fetchOrderSet(page, authorization, set.code, isPublic);
        expect(saved, `API ต้องพบ Order Set ${set.code} (isPublic=${isPublic})`).toBeTruthy();
        const rows = orderSetRows(saved, items);
        await showCompareTable(page, `${set.code} — รายการที่บันทึก (emr-api/order-sets)`, ['ที่ใส่ในฟอร์ม', 'บันทึกใน Order Set'], rows, { side: 'bottom' });
        await markEvidence(expected(row, `สร้าง ${tab} สำเร็จ`));
        await holdForClip(page, 2_000);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'ทุกรายการต้องถูกบันทึก').toEqual([]);
      });
      await hideCompareTable(page);
      return saved;
    };

    const editOrderSet = async (tab: 'My Order Set' | 'Clinic Order Set', set: typeof MY, addItem: Item | null, items: Item[]) => {
      const isPublic = tab === 'Clinic Order Set';
      await soft(`ข้อ 1 ${tab} ขั้น 5 แก้ไข: เปลี่ยนชื่อ${addItem ? ` + เพิ่ม${addItem.type} ${addItem.code}` : ''} → บันทึก`, async () => {
        await orderSetPage(tab);
        const row = listRow(set.th);
        const edit = row.getByText('แก้ไข', { exact: true });
        await markEvidence(expected(row, set.code), clicked(edit, 'แก้ไข'));
        await snapEvidence(page, `ก่อนกด — แก้ไข ${set.code}`);
        await edit.click();
        const modal = visibleModal(page);
        await expect(modal.locator('#thName')).toHaveValue(set.th, { timeout: 30_000 });
        await modal.locator('#thName').fill(set.th + EDITED);
        await markEvidence(filled(modal.locator('#thName'), 'ชื่อใหม่'));
        await snapEvidence(page, `กรอก — ชื่อใหม่ ${set.code}`);
        if (addItem) {
          const { box, add } = await addOrderSetItem(page, modal, addItem);
          await markEvidence(filled(box, `${addItem.type} ${addItem.code}`), clicked(add, 'เพิ่มลง Basket'));
          await snapEvidence(page, `ก่อนกด — เพิ่ม ${addItem.code} (แก้ไข)`);
          await add.click();
          await expect(basketRow(modal, addItem.label)).toBeVisible({ timeout: 15_000 });
        }
        const save = modal.locator('.ant-modal-footer .ant-btn-primary');
        await modal.locator('.ant-modal-body').evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
        await markEvidence(clicked(save, (await save.innerText()).trim()));
        await snapEvidence(page, `ก่อนกด — บันทึกการแก้ไข ${set.code}`);
        const res = writeResponse(page, /\/emr-api\/order-sets\/\d+$/, 'PUT');
        await save.click();
        await expectSaved(await res, `แก้ไข ${tab}`);
        await snapSuccessToast(`แก้ไข ${set.code}`);
        await expect(modal).toBeHidden({ timeout: 15_000 });
        const newRow = listRow(set.th + EDITED);
        await expect(newRow, `ชื่อใหม่ต้องขึ้นในรายการ`).toBeVisible({ timeout: 30_000 });
        const saved = await fetchOrderSet(page, authorization, set.code, isPublic);
        const all = addItem ? [...items, addItem] : items;
        const rows: CompareRow[] = [{ label: 'ชื่อภาษาไทย', values: [set.th + EDITED, saved?.name ?? 'ไม่พบ'], same: saved?.name === set.th + EDITED }, ...orderSetRows(saved, all)];
        await showCompareTable(page, `${set.code} หลังแก้ไข (emr-api/order-sets)`, ['ที่แก้ในฟอร์ม', 'บันทึกใน Order Set'], rows, { side: 'bottom' });
        await markEvidence(expected(newRow, 'แก้ไขสำเร็จ ชื่อใหม่'));
        await holdForClip(page, 2_000);
        expect(rows.filter((r) => !r.same).map((r) => r.label), 'ค่าหลังแก้ไขต้องถูกบันทึก').toEqual([]);
      });
      await hideCompareTable(page);
    };

    if (!SKIP.includes('1')) {
      await page.goto('/cortex/setting/admin/order-set');
      await expect(page.getByRole('button', { name: 'สร้าง My Order Set' })).toBeVisible({ timeout: 90_000 });
      await startClip(page, 'item1-orderset');
      await createOrderSet('My Order Set', MY, [MED5, CBC], true);
      await editOrderSet('My Order Set', MY, CHEST, [MED5, CBC]);
      await createOrderSet('Clinic Order Set', CLINIC, [MED7, CHEST_R], false);
      await editOrderSet('Clinic Order Set', CLINIC, null, [MED7, CHEST_R]);
    }

    // ═════════ ข้อ 2 Package ═════════
    if (!SKIP.includes('2')) {
      await page.goto('/cortex/setting/admin/product-packages');
      const createPkg = page.getByRole('button', { name: /สร้างแพ็กเกจ/ });
      await expect(createPkg).toBeVisible({ timeout: 150_000 });
      await page.locator('tr.ant-table-row').first().waitFor({ timeout: 60_000 }).catch(() => undefined);
      await startClip(page, 'item2-package');
      await soft('ข้อ 2 ขั้น 1 กด "สร้างแพ็กเกจ" กรอกรหัส / ประเภทบริการ OPD / ชื่อ', async () => {
        await markEvidence(clicked(createPkg, 'สร้างแพ็กเกจ'));
        await snapEvidence(page, 'ก่อนกด — สร้างแพ็กเกจ');
        await createPkg.click();
        const pm = visibleModal(page);
        await expect(pm.getByText('สร้างแพ็กเกจ').first()).toBeVisible();
        await pm.locator('#code').fill(PKG.code);
        await pm.locator('#thName').fill(PKG.th);
        await pm.locator('#enName').fill(PKG.en);
        await expect(pm.locator('.ant-form-item').filter({ hasText: 'ประเภทบริการ' }).locator('.ant-select')).toContainText('OPD');
        await markEvidence(filled(pm.locator('#code')), filled(pm.locator('#thName')), filled(pm.locator('#enName')), expected(pm.locator('.ant-form-item').filter({ hasText: 'ประเภทบริการ' }).locator('.ant-select'), 'OPD'));
      });
      const pm = visibleModal(page);
      for (const it of PKG_ITEMS) {
        await soft(`ข้อ 2 ขั้น 2 เพิ่มรายการ ${it.code} ในแพ็กเกจ`, async () => {
          const s = pm.getByPlaceholder(/ค้นหารหัสหรือชื่อสินค้า/);
          await s.fill(it.code);
          const option = opts(page).first();
          await expect(option, `ต้องค้นเจอ ${it.code}`).toBeVisible({ timeout: 30_000 });
          const label = (await option.innerText()).split('\n')[0].trim();
          await option.click();
          const add = pm.getByRole('button', { name: /เพิ่มรายการ/ });
          await markEvidence(filled(s, it.code), clicked(add, 'เพิ่มรายการ'));
          await snapEvidence(page, `ก่อนกด — เพิ่มรายการ ${it.code}`);
          await add.click();
          const row = pm.locator('tr').filter({ hasText: label.slice(0, 25) }).first();
          await expect(row, `${it.code} ต้องขึ้นในรายการในแพ็กเกจ`).toBeVisible({ timeout: 15_000 });
          it.label = label;
          await markEvidence(expected(row.locator('td').first(), `${it.code} อยู่ในแพ็กเกจ`));
        });
      }
      await soft('ข้อ 2 ขั้น 3 กด "บันทึก" → สร้างแพ็กเกจได้ ขึ้นในรายการ', async () => {
        const save = pm.getByRole('button', { name: 'บันทึก', exact: true });
        const total = pm.locator('div').filter({ hasText: /^ราคารวม/ }).last();
        await markEvidence(expected(total, 'ราคารวม'), clicked(save, 'บันทึก'));
        await snapEvidence(page, 'ก่อนกด — บันทึกแพ็กเกจ');
        const res = writeResponse(page, /\/cortex-api\/admin\/product-packages$/, 'POST');
        await save.click();
        await expectSaved(await res, 'สร้างแพ็กเกจ');
        await snapSuccessToast('บันทึกแพ็กเกจ');
        await expect(pm).toBeHidden({ timeout: 15_000 });
        const search = main.getByPlaceholder('รหัส', { exact: true });
        if (await search.isVisible().catch(() => false)) {
          await search.fill(PKG.code);
          await search.press('Enter');
        }
        const row = page.locator('tr.ant-table-row').filter({ hasText: PKG.code }).first();
        await expect(row, `แพ็กเกจ ${PKG.code} ต้องขึ้นในรายการ`).toBeVisible({ timeout: 30_000 });
        await markEvidence(expected(row, 'สร้างแพ็กเกจสำเร็จ'));
        await holdForClip(page, 2_000);
      });
    }

    // ═════════ ข้อ 3 สั่งที่หน้า Order ═════════
    let [hn, vn, en] = (process.env.SBH2529_P ?? '').split(',');
    // ช่วงเตรียมผู้ป่วยไม่ใช่หลักฐานของข้อใด — ตัดออกจากคลิปข้อ 2 (Sub Agent พบจอโหลด ~70% ของคลิปข้อ 2 รอบ 2 พ.ย.)
    await startClip(page, 'item3-prep');
    const ready = await soft('ข้อ 3 ขั้น 0 เตรียมผู้ป่วย AUTO: เปิด Visit OPD + เช็คอิน', async () => {
      if (hn) {
        note('ผู้ป่วย', `ใช้ผู้ป่วยเดิม HN ${hn} · ${vn} · ${en}`);
        // เปิด Visit แล้วแต่ยังไม่เช็คอิน (รอบก่อนรายการผู้ป่วยนอกโหลดช้าจนหมดเวลา) → SBH2529_CHECKIN=1
        if (process.env.SBH2529_CHECKIN) {
          await selectOpdUnit(page);
          await checkInFromOpdList(page, await opdListRow(page, hn, { anyDoctor: true }));
        }
        return;
      }
      await page.goto('/cortex/apps');
      await page.waitForTimeout(3_000);
      const p = await pickIdleAutoPatient(page, authorization, ['6932450', '6932449', '6932441', '6932440']);
      hn = p.hn;
      await page.goto(`/cortex/next/patients/${hn}?views=patientInfo`);
      if (await expectPatientInfo(page)) await openNewVisitPanel(page);
      const opd = await openOpdVisit(page, { anyDoctor: true });
      vn = opd.vn;
      en = opd.en;
      await selectOpdUnit(page);
      await checkInFromOpdList(page, await opdListRow(page, hn, { anyDoctor: true }));
      note('ผู้ป่วย', `${p.name} · HN ${hn} · ${vn} · EN ${en} · ${opd.clinic} · ${opd.doctor}`);
      console.log(`    ทำต่อ: SBH2529_P=${hn},${vn},${en}`);
    });
    if (ready) {
      await page.goto(`/cortex/next/patients/${hn}?en=${en}&vn=${vn}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await expect(main.getByText(`VN ${vn}`, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
      const osBtn = main.getByRole('button', { name: /Order Set/ }).first();
      await expect(osBtn).toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(3_000);
      await restartVideo(page);
      await startClip(page, 'item3-order');
      const cart = () => main.locator('tr.ant-table-row').filter({ visible: true });

      const applySet = async (tab: 'My Order Set' | 'Public Order Set', name: string, codes: string[]) => {
        await soft(`ข้อ 3 Order Set (${tab}) เลือก "${name}" → ยืนยัน → รายการเข้าตะกร้า`, async () => {
          await markEvidence(clicked(osBtn, 'Order Set'));
          await snapEvidence(page, `ก่อนกด — Order Set (${tab})`);
          await osBtn.click();
          const dlg = visibleModal(page);
          await dlg.getByRole('tab', { name: tab }).click();
          const setBtn = dlg.getByRole('button', { name, exact: true });
          await expect(setBtn, `${tab} ต้องมีชุด "${name}"`).toBeVisible({ timeout: 30_000 });
          await setBtn.click();
          const confirm = dlg.getByRole('button', { name: /^ยืนยัน \(\d+\)$/ });
          await expect(confirm).not.toHaveText('ยืนยัน (0)', { timeout: 15_000 });
          await markEvidence(expected(setBtn, tab), expected(dlg.locator('.ant-table').first(), 'รายการในชุด'), clicked(confirm));
          await snapEvidence(page, `ก่อนกด — ยืนยัน Order Set ${name.slice(-12)}`);
          await confirm.click();
          if (await orderAlert(page).waitFor({ state: 'visible', timeout: 6_000 }).then(() => true, () => false)) await confirmOrderAlert(page);
          await expect(dlg).toBeHidden({ timeout: 30_000 });
          for (const c of codes) await expect(cart().filter({ hasText: `[${c}]` }).first(), `${c} ต้องเข้าตะกร้า`).toBeVisible({ timeout: 60_000 });
          await markEvidence(...codes.map((c) => expected(cart().filter({ hasText: `[${c}]` }).first().locator('td').filter({ hasText: `[${c}]` }).first(), `${c} เข้าตะกร้า`)));
          await holdForClip(page, 1_500);
        });
      };
      await applySet('My Order Set', MY.th + EDITED, [MED5.code, CBC.code, CHEST.code]);
      await applySet('Public Order Set', CLINIC.th + EDITED, [MED7.code, CHEST_R.code]);

      await soft(`ข้อ 3 ค้นหาประเภท "แพ็กเกจ" ${PKG.code} → เลือก → รายการในแพ็กเกจเข้าตะกร้า`, async () => {
        await main.locator('.ant-select').filter({ hasText: /^ทั้งหมด$/ }).first().click();
        await opts(page).filter({ hasText: /^แพ็กเกจ$/ }).click();
        const search = page.getByRole('combobox', { name: /ค้นหา ยา/ });
        await search.fill(PKG.code);
        const option = opts(page).filter({ hasText: `[${PKG.code}]` }).first();
        await expect(option, `ต้องค้นเจอแพ็กเกจ ${PKG.code}`).toBeVisible({ timeout: 30_000 });
        await markEvidence(filled(search, PKG.code), clicked(option, 'แพ็กเกจที่สร้าง'));
        await snapEvidence(page, 'ก่อนกด — เลือกแพ็กเกจ');
        // เลือกแพ็กเกจแล้วระบบเพิ่มลงตะกร้าเองทันที (UpsertOpdOrder) — ไม่มีปุ่มเพิ่มลงตะกร้า
        const upsert = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /UpsertOpdOrder/.test(r.request().postData() ?? ''), { timeout: 30_000 }).catch(() => null);
        await option.click();
        const res = await upsert;
        const body = res ? ((await res.json().catch(() => ({}))) as { errors?: { message: string }[] }) : null;
        if (body) await test.info().attach('UpsertOpdOrder (เลือกแพ็กเกจ)', { body: JSON.stringify(body, null, 2), contentType: 'application/json' });
        if (await orderAlert(page).waitFor({ state: 'visible', timeout: 6_000 }).then(() => true, () => false)) await confirmOrderAlert(page);
        await page.waitForTimeout(5_000);
        const err = body?.errors?.map((e) => e.message).join(' · ') ?? (res ? '' : 'ไม่มีคำสั่ง UpsertOpdOrder');
        const rows: CompareRow[] = [
          { label: 'UpsertOpdOrder (เพิ่มลงตะกร้า)', values: ['สำเร็จ', err ? `error: ${err.slice(0, 150)}` : 'สำเร็จ'], same: !err },
          ...PKG_ITEMS.map((it) => ({ label: `${it.code} ในตะกร้า`, values: ['มี', 'ตรวจด้านล่าง'], same: true })),
        ];
        for (const [i, it] of PKG_ITEMS.entries()) {
          const has = await cart().filter({ hasText: `[${it.code}]` }).first().isVisible().catch(() => false);
          rows[i + 1] = { label: `${it.code} ในตะกร้า`, values: ['มี', has ? 'มี' : 'ไม่มี'], same: has };
        }
        await showCompareTable(page, `เลือกแพ็กเกจ ${PKG.code} ในหน้า Order`, ['ต้องการ', 'จริง'], rows, { side: 'left', width: '900px' });
        await markEvidence(expected(search, 'รายการในแพ็กเกจเข้าตะกร้า'), expected(main.locator('.ant-table').filter({ visible: true }).first(), err ? `ตะกร้า · จริง: ไม่มีรายการจากแพ็กเกจ` : 'รายการจากแพ็กเกจ'));
        await holdForClip(page, 2_000);
        expect(rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]}`), 'รายการในแพ็กเกจต้องเข้าตะกร้า').toEqual([]);
      });
      await hideCompareTable(page);

      await soft('ข้อ 3 กด "ส่งคำสั่ง" → ส่งคำสั่งสำเร็จ', async () => {
        const send = main.getByRole('button', { name: /ส่งคำสั่ง/ }).first();
        await expect(send).toBeEnabled({ timeout: 30_000 });
        await markEvidence(clicked(send, 'ส่งคำสั่ง'));
        await snapEvidence(page, 'ก่อนกด — ส่งคำสั่ง');
        // ส่งคำสั่ง → รายการรังสีเด้ง "แบบฟอร์ม Imaging - X-Ray" ให้บันทึกก่อน แล้วต้องกดส่งอีกรอบ (screens/opd.md) — วนจนทุกแถวเป็นจุดสถานะ "ส่งแล้ว"
        const all = [MED5.code, CBC.code, CHEST.code, MED7.code, CHEST_R.code, ...PKG_ITEMS.map((i) => i.code)];
        const present: string[] = [];
        for (const c of all) if (await cart().filter({ hasText: `[${c}]` }).first().isVisible().catch(() => false)) present.push(c);
        const rowSent = async (c: string) => /status-dot-sent/.test((await cart().filter({ hasText: `[${c}]` }).first().locator('[class*="status-dot"]').first().getAttribute('class').catch(() => '')) ?? '');
        const errors: string[] = [];
        const watch = async (r: Response) => {
          if (!/SignOPDOrders/.test(r.request().postData() ?? '')) return;
          const b = (await r.json().catch(() => ({}))) as { errors?: { message: string }[] };
          await test.info().attach('SignOPDOrders', { body: JSON.stringify(b, null, 2), contentType: 'application/json' });
          for (const e of b.errors ?? []) errors.push(e.message);
        };
        page.on('response', watch);
        const xray = page.getByRole('dialog').filter({ visible: true }).filter({ hasText: 'แบบฟอร์ม Imaging' }).first();
        let first = true;
        try {
          for (let i = 0; i < 8; i++) {
            let done = true;
            for (const c of present) if (!(await rowSent(c))) done = false;
            if (done) break;
            if (await xray.isVisible().catch(() => false)) {
              const save = xray.getByRole('button', { name: /บันทึก/ }).first();
              await save.scrollIntoViewIfNeeded().catch(() => undefined);
              await markEvidence(clicked(save, 'บันทึกแบบฟอร์ม X-Ray')).catch(() => undefined);
              await snapEvidence(page, 'ก่อนกด — บันทึกแบบฟอร์ม X-Ray');
              await save.click();
              await page.waitForTimeout(4_000);
              continue;
            }
            if (orderAlert(page) && (await orderAlert(page).isVisible().catch(() => false))) { await confirmOrderAlert(page); continue; }
            if (!first && errors.length) break;
            first = false;
            const signed = page.waitForResponse((r) => r.url().endsWith('/cortex-api/graphql') && /SignOPDOrders/.test(r.request().postData() ?? ''), { timeout: 90_000 }).catch(() => null);
            await send.click();
            await Promise.race([signed, xray.waitFor({ timeout: 90_000 }), orderAlert(page).waitFor({ timeout: 90_000 })]).catch(() => undefined);
            await page.waitForTimeout(4_000);
          }
        } finally {
          page.off('response', watch);
        }
        const rows: CompareRow[] = [];
        for (const c of all) {
          const has = present.includes(c);
          const sent = has && (await rowSent(c));
          rows.push({ label: c, values: ['ส่งแล้ว', !has ? 'ไม่อยู่ในตะกร้า' : sent ? 'ส่งแล้ว' : 'ยังไม่ส่ง'], same: sent });
        }
        if (errors.length) rows.push({ label: 'SignOPDOrders', values: ['สำเร็จ', `error: ${errors.join(' · ').slice(0, 150)}`], same: false });
        await showCompareTable(page, 'รายการหลังส่งคำสั่ง', ['ต้องการ', 'ในรายการคำสั่ง'], rows, { side: 'bottom' });
        await markEvidence(expected(main.locator('.ant-table').filter({ visible: true }).first(), 'รายการคำสั่งที่ส่ง'));
        await holdForClip(page, 2_500);
        expect(rows.filter((r) => !r.same && r.values[1] !== 'ไม่อยู่ในตะกร้า').map((r) => `${r.label}: ${r.values[1]}`), 'รายการในตะกร้าต้องส่งคำสั่งสำเร็จ').toEqual([]);
      });
      await hideCompareTable(page);
    }
    await startClip(page, 'after');
    finish();
  });
});
