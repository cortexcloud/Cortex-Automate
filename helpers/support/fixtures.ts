import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import { closeVisitAtCashier } from '../functions/cashier';
import { trackOpenedErVisits, type ErVisit } from '../functions/er';

export { expect };

/** ขนาดวิดีโอ = ขนาดจอ (ตัวหนังสือไทยในวิดีโออ่านออก) */
const VIDEO_SIZE = { width: 1920, height: 1080 };

/** เวลาที่เผื่อให้ปิด Visit 1 ราย ต่อจากเวลาของเทส (SBH Prod ใช้ ~30 วินาที/ราย · เผื่อหน้าการเงินโหลดซ้ำ) */
const CLOSE_VISIT_BUDGET_MS = 150_000;

export interface ProjectFixtures {
  /**
   * ปิด Visit ER ที่เทสเปิดเองที่หน้าการเงินท้ายเทส — ทำทั้งตอนเทสผ่านและตอนพังกลางทาง
   * ค่าเริ่ม false · เปิดใช้ทีละไฟล์: `test.use({ closeVisits: true })`
   * ผลแต่ละรายลง annotation `หลังเทส` + console · ปิดไม่สำเร็จไม่ทำให้เทส fail
   */
  closeVisits: boolean;
  /** Visit ER ที่เทสเปิด (key = EN) จดทันทีที่ `POST /cortex-api/er/visits` ตอบสำเร็จ */
  openedVisits: Map<string, ErVisit>;
}

/** Visit ที่จดไว้ของแต่ละหน้า — ให้ fixture `openedVisits` ใช้ Map เดียวกับที่ fixture `page` จะปิดท้ายเทส */
const trackedVisits = new WeakMap<Page, Map<string, ErVisit>>();

function visitsOf(page: Page): Map<string, ErVisit> {
  let visits = trackedVisits.get(page);
  if (!visits) {
    visits = trackOpenedErVisits(page);
    trackedVisits.set(page, visits);
  }
  return visits;
}

/**
 * test ของโปรเจกต์ — เทสทุกไฟล์ import จากที่นี่แทน '@playwright/test'
 *
 * วิดีโอผลเทส (R13): เริ่มอัดเมื่อหน้าแรกโหลดไฟล์แอปเสร็จ (event load) ด้วย page.screencast
 * ตัดช่วงจอขาว ~10 วินาทีตอนเปิดหน้าแรก (ไฟล์ JS ของแอป 15.5 MB ห้าม cache) ที่ video ใน config อัดติดมาด้วย
 * เทสที่พังก่อนหน้าแรกโหลดเสร็จจะไม่มีวิดีโอ — ดูภาพตอน fail + trace แทน
 *
 * ปิด Visit (closeVisits): ทำหลัง afterEach ของ spec (เก็บหลักฐานเสร็จแล้ว) และก่อนหยุดอัดวิดีโอ — ขั้นปิดอยู่ในคลิป
 */
export const test = base.extend<ProjectFixtures>({
  closeVisits: [false, { option: true }],

  page: async ({ page, closeVisits }, use, testInfo) => {
    const path = testInfo.outputPath('video.webm');
    let recording: Promise<unknown> | undefined;
    page.once('load', () => {
      recording = page.screencast.start({ path, size: VIDEO_SIZE }).catch((error: Error) => {
        testInfo.annotations.push({ type: 'video', description: `อัดวิดีโอไม่สำเร็จ: ${error.message}` });
      });
    });
    // เริ่มจดก่อนเทสทำอะไร — Visit ที่เปิดก่อนเทสพังก็ยังถูกปิด
    if (closeVisits) visitsOf(page);

    await use(page);

    if (closeVisits) await closeTrackedVisits(page, visitsOf(page), testInfo);

    if (!recording) return;
    await recording;
    await page.screencast.stop().catch(() => undefined);
    if (fs.existsSync(path)) await testInfo.attach('video', { path, contentType: 'video/webm' });
  },

  openedVisits: async ({ page }, use) => {
    await use(visitsOf(page));
  },
});

/** ปิด Visit ที่จดไว้ทีละรายที่หน้าการเงิน — รายที่ปิดไม่ได้จดสาเหตุแล้วไปรายถัดไป */
async function closeTrackedVisits(page: Page, visits: Map<string, ErVisit>, testInfo: TestInfo) {
  if (!visits.size) return;
  testInfo.setTimeout(testInfo.timeout + visits.size * CLOSE_VISIT_BUDGET_MS);
  for (const visit of visits.values()) {
    const result = page.isClosed()
      ? 'ปิด Visit ไม่สำเร็จ — หน้าเว็บถูกปิดไปแล้ว'
      : await closeVisitAtCashier(page, visit.hn, visit.vn).then(
          (closed) => (closed.result === 'closed' ? `ปิด Visit ที่การเงินแล้ว${closed.coverages ? ` (ปิดสิทธิ ${closed.coverages} รายการก่อน)` : ''}` : 'Visit ปิดอยู่ก่อนแล้ว'),
          (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
        );
    testInfo.annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
    console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
  }
}
