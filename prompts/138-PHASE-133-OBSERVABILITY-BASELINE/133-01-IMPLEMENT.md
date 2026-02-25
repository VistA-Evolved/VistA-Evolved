# Phase 133 -- IMPLEMENT (Enterprise Observability Baseline)

## User Request
Add production-grade observability: request correlation, OTel tracing with PG spans,
golden-signal metrics, SLO wiring, and a CI gate.

## Implementation Steps

### A) Correlation Middleware Enhancement
- Add `X-Correlation-Id` response header (= requestId, already generated)
- Propagate correlationId into audit events automatically
- Propagate traceId to log context (already done via bridgeTracingToLogger)

### B) OpenTelemetry Wiring Enhancement
- Enable `@opentelemetry/instrumentation-pg` in auto-instrumentation config
- Add console exporter for dev mode (when OTEL_ENABLED=true but no collector)
- HTTP client spans already covered by `@opentelemetry/instrumentation-http`

### C) Metrics Enhancement
- Add `db_pool_in_use` gauge (pool totalCount - idleCount)
- Add `db_query_duration_seconds` histogram
- Add `audit_events_total` counter
- Wire periodic pool stats collection

### D) SLO Wiring
- Wire `recordSloSample()` into security.ts onResponse hook
- Add `SLO_P95_BUDGET_MS` env var config (default 500ms)
- Expose SLO config

### E) CI Gate
- Create `qa/gauntlet/gates/g15-observability.mjs`
- Add G15 to RC suite in cli.mjs
- Validates /metrics/prometheus has required metric names
- Validates X-Correlation-Id header on responses

## Files Touched
- `apps/api/src/telemetry/tracing.ts` -- add PG instrumentation + console exporter
- `apps/api/src/telemetry/register.ts` -- add PG instrumentation + console exporter
- `apps/api/src/telemetry/metrics.ts` -- add db_pool_in_use, db_query_duration, audit_events_total
- `apps/api/src/middleware/security.ts` -- add X-Correlation-Id header + SLO wiring
- `apps/api/src/lib/audit.ts` -- auto-inject correlationId from request context
- `apps/api/src/index.ts` -- wire pool stats collection
- `qa/gauntlet/gates/g15-observability.mjs` -- CI gate
- `qa/gauntlet/cli.mjs` -- add G15 to RC suite
- `docs/runbooks/observability.md` -- single runbook

## Verification
- See 133-99-VERIFY.md
