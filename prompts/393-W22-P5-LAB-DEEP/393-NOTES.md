# Phase 393 — W22-P5: Lab Deep Workflows — NOTES

## Design Decisions
- **9-state lab order FSM** mirrors pharmacy FSM pattern: pending → collected →
  in_process → resulted → reviewed → verified → final, plus cancelled/on_hold.
- **8-state specimen lifecycle** tracks chain-of-custody: ordered → collected →
  in_transit → received → processing → completed, plus rejected/lost.
- **Critical value auto-detection** evaluates 10 analyte thresholds (Glucose,
  Potassium, Sodium, Calcium, Hemoglobin, Platelets, WBC, INR, Troponin, pH)
  on result creation and auto-creates alerts for values outside ranges.
- **Wave 21 bridge**: `SpecimenSample.deviceObservationIds` links to ASTM/POCT1-A
  device observations; `LabResult.deviceObservationId` links to individual
  device readings. Uses same `DeviceObservation` IDs from gateway-store.
- **Read-back verification**: `CriticalAlert.readBackVerified` supports Joint
  Commission NPSG (National Patient Safety Goals) for critical result read-back.
- **Writeback posture**: ORWDX SAVE (available via Phase 304 executor),
  ORWLRR ACK (available), ORWLRR CHART (available), LR VERIFY and
  LR PHLEBOTOMY (integration_pending — not in sandbox RPCs).

## Existing Integrations Preserved
- CPRS Wave1 `GET /vista/cprs/labs/chart` (ORWLRR CHART) — unchanged
- CPRS Wave2 `POST /vista/cprs/labs/ack` (ORWLRR ACK) — unchanged
- Writeback executor `PLACE_LAB_ORDER` / `ACK_LAB_RESULT` — unchanged
- Event bus `LAB_RESULT_POSTED` — defined, emitter can be wired in future
