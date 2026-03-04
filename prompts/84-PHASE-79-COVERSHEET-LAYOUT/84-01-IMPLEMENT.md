# Phase 79 — CPRS Cover Sheet Layout Parity v1

## User Request

Implement resizable, rearrangeable, and persistable coversheet panels matching CPRS behavior.

## Implementation Steps

1. Create API endpoints: GET/PUT /ui-prefs/coversheet (tenant + user scoped, audited)
2. Create in-memory preference store (same pattern as imaging worklist)
3. Upgrade CoverSheetLayout types with version, panelSizes (px), panelOrder, panelVisibility
4. Overhaul CoverSheetPanel.tsx: proper resize handles, drag-and-drop (modern mode), min/max enforcement
5. Wire server-side persistence from cprs-ui-state.tsx with localStorage fallback
6. Add Customize Layout toggle + Reset Layout button
7. Ensure keyboard accessibility for resize (arrow keys on focused handle)
8. Add Playwright E2E tests (resize, rearrange, persist, reset, negative)
9. Rebuild governance indexes

## Verification

- scripts/verify-latest.ps1
- tsc --noEmit (API + web)
- Playwright tests pass
- No dead clicks, no PHI leaks

## Files Touched

- apps/api/src/routes/ui-prefs.ts (NEW)
- apps/api/src/services/ui-prefs-store.ts (NEW)
- apps/api/src/index.ts (register route)
- apps/api/src/lib/audit.ts (add config.ui-prefs-save)
- apps/web/src/stores/cprs-ui-state.tsx (upgrade types + server sync)
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx (layout engine)
- apps/web/src/components/cprs/cprs.module.css (new styles)
- tests/e2e/coversheet-layout.spec.ts (NEW)
