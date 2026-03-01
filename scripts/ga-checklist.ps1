<#
.SYNOPSIS
  GA Readiness Checklist verifier for VistA-Evolved.
.DESCRIPTION
  Reads GA_READINESS_CHECKLIST.md gate definitions and verifies evidence
  presence. Outputs PASS/FAIL per gate with overall summary.
.PARAMETER Verbose
  Show detailed per-gate output.
.EXAMPLE
  .\scripts\ga-checklist.ps1
  .\scripts\ga-checklist.ps1 -Verbose
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

# ── Gate definitions ─────────────────────────────────────────────────
# Each gate: id, description, evidence paths (ALL must exist)
$gates = @(
    @{ id = "G01"; desc = "TLS Termination";
       paths = @("infra/tls/Caddyfile") },
    @{ id = "G02"; desc = "DR Restore Validation";
       paths = @("scripts/backup-restore.mjs") },
    @{ id = "G03"; desc = "Performance Budgets";
       paths = @("config/performance-budgets.json") },
    @{ id = "G04"; desc = "Security Certification Runner";
       paths = @("scripts/verify-wave16-security.ps1") },
    @{ id = "G05"; desc = "Interop Certification Runner";
       paths = @("scripts/verify-wave18-ecosystem.ps1") },
    @{ id = "G06"; desc = "Department Packs Certification";
       paths = @("scripts/verify-wave17-packs.ps1") },
    @{ id = "G07"; desc = "Scale Certification Runner";
       paths = @("scripts/verify-wave19-analytics.ps1") },
    @{ id = "G08"; desc = "Audit Trail Integrity";
       paths = @("apps/api/src/lib/immutable-audit.ts") },
    @{ id = "G09"; desc = "PHI Redaction";
       paths = @("apps/api/src/lib/phi-redaction.ts") },
    @{ id = "G10"; desc = "Policy Engine";
       paths = @("apps/api/src/auth/policy-engine.ts") },
    @{ id = "G11"; desc = "Module Guard";
       paths = @("apps/api/src/middleware/module-guard.ts") },
    @{ id = "G12"; desc = "Data Plane Posture";
       paths = @("apps/api/src/posture/data-plane-posture.ts") },
    @{ id = "G13"; desc = "RCM Audit Trail";
       paths = @("apps/api/src/rcm/audit/rcm-audit.ts") },
    @{ id = "G14"; desc = "Observability Stack";
       paths = @("apps/api/src/telemetry/tracing.ts",
                  "apps/api/src/telemetry/metrics.ts") },
    @{ id = "G15"; desc = "OIDC / IAM";
       paths = @("apps/api/src/auth/oidc-provider.ts") },
    @{ id = "G16"; desc = "Release Train Governance";
       paths = @("apps/api/src/services/release-train-service.ts") },
    @{ id = "G17"; desc = "Support Ops";
       paths = @("apps/api/src/services/support-ops-service.ts") },
    @{ id = "G18"; desc = "Data Rights Operations";
       paths = @("apps/api/src/services/data-rights-service.ts") },
    @{ id = "G19"; desc = "Trust Center Documentation";
       paths = @("docs/trust-center/TRUST_CENTER.md") }
)

# ── Run checks ───────────────────────────────────────────────────────
$passCount = 0
$failCount = 0
$results = @()

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VistA-Evolved GA Readiness Checklist" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($gate in $gates) {
    $allExist = $true
    $missingPaths = @()

    foreach ($p in $gate.paths) {
        $fullPath = Join-Path $repoRoot $p
        if (-not (Test-Path -LiteralPath $fullPath)) {
            $allExist = $false
            $missingPaths += $p
        }
    }

    if ($allExist) {
        $status = "PASS"
        $passCount++
        $color = "Green"
    } else {
        $status = "FAIL"
        $failCount++
        $color = "Red"
    }

    $line = "  [$status] $($gate.id): $($gate.desc)"
    Write-Host $line -ForegroundColor $color

    if (-not $allExist -and $VerbosePreference -eq "Continue") {
        foreach ($mp in $missingPaths) {
            Write-Host "         Missing: $mp" -ForegroundColor Yellow
        }
    }

    $results += @{
        gate = $gate.id
        description = $gate.desc
        status = $status
        missing = $missingPaths
    }
}

# ── Summary ──────────────────────────────────────────────────────────
$total = $gates.Count
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "  Total: $total  |  PASS: $passCount  |  FAIL: $failCount" -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host "  OVERALL: GA READY" -ForegroundColor Green
} else {
    Write-Host "  OVERALL: NOT READY ($failCount gates failing)" -ForegroundColor Red
}
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host ""

# ── Write artifacts ──────────────────────────────────────────────────
$artifactDir = Join-Path $repoRoot "artifacts/ga-checklist"
if (-not (Test-Path -LiteralPath $artifactDir)) {
    New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
$summaryObj = @{
    timestamp = (Get-Date -Format "o")
    totalGates = $total
    passed = $passCount
    failed = $failCount
    gaReady = ($failCount -eq 0)
    gates = $results
}

$jsonPath = Join-Path $artifactDir "checklist-$timestamp.json"
$summaryObj | ConvertTo-Json -Depth 5 | Out-File -FilePath $jsonPath -Encoding ascii
Write-Host "  Evidence written to: $jsonPath" -ForegroundColor DarkGray

# ── Exit code ────────────────────────────────────────────────────────
if ($failCount -gt 0) {
    exit 1
}
exit 0
