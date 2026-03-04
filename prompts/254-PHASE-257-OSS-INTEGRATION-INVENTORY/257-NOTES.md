# Phase 257 — Notes

## Key Findings from Inventory

1. **HL7v2 engine is already built.** 18 files across parser, MLLP
   server/client, ACK generator, 4 message packs, routing/dispatch.
   Wave 8 extends this with DB persistence, replay, and PHI-safe logging.

2. **FHIR R4 gateway is comprehensive.** 10 files with mappers,
   CapabilityStatement, SMART on FHIR, bearer auth, scope enforcement,
   search params, and ETag caching.

3. **RCM subsystem is the largest.** 100+ files, 13 connectors across
   5 markets, full EDI pipeline, credential vault, VistA bindings.
   Wave 8 formalizes the adapter SDK and adds sandbox harness.

4. **Onboarding wizard already exists.** `onboarding-routes.ts` and
   admin UI page. Wave 8 adds integration setup steps.

5. **Support console exists.** Diagnostics, ticket store, WS debug
   console, break-glass. Wave 8 adds HL7 message viewer and replay.

6. **Export engine exists.** Multiple formats, record portability
   (C-CDA/FHIR), audit shipping. Wave 8 adds tenant export and
   FHIR bulk-ish pattern.

## Decisions NOT Made (Deferred)

- Full FHIR Bulk Data API ($export) — deferred to Wave 9
- Mirth Connect integration — decided against per ADR
- External FHIR server sidecar — decided against per ADR
- Velero mandatory requirement — referenced but not mandated

## Follow-ups

- Each Wave 8 phase will reference these ADRs
- Integration maturity matrix updated as phases complete

Evidence captured: `/evidence/wave-8/P1/`
