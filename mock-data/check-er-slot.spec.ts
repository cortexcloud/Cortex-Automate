import { gotoErDashboard, openTriagePage, selectExistingPatient } from '../helpers/functions/er';
import { trackAuthorization } from '../helpers/functions/er-report';
import { expect, test } from './fixtures';
import { SYSTEM } from './uat-er';

// ตรวจก่อนรันข้อที่ต้องเปิด Visit ER ใหม่ (อ่านอย่างเดียว — ไม่กดยืนยันเปิด Visit):
//   SLOT_HN=<HN ของผู้ป่วยที่ไม่มี Visit ค้าง>   เปิดหน้าต่าง "เปิด Visit ER" ดูว่าแถวเข้ารับบริการขึ้น "ไม่พบเวลาที่สามารถลงได้" ไหม แล้วกดยกเลิก
//   CHECK_HNS=<HN,HN>                            พิมพ์ Encounter ของผู้ป่วยแต่ละราย (ไว้ดูว่า Visit ของผู้ป่วย Mock ยังเปิดอยู่ไหม)
// SBH Prod ช่วงกลางคืนเปิด Visit ER ได้ไม่กี่รายแล้วแพทย์ขึ้น "(Full)" (เจอ 3 และ 5 ต.ค. 2026)
test(`ตรวจช่องเวลาเปิด Visit ER (${SYSTEM})`, async ({ page }) => {
  test.setTimeout(240_000); // SBH Prod เปิดหน้า Dashboard ช้าเป็นพักๆ
  const authorization = trackAuthorization(page);
  await expect(async () => void (await gotoErDashboard(page))).toPass({ timeout: 150_000 });

  for (const hn of (process.env.CHECK_HNS ?? '').split(',').filter(Boolean)) {
    const res = await page.request.get(`/generated-emr-api/encounters?filter[hn][equals]=${hn}&perPage=20`, { headers: { authorization: authorization() } });
    const { data } = (await res.json()) as { data: Record<string, unknown>[] };
    console.log(`    HN ${hn}: ${data.map((e) => `${e.en} clinic ${e.clinicId} ${e.latestStatusCode}`).join(' | ') || '(ไม่มี Encounter)'}`);
  }

  const hn = process.env.SLOT_HN;
  if (!hn) return;
  await openTriagePage(page);
  // SLOT_API=1: พิมพ์ชื่อ API ที่หน้าต่างเปิด Visit เรียก · SLOT_API=<คำค้น> พิมพ์คำตอบของ API ที่ชื่อตรงคำค้นด้วย (ไว้ดูว่าทำไมไม่มีเวลาให้ลง)
  // ไม่พิมพ์คำตอบทุกตัว เพราะบางตัว (รายชื่อแพทย์ / ผู้ป่วย) มีข้อมูลส่วนบุคคล
  const calls: Promise<string>[] = [];
  if (process.env.SLOT_API) {
    const wanted = process.env.SLOT_API === '1' ? undefined : new RegExp(process.env.SLOT_API, 'i');
    page.on('response', (res) => {
      const url = new URL(res.url());
      if (!/api/.test(url.pathname)) return;
      const name = `${res.request().method()} ${url.pathname} ${(res.request().postData() ?? '').match(/(query|mutation)\s+\w+/)?.[0] ?? ''}`.trim();
      if (!wanted?.test(name)) return void calls.push(Promise.resolve(`${name} → ${res.status()}`));
      const variables = (res.request().postData() ?? '').match(/"variables":\{.*\}/)?.[0].slice(0, 400) ?? '';
      calls.push(res.text().then((text) => `${name}${decodeURIComponent(url.search)} ${variables} → ${res.status()} ${text.replace(/\s+/g, ' ').replace(/"(idCard|userId)":"[^"]*"/g, '"$1":"…"').slice(0, 2500)}`, () => `${name} → ${res.status()}`));
    });
  }
  // SLOT_AT=<เวลา ISO,เวลา ISO>: ถามระบบซ้ำด้วยคำถามเดียวกับที่หน้าต่างใช้ (query SuggestWalkInPhysicianSlot — อ่านอย่างเดียว) ว่าเวลานั้นมีช่วงให้ลงไหม
  const suggested = page.waitForRequest((req) => (req.postData() ?? '').includes('SuggestWalkInPhysicianSlot'), { timeout: 60_000 });
  suggested.catch(() => undefined);
  const dialog = await selectExistingPatient(page, hn);
  if (process.env.SLOT_AT) {
    const body = JSON.parse((await suggested).postData() ?? '{}') as { variables: { input: { clinicId: number; datetime: string } } };
    for (const datetime of [body.variables.input.datetime, ...process.env.SLOT_AT.split(',')]) {
      body.variables.input.datetime = datetime;
      const res = await page.request.post('/cortex-api/graphql', { headers: { authorization: authorization() }, data: body });
      const { data } = (await res.json()) as { data?: { suggestWalkInPhysicianSlot?: { practitioner: { display: string }; suggestedSlot: { start: string; end: string; isOverbook: boolean } | null }[] } };
      const local = (iso: string) => new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
      const slots = (data?.suggestWalkInPhysicianSlot ?? []).map((s) => `${s.practitioner.display}: ${s.suggestedSlot ? `${local(s.suggestedSlot.start)} – ${local(s.suggestedSlot.end)}${s.suggestedSlot.isOverbook ? ' (เกินจำนวนรับแล้ว)' : ''}` : 'ไม่มีช่วงเวลา'}`);
      console.log(`    ถามช่วงเวลา ณ ${local(datetime)}: ${slots.join(' | ') || '(ไม่มีแพทย์ออกตรวจ)'}`);
    }
  }
  const row = dialog.getByRole('row').filter({ hasText: 'Walk-in' }).first();
  await expect(row).toBeVisible();
  // คำเตือนขึ้นตามหลังแถวเล็กน้อย
  const full = await dialog.getByText('ไม่พบเวลาที่สามารถลงได้').waitFor({ state: 'visible', timeout: 6_000 }).then(() => true, () => false);
  console.log(`    แถวเข้ารับบริการ: ${(await row.innerText()).replace(/\s+/g, ' ')}`);
  console.log(`    เปิด Visit ER ตอนนี้: ${full ? 'ไม่ได้ — ไม่พบเวลาที่สามารถลงได้' : 'ได้'}`);
  for (const call of await Promise.all(calls)) console.log(`    API: ${call}`);
  await dialog.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(dialog).toBeHidden();
});
