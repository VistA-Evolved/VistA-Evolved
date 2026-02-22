# Phase 91 — Claims Lifecycle v1 + Scrubber + Denial Workbench — IMPLEMENT

## User Request

Build a unified claims lifecycle engine with deterministic scrubber
and denial workbench. Philippines-first, payer-agnostic, VistA-aligned.

## Deliverables

1. **Claims domain model** — ClaimCase (extending existing Claim), ScrubResult,
   ClaimAttachment, ClaimEvent, enhanced state machine
2. **State machine** — draft → ready_for_scrub → scrub_passed/scrub_failed →
   ready_for_submission → submitted → acknowledged → paid/denied/returned →
   appeal_in_progress → closed/cancelled
3. **Scrubber engine** — deterministic rule evaluation, core rules + payer
   rule packs (JSON). Cannot advance to submission unless scrub PASS/WARN.
4. **Claims Queue UI** — `/cprs/admin/claims-queue` with filters, scrub status,
   lifecycle badges
5. **Denials Workbench UI** — `/cprs/admin/denials` with denial reason codes,
   workqueue integration, appeal tracking
6. **API routes** — Claims lifecycle CRUD, scrub trigger, transition, denials list
7. **Docs** — Runbook at `docs/runbooks/claims-lifecycle-v1.md`

## Implementation Steps

1. Create `apps/api/src/rcm/claims/claim-types.ts` — enhanced types
2. Create `apps/api/src/rcm/claims/claim-store.ts` — lifecycle store
3. Create `apps/api/src/rcm/claims/scrubber.ts` — deterministic scrubber
4. Create `apps/api/src/rcm/claims/claim-routes.ts` — API routes
5. Register routes in `apps/api/src/index.ts`
6. Create `apps/web/src/app/cprs/admin/claims-queue/page.tsx`
7. Create `apps/web/src/app/cprs/admin/denials/page.tsx`
8. Add nav entries in `apps/web/src/app/cprs/admin/layout.tsx`
9. Create `docs/runbooks/claims-lifecycle-v1.md`

## Files Touched

- `apps/api/src/rcm/claims/claim-types.ts` (NEW)
- `apps/api/src/rcm/claims/claim-store.ts` (NEW)
- `apps/api/src/rcm/claims/scrubber.ts` (NEW)
- `apps/api/src/rcm/claims/claim-routes.ts` (NEW)
- `apps/api/src/index.ts` (MODIFIED — add import + register)
- `apps/web/src/app/cprs/admin/claims-queue/page.tsx` (NEW)
- `apps/web/src/app/cprs/admin/denials/page.tsx` (NEW)
- `apps/web/src/app/cprs/admin/layout.tsx` (MODIFIED — add nav entries)
- `docs/runbooks/claims-lifecycle-v1.md` (NEW)
- `prompts/97-PHASE-91-CLAIMS-LIFECYCLE/91-01-IMPLEMENT.md` (NEW)

## Non-Negotiables

- VistA-first: all clinical data sourced from VistA RPCs
- Deterministic scrubber: same input → same output, no randomness
- No PHI in logs/audit (use existing rcm-audit sanitization)
- Feature-flagged behind RCM module
- In-memory stores (matching Phase 23 imaging-worklist pattern)
- Builds on existing Claim domain (Phase 38) — extends, does not replace

## Verification

- `.\scripts\verify-latest.ps1` passes
- TypeScript compiles clean
- New routes respond with correct shapes
- Nav entries appear in admin sidebar
