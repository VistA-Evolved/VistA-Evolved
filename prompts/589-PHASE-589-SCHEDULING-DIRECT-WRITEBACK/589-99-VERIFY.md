# Phase 589 - Scheduling Direct Writeback Verify

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are running.
2. Start the API with `npx tsx --env-file=.env.local src/index.ts` and confirm clean startup.
3. Run the unified VistA installer with `-Seed` against the VEHU container and confirm the scheduling seed routine completes.
4. Verify the scheduling mode and clinic or resource data now reflect seeded SDES data.
5. Run an authenticated scheduling booking flow against the live API and confirm the response is grounded in VistA, not a local-only fallback, when direct writeback is available.
6. Run an authenticated scheduling check-in flow against the live API and confirm the response reflects the actual write path used.
7. Re-run the relevant repo verification entry points needed to ensure no regression in scheduling truthfulness.

## Acceptance Criteria

1. Direct SDES scheduling is enabled only if proven against live VEHU data.
2. Fallback request-only behavior remains truthful when SDES direct writeback is not available.
3. The portal and scheduling API remain consistent about whether an appointment is merely approved, pending, or truly scheduled.
4. The live verification evidence is reproducible by another engineer using repo-native commands.

## Files Touched

- prompts/589-PHASE-589-SCHEDULING-DIRECT-WRITEBACK/589-01-IMPLEMENT.md
- prompts/589-PHASE-589-SCHEDULING-DIRECT-WRITEBACK/589-99-VERIFY.md
- apps/api/src/adapters/scheduling/vista-adapter.ts
- apps/api/src/routes/scheduling/index.ts
- docs/runbooks/scheduling-seed.md
- docs/runbooks/phase170-scheduling-writeback.md