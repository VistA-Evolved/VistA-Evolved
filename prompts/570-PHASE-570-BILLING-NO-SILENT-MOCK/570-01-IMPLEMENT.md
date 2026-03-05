# Phase 570 -- Billing Must Never Silently Run as Mock Outside Dev/Test

## User Request

Billing must never silently run as mock outside dev/test.

Requirements:

1. If `PLATFORM_RUNTIME_MODE` is rc|prod (or `NODE_ENV=production`), and
   provider resolves to mock: FAIL FAST at startup with a clear error message.
   In dev/test, allow mock but log a loud warning.
2. Expand `/admin/billing/health`: return provider name,
   `configuredForProduction` true/false, explicit warnings if mock.
3. Update README or a billing runbook with "dev vs demo vs prod" rules.

Do NOT weaken tests. If tests need env defaults, make them explicit.

## Inventory (existing state)

### Requirement 1 -- ALREADY SATISFIED

`apps/api/src/billing/index.ts` contains:

- `isMockBillingForbidden()` checks NODE_ENV, PLATFORM_RUNTIME_MODE, DEPLOYMENT_STAGE
- `initBillingProvider()` throws at startup with `buildBillingConfigError()` if
  mock is resolved in rc/prod/demo/pilot
- dev/test mode logs a loud ASCII-art warning box

No code changes needed for requirement 1.

### Requirement 2 -- PARTIALLY SATISFIED, MINOR GAP

`apps/api/src/billing/billing-routes.ts` has `/billing/health` and `/admin/billing/health`.
Both delegate to `provider.healthCheck()` which returns `BillingHealthStatus`:

- `provider`: `"mock"` | `"lago"` -- already present
- `configuredForProduction`: boolean -- already present
- `details.warning`: string -- warning is buried in details object

Gap: No top-level `warnings` array. The health route doesn't add runtimeMode
or `isMockBillingForbidden()` context to the response.

### Requirement 3 -- ALREADY SATISFIED

`docs/runbooks/billing-provider-readiness.md` (119 lines) covers:

- Provider table (mock vs lago)
- Safety rules (mock blocked in non-dev)
- Environment configurations (dev, demo, prod)
- Health check examples and response shapes
- Troubleshooting table

## Implementation Steps

### A) Enrich `/billing/health` and `/admin/billing/health` response envelope

In `apps/api/src/billing/billing-routes.ts`:

1. Import `getRuntimeMode` from `../platform/runtime-mode.js`
2. Import `isMockBillingForbidden` from `../billing/index.js` (needs export)
3. Wrap the `healthCheck()` result with additional fields:
   - `runtimeMode`: current PLATFORM_RUNTIME_MODE value
   - `warnings`: string[] -- populated when provider is mock
   - `mockForbiddenInCurrentMode`: boolean from `isMockBillingForbidden()`

Example enriched response for mock in dev:

```json
{
  "ok": true,
  "provider": "mock",
  "healthy": true,
  "configuredForProduction": false,
  "runtimeMode": "dev",
  "mockForbiddenInCurrentMode": false,
  "warnings": [
    "Mock billing provider is active. NOT suitable for demo/pilot/production.",
    "Set BILLING_PROVIDER=lago for real billing."
  ],
  "details": { ... }
}
```

### B) Export `isMockBillingForbidden` from billing barrel

In `apps/api/src/billing/index.ts`:

- Add `export { isMockBillingForbidden }` to make it available to routes.

### C) Update runbook with explicit "dev vs demo vs prod" section header

In `docs/runbooks/billing-provider-readiness.md`:

- Add a section: `## Dev vs Demo vs Prod Rules` with a decision table
- Add the enriched health response examples

### D) No test changes required

The existing `initBillingProvider()` guard is already the enforcement mechanism.
Tests that use mock billing run with implicit `NODE_ENV=test` or
`PLATFORM_RUNTIME_MODE=dev`, so the guard never triggers.

## Files Touched

- `apps/api/src/billing/billing-routes.ts` -- enrich health response with warnings + runtimeMode
- `apps/api/src/billing/index.ts` -- export `isMockBillingForbidden`
- `docs/runbooks/billing-provider-readiness.md` -- add dev/demo/prod decision table
- `prompts/570-PHASE-570-BILLING-NO-SILENT-MOCK/` -- this prompt folder
