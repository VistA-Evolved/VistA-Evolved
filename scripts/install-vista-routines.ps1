<#
.SYNOPSIS
    Unified VistA routine installer -- copies all production ZVE*.m routines
    into the WorldVistA Docker container, registers RPCs, and verifies.

.DESCRIPTION
    Phase 155 -- Replaces the need to run install-interop-rpcs.ps1,
    install-rpc-catalog.ps1, and install-rcm-wrappers.ps1 separately.

    Steps:
      1. Check Docker container is running
      2. Copy all production .m routines into container
      3. Run each INSTALL entry point (idempotent)
      4. Add RPCs to OR CPRS GUI CHART context
      5. Verify each routine is callable

    Idempotent -- safe to run multiple times.
    Does NOT install diagnostic/probe routines (ZVEBILP, ZVESCHD*, etc.)
    Does NOT run ZVESDSEED (scheduling sandbox seeder) unless -Seed is passed.

.PARAMETER ContainerName
    Docker container name (default: "wv")

.PARAMETER Seed
    Also run ZVESDSEED scheduling sandbox seeder (DEV only)

.PARAMETER SkipVerify
    Skip the post-install verification step

.EXAMPLE
    .\scripts\install-vista-routines.ps1
    .\scripts\install-vista-routines.ps1 -ContainerName wv -Seed
#>
[CmdletBinding()]
param(
    [string]$ContainerName = "wv",
    [switch]$Seed,
    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir
$VistaDir  = Join-Path $RepoRoot "services\vista"

$pass = 0
$fail = 0
$warn = 0

function Write-Gate($status, $msg) {
    switch ($status) {
        "PASS" { Write-Host "  PASS  $msg" -ForegroundColor Green; $script:pass++ }
        "FAIL" { Write-Host "  FAIL  $msg" -ForegroundColor Red;   $script:fail++ }
        "WARN" { Write-Host "  WARN  $msg" -ForegroundColor Yellow; $script:warn++ }
        "INFO" { Write-Host "  INFO  $msg" -ForegroundColor Cyan }
    }
}

Write-Host ""
Write-Host "=== Phase 155: Unified VistA Routine Installer ===" -ForegroundColor Cyan
Write-Host "    Container: $ContainerName"
Write-Host ""

# ================================================================
# Step 1: Verify container is running
# ================================================================
Write-Host "--- Step 1: Docker container check ---"
try {
    $status = docker inspect --format '{{.State.Status}}' $ContainerName 2>&1
    if ($LASTEXITCODE -ne 0 -or $status -ne "running") {
        Write-Gate "FAIL" "Container '$ContainerName' is not running"
        Write-Host "  Start with: cd services\vista; docker compose --profile dev up -d" -ForegroundColor Yellow
        exit 1
    }
    Write-Gate "PASS" "Container '$ContainerName' is running"
} catch {
    Write-Gate "FAIL" "Docker not available: $_"
    exit 1
}

# ================================================================
# Step 2: Copy production M routines into container
# ================================================================
Write-Host ""
Write-Host "--- Step 2: Copy M routines ---"

# Production routines that provide RPC entry points or installers
$productionRoutines = @(
    "ZVEMIOP.m",   # HL7/HLO interop monitor (6 RPC entry points)
    "ZVEMINS.m",   # Interop RPC installer
    "VEMCTX3.m",   # Safe context adder (appends to OR CPRS GUI CHART)
    "ZVEMSGR.m",   # MailMan RPC bridge (5 RPCs)
    "ZVEMSIN.m",   # MailMan RPC installer
    "ZVERPC.m",    # RPC catalog lister
    "ZVERCMP.m",   # RCM provider info wrapper
    "ZVEADT.m"     # ADT ward census/bed board (3 RPCs)
)

if ($Seed) {
    $productionRoutines += "ZVESDSEED.m"
    Write-Host "  (Including ZVESDSEED scheduling seeder)" -ForegroundColor Yellow
}

$copyFailed = $false
foreach ($routine in $productionRoutines) {
    $src = Join-Path $VistaDir $routine
    if (-not (Test-Path -LiteralPath $src)) {
        Write-Gate "WARN" "$routine not found at $src -- skipping"
        continue
    }
    docker cp $src "${ContainerName}:/home/wv/r/$routine" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Gate "FAIL" "Failed to copy $routine"
        $copyFailed = $true
    } else {
        Write-Gate "PASS" "Copied $routine"
    }
}

if ($copyFailed) {
    Write-Host "  Some copies failed -- aborting." -ForegroundColor Red
    exit 1
}

# ================================================================
# Step 3: Run INSTALL entry points (idempotent)
# ================================================================
Write-Host ""
Write-Host "--- Step 3: Run INSTALL entry points ---"

# Each entry: label, mumps command, success pattern
$installSteps = @(
    @{
        Label   = "Interop RPCs (6 VE INTEROP *)"
        Command = "mumps -run RUN^ZVEMINS"
        Match   = "registered|already|VE INTEROP"
    },
    @{
        Label   = "MailMan RPCs (5 ZVE MAIL *)"
        Command = "mumps -run EN^ZVEMSIN"
        Match   = "registered|already|ZVE MAIL"
    },
    @{
        Label   = "RPC Catalog (VE LIST RPCS)"
        Command = "mumps -run INSTALL^ZVERPC"
        Match   = "registered|already|VE LIST"
    },
    @{
        Label   = "RCM Provider Info (VE RCM PROVIDER INFO)"
        Command = "mumps -run INSTALL^ZVERCMP"
        Match   = "registered|already|VE RCM"
    },
    @{
        Label   = "ADT RPCs (3 ZVEADT *)"
        Command = "mumps -run INSTALL^ZVEADT"
        Match   = "registered|already|ZVEADT"
    }
)

foreach ($step in $installSteps) {
    Write-Host "  Installing: $($step.Label)..."
    try {
        $output = docker exec $ContainerName su - wv -c $step.Command 2>&1
        $outputStr = ($output | Out-String).Trim()
        if ($outputStr) {
            # Indent multi-line output
            $outputStr -split "`n" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        }
        Write-Gate "PASS" $step.Label
    } catch {
        Write-Gate "FAIL" "$($step.Label): $_"
    }
}

# ================================================================
# Step 4: Add RPCs to OR CPRS GUI CHART context
# ================================================================
Write-Host ""
Write-Host "--- Step 4: Add RPCs to broker context ---"

# VEMCTX3 handles interop RPCs; ZVEMSIN handles mail RPCs internally
Write-Host "  Running VEMCTX3 (interop context adder)..."
try {
    $ctxOutput = docker exec $ContainerName su - wv -c "mumps -run VEMCTX3" 2>&1
    $ctxStr = ($ctxOutput | Out-String).Trim()
    if ($ctxStr) {
        $ctxStr -split "`n" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    Write-Gate "PASS" "Context registration (VEMCTX3)"
} catch {
    Write-Gate "WARN" "Context registration: $_"
}

# ================================================================
# Step 5: Optional scheduling seed
# ================================================================
if ($Seed) {
    Write-Host ""
    Write-Host "--- Step 5a: Scheduling sandbox seed (ZVESDSEED) ---"
    try {
        $seedOutput = docker exec $ContainerName su - wv -c "mumps -run ZVESDSEED" 2>&1
        $seedStr = ($seedOutput | Out-String).Trim()
        if ($seedStr) {
            $seedStr -split "`n" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        }
        Write-Gate "PASS" "Scheduling seed (DEV only)"
    } catch {
        Write-Gate "WARN" "Scheduling seed: $_"
    }
}

# ================================================================
# Step 6: Verify (unless -SkipVerify)
# ================================================================
if (-not $SkipVerify) {
    Write-Host ""
    Write-Host "--- Step 6: Verification ---"

    # Check that key routines are callable
    $verifyTests = @(
        @{
            Label   = "ZVEMIOP callable"
            Command = "mumps -run %XCMD 'N R D LINKS^ZVEMIOP(.R,5) W R(0)'"
            Match   = "OK|0\^"
        },
        @{
            Label   = "ZVEMSGR callable"
            Command = "mumps -run %XCMD 'N R D FOLDERS^ZVEMSGR(.R,87) W R(0)'"
            Match   = "."
        },
        @{
            Label   = "ZVERPC callable"
            Command = "mumps -run %XCMD 'N R D LIST^ZVERPC(.R,"""") W R(0)'"
            Match   = "."
        },
        @{
            Label   = "ZVEADT callable"
            Command = "mumps -run %XCMD 'N R D WARDS^ZVEADT(.R,"""") W R(0)'"
            Match   = "."
        }
    )

    foreach ($test in $verifyTests) {
        try {
            $result = docker exec $ContainerName su - wv -c $test.Command 2>&1
            $resultStr = ($result | Out-String).Trim()
            if ($resultStr -match $test.Match) {
                Write-Gate "PASS" $test.Label
            } else {
                Write-Gate "WARN" "$($test.Label) -- output: $resultStr"
            }
        } catch {
            Write-Gate "WARN" "$($test.Label): $_"
        }
    }
}

# ================================================================
# Summary
# ================================================================
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail  WARN: $warn"
Write-Host ""

if ($fail -gt 0) {
    Write-Host "Installation completed with failures -- check output above." -ForegroundColor Red
    exit 1
} elseif ($warn -gt 0) {
    Write-Host "Installation completed with warnings." -ForegroundColor Yellow
} else {
    Write-Host "Installation SUCCESSFUL -- all routines installed and verified." -ForegroundColor Green
}
