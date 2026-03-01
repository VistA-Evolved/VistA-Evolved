# Phase 415 — W24-P7: Cutover + Rollback + DR Rehearsal — IMPLEMENT

## Objective
Create structured cutover and rollback runbook templates with DR rehearsal
integration for pilot go-live events.

## Deliverables
1. `docs/pilots/cutover/CUTOVER_TEMPLATE.md` — 7-section cutover runbook
2. `docs/pilots/cutover/ROLLBACK_TEMPLATE.md` — 7-section rollback runbook

## Cutover Sections
Pre-Cutover (T-7d, T-1d), Lock, Migrate, Validate, Unlock, Post-Cutover, Signoff

## Rollback Sections
Criteria (6 triggers), Decision, Stop+Protect, Restore, Revert Config,
Validate, Unlock, Post-Rollback, DR Integration, Signoff

## Key Patterns
- Maintenance mode gating (drain timeout 30s before any destructive operation)
- Backup hash/checksum verification at every restore
- 4-phase cutover: Lock -> Migrate -> Validate -> Unlock
- 5-phase rollback: Stop -> Restore -> Revert -> Validate -> Unlock
- DR rehearsal requirement: within 7 days of planned cutover
