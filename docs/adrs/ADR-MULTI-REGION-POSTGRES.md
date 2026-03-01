# ADR: Multi-Region PostgreSQL Strategy

**Status:** Accepted
**Date:** 2026-03-01
**Decision Makers:** Platform Engineering
**Phase:** W15-P1 (327)

## Context

Per ADR-TENANT-SHARDING, each region operates its own PG cluster. This ADR
decides how data is replicated between regions for DR and read scaling.

## Options Considered

### Option A: Active-Passive with Streaming Replication (CHOSEN)

Each regional PG cluster has a primary (read-write) and one or more standbys.
Cross-region replication uses PostgreSQL streaming replication (async) to a
standby in the DR region. The DR standby is read-only and can be promoted
during failover.

**Pros:**
- Native PostgreSQL, no third-party tools
- Well-understood operational model
- RPO = replication lag (typically < 1s async)
- RTO = time to promote standby + DNS update (minutes)

**Cons:**
- DR region standby is read-only (no active-active)
- Replication lag means potential data loss during async failover
- Cross-region bandwidth cost for WAL shipping

### Option B: Logical Replication (Selective Tables)

Use PG logical replication to replicate specific tables (e.g., audit,
reference data) to a DR region. Application data stays local.

**Pros:**
- Fine-grained control over what replicates
- DR region can have its own schema extensions

**Cons:**
- Complex setup per table
- DDL changes don't replicate automatically
- Not a full DR solution without additional tooling

### Option C: Active-Active with Conflict Resolution

Both regions accept writes. Conflict resolution via application logic
or CRDT-like patterns.

**Pros:**
- Zero-downtime failover
- Read-write in both regions

**Cons:**
- Extreme complexity for healthcare data (order integrity, audit chains)
- Conflict resolution for clinical data is clinically dangerous
- No proven PostgreSQL-native active-active without third-party (e.g., BDR)

## Decision

**Option A: Active-Passive with Streaming Replication**

Each regional PG cluster operates as primary (read-write). A cross-region
standby receives async streaming replication for DR. The standby can be
promoted to primary during a controlled failover.

Active-active is explicitly rejected for clinical data due to conflict
resolution risks. This decision may be revisited for non-clinical data
(analytics, cost reports) in future waves.

## Replication Topology

```
Region US-East (Primary for tenants assigned to US-East):
  PG Primary -> PG Standby (same-region, sync)
            \-> PG DR Standby (US-West, async)

Region US-West (Primary for tenants assigned to US-West):
  PG Primary -> PG Standby (same-region, sync)
            \-> PG DR Standby (US-East, async)
```

## RPO/RTO Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| RPO (normal) | < 1 second | Streaming replication lag |
| RPO (async DR) | < 30 seconds | Cross-region WAL lag |
| RTO (standby promotion) | < 5 minutes | Time from decision to promoted + routing |
| RTO (full DR) | < 15 minutes | Including DNS propagation + verification |

## Migration Coordination

- Schema migrations run against all regional primaries sequentially
- Migration version tracking per cluster in control plane DB
- If a migration fails on one cluster:
  1. Halt further migrations
  2. Alert ops team
  3. Do NOT auto-rollback on other clusters (they may have succeeded)
  4. Manual resolution required

## Operational Risks

- **Replication lag during high write load:** Monitor `pg_stat_replication`
  lag. Alert at > 10s. Circuit-break writes if lag > 60s.
- **Split-brain after network partition:** Fencing via `pg_isready` probe +
  exclusive lock on control plane before promotion.
- **WAL accumulation during network outage:** Set `wal_keep_size` and
  `max_slot_wal_keep_size` to prevent disk exhaustion.

## Data Residency Constraints

- Cross-region DR standby receives encrypted WAL streams
- WAL contains PHI; replication link must be encrypted (SSL required)
- DR standby region must satisfy data residency for DR purposes
  (documented in tenant placement policy)

## Rollback Plan

1. If replication causes issues, pause WAL shipping (`pg_replication_slot` pause)
2. DR standby becomes stale but safe
3. Rebuild standby from fresh base backup when resolved
4. No data loss on primary during rollback
