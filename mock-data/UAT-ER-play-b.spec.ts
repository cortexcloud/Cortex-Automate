import type { Page } from '@playwright/test';
import {
  confirmOpenErVisit,
  expectOk,
  expectTriageFormOpen,
  expectVisitHeader,
  gotoErDashboard,
  openErDashboardFromMenu,
  openErMenu,
  openTriagePage,
  openVisitDialog,
  waitForApi,
  type ErVisit,
} from '../helpers/functions/er';
import { openDisposition } from '../helpers/functions/er-disposition';
import { fetchWaitTimeSettings, restoreWaitTimeSettings } from '../helpers/functions/er-quality';
import { trackAuthorization } from '../helpers/functions/er-report';
import { ESI_BUTTON, triageForm } from '../helpers/functions/er-triage';
import { expect, test } from './fixtures';
import { COVERAGE_UC, fetchNurseTasks, nextUatPatient, recordMockPatient, registerAndOpenErVisit, savePhysicianNote, SETTINGS, submitOrders, SYSTEM } from './uat-er';
import {
  GCS_3,
  Play,
  VITALS_HIGH_MEWS,
  VITALS_NORMAL,
  boardEncounter,
  careMenu,
  chooseFirst,
  draftDischarge,
  fillTriage,
  gotoVisit,
  guard,
  loadPatients,
  mockPatient,
  nextMutation,
  options,
  pick,
  recordMenu,
  saveProgressNote,
  savePatient,
  saveTriageForm,
  signDischarge,
  type Played,
  watchMutations,
} from './uat-play';

// เล่นตามชีต "Scenario- ER" (ต่อจาก UAT-ER-play.spec.ts): UAT-ER-02 – 08, 11 – 13
// ลำดับ: 05 → 06 / 11 (ใช้ผู้ป่วยของกรณี 5.2 / 5.3) · 09 → 04 (ราย A) · 03 → 08 (ผู้ป่วย ESI 1 ที่รอเกินเป้าหมาย)

const SHARED_CC = 'อุบัติเหตุรถชน';
/** คลินิกปลายทางของกรณี 5.1 (ESI 5 ส่งต่อ OPD) — SBH Prod ผู้ใช้กำหนด "ห้องตรวจโรคอายุรกรรมทั่วไป" (R34) · dev-x ไม่มีคลินิกชื่อนี้ ใช้ตัวแรกที่ชื่อมี "อายุรกรรม" */
const REFER_CLINIC = SYSTEM === 'dev-x' ? 'อายุรกรรม' : 'ห้องตรวจโรคอายุรกรรมทั่วไป';
const VITALS_CRITICAL = { systolic: '70', diastolic: '40', pr: '140', rr: '34', temp: '36', spo2: '82', painScore: '0' };

/** ลงทะเบียนผู้ป่วยใหม่ + เปิด Visit ER สิทธิ UC (เริ่มจาก ER Dashboard) แล้วจดลง created-patients.md */
async function newErPatient(page: Page, authorization: () => string, uatNo: number, label: string, purpose: string): Promise<Played> {
  const fresh = await nextUatPatient(page, authorization(), uatNo);
  const visit = await registerAndOpenErVisit(page, fresh);
  recordMockPatient(label, fresh, visit, purpose);
  return { ...visit, name: `${fresh.firstName} ${fresh.familyName}`, citizenId: fresh.citizenId };
}

/** มุมมอง "รายการ" ของ ER Dashboard (โหลดแอปใหม่) → ค้น HN → กดแท็บ → คืนแถวของผู้ป่วย */
async function listRow(page: Page, hn: string, tab: RegExp) {
  await page.goto('/cortex/er/dashboard?view=list');
  const main = page.getByRole('main');
  await expect(main.getByRole('tab', { name: /ผู้ป่วยปัจจุบันใน ER/ })).toBeVisible({ timeout: 60_000 });
  await main.getByPlaceholder('ค้นหา HN').fill(hn);
  await main.getByRole('tab', { name: tab }).click();
  return main.getByRole('row').filter({ hasText: hn }).first();
}

/** UAT-ER-05 กรณี 5.2: คัดกรองซ้ำ → ประวัติการคัดกรอง → ลำดับบน Dashboard (ผู้ป่วยคัดกรองรอบแรกแล้ว) */
async function retriageSteps(play: Play, page: Page, authorization: () => string, p2: Played) {
  const main = page.getByRole('main');
  const form = triageForm(page);
  await play.step('กรณี 5.2 คัดกรองซ้ำ (Re-triage) เลือกระดับสูงขึ้น ESI 1 — หน้าจอแสดงระดับใหม่ ผู้ป่วยย้ายไปโซนตามระดับใหม่', async () => {
    // ปุ่ม "คัดกรองซ้ำ" อยู่ในแท็บ Triage ของหน้า Overview (แผง ER Physician Note ที่เปิดอยู่บังไว้) → เปิดหน้าผู้ป่วยใหม่
    await gotoVisit(page, p2);
    await form.getByRole('button', { name: 'redo คัดกรองซ้ำ' }).click();
    await expect(form.getByRole('heading', { name: 'การคัดกรองครั้งใหม่' })).toBeVisible();
    // ฟอร์มคัดกรองครั้งใหม่เป็นฟอร์มเปล่า — กรอกสัญญาณชีพ / GCS / อาการ ใหม่ แล้วเลือกระดับที่สูงขึ้น
    await fillTriage(page, p2, { level: 1, vitals: VITALS_CRITICAL, gcs: GCS_3, chiefComplaint: 'หมดสติ' });
    await expect(form.getByRole('button', { name: /โซนแดง ER.*แนะนำ/ })).toBeVisible();
    await saveTriageForm(page, p2);
    await expect(main.getByText(/Triage Level\s*ESI 1/).first()).toBeVisible();
    await expect(main.getByText(/Triage Zone\s*โซนแดง ER/).first()).toBeVisible();
  });
  await play.step('กรณี 5.2 ดูประวัติการคัดกรอง — ครบทุกรอบ มีเวลาและชื่อผู้คัดกรอง รอบล่าสุดมีป้าย "ปัจจุบัน"', async () => {
    const history = form.getByRole('listitem').filter({ hasText: /โดย/ });
    await expect(history).toHaveCount(2);
    const texts = (await history.allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
    console.log(`    ประวัติการคัดกรอง: ${texts.join(' | ')}`);
    expect(texts.filter((t) => t.includes('ปัจจุบัน')), 'ต้องมีรอบเดียวที่เป็น "ปัจจุบัน"').toHaveLength(1);
    for (const t of texts) expect(t, 'ชื่อผู้คัดกรองต้องเป็นชื่อคน ไม่ใช่รหัส').not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
  await play.step('กรณี 5.2 ตรวจลำดับเร่งด่วนบน ER Dashboard — ผู้ป่วยอยู่โซนแดงตามความรุนแรงใหม่', async () => {
    await openErDashboardFromMenu(page);
    const encounter = await boardEncounter(page, authorization(), p2.en);
    expect(String(encounter?.triageLevel), 'ระดับบนบอร์ด').toMatch(/1/);
    await expect(page.getByText(`HN: ${p2.hn}`, { exact: true })).toBeVisible();
  });
}

/** UAT-ER-05 กรณี 5.3: คัดกรองแบบ Suspect Fast Track + Trauma → การ์ดบน Dashboard → Section ใน ER Physician Note (อยู่หน้าผู้ป่วยที่ยังไม่คัดกรอง) */
async function fastTrackSteps(play: Play, page: Page, p3: Played) {
  const main = page.getByRole('main');
  await play.step('กรณี 5.3 คัดกรองแบบ Suspect Fast Track : Sepsis + Trauma + GCS — บันทึกได้ ผู้ป่วยขึ้นโซนบน ER Dashboard', async () => {
    await expectTriageFormOpen(page, p3);
    await fillTriage(page, p3, { level: 2, vitals: VITALS_NORMAL, fastTrack: 'Sepsis', trauma: true });
    await saveTriageForm(page, p3);
    await expect(main.getByText(/Triage Zone\s*โซนแดง ER/).first()).toBeVisible();
  });
  await play.step('กรณี 5.3 ดู Suspect Fast Track & Trauma บนการ์ดของ ER Dashboard', async () => {
    await openErDashboardFromMenu(page);
    const hnText = page.getByText(`HN: ${p3.hn}`, { exact: true });
    await expect(hnText).toBeVisible();
    const card = page.locator('div').filter({ has: hnText }).filter({ hasText: /รอ/ }).last();
    const text = (await card.innerText()).replace(/\s+/g, ' ');
    console.log(`    การ์ด: ${text.slice(0, 400)}`);
    expect(text, 'การ์ดต้องบอกว่าเป็น Trauma').toMatch(/(^|[^-])Trauma/);
    expect(text, 'การ์ดต้องบอกว่าเป็น Suspect Fast Track').toMatch(/Fast Track|Sepsis/i);
  });
  await play.step('กรณี 5.3 ดู Section Suspect Fast Track ใน ER Physician Note — มีปุ่ม Acknowledge และ Reject', async () => {
    await gotoVisit(page, p3);
    await careMenu(page, 'ER Physician Note', main.getByRole('heading', { name: 'ER Physician Note' }));
    await play.dump('fasttrack-note');
    await expect(main.getByRole('button', { name: 'Acknowledge' })).toHaveCount(3);
    await expect(main.getByRole('button', { name: 'Reject' })).toHaveCount(3);
  });
  await play.step('กรณี 5.3 Acknowledge Suspect Fast Track — ระบบแสดงข้อความยืนยันใน Section', async () => {
    const calls = await watchMutations(page, () => main.getByRole('button', { name: 'Acknowledge' }).last().click());
    console.log(`    Acknowledge Fast Track: ${calls.join(' ‖ ') || '(ไม่มีคำสั่งถูกส่ง)'}`);
    await expect(main.getByText(/^Acknowledged โดย/).last()).toBeVisible();
    await play.dump('fasttrack-ack');
  });
}

type BoardCard = { hn: string; esi: number; mews: number; fastTrack: boolean; wait: number; overdue: boolean };
type OrderRule = { name: string; value: (card: BoardCard) => number };

const FAST_TRACK_FIRST: OrderRule = { name: 'ผู้ป่วย Fast Track อยู่บนสุด', value: (c) => (c.fastTrack ? 0 : 1) };
// ราย Fast Track เรียงกันเองด้วย FIFO อย่างเดียว จึงไม่เทียบ ESI / MEWS ของกลุ่มนี้
const ESI_ASCENDING: OrderRule = { name: 'ESI น้อยไปมาก', value: (c) => (c.fastTrack ? 0 : c.esi) };
const MEWS_DESCENDING: OrderRule = { name: 'ESI เท่ากัน → MEWS สูงไปต่ำ', value: (c) => (c.fastTrack ? 0 : -c.mews) };
const FIFO: OrderRule = { name: 'FIFO (รอนานกว่าอยู่บน)', value: (c) => -c.wait };

/** กฎเรียงคิวของแต่ละคอลัมน์ตามการ์ด SBH-1684 (ข้อย่อย "เวลาเกินเป้าหมายแสดงก่อน" / "Time Stop อยู่ล่าง" ยังรอ BA ยืนยัน จึงไม่ตรวจ) */
const QUEUE_RULES: Record<string, OrderRule[]> = {
  คัดกรอง: [FIFO],
  'โซนแดง ER': [FAST_TRACK_FIRST, ESI_ASCENDING, MEWS_DESCENDING, FIFO],
  'โซนเหลือง ER': [ESI_ASCENDING, MEWS_DESCENDING, FIFO],
  'ห้องสังเกตอาการ ER': [FIFO],
};

/**
 * ลำดับการ์ดบน ER Dashboard (อยู่หน้า Dashboard แล้ว): จัดการ์ดเข้าคอลัมน์ตามตำแหน่งบนจอ อ่านค่าจากการ์ด (ESI จาก API บอร์ด) เรียงบน → ล่าง
 * `problems` = คู่การ์ดที่อยู่ติดกันแล้วผิดกฎเรียงคิวของคอลัมน์นั้น (QUEUE_RULES)
 */
async function dashboardOrder(page: Page, authorization: () => string): Promise<{ columns: string[]; problems: string[] }> {
  const zones = await page.locator('strong').evaluateAll(
    (els, names) => els.filter((el) => names.includes(el.textContent!.trim())).map((el) => ({ name: el.textContent!.trim(), x: el.getBoundingClientRect().x })),
    Object.keys(QUEUE_RULES),
  );
  const cards = await page.getByText(/^HN: \d+$/).evaluateAll((els) =>
    els.map((el) => {
      const box = el.getBoundingClientRect();
      // กรอบการ์ด = กล่องใหญ่สุดที่ยังมี HN อยู่รายเดียว
      let card = el as HTMLElement;
      while (card.parentElement && (card.parentElement.innerText.match(/HN: \d+/g) ?? []).length === 1) card = card.parentElement;
      return { hn: el.textContent!.replace('HN: ', ''), x: box.x, y: box.y + window.scrollY, text: card.innerText.replace(/\s+/g, ' ') };
    }),
  );
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date());
  const res = await page.request.get(`/cortex-api/er/dashboard/encounters?date=${today}`, { headers: { authorization: authorization() } });
  const encounters = (await res.json()) as { hn: string; triageLevel: unknown; triagedAt?: string | null; latestStatusCode: string }[];
  const levelOf = new Map(encounters.filter((e) => e.latestStatusCode !== 'cancelled').map((e) => [e.hn, e.triagedAt ? Number(String(e.triageLevel).match(/\d/)?.[0] ?? 0) : 0]));
  const columns: string[] = [];
  const problems: string[] = [];
  for (const zone of [...zones].sort((a, b) => a.x - b.x)) {
    // การ์ดอยู่ใต้หัวคอลัมน์ที่อยู่ซ้ายสุดที่ใกล้ที่สุด
    const inColumn = cards
      .filter((c) => zone === [...zones].filter((z) => z.x <= c.x + 40).sort((a, b) => b.x - a.x)[0])
      .sort((a, b) => a.y - b.y)
      .map((c): BoardCard => {
        const [, minutes = '0', seconds = '0'] = c.text.match(/รอ\s*(\d+):(\d+)\s*นาที/) ?? [];
        return { hn: c.hn, esi: levelOf.get(c.hn) ?? 0, mews: Number(c.text.match(/MEWS\s*(\d+)/)?.[1] ?? 0), fastTrack: /Fast Track/.test(c.text), wait: Number(minutes) * 60 + Number(seconds), overdue: /เกินเป้าหมาย/.test(c.text) };
      });
    const show = (c: BoardCard) => `${c.fastTrack ? 'FT · ' : ''}ESI ${c.esi || '-'} · MEWS ${c.mews} · รอ ${Math.floor(c.wait / 60)} นาที${c.overdue ? ' (เกินเป้าหมาย)' : ''} (HN ${c.hn})`;
    columns.push(`${zone.name}: ${inColumn.map(show).join(' → ') || '(ว่าง)'}`);
    for (const [index, below] of inColumn.entries()) {
      const above = inColumn[index - 1];
      if (!above) continue;
      // กฎข้อแรกที่ให้ค่าต่างกันเป็นตัวตัดสินลำดับของคู่นี้
      const rule = QUEUE_RULES[zone.name].find((r) => r.value(above) !== r.value(below));
      if (rule && rule.value(above) > rule.value(below)) problems.push(`${zone.name} ผิดกฎ "${rule.name}": ${show(above)} อยู่เหนือ ${show(below)}`);
    }
  }
  return { columns, problems };
}

/** UAT-ER-07: คัดกรองผู้ป่วยในเหตุการณ์ทีละคน → ส่ง Triage ทั้งเหตุการณ์ → Dashboard → ป้ายปลายเตียง (อยู่หน้าเหตุการณ์ที่มีผู้ป่วยแล้ว) */
async function eventTriageSteps(play: Play, page: Page, authorization: () => string, patients: Played[]) {
  const main = page.getByRole('main');
  const form = triageForm(page);
  const levels: (2 | 3)[] = [2, 3];
  const select = (index: number) => main.getByRole('heading', { name: `${index + 1}. HN ${patients[index].hn}` }).click();

  await play.step('ตรวจอาการสำคัญร่วม — Chief Complaint ของผู้ป่วยในเหตุการณ์ตรงกับอาการสำคัญร่วม', async () => {
    for (const [index] of patients.entries()) {
      await select(index);
      await expect(main.getByText(`HN ${patients[index].hn}`, { exact: true }).last()).toBeVisible();
      await expect(form.locator('textarea[placeholder="สรุปอาการและอื่น ๆ"]'), `Chief Complaint ของรายที่ ${index + 1}`).toHaveValue(new RegExp(SHARED_CC));
    }
  });

  await play.step('ระบุระดับความเร่งด่วนและโซนแยกรายคน (ต่างกัน 2 ระดับ) แล้วกด "พร้อมส่งและไปคนถัดไป" ทีละคน', async () => {
    for (const [index, patient] of patients.entries()) {
      // เล่นซ้ำกับเหตุการณ์เดิม: รายที่พร้อมส่งแล้วข้าม
      if (await main.getByRole('listitem').filter({ hasText: `HN ${patient.hn}` }).filter({ hasText: 'READY' }).count()) continue;
      await select(index);
      await expect(main.getByText(`HN ${patient.hn}`, { exact: true }).last()).toBeVisible();
      // รอฟอร์มของรายนี้โหลดเสร็จ (อาการสำคัญร่วมถูกเติมมา) ก่อนกรอก — กรอกเร็วไปค่าถูกฟอร์มที่โหลดตามมาทับ
      await expect(form.locator('textarea[placeholder="สรุปอาการและอื่น ๆ"]')).toHaveValue(new RegExp(SHARED_CC));
      // ช่องบังคับ อุปกรณ์ช่วยเหลือ / ผู้ที่มาด้วย ของหน้าเหตุการณ์ (ไม่ได้อยู่ใน region เหมือนหน้าคัดกรองรายเดียว)
      for (const [nth, title] of [
        [1, 'ไม่มี'],
        [2, 'ญาติ'],
      ] as const) {
        const box = main.getByText('วิธีการมาถึง', { exact: true }).last().locator(`xpath=following::input[@role="combobox"][${nth}]/ancestor::div[contains(concat(" ", @class, " "), " ant-select ")][1]`);
        if (await box.locator(`.ant-select-content-value[title="${title}"]`).count()) continue;
        await box.click();
        await pick(page.locator(`.ant-select-dropdown:visible .ant-select-item-option[title="${title}"]`));
      }
      await fillTriage(page, patient, { level: levels[index], vitals: VITALS_NORMAL, chiefComplaint: '' });
      await expect(form.getByRole('button', { name: index ? /โซนเหลือง ER.*แนะนำ/ : /โซนแดง ER.*แนะนำ/ })).toBeVisible();
      await expect(form.getByRole('button', { name: 'เลือกคะแนน' }), 'GCS ต้องครบทั้ง E / V / M').toHaveCount(0);
      await play.dump(`ready-${index + 1}`);
      const calls = await watchMutations(page, () => main.getByRole('button', { name: /พร้อมส่งและไปคนถัดไป/ }).click());
      console.log(`    พร้อมส่ง รายที่ ${index + 1}: ${calls.map((call) => call.slice(0, 300)).join(' ‖ ') || '(ไม่มีคำสั่งถูกส่ง)'}`);
      await expect(main.getByText(new RegExp(`พร้อมส่ง ${index + 1} ราย`)), `กด "พร้อมส่งและไปคนถัดไป" แล้วรายที่ ${index + 1} ต้องนับเป็นพร้อมส่ง`).toBeVisible();
    }
    await expect(main.getByText(/พร้อมส่ง 2 ราย/)).toBeVisible();
  });

  await play.step('ส่ง Triage ทั้งเหตุการณ์ — ปุ่มกดได้เมื่อทุกคนพร้อมส่ง · ผู้ป่วยทุกรายเข้าโซนตามที่ระบุ', async () => {
    const submit = main.getByRole('button', { name: 'ส่ง Triage ทั้งเหตุการณ์' });
    await expect(submit).toBeEnabled();
    const calls = await watchMutations(page, () => submit.click());
    console.log(`    ส่ง Triage ทั้งเหตุการณ์: ${calls.map((c) => c.slice(0, 260)).join(' ‖ ') || '(ไม่มีคำสั่งถูกส่ง)'}`);
    await play.dump('submitted');
    await expect(async () => {
      for (const [index, patient] of patients.entries()) {
        expect(String((await boardEncounter(page, authorization(), patient.en))?.triageLevel), `ระดับของรายที่ ${index + 1} บนบอร์ด`).toContain(String(levels[index]));
      }
    }).toPass({ timeout: 30_000 });
  });

  await play.step('ตรวจการเรียงลำดับบน ER Dashboard — ผู้ป่วยเรียงตามความรุนแรงในแต่ละโซน', async () => {
    await gotoErDashboard(page);
    for (const patient of patients) await expect(page.getByText(`HN: ${patient.hn}`, { exact: true })).toBeVisible();
    const { columns, problems } = await dashboardOrder(page, authorization);
    for (const column of columns) console.log(`    ${column}`);
    expect(problems, 'การ์ดในแต่ละคอลัมน์ต้องเรียงตามกฎเรียงคิวของการ์ด SBH-1684').toEqual([]);
  });

  await play.step('พิมพ์ป้ายปลายเตียงทุกราย — ได้ป้าย (PDF) ของทุกราย', async () => {
    for (const patient of patients) {
      await gotoVisit(page, patient);
      const pdf = guard(page.waitForResponse((res) => res.url().includes(`/er/encounters/${patient.en}/bedside-name-badge/pdf`), { timeout: 30_000 }));
      await main.getByRole('button', { name: 'พิมพ์ป้ายปลายเตียง' }).first().click();
      const res = await pdf;
      await expectOk(res, `ขอ PDF ป้ายปลายเตียงของ ${patient.en}`);
      expect(res.headers()['content-type']).toContain('application/pdf');
    }
  });
}

/** UAT-ER-04: Admit Request → แท็บผู้ป่วยรอเตียง → สร้าง AN (ไม่เลือกเตียง R30) — อยู่หน้าผู้ป่วยของ Visit ER */
/** คำสั่งเปลี่ยนข้อมูลทุกตัวที่หน้าเว็บส่งระหว่าง `body` ไม่จำกัดชุด API (watchMutations ดูเฉพาะ cortex-api / emr-api / ehrbase) — ใช้กับขั้น Admit */
async function watchAllMutations(page: Page, body: () => Promise<unknown>): Promise<string[]> {
  const calls: Promise<string>[] = [];
  const listener = (res: Awaited<ReturnType<Page['waitForResponse']>>) => {
    const req = res.request();
    const post = req.postData() ?? '';
    if (['GET', 'OPTIONS', 'HEAD'].includes(req.method()) || /"query":"(\n|\s)*query\s/.test(post) || /preview|drafts|transform-composition/.test(res.url())) return;
    const name = post.match(/mutation\s+(\w+)/)?.[1] ?? '';
    calls.push(res.text().then((text) => `${req.method()} ${new URL(res.url()).pathname} ${name} → ${res.status()} ${text.replace(/\s+/g, ' ').slice(0, 300)}`, () => `${req.method()} ${res.url()} → ${res.status()}`));
  };
  page.on('response', listener);
  try {
    await body();
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  } finally {
    page.off('response', listener);
  }
  return Promise.all(calls);
}

async function admitSteps(play: Play, page: Page, a: Played) {
  const main = page.getByRole('main');
  // ER04_SKIP_REQUEST=1: ผู้ป่วยมี Admit Request แล้ว เล่นต่อจากขั้นสร้าง AN
  if (!process.env.ER04_SKIP_REQUEST) await play.step('สร้าง Admit Request ส่งไปศูนย์จัดการเตียง (เมนู "สร้าง Admit Order")', async () => {
    await careMenu(page, 'สร้าง Admit Order', main.getByText('Admit Request Form').first());
    const diagnosis = await chooseFirst(page, main, /Pre-diagnosis/, 'K30');
    await main.getByText(/Chief Complaint :/).first().locator('xpath=following::*[self::input or self::textarea][1]').fill('ปวดท้อง ต้องนอนโรงพยาบาล (UAT-ER-04)');
    // ปุ่มยืนยัน = ปุ่ม check หัวแผง (ปุ่ม "Admit Order" ด้านล่างแค่กางส่วนสั่ง Order) — กดได้เมื่อกางแบบฟอร์ม Admit Request แล้วเลือกหอผู้ป่วย
    const confirm = main.getByRole('button', { name: 'check', exact: true }).first();
    await main.getByRole('button', { name: 'plus แบบฟอร์ม' }).click();
    console.log(`    หอผู้ป่วยที่ขอ Admit: ${await chooseFirst(page, main, /หอผู้ป่วย :/)}`);
    // "จากแผนก" ไม่มีดอกจัน แต่ผู้ใช้ชี้ว่าต้องกรอกด้วย (3 ต.ค. 2026) — เลือกแผนกฉุกเฉินถ้ามี ไม่มีก็ตัวแรก
    await main.getByText(/จากแผนก :/).first().locator('xpath=following::div[contains(concat(" ", @class, " "), " ant-select ")][1]').click();
    await expect(options(page).first()).toBeVisible();
    const emergency = options(page).filter({ hasText: /ฉุกเฉิน|ER|Emergency/i }).first();
    const department = (await emergency.count()) ? emergency : options(page).first();
    console.log(`    จากแผนก: ${(await department.innerText()).trim()} (ตัวเลือกที่เห็น: ${(await options(page).allInnerTexts()).map((text) => text.trim()).join(' | ')})`);
    await pick(department);
    await expect(confirm, 'กรอก Pre-diagnosis + Chief Complaint + หอผู้ป่วย + จากแผนก แล้วปุ่มยืนยัน (check) ต้องกดได้').toBeEnabled({ timeout: 8_000 });
    // กดปุ่ม check แล้วมีหน้าต่าง "ยืนยันการส่ง Admit Request ?" → ยืนยัน
    const dialog = page.getByRole('dialog', { name: /ยืนยันการส่ง Admit Request/ });
    const calls = await watchAllMutations(page, async () => {
      await confirm.click();
      await dialog.getByRole('button', { name: /ยืนยัน/ }).click();
      await expect(dialog).toBeHidden();
    });
    console.log(`    Admit Order (${diagnosis}): ${calls.join(' ‖ ') || '(ไม่มีคำสั่งถูกส่ง)'}`);
    await play.dump('admit-order-after');
    expect(calls.join(' '), 'ยืนยัน Admit Request แล้วต้องมีคำสั่งที่สำเร็จ').toMatch(/→ 20\d/);
    expect(calls.join(' '), 'ต้องไม่มีคำสั่งที่ตอบ error').not.toMatch(/→ [45]\d\d|"errors":\[/);
  });

  if (!process.env.ER04_SKIP_REQUEST) await play.step('ผู้ป่วยที่สร้างคำขอ Admit แสดงในแท็บ "ผู้ป่วยรอเตียง" ของหน้ารายการ', async () => {
    await expect(await listRow(page, a.hn, /ผู้ป่วยรอเตียง/)).toBeVisible();
  });

  await play.step('สร้าง AN (Convert EN เป็น AN) ที่ "จัดการ Admission" โดยไม่เลือกเตียง — ผู้ป่วยได้เลข AN', async () => {
    await gotoVisit(page, a);
    await careMenu(page, 'จัดการ Admission', main.getByText('รายละเอียด Admit').first());
    await main.getByRole('checkbox', { name: 'พิมพ์สติ๊กเกอร์ AN เมื่อบันทึก' }).uncheck();
    // ไม่เลือกเตียง (R30) — ช่อง "เลขเตียง" ไม่บังคับ
    // ช่องต่างกันต่อระบบ: dev-x มี "Location ที่รับผิดชอบ" · SBH Prod มี "แผนก" (ไม่มีดอกจัน) → ข้ามช่องที่ไม่มีบนจอ
    for (const label of [/หอผู้ป่วย :/, /Location ที่รับผิดชอบ/, /^แผนก :/, /Admitting Diagnosis :/, /ประเภทการรับ Admit :/, /รับ Admit จาก :/]) {
      if (!(await main.getByText(label).first().isVisible())) continue;
      console.log(`    ${label}: ${await chooseFirst(page, main, label, label.source.includes('Diagnosis') ? 'K30' : undefined)}`);
    }
    // ปุ่มบันทึก = ปุ่ม check ข้างหัวข้อ "ข้อมูล AN"
    // กดแล้วมีหน้าต่าง "ยืนยันการสร้าง AN ?" → ยืนยัน
    const dialog = page.getByRole('dialog', { name: /ยืนยันการสร้าง AN/ });
    // คำสั่งสร้าง AN ไม่ผ่าน API ที่ดักได้ (dev-x 3 ต.ค. 2026 ได้รายการว่าง) → ยืนยันผลจากข้อความแจ้ง "บันทึกข้อมูลสำเร็จ AN <เลข>"
    const saved = page.getByText(/AN \d{5,}/).first();
    const calls = await watchAllMutations(page, async () => {
      await main.getByText('ข้อมูล AN', { exact: true }).locator('xpath=following::button[1]').click();
      await dialog.getByRole('button', { name: /ยืนยัน/ }).click();
      await expect(saved, 'ยืนยันสร้าง AN แล้วต้องมีข้อความแจ้งเลข AN').toBeVisible();
      console.log(`    AN ที่ได้: ${(await saved.innerText()).replace(/\s+/g, ' ')}`);
    });
    console.log(`    Admission: ${calls.join(' ‖ ') || '(ไม่เห็นคำสั่งผ่าน API ที่ดักได้)'}`);
    await play.dump('admission-after');
    expect(calls.join(' '), 'ต้องไม่มีคำสั่งที่ตอบ error').not.toMatch(/→ [45]\d\d|"errors":\[/);
  });
}

/** UAT-ER-04: คอลัมน์ Lab / IMG ของผู้ป่วยในมุมมอง "รายการ" */
async function labStatusStep(play: Play, page: Page, a: Played) {
  const main = page.getByRole('main');
  await play.step('ติดตามสถานะ Lab / IMG ในมุมมอง "รายการ" — คอลัมน์ขึ้นสถานะรอผลหลังแพทย์สั่ง', async () => {
    await page.goto('/cortex/er/dashboard?view=list');
    await expect(main.getByRole('tab', { name: /ผู้ป่วยปัจจุบันใน ER/ })).toBeVisible({ timeout: 60_000 });
    await main.getByPlaceholder('ค้นหา HN').fill(a.hn);
    const row = main.getByRole('row').filter({ hasText: a.hn }).first();
    // ผู้ป่วยอยู่แท็บไหนขึ้นกับสถานะหลังจำหน่าย → ไล่แท็บที่ตัวนับไม่เป็น 0
    await expect(async () => {
      for (const tab of await main.getByRole('tab').filter({ hasNotText: / 0$/ }).all()) {
        await tab.click();
        // รายการของแท็บโหลดตามหลังการกด → รอแถวสั้นๆ ก่อนไปแท็บถัดไป
        if (await row.waitFor({ state: 'visible', timeout: 4_000 }).then(() => true, () => false)) {
          console.log(`    ราย A อยู่แท็บ: ${(await tab.innerText()).replace(/\s+/g, ' ')}`);
          return;
        }
      }
      throw new Error(`ไม่เจอ HN ${a.hn} ในแท็บใดของมุมมองรายการ`);
    }).toPass({ timeout: 30_000 });
    const icons = await row.getByRole('img').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')).filter(Boolean));
    console.log(`    แถวราย A: ${(await row.innerText()).replace(/\s+/g, ' ')} | ไอคอน: ${icons.join(', ')}`);
    expect(icons.join(' '), 'ต้องมีไอคอนแจ้งเตือนผล LAB ในแถว').toMatch(/LAB/i);
    play.note('ผล Lab / IMG ยังไม่ถูกส่งกลับ จึงตรวจได้แค่สถานะ "รอผล" — ยังไม่ได้เห็นคอลัมน์เปลี่ยนเมื่อผลออกครบ (ชีต ER Issue ข้อ 3)');
  });
}

test.describe(`เล่น Scenario UAT ER (${SYSTEM})`, () => {
  test.setTimeout(900_000);

  test('UAT-ER-02 ผู้ป่วยใหม่ไม่มี HN มา ER ครั้งแรก', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-02');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    await gotoErDashboard(page);
    const fresh = await nextUatPatient(page, authorization(), 2);
    let dialog = openVisitDialog(page);
    let hn = '';

    await play.step('ลงทะเบียนผู้ป่วยใหม่ (สร้าง HN) — ได้ HN ใหม่ ไม่ต้องกรอกที่อยู่', async () => {
      const { registerNewPatient } = await import('../helpers/functions/er');
      await openTriagePage(page);
      ({ hn, dialog } = await registerNewPatient(page, fresh));
      play.note('ไม่ได้บันทึกรูปภาพตอนลงทะเบียน (R31 ข้อ 5.3 ไม่อัปโหลดรูป)');
    });
    const visit = await play.step('เปิด Visit ER — ขึ้น "สร้าง Visit สำเร็จ" และได้เลข EN', async () => {
      const opened = await confirmOpenErVisit(page, dialog, COVERAGE_UC);
      await expectVisitHeader(page, opened);
      return opened;
    });
    if (!visit) {
      play.finish();
      throw new Error(`UAT-ER-02: เปิด Visit ER ให้ HN ${hn} ไม่สำเร็จ`);
    }
    const patient: Played = { ...visit, name: `${fresh.firstName} ${fresh.familyName}`, citizenId: fresh.citizenId };
    play.patient('เปิดใหม่', patient);
    savePatient('er02', patient);
    recordMockPatient('เล่น 02', fresh, visit, 'UAT-ER-02 ผู้ป่วยใหม่');

    await play.step('คัดกรองและเลือกโซน — ผู้ป่วยขึ้นคอลัมน์โซนที่เลือกบน ER Dashboard และแสดงระดับความเร่งด่วน', async () => {
      await expectTriageFormOpen(page, visit);
      await fillTriage(page, visit, { level: 4, vitals: VITALS_NORMAL });
      await saveTriageForm(page, visit);
      await expect(main.getByText(/Triage Zone\s*โซนเหลือง ER/).first()).toBeVisible();
      expect((await boardEncounter(page, authorization(), visit.en))?.triageLevel).toBeTruthy();
    });

    await play.step('พิมพ์ป้ายปลายเตียง — ได้ป้าย (PDF) ที่มีชื่อผู้ป่วย เลข EN และวันเวลา', async () => {
      const pdf = guard(page.waitForResponse((res) => res.url().includes('/bedside-name-badge/pdf'), { timeout: 30_000 }));
      await main.getByRole('button', { name: 'พิมพ์ป้ายปลายเตียง' }).first().click();
      const res = await pdf;
      await expectOk(res, 'ขอ PDF ป้ายปลายเตียง');
      expect(res.headers()['content-type']).toContain('application/pdf');
      expect((await res.body()).length, 'ไฟล์ PDF ต้องมีเนื้อหา').toBeGreaterThan(5_000);
    });

    await play.step('บันทึก ER Physician Note — บันทึกสำเร็จ เปิดดูซ้ำแล้วข้อมูลยังอยู่', async () => {
      await savePhysicianNote(page);
      await expect(main.getByText(/แก้ไขล่าสุดโดย/).first()).toBeVisible();
    });

    await play.step('เริ่ม Disposition เลือก With Approval กรอกช่องบังคับ — สถานะ DRAFT', async () => {
      await openDisposition(page);
      expect(await draftDischarge(page, 'With Approval')).toBe('DRAFT');
    });

    await play.step('ลงนามเอกสาร Disposition + กรณีไม่มีที่อยู่กด "ลงนามต่อ" — ลงนามสำเร็จ', async () => {
      const { askedAddress } = await signDischarge(page);
      expect(askedAddress, 'ผู้ป่วยไม่มีที่อยู่ ต้องขึ้นหน้าต่าง "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" ให้กด "ลงนามต่อ"').toBe(true);
      await expect(main.getByRole('button', { name: 'เปิดแก้ไข' })).toBeVisible();
    });
    play.finish();
  });

  test('UAT-ER-03 ผู้ป่วยไม่ทราบตัวตน หมดสติ ต้องกู้ชีพ', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-03');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    await gotoErDashboard(page);
    const fresh = await nextUatPatient(page, authorization(), 3);
    let hn = '';

    await play.step('ลงทะเบียนผู้ป่วยระบุตัวตนไม่ได้ — ได้ HN ชั่วคราว (Dummy) และชื่อสมมติแสดงบนหัวจอ', async () => {
      await openTriagePage(page);
      await page.locator('label').filter({ hasText: 'ผู้ป่วยระบุตัวตนไม่ได้' }).click();
      await page.getByRole('textbox', { name: 'ชื่อชั่วคราว' }).fill(fresh.firstName);
      await page.getByRole('textbox', { name: /นามสกุล/ }).fill(fresh.familyName);
      await page.getByLabel(/อายุโดยประมาณ/).fill('40');
      await page.getByRole('combobox', { name: /เพศ/ }).click();
      await page.locator('.ant-select-item-option[title="ชาย"]').click();
      const registered = guard(waitForApi(page, 'POST', '/cortex-api/patients/er-registration'));
      await page.getByRole('button', { name: 'ลงทะเบียนผู้ป่วยไม่ทราบชื่อ' }).click();
      const res = await registered;
      await expectOk(res, 'ลงทะเบียนผู้ป่วยระบุตัวตนไม่ได้');
      hn = ((await res.json()) as { patient: { data: { hn: string } } }).patient.data.hn;
      const dialog = openVisitDialog(page);
      await expect(dialog.getByText(`HN ${hn}`, { exact: true })).toBeVisible();
      await expect(dialog).toContainText(fresh.firstName);
      if (!(await dialog.getByText(/Dummy|ชั่วคราว|ไม่ระบุตัวตน|ระบุตัวตนไม่ได้/).count())) play.note(`ผู้ป่วยระบุตัวตนไม่ได้ได้ HN เลขปกติ (${hn}) ไม่มีป้ายบอกว่าเป็น HN ชั่วคราว / Dummy`);
    });
    const visit = await play.step('เปิด Visit ER — ได้เลข EN และระบบเปิดฟอร์มคัดกรองต่อทันที', async () => {
      const opened = await confirmOpenErVisit(page, openVisitDialog(page), COVERAGE_UC);
      await expectTriageFormOpen(page, opened);
      return opened;
    });
    if (!visit) {
      play.finish();
      throw new Error(`UAT-ER-03: เปิด Visit ER ให้ HN ${hn} ไม่สำเร็จ`);
    }
    const patient: Played = { ...visit, name: `${fresh.firstName} ${fresh.familyName}` };
    play.patient('เปิดใหม่ (ระบุตัวตนไม่ได้)', patient);
    savePatient('er03', patient);
    recordMockPatient('เล่น 03', { ...fresh, citizenId: '(ไม่ระบุตัวตน)' }, visit, 'UAT-ER-03 ผู้ป่วยระบุตัวตนไม่ได้ ESI 1');
    const form = triageForm(page);

    await play.step('คัดกรอง ESI 1 พร้อม GCS — MEWS คำนวณเอง และระบบเลือกโซนแดงให้', async () => {
      await fillTriage(page, visit, { vitals: VITALS_CRITICAL, gcs: GCS_3, chiefComplaint: 'หมดสติ' });
      await form.getByRole('button', { name: ESI_BUTTON[1] }).click();
      await expect(form.getByText(/Total MEWS\s*\d+/).first()).toBeVisible();
      await expect(form.getByRole('button', { name: /โซนแดง ER.*แนะนำ/ })).toBeVisible();
    });
    await play.step('ตรวจโซนแดงและบันทึก — ผู้ป่วยขึ้นคอลัมน์โซนแดง ER บน ER Dashboard', async () => {
      await saveTriageForm(page, visit);
      await expect(main.getByText(/Triage Zone\s*โซนแดง ER/).first()).toBeVisible();
    });

    await play.step('บันทึก CPR Progression (วันเวลา · Rhythm · CPR Mark เริ่ม / หยุด) — บันทึกได้ ย้อนดูรายการเรียงตามเวลา', async () => {
      await careMenu(page, 'CPR Progression', main.getByRole('heading', { name: 'CPR Progression' }));
      const event = main.getByRole('region', { name: 'CPR Event' });
      await event.getByRole('button', { name: 'VF', exact: true }).click();
      await main.getByRole('textbox', { name: /Add CPR comment/ }).fill('เริ่ม CPR (UAT-ER-03)');
      const started = nextMutation(page, /cpr|contribution|composition/i, 30_000);
      await main.getByRole('button', { name: 'Start CPR' }).click();
      const res = await started;
      console.log(`    Start CPR: ${res.request().method()} ${new URL(res.url()).pathname} → ${res.status()}`);
      await expectOk(res, 'Start CPR');
      await play.dump('cpr-started');
      // หยุด CPR: เลือก CPR Mark แล้วบันทึกเหตุการณ์
      await event.getByRole('combobox', { name: /CPR Mark/ }).selectOption({ label: 'CPR Discontinued' });
      const stopped = nextMutation(page, /cpr|contribution|composition/i, 30_000);
      await main.getByRole('button', { name: /Record|บันทึก|Save|Stop|Add/i }).filter({ visible: true }).last().click();
      await expectOk(await stopped, 'บันทึก CPR Mark หยุด CPR');
    });

    await play.step('บันทึก Doctor Progress Note (S O A P) — แสดงในรายการพร้อมวันเวลาและชื่อผู้บันทึก', async () => {
      await saveProgressNote(page, 'หลังกู้ชีพ (UAT-ER-03)');
    });

    await play.step('Disposition แบบ Admission (รับไว้รักษาต่อIPD) และลงนาม — ลงนามได้ · ถ้าขึ้น "ผู้ป่วยยังไม่มีข้อมูลที่อยู่" กด "ลงนามต่อ" ได้', async () => {
      await openDisposition(page);
      expect(await draftDischarge(page, 'รับไว้รักษาต่อIPD')).toBe('DRAFT');
      await signDischarge(page);
    });
    play.finish();
  });

  // ขั้นของ UAT-ER-03 ที่รอบแรกสคริปต์ทำไม่ผ่าน / ยังไม่ได้ตรวจผล — เล่นซ้ำกับผู้ป่วยรายเดิม
  test('UAT-ER-03-ต่อ ตรวจรายการ CPR ที่บันทึก + Doctor Progress Note กับผู้ป่วยรายเดิม', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-03-ต่อ');
    const patient = loadPatients()['er03'];
    const main = page.getByRole('main');
    await gotoVisit(page, patient);
    await play.step('ย้อนดูรายการ CPR ที่บันทึกไว้ (ประวัติการรักษา → CPR Progression) เรียงตามเวลา', async () => {
      await recordMenu(page, 'ประวัติการรักษา');
      await main.getByRole('tab', { name: 'CPR Progression' }).click();
      const summary = main.getByRole('tabpanel', { name: 'CPR Progression' }).getByRole('region', { name: 'CPR episode summary' });
      await expect(summary).toContainText('CPR Discontinued');
      await expect(summary.getByText(/CPR Timeline \([2-9]\)/)).toBeVisible();
    });
    await play.step('บันทึก Doctor Progress Note (S O A P) — แสดงในรายการพร้อมวันเวลาและชื่อผู้บันทึก', async () => {
      await saveProgressNote(page, 'หลังกู้ชีพ (UAT-ER-03)');
    });
    play.finish();
  });

  test('UAT-ER-04 ผู้ป่วย ER ต้องนอนโรงพยาบาล รอเตียง (Mock ราย A)', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-04');
    const a = mockPatient('A');
    play.patient('Mock ราย A', a);
    const main = page.getByRole('main');
    await gotoVisit(page, a);

    await play.step('Disposition แบบ Admission (รับไว้รักษาต่อIPD) และลงนาม — ลงนามสำเร็จ', async () => {
      await openDisposition(page);
      expect(await draftDischarge(page, 'รับไว้รักษาต่อIPD')).toBe('DRAFT');
      await signDischarge(page);
    });

    await admitSteps(play, page, a);

    await play.step('ดู Treatment Timeline (ประวัติการรักษา → Timeline) — กิจกรรมตั้งแต่เปิด Visit ถึง Disposition เรียงตามเวลา พร้อมชื่อผู้บันทึก', async () => {
      await gotoVisit(page, a);
      await recordMenu(page, 'ประวัติการรักษา');
      await main.getByRole('tab', { name: 'Timeline' }).click();
      const timeline = main.getByRole('tabpanel', { name: 'Timeline' });
      await expect(timeline).toContainText('เปิด ER Visit');
      const text = (await timeline.innerText()).replace(/\s+/g, ' ');
      console.log(`    Timeline: ${text.slice(0, 900)}`);
      expect(text, 'Timeline ต้องมีรายการ Disposition / จำหน่าย').toMatch(/จำหน่าย|Disposition/i);
    });

    await labStatusStep(play, page, a);
    play.finish();
  });

  // ขั้นของ UAT-ER-04 หลังลงนาม Disposition แล้ว — เล่นซ้ำกับราย A คนเดิม
  test('UAT-ER-04-ต่อ Admit Request / AN / สถานะ Lab กับราย A คนเดิม', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-04-ต่อ');
    const a = mockPatient('A');
    await gotoVisit(page, a);
    // ER04_SKIP_ADMIT=1: ราย A มี Admit Request + AN แล้ว ดูแค่สถานะ Lab / IMG
    if (!process.env.ER04_SKIP_ADMIT) await admitSteps(play, page, a);
    await labStatusStep(play, page, a);
    play.finish();
  });

  test('UAT-ER-05 คัดกรองแรกรับ (ESI 5) และคัดกรองซ้ำประเมินอาการ', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-05');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    const form = triageForm(page);

    // ───── กรณี 5.1 (Mock ราย B): ESI 5 → โซนเขียว → ส่งต่อ OPD
    const b = mockPatient('B');
    play.patient('Mock ราย B (กรณี 5.1)', b);
    await gotoVisit(page, b);
    await play.step('กรณี 5.1 คัดกรอง ESI 5 — ระบบเสนอโซนเขียว (Green Zone)', async () => {
      await expectTriageFormOpen(page, b);
      await fillTriage(page, b, { level: 5, vitals: VITALS_NORMAL });
      await expect(form.getByRole('button', { name: /โซนเขียว ER.*แนะนำ/ })).toBeVisible();
    });
    await play.step('กรณี 5.1 ส่งต่อผู้ป่วยไปตรวจที่ OPD (หน้าต่าง "ส่งต่อไปคลินิก" หลังบันทึก)', async () => {
      await saveTriageForm(page, b);
      const dialog = page.getByRole('dialog', { name: 'ส่งต่อไปคลินิก' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('combobox').click();
      await page.keyboard.type(REFER_CLINIC);
      await expect(options(page).first()).toBeVisible();
      // ช่องนี้พิมพ์แล้วรายการไม่ถูกกรองทุกครั้ง (SBH Prod ตัวแรกเป็นคลินิกเวชศาสตร์ฉุกเฉิน) → เลือกจากชื่อ ไม่ใช่ตัวแรก
      console.log(`    คลินิกปลายทางที่เห็น: ${(await options(page).allInnerTexts()).map((text) => text.trim()).join(' | ')}`);
      const target = SYSTEM === 'dev-x' ? options(page).filter({ hasText: REFER_CLINIC }).first() : options(page).filter({ hasText: new RegExp(`^${REFER_CLINIC}$`) }).first();
      await expect(target, `ต้องมีคลินิกปลายทาง "${REFER_CLINIC}" ให้เลือก`).toBeVisible();
      const clinic = (await target.innerText()).trim();
      await pick(target);
      const sent = nextMutation(page, /cortex-api/, 30_000);
      await dialog.getByRole('button', { name: 'ส่งต่อ', exact: true }).click();
      const res = await sent;
      console.log(`    ส่งต่อ → ${clinic}: ${res.request().method()} ${new URL(res.url()).pathname} ${(res.request().postData() ?? '').slice(0, 160)} → ${res.status()} ${(await res.text()).slice(0, 300)}`);
      await expectOk(res, 'ส่งต่อไปคลินิก');
      const row = await listRow(page, b.hn, /ส่งคลินิกอื่น/);
      await row.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
      console.log(`    แท็บของมุมมองรายการ (ค้น HN ${b.hn}): ${(await main.getByRole('tab').allInnerTexts()).map((text) => text.replace(/\s+/g, ' ')).join(' | ')}`);
      await expect(row, 'ผู้ป่วยต้องอยู่แท็บ "ส่งคลินิกอื่น"').toBeVisible();
    });
    // ER05_ONLY_51=1: เล่นเฉพาะกรณี 5.1 (ไม่เปิดผู้ป่วยใหม่ของกรณี 5.2 / 5.3)
    if (process.env.ER05_ONLY_51) {
      play.finish();
      return;
    }

    // ───── กรณี 5.2 (เปิดใหม่): ESI 2 MEWS สูง → แจ้งเตือน → Acknowledge → คัดกรองซ้ำ ESI 1
    await gotoErDashboard(page);
    const p2 = await play.step('กรณี 5.2 เปิด Visit ER ผู้ป่วยใหม่ (ยังไม่คัดกรอง)', async () => {
      const patient = await newErPatient(page, authorization, 5, 'เล่น 05 (5.2)', 'UAT-ER-05 กรณี 5.2 คัดกรองซ้ำ · UAT-ER-06 · UAT-ER-11');
      play.patient('เปิดใหม่ (กรณี 5.2)', patient);
      savePatient('er05-2', patient);
      return patient;
    });
    if (p2) {
      await play.step('กรณี 5.2 คัดกรองรอบแรก สัญญาณชีพทำให้ MEWS สูง ระดับ ESI 2 — แสดงข้อมูลคัดกรองรอบแรก', async () => {
        await expectTriageFormOpen(page, p2);
        await fillTriage(page, p2, { level: 2, vitals: VITALS_HIGH_MEWS, chiefComplaint: 'หายใจลำบาก' });
        console.log(`    ${(await form.getByText(/Total MEWS\s*\d+/).first().innerText()).replace(/\s+/g, ' ')}`);
        await saveTriageForm(page, p2);
        await expect(main.getByText(/Triage Level\s*ESI 2/).first()).toBeVisible();
      });
      await play.step('กรณี 5.2 ดูแจ้งเตือน MEWS ที่หน้า EMR ของผู้ป่วย และที่หน้า Patient list', async () => {
        const header = main.getByText(/MEWS \d+ · ความเสี่ยง/).first();
        await expect(header).toBeVisible();
        console.log(`    หัวจอ: ${(await header.innerText()).replace(/\s+/g, ' ')}`);
        expect(await header.innerText(), 'MEWS ต้องอยู่ระดับเสี่ยงสูง').toMatch(/สูง/);
        const row = await listRow(page, p2.hn, /ผู้ป่วยปัจจุบันใน ER/);
        await expect(row).toBeVisible();
        console.log(`    แถวในรายการ: ${(await row.innerText()).replace(/\s+/g, ' ')}`);
      });
      await play.step('กรณี 5.2 Acknowledge แจ้งเตือน MEWS โดยพิมพ์ข้อความประกอบ — เป็น "รับทราบแล้ว" พร้อมชื่อผู้กดและเวลา · ไม่พิมพ์ข้อความกดไม่ได้', async () => {
        await gotoVisit(page, p2);
        await careMenu(page, 'ER Physician Note', main.getByRole('heading', { name: 'ER Physician Note' }));
        await play.dump('mews-ack');
        const acknowledge = main.getByRole('button', { name: 'Acknowledge' }).first();
        await expect(acknowledge).toBeVisible();
        if (await acknowledge.isEnabled()) play.note('ปุ่ม Acknowledge ของ MEWS กดได้ทั้งที่ยังไม่พิมพ์ข้อความประกอบ (ชีตคาดว่าต้องพิมพ์ก่อนจึงกดได้)');
        const done = nextMutation(page, /treatment-start|acknowledg|contribution/i);
        await acknowledge.click();
        await expectOk(await done, 'Acknowledge MEWS');
        await expect(main.getByText(/^Acknowledged โดย/).first()).toBeVisible();
      });
      await retriageSteps(play, page, authorization, p2);
    }

    // ───── กรณี 5.3 (เปิดใหม่): Suspect Fast Track + Trauma
    const p3 = await play.step('กรณี 5.3 เปิด Visit ER ผู้ป่วยใหม่ (ยังไม่คัดกรอง)', async () => {
      if (!/\/er\/dashboard/.test(page.url())) await gotoErDashboard(page);
      const patient = await newErPatient(page, authorization, 5, 'เล่น 05 (5.3)', 'UAT-ER-05 กรณี 5.3 Fast Track + Trauma · UAT-ER-11');
      play.patient('เปิดใหม่ (กรณี 5.3)', patient);
      savePatient('er05-3', patient);
      return patient;
    });
    if (p3) {
      await fastTrackSteps(play, page, p3);
    }
    play.finish();
  });

  // ขั้นของ UAT-ER-05 ที่รอบแรกสคริปต์ทำไม่ผ่าน — เล่นซ้ำกับผู้ป่วยกรณี 5.2 / 5.3 ชุดเดิม
  test('UAT-ER-05-ต่อ คัดกรองซ้ำ (5.2) + Fast Track / Trauma (5.3) กับผู้ป่วยชุดเดิม', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-05-ต่อ');
    const authorization = trackAuthorization(page);
    const { 'er05-2': p2, 'er05-3': p3 } = loadPatients();
    await gotoVisit(page, p2);
    await retriageSteps(play, page, authorization, p2);
    await gotoVisit(page, p3);
    await fastTrackSteps(play, page, p3);
    play.finish();
  });

  test('UAT-ER-06 แพทย์บันทึกการรักษาต่อเนื่องหลายรอบ (ผู้ป่วยกรณี 5.2)', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-06');
    // ตั้งต้นใช้ผู้ป่วยกรณี 5.2 — เปลี่ยนรายได้ด้วย ER06_PATIENT (ชื่อใน patients.json เช่น er05-3)
    const key = process.env.ER06_PATIENT ?? 'er05-2';
    const patient = loadPatients()[key];
    play.patient(`ผู้ป่วย ${key} จากข้ออื่น (คัดกรองแล้ว อยู่ในโซน)`, patient);
    const main = page.getByRole('main');
    await gotoVisit(page, patient);

    await play.step('บันทึก Doctor Progress Note (Perform time + S O A P) — แสดงครบ S O A P หัวรายการมีวันเวลาและชื่อผู้บันทึก', async () => {
      await saveProgressNote(page, 'รอบที่ 1 (UAT-ER-06)');
    });
    await play.step('บันทึก Progress Note เพิ่มอีก 2 รอบ คนละเวลา — มีครบทุกรอบ', async () => {
      await saveProgressNote(page, 'รอบที่ 2 (UAT-ER-06)');
      await saveProgressNote(page, 'รอบที่ 3 (UAT-ER-06)');
    });
    await play.step('เปิด "ประวัติ Custom Form" — เห็นทุก Progress note เรียงตามเวลาครบ', async () => {
      await recordMenu(page, 'ประวัติการรักษา');
      await main.getByRole('tab', { name: 'ประวัติ Custom Form' }).click();
      const panel = main.getByRole('tabpanel', { name: 'ประวัติ Custom Form' });
      await play.dump('customform');
      await expect(panel.getByText(/รอบที่ 1 \(UAT-ER-06\)/).first()).toBeVisible();
      const text = (await panel.innerText()).replace(/\s+/g, ' ');
      console.log(`    ประวัติ Custom Form: ${text.slice(0, 700)}`);
      for (const round of [1, 2, 3]) expect(text, `ต้องมี Progress Note รอบที่ ${round}`).toContain(`รอบที่ ${round} (UAT-ER-06)`);
      expect(text, 'ช่อง P ต้องไม่ขึ้นเป็น none').not.toMatch(/P\s*:?\s*none/i);
      expect(text, 'ชื่อผู้บันทึกต้องไม่ใช่รหัส').not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    });
    play.finish();
  });

  test('UAT-ER-11 คิวสำหรับผู้ป่วย — พิมพ์บัตรคิว (Mock ราย B + ผู้ป่วยกรณี 5.2 / 5.3)', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-11');
    const authorization = trackAuthorization(page);
    const saved = loadPatients();
    const patients: [string, ErVisit & { name: string }][] = [
      ['Mock ราย B', mockPatient('B')],
      ['ผู้ป่วยกรณี 5.2', saved['er05-2']],
      ['ผู้ป่วยกรณี 5.3', saved['er05-3']],
    ];
    const queues: string[] = [];
    for (const [source, patient] of patients) {
      if (!patient) continue;
      play.patient(source, patient);
      await play.step(`พิมพ์บัตรคิวของ ${patient.name} (${source}) — ได้บัตรคิว ระดับความเร่งด่วนบนบัตรตรงกับที่เลือก`, async () => {
        await gotoVisit(page, patient);
        const printed = guard(
          page.waitForResponse((res) => res.request().method() !== 'GET' && /queue|slip|pdf|print/i.test(res.url()) && !/localhost/.test(res.url()), { timeout: 30_000 }),
        );
        await page.getByRole('main').getByRole('button', { name: 'printer พิมพ์บัตรคิว' }).first().click();
        const res = await printed;
        const type = res.headers()['content-type'] ?? '';
        const body = type.includes('json') ? (await res.text()).slice(0, 400) : `${type} ${(await res.body().catch(() => Buffer.alloc(0))).length} bytes`;
        console.log(`    บัตรคิว: ${res.request().method()} ${new URL(res.url()).pathname} ${(res.request().postData() ?? '').slice(0, 200)} → ${res.status()} ${body}`);
        await expectOk(res, 'พิมพ์บัตรคิว');
        const encounter = await boardEncounter(page, authorization(), patient.en);
        queues.push(`${patient.name}: คิว ${JSON.stringify((encounter as { queue?: unknown })?.queue ?? '-').slice(0, 120)} ESI ${String(encounter?.triageLevel)}`);
      });
    }
    play.note(`คิว / ระดับของผู้ป่วยที่พิมพ์บัตร: ${queues.join(' · ')}`);
    play.finish();
  });

  test('UAT-ER-12 แพทย์ / พยาบาลดึงรายงาน ER', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-12');
    const main = page.getByRole('main');
    await gotoErDashboard(page);
    const open = async (menu: string, api: string) => {
      const loaded = guard(waitForApi(page, 'GET', `/cortex-api/er/reports/${api}`, 45_000));
      await openErMenu(page, 'รายงานทางสถิติ', menu);
      const res = await loaded;
      await expectOk(res, `โหลด${menu}`);
      await expect(main.getByRole('table').first()).toBeVisible();
      const body = (await res.json()) as { rows?: unknown[] };
      console.log(`    ${menu}: ${new URL(res.url()).search} → ${body.rows?.length ?? '?'} แถว`);
      expect(body.rows?.length ?? 0, `${menu} ต้องมีข้อมูล`).toBeGreaterThan(0);
    };
    await play.step('ดึงรายงานรายเวร / รายวัน / รายเดือน — ได้สถิติตามระดับความรุนแรง วิธีมา ER และประเภทการจำหน่าย', async () => {
      await open('รายงานรายเวร', 'shift');
      await open('รายงานรายวัน', 'daily');
      await open('รายงานรายเดือน', 'monthly');
      for (const table of ['จำนวนรวมและระดับ ESI', 'วิธีการมาห้องฉุกเฉิน', 'การจำหน่าย']) await expect(main.getByRole('table', { name: table })).toBeVisible();
    });
    await play.step('ดึงรายงานคุณภาพ (Door-to-doc · Door-to-disposition · รอเกินกำหนด · กลับมารักษาซ้ำใน 72 ชม.)', async () => {
      await open('คุณภาพห้องฉุกเฉิน', 'quality');
      const text = (await main.innerText()).replace(/\s+/g, ' ');
      for (const word of [/Door[- ]to[- ]doc/i, /Door[- ]to[- ]disposition/i, /Over Target/i, /72h Revisit/i]) expect(text).toMatch(word);
    });
    await play.step('ดึงรายงาน Trauma / Non-trauma / Bed block', async () => {
      await open('Trauma / Bed Block', 'trauma-bed-block');
      for (const region of ['Trauma Visits', 'Non-trauma Visits', 'Mean Bed Block (MIN)', '>4h Bed Block']) await expect(main.getByRole('region', { name: region, exact: true })).toBeVisible();
    });
    play.finish();
  });

  test('UAT-ER-08 แพทย์ / พยาบาลติดตามคิวและเวลารอคอย', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-08');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    await gotoErDashboard(page);
    const original = await fetchWaitTimeSettings(page, authorization());
    console.log(`    เวลารอตรวจเดิม: ${original.map((s) => `ESI ${s.level}=${s.limitSeconds === null ? 'ไม่จำกัด' : s.limitSeconds / 60}`).join(' · ')}`);
    // แก้ระดับสุดท้ายที่มีเวลาเป้าหมาย (ระดับที่ตั้ง "ไม่จำกัดเวลา" ช่องนาทีจะกรอกไม่ได้) +1 นาที แล้วคืนค่าเดิมท้ายขั้น (R29)
    const target = [...original].reverse().find((s) => s.limitSeconds !== null)!;
    const newMinutes = target.limitSeconds! / 60 + 1;

    try {
      await play.step('ตั้งค่าเวลารอตรวจ — ตั้งเวลาเป้าหมายแล้วบันทึกได้ เปิดดูซ้ำค่าที่ตั้งถูกต้อง', async () => {
        await openErMenu(page, 'ตั้งค่า', 'ตั้งค่าเวลารอตรวจ');
        await expect(page).toHaveURL(/er-triage-wait-time-targets/);
        const minutes = main.getByRole('spinbutton');
        await expect(minutes.first()).toBeVisible();
        await play.dump('wait-time');
        await main.locator('input[role="spinbutton"]:not([disabled])').last().fill(String(newMinutes));
        const saved = guard(waitForApi(page, 'PATCH', '/cortex-api/er/triage/wait-time-settings'));
        await main.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
        await expectOk(await saved, 'บันทึกเวลารอตรวจ');
        await expect(page.getByText('บันทึกการตั้งค่าเวลารอตรวจแล้ว')).toBeVisible();
        const after = await fetchWaitTimeSettings(page, authorization());
        expect(after.find((s) => s.level === target.level)?.limitSeconds, `ESI ${target.level} ต้องเป็นค่าที่ตั้งใหม่ (${newMinutes} นาที)`).toBe(newMinutes * 60);
      });
    } finally {
      await restoreWaitTimeSettings(page, authorization(), original);
      console.log('    คืนค่าเวลารอตรวจเดิมแล้ว');
    }

    const waiting = loadPatients()['er03'] ?? loadPatients()['er05-2'];
    if (waiting) play.patient('ผู้ป่วย ESI 1 จากข้ออื่น (รอเกินเป้าหมาย)', waiting);
    await play.step('ดูข้อมูลบนการ์ดผู้ป่วย — ตัวตน สัญญาณชีพ อาการ ความรุนแรง และระยะเวลาที่อยู่ใน ER (LOS)', async () => {
      await page.goto('/cortex/er/dashboard');
      const hnText = page.getByText(`HN: ${waiting.hn}`, { exact: true });
      await expect(hnText).toBeVisible({ timeout: 60_000 });
      const card = page.locator('div').filter({ has: hnText }).filter({ hasText: /BP/ }).last();
      const text = (await card.innerText()).replace(/\s+/g, ' ');
      console.log(`    การ์ด: ${text.slice(0, 500)}`);
      // ตัวตน (ชื่อ / อายุ / เพศ / HN) · ความรุนแรง (ป้ายระดับ + MEWS) · อาการ (CC) · สัญญาณชีพ · เวลารอ
      for (const word of [waiting.name.split(' ')[0], /HN: \d+/, /MEWS \d+/, /CC: \S+/, /BP \d+\/\d+/, /รอ \d+:\d+ นาที/]) expect(text).toMatch(word);
    });
    await play.step('ตรวจแจ้งเตือนรอเกินเป้าหมาย — แสดงระยะเวลารอคอยเป้าหมายเป็นสีแดง', async () => {
      const hnText = page.getByText(`HN: ${waiting.hn}`, { exact: true });
      const card = page.locator('div').filter({ has: hnText }).filter({ hasText: /BP/ }).last();
      const overdue = card.getByText(/เกินเป้าหมาย/).first();
      await expect(overdue).toBeVisible();
      // สีของป้ายอาจอยู่ที่ตัวหนังสือ พื้นหลัง หรือขอบ ของตัวป้ายเองหรือกล่องที่ครอบ → เก็บสีของตัวเอง + กล่องแม่ 3 ชั้น
      const colors = await overdue.evaluate((el) => {
        const found: string[] = [];
        let node: Element | null = el;
        for (let i = 0; i < 4 && node; i++, node = node.parentElement) {
          const style = getComputedStyle(node);
          found.push(style.color, style.backgroundColor, style.borderTopColor);
        }
        return found;
      });
      const red = colors.find((color) => {
        const [r, g, b, alpha] = (color.match(/[\d.]+/g) ?? []).map(Number);
        return r > 200 && r - g > 10 && r - b > 10 && alpha !== 0; // รวมแดงอ่อนของป้ายแจ้งเตือน (พื้น rgb(255, 242, 240))
      });
      console.log(`    ป้าย "${(await overdue.innerText()).replace(/\s+/g, ' ')}" สีแดงที่พบ: ${red ?? '(ไม่พบ)'} จาก ${[...new Set(colors)].join(' · ')}`);
      expect(red, 'ป้ายเกินเป้าหมายต้องเป็นสีแดง').toBeTruthy();
    });
    play.finish();
  });

  test('UAT-ER-13 ผู้ป่วยถูกส่งตัวมาจากแผนกอื่นในโรงพยาบาล (Mock ราย D)', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-13');
    const authorization = trackAuthorization(page);
    const d = mockPatient('D');
    play.patient('Mock ราย D', d);
    const main = page.getByRole('main');
    await page.goto(`/cortex/next/patients/${d.hn}?en=${d.en}&vn=${d.vn}`);
    await expect(main.getByText(`HN ${d.hn}`, { exact: true }).first()).toBeVisible({ timeout: 60_000 });

    await play.step('ส่งตัวผู้ป่วยจากแผนกอื่นมา ER: ประวัติการรับบริการ → เลือก EN ปัจจุบัน → กรอกคลินิก "ER - ห้องตรวจนอกเวลาราชการ" → บันทึก', async () => {
      await recordMenu(page, 'ประวัติการรับบริการ');
      const row = main.getByRole('row').filter({ hasText: d.en }).first();
      await expect(row).toBeVisible();
      await row.getByRole('cell', { name: d.en }).click();
      // ได้หน้า "แก้ไข Visit" ของ VN ปัจจุบัน — รอรายการเข้ารับบริการเดิมโหลด แล้วเพิ่มคลินิก ER
      await expect(main.getByText(/^รายการเข้ารับบริการ/)).toBeVisible();
      await expect(main.getByRole('row').filter({ hasText: 'Walk-in' }).first()).toBeVisible();
      // ช่อง "Walk-in ไป คลินิก" (หน้านี้มีตัวกรองคลินิกของแท็บประวัติ EN อยู่ด้านบนอีกตัว)
      await main.getByText('Walk-in ไป').first().locator('xpath=following::input[@role="combobox"][1]').fill('ER');
      await expect(options(page).first()).toBeVisible();
      console.log(`    คลินิกที่ค้นด้วย "ER": ${(await options(page).allInnerTexts()).map((t) => t.trim()).join(' | ')}`);
      // เลือกคลินิกแล้วระบบสร้าง Encounter ER ใน VN เดิมทันที (dev-x 3 ต.ค. 2026) — ปุ่ม "บันทึก" ไม่ยิงคำสั่งเพิ่ม
      const calls = await watchMutations(page, async () => {
        await pick(options(page).filter({ hasText: /ห้องตรวจนอกเวลาราชการ|ห้องตรวจแผนกฉุกเฉิน/ }).first());
        await expect(main.getByRole('row').filter({ hasText: /ห้องตรวจนอกเวลาราชการ|ห้องตรวจแผนกฉุกเฉิน/ }).first()).toBeVisible();
        await main.getByRole('button', { name: /^(save )?บันทึก$/ }).filter({ visible: true }).last().click();
      });
      console.log(`    เพิ่มคลินิก ER + บันทึก: ${calls.join(' ‖ ') || '(ไม่เห็นคำสั่งผ่าน API ชุดที่ดู)'}`);
      expect(calls.join(' '), 'ต้องไม่มี error จาก graphql').not.toMatch(/"errors":\[/);
      const erRow = main.getByRole('row').filter({ hasText: /ห้องตรวจนอกเวลาราชการ|ห้องตรวจแผนกฉุกเฉิน/ }).first();
      console.log(`    แถวที่เพิ่ม: ${(await erRow.innerText()).replace(/\s+/g, ' ')}`);
      // Encounter ทั้งหมดของผู้ป่วยหลังเพิ่มคลินิก ER (ไว้ดูว่าระบบสร้าง Encounter ที่ ER จริงไหม และสถานะอะไร)
      const res = await page.request.get(`/generated-emr-api/encounters?filter[hn][equals]=${d.hn}&perPage=100`, { headers: { authorization: authorization() } });
      if (res.ok()) {
        const { data } = (await res.json()) as { data: Record<string, unknown>[] };
        console.log(`    Encounter ของ HN ${d.hn}: ${data.map((e) => `${e.en} clinic ${e.clinicId} ${e.latestStatusCode} ${e.encounterType ?? ''}`).join(' | ')}`);
      } else console.log(`    อ่าน Encounter ของ HN ${d.hn} ไม่ได้: ${res.status()}`);
    });

    let erVisit: ErVisit = d;
    await play.step('รับผู้ป่วยที่ถูกส่งมาที่ ER — ผู้ป่วยขึ้นที่ห้องฉุกเฉิน และเห็นข้อมูลหน้า Dashboard', async () => {
      await gotoErDashboard(page);
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date());
      const res = await page.request.get(`/cortex-api/er/dashboard/encounters?date=${today}`, { headers: { authorization: authorization() } });
      const found = ((await res.json()) as (ErVisit & { latestStatusCode: string; patientStatus?: string })[]).find((e) => e.hn === d.hn && e.latestStatusCode !== 'cancelled');
      console.log(`    API บอร์ด ER ของ HN ${d.hn}: ${found ? `${found.en} ${found.latestStatusCode} ${found.patientStatus ?? ''}` : '(ไม่มี Encounter ของผู้ป่วยรายนี้บนบอร์ด)'}`);
      if (found) erVisit = { hn: found.hn, vn: found.vn, en: found.en };
      await expect(page.getByText(`HN: ${d.hn}`, { exact: true }), 'ผู้ป่วยที่ถูกส่งมาต้องมีการ์ดบน ER Dashboard').toBeVisible({ timeout: 30_000 });
    });

    await play.step('คัดกรองและเลือกโซน — ผู้ป่วยขึ้นคอลัมน์โซนที่เลือกบน ER Dashboard และหัวจอแสดงระดับความเร่งด่วน', async () => {
      await page.getByText(`HN: ${d.hn}`, { exact: true }).click();
      await expectTriageFormOpen(page, erVisit);
      await fillTriage(page, erVisit, { level: 3, vitals: VITALS_NORMAL });
      await saveTriageForm(page, erVisit);
      await expect(main.getByText(/Triage Zone\s*โซนเหลือง ER/).first()).toBeVisible();
    });
    play.finish();
  });

  test('UAT-ER-07 อุบัติเหตุหมู่ ผู้ป่วยมาพร้อมกันหลายราย', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-07');
    const authorization = trackAuthorization(page);
    const main = page.getByRole('main');
    await gotoErDashboard(page);
    const stamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok', timeStyle: 'short' }).format(new Date());
    const eventName = `UAT ER07 อุบัติเหตุหมู่ ${stamp}`;

    await play.step('สร้างเหตุการณ์ (แท็บ "ผู้ป่วยหลายคน" → "สร้างเหตุการณ์" → ชื่อ / สถานที่ / อาการสำคัญร่วม → "สร้าง") — เข้าสู่หน้าสร้างผู้ป่วยหลายคน', async () => {
      await openTriagePage(page);
      await page.getByRole('tab', { name: 'ผู้ป่วยหลายคน' }).click();
      await page.getByRole('button', { name: /สร้างเหตุการณ์/ }).click();
      const dialog = page.getByRole('dialog', { name: 'สร้างเหตุการณ์' });
      await dialog.getByRole('textbox', { name: /ชื่อเหตุการณ์/ }).fill(eventName);
      await dialog.getByRole('textbox', { name: /สถานที่เกิดเหตุ/ }).fill('ถนนพหลโยธิน กม. 100');
      await dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ }).fill(SHARED_CC);
      await dialog.getByRole('textbox', { name: /อาการสำคัญร่วม/ }).press('Tab');
      const calls = await watchMutations(page, async () => {
        await dialog.getByRole('button', { name: 'สร้าง', exact: true }).click();
        await expect(dialog).toBeHidden({ timeout: 15_000 });
      });
      console.log(`    สร้างเหตุการณ์: ${calls.join(' ‖ ').slice(0, 300)}`);
      await expect(page).toHaveURL(/mode=mass-casualty&incidentId=/);
      await expect(main.getByRole('button', { name: 'ส่ง Triage ทั้งเหตุการณ์' })).toBeVisible();
    });

    const patients: Played[] = [];
    await play.step('เพิ่มผู้ป่วยในเหตุการณ์เดียวกัน 2 ราย — ผู้ป่วยทุกรายอยู่ในรายการ เรียงตามลำดับที่เพิ่ม', async () => {
      for (const n of [1, 2]) {
        const fresh = await nextUatPatient(page, authorization(), 7);
        await main.getByRole('button', { name: 'plus ผู้ป่วยระบุตัวตนไม่ได้' }).click();
        const dialog = page.getByRole('dialog', { name: 'ผู้ป่วยระบุตัวตนไม่ได้' });
        await dialog.getByRole('textbox', { name: 'ชื่อชั่วคราว' }).fill(fresh.firstName);
        await dialog.getByRole('textbox', { name: /นามสกุล/ }).fill(fresh.familyName);
        await dialog.getByRole('textbox', { name: /อายุโดยประมาณ/ }).fill(String(25 + n * 10));
        // ลงทะเบียนแล้วระบบเปิดหน้าต่าง "เปิด Visit ER" ต่อ (เหมือนคัดกรองรายเดียว) → เลือกสิทธิแล้วยืนยัน ผู้ป่วยจึงเข้ารายการของเหตุการณ์
        await dialog.getByRole('button', { name: 'ลงทะเบียนผู้ป่วยไม่ทราบชื่อ' }).click();
        const visit = await confirmOpenErVisit(page, openVisitDialog(page), COVERAGE_UC);
        patients.push({ ...visit, name: `${fresh.firstName} ${fresh.familyName}` });
        play.patient(`เปิดใหม่ (เหตุการณ์หมู่ รายที่ ${n} · ระบุตัวตนไม่ได้)`, patients[n - 1]);
        recordMockPatient(`เล่น 07 (${n})`, { ...fresh, citizenId: '(ไม่ระบุตัวตน)' }, visit, `UAT-ER-07 เหตุการณ์ ${eventName}`);
        savePatient(`er07-${n}`, patients[n - 1]);
        await expect(main.getByRole('heading', { name: `${n}. HN ${visit.hn}` }), 'ผู้ป่วยต้องขึ้นในรายการของเหตุการณ์ตามลำดับที่เพิ่ม').toBeVisible();
      }
    });
    await eventTriageSteps(play, page, authorization, patients);
    play.finish();
  });

  // ขั้นของ UAT-ER-07 หลังเพิ่มผู้ป่วยแล้ว — เล่นซ้ำกับเหตุการณ์เดิม: ER07_INCIDENT=<incidentId ใน URL ของหน้าเหตุการณ์>
  test('UAT-ER-07-ต่อ คัดกรองผู้ป่วยในเหตุการณ์เดิม → ส่ง Triage ทั้งเหตุการณ์', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-07-ต่อ');
    const authorization = trackAuthorization(page);
    const saved = loadPatients();
    const patients = [saved['er07-1'], saved['er07-2']];
    await page.goto(`/cortex/er/triage?mode=mass-casualty&incidentId=${process.env.ER07_INCIDENT}`);
    await expect(page.getByRole('main').getByRole('heading', { name: `1. HN ${patients[0].hn}` })).toBeVisible({ timeout: 60_000 });
    await eventTriageSteps(play, page, authorization, patients);
    play.finish();
  });

  test('UAT-ER-07-ลำดับ ตรวจการเรียงลำดับบน ER Dashboard อย่างเดียว', async ({ page }) => {
    const play = new Play(page, 'UAT-ER-07-ลำดับ');
    const authorization = trackAuthorization(page);
    await gotoErDashboard(page);
    await play.step('ตรวจการเรียงลำดับบน ER Dashboard — ผู้ป่วยเรียงตามความรุนแรงในแต่ละโซน', async () => {
      await expect(page.getByText(/^HN: \d+$/).first()).toBeVisible();
      const { columns, problems } = await dashboardOrder(page, authorization);
      for (const column of columns) console.log(`    ${column}`);
      // CARD_HNS=<HN,HN>: พิมพ์ข้อความบนการ์ดของผู้ป่วยที่ระบุ (ไว้ดู Trauma / Fast Track / ผู้ป่วยที่ถูกส่งมาจาก OPD)
      for (const hn of (process.env.CARD_HNS ?? '').split(',').filter(Boolean)) {
        const hnText = page.getByText(`HN: ${hn}`, { exact: true });
        const text = (await hnText.count()) ? (await page.locator('div').filter({ has: hnText }).filter({ hasText: /รอ/ }).last().innerText()).replace(/\s+/g, ' ').slice(0, 400) : '(ไม่อยู่บนบอร์ด)';
        console.log(`    การ์ด HN ${hn}: ${text}`);
      }
      expect(problems, 'การ์ดในแต่ละคอลัมน์ต้องเรียงตามกฎเรียงคิวของการ์ด SBH-1684').toEqual([]);
    });
    play.finish();
  });

  // ราย A ที่ Order ค้างในตะกร้า (กดส่งคำสั่งแล้วค้างที่ "กำลังตรวจสอบแบบฟอร์ม Imaging") — กดส่งซ้ำ แล้วจดคำขอที่ค้าง / พัง
  test('Mock-A-ส่งคำสั่ง กดส่งคำสั่ง Order ที่ค้างในตะกร้าของราย A อีกครั้ง', async ({ page }) => {
    const play = new Play(page, 'Mock-A-ส่งคำสั่ง');
    const a = mockPatient('A');
    const main = page.getByRole('main');
    const pending = new Map<string, number>();
    page.on('request', (req) => {
      if (/imaging|graphql|order/i.test(req.url()) && req.method() !== 'GET') pending.set(`${req.method()} ${new URL(req.url()).pathname} ${(req.postData() ?? '').match(/(mutation|query)\s+\w+/)?.[0] ?? ''}`, Date.now());
    });
    page.on('requestfinished', (req) => pending.delete(`${req.method()} ${new URL(req.url()).pathname} ${(req.postData() ?? '').match(/(mutation|query)\s+\w+/)?.[0] ?? ''}`));
    await gotoVisit(page, a);
    await play.step('ส่งคำสั่ง Order ที่อยู่ในตะกร้า — ทุกรายการต้องเป็น "กำลังดำเนินการ"', async () => {
      await careMenu(page, 'One Day Order', main.getByRole('heading', { name: 'Order', exact: true }));
      await expect(main.getByRole('row', { name: /^ยังไม่ส่ง/ }).first()).toBeVisible();
      // CANCEL_CODE=<รหัส>: เอารายการนั้นออกจากตะกร้าก่อนส่ง (ไว้ลองว่ารายการไหนทำให้ส่งคำสั่งค้าง)
      if (process.env.CANCEL_CODE) {
        const row = main.getByRole('row').filter({ hasText: `[${process.env.CANCEL_CODE}]` });
        await row.getByRole('button', { name: 'ยกเลิก' }).click();
        await page.locator('.ant-popconfirm:visible, .ant-popover:visible').getByRole('button', { name: 'ยืนยัน' }).click();
        await expect(row).toHaveCount(0);
      }
      const calls = await watchMutations(page, async () => {
        await main.getByRole('button', { name: 'save ส่งคำสั่ง' }).click();
        const form = page.getByRole('dialog', { name: /แบบฟอร์ม Imaging/ });
        if (await form.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true, () => false)) {
          await form.getByRole('button', { name: 'save บันทึก' }).click();
          await expect(form).toBeHidden();
          await main.getByRole('button', { name: 'save ส่งคำสั่ง' }).click();
        }
        await expect(main.getByRole('row', { name: /^ยังไม่ส่ง/ }), 'ต้องไม่เหลือรายการ "ยังไม่ส่ง"').toHaveCount(0, { timeout: 60_000 });
      }).catch(async (error: Error) => {
        console.log(`    คำขอที่ยังไม่ตอบ: ${[...pending].map(([key, at]) => `${key} (${Math.round((Date.now() - at) / 1000)} วิ)`).join(' ‖ ') || '-'}`);
        throw error;
      });
      console.log(`    ส่งคำสั่ง: ${calls.map((call) => call.slice(0, 300)).join(' ‖ ')}`);
    });
    play.finish();
  });

  // สั่ง Imaging เพิ่ม 1 รายการให้ราย A คนเดิม เพื่อให้เกิดงานพยาบาลใหม่ (งานเดิมถูกปิด / ยกเลิกไปแล้ว) ก่อนเล่น UAT-ER-09 ซ้ำ
  test('Mock-A-สั่งเพิ่ม สั่ง Imaging เพิ่ม 1 รายการให้ราย A (สร้างงานพยาบาลใหม่)', async ({ page }) => {
    const play = new Play(page, 'Mock-A-สั่งเพิ่ม');
    const authorization = trackAuthorization(page);
    const a = mockPatient('A');
    await gotoVisit(page, a);
    await play.step(`สั่ง ${SETTINGS.imagingCode} เพิ่ม → ส่งคำสั่ง — เกิดงานพยาบาลสถานะรอรับงาน`, async () => {
      await submitOrders(page, [SETTINGS.imagingCode]);
      await expect(async () => {
        const tasks = await fetchNurseTasks(page, authorization(), a.en);
        console.log(`    งานพยาบาลของราย A: ${tasks.map((t) => `${t.name} = ${t.status}`).join(' · ')}`);
        expect(tasks.filter((t) => /PENDING/i.test(t.status)).length, 'ต้องมีงานพยาบาลที่รอรับงาน').toBeGreaterThan(0);
      }).toPass({ timeout: 30_000 });
    });
    play.finish();
  });
});
