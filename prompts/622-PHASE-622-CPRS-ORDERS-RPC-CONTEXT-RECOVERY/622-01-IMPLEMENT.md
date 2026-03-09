# Phase 622 - IMPLEMENT - CPRS Orders RPC Context Recovery

## User Request
- Continue autonomously until the clinician UI is actually working end to end.
- Keep the implementation VistA-first and truthful.
- Check prompt lineage before changing code.
- Recover live panel failures instead of masking them in the frontend.

## Implementation Steps
1. Inventory the live Orders panel behavior, the `/vista/cprs/orders` backend contract, and the relevant prompt lineage in Phases 617, 619, and 621.
2. Confirm the active failure mode with authenticated live API calls against DFN 46.
3. Remove split-brain RPC usage from the Orders read route by stopping any mix of legacy `connect()/disconnect()` lifecycle handling with `safeCallRpc(...)`.
4. Require authenticated session context on the route so pooled RPC context can resolve per-request actor/tenant state.
5. Preserve the existing truthful response contract, including `rpcUsed`, `vivianPresence`, empty-state handling, and enrichment fallbacks.
6. Revalidate the raw endpoint against live VEHU data until it returns readable active orders or a truthful empty state.
7. Revalidate the Orders panel in the browser for DFN 46 after the backend route is stable.

## Files Touched
- prompts/622-PHASE-622-CPRS-ORDERS-RPC-CONTEXT-RECOVERY/622-01-IMPLEMENT.md
- prompts/622-PHASE-622-CPRS-ORDERS-RPC-CONTEXT-RECOVERY/622-99-VERIFY.md
- apps/api/src/routes/cprs/orders-cpoe.ts
