# Phase 464 — ED Tracker Types VERIFY

## Gates

1. `types.ts` exports EdVisit, TriageLevel, BedAssignment, EdDisposition
2. `ed-store.ts` exports in-memory store with CRUD
3. No PHI in type IDs
4. Types cover full ED workflow: arrival -> triage -> bed -> treatment -> disposition
