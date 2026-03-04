# Phase 542 -- Acceptance Harness (Wave 39, P12)

## Objective

One script that exercises P1-P11 artifacts deterministically. No live VistA
needed (file checks + existing verifier aggregation). Store evidence in
evidence/wave-39/.

## Artifact

### `scripts/verify-wave39-acceptance.ps1`

Orchestrates all 11 per-phase verifiers + 3 meta-gates:

| Gate    | Check                                                               |
| ------- | ------------------------------------------------------------------- |
| G01-G11 | Re-run each verify-phase{531-541}-\*.ps1                            |
| G12     | Evidence completeness: all 11 verify-result.json exist with fail==0 |
| G13     | Key artifact file-existence (catalogs, FSMs, routes, data files)    |
| G14     | UI parity gap gate: node scripts/qa-gates/ui-parity-gate.mjs passes |

### Evidence output

`evidence/wave-39/542-W39-P12-ACCEPTANCE-HARNESS/acceptance-report.json`

## Files touched

- `scripts/verify-wave39-acceptance.ps1` (NEW)
- `prompts/542/542-01-IMPLEMENT.md` (NEW)
- `prompts/542/542-99-VERIFY.md` (NEW)
