# Phase 684 - CPRS RPC Pool Partial Read Recovery Verify

## Goal

- Prove the DUZ-scoped RPC connection pool no longer treats partial socket data as a valid RPC response and that live clinician immunization reads remain truthful against VEHU.

## Verification Steps

1. Run `pnpm --dir apps/api exec vitest run tests/rpc-connection-pool.test.ts`.
2. Confirm Docker containers are healthy and the API is running with `.env.local` against VEHU.
3. Authenticate with `PRO1234 / PRO1234!!` and call:
   - `GET /vista/immunizations?dfn=46`
   - `GET /vista/immunizations?dfn=84`
4. Repeat the DFN 84 immunization request in a short loop to check for transient pooled-response corruption.
5. Check `/health` before and after the repeated reads to confirm the breaker remains closed after successful traffic.

## Acceptance Criteria

- The targeted Vitest suite passes.
- DFN 46 returns a truthful empty immunization result set.
- DFN 84 returns the expected real VEHU immunization rows without malformed payloads.
- No repeated request returns cross-RPC garbage or partial-response artifacts.
- Operational artifacts document the root cause and verification evidence.

## Files Touched

- apps/api/src/vista/rpcConnectionPool.ts
- apps/api/tests/rpc-connection-pool.test.ts
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json