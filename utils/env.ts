import fs from 'node:fs';
import path from 'node:path';

const USERNAME_PREFIX = 'CORTEX_USERNAME_';
const ROOT = path.join(__dirname, '..');

/** role ตั้งต้นของเทส — ผู้ใช้สั่ง 26 ก.ย. 2026: ช่วงสร้าง Test Case ใช้ Super User ไปก่อน */
export const DEFAULT_ROLE = 'Super_User';

/** role ที่ setup เตรียม session ให้ — เทสไหนใช้ role อื่น ต้องเพิ่มชื่อ role ที่นี่ด้วย */
export const ROLES_IN_USE: string[] = [DEFAULT_ROLE, 'Doctor', 'Admin', 'Nurse']; // Doctor: แพทย์เฉพาะทางที่ตอบ Consult ใน mock-data/UAT-ER-play.spec.ts · Nurse: พยาบาล ER กดปุ่มงานพยาบาลใน Order Summary (SBH-3158)

/** host ของ SBH Prod (รพ.สระบุรี) — ใช้ได้เฉพาะสคริปต์ใน mock-data/ และเทสการ์ดที่อยู่ในรายการของ playwright.sbh-prod.cards.config.ts */
export const SBH_PROD_HOST = 'cortex.srbrhospital.com';

/**
 * host ของ SBH Dev — clone ข้อมูล + user มาจาก SBH Prod (Smoke Test 29 ต.ค. 2026 · ผู้ใช้ยืนยัน) แต่ Keycloak แยกตัว (id-cortex-dev.srbrhospital.com)
 * จึงใช้ user/pass ชุดเดียวกับ `.env.sbh-prod` ได้ แต่ session ต้องแยกโฟลเดอร์ (.auth/sbh-dev/)
 */
export const SBH_DEV_HOST = 'cortex-dev.srbrhospital.com';

/**
 * ระบบที่ต้องเลือกผ่าน config ของตัวเอง (ชื่อ = ชื่อไฟล์ `.env.<ชื่อ>` + โฟลเดอร์ session / ผลรัน)
 * - `host` — BASE_URL ต้องเป็น host นี้ กันยิงเทสผิดระบบ
 * - `usersFrom` — ยืม user/pass จากไฟล์ .env ของระบบอื่น (ไฟล์ `.env.<ชื่อ>` ไม่ต้องมี · ถ้ามีและกรอก role ไว้ ค่าในไฟล์นั้นชนะ)
 */
const SYSTEMS: Record<string, { host: string; usersFrom?: string }> = {
  'sbh-prod': { host: SBH_PROD_HOST },
  'sbh-dev': { host: SBH_DEV_HOST, usersFrom: '.env.sbh-prod' },
};

/**
 * ชื่อระบบที่กำลังรัน — ไม่มี = dev-x (ค่าตั้งต้น) · 'sbh-dev' = SBH Dev (playwright.sbh-dev*.config.ts) ·
 * 'sbh-prod' = SBH Prod (ตั้งโดย playwright.sbh-prod*.config.ts เท่านั้น) — แต่ละระบบมีไฟล์ .env และโฟลเดอร์ session ของตัวเอง ไม่ปนกัน
 */
export function envName(): string | undefined {
  return process.env.CORTEX_ENV || undefined;
}

/** ไฟล์ user/pass ของระบบที่กำลังรัน: `.env` (dev-x) หรือ `.env.<ชื่อระบบ>` */
export function envFile(): string {
  const name = envName();
  return path.join(ROOT, name ? `.env.${name}` : '.env');
}

/** ไฟล์ .env ทุกไฟล์ที่ระบบนี้อ่าน (sbh-dev = `.env.sbh-dev` ถ้ามี + `.env.sbh-prod`) — แก้ไฟล์ไหนก็ต้องล็อกอินใหม่ */
export function envFiles(): string[] {
  const name = envName();
  const files = [envFile()];
  const usersFrom = name ? SYSTEMS[name]?.usersFrom : undefined;
  if (usersFrom) files.push(path.join(ROOT, usersFrom));
  return files.filter((file) => fs.existsSync(file));
}

/** ชื่อไฟล์ .env ที่ระบบนี้อ่าน สำหรับข้อความ error เช่น ".env.sbh-dev / .env" */
export function envFileLabel(): string {
  return envFiles().map((file) => path.basename(file)).join(' / ') || path.basename(envFile());
}

/**
 * เลือกระบบ + โหลดไฟล์ .env ของระบบนั้น แล้วคืน BASE_URL — เรียกจากไฟล์ config เท่านั้น (worker โหลด config ซ้ำ จึงได้ค่าเดียวกัน)
 * ค่าที่มีใน environment อยู่แล้วจะไม่ถูกทับ · BASE_URL ต้องตรงกับระบบที่เลือก กันยิงเทสผิดระบบ
 */
export function loadEnv(name?: string): string {
  if (name && !SYSTEMS[name]) throw new Error(`ไม่รู้จักระบบ "${name}" — ระบบที่มี: dev-x (ไม่ใส่ชื่อ), ${Object.keys(SYSTEMS).join(', ')}`);
  if (name) process.env.CORTEX_ENV = name;
  else delete process.env.CORTEX_ENV;

  const system = name ? SYSTEMS[name] : undefined;
  const file = envFile();
  if (fs.existsSync(file)) process.loadEnvFile(file);
  else if (name && !system?.usersFrom) throw new Error(`ไม่พบไฟล์ ${path.basename(file)} — คัดลอก ${path.basename(file)}.example แล้วกรอกค่าเอง`);

  if (system?.usersFrom) {
    // BASE_URL ต้องตั้งก่อนโหลดไฟล์ของระบบต้นทาง (loadEnvFile ไม่ทับค่าที่มีแล้ว — จึงได้แค่ user/pass)
    process.env.BASE_URL ||= `https://${system.host}`;
    const source = path.join(ROOT, system.usersFrom);
    if (fs.existsSync(source)) process.loadEnvFile(source);
    else if (!fs.existsSync(file)) throw new Error(`ไม่พบไฟล์ ${system.usersFrom} (${name} ยืม user/pass จากไฟล์นี้) และไม่มี ${path.basename(file)}`);
  }

  const baseURL = process.env.BASE_URL || 'https://dev-x.cortexcloud.co';
  const host = new URL(baseURL).host;
  const shown = path.basename(fs.existsSync(file) ? file : path.join(ROOT, system?.usersFrom ?? '.env'));
  if (system && host !== system.host) throw new Error(`BASE_URL ใน ${shown} ต้องเป็น https://${system.host} (ตอนนี้ ${baseURL})`);
  if (!system) {
    if (host === SBH_PROD_HOST) {
      throw new Error(`BASE_URL ชี้ไป SBH Prod (${baseURL}) — เทสการ์ดรันกับ dev-x / SBH Dev · งานบน SBH Prod ใช้ playwright.sbh-prod*.config.ts`);
    }
    if (host === SBH_DEV_HOST) {
      throw new Error(`BASE_URL ชี้ไป SBH Dev (${baseURL}) — ใช้ playwright.sbh-dev.config.ts (npm run test:sbh-dev) เพื่อแยก session จาก dev-x`);
    }
  }
  return baseURL;
}

/** role ที่กรอก user ไว้ใน .env (คู่ CORTEX_USERNAME_<Role> / CORTEX_PASSWORD_<Role>) เช่น Super_User, Doctor, Nurse */
export function listRoles(): string[] {
  return Object.keys(process.env)
    .filter((key) => key.startsWith(USERNAME_PREFIX) && key.length > USERNAME_PREFIX.length)
    .filter((key) => process.env[key]?.trim())
    .map((key) => key.slice(USERNAME_PREFIX.length));
}

/** session หลังล็อกอินของ role (มี cookie ของ Keycloak) — ไม่ขึ้น git และห้ามเปิดอ่าน/แนบไปที่ไหน · ระบบอื่นนอกจาก dev-x แยกโฟลเดอร์ */
export function authFile(role: string): string {
  return path.join(ROOT, '.auth', envName() ?? '', `${role}.json`);
}

/** อ่าน user/pass ของ role จาก .env — ห้ามพิมพ์ค่าเหล่านี้ออก console/report */
export function getCredentials(role: string): { username: string; password: string } {
  const username = process.env[`${USERNAME_PREFIX}${role}`]?.trim() ?? '';
  const password = process.env[`CORTEX_PASSWORD_${role}`] ?? '';
  if (!username || !password) {
    const missing = !username ? `CORTEX_USERNAME_${role}` : `CORTEX_PASSWORD_${role}`;
    throw new Error(
      `ไม่พบ ${missing} ในไฟล์ ${envFileLabel()} (role ที่มี: ${listRoles().join(', ') || '-'}) — ` +
        `ต้องกรอกเป็นคู่ CORTEX_USERNAME_<Role> / CORTEX_PASSWORD_<Role> ชื่อ role ตรงกัน ` +
        `(ถ้ามีบรรทัดชื่อซ้ำ ระบบใช้บรรทัดล่างสุด · ดู .env.example)`,
    );
  }
  return { username, password };
}
