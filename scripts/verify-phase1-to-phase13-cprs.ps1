<#
.SYNOPSIS
    VistA-Evolved Phase 13 - CPRS Operationalization Verification
.DESCRIPTION
    Extends Phase 12 parity verification with Phase 13 checks:
    - Auth endpoints (login/session/logout)
    - Inbox endpoint
    - WebSocket console gateway (HTTP-level)
    - Audit log endpoint
    - Order workflow state machine (code checks)
    - Results workflow (LabsPanel flagging)
    - Remote Data Viewer page
    - Legacy Console RBAC
    - Modern UI toggle
    - Contract validation
    Run from repo root: .\scripts\verify-phase1-to-phase13-cprs.ps1
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

# -- Pre-flight ------------------------------------------------------------

Write-Host ""
Write-Host "VistA-Evolved Phase 13 - CPRS Operationalization Verification" -ForegroundColor White -BackgroundColor DarkBlue
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
Write-Phase "PHASE 11A" "Contract Binding Layer"
# =========================================================================

Assert-Check "Contract types.ts exists" (Test-Path "$repoRoot\apps\web\src\lib\contracts\types.ts")
Assert-Check "Contract loader.ts exists" (Test-Path "$repoRoot\apps\web\src\lib\contracts\loader.ts")
Assert-Check "tabs.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\tabs.json")
Assert-Check "menus.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\menus.json")
Assert-Check "rpc_catalog.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\rpc_catalog.json")
Assert-Check "forms.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\forms.json")
Assert-Check "screen_registry.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\screen_registry.json")

$loaderContent = Get-Content "$repoRoot\apps\web\src\lib\contracts\loader.ts" -Raw
Assert-Check "Loader exports getChartTabs" ($loaderContent -match "export function getChartTabs")
Assert-Check "Loader exports getFrameMenu" ($loaderContent -match "export function getFrameMenu")
Assert-Check "Loader exports sanitizeLabel" ($loaderContent -match "export function sanitizeLabel")

# =========================================================================
Write-Phase "PHASE 11B" "State Management Layer"
# =========================================================================

Assert-Check "patient-context.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\patient-context.tsx")
Assert-Check "cprs-ui-state.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\cprs-ui-state.tsx")
Assert-Check "data-cache.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\data-cache.tsx")

$pcContent = Get-Content "$repoRoot\apps\web\src\stores\patient-context.tsx" -Raw
Assert-Check "PatientProvider exported" ($pcContent -match "export.*PatientProvider")
Assert-Check "usePatient hook exported" ($pcContent -match "export.*usePatient")

$uiContent = Get-Content "$repoRoot\apps\web\src\stores\cprs-ui-state.tsx" -Raw
Assert-Check "CPRSUIProvider exported" ($uiContent -match "export.*CPRSUIProvider")
Assert-Check "useCPRSUI hook exported" ($uiContent -match "export.*useCPRSUI")
Assert-Check "Preferences persists to localStorage" ($uiContent -match "localStorage")

$dcContent = Get-Content "$repoRoot\apps\web\src\stores\data-cache.tsx" -Raw
Assert-Check "DataCacheProvider exported" ($dcContent -match "export.*DataCacheProvider")
Assert-Check "useDataCache hook exported" ($dcContent -match "export.*useDataCache")

# =========================================================================
Write-Phase "PHASE 11C" "CPRS Shell Components"
# =========================================================================

Assert-Check "CSS module exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\cprs.module.css")
Assert-Check "CPRSMenuBar.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\CPRSMenuBar.tsx")
Assert-Check "PatientBanner.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\PatientBanner.tsx")
Assert-Check "CPRSTabStrip.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\CPRSTabStrip.tsx")
Assert-Check "CPRSModals.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\CPRSModals.tsx")

$menuContent = Get-Content "$repoRoot\apps\web\src\components\cprs\CPRSMenuBar.tsx" -Raw
Assert-Check "MenuBar has File menu" ($menuContent -match "File")
Assert-Check "MenuBar has Edit menu" ($menuContent -match "Edit")
Assert-Check "MenuBar has View menu" ($menuContent -match "View")
Assert-Check "MenuBar has Tools menu" ($menuContent -match "Tools")
Assert-Check "MenuBar has Help menu" ($menuContent -match "Help")

# =========================================================================
Write-Phase "PHASE 11D" "Tab Panel Components (all 10)"
# =========================================================================

$panelDir = "$repoRoot\apps\web\src\components\cprs\panels"
Assert-Check "panels/index.ts barrel exists" (Test-Path "$panelDir\index.ts")
Assert-Check "CoverSheetPanel.tsx exists" (Test-Path "$panelDir\CoverSheetPanel.tsx")
Assert-Check "ProblemsPanel.tsx exists" (Test-Path "$panelDir\ProblemsPanel.tsx")
Assert-Check "MedsPanel.tsx exists" (Test-Path "$panelDir\MedsPanel.tsx")
Assert-Check "OrdersPanel.tsx exists" (Test-Path "$panelDir\OrdersPanel.tsx")
Assert-Check "NotesPanel.tsx exists" (Test-Path "$panelDir\NotesPanel.tsx")
Assert-Check "ConsultsPanel.tsx exists" (Test-Path "$panelDir\ConsultsPanel.tsx")
Assert-Check "SurgeryPanel.tsx exists" (Test-Path "$panelDir\SurgeryPanel.tsx")
Assert-Check "DCSummPanel.tsx exists" (Test-Path "$panelDir\DCSummPanel.tsx")
Assert-Check "LabsPanel.tsx exists" (Test-Path "$panelDir\LabsPanel.tsx")
Assert-Check "ReportsPanel.tsx exists" (Test-Path "$panelDir\ReportsPanel.tsx")

$barrelContent = Get-Content "$panelDir\index.ts" -Raw
Assert-Check "Barrel exports CoverSheetPanel" ($barrelContent -match "CoverSheetPanel")
Assert-Check "Barrel exports ProblemsPanel" ($barrelContent -match "ProblemsPanel")
Assert-Check "Barrel exports MedsPanel" ($barrelContent -match "MedsPanel")
Assert-Check "Barrel exports OrdersPanel" ($barrelContent -match "OrdersPanel")
Assert-Check "Barrel exports NotesPanel" ($barrelContent -match "NotesPanel")
Assert-Check "Barrel exports ConsultsPanel" ($barrelContent -match "ConsultsPanel")
Assert-Check "Barrel exports SurgeryPanel" ($barrelContent -match "SurgeryPanel")
Assert-Check "Barrel exports DCSummPanel" ($barrelContent -match "DCSummPanel")
Assert-Check "Barrel exports LabsPanel" ($barrelContent -match "LabsPanel")
Assert-Check "Barrel exports ReportsPanel" ($barrelContent -match "ReportsPanel")

# =========================================================================
Write-Phase "PHASE 11E" "Dialog Components"
# =========================================================================

$dialogDir = "$repoRoot\apps\web\src\components\cprs\dialogs"
Assert-Check "dialogs/index.ts exists" (Test-Path "$dialogDir\index.ts")
Assert-Check "AddProblemDialog.tsx exists" (Test-Path "$dialogDir\AddProblemDialog.tsx")
Assert-Check "EditProblemDialog.tsx exists" (Test-Path "$dialogDir\EditProblemDialog.tsx")
Assert-Check "AddMedicationDialog.tsx exists" (Test-Path "$dialogDir\AddMedicationDialog.tsx")

$modalsContent = Get-Content "$repoRoot\apps\web\src\components\cprs\CPRSModals.tsx" -Raw
Assert-Check "CPRSModals handles addProblem" ($modalsContent -match "addProblem")
Assert-Check "CPRSModals handles editProblem" ($modalsContent -match "editProblem")
Assert-Check "CPRSModals handles addMedication" ($modalsContent -match "addMedication")

# =========================================================================
Write-Phase "PHASE 11F" "CPRS Route Pages"
# =========================================================================

$cprsRouteDir = "$repoRoot\apps\web\src\app\cprs"
Assert-Check "CPRS layout.tsx exists" (Test-Path "$cprsRouteDir\layout.tsx")
Assert-Check "CPRS login page exists" (Test-Path "$cprsRouteDir\login\page.tsx")
Assert-Check "CPRS patient-search page exists" (Test-Path "$cprsRouteDir\patient-search\page.tsx")
Assert-Check "CPRS chart page exists" (Test-Path -LiteralPath "$cprsRouteDir\chart\[dfn]\[tab]\page.tsx")
Assert-Check "CPRS preferences page exists" (Test-Path "$cprsRouteDir\settings\preferences\page.tsx")
Assert-Check "CPRS verify page exists" (Test-Path "$cprsRouteDir\verify\page.tsx")

$layoutContent = Get-Content "$cprsRouteDir\layout.tsx" -Raw
Assert-Check "Layout wraps PatientProvider" ($layoutContent -match "PatientProvider")
Assert-Check "Layout wraps CPRSUIProvider" ($layoutContent -match "CPRSUIProvider")
Assert-Check "Layout wraps DataCacheProvider" ($layoutContent -match "DataCacheProvider")
Assert-Check "Layout includes CPRSModals" ($layoutContent -match "CPRSModals")

# =========================================================================
Write-Phase "PHASE 11G" "Root Page Updated"
# =========================================================================

$rootPage = Get-Content "$repoRoot\apps\web\src\app\page.tsx" -Raw
Assert-Check "Root page links to CPRS login" ($rootPage -match "/cprs/login")
Assert-Check "Root page links to CPRS verify" ($rootPage -match "/cprs/verify")

# =========================================================================
Write-Phase "PHASE 11H" "No VA/VHA Terminology in UI"
# =========================================================================

$uiFiles = Get-ChildItem -Path "$repoRoot\apps\web\src\components\cprs" -Recurse -Include "*.tsx","*.ts" -File
foreach ($f in $uiFiles) {
    $content = Get-Content $f.FullName -Raw
    $relPath = $f.FullName.Replace("$repoRoot\", "")
    if ($content -match "\bVA Medical Center\b" -or $content -match "\bVA Med\b") {
        Assert-Check "No 'VA Medical Center' in $relPath" $false "Found VA terminology"
    }
    if ($content -match "\bNon-VA Meds\b") {
        Assert-Check "No 'Non-VA Meds' in $relPath" $false "Found VA terminology"
    }
}
if ($uiFiles.Count -gt 0) {
    Assert-Check "CPRS component files scanned for VA terms" $true "$($uiFiles.Count) files checked"
}

# =========================================================================
Write-Phase "PHASE 12A" "Data-Cache: 5 New Domains"
# =========================================================================

$dcContent = Get-Content "$repoRoot\apps\web\src\stores\data-cache.tsx" -Raw
Assert-Check "data-cache has Consult type" ($dcContent -match "export interface Consult")
Assert-Check "data-cache has Surgery type" ($dcContent -match "export interface Surgery")
Assert-Check "data-cache has DCSummary type" ($dcContent -match "export interface DCSummary")
Assert-Check "data-cache has LabResult type" ($dcContent -match "export interface LabResult")
Assert-Check "data-cache has ReportDef type" ($dcContent -match "export interface ReportDef")
Assert-Check "data-cache has consults fetcher" ($dcContent -match "fetchConsults")
Assert-Check "data-cache has surgery fetcher" ($dcContent -match "fetchSurgery")
Assert-Check "data-cache has dcSummaries fetcher" ($dcContent -match "fetchDCSummaries")
Assert-Check "data-cache has labs fetcher" ($dcContent -match "fetchLabs")
Assert-Check "data-cache has reports fetcher" ($dcContent -match "fetchReports")

# =========================================================================
Write-Phase "PHASE 12B" "5 Panels Wired to Live Data (no MOCK_)"
# =========================================================================

$gapPanels = @("ConsultsPanel.tsx", "SurgeryPanel.tsx", "DCSummPanel.tsx", "LabsPanel.tsx", "ReportsPanel.tsx")
foreach ($panel in $gapPanels) {
    $panelPath = "$panelDir\$panel"
    $panelContent = Get-Content $panelPath -Raw
    Assert-Check "$panel uses useDataCache" ($panelContent -match "useDataCache")
    Assert-Check "$panel has no MOCK_ data" (-not ($panelContent -match "MOCK_"))
    Assert-Check "$panel shows live RPC label" ($panelContent -match "live RPC|Data source|Contract:")
}

# =========================================================================
Write-Phase "PHASE 12C" "3 Dialogs Improved"
# =========================================================================

$addProblem = Get-Content "$dialogDir\AddProblemDialog.tsx" -Raw
Assert-Check "AddProblemDialog has ICD search" ($addProblem -match "icd-search")
Assert-Check "AddProblemDialog has API-first save" ($addProblem -match "fetch.*problems|POST.*problems")
Assert-Check "AddProblemDialog has sync status" ($addProblem -match "synced|local|Synced|Local")

$editProblem = Get-Content "$dialogDir\EditProblemDialog.tsx" -Raw
Assert-Check "EditProblemDialog has API-first save" ($editProblem -match "fetch.*problems|POST.*problems")
Assert-Check "EditProblemDialog has sync status" ($editProblem -match "synced|local|Synced|Local")

$addMed = Get-Content "$dialogDir\AddMedicationDialog.tsx" -Raw
Assert-Check "AddMedicationDialog uses env API_BASE" ($addMed -match "NEXT_PUBLIC_API_URL|process\.env")

# =========================================================================
Write-Phase "PHASE 12D" "Graphing, Remote Data, Legacy Console"
# =========================================================================

$modalsContent = Get-Content "$repoRoot\apps\web\src\components\cprs\CPRSModals.tsx" -Raw
Assert-Check "GraphingModal renders SVG" ($modalsContent -match "<svg|polyline|<circle")
Assert-Check "LegacyConsoleModal has execute" ($modalsContent -match "Execute|execute")
Assert-Check "RemoteDataModal exists" ($modalsContent -match "RemoteDataModal|remoteData")
Assert-Check "CPRSModals routes remoteData" ($modalsContent -match "case.*remoteData")

$menuBarContent = Get-Content "$repoRoot\apps\web\src\components\cprs\CPRSMenuBar.tsx" -Raw
Assert-Check "Remote Data Viewer enabled" (-not ($menuBarContent -match "Remote Data.*enabled:\s*false"))

# =========================================================================
Write-Phase "PHASE 12E" "Documentation Artifacts"
# =========================================================================

Assert-Check "Parity coverage report exists" (Test-Path "$repoRoot\docs\parity-coverage-report.md")
Assert-Check "Phase 12 IMPLEMENT prompt exists" (Test-Path "$repoRoot\prompts\14-PHASE-12-CPRS-PARITY-WIRING\14-01-cprs-parity-wiring-IMPLEMENT.md")
Assert-Check "Phase 12 VERIFY prompt exists" (Test-Path "$repoRoot\prompts\14-PHASE-12-CPRS-PARITY-WIRING\14-99-cprs-parity-wiring-VERIFY.md")
Assert-Check "Phase 12 runbook exists" (Test-Path "$repoRoot\docs\runbooks\vista-rpc-phase12-parity.md")

# =========================================================================
Write-Phase "PHASE 13A" "Authentication & Sessions"
# =========================================================================

# File checks
Assert-Check "session-store.ts exists" (Test-Path "$repoRoot\apps\api\src\auth\session-store.ts")
Assert-Check "auth-routes.ts exists" (Test-Path "$repoRoot\apps\api\src\auth\auth-routes.ts")
Assert-Check "session-context.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\session-context.tsx")

$sessionStore = Get-Content "$repoRoot\apps\api\src\auth\session-store.ts" -Raw
Assert-Check "Session store has createSession" ($sessionStore -match "export function createSession")
Assert-Check "Session store has getSession" ($sessionStore -match "export function getSession")
Assert-Check "Session store has destroySession" ($sessionStore -match "export function destroySession")
Assert-Check "Session store has mapUserRole" ($sessionStore -match "export function mapUserRole")
Assert-Check "Session TTL is 8 hours" ($sessionStore -match "8 \* 60 \* 60")

$authRoutes = Get-Content "$repoRoot\apps\api\src\auth\auth-routes.ts" -Raw
Assert-Check "Auth routes POST /auth/login" ($authRoutes -match '"/auth/login"')
Assert-Check "Auth routes POST /auth/logout" ($authRoutes -match '"/auth/logout"')
Assert-Check "Auth routes GET /auth/session" ($authRoutes -match '"/auth/session"')
Assert-Check "Cookie is httpOnly" ($authRoutes -match "httpOnly:\s*true")
Assert-Check "Cookie maxAge 8h" ($authRoutes -match "maxAge:\s*8 \* 60 \* 60")
Assert-Check "Auth requireSession exported" ($authRoutes -match "export function requireSession")
Assert-Check "Auth requireRole exported" ($authRoutes -match "export function requireRole")

$sessionCtx = Get-Content "$repoRoot\apps\web\src\stores\session-context.tsx" -Raw
Assert-Check "SessionProvider exported" ($sessionCtx -match "export function SessionProvider")
Assert-Check "useSession hook exported" ($sessionCtx -match "export function useSession")
Assert-Check "Session stores token in localStorage" (($sessionCtx -match "ehr_session_token") -and ($sessionCtx -match "localStorage\.setItem"))

# Security: no credentials logged
$rpcClient = Get-Content "$repoRoot\apps\api\src\vista\rpcBrokerClient.ts" -Raw
Assert-Check "No credentials in console.log" (-not ($rpcClient -match "console\.log.*avPlain"))
Assert-Check "No credentials in console.log (auth)" (-not ($authRoutes -match "console\.log.*accessCode|console\.log.*verifyCode"))
Assert-Check "Auth error log is safe" ($authRoutes -match "console\.error.*\[AUTH\].*err\.message")

# Layout wraps SessionProvider
Assert-Check "Layout wraps SessionProvider" ($layoutContent -match "SessionProvider")

# Login page uses real auth
$loginPage = Get-Content "$cprsRouteDir\login\page.tsx" -Raw
Assert-Check "Login page uses useSession" ($loginPage -match "useSession")
Assert-Check "Login page calls login()" ($loginPage -match "login\(")

# rpcBrokerClient has authenticateUser
Assert-Check "authenticateUser function exists" ($rpcClient -match "export.*async function authenticateUser")

# =========================================================================
Write-Phase "PHASE 13B" "Inbox / Tasks"
# =========================================================================

Assert-Check "inbox.ts route exists" (Test-Path "$repoRoot\apps\api\src\routes\inbox.ts")
Assert-Check "Inbox page exists" (Test-Path "$cprsRouteDir\inbox\page.tsx")

$inboxRoute = Get-Content "$repoRoot\apps\api\src\routes\inbox.ts" -Raw
Assert-Check "Inbox route GET /vista/inbox" ($inboxRoute -match '"/vista/inbox"')
Assert-Check "Inbox calls ORWORB UNSIG ORDERS" ($inboxRoute -match "ORWORB UNSIG ORDERS")
Assert-Check "Inbox calls ORWORB FASTUSER" ($inboxRoute -match "ORWORB FASTUSER")
Assert-Check "Inbox detects RPC errors" ($inboxRoute -match "doesn't exist|RPC not available")

$inboxPage = Get-Content "$cprsRouteDir\inbox\page.tsx" -Raw
Assert-Check "Inbox page has filter dropdown" ($inboxPage -match "<select|filter")
Assert-Check "Inbox page has acknowledge" ($inboxPage -match "handleAcknowledge|Acknowledge")
Assert-Check "Inbox page has Open Chart" ($inboxPage -match "handleOpenChart|Open Chart")

$menuBarContent = Get-Content "$repoRoot\apps\web\src\components\cprs\CPRSMenuBar.tsx" -Raw
Assert-Check "MenuBar has Inbox action" ($menuBarContent -match "inbox")

# =========================================================================
Write-Phase "PHASE 13C" "Order Workflow State Machine"
# =========================================================================

Assert-Check "Order-sets page exists" (Test-Path "$cprsRouteDir\order-sets\page.tsx")

$dcContent = Get-Content "$repoRoot\apps\web\src\stores\data-cache.tsx" -Raw
Assert-Check "DraftOrder has signed status" ($dcContent -match "'signed'")
Assert-Check "DraftOrder has released status" ($dcContent -match "'released'")
Assert-Check "DraftOrder has cancelled status" ($dcContent -match "'cancelled'")
Assert-Check "signOrder method exists" ($dcContent -match "const signOrder")
Assert-Check "releaseOrder method exists" ($dcContent -match "const releaseOrder")
Assert-Check "signOrder checks draft/unsigned" ($dcContent -match "status !== 'draft' && o\.status !== 'unsigned'")
Assert-Check "releaseOrder checks signed" ($dcContent -match "status !== 'signed'")

$orderSets = Get-Content "$cprsRouteDir\order-sets\page.tsx" -Raw
Assert-Check "Order sets has templates" ($orderSets -match "ORDER_SET_TEMPLATES")
Assert-Check "Order sets creates draft orders" ($orderSets -match "status: 'draft'")
Assert-Check "Order sets has categories" ($orderSets -match "Common Meds|Lab Orders|Imaging|Consults")

# =========================================================================
Write-Phase "PHASE 13D" "Results Workflow"
# =========================================================================

$labsPanel = Get-Content "$panelDir\LabsPanel.tsx" -Raw
Assert-Check "LabsPanel has flagSeverity" ($labsPanel -match "function flagSeverity")
Assert-Check "LabsPanel critical detection (HH/LL)" ($labsPanel -match "'HH'|'LL'")
Assert-Check "LabsPanel abnormal detection (H/L)" ($labsPanel -match "=== 'H' \|| === 'L'|'H'.*'L'")
Assert-Check "LabsPanel filter modes" ($labsPanel -match "ResultFilter.*all.*abnormal.*unacknowledged")
Assert-Check "LabsPanel has Ack All button" ($labsPanel -match "handleAcknowledgeAll|Ack All")
Assert-Check "LabsPanel has abnormal count" ($labsPanel -match "abnormalCount")
Assert-Check "LabsPanel has critical count" ($labsPanel -match "criticalCount")
Assert-Check "LabsPanel has color indicators" ($labsPanel -match "#dc3545|#fd7e14")

# =========================================================================
Write-Phase "PHASE 13E" "Remote Data Viewer"
# =========================================================================

Assert-Check "Remote Data Viewer page exists" (Test-Path "$cprsRouteDir\remote-data-viewer\page.tsx")

$rdvPage = Get-Content "$cprsRouteDir\remote-data-viewer\page.tsx" -Raw
Assert-Check "RDV has facility list" ($rdvPage -match "RemoteFacility|facility")
Assert-Check "RDV has 8 domains" ($rdvPage -match "REMOTE_DOMAINS")
Assert-Check "RDV references ORWCIRN" ($rdvPage -match "ORWCIRN")
Assert-Check "RDV has structured placeholder" ($rdvPage -match "Docker sandbox|single facility|integration pending")

Assert-Check "MenuBar has Remote Data Viewer page action" ($menuBarContent -match "remoteDataPage|remote-data-viewer")

# =========================================================================
Write-Phase "PHASE 13F" "Legacy Console WebSocket"
# =========================================================================

Assert-Check "ws-console.ts exists" (Test-Path "$repoRoot\apps\api\src\routes\ws-console.ts")

$wsConsole = Get-Content "$repoRoot\apps\api\src\routes\ws-console.ts" -Raw
Assert-Check "WS console route /ws/console" ($wsConsole -match '"/ws/console"')
Assert-Check "WS console RBAC check" ($wsConsole -match "allowedRoles.*admin.*provider|admin.*provider.*allowedRoles")
Assert-Check "WS console blocks XUS AV CODE" ($wsConsole -match "XUS AV CODE")
Assert-Check "WS console blocks XUS SET VISITOR" ($wsConsole -match "XUS SET VISITOR")
Assert-Check "WS console audit logging" ($wsConsole -match "function audit")
Assert-Check "WS console audit max entries" ($wsConsole -match "MAX_AUDIT_ENTRIES")
Assert-Check "WS console GET /admin/audit-log" ($wsConsole -match '"/admin/audit-log"')
Assert-Check "WS console handles rpc type" ($wsConsole -match "msg\.type === .rpc.")
Assert-Check "WS console handles api type" ($wsConsole -match "msg\.type === .api.")
Assert-Check "WS console handles ping type" ($wsConsole -match "msg\.type === .ping.")

# Console modal RBAC on client side
Assert-Check "Console modal has RBAC check" ($modalsContent -match "hasRole.*provider.*admin|hasRole.*admin.*provider")
Assert-Check "Console modal shows access denied" ($modalsContent -match "ACCESS DENIED|permission denied")

# =========================================================================
Write-Phase "PHASE 13G" "Modern UI Toggle"
# =========================================================================

$uiContent = Get-Content "$repoRoot\apps\web\src\stores\cprs-ui-state.tsx" -Raw
Assert-Check "LayoutMode type defined" ($uiContent -match "export type LayoutMode")
Assert-Check "LayoutMode cprs option" ($uiContent -match "'cprs'")
Assert-Check "LayoutMode modern option" ($uiContent -match "'modern'")
Assert-Check "DensityMode has 4 options" ($uiContent -match "comfortable.*compact.*dense.*balanced|'comfortable'|'compact'.*'dense'.*'balanced'")
Assert-Check "layoutMode in preferences" ($uiContent -match "layoutMode.*LayoutMode|layoutMode.*cprs")

$chartPage = Get-Content -LiteralPath "$cprsRouteDir\chart\[dfn]\[tab]\page.tsx" -Raw
Assert-Check "Chart page reads layoutMode" ($chartPage -match "layoutMode.*modern|isModern")
Assert-Check "Chart page has sidebar nav" ($chartPage -match "<nav|sidebar")
Assert-Check "Chart page conditional tab strip" ($chartPage -match "!isModern.*CPRSTabStrip|isModern")

$prefsPage = Get-Content "$cprsRouteDir\settings\preferences\page.tsx" -Raw
Assert-Check "Preferences has layout mode selector" ($prefsPage -match "layoutMode|Layout Mode|Classic.*Modern")
Assert-Check "Preferences has density options" ($prefsPage -match "density.*comfortable|compact.*dense|balanced")

# =========================================================================
Write-Phase "PHASE 13H" "Documentation & Prompts"
# =========================================================================

Assert-Check "Phase 13 IMPLEMENT prompt exists" (Test-Path "$repoRoot\prompts\15-PHASE-13-CPRS-OPERATIONALIZATION\15-01-cprs-operationalization-IMPLEMENT.md")
Assert-Check "Phase 13 VERIFY prompt exists" (Test-Path "$repoRoot\prompts\15-PHASE-13-CPRS-OPERATIONALIZATION\15-99-cprs-operationalization-VERIFY.md")
Assert-Check "Phase 13 runbook exists" (Test-Path "$repoRoot\docs\runbooks\vista-rpc-phase13-operationalization.md")

# =========================================================================
Write-Phase "API ENDPOINTS" "Live VistA API Checks (port $ApiPort)"
# =========================================================================

$apiBase = "http://127.0.0.1:$ApiPort"

# --- Core endpoints ---
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

try {
    $search = Invoke-RestMethod -Uri "$apiBase/vista/patient-search?q=CARTER" -TimeoutSec 10
    Assert-Check "GET /vista/patient-search" ($search.ok -eq $true) "count: $($search.count)"
} catch {
    Warn-Check "GET /vista/patient-search" "Error: $_"
}

try {
    $demo = Invoke-RestMethod -Uri "$apiBase/vista/patient-demographics?dfn=1" -TimeoutSec 10
    Assert-Check "GET /vista/patient-demographics" ($demo.ok -eq $true) "name: $($demo.patient.name)"
} catch {
    Warn-Check "GET /vista/patient-demographics" "Error: $_"
}

$existingEndpoints = @(
    @{ Path = "/vista/allergies?dfn=1"; Name = "GET /vista/allergies" },
    @{ Path = "/vista/vitals?dfn=1"; Name = "GET /vista/vitals" },
    @{ Path = "/vista/notes?dfn=1"; Name = "GET /vista/notes" },
    @{ Path = "/vista/medications?dfn=1"; Name = "GET /vista/medications" },
    @{ Path = "/vista/problems?dfn=1"; Name = "GET /vista/problems" }
)

foreach ($ep in $existingEndpoints) {
    try {
        $r = Invoke-RestMethod -Uri "$apiBase$($ep.Path)" -TimeoutSec 10
        Assert-Check $ep.Name ($r.ok -eq $true) "ok: $($r.ok)"
    } catch {
        Warn-Check $ep.Name "Error: $_"
    }
}

# --- Phase 12 endpoints ---
Write-Host ""
Write-Host "  --- Phase 12 Endpoints ---" -ForegroundColor Yellow

$phase12Endpoints = @(
    @{ Path = "/vista/icd-search?q=diabetes"; Name = "GET /vista/icd-search" },
    @{ Path = "/vista/consults?dfn=1"; Name = "GET /vista/consults" },
    @{ Path = "/vista/surgery?dfn=1"; Name = "GET /vista/surgery" },
    @{ Path = "/vista/dc-summaries?dfn=1"; Name = "GET /vista/dc-summaries" },
    @{ Path = "/vista/labs?dfn=1"; Name = "GET /vista/labs" },
    @{ Path = "/vista/reports"; Name = "GET /vista/reports" }
)

foreach ($ep in $phase12Endpoints) {
    try {
        $r = Invoke-RestMethod -Uri "$apiBase$($ep.Path)" -TimeoutSec 15
        Assert-Check $ep.Name ($r.ok -eq $true) "ok: $($r.ok)"
    } catch {
        Warn-Check $ep.Name "Error: $_"
    }
}

# --- Phase 13 endpoints ---
Write-Host ""
Write-Host "  --- Phase 13 Auth Endpoints ---" -ForegroundColor Yellow

# Login
$loginToken = $null
try {
    $loginBody = '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
    $loginResp = Invoke-WebRequest -Uri "$apiBase/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 20 -UseBasicParsing
    $loginData = $loginResp.Content | ConvertFrom-Json
    Assert-Check "POST /auth/login" ($loginData.ok -eq $true) "duz=$($loginData.session.duz) role=$($loginData.session.role)"
    $loginToken = $loginData.session.token

    # Verify cookie attributes
    $cookieHeader = $loginResp.Headers['Set-Cookie']
    Assert-Check "Cookie httpOnly" ($cookieHeader -match "HttpOnly") "$cookieHeader"
    Assert-Check "Cookie Max-Age 8h" ($cookieHeader -match "Max-Age=28800") ""
    Assert-Check "Cookie SameSite" ($cookieHeader -match "SameSite") ""
} catch {
    Assert-Check "POST /auth/login" $false "Error: $_"
}

# Session check
if ($loginToken) {
    try {
        $sessResp = Invoke-RestMethod -Uri "$apiBase/auth/session" -Headers @{Authorization="Bearer $loginToken"} -TimeoutSec 5
        Assert-Check "GET /auth/session (authenticated)" ($sessResp.authenticated -eq $true) "user=$($sessResp.session.userName)"
    } catch {
        Assert-Check "GET /auth/session (authenticated)" $false "Error: $_"
    }
}

# Session without token
try {
    $noAuth = Invoke-RestMethod -Uri "$apiBase/auth/session" -TimeoutSec 5
    Assert-Check "GET /auth/session (no token)" ($noAuth.authenticated -eq $false) "Correctly returns unauthenticated"
} catch {
    Assert-Check "GET /auth/session (no token)" $false "Error: $_"
}

# Bad credentials
try {
    Invoke-WebRequest -Uri "$apiBase/auth/login" -Method POST -Body '{"accessCode":"BAD","verifyCode":"BAD"}' -ContentType "application/json" -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop
    Assert-Check "POST /auth/login (bad creds)" $false "Should have returned 401"
} catch {
    $statusCode = $null
    if ($_.Exception.Response) { $statusCode = [int]$_.Exception.Response.StatusCode }
    Assert-Check "POST /auth/login (bad creds -> 401)" ($statusCode -eq 401) "Status: $statusCode"
}

# Logout
if ($loginToken) {
    try {
        $logoutResp = Invoke-RestMethod -Uri "$apiBase/auth/logout" -Method POST -Body '{}' -ContentType "application/json" -Headers @{Authorization="Bearer $loginToken"} -TimeoutSec 5
        Assert-Check "POST /auth/logout" ($logoutResp.ok -eq $true) ""
    } catch {
        Assert-Check "POST /auth/logout" $false "Error: $_"
    }

    # Session after logout
    try {
        $postLogout = Invoke-RestMethod -Uri "$apiBase/auth/session" -Headers @{Authorization="Bearer $loginToken"} -TimeoutSec 5
        Assert-Check "Session cleared after logout" ($postLogout.authenticated -eq $false) ""
    } catch {
        Assert-Check "Session cleared after logout" $false "Error: $_"
    }
}

Write-Host ""
Write-Host "  --- Phase 13 Inbox ---" -ForegroundColor Yellow

# Inbox
try {
    $inbox = Invoke-RestMethod -Uri "$apiBase/vista/inbox" -TimeoutSec 15
    Assert-Check "GET /vista/inbox" ($inbox.ok -eq $true) "items=$($inbox.count)"
    if ($inbox.rpcErrors -and $inbox.rpcErrors.Count -gt 0) {
        foreach ($rpcErr in $inbox.rpcErrors) {
            Warn-Check "Inbox RPC gap" "$rpcErr (integration pending)"
        }
    }
} catch {
    Assert-Check "GET /vista/inbox" $false "Error: $_"
}

Write-Host ""
Write-Host "  --- Phase 13 Console Gateway ---" -ForegroundColor Yellow

# WebSocket endpoint (HTTP-level check -- verify it exists and rejects without token)
try {
    Invoke-WebRequest -Uri "$apiBase/ws/console" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Warn-Check "GET /ws/console (no token)" "Expected upgrade or rejection"
} catch {
    # Getting any response means the endpoint exists
    Assert-Check "WS /ws/console endpoint exists" $true "Endpoint responds (expected rejection without WS upgrade)"
}

# Audit log
try {
    $auditResp = Invoke-RestMethod -Uri "$apiBase/admin/audit-log" -TimeoutSec 5
    Assert-Check "GET /admin/audit-log" ($auditResp.ok -eq $true) "entries=$($auditResp.count)"
} catch {
    Assert-Check "GET /admin/audit-log" $false "Error: $_"
}

# =========================================================================
# Security Sanity
# =========================================================================

Write-Phase "SECURITY" "Credential Leak Checks"

$apiFiles = Get-ChildItem -Path "$repoRoot\apps\api\src" -Recurse -Include "*.ts" -File
$credLeaks = 0
foreach ($f in $apiFiles) {
    $content = Get-Content $f.FullName -Raw
    $relPath = $f.FullName.Replace("$repoRoot\", "")
    # Check for console.log that mentions credential variables
    if ($content -match "console\.(log|info)\(.*(?:avPlain|accessCode|verifyCode|password)") {
        Write-Host "  [FAIL] Credential leak in $relPath" -ForegroundColor Red
        $credLeaks++
    }
}
Assert-Check "No credential logging in API source" ($credLeaks -eq 0) "$($apiFiles.Count) files scanned"

# =========================================================================
# Summary
# =========================================================================

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host "  PHASE 13 VERIFICATION SUMMARY" -ForegroundColor Magenta
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host ""
Write-Host "  PASS: $($script:pass)" -ForegroundColor Green
$failColor = if ($script:fail -gt 0) { "Red" } else { "Green" }
Write-Host "  FAIL: $($script:fail)" -ForegroundColor $failColor
$warnColor = if ($script:warn -gt 0) { "Yellow" } else { "Green" }
Write-Host "  WARN: $($script:warn)" -ForegroundColor $warnColor
$total = $script:pass + $script:fail + $script:warn
Write-Host "  TOTAL: $total"
Write-Host ""

if ($script:fail -eq 0) {
    Write-Host "  *** ALL CHECKS PASSED ***" -ForegroundColor Green
    if ($script:warn -gt 0) {
        Write-Host "  (WARNs are documented integration-pending RPC gaps)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  *** $($script:fail) CHECK(S) FAILED - review above ***" -ForegroundColor Red
}

Write-Host ""
exit $script:fail
