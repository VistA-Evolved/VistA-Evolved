# Phase 320 — W14-P4: HL7v2 Ops Maturity

## User Request

Add operational maturity to the HL7v2 engine: SLA monitoring with breach detection,
time-bucketed throughput counters, latency percentile calculation (p50/p95/p99),
automatic retry queue with exponential backoff, and unified ops dashboard.

## Implementation Steps

1. Created `apps/api/src/hl7/hl7-ops-monitor.ts` (~480 lines):
   - SLA types & configuration store (delivery rate + p95/p99 latency targets)
   - SLA evaluation engine — checks throughput data against SLA thresholds
   - SLA violation store with ack workflow (max 5000, FIFO eviction)
   - `calculatePercentiles()` — p50/p95/p99/min/max/avg/count from latency arrays
   - Time-bucketed throughput store: per-endpoint per-minute counters (24h rolling)
   - Auto-retry queue: exponential backoff, max 3 retries, DLQ entry references
   - `buildOpsDashboard()` — unified view combining channel health, DLQ, retry, SLA

2. Created `apps/api/src/routes/hl7-ops.ts` (14 REST endpoints):
   - GET /hl7/ops/dashboard
   - GET /hl7/ops/throughput/:endpointId
   - POST /hl7/ops/sla, GET /hl7/ops/sla, DELETE /hl7/ops/sla/:id
   - POST /hl7/ops/sla/evaluate
   - GET /hl7/ops/sla/violations, POST /hl7/ops/sla/violations/:id/ack
   - POST /hl7/ops/retry/:dlqId, GET /hl7/ops/retry, GET /hl7/ops/retry/stats,
     GET /hl7/ops/retry/due

3. Wired into register-routes.ts, security.ts (admin auth), store-policy.ts (4 stores)

## Verification

- `npx tsc --noEmit` — clean (0 errors)
- All new routes admin-gated in AUTH_RULES
- 4 store-policy entries registered (cache/registry/audit classifications)

## Files Touched

- apps/api/src/hl7/hl7-ops-monitor.ts (NEW)
- apps/api/src/routes/hl7-ops.ts (NEW)
- apps/api/src/server/register-routes.ts (import + register)
- apps/api/src/middleware/security.ts (AUTH_RULES for /hl7/ops/)
- apps/api/src/platform/store-policy.ts (4 store entries)
