# Phase 606 — CPRS Cover Sheet Cache Truthfulness Recovery

## User Request

- Continue autonomous VistA-first recovery work.
- Make the full UI truthful and production-grade for end users.
- If something is stale, pending, or incomplete, inspect the original phase intent before editing.

## Problem Statement

The CPRS cover sheet still has a shared truthfulness gap on cache-backed cards.
`useDataCache()` currently collapses backend fetch failures into empty arrays, which lets the cover sheet render empty-state copy such as `No notes on record` or `No recent lab results` even when the live route failed. That violates the Phase 56 contract that Wave 1 panels must use real data and explicit pending posture instead of silent false empties.

## Implementation Steps

1. Inventory the Phase 56 and Phase 79 cover sheet contract plus the current `useDataCache()` fetch path.
2. Add per-domain fetch metadata to `apps/web/src/stores/data-cache.tsx` so callers can distinguish:
   - live success
   - live empty success
   - backend/network failure
   - explicit pending posture from API responses
3. Preserve existing cached data semantics for consumers, but expose a metadata accessor for truthful UI state.
4. Update `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx` so cache-backed cover sheet cards no longer collapse fetch failure into empty-state copy.
5. Reuse the existing pending badge/modal pattern for affected cards rather than inventing a new error UX.
6. Complete cover-sheet action metadata in `apps/web/src/actions/actionRegistry.ts` for any affected cards that still lack a backing action entry.
7. Keep edits minimal and consistent with existing cover sheet pending-state recoveries from Phases 601-605.

## Verification Steps

1. Run targeted web type checking.
2. Start the API cleanly against live VEHU if needed for route verification.
3. Verify representative live Wave 1 routes used by the recovered cards, including at least notes and labs for DFN 46.
4. Regenerate prompt/phase metadata if a new phase folder is added.
5. Run `scripts/verify-latest.ps1` and keep the repo green.

## Files Touched

- prompts/606-PHASE-606-CPRS-COVERSHEET-CACHE-TRUTHFULNESS-RECOVERY/606-01-IMPLEMENT.md
- prompts/606-PHASE-606-CPRS-COVERSHEET-CACHE-TRUTHFULNESS-RECOVERY/606-99-VERIFY.md
- apps/web/src/stores/data-cache.tsx
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx
- apps/web/src/actions/actionRegistry.ts
- docs/runbooks/phase56-wave1-layout.md
- ops/summary.md
- ops/notion-update.json