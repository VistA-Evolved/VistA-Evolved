# Phase 391 — W22-P3 Inpatient Core: NOTES

## Design Decisions

- **Separate module from Phase 83**: Phase 83 inpatient routes live at `/vista/inpatient/`
  and use VistA RPCs directly. Phase 391 lives at `/inpatient/` as an application-layer
  bedboard/flowsheet/vitals store that bridges facility-service (W17) locations to
  bed-level patient assignments.

- **Reuses Location from facility-service**: `BedAssignment.locationId` references
  `Location.id` from `facility-service.ts`. No model duplication.

- **Writeback posture**: All three VistA targets (GMV ADD VM, TIU CREATE RECORD,
  DGPM ADT MOVEMENTS) are documented as `integration_pending` with exact sandbox notes.

- **ADT events auto-recorded**: Assign and discharge operations automatically create
  ADT events in the event log to maintain a movement timeline.

- **Device integration bridge**: `FlowsheetRow.source` can be `"device"` with
  `deviceObservationId` linking to Wave 21 device ingest observations.

## VistA RPC Targets (for future writeback)

- `GMV ADD VM` — write vitals (registered in rpcRegistry)
- `TIU CREATE RECORD` — nursing notes (registered)
- `DGPM ADT MOVEMENTS` — patient movements (File ^DGPM)
- `ORQQVI VITALS` — read vitals (already wired)
