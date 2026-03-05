# scripts/verify-tier0.ps1
# Tier-0 Outpatient Proof Run
#
# Runs the T0 journey (login -> patient list -> vitals -> allergies -> problems -> logout)
# against the live API and writes a timestamped artifact under artifacts/.
# Exit 0 = all steps passed. Exit 1 = any failure.
#
# ASCII only (BUG-055). PowerShell 5.1 compatible.
#
# Usage:
#   .\scripts\verify-tier0.ps1                           # defaults
#   .\scripts\verify-tier0.ps1 -BaseUrl http://host:3001 # custom API
#   .\scripts\verify-tier0.ps1 -SkipDocker               # skip Docker check

param(
  [string]$BaseUrl = "http://127.0.0.1:3001",
  [string]$AccessCode = "",
  [string]$VerifyCode = "",
  [switch]$SkipDocker
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot

# -- Lane detection (Phase 575) -------------------------------------------
# Try to detect which VistA lane is active via /vista/swap-boundary
$detectedLane = ""
try {
  $swapResp = Invoke-WebRequest -Uri "$BaseUrl/vista/swap-boundary" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
  if ($swapResp.StatusCode -eq 200) {
    $swapJson = $swapResp.Content | ConvertFrom-Json
    if ($swapJson.boundary.instanceId) {
      $detectedLane = $swapJson.boundary.instanceId
    }
  }
} catch {
  # API may not be running yet -- fall through to credential defaults
}

# Resolve credentials: param > env > .env.local > lane-based default
if (-not $AccessCode) { $AccessCode = $env:VISTA_ACCESS_CODE }
if (-not $VerifyCode) { $VerifyCode = $env:VISTA_VERIFY_CODE }
if ((-not $AccessCode) -or (-not $VerifyCode)) {
  $envFile = Join-Path $root "apps\api\.env.local"
  if (Test-Path -LiteralPath $envFile) {
    foreach ($line in (Get-Content $envFile)) {
      if ($line -match '^VISTA_ACCESS_CODE=(.+)$' -and -not $AccessCode) {
        $AccessCode = $Matches[1]
      }
      if ($line -match '^VISTA_VERIFY_CODE=(.+)$' -and -not $VerifyCode) {
        $VerifyCode = $Matches[1]
      }
    }
  }
}
# Lane-based defaults (Phase 575)
if (-not $AccessCode -or -not $VerifyCode) {
  if ($detectedLane -eq "vehu") {
    if (-not $AccessCode) { $AccessCode = "PRO1234" }
    if (-not $VerifyCode) { $VerifyCode = "PRO1234!!" }
  } elseif ($detectedLane -eq "worldvista-ehr" -or $detectedLane -eq "" -or $detectedLane -eq "worldvista-docker-sandbox") {
    if (-not $AccessCode) { $AccessCode = "PROV123" }
    if (-not $VerifyCode) { $VerifyCode = "PROV123!!" }
  } else {
    # Unknown lane -- refuse to guess
    if (-not $AccessCode -or -not $VerifyCode) {
      Write-Host "[ERROR] Unknown VistA lane '$detectedLane' and no credentials provided."
      Write-Host "  Supply -AccessCode / -VerifyCode, or set VISTA_ACCESS_CODE / VISTA_VERIFY_CODE env vars."
      exit 1
    }
  }
}

# -- Artifact setup ----------------------------------------------------------
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$artifactsDir = Join-Path $root "artifacts"
if (-not (Test-Path -LiteralPath $artifactsDir)) {
  New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null
}
$artifactName = "tier0-proof-$ts"
$outputFile = Join-Path $artifactsDir "$artifactName.txt"

$script:outputLines = @()
function Log([string]$msg) {
  Write-Host $msg
  $script:outputLines += $msg
}

Log "============================================"
Log "  Tier-0 Outpatient Proof Run"
Log "  $ts"
Log "  API: $BaseUrl"
Log "============================================"
Log ""

$exitCode = 0

# -- Gate 1: Docker check (optional) -------------------------------------
if (-not $SkipDocker) {
  Log "--- Gate 1: Docker VistA container ---"
  if ($detectedLane) {
    Log "  Detected lane: $detectedLane (via /vista/swap-boundary)"
  }
  try {
    $dockerOutWv = docker ps --filter "name=wv" --format "{{.Names}}: {{.Status}}" 2>&1 | Out-String
    $dockerOutVehu = docker ps --filter "name=vehu" --format "{{.Names}}: {{.Status}}" 2>&1 | Out-String
    if ($dockerOutWv -match "wv" -or $dockerOutVehu -match "vehu") {
      Log "  [PASS] VistA container running"
      if ($dockerOutVehu -match "vehu") { Log "  $($dockerOutVehu.Trim())" }
      if ($dockerOutWv -match "wv") { Log "  $($dockerOutWv.Trim())" }
    } else {
      Log "  [WARN] VistA container not found (checked both 'wv' and 'vehu')"
    }
  } catch {
    Log "  [WARN] Docker not available: $($_.Exception.Message)"
  }
  Log ""
} else {
  Log "--- Gate 1: Docker check SKIPPED ---"
  Log ""
}

# -- Gate 2: API reachability ---------------------------------------------
Log "--- Gate 2: API reachability ---"
try {
  $healthResp = Invoke-WebRequest -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
  if ($healthResp.StatusCode -eq 200) {
    Log "  [PASS] API responded 200 at /health"
  } else {
    Log "  [FAIL] API returned status $($healthResp.StatusCode)"
    $exitCode = 1
  }
} catch {
  Log "  [FAIL] API not reachable at $BaseUrl"
  Log "  Error: $($_.Exception.Message)"
  Log ""
  Log "  To start the API:"
  Log "    cd apps/api"
  Log "    npx tsx --env-file=.env.local src/index.ts"
  Log ""
  # Write partial output
  $script:outputLines -join "`r`n" | Set-Content -Path $outputFile -Encoding ASCII
  Log "Output written to: $outputFile"
  exit 1
}
Log ""

# -- Gate 3: Run T0 journey via clinic-day-runner ------------------------
Log "--- Gate 3: Tier-0 Outpatient Journey (T0) ---"
$runnerPath = Join-Path $root "scripts\qa\clinic-day-runner.mjs"
if (-not (Test-Path -LiteralPath $runnerPath)) {
  Log "  [FAIL] Runner not found at scripts/qa/clinic-day-runner.mjs"
  $exitCode = 1
} else {
  try {
    Push-Location $root
    $runnerOut = & node $runnerPath --base-url $BaseUrl --journey T0 --artifact-name $artifactName --access-code $AccessCode --verify-code $VerifyCode 2>&1 | Out-String
    $runnerExit = $LASTEXITCODE
    Pop-Location

    Log $runnerOut.TrimEnd()
    Log ""

    if ($runnerExit -eq 0) {
      Log "  [PASS] T0 journey completed -- all steps green"
    } else {
      Log "  [FAIL] T0 journey had failures (exit code $runnerExit)"
      $exitCode = 1
    }
  } catch {
    Log "  [FAIL] Runner threw: $($_.Exception.Message)"
    $exitCode = 1
    # Clean location stack
    while ((Get-Location -Stack -ErrorAction SilentlyContinue).Count -gt 0) {
      Pop-Location -ErrorAction SilentlyContinue
    }
  }
}
Log ""

# -- Gate 4: Artifact integrity -------------------------------------------
Log "--- Gate 4: Artifact integrity ---"
$jsonArtifact = Join-Path $artifactsDir "$artifactName.json"
if (Test-Path -LiteralPath $jsonArtifact) {
  $raw = [System.IO.File]::ReadAllText($jsonArtifact)
  # Strip BOM if present (BUG-064)
  if ($raw.Length -gt 0 -and [int]$raw[0] -eq 65279) {
    $raw = $raw.Substring(1)
  }
  try {
    $parsed = $raw | ConvertFrom-Json
    $passed = $parsed.summary.passed
    $total  = $parsed.summary.totalJourneys
    $steps  = $parsed.summary.passedSteps
    $totalS = $parsed.summary.totalSteps
    Log "  Journeys: $passed/$total passed"
    Log "  Steps:    $steps/$totalS passed"
    Log "  [PASS] Artifact written and parseable"
  } catch {
    Log "  [FAIL] Artifact JSON is invalid"
    $exitCode = 1
  }
} else {
  Log "  [FAIL] Artifact JSON not found at $jsonArtifact"
  $exitCode = 1
}
Log ""

# -- Summary --------------------------------------------------------------
Log "============================================"
if ($exitCode -eq 0) {
  Log "  TIER-0 PROOF: PASS"
  Log "  All outpatient-safe RPCs verified end-to-end."
} else {
  Log "  TIER-0 PROOF: FAIL"
  Log "  One or more gates did not pass. See output above."
}
Log "============================================"
Log ""
Log "Artifact: artifacts/$artifactName.json"
Log "Output:   artifacts/$artifactName.txt"
Log ""

# Write output log
$script:outputLines -join "`r`n" | Set-Content -Path $outputFile -Encoding ASCII

exit $exitCode
