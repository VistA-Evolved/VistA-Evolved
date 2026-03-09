# Phase 589 - Scheduling Direct Writeback

## User Request

Continue the production-readiness work by closing the next real end-user scheduling gap, using the original scheduling prompts and runbooks to determine intended behavior.

## Implementation Steps

1. Verify the live VEHU lane is running and the API is reachable before changing scheduling write paths.
2. Inventory the current scheduling frontend, route, adapter, prompt, and runbook behavior so direct writeback is grounded in existing repo intent.
3. Use the existing unified VistA installer with seed support to populate sandbox scheduling data rather than creating ad hoc test fixtures.
4. Probe live SDES create and check-in behavior against VEHU after seeding, including the exact parameter contract required by the newer SDES RPCs.
5. Enable direct scheduling and check-in only if the sandbox proves the RPCs return truthful success data.
6. Keep Phase 170 writeback truth rules authoritative so approval or booking never overclaims scheduled state without VistA confirmation.
7. Preserve fallback behavior when direct SDES writeback is unavailable or returns validation errors.
8. Re-run live appointment request, direct booking, and check-in flows after the code change.

## Files Touched

- prompts/589-PHASE-589-SCHEDULING-DIRECT-WRITEBACK/589-01-IMPLEMENT.md
- prompts/589-PHASE-589-SCHEDULING-DIRECT-WRITEBACK/589-99-VERIFY.md
- apps/api/src/adapters/scheduling/vista-adapter.ts
- apps/api/src/routes/scheduling/index.ts
- docs/runbooks/scheduling-seed.md
- docs/runbooks/phase170-scheduling-writeback.md