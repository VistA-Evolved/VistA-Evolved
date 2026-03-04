# Phase 83 — Inpatient ADT + Census + Bedboard (IMPLEMENT)

## User Request

Build enterprise-grade inpatient operations module: ADT/census/bedboard with
VistA-first data grounding. Extends Phase 67 ADT API layer with new web UI.

## Scope

A) 4 inpatient pages: census, bedboard, ADT workflow, movement timeline
B) VistA grounding doc for FileMan files 2/42/405/43/45.7
C) API: `/vista/inpatient/*` endpoints (7 total: 4 GET + 3 POST stubs)
D) Web UI under `/cprs/inpatient/` with 4 sub-tabs
E) RBAC + audit + no dead clicks
F) Navigation entry in CPRSMenuBar Tools menu

## Implementation Steps

1. Create `apps/api/src/routes/inpatient/index.ts` — 7 endpoints leveraging
   existing Phase 67 ADT RPCs (`ORQPT WARDS`, `ORQPT WARD PATIENTS`,
   `ORWPT16 ADMITLST`) plus new census enrichment
2. Register routes in `apps/api/src/index.ts`
3. Create `apps/web/src/app/cprs/inpatient/page.tsx` — 4-tab page
4. Add nav entry in CPRSMenuBar under Tools
5. Create `docs/runbooks/inpatient-adt-grounding.md`
6. Create `docs/runbooks/inpatient-adt.md`
7. Create verifier script

## Verification

- `npx tsc --noEmit` clean in apps/api
- `npx next build` clean in apps/web
- All 4 tabs render
- API returns VistA-sourced data for wards/census
- POST stubs return structured integration-pending

## Files Touched

- `apps/api/src/routes/inpatient/index.ts` (new)
- `apps/api/src/index.ts` (import + register)
- `apps/web/src/app/cprs/inpatient/page.tsx` (new)
- `apps/web/src/components/cprs/CPRSMenuBar.tsx` (nav entry)
- `docs/runbooks/inpatient-adt-grounding.md` (new)
- `docs/runbooks/inpatient-adt.md` (new)
- `scripts/verify-phase83-inpatient.ps1` (new)
