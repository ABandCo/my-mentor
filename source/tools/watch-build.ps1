param([string]$BuildId)
$env:EAS_NO_VCS = "1"
Set-Location "C:\Users\ARPANB~1\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\scratch-workspaces\462f142b-63aa-4fc9-b681-8be5af1ebb96\9e63b580-981f-4d3e-95eb-6b9c742eec91\scratch-2026-10-17-45b6dc\my-mentor"
$deadline = (Get-Date).AddMinutes(110)
while ((Get-Date) -lt $deadline) {
  $raw = node ../tools/node_modules/eas-cli/bin/run build:view $BuildId --json 2>$null
  try { $j = ($raw -join "`n"); $b = $j.Substring($j.IndexOf("{")) | ConvertFrom-Json } catch { $b = $null }
  if ($b) {
    "$(Get-Date -Format HH:mm:ss) status=$($b.status)"
    if ($b.status -in @("FINISHED","ERRORED","CANCELED")) {
      "FINAL status=$($b.status)"; "artifact=$($b.artifacts.applicationArchiveUrl)"; "error=$($b.error.message)"; exit 0
    }
  } else { "$(Get-Date -Format HH:mm:ss) could not read status" }
  Start-Sleep -Seconds 90
}
"TIMEOUT"


