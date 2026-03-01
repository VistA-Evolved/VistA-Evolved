# Phase 437 — Verification

## Checks
1. `prompts-tree-health.mjs` passes (7/7 PASS, 0 FAIL)
2. `CommandStatus` includes `awaiting_review`
3. `SupervisedReviewMeta` type has all required fields
4. `isSupervisedModeEnabled()` reads `WRITEBACK_SUPERVISED_MODE` env var
5. `getWritebackGateSummary()` includes `supervisedMode` field
6. `reviewCommand()` accepts `approve` and `reject` decisions
7. `reviewCommand("approve")` calls `processCommand()` after approval
8. `reviewCommand("reject")` transitions to `rejected` status
9. Both review outcomes emit immutable audit events
10. `POST /writeback/commands/:id/review` validates decision field
11. `WriteReviewBanner.tsx` renders tier badge and dry-run transcript
12. `WriteReviewBanner.tsx` uses `credentials: "include"` for fetch
