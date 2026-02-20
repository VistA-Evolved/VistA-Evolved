# Phase 43 — Summary

## What Changed

### New Files
- `apps/api/src/rcm/domain/ack-status.ts` — Normalized domain models for 999/277CA/TA1 acknowledgements and 276/277 claim status updates
- `apps/api/src/rcm/edi/ack-status-processor.ts` — Ack and status ingestion with idempotency, claim lifecycle transitions, workqueue generation
- `apps/api/src/rcm/edi/remit-processor.ts` — Enhanced 835 remittance processing with CARC enrichment and denial workqueue generation
- `apps/api/src/rcm/workqueues/workqueue-store.ts` — In-memory workqueue store (rejection/denial/missing_info) with CRUD, filtering, priority sorting
- `apps/api/src/rcm/reference/carc-rarc.ts` — 30+ CARC codes, 15 RARC codes with descriptions, categories, and recommended actions
- `apps/api/src/rcm/rules/payer-rules.ts` — Configuration-driven payer rules engine with 9 condition types, evaluation, 9 seed rules
- `docs/runbooks/rcm-claim-quality-loop.md` — Comprehensive runbook
- `apps/api/tests/rcm-quality-loop.test.ts` — 25 unit tests across 6 describe blocks

### Modified Files
- `apps/api/src/rcm/audit/rcm-audit.ts` — Added 10 new audit actions for ack/status/workqueue/rule/remit events
- `apps/api/src/rcm/rcm-routes.ts` — Added 24 new endpoints (acks, status, workqueues, rules, reference)
- `apps/api/src/rcm/domain/claim-store.ts` — Added `resetClaimStore()` for test isolation
- `apps/web/src/app/cprs/admin/rcm/page.tsx` — Added Denial Workqueues and Payer Rules tabs

## How to Test Manually

```bash
# Start API
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# Create a claim
curl -s http://localhost:3001/rcm/claims -X POST -H 'Content-Type: application/json' \
  -d '{"tenantId":"default","patientDfn":"3","payerId":"BCBS","dateOfService":"2025-01-15","totalCharge":15000}' --cookie "..."

# Ingest ack
curl -s http://localhost:3001/rcm/acks/ingest -X POST -H 'Content-Type: application/json' \
  -d '{"type":"999","disposition":"accepted","originalControlNumber":"CTL001","ackControlNumber":"ACK001","idempotencyKey":"k1"}'

# Check workqueues
curl -s http://localhost:3001/rcm/workqueues

# List rules
curl -s http://localhost:3001/rcm/rules

# CARC reference
curl -s 'http://localhost:3001/rcm/reference/carc?code=45'
```

## Verifier Output

- tsc: CLEAN (0 errors)
- vitest: 25/25 tests pass (429ms)

## Follow-ups
- Wire 999/277/835 to real EDI file ingestion when clearinghouse integration goes live
- Add bulk ack/status import from flat files
- Add workqueue assignment and SLA tracking
- Add rule import/export CSV
