# Phase 89 — LOA ENGINE v1 (Top 5 HMOs + Long Tail manual/portal) — IMPLEMENT

## User Request

Build Phase 89: LOA Engine v1 extending Phase 87 LOA scaffolding. Add SLA
timers, LOA work queue, enhanced pack generator, patient chart LOA panel,
enrollment tie-in, and audit wiring.

## Deliverables

1. **Extended LOA Data Model** -- SLA deadline, assignee, priority, urgency,
   slaRiskLevel on LOACase. LOAPack type for pack history.
2. **LOA Workflow + Audit** -- Wire appendRcmAudit to ALL LOA mutations
   (create, transition, submit, pack, attach). Add LOA-specific audit actions.
3. **LOA Pack Generator Enhancement** -- Enhance generateLOASubmissionPack with
   payer-specific templates and manifest-style output.
4. **Staff Work Queue** -- GET /rcm/payerops/loa-queue with SLA risk/age/status/
   payer/assignee filtering. LOA Queue admin page at /cprs/admin/loa-queue.
5. **Patient Chart LOA Panel** -- Reusable component showing LOA cases for a
   patient DFN, usable from clinical chart context.
6. **Enrollment + Credential Vault Tie-in** -- LOA creation checks enrollment
   status. Pack generator includes credential references.
7. **Runbook** -- docs/runbooks/phase89-loa-engine.md

## Implementation Steps

1. Extend types.ts: add SLA fields, LOAPack, LOA audit actions
2. Extend store.ts: patchLOADraft, listLOAQueue, SLA risk computation,
   LOAPack storage
3. Extend/add routes: PATCH loa/:id, GET loa-queue, enhanced pack endpoint,
   audit wiring on all mutations
4. Create LOA Queue page: /cprs/admin/loa-queue
5. Create patient chart LOA panel: PatientLOAPanel component
6. Enhance manual-adapter.ts pack generator
7. Add LOA Queue link to admin layout
8. Create runbook + ops artifacts

## Verification Steps

- All new LOA audit actions present in rcm-audit.ts
- appendRcmAudit called on every LOA mutation route
- LOA queue endpoint returns filtered results with SLA risk
- Pack generator produces structured manifest output
- Patient chart panel component renders with DFN filter
- LOA Queue nav link visible in admin layout
- TypeScript compiles clean (tsc --noEmit)

## Files Touched

- apps/api/src/rcm/payerOps/types.ts (extend)
- apps/api/src/rcm/payerOps/store.ts (extend)
- apps/api/src/rcm/payerOps/payerops-routes.ts (extend + audit wiring)
- apps/api/src/rcm/payerOps/manual-adapter.ts (enhance)
- apps/api/src/rcm/audit/rcm-audit.ts (add LOA audit actions)
- apps/web/src/app/cprs/admin/loa-queue/page.tsx (new)
- apps/web/src/components/cprs/panels/PatientLOAPanel.tsx (new)
- apps/web/src/app/cprs/admin/layout.tsx (add LOA Queue nav)
- docs/runbooks/phase89-loa-engine.md (new)
- ops/phase89-summary.md (new)
- ops/phase89-notion-update.json (new)
