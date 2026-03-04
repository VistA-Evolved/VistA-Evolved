# 12-02 — Phase 10A: CPRS Inventory Extraction — VERIFY

## What to verify

Phase 10A extracted tab labels, menus, forms, and RPCs from the Delphi CPRS
source tree into structured JSON contracts.

## Automated checks

```powershell
# 1. Extraction scripts exist
Test-Path tools/cprs-extract/extract-tabs.mjs
Test-Path tools/cprs-extract/extract-menus.mjs
Test-Path tools/cprs-extract/extract-forms.mjs
Test-Path tools/cprs-extract/extract-rpcs.mjs
Test-Path tools/cprs-extract/run-all.mjs
Test-Path tools/cprs-extract/lib/paths.mjs

# 2. Run extraction (requires reference/cprs/ to be present)
pnpm run cprs:extract

# 3. Output files exist
Test-Path design/contracts/cprs/v1/tabs.json
Test-Path design/contracts/cprs/v1/menus.json
Test-Path design/contracts/cprs/v1/forms.json
Test-Path design/contracts/cprs/v1/rpc_catalog.json
Test-Path design/contracts/cprs/v1/screen_registry.json
Test-Path design/contracts/cprs/v1/coverage_report.md
```

## Manual spot-checks

| Check                                | Expected                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| tabs.json has 10 entries             | Cover Sheet, Problems, Meds, Orders, Notes, Consults, Surgery, D/C Summ, Labs, Reports |
| menus.json has 5 top-level menus     | File, Edit, View, Tools, Help                                                          |
| forms.json has 300+ forms            | Each with caption and component list                                                   |
| rpc_catalog.json has 900+ RPCs       | Each with name, isContext, references array                                            |
| screen_registry.json has 80+ screens | Each with tab, sourceFiles, rpcs mapping                                               |
| coverage_report.md is non-empty      | Summary of extraction stats                                                            |

## Pass criteria

All automated checks return `True` / exit 0. Manual spot-checks match expected values.
