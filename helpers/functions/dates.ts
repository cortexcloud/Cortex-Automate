// วันที่สำหรับกรอก / เทียบในฟอร์มของแอป — รวมจากสเปก Refill (24 ต.ค. 2026)

/**
 * วันที่ (เวลาเครื่อง) + n วัน →
 * iso `2026-10-26` (ช่องวันที่ของห้องยา / ช่องค้นหา) · be `2569-10-26` (ปฏิทินหน้าต่าง Refill · ช่องวันที่แท็บ Order เติมยา)
 * · th `26/10/2569` (ตารางของแอป) · month = เดือน 0–11 · date = Date ตัวเต็ม
 */
export function dayPlus(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return {
    iso: `${d.getFullYear()}-${mm}-${dd}`,
    be: `${d.getFullYear() + 543}-${mm}-${dd}`,
    th: `${dd}/${mm}/${d.getFullYear() + 543}`,
    month: d.getMonth(),
    date: d,
  };
}
