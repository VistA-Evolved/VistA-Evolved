# Phase 260 -- HL7v2 Use-Cases v1 (Wave 8 P4)

## Goal
Create deterministic HL7v2 -> domain event mappings for ADT, ORU, and SIU
message families, with test fixtures and ingest endpoint.

## Deliverables

### 1. Test Fixtures (`services/hl7/fixtures/`)
- ADT_A01_admit.hl7 -- Patient admission
- ADT_A03_discharge.hl7 -- Patient discharge
- ADT_A08_update.hl7 -- Patient demographics update
- ORU_R01_lab_result.hl7 -- Lab results (CBC with 5 OBX)
- SIU_S12_new_appointment.hl7 -- New appointment
- SIU_S13_reschedule.hl7 -- Rescheduled appointment

### 2. Domain Mapper (`hl7/domain-mapper.ts`)
- `mapAdtMessage(raw)` -> patient.admitted/discharged/updated/transferred
- `mapOruMessage(raw)` -> result.received/corrected
- `mapSiuMessage(raw)` -> appointment.booked/rescheduled/cancelled/noshow
- `mapHl7ToDomainEvent(raw)` -- universal dispatcher
- PHI-safe: only MRN + provider IDs in payload, no names/addresses

### 3. Use-Case Routes (`routes/hl7-use-cases.ts`)
- POST /hl7/ingest -- Accept raw HL7, map to domain event
- GET /hl7/use-cases -- List all supported mappings
- GET /hl7/use-cases/fixtures -- List test fixtures

## Mapping Table
| HL7 Type | Domain Event |
|----------|-------------|
| ADT^A01 | patient.admitted |
| ADT^A02 | patient.transferred |
| ADT^A03 | patient.discharged |
| ADT^A08 | patient.updated |
| ORU^R01 | result.received |
| ORU^R01 (C) | result.corrected |
| SIU^S12 | appointment.booked |
| SIU^S13 | appointment.rescheduled |
| SIU^S14/S15 | appointment.cancelled |
| SIU^S26 | appointment.noshow |
