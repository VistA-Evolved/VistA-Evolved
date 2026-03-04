# Phase 285 - IMPLEMENT: Feature Flags Upgrade (OSS-first)

## Objective

Extend the existing DB-backed feature flag system with gradual rollout percentages,
user targeting rules, and an optional self-hosted Unleash adapter behind a
provider-agnostic FeatureFlagProvider interface.

## Implementation Steps

### 1. FeatureFlagProvider Interface (`apps/api/src/flags/types.ts`)

- FlagContext: tenantId, userId, properties
- FlagEvaluationResult: enabled, variant, source (db|unleash|fallback)
- UserTargetingRule: field, operator (eq|neq|in|not_in|contains), values
- FeatureFlagProvider interface: isEnabled, getVariant, evaluateAll, healthCheck, destroy
- FeatureFlagProviderType = "db" | "unleash"
- Provider registry: setFeatureFlagProvider / getFeatureFlagProvider

### 2. DbFeatureFlagProvider (`apps/api/src/flags/db-provider.ts`)

- Reads from tenant_feature_flag table via module-repo
- Deterministic SHA-256 hash rollout bucketing (0-99)
- User targeting rule evaluation (eq, neq, in, not_in, contains)
- Bulk evaluateAll with single DB query optimization
- Fallback { enabled: false, source: "fallback" } for unknown flags

### 3. UnleashFeatureFlagProvider (`apps/api/src/flags/unleash-provider.ts`)

- Vanilla Node.js fetch (no SDK dependency) to Unleash /client/features
- Local Map cache refreshed every UNLEASH_REFRESH_INTERVAL_MS (default 15s)
- Unref'd timer so it doesn't keep process alive
- Falls back to DbFeatureFlagProvider on cache miss
- 5s timeout on health check, 10s on refresh

### 4. Barrel + Init Factory (`apps/api/src/flags/index.ts`)

- initFeatureFlagProvider() reads FEATURE_FLAG_PROVIDER env var
- "db" (default) or "unleash"

### 5. Flag Evaluation Routes (`apps/api/src/flags/flag-eval-routes.ts`)

- POST /admin/flags/evaluate - single flag evaluation with context
- POST /admin/flags/evaluate-all - bulk flag evaluation
- POST /admin/flags/variant - variant evaluation
- GET /admin/flags/health - provider health check

### 6. PG Migration v29 (`apps/api/src/platform/pg/pg-migrate.ts`)

- ALTER TABLE tenant_feature_flag ADD COLUMN rollout_percentage INTEGER DEFAULT 100
- ALTER TABLE tenant_feature_flag ADD COLUMN user_targeting JSONB DEFAULT '[]'
- New index idx_tff_rollout on (tenant_id, rollout_percentage)

### 7. Drizzle Schema Update (`apps/api/src/platform/pg/pg-schema.ts`)

- Added rolloutPercentage (integer, default 100) and userTargeting (jsonb, default [])

### 8. Module Repo Extension (`apps/api/src/platform/pg/repo/module-repo.ts`)

- TenantFeatureFlagRow type extended with rolloutPercentage, userTargeting
- upsertTenantFeatureFlag extended with optional rolloutPercentage, userTargeting params

### 9. Route Extension (`apps/api/src/routes/module-entitlement-routes.ts`)

- POST /admin/modules/feature-flags accepts rolloutPercentage (0-100) and userTargeting
- Validation: rolloutPercentage must be integer 0-100

### 10. Admin UI Update (`apps/web/src/app/cprs/admin/modules/page.tsx`)

- FeatureFlagsTab now includes Rollout % input field
- Table shows Rollout column with color-coded badge (green=100%, yellow=partial, red=0%)
- FlagRow interface extended with rolloutPercentage and userTargeting

### 11. Route Registration (`apps/api/src/server/register-routes.ts`)

- Import and register flagEvalRoutes

### 12. Store Policy (`apps/api/src/platform/store-policy.ts`)

- unleash-toggle-cache (cache, in_memory_only, flags domain)

### 13. Env Vars (`apps/api/.env.example`)

- FEATURE_FLAG_PROVIDER, UNLEASH_URL, UNLEASH_API_KEY, UNLEASH_APP_NAME, UNLEASH_REFRESH_INTERVAL_MS

## Files Touched

- `apps/api/src/flags/types.ts` (NEW)
- `apps/api/src/flags/db-provider.ts` (NEW)
- `apps/api/src/flags/unleash-provider.ts` (NEW)
- `apps/api/src/flags/index.ts` (NEW)
- `apps/api/src/flags/flag-eval-routes.ts` (NEW)
- `apps/api/src/platform/pg/pg-migrate.ts` (MODIFIED - v29)
- `apps/api/src/platform/pg/pg-schema.ts` (MODIFIED)
- `apps/api/src/platform/pg/repo/module-repo.ts` (MODIFIED)
- `apps/api/src/routes/module-entitlement-routes.ts` (MODIFIED)
- `apps/api/src/server/register-routes.ts` (MODIFIED)
- `apps/api/src/platform/store-policy.ts` (MODIFIED)
- `apps/api/.env.example` (MODIFIED)
- `apps/web/src/app/cprs/admin/modules/page.tsx` (MODIFIED)
