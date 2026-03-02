# Phase 540 - JLV Longitudinal Viewer v1 - Verifier
# 12 gates

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 12

function Gate($n, $desc, [scriptblock]$test) {
  $r = & $test
  if ($r) { Write-Host "  PASS  Gate $n - $desc" -ForegroundColor Green; $script:pass++ }
  else    { Write-Host "  FAIL  Gate $n - $desc" -ForegroundColor Red;   $script:fail++ }
}

Write-Host "`n=== Phase 540 - JLV Longitudinal Viewer v1 ===" -ForegroundColor Cyan

$routeFile = "apps/api/src/routes/longitudinal/index.ts"
$routeExists = Test-Path -LiteralPath $routeFile
$routeContent = if ($routeExists) { Get-Content -Raw $routeFile } else { "" }
$panelFile = "apps/web/src/components/cprs/panels/LongitudinalPanel.tsx"
$panelExists = Test-Path -LiteralPath $panelFile
$panelContent = if ($panelExists) { Get-Content -Raw $panelFile } else { "" }
$caps = Get-Content -Raw "config/capabilities.json"
$regRoutes = Get-Content -Raw "apps/api/src/server/register-routes.ts"
$storePolicy = Get-Content -Raw "apps/api/src/platform/store-policy.ts"
$panelIndex = Get-Content -Raw "apps/web/src/components/cprs/panels/index.ts"
$gapReport = Get-Content -Raw "data/ui-estate/ui-gap-report.json"

Gate 1 "Route file exists" {
  $routeExists
}

Gate 2 "Timeline endpoint" {
  $routeContent -match '/vista/longitudinal/timeline'
}

Gate 3 "Summary endpoint" {
  $routeContent -match '/vista/longitudinal/summary'
}

Gate 4 "Meds summary endpoint" {
  $routeContent -match '/vista/longitudinal/meds-summary'
}

Gate 5 "Multi-domain aggregation" {
  ($routeContent -match 'fetchAllergies') -and ($routeContent -match 'fetchLabs') -and
  ($routeContent -match 'fetchMedications') -and ($routeContent -match 'fetchNotes') -and
  ($routeContent -match 'fetchVitals') -and ($routeContent -match 'fetchProblems')
}

Gate 6 "LongitudinalPanel exists" {
  $panelExists -and ($panelContent -match 'timeline') -and ($panelContent -match 'LongitudinalPanel')
}

Gate 7 "Panel exported" {
  $panelIndex -match 'LongitudinalPanel'
}

Gate 8 "Capabilities added" {
  ($caps -match 'clinical\.longitudinal\.timeline') -and
  ($caps -match 'clinical\.longitudinal\.summary') -and
  ($caps -match 'clinical\.longitudinal\.meds')
}

Gate 9 "Route registered" {
  ($regRoutes -match 'longitudinalRoutes') -and ($regRoutes -match 'import.*longitudinal')
}

Gate 10 "Store policy entries" {
  ($storePolicy -match 'longitudinal-timeline-cache') -and ($storePolicy -match 'longitudinal-summary-cache')
}

Gate 11 "Gap report updated" {
  ($gapReport -match '"jlv-timeline"') -and ($gapReport -match '"coveragePct": 50')
}

Gate 12 "No PHI" {
  $combined = $routeContent + $panelContent
  -not ($combined -match '\b\d{3}-\d{2}-\d{4}\b') -and -not ($combined -match 'CARTER,DAVID')
}

Write-Host "`n=== Results: $pass/$total PASS ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })

$evidenceDir = "evidence/wave-39/540-W39-P10-JLV-LONGITUDINAL"
if (-not (Test-Path -LiteralPath $evidenceDir)) { New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null }
@{ phase = 540; title = "JLV Longitudinal Viewer v1"; pass = $pass; fail = $fail; total = $total; ts = (Get-Date -Format o) } |
  ConvertTo-Json | Set-Content "$evidenceDir/verify-result.json" -Encoding ASCII

exit $fail
