# TypeScript Error Report — P0-3 Strict Mode Enforcement

**Date:** 2025-01-24  
**Scan command:** `npx tsc --noEmit` per project  
**Config change:** Added `noUnusedLocals: true` to all 4 tsconfigs

## Summary

| Project               | Before  | After | Fixed   | Fix Rate |
| --------------------- | ------- | ----- | ------- | -------- |
| apps/api              | 224     | 0     | 224     | 100%     |
| apps/web              | 59      | 0     | 59      | 100%     |
| apps/portal           | 6       | 0     | 6       | 100%     |
| packages/locale-utils | 0       | 0     | 0       | —        |
| **Total**             | **289** | **0** | **289** | **100%** |

**Target:** ≥70% reduction → **Achieved: 100% reduction**

## Error Categories

### TS6133 — `'{0}' is declared but its value is never read` (237 occurrences)

Unused imports, unused `const`/`let` bindings, unused destructured variables.

**Fix techniques applied:**

- Removed unused `import` statements (~126 across all projects)
- Changed `const session = await requireSession(request, reply)` to `await requireSession(request, reply)` where session value was unused but auth side-effect required (~33 instances)
- Removed unused `const`/`let` local declarations (~25 instances)
- Removed unused function definitions (~10 instances)
- Removed unused destructured bindings or replaced with holes (~8 instances)
- Added `expect()` assertion to read write-only test variables (2 instances)

**Tag:** AUTO-FIXABLE ✅

### TS6196 — `'{0}' is declared but its value is never used` (47 occurrences)

Assigned variables whose values are written but never read downstream.

**Fix techniques applied:**

- Removed write-only `const` assignments where the expression had no side effects
- For assignments with side effects (e.g., `await fn()`), kept the call but removed the binding

**Tag:** AUTO-FIXABLE ✅

### TS6138 — `Property '{0}' is declared but its value is never read` (4 occurrences)

Class properties or interface properties declared but never accessed.

**Fix techniques applied:**

- Removed unused class constructor parameters
- Removed unused interface/type properties

**Tag:** AUTO-FIXABLE ✅

### TS6192 — `All imports in import declaration are unused` (1 occurrence)

Entire import statement where no exported member is used.

**Fix techniques applied:**

- Removed the entire import line

**Tag:** AUTO-FIXABLE ✅

## Key Observations

1. **No type-safety errors existed.** The codebase was already fully type-safe under `strict: true`. The only new errors came from enabling `noUnusedLocals`.

2. **Most common pattern:** Unused React imports on admin pages (26 files in apps/web had `import React from 'react'` unnecessarily — React 17+ JSX transform doesn't require it).

3. **Second most common:** Auth guard calls where the session object was captured but never used. The `await requireSession()` call is needed for its authentication side effect, so the fix was to drop the `const session =` binding while keeping the `await` call.

4. **`_` prefix does NOT suppress TS6133 for local variables** — it only works for function parameters. Local `const _foo = ...` still triggers the error. The correct fix is removal or adding a read expression.

## Files Modified

- **~85 files** in apps/api
- **~48 files** in apps/web
- **~5 files** in apps/portal
- **~138 files total**
