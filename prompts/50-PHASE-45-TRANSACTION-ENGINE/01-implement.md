# Phase 45 — Transaction Correctness Engine (X12/CORE/Ack/Status/ERA)

## User Request
Implement enterprise-grade transaction pipeline: eligibility (270/271), claims (837), acknowledgements (999/277CA), claim status (276/277), remittance (835). Enforce CAQH CORE/CMS operating-rule expectations. Pluggable translator, connectivity rules, ack/ERA reconciliation, UI updates, tests.

## Implementation Steps
1. Create `apps/api/src/rcm/transactions/` package: envelope types, translator interface, connectivity profile
2. Implement LocalScaffoldTranslator + ExternalTranslatorAdapter
3. Add CORE-style connectivity gates: ack tracking, retry/backoff, timeouts, DLQ, error payloads
4. Extend ack/status/ERA storage with reconciliation (claim -> remit lines -> payment/denial summary)
5. Add `/rcm/connectivity/profile`, `/rcm/transactions/*` routes  
6. Update UI: claim workqueue + remits with ack/status/rejection/next-action columns
7. Add synthetic golden transaction fixtures + determinism + negative tests
8. Write 4 doc files + runbook

## Verification Steps
- All tests pass (vitest run)
- tsc --noEmit clean
- Endpoints return correct data  
- Translator output is deterministic for same input  
- Missing required fields blocked by scrubber
- No secrets/PHI in transaction code

## Files Touched
- `apps/api/src/rcm/transactions/types.ts` (new)
- `apps/api/src/rcm/transactions/envelope.ts` (new)
- `apps/api/src/rcm/transactions/translator.ts` (new)
- `apps/api/src/rcm/transactions/local-scaffold-translator.ts` (new)
- `apps/api/src/rcm/transactions/external-translator-adapter.ts` (new)
- `apps/api/src/rcm/transactions/connectivity.ts` (new)
- `apps/api/src/rcm/transactions/reconciliation.ts` (new)
- `apps/api/src/rcm/transactions/index.ts` (new)
- `apps/api/src/rcm/rcm-routes.ts` (modified — new Phase 45 routes)
- `apps/api/src/rcm/audit/rcm-audit.ts` (modified — new audit actions)
- `apps/web/src/app/cprs/admin/rcm/page.tsx` (modified — UI updates)
- `apps/api/tests/transaction-correctness.test.ts` (new)
- `docs/rcm/transactions-overview.md` (new)
- `docs/rcm/core-connectivity-engineering.md` (new)
- `docs/rcm/ack-status-era-loop.md` (new)
- `docs/runbooks/rcm-x12-local-vs-external-translator.md` (new)
- `prompts/50-PHASE-45-TRANSACTION-ENGINE/01-implement.md` (this file)
