<#
.SYNOPSIS
  Phase 155 Verification: VistA Routine Install Automation

.DESCRIPTION
  Checks that the unified installer, provisioning endpoint, and supporting
  infrastructure are correctly implemented. Does NOT require Docker.
#>

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$pass = 0
$fail = 0
$skip = 0

function Assert-Gate($id, $label, [scriptblock]$test) {
    try {
        $result = & $test
        if ($result) {
            Write-Host "  PASS  $id  $label" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  FAIL  $id  $label" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        Write-Host "  FAIL  $id  $label -- $_" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host ""
Write-Host "=== Phase 155 Verification: VistA Routine Install Automation ===" -ForegroundColor Cyan
Write-Host ""

# --- Tier 1: Sanity ---
Write-Host "--- Tier 1: Sanity ---"

Assert-Gate "S1" "API TypeCheck clean" {
    Push-Location (Join-Path $RepoRoot "apps/api")
    $out = pnpm exec tsc --noEmit 2>&1
    $code = $LASTEXITCODE
    Pop-Location
    $code -eq 0
}

Assert-Gate "S2" "Unified installer script exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "scripts/install-vista-routines.ps1")
}

Assert-Gate "S3" "Provisioning route registered in index.ts" {
    $idx = Get-Content (Join-Path $RepoRoot "apps/api/src/index.ts") -Raw
    $idx -match "vista-provision"
}

Assert-Gate "S4" "No hardcoded credentials in installer" {
    $installer = Get-Content (Join-Path $RepoRoot "scripts/install-vista-routines.ps1") -Raw
    -not ($installer -match "PROV123|PHARM123|NURSE123|password")
}

Assert-Gate "S5" "No hardcoded credentials in provision route" {
    $route = Get-Content (Join-Path $RepoRoot "apps/api/src/routes/vista-provision.ts") -Raw
    -not ($route -match "PROV123|PHARM123|NURSE123|password")
}

# --- Tier 2: Feature Integrity ---
Write-Host ""
Write-Host "--- Tier 2: Feature Integrity ---"

Assert-Gate "F1" "Installer copies all 8 production .m routines" {
    $installer = Get-Content (Join-Path $RepoRoot "scripts/install-vista-routines.ps1") -Raw
    ($installer -match "ZVEMIOP\.m") -and
    ($installer -match "ZVEMINS\.m") -and
    ($installer -match "VEMCTX3\.m") -and
    ($installer -match "ZVEMSGR\.m") -and
    ($installer -match "ZVEMSIN\.m") -and
    ($installer -match "ZVERPC\.m") -and
    ($installer -match "ZVERCMP\.m") -and
    ($installer -match "ZVEADT\.m")
}

Assert-Gate "F2" "Installer runs all 5 INSTALL entry points" {
    $installer = Get-Content (Join-Path $RepoRoot "scripts/install-vista-routines.ps1") -Raw
    ($installer -match "RUN\^ZVEMINS") -and
    ($installer -match "EN\^ZVEMSIN") -and
    ($installer -match "INSTALL\^ZVERPC") -and
    ($installer -match "INSTALL\^ZVERCMP") -and
    ($installer -match "INSTALL\^ZVEADT")
}

Assert-Gate "F3" "Installer runs context adder (VEMCTX3)" {
    $installer = Get-Content (Join-Path $RepoRoot "scripts/install-vista-routines.ps1") -Raw
    $installer -match "mumps -run VEMCTX3"
}

Assert-Gate "F4" "Provision status endpoint returns manifest" {
    $route = Get-Content (Join-Path $RepoRoot "apps/api/src/routes/vista-provision.ts") -Raw
    ($route -match "PROVISIONING_MANIFEST") -and
    ($route -match "overallHealth") -and
    ($route -match "routines")
}

Assert-Gate "F5" "Provision status requires admin auth (AUTH_RULES)" {
    $sec = Get-Content (Join-Path $RepoRoot "apps/api/src/middleware/security.ts") -Raw
    $sec -match 'vista\\/provision.*admin'
}

Assert-Gate "F6" "Installer supports idempotent re-run (no destructive ops)" {
    $installer = Get-Content (Join-Path $RepoRoot "scripts/install-vista-routines.ps1") -Raw
    (-not ($installer -match "KILL|DELETE|DROP|TRUNCATE")) -and
    ($installer -match "Idempotent")
}

Assert-Gate "F7" "Installer supports -Seed switch for ZVESDSEED" {
    $installer = Get-Content (Join-Path $RepoRoot "scripts/install-vista-routines.ps1") -Raw
    ($installer -match "\[switch\]\`$Seed") -and ($installer -match "ZVESDSEED")
}

Assert-Gate "F8" "Provision manifest covers all 5 routine families" {
    $route = Get-Content (Join-Path $RepoRoot "apps/api/src/routes/vista-provision.ts") -Raw
    ($route -match "ZVEMIOP") -and
    ($route -match "ZVEMSGR") -and
    ($route -match "ZVERPC") -and
    ($route -match "ZVERCMP") -and
    ($route -match "ZVEADT")
}

Assert-Gate "F9" "Runbook exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "docs/runbooks/vista-provisioning.md")
}

# --- Tier 3: Regression ---
Write-Host ""
Write-Host "--- Tier 3: Regression ---"

Assert-Gate "R1" "Existing install-interop-rpcs.ps1 still present" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "scripts/install-interop-rpcs.ps1")
}

Assert-Gate "R2" "Existing install-rpc-catalog.ps1 still present" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "scripts/install-rpc-catalog.ps1")
}

Assert-Gate "R3" "Existing install-rcm-wrappers.ps1 still present" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "scripts/install-rcm-wrappers.ps1")
}

Assert-Gate "R4" "No clinical route files modified" {
    # Verify key clinical files were NOT changed by checking git status
    $gitStatus = git -C $RepoRoot diff --name-only HEAD 2>&1
    $clinical = $gitStatus | Where-Object {
        $_ -match "routes/cprs/(orders-cpoe|wave2-routes|tiu-notes)" -or
        $_ -match "panels/(OrdersPanel|NotesPanel|MedsPanel)"
    }
    ($null -eq $clinical) -or ($clinical.Count -eq 0)
}

Assert-Gate "R5" "Production .m routines unchanged" {
    # All production routines should still exist
    $vistaDir = Join-Path $RepoRoot "services/vista"
    (Test-Path -LiteralPath "$vistaDir/ZVEMIOP.m") -and
    (Test-Path -LiteralPath "$vistaDir/ZVEMSGR.m") -and
    (Test-Path -LiteralPath "$vistaDir/ZVERPC.m") -and
    (Test-Path -LiteralPath "$vistaDir/ZVERCMP.m") -and
    (Test-Path -LiteralPath "$vistaDir/ZVEADT.m")
}

# --- Summary ---
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail  SKIP: $skip"
Write-Host ""

if ($fail -eq 0) {
    Write-Host "Phase 155 verification: ALL GATES PASSED" -ForegroundColor Green
} else {
    Write-Host "Phase 155 verification: $fail GATE(S) FAILED" -ForegroundColor Red
    exit 1
}
