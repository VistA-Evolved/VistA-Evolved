# Phase 279 — Interop HL7 Engine: Production Convergence

## User Request

Enhance the existing in-process HL7v2 MLLP engine (Phase 238-241, 258-260)
with production-convergence features: FHIR R4 message bridge, channel health
monitoring, outbound message builder, conformance profile declaration, and
a QA gate. Per ADR-hl7-engine-choice.md, Mirth Connect was explicitly rejected.

## Inventory

- Existing HL7 engine: `apps/api/src/hl7/` (14 files, Phase 238-260)
  - mllp-server.ts, mllp-client.ts — TCP framing
  - parser.ts, ack-generator.ts — message handling
  - routing/ (registry, matcher, transform, index) — route engine
  - packs/ (adt, oru, orm, siu) — message type packs
  - domain-mapper.ts — HL7v2 → domain events
  - message-event-store.ts — hash-chained audit
  - dead-letter-enhanced.ts — DLQ with replay
  - tenant-endpoints.ts — per-tenant HL7 endpoint config
- `services/hl7/docker-compose.yml` — test sender container
- `apps/api/src/routes/hl7-engine.ts` — engine API routes
- `apps/api/src/routes/vista-interop.ts` — VistA HL7/HLO telemetry
- `services/vista/ZVEMIOP.m` — 4 interop RPC entry points

## Implementation Steps

1. Create `apps/api/src/hl7/fhir-bridge.ts`:
   - Convert inbound ADT/ORU/ORM/SIU messages to FHIR R4 Bundles
   - Pure functions, typed output (Patient, Encounter, DiagnosticReport, etc.)
   - PHI-safe: no logging of patient data

2. Create `apps/api/src/hl7/channel-health.ts`:
   - Aggregate health status across all configured tenant endpoints
   - Track per-endpoint: up/down, last message time, error rate
   - Expose via existing `/hl7/health` route enhancement

3. Create `apps/api/src/hl7/outbound-builder.ts`:
   - Build HL7v2 messages for outbound transmission (ADT, ORU, ORM)
   - Uses domain event data as input, produces wire-format HL7v2
   - Supports tenant-specific sending facility/application codes

4. Create `config/hl7-conformance.json`:
   - Declares supported message types, trigger events, segments
   - Maps to ONC/IHE integration profiles (PIX/PDQ, XDS.b)

5. Create `scripts/qa-gates/hl7-interop-gate.mjs`:
   - Validates engine modules exist and export correctly
   - Checks conformance profile completeness
   - Verifies HL7 route files are registered

## Verification Steps

- FHIR bridge exports conversion functions for all 4 message packs
- Channel health module exports aggregation function
- Outbound builder exports message construction functions
- Conformance profile is valid JSON with required structure
- QA gate passes
