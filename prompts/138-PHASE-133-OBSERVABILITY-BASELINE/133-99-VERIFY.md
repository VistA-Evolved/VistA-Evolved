# Phase 133 -- VERIFY (Enterprise Observability Baseline)

## Gates

1. `X-Correlation-Id` header present on all API responses
2. `X-Request-Id` header present on all API responses
3. `X-Trace-Id` header present when OTEL_ENABLED=true
4. `/metrics/prometheus` returns Prometheus text format
5. Metric `http_request_duration_seconds` exists with route label
6. Metric `http_requests_total` exists with route label
7. Metric `db_pool_in_use` exists
8. Metric `db_query_duration_seconds` exists
9. Metric `audit_events_total` exists
10. `recordSloSample()` wired into onResponse hook
11. `slo_latency_within_budget` metric populated after requests
12. PG instrumentation enabled in OTel config
13. Console exporter available in dev mode
14. No PHI in /metrics/prometheus output
15. CI gate `g15-observability.mjs` exists and validates required metrics
16. G15 included in RC gauntlet suite
17. TypeScript clean (api, web, portal)
18. Gauntlet rc passes
19. No regressions in existing endpoints
