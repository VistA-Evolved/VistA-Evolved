# 12-06 — Phase 10C: CPRS Replica Shell — VERIFY

## What to verify

Phase 10C built a CPRS-replica UI shell in `apps/web` with bottom tabs,
menu bar, patient header, and chart panels.

## Automated checks

```powershell
# 1. Build succeeds
pnpm -C apps/web build

# 2. Key files exist
Test-Path apps/web/src/app/chart/`[dfn`]/`[tab`]/page.tsx
Test-Path apps/web/src/components/chart/MenuBar.tsx
Test-Path apps/web/src/components/chart/TabStrip.tsx
Test-Path apps/web/src/components/chart/PatientHeader.tsx
Test-Path apps/web/src/components/chart/panels/CoverSheetPanel.tsx
Test-Path apps/web/src/components/chart/panels/ProblemsPanel.tsx
Test-Path apps/web/src/components/chart/panels/MedsPanel.tsx
Test-Path apps/web/src/components/chart/panels/NotesPanel.tsx
Test-Path apps/web/src/lib/chart-types.ts
Test-Path apps/web/src/lib/api.ts
Test-Path apps/web/src/lib/menu-data.ts
```

## Manual spot-checks

| Check                                   | Expected                                               |
| --------------------------------------- | ------------------------------------------------------ |
| Navigate to `/chart/100/cover`          | Cover Sheet panel with 4 quadrants                     |
| Bottom tab strip                        | 10 tabs: Cover Sheet through Reports                   |
| Click "Problems" tab                    | Navigates to `/chart/100/problems`, shows problem list |
| Menu bar                                | File / Edit / View / Tools / Help dropdowns            |
| Patient header                          | Shows patient name, DOB, sex from demographics API     |
| Unimplemented tabs (Labs, Orders, etc.) | Show "Not yet implemented" placeholder                 |

## Pass criteria

`pnpm -C apps/web build` exits 0. All files present. Manual navigation works.
