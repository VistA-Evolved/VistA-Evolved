# Phase 556 — Verify — Frontend Config Hygiene

## Gates
1. `apps/web/src/lib/api-config.ts` exists and exports `API_BASE`
2. `apps/portal/src/lib/api-config.ts` exists and exports `API_BASE`
3. `pnpm -C apps/web exec tsc --noEmit` — 0 errors
4. `pnpm -C apps/portal exec tsc --noEmit` — 0 errors
5. `node scripts/qa-gates/no-hardcoded-localhost.mjs` — PASS
6. No `localhost:3001` in source files outside api-config.ts
