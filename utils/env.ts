import path from 'node:path';

const USERNAME_PREFIX = 'CORTEX_USERNAME_';

/** role ตั้งต้นของเทส — ผู้ใช้สั่ง 26 ก.ย. 2026: ช่วงสร้าง Test Case ใช้ Super User ไปก่อน */
export const DEFAULT_ROLE = 'Super_User';

/** role ที่ setup เตรียม session ให้ — เทสไหนใช้ role อื่น ต้องเพิ่มชื่อ role ที่นี่ด้วย */
export const ROLES_IN_USE: string[] = [DEFAULT_ROLE];

/** role ที่กรอก user ไว้ใน .env (คู่ CORTEX_USERNAME_<Role> / CORTEX_PASSWORD_<Role>) เช่น Super_User, Doctor, Nurse */
export function listRoles(): string[] {
  return Object.keys(process.env)
    .filter((key) => key.startsWith(USERNAME_PREFIX) && key.length > USERNAME_PREFIX.length)
    .filter((key) => process.env[key]?.trim())
    .map((key) => key.slice(USERNAME_PREFIX.length));
}

/** session หลังล็อกอินของ role (มี cookie ของ Keycloak) — ไม่ขึ้น git และห้ามเปิดอ่าน/แนบไปที่ไหน */
export function authFile(role: string): string {
  return path.join(__dirname, '..', '.auth', `${role}.json`);
}

/** อ่าน user/pass ของ role จาก .env — ห้ามพิมพ์ค่าเหล่านี้ออก console/report */
export function getCredentials(role: string): { username: string; password: string } {
  const username = process.env[`${USERNAME_PREFIX}${role}`]?.trim() ?? '';
  const password = process.env[`CORTEX_PASSWORD_${role}`] ?? '';
  if (!username || !password) {
    const missing = !username ? `CORTEX_USERNAME_${role}` : `CORTEX_PASSWORD_${role}`;
    throw new Error(
      `ไม่พบ ${missing} ในไฟล์ .env (role ที่มี: ${listRoles().join(', ') || '-'}) — ` +
        `ต้องกรอกเป็นคู่ CORTEX_USERNAME_<Role> / CORTEX_PASSWORD_<Role> ชื่อ role ตรงกัน ` +
        `(ถ้ามีบรรทัดชื่อซ้ำ ระบบใช้บรรทัดล่างสุด · ดู .env.example)`,
    );
  }
  return { username, password };
}
