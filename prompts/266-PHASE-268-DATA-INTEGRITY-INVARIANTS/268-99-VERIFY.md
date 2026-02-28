# Phase 268 — VERIFY — Data Integrity & Clinical Invariants

## Gates

| # | Gate | Pass Criteria |
|---|------|---------------|
| 1 | Invariant test files exist | ≥4 test files in `tests/invariants/` |
| 2 | Patient identity checks | DFN consistency, no cross-patient data |
| 3 | Encounter linkage checks | Visit/encounter/order relationships valid |
| 4 | Medication transitions | Status FSM validated (active→discontinued, etc.) |
| 5 | Text truncation checks | VistA text fields not silently truncated |
| 6 | Drift detector script | `scripts/clinical-invariants-ci.mjs` present |
| 7 | Bad fixture fails suite | Synthetic bad fixture triggers failure |
| 8 | Evidence captured | `evidence/wave-8/P3-data-integrity/` populated |
