<#
.SYNOPSIS
  Phase 412 (W24-P4): Pilot Integration Certification Runner
.DESCRIPTION
  Runs a structured certification suite against a pilot customer's integration
  configuration. Validates interop, connectivity, data mapping, security, and
  readiness gates. Outputs a per-customer evidence pack.
.PARAMETER CustomerName
  Name of the customer/partner being certified (used in evidence filenames).
.PARAMETER Archetype
  Pilot archetype: "clinic" (Archetype A) or "hospital" (Archetype B).
.PARAMETER ApiBase
  Base URL for the VistA-Evolved API (default: http://127.0.0.1:3001).
.PARAMETER SkipLive
  Skip gates that require a running API or Docker containers.
#>
param(
  [string]$CustomerName = "demo-clinic",
  [string]$Archetype    = "clinic",
  [string]$ApiBase      = "http://127.0.0.1:3001",
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

Write-Host "`n=== W24-P4: Pilot Integration Certification ===" -ForegroundColor Cyan
Write-Host "Customer: $CustomerName | Archetype: $Archetype | API: $ApiBase`n"

# ---------------------------------------------------------------
# Section 1: Archetype Validation
# ---------------------------------------------------------------
Write-Host "`n--- Section 1: Archetype Validation ---" -ForegroundColor Cyan

Gate "Archetype is valid (clinic or hospital)" {
  $Archetype -in @("clinic", "hospital")
}

$archetypesDoc = Join-Path $root "docs\pilots\PILOT_ARCHETYPES.md"
Gate "PILOT_ARCHETYPES.md exists" {
  Test-Path -LiteralPath $archetypesDoc
}

Gate "Archetype doc contains archetype definition" {
  $content = Get-Content $archetypesDoc -Raw
  if ($Archetype -eq "clinic") {
    $content -match "Archetype A"
  } else {
    $content -match "Archetype B"
  }
}

# ---------------------------------------------------------------
# Section 2: Readiness Gates Document
# ---------------------------------------------------------------
Write-Host "`n--- Section 2: Readiness Gates ---" -ForegroundColor Cyan

$gatesDoc = Join-Path $root "docs\pilots\PILOT_READINESS_GATES.md"
Gate "PILOT_READINESS_GATES.md exists" {
  Test-Path -LiteralPath $gatesDoc
}

Gate "Readiness gates doc has G1-G10" {
  $content = Get-Content $gatesDoc -Raw
  ($content -match "G1") -and ($content -match "G10")
}

# ---------------------------------------------------------------
# Section 3: Reference Environments
# ---------------------------------------------------------------
Write-Host "`n--- Section 3: Reference Environments ---" -ForegroundColor Cyan

$envDir = Join-Path $root "infra\environments"
foreach ($envFile in @("pilot.yaml", "dr-validate.yaml", "staging.yaml")) {
  Gate "Environment config: $envFile exists" {
    Test-Path -LiteralPath (Join-Path $envDir $envFile)
  }
}

Gate "Pilot env has runtimeMode: rc" {
  $content = Get-Content (Join-Path $envDir "pilot.yaml") -Raw
  $content -match "runtimeMode:\s*rc"
}

# ---------------------------------------------------------------
# Section 4: Integration Intake Source
# ---------------------------------------------------------------
Write-Host "`n--- Section 4: Integration Intake ---" -ForegroundColor Cyan

$intakeDir = Join-Path $root "apps\api\src\pilots\intake"
foreach ($f in @("types.ts", "intake-store.ts", "config-generator.ts", "intake-routes.ts", "index.ts")) {
  Gate "Intake source: $f exists" {
    Test-Path -LiteralPath (Join-Path $intakeDir $f)
  }
}

# ---------------------------------------------------------------
# Section 5: Security Posture
# ---------------------------------------------------------------
Write-Host "`n--- Section 5: Security Posture ---" -ForegroundColor Cyan

Gate "AUTH_RULES covers /pilots/ prefix" {
  $sec = Get-Content (Join-Path $root "apps\api\src\middleware\security.ts") -Raw
  $sec -match "pilots"
}

Gate "No hardcoded credentials in intake source" {
  $files = Get-ChildItem -Path $intakeDir -Filter "*.ts" -Recurse
  $clean = $true
  foreach ($f in $files) {
    $text = Get-Content $f.FullName -Raw
    if ($text -match "PROV123|password\s*=|secret\s*=" ) { $clean = $false }
  }
  $clean
}

# ---------------------------------------------------------------
# Section 6: Interop Connectivity (live, skippable)
# ---------------------------------------------------------------
Write-Host "`n--- Section 6: Interop Connectivity ---" -ForegroundColor Cyan

if ($SkipLive) {
  GateSkip "API /pilots/intake/dashboard reachable" "SkipLive"
  GateSkip "API /vista/ping reachable" "SkipLive"
  GateSkip "API /posture/observability reachable" "SkipLive"
} else {
  Gate "API /pilots/intake/dashboard reachable" {
    try {
      $r = Invoke-WebRequest -Uri "$ApiBase/pilots/intake/dashboard" `
           -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
      $r.StatusCode -lt 500
    } catch { $false }
  }
  Gate "API /vista/ping reachable" {
    try {
      $r = Invoke-WebRequest -Uri "$ApiBase/vista/ping" `
           -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
      $r.StatusCode -eq 200
    } catch { $false }
  }
  Gate "API /posture/observability reachable" {
    try {
      $r = Invoke-WebRequest -Uri "$ApiBase/posture/observability" `
           -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
      $r.StatusCode -lt 500
    } catch { $false }
  }
}

# ---------------------------------------------------------------
# Section 7: Archetype-Specific Module Checks
# ---------------------------------------------------------------
Write-Host "`n--- Section 7: Archetype Module Checks ---" -ForegroundColor Cyan

$modulesJson = Join-Path $root "config\modules.json"
Gate "config/modules.json exists" {
  Test-Path -LiteralPath $modulesJson
}

if ($Archetype -eq "clinic") {
  Gate "Clinic archetype: clinical module defined" {
    $mods = Get-Content $modulesJson -Raw
    $mods -match '"clinical"'
  }
  Gate "Clinic archetype: rcm module defined" {
    $mods = Get-Content $modulesJson -Raw
    $mods -match '"rcm"'
  }
  Gate "Clinic archetype: scheduling module defined" {
    $mods = Get-Content $modulesJson -Raw
    $mods -match '"scheduling"'
  }
} else {
  Gate "Hospital archetype: imaging module defined" {
    $mods = Get-Content $modulesJson -Raw
    $mods -match '"imaging"'
  }
  Gate "Hospital archetype: interop module defined" {
    $mods = Get-Content $modulesJson -Raw
    $mods -match '"interop"'
  }
  Gate "Hospital archetype: clinical module defined" {
    $mods = Get-Content $modulesJson -Raw
    $mods -match '"clinical"'
  }
}

# ---------------------------------------------------------------
# Section 8: Evidence Output
# ---------------------------------------------------------------
Write-Host "`n--- Section 8: Evidence Pack ---" -ForegroundColor Cyan

$evidenceDir = Join-Path $root "evidence\wave-24\412-certification"
if (-not (Test-Path -LiteralPath $evidenceDir)) {
  New-Item -Path $evidenceDir -ItemType Directory -Force | Out-Null
}

$evidenceFile = Join-Path $evidenceDir "$CustomerName-cert.json"
$evidence = @{
  customer   = $CustomerName
  archetype  = $Archetype
  timestamp  = (Get-Date -Format "o")
  pass       = $pass
  fail       = $fail
  skip       = $skip
  total      = $total
  certified  = ($fail -eq 0)
} | ConvertTo-Json -Depth 3

Set-Content -Path $evidenceFile -Value $evidence -Encoding ascii

Gate "Evidence file written" {
  Test-Path -LiteralPath $evidenceFile
}

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------
Write-Host "`n=== Certification Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass / $total"
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  SKIP: $skip" -ForegroundColor $(if ($skip -gt 0) { "Yellow" } else { "Green" })

if ($fail -eq 0) {
  Write-Host "`n  CERTIFIED: $CustomerName ($Archetype)" -ForegroundColor Green
} else {
  Write-Host "`n  NOT CERTIFIED: $CustomerName -- $fail gate(s) failed" -ForegroundColor Red
}

exit $fail
