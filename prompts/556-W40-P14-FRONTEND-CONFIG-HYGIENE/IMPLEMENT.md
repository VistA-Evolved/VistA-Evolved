# Phase 556 — W40-P14 — Frontend Config Hygiene

## User request
Centralise all hardcoded `localhost:3001` references in `apps/web/src/` and
`apps/portal/src/` into shared `api-config.ts` modules. Add a lint gate to
prevent regressions.

## Implementation steps
1. Created `apps/web/src/lib/api-config.ts` exporting `API_BASE` and `WS_BASE`
2. Created `apps/portal/src/lib/api-config.ts` exporting `API_BASE`
3. Wrote codemod script `scripts/codemod-centralise-api-base.mjs` to transform
   all 109 files (96 web + 13 portal)
4. Ran codemod — replaced 212 occurrences across 109 files
5. Manually fixed edge cases:
   - `chart-types.ts`: replaced self-reference with `export { API_BASE }`
   - `NotesPanel.tsx`: removed self-referencing `const API_BASE = API_BASE`
   - `BrowserTerminal.tsx`: imported `WS_BASE`, updated SSR fallback
6. Created lint gate `scripts/qa-gates/no-hardcoded-localhost.mjs`
7. Verified: 3 TS builds pass (api, web, portal), lint gate passes

## Verification steps
- `pnpm -C apps/web exec tsc --noEmit` — 0 errors
- `pnpm -C apps/portal exec tsc --noEmit` — 0 errors
- `node scripts/qa-gates/no-hardcoded-localhost.mjs` — PASS (180 files, 0 violations)

## Files touched
- `apps/web/src/lib/api-config.ts` (NEW)
- `apps/portal/src/lib/api-config.ts` (NEW)
- `scripts/codemod-centralise-api-base.mjs` (NEW)
- `scripts/qa-gates/no-hardcoded-localhost.mjs` (NEW)
- 109 source files updated by codemod (see git diff)
