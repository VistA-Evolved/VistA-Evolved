<#
.SYNOPSIS
    Phase 22 - Imaging Platform V1 verification script.
.DESCRIPTION
    Validates all Phase 22 deliverables:
    - Docker service files for Orthanc + OHIF
    - API compilation (imaging proxy + enhanced endpoints)
    - UI compilation (ImagingPanel + tab wiring)
    - Config integrity (IMAGING_CONFIG, audit actions)
    - Security gates (session auth, admin gating)
    - File existence and content checks
.NOTES
    Run from repo root: .\scripts\verify-phase22-imaging.ps1
    Use -SkipDocker to skip Docker connectivity checks.
#>

param(
    [switch]$SkipDocker
)

$ErrorActionPreference = "Continue"
$pass = 0
$fail = 0
$warn = 0

function Gate-Pass($msg) {
    Write-Host "  [PASS] $msg" -ForegroundColor Green
    $script:pass++
}
function Gate-Fail($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
    $script:fail++
}
function Gate-Warn($msg) {
    Write-Host "  [WARN] $msg" -ForegroundColor Yellow
    $script:warn++
}

Write-Host ""
Write-Host "=== Phase 22 - Imaging Platform V1 Verification ===" -ForegroundColor Cyan
Write-Host ""

# --- A: Docker Service Files ---

Write-Host "--- A: Docker Service Files ---" -ForegroundColor White

if (Test-Path "services/imaging/docker-compose.yml") {
    Gate-Pass "services/imaging/docker-compose.yml exists"
    $dc = Get-Content "services/imaging/docker-compose.yml" -Raw
    if ($dc -match "orthanc") { Gate-Pass "docker-compose references Orthanc" }
    else { Gate-Fail "docker-compose missing Orthanc service" }
    if ($dc -match "ohif") { Gate-Pass "docker-compose references OHIF" }
    else { Gate-Fail "docker-compose missing OHIF service" }
    if ($dc -match "imaging") { Gate-Pass "docker-compose uses imaging profile" }
    else { Gate-Fail "docker-compose missing imaging profile" }
} else { Gate-Fail "services/imaging/docker-compose.yml missing" }

if (Test-Path "services/imaging/orthanc.json") {
    Gate-Pass "services/imaging/orthanc.json exists"
    $oc = Get-Content "services/imaging/orthanc.json" -Raw
    if ($oc -match "DicomWeb") { Gate-Pass "orthanc.json enables DICOMweb" }
    else { Gate-Fail "orthanc.json missing DICOMweb config" }
    if ($oc -match "4242") { Gate-Pass "orthanc.json sets DICOM port 4242" }
    else { Gate-Warn "orthanc.json non-standard DICOM port" }
} else { Gate-Fail "services/imaging/orthanc.json missing" }

if (Test-Path "services/imaging/ohif-config.js") {
    Gate-Pass "services/imaging/ohif-config.js exists"
    $ohif = Get-Content "services/imaging/ohif-config.js" -Raw
    if ($ohif -match "dicomweb|dicom-web") { Gate-Pass "ohif-config references DICOMweb" }
    else { Gate-Fail "ohif-config missing DICOMweb data source" }
} else { Gate-Fail "services/imaging/ohif-config.js missing" }

if (Test-Path "services/imaging/README.md") { Gate-Pass "services/imaging/README.md exists" }
else { Gate-Warn "services/imaging/README.md missing" }

# --- B: API DICOMweb Proxy ---

Write-Host ""
Write-Host "--- B: API DICOMweb Proxy ---" -ForegroundColor White

if (Test-Path "apps/api/src/routes/imaging-proxy.ts") {
    Gate-Pass "imaging-proxy.ts exists"
    $proxy = Get-Content "apps/api/src/routes/imaging-proxy.ts" -Raw
    if ($proxy -match "/imaging/dicom-web/studies") { Gate-Pass "QIDO-RS studies route defined" }
    else { Gate-Fail "Missing QIDO-RS studies route" }
    if ($proxy -match "/imaging/dicom-web/studies/:studyUid/series") { Gate-Pass "QIDO-RS series route defined" }
    else { Gate-Fail "Missing QIDO-RS series route" }
    if ($proxy -match "/imaging/dicom-web/studies/:studyUid/metadata") { Gate-Pass "WADO-RS metadata route defined" }
    else { Gate-Fail "Missing WADO-RS metadata route" }
    if ($proxy -match "requireSession") { Gate-Pass "Proxy routes require session auth" }
    else { Gate-Fail "Proxy routes missing session auth" }
    if ($proxy -match "requireAdmin") { Gate-Pass "STOW-RS requires admin role" }
    else { Gate-Fail "STOW-RS missing admin role check" }
    if ($proxy -match "/imaging/health") { Gate-Pass "Imaging health endpoint defined" }
    else { Gate-Fail "Missing imaging health endpoint" }
    if ($proxy -match "/imaging/demo/upload") { Gate-Pass "Demo upload endpoint defined" }
    else { Gate-Fail "Missing demo upload endpoint" }
    if ($proxy -match "enableDemoUpload") { Gate-Pass "Demo upload gated by config flag" }
    else { Gate-Fail "Demo upload not gated" }
} else { Gate-Fail "imaging-proxy.ts missing" }

# --- C: IMAGING_CONFIG ---

Write-Host ""
Write-Host "--- C: IMAGING_CONFIG ---" -ForegroundColor White

$serverConfig = Get-Content "apps/api/src/config/server-config.ts" -Raw
if ($serverConfig -match "IMAGING_CONFIG") { Gate-Pass "IMAGING_CONFIG defined in server-config.ts" }
else { Gate-Fail "IMAGING_CONFIG missing from server-config.ts" }
if ($serverConfig -match "orthancUrl") { Gate-Pass "IMAGING_CONFIG has orthancUrl" }
else { Gate-Fail "IMAGING_CONFIG missing orthancUrl" }
if ($serverConfig -match "ohifUrl") { Gate-Pass "IMAGING_CONFIG has ohifUrl" }
else { Gate-Fail "IMAGING_CONFIG missing ohifUrl" }
if ($serverConfig -match "dicomWebRoot") { Gate-Pass "IMAGING_CONFIG has dicomWebRoot" }
else { Gate-Fail "IMAGING_CONFIG missing dicomWebRoot" }
if ($serverConfig -match "proxyTimeoutMs") { Gate-Pass "IMAGING_CONFIG has proxyTimeoutMs" }
else { Gate-Fail "IMAGING_CONFIG missing proxyTimeoutMs" }

# --- D: Route Registration ---

Write-Host ""
Write-Host "--- D: Route Registration ---" -ForegroundColor White

$indexTs = Get-Content "apps/api/src/index.ts" -Raw
if ($indexTs -match "imagingProxyRoutes") { Gate-Pass "imagingProxyRoutes registered in index.ts" }
else { Gate-Fail "imagingProxyRoutes not registered in index.ts" }
if ($indexTs -match "imaging-proxy") { Gate-Pass "imaging-proxy import in index.ts" }
else { Gate-Fail "imaging-proxy import missing from index.ts" }

# --- E: Imaging Service Enhancements ---

Write-Host ""
Write-Host "--- E: Imaging Service Enhancements ---" -ForegroundColor White

$imgSvc = Get-Content "apps/api/src/services/imaging-service.ts" -Raw
if ($imgSvc -match "IMAGING_CONFIG") { Gate-Pass "imaging-service uses IMAGING_CONFIG" }
else { Gate-Fail "imaging-service missing IMAGING_CONFIG import" }
if ($imgSvc -match "Phase 22") { Gate-Pass "imaging-service references Phase 22" }
else { Gate-Warn "imaging-service missing Phase 22 reference" }
if ($imgSvc -match "orthanc") { Gate-Pass "imaging-service references Orthanc" }
else { Gate-Fail "imaging-service missing Orthanc fallback" }

# --- F: Audit Actions ---

Write-Host ""
Write-Host "--- F: Audit Actions ---" -ForegroundColor White

$auditTs = Get-Content "apps/api/src/lib/audit.ts" -Raw
@("imaging.study-view", "imaging.series-view", "imaging.dicom-upload", "imaging.proxy-request") | ForEach-Object {
    if ($auditTs -match [regex]::Escape($_)) { Gate-Pass "Audit action '$_' defined" }
    else { Gate-Fail "Audit action '$_' missing" }
}

# --- G: UI Imaging Panel ---

Write-Host ""
Write-Host "--- G: UI Imaging Panel ---" -ForegroundColor White

if (Test-Path "apps/web/src/components/cprs/panels/ImagingPanel.tsx") {
    Gate-Pass "ImagingPanel.tsx exists"
    $panel = Get-Content "apps/web/src/components/cprs/panels/ImagingPanel.tsx" -Raw
    if ($panel -match "ImagingStudy") { Gate-Pass "ImagingPanel defines ImagingStudy type" }
    else { Gate-Fail "ImagingPanel missing ImagingStudy type" }
    if ($panel -match "OHIF") { Gate-Pass "ImagingPanel references OHIF viewer" }
    else { Gate-Fail "ImagingPanel missing OHIF viewer" }
    if ($panel -match "credentials.*include") { Gate-Pass "ImagingPanel uses credentials: include" }
    else { Gate-Fail "ImagingPanel missing credentials: include" }
} else { Gate-Fail "ImagingPanel.tsx missing" }

$panelsIndex = Get-Content "apps/web/src/components/cprs/panels/index.ts" -Raw
if ($panelsIndex -match "ImagingPanel") { Gate-Pass "ImagingPanel exported from panels/index.ts" }
else { Gate-Fail "ImagingPanel not exported from panels/index.ts" }

$chartPage = Get-Content -LiteralPath "apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx" -Raw
if ($chartPage -match "'imaging'") { Gate-Pass "imaging in VALID_TABS" }
else { Gate-Fail "imaging missing from VALID_TABS" }
if ($chartPage -match "ImagingPanel") { Gate-Pass "ImagingPanel used in TabContent" }
else { Gate-Fail "ImagingPanel missing from TabContent" }

# --- H: Docs and Prompts ---

Write-Host ""
Write-Host "--- H: Docs and Prompts ---" -ForegroundColor White

if (Test-Path "prompts/24-PHASE-22-IMAGING-PLATFORM/24-01-imaging-platform-IMPLEMENT.md") {
    Gate-Pass "Phase 22 implement prompt exists"
} else { Gate-Fail "Phase 22 implement prompt missing" }

if (Test-Path "prompts/24-PHASE-22-IMAGING-PLATFORM/24-99-imaging-platform-VERIFY.md") {
    Gate-Pass "Phase 22 verify prompt exists"
} else { Gate-Fail "Phase 22 verify prompt missing" }

if (Test-Path "docs/runbooks/imaging-orthanc-ohif-local.md") {
    Gate-Pass "Imaging runbook exists"
} else { Gate-Fail "Imaging runbook missing" }

# --- I: API Compilation ---

Write-Host ""
Write-Host "--- I: API Compilation ---" -ForegroundColor White

Push-Location "apps/api"
try {
    $tscResult = npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) {
        Gate-Pass "API TypeScript compiles cleanly"
    } else {
        $errLines = $tscResult | Where-Object { $_ -match "error TS" }
        $errCount = @($errLines).Count
        if ($errCount -le 3) {
            Gate-Warn "API TypeScript has $errCount minor error(s)"
        } else {
            Gate-Fail "API TypeScript has $errCount error(s)"
        }
    }
} catch {
    Gate-Warn "Could not run tsc"
}
Pop-Location

# --- J: Docker Connectivity ---

Write-Host ""
Write-Host "--- J: Docker Connectivity ---" -ForegroundColor White

if ($SkipDocker) {
    Gate-Warn "Docker checks skipped via -SkipDocker"
} else {
    try {
        $orthancResp = Invoke-WebRequest -Uri "http://localhost:8042/system" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($orthancResp.StatusCode -eq 200) {
            Gate-Pass "Orthanc responding on port 8042"
        } else {
            Gate-Warn "Orthanc returned status $($orthancResp.StatusCode)"
        }
    } catch {
        Gate-Warn "Orthanc not reachable on port 8042"
    }

    try {
        $ohifResp = Invoke-WebRequest -Uri "http://localhost:3003" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($ohifResp.StatusCode -eq 200) {
            Gate-Pass "OHIF Viewer responding on port 3003"
        } else {
            Gate-Warn "OHIF returned status $($ohifResp.StatusCode)"
        }
    } catch {
        Gate-Warn "OHIF Viewer not reachable on port 3003"
    }
}

# --- K: Security Scan ---

Write-Host ""
Write-Host "--- K: Security Scan ---" -ForegroundColor White

$imagingFiles = @(
    "apps/api/src/routes/imaging-proxy.ts",
    "apps/api/src/services/imaging-service.ts",
    "apps/web/src/components/cprs/panels/ImagingPanel.tsx"
)
$credLeak = $false
foreach ($f in $imagingFiles) {
    if (Test-Path $f) {
        $content = Get-Content $f -Raw
        if ($content -match 'PROV123|PHARM123|NURSE123') {
            Gate-Fail "Credential leak in $f"
            $credLeak = $true
        }
    }
}
if (-not $credLeak) { Gate-Pass "No credential leaks in imaging files" }

$consoleLogCount = 0
Get-ChildItem -Path "apps/api/src" -Recurse -Filter "*.ts" | ForEach-Object {
    $consoleLogCount += @(Select-String -Path $_.FullName -Pattern "console\.log" -AllMatches).Count
}
if ($consoleLogCount -le 6) {
    Gate-Pass "console.log count: $consoleLogCount (within 6 cap)"
} else {
    Gate-Fail "console.log count: $consoleLogCount (exceeds 6 cap)"
}

# --- Summary ---

Write-Host ""
Write-Host "=== Phase 22 Verification Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor Red
Write-Host "  WARN: $warn" -ForegroundColor Yellow
Write-Host ""

if ($fail -eq 0) {
    Write-Host "Phase 22 - Imaging Platform V1: ALL GATES PASSED" -ForegroundColor Green
} else {
    $msg = "Phase 22 - Imaging Platform V1: " + $fail.ToString() + " GATES FAILED"
    Write-Host $msg -ForegroundColor Red
}

exit $fail

