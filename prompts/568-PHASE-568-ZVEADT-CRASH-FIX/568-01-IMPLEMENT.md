# Phase 568 — ZVEADT WARDS Crash Fix + Probe Cascade Prevention

## User Request

Fix the inpatient/ADT showstopper where calling `ZVEADT WARDS` closes the
broker socket and causes a cascade of 16+ "Not connected" false negatives
in the RPC capability probe.

## Implementation Steps

### A) Fix ZVEADT.m MUMPS Routine (root cause)
1. Add `$ETRAP` error trapping to all 3 entry points (WARDS, BEDS, MVHIST)
2. Add `$D()` global existence checks before traversing ^DIC(42), ^DIC(42.4), ^DGPM("APTT")
3. Return clean `RESULT(0)="0^NOT_AVAILABLE^reason"` on missing globals
4. Add shared ERRTRAP/ERRMSG helper tags

### B) Fix rpcCapabilities.ts (cascade prevention)
1. Add `SOCKET_LOST_PATTERNS` detection for "Not connected", "Socket closed", etc.
2. On socket-lost error during probe loop: `disconnect()` + `connect()` + retry once
3. Record actual failure reason vs cascade artifact

### C) Harden rpcBrokerClient.ts close/error handlers
1. Socket `close` handler: reset `readBuf` and `sessionDuz` (not just `connected`)
2. Socket `error` handler: same full reset

### D) Update evidence doc
1. Update docs/VISTA_CONNECTIVITY_RESULTS.md with fix details
2. Document the 6 true missing RPCs vs the 17 recovered cascade RPCs

## Verification Steps

1. TypeScript compiles without errors (`pnpm -C apps/api exec tsc --noEmit`)
2. ZVEADT.m has `$ETRAP` in all 3 entry points
3. rpcCapabilities.ts has reconnect-on-socket-lost logic
4. Evidence doc updated with fix explanation

## Files Touched

- `services/vista/ZVEADT.m` — defensive error trapping + global checks
- `apps/api/src/vista/rpcCapabilities.ts` — reconnect-on-socket-lost in probe loop
- `apps/api/src/vista/rpcBrokerClient.ts` — full state reset in close/error handlers
- `docs/VISTA_CONNECTIVITY_RESULTS.md` — updated evidence
- `prompts/568-PHASE-568-ZVEADT-CRASH-FIX/568-01-IMPLEMENT.md` — this file
