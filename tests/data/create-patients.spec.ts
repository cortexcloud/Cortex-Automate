import { searchPatients } from '../../helpers/functions/er';
import { checkStep, expected, markEvidence } from '../../helpers/support/evidence';
import { expect, test } from '../../helpers/support/fixtures';
import { PATIENTS_FILE, type PatientChannel } from '../../helpers/data/patient-store';
import { expectReceptionSearchResult } from '../../helpers/functions/reception';
import { createPatients } from '../../helpers/flows/patient.flows';

// สร้างผู้ป่วย mock data ชุด "AIทดสอบ" บน dev-x แล้วเก็บลง test-data/patients.json — ไม่ใช่เทสของการ์ด
// ต้องเลือกช่องทางเอง: `npm run data:patients:er` / `npm run data:patients:reception` หรือ env PATIENT_CHANNEL=er|reception
// ไม่ได้เลือก = ข้าม (npm test ปกติจึงไม่สร้างผู้ป่วยทุกครั้งที่รันเทส)
// จำนวน/อายุผ่าน env: PATIENT_COUNT (ค่าเริ่ม 1) · PATIENT_MIN_AGE / PATIENT_MAX_AGE (ค่าเริ่ม 18 / 80)

const CHANNELS: PatientChannel[] = ['er', 'reception'];
const fromScript = process.env.npm_lifecycle_event?.match(/^data:patients:(\w+)$/)?.[1];
const channelInput = process.env.PATIENT_CHANNEL ?? fromScript;
const channel = CHANNELS.find((c) => c === channelInput);
const count = Number(process.env.PATIENT_COUNT ?? 1);
const minAge = Number(process.env.PATIENT_MIN_AGE ?? 18);
const maxAge = Number(process.env.PATIENT_MAX_AGE ?? 80);

test(`สร้างผู้ป่วย AIทดสอบ มี HN ไม่มี Visit ${count} คน ช่องทาง ${channel ?? '-'} (Super_User) @data`, async ({ page }) => {
  test.skip(
    !channel,
    channelInput
      ? `ช่องทาง "${channelInput}" ไม่รู้จัก — ใช้ er หรือ reception`
      : 'เลือกช่องทางก่อน: npm run data:patients:er / npm run data:patients:reception',
  );
  if (!channel) return;
  test.setTimeout(60_000 + count * 90_000); // Reception ~70 วินาทีต่อคน

  const how = channel === 'er' ? 'หน้าคัดกรอง ER → ยกเลิก modal เปิด Visit' : 'เวชระเบียน "สร้างผู้ป่วยใหม่" + ที่อยู่สุ่ม';
  const patients = await checkStep(page, `ลงทะเบียนผู้ป่วยใหม่ ${count} คน (${how}) → บันทึกลง patients.json`, () =>
    createPatients(page, {
      channel,
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
      if (channel === 'reception') {
        await markEvidence(expected(await expectReceptionSearchResult(page, p.firstName, p.hn)));
        return;
      }
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
