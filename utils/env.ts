import fs from 'node:fs';
import path from 'node:path';

const USERNAME_PREFIX = 'CORTEX_USERNAME_';
const ROOT = path.join(__dirname, '..');

/** role ตั้งต้นของเทส — ผู้ใช้สั่ง 26 ก.ย. 2026: ช่วงสร้าง Test Case ใช้ Super User ไปก่อน */
export const DEFAULT_ROLE = 'Super_User';

/** role ที่ setup เตรียม session ให้ — เทสไหนใช้ role อื่น ต้องเพิ่มชื่อ role ที่นี่ด้วย */
export const ROLES_IN_USE: string[] = [DEFAULT_ROLE, 'Doctor']; // Doctor: แพทย์เฉพาะทางที่ตอบ Consult ใน mock-data/UAT-ER-play.spec.ts

/** host ของ SBH Prod (รพ.สระบุรี) — ใช้ได้เฉพาะสคริปต์ใน mock-data/ และเทสการ์ดที่อยู่ในรายการของ playwright.sbh-prod.cards.config.ts */
export const SBH_PROD_HOST = 'cortex.srbrhospital.com';

/**
 * ชื่อระบบที่กำลังรัน — ไม่มี = dev-x (ค่าตั้งต้น) · 'sbh-prod' = SBH Prod (ตั้งโดย playwright.sbh-prod.config.ts เท่านั้น)
 * แต่ละระบบมีไฟล์ .env และโฟลเดอร์ session ของตัวเอง ไม่ปนกัน
 */
export function envName(): string | undefined {
  return process.env.CORTEX_ENV || undefined;
}

/** ไฟล์ user/pass ของระบบที่กำลังรัน: `.env` (dev-x) หรือ `.env.<ชื่อระบบ>` */
export function envFile(): string {
  const name = envName();
  return path.join(ROOT, name ? `.env.${name}` : '.env');
}

/**
 * เลือกระบบ + โหลดไฟล์ .env ของระบบนั้น แล้วคืน BASE_URL — เรียกจากไฟล์ config เท่านั้น (worker โหลด config ซ้ำ จึงได้ค่าเดียวกัน)
 * ค่าที่มีใน environment อยู่แล้วจะไม่ถูกทับ · BASE_URL ต้องตรงกับระบบที่เลือก กันยิงเทสผิดระบบ
 */
export function loadEnv(name?: string): string {
  if (name) process.env.CORTEX_ENV = name;
  else delete process.env.CORTEX_ENV;

  const file = envFile();
  if (fs.existsSync(file)) process.loadEnvFile(file);
  else if (name) throw new Error(`ไม่พบไฟล์ ${path.basename(file)} — คัดลอก ${path.basename(file)}.example แล้วกรอกค่าเอง`);

  const baseURL = process.env.BASE_URL || 'https://dev-x.cortexcloud.co';
  const isProd = new URL(baseURL).host === SBH_PROD_HOST;
  if (name === 'sbh-prod' && !isProd) throw new Error(`BASE_URL ใน ${path.basename(file)} ต้องเป็น https://${SBH_PROD_HOST} (ตอนนี้ ${baseURL})`);
  if (name !== 'sbh-prod' && isProd) {
    throw new Error(`BASE_URL ชี้ไป SBH Prod (${baseURL}) — เทสการ์ดรันกับ dev-x เท่านั้น · สคริปต์ Mock Data ของ SBH Prod ใช้ playwright.sbh-prod.config.ts`);
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
      `ไม่พบ ${missing} ในไฟล์ ${path.basename(envFile())} (role ที่มี: ${listRoles().join(', ') || '-'}) — ` +
        `ต้องกรอกเป็นคู่ CORTEX_USERNAME_<Role> / CORTEX_PASSWORD_<Role> ชื่อ role ตรงกัน ` +
        `(ถ้ามีบรรทัดชื่อซ้ำ ระบบใช้บรรทัดล่างสุด · ดู .env.example)`,
    );
  }
  return { username, password };
}
