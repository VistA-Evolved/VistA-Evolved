<#
.SYNOPSIS
  Phase 73 -- Drift Lock + PendingTargets Index + Repo Hygiene
.DESCRIPTION
  Runs governance gates:
  1. Repo hygiene (anti-sprawl, prompts ordering, artifacts not tracked)
  2. PendingTargets index (scans for pendingTargets usage)
  3. Traceability index (actionId -> endpoint -> rpcRegistry)
  4. Structural file existence checks
  5. TSC compilation checks
#>
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0

function Gate-Pass($msg) { Write-Host "  PASS  $msg" -ForegroundColor Green; $script:pass++ }
function Gate-Fail($msg) { Write-Host "  FAIL  $msg" -ForegroundColor Red; $script:fail++ }
function Gate-Warn($msg) { Write-Host "  WARN  $msg" -ForegroundColor Yellow; $script:warn++ }

$root = Split-Path -Parent $PSScriptRoot

Write-Host "`n=== Phase 73 -- Drift Lock + Repo Hygiene ===" -ForegroundColor Cyan

# ----------------------------------------------------------------
# Section 1: File existence checks
# ----------------------------------------------------------------
Write-Host "`n-- File Existence --"

$requiredFiles = @(
  "scripts/governance/verifyRepoHygiene.ts",
  "scripts/governance/buildPendingTargetsIndex.ts",
  "scripts/governance/buildTraceabilityIndex.ts",
  "scripts/check-prompts-ordering.ts",
  "prompts/78-PHASE-73-DRIFT-LOCK/78-01-IMPLEMENT.md",
  "prompts/78-PHASE-73-DRIFT-LOCK/78-99-VERIFY.md",
  "apps/web/src/actions/actionRegistry.ts",
  "apps/api/src/vista/rpcRegistry.ts"
)

foreach ($f in $requiredFiles) {
  $fp = Join-Path $root $f
  if (Test-Path -LiteralPath $fp) { Gate-Pass "$f exists" }
  else { Gate-Fail "$f missing" }
}

# ----------------------------------------------------------------
# Section 2: Repo hygiene gate
# ----------------------------------------------------------------
Write-Host "`n-- Repo Hygiene Gate --"

Push-Location $root
try {
  $hygieneOut = npx tsx scripts/governance/verifyRepoHygiene.ts 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0) {
    Gate-Pass "Repo hygiene gate passed"
  } else {
    Gate-Fail "Repo hygiene gate failed"
    Write-Host $hygieneOut
  }

  # Verify artifact was created
  $hygieneArtifact = Join-Path $root "artifacts/governance/repo-hygiene.json"
  if (Test-Path -LiteralPath $hygieneArtifact) {
    Gate-Pass "repo-hygiene.json artifact created"
  } else {
    Gate-Fail "repo-hygiene.json artifact not created"
  }
} finally {
  Pop-Location
}

# ----------------------------------------------------------------
# Section 3: Prompts ordering gate
# ----------------------------------------------------------------
Write-Host "`n-- Prompts Ordering Gate --"

Push-Location $root
try {
  $promptsOut = npx tsx scripts/check-prompts-ordering.ts 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0) {
    Gate-Pass "Prompts ordering gate passed"
  } else {
    Gate-Warn "Prompts ordering gate has issues"
    Write-Host $promptsOut
  }
} finally {
  Pop-Location
}

# ----------------------------------------------------------------
# Section 4: PendingTargets index
# ----------------------------------------------------------------
Write-Host "`n-- PendingTargets Index --"

Push-Location $root
try {
  $ptOut = npx tsx scripts/governance/buildPendingTargetsIndex.ts 2>&1 | Out-String
  Gate-Pass "PendingTargets index builder ran"

  $ptArtifact = Join-Path $root "artifacts/governance/pending-targets-index.json"
  if (Test-Path -LiteralPath $ptArtifact) {
    $ptJson = Get-Content $ptArtifact -Raw | ConvertFrom-Json
    $ptCount = $ptJson.summary.totalOccurrences
    $ptRpcs = $ptJson.summary.uniqueRpcs
    Gate-Pass "pending-targets-index.json: $ptCount occurrences, $ptRpcs unique RPCs"
    if ($ptCount -eq 0) {
      Gate-Fail "PendingTargets index found 0 occurrences (expected > 0)"
    }
  } else {
    Gate-Fail "pending-targets-index.json artifact not created"
  }
} finally {
  Pop-Location
}

# ----------------------------------------------------------------
# Section 5: Traceability index
# ----------------------------------------------------------------
Write-Host "`n-- Traceability Index --"

Push-Location $root
try {
  $trOut = npx tsx scripts/governance/buildTraceabilityIndex.ts 2>&1 | Out-String
  Gate-Pass "Traceability index builder ran"

  $trArtifact = Join-Path $root "artifacts/governance/traceability-index.json"
  if (Test-Path -LiteralPath $trArtifact) {
    $trJson = Get-Content $trArtifact -Raw | ConvertFrom-Json
    $trCount = $trJson.summary.totalActions
    $trWired = $trJson.summary.wired
    $trErrors = $trJson.summary.hardErrors
    Gate-Pass "traceability-index.json: $trCount actions, $trWired wired"
    if ($trCount -eq 0) {
      Gate-Fail "Traceability index found 0 actions (expected > 0)"
    }
    if ($trErrors -gt 0) {
      Gate-Warn "Traceability index has $trErrors hard error(s)"
    }
  } else {
    Gate-Fail "traceability-index.json artifact not created"
  }
} finally {
  Pop-Location
}

# ----------------------------------------------------------------
# Section 6: Anti-sprawl structural checks
# ----------------------------------------------------------------
Write-Host "`n-- Anti-Sprawl Structural --"

# No reports/ tracked by git
$reportsTracked = git -C $root ls-files -- "reports" 2>$null
if ([string]::IsNullOrWhiteSpace($reportsTracked)) {
  Gate-Pass "No reports/ tracked by git"
} else {
  Gate-Fail "reports/ has tracked files"
}

# No docs/reports/ tracked by git
$docsReportsTracked = git -C $root ls-files -- "docs/reports" 2>$null
if ([string]::IsNullOrWhiteSpace($docsReportsTracked)) {
  Gate-Pass "No docs/reports/ tracked by git"
} else {
  Gate-Fail "docs/reports/ has tracked files"
}

# .gitignore covers artifacts
$gitignoreContent = Get-Content (Join-Path $root ".gitignore") -Raw
if ($gitignoreContent -match "artifacts/") {
  Gate-Pass ".gitignore covers artifacts/"
} else {
  Gate-Fail ".gitignore missing artifacts/ rule"
}

# ----------------------------------------------------------------
# Section 7: Governance scripts contain expected patterns
# ----------------------------------------------------------------
Write-Host "`n-- Code Hygiene --"

$govChecks = @{
  "scripts/governance/verifyRepoHygiene.ts" = "no-forbidden-dirs"
  "scripts/governance/buildPendingTargetsIndex.ts" = "pendingTargets"
  "scripts/governance/buildTraceabilityIndex.ts" = "parseActionRegistry"
}

foreach ($gf in $govChecks.Keys) {
  $gfPath = Join-Path $root $gf
  if (Test-Path -LiteralPath $gfPath) {
    $content = Get-Content $gfPath -Raw
    $expected = $govChecks[$gf]
    if ($content -match $expected) {
      Gate-Pass "$gf contains expected gate logic ($expected)"
    } else {
      Gate-Fail "$gf missing expected pattern: $expected"
    }
  } else {
    Gate-Fail "$gf not found"
  }
}

# ----------------------------------------------------------------
# Section 8: TypeScript compilation
# ----------------------------------------------------------------
Write-Host "`n-- TypeScript Compile --"

Push-Location $root
try {
  $tscApi = pnpm -C apps/api exec tsc --noEmit 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0 -or [string]::IsNullOrWhiteSpace($tscApi)) {
    Gate-Pass "apps/api TSC clean"
  } else {
    Gate-Fail "apps/api TSC failed"
    Write-Host $tscApi | Select-Object -First 10
  }

  $tscWeb = pnpm -C apps/web exec tsc --noEmit 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0 -or [string]::IsNullOrWhiteSpace($tscWeb)) {
    Gate-Pass "apps/web TSC clean"
  } else {
    Gate-Fail "apps/web TSC failed"
    Write-Host $tscWeb | Select-Object -First 10
  }
} finally {
  Pop-Location
}

# ----------------------------------------------------------------
# Section 9: verify-latest points to Phase 73
# ----------------------------------------------------------------
Write-Host "`n-- verify-latest --"

$verifyLatest = Get-Content (Join-Path $root "scripts/verify-latest.ps1") -Raw
if ($verifyLatest -match "phase73|Phase.73") {
  Gate-Pass "verify-latest.ps1 references Phase 73"
} else {
  Gate-Fail "verify-latest.ps1 does not reference Phase 73"
}

# ----------------------------------------------------------------
# Results
# ----------------------------------------------------------------
Write-Host "`n=== Phase 73 Results: $pass/$($pass+$fail) passed, $warn warning(s) ===" -ForegroundColor Cyan

if ($fail -gt 0) {
  Write-Host "  $fail FAILURE(s) -- see above" -ForegroundColor Red
  exit 1
}
exit 0
