# Current Task

Phase: 1 — VistA Integration
Prompt: P1-3 Complete. Next: P1-4 (or user-directed)
Started: 2026-03-04
Blocked By: Nothing

## Last Completed

- P1-3: Consolidate Patient Model & Top Duplicates
  - Created `@vista-evolved/shared-types` package at `shared/`
  - Canonical Patient types: Patient (40+ fields), PatientSummary, PatientCreateRequest,
    PatientUpdateRequest, plus backward-compat aliases (PatientDemographics, PatientRecord,
    PatientSearchResult)
  - Canonical clinical types: Allergy, Vital, Note, Medication, Problem (5 files)
    with extended Record variants for adapter layer
  - Canonical UserRole type consolidated from API + web into shared-types
  - SupportedLocale consolidated: web, portal, API now import from @vista-evolved/locale-utils
  - Updated 14 files across web, API, portal
  - Zero TypeScript errors across all 4 packages (shared, web, API, portal)
  - DATA_MODEL_AUDIT.md: D-05, D-06, D-07, D-08 marked DONE
  - Prompt: prompts/567-PHASE-P1-3-CONSOLIDATE-PATIENT-MODEL/

## Previously Completed

- P1-2: Data Model Audit — Comprehensive Type/Interface Scan
  - Scanned ~514 domain model definitions across 50+ files in all 4 sub-projects
  - Found 9 HIGH severity duplicates, 8 MEDIUM, 3 LOW naming issues
- P1-1: VistA RPC Bridge — Verified Live Connection
- P0-5: GitHub Actions CI/CD Pipeline (4-job pipeline)
- P0-4: ESLint + Prettier — Code Quality Baseline
- P0-3: TypeScript Strict Mode — 289 errors fixed (100%), 0 remaining
- P0-2: Docker Compose — root docker-compose.yml, .env.example, dev scripts
- P0-1: Full Codebase Inventory → docs/CODEBASE_INVENTORY.md

## Outstanding Items

- 3131 `@typescript-eslint/no-explicit-any` warnings (future `any` cleanup pass)
- 661 security plugin warnings (prioritized in docs/SECURITY_WARNINGS.md)
- 38 `no-console` warnings (scheduled for P3-3)
- Dead code: need `knip` or `ts-prune` run
- 100+ root-level JSON/txt test artifacts need cleanup
- ~306 undocumented environment variables
