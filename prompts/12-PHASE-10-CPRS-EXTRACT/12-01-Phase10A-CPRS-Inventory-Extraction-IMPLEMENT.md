# Phase 10A — CPRS Inventory Extraction (IMPLEMENT)

## User Request

Create a new folder `tools/cprs-extract/` with Node scripts to extract from Delphi CPRS source in `reference/cprs/`:

- `extract-tabs.mjs`: find tab labels/order and whether bottom tabs are used
- `extract-menus.mjs`: find menu labels/items from Delphi forms
- `extract-forms.mjs`: enumerate .dfm files and extract form caption/title where possible
- `extract-rpcs.mjs`: extract all RPC names (strings) and where referenced

Output to `design/contracts/cprs/v1/`:

- `tabs.json`
- `menus.json`
- `forms.json`
- `rpc_catalog.json`
- `screen_registry.json` (map screens → actions → rpc names)
- `coverage_report.md`

Add a single npm script: `"cprs:extract"` that runs all scripts.
Do not modify app code yet.

## Implementation Steps

1. Inventory `reference/cprs/Packages/Order Entry Results Reporting/CPRS/CPRS-Chart/` for:
   - `.dfm` files (forms), `.pas` files (logic/RPCs)
   - Main frame (`fFrame.dfm`/`fFrame.pas`) — contains tab definitions and main menu
   - `uConst.pas` — contains CT\_\* constants for tab IDs
   - `r*.pas` files — contain RPC calls (`sCallV`, `tCallV`, `CallV`, `CallVistA`)
2. Create `tools/cprs-extract/` with four extraction scripts (ESM `.mjs`)
3. Create `design/contracts/cprs/v1/` output directory
4. Add `"cprs:extract"` npm script to root `package.json`
5. Run and verify

## Verification Steps

- `npm run cprs:extract` completes without errors
- All 6 output files are created in `design/contracts/cprs/v1/`
- `tabs.json` contains the 10+ CPRS chart tabs with order and position info
- `menus.json` contains File/Edit/View/Tools/Help top-level menus
- `forms.json` enumerates 300+ .dfm files with captions
- `rpc_catalog.json` contains all RPC names found in .pas files
- `screen_registry.json` maps screens to actions to RPCs
- `coverage_report.md` summarises extraction results

## Files Touched

- `tools/cprs-extract/extract-tabs.mjs` (new)
- `tools/cprs-extract/extract-menus.mjs` (new)
- `tools/cprs-extract/extract-forms.mjs` (new)
- `tools/cprs-extract/extract-rpcs.mjs` (new)
- `tools/cprs-extract/run-all.mjs` (new — orchestrator)
- `design/contracts/cprs/v1/` (new — output directory)
- `package.json` (add `cprs:extract` script)
