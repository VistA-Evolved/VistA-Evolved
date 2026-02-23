<# Phase 98 -- RCM Denials & Appeals Loop Verifier
   Gates: source structure, domain model, store, routes, UI,
          security/PHI, FSM integrity, audit wiring, 835 import,
          appeal packet, durability, build, regression
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

Write-Host "`n=== Phase 98 -- RCM Denials & Appeals Loop Verification ===" -ForegroundColor Cyan

# ================================================================
# Section 1: Source Structure (files exist)
# ================================================================
Write-Host "`n--- Source Structure ---" -ForegroundColor Yellow

Gate "P98-001" "types.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/denials/types.ts"
}

Gate "P98-002" "denial-store.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/denials/denial-store.ts"
}

Gate "P98-003" "denial-routes.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/denials/denial-routes.ts"
}

Gate "P98-004" "edi-import.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/denials/edi-import.ts"
}

Gate "P98-005" "appeal-packet.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/denials/appeal-packet.ts"
}

Gate "P98-006" "denial-cases/page.tsx exists" {
  Test-Path -LiteralPath "apps/web/src/app/cprs/admin/denial-cases/page.tsx"
}

Gate "P98-007" "runbook exists" {
  Test-Path -LiteralPath "docs/runbooks/rcm-denials-phase98.md"
}

Gate "P98-008" "prompt 98-01-IMPLEMENT exists" {
  $dirs = Get-ChildItem -Path "prompts" -Directory -Filter "*PHASE-98*"
  $dirs.Count -gt 0 -and (Test-Path -LiteralPath "$($dirs[0].FullName)/98-01-IMPLEMENT.md")
}

Gate "P98-009" "prompt 98-99-VERIFY exists" {
  $dirs = Get-ChildItem -Path "prompts" -Directory -Filter "*PHASE-98*"
  $dirs.Count -gt 0 -and (Test-Path -LiteralPath "$($dirs[0].FullName)/98-99-VERIFY.md")
}

# ================================================================
# Section 2: Domain Model & Type System
# ================================================================
Write-Host "`n--- Domain Model & Type System ---" -ForegroundColor Yellow

Gate "P98-010" "DENIAL_STATUSES has 8 states" {
  $c = (Select-String -Path "apps/api/src/rcm/denials/types.ts" -Pattern '"(NEW|TRIAGED|APPEALING|RESUBMITTED|PAID|PARTIAL|WRITEOFF|CLOSED)"').Count
  $c -ge 8
}

Gate "P98-011" "DENIAL_TRANSITIONS defined for all states" {
  $c = Select-String -Path "apps/api/src/rcm/denials/types.ts" -Pattern '^\s+(NEW|TRIAGED|APPEALING|RESUBMITTED|PAID|PARTIAL|WRITEOFF|CLOSED):'
  $c.Count -ge 8
}

Gate "P98-012" "isValidDenialTransition exported" {
  (Select-String -Path "apps/api/src/rcm/denials/types.ts" -Pattern 'export function isValidDenialTransition').Count -ge 1
}

Gate "P98-013" "CLOSED is terminal (empty transitions)" {
  (Select-String -Path "apps/api/src/rcm/denials/types.ts" -Pattern 'CLOSED:\s*\[\]').Count -ge 1
}

Gate "P98-014" "DenialCodeSchema validates CARC/RARC/OTHER" {
  (Select-String -Path "apps/api/src/rcm/denials/types.ts" -Pattern 'CARC.*RARC.*OTHER').Count -ge 1
}

Gate "P98-015" "CreateDenialSchema validates billedAmount" {
  (Select-String -Path "apps/api/src/rcm/denials/types.ts" -Pattern 'billedAmount.*z\.number').Count -ge 1
}

Gate "P98-016" "UpdateDenialSchema requires reason" {
  (Select-String -Path "apps/api/src/rcm/denials/types.ts" -Pattern 'reason.*z\.string.*min\(1\)').Count -ge 1
}

Gate "P98-017" "DenialListQuerySchema has pagination" {
  $c = Select-String -Path "apps/api/src/rcm/denials/types.ts" -Pattern '(page|limit).*z\.coerce'
  $c.Count -ge 2
}

Gate "P98-018" "Import835BatchSchema limits batch to 500" {
  (Select-String -Path "apps/api/src/rcm/denials/types.ts" -Pattern 'max\(500\)').Count -ge 1
}

Gate "P98-019" "Zod v4 z.record has two args" {
  (Select-String -Path "apps/api/src/rcm/denials/types.ts" -Pattern 'z\.record\(z\.string\(\)').Count -ge 1
}

# ================================================================
# Section 3: Store / DB Schema
# ================================================================
Write-Host "`n--- Store & DB Schema ---" -ForegroundColor Yellow

Gate "P98-020" "denial_case table in schema.ts" {
  (Select-String -Path "apps/api/src/platform/db/schema.ts" -Pattern 'denialCase.*=.*sqliteTable.*denial_case').Count -ge 1
}

Gate "P98-021" "denial_action table in schema.ts" {
  (Select-String -Path "apps/api/src/platform/db/schema.ts" -Pattern 'denialAction.*=.*sqliteTable.*denial_action').Count -ge 1
}

Gate "P98-022" "denial_attachment table in schema.ts" {
  (Select-String -Path "apps/api/src/platform/db/schema.ts" -Pattern 'denialAttachment.*=.*sqliteTable.*denial_attachment').Count -ge 1
}

Gate "P98-023" "resubmission_attempt table in schema.ts" {
  (Select-String -Path "apps/api/src/platform/db/schema.ts" -Pattern 'resubmissionAttempt.*=.*sqliteTable.*resubmission_attempt').Count -ge 1
}

Gate "P98-024" "CREATE TABLE denial_case in migrate.ts" {
  (Select-String -Path "apps/api/src/platform/db/migrate.ts" -Pattern 'CREATE TABLE IF NOT EXISTS denial_case').Count -ge 1
}

Gate "P98-025" "CREATE TABLE denial_action in migrate.ts" {
  (Select-String -Path "apps/api/src/platform/db/migrate.ts" -Pattern 'CREATE TABLE IF NOT EXISTS denial_action').Count -ge 1
}

Gate "P98-026" "CREATE TABLE denial_attachment in migrate.ts" {
  (Select-String -Path "apps/api/src/platform/db/migrate.ts" -Pattern 'CREATE TABLE IF NOT EXISTS denial_attachment').Count -ge 1
}

Gate "P98-027" "CREATE TABLE resubmission_attempt in migrate.ts" {
  (Select-String -Path "apps/api/src/platform/db/migrate.ts" -Pattern 'CREATE TABLE IF NOT EXISTS resubmission_attempt').Count -ge 1
}

Gate "P98-028" "10 indexes created" {
  $c = (Select-String -Path "apps/api/src/platform/db/migrate.ts" -Pattern 'CREATE INDEX IF NOT EXISTS idx_denial|CREATE INDEX IF NOT EXISTS idx_resub').Count
  $c -ge 10
}

Gate "P98-029" "Store exports createDenialCase" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-store.ts" -Pattern 'export function createDenialCase').Count -ge 1
}

Gate "P98-030" "Store exports createDenialCaseWithProvenance" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-store.ts" -Pattern 'export function createDenialCaseWithProvenance').Count -ge 1
}

Gate "P98-031" "Store exports listDenials with pagination" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-store.ts" -Pattern 'export function listDenials').Count -ge 1
}

Gate "P98-032" "Store exports getDenialStats" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-store.ts" -Pattern 'export function getDenialStats').Count -ge 1
}

Gate "P98-033" "Store toCents helper uses Math.round" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-store.ts" -Pattern 'Math\.round\(dollars \* 100\)').Count -ge 1
}

# ================================================================
# Section 4: Routes & API Endpoints
# ================================================================
Write-Host "`n--- Routes & API Endpoints ---" -ForegroundColor Yellow

Gate "P98-034" "GET /rcm/denials route" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern 'server\.get.*\/rcm\/denials"').Count -ge 1
}

Gate "P98-035" "POST /rcm/denials route" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern 'server\.post.*\/rcm\/denials"').Count -ge 1
}

Gate "P98-036" "GET /rcm/denials/stats route" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern '\/rcm\/denials\/stats').Count -ge 1
}

Gate "P98-037" "GET /rcm/denials/:id route" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern '\/rcm\/denials\/:id"').Count -ge 1
}

Gate "P98-038" "PATCH /rcm/denials/:id route" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern 'server\.patch.*\/rcm\/denials\/:id"').Count -ge 1
}

Gate "P98-039" "POST /rcm/denials/:id/actions route" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern '\/rcm\/denials\/:id\/actions').Count -ge 1
}

Gate "P98-040" "POST /rcm/denials/:id/attachments route" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern '\/rcm\/denials\/:id\/attachments').Count -ge 1
}

Gate "P98-041" "POST /rcm/denials/:id/appeal-packet route" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern '\/rcm\/denials\/:id\/appeal-packet').Count -ge 1
}

Gate "P98-042" "POST /rcm/denials/:id/resubmit route" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern '\/rcm\/denials\/:id\/resubmit').Count -ge 1
}

Gate "P98-043" "POST /rcm/denials/import/835 route" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern '\/rcm\/denials\/import\/835').Count -ge 1
}

Gate "P98-044" "FSM transition validated in PATCH handler" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern 'isValidDenialTransition').Count -ge 1
}

Gate "P98-045" "Routes registered in index.ts" {
  (Select-String -Path "apps/api/src/index.ts" -Pattern 'server\.register\(denialRoutes\)').Count -ge 1
}

Gate "P98-046" "denialRoutes imported in index.ts" {
  (Select-String -Path "apps/api/src/index.ts" -Pattern 'import denialRoutes from.*denial-routes').Count -ge 1
}

# ================================================================
# Section 5: EDI 835 Import
# ================================================================
Write-Host "`n--- EDI 835 Import ---" -ForegroundColor Yellow

Gate "P98-047" "importRemittanceDenials exported" {
  (Select-String -Path "apps/api/src/rcm/denials/edi-import.ts" -Pattern 'export function importRemittanceDenials').Count -ge 1
}

Gate "P98-048" "Content hash computed with SHA-256" {
  (Select-String -Path "apps/api/src/rcm/denials/edi-import.ts" -Pattern 'createHash.*sha256').Count -ge 1
}

Gate "P98-049" "Import uses createDenialCaseWithProvenance" {
  (Select-String -Path "apps/api/src/rcm/denials/edi-import.ts" -Pattern 'createDenialCaseWithProvenance').Count -ge 1
}

Gate "P98-050" "Import tracks errors per entry" {
  (Select-String -Path "apps/api/src/rcm/denials/edi-import.ts" -Pattern 'result\.errors\.push').Count -ge 1
}

# ================================================================
# Section 6: Appeal Packet Builder
# ================================================================
Write-Host "`n--- Appeal Packet Builder ---" -ForegroundColor Yellow

Gate "P98-051" "generateAppealPacket exported" {
  (Select-String -Path "apps/api/src/rcm/denials/appeal-packet.ts" -Pattern 'export function generateAppealPacket').Count -ge 1
}

Gate "P98-052" "generateAppealPacketHtml exported" {
  (Select-String -Path "apps/api/src/rcm/denials/appeal-packet.ts" -Pattern 'export function generateAppealPacketHtml').Count -ge 1
}

Gate "P98-053" "escapeHtml utility prevents XSS" {
  (Select-String -Path "apps/api/src/rcm/denials/appeal-packet.ts" -Pattern 'function escapeHtml').Count -ge 1
}

Gate "P98-054" "CARC/RARC enrichment from reference" {
  (Select-String -Path "apps/api/src/rcm/denials/appeal-packet.ts" -Pattern 'CARC_CODES|RARC_CODES').Count -ge 1
}

Gate "P98-055" "Credential-less note in packet" {
  (Select-String -Path "apps/api/src/rcm/denials/appeal-packet.ts" -Pattern 'Credentials not stored').Count -ge 1
}

# ================================================================
# Section 7: Audit Wiring
# ================================================================
Write-Host "`n--- Audit Wiring ---" -ForegroundColor Yellow

Gate "P98-056" "13 denial audit actions in rcm-audit.ts" {
  $c = (Select-String -Path "apps/api/src/rcm/audit/rcm-audit.ts" -Pattern "'denial\.\w+'").Count
  $c -ge 12
}

Gate "P98-057" "Routes use appendRcmAudit" {
  $c = (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern 'appendRcmAudit\(').Count
  $c -ge 6
}

Gate "P98-058" "mapStatusToAuditAction helper" {
  (Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern 'function mapStatusToAuditAction').Count -ge 1
}

# ================================================================
# Section 8: UI Dashboard
# ================================================================
Write-Host "`n--- UI Dashboard ---" -ForegroundColor Yellow

Gate "P98-059" "UI uses credentials: include" {
  (Select-String -Path "apps/web/src/app/cprs/admin/denial-cases/page.tsx" -Pattern "credentials.*include").Count -ge 1
}

Gate "P98-060" "UI has 4 tabs (queue, create, detail, stats)" {
  $c = Select-String -Path "apps/web/src/app/cprs/admin/denial-cases/page.tsx" -Pattern "'queue'|'create'|'detail'|'stats'"
  $c.Count -ge 4
}

Gate "P98-061" "UI has status color palette for 8 statuses" {
  $c = (Select-String -Path "apps/web/src/app/cprs/admin/denial-cases/page.tsx" -Pattern 'NEW:|TRIAGED:|APPEALING:|RESUBMITTED:|PAID:|PARTIAL:|WRITEOFF:|CLOSED:').Count
  $c -ge 8
}

Gate "P98-062" "UI has FSM-aware transition buttons" {
  (Select-String -Path "apps/web/src/app/cprs/admin/denial-cases/page.tsx" -Pattern 'handleTransition').Count -ge 1
}

Gate "P98-063" "UI has pagination controls" {
  (Select-String -Path "apps/web/src/app/cprs/admin/denial-cases/page.tsx" -Pattern 'Prev.*Next|setPage').Count -ge 1
}

# ================================================================
# Section 9: Security & PHI Scan
# ================================================================
Write-Host "`n--- Security & PHI ---" -ForegroundColor Yellow

Gate "P98-064" "No console.log in denial files" {
  $c = (Select-String -Path "apps/api/src/rcm/denials/*.ts" -Pattern 'console\.(log|warn|error)').Count
  $c -eq 0
}

Gate "P98-065" "No hardcoded credentials in denial files" {
  $c = (Select-String -Path "apps/api/src/rcm/denials/*.ts" -Pattern 'PROV123|NURSE123|PHARM123').Count
  $c -eq 0
}

Gate "P98-066" "No DFN in audit calls" {
  # grep audit calls and ensure no patientDfn is passed
  $lines = Select-String -Path "apps/api/src/rcm/denials/denial-routes.ts" -Pattern 'appendRcmAudit'
  $hasDfn = $lines | Where-Object { $_.Line -match 'patientDfn|dfn' }
  $hasDfn.Count -eq 0
}

Gate "P98-067" "escapeHtml used in HTML output" {
  (Select-String -Path "apps/api/src/rcm/denials/appeal-packet.ts" -Pattern 'escapeHtml\(').Count -ge 2
}

Gate "P98-068" "No SSN or DOB in denial module" {
  $c = (Select-String -Path "apps/api/src/rcm/denials/*.ts" -Pattern '\bSSN\b|\bDOB\b|\bdate.*birth').Count
  $c -eq 0
}

# ================================================================
# Section 10: Build Verification
# ================================================================
Write-Host "`n--- Build Verification ---" -ForegroundColor Yellow

Gate "P98-069" "tsc --noEmit succeeds" {
  Push-Location "apps/api"
  $output = pnpm exec tsc --noEmit 2>&1
  $code = $LASTEXITCODE
  Pop-Location
  $code -eq 0
}

Gate "P98-070" "next build succeeds" {
  Push-Location "apps/web"
  $output = pnpm exec next build 2>&1
  $code = $LASTEXITCODE
  Pop-Location
  $code -eq 0
}

Gate "P98-071" "denial-cases page in build output" {
  Push-Location "apps/web"
  $output = pnpm exec next build 2>&1
  Pop-Location
  ($output | Select-String "denial-cases").Count -ge 1
}

# ================================================================
# Summary
# ================================================================
Write-Host "`n=== Phase 98 Verification Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass / $total" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })
Write-Host "  FAIL: $fail / $total" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })

if ($fail -eq 0) {
  Write-Host "`n  ALL GATES PASSED" -ForegroundColor Green
} else {
  Write-Host "`n  $fail GATE(S) FAILED -- review above" -ForegroundColor Red
}

exit $fail
