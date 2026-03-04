# Phase 305 — NOTES — Inpatient ADT Writeback (W12-P7)

## Design Decisions

1. **All 3 intents integration-pending.** WorldVistA sandbox has no DGPM write RPCs.
   The executor throws with structured vistaGrounding metadata (target routines, files, migration path).
2. **No silent no-ops.** Every execute() call throws clearly, never returns fake success.
3. **Dry-run still works.** Produces transcripts showing target RPC/routines for documentation.
4. **Migration path documented per intent.** When DGPM write RPCs become available,
   implement ZVEADT ADMIT/TRANSFER/DISCHARGE wrappers and register them.

## VistA File Grounding

| Intent            | Files      | Routines    |
| ----------------- | ---------- | ----------- |
| ADMIT_PATIENT     | 405, 2, 42 | DGPM, DGPMV |
| TRANSFER_PATIENT  | 405, 42    | DGPM, DGPMV |
| DISCHARGE_PATIENT | 405, 2     | DGPM, DGPMV |
