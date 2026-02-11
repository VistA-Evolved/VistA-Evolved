<#
.SYNOPSIS
    VistA-Evolved Phase 1-5C Verification Script
.DESCRIPTION
    Verifies phases from Hello System through Phase 5C Patient Allergies.
    Run from repo root: .\scripts\verify-phase1-to-phase5b.ps1
.NOTES
    Requires: Node v24+, pnpm v10+, Docker Desktop running
    Date: 2026-02-11
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipInstall,
    [int]$ApiPort = 3001,
    [string]$SearchQuery = "SMI"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

# -- Helpers ---------------------------------------------------------------

$script:pass = 0
$script:fail = 0
$script:warn = 0
$script:results = @()

function Write-Phase($phase, $desc) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "  $phase -- $desc" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Assert-Check($name, $condition, $detail) {
    if ($condition) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
        $script:pass++
        $script:results += [PSCustomObject]@{ Check = $name; Status = "PASS"; Detail = $detail }
    } else {
        Write-Host "  [FAIL] $name" -ForegroundColor Red
        if ($detail) { Write-Host "         $detail" -ForegroundColor Yellow }
        $script:fail++
        $script:results += [PSCustomObject]@{ Check = $name; Status = "FAIL"; Detail = $detail }
    }
}

function Warn-Check($name, $detail) {
    Write-Host "  [WARN] $name" -ForegroundColor Yellow
    if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
    $script:warn++
    $script:results += [PSCustomObject]@{ Check = $name; Status = "WARN"; Detail = $detail }
}

$script:apiProcess = $null

function Stop-ApiProcess {
    if ($script:apiProcess -ne $null -and -not $script:apiProcess.HasExited) {
        Write-Host "  Stopping API server (PID $($script:apiProcess.Id))..." -ForegroundColor DarkGray
        Stop-Process -Id $script:apiProcess.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

# -- Pre-flight ------------------------------------------------------------

Write-Host ""
Write-Host "VistA-Evolved Phase 1-5C Verification" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "Repo: $repoRoot"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# Check Node version
$nodeVer = (node -v 2>$null)
Assert-Check "Node.js installed" ($nodeVer -match "^v2[4-9]") "Found: $nodeVer"

# Check pnpm version
$pnpmVer = (pnpm -v 2>$null)
Assert-Check "pnpm installed" ($pnpmVer -match "^10\.") "Found: $pnpmVer"

# =========================================================================
Write-Phase "PHASE 1" "Hello System - Repo Scaffolding"
# =========================================================================

Assert-Check "Root package.json exists" (Test-Path "$repoRoot\package.json")
Assert-Check "pnpm-workspace.yaml exists" (Test-Path "$repoRoot\pnpm-workspace.yaml")
Assert-Check "apps/web exists" (Test-Path "$repoRoot\apps\web\package.json")
Assert-Check "apps/api exists" (Test-Path "$repoRoot\apps\api\package.json")
Assert-Check "CI workflow exists" (Test-Path "$repoRoot\.github\workflows\ci.yml")
Assert-Check "CodeQL workflow exists" (Test-Path "$repoRoot\.github\workflows\codeql.yml")

# Check pnpm-workspace.yaml has allowBuilds
$wsContent = Get-Content "$repoRoot\pnpm-workspace.yaml" -Raw
Assert-Check "pnpm allowBuilds: esbuild" ($wsContent -match "esbuild:\s*true")
Assert-Check "pnpm allowBuilds: sharp" ($wsContent -match "sharp:\s*true")
Assert-Check "pnpm allowBuilds: unrs-resolver" ($wsContent -match "unrs-resolver:\s*true")

# .gitignore safety
$gitignore = Get-Content "$repoRoot\.gitignore" -Raw
Assert-Check ".gitignore blocks .env.*" ($gitignore -match "\.env\.\*")
$trackedEnv = git ls-files -- "apps/api/.env.local" 2>$null
Assert-Check ".env.local NOT tracked in git" ([string]::IsNullOrWhiteSpace($trackedEnv))
Assert-Check ".env.example exists" (Test-Path "$repoRoot\apps\api\.env.example")

# -- pnpm install --
if (-not $SkipInstall) {
    Write-Host ""
    Write-Host "  Running pnpm -r install..." -ForegroundColor DarkGray
    $installOutput = pnpm -r install 2>&1 | Out-String
    Assert-Check "pnpm -r install succeeds" ($LASTEXITCODE -eq 0) "exit code: $LASTEXITCODE"
} else {
    Write-Host "  (Skipping pnpm install per -SkipInstall flag)" -ForegroundColor DarkGray
}

# =========================================================================
Write-Phase "PHASE 1B" "apps/web - Next.js Homepage"
# =========================================================================

$pageTsx = Get-Content "$repoRoot\apps\web\src\app\page.tsx" -Raw -ErrorAction SilentlyContinue
Assert-Check "page.tsx contains 'VistA Evolved'" ($pageTsx -match "VistA Evolved")
Assert-Check "page.tsx contains 'Hello System'" ($pageTsx -match "Hello System")

# =========================================================================
Write-Phase "PHASE 1C" "apps/api - Fastify Health Check"
# =========================================================================

$indexTs = Get-Content "$repoRoot\apps\api\src\index.ts" -Raw
Assert-Check "index.ts has /health route" ($indexTs -match '/health')
Assert-Check "index.ts has /vista/ping route" ($indexTs -match '/vista/ping')
Assert-Check "index.ts has /vista/default-patient-list route" ($indexTs -match '/vista/default-patient-list')
Assert-Check "index.ts has /vista/patient-search route" ($indexTs -match '/vista/patient-search')
Assert-Check "index.ts has /vista/patient-demographics route" ($indexTs -match '/vista/patient-demographics')
Assert-Check "index.ts has /vista/allergies route" ($indexTs -match '/vista/allergies')

# Check for start script
$apiPkg = Get-Content "$repoRoot\apps\api\package.json" -Raw
Assert-Check "apps/api has start script" ($apiPkg -match '"start"')

# -- Start API for live testing --
Write-Host ""
Write-Host "  Starting API on port $ApiPort..." -ForegroundColor DarkGray

# Kill any existing process on the port
$existing = Get-NetTCPConnection -LocalPort $ApiPort -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "  Port $ApiPort in use; attempting to free it..." -ForegroundColor Yellow
    $existing | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Load .env.local if present
$envLocalPath = "$repoRoot\apps\api\.env.local"
if (Test-Path $envLocalPath) {
    Get-Content $envLocalPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.+)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
    Write-Host "  Loaded .env.local" -ForegroundColor DarkGray
}

$env:PORT = $ApiPort
try {
    $script:apiProcess = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "pnpm -C apps/api start" `
        -WorkingDirectory $repoRoot -PassThru -NoNewWindow `
        -RedirectStandardOutput "$repoRoot\.api-stdout.log" `
        -RedirectStandardError "$repoRoot\.api-stderr.log"
} catch {
    Write-Host "  Failed to start API: $($_.Exception.Message)" -ForegroundColor Red
}

# Wait for server to be ready (up to 15 seconds)
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $healthResp = Invoke-WebRequest -Uri "http://127.0.0.1:$ApiPort/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($healthResp.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
}

Assert-Check "API starts and responds" $ready "http://127.0.0.1:$($ApiPort)/health"

if ($ready) {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/health" -TimeoutSec 5
        Assert-Check "GET /health returns ok:true" ($health.ok -eq $true) ($health | ConvertTo-Json -Compress)
    } catch {
        Assert-Check "GET /health returns ok:true" $false $_.Exception.Message
    }
} else {
    Write-Host "  API failed to start. stderr log:" -ForegroundColor Red
    if (Test-Path "$repoRoot\.api-stderr.log") {
        Get-Content "$repoRoot\.api-stderr.log" -Tail 20
    }
}

# =========================================================================
Write-Phase "PHASE 2" "Docker Sandbox - Port 9430"
# =========================================================================

$dockerOk = $false
if (-not $SkipDocker) {
    $dockerVer = docker version --format "{{.Server.Version}}" 2>$null
    Assert-Check "Docker Desktop running" (-not [string]::IsNullOrWhiteSpace($dockerVer)) "Server version: $dockerVer"

    Assert-Check "docker-compose.yml exists" (Test-Path "$repoRoot\services\vista\docker-compose.yml")

    $composeContent = Get-Content "$repoRoot\services\vista\docker-compose.yml" -Raw
    Assert-Check "Compose has service wv" ($composeContent -match "wv:")
    Assert-Check "Compose uses worldvista image" ($composeContent -match "worldvista/worldvista-ehr")
    Assert-Check "Compose has profiles dev" ($composeContent -match 'profiles.*dev')
    Assert-Check "Compose exposes 9430" ($composeContent -match "9430:9430")

    Write-Host ""
    Write-Host "  Starting Docker sandbox..." -ForegroundColor DarkGray
    Push-Location "$repoRoot\services\vista"
    docker compose --profile dev up -d 2>&1 | Out-String | Write-Host
    Pop-Location

    Start-Sleep -Seconds 5
    $wvContainer = docker ps --filter "name=wv" --format "{{.Names}}" 2>$null
    Assert-Check "Container wv is running" ($wvContainer -match "wv") "docker ps: $wvContainer"

    if ($wvContainer -match "wv") {
        Write-Host "  Waiting for port 9430 (up to 60s)..." -ForegroundColor DarkGray
        $portReady = $false
        for ($i = 0; $i -lt 12; $i++) {
            $tnc = Test-NetConnection 127.0.0.1 -Port 9430 -WarningAction SilentlyContinue
            if ($tnc.TcpTestSucceeded) { $portReady = $true; break }
            Start-Sleep -Seconds 5
        }
        Assert-Check "Port 9430 reachable from host" $portReady
        $dockerOk = $portReady
    }

    Assert-Check "Runbook: local-vista-docker.md" (Test-Path "$repoRoot\docs\runbooks\local-vista-docker.md")
    Assert-Check "Runbook: phase2-docker-fix.md" (Test-Path "$repoRoot\docs\runbooks\phase2-docker-fix.md")
} else {
    Write-Host "  (Skipping Docker per -SkipDocker flag)" -ForegroundColor DarkGray
}

# =========================================================================
Write-Phase "PHASE 3" "VistA Connectivity - /vista/ping"
# =========================================================================

Assert-Check "Runbook: vista-connectivity.md" (Test-Path "$repoRoot\docs\runbooks\vista-connectivity.md")
Assert-Check "vista/config.ts exists" (Test-Path "$repoRoot\apps\api\src\vista\config.ts")
Assert-Check "vista/rpcBroker.ts exists" (Test-Path "$repoRoot\apps\api\src\vista\rpcBroker.ts")

if ($ready) {
    try {
        $ping = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/vista/ping" -TimeoutSec 10
        if ($dockerOk) {
            Assert-Check "GET /vista/ping ok:true (sandbox up)" ($ping.ok -eq $true) ($ping | ConvertTo-Json -Compress)
        } else {
            Assert-Check "GET /vista/ping responds (sandbox down)" ($null -ne $ping) ($ping | ConvertTo-Json -Compress)
        }
    } catch {
        Assert-Check "GET /vista/ping responds" $false $_.Exception.Message
    }
}

# =========================================================================
Write-Phase "PHASE 4A" "RPC Default Patient List"
# =========================================================================

Assert-Check "vista/rpcBrokerClient.ts exists" (Test-Path "$repoRoot\apps\api\src\vista\rpcBrokerClient.ts")
Assert-Check "Runbook: vista-rpc-default-patient-list.md" (Test-Path "$repoRoot\docs\runbooks\vista-rpc-default-patient-list.md")

$hasCredentials = $false
if (Test-Path $envLocalPath) {
    $envContent = Get-Content $envLocalPath -Raw
    $hasCredentials = ($envContent -match "VISTA_ACCESS_CODE=.+") -and ($envContent -match "VISTA_VERIFY_CODE=.+")
}
Assert-Check ".env.local has VistA credentials" $hasCredentials "Required for Phase 4A/4B RPC calls"

if ($ready -and $dockerOk) {
    try {
        $dpl = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/vista/default-patient-list" -TimeoutSec 20
        if ($dpl.ok -eq $true) {
            Assert-Check "GET /vista/default-patient-list ok:true" $true "count=$($dpl.count)"
            if ($dpl.count -eq 0) {
                Warn-Check "Default patient list is empty (not a failure)" "This sandbox dataset has no default patient list entries."
            } elseif ($dpl.results -and $dpl.results.Count -gt 0) {
                $first = $dpl.results[0]
                Assert-Check "Results contain dfn and name" ($null -ne $first.dfn -and $null -ne $first.name) "First: dfn=$($first.dfn) name=$($first.name)"
            }
        } else {
            Assert-Check "GET /vista/default-patient-list ok:true" $false "Error: $($dpl.error) | Hint: $($dpl.hint)"
        }
    } catch {
        Assert-Check "GET /vista/default-patient-list responds" $false $_.Exception.Message
    }
} else {
    if (-not $dockerOk) { Write-Host "  [SKIP] Sandbox not running -- cannot test Phase 4A RPC" -ForegroundColor Yellow }
    if (-not $ready)    { Write-Host "  [SKIP] API not running -- cannot test Phase 4A RPC" -ForegroundColor Yellow }
}

# =========================================================================
Write-Phase "PHASE 4B" "RPC Patient Search"
# =========================================================================

Assert-Check "Runbook: vista-rpc-patient-search.md" (Test-Path "$repoRoot\docs\runbooks\vista-rpc-patient-search.md")

if ($ready -and $dockerOk) {
    try {
        $q = [System.Uri]::EscapeDataString($SearchQuery)
        $ps = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/vista/patient-search?q=$q" -TimeoutSec 25

        if ($ps.ok -eq $true) {
            Assert-Check "GET /vista/patient-search ok:true" $true "count=$($ps.count) rpcUsed=$($ps.rpcUsed)"
            if ($ps.count -lt 1) {
                Assert-Check "Patient search returned at least 1 result" $false "count=$($ps.count)"
            } elseif ($ps.results -and $ps.results.Count -gt 0) {
                $first = $ps.results[0]
                Assert-Check "Search results contain dfn and name" ($null -ne $first.dfn -and $null -ne $first.name) "First: dfn=$($first.dfn) name=$($first.name)"
            } else {
                Assert-Check "Search results array exists" $false "results array missing/empty"
            }
        } else {
            Assert-Check "GET /vista/patient-search ok:true" $false "Error: $($ps.error) | Hint: $($ps.hint)"
        }
    } catch {
        Assert-Check "GET /vista/patient-search responds" $false $_.Exception.Message
    }
} else {
    if (-not $dockerOk) { Write-Host "  [SKIP] Sandbox not running -- cannot test Phase 4B RPC" -ForegroundColor Yellow }
    if (-not $ready)    { Write-Host "  [SKIP] API not running -- cannot test Phase 4B RPC" -ForegroundColor Yellow }
}

# =========================================================================
Write-Phase "PHASE 5B" "Patient Demographics"
# =========================================================================

Assert-Check "Runbook: vista-rpc-patient-demographics.md" (Test-Path "$repoRoot\docs\runbooks\vista-rpc-patient-demographics.md")

if ($ready -and $dockerOk) {
    # Test with DFN 1 (known test patient)
    try {
        $demo = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/vista/patient-demographics?dfn=1" -TimeoutSec 25

        if ($demo.ok -eq $true) {
            Assert-Check "GET /vista/patient-demographics ok:true" $true "name=$($demo.patient.name)"
            Assert-Check "Demographics has name" (-not [string]::IsNullOrWhiteSpace($demo.patient.name)) $demo.patient.name
            Assert-Check "Demographics has dob" (-not [string]::IsNullOrWhiteSpace($demo.patient.dob)) $demo.patient.dob
            Assert-Check "Demographics has sex" (-not [string]::IsNullOrWhiteSpace($demo.patient.sex)) $demo.patient.sex
            Assert-Check "Demographics has dfn" (-not [string]::IsNullOrWhiteSpace($demo.patient.dfn)) $demo.patient.dfn
            Assert-Check "Demographics rpcUsed is ORWPT SELECT" ($demo.rpcUsed -eq "ORWPT SELECT") $demo.rpcUsed
        } else {
            Assert-Check "GET /vista/patient-demographics ok:true" $false "Error: $($demo.error) | Hint: $($demo.hint)"
        }
    } catch {
        Assert-Check "GET /vista/patient-demographics responds" $false $_.Exception.Message
    }

    # Test validation: missing dfn
    try {
        $bad = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/vista/patient-demographics" -TimeoutSec 10
        Assert-Check "Missing dfn returns ok:false" ($bad.ok -eq $false) "error=$($bad.error)"
    } catch {
        Assert-Check "Missing dfn returns error response" $false $_.Exception.Message
    }

    # Test invalid DFN
    try {
        $inv = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/vista/patient-demographics?dfn=99999" -TimeoutSec 25
        Assert-Check "Invalid DFN returns ok:false" ($inv.ok -eq $false) "error=$($inv.error)"
    } catch {
        Assert-Check "Invalid DFN returns error response" $false $_.Exception.Message
    }
} else {
    if (-not $dockerOk) { Write-Host "  [SKIP] Sandbox not running -- cannot test Phase 5B" -ForegroundColor Yellow }
    if (-not $ready)    { Write-Host "  [SKIP] API not running -- cannot test Phase 5B" -ForegroundColor Yellow }
}

# =========================================================================
Write-Phase "PHASE 5C" "Patient Allergies"
# =========================================================================

Assert-Check "Runbook: vista-rpc-allergies.md" (Test-Path "$repoRoot\docs\runbooks\vista-rpc-allergies.md")

if ($ready -and $dockerOk) {
    # Test with DFN 1 (known test patient with PEANUT OIL allergy)
    try {
        $allergy = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/vista/allergies?dfn=1" -TimeoutSec 25

        if ($allergy.ok -eq $true) {
            Assert-Check "GET /vista/allergies ok:true" $true "count=$($allergy.count)"
            Assert-Check "Allergies count >= 1" ($allergy.count -ge 1) "count=$($allergy.count)"
            if ($allergy.results -and $allergy.results.Count -gt 0) {
                $first = $allergy.results[0]
                Assert-Check "Allergy has allergen field" (-not [string]::IsNullOrWhiteSpace($first.allergen)) $first.allergen
                Assert-Check "Allergy has id field" (-not [string]::IsNullOrWhiteSpace($first.id)) $first.id
            }
            Assert-Check "Allergies rpcUsed is ORQQAL LIST" ($allergy.rpcUsed -eq "ORQQAL LIST") $allergy.rpcUsed
        } else {
            Assert-Check "GET /vista/allergies ok:true" $false "Error: $($allergy.error)"
        }
    } catch {
        Assert-Check "GET /vista/allergies responds" $false $_.Exception.Message
    }

    # Test validation: missing dfn
    try {
        $bad = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/vista/allergies" -TimeoutSec 10
        Assert-Check "Allergies missing dfn returns ok:false" ($bad.ok -eq $false) "error=$($bad.error)"
    } catch {
        Assert-Check "Allergies missing dfn returns error response" $false $_.Exception.Message
    }

    # Test non-numeric dfn
    try {
        $nan = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/vista/allergies?dfn=abc" -TimeoutSec 10
        Assert-Check "Allergies non-numeric dfn returns ok:false" ($nan.ok -eq $false) "error=$($nan.error)"
    } catch {
        Assert-Check "Allergies non-numeric dfn returns error response" $false $_.Exception.Message
    }
} else {
    if (-not $dockerOk) { Write-Host "  [SKIP] Sandbox not running -- cannot test Phase 5C" -ForegroundColor Yellow }
    if (-not $ready)    { Write-Host "  [SKIP] API not running -- cannot test Phase 5C" -ForegroundColor Yellow }
}

# =========================================================================
# CLEANUP
# =========================================================================

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "  CLEANUP" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

Stop-ApiProcess

Remove-Item "$repoRoot\.api-stdout.log" -ErrorAction SilentlyContinue
Remove-Item "$repoRoot\.api-stderr.log" -ErrorAction SilentlyContinue

if (-not $SkipDocker) {
    $stopDocker = Read-Host "  Stop Docker sandbox? (y/N)"
    if ($stopDocker -eq "y") {
        Push-Location "$repoRoot\services\vista"
        docker compose --profile dev down 2>&1 | Out-Null
        Pop-Location
        Write-Host "  Docker sandbox stopped." -ForegroundColor DarkGray
    } else {
        Write-Host "  Docker sandbox left running." -ForegroundColor DarkGray
    }
}

# =========================================================================
# SUMMARY
# =========================================================================

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor White
Write-Host "  VERIFICATION SUMMARY" -ForegroundColor White
Write-Host ("=" * 70) -ForegroundColor White
Write-Host ""

$script:results | Format-Table -Property Status, Check, Detail -AutoSize

Write-Host ""
Write-Host "  PASSED: $($script:pass)" -ForegroundColor Green
Write-Host "  WARN:   $($script:warn)" -ForegroundColor Yellow
$failColor = "Green"
if ($script:fail -gt 0) { $failColor = "Red" }
Write-Host "  FAILED: $($script:fail)" -ForegroundColor $failColor
Write-Host ""

if ($script:fail -eq 0) {
    Write-Host "  ALL CHECKS PASSED" -ForegroundColor Green -BackgroundColor DarkGreen
} else {
    Write-Host "  SOME CHECKS FAILED -- review above" -ForegroundColor Red -BackgroundColor DarkRed
}

Write-Host ""
exit $script:fail
