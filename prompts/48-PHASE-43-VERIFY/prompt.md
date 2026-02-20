# Phase 43 VERIFY — Operational Loop Must Be Real

## User Request
Verify that Phase 43 claim quality loop actually works end-to-end:
- G43-1: Ack/status ingestion with synthetic payloads, claims history
- G43-2: Remits ingestion parses sample remittance, updates claim
- G43-3: Workqueues UI shows items with reasons/remediation
- G43-4: Rules engine applied in scrubber, changes audited
- G43-5: Security/regression (verify-latest, PHI, secrets)

## Verification Steps
1. Start API with FULL_SUITE
2. Create synthetic claim → submit → ingest ack → verify history
3. Ingest remittance → verify claim status transition
4. Verify workqueue items from rejections/denials
5. Verify payer rules evaluation + audit logging
6. Run security scans (PHI, secrets)
7. Verify web UI renders workqueue/rules tabs

## Files Touched
- scripts/verify-phase43-claim-quality.ps1
- prompts/48-PHASE-43-VERIFY/prompt.md
