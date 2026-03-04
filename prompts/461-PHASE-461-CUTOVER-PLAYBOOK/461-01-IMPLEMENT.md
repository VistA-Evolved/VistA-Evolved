# Phase 461 — Cutover Playbook (W30-P6)

## Goal

Create a structured cutover playbook with automated gate checks for
transitioning from VistA-only to VistA-Evolved. Includes pre-cutover
validation, cutover execution steps, and post-cutover verification.

## Deliverables

1. `scripts/migration/cutover-gates.ps1` — Automated pre/post cutover gate checks
2. `apps/api/src/migration/cutover-tracker.ts` — Cutover state machine + status tracking
3. `docs/runbooks/cutover-playbook.md` — Detailed step-by-step cutover guide
