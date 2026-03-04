# Phase 283 — Migration Templates Expansion (IMPLEMENT)

## Objective

Replace the FHIR placeholder template with real FHIR R4 templates covering all
8 resource types parsed by `fhir-bundle-parser.ts`. Add vendor-specific C-CDA
profiles for Epic, Cerner, athenahealth, eClinicalWorks, and Practice Fusion.
Create synthetic test fixtures (NO PHI) for both FHIR and C-CDA formats.

## User Request

Wave 10, Phase 4: Expand the migration engine's template library from 8 templates
to 22 templates covering real FHIR R4 resources and vendor C-CDA profiles.

## Implementation Steps

### 1. SourceFormat Type Expansion

- **File**: `apps/api/src/migration/types.ts`
- Add 6 vendor C-CDA SourceFormat values: `ccda`, `epic-ccda`, `cerner-ccda`,
  `athena-ccda`, `ecw-ccda`, `practicefusion-ccda`

### 2. FHIR R4 Template Expansion

- **File**: `apps/api/src/migration/templates.ts`
- Replace `FHIR_PATIENT` placeholder (v0.1.0) with real v2.0.0 template
- Add 7 new FHIR templates: allergy, condition, observation, medication-request,
  encounter, appointment, document-reference
- All field names match `fhir-bundle-parser.ts` extractor output

### 3. Vendor C-CDA Profile Templates

- **File**: `apps/api/src/migration/templates.ts`
- Add 7 vendor CCDA templates:
  - `EPIC_CCDA_PATIENT` + `EPIC_CCDA_PROBLEM` (Epic OID: 1.2.840.114350.1.13.\*)
  - `CERNER_CCDA_PATIENT` + `CERNER_CCDA_ALLERGY` (Cerner OID: 2.16.840.1.113883.3.787.0.0)
  - `ATHENA_CCDA_PATIENT` (athenahealth OID: 2.16.840.1.113883.3.564.\*)
  - `ECW_CCDA_PATIENT` (eClinicalWorks, custom OIDs)
  - `PRACTICEFUSION_CCDA_PATIENT` (PF OID: 2.16.840.1.113883.3.3761.\*)

### 4. ALL_TEMPLATES Registration

- Update `ALL_TEMPLATES` array from 8 → 22 entries
- Grouped by: Generic CSV (5), OpenEMR CSV (2), FHIR R4 (8), Vendor C-CDA (7)

### 5. Synthetic Test Fixtures

- **File**: `apps/api/src/migration/__fixtures__/synthetic-fhir-bundle.json`
  - 2 patients, 2 allergies, 2 conditions, 1 observation, 2 medications,
    1 encounter, 1 appointment, 1 document reference
- **File**: `apps/api/src/migration/__fixtures__/synthetic-ccda.xml`
  - C-CDA 2.1 CCD with demographics, problems, medications, allergies, vitals
  - Uses standard Template IDs and LOINC section codes

## Verification Steps

See `283-99-VERIFY.md`

## Files Touched

- `apps/api/src/migration/types.ts` — SourceFormat expansion
- `apps/api/src/migration/templates.ts` — 14 new templates, updated registration
- `apps/api/src/migration/__fixtures__/synthetic-fhir-bundle.json` — NEW
- `apps/api/src/migration/__fixtures__/synthetic-ccda.xml` — NEW
