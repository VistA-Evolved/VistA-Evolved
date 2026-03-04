# Phase 103 — VERIFY: Platform DB Performance Posture

## Verification Script

`scripts/verify-phase103-db-performance.ps1`

## Gates (82 total)

### Section 1: Migration v6 (26 gates)

- Migration v6 exists with correct name
- All 24 indexes verified by name
- Partitioning posture documented + deferred note

### Section 2: Connection Pool Config (6 gates)

- statement_timeout + env var
- idle_in_transaction_session_timeout + env var
- connection timeout 5s, idle timeout 30s

### Section 3: Retry Logic (10 gates)

- pg-retry.ts exists
- withPgRetry function with exponential backoff + jitter
- Transient PG error codes (40001, 40P01, 08xxx)
- isPgUniqueViolation helper, maxDelayMs cap

### Section 4: Idempotency Middleware (8 gates)

- idempotency.ts exists
- Guard + OnSend functions
- Header checks, TTL config, memory store, pruning, stats export

### Section 5: Route Wiring (4 gates)

- Import of idempotencyGuard + idempotencyOnSend
- preHandler + onSend hook registration

### Section 6: Barrel Exports (3 gates)

- withPgRetry, isPgUniqueViolation, PgRetryOptions

### Section 7: k6 Load Test (6 gates)

- db-load.js exists with ramping-vus
- Read/write latency thresholds, payer-db endpoints, idempotent write, error rate

### Section 8: Architecture Doc (12 gates)

- Doc exists with all 7 sections verified

### Section 9: TypeScript Compilation (1 gate)

- apps/api compiles cleanly

### Section 10: Prompt File (1 gate)

- Prompt file exists

## Run

```powershell
.\scripts\verify-phase103-db-performance.ps1
```
