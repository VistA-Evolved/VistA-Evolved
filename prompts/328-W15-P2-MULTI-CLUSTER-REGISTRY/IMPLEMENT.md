# Phase 328 — W15-P2: Multi-Cluster Registry (IMPLEMENT)

## User Request
Implement multi-cluster registry and tenant placement engine as the control plane
for multi-region deployment.

## Implementation Steps
1. Create `apps/api/src/services/multi-cluster-registry.ts`:
   - PlatformCluster type: id, name, region, regionTier, kubeContextRef, status, pgConnectionRef, vistaPlacementMode, maxTenants, currentTenantCount, metadata
   - TenantPlacement type: id, tenantId, clusterId, region, placementReason, dataResidencyConstraint, planTier, active
   - Deterministic placement engine with 5-step policy: data residency filter, region preference, plan tier capacity, load balancing, lexicographic tiebreak
   - In-memory stores with PG write-through and startup hydration
   - Cluster CRUD: register, list, get, status transitions, metadata update
   - Health snapshot recording (external push from cluster agents)
   - Placement simulation (dry-run without mutation)
   - Audit log (10K ring buffer)

2. Create `apps/api/src/routes/multi-cluster-routes.ts`:
   - 15 REST endpoints under /platform/clusters/ and /platform/tenants/
   - Admin-only via AUTH_RULES

3. PG migration v32: platform_cluster + tenant_placement tables with indexes

4. Wire into security.ts AUTH_RULES, register-routes.ts, store-policy.ts, CANONICAL_RLS_TABLES

## Verification Steps
- `npx tsc --noEmit` from apps/api — 0 errors
- AUTH_RULES contains /platform/clusters/, /platform/tenants/, /platform/placements
- Migration v32 exists with both CREATE TABLE statements
- CANONICAL_RLS_TABLES includes platform_cluster, tenant_placement
- Store inventory has 4 new entries (cluster-registry, tenant-placements, cluster-health, cluster-audit-log)
- register-routes.ts imports and registers multiClusterRoutes

## Files Touched
- apps/api/src/services/multi-cluster-registry.ts (NEW)
- apps/api/src/routes/multi-cluster-routes.ts (NEW)
- apps/api/src/platform/pg/pg-migrate.ts (migration v32 + RLS tables)
- apps/api/src/middleware/security.ts (AUTH_RULES)
- apps/api/src/server/register-routes.ts (import + register)
- apps/api/src/platform/store-policy.ts (4 store entries)
