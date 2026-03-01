# Phase 413 — W24-P5: Data Migration Rehearsal Program — IMPLEMENT

## Objective
Validate that the full data migration pipeline (SQLite-to-PG, payer seed,
VistA provisioning, backup/restore) is repeatable, idempotent, and has
rollback capability.

## Deliverables
1. `scripts/migrate-rehearsal.ps1` -- migration rehearsal runner
   - 8 sections, 25 gates (3 live-skippable)
   - Modes: dry-run (default), apply, rollback, verify
   - Evidence output: `evidence/wave-24/413-migration/`

## Sections
| # | Section | Gates |
|---|---------|-------|
| 1 | Migration Infrastructure | 5 |
| 2 | Payer Seed Data | 5 |
| 3 | VistA Provisioning | 4 |
| 4 | Dry-Run Validation | 2 |
| 5 | Idempotency | 2 |
| 6 | Live Connectivity | 3 (live) |
| 7 | Rollback Capability | 3 |
| 8 | Evidence | 1 |
