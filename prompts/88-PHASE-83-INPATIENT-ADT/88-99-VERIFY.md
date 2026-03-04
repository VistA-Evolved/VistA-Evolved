# Phase 83 — VERIFY: Inpatient ADT / Census / Bedboard

## Verify Request

Comprehensive Phase 83 verification covering:

1. Sanity check (typecheck/lint, verify-latest, secrets/PHI scan)
2. Feature integrity (end-to-end all tabs, data paths, error states, audit events)
3. System regression check
4. Dead click audit
5. Fix all issues found

## Files Audited

- `apps/api/src/routes/inpatient/index.ts` (546 lines, all 7 endpoints)
- `apps/web/src/app/cprs/inpatient/page.tsx` (942 lines, all 4 tabs)
- `apps/web/src/components/cprs/CPRSMenuBar.tsx` (nav entry)
- `apps/api/src/index.ts` (route registration)
- `docs/runbooks/inpatient-adt-grounding.md`
- `docs/runbooks/inpatient-adt.md`
- `scripts/verify-phase83-inpatient.ps1`

## Issues Found and Fixed

| #   | Issue                                                                                        | Severity | Fix                                                                                 |
| --- | -------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- | ----- |
| 1   | `rpcInfo` state set but never displayed in CensusTab                                         | Medium   | Removed unused state variable and setter                                            |
| 2   | MovementTimelineTab grounding label showed M routines as "Target RPC:"                       | Medium   | Changed label to "Target RPC: ZVEADTM LIST", added M Routines + Sandbox Note fields |
| 3   | `pendingFallback()` returned `ok: true` on error (indistinguishable from empty-ward success) | Low      | Changed to `ok: false`                                                              |
| 4   | `vistaGrounding` state typed as `any`                                                        | Info     | Typed as `PendingInfo['vistaGrounding']                                             | null` |

## Non-Issues Confirmed

- Empty bed branch in BedboardTab is unreachable (API only returns occupied beds) — acceptable since the type contract supports future empty beds from ZVEBED LIST
- BedboardTab "X occupied" badge lacks denominator — expected given pending ZVEBED LIST RPC
- POST stubs send no body — correct since they're integration-pending status checks
- N+1 ward census query — documented with `_note` field, acceptable for sandbox scale

## Verification Steps

1. API tsc --noEmit: **PASS** (exit 0)
2. Web next build: **PASS** (/cprs/inpatient route generated)
3. verify-latest.ps1: **75/75 PASS**
4. verify-phase83-inpatient.ps1: **56/56 PASS**
5. Secrets/PHI scan: **CLEAN** (no credentials, SSNs, or PHI in Phase 83 files)
6. Dead click audit: **0 dead clicks** (all onClick handlers functional)
7. Contract audit: **All API URLs match, all response fields consumed correctly**
