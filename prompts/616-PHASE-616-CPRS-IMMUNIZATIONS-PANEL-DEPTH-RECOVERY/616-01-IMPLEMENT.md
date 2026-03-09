# Phase 616 - CPRS Immunizations Panel Depth Recovery

## User Request

- Continue autonomously until the full clinician-facing UI works well.
- Keep the system VistA-first and verify against the live VEHU sandbox.
- Recover missing or shallow CPRS chart features by checking their original prompt lineage first.

## Implementation Steps

1. Inventory the current immunization panel, original Phase 65 prompts, and live API routes.
2. Verify Docker, API health, VistA connectivity, and the current immunization endpoints against VEHU.
3. Recover the CPRS immunizations panel so it exposes the real VistA read depth already present in the API.
4. Surface both patient history and the immunization catalog/type-picker in the chart UI.
5. Keep add/write posture explicit and truthful as integration-pending until PX SAVE DATA is safely wired.
6. Preserve existing CPRS visual patterns and avoid fake success or fake workflow completion.
7. Update runbook and ops artifacts after live verification.

## Files Touched

- prompts/616-PHASE-616-CPRS-IMMUNIZATIONS-PANEL-DEPTH-RECOVERY/616-01-IMPLEMENT.md
- prompts/616-PHASE-616-CPRS-IMMUNIZATIONS-PANEL-DEPTH-RECOVERY/616-99-VERIFY.md
- apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json