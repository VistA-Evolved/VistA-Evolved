# Phase 527 — C6: Device Ingest → Clinical Observation Pipeline v1

## Goal
Create a DeviceObservation model that bridges device ingest (HL7v2, ASTM, POCT1-A)
to clinical observation storage with FHIR + VistA writeback contracts.

## Implementation
- `apps/api/src/devices/device-observation-pipeline.ts`
- DeviceObservation type with provenance + normalization metadata
- PG-backed observation store (reuses device_observation from v56)
- FHIR Observation R4 mapper scaffold
- VistA writeback contract (target: GMRC SAVE VITALS, integration-pending)
