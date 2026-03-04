# Phase 284 - NOTES: SaaS Billing / Metering

## Design Decisions

### Provider-Agnostic Interface

The BillingProvider interface abstracts all billing operations so the system
is not locked to any single vendor. The mock provider enables zero-config
development; the Lago provider targets self-hosted OSS billing.

### In-Memory Metering

Metering uses an in-memory counter store for hot-path performance. Counters
are periodically flushed to the billing provider. This matches the established
pattern from imaging worklist (Phase 23) and telehealth rooms (Phase 30).

### Mock Plans

The 4 built-in mock plans (free/starter/professional/enterprise) align with
the PlanTier enum already present in module-repo.ts and the ADR-OSS-BILLING
architecture decision. Prices are placeholder values.

### Lago REST API v1

The Lago adapter uses vanilla Node.js fetch (no npm deps) against the REST
API v1. This follows the zero-dependency principle from analytics-etl.ts
(Phase 25D) and the PgSimpleClient pattern.

## AGENTS.md Additions

177. **`BILLING_PROVIDER` env var selects mock or lago (Phase 284).**
     Default is `"mock"`. Set to `"lago"` with valid `LAGO_API_URL` and
     `LAGO_API_KEY` to connect to self-hosted Lago. The mock provider has
     4 built-in plans and in-memory stores that reset on restart.
178. **Metering counters are in-memory with periodic flush (Phase 284).**
     `incrementMeter()` is synchronous for hot-path. `flushMeters()` sends
     accumulated counts to the billing provider. Flush interval defaults
     to 60s (`METERING_FLUSH_INTERVAL_MS`). Max 10K tenants guard.
179. **Billing admin routes are under `/admin/billing/*` (Phase 284).**
     All 11 endpoints require admin auth via AUTH_RULES catch-all.
     Plans are read from the billing provider; subscriptions and usage
     are per-tenant.
