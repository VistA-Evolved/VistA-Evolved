# Phase 556 — Frontend Config Hygiene — NOTES

## Summary

Centralised all 212 hardcoded `localhost:3001` references across 109 source
files into two canonical `api-config.ts` modules (one per front-end app).
Added a CI lint gate to prevent regressions. All three TS builds pass clean.

## Key Decisions

- **Codemod approach**: A Node.js script (`codemod-centralise-api-base.mjs`)
  was used for bulk transformation rather than manual edits. The script is
  idempotent and kept in-repo as a reference artifact.
- **Per-app config**: `apps/web` and `apps/portal` each have their own
  `api-config.ts` because they have separate `@/lib` path aliases.
- **`WS_BASE` derived**: WebSocket URL computed from `API_BASE` via regex
  replace, so a single env var (`NEXT_PUBLIC_API_URL`) controls both.
- **Lint gate over ESLint rule**: Standalone `.mjs` gate integrates with the
  `qa-rc.mjs` pipeline and avoids ESLint plugin complexity.

## Follow-ups

- Clean up 6 remaining pointless alias patterns (e.g., `const base = API_BASE`)
  left by the codemod in `MessagingTasksPanel.tsx`, `CPRSModals.tsx`, and
  `i18n.ts` — functional but wasteful.
- `CPRSModals.tsx` manually computes WS URL via `.replace()` instead of using
  the exported `WS_BASE` — should be updated.
- Consider extending the lint gate to also flag `localhost:3000` and other
  common dev-only hardcoded origins.
