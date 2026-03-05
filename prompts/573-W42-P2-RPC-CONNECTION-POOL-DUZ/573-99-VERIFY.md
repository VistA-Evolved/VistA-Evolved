# Phase 573 — W42-P2: Verification

## Gate 1: Pool module exists and exports

```bash
grep -c "export async function poolCallRpc" apps/api/src/vista/rpcConnectionPool.ts
# Expected: 1
grep -c "export async function poolCallRpcWithList" apps/api/src/vista/rpcConnectionPool.ts
# Expected: 1
grep -c "export function getPoolStats" apps/api/src/vista/rpcConnectionPool.ts
# Expected: 1
grep -c "export function disconnectPool" apps/api/src/vista/rpcConnectionPool.ts
# Expected: 1
```

## Gate 2: safeCallRpc accepts optional context

```bash
grep "ctx.*RpcContext" apps/api/src/lib/rpc-resilience.ts
# Expected: lines showing ctx parameter in safeCallRpc and safeCallRpcWithList
```

## Gate 3: Config exports pool env vars

```bash
grep "VISTA_POOL_SIZE\|VISTA_MAX_POOL_TOTAL\|VISTA_IDLE_TIMEOUT_MS" apps/api/src/vista/config.ts
# Expected: 3+ lines
```

## Gate 4: TypeScript compiles

```bash
cd apps/api && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
# Expected: no errors in modified files
```

## Gate 5: Backward compatibility preserved

Verify existing callers still work by checking that `safeCallRpc(name, params)`
without context compiles and routes to legacy path.
