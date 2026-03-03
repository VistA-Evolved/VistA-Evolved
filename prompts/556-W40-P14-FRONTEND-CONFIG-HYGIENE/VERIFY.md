# Phase 556 — Frontend Config Hygiene — VERIFY

## Verification Steps

1. Confirm `apps/web/src/lib/api-config.ts` exists and exports `API_BASE`.
2. Confirm `apps/web/src/lib/api-config.ts` exports `WS_BASE`.
3. Confirm `apps/portal/src/lib/api-config.ts` exists and exports `API_BASE`.
4. Run `pnpm -C apps/web exec tsc --noEmit` — expect 0 errors.
5. Run `pnpm -C apps/portal exec tsc --noEmit` — expect 0 errors.
6. Run `pnpm -C apps/api exec tsc --noEmit` — expect 0 errors (regression).
7. Run `node scripts/qa-gates/no-hardcoded-localhost.mjs` — expect PASS.
8. Grep `apps/web/src/` and `apps/portal/src/` for raw `localhost:3001` — only
   hits should be inside `api-config.ts` files (the canonical sources).
9. Confirm `scripts/codemod-centralise-api-base.mjs` exists (one-time tool).

## Expected Output

- All three TS builds emit 0 errors.
- Lint gate reports `PASS — scanned N files, 0 violations`.
- Grep for `localhost:3001` returns exactly 2 files (the two `api-config.ts`).
- No runtime errors when importing `API_BASE` from `@/lib/api-config`.

## Negative Tests

- A file with inline `const API_BASE = "http://localhost:3001"` would be
  caught by the `no-hardcoded-localhost` lint gate.
- A file that imports from a wrong path (e.g., `@/lib/api-configs`) would
  fail the TypeScript build.
- Removing the `NEXT_PUBLIC_API_URL` env var falls back to `localhost:3001`
  (the default in api-config.ts), so SSR and client renders still work.

## Evidence Captured

- TS build output: 0 errors across api, web, portal.
- Lint gate output: `PASS — 180 files scanned, 0 violations`.
- Codemod log: 109 files, 212 replacements.
