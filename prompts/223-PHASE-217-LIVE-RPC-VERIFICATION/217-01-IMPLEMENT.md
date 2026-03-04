# Phase 217 -- Live RPC Communication Verification Suite

## Implementation Steps

1. Create `scripts/verify-rpc-communication.mjs` -- a static + live RPC verification tool
2. Static analysis: cross-reference route-rpc-map.json with rpcRegistry.ts
3. Live mode (requires Docker + API running): probe actual RPC capability
4. Output results to artifacts/wave4/Q217/rpc-verification.json
5. Create Q217 prompt files

## Files Touched

- scripts/verify-rpc-communication.mjs (new)
- prompts/223-PHASE-217-LIVE-RPC-VERIFICATION/ (new)
- artifacts/wave4/Q217/ (generated, gitignored)
