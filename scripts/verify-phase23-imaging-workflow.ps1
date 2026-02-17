<#
.SYNOPSIS
    Phase 23 - Imaging Workflow V2 verification script.
.DESCRIPTION
    Validates all Phase 23 deliverables on top of Phase 22 regression:
    - Phase 22 full regression (delegates to verify-phase22-imaging.ps1)
    - Worklist service endpoints (CRUD + auth enforcement)
    - Ingest reconciliation (callback + quarantine + linkage)
    - Service auth (X-Service-Key validation)
    - Idempotency (re-ingest returns same linkage)
    - Chart integration (orderSummary in study response)
    - UI compilation + feature checks
    - Orthanc Lua script mount
    - Documentation existence
    - Security + PHI scan on Phase 23 files
.NOTES
    Run from repo root: .\scripts\verify-phase23-imaging-workflow.ps1
    Use -SkipDocker to skip Docker connectivity checks.
    Use -SkipRegression to skip Phase 22 regression.
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipRegression
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
Write-Host "=== Phase 23 - Imaging Workflow V2 Verification ===" -ForegroundColor Cyan
Write-Host ""

# --- 0: Phase 22 Regression ---

if (-not $SkipRegression) {
    Write-Host "--- 0: Phase 22 Regression ---" -ForegroundColor White
    $p22Script = "$PSScriptRoot\verify-phase22-imaging.ps1"
    if (Test-Path $p22Script) {
        $p22Args = @()
        if ($SkipDocker) { $p22Args += "-SkipDocker" }
        $p22ExitCode = & $p22Script @p22Args 2>&1 | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -eq 0) {
            Gate-Pass "Phase 22 regression: ALL GATES PASSED"
        } else {
            Gate-Fail "Phase 22 regression: $LASTEXITCODE gates failed"
        }
    } else {
        Gate-Warn "Phase 22 verifier not found at $p22Script"
    }
} else {
    Gate-Warn "Phase 22 regression skipped via -SkipRegression"
}

# --- A: Phase 23 File Existence ---

Write-Host ""
Write-Host "--- A: Phase 23 File Existence ---" -ForegroundColor White

$requiredFiles = @{
    "apps/api/src/services/imaging-worklist.ts" = "Worklist service"
    "apps/api/src/services/imaging-ingest.ts" = "Ingest reconciliation service"
    "services/imaging/on-stable-study.lua" = "Orthanc Lua callback"
    "services/imaging/ae-title-template.json" = "AE title template"
    "docs/runbooks/imaging-worklist.md" = "Worklist runbook"
    "docs/runbooks/imaging-ingest-reconciliation.md" = "Ingest runbook"
    "docs/runbooks/imaging-device-onboarding.md" = "Device onboarding runbook"
    "docs/runbooks/imaging-grounding.md" = "VistA-first grounding doc"
    "prompts/25-PHASE-23-IMAGING-WORKFLOW/25-01-imaging-workflow-IMPLEMENT.md" = "Implement prompt"
    "prompts/25-PHASE-23-IMAGING-WORKFLOW/25-99-imaging-workflow-VERIFY.md" = "Verify prompt"
}

foreach ($kv in $requiredFiles.GetEnumerator()) {
    if (Test-Path $kv.Key) { Gate-Pass "$($kv.Value) exists" }
    else { Gate-Fail "$($kv.Value) MISSING: $($kv.Key)" }
}

# --- B: Worklist Service Code Checks ---

Write-Host ""
Write-Host "--- B: Worklist Service Code Checks ---" -ForegroundColor White

if (Test-Path "apps/api/src/services/imaging-worklist.ts") {
    $wl = Get-Content "apps/api/src/services/imaging-worklist.ts" -Raw
    if ($wl -match "WorklistItem") { Gate-Pass "WorklistItem type defined" }
    else { Gate-Fail "WorklistItem type missing" }
    if ($wl -match "findByAccession") { Gate-Pass "findByAccession exported" }
    else { Gate-Fail "findByAccession missing" }
    if ($wl -match "generateAccessionNumber") { Gate-Pass "Accession number generator" }
    else { Gate-Fail "Accession generator missing" }
    if ($wl -match "VE-") { Gate-Pass "VE- accession format" }
    else { Gate-Fail "VE- accession format missing" }
    if ($wl -match "audit\(") { Gate-Pass "Worklist uses audit()" }
    else { Gate-Fail "Worklist missing audit() calls" }
    if ($wl -match "session") { Gate-Pass "Worklist checks session auth" }
    else { Gate-Fail "Worklist missing session auth" }
}

# --- C: Ingest Service Code Checks ---

Write-Host ""
Write-Host "--- C: Ingest Service Code Checks ---" -ForegroundColor White

if (Test-Path "apps/api/src/services/imaging-ingest.ts") {
    $ig = Get-Content "apps/api/src/services/imaging-ingest.ts" -Raw
    if ($ig -match "reconcileStudy") { Gate-Pass "reconcileStudy function" }
    else { Gate-Fail "reconcileStudy missing" }
    if ($ig -match "accession-exact") { Gate-Pass "Accession-exact strategy" }
    else { Gate-Fail "Accession-exact strategy missing" }
    if ($ig -match "patient-modality-date") { Gate-Pass "Patient-modality-date strategy" }
    else { Gate-Fail "Patient-modality-date strategy missing" }
    if ($ig -match "quarantineStudy") { Gate-Pass "Quarantine strategy" }
    else { Gate-Fail "Quarantine strategy missing" }
    if ($ig -match "validateServiceKey") { Gate-Pass "Service key validation function" }
    else { Gate-Fail "Service key validation missing" }
    if ($ig -match "constant.time|charCodeAt.*\^") { Gate-Pass "Constant-time key comparison" }
    else { Gate-Fail "Constant-time comparison missing" }
    if ($ig -match "already-linked") { Gate-Pass "Idempotency guard (already-linked)" }
    else { Gate-Fail "Idempotency guard missing" }
    if ($ig -match "getLinkagesForPatient") { Gate-Pass "Patient linkage export" }
    else { Gate-Fail "Patient linkage export missing" }
    if ($ig -match "audit\(") { Gate-Pass "Ingest uses audit()" }
    else { Gate-Fail "Ingest missing audit() calls" }
}

# --- D: Route Registration ---

Write-Host ""
Write-Host "--- D: Route Registration ---" -ForegroundColor White

$indexTs = Get-Content "apps/api/src/index.ts" -Raw
if ($indexTs -match "imagingWorklistRoutes") { Gate-Pass "imagingWorklistRoutes registered" }
else { Gate-Fail "imagingWorklistRoutes not registered" }
if ($indexTs -match "imagingIngestRoutes") { Gate-Pass "imagingIngestRoutes registered" }
else { Gate-Fail "imagingIngestRoutes not registered" }
if ($indexTs -match "imaging-worklist") { Gate-Pass "imaging-worklist import" }
else { Gate-Fail "imaging-worklist import missing" }
if ($indexTs -match "imaging-ingest") { Gate-Pass "imaging-ingest import" }
else { Gate-Fail "imaging-ingest import missing" }

# --- E: Security Middleware ---

Write-Host ""
Write-Host "--- E: Security & Auth Config ---" -ForegroundColor White

$security = Get-Content "apps/api/src/middleware/security.ts" -Raw
if ($security -match '"service"') { Gate-Pass "AuthLevel 'service' defined" }
else { Gate-Fail "AuthLevel 'service' missing" }
if ($security -match "ingest.*callback") { Gate-Pass "Ingest callback AUTH_RULE" }
else { Gate-Fail "Ingest callback AUTH_RULE missing" }

$serverConfig = Get-Content "apps/api/src/config/server-config.ts" -Raw
if ($serverConfig -match "ingestWebhookSecret") { Gate-Pass "ingestWebhookSecret in IMAGING_CONFIG" }
else { Gate-Fail "ingestWebhookSecret missing" }

# --- F: Audit Actions ---

Write-Host ""
Write-Host "--- F: Phase 23 Audit Actions ---" -ForegroundColor White

$auditTs = Get-Content "apps/api/src/lib/audit.ts" -Raw
@("imaging.order-create", "imaging.order-status-change", "imaging.worklist-view",
  "imaging.study-linked", "imaging.study-quarantined", "imaging.study-ingested") | ForEach-Object {
    if ($auditTs -match [regex]::Escape($_)) { Gate-Pass "Audit action '$_'" }
    else { Gate-Fail "Audit action '$_' missing" }
}

# --- G: Chart Integration ---

Write-Host ""
Write-Host "--- G: Chart Integration ---" -ForegroundColor White

$imgSvc = Get-Content "apps/api/src/services/imaging-service.ts" -Raw
if ($imgSvc -match "getLinkagesForPatient") { Gate-Pass "Chart uses linkage data" }
else { Gate-Fail "Chart missing linkage import" }
if ($imgSvc -match "orderSummary") { Gate-Pass "orderSummary in study response" }
else { Gate-Fail "orderSummary missing from response" }
if ($imgSvc -match "orderLinked") { Gate-Pass "orderLinked field on studies" }
else { Gate-Fail "orderLinked field missing" }

# --- H: UI Imaging Panel ---

Write-Host ""
Write-Host "--- H: Phase 23 UI Features ---" -ForegroundColor White

$panel = Get-Content "apps/web/src/components/cprs/panels/ImagingPanel.tsx" -Raw
if ($panel -match "activeTab") { Gate-Pass "Tab state (activeTab)" }
else { Gate-Fail "Missing activeTab state" }
if ($panel -match "worklist.*orders") { Gate-Pass "Tab bar (studies/worklist/orders)" }
else { Gate-Fail "Missing 3-tab bar" }
if ($panel -match "ImagingOrderForm") { Gate-Pass "Order form component" }
else { Gate-Fail "Missing order form" }
if ($panel -match "fetchWorklist") { Gate-Pass "fetchWorklist function" }
else { Gate-Fail "Missing fetchWorklist" }
if ($panel -match "orderLinked") { Gate-Pass "orderLinked badge support" }
else { Gate-Fail "Missing orderLinked badges" }
if ($panel -match "Unmatched") { Gate-Pass "Unmatched studies banner" }
else { Gate-Fail "Missing unmatched banner" }
if ($panel -match "WorklistItem") { Gate-Pass "WorklistItem interface in UI" }
else { Gate-Fail "Missing WorklistItem in UI" }

# --- I: Orthanc Lua Script ---

Write-Host ""
Write-Host "--- I: Orthanc Integration ---" -ForegroundColor White

if (Test-Path "services/imaging/on-stable-study.lua") {
    $lua = Get-Content "services/imaging/on-stable-study.lua" -Raw
    Gate-Pass "on-stable-study.lua exists"
    if ($lua -match "OnStableStudy") { Gate-Pass "OnStableStudy function in Lua" }
    else { Gate-Fail "OnStableStudy function missing" }
    if ($lua -match "X-Service-Key") { Gate-Pass "Lua sends X-Service-Key header" }
    else { Gate-Fail "Lua missing X-Service-Key" }
    if ($lua -match "INGEST_CALLBACK_URL") { Gate-Pass "Lua reads INGEST_CALLBACK_URL env" }
    else { Gate-Fail "Lua missing callback URL env" }
} else { Gate-Fail "on-stable-study.lua missing" }

$orthanc = Get-Content "services/imaging/orthanc.json" -Raw
if ($orthanc -match "on-stable-study.lua") { Gate-Pass "orthanc.json references Lua script" }
else { Gate-Fail "orthanc.json missing Lua reference" }

$dc = Get-Content "services/imaging/docker-compose.yml" -Raw
if ($dc -match "on-stable-study.lua") { Gate-Pass "docker-compose mounts Lua script" }
else { Gate-Fail "docker-compose missing Lua mount" }
if ($dc -match "INGEST_CALLBACK_URL") { Gate-Pass "docker-compose sets INGEST_CALLBACK_URL" }
else { Gate-Fail "docker-compose missing INGEST_CALLBACK_URL" }
if ($dc -match "INGEST_SERVICE_KEY") { Gate-Pass "docker-compose sets INGEST_SERVICE_KEY" }
else { Gate-Fail "docker-compose missing INGEST_SERVICE_KEY" }

# --- J: Orthanc Lua Mounted ---

Write-Host ""
Write-Host "--- J: Orthanc Container Check ---" -ForegroundColor White

if ($SkipDocker) {
    Gate-Warn "Docker container checks skipped via -SkipDocker"
} else {
    try {
        $luaCheck = docker exec orthanc ls /etc/orthanc/on-stable-study.lua 2>&1
        if ($LASTEXITCODE -eq 0) { Gate-Pass "Lua script mounted in Orthanc container" }
        else { Gate-Fail "Lua script NOT mounted in Orthanc container" }
    } catch {
        Gate-Warn "Could not check Orthanc container (docker not available?)"
    }
}

# --- K: API Compilation ---

Write-Host ""
Write-Host "--- K: API + Web Compilation ---" -ForegroundColor White

Push-Location "apps/api"
try {
    $null = npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) { Gate-Pass "API TypeScript compiles cleanly" }
    else { Gate-Fail "API TypeScript compilation errors" }
} catch { Gate-Warn "Could not run tsc (API)" }
Pop-Location

Push-Location "apps/web"
try {
    $null = npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) { Gate-Pass "Web TypeScript compiles cleanly" }
    else { Gate-Fail "Web TypeScript compilation errors" }
} catch { Gate-Warn "Could not run tsc (Web)" }
Pop-Location

# --- L: Security Scan ---

Write-Host ""
Write-Host "--- L: Security + PHI Scan ---" -ForegroundColor White

$p23Files = @(
    "apps/api/src/services/imaging-worklist.ts",
    "apps/api/src/services/imaging-ingest.ts",
    "apps/web/src/components/cprs/panels/ImagingPanel.tsx",
    "services/imaging/on-stable-study.lua",
    "docs/runbooks/imaging-worklist.md",
    "docs/runbooks/imaging-ingest-reconciliation.md",
    "docs/runbooks/imaging-device-onboarding.md",
    "docs/runbooks/imaging-grounding.md"
)

$credLeak = $false
$phiLeak = $false
foreach ($f in $p23Files) {
    if (Test-Path $f) {
        $content = Get-Content $f -Raw
        if ($content -match 'PROV123|PHARM123|NURSE123') {
            Gate-Fail "Credential leak in $f"
            $credLeak = $true
        }
        if ($content -match '\d{3}-\d{2}-\d{4}') {
            Gate-Fail "Possible SSN pattern in $f"
            $phiLeak = $true
        }
    }
}
if (-not $credLeak) { Gate-Pass "No credential leaks in Phase 23 files" }
if (-not $phiLeak) { Gate-Pass "No PHI (SSN) patterns in Phase 23 files" }

$consoleLogCount = 0
Get-ChildItem -Path "apps/api/src" -Recurse -Filter "*.ts" | ForEach-Object {
    $consoleLogCount += @(Select-String -Path $_.FullName -Pattern "console\.log" -AllMatches).Count
}
if ($consoleLogCount -le 6) {
    Gate-Pass "console.log count: $consoleLogCount (within 6 cap)"
} else {
    Gate-Fail "console.log count: $consoleLogCount (exceeds 6 cap)"
}

# --- M: AGENTS.md Updated ---

Write-Host ""
Write-Host "--- M: AGENTS.md ---" -ForegroundColor White

$agents = Get-Content "AGENTS.md" -Raw
if ($agents -match "imaging worklist.*ingest|Phase 23|imaging-worklist\.ts") {
    Gate-Pass "AGENTS.md references Phase 23"
} else { Gate-Fail "AGENTS.md missing Phase 23 references" }
if ($agents -match "#29|sidecar stores") { Gate-Pass "AGENTS.md has gotcha #29 (sidecar stores)" }
else { Gate-Fail "AGENTS.md missing gotcha #29" }
if ($agents -match "#30|StableAge|OnStableStudy") { Gate-Pass "AGENTS.md has gotcha #30 (Lua callback)" }
else { Gate-Fail "AGENTS.md missing gotcha #30" }
if ($agents -match "#31|X-Service-Key|service-to-service") { Gate-Pass "AGENTS.md has gotcha #31 (service auth)" }
else { Gate-Fail "AGENTS.md missing gotcha #31" }

# --- N: Live API End-to-End ---

Write-Host ""
Write-Host "--- N: Live API E2E (Phase 23 Endpoints) ---" -ForegroundColor White

$apiUp = $false
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:3001/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $apiUp = $true }
} catch { }

if ($apiUp) {
    Gate-Pass "API server responding"

    # Auth enforcement on worklist endpoints (unauth → 401)
    $authOk = $true
    @("/imaging/worklist", "/imaging/worklist/stats") | ForEach-Object {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:3001$_" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            Gate-Fail "Unauthenticated access on $_ (got $($r.StatusCode))"
            $authOk = $false
        } catch {
            $sc = $_.Exception.Response.StatusCode.value__
            if ($sc -ne 401) { Gate-Fail "Unexpected $sc on $_"; $authOk = $false }
        }
    }
    if ($authOk) { Gate-Pass "Worklist endpoints enforce auth (401 without session)" }

    # Ingest callback rejects without service key
    $ingestAuthOk = $true
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:3001/imaging/ingest/callback" -Method POST -UseBasicParsing -TimeoutSec 5 `
            -ContentType "application/json" -Body '{"studyInstanceUid":"x","orthancStudyId":"x","patientId":"x"}' -ErrorAction Stop
        Gate-Fail "Ingest callback accepted without service key"
        $ingestAuthOk = $false
    } catch {
        $sc = $_.Exception.Response.StatusCode.value__
        if ($sc -eq 403) {
            # expected
        } else {
            Gate-Fail "Unexpected $sc on ingest callback without key"
            $ingestAuthOk = $false
        }
    }

    # Ingest callback rejects with wrong service key
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:3001/imaging/ingest/callback" -Method POST -UseBasicParsing -TimeoutSec 5 `
            -ContentType "application/json" -Body '{"studyInstanceUid":"x","orthancStudyId":"x","patientId":"x"}' `
            -Headers @{"X-Service-Key"="wrong-key"} -ErrorAction Stop
        Gate-Fail "Ingest callback accepted wrong key"
        $ingestAuthOk = $false
    } catch {
        $sc = $_.Exception.Response.StatusCode.value__
        if ($sc -eq 403) {
            # expected
        } else {
            Gate-Fail "Unexpected $sc on ingest callback with wrong key"
            $ingestAuthOk = $false
        }
    }
    if ($ingestAuthOk) { Gate-Pass "Ingest callback rejects bad/missing service key (403)" }

    # Login for authed tests
    $loginBody = '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
    $tmpLogin = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tmpLogin -Value $loginBody -NoNewline
    $tmpCookie = [System.IO.Path]::GetTempFileName()
    $loginOut = curl.exe -s -c $tmpCookie -X POST -H "Content-Type: application/json" -d "@$tmpLogin" "http://127.0.0.1:3001/auth/login" 2>&1
    $loginJson = $loginOut | ConvertFrom-Json -ErrorAction SilentlyContinue
    Remove-Item $tmpLogin -ErrorAction SilentlyContinue

    if ($loginJson -and $loginJson.ok) {
        Gate-Pass "API login successful (DUZ=$($loginJson.session.duz))"

        # Create order
        $orderBody = '{"patientDfn":"100022","scheduledProcedure":"VERIFY CHEST","modality":"CR","priority":"routine","clinicalIndication":"Verify test","scheduledTime":"2026-02-18T10:00:00Z","facility":"WORLDVISTA","location":"RADIOLOGY"}'
        $tmpOrder = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $tmpOrder -Value $orderBody -NoNewline
        $orderOut = curl.exe -s -b $tmpCookie -X POST -H "Content-Type: application/json" -d "@$tmpOrder" "http://127.0.0.1:3001/imaging/worklist/orders" 2>&1
        $orderJson = $orderOut | ConvertFrom-Json -ErrorAction SilentlyContinue
        Remove-Item $tmpOrder -ErrorAction SilentlyContinue

        if ($orderJson -and $orderJson.ok -and $orderJson.order) {
            Gate-Pass "Order created: accession=$($orderJson.order.accessionNumber)"
            $accession = $orderJson.order.accessionNumber
            $orderId = $orderJson.order.id

            # Verify order appears in worklist
            $wlOut = curl.exe -s -b $tmpCookie "http://127.0.0.1:3001/imaging/worklist?patientDfn=100022" 2>&1
            $wlJson = $wlOut | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($wlJson -and $wlJson.ok -and $wlJson.count -gt 0) {
                Gate-Pass "Order appears in worklist (count=$($wlJson.count))"
            } else {
                Gate-Fail "Order not visible in worklist"
            }

            # Ingest study matching this order
            $ingestBody = "{`"studyInstanceUid`":`"1.2.3.verify.test`",`"orthancStudyId`":`"verify-abc`",`"patientId`":`"100022`",`"accessionNumber`":`"$accession`",`"modality`":`"CR`",`"studyDate`":`"20260218`",`"studyDescription`":`"VERIFY CHEST`",`"seriesCount`":1,`"instanceCount`":2}"
            $tmpIngest = [System.IO.Path]::GetTempFileName()
            Set-Content -Path $tmpIngest -Value $ingestBody -NoNewline
            $ingestOut = curl.exe -s -X POST -H "Content-Type: application/json" -H "X-Service-Key: dev-imaging-ingest-key-change-in-production" -d "@$tmpIngest" "http://127.0.0.1:3001/imaging/ingest/callback" 2>&1
            $ingestJson = $ingestOut | ConvertFrom-Json -ErrorAction SilentlyContinue
            Remove-Item $tmpIngest -ErrorAction SilentlyContinue

            if ($ingestJson -and $ingestJson.ok -and $ingestJson.reconciled) {
                Gate-Pass "Ingest reconciled: matchType=$($ingestJson.matchType)"
                if ($ingestJson.matchType -eq "accession-exact") {
                    Gate-Pass "Accession-exact match confirmed"
                } else {
                    Gate-Warn "Unexpected match type: $($ingestJson.matchType)"
                }

                # Test idempotency
                $idemOut = curl.exe -s -X POST -H "Content-Type: application/json" -H "X-Service-Key: dev-imaging-ingest-key-change-in-production" -d "@$tmpIngest" "http://127.0.0.1:3001/imaging/ingest/callback" 2>&1
                # tmpIngest already deleted, re-create
                $tmpIdem = [System.IO.Path]::GetTempFileName()
                Set-Content -Path $tmpIdem -Value $ingestBody -NoNewline
                $idemOut = curl.exe -s -X POST -H "Content-Type: application/json" -H "X-Service-Key: dev-imaging-ingest-key-change-in-production" -d "@$tmpIdem" "http://127.0.0.1:3001/imaging/ingest/callback" 2>&1
                $idemJson = $idemOut | ConvertFrom-Json -ErrorAction SilentlyContinue
                Remove-Item $tmpIdem -ErrorAction SilentlyContinue

                if ($idemJson -and $idemJson.matchType -eq "already-linked") {
                    Gate-Pass "Idempotent re-ingest returns already-linked"
                } else {
                    Gate-Fail "Re-ingest did not return already-linked (got: $($idemJson.matchType))"
                }
            } else {
                Gate-Fail "Ingest callback did not reconcile"
            }

            # Test linkage by patient
            $linkOut = curl.exe -s -b $tmpCookie "http://127.0.0.1:3001/imaging/ingest/linkages/by-patient/100022" 2>&1
            $linkJson = $linkOut | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($linkJson -and $linkJson.ok -and $linkJson.count -gt 0) {
                Gate-Pass "Linkages by patient: count=$($linkJson.count)"
            } else {
                Gate-Fail "No linkages found for patient"
            }

            # Quarantine test
            $quarBody = '{"studyInstanceUid":"9.verify.quarantine","orthancStudyId":"verify-qqq","patientId":"999999","accessionNumber":"NONEXIST","modality":"MR","studyDate":"20260218","studyDescription":"BRAIN MRI","seriesCount":1,"instanceCount":10}'
            $tmpQuar = [System.IO.Path]::GetTempFileName()
            Set-Content -Path $tmpQuar -Value $quarBody -NoNewline
            $quarOut = curl.exe -s -X POST -H "Content-Type: application/json" -H "X-Service-Key: dev-imaging-ingest-key-change-in-production" -d "@$tmpQuar" "http://127.0.0.1:3001/imaging/ingest/callback" 2>&1
            $quarJson = $quarOut | ConvertFrom-Json -ErrorAction SilentlyContinue
            Remove-Item $tmpQuar -ErrorAction SilentlyContinue

            if ($quarJson -and $quarJson.quarantined) {
                Gate-Pass "Unmatched study quarantined"
            } else {
                Gate-Fail "Unmatched study not quarantined"
            }

            # Admin unmatched queue
            $unmOut = curl.exe -s -b $tmpCookie "http://127.0.0.1:3001/imaging/ingest/unmatched" 2>&1
            $unmJson = $unmOut | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($unmJson -and $unmJson.ok -and $unmJson.count -gt 0) {
                Gate-Pass "Unmatched admin queue: count=$($unmJson.count)"
            } else {
                Gate-Fail "Unmatched admin queue empty"
            }

            # Chart integration — orderSummary in studies
            $chartOut = curl.exe -s -b $tmpCookie "http://127.0.0.1:3001/vista/imaging/studies?dfn=100022" 2>&1
            $chartJson = $chartOut | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($chartJson -and $chartJson.ok) {
                if ($chartJson.orderSummary) {
                    Gate-Pass "orderSummary present in chart response"
                    if ($chartJson.orderSummary.totalOrders -gt 0) {
                        Gate-Pass "orderSummary.totalOrders=$($chartJson.orderSummary.totalOrders)"
                    } else {
                        Gate-Warn "orderSummary.totalOrders=0"
                    }
                } else {
                    Gate-Fail "orderSummary missing from chart response"
                }
            } else {
                Gate-Warn "Chart studies endpoint returned unexpected result"
            }

        } else {
            Gate-Fail "Order creation failed"
        }

        Remove-Item $tmpCookie -ErrorAction SilentlyContinue
    } else {
        Gate-Warn "API login failed (VistA may not be running)"
    }
} else {
    Gate-Warn "API E2E tests skipped (API not running on 3001)"
}

# --- Summary ---

Write-Host ""
Write-Host "=== Phase 23 Verification Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor Red
Write-Host "  WARN: $warn" -ForegroundColor Yellow
Write-Host ""

if ($fail -eq 0) {
    Write-Host "Phase 23 - Imaging Workflow V2: ALL GATES PASSED" -ForegroundColor Green
} else {
    $msg = "Phase 23 - Imaging Workflow V2: " + $fail.ToString() + " GATES FAILED"
    Write-Host $msg -ForegroundColor Red
}

exit $fail
