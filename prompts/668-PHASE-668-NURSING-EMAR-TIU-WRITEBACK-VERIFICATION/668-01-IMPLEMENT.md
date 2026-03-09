# Phase 668 - Nursing and eMAR TIU Writeback Verification

## User Request
- Continue autonomously until clinician-facing workflows are fully working and truthful.
- Use VistA first and validate live behavior, not just code shape.
- If something is still missing or pending, trace it to prompts and real VistA behavior.

## Implementation Steps
1. Re-verify Docker and API runtime health before any backend write-path work.
2. Audit nursing and eMAR TIU fallback write routes that were touched after the CPRS notes LIST-key serializer fix.
3. Run live clinician login plus real HTTP calls for nursing MAR administer and eMAR administer against DFN 46.
4. Inspect TIU readback to confirm whether fallback notes are actually created and whether note body text persists.
5. If live behavior fails or is falsely reported, fix the underlying route contract or verification logic with minimal edits.
6. Re-run the live calls until the returned API result is truthful and consistent with VistA readback.
7. Update runbook and ops summary only if behavior or operating guidance changes.

## Files Touched
- apps/api/src/routes/nursing/index.ts
- apps/api/src/routes/emar/index.ts
- apps/api/src/vista/rpcBrokerClient.ts
- apps/api/src/vista/rpcConnectionPool.ts
- docs/runbooks/vista-rpc-notes.md
- ops/summary.md
