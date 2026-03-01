# Phase 330 — W15-P4: Data Plane Sharding (IMPLEMENT)

## User Request
Implement data plane sharding -- tenant-to-regional-PG cluster mapping, cross-shard
query guard, shard health monitoring, and migration planning.

## Implementation Steps
1. Create `apps/api/src/services/data-plane-sharding.ts`:
   - DataShard type with region, replication role, connection ref, capacity
   - TenantShardMapping with migration state tracking
   - Deterministic shard selection (region filter, load balance, tiebreak)
   - Cross-shard query guard (validateSameShardAccess)
   - Health probes with replication lag, connection pool stats
   - Migration planning with 9-step plan template
   - Audit log (10K ring buffer)

2. Create `apps/api/src/routes/data-plane-sharding-routes.ts`:
   - 16 REST endpoints under /platform/shards/
   - Admin-only via AUTH_RULES

3. Wire into security.ts, register-routes.ts, store-policy.ts

## Files Touched
- apps/api/src/services/data-plane-sharding.ts (NEW)
- apps/api/src/routes/data-plane-sharding-routes.ts (NEW)
- apps/api/src/middleware/security.ts (+1 AUTH_RULE)
- apps/api/src/server/register-routes.ts (+import/register)
- apps/api/src/platform/store-policy.ts (+5 store entries)
