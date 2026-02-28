# Phase 285 - VERIFY: Feature Flags Upgrade (OSS-first)

## Verification Gates

### Gate 1: TypeScript Compilation
```powershell
pnpm -C apps/api exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit
```
Both must exit 0 with no errors.

### Gate 2: File Existence
```powershell
$files = @(
  "apps/api/src/flags/types.ts",
  "apps/api/src/flags/db-provider.ts",
  "apps/api/src/flags/unleash-provider.ts",
  "apps/api/src/flags/index.ts",
  "apps/api/src/flags/flag-eval-routes.ts"
)
foreach ($f in $files) { Test-Path $f }
```
All must return True.

### Gate 3: FeatureFlagProvider Interface
- types.ts exports FeatureFlagProvider with 5 methods: isEnabled, getVariant, evaluateAll, healthCheck, destroy
- FlagContext has tenantId, userId, properties
- UserTargetingRule has field, operator, values
- Provider registry (set/get) exported

### Gate 4: DbFeatureFlagProvider
- Implements all FeatureFlagProvider methods
- rolloutBucket() uses SHA-256 deterministic hash
- evaluateTargetingRules() handles eq, neq, in, not_in, contains
- Reads from tenant_feature_flag via module-repo

### Gate 5: UnleashFeatureFlagProvider
- Uses UNLEASH_URL and UNLEASH_API_KEY env vars
- Local Map cache with periodic refresh
- Falls back to DbFeatureFlagProvider on miss
- Timer uses unref() to not block shutdown

### Gate 6: PG Migration v29
- ALTER TABLE adds rollout_percentage INTEGER DEFAULT 100
- ALTER TABLE adds user_targeting JSONB DEFAULT '[]'
- Index created on (tenant_id, rollout_percentage)

### Gate 7: Schema + Repo Extension
- pg-schema.ts includes rolloutPercentage and userTargeting columns
- TenantFeatureFlagRow type includes both new fields
- upsertTenantFeatureFlag accepts rolloutPercentage and userTargeting params

### Gate 8: Route Extension
- POST /admin/modules/feature-flags accepts rolloutPercentage (validated 0-100)
- POST /admin/modules/feature-flags accepts userTargeting array

### Gate 9: Evaluation Routes
- POST /admin/flags/evaluate, evaluate-all, variant
- GET /admin/flags/health
- All require session auth

### Gate 10: Admin UI
- Rollout % input in create form
- Rollout column in flags table with color-coded badge
- No hardcoded credentials

### Gate 11: Store Policy
- unleash-toggle-cache registered: classification=cache, durability=in_memory_only

### Gate 12: Env Vars
- FEATURE_FLAG_PROVIDER, UNLEASH_URL, UNLEASH_API_KEY documented in .env.example
