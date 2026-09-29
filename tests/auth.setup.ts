import { test as setup } from '@playwright/test';
import { ROLES_IN_USE, authFile, getCredentials } from '../utils/env';
import { isSessionAlive } from '../utils/session';

// เตรียม session ของทุก role ใน ROLES_IN_USE (utils/env.ts) ครั้งเดียวต่อรอบ → .auth/<Role>.json
// session เดิมยังไม่หมดอายุ → ใช้ต่อ ไม่ล็อกอินใหม่ (ผู้ใช้สั่ง 26 ก.ย. 2026 เพื่อลดเวลา)
for (const role of ROLES_IN_USE) {
  // ขอ context ไม่ใช่ page: รอบที่ใช้ session เดิมไม่เปิดหน้าเว็บเลย (ไม่งั้นได้วิดีโอจอขาวเปล่า)
  // รอบที่ล็อกอินจริงเปิดหน้าจาก context นี้ → มีวิดีโอขั้นล็อกอินในรายงานเหมือนเทสอื่น (R14)
  setup(`ล็อกอิน ${role}`, async ({ context }) => {
    const { username, password } = getCredentials(role);
    const baseURL = setup.info().project.use.baseURL!;

    if (await isSessionAlive(authFile(role), baseURL)) {
      setup.info().annotations.push({ type: 'session', description: 'ใช้ session เดิม (ยังไม่หมดอายุ) — ไม่ได้เปิดหน้าเว็บ จึงไม่มีวิดีโอ' });
      console.log(`${role}: ใช้ session เดิม`);
      return;
    }
    setup.info().annotations.push({ type: 'session', description: 'ล็อกอินใหม่ (ดูวิดีโอได้ในรายงาน)' });

    // ยังไม่ล็อกอิน → แอปพาไปหน้า /cortex/welcome (ใช้เวลา ~11 วินาที) → ปุ่มพาไปหน้า Sign in ของ Keycloak
    const page = await context.newPage();
    await page.goto('/cortex/apps');
    await page.getByRole('button', { name: 'ลงชื่อเข้าใช้' }).click({ timeout: 30_000 });
    await page.locator('#username').fill(username);
    // บันทึกขั้นล็อกอินได้ตามปกติแล้ว (R14) แต่ยังใส่รหัสด้วย evaluate —
    // ถ้าใช้ fill()/type() ชื่อ step ในรายงานจะเป็น Fill "<รหัสผ่าน>" ทุกรอบที่ล็อกอิน
    await page.locator('#password').evaluate((el, value) => {
      (el as HTMLInputElement).value = value;
    }, password);
    await page.locator('#kc-login').click();

    try {
      await page.waitForURL((url) => url.host === new URL(baseURL).host, { timeout: 30_000 });
    } catch {
      const kcError = await page
        .locator('#input-error, .pf-v5-c-alert__title')
        .first()
        .textContent({ timeout: 2_000 })
        .catch(() => null);
      throw new Error(
        `ล็อกอิน ${role} ไม่สำเร็จ${kcError ? `: ${kcError.trim()}` : ''} — ` +
          `ตรวจ CORTEX_USERNAME_${role} / CORTEX_PASSWORD_${role} ในไฟล์ .env`,
      );
    }

    await context.storageState({ path: authFile(role) });
    console.log(`${role}: ล็อกอินใหม่แล้ว`);
  });
}
