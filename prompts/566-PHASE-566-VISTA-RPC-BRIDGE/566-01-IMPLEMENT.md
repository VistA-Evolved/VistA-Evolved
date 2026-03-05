# Phase 566 -- VistA RPC Bridge -- Verified Live Connection

## User Request

Create a verified, tested VistA RPC connection layer with:

- A `VistaRpcBridge` class wrapping the existing XWB protocol client
- Connection test suite (skip if no VistA running)
- Standalone verification script with pass/fail output

## Implementation Steps

1. **Inventory** existing RPC client at `apps/api/src/vista/rpcBrokerClient.ts` (768 lines, full XWB protocol), resilience layer at `apps/api/src/lib/rpc-resilience.ts` (499 lines, circuit breaker + retry + cache), and config at `apps/api/src/vista/config.ts`
2. **Create bridge facade** `apps/api/src/services/vistaRpcBridge.ts` — class-based wrapper around existing functional API (`connect`, `callRpc`, `disconnect`, `safeCallRpc`) with constructor accepting host/port/credentials, auto-reconnect, and per-call logging
3. **Create test suite** `apps/api/tests/vista/vistaConnectivity.test.ts` — vitest, 6 tests, `describe.skipIf(!env.VISTA_HOST)` guard
4. **Create verification script** `scripts/verify-vista.ts` — standalone runner, loads env, reports PASS/FAIL per RPC, exit code
5. **Add script** `verify:vista` to root `package.json`
6. **Update docs** `CURRENT_TASK.md` and `SESSION_LOG.md`

## Key Decision: Reuse Existing Client

The codebase already has a battle-tested XWB RPC Broker client (implemented from scratch, not nodevista499). It includes:

- Full XWB protocol: TCPConnect → XUS SIGNON SETUP → XUS AV CODE → XWB CREATE CONTEXT
- Cipher pad encryption from XUSRB1.m Z-tag (20 pads, correct $TR algorithm)
- Auto-reconnect via `isSocketHealthy()` + stale socket detection (5 min idle)
- Async mutex (`withBrokerLock`) for thread-safe socket operations
- Circuit breaker, timeout, retry, caching via `safeCallRpc`

Installing nodevista499 would be a regression. The bridge class wraps existing infrastructure.

## Files Touched

- `apps/api/src/services/vistaRpcBridge.ts` (NEW)
- `apps/api/tests/vista/vistaConnectivity.test.ts` (NEW)
- `scripts/verify-vista.ts` (NEW)
- `package.json` (add verify:vista script)
- `docs/CURRENT_TASK.md` (updated)
- `docs/SESSION_LOG.md` (updated)
- `prompts/566-PHASE-566-VISTA-RPC-BRIDGE/566-01-IMPLEMENT.md` (this file)
- `prompts/566-PHASE-566-VISTA-RPC-BRIDGE/566-99-VERIFY.md`
