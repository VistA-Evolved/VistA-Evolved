## User Request

Continue the live CPRS chart audit and fix the next real clinician-facing defect using live VistA-first evidence.

## Problem

The CPRS AI Assist Intake Summary sub-tab shows an enabled `Generate Intake Summary` action for DFN 46 even when the Intake tab has zero intake sessions for that patient. Clicking the action only surfaces the blocking condition after the click: `No intake sessions are available for this patient. Intake Summary requires a real intake session.` This is a dead-action truthfulness defect.

## Inventory

- Inspected: `apps/web/src/components/cprs/panels/AIAssistPanel.tsx`
- Inspected prior AI Assist recovery: `prompts/626-PHASE-626-CPRS-AI-ASSIST-INTAKE-GROUNDING-RECOVERY/626-01-IMPLEMENT.md`
- Inspected prior AI Assist contract recovery: `prompts/633-PHASE-633-CPRS-AI-LAB-EDUCATION-CONTRACT-RECOVERY/633-01-IMPLEMENT.md`
- Live browser proof: `/cprs/chart/46/aiassist`
- Live API proof: `GET /intake/by-patient/46` returned `{"ok":true,"sessions":[]}`

## Implementation Steps

1. Add a lightweight preflight for the AI Assist Intake Summary tab that loads intake-session availability for the current patient.
2. Keep the primary `Generate Intake Summary` action disabled when no intake session exists for the current patient.
3. Surface truthful helper text explaining why the action is unavailable.
4. Preserve the existing governed generation path for patients who do have intake sessions.

## Verification Steps

1. Open `/cprs/chart/46/intake` and confirm the patient has no intake sessions.
2. Open `/cprs/chart/46/aiassist` and confirm `Generate Intake Summary` is disabled before any click.
3. Confirm the panel explains that a real intake session is required.
4. Run `pnpm -C apps/web exec tsc --noEmit`.

## Files Touched

- `apps/web/src/components/cprs/panels/AIAssistPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`
