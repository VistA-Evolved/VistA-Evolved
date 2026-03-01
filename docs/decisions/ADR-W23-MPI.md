# ADR: MPI Strategy — Internal Matching vs OpenCR

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 399 (W23-P1)

## Context

Cross-system patient identity resolution is critical for interoperability.
Patients may be known by different IDs in different systems (MRN, national ID,
payer ID). An MPI (Master Patient Index) or Client Registry resolves these
to a single identity.

## Decision

**Internal deterministic matching engine** with an optional OpenCR adapter for
deployments that need probabilistic matching or OpenHIE compliance.

### Rationale

- Deterministic matching (exact match on identifiers + demographics) covers
  80%+ of use cases and is auditable with zero false positives.
- Probabilistic matching (fuzzy name/DOB/address) is needed for LMIC settings
  with poor data quality, but requires admin review of suggestions.
- OpenCR provides production-grade probabilistic matching + FHIR facade.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Internal only | Simple, deterministic, auditable | No fuzzy matching |
| OpenCR only | Full MPI with probabilistic | Heavy dependency |
| **Hybrid (chosen)** | Best of both | Two matching paths |

## Consequences

**Positive:**
- Deterministic matching works offline, no external deps
- OpenCR adapter enables probabilistic matching when needed
- All merge/link actions are audited

**Negative:**
- Probabilistic matching without OpenCR is limited to admin suggestions
- OpenCR integration requires Docker sidecar management
