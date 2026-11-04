import { expectOk, gotoErDashboard } from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { test } from './fixtures';

// สคริปต์ชั่วคราว: ยกเลิกคำขอ Admit ของผู้ป่วย "รอเตียง" ที่ปิด Visit ที่การเงินแล้วแต่ยังค้างบน ER Board (dev-x · ผู้ใช้สั่ง 2 พ.ย. 2026)
// CANCEL_ADMIT_CONFIRM=1 = ยกเลิกจริง · ไม่ใส่ = อ่านสถานะอย่างเดียว · CANCEL_ADMIT_INTROSPECT=1 = ดูโครงสร้าง graphql
const CONFIRM = process.env.CANCEL_ADMIT_CONFIRM === '1';
const INTROSPECT = process.env.CANCEL_ADMIT_INTROSPECT === '1';
const REASON = 'ล้างข้อมูลทดสอบ — ปิด Visit แล้ว (QA Automate)';

type Row = { en: string; hn: string; vn: string; patientStatus: string; latestStatusCode: string; admitRequestStatus?: string | null; an?: string | null; patient?: { firstName: string; familyName?: string | null } };

test('ยกเลิกคำขอ Admit ของผู้ป่วยรอเตียงบน ER Board', async ({ page }) => {
  test.setTimeout(30 * 60_000);
  const authorization = trackAuthorization(page);
  await gotoErDashboard(page);
  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const res = await page.request.post('/cortex-api/graphql', { headers: { authorization: authorization() }, data: { query, variables } });
    await expectOk(res, 'graphql');
    return (await res.json()) as { data?: Record<string, any>; errors?: { message: string }[] };
  };

  if (INTROSPECT) {
    const q = await gql(`{ __schema { queryType { fields { name args { name type { name kind ofType { name kind } } } type { name kind ofType { name kind } } } } mutationType { fields { name args { name type { name kind ofType { name kind } } } type { name kind ofType { name kind } } } } } }`);
    const pick = (list: any[]) => list.filter((f) => /admitrequest/i.test(f.name));
    console.log(JSON.stringify({ q: pick(q.data!.__schema.queryType.fields), m: pick(q.data!.__schema.mutationType.fields) }, null, 1));
    const t = await gql(`{ __type(name: "AdmitRequest") { fields { name type { name kind ofType { name kind } } } } }`);
    console.log(JSON.stringify(t.data, null, 1));
    return;
  }

  const res = await page.request.get('/cortex-api/er/dashboard/encounters?scope=current_queue', { headers: { authorization: authorization() } });
  await expectOk(res, 'อ่านบอร์ด ER');
  const rows = ((await res.json()) as Row[]).filter((e) => e.patientStatus === 'bed_waiting' && !['cancelled', 'entered-in-error'].includes(e.latestStatusCode));
  console.log(`ผู้ป่วยรอเตียงบนบอร์ด ${rows.length} ราย`);
  for (const [i, e] of rows.entries()) {
    const name = [e.patient?.firstName, e.patient?.familyName].filter(Boolean).join(' ');
    const r = await gql('query Q($en: String!) { latestPatientAdmitRequest(en: $en) { id latestStatusCode } }', { en: e.en });
    const req = r.data?.latestPatientAdmitRequest;
    let result = 'อ่านอย่างเดียว';
    if (CONFIRM) {
      if (!req?.id || !['requested', 'drafted'].includes(req.latestStatusCode)) result = `ข้าม (สถานะคำขอ ${req?.latestStatusCode ?? 'ไม่มี'})`;
      else {
        const c = await gql('mutation C($id: Int!, $input: CancelPatientAdmitRequestInput!) { cancelPatientAdmitRequest(id: $id, input: $input) { id latestStatusCode } }', { id: req.id, input: { reason: REASON } });
        result = c.errors?.length ? `ไม่สำเร็จ: ${c.errors.map((x) => x.message).join(' / ')}` : `ยกเลิกแล้ว → ${c.data?.cancelPatientAdmitRequest?.latestStatusCode}`;
      }
    }
    console.log(`${i + 1}. ${name} · HN ${e.hn} · ${e.en} · ER ${e.latestStatusCode} · admit ${e.admitRequestStatus ?? '-'} · AN ${e.an ?? '-'} · request ${req?.id ?? '-'}/${req?.latestStatusCode ?? '-'}${r.errors ? ' · ERR ' + r.errors[0].message : ''} → ${result}`);
  }
});
