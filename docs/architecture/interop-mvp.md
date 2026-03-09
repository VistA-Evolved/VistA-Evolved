# Interoperability MVP -- Working Capabilities

> Generated: 2026-03-09

## FHIR R4 Gateway

### Supported Resources (9)

| Resource | Endpoint | Operations | Profile |
| -------- | -------- | ---------- | ------- |
| Patient | /fhir/Patient | read, search | us-core-patient |
| AllergyIntolerance | /fhir/AllergyIntolerance | search by patient | us-core-allergyintolerance |
| Condition | /fhir/Condition | search by patient | us-core-condition-problems-health-concerns |
| Observation | /fhir/Observation | search by patient+category | us-core-vital-signs, us-core-observation-lab |
| MedicationRequest | /fhir/MedicationRequest | search by patient | us-core-medicationrequest |
| DocumentReference | /fhir/DocumentReference | search by patient | us-core-documentreference |
| Encounter | /fhir/Encounter | search by patient | us-core-encounter |
| CapabilityStatement | /fhir/metadata | read | FHIR R4 |
| SMART Config | /.well-known/smart-configuration | read | SMART App Launch |

### Auth
- Session cookie for web clients
- SMART Bearer JWT for external FHIR clients
- Configured via `"fhir"` auth level in AUTH_RULES

### Data Flow
```
External FHIR Client
    |
    v
Fastify API (/fhir/*)
    |
    v
ClinicalEngineAdapter (VistA or stub)
    |
    v
VistA RPCs (ORWPT, ORQQAL, ORQQPL, etc.)
    |
    v
FHIR R4 JSON mapper (US Core profiles)
```

## HL7v2 Engine

### Message Types

| Type | Trigger Events | Direction | Status |
| ---- | -------------- | --------- | ------ |
| ADT | A01, A02, A03, A08 | In + Out | Live |
| ORU | R01 | In + Out | Live |
| ORM | O01 | In + Out | Live |
| SIU | S12-S15, S26 | In + Out | Live |
| ACK | * | Out | Live |

### Key Endpoints

| Endpoint | Method | Purpose |
| -------- | ------ | ------- |
| /hl7/ingest | POST | Accept raw HL7, map to domain event |
| /hl7/fhir/convert | POST | HL7v2 -> FHIR R4 Bundle conversion |
| /hl7/outbound/build | POST | Build outbound HL7 message |
| /hl7/packs | GET | List message pack templates |
| /hl7/health | GET | Engine health status |
| /devices/hl7v2/ingest | POST | Device ORU/ORM ingestion |

### MLLP Server
- Opt-in via `HL7_ENGINE_ENABLED=true`
- Full MLLP message framing
- Routing engine with configurable rules
- Dead-letter queue with replay capability

## Additional Capabilities

### FHIR Subscriptions
- REST-hook based (FHIR R4 Topic subscription)
- CRUD endpoints: /fhir-subscriptions/*
- Notification delivery and retry

### Bulk Data Access
- NDJSON export: /bulk-data/export
- NDJSON import: /bulk-data/import
- Job-based async processing

### FHIR Bundle Import
- POST /migration/fhir/import
- Supports: Patient, Condition, MedicationRequest, AllergyIntolerance, Observation, Encounter
- Admin-only

### VistA HL7/HLO Telemetry
- Reads VistA HL7 files (771-779)
- /vista/interop/hl7-links, /vista/interop/hl7-messages
- Live when VistA is running

## Compliance Checklist

- [x] FHIR R4 resource endpoints (7 clinical + metadata + SMART)
- [x] US Core profiles for all mapped resources
- [x] CapabilityStatement endpoint
- [x] SMART App Launch configuration
- [x] HL7v2 ADT message handling
- [x] HL7v2 ORU result handling
- [x] HL7v2 -> FHIR conversion bridge
- [x] Bulk Data Access (NDJSON)
- [x] FHIR Subscriptions (rest-hook)
- [x] VistA interop telemetry
- [ ] FHIR write operations (not yet implemented)
- [ ] CDS Hooks (scaffold only)
- [ ] C-CDA import/export (partial)
