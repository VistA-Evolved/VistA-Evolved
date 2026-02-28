# Phase 306 — Imaging/PACS Validation — Evidence

## Files Created
- `apps/api/src/writeback/executors/img-executor.ts` (~185 lines)
- `apps/api/src/writeback/__tests__/img-contract.test.ts` (~100 lines)

## Files Modified
- `apps/api/src/writeback/executors/index.ts` — added imgExecutor

## Design
- PLACE_IMAGING_ORDER: ORWDX LOCK+SAVE+UNLOCK (standard pipeline)
- LINK_IMAGING_STUDY: local sidecar (no VistA RPC, links Phase 23 worklist)
