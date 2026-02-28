<#
  Phase 247 -- Wave 6 Certification Suite
  Runs all Wave 6 phase verifiers (P3-P9) and performs P1/P2 static checks
  Generates a pass/fail summary for the entire wave.
#>
param([switch]$Verbose)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$api  = Join-Path (Join-Path $root "apps") "api"
$pass = 0; $fail = 0; $wavePass = 0; $waveFail = 0

function Test-Gate([string]$name, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
    else         { Write-Host "  FAIL  $name" -ForegroundColor Red;   $script:fail++ }
  } catch       { Write-Host "  FAIL  $name ($_)" -ForegroundColor Red; $script:fail++ }
}

Write-Host "`n=== Phase 247: Wave 6 Certification Suite ===" -ForegroundColor Cyan

# ---- Section 1: P1 (238) static checks ----
Write-Host "`n-- P1: OSS Reuse Audit (Phase 238) --" -ForegroundColor Yellow

Test-Gate "P1: ADR decisions directory exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\decisions")
}

Test-Gate "P1: WAVE6-MANIFEST.md exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\waves\WAVE6-MANIFEST.md")
}

Test-Gate "P1: Prompt folder 235-PHASE-238 exists" {
  Test-Path -LiteralPath (Join-Path $root "prompts\235-PHASE-238-OSS-REUSE-AUDIT")
}

# ---- Section 2: P2 (239) static checks ----
Write-Host "`n-- P2: HL7v2 Engine Packaging (Phase 239) --" -ForegroundColor Yellow

Test-Gate "P2: HL7 engine source exists" {
  $dir = Join-Path $api "src\hl7"
  Test-Path -LiteralPath $dir
}

Test-Gate "P2: Prompt folder 236-PHASE-239 exists" {
  Test-Path -LiteralPath (Join-Path $root "prompts\236-PHASE-239-HL7-ENGINE-PACKAGING")
}

# ---- Section 3: Per-phase verifiers (P3-P9) ----
$phaseVerifiers = @(
  @{ Phase = "P3 (240)"; Script = "verify-phase240-hl7-routing.ps1" },
  @{ Phase = "P4 (241)"; Script = "verify-phase241-hl7-packs.ps1" },
  @{ Phase = "P5 (242)"; Script = "verify-phase242-payer-scale.ps1" },
  @{ Phase = "P6 (243)"; Script = "verify-phase243-onboarding-ux.ps1" },
  @{ Phase = "P7 (244)"; Script = "verify-phase244-support-tooling.ps1" },
  @{ Phase = "P8 (245)"; Script = "verify-phase245-data-exports-v2.ps1" },
  @{ Phase = "P9 (246)"; Script = "verify-phase246-pilot-hardening.ps1" }
)

foreach ($pv in $phaseVerifiers) {
  $scriptPath = Join-Path $root "scripts\$($pv.Script)"
  Write-Host "`n-- $($pv.Phase): Running $($pv.Script) --" -ForegroundColor Yellow

  if (-not (Test-Path -LiteralPath $scriptPath)) {
    Write-Host "  FAIL  Verifier not found: $($pv.Script)" -ForegroundColor Red
    $fail++
    continue
  }

  $output = & powershell -ExecutionPolicy Bypass -File $scriptPath 2>&1
  $exitCode = $LASTEXITCODE
  if ($Verbose) { $output | ForEach-Object { Write-Host "    $_" } }

  # Extract pass/fail from verifier output
  $resultLine = $output | Where-Object { $_ -match "Results:.*PASS.*FAIL" } | Select-Object -Last 1
  if ($resultLine) {
    Write-Host "  $resultLine"
  }

  if ($exitCode -eq 0) {
    Write-Host "  PASS  $($pv.Phase) verifier passed" -ForegroundColor Green
    $pass++; $wavePass++
  } else {
    Write-Host "  FAIL  $($pv.Phase) verifier failed (exit=$exitCode)" -ForegroundColor Red
    $fail++; $waveFail++
  }
}

# ---- Section 4: Wave-level checks ----
Write-Host "`n-- Wave 6 Cross-Cutting Checks --" -ForegroundColor Yellow

Test-Gate "All 10 prompt folders exist" {
  $folders = @(
    "235-PHASE-238-OSS-REUSE-AUDIT",
    "236-PHASE-239-HL7-ENGINE-PACKAGING",
    "237-PHASE-240-HL7-ROUTING-LAYER",
    "238-PHASE-241-HL7-MESSAGE-PACKS",
    "239-PHASE-242-PAYER-SCALE-HARDENING",
    "240-PHASE-243-ONBOARDING-UX",
    "241-PHASE-244-SUPPORT-TOOLING",
    "242-PHASE-245-DATA-EXPORTS-V2",
    "243-PHASE-246-PILOT-HARDENING",
    "244-PHASE-247-WAVE6-CERTIFICATION"
  )
  $allExist = $true
  foreach ($f in $folders) {
    if (-not (Test-Path -LiteralPath (Join-Path $root "prompts\$f"))) { $allExist = $false }
  }
  $allExist
}

Test-Gate "Wave 6 certification snapshot exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\waves\wave6-certification-snapshot.md")
}

Test-Gate "TypeScript compiles" {
  Push-Location $api
  $out = pnpm build 2>&1
  Pop-Location
  $LASTEXITCODE -eq 0
}

# ---- Summary ----
Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "  Wave 6 Certification Results" -ForegroundColor Cyan
Write-Host "  Phase verifiers: $wavePass passed / $waveFail failed (of 7)" -ForegroundColor $(if ($waveFail -eq 0) { 'Green' } else { 'Red' })
Write-Host "  Total gates: $pass PASS / $fail FAIL" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "=======================================" -ForegroundColor Cyan
exit $fail
