# Phase 99 — RCM Payments + Reconciliation — VERIFY

## Verification Gates

### A. File Existence (5 gates)

- [ ] types.ts exists in apps/api/src/rcm/reconciliation/
- [ ] recon-store.ts exists
- [ ] edi835-parser.ts exists
- [ ] matching-engine.ts exists
- [ ] recon-routes.ts exists

### B. UI Page (1 gate)

- [ ] reconciliation/page.tsx exists in apps/web/

### C. DB Schema (4 gates)

- [ ] remittance_import table defined in schema.ts
- [ ] payment_record table defined
- [ ] reconciliation_match table defined
- [ ] underpayment_case table defined

### D. Migration (4 gates)

- [ ] CREATE TABLE remittance_import in migrate.ts
- [ ] CREATE TABLE payment_record
- [ ] CREATE TABLE reconciliation_match
- [ ] CREATE TABLE underpayment_case

### E. Audit Actions (8 gates)

- [ ] recon.imported in rcm-audit.ts
- [ ] recon.payment_created
- [ ] recon.matched
- [ ] recon.batch_matched
- [ ] recon.confirmed
- [ ] recon.underpayment_created
- [ ] recon.underpayment_updated
- [ ] recon.sent_to_denials

### F. Route Wiring (2 gates)

- [ ] reconciliationRoutes imported in index.ts
- [ ] server.register(reconciliationRoutes) present

### G. Route Coverage (14 gates)

- [ ] POST /rcm/reconciliation/import
- [ ] GET /rcm/reconciliation/imports
- [ ] GET /rcm/reconciliation/imports/:id
- [ ] GET /rcm/reconciliation/payments
- [ ] GET /rcm/reconciliation/payments/:id
- [ ] POST /rcm/reconciliation/payments/:id/match
- [ ] POST /rcm/reconciliation/match-batch
- [ ] GET /rcm/reconciliation/matches/review
- [ ] PATCH /rcm/reconciliation/matches/:id
- [ ] GET /rcm/reconciliation/underpayments
- [ ] GET /rcm/reconciliation/underpayments/:id
- [ ] PATCH /rcm/reconciliation/underpayments/:id
- [ ] POST /rcm/reconciliation/underpayments/:id/send-to-denials
- [ ] GET /rcm/reconciliation/stats

### H. Domain Model (8 gates)

- [ ] PAYMENT_STATUSES has 6 values
- [ ] MATCH_METHODS has 4 values
- [ ] MATCH_STATUSES has 4 values
- [ ] UNDERPAYMENT_STATUSES has 5 values
- [ ] UNDERPAYMENT_TRANSITIONS defined
- [ ] isValidUnderpaymentTransition exported
- [ ] Edi835Parser interface exported
- [ ] NormalizedRemittance interface exported

### I. Matching Engine (3 gates)

- [ ] matchPayment function exported
- [ ] matchImportBatch function exported
- [ ] registerKnownClaim function exported

### J. Parser (3 gates)

- [ ] ScaffoldEdi835Parser class exists
- [ ] getParser function exported
- [ ] registerParser function exported

### K. Build (2 gates)

- [ ] tsc --noEmit exits clean
- [ ] next build exits clean

### L. Security (4 gates)

- [ ] No console.log in new files
- [ ] No credentials in new files
- [ ] No raw DFN in audit calls
- [ ] XSS: all UI text properly escaped (JSX auto-escapes)

### M. Docs (3 gates)

- [ ] Prompt 99-01-IMPLEMENT.md exists
- [ ] Prompt 99-99-VERIFY.md exists
- [ ] Runbook rcm-reconciliation-phase99.md exists

## Verification Script

```powershell
.\scripts\verify-phase99-reconciliation.ps1          # 83 gates (static + runtime)
.\scripts\verify-phase99-reconciliation.ps1 -SkipBuild   # skip tsc+next build
.\scripts\verify-phase99-reconciliation.ps1 -SkipRuntime  # skip runtime endpoint tests
```

## VERIFY Pass Results (2026-02-23)

### Issues Found & Fixed

1. **No-op ternary in matching-engine.ts** -- `expectedAmountModel` always returned
   `"BILLED_AMOUNT"` regardless of branch. Fixed: `claim.totalChargeCents ? "CONTRACT_MODEL" : "BILLED_AMOUNT"`
2. **Unused imports in recon-store.ts** -- `gte`, `lte` imported from drizzle-orm but never used. Removed.
3. **Unused imports in recon-routes.ts** -- `getParser`, `ManualPaymentEntrySchema`, `PaymentCode` imported
   but never used. Removed.
4. **Unused type imports in matching-engine.ts** -- `ReconciliationMatch`, `UnderpaymentCase` imported
   but never used. Removed.

### Runtime Endpoint Battery (9 endpoints tested live)

- Import batch (201), list imports, import detail with payments
- Payments paginated, payment detail
- Batch matching, review matches, underpayments listing
- Stats accumulation after operations

### Persistence / Durability

- API killed and restarted; all imports, payments, matches, and statuses
  survived in SQLite. Stats returned identical values after restart.

### Security Scan

- Zero `console.log` in reconciliation files
- Zero hardcoded credentials
- No patient DFN in audit payloads
- UI uses `credentials: 'include'` on all fetches
- CSRF double-submit cookie validated on all mutations

### Regression

- Phase 99: 83/83 PASS (enhanced verifier with runtime + code quality gates)
- Phase 98: 71/71 PASS (denials & appeals loop)
