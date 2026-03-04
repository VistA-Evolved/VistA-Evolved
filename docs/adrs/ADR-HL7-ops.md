# ADR: HL7 Interface Engine / Ops Selection

**Status:** Accepted
**Date:** 2026-03-01
**Context:** Wave 12 (HL7 operations across multiple phases)

## Decision

**Keep the built-in HL7 engine** implemented in the VistA-Evolved API layer.
Do NOT introduce an external interface engine (NextGen Connect, Mirth, etc.)
at this time.

## Context

VistA-Evolved needs HL7v2 messaging for:

- ADT (A01/A02/A03) inbound/outbound
- ORM (O01) order transmission
- ORU (R01) results ingest
- VistA HLO interop telemetry

Options considered:

1. **Built-in HL7 engine** -- already implemented
2. **NextGen Connect (Mirth Connect)** -- Java-based, enterprise
3. **HAPI FHIR + HL7 modules** -- Java, FHIR-first
4. **Google Cloud Healthcare API HL7v2** -- cloud-only

## Rationale

- Built-in HL7 engine already exists:
  - `apps/api/src/routes/vista-interop.ts` (Phase 21, HLO telemetry)
  - HL7 pack registry with message validation
  - HL7 pipeline with event tracking and stats
  - FHIR R4 endpoints with resource facades
- Phase 290 added interop certification harness (FHIR conformance + HL7 pack validation)
- VistA's own HLO (HL7 Optimized) handles VistA-side message routing
- Adding Mirth would:
  - Introduce Java dependency
  - Require separate deployment/monitoring
  - Duplicate routing logic already in the API
  - Add operational complexity with minimal benefit at current scale

## When to Reconsider

- **If 5+ external systems** need HL7v2 interfaces simultaneously
- **If HL7 FHIR-to-v2 translation** volume exceeds API capacity
- **If regulatory audit** requires a dedicated interface engine audit trail
  (current hash-chained audit may satisfy this)

## Consequences

- Continue using built-in HL7 engine in API layer
- Wave 12 P305 (ADT) and P304 (Lab) may use HL7 message bridges
- All HL7 messages route through existing pipeline with event tracking
- No additional Java/Docker dependencies
- Mirth/NextGen Connect integration remains a future option via adapter pattern

## Alternatives Rejected

| Option                  | Reason                                           |
| ----------------------- | ------------------------------------------------ |
| NextGen Connect (Mirth) | Java dependency, operational overhead, premature |
| HAPI FHIR               | Java, overlaps with existing FHIR endpoints      |
| Cloud Healthcare API    | Vendor lock-in, not self-hostable                |
