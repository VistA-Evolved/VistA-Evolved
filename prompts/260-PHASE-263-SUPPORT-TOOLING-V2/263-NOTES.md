# Phase 263 — Support Tooling v2 — NOTES

## Design: Extension, Not Modification

The base support module (Phase 244: diagnostics.ts, ticket-store.ts,
support-routes.ts) is untouched. Phase 263 adds a parallel
`support-toolkit-v2.ts` store and `support-toolkit-v2-routes.ts` routes.

## Diagnostic Bundle Sections

| Section | What it collects |
|---------|-----------------|
| runtime | Node version, uptime, memory usage |
| environment | Runtime mode, SKU, HL7/OTel/OIDC flags |
| vista-connectivity | VistA host/port (probe via existing endpoint) |
| hl7-engine | Engine enabled state, MLLP port |
| stores | Bundle/correlation store sizes |
| tenant | Tenant ID, config references |

## Ticket Correlations

Support tickets can now be linked to:
- `hl7_event` — specific HL7 message event from the pipeline
- `hl7_dlq` — dead-lettered message
- `posture_gate` — failed posture gate
- `audit_entry` — immutable audit trail entry

## Future Work
- Wire real VistA probe into bundle generation (currently reference only)
- Add circuit breaker state to diagnostic sections
- Export bundles as ZIP with multiple formats
- Add HL7 message replay UI in support page
