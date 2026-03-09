# Phase 629 - CPRS Surgery Route Resilience Recovery - Verify

## Verification target

Ensure the Surgery list/detail routes use the resilient RPC path and surface truthful request-failed metadata instead of collapsing transport errors into an empty surgical-case table.

## Required checks

1. `GET /vista/surgery?dfn=46` no longer uses the raw direct broker path.
2. Surgery list failures return `ok:false`, `status:"request-failed"`, and `pendingTargets` including `ORWSR LIST`.
3. `SurgeryPanel` can distinguish a real empty result from a failed route via data-cache metadata.
4. Surgery detail route still returns grounded `rpcUsed` values and does not invent synthetic report text.
5. Diagnostics report no new errors in `apps/api/src/server/inline-routes.ts`.