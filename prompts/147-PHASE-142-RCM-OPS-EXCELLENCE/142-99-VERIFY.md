# Phase 142 — RCM Operational Excellence (VERIFY)

## Verification Gates

### Gate 1: TypeScript Compilation
- `pnpm -C apps/api exec tsc --noEmit` — 0 errors
- `pnpm -C apps/web exec tsc --noEmit` — 0 errors (if UI changed)

### Gate 2: Durable Job Queue
- Durable job table exists in migration
- Jobs survive API restart (SQLite persistence)
- Idempotency key deduplication works
- Retry + backoff + dead-letter works
- Job purge works

### Gate 3: Evidence-Gated Enforcement
- Payer without evidence → manual workflow, audit event logged
- Payer with stale evidence → warning in response
- Strict mode blocks stale evidence entirely
- Evidence check endpoint returns gate status

### Gate 4: Denial/Appeal Loop
- denial_followup_tick finds approaching-SLA denials
- Work items created for overdue denials
- Appeal packet generation works
- Standard state transitions enforced

### Gate 5: Reconciliation
- ERA import creates payment records
- Matching engine links payments to claims
- Underpayment detection produces cases
- Stats endpoint reflects imported data

### Gate 6: Routes + Auth
- All new endpoints require session auth
- POST endpoints require rcm:write
- GET endpoints require rcm:read
- 401 for unauthenticated

### Gate 7: Regression
- Gauntlet FAST ≥ baseline
- Gauntlet RC ≥ baseline
- Existing RCM endpoints still work
