# Phase 72 — Reality Verifier Pack (Anti-False-Green) + Click-Audit + Tripwires

## User Request

Upgrade verification so it can't pass while the UI is broken.

### New Verifier Capabilities

1. **Dead-click audit** — Playwright suite clicks every visible button/menu/tab
   on chart, inbox, meds, problems, orders, notes; asserts navigation, modal,
   network request, or explicit disabled-with-tooltip. Otherwise FAIL with
   selector list.

2. **"No Fake Success" runtime gate** — API endpoints returning `ok:true` must
   include `effectProof` (msgId/orderId/problemIen) OR `pendingTargets`.
   Verifier fails if `ok:true` returned without either.

3. **Evidence-first CI readiness** — Artifacts stored locally, summarized in
   console. GitHub Actions workflow deferred unless requested.

## Implementation Steps

1. Create `apps/web/e2e/click-audit.spec.ts` — comprehensive dead-click
   crawler with network-request interception, enhanced detection.
2. Create `apps/api/src/middleware/no-fake-success.ts` — Fastify onSend hook
   that validates `ok:true` responses contain `effectProof` or `pendingTargets`.
3. Register hook in `apps/api/src/index.ts`.
4. Create `scripts/verify/verify-click-audit.ps1` — orchestrates Playwright
   click-audit suite, reports results.
5. Create `scripts/verify-phase72-reality-verifier.ps1` — comprehensive
   Phase 72 gate verifier.
6. Update `scripts/verify-latest.ps1` to point to Phase 72.

## Verification Steps

- `pnpm exec tsc --noEmit` clean in apps/api and apps/web
- `verify-phase72-reality-verifier.ps1 -SkipDocker` passes all gates
- Click-audit spec structurally correct and uses auth setup pattern
- No-fake-success hook registered and compilable

## Files Touched

- `apps/web/e2e/click-audit.spec.ts` (new)
- `apps/api/src/middleware/no-fake-success.ts` (new)
- `apps/api/src/index.ts` (register hook)
- `scripts/verify/verify-click-audit.ps1` (new)
- `scripts/verify-phase72-reality-verifier.ps1` (new)
- `scripts/verify-latest.ps1` (update pointer)
- `prompts/77-PHASE-72-REALITY-VERIFIER-PACK/77-01-IMPLEMENT.md` (this file)
