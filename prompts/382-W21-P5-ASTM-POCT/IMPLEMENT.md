# Phase 382 — W21-P5 IMPLEMENT: ASTM + POCT1-A Ingest

## Goal

ASTM E1381/E1394 frame parser and POCT1-A (IEEE/CLSI) XML parser for
Point-of-Care Testing devices, with HTTP ingest endpoints and fixture tests.

## Files Created

- `apps/api/src/devices/astm-parser.ts` — ASTM frame parser with checksum validation
- `apps/api/src/devices/poct1a-parser.ts` — POCT1-A XML parser (zero-dep regex extraction)
- `apps/api/src/devices/astm-poct1a-ingest-routes.ts` — 6 ingest routes (ASTM + POCT1-A)
- `apps/api/src/devices/fixtures/astm-cbc.astm` — CBC results fixture
- `apps/api/src/devices/fixtures/astm-blood-gas.astm` — ABG fixture
- `apps/api/src/devices/fixtures/astm-chem-critical.astm` — Critical chemistry (DKA)
- `apps/api/src/devices/fixtures/astm-coagulation.astm` — PT/INR/APTT fixture
- `apps/api/src/devices/fixtures/astm-glucose-multi-patient.astm` — Multi-patient batched fixture
- `apps/api/src/devices/fixtures/poct1a-glucose-normal.xml` — Normal glucose
- `apps/api/src/devices/fixtures/poct1a-glucose-critical-low.xml` — Critical low glucose
- `apps/api/src/devices/fixtures/poct1a-blood-gas.xml` — ABG with 5 analytes
- `apps/api/src/devices/fixtures/poct1a-coagulation.xml` — PT/INR
- `apps/api/src/devices/fixtures/poct1a-istat-electrolytes.xml` — i-STAT panel (5 analytes)

## Key Design

- ASTM parser handles both raw STX/ETX frames and newline-separated records
- Checksum validation per ASTM E1381 spec (sum mod 256, 2-hex-char)
- POCT1-A uses lightweight regex XML extraction, no external deps
- Both parsers normalize to DeviceObservation via gateway-store
- Per ADR-W21-POCT-ASTM: TypeScript parsers, fixture-tested, checksum validation
