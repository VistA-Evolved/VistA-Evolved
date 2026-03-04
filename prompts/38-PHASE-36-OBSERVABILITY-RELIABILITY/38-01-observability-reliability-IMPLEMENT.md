# Phase 36 IMPLEMENT -- Production Observability & Reliability

## User Request

Implement production-grade observability + reliability without leaking PHI:

- Tracing (OpenTelemetry + Jaeger v2)
- Metrics (/metrics, Prometheus scraping)
- Structured logs with correlation IDs (already have; bridge to OTel)
- Timeouts/circuit breakers around RPC calls (already have; harden)
- Load testing smoke suite (k6)
- SLO-ready health checks + runbooks

## Inventory (Pre-Implementation)

### What Exists

- Custom structured JSON logger (`lib/logger.ts`) with request ID via `AsyncLocalStorage`
- `/health`, `/ready`, `/version`, `/metrics` (JSON-only, no Prometheus format)
- Circuit breaker in `rpc-resilience.ts` (5 failures -> open, 30s half-open)
- Per-RPC timeout (15s), exponential retry (2 max), async mutex
- Graceful shutdown (SIGINT/SIGTERM -> server.close -> disconnectRpcBroker)
- Per-RPC metrics: calls, successes, failures, timeouts, p95 (in-memory)

### Gaps

- No Prometheus exposition format (`text/plain; version=0.4.0`)
- No OpenTelemetry SDK / distributed tracing / OTLP export
- No Jaeger, Prometheus, or OTel Collector containers
- No trace ID / span ID propagation in logs or response headers
- No load/smoke test suite
- No drain timeout on graceful shutdown (could hang indefinitely)
- No SLO-based alerting rules

## Implementation Steps

### Step 0: Prompt capture

- Create `prompts/38-PHASE-36-OBSERVABILITY-RELIABILITY/`
- This file + verify file

### Step 1: Infra (Docker Compose)

- `services/observability/docker-compose.yml`:
  - otel-collector (otel/opentelemetry-collector-contrib)
  - jaeger (jaegertracing/jaeger:2)
  - prometheus (prom/prometheus)
- `services/observability/otel-collector-config.yaml`
- `services/observability/prometheus.yml`

### Step 2: API Instrumentation

- Install: `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`,
  `@opentelemetry/exporter-trace-otlp-http`, `prom-client`
- `apps/api/src/telemetry/tracing.ts`: OTel SDK setup, auto-instrument Fastify + net
- `apps/api/src/telemetry/metrics.ts`: prom-client registry, HTTP + RPC histograms
- Bridge: inject traceId/spanId into logger output
- Route: `/metrics/prometheus` -> Prometheus exposition format
- Response headers: `X-Trace-Id`

### Step 3: Reliability Hardening

- Add graceful shutdown drain timeout (30s max)
- Ensure circuit breaker + timeout cover all RPC paths
- Add explicit `AbortController` timeout on RPC socket operations
- Health check: include VistA probe + circuit breaker state + OTel status

### Step 4: k6 Smoke Suite

- `tests/k6/smoke-login.js`
- `tests/k6/smoke-reads.js` (patient search, demographics, allergies, vitals, meds)
- `tests/k6/smoke-write.js` (add allergy -- may fail on sandbox, that's OK)
- `tests/k6/run-smoke.sh` (wrapper)

### Step 5: Docs

- `docs/runbooks/phase36-observability-reliability.md`
- Update AGENTS.md

### Step 6: Verifier

- `scripts/verify-phase1-to-phase36.ps1`
- Update `scripts/verify-latest.ps1`

## Files Touched

- `apps/api/package.json` (new deps)
- `apps/api/src/index.ts` (tracing init, /metrics/prometheus route)
- `apps/api/src/telemetry/tracing.ts` (new)
- `apps/api/src/telemetry/metrics.ts` (new)
- `apps/api/src/lib/logger.ts` (bridge traceId)
- `apps/api/src/lib/rpc-resilience.ts` (span instrumentation)
- `apps/api/src/middleware/security.ts` (drain timeout, X-Trace-Id header)
- `services/observability/docker-compose.yml` (new)
- `services/observability/otel-collector-config.yaml` (new)
- `services/observability/prometheus.yml` (new)
- `tests/k6/smoke-login.js` (new)
- `tests/k6/smoke-reads.js` (new)
- `tests/k6/smoke-write.js` (new)
- `tests/k6/run-smoke.sh` (new)
- `docs/runbooks/phase36-observability-reliability.md` (new)
- `scripts/verify-phase1-to-phase36.ps1` (new)
- `scripts/verify-latest.ps1` (update pointer)

## Verification

Run `scripts/verify-latest.ps1 -SkipDocker` and confirm all Phase 36 gates pass.
