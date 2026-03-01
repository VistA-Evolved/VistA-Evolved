# ADR: Data Rights Operations

## Status
Accepted

## Context
Healthcare platforms must support data retention policies, deletion requests,
and legal holds. Without structured data rights operations, compliance with
HIPAA, GDPR-like regulations, and local data protection acts is manual and
error-prone.

## Decision
We implement a **data rights operations layer** with:
- **Retention policies**: Per-tenant, per-data-class retention periods
- **Deletion workflows**: Tenant offboarding purge and patient deletion requests
- **Legal holds**: Prevent deletion when hold is active on a tenant or patient
- **Dry-run mode**: Preview what would be deleted before executing
- **Audit trail**: All retention/deletion/hold operations are hash-chain audited

Legal holds take absolute precedence over retention policy expiry and manual
deletion requests.

## Consequences
- Retention is policy-driven, not ad-hoc
- Deletion is auditable and reversible (via backup)
- Legal holds prevent accidental data destruction
- Patient deletion is gated by policy and jurisdiction
