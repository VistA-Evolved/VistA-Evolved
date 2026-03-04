# Phase 11 — CPRS Web Replica End-to-End (VERIFY)

## Verification Checklist

### Automated Script

```powershell
.\scripts\verify-phase1-to-phase11-cprs.ps1
```

Expected: 0 FAIL

### Build Verification

```powershell
pnpm -C apps/web build
```

Expected: Clean compile, no TypeScript errors

### Manual Walkthrough

1. **Login page** — Navigate to `/cprs/login`, click Sign On
2. **Patient search** — Search for "CARTER", select a patient, click Open Chart
3. **Cover Sheet** — Verify 6 sections load (Active Problems, Allergies, Active Medications, Vitals, Recent Notes, Clinical Reminders)
4. **Tab navigation** — Click through all 10 tabs: Cover, Problems, Meds, Orders, Notes, Consults, Surgery, D/C Summ, Labs, Reports
5. **Problems tab** — Verify list/detail split, filter works, + New Problem opens dialog
6. **Meds tab** — Verify list/detail, status filter, + New Medication Order opens dialog
7. **Orders tab** — Verify 4 sub-tabs (Med/Lab/Imaging/Consult), place a quick order
8. **Notes tab** — Create a new note using template selector
9. **Menu bar** — Click File/Edit/View/Tools/Help, verify sub-menus appear
10. **Modals** — Open Print, About, Keyboard Shortcuts from menu
11. **Preferences** — Navigate to `/cprs/settings/preferences`, change theme/density
12. **Verify page** — Navigate to `/cprs/verify`, confirm 15 checks run

### Contract Binding

- `getChartTabs()` returns 10 tabs sorted Cover Sheet first
- `getFrameMenu()` returns 5+ top-level menu items
- `sanitizeLabel()` maps VistAWeb → Remote Data Viewer, Non-VA Meds → External Medications

### No VA/VHA Terminology

- Grep all `apps/web/src/components/cprs/**/*.tsx` files
- Confirm NO occurrences of "VA Medical Center", "Non-VA Meds" in rendered strings
- sanitizeLabel function handles replacements

### State Management

- PatientProvider: selectPatient fetches demographics from API
- DataCacheProvider: fetchAll loads all clinical domains
- CPRSUIProvider: preferences persist to localStorage across page reloads

### Route Structure

```
/cprs/login                      → Sign-on page
/cprs/patient-search             → Patient selection
/cprs/chart/[dfn]/[tab]          → Chart shell (all 10 tabs)
/cprs/settings/preferences       → User preferences
/cprs/verify                     → Automated verification dashboard
```
