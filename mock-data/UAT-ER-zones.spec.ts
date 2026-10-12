import { dismissToast, expectOk, expectTriageFormOpen, gotoErDashboard, type ErVisit } from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { triageForm } from '../helpers/functions/er-triage';
import { checkStep, expected, markEvidence } from '../helpers/functions/evidence';
import type { NewPatient } from '../helpers/functions/test-data';
import { expect, test } from './fixtures';
import { SYSTEM, nextPrefixedPatient, nextSetNumberOf, recordMockPatient, registerAndOpenErVisit } from './uat-er';
import { VITALS_NORMAL, boardEncounter, fillTriage, gotoVisit, mockPatient, saveTriageForm } from './uat-play';

// Mock Data: ผู้ป่วยโซนละ 1 คนบนบอร์ด ER (ผู้ใช้ขอ 9 ต.ค. 2026) — ชื่อ "UAT" นามสกุล RED / YELLOW / OBS / GREEN + "-<เลขชุด>"
// ESI ต่อโซน: แดง = 1 · เหลือง = 3 · ห้องสังเกตอาการ = 4 (กดเลือกโซนเอง + ยืนยัน workflow สังเกตอาการ) · เขียว = 5 (ตอบ "ภายหลัง" ที่คำถามส่งต่อคลินิก ให้ค้างอยู่โซนเขียว)
// ทั้งชุดเลขท้ายเดียวกัน: ดูเลขที่ว่างด้วย --grep "เลขชุด" แล้วตั้ง env UAT_SEQ=<เลข> ตอนรันแต่ละโซน (--grep "โซนแดง " …) — กติกาเดียวกับ UAT-ER-mock-data (R35)
// SBH Prod:  UAT_SEQ=1 npx playwright test -c playwright.sbh-prod.config.ts UAT-ER-zones --headed --grep "โซนแดง "
// dev-x:     UAT_SEQ=1 npx playwright test -c playwright.mock.config.ts UAT-ER-zones --headed --grep "โซนแดง "

interface Zone {
  /** คำนำหน้านามสกุล */
  key: string;
  /** ชื่อโซนตามปุ่มในฟอร์มคัดกรอง / คอลัมน์บนบอร์ด */
  label: string;
  level: 1 | 3 | 4 | 5;
  /** โซนที่ระบบไม่ได้แนะนำให้ตามระดับ ESI — ต้องกดเลือกเอง */
  manual?: boolean;
}

const ZONES: Zone[] = [
  { key: 'RED', label: 'โซนแดง ER', level: 1 },
  { key: 'YELLOW', label: 'โซนเหลือง ER', level: 3 },
  { key: 'OBS', label: 'ห้องสังเกตอาการ ER', level: 4, manual: true },
  { key: 'GREEN', label: 'โซนเขียว ER', level: 5 },
];

/** MOCK_RESUME=1 — ทำขั้นคัดกรองต่อกับผู้ป่วยรายล่าสุดของโซนนั้น (ไม่สร้างผู้ป่วยใหม่ เลขชุดคงเดิม) ใช้เมื่อสะดุดหลังเปิด Visit ER แล้ว */
const RESUME = process.env.MOCK_RESUME === '1';

function progress(message: string) {
  console.log(`    ${test.info().title.split(':')[0]} · ${message}`);
}

test.describe(`Mock Data ผู้ป่วยโซนละ 1 คน (${SYSTEM})`, () => {
  test.setTimeout(480_000);

  // อ่านอย่างเดียว ไม่สร้างข้อมูล — เลขท้ายล่าสุดของแต่ละโซน และเลขถัดไปที่ทุกโซนยังว่าง (ใช้เป็น UAT_SEQ)
  test('เลขชุดถัดไปของผู้ป่วยตามโซน', async ({ page }) => {
    const authorization = trackAuthorization(page);
    await gotoErDashboard(page);
    const { next, latest } = await nextSetNumberOf(page, authorization(), ZONES.map((zone) => `${zone.key}-`));
    const summary = `[${SYSTEM}] เลขท้ายล่าสุด: ${Object.entries(latest).map(([prefix, n]) => `${prefix}${String(n).padStart(2, '0')}`).join(' · ')} → เลขชุดถัดไป UAT_SEQ=${next}`;
    console.log(`    ${summary}`);
    test.info().annotations.push({ type: 'Mock Data', description: summary });
  });

  for (const zone of ZONES) {
    test(`${zone.label.replace(' ER', '')} : ผู้ป่วย UAT ${zone.key} คัดกรอง ESI ${zone.level} แล้วอยู่ ${zone.label}`, async ({ page }) => {
      const authorization = trackAuthorization(page);
      const main = page.getByRole('main');
      const form = triageForm(page);
      const label = zone.label.replace(' ER', '');
      let patient: NewPatient;
      let visit: ErVisit;
      if (RESUME) {
        // ทำขั้นคัดกรองต่อกับผู้ป่วยรายล่าสุดของโซนนี้ใน created-patients.md (เปิด Visit ER แล้ว ยังไม่คัดกรอง)
        const last = mockPatient(label as 'A');
        const [firstName, familyName] = last.name.split(' ');
        patient = { citizenId: last.citizenId ?? '-', firstName, familyName, gender: 'ชาย', birthDate: '15/01/1990' };
        visit = { hn: last.hn, vn: last.vn, en: last.en };
        await checkStep(page, `เปิด Visit ER เดิมของ ${last.name} (ทำขั้นที่ค้างต่อ)`, async () => {
          await gotoVisit(page, visit);
          await expectTriageFormOpen(page, visit);
        });
        progress(`✓ ทำต่อกับ ${last.name} HN ${visit.hn} · ${visit.en}`);
      } else {
        await gotoErDashboard(page);
        patient = await nextPrefixedPatient(page, authorization(), `${zone.key}-`);
        visit = await checkStep(page, `ลงทะเบียน ${patient.firstName} ${patient.familyName} + เปิด Visit ER สิทธิ UC`, async () => {
          const opened = await registerAndOpenErVisit(page, patient);
          await expectTriageFormOpen(page, opened);
          await dismissToast(page, 'สร้าง Visit สำเร็จ');
          return opened;
        });
        progress(`✓ ลงทะเบียน ${patient.firstName} ${patient.familyName} HN ${visit.hn} + เปิด Visit ER ${visit.en}`);
      }

      let state = 'เปิด Visit ER สิทธิ UC · ยังไม่คัดกรอง';
      let failure: unknown;
      try {
        await checkStep(page, `คัดกรอง ESI ${zone.level} → ${zone.label}`, async () => {
          // SBH Prod: ข้อมูล Encounter โหลดไม่สำเร็จ (ตอบ 500 เป็นพักๆ) ปุ่ม GCS จะกดไม่ได้ค้างอยู่อย่างนั้น → เปิดหน้า Visit ใหม่
          const gcs = form.getByRole('button', { name: 'เลือกคะแนน' }).first();
          let rounds = 0;
          await expect(async () => {
            if (rounds++) {
              await gotoVisit(page, visit);
              await expectTriageFormOpen(page, visit);
            }
            if (await gcs.count()) await expect(gcs).toBeEnabled({ timeout: 10_000 });
          }, 'ฟอร์มคัดกรองต้องพร้อมให้กรอก').toPass({ timeout: 150_000 });

          await fillTriage(page, visit, { level: zone.level, vitals: VITALS_NORMAL });
          const zoneButton = form.getByRole('button', { name: new RegExp(`^${zone.label}`) });
          if (zone.manual) {
            // โซนที่ระบบไม่แนะนำตาม ESI: กดเลือกเอง → ยืนยันการเปลี่ยนเป็น workflow สังเกตอาการ
            await zoneButton.click();
            const confirm = page.getByRole('dialog', { name: /workflow สังเกตอาการ/ });
            await expect(confirm).toBeVisible();
            await confirm.getByRole('button', { name: 'ยืนยัน' }).click();
            await expect(confirm).toBeHidden();
          } else {
            await expect(form.getByRole('button', { name: new RegExp(`^${zone.label}.*แนะนำ`) }), `ESI ${zone.level} ระบบต้องแนะนำ ${zone.label}`).toBeVisible();
          }
          await markEvidence(expected(zoneButton));
          await saveTriageForm(page, visit);

          // ESI 5: บันทึกแล้วระบบถามคลินิกปลายทาง → "ภายหลัง" ผู้ป่วยค้างอยู่โซนเขียว (ไม่ส่งต่อ)
          if (zone.level === 5) {
            const refer = page.getByRole('dialog', { name: 'ส่งต่อไปคลินิก' });
            await expect(refer).toBeVisible();
            await refer.getByRole('button', { name: 'ภายหลัง' }).click();
            await expect(refer).toBeHidden();
          }
        });
        progress(`✓ คัดกรอง ESI ${zone.level} → ${zone.label}`);
        state = `เปิด Visit ER สิทธิ UC · คัดกรอง ESI ${zone.level} · ${zone.label}`;

        // ยืนยันจากข้อมูลบอร์ด: ระดับ ESI + โซนที่บันทึกจริง
        await checkStep(page, `ข้อมูลบอร์ด ER: ESI ${zone.level} อยู่ ${zone.label}`, async () => {
          let encounter: Record<string, unknown> | undefined;
          await expect(async () => {
            encounter = await boardEncounter(page, authorization(), visit.en);
            expect(encounter?.triageLevel, 'ระดับ ESI บนบอร์ด').toBe(zone.level);
          }).toPass({ timeout: 60_000 });
          // โซนอยู่ในช่อง currentLocationId — ชื่อโซนของ id นั้นดูจาก GET /cortex-api/er/triage/zones (boardLocations)
          const zonesRes = await page.request.get('/cortex-api/er/triage/zones', { headers: { authorization: authorization() } });
          await expectOk(zonesRes, 'อ่านรายชื่อโซน ER');
          const { boardLocations } = (await zonesRes.json()) as { boardLocations: { id: number; nameTh: string }[] };
          const location = boardLocations.find((item) => item.id === encounter?.currentLocationId)?.nameTh ?? `(ไม่รู้จัก location ${String(encounter?.currentLocationId)})`;
          const summary = { triageLevel: encounter?.triageLevel, currentLocationId: encounter?.currentLocationId, location, patientStatus: encounter?.patientStatus, referredClinicId: encounter?.referredClinicId };
          await test.info().attach('ข้อมูลบอร์ดของผู้ป่วย', { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
          progress(`ข้อมูลบอร์ด: ${JSON.stringify(summary)}`);
          expect(location, 'โซนของผู้ป่วยตามข้อมูลบอร์ด').toBe(zone.label);
        });
      } catch (error) {
        failure = error;
        state += ` ‖ ไม่สำเร็จ: ${(error as Error).message.split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '')}`;
      }

      recordMockPatient(label, patient, visit, state);
      if (failure) throw failure;
    });
  }
});
