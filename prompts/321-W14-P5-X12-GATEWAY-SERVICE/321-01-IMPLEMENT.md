# Phase 321 — W14-P5: X12 Gateway Service

## User Request
Build an inbound X12 gateway service: raw X12 wire-format parser, ISA/GS/ST
envelope validation, 999/TA1 acknowledgment generation, inbound transaction routing
with pluggable handlers, and durable control number tracking for duplicate detection.

## Implementation Steps
1. Created `apps/api/src/rcm/edi/x12-gateway.ts` (~550 lines):
   - **Raw X12 parser** (`parseX12`): detects delimiters from ISA bytes 3/104/105,
     splits segments, builds typed `X12Interchange` with nested functional groups
     and transaction sets. Handles multi-GS and multi-ST envelopes.
   - **Envelope validator** (`validateEnvelope`): ISA version codes, sender/receiver
     IDs, control number format (9 digits), ISA↔IEA match, GS↔GE match, ST↔SE
     segment count verification. Returns typed errors + warnings.
   - **TA1 generator** (`generateTA1`): ISA-level interchange acknowledgment with
     proper ISA framing, ack codes (A/R), and note codes.
   - **999 generator** (`generate999`): Per-TX-set functional ack with AK1/AK2/IK3/
     IK5/AK9 structure. Supports per-TX override for accept/reject.
   - **Transaction router** (`routeInboundInterchange`): Dispatches each ST-SE set
     to registered handlers. Generates TA1 + 999 acks post-routing.
   - **Control number store**: 100K-entry FIFO Map for ISA/GS/ST duplicate detection.
   - **Full pipeline** (`processInboundX12`): parse → duplicate check → record → 
     validate → route in one call.
   - **Segment query helpers**: findSegments, getElement, findFirstSegment,
     mapTransactionSetType.

2. Created `apps/api/src/routes/x12-gateway.ts` (9 REST endpoints):
   - POST /x12/gateway/ingest — full pipeline
   - POST /x12/gateway/parse — parse only
   - POST /x12/gateway/validate — parse + validate
   - POST /x12/gateway/ack/ta1 — TA1 generation
   - POST /x12/gateway/ack/999 — 999 generation
   - GET  /x12/gateway/handlers — handler registry
   - GET  /x12/gateway/control-numbers — tracking stats
   - DELETE /x12/gateway/control-numbers — clear store
   - GET  /x12/gateway/health — gateway health

3. Wired into register-routes.ts, security.ts (admin auth), store-policy.ts (2 stores)

## Verification
- `npx tsc --noEmit` — clean (0 errors)
- All routes admin-gated
- 2 store-policy entries (cache + registry)

## Files Touched
- apps/api/src/rcm/edi/x12-gateway.ts (NEW)
- apps/api/src/routes/x12-gateway.ts (NEW)
- apps/api/src/server/register-routes.ts (import + register)
- apps/api/src/middleware/security.ts (AUTH_RULES)
- apps/api/src/platform/store-policy.ts (2 store entries)
