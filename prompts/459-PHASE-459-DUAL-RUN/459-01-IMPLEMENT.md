# Phase 459 — Dual-Run Harness (W30-P4)

## Goal
Create a dual-run framework that executes operations against both VistA (source of truth)
and the migration target simultaneously, capturing discrepancies for reconciliation.

## Deliverables
1. `apps/api/src/migration/dual-run.ts` — Dual-run harness + comparison engine
2. Update `apps/api/src/routes/migration-routes.ts` — dual-run status + control endpoints
3. `docs/runbooks/dual-run-harness.md` — operations guide

## Design
- Shadow mode: reads run against both, VistA response returned, discrepancies logged
- Compare mode: both results returned side-by-side for manual review  
- Per-operation comparison with field-level diff detection
- Configurable via DUAL_RUN_MODE env var (off/shadow/compare)
