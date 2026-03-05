# Phase 573 — W42-P2: RPC Connection Pool with DUZ-per-Request

> Wave 42: Production Remediation | Position 2 of 15
> Depends on: Phase 572 (Baseline + DUZ Documentation)

---

## Objective

Replace the single global TCP socket with a connection pool keyed by
`tenantId:duz`. Each connection authenticates as a specific VistA user,
ensuring clinical actions are attributed to the correct provider.

## Files Created

- `apps/api/src/vista/rpcConnectionPool.ts` — Pool class with per-connection
  mutex, idle reaping, health checks, and authenticated connections

## Files Modified

- `apps/api/src/lib/rpc-resilience.ts` — `safeCallRpc` and
  `safeCallRpcWithList` gain optional `ctx: RpcContext` parameter.
  With context, routes through pool. Without, falls back to legacy path.
- `apps/api/src/vista/config.ts` — Added pool configuration env vars:
  `VISTA_POOL_SIZE`, `VISTA_MAX_CONNECTIONS_PER_USER`,
  `VISTA_MAX_POOL_TOTAL`, `VISTA_IDLE_TIMEOUT_MS`

## Architecture

```
safeCallRpc("ORWPT LIST ALL", [dfn], { ctx })
  └─ resilientRpc (circuit breaker + timeout + retry)
       └─ poolCallRpc
            └─ acquireConnection(ctx.tenantId, ctx.duz)
                 ├─ Pool hit → reuse existing authenticated connection
                 └─ Pool miss → createPooledConnection → TCP + XUS AV CODE
                      └─ per-connection mutex → callRpc → return lines
```

## Backward Compatibility

All existing callers of `safeCallRpc(name, params)` continue to work
unchanged — they use the legacy single-socket path. Migration to pool is
incremental: routes opt in by passing `{ ctx }` in the options object.

## Acceptance Criteria

- [ ] `rpcConnectionPool.ts` exports `poolCallRpc`, `poolCallRpcWithList`,
      `getPoolStats`, `disconnectPool`, `startPoolReaper`
- [ ] `safeCallRpc` accepts optional `ctx` and routes through pool when present
- [ ] Pool evicts least-recently-used connection when at capacity
- [ ] Idle reaper runs every 60s and closes connections idle > 5 min
- [ ] Config exports `VISTA_POOL_SIZE`, `VISTA_MAX_CONNECTIONS_PER_USER`,
      `VISTA_MAX_POOL_TOTAL`, `VISTA_IDLE_TIMEOUT_MS`
