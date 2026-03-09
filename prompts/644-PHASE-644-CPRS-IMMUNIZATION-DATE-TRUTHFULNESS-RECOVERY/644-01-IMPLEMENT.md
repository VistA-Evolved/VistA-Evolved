# Phase 644 - CPRS Immunization Date Truthfulness Recovery

## User Request
- Continue the live CPRS clinician audit until the UI is fully truthful and production-grade.
- Keep the system VistA-first and repair misleading clinician-facing behavior instead of masking it.

## Inventory
- Inspected apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx.
- Inspected apps/api/src/routes/immunizations/index.ts.
- Verified live endpoint GET /vista/immunizations?dfn=84 against VEHU data.
- Verified DFN 84 has real immunization history rows and the panel currently renders raw FileMan dates.

## Problem
- The Immunizations panel shows raw FileMan dates like 2980717 instead of clinician-readable dates.
- The detail pane also exposes the inverse date key, which is an internal VistA artifact rather than useful clinical information.
- This is truthful data presented in a misleading form, which makes the panel operationally weak for clinicians.

## Implementation Steps
- Normalize ORQQPX IMMUN LIST date values at the API contract boundary.
- Preserve the raw FileMan value in a separate field for traceability.
- Stop surfacing inverse date internals in the clinician detail pane.
- Re-verify with a patient who has real VEHU immunization history.

## Files Touched
- apps/api/src/routes/immunizations/index.ts
- apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx
- prompts/644-PHASE-644-CPRS-IMMUNIZATION-DATE-TRUTHFULNESS-RECOVERY/644-01-IMPLEMENT.md
- prompts/644-PHASE-644-CPRS-IMMUNIZATION-DATE-TRUTHFULNESS-RECOVERY/644-99-VERIFY.md