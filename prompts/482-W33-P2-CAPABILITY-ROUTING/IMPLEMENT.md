# Phase 482 -- W33-P2: Capability-Driven Routing

## Objective
Create a standardized Tier-0 response envelope that replaces ad-hoc
"integration-pending" responses with capability-driven routing. Every Tier-0
endpoint will probe the target RPC at runtime and return one of:
- `{ ok: true, source: "vista" }` -- real writeback succeeded
- `{ ok: false, status: "unsupported-in-sandbox", capabilityProbe: {...} }` -- RPC confirmed absent
- `{ ok: false, status: "integration-pending" }` -- ONLY if probe is indeterminate

## Steps
1. Create `apps/api/src/lib/tier0-response.ts` -- shared helpers
2. Add `probeTier0Rpc()` -- uses `optionalRpc()` from rpcCapabilities to build evidence
3. Add `tier0UnsupportedResponse()` -- standardized "unsupported" envelope
4. Add `tier0PendingResponse()` -- standardized "pending" envelope (with evidence)
5. Add Tier-0 RPC entries to KNOWN_RPCS in rpcCapabilities.ts for ADT/eMAR/nursing RPCs
6. Create prompt folder with IMPLEMENT + VERIFY + NOTES

## Files Touched
- `apps/api/src/lib/tier0-response.ts` (created)
- `apps/api/src/vista/rpcCapabilities.ts` (modified -- add ADT/PSB/NURS RPCs)
- `prompts/482-W33-P2-CAPABILITY-ROUTING/` (created)

## Verification
- tier0-response.ts exports the 3 helper functions
- KNOWN_RPCS includes DGPM, PSB, PSJBCMA RPCs
- Integration-pending budget gate still passes (no code changes to routes yet)
