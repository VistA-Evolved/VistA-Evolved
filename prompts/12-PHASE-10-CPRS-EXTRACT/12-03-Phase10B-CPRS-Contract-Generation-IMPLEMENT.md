# 12-03 — Phase 10B: CPRS Contract Generation — IMPLEMENT

## User Request

Generate structured design contracts from the extracted CPRS data so that
downstream consumers (UI shell, API scaffolds) have a stable schema to build on.

This phase validates and enriches the raw extraction output from Phase 10A:

- Normalize the 6 JSON/MD output files under `design/contracts/cprs/v1/`
- Ensure the schema is stable: `tabs.json`, `menus.json`, `forms.json`,
  `rpc_catalog.json`, `screen_registry.json`, `coverage_report.md`
- Cross-reference RPCs between `rpc_catalog.json` and `screen_registry.json`
- Produce the coverage report summarising extraction completeness

## Implementation Steps

1. **Run `pnpm run cprs:extract`** — regenerate contracts from source
2. **Validate schemas** — confirm each JSON file has expected top-level keys:
   - `tabs.json`: `{ _meta, tabs, summary }`
   - `menus.json`: `{ _meta, menus, summary }`
   - `forms.json`: `{ _meta, forms, summary }`
   - `rpc_catalog.json`: `{ _meta, rpcs, summary }`
   - `screen_registry.json`: `{ _meta, screens, summary }`
3. **Cross-reference** — every RPC in `screen_registry.json` should appear in `rpc_catalog.json`
4. **Coverage report** — `coverage_report.md` should list total counts and coverage %

## Preconditions

- Phase 10A complete (extraction scripts exist and run)
- `reference/cprs/` present (Delphi source tree)

## Files Touched

- `design/contracts/cprs/v1/tabs.json` (validated)
- `design/contracts/cprs/v1/menus.json` (validated)
- `design/contracts/cprs/v1/forms.json` (validated)
- `design/contracts/cprs/v1/rpc_catalog.json` (validated)
- `design/contracts/cprs/v1/screen_registry.json` (validated)
- `design/contracts/cprs/v1/coverage_report.md` (validated)
