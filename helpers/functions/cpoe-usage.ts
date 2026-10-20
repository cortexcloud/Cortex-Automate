import { expect, type Locator, type Page } from '@playwright/test';

/**
 * ฟอร์มสั่งยา / แก้ไขยา (CPOE OPD) — เปลี่ยน "เวลาใช้ยา" เป็นมื้ออาหาร (ก่อน / หลัง / พร้อมอาหาร) + เลือกมื้อ (เช้า / กลางวัน / เย็น / ก่อนนอน)
 * dev-x 19 ต.ค. 2026 (SBH-2126): หัวฟอร์ม (ประวัติวิธีใช้ `_med-hist-label`) บังช่องเหล่านี้ → คลิกเมาส์ไม่ได้ ใช้คีย์บอร์ดทั้งหมด (focus + Space / ลูกศร + Enter)
 * ยาที่เดิม "ไม่ระบุ" เปลี่ยนเป็นมื้ออาหารแล้วช่องจำนวนที่จ่ายว่าง → กรอก `quantity` ให้ (ถ้าช่องแก้ได้)
 * ข้อความวิธีใช้ภาษาไทยไม่สร้างใหม่เอง — ตอนบันทึกระบบขึ้นกล่องเตือนให้กด "ใช้ข้อความที่สร้างใหม่" (ดู saveWithRegeneratedUsage)
 */
export async function setMealTiming(page: Page, meal: 'ก่อนอาหาร' | 'หลังอาหาร' | 'พร้อมอาหาร', slot: 'เช้า' | 'กลางวัน' | 'เย็น' | 'ก่อนนอน', quantity = '1') {
  const main = page.getByRole('main');
  const mealRadio = main.getByRole('radio', { name: 'มื้ออาหาร' });
  if (!(await mealRadio.isChecked())) {
    await mealRadio.focus();
    await page.keyboard.press('Space');
    await expect(mealRadio).toBeChecked();
  }
  const slotBox = main.getByRole('checkbox', { name: slot });
  await expect(slotBox).toBeVisible({ timeout: 10_000 });
  const select = slotBox.locator('xpath=ancestor::*[.//*[contains(@class,"ant-select")]][1]').locator('.ant-select').first();
  const active = page.locator('.ant-select-dropdown:visible .ant-select-item-option-active');
  await select.locator('input').focus();
  await page.keyboard.press('ArrowDown'); // เปิดรายการ (ไม่ระบุ · ก่อนอาหาร · หลังอาหาร · พร้อมอาหาร)
  await expect(active).toBeVisible({ timeout: 5_000 });
  for (let i = 0; i < 6 && (await active.innerText()).trim() !== meal; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(select).toContainText(meal);
  // เลือกมื้อได้ไม่เกิน 1 ครั้งต่อวัน → เอามื้ออื่นออกก่อน
  for (const other of ['เช้า', 'กลางวัน', 'เย็น', 'ก่อนนอน'].filter((name) => name !== slot)) {
    const box = main.getByRole('checkbox', { name: other });
    if (await box.isChecked()) {
      await box.focus();
      await page.keyboard.press('Space');
    }
  }
  if (!(await slotBox.isChecked())) {
    await slotBox.focus();
    await page.keyboard.press('Space');
  }
  await expect(slotBox).toBeChecked();
  const qty = main.getByRole('spinbutton', { name: /จำนวนที่จ่าย/ });
  if ((await qty.isEnabled()) && !(await qty.inputValue())) {
    await qty.fill(quantity);
    await qty.press('Tab');
  }
  return { select, slotBox };
}

/**
 * เปลี่ยนขนาดยา (ช่อง "ขนาดยา / อัตราการให้") — ใช้กับยาที่สร้างข้อความวิธีใช้แบบมื้ออาหารไม่ได้
 * (dev-x 19 ต.ค. 2026: med0000006 ยาฉีดที่สั่ง Route รับประทาน → เลือกมื้ออาหารแล้ว "สร้างวิธีใช้ได้ไม่ครบ" ปุ่มใช้ข้อความที่สร้างใหม่ disabled)
 */
export async function setDose(page: Page, dose: string) {
  const box = page.getByRole('main').getByRole('spinbutton', { name: /^ขนาดยา/ }).first();
  await box.focus();
  await box.fill(dose);
  await page.keyboard.press('Tab');
  await expect(box).toHaveValue(dose);
  return box;
}

/**
 * กดบันทึกในฟอร์มแก้ไขยา → ถ้ามีกล่องเตือน "ตรวจสอบข้อความวิธีใช้ให้ตรงกับคำสั่งยาที่แก้ไขก่อนบันทึก" กด "ใช้ข้อความที่สร้างใหม่" แล้วบันทึกอีกครั้ง
 * `beforeRegenerate` ไว้ตีกรอบ / ถ่ายภาพกล่องเตือนก่อนกด · คืนข้อความวิธีใช้ภาษาไทยที่บันทึก
 */
export async function saveWithRegeneratedUsage(page: Page, beforeRegenerate?: (box: Locator, button: Locator) => Promise<void>): Promise<string> {
  const main = page.getByRole('main');
  const usage = main.getByRole('textbox', { name: /^\* วิธีใช้ภาษาไทย/ });
  const save = main.getByRole('button', { name: /^(save )?บันทึก$/ }).first();
  await save.focus();
  await page.keyboard.press('Enter');
  const regen = main.getByRole('button', { name: 'ใช้ข้อความที่สร้างใหม่' });
  if (await regen.waitFor({ timeout: 5_000 }).then(() => true, () => false)) {
    const before = await usage.inputValue();
    // กล่องเตือนทั้งกล่อง (class "ant-alert" ตรงตัว — ไม่ใช่ ant-alert-action ที่ครอบแค่ปุ่ม)
    if (beforeRegenerate) await beforeRegenerate(regen.locator('xpath=ancestor::*[contains(@class,"ant-alert") and not(contains(@class,"ant-alert-action"))][1]'), regen);
    await regen.focus();
    await page.keyboard.press('Enter');
    await expect(usage, 'กด "ใช้ข้อความที่สร้างใหม่" แล้ววิธีใช้ต้องเปลี่ยนตามรายละเอียดที่แก้').not.toHaveValue(before, { timeout: 5_000 });
    const text = await usage.inputValue();
    await save.focus();
    await page.keyboard.press('Enter');
    return text;
  }
  return usage.inputValue();
}
