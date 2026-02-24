# Phase 111 — IMPLEMENT: Claim Scrubbing + Claim Lifecycle

## User Request
Implement a claim lifecycle pipeline with:
- Claim drafts from encounter/diagnoses/procedures (VistA-first)
- Payer-specific validation rules (scrubbing)
- Claim status tracking over time
- Denial reasons + resubmission loop
- Reconciliation-ready outputs

## Implementation Steps

### 1. DB Schema (4 new tables)
- `claim_draft` — DB-backed claim drafts with encounter/patient/provider/payer refs
- `scrub_rule` — Payer-specific validation rules (evidence-backed)
- `scrub_result` — Scrubbing outcomes per claim draft
- `claim_lifecycle_event` — Temporal status tracking with denial codes + resubmission

### 2. Repos
- `claim-draft-repo.ts` — CRUD for claim_draft + lifecycle events
- `scrub-rule-repo.ts` — CRUD for scrub_rule + scrub_result

### 3. Scrubber Engine
- `scrubber.ts` — Evaluates rules per payer/service-type, produces errors/warnings/suggestions
- Extends existing `validation/engine.ts` pattern (does not replace it)

### 4. Denial Loop
- Built into claim-draft-repo FSM transitions
- Records denial codes, generates appeal/resubmission packet refs
- Tracks aging via `claim_lifecycle_event` timestamps

### 5. API Routes
- `claim-lifecycle-routes-v2.ts` — ~20 endpoints for draft CRUD, scrub, transition, denial, metrics

### 6. UI Dashboard Tab
- `claim-lifecycle` tab in RCM page with metrics, draft list, scrub results

### 7. Runbook
- `docs/runbooks/phase111-claim-lifecycle.md`

## Verification Steps
- tsc --noEmit clean
- next build clean
- All endpoints return 200 with correct data
- Audit trail entries created for mutations

## Files Touched
- apps/api/src/platform/db/schema.ts (4 new tables)
- apps/api/src/platform/db/migrate.ts (4 CREATE TABLE + indexes)
- apps/api/src/rcm/claim-lifecycle/claim-draft-repo.ts (new)
- apps/api/src/rcm/claim-lifecycle/scrub-rule-repo.ts (new)
- apps/api/src/rcm/claim-lifecycle/scrubber.ts (new)
- apps/api/src/rcm/claim-lifecycle/claim-lifecycle-routes.ts (new)
- apps/api/src/rcm/audit/rcm-audit.ts (new action types)
- apps/api/src/index.ts (import + register)
- apps/web/src/app/cprs/admin/rcm/page.tsx (new tab + component)
- docs/runbooks/phase111-claim-lifecycle.md (new)
