# Phase 440 — IMPLEMENT: Compliance Attestation Store (W28 P2)

## Goal
Build an in-memory, hash-chained attestation store for regulatory compliance
evidence tracking. Each attestation records who attested to a compliance
requirement, when, with what evidence, and under which framework.

## Files Created
- `apps/api/src/regulatory/attestation-store.ts` — Full attestation store

## Files Modified
- `apps/api/src/regulatory/index.ts` — Re-exported attestation types + functions
- `apps/api/src/platform/store-policy.ts` — Registered compliance-attestation-store

## Key Decisions
- Hash-chained (SHA-256) for tamper detection, matching immutable-audit pattern
- 90-day default review cycle with auto-expiry check
- FIFO eviction at 5000 entries
- 4 statuses: attested, expired, revoked, pending_review
- Evidence supports file, URL, phase_ref, and test_result artifact types
- Tenant-scoped for multi-tenant deployments
