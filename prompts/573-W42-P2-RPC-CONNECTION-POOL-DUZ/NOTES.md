# Phase 573 — Notes

## Why This Phase Exists

The single-DUZ problem (Phase 572) documented that all VistA RPC calls execute
under one user identity. This phase implements the fix: a connection pool where
each connection authenticates as the acting clinician.

## Decisions

- **Protocol helpers duplicated**: XWB framing functions (sPack, lPack,
  buildRpcMessage, cipherEncrypt) are duplicated in rpcConnectionPool.ts
  rather than imported from rpcBrokerClient.ts to avoid circular dependencies
  and keep the pool module self-contained.
- **Backward compatible**: The `opts.ctx` parameter is optional. Existing
  callers are unaffected and will be migrated incrementally.
- **No credentials in session**: Connections are authenticated at creation
  time. If a pooled connection dies, the user re-authenticates on next call.
  Credentials are not stored in sessions or PG.
- **LRU eviction**: When pool is at capacity, the least recently used
  connection is destroyed to make room.

## Deferred

- Wiring routes to pass `ctx` to `safeCallRpc` — done incrementally as
  routes are implemented in Phases 578-581.
- Redis-backed pool state for multi-instance — addressed in Phase 574.
