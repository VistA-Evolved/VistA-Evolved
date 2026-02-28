#!/usr/bin/env pwsh
<#
  Wave 7 Entry Gate Script
  Checks prerequisites for Wave 7 execution.
  Run: powershell -ExecutionPolicy Bypass -File scripts/wave7-entry-gate.ps1
#>
param(
  [switch]$Quiet
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0
$results = @()

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) {
    if (-not $Quiet) { Write-Host "  PASS  $Name" -ForegroundColor Green }
    $script:pass++
  } else {
    if (-not $Quiet) { Write-Host "  FAIL  $Name -- $Detail" -ForegroundColor Red }
    $script:fail++
  }
  $script:results += @{ name = $Name; ok = $Ok; detail = $Detail }
}

function Warn([string]$Name, [string]$Detail) {
  if (-not $Quiet) { Write-Host "  WARN  $Name -- $Detail" -ForegroundColor Yellow }
  $script:warn++
  $script:results += @{ name = $Name; ok = $true; detail = "WARN: $Detail" }
}

Write-Host "`n=== Wave 7 Entry Gate ===" -ForegroundColor Cyan
Write-Host ""

# ---------- 1. Prompt structure ----------
Write-Host "-- Prompt Structure --" -ForegroundColor White

$promptDirs = Get-ChildItem prompts -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '^\d+' } |
  Sort-Object { [int]($_.Name -replace '^(\d+).*','$1') }
$maxPrefix = 0
$maxPhase = 0
if ($promptDirs.Count -gt 0) {
  $last = $promptDirs[-1]
  $maxPrefix = [int]($last.Name -replace '^(\d+).*','$1')
  if ($last.Name -match 'PHASE-(\d+)') { $maxPhase = [int]$Matches[1] }
}
Gate "Prompt folders exist (count: $($promptDirs.Count))" ($promptDirs.Count -gt 200) "Expected 200+ prompt folders"
Gate "Max prompt prefix: $maxPrefix (phase $maxPhase)" ($maxPrefix -ge 244) "Expected prefix >= 244 (Wave 6 complete)"

# Check prompt linter
$linterExists = Test-Path -LiteralPath "scripts/lint-prompts.mjs" -PathType Leaf
if ($linterExists) {
  Gate "Prompt linter exists" $true ""
} else {
  Warn "Prompt linter" "scripts/lint-prompts.mjs not found; skipping lint check"
}

# ---------- 2. Evidence directory ----------
Write-Host "`n-- Evidence Structure --" -ForegroundColor White
$evidenceBase = Test-Path -LiteralPath "evidence/wave-7" -PathType Container
Gate "evidence/wave-7/ directory exists" $evidenceBase "Create: mkdir evidence/wave-7"

$wave7Subs = @("P1","P2","P3","P4","P5","P6","P7","P8","P9")
foreach ($sub in $wave7Subs) {
  $subPath = "evidence/wave-7/$sub"
  $exists = Test-Path -LiteralPath $subPath -PathType Container
  Gate "evidence/wave-7/$sub/ exists" $exists "Create: mkdir $subPath"
}

# ---------- 3. Wave 7 manifest ----------
Write-Host "`n-- Wave 7 Manifest --" -ForegroundColor White
$manifestPath = "docs/waves/WAVE7-MANIFEST.md"
$manifestExists = Test-Path -LiteralPath $manifestPath -PathType Leaf
Gate "Wave 7 manifest exists" $manifestExists "Create $manifestPath"

if ($manifestExists) {
  $manifestContent = Get-Content $manifestPath -Raw
  $phaseCount = ([regex]::Matches($manifestContent, '\| P\d+ \|')).Count
  Gate "Manifest lists 9 phases" ($phaseCount -ge 9) "Found $phaseCount phase rows"
}

# ---------- 4. Build-vs-Buy Ledger ----------
Write-Host "`n-- Build-vs-Buy Ledger --" -ForegroundColor White
$bvbPath = "docs/build-vs-buy.md"
$bvbExists = Test-Path -LiteralPath $bvbPath -PathType Leaf
Gate "Build-vs-buy ledger exists" $bvbExists "Create $bvbPath"

# ---------- 5. Required tooling detection ----------
Write-Host "`n-- Tooling Detection --" -ForegroundColor White

$tools = @(
  @{ name = "node"; cmd = "node --version" ; install = "https://nodejs.org" },
  @{ name = "pnpm"; cmd = "pnpm --version" ; install = "npm i -g pnpm" },
  @{ name = "docker"; cmd = "docker --version" ; install = "https://docs.docker.com/get-docker/" },
  @{ name = "git"; cmd = "git --version" ; install = "https://git-scm.com/" }
)

foreach ($t in $tools) {
  try {
    $ver = Invoke-Expression $t.cmd 2>$null
    Gate "$($t.name) available ($ver)" $true ""
  } catch {
    Gate "$($t.name) available" $false "Install: $($t.install)"
  }
}

# Optional tools (warn, don't fail)
$optTools = @(
  @{ name = "k6"; cmd = "k6 version" ; install = "https://k6.io/docs/get-started/installation/" },
  @{ name = "playwright"; cmd = "npx playwright --version" ; install = "pnpm --filter web exec playwright install" },
  @{ name = "trivy"; cmd = "trivy --version" ; install = "https://aquasecurity.github.io/trivy/latest/getting-started/installation/" },
  @{ name = "grype"; cmd = "grype version" ; install = "https://github.com/anchore/grype#installation" },
  @{ name = "syft"; cmd = "syft version" ; install = "https://github.com/anchore/syft#installation" }
)

foreach ($t in $optTools) {
  try {
    $ver = Invoke-Expression $t.cmd 2>$null
    if ($ver) {
      Gate "$($t.name) available" $true ""
    } else {
      Warn "$($t.name)" "Not found. Install: $($t.install)"
    }
  } catch {
    Warn "$($t.name)" "Not found. Install: $($t.install)"
  }
}

# ---------- 6. Existing CI patterns ----------
Write-Host "`n-- Existing CI Patterns --" -ForegroundColor White
$ciFiles = @(
  "supply-chain-attest.yml",
  "dr-nightly.yml",
  "ci-security.yml",
  "ci-e2e-smoke.yml",
  "codeql.yml"
)
foreach ($ci in $ciFiles) {
  $ciPath = ".github/workflows/$ci"
  $exists = Test-Path -LiteralPath $ciPath -PathType Leaf
  Gate "CI workflow: $ci" $exists "Missing: $ciPath"
}

# ---------- 7. Planned phases ----------
Write-Host "`n-- Wave 7 Planned Phases --" -ForegroundColor White
$nextPrefix = $maxPrefix + 1
$nextPhase = $maxPhase + 1
Write-Host "  Next prompt prefix: $nextPrefix" -ForegroundColor Cyan
Write-Host "  Next phase number:  $nextPhase" -ForegroundColor Cyan
Write-Host ""

$phases = @(
  "P1: Phase $nextPhase -- Wave 7 Manifest + Build-vs-Buy Ledger",
  "P2: Phase $($nextPhase+1) -- Supply Chain Security Baseline",
  "P3: Phase $($nextPhase+2) -- VistA RPC Contract Harness",
  "P4: Phase $($nextPhase+3) -- API + FHIR Contract Verification",
  "P5: Phase $($nextPhase+4) -- E2E Clinical Journeys (Playwright)",
  "P6: Phase $($nextPhase+5) -- Performance Acceptance Gates (k6)",
  "P7: Phase $($nextPhase+6) -- Resilience Certification",
  "P8: Phase $($nextPhase+7) -- DR Certification Drill",
  "P9: Phase $($nextPhase+8) -- Pilot Hospital Go-Live Kit"
)
foreach ($p in $phases) { Write-Host "    $p" -ForegroundColor DarkCyan }

# ---------- Summary ----------
Write-Host "`n=======================================" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "  Wave 7 Entry Gate Results"
Write-Host "  PASS: $pass / FAIL: $fail / WARN: $warn"
Write-Host "=======================================" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })

if ($fail -gt 0) { exit 1 } else { exit 0 }
