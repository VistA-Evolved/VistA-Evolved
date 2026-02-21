# Phase 79 Summary -- CPRS Cover Sheet Layout Parity v1

## What Changed

### API (apps/api/)
- **NEW** `src/services/ui-prefs-store.ts` -- In-memory UI preferences store
  - `CoverSheetLayoutV1` type with schemaVersion, panelOrder, panelHeights (px), panelVisibility, layoutMode
  - Validation: min 80px, max 800px heights; valid panel keys; no duplicates
  - Keyed by `${tenantId}:${duz}` for multi-tenant support
- **NEW** `src/routes/ui-prefs.ts` -- REST endpoints for cover sheet layout persistence
  - GET /ui-prefs/coversheet -- returns saved or defaults with `source` indicator
  - PUT /ui-prefs/coversheet -- validates + saves layout, audits
  - DELETE /ui-prefs/coversheet -- resets to defaults
- **MODIFIED** `src/index.ts` -- registered ui-prefs routes
- **MODIFIED** `src/lib/audit.ts` -- added `config.ui-prefs-save` audit action

### Web (apps/web/)
- **MODIFIED** `src/stores/cprs-ui-state.tsx` -- Major upgrade:
  - CoverSheetLayout now versioned (schemaVersion: 1) with panelVisibility field
  - Heights changed from percentage (33) to pixels (200)
  - Added `immunizations` to defaults (was missing)
  - Server sync: fetches from GET /ui-prefs/coversheet on mount, debounced PUT on change
  - New `saveCoverSheetLayout()` for incremental layout mutations
  - `prefsSource` state tracks whether prefs came from server/local/defaults
  - Old localStorage format auto-migrates on load
- **MODIFIED** `src/components/cprs/panels/CoverSheetPanel.tsx` -- Full overhaul:
  - Dynamic panel rendering from `panelOrder` (no more hardcoded JSX order)
  - Panel definitions extracted to `buildPanelDefs()` config map
  - Drag-and-drop reorder (HTML5 DnD) in modern mode or customize mode
  - "Customize Layout" button toggles customization mode
  - "Reset Layout" button restores CPRS defaults
  - Panel visibility toggles (eye icon per panel in customize mode)
  - Keyboard-accessible resize handles (ArrowUp/Down, role=separator, aria-label)
  - Drag-over visual highlight
  - Height min/max enforced: 80-800px
- **MODIFIED** `src/components/cprs/CoverSheetLayoutManager.tsx` -- Updated default height check (33 -> 200)
- **MODIFIED** `src/components/cprs/cprs.module.css` -- Added resize handle focus/focus-visible styles, coverToolbar class

### Tests
- **NEW** `apps/web/e2e/coversheet-layout.spec.ts` -- 6 Playwright E2E tests:
  1. All 10 panels render
  2. Resize handle changes height
  3. Customize Layout toggle
  4. Reset Layout restores defaults
  5. Keyboard resize via arrow keys
  6. Panel visibility toggle

## How to Test Manually
1. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Start Web: `cd apps/web && pnpm dev`
3. Navigate to /cprs/chart/3/cover
4. Drag resize handles -- heights should change and persist on refresh
5. Click "Customize Layout" -- see visibility toggles and drag handles
6. Drag panels to reorder in customize mode
7. Click eye icons to hide/show panels
8. Click "Reset Layout" -- everything returns to CPRS defaults

## Follow-ups
- Server-side prefs currently in-memory; migration to VistA UserPrefs file when available
- Column spanning for important panels in modern mode
- Drag-and-drop with animation (react-dnd or similar) for smoother UX
