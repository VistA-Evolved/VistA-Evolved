<#
.SYNOPSIS
  Phase 538 verifier -- Imaging Capture + Attach (SIC-like)
.DESCRIPTION
  12 gates validating SIC-like capture workflow.
#>
param([switch]$SkipDocker)
$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 12

function Gate($n, $name, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  G${n}: $name" -F Green; $script:pass++ }
    else         { Write-Host "  FAIL  G${n}: $name" -F Red;   $script:fail++ }
  } catch {
    Write-Host "  FAIL  G${n}: $name ($_)" -F Red; $script:fail++
  }
}

Write-Host "`n=== Phase 538 -- Imaging Capture + Attach (SIC-like) ===" -F Cyan

Gate 1 "Route file exists" {
  Test-Path -LiteralPath "apps/api/src/routes/imaging-capture/index.ts"
}

Gate 2 "POST /imaging/capture route" {
  $f = Get-Content "apps/api/src/routes/imaging-capture/index.ts" -Raw
  $f -match 'POST.*\/imaging\/capture'
}

Gate 3 "GET /imaging/capture list route" {
  $f = Get-Content "apps/api/src/routes/imaging-capture/index.ts" -Raw
  $f -match 'GET.*\/imaging\/capture"'
}

Gate 4 "POST /imaging/capture/:id/link route" {
  $f = Get-Content "apps/api/src/routes/imaging-capture/index.ts" -Raw
  $f -match '/imaging/capture/:id/link'
}

Gate 5 "CaptureAttachment interface with required fields" {
  $f = Get-Content "apps/api/src/routes/imaging-capture/index.ts" -Raw
  ($f -match 'interface CaptureAttachment') -and ($f -match 'orthancId') -and ($f -match 'attachedToType') -and ($f -match 'vistaImageIen')
}

Gate 6 "integration-pending for VistA writeback" {
  $f = Get-Content "apps/api/src/routes/imaging-capture/index.ts" -Raw
  ($f -match 'MAG4 ADD IMAGE') -and ($f -match 'vistaGrounding')
}

Gate 7 "rpcRegistry has MAG capture RPCs (>=2)" {
  $f = Get-Content "apps/api/src/vista/rpcRegistry.ts" -Raw
  ($f -match 'MAG4 ADD IMAGE') -and ($f -match 'MAG NEW SO ENTRY')
}

Gate 8 "capabilities.json has imaging.capture entries" {
  $f = Get-Content "config/capabilities.json" -Raw
  ($f -match 'imaging\.capture\.upload') -and ($f -match 'imaging\.capture\.attach')
}

Gate 9 "ImagingPanel.tsx has capture tab" {
  $f = Get-Content "apps/web/src/components/cprs/panels/ImagingPanel.tsx" -Raw
  ($f -match "'capture'") -and ($f -match 'ImagingCaptureTab')
}

Gate 10 "store-policy entry for imaging-capture" {
  $f = Get-Content "apps/api/src/platform/store-policy.ts" -Raw
  $f -match 'imaging-capture-store'
}

Gate 11 "register-routes.ts wired" {
  $f = Get-Content "apps/api/src/server/register-routes.ts" -Raw
  ($f -match 'imagingCaptureRoutes') -and ($f -match 'imaging-capture/index')
}

Gate 12 "No PHI in route file" {
  $f = Get-Content "apps/api/src/routes/imaging-capture/index.ts" -Raw
  -not ($f -match '\d{3}-\d{2}-\d{4}') -and -not ($f -match 'PROV123')
}

Write-Host "`n--- Result: $pass / $total passed ---" -F $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })

$evidenceDir = "evidence/wave-39/538-W39-P8-IMAGING-CAPTURE"
if (-not (Test-Path -LiteralPath $evidenceDir)) { New-Item -Path $evidenceDir -ItemType Directory -Force | Out-Null }
@{
  phase = 538; wave = 39; title = "Imaging Capture + Attach (SIC-like)"
  pass = $pass; fail = $fail; total = $total
  timestamp = (Get-Date -Format o)
} | ConvertTo-Json -Depth 5 | Set-Content "$evidenceDir/verify-result.json" -Encoding UTF8

if ($fail -gt 0) { exit 1 } else { exit 0 }
