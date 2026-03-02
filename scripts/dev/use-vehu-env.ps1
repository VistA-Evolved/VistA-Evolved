<#
.SYNOPSIS
    Sets VEHU VistA environment variables in the current PowerShell session.

.DESCRIPTION
    Phase 477 -- Helper to quickly switch to VEHU VistA profile.
    Sets VISTA_HOST, VISTA_PORT, VISTA_ACCESS_CODE, VISTA_VERIFY_CODE,
    VISTA_CONTEXT and VISTA_INSTANCE_ID for the current shell session.

    Does NOT modify .env.local -- only sets process-level env vars.

.EXAMPLE
    . .\scripts\dev\use-vehu-env.ps1
    # Then start API as usual
#>

$env:VISTA_HOST = "127.0.0.1"
$env:VISTA_PORT = "9431"
$env:VISTA_ACCESS_CODE = "PRO1234"
$env:VISTA_VERIFY_CODE = "PRO1234!!"
$env:VISTA_CONTEXT = "OR CPRS GUI CHART"
$env:VISTA_INSTANCE_ID = "vehu-dev"

Write-Host "VEHU environment set:" -ForegroundColor Cyan
Write-Host "  VISTA_HOST       = $env:VISTA_HOST"
Write-Host "  VISTA_PORT       = $env:VISTA_PORT"
Write-Host "  VISTA_CONTEXT    = $env:VISTA_CONTEXT"
Write-Host "  VISTA_INSTANCE_ID= $env:VISTA_INSTANCE_ID"
Write-Host "  VISTA_ACCESS_CODE= (set)"
Write-Host "  VISTA_VERIFY_CODE= (set)"
Write-Host ""
Write-Host "Start API with: npx tsx apps/api/src/index.ts" -ForegroundColor Yellow
