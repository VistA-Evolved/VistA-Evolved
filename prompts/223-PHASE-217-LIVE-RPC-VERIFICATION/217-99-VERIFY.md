# Phase 217 -- Verify: Live RPC Communication

## Verification Steps

1. `node scripts/verify-rpc-communication.mjs --static` runs without errors
2. Static analysis validates all route RPCs are registered
3. Output file generated at docs/vista-alignment/rpc-verification-report.md
4. `pnpm qa:prompts` passes

## Acceptance Criteria

- [ ] Static verification script runs successfully
- [ ] All RPCs used in routes are registered in rpcRegistry.ts
- [ ] Report generated with per-route RPC status
- [ ] Phase index updated
