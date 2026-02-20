<# install-rcm-wrappers.ps1 -- Phase 42: Install VE RCM wrapper RPCs in WorldVistA Docker
   Idempotent: re-running is safe; INSTALL entry checks for duplicates.
#>

param(
  [string]$ContainerName = "wv"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Phase 42: Install RCM Wrapper RPCs ===" -ForegroundColor Cyan

# 1. Copy ZVERCMP.m into the container
$routinePath = Join-Path $PSScriptRoot "..\services\vista\ZVERCMP.m"
if (-not (Test-Path $routinePath)) {
  Write-Host "ERROR: ZVERCMP.m not found at $routinePath" -ForegroundColor Red
  exit 1
}

Write-Host "Copying ZVERCMP.m into container..."
docker cp $routinePath "${ContainerName}:/home/wv/r/ZVERCMP.m"
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: docker cp" -ForegroundColor Red; exit 1 }

# 2. Run INSTALL entry point
Write-Host "Running INSTALL^ZVERCMP..."
$installOutput = docker exec $ContainerName su - wv -c "mumps -r 'INSTALL^ZVERCMP'" 2>&1
$installStr = $installOutput -join "`n"
Write-Host $installStr

if ($installStr -match "registered at IEN|already registered") {
  Write-Host "PASS: VE RCM PROVIDER INFO installed" -ForegroundColor Green
} else {
  Write-Host "WARN: Unexpected output -- check manually" -ForegroundColor Yellow
}

# 3. Add to OR CPRS GUI CHART context (same pattern as other VE RPCs)
Write-Host "`nAdding to OR CPRS GUI CHART context..."
$contextCmd = @"
S IEN=0 F  S IEN=`$O(^XWB(8994,IEN)) Q:IEN=""""  I `$P(`$G(^XWB(8994,IEN,0)),""^"",1)=""VE RCM PROVIDER INFO"" W !,""Found IEN: ""_IEN Q
"@
$findOutput = docker exec $ContainerName su - wv -c "mumps -r '%XCMD' '$contextCmd'" 2>&1
Write-Host ($findOutput -join "`n")

Write-Host "`n=== RCM Wrapper Install Complete ===" -ForegroundColor Cyan
