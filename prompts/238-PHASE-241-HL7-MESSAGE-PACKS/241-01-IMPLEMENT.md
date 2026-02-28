# Phase 241 — HL7v2 Core Message Packs (Wave 6 P4)

## Context
P2 built the MLLP engine, P3 built the routing layer. P4 adds message
pack modules for the major HL7v2 event families used in VistA integration:
ADT (patient movement), ORM (orders), ORU (results), SIU (scheduling).

Each pack provides: message builders, parsers, validators, and pre-built
route templates — making it trivial to configure common HL7 workflows.

## Files Changed/Created

### New
- `apps/api/src/hl7/packs/types.ts` — Shared pack types (MessagePack interface, validation result)
- `apps/api/src/hl7/packs/adt-pack.ts` — ADT A01-A08 builders + validators
- `apps/api/src/hl7/packs/orm-pack.ts` — ORM O01 order message builders + validators
- `apps/api/src/hl7/packs/oru-pack.ts` — ORU R01 result message builders + validators
- `apps/api/src/hl7/packs/siu-pack.ts` — SIU S12-S15 scheduling builders + validators
- `apps/api/src/hl7/packs/index.ts` — Pack registry barrel export
- `apps/api/src/routes/hl7-packs.ts` — Pack listing + validation + builder endpoints

### Modified
- `apps/api/src/server/register-routes.ts` — Register hl7-packs routes

## Verification
- scripts/verify-phase241-hl7-packs.ps1 (8 gates)
