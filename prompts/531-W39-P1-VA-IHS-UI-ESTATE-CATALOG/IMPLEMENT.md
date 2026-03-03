# Phase 531 — P1: VA + IHS UI Estate Catalog

## Goal

Create a machine-readable catalog of every VA and IHS desktop GUI
surface, mapped to VistA-Evolved coverage status. This is the
foundation for all subsequent Wave 39 phases.

## User Request

Build a comprehensive UI estate catalog covering:
- **VA systems**: BCMA, VistA Imaging, IVS/SIC, MHA, VSE/VS GUI,
  Clinical Procedures CP/MD, JLV, VistAWeb, and all "GUI Hybrids"
  (CDSP, CISS, Direct, ESig, HINGE, HWSC, Lighthouse, VES, MHV,
  VODA, NUMI, PATS, Person Services, VistA Audit Solution)
- **IHS systems**: RPMS EHR + VueCentric, iCare, BPRM v4, BSDX/PIMS

## Implementation Steps

### 1. JSON Schema (`data/ui-estate/ui-estate.schema.json`)
Define the schema for UI surface entries:
- `id`: kebab-case unique identifier
- `agency`: "va" | "ihs" | "shared"
- `system`: parent system name
- `category`: "clinical" | "admin" | "imaging" | "scheduling" | "portal" | "reporting" | "infrastructure"
- `surfaces[]`: array of UI surfaces with:
  - `name`, `description`, `vistaFiles[]`, `targetRpcs[]`
  - `coverage`: { present_ui, present_api, vista_rpc_wired, writeback_ready, tests_present, evidence_present }
  - `veEquivalent`: { route, page, component, phase }
  - `priority`: "p0-critical" | "p1-high" | "p2-medium" | "p3-low"
  - `migrationStatus`: "not-started" | "scaffold" | "api-wired" | "writeback" | "parity" | "certified"

### 2. VA Catalog (`data/ui-estate/va-ui-estate.json`)
Populate all VA systems with surfaces, VistA file references, target
RPCs, and current VistA-Evolved coverage status (auto-detected where
possible, manually annotated otherwise).

### 3. IHS Catalog (`data/ui-estate/ihs-ui-estate.json`)
Same structure for IHS systems.

### 4. Auto-Detection Script (`scripts/ui-estate/build-ui-estate.mjs`)
Node.js script that:
- Scans `apps/api/src/routes/` for route prefixes
- Scans `apps/web/src/app/` and `apps/portal/src/app/` for page.tsx files
- Cross-references with `config/capabilities.json`
- Cross-references with `docs/grounding/parity-matrix.json`
- Produces `data/ui-estate/ui-gap-report.json`

### 5. Gap Report (`data/ui-estate/ui-gap-report.json`)
Generated output showing:
- Total surfaces, covered, gaps, coverage percentage
- Per-system breakdown
- Per-priority breakdown

### 6. Documentation (`docs/ui-estate/README.md`)
How to update the catalog, what "coverage" means, how to run the
build script.

## Verification Steps

See 531-99-VERIFY.md

## Files Touched

- `data/ui-estate/ui-estate.schema.json` (new)
- `data/ui-estate/va-ui-estate.json` (new)
- `data/ui-estate/ihs-ui-estate.json` (new)
- `scripts/ui-estate/build-ui-estate.mjs` (new)
- `data/ui-estate/ui-gap-report.json` (generated)
- `docs/ui-estate/README.md` (new)
- `prompts/531/531-01-IMPLEMENT.md` (this file)
- `prompts/531/531-99-VERIFY.md`
- `scripts/verify-phase531-ui-estate-catalog.ps1` (new)
