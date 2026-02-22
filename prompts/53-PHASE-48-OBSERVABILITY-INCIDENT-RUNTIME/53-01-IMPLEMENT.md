# Phase 48 — Observability + Incident-Ready Runtime

## User Request
Add operational telemetry and safety controls without leaking PHI:
- Structured logging with central redaction
- RCM/connector/pipeline Prometheus metrics
- Trace ID propagation through audit and connector calls
- Connector circuit breakers with timeout/retry
- Unified audit query across all 3 audit stores
- Runbooks for observability, incident response, log redaction policy

## Implementation Steps

### A: Structured Logging + Redaction
1. Create `apps/api/src/lib/phi-redaction.ts` — single source of truth for all PHI/PII field blocklists
2. Update logger.ts to import from phi-redaction.ts
3. Add `checkLogFieldBlocklist()` — build-time/CI-time PHI lint check script

### B: Metrics
1. Add to `telemetry/metrics.ts`: RCM claim counters, EDI pipeline depth gauge, connector health/latency
2. Wire pipeline and connector metrics in routes/stores

### C: Tracing
1. Add traceId to audit entries in immutable-audit.ts
2. Add connector span helpers to tracing.ts

### D: Circuit Breakers + Timeouts
1. Create `apps/api/src/rcm/connectors/connector-resilience.ts` — CB + timeout + retry for connector calls

### E: Unified Audit Stream
1. Create `apps/api/src/lib/unified-audit.ts` — query across all 3 audit stores

### F: Docs
1. `docs/runbooks/observability.md`
2. `docs/runbooks/incident-response.md`
3. `docs/runbooks/log-redaction-policy.md`

## Verification
- tsc --noEmit clean
- vitest run all pass
- check scripts pass

## Files Touched
- apps/api/src/lib/phi-redaction.ts (new)
- apps/api/src/lib/unified-audit.ts (new)
- apps/api/src/rcm/connectors/connector-resilience.ts (new)
- apps/api/src/telemetry/metrics.ts (modified)
- apps/api/src/lib/logger.ts (modified — import from phi-redaction)
- apps/api/src/lib/immutable-audit.ts (modified — traceId field)
- scripts/check-phi-fields.ts (new — CI lint gate)
- docs/runbooks/observability.md (new)
- docs/runbooks/incident-response.md (new)
- docs/runbooks/log-redaction-policy.md (new)
