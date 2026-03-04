# Phase 79 VERIFY — CPRS Cover Sheet Layout Parity v1

**Phase**: 79
**Bundle**: Cover Sheet Layout
**Date**: 2025-01-XX

## Verification Gates

| #   | Gate                                                                  | Method       | Pass? |
| --- | --------------------------------------------------------------------- | ------------ | ----- |
| 1   | API: GET /ui-prefs/coversheet returns defaults when no prefs saved    | curl         |       |
| 2   | API: PUT /ui-prefs/coversheet saves layout, GET returns source=server | curl         |       |
| 3   | API: DELETE /ui-prefs/coversheet resets, GET returns source=defaults  | curl         |       |
| 4   | API: PUT validates panelHeights (min 80, max 800)                     | curl 422     |       |
| 5   | Web: All 10 panels render on cover sheet (incl immunizations)         | visual       |       |
| 6   | Web: Resize handle drags to change panel height                       | visual       |       |
| 7   | Web: Heights persist across refresh (localStorage)                    | visual       |       |
| 8   | Web: "Customize Layout" toggle shows visibility controls              | visual       |       |
| 9   | Web: "Reset Layout" restores default heights                          | visual       |       |
| 10  | Web: Panel visibility toggle hides/shows panels                       | visual       |       |
| 11  | Web: Drag-and-drop reorder works in customize mode                    | visual       |       |
| 12  | Web: Keyboard resize (ArrowUp/Down on handle) works                   | visual       |       |
| 13  | Web: Resize handle has role=separator and aria-label                  | audit        |       |
| 14  | TypeScript: No type errors in api + web                               | tsc --noEmit |       |
| 15  | Playwright: coversheet-layout.spec.ts 6 tests pass                    | npx pw test  |       |
| 16  | No console.log added (structured logger only)                         | grep         |       |
| 17  | Audit action config.ui-prefs-save registered                          | grep         |       |

## Verification Commands

```bash
# Gate 1-4: API preference endpoints
curl -s http://127.0.0.1:3001/ui-prefs/coversheet -b cookies.txt | jq .
curl -s -X PUT http://127.0.0.1:3001/ui-prefs/coversheet -b cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"panelOrder":["problems","allergies"],"panelHeights":{"problems":250}}' | jq .
curl -s -X DELETE http://127.0.0.1:3001/ui-prefs/coversheet -b cookies.txt | jq .

# Gate 14: TypeScript
cd apps/api && pnpm exec tsc --noEmit
cd apps/web && pnpm exec tsc --noEmit

# Gate 15: Playwright
cd apps/web && npx playwright test coversheet-layout

# Gate 16: Console.log scan
grep -rn "console\.log" apps/api/src/services/ui-prefs-store.ts apps/api/src/routes/ui-prefs.ts
```
