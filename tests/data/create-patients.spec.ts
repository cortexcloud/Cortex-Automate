import { searchPatients } from '../../helpers/functions/er';
import { checkStep, expected, markEvidence } from '../../helpers/functions/evidence';
import { expect, test } from '../../helpers/functions/fixtures';
import { PATIENTS_FILE } from '../../helpers/functions/patient-store';
import { createPatients } from '../../helpers/flows/patient.flows';

// สร้างผู้ป่วย mock data ชุด "AIทดสอบ" บน dev-x แล้วเก็บลง test-data/patients.json — ไม่ใช่เทสของการ์ด
// รันด้วย `npm run data:patients` เท่านั้น (npm test ปกติจะข้าม ไม่ให้สร้างผู้ป่วยทุกครั้งที่รันเทส)
// จำนวน/อายุผ่าน env: PATIENT_COUNT (ค่าเริ่ม 1) · PATIENT_MIN_AGE / PATIENT_MAX_AGE (ค่าเริ่ม 18 / 80)

const requested = process.env.npm_lifecycle_event === 'data:patients' || !!process.env.PATIENT_COUNT;
const count = Number(process.env.PATIENT_COUNT ?? 1);
const minAge = Number(process.env.PATIENT_MIN_AGE ?? 18);
const maxAge = Number(process.env.PATIENT_MAX_AGE ?? 80);

test(`สร้างผู้ป่วย AIทดสอบ มี HN ไม่มี Visit ${count} คน (Super_User) @data`, async ({ page }) => {
  test.skip(!requested, 'สร้างผู้ป่วยเฉพาะตอนรัน npm run data:patients');
  test.setTimeout(60_000 + count * 30_000);

  const patients = await checkStep(page, `ลงทะเบียนผู้ป่วยใหม่ ${count} คน → ยกเลิก modal เปิด Visit → บันทึกลง patients.json`, () =>
    createPatients(page, {
      count,
      minAge,
      maxAge,
      onCreated: (p) => {
        test.info().annotations.push({ type: `HN ${p.hn}`, description: `${p.firstName} ${p.familyName} · ${p.gender} · ${p.birthDate} (${p.age} ปี)` });
      },
    }),
  );

  for (const p of patients) {
    await checkStep(page, `ค้นชื่อ ${p.firstName} แล้วเจอ HN ${p.hn}`, async () => {
      const { data } = await searchPatients(page, p.firstName);
      expect(data.map((found) => found.hn)).toContain(p.hn);
      const option = page.locator(`.ant-select-item-option[title^="${p.hn} - "]`);
      await expect(option).toBeVisible();
      await markEvidence(expected(option));
    });
  }

  await test.info().attach('patients ที่สร้างรอบนี้', { body: JSON.stringify(patients, null, 2), contentType: 'application/json' });
  test.info().annotations.push({ type: 'mock data', description: PATIENTS_FILE });
});
