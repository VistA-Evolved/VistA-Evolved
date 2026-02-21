# Phase 79 VERIFY Summary

## What Changed (VERIFY fixes)

### BUG-079-1 (HIGH) -- Duplicate Reset Layout buttons
- **Root cause**: `CoverSheetLayoutManager` was rendered in `page.tsx` cover tab
  alongside the new CoverSheetPanel toolbar, producing two Reset buttons.
- **Fix**: Removed `CoverSheetLayoutManager` import and render from page.tsx.
  Deleted the orphaned `CoverSheetLayoutManager.tsx` file entirely -- its
  functionality is now fully integrated into CoverSheetPanel.tsx.

### BUG-079-2 (MEDIUM) -- Echo-back PUT on initial load
- **Root cause**: Sync effect sets heights from server prefs, triggering the
  persist effect which PUTs the same data back (wasted request).
- **Fix**: Added `isInitialSyncRef` flag. The persist effect skips when the
  flag is set (cleared after first skip). External syncs (server load, reset)
  re-arm the flag.

### BUG-079-3 (MEDIUM) -- Fragile infinite-loop prevention
- **Root cause**: The persist effect relied on object reference identity to
  avoid re-triggering. If React created a new object with the same values,
  the loop would fire.
- **Fix**: Added `prevHeightsJsonRef` with JSON.stringify comparison. The
  persist effect short-circuits when the serialized heights haven't changed.

### BUG-079-4 (MEDIUM) -- eslint-disable hiding missing dependency
- **Root cause**: `saveCoverSheetLayout` was missing from the persist effect
  dependency array, hidden by `eslint-disable-line react-hooks/exhaustive-deps`.
- **Fix**: Added `saveCoverSheetLayout` to the `[heights, saveCoverSheetLayout]`
  dependency array. Removed the eslint-disable comment.

### BUG-079-5 (LOW) -- Duplicate inline styles on coverToolbar
- **Root cause**: The coverToolbar div had both `className={styles.coverToolbar}`
  and an inline `style` prop with identical properties.
- **Fix**: Removed the inline style prop. CSS module class is sufficient.

### BUG-079-6 (LOW) -- ZWJ emoji cross-platform fragility
- **Root cause**: Visibility toggle used ZWJ sequences that render as tofu
  on some platforms (Windows 10 older builds, some Linux terminals).
- **Fix**: Replaced with simple Unicode: check mark U+2713 and ballot X U+2717.

### Not Fixed (by design)
- **BUG-079-7 (LOW)**: Dead `if (!session) return;` guards match established
  codebase convention. `requireSession` throws, never returns null, but the
  pattern is consistent across all route files.
- **BUG-079-8 (LOW)**: Hardcoded color values in inline styles follow the
  same pattern used throughout the codebase. Introducing new CSS variables
  would violate "Don't invent new UI patterns."

## Files Changed
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` -- Removed CoverSheetLayoutManager
- `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx` -- 6 bug fixes
- `apps/web/src/components/cprs/CoverSheetLayoutManager.tsx` -- DELETED (orphaned)
- `scripts/verify-phase79-coversheet-layout.ps1` -- NEW (40-gate verifier)

## Verification
- TypeScript: `tsc --noEmit` clean on both api and web
- verify-latest.ps1: 69/69 gates passed (Phase 77 base)
- verify-phase79-coversheet-layout.ps1: 40/40 gates passed
- IDE diagnostics: 0 errors across all modified files

## How to Test Manually
1. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Start web: `cd apps/web && pnpm dev`
3. Navigate to /cprs/chart/3/cover
4. Verify single Reset Layout button (not two)
5. Resize a panel -- no duplicate PUT on load (check Network tab)
6. Refresh -- heights persist
7. Click Reset Layout -- returns to defaults
8. Enter Customize mode -- visibility toggles show simple check/X marks

## Follow-ups
- E2E tests require running Playwright with authenticated storageState
- Consider adding `/ui-prefs/` explicitly to AUTH_RULES for clarity
