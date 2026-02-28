# Phase 249 -- Notes

## Edge Cases

- Scorecard only runs on non-PR events (requires `id-token: write` which forks lack)
- Trivy container scan requires Docker; filesystem scan is a fallback
- Grype depends on SBOM artifacts from the sbom job (chained dependency)
- License check regex may not catch all SPDX license expressions (e.g. `GPL-2.0-or-later WITH Classpath-exception-2.0`)

## Follow-ups

- Switch vulnerability mode from report-only to enforce once baseline is established
- Enable cosign in supply-chain-attest.yml to complete the signing chain
- Consider adding Dependabot alerts integration
- Add badge for Scorecard score in README.md

## Gotchas

- Trivy action uses `aquasecurity/trivy-action@master` -- pin to a specific version for production
- Grype scan uses `anchore/scan-action/download-grype@v4` -- verify compatibility
- SARIF upload requires `security-events: write` permission in workflow
- Scorecard results must not be published for forks (privacy/security)
