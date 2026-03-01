# Phase 284 - VERIFY: SaaS Billing / Metering

## Verification Gates

### Gate 1: TypeScript Compilation
```powershell
pnpm -C apps/api exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit
```
Both must exit 0 with no errors.

### Gate 2: File Existence
```powershell
$files = @(
  "apps/api/src/billing/types.ts",
  "apps/api/src/billing/mock-provider.ts",
  "apps/api/src/billing/lago-provider.ts",
  "apps/api/src/billing/metering.ts",
  "apps/api/src/billing/index.ts",
  "apps/api/src/billing/billing-routes.ts",
  "apps/web/src/app/cprs/admin/billing/page.tsx"
)
foreach ($f in $files) { Test-Path $f }
```
All must return True.

### Gate 3: BillingProvider Interface
- types.ts exports BillingProvider with 10 methods
- BillingProviderType = "mock" | "lago"
- Provider registry (setBillingProvider / getBillingProvider) exported

### Gate 4: MockBillingProvider
- Implements all BillingProvider methods
- 4 built-in plans (free, starter, professional, enterprise)
- In-memory stores (subscriptions, usageCounters)
- resetMockBillingStores() exported

### Gate 5: LagoBillingProvider
- Uses LAGO_API_URL and LAGO_API_KEY env vars
- 15s timeout on all API calls
- Mappers for plan, subscription, invoice

### Gate 6: Metering Pipeline
- incrementMeter() is synchronous
- flushMeters() calls billing provider reportUsage
- Timer management (start/stop)
- MAX_TENANTS guard

### Gate 7: Route Registration
- billingRoutes imported in register-routes.ts
- server.register(billingRoutes) called

### Gate 8: Store Policy
- 3 stores registered: billing-subscriptions, billing-usage-counters, metering-counters
- All classification: "cache", durability: "in_memory_only", domain: "billing"

### Gate 9: Env Vars
- BILLING_PROVIDER documented in .env.example
- LAGO_API_URL, LAGO_API_KEY, METERING_FLUSH_INTERVAL_MS documented

### Gate 10: Admin UI
- billing/page.tsx exists with 4 tabs
- Uses credentials: 'include' on all fetch calls
- No hardcoded credentials
