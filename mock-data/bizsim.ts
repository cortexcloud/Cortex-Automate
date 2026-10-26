import { test, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { checkStep, clearEvidenceMarks, expected, markEvidence, snapEvidence } from '../helpers/functions/evidence';
import { finishVideo, startClip } from '../helpers/functions/fixtures';
import { SYSTEM } from './uat-er';

// ตัวเล่น Scenario ของชีต "Scenario-OPD BizSim" (ไฟล์ E2E/New file Test case OPD #2.xlsx) แบบ soft step
// - แต่ละขั้น = แถวในชีต (จับคู่ด้วย Case_id + ข้อความคอลัมน์ "Use case Scenario") → ผล Pass / Fail / Block / N/A
// - ขั้นที่พังไม่หยุดเทส: ขั้นถัดไปที่ต้องใช้ผลของขั้นนั้น (needs) เป็น Block อัตโนมัติ
// - บั๊ก: บั๊กเดิมในชีต "Bug list (OPDBIzSim)" อ้างด้วยเลข No. (`known`) · บั๊กใหม่ใช้ชื่อคงที่ (กันแถวซ้ำเมื่อรันหลายรอบ)
// - คลิป: 1 คลิปต่อขั้น + คลิปย่อยต่อ "จุดตรวจ" (s.point) · จุดที่ Fail ได้คู่ ภาพตอน Fail + คลิปของจุดนั้น ในโฟลเดอร์ Fail/ (ผู้ใช้ขอ 22 ต.ค. 2026)
// - ผลรันเก็บที่ clips/BizSim <ระบบ> <วันที่>/<Case_id>.json (+ ภาพ / คลิป) → ลง Excel ด้วย `node mock-data/bizsim-log.mjs`

export type StepStatus = 'Pass' | 'Fail' | 'Block' | 'N/A';

export interface BugDef {
  /** เลข No. ของบั๊กเดิมในชีต Bug list — ไม่ใส่ = บั๊กใหม่ */
  known?: number;
  title: string;
  module: string;
  type: 'Bug' | 'Config' | 'Improvement' | 'Data Config';
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
}

export interface BugFinding extends BugDef {
  /** found = ยังพบ / บั๊กใหม่ · fixed = บั๊กเดิมที่รอบนี้ไม่พบแล้ว · unverifiable = ตรวจไม่ได้ (ขั้นก่อนหน้าพัง) */
  result: 'found' | 'fixed' | 'unverifiable';
  actual: string;
  step: string;
  evidence: string[];
}

/** จุดที่ Fail: ภาพตอน Fail + คลิปของจุดนั้น */
export interface FailPoint {
  step: string;
  point: string;
  reason: string;
  bug?: string;
  image?: string;
  clip?: string;
}

export interface StepResult {
  title: string;
  /** ขั้นเตรียมข้อมูลที่ไม่มีแถวในชีต (เช่น ลงทะเบียน / สร้างนัด) — ไม่ลงคอลัมน์ Pass/Fail */
  pre?: boolean;
  status: StepStatus;
  notes: string[];
  startedAt: string;
  seconds: number;
}

export interface RunResult {
  caseId: string;
  scenario: string;
  system: string;
  startedAt: string;
  finishedAt: string;
  facts: Record<string, string>;
  steps: StepResult[];
  bugs: BugFinding[];
  fails: FailPoint[];
  evidenceDir: string;
}

class NotApplicable extends Error {}
class Blocked extends Error {}

/** ตัวช่วยภายในขั้น */
export interface StepCtx {
  /** ข้อความลงคอลัมน์ NOTE */
  note(text: string): void;
  /** เริ่ม "จุดตรวจ" ใหม่ในขั้น (ตัดคลิปใหม่) — จุดที่พบบั๊กได้คลิปเฉพาะช่วงนั้น */
  point(name: string): Promise<void>;
  /** พบบั๊ก — ถ่ายภาพทันที (กรอบแดงที่ `target` ถ้ามี) · ขั้นนี้เป็น Fail แต่ทำต่อจนจบขั้น (ไม่โยน error) */
  bug(def: BugDef, actual: string, opts?: { target?: Locator }): Promise<void>;
  /** บั๊กเดิมที่รอบนี้ไม่พบแล้ว (ลงหมายเหตุของบั๊กนั้นว่า Retest ไม่พบ) */
  fixed(def: BugDef, actual: string): void;
  /** บั๊กเดิมที่ตรวจไม่ได้ในรอบนี้ */
  unverifiable(def: BugDef, reason: string): void;
  /** ขั้นนี้ใช้ไม่ได้กับระบบ / ข้อมูลตอนนี้ → N/A แล้วหยุดขั้น */
  na(reason: string): never;
  /** ทำต่อไม่ได้เพราะเงื่อนไขภายนอก → Block แล้วหยุดขั้น */
  block(reason: string): never;
  /** ผลที่ขั้นอื่นใช้ต่อ (เช่น 'visit', 'rx') */
  provide(flag: string): void;
  /** ภาพ / คลิปของขั้นนี้ใช้หน้านี้แทน (เช่น หน้าต่างของพยาบาลที่เปิดกลางขั้น) */
  shotsOn(page: Page): void;
}

/** ชื่อไฟล์สั้น ไม่มีอักขระต้องห้าม (path ภาษาไทยยาวเกิน ~95 ตัวแล้วไฟล์เสีย) */
const short = (text: string, max = 40) => text.replace(/[\\/:*?"<>|()]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

export class BizSim {
  readonly steps: StepResult[] = [];
  readonly bugs: BugFinding[] = [];
  readonly fails: FailPoint[] = [];
  readonly facts: Record<string, string> = {};
  private readonly flags = new Set<string>();
  private readonly startedAt = new Date();
  /** ภาพหลักฐานในโฟลเดอร์ผลของเทส (ไว้นับว่าภาพไหนเป็นของขั้นไหน) */
  private readonly evidenceDir = test.info().outputPath('evidence');

  constructor(
    readonly caseId: string,
    readonly scenario: string,
    readonly page: Page,
  ) {}

  has(flag: string) {
    return this.flags.has(flag);
  }

  /**
   * เล่น 1 ขั้น (soft) — body พัง = Fail (ข้อความ error ลง NOTE + ภาพ Error + คลิปของจุดที่พัง) · ขาดผลที่ `needs` = Block โดยไม่รัน body
   * `page` = หน้าที่ใช้ถ่ายภาพ / อัดคลิป (ตั้งต้นหน้าหลัก)
   */
  async step(title: string, body: (s: StepCtx) => Promise<void>, opts: { needs?: string[]; pre?: boolean; page?: Page } = {}): Promise<StepStatus> {
    const started = Date.now();
    const result: StepResult = { title, pre: opts.pre, status: 'Pass', notes: [], startedAt: new Date().toISOString(), seconds: 0 };
    this.steps.push(result);
    const missing = (opts.needs ?? []).filter((flag) => !this.flags.has(flag));
    const shotsBefore = this.listEvidence();
    if (missing.length) {
      result.status = 'Block';
      result.notes.push(`ทำต่อไม่ได้ — ต่อเนื่องจากขั้นก่อนหน้าไม่สำเร็จ (${missing.join(', ')})`);
      console.log(`  ■ [Block] ${title} · ${result.notes.at(-1)}`);
      return result.status;
    }
    const order = String(this.steps.length).padStart(2, '0');
    // หน้าที่ถ่ายภาพ / อัดคลิปเปลี่ยนกลางขั้นได้ (s.shotsOn) — checkStep รับ Page ตัวเดียวตอนเริ่ม จึงส่งตัวแทนที่ชี้ไปหน้าปัจจุบัน
    let shotPage = opts.page ?? this.page;
    const pageProxy = new Proxy({} as Page, {
      get: (_t, key) => {
        const value = (shotPage as unknown as Record<string | symbol, unknown>)[key];
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(shotPage) : value;
      },
    });
    // คลิปของขั้น (1 คลิปต่อ 1 แถวในชีต) — ขั้น Block ไม่มีคลิป (ไม่ได้ทำอะไร)
    let point = title;
    let pointNo = 0;
    let clip = `clip-${order} ${short(title, 60)}.webm`;
    await startClip(shotPage, `${order} ${short(title, 60)}`).catch(() => undefined);
    let bugCount = 0;
    const ctx: StepCtx = {
      note: (text) => result.notes.push(text),
      point: async (name) => {
        point = name;
        pointNo++;
        const clipName = `${order}.${pointNo} ${short(name)}`;
        clip = `clip-${clipName}.webm`;
        await startClip(shotPage, clipName).catch(() => undefined);
      },
      bug: async (def, actual, o = {}) => {
        bugCount++;
        this.addBug(def, 'found', actual, title);
        result.notes.push(`${def.known ? `[บั๊กเดิม No.${def.known}] ` : '[บั๊กใหม่] '}${actual}`);
        const image = await this.failShot(shotPage, `Fail — ${short(point, 30)}`, o.target);
        this.fails.push({ step: title, point, reason: actual, bug: def.title, image, clip });
      },
      fixed: (def, actual) => {
        this.addBug(def, 'fixed', actual, title);
        result.notes.push(`[Retest No.${def.known}] ไม่พบแล้ว — ${actual}`);
      },
      unverifiable: (def, reason) => this.addBug(def, 'unverifiable', reason, title),
      na: (reason) => {
        throw new NotApplicable(reason);
      },
      block: (reason) => {
        throw new Blocked(reason);
      },
      provide: (flag) => this.flags.add(flag),
      shotsOn: (page) => {
        shotPage = page;
      },
    };
    try {
      await checkStep(pageProxy, `${this.caseId} · ${title}`, () => body(ctx));
      if (bugCount) result.status = 'Fail';
    } catch (error) {
      if (error instanceof NotApplicable) {
        result.status = 'N/A';
        result.notes.push(error.message);
      } else if (error instanceof Blocked) {
        result.status = 'Block';
        result.notes.push(error.message);
      } else {
        result.status = 'Fail';
        const reason = `สคริปต์ / ระบบพัง: ${firstLine(error)}`;
        result.notes.push(reason);
        // ภาพ "Error — …" ที่ checkStep ถ่ายตอนพัง = ภาพตอน Fail
        const image = this.listEvidence().filter((f) => !shotsBefore.includes(f) && f.includes('Error — ')).at(-1);
        this.fails.push({ step: title, point, reason, image, clip });
      }
    }
    // checkStep ได้ Page แบบ Proxy จึงล้างกรอบของหน้าจริงไม่ได้ (กรอบค้างไปขั้นถัดไป — APM-OPD-006 22 ต.ค. 2026) → ล้างเองหลังถ่ายภาพจบขั้น
    for (const p of new Set([this.page, shotPage])) if (!p.isClosed()) await clearEvidenceMarks(p).catch(() => undefined);
    result.seconds = Math.round((Date.now() - started) / 1000);
    // ภาพที่ถ่ายระหว่างขั้นนี้ → แนบกับบั๊กที่พบในขั้นนี้ (ถ้าไม่มีภาพ Fail ของตัวเอง)
    const shots = this.listEvidence().filter((file) => !shotsBefore.includes(file));
    for (const bug of this.bugs.filter((b) => b.step === title && !b.evidence.length)) bug.evidence = shots;
    const mark = { Pass: '✓', Fail: '✗', Block: '■', 'N/A': '–' }[result.status];
    console.log(`  ${mark} [${result.status}] ${title}${result.notes.length ? ` · ${result.notes.join(' · ')}` : ''}`);
    return result.status;
  }

  /** ภาพตอน Fail: กรอบแดงที่ target (รอให้ขึ้นสูงสุด 5 วินาที — แจ้งเตือนหายเองใน ~4.5 วินาที จึงเรียกทันทีหลังเห็นผล) → ชื่อไฟล์ภาพ */
  private async failShot(page: Page, name: string, target?: Locator): Promise<string | undefined> {
    const before = this.listEvidence();
    if (target) {
      const first = target.first();
      if (await first.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) {
        await first.hover({ trial: true, timeout: 3_000 }).catch(() => undefined); // รอให้เลื่อนเข้าที่ (actionability "stable")
        await markEvidence(expected(first)).catch(() => undefined);
      }
    }
    await snapEvidence(page, name).catch(() => undefined);
    return this.listEvidence().find((f) => !before.includes(f));
  }

  /**
   * เขียนผลรัน + คัดลอกหลักฐานไปโฟลเดอร์ถาวร (โฟลเดอร์ผลของ Playwright ถูกล้างทุกรอบ)
   * - ภาพทั้งหมด + คลิปทั้งหมด (ปิดไฟล์คลิปของหน้าหลักก่อน — fixture ปิดให้หลังเทสจบ ช้าเกินกว่าจะคัดลอกได้)
   * - Fail/: คู่ภาพ + คลิปของแต่ละจุดที่ Fail ชื่อ "NN <ขั้น> — <จุด>"
   */
  async save(): Promise<string> {
    await finishVideo(this.page).catch(() => undefined);
    const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
    const dir = path.join(__dirname, '..', 'clips', `BizSim ${SYSTEM} ${day}`);
    const evidence = path.join(dir, this.caseId);
    // รันซ้ำในวันเดียวกัน → ล้างหลักฐานรอบก่อน (ชื่อไฟล์เรียงเลขซ้ำกัน ปนแล้วอ่านไม่ออก)
    fs.rmSync(evidence, { recursive: true, force: true });
    fs.mkdirSync(evidence, { recursive: true });
    for (const file of this.listEvidence()) fs.copyFileSync(path.join(this.evidenceDir, file), path.join(evidence, file));
    const out = test.info().outputDir;
    const videos = fs.existsSync(out) ? fs.readdirSync(out).filter((f) => f.endsWith('.webm')) : [];
    for (const file of videos) fs.copyFileSync(path.join(out, file), path.join(evidence, file));

    const failDir = path.join(evidence, 'Fail');
    const fails = this.fails.map((f, i) => {
      const base = `${String(i + 1).padStart(2, '0')} ${short(f.step, 35)} — ${short(f.point, 30)}`;
      const copy = (from: string | undefined, src: string, ext: string) => {
        if (!from || !fs.existsSync(path.join(src, from))) return undefined;
        fs.mkdirSync(failDir, { recursive: true });
        const to = path.join(failDir, `${base}${ext}`);
        fs.copyFileSync(path.join(src, from), to);
        return to;
      };
      return { ...f, image: copy(f.image, this.evidenceDir, '.png'), clip: copy(f.clip, out, '.webm') };
    });
    console.log(`  หลักฐาน: ภาพ ${this.listEvidence().length} · คลิป ${videos.length} · จุด Fail ${fails.length} (ภาพ ${fails.filter((f) => f.image).length} · คลิป ${fails.filter((f) => f.clip).length}) → ${evidence}`);

    const result: RunResult = {
      caseId: this.caseId,
      scenario: this.scenario,
      system: SYSTEM,
      startedAt: this.startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      facts: this.facts,
      steps: this.steps,
      // หลักฐานของบั๊ก = คู่ภาพ + คลิปของจุด Fail (ถ้ามี) ไม่งั้นภาพของขั้น
      bugs: this.bugs.map((bug) => {
        const own = fails.filter((f) => f.bug === bug.title).flatMap((f) => [f.image, f.clip]).filter((x): x is string => Boolean(x));
        return { ...bug, evidence: own.length ? own : bug.evidence.map((file) => path.join(evidence, file)) };
      }),
      fails,
      evidenceDir: evidence,
    };
    const file = path.join(dir, `${this.caseId}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2));
    return file;
  }

  private addBug(def: BugDef, result: BugFinding['result'], actual: string, step: string) {
    const same = this.bugs.find((b) => b.title === def.title && b.result === result);
    if (same) {
      if (!same.actual.includes(actual)) same.actual += ` · ${actual}`;
      return;
    }
    this.bugs.push({ ...def, result, actual, step, evidence: [] });
  }

  private listEvidence(): string[] {
    return fs.existsSync(this.evidenceDir) ? fs.readdirSync(this.evidenceDir).sort() : [];
  }
}

export function firstLine(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  // ตัดรหัสสีของ Playwright + บรรทัด Call log
  return text
    .replace(/\u001b\[\d+m/g, '')
    .split('\n')
    .filter((line) => line.trim() && !/^\s*(Call log|- |at )/.test(line))
    .slice(0, 2)
    .join(' ')
    .slice(0, 300);
}
