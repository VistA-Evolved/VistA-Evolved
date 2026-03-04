# Phase 452 — W29-P6: Component Harvest ADRs

## Objective

Create detailed architectural decision records for each WorldVistA OSS component
identified in ADR-W29-OSS-HARVEST.md. One ADR per component with integration
boundary, adapter design, and deployment strategy.

## Deliverables

| #   | File                                     | Purpose                                 |
| --- | ---------------------------------------- | --------------------------------------- |
| 1   | `docs/adrs/ADR-W29-HARVEST-DASHBOARD.md` | Dashboard/Rules Engine integration plan |
| 2   | `docs/adrs/ADR-W29-HARVEST-FHIR.md`      | FHIR Data Service sidecar evaluation    |
| 3   | `docs/adrs/ADR-W29-HARVEST-POPHEALTH.md` | popHealth CQM evaluation                |
| 4   | `docs/vista/component-inventory.json`    | Machine-readable component catalog      |

## Acceptance Criteria

1. Dashboard ADR includes adapter interface, event bus mapping, Docker config
2. FHIR and popHealth ADRs include evaluate/skip decision with reasoning
3. Component inventory JSON has all 5 components with status field
