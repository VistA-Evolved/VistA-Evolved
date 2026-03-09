# Phase 588 - Production Stabilization Execution Verify

## Verification Steps

1. Run docker ps and confirm vehu plus ve-platform-db are running.
2. Start apps/api with npx tsx --env-file=.env.local src/index.ts and confirm clean logs.
3. Verify /vista/ping returns ok:true and /health returns ok:true with platformPg ok:true.
4. Run the repo verification entry point and record the first failing gates.
5. For each fix applied in this phase, rerun the exact command that proved the failure.
6. Run the certification gate and confirm all scenarios are `READY`.
7. Run authenticated scheduling request, approval, booking alias, and check-in alias flows against the live API.

## Acceptance Criteria

1. Work is based on live runtime evidence, not code inspection alone.
2. At least one concrete production-readiness blocker is fixed and re-verified.
3. The evidence trail for this stabilization wave is reproducible by another engineer.
4. Certification reaches full readiness without stale route false negatives.
5. Scheduling approval never overclaims `scheduled` when VistA truth gate fails.

## Files Touched

- prompts/588-PHASE-588-PRODUCTION-STABILIZATION-EXECUTION/588-01-IMPLEMENT.md
- prompts/588-PHASE-588-PRODUCTION-STABILIZATION-EXECUTION/588-99-VERIFY.md
- docs/qa/phase-index.json
- scripts/qa-gates/certification-runner.mjs
- config/certification-scenarios.json
- apps/api/src/routes/scheduling/index.ts
- docs/runbooks/phase588-production-stabilization-execution.md
- ops/summary.md
- ops/notion-update.json