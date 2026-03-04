# Phase 95 — Payer Registry Persistence + Audit + Evidence Update Workflow (IMPLEMENT)

## User Request

Convert the PH payer registry from in-memory + JSON-only into a production-grade,
tenant-scoped, audited, evidence-backed registry that supports the full 28-HMO list,
PhilHealth as a special payer, capability matrices, contracting tasks, portal adapters,
and future EDI/clearinghouse adapters.

## Implementation Steps

### A) Persistence layer (JSON-file-backed + in-memory cache)

- `apps/api/src/rcm/payers/payer-persistence.ts` — durable JSON store with atomic writes
- Tenant-scoped overrides stored separately from global payer defs
- Survives API restarts

### B) Payer audit trail

- `apps/api/src/rcm/payers/payer-audit.ts` — hash-chained, append-only, PHI-safe
- Records: actor, timestamp, tenant, before/after snapshot, reason, evidence link

### C) Evidence workflow

- `apps/api/src/rcm/payers/evidence-manager.ts` — hash evidence files, provenance tracking
- Import CLI via `scripts/import-payer-registry.ps1`
- Watcher stub (defaults OFF)

### D) Admin API endpoints

- `apps/api/src/rcm/payers/payer-admin-routes.ts`
  - GET /admin/payers, GET /admin/payers/:id
  - POST /admin/payers/import
  - PATCH /admin/payers/:id/capabilities, PATCH /admin/payers/:id/tasks
  - GET /admin/payers/:id/audit

### E) Admin UI page

- `apps/web/src/app/cprs/admin/payer-registry/page.tsx`

### F) Update existing consumers

- ph-hmo-registry.ts reads from persistence layer instead of raw JSON
- Backward-compatible API surface

### G) Prompt folder linter

- `scripts/verify-prompt-ordering.ps1`

## Files Touched

- apps/api/src/rcm/payers/payer-persistence.ts (NEW)
- apps/api/src/rcm/payers/payer-audit.ts (NEW)
- apps/api/src/rcm/payers/evidence-manager.ts (NEW)
- apps/api/src/rcm/payers/payer-admin-routes.ts (NEW)
- apps/api/src/rcm/payers/ph-hmo-registry.ts (MODIFIED — reads from persistence)
- apps/api/src/index.ts (MODIFIED — register new routes)
- apps/web/src/app/cprs/admin/payer-registry/page.tsx (NEW)
- apps/web/src/app/cprs/admin/layout.tsx (MODIFIED — nav entry)
- scripts/import-payer-registry.ps1 (NEW)
- scripts/verify-prompt-ordering.ps1 (NEW)
- prompts/99-PHASE-95-PAYER-REGISTRY-PERSISTENCE/ (NEW)

## Verification Steps

- `npx tsc --noEmit` from apps/api — exit code 0
- All existing consumers still compile
- Import endpoint loads 27 HMOs + PhilHealth
- Audit trail records changes
- Evidence hashes stored
- Prompt ordering linter passes
