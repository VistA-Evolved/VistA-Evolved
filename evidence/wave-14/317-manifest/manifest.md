# Wave 14 — Enterprise Interop Program

> Resolved dynamically: max prompts prefix = 316 → BASE_PHASE = 317

| Phase | Folder | Title | Status | Dependencies |
|-------|--------|-------|--------|-------------|
| 317 | `317-W14-P1-MANIFEST-INTEROP-INVENTORY` | Manifest + Interop Inventory + ADRs | Planned | — |
| 318 | `318-W14-P2-INTEGRATION-CONTROL-PLANE` | Integration Control Plane v2 | Planned | 317 |
| 319 | `319-W14-P3-HL7V2-MESSAGE-PACKS` | HL7v2 Message Pack Standard + Template Library | Planned | 318 |
| 320 | `320-W14-P4-HL7V2-OPS-MATURITY` | HL7v2 Ops Maturity (DLQ, replay, alerting, SLOs) | Planned | 319 |
| 321 | `321-W14-P5-X12-GATEWAY-SERVICE` | X12 Gateway Service v1 (270/271, 837, 835) | Planned | 318 |
| 322 | `322-W14-P6-CLEARINGHOUSE-ADAPTERS` | Clearinghouse Adapter Interface + Sandbox Harness | Planned | 321 |
| 323 | `323-W14-P7-CERTIFICATION-PIPELINE` | Integration Certification Pipeline | Planned | 319, 321, 322 |
| 324 | `324-W14-P8-MARKETPLACE-REGISTRY` | Marketplace/Registry for Integration Packs | Planned | 323 |
| 325 | `325-W14-P9-ONBOARDING-UX` | Customer Integration Onboarding UX | Planned | 324 |

## ADRs
- [ADR-HL7-ENGINE.md](../docs/adrs/ADR-HL7-ENGINE.md)
- [ADR-X12-LIBRARY.md](../docs/adrs/ADR-X12-LIBRARY.md)
- [ADR-CLEARINGHOUSE-TRANSPORT.md](../docs/adrs/ADR-CLEARINGHOUSE-TRANSPORT.md)

## Inventory
- [interop-inventory.md](../docs/integrations/interop-inventory.md)
