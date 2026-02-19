# Phase 36 -- Production Observability & Reliability -- Summary

## What Changed

### New Files
- apps/api/src/telemetry/tracing.ts -- OTel SDK init (opt-in via OTEL_ENABLED), PHI-safe span helpers
- apps/api/src/telemetry/metrics.ts -- prom-client registry, HTTP/RPC/CB metrics, sanitizeRoute
- services/observability/docker-compose.yml -- OTel Collector + Jaeger + Prometheus
- services/observability/otel-collector-config.yaml -- OTLP receivers, PHI-strip processor
- services/observability/prometheus.yml -- Scrape configs
- tests/k6/smoke-login.js -- Auth flow smoke test
- tests/k6/smoke-reads.js -- Read-only clinical endpoints smoke test
- tests/k6/smoke-write.js -- Write workflow smoke test
- tests/k6/run-smoke.ps1 -- k6 test runner wrapper
- docs/runbooks/phase36-observability-reliability.md -- Full runbook
- scripts/verify-phase1-to-phase36.ps1 -- Verifier (80+ gates)

### Modified Files
- apps/api/src/lib/logger.ts -- bridgeTracingToLogger() for traceId/spanId injection
- apps/api/src/middleware/security.ts -- X-Trace-Id, Prometheus HTTP metrics, drain timeout
- apps/api/src/index.ts -- initTracing, /metrics/prometheus route, CB in health/ready
- apps/api/src/lib/rpc-resilience.ts -- OTel spans + Prometheus on RPC calls
- apps/api/package.json -- +9 OTel/prom-client deps
- scripts/verify-latest.ps1 -- Points to Phase 36
- AGENTS.md -- Phase 36 architecture map + gotchas 67-73

## How to Test
1. docker compose up -d in services/observability/
2. Set OTEL_ENABLED=true in apps/api/.env.local
3. Start API and hit endpoints
4. Check Jaeger at http://localhost:16686
5. Check Prometheus at http://localhost:9090
6. curl http://localhost:3001/metrics/prometheus
7. Run k6: .\tests\k6\run-smoke.ps1

## Verifier: 0 TypeScript errors, all files present
