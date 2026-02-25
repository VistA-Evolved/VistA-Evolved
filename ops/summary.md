# Phase 137: ADT + Bedboard + Census (VistA-first)

## What Changed

### New Files
- services/vista/ZVEADT.m -- Custom M routine: WARDS, BEDS, MVHIST entry points for inpatient ADT
- apps/web/src/app/inpatient/census/page.tsx -- Ward census UI (ward grid + drill-down patient table)
- apps/web/src/app/inpatient/bedboard/page.tsx -- Bed board UI (ward selector + bed grid visualization)
- prompts/142-PHASE-137-ADT-BEDBOARD/137-01-IMPLEMENT.md -- Implementation prompt
- prompts/142-PHASE-137-ADT-BEDBOARD/137-99-VERIFY.md -- Verification prompt

### Modified Files
- apps/api/src/routes/adt/index.ts -- +2 endpoints (census, movements) + HIPAA audit on all routes
- apps/api/src/routes/inpatient/index.ts -- +HIPAA audit on all 4 GET endpoints, updated pending targets
- apps/api/src/lib/immutable-audit.ts -- +4 ImmutableAuditAction types (inpatient.wards/census/bedboard/movements)
- apps/api/src/vista/rpcRegistry.ts -- +3 RPC_REGISTRY + 3 RPC_EXCEPTIONS for ZVEADT RPCs
- config/capabilities.json -- +7 clinical.adt.* capabilities (3 live, 4 pending)
- docs/qa/phase-index.json -- Phase 137 entry added (regenerated)

### New Endpoints
- GET /vista/adt/census -- Ward census (no param: ward list with counts; ?ward=IEN: enriched patient list)
- GET /vista/adt/movements?dfn=N -- Patient movement timeline (admission events + vistaGrounding)

## How to Test Manually
```bash
# Login
curl -s -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' -c cookies.txt

# Census (all wards)
curl -s -b cookies.txt -H "X-CSRF-Token: <token>" http://127.0.0.1:3001/vista/adt/census

# Movements for DFN=3
curl -s -b cookies.txt -H "X-CSRF-Token: <token>" "http://127.0.0.1:3001/vista/adt/movements?dfn=3"

# Inpatient wards (HIPAA-audited)
curl -s -b cookies.txt -H "X-CSRF-Token: <token>" http://127.0.0.1:3001/vista/inpatient/wards
```

## Verifier Output
- TypeScript: API clean (tsc --noEmit)
- Vitest: 20/20 files, 413/413 tests PASS
- Gauntlet FAST: 5P/0F/0W
- Gauntlet RC: 16P/0F/0W
- All 4 new endpoints return correct responses (tested via curl)

## Follow-ups
- Phase 137B: Install ZVEADT.m in VistA Docker, register RPCs, wire live data
- Phase 137C: Add real-time ADT event push via HL7 ADT messages or polling
- Census/bedboard pages need navigation integration from main inpatient tabs