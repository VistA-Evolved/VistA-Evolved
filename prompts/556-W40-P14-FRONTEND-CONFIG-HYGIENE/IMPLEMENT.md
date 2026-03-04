# Phase 556 — Frontend Config Hygiene — IMPLEMENT

## Context

Prior to this phase, **every** file in `apps/web/src/` and `apps/portal/src/`
that needed the API base URL declared its own inline
`const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"`.
This created 212 scattered definitions across 109 files — a maintenance hazard
and a single-char-typo risk. Wave 40 hygiene requires a single source of truth.

## Implementation Steps

1. Created `apps/web/src/lib/api-config.ts` exporting `API_BASE` and `WS_BASE`.
2. Created `apps/portal/src/lib/api-config.ts` exporting `API_BASE`.
3. Wrote codemod script `scripts/codemod-centralise-api-base.mjs` to
   programmatically replace all 212 occurrences across 109 files.
4. Ran codemod — 96 web files + 13 portal files transformed.
5. Manually fixed three edge cases the codemod could not handle:
   - `chart-types.ts`: self-referencing export replaced with re-export.
   - `NotesPanel.tsx`: removed circular `const API_BASE = API_BASE`.
   - `BrowserTerminal.tsx`: imported `WS_BASE`, updated SSR fallback.
6. Created CI lint gate `scripts/qa-gates/no-hardcoded-localhost.mjs` to
   prevent regressions (scans 180 files, fails on any raw `localhost:3001`).
7. Verified all three TS builds pass (api, web, portal) and lint gate passes.

## Files Changed

| File                                          | Action                             |
| --------------------------------------------- | ---------------------------------- |
| `apps/web/src/lib/api-config.ts`              | NEW — canonical API_BASE + WS_BASE |
| `apps/portal/src/lib/api-config.ts`           | NEW — canonical API_BASE           |
| `scripts/codemod-centralise-api-base.mjs`     | NEW — one-time codemod tool        |
| `scripts/qa-gates/no-hardcoded-localhost.mjs` | NEW — CI lint gate                 |
| 109 source files across web + portal          | MODIFIED — codemod replacements    |

## Decisions

- **Codemod vs manual**: Automated codemod chosen because 109 files at 212
  occurrences is error-prone to hand-edit. The codemod is idempotent.
- **Separate api-config per app**: web and portal have different `@/lib`
  path roots, so each app gets its own `api-config.ts`.
- **`WS_BASE` derived from `API_BASE`**: WebSocket URL is computed via
  `API_BASE.replace(/^http/, "ws")` so changing one env var updates both.
- **Lint gate, not ESLint rule**: a standalone `.mjs` gate integrates with
  the existing `qa-rc.mjs` pipeline without requiring ESLint plugin infra.

## Evidence Captured

- `pnpm -C apps/web exec tsc --noEmit` — 0 errors
- `pnpm -C apps/portal exec tsc --noEmit` — 0 errors
- `node scripts/qa-gates/no-hardcoded-localhost.mjs` — PASS (180 files, 0 violations)
- Codemod dry-run: 109 files, 212 replacements logged to stdout
