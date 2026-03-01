# ADR: Document Exchange — XDS.b vs MHD vs FHIR-Only

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 399 (W23-P1)

## Context

Document exchange is foundational for cross-org interoperability: referrals,
discharge summaries, imaging reports, and lab results must flow between systems.

Three approaches exist:
- **IHE XDS.b** — mature, SOAP-based document registry/repository
- **IHE MHD** — FHIR-based facade over XDS.b concepts
- **FHIR-only** — DocumentReference + Bundle without IHE profiles

## Decision

**FHIR-first with MHD alignment**: implement a DocumentReference-based
registry/repository inside the platform, aligned with MHD profiles so that
XDS.b integration is achievable via a bridge adapter.

### Rationale

- MHD provides the best of both worlds: FHIR-native API with XDS.b semantics.
- US deployments prefer FHIR-only (TEFCA, ONC). EU deployments may need XDS.b.
- Building the DocumentReference model first means XDS.b is an adapter, not a
  rewrite.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| XDS.b only | Full IHE compliance | SOAP complexity, heavy |
| MHD only | FHIR-native + XDS semantics | Still needs XDS backend |
| FHIR-only | Simplest | No IHE compliance path |
| **FHIR-first + MHD alignment (chosen)** | Progressive, adaptable | Must maintain alignment |

## Consequences

**Positive:**
- Simple FHIR API for US/modern deployments
- MHD alignment enables XDS.b bridge for EU/IHE deployments
- DocumentReference model is reusable across all exchange patterns

**Negative:**
- Full XDS.b compliance requires additional adapter work
- Must track MHD profile updates
