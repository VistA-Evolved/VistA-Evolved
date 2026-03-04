# Phase 381 — W21-P4 IMPLEMENT: HL7 v2 MLLP Ingest

## Goal

HL7 v2 message parser (ORU/ORM) with MLLP framing, observation extraction,
ACK generation, and HTTP ingest endpoint for gateway-to-server communication.

## Files Created

- `apps/api/src/devices/hl7v2-parser.ts` — MLLP framing + HL7 parser + ACK generator
- `apps/api/src/devices/hl7v2-ingest-routes.ts` — 3 ingest routes (ingest, parse, log)
- `apps/api/src/devices/fixtures/hl7v2-oru-cbc.hl7` — CBC fixture
- `apps/api/src/devices/fixtures/hl7v2-oru-vitals.hl7` — Vitals fixture
- `apps/api/src/devices/fixtures/hl7v2-oru-abg.hl7` — ABG fixture
- `apps/api/src/devices/fixtures/hl7v2-oru-glucose-high.hl7` — High glucose (HH flag)
- `apps/api/src/devices/fixtures/hl7v2-orm-order.hl7` — ORM order fixture

## Key Design

- Parser handles configurable field/component separators from MSH
- OBX extraction maps to DeviceObservation via gateway-store
- ACK generation follows HL7 v2 MSA standard (AA/AE/AR)
- Ingest endpoint accepts both JSON envelope and raw HL7 content types
- /parse endpoint for dry-run diagnostics without storing
