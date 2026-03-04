# Phase 454 — W29-P8: SBOM + License Policy Gates

## Objective

Generate Software Bill of Materials and enforce license policy gates
in the patch train staging pipeline.

## Deliverables

| #   | File                               | Purpose                                      |
| --- | ---------------------------------- | -------------------------------------------- |
| 1   | `scripts/sbom/generate-sbom.mjs`   | SBOM generator (reads package.json + vendor) |
| 2   | `scripts/sbom/license-policy.json` | Allowed/denied license list                  |
| 3   | `scripts/sbom/check-licenses.mjs`  | Policy checker against SBOM                  |

## Acceptance Criteria

1. SBOM contains npm deps + vendor components
2. License policy has allow/deny lists
3. Checker exits non-zero if denied license found
