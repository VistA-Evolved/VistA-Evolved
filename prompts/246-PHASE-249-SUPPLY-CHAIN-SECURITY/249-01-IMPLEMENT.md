# Phase 249 -- Supply Chain Security Baseline

## Implementation Steps

1. Created unified supply chain CI workflow: `.github/workflows/supply-chain-security.yml`
   - **OpenSSF Scorecard** job: runs on main pushes + weekly schedule, outputs JSON artifact
   - **SBOM Generation** job: generates CycloneDX SBOMs for API, Web, Portal using Syft
   - **Trivy Scan** job: filesystem vuln scan + SARIF upload to GitHub Security tab
   - **Grype Scan** job: consumes Syft SBOMs, scans for vulns, checks CRITICAL count
   - **License Check** job: scans SBOMs for denied licenses (GPL/AGPL/SSPL)
2. Created supply chain policy: `.github/supply-chain-policy.json`
   - Denied licenses: GPL-2.0-only, GPL-3.0-only, AGPL-3.0-only, AGPL-3.0-or-later, SSPL-1.0
   - Allowed licenses: MIT, Apache-2.0, BSD-2/3-Clause, ISC, etc.
   - Exception: k6 (AGPL-3.0) -- dev tool only, not distributed
   - Vulnerability mode: report-only on CRITICAL (configurable to enforce)
3. Preserved existing `supply-chain-attest.yml` workflow (no modifications)
4. All jobs are report-only initially (exit-code: 0) to avoid breaking dev productivity

## Files Touched

- `.github/workflows/supply-chain-security.yml` (new)
- `.github/supply-chain-policy.json` (new)
- `scripts/verify-phase249-supply-chain.ps1` (new)
- `prompts/246-PHASE-249-SUPPLY-CHAIN-SECURITY/249-01-IMPLEMENT.md` (this file)
- `prompts/246-PHASE-249-SUPPLY-CHAIN-SECURITY/249-99-VERIFY.md`
- `prompts/246-PHASE-249-SUPPLY-CHAIN-SECURITY/249-NOTES.md`

## Decisions

- New workflow alongside existing `supply-chain-attest.yml` (complements, not replaces)
- Report-only initially; enforce minimum thresholds once baseline is established
- SARIF upload enables GitHub Security tab integration (Trivy findings appear as code scanning alerts)
- Filesystem scan (not image scan) because images are built in cd-deploy.yml
