# Phase 585 — Notes

> Wave 42: Production Remediation | Phase 585

## Why This Phase Exists

Phase 11 + 12 of the remediation plan: store policy enforcement ensures no critical in-memory stores remain in rc/prod; Helm and CI/CD fixes make the system deployable and prevent regressions via gauntlet gates.

## Key Decisions

- **YOUR-ORG placeholder**: Replace with actual org name or parameterize for multi-tenant GitOps.
- **Gauntlet blocks merge**: Fast suite must pass for PR merge; full suite can be advisory.

## Deferred Items

- ArgoCD sync automation — manual sync acceptable for initial cutover.
- Gauntlet PR comment bot — can use GitHub Actions artifact upload + summary.
