# Phase 263 — Wave 8 Integrity Audit VERIFY

## Verification Gates

### Gate 1: TypeScript Build Clean

```powershell
cd apps/api; npx tsc --noEmit 2>&1 | Select-String "error TS"
# Expected: empty (zero errors)
```

### Gate 2: Wave 8 Tests Pass

```powershell
pnpm -C apps/api test -- --run "tests/support-toolkit-v2.test.ts" `
  "tests/data-portability.test.ts" "tests/sat-suite.test.ts" `
  "tests/hl7-pipeline.test.ts"
# Expected: 4 passed, 0 failed
```

### Gate 3: Route Registration

All 8 Wave 8 route plugins registered in register-routes.ts:

- hl7TenantEndpointRoutes
- hl7PipelineRoutes
- hl7UseCaseRoutes
- adapterSdkRoutes
- onboardingIntegrationRoutes
- supportToolkitV2Routes
- dataPortabilityRoutes
- satRoutes

### Gate 4: Store Policy Valid Types

No `"operational"`, `"reference"`, or `"in_memory"` in store-policy.ts.
Only valid StoreClassification: critical, cache, rate_limiter, registry, audit, dev_only.
Only valid DurabilityStatus: pg_backed, jsonl_backed, file_seeded, vista_passthrough, in_memory_only, env_gated.

### Gate 5: No Parametric Collision

All routes under `/admin/support/tickets/:param/` use `:id` (not `:ticketId`).

## Results: 5/5 PASS
