# Phase 111 — VERIFY: Claim Scrubbing + Claim Lifecycle

## User Request

Verify Phase 111 implementation:

- UI→API→DB→UI flows for claim draft + scrub + submit attempt + denial status
- No fabricated metrics
- qa:all passes, security checks pass
- Audit logs written for each lifecycle transition

## Verification Steps

### 1. Compile & Build

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx next build` — clean build

### 2. Sanity Check

- [ ] No hardcoded or placeholder data
- [ ] No dead UI elements or unused backend logic
- [ ] All new backend logic reachable and invoked
- [ ] Data flows: UI → API → DB → UI correct
- [ ] Contract alignment (routes match UI fetch calls)
- [ ] Migrations run cleanly

### 3. Feature Integrity (Live Endpoint Tests)

- [ ] POST /rcm/claim-lifecycle/drafts — create draft
- [ ] GET /rcm/claim-lifecycle/drafts — list drafts
- [ ] POST /rcm/claim-lifecycle/rules — create scrub rule
- [ ] POST /rcm/claim-lifecycle/drafts/:id/scrub — scrub draft
- [ ] POST /rcm/claim-lifecycle/drafts/:id/transition — FSM transitions
- [ ] POST /rcm/claim-lifecycle/drafts/:id/denial — record denial
- [ ] POST /rcm/claim-lifecycle/drafts/:id/resubmit — resubmission
- [ ] GET /rcm/claim-lifecycle/drafts/:id/events — lifecycle events
- [ ] GET /rcm/claim-lifecycle/drafts/:id/scrub-results — scrub results
- [ ] GET /rcm/claim-lifecycle/drafts/stats — statistics
- [ ] GET /rcm/claim-lifecycle/metrics — dashboard metrics
- [ ] GET /rcm/claim-lifecycle/metrics/scrub — scrub metrics
- [ ] GET /rcm/claim-lifecycle/drafts/aging — aging denials
- [ ] Audit trail entries for each transition

### 4. System Regression Check

- [ ] Existing RCM endpoints still work
- [ ] No import conflicts
- [ ] Auth/session flow intact
- [ ] No console.log violations

### 5. Gap Analysis & Fixes

- Document all issues found
- Apply fixes immediately
- Re-verify after fixes

## Files Touched (Phase 111)

- apps/api/src/platform/db/schema.ts
- apps/api/src/platform/db/migrate.ts
- apps/api/src/rcm/claim-lifecycle/claim-draft-repo.ts
- apps/api/src/rcm/claim-lifecycle/scrub-rule-repo.ts
- apps/api/src/rcm/claim-lifecycle/scrubber.ts
- apps/api/src/rcm/claim-lifecycle/claim-lifecycle-routes.ts
- apps/api/src/index.ts
- apps/web/src/app/cprs/admin/rcm/page.tsx
- docs/runbooks/phase111-claim-lifecycle.md
- prompts/111-01-IMPLEMENT.md
