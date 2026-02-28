# ADR: Usage Metering Choice

**Status:** Accepted
**Date:** 2025-07-22
**Phase:** 238 (Wave 6 P1)

## Context

VistA-Evolved needs usage metering for billing, quota enforcement, and capacity
planning. Current state:

- **analytics-store.ts** (313 lines): PHI-safe event stream with ring buffer,
  salted SHA-256 user ID hashing, and tag sanitization
- **analytics-aggregator.ts** (419 lines): Hourly/daily aggregation engine with
  background timer (default 1hr interval)
- **analytics-etl.ts** (484 lines): PG wire protocol ETL writer to ROcto (zero
  npm deps, MD5 auth, Simple Query protocol)
- **ROcto/Octo**: SQL analytics on YottaDB (port 1338), aggregated metrics tables

**What is missing:**
- No billing-specific metering (API calls per tenant, RPC calls, storage usage)
- No quota enforcement (rate limiting is per-user, not per-tenant-metered)
- No consumption tracking for SaaS billing integration
- No metering event schema distinct from analytics events

## Decision

**Extend the existing analytics-store.ts with a dedicated metering counter
layer** that tracks per-tenant API call counts, RPC call counts, and storage
metrics. Use the existing aggregation pipeline to roll up metering data.

Rationale:
- analytics-store.ts already handles PHI-safe event ingestion
- analytics-aggregator.ts already does hourly/daily rollups
- analytics-etl.ts already writes to ROcto for SQL queries
- Adding a `MeteringEvent` type and counter accumulator requires minimal new code
- Avoids introducing a new external service (OpenMeter, Stripe Metering)
- Metering data flows through the same pipeline: event -> aggregate -> ETL -> SQL

## Alternatives Considered

| Option | License | Pros | Cons |
|--------|---------|------|------|
| **OpenMeter** | Apache-2.0 | Purpose-built, Kafka/ClickHouse | Heavy infrastructure, overkill for current scale |
| **Stripe Metering** | Proprietary API | Direct billing integration | Vendor lock-in, requires Stripe subscription |
| **Custom standalone** | N/A | Full control | Duplicates existing analytics pipeline |
| **Extend analytics** | N/A | Reuses 3 existing services | Metering shares pipeline with analytics |

## Consequences

**Positive:**
- Zero new infrastructure
- Reuses tested PHI-safe pipeline
- SQL queryable via ROcto for billing reports
- Same aggregation schedule as analytics (configurable)
- Metering data inherits existing audit trail

**Negative:**
- Metering shares pipeline with analytics — burst analytics could delay metering
- ROcto is not a production-grade billing database
- No real-time webhook to billing system (batch only)

**Migration path:**
- When scale demands it, extract metering to dedicated ClickHouse/TimescaleDB
- Or integrate OpenMeter API as a sink (ETL writes to OpenMeter instead of ROcto)

## Security / PHI Notes

- Metering events MUST NOT contain patient identifiers
- Tenant ID is the primary dimension (not user, not patient)
- Counter values are numeric — no PHI by construction
- Follows existing analytics PHI-safe patterns (salted hashes, tag sanitization)

## Ops Notes

- Metering counters reset on API restart (in-memory accumulator)
- Aggregation persists to ROcto on schedule
- Query metered usage: `SELECT tenant_id, metric, SUM(value) FROM metering_hourly WHERE ...`
- Quota enforcement: middleware checks current-period totals against tenant plan limits
