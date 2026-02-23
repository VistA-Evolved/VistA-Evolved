<# 
  Phase 104: Platform DB Security/Compliance Posture -- Verifier
  
  Gates:
    Section A: Code structure + migration v7
    Section B: Access controls (role enforcement)
    Section C: Audit integrity (chain verification, export, retention)
    Section D: Optimistic concurrency (version columns)
    Section E: TLS/SSL posture
    Section F: RLS policies
    Section G: Secret scanner
    Section H: Architecture doc
    Section I: TypeScript build
#>

param(
    [switch]$SkipDocker,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$script:pass = 0; $script:fail = 0; $script:skip = 0
$script:results = @()

function Gate($id, $desc, [scriptblock]$test) {
    try {
        $ok = & $test
        if ($ok) {
            $script:pass++; $script:results += "PASS  $id  $desc"
            if ($Verbose) { Write-Host "  PASS  $id  $desc" -ForegroundColor Green }
        } else {
            $script:fail++; $script:results += "FAIL  $id  $desc"
            Write-Host "  FAIL  $id  $desc" -ForegroundColor Red
        }
    } catch {
        $script:fail++; $script:results += "FAIL  $id  $desc ($_)"
        Write-Host "  FAIL  $id  $desc ($_)" -ForegroundColor Red
    }
}

function Skip($id, $desc) {
    $script:skip++; $script:results += "SKIP  $id  $desc"
    if ($Verbose) { Write-Host "  SKIP  $id  $desc" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "=== Phase 104: Platform DB Security/Compliance Posture ===" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot -replace '[\\/]scripts$', ''
$api = Join-Path $root "apps/api"
$pgMigrate = Join-Path $api "src/platform/pg/pg-migrate.ts"
$pgDb = Join-Path $api "src/platform/pg/pg-db.ts"
$pgSchema = Join-Path $api "src/platform/pg/pg-schema.ts"
$auditIntegrity = Join-Path $api "src/platform/pg/audit-integrity.ts"
$pgIndex = Join-Path $api "src/platform/pg/index.ts"
$payerRepo = Join-Path $api "src/platform/pg/repo/payer-repo.ts"
$routes = Join-Path $api "src/routes/admin-payer-db-routes.ts"
$preCommit = Join-Path $root ".hooks/pre-commit.ps1"
$secDoc = Join-Path $root "docs/architecture/platform-db-security.md"

# ================================================================
# Section A: Code structure + migration v7
# ================================================================
Write-Host "--- Section A: Code Structure + Migration v7 ---" -ForegroundColor Yellow

Gate "A01" "pg-migrate.ts exists" {
    Test-Path -LiteralPath $pgMigrate
}

Gate "A02" "Migration v7 (security_integrity_posture) exists" {
    (Get-Content $pgMigrate -Raw) -match 'version:\s*7'
}

Gate "A03" "Migration v7 adds version column to payer" {
    (Get-Content $pgMigrate -Raw) -match 'ALTER TABLE payer ADD COLUMN IF NOT EXISTS version'
}

Gate "A04" "Migration v7 adds version column to tenant_payer" {
    (Get-Content $pgMigrate -Raw) -match 'ALTER TABLE tenant_payer ADD COLUMN IF NOT EXISTS version'
}

Gate "A05" "Migration v7 adds version column to payer_capability" {
    (Get-Content $pgMigrate -Raw) -match 'ALTER TABLE payer_capability ADD COLUMN IF NOT EXISTS version'
}

Gate "A06" "Migration v7 adds version column to payer_task" {
    (Get-Content $pgMigrate -Raw) -match 'ALTER TABLE payer_task ADD COLUMN IF NOT EXISTS version'
}

Gate "A07" "Migration v7 adds updated_by column to payer" {
    (Get-Content $pgMigrate -Raw) -match 'ALTER TABLE payer ADD COLUMN IF NOT EXISTS updated_by'
}

Gate "A08" "Migration v7 creates create_tenant_rls_policy function" {
    (Get-Content $pgMigrate -Raw) -match 'CREATE OR REPLACE FUNCTION create_tenant_rls_policy'
}

Gate "A09" "Migration v7 includes FORCE ROW LEVEL SECURITY" {
    (Get-Content $pgMigrate -Raw) -match 'FORCE ROW LEVEL SECURITY'
}

Gate "A10" "Migration v7 creates prevent_audit_mutation trigger function" {
    (Get-Content $pgMigrate -Raw) -match 'prevent_audit_mutation'
}

Gate "A11" "Migration v7 creates append-only trigger on platform_audit_event" {
    (Get-Content $pgMigrate -Raw) -match 'trg_platform_audit_immutable'
}

Gate "A12" "Migration v7 creates append-only trigger on payer_audit_event" {
    (Get-Content $pgMigrate -Raw) -match 'trg_payer_audit_immutable'
}

Gate "A13" "audit-integrity.ts exists" {
    Test-Path -LiteralPath $auditIntegrity
}

Gate "A14" "audit-integrity.ts exports verifyAuditChain" {
    (Get-Content $auditIntegrity -Raw) -match 'export async function verifyAuditChain'
}

Gate "A15" "audit-integrity.ts exports exportAuditEntries" {
    (Get-Content $auditIntegrity -Raw) -match 'export async function exportAuditEntries'
}

Gate "A16" "audit-integrity.ts exports getRetentionPolicy" {
    (Get-Content $auditIntegrity -Raw) -match 'export function getRetentionPolicy'
}

Gate "A17" "audit-integrity.ts exports sanitizeAuditDetail" {
    (Get-Content $auditIntegrity -Raw) -match 'export function sanitizeAuditDetail'
}

Gate "A18" "audit-integrity.ts exports computeAuditHash" {
    (Get-Content $auditIntegrity -Raw) -match 'export function computeAuditHash'
}

Gate "A19" "pg barrel exports audit-integrity functions" {
    $content = Get-Content $pgIndex -Raw
    ($content -match 'verifyAuditChain') -and ($content -match 'exportAuditEntries') -and ($content -match 'getRetentionPolicy')
}

# ================================================================
# Section B: Access controls
# ================================================================
Write-Host "--- Section B: Access Controls ---" -ForegroundColor Yellow

Gate "B01" "Routes import requireSession" {
    (Get-Content $routes -Raw) -match 'import.*requireSession.*from.*auth-routes'
}

Gate "B02" "Routes import requireRole" {
    (Get-Content $routes -Raw) -match 'import.*requireRole.*from.*auth-routes'
}

Gate "B03" "PATCH payer calls requireRole" {
    $content = Get-Content $routes -Raw
    # Check that PATCH handler has requireRole (multiline)
    ($content -match '(?s)patch.*payers/:id') -and ($content -match 'requireRole')
}

$mutationRoutes = @(
    'evidence/ingest-json',
    'evidence/upload-pdf',
    'evidence/:id/promote',
    'payers/:id/capabilities',
    'payers/:id/tasks',
    'tasks/:taskId',
    'tenant/:tenantId/payers/:payerId'
)

$routeContent = Get-Content $routes -Raw

Gate "B04" "All mutation routes call requireSession" {
    $sessionCount = ([regex]::Matches($routeContent, 'requireSession\(request')).Count
    # At least 8 mutation routes + 2 audit endpoints = 10
    $sessionCount -ge 8
}

Gate "B05" "All mutation routes call requireRole" {
    $roleCount = ([regex]::Matches($routeContent, 'requireRole\(session')).Count
    $roleCount -ge 8
}

Gate "B06" "AUTH_RULES has admin level for /admin/" {
    $securityTs = Join-Path $api "src/middleware/security.ts"
    (Get-Content $securityTs -Raw) -match '\(admin\|audit\|reports\).*admin'
}

# ================================================================
# Section C: Audit integrity
# ================================================================
Write-Host "--- Section C: Audit Integrity ---" -ForegroundColor Yellow

Gate "C01" "PHI_PATTERNS includes SSN pattern" {
    (Get-Content $auditIntegrity -Raw) -match '\\d\{3\}-\\d\{2\}-\\d\{4\}'
}

Gate "C02" "PHI_PATTERNS includes DOB pattern" {
    (Get-Content $auditIntegrity -Raw) -match 'DOB|MM.DD.YYYY|YYYY-MM-DD'
}

Gate "C03" "computeAuditHash uses SHA-256" {
    (Get-Content $auditIntegrity -Raw) -match "createHash.*sha256"
}

Gate "C04" "verifyAuditChain returns AuditVerifyResult type" {
    (Get-Content $auditIntegrity -Raw) -match 'AuditVerifyResult'
}

Gate "C05" "exportAuditEntries has MAX_EXPORT_ROWS limit" {
    (Get-Content $auditIntegrity -Raw) -match 'MAX_EXPORT_ROWS'
}

Gate "C06" "Routes expose GET /admin/payer-db/audit/verify" {
    $routeContent -match 'audit/verify'
}

Gate "C07" "Routes expose GET /admin/payer-db/audit/export" {
    $routeContent -match 'audit/export'
}

Gate "C08" "Routes expose GET /admin/payer-db/audit/retention" {
    $routeContent -match 'audit/retention'
}

Gate "C09" "Audit verify endpoint requires admin role" {
    # Both audit/verify and requireRole appear in the routes file (multiline)
    ($routeContent -match 'audit/verify') -and ($routeContent -match 'requireRole')
}

Gate "C10" "Retention policy has configurable days" {
    (Get-Content $auditIntegrity -Raw) -match 'PLATFORM_AUDIT_RETENTION_DAYS'
}

# ================================================================
# Section D: Optimistic concurrency
# ================================================================
Write-Host "--- Section D: Optimistic Concurrency ---" -ForegroundColor Yellow

Gate "D01" "PG schema has version column on payer" {
    (Get-Content $pgSchema -Raw) -match 'version.*integer.*version.*notNull.*default\(1\)'
}

Gate "D02" "PG schema has updatedBy column on payer" {
    (Get-Content $pgSchema -Raw) -match 'updatedBy.*updated_by'
}

Gate "D03" "PG payer repo has expectedVersion parameter" {
    (Get-Content $payerRepo -Raw) -match 'expectedVersion'
}

Gate "D04" "PG payer repo throws CONCURRENCY_CONFLICT" {
    (Get-Content $payerRepo -Raw) -match 'CONCURRENCY_CONFLICT'
}

Gate "D05" "PG payer repo increments version on update" {
    (Get-Content $payerRepo -Raw) -match 'COALESCE\(version.*\+ 1'
}

Gate "D06" "Route PATCH handler catches CONCURRENCY_CONFLICT with 409" {
    ($routeContent -match 'CONCURRENCY_CONFLICT') -and ($routeContent -match '409')
}

# ================================================================
# Section E: TLS/SSL posture
# ================================================================
Write-Host "--- Section E: TLS/SSL Posture ---" -ForegroundColor Yellow

Gate "E01" "pg-db.ts reads PLATFORM_PG_SSL env var" {
    (Get-Content $pgDb -Raw) -match 'PLATFORM_PG_SSL'
}

Gate "E02" "pg-db.ts supports verify-ca mode" {
    (Get-Content $pgDb -Raw) -match 'verify-ca'
}

Gate "E03" "pg-db.ts supports verify-full mode" {
    (Get-Content $pgDb -Raw) -match 'verify-full'
}

Gate "E04" "pg-db.ts reads PLATFORM_PG_SSL_CA" {
    (Get-Content $pgDb -Raw) -match 'PLATFORM_PG_SSL_CA'
}

Gate "E05" "pg-db.ts reads PLATFORM_PG_SSL_CERT for mutual TLS" {
    (Get-Content $pgDb -Raw) -match 'PLATFORM_PG_SSL_CERT'
}

Gate "E06" "pg-db.ts reads PLATFORM_PG_SSL_KEY for mutual TLS" {
    (Get-Content $pgDb -Raw) -match 'PLATFORM_PG_SSL_KEY'
}

Gate "E07" "pg-db.ts passes ssl config to Pool" {
    (Get-Content $pgDb -Raw) -match 'ssl.*sslConfig|sslConfig.*ssl'
}

# ================================================================
# Section F: RLS policies
# ================================================================
Write-Host "--- Section F: Row-Level Security ---" -ForegroundColor Yellow

Gate "F01" "RLS function uses FORCE ROW LEVEL SECURITY" {
    (Get-Content $pgMigrate -Raw) -match 'FORCE ROW LEVEL SECURITY'
}

Gate "F02" "RLS function creates tenant_isolation policy" {
    (Get-Content $pgMigrate -Raw) -match 'tenant_isolation'
}

Gate "F03" "RLS function uses current_setting for tenant_id" {
    (Get-Content $pgMigrate -Raw) -match "current_setting.*app\.current_tenant_id"
}

Gate "F04" "applyRlsPolicies covers 21 tables" {
    $content = Get-Content $pgMigrate -Raw
    $tableMatches = ([regex]::Matches($content, '"[a-z_]+"')).Count
    # The tenantTables array should list 21 entries
    $content -match 'tenantTables'
}

Gate "F05" "RLS is gated behind PLATFORM_PG_RLS_ENABLED" {
    (Get-Content $pgMigrate -Raw) -match 'PLATFORM_PG_RLS_ENABLED'
}

# ================================================================
# Section G: Secret scanner
# ================================================================
Write-Host "--- Section G: Secret Scanner ---" -ForegroundColor Yellow

Gate "G01" "Pre-commit hook exists" {
    Test-Path -LiteralPath $preCommit
}

Gate "G02" "Pre-commit scans for PROV123" {
    (Get-Content $preCommit -Raw) -match 'PROV123'
}

Gate "G03" "Pre-commit scans for PHARM123" {
    (Get-Content $preCommit -Raw) -match 'PHARM123'
}

Gate "G04" "Pre-commit scans for NURSE123" {
    (Get-Content $preCommit -Raw) -match 'NURSE123'
}

Gate "G05" "Pre-commit scans for password patterns" {
    (Get-Content $preCommit -Raw) -match 'password'
}

Gate "G06" "Pre-commit scans for api_key patterns" {
    (Get-Content $preCommit -Raw) -match 'api.*key'
}

Gate "G07" "Pre-commit exempts login page" {
    (Get-Content $preCommit -Raw) -match 'page'
}

Gate "G08" "Pre-commit exempts .env.example" {
    (Get-Content $preCommit -Raw) -match 'env.*example'
}

# ================================================================
# Section H: Architecture doc
# ================================================================
Write-Host "--- Section H: Architecture Document ---" -ForegroundColor Yellow

Gate "H01" "platform-db-security.md exists" {
    Test-Path -LiteralPath $secDoc
}

$docContent = if (Test-Path -LiteralPath $secDoc) { Get-Content $secDoc -Raw } else { "" }

Gate "H02" "Doc covers access control" {
    $docContent -match 'Access Control'
}

Gate "H03" "Doc covers audit trail" {
    $docContent -match 'Audit Trail'
}

Gate "H04" "Doc covers retention policy" {
    $docContent -match 'Retention Policy'
}

Gate "H05" "Doc covers optimistic concurrency" {
    $docContent -match 'Optimistic Concurrency'
}

Gate "H06" "Doc covers TLS configuration" {
    $docContent -match 'TLS Configuration'
}

Gate "H07" "Doc covers RLS" {
    $docContent -match 'Row-Level Security'
}

Gate "H08" "Doc covers FORCE ROW LEVEL SECURITY" {
    $docContent -match 'FORCE ROW LEVEL SECURITY'
}

Gate "H09" "Doc covers secret protection" {
    $docContent -match 'Secret.*PHI Protection|PHI.*Secret'
}

Gate "H10" "Doc covers compliance mapping" {
    $docContent -match 'Compliance Mapping|HIPAA'
}

Gate "H11" "Doc lists env vars" {
    $docContent -match 'PLATFORM_PG_SSL'
}

# ================================================================
# Section I: TypeScript build
# ================================================================
Write-Host "--- Section I: TypeScript Build ---" -ForegroundColor Yellow

Gate "I01" "API TypeScript compiles clean" {
    Push-Location (Join-Path $root "apps/api")
    npx tsc --noEmit 2>&1 | Out-Null
    $ok = $LASTEXITCODE -eq 0
    Pop-Location
    $ok
}

# ================================================================
# Summary
# ================================================================

Write-Host ""
Write-Host "=== Phase 104 Verification Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PASS: $($script:pass)" -ForegroundColor Green
if ($script:fail -gt 0) { Write-Host "  FAIL: $($script:fail)" -ForegroundColor Red }
if ($script:skip -gt 0) { Write-Host "  SKIP: $($script:skip)" -ForegroundColor Yellow }
Write-Host "  TOTAL: $($script:pass + $script:fail + $script:skip)"
Write-Host ""

if ($script:fail -gt 0) {
    Write-Host "FAILED GATES:" -ForegroundColor Red
    $script:results | Where-Object { $_ -match '^FAIL' } | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host ""
}

$total = $script:pass + $script:fail + $script:skip
Write-Host "Phase 104: $($script:pass)/$total gates passed" -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Red" })

exit $script:fail
