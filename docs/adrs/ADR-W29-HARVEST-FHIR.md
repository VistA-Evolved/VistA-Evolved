# ADR-W29-HARVEST-FHIR: WorldVistA FHIR Data Service Evaluation

**Status**: Evaluate (future phase)  
**Phase**: 452 (W29-P6)  
**Decision**: Defer integration, evaluate as optional FHIR sidecar

## Context

WorldVistA/FHIR-Data-Service (nodeVistA) provides a FHIR R4 server backed by
VistA RPCs. It could supplement VistA-Evolved's existing RPC-based data access
with a standards-based FHIR API.

## Analysis

### Benefits

- Standards-based data access (FHIR R4)
- Potential interop with external EHR systems
- Patient data export in FHIR Bundle format

### Concerns

- Overlaps with existing RPC-based data pipeline
- Additional Node.js service to maintain
- May not cover all RPCs we already use (138+ in registry)
- FHIR mapping quality is unverified for WorldVistA Docker sandbox

### Comparison with Existing Architecture

- VistA-Evolved already has direct RPC access for 138+ RPCs
- Adding FHIR layer creates redundant data paths
- Migration/interop scenarios (W30) may benefit from FHIR endpoints

## Decision

**Evaluate in a future phase** when migration/interop work (W30) identifies
specific FHIR R4 interop requirements. Do not integrate now to avoid
architecture bloat.

### Prerequisites for Integration

1. W30 migration work identifies FHIR-specific needs
2. FHIR Data Service covers our top-20 most-used RPCs
3. Performance comparison (FHIR vs direct RPC) is favorable

## Consequences

- No code changes in this phase
- FHIR Data Service remains in vendor/ mirror for reference
- Revisit during W30-P1 (Phase 456) FHIR Import Pipeline
