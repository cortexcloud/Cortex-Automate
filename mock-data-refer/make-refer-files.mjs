// สร้างไฟล์ payload Mock Refer ชุดใหม่ลง mock-data-refer/mock-data/ จากรายการเคสใน mock-data-refer/cases/<ชุด>.mjs
//   node mock-data-refer/make-refer-files.mjs mock-data-refer/cases/0066-0075.mjs
// โครงไฟล์ตาม 25 ไฟล์ต้นแบบ (0017/69 – 0041/69): เลข Refer / HN ต้นทาง / เลขบัตร รันตาม seq ของเคส · ที่อยู่ + รูปแนบยืมจากไฟล์ต้นแบบ
// ไฟล์เคส export เพิ่มได้: `export const defaults = { address, mobile, originPhone }` (ใช้กับทุกเคสในชุด เช่น ผู้ต้องขังใช้ที่อยู่เรือนจำ) · เคสใส่ `infective` / `address` / `mobile` เองได้
// ตรวจก่อนเขียน: เลข Refer · เลขบัตร · ชื่อ · ICD-10 ต้องไม่ซ้ำกับไฟล์ที่มี — ซ้ำ = ไม่เขียนสักไฟล์ · ส่งด้วย send-refer.mjs (npm run mock:refer)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DATA_DIR = path.join(import.meta.dirname, 'mock-data');
const ORIGIN = '22810';
const DAY_MS = 86_400_000;
const COVERAGE = {
  UCS: { maininscl: 'UCS', ref_name: 'สิทธิหลักประกันสุขภาพแห่งชาติ', hcode_main: '10661', hcode_sub: '10695', no: '13475', hcode_payment: '10661' },
  SSS: { maininscl: 'SSS', ref_name: 'สิทธิประกันสังคม', hcode_main: '10661', hcode_sub: '10695', no: '13471', hcode_payment: '10661' },
  OFC: { maininscl: 'OFC', ref_name: 'สิทธิข้าราชการ/รัฐวิสาหกิจ', hcode_main: '10661', hcode_sub: '10661', no: '13475', hcode_payment: '10661' },
  LGO: { maininscl: 'LGO', ref_name: 'สิทธิพนักงานส่วนท้องถิ่น', hcode_main: '10661', hcode_sub: '10661', no: '13475', hcode_payment: '10661' },
};

const casesFile = process.argv[2];
if (!casesFile || !fs.existsSync(casesFile)) {
  console.error('วิธีใช้: node mock-data-refer/make-refer-files.mjs mock-data-refer/cases/<ชุด>.mjs');
  process.exit(1);
}

const thaiDate = (time) => new Date(time).toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10);
const DAY = thaiDate(Date.now());
const at = (time) => `${DAY} ${time}`;

// ตัวช่วยที่ไฟล์เคสใช้เขียนหัตถการ / ยา / สัญญาณชีพ — เวลา "HH:mm" = วันนี้ · ยาประจำใช้ home('YYYY-MM-DD', …)
const helpers = {
  proc: (icd9, time, description) => ({ icd9, datetime: at(time), anaesthesia_type: '3', ansesthesia_other_description: '', description }),
  med: (start, end, code, name, description) => ({ start_time: at(start), end_time: at(end), code, name, description }),
  home: (since, code, name, description) => ({ start_time: `${since} 08:00`, end_time: `${DAY} 08:00`, code, name, description }),
  vital: (sbp, dbp, hr, spo2, pain, rr, temp, e, v, m, weight, height) => ({ sbp, dbp, hr, spo2, pain, rr, temp, e, v, m, weight, height }),
};

/** เลขบัตรสมมติแบบเดียวกับไฟล์ต้นแบบ: 110170020 + (400 + seq) + checksum */
function cidOf(seq) {
  const first12 = `110170020${String(400 + seq).padStart(3, '0')}`;
  const sum = [...first12].reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  return first12 + ((11 - (sum % 11)) % 10);
}

const existing = fs
  .readdirSync(DATA_DIR)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')));
const template = existing[0];
const attachments = existing.flatMap((data) => data.illness_file_list ?? []);
const ATTACH = { LAB: attachments.find((file) => file.file_type === 'LAB'), 'X-RAY': attachments.find((file) => file.file_type === 'X-RAY') };
const addresses = [...new Map(existing.map((data) => [data.patient.address.subdistrict, data.patient.address])).values()];

const casesModule = await import(pathToFileURL(path.resolve(casesFile)).href);
const defaults = casesModule.defaults ?? {};
const cases = casesModule.default(helpers);
const outputs = cases.map((c, index) => {
  const no = String(c.seq).padStart(4, '0');
  const payload = {
    refer_out_no: `${no}/69`,
    his_id: template.his_id,
    refer_expire_type: 'date',
    refer_date: at(c.time),
    refer_expire_date: `${thaiDate(Date.now() + 30 * DAY_MS)} 23:59`,
    hcode_origin: ORIGIN,
    hcode_destination: template.hcode_destination,
    opd_or_ipd: c.setting,
    patient_type: c.type,
    emergency: c.emergency,
    doctor_cid: template.doctor_cid,
    medical_coverage: COVERAGE[c.coverage],
    hospital_origin_phone: defaults.originPhone ?? template.hospital_origin_phone,
    patient: {
      profile: {
        hn: `UAT${String(c.seq).padStart(6, '0')}`,
        cid: cidOf(c.seq),
        title_name: c.title,
        first_name: c.first,
        middle_name: '',
        last_name: c.last,
        gender: c.gender,
        birthdate: c.birth,
        mobile_no: c.mobile ?? defaults.mobile ?? `0${812346229 + 37 * (c.seq - 17)}`,
      },
      address: c.address ?? defaults.address ?? { ...addresses[index % addresses.length], no: `${20 + c.seq}/${((c.seq * 7) % 90) + 1}`, village_no: String((c.seq % 9) + 1) },
    },
    request_type: '1',
    record_illness_past: c.past,
    record_illness_present: c.present,
    test_results: c.tests,
    initial_diagnosis_free_text: c.dxText,
    initial_diagnosis: [{ icd10: c.icd10, dx_name: c.dxName, dx_type: 'PP' }],
    procedure: c.procedures,
    medication_history: c.meds,
    treatment_provided: c.treatment,
    reason_refer: c.reason,
    more_detail: `ข้อมูลสมมติสำหรับทดสอบ UAT${c.more ? ` | ${c.more}` : ''}`,
    infective_disease: c.infective ?? '',
    vital_sign: {
      systolic_bp: c.vital.sbp,
      diastolic_bp: c.vital.dbp,
      heart_rate: c.vital.hr,
      oxygen_saturation: c.vital.spo2,
      pain_score: c.vital.pain,
      respiratory_rate: c.vital.rr,
      temperature: c.vital.temp,
      e: c.vital.e,
      v: c.vital.v,
      m: c.vital.m,
      weight: c.vital.weight,
      height: c.vital.height,
      entry_datetime: at(c.time),
    },
    is_signing: false,
    is_test_signing: false,
    is_close_qrcode_signing: false,
    signature: [],
    ...(c.attach.length ? { illness_file_list: c.attach.map((type) => ({ ...ATTACH[type] })) } : {}),
  };
  if (!payload.medical_coverage) throw new Error(`${no}/69: ไม่รู้จักสิทธิ ${c.coverage}`);
  return { c, payload, file: `moph-refer-uat-${no}-69-${c.slug}.json` };
});

const all = [...existing, ...outputs.map((output) => output.payload)];
const duplicated = (label, pick) => {
  const values = all.map(pick);
  const repeats = [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
  if (repeats.length) throw new Error(`${label}ซ้ำ: ${repeats.join(', ')}`);
};
duplicated('เลข Refer ', (data) => data.refer_out_no);
duplicated('เลขบัตร', (data) => data.patient.profile.cid);
duplicated('ชื่อ', (data) => `${data.patient.profile.first_name} ${data.patient.profile.last_name}`);
duplicated('ICD-10 ', (data) => data.initial_diagnosis[0].icd10);

const readme = path.join(DATA_DIR, 'README.md');
const rows = [];
for (const { c, payload, file } of outputs) {
  fs.writeFileSync(path.join(DATA_DIR, file), `${JSON.stringify(payload, null, 4)}\n`);
  rows.push(`| ${file} | ${c.type} | ${c.emergency} | ${c.setting} | ${c.coverage} | ${c.title}${c.first} ${c.last} | ${c.icd10} | ${c.dxText.split(';')[0]} |`);
  console.log(`${payload.refer_out_no} | ${c.coverage} | ${c.title}${c.first} ${c.last} | ${payload.patient.profile.cid} | ${c.icd10} | ${file}`);
}
fs.writeFileSync(readme, `${fs.readFileSync(readme, 'utf8').trimEnd()}\n${rows.join('\n')}\n`);
console.log(`เขียน ${outputs.length} ไฟล์ · ไฟล์ทั้งหมด ${all.length}`);
