# Phase 263 — Support Tooling v2 — IMPLEMENT

## Phase ID
263 (Wave 8, P7)

## Title
Support Tooling v2 — Diagnostic Bundles, Ticket Correlations, HL7 Viewer

## Goal
Extend Phase 244 support module with tenant diagnostic bundle generation,
ticket-to-HL7/posture correlation, and HL7 message viewer integration
for support engineers.

## Inventory (before editing)
- `apps/api/src/support/diagnostics.ts` — System diagnostics collector
- `apps/api/src/support/ticket-store.ts` — In-memory ticket store
- `apps/api/src/routes/support-routes.ts` — 7 admin endpoints
- `apps/api/src/hl7/message-event-store.ts` — HL7 event ring buffer (Phase 259)
- `apps/api/src/hl7/dead-letter-enhanced.ts` — Enhanced DLQ (Phase 259)
- `apps/api/src/posture/` — 7 posture domain checkers

## Implementation Steps
1. Create `apps/api/src/support/support-toolkit-v2.ts`:
   - DiagnosticBundle: 6-section tenant health snapshot
   - TicketCorrelation: links tickets to HL7 events, DLQ entries, posture gates
   - HL7 viewer entries: PHI-safe message event + DLQ aggregation
   - PostureGateSummary: posture data for support context
2. Create `apps/api/src/routes/support-toolkit-v2-routes.ts`:
   - Bundle generation, listing, download
   - Ticket correlation CRUD
   - Posture summary for support dashboard
   - HL7 viewer proxy endpoint
3. Create test file and verifier

## Files Touched
- `apps/api/src/support/support-toolkit-v2.ts` (NEW)
- `apps/api/src/routes/support-toolkit-v2-routes.ts` (NEW)
- `apps/api/tests/support-toolkit-v2.test.ts` (NEW)
- `scripts/verify-phase263-support-tooling-v2.ps1` (NEW)
