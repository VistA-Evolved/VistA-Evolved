# Phase 424 -- VistA Runtime Strategy + Baseline Matrix -- VERIFY

## Verification Gates

### Gate 1: Runtime Matrix JSON

```powershell
node -e "const m = require('./data/vista/runtime-matrix.json'); console.log('Environments:', Object.keys(m.environments).length); console.log('Modes:', Object.keys(m.runtimeModes).length); console.log('Domains:', Object.keys(m.domainRequirements).length)"
```

**Expected**: 3 environments, 4 modes, 18 domains.

### Gate 2: inspect-container.ps1 Syntax

```powershell
powershell -NoProfile -Command "& { $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content scripts\vista\inspect-container.ps1 -Raw), [ref]$null); Write-Host 'PASS' }"
```

**Expected**: PASS (no parse errors).

### Gate 3: select-runtime.ps1 Syntax

```powershell
powershell -NoProfile -Command "& { $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content scripts\vista\select-runtime.ps1 -Raw), [ref]$null); Write-Host 'PASS' }"
```

**Expected**: PASS (no parse errors).

### Gate 4: TypeScript Compilation

```powershell
npx tsc --noEmit --skipLibCheck apps/api/src/vista/rpcCapabilities.ts
```

**Expected**: No errors (or acceptable pre-existing errors only).

### Gate 5: Drift Detection Exports

```powershell
grep -n "compareToBaseline\|buildRuntimeMatrix\|getAllDomains\|DriftReport" apps/api/src/vista/rpcCapabilities.ts
```

**Expected**: All 4 names found.

### Gate 6: Tree Health

```powershell
node scripts/qa-gates/prompts-tree-health.mjs
```

**Expected**: 0 FAIL, exit code 0.

## Exit Criteria

All gates PASS. TypeScript compiles. Linter clean.
