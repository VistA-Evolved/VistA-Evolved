# Phase 306 — Imaging/PACS Validation (W12-P8)

## User Request

Implement IMG domain writeback for PLACE_IMAGING_ORDER and LINK_IMAGING_STUDY.

## Implementation Steps

1. Create `img-executor.ts` — PLACE via ORWDX pipeline, LINK via sidecar
2. Update barrel — add imgExecutor
3. Create `img-contract.test.ts` — 10 contract tests

## Files Touched

- `apps/api/src/writeback/executors/img-executor.ts` (NEW)
- `apps/api/src/writeback/executors/index.ts` (MODIFIED)
- `apps/api/src/writeback/__tests__/img-contract.test.ts` (NEW)
