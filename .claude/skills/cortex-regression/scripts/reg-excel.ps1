# เปิดไฟล์ Regression ด้วย Excel (ซ่อนหน้าต่าง) ให้คำนวณสูตรใหม่ทั้งไฟล์ แล้วอ่านค่าหลักของ Dashboard
# -Save = บันทึกกลับ (ค่าที่ cache ไว้ใหม่แล้ว → Grand Dashboard ที่ link ไฟล์นี้เห็นผลล่าสุด) — ใช้หลัง reg-write.mjs ทุกครั้ง
# ใช้ (PowerShell): & ".claude\skills\cortex-regression\scripts\reg-excel.ps1" -File "Regression\SBH_Regression_v2.8.0.xlsx" [-Save]
# ต้องปิดไฟล์นี้ใน Excel ของผู้ใช้ก่อน (เปิดซ้อนจะได้สำเนาอ่านอย่างเดียว)
param(
  [Parameter(Mandatory = $true)][string]$File,
  [switch]$Save
)
$path = (Resolve-Path $File).Path
# Excel เพิ่งเปิด / กำลังคำนวณ จะปฏิเสธคำสั่ง (RPC_E_CALL_REJECTED) — ลองใหม่ทุก 1 วินาที สูงสุด 60 ครั้ง
function Invoke-Retry([scriptblock]$Action) {
  for ($i = 0; ; $i++) {
    try { return & $Action }
    catch { if ($i -ge 60 -or $_.Exception.Message -notmatch '0x8001010A|0x80010001') { throw }; Start-Sleep -Seconds 1 }
  }
}
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
try {
  $wb = Invoke-Retry { $xl.Workbooks.Open($path, 0, -not $Save) }
  if ($Save -and $wb.ReadOnly) { throw "ไฟล์เปิดอยู่ที่อื่น (ได้แบบอ่านอย่างเดียว) — ปิด Excel / รอ OneDrive แล้วรันใหม่" }
  Invoke-Retry { $xl.CalculateFull() }
  $d = $wb.Worksheets.Item("Dashboard")
  $feed = $wb.Worksheets.Item("Dashboard Feed")
  $plan = $wb.Worksheets.Item("Regression Plan")
  "Release Decision : " + $d.Range("B10").Text
  "Risk Level       : " + $feed.Range("P11").Text + " — " + $feed.Range("P12").Text
  "Overall Verdict  : " + $d.Range("D12").Text
  "E2E / Cards / TC : " + $d.Range("K21").Text + " / " + $d.Range("K22").Text + " / " + $d.Range("K23").Text
  "เกณฑ์ผ่าน (ข้อ 9): " + $plan.Range("E83").Text
  "Env Sign-off     : " + $feed.Range("P38").Text
  $last = $feed.Range("P8").Value2
  "Last Executed    : " + $(if ($last -is [double]) { [DateTime]::FromOADate($last).ToString("yyyy-MM-dd") } else { $last })
  "Charts           : " + $d.ChartObjects().Count
  if ($Save) { $wb.Save(); "✓ บันทึกแล้ว (Excel คำนวณใหม่ทั้งไฟล์)" }
  $wb.Close($false)
}
finally {
  $xl.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
