# Phase 331 — IMPLEMENT: Queue & Cache Regionalization (W15-P5)

## User Request
Implement region-local job queues, regional cache partitioning, worker
registration with heartbeats, and idempotent cross-region failover transfer.

## Implementation Steps
1. Create `apps/api/src/services/queue-cache-regional.ts`
   - RegionalJob lifecycle: enqueue → claim → complete → retry → dead_letter
   - Idempotency index prevents duplicate processing across failover
   - Priority-based claim (critical > high > normal > low)
   - Cross-region failover transfer with duplicate detection
   - Regional worker registry with heartbeat
   - Cache partition registry with stats reporting
   - Queue metrics aggregation
   - 10K ring-buffer audit log
2. Create `apps/api/src/routes/queue-cache-regional-routes.ts`
   - 18 REST endpoints (jobs, workers, cache, transfers, metrics, audit)
3. Wire AUTH_RULES for /platform/queues/, /platform/workers/, /platform/cache/
4. Register routes in register-routes.ts
5. Add 5 store-policy entries

## Files Touched
- apps/api/src/services/queue-cache-regional.ts (NEW)
- apps/api/src/routes/queue-cache-regional-routes.ts (NEW)
- apps/api/src/middleware/security.ts (3 AUTH_RULES)
- apps/api/src/server/register-routes.ts (import + register)
- apps/api/src/platform/store-policy.ts (5 store entries)
