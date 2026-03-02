# 376-01-IMPLEMENT — GA Certification Runner (W20-P7)

## Scope
Phase 376 builds the GA certification runner that orchestrates all
verification gates and produces evidence artifacts:
- `scripts/verify-ga.ps1` — master GA verifier
- Runs ga-checklist.ps1 as the gate runner
- Collects evidence into `/evidence/wave-20/GA-CERT/<timestamp>/`
- Generates a GA certification report (JSON + markdown)
- Exit code 0 = all gates pass, non-zero = failures

## Files to Create / Modify
- `scripts/verify-ga.ps1` — master GA certification runner
- `prompts/376-W20-P7-GA-CERT-RUNNER/376-01-IMPLEMENT.md`
- `prompts/376-W20-P7-GA-CERT-RUNNER/376-99-VERIFY.md`

## Prompt ref
prompts/376-W20-P7-GA-CERT-RUNNER/
