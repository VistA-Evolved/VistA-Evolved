# Phase 594 — VERIFY

## Verification Steps

1. Docker and API health are green before and after the change.
2. VEHU RPC probe confirms `PSO UPDATE MED LIST`, `PSJ LM ORDER UPDATE`, and `DG ADT DISCHARGE` remain unavailable while `TIU CREATE RECORD` remains available.
3. A clinician can start a med-rec session for DFN `46`, record decisions, and complete it with a real TIU draft note.
4. The created TIU note can be read back through `/vista/cprs/notes/text` and matches the med-rec summary contract.
5. A discharge plan can be created, linked to the med-rec work, advanced to ready, and completed with a TIU-backed discharge-prep note while still reporting DG ADT as integration-pending.
6. The inpatient page compiles and exercises the updated discharge-prep flow without breaking the existing census, bedboard, and movement tabs.
7. `scripts/verify-latest.ps1` passes.

## Acceptance Criteria

1. No route or UI claims PSO/PSJ or DG ADT writeback exists in VEHU when it does not.
2. Clinicians have a real discharge-prep workflow instead of a discharge dead-end.
3. TIU-backed documentation is live and traceable with `rpcUsed` metadata.
4. Runbook and ops artifacts reflect the verified contract and remaining sandbox limits.