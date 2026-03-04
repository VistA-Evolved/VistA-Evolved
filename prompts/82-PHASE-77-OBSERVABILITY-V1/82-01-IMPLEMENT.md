# Phase 77 — OBSERVABILITY + RELIABILITY v1

## Mission

Production-grade observability without PHI leaks: correlation IDs, enhanced
tracing, metrics SLO gates, PHI-safe logging enforcement, perf budget gates.

## User Request

> Phase 77: OBSERVABILITY + RELIABILITY v1 (TRACING, METRICS, LOG CORRELATION, PERF SLO GATES)

## Definition of Done

- (A) Every API request has correlationId surfaced to client via X-Request-Id
- (B) OTel traces for key flows (RPC, business actions, module toggle)
- (C) Metrics: p50/p95 latency, error rate, RPC latency, SLO budget
- (D) "No PHI in telemetry" gate that FAILS if PHI keys appear
- (E) Perf budgets enforced (from config/performance-budgets.json)
- (F) verify-latest + reality click-audit pass

## Non-Negotiables

- No /reports folders
- No PHI in telemetry (spans, metrics labels, logs)
- Integrate with module registry
- Sampling + redaction required
- Verifier with 67+ gates

## Implementation Steps

### Step 0 — Prompt Files

Create `prompts/82-PHASE-77-OBSERVABILITY-V1/77-01-IMPLEMENT.md` and
`prompts/82-PHASE-77-OBSERVABILITY-V1/77-99-VERIFY.md`.

### Step 1 — Web-Side Correlation ID Propagation

- Create `apps/web/src/lib/fetch-with-correlation.ts`
  - Generates `X-Request-Id` via `crypto.randomUUID()`
  - Attaches to every outbound request
  - Reads response correlation ID
  - Always includes `credentials: 'include'`
- Wire into centralized fetch functions:
  - `apps/web/src/lib/api.ts` — `get()` function
  - `apps/web/src/stores/data-cache.tsx` — `fetchJSON()` function

### Step 2 — Enhanced OTel Span Instrumentation

- Create `apps/api/src/telemetry/spans.ts`
  - `withSpan(name, attrs, fn)` — context manager for any async op
  - `spanModuleToggle(module, action)` — module enable/disable
  - `spanRcmOperation(op, claimId)` — RCM claim lifecycle
  - `spanBusinessAction(name, attrs)` — generic non-RPC span
  - All attributes are PHI-safe (no patient names, SSN, etc.)
  - Auto-attaches requestId from AsyncLocalStorage

### Step 3 — Observability Config

- Create `apps/api/src/config/observability-config.ts`
  - Head-based sampling rate (env: `OTEL_SAMPLING_RATE`, default 1.0)
  - SLO targets imported from `config/performance-budgets.json`
  - PHI redaction mode (always on, cannot be disabled)
  - Metric label allowlist (route, method, status — no patient data)
  - Span attribute allowlist (rpcName, duz, module — no PHI)

### Step 4 — SLO Helpers in Metrics

- Add to `apps/api/src/telemetry/metrics.ts`:
  - `sloLatencyWithinBudget` gauge — tracks % of requests within p95 budget
  - `sloErrorBudgetRemaining` gauge — tracks error budget remaining
  - `recordSloSample(route, durationMs, isError)` — records a sample
  - Reads budgets from `config/performance-budgets.json`

### Step 5 — PHI-in-Telemetry Guard

- Add `assertNoPhiInAttributes(attrs)` to `apps/api/src/lib/phi-redaction.ts`
- Creates a function that throws if any attribute key matches PHI fields
- Used by span helpers as runtime guard
- Verified by CI/verifier gate

### Step 6 — Verifier

- Create `scripts/verify-phase77-observability.ps1` with 67+ gates
- Update `scripts/verify-latest.ps1` to delegate to Phase 77

### Step 7 — Docs

- Create `docs/runbooks/phase77-observability-reliability.md`

## Files Touched

- `apps/web/src/lib/fetch-with-correlation.ts` (NEW)
- `apps/web/src/lib/api.ts` (EDIT — use correlation fetch)
- `apps/web/src/stores/data-cache.tsx` (EDIT — use correlation fetch)
- `apps/api/src/telemetry/spans.ts` (NEW)
- `apps/api/src/config/observability-config.ts` (NEW)
- `apps/api/src/telemetry/metrics.ts` (EDIT — add SLO helpers)
- `apps/api/src/lib/phi-redaction.ts` (EDIT — add telemetry guard)
- `scripts/verify-phase77-observability.ps1` (NEW)
- `scripts/verify-latest.ps1` (EDIT — delegate to Phase 77)
- `docs/runbooks/phase77-observability-reliability.md` (NEW)
- `prompts/82-PHASE-77-OBSERVABILITY-V1/77-01-IMPLEMENT.md` (NEW)
- `prompts/82-PHASE-77-OBSERVABILITY-V1/77-99-VERIFY.md` (NEW)
