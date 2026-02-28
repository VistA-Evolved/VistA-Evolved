# Phase 301 — Notes

## Design Decisions

### Executor registration
- The `tiuExecutor` is exported but NOT auto-registered at module load.
- Registration happens via `registerExecutor("TIU", tiuExecutor)` at server startup.
- This keeps the executor testable in isolation.

### LOCK/SIGN/UNLOCK pattern
- LOCK is called before SIGN, UNLOCK always in finally block.
- If LOCK fails, error is classified as `transient` (may be another user editing).
- UNLOCK failure is logged but does not fail the command (best-effort, matches CPRS behavior).

### esCode handling
- Never stored in any store (command, attempt, result, or audit).
- Only the SHA-256 hash (16 hex chars) is recorded in vistaRefs.
- This matches Phase 154 `hashEsCode()` pattern.

### Error classification
- `permanent`: bad input, unknown intent, invalid IEN returned
- `transient`: lock contention, connection timeout (triggers retry)

## Bugs Found: None

## Follow-ups
- Phase 302: Wire `registerExecutor("TIU", tiuExecutor)` at startup
- Future: Add TIU cosignature support (TIU REQUIRES COSIGNATURE)
