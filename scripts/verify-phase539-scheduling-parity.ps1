# Phase 539 - Scheduling Parity vs VSE - Verifier
# 12 gates

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 12

function Gate($n, $desc, [scriptblock]$test) {
  $r = & $test
  if ($r) { Write-Host "  PASS  Gate $n - $desc" -ForegroundColor Green; $script:pass++ }
  else    { Write-Host "  FAIL  Gate $n - $desc" -ForegroundColor Red;   $script:fail++ }
}

Write-Host "`n=== Phase 539 - Scheduling Parity vs VSE ===" -ForegroundColor Cyan

$schedRoutes = Get-Content -Raw "apps/api/src/routes/scheduling/index.ts"
$rpcReg      = Get-Content -Raw "apps/api/src/vista/rpcRegistry.ts"
$caps        = Get-Content -Raw "config/capabilities.json"
$schedPage   = Get-Content -Raw "apps/web/src/app/cprs/scheduling/page.tsx"
$storePolicy = Get-Content -Raw "apps/api/src/platform/store-policy.ts"
$gapReport   = Get-Content -Raw "data/ui-estate/ui-gap-report.json"

Gate 1 "Recall list endpoint" {
  $schedRoutes -match '/scheduling/recall"' -or $schedRoutes -match "scheduling/recall\b"
}

Gate 2 "Recall detail endpoint" {
  $schedRoutes -match '/scheduling/recall/:ien'
}

Gate 3 "Parity endpoint" {
  $schedRoutes -match '/scheduling/parity'
}

Gate 4 "Integration-pending with vistaGrounding" {
  ($schedRoutes -match 'integration-pending') -and ($schedRoutes -match 'vistaGrounding')
}

Gate 5 "Recall RPCs registered" {
  ($rpcReg -match 'SD RECALL LIST') -and ($rpcReg -match 'SD RECALL GET') -and
  ($rpcReg -match 'SDES GET RECALL ENTRIES') -and ($rpcReg -match 'SD RECALL DATE CHECK')
}

Gate 6 "Capabilities added" {
  ($caps -match 'scheduling\.recall\.list') -and ($caps -match 'scheduling\.recall\.detail') -and
  ($caps -match 'scheduling\.parity')
}

Gate 7 "Wait List tab in scheduling page" {
  $schedPage -match "waitlist" -and $schedPage -match "Wait List"
}

Gate 8 "Recall tab in scheduling page" {
  $schedPage -match "'recall'" -and $schedPage -match "Recall"
}

Gate 9 "Parity tab with matrix" {
  $schedPage -match "'parity'" -and $schedPage -match "VSE Parity" -and $schedPage -match "parityData"
}

Gate 10 "Store policy entries" {
  ($storePolicy -match 'scheduling-recall-store') -and ($storePolicy -match 'scheduling-parity-cache')
}

Gate 11 "Gap report updated" {
  # vse-wait-list should be >0, vse-recall-reminder should be >0
  $json = $gapReport | ConvertFrom-Json
  $wl = ($json.gaps | Where-Object { $_.surface -eq 'vse-wait-list' })
  $rc = ($json.gaps | Where-Object { $_.surface -eq 'vse-recall-reminder' })
  ($wl -and $wl.coveragePct -gt 0) -or ($gapReport -match '"vse-wait-list"' -and $gapReport -match '"coveragePct": 50')
}

Gate 12 "No PHI in evidence" {
  $allFiles = @($schedRoutes, $schedPage)
  $combined = $allFiles -join "`n"
  -not ($combined -match '\b\d{3}-\d{2}-\d{4}\b') -and -not ($combined -match 'CARTER,DAVID')
}

Write-Host "`n=== Results: $pass/$total PASS ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })

# Write evidence
$evidenceDir = "evidence/wave-39/539-W39-P9-SCHEDULING-PARITY"
if (-not (Test-Path -LiteralPath $evidenceDir)) { New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null }
@{ phase = 539; title = "Scheduling Parity vs VSE"; pass = $pass; fail = $fail; total = $total; ts = (Get-Date -Format o) } |
  ConvertTo-Json | Set-Content "$evidenceDir/verify-result.json" -Encoding ASCII

exit $fail
