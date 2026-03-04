# Phase 454 — VERIFY

| #   | Gate        | Check                                                      |
| --- | ----------- | ---------------------------------------------------------- |
| 1   | SBOM gen    | `scripts/sbom/generate-sbom.mjs` exits 0                   |
| 2   | Policy file | `scripts/sbom/license-policy.json` has allow + deny arrays |
| 3   | Checker     | `scripts/sbom/check-licenses.mjs` exits 0 (no violations)  |
