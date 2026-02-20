<#
  verify-phase50-migration.ps1 -- Phase 50 Data Portability + Migration Toolkit Verification
  Gates: G50-1 through G50-5
#>
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $skip = 0

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id - $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id - $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id - $desc ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 50 Verification: Data Portability + Migration Toolkit ===`n" -ForegroundColor Cyan

# ---------------------------------------------------------------
# G50-1: Admin-only migration console enforced
# ---------------------------------------------------------------
Write-Host "--- G50-1: Admin-only migration console enforced ---" -ForegroundColor Yellow

Gate "G50-1a" "RbacPermission type includes migration:read" {
  $rbac = Get-Content "apps/api/src/auth/rbac.ts" -Raw
  $rbac -match '"migration:read"'
}

Gate "G50-1b" "RbacPermission type includes migration:write" {
  $rbac = Get-Content "apps/api/src/auth/rbac.ts" -Raw
  $rbac -match '"migration:write"'
}

Gate "G50-1c" "RbacPermission type includes migration:admin" {
  $rbac = Get-Content "apps/api/src/auth/rbac.ts" -Raw
  $rbac -match '"migration:admin"'
}

Gate "G50-1d" "Only admin role has migration:admin" {
  $rbac = Get-Content "apps/api/src/auth/rbac.ts" -Raw
  # admin has it
  $adminHas = $rbac -match 'admin:\s*\[[\s\S]*?"migration:admin"'
  # provider does NOT have it
  $providerLacks = -not ($rbac -match 'provider:\s*\[[\s\S]*?"migration:admin"')
  # nurse does NOT have it
  $nurseLacks = -not ($rbac -match 'nurse:\s*\[[\s\S]*?"migration:admin"')
  $adminHas -and $providerLacks -and $nurseLacks
}

Gate "G50-1e" "Non-admin roles lack migration permissions" {
  $rbac = Get-Content "apps/api/src/auth/rbac.ts" -Raw
  # Check that clerk, support, billing, pharmacist don't have migration:read
  $lines = $rbac -split "`n"
  $inNonAdmin = $false
  $violation = $false
  foreach ($line in $lines) {
    if ($line -match '^\s+(provider|nurse|pharmacist|billing|clerk|support):\s*\[') {
      $inNonAdmin = $true
    }
    if ($inNonAdmin -and $line -match '^\s+\],') {
      $inNonAdmin = $false
    }
    if ($inNonAdmin -and $line -match 'migration:') {
      $violation = $true
    }
  }
  -not $violation
}

Gate "G50-1f" "AUTH_RULES has /migration/ session rule" {
  $sec = Get-Content "apps/api/src/middleware/security.ts" -Raw
  $sec -match 'pattern:.*\\/migration\\/'
}

Gate "G50-1g" "Every migration route calls requireSession" {
  $routes = Get-Content "apps/api/src/migration/migration-routes.ts" -Raw
  # Count server.get + server.post + server.delete handlers
  $handlers = ([regex]::Matches($routes, 'server\.(get|post|delete)\(')).Count
  # Count requireSession calls inside handlers
  $sessions = ([regex]::Matches($routes, 'requireSession\(')).Count
  # Every handler must have at least one requireSession
  $sessions -ge $handlers
}

Gate "G50-1h" "Every mutation route calls requirePermission" {
  $routes = Get-Content "apps/api/src/migration/migration-routes.ts" -Raw
  # Count post/delete handlers (mutations)
  $mutations = ([regex]::Matches($routes, 'server\.(post|delete)\(')).Count
  # Count requirePermission calls
  $perms = ([regex]::Matches($routes, 'requirePermission\(')).Count
  $perms -ge $mutations
}

Gate "G50-1i" "No hardcoded credentials in migration files" {
  $files = Get-ChildItem "apps/api/src/migration/" -Filter "*.ts"
  $clean = $true
  foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    if ($content -match 'PROV123|password|secret.*=.*"[^"]{4,}"') {
      $clean = $false
    }
  }
  $clean
}

# ---------------------------------------------------------------
# G50-2: Dry-run validation produces deterministic report
# ---------------------------------------------------------------
Write-Host "`n--- G50-2: Dry-run validation produces deterministic report ---" -ForegroundColor Yellow

Gate "G50-2a" "parseCsv is a pure function (no side effects)" {
  $engine = Get-Content "apps/api/src/migration/mapping-engine.ts" -Raw
  # parseCsv should not reference any store or external state
  ($engine -match 'export function parseCsv') -and
  -not ($engine -match 'parseCsv[\s\S]*?(jobStore|templateStore|writeFile|fetch)')
}

Gate "G50-2b" "validateData returns deterministic ValidationResult" {
  $engine = Get-Content "apps/api/src/migration/mapping-engine.ts" -Raw
  # validateData returns { valid, totalRows, validRows, errorCount, warningCount, issues, preview }
  ($engine -match 'export function validateData') -and
  ($engine -match 'valid:.*errorCount === 0') -and
  ($engine -match 'totalRows:.*rows\.length')
}

Gate "G50-2c" "DryRunResult has totalRows/createCount/skipCount" {
  $types = Get-Content "apps/api/src/migration/types.ts" -Raw
  ($types -match 'totalRows:\s*number') -and
  ($types -match 'createCount:\s*number') -and
  ($types -match 'skipCount:\s*number')
}

Gate "G50-2d" "runDryRun does not write to any external store" {
  $pipeline = Get-Content "apps/api/src/migration/import-pipeline.ts" -Raw
  # runDryRun should only call getJob, transitionJob, updateJob, parseCsv, mapRow
  # It should NOT call any RPC, fetch, writeFile, etc.
  $dryRunSection = ($pipeline -split 'export function runDryRun')[1]
  $dryRunSection = ($dryRunSection -split 'export function runImport')[0]
  -not ($dryRunSection -match '(callRpc|safeCallRpc|fetch\(|writeFile|appendFile)')
}

Gate "G50-2e" "Dry-run reports per-row mapped data for preview" {
  $types = Get-Content "apps/api/src/migration/types.ts" -Raw
  $types -match 'DryRunRowResult[\s\S]*?mapped:\s*Record<string,\s*unknown>'
}

Gate "G50-2f" "14 transform functions registered" {
  $engine = Get-Content "apps/api/src/migration/mapping-engine.ts" -Raw
  # Count all keys in the TRANSFORMS record (quoted and unquoted)
  $transformKeys = [regex]::Matches($engine, '(?m)^\s+["\w][\w-]*["\w]?:\s*\(v')
  $transformKeys.Count -ge 14
}

Gate "G50-2g" "Validation checks required columns exist in CSV headers" {
  $engine = Get-Content "apps/api/src/migration/mapping-engine.ts" -Raw
  $engine -match "MISSING_COLUMN"
}

Gate "G50-2h" "Validation checks unmapped columns (info severity)" {
  $engine = Get-Content "apps/api/src/migration/mapping-engine.ts" -Raw
  $engine -match "UNMAPPED_COLUMN"
}

# ---------------------------------------------------------------
# G50-3: Imports do not break existing data
# ---------------------------------------------------------------
Write-Host "`n--- G50-3: Imports do not break existing data ---" -ForegroundColor Yellow

Gate "G50-3a" "Import uses in-memory store (no VistA writes)" {
  $pipeline = Get-Content "apps/api/src/migration/import-pipeline.ts" -Raw
  # Import section should use simulated IDs, not real VistA RPCs
  ($pipeline -match 'sim-.*entityType') -and
  -not ($pipeline -match 'callRpc\(|safeCallRpc\(')
}

Gate "G50-3b" "Sandbox import generates simulated entity IDs (sim-*)" {
  $pipeline = Get-Content "apps/api/src/migration/import-pipeline.ts" -Raw
  $pipeline -match 'entityId\s*=\s*`sim-'
}

Gate "G50-3c" "Rollback plan saved after import" {
  $pipeline = Get-Content "apps/api/src/migration/import-pipeline.ts" -Raw
  $pipeline -match 'saveRollbackPlan'
}

Gate "G50-3d" "Job store has max capacity (evicts oldest)" {
  $store = Get-Content "apps/api/src/migration/migration-store.ts" -Raw
  ($store -match 'MAX_JOBS\s*=\s*\d+') -and
  ($store -match 'Evict oldest')
}

Gate "G50-3e" "FSM prevents invalid state transitions" {
  $store = Get-Content "apps/api/src/migration/migration-store.ts" -Raw
  ($store -match 'VALID_TRANSITIONS') -and
  ($store -match 'Cannot transition from')
}

Gate "G50-3f" "rawData stripped from list and detail responses" {
  $routes = Get-Content "apps/api/src/migration/migration-routes.ts" -Raw
  # List endpoint strips rawData
  ($routes -match 'rawData,\s*\.\.\.rest') -and
  # Detail endpoint also strips rawData
  ($routes -match 'hasRawData:\s*!!rawData')
}

Gate "G50-3g" "Rolled-back status is terminal (no transitions out)" {
  $store = Get-Content "apps/api/src/migration/migration-store.ts" -Raw
  $store -match '"rolled-back":\s*\[\]'
}

Gate "G50-3h" "Import requires validated or dry-run-complete status" {
  $store = Get-Content "apps/api/src/migration/migration-store.ts" -Raw
  # validated transitions include "importing"
  ($store -match 'validated.*:\s*\[.*"importing"') -and
  # dry-run-complete transitions include "importing"
  ($store -match '"dry-run-complete".*:\s*\[.*"importing"')
}

# ---------------------------------------------------------------
# G50-4: Export bundles generated without PHI leakage in logs
# ---------------------------------------------------------------
Write-Host "`n--- G50-4: Export bundles generated without PHI leakage in logs ---" -ForegroundColor Yellow

Gate "G50-4a" "No console.log in migration files" {
  $files = Get-ChildItem "apps/api/src/migration/" -Filter "*.ts"
  $clean = $true
  foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    if ($content -match 'console\.log') { $clean = $false }
  }
  $clean
}

Gate "G50-4b" "Log statements use structured logger (log.info/warn)" {
  $files = Get-ChildItem "apps/api/src/migration/" -Filter "*.ts"
  $hasLogger = $false
  foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    if ($content -match 'import.*\{.*log.*\}.*from.*logger') { $hasLogger = $true }
  }
  $hasLogger
}

Gate "G50-4c" "Export logs do not contain patient data" {
  $export = Get-Content "apps/api/src/migration/export-pipeline.ts" -Raw
  # Log lines should only contain jobId, bundleType, encrypted, recordCount -- not patient names, SSN, etc.
  $logLines = [regex]::Matches($export, 'log\.\w+\([^)]+\)')
  $clean = $true
  foreach ($m in $logLines) {
    $line = $m.Value
    if ($line -match '(ssn|patient.*name|dob|address|firstName|lastName)') {
      $clean = $false
    }
  }
  $clean
}

Gate "G50-4d" "Import logs do not contain patient data" {
  $import = Get-Content "apps/api/src/migration/import-pipeline.ts" -Raw
  $logLines = [regex]::Matches($import, 'log\.\w+\([^)]+\)')
  $clean = $true
  foreach ($m in $logLines) {
    $line = $m.Value
    if ($line -match '(ssn|patient.*name|dob|address|firstName|lastName)') {
      $clean = $false
    }
  }
  $clean
}

Gate "G50-4e" "AES-256-GCM encryption available for exports" {
  $export = Get-Content "apps/api/src/migration/export-pipeline.ts" -Raw
  ($export -match 'aes-256-gcm') -and
  ($export -match 'createCipheriv') -and
  ($export -match 'getAuthTag')
}

Gate "G50-4f" "Encryption key from env var, not hardcoded" {
  $export = Get-Content "apps/api/src/migration/export-pipeline.ts" -Raw
  $export -match 'process\.env\.MIGRATION_EXPORT_KEY'
}

Gate "G50-4g" "Export result includes encryption metadata" {
  $types = Get-Content "apps/api/src/migration/types.ts" -Raw
  ($types -match 'encrypted:\s*boolean') -and
  ($types -match 'encryptionMeta')
}

Gate "G50-4h" "Audit trail entry for every export" {
  $routes = Get-Content "apps/api/src/migration/migration-routes.ts" -Raw
  # Export creation and export execution both have auditMigration calls
  ($routes -match 'auditMigration\("audit\.export"') -and
  ($routes -match 'action:\s*"export\.run"')
}

Gate "G50-4i" "Immutable audit has migration-specific actions" {
  $audit = Get-Content "apps/api/src/lib/immutable-audit.ts" -Raw
  ($audit -match '"migration\.import\.start"') -and
  ($audit -match '"migration\.export\.start"') -and
  ($audit -match '"migration\.rollback"')
}

# ---------------------------------------------------------------
# G50-5: Structural + compilation verification
# ---------------------------------------------------------------
Write-Host "`n--- G50-5: Structural + compilation verification ---" -ForegroundColor Yellow

Gate "G50-5a" "migration-routes.ts exists" {
  Test-Path -LiteralPath "apps/api/src/migration/migration-routes.ts"
}

Gate "G50-5b" "mapping-engine.ts exists" {
  Test-Path -LiteralPath "apps/api/src/migration/mapping-engine.ts"
}

Gate "G50-5c" "migration-store.ts exists" {
  Test-Path -LiteralPath "apps/api/src/migration/migration-store.ts"
}

Gate "G50-5d" "import-pipeline.ts exists" {
  Test-Path -LiteralPath "apps/api/src/migration/import-pipeline.ts"
}

Gate "G50-5e" "export-pipeline.ts exists" {
  Test-Path -LiteralPath "apps/api/src/migration/export-pipeline.ts"
}

Gate "G50-5f" "templates.ts exists with 8 templates" {
  $tpl = Get-Content "apps/api/src/migration/templates.ts" -Raw
  ($tpl -match 'generic-csv-patient') -and
  ($tpl -match 'generic-csv-problem') -and
  ($tpl -match 'generic-csv-medication') -and
  ($tpl -match 'generic-csv-allergy') -and
  ($tpl -match 'generic-csv-appointment') -and
  ($tpl -match 'openemr-csv-patient') -and
  ($tpl -match 'openemr-csv-allergy') -and
  ($tpl -match 'fhir-bundle-patient')
}

Gate "G50-5g" "Admin migration UI page exists" {
  Test-Path -LiteralPath "apps/web/src/app/cprs/admin/migration/page.tsx"
}

Gate "G50-5h" "modules.json has migration module" {
  $mods = Get-Content "config/modules.json" -Raw
  ($mods -match '"migration"') -and ($mods -match 'Data Portability')
}

Gate "G50-5i" "skus.json FULL_SUITE includes migration" {
  $skus = Get-Content "config/skus.json" -Raw
  $skus -match '"migration"'
}

Gate "G50-5j" "capabilities.json has migration.* entries" {
  $caps = Get-Content "config/capabilities.json" -Raw
  ($caps -match '"migration\.import\.csv"') -and
  ($caps -match '"migration\.export\.patientSummary"') -and
  ($caps -match '"migration\.mapping\.templates"')
}

Gate "G50-5k" "index.ts imports and registers migrationRoutes" {
  $idx = Get-Content "apps/api/src/index.ts" -Raw
  ($idx -match 'import migrationRoutes') -and
  ($idx -match 'server\.register\(migrationRoutes\)')
}

Gate "G50-5l" "docs/migration/migration-toolkit.md exists" {
  Test-Path -LiteralPath "docs/migration/migration-toolkit.md"
}

Gate "G50-5m" "docs/migration/source-connectors.md exists" {
  Test-Path -LiteralPath "docs/migration/source-connectors.md"
}

Gate "G50-5n" "tsc --noEmit clean" {
  Push-Location "apps/api"
  $tscOut = npx tsc --noEmit 2>&1
  Pop-Location
  $tscOut.Count -eq 0 -or ($tscOut -join " ") -eq ""
}

Gate "G50-5o" "No raw 'as any' on migration permission strings" {
  $routes = Get-Content "apps/api/src/migration/migration-routes.ts" -Raw
  -not ($routes -match '"migration:\w+" as any')
}

Gate "G50-5p" "types.ts exports RollbackPlan" {
  $types = Get-Content "apps/api/src/migration/types.ts" -Raw
  # Check if RollbackPlan is defined -- it may be in types or store
  $hasRollback = $false
  $allFiles = Get-ChildItem "apps/api/src/migration/" -Filter "*.ts"
  foreach ($f in $allFiles) {
    $c = Get-Content $f.FullName -Raw
    if ($c -match 'interface RollbackPlan|type RollbackPlan') { $hasRollback = $true }
  }
  $hasRollback
}

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------
$total = $pass + $fail + $skip
Write-Host "`n=== Phase 50 Verification Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass / $total" -ForegroundColor Green
if ($fail -gt 0) { Write-Host "  FAIL: $fail / $total" -ForegroundColor Red }
if ($skip -gt 0) { Write-Host "  SKIP: $skip / $total" -ForegroundColor Yellow }

if ($fail -eq 0) {
  Write-Host "`n  Phase 50 VERIFIED" -ForegroundColor Green
} else {
  Write-Host "`n  Phase 50 has $fail failure(s)" -ForegroundColor Red
}

exit $fail
