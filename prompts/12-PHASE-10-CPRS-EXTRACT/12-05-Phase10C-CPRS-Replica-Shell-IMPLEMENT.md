# Phase 10C — CPRS Replica Shell (IMPLEMENT)

## User Request

Implement a CPRS Replica UI shell in apps/web:

- Bottom tab strip based on design/contracts/cprs/v1/tabs.json
- Menu bar based on menus.json
- Patient chart shell route: /chart/[dfn]/[tab]
- Each tab renders placeholder panels initially, then calls existing API endpoints where available
- No VA terminology

## Implementation Steps

1. **Inventory** existing web app structure, API endpoints, contract data
2. **Shared types/constants** — tab definitions, API base, menu types
3. **Chart layout component** — menu bar + patient header + content area + bottom tabs
4. **MenuBar component** — renders fFrame main menu from menus.json structure
5. **BottomTabStrip component** — renders main tabs from tabs.json, positioned at bottom
6. **Tab panel components** — one per tab, placeholder initially, live API for:
   - Cover Sheet (demographics + allergies + problems + vitals + meds)
   - Problems (GET /vista/problems)
   - Meds (GET /vista/medications)
   - Notes (GET /vista/notes)
   - Labs (placeholder)
   - Orders (placeholder)
   - Consults (placeholder)
   - Surgery (placeholder)
   - D/C Summ (placeholder)
   - Reports (placeholder)
7. **Dynamic route** `/chart/[dfn]/[tab]` using Next.js App Router
8. **Update home page** to link into chart shell
9. **Verify** — build + dev run

## Verification Steps

- `pnpm -C apps/web build` succeeds
- `/chart/100/cover` renders cover sheet with live data
- Bottom tab strip shows all 10 tabs, clicking navigates
- Menu bar shows File/Edit/View/Tools/Help
- Tabs without API endpoints show placeholder content

## Files Touched

- `apps/web/src/app/chart/[dfn]/[tab]/page.tsx` (new)
- `apps/web/src/app/chart/[dfn]/[tab]/page.module.css` (new)
- `apps/web/src/app/chart/layout.tsx` (new)
- `apps/web/src/components/chart/` (new — MenuBar, TabStrip, panels)
- `apps/web/src/lib/chart-types.ts` (new)
- `apps/web/src/lib/api.ts` (new)
- `apps/web/src/app/page.tsx` (modified — add chart link)
- `apps/web/src/app/layout.tsx` (modified — update metadata)
