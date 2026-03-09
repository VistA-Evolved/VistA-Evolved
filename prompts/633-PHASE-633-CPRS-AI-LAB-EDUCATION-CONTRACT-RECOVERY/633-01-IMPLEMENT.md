# Phase 633 — CPRS AI Lab Education Contract Recovery

## User Request

- Continue autonomously until the CPRS UI behaves like a production clinical system.
- Keep the AI Assist experience governed, grounded, and fully functional rather than partially wired.
- Fix any remaining user-visible AI Assist action that appears available in the UI but fails because of an internal contract mismatch.

## Problem

- The CPRS AI Assist `Lab Education` sub-tab accepts input and submits a governed `/ai/request`, but the request fails with `Prompt 'lab-education-v1' not found or variable validation failed`.
- The prompt registry contains `lab-education-v1`, so the defect is an internal gateway contract mismatch rather than a missing prompt.

## Inventory

- Inspected: `apps/web/src/components/cprs/panels/AIAssistPanel.tsx`
- Inspected: `apps/api/src/ai/prompt-registry.ts`
- Inspected: `apps/api/src/ai/ai-gateway.ts`
- Inspected prompt lineage: `prompts/35-PHASE-33-AI-ASSIST-GATEWAY/35-01-ai-assist-IMPLEMENT.md`
- Inspected prior AI recovery: `prompts/626-PHASE-626-CPRS-AI-ASSIST-INTAKE-GROUNDING-RECOVERY/626-01-IMPLEMENT.md`

## Root Cause

- `processAiRequest()` injects `chartContext` for any patient-scoped AI request.
- `lab-education-v1` allows only `labName`, `labValue`, `labUnits`, `referenceRange`, and `labDate`.
- The extra injected `chartContext` trips prompt validation and produces the 422 seen in the browser.

## Implementation Steps

1. Keep prompt validation strict.
2. Patch the AI gateway so it only injects `chartContext` when the selected prompt explicitly allows it.
3. Re-verify the CPRS `Lab Education` workflow in the browser.
4. Re-verify the audit endpoints so the generated event appears in AI audit telemetry.

## Files To Change

- `apps/api/src/ai/ai-gateway.ts`
- `prompts/633-PHASE-633-CPRS-AI-LAB-EDUCATION-CONTRACT-RECOVERY/633-01-IMPLEMENT.md`
- `prompts/633-PHASE-633-CPRS-AI-LAB-EDUCATION-CONTRACT-RECOVERY/633-99-VERIFY.md`

## Verification Notes

- Submit a real authenticated `POST /ai/request` using `lab-education-v1`.
- Confirm the browser `Explain for Patient` action succeeds.
- Load the AI Audit tab and confirm the new event is visible.