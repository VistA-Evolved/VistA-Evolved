# Phase 437 — Supervised-Mode UI (W27 P7)

## Goal

Add a supervised review checkpoint to the writeback command bus and provide a UI component for clinician review before execution.

## What Changed

### API — Writeback Command Bus Extensions

1. `types.ts`: Added `awaiting_review` to `CommandStatus`, added `SupervisedReviewMeta` and `ReviewDecision` types, added `supervisedMeta` field to `ClinicalCommand`
2. `gates.ts`: Added `isSupervisedModeEnabled()` + `WRITEBACK_SUPERVISED_MODE` env var (default ON), added `supervisedMode` to gate summary
3. `command-bus.ts`: Added `markAsSupervisedReview()` and `reviewCommand()` functions with full immutable audit trail
4. `writeback-routes.ts`: Added `POST /writeback/commands/:id/review` endpoint (approve/reject)

### Web — Review Component

5. `WriteReviewBanner.tsx`: Client component showing dry-run transcript preview, safe-harbor tier badge, and approve/reject buttons with reason input

## Design Decisions

- Supervised mode defaults ON (`WRITEBACK_SUPERVISED_MODE=true`) for safety
- Review checkpoint inserts between dry-run and execution: dry-run transcript = "what will happen" preview
- `reviewCommand("approve")` transitions `awaiting_review` → `pending` → `processCommand()`
- `reviewCommand("reject")` transitions `awaiting_review` → `rejected` (terminal)
- No new audit actions needed — reuses `writeback.execute` and `writeback.reject`
- UI component is standalone, composable into any panel (OrdersPanel, etc.)

## Files Changed

- `apps/api/src/writeback/types.ts` (MODIFIED)
- `apps/api/src/writeback/gates.ts` (MODIFIED)
- `apps/api/src/writeback/command-bus.ts` (MODIFIED)
- `apps/api/src/writeback/writeback-routes.ts` (MODIFIED)
- `apps/web/src/components/cprs/WriteReviewBanner.tsx` (NEW)
