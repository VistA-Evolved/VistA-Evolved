# Phase 532 — VERIFY: UI Parity Gap Gate

## Gates (10)

| Gate | Check                                                                   |
| ---- | ----------------------------------------------------------------------- |
| G1   | `scripts/qa-gates/ui-parity-gate.mjs` exists                            |
| G2   | Gate script exits 0 when run against current catalogs                   |
| G3   | `data/ui-estate/parity-baseline.json` exists and is valid JSON          |
| G4   | Baseline contains `covered`, `total`, `rpcWired`, `timestamp` fields    |
| G5   | `--update-baseline` flag writes new baseline without error              |
| G6   | Regression detection: artificially reducing covered count causes exit 1 |
| G7   | `.github/workflows/ci-ui-parity-gate.yml` exists                        |
| G8   | Workflow YAML references the gate script                                |
| G9   | No PHI in baseline or gate output                                       |
| G10  | Evidence directory exists                                               |
