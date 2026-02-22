# Phase 59 -- IMPLEMENT: CPOE Parity (Orders + Order Checks + Signing)

## Mission
Make orders (CPOE) behave like CPRS:
- Order creation (labs, imaging, meds, consults as available)
- Order checks (drug-allergy, interactions, duplicate therapy, contraindications where supported)
- Order signing workflow OR explicit "unsigned-only" if signing unavailable in this distro
- Alerts / inbox updates (if supported) or explicit pending hooks

## Definition of Done
A) Order entry flows complete for at least 1 lab, 1 imaging, 1 medication order (safe path).
B) All order actions are Action -> Endpoint -> RPC-traceable (or explicit pending with target RPCs).
C) Order checks run (or explicit pending with target RPCs) and surfaced in UI before submit/sign.
D) No fake success: orders appear in patient order list after submit (or explicit pending).
E) Dead-click audit passes on Orders tab and order dialogs.
F) Security: no PHI in logs, audit events for writes, RBAC enforced.

## Implementation Steps

### Step 0: Prompts folder
- Create 64-PHASE-59-CPOE-PARITY/59-01-IMPLEMENT.md (this file)
- Create 64-PHASE-59-CPOE-PARITY/59-99-VERIFY.md

### A) Inventory
- artifacts/phase59/inventory.json (order-related UI, API, RPCs, registry)

### B) Order Capability Plan
- artifacts/phase59/order-plan.json (per-flow RPC sequences, availability, sandbox support)

### C) Order Dialogs (CPRS-like)
- Upgrade OrdersPanel.tsx with real backend integration for lab/imaging/consult
- Patient context required, required fields enforced
- Order checks displayed before submit/sign

### D) API Implementation
- New route file: apps/api/src/routes/cprs/orders-cpoe.ts
- Endpoints:
  - GET /vista/cprs/orders (full order list via ORWORR AGET)
  - POST /vista/cprs/orders/lab (lab order via ORWDXM AUTOACK quick-order path)
  - POST /vista/cprs/orders/imaging (imaging order or integration-pending)
  - POST /vista/cprs/orders/sign (order signing via ORWOR1 SIG or pending)
  - POST /vista/cprs/order-checks (order checks via ORWDXC ACCEPT/SAVECHK/DISPLAY or pending)

### E) Order Checks (VistA-First)
- Use ORWDXC family RPCs where available
- If unavailable: return explicit "integration-pending" with target RPCs

### F) Signing Workflow
- If ORWOR1 SIG works: implement sign with user auth + audit
- If not feasible: "unsigned orders" consistently labeled

### G) UX Quality
- Same CPRS workflow: select type -> fill dialog -> checks -> accept -> sign

### H) Registry + Traceability
- Add new order RPCs to rpcRegistry.ts
- Add new audit actions for lab/imaging order checks/sign

## Files Touched
- prompts/64-PHASE-59-CPOE-PARITY/59-01-IMPLEMENT.md
- prompts/64-PHASE-59-CPOE-PARITY/59-99-VERIFY.md
- artifacts/phase59/inventory.json
- artifacts/phase59/order-plan.json
- apps/api/src/routes/cprs/orders-cpoe.ts (NEW)
- apps/api/src/routes/cprs/wave2-routes.ts (register new routes)
- apps/api/src/vista/rpcRegistry.ts (add order RPCs)
- apps/api/src/lib/audit.ts (add order audit actions)
- apps/api/src/index.ts (register route plugin)
- apps/web/src/components/cprs/panels/OrdersPanel.tsx (upgrade)
- scripts/verify-phase59-cpoe-parity.ps1
