# ADR: OSS Integration Strategy

**Status:** Accepted
**Date:** 2026-02-28
**Phase:** 257 (Wave 8 P1)

## Context

VistA-Evolved needs to consolidate its integration strategy across HL7v2,
FHIR, payer connectivity, data portability, and operational tooling. The
repo already has significant infrastructure built in prior phases. This ADR
locks the "make vs buy" decisions before Wave 8 extends these subsystems.

### Current State Inventory

| Subsystem           | Status  | Key Assets                                                                                                    |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| **HL7v2 Engine**    | Working | MLLP server/client, parser, ACK gen, 4 msg packs (ADT/ORM/ORU/SIU), routing/dispatch layer, 3 route files     |
| **FHIR R4 Gateway** | Working | VistA mappers, CapabilityStatement, SMART on FHIR, bearer auth, scope enforcement, search params, ETag cache  |
| **RCM/Payer**       | Working | 13 connectors, 5 markets (US/PH/AU/NZ/SG), X12 5010 + PhilHealth CF1-CF4, 9-state claim FSM, credential vault |
| **Onboarding**      | Working | Admin wizard, preflight checks, site config, module guard, DB-backed entitlements                             |
| **Support Tooling** | Working | Diagnostics engine, ticket store, WS debug console, break-glass, ops admin, posture checks                    |
| **Data Export**     | Working | Export engine + formats, record portability (C-CDA/FHIR), audit S3 shipping, migration pipeline               |

## Decisions

### D1: HL7v2 Engine — Keep In-Process Node.js Engine

**Decision:** Continue with the in-process MLLP engine (ADR-hl7-engine-choice.md).

Rationale:

- Engine already built and working (Phase 238)
- `node-hl7-client`/`node-hl7-server` handle MLLP framing
- Custom routing + dispatch layer integrates with VistA interop
- No Mirth/NiFi/Camel deployment complexity

What Wave 8 adds:

- DB-backed message persistence (append-only `hl7_message_events`)
- PHI-safe logging (never log raw HL7 segments)
- Replay harness for deterministic testing
- Tenant-scoped routing with per-tenant channel isolation

### D2: FHIR R4 — Keep Existing Gateway, Add Bulk Export Pattern

**Decision:** Keep the existing FHIR R4 gateway. Do NOT add a sidecar
HAPI FHIR server — it would duplicate the VistA mapper layer.

What Wave 8 adds:

- FHIR-like patient chart export (Patient + Encounter + Observation + MedicationRequest bundles)
- Tenant-scoped export with audit trail
- No full FHIR Bulk Data API ($export) yet — deferred to Wave 9 if needed

### D3: Payer Adapters — Formalize Adapter SDK from Existing Connectors

**Decision:** Extract a formal `PayerAdapter` SDK interface from the
existing 13 connectors. Do NOT add new external dependencies.

What Wave 8 adds:

- Standardized adapter interface with idempotency keys
- Sandbox harness with recorded fixtures for contract testing
- Per-tenant and per-payer throttling/backpressure
- Golden run evidence automation

### D4: K8s/DR Tooling — Keep Existing Scripts, Reference Velero

**Decision:** Keep `scripts/dr/backup.mjs` and `restore-verify.mjs` as
the primary DR toolchain. Reference Velero as the recommended tool for
K8s-native backup of PV/PVC when clusters are in use, but do NOT mandate
Velero — the current script-based approach works for single-node and
Docker Compose deployments.

### D5: Support Tooling — Extend Existing, Add HL7 Message Viewer

**Decision:** Extend the existing support console (diagnostics, ticket
store, break-glass) with HL7 message viewer and replay capabilities.
PHI access requires break-glass. All actions audited.

### D6: Data Portability — Extend Export Engine for FHIR + Tenant Export

**Decision:** Extend the existing export engine and record portability
modules. Add tenant-scoped config + audit export. No new external
services needed.

## Alternatives Not Chosen

| Option                         | Why Not                                                                   |
| ------------------------------ | ------------------------------------------------------------------------- |
| Mirth Connect                  | Java process, MPL license risk, complex deploy — HL7 engine already built |
| HAPI FHIR Server sidecar       | Duplicates VistA mapper layer, adds Java dependency                       |
| Apache NiFi/Camel              | Over-engineered for current scale, Java dependency                        |
| External EDI clearinghouse SDK | Already have 13 connectors — formalize, don't replace                     |
| Velero (mandatory)             | Good reference but not needed until K8s clusters in use                   |

## Consequences

**Positive:**

- No new runtime dependencies
- Consistent TypeScript/Node.js stack throughout
- All integration patterns already proven in prior phases
- Clear extension points for each Wave 8 phase

**Negative:**

- Node.js HL7 engine is less battle-tested than Mirth for very high volume
- No GUI-based integration mapping (must be code-first)
- Bulk FHIR export deferred — may need Wave 9

## References

- ADR-hl7-engine-choice.md (Phase 238)
- apps/api/src/hl7/ — HL7v2 engine
- apps/api/src/fhir/ — FHIR R4 gateway
- apps/api/src/rcm/ — RCM subsystem
- apps/api/src/exports/ — Export engine
- apps/api/src/support/ — Support tooling
