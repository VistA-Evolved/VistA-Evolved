# Runbook: CPRS Replica Shell (Phase 10C)

## Purpose

A CPRS-replica web UI shell built in Next.js that mirrors the original CPRS
layout: bottom tab strip, menu bar, patient header, and per-tab content panels.
Four tabs have live API integration (Cover Sheet, Problems, Meds, Notes);
the remaining six show placeholder content.

## Inputs

| Input            | Path                                  | Notes                                |
| ---------------- | ------------------------------------- | ------------------------------------ |
| Tab definitions  | `design/contracts/cprs/v1/tabs.json`  | 10 chart tabs                        |
| Menu definitions | `design/contracts/cprs/v1/menus.json` | File/Edit/View/Tools/Help            |
| API server       | `http://127.0.0.1:3001`               | Must be running for live data panels |

## Commands

```powershell
# Build the web app (validates TypeScript + JSX)
pnpm -C apps/web build

# Start in dev mode (hot reload)
pnpm -C apps/web dev
```

The chart shell is at `/chart/[dfn]/[tab]`. Example: `/chart/100/cover`.

## Expected Outputs

### New files (18 total in `apps/web/src/`)

| Path                                                 | Purpose                                |
| ---------------------------------------------------- | -------------------------------------- |
| `app/chart/[dfn]/[tab]/page.tsx`                     | Dynamic chart route                    |
| `app/chart/[dfn]/[tab]/page.module.css`              | Chart layout styles                    |
| `components/chart/MenuBar.tsx` + `.module.css`       | Dropdown menu bar                      |
| `components/chart/TabStrip.tsx` + `.module.css`      | Bottom tab strip                       |
| `components/chart/PatientHeader.tsx` + `.module.css` | Patient demographics header            |
| `components/chart/panels/CoverSheetPanel.tsx`        | 4-quadrant cover sheet                 |
| `components/chart/panels/ProblemsPanel.tsx`          | Problem list panel                     |
| `components/chart/panels/MedsPanel.tsx`              | Medications panel                      |
| `components/chart/panels/NotesPanel.tsx`             | Notes list panel                       |
| `components/chart/panels/PlaceholderPanel.tsx`       | Generic placeholder                    |
| `components/chart/panels/index.ts`                   | Barrel export                          |
| `components/chart/panels/panels.module.css`          | Shared panel styles                    |
| `lib/chart-types.ts`                                 | Tab definitions, API_BASE, types       |
| `lib/api.ts`                                         | Typed fetch wrappers for API endpoints |
| `lib/menu-data.ts`                                   | Static menu structure from menus.json  |

### Modified files

| Path             | Change                                 |
| ---------------- | -------------------------------------- |
| `app/page.tsx`   | Added "Chart Shell (Patient 100)" link |
| `app/layout.tsx` | Updated metadata title                 |

## Validation

```powershell
# 1. Build must succeed
pnpm -C apps/web build
# Exit code 0 = pass

# 2. Key files exist
@(
  "apps/web/src/app/chart/[dfn]/[tab]/page.tsx",
  "apps/web/src/components/chart/MenuBar.tsx",
  "apps/web/src/components/chart/TabStrip.tsx",
  "apps/web/src/components/chart/PatientHeader.tsx",
  "apps/web/src/components/chart/panels/CoverSheetPanel.tsx",
  "apps/web/src/lib/chart-types.ts",
  "apps/web/src/lib/api.ts"
) | ForEach-Object {
  Write-Host "$_ : $(Test-Path $_)"
}
```

### Manual checks

| Check                | Expected                                                   |
| -------------------- | ---------------------------------------------------------- |
| `/chart/100/cover`   | Cover Sheet with demographics, allergies, problems, vitals |
| Bottom tabs          | 10 tabs: Cover Sheet → Reports                             |
| Click "Problems" tab | Navigates to `/chart/100/problems`                         |
| Menu bar             | File / Edit / View / Tools / Help dropdowns                |
| Labs, Orders, etc.   | "Not yet implemented" placeholder                          |

## Common Failures

| Symptom                         | Cause                       | Fix                                        |
| ------------------------------- | --------------------------- | ------------------------------------------ |
| Build fails on `chart-types.ts` | Missing `design/contracts/` | Run `pnpm run cprs:extract` first          |
| API panels show "Error"         | API server not running      | Start with `pnpm -C apps/api dev`          |
| Patient header blank            | DFN not found in VistA      | Use DFN from `/vista/default-patient-list` |
| Menu items empty                | `menus.json` not generated  | Run `pnpm run cprs:extract`                |

## No VA Terminology Check

The UI uses generic clinical terms (Cover Sheet, Problems, Medications, Notes).
Tab labels match CPRS conventions but avoid VA-specific branding. Menu items
are extracted from CPRS source and may contain CPRS-native labels — review
before production use.

## Related Prompts

- [12-05-Phase10C-CPRS-Replica-Shell-IMPLEMENT.md](../../prompts/12-PHASE-10-CPRS-EXTRACT/12-05-Phase10C-CPRS-Replica-Shell-IMPLEMENT.md)
- [12-06-Phase10C-CPRS-Replica-Shell-VERIFY.md](../../prompts/12-PHASE-10-CPRS-EXTRACT/12-06-Phase10C-CPRS-Replica-Shell-VERIFY.md)
