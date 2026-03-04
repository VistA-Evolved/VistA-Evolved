# Phase 36 VERIFY -- Production Observability & Reliability

## Verification Gates

### Infrastructure (6 gates)

1. `services/observability/docker-compose.yml` exists and is valid YAML
2. Contains otel-collector service
3. Contains jaeger service (v2+)
4. Contains prometheus service
5. `services/observability/otel-collector-config.yaml` exists
6. `services/observability/prometheus.yml` exists with scrape config

### OTel Tracing (8 gates)

7. `apps/api/src/telemetry/tracing.ts` exists
8. OTel SDK initialization exported
9. OTLP HTTP exporter configured
10. Fastify instrumentation present
11. Net/HTTP instrumentation present
12. PHI-safe: no patient data in span attributes
13. Graceful tracing shutdown on SIGTERM
14. Env var `OTEL_ENABLED` gates activation

### Metrics (8 gates)

15. `apps/api/src/telemetry/metrics.ts` exists
16. prom-client Registry used
17. HTTP request duration histogram defined
18. RPC call duration histogram defined
19. Error counter by category defined
20. `/metrics/prometheus` returns Prometheus exposition format
21. No PHI in metric labels
22. Process metrics (memory, CPU, event loop) collected

### Reliability (6 gates)

23. Graceful shutdown has drain timeout (30s)
24. Circuit breaker state exposed in /ready
25. X-Trace-Id response header set
26. Trace ID propagated to structured logs
27. AbortController timeout on RPC socket operations
28. /health includes SLO-relevant fields

### k6 Smoke Suite (5 gates)

29. `tests/k6/smoke-login.js` exists
30. `tests/k6/smoke-reads.js` exists
31. `tests/k6/smoke-write.js` exists
32. Scripts have thresholds defined
33. Run wrapper script exists

### Docs (4 gates)

34. `docs/runbooks/phase36-observability-reliability.md` exists
35. AGENTS.md has Phase 36 notes
36. Runbook covers OTel + Prometheus + Jaeger setup
37. Runbook covers k6 smoke suite

### Integration (5 gates)

38. No console.log added (structured logger only)
39. No hardcoded secrets in Phase 36 files
40. TypeScript compiles clean
41. Phase 35 regression passes
42. verify-latest.ps1 delegates to Phase 36

## Run

```powershell
.\scripts\verify-latest.ps1 -SkipDocker -SkipPlaywright -SkipE2E
```
