# ADR: Feature Flags Choice

**Status:** Accepted
**Date:** 2025-07-22
**Phase:** 238 (Wave 6 P1)

## Context

VistA-Evolved needs feature flag management for progressive rollouts, A/B testing,
and per-tenant capability toggling. Current state:

- **module-registry.ts** (381 lines): 14 modules, 7 SKU profiles, DB-backed
  tenant module entitlements via `setDbEntitlementProvider()`
- **module-guard.ts** (80 lines): Fastify onRequest hook enforcing module toggles
  (returns 403 for disabled modules)
- **capability-service.ts** (220 lines): 50+ capabilities resolved per-tenant with
  live/pending/disabled states based on adapter + module + RPC availability
- **tenant_feature_flag** DB table: Per-tenant key-value flags with optional
  module scoping, CRUD via `/admin/modules/feature-flags`
- **module_catalog** + **tenant_module** DB tables: Full entitlement lifecycle
  with audit logging

**What is missing:**

- No gradual rollout percentages (all-or-nothing per tenant)
- No A/B testing framework
- No external flag service integration (Unleash, LaunchDarkly, ConfigCat)
- No user-level flag targeting (only tenant-level)

## Decision

**Keep the existing DB-backed module entitlement system and extend
`tenant_feature_flag` with percentage-based rollout and user targeting.**
No external flag service.

Rationale:

- The existing system already handles the core use case: per-tenant module toggles
- DB-backed flags survive restarts and are multi-instance safe
- Adding `rollout_percentage` and `user_targeting_rules` columns to
  `tenant_feature_flag` enables gradual rollouts without new infrastructure
- Unleash/LaunchDarkly add operational complexity and external dependency
- Healthcare environments often restrict external SaaS integrations

## Alternatives Considered

| Option              | License     | Pros                           | Cons                                |
| ------------------- | ----------- | ------------------------------ | ----------------------------------- |
| **Unleash**         | Apache-2.0  | Self-hosted, feature-rich, SDK | New service to deploy/maintain      |
| **LaunchDarkly**    | Proprietary | Best-in-class UX, real-time    | SaaS dependency, cost, PHI concerns |
| **ConfigCat**       | Proprietary | Simple, CDN-backed             | External dependency                 |
| **Extend existing** | N/A         | Zero new deps, DB-backed       | Must build rollout % logic          |
| **Flipt**           | GPL-3.0     | Self-hosted, gRPC              | GPL license, new service            |

## Consequences

**Positive:**

- Zero new infrastructure or services
- Leverages existing DB schema, CRUD API, and admin UI
- Audit trail already in place (module_audit_log)
- No external network calls for flag evaluation (in-process)
- Full control over flag evaluation logic

**Negative:**

- Must implement percentage rollout and user targeting ourselves
- No real-time flag change propagation (DB polling or cache TTL)
- Less sophisticated than purpose-built flag services
- No built-in analytics on flag exposure

**Migration path:**

- If scale/sophistication demands it, add Unleash as a backend
- Existing `tenant_feature_flag` schema is compatible with Unleash strategy model

## Security / PHI Notes

- Flag names and values must not contain PHI
- User targeting rules use DUZ (provider ID), never patient identifiers
- Flag evaluation audit entries go through existing module_audit_log
- Admin-only CRUD — enforced by AUTH_RULES `/admin/*` pattern

## Ops Notes

- Flag cache TTL: use `FEATURE_FLAG_CACHE_TTL_MS` (default 30s)
- Percentage rollout: hash(tenant_id + flag_key + user_duz) mod 100 < percentage
- Flag evaluation is synchronous, in-process — no network latency
- Monitor via existing `/posture/data-plane` and `/api/capabilities` endpoints
