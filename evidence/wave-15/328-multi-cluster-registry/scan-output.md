# Phase 328 — Multi-Cluster Registry Scan Output

## Files Changed
| File | Action | Lines |
|------|--------|-------|
| apps/api/src/services/multi-cluster-registry.ts | NEW | ~430 |
| apps/api/src/routes/multi-cluster-routes.ts | NEW | ~230 |
| apps/api/src/platform/pg/pg-migrate.ts | MODIFIED | +45 (migration v32 + RLS) |
| apps/api/src/middleware/security.ts | MODIFIED | +4 (AUTH_RULES) |
| apps/api/src/server/register-routes.ts | MODIFIED | +5 (import + register) |
| apps/api/src/platform/store-policy.ts | MODIFIED | +40 (4 store entries) |

## Verification
- tsc --noEmit: **0 errors**
- Migration v32 `phase328_multi_cluster_registry`: 2 tables, 8 indexes
- CANONICAL_RLS_TABLES: +2 entries (platform_cluster, tenant_placement)
- AUTH_RULES: 3 new patterns (clusters, tenants, placements) — all admin
- STORE_INVENTORY: 4 new entries (2 critical/pg_backed, 1 cache, 1 audit)

## Placement Engine Policy (5-step deterministic)
1. **Data residency filter** — exclude clusters outside constraint region
2. **Region preference** — prefer clusters matching requested region
3. **Plan tier capacity** — enterprise tenants prefer dedicated clusters
4. **Load balancing** — lowest tenant-count-to-max ratio wins
5. **Lexicographic tiebreak** — cluster name for full determinism

## ADR Alignment
- ADR-TENANT-SHARDING: Per-region DB cluster → `pgConnectionRef` field
- ADR-VISTA-PLACEMENT: Per-tenant per region → `vistaPlacementMode` field
- ADR-COST-ATTRIBUTION: Plan tier → `planTier` on placement records
