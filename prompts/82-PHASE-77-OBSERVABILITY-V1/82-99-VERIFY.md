# Phase 77 — VERIFY: Observability + Reliability v1

## Verification Protocol

Run `scripts/verify-phase77-observability.ps1` — 67+ gates.

## Gate Categories

### A. Correlation ID Gates (10 gates)

1. `apps/web/src/lib/fetch-with-correlation.ts` exists
2. fetch-with-correlation exports `correlatedFetch`
3. fetch-with-correlation generates `X-Request-Id` header
4. `apps/web/src/lib/api.ts` imports from fetch-with-correlation
5. `apps/web/src/stores/data-cache.tsx` imports from fetch-with-correlation
6. API security.ts reads `x-request-id` from request
7. API security.ts sets `X-Request-Id` on response
8. API security.ts sets `X-Trace-Id` on response
9. API error handler includes requestId in error responses
10. Logger includes requestId in log entries

### B. Tracing Gates (12 gates)

11. `apps/api/src/telemetry/spans.ts` exists
12. spans.ts exports `withSpan`
13. spans.ts exports `spanBusinessAction`
14. spans.ts imports from tracing.ts
15. spans.ts does NOT contain PHI field names in attributes
16. tracing.ts has `initTracing()`
17. tracing.ts has `shutdownTracing()`
18. tracing.ts has `startRpcSpan()`
19. tracing.ts has `endRpcSpan()`
20. tracing.ts has `getCurrentTraceId()`
21. index.ts calls `initTracing()`
22. index.ts calls `bridgeTracingToLogger()`

### C. Metrics + SLO Gates (15 gates)

23. metrics.ts has `http_request_duration_seconds` histogram
24. metrics.ts has `http_requests_total` counter
25. metrics.ts has `vista_rpc_call_duration_seconds` histogram
26. metrics.ts has `vista_rpc_calls_total` counter
27. metrics.ts has `circuit_breaker_state` gauge
28. metrics.ts has `sanitizeRoute()` function
29. metrics.ts has `getPrometheusMetrics()` export
30. metrics.ts exports SLO recording function
31. metrics.ts has SLO latency gauge
32. metrics.ts has SLO error budget gauge
33. `/metrics` endpoint in AUTH_RULES bypass list
34. `/metrics/prometheus` endpoint in AUTH_RULES bypass list
35. `config/performance-budgets.json` exists with apiLatencyBudgets
36. `config/performance-budgets.json` has vistaRpcBudgets
37. `config/performance-budgets.json` has loadTestThresholds

### D. PHI-Safe Telemetry Gates (15 gates)

38. phi-redaction.ts exports `CREDENTIAL_FIELDS`
39. phi-redaction.ts exports `PHI_FIELDS`
40. phi-redaction.ts exports `ALL_BLOCKED_FIELDS`
41. phi-redaction.ts exports `assertNoPhiInAttributes`
42. Logger redacts all CREDENTIAL_FIELDS
43. Logger redacts all PHI_FIELDS
44. Logger applies INLINE_REDACT_PATTERNS
45. spans.ts never sets attribute with PHI field name
46. metrics.ts never uses PHI field as label
47. tracing.ts request hooks are no-ops (PHI-safe)
48. No `ssn` in any telemetry file
49. No `dateofbirth` in any telemetry file
50. No `patientname` in any telemetry file
51. No `socialsecuritynumber` in any telemetry file
52. sanitizeRoute() strips numeric segments and UUIDs

### E. Observability Config Gates (8 gates)

53. `apps/api/src/config/observability-config.ts` exists
54. Config exports sampling rate (default 1.0)
55. Config exports metric label allowlist
56. Config exports span attribute allowlist
57. Config PHI redaction cannot be disabled
58. Config reads env vars for overrides
59. Logger uses structured JSON format
60. Logger bridges OTel trace/span IDs

### F. Structural Integrity Gates (7+ gates)

61. No `/reports` directory exists at root
62. No `/docs/reports` directory exists
63. console.log count <= 6 across codebase
64. No hardcoded PROV123 outside login page
65. prompts/82-PHASE-77-OBSERVABILITY-V1/ exists
66. 77-01-IMPLEMENT.md exists
67. 77-99-VERIFY.md exists
68. verify-latest.ps1 delegates to Phase 77
69. docs/runbooks/phase77-observability-reliability.md exists

## Evidence Artifacts

Written to `artifacts/phase77/`:

- `telemetry-inventory.json` — all telemetry files, metrics, spans
- `phi-telemetry-scan.json` — PHI field scan results
- `perf-budget-enforcement.json` — budget validation results
- `gate-results.json` — all gate pass/fail results

## Run Command

```powershell
.\scripts\verify-phase77-observability.ps1
```
