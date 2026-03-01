# Phase 431 Notes

## Decisions
- Write methods return integration-pending (not fake success) - consistent with no-dead-clicks rule
- VistA adapter writes include vistaGrounding with target RPC, package, files, and migration path
- ADT reads (getWards, getMovements) are live-wired to existing ORQPT/ORWPT16 RPCs
- DGPM write RPCs added to exceptions (known unavailable in sandbox) rather than registry (no sandbox test)
- WriteResult type is simple {success, ien?, message?} - adapters wrap in AdapterResult

## Key Finding
ClinicalEngineAdapter had 11 read methods and 0 write methods (Phase 37C).
Now has 11 read + 4 write + 5 ADT = 20 methods total.
This is the first step toward unifying all clinical writes through the adapter layer.
