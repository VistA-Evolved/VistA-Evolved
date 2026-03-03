# Phase 542 -- VERIFY -- Acceptance Harness

## Gates (6)

| # | Gate | Check |
|---|------|-------|
| 1 | Script exists | `scripts/verify-wave39-acceptance.ps1` present |
| 2 | Script runs without error | Exit code captured and reported |
| 3 | Evidence dir created | `evidence/wave-39/542-W39-P12-ACCEPTANCE-HARNESS/` exists |
| 4 | Acceptance report written | `acceptance-report.json` present and valid JSON |
| 5 | All 11 phases pass | acceptanceReport.phasesPass == 11 |
| 6 | No PHI in evidence | No SSN/DOB patterns in evidence directory |
