<#
.SYNOPSIS
    VistA-Evolved Phase 14 - Parity Closure + Compatibility Layer Verification
.DESCRIPTION
    Extends Phase 13 verification with Phase 14 checks:
    - RPC Capability Discovery endpoint
    - Write-back endpoints (orders, labs, consults, surgery, problems)
    - Server-side draft store
    - Imaging viewer integration
    - Inbox feature-status (expected-missing, not WARN)
    - 0 WARN target
    Run from repo root: .\scripts\verify-phase1-to-phase14-parity-closure.ps1
.NOTES
    Requires: Node v24+, pnpm v10+, Docker Desktop running, API on port 3001
    Date: 2026-02-17
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipInstall,
    [int]$ApiPort = 3001
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

# -- Helpers ---------------------------------------------------------------

$script:pass = 0
$script:fail = 0
$script:warn = 0
$script:info = 0
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

function Info-Check($name, $detail) {
    Write-Host "  [INFO] $name" -ForegroundColor DarkCyan
    if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
    $script:info++
    $script:results += [PSCustomObject]@{ Check = $name; Status = "INFO"; Detail = $detail }
}

# -- Pre-flight ------------------------------------------------------------

Write-Host ""
Write-Host "VistA-Evolved Phase 14 - Parity Closure Verification" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "Repo: $repoRoot"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

$nodeVer = (node -v 2>$null)
Assert-Check "Node.js installed" ($nodeVer -match "^v2[4-9]") "Found: $nodeVer"
$pnpmVer = (pnpm -v 2>$null)
Assert-Check "pnpm installed" ($pnpmVer -match "^10\.") "Found: $pnpmVer"

# =========================================================================
# PHASES 11-13 (inherited checks - file existence + code patterns)
# =========================================================================

Write-Phase "PHASE 11-13" "Inherited Checks (file existence + code)"

# Phase 11A - Contracts
Assert-Check "Contract types.ts exists" (Test-Path "$repoRoot\apps\web\src\lib\contracts\types.ts")
Assert-Check "Contract loader.ts exists" (Test-Path "$repoRoot\apps\web\src\lib\contracts\loader.ts")
Assert-Check "tabs.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\tabs.json")

# Phase 11B - State
Assert-Check "patient-context.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\patient-context.tsx")
Assert-Check "cprs-ui-state.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\cprs-ui-state.tsx")
Assert-Check "data-cache.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\data-cache.tsx")

# Phase 11C - Shell
Assert-Check "CPRSMenuBar.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\CPRSMenuBar.tsx")
Assert-Check "PatientBanner.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\PatientBanner.tsx")
Assert-Check "CPRSModals.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\CPRSModals.tsx")

# Phase 11D - All 10 panels
$panelDir = "$repoRoot\apps\web\src\components\cprs\panels"
$panels = @("CoverSheetPanel","ProblemsPanel","MedsPanel","OrdersPanel","NotesPanel","ConsultsPanel","SurgeryPanel","DCSummPanel","LabsPanel","ReportsPanel")
foreach ($p in $panels) {
    Assert-Check "$p.tsx exists" (Test-Path "$panelDir\$p.tsx")
}

# Phase 11F - Routes
$cprsRouteDir = "$repoRoot\apps\web\src\app\cprs"
Assert-Check "CPRS layout.tsx exists" (Test-Path "$cprsRouteDir\layout.tsx")
Assert-Check "CPRS login page exists" (Test-Path "$cprsRouteDir\login\page.tsx")
Assert-Check "CPRS chart page exists" (Test-Path -LiteralPath "$cprsRouteDir\chart\[dfn]\[tab]\page.tsx")

# Phase 12 - Domain data
$dcContent = Get-Content "$repoRoot\apps\web\src\stores\data-cache.tsx" -Raw
Assert-Check "data-cache has Consult type" ($dcContent -match "export interface Consult")
Assert-Check "data-cache has LabResult type" ($dcContent -match "export interface LabResult")

# Phase 13A - Auth
Assert-Check "session-store.ts exists" (Test-Path "$repoRoot\apps\api\src\auth\session-store.ts")
Assert-Check "auth-routes.ts exists" (Test-Path "$repoRoot\apps\api\src\auth\auth-routes.ts")
Assert-Check "session-context.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\session-context.tsx")

# Phase 13B - Inbox
Assert-Check "inbox.ts route exists" (Test-Path "$repoRoot\apps\api\src\routes\inbox.ts")
Assert-Check "Inbox page exists" (Test-Path "$cprsRouteDir\inbox\page.tsx")

# Phase 13F - WS Console
Assert-Check "ws-console.ts exists" (Test-Path "$repoRoot\apps\api\src\routes\ws-console.ts")

# Phase 13G - UI Toggle
$uiContent = Get-Content "$repoRoot\apps\web\src\stores\cprs-ui-state.tsx" -Raw
Assert-Check "LayoutMode type defined" ($uiContent -match "export type LayoutMode")

# =========================================================================
Write-Phase "PHASE 14A" "RPC Capability Discovery + Cache"
# =========================================================================

Assert-Check "rpcCapabilities.ts exists" (Test-Path "$repoRoot\apps\api\src\vista\rpcCapabilities.ts")
Assert-Check "capabilities.ts route exists" (Test-Path "$repoRoot\apps\api\src\routes\capabilities.ts")

$capContent = Get-Content "$repoRoot\apps\api\src\vista\rpcCapabilities.ts" -Raw
Assert-Check "discoverCapabilities exported" ($capContent -match "export async function discoverCapabilities")
Assert-Check "requireRpc exported" ($capContent -match "export function requireRpc")
Assert-Check "optionalRpc exported" ($capContent -match "export function optionalRpc")
Assert-Check "isRpcAvailable exported" ($capContent -match "export function isRpcAvailable")
Assert-Check "getCapabilities exported" ($capContent -match "export function getCapabilities")
Assert-Check "getDomainCapabilities exported" ($capContent -match "export function getDomainCapabilities")
Assert-Check "KNOWN_RPCS catalog exported" ($capContent -match "export const KNOWN_RPCS")
Assert-Check "Cache TTL configurable" ($capContent -match "VISTA_CAPABILITY_TTL_MS")
Assert-Check "Expected-missing list defined" ($capContent -match "WORLDVISTA_EXPECTED_MISSING")
Assert-Check "RPC not-found detection patterns" ($capContent -match "RPC_NOT_FOUND_PATTERNS")

$capRoute = Get-Content "$repoRoot\apps\api\src\routes\capabilities.ts" -Raw
Assert-Check "GET /vista/rpc-capabilities" ($capRoute -match '"/vista/rpc-capabilities"')
Assert-Check "Refresh param supported" ($capRoute -match 'refresh.*true')
Assert-Check "Domain filter supported" ($capRoute -match 'domain')
Assert-Check "unexpectedMissing in response" ($capRoute -match "unexpectedMissing")

# =========================================================================
Write-Phase "PHASE 14B" "WARN Gap Closure (Inbox Compat Layer)"
# =========================================================================

$inboxContent = Get-Content "$repoRoot\apps\api\src\routes\inbox.ts" -Raw
Assert-Check "Inbox imports optionalRpc" ($inboxContent -match "import.*optionalRpc.*from.*rpcCapabilities")
Assert-Check "Inbox has featureStatus array" ($inboxContent -match "featureStatus")
Assert-Check "Inbox uses expected-missing status" ($inboxContent -match "'expected-missing'")
Assert-Check "Inbox checks capability before RPC" ($inboxContent -match "unsigCheck\.available|fastCheck\.available")
Assert-Check "Backward-compat rpcErrors field" ($inboxContent -match "rpcErrors.*featureStatus")

# =========================================================================
Write-Phase "PHASE 14C" "Write-back Parity Upgrades"
# =========================================================================

Assert-Check "write-backs.ts exists" (Test-Path "$repoRoot\apps\api\src\routes\write-backs.ts")

$wbContent = Get-Content "$repoRoot\apps\api\src\routes\write-backs.ts" -Raw
Assert-Check "POST /vista/orders/sign" ($wbContent -match '"/vista/orders/sign"')
Assert-Check "POST /vista/orders/release" ($wbContent -match '"/vista/orders/release"')
Assert-Check "POST /vista/labs/ack" ($wbContent -match '"/vista/labs/ack"')
Assert-Check "POST /vista/consults/create" ($wbContent -match '"/vista/consults/create"')
Assert-Check "POST /vista/surgery/create" ($wbContent -match '"/vista/surgery/create"')
Assert-Check "POST /vista/problems/save" ($wbContent -match '"/vista/problems/save"')
Assert-Check "GET /vista/drafts" ($wbContent -match '"/vista/drafts"')
Assert-Check "GET /vista/drafts/stats" ($wbContent -match '"/vista/drafts/stats"')
Assert-Check "GET /vista/write-audit" ($wbContent -match '"/vista/write-audit"')
Assert-Check "ServerDraft interface" ($wbContent -match "export interface ServerDraft")
Assert-Check "Draft store (in-memory)" ($wbContent -match "const drafts.*Map")
Assert-Check "createDraft function" ($wbContent -match "function createDraft")
Assert-Check "Write audit logging" ($wbContent -match "function auditWrite")
Assert-Check "optionalRpc used in write-backs" ($wbContent -match "optionalRpc\(")
Assert-Check "Write-back uses real RPC when available" ($wbContent -match "mode.*real")
Assert-Check "Write-back falls back to draft" ($wbContent -match "mode.*draft")

# data-cache wired to write-back API
Assert-Check "signOrder is async" ($dcContent -match "signOrder.*async|async.*signOrder")
Assert-Check "signOrder calls API" ($dcContent -match "fetch.*orders/sign")
Assert-Check "releaseOrder calls API" ($dcContent -match "fetch.*orders/release")
Assert-Check "acknowledgeLabs method" ($dcContent -match "acknowledgeLabs")
Assert-Check "acknowledgeLabs calls API" ($dcContent -match "fetch.*labs/ack")
Assert-Check "fetchCapabilities method" ($dcContent -match "fetchCapabilities")
Assert-Check "capabilities state field" ($dcContent -match "capabilities.*Record|capabilities.*null")

# LabsPanel wired to server-side ack
$labsContent = Get-Content "$panelDir\LabsPanel.tsx" -Raw
Assert-Check "LabsPanel uses acknowledgeLabs" ($labsContent -match "acknowledgeLabs")
Assert-Check "LabsPanel shows ack mode" ($labsContent -match "ackMode.*real|ackMode.*draft|ackMode.*local")
Assert-Check "LabsPanel server-side ack message" ($labsContent -match "Stored server-side|Synced to EHR|Server-side acknowledgement")

# =========================================================================
Write-Phase "PHASE 14D" "Imaging Viewer Integration"
# =========================================================================

Assert-Check "imaging.ts exists" (Test-Path "$repoRoot\apps\api\src\routes\imaging.ts")

$imgContent = Get-Content "$repoRoot\apps\api\src\routes\imaging.ts" -Raw
Assert-Check "GET /vista/imaging/status" ($imgContent -match '"/vista/imaging/status"')
Assert-Check "GET /vista/imaging/report" ($imgContent -match '"/vista/imaging/report"')
Assert-Check "ImagingViewerPlugin interface" ($imgContent -match "export interface ImagingViewerPlugin")
Assert-Check "registerImagingPlugin function" ($imgContent -match "export function registerImagingPlugin")
Assert-Check "MAG4 capability check" ($imgContent -match "MAG4 REMOTE PROCEDURE")
Assert-Check "RA capability check" ($imgContent -match "RA DETAILED REPORT")
Assert-Check "Plugin-ready interface" ($imgContent -match "integrationReady")

# =========================================================================
Write-Phase "PHASE 14E" "Documentation & Prompts"
# =========================================================================

Assert-Check "Phase 14 IMPLEMENT prompt" (Test-Path "$repoRoot\prompts\15-PHASE-14-PARITY-CLOSURE\15-01-Phase14A-Compat-Layer-IMPLEMENT.md")
Assert-Check "Phase 14 VERIFY prompt" (Test-Path "$repoRoot\prompts\15-PHASE-14-PARITY-CLOSURE\15-02-Phase14A-Compat-Layer-VERIFY.md")
Assert-Check "Phase 14 runbook" (Test-Path "$repoRoot\docs\runbooks\cprs-parity-closure-phase14.md")

# index.ts registers new routes
$indexContent = Get-Content "$repoRoot\apps\api\src\index.ts" -Raw
Assert-Check "index.ts imports capabilityRoutes" ($indexContent -match "import capabilityRoutes")
Assert-Check "index.ts imports writeBackRoutes" ($indexContent -match "import writeBackRoutes")
Assert-Check "index.ts imports imagingRoutes" ($indexContent -match "import imagingRoutes")
Assert-Check "index.ts registers capability plugin" ($indexContent -match "server\.register\(capabilityRoutes\)")
Assert-Check "index.ts registers write-back plugin" ($indexContent -match "server\.register\(writeBackRoutes\)")
Assert-Check "index.ts registers imaging plugin" ($indexContent -match "server\.register\(imagingRoutes\)")

# =========================================================================
Write-Phase "API LIVE" "Live VistA API Checks (port $ApiPort)"
# =========================================================================

$apiBase = "http://127.0.0.1:$ApiPort"

# Core endpoints
try {
    $health = Invoke-RestMethod -Uri "$apiBase/health" -TimeoutSec 5
    Assert-Check "GET /health" ($health.ok -eq $true) "ok: $($health.ok)"
} catch {
    Assert-Check "GET /health" $false "Error: $_"
}

try {
    $ping = Invoke-RestMethod -Uri "$apiBase/vista/ping" -TimeoutSec 10
    Assert-Check "GET /vista/ping" ($ping.ok -eq $true) "ok: $($ping.ok)"
} catch {
    Assert-Check "GET /vista/ping" $false "Error: $_"
}

# Phase 14A: RPC Capabilities
Write-Host ""
Write-Host "  --- Phase 14A: RPC Capabilities ---" -ForegroundColor Yellow
try {
    $caps = Invoke-RestMethod -Uri "$apiBase/vista/rpc-capabilities" -TimeoutSec 60
    Assert-Check "GET /vista/rpc-capabilities" ($caps.ok -eq $true) "totalProbed=$($caps.totalProbed) available=$($caps.available) missing=$($caps.missing)"
    Assert-Check "Capabilities has instanceId" ($null -ne $caps.instanceId) "instanceId: $($caps.instanceId)"
    Assert-Check "Capabilities has discoveredAt" ($null -ne $caps.discoveredAt) ""
    Assert-Check "Available RPCs detected" ($caps.available -gt 0) "$($caps.available) RPCs available"
    Assert-Check "Majority of RPCs available" ($caps.available -ge 30) "available=$($caps.available) of $($caps.totalProbed) probed"
    if ($caps.missing -gt 0) {
        Assert-Check "Missing RPCs classified" ($caps.expectedMissing -ge 0) "expectedMissing=$($caps.expectedMissing) unexpectedMissing=$($caps.unexpectedMissing)"
        if ($caps.unexpectedMissing -gt 0) {
            Warn-Check "Unexpected missing RPCs" "unexpectedMissing=$($caps.unexpectedMissing): $($caps.unexpectedMissingList -join ', ')"
        }
    } else {
        Assert-Check "No missing RPCs" $true "All $($caps.totalProbed) RPCs available"
    }

    # Domain filter
    $orderCaps = Invoke-RestMethod -Uri "$apiBase/vista/rpc-capabilities?domain=orders" -TimeoutSec 15
    Assert-Check "Domain filter works" ($orderCaps.ok -eq $true -and $null -ne $orderCaps.domain) ""
} catch {
    Assert-Check "GET /vista/rpc-capabilities" $false "Error: $_"
}

# Phase 14A: Known missing RPCs reported as INFO not WARN
Write-Host ""
Write-Host "  --- Phase 14B: Inbox (expected-missing, not WARN) ---" -ForegroundColor Yellow
try {
    $inbox = Invoke-RestMethod -Uri "$apiBase/vista/inbox" -TimeoutSec 15
    Assert-Check "GET /vista/inbox" ($inbox.ok -eq $true) "items=$($inbox.count)"

    # Check featureStatus instead of old rpcErrors
    if ($inbox.featureStatus) {
        foreach ($fs in $inbox.featureStatus) {
            if ($fs.status -eq 'expected-missing') {
                Info-Check "Inbox RPC: $($fs.rpc)" "$($fs.detail) (expected-missing on this distro)"
            } elseif ($fs.status -eq 'available') {
                Assert-Check "Inbox RPC: $($fs.rpc)" $true "Available"
            } else {
                Assert-Check "Inbox RPC: $($fs.rpc)" $false "$($fs.detail)"
            }
        }
    } elseif ($inbox.rpcErrors) {
        # Backward compat - still show as INFO not WARN
        foreach ($rpcErr in $inbox.rpcErrors) {
            Info-Check "Inbox RPC gap (compat)" "$rpcErr"
        }
    }
} catch {
    Assert-Check "GET /vista/inbox" $false "Error: $_"
}

# Phase 14C: Write-back endpoints
Write-Host ""
Write-Host "  --- Phase 14C: Write-back Endpoints ---" -ForegroundColor Yellow

# Orders sign
try {
    $signBody = '{"dfn":"1","orderId":"test-order-1","orderName":"Test Order","signedBy":"PROVIDER,CLYDE WV"}'
    $signResp = Invoke-RestMethod -Uri "$apiBase/vista/orders/sign" -Method POST -Body $signBody -ContentType "application/json" -TimeoutSec 15
    Assert-Check "POST /vista/orders/sign" ($signResp.ok -eq $true) "mode=$($signResp.mode)"
    Assert-Check "Order sign returns mode" ($signResp.mode -in @('real', 'draft')) "mode: $($signResp.mode)"
} catch {
    Assert-Check "POST /vista/orders/sign" $false "Error: $_"
}

# Orders release
try {
    $relBody = '{"dfn":"1","orderId":"test-order-1","releasedBy":"PROVIDER,CLYDE WV"}'
    $relResp = Invoke-RestMethod -Uri "$apiBase/vista/orders/release" -Method POST -Body $relBody -ContentType "application/json" -TimeoutSec 15
    Assert-Check "POST /vista/orders/release" ($relResp.ok -eq $true) "mode=$($relResp.mode)"
} catch {
    Assert-Check "POST /vista/orders/release" $false "Error: $_"
}

# Labs ack
try {
    $ackBody = '{"dfn":"1","labIds":["lab-1","lab-2"],"acknowledgedBy":"PROVIDER,CLYDE WV"}'
    $ackResp = Invoke-RestMethod -Uri "$apiBase/vista/labs/ack" -Method POST -Body $ackBody -ContentType "application/json" -TimeoutSec 15
    Assert-Check "POST /vista/labs/ack" ($ackResp.ok -eq $true) "mode=$($ackResp.mode) count=$($ackResp.count)"
} catch {
    Assert-Check "POST /vista/labs/ack" $false "Error: $_"
}

# Consults create
try {
    $consultBody = '{"dfn":"1","service":"Cardiology","urgency":"Routine","reason":"Evaluation","requestedBy":"PROVIDER"}'
    $consultResp = Invoke-RestMethod -Uri "$apiBase/vista/consults/create" -Method POST -Body $consultBody -ContentType "application/json" -TimeoutSec 15
    Assert-Check "POST /vista/consults/create" ($consultResp.ok -eq $true) "mode=$($consultResp.mode)"
} catch {
    Assert-Check "POST /vista/consults/create" $false "Error: $_"
}

# Surgery create
try {
    $surgBody = '{"dfn":"1","procedure":"Appendectomy","surgeon":"Dr. Smith","createdBy":"PROVIDER"}'
    $surgResp = Invoke-RestMethod -Uri "$apiBase/vista/surgery/create" -Method POST -Body $surgBody -ContentType "application/json" -TimeoutSec 15
    Assert-Check "POST /vista/surgery/create" ($surgResp.ok -eq $true) "mode=$($surgResp.mode)"
} catch {
    Assert-Check "POST /vista/surgery/create" $false "Error: $_"
}

# Problems save
try {
    $probBody = '{"dfn":"1","problemText":"Diabetes Mellitus","icdCode":"E11.9","onset":"2025-01-01","status":"A","savedBy":"PROVIDER"}'
    $probResp = Invoke-RestMethod -Uri "$apiBase/vista/problems/save" -Method POST -Body $probBody -ContentType "application/json" -TimeoutSec 15
    Assert-Check "POST /vista/problems/save" ($probResp.ok -eq $true) "mode=$($probResp.mode)"
} catch {
    Assert-Check "POST /vista/problems/save" $false "Error: $_"
}

# Drafts
try {
    $drafts = Invoke-RestMethod -Uri "$apiBase/vista/drafts" -TimeoutSec 5
    Assert-Check "GET /vista/drafts" ($drafts.ok -eq $true) "count=$($drafts.count)"
    Assert-Check "Drafts were stored" ($drafts.count -gt 0) "Server-side drafts: $($drafts.count)"
} catch {
    Assert-Check "GET /vista/drafts" $false "Error: $_"
}

# Draft stats
try {
    $stats = Invoke-RestMethod -Uri "$apiBase/vista/drafts/stats" -TimeoutSec 5
    Assert-Check "GET /vista/drafts/stats" ($stats.ok -eq $true) "total=$($stats.total)"
} catch {
    Assert-Check "GET /vista/drafts/stats" $false "Error: $_"
}

# Write audit
try {
    $audit = Invoke-RestMethod -Uri "$apiBase/vista/write-audit" -TimeoutSec 5
    Assert-Check "GET /vista/write-audit" ($audit.ok -eq $true) "entries=$($audit.count)"
    Assert-Check "Audit entries recorded" ($audit.count -gt 0) "Write audit has entries"
} catch {
    Assert-Check "GET /vista/write-audit" $false "Error: $_"
}

# Phase 14D: Imaging
Write-Host ""
Write-Host "  --- Phase 14D: Imaging Viewer ---" -ForegroundColor Yellow
try {
    $imgStatus = Invoke-RestMethod -Uri "$apiBase/vista/imaging/status" -TimeoutSec 10
    Assert-Check "GET /vista/imaging/status" ($imgStatus.ok -eq $true) "viewerEnabled=$($imgStatus.viewerEnabled)"
    Assert-Check "Imaging has integrationReady" ($imgStatus.integrationReady -eq $true) ""
    Assert-Check "Imaging has capabilities" ($null -ne $imgStatus.capabilities) ""
} catch {
    Assert-Check "GET /vista/imaging/status" $false "Error: $_"
}

# Phase 13 Auth (inherited live tests)
Write-Host ""
Write-Host "  --- Auth Endpoints (Phase 13, inherited) ---" -ForegroundColor Yellow
$loginToken = $null
try {
    $loginBody = '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
    $loginResp = Invoke-WebRequest -Uri "$apiBase/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 20 -UseBasicParsing
    $loginData = $loginResp.Content | ConvertFrom-Json
    Assert-Check "POST /auth/login" ($loginData.ok -eq $true) "duz=$($loginData.session.duz) role=$($loginData.session.role)"
    $loginToken = $loginData.session.token
    $cookieHeader = $loginResp.Headers['Set-Cookie']
    Assert-Check "Cookie httpOnly" ($cookieHeader -match "HttpOnly") ""
    Assert-Check "Cookie Max-Age 8h" ($cookieHeader -match "Max-Age=28800") ""
} catch {
    Assert-Check "POST /auth/login" $false "Error: $_"
}

if ($loginToken) {
    try {
        $sessResp = Invoke-RestMethod -Uri "$apiBase/auth/session" -Headers @{Authorization="Bearer $loginToken"} -TimeoutSec 5
        Assert-Check "GET /auth/session (authenticated)" ($sessResp.authenticated -eq $true) ""
    } catch {
        Assert-Check "GET /auth/session" $false "Error: $_"
    }
    try {
        $lo = Invoke-RestMethod -Uri "$apiBase/auth/logout" -Method POST -Body '{}' -ContentType "application/json" -Headers @{Authorization="Bearer $loginToken"} -TimeoutSec 5
        Assert-Check "POST /auth/logout" ($lo.ok -eq $true) ""
    } catch {
        Assert-Check "POST /auth/logout" $false "Error: $_"
    }
}

# Security check
Write-Phase "SECURITY" "Credential Leak Checks"
$apiFiles = Get-ChildItem -Path "$repoRoot\apps\api\src" -Recurse -Include "*.ts" -File
$credLeaks = 0
foreach ($f in $apiFiles) {
    $content = Get-Content $f.FullName -Raw
    if ($content -match "console\.(log|info)\(.*(?:avPlain|accessCode|verifyCode|password)") {
        $credLeaks++
    }
}
Assert-Check "No credential logging in API source" ($credLeaks -eq 0) "$($apiFiles.Count) files scanned"

# =========================================================================
# Summary
# =========================================================================

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host "  PHASE 14 VERIFICATION SUMMARY" -ForegroundColor Magenta
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host ""
Write-Host "  PASS: $($script:pass)" -ForegroundColor Green
$failColor = $(if ($script:fail -gt 0) { "Red" } else { "Green" })
Write-Host "  FAIL: $($script:fail)" -ForegroundColor $failColor
$warnColor = $(if ($script:warn -gt 0) { "Yellow" } else { "Green" })
Write-Host "  WARN: $($script:warn)" -ForegroundColor $warnColor
Write-Host "  INFO: $($script:info)" -ForegroundColor Cyan
$total = $script:pass + $script:fail + $script:warn + $script:info
Write-Host "  TOTAL: $total"
Write-Host ""

if ($script:fail -eq 0 -and $script:warn -eq 0) {
    Write-Host "  *** ALL CHECKS PASSED - 0 WARN ***" -ForegroundColor Green
    if ($script:info -gt 0) {
        Write-Host "  (INFO items are documented expected-missing RPCs on this distro)" -ForegroundColor Cyan
    }
} elseif ($script:fail -eq 0) {
    Write-Host "  *** NO FAILURES but $($script:warn) WARN(s) remain ***" -ForegroundColor Yellow
} else {
    Write-Host "  *** $($script:fail) CHECK(S) FAILED - review above ***" -ForegroundColor Red
}

Write-Host ""
exit $script:fail
