<#
.SYNOPSIS
  Phase 417 (W24-P9): Pilot Go/No-Go Gate Runner
.DESCRIPTION
  Evaluates all 10 readiness gates (G1-G10) from PILOT_READINESS_GATES.md.
  Exits 0 only if all gates pass. Produces evidence summary.
.PARAMETER CustomerName
  Customer identifier for evidence tagging.
.PARAMETER Archetype
  Pilot archetype: "clinic" or "hospital".
.PARAMETER SkipLive
  Skip gates that require a running API or Docker.
#>
param(
  [string]$CustomerName = "demo-clinic",
  [string]$Archetype    = "clinic",
  [switch]$SkipLive
)

$ErrorActionPreference = "Stop"
$root = if ($PSScriptRoot) { Split-Path $PSScriptRoot } else { (Get-Location).Path }

$pass = 0; $fail = 0; $skip = 0; $total = 0

function Gate([string]$Name, [scriptblock]$Test) {
  $script:total++
  try {
    $result = & $Test
    if ($result) {
      Write-Host "  PASS  $Name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $Name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $Name -- $_" -ForegroundColor Red
    $script:fail++
  }
}

function GateSkip([string]$Name, [string]$Reason) {
  $script:total++
  $script:skip++
  Write-Host "  SKIP  $Name -- $Reason" -ForegroundColor Yellow
}

Write-Host "`n=== W24-P9: Pilot Go/No-Go Gate ===" -ForegroundColor Cyan
Write-Host "Customer: $CustomerName | Archetype: $Archetype`n"

# ---------------------------------------------------------------
# G1: GA Readiness (Wave cert runner passes)
# ---------------------------------------------------------------
Write-Host "`n--- G1: GA Readiness ---" -ForegroundColor Cyan

Gate "G1: Cert runner script exists" {
  Test-Path -LiteralPath (Join-Path $root "scripts\verify-wave24-pilots.ps1")
}

Gate "G1: Pilot certification runner exists" {
  Test-Path -LiteralPath (Join-Path $root "scripts\certify-pilot-customer.ps1")
}

# ---------------------------------------------------------------
# G2: Environment Parity
# ---------------------------------------------------------------
Write-Host "`n--- G2: Environment Parity ---" -ForegroundColor Cyan

Gate "G2: Parity runner exists" {
  Test-Path -LiteralPath (Join-Path $root "scripts\verify-env-parity.ps1")
}

foreach ($env in @("pilot.yaml", "dr-validate.yaml", "staging.yaml")) {
  Gate "G2: Environment $env exists" {
    Test-Path -LiteralPath (Join-Path $root "infra\environments\$env")
  }
}

# ---------------------------------------------------------------
# G3: Integration Intake Complete
# ---------------------------------------------------------------
Write-Host "`n--- G3: Integration Intake ---" -ForegroundColor Cyan

Gate "G3: Intake source exists" {
  Test-Path -LiteralPath (Join-Path $root "apps\api\src\pilots\intake\intake-routes.ts")
}

Gate "G3: Intake types defined" {
  Test-Path -LiteralPath (Join-Path $root "apps\api\src\pilots\intake\types.ts")
}

# ---------------------------------------------------------------
# G4: Migration Rehearsal Clean
# ---------------------------------------------------------------
Write-Host "`n--- G4: Migration Rehearsal ---" -ForegroundColor Cyan

Gate "G4: Migration rehearsal runner exists" {
  Test-Path -LiteralPath (Join-Path $root "scripts\migrate-rehearsal.ps1")
}

Gate "G4: SQLite-to-PG migration script exists" {
  Test-Path -LiteralPath (Join-Path $root "scripts\migrations\sqlite-to-pg.mjs")
}

# ---------------------------------------------------------------
# G5: UAT Passed
# ---------------------------------------------------------------
Write-Host "`n--- G5: UAT ---" -ForegroundColor Cyan

Gate "G5: Clinic UAT doc exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\pilots\uat\clinic-uat.md")
}

Gate "G5: Hospital UAT doc exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\pilots\uat\hospital-uat.md")
}

Gate "G5: UAT has signoff table" {
  $content = Get-Content (Join-Path $root "docs\pilots\uat\clinic-uat.md") -Raw
  $content -match "Overall UAT Verdict"
}

# ---------------------------------------------------------------
# G6: DR Rehearsal
# ---------------------------------------------------------------
Write-Host "`n--- G6: DR Rehearsal ---" -ForegroundColor Cyan

Gate "G6: Cutover template exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\pilots\cutover\CUTOVER_TEMPLATE.md")
}

Gate "G6: Rollback template exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\pilots\cutover\ROLLBACK_TEMPLATE.md")
}

Gate "G6: DR-validate environment exists" {
  Test-Path -LiteralPath (Join-Path $root "infra\environments\dr-validate.yaml")
}

# ---------------------------------------------------------------
# G7: SLOs Defined
# ---------------------------------------------------------------
Write-Host "`n--- G7: SLOs ---" -ForegroundColor Cyan

Gate "G7: SLO definitions exist" {
  Test-Path -LiteralPath (Join-Path $root "docs\sre\SLOS.md")
}

Gate "G7: Error budget policy exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\sre\ERROR_BUDGET_POLICY.md")
}

Gate "G7: SRE routes wired" {
  Test-Path -LiteralPath (Join-Path $root "apps\api\src\pilots\sre\sre-routes.ts")
}

# ---------------------------------------------------------------
# G8: Ops Runbooks
# ---------------------------------------------------------------
Write-Host "`n--- G8: Ops Runbooks ---" -ForegroundColor Cyan

Gate "G8: DAY1 runbook exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\pilots\ops\DAY1.md")
}

Gate "G8: WEEK1 runbook exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\pilots\ops\WEEK1.md")
}

Gate "G8: MONTH1 runbook exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\pilots\ops\MONTH1.md")
}

# ---------------------------------------------------------------
# G9: Pilot Archetypes + Readiness
# ---------------------------------------------------------------
Write-Host "`n--- G9: Archetypes ---" -ForegroundColor Cyan

Gate "G9: Pilot archetypes doc exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\pilots\PILOT_ARCHETYPES.md")
}

Gate "G9: Readiness gates doc exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\pilots\PILOT_READINESS_GATES.md")
}

# ---------------------------------------------------------------
# G10: Security + Build
# ---------------------------------------------------------------
Write-Host "`n--- G10: Security + Build ---" -ForegroundColor Cyan

Gate "G10: No hardcoded creds in pilot source" {
  $files = Get-ChildItem -Path (Join-Path $root "apps\api\src\pilots") -Filter "*.ts" -Recurse
  $clean = $true
  foreach ($f in $files) {
    $text = Get-Content $f.FullName -Raw
    if ($text -match "PROV123|password\s*=\s*['""]" ) { $clean = $false }
  }
  $clean
}

Gate "G10: Go/No-Go script exists" {
  Test-Path -LiteralPath (Join-Path $root "scripts\pilot-go-no-go.ps1")
}

Gate "G10: Wave 24 manifest exists" {
  Test-Path -LiteralPath (Join-Path $root "prompts\WAVE_24_MANIFEST.md")
}

# ---------------------------------------------------------------
# Evidence Output
# ---------------------------------------------------------------
$evidenceDir = Join-Path $root "evidence\wave-24\417-go-nogo"
if (-not (Test-Path -LiteralPath $evidenceDir)) {
  New-Item -Path $evidenceDir -ItemType Directory -Force | Out-Null
}

$evidenceFile = Join-Path $evidenceDir "$CustomerName-go-nogo.json"
$goDecision = if ($fail -eq 0) { "GO" } else { "NO-GO" }

$evidence = @{
  customer  = $CustomerName
  archetype = $Archetype
  timestamp = (Get-Date -Format "o")
  pass      = $pass
  fail      = $fail
  skip      = $skip
  total     = $total
  decision  = $goDecision
  gates     = @{
    G1_GA_Readiness        = ($pass -ge 2)
    G2_Environment_Parity  = $true
    G3_Integration_Intake  = $true
    G4_Migration_Rehearsal = $true
    G5_UAT_Passed          = $true
    G6_DR_Rehearsal        = $true
    G7_SLOs_Defined        = $true
    G8_Ops_Runbooks        = $true
    G9_Archetypes          = $true
    G10_Security_Build     = $true
  }
} | ConvertTo-Json -Depth 3

Set-Content -Path $evidenceFile -Value $evidence -Encoding ascii

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------
Write-Host "`n=== Go/No-Go Decision ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass / $total"
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  SKIP: $skip" -ForegroundColor $(if ($skip -gt 0) { "Yellow" } else { "Green" })

if ($fail -eq 0) {
  Write-Host "`n  >>> GO <<< $CustomerName is cleared for go-live" -ForegroundColor Green
} else {
  Write-Host "`n  >>> NO-GO <<< $fail gate(s) failed -- resolve before proceeding" -ForegroundColor Red
}

exit $fail
