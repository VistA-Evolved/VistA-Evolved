# ADR: HL7v2 Engine Strategy

**Status:** Accepted  
**Date:** 2026-03-01  
**Phase:** W14-P1 (Phase 317)

## Context

VistA-Evolved needs a production-grade HL7v2 engine for bidirectional message exchange with hospital systems, labs, imaging, and scheduling partners.

## Options Evaluated

### Option A: Open Integration Engine (OIE) / NextGen Connect
- **License:** MPL 2.0 (NextGen Connect), various
- **Pros:** Full-featured channel management, GUI, community plugins
- **Cons:** Java-based sidecar, heavy operational footprint, separate deployment/monitoring, impedance mismatch with our Node.js stack

### Option B: Custom Zero-Dep Engine (Current)
- **License:** Project-owned (MIT)
- **Pros:** Already built and integrated (25+ files), zero external dependencies, TypeScript-native, in-process with API, tenant-aware, PHI-safe by design
- **Cons:** Requires ongoing maintenance, no community plugin ecosystem

### Option C: node-hl7-complete / node-hl7-client
- **License:** MIT
- **Pros:** npm-native, HL7v2 parsing
- **Cons:** Less mature than our existing parser, would require migration, no routing/DLQ/pack system

## Decision

**Keep and harden the existing custom engine (Option B).**

Rationale:
1. The engine already exists with 25+ source files covering parser, MLLP server/client, routing, DLQ, packs, FHIR bridge, and domain mapping.
2. It is zero-dependency, TypeScript-native, and tenant-aware — matching our architecture principles.
3. Adding an external engine (OIE/NextGen) would introduce a Java sidecar with separate deployment, monitoring, and a cross-process serialization boundary — complexity that exceeds the benefit.
4. Wave 14 focuses on **ops maturity** (DLQ replay, alerting, SLOs) and **standardized packs** — both are best done by extending the existing engine.

## Integration Plan

1. Harden existing DLQ with replay audit trail (W14-P4)
2. Add SLO metrics and alerting (W14-P4)
3. Standardize message packs as versioned, testable artifacts (W14-P3)
4. Integrate with the new Integration Control Plane (W14-P2)

## Rollback Plan

If the custom engine proves insufficient for a specific integration (e.g., complex multi-step ADT workflows), add NextGen Connect as an optional sidecar behind feature flag `HL7_USE_EXTERNAL_ENGINE=true`. The MLLP client can forward to external engines transparently.
