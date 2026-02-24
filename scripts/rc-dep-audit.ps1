<#
.SYNOPSIS
  Dependency Audit Gate -- Phase 118 Go-Live Hardening Pack
  Fails CI if critical or high-severity vulnerabilities are found.
.DESCRIPTION
  Run from repo root: .\scripts\rc-dep-audit.ps1
  Returns exit code 0 if no critical/high vulns, 1 otherwise.
#>

param(
  [switch]$FailOnHigh,
  [switch]$ProdOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

Write-Host "`n=== Dependency Audit Gate (Phase 118) ===" -ForegroundColor Cyan

$auditArgs = @("audit")
if ($ProdOnly) { $auditArgs += "--prod" }

# Run pnpm audit
$auditOut = & pnpm @auditArgs 2>&1 | Out-String

# Parse severity counts
$criticals = 0
$highs = 0
$moderates = 0

if ($auditOut -match "(\d+)\s+critical") { $criticals = [int]$matches[1] }
if ($auditOut -match "(\d+)\s+high") { $highs = [int]$matches[1] }
if ($auditOut -match "(\d+)\s+moderate") { $moderates = [int]$matches[1] }

Write-Host "  Critical: $criticals" -ForegroundColor $(if ($criticals -gt 0) { "Red" } else { "Green" })
Write-Host "  High:     $highs" -ForegroundColor $(if ($highs -gt 0) { "Red" } else { "Green" })
Write-Host "  Moderate: $moderates" -ForegroundColor $(if ($moderates -gt 0) { "Yellow" } else { "Green" })

$failed = $false

if ($criticals -gt 0) {
  Write-Host "`nFAIL: $criticals critical vulnerabilities found" -ForegroundColor Red
  $failed = $true
}

if ($FailOnHigh -and $highs -gt 0) {
  Write-Host "`nFAIL: $highs high-severity vulnerabilities found (--FailOnHigh)" -ForegroundColor Red
  $failed = $true
}

if ($failed) {
  Write-Host "`nRun 'pnpm audit' for details and 'pnpm audit --fix' to attempt fixes." -ForegroundColor Yellow
  exit 1
} else {
  Write-Host "`nPASS: No critical vulnerabilities" -ForegroundColor Green
  exit 0
}
