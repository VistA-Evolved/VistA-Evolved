# Phase 280 — VERIFY: UX Theming & Layout Convergence

## Gates

1. CPRSUIProvider sets `data-theme` attribute via useEffect
2. System theme detection (matchMedia listener) is wired
3. `apps/web/src/lib/theme-tokens.ts` exports theme packs
4. Chart CSS modules use `var(--cprs-*)` instead of hardcoded hex
5. `scripts/qa-gates/ux-theming-gate.mjs` passes
6. BUG-071 documented in BUG-TRACKER.md
