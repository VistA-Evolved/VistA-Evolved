<# Phase 81 -- Imaging Viewer v1 Verifier
   Gates: source files, route handlers, VistA RPCs, pending targets,
          UI report viewer, E2E test, plan artifact, no-PHI-in-logs,
          module registration, adapter integration
#>
param([switch]$SkipDocker)

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 0

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  $script:total++
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id  $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id  $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id  $desc ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 81 -- Imaging Viewer v1 ===" -ForegroundColor Cyan

# ---- Source Files ----
Write-Host "`n--- Source Files ---" -ForegroundColor Yellow

Gate "P81-001" "imaging-viewer.ts route file exists" {
  Test-Path -LiteralPath "apps/api/src/routes/imaging-viewer.ts"
}

Gate "P81-002" "buildImagingPlan.ts script exists" {
  Test-Path -LiteralPath "scripts/imaging/buildImagingPlan.ts"
}

Gate "P81-003" "E2E test file exists" {
  Test-Path -LiteralPath "apps/api/e2e/imaging-viewer.spec.ts"
}

Gate "P81-004" "ImagingPanel.tsx exists" {
  Test-Path -LiteralPath "apps/web/src/components/cprs/panels/ImagingPanel.tsx"
}

Gate "P81-005" "prompt IMPLEMENT file exists" {
  Test-Path -LiteralPath "prompts/86-PHASE-81-IMAGING-VIEWER-V1/86-01-IMPLEMENT.md"
}

Gate "P81-006" "prompt VERIFY file exists" {
  Test-Path -LiteralPath "prompts/86-PHASE-81-IMAGING-VIEWER-V1/86-99-VERIFY.md"
}

# ---- Route Handlers ----
Write-Host "`n--- Route Handlers ---" -ForegroundColor Yellow

$routeFile = Get-Content "apps/api/src/routes/imaging-viewer.ts" -Raw

Gate "P81-007" "route has GET /imaging/studies/:dfn" {
  $routeFile -match '/imaging/studies/:dfn'
}

Gate "P81-008" "route has GET /imaging/report/:studyId" {
  $routeFile -match '/imaging/report/:studyId'
}

Gate "P81-009" "route has GET /imaging/viewer-link/:studyId" {
  $routeFile -match '/imaging/viewer-link/:studyId'
}

Gate "P81-010" "route exported as default async function" {
  $routeFile -match 'export default async function imagingViewerRoutes'
}

# ---- VistA RPCs (VistA-first) ----
Write-Host "`n--- VistA RPC References ---" -ForegroundColor Yellow

Gate "P81-011" "route references MAG4 REMOTE PROCEDURE" {
  $routeFile -match 'MAG4 REMOTE PROCEDURE'
}

Gate "P81-012" "route references RA DETAILED REPORT" {
  $routeFile -match 'RA DETAILED REPORT'
}

Gate "P81-013" "route references TIU GET RECORD TEXT (fallback)" {
  $routeFile -match 'TIU GET RECORD TEXT'
}

Gate "P81-014" "route uses optionalRpc for graceful degradation" {
  $routeFile -match 'optionalRpc\('
}

Gate "P81-015" "route checks RPC availability before calling" {
  ($routeFile -match 'mag4Check\.available') -and ($routeFile -match 'raCheck\.available')
}

# ---- Pending Targets ----
Write-Host "`n--- Pending Targets ---" -ForegroundColor Yellow

Gate "P81-016" "studies endpoint returns pendingTargets" {
  $routeFile -match 'pendingTargets'
}

Gate "P81-017" "report endpoint returns pendingTarget with vistaFile" {
  $routeFile -match 'vistaFile.*RAD/NUC MED REPORTS'
}

Gate "P81-018" "report pendingTarget has migrationPath" {
  $routeFile -match 'migrationPath'
}

Gate "P81-019" "viewer-link returns instructions when not configured" {
  $routeFile -match 'instructions'
}

# ---- DICOM Server Posture ----
Write-Host "`n--- DICOM Server Posture ---" -ForegroundColor Yellow

Gate "P81-020" "route falls back to Orthanc QIDO-RS" {
  $routeFile -match 'IMAGING_CONFIG\.orthancUrl'
}

Gate "P81-021" "viewer-link probes OHIF availability" {
  $routeFile -match 'isViewerReachable'
}

Gate "P81-022" "viewer-link probes Orthanc availability" {
  $routeFile -match 'isOrthancReachable'
}

Gate "P81-023" "viewer-link uses tenant-scoped config" {
  $routeFile -match 'resolveImagingConfig'
}

Gate "P81-024" "route uses IMAGING_CONFIG for DICOMweb root" {
  $routeFile -match 'IMAGING_CONFIG\.dicomWebRoot'
}

# ---- Report Status Detection ----
Write-Host "`n--- Report Processing ---" -ForegroundColor Yellow

Gate "P81-025" "report detects preliminary status" {
  $routeFile -match 'preliminary'
}

Gate "P81-026" "report detects final/verified status" {
  $routeFile -match 'FINAL.*VERIFIED|VERIFIED.*FINAL'
}

Gate "P81-027" "report detects addendum status" {
  $routeFile -match 'addendum'
}

# ---- Audit ----
Write-Host "`n--- Audit ---" -ForegroundColor Yellow

Gate "P81-028" "studies endpoint audits access" {
  $routeFile -match 'audit\("phi\.imaging-view"'
}

Gate "P81-029" "report endpoint audits access" {
  ($routeFile -match 'phi\.imaging-view') -and ($routeFile -match 'type.*report')
}

Gate "P81-030" "viewer-link endpoint audits launch" {
  $routeFile -match 'audit\("imaging\.viewer-launch"'
}

# ---- Order Linkage ----
Write-Host "`n--- Order Linkage (Phase 23 integration) ---" -ForegroundColor Yellow

Gate "P81-031" "studies enriched with order linkage" {
  $routeFile -match 'getLinkagesForPatient'
}

Gate "P81-032" "studies include orderSummary" {
  $routeFile -match 'orderSummary'
}

# ---- UI Enhancements ----
Write-Host "`n--- UI (ImagingPanel) ---" -ForegroundColor Yellow

$uiFile = Get-Content "apps/web/src/components/cprs/panels/ImagingPanel.tsx" -Raw

Gate "P81-033" "UI has View Report button" {
  $uiFile -match 'View Report'
}

Gate "P81-034" "UI has Viewer Link button" {
  $uiFile -match 'Viewer Link'
}

Gate "P81-035" "UI has fetchReport callback" {
  $uiFile -match 'fetchReport'
}

Gate "P81-036" "UI has fetchViewerLink callback" {
  $uiFile -match 'fetchViewerLink'
}

Gate "P81-037" "UI calls /imaging/report/ endpoint" {
  $uiFile -match '/imaging/report/'
}

Gate "P81-038" "UI calls /imaging/viewer-link/ endpoint" {
  $uiFile -match '/imaging/viewer-link/'
}

Gate "P81-039" "UI shows report text inline" {
  $uiFile -match 'reportText'
}

Gate "P81-040" "UI shows report status badge" {
  $uiFile -match 'reportStatus'
}

Gate "P81-041" "UI shows pending target info" {
  $uiFile -match 'reportPending'
}

Gate "P81-042" "UI shows viewer instructions" {
  $uiFile -match 'viewerLink.*instructions|Setup Instructions'
}

Gate "P81-043" "UI uses credentials include" {
  $uiFile -match "credentials.*include"
}

# ---- E2E Tests ----
Write-Host "`n--- E2E Tests ---" -ForegroundColor Yellow

$e2eFile = Get-Content "apps/api/e2e/imaging-viewer.spec.ts" -Raw

Gate "P81-044" "E2E tests studies list" {
  $e2eFile -match '/imaging/studies/'
}

Gate "P81-045" "E2E tests report viewer" {
  $e2eFile -match '/imaging/report/'
}

Gate "P81-046" "E2E tests viewer link" {
  $e2eFile -match '/imaging/viewer-link/'
}

Gate "P81-047" "E2E tests invalid study ID" {
  $e2eFile -match 'NONEXISTENT|invalid|non-existent'
}

Gate "P81-048" "E2E checks pendingTarget structure" {
  $e2eFile -match 'pendingTarget'
}

Gate "P81-049" "E2E checks instructions field" {
  $e2eFile -match 'instructions'
}

# ---- Plan Artifact Builder ----
Write-Host "`n--- Plan Artifact ---" -ForegroundColor Yellow

$planFile = Get-Content "scripts/imaging/buildImagingPlan.ts" -Raw

Gate "P81-050" "plan builder outputs to artifacts/phase81" {
  $planFile -match 'artifacts.*phase81'
}

Gate "P81-051" "plan includes VistA RPCs" {
  $planFile -match 'MAG4 REMOTE PROCEDURE'
}

Gate "P81-052" "plan includes pending targets" {
  $planFile -match 'pendingTargets'
}

Gate "P81-053" "plan includes viewer posture" {
  $planFile -match 'viewerPosture'
}

Gate "P81-054" "plan includes rpcUsed in endpoints" {
  $planFile -match 'rpcUsed'
}

Gate "P81-055" "plan includes Orthanc DICOMweb" {
  $planFile -match 'QIDO-RS|orthancDicomWeb'
}

# ---- No PHI in Logs ----
Write-Host "`n--- PHI Safety ---" -ForegroundColor Yellow

Gate "P81-056" "routes do not log raw patient data" {
  -not ($routeFile -match 'console\.log.*text|console\.log.*report')
}

Gate "P81-057" "no console.log in route file" {
  -not ($routeFile -match 'console\.log')
}

# ---- Server Registration ----
Write-Host "`n--- Server Registration ---" -ForegroundColor Yellow

$indexFile = Get-Content "apps/api/src/index.ts" -Raw

Gate "P81-058" "index.ts imports imaging-viewer routes" {
  $indexFile -match 'imaging-viewer'
}

Gate "P81-059" "index.ts registers imagingViewerRoutes" {
  $indexFile -match 'imagingViewerRoutes'
}

# ---- Existing Imaging Infrastructure (no regression) ----
Write-Host "`n--- No Regression ---" -ForegroundColor Yellow

Gate "P81-060" "imaging-service.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/services/imaging-service.ts"
}

Gate "P81-061" "imaging-proxy.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/routes/imaging-proxy.ts"
}

Gate "P81-062" "imaging-worklist.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/services/imaging-worklist.ts"
}

Gate "P81-063" "imaging adapter interface still exists" {
  Test-Path -LiteralPath "apps/api/src/adapters/imaging/interface.ts"
}

Gate "P81-064" "imaging-tenant.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/config/imaging-tenant.ts"
}

Gate "P81-065" "UI still has all 5 tabs" {
  ($uiFile -match 'studies') -and ($uiFile -match 'worklist') -and ($uiFile -match 'orders') -and ($uiFile -match 'devices') -and ($uiFile -match 'audit')
}

# ---- TypeScript Types ----
Write-Host "`n--- Types ---" -ForegroundColor Yellow

Gate "P81-066" "route exports ImagingStudyResult type" {
  $routeFile -match 'export interface ImagingStudyResult'
}

Gate "P81-067" "route exports ReportResult type" {
  $routeFile -match 'export interface ReportResult'
}

Gate "P81-068" "route exports ViewerLinkResult type" {
  $routeFile -match 'export interface ViewerLinkResult'
}

# ---- Summary ----
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  Phase 81 Results: $pass PASS / $fail FAIL / $total total" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "======================================`n" -ForegroundColor Cyan
exit $fail
