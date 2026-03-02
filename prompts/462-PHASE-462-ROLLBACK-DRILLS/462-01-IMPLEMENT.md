# Phase 462 — Rollback Drills (W30-P7)

## Goal
Create automated rollback drill scripts and a rollback executor that can
revert from VistA-Evolved back to VistA-only operation, with timing and
verification of the rollback procedure.

## Deliverables
1. `scripts/migration/rollback-drill.ps1` — Automated rollback drill runner
2. `apps/api/src/migration/rollback-executor.ts` — Rollback state machine + execution log
3. `docs/runbooks/rollback-drills.md` — Rollback drill guide
