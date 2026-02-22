# Phase 88: PH Payer Registry Ingestion + Capability Matrix -- Summary

## What Changed

### Backend (apps/api/src/rcm/payerOps/)
- **registry-store.ts** -- Versioned, source-tracked payer registry with CRUD, merge, snapshots
- **capability-matrix.ts** -- Evidence-backed integration matrix (5 capability types x N payers)
- **ingest.ts** -- Repeatable ingestion from Insurance Commission HMO/Broker snapshots
- **registry-routes.ts** -- 13 REST endpoints for registry, payers, and capability matrix

### Data (data/regulator-snapshots/)
- **ph-ic-hmo-list.json** -- 27 IC-licensed HMOs with CA numbers
- **ph-ic-hmo-broker-list.json** -- 13 IC-licensed HMO Brokers with CA numbers

### Frontend (apps/web/src/app/cprs/admin/)
- **payer-directory/page.tsx** -- 3-tab admin page (Payer Registry, Ingestion Sources, Merge)
- **capability-matrix/page.tsx** -- Grid UI with cell editor drawer, evidence management
- **layout.tsx** -- Added nav links for both new pages

### Docs
- **docs/runbooks/ph-payer-registry-ingestion.md** -- Full runbook

## How to Test Manually

1. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Run ingestion: `curl -X POST http://localhost:3001/rcm/payerops/registry/ingest -H "Content-Type: application/json" -d "{\"target\":\"all\"}"`
3. Check payers: `curl http://localhost:3001/rcm/payerops/payers`
4. Check matrix: `curl http://localhost:3001/rcm/payerops/capability-matrix`
5. Visit admin UI: http://localhost:3000/cprs/admin/payer-directory
6. Visit matrix UI: http://localhost:3000/cprs/admin/capability-matrix

## Verifier Output

- API compilation: CLEAN (tsc --noEmit -- zero errors)
- Web compilation: CLEAN (tsc --noEmit -- zero errors)
- .gitignore: artifacts/ covered, rcm-exports/ covered

## Follow-ups

- Phase 89: Wire ingestion to live IC website scraping (currently reads local JSON snapshots)
- Add CSV import endpoint for bulk payer onboarding from clearinghouse rosters
- Persist registry to VistA or file-backed store (currently in-memory, resets on restart)
- Add audit trail for capability matrix changes
