import type { Page } from '@playwright/test';
import {
  dismissToast,
  expectTriageFormOpen,
  expectVisitHeader,
  gotoErDashboard,
  openErMenu,
  openTriagePage,
  openVisitDialog,
  registerNewPatient,
} from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { triageForm } from '../helpers/functions/er-triage';
import { checkStep, expected, markEvidence } from '../helpers/functions/evidence';
import type { ErVisit } from '../helpers/functions/er';
import type { NewPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import {
  SETTINGS,
  SYSTEM,
  checkInOpdVisit,
  dxForSet,
  fetchNurseTasks,
  gotoPatient,
  nextUatPatient,
  nextUatSetNumber,
  openErVisitForHn,
  openOpdVisit,
  recordDrugAllergy,
  recordMockPatient,
  registerAndOpenErVisit,
  registerMockPatient,
  savePhysicianNote,
  scheduleWalkInRequest,
  submitOrders,
  type NurseTask,
} from './uat-er';
import { VITALS_NORMAL, fillTriage, gotoVisit, mockPatient, saveTriageForm } from './uat-play';

// เตรียม Mock Data UAT ER ตาม "Mock Data.xlsx" (สถานะตั้งต้นของผู้ป่วย 5 ราย · R31)
// "นับในข้อ" = เลข UAT-ER ในชีต Scenario- ER ของ "New file Test case OPD #2.xlsx"
// SBH Prod: npm run mock:uat-er · dev-x (ลองก่อน): npm run mock:uat-er:dev · เฉพาะราย: เติม -- --grep "ราย B"
// รันซ้ำได้ — ทุกรอบสร้างผู้ป่วยใหม่ เลขท้ายนามสกุลเพิ่มขึ้น (UAT ER05-01, ER05-02, …) · ผู้ป่วยที่สร้างจดไว้ที่ mock-data/created-patients.md
// ทั้งชุดใช้เลขท้ายเดียวกัน (ผู้ใช้ขอ 5 ต.ค. 2026): ดูเลขที่ว่างด้วย --grep "เลขชุด" แล้วตั้ง env UAT_SEQ=<เลข> ตอนรันแต่ละราย → UAT ER04-10 / ER05-10 / ER10-10 / ER13-10
// ราย A / B / D ต้องรันในวันเล่น (บอร์ด ER แสดงเฉพาะ Visit ของวันนั้น และระบบปิด Encounter เองตอน 22:00)

/**
 * MOCK_RESUME=1 — ทำขั้นที่ค้างต่อกับผู้ป่วยรายล่าสุดใน created-patients.md (ไม่สร้างผู้ป่วยใหม่ เลขชุดคงเดิม) ใช้เมื่อสะดุดกลางทาง
 * ราย A: หลังเปิด Visit ER แล้ว (คัดกรอง → Note → Order) · ราย C: หลังบันทึกแพ้ยาแล้ว (เปิด Visit ER) · ราย D: หลังเปิด Visit OPD แล้ว (ลงตารางแพทย์ → เช็คอิน)
 */
const RESUME = process.env.MOCK_RESUME === '1';
/** ราย A ตอนทำต่อ: เริ่มจากขั้นไหน — `triage` (ตั้งต้น) · `note` (คัดกรองแล้ว) · `order` (คัดกรอง + Physician Note แล้ว เหลือส่ง Order) */
const RESUME_FROM = RESUME ? (process.env.MOCK_RESUME_FROM ?? 'triage') : 'triage';
/** ยาที่บันทึกแพ้ไว้แล้วของราย C ตอนทำต่อ (ไว้จดสถานะ — รอบที่ทำต่อไม่ได้บันทึกเอง) */
const RESUME_ALLERGY = process.env.MOCK_RESUME_ALLERGY ?? 'paracetamol (VTM)';
/** ชื่อคลินิกของ Visit OPD ราย D ตอนทำต่อ (ไว้จดสถานะ — รอบที่ทำต่อไม่ได้เปิด Visit เอง) */
const RESUME_CLINIC = process.env.MOCK_RESUME_CLINIC ?? 'แผนกอายุรกรรม';

/** บอกความคืบหน้าทีละขั้นใน terminal ระหว่างรัน (reporter list แสดงผลแค่ตอนจบเทส) */
function progress(message: string) {
  console.log(`    ${test.info().title.split(':')[0]} · ${message}`);
}

/**
 * ขั้นเตรียมข้อมูลที่พังแล้วให้ทำขั้นถัดไปต่อ — เก็บสิ่งที่พังไว้ใน `problems` (ภาพ Error แนบใต้ step ตามปกติ)
 * ผู้ป่วยจะถูกจดพร้อมสถานะเท่าที่ทำได้ แล้วเทสค่อย fail ตอนท้าย
 */
async function attempt(page: Page, problems: string[], title: string, body: () => Promise<void>): Promise<boolean> {
  try {
    await checkStep(page, title, body);
    progress(`✓ ${title}`);
    return true;
  } catch (error) {
    problems.push(`${title} — ${(error as Error).message.split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '')}`); // ตัดรหัสสีของข้อความ error
    progress(`✗ ${title} (ทำขั้นถัดไปต่อ)`);
    return false;
  }
}

/** ลงทะเบียนผู้ป่วยใหม่ที่หน้าคัดกรอง ER แล้วปิด modal เปิด Visit — ได้ HN ที่ไม่มี Visit (R24) */
async function registerWithoutVisit(page: Page, patient: NewPatient): Promise<string> {
  await openTriagePage(page);
  // modal เปิด Visit ไม่ขึ้น (SBH Prod บางครั้ง) = ได้ HN ที่ไม่มี Visit อยู่แล้ว
  const { hn, dialog } = await registerMockPatient(page, patient);
  if (dialog) await dialog.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(openVisitDialog(page)).toBeHidden();
  progress(`✓ ลงทะเบียน ${patient.firstName} ${patient.familyName} HN ${hn} (ไม่เปิด Visit ER)`);
  return hn;
}

/**
 * เปิดหน้าผู้ป่วยแล้วเปิด Visit OPD — ลองใหม่เฉพาะตอนที่ระบบปฏิเสธการสร้าง (ยังไม่มี Visit เกิด)
 * SBH Prod: ตารางสิทธิโหลดไม่ขึ้นเป็นบางครั้ง (insurance-plans ตอบ 500) กดสร้างแล้วได้ `CoverageInput … failed on the 'min' tag`
 */
async function openOpdVisitFor(page: Page, hn: string) {
  for (let round = 1; ; round++) {
    await gotoPatient(page, hn);
    try {
      return await openOpdVisit(page);
    } catch (error) {
      if (round >= 3 || !/เปิด Visit OPD ไม่สำเร็จ/.test((error as Error).message)) throw error;
      progress(`เปิด Visit OPD รอบที่ ${round} ไม่สำเร็จ (${(error as Error).message.slice(0, 120)}) — ลองใหม่`);
    }
  }
}

test.describe(`Mock Data UAT ER (${SYSTEM})`, () => {
  test.setTimeout(480_000); // SBH Prod ช้าเป็นพักๆ — ราย A ทั้งเส้นเคยเกิน 300 วินาที (5 ต.ค. 2026)

  // อ่านอย่างเดียว ไม่สร้างข้อมูล — เลขท้ายล่าสุดของแต่ละข้อ และเลขถัดไปที่ทุกข้อยังว่าง (ใช้เป็น UAT_SEQ)
  test('เลขชุดถัดไปของผู้ป่วย Mock A–D', async ({ page }) => {
    const authorization = trackAuthorization(page);
    await gotoErDashboard(page);
    const { next, latest } = await nextUatSetNumber(page, authorization(), [4, 5, 10, 13]);
    const summary = `[${SYSTEM}] เลขท้ายล่าสุด: ${Object.entries(latest).map(([prefix, n]) => `${prefix}${String(n).padStart(2, '0')}`).join(' · ')} → เลขชุดถัดไป UAT_SEQ=${next}`;
    console.log(`    ${summary}`);
    test.info().annotations.push({ type: 'Mock Data', description: summary });
  });

  test('ราย A (UAT-ER-04): คัดกรองแล้วอยู่ในโซน · มี ER Physician Note · Order Lab / IMG รอผล · งานพยาบาลรอรับงาน 2 งาน', async ({ page }) => {
    const authorization = trackAuthorization(page);
    const problems: string[] = [];
    const done: string[] = [];
    let patient: NewPatient;
    let visit: ErVisit;
    if (RESUME) {
      const last = mockPatient('A');
      const [firstName, familyName] = last.name.split(' ');
      patient = { citizenId: last.citizenId ?? '-', firstName, familyName, gender: 'ชาย', birthDate: '15/01/1990' };
      visit = { hn: last.hn, vn: last.vn, en: last.en };
      await checkStep(page, `เปิด Visit ER ของ ${last.name} (ทำขั้นที่ค้างต่อ)`, async () => {
        if (/^E\d/.test(last.en)) {
          await gotoVisit(page, visit);
        } else {
          // ลงทะเบียนแล้วแต่ยังไม่มี Visit ER (แถวที่จด EN เป็น "-") → เปิด Visit ให้ HN นี้ก่อน
          await gotoErDashboard(page);
          visit = await openErVisitForHn(page, last.hn);
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
        }
        if (RESUME_FROM === 'triage') await expectTriageFormOpen(page, visit);
        else await expectVisitHeader(page, visit);
      });
      progress(`✓ ทำต่อกับ ${last.name} HN ${visit.hn} · ${visit.en}`);
    } else {
      await gotoErDashboard(page);
      patient = await nextUatPatient(page, authorization(), 4);
      visit = await checkStep(page, `ลงทะเบียน ${patient.firstName} ${patient.familyName} + เปิด Visit ER สิทธิ UC`, async () => {
        const opened = await registerAndOpenErVisit(page, patient);
        await expectTriageFormOpen(page, opened);
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
        return opened;
      });
      progress(`✓ ลงทะเบียน ${patient.firstName} ${patient.familyName} HN ${visit.hn} + เปิด Visit ER ${visit.en}`);
    }
    done.push('เปิด Visit ER สิทธิ UC');

    if (
      RESUME_FROM !== 'triage' ||
      (await attempt(page, problems, 'คัดกรอง ESI 3 พร้อมสัญญาณชีพ → โซนเหลือง', async () => {
        // SBH Prod: ข้อมูล Encounter โหลดไม่สำเร็จ (GET …/er/encounters/<EN> ตอบ 500 เป็นพักๆ) ปุ่ม GCS จะกดไม่ได้ค้างอยู่อย่างนั้น → เปิดหน้า Visit ใหม่
        const gcs = triageForm(page).getByRole('button', { name: 'เลือกคะแนน' }).first();
        let rounds = 0;
        await expect(async () => {
          if (rounds++) {
            await gotoVisit(page, visit);
            await expectTriageFormOpen(page, visit);
          }
          if (await gcs.count()) await expect(gcs).toBeEnabled({ timeout: 10_000 });
        }, 'ฟอร์มคัดกรองต้องพร้อมให้กรอก').toPass({ timeout: 150_000 });
        // ตัวกรอกที่ข้ามช่องที่มีค่าแล้ว (draft ค้างจากรอบที่พัง / หลังเปิดหน้าใหม่)
        await fillTriage(page, visit, { level: 3, vitals: VITALS_NORMAL });
        await saveTriageForm(page, visit);
      }))
    ) {
      done.push('คัดกรอง ESI 3');
    }

    // Diagnosis ของแต่ละชุดไม่ซ้ำกัน (ผู้ใช้ขอ 8 ต.ค. 2026) — เลือกรหัสตามเลขท้ายนามสกุล (เลขชุด)
    const dx = dxForSet(Number(patient.familyName.split('-')[1]));
    if (RESUME_FROM === 'order') {
      done.push('ER Physician Note');
    } else {
      let diagnosis = '';
      if (await attempt(page, problems, `แพทย์บันทึก ER Physician Note (Dx ${dx})`, async () => void (diagnosis = await savePhysicianNote(page, dx)))) {
        done.push(`ER Physician Note (Dx ${diagnosis})`);
      }
    }

    const codes = [SETTINGS.labCode, SETTINGS.imagingCode, ...SETTINGS.extraCodes];
    if (await attempt(page, problems, `สั่ง Lab / IMG ${codes.join(' + ')} แล้วส่งคำสั่ง (ผลยังไม่ออก)`, () => submitOrders(page, codes, { resume: RESUME }))) {
      done.push(`Order ${codes.join(' + ')} รอผล`);
    }

    // ตาราง Mock Data เดิมให้มีงาน "กำลังทำ" 1 งาน — ผู้ใช้ปรับ 3 ต.ค. 2026: ราย A ไม่กดรับงานพยาบาล (ทุกงานค้าง "รอรับงาน" ให้ผู้เล่นกดรับเอง)
    await attempt(page, problems, 'งานพยาบาลอย่างน้อย 2 งาน สถานะ "รอรับงาน" (ไม่กดรับงาน)', async () => {
      // งานเกิดตามหลังการส่งคำสั่งเล็กน้อย → อ่านซ้ำจนครบ 2 งาน (ไม่ครบก็ไปต่อ ให้ข้อความด้านล่างบอกจำนวนที่ได้)
      let tasks: NurseTask[] = [];
      await expect(async () => {
        tasks = await fetchNurseTasks(page, authorization(), visit.en);
        expect(tasks.length).toBeGreaterThanOrEqual(2);
      })
        .toPass({ timeout: 30_000 })
        .catch(() => undefined);
      await test.info().attach('งานพยาบาลของผู้ป่วย', { body: JSON.stringify(tasks, null, 2), contentType: 'application/json' });
      const count = (status: string) => tasks.filter((t) => t.status === status).length;
      done.push(`งานพยาบาล: รอรับงาน ${count('PENDING')} · กำลังทำ ${count('RUNNING')}`);
      expect(tasks.length, 'Order ที่ส่งแล้วต้องเกิดงานพยาบาลรวมอย่างน้อย 2 งาน').toBeGreaterThanOrEqual(2);
      expect(count('PENDING'), 'ทุกงานต้องค้างสถานะ "รอรับงาน"').toBe(tasks.length);
    });

    recordMockPatient('A', patient, visit, `${done.join(' · ')}${problems.length ? ` ‖ ไม่สำเร็จ: ${problems.join(' ‖ ')}` : ''}`);
    expect(problems, 'ขั้นที่เตรียมไม่สำเร็จ').toEqual([]);
  });

  test('ราย B (UAT-ER-05): เปิด Visit ER แล้ว ยังไม่คัดกรอง', async ({ page }) => {
    const authorization = trackAuthorization(page);
    await gotoErDashboard(page);
    const patient = await nextUatPatient(page, authorization(), 5);

    const visit = await checkStep(page, `ลงทะเบียน ${patient.firstName} ${patient.familyName} + เปิด Visit ER สิทธิ UC`, async () => {
      const opened = await registerAndOpenErVisit(page, patient);
      // ไม่รอฟอร์มคัดกรอง — รายนี้ต้องค้างที่ "ยังไม่คัดกรอง"
      await expectVisitHeader(page, opened);
      await dismissToast(page, 'สร้าง Visit สำเร็จ');
      await markEvidence(expected(page.getByRole('main').getByText(opened.en, { exact: true }).filter({ visible: true }).first()));
      return opened;
    });
    recordMockPatient('B', patient, visit, 'เปิด Visit ER สิทธิ UC · ยังไม่คัดกรอง');
  });

  // ตาราง Mock Data เดิมให้ราย C "ไม่มี Visit ค้าง" — ผู้ใช้ปรับ 3 ต.ค. 2026: เปิด Visit ER ไว้ให้ขึ้นหน้า Dashboard เลย (UAT-ER-10 = ยกเลิก Encounter ของผู้ป่วยที่ลงทะเบียนผิดคน)
  test('ราย C (UAT-ER-10): มีประวัติแพ้ยา · เปิด Visit ER แล้ว (ขึ้น Dashboard) ยังไม่คัดกรอง', async ({ page }) => {
    const authorization = trackAuthorization(page);
    const problems: string[] = [];
    await gotoErDashboard(page);
    let patient: NewPatient;
    let hn: string;
    let allergy = '';
    let visit: ErVisit | undefined;
    const recordAllergy = () =>
      attempt(page, problems, 'บันทึกประวัติแพ้ยาตัวอย่าง (paracetamol)', async () => {
        await gotoPatient(page, hn);
        allergy = await recordDrugAllergy(page);
      });
    if (RESUME) {
      // ทำขั้นที่ค้างต่อกับราย C รายล่าสุด: ตั้งต้น = เหลือแค่เปิด Visit ER (บันทึกแพ้ยาแล้ว) · MOCK_RESUME_FROM=allergy = ยังไม่ได้บันทึกแพ้ยา
      // แถวที่จด EN ไว้แล้ว = มี Visit ER แล้ว ไม่เปิดซ้ำ
      const last = mockPatient('C');
      const [firstName, familyName] = last.name.split(' ');
      patient = { citizenId: last.citizenId ?? '-', firstName, familyName, gender: 'ชาย', birthDate: '15/01/1990' };
      hn = last.hn;
      if (/^E\d/.test(last.en)) visit = { hn, vn: last.vn, en: last.en };
      progress(`✓ ทำต่อกับ ${last.name} HN ${hn}${visit ? ` · ${visit.en}` : ''}`);
      if (process.env.MOCK_RESUME_FROM === 'allergy') await recordAllergy();
      else allergy = RESUME_ALLERGY;
    } else {
      patient = await nextUatPatient(page, authorization(), 10);
      // บันทึกแพ้ยาก่อน (หน้าผู้ป่วยที่ยังไม่มี Visit) แล้วค่อยเปิด Visit ER
      hn = await checkStep(page, `ลงทะเบียน ${patient.firstName} ${patient.familyName}`, () => registerWithoutVisit(page, patient));
      await recordAllergy();
    }

    if (!visit) {
      await attempt(page, problems, 'เปิด Visit ER สิทธิ UC (ขึ้น Dashboard · ยังไม่คัดกรอง)', async () => {
        await gotoErDashboard(page);
        const opened = await openErVisitForHn(page, hn);
        visit = opened;
        await expectVisitHeader(page, opened);
        await dismissToast(page, 'สร้าง Visit สำเร็จ');
        await markEvidence(expected(page.getByRole('main').getByText(opened.en, { exact: true }).filter({ visible: true }).first()));
      });
    }

    // รูปถ่ายไม่อัปโหลด (R31 ข้อ 5.3)
    const state = [allergy && `แพ้ยา ${allergy}`, visit ? 'เปิด Visit ER สิทธิ UC · ยังไม่คัดกรอง' : 'ยังไม่มี Visit'].filter(Boolean).join(' · ');
    recordMockPatient('C', patient, visit ?? { hn }, `${state}${problems.length ? ` ‖ ไม่สำเร็จ: ${problems.join(' ‖ ')}` : ''}`);
    expect(problems, 'ขั้นที่เตรียมไม่สำเร็จ').toEqual([]);
  });

  test('ราย D (UAT-ER-13): มี HN และมี Visit เปิดอยู่ที่ OPD แผนกอายุรกรรม (เช็คอินแล้ว) · ยังไม่มี Visit ER', async ({ page }) => {
    const authorization = trackAuthorization(page);
    await gotoErDashboard(page);
    let patient: NewPatient;
    let hn: string;
    let opd: Awaited<ReturnType<typeof openOpdVisit>>;
    if (RESUME) {
      // ทำขั้นที่ค้างต่อ (ลงตารางแพทย์ + เช็คอิน) กับราย D รายล่าสุด — Visit OPD เปิดไว้แล้ว
      const last = mockPatient('D');
      const [firstName, familyName] = last.name.split(' ');
      patient = { citizenId: last.citizenId ?? '-', firstName, familyName, gender: 'ชาย', birthDate: '15/01/1990' };
      hn = last.hn;
      if (/^V\d/.test(last.vn)) {
        opd = { vn: last.vn, en: last.en, clinic: RESUME_CLINIC, doctor: '' };
        progress(`✓ ทำต่อกับ ${last.name} HN ${hn} · Visit OPD ${opd.vn}`);
      } else {
        // ลงทะเบียนแล้วแต่ยังไม่มี Visit OPD (แถวที่จด VN เป็น "-") → เปิด Visit OPD ให้ HN นี้ก่อน
        opd = await checkStep(page, `เปิด Visit OPD ให้ ${last.name} (ทำขั้นที่ค้างต่อ)`, () => openOpdVisitFor(page, hn));
        progress(`✓ ทำต่อกับ ${last.name} HN ${hn} · เปิด Visit OPD ${opd.vn} ที่ ${opd.clinic}`);
      }
    } else {
      patient = await nextUatPatient(page, authorization(), 13);
      hn = await checkStep(page, `ลงทะเบียน ${patient.firstName} ${patient.familyName} แล้วไม่เปิด Visit ER`, () => registerWithoutVisit(page, patient));
      opd = await checkStep(page, 'เปิด Visit OPD แบบ Walk-in ที่แผนกอายุรกรรม พร้อมระบุแพทย์', () => openOpdVisitFor(page, hn));
      progress(`✓ เปิด Visit OPD ${opd.vn} ที่ ${opd.clinic} ${opd.doctor ? `แพทย์ ${opd.doctor}` : '(คำขอ Walk-in ยังไม่มีแพทย์)'}`);
    }

    const problems: string[] = [];
    let doctor = opd.doctor;
    // SBH Prod: Visit ที่ได้เป็น "คำขอ Walk-in" → ลงตารางแพทย์ที่แท็บคำขอ Walk-in ของรายการผู้ป่วยนอก (ลงแล้วระบบเช็คอินให้เอง)
    if (!doctor) {
      await attempt(page, problems, 'ลงตารางแพทย์ให้คำขอ Walk-in (รายการผู้ป่วยนอก)', async () => {
        const scheduled = await scheduleWalkInRequest(page, hn);
        doctor = `${scheduled.doctor} ${scheduled.slot}`;
      });
    }

    // ต้องเช็คอิน ผู้ป่วยจึงไปอยู่แท็บ "เช็คอิน" ของรายการผู้ป่วยนอก (ค้างที่ "รอเช็คอิน" ใช้เล่นต่อไม่ได้ — ผู้ใช้ 3 ต.ค. 2026)
    let queue = '';
    if (await attempt(page, problems, 'Visit OPD สถานะ "เช็คอิน"', async () => void (queue = await checkInOpdVisit(page, { hn, vn: opd.vn, en: opd.en })))) {
      await markEvidence(expected(page.getByRole('main').locator('.ant-select[class*="status-select"]').filter({ visible: true }).first()));
    }
    const state = queue ? `เช็คอินแล้ว (${/^[A-Z]/.test(queue) ? `คิว ${queue}` : queue})` : 'ยังไม่ได้เช็คอิน';
    recordMockPatient('D', patient, { hn, vn: opd.vn, en: opd.en }, `Visit OPD ที่ ${opd.clinic} · แพทย์ ${doctor || '-'} · ${state} · ยังไม่มี Visit ER${problems.length ? ` ‖ ไม่สำเร็จ: ${problems.join(' ‖ ')}` : ''}`);
    expect(problems, 'ขั้นที่เตรียมไม่สำเร็จ').toEqual([]);
  });

  test('ราย E (UAT-ER-14): มีรายการ Refer จาก MOPH Refer สถานะ "ส่งเรียบร้อย" รอรับเข้า ER (ตรวจอย่างเดียว)', async ({ page }) => {
    // รายการ Refer มาจากระบบ MOPH Refer ภายนอก สคริปต์สร้างเองไม่ได้ — เปิดหน้าดูว่ามีรายการรออยู่ไหม
    // dev-x ไม่มีเมนูนี้ · หน้าจอบน SBH Prod ยังไม่ได้ตรวจ (ชื่อเมนูตามชีต Scenario- ER)
    test.skip(SYSTEM !== 'sbh-prod', 'dev-x ไม่มีเมนู "รับ Refer เข้า"');
    await gotoErDashboard(page);
    await checkStep(page, 'หน้า "รับ Refer เข้า" มีรายการสถานะ "ส่งเรียบร้อย"', async () => {
      await openErMenu(page, 'รับ Refer เข้า');
      const waiting = page.getByRole('main').getByRole('row').filter({ hasText: 'ส่งเรียบร้อย' });
      await expect(waiting.first(), 'ต้องมีรายการ Refer สถานะ "ส่งเรียบร้อย" อย่างน้อย 1 รายการ').toBeVisible();
      test.info().annotations.push({ type: 'Mock Data', description: `[${SYSTEM}] E: รายการ Refer สถานะ "ส่งเรียบร้อย" ${await waiting.count()} รายการ` });
      await markEvidence(expected(waiting.first()));
    });
  });
});
