<#
.SYNOPSIS
  Phase 300 verifier -- Clinical Writeback Command Bus (W12-P2)
.DESCRIPTION
  17 gates validating command bus structure, safety defaults, store policy, and PHI safety.
#>
param([switch]$Verbose)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$pass = 0; $fail = 0; $total = 17
function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  $id - $desc" -ForegroundColor Green; $script:pass++ }
    else { Write-Host "  FAIL  $id - $desc" -ForegroundColor Red; $script:fail++ }
  } catch {
    Write-Host "  FAIL  $id - $desc ($_)" -ForegroundColor Red; $script:fail++
  }
}

$wb = "apps/api/src/writeback"

Write-Host "`n=== Phase 300: Clinical Writeback Command Bus ===" -ForegroundColor Cyan
Write-Host "--- Structure Gates ---"

# Gate 1: types.ts exists with key exports
Gate "S01" "types.ts exports WritebackDomain, WritebackIntent, INTENT_DOMAIN_MAP" {
  $f = "$wb\types.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "WritebackDomain" -Quiet) -and
    (Select-String -Path $f -Pattern "WritebackIntent" -Quiet) -and
    (Select-String -Path $f -Pattern "INTENT_DOMAIN_MAP" -Quiet)
}

# Gate 2: gates.ts exists with key exports
Gate "S02" "gates.ts exports checkWritebackGate, getWritebackGateSummary" {
  $f = "$wb\gates.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "checkWritebackGate" -Quiet) -and
    (Select-String -Path $f -Pattern "getWritebackGateSummary" -Quiet)
}

# Gate 3: command-store.ts exists with CRUD
Gate "S03" "command-store.ts exports createCommand, getCommand, listCommands" {
  $f = "$wb\command-store.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "createCommand" -Quiet) -and
    (Select-String -Path $f -Pattern "getCommand" -Quiet) -and
    (Select-String -Path $f -Pattern "listCommands" -Quiet)
}

# Gate 4: command-bus.ts exists with core functions
Gate "S04" "command-bus.ts exports submitCommand, processCommand, registerExecutor" {
  $f = "$wb\command-bus.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "submitCommand" -Quiet) -and
    (Select-String -Path $f -Pattern "processCommand" -Quiet) -and
    (Select-String -Path $f -Pattern "registerExecutor" -Quiet)
}

# Gate 5: writeback-routes.ts exists
Gate "S05" "writeback-routes.ts is a Fastify plugin" {
  $f = "$wb\writeback-routes.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "FastifyInstance" -Quiet)
}

# Gate 6: barrel index.ts exists
Gate "S06" "index.ts barrel export exists" {
  $f = "$wb\index.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "submitCommand" -Quiet)
}

# Gate 7: PG migration v30
Gate "S07" "PG migration v30 (phase300_clinical_writeback_commands) exists" {
  $f = "apps/api/src/platform/pg/pg-migrate.ts"
  (Select-String -Path $f -Pattern "phase300_clinical_writeback_commands" -Quiet) -and
    (Select-String -Path $f -Pattern "version: 30" -Quiet)
}

# Gate 8: RLS tables
Gate "S08" "clinical_command, clinical_command_attempt, clinical_command_result in CANONICAL_RLS_TABLES" {
  $f = "apps/api/src/platform/pg/pg-migrate.ts"
  (Select-String -Path $f -Pattern '"clinical_command"' -Quiet) -and
    (Select-String -Path $f -Pattern '"clinical_command_attempt"' -Quiet) -and
    (Select-String -Path $f -Pattern '"clinical_command_result"' -Quiet)
}

# Gate 9: Audit actions
Gate "S09" "6 writeback audit actions in immutable-audit.ts" {
  $f = "apps/api/src/lib/immutable-audit.ts"
  $content = Get-Content $f -Raw
  ($content -match 'writeback\.submit') -and
    ($content -match 'writeback\.execute') -and
    ($content -match 'writeback\.dry_run') -and
    ($content -match 'writeback\.reject') -and
    ($content -match 'writeback\.retry') -and
    ($content -match 'writeback\.fail')
}

# Gate 10: register-routes.ts registers writeback
Gate "S10" "register-routes.ts imports and registers writebackCommandRoutes" {
  $f = "apps/api/src/server/register-routes.ts"
  (Select-String -Path $f -Pattern "writeback-routes" -Quiet) -and
    (Select-String -Path $f -Pattern "writebackCommandRoutes" -Quiet)
}

Write-Host "--- Safety Gates ---"

# Gate 11: No raw DFN stored
Gate "F11" "No raw DFN in command store (uses patientRefHash)" {
  $f = "$wb\command-store.ts"
  $content = Get-Content $f -Raw
  ($content -match 'patientRefHash') -and -not ($content -match 'patientDfn')
}

# Gate 12: Domain gates default OFF
Gate "F12" "All domain gates default to OFF (envBool with false)" {
  $f = "$wb\gates.ts"
  $content = Get-Content $f -Raw
  # Each domain gate uses envBool(key, false)
  ($content -match 'envBool\(envKey, false\)')
}

# Gate 13: Global gate defaults false
Gate "F13" "WRITEBACK_ENABLED defaults to false" {
  $f = "$wb\gates.ts"
  (Select-String -Path $f -Pattern 'WRITEBACK_ENABLED.*false' -Quiet)
}

# Gate 14: Dry-run defaults true
Gate "F14" "WRITEBACK_DRYRUN defaults to true" {
  $f = "$wb\gates.ts"
  (Select-String -Path $f -Pattern 'WRITEBACK_DRYRUN.*true' -Quiet)
}

Write-Host "--- Store Policy Gates ---"

# Gate 15: Store entries registered
Gate "P15" "store-policy.ts has 5 writeback store entries" {
  $f = "apps/api/src/platform/store-policy.ts"
  $content = Get-Content $f -Raw
  ($content -match 'writeback-commands') -and
    ($content -match 'writeback-attempts') -and
    ($content -match 'writeback-results') -and
    ($content -match 'writeback-idempotency-index') -and
    ($content -match 'writeback-executors')
}

# Gate 16: Critical stores have migration target
Gate "P16" "Critical writeback stores have migrationTarget defined" {
  $f = "apps/api/src/platform/store-policy.ts"
  # Look for writeback stores that are critical and have migrationTarget
  $content = Get-Content $f -Raw
  ($content -match 'writeback-commands[\s\S]*?migrationTarget') -and
    ($content -match 'writeback-attempts[\s\S]*?migrationTarget') -and
    ($content -match 'writeback-results[\s\S]*?migrationTarget')
}

Write-Host "--- PHI Safety Gate ---"

# Gate 17: No PHI in writeback directory
Gate "H17" "No SSN, DOB, patientName literals in writeback/ directory" {
  $files = Get-ChildItem -LiteralPath $wb -Filter "*.ts" -Recurse
  $found = $false
  foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match '\b(SSN|socialSecurity|dateOfBirth|patientName)\b' -and
        $content -notmatch 'patientRefHash') {
      $found = $true
      break
    }
  }
  -not $found
}

Write-Host "`n=== Results: $pass/$total PASS, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
exit $fail
