# ADR: OSS Feature Flags Upgrade (Wave 10)

**Status:** Accepted
**Date:** 2026-03-01
**Phase:** 285 (Wave 10 P6)

## Context

VistA-Evolved has two coexisting feature flag systems:

1. **Tenant-level flags** (Phase 17A): `FeatureFlags` record in `tenant-config.ts`,
   9 built-in flags, partial-merge updates via `updateFeatureFlags()`
2. **Module-level flags** (Phase 109): `tenant_feature_flag` DB table with CRUD
   via `/admin/modules/feature-flags`, per-tenant key-value with optional module scoping

**ADR-feature-flags-choice.md** (Phase 238) decided to extend the DB-backed system
with `rollout_percentage` and `user_targeting_rules` columns. This has **not yet
been implemented**.

### What is missing
- No gradual rollout percentages (all-or-nothing)
- No user-level targeting (only tenant-level)
- No external flag service integration
- No real-time flag change propagation
- No flag evaluation SDK/client

## Options Considered

| Option | License | Pros | Cons |
|--------|---------|------|------|
| **Unleash** | Apache-2.0 | Self-hosted, SDKs, gradual rollout, A/B, segments | New service to deploy |
| **Flagsmith** | BSD-3 | Self-hosted, REST+SSE, segments, environments | Smaller community |
| **LaunchDarkly** | Proprietary | Best UX, real-time, SDKs | SaaS-only, cost, PHI concerns |
| **Extend existing DB** | N/A | Zero deps, in-process, DB-backed | Must build rollout/targeting |
| **Provider-agnostic + Unleash** | Apache-2.0 | Best of both | Operational complexity |

## Decision

**Extend the existing DB-backed feature flag system AND provide an optional
Unleash adapter behind a `FeatureFlagProvider` interface.**

### Architecture
- **Policy layer** (existing): `tenant_feature_flag` table + module entitlements
  remain the source of truth for "is this module/feature available to this tenant"
- **Runtime evaluation layer** (new): `FeatureFlagProvider` interface handles
  `isEnabled(flagKey, context)` and `getVariant(flagKey, context)` with:
  - `DbFeatureFlagProvider` (default): Reads from `tenant_feature_flag` with
    percentage rollout via deterministic hash
  - `UnleashFeatureFlagProvider` (optional): Connects to self-hosted Unleash
    with local caching + fail-safe defaults

### Why this layered approach
- DB flags are the gatekeeper for "is this feature allowed at all"
- Runtime provider handles "is this feature active right now for this user"
- If Unleash is down, DB flags are the safe fallback
- Healthcare environments that can't run Unleash use Db provider only

### Unleash as optional OSS choice
- Apache-2.0 license, self-hosted
- Tenant scoping via Unleash contexts (`tenantId` constraint)
- SDK caching means no network dependency for hot-path evaluation
- Admin UI for non-developer flag management

## Integration Plan

1. Add `rollout_percentage` (INT 0-100) and `user_targeting` (JSONB) columns
   to `tenant_feature_flag` via migration v28
2. Define `FeatureFlagProvider` interface in `apps/api/src/flags/types.ts`
3. Implement `DbFeatureFlagProvider` with deterministic hash rollout
4. Implement `UnleashFeatureFlagProvider` with local cache + fail-safe
5. Add `FEATURE_FLAG_PROVIDER=db|unleash` env var for adapter selection
6. Wire provider into middleware for route-level flag checks
7. Add Unleash to `docker-compose.prod.yml` under `profiles: [flags]`

## Rollback Plan

- Set `FEATURE_FLAG_PROVIDER=db` to disable Unleash integration
- DB provider always works — no external dependency
- Remove Unleash container — no code changes needed
- Existing flag CRUD API continues to work regardless of provider

## Security / PHI Notes

- Flag names and values must NOT contain PHI
- User context for targeting uses DUZ (provider ID), never patient IDs
- Unleash connection uses API key, not session cookies
- Flag evaluation is logged to existing module_audit_log (no new audit sink)
