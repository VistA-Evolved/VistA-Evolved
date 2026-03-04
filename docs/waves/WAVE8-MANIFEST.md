# Wave 8 Manifest -- Enterprise Integrations + Customer Ops

**Created:** 2026-02-28
**Status:** In Progress

## Overview

Wave 8 extends the existing HL7v2, FHIR, payer, onboarding, support, and
export infrastructure into production-grade enterprise integrations with
tenant-safe routing, PHI-safe logging, deterministic testing, and
operational tooling for customer success.

## Phase Tracker

| #   | Phase                                    | Folder                                  | Status  |
| --- | ---------------------------------------- | --------------------------------------- | ------- |
| P1  | 257 -- OSS Integration Inventory + ADRs  | 254-PHASE-257-OSS-INTEGRATION-INVENTORY | Planned |
| P2  | 258 -- HL7v2 Integration Engine Baseline | 255-PHASE-258-HL7V2-ENGINE-BASELINE     | Planned |
| P3  | 259 -- HL7v2 Message Pipeline            | 256-PHASE-259-HL7V2-MESSAGE-PIPELINE    | Planned |
| P4  | 260 -- HL7v2 Use-Cases v1 (ADT+ORU+SIU)  | 257-PHASE-260-HL7V2-USE-CASES           | Planned |
| P5  | 261 -- Payer Adapters at Scale           | 258-PHASE-261-PAYER-ADAPTERS-SCALE      | Planned |
| P6  | 262 -- Onboarding UX v2                  | 259-PHASE-262-ONBOARDING-UX-V2          | Planned |
| P7  | 263 -- Support Tooling v2                | 260-PHASE-263-SUPPORT-TOOLING-V2        | Planned |
| P8  | 264 -- Data Portability Exports v1       | 261-PHASE-264-DATA-PORTABILITY          | Planned |
| P9  | 265 -- Pilot Hospital Hardening Pack     | 262-PHASE-265-PILOT-HARDENING-PACK      | Planned |

## Dependencies

```
P1 (ADRs + inventory) --> P2 (HL7 engine)
P2 (HL7 engine) --> P3 (message pipeline)
P3 (pipeline) --> P4 (use-cases)
P1 (ADRs) --> P5 (payer adapters)
P1..P4 --> P6 (onboarding)
P3..P5 --> P7 (support tooling)
P1..P5 --> P8 (data portability)
P1..P8 --> P9 (pilot hardening)
```

## Existing Foundations (inherited from prior waves)

| Capability                                          | Status   | Location                                         |
| --------------------------------------------------- | -------- | ------------------------------------------------ |
| HL7v2 MLLP engine (parser, server, client, ACK)     | Working  | apps/api/src/hl7/                                |
| HL7v2 message packs (ADT, ORM, ORU, SIU)            | Working  | apps/api/src/hl7/packs/                          |
| HL7v2 routing/dispatch layer                        | Working  | apps/api/src/hl7/routing/                        |
| HL7v2 ADR                                           | Accepted | docs/decisions/ADR-hl7-engine-choice.md          |
| FHIR R4 gateway (9 endpoints, SMART, scopes, cache) | Working  | apps/api/src/fhir/                               |
| RCM subsystem (13 connectors, 5 markets)            | Working  | apps/api/src/rcm/                                |
| Payer seed data (US, PH, AU, NZ, SG)                | Working  | data/payers/                                     |
| Onboarding wizard + preflight                       | Working  | apps/api/src/pilot/, routes/onboarding-routes.ts |
| Support console (diagnostics, tickets, WS debug)    | Working  | apps/api/src/support/                            |
| Export engine + record portability                  | Working  | apps/api/src/exports/                            |
| Audit shipping (JSONL to S3/MinIO)                  | Working  | apps/api/src/audit-shipping/                     |
| Wave 7 verification gates (197 gates)               | Passing  | scripts/verify-phase\*.ps1                       |

## Conventions

- Prompt folders: `<prefix>-PHASE-<phaseNum>-<SLUG>`
- Each folder: `<phaseNum>-01-IMPLEMENT.md`, `<phaseNum>-99-VERIFY.md`, `<phaseNum>-NOTES.md`
- Evidence: `/evidence/wave-8/P<n>/`
- One commit per phase: `phase(<id>): <title> (Wave 8 P<n>)`
- No PHI in evidence/fixtures/logs
