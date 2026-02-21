<# Phase 80 -- Patient Record Portability v1 Verifier
   Gates: source structure, store functions, route registration,
          encryption, portal UI, nav item, E2E test file, audit actions,
          prompt files, no-PHI-in-logs, VistA-first RPC usage
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

Write-Host "`n=== Phase 80 -- Patient Record Portability v1 ===" -ForegroundColor Cyan

# ---- Source Files Exist ----
Write-Host "`n--- Source Files ---" -ForegroundColor Yellow

Gate "P80-001" "record-portability-store.ts exists" {
  Test-Path -LiteralPath "apps/api/src/services/record-portability-store.ts"
}

Gate "P80-002" "record-portability.ts routes file exists" {
  Test-Path -LiteralPath "apps/api/src/routes/record-portability.ts"
}

Gate "P80-003" "portal records page.tsx exists" {
  Test-Path -LiteralPath "apps/portal/src/app/dashboard/records/page.tsx"
}

Gate "P80-004" "E2E test file exists" {
  Test-Path -LiteralPath "apps/portal/e2e/record-portability.spec.ts"
}

Gate "P80-005" "prompt IMPLEMENT file exists" {
  Test-Path -LiteralPath "prompts/85-PHASE-80-PATIENT-RECORD-PORTABILITY/85-01-IMPLEMENT.md"
}

Gate "P80-006" "prompt VERIFY file exists" {
  Test-Path -LiteralPath "prompts/85-PHASE-80-PATIENT-RECORD-PORTABILITY/85-99-VERIFY.md"
}

# ---- Store Module ----
Write-Host "`n--- Store Module ---" -ForegroundColor Yellow

$storeFile = Get-Content "apps/api/src/services/record-portability-store.ts" -Raw

Gate "P80-007" "store exports createExport function" {
  $storeFile -match 'export function createExport'
}

Gate "P80-008" "store exports downloadExport function" {
  $storeFile -match 'export function downloadExport'
}

Gate "P80-009" "store exports createRecordShare function" {
  $storeFile -match 'export function createRecordShare'
}

Gate "P80-010" "store exports verifyShareAccess function" {
  $storeFile -match 'export function verifyShareAccess'
}

Gate "P80-011" "store exports getSharePreview function" {
  $storeFile -match 'export function getSharePreview'
}

Gate "P80-012" "store exports getShareAudit function" {
  $storeFile -match 'export function getShareAudit'
}

Gate "P80-013" "store exports getPortabilityStats function" {
  $storeFile -match 'export function getPortabilityStats'
}

Gate "P80-014" "store exports startCleanupJob function" {
  $storeFile -match 'export function startCleanupJob'
}

Gate "P80-015" "store exports revokeRecordShare function" {
  $storeFile -match 'export function revokeRecordShare'
}

# ---- Encryption ----
Write-Host "`n--- Encryption ---" -ForegroundColor Yellow

Gate "P80-016" "store uses AES-256-GCM encryption" {
  $storeFile -match 'aes-256-gcm'
}

Gate "P80-017" "store exports encryptContent function" {
  $storeFile -match 'export function encryptContent'
}

Gate "P80-018" "store exports decryptContent function" {
  $storeFile -match 'export function decryptContent'
}

Gate "P80-019" "encryption uses randomBytes for key" {
  $storeFile -match 'randomBytes\(32\)'
}

Gate "P80-020" "encryption uses randomBytes for IV (96-bit)" {
  $storeFile -match 'randomBytes\(12\)'
}

Gate "P80-021" "key zeroed on revoke (forward secrecy)" {
  $storeFile -match 'key\.fill\(0\)'
}

# ---- TTL + Cleanup ----
Write-Host "`n--- TTL + Cleanup ---" -ForegroundColor Yellow

Gate "P80-022" "cleanup interval set (5 min default)" {
  $storeFile -match 'CLEANUP_INTERVAL_MS'
}

Gate "P80-023" "max exports per patient" {
  $storeFile -match 'MAX_EXPORTS_PER_PATIENT'
}

Gate "P80-024" "max shares per patient" {
  $storeFile -match 'MAX_SHARES_PER_PATIENT'
}

Gate "P80-025" "max access attempts (lockout)" {
  $storeFile -match 'MAX_ACCESS_ATTEMPTS'
}

# ---- Routes ----
Write-Host "`n--- Route Handlers ---" -ForegroundColor Yellow

$routeFile = Get-Content "apps/api/src/routes/record-portability.ts" -Raw

Gate "P80-026" "route has POST /portal/record/export" {
  $routeFile -match '/portal/record/export'
}

Gate "P80-027" "route has GET /portal/record/export/:token" {
  $routeFile -match '/portal/record/export/:token'
}

Gate "P80-028" "route has POST /portal/record/share" {
  $routeFile -match '/portal/record/share'
}

Gate "P80-029" "route has POST /portal/record/share/:id/revoke" {
  $routeFile -match '/portal/record/share/:id/revoke'
}

Gate "P80-030" "route has GET /portal/record/share/preview/:token" {
  $routeFile -match '/portal/record/share/preview/:token'
}

Gate "P80-031" "route has POST /portal/record/share/verify/:token" {
  $routeFile -match '/portal/record/share/verify/:token'
}

Gate "P80-032" "route has GET /portal/record/share/audit" {
  $routeFile -match '/portal/record/share/audit'
}

Gate "P80-033" "route has GET /portal/record/stats" {
  $routeFile -match '/portal/record/stats'
}

# ---- VistA-first ----
Write-Host "`n--- VistA-first RPC Usage ---" -ForegroundColor Yellow

Gate "P80-034" "route uses ORWRP REPORT TEXT (health summary)" {
  $routeFile -match 'ORWRP REPORT TEXT'
}

Gate "P80-035" "route uses ORQQAL LIST (allergies)" {
  $routeFile -match 'ORQQAL LIST'
}

Gate "P80-036" "route uses ORWPS ACTIVE (medications)" {
  $routeFile -match 'ORWPS ACTIVE'
}

Gate "P80-037" "route uses ORWCH PROBLEM LIST (problems)" {
  $routeFile -match 'ORWCH PROBLEM LIST'
}

Gate "P80-038" "route uses ORQQVI VITALS (vitals)" {
  $routeFile -match 'ORQQVI VITALS'
}

Gate "P80-039" "route uses ORWPT SELECT (demographics)" {
  $routeFile -match 'ORWPT SELECT'
}

Gate "P80-040" "route documents pending ORQQPX IMMUN LIST" {
  $routeFile -match 'ORQQPX IMMUN LIST'
}

Gate "P80-041" "route uses initRecordPortability session injection" {
  $routeFile -match 'export function initRecordPortability'
}

# ---- Audit ----
Write-Host "`n--- Audit Actions ---" -ForegroundColor Yellow

$auditFile = Get-Content "apps/api/src/services/portal-audit.ts" -Raw

Gate "P80-042" "audit has portal.record.export action" {
  $auditFile -match 'portal\.record\.export'
}

Gate "P80-043" "audit has portal.record.download action" {
  $auditFile -match 'portal\.record\.download'
}

Gate "P80-044" "audit has portal.record.share.create action" {
  $auditFile -match 'portal\.record\.share\.create'
}

Gate "P80-045" "audit has portal.record.share.revoke action" {
  $auditFile -match 'portal\.record\.share\.revoke'
}

Gate "P80-046" "audit has portal.record.share.access action" {
  $auditFile -match 'portal\.record\.share\.access'
}

# ---- Portal UI ----
Write-Host "`n--- Portal UI ---" -ForegroundColor Yellow

$uiFile = Get-Content "apps/portal/src/app/dashboard/records/page.tsx" -Raw

Gate "P80-047" "UI uses 'use client' directive" {
  $uiFile -match 'use client'
}

Gate "P80-048" "UI calls POST /portal/record/export" {
  $uiFile -match '/portal/record/export'
}

Gate "P80-049" "UI calls POST /portal/record/share" {
  $uiFile -match '/portal/record/share'
}

Gate "P80-050" "UI shows access audit (share/audit)" {
  $uiFile -match '/portal/record/share/audit'
}

Gate "P80-051" "UI has download tab" {
  $uiFile -match 'Generate.*Download|download'
}

Gate "P80-052" "UI has share tab" {
  $uiFile -match 'Share'
}

Gate "P80-053" "UI has audit tab" {
  $uiFile -match 'Access Audit'
}

Gate "P80-054" "UI uses credentials include" {
  $uiFile -match "credentials.*include"
}

# ---- Nav Item ----
Write-Host "`n--- Portal Nav ---" -ForegroundColor Yellow

$navFile = Get-Content "apps/portal/src/components/portal-nav.tsx" -Raw

Gate "P80-055" "PortalNav has My Records link" {
  $navFile -match '/dashboard/records'
}

# ---- E2E Test ----
Write-Host "`n--- E2E Test ---" -ForegroundColor Yellow

$e2eFile = Get-Content "apps/portal/e2e/record-portability.spec.ts" -Raw

Gate "P80-056" "E2E tests export creation" {
  $e2eFile -match '/portal/record/export'
}

Gate "P80-057" "E2E tests share lifecycle" {
  $e2eFile -match 'share lifecycle'
}

Gate "P80-058" "E2E tests wrong access code" {
  $e2eFile -match 'wrong.*access.*code|WRONG'
}

Gate "P80-059" "E2E tests unauthenticated denied" {
  $e2eFile -match 'unauthenticated|without session returns 401'
}

Gate "P80-060" "E2E tests revoke then verify fails" {
  $e2eFile -match 'revoke.*denied|revoke.*verify fails'
}

# ---- No PHI in Logs ----
Write-Host "`n--- PHI Safety ---" -ForegroundColor Yellow

Gate "P80-061" "store does not log raw patient content" {
  -not ($storeFile -match 'console\.log.*content|console\.log.*Buffer')
}

Gate "P80-062" "routes do not log raw patient content" {
  -not ($routeFile -match 'console\.log.*content|console\.log.*pdfBuffer')
}

# ---- Index Registration ----
Write-Host "`n--- Server Registration ---" -ForegroundColor Yellow

$indexFile = Get-Content "apps/api/src/index.ts" -Raw

Gate "P80-063" "index.ts imports record-portability routes" {
  $indexFile -match 'record-portability'
}

Gate "P80-064" "index.ts calls initRecordPortability" {
  $indexFile -match 'initRecordPortability'
}

Gate "P80-065" "index.ts starts portability cleanup job" {
  $indexFile -match 'startPortabilityCleanup|startCleanupJob'
}

# ---- Plan Artifact ----
Write-Host "`n--- Plan Artifact ---" -ForegroundColor Yellow

Gate "P80-066" "portability plan builder script exists" {
  Test-Path -LiteralPath "scripts/portability/buildPortabilityPlan.ts"
}

# ---- Summary ----
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  Phase 80 Results: $pass PASS / $fail FAIL / $total total" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "======================================`n" -ForegroundColor Cyan
exit $fail
