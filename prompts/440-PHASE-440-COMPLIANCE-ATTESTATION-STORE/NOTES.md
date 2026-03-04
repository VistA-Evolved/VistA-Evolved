# Phase 440 — NOTES

## Attestation Store Design

- Same in-memory + FIFO pattern as imaging-worklist (Phase 23), telehealth rooms (Phase 30)
- Hash chain uses SHA-256, truncated to 32 hex chars (16 bytes)
- Evidence types: file (local path), url (external), phase_ref (PhaseNN), test_result (gate output)
- Review cycle defaults to 90 days; configurable per attestation
- Integrates with Phase 439 regulatory classification engine via shared RegulatoryFramework type
- Existing compliance-matrix (Phase 315) has 23 requirements across 3 frameworks — attestation store records the evidence that those requirements are met
