# Phase 458 — HL7v2 ADT Feed (W30-P3)

## Goal
Parse HL7 v2.x ADT messages (A01-admit, A02-transfer, A03-discharge, A08-update)
into the migration pipeline for patient demographic synchronization.

## Deliverables
1. `apps/api/src/migration/hl7v2-adt.ts` — HL7v2 message parser + ADT processor
2. Update `apps/api/src/routes/migration-routes.ts` — POST /migration/hl7v2/adt endpoint
3. `docs/runbooks/hl7v2-adt-feed.md` — operations guide

## Design
- Parse HL7v2 pipe-delimited messages (MSH, PID, PV1 segments)
- Extract patient demographics from PID segment
- Track ADT events with trigger type (A01/A02/A03/A08)
- In-memory event store for tracking
