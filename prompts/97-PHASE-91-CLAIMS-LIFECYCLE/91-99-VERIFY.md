# Phase 91 — Claims Lifecycle v1 + Scrubber + Denial Workbench — VERIFY

## Verification Scope

Full QA of Phase 91 deliverables: claims lifecycle engine, deterministic
scrubber, denial workbench, API routes, UI pages, and prompts discipline.

## Verification Steps

### 1. Sanity Check
- [x] `pnpm -C apps/api exec tsc --noEmit` — 0 errors
- [x] `pnpm -C apps/web exec tsc --noEmit` — 0 errors
- [x] Route wiring: `claimLifecycleRoutes` imported + registered in index.ts
- [x] Nav entries: Claims Queue + Denials in layout.tsx, both `moduleId: 'rcm'`
- [x] No Fastify route conflicts with existing `/rcm/claims/*` routes

### 2. Feature Integrity
- [x] **Scenario A (Manual payer):** draft → scrub → pass → ready_for_submission → export
  - BUG FIX: draft → scrub_passed/scrub_failed added to LIFECYCLE_TRANSITIONS
    (auto-transition from scrub route was silently failing without this)
- [x] **Scenario B (PhilHealth):** memberPin + esoa_required rule fires for DOS ≥ 2026-04-01
- [x] **Scenario C (Denial + Appeal):** denied → appeal_in_progress → re-resolution
- [x] Scrub gate: `ready_for_submission` requires scrub PASS or WARN
- [x] Evidence gate: paid/denied/acknowledged require evidenceRef or payerClaimNumber

### 3. Security & PHI Audit
- [x] No `console.log` in any Phase 91 file
- [x] `redactDetail()` strips SSN, DOB, patient_name from transition event details
- [x] Non-transition events use only safe system-generated fields (no PHI)
- [x] All mutations call `appendRcmAudit()` from `rcm-audit.ts`
- [x] `credentials: 'include'` on every UI fetch call

### 4. System Regression
- [x] API compiles clean — no regressions
- [x] Web compiles clean — no regressions
- [x] Existing `/rcm/claims/*` routes unmodified

### 5. Prompts Discipline
- [x] `91-01-IMPLEMENT.md` exists in `prompts/97-PHASE-91-CLAIMS-LIFECYCLE/`
- [x] `91-99-VERIFY.md` exists in `prompts/97-PHASE-91-CLAIMS-LIFECYCLE/`
- [x] Internal headers match (Phase 91 + Claims Lifecycle)

## Bugs Found & Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Draft → scrub auto-transition silent failure | `LIFECYCLE_TRANSITIONS` only allowed `draft → [ready_for_scrub, cancelled]`; scrub route handler tried `draft → scrub_passed/scrub_failed` | Added `scrub_passed` and `scrub_failed` to draft's allowed transitions |

## Files Touched

- `apps/api/src/rcm/claims/claim-types.ts` — FIX: added scrub transitions from draft
- `prompts/97-PHASE-91-CLAIMS-LIFECYCLE/91-99-VERIFY.md` — NEW: this file
