# Phase 260 -- NOTES -- HL7v2 Use-Cases v1

## Key Decisions
- Domain events carry only identifiers (MRN, provider ID), never names/addresses
- Unsupported message types are dead-lettered via enhanced DLQ (Phase 259)
- ORU result corrections detected by OBR-25='C' or ORC-1='SC'
- SIU^S14 treated as cancel (modification often implies cancellation)
- Fixtures directory: services/hl7/fixtures/ (HL7 2.5.1 format)

## Files
| File | Action |
|------|--------|
| `apps/api/src/hl7/domain-mapper.ts` | NEW |
| `apps/api/src/routes/hl7-use-cases.ts` | NEW |
| `services/hl7/fixtures/*.hl7` | NEW (6 files) |
| `apps/api/tests/hl7-use-cases.test.ts` | NEW |
