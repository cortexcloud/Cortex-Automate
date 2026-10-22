// ส่ง Mock Data "Refer เข้า" (ไฟล์ใน mock-data-refer/mock-data/) ไป MOPH Refer UAT ให้ขึ้นหน้า "รับ Refer เข้า" ของ Cortex SBH Prod
//   node mock-data-refer/send-refer.mjs                      แสดงสถานะทุกไฟล์ (อ่านอย่างเดียว)
//   node mock-data-refer/send-refer.mjs --only=0024,0026     แสดงเฉพาะเลขที่เลือก
//   node mock-data-refer/send-refer.mjs --only=0024 --confirm   ส่งจริง
//   node mock-data-refer/send-refer.mjs --unsent --confirm      ส่งทุกไฟล์ที่เลขยังไม่มีในรายการของ Cortex
// ไม่ใส่ --confirm = ไม่ส่งอะไร · เลขที่มีในรายการของ Cortex แล้วจะไม่ส่งซ้ำ
// โรงพยาบาลต้นทาง (hcode_origin) = 22810 ทุกรายที่ส่ง ไม่ว่าในไฟล์เขียนอะไร · --origin=<รหัส> = ใช้รหัสอื่น
// วันที่ Refer = เวลาที่ส่ง (เวลาอื่นในไฟล์เลื่อนตามให้ห่างเท่าเดิม) · --keep-date = ใช้วันที่ตามไฟล์
// token: Keycloak ของ SBH Prod · client cortex-ui · บัญชี Super_User ใน .env.sbh-prod (ใช้อ่านรายการของ Cortex)
// ฝั่ง MOPH Refer UAT: ค่าใน .env.moph-refer (ดู .env.moph-refer.example) — ไม่มีไฟล์นี้จะส่งด้วย token ของ Keycloak อย่างเดียว
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(import.meta.dirname, 'mock-data');
const LOG_FILE = path.join(import.meta.dirname, 'sent-refers.md');
const TOKEN_URL = 'https://id-cortex.srbrhospital.com/realms/cortex/protocol/openid-connect/token';
const REFER_URL = 'https://moph-refer-uat.inet.co.th/backend/api/v1/service/refer-data';
const CORTEX_API = 'https://cortex.srbrhospital.com/cortex-api';
const STATUS_TEXT = { deliver: 'ส่งเรียบร้อย (รอรับ)', receive: 'รับแล้ว' };
const DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const DAY = 86_400_000;
const COVERAGE_NO = '13475';
const DEFAULT_ORIGIN = '22810';

const fail = (message) => {
  console.error(`${message}\nวิธีใช้: npm run mock:refer -- [--only=0024,0026 | --unsent] [--origin=22810] [--keep-date] [--confirm]`);
  process.exit(1);
};

let only = null;
let unsent = false;
let keepDate = false;
let origin = DEFAULT_ORIGIN;
let confirm = false;
for (const option of process.argv.slice(2)) {
  const [name, value] = option.split('=');
  if (name === '--only' && /^\d{4}(,\d{4})*$/.test(value ?? '')) only = value.split(',');
  else if (name === '--unsent' && value === undefined) unsent = true;
  else if (name === '--origin' && /^[A-Z0-9]{5}$/.test(value ?? '')) origin = value;
  else if (name === '--keep-date' && value === undefined) keepDate = true;
  else if (name === '--confirm' && value === undefined) confirm = true;
  else fail(`ตัวเลือกไม่ถูกต้อง: ${option}`);
}
if (confirm && !only && !unsent) fail('ส่งจริงต้องระบุ --only=<เลข> หรือ --unsent');

process.loadEnvFile(path.join(ROOT, '.env.sbh-prod'));
const mophEnvFile = path.join(ROOT, '.env.moph-refer');
if (fs.existsSync(mophEnvFile)) process.loadEnvFile(mophEnvFile);

/** header ของ MOPH Refer UAT: Bearer (token คงที่ของ MOPH ถ้าตั้งไว้ ไม่งั้นใช้ของ Keycloak) + Client-Id / Client-Secret ถ้าตั้งไว้ */
async function mophHeaders() {
  const headers = { authorization: `Bearer ${process.env.MOPH_REFER_TOKEN || (await requestToken())}`, 'content-type': 'application/json' };
  if (process.env.MOPH_REFER_CLIENT_ID) headers['Client-Id'] = process.env.MOPH_REFER_CLIENT_ID;
  if (process.env.MOPH_REFER_CLIENT_SECRET) headers['Client-Secret'] = process.env.MOPH_REFER_CLIENT_SECRET;
  return headers;
}

/** SBH Prod หลุดเป็นพักๆ (ECONNRESET · 403 "token validation failed" · 5xx) → รอ 3 วินาทีแล้วลองใหม่ */
async function retry(action, times = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt >= times) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

/** ขอ token จาก Keycloak (อายุ 5 นาที) — ไม่พิมพ์ค่าที่ส่งหรือ token ที่ได้ */
async function requestToken() {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'cortex-ui',
    username: process.env.CORTEX_USERNAME_Super_User ?? '',
    password: process.env.CORTEX_PASSWORD_Super_User ?? '',
  });
  const res = await retry(() => fetch(TOKEN_URL, { method: 'POST', body }));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ขอ token ไม่ผ่าน: ${res.status} ${json.error ?? ''} ${json.error_description ?? ''}`);
  return json.access_token;
}

/** รายการ "รับ Refer เข้า" ที่ Cortex เห็นอยู่ (อ่านอย่างเดียว) */
async function fetchReferInList() {
  const token = await requestToken();
  const items = [];
  for (let page = 1; ; page++) {
    const json = await retry(async () => {
      const res = await fetch(`${CORTEX_API}/moph/refer-in?page=${page}&perPage=50`, { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`GET /moph/refer-in → ${res.status} ${(await res.text()).slice(0, 300)}`);
      return res.json();
    });
    items.push(...(json.items ?? []));
    // API ให้หน้าละไม่เกิน 50 รายการ → ไล่จนครบ totalPages ไม่งั้นเลขที่อยู่หน้าหลังจะถูกมองว่ายังไม่เคยส่ง
    if (!json.items?.length || page >= (json.pagination?.totalPages ?? 1)) break;
  }
  return items;
}

const parseThai = (text) => new Date(`${text.replace(' ', 'T')}:00+07:00`).getTime();
const formatThai = (time) => new Date(time).toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 16);

/** เลื่อนเวลาทั้งไฟล์ให้ refer_date = ตอนนี้ · วันหมดอายุเลื่อนเป็นจำนวนวันเต็ม (คงเวลา 23:59) · วันเกิดไม่แตะ */
function shiftToNow(data) {
  const delta = Math.floor(Date.now() / 60_000) * 60_000 - parseThai(data.refer_date);
  const days = Math.round((parseThai(`${formatThai(Date.now()).slice(0, 10)} 00:00`) - parseThai(`${data.refer_date.slice(0, 10)} 00:00`)) / DAY);
  const walk = (value, key) => {
    if (typeof value === 'string') return DATETIME.test(value) ? formatThai(parseThai(value) + (key === 'refer_expire_date' ? days * DAY : delta)) : value;
    if (Array.isArray(value)) return value.map((item) => walk(item, key));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, walk(item, name)]));
    return value;
  };
  return walk(data);
}

const payloads = fs
  .readdirSync(DATA_DIR)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => ({ file, data: JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) }))
  .filter(({ data }) => !only || only.includes(data.refer_out_no.slice(0, 4)));
if (!payloads.length) fail('ไม่พบไฟล์ตามเลขที่ระบุ');

const existing = await fetchReferInList();
const rows = payloads.map(({ file, data }) => {
  const profile = data.patient.profile;
  // เลขเดียวกันจากต้นทางที่จะส่ง หรือจากต้นทางในไฟล์ (รายที่เคยส่งด้วยรหัสเดิม) = ถือว่ามีแล้ว ไม่ส่งซ้ำ
  const found = existing.find((item) => item.referOutNo === data.refer_out_no && [origin, data.hcode_origin].includes(item.originHcode));
  const otherPatient = found && found.originHn !== profile.hn;
  const state = !found
    ? 'ยังไม่มีในรายการ'
    : `มีแล้ว — ${STATUS_TEXT[found.status] ?? found.status}${otherPatient ? ` · เลขนี้เป็นของ ${found.patientName} (${found.originHn})` : ''}`;
  return { file, data, found, name: `${profile.title_name}${profile.first_name} ${profile.last_name}`, state };
});

console.log(`ต้นทางที่จะส่ง: ${origin}`);
console.log(`รายการของ Cortex SBH Prod: ${existing.length} รายการ · รอรับ ${existing.filter((item) => item.status === 'deliver').length}`);
for (const row of rows) {
  const { data } = row;
  const sendDate = row.found ? '' : ` · วันที่ Refer ที่จะส่ง ${(keepDate ? data : shiftToNow(data)).refer_date}`;
  console.log(`${data.refer_out_no} | ประเภท ${data.patient_type} ฉุกเฉิน ${data.emergency} ${data.opd_or_ipd} | ${row.name} | ${data.initial_diagnosis[0]?.icd10 ?? '-'} | ${row.state}${sendDate}`);
}

// หลังเรียก fetch แล้วไม่ใช้ process.exit() — Node บน Windows พังด้วย "Assertion failed … async.c" ให้จบเองด้วย exitCode
const targets = rows.filter((row) => !row.found);
if (!confirm) console.log(`\nยังไม่ได้ส่ง (ไม่มี --confirm) · ส่งได้ ${targets.length} ไฟล์`);
else if (!targets.length) {
  console.error('ไม่มีไฟล์ที่ส่งได้ (เลขที่เลือกมีในรายการแล้วทั้งหมด)');
  process.exitCode = 1;
}

for (const row of confirm ? targets : []) {
  const data = keepDate ? structuredClone(row.data) : shiftToNow(row.data);
  // MOPH บังคับ medical_coverage.no (400 "medical_coverage.no is require") แต่หลายไฟล์เว้นว่าง → ใส่เลขสมมติแบบเดียวกับที่ผู้ใช้ใส่ตอนยิง 0022/69 เอง
  if (!data.medical_coverage.no) data.medical_coverage.no = COVERAGE_NO;
  data.hcode_origin = origin;
  // เตรียม header ใหม่ทุกราย — token ของ Keycloak อายุแค่ 5 นาที
  const res = await fetch(REFER_URL, { method: 'POST', headers: await mophHeaders(), body: JSON.stringify(data) });
  const text = (await res.text()).slice(0, 500);
  console.log(`${res.ok ? '✓' : '✗'} ${data.refer_out_no} ${row.name} · ต้นทาง ${data.hcode_origin} · วันที่ Refer ${data.refer_date} → ${res.status} ${text}`);
  if (res.ok) {
    if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '# Refer ที่ส่งไป MOPH Refer UAT\n\n| ส่งเมื่อ | เลข Refer | วันที่ Refer | ผู้ป่วย | เลขบัตร | ไฟล์ | ผล |\n|---|---|---|---|---|---|---|\n');
    fs.appendFileSync(LOG_FILE, `| ${formatThai(Date.now())} | ${data.refer_out_no} | ${data.refer_date} | ${row.name} | ${data.patient.profile.cid} | ${row.file} | ต้นทาง ${data.hcode_origin} · ${res.status} ${text.replace(/\|/g, '/').slice(0, 120)} |\n`);
  } else {
    process.exitCode = 1;
    // token ใช้ไม่ได้ = ไฟล์ถัดไปก็ไม่ผ่านเหมือนกัน
    if (res.status === 401 || res.status === 403) break;
  }
}
