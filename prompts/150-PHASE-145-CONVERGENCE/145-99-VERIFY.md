# Phase 145 — State-of-the-Union Convergence + Gap Burn-Down Plan (VERIFY)

## Verification gates

### Gate 1 -- System audit runs clean
```powershell
pnpm audit:system   # must exit 0
```

### Gate 2 -- Diff artifacts exist
```powershell
Test-Path artifacts/phase145/system-gap-matrix.before.json
Test-Path artifacts/phase145/system-gap-matrix.after.json
Test-Path artifacts/phase145/gap-diff.json
```

### Gate 3 -- Priority backlog exists and is < 2 pages
```powershell
(Get-Content docs/audits/phase145-priority-backlog.md).Count -lt 120
```

### Gate 4 -- Gauntlet gates registered
```powershell
node qa/gauntlet/cli.mjs --suite rc   # G19-G21 must appear
```

### Gate 5 -- Burn-down scaffolds exist
```powershell
Test-Path prompts/151-PHASE-146-DURABILITY-WAVE3/146-01-IMPLEMENT.md
Test-Path prompts/152-PHASE-147-SCHEDULING-DEPTH-V2/147-01-IMPLEMENT.md
Test-Path prompts/153-PHASE-148-PROD-VISTA-DISTRO/148-01-IMPLEMENT.md
```

### Gate 6 -- TSC clean
```powershell
pnpm -C apps/api exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/portal exec tsc --noEmit
```

### Gate 7 -- Gauntlet RC all pass (no new failures)
```powershell
node qa/gauntlet/cli.mjs --suite rc   # 0 FAIL
```
