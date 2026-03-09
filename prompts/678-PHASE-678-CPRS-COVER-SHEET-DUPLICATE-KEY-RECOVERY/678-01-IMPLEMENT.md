# Phase 678 - CPRS Cover Sheet Duplicate Key Recovery

## User Request

- Continue the live clinician audit until the CPRS chart behaves truthfully and cleanly in the browser.
- Fix runtime quality issues at the source instead of tolerating noisy overlays or unstable rendering.
- Stay VistA-first and verify any change in the real chart workflow.

## Problem Statement

- Live browser verification on `/cprs/chart/46/cover` raised a Next.js runtime overlay for duplicate React keys.
- The error surfaced as repeated values such as `CDC`, `IMM`, and `GROUP`, which are coarse VistA immunization catalog markers and not globally unique row identities.
- Non-unique row keys can cause rows to be duplicated, omitted, or mismatched across updates, which is unacceptable on a production clinician surface.

## Implementation Steps

1. Inventory `CoverSheetPanel.tsx` and any adjacent immunization list renderers that still rely on weak row keys.
2. Replace fragile row keys with stable composite keys derived from row content plus a bounded fallback index.
3. Keep user-visible clinical content unchanged; this is a rendering-stability fix, not a data rewrite.
4. Rebuild only the minimum affected render paths so the chart shell picks up the new keys.
5. Re-verify in the live browser that the cover sheet loads without duplicate-key runtime overlay errors.

## Files Touched

- prompts/678-PHASE-678-CPRS-COVER-SHEET-DUPLICATE-KEY-RECOVERY/678-01-IMPLEMENT.md
- prompts/678-PHASE-678-CPRS-COVER-SHEET-DUPLICATE-KEY-RECOVERY/678-99-VERIFY.md
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx
- apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json