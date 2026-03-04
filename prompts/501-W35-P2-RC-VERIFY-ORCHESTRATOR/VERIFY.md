# Phase 501 — VERIFY

## Gates

1. `scripts/verify-rc.ps1` exists and is syntactically valid PowerShell
2. Running verify-rc.ps1 produces report.json with gateName/status/duration fields
3. Running verify-rc.ps1 produces output.txt with human-readable summary
4. verify-latest.ps1 delegates to verify-rc.ps1

## Evidence

- `evidence/wave-35/501-W35-P2-RC-VERIFY-ORCHESTRATOR/verify-rc/report.json`
- `evidence/wave-35/501-W35-P2-RC-VERIFY-ORCHESTRATOR/verify-rc/output.txt`
