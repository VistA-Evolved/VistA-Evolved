# Phase 570 -- VERIFY: Billing Must Never Silently Run as Mock Outside Dev/Test

## Verification Steps

### Gate 1: initBillingProvider fails fast in rc/prod/demo/pilot

```powershell
$billing = Get-Content apps/api/src/billing/index.ts -Raw
if ($billing -match 'isMockBillingForbidden') { "PASS: mock guard function exists" } else { "FAIL" }
if ($billing -match "throw new Error") { "PASS: fail-fast throw exists" } else { "FAIL" }
```

### Gate 2: isMockBillingForbidden checks all 3 env vars

```powershell
if ($billing -match 'NODE_ENV.*production') { "PASS: checks NODE_ENV" } else { "FAIL" }
if ($billing -match 'PLATFORM_RUNTIME_MODE') { "PASS: checks runtime mode" } else { "FAIL" }
if ($billing -match 'DEPLOYMENT_STAGE') { "PASS: checks deploy stage" } else { "FAIL" }
```

### Gate 3: Dev/test mode logs loud warning for mock

```powershell
if ($billing -match 'WARNING.*MOCK billing provider') { "PASS: loud warning" } else { "FAIL" }
```

### Gate 4: isMockBillingForbidden is exported

```powershell
if ($billing -match 'export function isMockBillingForbidden') { "PASS: exported" } else { "FAIL" }
```

### Gate 5: /billing/health returns provider name

```powershell
$routes = Get-Content apps/api/src/billing/billing-routes.ts -Raw
if ($routes -match '/billing/health') { "PASS: health endpoint exists" } else { "FAIL" }
```

### Gate 6: BillingHealthStatus has configuredForProduction

```powershell
$types = Get-Content apps/api/src/billing/types.ts -Raw
if ($types -match 'configuredForProduction.*boolean') { "PASS" } else { "FAIL" }
```

### Gate 7: Health response includes warnings array

```powershell
if ($routes -match 'warnings') { "PASS: warnings in health response" } else { "FAIL" }
```

### Gate 8: Health response includes runtimeMode

```powershell
if ($routes -match 'runtimeMode') { "PASS: runtimeMode in health response" } else { "FAIL" }
```

### Gate 9: Billing runbook has dev/demo/prod rules

```powershell
$runbook = Get-Content docs/runbooks/billing-provider-readiness.md -Raw
if ($runbook -match 'Dev.*Demo.*Prod') { "PASS: runbook has dev/demo/prod section" } else { "FAIL" }
```

### Gate 10: TypeScript compiles

```powershell
pnpm -C apps/api exec tsc --noEmit 2>&1 | Select-Object -Last 5
```

### Gate 11: No test regressions

```powershell
pnpm test 2>&1 | Select-Object -Last 10
```

## Acceptance Criteria

- [ ] Mock billing is blocked at startup in rc/prod/demo/pilot environments
- [ ] Dev/test allows mock but logs a loud warning
- [ ] `/billing/health` returns: provider name, configuredForProduction, warnings[], runtimeMode
- [ ] `/admin/billing/health` returns same enriched response
- [ ] `isMockBillingForbidden()` is exported for use by health routes
- [ ] Billing runbook has explicit "dev vs demo vs prod" decision table
- [ ] No existing tests broken
- [ ] TypeScript compiles cleanly
