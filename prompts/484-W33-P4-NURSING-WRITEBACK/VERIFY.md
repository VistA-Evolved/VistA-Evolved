# Phase 484 — W33-P4 VERIFY: Nursing Writeback

## Gates

1. **TypeScript** — `npx tsc --noEmit` passes from `apps/api`
2. **Budget** — `integration-pending-budget.mjs` shows improvement (Δ ≤ 0)
3. **Grep** — No raw `integration-pending` in the 5 converted handlers
4. **tier0Gate** — All 5 nursing pending endpoints use `tier0Gate()` calls
5. **Audit** — All 5 handlers emit `immutableAudit(…, "blocked", …)`
6. **KNOWN_RPCS** — GMRIO + ZVENAS RPCs added to rpcCapabilities.ts
