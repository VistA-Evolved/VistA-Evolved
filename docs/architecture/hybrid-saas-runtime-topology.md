# Hybrid SaaS Runtime Topology

## Goal

Support three first-class deployment models without forking the application:

- cloud SaaS
- customer-managed on-prem
- hybrid local-first plus cloud services

## Shared Application Contract

All deployment models should keep the same application boundaries:

- `apps/web` and `apps/portal` as the presentation layer
- `apps/api` as the policy, orchestration, and verification layer
- VistA as the clinical source of truth
- PostgreSQL as the platform control plane
- Redis as distributed state for scaled deployments

## Deployment Modes

### Cloud SaaS

- Shared control plane operated centrally
- Per-tenant logical isolation through tenant IDs, RLS, entitlements, and
  tenant-scoped audit
- Centralized observability, audit shipping, and CI/CD rollout
- Recommended for smaller clinics and managed customers

### Customer-Managed On-Prem

- Customer runs `apps/api`, UI, platform PG, and VistA-adjacent services in
  their own environment
- OIDC, secrets, backups, and Redis are still required for production posture
- Suitable when hospitals require local network residency or controlled change
  windows

### Hybrid Local-First

- Clinical runtime remains local to the hospital
- Cloud layer hosts optional services: analytics, audit shipping, support,
  federated identity, backup targets, and fleet update control
- Requires explicit sync boundaries instead of assuming always-on connectivity

## VistA Packaging Strategy

- Development baseline: VEHU lane for realistic sandbox data
- Distro lane: maintained compatibility/build lane for controlled packaging
- Rule:
  - do not invent a separate clinical engine contract
  - keep the API talking through the existing VistA adapters/RPC boundary
  - promote a maintained distro only when its swap-boundary contract stays
    compatible with the live API

## Tenant Provisioning Model

- Tenant signup should create:
  - tenant record
  - entitlement rows
  - feature flags
  - OIDC mapping
  - audit trail bootstrap
- Default SKU fallback is acceptable only for local development.
- Production tenants should be explicitly provisioned in PG so runtime guards,
  module status, and capability reports all resolve from the same source.

## Update Strategy

- Cloud SaaS:
  - rolling upgrade by environment
  - canary tenant set
  - evidence gate before broader rollout
- On-prem / hybrid:
  - versioned release bundles
  - preflight posture checks
  - explicit backup + rollback steps
  - compatibility validation against the target VistA lane

## Operational Risks

- Empty entitlement tables can falsely disable modules if the runtime assumes
  DB-backed tenancy before a tenant is provisioned.
- Redis-disabled environments silently degrade to in-memory coordination unless
  posture gates block it.
- VistA packaging drift is dangerous if the distro lane and VEHU verification
  lane are allowed to diverge without a swap-boundary check.

## Required Production Gates

- API startup against the intended VistA lane
- PG reachable and RLS posture verified
- Redis configured for scaled/cloud deployments
- canonical route truth map generated from live evidence
- clinician workflow smoke checks against real auth, cookies, and CSRF
