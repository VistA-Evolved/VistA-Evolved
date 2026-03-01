# ADR: Tenant Sharding Strategy

**Status:** Accepted
**Date:** 2026-03-01
**Decision Makers:** Platform Engineering
**Phase:** W15-P1 (327)

## Context

VistA-Evolved currently runs all tenants against a single PostgreSQL cluster
with Row-Level Security (RLS) enforcing isolation. As tenant count and data
volume grow, a single cluster becomes a bottleneck for:
- Connection pool exhaustion (hundreds of tenants x connection pool size)
- Storage IOPS contention during peak hours
- Data residency requirements (PHI must stay in-region)
- Blast radius -- a single DB outage affects every tenant

## Options Considered

### Option A: Per-Region DB Cluster (CHOSEN)

Each region gets its own PG cluster. Tenants are assigned to a region at
creation time based on their data residency requirements and plan tier. The
control plane maintains a `tenant_db_map` that the API uses to select the
correct connection pool.

**Pros:**
- Clear data residency boundaries per region
- Horizontal scale: add regions to add capacity
- Blast radius limited to one region
- RLS still enforced within each cluster

**Cons:**
- Cross-region queries require explicit federation (not supported initially)
- Schema migrations must be coordinated across clusters
- More complex connection management

### Option B: Per-Tenant Database

Each tenant gets its own database within a cluster (or its own cluster).

**Pros:**
- Maximum isolation
- Simple backup/restore per tenant

**Cons:**
- Connection pool explosion (N tenants x pool size)
- Migration complexity scales linearly with tenants
- Expensive at scale

### Option C: Shared Cluster with RLS Only (Status Quo)

Continue with a single PG cluster and RLS.

**Pros:**
- Simple operations
- Already working

**Cons:**
- Single point of failure
- Cannot satisfy data residency requirements
- Connection/IOPS ceiling

## Decision

**Option A: Per-Region DB Cluster**

Each region operates an independent PG cluster. Tenants are mapped to exactly
one region/cluster pair. The `tenant_db_map` table in the control plane DB
(which itself is in the primary region) tracks assignments.

## Implementation Constraints

1. **Control plane DB stays in the primary region.** It holds tenant metadata,
   placement decisions, and the cluster registry. It is NOT sharded.
2. **Data plane DBs are per-region.** Each holds tenant application data
   (claims, encounters, audit, etc.) with RLS enforced.
3. **Migration runner must support per-cluster apply.** A migration targets
   all data plane clusters sequentially. Dry-run is mandatory before apply.
4. **No cross-region joins.** If a query needs data from multiple regions,
   it must aggregate at the application layer.

## Operational Risks

- **Split-brain during network partition:** Mitigated by single-writer-per-region.
  Reads can fail over to replicas but writes stay on the primary.
- **Clock skew across regions:** Use server-side `now()` for timestamps, not
  application-side. Log sync offsets in telemetry.
- **Migration drift:** If one cluster fails a migration, others may be ahead.
  Mitigation: version tracking per cluster + gated rollback.

## Data Residency Constraints

- Tenant region is immutable after creation (except via admin migration tool).
- PHI data never leaves the assigned region.
- Audit logs replicate to the primary region for compliance aggregation
  (using hash-chained JSONL, not raw PHI -- consistent with Phase 157).

## Rollback Plan

1. Stop routing tenants to the new cluster.
2. Migrate affected tenants back to the original cluster using `sqlite-to-pg.mjs`
   pattern (idempotent, `ON CONFLICT DO NOTHING`).
3. Remove the cluster from the registry.
4. Update `tenant_db_map` entries.
