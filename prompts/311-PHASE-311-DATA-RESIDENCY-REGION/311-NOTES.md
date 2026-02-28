# Phase 311 — NOTES

## Decisions Made

1. **6 data regions** — us-east, us-west, ph-mnl, gh-acc, eu-fra, local.
   eu-fra and gh-acc are "planned" status.
2. **Region assignment is immutable** — once a tenant is assigned, the region
   cannot be changed. This prevents regulatory violations from region switching.
3. **Per-region PG URL via env vars** — `PLATFORM_PG_URL_US_EAST`, etc. Falls
   back to `PLATFORM_PG_URL` for single-region deployments.
4. **Audit bucket is region-prefixed** — `audit-us-east`, `audit-ph-mnl`, etc.
5. **Transfer agreements are in-memory** — scaffold stores that follow the
   same pattern as imaging worklist (Phase 23). DB backing via store-resolver
   in a future phase.

## Key Constraints

- Cross-border transfer requires both patient consent and a DataTransferAgreement.
- Same-country transfers (e.g., us-east to us-west) are always allowed.
- Planned regions cannot have tenants assigned to them.

## Follow-ups

- Wire `tenantRegions` to PG table (Phase 153 has `tenant_oidc_mapping` pattern)
- Wire `transferAgreements` to PG table
- Register routes in index.ts (deferred to Phase 314 country pack wiring)
