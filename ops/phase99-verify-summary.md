# Phase 99 VERIFY -- RCM Payments + Reconciliation

## What Changed (VERIFY pass)

### Code Fixes

1. **matching-engine.ts** -- Fixed no-op ternary: `expectedAmountModel` now returns
   `CONTRACT_MODEL` when claim has `totalChargeCents`, `BILLED_AMOUNT` otherwise.
2. **recon-store.ts** -- Removed unused `gte`, `lte` imports from drizzle-orm.
3. **recon-routes.ts** -- Removed unused imports: `getParser`, `ManualPaymentEntrySchema`, `PaymentCode`.
4. **matching-engine.ts** -- Removed unused type imports: `ReconciliationMatch`, `UnderpaymentCase`.

### Verification Script Enhancements

- Added `-SkipBuild` and `-SkipRuntime` flags
- Added Section O: Code Quality (5 gates) -- catches unused imports and no-op logic
- Added Section P: Runtime Endpoint Battery (9 gates) -- live API tests with session + CSRF
- Total gates: 71 -> 85 (83 when skipping build)

## How to Test Manually

```powershell
# Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# Login
curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' -c cookies.txt

# Get CSRF from cookie file, then:
curl -X POST http://localhost:3001/rcm/reconciliation/import \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <csrf-token>" \
  -b cookies.txt \
  -d '{"entries":[{"claimRef":"CLM-001","payerId":"PAYER-A","billedAmount":500,"paidAmount":450}],"sourceType":"MANUAL"}'

# Check stats
curl http://localhost:3001/rcm/reconciliation/stats -b cookies.txt
```

## Verifier Output

- Phase 99: **83/83 PASS** (enhanced verifier, `-SkipBuild`)
- Phase 98 regression: **71/71 PASS**

## Durability Confirmed

- Imported 3 payments, matched 1, restarted API
- All records persisted in SQLite across restart
- Stats returned identical values post-restart

## Follow-ups

- EDI 835 real wire-format parser (currently scaffold-json only)
- Known claims registry integration with Phase 91 claim store
- Underpayment auto-detection requires known claims to be registered first
