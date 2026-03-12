# Phase 726 - Full Truth And UX Audit

## Goal

Establish a hard, reproducible audit boundary for the full truth and UX review of VistA-Evolved, then use that boundary to drive page-by-page, action-by-action, and workflow-by-workflow verification.

## What This Phase Adds

1. A required prompt pack for the phase.
2. A runtime UI estate inventory generator.
3. Committed inventory outputs in JSON and Markdown.
4. A runtime truth-matrix generator seeded from package, route-test, panel, action, and E2E signals.
5. Repeatable entry points for the broader UI/UX and plan-truth audit.

## Generate The Runtime UI Estate Inventory

From the repo root:

```powershell
pnpm audit:ui-estate:runtime
pnpm audit:ui-estate:truth
pnpm audit:ui-estate:live-p1
pnpm audit:ui-estate:live-p1-followup
```

This writes:

- `data/ui-estate/runtime-ui-estate.json`
- `docs/ui-estate/runtime-ui-estate.md`
- `data/ui-estate/runtime-ui-audit-checklist.json`
- `docs/ui-estate/runtime-ui-audit-checklist.md`
- `data/ui-estate/runtime-ui-truth-matrix.json`
- `docs/ui-estate/runtime-ui-truth-matrix.md`

## What The Inventory Covers

The inventory includes:

1. Web, portal, and marketing Next.js page routes.
2. Mobile screen inventory.
3. Desktop shell inventory.
4. VistA workspace panel breadth via the panel registry.
5. CPRS action breadth via the action registry.
6. Module-doc breadth.
7. Package-certification breadth.
8. E2E spec breadth.
9. Presence of existing dead-click evidence.
8. Repeatable live evidence for core P1 chart surfaces written to `artifacts/`.

The truth matrix adds:

1. A first-pass truth bucket per runtime surface.
2. Priority ranking so required live-VistA surfaces are audited first.
3. Inferred package, panel, action, route-test, and E2E evidence hints.
4. A machine-readable starting point for manual audit updates.

The live baseline adds:

1. Authenticated VEHU evidence for the core chart read stack.
2. Captured HTTP, count, and RPC evidence for P1 surface grounding.
3. Artifact-only outputs so verification evidence stays out of committed docs.

The follow-up live baseline adds:

1. Repeatable evidence for unresolved P1 surfaces beyond the chart read stack.
2. Explicit classification of live-VistA, truthful-empty, truthful-integration-pending, truthful-local-store, and skipped states.
3. Ward-aware probing for inpatient and handoff screens with admin-ward fallback when the inpatient ward list is empty.

## How To Use It

1. Treat the runtime UI estate inventory as the outer boundary for the full UI/UX audit.
2. Treat the runtime audit checklist as the per-surface review ledger.
3. Treat the runtime truth matrix as the first-pass evidence posture, not as final certification.
4. Do not accept plan completion claims unless they can be mapped back into these artifacts and then backed by live verification.
5. Use `pnpm audit:ui-estate:live-p1` to generate current live VEHU evidence for the core chart surfaces.
6. Use `pnpm audit:ui-estate:live-p1-followup` to generate current live VEHU evidence for the unresolved P1 surfaces and their truthful pending/empty/local-store states.
7. Use the inventory, checklist, truth matrix, and live evidence together with dead-click audits and workflow tests to classify each surface as certified, partial, placeholder, stub, or terminal-only.

## Notes

- The inventory is breadth-first, not a completion certificate.
- Generated package presence does not equal certified or live-backed functionality.
- VEHU remains the current truth lane until vista-distro proves parity on representative live route verification.
