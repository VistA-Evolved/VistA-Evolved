# Phase 112 — VERIFY: Evidence Pipeline + No-Fake-Integrations Gate

## Verification Summary

### Gate 1: CI Gate Fabrication Test
- **Test**: Injected `const FAKE_ENDPOINT = "https://api.fabricated-payer.com/v2/claims/submit"` into `sandbox-connector.ts`
- **Result**: `--strict` mode: 3 FAIL, exit code 1 (Gate 2 caught the extra external URL: 37 vs 36)
- **Revert**: Fabricated line removed, gate returns to 4 PASS / 3 WARN / 0 FAIL, exit code 0
- **Status**: PASS

### Gate 2: Evidence-Backed Adapters Pass Gate
- Standard mode: 4 PASS, 3 WARN (expected), 0 FAIL, exit code 0
- 57 payers across 7 seed files scanned
- 8 payers with api/fhir/portal mode flagged as WARNs (expected -- no seed evidence files yet)
- Template, routes, and repo all PASS
- **Status**: PASS

### Gate 3: Build Verification
- `npx tsc --noEmit` -- 0 errors
- `npx next build` -- clean, all pages compiled
- **Status**: PASS

### Gate 4: Live Endpoint Tests (13/13 pass)

| # | Test | Result |
|---|------|--------|
| 1 | GET /rcm/evidence (empty) | ok:true, total:0 |
| 2 | GET /rcm/evidence/coverage | ok:true, payers:97, gaps:96 |
| 3 | GET /rcm/evidence/gaps | ok:true, totalGaps:96 |
| 4 | GET /rcm/evidence/stats | ok:true, total:0 |
| 5 | POST /rcm/evidence (create) | ok:true, payerId:US-CMS-MEDICARE-A |
| 6 | GET /rcm/evidence/by-payer/US-CMS-MEDICARE-A | ok:true, total:1 |
| 7 | GET /rcm/evidence/coverage (after add) | gaps:95, pct:1 |
| 8 | PUT /rcm/evidence/:id (update) | ok:true, notes updated |
| 9 | DELETE /rcm/evidence/:id (archive) | ok:true, archived:true |
| 10 | GET /rcm/evidence?status=archived | ok:true, count:1 |
| 11 | GET /rcm/evidence/nonexistent | 404 |
| 12 | POST /rcm/evidence (empty body) | 400 |
| 13 | POST /rcm/evidence (bad method) | 400 |

### Gate 5: Regression Check
- Claims: ok:true
- Connectors health: ok:true
- Payers: ok:true, total:97
- Audit + verify: ok:true
- EDI pipeline: ok:true
- Health: ok:true
- **Status**: PASS -- zero regressions

## Bugs Found & Fixed During Verification

### BUG-069: CSRF token missing in RCM page mutations (systemic)
- **Scope**: ALL 20 tabs in `apps/web/src/app/cprs/admin/rcm/page.tsx`
- **Root cause**: `apiFetch()` helper never read `ehr_csrf` cookie or set `x-csrf-token` header
- **Symptom**: POST/PUT/DELETE from UI would get 403 "CSRF token mismatch"
- **Fix**: Added `getCsrfToken()` helper + updated `apiFetch()` to inject CSRF token for non-safe methods
- **Also fixed**: Direct `fetch()` calls in `handleCreate` and `handleArchive` of EvidenceRegistryTab

### BUG-070: Evidence route order -- fixed paths after parameterized :id
- **Root cause**: `/rcm/evidence/coverage`, `/rcm/evidence/gaps`, `/rcm/evidence/stats` registered after `/rcm/evidence/:id`
- **Symptom**: Fastify radix tree handles this correctly, but it's fragile and the team convention is static-first (see `admin-payer-db-routes.ts` comment)
- **Fix**: Moved all fixed-path GET routes before the `:id` parameterized route
- **Duplicate removal**: Removed duplicated coverage/gaps/stats routes that remained at file end

## Files Changed (Verify phase)
- `apps/web/src/app/cprs/admin/rcm/page.tsx` -- CSRF fix (systemic)
- `apps/api/src/rcm/evidence/evidence-routes.ts` -- Route reorder + duplicate removal

## Adapters Missing Evidence (expected)
Standard mode: 8 payers with direct_api/fhir_payer/government_portal mode lack evidence:
- AU-MEDICARE, AU-DVA, AU-MEDIBANK, AU-BUPA (au_core.json)
- NZ-ACC (nz_core.json)
- PH-PHIC (ph_hmos.json)
- SG-NPHC, SG-MEDISAVE (sg_core.json)

These are expected WARNs -- evidence entries should be added via the research template workflow.
