# Phase 460 — Reconciliation Engine (W30-P5)

## Goal

Build a reconciliation engine that compares data between VistA source and
migration target, detecting and categorizing discrepancies for resolution.

## Deliverables

1. `apps/api/src/migration/recon-engine.ts` — Reconciliation engine with rule-based matching
2. Update `apps/api/src/routes/migration-routes.ts` — recon endpoints
3. `docs/runbooks/recon-engine.md` — operations guide

## Design

- Record-level comparison with configurable match keys
- Discrepancy categories: missing-in-target, missing-in-source, field-mismatch, data-quality
- Resolution workflow: auto-resolve, manual-review, accept-difference
- Per-entity-type recon rules (patient, problems, meds, allergies)
