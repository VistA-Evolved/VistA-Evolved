# ADR: Analytics Stack

## Status

Accepted

## Context

VistA-Evolved needs a scalable analytics layer for operational dashboards,
quality metrics, and RCM reporting. Options considered:

1. **External BI tool (Metabase/Superset) + ClickHouse** — powerful but adds
   two heavyweight containers and a new query language. Overkill for current
   scale.
2. **dbt + Postgres materialized views** — solid for transforms but requires
   a Python runtime and a separate scheduler.
3. **In-process extract + aggregate + PG analytics schema** — zero new
   dependencies, reuses existing PG infrastructure, tenant-safe via RLS.

## Decision

- **Analytics extract operates in-process** using the existing event stream
  (`analytics-store.ts`) and domain store snapshots.
- **Aggregated data lands in PG** under an `analytics_*` table prefix with
  tenant_id columns and RLS policies. This reuses the existing PG migration
  framework (`pg-migrate.ts`).
- **The existing ROcto/Octo SQL layer** (Phase 25D) remains available for
  external BI tools that want read-only SQL access to pre-aggregated data.
- **No new containers** are required for Wave 19. External BI embed is a
  future enhancement.
- **CSV/JSON export** from within the application covers the immediate
  reporting need.

## Consequences

- Analytics tables share the same PG instance as operational data. At high
  scale, a dedicated analytics PG replica or ClickHouse migration is the
  natural next step.
- The extract layer must run incrementally to avoid full-table scans.
- Column masking and dataset RBAC are enforced at the application layer,
  not at the PG level, because RLS covers tenant isolation but not
  column-level sensitivity.
