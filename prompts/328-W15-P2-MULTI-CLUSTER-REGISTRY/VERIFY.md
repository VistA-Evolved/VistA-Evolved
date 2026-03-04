# Phase 328 — W15-P2: Multi-Cluster Registry (VERIFY)

## Verification Gates

| #   | Gate                     | Pass Criteria                                                 |
| --- | ------------------------ | ------------------------------------------------------------- |
| 1   | tsc --noEmit             | 0 errors from apps/api                                        |
| 2   | Service file exists      | multi-cluster-registry.ts in services/                        |
| 3   | Routes file exists       | multi-cluster-routes.ts in routes/                            |
| 4   | Migration v32            | version 32 in MIGRATIONS array                                |
| 5   | DDL: platform_cluster    | CREATE TABLE IF NOT EXISTS platform_cluster                   |
| 6   | DDL: tenant_placement    | CREATE TABLE IF NOT EXISTS tenant_placement                   |
| 7   | RLS tables               | platform_cluster + tenant_placement in CANONICAL_RLS_TABLES   |
| 8   | AUTH_RULES clusters      | /platform/clusters/ pattern with admin auth                   |
| 9   | AUTH_RULES tenants       | /platform/tenants/ pattern with admin auth                    |
| 10  | Route registration       | multiClusterRoutes imported and registered                    |
| 11  | Store: cluster-registry  | id="cluster-registry" in STORE_INVENTORY                      |
| 12  | Store: tenant-placements | id="tenant-placements" in STORE_INVENTORY                     |
| 13  | Store: cluster-health    | id="cluster-health" in STORE_INVENTORY                        |
| 14  | Store: cluster-audit-log | id="cluster-audit-log" in STORE_INVENTORY                     |
| 15  | Placement determinism    | Same inputs → same cluster selection (lexicographic tiebreak) |
| 16  | Status transitions       | Only valid transitions allowed (decommissioned is terminal)   |
| 17  | No PHI leakage           | No patient data in any cluster/placement type                 |
| 18  | PG persistence           | persistCluster + persistPlacement with ON CONFLICT upsert     |
| 19  | Startup hydration        | loadClusterRegistry loads from PG on boot                     |

## Result

- ALL 19 GATES: PASS
- tsc --noEmit: 0 errors
- Committed as Phase 328
