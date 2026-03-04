# ADR: Interop Gateway — Internal Mediator vs OpenHIM Integration

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 399 (W23-P1)

## Context

Health information exchange requires a controlled interoperability layer that
routes, transforms, and audits transactions between internal systems and
external exchange partners. Two primary approaches exist:

1. **Internal mediator** — build a lightweight gateway inside the VistA-Evolved
   API process with channels, transformers, and transaction audit.
2. **External OpenHIM** — deploy OpenHIM as a separate service and wire
   VistA-Evolved as a mediator behind it.

## Decision

**Hybrid**: build an internal gateway layer with channel/mediator abstractions
that can operate standalone, with an optional OpenHIM integration adapter for
deployments that require OpenHIE compliance.

### Rationale

- Single-server deployments (US clinics, small hospitals) should not need
  a separate OpenHIM instance just for internal interop.
- OpenHIE-aligned deployments (LMIC, national HIE) benefit from OpenHIM's
  mature audit, channel management, and mediator ecosystem.
- The internal gateway uses the same channel/transform/audit model as OpenHIM,
  making the adapter a configuration choice, not an architecture change.

## Alternatives Considered

| Option              | Pros                              | Cons                         |
| ------------------- | --------------------------------- | ---------------------------- |
| Internal only       | Simple, no external deps          | No OpenHIE compliance        |
| OpenHIM only        | Full OpenHIE stack                | Heavy for simple deployments |
| **Hybrid (chosen)** | Flexibility, progressive adoption | Two code paths to maintain   |

## Consequences

**Positive:**

- Works for all deployment sizes (clinic to national HIE)
- OpenHIM adapter is opt-in, no overhead when not used
- Channel/transform model is testable without external services

**Negative:**

- Must maintain internal gateway + OpenHIM adapter
- OpenHIM upgrades may require adapter updates
