// สร้างเตียง SBHAUTO บน SBH Prod ด้วย graphql CreateBed (ผู้ใช้สั่ง 6 พ.ย. 2026 "สร้างเตียงทิ้งไว้สัก 20 เตียง" → SBHAUTO-01–20 id 67–86) · รัน: npx playwright test -c playwright.sbh-prod.config.ts --grep @BEDS-PROD --no-deps --project=chrome
// หน้าตั้งค่าเตียงของ Prod เลือก Ward ไม่ได้ → ใช้ค่าชุดเดียวกับเตียง Sur1 (wardId 1 หออายุรกรรม ชาย · roomId 1 ห้อง 101 · bedTypeId 1 สามัญ)
// ชื่อที่มีอยู่แล้วข้าม · BED_FROM / BED_TO
import { expectOk, gotoErDashboard } from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { test } from './fixtures';

test('สร้างเตียง SBHAUTO บน SBH Prod', { tag: ['@BEDS-PROD'] }, async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const authorization = trackAuthorization(page);
  await gotoErDashboard(page);
  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const res = await page.request.post('/cortex-api/graphql', { headers: { authorization: authorization() }, data: { query, variables } });
    await expectOk(res, 'graphql');
    return (await res.json()) as { data?: Record<string, any>; errors?: { message: string }[] };
  };
  const existing = new Set(((await gql('{ bedSetupBeds(filter: { includeInactive: true }) { name } }')).data?.bedSetupBeds ?? []).map((b: { name: string }) => b.name));
  const from = Number(process.env.BED_FROM ?? 3);
  const to = Number(process.env.BED_TO ?? 20);
  for (let i = from; i <= to; i++) {
    const name = `SBHAUTO-${String(i).padStart(2, '0')}`;
    if (existing.has(name)) {
      console.log(`${name}: มีอยู่แล้ว ข้าม`);
      continue;
    }
    const c = await gql('mutation CreateBed($input: CreateBedInput!) { createBed(input: $input) { id name } }', {
      input: { wardId: 1, roomId: 1, bedTypeId: 1, name, status: 'available', remark: 'สำหรับผู้ป่วย AUTO (Cortex Automate)' },
    });
    console.log(`${name}: ${c.errors?.length ? `ไม่สำเร็จ ${c.errors.map((x) => x.message).join(' / ')}` : `สร้างแล้ว id ${c.data?.createBed?.id}`}`);
  }
  const after = ((await gql('{ bedSetupBeds(filter: { includeInactive: true }) { name active detail { status } } }')).data?.bedSetupBeds ?? []) as { name: string; active: boolean; detail: { status: string } }[];
  const auto = after.filter((b) => b.name.startsWith('SBHAUTO-'));
  console.log(`รวมเตียงทั้งระบบ ${after.length} · SBHAUTO ${auto.length} เตียง (ว่าง ${auto.filter((b) => b.detail.status === 'available' && b.active).length})`);
});
