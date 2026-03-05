# Phase 567 -- Consolidate Patient Model & Top Duplicates

## User Request

Consolidate the most-duplicated data models across the monorepo into a
single `@vista-evolved/shared-types` package. Start with Patient (the most
critical), then clinical types (Allergy, Vital, Note, Medication, Problem),
UserRole, and SupportedLocale.

## Implementation Steps

1. **Create `shared/` workspace package** (`@vista-evolved/shared-types`)
   - `shared/package.json` — workspace package with source-level exports
   - `shared/tsconfig.json` — ES2022/Bundler resolution
   - Register in `pnpm-workspace.yaml`

2. **Create canonical Patient types** (`shared/src/clinical/patient.ts`)
   - `PatientSummary` — lightweight search/list type (dfn, name, ssn?, dob?, sex?)
   - `Patient` — comprehensive record (40+ fields across identity, demographics,
     contact, clinical, administrative, audit categories)
   - `PatientCreateRequest`, `PatientUpdateRequest` — mutation DTOs
   - Backward-compat aliases: `PatientDemographics`, `PatientRecord`, `PatientSearchResult`

3. **Create canonical clinical types** (5 files under `shared/src/clinical/`)
   - `allergy.ts` — `Allergy` + `AllergyRecord` (extends Allergy)
   - `vital.ts` — `Vital` + `VitalRecord` (extends Vital)
   - `note.ts` — `Note` + `NoteRecord` (extends Note)
   - `medication.ts` — `Medication` + `MedicationRecord` (extends Medication)
   - `problem.ts` — `Problem` + `ProblemRecord` (extends Problem)

4. **Create canonical auth types** (`shared/src/auth/user-role.ts`)
   - `UserRole` — 7-value union type

5. **Update all imports** across web, API, portal:
   - `chart-types.ts` — deleted 7 local interfaces, re-exports from shared-types
   - `data-cache.tsx` — deleted 5 local interfaces, imports from shared-types
   - `patient-context.tsx` — deleted local PatientDemographics, imports from shared-types
   - `patient-search/page.tsx` — deleted 7 local interfaces, imports from shared-types
   - `cprs/patient-search/page.tsx` — deleted local PatientSearchResult, imports from shared-types
   - `session-store.ts` (API) — deleted local UserRole, imports from shared-types
   - `session-context.tsx` (web) — deleted local UserRole, imports from shared-types
   - `i18n.ts` (web) — deleted local SUPPORTED_LOCALES/SupportedLocale, imports from locale-utils
   - `i18n.ts` (portal) — same
   - `pg-user-locale-repo.ts` (API) — deleted local VALID_LOCALES/SupportedLocale, imports from locale-utils

6. **Add workspace dependencies** to consuming packages:
   - `@vista-evolved/shared-types: workspace:*` → web, API, portal
   - `@vista-evolved/locale-utils: workspace:*` → web, API, portal

## Verification Steps

- `npx tsc --noEmit` in shared/ — 0 errors
- `npx tsc --noEmit` in apps/web/ — 0 errors
- `npx tsc --noEmit` in apps/api/ — 0 errors
- `npx tsc --noEmit` in apps/portal/ — 0 errors
- `ls shared/src/clinical/patient.ts` — exists
- `grep -c 'export' shared/src/clinical/patient.ts` — ≥3

## Files Touched

### Created

- `shared/package.json`
- `shared/tsconfig.json`
- `shared/src/index.ts`
- `shared/src/clinical/index.ts`
- `shared/src/clinical/patient.ts`
- `shared/src/clinical/allergy.ts`
- `shared/src/clinical/vital.ts`
- `shared/src/clinical/note.ts`
- `shared/src/clinical/medication.ts`
- `shared/src/clinical/problem.ts`
- `shared/src/auth/index.ts`
- `shared/src/auth/user-role.ts`

### Modified

- `pnpm-workspace.yaml` — added `shared` to packages list
- `apps/web/package.json` — added shared-types + locale-utils deps
- `apps/api/package.json` — added shared-types + locale-utils deps
- `apps/portal/package.json` — added shared-types + locale-utils deps
- `apps/web/src/lib/chart-types.ts` — replaced 7 local interfaces with re-exports
- `apps/web/src/stores/data-cache.tsx` — replaced 5 local interfaces with imports
- `apps/web/src/stores/patient-context.tsx` — replaced local PatientDemographics
- `apps/web/src/stores/session-context.tsx` — replaced local UserRole
- `apps/web/src/app/patient-search/page.tsx` — replaced 7 local interfaces
- `apps/web/src/app/cprs/patient-search/page.tsx` — replaced local PatientSearchResult
- `apps/web/src/lib/i18n.ts` — replaced local SupportedLocale with locale-utils import
- `apps/portal/src/lib/i18n.ts` — replaced local SupportedLocale
- `apps/api/src/auth/session-store.ts` — replaced local UserRole
- `apps/api/src/platform/pg/repo/pg-user-locale-repo.ts` — replaced local SupportedLocale
- `docs/DATA_MODEL_AUDIT.md` — marked D-05, D-06, D-07, D-08 as DONE
