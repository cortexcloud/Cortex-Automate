import type { Locator } from '@playwright/test';

// อ่านตาราง antd (`.ant-table-wrapper`) ตามชื่อหัวคอลัมน์ — รวมจากสเปกใบยา / Refill / สิทธิยา (24 ต.ค. 2026)

/** ยุบช่องว่าง / ขึ้นบรรทัดให้เหลือช่องว่างเดียว */
export const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/** หัวคอลัมน์ที่มองเห็นของตารางที่แถวนี้อยู่ */
export async function headersOf(row: Locator): Promise<string[]> {
  const table = row.locator('xpath=ancestor::div[contains(@class,"ant-table-wrapper")][1]');
  return (await table.locator('thead th').filter({ visible: true }).allInnerTexts()).map(squash);
}

/**
 * เซลล์ + ข้อความของแถวตามชื่อหัวคอลัมน์ (หัว / เซลล์นับตรงกัน — ตารางเหล่านี้ไม่มี colSpan ในแถวยา)
 * ไม่มีคอลัมน์ชื่อนั้น → cell = ช่องแรก และ text บอกว่าไม่มี พร้อมรายชื่อหัวคอลัมน์ที่มี
 */
export async function cellByHeader(row: Locator, header: string): Promise<{ cell: Locator; text: string }> {
  const headers = await headersOf(row);
  const i = headers.findIndex((h) => h === header);
  if (i < 0) return { cell: row.locator('td').first(), text: `(ไม่มีคอลัมน์ "${header}" — มี ${headers.join(' | ')})` };
  const cell = row.locator('td').filter({ visible: true }).nth(i);
  return { cell, text: squash(await cell.innerText().catch(() => '')) };
}
