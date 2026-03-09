# Phase 601 — CPRS Cover Sheet Appointments Recovery — IMPLEMENT

## User Request

Continue autonomously and make the full UI truthful and production-grade.
The CPRS cover sheet appointments card must use the live VistA-first scheduling
route instead of showing a stale permanent pending placeholder.

## Implementation Steps

1. Inventory the existing cover sheet appointments UI and confirm whether it
   fetches live data or renders a hardcoded pending state.
2. Trace the intended backend contract through the scheduling phases and verify
   the live route against VEHU before editing the UI.
3. Update the cover sheet to fetch `/vista/cprs/appointments?dfn=...` and
   render returned appointments with truthful loading, empty, and pending states.
4. Update stale action metadata so the appointments card is marked wired with
   an honest fallback note rather than unsupported-in-sandbox.
5. Run targeted type checks and live route verification, then update closeout
   artifacts and regenerate prompt metadata if required.

## Files Touched

- prompts/601-PHASE-601-CPRS-COVERSHEET-APPOINTMENTS-RECOVERY/601-01-IMPLEMENT.md
- prompts/601-PHASE-601-CPRS-COVERSHEET-APPOINTMENTS-RECOVERY/601-99-VERIFY.md
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx
- apps/web/src/actions/actionRegistry.ts
- docs/runbooks/scheduling-vista-sd.md
- ops/summary.md
- ops/notion-update.json
