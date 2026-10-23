import type { Page } from '@playwright/test';

// จดแจ้งเตือน (toast / notification ของ antd) ที่หายเองใน ~4.5 วินาที — รวมจากสเปก Refill / ใบยา / คำขอ Walk-in (24 ต.ค. 2026)

/**
 * init script: จดแจ้งเตือนทุกตัว (หายเองใน ~4.5 วินาที) ลง `window.__notices`
 * ใช้ `page.addInitScript(recordNotices)` หรือ `context.addInitScript(recordNotices)` — ต้องไม่อ้างตัวแปรนอกฟังก์ชัน (ถูก serialize ไปรันในเบราว์เซอร์)
 */
export function recordNotices() {
  const w = window as unknown as { __notices: string[] };
  w.__notices = [];
  new MutationObserver(() => {
    for (const el of document.querySelectorAll('.ant-notification-notice:not([data-seen]), .ant-message-notice:not([data-seen])')) {
      el.setAttribute('data-seen', '1');
      w.__notices.push((el.textContent ?? '').trim());
    }
  }).observe(document, { childList: true, subtree: true });
}

/** แจ้งเตือนทั้งหมดที่จดไว้ตั้งแต่โหลดหน้า (หน้าไม่ได้ติด init script → []) */
export const notices = (page: Page) => page.evaluate(() => (window as unknown as { __notices?: string[] }).__notices ?? []).catch(() => [] as string[]);

/** รอแจ้งเตือนตัวใหม่ (นับจากจำนวนก่อนกด) ที่ตรง pattern → ข้อความ หรือ '' */
export async function waitNotice(page: Page, before: number, pattern: RegExp, timeout = 20_000): Promise<string> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const found = (await notices(page)).slice(before).find((text) => pattern.test(text));
    if (found) return found;
    await page.waitForTimeout(250);
  }
  return '';
}
