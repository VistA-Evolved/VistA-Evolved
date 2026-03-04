# Phase 425 -- Container-Probe Script + Capability Snapshot -- VERIFY

## Verification Gates

### Gate 1: Probe Script Syntax

```powershell
node --check scripts/vista/probe-capabilities.mjs
```

**Expected**: No syntax errors.

### Gate 2: New API Endpoints Exist

```powershell
grep -n "runtime-matrix" apps/api/src/routes/capabilities.ts
```

**Expected**: GET /vista/runtime-matrix and POST /vista/runtime-matrix/drift routes found.

### Gate 3: Imports Updated

```powershell
grep "buildRuntimeMatrix\|compareToBaseline" apps/api/src/routes/capabilities.ts
```

**Expected**: Both imported and used.

### Gate 4: Tree Health

```powershell
node scripts/qa-gates/prompts-tree-health.mjs
```

**Expected**: 0 FAIL, exit code 0.

## Exit Criteria

Script parses cleanly. Endpoints wired. Linter clean.
