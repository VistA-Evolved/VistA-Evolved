# Phase 28 VERIFY -- Enterprise Intake OS Gates

## User Request

Verify Phase 28 Enterprise Intake OS across 8 gate categories (G28-0 through G28-7).

## Gates

### G28-0 Prompts ordering integrity

- Confirm prompts folder contiguous, no duplicates, headers match filenames.

### G28-1 Full regression

- Run verify-latest.ps1: must be GREEN.

### G28-2 Determinism + replay

- Record 30 transcripts (inputs + answers) and replay.
- NextQuestion outputs must match hash-identically under rules provider.

### G28-3 Coverage

- core-enterprise required items must be asked before completion, regardless of complaint.

### G28-4 Proxy/minor/sensitivity

- proxy cannot see sensitive categories when restricted
- protected minor and adult age gates behave per config
- access log events are recorded for key actions

### G28-5 Security/PHI

- No PHI in logs
- secret scan clean
- kiosk timeout works; resume token contains no PHI

### G28-6 UI dead-click audit

- portal + kiosk + clinician intake panel: 0 dead clicks
- submit, review, export draft note works

### G28-7 LHC-Forms integration validity

- NOTE: Phase 28 uses custom renderers, NOT LHC-Forms. This gate validates
  that the custom questionnaire renderer supports skip logic (enableWhen),
  produces QR-like output, and captures audit events.

## Deliverables

- scripts/verify-phase1-to-phase28.ps1
- docs/runbooks/phase28-verify-report.md
- Commit: "Phase 28 VERIFY: Intake OS gates"

## Files Touched

- prompts/30-PHASE-28-ENTERPRISE-INTAKE-OS/30-02-enterprise-intake-os-VERIFY.md
- scripts/verify-phase1-to-phase28.ps1
- scripts/verify-latest.ps1
- docs/runbooks/phase28-verify-report.md
- ops/summary.md
- ops/notion-update.json
