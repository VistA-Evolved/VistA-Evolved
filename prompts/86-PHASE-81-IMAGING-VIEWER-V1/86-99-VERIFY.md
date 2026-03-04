# Phase 81 -- VERIFY -- Imaging Viewer v1

## Gates

- G81-1: imaging-plan.json exists
- G81-2: list/report backed by real endpoints or explicit pendingTargets
- G81-3: viewer-link works if configured; else clear pending/instructions
- G81-4: E2E list -> report passes
- G81-5: No PHI leakage + verify-latest + click-audit pass

## Verification Results (Phase 81 VERIFY)

### Bugs Found & Fixed

1. **CRITICAL -- UI never called new `/imaging/studies/:dfn`**: `fetchStudies` used old
   `/vista/imaging/studies?dfn=` route. Fixed: switched to Phase 81 route.
2. **CRITICAL -- Raw `connect()`/`disconnect()`/`callRpc()` used**: Violated AGENTS.md
   rule #19. Fixed: replaced with `safeCallRpc` (mutex + circuit breaker + retry).
3. **MODERATE -- DFN not URL-encoded in QIDO-RS**: Fixed with `encodeURIComponent(dfn)`.
4. **MODERATE -- Non-ok HTTP silently swallowed in UI**: `fetchReport` and `fetchViewerLink`
   ignored HTTP errors. Fixed: shows error message to user.
5. **MINOR -- Dead `!line` guard**: `callRpc` already filters empty strings. Removed.
6. **MINOR -- Report/viewer state persisted across study changes**: Fixed: reset on click.

### Verifier Output

```
75 PASS / 0 FAIL / 75 total (7 new gates added during verify)
```

### Builds

- API: `npx tsc --noEmit` -- clean
- Web: `npx next build` -- clean (21/21 pages)
