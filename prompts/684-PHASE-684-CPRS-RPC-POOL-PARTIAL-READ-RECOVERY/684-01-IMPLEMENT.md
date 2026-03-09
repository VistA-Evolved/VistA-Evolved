# Phase 684 - CPRS RPC Pool Partial Read Recovery

## User Request

- Continue autonomously until the clinician experience is production-grade.
- Keep the system VistA-first and investigate live defects from the end-user point of view.
- If something is missing or degraded, check prompt lineage before implementing.

## Problem Statement

- The clinician Immunizations chart tab showed degraded mode while VistA itself remained reachable.
- Live validation proved `ORQQPX IMMUN LIST` is contract-correct, but an earlier route call returned a transient malformed payload.
- Investigation points to the DUZ-scoped RPC connection pool accepting partial socket reads as valid responses when a pooled connection closes before the XWB EOT terminator arrives.

## Implementation Steps

1. Harden `apps/api/src/vista/rpcConnectionPool.ts` so pooled reads reject partial responses, clear tainted buffers, and fail fast if stale bytes are already present without an EOT terminator.
2. Ensure a tainted pooled connection is not reused after close/error/timeout scenarios.
3. Add a focused regression test covering the stale-buffer and partial-close cases.
4. Re-run live VEHU clinician route verification for `/vista/immunizations` after the patch to prove truthful behavior remains intact.
5. Update operational artifacts with the root cause, verification steps, and files touched.

## Verification Steps

1. Run targeted API tests for the new RPC pool regression coverage.
2. Start or confirm the API against live VEHU Docker and call `/vista/immunizations?dfn=46` and `/vista/immunizations?dfn=84` with an authenticated clinician session.
3. Repeat the immunization route call several times to confirm the pooled path stays stable and does not surface malformed data.
4. Confirm `/health` remains healthy and the circuit breaker is not left open after successful reads.

## Files Touched

- apps/api/src/vista/rpcConnectionPool.ts
- apps/api/tests/rpc-connection-pool.test.ts
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json
