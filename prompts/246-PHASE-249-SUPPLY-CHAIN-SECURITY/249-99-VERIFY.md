# Phase 249 -- Verification Steps

## Verification Steps

1. Run local verifier:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/verify-phase249-supply-chain.ps1
   ```
2. Confirm CI workflow file structure (6 jobs: scorecard, sbom, trivy, grype, license, attest)
3. Confirm policy file is valid JSON with denied + allowed licenses
4. CI evidence: push to main and check GitHub Actions for supply-chain-security workflow

## Acceptance Criteria

- Verifier passes all gates (workflow structure + policy + prompts + evidence)
- CI workflow triggers on push to main (verified by workflow YAML structure)
- Policy file has GPL/AGPL in denied list
- SARIF upload configured for GitHub Security tab

## Evidence

- `/evidence/wave-7/P2/verify-output.txt` -- verifier output
- CI artifacts (when run in GitHub Actions):
  - scorecard.json
  - sbom-api.cdx.json, sbom-web.cdx.json, sbom-portal.cdx.json
  - trivy-results.sarif
  - grype-api.json, grype-web.json, grype-portal.json
