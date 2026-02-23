<# Phase 103 Verification: Platform DB Performance Posture #>
param([switch]$SkipDocker, [switch]$Verbose)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $results = @()

function Gate([string]$name, [bool]$ok) {
  if ($ok) {
    $script:pass++
    $script:results += "  PASS: $name"
  } else {
    $script:fail++
    $script:results += "  FAIL: $name"
  }
}

Write-Host "`n=== Phase 103 Verification: Platform DB Performance Posture ===" -ForegroundColor Cyan

# --- Section 1: Migration v6 ---
Write-Host "--- Section 1: Migration v6 (Performance Indexes) ---"
$migrate = Get-Content "apps/api/src/platform/pg/pg-migrate.ts" -Raw

# Check migration v6 exists
Gate "migration v6 exists" ($migrate -match 'version:\s*6')
Gate "migration v6 name" ($migrate -match 'performance_indexes_and_partitioning_posture')

# Check new indexes
Gate "idx_payer_tenant_active" ($migrate -match 'idx_payer_tenant_active')
Gate "idx_payer_country_active" ($migrate -match 'idx_payer_country_active')
Gate "idx_payer_integration_mode" ($migrate -match 'idx_payer_integration_mode')
Gate "idx_tenant_payer_unique" ($migrate -match 'idx_tenant_payer_unique')
Gate "idx_capability_payer_key" ($migrate -match 'idx_capability_payer_key')
Gate "idx_task_tenant_status" ($migrate -match 'idx_task_tenant_status')
Gate "idx_task_payer" ($migrate -match 'idx_task_payer')
Gate "idx_payer_audit_tenant_time" ($migrate -match 'idx_payer_audit_tenant_time')
Gate "idx_denial_tenant_status" ($migrate -match 'idx_denial_tenant_status')
Gate "idx_denial_claim" ($migrate -match 'idx_denial_claim')
Gate "idx_denial_action_denial" ($migrate -match 'idx_denial_action_denial')
Gate "idx_denial_attach_denial" ($migrate -match 'idx_denial_attach_denial')
Gate "idx_resub_denial" ($migrate -match 'idx_resub_denial')
Gate "idx_remittance_tenant" ($migrate -match 'idx_remittance_tenant')
Gate "idx_payment_payer" ($migrate -match 'idx_payment_payer')
Gate "idx_payment_status" ($migrate -match 'idx_payment_status')
Gate "idx_recon_tenant" ($migrate -match 'idx_recon_tenant')
Gate "idx_recon_payment" ($migrate -match 'idx_recon_payment')
Gate "idx_underpay_status" ($migrate -match 'idx_underpay_status')
Gate "idx_outbox_tenant" ($migrate -match 'idx_outbox_tenant')
Gate "idx_audit_actor" ($migrate -match 'idx_audit_actor')
Gate "idx_evidence_tenant" ($migrate -match 'idx_evidence_tenant')
Gate "idx_eligibility_status" ($migrate -match 'idx_eligibility_status')
Gate "idx_claim_status_status" ($migrate -match 'idx_claim_status_status')

# Partitioning posture documented
Gate "partitioning posture documented" ($migrate -match 'PARTITION BY RANGE')
Gate "partitioning deferred note" ($migrate -match 'DEFERRED')

# --- Section 2: Connection Pool Configuration ---
Write-Host "--- Section 2: Connection Pool Configuration ---"
$pgdb = Get-Content "apps/api/src/platform/pg/pg-db.ts" -Raw

Gate "statement_timeout in pool config" ($pgdb -match 'statement_timeout')
Gate "idle_in_transaction_session_timeout" ($pgdb -match 'idle_in_transaction_session_timeout')
Gate "PLATFORM_PG_STATEMENT_TIMEOUT_MS env var" ($pgdb -match 'PLATFORM_PG_STATEMENT_TIMEOUT_MS')
Gate "PLATFORM_PG_IDLE_TX_TIMEOUT_MS env var" ($pgdb -match 'PLATFORM_PG_IDLE_TX_TIMEOUT_MS')
Gate "connection timeout 5s" ($pgdb -match 'connectionTimeoutMillis.*5.?000')
Gate "idle timeout 30s" ($pgdb -match 'idleTimeoutMillis.*30.?000')

# --- Section 3: Retry Logic ---
Write-Host "--- Section 3: Retry Logic (pg-retry.ts) ---"
$retryFile = "apps/api/src/platform/pg/pg-retry.ts"
Gate "pg-retry.ts exists" (Test-Path -LiteralPath $retryFile)

if (Test-Path -LiteralPath $retryFile) {
  $retry = Get-Content $retryFile -Raw
  Gate "withPgRetry function" ($retry -match 'export async function withPgRetry')
  Gate "exponential backoff" ($retry -match 'Math\.pow')
  Gate "jitter" ($retry -match 'Math\.random')
  Gate "transient error detection" ($retry -match 'RETRYABLE_PG_CODES')
  Gate "serialization_failure code 40001" ($retry -match '40001')
  Gate "deadlock code 40P01" ($retry -match '40P01')
  Gate "connection error codes 08xxx" ($retry -match '08000')
  Gate "isPgUniqueViolation helper" ($retry -match 'isPgUniqueViolation')
  Gate "max delay cap" ($retry -match 'maxDelayMs')
}

# --- Section 4: Idempotency Middleware ---
Write-Host "--- Section 4: Idempotency Middleware ---"
$idempFile = "apps/api/src/middleware/idempotency.ts"
Gate "idempotency.ts exists" (Test-Path -LiteralPath $idempFile)

if (Test-Path -LiteralPath $idempFile) {
  $idemp = Get-Content $idempFile -Raw
  Gate "idempotencyGuard function" ($idemp -match 'export function idempotencyGuard')
  Gate "idempotencyOnSend function" ($idemp -match 'export.*function idempotencyOnSend')
  Gate "Idempotency-Key header check" ($idemp -match 'idempotency-key')
  Gate "Idempotency-Replayed header" ($idemp -match 'Idempotency-Replayed')
  Gate "TTL configuration" ($idemp -match 'IDEMPOTENCY_TTL_MS')
  Gate "memory store with max entries" ($idemp -match 'MAX_MEMORY_ENTRIES')
  Gate "expiry pruning" ($idemp -match 'pruneExpired')
  Gate "getIdempotencyStats export" ($idemp -match 'getIdempotencyStats')
}

# --- Section 5: Route Wiring ---
Write-Host "--- Section 5: Route Wiring ---"
$routes = Get-Content "apps/api/src/routes/admin-payer-db-routes.ts" -Raw

Gate "routes import idempotencyGuard" ($routes -match 'idempotencyGuard')
Gate "routes import idempotencyOnSend" ($routes -match 'idempotencyOnSend')
Gate "routes register preHandler hook" ($routes -match 'addHook.*preHandler.*idempotencyGuard')
Gate "routes register onSend hook" ($routes -match 'addHook.*onSend.*idempotencyOnSend')

# --- Section 6: Barrel Exports ---
Write-Host "--- Section 6: Barrel Exports ---"
$barrel = Get-Content "apps/api/src/platform/pg/index.ts" -Raw

Gate "barrel exports withPgRetry" ($barrel -match 'withPgRetry')
Gate "barrel exports isPgUniqueViolation" ($barrel -match 'isPgUniqueViolation')
Gate "barrel exports PgRetryOptions type" ($barrel -match 'PgRetryOptions')

# --- Section 7: k6 Load Test ---
Write-Host "--- Section 7: k6 Load Test ---"
$k6File = "tests/k6/db-load.js"
Gate "db-load.js exists" (Test-Path -LiteralPath $k6File)

if (Test-Path -LiteralPath $k6File) {
  $k6 = Get-Content $k6File -Raw
  Gate "k6 has ramping-vus scenario" ($k6 -match 'ramping-vus')
  Gate "k6 read latency threshold" ($k6 -match 'db_read_latency.*p\(95\)')
  Gate "k6 write latency threshold" ($k6 -match 'db_write_latency.*p\(95\)')
  Gate "k6 tests payer-db endpoints" ($k6 -match 'admin/payer-db/payers')
  Gate "k6 tests idempotent write" ($k6 -match 'Idempotency-Key')
  Gate "k6 error rate threshold" ($k6 -match 'http_req_failed')
}

# --- Section 8: Architecture Doc ---
Write-Host "--- Section 8: Architecture Doc ---"
$docFile = "docs/architecture/platform-db-performance.md"
Gate "architecture doc exists" (Test-Path -LiteralPath $docFile)

if (Test-Path -LiteralPath $docFile) {
  $doc = Get-Content $docFile -Raw
  Gate "doc: connection pooling section" ($doc -match 'Connection Pooling')
  Gate "doc: pgbouncer plan" ($doc -match 'PgBouncer')
  Gate "doc: transaction mode recommendation" ($doc -match 'transaction.*mode')
  Gate "doc: partitioning posture" ($doc -match 'Partitioning Posture')
  Gate "doc: partition trigger criteria" ($doc -match 'trigger criteria')
  Gate "doc: indexes section" ($doc -match 'Migration v6')
  Gate "doc: timeouts section" ($doc -match 'Statement timeout')
  Gate "doc: retry logic section" ($doc -match 'withPgRetry')
  Gate "doc: idempotency section" ($doc -match 'Idempotency middleware')
  Gate "doc: load testing section" ($doc -match 'k6 DB Load Test')
  Gate "doc: env var reference" ($doc -match 'PLATFORM_PG_STATEMENT_TIMEOUT_MS')
  Gate "doc: monitoring recommendations" ($doc -match 'Monitoring Recommendations')
}

# --- Section 9: TypeScript Compilation ---
Write-Host "--- Section 9: TypeScript Compilation ---"
Push-Location "apps/api"
npx tsc --noEmit 2>&1 | Out-Null
$tscOk = $LASTEXITCODE -eq 0
Pop-Location
Gate "TypeScript compiles cleanly (apps/api)" $tscOk

# --- Section 10: Prompt File ---
Write-Host "--- Section 10: Prompt File ---"
$promptFile = "prompts/107-PHASE-103-DB-PERFORMANCE/103-01-IMPLEMENT.md"
Gate "prompt file exists" (Test-Path -LiteralPath $promptFile)

# === Results ===
$total = $pass + $fail
Write-Host "`n=== Phase 103 Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass / $total" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
if ($fail -gt 0) {
  Write-Host "  FAIL: $fail" -ForegroundColor Red
}
Write-Host ""
$results | ForEach-Object { Write-Host $_ }

if ($fail -eq 0) {
  Write-Host "`nPhase 103 PASSED" -ForegroundColor Green
} else {
  Write-Host "`nPhase 103 FAILED ($fail failures)" -ForegroundColor Red
  exit 1
}
