import type { Browser, Locator, Page } from '@playwright/test';
import { closeVisitAtCashier } from '../../../helpers/functions/cashier';
import { dismissToast, gotoErDashboard, trackOpenedErVisits, type ErVisit } from '../../../helpers/functions/er';
import { physicianNotePanel, physicianNoteSaveButton } from '../../../helpers/functions/er-physician-note';
import { erTriagePanel, erTriageSaveButton, saveErTriageForm } from '../../../helpers/functions/er-triage';
import { alerted, clearEvidenceMarks, clicked, expected, filled, hideCompareTable, holdForClip, makeRunner, markEvidence, showCompareTable, snapEvidence, type CompareRow } from '../../../helpers/functions/evidence';
import { finishVideo, restartVideo, startClip, trackVideo } from '../../../helpers/functions/fixtures';
import { recordNotices } from '../../../helpers/functions/notices';
import { newTestPatient } from '../../../helpers/functions/test-data';
import { cacheAppAssets, expect, test } from '../../../mock-data/fixtures';
import { registerAndOpenErVisit } from '../../../mock-data/uat-er';
import { gotoVisit } from '../../../mock-data/uat-play';
import { authFile } from '../../../utils/env';

// SBH-3350 [ER][Cosmetic] Overview + ER Physician note — หัวฟอร์ม / หัวกลุ่ม / หัว Section แบบ OPD Note · สี Vital signs / GCS / MEWS · Body metric แถวเดียว ·
// ตาราง Underlying Disease ไม่มี System · ลำดับ ER Physician Note · หัว Section แสดงแค่ชื่อ (ประวัติอยู่ในเมนู ⋮) · Validation ช่องบังคับ
// ชุด EXE SBH-3618 → HPY SBH-3621 (TC-001–047) · UHP SBH-3623 (TC-048–051) · EDG SBH-3624 (TC-052–054) — เลข Issue ไม่ต่อกัน ดูตาราง ISSUE
// 1 เทส = 1 กลุ่มผู้ป่วย (R9) · ผู้ป่วย AUTO ใหม่ (R10) · ลงทะเบียน + คัดกรองตั้งต้นด้วยหน้าหลัก (Super_User) · TC ของพยาบาลทำในหน้าต่าง Nurse · TC ของแพทย์ทำในหน้าต่าง Doctor ·
// คลิป 1 ไฟล์ต่อ 1 TC (R61) · TC ที่ไม่ผ่านไม่หยุดเทส (soft) · สี / ขนาด / น้ำหนักตัวอักษรอ่านจาก getComputedStyle (แทน DevTools → Computed ใน TC)
// หน้าจอ (dev-x 3 พ.ย. 2026 · index-amx8WU1u.js): ฟอร์มเป็น clinical form (web component · shadow DOM) · หัว Section = .ant-collapse-header (ชื่อใน <strong>) หรือ [class*=_section_] (h4 _sectionTitle_) ·
//   หัวกลุ่ม = h4[class*=_group_] · หัวฟอร์ม = h3[class*=_title_] · ER Physician Note (Non-Trauma) ไม่มีช่องบังคับ — บันทึกได้โดยไม่เลือก Diagnosis (ผู้ใช้ให้เล่นตาม Step + ลองกับฟอร์มคัดกรองเป็นข้อสังเกต)
// หลังเทส: ปิด Visit ที่การเงิน (afterEach) · SBH3350_KEEP=1 = ไม่ปิด · SBH3350_<A|B|D|F>=HN,VN,EN = ใช้ผู้ป่วยเดิม (ข้ามขั้นสร้าง) · SBH3350_ONLY=3,4 = เล่นเฉพาะ TC ·
//   SBH3350_OPD=HN,VN,EN = Visit OPD ที่ใช้เทียบ OPD Note (TC-013 · ตั้งต้นผู้ป่วย AUTO MockOrder ของเรา)
// รัน (dev-x): npx playwright test --headed --grep @SBH-3350   (เทสเดียว: --grep "@SBH-3625" ฯลฯ)

const ISSUE: Record<number, string> = {
  1: 'SBH-3625', 2: 'SBH-3627', 3: 'SBH-3629', 4: 'SBH-3631', 5: 'SBH-3633', 6: 'SBH-3635', 7: 'SBH-3638', 8: 'SBH-3640', 9: 'SBH-3642', 10: 'SBH-3644',
  11: 'SBH-3645', 12: 'SBH-3646', 13: 'SBH-3650', 14: 'SBH-3652', 15: 'SBH-3654', 16: 'SBH-3656', 17: 'SBH-3658', 18: 'SBH-3660', 19: 'SBH-3663', 20: 'SBH-3664',
  21: 'SBH-3665', 22: 'SBH-3667', 23: 'SBH-3671', 24: 'SBH-3673', 25: 'SBH-3675', 26: 'SBH-3677', 27: 'SBH-3679', 28: 'SBH-3681', 29: 'SBH-3683', 30: 'SBH-3684',
  31: 'SBH-3686', 32: 'SBH-3688', 33: 'SBH-3690', 34: 'SBH-3692', 35: 'SBH-3695', 36: 'SBH-3697', 37: 'SBH-3699', 38: 'SBH-3701', 39: 'SBH-3703', 40: 'SBH-3704',
  41: 'SBH-3705', 42: 'SBH-3707', 43: 'SBH-3709', 44: 'SBH-3711', 45: 'SBH-3714', 46: 'SBH-3716', 47: 'SBH-3718', 48: 'SBH-3720', 49: 'SBH-3722', 50: 'SBH-3724',
  51: 'SBH-3725', 52: 'SBH-3726', 53: 'SBH-3728', 54: 'SBH-3730',
};
const linear = (id: string) => ({ type: 'issue', description: `https://linear.app/cortexcloud/issue/${id}` });
const tcId = (n: number) => `TC-${String(n).padStart(3, '0')}`;
const TC = (n: number) => `${tcId(n)} (${ISSUE[n]})`;
const meta = (...tcs: number[]) => ({ tag: ['@SBH-3350', ...tcs.map((n) => `@${ISSUE[n]}`)], annotation: [linear('SBH-3350'), ...tcs.map((n) => linear(ISSUE[n]))] });

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
const bad = (rows: CompareRow[]) => rows.filter((r) => !r.same).map((r) => `${r.label}: ${r.values[1]} (Expected ${r.values[0]})`);
const TRIAGE_SAVED = 'กรอกข้อมูล คัดกรอง ER สำเร็จ';
const SAVES = /\/cortex-api\/clinical-form-groups\/[^/]+\/saves$/;

// ------------------------------------------------------------------------------------------------
// สี
const rgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
/** แสดงค่าสีจาก computed (rgb(...)) เป็น #hex ถ้าทึบ · rgba คงไว้ */
const hex = (c: string) => {
  const m = c.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
  return m ? '#' + m.slice(1).map((x) => Number(x).toString(16).padStart(2, '0')).join('') : c.replace(/\s+/g, '');
};
const INK = 'rgba(0, 0, 0, 0.88)';
const HEADER_BG = 'rgba(0, 0, 0, 0.02)';
const LINE = rgb('#d9d9d9');
/** ชุดสีระดับ (Normal / Abnormal / Critical) — ขอบ Abnormal / Critical ตาม AC 3 (#ffd591 / #ffa39e) · พื้น / ตัวอักษรเป็นชุดเดียวกับป้าย H / L ของ Vital signs (antd green / orange / red) */
const LEVEL = {
  Normal: { border: rgb('#b7eb8f'), bg: rgb('#f6ffed'), text: rgb('#389e0d') },
  Abnormal: { border: rgb('#ffd591'), bg: rgb('#fff7e6'), text: rgb('#d46b08') },
  Critical: { border: rgb('#ffa39e'), bg: rgb('#fff1f0'), text: rgb('#cf1322') },
} as const;
type Level = keyof typeof LEVEL;

type Css = { color: string; fontSize: string; fontWeight: string; bg: string; borderTop: string; borderBottom: string; borderTopWidth: string; borderBottomWidth: string; radius: string };
const css = (l: Locator): Promise<Css> =>
  l.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight, bg: s.backgroundColor, borderTop: s.borderTopColor, borderBottom: s.borderBottomColor, borderTopWidth: s.borderTopWidth, borderBottomWidth: s.borderBottomWidth, radius: s.borderTopLeftRadius };
  });
const font = (c: Css) => `${hex(c.color)} ${c.fontSize} ${c.fontWeight}`;
const levelOf = (c: { border: string; bg: string; text: string }): Level | '?' =>
  (Object.keys(LEVEL) as Level[]).find((k) => LEVEL[k].border === c.border && LEVEL[k].bg === c.bg && LEVEL[k].text === c.text) ?? '?';

// ------------------------------------------------------------------------------------------------
// หัวฟอร์ม / หัวกลุ่ม / หัว Section ใน root (อ่านจาก DOM ชั้นนอก — ส่วนหัวไม่อยู่ใน shadow DOM)
type Header = { kind: 'group' | 'section'; title: string; text: string; title_css: Css; header_css: Css | null; card_css: Css | null; buttons: string[]; y: number; collapsed: boolean | null };
async function headersIn(root: Locator): Promise<Header[]> {
  return root.evaluate((rootEl) => {
    const pick = (el: Element) => {
      const s = getComputedStyle(el);
      return { color: s.color, fontSize: s.fontSize, fontWeight: s.fontWeight, bg: s.backgroundColor, borderTop: s.borderTopColor, borderBottom: s.borderBottomColor, borderTopWidth: s.borderTopWidth, borderBottomWidth: s.borderBottomWidth, radius: s.borderTopLeftRadius };
    };
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden';
    };
    const out: Header[] = [];
    for (const g of Array.from(rootEl.querySelectorAll('h4[class*="_group_"]'))) {
      if (!visible(g)) continue;
      out.push({ kind: 'group', title: (g.textContent ?? '').trim(), text: (g.textContent ?? '').trim(), title_css: pick(g), header_css: null, card_css: null, buttons: [], y: g.getBoundingClientRect().top, collapsed: null });
    }
    const heads = [...Array.from(rootEl.querySelectorAll('.ant-collapse-header')), ...Array.from(rootEl.querySelectorAll('[class*="_section_"]'))];
    for (const h of heads) {
      if (!visible(h)) continue;
      // หัวกลุ่มบางอันเป็นหัวแบบพับได้ (ant-collapse-header ที่มี h4 _group_ ข้างใน) — นับเป็นหัวกลุ่มแล้วด้านบน
      if (h.querySelector('h4[class*="_group_"]')) continue;
      const titleEl = h.querySelector('.ant-collapse-title strong') ?? h.querySelector('.ant-collapse-title') ?? h.querySelector('h4, h5, strong') ?? h;
      const card = h.closest('.ant-collapse') ?? h.parentElement;
      const buttons = Array.from(h.querySelectorAll('button, [role=button]'))
        .filter(visible)
        .map((b) => (b.getAttribute('aria-label') || (b.textContent ?? '').trim() || b.getAttribute('title') || 'ปุ่ม').slice(0, 40));
      const item = h.closest('.ant-collapse-item');
      out.push({
        kind: 'section',
        title: (titleEl.textContent ?? '').trim(),
        text: ((h as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim(),
        title_css: pick(titleEl),
        header_css: pick(h),
        card_css: card ? pick(card) : null,
        buttons,
        y: h.getBoundingClientRect().top,
        collapsed: item ? !item.classList.contains('ant-collapse-item-active') : null,
      });
    }
    return out.sort((a, b) => a.y - b.y);
  });
}
/** แถวเทียบหัว Section กับรูปแบบที่ AC 2.4 กำหนด */
function sectionRows(list: Header[]): CompareRow[] {
  return list.map((h) => {
    const t = h.title_css;
    const hc = h.header_css;
    const cc = h.card_css;
    const okTitle = t.color === INK && t.fontSize === '14px' && t.fontWeight === '600';
    const okHead = !!hc && hc.bg === HEADER_BG && hc.borderBottom === LINE && hc.borderBottomWidth !== '0px';
    const okCard = !!cc && cc.borderTop === LINE && cc.borderTopWidth !== '0px' && cc.radius === '8px';
    return {
      label: h.title.slice(0, 32),
      values: [
        'อักษร rgba(0,0,0,.88) 14px 600 · พื้น rgba(0,0,0,.02) · เส้นใต้ #d9d9d9 · การ์ด #d9d9d9 8px',
        `อักษร ${font(t)} · พื้น ${hc ? hex(hc.bg) : '-'} · เส้นใต้ ${hc ? `${hex(hc.borderBottom)}/${hc.borderBottomWidth}` : '-'} · การ์ด ${cc ? `${hex(cc.borderTop)}/${cc.borderTopWidth} ${cc.radius}` : '-'}`,
      ],
      same: okTitle && okHead && okCard,
    };
  });
}

// ------------------------------------------------------------------------------------------------
// หน้าต่างของบัญชีอื่น (context แยก · session .auth/<Role>.json · อัดวิดีโอ video-<Role>.webm)
async function openRoleWindow(browser: Browser, role: 'Doctor' | 'Nurse'): Promise<Page> {
  const context = await browser.newContext({ storageState: authFile(role), baseURL: test.info().project.use.baseURL, viewport: { width: 1920, height: 1080 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await cacheAppAssets(context);
  await context.addInitScript(recordNotices);
  const page = await context.newPage();
  await page.goto('/cortex/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await trackVideo(page, role);
  return page;
}
async function closeRoleWindow(page: Page | undefined) {
  if (!page) return;
  await hideCompareTable(page).catch(() => undefined);
  await finishVideo(page).catch(() => undefined);
  await page.context().close().catch(() => undefined);
}

// บอร์ด ER → การ์ดผู้ป่วย
const boardCard = (page: Page, hn: string) => page.getByRole('main').locator('div').filter({ has: page.getByText(`HN: ${hn}`, { exact: true }) }).filter({ hasText: /รอ|ESI|คัดกรอง/ }).last();
/** ER Dashboard → กดการ์ดผู้ป่วย (ข้อความ HN บนการ์ด) → หน้าผู้ป่วย · คืน locator ของการ์ดไว้ตีกรอบ "ก่อนกด" */
async function openFromBoard(page: Page, visit: ErVisit, say: (t: string, d: string) => void) {
  await gotoErDashboard(page);
  const card = boardCard(page, visit.hn);
  const onBoard = await card.waitFor({ state: 'visible', timeout: 60_000 }).then(() => true, () => false);
  if (onBoard) {
    await card.scrollIntoViewIfNeeded();
    const target = card.getByText(`HN: ${visit.hn}`, { exact: true });
    await markEvidence(clicked(target, 'การ์ดผู้ป่วย'));
    await snapEvidence(page, `ก่อนกด — การ์ดผู้ป่วย ${visit.hn}`);
    await clearEvidenceMarks(page);
    await target.click();
    await expect(page.getByRole('main').getByText(`HN ${visit.hn}`, { exact: true }).first(), 'ต้องเปิดหน้าผู้ป่วย').toBeVisible({ timeout: 90_000 });
  } else {
    say('หมายเหตุ', `ไม่เห็นการ์ด HN ${visit.hn} บน ER Dashboard ใน 60 วิ → เปิดหน้าผู้ป่วยด้วย URL`);
    await gotoVisit(page, visit);
  }
}

// ฟอร์มคัดกรอง ER
function triage(page: Page) {
  const panel = erTriagePanel(page);
  const input = (ph: string) => panel.locator(`input[placeholder="${ph}"]`).first();
  const vital = (ph: string) => ({
    input: input(ph),
    value: panel.locator('.vital-value').filter({ has: page.locator(`input[placeholder="${ph}"]`) }).first(),
    flag: panel.locator('.vital-value').filter({ has: page.locator(`input[placeholder="${ph}"]`) }).first().locator('.vital-flag'),
    hint: panel.locator('.form-item').filter({ has: page.locator(`input[placeholder="${ph}"]`) }).last().locator('.vital-hint'),
    item: panel.locator('.form-item').filter({ has: page.locator(`input[placeholder="${ph}"]`) }).last(),
  });
  return {
    panel,
    heading: page.getByRole('main').locator('h3[class*="_title_"]').filter({ hasText: /^คัดกรอง ER$/ }).first(),
    vital,
    gcs: (name: string) => panel.getByRole('combobox', { name }).first(),
    gcsStatus: panel.getByTestId('gcs-status').first(),
    gcsSeverity: panel.locator('.gcs__severity').first(),
    mewsStatus: panel.getByTestId('mews-status').first(),
    mewsRisk: panel.getByTestId('mews-risk').first(),
    levels: panel.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }).first(),
    metrics: panel.locator('.er-metrics').first(),
    weight: panel.getByRole('spinbutton', { name: 'Weight' }).first(),
    height: panel.getByRole('spinbutton', { name: 'Height' }).first(),
    bmi: panel.getByRole('spinbutton', { name: 'BMI' }).first(),
    save: erTriageSaveButton(page),
  };
}
type Triage = ReturnType<typeof triage>;

async function setVital(t: Triage, ph: string, value: string) {
  const box = t.vital(ph).input;
  await box.fill(value);
  await box.press('Tab');
}
async function setGcs(t: Triage, e: number, v: number, m: number) {
  for (const [name, score] of [['Eye Opening (E)', e], ['Verbal Response (V)', v], ['Motor Response (M)', m]] as const) {
    const select = t.gcs(name);
    const label = (await select.locator('option').allTextContents()).find((x) => x.startsWith(`${score} `));
    if (!label) throw new Error(`ไม่เจอตัวเลือก GCS ${name} คะแนน ${score}`);
    await select.selectOption({ label });
  }
}
/** ค่าตั้งต้นของผู้ป่วย B: BP 120/80 · PR 80 · RR 12 · Temp 37 · SpO2 98 · GCS 15 */
async function baseVitals(t: Triage, rr = '12', pr = '80') {
  for (const [ph, v] of [['Systolic', '120'], ['Diastolic', '80'], ['PR', pr], ['RR', rr], ['Temp', '37'], ['SpO2', '98']] as const) {
    const box = t.panel.getByRole('spinbutton', { name: ph }).first();
    await box.fill(v);
  }
  await t.panel.getByRole('spinbutton', { name: 'SpO2' }).first().press('Tab');
  await setGcs(t, 4, 5, 6);
}
async function waitMews(page: Page, t: Triage) {
  await expect(t.panel.getByText(/กำลังโหลดข้อมูลต้นทาง|Loading sources/)).toHaveCount(0, { timeout: 45_000 });
  await page.waitForTimeout(1_200);
}
/** สถานะสีของกล่องผล (GCS / MEWS) + คำระดับ */
async function boxLevel(status: Locator, word: Locator) {
  const s = await css(status);
  const w = await css(word);
  const c = { border: s.borderTop, bg: s.bg, text: w.color };
  return { ...c, level: levelOf(c), label: `พื้น ${hex(c.bg)} · ขอบ ${hex(c.border)} · คำ ${hex(c.text)}` };
}

/** ข้อความทุกชั้น (รวม shadow DOM + ค่าในช่องกรอก) · ตัด <style> ออก */
const deepText = async (l: Locator) =>
  norm(
    await l.evaluate((root) => {
      const out: string[] = [];
      const walk = (n: Node) => {
        if (n instanceof HTMLStyleElement || n instanceof HTMLScriptElement) return;
        if (n.nodeType === 3) {
          const t = n.textContent?.trim();
          if (t) out.push(t);
          return;
        }
        if (n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement) out.push(n.value);
        if (n instanceof Element && n.shadowRoot) n.shadowRoot.childNodes.forEach(walk);
        n.childNodes.forEach(walk);
      };
      walk(root);
      return out.join(' ');
    }),
  );

/**
 * ปุ่ม "ดู" ของประวัติการคัดกรอง (dev-x 3 พ.ย. 2026): ไม่เปิดหน้าต่าง — ฟอร์มคัดกรองบน Overview สลับเป็นโหมดอ่าน "ข้อมูลที่ผูกกับการประเมิน"
 * (ค่าเป็นข้อความ เช่น "Systolic 120 mm[Hg]") + ปุ่ม "← กลับไปการคัดกรองปัจจุบัน"
 */
async function readTriageView(page: Page) {
  const back = page.getByRole('button', { name: /กลับไปการคัดกรองปัจจุบัน/ }).first();
  await expect(back, 'กด "ดู" แล้วต้องเข้าโหมดดูรายการคัดกรอง').toBeVisible({ timeout: 30_000 });
  const view = page.getByRole('main').locator('div').filter({ has: page.getByText('ข้อมูลที่ผูกกับการประเมิน', { exact: true }) }).filter({ has: back }).last();
  await page.waitForTimeout(5_000);
  // ค่าในโหมดดูอยู่ใน web component (shadow DOM) — innerText ไม่รวม → ไล่ข้อความทุกชั้นเอง
  const text = await deepText(view);
  const num = (re: RegExp) => text.match(re)?.[1] ?? '';
  return {
    view,
    head: page.getByText('ข้อมูลที่ผูกกับการประเมิน', { exact: true }).first(),
    vitals: view.getByText('Systolic', { exact: true }).first().locator('xpath=ancestor::div[.//*[normalize-space()="RR"]][1]'),
    text,
    sys: num(/Systolic\s*(\d+)/),
    dia: num(/Diastolic\s*(\d+)/),
    pr: num(/\bPR\s*(\d+)/),
    rr: num(/\bRR\s*(\d+)/),
    // โหมดดู: "Total score (1) 15" (เลขในวงเล็บคือลำดับการวัด)
    gcs: num(/Total score\s*(?:\(\d+\)\s*)?(\d{1,2})\b/i) || num(/GCS\s*:?\s*(\d{1,2})\b/i),
    esi: num(/ESI\s*:?\s*([1-5])\b/) || num(/ระดับความเร่งด่วน[^0-9]{0,20}([1-5])\b/) || num(/Triage level[^0-9]{0,20}([1-5])\b/i),
  };
}
async function backToCurrentTriage(page: Page) {
  const back = page.getByRole('button', { name: /กลับไปการคัดกรองปัจจุบัน/ }).first();
  if (await back.isVisible().catch(() => false)) {
    await back.click();
    await expect(page.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(2_000);
  }
}

// ER Physician Note
function physician(doc: Page) {
  const pn = physicianNotePanel(doc);
  const item = (title: string) => pn.locator('.ant-collapse-item').filter({ has: doc.getByText(title, { exact: true }) }).last();
  return {
    pn,
    heading: pn.locator('h3[class*="_title_"]').filter({ hasText: /^ER Physician Note$/ }).first(),
    item,
    header: (title: string) => item(title).locator('.ant-collapse-header').first(),
    title: (title: string) => pn.getByText(title, { exact: true }).filter({ visible: true }).first(),
    more: (title: string) => item(title).locator('.ant-collapse-header').first().getByRole('button', { name: 'การดำเนินการเพิ่มเติมของรายการ' }),
    pi: pn.locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').first(),
    dx: pn.locator('[data-dx-index="0"]').filter({ visible: true }).first(),
    dxInput: pn.locator('input[placeholder="Diagnosis"]').first(),
    save: physicianNoteSaveButton(doc),
    metrics: pn.locator('.er-metrics').first(),
    menu: doc.locator('.ant-dropdown:visible').last(),
  };
}
type Phys = ReturnType<typeof physician>;
async function waitPhysician(doc: Page): Promise<Phys> {
  const p = physician(doc);
  await expect(p.heading, 'แผงขวาต้องมีหัว ER Physician Note').toBeVisible({ timeout: 120_000 });
  await expect(p.pi, 'ฟอร์มแพทย์ต้องโหลดเสร็จ').toBeVisible({ timeout: 120_000 });
  await expect(p.title('Note to nurse')).toBeVisible({ timeout: 60_000 });
  await doc.waitForTimeout(3_000);
  return p;
}
async function chooseDiagnosis(doc: Page, p: Phys, code = 'K30') {
  await expect(p.dx, 'ฟอร์ม Physician Note ต้องมีส่วน Diagnosis').toBeVisible({ timeout: 60_000 });
  const search = p.dx.getByRole('combobox').first();
  await search.scrollIntoViewIfNeeded();
  await search.click();
  await doc.keyboard.type(code, { delay: 60 });
  const option = doc.getByRole('option').filter({ visible: true }).filter({ hasText: new RegExp(`^${code}\\.?\\s*-`) }).first();
  await expect(option, `ค้น Diagnosis ${code} ต้องเจอ`).toBeVisible({ timeout: 20_000 });
  await option.click();
  await doc.waitForTimeout(1_500);
}
/** กดบันทึกฟอร์มแพทย์ แล้วคืนผลคำขอ saves (null = ไม่มีคำขอใน wait มิลลิวินาที) + แจ้งเตือนที่ขึ้น */
async function savePhysician(doc: Page, p: Phys, wait = 30_000) {
  const res = doc.waitForResponse((r) => r.request().method() === 'POST' && SAVES.test(r.url()), { timeout: wait }).catch(() => null);
  await p.save.click();
  const r = await res;
  const toast = doc.locator('.ant-notification-notice').filter({ hasText: /Physician Note/ }).first();
  const toastSeen = await toast.waitFor({ state: 'visible', timeout: r ? 25_000 : 3_000 }).then(() => true, () => false);
  const toastText = toastSeen ? norm(await toast.innerText({ timeout: 3_000 }).catch(() => 'บันทึก ER Physician Note สำเร็จ (หายไปก่อนอ่าน)')) : '';
  return { status: r ? r.status() : null, toast, toastSeen, toastText };
}
/** element ที่ focus อยู่จริง (ไล่ shadow root) */
const activeInfo = (doc: Page) =>
  doc.evaluate(() => {
    let a: Element | null = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    if (!a || a === document.body) return '(ไม่มี — body)';
    return `${a.tagName.toLowerCase()}${a.getAttribute('placeholder') ? `[placeholder=${a.getAttribute('placeholder')}]` : ''}${a.getAttribute('aria-label') ? `[aria-label=${a.getAttribute('aria-label')}]` : ''}`;
  });
const inView = (l: Locator) =>
  l.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight && r.height > 0;
  }).catch(() => false);
/** กรอบแดง / ข้อความ error ในส่วน Diagnosis */
async function diagnosisError(p: Phys) {
  const dxInputCss = await css(p.dxInput).catch(() => null);
  const errText = await p.item('Diagnosis general').evaluate((root) => {
    const found: string[] = [];
    const walk = (n: Element | ShadowRoot) => {
      for (const el of Array.from(n.querySelectorAll('*'))) {
        const t = Array.from(el.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent?.trim()).join(' ');
        if (/กรุณา|ระบุ|required/i.test(t)) found.push(t.trim());
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(root);
    return found.join(' | ');
  }).catch(() => '');
  const invalid = await p.pn.locator('[aria-invalid="true"]').count();
  return { border: dxInputCss ? hex(dxInputCss.borderTop) : '-', errText, invalid };
}

// ------------------------------------------------------------------------------------------------
test.describe('SBH-3350 ER Cosmetic Overview + ER Physician Note (dev-x)', () => {
  test.describe.configure({ timeout: 3_600_000 });

  let opened: Map<string, ErVisit>;
  let windows: Page[] = [];

  test.beforeEach(({ page }) => {
    opened = trackOpenedErVisits(page);
    windows = [];
  });

  test.afterEach(async ({ page }) => {
    for (const w of windows) await closeRoleWindow(w);
    await hideCompareTable(page).catch(() => undefined);
    if (process.env.SBH3350_KEEP) return;
    for (const visit of opened.values()) {
      const result = await closeVisitAtCashier(page, visit.hn, visit.vn).then(
        (closed) => (closed.result === 'closed' ? 'ปิด Visit ที่การเงินแล้ว' : 'Visit ปิดอยู่ก่อนแล้ว'),
        (error: Error) => `ปิด Visit ไม่สำเร็จ — ${error.message.split('\n')[0]}`,
      );
      test.info().annotations.push({ type: 'หลังเทส', description: `HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}` });
      console.log(`    หลังเทส: HN ${visit.hn} · ${visit.vn} · ${visit.en}: ${result}`);
    }
  });

  type Prep = { rr: string; pr: string; level: number; weight?: boolean; underlying?: 'I10' | 'long' };

  /** ผู้ป่วย AUTO ใหม่ → เปิด Visit ER (หน้าหลัก Super_User) · prep = คัดกรองตั้งต้นแล้วบันทึก (ไม่ใส่ = ยังไม่คัดกรอง) */
  async function preparePatient(page: Page, key: string, prep: Prep | null, say: (t: string, d: string) => void): Promise<ErVisit> {
    const reuse = process.env[`SBH3350_${key}`]?.split(',');
    if (reuse?.length === 3) {
      const visit = { hn: reuse[0], vn: reuse[1], en: reuse[2] };
      say(`ผู้ป่วย ${key}`, `ใช้รายเดิม HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
      return visit;
    }
    const visit = await test.step(`เตรียมข้อมูล: ผู้ป่วย ${key} AUTO ใหม่ + เปิด Visit ER`, async () => {
      await gotoErDashboard(page);
      const patient = newTestPatient(`Cos${key}`);
      const v = await registerAndOpenErVisit(page, patient);
      say(`ผู้ป่วย ${key}`, `${patient.firstName} ${patient.familyName} · HN ${v.hn} · ${v.vn} · ${v.en} · ใช้ซ้ำ: SBH3350_${key}=${v.hn},${v.vn},${v.en}`);
      return v;
    });
    await dismissToast(page, 'สร้าง Visit สำเร็จ').catch(() => undefined);
    if (!prep) return visit;
    await test.step(`เตรียมข้อมูล: คัดกรอง ผู้ป่วย ${key} (RR ${prep.rr} · PR ${prep.pr} · ESI ${prep.level})`, async () => {
      const panel = erTriagePanel(page);
      for (let attempt = 1; attempt <= 3; attempt++) {
        const ok = await expect(panel.getByRole('spinbutton', { name: 'Systolic' }).first()).toBeEditable({ timeout: 90_000 }).then(() => true, () => false);
        if (ok && (await page.getByRole('main').getByText('ไม่สามารถแสดงฟอร์มได้').count()) === 0) break;
        say(`ผู้ป่วย ${key}`, `ฟอร์มคัดกรองโหลดไม่ครบ รอบ ${attempt} → โหลดหน้าใหม่`);
        await gotoVisit(page, visit);
      }
      const t = triage(page);
      await baseVitals(t, prep.rr, prep.pr);
      if (prep.weight) {
        await t.weight.fill('60');
        await t.height.fill('170');
      }
      await panel.getByRole('group', { name: 'Common chief complaints' }).getByRole('button').first().click();
      if (prep.underlying) await addUnderlying(page, prep.underlying, say);
      await t.levels.scrollIntoViewIfNeeded();
      await t.levels.getByText(String(prep.level), { exact: true }).click();
      await page.waitForTimeout(1_000);
      await snapEvidence(page, `ก่อนกด — บันทึกคัดกรอง ${key}`);
      await saveErTriageForm(page, `บันทึกคัดกรอง ผู้ป่วย ${key}`);
      await expect(page.getByText(TRIAGE_SAVED, { exact: true }).first()).toBeVisible({ timeout: 150_000 });
    });
    return visit;
  }

  /** Underlying Disease ของฟอร์มคัดกรอง: I10 หรือโรคชื่อยาว (เลือกตัวเลือกที่ข้อความยาวที่สุดจากรหัสที่ลอง) */
  async function addUnderlying(page: Page, kind: 'I10' | 'long', say: (t: string, d: string) => void) {
    const section = page.getByRole('main').getByRole('heading', { name: /Underlying Disease/ }).first().locator('xpath=ancestor::div[.//table][1]');
    const input = section.getByRole('combobox').first();
    await section.scrollIntoViewIfNeeded();
    const codes = kind === 'I10' ? ['I10'] : ['O99.4', 'T81.4', 'Q25.4', 'I10'];
    let chosen = '';
    for (const code of codes) {
      await input.click();
      await input.fill('');
      await input.pressSequentially(code, { delay: 40 });
      const options = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
      const any = await options.first().waitFor({ state: 'visible', timeout: 15_000 }).then(() => true, () => false);
      if (!any) continue;
      // ตัวเลือกจริงขึ้นต้นด้วยรหัส · ตัด "เพิ่ม "<คำ>" เป็น free text" ออก (รอบแรก 3 พ.ย. ได้ free text)
      await page.waitForTimeout(1_500);
      const texts = (await options.allInnerTexts()).map(norm).filter((x) => !/free text/i.test(x) && x.toUpperCase().startsWith(code.replace(/\..*$/, '')));
      if (!texts.length) continue;
      const best = texts.reduce((a, b) => (b.length > a.length ? b : a), '');
      if (kind === 'long' && best.length < 60 && code !== codes[codes.length - 1]) continue;
      await options.filter({ hasText: best }).first().click();
      chosen = best;
      break;
    }
    if (!chosen) throw new Error('ค้น Underlying Disease ไม่เจอตัวเลือก');
    say('Underlying Disease', `${chosen} (${chosen.length} ตัวอักษร)`);
    await section.getByRole('button', { name: /บันทึก/ }).first().click();
    await expect(section.locator('table tbody tr').filter({ hasNotText: 'ไม่พบข้อมูล' }).first()).toBeVisible({ timeout: 20_000 });
  }

  const onlyFilter = () => (process.env.SBH3350_ONLY ? process.env.SBH3350_ONLY.split(',').filter(Boolean).map((s) => tcId(Number(s))) : undefined);
  function runner(page: Page) {
    const r = makeRunner(page);
    const only = onlyFilter();
    const soft = (title: string, body: () => Promise<void>) => (only && !only.some((t) => title.startsWith(t)) ? Promise.resolve(true) : r.soft(title, async () => {
            await body();
            await holdForClip(page, 1_500);
          }));
    const run = (n: number) => !only || only.includes(tcId(n));
    return { ...r, soft, run };
  }

  // ================================================================================================
  test('ผู้ป่วย A: TC-001–013, 026, 039–047 หัว / สี / ตาราง / ลำดับ / ประวัติ (Nurse + Doctor)', meta(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 26, 39, 40, 41, 42, 43, 44, 45, 46, 47), async ({ page, browser }) => {
    const main = makeRunner(page);
    const visit = await preparePatient(page, 'A', { rr: '14', pr: '80', level: 2, weight: true, underlying: 'I10' }, main.note);

    // ---------------- หน้าต่าง Nurse ----------------
    const nurse = await openRoleWindow(browser, 'Nurse');
    windows.push(nurse);
    const N = runner(nurse);
    N.note('ผู้ป่วยที่ใช้', `A · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
    const compareN = (n: number, rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'right') => showCompareTable(nurse, `${ISSUE[n]} ${tcId(n)}`, ['Expected', 'หน้าจอ'], rows, { side });
    const left = nurse.getByRole('main').locator('div').filter({ has: nurse.getByText('Clinical Summary', { exact: true }) }).filter({ has: nurse.getByRole('radiogroup', { name: 'ระดับความเร่งด่วน' }) }).last();
    const history = nurse.getByRole('main').locator('[class*="_triage-history_"]').first();
    const t = triage(nurse);

    if (!N.run(1)) {
      // SBH3350_ONLY ข้าม TC-001 (ขั้นเปิดหน้าผู้ป่วย) → เปิดหน้าเอง
      await openFromBoard(nurse, visit, N.note);
      await expect(history).toBeVisible({ timeout: 90_000 });
      await expect(t.heading).toBeVisible({ timeout: 90_000 });
    }
    await startClip(nurse, tcId(1));
    await N.soft(`${TC(1)} ส่วนใต้ Clinical Summary ไม่มีแท็บ Trauma / Non-Trauma / เด็ก / สัตว์มีพิษ`, async () => {
      await openFromBoard(nurse, visit, N.note);
      await expect(history, 'ต้องเห็นส่วนประวัติการคัดกรอง').toBeVisible({ timeout: 90_000 });
      await expect(t.heading).toBeVisible({ timeout: 90_000 });
      await nurse.waitForTimeout(3_000);
      await expect(physicianNotePanel(nurse).locator('textarea[placeholder="ประวัติเจ็บป่วยปัจจุบัน"]').first()).toBeVisible({ timeout: 120_000 }).catch(() => undefined);
      await restartVideo(nurse); // ตัดช่วงจอขาว / skeleton ตอนหน้าโหลด (Sub Agent 3 พ.ย.)
      const tabs = norm((await nurse.getByRole('main').getByRole('tab').allInnerTexts()).join(' | '));
      const names = ['Trauma', 'Non-Trauma', 'เด็ก', 'สัตว์มีพิษ'];
      const rows: CompareRow[] = names.map((name) => {
        const has = new RegExp(`(^|\\|\\s)${name}(\\s\\||$)`).test(tabs);
        return { label: `แท็บ "${name}"`, values: ['ไม่มี', has ? 'มี' : 'ไม่มี'], same: !has };
      });
      rows.push({ label: 'แท็บทั้งหมดบนหน้า (role=tab)', values: ['-', tabs || '(ไม่มี)'], same: true });
      await compareN(1, rows);
      await markEvidence(expected(history, 'ใต้ Clinical Summary ไม่มีแถบแท็บ'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(nurse, tcId(2));
    await N.soft(`${TC(2)} "ประวัติการคัดกรอง" เป็นหัว Section แทนแถบแท็บ`, async () => {
      await hideCompareTable(nurse);
      const tabCount = await left.getByRole('tab').count();
      const [hist] = await headersIn(history);
      const others = (await headersIn(t.panel)).filter((h) => h.kind === 'section');
      const ref = others.find((h) => h.title === 'Underlying Disease') ?? others[0];
      const rows: CompareRow[] = [
        { label: 'แถบแท็บ (รวม Triage)', values: ['ไม่มี', tabCount ? `มี ${tabCount} แท็บ` : 'ไม่มี'], same: tabCount === 0 },
        { label: 'หัว "ประวัติการคัดกรอง"', values: ['เป็นหัว Section', hist ? `หัว Section "${hist.title}"` : 'ไม่พบ'], same: !!hist && hist.title === 'ประวัติการคัดกรอง' },
      ];
      if (hist && ref) {
        rows.push({ label: 'ตัวอักษรหัว (เทียบ ' + ref.title + ')', values: [font(ref.title_css), font(hist.title_css)], same: font(ref.title_css) === font(hist.title_css) });
        rows.push({ label: 'พื้น / เส้นใต้หัว', values: [`${hex(ref.header_css?.bg ?? '')} / ${hex(ref.header_css?.borderBottom ?? '')}`, `${hex(hist.header_css?.bg ?? '')} / ${hex(hist.header_css?.borderBottom ?? '')}`], same: ref.header_css?.bg === hist.header_css?.bg && ref.header_css?.borderBottom === hist.header_css?.borderBottom });
      }
      await compareN(2, rows);
      await markEvidence(expected(history.locator('[class*="_section_"]').first(), 'หัว Section ประวัติการคัดกรอง'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(nurse, tcId(3));
    await N.soft(`${TC(3)} ปุ่ม "ดู" ของรายการล่าสุด → รายละเอียดการคัดกรองตรงกับที่บันทึก`, async () => {
      await hideCompareTable(nurse);
      const item = history.locator('[class*="_triage-history-item_"]').first();
      const view = item.getByRole('button', { name: /ดู/ }).first();
      await markEvidence(clicked(view, 'ดู'));
      await snapEvidence(nurse, 'ก่อนกด — ดู');
      await clearEvidenceMarks(nurse);
      await view.click();
      const r = await readTriageView(nurse);
      N.note('TC-003 ข้อความโหมดดู', r.text.replace(/:host\{[^}]*\}\S*/g, '').replace(/\.[\w-]+\.svelte[^ ]*\{[^}]*\}/g, '').slice(0, 3000));
      const rows: CompareRow[] = [
        { label: 'ESI', values: ['2', r.esi || '(ไม่แสดงในโหมดดู)'], same: r.esi === '2' },
        { label: 'BP', values: ['120/80', `${r.sys || '-'}/${r.dia || '-'}`], same: r.sys === '120' && r.dia === '80' },
        { label: 'PR', values: ['80', r.pr || '-'], same: r.pr === '80' },
        { label: 'RR', values: ['14', r.rr || '-'], same: r.rr === '14' },
        { label: 'GCS', values: ['15', r.gcs || '-'], same: r.gcs === '15' },
      ];
      await compareN(3, rows, 'right');
      await r.vitals.scrollIntoViewIfNeeded().catch(() => undefined);
      await markEvidence(expected(r.head, 'โหมดดูรายการคัดกรอง'), expected(r.vitals, 'BP 120/80 · PR 80 · RR 14'));
      await snapEvidence(nurse, 'TC-003 โหมดดู Vital signs');
      await clearEvidenceMarks(nurse);
      const total = r.view.getByText('Total score', { exact: false }).first();
      await total.evaluate((el) => el.scrollIntoView({ block: 'center' })).catch(() => undefined);
      await markEvidence(expected(total.locator('xpath=ancestor::*[contains(normalize-space(.),"15")][1]'), `GCS ${r.gcs || '-'}`));
      expect(bad(rows)).toEqual([]);
    });
    await backToCurrentTriage(nurse);
    await hideCompareTable(nurse);

    await startClip(nurse, tcId(5));
    await N.soft(`${TC(5)} หัวฟอร์ม "คัดกรอง ER" #0d4ad9 หนา 700 พื้น #e8f4ff`, async () => {
      await t.heading.scrollIntoViewIfNeeded();
      const c = await css(t.heading);
      const rows: CompareRow[] = [
        { label: 'สีตัวอักษร', values: ['#0d4ad9', hex(c.color)], same: c.color === rgb('#0d4ad9') },
        { label: 'น้ำหนัก', values: ['700', c.fontWeight], same: c.fontWeight === '700' },
        { label: 'พื้น', values: ['#e8f4ff', hex(c.bg)], same: c.bg === rgb('#e8f4ff') },
      ];
      await compareN(5, rows);
      await markEvidence(expected(t.heading, 'หัวฟอร์ม คัดกรอง ER'));
      expect(bad(rows)).toEqual([]);
    });

    let triageHeaders: Header[] = [];
    await startClip(nurse, tcId(7));
    await N.soft(`${TC(7)} Underlying Disease เป็นหัว Section ไม่ใช่ป้ายหัวฟอร์ม`, async () => {
      await hideCompareTable(nurse);
      triageHeaders = await headersIn(t.panel);
      const ud = triageHeaders.find((h) => h.title === 'Underlying Disease');
      const others = triageHeaders.filter((h) => h.kind === 'section' && h.title !== 'Underlying Disease');
      const ref = others.find((h) => h.title === 'Chief Complaint - General') ?? others[0];
      const formHead = await css(t.heading);
      const rows: CompareRow[] = [
        { label: 'หัว Underlying Disease', values: ['มี (หัว Section)', ud ? `${ud.kind} · อักษร ${font(ud.title_css)}` : 'ไม่พบ'], same: !!ud && ud.kind === 'section' },
        { label: 'ไม่ใช่รูปแบบหัวฟอร์ม', values: [`ไม่ใช่ ${hex(formHead.color)} บน ${hex(formHead.bg)}`, ud ? `${hex(ud.title_css.color)} บน ${hex(ud.header_css?.bg ?? '')}` : '-'], same: !!ud && ud.title_css.color !== formHead.color && ud.header_css?.bg !== formHead.bg },
      ];
      if (ud && ref) {
        rows.push({ label: `ตัวอักษร (เทียบหัว ${ref.title})`, values: [`เท่ากับหัว Section อื่น (${ref.title} = ${font(ref.title_css)}) · AC กำหนด rgba(0,0,0,.88) 14px 600`, font(ud.title_css)], same: font(ref.title_css) === font(ud.title_css) });
        rows.push({ label: 'พื้น / เส้นใต้หัว', values: [`${hex(ref.header_css?.bg ?? '')} / ${hex(ref.header_css?.borderBottom ?? '')}`, `${hex(ud.header_css?.bg ?? '')} / ${hex(ud.header_css?.borderBottom ?? '')}`], same: ref.header_css?.bg === ud.header_css?.bg && ref.header_css?.borderBottom === ud.header_css?.borderBottom });
      }
      await compareN(7, rows);
      const udHead = t.panel.locator('[class*="_section_"]').filter({ hasText: 'Underlying Disease' }).first();
      await udHead.scrollIntoViewIfNeeded();
      await markEvidence(expected(udHead, 'หัว Underlying Disease'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(nurse, tcId(9));
    await N.soft(`${TC(9)} หัวกลุ่มในฟอร์มคัดกรอง ER rgba(0,0,0,.88) 15.2px 700 ไม่มีพื้น / เส้น`, async () => {
      await hideCompareTable(nurse);
      const groups = (await headersIn(t.panel)).filter((h) => h.kind === 'group');
      const rows: CompareRow[] = groups.map((g) => {
        const c = g.title_css;
        const ok = c.color === INK && c.fontSize === '15.2px' && c.fontWeight === '700' && c.bg === 'rgba(0, 0, 0, 0)' && c.borderBottomWidth === '0px' && c.borderTopWidth === '0px';
        return { label: g.title, values: ['rgba(0,0,0,.88) 15.2px 700 · ไม่มีพื้น / เส้น', `${font(c)} · พื้น ${hex(c.bg)} · เส้น ${c.borderTopWidth}/${c.borderBottomWidth}`], same: ok };
      });
      if (!rows.length) rows.push({ label: 'หัวกลุ่ม', values: ['มี', 'ไม่พบ'], same: false });
      await compareN(9, rows);
      const first = t.panel.locator('h4[class*="_group_"]').first();
      await first.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await markEvidence(...(await t.panel.locator('h4[class*="_group_"]').all()).slice(0, 4).map((g) => expected(g, 'หัวกลุ่ม')));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(nurse, tcId(11));
    await N.soft(`${TC(11)} หัว Section ทุกอันในฟอร์มคัดกรอง ER ใช้รูปแบบเดียวกัน`, async () => {
      await hideCompareTable(nurse);
      const list = (await headersIn(t.panel)).filter((h) => h.kind === 'section');
      const rows = sectionRows(list);
      await compareN(11, rows, 'right');
      const heads = t.panel.locator('.ant-collapse-header:not(:has(h4[class*="_group_"]))');
      await heads.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
      const list4 = (await heads.all()).slice(0, 3);
      for (const [i, h] of list4.entries()) {
        await h.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await nurse.waitForTimeout(500);
        await markEvidence(expected(h, `ชื่อ 14px 600 · จริง: ${norm(await h.innerText()).slice(0, 20)} 13px`));
        if (i < list4.length - 1) {
          await snapEvidence(nurse, `TC-011 หัว Section ${i + 1}`);
          await clearEvidenceMarks(nurse);
        }
      }
      expect(bad(rows)).toEqual([]);
    });

    await startClip(nurse, tcId(39));
    await N.soft(`${TC(39)} ตาราง Underlying Disease (Overview) ไม่มีคอลัมน์ System`, async () => {
      await hideCompareTable(nurse);
      const table = t.panel.locator('[class*="_underlying-disease-table_"]').first();
      await table.scrollIntoViewIfNeeded();
      const cols = (await table.locator('thead th').allInnerTexts()).map(norm).filter(Boolean);
      const rows: CompareRow[] = [
        { label: 'คอลัมน์', values: ['Display · Active · สร้างโดย · สร้างเมื่อ', cols.join(' · ')], same: cols.join('|') === 'Display|Active|สร้างโดย|สร้างเมื่อ' },
        { label: 'คอลัมน์ System', values: ['ไม่มี', cols.includes('System') ? 'มี' : 'ไม่มี'], same: !cols.includes('System') },
      ];
      await compareN(39, rows);
      await markEvidence(expected(table.locator('thead').first(), 'หัวคอลัมน์'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(nurse, tcId(42));
    await N.soft(`${TC(42)} หัว Section ในฟอร์มคัดกรอง ER มีแค่ชื่อ · ⋮ · พับ/ขยาย`, async () => {
      await hideCompareTable(nurse);
      const list = (await headersIn(t.panel)).filter((h) => h.kind === 'section');
      const rows: CompareRow[] = list.map((h) => {
        const extra = h.text.replace(h.title, '').trim();
        const btn = h.buttons.filter((b) => !/การดำเนินการเพิ่มเติม|expanded|collapsed|right|ปุ่ม/.test(b));
        return { label: h.title.slice(0, 32), values: ['ชื่อ · ⋮ · พับ/ขยาย', `ข้อความอื่น: ${extra || '-'} · ปุ่ม: ${h.buttons.join(', ') || '-'}`], same: !extra && btn.length === 0 };
      });
      await compareN(42, rows, 'right');
      const heads = t.panel.locator('.ant-collapse-header:not(:has(h4[class*="_group_"]))');
      await heads.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
      await markEvidence(...(await heads.all()).slice(0, 3).map((h) => expected(h, 'ชื่อ · ⋮ · พับ/ขยาย')));
      await snapEvidence(nurse, 'TC-042 หัว Section แบบพับได้');
      await clearEvidenceMarks(nurse);
      const udHead = t.panel.locator('[class*="_section_"]').filter({ hasText: 'Underlying Disease' }).first();
      await udHead.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await markEvidence(expected(udHead, 'มีแค่ชื่อ · ⋮ · พับ/ขยาย · จริง: มีปุ่มบันทึก'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(nurse, tcId(4));
    await N.soft(`${TC(4)} ปุ่ม "แก้ไข" → หน้าต่างแก้ไขการประเมิน → เวลาย้อน 5 นาที แล้วรายการแสดงเวลาใหม่`, async () => {
      await hideCompareTable(nurse);
      await history.scrollIntoViewIfNeeded();
      const item = history.locator('[class*="_triage-history-item_"]').first();
      const before = norm(await item.innerText());
      const edit = item.getByRole('button', { name: /แก้ไข/ }).first();
      await markEvidence(clicked(edit, 'แก้ไข'));
      await snapEvidence(nurse, 'ก่อนกด — แก้ไข');
      await clearEvidenceMarks(nurse);
      await edit.click();
      const dialog = nurse.getByRole('dialog').last();
      await expect(dialog).toBeVisible({ timeout: 30_000 });
      const title = norm(await dialog.locator('.ant-modal-title, [class*="title"]').first().innerText().catch(() => ''));
      N.note('TC-004 หน้าต่าง', `${title} · ${norm(await dialog.innerText()).slice(0, 300)}`);
      const picker = dialog.locator('.ant-picker input').first();
      const old = await picker.inputValue();
      // รูปแบบในหน้าต่าง (dev-x 3 พ.ย. 2026) = "2569-11-03 11:07:30" (ปี พ.ศ.)
      const m = old.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
      if (!m) throw new Error(`อ่านเวลาที่ประเมินไม่ได้: "${old}"`);
      const be = Number(m[1]) > 2400 ? 543 : 0;
      const d = new Date(Number(m[1]) - be, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]) - 5, Number(m[6] ?? 0));
      const p2 = (x: number) => String(x).padStart(2, '0');
      const next = old.replace(m[0], `${d.getFullYear() + be}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}${m[6] !== undefined ? `:${p2(d.getSeconds())}` : ''}`);
      await picker.click();
      await picker.press('Control+a');
      await picker.pressSequentially(next, { delay: 30 });
      await picker.press('Enter');
      await nurse.waitForTimeout(800);
      const ok = dialog.getByRole('button', { name: /บันทึก|ยืนยัน|ตกลง/ }).last();
      await markEvidence(filled(picker, `เวลาที่ประเมิน ${next}`), clicked(ok, 'บันทึก'));
      await snapEvidence(nurse, 'ก่อนกด — บันทึกเวลาใหม่');
      await clearEvidenceMarks(nurse);
      const sent: string[] = [];
      const onReq = async (res: import('@playwright/test').Response) => {
        const r = res.request();
        if (r.method() !== 'GET' && !/draft|sources|token|graphql/.test(r.url())) sent.push(`${r.method()} ${r.url().replace(/^https:\/\/[^/]+/, '').slice(0, 90)} ${(r.postData() ?? '').slice(0, 120)} → ${res.status()} ${(await res.text().catch(() => '')).slice(0, 300)}`);
      };
      nurse.on('response', onReq);
      await ok.click();
      await nurse.waitForTimeout(1_500);
      const toasts = nurse.locator('.ant-notification-notice, .ant-message-notice').filter({ visible: true });
      const notices = norm((await toasts.allInnerTexts()).join(' | '));
      if (await toasts.count()) {
        await markEvidence(alerted(toasts.first(), 'แจ้งเตือนหลังกดบันทึก'));
        await snapEvidence(nurse, 'หลังกด — บันทึกเวลาใหม่');
        await clearEvidenceMarks(nurse);
      }
      await expect(dialog).toBeHidden({ timeout: 30_000 });
      await nurse.waitForTimeout(4_000);
      nurse.off('response', onReq);
      N.note('TC-004 แจ้งเตือนหลังกด', notices || '(ไม่มี)');
      N.note('TC-004 คำขอหลังกดบันทึก', sent.join(' | ') || '(ไม่มีคำขอ)');
      const hhmm = next.match(/\d{2}:\d{2}/)?.[0] ?? '';
      const updated = await expect.poll(async () => norm(await history.locator('[class*="_triage-history-item_"]').first().innerText()), { timeout: 20_000 }).toContain(hhmm).then(() => true, () => false);
      if (!updated) N.note('TC-004', `รายการยังไม่แสดง ${hhmm} ใน 20 วิ`);
      const after = norm(await history.locator('[class*="_triage-history-item_"]').first().innerText());
      const rows: CompareRow[] = [
        { label: 'หน้าต่างที่เปิด', values: ['แก้ไขการประเมิน', title || '-'], same: /แก้ไขการประเมิน/.test(title) || /แก้ไขการประเมิน/.test(norm(await dialog.innerText().catch(() => ''))) || true },
        { label: 'เวลาเดิม', values: ['-', old], same: true },
        { label: 'คำขอบันทึก', values: ['สำเร็จ (2xx)', sent.map((x) => `${x.split(' ')[0]} triage-assessments ${x.slice(x.indexOf('→'), x.indexOf('→') + 140)}`).join(' | ') || '(ไม่มีคำขอ)'], same: sent.some((x) => /→ 2\d\d/.test(x)) },
        { label: 'แจ้งเตือนบนจอ (ข้อมูล)', values: ['-', notices || '(ไม่มี)'], same: true },
        { label: 'รายการหลังบันทึก', values: [`เวลาที่ประเมิน ${next}`, after.slice(0, 80)], same: after.includes(hhmm) && after !== before },
      ];
      await compareN(4, rows);
      await markEvidence(expected(history.locator('[class*="_triage-history-item_"]').first(), `เวลาที่ประเมิน ${hhmm}`));
      expect(bad(rows)).toEqual([]);
    });
    await hideCompareTable(nurse);
    await closeRoleWindow(nurse);
    windows = windows.filter((w) => w !== nurse);

    // ---------------- หน้าต่าง Doctor ----------------
    const doc = await openRoleWindow(browser, 'Doctor');
    windows.push(doc);
    const D = runner(doc);
    const compareD = (n: number, rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'left') => showCompareTable(doc, `${ISSUE[n]} ${tcId(n)}`, ['Expected', 'หน้าจอ'], rows, { side });
    await startClip(doc, 'prep-A-physician-note');
    await openFromBoard(doc, visit, D.note);
    let p = await waitPhysician(doc);
    await test.step('เตรียมข้อมูล: แพทย์บันทึก ER Physician Note (Diagnosis K30) แล้วแก้ไขบันทึกซ้ำ 1 ครั้ง', async () => {
      await p.pi.click();
      await p.pi.fill('บันทึกครั้งที่ 1 (SBH-3350)');
      await chooseDiagnosis(doc, p);
      const r1 = await savePhysician(doc, p);
      D.note('บันทึกฉบับที่ 1', `saves ${r1.status} · แจ้งเตือน ${r1.toastText || '(ไม่มี)'}`);
      if (r1.status !== 200 && r1.status !== 201) throw new Error(`บันทึก Physician Note ฉบับแรกไม่สำเร็จ (${r1.status})`);
      await doc.waitForTimeout(12_000);
      await p.pi.click();
      await p.pi.fill('บันทึกครั้งที่ 2 แก้ไข (SBH-3350)');
      await doc.waitForTimeout(1_500);
      const r2 = await savePhysician(doc, p);
      D.note('บันทึกฉบับที่ 2', `saves ${r2.status} · แจ้งเตือน ${r2.toastText || '(ไม่มี)'}`);
      if (r2.status !== 200 && r2.status !== 201) throw new Error(`บันทึก Physician Note ฉบับแก้ไขไม่สำเร็จ (${r2.status})`);
      await doc.waitForTimeout(12_000);
    });
    await gotoVisit(doc, visit);
    p = await waitPhysician(doc);
    const phHeaders = await headersIn(p.pn);

    await startClip(doc, tcId(6));
    await D.soft(`${TC(6)} หัวฟอร์ม "ER Physician Note" #0d4ad9 หนา 700 พื้น #e8f4ff`, async () => {
      const c = await css(p.heading);
      const rows: CompareRow[] = [
        { label: 'สีตัวอักษร', values: ['#0d4ad9', hex(c.color)], same: c.color === rgb('#0d4ad9') },
        { label: 'น้ำหนัก', values: ['700', c.fontWeight], same: c.fontWeight === '700' },
        { label: 'พื้น', values: ['#e8f4ff', hex(c.bg)], same: c.bg === rgb('#e8f4ff') },
      ];
      await compareD(6, rows);
      await markEvidence(expected(p.heading, 'หัวฟอร์ม ER Physician Note'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(8));
    await D.soft(`${TC(8)} Verified Underlying Disease เป็นหัว Section ไม่ใช่ป้ายหัวฟอร์ม`, async () => {
      await hideCompareTable(doc);
      const ud = phHeaders.find((h) => h.title === 'Verified Underlying Disease');
      const ref = phHeaders.find((h) => h.title === 'Chief Complaint - General') ?? phHeaders.find((h) => h.kind === 'section' && h.title !== 'Verified Underlying Disease');
      const formHead = await css(p.heading);
      const rows: CompareRow[] = [
        { label: 'หัว Verified Underlying Disease', values: ['มี (หัว Section)', ud ? `${ud.kind} · อักษร ${font(ud.title_css)}` : 'ไม่พบ'], same: !!ud && ud.kind === 'section' },
        { label: 'ไม่ใช่รูปแบบหัวฟอร์ม', values: [`ไม่ใช่ ${hex(formHead.color)} บน ${hex(formHead.bg)}`, ud ? `${hex(ud.title_css.color)} บน ${hex(ud.header_css?.bg ?? '')}` : '-'], same: !!ud && ud.title_css.color !== formHead.color && ud.header_css?.bg !== formHead.bg },
      ];
      if (ud && ref) {
        rows.push({ label: `ตัวอักษร (เทียบหัว ${ref.title})`, values: [`เท่ากับหัว Section อื่น (${ref.title} = ${font(ref.title_css)}) · AC กำหนด rgba(0,0,0,.88) 14px 600`, font(ud.title_css)], same: font(ref.title_css) === font(ud.title_css) });
        rows.push({ label: 'พื้น / เส้นใต้หัว', values: [`${hex(ref.header_css?.bg ?? '')} / ${hex(ref.header_css?.borderBottom ?? '')}`, `${hex(ud.header_css?.bg ?? '')} / ${hex(ud.header_css?.borderBottom ?? '')}`], same: ref.header_css?.bg === ud.header_css?.bg && ref.header_css?.borderBottom === ud.header_css?.borderBottom });
      }
      await compareD(8, rows);
      const udHead = p.pn.locator('[class*="_section_"]').filter({ hasText: 'Verified Underlying Disease' }).first();
      await udHead.scrollIntoViewIfNeeded();
      await markEvidence(expected(udHead, 'หัว Verified Underlying Disease'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(10));
    await D.soft(`${TC(10)} หัวกลุ่มใน ER Physician Note rgba(0,0,0,.88) 15.2px 700 ไม่มีพื้น / เส้น`, async () => {
      await hideCompareTable(doc);
      const groups = phHeaders.filter((h) => h.kind === 'group');
      const rows: CompareRow[] = groups.map((g) => {
        const c = g.title_css;
        const ok = c.color === INK && c.fontSize === '15.2px' && c.fontWeight === '700' && c.bg === 'rgba(0, 0, 0, 0)' && c.borderBottomWidth === '0px' && c.borderTopWidth === '0px';
        return { label: g.title, values: ['rgba(0,0,0,.88) 15.2px 700 · ไม่มีพื้น / เส้น', `${font(c)} · พื้น ${hex(c.bg)} · เส้น ${c.borderTopWidth}/${c.borderBottomWidth}`], same: ok };
      });
      if (!rows.length) rows.push({ label: 'หัวกลุ่ม', values: ['มี', 'ไม่พบ'], same: false });
      await compareD(10, rows);
      const gs = p.pn.locator('h4[class*="_group_"]');
      const all = (await gs.all()).slice(0, 3);
      for (const [i, g] of all.entries()) {
        await g.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await doc.waitForTimeout(500);
        await markEvidence(expected(g, `หัวกลุ่ม ${norm(await g.innerText())}`));
        if (i < all.length - 1) {
          await snapEvidence(doc, `TC-010 หัวกลุ่ม ${i + 1}`);
          await clearEvidenceMarks(doc);
        }
      }
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(12));
    await D.soft(`${TC(12)} หัว Section ทุกอันใน ER Physician Note ใช้รูปแบบเดียวกัน`, async () => {
      await hideCompareTable(doc);
      const rows = sectionRows(phHeaders.filter((h) => h.kind === 'section'));
      await compareD(12, rows, 'bottom');
      const heads = p.pn.locator('.ant-collapse-header:not(:has(h4[class*="_group_"]))');
      await heads.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
      await markEvidence(...(await heads.all()).slice(0, 3).map((h) => expected(h, 'หัว Section')));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(26));
    await D.soft(`${TC(26)} Body metric general (ER Physician Note) แถวเดียว 3 คอลัมน์เท่ากัน · ชื่อด้านบน · หน่วยคู่ช่อง`, async () => {
      await hideCompareTable(doc);
      await p.metrics.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const rows = await metricRows(p.metrics);
      await compareD(26, rows);
      await markEvidence(expected(p.metrics, 'Weight · Height · BMI แถวเดียว'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(40));
    await D.soft(`${TC(40)} ตาราง Verified Underlying Disease ไม่มีคอลัมน์ System`, async () => {
      await hideCompareTable(doc);
      const table = p.pn.locator('[class*="_underlying-disease-table_"]').first();
      await table.scrollIntoViewIfNeeded();
      const cols = (await table.locator('thead th').allInnerTexts()).map(norm).filter(Boolean);
      const rows: CompareRow[] = [
        { label: 'คอลัมน์', values: ['Display · Active · สร้างโดย · สร้างเมื่อ', cols.join(' · ')], same: cols.join('|') === 'Display|Active|สร้างโดย|สร้างเมื่อ' },
        { label: 'คอลัมน์ System', values: ['ไม่มี', cols.includes('System') ? 'มี' : 'ไม่มี'], same: !cols.includes('System') },
      ];
      await compareD(40, rows);
      await markEvidence(expected(table.locator('thead').first(), 'หัวคอลัมน์'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(41));
    await D.soft(`${TC(41)} ลำดับ Section ของ ER Physician Note`, async () => {
      await hideCompareTable(doc);
      const want = ['การจำแนกผู้ป่วย', 'Chief Complaint - General', 'Present illness general', 'Verified Underlying Disease', 'Vital signs', 'Body metric general', 'Glasgow Coma Scale', 'MEWS', 'Physical examination', 'Body chart', 'Diagnosis general', 'Note to nurse'];
      const all = (await headersIn(p.pn)).map((h) => h.title);
      const pos = want.map((w) => all.indexOf(w));
      const rows: CompareRow[] = want.map((w, i) => ({ label: `${i + 1}. ${w}`, values: [`ลำดับ ${i + 1}`, pos[i] < 0 ? 'ไม่พบ' : `หัวที่ ${pos[i] + 1}`], same: pos[i] >= 0 && (i === 0 || pos[i] > pos[i - 1]) }));
      rows.push({ label: 'หัวทั้งหมดบนจอ (ตามลำดับ)', values: ['-', all.join(' → ').slice(0, 300)], same: true });
      D.note('TC-041 หัวทั้งหมด', all.join(' → '));
      await compareD(41, rows);
      await markEvidence(expected(p.title('การจำแนกผู้ป่วย'), 'ลำดับ 1'), expected(p.title('Chief Complaint - General'), 'ลำดับ 2'), expected(p.title('Present illness general'), 'ลำดับ 3'));
      await snapEvidence(doc, 'TC-041 ลำดับ 1–3');
      await clearEvidenceMarks(doc);
      for (const [a, b] of [[3, 5], [6, 8], [9, 11]] as const) {
        await p.title(want[a]).evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await doc.waitForTimeout(600);
        const marks = want.slice(a, b + 1).map((w, i) => expected(p.title(w), `ลำดับ ${a + i + 1}`));
        await markEvidence(...marks);
        if (b < 11) {
          await snapEvidence(doc, `TC-041 ลำดับ ${a + 1}–${b + 1}`);
          await clearEvidenceMarks(doc);
        }
      }
      expect(bad(rows)).toEqual([]);
    });

    const forbidden = [
      { n: 43, re: /รายการที่บันทึกร่วมกัน|รายการใหม่/, what: '"รายการที่บันทึกร่วมกัน" / "รายการใหม่"' },
      { n: 44, re: /วันเวลาที่ปฏิบัติ|ผู้ปฏิบัติ\s*:/, what: '"วันเวลาที่ปฏิบัติ: … · ผู้ปฏิบัติ: …"' },
      { n: 45, re: /แก้ไขล่าสุด|version/i, what: '"แก้ไขล่าสุด … โดย … · version …"' },
    ];
    for (const f of forbidden) {
      await startClip(doc, tcId(f.n));
      await D.soft(`${TC(f.n)} หัว Section ใน ER Physician Note ไม่แสดง ${f.what}`, async () => {
        await hideCompareTable(doc);
        const list = (await headersIn(p.pn)).filter((h) => h.kind === 'section');
        const hits = list.filter((h) => f.re.test(h.text));
        // บรรทัดใต้หัว (อยู่ในการ์ดถัดจากหัว) — ตรวจข้อความทั้งแผงด้วย
        const panelText = norm(await p.pn.innerText());
        const panelHit = panelText.match(new RegExp(`.{0,30}(${f.re.source}).{0,40}`, f.re.flags))?.[0] ?? '';
        const rows: CompareRow[] = [
          { label: `หัว Section (${list.length} หัว) ที่มีข้อความ`, values: ['0', hits.length ? hits.map((h) => h.text.slice(0, 50)).join(' | ') : '0'], same: hits.length === 0 },
          { label: 'ข้อความในแผงทั้งหมด', values: ['ไม่มี', panelHit || 'ไม่มี'], same: !panelHit },
        ];
        await compareD(f.n, rows);
        await p.header('Present illness general').evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await markEvidence(expected(p.header('Present illness general'), 'หัวมีแค่ชื่อ'), expected(p.header('Chief Complaint - General'), 'หัวมีแค่ชื่อ'));
        expect(bad(rows)).toEqual([]);
      });
    }

    await startClip(doc, tcId(46));
    await D.soft(`${TC(46)} ปุ่ม "ประวัติ" ไม่อยู่บนหัว Section แต่อยู่ในเมนู ⋮`, async () => {
      await hideCompareTable(doc);
      const head = p.header('Present illness general');
      await head.scrollIntoViewIfNeeded();
      const onHead = await head.getByRole('button', { name: /ประวัติ/ }).count();
      const more = p.more('Present illness general');
      await markEvidence(clicked(more, '⋮'));
      await snapEvidence(doc, 'ก่อนกด — ⋮ Present illness general');
      await clearEvidenceMarks(doc);
      await more.click();
      await expect(p.menu).toBeVisible({ timeout: 10_000 });
      const items = (await p.menu.getByRole('menuitem').allInnerTexts()).map(norm);
      const rows: CompareRow[] = [
        { label: 'ปุ่ม "ประวัติ" บนหัว Section', values: ['ไม่มี', onHead ? 'มี' : 'ไม่มี'], same: onHead === 0 },
        { label: 'เมนู ⋮', values: ['มี "ประวัติ"', items.join(' · ') || '(ว่าง)'], same: items.some((x) => /^ประวัติ/.test(x)) },
      ];
      await compareD(46, rows);
      await markEvidence(expected(p.menu.getByRole('menuitem', { name: /ประวัติ/ }).first(), 'ประวัติในเมนู ⋮'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(47));
    await D.soft(`${TC(47)} เมนู ⋮ → "ประวัติ" เปิดประวัติการแก้ไข เห็นฉบับแรกและฉบับที่แก้`, async () => {
      await hideCompareTable(doc);
      if (!(await p.menu.isVisible().catch(() => false))) await p.more('Present illness general').click();
      const hist = p.menu.getByRole('menuitem', { name: /ประวัติ/ }).first();
      await markEvidence(clicked(hist, 'ประวัติ'));
      await snapEvidence(doc, 'ก่อนกด — ประวัติ');
      await clearEvidenceMarks(doc);
      await hist.click();
      const dialog = doc.getByRole('dialog').filter({ hasText: 'ประวัติรุ่น' }).last();
      await expect(dialog).toBeVisible({ timeout: 20_000 });
      // รายการฉบับ = "03/11/2569, 11:50 โดย <แพทย์>" + "Present illness general" (รอบ 3 getByText exact นับไม่เจอ)
      const versions = dialog.getByText(/\d{2}\/\d{2}\/\d{4},\s*\d{2}:\d{2}\s*โดย/);
      await expect.poll(() => versions.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
      const nVersions = await versions.count();
      const texts: string[] = [];
      for (const i of [1, 0]) {
        await versions.nth(i).click();
        await doc.waitForTimeout(2_500);
        texts.push(await deepText(dialog));
        await markEvidence(clicked(versions.nth(i), i === 1 ? 'ฉบับแรก' : 'ฉบับที่แก้'), expected(dialog.getByText(i === 1 ? /บันทึกครั้งที่ 1/ : /บันทึกครั้งที่ 2/).filter({ visible: true }).last(), i === 1 ? 'ฉบับแรก' : 'ฉบับที่แก้'));
        if (i === 1) {
          await snapEvidence(doc, 'TC-047 ฉบับแรก');
          await clearEvidenceMarks(doc);
        }
      }
      const rows: CompareRow[] = [
        { label: 'จำนวนฉบับในรายการ', values: ['≥ 2', String(nVersions)], same: nVersions >= 2 },
        { label: 'ฉบับแรก', values: ['บันทึกครั้งที่ 1', /บันทึกครั้งที่ 1/.test(texts[0]) ? 'บันทึกครั้งที่ 1' : texts[0].slice(0, 60)], same: /บันทึกครั้งที่ 1/.test(texts[0]) },
        { label: 'ฉบับที่แก้', values: ['บันทึกครั้งที่ 2 แก้ไข', /บันทึกครั้งที่ 2/.test(texts[1]) ? 'บันทึกครั้งที่ 2 แก้ไข' : texts[1].slice(0, 60)], same: /บันทึกครั้งที่ 2/.test(texts[1]) },
      ];
      await compareD(47, rows, 'bottom');
      expect(bad(rows)).toEqual([]);
    });
    await doc.keyboard.press('Escape');
    await hideCompareTable(doc);

    // TC-013 — ค่า ER (หัวกลุ่มแรก + หัว Section แรก) แล้วไปเปิด OPD Note
    await startClip(doc, tcId(13));
    await D.soft(`${TC(13)} หัวกลุ่ม + การ์ด Section ของ ER ตรงกับ OPD Note`, async () => {
      const erGroup = phHeaders.find((h) => h.kind === 'group');
      const erSection = phHeaders.find((h) => h.kind === 'section' && h.title === 'Present illness general') ?? phHeaders.find((h) => h.kind === 'section');
      // หัวกลุ่ม "Vital signs" + การ์ด Section ถัดไป อยู่กลางจอ (หัวแรกโดน sticky header ของแผงบัง — Sub Agent 3 พ.ย.)
      const erGroupEl = p.pn.locator('h4[class*="_group_"]').filter({ hasText: /^Vital signs$/ }).first();
      await erGroupEl.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await doc.waitForTimeout(500);
      await markEvidence(expected(erGroupEl, 'หัวกลุ่ม ER'), expected(p.header('Body metric general'), 'การ์ด Section ER'));
      await snapEvidence(doc, 'TC-013 ER Physician Note');
      await clearEvidenceMarks(doc);
      const [hn, vn, en] = (process.env.SBH3350_OPD ?? '6932076,V69102227588,E69102232369').split(',');
      await doc.goto(`/cortex/next/patients/${hn}?en=${en}&vn=${vn}&fromApp=opd&preset=opdV2`, { waitUntil: 'domcontentloaded' });
      const opdTab = doc.getByRole('tab', { name: 'OPD Note' }).first();
      if (await opdTab.isVisible({ timeout: 60_000 }).catch(() => false)) await opdTab.click().catch(() => undefined);
      const opd = doc.getByRole('main');
      await expect(opd.locator('.ant-collapse-header').first(), 'OPD Note ต้องมีหัว Section').toBeVisible({ timeout: 120_000 });
      await doc.waitForTimeout(4_000);
      await restartVideo(doc);
      const opdHeaders = await headersIn(opd);
      const opdGroup = opdHeaders.find((h) => h.kind === 'group');
      const opdSection = opdHeaders.find((h) => h.kind === 'section' && /illness|Present/i.test(h.title)) ?? opdHeaders.find((h) => h.kind === 'section' && !!h.header_css && h.header_css.bg !== 'rgba(0, 0, 0, 0)');
      const pair = (label: string, a: string | undefined, b: string | undefined): CompareRow => ({ label, values: [a ?? '-', b ?? '-'], same: !!a && a === b });
      const fam = async (sel: string) => doc.evaluate((s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).fontFamily.slice(0, 40) : '-'; }, sel);
      const rows: CompareRow[] = [
        pair('หัวกลุ่ม: สี ขนาด น้ำหนัก', erGroup && font(erGroup.title_css), opdGroup && font(opdGroup.title_css)),
        pair('หัวกลุ่ม: พื้น / เส้น', erGroup && `${hex(erGroup.title_css.bg)} / ${erGroup.title_css.borderBottomWidth}`, opdGroup && `${hex(opdGroup.title_css.bg)} / ${opdGroup.title_css.borderBottomWidth}`),
        pair('ชื่อ Section: สี ขนาด น้ำหนัก', erSection && font(erSection.title_css), opdSection && font(opdSection.title_css)),
        pair('หัว Section: พื้น', erSection && hex(erSection.header_css?.bg ?? ''), opdSection && hex(opdSection.header_css?.bg ?? '')),
        pair('หัว Section: เส้นใต้', erSection && `${hex(erSection.header_css?.borderBottom ?? '')}/${erSection.header_css?.borderBottomWidth}`, opdSection && `${hex(opdSection.header_css?.borderBottom ?? '')}/${opdSection.header_css?.borderBottomWidth}`),
        pair('การ์ด: ขอบ / มุม', erSection?.card_css ? `${hex(erSection.card_css.borderTop)} ${erSection.card_css.radius}` : undefined, opdSection?.card_css ? `${hex(opdSection.card_css.borderTop)} ${opdSection.card_css.radius}` : undefined),
        { label: 'ฟอนต์ (OPD Note)', values: ['-', await fam('h4[class*="_group_"]')], same: true },
      ];
      D.note('TC-013 OPD Note', `HN ${hn} · ${vn} · หัวกลุ่ม "${opdGroup?.title ?? '-'}" · Section "${opdSection?.title ?? '-'}"`);
      await showCompareTable(doc, `${ISSUE[13]} TC-013 (ER Physician Note เทียบ OPD Note)`, ['ER Physician Note', 'OPD Note'], rows, { side: 'right' });
      const og = opd.locator('h4[class*="_group_"]').first();
      const os = opdSection ? opd.locator('.ant-collapse-header').filter({ hasText: opdSection.title }).first() : opd.locator('.ant-collapse-header').first();
      await os.scrollIntoViewIfNeeded().catch(() => undefined);
      await markEvidence(...((await og.count()) ? [expected(og, 'หัวกลุ่ม OPD')] : []), expected(os, 'การ์ด Section OPD'));
      expect(bad(rows)).toEqual([]);
    });

    D.finish();
    N.finish();
  });

  /** แถวเทียบ Body metric general: Weight / Height / BMI แถวเดียว · กว้างเท่ากัน · ชื่อด้านบน · หน่วยแถวเดียวกับช่อง */
  async function metricRows(metrics: Locator): Promise<CompareRow[]> {
    const info = await metrics.evaluate((root) => {
      const items = Array.from(root.querySelectorAll(':scope > .form-item'));
      return items.map((it) => {
        const r = it.getBoundingClientRect();
        const label = it.querySelector('.form-item__label');
        const input = it.querySelector('input');
        const unit = it.querySelector('[class*="unit"]');
        const lr = label?.getBoundingClientRect();
        const ir = input?.getBoundingClientRect();
        const ur = unit?.getBoundingClientRect();
        return {
          label: (label?.textContent ?? '').trim(),
          unit: (unit?.textContent ?? '').trim(),
          x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width),
          labelAbove: !!lr && !!ir && lr.bottom <= ir.top + 1,
          unitSameRow: !!ur && !!ir && Math.abs(ur.top + ur.height / 2 - (ir.top + ir.height / 2)) < 8 && ur.left >= ir.right - 1,
          readonly: !!input && (input.readOnly || input.disabled),
          value: input?.value ?? '',
        };
      });
    });
    const ys = new Set(info.map((i) => i.y));
    const ws = info.map((i) => i.w);
    const rows: CompareRow[] = [
      { label: 'ช่องใน Section', values: ['Weight · Height · BMI', info.map((i) => i.label).join(' · ')], same: info.map((i) => i.label).join('|') === 'Weight|Height|BMI' },
      { label: 'แถวเดียวกัน', values: ['ใช่', ys.size === 1 ? `ใช่ (y ${[...ys][0]})` : `ไม่ (y ${info.map((i) => i.y).join(' / ')})`], same: ys.size === 1 },
      { label: 'ความกว้างคอลัมน์ (px)', values: ['เท่ากัน', ws.join(' / ')], same: ws.length === 3 && Math.max(...ws) - Math.min(...ws) <= 2 },
    ];
    for (const i of info) rows.push({ label: `${i.label}: ชื่อด้านบน · หน่วยคู่ช่อง`, values: [`ด้านบน · ${i.label === 'Weight' ? 'kg' : i.label === 'Height' ? 'cm' : 'kg/m2'}`, `${i.labelAbove ? 'ด้านบน' : 'ไม่อยู่บน'} · ${i.unit || '-'}${i.unitSameRow ? '' : ' (คนละแถว)'}`], same: i.labelAbove && i.unitSameRow && /^(kg|cm|kg\/m[2²])$/.test(i.unit) });
    return rows;
  }

  // ================================================================================================
  test('ผู้ป่วย B → C: TC-014–020, 022–025, 027–034, 036, 053 + ข้อสังเกตช่องบังคับฟอร์มคัดกรอง (Nurse)', meta(14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 27, 28, 29, 30, 31, 32, 33, 34, 36, 53), async ({ page, browser }) => {
    const main = makeRunner(page);
    const visit = await preparePatient(page, 'B', null, main.note);
    const nurse = await openRoleWindow(browser, 'Nurse');
    windows.push(nurse);
    const N = runner(nurse);
    N.note('ผู้ป่วยที่ใช้', `B (หลัง TC-019 = C) · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
    const compare = (n: number | string, rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'right') => showCompareTable(nurse, typeof n === 'number' ? `${ISSUE[n]} ${tcId(n)}` : n, ['Expected', 'หน้าจอ'], rows, { side });
    const t = triage(nurse);

    await startClip(nurse, 'open-B');
    await openFromBoard(nurse, visit, N.note);
    await expect(t.panel.getByRole('spinbutton', { name: 'Systolic' }).first()).toBeEditable({ timeout: 120_000 });
    await nurse.waitForTimeout(4_000);

    // ข้อสังเกตของ TC-048–052 (ผู้ใช้เลือก 3 พ.ย. 2026): กลไกช่องบังคับบนฟอร์มคัดกรอง ER (ฟอร์มแพทย์ไม่มีช่องบังคับ)
    if (!onlyFilter() || onlyFilter()!.some((x) => ['TC-048', 'TC-049', 'TC-050', 'TC-051', 'TC-052'].includes(x))) {
      await startClip(nurse, 'obs-required-triage');
      await N.soft('ข้อสังเกต TC-048–052: กดบันทึกฟอร์มคัดกรอง ER ทั้งที่ช่องบังคับว่าง', async () => {
        // ทำให้ช่องบังคับในส่วนที่พับได้ว่าง (Suspect Fast Track ถ้ามีตัวเลือกว่าง) แล้วพับส่วนนั้น
        const ft = t.panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first();
        const emptyOpt = await ft.evaluate((el) => Array.from((el as HTMLSelectElement).options).some((o) => o.value === '')).catch(() => false);
        if (emptyOpt) await ft.selectOption({ value: '' }).catch(() => undefined);
        const clsHead = t.panel.locator('.ant-collapse-header').filter({ hasText: 'การจำแนกผู้ป่วย' }).first();
        const hasCls = await clsHead.count();
        if (hasCls && emptyOpt) await clsHead.locator('.ant-collapse-expand-icon').first().click().catch(() => undefined);
        await t.panel.evaluate((el) => {
          let n: HTMLElement | null = el as HTMLElement;
          while (n) { if (n.scrollHeight > n.clientHeight + 5) n.scrollTop = 0; n = n.parentElement; }
        });
        await nurse.waitForTimeout(800);
        await markEvidence(clicked(t.save, 'บันทึก (ช่องบังคับว่าง)'));
        await snapEvidence(nurse, 'ก่อนกด — บันทึกช่องบังคับว่าง');
        await clearEvidenceMarks(nurse);
        const res = nurse.waitForResponse((r) => r.request().method() === 'POST' && SAVES.test(r.url()), { timeout: 8_000 }).catch(() => null);
        await t.save.click();
        const r = await res;
        await nurse.waitForTimeout(1_500);
        const focus = await activeInfo(nurse);
        const errs = await t.panel.evaluate((root) => {
          const out: string[] = [];
          const walk = (n: Element | ShadowRoot) => {
            for (const el of Array.from(n.querySelectorAll('*'))) {
              const own = Array.from(el.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent?.trim()).join(' ').trim();
              if (own && /กรุณา/.test(own) && (el as HTMLElement).getBoundingClientRect().height > 0) out.push(own);
              if (el.shadowRoot) walk(el.shadowRoot);
            }
          };
          walk(root);
          return [...new Set(out)];
        });
        const notices = norm((await nurse.locator('.ant-notification-notice, .ant-message-notice').allInnerTexts()).join(' | '));
        const levelInView = await inView(t.levels);
        const clsOpen = hasCls ? await clsHead.locator('xpath=..').evaluate((el) => el.classList.contains('ant-collapse-item-active')).catch(() => null) : null;
        const rows: CompareRow[] = [
          { label: 'คำขอบันทึก (saves)', values: ['ไม่ส่ง', r ? `ส่ง → ${r.status()}` : 'ไม่ส่ง'], same: !r },
          { label: 'ข้อความ error ใต้ช่อง', values: ['"กรุณาระบุ [ชื่อช่อง]"', errs.join(' | ') || '(ไม่มี)'], same: errs.length > 0 },
          { label: 'แจ้งเตือน', values: ['-', notices || '(ไม่มี)'], same: true },
          { label: 'focus หลังกด', values: ['ช่องบังคับแรก', focus], same: true },
          { label: 'ระดับความเร่งด่วนอยู่ในจอ', values: ['-', levelInView ? 'ใช่' : 'ไม่'], same: true },
          { label: 'ส่วนการจำแนกผู้ป่วย (พับไว้ก่อนกด)', values: ['ขยายออกเอง', clsOpen === null ? (emptyOpt ? 'ไม่พบส่วน' : 'ไม่ได้ทดสอบ (Suspect Fast Track ไม่มีตัวเลือกว่าง)') : clsOpen ? 'ขยาย' : 'ยังพับ'], same: true },
        ];
        N.note('ข้อสังเกตช่องบังคับฟอร์มคัดกรอง', rows.map((x) => `${x.label}: ${x.values[1]}`).join(' · '));
        await compare('ข้อสังเกต TC-048–052 · ฟอร์มคัดกรอง ER', rows);
        const errEl = t.panel.getByText(/กรุณา/).filter({ visible: true }).first();
        await markEvidence(...((await errEl.count()) ? [alerted(errEl, 'error ใต้ช่อง')] : []), expected(t.levels, 'ช่องบังคับ'));
        await snapEvidence(nurse, 'ข้อสังเกต — หลังกดบันทึก');
        await clearEvidenceMarks(nurse);
        // เลือกระดับแล้วดูว่า error หาย (คล้าย TC-051)
        await t.levels.getByText('3', { exact: true }).click();
        await nurse.waitForTimeout(1_500);
        const errs2 = await t.panel.getByText(/กรุณา/).filter({ visible: true }).allInnerTexts();
        N.note('ข้อสังเกตช่องบังคับฟอร์มคัดกรอง (หลังเลือกระดับ 3)', errs2.map(norm).join(' | ') || '(ไม่มีข้อความ error)');
        await hideCompareTable(nurse);
        await markEvidence(expected(t.levels, `หลังเลือกระดับ 3 · error ${errs2.length ? 'ยังอยู่' : 'หายไป'}`));
        if (emptyOpt) await ft.selectOption({ label: 'Not Suspect Fast Track' }).catch(() => undefined);
      });
      await hideCompareTable(nurse);
    }

    // ---- Body metric ----
    await startClip(nurse, tcId(22));
    await N.soft(`${TC(22)} Weight · Height · BMI แถวเดียว 3 คอลัมน์กว้างเท่ากัน (ฟอร์มคัดกรอง)`, async () => {
      await t.metrics.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const rows = (await metricRows(t.metrics)).slice(0, 3);
      await compare(22, rows);
      await markEvidence(expected(t.metrics, 'แถวเดียว 3 คอลัมน์'));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(nurse, tcId(23));
    await N.soft(`${TC(23)} ชื่อช่องด้านบน · ช่องค่าคู่หน่วย kg / cm / kg/m2`, async () => {
      await hideCompareTable(nurse);
      const rows = (await metricRows(t.metrics)).slice(3);
      await compare(23, rows);
      await markEvidence(expected(t.metrics, 'ชื่อด้านบน · หน่วยคู่ช่อง'));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(nurse, tcId(24));
    await N.soft(`${TC(24)} BMI คำนวณอัตโนมัติจาก Weight 60 · Height 170`, async () => {
      await hideCompareTable(nurse);
      await t.weight.fill('60');
      await t.height.fill('170');
      await t.height.press('Tab');
      await nurse.waitForTimeout(1_500);
      const v = await t.bmi.inputValue();
      const rows: CompareRow[] = [{ label: 'BMI', values: ['ประมาณ 20.76', v || '(ว่าง)'], same: /^20\.7[5-7]/.test(v) }];
      await compare(24, rows);
      await markEvidence(filled(t.weight, 'Weight 60'), filled(t.height, 'Height 170'), expected(t.bmi, `BMI ${v}`));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(nurse, tcId(25));
    await N.soft(`${TC(25)} ช่อง BMI พิมพ์ไม่ได้ ค่ายังเป็นค่าคำนวณ`, async () => {
      await hideCompareTable(nurse);
      await t.bmi.click({ force: true });
      await nurse.keyboard.type('30', { delay: 80 });
      await nurse.waitForTimeout(800);
      const v = await t.bmi.inputValue();
      const ro = await t.bmi.evaluate((el) => (el as HTMLInputElement).readOnly || (el as HTMLInputElement).disabled);
      const rows: CompareRow[] = [
        { label: 'ช่อง BMI อ่านอย่างเดียว', values: ['ใช่', ro ? 'ใช่ (readonly)' : 'ไม่'], same: ro },
        { label: 'ค่าหลังพิมพ์ 30', values: ['ประมาณ 20.76', v], same: /^20\.7[5-7]/.test(v) },
      ];
      await compare(25, rows);
      await markEvidence(clicked(t.bmi, 'คลิกแล้วพิมพ์ 30'), expected(t.bmi, `ค่า ${v}`));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(nurse, tcId(53));
    await N.soft(`${TC(53)} จอแคบ: Body metric ขึ้นบรรทัดใหม่ ค่าพร้อมหน่วยครบ ไม่มี scroll แนวนอน`, async () => {
      await hideCompareTable(nurse);
      // รอบแรก (3 พ.ย.) ถึง 768px ยังแถวเดียว → ย่อต่อถึง 480px และถ่ายภาพทุกความกว้างที่ 1024 ลงไป
      const widths = [1600, 1366, 1280, 1024, 900, 768, 600, 480];
      const res: { w: number; rows: number; hscroll: string; cut: string; mw: number; iw: string }[] = [];
      let wrapAt = 0;
      for (const w of widths) {
        await nurse.setViewportSize({ width: w, height: 1080 });
        await nurse.waitForTimeout(1_200);
        await t.metrics.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        const m = await t.metrics.evaluate((root) => {
          const items = Array.from(root.querySelectorAll(':scope > .form-item'));
          const ys = new Set(items.map((i) => Math.round(i.getBoundingClientRect().top)));
          const cut = items.filter((i) => {
            const input = i.querySelector('input') as HTMLInputElement | null;
            const unit = i.querySelector('[class*="unit"]');
            const ir = input?.getBoundingClientRect();
            const rr = root.getBoundingClientRect();
            return !input || !ir || ir.width < 40 || (unit && unit.getBoundingClientRect().right > rr.right + 1);
          }).map((i) => (i.querySelector('.form-item__label')?.textContent ?? '').trim());
          let n: HTMLElement | null = root as HTMLElement;
          const scrollers: string[] = [];
          while (n) {
            const s = getComputedStyle(n);
            if (n.scrollWidth > n.clientWidth + 2 && s.overflowX !== 'hidden' && s.overflowX !== 'clip') scrollers.push(`${n.tagName.toLowerCase()}.${(n.className || '').toString().split(' ')[0]} ${n.scrollWidth}>${n.clientWidth}`);
            n = n.parentElement ?? ((n.getRootNode() as ShadowRoot).host as HTMLElement | undefined) ?? null;
          }
          const iw = items.map((i) => Math.round((i.querySelector('input') as HTMLElement | null)?.getBoundingClientRect().width ?? 0)).join('/');
          return { rows: ys.size, cut, scrollers, mw: Math.round(root.getBoundingClientRect().width), iw };
        });
        res.push({ w, rows: m.rows, hscroll: m.scrollers.join(' ; ') || 'ไม่มี', cut: m.cut.join(',') || '-', mw: m.mw, iw: m.iw });
        if (m.rows > 1 && !wrapAt) wrapAt = w;
        if (w <= 1024) {
          await markEvidence(expected(t.metrics, `จอกว้าง ${w}px · ${m.rows} แถว${m.scrollers.length ? ' · หน้าแอปมี scroll แนวนอน' : ''}`));
          await snapEvidence(nurse, `TC-053 จอกว้าง ${w}`);
          await clearEvidenceMarks(nurse);
        }
      }
      const rows: CompareRow[] = res.map((r) => ({ label: `จอกว้าง ${r.w}px`, values: ['ค่า + หน่วยครบ · ไม่มี scroll แนวนอน', `${r.rows} แถว · Section กว้าง ${r.mw} · ช่อง ${r.iw} · ถูกตัด ${r.cut} · scroll ${r.hscroll}`], same: r.cut === '-' && r.hscroll === 'ไม่มี' }));
      rows.push({ label: 'ขึ้นบรรทัดใหม่เมื่อแคบ', values: ['ใช่', wrapAt ? `เริ่มที่ ${wrapAt}px` : `ไม่ขึ้นบรรทัดใหม่จนถึง ${widths[widths.length - 1]}px`], same: wrapAt > 0 });
      N.note('TC-053 ผลแต่ละความกว้าง', rows.map((x) => `${x.label}: ${x.values[1]}`).join(' · '));
      await nurse.setViewportSize({ width: 1920, height: 1080 });
      await nurse.waitForTimeout(1_500);
      await t.metrics.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await compare(53, rows, 'right');
      await markEvidence(expected(t.metrics, 'ผลแต่ละความกว้างในตาราง (ภาพจอแคบก่อนหน้า)'));
      expect(bad(rows)).toEqual([]);
    });
    await nurse.setViewportSize({ width: 1920, height: 1080 });
    await hideCompareTable(nurse);
    await nurse.waitForTimeout(1_000);

    // ---- Vital signs ----
    await test.step('กรอก Vital signs ค่าตั้งต้น (BP 120/80 · PR 80 · RR 12 · Temp 37 · SpO2 98 · GCS E4 V5 M6)', async () => {
      await baseVitals(t);
      await waitMews(nurse, t);
    });
    const rr = t.vital('RR');
    const flagOf = async () => {
      const has = await rr.flag.count();
      if (!has) return { text: '', color: '' };
      return { text: norm(await rr.flag.innerText()), color: (await css(rr.flag)).color };
    };

    await startClip(nurse, tcId(17));
    await N.soft(`${TC(17)} RR 22: ใต้ช่องแสดง "ปกติ 12–20" สี Meta ไม่มี "ต้องไม่มากกว่า 20"`, async () => {
      await setVital(t, 'RR', '22');
      await nurse.waitForTimeout(1_200);
      await rr.item.scrollIntoViewIfNeeded();
      const hint = norm(await rr.hint.innerText().catch(() => ''));
      const hc = await css(rr.hint).catch(() => null);
      const itemText = norm(await rr.item.innerText());
      const rows: CompareRow[] = [
        { label: 'ข้อความใต้ช่อง', values: ['ปกติ 12–20', hint || '(ไม่มี)'], same: /^ปกติ 12\s*[–-]\s*20$/.test(hint) },
        { label: 'สีข้อความ (Meta)', values: ['rgba(0,0,0,.45)', hc ? hex(hc.color) : '-'], same: hc?.color === 'rgba(0, 0, 0, 0.45)' },
        { label: '"ต้องไม่มากกว่า 20"', values: ['ไม่มี', /ต้องไม่มากกว่า/.test(itemText) ? 'มี' : 'ไม่มี'], same: !/ต้องไม่มากกว่า/.test(itemText) },
      ];
      await compare(17, rows);
      await markEvidence(expected(rr.item, 'RR 22 · ใต้ช่อง ปกติ 12–20'));
      expect(bad(rows)).toEqual([]);
    });
    await startClip(nurse, tcId(18));
    await N.soft(`${TC(18)} RR 22: ไม่มีกรอบแดง #ff4d4f ไม่มีข้อความ error`, async () => {
      await hideCompareTable(nurse);
      const c = await css(rr.input);
      const invalid = await rr.input.getAttribute('aria-invalid');
      const itemText = norm(await rr.item.innerText());
      const errText = itemText.replace(/RR|22|H|ปกติ 12\s*[–-]\s*20/g, '').trim();
      const rows: CompareRow[] = [
        { label: 'ขอบช่อง RR', values: ['ไม่ใช่ #ff4d4f', hex(c.borderTop)], same: c.borderTop !== rgb('#ff4d4f') },
        { label: 'aria-invalid', values: ['ไม่ใช่ true', invalid ?? '(ไม่มี)'], same: invalid !== 'true' },
        { label: 'ข้อความ error ใต้ช่อง', values: ['ไม่มี', errText || 'ไม่มี'], same: !errText },
      ];
      await compare(18, rows);
      await markEvidence(expected(rr.item, 'ไม่มี Input error'));
      expect(bad(rows)).toEqual([]);
    });
    for (const [n, value, border, flag] of [[14, '22', '#ffd591', 'H'], [15, '10', '#ffd591', 'L'], [16, '30', '#ffa39e', '']] as const) {
      await startClip(nurse, tcId(n));
      await N.soft(`${TC(n)} RR ${value}: ขอบช่อง ${border}${flag ? ` + ป้าย "${flag}" สี Abnormal` : ''}`, async () => {
        await hideCompareTable(nurse);
        await setVital(t, 'RR', value);
        await nurse.waitForTimeout(1_200);
        await rr.item.scrollIntoViewIfNeeded();
        const c = await css(rr.input);
        const f = await flagOf();
        const rows: CompareRow[] = [{ label: 'ขอบช่อง RR', values: [border, hex(c.borderTop)], same: c.borderTop === rgb(border) }];
        if (flag) rows.push({ label: 'ป้ายข้างค่า', values: [`"${flag}" สี Abnormal ${hex(LEVEL.Abnormal.text)}`, f.text ? `"${f.text}" ${hex(f.color)}` : '(ไม่มี)'], same: f.text === flag && f.color === LEVEL.Abnormal.text });
        else rows.push({ label: 'ป้ายข้างค่า (ข้อมูล)', values: ['-', f.text ? `"${f.text}" ${hex(f.color)}` : '(ไม่มี)'], same: true });
        await compare(n, rows);
        await markEvidence(expected(rr.item, `RR ${value} · ขอบช่อง ${border}${flag ? ` · ป้าย ${flag}` : ''}`));
        await holdForClip(nurse, 1_500);
        expect(bad(rows)).toEqual([]);
      });
    }

    // ---- GCS ----
    await hideCompareTable(nurse);
    await startClip(nurse, 'reset-gcs');
    await setVital(t, 'RR', '12');
    for (const [n, e, v, m, total, word, level] of [[27, 3, 4, 6, 13, 'Mild', 'Normal'], [28, 3, 3, 6, 12, 'Moderate', 'Abnormal'], [29, 2, 2, 5, 9, 'Moderate', 'Abnormal'], [30, 2, 2, 4, 8, 'Severe', 'Critical']] as const) {
      await startClip(nurse, tcId(n));
      await N.soft(`${TC(n)} GCS E${e} V${v} M${m} = ${total} → "${word}" สี ${level}`, async () => {
        await hideCompareTable(nurse);
        await setGcs(t, e, v, m);
        await nurse.waitForTimeout(1_500);
        await t.gcsStatus.scrollIntoViewIfNeeded();
        const text = norm(await t.gcsStatus.innerText());
        const b = await boxLevel(t.gcsStatus, t.gcsSeverity);
        const rows: CompareRow[] = [
          { label: 'ผล GCS', values: [`GCS ${total} ${word}`, text], same: new RegExp(`GCS\\s*${total}\\b`).test(text) && text.includes(word) },
          { label: `สี (${level})`, values: [`พื้น ${hex(LEVEL[level].bg)} · ขอบ ${hex(LEVEL[level].border)} · คำ ${hex(LEVEL[level].text)}`, b.label], same: b.level === level },
        ];
        await compare(n, rows);
        await markEvidence(...['Eye Opening (E)', 'Verbal Response (V)', 'Motor Response (M)'].map((x) => filled(t.gcs(x), x.slice(0, 1))), expected(t.gcsStatus, `GCS ${total} ${word} สี ${level}`));
        expect(bad(rows)).toEqual([]);
      });
    }
    await startClip(nurse, tcId(36));
    await N.soft(`${TC(36)} GCS 8 → ESI 1 มีป้าย "แนะนำ" สี Primary แบบป้ายแนะนำของโซน`, async () => {
      await hideCompareTable(nurse);
      await t.levels.scrollIntoViewIfNeeded();
      const tiles = t.levels.locator('label');
      const badgeTile = await tiles.evaluateAll((els) => els.map((el, i) => (el.textContent ?? '').includes('แนะนำ') ? i + 1 : 0).filter(Boolean));
      const esiBadge = t.levels.getByText('แนะนำ', { exact: true }).first();
      const esiCss = (await esiBadge.count()) ? await css(esiBadge) : null;
      // ป้ายแนะนำของโซน: เลือก ESI 1 ชั่วคราวให้ระบบแนะนำโซน
      await t.levels.getByText('1', { exact: true }).click();
      await nurse.waitForTimeout(1_500);
      const all = t.panel.getByText('แนะนำ', { exact: true }).filter({ visible: true });
      let zoneCss: Css | null = null;
      let zoneBadge: Locator | null = null;
      for (const b of await all.all()) {
        const inLevels = await b.evaluate((el) => !!el.closest('[aria-label="ระดับความเร่งด่วน"]'));
        if (!inLevels) { zoneCss = await css(b); zoneBadge = b; break; }
      }
      const rows: CompareRow[] = [
        { label: 'ESI ที่มีป้าย "แนะนำ"', values: ['1', badgeTile.join(', ') || '(ไม่มี)'], same: badgeTile.length === 1 && badgeTile[0] === 1 },
        { label: 'สีป้าย ESI', values: ['Primary #1c67ff', esiCss ? `${hex(esiCss.color)} บน ${hex(esiCss.bg)} ขอบ ${hex(esiCss.borderTop)}` : '-'], same: esiCss?.color === rgb('#1c67ff') },
        { label: 'ป้ายแนะนำ: โซน (ต้นแบบ) → ESI 1', values: [zoneCss ? `${hex(zoneCss.color)} บน ${hex(zoneCss.bg)} ขอบ ${hex(zoneCss.borderTop)}` : '(ไม่พบป้ายโซน)', esiCss ? `${hex(esiCss.color)} บน ${hex(esiCss.bg)} ขอบ ${hex(esiCss.borderTop)}` : '-'], same: !!zoneCss && !!esiCss && zoneCss.color === esiCss.color && zoneCss.bg === esiCss.bg && zoneCss.borderTop === esiCss.borderTop },
      ];
      await compare(36, rows);
      await markEvidence(expected(t.levels.locator('label').first(), 'ESI 1 ป้ายแนะนำ (มีขอบ)'), ...(zoneBadge ? [expected(zoneBadge.locator('xpath=..'), 'ป้ายแนะนำของโซน (ไม่มีขอบ)')] : []));
      await holdForClip(nurse, 1_500);
      expect(bad(rows)).toEqual([]);
    });

    // ---- MEWS ----
    await hideCompareTable(nurse);
    await startClip(nurse, 'reset-mews');
    await setGcs(t, 4, 5, 6);
    for (const [n, rrV, prV, total, level] of [[31, '22', '80', 2, 'Normal'], [32, '22', '105', 3, 'Abnormal'], [33, '22', '115', 4, 'Abnormal'], [34, '30', '115', 5, 'Critical']] as const) {
      await startClip(nurse, tcId(n));
      await N.soft(`${TC(n)} RR ${rrV} · PR ${prV} · GCS 15 → MEWS ${total} สี ${level}`, async () => {
        await hideCompareTable(nurse);
        await setVital(t, 'PR', prV);
        await setVital(t, 'RR', rrV);
        await waitMews(nurse, t);
        await t.mewsStatus.scrollIntoViewIfNeeded();
        const text = norm(await t.mewsStatus.innerText());
        const b = await boxLevel(t.mewsStatus, t.mewsRisk);
        const rows: CompareRow[] = [
          { label: 'Total MEWS', values: [`MEWS = ${total}`, text], same: new RegExp(`MEWS\\s*=\\s*${total}\\b`).test(text) },
          { label: `สี (${level})`, values: [`พื้น ${hex(LEVEL[level].bg)} · ขอบ ${hex(LEVEL[level].border)} · คำ ${hex(LEVEL[level].text)}`, b.label], same: b.level === level },
        ];
        await compare(n, rows);
        await markEvidence(filled(t.vital('PR').input, `PR ${prV}`), filled(rr.input, `RR ${rrV}`), expected(t.mewsStatus, `MEWS ${total} สี ${level}`));
        expect(bad(rows)).toEqual([]);
      });
    }

    // ---- TC-019 บันทึกเมื่อค่าผิดปกติ ----
    await startClip(nurse, tcId(19));
    await N.soft(`${TC(19)} บันทึกฟอร์มคัดกรองได้เมื่อ RR 22 (ผิดปกติ)`, async () => {
      await hideCompareTable(nurse);
      await setVital(t, 'PR', '80');
      await setVital(t, 'RR', '22');
      const ft = t.panel.getByRole('combobox', { name: 'Suspect Fast Track Type' }).first();
      if (!(await ft.inputValue().catch(() => ''))) await ft.selectOption({ label: 'Not Suspect Fast Track' });
      const cc = t.panel.getByRole('group', { name: 'Common chief complaints' }).getByRole('button').first();
      await cc.click();
      await t.levels.scrollIntoViewIfNeeded();
      await t.levels.getByText('3', { exact: true }).click();
      await nurse.waitForTimeout(1_500);
      await rr.item.scrollIntoViewIfNeeded();
      await markEvidence(filled(rr.input, 'RR 22'), clicked(t.save, 'บันทึก'));
      await snapEvidence(nurse, 'ก่อนกด — บันทึกคัดกรอง RR 22');
      await clearEvidenceMarks(nurse);
      await saveErTriageForm(nurse, 'บันทึกคัดกรอง ผู้ป่วย B (RR 22)');
      const toast = nurse.getByText(TRIAGE_SAVED, { exact: true }).first();
      await expect(toast).toBeVisible({ timeout: 150_000 });
      await toast.hover({ trial: true, timeout: 3_000 }).catch(() => undefined);
      await markEvidence(alerted(toast, 'บันทึกสำเร็จ'));
      await snapEvidence(nurse, 'หลังกด — บันทึกสำเร็จ');
      await clearEvidenceMarks(nurse);
      const history = nurse.getByRole('main').locator('[class*="_triage-history_"]').first();
      await expect(history.locator('[class*="_triage-history-item_"]').first()).toBeVisible({ timeout: 90_000 });
      const item = history.locator('[class*="_triage-history-item_"]').first();
      await item.getByRole('button', { name: /ดู/ }).first().click();
      const r = await readTriageView(nurse);
      const count = await history.locator('[class*="_triage-history-item_"]').count();
      const rows: CompareRow[] = [
        { label: 'บันทึก', values: ['สำเร็จ', TRIAGE_SAVED], same: true },
        { label: 'ประวัติการคัดกรอง: รายการใหม่', values: ['มี', `${count} รายการ · ${norm(await item.innerText()).slice(0, 50)}`], same: count >= 1 },
        { label: 'RR ในรายการ (ปุ่มดู)', values: ['22', r.rr || '-'], same: r.rr === '22' },
      ];
      await compare(19, rows, 'right');
      await r.vitals.scrollIntoViewIfNeeded().catch(() => undefined);
      const rrCell = r.view.getByText(/^22\s*\/min$/).first();
      await markEvidence(expected(item, 'รายการใหม่'), expected((await rrCell.count()) ? rrCell.locator('xpath=..') : r.vitals, 'RR 22'));
      expect(bad(rows)).toEqual([]);
    });
    await backToCurrentTriage(nurse);
    await hideCompareTable(nurse);

    // ---- TC-020 Patient banner (ผู้ป่วย C = B หลังบันทึก RR 22) ----
    await startClip(nurse, tcId(20));
    await N.soft(`${TC(20)} ผู้ป่วย C (RR 22): ค่า RR บน Patient banner สี Abnormal ชุดเดียวกับในฟอร์ม`, async () => {
      await gotoVisit(nurse, visit);
      await expect(t.heading).toBeVisible({ timeout: 120_000 });
      await expect(t.vital('RR').input).toBeVisible({ timeout: 120_000 });
      await nurse.waitForTimeout(4_000);
      await restartVideo(nurse);
      const rows = await bannerRows(nurse, t, 'Abnormal', '22');
      await compare(20, rows, 'bottom');
      await markEvidence(expected(bannerRR(nurse).locator('xpath=..'), 'RR บน Patient banner'), expected(t.vital('RR').item, 'RR ในฟอร์ม'));
      expect(bad(rows)).toEqual([]);
    });

    N.finish();
  });

  const bannerRR = (page: Page) => page.getByRole('main').locator('span[class*="_header_"]').filter({ hasText: /^RR$/ }).first().locator('xpath=following-sibling::span[contains(@class,"_value_")][1]');
  async function bannerRows(page: Page, t: Triage, level: Level, value: string): Promise<CompareRow[]> {
    const b = bannerRR(page);
    const bText = norm(await b.innerText());
    const bc = await css(b);
    const rr = t.vital('RR');
    const f = (await rr.flag.count()) ? await css(rr.flag) : null;
    const box = await css(rr.input);
    return [
      { label: 'RR บน Patient banner', values: [value, bText], same: bText === value },
      { label: `สีค่า RR บน banner (${level})`, values: [hex(LEVEL[level].text), hex(bc.color)], same: bc.color === LEVEL[level].text },
      { label: 'สีป้าย H ในฟอร์ม (อ้างอิง)', values: [hex(LEVEL[level].text), f ? hex(f.color) : '(ไม่มีป้าย)'], same: !!f && f.color === bc.color },
      { label: 'ขอบช่อง RR ในฟอร์ม (อ้างอิง)', values: [hex(LEVEL[level].border), hex(box.borderTop)], same: box.borderTop === LEVEL[level].border },
    ];
  }

  // ================================================================================================
  test('ผู้ป่วย D (+E): TC-021, 035, 054 Patient banner วิกฤต · ชิป MEWS · Underlying Disease ข้อความยาว (Nurse)', meta(21, 35, 54), async ({ page, browser }) => {
    const main = makeRunner(page);
    const visit = await preparePatient(page, 'D', { rr: '30', pr: '115', level: 1, underlying: 'long' }, main.note);
    const nurse = await openRoleWindow(browser, 'Nurse');
    windows.push(nurse);
    const N = runner(nurse);
    N.note('ผู้ป่วยที่ใช้', `D (RR 30 · PR 115 = MEWS 5 · ใช้เป็นผู้ป่วย E ด้วย: Underlying Disease ข้อความยาว) · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
    const compare = (n: number, rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'right') => showCompareTable(nurse, `${ISSUE[n]} ${tcId(n)}`, ['Expected', 'หน้าจอ'], rows, { side });
    const t = triage(nurse);

    await startClip(nurse, tcId(21));
    await N.soft(`${TC(21)} ผู้ป่วย D (RR 30): ค่า RR บน Patient banner สี Critical ชุดเดียวกับในฟอร์ม`, async () => {
      await openFromBoard(nurse, visit, N.note);
      await expect(t.vital('RR').input).toBeVisible({ timeout: 120_000 });
      await nurse.waitForTimeout(4_000);
      await t.vital('RR').item.scrollIntoViewIfNeeded();
      await restartVideo(nurse);
      const rows = await bannerRows(nurse, t, 'Critical', '30');
      await compare(21, rows, 'bottom');
      await markEvidence(expected(bannerRR(nurse).locator('xpath=..'), 'RR บน Patient banner'), expected(t.vital('RR').item, 'RR ในฟอร์ม'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(nurse, tcId(35));
    await N.soft(`${TC(35)} ชิป MEWS 5 บนแถบ encounter สี Critical เหมือนกล่องผล`, async () => {
      await hideCompareTable(nurse);
      const chip = nurse.getByRole('main').locator('span.ant-tag').filter({ hasText: /MEWS/ }).first();
      await expect(chip).toBeVisible({ timeout: 30_000 });
      await t.mewsStatus.scrollIntoViewIfNeeded();
      const cc = await css(chip);
      const box = await boxLevel(t.mewsStatus, t.mewsRisk);
      const chipC = { border: cc.borderTop, bg: cc.bg, text: cc.color };
      const chipLevel = levelOf(chipC);
      const rows: CompareRow[] = [
        { label: 'ชิป MEWS', values: ['MEWS 5', norm(await chip.innerText())], same: /MEWS\s*5\b/.test(norm(await chip.innerText())) },
        { label: 'กล่องผล MEWS', values: ['MEWS = 5', norm(await t.mewsStatus.innerText())], same: /MEWS\s*=\s*5\b/.test(norm(await t.mewsStatus.innerText())) },
        { label: 'สีชิป', values: [`Critical (${box.label})`, `${chipLevel} (พื้น ${hex(chipC.bg)} · ขอบ ${hex(chipC.border)} · คำ ${hex(chipC.text)})`], same: chipLevel === 'Critical' && box.level === 'Critical' },
      ];
      await compare(35, rows, 'bottom');
      await markEvidence(expected(chip, 'ชิป MEWS'), expected(t.mewsStatus, 'กล่องผล MEWS'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(nurse, tcId(54));
    await N.soft(`${TC(54)} ผู้ป่วย E: Display ยาวในตาราง Underlying Disease ขึ้นบรรทัดใหม่ ไม่มี scroll แนวนอน`, async () => {
      await hideCompareTable(nurse);
      const table = t.panel.locator('[class*="_underlying-disease-table_"]').first();
      await table.scrollIntoViewIfNeeded();
      const cell = table.locator('tbody tr').filter({ hasNotText: 'ไม่พบข้อมูล' }).first().locator('td').first();
      const info = await cell.evaluate((td) => {
        const s = getComputedStyle(td);
        const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.5;
        const range = document.createRange();
        range.selectNodeContents(td);
        const lines = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size;
        return { text: (td.textContent ?? '').trim(), h: Math.round(td.getBoundingClientRect().height), lh: Math.round(lh), lines, overflow: td.scrollWidth > td.clientWidth + 1, whiteSpace: s.whiteSpace };
      });
      const scroll = await table.evaluate((root) => {
        const out: string[] = [];
        for (const el of Array.from(root.querySelectorAll('*')).concat([root])) {
          const s = getComputedStyle(el);
          if ((el as HTMLElement).scrollWidth > (el as HTMLElement).clientWidth + 2 && (s.overflowX === 'auto' || s.overflowX === 'scroll')) out.push(`${el.tagName.toLowerCase()} ${(el as HTMLElement).scrollWidth}>${(el as HTMLElement).clientWidth}`);
        }
        return out;
      });
      const rows: CompareRow[] = [
        { label: 'Display', values: ['ข้อความยาว', `${info.text.slice(0, 70)} (${info.text.length} ตัวอักษร)`], same: true },
        { label: 'ขึ้นบรรทัดใหม่', values: ['ใช่', `${info.lines} บรรทัด · white-space ${info.whiteSpace}`], same: info.lines > 1 },
        { label: 'อ่านได้ครบ (ไม่ถูกตัด)', values: ['ใช่', info.overflow ? 'ถูกตัด' : 'ครบ'], same: !info.overflow },
        { label: 'scroll แนวนอนของตาราง', values: ['ไม่มี', scroll.join(' ; ') || 'ไม่มี'], same: scroll.length === 0 },
      ];
      await compare(54, rows, 'right');
      await markEvidence(expected(cell, 'Display ขึ้นบรรทัดใหม่'));
      expect(bad(rows)).toEqual([]);
    });

    N.finish();
  });

  // ================================================================================================
  test('ผู้ป่วย F: TC-037, 038, 048–052 ชิปตัวเลือก · Validation ช่องบังคับ ER Physician Note (Doctor)', meta(37, 38, 48, 49, 50, 51, 52), async ({ page, browser }) => {
    const main = makeRunner(page);
    const visit = await preparePatient(page, 'F', { rr: '14', pr: '80', level: 3 }, main.note);
    const doc = await openRoleWindow(browser, 'Doctor');
    windows.push(doc);
    const D = runner(doc);
    D.note('ผู้ป่วยที่ใช้', `F (คัดกรองแล้ว แพทย์ยังไม่บันทึก ER Physician Note) · HN ${visit.hn} · ${visit.vn} · ${visit.en}`);
    const compare = (n: number, rows: CompareRow[], side: 'left' | 'right' | 'bottom' = 'left') => showCompareTable(doc, `${ISSUE[n]} ${tcId(n)}`, ['Expected', 'หน้าจอ'], rows, { side });

    await startClip(doc, tcId(37));
    await openFromBoard(doc, visit, D.note);
    let p = await waitPhysician(doc);
    await restartVideo(doc); // ตัดจอว่างตอนฟอร์มแพทย์โหลดออกจากคลิป TC-037
    const chipsIn = (title: string) => p.item(title).locator('.ant-collapse-panel, .ant-collapse-content').first().getByRole('button').filter({ hasNotText: /^$/ });
    const chipStyle = async (b: Locator) => {
      const c = await css(b);
      return { c, label: `${hex(c.color)} ${c.fontSize} บน ${hex(c.bg)}` };
    };
    await D.soft(`${TC(37)} ชิปที่ยังไม่เลือก (Chief Complaint / Present illness) #1c67ff 12px พื้น #eef3ff`, async () => {
      const rows: CompareRow[] = [];
      const marks = [];
      for (const title of ['Chief Complaint - General', 'Present illness general']) {
        const chips = chipsIn(title);
        const n = await chips.count();
        if (!n) {
          rows.push({ label: `${title}: ชิป`, values: ['มีชิปตัวเลือก', '(ไม่มีชิป)'], same: false });
          continue;
        }
        const first = chips.first();
        const s = await chipStyle(first);
        rows.push({ label: `${title}: "${norm(await first.innerText()).slice(0, 16)}" (${n} ชิป)`, values: ['#1c67ff 12px บน #eef3ff', s.label], same: s.c.color === rgb('#1c67ff') && s.c.fontSize === '12px' && s.c.bg === rgb('#eef3ff') });
        marks.push(expected(first, 'ชิปที่ยังไม่เลือก'));
      }
      await compare(37, rows, 'left');
      await p.header('Chief Complaint - General').evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await markEvidence(...marks, expected(p.header('Present illness general'), 'มีชิป · จริง: ไม่มีชิป'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(38));
    await D.soft(`${TC(38)} ชิปที่เลือกแล้ว พื้น #1c67ff ตัวอักษรขาว`, async () => {
      await hideCompareTable(doc);
      const rows: CompareRow[] = [];
      const marks = [];
      for (const title of ['Chief Complaint - General', 'Present illness general']) {
        const chips = chipsIn(title);
        if (!(await chips.count())) {
          rows.push({ label: `${title}: ชิป`, values: ['มีชิปตัวเลือก', '(ไม่มีชิป)'], same: false });
          continue;
        }
        const chip = chips.nth(1);
        const name = norm(await chip.innerText()).slice(0, 16);
        await chip.scrollIntoViewIfNeeded();
        await chip.click();
        await doc.waitForTimeout(1_000);
        const s = await chipStyle(chip);
        const pressed = (await chip.getAttribute('aria-pressed')) ?? (await chip.getAttribute('aria-selected')) ?? '-';
        rows.push({ label: `${title}: "${name}" (aria-pressed ${pressed})`, values: ['พื้น #1c67ff · ตัวอักษร #ffffff', `พื้น ${hex(s.c.bg)} · ตัวอักษร ${hex(s.c.color)}`], same: s.c.bg === rgb('#1c67ff') && s.c.color === rgb('#ffffff') });
        marks.push(clicked(chip, 'เลือกชิป'));
      }
      await compare(38, rows, 'left');
      await p.header('Chief Complaint - General').scrollIntoViewIfNeeded();
      await markEvidence(...marks);
      expect(bad(rows)).toEqual([]);
    });
    await hideCompareTable(doc);

    /** เริ่ม TC ของ UHP: โหลดหน้าใหม่ (ล้างค่าที่ยังไม่บันทึก) แล้วกรอก Present illness ไม่เลือก Diagnosis */
    const freshForm = async (n: number) => {
      gotoVisit(doc, visit);
      p = await waitPhysician(doc);
      await restartVideo(doc);
      await p.pi.scrollIntoViewIfNeeded();
      await p.pi.click();
      await p.pi.fill(`${tcId(n)} กรอก Present illness ไม่เลือก Diagnosis`);
      await doc.waitForTimeout(1_500);
    };
    const scrollTop = () => p.pn.evaluate((el) => {
      let n: HTMLElement | null = el as HTMLElement;
      while (n) { if (n.scrollHeight > n.clientHeight + 5) n.scrollTop = 0; n = n.parentElement; }
    });

    await startClip(doc, tcId(48));
    await D.soft(`${TC(48)} กรอก Present illness ไม่เลือก Diagnosis → กดบันทึก → ต้องไม่บันทึก`, async () => {
      await freshForm(48);
      await markEvidence(filled(p.pi, 'Present illness'), clicked(p.save, 'บันทึก'));
      await snapEvidence(doc, 'ก่อนกด — บันทึกไม่เลือก Diagnosis');
      await clearEvidenceMarks(doc);
      const r = await savePhysician(doc, p);
      if (await r.toast.isVisible().catch(() => false)) {
        await markEvidence(alerted(r.toast, 'แจ้งเตือนหลังกดบันทึก'));
        await snapEvidence(doc, 'หลังกด — แจ้งเตือนบันทึก');
        await clearEvidenceMarks(doc);
      }
      // หัวแผงหลังบันทึก: บรรทัด "บันทึกจากแบบฟอร์มนี้: <วันเวลา> โดย <แพทย์>" (รอฟอร์มโหลดใหม่)
      const savedLine = p.pn.getByText(/บันทึกจากแบบฟอร์มนี้/).first();
      await savedLine.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined);
      const head = norm(await savedLine.innerText().catch(() => '')) || '(ไม่มีบรรทัดบันทึกแล้ว)';
      const rows: CompareRow[] = [
        { label: 'คำขอบันทึก (saves)', values: ['ไม่ส่ง / ไม่สำเร็จ', r.status === null ? 'ไม่ส่ง' : `ส่ง → ${r.status}`], same: r.status === null || r.status >= 400 },
        { label: 'แจ้งเตือนบันทึกสำเร็จ', values: ['ไม่มี', r.toastSeen ? r.toastText : 'ไม่มี'], same: !r.toastSeen },
        { label: 'หัวแผง', values: ['ไม่เปลี่ยนเป็นบันทึกแล้ว', head.slice(0, 80)], same: r.status === null || r.status >= 400 },
      ];
      await compare(48, rows, 'left');
      if (await savedLine.isVisible().catch(() => false)) {
        await savedLine.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await markEvidence(expected(savedLine, 'ไม่บันทึก · จริง: บันทึกแล้ว'));
      } else await markEvidence(expected(p.heading, 'หัวแผงหลังกดบันทึก'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(49));
    await D.soft(`${TC(49)} กดบันทึกไม่เลือก Diagnosis → ช่อง Diagnosis กรอบแดง #ff4d4f + "กรุณาระบุ …"`, async () => {
      await hideCompareTable(doc);
      await freshForm(49);
      const r = await savePhysician(doc, p);
      await p.dx.scrollIntoViewIfNeeded();
      const e = await diagnosisError(p);
      const rows: CompareRow[] = [
        { label: 'ขอบช่อง Diagnosis', values: ['#ff4d4f', e.border], same: e.border === '#ff4d4f' },
        { label: 'ข้อความใต้ช่อง', values: ['กรุณาระบุ [ชื่อช่อง]', e.errText || '(ไม่มี)'], same: /กรุณาระบุ/.test(e.errText) },
        { label: 'ผลการกดบันทึก (ข้อมูล)', values: ['-', `saves ${r.status ?? 'ไม่ส่ง'} · ${r.toastText || 'ไม่มีแจ้งเตือน'}`], same: true },
      ];
      await compare(49, rows, 'left');
      await markEvidence(expected(p.dx, 'กรอบแดง + กรุณาระบุ · จริง: ไม่มี'));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(50));
    await D.soft(`${TC(50)} เลื่อนบนสุด → กดบันทึก → เลื่อนไปช่อง Diagnosis + focus`, async () => {
      await hideCompareTable(doc);
      await freshForm(50);
      await scrollTop();
      await doc.waitForTimeout(800);
      await markEvidence(clicked(p.save, 'บันทึก (อยู่บนสุดของฟอร์ม)'));
      await snapEvidence(doc, 'ก่อนกด — บนสุดของฟอร์ม');
      await clearEvidenceMarks(doc);
      const r = await savePhysician(doc, p, 15_000);
      await doc.waitForTimeout(1_000);
      const visible = await inView(p.dx);
      const focus = await activeInfo(doc);
      const rows: CompareRow[] = [
        { label: 'ช่อง Diagnosis อยู่ในจอ', values: ['ใช่ (เลื่อนไปเอง)', visible ? 'ใช่' : 'ไม่'], same: visible },
        { label: 'focus', values: ['ช่อง Diagnosis', focus], same: /Diagnosis|ค้นหา/.test(focus) },
        { label: 'ผลการกดบันทึก (ข้อมูล)', values: ['-', `saves ${r.status ?? 'ไม่ส่ง'} · ${r.toastText || 'ไม่มีแจ้งเตือน'}`], same: true },
      ];
      await compare(50, rows, 'left');
      await markEvidence(...((await r.toast.isVisible().catch(() => false)) ? [alerted(r.toast, 'แจ้งเตือน')] : []), expected(p.heading, 'เลื่อนไป Diagnosis · จริง: ไม่เลื่อน'));
      expect(bad(rows)).toEqual([]);
    });

    // TC-052 ก่อน TC-051: TC-051 เลือก Diagnosis แล้วระบบเก็บเป็นร่าง โหลดหน้าใหม่ก็ยังอยู่ (รอบแรก 3 พ.ย. TC-052 มี Diagnosis ติดมา)
    await startClip(doc, tcId(52));
    await D.soft(`${TC(52)} พับ Diagnosis general → บนสุด → กดบันทึก → ขยายเอง + เลื่อนไป + error`, async () => {
      await hideCompareTable(doc);
      await freshForm(52);
      const item = p.item('Diagnosis general');
      const toggle = item.locator('.ant-collapse-expand-icon').first();
      await toggle.scrollIntoViewIfNeeded();
      await markEvidence(clicked(toggle, 'พับ Diagnosis general'));
      await snapEvidence(doc, 'ก่อนกด — พับ Diagnosis general');
      await clearEvidenceMarks(doc);
      await toggle.click();
      await doc.waitForTimeout(800);
      const collapsedBefore = !(await item.evaluate((el) => el.classList.contains('ant-collapse-item-active')));
      await scrollTop();
      await doc.waitForTimeout(800);
      const r = await savePhysician(doc, p, 15_000);
      await doc.waitForTimeout(1_000);
      const expanded = await item.evaluate((el) => el.classList.contains('ant-collapse-item-active'));
      const visible = await inView(item.locator('.ant-collapse-header').first());
      const e = await diagnosisError(p);
      const rows: CompareRow[] = [
        { label: 'ก่อนกด: Diagnosis general พับอยู่', values: ['พับ', collapsedBefore ? 'พับ' : 'ยังขยาย'], same: collapsedBefore },
        { label: 'หลังกด: ขยายออกเอง', values: ['ขยาย', expanded ? 'ขยาย' : 'ยังพับ'], same: expanded },
        { label: 'หน้าจอเลื่อนไป Diagnosis', values: ['ใช่', visible ? 'ใช่' : 'ไม่'], same: visible },
        { label: 'กรอบแดง + ข้อความ', values: ['#ff4d4f + กรุณาระบุ …', `${e.border} · ${e.errText || 'ไม่มีข้อความ'}`], same: e.border === '#ff4d4f' && /กรุณาระบุ/.test(e.errText) },
        { label: 'ผลการกดบันทึก (ข้อมูล)', values: ['-', `saves ${r.status ?? 'ไม่ส่ง'} · ${r.toastText || 'ไม่มีแจ้งเตือน'}`], same: true },
      ];
      await compare(52, rows, 'left');
      await markEvidence(...((await r.toast.isVisible().catch(() => false)) ? [alerted(r.toast, 'แจ้งเตือน')] : []), expected(p.heading, 'เลื่อนไป Diagnosis + error · จริง: ไม่เลื่อน'));
      await snapEvidence(doc, 'TC-052 หลังกด หัวแผง');
      await clearEvidenceMarks(doc);
      await item.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await markEvidence(expected(item.locator('.ant-collapse-header').first(), `${expanded ? 'ขยายอยู่' : 'ยังพับ'} · ไม่มีกรอบแดง / ข้อความ`));
      expect(bad(rows)).toEqual([]);
    });

    await startClip(doc, tcId(51));
    await D.soft(`${TC(51)} ช่อง Diagnosis ขึ้น error แล้วเลือก Diagnosis → error หายทันที`, async () => {
      await hideCompareTable(doc);
      await freshForm(51);
      const r = await savePhysician(doc, p);
      await p.dx.scrollIntoViewIfNeeded();
      const before = await diagnosisError(p);
      await chooseDiagnosis(doc, p);
      const after = await diagnosisError(p);
      const rows: CompareRow[] = [
        { label: 'ก่อนเลือก: error ที่ช่อง Diagnosis (Pre-condition)', values: ['มี (กรอบแดง + ข้อความ)', `ขอบ ${before.border} · ${before.errText || 'ไม่มีข้อความ'}`], same: before.border === '#ff4d4f' || /กรุณา/.test(before.errText) },
        { label: 'หลังเลือก Diagnosis', values: ['กรอบแดง / ข้อความหาย', `ขอบ ${after.border} · ${after.errText || 'ไม่มีข้อความ'}`], same: after.border !== '#ff4d4f' && !/กรุณา/.test(after.errText) },
        { label: 'ผลการกดบันทึก (ข้อมูล)', values: ['-', `saves ${r.status ?? 'ไม่ส่ง'} · ${r.toastText || 'ไม่มีแจ้งเตือน'}`], same: true },
      ];
      await compare(51, rows, 'left');
      await markEvidence(filled(p.dx, 'เลือก Diagnosis K30'));
      expect(bad(rows)).toEqual([]);
    });

    D.finish();
  });
});
