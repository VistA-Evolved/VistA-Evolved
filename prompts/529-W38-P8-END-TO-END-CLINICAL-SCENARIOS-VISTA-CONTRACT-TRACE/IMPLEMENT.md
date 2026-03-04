# Phase 529 — C8: End-to-End Clinical Scenarios + VistA Contract Traces

## Goal

Document 3 synthetic clinical scenarios that exercise ED→OR→ICU flow,
device ingest→observation, and radiology order→report pipelines.
Include VistA RPC contract traces for each step.

## Implementation

- `docs/runbooks/wave38-clinical-scenarios.md`
- Scenario 1: ED trauma → OR surgery → ICU recovery
- Scenario 2: Device monitor → vitals → clinical observation
- Scenario 3: Radiology order → protocol → report → critical alert
