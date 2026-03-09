# Phase 597 - Labs Order Entry Truthfulness

## User Request

Continue closing real, user-visible clinical gaps so the CPRS chart works end to end with truthful VistA-first behavior.

## Implementation Steps

1. Inventory the live lab-order backend path before editing the UI:
- confirm `POST /vista/cprs/orders/lab` exists
- confirm the current VEHU sandbox posture is truthful when no LRZ quick orders are configured
- confirm the current Labs panel only supports read and acknowledgement flows

2. Add a frontend lab-order mutation helper in `apps/web/src/stores/data-cache.tsx`:
- call `/vista/cprs/orders/lab`
- include CSRF and idempotency headers
- persist returned real orders or truthful server drafts into the shared orders cache

3. Extend `apps/web/src/components/cprs/panels/LabsPanel.tsx` with a chart-native order composer:
- add a `+ New Lab Order` toggle
- allow free-text lab test entry plus optional advanced quick-order IEN input
- show clear outcome messaging for real placement vs draft/unsupported sandbox posture

4. Update action metadata in `apps/web/src/actions/actionRegistry.ts` so lab ordering is visible to CPRS action/debug tooling.

5. Add or update a lab-order runbook under `docs/runbooks/` with working curl examples and explicit VEHU limitations.

6. Regenerate prompt metadata and verify with live Docker:
- rebuild `docs/qa/phase-index.json`
- test login + `/vista/cprs/orders/lab` against VEHU
- run the repo verifier or the latest bundle verifier

## Files Touched

- apps/web/src/stores/data-cache.tsx
- apps/web/src/components/cprs/panels/LabsPanel.tsx
- apps/web/src/actions/actionRegistry.ts
- docs/runbooks/vista-rpc-add-lab-order.md
- prompts/597-PHASE-597-LABS-ORDER-ENTRY-TRUTHFULNESS/597-99-VERIFY.md
- ops/summary.md
- ops/notion-update.json