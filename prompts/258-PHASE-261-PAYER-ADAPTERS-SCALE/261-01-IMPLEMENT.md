# Phase 261 — Payer Adapters at Scale — IMPLEMENT

## Phase ID

261 (Wave 8, P5)

## Title

Payer Adapters at Scale

## Goal

Formalize the PayerAdapter SDK with a base class, per-adapter rate limiting,
idempotency, metrics collection, and a sandbox test harness so new payer
adapters can be built, tested, and deployed consistently.

## Inventory (before editing)

- `apps/api/src/rcm/adapters/payer-adapter.ts` — PayerAdapter interface (Phase 69)
- `apps/api/src/rcm/adapters/sandbox-adapter.ts` — Sandbox adapter
- `apps/api/src/rcm/adapters/x12-adapter.ts` — X12 adapter
- `apps/api/src/rcm/adapters/philhealth-adapter.ts` — PhilHealth adapter
- `apps/api/src/rcm/connectors/connector-resilience.ts` — Circuit breaker + retry
- `apps/api/src/rcm/connectors/connector-state.ts` — 4-state FSM
- `apps/api/src/rcm/connectors/connector-health.ts` — Health monitor
- 14 connector files total, 4 adapter files total

## Implementation Steps

1. Create `apps/api/src/rcm/adapters/adapter-sdk.ts`:
   - AdapterRateLimiter — per-tenant hourly windows
   - AdapterIdempotencyStore — SHA-256 keyed, TTL, FIFO eviction
   - AdapterMetricsCollector — call/success/fail/rateLimit/idemp counters
   - BasePayerAdapter — abstract class with opt-in rate limit, idempotency, metrics
   - SANDBOX_TEST_CASES — 7 pre-built test scenarios
2. Create `apps/api/src/routes/adapter-sdk-routes.ts`:
   - GET /rcm/sdk/adapters — list registered payer adapters
   - GET /rcm/sdk/connectors — list registered connectors
   - GET /rcm/sdk/test-cases — list sandbox test cases
   - POST /rcm/sdk/test-cases/run — run sandbox test harness
   - GET /rcm/sdk/rate-limits — rate limit status
   - GET /rcm/sdk/capabilities — adapter capabilities summary
3. Create test file `apps/api/tests/payer-adapter-sdk.test.ts`
4. Create verifier `scripts/verify-phase261-payer-adapters-scale.ps1`
5. Create prompt files

## Files Touched

- `apps/api/src/rcm/adapters/adapter-sdk.ts` (NEW)
- `apps/api/src/routes/adapter-sdk-routes.ts` (NEW)
- `apps/api/tests/payer-adapter-sdk.test.ts` (NEW)
- `scripts/verify-phase261-payer-adapters-scale.ps1` (NEW)

## Key Decisions

- BasePayerAdapter is opt-in (abstract, not forced on existing adapters)
- Rate limiter is per-tenant per-hour (matches payer API patterns)
- Idempotency uses SHA-256 of adapter + operation + payload
- Sandbox test harness is admin-only
- Existing adapter infrastructure is NOT modified
