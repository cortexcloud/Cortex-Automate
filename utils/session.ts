import { request } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ENV_FILE = path.join(__dirname, '..', '.env');

/**
 * session เดิมของ role ยังใช้ได้ไหม — ถาม Keycloak ตรงๆ แบบ prompt=none (~1 วินาที ไม่ต้องเปิดหน้าแอป)
 * แก้ .env หลังเก็บ session (เช่น เปลี่ยน user) = ใช้ไม่ได้ ต้องล็อกอินใหม่
 */
export async function isSessionAlive(stateFile: string, baseURL: string): Promise<boolean> {
  if (!fs.existsSync(stateFile)) return false;
  if (fs.existsSync(ENV_FILE) && fs.statSync(ENV_FILE).mtimeMs > fs.statSync(stateFile).mtimeMs) return false;

  const ctx = await request.newContext({ storageState: stateFile });
  try {
    // ค่า Keycloak อ่านจาก env.js ของแอป (เปิดสาธารณะ) — เปลี่ยน BASE_URL แล้วยังถูกต้อง
    const envJs = await (await ctx.get(`${baseURL}/cortex/environment/env.js`)).text();
    const pick = (key: string) => envJs.match(new RegExp(`env\\.${key}\\s*=\\s*'([^']+)'`))?.[1];
    const [kcUrl, realm, clientId] = [pick('KEYCLOAK_URL'), pick('KEYCLOAK_REALM'), pick('KEYCLOAK_CLIENT_ID')];
    if (!kcUrl || !realm || !clientId) return false;

    const verifier = crypto.randomBytes(32).toString('base64url');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${baseURL}/cortex/apps`,
      response_type: 'code',
      scope: 'openid',
      prompt: 'none',
      state: crypto.randomUUID(),
      code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    const res = await ctx.get(`${kcUrl}/realms/${realm}/protocol/openid-connect/auth?${params}`, { maxRedirects: 0 });
    // session ยังอยู่ → redirect กลับพร้อม code · หมดอายุ → redirect พร้อม error=login_required
    return res.status() === 302 && /[?&#]code=/.test(res.headers()['location'] ?? '');
  } catch {
    return false;
  } finally {
    await ctx.dispose();
  }
}
