# Phase 91 — Claims Lifecycle v1 + Scrubber + Denial Workbench — Summary

## What Changed

### New Files
- `apps/api/src/rcm/claims/claim-types.ts` — Enhanced domain types: ClaimCase (17-state lifecycle FSM), ClaimScrubResult, ClaimAttachment, ClaimEvent, DenialRecord
- `apps/api/src/rcm/claims/claim-store.ts` — In-memory lifecycle store with state machine enforcement, transition gates, scrub/attachment/denial management
- `apps/api/src/rcm/claims/scrubber.ts` — Deterministic scrubber engine with 3 rule packs (core: 8 rules, philhealth: 5 rules, us_core: 3 rules)
- `apps/api/src/rcm/claims/claim-routes.ts` — 12 API routes under /rcm/claims/lifecycle/*
- `apps/web/src/app/cprs/admin/claims-queue/page.tsx` — Claims queue UI with stats, filters, create form, detail panel, scrub trigger
- `apps/web/src/app/cprs/admin/denials/page.tsx` — Denials workbench UI with filters, resolve workflow, remediation guidance
- `docs/runbooks/claims-lifecycle-v1.md` — Full runbook
- `prompts/97-PHASE-91-CLAIMS-LIFECYCLE/91-01-IMPLEMENT.md` — Prompt file

### Modified Files
- `apps/api/src/index.ts` — Import + register claimLifecycleRoutes
- `apps/web/src/app/cprs/admin/layout.tsx` — Added Claims Queue + Denials nav entries

## How to Test

1. Start the API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Create a claim: `POST /rcm/claims/lifecycle` with patientDfn, payerId, dateOfService
3. Run scrubber: `POST /rcm/claims/lifecycle/{id}/scrub`
4. Transition: `PUT /rcm/claims/lifecycle/{id}/transition` with toStatus
5. Record denial: `POST /rcm/claims/lifecycle/{id}/denials`
6. Visit UI: `/cprs/admin/claims-queue` and `/cprs/admin/denials`

## Verifier Output

- TypeScript: API compiles clean (0 errors)
- TypeScript: Web compiles clean (0 errors)
- IDE diagnostics: 0 errors across all 6 new files

## Follow-ups

- Wire LOA approval → auto-create ClaimCase (Phase 89 integration)
- Wire PhilHealth draft import → ClaimCase (Phase 90 integration)
- Add payer rule pack JSON config loading from data/ directory
- Production: replace in-memory store with VistA IB/PRCA file backing
