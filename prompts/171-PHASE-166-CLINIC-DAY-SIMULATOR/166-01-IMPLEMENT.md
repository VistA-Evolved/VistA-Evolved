# Phase 166 — Clinic Day Simulator (A-Z Proof Journeys)

## Objective
Define 6 end-to-end clinic day journeys with API contract assertions and RPC golden trace sequence verification. Add CLI runner and CI nightly hook.

## Implementation Steps
1. Create journey definitions with API + RPC trace assertions
2. Build CLI runner at `scripts/qa/clinic-day-runner.mjs`
3. Create Playwright journey specs for UI assertions
4. Add gauntlet gate G23 for clinic-day journeys
5. Wire `pnpm qa:journeys:clinic-day` script
6. Register store-policy entries for journey state

## Files Touched
- scripts/qa/clinic-day-runner.mjs (new)
- apps/api/src/qa/clinic-day-journeys.ts (new)
- apps/api/src/routes/qa-journey-routes.ts (new)
- qa/gauntlet/gates/g23-clinic-day.mjs (new)
- qa/gauntlet/cli.mjs (add G23)
- apps/api/src/index.ts (register routes)
- apps/api/src/platform/store-policy.ts (register stores)
- package.json (add script)
- apps/web/e2e/clinic-day.spec.ts (new)
- docs/runbooks/phase166-clinic-day-simulator.md (new)
