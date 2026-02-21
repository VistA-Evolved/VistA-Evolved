# Phase 77 — Observability + Reliability v1

## Overview

Phase 77 builds on Phase 36's OTel/Prometheus foundation to close remaining
gaps: web-side correlation ID propagation, business action span helpers,
SLO budget tracking, PHI-in-telemetry runtime guards, and an observability
configuration consolidation.

## Architecture

```
Browser (Next.js)
  └── fetch-with-correlation.ts ──── X-Request-Id header ────┐
                                                              │
API (Fastify)                                                 ▼
  ├── security.ts ──── reads/generates X-Request-Id ──────────┤
  │                    sets X-Request-Id + X-Trace-Id response │
  ├── logger.ts ──── requestId + traceId + spanId in every log │
  ├── tracing.ts ──── OTel SDK (OTLP HTTP exporter) ──────────┤
  ├── spans.ts ──── business action spans (PHI-safe) ──────────┤
  ├── metrics.ts ──── prom-client + SLO gauges ────────────────┤
  ├── phi-redaction.ts ──── runtime PHI guard ─────────────────┘
  └── observability-config.ts ──── central config
```

## Correlation ID Flow

1. **Web client** generates `X-Request-Id` via `crypto.randomUUID()` in
   `fetch-with-correlation.ts`
2. **API** reads `x-request-id` from request header (or generates one if missing)
3. **API** stores it on `request.requestId` and in `AsyncLocalStorage`
4. **Logger** includes `requestId` in every structured log entry
5. **OTel spans** include `request.id` attribute via `spans.ts`
6. **API** returns `X-Request-Id` and `X-Trace-Id` in response headers
7. **Web client** receives both IDs for debugging/support

## Key Components

### `apps/web/src/lib/fetch-with-correlation.ts` (NEW)
- `correlatedFetch<T>(path, opts)` — full fetch with correlation
- `correlatedGet<T>(path)` — GET shorthand (drops into `api.ts`)
- `correlatedPost<T>(path, body)` — POST shorthand
- `CorrelatedError` — Error class with correlationId + traceId

### `apps/api/src/telemetry/spans.ts` (NEW)
- `withSpan(name, attrs, fn)` — async context manager
- `withSpanSync(name, attrs, fn)` — sync context manager
- `spanBusinessAction(name, attrs)` — generic span factory
- `spanModuleToggle(module, action)` — module lifecycle span
- `spanRcmOperation(op, claimId)` — RCM claim lifecycle span
- `spanImagingOperation(op, studyUid)` — imaging span
- `spanSchedulingOperation(op)` — scheduling span
- `endBusinessSpan(span, error?)` — safe span closer

### `apps/api/src/config/observability-config.ts` (NEW)
- `OBSERVABILITY_CONFIG` — sampling rate, allowlists, SLO config
- `getLatencyBudget(category, operation)` — budget lookup
- `isWithinLatencyBudget(category, operation, durationMs)` — budget check
- `getRpcBudgets()` — VistA RPC timeout budgets
- `getAllLatencyBudgets()` — full budget map for evidence

### `apps/api/src/telemetry/metrics.ts` (ENHANCED)
- `sloLatencyWithinBudget` gauge — % requests within p95 budget
- `sloErrorBudgetRemaining` gauge — remaining error budget
- `recordSloSample(category, durationMs, isError, p95Budget?)` — SLO recorder

### `apps/api/src/lib/phi-redaction.ts` (ENHANCED)
- `assertNoPhiInAttributes(attrs)` — runtime PHI guard for spans
- `assertNoPhiInMetricLabels(labels)` — PHI guard for metric labels

## PHI Safety

1. **Logger**: Deep-redacts 40+ blocked fields + 7 inline patterns
2. **Spans**: `assertNoPhiInAttributes()` throws if PHI key detected
3. **Metrics**: `sanitizeRoute()` strips UUIDs and numeric segments
4. **Tracing**: Request/response hooks are no-ops (no body capture)
5. **Config**: `phiRedactionEnabled: true as const` — cannot be disabled

## Env Vars

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_ENABLED` | `false` | Enable OTel tracing |
| `OTEL_SAMPLING_RATE` | `1.0` | Head-based sampling rate (0.0-1.0) |
| `SLO_ERROR_BUDGET` | `0.001` | Max error rate before budget exhaustion |
| `SLO_WINDOW_MS` | `3600000` | SLO evaluation window (1 hour) |

## Verification

```powershell
.\scripts\verify-phase77-observability.ps1
```

69 gates across 6 categories:
- A: Correlation ID (10 gates)
- B: Tracing (12 gates)
- C: Metrics + SLO (15 gates)
- D: PHI-Safe Telemetry (15 gates)
- E: Observability Config (8 gates)
- F: Structural Integrity (9 gates)

## Manual Testing

1. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Make a request: `curl -v http://127.0.0.1:3001/health`
3. Verify `X-Request-Id` header in response
4. Verify `X-Trace-Id` header in response (when OTEL_ENABLED=true)
5. Check logs include `requestId` field
6. Check `/metrics/prometheus` for SLO gauges
