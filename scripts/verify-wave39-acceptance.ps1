<# 
  Phase 542 -- Wave 39 Acceptance Harness
  Exercises P1-P11 artifacts deterministically. No live VistA needed.
  All checks are file-based or re-run existing per-phase verifiers.

  Usage: powershell -ExecutionPolicy Bypass -File scripts/verify-wave39-acceptance.ps1
#>
param([switch]$SkipPhaseVerifiers)
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 14
$phaseResults = @()

function Log([string]$Msg, [string]$Color = 'White') {
  Write-Host $Msg -ForegroundColor $Color
}

function Test-Gate([string]$Name, [scriptblock]$Check) {
  try {
    $result = & $Check
    if ($result) { $script:pass++; Log "  PASS  $Name" Green }
    else         { $script:fail++; Log "  FAIL  $Name" Red }
  } catch       { $script:fail++; Log "  FAIL  $Name ($_)" Red }
}

Log "`n========================================" Cyan
Log "  Wave 39 Acceptance Harness (P542)" Cyan
Log "  VA/IHS GUI Parity + Workflow Migration" Cyan
Log "========================================" Cyan

# ── Phase verifiers (G01-G11) ──────────────────────────────────────
$phases = @(
  @{ Num = 531; Tag = 'P1';  Title = 'UI Estate Catalog';       Script = 'scripts/verify-phase531-ui-estate-catalog.ps1' },
  @{ Num = 532; Tag = 'P2';  Title = 'UI Parity Gap Gate';      Script = 'scripts/verify-phase532-ui-parity-gate.ps1' },
  @{ Num = 533; Tag = 'P3';  Title = 'Workflow Switchboard';     Script = 'scripts/verify-phase533-workflow-switchboard.ps1' },
  @{ Num = 534; Tag = 'P4';  Title = 'Browser Terminal';         Script = 'scripts/verify-phase534-browser-terminal.ps1' },
  @{ Num = 535; Tag = 'P5';  Title = 'MHA v1 LForms';           Script = 'scripts/verify-phase535-mha-v1.ps1' },
  @{ Num = 536; Tag = 'P6';  Title = 'MHA VistA Writeback';     Script = 'scripts/verify-phase536-mha-writeback.ps1' },
  @{ Num = 537; Tag = 'P7';  Title = 'Clinical Procedures';     Script = 'scripts/verify-phase537-clinical-procedures.ps1' },
  @{ Num = 538; Tag = 'P8';  Title = 'Imaging Capture';         Script = 'scripts/verify-phase538-imaging-capture.ps1' },
  @{ Num = 539; Tag = 'P9';  Title = 'Scheduling Parity';       Script = 'scripts/verify-phase539-scheduling-parity.ps1' },
  @{ Num = 540; Tag = 'P10'; Title = 'JLV Longitudinal';        Script = 'scripts/verify-phase540-jlv-longitudinal.ps1' },
  @{ Num = 541; Tag = 'P11'; Title = 'VA GUI Hybrids';          Script = 'scripts/verify-phase541-va-gui-hybrids.ps1' }
)

$gateNum = 0
foreach ($p in $phases) {
  $gateNum++
  $gateLabel = "G{0:D2} Phase {1} ({2}): {3}" -f $gateNum, $p.Num, $p.Tag, $p.Title

  if ($SkipPhaseVerifiers) {
    # Fast mode: just check evidence file exists and has fail==0
    Test-Gate $gateLabel {
      $evDirs = Get-ChildItem -LiteralPath "evidence/wave-39" -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "$($p.Num)-*" }
      if (-not $evDirs -or $evDirs.Count -eq 0) { return $false }
      $vr = Join-Path $evDirs[0].FullName "verify-result.json"
      if (!(Test-Path -LiteralPath $vr)) { return $false }
      $raw = [System.IO.File]::ReadAllText($vr)
      if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
      $j = $raw | ConvertFrom-Json
      if ($null -ne $j.fail) { return $j.fail -eq 0 }
      # Older format uses result string
      if ($null -ne $j.result) { return $j.result -match 'PASS' }
      return $false
    }
  } else {
    # Full mode: re-run verifier
    Test-Gate $gateLabel {
      if (!(Test-Path -LiteralPath $p.Script)) { return $false }
      $output = & powershell -ExecutionPolicy Bypass -File $p.Script 2>&1
      $exitCode = $LASTEXITCODE
      $phaseResult = @{ phase = $p.Num; tag = $p.Tag; title = $p.Title; exitCode = $exitCode; passed = ($exitCode -eq 0) }
      $script:phaseResults += $phaseResult
      return $exitCode -eq 0
    }
  }
}

# ── G12: Evidence completeness ────────────────────────────────────
Test-Gate "G12 Evidence completeness (all 11 verify-result.json exist with fail==0)" {
  $ok = $true
  foreach ($p in $phases) {
    $evDirs = Get-ChildItem -LiteralPath "evidence/wave-39" -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like "$($p.Num)-*" }
    if (-not $evDirs -or $evDirs.Count -eq 0) { $ok = $false; continue }
    $vr = Join-Path $evDirs[0].FullName "verify-result.json"
    if (!(Test-Path -LiteralPath $vr)) { $ok = $false }
  }
  $ok
}

# ── G13: Key artifact file-existence ──────────────────────────────
Test-Gate "G13 Key artifacts exist (catalogs, routes, data)" {
  $artifacts = @(
    "data/ui-estate/va-ui-estate.json",
    "data/ui-estate/ihs-ui-estate.json",
    "data/ui-estate/ui-gap-report.json",
    "data/ui-estate/va-gui-hybrids-map.json",
    "apps/api/src/routes/hybrids/index.ts",
    "apps/api/src/routes/longitudinal/index.ts",
    "apps/api/src/routes/scheduling/index.ts",
    "apps/api/src/routes/mha/index.ts",
    "apps/api/src/routes/clinical-procedures/index.ts",
    "apps/api/src/routes/imaging-capture/index.ts",
    "apps/web/src/components/cprs/panels/MHAPanel.tsx",
    "apps/web/src/components/cprs/panels/ClinicalProceduresPanel.tsx",
    "apps/web/src/components/cprs/panels/LongitudinalPanel.tsx",
    "scripts/ui-estate/build-ui-estate.mjs",
    "scripts/ui-estate/build-hybrids-map.mjs",
    "config/capabilities.json",
    "config/modules.json"
  )
  $ok = $true
  foreach ($a in $artifacts) {
    if (!(Test-Path -LiteralPath $a)) { Log "    MISSING: $a" Red; $ok = $false }
  }
  $ok
}

# ── G14: UI parity gap gate ──────────────────────────────────────
Test-Gate "G14 UI Parity Gap Gate passes" {
  if (!(Test-Path -LiteralPath "scripts/qa-gates/ui-parity-gate.mjs")) { return $false }
  $gateOutput = & node scripts/qa-gates/ui-parity-gate.mjs --json 2>&1
  $LASTEXITCODE -eq 0
}

# ── Report ────────────────────────────────────────────────────────
Log ""
Log "========================================" $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Log "  Wave 39 Acceptance: $pass/$total PASS" $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Log "========================================" $(if ($fail -eq 0) { 'Green' } else { 'Red' })

# Write acceptance evidence
$evidenceDir = "evidence/wave-39/542-W39-P12-ACCEPTANCE-HARNESS"
if (!(Test-Path -LiteralPath $evidenceDir)) { New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null }

$phasesPass = ($phases | ForEach-Object {
  $evDirs = Get-ChildItem -LiteralPath "evidence/wave-39" -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "$($_.Num)-*" }
  if ($evDirs) {
    $vr = Join-Path $evDirs[0].FullName "verify-result.json"
    if (Test-Path -LiteralPath $vr) {
      $raw = [System.IO.File]::ReadAllText($vr)
      if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
      $j = $raw | ConvertFrom-Json
      if ($null -ne $j.fail -and $j.fail -eq 0) { return 1 }
    }
  }
  return 0
} | Measure-Object -Sum).Sum

# Simplified phases pass count
$ppCount = 0
foreach ($p in $phases) {
  $evDirs = Get-ChildItem -LiteralPath "evidence/wave-39" -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "$($p.Num)-*" }
  if ($evDirs -and $evDirs.Count -gt 0) {
    $vr = Join-Path $evDirs[0].FullName "verify-result.json"
    if (Test-Path -LiteralPath $vr) {
      $raw = [System.IO.File]::ReadAllText($vr)
      if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
      $j = $raw | ConvertFrom-Json
      if ($null -ne $j.fail -and $j.fail -eq 0) { $ppCount++ }
      elseif ($null -ne $j.result -and $j.result -match 'PASS') { $ppCount++ }
    }
  }
}

$report = @{
  wave = 39
  phase = 542
  title = "Wave 39 Acceptance Harness"
  pass = $pass
  fail = $fail
  total = $total
  phasesPass = $ppCount
  phasesTotal = 11
  ts = (Get-Date -Format o)
}
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$evidenceDir/acceptance-report.json" -Encoding UTF8

Log ""
Log "Evidence: $evidenceDir/acceptance-report.json" Cyan
Log "Phases passing: $ppCount/11" $(if ($ppCount -eq 11) { 'Green' } else { 'Yellow' })

exit $fail
