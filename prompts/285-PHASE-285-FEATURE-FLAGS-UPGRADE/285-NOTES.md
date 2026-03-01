# Phase 285 - NOTES: Feature Flags Upgrade (OSS-first)

## Design Decisions

### Two-Layer Architecture
- **Policy layer** (existing): tenant_feature_flag table + module entitlements
  remain source of truth for "is this feature available to this tenant"
- **Runtime evaluation layer** (new): FeatureFlagProvider handles "is this
  feature active right now for this user" with rollout/targeting

### DB Provider as Default
The DbFeatureFlagProvider reads directly from the existing tenant_feature_flag
table. Zero new infrastructure needed. Deterministic SHA-256 hash ensures the
same user always gets the same rollout bucket for a given flag.

### Unleash as Optional
UnleashFeatureFlagProvider uses vanilla fetch (no npm deps) against Unleash's
/client/features endpoint. Cache refreshes every 15s. Falls back to DB
provider on cache miss. To deploy Unleash, add it to docker-compose.prod.yml
under profiles: [flags].

### Rollout Percentage Column
Added as INTEGER (0-100) with DEFAULT 100 (fully enabled). This is the
simplest possible gradual rollout — percentage of users get the flag.
Deterministic hashing means the same user always sees the same result.

### User Targeting JSONB
Stored as array of UserTargetingRule objects. Each rule has field + operator +
values. All rules must pass (AND logic). Supports: eq, neq, in, not_in,
contains. Targeting is evaluated before rollout percentage.

## AGENTS.md Additions

180. **`FEATURE_FLAG_PROVIDER` env var selects db or unleash (Phase 285).**
     Default is `"db"` — reads from tenant_feature_flag with rollout_percentage
     and user_targeting columns. Set to `"unleash"` with UNLEASH_URL and
     UNLEASH_API_KEY to connect to self-hosted Unleash. DB provider is always
     the fallback for missing Unleash toggles.
181. **Rollout uses deterministic SHA-256 hash bucketing (Phase 285).**
     `rolloutBucket(flagKey, userId)` produces 0-99. Same user always gets
     same bucket for a given flag. rollout_percentage=50 means buckets 0-49
     are enabled. No randomness — fully reproducible.
182. **Flag evaluation routes are under `/admin/flags/*` (Phase 285).**
     POST /admin/flags/evaluate, evaluate-all, variant. GET /admin/flags/health.
     All require admin session. These evaluate flags against context; CRUD
     remains at /admin/modules/feature-flags.
183. **PG migration v29 adds rollout_percentage and user_targeting (Phase 285).**
     ALTER TABLE adds INTEGER rollout_percentage (default 100) and JSONB
     user_targeting (default []) to tenant_feature_flag. Non-destructive
     migration — existing flags get 100% rollout and empty targeting.
