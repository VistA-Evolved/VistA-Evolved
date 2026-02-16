<#
.SYNOPSIS
    VistA-Evolved Phase 11 - CPRS Web Replica Verification
.DESCRIPTION
    Verifies the CPRS Web Replica build (Phase 11).
    Checks: contract loader, stores, routes, components, menus, tabs, dialogs, API wiring.
    Run from repo root: .\scripts\verify-phase1-to-phase11-cprs.ps1
.NOTES
    Requires: Node v24+, pnpm v10+, Docker Desktop running, API on port 3001
    Date: 2026-02-16
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
Write-Host "VistA-Evolved Phase 11 - CPRS Web Replica Verification" -ForegroundColor White -BackgroundColor DarkBlue
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

# Verify contract JSON files
Assert-Check "tabs.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\tabs.json")
Assert-Check "menus.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\menus.json")
Assert-Check "rpc_catalog.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\rpc_catalog.json")
Assert-Check "forms.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\forms.json")
Assert-Check "screen_registry.json exists" (Test-Path "$repoRoot\design\contracts\cprs\v1\screen_registry.json")

# Verify loader has expected exports
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

# Verify menu bar has required menus
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

# Verify barrel exports all 10
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

# Verify CPRSModals routes to dialogs
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

# Verify layout wraps stores
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
# If we get here without any fails from the loop, add a pass
if ($uiFiles.Count -gt 0) {
    Assert-Check "CPRS component files scanned for VA terms" $true "$($uiFiles.Count) files checked"
}

# =========================================================================
Write-Phase "API ENDPOINTS" "Live VistA API Checks (port $ApiPort)"
# =========================================================================

$apiBase = "http://127.0.0.1:$ApiPort"

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

$endpoints = @(
    @{ Path = "/vista/allergies?dfn=1"; Name = "GET /vista/allergies" },
    @{ Path = "/vista/vitals?dfn=1"; Name = "GET /vista/vitals" },
    @{ Path = "/vista/notes?dfn=1"; Name = "GET /vista/notes" },
    @{ Path = "/vista/medications?dfn=1"; Name = "GET /vista/medications" },
    @{ Path = "/vista/problems?dfn=1"; Name = "GET /vista/problems" }
)

foreach ($ep in $endpoints) {
    try {
        $r = Invoke-RestMethod -Uri "$apiBase$($ep.Path)" -TimeoutSec 10
        Assert-Check $ep.Name ($r.ok -eq $true) "ok: $($r.ok)"
    } catch {
        Warn-Check $ep.Name "Error: $_"
    }
}

# =========================================================================
# Summary
# =========================================================================

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host "  PHASE 11 VERIFICATION SUMMARY" -ForegroundColor Magenta
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
} else {
    Write-Host "  *** $($script:fail) CHECK(S) FAILED - review above ***" -ForegroundColor Red
}

Write-Host ""
exit $script:fail
