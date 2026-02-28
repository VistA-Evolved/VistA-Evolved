# Phase 306 — NOTES — Imaging/PACS Validation (W12-P8)

## Design Decisions
1. **PLACE_IMAGING_ORDER uses general order pipeline.** Same ORWDX LOCK/SAVE/UNLOCK.
   VistA Radiology-specific RPCs (RA ASSIGN ACC#) are integration-pending.
2. **LINK_IMAGING_STUDY is a sidecar operation.** Links in-memory imaging worklist
   entry to an Orthanc/DICOM study. No VistA RPC needed for the Phase 23 sidecar.
3. **linkageMode: "sidecar"** in vistaRefs makes it clear this is local, not VistA.

## RPC Mapping
| Intent | RPCs | Notes |
|--------|------|-------|
| PLACE_IMAGING_ORDER | ORWDX LOCK, SAVE, UNLOCK | Standard order pipeline |
| LINK_IMAGING_STUDY | (none) | Local sidecar linkage |
