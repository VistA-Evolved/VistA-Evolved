# Phase 531 — VERIFY: VA + IHS UI Estate Catalog

## Gates

| #   | Gate                 | Criteria                                                     |
| --- | -------------------- | ------------------------------------------------------------ |
| G1  | Schema exists        | `data/ui-estate/ui-estate.schema.json` is valid JSON Schema  |
| G2  | VA catalog exists    | `data/ui-estate/va-ui-estate.json` validates against schema  |
| G3  | IHS catalog exists   | `data/ui-estate/ihs-ui-estate.json` validates against schema |
| G4  | VA surface count     | VA catalog has >= 20 systems with >= 80 surfaces total       |
| G5  | IHS surface count    | IHS catalog has >= 4 systems with >= 15 surfaces total       |
| G6  | Coverage fields      | Every surface has all 6 coverage booleans                    |
| G7  | Priority assigned    | Every surface has a valid priority level                     |
| G8  | Migration status     | Every surface has a valid migrationStatus                    |
| G9  | Build script runs    | `node scripts/ui-estate/build-ui-estate.mjs` exits 0         |
| G10 | Gap report generated | `data/ui-estate/ui-gap-report.json` exists after build       |
| G11 | Gap report valid     | Gap report has totals + per-system breakdown                 |
| G12 | VE equivalents       | Surfaces with present_ui=true have veEquivalent filled       |
| G13 | RPC cross-ref        | >= 50 surfaces reference target RPCs                         |
| G14 | Docs exist           | `docs/ui-estate/README.md` exists                            |
| G15 | No PHI               | No patient names, SSNs, or DFNs in any catalog file          |

## Verification Script

```powershell
.\scripts\verify-phase531-ui-estate-catalog.ps1
```
