import { expect, type Locator, type Page } from '@playwright/test';
import { expectOk, type ErVisit } from './er';

// แท็บ Timeline ของหน้าประวัติการรักษา (Treatment Timeline ของ ER) — locator ตรวจกับหน้าจอจริงบน dev-x 12 ต.ค. 2026 (การ์ด SBH-2482)
// class ของแอปมี hash ต่อท้าย (เช่น `_timeline-item_1aten_22`) → จับด้วย [class*="_ชื่อ_"]

/** ชื่อ event ที่ Timeline แสดง ของรหัส type ใน API (เฉพาะ event ของการคัดกรอง) */
export const TIMELINE_TRIAGE_LABEL = { FIRST_TRIAGE: 'คัดกรองครั้งแรก', ER_REASSESSMENT: 'คัดกรองซ้ำ' } as const;

/** 1 แถวบน Timeline ตามที่หน้าจอแสดง — `esi` = ข้อความบนป้ายความรุนแรง (เช่น "ESI 3" · แถวที่ไม่มีป้าย = '') · `tone` = โทนสีของป้าย (red / pink / yellow / green / neutral) */
export interface TimelineRow {
  time: string;
  date: string;
  label: string;
  esi: string;
  tone: string;
  actor: string;
}

/** 1 event จาก API ของ Timeline (GET /cortex-api/er-treatment-timeline?hn=&en=) */
export interface TimelineEvent {
  id: string;
  type: string;
  occurredAt: string;
  actor?: { display?: string } | null;
  detail?: { triageLevel?: number } | null;
}

/** แท็บ Timeline ของหน้าประวัติการรักษา (แถบ ER Summary · Timeline · CPR Progression · ประวัติ Custom Form · ค่าใช้จ่าย) */
export function timelineTab(page: Page): Locator {
  return page.getByRole('main').getByRole('tab', { name: 'Timeline', exact: true });
}

export function timelinePanel(page: Page): Locator {
  return page.getByRole('main').getByRole('tabpanel', { name: 'Timeline' });
}

/** แถวของ event ตามชื่อที่แสดง (ชื่อตรงตัว) — event ชื่อเดียวกันมีได้หลายแถว (เช่น คัดกรองซ้ำ หลายรอบ) เรียงเก่า → ใหม่ */
export function timelineRow(page: Page, label: string): Locator {
  const exact = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  return timelinePanel(page)
    .locator('[class*="_timeline-item_"]')
    .filter({ has: page.locator('[class*="_event-label_"]', { hasText: exact }) });
}

/** บรรทัดชื่อ event ของแถว (ชื่อ + ป้ายความรุนแรง + ระยะเวลาถึง event ถัดไป) — ใช้ตีกรอบในภาพหลักฐาน */
export function timelineEventLine(row: Locator): Locator {
  return row.locator('[class*="_event-row_"]');
}

/** ป้ายความรุนแรง (ESI n) ต่อท้ายชื่อ event — มีเฉพาะแถว คัดกรองครั้งแรก / คัดกรองซ้ำ */
export function timelineEsiTag(row: Locator): Locator {
  return row.locator('[class*="_esi-level-tag_"]');
}

/** ทุกแถวบน Timeline ตามลำดับที่แสดง (เก่า → ใหม่) */
export async function readTimeline(page: Page): Promise<TimelineRow[]> {
  return timelinePanel(page)
    .locator('[class*="_timeline-item_"]')
    .evaluateAll((items) =>
      items.map((item) => {
        const text = (selector: string) => item.querySelector(selector)?.textContent?.trim() ?? '';
        const tag = item.querySelector('[class*="_esi-level-tag_"]');
        return {
          time: text('[class*="_time_"]'),
          date: text('[class*="_date_"]'),
          label: text('[class*="_event-label_"]'),
          esi: tag?.textContent?.trim() ?? '',
          tone: tag?.className.match(/_esi-level-tag-tone-([a-z]+)_/)?.[1] ?? '',
          actor: text('[class*="_event-actor_"]'),
        };
      }),
    );
}

/** กดแท็บ Timeline ของหน้าประวัติการรักษา (เปิดหน้าประวัติการรักษาไว้ก่อน) → รอจน event คัดกรองครั้งแรกขึ้น */
export async function openTimelineTab(page: Page): Promise<Locator> {
  await timelineTab(page).click();
  const panel = timelinePanel(page);
  await expect(timelineRow(page, TIMELINE_TRIAGE_LABEL.FIRST_TRIAGE).first(), 'แท็บ Timeline ต้องมี event คัดกรองครั้งแรก').toBeVisible({ timeout: 45_000 });
  return panel;
}

/** event ของ Timeline จาก API (อ่านอย่างเดียว) — `authorization` จาก trackAuthorization() */
export async function fetchTreatmentTimeline(page: Page, authorization: string, visit: ErVisit): Promise<TimelineEvent[]> {
  const res = await page.request.get(`/cortex-api/er-treatment-timeline?hn=${encodeURIComponent(visit.hn)}&en=${encodeURIComponent(visit.en)}`, { headers: { authorization } });
  await expectOk(res, `อ่าน Treatment Timeline ของ ${visit.en} ผ่าน API`);
  return ((await res.json()) as { data?: { events?: TimelineEvent[] } }).data?.events ?? [];
}

/** ข้อความความรุนแรงของ event จาก API ในรูปแบบเดียวกับป้ายบนจอ ("ESI 3" · ไม่มีระดับ = "ESI ?" · ไม่มี event = "(ไม่มี)") */
export function timelineEventEsi(event?: TimelineEvent): string {
  if (!event) return '(ไม่มี)';
  return event.detail?.triageLevel ? `ESI ${event.detail.triageLevel}` : 'ESI ?';
}
