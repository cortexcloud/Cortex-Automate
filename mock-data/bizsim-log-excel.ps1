# ลงผล BizSim ผ่าน Excel ที่เปิดไฟล์อยู่ (ไฟล์ถูกล็อก เขียนตรงไม่ได้) — ใช้คู่กับ bizsim-log.mjs --emit
#   node mock-data/bizsim-log.mjs --emit=.cache/bizsim-edits.json
#   powershell -NoProfile -File mock-data/bizsim-log-excel.ps1 -Edits .cache/bizsim-edits.json
# เขียนค่าลงเซลล์ของ workbook ที่เปิดอยู่ แล้วกดบันทึก — หยุดถ้า workbook มีงานที่ยังไม่บันทึก (ไม่ปนกับงานของผู้ใช้)
param(
  [Parameter(Mandatory = $true)][string]$Edits,
  # ชื่อใน Excel ของไฟล์บน OneDrive แปลง # เป็น ^N (New file Test case OPD ^N2.xlsx) → จับด้วย -like
  [string]$Workbook = '*Test case OPD*2.xlsx'
)
$ErrorActionPreference = 'Stop'
$xl = [Runtime.InteropServices.Marshal]::GetActiveObject('Excel.Application')
$wb = $null
foreach ($w in $xl.Workbooks) { if ($w.Name -like $Workbook) { $wb = $w } }
if (-not $wb) { throw "Excel ไม่ได้เปิด $Workbook" }
if (-not $wb.Saved) { throw "$Workbook มีงานที่ยังไม่บันทึก — บันทึกก่อนแล้วรันใหม่" }
$data = Get-Content -Raw -Encoding UTF8 $Edits | ConvertFrom-Json
$count = 0
foreach ($sheetProp in $data.PSObject.Properties) {
  $ws = $wb.Worksheets.Item($sheetProp.Name)
  foreach ($cell in $sheetProp.Value.PSObject.Properties) {
    if ([string]::IsNullOrEmpty($cell.Value)) { $ws.Range($cell.Name).ClearContents() | Out-Null }
    else { $ws.Range($cell.Name).Value2 = [string]$cell.Value }
    $count++
  }
}
$wb.Save()
"เขียน $count เซลล์ แล้วบันทึก $($wb.FullName)"
