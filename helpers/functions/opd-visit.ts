import { expect, test, type Locator, type Page } from '@playwright/test';
import { envName } from '../../utils/env';
import { expectOk } from './er';
import { graphqlMutation } from './er-disposition';

// เปิด Visit OPD + ลงตารางแพทย์ให้ "คำขอ Walk-in" — ย้ายมาจาก mock-data/uat-er.ts 29 ต.ค. 2026 (ผู้ใช้สั่งให้มี flow ลงตาราง)
// ใช้ได้ทั้ง dev-x และ SBH Prod (แพทย์ต่างกันตามระบบ — OPD_DOCTOR)

/** แพทย์ที่ใช้เปิด Visit OPD / ลงตาราง — dev-x: นาย ทดสอบ มานะ · SBH Prod: "ดร. วิชัย รัตน์ เอื้อเฟื้อ" (ผู้ใช้กำหนด 3 ต.ค. 2026 — บัญชี user1 ที่ใช้เล่น UAT) */
export const OPD_DOCTOR: { search: string; name: RegExp } =
  envName() === 'sbh-prod' ? { search: 'วิชัย', name: /วิชัย.*เอื้อเฟื้อ/ } : { search: 'ทดสอบ', name: /ทดสอบ มานะ/ };

/** คลินิกตั้งต้นของ Visit OPD: แผนกอายุรกรรม (R31 ข้อ 5.2) — ค้นด้วยคำนี้แล้วเลือกตัวที่ขึ้นต้น "MED - " ถ้ามี */
export const OPD_CLINIC = { search: 'อายุรกรรม', prefer: /^MED - / };
/** คลินิก SBH - ห้องตรวจสระบุรี (Walk-in ไม่มีแพทย์ → ไปค้างแท็บ "คำขอ Walk-in" ต้องลงตารางต่อ — SBH-1198 29 ต.ค. 2026) */
export const SBH_CLINIC = { search: 'SBH', prefer: /^SBH - ห้องตรวจสระบุรี/ };
/** หน่วยบริการ + ช่องบริการ ที่เลือกก่อนเข้า "รายการผู้ป่วยนอก" เพื่อลงตารางแพทย์ให้คำขอ Walk-in */
export const OPD_UNIT = { name: 'แผนกอายุรกรรม', counter: 'ก่อนตรวจ' };

/** ตัวเลือกใน dropdown ของ Ant Design ที่เปิดอยู่ (ตัวเลือกของ Order / ยา ไม่มี title จึงจับด้วยข้อความ) */
export function openOptions(page: Page): Locator {
  return page.locator('.ant-select-dropdown:visible .ant-select-item-option');
}

/** เลือกตัวเลือกที่ตรง `prefer` ถ้ามี ไม่งั้นเลือกตัวแรก → คืนข้อความของตัวที่เลือก */
export async function pickOption(page: Page, prefer?: RegExp): Promise<string> {
  const options = openOptions(page);
  await expect(options.first()).toBeVisible();
  const preferred = prefer ? options.filter({ hasText: prefer }).first() : options.first();
  const target = prefer && (await preferred.count()) ? preferred : options.first();
  const text = (await target.textContent())?.trim() ?? '';
  // dropdown ที่อยู่ชิดขอบล่างของจอขยับตามการเลื่อนหน้า ตัวเลือกจึงไม่นิ่งให้กด (หน้าผู้ป่วยของ Visit ER) → กดแบบไม่รอให้นิ่ง
  await target.click({ timeout: 5_000 }).catch(() => target.click({ force: true }));
  return text;
}

/**
 * เมนูในแถบขวา "การดำเนินการดูแลผู้ป่วย" ของหน้าผู้ป่วย → รอ `ready` ขึ้น แล้วคลิกมันให้แถบเมนูหุบ
 * (แถบกางค้างหลังกดเมนู แล้วบังปุ่มมุมขวาบน เช่น "ส่งคำสั่ง")
 */
export async function openCareMenu(page: Page, name: string, ready: Locator) {
  // แถบเมนูกางเมื่อเมาส์ชี้ และรายการเลื่อนตำแหน่งระหว่างกาง — เดิมกดแบบ force แล้วโดนเมนูข้างเคียง ("จัดการ Admission" แทน "จัดการ Visit" dev-x 29 ต.ค. 2026)
  // → ชี้ให้กางก่อน แล้วกดแบบปกติ (Playwright รอให้นิ่ง + เช็คว่าไม่มีอะไรบัง) · ใช้ได้ทั้งตอนแถบหุบและแถบกางค้าง
  const nav = page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' });
  await expect(async () => {
    await nav.hover({ timeout: 10_000 });
    await nav.getByRole('menuitem', { name }).click({ timeout: 5_000 });
    await expect(ready).toBeVisible({ timeout: 20_000 });
  }, `เปิดเมนูขวา "${name}"`).toPass({ timeout: 120_000 }).catch(async (error: Error) => {
    // เมนู "จัดการ Visit" ขึ้นเฉพาะผู้ป่วยที่ยังไม่มี Visit เปิดอยู่ (dev-x 29 ต.ค. 2026: HN ที่มี Visit รอเช็คอินค้าง ไม่มีเมนูนี้)
    if (!(await nav.getByRole('menuitem', { name }).count())) {
      const items = (await nav.getByRole('menuitem').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
      throw new Error(`เมนูขวาไม่มี "${name}" — ผู้ป่วยอาจมี Visit เปิดค้างอยู่ (เมนูที่มี: ${items.join(' · ')})`);
    }
    throw error;
  });
  // คลิก `ready` ให้แถบหุบ — ถ้าแถบบังอยู่จนคลิกไม่ได้ (dev-x 29 ต.ค. 2026) ใช้วิธีเลื่อนเมาส์ออกแล้วรอแถบหุบแทน
  await ready.click({ timeout: 5_000 }).catch(() => undefined);
  await collapseCareMenu(page);
}

/** เลื่อนเมาส์ออกจากแถบเมนูขวา แล้วรอให้แถบหุบ (แถบกางเมื่อเมาส์อยู่ใกล้ และบังปุ่มมุมขวาบน) — หุบไม่ทันก็ไปต่อ */
export async function collapseCareMenu(page: Page) {
  await expect(async () => {
    await page.mouse.move(300, 900);
    await expect(page.getByRole('navigation', { name: 'การดำเนินการดูแลผู้ป่วย' }).getByText('จัดการ Admission')).toBeHidden({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 }).catch(() => undefined);
}

/** เปิดหน้าผู้ป่วยตาม HN (ไม่ผูก Visit) — ใช้กับผู้ป่วยที่ยังไม่มี Visit */
export async function gotoPatient(page: Page, hn: string) {
  // SBH Prod: หน้าผู้ป่วยบางครั้งโหลดไม่ขึ้น (API ตอบ 500 / 502 เป็นพักๆ) → เปิดใหม่อีกรอบ
  await expect(async () => {
    await page.goto(`/cortex/next/patients/${hn}`);
    await expect(page.getByRole('main').getByText(`HN ${hn}`, { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  }, `เปิดหน้าผู้ป่วย HN ${hn}`).toPass({ timeout: 150_000 });
}

/**
 * เปิด Visit OPD แบบ Walk-in ที่แผนกอายุรกรรม จากเมนูขวา "จัดการ Visit" โดยระบุแพทย์ตาม `OPD_DOCTOR`
 * (สิทธิใช้ค่าที่ฟอร์มใส่มาให้) → คืน VN / EN / ชื่อคลินิก / ชื่อแพทย์ · Visit ที่ได้สถานะ "รอเช็คอิน" — เช็คอินต่อด้วย `checkInOpdVisit()`
 * SBH Prod: คลินิกอายุรกรรมได้แถวประเภท "คำขอ Walk-in" (ไม่มีช่องแพทย์) → คืน `doctor: ''` ให้ไปลงตารางแพทย์ต่อด้วย `scheduleWalkInRequest()`
 */
export async function openOpdVisit(page: Page, clinicOpt: { search: string; prefer: RegExp } = OPD_CLINIC): Promise<{ vn: string; en: string; clinic: string; doctor: string }> {
  const main = page.getByRole('main');
  await openCareMenu(page, 'จัดการ Visit', main.getByText(/^รายการเข้ารับบริการ/));

  const clinic = main.locator('.ant-select').filter({ hasText: /^คลินิก$/ }).getByRole('combobox');
  await clinic.fill(clinicOpt.search);
  await expect(openOptions(page).filter({ hasText: clinicOpt.search }).first()).toBeVisible();
  const clinicName = await pickOption(page, clinicOpt.prefer);

  // แพทย์: ตัวเลือกมีเฉพาะแพทย์ที่มีตารางออกตรวจของคลินิกนั้น — ไม่เจอชื่อที่ต้องการให้พังพร้อมรายชื่อที่มี (ไม่เลือกคนอื่นแทน)
  const row = main.getByRole('row').filter({ hasText: 'Walk-in' }).first();
  await expect(row).toBeVisible();
  let doctorName = '';
  if (!(await row.getByText('คำขอ Walk-in').count())) {
    await row.locator('.ant-select').first().click();
    await expect(openOptions(page).first()).toBeVisible();
    const available = await openOptions(page).allTextContents();
    await row.getByRole('combobox').first().fill(OPD_DOCTOR.search);
    const doctorOption = openOptions(page).filter({ hasText: OPD_DOCTOR.name }).first();
    await expect(doctorOption, `คลินิก ${clinicName} ไม่มีแพทย์ ${OPD_DOCTOR.name} ให้เลือก — ที่มี: ${available.join(' · ')}`).toBeVisible();
    doctorName = (await doctorOption.textContent())?.trim() ?? '';
    await doctorOption.click();
    await expect(row).toContainText(doctorName);
  }

  // แถบเมนูขวา "การดำเนินการดูแลผู้ป่วย" กางค้างเมื่อเมาส์อยู่ใกล้ แล้วบังปุ่ม "สร้าง" มุมขวาบน (dev-x 29 ต.ค. 2026) → เลื่อนเมาส์ออกแล้วรอให้หุบ
  const create = main.getByRole('button', { name: 'สร้าง', exact: true });
  await collapseCareMenu(page);
  const created = graphqlMutation(page, 'CreateVisit');
  await create.click();
  const res = await created;
  await expectOk(res, 'เปิด Visit OPD');
  const body = (await res.json()) as {
    data?: { createVisit?: { visit?: { vn: string; encounters: { en: string; latestStatusCode: string }[] } } };
    errors?: { message: string }[];
  };
  const visit = body.data?.createVisit?.visit;
  if (!visit?.encounters?.length) throw new Error(`เปิด Visit OPD ไม่สำเร็จ: ${body.errors?.map((e) => e.message).join(' · ') ?? JSON.stringify(body).slice(0, 300)}`);
  await test.info().attach('CreateVisit (OPD)', { body: JSON.stringify(body.data, null, 2), contentType: 'application/json' });
  await expect(main.getByRole('row').filter({ hasText: 'Walk-in' }).first()).toBeVisible();
  return { vn: visit.vn, en: visit.encounters[0].en, clinic: clinicName, doctor: doctorName };
}

/**
 * ลงตารางแพทย์ให้ "คำขอ Walk-in" (SBH Prod): โมดูลผู้ป่วยนอก → เลือกหน่วยบริการ + ช่องบริการ → แท็บ "คำขอ Walk-in"
 * → ปุ่ม `ลงตาราง` ในแถวของผู้ป่วย → dialog "ลงตารางแพทย์": เลือกแพทย์ตาม `OPD_DOCTOR` + ช่วงเวลา → บันทึก → คืนชื่อแพทย์ + ช่วงเวลา
 */
export async function scheduleWalkInRequest(page: Page, hn: string, unit: { name: string; counter: string } = OPD_UNIT): Promise<{ doctor: string; slot: string }> {
  const main = page.getByRole('main');
  // หน่วยบริการที่เลือกเก็บในเบราว์เซอร์ (localStorage) — เบราว์เซอร์ของเทสเริ่มใหม่ทุกครั้งจึงต้องเลือกเสมอ
  await page.goto('/cortex/opd/select-service-unit');
  await main.getByRole('combobox').first().fill(unit.name);
  await openOptions(page).filter({ hasText: new RegExp(`^${unit.name}$`) }).click();
  await main.getByRole('combobox').nth(1).click();
  await openOptions(page).filter({ hasText: new RegExp(`^${unit.counter}$`) }).click();
  await page.getByRole('button', { name: 'ส่ง' }).click();
  await page.waitForURL(/\/opd\/patient-list/);

  // กดแท็บก่อนรายการโหลดเสร็จ แท็บไม่เปลี่ยน หรือเปลี่ยนแล้วเด้งกลับแท็บตั้งต้น (เช็คอิน) → กดซ้ำจนเห็นปุ่ม "ลงตาราง" ของผู้ป่วย
  const schedule = main.getByRole('row').filter({ hasText: `HN ${hn}` }).getByRole('button', { name: 'ลงตาราง' });
  // SBH Prod ช่วงที่ช้า รายการขึ้นหลังตัวนับบนแท็บหลายวินาที (5 ต.ค. 2026: แท็บนับ 1 แต่ตารางยัง "ไม่มีข้อมูล") — กดถี่ไปรายการจะโหลดใหม่ไม่จบ → รอรอบละ 20 วินาที
  // รอบเดียวกับที่เพิ่งเปิด Visit OPD ตารางว่างค้างอยู่อย่างนั้น (5–6 ต.ค. 2026) เปิดเบราว์เซอร์ใหม่แล้วเห็น → รอบที่ 2 เป็นต้นไปโหลดหน้าใหม่ก่อน
  let rounds = 0;
  await expect(async () => {
    if (rounds++) await page.reload();
    await main.getByRole('tab', { name: /คำขอ Walk-in/ }).click();
    await expect(schedule).toBeVisible({ timeout: 20_000 });
  }, `ต้องเห็นคำขอ Walk-in ของ HN ${hn} ในแท็บ "คำขอ Walk-in"`).toPass({ timeout: 150_000 });
  await schedule.click();

  const dialog = page.getByRole('dialog', { name: 'ลงตารางแพทย์' });
  await expect(dialog.getByText(`HN ${hn}`, { exact: true })).toBeVisible();
  const doctorBox = dialog.getByRole('combobox', { name: '*แพทย์ :' });
  await doctorBox.click();
  await expect(openOptions(page).first()).toBeVisible();
  const available = await openOptions(page).allTextContents();
  // รายชื่อเป็น virtual list เรียงตามชื่อ — วันที่มีแพทย์ออกตรวจหลายคน ชื่อท้ายๆ ยังไม่ถูกวาด (SBH Prod จันทร์ 5 ต.ค. 2026) → พิมพ์ค้นก่อนเลือก
  await doctorBox.fill(OPD_DOCTOR.search);
  const doctorOption = openOptions(page).filter({ hasText: OPD_DOCTOR.name }).first();
  await expect(doctorOption, `ค้น "${OPD_DOCTOR.search}" แล้วไม่มีแพทย์ ${OPD_DOCTOR.name} ให้เลือก — รายชื่อช่วงแรก: ${available.join(' · ')}`).toBeVisible();
  const doctor = (await doctorOption.textContent())?.trim() ?? '';
  await doctorOption.click();

  // ช่วงเวลา: เลือกช่วงที่ครอบเวลาปัจจุบัน ถ้าไม่มีใช้ช่วงแรก
  const radios = dialog.getByRole('radio');
  await expect(radios.first(), `แพทย์ ${doctor} ไม่มีตารางตรวจวันนี้`).toBeVisible();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  const pad = (n: number) => String(n).padStart(2, '0');
  let slot = `${pad(hour)}:00 - ${pad(hour + 1)}:00`;
  const current = dialog.getByText(slot, { exact: true });
  if (await current.count()) await current.click();
  if (!(await dialog.getByRole('radio', { checked: true }).count())) {
    await radios.first().check();
    slot = 'ช่วงแรกของตาราง';
  }
  // ไม่พิมพ์บัตรคิว (ไม่ให้มีหน้าต่างพิมพ์ค้างระหว่างรันสคริปต์)
  await dialog.getByRole('checkbox', { name: 'Print บัตรคิวอัตโนมัติ' }).uncheck();

  const saved = page.waitForResponse((res) => new URL(res.url()).pathname.endsWith('/graphql') && /mutation\s/.test(res.request().postData() ?? ''));
  await dialog.getByRole('button', { name: 'บันทึก' }).click();
  const res = await saved;
  await expectOk(res, 'ลงตารางแพทย์');
  const body = (await res.json()) as { errors?: { message: string }[] };
  const operation = (res.request().postData() ?? '').match(/mutation\s+(\w+)/)?.[1] ?? '?';
  await test.info().attach(`ลงตารางแพทย์ (${operation})`, { body: JSON.stringify(body, null, 2), contentType: 'application/json' });
  console.log(`    ลงตารางแพทย์: ${operation} → ${JSON.stringify(body).slice(0, 400)}`);
  expect(body.errors, `ลงตารางแพทย์ไม่สำเร็จ (${operation}): ${body.errors?.map((e) => e.message).join(' · ')}`).toBeUndefined();
  await expect(dialog).toBeHidden();
  return { doctor, slot };
}

