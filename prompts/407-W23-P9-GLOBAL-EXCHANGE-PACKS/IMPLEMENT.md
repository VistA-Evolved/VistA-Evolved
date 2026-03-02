# 407-01-IMPLEMENT — Global Exchange Packs

## Phase 407 (W23-P9)

### Goal
Extend exchange-packs with EU (IHE XDS.b, MHD) and OpenHIE (SHR) profiles.
Each region has distinct standards and auth requirements.

### Built-in Global Pack Profiles
- `eu-xds`: IHE XDS.b ITI-18/41/42/43 + HL7v3 CDA
- `eu-mhd`: IHE MHD (FHIR R4 + DocumentReference Submit/Query)
- `openhie-shrx`: OpenHIE SHR extended + mediator pattern
- `openhie-shr`: OpenHIE Shared Health Record + FHIR R4

### Implementation
Shares source files with P8. All 6 profiles are seeded in `pack-store.ts`.
Exchange simulation creates completed transactions with mock timing.
