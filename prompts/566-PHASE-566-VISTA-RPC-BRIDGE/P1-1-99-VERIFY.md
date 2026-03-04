# P1-1 — Verify — VistA RPC Bridge

## Verification Steps

1. Confirm `apps/api/src/services/vistaRpcBridge.ts` exists with class export
2. Confirm `apps/api/tests/vista/vistaConnectivity.test.ts` exists with 6 tests
3. Confirm `scripts/verify-vista.ts` exists with standalone runner
4. Confirm `verify:vista` script in root package.json
5. Run `grep -c 'export\|connect\|disconnect\|call' apps/api/src/services/vistaRpcBridge.ts` → ≥5 matches
6. Run `pnpm -C apps/api test -- tests/vista/vistaConnectivity.test.ts` → all tests skip or pass
7. If VistA Docker running: `pnpm run verify:vista` → X/5 tests passed

## Acceptance Criteria

- [ ] VistaRpcBridge class has: constructor, connect(), disconnect(), call(), isConnected
- [ ] Auto-reconnect with 3 retries and 5s delay
- [ ] All RPC calls logged with name, response time, success/fail
- [ ] Test suite skips cleanly when VISTA_HOST not set
- [ ] Verification script prints PASS/FAIL per test with response time
- [ ] No new npm dependencies added (reuses existing rpcBrokerClient.ts)
