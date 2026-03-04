# Phase 57-01 IMPLEMENT -- CPRS Parity Wave 2 (WRITE) Safety + Capability Detection

## User Request

Implement write-back flows safely and only when supported by live rpc-catalog + Vivian.
Otherwise, show integration pending with explicit targets and prerequisites.

## Sections

### A -- wave57-plan.json

Generate the authoritative write-action plan at artifacts/cprs/wave57-plan.json containing:

- All write actions from actionRegistry (problems.add/edit, notes.create, orders.save,
  meds.quick-order, allergies.add, vitals.add, labs.ack, consults.complete,
  orders.verify, orders.dc, orders.flag)
- RPC sequences including LOCK/UNLOCK where required
- Runtime capability detection metadata

### B -- Write flows

Implement wave2-routes.ts with POST endpoints for:

- POST /vista/cprs/problems/add
- POST /vista/cprs/problems/edit
- POST /vista/cprs/notes/create
- POST /vista/cprs/orders/draft
- POST /vista/cprs/meds/quick-order
- POST /vista/cprs/labs/ack
- POST /vista/cprs/vitals/add
- POST /vista/cprs/allergies/add

Each endpoint:

- Uses safeCallRpc (never raw callRpc) with idempotent: false
- Falls back to ServerDraft when RPC unavailable
- Returns rpcUsed[] and vivianPresence for traceability
- Dual audit (centralized + write-back legacy)

### C -- Safety model

- Add rpcKind field ('read' | 'write') to CprsAction interface
- Tag all 52+ actions with rpcKind
- Idempotency key via X-Idempotency-Key header on all write endpoints
- LOCK/UNLOCK ordering pattern for order writes
- Audit: metadata only, never log input args/PHI in audit detail
- Timeout enforcement via safeCallRpc defaults

### D -- Draft -> Validate -> Submit

Server-side validation before RPC call:

- Required field checks
- DFN format validation (numeric)
- Parameter bounds checks
- Return 400 with field-level errors before attempting RPC

### E -- Verifier

scripts/verify-phase57-wave2-write.ps1:

- No fake success (no hardcoded mock data)
- Write endpoints return rpcUsed[]
- Audit events created for write attempts
- integration-pending modal targets populated
- Dead clicks = 0
- PHI + secret scan clean

## Files touched

- prompts/62-PHASE-57-CPRS-WAVE2-WRITE/57-01-IMPLEMENT.md (this file)
- artifacts/cprs/wave57-plan.json
- apps/api/src/routes/cprs/wave2-routes.ts (new)
- apps/web/src/actions/actionRegistry.ts (add rpcKind field)
- apps/api/src/index.ts (register wave2 routes)
- apps/web/src/components/cprs/dialogs/ (write dialog components)
- scripts/verify-phase57-wave2-write.ps1
- scripts/verify-latest.ps1
