# Phase 685 - IMPLEMENT: eMAR Barcode Scan Order Fallback

## Goal

Recover the live eMAR barcode-scan workflow so it stays consistent with the
Medication Schedule view for VEHU patients whose active medication signal is
only recoverable through the order fallback path.

## Problem Statement

During the live clinician audit, DFN 46 showed an active medication in both the
chart Nursing MAR tab and the standalone eMAR Medication Schedule view.
However, `POST /emar/barcode-scan` still returned `activeMedCount: 0` and
`matched: false` for the same patient because it only searched raw
`ORWPS ACTIVE` output and did not reuse the existing order fallback logic.

## Implementation Steps

1. Reuse the existing `buildScheduleFallbackFromOrders(dfn)` path inside
   `apps/api/src/routes/emar/index.ts` when `ORWPS ACTIVE` yields no parsed
   medications for barcode matching.
2. Keep `ORWPS ACTIVE` as the first-read path, but append fallback RPCs to
   `rpcUsed` when the order fallback is needed.
3. Ensure the route returns the fallback-derived medication count and match
   result so the bedside scan workflow matches the visible schedule.
4. Keep `PSB VALIDATE ORDER` behavior unchanged except for the corrected
   medication candidate set.
5. Preserve current audit logging and error semantics.

## Files Touched

- `apps/api/src/routes/emar/index.ts`
- `docs/runbooks/emar-bcma.md`
- `ops/summary.md`
- `ops/notion-update.json`
