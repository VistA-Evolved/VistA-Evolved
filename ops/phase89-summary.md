# Phase 89 — LOA Engine v1: Summary

## What Changed

### API (apps/api/src/rcm/payerOps/)
- **types.ts**: Added `LOASLARiskLevel`, `LOAPriority`, `LOAPack`, `LOAPackSection` types.
  Extended `LOACase` with `priority`, `assignedTo`, `slaDeadline`, `slaRiskLevel`,
  `urgencyNotes`, `enrollmentId`, `packHistory`, `lastReminderAt`, `reminderCount`.
- **store.ts**: Added `computeSLARisk()`, `refreshSLARisk()`, `patchLOADraft()`,
  `listLOAQueue()` (with SLA breakdown), `addPackToLOA()`, `assignLOA()`.
  Updated `createLOACase()` with new fields + default SLA deadline computation.
- **payerops-routes.ts**: Added 3 new endpoints (GET loa-queue, PATCH loa/:id,
  PUT loa/:id/assign). Wired `appendRcmAudit()` to ALL mutation routes (9 audit
  points total). Enhanced pack route to store packs in history.
- **manual-adapter.ts**: Enhanced `generateLOASubmissionPack()` with SLA info,
  payer instructions, included credentials, total cost calculation.

### Audit (apps/api/src/rcm/audit/)
- **rcm-audit.ts**: Added 12 LOA-specific audit actions (loa.created, loa.updated,
  loa.transition, loa.submitted, loa.pack_generated, loa.attachment_added,
  loa.assigned, loa.reminder_sent, loa.approved, loa.denied, loa.cancelled,
  loa.expired).

### Web (apps/web/)
- **loa-queue/page.tsx**: Full LOA work queue page with SLA summary bar,
  filters (status/payer/risk/priority/assignee), queue table, detail modal
  with timeline + pack history + transition actions, pack modal.
- **PatientLOAPanel.tsx**: Reusable patient chart component showing active
  and resolved LOA cases with SLA indicators, priority badges, expandable details.
- **layout.tsx**: Added "LOA Queue" nav link under RCM module.

## How to Test Manually

1. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Start web: `cd apps/web && pnpm dev`
3. Navigate to `/cprs/admin/loa-queue` -- empty queue initially
4. Create LOA: POST to `/rcm/payerops/loa` with priority field
5. Queue shows the case with SLA risk indicator
6. Generate pack, transition status, assign -- all audit-logged
7. Check `/rcm/payerops/loa?patientDfn=3` for patient-scoped view

## Verifier Output

- API: `pnpm exec tsc --noEmit` -- PASS (0 errors)
- Web: `pnpm exec tsc --noEmit` -- PASS (0 errors)

## Follow-ups

- Background SLA timer for proactive notifications
- PDF pack generation
- Payer API adapter integration for top 5 HMOs
- Persistent store migration
- Email/SMS reminder scheduler
