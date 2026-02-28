# Phase 291 — VERIFY — Certification Evidence Pack v2

## Gates
- G1: `scripts/build-evidence-pack.mjs` exists and is valid JS
- G2: Script scans evidence/ directory recursively
- G3: Script scans docs/runbooks/ for runbook inventory
- G4: Script scans scripts/verify-*.ps1 for verifier inventory
- G5: Script generates manifest JSON with file lists + checksums
- G6: Script generates EVIDENCE_INDEX.md markdown
- G7: Script detects orphaned verifiers (no matching evidence)
- G8: Runbook exists at docs/runbooks/certification-evidence-pack.md
- G9: Prompt files 291-01-IMPLEMENT.md and 291-99-VERIFY.md exist
