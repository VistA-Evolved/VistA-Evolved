# Phase 152 VERIFY — SCHEDULING PG-ONLY ENFORCEMENT

## Verification Steps

### 1. Build + TypeCheck
```powershell
pnpm exec tsc --noEmit   # 0 errors expected
```

### 2. Unit Tests
```powershell
pnpm exec vitest run      # all pass
```

### 3. Gauntlet RC
```powershell
node qa/gauntlet/cli.mjs --suite rc    # 18P/0F/1S/2W
```

### 4. Runtime Mode Enforcement
- Set `PLATFORM_RUNTIME_MODE=rc` without PG => scheduling routes return 503
- Set `PLATFORM_RUNTIME_MODE=dev` => Map fallback works with DEV_ONLY_FALLBACK log

### 5. Contract Alignment
- GET /scheduling/requests uses PG-first, Map fallback only in dev
- POST /scheduling/requests/:id/approve uses PG-first, 503 in rc/prod
- POST /scheduling/requests/:id/reject uses PG-first, 503 in rc/prod
- Truth gate audit uses [REDACTED] for patient identifiers

### 6. Seed Routine
- ZVESDSEED.m documented in docs/runbooks/scheduling-seed.md
- Install steps are explicit and tested

## Expected Results
- Gauntlet RC: 18P/0F/1S/2W (unchanged from baseline)
- No Map fallback paths reachable in rc/prod mode
- All scheduling audit entries use sanitized identifiers
