# Phase 97 — Top-5 HMO LOA + Claim Packet + Portal Adapter — Summary

## What Changed

Phase 97 implements the complete HMO Portal Adapter Interface for the top-5
Philippine HMO payers: Maxicare, MediCard, Intellicare, PhilCare, and ValuCare.

### New Files (12)
- `apps/api/src/rcm/hmo-portal/types.ts` — Domain types (453 lines): PORTAL_CAPABLE_HMOS, VaultRef, PortalAdapter interface, 12-state FSM, HmoSubmissionRecord, adapter registry
- `apps/api/src/rcm/hmo-portal/loa-engine.ts` — LOA packet builder with 16 specialty templates, JSON/PDF text exports, SHA-256 integrity hashing
- `apps/api/src/rcm/hmo-portal/hmo-packet-builder.ts` — HMO claim packet builder from Phase 38 Claim objects, cents-to-pesos conversion, 80% default HMO coverage
- `apps/api/src/rcm/hmo-portal/submission-tracker.ts` — In-memory submission lifecycle store with FSM transition enforcement
- `apps/api/src/rcm/hmo-portal/portal-adapter.ts` — ManualAssistedAdapter base class (deep links + instructions + exports)
- `apps/api/src/rcm/hmo-portal/adapters/maxicare.ts` — Maxicare MaxiLink adapter
- `apps/api/src/rcm/hmo-portal/adapters/medicard.ts` — MediCard adapter
- `apps/api/src/rcm/hmo-portal/adapters/intellicare.ts` — Intellicare adapter
- `apps/api/src/rcm/hmo-portal/adapters/philcare.ts` — PhilCare adapter
- `apps/api/src/rcm/hmo-portal/adapters/valucare.ts` — ValuCare adapter
- `apps/api/src/rcm/hmo-portal/adapters/index.ts` — Adapter initializer + re-exports
- `apps/api/src/rcm/hmo-portal/hmo-portal-routes.ts` — 18 REST endpoints
- `apps/web/src/app/cprs/admin/hmo-portal/page.tsx` — 5-tab dashboard UI

### Modified Files (2)
- `apps/api/src/index.ts` — Import + register hmoPortalRoutes + initHmoPortalAdapters
- `apps/web/src/app/cprs/admin/layout.tsx` — Nav entry "HMO Portal"

## How to Test Manually

1. Start the API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Start the web: `cd apps/web && pnpm dev`
3. Navigate to `/cprs/admin/hmo-portal`
4. **Adapters tab**: Should list 5 adapters (Maxicare, MediCard, Intellicare, PhilCare, ValuCare)
5. **LOA Builder tab**: Click "Build Demo LOA Packet (Maxicare)" → should show packet details → click "Submit to Portal" → should show portal URL + instructions
6. **Claim Builder tab**: Click "Build Demo Claim Packet (Maxicare)" → should show packet with PHP charges → click "Submit to Portal" → should create submission
7. **Submissions tab**: Should show created submissions with timeline, notes, export files
8. **Stats tab**: Should show submission counts by status

### API Smoke Tests (curl)
```bash
# Status overview
curl http://localhost:3001/rcm/hmo-portal/status

# List adapters
curl http://localhost:3001/rcm/hmo-portal/adapters

# Specialty templates
curl http://localhost:3001/rcm/hmo-portal/specialties

# Submission stats
curl http://localhost:3001/rcm/hmo-portal/submissions/stats
```

## Verifier Output

```
=== Phase 97 -- Top-5 HMO Portal Adapter Verification ===
PASS: 115 / 115
FAIL: 0 / 115
ALL GATES PASSED
```

## Follow-ups
- Phase 98+: Vault-automated mode (resolve credentials from VaultRef → portal API)
- Per-HMO deep link refinement when actual portal page paths are confirmed
- File-based LOA/claim packet export to disk for download
- Integration with Phase 94 LOA store (auto-populate from existing LOA requests)
- Integration with Phase 38 claim store (auto-populate from existing claims)
