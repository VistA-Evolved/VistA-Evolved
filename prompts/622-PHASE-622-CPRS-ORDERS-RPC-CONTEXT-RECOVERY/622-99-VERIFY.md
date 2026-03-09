# Phase 622 - VERIFY - CPRS Orders RPC Context Recovery

## Verification Steps
1. Confirm `vehu` and `ve-platform-db` are running.
2. Confirm the API is healthy with `/vista/ping` and `/health`.
3. Login with `PRO1234 / PRO1234!!` and verify `GET /vista/cprs/orders?dfn=46` no longer returns connection-closed or circuit-breaker-open failures caused by the read route itself.
4. Confirm the route returns `ok:true` with live active order rows, or a truthful empty state if VEHU has no active orders for the selected filter.
5. Confirm the response still includes `rpcUsed` and `vivianPresence`, and that enrichment RPC failures do not break the route.
6. Open the Orders panel in the browser for DFN 46 and verify it no longer stays stuck in `Source: pending` because of the prior backend transport failure.
7. Record any remaining order-action gaps separately from the read-path recovery.

## Acceptance Criteria
- `/vista/cprs/orders` no longer mixes legacy broker lifecycle calls with `safeCallRpc(...)` in the read path.
- The route is bound to authenticated session context.
- Live verification against VEHU succeeds without `Connection closed before response` from the read route.
- The Orders panel reflects the recovered backend state truthfully.
