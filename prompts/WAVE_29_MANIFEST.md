# Wave 29 Manifest — VistA Upstream & Patch Train + WorldVistA Component Harvest

Reserved range: **447–455** (9 phases)

| Phase  | ID  | Slug                    | Title                                                  |
| ------ | --- | ----------------------- | ------------------------------------------------------ |
| W29-P1 | 447 | reservation-adrs        | Range Reservation + Manifest + Upstream Strategy ADRs  |
| W29-P2 | 448 | upstream-mirror         | Upstream Mirror Tooling + License Snapshotting         |
| W29-P3 | 449 | release-manifest-schema | VistA Base Build Inputs + Release Manifest Schema      |
| W29-P4 | 450 | patch-train-pipeline    | Patch Train Pipeline (build→smoke→contract→evidence)   |
| W29-P5 | 451 | compat-matrix-runner    | Compatibility Matrix Runner (VEHU/PlanVI/ProdBase)     |
| W29-P6 | 452 | component-harvest-adrs  | WorldVistA Component Harvest ADRs                      |
| W29-P7 | 453 | harvest-integration     | Integrate 1 Harvested Component (adapter interface)    |
| W29-P8 | 454 | sbom-license-gates      | Security/SBOM/License Gates for Upstream Artifacts     |
| W29-P9 | 455 | upgrade-go-nogo         | VistA Base Upgrade Go/No-Go Runner + Rollback Runbooks |

## Definition of Done

- Safely ingest upstream sources, build a pinned VistA base, test it, and promote with evidence.
- Optional WorldVistA ecosystem components can be integrated without rewriting core.
- License + SBOM + vulnerability gates exist.
