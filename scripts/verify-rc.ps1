# scripts/verify-rc.ps1
# Phase 501 -- Single RC Verify Orchestrator
# Runs every gate from docs/release/RC_SCOPE.md and produces:
#   - Machine-readable report.json
#   - Human-readable output.txt
# ASCII only (BUG-055). PowerShell 5.1 compatible.
#
# Usage:
#   .\scripts\verify-rc.ps1                  # default evidence dir
#   .\scripts\verify-rc.ps1 -EvidenceDir X   # custom evidence dir
#   .\scripts\verify-rc.ps1 -SkipDocker      # skip gates needing Docker

param(
  [string]$EvidenceDir = "",
  [switch]$SkipDocker
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot

if (-not $EvidenceDir) {
  $EvidenceDir = Join-Path $root "evidence\wave-35\501-W35-P2-RC-VERIFY-ORCHESTRATOR\verify-rc"
}

if (-not (Test-Path -LiteralPath $EvidenceDir)) {
  New-Item -ItemType Directory -Path $EvidenceDir -Force | Out-Null
}

$outputFile = Join-Path $EvidenceDir "output.txt"
$reportFile = Join-Path $EvidenceDir "report.json"

# Logging helper -- writes to console and output file
$script:outputLines = @()
function Log([string]$msg) {
  Write-Host $msg
  $script:outputLines += $msg
}

Log "============================================"
Log "  RC-1 Verify Orchestrator"
Log "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Log "  Root: $root"
Log "============================================"
Log ""

# Gate definitions: Id, Label, Type (node|tsc|ps1), Command/Path, Required
# Type: node = node <path>, tsc = npx tsc --noEmit -p <path>, ps1 = powershell <path>
$gates = @(
  @{ Id="G01"; Label="Prompts Tree Health";       Type="node"; Path="scripts/qa-gates/prompts-tree-health.mjs";       Required=$true  },
  @{ Id="G02"; Label="Phase Index Freshness";      Type="node"; Path="scripts/qa-gates/phase-index-gate.mjs";          Required=$true  },
  @{ Id="G03"; Label="Integration-Pending Budget"; Type="node"; Path="scripts/qa-gates/integration-pending-budget.mjs"; Required=$true  },
  @{ Id="G04"; Label="Tier-0 Hospital Cert";       Type="node"; Path="scripts/qa-gates/certification-runner.mjs";      Required=$true  },
  @{ Id="G05"; Label="Country Conformance";        Type="node"; Path="scripts/qa-gates/country-conformance-runner.mjs"; Required=$true  },
  @{ Id="G06"; Label="RPC Trace Compare";          Type="node"; Path="scripts/qa-gates/rpc-trace-compare.mjs";         Required=$true  },
  @{ Id="G07a"; Label="TypeScript API";            Type="pnpm-tsc"; Path="apps/api";                                        Required=$true  },
  @{ Id="G07b"; Label="TypeScript Web";            Type="pnpm-tsc"; Path="apps/web";                                        Required=$true  },
  @{ Id="G08"; Label="Security Pre-Cert";          Type="ps1";  Path="scripts/security/run-precert.ps1";               Required=$true  },
  @{ Id="G09"; Label="Performance Smoke";          Type="ps1";  Path="scripts/perf/run-soak.ps1";                      Required=$false },
  @{ Id="G10"; Label="Defect Budget";              Type="ps1";  Path="scripts/qa/bug-bash-run.ps1";                    Required=$true  },
  @{ Id="G11"; Label="Production Posture";         Type="node"; Path="scripts/qa-gates/prod-posture.mjs";              Required=$true  },
  @{ Id="G12"; Label="Data Plane Posture";         Type="node"; Path="qa/gauntlet/gates/g12-data-plane.mjs";           Required=$true  },
  @{ Id="G13"; Label="VistA Baseline Probe";       Type="ps1";  Path="scripts/vista-baseline-probe.ps1";              Required=$false },
  @{ Id="G14"; Label="Tier-0 Outpatient Proof";    Type="ps1";  Path="scripts/verify-tier0.ps1";                      Required=$false }
)

# Gates that require live Docker/VistA infrastructure.
$dockerDependentGateIds = @('G04', 'G09', 'G13', 'G14')

$results = @()
$totalPass = 0
$totalFail = 0
$totalSkip = 0

foreach ($gate in $gates) {
  $id    = $gate.Id
  $label = $gate.Label
  $gtype = $gate.Type
  $gpath = $gate.Path
  $req   = $gate.Required

  $fullPath = Join-Path $root $gpath

  Log "--- $id : $label ---"

  if ($SkipDocker -and ($dockerDependentGateIds -contains $id)) {
    Log "  [SKIP] Docker-dependent gate skipped due to -SkipDocker"
    $results += @{
      gateName     = $id
      label        = $label
      status       = "SKIP"
      reason       = "Skipped by -SkipDocker"
      durationMs   = 0
      exitCode     = $null
      required     = $req
    }
    $totalSkip++
    Log ""
    continue
  }

  # Check if script/dir exists
  $pathExists = Test-Path -LiteralPath $fullPath
  if (-not $pathExists) {
    Log "  [SKIP] Script not found: $gpath"
    $results += @{
      gateName     = $id
      label        = $label
      status       = "SKIP"
      reason       = "Script not found: $gpath"
      durationMs   = 0
      exitCode     = $null
      required     = $req
    }
    $totalSkip++
    Log ""
    continue
  }

  # Build command
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $exitCode = 0

  try {
    switch ($gtype) {
      "node" {
        Push-Location $root
        $nodeOut = & node $fullPath 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        Pop-Location
        Log $nodeOut.TrimEnd()
      }
      "tsc" {
        Push-Location $root
        $tscOut = & npx tsc --noEmit -p $fullPath 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        Pop-Location
        if ($tscOut.Trim()) { Log $tscOut.TrimEnd() }
      }
      "pnpm-tsc" {
        Push-Location $root
        $tscOut = & pnpm -C $gpath exec tsc --noEmit 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        Pop-Location
        if ($tscOut.Trim()) { Log $tscOut.TrimEnd() }
      }
      "ps1" {
        Push-Location $root
        $psArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $fullPath)
        # Forward -SkipDocker to child scripts that support it.
        if ($SkipDocker -and ($id -eq 'G13')) {
          $psArgs += '-SkipDocker'
        }
        $ps1Out = & powershell @psArgs 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        Pop-Location
        if ($ps1Out.Trim()) { Log $ps1Out.TrimEnd() }
      }
    }
  } catch {
    $exitCode = 1
    Log "  ERROR: $($_.Exception.Message)"
  } finally {
    # Ensure directory stack is clean even if a gate throws
    while ((Get-Location -Stack -ErrorAction SilentlyContinue).Count -gt 0) {
      Pop-Location -ErrorAction SilentlyContinue
    }
  }

  $sw.Stop()
  $durationMs = $sw.ElapsedMilliseconds

  if ($null -eq $exitCode) { $exitCode = 1 }

  $status = if ($exitCode -eq 0) { "PASS" } else { "FAIL" }

  Log "  [$status] $id ($($durationMs)ms, exit=$exitCode)"
  Log ""

  $results += @{
    gateName     = $id
    label        = $label
    status       = $status
    reason       = ""
    durationMs   = $durationMs
    exitCode     = $exitCode
    required     = $req
  }

  if ($status -eq "PASS") { $totalPass++ } else { $totalFail++ }
}

# Summary
Log "============================================"
Log "  SUMMARY"
Log "============================================"
Log "  PASS: $totalPass"
Log "  FAIL: $totalFail"
Log "  SKIP: $totalSkip"
Log "  TOTAL: $($gates.Count)"
Log ""

$overallStatus = if ($totalFail -eq 0) { "RC_READY" } else { "RC_BLOCKED" }
Log "  Overall: $overallStatus"
Log "============================================"
Log ""

# Write output.txt
$script:outputLines -join "`r`n" | Set-Content -Path $outputFile -Encoding ASCII

# Build report.json
$report = @{
  generatedAt  = (Get-Date -Format 'o')
  overallStatus = $overallStatus
  summary      = @{
    pass  = $totalPass
    fail  = $totalFail
    skip  = $totalSkip
    total = $gates.Count
  }
  gates = @()
}

foreach ($r in $results) {
  $report.gates += @{
    gateName   = $r.gateName
    label      = $r.label
    status     = $r.status
    reason     = $r.reason
    durationMs = $r.durationMs
    exitCode   = $r.exitCode
    required   = $r.required
  }
}

# PowerShell 5.1 ConvertTo-Json -- use -Depth to avoid truncation
$jsonText = $report | ConvertTo-Json -Depth 5
# Write as ASCII to avoid BOM issues (BUG-055/BUG-101)
[System.IO.File]::WriteAllText($reportFile, $jsonText, [System.Text.Encoding]::ASCII)

Log "Report written to: $reportFile"
Log "Output written to: $outputFile"

# Exit code
if ($totalFail -gt 0) {
  exit 1
} else {
  exit 0
}
