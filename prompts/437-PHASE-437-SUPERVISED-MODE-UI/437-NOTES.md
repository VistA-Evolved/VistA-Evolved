# Phase 437 — Notes

## Architecture

The supervised review checkpoint sits between dry-run and execution in the command bus lifecycle.
Safe-harbor v2 defines 5 tiers: safe-harbor (7 RPCs), supervised (7 RPCs), experimental (2), blocked (1), infrastructure (2).
Supervised-tier RPCs (ORWDX SAVE, ORWOR1 SIG, etc.) are the target for this review gate.

## Integration Points

- `markAsSupervisedReview()` should be called from `submitCommand()` when the target RPC's safe-harbor tier is "supervised" and `isSupervisedModeEnabled()` is true
- `WriteReviewBanner` should be mounted in `OrdersPanel` before sign execution
- Both are ready for wiring — this phase provides the infrastructure, next phases integrate
