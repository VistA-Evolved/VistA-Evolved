<# Phase 541 -- VA GUI Hybrids Capability Map verifier (12 gates) #>
param([switch]$SkipDocker)
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 12

function Test-Gate([string]$Name, [scriptblock]$Check) {
  try {
    $result = & $Check
    if ($result) { $script:pass++; Write-Host "  PASS  $Name" -ForegroundColor Green }
    else         { $script:fail++; Write-Host "  FAIL  $Name" -ForegroundColor Red }
  } catch       { $script:fail++; Write-Host "  FAIL  $Name ($_)" -ForegroundColor Red }
}

Write-Host "`n=== Phase 541: VA GUI Hybrids Capability Map ===" -ForegroundColor Cyan

# Gate 1: Builder script exists
Test-Gate "G01 Builder script exists" {
  Test-Path -LiteralPath "scripts/ui-estate/build-hybrids-map.mjs"
}

# Gate 2: Data file exists and is valid JSON
Test-Gate "G02 Data file exists + valid JSON" {
  if (!(Test-Path -LiteralPath "data/ui-estate/va-gui-hybrids-map.json")) { return $false }
  $raw = [System.IO.File]::ReadAllText("data/ui-estate/va-gui-hybrids-map.json")
  if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
  $j = $raw | ConvertFrom-Json
  $null -ne $j._meta -and $null -ne $j.hybrids
}

# Gate 3: Hybrid count >= 24
Test-Gate "G03 Hybrid count >= 24" {
  $raw = [System.IO.File]::ReadAllText("data/ui-estate/va-gui-hybrids-map.json")
  if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
  $j = $raw | ConvertFrom-Json
  $j.hybrids.Count -ge 24
}

# Gate 4: Per-hybrid fields present
Test-Gate "G04 Per-hybrid fields (hostPlatform, deploymentModel, rpcOverlap, rpcGap)" {
  $raw = [System.IO.File]::ReadAllText("data/ui-estate/va-gui-hybrids-map.json")
  if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
  $j = $raw | ConvertFrom-Json
  $ok = $true
  foreach ($h in $j.hybrids) {
    if ($null -eq $h.hostPlatform -or $null -eq $h.deploymentModel) { $ok = $false; break }
    if ($null -eq $h.rpcOverlap -or $null -eq $h.rpcGap) { $ok = $false; break }
  }
  $ok
}

# Gate 5: At least 1 hybrid has rpcOverlap.length > 0
Test-Gate "G05 RPC overlap computed (at least 1 hybrid has overlap)" {
  $raw = [System.IO.File]::ReadAllText("data/ui-estate/va-gui-hybrids-map.json")
  if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
  $j = $raw | ConvertFrom-Json
  $hasOverlap = $false
  foreach ($h in $j.hybrids) {
    if ($h.rpcOverlap.Count -gt 0) { $hasOverlap = $true; break }
  }
  $hasOverlap
}

# Gate 6: Migration readiness (0-100) on each hybrid
Test-Gate "G06 migrationReadiness on each hybrid (0-100)" {
  $raw = [System.IO.File]::ReadAllText("data/ui-estate/va-gui-hybrids-map.json")
  if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
  $j = $raw | ConvertFrom-Json
  $ok = $true
  foreach ($h in $j.hybrids) {
    if ($null -eq $h.migrationReadiness -or $h.migrationReadiness -lt 0 -or $h.migrationReadiness -gt 100) { $ok = $false; break }
  }
  $ok
}

# Gate 7: Route file exists
Test-Gate "G07 Route file exists" {
  Test-Path -LiteralPath "apps/api/src/routes/hybrids/index.ts"
}

# Gate 8: Route exports Fastify plugin
Test-Gate "G08 Route exports hybridsRoutes" {
  $content = Get-Content -LiteralPath "apps/api/src/routes/hybrids/index.ts" -Raw
  $content -match 'hybridsRoutes'
}

# Gate 9: Route registered in register-routes
Test-Gate "G09 Route registered in register-routes.ts" {
  $content = Get-Content -LiteralPath "apps/api/src/server/register-routes.ts" -Raw
  $content -match 'hybridsRoutes'
}

# Gate 10: Capabilities added
Test-Gate "G10 Capabilities: migration.hybrids.map + migration.hybrids.summary" {
  $content = Get-Content -LiteralPath "config/capabilities.json" -Raw
  ($content -match 'migration\.hybrids\.map') -and ($content -match 'migration\.hybrids\.summary')
}

# Gate 11: Store policy entry
Test-Gate "G11 Store policy: hybrids-map-cache" {
  $content = [System.IO.File]::ReadAllText("apps/api/src/platform/store-policy.ts")
  $content -match 'hybrids-map-cache'
}

# Gate 12: No PHI in generated data
Test-Gate "G12 No PHI in hybrids map (no SSN, DOB patterns)" {
  $raw = [System.IO.File]::ReadAllText("data/ui-estate/va-gui-hybrids-map.json")
  $noPhi = ($raw -notmatch '\d{3}-\d{2}-\d{4}') -and ($raw -notmatch 'PATIENT,') -and ($raw -notmatch '\b(ssn|dob)\b')
  $noPhi
}

Write-Host "`n=== Results: $pass/$total PASS ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })

# Write evidence
$evidenceDir = "evidence/wave-39/541-W39-P11-VA-GUI-HYBRIDS"
if (!(Test-Path -LiteralPath $evidenceDir)) { New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null }
@{ phase = 541; wave = 39; title = "VA GUI Hybrids Capability Map"; pass = $pass; fail = $fail; total = $total; ts = (Get-Date -Format o) } | ConvertTo-Json | Set-Content -LiteralPath "$evidenceDir/verify-result.json" -Encoding UTF8

exit $fail
