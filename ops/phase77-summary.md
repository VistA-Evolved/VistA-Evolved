# Phase 77 — Observability + Reliability v1 — Summary

## What Changed

### New Files
- `apps/web/src/lib/fetch-with-correlation.ts` — Web-side fetch wrapper with
  automatic `X-Request-Id` generation, `credentials: 'include'`, and
  correlation context in errors
- `apps/api/src/telemetry/spans.ts` — Business action span helpers (`withSpan`,
  `spanBusinessAction`, `spanModuleToggle`, `spanRcmOperation`, etc.) with
  runtime PHI guard
- `apps/api/src/config/observability-config.ts` — Centralized observability
  config (sampling, label/attribute allowlists, SLO targets, PHI redaction)
- `scripts/verify-phase77-observability.ps1` — 69-gate verifier
- `docs/runbooks/phase77-observability-reliability.md` — Runbook
- `prompts/82-PHASE-77-OBSERVABILITY-V1/77-01-IMPLEMENT.md` — Implementation prompt
- `prompts/82-PHASE-77-OBSERVABILITY-V1/77-99-VERIFY.md` — Verification prompt

### Modified Files
- `apps/web/src/lib/api.ts` — Now uses `correlatedGet` from fetch-with-correlation
- `apps/web/src/stores/data-cache.tsx` — Now uses `correlatedGet` from fetch-with-correlation
- `apps/api/src/telemetry/metrics.ts` — Added SLO gauges (`slo_latency_within_budget`,
  `slo_error_budget_remaining`) and `recordSloSample()` function
- `apps/api/src/lib/phi-redaction.ts` — Added `assertNoPhiInAttributes()` and
  `assertNoPhiInMetricLabels()` runtime guards
- `scripts/verify-latest.ps1` — Delegates to Phase 77

## How to Test Manually
1. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. `curl -v http://127.0.0.1:3001/health` — check `X-Request-Id` in response
3. `curl http://127.0.0.1:3001/metrics/prometheus` — check for SLO gauges
4. Start web: `cd apps/web && pnpm dev` — verify fetch calls include X-Request-Id

## Verifier Output
```
Phase 77 Verifier -- RESULTS
  PASS: 69 / 69
  FAIL: 0 / 69
ALL 69 GATES PASSED
```

## Follow-ups
- Wire `recordSloSample()` into the onResponse hook for live SLO tracking
- Add business action spans to route handlers (module toggle, RCM submit, etc.)
- Add alerting rules based on `slo_error_budget_remaining` dropping below threshold
