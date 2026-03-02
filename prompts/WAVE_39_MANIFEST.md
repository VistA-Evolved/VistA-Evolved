# Wave 39 — VA/IHS GUI Parity + Workflow Migration Program

## Phase Map

| Phase | Code | Title |
|-------|------|-------|
| 531 | P1 | VA + IHS UI Estate Catalog |
| 532 | P2 | UI Parity Gap Gate (CI) |
| 533 | P3 | Workflow State Switchboard |
| 534 | P4 | Browser Terminal (xterm.js) |
| 535 | P5 | MHA v1 (LForms questionnaire engine) |
| 536 | P6 | MHA VistA Writeback (TIU) |
| 537 | P7 | Clinical Procedures v1 (CP/MD) |
| 538 | P8 | Imaging Capture + Attach (SIC-like) |
| 539 | P9 | Scheduling Parity vs VSE |
| 540 | P10 | JLV-style Longitudinal Viewer v1 |
| 541 | P11 | VA GUI Hybrids Capability Map |
| 542 | P12 | Acceptance Harness |

## Scope

Catalog, gap-gate, and begin migrating the top-priority VA + IHS
desktop GUI workflows into VistA-Evolved's web platform. Each legacy
system (BCMA, VistA Imaging, IVS/SIC, MHA, VSE/VS GUI, CP/MD, JLV,
VistAWeb, and IHS RPMS/iCare/BPRM/BSDX) gets an entry in a
machine-readable UI estate catalog. A CI gap gate enforces forward
progress. New capabilities (browser terminal, LForms, clinical
procedures, imaging capture, scheduling parity, longitudinal viewer)
are scaffolded with VistA-first wiring.

## Meta-Rules

1. **DO NOT REWRITE ARCHITECTURE.** Extend existing patterns and modules.
2. **PROMPTS DIR IS SOURCE OF TRUTH.**
3. **PHASE GATING.** Do not advance until VERIFY passes.
4. **EVIDENCE REQUIRED.** Every phase produces evidence in `evidence/wave-39/`.
5. **NO PHI IN EVIDENCE.**
6. **FORK FIRST** for OHIF/Orthanc/LForms/xterm (npm/Docker, never vendor).

## Dependencies

- Phase 106: VistA alignment banner + rpc-coverage.json
- Phase 161: CPRS alignment verification
- Phase 165: Specialty coverage score QA ladder
- config/modules.json, config/capabilities.json, config/skus.json
- docs/grounding/parity-matrix.json
