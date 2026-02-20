<# Phase 54 -- Alignment Audit v2 PS Wrapper

   Usage:
     .\scripts\audit\run-audit.ps1                  # offline mode (default)
     .\scripts\audit\run-audit.ps1 -Mode integration # integration mode
#>
param(
  [ValidateSet("offline","integration")]
  [string]$Mode = "offline"
)

$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot\..\..

try {
  Write-Host "`n=== Alignment Audit v2 (mode=$Mode) ===" -ForegroundColor Cyan
  & npx tsx scripts/audit/run-audit.ts --mode=$Mode
  $auditExit = $LASTEXITCODE

  if (Test-Path -LiteralPath "artifacts\audit\audit-summary.json") {
    Write-Host "`nGenerating triage report..." -ForegroundColor Cyan
    & npx tsx scripts/audit/generate-triage.ts
  }

  exit $auditExit
} finally {
  Pop-Location
}
