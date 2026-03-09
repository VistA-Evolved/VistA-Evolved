## User Request

Continue the live CPRS chart audit and fix the next real user-facing defect after Intake.

## Problem

The CPRS AI Assist tab can generate an intake-summary draft for DFN 46 even when the Intake tab shows no intake sessions for that patient. The generated content also comes from `stub-v1` and presents fabricated clinical details as if they were derived from intake data.

## Inventory

- Inspected: `apps/web/src/components/cprs/panels/AIAssistPanel.tsx`
- Inspected: `apps/api/src/ai/providers/stub-provider.ts`
- Inspected: `prompts/35-PHASE-33-AI-ASSIST-GATEWAY/35-01-ai-assist-IMPLEMENT.md`

## Implementation Steps

1. Require a real intake session before generating an intake-summary request from the CPRS panel.
2. Load the latest intake review payload and pass grounded intake text to the AI request instead of a placeholder string.
3. Make the development stub provider explicitly label its output as non-clinical stub content rather than inventing patient-specific facts.
4. Preserve governed AI audit/confirmation behavior.

## Verification Steps

1. Open CPRS AI Assist for DFN 46 while Intake shows zero sessions.
2. Click `Generate Intake Summary`.
3. Confirm the panel blocks generation truthfully instead of showing a fabricated draft.
4. Confirm no new TypeScript errors in edited files.

## Files Touched

- `apps/web/src/components/cprs/panels/AIAssistPanel.tsx`
- `apps/api/src/ai/providers/stub-provider.ts`