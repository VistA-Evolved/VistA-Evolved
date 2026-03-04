# Runbook: CPRS Inventory Extraction (Phase 10A)

## Purpose

Extract tab labels, menus, forms, and RPC names from the Delphi CPRS source
tree into structured JSON contracts. This creates the foundational data that
downstream phases (contract generation, UI shell, API scaffolding) consume.

## Inputs

| Input              | Path                                                                     | Notes                            |
| ------------------ | ------------------------------------------------------------------------ | -------------------------------- |
| CPRS Delphi source | `reference/cprs/`                                                        | Cloned separately; git-ignored   |
| CPRS-Chart subtree | `reference/cprs/Packages/Order Entry Results Reporting/CPRS/CPRS-Chart/` | Contains `.dfm` and `.pas` files |

> The `reference/cprs/` directory is **not** committed to the repo. Clone the
> CPRS source into that path before running extraction.

## Commands

```powershell
# Run all four extraction scripts (tabs, menus, forms, RPCs)
pnpm run cprs:extract
```

This executes `node tools/cprs-extract/run-all.mjs`, which orchestrates:

1. `extract-tabs.mjs` — parses `fFrame.pas` + `uConst.pas` for tab definitions
2. `extract-menus.mjs` — parses `.dfm`/`.pas` for menu labels and items
3. `extract-forms.mjs` — enumerates all `.dfm` files with captions and components
4. `extract-rpcs.mjs` — finds all RPC name strings in `.pas` files

## Expected Outputs

All files land in `design/contracts/cprs/v1/`:

| File                   | Description                                       | Expected size |
| ---------------------- | ------------------------------------------------- | ------------- |
| `tabs.json`            | 10 chart tabs with order, position, constants     | ~560 lines    |
| `menus.json`           | 1688 menu items across File/Edit/View/Tools/Help  | ~19K lines    |
| `forms.json`           | 323 forms with captions and component inventories | ~5.2K lines   |
| `rpc_catalog.json`     | 975 unique RPCs with 1212 call-site references    | ~13K lines    |
| `screen_registry.json` | 81 screens → action → RPC mapping                 | ~16K lines    |
| `coverage_report.md`   | Summary of extraction statistics                  | ~170 lines    |

## Validation

```powershell
# All 6 output files exist
@(
  "design/contracts/cprs/v1/tabs.json",
  "design/contracts/cprs/v1/menus.json",
  "design/contracts/cprs/v1/forms.json",
  "design/contracts/cprs/v1/rpc_catalog.json",
  "design/contracts/cprs/v1/screen_registry.json",
  "design/contracts/cprs/v1/coverage_report.md"
) | ForEach-Object {
  $exists = Test-Path $_
  Write-Host "$_ : $exists"
}

# Quick count checks
$tabs = (Get-Content design/contracts/cprs/v1/tabs.json | ConvertFrom-Json).tabs.Count
$rpcs = (Get-Content design/contracts/cprs/v1/rpc_catalog.json | ConvertFrom-Json).rpcs.Count
Write-Host "Tabs: $tabs (expect 10+), RPCs: $rpcs (expect 900+)"
```

## Common Failures

| Symptom                     | Cause                         | Fix                                                  |
| --------------------------- | ----------------------------- | ---------------------------------------------------- |
| `ENOENT reference/cprs/...` | CPRS source not cloned        | Clone CPRS repo into `reference/cprs/`               |
| `0 tabs found`              | Path changed in Delphi source | Check `fFrame.pas` exists under CPRS-Chart           |
| `0 RPCs found`              | `.pas` file glob missed       | Verify `r*.pas` and other RPC-containing files exist |

## No VA Terminology Check

Extraction outputs use CPRS-native naming (RPC names, form names, tab constants).
These are technical identifiers, not VA branding. No terminology changes needed.

## Related Prompts

- [12-01-Phase10A-CPRS-Inventory-Extraction-IMPLEMENT.md](../../prompts/12-PHASE-10-CPRS-EXTRACT/12-01-Phase10A-CPRS-Inventory-Extraction-IMPLEMENT.md)
- [12-02-Phase10A-CPRS-Inventory-Extraction-VERIFY.md](../../prompts/12-PHASE-10-CPRS-EXTRACT/12-02-Phase10A-CPRS-Inventory-Extraction-VERIFY.md)
