# ADR: Authorization Policy Engine

**Status:** Accepted  
**Date:** 2026-03-01  
**Phase:** 337 (Wave 16 P1)  
**Deciders:** Architecture team

## Context

VistA-Evolved currently uses an in-process policy engine (`auth/policy-engine.ts`,
Phase 35) with ~40 role-action mappings and admin superuser bypass. This is
sufficient for role-based access but lacks:

- Department/facility-scoped authorization
- Patient assignment checks
- Note sensitivity enforcement
- Structured "why denied" codes for UI
- Environment-specific policy variants

Wave 16 needs ABAC (Attribute-Based Access Control) for fine-grained clinical
authorization without introducing external infrastructure dependencies.

## Decision

**Extend the existing in-process policy engine** with attribute evaluation,
structured deny reasons, and tenant-scoped policy overrides.

Rationale:

- Zero new infrastructure (no OPA sidecar container, no network hop)
- Sub-millisecond evaluation (critical for clinical workflows)
- Already integrated with immutable audit
- Policy definitions can be exported to OPA/Rego format for production migration
- Keeps the "VistA-first" principle — RPC Broker context is still authoritative

## Alternatives Considered

### Option A: Keep Custom RBAC Only (status quo)

- **Pros:** Simple, known working, no migration risk
- **Cons:** Cannot express department scope, patient assignment, note sensitivity;
  the same nurse accessing data across all departments violates least-privilege
- **Rejected:** Insufficient for enterprise security requirements

### Option B: OPA (Open Policy Agent) / Rego

- **Pros:** Industry standard, rich policy language, well-tested
- **Cons:** Requires sidecar container, 1-5ms network round trip per decision,
  Rego learning curve, complex debugging, infrastructure dependency
- **License:** Apache 2.0 — acceptable
- **Deferred:** The in-process engine can export OPA-compatible policy format;
  migrate to OPA sidecar if evaluation volume exceeds 10K req/s

### Option C: Cedar (Amazon Verified Permissions)

- **Pros:** Formally verified, strong typing, fast evaluation
- **Cons:** AWS-specific ecosystem, relatively new, smaller community
- **License:** Apache 2.0 — acceptable
- **Rejected:** Vendor lock-in risk, less community support than OPA

### Option D: OpenFGA (Fine-Grained Authorization)

- **Pros:** Relationship-based authorization, Google Zanzibar model
- **Cons:** Requires separate server, relationship tuples storage, overkill for
  clinical hierarchies that map well to attributes
- **License:** Apache 2.0 — acceptable
- **Rejected:** Relationship model adds complexity without clinical benefit

## Implementation Plan

1. Add `PolicyAttribute` types: department, facility, patientAssignment, noteSensitivity
2. Extend `PolicyInput` with subject/resource attributes
3. Add `evaluateAbac()` that checks attributes after role check passes
4. Return structured `DenyReason` codes for UI consumption
5. Tenant-scoped policy overrides (stored in PG)
6. Export format compatible with OPA/Rego for production migration

## Operational Notes

- Evaluation latency target: < 0.5ms p99
- Policy rule count can grow to ~200 without performance concern
- All deny decisions logged to immutable audit with reason codes
- No PHI in policy evaluation logs (subject/resource IDs only)

## Rollback Plan

1. Remove ABAC attribute checks from `evaluatePolicy()`
2. Revert to role-only evaluation (Phase 35 behavior)
3. No data migration needed — policy overrides are additive
4. UI deny reason codes gracefully degrade to generic "access denied"
